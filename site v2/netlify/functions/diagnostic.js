'use strict';
// Diagnostic de pilotage (page /diagnostic) : POST JSON
// { prenom, email, consent, reponses: { idQuestion: indice | { autre: "texte" } }, libre, utm, site_web }.
//
// 1. Validation stricte : chaque réponse doit correspondre à une question et à une option connues
//    (assets/diagnostic-donnees.js, le même fichier que la page). Rien n'est repris tel quel.
// 2. Le calcul est REFAIT ici : le navigateur n'envoie aucun score, seulement des réponses.
// 3. Copie à Clément (bloquante) : toutes les réponses, ce que le pilote a écrit avec ses mots, ses
//    3 priorités. C'est avec cet email qu'il écrit le plan d'action à la main. L'adresse du pilote est
//    en « répondre à ».
// 4. Email au pilote (non bloquant) : son diagnostic, ses 3 premiers points à travailler.
// 5. Brevo : le contact n'est ajouté à une liste QUE si le pilote a coché la case des conseils par email.
//    Sans la case, il reçoit seulement son diagnostic (email de service) et n'entre dans aucune liste.
// Aucune base de données : les réponses vivent dans l'email reçu par Clément.
// Anti-abus : JSON obligatoire, origine du site exigée, pot de miel « site_web », 5 envois par heure
// et par IP, 60 par heure pour toute l'instance.

const OFFRES = require('../../../config/offres.json');
const DONNEES = require('../../assets/diagnostic-donnees.js');
const { envoyerEmail } = require('../lib/brevo');
const emails = require('../lib/emails');
const { formaterDateHeure } = require('../lib/dates');
const { estEmailValide } = require('../lib/format');
const { reponseJson, corpsTexte, ipClient, creerLimiteur, entete, requete } = require('../lib/http');
const { avecDefaut, lire } = require('../lib/config');

const LONGUEURS_MAX = Object.freeze({ prenom: 30, email: 254, autre: 400, libre: 600, utm: 60 });
const TAILLE_MAX_CORPS = 16 * 1024;
const CLES_UTM = Object.freeze(['utm_source', 'utm_medium', 'utm_campaign', 'utm_content']);
const VARIABLES_ORIGINE = Object.freeze(['SITE_URL', 'URL', 'DEPLOY_URL', 'DEPLOY_PRIME_URL']);
const PROTOCOLE = new RegExp('^https?://', 'i');
const ATTRIBUT_BREVO = 'DIAGNOSTIC_FAIT';
const API_CONTACTS = 'https://api.brevo.com/v3/contacts';

const QUESTIONS = DONNEES.ECRANS.filter((e) => e.type === 'choix');
const limiteurIp = creerLimiteur({ max: 5, fenetreMs: 60 * 60 * 1000 });
// Garde-fou global par instance : un email part à l'adresse saisie, on borne le volume possible.
const limiteurGlobal = creerLimiteur({ max: 60, fenetreMs: 60 * 60 * 1000 });

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return reponseJson(405, { ok: false, erreur: 'methode_non_autorisee' }, { Allow: 'POST' });
  if (!estJson(event)) return reponseJson(415, { ok: false, erreur: 'json_attendu' });
  if (!origineAutorisee(event)) return reponseJson(403, { ok: false, erreur: 'origine_refusee' });

  const limite = limiteurIp.autoriser(ipClient(event));
  if (!limite.autorise) return reponseJson(429, { ok: false, erreur: 'trop_de_requetes' }, { 'Retry-After': String(limite.reessayerDansSec) });

  const texte = corpsTexte(event);
  if (texte.length > TAILLE_MAX_CORPS) return reponseJson(413, { ok: false, erreur: 'trop_volumineux' });
  let donnees;
  try {
    donnees = JSON.parse(texte || 'null');
  } catch {
    return reponseJson(400, { ok: false, erreur: 'json_invalide' });
  }
  if (!donnees || typeof donnees !== 'object' || Array.isArray(donnees)) return reponseJson(400, { ok: false, erreur: 'json_invalide' });

  // Pot de miel rempli : réponse identique à un succès, sans aucun envoi.
  if (typeof donnees.site_web === 'string' ? donnees.site_web.trim() : donnees.site_web) return reponseJson(200, { ok: true });

  const { erreurs, valeurs } = valider(donnees);
  if (erreurs) return reponseJson(400, { ok: false, erreur: 'validation', champs: erreurs });

  const global = limiteurGlobal.autoriser('tous');
  if (!global.autorise) return reponseJson(429, { ok: false, erreur: 'trop_de_requetes' }, { 'Retry-After': String(global.reessayerDansSec) });

  const contenu = composerContenu(valeurs);

  // 1. La copie à Clément : bloquante. Sans elle, le diagnostic n'existe pas pour lui (la page propose de réessayer).
  try {
    await envoyerEmail({
      destinataire: { email: avecDefaut('EMAIL_INTERNE') },
      repondreA: valeurs.email,
      ...emails.emailDiagnosticInterne(contenu),
    });
  } catch (err) {
    console.error(`[diagnostic] copie interne non envoyée : ${err.message}`);
    return reponseJson(502, { ok: false, erreur: 'envoi_impossible' });
  }

  // 2. Le diagnostic au pilote : non bloquant (il l'a déjà sous les yeux, et Clément a ses réponses).
  try {
    await envoyerEmail({
      destinataire: { email: valeurs.email, nom: valeurs.prenom },
      ...emails.emailDiagnosticClient(contenu),
    });
  } catch (err) {
    console.error(`[diagnostic] email au pilote non envoyé : ${err.message}`);
  }

  // 3. Brevo : seulement avec l'accord explicite du pilote. Non bloquant.
  if (valeurs.consent) await enregistrerContact(valeurs.email);

  return reponseJson(200, { ok: true });
};

