// =============================================
// Race Engineer AI : Analytics first-party
// POST {event, meta} → table Supabase events (service_role)
// Sans cookies, sans traceur tiers. No-op silencieux si non configuré.
//
// ⚠️ NE PAS DIRE "anonyme" SANS NUANCE, c'était le cas avant et c'était faux.
// La quasi-totalité des événements ne portent aucun identifiant, mais
// l'événement "testimonial" contient un PRÉNOM et un texte libre écrits par le
// pilote, avec son consentement explicite via une case à cocher obligatoire.
// Conséquence à ne pas oublier : cette table entre dans le périmètre du droit
// à l'effacement. Une demande de suppression RGPD doit couvrir profiles,
// sessions ET events.
// =============================================

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://hkpknrrymgbnjmbewlyc.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const EVENT_NAME_RE = /^[a-z0-9_]{1,40}$/;
const MAX_META_CHARS = 2000;

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
    Vary: 'Origin',
  };
}

// Rate limit léger en mémoire (anti-flood)
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

exports.handler = async (event) => {
  const headers = buildHeaders(event);
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: '' };

  const ip = event.headers['x-forwarded-for']?.split(',')[0]?.trim() || 'unknown';
  if (!checkRateLimit(ip)) return { statusCode: 204, headers, body: '' };

  // Analytics = jamais bloquant : toute erreur → 204 silencieux
  try {
    if (!SUPABASE_SERVICE_KEY) return { statusCode: 204, headers, body: '' };

    const { event: name, meta } = JSON.parse(event.body || '{}');
    if (!name || !EVENT_NAME_RE.test(name)) return { statusCode: 204, headers, body: '' };

    let safeMeta = null;
    if (meta && typeof meta === 'object' && !Array.isArray(meta)) {
      const str = JSON.stringify(meta);
      if (str.length <= MAX_META_CHARS) safeMeta = meta;
    }

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const { error } = await admin.from('events').insert({ event: name, meta: safeMeta });
    if (error) console.error('track insert rejected by Supabase:', error.message, error.code || '');
  } catch (e) {
    console.error('track failed:', e.message);
  }
  return { statusCode: 204, headers, body: '' };
};
