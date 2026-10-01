/* ============================================================
   tests/run-prix.js : le test qui bloque la mise en ligne.

   1. Echoue si un prix, un lien Stripe, un lien Gumroad ou gmail.com
      apparait dans les sources publiees ("site v2/", "site-catalogue/",
      les fonctions) ailleurs que dans config/offres.json.
   2. Echoue si une balise {{ reste dans dist/ (et site-catalogue-dist/ s il existe)
      apres le build.
   3. Echoue si un PDF ou un tableur envoye (fichiers .pdf et .xlsx des sources)
      porte un lien Gumroad ou Stripe : ils ne portent que l adresse du site.
   4. Echoue si une page generee, _redirects ou _headers mene a un prix lecteur.
   5. Echoue si le depot contient l adresse ou le nom d un fichier payant du site 2,
      ou si un fichier payant publie n a pas noindex et no-referrer.
   6. Echoue si l extrait PDF ou le tableur envoyes aux prospects sont invalides,
      portent un prix ou un lien ailleurs que vers la page /guide avec UTM.

   Aucune dependance. Sortie : nombre d occurrences par fichier et par motif.
   ============================================================ */
'use strict';

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const RACINE = path.resolve(__dirname, '..');
const SOURCES = ['site v2', 'site-catalogue'];
const DIST = ['dist', 'site-catalogue-dist'];
const EXT_TEXTE = new Set(['.html', '.js', '.css', '.txt', '.xml', '.json', '.svg', '.toml', '.sql']);
const DOSSIERS_IGNORES = new Set(['node_modules', '.claude', 'dist', 'site-catalogue-dist']);

