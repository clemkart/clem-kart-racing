#!/usr/bin/env node
/* ============================================================
   Clem Kart Racing : scripts/build.js (Node, aucune dependance)

   1. Lit config/offres.json (seul point de verite des prix, liens, delais...).
   2. Copie "site v2/" vers "dist/" en remplacant, dans les fichiers texte,
      {{partial:nom}} par site v2/_partials/nom.html et {{chemin.dans.le.json}}
      par la valeur de la config. Echoue si une balise reste.
   3. Ecrit dist/_redirects : portes /aller/guide et /aller/onboard (302 vers Stripe),
      pages pas encore construites (/onboard/ sur le site 2, /clement), anciennes
      adresses du consulting en piste (journee.anciennes_routes, 301 vers /consulting),
      anciennes adresses (forcees). Aucune porte « lecteur » : les prix reduits ne vivent que sur
      la page de confirmation Stripe, qui pointe directement vers buy.stripe.com.
      /cgv et /confidentialite sont de vraies pages (cgv.html, confidentialite.html) :
      Netlify les sert sans .html, aucune redirection. Les .html passent par
      scripts/typographie.js (espaces insecables francaises sur le texte).
   4. --site2 : meme chose pour "site-catalogue/" vers "site-catalogue-dist/",
      accueil redirige vers le site 1, puis copie le PDF du guide et le tableau
      acheteurs depuis le dossier local. Leurs noms (source et nom publie) ne sont
      PAS dans le depot : ils sont lus dans fichiers-payants.json, fichier local
      jamais suivi par git (voir lireFichiersPayants). _headers : noindex et
      aucun Referer sur ces fichiers.
   Le build echoue si une balise reste, si une cle manque, si une valeur
   injectee laisse un href ou un src vide, ou si elle contient " ' < > (qui
   casseraient un attribut ou une chaine JS : utiliser les signes typographiques).

   Usage : node scripts/build.js [--site2] [--silencieux]
   ============================================================ */
'use strict';

const fs = require('fs');
const path = require('path');
const { typographier } = require('./typographie');

const RACINE = path.resolve(__dirname, '..');
const CONFIG = path.join(RACINE, 'config', 'offres.json');
const SITE1_SRC = path.join(RACINE, 'site v2');
const SITE1_DIST = path.join(RACINE, 'dist');
const SITE2_SRC = path.join(RACINE, 'site-catalogue');
const SITE2_DIST = path.join(RACINE, 'site-catalogue-dist');
const PARTIALS = path.join(SITE1_SRC, '_partials');

/* Fichiers payants du site 2 : ils ne vivent pas dans le depot, et leurs noms non plus.
   Le dossier local (SITE2_FICHIERS_DIR pour changer de machine) contient les fichiers et
   fichiers-payants.json (SITE2_FICHIERS_PAYANTS pour un autre chemin) :
     { "fichiers": [ { "source": "<nom dans le dossier>", "publie": "<nom en ligne>" }, ... ] }
   Le nom publie est imprevisible : guide- ou tableau- suivi de 32 caracteres hexadecimaux
   (NOM_PUBLIE_IMPREVISIBLE). C est lui que porte la page de confirmation Stripe. Tout autre nom
   fait echouer le build : un nom qu on devine depuis celui de l extrait gratuit donnerait le
   guide sans payer. Seule exception, voulue et visible : une entree marquee "transition": true,
   l ancienne adresse deja donnee a des clients, gardee jusqu a la livraison protegee du lot 3,
   avec un avertissement a chaque build (SITE2_RETIRER_TRANSITION=1 la retire).
   Il faut au moins un .pdf (le guide) et un .xlsx (le tableau acheteurs), a nom imprevisible. */
const SITE2_FICHIERS_DIR = process.env.SITE2_FICHIERS_DIR
  || 'C:/Users/cleme/Documents/2026/IA/Business 2026/Digital product/site-v2';
const SITE2_FICHIERS_PAYANTS = process.env.SITE2_FICHIERS_PAYANTS
  || path.join(SITE2_FICHIERS_DIR, 'fichiers-payants.json');
const NOM_FICHIER_SUR = /^[A-Za-z0-9][A-Za-z0-9._-]*\.(pdf|xlsx)$/;
const NOM_PUBLIE_IMPREVISIBLE = /^(guide-[0-9a-f]{32}\.pdf|tableau-[0-9a-f]{32}\.xlsx)$/;
const RETIRER_TRANSITION = process.env.SITE2_RETIRER_TRANSITION === '1';
/* Site 2 : aucun .pdf ni .xlsx copie depuis "site-catalogue/" (un fichier payant pose la par
   erreur partirait en ligne sous son vrai nom) ; ils ne viennent que de fichiers-payants.json */
