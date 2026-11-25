'use strict';
// Webhook Stripe, commandes du plan d'action (diagnostic) : reconnaissance par metadata.funnel ou par lien,
// options lues par identifiant de prix (ou par le montant), email interne, confirmation client, un seul envoi.

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const { installerEnvironnement, VALEURS } = require('./aides/environnement');
const { installerFetch } = require('./aides/fetch-simule');
const F = require('./aides/fabriques');
const OFFRES = require('../../config/offres.json');
const { handler, estSessionPlan, estSessionDebrief } = require('../../site v2/netlify/functions/stripe-webhook');

const SECRET_TEST = 'secret_webhook_test_factice_pour_tests';
const PLAN = OFFRES.diagnostic.stripe;
const PRIX = PLAN.prix;
const C = (euros) => Math.round(euros * 100);
const TOTAL_PLAN = C(OFFRES.diagnostic.prix);
const TOTAL_LIVRE = TOTAL_PLAN + C(OFFRES.debrief.option_guide.prix);
const TOTAL_ANALYSE = TOTAL_PLAN + C(OFFRES.equitable.debrief_lecteur.prix);
const PAYE_SEC = Math.floor(Date.UTC(2026, 10, 25, 13, 5, 0) / 1000);
const TABLE = `${F.SUPABASE}/rest/v1/debriefs`;
const LIGNES = `${F.STRIPE}/checkout/sessions/`;

function session(sup = {}) {
  return {
    id: 'cs_live_plan_1', object: 'checkout.session', livemode: true, payment_status: 'paid', status: 'complete',
    payment_link: PLAN.plink, payment_intent: 'pi_3Plan123', amount_total: TOTAL_PLAN, currency: 'eur',
    client_reference_id: 's1-diagnostic-sid-abc123def456',
    metadata: { funnel: 'plan_action_diagnostic', variante: 'A_sans_camera' },
    customer_details: { name: 'LUCAS MARTIN', email: 'pilote@exemple.test' },
    custom_fields: [],
    ...sup,
  };
}
function evenement(objet) { return { id: 'evt_plan_1', type: 'checkout.session.completed', livemode: objet.livemode, created: PAYE_SEC, data: { object: objet } }; }
function signer(corps, secret = VALEURS.STRIPE_WEBHOOK_SECRET) {
  const t = Math.floor(Date.now() / 1000);
  return `t=${t},v1=${crypto.createHmac('sha256', secret).update(`${t}.${corps}`).digest('hex')}`;
}
function appeler(evt, secret) {
  const corps = JSON.stringify(evt);
  return handler({ httpMethod: 'POST', headers: { 'stripe-signature': signer(corps, secret), 'content-type': 'application/json' }, body: corps });
}
function idFiltre(appel) { return new URL(appel.url).searchParams.get('session_id').replace(/^eq\./, ''); }
function baseSimulee(sim) {
  const lignes = new Map();
  sim.sur('POST', TABLE, (appel) => {
    const [ligne] = JSON.parse(appel.corps);
    if (lignes.has(ligne.session_id)) return { status: 201, json: [] };
    lignes.set(ligne.session_id, { ...ligne, cree_le: new Date().toISOString(), interne_envoye_le: null });
    return { status: 201, json: [ligne] };
  });
  sim.sur('PATCH', TABLE, (appel) => { const l = lignes.get(idFiltre(appel)); if (l) Object.assign(l, JSON.parse(appel.corps)); return { status: 204 }; });
  sim.sur('GET', TABLE, (appel) => { const l = lignes.get(idFiltre(appel)); return { status: 200, json: l ? [l] : [] }; });
  sim.sur('DELETE', TABLE, (appel) => { lignes.delete(idFiltre(appel)); return { status: 204 }; });
  return lignes;
}
function panier(ids) { return { status: 200, json: { data: ids.map((id) => ({ description: 'ligne', price: { id } })) } }; }