/* Motifs delimites : « 9,99 » ne matche pas « 29,99 » ; « 150 » seulement suivi de € ou euros */
const MOTIFS = [
  { nom: '16,99', re: /16,99/g },
  { nom: '29,99', re: /29,99/g },
  { nom: '22,99', re: /22,99/g },
  { nom: '9,99', re: /(^|[^0-9])9,99/g },
  { nom: '150 €', re: /150[\s  ]*(€|euros)/g },
  { nom: 'buy.stripe.com', re: /buy\.stripe\.com/g },
  { nom: 'gumroad.com/l/', re: /gumroad\.com\/l\//g },
  { nom: 'gmail.com', re: /gmail\.com/g },
];

function listerFichiers(dossier, resultat = []) {
  if (!fs.existsSync(dossier)) return resultat;
  for (const e of fs.readdirSync(dossier, { withFileTypes: true })) {
    const p = path.join(dossier, e.name);
    if (e.isDirectory()) { if (!DOSSIERS_IGNORES.has(e.name)) listerFichiers(p, resultat); continue; }
    if (e.isFile() && EXT_TEXTE.has(path.extname(e.name).toLowerCase())) resultat.push(p);
  }
  return resultat;
}

function compter(texte, re) {
  re.lastIndex = 0;
  let n = 0;
  while (re.exec(texte)) n++;
  return n;
}

let echecs = 0;

/* ---------- 1. Sources ---------- */
console.log('=== test:prix, controle 1 : aucun prix ni lien en dur dans les sources');
const fichiers = SOURCES.flatMap((d) => listerFichiers(path.join(RACINE, d)));
let totalOccurrences = 0;
const rapport = [];
for (const f of fichiers) {
  const texte = fs.readFileSync(f, 'utf8');
  const trouves = [];
  for (const m of MOTIFS) {
    const n = compter(texte, m.re);
    if (n) trouves.push(`${m.nom} x${n}`), totalOccurrences += n;
  }
  if (trouves.length) rapport.push(`  FAIL ${path.relative(RACINE, f)} : ${trouves.join(', ')}`);
}
if (rapport.length) {
  rapport.forEach((l) => console.log(l));
  console.log(`  -> ${rapport.length} fichier(s), ${totalOccurrences} occurrence(s). Remplace chaque valeur par une balise {{...}} lue dans config/offres.json.`);
  echecs += rapport.length;
} else {
  console.log(`  OK   ${fichiers.length} fichiers sources parcourus, aucune valeur en dur`);
}

/* ---------- 2. Fichiers generes ---------- */
console.log('\n=== test:prix, controle 2 : aucune balise {{ dans les fichiers generes');
const distPresent = fs.existsSync(path.join(RACINE, DIST[0]));
if (!distPresent) {
  console.log('  FAIL dist/ absent : lance « node scripts/build.js » avant ce test');
  echecs++;
} else {
  const generes = DIST.flatMap((d) => listerFichiers(path.join(RACINE, d)));
  const restes = [];
  for (const f of generes) {
    const texte = fs.readFileSync(f, 'utf8');
    const balises = texte.match(/\{\{[^{}]*\}\}/g);
    if (balises) restes.push(`  FAIL ${path.relative(RACINE, f)} : ${[...new Set(balises)].slice(0, 5).join(', ')}`);
  }
  if (restes.length) { restes.forEach((l) => console.log(l)); echecs += restes.length; }
  else console.log(`  OK   ${generes.length} fichiers generes parcourus, aucune balise restante`);
}

/* ---------- 3. Pieces jointes (PDF, XLSX) ---------- */
console.log('\n=== test:prix, controle 3 : aucun lien de vente dans les PDF et les tableurs envoyes');
const LIENS_VENTE = /gumroad\.com|buy\.stripe\.com/;

/* Lit les entrees d un .xlsx (un zip) sans dependance : repertoire central, puis chaque entree */
function entreesZip(tampon) {
  const fin = tampon.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  if (fin < 0) throw new Error('zip illisible');
  const nombre = tampon.readUInt16LE(fin + 10);
  let pos = tampon.readUInt32LE(fin + 16);
  const entrees = [];
  for (let i = 0; i < nombre; i++) {
    const methode = tampon.readUInt16LE(pos + 10);
    const taille = tampon.readUInt32LE(pos + 20);
    const lNom = tampon.readUInt16LE(pos + 28);
    const lExtra = tampon.readUInt16LE(pos + 30);
    const lComm = tampon.readUInt16LE(pos + 32);
    const local = tampon.readUInt32LE(pos + 42);
    const nom = tampon.toString('utf8', pos + 46, pos + 46 + lNom);
    const debut = local + 30 + tampon.readUInt16LE(local + 26) + tampon.readUInt16LE(local + 28);
    const brut = tampon.subarray(debut, debut + taille);
    entrees.push({ nom, contenu: methode === 8 ? zlib.inflateRawSync(brut) : brut });
    pos += 46 + lNom + lExtra + lComm;
  }
  return entrees;
}

function listerBinaires(dossier, resultat = []) {
  if (!fs.existsSync(dossier)) return resultat;
  for (const e of fs.readdirSync(dossier, { withFileTypes: true })) {
    const q = path.join(dossier, e.name);
    if (e.isDirectory()) { if (!DOSSIERS_IGNORES.has(e.name)) listerBinaires(q, resultat); continue; }
    if (e.isFile() && ['.pdf', '.xlsx'].includes(path.extname(e.name).toLowerCase())) resultat.push(q);
  }
  return resultat;
}

const binaires = listerBinaires(path.join(RACINE, 'site v2'));
const fautifs = [];
for (const f of binaires) {
  const tampon = fs.readFileSync(f);
  let textes;
  try {
    textes = f.toLowerCase().endsWith('.xlsx') ? entreesZip(tampon).map((e) => e.contenu.toString('latin1')) : [tampon.toString('latin1')];
  } catch (e) {
    fautifs.push(`  FAIL ${path.relative(RACINE, f)} : illisible (${e.message})`);
    continue;
  }
  if (textes.some((t) => LIENS_VENTE.test(t))) fautifs.push(`  FAIL ${path.relative(RACINE, f)} : lien Gumroad ou Stripe dans le fichier`);
}
if (fautifs.length) { fautifs.forEach((l) => console.log(l)); echecs += fautifs.length; }
else console.log(`  OK   ${binaires.length} PDF et tableurs parcourus, aucun lien de vente`);

const OFFRES = JSON.parse(fs.readFileSync(path.join(RACINE, 'config', 'offres.json'), 'utf8'));

/* ---------- 4. Aucun lien de rattrapage sur une page publique ---------- */
/* Les prix lecteur (guide et debrief) sont reserves aux acheteurs : seule leur page de
   confirmation Stripe porte ces portes. Aucune page generee ne doit y renvoyer. */
console.log('\n=== test:prix, controle 4 : aucune page publique ne renvoie vers les prix lecteur');
const eq = OFFRES.equitable || {};
const PORTES_LECTEUR = [
  eq.guide_lecteur && eq.guide_lecteur.aller,
  eq.debrief_lecteur && eq.debrief_lecteur.aller,
  eq.debrief_lecteur && eq.debrief_lecteur.aller_alias,
  '/aller/guide-lecteur', '/aller/onboard-lecteur', '/aller/debrief-lecteur',
].filter(Boolean);
const echapperRe = (t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const RE_PORTES = new RegExp('(' + [...new Set(PORTES_LECTEUR)].map(echapperRe).join('|') + ')(?![a-z0-9-])', 'i');
if (distPresent) {
  /* Les pages, et aussi _redirects et _headers : une porte ecrite la serait tout aussi publique */
  const generes = DIST.flatMap((d) => listerFichiers(path.join(RACINE, d))
    .concat(['_redirects', '_headers'].map((n) => path.join(RACINE, d, n)).filter((p) => fs.existsSync(p))));
  const lecteur = generes.filter((f) => RE_PORTES.test(fs.readFileSync(f, 'utf8')));
  if (lecteur.length) {
    lecteur.forEach((f) => console.log(`  FAIL ${path.relative(RACINE, f)} : ${fs.readFileSync(f, 'utf8').match(RE_PORTES)[0]}`));
    echecs += lecteur.length;
  } else {
    console.log(`  OK   ${generes.length} fichiers generes, aucune porte ${[...new Set(PORTES_LECTEUR)].join(', ')}`);
  }
} else {
  console.log('  FAIL dist/ absent : lance « node scripts/build.js » avant ce test');
  echecs++;
}

/* ---------- 5. Aucune adresse des fichiers payants dans le depot ---------- */
/* Le depot GitHub est public : l adresse du PDF du guide et du tableau acheteurs ne vit que
   sur la page de confirmation Stripe. Fichiers suivis par git ET fichiers nouveaux pas encore
   ignores (ils seraient commites au prochain « git add »). Les binaires sont lus aussi.
   a. Toujours (Netlify compris) : aucune adresse http d un .pdf ou d un .xlsx du site 2.
   b. Si le fichier local fichiers-payants.json est la (machine de Clement, meme chemin que
      scripts/build.js) : aucun fichier du depot ne contient ni ne porte le NOM d un fichier
      payant, source ou publie, meme sans adresse autour. Les noms ne sont jamais ecrits ici. */
console.log('\n=== test:prix, controle 5 : aucune adresse des fichiers payants dans le depot');
const TAILLE_MAX = 30 * 1024 * 1024;
const RE_URL_SITE2_PAYANTE = new RegExp(echapperRe(OFFRES.sites.site2.replace(/^https?:\/\//, '')) + '\\/[^\\s"\'<>()]*\\.(pdf|xlsx)(?![a-z0-9])', 'i');

/* Sur n importe quel hote (site 1, domaine futur, Netlify, Supabase...) : aucune adresse http
   d un PDF « guide... » ni d un tableur « tableau... » (le PDF payant et le tableau acheteurs).
   L extrait gratuit (extrait-...) et le tableur gratuit (tableur-...) ne sont pas vises. */
const RE_URL_PAYANTE_TOUT_HOTE = /https?:\/\/[^\s"'<>()]*\/(guide|tableau)[a-z0-9._-]*\.(pdf|xlsx)(?![a-z0-9])/i;

function nomsPayantsLocaux() {
  const dossier = process.env.SITE2_FICHIERS_DIR || 'C:/Users/cleme/Documents/2026/IA/Business 2026/Digital product/site-v2';
  const fichier = process.env.SITE2_FICHIERS_PAYANTS || path.join(dossier, 'fichiers-payants.json');
  if (!fs.existsSync(fichier)) return [];
  let liste;
  try { liste = JSON.parse(fs.readFileSync(fichier, 'utf8')).fichiers; } catch (e) {
    console.log('  FAIL fichiers-payants.json illisible (' + e.message + ')');
    echecs++;
    return [];
  }
  return [...new Set((Array.isArray(liste) ? liste : []).flatMap((f) => [f && f.source, f && f.publie]).filter((n) => typeof n === 'string' && n.length >= 8))];
}
const NOMS_PAYANTS = nomsPayantsLocaux();
const RE_NOM_PAYANT = NOMS_PAYANTS.length
  ? new RegExp('(?<![A-Za-z0-9._-])(' + NOMS_PAYANTS.map(echapperRe).join('|') + ')(?![A-Za-z0-9])', 'i')
  : null;
console.log(RE_NOM_PAYANT
  ? `  (fichier local lu : ${NOMS_PAYANTS.length} noms de fichiers payants cherches, sans les afficher)`
  : '  (pas de fichier local fichiers-payants.json ici : seules les adresses du site 2 sont cherchees)');

function fichiersDuDepot() {
  const { spawnSync } = require('child_process');
  const r = spawnSync('git', ['ls-files', '-z', '--cached', '--others', '--exclude-standard'], { cwd: RACINE, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  if (r.status === 0 && r.stdout) return { source: 'git', liste: r.stdout.split('\0').filter(Boolean).map((f) => path.join(RACINE, f)) };
  /* Sans git (archive telechargee) : tout le dossier, hors dossiers generes */
  const tout = [];
  (function parcourir(d) {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      if (['.git', 'node_modules', 'dist', 'site-catalogue-dist', '.claude'].includes(e.name)) continue;
      const p = path.join(d, e.name);
      if (e.isDirectory()) parcourir(p); else if (e.isFile()) tout.push(p);
    }
  }(RACINE));
  return { source: 'dossier', liste: tout };
}

const depot = fichiersDuDepot();
const fuites = [];
let lus = 0;
for (const f of depot.liste) {
  let tampon;
  try {
    if (fs.statSync(f).size > TAILLE_MAX) continue;
    tampon = fs.readFileSync(f);
  } catch (e) { continue; }
  lus++;
  const rel = path.relative(RACINE, f);
  if (RE_NOM_PAYANT && RE_NOM_PAYANT.test(path.basename(f))) {
    fuites.push(`  FAIL ${path.dirname(rel)} : un fichier payant du site 2 serait commite (ajoute-le a .gitignore ou deplace-le)`);
    continue;
  }
  const textes = [tampon.toString('latin1')];
  if (/\.(xlsx|docx|pptx)$/i.test(f)) {
    try { entreesZip(tampon).forEach((e) => textes.push(e.contenu.toString('latin1'))); } catch (e) { /* zip illisible : le texte brut suffit */ }
  }
  if (textes.some((t) => RE_URL_SITE2_PAYANTE.test(t))) fuites.push(`  FAIL ${rel} : adresse d un .pdf ou .xlsx du site 2`);
  else if (textes.some((t) => RE_URL_PAYANTE_TOUT_HOTE.test(t))) fuites.push(`  FAIL ${rel} : adresse http du PDF du guide ou du tableau acheteurs`);
  else if (RE_NOM_PAYANT && textes.some((t) => RE_NOM_PAYANT.test(t))) fuites.push(`  FAIL ${rel} : nom d un fichier payant du site 2`);
}
if (fuites.length) {
  fuites.forEach((l) => console.log(l));
  console.log('  -> Retire l adresse ou le nom : ils ne vivent que dans le fichier local et sur la page de confirmation Stripe.');
  echecs += fuites.length;
} else {
  console.log(`  OK   ${lus} fichiers du depot lus (${depot.source}), aucune adresse ni aucun nom du PDF ou du tableau acheteurs`);
}

/* Site 2 genere : chaque fichier payant porte noindex et aucun Referer (_headers), et aucun
   .pdf ni .xlsx n y est publie hors de la liste locale */
if (fs.existsSync(path.join(RACINE, 'site-catalogue-dist'))) {
  const d2 = path.join(RACINE, 'site-catalogue-dist');
  const entetes = fs.existsSync(path.join(d2, '_headers')) ? fs.readFileSync(path.join(d2, '_headers'), 'utf8') : '';
  const payantsPublies = fs.readdirSync(d2).filter((n) => /\.(pdf|xlsx)$/i.test(n));
  const sansEntete = payantsPublies.filter((n) => {
    const bloc = entetes.split(/\n(?=\/)/).find((b) => b.startsWith('/' + n + '\n'));
    return !bloc || !/X-Robots-Tag: noindex, nofollow/.test(bloc) || !/Referrer-Policy: no-referrer/.test(bloc);
  });
  const horsListe = RE_NOM_PAYANT ? payantsPublies.filter((n) => !NOMS_PAYANTS.includes(n)) : [];
  if (sansEntete.length || horsListe.length) {
    if (sansEntete.length) console.log(`  FAIL site-catalogue-dist/_headers : ${sansEntete.length} fichier(s) payant(s) sans noindex ni no-referrer`);
    if (horsListe.length) console.log(`  FAIL site-catalogue-dist : ${horsListe.join(', ')} publie hors de fichiers-payants.json`);
    echecs += sansEntete.length + horsListe.length;
  } else {
    console.log(`  OK   site-catalogue-dist : ${payantsPublies.length} fichier(s) payant(s), tous en noindex et sans Referer`);
  }
  /* scripts/build.js --site2 refuse deja un nom previsible, sauf l ancienne adresse du PDF
     ("transition": true, deja donnee a des clients, gardee jusqu au lot 3) : on le rappelle ici */
  const previsibles = payantsPublies.filter((n) => !/^(guide-[0-9a-f]{32}\.pdf|tableau-[0-9a-f]{32}\.xlsx)$/.test(n));
  if (previsibles.length) {
    console.log(`  ATTENTION site-catalogue-dist : ${previsibles.length} fichier(s) payant(s) sous un nom previsible, telechargeable(s) sans payer une fois publie(s)`);
  }
}

/* ---------- 6. Fichiers envoyes aux prospects ---------- */
/* L extrait PDF et le tableur gratuit partent en piece jointe (send-email.js) et ne se mettent
   jamais a jour chez ceux qui les ont recus : fichier valide, liens vers la page /guide du site
   avec un UTM, aucun prix dans le tableur, aucun emoji dans les noms d onglets. */
console.log('\n=== test:prix, controle 6 : extrait PDF et tableur envoyes aux prospects');
const PAGE_GUIDE = OFFRES.sites.site1 + OFFRES.routes.guide;
const PROSPECTS = [
  { fichier: 'site v2/extrait-comprendre-comment-rouler-plus-vite.pdf', type: 'pdf' },
  { fichier: 'site v2/tableur-reglages-kart-v2.xlsx', type: 'xlsx' },
];
const EMOJI = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}]/u;
const PRIX_TEXTE = /\d+,\d\d\s*(€|&#8364;|euros)|16,99|29,99|22,99|9,99/;

function liensSortants(texte) {
  const brut = [...texte.matchAll(/\/URI\s*\(([^)]*)\)/g)].map((m) => m[1])
    .concat([...texte.matchAll(/Target="(https?:[^"]+)"/g)].map((m) => m[1].replace(/&amp;/g, '&')));
  return [...new Set(brut)];
}

for (const p of PROSPECTS) {
  const f = path.join(RACINE, p.fichier);
  const nom = p.fichier;
  if (!fs.existsSync(f)) { console.log(`  FAIL ${nom} : absent`); echecs++; continue; }
  const tampon = fs.readFileSync(f);
  const problemes = [];
  let liens = [];
  if (p.type === 'pdf') {
    const t = tampon.toString('latin1');
    if (!t.startsWith('%PDF-')) problemes.push('ne commence pas par %PDF-');
    if (!/%%EOF\s*$/.test(t)) problemes.push('pas de %%EOF final (fichier tronque)');
    liens = liensSortants(t);
  } else {
    let entrees = [];
    try { entrees = entreesZip(tampon); } catch (e) { problemes.push('zip illisible : ' + e.message); }
    const noms = entrees.map((e) => e.nom);
    ['[Content_Types].xml', 'xl/workbook.xml'].forEach((n) => { if (entrees.length && !noms.includes(n)) problemes.push(n + ' absent'); });
    const xml = entrees.filter((e) => /\.(xml|rels)$/.test(e.nom)).map((e) => ({ nom: e.nom, t: e.contenu.toString('utf8') }));
    xml.forEach(({ nom: n, t }) => {
      if (/^xl\/(sharedStrings|worksheets\/sheet\d+)\.xml$/.test(n) && PRIX_TEXTE.test(t)) problemes.push('prix dans ' + n + ' : ' + t.match(PRIX_TEXTE)[0]);
    });
    const classeur = xml.find((e) => e.nom === 'xl/workbook.xml');
    const onglets = classeur ? [...classeur.t.matchAll(/<sheet [^>]*name="([^"]*)"/g)].map((m) => m[1]) : [];
    if (onglets.some((o) => EMOJI.test(o))) problemes.push('emoji dans un nom d onglet : ' + onglets.join(', '));
    liens = liensSortants(xml.map((e) => e.t).join('\n'));
  }
  const mauvais = liens.filter((l) => !(l.startsWith(PAGE_GUIDE + '?') && /[?&]utm_source=/.test(l)));
  if (!liens.length) problemes.push('aucun lien vers ' + PAGE_GUIDE);
  if (mauvais.length) problemes.push('lien hors de ' + PAGE_GUIDE + '?utm_source=... : ' + mauvais.join(' '));
  if (problemes.length) { problemes.forEach((m) => console.log(`  FAIL ${nom} : ${m}`)); echecs += problemes.length; }
  else console.log(`  OK   ${nom} : valide, ${liens.length} lien(s) vers ${PAGE_GUIDE} avec UTM${p.type === 'xlsx' ? ', aucun prix, onglets sans emoji' : ''}`);
}

/* ---------- 7. Avant commit : liens Stripe de la config (avertissement) ---------- */
/* Le depot est public : seules les 2 portes publiques (guide, debrief) doivent y etre. Les liens
   des prix lecteur (equitable.*.stripe.url) ne vivent que sur la page de confirmation Stripe.
   Retirer ces 2 cles demande l accord de Clement : en attendant, avertissement seulement pour
   elles. Tout AUTRE lien Stripe ajoute dans la config fait echouer le test. */
console.log('\n=== test:prix, controle 7 : liens Stripe dans config/offres.json (depot public)');
const CLES_STRIPE_PUBLIQUES = ['guide.stripe.url', 'debrief.stripe.url'];
const CLES_STRIPE_A_RETIRER = ['equitable.guide_lecteur.stripe.url', 'equitable.debrief_lecteur.stripe.url'];
const clesStripe = [];
(function parcourir(o, chemin) {
  if (typeof o === 'string') { if (/buy\.stripe\.com/.test(o)) clesStripe.push(chemin); return; }
  if (o && typeof o === 'object') Object.keys(o).forEach((k) => parcourir(o[k], chemin ? chemin + '.' + k : k));
}(OFFRES, ''));
const enTrop = clesStripe.filter((c) => !CLES_STRIPE_PUBLIQUES.includes(c));
const inattendus = enTrop.filter((c) => !CLES_STRIPE_A_RETIRER.includes(c));
if (!enTrop.length) {
  console.log(`  OK   ${clesStripe.length} lien(s) Stripe, tous des portes publiques (${clesStripe.join(', ')})`);
} else if (process.env.PRIX_STRIPE_STRICT === '1' || inattendus.length) {
  const fautifs7 = process.env.PRIX_STRIPE_STRICT === '1' ? enTrop : inattendus;
  console.log(`  FAIL liens Stripe hors des portes publiques : ${fautifs7.join(', ')}`);
  echecs += fautifs7.length;
} else {
  console.log(`  ATTENTION ${enTrop.length} lien(s) Stripe reserves aux acheteurs dans un fichier qui partira sur GitHub : ${enTrop.join(', ')}`);
  console.log('  -> Avant le commit, avec l accord de Clement : retirer ces cles (les garder dans un fichier local ignore par git).');
  console.log('     Controle bloquant : PRIX_STRIPE_STRICT=1 npm run test:prix');
}

console.log(echecs ? `\ntest:prix ROUGE (${echecs} probleme(s))` : '\ntest:prix VERT');
process.exit(echecs ? 1 : 0);
