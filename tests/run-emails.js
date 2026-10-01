// Harnais de test des fonctions email : Brevo est remplace par un faux fetch qui
// enregistre les appels. Aucun email reel n'est envoye.
process.env.BREVO_API_KEY = 'test-key';
process.env.BREVO_TABLEUR_LIST_ID = '6';
process.env.URL = 'https://preview.example.netlify.app';

const path = require('path');
const FN = path.join(__dirname, '..', 'site v2', 'netlify', 'functions') + path.sep;
// Seul point de verite : les tests lisent la config, jamais un prix ou une adresse en dur.
const OFFRES = require(path.join(__dirname, '..', 'config', 'offres.json'));
const SITE_PUBLIC = OFFRES.sites[OFFRES.sites.actif];
const PAGE_GUIDE = SITE_PUBLIC + OFFRES.routes.guide;
// Le prix tel qu'il sort dans un email : l'espace avant le symbole devient &nbsp;
const PRIX_GUIDE_HTML = OFFRES.guide.prix_affiche.replace(/[\u00a0\u202f ]/g, '&nbsp;');
// Interdits absolus dans tout ce que Clement envoie : tiret cadratin, demi-cadratin, emoji.
const TIRETS = /[\u2013\u2014]/;
const EMOJI = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}]/u;
const VENTE_DIRECTE = /gumroad\.com|buy\.stripe\.com/;

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

  section('send-email : contenu du mail de livraison');
  const htmlExtrait = sendCall.body.htmlContent;
  check('dit explicitement que les fichiers sont joints', /fichiers joints à cet email/i.test(htmlExtrait));
  check('demande de telecharger les pieces jointes', /Pense à les télécharger/i.test(htmlExtrait));
  check('explique ou les trouver sur telephone', /tout en bas du message/i.test(htmlExtrait));
  check('nomme les deux fichiers dans le corps', /Extrait du guide \(PDF\)/.test(htmlExtrait) && /Tableur de réglages kart \(Excel\)/.test(htmlExtrait));
  check('jamais Stripe en direct, jamais Gumroad dans le mail de livraison', !VENTE_DIRECTE.test(htmlExtrait), 'lien de vente direct trouve');
  check('mise en page en tableaux (compatible Outlook/Gmail)', htmlExtrait.includes('role="presentation"') && !htmlExtrait.includes('display:flex'));
  check('texte d apercu (preheader) present', htmlExtrait.includes('mso-hide:all'));
  check('objet mentionne la piece jointe', /pièce jointe/i.test(sendCall.body.subject), sendCall.body.subject);
  check('aucun tiret cadratin ni demi-cadratin (objet + corps)', !TIRETS.test(sendCall.body.subject) && !TIRETS.test(htmlExtrait));
  check('aucun emoji (objet + corps)', !EMOJI.test(sendCall.body.subject) && !EMOJI.test(htmlExtrait), sendCall.body.subject);
  check('ni or, ni vert, ni violet dans la palette du mail', !/#C9A84C/i.test(htmlExtrait));

  section('send-email : config/offres.json comme seule source');
  check('expediteur = contact.email de la config', sendCall.body.sender.email === OFFRES.contact.email && sendCall.body.sender.name === OFFRES.marque.nom, JSON.stringify(sendCall.body.sender));
  check('signature = marque.signature de la config', htmlExtrait.includes(`<strong style="color:#f2ede8;">${OFFRES.marque.signature}</strong>`));
  check('la ligne de faits suit faits.afficher_titre', OFFRES.faits.afficher_titre ? /Champion régional 2023/.test(htmlExtrait) : !/Champion/.test(htmlExtrait));
  check('reponses dirigees vers contact.email (replyTo)', sendCall.body.replyTo && sendCall.body.replyTo.email === OFFRES.contact.email, JSON.stringify(sendCall.body.replyTo));
  check('email de contact de la config ecrit dans le corps', htmlExtrait.includes(`mailto:${OFFRES.contact.email}`));

  section('send-email : le guide en P.S., vers la page /guide seulement');
  // Tous les liens hors desinscription et mailto : il ne doit en rester qu'un, vers /guide.
  const liensVente = (html) => (html.match(/href="([^"]+)"/g) || [])
    .map((h) => h.slice(6, -1))
    .filter((u) => !u.includes('/desinscription?') && !u.startsWith('mailto:'));
  const lienGuideExtrait = `${PAGE_GUIDE}?utm_source=email&utm_medium=livraison&utm_campaign=j0-extrait`;
  check('mail extrait : un seul lien de vente, vers /guide du site actif avec son UTM', JSON.stringify(liensVente(htmlExtrait)) === JSON.stringify([lienGuideExtrait]), JSON.stringify(liensVente(htmlExtrait)));
  check('mail extrait : prix = guide.prix_affiche de la config', htmlExtrait.includes(PRIX_GUIDE_HTML), PRIX_GUIDE_HTML);
  check('mail extrait : aucun autre prix que celui de la config', (htmlExtrait.match(/\d+,\d\d(&nbsp;|\s)*€/g) || []).every((p) => p === PRIX_GUIDE_HTML), JSON.stringify(htmlExtrait.match(/\d+,\d\d(&nbsp;|\s)*€/g)));
  check('mail extrait : garantie = garantie_jours de la config, en plus des droits legaux', htmlExtrait.includes(`garantie ${OFFRES.garantie_jours}&nbsp;jours en plus de tes droits légaux`));
  check('mail extrait : nombre de chapitres lu dans la config', htmlExtrait.includes(`${OFFRES.guide.chapitres}&nbsp;chapitres`));
  check('mail extrait : le prix arrive apres la livraison (P.S. sous la signature)', htmlExtrait.indexOf(PRIX_GUIDE_HTML) > htmlExtrait.indexOf('fichiers joints à cet email') && htmlExtrait.indexOf(PRIX_GUIDE_HTML) > htmlExtrait.indexOf('Bonnes sessions'));

  process.env.SITE_ASSETS_URL = 'https://assets.example.test';
  reset();
  r = await sendEmail.handler(post({ email: 'pilote@exemple.fr', magnet: 'extrait' }, 'ip-assets'));
  const assetsCall = calls.find((c) => c.url.includes('/smtp/email'));
  check('SITE_ASSETS_URL definie -> les pieces jointes la suivent', r.statusCode === 200 && assetsCall && assetsCall.body.attachment.every((a) => a.url.startsWith('https://assets.example.test/')), JSON.stringify(assetsCall && assetsCall.body.attachment.map((a) => a.url)));
  check('SITE_ASSETS_URL ne touche pas le lien de desinscription (deploiement courant)', assetsCall && assetsCall.body.htmlContent.includes('https://preview.example.netlify.app/.netlify/functions/desinscription?e='));
  delete process.env.SITE_ASSETS_URL;
  reset();
  await sendEmail.handler(post({ email: 'pilote@exemple.fr', magnet: 'extrait' }, 'ip-assets2'));
  const repliCall = calls.find((c) => c.url.includes('/smtp/email'));
  check('SITE_ASSETS_URL absente -> repli sur URL', repliCall && repliCall.body.attachment.every((a) => a.url.startsWith('https://preview.example.netlify.app/')), JSON.stringify(repliCall && repliCall.body.attachment.map((a) => a.url)));
  check('noms de fichiers inchanges (un fichier deja envoye ne change jamais de nom)', repliCall && repliCall.body.attachment[0].url.endsWith('/extrait-comprendre-comment-rouler-plus-vite.pdf') && repliCall.body.attachment[1].url.endsWith('/tableur-reglages-kart-v2.xlsx'));

  reset();
  r = await sendEmail.handler(post({ email: 'pilote@exemple.fr' }, 'ip-b'));
  check('retro-compatibilite : sans champ magnet -> 200 (tableur)', r.statusCode === 200);
  const tabCall = calls.find((c) => c.url.includes('/smtp/email'));
  check('magnet par defaut = 1 seule piece jointe', tabCall && tabCall.body.attachment.length === 1);
  check('magnet par defaut pose TABLEUR_ENVOYE', calls.filter((c) => c.method === 'PUT').pop().body.attributes.TABLEUR_ENVOYE !== undefined);
  check('mail tableur : jamais Stripe en direct, jamais Gumroad', !VENTE_DIRECTE.test(tabCall.body.htmlContent));
  check('mail tableur : un seul lien de vente, vers /guide avec son propre UTM', JSON.stringify(liensVente(tabCall.body.htmlContent)) === JSON.stringify([`${PAGE_GUIDE}?utm_source=email&utm_medium=livraison&utm_campaign=j0-tableur`]), JSON.stringify(liensVente(tabCall.body.htmlContent)));
  check('mail tableur : prix et garantie lus dans la config', tabCall.body.htmlContent.includes(PRIX_GUIDE_HTML) && tabCall.body.htmlContent.includes(`garantie ${OFFRES.garantie_jours}&nbsp;jours`));
  check('mail tableur : replyTo = contact.email', tabCall.body.replyTo && tabCall.body.replyTo.email === OFFRES.contact.email);
  check('mail tableur : aucun emoji, aucun tiret cadratin', !EMOJI.test(tabCall.body.subject + tabCall.body.htmlContent) && !TIRETS.test(tabCall.body.subject + tabCall.body.htmlContent));
  check('mail tableur : piece jointe mise en avant', /fichiers joints à cet email/i.test(tabCall.body.htmlContent));

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
  // Uniquement des nombres entiers de jours : l'attribut stocke une DATE (minuit UTC),
  // donc un decalage de 7,5 jours donne un age reel compris entre 7,5 et 8,5 selon
  // l'heure a laquelle tourne le test. Avec des entiers, l'age d'une date vieille de
  // N jours reste dans [N, N+1) quelle que soit l'heure, et le test est deterministe.
  const contacts = [
    { email: 'extrait-7j@x.fr', attributes: { EXTRAIT_ENVOYE: dayISO(7) } },
    { email: 'extrait-8j@x.fr', attributes: { EXTRAIT_ENVOYE: dayISO(8) } },
    { email: 'extrait-3j@x.fr', attributes: { EXTRAIT_ENVOYE: dayISO(3) } },
    { email: 'extrait-20j@x.fr', attributes: { EXTRAIT_ENVOYE: dayISO(20) } },
    { email: 'tableur-seul@x.fr', attributes: { TABLEUR_ENVOYE: dayISO(7), SOURCE: 'tableur-reglages' } },
    { email: 'historique@x.fr', attributes: {}, createdAt: new Date(Date.now() - 8 * DAY).toISOString() },
    { email: 'deja-relance@x.fr', attributes: { EXTRAIT_ENVOYE: dayISO(8), RELANCE_GUIDE: dayISO(1) } },
    { email: 'blackliste@x.fr', attributes: { EXTRAIT_ENVOYE: dayISO(8) }, emailBlacklisted: true },
  ];
  reset(listResponder(contacts));
  await relance.handler();
  const sent = sentTo();
  check('relance les 3 contacts servis dans la fenetre 7-9j', sent.length === 3, JSON.stringify(sent));
  check('contact historique sans attribut jamais relance', !sent.includes('historique@x.fr'));
  check('hors fenetre (3j et 20j) non relances', !sent.includes('extrait-3j@x.fr') && !sent.includes('extrait-20j@x.fr'));
  check('deja relance -> ignore', !sent.includes('deja-relance@x.fr'));
  check('blackliste -> ignore', !sent.includes('blackliste@x.fr'));
  check('le plus ancien traite en premier', sent[0] === 'extrait-8j@x.fr', JSON.stringify(sent));

  // Le point critique : chacun reçoit un texte qui parle de CE QU IL A recu.
  const mailDe = (adr) => calls.find((c) => c.url.includes('/smtp/email') && c.body.to[0].email === adr).body;
  const mailExtrait = mailDe('extrait-7j@x.fr');
  const mailTableur = mailDe('tableur-seul@x.fr');
  check('relance extrait : parle de l extrait', /extrait de mon guide/i.test(mailExtrait.htmlContent));
  check('relance extrait : ne pretend pas avoir envoye le tableur', !/tu as reçu mon tableur/i.test(mailExtrait.htmlContent));
  check('relance tableur : parle du tableur', /tu as reçu mon tableur/i.test(mailTableur.htmlContent));
  check('relance tableur : ne pretend PAS qu il a recu l extrait', !/extrait de mon guide/i.test(mailTableur.htmlContent), mailTableur.subject);
  check('objets de relance differents selon le parcours', mailExtrait.subject !== mailTableur.subject, mailTableur.subject);
  check('relance : le bouton mene a la page /guide du site actif', mailExtrait.htmlContent.includes(`href="${PAGE_GUIDE}?utm_source=email`), PAGE_GUIDE);
  check('relance : jamais Stripe en direct, jamais Gumroad', !VENTE_DIRECTE.test(mailExtrait.htmlContent) && !VENTE_DIRECTE.test(mailTableur.htmlContent));
  check('relance : prix = guide.prix_affiche de la config', mailExtrait.htmlContent.includes(PRIX_GUIDE_HTML) && mailExtrait.htmlContent.includes(`Découvrir le guide · ${PRIX_GUIDE_HTML}`), PRIX_GUIDE_HTML);
  check('relance : aucun autre prix que celui de la config', (mailExtrait.htmlContent.match(/\d+,\d\d(&nbsp;|\s)*€/g) || []).every((p) => p === PRIX_GUIDE_HTML), JSON.stringify(mailExtrait.htmlContent.match(/\d+,\d\d(&nbsp;|\s)*€/g)));
  check('relance : garantie = garantie_jours de la config', mailExtrait.htmlContent.includes(`garantie ${OFFRES.garantie_jours}&nbsp;jours`) && /droits légaux/.test(mailExtrait.htmlContent));
  check('relance : nombre de chapitres lu dans la config', mailExtrait.htmlContent.includes(`${OFFRES.guide.chapitres}&nbsp;chapitres`));
  check('relance : chiffre de lecteurs date de la config (jamais invente)', mailExtrait.htmlContent.toLowerCase().includes(OFFRES.lecteurs.phrase.toLowerCase()), OFFRES.lecteurs.phrase);
  check('relance : expediteur = contact.email de la config', mailExtrait.sender.email === OFFRES.contact.email, JSON.stringify(mailExtrait.sender));
  check('relance : replyTo = contact.email de la config', mailExtrait.replyTo && mailExtrait.replyTo.email === OFFRES.contact.email, JSON.stringify(mailExtrait.replyTo));
  check('relance : un seul lien de vente, vers /guide (hors desinscription)', (mailExtrait.htmlContent.match(/href="([^"]+)"/g) || []).filter((h) => !h.includes('/desinscription?')).length === 1);
  check('relance : aucun emoji, aucun tiret cadratin', !EMOJI.test(mailExtrait.subject + mailExtrait.htmlContent) && !TIRETS.test(mailExtrait.subject + mailExtrait.htmlContent));
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

  // ------------------------------------------------ desinscription : UNSUB_SECRET et ancienne signature
  section('desinscription : transition vers UNSUB_SECRET');
  const tokAvec = (e, secret) => crypto.createHmac('sha256', secret).update(e.toLowerCase()).digest('hex').slice(0, 32);
  process.env.UNSUB_SECRET = 'nouveau-secret';
  reset();
  r = await desinsc.handler({ httpMethod: 'POST', path: '/x', queryStringParameters: { e: 'a@b.fr', t: tokAvec('a@b.fr', 'nouveau-secret') } });
  check('jeton signe avec UNSUB_SECRET -> accepte', r.statusCode === 200);
  reset();
  r = await desinsc.handler({ httpMethod: 'POST', path: '/x', queryStringParameters: { e: 'a@b.fr', t: tok('a@b.fr') } });
  check('ancien jeton signe avec la cle Brevo -> encore accepte', r.statusCode === 200);
  reset();
  r = await desinsc.handler({ httpMethod: 'POST', path: '/x', queryStringParameters: { e: 'a@b.fr', t: tokAvec('a@b.fr', 'autre') } });
  check('jeton signe avec un autre secret -> refuse', r.statusCode === 400 && calls.length === 0);
  reset();
  await sendEmail.handler(post({ email: 'unsub@exemple.fr', magnet: 'extrait' }, 'ip-unsub'));
  const envoiUnsub = calls.find((c) => c.url.includes('/smtp/email'));
  check('send-email signe les nouveaux liens avec UNSUB_SECRET', envoiUnsub && envoiUnsub.body.htmlContent.includes('t=' + tokAvec('unsub@exemple.fr', 'nouveau-secret')));
  delete process.env.UNSUB_SECRET;
  reset();
  r = await desinsc.handler({ httpMethod: 'POST', path: '/x', queryStringParameters: { e: 'a@b.fr', t: tok('a@b.fr') } });
  check('page de confirmation : aucun emoji', r.statusCode === 200 && !EMOJI.test(r.body));

  // ------------------------------------------------ send-email : formulaire sans JavaScript
  section('send-email : repli sans JavaScript (formulaire urlencoded)');
  const postForm = (corps, ip, base64) => ({
    httpMethod: 'POST',
    headers: { 'x-forwarded-for': ip, 'content-type': 'application/x-www-form-urlencoded' },
    body: base64 ? Buffer.from(corps).toString('base64') : corps,
    isBase64Encoded: Boolean(base64),
  });
  reset();
  r = await sendEmail.handler(postForm('email=form%40exemple.fr&magnet=extrait', 'ip-form-1'));
  check('urlencoded valide -> 303 vers /extrait-guide.html#envoye', r.statusCode === 303 && r.headers.Location === '/extrait-guide.html#envoye', r.statusCode + ' ' + JSON.stringify(r.headers));
  check('urlencoded valide -> l email part bien', calls.some((c) => c.url.includes('/smtp/email') && c.body.to[0].email === 'form@exemple.fr'));
  reset();
  r = await sendEmail.handler(postForm('email=form2%40exemple.fr&magnet=extrait', 'ip-form-2', true));
  check('urlencoded encode en base64 par Netlify -> lu et envoye', r.statusCode === 303 && calls.some((c) => c.url.includes('/smtp/email')));
  reset();
  r = await sendEmail.handler(postForm('email=pas-un-email&magnet=extrait', 'ip-form-3'));
  check('urlencoded email invalide -> 400 en page HTML, sans appel Brevo', r.statusCode === 400 && /text\/html/.test(r.headers['Content-Type']) && calls.length === 0);
  check('page d erreur : lien de retour vers la page de l extrait', r.body.includes('href="/extrait-guide.html"'));
  check('page d erreur : aucun tiret cadratin, aucun emoji', !TIRETS.test(r.body) && !EMOJI.test(r.body));
  reset();
  r = await sendEmail.handler(post({ email: 'json@exemple.fr', magnet: 'extrait' }, 'ip-form-4'));
  check('le script de la page (JSON) garde sa reponse 200 JSON', r.statusCode === 200 && JSON.parse(r.body).success === true);

  // ------------------------------------------------ send-email : robots et pages tierces
  section('send-email : pot de miel, origine, CORS et IP');
  const SITE1 = OFFRES.sites.site1;
  const avecEntetes = (corps, entetes) => ({ httpMethod: 'POST', headers: { 'content-type': 'application/json', ...entetes }, body: JSON.stringify(corps) });
  reset();
  r = await sendEmail.handler(post({ email: 'robot@exemple.fr', magnet: 'extrait', site_web: 'http://spam.example' }, 'ip-piege-1'));
  check('pot de miel rempli (JSON) -> 200 comme un succes, aucun appel Brevo', r.statusCode === 200 && JSON.parse(r.body).success === true && calls.length === 0, r.statusCode + ' ' + calls.length);
  reset();
  r = await sendEmail.handler(postForm('email=robot2%40exemple.fr&magnet=extrait&site_web=spam', 'ip-piege-2'));
  check('pot de miel rempli (formulaire) -> 303 comme un succes, aucun appel Brevo', r.statusCode === 303 && r.headers.Location === '/extrait-guide.html#envoye' && calls.length === 0);
  reset();
  r = await sendEmail.handler(postForm('email=vrai%40exemple.fr&magnet=extrait&site_web=', 'ip-piege-3'));
  check('pot de miel vide -> l email part', r.statusCode === 303 && calls.some((c) => c.url.includes('/smtp/email')));
  reset();
  r = await sendEmail.handler(avecEntetes({ email: 'cible@exemple.fr', magnet: 'extrait' }, { 'x-forwarded-for': 'ip-origine-1', origin: 'https://site-malveillant.example' }));
  check('Origin d un autre site -> 403, aucun appel Brevo', r.statusCode === 403 && calls.length === 0, r.statusCode + ' ' + calls.length);
  check('Origin d un autre site -> CORS ne lui renvoie jamais son origine', r.headers['Access-Control-Allow-Origin'] !== 'https://site-malveillant.example' && r.headers['Access-Control-Allow-Origin'] !== '*');
  reset();
  r = await sendEmail.handler(avecEntetes({ email: 'cible2@exemple.fr', magnet: 'extrait' }, { 'x-forwarded-for': 'ip-origine-2', referer: 'https://site-malveillant.example/page' }));
  check('Referer d un autre site (sans Origin) -> 403', r.statusCode === 403 && calls.length === 0);
  reset();
  r = await sendEmail.handler(avecEntetes({ email: 'cible3@exemple.fr', magnet: 'extrait' }, { 'x-forwarded-for': 'ip-origine-3', origin: 'null' }));
  check('Origin null (iframe isolee) -> 403', r.statusCode === 403 && calls.length === 0);
  reset();
  r = await sendEmail.handler(avecEntetes({ email: 'site1@exemple.fr', magnet: 'extrait' }, { 'x-forwarded-for': 'ip-origine-4', origin: SITE1 }));
  check('Origin du site 1 -> 200 et CORS = cette origine', r.statusCode === 200 && r.headers['Access-Control-Allow-Origin'] === SITE1 && r.headers.Vary === 'Origin', JSON.stringify(r.headers));
  reset();
  const brouillon = SITE1.replace('https://', 'https://68ab12cd--');
  r = await sendEmail.handler(avecEntetes({ email: 'brouillon@exemple.fr', magnet: 'extrait' }, { 'x-forwarded-for': 'ip-origine-5', origin: brouillon }));
  check('Origin d un brouillon Netlify du site 1 -> 200', r.statusCode === 200 && r.headers['Access-Control-Allow-Origin'] === brouillon);
  reset();
  r = await sendEmail.handler(avecEntetes({ email: 'imite@exemple.fr', magnet: 'extrait' }, { 'x-forwarded-for': 'ip-origine-6', origin: 'https://faux-' + SITE1.replace('https://', '') }));
  check('Origin qui imite le nom du site sans « -- » -> 403', r.statusCode === 403 && calls.length === 0);
  reset();
  r = await sendEmail.handler(avecEntetes({ email: 'referer@exemple.fr', magnet: 'extrait' }, { 'x-forwarded-for': 'ip-origine-7', referer: SITE1 + '/extrait-guide.html' }));
  check('Referer du site 1 (sans Origin) -> 200', r.statusCode === 200);
  check('aucune reponse ne dit « Access-Control-Allow-Origin: * »', r.headers['Access-Control-Allow-Origin'] !== '*');
  reset();
  for (let i = 0; i < 5; i++) {
    await sendEmail.handler(avecEntetes({ email: `ip${i}@exemple.fr`, magnet: 'extrait' }, { 'x-nf-client-connection-ip': '9.9.9.9', 'x-forwarded-for': `10.0.0.${i}` }));
  }
  r = await sendEmail.handler(avecEntetes({ email: 'ip6@exemple.fr', magnet: 'extrait' }, { 'x-nf-client-connection-ip': '9.9.9.9', 'x-forwarded-for': '10.0.0.99' }));
  check('limite par IP sur x-nf-client-connection-ip : changer x-forwarded-for ne la contourne pas', r.statusCode === 429, String(r.statusCode));

  // ------------------------------------------------ typographie francaise des corps HTML
  section('typographie : espaces insecables dans les emails et les pages des fonctions');
  const { typographier } = require(path.join(__dirname, '..', 'scripts', 'typographie.js'));
  const dejaCorrige = (h) => typeof h === 'string' && typographier(h) === h;
  check('mail extrait : corps deja corrige (aucune espace simple avant : ; ? !)', dejaCorrige(htmlExtrait) && htmlExtrait.includes('&nbsp;:'));
  check('mail tableur : corps deja corrige', dejaCorrige(tabCall.body.htmlContent));
  check('relance J+7 : corps deja corrige', dejaCorrige(mailExtrait.htmlContent) && dejaCorrige(mailTableur.htmlContent) && mailExtrait.htmlContent.includes('&nbsp;:'));
  check('relance J+7 : l objet reste du texte brut (aucune entite HTML)', !/&nbsp;/.test(mailExtrait.subject + mailTableur.subject));
  check('liens intacts : UTM et desinscription sans insecable', !/href="[^"]*&nbsp;/.test(htmlExtrait + mailExtrait.htmlContent));
  reset();
  r = await desinsc.handler({ httpMethod: 'GET', path: '/x', queryStringParameters: { e: 'a@b.fr', t: tok('a@b.fr') } });
  check('desinscription : page corrigee, lien de retour vers le site actif de la config', r.statusCode === 200 && dejaCorrige(r.body) && r.body.includes(`href="${SITE_PUBLIC}/"`), SITE_PUBLIC);
  check('desinscription : aucune adresse de site ecrite en dur dans la fonction', !/netlify\.app/.test(require('fs').readFileSync(FN + 'desinscription.js', 'utf8')));
  reset();
  r = await sendEmail.handler(postForm('email=pas-un-email&magnet=extrait', 'ip-typo'));
  check('page d erreur de send-email : corrigee', r.statusCode === 400 && dejaCorrige(r.body));

  console.log(`\n${pass} tests OK, ${fail} echecs`);
  process.exit(fail ? 1 : 0);
})();

