// Harnais de test de la fonction demande (formulaires /consulting et /marques).
// Brevo est remplace par un faux fetch qui enregistre les appels : aucun email reel ne part.
// Lancer : node tests/run-demande.js
'use strict';

process.env.BREVO_API_KEY = 'test-key';
delete process.env.BREVO_DEMANDE_LIST_ID;

const path = require('path');
const FN = path.join(__dirname, '..', 'site v2', 'netlify', 'functions', 'demande.js');
// Seul point de verite : les tests lisent la config, jamais une adresse ou un prix en dur.
const OFFRES = require(path.join(__dirname, '..', 'config', 'offres.json'));
const SITE_PUBLIC = OFFRES.sites[OFFRES.sites.actif];
const ESPACES = /[\u00a0\u202f ]/g;
const normal = (s) => s.replace(/&nbsp;|&#8239;/g, ' ').replace(ESPACES, ' ');
// Prix des autres offres : jamais dans un accuse de reception. Le prix du consulting, lui,
// figure dans l accuse du consulting (journee.statut = ouverte).
const PRIX_AUTRES = [
  OFFRES.guide.prix_affiche,
  OFFRES.debrief.prix_affiche,
  OFFRES.equitable.debrief_lecteur.prix_affiche,
  OFFRES.equitable.guide_lecteur.prix_affiche,
].map((p) => p.replace(ESPACES, ' '));
// Interdits absolus : tiret cadratin, demi-cadratin, emoji, liens de vente.
const TIRETS = /[\u2013\u2014]/;
const EMOJI = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}]/u;
const VENTE_DIRECTE = /gumroad\.com|buy\.stripe\.com/;
// Titres qui designent un educateur sportif : jamais pour decrire Clement, ni sur la page du
// consulting, ni dans l accuse de reception (decision de Clement du 01/10/2026, seule precaution
// gardee). \p{L} et non \b : \b ignore les lettres accentuees.
const TITRES = /(?<!\p{L})(coach\p{L}*|entra[iî]neu[rs]\p{L}*|moniteu[rs]\p{L}*|[ée]ducat(eur|rice)\p{L}*|professeu[rs]\p{L}*)(?!\p{L})/iu;

let calls = [];
let responder = () => ({ ok: true, status: 200 });

global.fetch = async (url, opts = {}) => {
  const body = opts.body ? JSON.parse(opts.body) : null;
  calls.push({ url, method: opts.method || 'GET', headers: opts.headers || {}, body });
  const r = responder(url, opts, body);
  return { ok: r.ok, status: r.status, json: async () => r.json || {}, text: async () => r.text || '' };
};

let pass = 0;
let fail = 0;
function check(name, cond, extra) {
  if (cond) { pass++; console.log(`  OK   ${name}`); }
  else { fail++; console.log(`  FAIL ${name}${extra ? ' -> ' + extra : ''}`); }
}
function section(t) { console.log(`\n=== ${t}`); }
function reset(r) { calls = []; responder = r || (() => ({ ok: true, status: 200 })); }

let ipSeq = 0;
const nouvelleIp = () => `10.0.0.${++ipSeq}`;
const post = (body, adresse = nouvelleIp()) => ({
  httpMethod: 'POST',
  headers: { 'x-forwarded-for': adresse, 'content-type': 'application/json' },
  body: JSON.stringify(body),
});
const postForm = (champs, opts = {}) => {
  const q = new URLSearchParams();
  for (const [k, v] of champs) q.append(k, v);
  const brut = q.toString();
  return {
    httpMethod: 'POST',
    headers: { 'x-forwarded-for': nouvelleIp(), 'content-type': 'application/x-www-form-urlencoded' },
    body: opts.base64 ? Buffer.from(brut, 'utf8').toString('base64') : brut,
    isBase64Encoded: !!opts.base64,
  };
};

const smtp = () => calls.filter((c) => c.url.endsWith('/v3/smtp/email'));
const contact = () => calls.find((c) => c.url.endsWith('/v3/contacts') && c.method === 'POST');
const versClement = () => smtp().find((c) => c.body.to[0].email === OFFRES.contact.email);
const versDemandeur = (email) => smtp().find((c) => c.body.to[0].email === email);
const toutLeTexte = (c) => [c.body.subject, c.body.htmlContent, c.body.textContent].join('\n');
const sansPrixAutres = (c) => {
  const t = normal(toutLeTexte(c));
  return !PRIX_AUTRES.some((p) => t.includes(p));
};
const propre = (c) => sansPrixAutres(c) && !VENTE_DIRECTE.test(toutLeTexte(c)) && !TIRETS.test(toutLeTexte(c)) && !EMOJI.test(toutLeTexte(c));

