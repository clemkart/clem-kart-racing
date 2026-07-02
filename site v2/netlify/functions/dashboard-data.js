// =============================================
// Clem Kart Racing — Dashboard analytics (lecture/agregation)
// POST { password, days } -> JSON des metriques du site sur la periode demandee.
// Protege par DASHBOARD_PASSWORD. Lecture Supabase via REST (service_role), sans SDK.
// Contrairement a track-site.js, ici on VEUT voir les erreurs -> 500 explicite.
// =============================================

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://hkpknrrymgbnjmbewlyc.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const DASHBOARD_PASSWORD = process.env.DASHBOARD_PASSWORD || '';

const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_DAYS = 30;
const MAX_DAYS = 3650;        // "Tout"
const MAX_DAY_POINTS = 92;    // points max sur la courbe

const ALLOWED_ORIGINS = [
  process.env.URL,
  process.env.DEPLOY_PRIME_URL,
  'http://localhost:8888',
  'http://localhost:3000',
].filter(Boolean);

function buildHeaders(event) {
  const origin = event.headers['origin'] || '';
  const allowOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0] || '';
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
    Vary: 'Origin',
  };
}

// Classes CSS des boutons -> libelles lisibles (fallback : la classe brute si inconnue).
const CTA_LABELS = {
  ncta: 'CTA haut de page',
  btp: 'CTA bloc prix',
  btg: 'CTA extrait (accueil)',
  bpaid: 'CTA option payante',
  btw: 'CTA bas de page',
  'btn-p': 'CTA article (achat)',
  'btn-g': 'CTA article (extrait)',
};
function ctaLabel(raw) { return CTA_LABELS[raw] || raw || '(sans nom)'; }

function blankTotals() {
  return {
    visiteurs: 0, pageviews: 0, gumroad_clicks: 0, extract_clicks: 0, tableur_clicks: 0, tableur_signups: 0, ctr: 0,
    ventes: 0, revenu_cents: 0, taux_achat: 0,
  };
}
function bump(tot, type) {
  if (type === 'pageview') tot.pageviews++;
  else if (type === 'gumroad_click') tot.gumroad_clicks++;
  else if (type === 'extract_click') tot.extract_clicks++;
  else if (type === 'tableur_click') tot.tableur_clicks++;
  else if (type === 'tableur_signup') tot.tableur_signups++;
}
// ctr = % de VISITEURS UNIQUES ayant clique au moins une fois vers Gumroad
// (et non le nombre brut de clics, qui compterait 2x la meme personne si elle
// clique sur 2 boutons differents).
function finalize(tot, sessionsSize, uniqueClickersSize) {
  tot.visiteurs = sessionsSize;
  tot.ctr = tot.visiteurs ? +((uniqueClickersSize / tot.visiteurs) * 100).toFixed(1) : 0;
  return tot;
}

// Agrege les ventes reelles (Gumroad) sur les memes fenetres temporelles que les visites.
// salesRows est deja filtre (is_test=false, is_refund=false) par la requete Supabase.
function aggregateSales(salesRows, now, curStart, prevStart, dayStart) {
  const daySales = new Map(); // 'YYYY-MM-DD' -> nb ventes
  let curVentes = 0, curRevenueCents = 0, prevVentes = 0, d24Ventes = 0, currency = '';

  for (const s of salesRows) {
    const ts = Date.parse(s.created_at);
    if (isNaN(ts)) continue;
    const amount = (s.price_cents || 0) * (s.quantity || 1);

    if (ts >= dayStart) d24Ventes++;

    if (ts >= curStart) {
      curVentes++;
      curRevenueCents += amount;
      if (s.currency) currency = s.currency;
      const day = (s.created_at || '').slice(0, 10);
      if (day) daySales.set(day, (daySales.get(day) || 0) + 1);
    } else if (ts >= prevStart) {
      prevVentes++;
    }
  }

  return { curVentes, curRevenueCents, prevVentes, d24Ventes, daySales, currency };
}