// ---------- Validation ----------

// Retire les caractères de contrôle (sauf tabulation et retours à la ligne), sans échappement unicode dans le source.
function sansControles(s) {
  let out = '';
  for (const ch of s) {
    const c = ch.codePointAt(0);
    if (c === 9 || c === 10 || c === 13 || (c >= 32 && c !== 127)) out += ch;
  }
  return out;
}
function texteLibre(v, max) {
  return typeof v === 'string' ? sansControles(v).trim().slice(0, max) : '';
}
// Une seule ligne : le prénom finit dans l'objet d'un email.
function ligneSimple(v, max) {
  return typeof v === 'string' ? sansControles(v).replace(/[\r\n\t]+/g, ' ').replace(/ {2,}/g, ' ').trim().slice(0, max) : '';
}

function valider(d) {
  const erreurs = {};
  const prenom = ligneSimple(d.prenom, LONGUEURS_MAX.prenom);
  if (!prenom) erreurs.prenom = 'requis';
  const email = typeof d.email === 'string' ? d.email.trim().toLowerCase() : '';
  if (!email || email.length > LONGUEURS_MAX.email || !estEmailValide(email)) erreurs.email = 'invalide';

  // Réponses : seules les questions connues, un indice d'option existant ou un texte écrit par le pilote.
  const brutes = d.reponses && typeof d.reponses === 'object' && !Array.isArray(d.reponses) ? d.reponses : {};
  const reponses = {};
  for (const q of QUESTIONS) {
    if (!Object.hasOwn(brutes, q.id)) continue;
    const v = brutes[q.id];
    if (Number.isInteger(v) && v >= 0 && v < q.o.length) reponses[q.id] = v;
    else if (q.autre && v && typeof v === 'object' && !Array.isArray(v)) {
      const autre = texteLibre(v.autre, LONGUEURS_MAX.autre);
      if (autre) reponses[q.id] = { autre };
    }
  }
  // Un diagnostic sans réponse n'en est pas un : au moins la moitié des questions.
  if (Object.keys(reponses).length < Math.ceil(QUESTIONS.length / 2)) erreurs.reponses = 'incompletes';

  const utmBrut = d.utm && typeof d.utm === 'object' && !Array.isArray(d.utm) ? d.utm : {};
  const utm = {};
  for (const cle of CLES_UTM) {
    const v = ligneSimple(utmBrut[cle], LONGUEURS_MAX.utm).replace(/[^A-Za-z0-9._-]/g, '');
    if (v) utm[cle] = v;
  }

  if (Object.keys(erreurs).length) return { erreurs, valeurs: null };
  return { erreurs: null, valeurs: { prenom, email, consent: d.consent === true, reponses, libre: texteLibre(d.libre, LONGUEURS_MAX.libre), utm } };
}

// ---------- Contenu des deux emails ----------

