// =============================================
// Clem Kart Racing : Dashboard analytics (lecture/agregation)
// POST { password, days } -> JSON des metriques du site sur la periode demandee.
// Protege par DASHBOARD_PASSWORD. Lecture Supabase via REST (service_role), sans SDK.
// Ventes du debrief : lecture directe de Stripe (STRIPE_READ_KEY, cle restreinte en lecture).
// Contrairement a track-site.js, ici on VEUT voir les erreurs -> 500 explicite.
// =============================================

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://hkpknrrymgbnjmbewlyc.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const DASHBOARD_PASSWORD = process.env.DASHBOARD_PASSWORD || '';

const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_DAYS = 30;
const MAX_DAYS = 3650;        // "Tout"
const MAX_DAY_POINTS = 92;    // points max sur la courbe

const STRIPE_API = 'https://api.stripe.com/v1/checkout/sessions';
const STRIPE_MAX_PAGES = 10;  // 1000 sessions max par ouverture du dashboard

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
  // Site 2
  'carte-guide': 'Site 2 · fiche du guide',
  'sortie-loc': 'Diagnostic · sortie location',
  'sortie-nocam': 'Diagnostic · sortie sans images',
};
function ctaLabel(raw) { return CTA_LABELS[raw] || raw || '(sans nom)'; }

