// Harnais de test du diagnostic de pilotage (page /diagnostic et fonction diagnostic).
// Brevo est remplace par un faux fetch qui enregistre les appels : aucun email reel ne part.
// Lancer : node tests/run-diagnostic.js
'use strict';

process.env.BREVO_API_KEY = 'test-key';
process.env.URL = 'https://exemple-site.netlify.app';
delete process.env.BREVO_DIAGNOSTIC_LIST_ID;
process.env.BREVO_TABLEUR_LIST_ID = '6';

const fs = require('fs');
const path = require('path');
const RACINE = path.join(__dirname, '..');
const SITE = path.join(RACINE, 'site v2');
const OFFRES = require(path.join(RACINE, 'config', 'offres.json'));
const D = require(path.join(SITE, 'assets', 'diagnostic-donnees.js'));
const FN = path.join(SITE, 'netlify', 'functions', 'diagnostic.js');

let echecs = 0;
function check(nom, condition, detail) {
  if (condition) console.log('  OK   ' + nom);
  else { console.log('  FAIL ' + nom + (detail ? ' : ' + detail : '')); echecs += 1; }
}

// ---------- 1. Les donnees : questions, points, poids ----------
console.log('\n=== test:diagnostic, controle 1 : questions et points');
const QUESTIONS = D.ECRANS.filter((e) => e.type === 'choix');
const ids = D.ECRANS.filter((e) => e.id).map((e) => e.id);
check('identifiants de question uniques', new Set(ids).size === ids.length);
check('25 questions (24 a choix et le prenom)', QUESTIONS.length === 24 && D.ECRANS.filter((e) => e.type === 'texte').length === 1);
check('9 points, un par chapitre de pilotage (03 a 11)', D.ORDRE.length === 9 && D.PAR_CHAPITRE.map((a) => D.POINTS[a].ch).join(',') === '03,04,05,06,07,08,09,10,11');
const contexte = D.ECRANS.filter((e) => e.s === 0 && (e.type === 'choix' || e.type === 'texte'));
check('4 questions de contexte au plus', contexte.length <= 4, String(contexte.length));
check('aucune question sur la piste ni sur le nombre de virages', !ids.includes('circuit') && !ids.includes('virages'));
const kart = QUESTIONS.find((q) => q.id === 'kart');
check('categorie de kart : pas de « je ne sais pas »', kart && !kart.o.some((o) => /ne sais pas/i.test(o[0])));
let poidsInconnus = [];
QUESTIONS.forEach((q) => q.o.forEach((o) => Object.keys(o[1] || {}).forEach((a) => { if (!D.POINTS[a]) poidsInconnus.push(q.id + ':' + a); })));
check('chaque poids vise un point connu', poidsInconnus.length === 0, poidsInconnus.join(', '));
const max = D.maxParPoint();
check('chaque point est mesure par au moins une question', D.ORDRE.every((a) => max[a] > 0));
const etapes = D.ECRANS.filter((e) => typeof e.s === 'number').map((e) => e.s);
check('les etapes se suivent dans l ordre', etapes.every((s, i) => i === 0 || s >= etapes[i - 1]));
const derniers = QUESTIONS.slice(-3).map((q) => q.s);
check('les dernieres questions parlent des objectifs', derniers.every((s) => s === D.ETAPES.length - 1));

// ---------- 2. Le calcul ----------
console.log('\n=== test:diagnostic, controle 2 : calcul');
const propre = {};
QUESTIONS.forEach((q) => { const k = q.o.findIndex((o) => !o[1] || !Object.keys(o[1]).length); propre[q.id] = k < 0 ? 0 : k; });
const rPropre = D.scorer(propre);
check('profil sans alerte : indice 100', rPropre.indice === 100, String(rPropre.indice));
check('3 priorites et 2 points forts, jamais les memes', rPropre.forts.length === 2 && rPropre.forts.every((a) => !rPropre.priorites.slice(0, 3).includes(a)));
const frein = { ...propre, frein: 1, lacher: 2, cr_temps: 0 };
check('frein garde jusqu a la corde : le freinage degressif passe en priorite 1', D.scorer(frein).priorites[0] === 'FREIN');
const gaz = { ...propre, gaz: 0, sortie: 0 };
check('gaz remis trop tot : le point d acceleration passe en priorite 1', D.scorer(gaz).priorites[0] === 'GAZ');
const pire = {};
QUESTIONS.forEach((q) => { let best = 0, total = -1; q.o.forEach((o, k) => { const t = Object.values(o[1] || {}).reduce((s, n) => s + n, 0); if (t > total) { total = t; best = k; } }); pire[q.id] = best; });
const rPire = D.scorer(pire);
check('aucun score sous 40 ni au-dessus de 100', Object.values(rPire.scores).every((s) => s >= 40 && s <= 100));
check('reponses ecrites par le pilote : ignorees par le calcul, sans erreur', D.scorer({ ...propre, gaz: { autre: 'texte' } }).indice === 100);
check('marge : une fourchette en dixiemes pour chaque niveau', [40, 60, 75, 90].every((n) => /dixième/.test(D.marge(n))));