function composerContenu(v) {
  const res = DONNEES.scorer(v.reponses);
  const lignes = QUESTIONS.map((q) => {
    const r = v.reponses[q.id];
    const question = q.q.replace('{prenom}', v.prenom);
    if (r == null) return [question, '(pas de réponse)'];
    if (typeof r === 'number') return [question, q.o[r][0]];
    return [question, `Écrit par le pilote : ${r.autre}`];
  });
  const source = [v.utm.utm_source, v.utm.utm_medium, v.utm.utm_campaign, v.utm.utm_content].filter(Boolean).join(' / ');
  return {
    prenom: v.prenom,
    email: v.email,
    consent: v.consent,
    indice: res.indice,
    marge: DONNEES.marge(res.indice),
    priorites: res.priorites.slice(0, 3).map((a) => ({ ...DONNEES.POINTS[a], score: res.scores[a] })),
    autres: res.priorites.slice(3).map((a) => ({ nom: DONNEES.POINTS[a].nom, score: res.scores[a] })),
    forts: res.forts.map((a) => ({ nom: DONNEES.POINTS[a].nom, fort: DONNEES.POINTS[a].fort })),
    lignes,
    libre: v.libre,
    source: source || '(lien direct)',
    recuLe: formaterDateHeure(new Date(Date.now()), { annee: true }),
    delaiPlan: OFFRES.diagnostic.delai_affiche,
    planOuvert: OFFRES.diagnostic.stripe.pret === 'oui',
    lienDiagnostic: `${adresseSite()}${OFFRES.routes.diagnostic}`,
  };
}

function adresseSite() {
  const valeur = lire('SITE_URL') || lire('URL') || OFFRES.sites[OFFRES.sites.actif] || OFFRES.sites.site1;
  return String(PROTOCOLE.test(valeur) ? valeur : `https://${valeur}`).replace(/\/+$/, '');
}

// ---------- Brevo (contact, seulement avec accord) ----------

async function enregistrerContact(email) {
  let cle;
  try {
    cle = lire('BREVO_API_KEY');
  } catch {
    cle = '';
  }
  if (!cle) return;
  const entetes = { 'api-key': cle, 'Content-Type': 'application/json', Accept: 'application/json' };
  // L'attribut doit exister avant d'être posé. « already exist » est le cas normal après le premier diagnostic.
  try {
    await requete('Brevo', `${API_CONTACTS}/attributes/normal/${ATTRIBUT_BREVO}`, { method: 'POST', headers: entetes, body: JSON.stringify({ type: 'text' }) });
  } catch (err) {
    // 400 : l'attribut existe déjà (cas normal). Tout autre statut est noté, sans bloquer.
    if (err.statut !== 400) console.error(`[diagnostic] attribut Brevo non créé (non bloquant) : ${err.message}`);
  }
  // Liste : BREVO_DIAGNOSTIC_LIST_ID si elle est réglée, sinon celle des conseils par email (BREVO_TABLEUR_LIST_ID).
  const listId = parseInt(lire('BREVO_DIAGNOSTIC_LIST_ID') || lire('BREVO_TABLEUR_LIST_ID') || '', 10);
  const contact = { email, updateEnabled: true, attributes: { SOURCE: 'diagnostic', [ATTRIBUT_BREVO]: new Date().toISOString().slice(0, 10) } };
  if (Number.isInteger(listId) && listId > 0) contact.listIds = [listId];
  try {
    await requete('Brevo', API_CONTACTS, { method: 'POST', headers: entetes, body: JSON.stringify(contact) });
  } catch (err) {
    console.error(`[diagnostic] contact Brevo non enregistré (non bloquant) : ${err.message}`);
  }
}

// ---------- Origine ----------

// Corps annoncé en JSON : un formulaire posté depuis un autre site est refusé.
function estJson(event) {
  return String(entete(event, 'content-type') || '').trim().toLowerCase().startsWith('application/json');
}

// Hôtes du site (adresse publique, déploiements Netlify, adresses de la config), sans protocole.
function hotesDuSite() {
  const hotes = new Set();
  const candidats = VARIABLES_ORIGINE.map((nom) => lire(nom)).concat([OFFRES.sites.site1, OFFRES.sites.site2, OFFRES.sites.domaine]);
  for (const valeur of candidats) {
    if (!valeur) continue;
    try {
      hotes.add(new URL(PROTOCOLE.test(valeur) ? valeur : `https://${valeur}`).host.toLowerCase());
    } catch {
      // Valeur illisible : ignorée.
    }
  }
  return hotes;
}

// Requête venue d'un autre site : refusée. Sans en-tête Origin (outil, serveur), seul Sec-Fetch-Site compte.
function origineAutorisee(event) {
  if (String(entete(event, 'sec-fetch-site') || '').toLowerCase() === 'cross-site') return false;
  const origine = entete(event, 'origin');
  if (!origine) return true;
  try {
    const hote = new URL(String(origine)).host.toLowerCase();
    if (/^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(hote)) return true;
    return hotesDuSite().has(hote);
  } catch {
    return false;
  }
}

// Lu par tests/run-diagnostic.js. Netlify n'appelle que handler.
exports._interne = { valider, composerContenu, limiteurIp, limiteurGlobal };
