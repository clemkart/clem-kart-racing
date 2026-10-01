// =============================================
// Clem Kart Racing : demande.js, les formulaires « sur demande », sans paiement.
// /consulting (demande de date pour le consulting en piste, puis devis) et /marques
// (collaboration commerciale, sponsoring).
//
// POST JSON { type: 'journee' | 'marques', email, rgpd, ...champs }
// ou, sans JavaScript, le même formulaire en application/x-www-form-urlencoded
// (la réponse est alors une petite page HTML au lieu d'un JSON).
//
// 1. Validation stricte de chaque champ : types, longueurs, listes fermées, piège à robots.
// 2. Contact enregistré dans Brevo avec l'attribut CONSULTING_DEMANDE, COLLAB_DEMANDE ou
//    SPONSOR_DEMANDE (date du jour), comme send-email.js pose EXTRAIT_ENVOYE. Non bloquant.
// 3. Copie de la demande à Clément (contact.email de la config) : c'est lui qui répond, à la main.
//    Bloquant : une demande qui n'arrive pas à un humain n'existe pas.
// 4. Accusé de réception transactionnel Brevo au demandeur : tutoiement pour le pilote (consulting),
//    vouvoiement pour la marque, adapté à son parcours (saison, réseaux, les deux), textes de
//    Digital product/sponsoring/COPY-PAGE-MARQUES.md (section 10). Non bloquant : la demande est déjà chez Clément, et une erreur
//    affichée ferait renvoyer le formulaire (donc une deuxième copie de la même demande).
//    La page affiche sa propre confirmation dans tous les cas.
// 5. Rate limit par IP (ipClient), piège à robots, contrôle d'origine, CORS restreint aux sites
//    et clé BREVO_API_KEY identiques à send-email.js.
//
// Consulting en piste (journee.titre) : nom, prix, unité et délai de réponse viennent de
// config/offres.json (journee.*), jamais écrits ici. Aucun lien Stripe, aucun paiement en ligne :
// demande, puis devis envoyé à la main par Clément. Aucun titre « coach », « entraîneur »,
// « moniteur », « éducateur » ni « professeur » (tests/run-demande.js).
// Marques : deux parcours séparés (décision de Clément du 01/10/2026). Le parrainage de saison
// (profil sponsor) passe par son association loi 1901 (sponsoring.association.nom_affiche), la
// collaboration réseaux (profil marque) par sa micro-entreprise (marques.structure_reseaux).
// Saison, nom de l'association et structure lus dans config/offres.json. Jamais de reçu fiscal.
// Expéditeur, adresse du site et routes viennent de config/offres.json, embarqué avec la
// fonction par netlify.toml (included_files), comme relance-guide.js.
// =============================================

'use strict';

const OFFRES = require('../../../config/offres.json');
// Typographie française (espaces insécables avant : ; ? ! », entre un nombre et €, h, %) :
// le même module que les pages du site, appliqué au corps HTML des accusés de réception et des pages de réponse seulement (l'objet, la version
// texte et la copie à Clément restent tels quels). esbuild l'empaquette avec la fonction.
const { typographier } = require('../../../scripts/typographie.js');
// IP du visiteur (x-nf-client-connection-ip, posé par Netlify, en priorité) et lecture des
// en-têtes sans tenir compte de la casse. Le dossier lib est à côté de functions, jamais dedans.
const { ipClient, entete } = require('../lib/http.js');

