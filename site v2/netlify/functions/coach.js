// =============================================
// Clem Kart Racing : Coach business dans le dashboard
// POST { password, persona, periode, metriques } -> analyse structuree en JSON.
//
// Le coach ne voit QUE des agregats (visiteurs, inscriptions, ventes, taux).
// Aucune donnee personnelle ne sort d'ici : la table site_events n'en contient
// pas, et les ventes sont deja depouillees de leur email par gumroad-ping.js.
//
// Style maison : appel REST direct, sans SDK ni dependance npm, comme les autres
// fonctions du site.
//
// V4 : le contexte donne au modele est ecrit depuis config/offres.json (prix, pages,
// garantie, lecteurs, adresses des pages). Aucune valeur en dur ici.
// =============================================

const crypto = require('crypto');
const OFFRES = require('../../../config/offres.json');
const { ipClient, creerLimiteur } = require('../lib/http.js');

const DASHBOARD_PASSWORD = process.env.DASHBOARD_PASSWORD || '';
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY || '';
const MODELE = process.env.COACH_MODEL || 'claude-sonnet-5';

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

// ---------------------------------------------------------------------------
// Les archetypes.
//
// Ce sont des ECOLES DE PENSEE, pas des personnes reelles. Imiter un coach
// identifiable poserait un vrai probleme : usurpation, caution implicite, droit
// a l'image. Et pour le produit c'est meilleur : un archetype se decrit par ce
// qu'il regarde en premier, ce qu'il ignore, et ce qu'il conseille quand ca
// stagne. C'est ca qui rend deux analyses des memes chiffres differentes.
// ---------------------------------------------------------------------------
const PERSONAS = {
  operateur: {
    nom: "L'Opérateur",
    tagline: 'Volume, offre, cash. Sans détour.',
    prompt: `Tu es un opérateur. Tu penses en volume et en marge, jamais en image de marque.
Ce que tu regardes en premier : le nombre de ventes, le panier moyen, le coût d'acquisition implicite,
et le débit du haut de funnel. Ce que tu ignores : l'esthétique, la notoriété, tout ce qui ne se
compte pas ce mois-ci.
Ta thèse : la plupart des problèmes de croissance sont des problèmes d'offre ou de volume, pas de
tactique. Si peu de gens achètent, soit l'offre est faible, soit trop peu de gens la voient.
Ton ton : direct, chiffré, un peu brutal, jamais méchant. Tu dis les choses en une phrase.
Tu détestes les demi-mesures et les tests qui n'ont pas assez de volume pour conclure.`,
  },
  stratege: {
    nom: 'Le Stratège',
    tagline: 'Positionnement, marque, avantage durable.',
    prompt: `Tu es un stratège. Tu penses en années, en positionnement et en avantage défendable.
Ce que tu regardes en premier : d'où vient l'audience, ce qui la retient, ce qui serait difficile à
copier. Ce que tu ignores : les pics ponctuels et les optimisations à 2 %.
Ta thèse : un business fragile est un business dont l'acquisition dépend d'un seul canal et dont le
produit est substituable. Ton travail est de repérer la dépendance avant qu'elle ne coûte cher.
Ton ton : posé, analytique, tu remets les chiffres du mois dans une trajectoire.
Tu poses souvent la question que personne ne pose.`,
  },
  ingenieur: {
    nom: 'L\'Ingénieur de croissance',
    tagline: 'Hypothèses, tests, itérations mesurables.',
    prompt: `Tu es un ingénieur de croissance. Tu penses en hypothèses testables et en taux de conversion
étape par étape.
Ce que tu regardes en premier : où l'entonnoir fuit le plus, en points de pourcentage et en volume
absolu perdu. Ce que tu ignores : les intuitions non mesurables.
Ta thèse : on n'optimise que l'étape qui perd le plus de monde en valeur absolue, jamais celle qui a
le pire pourcentage sur trois personnes.
Ton ton : méthodique. Tu formules chaque recommandation comme une hypothèse avec un résultat attendu
et de quoi conclure. Tu signales quand un chiffre n'a pas assez de volume pour décider : c'est ton
réflexe le plus utile.`,
  },
  operationnel: {
    nom: 'Le Contremaître',
    tagline: 'Discipline, cadence, une seule priorité.',
    prompt: `Tu es un contremaître d'exécution. Tu penses en semaines et en habitudes.
Ce que tu regardes en premier : la régularité. Un chiffre irrégulier trahit une exécution
irrégulière. Ce que tu ignores : la stratégie tant que l'exécution de base n'est pas tenue.
Ta thèse : la plupart des solopreneurs n'ont pas un problème d'idée, ils ont un problème de cadence.
Faire une chose toutes les semaines bat faire cinq choses un mois sur trois.
Ton ton : bienveillant mais ferme. Tu ne donnes jamais plus d'UNE priorité à la fois, et tu dis
explicitement ce qu'il faut arrêter pour la tenir.`,
  },
};

