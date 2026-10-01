'use strict';
// Requêtes Netlify simulées et routes réseau simulées par défaut pour la fonction de rétractation.
// Reprise de tests/aides/fabriques.js du paquet « livraison-phase2 », sans les objets Stripe du webhook :
// ils dépendent de netlify/lib/catalogue.js (identifiants de prix, adresses des fichiers payants),
// qui n'entre pas dans ce dépôt public avant le lot 3.

const { VALEURS } = require('./environnement');

const STRIPE = 'https://api.stripe.com/v1';
const BREVO = 'https://api.brevo.com/v3/smtp/email';
const SUPABASE = VALEURS.SUPABASE_URL;

// Routes simulées d'un traitement complet qui réussit.
function routesParDefaut(sim) {
  sim
    .sur('POST', BREVO, { status: 201, json: { messageId: '<message@brevo.test>' } })
    .sur('POST', `${SUPABASE}/rest/v1/`, { status: 201, texte: '' })
    .sur('GET', `${SUPABASE}/rest/v1/`, { status: 200, json: [] });
  return sim;
}

// Remplace espaces insécables par des espaces simples (montants et dates).
const ESPACES_INSECABLES = new RegExp(`[${String.fromCharCode(0x00a0, 0x202f)}]`, 'g');
function normaliser(texte) {
  return String(texte).replace(ESPACES_INSECABLES, ' ');
}

// Emails envoyés à Brevo, dans l'ordre (corps JSON décodés). Les espaces insécables sont ramenées à des
// espaces simples pour comparer le contenu ; brut: true garde le corps exact (tests de typographie).
function emailsEnvoyes(sim, { brut = false } = {}) {
  return sim.appelsVers('POST', BREVO).map((appel) => {
    const email = JSON.parse(appel.corps);
    if (brut) return email;
    for (const champ of ['subject', 'htmlContent', 'textContent']) email[champ] = normaliser(email[champ]);
    return email;
  });
}

// Lignes insérées dans une table Supabase.
function insertions(sim, table) {
  return sim.appelsVers('POST', `${SUPABASE}/rest/v1/${table}`).map((appel) => JSON.parse(appel.corps));
}

// entetes : en-têtes ajoutés ou remplacés (null retire un en-tête par défaut).
function requetePost(donnees, ip = '203.0.113.20', { base64 = false, entetes = {} } = {}) {
  const corps = typeof donnees === 'string' ? donnees : JSON.stringify(donnees);
  const fusion = { 'x-nf-client-connection-ip': ip, 'content-type': 'application/json', ...entetes };
  const headers = Object.fromEntries(Object.entries(fusion).filter(([, valeur]) => valeur !== null));
  return {
    httpMethod: 'POST',
    headers,
    queryStringParameters: {},
    body: base64 ? Buffer.from(corps, 'utf8').toString('base64') : corps,
    isBase64Encoded: base64,
  };
}

module.exports = {
  STRIPE,
  BREVO,
  SUPABASE,
  routesParDefaut,
  emailsEnvoyes,
  insertions,
  normaliser,
  requetePost,
};