// Adresse publique du site selon sites.actif. /onboard/ vit sur le site 2 tant que le
// domaine n'est pas actif (plan V4, section 3) : le lien de l'email suit la même règle.
const SITE_URL = OFFRES.sites[OFFRES.sites.actif] || OFFRES.sites.site1;
const SENDER = { name: OFFRES.marque.nom, email: OFFRES.contact.email };
const DESTINATAIRE = OFFRES.contact.email;
// Délai de réponse aux marques : config/offres.json (delais.reponse_marques_h), aucun repli écrit ici.
const DELAI_MARQUES_H = Number(OFFRES.delais.reponse_marques_h);
if (!Number.isFinite(DELAI_MARQUES_H) || DELAI_MARQUES_H <= 0) {
  throw new Error('config/offres.json : delais.reponse_marques_h manquant');
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const LIMITES = {
  email: 254, societe: 120, prenom: 60, site: 200, objectif: 300, message: 2000, piege: 200,
  telephone: 25, circuit: 120, periode: 120, kart: 160, travail: 1000
};
const MAX_FORMATS = 5;
// Téléphone facultatif : chiffres, espaces, + ( ) . et trait d'union, au moins 6 chiffres.
const TELEPHONE_RE = /^[0-9+(). -]{6,25}$/;
const TELEPHONE_CHIFFRES_MIN = 6;

// Consulting en piste : nom, prix, unité et délai de réponse lus dans config/offres.json.
const JOURNEE = OFFRES.journee;
const JOURNEE_DELAI_H = Number(JOURNEE.reponse_h);
if (!JOURNEE.titre || !JOURNEE.prix_affiche || !JOURNEE.unite || !Number.isFinite(JOURNEE_DELAI_H) || JOURNEE_DELAI_H <= 0) {
  throw new Error('config/offres.json : journee.titre, prix_affiche, unite ou reponse_h manquant');
}

// Marques : saison, association et structure lus dans config/offres.json (sponsoring.*, marques.*).
const SPONSORING = OFFRES.sponsoring || {};
const SAISON = String(SPONSORING.saison || '');
const ASSOCIATION = (SPONSORING.association && SPONSORING.association.nom_affiche) || '';
const STRUCTURE_RESEAUX = (OFFRES.marques && OFFRES.marques.structure_reseaux) || '';
if (!SAISON || !ASSOCIATION || !STRUCTURE_RESEAUX) {
  throw new Error('config/offres.json : sponsoring.saison, sponsoring.association.nom_affiche ou marques.structure_reseaux manquant');
}

// Clés gardées (marque, sponsor, autre) : un formulaire resté en cache poste encore ces valeurs.
const PROFILS = { marque: 'Des vidéos sur vos réseaux', sponsor: 'Mon logo sur votre saison', autre: 'Les deux, ou je ne sais pas encore' };
// Parcours de la page /marques : #saison, #reseaux, ou les deux.
const PARCOURS = { sponsor: 'saison', marque: 'reseaux', autre: 'deux' };
// Formules de saison : libellés lus dans la config (sponsoring.formules.*.titre), liste fermée.
const FORMULES_CONFIG = SPONSORING.formules || {};
const FORMULES = {
  ...Object.fromEntries(Object.entries(FORMULES_CONFIG).map(([cle, f]) => [cle, f && f.titre ? f.titre : cle])),
  'ne-sais-pas': 'Je ne sais pas encore'
};
const FORMATS = {
  'video-sponsorisee': 'Vidéo sponsorisée',
  'produit-teste': 'Produit testé sur piste',
  'video-livree': 'Vidéo livrée à la marque, non publiée chez moi',
  ambassadeur: 'Programme ambassadeur à la saison',
  'logo-kart': 'Logo sur le kart',
  'logo-combinaison': 'Logo sur la combinaison ou le casque',
  'mention-videos': 'Mention dans les vidéos',
  'posts-dedies': 'Posts dédiés',
  'ne-sais-pas': 'Je ne sais pas encore'
};
// Tranches de réponse (pas des prix de vente). Saison : moins-1000 à plus-6000 ; réseaux :
// moins-300 à plus-1000. « plus » reste pour les formulaires en cache.
const BUDGETS = {
  'moins-300': 'Moins de 300 €',
  '300-1000': '300 à 1 000 €',
  'plus-1000': 'Plus de 1 000 €',
  'moins-1000': 'Moins de 1 000 €',
  '1000-3000': '1 000 à 3 000 €',
  '3000-6000': '3 000 à 6 000 €',
  'plus-6000': 'Plus de 6 000 €',
  plus: 'Plus',
  'ne-sais-pas': 'Je ne sais pas encore'
};
const DELAIS = { 'ce-mois': 'Ce mois-ci', '3-mois': 'Dans les 3 mois', 'plus-tard': 'Plus tard', 'sans-date': 'Pas de date' };

// Palette des emails (identique à send-email.js, sans or). Pas de rgba() ni de variables CSS en HTML email.
const C = { page: '#050505', card: '#0F0F0F', line: '#241f1f', text: '#f2ede8', muted: '#a49e97', faint: '#6f6a65', red: '#D9171D' };

// ------------------------------------------------------------------ anti-abus

// Rate limit léger en mémoire (par instance chaude), même principe que send-email.js.
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const rateLimitMap = new Map();

function checkRateLimit(ip) {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    rateLimitMap.set(ip, { count: 1, windowStart: now });
    return true;
  }
  if (entry.count >= RATE_LIMIT_MAX) return false;
  entry.count++;
  return true;
}

// ------------------------------------------------------------------ nettoyage

// Retire les caractères de contrôle (sauf tabulation et retours à la ligne) sans échappement
// unicode dans le source : les outils d'édition les décodent parfois.
function sansControles(s) {
  let out = '';
  for (const ch of s) {
    const c = ch.codePointAt(0);
    if (c === 9 || c === 10 || c === 13 || (c >= 32 && c !== 127)) out += ch;
  }
  return out;
}

function texte(v, max) {
  if (typeof v !== 'string') return '';
  return sansControles(v).trim().slice(0, max);
}

// Champ d'une seule ligne (région, société, prénom...) : il peut finir dans l'objet d'un
// email, donc aucun retour à la ligne ni tabulation, espaces multiples réduits à un seul.
function ligneSimple(v, max) {
  if (typeof v !== 'string') return '';
  return sansControles(v).replace(/[\r\n\t]+/g, ' ').replace(/ {2,}/g, ' ').trim().slice(0, max);
}

