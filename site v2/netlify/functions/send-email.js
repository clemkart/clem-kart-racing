// =============================================
// Clem Kart Racing : Envoi des lead magnets par email (Brevo)
// POST { email, magnet? } -> contact ajouté à la liste Brevo + email transactionnel.
// magnet = 'tableur' (défaut, page tableur-reglages.html)
//        | 'extrait' (page extrait-guide.html : extrait v2 du guide + tableur en cadeau)
//
// L'attribut de livraison (EXTRAIT_ENVOYE / TABLEUR_ENVOYE) n'est posé qu'APRES un envoi
// réussi. C'est lui, et pas la date de création du contact, qui rend un contact éligible
// à la relance J+7 (relance-guide.js) : une adresse ajoutée à la liste sans avoir reçu
// son magnet ne recevra donc jamais de relance.
//
// Les emails sont écrits en tableaux HTML avec styles inline : Gmail, Outlook et Apple
// Mail ignorent les feuilles de style externes, flexbox et grid.
//
// V4 : l'expéditeur, l'email de contact, la marque, l'adresse de la page /guide, le prix
// affiché et la garantie viennent de config/offres.json (seul point de vérité), jamais
// d'une valeur écrite ici. L'email de livraison livre d'abord ; il ne parle du guide
// qu'en P.S., par un lien vers la page /guide du site (jamais Stripe en direct, jamais
// Gumroad). La vraie relance reste celle de J+7 (relance-guide.js).
// netlify.toml embarque config/offres.json avec chaque fonction (included_files).
// =============================================

const crypto = require('crypto');
const OFFRES = require('../../../config/offres.json');
// Typographie française (espaces insécables avant : ; ? ! », entre un nombre et €, h, %) :
// le même module que les pages du site, appliqué au corps HTML seulement (l'objet et la
// version texte restent tels quels). esbuild l'empaquette avec la fonction.
const { typographier } = require('../../../scripts/typographie.js');
// IP du visiteur (x-nf-client-connection-ip, posé par Netlify, en priorité) et lecture des
// en-têtes sans tenir compte de la casse. Le dossier lib est à côté de functions, jamais dedans.
const { ipClient, entete } = require('../lib/http.js');

// Adresse publique du site (celle des liens dans les emails) : sites.actif dans la config.
const SITE_PUBLIC_URL = OFFRES.sites[OFFRES.sites.actif];

// URL du déploiement courant (Netlify la fournit) : sur un deploy preview, le lien de
// désinscription pointe vers le preview, comme avant.
const SITE_URL = process.env.URL || SITE_PUBLIC_URL;

// Adresse des pièces jointes : SITE_ASSETS_URL en priorité (pour choisir le moment de la
// bascule vers le domaine sans toucher au code), sinon le déploiement courant.
// Lue à chaque appel, pas au chargement : la variable peut changer entre deux déploiements
// et les tests la font varier.
function assetsUrl() {
  return process.env.SITE_ASSETS_URL || process.env.URL || SITE_PUBLIC_URL;
}

const SENDER = { name: OFFRES.marque.nom, email: OFFRES.contact.email };
// Les réponses arrivent toujours sur l'email de contact de la config, même le jour où
// l'expéditeur change (domaine authentifié dans Brevo au lot 2).
const REPLY_TO = { name: OFFRES.marque.signature, email: OFFRES.contact.email };

// Page de vente du guide sur le site public, avec un UTM par email : le dashboard lit
// « email / j0-extrait » ou « email / j0-tableur » sur les visites de /guide.
function guideUrl(campagne) {
  return `${SITE_PUBLIC_URL}${OFFRES.routes.guide}?utm_source=email&utm_medium=livraison&utm_campaign=${campagne}`;
}
// Prix tel que la config l'écrit ; l'espace avant le symbole devient &nbsp; pour que la
// boîte mail ne coupe jamais la ligne entre le nombre et l'euro.
const PRIX_GUIDE = OFFRES.guide.prix_affiche.replace(/\s/g, '&nbsp;');

