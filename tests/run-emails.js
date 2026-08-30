// Harnais de test des fonctions email : Brevo est remplace par un faux fetch qui
// enregistre les appels. Aucun email reel n'est envoye.
process.env.BREVO_API_KEY = 'test-key';
process.env.BREVO_TABLEUR_LIST_ID = '6';
process.env.URL = 'https://preview.example.netlify.app';

const path = require('path');
const FN = path.join(__dirname, '..', 'site v2', 'netlify', 'functions') + path.sep;

let calls = [];
let responder = () => ({ ok: true, status: 200 });

global.fetch = async (url, opts = {}) => {
  const body = opts.body ? JSON.parse(opts.body) : null;
  calls.push({ url, method: opts.method || 'GET', body });
  const r = responder(url, opts, body);
  return {
    ok: r.ok,
    status: r.status,
    json: async () => r.json || {},
    text: async () => r.text || '',
  };
};

let pass = 0, fail = 0;
function check(name, cond, extra) {
  if (cond) { pass++; console.log(`  OK   ${name}`); }
  else { fail++; console.log(`  FAIL ${name}${extra ? ' -> ' + extra : ''}`); }
}
function section(t) { console.log(`\n=== ${t}`); }

function reset(newResponder) {
  calls = [];
  responder = newResponder || (() => ({ ok: true, status: 200 }));
}

const post = (body, ip = '1.2.3.4') => ({
  httpMethod: 'POST',
  headers: { 'x-forwarded-for': ip },
  body: JSON.stringify(body),
});

