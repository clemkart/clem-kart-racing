'use strict';
// Règle éditoriale : aucun tiret cadratin (U+2014) ni demi-cadratin (U+2013) dans les fichiers de ce lot
// (pages légales, fonction de rétractation, modules partagés, feuille de style, tests).

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { FICHIERS_DU_LOT } = require('./pages.test');

const RACINE = path.resolve(__dirname, '..', '..');
// Construit par code : le fichier lui-même ne doit contenir aucun de ces caractères.
const TIRETS = new RegExp(`[${String.fromCharCode(0x2013, 0x2014)}]`);

function fichiers(dossier) {
  const resultat = [];
  for (const entree of fs.readdirSync(dossier, { withFileTypes: true })) {
    const chemin = path.join(dossier, entree.name);
    if (entree.isDirectory()) resultat.push(...fichiers(chemin));
    else if (entree.isFile()) resultat.push(chemin);
  }
  return resultat;
}

describe('règle des tirets', () => {
  it('aucun fichier du lot ne contient de tiret cadratin ni demi-cadratin', () => {
    const liste = [...FICHIERS_DU_LOT, ...fichiers(__dirname)];
    assert.ok(liste.length >= 20, `trop peu de fichiers analysés (${liste.length})`);
    const fautifs = [];
    for (const fichier of liste) {
      fs.readFileSync(fichier, 'utf8')
        .split('\n')
        .forEach((ligne, index) => {
          if (TIRETS.test(ligne)) fautifs.push(`${path.relative(RACINE, fichier)}:${index + 1}`);
        });
    }
    assert.deepEqual(fautifs, []);
  });
});
