// =============================================
// Clem Kart Racing : Analytics site (first-party)
// POST { type, path, referrer, utm_*, session_id, meta } -> table Supabase site_events
// Ecriture en REST (fetch, SANS SDK ni dependance npm), style send-email.js.
// Anonyme, sans cookie, sans PII : l'IP sert UNIQUEMENT au rate-limit, jamais stockee.
// Analytics = jamais bloquant : non-config ou erreur -> 204 silencieux.
// =============================================

// IP du visiteur : x-nf-client-connection-ip (pose par Netlify) en priorite, comme retractation.js.
const { ipClient } = require('../lib/http.js');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://hkpknrrymgbnjmbewlyc.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Allowlist stricte des types (table dediee), tout le reste est jete.
const ALLOWED_TYPES = new Set([
  'pageview',
  'gumroad_click',   // historique (avant la V4, le guide se vendait sur Gumroad) : garde pour lire l'ancien tunnel
  'extract_click',
  // V4, site 1 : la page de liens /liens et les portes /aller/* vers Stripe (assets/site.js)
  'bio_click',       // clic sur un bouton de /liens (meta.bouton, meta.position, meta.plateforme, meta.cible)
  'stripe_click',    // clic sur une porte /aller/* vers Stripe (site 1 : meta.cta, meta.zone, meta.route, meta.cible ;
                     // site 2 : meta.cta = diag|prix|final|barre, meta.zone). Toujours AVANT le paiement.
  'tableur_click',   // clic vers la page tableur (interet, pas encore une inscription)
  'tableur_signup',  // email reellement envoye avec succes (evenement reel de conversion)
  'extrait_signup',  // extrait du guide reellement envoye par email (page extrait-guide.html)
  'demande_signup',  // formulaire /consulting ou /marques reellement envoye (meta.form, meta.parcours, meta.formule)
  'marques_parcours',// clic sur un parcours de /marques (meta.parcours = saison|reseaux|deux, meta.zone, meta.formule)
  'app_page_click',  // clic vers la page Race Engineer AI depuis le site
  'app_plan_click',  // clic sur le CTA d'une carte tarif (meta.plan = decouverte|pro|paddock)
  'app_early_access',// envoi du formulaire early access de l'app
  'app_video_play',  // clic sur le poster de la video de presentation
  // Site 2 (accueil catalogue + tunnel du debrief sur /onboard/)
  'diag_click',      // clic vers le diagnostic depuis l'accueil du site 2 (meta.cta = top|hero|carte|final)
  'diag_start',      // clic sur « Commencer le diagnostic »
  'diag_step',       // question validee (meta.step, meta.key, meta.value)
  'diag_exit',       // sortie honnete affichee (meta.kind = loc|nocam, meta.step)
  'diag_result',     // diagnostic affiche (reponses anonymes, aucune donnee personnelle)
  'faq_open',        // question de la FAQ ouverte (meta.q = 1..7)
]);

// Clefs de meta connues pour les evenements de la V4. Les autres clefs sont gardees telles
// quelles (le dashboard ignore ce qu'il ne connait pas), seules les valeurs sont bornees :
// une chaine est tronquee, une position devient un entier, le reste est jete.
const META_MAX_CHARS = 120;
function borner(valeur) {
  if (typeof valeur === 'string') return clip(valeur, META_MAX_CHARS);
  if (typeof valeur === 'number' && Number.isFinite(valeur)) return Math.trunc(valeur);
  if (typeof valeur === 'boolean') return valeur;
  return null;
}
function nettoyerMeta(type, meta) {
  if (type !== 'bio_click' && type !== 'stripe_click') return meta;
  const propre = {};
  for (const [clef, valeur] of Object.entries(meta)) {
    const v = borner(valeur);
    if (v !== null) propre[clef] = v;
  }
  return Object.keys(propre).length ? propre : null;
}

const MAX_META_CHARS = 2000;

// Le site 2 envoie ses evenements ici, depuis un autre domaine : ils portent meta.site
// pour ne pas se melanger aux pages du site 1 (qui garde son historique sans etiquette).
// Les brouillons Netlify (des deux sites) et les apercus locaux sont etiquetes a part : le
// dashboard les ignore, sinon chaque verification avant publication (netlify-cli : brouillon,
// verification, publication) compterait comme une vraie visite ou un vrai clic.
// Les adresses viennent de config/offres.json (sites.site1, sites.site2).
const OFFRES = require('../../../config/offres.json');
function hoteDe(url) {
  try { return new URL(String(url)).hostname.toLowerCase(); } catch { return ''; }
}
const SITE1_HOST = hoteDe(OFFRES.sites && OFFRES.sites.site1);
const SITE2_HOST = hoteDe(OFFRES.sites && OFFRES.sites.site2);
function siteLabel(host) {
  if (typeof host !== 'string') return null;
  const h = host.trim().toLowerCase();
  if (SITE2_HOST && h === SITE2_HOST) return 'site2';
  if (SITE2_HOST && h.endsWith(`--${SITE2_HOST}`)) return 'site2-brouillon';
  if (SITE1_HOST && h.endsWith(`--${SITE1_HOST}`)) return 'site1-brouillon';
  if (h === 'localhost' || h === '127.0.0.1') return 'local';
  return null;
}

