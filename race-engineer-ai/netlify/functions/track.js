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
// ⚠️ Cet endpoint est PUBLIC et non authentifié, par nécessité : de
// l'analytique first-party ne peut pas exiger un compte. Mais il écrit avec la
// clé service_role, donc tout ce qu'il accepte finit dans la base. Avant le
// 2026-08-07, `meta` était accepté tel quel : n'importe qui, avec un curl,
// pouvait injecter du JSON arbitraire, données personnelles comprises, dans
// une table qui relève ensuite de VOTRE responsabilité RGPD (droit à
// l'effacement, cf. l'avertissement en tête de fichier).
// Deux bornes, volontairement minimales pour ne casser aucun événement légitime.
const MAX_META_CLES = 12;
// Un email injecté dans l'analytique devient une donnée personnelle qu'on n'a
// jamais demandée et qu'on ne sait pas rattacher à un consentement. On refuse.
const RESSEMBLE_A_UN_EMAIL = /[\w.+-]+@[\w-]+\.[a-z]{2,}/i;

// Deux traitements DIFFÉRENTS, parce que les deux problèmes n'ont rien à voir.
//
// Trop de clés ou trop long = signal d'abus, on REFUSE l'événement : personne
// de légitime n'envoie ça, et l'événement perdu se verra dans les chiffres.
//
// Un email dedans = on le RETIRE et on garde le reste. Refuser tout
// l'événement ferait perdre un témoignage entier parce que le pilote y a
// glissé son adresse, et il ne le saurait jamais (track() part sans réponse).
// La redaction ne perd rien et ne stocke rien qu'on n'a pas demandé.
function metaAcceptable(meta) {
  if (!meta || typeof meta !== 'object' || Array.isArray(meta)) return null;
  if (Object.keys(meta).length > MAX_META_CLES) return null;
  let str = JSON.stringify(meta);
  if (str.length > MAX_META_CHARS) return null;
  // ⚠️ On travaille sur la sérialisation ENTIÈRE, pas valeur par valeur : un
  // email peut être imbriqué dans un sous-objet.
  if (RESSEMBLE_A_UN_EMAIL.test(str)) {
    console.error('[TRACK] email retire du meta avant enregistrement.');
    str = str.replace(new RegExp(RESSEMBLE_A_UN_EMAIL.source, 'gi'), '[email-retire]');
    try {
      return JSON.parse(str);
    } catch (e) {
      return null; // redaction cassée : mieux vaut rien que du JSON douteux
    }
  }
  return meta;
}

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
    // Purge des fenêtres expirées : sans elle cette Map ne fait que GROSSIR,
    // une adresse vue une fois y restant pour la vie de l'instance Lambda.
    // Même correctif que dans chat.js.
    if (rateLimitMap.size > 500) {
      for (const [cle, val] of rateLimitMap) {
        if (now - val.windowStart > 60000) rateLimitMap.delete(cle);
      }
    }
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

    const safeMeta = metaAcceptable(meta);

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const { error } = await admin.from('events').insert({ event: name, meta: safeMeta });
    if (error) console.error('track insert rejected by Supabase:', error.message, error.code || '');
  } catch (e) {
    console.error('track failed:', e.message);
  }
  return { statusCode: 204, headers, body: '' };
};