// Le contexte est construit depuis config/offres.json : aucun prix, aucun chiffre de
// lecteurs, aucune adresse de page en dur ici. Quand la config change, le coach suit.
const O = OFFRES;
const journeeOuverte = O.journee.statut === 'ouverte';
// Même règle que scripts/build.js : la version 3 de l'extrait change la promesse.
const promesseExtrait = Number(O.extrait.version) >= 3 ? O.extrait.promesse_v3 : O.extrait.promesse;
const CONTEXTE = `CONTEXTE DU BUSINESS
${O.marque.nom}, solopreneur français, statut : ${O.legal.statut}. Crée du contenu karting sur Instagram,
TikTok, Facebook et YouTube. Une page de liens maison (${O.routes.liens}) sert de bio sur Instagram,
TikTok et Facebook (un utm_source par plateforme). 5 boutons, dans cet ordre : le guide (seul bouton
plein), l'analyse d'onboard, la journée sur piste, marques et partenaires (${O.routes.marques}), le site
(${O.routes.accueil}). Sous les boutons, un lien texte vers l'extrait gratuit (${O.routes.extrait}).
Chaque clic sur un bouton envoie l'événement bio_click (meta.bouton, meta.position, meta.plateforme,
meta.cible). Tout ce qui sort (bios, DM, emails, PDF, tableur) pointe vers le site. Seul le site
pointe vers Stripe.

PRODUITS (tout se paie sur Stripe, plus rien ne se vend sur Gumroad)
1. Le guide « ${O.guide.titre} » : ${O.guide.format}, ${O.guide.pages} pages, ${O.guide.chapitres} chapitres,
   ${O.guide.prix_affiche}, garantie ${O.garantie_jours} jours en plus des droits légaux. Vendu sur la page
   ${O.routes.guide} du site ; le bouton d'achat passe par une porte interne (${O.guide.aller}) qui redirige
   vers Stripe, d'où l'événement stripe_click AVANT le paiement. Avant la V4 il se vendait sur Gumroad :
   ${O.lecteurs.nombre} ventes au ${O.lecteurs.date} (source : ${O.lecteurs.source}), ${O.lecteurs.phrase.toLowerCase()}.
   Les événements gumroad_click sont l'ancien tunnel, à lire comme de l'historique.
2. L'analyse d'onboard (débrief personnalisé) : ${O.debrief.prix_affiche}, ${O.debrief.resume_ligne.toLowerCase()}.
   Vendue sur ${O.routes.onboard} après un diagnostic en 7 questions, avec le guide en option à
   ${O.debrief.option_guide.prix_affiche} au paiement. Deux sorties honnêtes refusent la vente (kart de location,
   pas d'images) et renvoient vers ${O.routes.guide}. Les métriques "debrief" décrivent ce tunnel.
3. Prix équitables : ${O.equitable.principe.toLowerCase()} (${O.equitable.total_affiche}). Un lecteur du guide paie
   l'analyse ${O.equitable.debrief_lecteur.prix_affiche} ; un client de l'analyse paie le guide
   ${O.equitable.guide_lecteur.prix_affiche}. Proposé sur les pages « merci » après paiement.
4. La journée sur piste (${O.routes.journee}) : ${journeeOuverte
    ? `ouverte, ${O.journee.unite}, sur devis.`
    : 'liste d\'attente seulement. Aucun prix affiché, aucun paiement, aucun devis tant que le cadre légal n\'est pas réglé (Code du sport, L212-1). Ne recommande jamais de la vendre ni d\'en afficher le prix. Les inscriptions sur la liste d\'attente mesurent l\'intérêt, pas des ventes.'}
   Ne décris jamais Clément comme coach, moniteur ou entraîneur, et ne propose jamais le mot « coaching ».
5. Marques et partenaires (${O.routes.marques}) : formulaire de demande, jamais de paiement en ligne.

AIMANT GRATUIT ET EMAILS
${promesseExtrait}, livrés par email contre une adresse sur la page
${O.routes.extrait}. L'appel à l'action Instagram est « commente EXTRAIT », automatisé par ManyChat, qui
renvoie vers cette page. L'email de livraison se termine par un P.S. vers ${O.routes.guide}
(utm_campaign=j0-extrait ou j0-tableur) ; une relance unique à J+7 renvoie vers ${O.routes.guide} (utm_campaign=j7). Aucun
email ne pointe vers Stripe en direct.
Le délai de réponse annoncé par email est de ${O.delais.reponse_email_h} h.

CE QUI N'EXISTE PAS
Aucune app, aucun abonnement, aucun autre produit. Ne parle que des lignes ci-dessus.
Les frais Stripe sont prélevés par transaction ; la marge nette n'est pas dans les métriques, ne l'estime pas.`;

