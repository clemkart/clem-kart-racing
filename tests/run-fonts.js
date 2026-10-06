/* ============================================================
   tests/run-fonts.js : trois familles, des graisses et des largeurs comptees (direction V5, 2.2).

   Echoue si un CSS de "site v2/" (fichiers .css et blocs <style> des .html,
   partials compris) demande une graisse, une largeur, un style ou une famille hors de :
     Hubot Sans 800 (largeur 75) · Mona Sans 400 a 600 · Martian Mono 400 a 600 (largeur 87,5)
   Verifie aussi les polices prechargees (woff2 de fonts.gstatic.com, une des trois familles, crossorigin)
   et les feuilles Google Fonts demandees par les pages : n-uplets wdth,wght@75,800,
   plages 400..600 (developpees par pas de 100), chaque graisse et chaque largeur autorisees.
   Les familles generiques, les polices de secours calees et les polices systeme
   sont tolerees en fin de pile. Aucune dependance.
   ============================================================ */
'use strict';

const fs = require('fs');
const path = require('path');

const RACINE = path.resolve(__dirname, '..');
const SITE = path.join(RACINE, 'site v2');
const DOSSIERS_IGNORES = new Set(['node_modules', '.claude', 'netlify', 'supabase']);

const AUTORISEES = {
  'hubot sans': { graisses: [800], largeurs: [75] },
  'mona sans': { graisses: [400, 500, 600], largeurs: [100] },
  'martian mono': { graisses: [400, 500, 600], largeurs: [87.5] },
};
const GRAISSES_AUTORISEES = new Set(['400', '500', '600', '800', 'normal', 'inherit', 'initial', 'unset']);
const LARGEURS_AUTORISEES = new Set(['75%', '87.5%', '100%', 'normal', 'inherit', 'initial', 'unset']);
const FAMILLES_TOLEREES = new Set([
  'sans-serif', 'serif', 'monospace', 'system-ui', 'ui-sans-serif', 'ui-monospace', 'ui-serif', 'cursive', 'fantasy',
  '-apple-system', 'blinkmacsystemfont', 'segoe ui', 'roboto', 'arial', 'arial narrow', 'arial narrow bold', 'helvetica', 'helvetica neue',
  'impact', 'consolas', 'menlo', 'monaco', 'courier new', 'inherit', 'initial', 'unset',
  'hubot sans repli', 'mona sans repli', 'martian mono repli',
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
    const v = m[1].trim().toLowerCase().replace(/\s*!important$/, '');
    if (v.startsWith('var(')) continue;
    if (!GRAISSES_AUTORISEES.has(v)) ajouter(erreurs, `font-weight: ${v}`);
  }
  /* font-stretch : seulement les largeurs chargees */
  const reL = /font-stretch\s*:\s*([^;}]+)/gi;
  while ((m = reL.exec(css))) {
    const v = m[1].trim().toLowerCase().replace(/\s*!important$/, '');
    if (v.startsWith('var(')) continue;
    if (!LARGEURS_AUTORISEES.has(v)) ajouter(erreurs, `font-stretch: ${v}`);
  }
  /* font-style italique : aucun fichier italique n est charge */
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

/* Une valeur d axe : un nombre, ou une plage « 400..600 » developpee par pas de 100 (graisses) */
function valeursAxe(brut, pas) {
  const plage = String(brut).split('..');
  if (plage.length === 2) {
    const [a, b] = plage.map(Number);
    const sortie = [];
    for (let v = a; v <= b; v += pas) sortie.push(v);
    return sortie;
  }
  return [Number(brut)];
}

/* Feuilles Google Fonts : familles, graisses et largeurs demandees */
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
      const regle = AUTORISEES[nom];
      if (!regle) { ajouter(erreurs, `Google Fonts: ${nomBrut}`); continue; }
      const graisses = new Set();
      const largeurs = new Set();
      let italique = false;
      if (!axes) graisses.add(400);
      else {
        const [cles, valeurs] = axes.split('@');
        const listeCles = cles.split(',');
        const iIdx = listeCles.indexOf('ital');
        const wIdx = listeCles.indexOf('wght');
        const lIdx = listeCles.indexOf('wdth');
        for (const tuple of (valeurs || '').split(';')) {
          const parts = tuple.split(',');
          if (iIdx >= 0 && parts[iIdx] === '1') italique = true;
          (wIdx >= 0 ? valeursAxe(parts[wIdx], 100) : [400]).forEach((g) => graisses.add(g));
          if (lIdx >= 0) largeurs.add(parts[lIdx]);
        }
      }
      for (const g of graisses) if (!regle.graisses.includes(g)) ajouter(erreurs, `Google Fonts: ${nomBrut} ${g}`);
      for (const l of largeurs) {
        if (String(l).includes('..') || !regle.largeurs.includes(Number(l))) ajouter(erreurs, `Google Fonts: ${nomBrut} largeur ${l}`);
      }
      if (italique) ajouter(erreurs, `Google Fonts: ${nomBrut} italique`);
    }
  }
}

/* Polices prechargees (link rel=preload as=font) : seulement un woff2 de fonts.gstatic.com d une des trois
   familles, avec crossorigin (sans lui, le navigateur telecharge la police deux fois) */
const SLUGS_AUTORISES = new Set(['hubotsans', 'monasans', 'martianmono']);
function verifierPrechargements(html, erreurs) {
  const re = /<link\b[^>]*\brel=["']?preload["']?[^>]*>/gi;
  let m;
  while ((m = re.exec(html))) {
    const balise = m[0];
    if (!/\bas=["']?font\b/i.test(balise)) continue;
    const href = (balise.match(/\bhref=["']([^"']+)["']/i) || [])[1] || '';
    const slug = (href.match(/^https:\/\/fonts\.gstatic\.com\/s\/([a-z]+)\/v\d+\/[^/]+\.woff2$/) || [])[1];
    if (!slug) ajouter(erreurs, `preload police hors fonts.gstatic.com ou pas en woff2 : ${href}`);
    else if (!SLUGS_AUTORISES.has(slug)) ajouter(erreurs, `preload police : famille ${slug}`);
    if (!/\bcrossorigin\b/i.test(balise)) ajouter(erreurs, `preload police sans crossorigin : ${href}`);
    if (!/\btype=["']?font\/woff2/i.test(balise)) ajouter(erreurs, `preload police sans type font/woff2 : ${href}`);
  }
}

console.log('=== test:fonts : Hubot Sans 800 (largeur 75), Mona Sans 400 a 600, Martian Mono 400 a 600 (largeur 87,5)');
const fichiers = listerFichiers(SITE);
let fichiersRouges = 0;
for (const f of fichiers) {
  const texte = fs.readFileSync(f, 'utf8');
  const ext = path.extname(f).toLowerCase();
  const erreurs = new Map();
  for (const bloc of extraireCss(texte, ext)) verifierCss(bloc, erreurs);
  if (ext === '.html') { verifierGoogleFonts(texte, erreurs); verifierPrechargements(texte, erreurs); }
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
console.log(`  OK   ${fichiers.length} fichiers parcourus, seulement les trois familles, graisses et largeurs autorisees`);
console.log('\ntest:fonts VERT');
