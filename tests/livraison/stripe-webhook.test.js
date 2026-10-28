'use strict';
// Webhook Stripe, commandes de débrief : signature, tri des événements, email interne, confirmation client,
// option guide, un seul envoi par session (rejeu de Stripe) et reprise après une panne de Brevo.

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const { installerEnvironnement, VALEURS } = require('./aides/environnement');
const { installerFetch } = require('./aides/fetch-simule');
const F = require('./aides/fabriques');
const OFFRES = require('../../config/offres.json');
const { handler, normaliserLienVideo } = require('../../site v2/netlify/functions/stripe-webhook');

const SECRET_TEST = 'secret_webhook_test_factice_pour_tests';
const LIEN_DEBRIEF = OFFRES.debrief.stripe.plink;
const LIEN_LECTEUR = OFFRES.equitable.debrief_lecteur.stripe.plink;
const PRIX_DEBRIEF = Math.round(OFFRES.debrief.prix * 100);
const PRIX_AVEC_OPTION = Math.round((OFFRES.debrief.prix + OFFRES.debrief.option_guide.prix) * 100);
// Paiement simulé : mardi 27 octobre 2026, 13 h 05 UTC, soit 14 h 05 à Paris (heure d'hiver).
const PAYE_SEC = Math.floor(Date.UTC(2026, 9, 27, 13, 5, 0) / 1000);
const URL_GUIDE = 'https://fichiers.exemple.test/livre-factice.pdf';
const URL_TABLEUR = 'https://fichiers.exemple.test/feuille-factice.xlsx';
const TABLE = `${F.SUPABASE}/rest/v1/debriefs`;
const LIGNES = `${F.STRIPE}/checkout/sessions/`;

function session(sup = {}) {
  return {
    id: 'cs_live_debrief_1',
    object: 'checkout.session',
    livemode: true,
    payment_status: 'paid',
    status: 'complete',
    payment_link: LIEN_DEBRIEF,
    payment_intent: 'pi_3Abc123',
    amount_total: PRIX_DEBRIEF,
    currency: 'eur',
    customer_details: { name: 'JEAN DUPONT', email: 'pilote@exemple.test' },
    custom_fields: [
      { key: 'lienonboard', type: 'text', text: { value: 'https://youtu.be/abc123' } },
      { key: 'circuitkart', type: 'text', text: { value: 'Lohéac, OTK + X30' } },
      { key: 'usagevideo', type: 'dropdown', dropdown: { value: 'ouianonyme' } },
    ],
    ...sup,
  };
}

function evenement(objet, sup = {}) {
  return { id: 'evt_1', type: 'checkout.session.completed', livemode: objet.livemode, created: PAYE_SEC, data: { object: objet }, ...sup };
}

function signer(corps, secret = VALEURS.STRIPE_WEBHOOK_SECRET, t = Math.floor(Date.now() / 1000)) {
  const v1 = crypto.createHmac('sha256', secret).update(`${t}.${corps}`).digest('hex');
  return `t=${t},v1=${v1}`;
}

function appeler(evt, { secret, signature, base64 = false } = {}) {
  const corps = JSON.stringify(evt);
  return handler({
    httpMethod: 'POST',
    headers: { 'stripe-signature': signature || signer(corps, secret), 'content-type': 'application/json' },
    body: base64 ? Buffer.from(corps, 'utf8').toString('base64') : corps,
    isBase64Encoded: base64,
  });
}

// Base simulée : la première réservation d'une session réussit, les suivantes reviennent vides (doublon).
// Renvoie la table (session_id -> ligne) pour qu'un test puisse y poser une réservation abandonnée.
function idFiltre(appel) {
  return new URL(appel.url).searchParams.get('session_id').replace(/^eq\./, '');
}
function baseSimulee(sim) {
  const lignes = new Map();
  sim.sur('POST', TABLE, (appel) => {
    const [ligne] = JSON.parse(appel.corps);
    if (lignes.has(ligne.session_id)) return { status: 201, json: [] };
    lignes.set(ligne.session_id, { ...ligne, cree_le: new Date().toISOString(), interne_envoye_le: null });
    return { status: 201, json: [ligne] };
  });
  sim.sur('PATCH', TABLE, (appel) => {
    const ligne = lignes.get(idFiltre(appel));
    if (ligne) Object.assign(ligne, JSON.parse(appel.corps));
    return { status: 204 };
  });
  sim.sur('GET', TABLE, (appel) => {
    const ligne = lignes.get(idFiltre(appel));
    return { status: 200, json: ligne ? [ligne] : [] };
  });
  sim.sur('DELETE', TABLE, (appel) => {
    lignes.delete(idFiltre(appel));
    return { status: 204 };
  });
  return lignes;
}

function lignesPanier(descriptions) {
  return { status: 200, json: { data: descriptions.map((description) => ({ description })) } };
}

