'use strict';
// Point d'entrée de compatibilité pour `node --test tests/`.
// Node 20 (cible Netlify) parcourt le dossier et lance chaque fichier *.test.js : ce fichier-ci est ignoré
// (son nom ne correspond pas au motif des fichiers de test).
// Node 22 et plus traitent « tests/ » comme un module : c'est alors ce fichier qui s'exécute et charge
// tous les fichiers de test (chaque fichier isole ses réglages dans ses propres blocs describe).

const fs = require('fs');
const path = require('path');

for (const nom of fs.readdirSync(__dirname).sort()) {
  if (nom.endsWith('.test.js')) require(path.join(__dirname, nom));
}
