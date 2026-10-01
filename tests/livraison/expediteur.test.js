'use strict';
// Site 1 : sans variable EMAIL_SENDER, la fonction de rétractation envoie avec la même adresse que
// send-email.js (contact.email de config/offres.json, déjà validée dans Brevo). Seule BREVO_API_KEY est requise.
// Aucune variable ne peut changer l'expéditeur : un expéditeur non validé ferait échouer l'accusé de réception.

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');

const RACINE = path.resolve(__dirname, '..', '..');
const OFFRES = require(path.join(RACINE, 'config', 'offres.json'));
const { expediteur, envoyerEmail } = require('../../site v2/netlify/lib/brevo');
const { avecDefaut, DEFAUTS } = require('../../site v2/netlify/lib/config');
const { installerFetch } = require('./aides/fetch-simule');

const VARIABLES = ['EMAIL_SENDER', 'EMAIL_REPLY_TO', 'EMAIL_INTERNE', 'BREVO_API_KEY'];

describe('expéditeur par défaut du site 1', () => {
  let sauvegarde;
  beforeEach(() => {
    sauvegarde = Object.fromEntries(VARIABLES.map((nom) => [nom, process.env[nom]]));
    for (const nom of VARIABLES) delete process.env[nom];
  });
  afterEach(() => {
    for (const [nom, valeur] of Object.entries(sauvegarde)) {
      if (valeur === undefined) delete process.env[nom];
      else process.env[nom] = valeur;
    }
  });

  it('expéditeur, réponse et copie interne = contact.email de la config', () => {
    assert.deepEqual(expediteur(), { name: OFFRES.marque.nom, email: OFFRES.contact.email });
    assert.equal(avecDefaut('EMAIL_INTERNE'), OFFRES.contact.email);
  });

  it('EMAIL_SENDER ou EMAIL_REPLY_TO posées sur Netlify : ignorées, expéditeur et réponse restent contact.email', async () => {
    process.env.EMAIL_SENDER = 'Autre nom <autre@exemple.test>';
    process.env.EMAIL_REPLY_TO = 'autre-reponse@exemple.test';
    process.env.BREVO_API_KEY = 'cle_brevo_factice_pour_tests';
    assert.deepEqual(expediteur(), { name: OFFRES.marque.nom, email: OFFRES.contact.email });
    const sim = installerFetch().sur('POST', 'https://api.brevo.com/', { status: 201, json: { messageId: 'x' } });
    try {
      await envoyerEmail({ destinataire: { email: 'pilote@exemple.test' }, sujet: 's', html: '<p>h</p>', texte: 't' });
    } finally {
      sim.restaurer();
    }
    const corps = JSON.parse(sim.appels[0].corps);
    assert.deepEqual(corps.sender, { name: OFFRES.marque.nom, email: OFFRES.contact.email });
    assert.deepEqual(corps.replyTo, { email: OFFRES.contact.email });
    assert.equal(corps.bcc, undefined, 'pas de copie cachée demandée');
  });

  it('aucune clé ni aucun secret parmi les valeurs par défaut', () => {
    assert.deepEqual(Object.keys(DEFAUTS).sort(), ['EMAIL_INTERNE', 'SUPABASE_URL']);
  });
});