// Chemins -> noms lisibles. Sans ça la liste des pages est une suite de fichiers .html.
// Les pages du site 2 sont prefixees « s2: » : les deux sites ont une page « / ».
const PAGE_LABELS = {
  '/': 'Accueil',
  '/index.html': 'Accueil',
  '/extrait-guide.html': "Page extrait (capture email)",
  '/extrait': "Page extrait (capture email)",
  '/tableur-reglages.html': 'Page tableur (capture email)',
  '/race-engineer-ai.html': 'Page app Race Engineer AI',
  '/blog.html': 'Blog, sommaire (depublie)',
  '/merci.html': 'Page merci (apres achat)',
  '/merci-fondateur.html': 'Page merci (fondateur app)',
  '/mentions-legales.html': 'Mentions legales',
  '/app-preview.html': "Apercu de l'app",
  // Articles depublies le 2026-08-31 : le libelle reste, sinon l'historique du
  // dashboard afficherait des chemins bruts pour les visites d'avant cette date.
  '/blog-freinage-degressif.html': 'Article freinage degressif (depublie)',
  '/blog-mental-karting.html': 'Article mental (depublie)',
  '/blog-trajectoire-grip.html': 'Article trajectoire et grip (depublie)',
  '/blog-volant-karting.html': 'Article le volant (depublie)',
  's2:/': 'Site 2 · Accueil catalogue',
  's2:/onboard/': 'Site 2 · Diagnostic et offre débrief',
};
function pageLabel(path) {
  if (PAGE_LABELS[path]) return PAGE_LABELS[path];
  return (path || '(inconnu)').replace(/^\//, '').replace(/\.html$/, '');
}

// Pages de capture email : elles alimentent l'entonnoir, pas seulement la liste des pages.
const PAGE_EXTRAIT = new Set(['/extrait-guide.html', '/extrait']);
const PAGE_TABLEUR = new Set(['/tableur-reglages.html']);

// Les visites du dashboard, ce sont les miennes : elles fausseraient visiteurs et pages vues.
const PATHS_EXCLUS = new Set(['/dashboard.html']);

// Site d'un evenement : les lignes du site 1 n'ont pas d'etiquette (historique inchange).
// Brouillons Netlify et apercus locaux = tests, jamais comptes.
const SITES_DE_TEST = new Set(['site2-brouillon', 'local']);
function siteOf(row) {
  return (row.meta && typeof row.meta.site === 'string') ? row.meta.site : 'site1';
}
// Cle de page : sur le site 2, « /index.html » et « / » sont la meme page, « /onboard » aussi.
function pageKey(row, site) {
  if (site !== 'site2') return row.path;
  let p = row.path || '/';
  p = p.replace(/index\.html$/, '');
  if (!p.endsWith('/')) p += '/';
  return `s2:${p}`;
}

// Libelle d'une campagne d'acquisition (les UTM poses par ManyChat, la bio, etc.).
function campaignLabel(row) {
  const parts = [row.utm_source, row.utm_medium, row.utm_campaign].filter(Boolean);
  return parts.length ? parts.join(' · ') : null;
}

// Identifiant de visite tel qu'il est colle a la fin du profil envoye a Stripe
// (« ...-sid-XXXXXXXXXXXX ») : alphanumerique, 12 caracteres.
function cleSession(sid) {
  return String(sid || '').replace(/[^A-Za-z0-9]/g, '').slice(0, 12);
}

// Chaque etape rapportee a la precedente (c'est la que ca fuit).
function pct(a, b) { return b ? +((a / b) * 100).toFixed(1) : 0; }

// ---------- Tunnel du debrief : questions, boutons, FAQ nommes ----------
const DIAG_QUESTIONS = [
  { step: 1, cle: 'kart', question: 'Sur quoi il roule', reponses: { perso: 'Son propre kart', loc: 'De la location', mixte: 'Les deux' } },
  { step: 2, cle: 'stag', question: 'Depuis quand ses chronos stagnent', reponses: { semaines: 'Quelques semaines', mois: 'Quelques mois', '1an': 'Environ un an', '2ans': 'Deux ans ou plus' } },
  { step: 3, cle: 'why', question: 'Sait dire pourquoi son meilleur tour était bon', reponses: { oui: 'Oui, précisément', vague: 'Vaguement', non: 'Non' } },
  { step: 4, cle: 'zone', question: 'Où il sent que ça part', reponses: { frein: 'Au freinage', traj: "De l'entrée au point de corde", gaz: 'À la remise de gaz', nsp: 'Ne sait pas dire' } },
  { step: 5, cle: 'essai', question: "Ce qu'il a déjà essayé", reponses: { matos: 'Du meilleur matériel', volume: 'Rouler plus souvent', paddock: 'Les conseils du paddock', onboard: 'Regarder des onboards', rien: 'Rien de précis' } },
  { step: 6, cle: 'rage', question: "Ce qui l'agace le plus", reponses: { potes: 'Se faire battre par ses potes', argent: 'Dépenser sans avancer', flou: 'Rouler sans comprendre' } },
  { step: 7, cle: 'video', question: 'Ses images onboard', reponses: { souvent: 'À chaque session', parfois: 'De temps en temps', jamais: 'Jamais filmé' } },
];
const BOUTONS_PAIEMENT = {
  diag: 'Bouton après le diagnostic',
  prix: 'Bouton du bloc prix',
  final: 'Bouton de fin de page',
  barre: 'Barre fixe en bas',
};
const FAQ_QUESTIONS = {
  1: 'Et si ça ne change rien à mes chronos ?',
  2: 'Quelle vidéo je dois envoyer ?',
  3: 'Je ne roule pas souvent. Ça vaut le coup ?',
  4: 'Quelle différence avec le guide ?',
  5: 'Et si je suis vraiment lent ?',
  6: "Comment je t'envoie mon onboard ?",
  7: 'Je reçois quoi, et quand ?',
};

function blankTotals() {
  return {
    visiteurs: 0, pageviews: 0, gumroad_clicks: 0, extract_clicks: 0, tableur_clicks: 0, tableur_signups: 0, extrait_signups: 0, ctr: 0,
    ventes: 0, revenu_cents: 0, taux_achat: 0, extraits_gumroad: 0,
  };
}
function bump(tot, type) {
  if (type === 'pageview') tot.pageviews++;
  else if (type === 'gumroad_click') tot.gumroad_clicks++;
  else if (type === 'extract_click') tot.extract_clicks++;
  else if (type === 'tableur_click') tot.tableur_clicks++;
  else if (type === 'tableur_signup') tot.tableur_signups++;
  else if (type === 'extrait_signup') tot.extrait_signups++;
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
// L'extrait est un produit Gumroad a 0 EUR : Gumroad envoie un ping pour lui
// exactement comme pour une vente payante. Sans ce tri, chaque telechargement
// gonflait le nombre de "ventes reelles", le taux d'achat et l'entonnoir, alors
// qu'il n'a rapporte aucun euro.
const EXTRAIT_PERMALINKS = String(process.env.GUMROAD_EXTRAIT_PERMALINKS || 'extrait,ehdkm')
  .toLowerCase().split(',').map((x) => x.trim()).filter(Boolean);

function estExtraitGratuit(s) {
  const raw = s.raw || {};
  const liens = [];
  for (const v of [raw.permalink, raw.short_product_id, raw.product_permalink, raw.product_id]) {
    if (!v) continue;
    const str = String(v).toLowerCase().replace(/[?#].*$/, '').replace(/\/+$/, '');
    liens.push(str.slice(str.lastIndexOf('/') + 1));
  }
  if (liens.length) return liens.some((x) => EXTRAIT_PERMALINKS.includes(x));
  const nom = String(s.product_name || '').toLowerCase();
  if (nom) return nom.includes('extrait');
  // Sans nom ni permalink, un prix nul est presque toujours l'extrait offert.
  // Un produit payant inconnu reste une vente : mieux vaut une vente mal
  // etiquetee qu'une vente perdue.
  return (s.price_cents || 0) === 0;
}

function aggregateSales(salesRows, now, curStart, prevStart, dayStart) {
  const daySales = new Map(); // 'YYYY-MM-DD' -> nb ventes
  let curVentes = 0, curRevenueCents = 0, prevVentes = 0, d24Ventes = 0, currency = '';
  // Dates calculees sur TOUT l'historique recupere, pas seulement la periode affichee :
  // « ma premiere vente » ne doit pas changer parce qu'on regarde 7 jours.
  let firstSaleDate = null, lastSaleDate = null;
  let curExtraits = 0, prevExtraits = 0, d24Extraits = 0;

  for (const s of salesRows) {
    const ts = Date.parse(s.created_at);
    if (isNaN(ts)) continue;
    // Un extrait gratuit n'est pas une vente : compte a part, jamais dans le CA.
    if (estExtraitGratuit(s)) {
      if (ts >= dayStart) d24Extraits++;
      if (ts >= curStart) curExtraits++;
      else if (ts >= prevStart) prevExtraits++;
      continue;
    }
    const amount = (s.price_cents || 0) * (s.quantity || 1);
    const day = (s.created_at || '').slice(0, 10);
    if (day) {
      if (!firstSaleDate || day < firstSaleDate) firstSaleDate = day;
      if (!lastSaleDate || day > lastSaleDate) lastSaleDate = day;
    }

    if (ts >= dayStart) d24Ventes++;

    if (ts >= curStart) {
      curVentes++;
      curRevenueCents += amount;
      if (s.currency) currency = s.currency;
      if (day) daySales.set(day, (daySales.get(day) || 0) + 1);
    } else if (ts >= prevStart) {
      prevVentes++;
    }
  }

  return { curVentes, curRevenueCents, prevVentes, d24Ventes, daySales, currency, firstSaleDate, lastSaleDate,
           curExtraits, prevExtraits, d24Extraits };
}

// ---------- Ventes Stripe du debrief ----------
// Lecture seule, sessions de paiement terminees depuis `sinceMs`. Jamais bloquant :
// sans cle ou en cas de panne, le dashboard s'affiche et signale le statut.
async function lireStripe(sinceMs) {
  const cle = process.env.STRIPE_READ_KEY || '';
  if (!cle) return { statut: 'non_configure', sessions: [] };
  const sessions = [];
  let apres = null;
  try {
    for (let page = 0; page < STRIPE_MAX_PAGES; page++) {
      const params = new URLSearchParams({ limit: '100', status: 'complete', 'created[gte]': String(Math.floor(sinceMs / 1000)) });
      params.append('expand[]', 'data.line_items');
      params.append('expand[]', 'data.payment_intent.latest_charge');
      if (apres) params.set('starting_after', apres);
      const res = await fetch(`${STRIPE_API}?${params}`, { headers: { Authorization: `Bearer ${cle}` } });
      if (!res.ok) {
        console.error('dashboard-data stripe read failed:', res.status);
        return { statut: 'erreur', detail: `Stripe HTTP ${res.status}`, sessions: [] };
      }
      const corps = await res.json();
      const lot = Array.isArray(corps.data) ? corps.data : [];
      sessions.push(...lot);
      if (!corps.has_more || !lot.length) break;
      apres = lot[lot.length - 1].id;
    }
    return { statut: 'ok', sessions };
  } catch (e) {
    console.error('dashboard-data stripe read failed:', e.message);
    return { statut: 'erreur', detail: 'Stripe injoignable', sessions: [] };
  }
}

// Une vente = session payee, en mode reel, non remboursee en totalite, contenant le debrief.
// Remboursement partiel : la vente reste, le montant rembourse sort du CA.
// Aucune donnee client (email, nom, lien video) ne sort de cette fonction.
function aggregateStripe(sessions, curStart, sourceParSession) {
  const out = { ventes: 0, options_guide: 0, revenu_cents: 0, currency: '', derniere_vente: null, parSource: new Map(), parJour: new Map() };
  for (const s of sessions || []) {
    if (!s || s.status !== 'complete' || s.payment_status !== 'paid' || s.livemode === false) continue;
    const charge = (s.payment_intent && typeof s.payment_intent === 'object'
      && s.payment_intent.latest_charge && typeof s.payment_intent.latest_charge === 'object')
      ? s.payment_intent.latest_charge : null;
    if (charge && charge.refunded) continue;
    const lignes = (s.line_items && Array.isArray(s.line_items.data)) ? s.line_items.data : [];
    const estDebrief = (l) => /d[ée]brief/i.test(l.description || '');
    // Une future offre Stripe (coaching...) ne doit pas gonfler le debrief.
    if (lignes.length && !lignes.some(estDebrief)) continue;

    const ts = (s.created || 0) * 1000;
    const jour = ts ? new Date(ts).toISOString().slice(0, 10) : null;
    if (jour && (!out.derniere_vente || jour > out.derniere_vente)) out.derniere_vente = jour;
    if (ts < curStart) continue;

    out.ventes++;
    if (lignes.some((l) => !estDebrief(l) && /guide|comprendre/i.test(l.description || ''))) out.options_guide++;
    out.revenu_cents += Math.max(0, (s.amount_total || 0) - ((charge && charge.amount_refunded) || 0));
    if (s.currency) out.currency = s.currency;
    if (jour) out.parJour.set(jour, (out.parJour.get(jour) || 0) + 1);

    const lien = /-sid-([A-Za-z0-9]{1,32})$/.exec(s.client_reference_id || '');
    const source = (lien && sourceParSession.get(lien[1].slice(0, 12))) || 'non reliée';
    out.parSource.set(source, (out.parSource.get(source) || 0) + 1);
  }
  return out;
}

// Agrege les lignes brutes en metriques pretes a afficher, pour une periode de `days` jours.
function aggregate(rows, days, salesRows, stripeLu) {
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
  const pageViews = new Map();    // cle de page -> nb pageviews
  const ctaMap = new Map();       // cta brut -> { gumroad, extract }
  const srcGumroadClickers = new Map(); // source -> Set(session_id) ayant clique gumroad
  const daySignups = new Map();   // 'YYYY-MM-DD' -> nb inscriptions email
  // campagne -> { visiteurs:Set, inscriptions, clics_guide }
  const campaigns = new Map();
  // Toutes periodes : visite -> source, pour relier une vente Stripe a son origine.
  const sourceParSession = new Map();

  // Tunnel du debrief (site 2), en visiteurs uniques sur la periode courante
  const deb = {
    onboard: new Set(), start: new Set(), result: new Set(), paiement: new Set(),
    accueilDiag: new Set(), accueilGuide: new Set(),
    steps: new Map(),    // step -> Set(session_id)
    exits: { loc: new Set(), nocam: new Set() },
    boutons: new Map(),  // cta -> Set(session_id)
    faq: new Map(),      // n° de question -> Set(session_id)
    reponses: new Map(), // cle -> Map(session_id -> derniere reponse)
  };

  // Periode precedente (juste les totaux, pour comparaison)
  const prev = blankTotals();
  const prevSessions = new Set();
  const prevGumroadClickers = new Set();

  // Deltas dernieres 24h
  const d24 = { visiteurs: new Set(), pageviews: 0, gumroad_clicks: 0, extract_clicks: 0, tableur_clicks: 0, tableur_signups: 0, extrait_signups: 0 };

  let earliestTs = null;
  let testsIgnores = 0;

  for (const r of rows) {
    const ts = Date.parse(r.created_at);
    if (isNaN(ts)) continue;
    if (PATHS_EXCLUS.has(r.path)) continue; // mes propres consultations du dashboard
    const site = siteOf(r);
    if (SITES_DE_TEST.has(site)) { testsIgnores++; continue; } // brouillons et apercus locaux
    if (earliestTs === null || ts < earliestTs) earliestTs = ts;
    const type = r.type;
    const sid = r.session_id || null;
    const estInscription = type === 'tableur_signup' || type === 'extrait_signup';
    const pk = pageKey(r, site);
    if (sid) {
      const cle = cleSession(sid);
      if (cle && !sourceParSession.has(cle)) sourceParSession.set(cle, r.source || 'autre');
    }

    // --- deltas 24h (independants de la periode) ---
    if (ts >= dayStart) {
      if (type === 'pageview') d24.pageviews++;
      else if (type === 'gumroad_click') d24.gumroad_clicks++;
      else if (type === 'extract_click') d24.extract_clicks++;
      else if (type === 'tableur_click') d24.tableur_clicks++;
      else if (type === 'tableur_signup') d24.tableur_signups++;
      else if (type === 'extrait_signup') d24.extrait_signups++;
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
        if (estInscription) daySignups.set(day, (daySignups.get(day) || 0) + 1);
      }
      if (type === 'pageview' && pk) {
        pageViews.set(pk, (pageViews.get(pk) || 0) + 1);
      }
      // Attribution par campagne : d'ou vient le trafic ET qui laisse son email.
      const camp = campaignLabel(r);
      if (camp) {
        if (!campaigns.has(camp)) campaigns.set(camp, { visiteurs: new Set(), inscriptions: 0, clics_guide: 0 });
        const c = campaigns.get(camp);
        if (sid) c.visiteurs.add(sid);
        if (estInscription) c.inscriptions++;
        if (type === 'gumroad_click') c.clics_guide++;
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
      if (site === 'site2' && sid) compterDebrief(deb, r, type, sid, pk);
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

  // ---------- Ventes Stripe du debrief ----------
  const lu = stripeLu || { statut: 'non_configure', sessions: [] };
  const st = aggregateStripe(lu.sessions, curStart, sourceParSession);
  cur.revenu_total_cents = cur.revenu_cents + st.revenu_cents;

  // Transparence : le suivi ne demarre que depuis earliestTs. Si la periode precedente
  // remonte avant cette date, la comparaison est partielle (pas assez d'historique).
  const tracking_since = earliestTs ? new Date(earliestTs).toISOString().slice(0, 10) : null;
  const previous_partial = earliestTs === null ? true : earliestTs > prevStart;

  // Courbe (jours remplis, max MAX_DAY_POINTS points). « ventes » = guide + debrief.
  const dayCount = Math.min(days, MAX_DAY_POINTS);
  const by_day = [];
  for (let i = dayCount - 1; i >= 0; i--) {
    const dd = new Date(now - i * DAY_MS).toISOString().slice(0, 10);
    by_day.push({
      date: dd,
      visiteurs: dayVisitors.has(dd) ? dayVisitors.get(dd).size : 0,
      gumroad_clicks: dayGumroad.get(dd) || 0,
      inscriptions: daySignups.get(dd) || 0,
      ventes: (salesAgg.daySales.get(dd) || 0) + (st.parJour.get(dd) || 0),
    });
  }

  // ---------- Entonnoir reel : du trafic a la vente, en passant par l'email ----------
  cur.extraits_gumroad = salesAgg.curExtraits;
  prev.extraits_gumroad = salesAgg.prevExtraits;
  cur.inscriptions = cur.tableur_signups + cur.extrait_signups;
  prev.inscriptions = prev.tableur_signups + prev.extrait_signups;
  cur.vues_page_extrait = 0;
  cur.vues_page_tableur = 0;
  for (const [path, vues] of pageViews.entries()) {
    if (PAGE_EXTRAIT.has(path)) cur.vues_page_extrait += vues;
    if (PAGE_TABLEUR.has(path)) cur.vues_page_tableur += vues;
  }
  const vuesCapture = cur.vues_page_extrait + cur.vues_page_tableur;

  const funnel = [
    { etape: 'Visiteurs du site', valeur: cur.visiteurs, taux: null },
    { etape: 'Vues des pages de capture', valeur: vuesCapture, taux: pct(vuesCapture, cur.visiteurs) },
    { etape: 'Emails laisses', valeur: cur.inscriptions, taux: pct(cur.inscriptions, vuesCapture) },
    { etape: 'Clics vers le guide', valeur: cur.gumroad_clicks, taux: pct(cur.gumroad_clicks, cur.inscriptions) },
    { etape: 'Ventes', valeur: cur.ventes, taux: pct(cur.ventes, cur.gumroad_clicks) },
  ];

  // Entonnoir de l'extrait seul. L'entonnoir global melange tableur et extrait,
  // or l'appel a l'action Instagram ("commente EXTRAIT") a son propre parcours :
  // commentaire -> DM ManyChat -> page extrait -> email laisse -> mail envoye.
  // Le nombre de commentaires vit dans ManyChat, le dashboard prend la suite.
  const funnel_extrait = [
    { etape: 'Vues de la page extrait', valeur: cur.vues_page_extrait, taux: null },
    { etape: 'Emails laisses', valeur: cur.extrait_signups, taux: pct(cur.extrait_signups, cur.vues_page_extrait) },
    { etape: 'Mails extrait envoyes', valeur: cur.extrait_signups, taux: 100 },
  ];

  const debrief = construireDebrief(deb, st, lu);

  // Meilleur jour de la periode (en visiteurs), utile apres une video qui marche.
  let meilleurJour = null;
  for (const j of by_day) {
    if (!meilleurJour || j.visiteurs > meilleurJour.visiteurs) meilleurJour = j;
  }

  const dates = {
    suivi_depuis: earliestTs ? new Date(earliestTs).toISOString().slice(0, 10) : null,
    meilleur_jour: meilleurJour && meilleurJour.visiteurs ? meilleurJour : null,
    premiere_vente: salesAgg.firstSaleDate,
    derniere_vente: salesAgg.lastSaleDate,
    derniere_vente_debrief: st.derniere_vente,
    derniere_inscription: [...daySignups.keys()].sort().pop() || null,
  };

  const by_campaign = [...campaigns.entries()]
    .map(([campagne, c]) => ({
      campagne,
      visiteurs: c.visiteurs.size,
      inscriptions: c.inscriptions,
      clics_guide: c.clics_guide,
      taux_inscription: c.visiteurs.size ? +((c.inscriptions / c.visiteurs.size) * 100).toFixed(1) : 0,
    }))
    .sort((a, b) => b.visiteurs - a.visiteurs)
    .slice(0, 10);

  // Visiteurs uniques par source / appareil
  const srcCount = {};
  for (const s of srcOfSession.values()) srcCount[s] = (srcCount[s] || 0) + 1;
  const by_source = Object.entries(srcCount).map(([source, visiteurs]) => ({ source, visiteurs })).sort((a, b) => b.visiteurs - a.visiteurs);

  const devCount = {};
  for (const d of devOfSession.values()) devCount[d] = (devCount[d] || 0) + 1;
  const by_device = Object.entries(devCount).map(([device, visiteurs]) => ({ device, visiteurs })).sort((a, b) => b.visiteurs - a.visiteurs);

  // Top pages par pages vues, avec un nom lisible
  const by_page = [...pageViews.entries()]
    .map(([path, pageviews]) => ({ path, nom: pageLabel(path), pageviews }))
    .sort((a, b) => b.pageviews - a.pageviews)
    .slice(0, 12);

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
    extrait_signups: d24.extrait_signups,
    inscriptions: d24.tableur_signups + d24.extrait_signups,
    ventes: salesAgg.d24Ventes,
  };

  return {
    period_days: days,
    tracking_since,
    previous_partial,
    tests_ignores: testsIgnores,
    totals: cur,
    previous: prev,
    deltas24h,
    funnel,
    funnel_extrait,
    debrief,
    dates,
    by_day,
    by_source,
    by_device,
    by_page,
    by_campaign,
    by_cta,
    conv_by_source,
  };
}

// Un evenement du site 2, compte dans le tunnel du debrief (visiteurs uniques).
function compterDebrief(deb, r, type, sid, pk) {
  const meta = r.meta || {};
  const ajouter = (map, cle) => {
    if (!map.has(cle)) map.set(cle, new Set());
    map.get(cle).add(sid);
  };
  if (type === 'pageview') {
    if (pk === 's2:/onboard/') deb.onboard.add(sid);
  } else if (type === 'diag_click') {
    deb.accueilDiag.add(sid);
  } else if (type === 'gumroad_click') {
    if (meta.cta === 'carte-guide') deb.accueilGuide.add(sid);
  } else if (type === 'diag_start') {
    deb.start.add(sid);
  } else if (type === 'diag_step') {
    const step = Number(meta.step);
    if (step >= 1 && step <= DIAG_QUESTIONS.length) ajouter(deb.steps, step);
    if (typeof meta.key === 'string' && meta.value !== undefined && meta.value !== null) {
      if (!deb.reponses.has(meta.key)) deb.reponses.set(meta.key, new Map());
      deb.reponses.get(meta.key).set(sid, String(meta.value)); // les lignes arrivent dans l'ordre : la derniere gagne
    }
  } else if (type === 'diag_exit') {
    if (meta.kind === 'loc') deb.exits.loc.add(sid);
    else if (meta.kind === 'nocam') deb.exits.nocam.add(sid);
  } else if (type === 'diag_result') {
    deb.result.add(sid);
  } else if (type === 'stripe_click') {
    deb.paiement.add(sid);
    ajouter(deb.boutons, String(meta.cta || '(sans nom)').slice(0, 20));
  } else if (type === 'faq_open') {
    const q = Number(meta.q);
    if (q >= 1) ajouter(deb.faq, q);
  }
}

// Met en forme le bloc « debrief » renvoye au navigateur (agregats uniquement).
function construireDebrief(deb, st, lu) {
  const commencent = deb.start.size;
  const profils = DIAG_QUESTIONS.map((q) => {
    const compte = new Map();
    for (const valeur of (deb.reponses.get(q.cle) || new Map()).values()) {
      // Question 5 a plusieurs reponses possibles, envoyees jointes par « _ ».
      const parts = q.cle === 'essai' ? valeur.split('_').filter(Boolean) : [valeur];
      for (const v of parts) compte.set(v, (compte.get(v) || 0) + 1);
    }
    const reponses = [...compte.entries()]
      .map(([valeur, n]) => ({ valeur, label: q.reponses[valeur] || valeur, n }))
      .sort((a, b) => b.n - a.n);
    return { cle: q.cle, question: q.question, reponses };
  });

  return {
    stripe: lu.detail ? { statut: lu.statut, detail: lu.detail } : { statut: lu.statut },
    clics_accueil: { diagnostic: deb.accueilDiag.size, guide: deb.accueilGuide.size },
    funnel: [
      { etape: 'Visiteurs du diagnostic', valeur: deb.onboard.size, taux: null },
      { etape: 'Diagnostic commencé', valeur: commencent, taux: pct(commencent, deb.onboard.size) },
      { etape: 'Diagnostic terminé', valeur: deb.result.size, taux: pct(deb.result.size, commencent) },
      { etape: 'Clic vers le paiement', valeur: deb.paiement.size, taux: pct(deb.paiement.size, deb.result.size) },
      { etape: 'Débriefs payés', valeur: st.ventes, taux: pct(st.ventes, deb.paiement.size) },
    ],
    etapes: DIAG_QUESTIONS.map((q) => {
      const sessions = (deb.steps.get(q.step) || new Set()).size;
      return { step: q.step, question: q.question, sessions, taux_depuis_depart: pct(sessions, commencent) };
    }),
    sorties: { location: deb.exits.loc.size, sans_images: deb.exits.nocam.size },
    boutons_paiement: [...deb.boutons.entries()]
      .map(([cta, set]) => ({ cta, label: BOUTONS_PAIEMENT[cta] || cta, sessions: set.size }))
      .sort((a, b) => b.sessions - a.sessions),
    faq: [...deb.faq.entries()]
      .map(([q, set]) => ({ q, question: FAQ_QUESTIONS[q] || `Question ${q}`, ouvertures: set.size }))
      .sort((a, b) => b.ouvertures - a.ouvertures),
    profils,
    ventes: st.ventes,
    options_guide: st.options_guide,
    revenu_cents: st.revenu_cents,
    currency: st.currency || 'eur',
    ventes_par_source: [...st.parSource.entries()]
      .map(([source, ventes]) => ({ source, ventes }))
      .sort((a, b) => b.ventes - a.ventes),
    derniere_vente: st.derniere_vente,
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
    const sinceMs = Date.now() - fetchDays * DAY_MS;
    const sinceISO = new Date(sinceMs).toISOString();
    // Les colonnes UTM doivent etre demandees : sans elles, le panneau Campagnes restait vide.
    const url =
      `${SUPABASE_URL}/rest/v1/site_events` +
      `?select=created_at,type,source,device,session_id,path,meta,utm_source,utm_medium,utm_campaign` +
      `&created_at=gte.${encodeURIComponent(sinceISO)}` +
      `&order=created_at.asc` +
      `&limit=100000`;

    const salesUrl =
      `${SUPABASE_URL}/rest/v1/sales` +
      `?select=created_at,product_name,price_cents,quantity,currency,raw` +
      `&created_at=gte.${encodeURIComponent(sinceISO)}` +
      `&is_test=eq.false&is_refund=eq.false` +
      `&order=created_at.asc&limit=100000`;

    const [res, salesRes, stripeLu] = await Promise.all([
      fetch(url, { headers: { apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}` } }),
      // Ventes = amelioration optionnelle : si la table "sales" n'existe pas encore
      // (SQL pas encore execute), on ne veut pas casser le reste du dashboard.
      fetch(salesUrl, { headers: { apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}` } }).catch((e) => e),
      lireStripe(sinceMs),
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
    return { statusCode: 200, headers, body: JSON.stringify(aggregate(rows, days, salesRows, stripeLu)) };
  } catch (e) {
    console.error('dashboard-data failed:', e.message);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Erreur serveur.' }) };
  }
};
