'use strict';
// Portes de paiement du plan d'action (/aller/plan et /aller/plan-camera).
// Pendant le lancement (avant diagnostic.lancement.fin), elles mènent aux liens Stripe de lancement ;
// après, aux liens habituels de diagnostic.stripe. La bascule se fait à l'heure du serveur, à chaque
// clic : aucune publication n'est nécessaire à la fin du lancement.
// La chaîne de requête (locale, prefilled_email, client_reference_id) suit vers Stripe.

const OFFRES = require('../../../config/offres.json');

const LIEN_STRIPE = /^https:\/\/buy\.stripe\.com\/[A-Za-z0-9]+$/;
const PARAMETRES_MAX = 12;
const LONGUEUR_MAX = 320;

function lancementActif(maintenant = Date.now(), offres = OFFRES) {
  const lancement = (offres.diagnostic && offres.diagnostic.lancement) || {};
  const liens = lancement.stripe || {};
  const fin = Date.parse(lancement.fin);
  return Number.isFinite(fin) && maintenant < fin && LIEN_STRIPE.test(liens.url || '') && LIEN_STRIPE.test(liens.url_camera || '');
}

// L'adresse Stripe du moment, ou '' si le plan n'est pas en vente.
function cible(camera, maintenant = Date.now(), offres = OFFRES) {
  const diagnostic = offres.diagnostic || {};
  const habituels = diagnostic.stripe || {};
  if (habituels.pret !== 'oui') return '';
  const liens = lancementActif(maintenant, offres) ? diagnostic.lancement.stripe : habituels;
  const adresse = camera ? liens.url_camera : liens.url;
  return LIEN_STRIPE.test(adresse || '') ? adresse : '';
}

function repondre(event, camera, maintenant = Date.now()) {
  const adresse = cible(camera, maintenant);
  if (!adresse) return { statusCode: 404, headers: { 'Cache-Control': 'no-store' }, body: '' };
  const suite = new URLSearchParams();
  Object.entries((event && event.queryStringParameters) || {}).slice(0, PARAMETRES_MAX).forEach(([cle, valeur]) => {
    if (typeof valeur === 'string' && valeur) suite.set(cle.slice(0, 60), valeur.slice(0, LONGUEUR_MAX));
  });
  const requete = suite.toString();
  // no-store : ni le navigateur ni le réseau ne gardent une redirection qui change à la fin du lancement.
  return { statusCode: 302, headers: { Location: requete ? `${adresse}?${requete}` : adresse, 'Cache-Control': 'no-store' }, body: '' };
}

module.exports = { lancementActif, cible, repondre };
