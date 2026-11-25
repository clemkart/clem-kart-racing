'use strict';
// Pages légales vérifiées le 24/09/2026 (CGV, mentions légales, confidentialité) intégrées au site V4 :
// identité lue dans config/offres.json, aucun médiateur cité, sommaire sans lien mort, PDF des CGV identique
// à la version vérifiée, aucune adresse ni aucun email écrits en dur.

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const RACINE = path.resolve(__dirname, '..', '..');
const SITE = path.join(RACINE, 'site v2');
const lire = (nom) => fs.readFileSync(path.join(SITE, nom), 'utf8');

// Empreinte de cgv.pdf, version du 25/11/2026 (12 pages A4, plan d'action ajouté, imprimée depuis la page /cgv du site avec Edge).
// Version précédente : 24/09/2026 (7 pages, dossier pages-legales de la session Stripe).
// Le PDF change : régénérer depuis cgv.html du dossier pages-legales, puis mettre à jour cette empreinte.
const EMPREINTE_CGV_PDF = 'adeb5e368f5fc400ab4c0456554537e73c8577276148759d5f4eb1a3af3d9a41';

const PAGES = {
  'cgv.html': { route: 'routes.cgv', identite: ['{{legal.adresse}}', '{{legal.siren}}', '{{legal.registre}}', 'href="tel:{{legal.telephone_lien}}">{{legal.telephone}}</a>'], articles: 14 },
  'mentions-legales.html': { route: 'routes.mentions', identite: ['{{legal.adresse}}', '{{legal.siren}}', '{{legal.registre}}', 'href="tel:{{legal.telephone_lien}}">{{legal.telephone}}</a>'], articles: 5 },
  'confidentialite.html': { route: 'routes.confidentialite', identite: ['{{legal.adresse}}'], articles: 7 },
};

describe('pages légales', () => {
  for (const [nom, attendu] of Object.entries(PAGES)) {
    const page = lire(nom);

    it(`${nom} : squelette V4, adresse canonique, indexable`, () => {
      for (const morceau of ['{{partial:head}}', '{{partial:nav}}', '{{partial:footer}}', '/assets/page-legal.css', '<body class="page-legal"']) {
        assert.ok(page.includes(morceau), morceau);
      }
      assert.ok(page.includes(`<link rel="canonical" href="{{sites.url}}{{${attendu.route}}}">`));
      assert.ok(page.includes('<meta name="robots" content="index, follow">'));
      assert.equal((page.match(/<h1[\s>]/g) || []).length, 1);
    });

    it(`${nom} : identité du vendeur lue dans la config`, () => {
      for (const balise of attendu.identite) assert.ok(page.includes(balise), balise);
    });

    it(`${nom} : aucun médiateur cité (décision du 24/09), aucune balise du modèle restante`, () => {
      // « immédiat » est permis : on cherche le mot en début de mot seulement
      assert.doesNotMatch(page, /(^|[^\p{L}])m[ée]diat/iu);
      assert.doesNotMatch(page, /\{\{[A-Z_]+\}\}/);
      assert.doesNotMatch(page, /À COMPLÉTER/);
    });

    it(`${nom} : email et adresses internes par balises, jamais en dur`, () => {
      assert.doesNotMatch(page, /@gmail\.com|clemkartracing\.(com|fr)/);
      const liensInternes = [...page.matchAll(/href="(\/[^"]*)"/g)].map((m) => m[1]).filter((h) => !h.startsWith('/assets/'));
      assert.deepEqual(liensInternes, []);
    });

    it(`${nom} : ${attendu.articles} articles numérotés, chaque entrée du sommaire mène à un titre`, () => {
      const numeros = [...page.matchAll(/<h2 id="[^"]+"><span class="legal-num">(\d+)\.<\/span>/g)].map((m) => Number(m[1]));
      assert.deepEqual(numeros, Array.from({ length: attendu.articles }, (_, i) => i + 1));
      const ancres = [...page.matchAll(/<li><a href="#([^"]+)">/g)].map((m) => m[1]);
      assert.equal(ancres.length, attendu.articles);
      for (const id of ancres) assert.ok(page.includes(`<h2 id="${id}">`), `#${id} sans titre`);
    });
  }

  it('CGV : lien vers le PDF, la rétractation et la confidentialité par les routes de la config', () => {
    const cgv = lire('cgv.html');
    for (const route of ['{{routes.cgv_pdf}}', '{{routes.retractation}}', '{{routes.confidentialite}}']) assert.ok(cgv.includes(`href="${route}"`), route);
    assert.ok(cgv.includes('MODÈLE DE FORMULAIRE DE RÉTRACTATION'));
    assert.ok(cgv.includes('Garantie légale de conformité des contenus numériques'));
  });

  it('cgv.pdf : copie octet pour octet de la version du 25/11', () => {
    const pdf = fs.readFileSync(path.join(SITE, 'cgv.pdf'));
    assert.equal(pdf.subarray(0, 5).toString('latin1'), '%PDF-');
    assert.equal(crypto.createHash('sha256').update(pdf).digest('hex'), EMPREINTE_CGV_PDF);
  });
});
