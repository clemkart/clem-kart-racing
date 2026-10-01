'use strict';
// Lecture centralisée des variables d'environnement.
// Aucune valeur secrète ici : seulement des noms de variables et des valeurs publiques par défaut.
// Les variables sont relues à chaque appel (pas de cache) : un changement dans Netlify s'applique au déploiement suivant.
// Site 1 (V4) : la copie interne part par défaut à contact.email de config/offres.json. L'expéditeur, lui,
// est fixé dans brevo.js, le même que send-email.js, relance-guide.js et demande.js (seul validé dans Brevo).
// netlify.toml embarque config/offres.json avec chaque fonction (included_files).

const OFFRES = require('../../../config/offres.json');

const DEFAUTS = Object.freeze({
  // URL publique du projet Supabase (ce n'est pas un secret).
  SUPABASE_URL: 'https://hkpknrrymgbnjmbewlyc.supabase.co',
  // L'expéditeur et l'adresse de réponse ne se règlent pas ici : brevo.js lit directement config/offres.json.
  // Destinataire des alertes internes (débriefs, litiges, rétractations, ventes à vérifier).
  EMAIL_INTERNE: OFFRES.contact.email,
});

// Valeur nettoyée d'une variable, ou chaîne vide.
function lire(nom) {
  const valeur = process.env[nom];
  return typeof valeur === 'string' ? valeur.trim() : '';
}

// Variable indispensable : erreur explicite si elle manque (sans jamais afficher de valeur).
function obligatoire(nom) {
  const valeur = lire(nom);
  if (!valeur) throw new Error(`Variable d'environnement manquante : ${nom}`);
  return valeur;
}

// Variable facultative avec valeur par défaut publique.
function avecDefaut(nom) {
  return lire(nom) || DEFAUTS[nom] || '';
}

// Adresse publique du site, sans barre finale. SITE_URL en priorité, sinon URL fournie par Netlify.
// Une valeur saisie sans protocole (« clemkartracing.fr ») est complétée en https://.
function urlSite() {
  const valeur = lire('SITE_URL') || lire('URL');
  if (!valeur) throw new Error("Variable d'environnement manquante : SITE_URL");
  const avecProtocole = /^https?:\/\//i.test(valeur) ? valeur : `https://${valeur}`;
  return avecProtocole.replace(/\/+$/, '');
}

// URL du PDF des CGV joint aux emails de livraison (pièce jointe Brevo par URL, donc publique).
// CGV_PDF_URL absente : ${SITE_URL}/cgv.pdf. CGV_PDF_URL=off : aucune pièce jointe (renvoie une chaîne vide).
// Un chemin sans protocole (« /docs/cgv.pdf ») est rattaché au site.
function urlCgvPdf() {
  const valeur = lire('CGV_PDF_URL');
  if (valeur.toLowerCase() === 'off') return '';
  if (!valeur) return `${urlSite()}/cgv.pdf`;
  if (/^https?:\/\//i.test(valeur)) return valeur;
  return `${urlSite()}/${valeur.replace(/^\/+/, '')}`;
}

// 'test' seulement si STRIPE_MODE=test, sinon 'live'.
function modeStripe() {
  return lire('STRIPE_MODE').toLowerCase() === 'test' ? 'test' : 'live';
}

module.exports = { DEFAUTS, lire, obligatoire, avecDefaut, urlSite, urlCgvPdf, modeStripe };
