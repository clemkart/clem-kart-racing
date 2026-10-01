/* ============================================================
   tests/run-typographie.js : la typographie francaise de scripts/typographie.js.

   1. Cas unitaires : espace insecable avant : ; ? ! et », apres «, entre un nombre
      et €, h, % ou une unite comptee (jours, pages, chapitres...), dans les milliers. Rien ne change dans les balises, les attributs,
      <script>, <style>, <pre>, <code>, ni dans une URL ou un email ecrit en clair.
   2. Idempotence : corriger deux fois donne le meme resultat (aucune double insecable).
   3. Si dist/ (et site-catalogue-dist/) existe : chaque page .html generee est deja
      corrigee (la corriger encore ne change rien).

   Aucune dependance.
   ============================================================ */
'use strict';

const fs = require('fs');
const path = require('path');
const { typographier } = require('../scripts/typographie');

const RACINE = path.resolve(__dirname, '..');
let ok = 0;
let echecs = 0;
function verifier(nom, condition, detail) {
  if (condition) { ok++; console.log('  OK   ' + nom); }
  else { echecs++; console.log('  FAIL ' + nom + (detail ? ' -> ' + detail : '')); }
}

console.log('=== test:typo, controle 1 : cas unitaires');
const CAS = [
  ['deux-points', 'Salut : ça va', 'Salut&nbsp;: ça va'],
  ['point-virgule', 'un ; deux', 'un&nbsp;; deux'],
  ['point d interrogation', 'Pourquoi ?', 'Pourquoi&nbsp;?'],
  ['point d exclamation', 'Allez !', 'Allez&nbsp;!'],
  ['guillemets avec espaces', '« texte »', '«&nbsp;texte&nbsp;»'],
  ['guillemets sans espace', '«texte»', '«&nbsp;texte&nbsp;»'],
  ['milliers', '1 000 pilotes', '1&nbsp;000 pilotes'],
  ['euro', '300 €', '300&nbsp;€'],
  ['milliers et euro', '1 000 €', '1&nbsp;000&nbsp;€'],
  ['plusieurs groupes de milliers', '130 489 198', '130&nbsp;489&nbsp;198'],
  ['heures', 'sous 72 h.', 'sous 72&nbsp;h.'],
  ['pourcent', '5 %', '5&nbsp;%'],
  ['heures en toutes lettres', '9 heures', '9&nbsp;heures'],
  ['annee suivie d un nombre : milliers intacts', 'en 2026 123 fois', 'en 2026 123&nbsp;fois'],
  ['jours', 'Garantie 7 jours.', 'Garantie 7&nbsp;jours.'],
  ['pages et chapitres', '59 pages, 13 chapitres', '59&nbsp;pages, 13&nbsp;chapitres'],
  ['singulier', '1 jour, 1 an, 1 page', '1&nbsp;jour, 1&nbsp;an, 1&nbsp;page'],
  ['mois, ans, minutes, questions', '6 mois, 8 ans, 10 minutes, 3 questions', '6&nbsp;mois, 8&nbsp;ans, 10&nbsp;minutes, 3&nbsp;questions'],
  ['mot qui commence comme une unite : intact', '3 moissons, 2 pagaies, 4 annees', '3 moissons, 2 pagaies, 4 annees'],
  ['unite dans un attribut : intacte', '<img alt="7 jours" src="a.jpg">', '<img alt="7 jours" src="a.jpg">'],
  ['attribut intact', '<a title="Oui ? Non : 1 000 €" href="/a?b=1">Lien</a>', '<a title="Oui ? Non : 1 000 €" href="/a?b=1">Lien</a>'],
  ['texte corrige, balise intacte', '<p class="x : y">Question ?</p>', '<p class="x : y">Question&nbsp;?</p>'],
  ['script intact', '<script>var a = b ? c : d;</script>', '<script>var a = b ? c : d;</script>'],
  ['style intact', '<style>a:hover { color : red ; }</style>', '<style>a:hover { color : red ; }</style>'],
  ['pre intact', '<pre>a : b ?</pre>', '<pre>a : b ?</pre>'],
  ['code intact', '<code>a : b</code>', '<code>a : b</code>'],
  ['URL en clair intacte', 'Voir https://exemple.fr/a?b=1 : ok', 'Voir https://exemple.fr/a?b=1&nbsp;: ok'],
  ['email en clair intact', 'moi@exemple.fr ; ok', 'moi@exemple.fr&nbsp;; ok'],
  ['commentaire intact sans option', '<!-- a : b -->', '<!-- a : b -->'],
];
for (const [nom, entree, attendu] of CAS) {
  const obtenu = typographier(entree);
  verifier(nom, obtenu === attendu, JSON.stringify(obtenu) + ' attendu ' + JSON.stringify(attendu));
}
verifier('commentaire retire avec l option', typographier('<p>a</p>\n<!-- note -->\n<p>b</p>', { retirerCommentaires: true }) === '<p>a</p>\n<p>b</p>');
verifier('commentaire conditionnel garde', typographier('<!--[if mso]><p>x</p><![endif]-->', { retirerCommentaires: true }).startsWith('<!--[if mso]>'));

console.log('\n=== test:typo, controle 2 : idempotence');
for (const [nom, entree] of CAS) {
  const une = typographier(entree);
  verifier('deux passes = une passe : ' + nom, typographier(une) === une, JSON.stringify(typographier(une)));
}
const DEJA = ['«&nbsp;oui&nbsp;»', 'a&nbsp;: b', '16&nbsp;€', '1&nbsp;000', 'a\u00a0: b', '«\u00a0oui\u00a0»', 'a\u202f?'];
for (const t of DEJA) verifier('deja insecable, inchange : ' + JSON.stringify(t), typographier(t) === t, JSON.stringify(typographier(t)));

console.log('\n=== test:typo, controle 3 : pages generees deja corrigees');
function listerHtml(dossier, resultat = []) {
  if (!fs.existsSync(dossier)) return resultat;
  for (const e of fs.readdirSync(dossier, { withFileTypes: true })) {
    const p = path.join(dossier, e.name);
    if (e.isDirectory()) listerHtml(p, resultat);
    else if (e.isFile() && e.name.toLowerCase().endsWith('.html')) resultat.push(p);
  }
  return resultat;
}
const pages = ['dist', 'site-catalogue-dist'].flatMap((d) => listerHtml(path.join(RACINE, d)));
if (!pages.length) {
  console.log('  (dist/ absent : lance « node scripts/build.js » pour controler les pages)');
} else {
  const fautives = pages.filter((p) => {
    const html = fs.readFileSync(p, 'utf8');
    return typographier(html) !== html;
  });
  verifier(pages.length + ' pages generees, toutes corrigees', fautives.length === 0, fautives.map((p) => path.relative(RACINE, p)).join(', '));
}

console.log(echecs ? `\ntest:typo ROUGE (${echecs} echec(s), ${ok} OK)` : `\ntest:typo VERT (${ok} OK)`);
process.exit(echecs ? 1 : 0);