// ---------- 3. Textes : vocabulaire impose ----------
console.log('\n=== test:diagnostic, controle 3 : textes');
const SOURCES = ['assets/diagnostic-donnees.js', 'assets/diagnostic.js', 'diagnostic/index.html', 'netlify/functions/diagnostic.js'].map((f) => [f, fs.readFileSync(path.join(SITE, f), 'utf8')]);
const TEXTE = SOURCES.map((s) => s[1]).join('\n');
check('aucun tiret cadratin ni demi-cadratin', !/[–—]/.test(TEXTE));
check('aucun emoji', !/[\u{1F000}-\u{1FAFF}]/u.test(TEXTE));
check('jamais « PDF » ni « guide » dans les textes du diagnostic', !/\bPDF\b/.test(TEXTE.replace(/cgv\.pdf/gi, '')) && !/\bguide\b/i.test(SOURCES[0][1] + SOURCES[1][1]));
check('jamais coach, entraineur, moniteur', !/(?<![\p{L}])(coach|coaching|entra[iî]neur|moniteur)(?![\p{L}])/iu.test(TEXTE));
const sansFrein = (SOURCES[0][1] + SOURCES[1][1]).match(/relâché(?! de frein)/g) || [];
check('« relâché » toujours suivi de « de frein »', sansFrein.length === 0, String(sansFrein.length));
check('le resultat parle de « diagnostic », plus de « profil pilote »', !/profil pilote/i.test(TEXTE));
check('le plan est ecrit a la main : « pas une IA » est dit sur la page', /pas une IA/.test(SOURCES[1][1]));
check('aucun prix ecrit en dur dans le script ni dans la page', !/\d+[,.]\d{2}\s*(€|&euro;)/.test(SOURCES[1][1] + SOURCES[2][1]));
check('aucun lien Stripe en dur', !/buy\.stripe\.com/.test(TEXTE));

