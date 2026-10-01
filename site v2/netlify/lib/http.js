'use strict';
// Outils HTTP communs aux fonctions Netlify : lecture de la requête, réponses,
// limitation de débit en mémoire et appels sortants (fetch natif avec délai maximal).

const ENTETES_COMMUNS = Object.freeze({
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
  'X-Robots-Tag': 'noindex, nofollow',
  'Referrer-Policy': 'no-referrer',
});

// En-tête de la requête, sans tenir compte de la casse (Netlify les met en minuscules, par sécurité on vérifie).
function entete(event, nom) {
  const entetes = (event && event.headers) || {};
  const cible = String(nom).toLowerCase();
  for (const cle of Object.keys(entetes)) {
    if (cle.toLowerCase() === cible) return entetes[cle];
  }
  return undefined;
}

// Corps exact de la requête : Buffer si Netlify l'a encodé en base64, sinon la chaîne reçue telle quelle.
// Indispensable pour la signature Stripe, calculée sur les octets bruts.
function corpsBrut(event) {
  if (!event || event.body == null) return '';
  if (event.isBase64Encoded) return Buffer.from(String(event.body), 'base64');
  return String(event.body);
}

// Corps de la requête en texte UTF-8.
function corpsTexte(event) {
  const brut = corpsBrut(event);
  return Buffer.isBuffer(brut) ? brut.toString('utf8') : brut;
}

// Adresse IP du visiteur (en-tête posé par Netlify en priorité).
function ipClient(event) {
  const directe = entete(event, 'x-nf-client-connection-ip') || entete(event, 'client-ip');
  if (directe) return String(directe).trim();
  const relais = entete(event, 'x-forwarded-for');
  if (relais) return String(relais).split(',')[0].trim();
  return 'inconnue';
}

function reponseJson(statusCode, donnees, entetes = {}) {
  return {
    statusCode,
    headers: { ...ENTETES_COMMUNS, 'Content-Type': 'application/json; charset=utf-8', ...entetes },
    body: JSON.stringify(donnees),
  };
}

function reponseHtml(statusCode, html, entetes = {}) {
  return {
    statusCode,
    headers: { ...ENTETES_COMMUNS, 'Content-Type': 'text/html; charset=utf-8', ...entetes },
    body: html,
  };
}

// Limitation de débit en mémoire, fenêtre glissante, par clé (en général l'IP).
// Portée : une instance de fonction. C'est un garde-fou contre les abus simples, pas une garantie absolue.
function creerLimiteur({ max, fenetreMs }) {
  const registre = new Map();
  let prochainNettoyage = 0;

  function nettoyer(maintenant) {
    if (maintenant < prochainNettoyage && registre.size < 5000) return;
    prochainNettoyage = maintenant + fenetreMs;
    for (const [cle, horodatages] of registre) {
      const dernier = horodatages[horodatages.length - 1];
      if (dernier === undefined || dernier <= maintenant - fenetreMs) registre.delete(cle);
    }
  }

  return {
    autoriser(cle, maintenant = Date.now()) {
      nettoyer(maintenant);
      const debut = maintenant - fenetreMs;
      const recents = (registre.get(cle) || []).filter((t) => t > debut);
      if (recents.length >= max) {
        registre.set(cle, recents);
        const attenteMs = recents[0] + fenetreMs - maintenant;
        return { autorise: false, reessayerDansSec: Math.max(1, Math.ceil(attenteMs / 1000)) };
      }
      recents.push(maintenant);
      registre.set(cle, recents);
      return { autorise: true, restant: max - recents.length };
    },
    vider() {
      registre.clear();
    },
  };
}

// Appel HTTP sortant : délai maximal, lecture JSON, erreur explicite (statut HTTP dans err.statut).
// Les messages d'erreur ne contiennent jamais de clé : seulement le service, le statut et le message renvoyé.
async function requete(service, url, { method = 'GET', headers = {}, body, timeoutMs = 8000 } = {}) {
  let reponse;
  try {
    reponse = await fetch(url, { method, headers, body, signal: AbortSignal.timeout(timeoutMs) });
  } catch (err) {
    const raison = err && err.name === 'TimeoutError' ? 'délai dépassé' : (err && err.message) || 'erreur inconnue';
    const erreur = new Error(`${service} : échec réseau (${raison})`);
    erreur.statut = 0;
    throw erreur;
  }
  const texte = await reponse.text();
  let donnees = null;
  if (texte) {
    try {
      donnees = JSON.parse(texte);
    } catch {
      donnees = null;
    }
  }
  if (!reponse.ok) {
    const detail = messageErreur(donnees) || texte.slice(0, 200);
    const erreur = new Error(`${service} : HTTP ${reponse.status}${detail ? ` ${detail}` : ''}`);
    erreur.statut = reponse.status;
    erreur.code = (donnees && ((donnees.error && donnees.error.code) || donnees.code)) || undefined;
    throw erreur;
  }
  return donnees;
}

// Message d'erreur lisible selon le format du service (Stripe, Brevo, PostgREST, Storage).
function messageErreur(donnees) {
  if (!donnees || typeof donnees !== 'object') return '';
  const candidat =
    (donnees.error && typeof donnees.error === 'object' && donnees.error.message) ||
    donnees.message ||
    donnees.msg ||
    (typeof donnees.error === 'string' ? donnees.error : '');
  return typeof candidat === 'string' ? candidat.slice(0, 200) : '';
}

module.exports = {
  ENTETES_COMMUNS,
  entete,
  corpsBrut,
  corpsTexte,
  ipClient,
  reponseJson,
  reponseHtml,
  creerLimiteur,
  requete,
};
