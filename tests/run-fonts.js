/* ============================================================
   tests/run-fonts.js : 5 graisses, pas une de plus.

   Echoue si un CSS de "site v2/" (fichiers .css et blocs <style> des .html,
   partials compris) demande une graisse, un style ou une famille hors de :
     Bebas Neue 400 · Barlow Condensed 600 et 700 · Barlow 400 · JetBrains Mono 400
   Verifie aussi les feuilles Google Fonts demandees par les pages.
   Les familles generiques et de secours systeme sont tolerees en fin de pile.
   Aucune dependance.
   ============================================================ */
'use strict';

const fs = require('fs');
const path = require('path');

const RACINE = path.resolve(__dirname, '..');
const SITE = path.join(RACINE, 'site v2');
const DOSSIERS_IGNORES = new Set(['node_modules', '.claude', 'netlify', 'supabase']);

const AUTORISEES = {
  'bebas neue': [400],
  'barlow condensed': [600, 700],
  'barlow': [400],
  'jetbrains mono': [400],
};
const GRAISSES_AUTORISEES = new Set(['400', '600', '700', 'normal', 'bold', 'inherit', 'initial', 'unset']);
const FAMILLES_TOLEREES = new Set([
  'sans-serif', 'serif', 'monospace', 'system-ui', 'ui-sans-serif', 'ui-monospace', 'ui-serif', 'cursive', 'fantasy',
  '-apple-system', 'blinkmacsystemfont', 'segoe ui', 'roboto', 'arial', 'arial narrow', 'helvetica', 'helvetica neue',
  'impact', 'consolas', 'menlo', 'monaco', 'courier new', 'inherit', 'initial', 'unset',
]);

function listerFichiers(dossier, resultat = []) {
  for (const e of fs.readdirSync(dossier, { withFileTypes: true })) {
    const p = path.join(dossier, e.name);
    if (e.isDirectory()) { if (!DOSSIERS_IGNORES.has(e.name)) listerFichiers(p, resultat); continue; }
    const ext = path.extname(e.name).toLowerCase();
    if (e.isFile() && (ext === '.css' || ext === '.html')) resultat.push(p);
  }
  return resultat;
}

function ajouter(map, cle) { map.set(cle, (map.get(cle) || 0) + 1); }

/* Bloc(s) CSS d un fichier : tout le .css, ou les <style> d un .html */
function extraireCss(texte, ext) {
  if (ext === '.css') return [texte];
  const blocs = [];
  const re = /<style[^>]*>([\s\S]*?)<\/style>/gi;
  let m;
  while ((m = re.exec(texte))) blocs.push(m[1]);
  return blocs;
}

function verifierCss(css, erreurs) {
  /* font-weight */
  const reW = /font-weight\s*:\s*([^;}]+)/gi;
  let m;
  while ((m = reW.exec(css))) {
    const v = m[1].trim().toLowerCase();
    if (v.startsWith('var(')) continue;
    if (!GRAISSES_AUTORISEES.has(v)) ajouter(erreurs, `font-weight: ${v}`);
  }
  /* font-style italique : aucun fichier italique parmi les 5 */
  const reS = /font-style\s*:\s*(italic|oblique)/gi;
  while ((m = reS.exec(css))) ajouter(erreurs, `font-style: ${m[1].toLowerCase()}`);
  /* font: raccourci avec graisse numerique ou italique */
  const reF = /(^|[;{\s])font\s*:\s*([^;}]+)/gi;
  while ((m = reF.exec(css))) {
    const v = m[2].trim().toLowerCase();
    if (v.startsWith('var(') || v === 'inherit') continue;
    const graisse = v.match(/(?:^|\s)([1-9]00)(?=\s)/);
    if (graisse && !GRAISSES_AUTORISEES.has(graisse[1])) ajouter(erreurs, `font: ... ${graisse[1]}`);
    if (/(^|\s)(italic|oblique)(\s|$)/.test(v)) ajouter(erreurs, 'font: italic');
  }
  /* font-family : chaque nom de la pile */
  const reFam = /font-family\s*:\s*([^;}]+)/gi;
  while ((m = reFam.exec(css))) {
    const pile = m[1].trim();
    if (pile.toLowerCase().startsWith('var(')) continue;
    for (const brut of pile.split(',')) {
      const nom = brut.trim().replace(/^['"]|['"]$/g, '').toLowerCase();
      if (!nom || nom.startsWith('var(')) continue;
      if (AUTORISEES[nom] || FAMILLES_TOLEREES.has(nom)) continue;
      ajouter(erreurs, `font-family: ${nom}`);
    }
  }
}

/* Feuilles Google Fonts : familles et graisses demandees */
function verifierGoogleFonts(html, erreurs) {
  const re = /fonts\.googleapis\.com\/css2?\?([^"'\s>]+)/gi;
  let m;
  while ((m = re.exec(html))) {
    const params = m[1].replace(/&amp;/g, '&').split('&');
    for (const p of params) {
      if (!p.startsWith('family=')) continue;
      const spec = decodeURIComponent(p.slice(7)).replace(/\+/g, ' ');
      const [nomBrut, axes] = spec.split(':');
      const nom = nomBrut.trim().toLowerCase();
      if (!AUTORISEES[nom]) { ajouter(erreurs, `Google Fonts: ${nomBrut}`); continue; }
      const graisses = new Set();
      let italique = false;
      if (!axes) graisses.add(400);
      else {
        const [cles, valeurs] = axes.split('@');
        const listeCles = cles.split(',');
        for (const tuple of (valeurs || '').split(';')) {
          const parts = tuple.split(',');
          const iIdx = listeCles.indexOf('ital');
          const wIdx = listeCles.indexOf('wght');
          if (iIdx >= 0 && parts[iIdx] === '1') italique = true;
          graisses.add(wIdx >= 0 ? Number(parts[wIdx]) : 400);
        }
      }
      for (const g of graisses) if (!AUTORISEES[nom].includes(g)) ajouter(erreurs, `Google Fonts: ${nomBrut} ${g}`);
      if (italique) ajouter(erreurs, `Google Fonts: ${nomBrut} italique`);
    }
  }
}

console.log('=== test:fonts : Bebas Neue 400, Barlow Condensed 600 et 700, Barlow 400, JetBrains Mono 400');
const fichiers = listerFichiers(SITE);
let fichiersRouges = 0;
for (const f of fichiers) {
  const texte = fs.readFileSync(f, 'utf8');
  const ext = path.extname(f).toLowerCase();
  const erreurs = new Map();
  for (const bloc of extraireCss(texte, ext)) verifierCss(bloc, erreurs);
  if (ext === '.html') verifierGoogleFonts(texte, erreurs);
  if (erreurs.size) {
    fichiersRouges++;
    const detail = [...erreurs.entries()].map(([k, n]) => `${k} x${n}`).join(', ');
    console.log(`  FAIL ${path.relative(RACINE, f)} : ${detail}`);
  }
}
if (fichiersRouges) {
  console.log(`\ntest:fonts ROUGE (${fichiersRouges} fichier(s) sur ${fichiers.length})`);
  process.exit(1);
}
console.log(`  OK   ${fichiers.length} fichiers parcourus, seulement les 5 graisses autorisees`);
console.log('\ntest:fonts VERT');
