'use strict';
// Envoi d'emails transactionnels par l'API Brevo (POST /v3/smtp/email).
// Clé : BREVO_API_KEY (seule variable requise).
// Expéditeur et adresse de réponse : exactement ceux de send-email.js, demande.js et relance-guide.js
// ({ marque.nom, contact.email } de config/offres.json), sans aucune surcharge par variable d'environnement :
// Brevo n'accepte que cet expéditeur déjà validé, un autre ferait échouer l'accusé de réception.

const { requete } = require('./http');
const { obligatoire } = require('./config');
const OFFRES = require('../../../config/offres.json');

const API_BREVO = 'https://api.brevo.com/v3/smtp/email';

function expediteur() {
  return { name: OFFRES.marque.nom, email: OFFRES.contact.email };
}

// message : { destinataire: { email, nom }, copieCachee, sujet, html, texte, tags, repondreA, piecesJointes }
// copieCachee : adresse en copie cachée (bcc) du même envoi, ignorée si c'est déjà le destinataire.
// piecesJointes : [{ url, name }] (pièce jointe par URL publique, téléchargée par Brevo à l'envoi).
async function envoyerEmail({ destinataire, copieCachee, sujet, html, texte, tags, repondreA, piecesJointes } = {}) {
  const cle = obligatoire('BREVO_API_KEY');
  if (!destinataire || !destinataire.email) throw new Error('Brevo : destinataire manquant');
  const to = { email: String(destinataire.email).trim() };
  if (destinataire.nom) to.name = String(destinataire.nom).replace(/[\r\n]+/g, ' ').trim().slice(0, 70);

  const corps = {
    sender: expediteur(),
    to: [to],
    replyTo: { email: repondreA || OFFRES.contact.email },
    subject: String(sujet || '').replace(/[\r\n]+/g, ' ').trim(),
    htmlContent: html,
    textContent: texte,
  };
  const cachee = typeof copieCachee === 'string' ? copieCachee.trim() : '';
  if (cachee && cachee.toLowerCase() !== to.email.toLowerCase()) corps.bcc = [{ email: cachee }];
  if (Array.isArray(tags) && tags.length) corps.tags = tags;
  if (Array.isArray(piecesJointes) && piecesJointes.length) {
    corps.attachment = piecesJointes.map(({ url, name }) => ({ url, name }));
  }

  const reponse = await requete('Brevo', API_BREVO, {
    method: 'POST',
    headers: { 'api-key': cle, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(corps),
  });
  return { messageId: (reponse && reponse.messageId) || null };
}

module.exports = { API_BREVO, expediteur, envoyerEmail };