const ALLOWED_ORIGINS = [
  process.env.URL,
  process.env.DEPLOY_PRIME_URL,
  `https://${SITE2_HOST}`,
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
    Vary: 'Origin',
  };
}

// Rate limit leger en memoire (anti-flood). Par instance "chaude", suffisant ici.
const rateLimitMap = new Map();
function checkRateLimit(ip) {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now - entry.windowStart > 60000) {
    rateLimitMap.set(ip, { count: 1, windowStart: now });
    return true;
  }
  if (entry.count >= 60) return false;
  entry.count++;
  return true;
}

// Tronque + nettoie une chaine (null si vide / non-string).
function clip(v, max) {
  if (typeof v !== 'string') return null;
  const s = v.trim();
  return s ? s.slice(0, max) : null;
}

// Classe un indice (utm_source ou hostname de referrer) vers un bucket connu, sinon null.
function classify(hint) {
  if (!hint) return null;
  const h = hint.toLowerCase();
  // ManyChat : l'appel a l'action Instagram ("commente EXTRAIT") passe par un DM
  // automatise. Sans ce bucket, ces arrivees tombaient dans 'autre' ou 'direct'
  // et on ne pouvait pas mesurer la fuite entre le commentaire et l'email laisse.
  if (h.includes('manychat') || h === 'mc') return 'manychat';
  if (h.includes('tiktok')) return 'tiktok';
  if (h.includes('instagram') || h === 'ig') return 'instagram';
  // fb.me / fb.watch : liens raccourcis frequents depuis l'app Facebook et Messenger.
  if (h.includes('facebook') || h === 'fb' || h === 'fb.me' || h === 'fb.watch') return 'facebook';
  if (h.includes('youtube') || h.includes('youtu.be') || h === 'yt') return 'youtube';
  if (h.includes('google')) return 'google';
  return null;
}

// source : UTM prioritaire, sinon referrer. -> tiktok | instagram | youtube | google | direct | autre
function deriveSource(referrer, utmSource, selfHost) {
  const fromUtm = classify(utmSource);
  if (fromUtm) return fromUtm;
  if (utmSource) return 'autre'; // UTM present mais non reconnu = intention de campagne

  if (!referrer) return 'direct';
  let host;
  try {
    host = new URL(referrer).hostname.toLowerCase();
  } catch {
    return 'autre';
  }
  const fromRef = classify(host);
  if (fromRef) return fromRef;
  if (selfHost && host === selfHost.toLowerCase()) return 'direct'; // navigation interne
  return 'autre';
}

// device depuis le User-Agent (UA classe, JAMAIS stocke). -> mobile | desktop
function deriveDevice(ua) {
  if (!ua) return 'desktop';
  return /Mobi|Android|iPhone|iPad|iPod|IEMobile|Opera Mini/i.test(ua) ? 'mobile' : 'desktop';
}

exports.handler = async (event) => {
  const headers = buildHeaders(event);
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: '' };

  const ip = ipClient(event);
  if (!checkRateLimit(ip)) return { statusCode: 204, headers, body: '' };

  // Jamais bloquant : toute erreur ci-dessous -> 204 silencieux.
  try {
    if (!SUPABASE_SERVICE_KEY) return { statusCode: 204, headers, body: '' };

    // Le site 2 envoie en text/plain (pas de requete preliminaire CORS) ; Netlify peut
    // alors transmettre le corps encode en base64.
    const rawBody = event.isBase64Encoded
      ? Buffer.from(event.body || '', 'base64').toString('utf8')
      : event.body;
    const data = JSON.parse(rawBody || '{}');

    const type = data.type;
    if (!ALLOWED_TYPES.has(type)) return { statusCode: 204, headers, body: '' };

    const path = clip(data.path, 256);
    const referrer = clip(data.referrer, 512);
    const utm_source = clip(data.utm_source, 100);
    const utm_medium = clip(data.utm_medium, 100);
    const utm_campaign = clip(data.utm_campaign, 100);
    const session_id = clip(data.session_id, 64);

    let meta = null;
    if (data.meta && typeof data.meta === 'object' && !Array.isArray(data.meta)) {
      const str = JSON.stringify(data.meta);
      if (str.length <= MAX_META_CHARS) meta = nettoyerMeta(type, data.meta);
    }

    // Site d'origine : seulement s'il est connu, jamais une valeur libre venue du navigateur.
    const site = siteLabel(data.site);
    if (site) meta = { ...(meta || {}), site };

    // Navigation interne : un referrer du meme site compte comme « direct », que la page
    // soit sur le site 1 (hote de la fonction) ou sur le site 2 (hote declare et reconnu).
    const selfHost = site ? data.site.trim().toLowerCase() : (event.headers['host'] || '');
    const source = deriveSource(referrer, utm_source, selfHost);
    const device = deriveDevice(event.headers['user-agent']);

    const row = {
      type,
      path,
      referrer,
      source,
      utm_source,
      utm_medium,
      utm_campaign,
      device,
      session_id,
      meta,
    };

    // Insert via API REST Supabase (service_role), sans SDK.
    const res = await fetch(`${SUPABASE_URL}/rest/v1/site_events`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_SERVICE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify(row),
    });

    if (!res.ok) {
      console.error('track-site insert failed:', res.status, await res.text());
    }
  } catch (e) {
    console.error('track-site failed:', e.message);
  }

  return { statusCode: 204, headers, body: '' };
};