const CONSIGNES = `RÈGLES ABSOLUES
1. Ne parle QUE des chiffres qui te sont donnés. N'invente aucune donnée, aucun benchmark chiffré.
2. Si un chiffre est trop faible pour conclure (moins de ~30 événements sur l'étape), dis-le
   explicitement plutôt que de bâtir un raisonnement dessus. C'est la faute la plus grave.
3. Distingue toujours ce que les données montrent de ce que tu supposes.
4. Une recommandation doit être exécutable cette semaine, seul, sans budget.
5. Écris en français, tutoiement, phrases courtes. Pas d'emoji. Pas de jargon anglais inutile.
6. Zéro flatterie. Zéro "excellent travail". On vient chercher un avis, pas un compliment.

FORMAT DE RÉPONSE
Réponds UNIQUEMENT avec un objet JSON valide, sans texte autour, sans bloc de code markdown :
{
  "verdict": "une phrase, le jugement d'ensemble",
  "lecture": [
    { "kpi": "nom du KPI", "valeur": "la valeur telle qu'affichée", "sens": "ce que ça veut dire concrètement, 1-2 phrases" }
  ],
  "alertes": [
    { "niveau": "critique|attention|info", "texte": "le problème et sa conséquence" }
  ],
  "actions": [
    { "titre": "action courte à l'impératif", "pourquoi": "le raisonnement chiffré", "effort": "faible|moyen|élevé" }
  ],
  "objectif": { "cible": "objectif chiffré à 30 jours", "mesure": "le KPI exact qui le mesure" }
}
Maximum 3 éléments dans "lecture", 3 dans "alertes", 3 dans "actions".`;

// Le modele renvoie parfois le JSON dans un bloc de code malgre la consigne.
function extraireJSON(txt) {
  const nettoye = String(txt || '').replace(/^\s*```(?:json)?/i, '').replace(/```\s*$/, '').trim();
  try { return JSON.parse(nettoye); } catch { /* on tente plus bas */ }
  const debut = nettoye.indexOf('{');
  const fin = nettoye.lastIndexOf('}');
  if (debut !== -1 && fin > debut) {
    try { return JSON.parse(nettoye.slice(debut, fin + 1)); } catch { /* perdu */ }
  }
  return null;
}

// Filet de securite : on ne rend jamais au navigateur une structure a moitie
// remplie, il afficherait "undefined" partout.
function normaliser(o) {
  const arr = (v) => (Array.isArray(v) ? v : []);
  return {
    verdict: typeof o.verdict === 'string' ? o.verdict : '',
    lecture: arr(o.lecture).slice(0, 3).map((x) => ({
      kpi: String(x.kpi || ''), valeur: String(x.valeur ?? ''), sens: String(x.sens || ''),
    })),
    alertes: arr(o.alertes).slice(0, 3).map((x) => ({
      niveau: ['critique', 'attention', 'info'].includes(x.niveau) ? x.niveau : 'info',
      texte: String(x.texte || ''),
    })),
    actions: arr(o.actions).slice(0, 3).map((x) => ({
      titre: String(x.titre || ''), pourquoi: String(x.pourquoi || ''),
      effort: ['faible', 'moyen', 'élevé'].includes(x.effort) ? x.effort : 'moyen',
    })),
    objectif: o.objectif && typeof o.objectif === 'object'
      ? { cible: String(o.objectif.cible || ''), mesure: String(o.objectif.mesure || '') }
      : { cible: '', mesure: '' },
  };
}

