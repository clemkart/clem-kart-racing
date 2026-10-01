'use strict';
// Page /retractation/ : libellés réglementaires de la fonction de rétractation (article D221-5 du Code de la
// consommation), informations qu'elle doit recueillir, page privée, lien permanent en bas de chaque page.
// Reprise de tests/pages.test.js du paquet « livraison-phase2 », adaptée aux sources V4 (partials, config).

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const RACINE = path.resolve(__dirname, '..', '..');
const SITE = path.join(RACINE, 'site v2');
const lire = (...morceaux) => fs.readFileSync(path.join(...morceaux), 'utf8');
const OFFRES = JSON.parse(lire(RACINE, 'config', 'offres.json'));

// Fichiers publiés par ce lot : les pages légales, la fonction, ses modules, la feuille de style.
const FICHIERS_DU_LOT = [
  'mentions-legales.html',
  'cgv.html',
  'confidentialite.html',
  path.join('retractation', 'index.html'),
  path.join('assets', 'page-legal.css'),
  path.join('netlify', 'functions', 'retractation.js'),
  ...fs.readdirSync(path.join(SITE, 'netlify', 'lib')).map((nom) => path.join('netlify', 'lib', nom)),
].map((rel) => path.join(SITE, rel));

describe('page /retractation/', () => {
  const retractation = lire(SITE, 'retractation', 'index.html');

  it('libellés réglementaires exacts, dans des constantes faciles à modifier', () => {
    assert.ok(retractation.includes("var LIBELLE_BOUTON_RETRACTATION = 'Renoncer au contrat ici';"));
    assert.ok(retractation.includes("var LIBELLE_BOUTON_CONFIRMATION = 'Confirmer la rétractation';"));
    assert.ok(retractation.includes('>Renoncer au contrat ici</button>'));
    assert.ok(retractation.includes('>Confirmer la rétractation</button>'));
  });

  it('la fonction recueille nom et prénom, de quoi identifier le contrat, et l\'email de l\'accusé', () => {
    const attendus = [
      /<label for="nom">Nom et prénom<\/label>/,
      /<label for="reference">Référence de commande<\/label>/,
      /Numéro de facture ou email utilisé au paiement/,
      /name="produit" value="debrief"/,
      /name="produit" value="guide"/,
      /name="produit" value="les_deux"/,
      /<textarea id="message"/,
      /<input id="email"[^>]*type="email"[^>]*required/,
      /L'accusé de réception part à cette adresse\./,
      /name="site_web"[^>]*tabindex="-1"/,
    ];
    for (const motif of attendus) assert.match(retractation, motif);
  });

  it('même envoi que le paquet : JSON vers la fonction retractation', () => {
    assert.ok(retractation.includes("var ENDPOINT = '/.netlify/functions/retractation';"));
    assert.match(retractation, /'Content-Type': 'application\/json'/);
    assert.match(retractation, /body: JSON\.stringify\(d\)/);
    assert.ok(fs.existsSync(path.join(SITE, 'netlify', 'functions', 'retractation.js')));
  });

  it('page privée : noindex et aucun Referer', () => {
    assert.ok(retractation.includes('<meta name="robots" content="noindex, nofollow">'));
    assert.ok(retractation.includes('<meta name="referrer" content="no-referrer">'));
  });

  it('pied de page commun : « Renoncer au contrat ici » vers /retractation/ sur les pages légales', () => {
    assert.equal(OFFRES.routes.retractation, '/retractation/');
    const pied = lire(SITE, '_partials', 'footer.html');
    assert.ok(pied.includes('<a href="{{routes.retractation}}">Renoncer au contrat ici</a>'), 'lien absent du pied de page commun');
    for (const page of ['mentions-legales.html', 'cgv.html', 'confidentialite.html', path.join('retractation', 'index.html')]) {
      assert.ok(lire(SITE, page).includes('{{partial:footer}}'), page);
    }
  });

  it('l\'ancien libellé n\'apparaît dans aucun fichier du lot', () => {
    const ancien = ['Se rétracter', 'du contrat ici'].join(' ');
    const fautifs = FICHIERS_DU_LOT.filter((f) => fs.readFileSync(f, 'utf8').includes(ancien));
    assert.deepEqual(fautifs.map((f) => path.relative(RACINE, f)), []);
  });
});

module.exports = { FICHIERS_DU_LOT };
