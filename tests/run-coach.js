#!/usr/bin/env node
/* Tests de coach.js : mot de passe verifie a duree constante et limite d essais par IP.
   Aucun appel reseau : sans ANTHROPIC_API_KEY, un mot de passe juste renvoie « indisponible ».
   Usage : node tests/run-coach.js */
'use strict';

const path = require('path');

process.env.DASHBOARD_PASSWORD = 'mot-de-passe-de-test';
delete process.env.ANTHROPIC_API_KEY;

const coach = require(path.join(__dirname, '..', 'site v2', 'netlify', 'functions', 'coach.js'));

let ok = 0;
let ko = 0;
function check(nom, condition, detail) {
  if (condition) { ok++; console.log('  OK   ' + nom); } else { ko++; console.log('  FAIL ' + nom + (detail !== undefined ? ' -> ' + detail : '')); }
}

function appel(corps, ip) {
  return coach.handler({
    httpMethod: 'POST',
    headers: { origin: 'http://localhost:8888', 'x-nf-client-connection-ip': ip },
    body: typeof corps === 'string' ? corps : JSON.stringify(corps),
  });
}

(async () => {
  console.log('\n=== mot de passe');
  coach._limiteur.vider();
  let r = await appel({ password: 'faux' }, '10.1.0.1');
  check('mot de passe faux : 401', r.statusCode === 401, r.statusCode);
  r = await appel({ password: 12345 }, '10.1.0.1');
  check('mot de passe qui n est pas un texte : 401', r.statusCode === 401, r.statusCode);
  r = await appel({}, '10.1.0.1');
  check('mot de passe absent : 401', r.statusCode === 401, r.statusCode);
  r = await appel('pas du json', '10.1.0.1');
  check('corps illisible : 401', r.statusCode === 401, r.statusCode);
  r = await appel({ password: 'mot-de-passe-de-test' }, '10.1.0.1');
  check('mot de passe juste sans cle Anthropic : 200 indisponible', r.statusCode === 200 && JSON.parse(r.body).indisponible === true, r.statusCode + ' ' + r.body);

  console.log('\n=== limite d essais par IP');
  coach._limiteur.vider();
  const statuts = [];
  for (let i = 0; i < 11; i++) statuts.push((await appel({ password: 'essai-' + i }, '10.2.0.1')).statusCode);
  check('10 essais rates : 401 chacun', statuts.slice(0, 10).every((s) => s === 401), statuts.join(','));
  check('11e essai : 429, sans verifier le mot de passe', statuts[10] === 429, statuts[10]);
  r = await appel({ password: 'mot-de-passe-de-test' }, '10.2.0.1');
  check('meme le bon mot de passe est refuse une fois la limite atteinte', r.statusCode === 429 && Number(r.headers['Retry-After']) > 0, r.statusCode);
  r = await appel({ password: 'mot-de-passe-de-test' }, '10.2.0.2');
  check('une autre IP n est pas bloquee', r.statusCode === 200, r.statusCode);

  console.log('\n=== methodes');
  r = await coach.handler({ httpMethod: 'GET', headers: {}, body: '' });
  check('GET : 405', r.statusCode === 405, r.statusCode);

  console.log(`\n${ok} tests OK, ${ko} echecs`);
  process.exit(ko ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