(async () => {
  // ---------------------------------------------------------------- send-email
  const sendEmail = require(FN + 'send-email.js');
  section('send-email : validation des entrees');

  reset();
  let r = await sendEmail.handler(post({ email: 'pilote@exemple.fr', magnet: 'extrait' }, 'ip-a'));
  check('email valide + magnet extrait -> 200', r.statusCode === 200, r.body);
  const sendCall = calls.find((c) => c.url.includes('/smtp/email'));
  check('2 pieces jointes (extrait PDF + tableur)', sendCall && sendCall.body.attachment.length === 2);
  check('PDF nomme correctement', sendCall && sendCall.body.attachment[0].url.endsWith('/extrait-comprendre-comment-rouler-plus-vite.pdf'), sendCall && sendCall.body.attachment[0].url);
  check('URL des pieces jointes = deploiement courant (process.env.URL)', sendCall && sendCall.body.attachment[0].url.startsWith('https://preview.example.netlify.app'), sendCall && sendCall.body.attachment[0].url);
  check('en-tete List-Unsubscribe present', sendCall && !!sendCall.body.headers['List-Unsubscribe']);
  check('lien de desinscription dans le corps', sendCall && sendCall.body.htmlContent.includes('/desinscription?e='));
  const attrCall = calls.filter((c) => c.method === 'PUT').pop();
  check('EXTRAIT_ENVOYE pose APRES l envoi', attrCall && 'EXTRAIT_ENVOYE' in attrCall.body.attributes, JSON.stringify(attrCall && attrCall.body));
  const orderOk = calls.findIndex((c) => c.url.includes('/smtp/email')) < calls.findIndex((c) => c.method === 'PUT');
  check('ordre : envoi puis marquage de livraison', orderOk);

  reset();
  r = await sendEmail.handler(post({ email: 'pilote@exemple.fr' }, 'ip-b'));
  check('retro-compatibilite : sans champ magnet -> 200 (tableur)', r.statusCode === 200);
  const tabCall = calls.find((c) => c.url.includes('/smtp/email'));
  check('magnet par defaut = 1 seule piece jointe', tabCall && tabCall.body.attachment.length === 1);
  check('magnet par defaut pose TABLEUR_ENVOYE', calls.filter((c) => c.method === 'PUT').pop().body.attributes.TABLEUR_ENVOYE !== undefined);

  for (const [label, payload] of [
    ['email absent', {}],
    ['email vide', { email: '   ' }],
    ['email sans domaine', { email: 'a@' }],
    ['email tableau (typage)', { email: ['a@b.fr', '@'] }],
    ['email trop long', { email: 'a'.repeat(250) + '@b.fr' }],
  ]) {
    reset();
    r = await sendEmail.handler(post(payload, 'ip-c'));
    check(`${label} -> 400 sans appel Brevo`, r.statusCode === 400 && calls.length === 0, `status=${r.statusCode} calls=${calls.length}`);
  }

  reset();
  r = await sendEmail.handler(post({ email: 'x@y.fr', magnet: 'constructor' }, 'ip-d'));
  check('magnet=constructor -> 400 (pas de traversee de prototype)', r.statusCode === 400 && calls.length === 0, `status=${r.statusCode} calls=${calls.length}`);
  reset();
  r = await sendEmail.handler(post({ email: 'x@y.fr', magnet: '__proto__' }, 'ip-d'));
  check('magnet=__proto__ -> 400', r.statusCode === 400 && calls.length === 0);

  section('send-email : rate limit et erreurs');
  reset();
  let last;
  for (let i = 0; i < 7; i++) last = await sendEmail.handler(post({ email: `f${i}@y.fr` }, 'ip-flood'));
  check('6e requete de la meme IP -> 429', last.statusCode === 429, `status=${last.statusCode}`);

  reset((url) => url.includes('/smtp/email')
    ? { ok: false, status: 400, text: 'Brevo: sender not authorized, account 12345' }
    : { ok: true, status: 200 });
  r = await sendEmail.handler(post({ email: 'z@y.fr' }, 'ip-err'));
  check('echec Brevo -> 500', r.statusCode === 500);
  check('detail Brevo non divulgue au client', !r.body.includes('12345') && !r.body.includes('sender not authorized'), r.body);
  check('echec envoi -> aucun attribut de livraison pose', !calls.some((c) => c.method === 'PUT'));

  // -------------------------------------------------------------- relance-guide
  const relance = require(FN + 'relance-guide.js');
  const DAY = 86400000;
  const dayISO = (d) => new Date(Date.now() - d * DAY).toISOString().slice(0, 10);

  function listResponder(contacts, opts = {}) {
    return (url, o) => {
      if (url.includes('/contacts/attributes/')) {
        return opts.attrFail
          ? { ok: false, status: 500, text: 'boom' }
          : { ok: false, status: 400, text: 'Attribute already exist' };
      }
      if (url.includes('/contacts/lists/')) return { ok: true, status: 200, json: { contacts } };
      if (url.includes('/smtp/email')) return opts.sendFail ? { ok: false, status: 500, text: 'send ko' } : { ok: true, status: 201 };
      if (o && o.method === 'PUT') return opts.markFail ? { ok: false, status: 500, text: 'mark ko' } : { ok: true, status: 200 };
      return { ok: true, status: 200 };
    };
  }
  const sentTo = () => calls.filter((c) => c.url.includes('/smtp/email')).map((c) => c.body.to[0].email);

  section('relance-guide : qui est relance');
  const contacts = [
    { email: 'extrait-7j@x.fr', attributes: { EXTRAIT_ENVOYE: dayISO(7.5) } },
    { email: 'extrait-8j@x.fr', attributes: { EXTRAIT_ENVOYE: dayISO(8.5) } },
    { email: 'extrait-3j@x.fr', attributes: { EXTRAIT_ENVOYE: dayISO(3) } },
    { email: 'extrait-20j@x.fr', attributes: { EXTRAIT_ENVOYE: dayISO(20) } },
    { email: 'tableur-seul@x.fr', attributes: { TABLEUR_ENVOYE: dayISO(8), SOURCE: 'tableur-reglages' } },
    { email: 'historique@x.fr', attributes: {}, createdAt: new Date(Date.now() - 8 * DAY).toISOString() },
    { email: 'deja-relance@x.fr', attributes: { EXTRAIT_ENVOYE: dayISO(8), RELANCE_GUIDE: dayISO(1) } },
    { email: 'blackliste@x.fr', attributes: { EXTRAIT_ENVOYE: dayISO(8) }, emailBlacklisted: true },
  ];
  reset(listResponder(contacts));
  await relance.handler();
  const sent = sentTo();
  check('relance les 2 contacts servis dans la fenetre 7-9j', sent.length === 2, JSON.stringify(sent));
  check('inscrit tableur JAMAIS relance (le mail parle de l extrait)', !sent.includes('tableur-seul@x.fr'));
  check('contact historique sans attribut jamais relance', !sent.includes('historique@x.fr'));
  check('hors fenetre (3j et 20j) non relances', !sent.includes('extrait-3j@x.fr') && !sent.includes('extrait-20j@x.fr'));
  check('deja relance -> ignore', !sent.includes('deja-relance@x.fr'));
  check('blackliste -> ignore', !sent.includes('blackliste@x.fr'));
  check('le plus ancien traite en premier', sent[0] === 'extrait-8j@x.fr', JSON.stringify(sent));
  const iMark = calls.findIndex((c) => c.method === 'PUT' && c.body.attributes && c.body.attributes.RELANCE_GUIDE);
  const iSend = calls.findIndex((c) => c.url.includes('/smtp/email'));
  check('marquage AVANT envoi (at-most-once)', iMark >= 0 && iMark < iSend, `mark=${iMark} send=${iSend}`);
  check('lien de desinscription dans la relance', calls.find((c) => c.url.includes('/smtp/email')).body.htmlContent.includes('/desinscription?e='));

  section('relance-guide : modes degrades');
  reset(listResponder(contacts, { attrFail: true }));
  await relance.handler();
  check('attribut non creable -> run avorte AVANT tout envoi', sentTo().length === 0, JSON.stringify(sentTo()));

  reset(listResponder(contacts, { markFail: true }));
  await relance.handler();
  check('marquage impossible -> aucun envoi (jamais de doublon)', sentTo().length === 0, JSON.stringify(sentTo()));

  reset(listResponder([], {}));
  await relance.handler();
  check('liste vide -> aucun envoi', sentTo().length === 0);

  // pagination : 500 contacts eligibles -> plafond respecte
  const many = Array.from({ length: 500 }, (_, i) => ({ email: `p${i}@x.fr`, attributes: { EXTRAIT_ENVOYE: dayISO(7.5) } }));
  reset((url, o) => {
    if (url.includes('/contacts/attributes/')) return { ok: false, status: 400, text: 'Attribute already exist' };
    if (url.includes('/contacts/lists/')) return { ok: true, status: 200, json: { contacts: url.includes('offset=0') ? many : [] } };
    if (url.includes('/smtp/email')) return { ok: true, status: 201 };
    return { ok: true, status: 200 };
  });
  await relance.handler();
  check('plafond de 40 envois par run respecte', sentTo().length === 40, String(sentTo().length));

  // --------------------------------------------------------------- desinscription
  const desinsc = require(FN + 'desinscription.js');
  section('desinscription');
  const crypto = require('crypto');
  const tok = (e) => crypto.createHmac('sha256', 'test-key').update(e.toLowerCase()).digest('hex').slice(0, 32);

  reset();
  r = await desinsc.handler({ httpMethod: 'GET', path: '/.netlify/functions/desinscription', queryStringParameters: { e: 'a@b.fr', t: tok('a@b.fr') } });
  check('GET avec jeton valide -> page de confirmation', r.statusCode === 200 && r.body.includes('<form method="POST"'));
  check('GET ne desinscrit PAS (anti-prefetch des scanners)', calls.length === 0);

  reset();
  r = await desinsc.handler({ httpMethod: 'POST', path: '/.netlify/functions/desinscription', queryStringParameters: { e: 'a@b.fr', t: tok('a@b.fr') } });
  check('POST avec jeton valide -> 200', r.statusCode === 200);
  check('POST blackliste bien le contact chez Brevo', calls.some((c) => c.method === 'PUT' && c.body.emailBlacklisted === true));

  reset();
  r = await desinsc.handler({ httpMethod: 'POST', path: '/x', queryStringParameters: { e: 'a@b.fr', t: 'mauvais-jeton' } });
  check('jeton invalide -> 400 sans appel Brevo', r.statusCode === 400 && calls.length === 0);
  reset();
  r = await desinsc.handler({ httpMethod: 'POST', path: '/x', queryStringParameters: { e: 'victime@b.fr', t: tok('a@b.fr') } });
  check('jeton d une autre adresse -> refuse', r.statusCode === 400 && calls.length === 0);
  reset();
  r = await desinsc.handler({ httpMethod: 'POST', path: '/x', queryStringParameters: { e: 'a@b.fr', t: tok('A@B.FR') } });
  check('jeton insensible a la casse de l adresse', r.statusCode === 200);

  reset((url, o) => (o.method === 'PUT' ? { ok: false, status: 404, text: 'not found' } : { ok: true, status: 200 }));
  r = await desinsc.handler({ httpMethod: 'POST', path: '/x', queryStringParameters: { e: 'inconnu@b.fr', t: tok('inconnu@b.fr') } });
  check('contact inconnu de Brevo (404) -> succes quand meme', r.statusCode === 200);

  console.log(`\n${pass} tests OK, ${fail} echecs`);
  process.exit(fail ? 1 : 0);
})();