describe('fonction stripe-webhook', () => {
  let sim;
  let base;
  beforeEach(() => {
    installerEnvironnement();
    process.env.STRIPE_READ_KEY = 'cle_lecture_factice_pour_tests';
    delete process.env.STRIPE_WEBHOOK_SECRET_TEST;
    delete process.env.GUIDE_PDF_URL;
    delete process.env.TABLEUR_URL;
    sim = installerFetch();
    F.routesParDefaut(sim);
    base = baseSimulee(sim);
    sim.sur('GET', LIGNES, lignesPanier(['Débrief onboard']));
  });
  afterEach(() => sim.restaurer());

  it('signature absente, fausse ou expirée : 400 et rien ne part', async () => {
    const evt = evenement(session());
    assert.equal((await appeler(evt, { signature: 't=1,v1=' + 'a'.repeat(64) })).statusCode, 400);
    assert.equal((await appeler(evt, { secret: 'mauvais_secret' })).statusCode, 400);
    const corps = JSON.stringify(evt);
    const vieille = signer(corps, VALEURS.STRIPE_WEBHOOK_SECRET, Math.floor(Date.now() / 1000) - 3600);
    assert.equal((await appeler(evt, { signature: vieille })).statusCode, 400);
    assert.equal(sim.appels.length, 0);
  });

  it('secret absent : 500 (Stripe réessaie), rien ne part', async () => {
    delete process.env.STRIPE_WEBHOOK_SECRET;
    assert.equal((await appeler(evenement(session()))).statusCode, 500);
    assert.equal(sim.appels.length, 0);
  });

  it('ignore les autres événements, les sessions non payées et les autres produits', async () => {
    const cas = [
      evenement(session(), { type: 'charge.refunded' }),
      evenement(session({ payment_status: 'unpaid' })),
      evenement(session({ payment_link: OFFRES.guide.stripe.plink })),
      evenement(session({ payment_link: null })),
    ];
    for (const evt of cas) {
      const rep = await appeler(evt);
      assert.equal(rep.statusCode, 200);
      assert.ok(JSON.parse(rep.body).ignore);
    }
    assert.equal(sim.appels.length, 0);
  });

  it('commande sans option : email interne complet, puis confirmation client', async () => {
    const rep = await appeler(evenement(session()));
    assert.equal(rep.statusCode, 200);
    const [interne, client, ...reste] = F.emailsEnvoyes(sim);
    assert.equal(reste.length, 0);

    assert.equal(interne.to[0].email, VALEURS.EMAIL_INTERNE);
    assert.equal(interne.subject, 'Nouveau débrief : JEAN DUPONT');
    assert.equal(interne.replyTo.email, 'pilote@exemple.test');
    for (const attendu of [
      'pilote@exemple.test',
      'href="https://youtu.be/abc123"',
      'Lohéac, OTK + X30',
      "Oui, si son nom n&#39;apparaît pas",
      '29,99 €',
      'mardi 27 octobre à 14 h 05',
      'vendredi 30 octobre à 14 h 05',
      'href="https://dashboard.stripe.com/payments/pi_3Abc123"',
    ]) {
      assert.ok(interne.htmlContent.includes(attendu), `email interne sans : ${attendu}`);
    }
    assert.match(interne.textContent, /Option guide : Non\n/);
    assert.match(interne.textContent, /Accord d'utilisation : Oui, si son nom n'apparaît pas/);

    assert.equal(client.to[0].email, 'pilote@exemple.test');
    assert.equal(client.subject, 'Ta vidéo est bien reçue');
    assert.match(client.textContent, /^Salut Jean,/m);
    assert.match(client.textContent, /avant le vendredi 30 octobre à 14 h 05/);
    assert.ok(client.textContent.includes('https://youtu.be/abc123'));
    assert.ok(!/guide/i.test(client.textContent), 'aucune mention du guide sans option');
    assert.ok(client.textContent.includes('/retractation/'), 'pied légal présent');

    const [ligne] = F.insertions(sim, 'debriefs')[0];
    assert.deepEqual(Object.keys(ligne).sort(), ['echeance', 'option_guide', 'session_id', 'statut']);
    assert.equal(ligne.echeance, new Date((PAYE_SEC + OFFRES.delais.debrief_h * 3600) * 1000).toISOString());
    assert.equal(ligne.option_guide, false);
  });

  it('option guide prise, fichiers réglés : liens du guide et du tableur dans la confirmation', async () => {
    process.env.GUIDE_PDF_URL = URL_GUIDE;
    process.env.TABLEUR_URL = URL_TABLEUR;
    sim.sur('GET', LIGNES, lignesPanier(['Débrief onboard', 'Comprendre comment rouler plus vite']));
    await appeler(evenement(session({ amount_total: PRIX_AVEC_OPTION })));
    const [interne, client] = F.emailsEnvoyes(sim);
    assert.match(interne.textContent, /Option guide : Oui\n/);
    assert.ok(!interne.textContent.includes('à envoyer à la main'));
    assert.ok(client.htmlContent.includes(`href="${URL_GUIDE}"`));
    assert.ok(client.htmlContent.includes(`href="${URL_TABLEUR}"`));
    assert.equal(F.insertions(sim, 'debriefs')[0][0].option_guide, true);
  });

  it('option guide prise, fichiers non réglés : promesse des 24 h et alerte dans l email interne', async () => {
    sim.sur('GET', LIGNES, lignesPanier(['Débrief onboard', 'Le guide']));
    await appeler(evenement(session({ amount_total: PRIX_AVEC_OPTION })));
    const [interne, client] = F.emailsEnvoyes(sim);
    assert.ok(interne.textContent.includes('Option guide à envoyer à la main'));
    assert.ok(client.textContent.includes(`arrivent par email sous ${OFFRES.delais.option_guide_h} h`));
    assert.ok(!client.htmlContent.includes('fichiers.exemple.test'));
  });

  it('lignes du panier illisibles : l option se déduit du montant, et l email le dit', async () => {
    sim.sur('GET', LIGNES, { status: 403, json: { error: { message: 'permission' } } });
    await appeler(evenement(session({ amount_total: PRIX_AVEC_OPTION })));
    const [interne] = F.emailsEnvoyes(sim);
    assert.match(interne.textContent, /Option guide : Oui \(déduit du montant payé\)/);
  });

  it('lien prix lecteur : traité comme un débrief', async () => {
    const rep = await appeler(evenement(session({ id: 'cs_live_lecteur', payment_link: LIEN_LECTEUR, amount_total: 2299 })));
    assert.equal(rep.statusCode, 200);
    const [interne] = F.emailsEnvoyes(sim);
    assert.ok(interne.textContent.includes('22,99 €'));
    assert.match(interne.textContent, /Option guide : Non\n/);
  });

  it('Stripe renvoie l événement : un seul email interne et une seule confirmation', async () => {
    const evt = evenement(session());
    assert.equal((await appeler(evt)).statusCode, 200);
    const rejeu = await appeler(evt);
    assert.equal(rejeu.statusCode, 200);
    assert.equal(JSON.parse(rejeu.body).deja_traite, true);
    await appeler(evenement(session(), { id: 'evt_2', type: 'checkout.session.async_payment_succeeded' }));
    assert.equal(F.emailsEnvoyes(sim).length, 2);
  });

  it('Brevo en panne pour l email interne : 500, réservation annulée, le rejeu suivant envoie tout', async () => {
    let panne = true;
    sim.sur('POST', F.BREVO, () => (panne ? { status: 503, json: { message: 'indisponible' } } : { status: 201, json: { messageId: 'x' } }));
    const evt = evenement(session());
    assert.equal((await appeler(evt)).statusCode, 500);
    assert.equal(sim.appelsVers('DELETE', TABLE).length, 1);
    panne = false;
    assert.equal((await appeler(evt)).statusCode, 200);
    assert.equal(sim.appelsVers('POST', F.BREVO).length, 3, '1 échec puis 2 envois réussis');
  });

  it('confirmation client refusée : pas de nouvel email de commande, une alerte interne', async () => {
    sim.sur('POST', F.BREVO, (appel) =>
      JSON.parse(appel.corps).to[0].email === 'pilote@exemple.test'
        ? { status: 400, json: { message: 'adresse refusée' } }
        : { status: 201, json: { messageId: 'x' } });
    const rep = await appeler(evenement(session()));
    assert.equal(rep.statusCode, 200);
    const sujets = F.emailsEnvoyes(sim).map((e) => e.subject);
    assert.deepEqual(sujets, ['Nouveau débrief : JEAN DUPONT', 'Ta vidéo est bien reçue', 'Confirmation non envoyée : JEAN DUPONT']);
  });

  it('email interne parti : la réservation est datée', async () => {
    await appeler(evenement(session()));
    assert.ok(base.get('cs_live_debrief_1').interne_envoye_le);
  });

  it('réservation abandonnée depuis plus de 2 minutes (fonction coupée) : le rejeu envoie la commande', async () => {
    base.set('cs_live_debrief_1', { session_id: 'cs_live_debrief_1', cree_le: new Date(Date.now() - 5 * 60 * 1000).toISOString(), interne_envoye_le: null });
    const rep = await appeler(evenement(session()));
    assert.equal(rep.statusCode, 200);
    assert.deepEqual(F.emailsEnvoyes(sim).map((e) => e.subject), ['Nouveau débrief : JEAN DUPONT', 'Ta vidéo est bien reçue']);
  });

  it('réservation récente sans email interne (envoi en cours ailleurs) : 500 sans email, Stripe réessaiera', async () => {
    base.set('cs_live_debrief_1', { session_id: 'cs_live_debrief_1', cree_le: new Date().toISOString(), interne_envoye_le: null });
    assert.equal((await appeler(evenement(session()))).statusCode, 500);
    assert.equal(F.emailsEnvoyes(sim).length, 0);
  });

  it('Supabase injoignable : 500 sans aucun email (Stripe réessaiera)', async () => {
    sim.sur('POST', TABLE, { status: 503, json: { message: 'indisponible' } });
    assert.equal((await appeler(evenement(session()))).statusCode, 500);
    assert.equal(F.emailsEnvoyes(sim).length, 0);
  });

  it('champs saisis par le client : HTML échappé, lien non https jamais cliquable', async () => {
    const champs = [
      { key: 'lienonboard', type: 'text', text: { value: 'javascript:alert(1)' } },
      { key: 'circuitkart', type: 'text', text: { value: '<script>x</script>' } },
      { key: 'usagevideo', type: 'dropdown', dropdown: { value: 'non' } },
    ];
    await appeler(evenement(session({ custom_fields: champs, customer_details: { name: 'A <b>B</b>', email: 'pilote@exemple.test' } })));
    const [interne, client] = F.emailsEnvoyes(sim);
    for (const email of [interne, client]) {
      assert.ok(!email.htmlContent.includes('<script>'));
      assert.ok(!email.htmlContent.includes('<b>B</b>'));
      assert.ok(!email.htmlContent.includes('href="javascript:'));
    }
    assert.ok(interne.textContent.includes('Non, vidéo privée'));
  });

  it('corps encodé en base64 par Netlify : signature vérifiée sur les octets bruts', async () => {
    assert.equal((await appeler(evenement(session()), { base64: true })).statusCode, 200);
  });

  describe('mode test Stripe', () => {
    const sessionTest = (sup) => session({ id: 'cs_test_1', livemode: false, payment_link: 'plink_test_autre', payment_intent: 'pi_test1', ...sup });

    it('secret de test réglé : session de test reconnue au champ lienonboard, sujet [TEST]', async () => {
      process.env.STRIPE_WEBHOOK_SECRET_TEST = SECRET_TEST;
      const rep = await appeler(evenement(sessionTest({ amount_total: PRIX_AVEC_OPTION })), { secret: SECRET_TEST });
      assert.equal(rep.statusCode, 200);
      const [interne] = F.emailsEnvoyes(sim);
      assert.equal(interne.subject, '[TEST] Nouveau débrief : JEAN DUPONT');
      assert.ok(interne.htmlContent.includes('href="https://dashboard.stripe.com/test/payments/pi_test1"'));
      assert.match(interne.textContent, /Option guide : Oui \(déduit du montant payé\)/);
      assert.equal(sim.appelsVers('GET', LIGNES).length, 0, 'la clé de lecture réelle ne lit pas une session de test');
    });

    it('paiement de test avec option : jamais les vrais fichiers, même s ils sont réglés', async () => {
      process.env.STRIPE_WEBHOOK_SECRET_TEST = SECRET_TEST;
      process.env.GUIDE_PDF_URL = URL_GUIDE;
      process.env.TABLEUR_URL = URL_TABLEUR;
      await appeler(evenement(sessionTest({ amount_total: PRIX_AVEC_OPTION })), { secret: SECRET_TEST });
      const [interne, client] = F.emailsEnvoyes(sim);
      assert.ok(!client.htmlContent.includes('fichiers.exemple.test'));
      assert.ok(!interne.textContent.includes('à envoyer à la main'));
    });

    it('un secret ne vaut que pour son mode', async () => {
      process.env.STRIPE_WEBHOOK_SECRET_TEST = SECRET_TEST;
      assert.equal((await appeler(evenement(session()), { secret: SECRET_TEST })).statusCode, 400);
      assert.equal((await appeler(evenement(sessionTest()))).statusCode, 400);
      assert.equal(sim.appels.length, 0);
    });

    it('session de test sans champ lienonboard : ignorée', async () => {
      process.env.STRIPE_WEBHOOK_SECRET_TEST = SECRET_TEST;
      const rep = await appeler(evenement(sessionTest({ custom_fields: [] })), { secret: SECRET_TEST });
      assert.equal(JSON.parse(rep.body).ignore, 'autre_produit');
    });
  });

  it('lien vidéo saisi sans https : complété quand c est une adresse, laissé tel quel sinon', () => {
    assert.equal(normaliserLienVideo('youtu.be/abc'), 'https://youtu.be/abc');
    assert.equal(normaliserLienVideo('http://drive.google.com/x'), 'https://drive.google.com/x');
    assert.equal(normaliserLienVideo('je vous envoie par mail'), 'je vous envoie par mail');
  });
});