function choix(v, table) {
  return typeof v === 'string' && Object.hasOwn(table, v) ? v : '';
}

function estCoche(v) {
  if (v === true) return true;
  if (typeof v !== 'string') return false;
  return ['true', 'on', 'oui', '1'].includes(v.trim().toLowerCase());
}

function echapper(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ------------------------------------------------------------------ validation

// vous : formulaire des marques (vouvoiement) ; sinon le pilote (tutoiement).
function validerCommun(b, vous) {
  const erreurs = {};
  const v = {};
  v.email = ligneSimple(b.email, LIMITES.email + 1);
  if (!v.email || v.email.length > LIMITES.email || !EMAIL_RE.test(v.email)) erreurs.email = 'Email invalide';
  if (!estCoche(b.rgpd)) erreurs.rgpd = vous ? 'Il faut cocher la case pour que je garde votre demande' : 'Il faut cocher la case pour que je garde ta demande';
  v.piege = texte(b.site_web, LIMITES.piege);
  return { erreurs, v };
}

function telephoneValide(t) {
  return TELEPHONE_RE.test(t) && t.replace(/[^0-9]/g, '').length >= TELEPHONE_CHIFFRES_MIN;
}

// Consulting en piste : prénom, email, téléphone facultatif, circuit, date ou période,
// catégorie et kart, ce que le pilote veut travailler.
function validerJournee(b) {
  const { erreurs, v } = validerCommun(b);
  v.prenom = ligneSimple(b.prenom, LIMITES.prenom);
  if (!v.prenom) erreurs.prenom = 'Prénom manquant';
  v.telephone = ligneSimple(b.telephone, LIMITES.telephone + 1);
  if (v.telephone && (v.telephone.length > LIMITES.telephone || !telephoneValide(v.telephone))) erreurs.telephone = 'Téléphone invalide';
  v.circuit = ligneSimple(b.circuit, LIMITES.circuit);
  if (!v.circuit) erreurs.circuit = 'Circuit manquant';
  v.periode = ligneSimple(b.periode, LIMITES.periode);
  if (!v.periode) erreurs.periode = 'Date ou période manquante';
  v.kart = ligneSimple(b.kart, LIMITES.kart);
  if (!v.kart) erreurs.kart = 'Catégorie et kart manquants';
  v.travail = texte(b.travail, LIMITES.travail);
  if (!v.travail) erreurs.travail = 'Dis-moi ce que tu veux travailler';
  return { erreurs, v };
}

// Marques : projet (profil), entreprise, prénom, email et case obligatoires ; formule (saison
// seulement), téléphone, budget, site et message facultatifs. objectif et formats restent lus
// (formulaires en cache) mais ne sont plus exigés.
function validerMarques(b) {
  const { erreurs, v } = validerCommun(b, true);
  v.profil = choix(b.profil, PROFILS);
  if (!v.profil) erreurs.profil = 'Choisissez votre projet';
  v.parcours = v.profil ? PARCOURS[v.profil] : '';
  v.societe = ligneSimple(b.societe, LIMITES.societe);
  if (!v.societe) erreurs.societe = 'Le nom de votre entreprise ou de votre marque manque';
  v.prenom = ligneSimple(b.prenom, LIMITES.prenom);
  if (!v.prenom) erreurs.prenom = 'Votre prénom manque';
  v.telephone = ligneSimple(b.telephone, LIMITES.telephone + 1);
  if (v.telephone && (v.telephone.length > LIMITES.telephone || !telephoneValide(v.telephone))) erreurs.telephone = 'Téléphone invalide';
  // La formule ne vaut que pour la saison (ou « les deux ») : ignorée pour une collaboration réseaux.
  v.formule = v.parcours === 'reseaux' ? '' : choix(b.formule, FORMULES);
  v.site = ligneSimple(b.site, LIMITES.site);
  v.objectif = ligneSimple(b.objectif, LIMITES.objectif);
  const formats = Array.isArray(b.formats) ? b.formats : (typeof b.formats === 'string' ? [b.formats] : []);
  v.formats = [...new Set(formats.map((f) => choix(f, FORMATS)).filter(Boolean))].slice(0, MAX_FORMATS);
  v.budget = choix(b.budget, BUDGETS);
  v.delai = choix(b.delai, DELAIS);
  v.message = texte(b.message, LIMITES.message);
  return { erreurs, v };
}

// ------------------------------------------------------------------ les deux types

// Confirmation affichée après l'envoi sans JavaScript (la page fait la même avec JavaScript),
// selon le parcours, au vouvoiement (COPY-PAGE-MARQUES.md, section 10.1).
function confirmationMarques(v) {
  const merci = v.prenom ? `Merci ${v.prenom}.` : 'Merci.';
  if (v.parcours === 'saison') {
    return [merci, `Je vous réponds sous ${DELAI_MARQUES_H} h avec une proposition pour la saison ${SAISON}. Si vous avez laissé votre numéro, je vous appelle.`];
  }
  if (v.parcours === 'reseaux') {
    return [merci, `Je vous réponds sous ${DELAI_MARQUES_H} h avec mes chiffres d’audience détaillés et une première proposition.`];
  }
  return [merci, `Je vous réponds sous ${DELAI_MARQUES_H} h et on trie ensemble ce qui vous convient.`];
}

const TYPES = {
  journee: {
    valider: validerJournee,
    source: 'consulting',
    attribut: () => 'CONSULTING_DEMANDE',
    route: OFFRES.routes.journee,
    confirmation: () => ['Bien reçu, merci.', `Je te réponds sous ${JOURNEE_DELAI_H} h avec un devis. Un email de confirmation arrive dans quelques minutes.`],
    reessayer: 'Réessaie plus tard, ou écris-moi à',
    renvoyer: 'Réessaie, ou écris-moi à'
  },
  marques: {
    valider: validerMarques,
    source: 'marques',
    attribut: (v) => (v.profil === 'sponsor' ? 'SPONSOR_DEMANDE' : 'COLLAB_DEMANDE'),
    route: OFFRES.routes.marques,
    confirmation: confirmationMarques,
    reessayer: 'Réessayez plus tard, ou écrivez-moi à',
    renvoyer: 'Réessayez, ou écrivez-moi à'
  }
};

// ------------------------------------------------------------------ briques email

function ligne(html, padding) {
  return `
          <tr>
            <td style="padding:${padding};font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.7;color:${C.muted};">
              ${html}
            </td>
          </tr>`;
}

function header() {
  return `
          <tr>
            <td style="padding:32px 36px 0;">
              <div style="font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:bold;letter-spacing:3px;text-transform:uppercase;color:${C.text};">
                CLEM <span style="color:${C.red};">KART</span> RACING
              </div>
              <div style="height:2px;width:44px;background:${C.red};margin-top:12px;font-size:0;line-height:0;">&nbsp;</div>
            </td>
          </tr>`;
}

function titre(t) {
  return `
          <tr>
            <td style="padding:26px 36px 0;">
              <h1 style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:26px;line-height:1.2;color:${C.text};font-weight:bold;">${t}</h1>
            </td>
          </tr>`;
}

function paragraphe(html) {
  return ligne(html, '18px 36px 0');
}

function signature(nom) {
  return `
          <tr>
            <td style="padding:30px 36px 0;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td style="border-top:1px solid ${C.line};padding-top:22px;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.7;color:${C.muted};">
                    <strong style="color:${C.text};">${nom}</strong><br>
                    <span style="font-size:12px;color:${C.faint};">${OFFRES.marque.nom}</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>`;
}

function pied(html) {
  return `
          <tr>
            <td style="padding:26px 36px 34px;font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:1.7;color:${C.faint};">
              ${html}
            </td>
          </tr>`;
}

function enveloppe(contenu) {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
</head>
<body style="margin:0;padding:0;background:${C.page};">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${C.page};">
  <tr>
    <td align="center" style="padding:24px 12px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="width:100%;max-width:600px;background:${C.card};border-top:3px solid ${C.red};">
        ${contenu}
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}

// ------------------------------------------------------------------ accusés de réception (COPY-AUTRES 3.4 et 4.4)

// « Consulting en piste » au milieu d'une phrase : initiale en minuscule.
function dansLaPhrase(nom) {
  return nom.charAt(0).toLowerCase() + nom.slice(1);
}

// L'accusé dit ce qui va se passer, dans l'ordre : réponse et devis, validation, date.
// Le prénom, le circuit et la période sont du texte saisi par un inconnu : échappés dans le HTML.
function accuseJournee(v) {
  const sujet = `Bien reçu : je te réponds sous ${JOURNEE_DELAI_H} h`;
  const merci = `Merci pour ta demande de ${dansLaPhrase(JOURNEE.titre)} à ${v.circuit} (${v.periode}).`;
  const etapes = [
    `1. Je lis ta demande moi-même et je te réponds sous ${JOURNEE_DELAI_H} h, avec un devis : la journée (${JOURNEE.prix_affiche}, ${JOURNEE.unite}), les frais de déplacement et le total.`,
    '2. Si le devis te va, tu le valides. Rien à payer d\'ici là, et rien en ligne.',
    '3. On fixe la date et on prépare la journée. Si tu as des chronos, des onboards ou des données, garde-les : je te les demanderai.'
  ];
  const html = typographier(enveloppe(
    header() +
    titre(echapper(sujet)) +
    paragraphe(`Salut ${echapper(v.prenom)},`) +
    paragraphe(echapper(merci)) +
    paragraphe('Ce qui se passe maintenant :<br>' + etapes.map(echapper).join('<br>')) +
    paragraphe('Une question en attendant ? Réponds simplement à cet email.') +
    signature('Clément') +
    pied(`Tu reçois cet email parce que tu as demandé une date depuis la page ${echapper(JOURNEE.titre)} du site. Tu peux demander la suppression de ta demande à tout moment en répondant à cet email.`)
  ));
  const text = [
    `Salut ${v.prenom},`,
    '',
    merci,
    '',
    'Ce qui se passe maintenant :',
    ...etapes,
    '',
    'Une question en attendant ? Réponds simplement à cet email.',
    '',
    'Clément',
    OFFRES.marque.nom,
    '',
    'Tu peux demander la suppression de ta demande à tout moment en répondant à cet email.'
  ].join('\n');
  return { subject: sujet, html, text };
}

// Accusé des marques, au vouvoiement, selon le parcours (COPY-PAGE-MARQUES.md, sections 10.2 à 10.4) :
// saison (association, convention, compte rendu), réseaux (contrat, mention légale), les deux.
// Le prénom est du texte saisi par un inconnu : échappé dans le HTML.
function texteAccuseMarques(v) {
  const lu = `Merci pour votre message. Je le lis moi-même et je vous réponds sous ${DELAI_MARQUES_H} h`;
  if (v.parcours === 'saison') {
    return {
      sujet: `Votre demande pour la saison ${SAISON}`,
      ouverture: `${lu} avec une proposition pour la saison ${SAISON}.`,
      intro: 'Pour que tout soit clair dès le départ :',
      points: [
        `le parrainage passe par ${ASSOCIATION}, qui finance ma saison ;`,
        'tout est écrit dans une convention d\'une page, suivie d\'une facture ;',
        'après chaque course, vous recevez un compte rendu avec photos et liens.'
      ],
      fin: 'Si vous préférez en parler de vive voix, répondez à cet email avec votre numéro et un créneau.'
    };
  }
  const pointsReseaux = [
    'je ne présente que des produits que j\'utiliserais moi-même ;',
    'chaque contenu payé porte la mention « Collaboration commerciale » ;',
    'un contrat d\'une page fixe les contenus, les dates, les droits d\'usage et le prix.'
  ];
  if (v.parcours === 'reseaux') {
    return {
      sujet: 'Votre projet de collaboration',
      ouverture: `${lu} avec mes chiffres d’audience détaillés et une première proposition.`,
      intro: 'Trois choses pour gagner du temps :',
      points: pointsReseaux,
      fin: ''
    };
  }
  return {
    sujet: 'Votre demande de partenariat',
    ouverture: `${lu} : on verra ensemble si la saison, les vidéos ou les deux vous conviennent.`,
    intro: 'Trois choses pour gagner du temps :',
    points: pointsReseaux,
    fin: `La saison passe par ${ASSOCIATION}, les vidéos par ${STRUCTURE_RESEAUX} : deux accords séparés, deux factures.`
  };
}

function accuseMarques(v) {
  const t = texteAccuseMarques(v);
  const bonjour = `Bonjour ${v.prenom},`;
  const html = typographier(enveloppe(
    header() +
    titre(echapper(t.sujet)) +
    paragraphe(echapper(bonjour)) +
    paragraphe(echapper(t.ouverture)) +
    paragraphe(echapper(t.intro) + '<br>' + t.points.map(echapper).join('<br>')) +
    (t.fin ? paragraphe(echapper(t.fin)) : '') +
    signature(OFFRES.marque.auteur) +
    pied('Vous recevez cet email parce que vous avez écrit depuis la page Marques et partenaires du site. Vous pouvez demander la suppression de votre demande à tout moment en répondant à cet email.')
  ));
  const text = [
    bonjour,
    '',
    t.ouverture,
    '',
    t.intro,
    ...t.points,
    ...(t.fin ? ['', t.fin] : []),
    '',
    OFFRES.marque.auteur,
    OFFRES.marque.nom,
    '',
    'Vous pouvez demander la suppression de votre demande à tout moment en répondant à cet email.'
  ].join('\n');
  return { subject: t.sujet, html, text };
}

// ------------------------------------------------------------------ copie à Clément

// Chaque valeur saisie est échappée : c'est du texte reçu d'un inconnu, jamais du HTML.
function lignesJournee(v) {
  return [
    ['Prénom', v.prenom],
    ['Email', v.email],
    ['Téléphone', v.telephone || '(non donné)'],
    ['Circuit', v.circuit],
    ['Date ou période', v.periode],
    ['Catégorie et kart', v.kart],
    ['À travailler', v.travail]
  ];
}

// Libellé du parcours pour Clément : qui signe et qui facture.
const PARCOURS_LIBELLES = {
  saison: `Parrainage de saison ${SAISON} (association)`,
  reseaux: `Collaboration réseaux (${STRUCTURE_RESEAUX})`,
  deux: 'Les deux, ou pas encore décidé'
};

// Les champs anciens (objectif, formats, quand) n'apparaissent que s'ils ont été envoyés
// par un formulaire resté en cache.
function lignesMarques(v) {
  const lignes = [
    ['Projet', `${PROFILS[v.profil]} : ${PARCOURS_LIBELLES[v.parcours]}`],
    ['Formule', v.formule ? FORMULES[v.formule] : (v.parcours === 'reseaux' ? '(sans objet)' : '(pas choisie)')],
    ['Entreprise ou marque', v.societe],
    ['Prénom', v.prenom],
    ['Email', v.email],
    ['Téléphone', v.telephone || '(non donné)'],
    ['Site ou Instagram', v.site || '(vide)'],
    ['Budget', v.budget ? BUDGETS[v.budget] : '(pas encore décidé)'],
    ['Message', v.message || '(vide)']
  ];
  if (v.objectif) lignes.push(['Objectif', v.objectif]);
  if (v.formats.length) lignes.push(['Formats', v.formats.map((f) => FORMATS[f]).join(', ')]);
  if (v.delai) lignes.push(['Quand', DELAIS[v.delai]]);
  return lignes;
}

function copieClement(typeKey, v, attribut) {
  const lignes = typeKey === 'journee' ? lignesJournee(v) : lignesMarques(v);
  const sujet = typeKey === 'journee'
    ? `[Site] ${JOURNEE.titre} : ${v.prenom}, ${v.circuit} (${v.periode})`
    : `[Site] Marques : ${v.societe}, ${PARCOURS_LIBELLES[v.parcours]}`;
  const tableau = lignes.map(([nom, val]) => `
                <tr>
                  <td valign="top" width="160" style="padding:8px 12px 8px 0;border-top:1px solid ${C.line};font-family:Arial,Helvetica,sans-serif;font-size:13px;color:${C.faint};">${echapper(nom)}</td>
                  <td valign="top" style="padding:8px 0;border-top:1px solid ${C.line};font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:${C.text};white-space:pre-wrap;">${echapper(val)}</td>
                </tr>`).join('');
  const html = enveloppe(
    header() +
    titre(echapper(sujet.replace('[Site] ', ''))) +
    paragraphe(`Attribut Brevo posé : ${attribut}. Réponds directement à cet email, l'adresse du demandeur est en répondre à.`) +
    `
          <tr>
            <td style="padding:18px 36px 0;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">${tableau}</table>
            </td>
          </tr>` +
    pied(`Demande reçue le ${new Date().toISOString().slice(0, 10)} depuis ${SITE_URL}${TYPES[typeKey].route}.`)
  );
  const text = lignes.map(([nom, val]) => `${nom} : ${val}`).join('\n');
  return { subject: sujet, html, text };
}

// ------------------------------------------------------------------ réponses

// Même règle que send-email.js : pas de CORS ouvert à tous, l'en-tête Access-Control-Allow-Origin
// est posé par le handler avec l'origine de la requête seulement si c'est un des sites.
const CORS = { Vary: 'Origin' };

// Origines autorisées : les deux sites, le domaine, le déploiement courant et ses brouillons
// Netlify (« xxx--nom-du-site.netlify.app »), et le poste local de développement.
function hoteDe(url) {
  try { return new URL(url).host.toLowerCase(); } catch { return ''; }
}
const HOTES_SITES = [...new Set([OFFRES.sites.site1, OFFRES.sites.site2, OFFRES.sites.domaine,
  process.env.URL, process.env.DEPLOY_PRIME_URL, process.env.DEPLOY_URL].map((u) => hoteDe(u || '')).filter(Boolean))];
const HOTE_LOCAL = /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/;

function hoteAutorise(hote) {
  if (!hote) return false;
  if (HOTE_LOCAL.test(hote)) return true;
  return HOTES_SITES.some((s) => hote === s || hote === 'www.' + s || (s.endsWith('.netlify.app') && hote.endsWith('--' + s)));
}

// Origin, sinon Referer. Sans aucun des deux (appel direct, hors navigateur) : accepté, le piège
// à robots et la limite par IP s'en chargent. « Origin: null » (iframe isolée) : refusé.
function origineAutorisee(event) {
  const origin = entete(event, 'origin');
  if (origin) return origin !== 'null' && hoteAutorise(hoteDe(origin));
  const referer = entete(event, 'referer');
  if (referer) return hoteAutorise(hoteDe(referer));
  return true;
}

function entetesCors(event) {
  const origin = entete(event, 'origin');
  const autorise = origin && origin !== 'null' && hoteAutorise(hoteDe(origin));
  return { 'Access-Control-Allow-Origin': autorise ? origin : SITE_URL, Vary: 'Origin' };
}

function json(statusCode, payload) {
  return { statusCode, headers: CORS, body: JSON.stringify(payload) };
}

// Page minimale pour le repli sans JavaScript : mêmes couleurs que le site, aucun script.
function pageHtml(statusCode, titrePage, lignes, retour) {
  const corps = lignes.map((l) => `<p>${echapper(l)}</p>`).join('\n');
  const body = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>${echapper(titrePage)} · ${echapper(OFFRES.marque.nom)}</title>
<style>
body{margin:0;background:#070707;color:#F2EDE8;font-family:Barlow,system-ui,sans-serif;font-size:18px;line-height:1.6;}
main{max-width:640px;margin:0 auto;padding:64px 16px;}
h1{font-family:Impact,'Arial Narrow',sans-serif;font-weight:400;font-size:40px;line-height:1;text-transform:uppercase;margin:0 0 24px;}
p{margin:0 0 16px;max-width:62ch;}
a{color:#F2EDE8;}
</style>
</head>
<body>
<main>
<h1>${echapper(titrePage)}</h1>
${corps}
<p><a href="${echapper(retour)}">Retour à la page</a></p>
</main>
</body>
</html>`;
  return { statusCode, headers: { ...CORS, 'Content-Type': 'text/html; charset=utf-8' }, body: typographier(body) };
}

function repondre(html, statusCode, payload, page) {
  if (!html) return json(statusCode, payload);
  return pageHtml(statusCode, page.titre, page.lignes, page.retour);
}

// ------------------------------------------------------------------ lecture du corps

function lireCorps(event) {
  let brut = typeof event.body === 'string' ? event.body : '';
  // Netlify peut transmettre le corps en base64 (selon le type de contenu) : on le décode d'abord.
  if (event.isBase64Encoded && brut) brut = Buffer.from(brut, 'base64').toString('utf8');
  const headers = event.headers || {};
  const ct = String(headers['content-type'] || headers['Content-Type'] || '').toLowerCase();
  if (ct.includes('application/x-www-form-urlencoded')) {
    const valeurs = {};
    for (const [k, val] of new URLSearchParams(brut)) {
      if (k === 'formats') (valeurs.formats = valeurs.formats || []).push(val);
      else valeurs[k] = val;
    }
    return { valeurs, html: true };
  }
  try {
    const valeurs = JSON.parse(brut);
    if (!valeurs || typeof valeurs !== 'object' || Array.isArray(valeurs)) return null;
    return { valeurs, html: false };
  } catch {
    return null;
  }
}

// ------------------------------------------------------------------ Brevo

function brevoHeaders(key) {
  return { accept: 'application/json', 'api-key': key, 'content-type': 'application/json' };
}

// L'attribut doit exister chez Brevo avant d'être posé sur un contact. 400 « already exist »
// est le cas nominal après la première demande. Non bloquant : au pire, le contact est créé sans.
async function assurerAttribut(key, nom) {
  try {
    const res = await fetch(`https://api.brevo.com/v3/contacts/attributes/normal/${nom}`, {
      method: 'POST',
      headers: brevoHeaders(key),
      body: JSON.stringify({ type: 'text' })
    });
    if (!res.ok) {
      const detail = await res.text();
      if (!(res.status === 400 && /exist/i.test(detail))) console.error('demande: attribut Brevo non créé:', nom, res.status, detail);
    }
  } catch (err) {
    console.error('demande: attribut Brevo non créé (non bloquant):', nom, err.message);
  }
}