// Mot de passe : meme verification que dashboard-data.js (empreintes sha256 de meme longueur,
// comparaison a duree constante). Au plus COACH_ESSAIS_MAX appels par heure et par IP
// (memoire de l instance chaude), essais rates comme reussis.
const COACH_ESSAIS_MAX = 10;
const COACH_FENETRE_MS = 60 * 60 * 1000;
const limiteur = creerLimiteur({ max: COACH_ESSAIS_MAX, fenetreMs: COACH_FENETRE_MS });

function empreinte(t) {
  return crypto.createHash('sha256').update(String(t)).digest();
}
function motDePasseValide(recu) {
  if (typeof recu !== 'string' || !recu) return false;
  return crypto.timingSafeEqual(empreinte(recu), empreinte(DASHBOARD_PASSWORD));
}

exports.handler = async (event) => {
  const headers = buildHeaders(event);
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  if (!DASHBOARD_PASSWORD) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Dashboard non configure.' }) };
  }

  // Limite par IP AVANT le mot de passe : sans elle, on pouvait deviner le mot de passe du
  // dashboard ici a volonte (dashboard-data.js, lui, le protege), et chaque appel reussi coute.
  const limite = limiteur.autoriser(ipClient(event));
  if (!limite.autorise) {
    return {
      statusCode: 429,
      headers: { ...headers, 'Retry-After': String(limite.reessayerDansSec) },
      body: JSON.stringify({ error: 'Trop d essais. Reessaie plus tard.' }),
    };
  }

  let body;
  try { body = JSON.parse(event.body || '{}'); } catch { body = {}; }
  if (!motDePasseValide(body.password)) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'Mot de passe invalide.' }) };
  }

  if (!ANTHROPIC_KEY) {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        indisponible: true,
        raison: "La variable ANTHROPIC_API_KEY n'est pas definie sur ce site Netlify. "
              + 'Le coach reste muet tant qu\'elle manque, le reste du dashboard fonctionne.',
      }),
    };
  }

  const persona = PERSONAS[body.persona] || PERSONAS.ingenieur;
  const metriques = body.metriques && typeof body.metriques === 'object' ? body.metriques : {};
  const periode = String(body.periode || '30 derniers jours').slice(0, 60);

  const question = String(body.question || '').slice(0, 500);

  const userContent =
    `${CONTEXTE}\n\n` +
    `PÉRIODE ANALYSÉE : ${periode}\n\n` +
    `CHIFFRES (JSON, ce sont les seules données réelles dont tu disposes) :\n` +
    JSON.stringify(metriques, null, 1).slice(0, 12000) +
    (question ? `\n\nQUESTION PRÉCISE DE CLÉMENT : ${question}` : '') +
    `\n\n${CONSIGNES}`;

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: MODELE,
        max_tokens: 2000,
        system: `${persona.prompt}\n\nTu analyses le tableau de bord d'un solopreneur. Tu es lu par lui seul.`,
        messages: [{ role: 'user', content: userContent }],
      }),
    });

    if (!res.ok) {
      const detail = await res.text();
      console.error('coach: Anthropic a repondu', res.status, detail.slice(0, 300));
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ indisponible: true, raison: `L'API Claude a répondu ${res.status}.` }),
      };
    }

    const data = await res.json();
    const texte = (data.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('');
    const parsed = extraireJSON(texte);

    if (!parsed) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ indisponible: true, raison: 'Réponse du modèle illisible.' }),
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        persona: { cle: body.persona in PERSONAS ? body.persona : 'ingenieur', nom: persona.nom, tagline: persona.tagline },
        modele: MODELE,
        ...normaliser(parsed),
      }),
    };
  } catch (e) {
    console.error('coach failed:', e.message);
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ indisponible: true, raison: 'Le coach est injoignable pour le moment.' }),
    };
  }
};

// Expose la liste des archetypes pour que le front n'ait pas a les redefinir.
exports.PERSONAS = PERSONAS;

// Pour les tests : remettre la limite a zero entre deux scenarios.
exports._limiteur = limiteur;