// Le titre vient de la config (faits.titre_court) et suit l'interrupteur faits.afficher_titre.
const SIGNATURE_LIGNE = OFFRES.faits.afficher_titre && OFFRES.faits.titre_court
  ? `${OFFRES.marque.nom} · ${OFFRES.faits.titre_court}`
  : OFFRES.marque.nom;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_EMAIL_LENGTH = 254;

// Palette (identique au site : noir, blanc cassé, rouge). En HTML email, pas de rgba()
// ni de variables CSS. Pas d'or, pas de vert, pas de violet.
const C = {
  page: '#050505',
  card: '#0F0F0F',
  line: '#241f1f',
  text: '#f2ede8',
  muted: '#a49e97',
  faint: '#6f6a65',
  red: '#D9171D'
};

// Rate limit léger en mémoire (par instance chaude), même principe que track-site.js.
// Sans ça, l'endpoint public permet d'envoyer des emails à des adresses arbitraires
// en boucle : quota Brevo épuisé, adresses pièges à spam, réputation d'expéditeur.
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

// Jeton de désinscription. Volontairement dupliqué dans relance-guide.js et
// desinscription.js : chaque fonction Netlify est bundlée isolément, un module partagé
// dans le dossier des fonctions risquerait d'être pris pour une fonction sans handler.
// Signe avec UNSUB_SECRET (plan V4, section 10) ; repli sur la cle Brevo tant que la variable
// n'existe pas. desinscription.js accepte les deux signatures : la cle Brevo peut tourner
// sans casser les liens deja envoyes.
function unsubscribeToken(email) {
  return crypto
    .createHmac('sha256', process.env.UNSUB_SECRET || process.env.BREVO_API_KEY || '')
    .update(email.toLowerCase())
    .digest('hex')
    .slice(0, 32);
}

function unsubscribeUrl(email) {
  return `${SITE_URL}/.netlify/functions/desinscription?e=${encodeURIComponent(email)}&t=${unsubscribeToken(email)}`;
}

// ---------------------------------------------------------------- briques du template

