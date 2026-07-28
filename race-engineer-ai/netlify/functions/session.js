// =============================================
// Race Engineer AI : Gestion sessions Supabase
// POST /save  → sauvegarde une session
// GET  /list  → liste les 10 dernières sessions
// Client anon + JWT user : RLS s'applique toujours,
// pas de service_role ici (principe du moindre privilège)
// =============================================

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://hkpknrrymgbnjmbewlyc.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || '';

// Limites de taille (anti-abus stockage)
const MAX_BODY_CHARS = 200000;
const MAX_DIAGNOSTIC_CHARS = 60000;
const MAX_CHAT_HISTORY_ITEMS = 12;
const MAX_CHAT_HISTORY_ITEM_CHARS = 4000;

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
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json',
    Vary: 'Origin',
  };
}

// Tronque l'historique chat à un format sûr [{role, content}, ...]
function sanitizeChatHistory(history) {
  if (!Array.isArray(history)) return [];
  return history.slice(0, MAX_CHAT_HISTORY_ITEMS).map((h) => ({
    role: h && h.role === 'assistant' ? 'assistant' : 'user',
    content: String((h && h.content) || '').slice(0, MAX_CHAT_HISTORY_ITEM_CHARS),
  }));
}

exports.handler = async (event) => {
  const headers = buildHeaders(event);
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };

  if (!SUPABASE_ANON_KEY) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'SUPABASE_ANON_KEY non configurée côté serveur' }) };
  }

  // Récupérer le token utilisateur depuis le header Authorization
  const authHeader = event.headers['authorization'] || '';
  const token = authHeader.replace('Bearer ', '').trim();

  if (!token) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'Non authentifié' }) };
  }

  // Client anon + token user en header : PostgREST applique RLS avec le rôle du JWT
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  // Vérifier l'utilisateur
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'Token invalide' }) };
  }

  const path = event.path.replace('/.netlify/functions/session', '');

  // ── GET /list → 10 dernières sessions ──
  if (event.httpMethod === 'GET' && path === '/list') {
    const { data, error } = await supabase
      .from('sessions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) };
    return { statusCode: 200, headers, body: JSON.stringify({ sessions: data }) };
  }

  // ── POST /save → sauvegarder une session ──
  if (event.httpMethod === 'POST' && path === '/save') {
    if ((event.body || '').length > MAX_BODY_CHARS) {
      return { statusCode: 413, headers, body: JSON.stringify({ error: 'Payload trop volumineux' }) };
    }
    let body;
    try {
      body = JSON.parse(event.body || '{}');
    } catch (e) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'JSON invalide' }) };
    }
    const { context, diagnostic_html, chat_history } = body;

    if (!context || typeof context !== 'object') {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Contexte manquant' }) };
    }

    const { data, error } = await supabase.from('sessions').insert({
      user_id: user.id,
      circuit: context.circuit,
      meteo: context.meteo,
      grip: context.grip,
      temp_air: parseInt(context.tempAir) || null,
      temp_piste: parseInt(context.tempPiste) || null,
      session_type: context.session,
      comportement: context.comportement,
      intensite: parseInt(context.intensite) || null,
      notes: typeof context.notes === 'string' ? context.notes.slice(0, 2000) : null,
      best_lap: typeof context.chronoBest === 'string' ? context.chronoBest.slice(0, 10) : null,
      avg_lap: typeof context.chronoAvg === 'string' ? context.chronoAvg.slice(0, 10) : null,
      laps: parseInt(context.chronoLaps) || null,
      barre: context.barre,
      voie_av: parseInt(context.voieAv) || null,
      pincement: parseInt(context.pincement) || null,
      voie_ar: parseFloat(context.voieAr) || null,
      arbre: context.arbre,
      arbre_longueur: context.arbreLongueur,
      moyeux: context.moyeux,
      parechocs: context.parechocs,
      chasse: parseInt(context.chasse) || null,
      garde_av: context.gardeAv,
      garde_ar: context.gardeAr,
      moteur: context.moteur,
      // collectData() ne produit jamais "couronne" : selon la famille moteur
      // c'est couronneMono, couronneDD2 ou couronneKz. L'ancienne ligne
      // enregistrait donc systematiquement null en base.
      couronne: parseInt(
        context.moteur_type === 'dd2' ? context.couronneDD2
        : context.moteur_type === 'kz' ? context.couronneKz
        : context.couronneMono
      ) || null,
      pignon: parseInt(context.pignonMono) || null,
      moteur_type: context.moteur_type || null,
      moteur_family: context.moteur_family || null,
      chassis: context.chassis || null,
      gicleur: parseInt(context.gicleur) || null,
      pressures: context.pressures || null,
      diagnostic_html: typeof diagnostic_html === 'string' ? diagnostic_html.slice(0, MAX_DIAGNOSTIC_CHARS) : null,
      chat_history: sanitizeChatHistory(chat_history),
    }).select().single();

    if (error) return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) };
    return { statusCode: 200, headers, body: JSON.stringify({ session: data }) };
  }

  return { statusCode: 404, headers, body: JSON.stringify({ error: 'Route inconnue' }) };
};
