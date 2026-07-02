// =============================================
// Clem Kart Racing — Reception des ventes Gumroad (Phase 2)
// POST (Gumroad "Ping", form-urlencoded) -> table Supabase sales.
// Protege par un jeton secret dans l'URL (Gumroad ne signe pas ses pings).
// Contrairement a track-site.js : les erreurs internes renvoient 500 pour
// que Gumroad reessaie (jusqu'a 3 fois sur 3h) plutot que de perdre une vente.
// =============================================

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://hkpknrrymgbnjmbewlyc.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const PING_SECRET = process.env.GUMROAD_PING_SECRET || '';

// Champs jamais stockes, meme dans le payload brut (vie privee).
const PII_FIELDS = ['email', 'full_name', 'purchaser_id'];

function parseBody(event) {
  const raw = event.body || '';
  // Gumroad envoie du form-urlencoded. On reste tolerant si jamais ce n'etait pas le cas.
  const params = new URLSearchParams(raw);
  const obj = {};
  for (const [k, v] of params.entries()) obj[k] = v;
  if (Object.keys(obj).length === 0 && raw.trim().startsWith('{')) {
    try { return JSON.parse(raw); } catch { /* ignore */ }
  }
  return obj;
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: '' };

  const key = (event.queryStringParameters || {}).key || '';
  if (!PING_SECRET || key !== PING_SECRET) {
    return { statusCode: 403, body: '' };
  }

  if (!SUPABASE_SERVICE_KEY) {
    console.error('gumroad-ping: SUPABASE_SERVICE_ROLE_KEY manquante');
    return { statusCode: 500, body: '' };
  }

  try {
    const p = parseBody(event);

    const priceCents = parseInt(p.price, 10);
    const quantity = parseInt(p.quantity, 10);

    const raw = { ...p };
    for (const f of PII_FIELDS) delete raw[f];

    const row = {
      sale_id: p.sale_id || null,
      product_name: p.product_name || null,
      price_cents: Number.isFinite(priceCents) ? priceCents : null,
      currency: p.currency || null,
      quantity: Number.isFinite(quantity) && quantity > 0 ? quantity : 1,
      discount_code: p.discount_code || null,
      referrer: p.referrer || null,
      is_refund: p.refunded === 'true',
      is_test: p.test === 'true',
      raw,
    };

    // Upsert sur sale_id : si Gumroad renvoie le meme ping (ex : remboursement
    // d'une vente deja enregistree), on met a jour la ligne au lieu d'en creer une 2e.
    const res = await fetch(`${SUPABASE_URL}/rest/v1/sales?on_conflict=sale_id`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_SERVICE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates,return=minimal',
      },
      body: JSON.stringify(row),
    });

    if (!res.ok) {
      console.error('gumroad-ping insert failed:', res.status, await res.text());
      return { statusCode: 500, body: '' }; // Gumroad reessaiera
    }

    return { statusCode: 200, body: '' };
  } catch (e) {
    console.error('gumroad-ping failed:', e.message);
    return { statusCode: 500, body: '' };
  }
};