const JOURNEE = {
  type: 'journee',
  prenom: 'Léa',
  email: 'pilote@exemple.fr',
  telephone: '06 12 34 56 78',
  circuit: 'Lohéac',
  periode: 'un samedi de novembre',
  kart: 'Rotax Max, châssis Tony Kart',
  travail: 'Je perds du temps dans les virages lents.',
  rgpd: true,
};
// Formulaire actuel de /marques : projet, entreprise, prenom, email, puis facultatifs.
const MARQUE = {
  type: 'marques',
  profil: 'marque',
  societe: 'Pneus Exemple',
  prenom: 'Julie',
  email: 'julie@marque.fr',
  telephone: '',
  site: '@pneus_exemple',
  budget: '300-1000',
  message: 'Bonjour Clément',
  rgpd: true,
};
const SPONSOR = {
  ...MARQUE,
  profil: 'sponsor',
  societe: 'Garage Exemple',
  prenom: 'Marc',
  email: 'marc@garage.fr',
  formule: 'officiel',
  telephone: '06 98 76 54 32',
  budget: 'plus-6000',
};
// Formulaire reste en cache (avant le 01/10/2026) : objectif, formats et delai encore envoyes.
const ANCIEN_FORMULAIRE = {
  ...MARQUE,
  objectif: 'Tester nos pneus sur une journée',
  formats: ['video-sponsorisee', 'produit-teste'],
  delai: '3-mois',
};
// Tutoiement : jamais dans ce qu une marque lit (page /marques, accuses, pages de reponse).
const TUTOIEMENT = /(?<!\p{L})(tu|ton|ta|tes|te|toi|tien|tienne)(?!\p{L})|(?<!\p{L})t[’'](?=\p{L})/iu;
// Mecenat, don, recu fiscal : seulement pour dire que ce n en est pas (phrase avec une negation).
const MOTS_MECENAT = /m[ée]c[ée]nat|re[çc]u fiscal|r[ée]duction d.imp[ôo]t|(?<!\p{L})dons?(?!\p{L})/iu;
const NEGATION = /(?<!\p{L})(pas|aucun|aucune|ni|ne|n[’'])(?!\p{L})/iu;
const phrasesFautives = (texte) => texte.split(/(?<=[.?!])\s+/).filter((p) => MOTS_MECENAT.test(p) && !NEGATION.test(p));

(async () => {
  const demande = require(FN);
  const J = OFFRES.journee;
  let r;

  // ---------------------------------------------------------------- 1. consulting valide
  section('consulting en piste : demande de date valide');
  reset();
  r = await demande.handler(post(JOURNEE));
  check('demande valide -> 200 success', r.statusCode === 200 && JSON.parse(r.body).success === true, r.body);
  check('CORS restreint comme send-email : jamais *, le site public par defaut', r.headers && r.headers['Access-Control-Allow-Origin'] === SITE_PUBLIC && r.headers.Vary === 'Origin', JSON.stringify(r.headers));
  check('chaque appel Brevo porte la cle BREVO_API_KEY', calls.length > 0 && calls.every((c) => c.headers['api-key'] === 'test-key'));
  const c1 = contact();
  check('contact Brevo enregistre avec l attribut CONSULTING_DEMANDE (date du jour)', c1 && /^\d{4}-\d{2}-\d{2}$/.test(c1.body.attributes.CONSULTING_DEMANDE || ''), JSON.stringify(c1 && c1.body));
  check('contact : updateEnabled et SOURCE consulting', c1 && c1.body.updateEnabled === true && c1.body.attributes.SOURCE === 'consulting');
  check('contact : pas dans la liste du tableur (ce n est pas un prospect du guide)', c1 && !c1.body.listIds);
  check('attribut CONSULTING_DEMANDE cree chez Brevo avant usage', calls.some((c) => c.url.endsWith('/contacts/attributes/normal/CONSULTING_DEMANDE')));
  check('contact enregistre AVANT les envois', c1 && calls.indexOf(c1) < calls.indexOf(smtp()[0]));
  const copJ = versClement();
  const accJ = versDemandeur(JOURNEE.email);
  check('deux envois : copie a Clement puis accuse au demandeur', smtp().length === 2 && copJ && accJ && calls.indexOf(copJ) < calls.indexOf(accJ));
  check('accuse : objet avec le delai de reponse de la config', accJ && accJ.body.subject === `Bien reçu : je te réponds sous ${J.reponse_h} h`, accJ && accJ.body.subject);
  check('accuse : expediteur = config (marque.nom, contact.email)', accJ && accJ.body.sender.email === OFFRES.contact.email && accJ.body.sender.name === OFFRES.marque.nom);
  check('accuse : salue par le prenom, rappelle le circuit et la periode', accJ && accJ.body.textContent.startsWith(`Salut ${JOURNEE.prenom},`) && accJ.body.textContent.includes(JOURNEE.circuit) && accJ.body.textContent.includes(JOURNEE.periode));
  check('accuse : dit ce qui va se passer (reponse et devis, validation, date)', accJ && ['Ce qui se passe maintenant', 'avec un devis', 'tu le valides', 'On fixe la date'].every((m) => accJ.body.textContent.includes(m)));
  check('accuse : prix et unite du consulting lus dans la config', accJ && normal(accJ.body.textContent).includes(normal(J.prix_affiche)) && accJ.body.textContent.includes(J.unite));
  check('accuse : aucun paiement en ligne annonce', accJ && accJ.body.textContent.includes('rien en ligne'));
  check('accuse : aucun autre prix, aucun lien Stripe ni Gumroad, aucun tiret cadratin, aucun emoji', accJ && propre(accJ));
  check('accuse : aucun titre coach, entraineur, moniteur, educateur, professeur', accJ && !TITRES.test(toutLeTexte(accJ)), accJ && (toutLeTexte(accJ).match(TITRES) || [''])[0]);
  check('accuse : version texte presente (lisible sans HTML)', accJ && typeof accJ.body.textContent === 'string' && accJ.body.textContent.includes('Clément'));
  check('copie a Clement : repondre-a = email du demandeur', copJ && copJ.body.replyTo.email === JOURNEE.email);
  check('copie a Clement : tous les champs en clair',
    copJ && ['Prénom : Léa', 'Téléphone : 06 12 34 56 78', 'Circuit : Lohéac', 'Date ou période : un samedi de novembre', 'Catégorie et kart : Rotax Max, châssis Tony Kart', 'À travailler : Je perds du temps'].every((m) => copJ.body.textContent.includes(m)), copJ && copJ.body.textContent);
  check('copie a Clement : objet au nom de la prestation (journee.titre)', copJ && copJ.body.subject === `[Site] ${J.titre} : Léa, Lohéac (un samedi de novembre)`, copJ && copJ.body.subject);

  reset();
  r = await demande.handler(post({ ...JOURNEE, telephone: '' }));
  check('telephone facultatif : vide -> 200, « (non donne) » dans la copie', r.statusCode === 200 && versClement() && versClement().body.textContent.includes('Téléphone : (non donné)'));

  reset();
  r = await demande.handler(post({ ...JOURNEE, prenom: '<b>Léa</b>', circuit: 'Laval<script>' }));
  const accX = versDemandeur(JOURNEE.email);
  check('saisie HTML echappee dans l accuse (prenom, circuit)', r.statusCode === 200 && accX && !accX.body.htmlContent.includes('<b>Léa') && !accX.body.htmlContent.includes('<script>') && accX.body.htmlContent.includes('&lt;b&gt;'));

  // ---------------------------------------------------------------- 1 bis. config, page, site construit
  section('consulting en piste : config, page et site construit');
  check('config : nom « Consulting en piste », offre ouverte', J.titre === 'Consulting en piste' && J.statut === 'ouverte', `${J.titre} / ${J.statut}`);
  check('config : prix 150 et unite hors frais de deplacement', J.prix === 150 && /hors frais de déplacement/.test(J.unite), `${J.prix} / ${J.unite}`);
  check('config : adresse de la page /consulting', OFFRES.routes.journee === '/consulting', OFFRES.routes.journee);
  check('config : delai de reponse en heures (journee.reponse_h)', Number.isFinite(J.reponse_h) && J.reponse_h > 0, String(J.reponse_h));
  check('config : anciennes adresses /journee-piste et /consulting-technique', Array.isArray(J.anciennes_routes) && ['/journee-piste', '/consulting-technique'].every((a) => J.anciennes_routes.includes(a)));
  const textesPublics = [J.titre, J.sous_titre, J.sous_ligne_liste_attente, J.sous_ligne_ouverte, J.unite];
  check('config : textes publics sans titre interdit', textesPublics.every((t) => typeof t === 'string' && t && !TITRES.test(t)), textesPublics.filter((t) => TITRES.test(t || '')).join(' | '));

  const fs = require('fs');
  const RACINE = path.join(__dirname, '..');
  const lirePage = (...m) => fs.readFileSync(path.join(RACINE, ...m), 'utf8');
  // Texte visible seulement : sans scripts, commentaires ni balises.
  const texteVisible = (html) => html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ');
  const pageJ = lirePage('site v2', 'consulting', 'index.html');
  check('page : l ancien dossier journee-piste n existe plus (sinon la 301 est ignoree)', !fs.existsSync(path.join(RACINE, 'site v2', 'journee-piste')));
  check('page : titre, prix et unite lus dans la config', pageJ.includes('<h1>{{journee.titre}}</h1>') && pageJ.includes('{{journee.prix_affiche}}') && pageJ.includes('{{journee.unite}}'));
  check('page : aucun prix ni delai en dur (150 €, 24 h)', !/150\s*(€|euros)/.test(pageJ) && !/\b24\s*h\b/.test(texteVisible(pageJ)));
  check('page : bouton principal « Demander une date » vers le formulaire de la page', /<a class="bouton bouton-principal" href="#demande"[^>]*>Demander une date<\/a>/.test(pageJ) && pageJ.includes('id="demande"'));
  const formJ = (pageJ.match(/<form[\s\S]*?<\/form>/) || [''])[0];
  check('formulaire : poste vers la fonction demande, type journee', /action="\/\.netlify\/functions\/demande"/.test(formJ) && /name="type" value="journee"/.test(formJ));
  check('formulaire : champs prenom, email, telephone, circuit, periode, kart, travail, rgpd, piege',
    ['prenom', 'email', 'telephone', 'circuit', 'periode', 'kart', 'travail', 'rgpd', 'site_web'].every((n) => formJ.includes(`name="${n}"`)));
  check('formulaire : telephone facultatif (sans required)', /<input id="telephone"(?![^>]*required)[^>]*>/.test(formJ));
  check('page : aucun paiement en ligne (ni Stripe, ni porte /aller/, ni Gumroad)', !VENTE_DIRECTE.test(pageJ) && !pageJ.includes('/aller/'));
  check('page : aucun titre coach, entraineur, moniteur, educateur, professeur', !TITRES.test(texteVisible(pageJ)), (texteVisible(pageJ).match(TITRES) || [''])[0]);
  check('page : plus aucune mention restrictive de la veille', !/consigne de pilotage|technique et matérielle|DEJEPS|diplômé d’État/.test(pageJ));
  check('page : aucun tiret cadratin ni emoji', !TIRETS.test(pageJ) && !EMOJI.test(pageJ));

  // Le site construit (npm test lance d abord run-prix, qui exige aussi dist/)
  const DIST = path.join(RACINE, 'dist');
  if (!fs.existsSync(path.join(DIST, 'consulting', 'index.html'))) {
    check('dist/ absent : lance « node scripts/build.js » avant ce test', false);
  } else {
    const construite = lirePage('dist', 'consulting', 'index.html');
    check('dist : le prix et l unite sont publies', normal(construite).includes(normal(J.prix_affiche)) && construite.includes(J.unite));
    check('dist : aucun titre interdit dans le texte visible', !TITRES.test(texteVisible(construite)), (texteVisible(construite).match(TITRES) || [''])[0]);
    const publiques = ['index.html', path.join('liens', 'index.html'), path.join('consulting', 'index.html')];
    check('dist : aucun titre interdit sur l accueil, les liens et la page du consulting', publiques.every((p) => !TITRES.test(texteVisible(lirePage('dist', p)))), publiques.map((p) => (texteVisible(lirePage('dist', p)).match(TITRES) || [''])[0]).join(' | '));
    check('dist : le nom de la prestation figure sur l accueil et la page liens', ['index.html', path.join('liens', 'index.html')].every((p) => lirePage('dist', p).includes(J.titre)));
    check('dist : pas de page /journee-piste publiee', !fs.existsSync(path.join(DIST, 'journee-piste')));
    const redirects = lirePage('dist', '_redirects').split('\n').map((l) => l.trim().split(/\s+/).join(' '));
    check('dist/_redirects : chaque ancienne adresse mene a /consulting en 301', J.anciennes_routes.every((a) => redirects.includes(`${a} ${OFFRES.routes.journee} 301`) && redirects.includes(`${a}/ ${OFFRES.routes.journee} 301`)), redirects.join(' | '));
    const sitemap = lirePage('dist', 'sitemap.xml');
    check('dist/sitemap.xml : /consulting present, /journee-piste absent', sitemap.includes(`${SITE_PUBLIC}${OFFRES.routes.journee}</loc>`) && !sitemap.includes('journee-piste'));
  }

  // ---------------------------------------------------------------- 2. marques
  // Deux parcours separes (decision du 01/10/2026) : la saison passe par l association,
  // les videos par la micro-entreprise. Vouvoiement partout.
  const SP = OFFRES.sponsoring;
  const MQ = OFFRES.marques;
  const ASSO = SP.association.nom_affiche;
  const vouvoie = (c) => !TUTOIEMENT.test([c.body.subject, c.body.textContent].join('\n'));

  section('marques : collaboration reseaux (profil marque)');
  reset();
  r = await demande.handler(post(MARQUE));
  check('marque valide -> 200', r.statusCode === 200, r.body);
  check('profil marque -> attribut COLLAB_DEMANDE, SOURCE marques', contact() && 'COLLAB_DEMANDE' in contact().body.attributes && !('SPONSOR_DEMANDE' in contact().body.attributes) && contact().body.attributes.SOURCE === 'marques');
  const accM = versDemandeur(MARQUE.email);
  check('accuse reseaux : objet « Votre projet de collaboration »', accM && accM.body.subject === 'Votre projet de collaboration', accM && accM.body.subject);
  check('accuse reseaux : salue par le prenom, au vouvoiement', accM && accM.body.textContent.startsWith(`Bonjour ${MARQUE.prenom},`) && accM.body.textContent.includes('je vous réponds sous'));
  check('accuse reseaux : delai de la config, kit media, mention legale, contrat d une page', accM && accM.body.textContent.includes(`${OFFRES.delais.reponse_marques_h} h`) && ['chiffres d’audience', '« Collaboration commerciale »', 'contrat d\'une page'].every((m) => accM.body.textContent.includes(m)));
  check('accuse reseaux : aucun tutoiement', accM && vouvoie(accM), accM && (toutLeTexte(accM).match(TUTOIEMENT) || [''])[0]);
  check('accuse reseaux : aucun prix, aucun lien de vente, aucun tiret, aucun emoji', accM && propre(accM));
  check('accuse reseaux : aucun titre interdit, aucune promesse de recu fiscal', accM && !TITRES.test(toutLeTexte(accM)) && !phrasesFautives(accM.body.textContent).length);
  const copM = versClement();
  check('copie reseaux : objet avec l entreprise et le parcours', copM && copM.body.subject === `[Site] Marques : ${MARQUE.societe}, Collaboration réseaux (${MQ.structure_reseaux})`, copM && copM.body.subject);
  check('copie reseaux : projet, formule sans objet, budget lisible, repondre-a',
    copM && ['Projet : Des vidéos sur vos réseaux', 'Formule : (sans objet)', 'Budget : 300 à 1 000 €', 'Téléphone : (non donné)', 'Site ou Instagram : @pneus_exemple'].every((m) => copM.body.textContent.includes(m)) && copM.body.replyTo.email === MARQUE.email, copM && copM.body.textContent);
  check('copie reseaux : pas de ligne Objectif, Formats ni Quand quand le formulaire ne les envoie pas', copM && !/^(Objectif|Formats|Quand) :/m.test(copM.body.textContent));

  section('marques : parrainage de saison (profil sponsor)');
  reset();
  r = await demande.handler(post(SPONSOR));
  check('sponsor valide -> 200, attribut SPONSOR_DEMANDE', r.statusCode === 200 && contact() && 'SPONSOR_DEMANDE' in contact().body.attributes, r.body);
  const accS = versDemandeur(SPONSOR.email);
  check('accuse saison : objet avec la saison de la config', accS && accS.body.subject === `Votre demande pour la saison ${SP.saison}`, accS && accS.body.subject);
  check('accuse saison : association, convention, facture, compte rendu', accS && [`passe par ${ASSO}`, 'convention d\'une page', 'facture', 'compte rendu', `proposition pour la saison ${SP.saison}`].every((m) => accS.body.textContent.includes(m)), accS && accS.body.textContent);
  check('accuse saison : propose d en parler de vive voix', accS && accS.body.textContent.includes('de vive voix'));
  check('accuse saison : vouvoiement, propre, sans titre interdit, jamais de recu fiscal promis', accS && vouvoie(accS) && propre(accS) && !TITRES.test(toutLeTexte(accS)) && !phrasesFautives(accS.body.textContent).length);
  const copS = versClement();
  check('copie saison : formule, telephone et budget en clair', copS && ['Projet : Mon logo sur votre saison', `Formule : ${SP.formules.officiel.titre}`, 'Téléphone : 06 98 76 54 32', 'Budget : Plus de 6 000 €'].every((m) => copS.body.textContent.includes(m)), copS && copS.body.textContent);
  check('copie saison : objet avec la saison', copS && copS.body.subject.includes(`Parrainage de saison ${SP.saison}`), copS && copS.body.subject);

  reset();
  r = await demande.handler(post({ ...SPONSOR, formule: 'constructor' }));
  check('formule hors liste -> ignoree, « (pas choisie) » dans la copie', r.statusCode === 200 && versClement() && versClement().body.textContent.includes('Formule : (pas choisie)'));
  reset();
  r = await demande.handler(post({ ...MARQUE, formule: 'principal' }));
  check('formule envoyee avec une collaboration reseaux -> ignoree', r.statusCode === 200 && versClement() && versClement().body.textContent.includes('Formule : (sans objet)'));

  section('marques : les deux (profil autre)');
  reset();
  r = await demande.handler(post({ ...MARQUE, profil: 'autre', email: 'deux@exemple.fr', formule: 'supporter' }));
  const accD = versDemandeur('deux@exemple.fr');
  check('autre -> 200, attribut COLLAB_DEMANDE', r.statusCode === 200 && contact() && 'COLLAB_DEMANDE' in contact().body.attributes);
  check('accuse les deux : objet, tri ensemble, deux structures, deux factures', accD && accD.body.subject === 'Votre demande de partenariat' && ['on verra ensemble', ASSO, MQ.structure_reseaux, 'deux factures'].every((m) => accD.body.textContent.includes(m)), accD && accD.body.textContent);
  check('accuse les deux : vouvoiement, propre', accD && vouvoie(accD) && propre(accD));
  check('copie les deux : la formule de saison est gardee', versClement() && versClement().body.textContent.includes(`Formule : ${SP.formules.supporter.titre}`));

  section('marques : saisies, formulaires en cache');
  reset();
  r = await demande.handler(post({ ...MARQUE, prenom: '<b>Julie</b>' }));
  const accMX = versDemandeur(MARQUE.email);
  check('prenom echappe dans l accuse des marques', r.statusCode === 200 && accMX && !accMX.body.htmlContent.includes('<b>Julie') && accMX.body.htmlContent.includes('&lt;b&gt;Julie'));

  reset();
  r = await demande.handler(post({ ...MARQUE, societe: '<script>alert(1)</script>', message: '<img src=x onerror=alert(1)>' }));
  const copX = versClement();
  check('saisie HTML echappee dans la copie a Clement (pas d injection)', r.statusCode === 200 && copX && !copX.body.htmlContent.includes('<script>') && !copX.body.htmlContent.includes('<img src=x') && copX.body.htmlContent.includes('&lt;script&gt;'));

  reset();
  r = await demande.handler(post({ ...JOURNEE, circuit: 'Lohéac\r\nBcc: pirate@exemple.fr' }));
  const copN = versClement();
  check('retour a la ligne retire d un champ d une ligne (objet d email sans saut)', r.statusCode === 200 && copN && !/[\r\n]/.test(copN.body.subject), copN && JSON.stringify(copN.body.subject));
  reset();
  r = await demande.handler(post({ ...MARQUE, societe: 'Garage\nBcc: pirate@exemple.fr' }));
  check('retour a la ligne retire de l entreprise (objet de la copie sans saut)', r.statusCode === 200 && versClement() && !/[\r\n]/.test(versClement().body.subject));

  reset();
  r = await demande.handler(post(ANCIEN_FORMULAIRE));
  const copA = versClement();
  check('formulaire en cache (objectif, formats, delai) -> 200, lignes gardees dans la copie', r.statusCode === 200 && copA && ['Objectif : Tester nos pneus', 'Formats : Vidéo sponsorisée, Produit testé sur piste', 'Quand : Dans les 3 mois'].every((m) => copA.body.textContent.includes(m)), copA && copA.body.textContent);
  reset();
  r = await demande.handler(post({ ...ANCIEN_FORMULAIRE, formats: ['video-sponsorisee', 'inconnu', 'constructor', 'video-sponsorisee'] }));
  check('formats hors liste filtres, doublons retires', r.statusCode === 200 && versClement() && versClement().body.textContent.includes('Formats : Vidéo sponsorisée\n'), versClement() && versClement().body.textContent);
  reset();
  r = await demande.handler(post({ ...MARQUE, budget: 'plus' }));
  check('ancienne tranche « plus » encore acceptee', r.statusCode === 200 && versClement() && versClement().body.textContent.includes('Budget : Plus\n'));
  reset();
  r = await demande.handler(post({ ...MARQUE, budget: '999-euros' }));
  check('tranche de budget hors liste -> ignoree', r.statusCode === 200 && versClement() && versClement().body.textContent.includes('Budget : (pas encore décidé)'));

  reset();
  r = await demande.handler(post({ ...MARQUE, rgpd: false }));
  const champsM = JSON.parse(r.body).champs || {};
  check('marques sans case RGPD -> 400, message au vouvoiement', r.statusCode === 400 && /votre demande/.test(champsM.rgpd || '') && !TUTOIEMENT.test(Object.values(champsM).join(' ')), r.body);
  reset();
  r = await demande.handler(post({ ...MARQUE, profil: '', societe: '', prenom: '' }));
  const champsV = JSON.parse(r.body).champs || {};
  check('marques : messages d erreur au vouvoiement (projet, entreprise, prenom)', r.statusCode === 400 && ['profil', 'societe', 'prenom'].every((k) => k in champsV) && !TUTOIEMENT.test(Object.values(champsV).join(' ')), r.body);

  process.env.BREVO_DEMANDE_LIST_ID = '12';
  reset();
  await demande.handler(post(JOURNEE));
  check('BREVO_DEMANDE_LIST_ID definie -> le contact rejoint cette liste', contact() && JSON.stringify(contact().body.listIds) === '[12]');
  delete process.env.BREVO_DEMANDE_LIST_ID;

  // ---------------------------------------------------------------- 3. validation
  section('validation : 400 sans aucun appel Brevo');
  for (const [label, payload] of [
    ['email absent', { ...JOURNEE, email: undefined }],
    ['email sans domaine', { ...JOURNEE, email: 'a@' }],
    ['email tableau (typage)', { ...JOURNEE, email: ['a@b.fr'] }],
    ['email trop long', { ...JOURNEE, email: 'a'.repeat(250) + '@b.fr' }],
    ['case RGPD non cochee', { ...JOURNEE, rgpd: false }],
    ['case RGPD absente', { ...JOURNEE, rgpd: undefined }],
    ['prenom vide', { ...JOURNEE, prenom: '   ' }],
    ['prenom tableau (typage)', { ...JOURNEE, prenom: ['Léa'] }],
    ['circuit vide', { ...JOURNEE, circuit: '' }],
    ['periode vide', { ...JOURNEE, periode: '' }],
    ['kart vide', { ...JOURNEE, kart: '' }],
    ['travail vide', { ...JOURNEE, travail: '  ' }],
    ['telephone avec des lettres', { ...JOURNEE, telephone: 'appelle-moi' }],
    ['telephone trop court', { ...JOURNEE, telephone: '12 34' }],
    ['telephone trop long', { ...JOURNEE, telephone: '0'.repeat(30) }],
    ['marques sans profil', { ...MARQUE, profil: '' }],
    ['marques sans societe', { ...MARQUE, societe: '' }],
    ['marques sans prenom', { ...MARQUE, prenom: '' }],
    ['marques sans email', { ...MARQUE, email: '' }],
    ['marques profil hors liste', { ...MARQUE, profil: 'constructor' }],
    ['marques telephone avec des lettres', { ...SPONSOR, telephone: 'rappelez-moi' }],
    ['marques telephone trop court', { ...SPONSOR, telephone: '12 34' }],
    ['type inconnu', { ...JOURNEE, type: 'devis' }],
    ['type constructor', { ...JOURNEE, type: 'constructor' }],
    ['type __proto__', { ...JOURNEE, type: '__proto__' }],
  ]) {
    reset();
    r = await demande.handler(post(payload));
    check(`${label} -> 400`, r.statusCode === 400 && calls.length === 0, `status=${r.statusCode} calls=${calls.length}`);
  }
  reset();
  r = await demande.handler(post({ ...JOURNEE, rgpd: false, circuit: '', telephone: 'x' }));
  const champs = JSON.parse(r.body).champs || {};
  check('la reponse 400 nomme les champs a corriger (rgpd, circuit, telephone)', 'rgpd' in champs && 'circuit' in champs && 'telephone' in champs, r.body);

  reset();
  r = await demande.handler(post({ ...MARQUE, objectif: undefined, formats: undefined }));
  check('marques sans objectif (champ retire du formulaire) -> 200', r.statusCode === 200, r.body);

  reset();
  r = await demande.handler({ httpMethod: 'POST', headers: { 'x-forwarded-for': nouvelleIp() }, body: '{pas du json' });
  check('JSON invalide -> 400', r.statusCode === 400 && calls.length === 0);
  reset();
  r = await demande.handler({ httpMethod: 'POST', headers: { 'x-forwarded-for': nouvelleIp() }, body: '[1,2]' });
  check('JSON tableau -> 400', r.statusCode === 400 && calls.length === 0);
  reset();
  r = await demande.handler({ httpMethod: 'GET', headers: {}, body: '' });
  check('GET -> 405', r.statusCode === 405 && calls.length === 0);

  // ---------------------------------------------------------------- 4. anti-abus
  section('anti-abus : piege a robots et rate limit');
  reset();
  r = await demande.handler(post({ ...JOURNEE, site_web: 'http://spam.example' }));
  check('piege rempli -> 200 silencieux, aucun appel Brevo', r.statusCode === 200 && calls.length === 0, `status=${r.statusCode} calls=${calls.length}`);
  reset();
  let dernier;
  for (let i = 0; i < 6; i++) dernier = await demande.handler(post({ ...JOURNEE, email: `f${i}@exemple.fr` }, 'ip-rafale'));
  check('6e demande de la meme IP dans l heure -> 429', dernier.statusCode === 429, `status=${dernier.statusCode}`);
  check('les 5 premieres sont passees (10 envois), la 6e n a rien envoye', smtp().length === 10, `envois=${smtp().length}`);

  // ---------------------------------------------------------------- 5. erreurs Brevo
  section('erreurs Brevo');
  const cle = process.env.BREVO_API_KEY;
  delete process.env.BREVO_API_KEY;
  reset();
  r = await demande.handler(post(JOURNEE));
  check('BREVO_API_KEY absente -> 500 generique, aucun appel', r.statusCode === 500 && calls.length === 0 && !/key/i.test(r.body));
  process.env.BREVO_API_KEY = cle;

  reset((url) => (url.endsWith('/v3/contacts') ? { ok: false, status: 400, text: 'contact refuse' } : { ok: true, status: 200 }));
  r = await demande.handler(post(JOURNEE));
  check('contact refuse par Brevo -> non bloquant, 200 et 2 envois', r.statusCode === 200 && smtp().length === 2);

  reset((url) => (url.includes('/attributes/') ? { ok: false, status: 400, text: 'Attribute name already exist' } : { ok: true, status: 200 }));
  r = await demande.handler(post(JOURNEE));
  check('attribut deja existant (400 exist) -> cas nominal, 200', r.statusCode === 200 && smtp().length === 2);

  reset((url, o, body) => (url.endsWith('/smtp/email') && body.to[0].email === OFFRES.contact.email ? { ok: false, status: 500, text: 'panne' } : { ok: true, status: 200 }));
  r = await demande.handler(post(JOURNEE));
  check('copie a Clement en echec -> 500 generique, pas d accuse', r.statusCode === 500 && smtp().length === 1 && !/panne/.test(r.body), `status=${r.statusCode} envois=${smtp().length}`);

  reset((url, o, body) => (url.endsWith('/smtp/email') && body.to[0].email === JOURNEE.email ? { ok: false, status: 400, text: 'invalid' } : { ok: true, status: 200 }));
  r = await demande.handler(post(JOURNEE));
  check('accuse en echec -> 200 quand meme (copie deja chez Clement, pas de renvoi en double)', r.statusCode === 200 && smtp().length === 2);

  reset(() => { throw new Error('reseau coupe'); });
  r = await demande.handler(post(JOURNEE));
  check('reseau coupe -> 500 generique, jamais de plantage', r.statusCode === 500 && !/reseau/.test(r.body));

  // ---------------------------------------------------------------- 6. repli sans JavaScript
  section('repli sans JavaScript (formulaire poste en urlencoded)');
  reset();
  const CHAMPS_NOJS = [['type', 'journee'], ['prenom', 'Tom'], ['email', 'nojs@exemple.fr'], ['circuit', 'Ancenis'], ['periode', 'mars'], ['kart', 'KZ2'], ['travail', 'Le freinage']];
  r = await demande.handler(postForm([...CHAMPS_NOJS, ['rgpd', 'oui'], ['site_web', '']]));
  check('urlencoded valide -> 200 en page HTML', r.statusCode === 200 && /text\/html/.test(r.headers['Content-Type']) && /Bien reçu, merci/.test(r.body), r.body.slice(0, 120));
  check('page HTML : noindex et lien de retour vers la page', /noindex/.test(r.body) && r.body.includes(SITE_PUBLIC + OFFRES.routes.journee));
  check('page HTML : aucun tiret cadratin, aucun emoji', !TIRETS.test(r.body) && !EMOJI.test(r.body));

  reset();
  r = await demande.handler(postForm([
    ['type', 'marques'], ['profil', 'marque'], ['societe', 'Casques Exemple'], ['prenom', 'Léo'], ['email', 'leo@exemple.fr'],
    ['objectif', 'Un test'], ['formats', 'logo-kart'], ['formats', 'posts-dedies'], ['rgpd', 'oui'],
  ], { base64: true }));
  check('urlencoded encode en base64 par Netlify -> decode, formats multiples lus', r.statusCode === 200 && versClement() && versClement().body.textContent.includes('Formats : Logo sur le kart, Posts dédiés'), `status=${r.statusCode}`);

  reset();
  const CHAMPS_MARQUES_NOJS = [['type', 'marques'], ['profil', 'sponsor'], ['formule', 'partenaire'], ['societe', 'Boulangerie Exemple'], ['prenom', 'Léo'], ['email', 'leo@boulangerie.fr'], ['telephone', ''], ['budget', '1000-3000'], ['message', '']];
  r = await demande.handler(postForm([...CHAMPS_MARQUES_NOJS, ['rgpd', 'oui'], ['site_web', '']]));
  check('marques sans JavaScript -> 200 en page HTML, merci au prenom, vouvoiement, saison de la config',
    r.statusCode === 200 && /text\/html/.test(r.headers['Content-Type']) && normal(r.body).includes('Merci Léo.') && normal(r.body).includes(`Je vous réponds sous ${OFFRES.delais.reponse_marques_h} h avec une proposition pour la saison ${OFFRES.sponsoring.saison}`) && !TUTOIEMENT.test(r.body.replace(/<[^>]+>/g, ' ')), r.body.slice(0, 400));
  check('marques sans JavaScript : lien de retour vers /marques', r.body.includes(SITE_PUBLIC + OFFRES.routes.marques));
  reset();
  r = await demande.handler(postForm([...CHAMPS_MARQUES_NOJS, ['prenom', '<i>Léo</i>'], ['rgpd', 'oui']]));
  check('marques sans JavaScript : prenom echappe dans la page de reponse', r.statusCode === 200 && !r.body.includes('<i>Léo') && r.body.includes('&lt;i&gt;'));
  reset();
  r = await demande.handler(postForm(CHAMPS_MARQUES_NOJS));
  check('marques sans JavaScript ni case RGPD -> 400, page au vouvoiement', r.statusCode === 400 && /votre demande/.test(r.body) && !TUTOIEMENT.test(r.body.replace(/<[^>]+>/g, ' ')) && calls.length === 0);

  reset();
  r = await demande.handler(postForm(CHAMPS_NOJS));
  check('urlencoded sans case RGPD -> 400 en page HTML qui explique', r.statusCode === 400 && /text\/html/.test(r.headers['Content-Type']) && /cocher la case/.test(r.body) && calls.length === 0);

  // ------------------------------------------------ typographie francaise
  section('typographie : accuses de reception et pages de reponse');
  const { typographier } = require(path.join(__dirname, '..', 'scripts', 'typographie.js'));
  const dejaCorrige = (h) => typeof h === 'string' && typographier(h) === h;
  check('accuse journee : corps HTML deja corrige', accJ && dejaCorrige(accJ.body.htmlContent) && accJ.body.htmlContent.includes('&nbsp;:'));
  check('accuse marques : corps HTML deja corrige', accM && dejaCorrige(accM.body.htmlContent));
  check('accuse : objet exact, sans entite HTML', accJ && !/&nbsp;/.test(accJ.body.subject) && accM && !/&nbsp;/.test(accM.body.subject));
  check('page HTML de reponse : corrigee', dejaCorrige(r.body));

  // ------------------------------------------------ pages tierces et IP
  section('origine, CORS et IP : memes regles que send-email');
  const avec = (entetes, corps = JOURNEE) => ({ httpMethod: 'POST', headers: { 'content-type': 'application/json', 'x-forwarded-for': nouvelleIp(), ...entetes }, body: JSON.stringify(corps) });
  reset();
  r = await demande.handler(avec({ origin: 'https://site-malveillant.example' }));
  check('Origin d un autre site -> 403, aucun appel Brevo', r.statusCode === 403 && calls.length === 0, r.statusCode + ' ' + calls.length);
  check('Origin d un autre site -> CORS ne lui renvoie jamais son origine', r.headers['Access-Control-Allow-Origin'] !== 'https://site-malveillant.example');
  reset();
  r = await demande.handler(avec({ referer: 'https://site-malveillant.example/x' }));
  check('Referer d un autre site (sans Origin) -> 403', r.statusCode === 403 && calls.length === 0);
  reset();
  r = await demande.handler(avec({ origin: OFFRES.sites.site1 }));
  check('Origin du site 1 -> 200 et CORS = cette origine', r.statusCode === 200 && r.headers['Access-Control-Allow-Origin'] === OFFRES.sites.site1);
  reset();
  const brouillon = OFFRES.sites.site1.replace('https://', 'https://68ab12cd--');
  r = await demande.handler(avec({ origin: brouillon }));
  check('Origin d un brouillon Netlify du site 1 -> 200', r.statusCode === 200);
  reset();
  for (let i = 0; i < 5; i++) await demande.handler(avec({ 'x-nf-client-connection-ip': '9.9.9.8' }));
  r = await demande.handler(avec({ 'x-nf-client-connection-ip': '9.9.9.8' }));
  check('limite par IP sur x-nf-client-connection-ip : changer x-forwarded-for ne la contourne pas', r.statusCode === 429, String(r.statusCode));
  reset();
  for (let i = 0; i < 5; i++) await demande.handler(post({ ...MARQUE, email: `m${i}@exemple.fr` }, 'ip-marques'));
  r = await demande.handler(post(MARQUE, 'ip-marques'));
  check('limite par IP sur /marques : message au vouvoiement', r.statusCode === 429 && /Réessayez/.test(JSON.parse(r.body).error || ''), r.body);

  // ------------------------------------------------ page /marques, config, site construit
  section('marques : config (sponsoring.*, marques.*, audience)');
  const eur = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' €';
  check('config : saison sur 4 chiffres, objectif de 20 000 a 30 000 €', /^\d{4}$/.test(SP.saison) && SP.objectif_min === 20000 && SP.objectif_max === 30000 && normal(SP.objectif_affiche) === '20 000 à 30 000 €', `${SP.saison} / ${SP.objectif_affiche}`);
  const cles = ['supporter', 'partenaire', 'officiel', 'principal'];
  check('config : quatre formules de saison, prix croissants, prix_affiche = prix', cles.every((k, i) => SP.formules[k] && Number.isFinite(SP.formules[k].prix) && normal(SP.formules[k].prix_affiche) === eur(SP.formules[k].prix) && SP.formules[k].titre && SP.formules[k].places_affiche && (i === 0 || SP.formules[k].prix > SP.formules[cles[i - 1]].prix)));
  check('config : collaborations reseaux, prix_affiche = prix', Object.values(MQ.collab).every((c) => Number.isFinite(c.prix) && normal(c.prix_affiche) === eur(c.prix)) && Number.isInteger(MQ.collab.ambassadeur.mois));
  check('config : association et structure nommees pour les phrases (nom_affiche, structure_reseaux)', typeof ASSO === 'string' && ASSO.length > 3 && typeof MQ.structure_reseaux === 'string' && MQ.structure_reseaux.length > 3);
  check('config : delais des marques en nombres (compte rendu, bilan, droits)', [SP.compte_rendu_course_h, MQ.bilan_collab_jours, MQ.droits_ugc_mois].every((n) => Number.isInteger(n) && n > 0));
  check('config : chiffres d audience verifies (912 570 vues, 66 Reels, mediane 4 322)', OFFRES.audience.vues === 912570 && normal(OFFRES.audience.vues_affiche) === '912 570' && OFFRES.audience.reels === 66 && normal(OFFRES.audience.mediane_affiche) === '4 322');
  check('config : listes de demande.js alignees sur la config (formules)', cles.every((k) => demande._listes.FORMULES[k] === SP.formules[k].titre));

  section('marques : page source');
  const pageM = lirePage('site v2', 'marques', 'index.html');
  const visibleM = texteVisible(pageM);
  const formM = (pageM.match(/<form[\s\S]*?<\/form>/) || [''])[0];
  const valeurs = (re) => [...formM.matchAll(re)].map((m) => m[1]);
  check('page : feuille page-marques.css (plus page-demande.css), et elle existe', pageM.includes('/assets/page-marques.css') && !pageM.includes('page-demande.css') && fs.existsSync(path.join(RACINE, 'site v2', 'assets', 'page-marques.css')));
  check('page : aiguillage vers #saison et #reseaux, sections et formulaire presents', ['href="#saison"', 'href="#reseaux"', 'id="saison"', 'id="reseaux"', 'id="contact"'].every((m) => pageM.includes(m)));
  check('formulaire : poste vers la fonction demande, type marques', /action="\/\.netlify\/functions\/demande"/.test(formM) && /name="type" value="marques"/.test(formM) && /data-type="marques"/.test(formM));
  check('formulaire : champs projet, formule, entreprise, prenom, email, telephone, budget, site, message, rgpd, piege',
    ['profil', 'formule', 'societe', 'prenom', 'email', 'telephone', 'budget', 'site', 'message', 'rgpd', 'site_web'].every((n) => formM.includes(`name="${n}"`)));
  check('formulaire : telephone, message et formule facultatifs', /<input id="telephone"(?![^>]*required)[^>]*>/.test(formM) && /<textarea id="message"(?![^>]*required)[^>]*>/.test(formM) && /<select id="formule"(?![^>]*required)[^>]*>/.test(formM));
  const profilsPage = valeurs(/name="profil" value="([^"]+)"/g);
  check('formulaire : les trois projets, tous connus de demande.js', profilsPage.length === 3 && profilsPage.every((p) => p in demande._listes.PROFILS), profilsPage.join(','));
  const formulesPage = [...((formM.match(/<select id="formule"[\s\S]*?<\/select>/) || [''])[0]).matchAll(/<option value="([^"]+)"/g)].map((m) => m[1]);
  check('formulaire : chaque formule proposee est connue de demande.js', formulesPage.length >= 4 && formulesPage.every((f) => f in demande._listes.FORMULES), formulesPage.join(','));
  const budgetsPage = [...((formM.match(/<select id="budget"[\s\S]*?<\/select>/) || [''])[0]).matchAll(/<option value="([^"]+)"/g)].map((m) => m[1]);
  check('formulaire : chaque tranche de budget est connue de demande.js', budgetsPage.length >= 7 && budgetsPage.every((b) => b in demande._listes.BUDGETS), budgetsPage.join(','));
  const selectsM = (formM.match(/<select id="(?:formule|budget)"[\s\S]*?<\/select>/g) || []).join('');
  check('formulaire : un seul choix « pas encore decide » par liste (la valeur vide)', !/ne-sais-pas|Je ne sais pas encore/.test(selectsM) && (selectsM.match(/<option value="">/g) || []).length === 2);
  const choisir = [...pageM.matchAll(/data-formule="([^"]+)"/g)].map((m) => m[1]);
  check('page : un bouton « Choisir » par formule de la config', cles.every((k) => choisir.includes(k)) && choisir.every((k) => k in SP.formules), choisir.join(','));
  check('page : prix, saison, objectif et audience lus dans la config', ['{{sponsoring.objectif_affiche}}', '{{sponsoring.saison}}', '{{audience.vues_affiche}}', '{{audience.mediane_affiche}}', '{{marques.collab.video_dediee.prix_affiche}}', ...cles.map((k) => `{{sponsoring.formules.${k}.prix_affiche}}`)].every((b) => pageM.includes(b)));
  const horsBudget = visibleM.replace(/Moins de [\d\s]+€|[\d\s]+ à [\d\s]+€|Plus de [\d\s]+€/g, ' ');
  check('page : aucun montant en euros ecrit en dur (hors tranches de budget)', !/\d\s*€/.test(horsBudget), (horsBudget.match(/.{0,20}\d\s*€/) || [''])[0]);
  check('page : aucun delai ecrit en dur (48 h)', !/\b\d+\s*h\b/.test(visibleM), (visibleM.match(/.{0,20}\b\d+\s*h\b/) || [''])[0]);
  check('page : aucune adresse email en dur', !/@[a-z0-9-]+\.[a-z]{2,}/i.test(pageM.replace(/\{\{[^}]+\}\}/g, '')));
  check('page : vouvoiement, aucun tutoiement dans le texte visible', !TUTOIEMENT.test(visibleM), (visibleM.match(new RegExp('.{0,30}(' + TUTOIEMENT.source + ').{0,30}', 'iu')) || [''])[0]);
  check('page : aucun titre coach, entraineur, moniteur, educateur, professeur', !TITRES.test(visibleM), (visibleM.match(TITRES) || [''])[0]);
  check('page : mecenat, don et recu fiscal seulement pour dire que ce n en est pas', !phrasesFautives(visibleM.replace(/\s+/g, ' ')).length, phrasesFautives(visibleM.replace(/\s+/g, ' ')).join(' | '));
  check('page : aucune mention a confirmer laissee telle quelle', !/À (CONFIRMER|FOURNIR|VÉRIFIER|DÉCIDER)/.test(pageM));
  check('page : aucun paiement en ligne (ni Stripe, ni porte /aller/, ni Gumroad)', !VENTE_DIRECTE.test(pageM) && !pageM.includes('/aller/'));
  check('page : aucun tiret cadratin ni emoji', !TIRETS.test(pageM) && !EMOJI.test(pageM));
  const imgs = [...pageM.matchAll(/<img\b[^>]*>/g)].map((m) => m[0]);
  check('photos : couleur seulement, plus aucune photo noir et blanc (-nb)', imgs.length >= 5 && !/-nb\.(jpg|webp)/.test(pageM));
  check('photos : width, height et alt sur chaque image, lazy sauf le hero', imgs.every((i) => /\bwidth="\d+"/.test(i) && /\bheight="\d+"/.test(i) && /\balt="[^"]{10,}"/.test(i)) && imgs.filter((i) => !/loading="lazy"/.test(i)).length === 1);
  const fichiersPhotos = [...new Set([...pageM.matchAll(/\/photos\/([a-z0-9-]+\.(?:jpg|webp))/g)].map((m) => m[1]))];
  check('photos : chaque fichier cite existe dans site v2/photos', fichiersPhotos.length >= 10 && fichiersPhotos.every((f) => fs.existsSync(path.join(RACINE, 'site v2', 'photos', f))), fichiersPhotos.filter((f) => !fs.existsSync(path.join(RACINE, 'site v2', 'photos', f))).join(','));

  if (fs.existsSync(path.join(RACINE, 'dist', 'marques', 'index.html'))) {
    section('marques : site construit');
    const construiteM = lirePage('dist', 'marques', 'index.html');
    const mainM = normal(texteVisible((construiteM.match(/<main[\s\S]*?<\/main>/) || [''])[0]));
    check('dist : objectif, saison, prix de depart et chiffres d audience publies', [SP.objectif_affiche, `ma saison ${SP.saison}`, SP.formules.supporter.prix_affiche, SP.formules.principal.prix_affiche, MQ.collab.video_dediee.prix_affiche, OFFRES.audience.vues_affiche, OFFRES.audience.mediane_affiche].every((t) => mainM.includes(normal(t))));
    check('dist : le contenu de la page est au vouvoiement', !TUTOIEMENT.test(mainM), (mainM.match(new RegExp('.{0,30}(' + TUTOIEMENT.source + ').{0,30}', 'iu')) || [''])[0]);
    check('dist : aucun titre interdit, aucune balise restante', !TITRES.test(mainM) && !construiteM.includes('{{'));
  } else {
    check('dist/marques absent : lance « node scripts/build.js » avant ce test', false);
  }

  console.log(`\n${pass} OK, ${fail} FAIL`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