// Enregistre le contact AVANT les envois, comme send-email.js. Sans liste dédiée dans
// BREVO_DEMANDE_LIST_ID, le contact existe quand même chez Brevo (avec son attribut),
// hors de la liste du tableur : ces demandes ne sont pas des prospects du guide.
async function enregistrerContact(key, email, attribut, source) {
  const listId = parseInt(process.env.BREVO_DEMANDE_LIST_ID || '', 10);
  const contact = {
    email,
    updateEnabled: true,
    attributes: { SOURCE: source, [attribut]: new Date().toISOString().slice(0, 10) }
  };
  if (Number.isInteger(listId) && listId > 0) contact.listIds = [listId];
  try {
    const res = await fetch('https://api.brevo.com/v3/contacts', {
      method: 'POST',
      headers: brevoHeaders(key),
      body: JSON.stringify(contact)
    });
    if (!res.ok) console.error('demande: contact Brevo non enregistré (non bloquant):', res.status, await res.text());
  } catch (err) {
    console.error('demande: contact Brevo non enregistré (non bloquant):', err.message);
  }
}

// Envoi transactionnel. Le détail Brevo reste dans les logs, jamais dans la réponse publique.
async function envoyer(key, payload) {
  try {
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: brevoHeaders(key),
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      console.error('demande: Brevo error:', res.status, await res.text());
      return false;
    }
    return true;
  } catch (err) {
    console.error('demande: fetch error:', err.message);
    return false;
  }
}

