'use strict';
// Stripe sans SDK : vérification de signature des webhooks et lecture REST (fetch natif).
// Reprise de netlify/lib/stripe.js du paquet « livraison-phase2 », réduite à ce que stripe-webhook.js utilise.
// Clés : STRIPE_WEBHOOK_SECRET (signature) et STRIPE_READ_KEY (clé restreinte en lecture, déjà utilisée par
// dashboard-data.js). Aucune clé n'apparaît dans les logs.

const crypto = require('crypto');
const { requete } = require('./http');
const { lire } = require('./config');

const API_STRIPE = 'https://api.stripe.com/v1';
const TOLERANCE_SIGNATURE_SEC = 300;

// Lit l'en-tête « Stripe-Signature: t=...,v1=...,v1=... » (plusieurs v1 possibles pendant une rotation de secret).
function lireEnteteSignature(entete) {
  const resultat = { t: null, v1: [] };
  if (typeof entete !== 'string' || !entete) return resultat;
  for (const morceau of entete.split(',')) {
    const egal = morceau.indexOf('=');
    if (egal < 1) continue;
    const cle = morceau.slice(0, egal).trim();
    const valeur = morceau.slice(egal + 1).trim();
    if (cle === 't') resultat.t = valeur;
    else if (cle === 'v1' && valeur) resultat.v1.push(valeur);
  }
  return resultat;
}

// Vérifie la signature d'un webhook Stripe.
// payload : corps BRUT exact (chaîne ou Buffer, déjà décodé du base64 si besoin). Jamais un objet reparsé.
// Renvoie { valide: true, horodatage } ou { valide: false, raison }.
function verifierSignature(payload, enteteSignature, secret, toleranceSec = TOLERANCE_SIGNATURE_SEC, maintenantSec = Math.floor(Date.now() / 1000)) {
  if (!secret) return { valide: false, raison: 'secret_absent' };
  if (!Buffer.isBuffer(payload) && typeof payload !== 'string') return { valide: false, raison: 'corps_invalide' };
  const { t, v1 } = lireEnteteSignature(enteteSignature);
  if (!t || !/^\d{1,12}$/.test(t)) return { valide: false, raison: 'horodatage_absent' };
  if (v1.length === 0) return { valide: false, raison: 'signature_absente' };

  const corps = Buffer.isBuffer(payload) ? payload : Buffer.from(payload, 'utf8');
  const attendu = crypto.createHmac('sha256', secret).update(`${t}.`, 'utf8').update(corps).digest();

  // Comparaison à temps constant de chaque signature v1 reçue.
  const correspond = v1.some((signature) => {
    if (!/^[0-9a-f]{64}$/i.test(signature)) return false;
    const recue = Buffer.from(signature, 'hex');
    return recue.length === attendu.length && crypto.timingSafeEqual(recue, attendu);
  });
  if (!correspond) return { valide: false, raison: 'signature_invalide' };
  if (Math.abs(maintenantSec - Number(t)) > toleranceSec) return { valide: false, raison: 'expiree' };
  return { valide: true, horodatage: Number(t) };
}

// Lignes du panier d'une session de paiement (GET /v1/checkout/sessions/{id}/line_items).
// Renvoie null sans clé de lecture : l'appelant se rabat alors sur le montant payé.
async function lireLignesSession(sessionId) {
  const cle = lire('STRIPE_READ_KEY');
  if (!cle) return null;
  const url = `${API_STRIPE}/checkout/sessions/${encodeURIComponent(sessionId)}/line_items?limit=20`;
  const reponse = await requete('Stripe', url, { headers: { Authorization: `Bearer ${cle}` } });
  return Array.isArray(reponse && reponse.data) ? reponse.data : [];
}

// Lien vers le paiement dans le Dashboard Stripe (/test/ pour un paiement du mode test).
function lienDashboardPaiement(paymentIntent, livemode) {
  if (typeof paymentIntent !== 'string' || !/^pi_[A-Za-z0-9]+$/.test(paymentIntent)) return '';
  return `https://dashboard.stripe.com/${livemode === false ? 'test/' : ''}payments/${paymentIntent}`;
}

module.exports = { API_STRIPE, lireEnteteSignature, verifierSignature, lireLignesSession, lienDashboardPaiement };
