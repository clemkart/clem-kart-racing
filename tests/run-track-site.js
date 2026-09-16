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

  r = await envoi({ type: 'pageview', site: '127.0.0.1', path: '/onboard/', session_id: 's4' });
  check('apercu local = local', r.ligne && r.ligne.meta && r.ligne.meta.site === 'local', JSON.stringify(r.ligne && r.ligne.meta));

  r = await envoi({ type: 'pageview', site: 'site-pirate.example.com', path: '/', session_id: 's5' });
  check('site inconnu : aucune etiquette inventee', r.ligne && (!r.ligne.meta || !r.ligne.meta.site), JSON.stringify(r.ligne && r.ligne.meta));

  r = await envoi({ type: 'pageview', site: SITE2, path: '/onboard/', referrer: 'https://l.instagram.com/', session_id: 's6' });
  check('une arrivee depuis Instagram reste instagram', r.ligne && r.ligne.source === 'instagram', r.ligne && r.ligne.source);

  section('site 1 inchange');
  r = await envoi({ type: 'gumroad_click', path: '/extrait-guide.html', session_id: 's7', meta: { cta: 'btn-red' } });
  check('evenement du site 1 sans etiquette de site', r.ligne && r.ligne.meta && !r.ligne.meta.site && r.ligne.meta.cta === 'btn-red', JSON.stringify(r.ligne && r.ligne.meta));

  section('format du corps');
  r = await envoi({ type: 'diag_start', site: SITE2, path: '/onboard/', session_id: 's8' }, { base64: true });
  check('corps encode en base64 par Netlify : lu correctement', r.ligne && r.ligne.type === 'diag_start');
  r = await envoi('pas du json');
  check('corps illisible : 204 silencieux, rien insere', r.statusCode === 204 && r.ligne === null);

  console.log(`\n${pass} tests OK, ${fail} echecs`);
  process.exit(fail ? 1 : 0);
})();