// Texte d'aperçu affiché par la boîte mail à côté de l'objet, jamais visible dans le corps.
function preheader(texte) {
  return `<div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;">${texte}</div>`;
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

function titre(texte) {
  return `
          <tr>
            <td style="padding:26px 36px 0;">
              <h1 style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:28px;line-height:1.2;color:${C.text};font-weight:bold;">${texte}</h1>
            </td>
          </tr>`;
}

function paragraphe(html, paddingBottom) {
  return `
          <tr>
            <td style="padding:18px 36px ${paddingBottom || 0}px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.7;color:${C.muted};">
              ${html}
            </td>
          </tr>`;
}

// Le bloc central : dit noir sur blanc que les fichiers sont EN PIECE JOINTE et
// qu'il faut les télécharger. C'est l'action que le lecteur doit faire.
function blocPiecesJointes(fichiers) {
  const lignes = fichiers.map((f, i) => `
                  <tr>
                    <td style="padding:${i === 0 ? '0' : '14px'} 0 0;">
                      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                        <tr>
                          <td width="52" valign="top" style="font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:bold;letter-spacing:1px;line-height:1.4;color:${C.red};padding-top:3px;">${f.format}</td>
                          <td valign="top" style="font-family:Arial,Helvetica,sans-serif;">
                            <div style="font-size:15px;font-weight:bold;color:${C.text};line-height:1.4;">${f.nom}</div>
                            <div style="font-size:13px;color:${C.muted};line-height:1.6;padding-top:3px;">${f.desc}</div>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>`).join('');

  return `
          <tr>
            <td style="padding:26px 36px 0;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#141210;border:1px solid ${C.line};border-left:3px solid ${C.red};">
                <tr>
                  <td style="padding:22px 24px 18px;">
                    <div style="font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;color:${C.red};padding-bottom:16px;">
                      ${fichiers.length} fichiers joints à cet email
                    </div>
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                      ${lignes}
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:0 24px 20px;">
                    <div style="border-top:1px solid ${C.line};padding-top:14px;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.65;color:${C.muted};">
                      <strong style="color:${C.text};">Pense à les télécharger</strong> : ils sont attachés à cet email, pas derrière un lien.
                      Sur téléphone, les pièces jointes sont tout en bas du message : appuie dessus, puis enregistre-les.
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>`;
}

function listePuces(items) {
  const lignes = items.map((item) => `
                  <tr>
                    <td width="18" valign="top" style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.7;color:${C.red};">▸</td>
                    <td style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.7;color:${C.muted};padding-bottom:6px;">${item}</td>
                  </tr>`).join('');
  return `
          <tr>
            <td style="padding:18px 36px 0;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">${lignes}</table>
            </td>
          </tr>`;
}

// Une question ? L'adresse vient de contact.email dans la config.
function ligneContact() {
  return paragraphe(`Une question sur ta lecture ? Réponds simplement à cet email, ou écris-moi à
              <a href="mailto:${OFFRES.contact.email}" style="color:${C.text};text-decoration:underline;">${OFFRES.contact.email}</a>.`, 0);
}

// Le guide n'arrive qu'en P.S., après la livraison : un seul lien, vers la page /guide
// du site. Prix, chapitres et garantie lus dans la config.
function postScriptumGuide(accroche, campagne) {
  return `
          <tr>
            <td style="padding:22px 36px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.7;color:${C.muted};">
              <strong style="color:${C.text};">P.S.</strong> ${accroche}
              ${OFFRES.guide.chapitres} chapitres, ${PRIX_GUIDE}, garantie ${OFFRES.garantie_jours} jours en plus de tes droits légaux.
              <a href="${guideUrl(campagne)}" style="color:${C.text};text-decoration:underline;">Voir le guide</a>
            </td>
          </tr>`;
}

function signature() {
  return `
          <tr>
            <td style="padding:30px 36px 0;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td style="border-top:1px solid ${C.line};padding-top:22px;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.7;color:${C.muted};">
                    Bonnes sessions,<br>
                    <strong style="color:${C.text};">${OFFRES.marque.signature}</strong><br>
                    <span style="font-size:12px;color:${C.faint};">${SIGNATURE_LIGNE}</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>`;
}

function pied(email) {
  return `
          <tr>
            <td style="padding:26px 36px 34px;font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:1.7;color:${C.faint};">
              Tu reçois cet email parce que tu l'as demandé sur ${OFFRES.marque.nom}.<br>
              <a href="${unsubscribeUrl(email)}" style="color:${C.faint};text-decoration:underline;">Me désinscrire en un clic</a>
            </td>
          </tr>`;
}

// Enveloppe commune : fond de page, carte centrée 600 px, compatible Outlook.
function enveloppe(contenu, apercu) {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
</head>
<body style="margin:0;padding:0;background:${C.page};">
${preheader(apercu)}
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

// ------------------------------------------------------------------- pièces jointes

// Les fichiers gardent exactement leur nom sur le site (le PDF et le tableur déjà envoyés
// ne se mettent jamais à jour, ils ne portent donc ni prix ni lien de paiement).
const FICHIERS = {
  tableur: { name: 'Tableur-Reglages-Kart-ClemKartRacing.xlsx', chemin: '/tableur-reglages-kart-v2.xlsx' },
  extrait: { name: 'Extrait-Comprendre-comment-rouler-plus-vite.pdf', chemin: '/extrait-comprendre-comment-rouler-plus-vite.pdf' }
};

function pieceJointe(cle) {
  return { name: FICHIERS[cle].name, url: `${assetsUrl()}${FICHIERS[cle].chemin}` };
}

// ------------------------------------------------------------------------- magnets

const MAGNETS = {
  tableur: {
    source: 'tableur-reglages',
    deliveredAttribute: 'TABLEUR_ENVOYE',
    subject: 'Ton tableur de réglages est en pièce jointe',
    attachments: () => [pieceJointe('tableur')],
    html: (email) => enveloppe(
      header() +
      titre('Ton tableur est arrivé') +
      paragraphe(`C'est le tableur que je remplis après <strong style="color:${C.text};">chaque session</strong> : réglages châssis, conditions de piste, sensations. C'est lui qui me dit quoi changer la fois d'après, au lieu de repartir de zéro à chaque roulage.`) +
      blocPiecesJointes([
        { format: 'XLSX', nom: 'Tableur de réglages kart (Excel)', desc: 'Réglages, conditions de piste et notes pilote, session après session.' }
      ]) +
      paragraphe('Comment je m\'en sers, concrètement :', 0) +
      listePuces([
        'Une ligne par session, remplie <strong style="color:' + C.text + ';">avant</strong> de quitter le circuit, tant que les sensations sont fraîches.',
        'Avant chaque roulage, je relis ce que j\'avais réglé la dernière fois sur ce circuit.',
        'Au bout de trois ou quatre sessions, les schémas sautent aux yeux tout seuls.'
      ]) +
      ligneContact() +
      signature() +
      postScriptumGuide('Ce tableur note ce que tu changes. Le guide explique pourquoi ça marche :', 'j0-tableur') +
      pied(email),
      'Le tableur est en pièce jointe de cet email.'
    )
  },
  extrait: {
    source: 'extrait-guide',
    deliveredAttribute: 'EXTRAIT_ENVOYE',
    subject: 'Ton extrait est en pièce jointe (et le tableur avec)',
    attachments: () => [pieceJointe('extrait'), pieceJointe('tableur')],
    html: (email) => enveloppe(
      header() +
      titre('Ton extrait est arrivé') +
      paragraphe('Comme promis, voilà l\'extrait de mon guide. Et comme tu as pris le temps de le demander, je t\'ai glissé mon tableur de réglages avec.') +
      blocPiecesJointes([
        { format: 'PDF', nom: 'Extrait du guide (PDF)', desc: 'L\'introduction complète et le chapitre sur le freinage dégressif, schémas compris.' },
        { format: 'XLSX', nom: 'Tableur de réglages kart (Excel)', desc: 'Le cadeau : celui que je remplis après chaque session pour savoir quoi changer.' }
      ]) +
      paragraphe('Dans l\'extrait, tu vas comprendre :', 0) +
      listePuces([
        'Pourquoi ton kart refuse de tourner quand tu gardes trop de frein.',
        'Pourquoi la façon dont tu <strong style="color:' + C.text + ';">relâches</strong> le frein compte plus que la façon dont tu appuies dessus.',
        'Quoi tester à ta prochaine session pour que ton kart accepte de tourner.'
      ]) +
      paragraphe('Prends dix minutes au calme pour le lire, ça se lit vite. Et la prochaine fois que tu roules, teste juste ça : rien d\'autre, une seule chose à la fois.', 0) +
      ligneContact() +
      signature() +
      postScriptumGuide('Si l\'extrait t\'a parlé, la suite est dans le guide :', 'j0-extrait') +
      pied(email),
      'L\'extrait et le tableur sont en pièce jointe de cet email.'
    )
  }
};

// --------------------------------------------------------------------------- handler

// Pas de CORS ouvert à tous : l'en-tête Access-Control-Allow-Origin est posé par le handler,
// avec l'origine de la requête seulement si c'est un des sites (voir origineAutorisee).
const CORS = { Vary: 'Origin' };

// Origines autorisées : les deux sites, le domaine, le déploiement courant et ses brouillons
// Netlify (« xxx--nom-du-site.netlify.app »), et le poste local de développement. Une page
// d'un autre site ne peut donc plus inscrire des adresses au hasard dans Brevo.
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

// Origin, sinon Referer. Sans aucun des deux (appel direct, hors navigateur) : accepté, le pot
// de miel et la limite par IP s'en chargent. « Origin: null » (iframe isolée, fichier local) : refusé.
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
  return { 'Access-Control-Allow-Origin': autorise ? origin : SITE_PUBLIC_URL, Vary: 'Origin' };
}

function json(statusCode, payload) {
  return { statusCode, headers: CORS, body: JSON.stringify(payload) };
}

// Repli sans JavaScript : le formulaire de /extrait poste en application/x-www-form-urlencoded.
// Succès : 303 vers la page, ancre #envoye. Erreur : une page courte qui explique, avec un lien de retour.
const PAGES_RETOUR = { extrait: '/extrait-guide.html', tableur: '/tableur-reglages.html' };

function echapper(t) {
  return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function pageErreur(statusCode, message, retour) {
  const body = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>Envoi impossible · ${echapper(OFFRES.marque.nom)}</title>
<style>
body{margin:0;background:#070707;color:#F2EDE8;font-family:Barlow,system-ui,sans-serif;font-size:18px;line-height:1.6;}
main{max-width:640px;margin:0 auto;padding:64px 16px;}
h1{font-family:Impact,'Arial Narrow',sans-serif;font-weight:400;font-size:40px;line-height:1;text-transform:uppercase;margin:0 0 24px;}
a{color:#F2EDE8;}
</style>
</head>
<body>
<main>
<h1>Envoi impossible</h1>
<p>${echapper(message)}</p>
<p><a href="${echapper(retour)}">Retour à la page</a></p>
</main>
</body>
</html>`;
  return { statusCode, headers: { ...CORS, 'Content-Type': 'text/html; charset=utf-8' }, body: typographier(body) };
}

// Lit le corps : JSON (le script de la page) ou formulaire classique (sans JavaScript).
function lireCorps(event) {
  let brut = typeof event.body === 'string' ? event.body : '';
  if (event.isBase64Encoded && brut) brut = Buffer.from(brut, 'base64').toString('utf8');
  const headers = event.headers || {};
  const ct = String(headers['content-type'] || headers['Content-Type'] || '').toLowerCase();
  if (ct.includes('application/x-www-form-urlencoded')) {
    return { body: Object.fromEntries(new URLSearchParams(brut)), formulaire: true };
  }
  try {
    const body = JSON.parse(brut);
    if (!body || typeof body !== 'object' || Array.isArray(body)) return null;
    return { body, formulaire: false };
  } catch {
    return null;
  }
}

function brevoHeaders(key) {
  return {
    accept: 'application/json',
    'api-key': key,
    'content-type': 'application/json'
  };
}

// Chaque réponse porte l'en-tête CORS calculé pour cette requête (jamais « * »).
exports.handler = async function(event) {
  const reponse = await traiter(event);
  return { ...reponse, headers: { ...(reponse.headers || {}), ...entetesCors(event) } };
};

async function traiter(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: CORS, body: 'Method Not Allowed' };
  }

  const ip = ipClient(event);
  if (!checkRateLimit(ip)) {
    return json(429, { error: 'Trop de demandes. Réessaie dans une heure.' });
  }

  const lu = lireCorps(event);
  if (!lu) return json(400, { error: 'Invalid JSON' });
  const { body, formulaire } = lu;

  // 'tableur' par défaut : les anciens formulaires n'envoient pas de champ magnet.
  // Object.hasOwn, sinon magnet='constructor' remonterait la chaîne de prototypes
  // et passerait la garde avec un objet inutilisable.
  const magnetKey = typeof body.magnet === 'string' ? body.magnet : 'tableur';
  const retour = Object.hasOwn(PAGES_RETOUR, magnetKey) ? PAGES_RETOUR[magnetKey] : '/';
  // Même logique de réponse pour le script (JSON) et le formulaire sans JavaScript (page)
  const erreur = (statusCode, message, messagePage) => (formulaire ? pageErreur(statusCode, messagePage, retour) : json(statusCode, { error: message }));

  // Formulaire posté depuis une page d'un autre site : refusé, rien n'est envoyé.
  if (!origineAutorisee(event)) {
    return erreur(403, 'Origine refusée', 'Cette demande ne vient pas du site. Réessaie depuis la page.');
  }

  // Pot de miel (champ site_web caché aux humains) rempli : même réponse qu'un succès, sans Brevo.
  if (typeof body.site_web === 'string' && body.site_web.trim() !== '') {
    console.log('send-email: pot de miel rempli, demande ignorée.');
    return formulaire ? { statusCode: 303, headers: { ...CORS, Location: `${retour}#envoye` }, body: '' } : json(200, { success: true });
  }

  // Validation stricte : sans le contrôle de type, un tableau passerait includes('@').
  const email = typeof body.email === 'string' ? body.email.trim() : '';
  if (!email || email.length > MAX_EMAIL_LENGTH || !EMAIL_RE.test(email)) {
    return erreur(400, 'Email invalide', 'Cette adresse email ne semble pas valide. Vérifie-la et réessaie.');
  }

  if (!Object.hasOwn(MAGNETS, magnetKey)) {
    return erreur(400, 'Magnet inconnu', 'Cette demande n’est pas reconnue. Réessaie depuis la page.');
  }
  const magnet = MAGNETS[magnetKey];

  // La clé API est stockée dans Netlify (jamais dans le code)
  const BREVO_KEY = process.env.BREVO_API_KEY;
  if (!BREVO_KEY) {
    return erreur(500, 'Service indisponible', `L’envoi ne marche pas pour le moment. Écris-moi à ${OFFRES.contact.email}.`);
  }

  const unsubUrl = unsubscribeUrl(email);
  const payload = {
    sender: SENDER,
    replyTo: REPLY_TO,
    to: [{ email }],
    subject: magnet.subject,
    htmlContent: typographier(magnet.html(email)),
    attachment: magnet.attachments(),
    headers: {
      'List-Unsubscribe': `<${unsubUrl}>`,
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click'
    }
  };

  // Enregistre le contact dans la liste "tableur-reglages" (#6) AVANT l'envoi.
  // Sans ça, l'adresse est utilisée pour l'envoi puis perdue (aucun lead capturé).
  // Non bloquant : si ça échoue, on envoie quand même le lead magnet.
  const TABLEUR_LIST_ID = parseInt(process.env.BREVO_TABLEUR_LIST_ID || '6', 10);
  try {
    await fetch('https://api.brevo.com/v3/contacts', {
      method: 'POST',
      headers: brevoHeaders(BREVO_KEY),
      body: JSON.stringify({
        email,
        listIds: [TABLEUR_LIST_ID],
        updateEnabled: true, // si le contact existe déjà, on l'ajoute à la liste sans erreur
        attributes: { SOURCE: magnet.source }
      })
    });
  } catch (err) {
    console.error('Brevo contact create failed (non bloquant):', err.message);
  }

  try {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: brevoHeaders(BREVO_KEY),
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      // Détail gardé côté logs uniquement : la réponse publique reste générique.
      console.error('Brevo error:', response.status, await response.text());
      return erreur(500, "Erreur d'envoi", `L’envoi n’a pas marché. Réessaie, ou écris-moi à ${OFFRES.contact.email}.`);
    }
  } catch (err) {
    console.error('Fetch error:', err.message);
    return erreur(500, 'Erreur réseau', `L’envoi n’a pas marché. Réessaie, ou écris-moi à ${OFFRES.contact.email}.`);
  }

  // Envoi réussi -> on marque la livraison. C'est cet attribut (et lui seul) qui rend
  // le contact éligible à la relance J+7. Non bloquant : au pire, pas de relance.
  try {
    const res = await fetch(`https://api.brevo.com/v3/contacts/${encodeURIComponent(email)}`, {
      method: 'PUT',
      headers: brevoHeaders(BREVO_KEY),
      body: JSON.stringify({
        attributes: { [magnet.deliveredAttribute]: new Date().toISOString().slice(0, 10) }
      })
    });
    if (!res.ok) {
      console.error('Brevo delivered-attribute failed:', res.status, await res.text());
    }
  } catch (err) {
    console.error('Brevo delivered-attribute failed:', err.message);
  }

  if (formulaire) {
    return { statusCode: 303, headers: { ...CORS, Location: `${retour}#envoye` }, body: '' };
  }
  return json(200, { success: true });
}