// ---------- 4. La configuration ----------
console.log('\n=== test:diagnostic, controle 4 : configuration');
const cfg = OFFRES.diagnostic || {};
check('prix du plan : nombre et affichage coherents', typeof cfg.prix === 'number' && cfg.prix_affiche === cfg.prix.toFixed(2).replace('.', ',') + ' €');
check('route /diagnostic et page presente', OFFRES.routes.diagnostic === '/diagnostic' && fs.existsSync(path.join(SITE, 'diagnostic', 'index.html')));
const stripe = cfg.stripe || {};
if (stripe.pret === 'oui') {
  check('Stripe pret : deux liens buy.stripe.com et leurs identifiants', /^https:\/\/buy\.stripe\.com\//.test(stripe.url) && /^https:\/\/buy\.stripe\.com\//.test(stripe.url_camera) && /^plink_/.test(stripe.plink) && /^plink_/.test(stripe.plink_camera));
} else {
  check('Stripe pas encore pret : la page cache le bouton (stripe.pret = non)', stripe.pret === 'non');
  console.log('  ATTENTION le plan d action n est pas encore achetable (diagnostic.stripe.pret = non).');
}

// ---------- 5. La fonction ----------
console.log('\n=== test:diagnostic, controle 5 : fonction');
const appels = [];
let brevoEnPanne = false;
global.fetch = async (url, opts = {}) => {
  appels.push({ url: String(url), corps: opts.body ? JSON.parse(opts.body) : null });
  if (brevoEnPanne && /smtp\/email/.test(String(url))) return { ok: false, status: 500, text: async () => '{"message":"panne"}' };
  return { ok: true, status: 201, text: async () => '{"messageId":"test"}' };
};
const { handler, _interne } = require(FN);
const SITE_HOTE = 'https://exemple-site.netlify.app';
let ipCompteur = 0;
function evenement(corps, { origine = SITE_HOTE, type = 'application/json', ip } = {}) {
  ipCompteur += 1;
  return { httpMethod: 'POST', headers: { 'content-type': type, origin: origine, 'x-nf-client-connection-ip': ip || '10.0.0.' + ipCompteur }, body: typeof corps === 'string' ? corps : JSON.stringify(corps) };
}
const valide = () => ({ prenom: 'Lucas', email: 'lucas@example.com', consent: false, reponses: { ...frein, gaz: { autre: 'Quand <script>ca</script> accroche' } }, libre: 'Dans l epingle je sors large', utm: { utm_source: 'tiktok', utm_content: 'v12-freinage' }, site_web: '' });

(async () => {
  let r = await handler({ httpMethod: 'GET', headers: {} });
  check('GET refuse (405)', r.statusCode === 405);
  r = await handler(evenement('prenom=x', { type: 'application/x-www-form-urlencoded' }));
  check('formulaire non JSON refuse (415)', r.statusCode === 415);
  r = await handler(evenement(valide(), { origine: 'https://autre-site.example' }));
  check('autre site refuse (403)', r.statusCode === 403 && appels.length === 0);
  r = await handler(evenement('{pas du json'));
  check('JSON illisible refuse (400)', r.statusCode === 400);
  r = await handler(evenement({ ...valide(), email: 'pasbon' }));
  check('email invalide refuse (400), rien n est envoye', r.statusCode === 400 && appels.length === 0);
  r = await handler(evenement({ ...valide(), reponses: { frein: 1 } }));
  check('diagnostic presque vide refuse (400)', r.statusCode === 400 && appels.length === 0);
  r = await handler(evenement({ ...valide(), site_web: 'http://spam.example' }));
  check('pot de miel : 200 sans aucun envoi', r.statusCode === 200 && appels.length === 0);

  r = await handler(evenement(valide()));
  const mails = appels.filter((a) => /smtp\/email/.test(a.url));
  check('envoi valide : 200 et deux emails', r.statusCode === 200 && mails.length === 2, r.statusCode + ' / ' + mails.length);
  const interne = mails[0] ? mails[0].corps : {};
  const client = mails[1] ? mails[1].corps : {};
  check('la copie part a Clement, le pilote en « repondre a »', interne.to && interne.to[0].email === OFFRES.contact.email && interne.replyTo && interne.replyTo.email === 'lucas@example.com');
  check('la copie contient les reponses, le texte libre et la source', /Fort, et je garde le frein/.test(interne.textContent) && /epingle/.test(interne.textContent) && /tiktok/.test(interne.textContent));
  check('le texte ecrit par le pilote est echappe dans le HTML', !/<script>/.test(interne.htmlContent) && /&lt;script&gt;/.test(interne.htmlContent));
  check('le pilote recoit son diagnostic et ses 3 points', client.to && client.to[0].email === 'lucas@example.com' && /freinage dégressif/i.test(client.textContent) && /3 premiers points/.test(client.textContent));
  check('aucun lien de paiement direct dans un email', !/buy\.stripe\.com|\/aller\//.test(interne.htmlContent + client.htmlContent));
  check('aucun tiret cadratin dans les emails', !/[–—]/.test(interne.htmlContent + client.htmlContent + interne.textContent + client.textContent));
  check('sans la case cochee : aucun contact cree dans Brevo', !appels.some((a) => /\/contacts/.test(a.url)));

  appels.length = 0;
  r = await handler(evenement({ ...valide(), consent: true }));
  const contact = appels.find((a) => /\/v3\/contacts$/.test(a.url));
  check('case cochee : contact Brevo avec la source et la liste', r.statusCode === 200 && contact && contact.corps.attributes.SOURCE === 'diagnostic' && contact.corps.listIds[0] === 6);

  appels.length = 0; brevoEnPanne = true;
  r = await handler(evenement(valide()));
  check('Brevo en panne : 502, la page propose de reessayer', r.statusCode === 502);
  brevoEnPanne = false;

  _interne.limiteurIp.vider();
  let dernier;
  for (let i = 0; i < 6; i += 1) dernier = await handler(evenement(valide(), { ip: '10.9.9.9' }));
  check('6e envoi de la meme adresse IP dans l heure : refuse (429)', dernier.statusCode === 429);

  console.log(echecs ? `\ntest:diagnostic ROUGE (${echecs} probleme(s))` : '\ntest:diagnostic VERT');
  process.exit(echecs ? 1 : 0);
})().catch((err) => { console.error(err); process.exit(1); });
