'use strict';
// Fonction de rétractation : pot de miel, validation, accusé de réception, copie interne, trace sans donnée personnelle.

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const { installerEnvironnement } = require('./aides/environnement');
const { installerFetch } = require('./aides/fetch-simule');
const F = require('./aides/fabriques');
const { handler } = require('../../site v2/netlify/functions/retractation');

// Réception simulée : jeudi 24 septembre 2026, 12 h 05 UTC, soit 14 h 05 à Paris.
const RECEPTION_MS = Date.UTC(2026, 8, 24, 12, 5, 0);
const RECU_LE = 'jeudi 24 septembre 2026 à 14 h 05';

const DEMANDE = Object.freeze({
  nom: 'Jean Dupont',
  email: 'pilote@exemple.test',
  reference: 'WSRAHX5B-0002',
  produit: 'debrief',
  message: "Je n'ai finalement pas le temps\nde filmer ma session.",
  site_web: '',
});

let compteurIp = 0;
function ipUnique() {
  compteurIp += 1;
  return `203.0.113.${compteurIp}`;
}

function empreinte(email) {
  return crypto.createHash('sha256').update(email).digest('hex');
}

function envoyer(donnees, ip = ipUnique(), options) {
  return handler(F.requetePost(donnees, ip, options));
}

describe('fonction retractation', () => {
  let sim;
  let dateOriginale;
  beforeEach(() => {
    installerEnvironnement();
    sim = installerFetch();
    F.routesParDefaut(sim);
    dateOriginale = Date.now;
    Date.now = () => RECEPTION_MS;
  });
  afterEach(() => {
    Date.now = dateOriginale;
    sim.restaurer();
  });

  it('pot de miel rempli : 200 comme un succès, sans email ni enregistrement', async () => {
    const rep = await envoyer({ ...DEMANDE, site_web: 'https://spam.exemple.test' });
    assert.equal(rep.statusCode, 200);
    const corps = JSON.parse(rep.body);
    assert.deepEqual({ ...corps, recu_le: F.normaliser(corps.recu_le) }, { ok: true, recu_le: RECU_LE });
    assert.equal(sim.appels.length, 0);
  });

  it('demande valide : accusé de réception complet, copie interne, trace sans donnée personnelle', async () => {
    const rep = await envoyer(DEMANDE);
    assert.equal(rep.statusCode, 200);
    const corps = JSON.parse(rep.body);
    assert.deepEqual({ ...corps, recu_le: F.normaliser(corps.recu_le) }, { ok: true, recu_le: RECU_LE });

    const [accuse, copie] = F.emailsEnvoyes(sim);
    assert.equal(F.emailsEnvoyes(sim).length, 2);

    assert.deepEqual(accuse.to, [{ email: 'pilote@exemple.test', name: 'Jean Dupont' }]);
    assert.deepEqual(accuse.bcc, [{ email: 'interne@exemple.test' }], 'copie cachée interne dans le même envoi');
    assert.equal(accuse.subject, 'Accusé de réception : ta demande de rétractation');
    const texte = F.normaliser(accuse.textContent);
    assert.ok(texte.includes('Salut Jean,'));
    assert.ok(texte.includes(`J'ai bien reçu ta demande de rétractation le ${RECU_LE} (heure de Paris).`));
    assert.ok(texte.includes('Nom : Jean Dupont'));
    assert.ok(texte.includes('Email : pilote@exemple.test'));
    assert.ok(texte.includes('Référence de commande : WSRAHX5B-0002'));
    assert.ok(texte.includes('Produit concerné : Le débrief onboard'));
    assert.ok(texte.includes("Message : Je n'ai finalement pas le temps\nde filmer ma session."));
    assert.ok(texte.includes(`Reçue le : ${RECU_LE} (heure de Paris)`));
    assert.ok(texte.includes('Ta demande sera traitée, et le remboursement éventuel effectué, dans les 14 jours suivant sa réception.'));
    assert.ok(texte.includes('Clem Kart Racing, EI Clément Daniel'));
    assert.ok(F.normaliser(accuse.htmlContent).includes(RECU_LE));
    assert.ok(accuse.htmlContent.includes('temps<br>de filmer'));
    assert.ok(accuse.htmlContent.includes('Renoncer au contrat ici'));

    assert.deepEqual(copie.to, [{ email: 'interne@exemple.test' }]);
    assert.equal(copie.subject, 'Rétractation reçue : WSRAHX5B-0002');
    const texteCopie = F.normaliser(copie.textContent);
    assert.ok(texteCopie.includes('Reçue le jeudi 24 septembre 2026 à 14 h 05 (heure de Paris). Traitement et remboursement éventuel avant le jeudi 8 octobre 2026.'));
    assert.ok(texteCopie.includes('Email : pilote@exemple.test'));

    const [trace] = F.insertions(sim, 'retractations');
    assert.deepEqual(trace, {
      reference: 'WSRAHX5B-0002',
      produit: 'debrief',
      recu_le: new Date(RECEPTION_MS).toISOString(),
      email_empreinte: empreinte('pilote@exemple.test'),
    });
    assert.ok(!JSON.stringify(trace).includes('pilote@'), 'aucun email en clair en base');
  });

  it('référence donnée sous forme d\'email : jamais stockée en base', async () => {
    const rep = await envoyer({ ...DEMANDE, reference: 'pilote@exemple.test', produit: 'les_deux' });
    assert.equal(rep.statusCode, 200);
    const [trace] = F.insertions(sim, 'retractations');
    assert.equal(trace.produit, 'les_deux');
    assert.ok(!JSON.stringify(trace).includes('@'));
    assert.ok(F.emailsEnvoyes(sim)[0].textContent.includes('Référence de commande : pilote@exemple.test'));
  });

  it('validation : champs obligatoires, email, produit, longueurs', async () => {
    const cas = [
      [{ ...DEMANDE, nom: '   ' }, 'nom'],
      [{ ...DEMANDE, nom: 'x'.repeat(101) }, 'nom'],
      [{ ...DEMANDE, email: 'pas-un-email' }, 'email'],
      [{ ...DEMANDE, email: 'a@b' }, 'email'],
      [{ ...DEMANDE, email: undefined }, 'email'],
      [{ ...DEMANDE, reference: '' }, 'reference'],
      [{ ...DEMANDE, reference: 'r'.repeat(201) }, 'reference'],
      [{ ...DEMANDE, produit: 'voiture' }, 'produit'],
      [{ ...DEMANDE, produit: undefined }, 'produit'],
      [{ ...DEMANDE, message: 'm'.repeat(2001) }, 'message'],
    ];
    for (const [donnees, champ] of cas) {
      const rep = await envoyer(donnees);
      assert.equal(rep.statusCode, 400, champ);
      const corps = JSON.parse(rep.body);
      assert.equal(corps.ok, false);
      assert.equal(corps.erreur, 'validation');
      assert.ok(corps.champs[champ], `erreur attendue sur ${champ}`);
    }
    assert.equal(sim.appels.length, 0);
  });

  it('message facultatif', async () => {
    const rep = await envoyer({ ...DEMANDE, message: undefined });
    assert.equal(rep.statusCode, 200);
    assert.ok(F.emailsEnvoyes(sim)[0].textContent.includes('Message : (aucun)'));
  });

  it('JSON invalide ou corps vide : 400', async () => {
    assert.equal((await envoyer('{pas du json')).statusCode, 400);
    assert.equal((await envoyer('')).statusCode, 400);
    assert.equal((await envoyer('[1,2]')).statusCode, 400);
  });

  it('corps encodé en base64 accepté', async () => {
    const rep = await envoyer(DEMANDE, ipUnique(), { base64: true });
    assert.equal(rep.statusCode, 200);
    assert.equal(F.emailsEnvoyes(sim).length, 2);
  });

  it('échappe le contenu saisi dans le HTML de l\'accusé', async () => {
    const rep = await envoyer({ ...DEMANDE, nom: '<b onmouseover=alert(1)>Pirate</b>', message: '<script>alert(2)</script>' });
    assert.equal(rep.statusCode, 200);
    for (const email of F.emailsEnvoyes(sim)) {
      assert.ok(!email.htmlContent.includes('<script>'));
      assert.ok(!email.htmlContent.includes('<b onmouseover'));
      assert.ok(email.htmlContent.includes('&lt;script&gt;alert(2)&lt;/script&gt;'));
    }
  });

  it('échec de l\'accusé de réception : 502, rien d\'enregistré', async () => {
    sim.sur('POST', F.BREVO, { status: 500, json: { message: 'panne' } });
    const rep = await envoyer(DEMANDE);
    assert.equal(rep.statusCode, 502);
    assert.equal(JSON.parse(rep.body).ok, false);
    assert.equal(F.insertions(sim, 'retractations').length, 0);
  });

  it('échec de la copie interne ou de la trace : le client a son accusé, réponse ok', async () => {
    let envois = 0;
    sim.sur('POST', F.BREVO, () => {
      envois += 1;
      return envois === 1 ? { status: 201, json: { messageId: 'a' } } : { status: 500, json: { message: 'panne' } };
    });
    sim.sur('POST', `${F.SUPABASE}/rest/v1/retractations`, { status: 500, json: { message: 'panne' } });
    const rep = await envoyer(DEMANDE);
    assert.equal(rep.statusCode, 200);
    assert.equal(JSON.parse(rep.body).ok, true);
  });

  it('limite : 5 demandes par heure et par IP, la 6e reçoit 429', async () => {
    const ip = '198.18.0.1';
    for (let i = 0; i < 5; i += 1) {
      const rep = await envoyer({ ...DEMANDE, site_web: 'robot' }, ip);
      assert.equal(rep.statusCode, 200);
    }
    const bloquee = await envoyer(DEMANDE, ip);
    assert.equal(bloquee.statusCode, 429);
    assert.equal(JSON.parse(bloquee.body).ok, false);
    assert.ok(Number(bloquee.headers['Retry-After']) > 0);
    assert.equal((await envoyer(DEMANDE, '198.18.0.2')).statusCode, 200);
  });

  it("corps annoncé autrement qu'en JSON (formulaire ou text/plain d'un autre site) : 415, aucun envoi", async () => {
    for (const type of ['text/plain', 'application/x-www-form-urlencoded', null]) {
      const rep = await envoyer(DEMANDE, ipUnique(), { entetes: { 'content-type': type } });
      assert.equal(rep.statusCode, 415, String(type));
    }
    assert.equal(sim.appels.length, 0);
  });

  it("requête venue d'un autre site : 403, aucun envoi", async () => {
    const autreOrigine = await envoyer(DEMANDE, ipUnique(), { entetes: { origin: 'https://piege.exemple.test' } });
    assert.equal(autreOrigine.statusCode, 403);
    const intersite = await envoyer(DEMANDE, ipUnique(), { entetes: { 'sec-fetch-site': 'cross-site' } });
    assert.equal(intersite.statusCode, 403);
    assert.equal(sim.appels.length, 0);
  });

  it("requête du site lui-même ou d'un déploiement Netlify : acceptée", async () => {
    const memeSite = await envoyer(DEMANDE, ipUnique(), {
      entetes: { origin: 'https://boutique.exemple.test', 'sec-fetch-site': 'same-origin' },
    });
    assert.equal(memeSite.statusCode, 200);
    process.env.DEPLOY_PRIME_URL = 'https://brouillon--boutique.exemple.test';
    try {
      const brouillon = await envoyer(DEMANDE, ipUnique(), { entetes: { origin: 'https://brouillon--boutique.exemple.test' } });
      assert.equal(brouillon.statusCode, 200);
    } finally {
      delete process.env.DEPLOY_PRIME_URL;
    }
  });

  it('limite durable : 2 demandes par email sur 24 h, la suivante reçoit 429 sans aucun email', async () => {
    sim.sur('GET', `${F.SUPABASE}/rest/v1/retractations`, { status: 200, json: [{ id: 1 }, { id: 2 }] });
    const rep = await envoyer(DEMANDE);
    assert.equal(rep.statusCode, 429);
    assert.equal(JSON.parse(rep.body).erreur, 'demande_deja_recue');
    assert.equal(F.emailsEnvoyes(sim).length, 0);
    const [lecture] = sim.appelsVers('GET', `${F.SUPABASE}/rest/v1/retractations`);
    assert.ok(lecture.url.includes('email_empreinte=eq.' + empreinte('pilote@exemple.test')));
    assert.ok(!lecture.url.includes('pilote'), "jamais l'email en clair dans la requête");
  });

  it('limite durable : le même email en majuscules compte comme le même', async () => {
    await envoyer({ ...DEMANDE, email: 'Pilote@Exemple.test' });
    const [trace] = F.insertions(sim, 'retractations');
    assert.equal(trace.email_empreinte, empreinte('pilote@exemple.test'));
  });

  it('base injoignable ou table absente : la limite par email ne bloque pas la demande', async () => {
    sim.sur('GET', `${F.SUPABASE}/rest/v1/retractations`, { status: 404, json: { message: 'relation absente' } });
    const rep = await envoyer(DEMANDE);
    assert.equal(rep.statusCode, 200);
    assert.equal(F.emailsEnvoyes(sim).length, 2);
  });

  it('autre méthode que POST : 405', async () => {
    const rep = await handler({ httpMethod: 'GET', headers: {}, body: null });
    assert.equal(rep.statusCode, 405);
  });
});