const EXT_PAYANTES = new Set(['.pdf', '.xlsx']);

/* Fichiers texte ou l injection s applique */
const EXT_TEXTE = new Set(['.html', '.js', '.css', '.txt', '.xml', '.json']);
/* Jamais copie vers dist : partials, notes, code des fonctions (bundle par Netlify depuis la source), schemas SQL, temporaires */
const DOSSIERS_EXCLUS = new Set(['_partials', 'netlify', 'supabase', 'node_modules', '.claude']);
const EXT_EXCLUES = new Set(['.md', '.tmp']);
/* Pages retirees (Race Engineer AI) : jamais copiees, meme si elles reviennent dans les sources */
/* tableur-reglages-kart.xlsx : ancienne version du tableur gratuit (onglets avec emoji), plus
   envoyee ni liee nulle part (send-email.js envoie la v2) */
const FICHIERS_EXCLUS = new Set(['app-preview.html', 'merci-fondateur.html', 'test_write.tmp', 'tableur-reglages-kart.xlsx']);

const BALISE = /\{\{\s*([^{}]+?)\s*\}\}/g;

const args = process.argv.slice(2);
const SITE2 = args.includes('--site2');
const SILENCIEUX = args.includes('--silencieux');
const log = (...m) => { if (!SILENCIEUX) console.log(...m); };

function echec(message) {
  console.error('\nBUILD ECHOUE : ' + message + '\n');
  process.exit(1);
}

