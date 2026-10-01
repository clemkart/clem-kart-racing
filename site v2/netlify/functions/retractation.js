'use strict';
// Fonction de rétractation en ligne : POST JSON { nom, email, reference, produit, message, site_web }.
// Envoie au client un accusé de réception sur support durable (email : contenu de la demande, date et heure
// de réception à Paris, traitement sous 14 jours), une copie interne, et garde une trace sans donnée personnelle.
// « site_web » est un pot de miel : rempli, on répond 200 sans rien faire. Limite : 5 demandes par heure et par IP.
// Anti relais de spam : JSON obligatoire (un autre site ne peut donc pas faire poster le navigateur de ses visiteurs
// sans pré-vérification CORS, qui échoue), origine du site exigée, et au plus 2 demandes par email et par 24 h,
// comptées en base sur l'empreinte SHA-256 de l'email (jamais l'email lui-même).

const { envoyerEmail } = require('../lib/brevo');
const emails = require('../lib/emails');
const supabase = require('../lib/supabase');
const { formaterDate, formaterDateHeure } = require('../lib/dates');
const { prenomDepuisNom, estEmailValide } = require('../lib/format');
const crypto = require('crypto');
const { reponseJson, corpsTexte, ipClient, creerLimiteur, entete } = require('../lib/http');
const { avecDefaut, lire } = require('../lib/config');

const PRODUITS_RETRACTATION = Object.freeze({
  debrief: 'Le débrief onboard',
  guide: 'Le guide',
  les_deux: 'Les deux (débrief et guide)',
});
const LONGUEURS_MAX = Object.freeze({ nom: 100, email: 254, reference: 200, message: 2000 });
const TAILLE_MAX_CORPS = 16 * 1024;
const DELAI_TRAITEMENT_JOURS = 14;
const MAX_DEMANDES_PAR_EMAIL = 2;
const FENETRE_EMAIL_MS = 24 * 60 * 60 * 1000;
const DELAI_LECTURE_BASE_MS = 3000;
// Adresses du site acceptées comme origine : l'adresse publique et celles des déploiements Netlify.
const VARIABLES_ORIGINE = Object.freeze(['SITE_URL', 'URL', 'DEPLOY_URL', 'DEPLOY_PRIME_URL']);
const PROTOCOLE = new RegExp('^https?://', 'i');

const limiteurIp = creerLimiteur({ max: 5, fenetreMs: 60 * 60 * 1000 });
// Garde-fou global par instance : l'accusé part à l'adresse saisie, on borne le volume d'emails possible.
const limiteurGlobal = creerLimiteur({ max: 30, fenetreMs: 60 * 60 * 1000 });

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return reponseJson(405, { ok: false, erreur: 'methode_non_autorisee' }, { Allow: 'POST' });
  if (!estJson(event)) return reponseJson(415, { ok: false, erreur: 'json_attendu' });
  if (!origineAutorisee(event)) return reponseJson(403, { ok: false, erreur: 'origine_refusee' });

  const limite = limiteurIp.autoriser(ipClient(event));
  if (!limite.autorise) {
    return reponseJson(429, { ok: false, erreur: 'trop_de_requetes' }, { 'Retry-After': String(limite.reessayerDansSec) });
  }

  const texte = corpsTexte(event);
  if (texte.length > TAILLE_MAX_CORPS) return reponseJson(413, { ok: false, erreur: 'trop_volumineux' });
  let donnees;
  try {
    donnees = JSON.parse(texte || 'null');
  } catch {
    return reponseJson(400, { ok: false, erreur: 'json_invalide' });
  }
  if (!donnees || typeof donnees !== 'object' || Array.isArray(donnees)) {
    return reponseJson(400, { ok: false, erreur: 'json_invalide' });
  }

  const maintenant = new Date(Date.now());
  const recuLe = formaterDateHeure(maintenant, { annee: true });

  // Pot de miel rempli : réponse identique à un succès, sans envoi ni enregistrement.
  const potDeMiel = typeof donnees.site_web === 'string' ? donnees.site_web.trim() : donnees.site_web;
  if (potDeMiel) return reponseJson(200, { ok: true, recu_le: recuLe });

  const { valeurs, erreurs } = valider(donnees);
  if (erreurs) return reponseJson(400, { ok: false, erreur: 'validation', champs: erreurs });

  const global = limiteurGlobal.autoriser('global');
  if (!global.autorise) {
    console.warn('[retractation] plafond global atteint sur cette instance');
    return reponseJson(429, { ok: false, erreur: 'trop_de_requetes' }, { 'Retry-After': String(global.reessayerDansSec) });
  }

  // Limite durable par email (toutes instances confondues). Base injoignable ou table absente : on ne bloque pas.
  const empreinte = empreinteEmail(valeurs.email);
  if (await limiteEmailAtteinte(empreinte, maintenant)) {
    return reponseJson(429, { ok: false, erreur: 'demande_deja_recue' }, { 'Retry-After': String(FENETRE_EMAIL_MS / 1000) });
  }

  const contenu = {
    ...valeurs,
    prenom: prenomDepuisNom(valeurs.nom),
    produitLibelle: PRODUITS_RETRACTATION[valeurs.produit],
    recuLe,
  };

  // 1. Accusé de réception au client : sans lui, la demande n'est pas confirmée (le client doit réessayer).
  // Copie cachée interne dans le même appel : aucun accusé ne part sans que Clément en ait une copie.
  try {
    await envoyerEmail({
      destinataire: { email: valeurs.email, nom: valeurs.nom },
      copieCachee: avecDefaut('EMAIL_INTERNE'),
      ...emails.emailAccuseRetractation(contenu),
    });
  } catch (err) {
    console.error(`[retractation] accusé de réception non envoyé : ${err.message}`);
    return reponseJson(502, { ok: false, erreur: 'envoi_impossible' });
  }

  // 2. Copie interne avec la date limite de traitement (non bloquante : le client a déjà son accusé, Clément sa copie cachée).
  try {
    const limiteTraitement = formaterDate(new Date(maintenant.getTime() + DELAI_TRAITEMENT_JOURS * 24 * 60 * 60 * 1000), { annee: true });
    await envoyerEmail({
      destinataire: { email: avecDefaut('EMAIL_INTERNE') },
      ...emails.emailCopieRetractation({ ...contenu, limiteTraitement }),
    });
  } catch (err) {
    console.error(`[retractation] copie interne non envoyée : ${err.message}`);
  }

  // 3. Trace en base, sans nom ni email en clair (l'empreinte sert seulement à la limite par email).
  try {
    await supabase.inserer('retractations', {
      reference: referenceSansDonneePersonnelle(valeurs.reference),
      produit: valeurs.produit,
      recu_le: maintenant.toISOString(),
      email_empreinte: empreinte,
    });
  } catch (err) {
    console.error(`[retractation] trace en base impossible : ${err.message}`);
  }

  return reponseJson(200, { ok: true, recu_le: recuLe });
};

