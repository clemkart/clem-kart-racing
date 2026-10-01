// Harnais de test de la collecte (track-site.js) : Supabase est remplace par un faux
// fetch qui garde les lignes inserees. Aucune donnee reelle ecrite.
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
process.env.URL = 'https://comprendre-comment-rouler-plus-vite.netlify.app';

const path = require('path');
const FN = path.join(__dirname, '..', 'site v2', 'netlify', 'functions', 'track-site.js');

const SITE1 = 'comprendre-comment-rouler-plus-vite.netlify.app';
const SITE2 = 'comprendre-comment-rouler-plus-vite-2.netlify.app';

let inserees = [];
global.fetch = async (url, opts) => {
  inserees.push(JSON.parse(opts.body));
  return new Response('', { status: 201 });
};

let pass = 0, fail = 0;
function check(name, cond, extra) {
  if (cond) { pass++; console.log(`  OK   ${name}`); }
  else { fail++; console.log(`  FAIL ${name}${extra !== undefined ? ' -> ' + extra : ''}`); }
}
function section(t) { console.log(`\n=== ${t}`); }

let ip = 0;
(async () => {
  const track = require(FN);
  // Une IP differente par appel : le rate limit ne doit pas fausser les tests.
  const envoi = async (body, { base64 = false, headers = {} } = {}) => {
    inserees = [];
    const brut = typeof body === 'string' ? body : JSON.stringify(body);
    const r = await track.handler({
      httpMethod: 'POST',
      headers: Object.assign({ 'x-forwarded-for': `10.0.0.${++ip}`, 'user-agent': 'Mozilla/5.0 (iPhone)', host: SITE1 }, headers),
      body: base64 ? Buffer.from(brut).toString('base64') : brut,
      isBase64Encoded: base64,
    });
    return { statusCode: r.statusCode, ligne: inserees[0] || null };
  };

  section('types du tunnel du debrief');
  for (const type of ['diag_click', 'diag_start', 'diag_step', 'diag_exit', 'diag_result', 'stripe_click', 'faq_open']) {
    const { ligne } = await envoi({ type, site: SITE2, path: '/onboard/', session_id: 's1' });
    check(`type ${type} accepte`, ligne && ligne.type === type);
  }
  let r = await envoi({ type: 'type_invente', site: SITE2, path: '/onboard/' });
  check('type inconnu ignore, reponse 204 quand meme', r.statusCode === 204 && r.ligne === null);

  section('site 2 identifie dans les donnees');
  r = await envoi({ type: 'pageview', site: SITE2, path: '/onboard/', referrer: `https://${SITE2}/`, session_id: 's2' });
  check('meta.site = site2', r.ligne && r.ligne.meta && r.ligne.meta.site === 'site2', JSON.stringify(r.ligne && r.ligne.meta));
  check('navigation interne au site 2 = source direct', r.ligne && r.ligne.source === 'direct', r.ligne && r.ligne.source);

  r = await envoi({ type: 'stripe_click', site: SITE2, path: '/onboard/', session_id: 's2', meta: { cta: 'prix', zone: 'frein' } });
  check('les meta existantes sont gardees avec le site', r.ligne && r.ligne.meta.cta === 'prix' && r.ligne.meta.zone === 'frein' && r.ligne.meta.site === 'site2', JSON.stringify(r.ligne && r.ligne.meta));

  r = await envoi({ type: 'pageview', site: `6aaa67e132e52cb3305791ad--${SITE2}`, path: '/', session_id: 's3' });
  check('adresse de brouillon Netlify = site2-brouillon', r.ligne && r.ligne.meta && r.ligne.meta.site === 'site2-brouillon', JSON.stringify(r.ligne && r.ligne.meta));

  r = await envoi({ type: 'pageview', site: `abc--${SITE1}`, path: '/guide/', session_id: 's3b' });
  check('brouillon Netlify du site 1 = site1-brouillon (jamais compte comme production)', r.ligne && r.ligne.meta && r.ligne.meta.site === 'site1-brouillon', JSON.stringify(r.ligne && r.ligne.meta));

  r = await envoi({ type: 'stripe_click', site: SITE1, path: '/guide/', session_id: 's3c', meta: { cta: 'guide' } });
  check('site 1 en production : aucune etiquette (historique inchange)', r.ligne && r.ligne.meta && !r.ligne.meta.site, JSON.stringify(r.ligne && r.ligne.meta));

  r = await envoi({ type: 'pageview', site: '127.0.0.1', path: '/onboard/', session_id: 's4' });
  check('apercu local = local', r.ligne && r.ligne.meta && r.ligne.meta.site === 'local', JSON.stringify(r.ligne && r.ligne.meta));

  r = await envoi({ type: 'pageview', site: 'site-pirate.example.com', path: '/', session_id: 's5' });
  check('site inconnu : aucune etiquette inventee', r.ligne && (!r.ligne.meta || !r.ligne.meta.site), JSON.stringify(r.ligne && r.ligne.meta));

  r = await envoi({ type: 'pageview', site: SITE2, path: '/onboard/', referrer: 'https://l.instagram.com/', session_id: 's6' });
  check('une arrivee depuis Instagram reste instagram', r.ligne && r.ligne.source === 'instagram', r.ligne && r.ligne.source);

  section('site 1 inchange');
  r = await envoi({ type: 'gumroad_click', path: '/extrait-guide.html', session_id: 's7', meta: { cta: 'btn-red' } });
  check('evenement du site 1 sans etiquette de site', r.ligne && r.ligne.meta && !r.ligne.meta.site && r.ligne.meta.cta === 'btn-red', JSON.stringify(r.ligne && r.ligne.meta));

  section('V4 : page de liens (/liens) et portes /aller/* du site 1');
  r = await envoi({ type: 'bio_click', path: '/liens', session_id: 's9', utm_source: 'instagram', utm_medium: 'bio',
    meta: { bouton: 'guide', position: 1, plateforme: 'instagram', cible: '/guide' } });
  check('bio_click accepte', r.ligne && r.ligne.type === 'bio_click');
  check('bio_click garde bouton, position, plateforme, cible', r.ligne && r.ligne.meta && r.ligne.meta.bouton === 'guide' && r.ligne.meta.position === 1 && r.ligne.meta.plateforme === 'instagram' && r.ligne.meta.cible === '/guide', JSON.stringify(r.ligne && r.ligne.meta));
  check('bio_click du site 1 : pas d etiquette de site, source = instagram (UTM)', r.ligne && !r.ligne.meta.site && r.ligne.source === 'instagram', r.ligne && r.ligne.source);

  r = await envoi({ type: 'stripe_click', path: '/guide', session_id: 's9', meta: { cta: 'haut', zone: 'prix', route: '/aller/guide', cible: 'guide' } });
  check('stripe_click du site 1 accepte (porte /aller/guide)', r.ligne && r.ligne.type === 'stripe_click' && r.ligne.path === '/guide');
  check('stripe_click garde cta, zone, route, cible', r.ligne && r.ligne.meta && r.ligne.meta.cta === 'haut' && r.ligne.meta.zone === 'prix' && r.ligne.meta.route === '/aller/guide' && r.ligne.meta.cible === 'guide', JSON.stringify(r.ligne && r.ligne.meta));
  check('stripe_click du site 1 : pas d etiquette de site', r.ligne && !r.ligne.meta.site);

  r = await envoi({ type: 'bio_click', path: '/liens', session_id: 's10', meta: { bouton: 'x'.repeat(500), position: '3', plateforme: { hack: true }, cible: null, note: 12.7 } });
  check('bio_click : chaine trop longue tronquee a 120', r.ligne && r.ligne.meta && r.ligne.meta.bouton.length === 120, r.ligne && r.ligne.meta && r.ligne.meta.bouton.length);
  check('bio_click : objet, null jetes ; position texte gardee telle quelle ; nombre tronque en entier', r.ligne && r.ligne.meta && !('plateforme' in r.ligne.meta) && !('cible' in r.ligne.meta) && r.ligne.meta.position === '3' && r.ligne.meta.note === 12, JSON.stringify(r.ligne && r.ligne.meta));

  r = await envoi({ type: 'bio_click', path: '/liens', session_id: 's11', meta: { bouton: 'guide', position: 1 }, referrer: 'https://l.instagram.com/' });
  check('bio_click sans UTM : source depuis le referrer', r.ligne && r.ligne.source === 'instagram', r.ligne && r.ligne.source);

  section('format du corps');
  r = await envoi({ type: 'diag_start', site: SITE2, path: '/onboard/', session_id: 's8' }, { base64: true });
  check('corps encode en base64 par Netlify : lu correctement', r.ligne && r.ligne.type === 'diag_start');
  r = await envoi('pas du json');
  check('corps illisible : 204 silencieux, rien insere', r.statusCode === 204 && r.ligne === null);

  console.log(`\n${pass} tests OK, ${fail} echecs`);
  process.exit(fail ? 1 : 0);
})();