/* ---------- Config ---------- */
function lireConfig() {
  let brut;
  try { brut = fs.readFileSync(CONFIG, 'utf8'); } catch (e) { echec('config/offres.json introuvable (' + e.message + ')'); }
  let cfg;
  try { cfg = JSON.parse(brut); } catch (e) { echec('config/offres.json invalide : ' + e.message); }

  /* Valeurs derivees : l adresse active du site (canonical, og:url, sitemap) */
  const actif = cfg.sites && cfg.sites.actif;
  if (!actif || !cfg.sites[actif]) echec('sites.actif doit designer une cle de sites (site1, site2 ou domaine)');
  cfg.sites.url = cfg.sites[actif];

  /* Ligne de faits selon l interrupteur */
  if (cfg.faits) cfg.faits.ligne = cfg.faits.afficher_titre ? cfg.faits.avec_titre : cfg.faits.sans_titre;

  /* Journee sur piste : sous-ligne selon le statut */
  if (cfg.journee) {
    cfg.journee.sous_ligne = cfg.journee.statut === 'ouverte' ? cfg.journee.sous_ligne_ouverte : cfg.journee.sous_ligne_liste_attente;
  }

  /* Extrait : textes selon la version */
  if (cfg.extrait) {
    const v3 = Number(cfg.extrait.version) >= 3;
    cfg.extrait.appel_courant = v3 ? cfg.extrait.appel_v3 : cfg.extrait.appel;
    cfg.extrait.promesse_courante = v3 ? cfg.extrait.promesse_v3 : cfg.extrait.promesse;
    cfg.extrait.bouton_courant = v3 ? cfg.extrait.bouton_v3 : cfg.extrait.bouton;
  }

  /* Garde-fous : les 2 liens Stripe des portes publiques existent. Les prix lecteur n ont
     pas de porte sur le site (page de confirmation Stripe seulement) : pas exiges ici. */
  const liens = [
    ['guide.stripe.url', cfg.guide && cfg.guide.stripe && cfg.guide.stripe.url],
    ['debrief.stripe.url', cfg.debrief && cfg.debrief.stripe && cfg.debrief.stripe.url],
  ];
  liens.forEach(([nom, url]) => {
    if (typeof url !== 'string' || !/^https:\/\/buy\.stripe\.com\//.test(url)) echec(nom + ' doit etre un lien https://buy.stripe.com/...');
  });
  return cfg;
}

function valeur(cfg, chemin) {
  return chemin.split('.').reduce((o, k) => (o != null && Object.prototype.hasOwnProperty.call(o, k) ? o[k] : undefined), cfg);
}

/* ---------- Injection ---------- */
/* Une valeur de la config part dans des attributs HTML (content, alt, href) et dans des
   chaines JS entre apostrophes : un guillemet ou une apostrophe droite les casserait en silence. */
const CARACTERES_INTERDITS = /["'<>]/;
const ATTRIBUT_VIDE = /\b(?:href|src|srcset|action)\s*=\s*(?:""|''|"\s+"|'\s+')/gi;
function compterAttributsVides(t) {
  return (t.match(ATTRIBUT_VIDE) || []).length;
}

const cachePartials = new Map();
function lirePartial(nom, fichier, cfg, pile) {
  if (pile.includes(nom)) echec('partial en boucle : ' + pile.concat(nom).join(' > '));
  if (!/^[a-z0-9_-]+$/i.test(nom)) echec('nom de partial invalide « ' + nom + ' » dans ' + fichier);
  const p = path.join(PARTIALS, nom + '.html');
  if (!fs.existsSync(p)) echec('partial introuvable : ' + path.relative(RACINE, p) + ' (demande par ' + fichier + ')');
  if (!cachePartials.has(p)) cachePartials.set(p, fs.readFileSync(p, 'utf8').replace(/\r\n/g, '\n').replace(/\n$/, ''));
  return injecter(cachePartials.get(p), cfg, path.relative(RACINE, p), pile.concat(nom));
}

function injecter(texte, cfg, fichier, pile = []) {
  const manquantes = [];
  const liensVides = [];
  const vides = [];
  const dangereuses = [];
  const resultat = texte.replace(BALISE, (tout, cle) => {
    if (cle.startsWith('partial:')) return lirePartial(cle.slice(8).trim(), fichier, cfg, pile);
    const v = valeur(cfg, cle);
    if (v === undefined || v === null || typeof v === 'object') { manquantes.push(cle); return tout; }
    if (String(v).trim() === '') vides.push(cle);
    if (CARACTERES_INTERDITS.test(String(v))) dangereuses.push(cle);
    return String(v);
  });
  if (dangereuses.length) {
    echec('valeur dangereuse dans ' + fichier + ' : ' + [...new Set(dangereuses)].map((m) => '{{' + m + '}}').join(', ')
      + '\nUne valeur injectee ne contient jamais " \' < ou > : utilise les guillemets « » et l apostrophe typographique.');
  }
  /* Une adresse vide dans un href ou un src donne un lien qui recharge la page : on refuse.
     On compare les attributs vides avant et apres injection, pour ne viser que ceux
     qu une valeur de la config a laisses vides (href="{{reseaux.facebook}}" par exemple). */
  if (vides.length) {
    const reference = texte.replace(BALISE, (tout, cle) => (cle.startsWith('partial:') ? lirePartial(cle.slice(8).trim(), fichier, cfg, pile) : 'x'));
    if (compterAttributsVides(resultat) > compterAttributsVides(reference)) liensVides.push(...vides);
  }
  if (liensVides.length) {
    echec('lien vide dans ' + fichier + ' : ' + [...new Set(liensVides)].map((m) => '{{' + m + '}}').join(', ')
      + '\nRemplis la cle dans config/offres.json, ou retire le lien de la page tant qu elle est vide.');
  }
  if (manquantes.length) {
    echec('balises sans valeur dans ' + fichier + ' : ' + [...new Set(manquantes)].map((m) => '{{' + m + '}}').join(', ')
      + '\nAjoute la cle dans config/offres.json (une valeur simple : texte, nombre ou booleen).');
  }
  const restantes = resultat.match(BALISE);
  if (restantes) echec('balises restantes dans ' + fichier + ' : ' + [...new Set(restantes)].join(', '));
  return resultat;
}

/* ---------- Copie ---------- */
function viderDossier(d) {
  fs.rmSync(d, { recursive: true, force: true });
  fs.mkdirSync(d, { recursive: true });
}

function copierArbre(src, dist, cfg, stats, exclure, sansPayants) {
  for (const entree of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entree.name);
    const d = path.join(dist, entree.name);
    if (entree.isDirectory()) {
      if (exclure && DOSSIERS_EXCLUS.has(entree.name)) { stats.exclus++; continue; }
      fs.mkdirSync(d, { recursive: true });
      copierArbre(s, d, cfg, stats, exclure, sansPayants);
      continue;
    }
    if (!entree.isFile()) continue;
    const ext = path.extname(entree.name).toLowerCase();
    if (exclure && (EXT_EXCLUES.has(ext) || FICHIERS_EXCLUS.has(entree.name))) { stats.exclus++; continue; }
    if (sansPayants && EXT_PAYANTES.has(ext)) { stats.exclus++; continue; }
    if (EXT_TEXTE.has(ext)) {
      const brut = fs.readFileSync(s, 'utf8');
      const rel = path.relative(RACINE, s);
      const injecte = brut.includes('{{') ? injecter(brut, cfg, rel) : brut;
      /* HTML : typographie francaise sur le texte, commentaires de travail retires */
      const sortie = ext === '.html' ? typographier(injecte, { retirerCommentaires: true }) : injecte;
      if (sortie !== brut) stats.injectes++;
      fs.writeFileSync(d, sortie, 'utf8');
    } else {
      fs.copyFileSync(s, d);
    }
    stats.fichiers++;
  }
}

/* ---------- _redirects du site 1 ---------- */
/* Une page pas encore construite dans les sources (lot 2 ou 3) : on redirige en attendant.
   Des que le dossier existe dans "site v2/", la regle disparait toute seule. */
function pageExiste(route) {
  const nom = route.replace(/^\/+|\/+$/g, '');
  return fs.existsSync(path.join(SITE1_SRC, nom, 'index.html')) || fs.existsSync(path.join(SITE1_SRC, nom + '.html'));
}

function ecrireRedirects(cfg, dist) {
  const r = cfg.routes;
  const lignes = [
    '# Genere par scripts/build.js : ne pas modifier a la main, changer config/offres.json.',
    '# Portes vers Stripe : seuls les boutons du site les appellent, jamais une bio, un DM, un email ou un PDF.',
    '# Netlify transmet la chaine de requete (?locale=fr, client_reference_id) au 302.',
    '# Aucune porte vers un prix lecteur : il n est visible que sur la page de confirmation Stripe.',
    `${cfg.guide.aller}  ${cfg.guide.stripe.url}  302`,
    `${cfg.debrief.aller}  ${cfg.debrief.stripe.url}  302`,
  ];

  /* /onboard/ vit sur le site 2 tant que la page n est pas dans "site v2/" (lot 3). 302 : temporaire. */
  if (!pageExiste(r.onboard)) {
    const onboard = r.onboard.replace(/\/$/, '');
    lignes.push('', '# Analyse d onboard : encore sur le site 2 (plan V4, section 3), la chaine de requete suit');
    lignes.push(`${onboard}  ${cfg.sites.site2}${onboard}/  302`);
    lignes.push(`${onboard}/*  ${cfg.sites.site2}${onboard}/:splat  302`);
  }
  /* /clement arrive au lot 2 : d ici la, la section « Qui je suis » de l accueil */
  if (!pageExiste(r.clement)) {
    lignes.push('', '# Page /clement pas encore construite (lot 2)');
    lignes.push(`${r.clement}  /#qui  302`);
  }
  /* Adresses que les marques tapent d instinct : elles menent au bon parcours de /marques
     tant qu aucune page propre n existe (302 : elles pourront devenir de vraies pages). */
  const versMarques = [[r.sponsors, '#saison'], [r.kit_media, '#reseaux'], ['/partenaires', '']]
    .filter(([route]) => route && !pageExiste(route));
  if (versMarques.length) {
    lignes.push('', '# Raccourcis pour les marques, vers les parcours de /marques');
    for (const [route, ancre] of versMarques) lignes.push(`${route}  ${r.marques}${ancre}  302`);
  }

  /* Consulting en piste : la page vit a routes.journee (/consulting). Les anciennes adresses
     (journee.anciennes_routes : /journee-piste, /consulting-technique), deja donnees en bio, en
     message ou en story, y menent en 301. Une ancienne adresse qui a encore sa page dans les sources
     fait echouer le build : Netlify servirait la page et ignorerait la redirection. */
  const anciennes = (cfg.journee && cfg.journee.anciennes_routes) || [];
  if (!Array.isArray(anciennes)) echec('journee.anciennes_routes doit etre une liste d adresses');
  if (anciennes.length) {
    lignes.push('', '# Consulting en piste : anciennes adresses vers la page (journee.anciennes_routes), 301');
    for (const ancienne of anciennes) {
      if (typeof ancienne !== 'string' || !/^\/[a-z0-9-]+$/.test(ancienne)) echec('journee.anciennes_routes : adresse simple attendue (/mots-en-minuscules), recu « ' + ancienne + ' »');
      if (ancienne === r.journee) echec('journee.anciennes_routes contient l adresse de la page elle-meme (' + ancienne + ') : la redirection tournerait en boucle');
      if (pageExiste(ancienne)) echec('journee.anciennes_routes : « ' + ancienne + ' » a encore une page dans « site v2/ ». Supprime-la, sinon la redirection est ignoree.');
      lignes.push(`${ancienne}  ${r.journee}  301`);
      lignes.push(`${ancienne}/  ${r.journee}  301`);
    }
  }

  /* /cgv et /confidentialite : vraies pages (cgv.html, confidentialite.html), servies sans .html
     par Netlify. Aucune regle ici, sinon une redirection masquerait la page. */
  lignes.push(
    '',
    '# Anciennes adresses : forcees (!) car certains fichiers existent encore, sinon Netlify les servirait',
    '/race-engineer-ai.html  /  301!',
    '/app-preview.html  /  301!',
    '/merci-fondateur.html  /  301!',
    `/merci.html  ${r.merci_guide}  301!`,
    `/guide.html  ${r.guide}  301!`,
    '',
  );
  fs.writeFileSync(path.join(dist, '_redirects'), lignes.join('\n'), 'utf8');
}

/* ---------- _redirects du site 2 ---------- */
/* Plan V4, section 6 : l accueil du site 2 renvoie vers l accueil du site 1 (sites.site1).
   /onboard/, le PDF, le tableau acheteurs et les images restent. */
function ecrireRedirectsSite2(cfg, dist) {
  const lignes = [
    '# Genere par scripts/build.js : ne pas modifier a la main, changer config/offres.json.',
    '# L accueil du site 2 renvoie vers le site 1. Force (!) : index.html existe encore comme repli.',
    `/  ${cfg.sites.site1}/  301!`,
    `/index.html  ${cfg.sites.site1}/  301!`,
    '',
  ];
  fs.writeFileSync(path.join(dist, '_redirects'), lignes.join('\n'), 'utf8');
}

/* Fichiers payants : jamais indexes, jamais en cache partage, et leur adresse ne part jamais
   vers un autre site dans le Referer */
function ecrireEntetesSite2(dist, publies) {
  const lignes = ['# Genere par scripts/build.js : fichiers payants du site 2 (noms lus dans le fichier local).'];
  for (const nom of publies) {
    lignes.push('/' + nom, '  X-Robots-Tag: noindex, nofollow', '  Referrer-Policy: no-referrer', '  Cache-Control: private, no-store');
  }
  lignes.push('');
  fs.writeFileSync(path.join(dist, '_headers'), lignes.join('\n'), 'utf8');
}

/* ---------- Site 2 : fichiers payants hors depot ---------- */
const AIDE_PAYANTS = '\nCree ce fichier local (jamais commite) : { "fichiers": [ { "source": "<nom du PDF dans le dossier>", "publie": "guide-<32 caracteres hexadecimaux>.pdf" },'
  + ' { "source": "<nom du tableau>", "publie": "tableau-<32 caracteres hexadecimaux>.xlsx" } ] }'
  + '\nDefinis SITE2_FICHIERS_DIR ou SITE2_FICHIERS_PAYANTS si le dossier a bouge.';

/* Un nom publie qu on peut deviner (ex. l ancien nom du PDF, deduit de celui de l extrait
   gratuit) : le build echoue, sauf transition assumee (voir SITE2_FICHIERS_DIR plus haut). */
function refuserNomPrevisible(f) {
  /* Entree "transition": true : l ancienne adresse du PDF, deja envoyee a des clients (page de
     confirmation Stripe et emails depuis le 14/09). La retirer casse leur lien : elle reste en ligne
     jusqu a la livraison protegee du lot 3 (liens signes), sauf SITE2_RETIRER_TRANSITION=1. */
  if (f.transition === true && !RETIRER_TRANSITION) {
    console.warn('\n  ATTENTION : ' + f.publie + ' reste publie sous son ancien nom (des clients ont deja ce lien).'
      + '\n  A retirer seulement quand la livraison protegee du lot 3 sera en ligne.\n');
    return;
  }
  echec('fichiers-payants.json : nom publie previsible (' + f.publie + ').'
    + '\nN importe qui pourrait deviner cette adresse et telecharger le fichier sans payer.'
    + '\nNom attendu : guide-<32 caracteres hexadecimaux>.pdf ou tableau-<32 caracteres hexadecimaux>.xlsx.'
    + '\nSeule exception : une ancienne adresse deja donnee a des clients, marquee "transition": true.');
}

function lireFichiersPayants() {
  let liste;
  try {
    liste = JSON.parse(fs.readFileSync(SITE2_FICHIERS_PAYANTS, 'utf8')).fichiers;
  } catch (e) {
    echec('liste des fichiers payants illisible : ' + SITE2_FICHIERS_PAYANTS + ' (' + e.message + ')' + AIDE_PAYANTS);
  }
  if (!Array.isArray(liste) || !liste.length) echec('fichiers-payants.json : « fichiers » doit etre une liste non vide' + AIDE_PAYANTS);
  const publies = new Set();
  for (const f of liste) {
    if (!f || !NOM_FICHIER_SUR.test(String(f.source)) || !NOM_FICHIER_SUR.test(String(f.publie))) {
      echec('fichiers-payants.json : entree invalide (noms simples en .pdf ou .xlsx, sans dossier)' + AIDE_PAYANTS);
    }
    if (path.extname(f.source).toLowerCase() !== path.extname(f.publie).toLowerCase()) echec('fichiers-payants.json : un nom publie ne garde pas l extension de sa source');
    if (publies.has(f.publie)) echec('fichiers-payants.json : nom publie en double');
    if (!NOM_PUBLIE_IMPREVISIBLE.test(f.publie)) refuserNomPrevisible(f);
    publies.add(f.publie);
  }
  ['.pdf', '.xlsx'].forEach((ext) => {
    if (!liste.some((f) => NOM_PUBLIE_IMPREVISIBLE.test(f.publie) && f.publie.endsWith(ext))) echec('fichiers-payants.json : aucun fichier ' + ext + ' (le PDF du guide et le tableau acheteurs sont obligatoires)' + AIDE_PAYANTS);
  });
  return liste;
}

function copierFichiersSite2(dist) {
  const liste = lireFichiersPayants();
  for (const f of liste) {
    const src = path.join(SITE2_FICHIERS_DIR, f.source);
    if (!fs.existsSync(src) || fs.statSync(src).size === 0) {
      echec('fichier payant du site 2 absent ou vide dans le dossier local (' + SITE2_FICHIERS_DIR + ')\nDefinis SITE2_FICHIERS_DIR si le dossier a bouge.');
    }
    fs.copyFileSync(src, path.join(dist, f.publie));
  }
  const publies = liste.map((f) => f.publie);
  const absents = publies.filter((n) => !fs.existsSync(path.join(dist, n)) || fs.statSync(path.join(dist, n)).size === 0);
  if (absents.length) echec('site-catalogue-dist incomplet : ' + absents.length + ' fichier(s) payant(s) absent(s) ou vide(s)');
  ecrireEntetesSite2(dist, publies);
  log('  ' + publies.length + ' fichiers payants publies (noms lus dans le fichier local), _headers ecrit');
}

/* ---------- Programme ---------- */
function construire(src, dist, cfg, { exclure, redirects, fichiersSite2 }) {
  if (!fs.existsSync(src)) echec('dossier source introuvable : ' + src);
  viderDossier(dist);
  const stats = { fichiers: 0, injectes: 0, exclus: 0 };
  copierArbre(src, dist, cfg, stats, exclure, fichiersSite2);
  if (redirects === 'site1') ecrireRedirects(cfg, dist);
  if (redirects === 'site2') ecrireRedirectsSite2(cfg, dist);
  if (fichiersSite2) copierFichiersSite2(dist);
  log(`  ${path.relative(RACINE, src)} -> ${path.relative(RACINE, dist)} : ${stats.fichiers} fichiers copies, ${stats.injectes} injectes, ${stats.exclus} exclus`);
}

const debut = Date.now();
const cfg = lireConfig();
log('Config : ' + path.relative(RACINE, CONFIG) + ' (version ' + cfg.version + ', mise a jour ' + cfg.mis_a_jour + ', site actif : ' + cfg.sites.actif + ')');

log('Site 1');
construire(SITE1_SRC, SITE1_DIST, cfg, { exclure: true, redirects: 'site1', fichiersSite2: false });

if (SITE2) {
  log('Site 2');
  construire(SITE2_SRC, SITE2_DIST, cfg, { exclure: true, redirects: 'site2', fichiersSite2: true });
}

log('Build termine en ' + (Date.now() - debut) + ' ms');