// ------------------------------------------------------------------ handler

// Chaque réponse porte l'en-tête CORS calculé pour cette requête (jamais « * »).
exports.handler = async function (event) {
  const reponse = await traiter(event);
  return { ...reponse, headers: { ...(reponse.headers || {}), ...entetesCors(event) } };
};

async function traiter(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: CORS, body: 'Method Not Allowed' };
  }

  const ip = ipClient(event);
  const lu = lireCorps(event);
  const html = !!(lu && lu.html);
  const retourDefaut = SITE_URL + OFFRES.routes.accueil;
  // Une marque est vouvoyée dès le premier message, même avant la validation du formulaire.
  const vous = !!(lu && lu.valeurs && lu.valeurs.type === 'marques');

  if (!checkRateLimit(ip)) {
    const plusTard = vous ? 'Réessayez dans une heure.' : 'Réessaie dans une heure.';
    return repondre(html, 429, { error: 'Trop de demandes. ' + plusTard },
      { titre: 'Trop de demandes', lignes: [plusTard], retour: retourDefaut });
  }
  if (!lu) {
    return json(400, { error: 'Invalid JSON' });
  }
  // Formulaire posté depuis une page d'un autre site : refusé, rien n'est envoyé.
  if (!origineAutorisee(event)) {
    return repondre(html, 403, { error: 'Origine refusée' },
      { titre: 'Demande refusée', lignes: [vous ? 'Cette demande ne vient pas du site. Réessayez depuis la page.' : 'Cette demande ne vient pas du site. Réessaie depuis la page.'], retour: retourDefaut });
  }

  const b = lu.valeurs;
  // Object.hasOwn : type='constructor' ne doit pas remonter la chaîne de prototypes.
  const typeKey = typeof b.type === 'string' ? b.type : '';
  if (!Object.hasOwn(TYPES, typeKey)) {
    return repondre(html, 400, { error: 'Type de demande inconnu' },
      { titre: 'Demande inconnue', lignes: ['Le formulaire n\'a pas été reconnu.'], retour: retourDefaut });
  }
  const type = TYPES[typeKey];
  const retour = SITE_URL + type.route;

  const { erreurs, v } = type.valider(b);
  if (Object.keys(erreurs).length) {
    return repondre(html, 400, { error: 'Formulaire incomplet', champs: erreurs },
      { titre: 'Il manque une information', lignes: Object.values(erreurs).map((m) => m + '.'), retour });
  }

  // Piège à robots rempli : on répond comme si tout allait bien, sans rien envoyer.
  if (v.piege) {
    console.log('demande: piège à robots rempli, demande ignorée.');
    const confirmation = type.confirmation(v);
    return repondre(html, 200, { success: true }, { titre: confirmation[0], lignes: confirmation.slice(1), retour });
  }

  // La clé API est stockée dans Netlify (jamais dans le code)
  const BREVO_KEY = process.env.BREVO_API_KEY;
  if (!BREVO_KEY) {
    return repondre(html, 500, { error: 'Service indisponible' },
      { titre: 'Service indisponible', lignes: [`${type.reessayer} ${DESTINATAIRE}.`], retour });
  }

  const attribut = type.attribut(v);
  await assurerAttribut(BREVO_KEY, attribut);
  await enregistrerContact(BREVO_KEY, v.email, attribut, type.source);

  // 1. La copie à Clément : bloquante, c'est elle qui fait exister la demande.
  const copie = copieClement(typeKey, v, attribut);
  const copieOk = await envoyer(BREVO_KEY, {
    sender: SENDER,
    to: [{ email: DESTINATAIRE, name: OFFRES.marque.auteur }],
    replyTo: { email: v.email },
    subject: copie.subject,
    htmlContent: copie.html,
    textContent: copie.text
  });
  if (!copieOk) {
    return repondre(html, 500, { error: 'Erreur d\'envoi' },
      { titre: 'L\'envoi n\'a pas marché', lignes: [`${type.renvoyer} ${DESTINATAIRE}.`], retour });
  }

  // 2. L'accusé de réception au demandeur : non bloquant (voir l'en-tête du fichier).
  const accuse = typeKey === 'journee' ? accuseJournee(v) : accuseMarques(v);
  const accuseOk = await envoyer(BREVO_KEY, {
    sender: SENDER,
    to: [{ email: v.email }],
    replyTo: { email: DESTINATAIRE, name: OFFRES.marque.auteur },
    subject: accuse.subject,
    htmlContent: accuse.html,
    textContent: accuse.text
  });
  if (!accuseOk) console.error('demande: accusé de réception non envoyé (non bloquant), la copie est chez Clément.');

  const confirmation = type.confirmation(v);
  return repondre(html, 200, { success: true }, { titre: confirmation[0], lignes: confirmation.slice(1), retour });
}

// Listes fermées lues par tests/run-demande.js (les valeurs des formulaires de /marques doivent
// toutes y figurer). Netlify n'appelle que handler.
exports._listes = { PROFILS, PARCOURS, FORMULES, BUDGETS };