describe('fonction stripe-webhook, plan d action', () => {
  let sim;
  beforeEach(() => {
    installerEnvironnement();
    process.env.STRIPE_READ_KEY = 'cle_lecture_factice_pour_tests';
    delete process.env.STRIPE_WEBHOOK_SECRET_TEST;
    delete process.env.GUIDE_PDF_URL;
    delete process.env.TABLEUR_URL;
    sim = installerFetch();
    F.routesParDefaut(sim);
    baseSimulee(sim);
    sim.sur('GET', LIGNES, panier([PRIX.plan]));
  });
  afterEach(() => sim.restaurer());

  it('reconnaît le plan par metadata.funnel ou par un des deux liens, jamais comme un débrief', () => {
    assert.equal(estSessionPlan(session()), true);
    assert.equal(estSessionPlan(session({ metadata: {}, payment_link: PLAN.plink_camera })), true);
    assert.equal(estSessionPlan(session({ metadata: {}, payment_link: OFFRES.guide.stripe.plink })), false);
    assert.equal(estSessionDebrief(session()), false);
  });

  it('plan seul : email interne daté à 48 h, confirmation « sans IA », aucun lien de paiement', async () => {
    const rep = await appeler(evenement(session()));
    assert.equal(rep.statusCode, 200);
    const [interne, client, ...reste] = F.emailsEnvoyes(sim);
    assert.equal(reste.length, 0);
    assert.equal(interne.subject, "Nouveau plan d'action : LUCAS MARTIN");
    assert.equal(interne.to[0].email, VALEURS.EMAIL_INTERNE || OFFRES.contact.email);
    assert.equal(interne.replyTo.email, 'pilote@exemple.test');
    assert.match(interne.textContent, /s1-diagnostic-sid-abc123def456/);
    assert.match(interne.textContent, /A_sans_camera/);
    assert.match(interne.textContent, /27 novembre/);
    assert.equal(client.to[0].email, 'pilote@exemple.test');
    assert.match(client.textContent, /sans IA/);
    assert.match(client.textContent, /24 à 48/);
    assert.doesNotMatch(interne.htmlContent + client.htmlContent, /buy\.stripe\.com/);
    assert.doesNotMatch(interne.textContent + client.textContent, new RegExp('[' + String.fromCharCode(0x2013, 0x2014) + ']'));
    const [ligne] = F.insertions(sim, 'debriefs')[0];
    assert.equal(ligne.session_id, 'cs_live_plan_1');
    assert.equal(ligne.option_guide, false);
  });

  it('options lues par identifiant de prix : le livre part dans la confirmation si les adresses sont réglées', async () => {
    process.env.GUIDE_PDF_URL = 'https://fichiers.exemple.test/livre-factice.pdf';
    process.env.TABLEUR_URL = 'https://fichiers.exemple.test/feuille-factice.xlsx';
    sim.sur('GET', LIGNES, panier([PRIX.plan, PRIX.livre]));
    await appeler(evenement(session({ amount_total: TOTAL_LIVRE })));
    const [interne, client] = F.emailsEnvoyes(sim);
    assert.match(interne.textContent, /livre digital/);
    assert.doesNotMatch(interne.textContent, /déduit du montant/);
    assert.match(client.htmlContent, /livre-factice\.pdf/);
    assert.match(client.htmlContent, /feuille-factice\.xlsx/);
    assert.equal(F.insertions(sim, 'debriefs')[0][0].option_guide, true);
  });

  it('analyse prise sans lien vidéo : le client est invité à répondre avec son lien', async () => {
    sim.sur('GET', LIGNES, panier([PRIX.plan, PRIX.analyse]));
    await appeler(evenement(session({ payment_link: PLAN.plink_camera, amount_total: TOTAL_ANALYSE, metadata: { funnel: 'plan_action_diagnostic', variante: 'B_avec_camera' } })));
    const [interne, client] = F.emailsEnvoyes(sim);
    assert.match(interne.textContent, /analyse d'onboard/);
    assert.match(interne.textContent, /Pas de lien/);
    assert.match(interne.textContent, /vidéo privée/);
    assert.match(client.textContent, /Réponds à cet email avec son lien/);
  });

  it('analyse avec lien vidéo et accord : repris dans l email interne', async () => {
    sim.sur('GET', LIGNES, panier([PRIX.plan, PRIX.analyse]));
    const champs = [{ key: 'lienonboard', type: 'text', text: { value: 'youtu.be/abc123' } }, { key: 'usagevideo', type: 'dropdown', dropdown: { value: 'ouianonyme' } }];
    await appeler(evenement(session({ amount_total: TOTAL_ANALYSE, custom_fields: champs })));
    const [interne, client] = F.emailsEnvoyes(sim);
    assert.match(interne.textContent, /https:\/\/youtu\.be\/abc123/);
    assert.match(interne.textContent, /si son nom n'apparaît pas/);
    assert.match(client.textContent, /bien reçu le lien de ta vidéo/);
  });

  it('rejeu de Stripe : un seul envoi par session', async () => {
    await appeler(evenement(session()));
    const rep = await appeler(evenement(session()));
    assert.equal(rep.statusCode, 200);
    assert.equal(JSON.parse(rep.body).deja_traite, true);
    assert.equal(F.emailsEnvoyes(sim).length, 2);
  });

  it('mode test : reconnu par metadata, options déduites du montant, sujet [TEST], jamais les vrais fichiers', async () => {
    process.env.STRIPE_WEBHOOK_SECRET_TEST = SECRET_TEST;
    process.env.GUIDE_PDF_URL = 'https://fichiers.exemple.test/livre-factice.pdf';
    process.env.TABLEUR_URL = 'https://fichiers.exemple.test/feuille-factice.xlsx';
    const s = session({ id: 'cs_test_plan_1', livemode: false, payment_link: 'plink_test_autre', amount_total: TOTAL_LIVRE });
    const rep = await appeler(evenement(s), SECRET_TEST);
    assert.equal(rep.statusCode, 200);
    const [interne, client] = F.emailsEnvoyes(sim);
    assert.match(interne.subject, /^\[TEST\] Nouveau plan d'action/);
    assert.match(interne.textContent, /déduit du montant/);
    assert.doesNotMatch(client.htmlContent, /livre-factice/);
    assert.match(client.textContent, /sous 24 h/);
  });

  it('Brevo en panne sur l email interne : 500, la réservation est annulée, Stripe réessaiera', async () => {
    sim.sur('POST', F.BREVO, { status: 500, json: { message: 'panne' } });
    const rep = await appeler(evenement(session()));
    assert.equal(rep.statusCode, 500);
    assert.equal(sim.appelsVers('DELETE', TABLE).length, 1);
  });
});