// Texte nettoyé : caractères de contrôle retirés, espaces en trop coupés. multiligne : garde les retours à la ligne.
function nettoyer(valeur, multiligne = false) {
  if (typeof valeur !== 'string') return '';
  const unifie = valeur.replace(/\r\n?/g, '\n');
  const sansControle = multiligne
    ? unifie.replace(/[\u0000-\u0009\u000B-\u001F\u007F]/g, '')
    : unifie.replace(/[\u0000-\u001F\u007F]+/g, ' ');
  return sansControle.trim();
}

function valider(donnees) {
  const erreurs = {};
  const nom = nettoyer(donnees.nom);
  const email = nettoyer(donnees.email);
  const reference = nettoyer(donnees.reference);
  const message = nettoyer(donnees.message, true);
  const produit = typeof donnees.produit === 'string' ? donnees.produit.trim() : '';

  if (!nom) erreurs.nom = 'Indique ton nom.';
  else if (nom.length > LONGUEURS_MAX.nom) erreurs.nom = `${LONGUEURS_MAX.nom} caractères maximum.`;
  if (!email) erreurs.email = 'Indique ton email.';
  else if (email.length > LONGUEURS_MAX.email || !estEmailValide(email)) erreurs.email = "Cet email n'est pas valide.";
  if (!reference) erreurs.reference = 'Indique ta référence de commande : numéro de facture ou email utilisé au paiement.';
  else if (reference.length > LONGUEURS_MAX.reference) erreurs.reference = `${LONGUEURS_MAX.reference} caractères maximum.`;
  if (!Object.prototype.hasOwnProperty.call(PRODUITS_RETRACTATION, produit)) erreurs.produit = 'Choisis le produit concerné.';
  if (message.length > LONGUEURS_MAX.message) erreurs.message = `${LONGUEURS_MAX.message} caractères maximum.`;

  if (Object.keys(erreurs).length) return { erreurs };
  return { valeurs: { nom, email, reference, produit, message } };
}

// La référence peut être l'email du paiement : dans ce cas elle n'est jamais stockée telle quelle.
function referenceSansDonneePersonnelle(reference) {
  if (reference.includes('@')) return "(email : voir l'accusé de réception)";
  return reference.slice(0, 100);
}

// Corps annoncé en JSON : un formulaire ou un envoi « text/plain » d'un autre site est refusé.
function estJson(event) {
  const type = String(entete(event, 'content-type') || '').trim().toLowerCase();
  return type.startsWith('application/json');
}

// Hôtes du site (adresse publique et déploiements Netlify), sans protocole ni barre finale.
function hotesDuSite() {
  const hotes = new Set();
  for (const nom of VARIABLES_ORIGINE) {
    const valeur = lire(nom);
    if (!valeur) continue;
    try {
      hotes.add(new URL(PROTOCOLE.test(valeur) ? valeur : `https://${valeur}`).host.toLowerCase());
    } catch {
      // Valeur illisible : ignorée.
    }
  }
  return hotes;
}

// Requête venue d'un autre site : refusée. Sans en-tête Origin (outil, serveur), seul Sec-Fetch-Site compte.
function origineAutorisee(event) {
  if (String(entete(event, 'sec-fetch-site') || '').toLowerCase() === 'cross-site') return false;
  const origine = entete(event, 'origin');
  if (!origine) return true;
  const hotes = hotesDuSite();
  if (!hotes.size) return true;
  try {
    return hotes.has(new URL(String(origine)).host.toLowerCase());
  } catch {
    return false;
  }
}

function empreinteEmail(email) {
  return crypto.createHash('sha256').update(String(email).trim().toLowerCase(), 'utf8').digest('hex');
}

// Nombre de demandes déjà reçues pour cet email sur 24 h. Échec de lecture : journalisé, jamais bloquant.
async function limiteEmailAtteinte(empreinte, maintenant) {
  try {
    const depuis = new Date(maintenant.getTime() - FENETRE_EMAIL_MS).toISOString();
    const lignes = await supabase.lire('retractations', {
      select: 'id',
      filtres: { email_empreinte: `eq.${empreinte}`, recu_le: `gte.${depuis}` },
      limite: MAX_DEMANDES_PAR_EMAIL,
      timeoutMs: DELAI_LECTURE_BASE_MS,
    });
    return lignes.length >= MAX_DEMANDES_PAR_EMAIL;
  } catch (err) {
    console.error(`[retractation] limite par email non vérifiée : ${err.message}`);
    return false;
  }
}
