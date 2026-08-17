// =============================================
// Race Engineer AI : Gestion sessions Supabase
// POST /save  → sauvegarde une session
// GET  /list  → liste les 10 dernières sessions
// Client anon + JWT user : RLS s'applique toujours,
// pas de service_role ici (principe du moindre privilège)
// =============================================

const { createClient } = require('@supabase/supabase-js');

// ⚠️ Cette fonction portait sa PROPRE copie du repli "process.env.X || valeur
// en dur". Or "||" ne se declenche que si la variable est ABSENTE : une
// variable presente mais fausse passait telle quelle et getUser() rejetait
// alors tous les jetons. La sauvegarde cloud repondait "Token invalide" en
// silence, exactement comme le chat repondait "Connecte-toi". Deux symptomes,
// une seule cause, mais deux copies du code : on n'avait corrige que l'un.
// La resolution coherente vit maintenant dans supabase-config.js.
const { SUPABASE_URL, SUPABASE_ANON_KEY } = require('./supabase-config');
// Journal d'audit : chercher [AUDIT] dans les logs de fonction Netlify.
const { audit } = require('./audit-log');

// ⚠️ NE JAMAIS ecrire "parseInt(x) || null". parseInt("0") vaut 0, et
// "0 || null" vaut null : toute valeur ZERO etait donc enregistree comme
// ABSENTE. C'est le defaut du formulaire pour le pincement, le carrossage et
// la chasse, et 0 degre est une temperature d'air reelle. Autrement dit la
// valeur la PLUS courante etait celle qu'on perdait, silencieusement, a chaque
// sauvegarde cloud. Un rechargement de session restituait alors des reglages
// faux. Ces deux aides preservent le zero et ne renvoient null que sur une
// entree vide ou non numerique.
function entierOuNull(v) {
  if (v === null || v === undefined || v === '') return null;
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : null;
}

function flottantOuNull(v) {
  if (v === null || v === undefined || v === '') return null;
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : null;
}

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
  const clientIp = event.headers['x-forwarded-for'] || '';
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) {
    audit('auth-echec', { ip: clientIp, cause: 'session-jeton-invalide' });
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'Token invalide' }) };
  }

  const path = event.path.replace('/.netlify/functions/session', '');

  // Accès aux données du pilote : une ligne par requête. C'est ce qui permet de
  // voir après coup qu'un compte a aspiré tout son historique, ou qu'un jeton
  // volé a servi depuis un autre réseau que d'habitude.
  audit('donnees-acces', { user: user.id, ip: clientIp, methode: event.httpMethod, route: path || '/' });

  // ── GET /list → 10 dernières sessions ──
  if (event.httpMethod === 'GET' && path === '/list') {
    const { data, error } = await supabase
      .from('sessions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10);

    // ⚠️ Le message d'erreur brut de Postgres partait au navigateur : il peut
    // reveler des noms de colonnes, de contraintes et de politiques. Il reste
    // dans les logs, ou il est utile, et le client recoit un texte neutre.
    if (error) {
      console.error('[SESSION] lecture impossible :', error.message, error.code || '');
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Historique momentanement indisponible.' }) };
    }
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
      temp_air: entierOuNull(context.tempAir),
      temp_piste: entierOuNull(context.tempPiste),
      session_type: context.session,
      comportement: context.comportement,
      intensite: entierOuNull(context.intensite),
      notes: typeof context.notes === 'string' ? context.notes.slice(0, 2000) : null,
      best_lap: typeof context.chronoBest === 'string' ? context.chronoBest.slice(0, 10) : null,
      avg_lap: typeof context.chronoAvg === 'string' ? context.chronoAvg.slice(0, 10) : null,
      laps: entierOuNull(context.chronoLaps),
      barre: context.barre,
      voie_av: entierOuNull(context.voieAv),
      pincement: entierOuNull(context.pincement),
      voie_ar: flottantOuNull(context.voieAr),
      arbre: context.arbre,
      arbre_longueur: context.arbreLongueur,
      carrossage: entierOuNull(context.carrossage),
      siege: context.siege,
      siege_hauteur: context.siegeHauteur,
      lestage: entierOuNull(context.lestage),
      pneu_marque: context.pneuMarque || null,
      pneu_modele: context.pneuModele || null,
      moyeux: context.moyeux,
      parechocs: context.parechocs,
      chasse: entierOuNull(context.chasse),
      garde_av: context.gardeAv,
      garde_ar: context.gardeAr,
      moteur: context.moteur,
      // collectData() ne produit jamais "couronne" : selon la famille moteur
      // c'est couronneMono, couronneDD2 ou couronneKz. L'ancienne ligne
      // enregistrait donc systematiquement null en base.
      couronne: entierOuNull(
        context.moteur_type === 'dd2' ? context.couronneDD2
        : context.moteur_type === 'kz' ? context.couronneKz
        : context.couronneMono
      ),
      pignon: entierOuNull(context.pignonMono),
      moteur_type: context.moteur_type || null,
      moteur_family: context.moteur_family || null,
      chassis: context.chassis || null,
      gicleur: entierOuNull(context.gicleur),
      pressures: context.pressures || null,
      diagnostic_html: typeof diagnostic_html === 'string' ? diagnostic_html.slice(0, MAX_DIAGNOSTIC_CHARS) : null,
      chat_history: sanitizeChatHistory(chat_history),
    }).select().single();

    if (error) {
      console.error('[SESSION] sauvegarde impossible :', error.message, error.code || '');
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Sauvegarde momentanement indisponible. Ta session reste dans ce navigateur.' }) };
    }
    return { statusCode: 200, headers, body: JSON.stringify({ session: data }) };
  }

  return { statusCode: 404, headers, body: JSON.stringify({ error: 'Route inconnue' }) };
};