// Agrege les lignes brutes en metriques pretes a afficher, pour une periode de `days` jours.
function aggregate(rows, days, salesRows) {
  const now = Date.now();
  const curStart = now - days * DAY_MS;
  const prevStart = now - 2 * days * DAY_MS;
  const dayStart = now - DAY_MS; // pour les deltas 24h

  // Periode courante
  const cur = blankTotals();
  const curSessions = new Set();
  const curGumroadClickers = new Set(); // session_id ayant clique >=1 fois vers Gumroad (periode courante)
  const srcOfSession = new Map(); // session_id -> source (1ere vue)
  const devOfSession = new Map(); // session_id -> device (1ere vue)
  const dayVisitors = new Map();  // 'YYYY-MM-DD' -> Set(session_id)
  const dayGumroad = new Map();   // 'YYYY-MM-DD' -> nb clics gumroad
  const pageViews = new Map();    // path -> nb pageviews
  const ctaMap = new Map();       // cta brut -> { gumroad, extract }
  const srcGumroadClickers = new Map(); // source -> Set(session_id) ayant clique gumroad

  // Periode precedente (juste les totaux, pour comparaison)
  const prev = blankTotals();
  const prevSessions = new Set();
  const prevGumroadClickers = new Set();

  // Deltas dernieres 24h
  const d24 = { visiteurs: new Set(), pageviews: 0, gumroad_clicks: 0, extract_clicks: 0, tableur_clicks: 0, tableur_signups: 0 };

  let earliestTs = null;

  for (const r of rows) {
    const ts = Date.parse(r.created_at);
    if (isNaN(ts)) continue;
    if (earliestTs === null || ts < earliestTs) earliestTs = ts;
    const type = r.type;
    const sid = r.session_id || null;

    // --- deltas 24h (independants de la periode) ---
    if (ts >= dayStart) {
      if (type === 'pageview') d24.pageviews++;
      else if (type === 'gumroad_click') d24.gumroad_clicks++;
      else if (type === 'extract_click') d24.extract_clicks++;
      else if (type === 'tableur_click') d24.tableur_clicks++;
      else if (type === 'tableur_signup') d24.tableur_signups++;
      if (sid) d24.visiteurs.add(sid);
    }

    if (ts >= curStart) {
      // ---------- PERIODE COURANTE ----------
      bump(cur, type);
      if (sid) {
        curSessions.add(sid);
        if (!srcOfSession.has(sid)) srcOfSession.set(sid, r.source || 'autre');
        if (!devOfSession.has(sid)) devOfSession.set(sid, r.device || 'desktop');
        if (type === 'gumroad_click') curGumroadClickers.add(sid);
      }
      const day = (r.created_at || '').slice(0, 10);
      if (day) {
        if (!dayVisitors.has(day)) dayVisitors.set(day, new Set());
        if (sid) dayVisitors.get(day).add(sid);
        if (type === 'gumroad_click') dayGumroad.set(day, (dayGumroad.get(day) || 0) + 1);
      }
      if (type === 'pageview' && r.path) {
        pageViews.set(r.path, (pageViews.get(r.path) || 0) + 1);
      }
      if (type === 'gumroad_click' || type === 'extract_click') {
        const cta = (r.meta && r.meta.cta) ? String(r.meta.cta).slice(0, 40) : '';
        if (!ctaMap.has(cta)) ctaMap.set(cta, { gumroad: 0, extract: 0 });
        if (type === 'gumroad_click') ctaMap.get(cta).gumroad++; else ctaMap.get(cta).extract++;
      }
      if (type === 'gumroad_click' && sid) {
        const src = srcOfSession.get(sid) || r.source || 'autre';
        if (!srcGumroadClickers.has(src)) srcGumroadClickers.set(src, new Set());
        srcGumroadClickers.get(src).add(sid);
      }
    } else if (ts >= prevStart) {
      // ---------- PERIODE PRECEDENTE (comparaison) ----------
      bump(prev, type);
      if (sid) {
        prevSessions.add(sid);
        if (type === 'gumroad_click') prevGumroadClickers.add(sid);
      }
    }
  }

  finalize(cur, curSessions.size, curGumroadClickers.size);
  finalize(prev, prevSessions.size, prevGumroadClickers.size);

  // ---------- Ventes reelles Gumroad (Phase 2) ----------
  const salesAgg = aggregateSales(salesRows || [], now, curStart, prevStart, dayStart);
  cur.ventes = salesAgg.curVentes;
  cur.revenu_cents = salesAgg.curRevenueCents;
  cur.currency = salesAgg.currency;
  cur.taux_achat = cur.visiteurs ? +((cur.ventes / cur.visiteurs) * 100).toFixed(2) : 0;
  prev.ventes = salesAgg.prevVentes;

  // Transparence : le suivi ne demarre que depuis earliestTs. Si la periode precedente
  // remonte avant cette date, la comparaison est partielle (pas assez d'historique).
  const tracking_since = earliestTs ? new Date(earliestTs).toISOString().slice(0, 10) : null;
  const previous_partial = earliestTs === null ? true : earliestTs > prevStart;

  // Courbe (jours remplis, max MAX_DAY_POINTS points)
  const dayCount = Math.min(days, MAX_DAY_POINTS);
  const by_day = [];
  for (let i = dayCount - 1; i >= 0; i--) {
    const dd = new Date(now - i * DAY_MS).toISOString().slice(0, 10);
    by_day.push({
      date: dd,
      visiteurs: dayVisitors.has(dd) ? dayVisitors.get(dd).size : 0,
      gumroad_clicks: dayGumroad.get(dd) || 0,
      ventes: salesAgg.daySales.get(dd) || 0,
    });
  }

  // Visiteurs uniques par source / appareil
  const srcCount = {};
  for (const s of srcOfSession.values()) srcCount[s] = (srcCount[s] || 0) + 1;
  const by_source = Object.entries(srcCount).map(([source, visiteurs]) => ({ source, visiteurs })).sort((a, b) => b.visiteurs - a.visiteurs);

  const devCount = {};
  for (const d of devOfSession.values()) devCount[d] = (devCount[d] || 0) + 1;
  const by_device = Object.entries(devCount).map(([device, visiteurs]) => ({ device, visiteurs })).sort((a, b) => b.visiteurs - a.visiteurs);

  // Top pages par pages vues
  const by_page = [...pageViews.entries()].map(([path, pageviews]) => ({ path, pageviews })).sort((a, b) => b.pageviews - a.pageviews).slice(0, 8);

  // Clics par bouton (CTA), avec libelle lisible
  const by_cta = [...ctaMap.entries()]
    .map(([cta, c]) => ({ cta: ctaLabel(cta), gumroad: c.gumroad, extract: c.extract, total: c.gumroad + c.extract }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 8);

  // Conversion par source (visiteurs uniques -> visiteurs uniques ayant clique gumroad)
  const conv_by_source = Object.entries(srcCount).map(([source, visiteurs]) => {
    const g = srcGumroadClickers.has(source) ? srcGumroadClickers.get(source).size : 0;
    return { source, visiteurs, gumroad_clicks: g, rate: visiteurs ? +((g / visiteurs) * 100).toFixed(1) : 0 };
  }).sort((a, b) => b.visiteurs - a.visiteurs);

  const deltas24h = {
    visiteurs: d24.visiteurs.size,
    pageviews: d24.pageviews,
    gumroad_clicks: d24.gumroad_clicks,
    extract_clicks: d24.extract_clicks,
    tableur_clicks: d24.tableur_clicks,
    tableur_signups: d24.tableur_signups,
    ventes: salesAgg.d24Ventes,
  };

  return {
    period_days: days,
    tracking_since,
    previous_partial,
    totals: cur,
    previous: prev,
    deltas24h,
    by_day,
    by_source,
    by_device,
    by_page,
    by_cta,
    conv_by_source,
  };
}

exports.handler = async (event) => {
  const headers = buildHeaders(event);
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  // Jamais ouvert par defaut : sans config -> on refuse.
  if (!DASHBOARD_PASSWORD || !SUPABASE_SERVICE_KEY) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Dashboard non configure (variables env manquantes).' }) };
  }

  let body;
  try { body = JSON.parse(event.body || '{}'); } catch { body = {}; }
  if (body.password !== DASHBOARD_PASSWORD) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'Mot de passe invalide.' }) };
  }

  let days = parseInt(body.days, 10);
  if (!Number.isFinite(days) || days < 1) days = DEFAULT_DAYS;
  if (days > MAX_DAYS) days = MAX_DAYS;

  try {
    // On recupere 2x la periode (courante + precedente) pour la comparaison, plafonne.
    const fetchDays = Math.min(days * 2, 4000);
    const sinceISO = new Date(Date.now() - fetchDays * DAY_MS).toISOString();
    const url =
      `${SUPABASE_URL}/rest/v1/site_events` +
      `?select=created_at,type,source,device,session_id,path,meta` +
      `&created_at=gte.${encodeURIComponent(sinceISO)}` +
      `&order=created_at.asc` +
      `&limit=100000`;

    const salesUrl =
      `${SUPABASE_URL}/rest/v1/sales` +
      `?select=created_at,price_cents,quantity,currency` +
      `&created_at=gte.${encodeURIComponent(sinceISO)}` +
      `&is_test=eq.false&is_refund=eq.false` +
      `&order=created_at.asc&limit=100000`;

    const [res, salesRes] = await Promise.all([
      fetch(url, { headers: { apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}` } }),
      // Ventes = amelioration optionnelle : si la table "sales" n'existe pas encore
      // (SQL pas encore execute), on ne veut pas casser le reste du dashboard.
      fetch(salesUrl, { headers: { apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}` } }).catch((e) => e),
    ]);

    if (!res.ok) {
      console.error('dashboard-data read failed:', res.status, await res.text());
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Lecture Supabase echouee.' }) };
    }

    let salesRows = [];
    if (salesRes instanceof Response && salesRes.ok) {
      salesRows = await salesRes.json();
    } else {
      const detail = salesRes instanceof Response ? `${salesRes.status} ${await salesRes.text()}` : salesRes.message;
      console.error('dashboard-data sales read failed (degrade sans ventes):', detail);
    }

    const rows = await res.json();
    return { statusCode: 200, headers, body: JSON.stringify(aggregate(rows, days, salesRows)) };
  } catch (e) {
    console.error('dashboard-data failed:', e.message);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Erreur serveur.' }) };
  }
};
