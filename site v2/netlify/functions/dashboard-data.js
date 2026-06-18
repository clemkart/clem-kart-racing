// =============================================
// Clem Kart Racing — Dashboard analytics (lecture/agregation)
// POST { password } -> JSON des metriques du site (30 derniers jours).
// Protege par DASHBOARD_PASSWORD. Lecture Supabase via REST (service_role), sans SDK.
// Contrairement a track-site.js, ici on VEUT voir les erreurs -> 500 explicite.
// =============================================

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://lqhtmwksxwjdspitului.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const DASHBOARD_PASSWORD = process.env.DASHBOARD_PASSWORD || '';

const PERIOD_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

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

// Agrege les lignes brutes en metriques pretes a afficher.
function aggregate(rows) {
  const totals = {
    visiteurs: 0,
    pageviews: 0,
    gumroad_clicks: 0,
    extract_clicks: 0,
    tableur_signups: 0,
    ctr: 0, // % de visiteurs ayant clique Gumroad
  };

  const sessions = new Set();
  const sessionSource = new Map(); // session_id -> source (1ere vue)
  const sessionDevice = new Map(); // session_id -> device (1ere vue)
  const dayVisitors = new Map();   // 'YYYY-MM-DD' -> Set(session_id)
  const dayGumroad = new Map();    // 'YYYY-MM-DD' -> nb clics gumroad

  for (const r of rows) {
    const type = r.type;
    const sid = r.session_id || null;
    const day = (r.created_at || '').slice(0, 10);

    if (type === 'pageview') totals.pageviews++;
    else if (type === 'gumroad_click') totals.gumroad_clicks++;
    else if (type === 'extract_click') totals.extract_clicks++;
    else if (type === 'tableur_signup') totals.tableur_signups++;

    if (sid) {
      sessions.add(sid);
      if (!sessionSource.has(sid)) sessionSource.set(sid, r.source || 'autre');
      if (!sessionDevice.has(sid)) sessionDevice.set(sid, r.device || 'desktop');
    }

    if (day) {
      if (!dayVisitors.has(day)) dayVisitors.set(day, new Set());
      if (sid) dayVisitors.get(day).add(sid);
      if (type === 'gumroad_click') dayGumroad.set(day, (dayGumroad.get(day) || 0) + 1);
    }
  }

  totals.visiteurs = sessions.size;
  totals.ctr = totals.visiteurs
    ? +((totals.gumroad_clicks / totals.visiteurs) * 100).toFixed(1)
    : 0;

  // Courbe : 30 jours remplis (zeros inclus), du plus ancien au plus recent.
  const by_day = [];
  for (let i = PERIOD_DAYS - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * DAY_MS).toISOString().slice(0, 10);
    by_day.push({
      date: d,
      visiteurs: dayVisitors.has(d) ? dayVisitors.get(d).size : 0,
      gumroad_clicks: dayGumroad.get(d) || 0,
    });
  }

  // Visiteurs uniques par source.
  const srcCount = {};
  for (const s of sessionSource.values()) srcCount[s] = (srcCount[s] || 0) + 1;
  const by_source = Object.entries(srcCount)
    .map(([source, visiteurs]) => ({ source, visiteurs }))
    .sort((a, b) => b.visiteurs - a.visiteurs);

  // Visiteurs uniques par appareil.
  const devCount = {};
  for (const d of sessionDevice.values()) devCount[d] = (devCount[d] || 0) + 1;
  const by_device = Object.entries(devCount)
    .map(([device, visiteurs]) => ({ device, visiteurs }))
    .sort((a, b) => b.visiteurs - a.visiteurs);

  return { period_days: PERIOD_DAYS, totals, by_day, by_source, by_device };
}

exports.handler = async (event) => {
  const headers = buildHeaders(event);
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  // Jamais ouvert par defaut : sans config -> on refuse.
  if (!DASHBOARD_PASSWORD || !SUPABASE_SERVICE_KEY) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Dashboard non configure (variables env manquantes).' }),
    };
  }

  // Mot de passe (dans le corps, jamais dans l'URL).
  let body;
  try { body = JSON.parse(event.body || '{}'); } catch { body = {}; }
  if (body.password !== DASHBOARD_PASSWORD) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'Mot de passe invalide.' }) };
  }

  try {
    const sinceISO = new Date(Date.now() - PERIOD_DAYS * DAY_MS).toISOString();
    const url =
      `${SUPABASE_URL}/rest/v1/site_events` +
      `?select=created_at,type,source,device,session_id` +
      `&created_at=gte.${encodeURIComponent(sinceISO)}` +
      `&order=created_at.asc` +
      `&limit=100000`;

    const res = await fetch(url, {
      headers: {
        apikey: SUPABASE_SERVICE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      },
    });

    if (!res.ok) {
      console.error('dashboard-data read failed:', res.status, await res.text());
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Lecture Supabase echouee.' }) };
    }

    const rows = await res.json();
    return { statusCode: 200, headers, body: JSON.stringify(aggregate(rows)) };
  } catch (e) {
    console.error('dashboard-data failed:', e.message);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Erreur serveur.' }) };
  }
};
