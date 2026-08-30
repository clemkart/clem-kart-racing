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
// =============================================

const crypto = require('crypto');

// URL du déploiement courant (Netlify la fournit) : sur un deploy preview, les pièces
// jointes pointent vers le preview et non vers la prod, où le fichier peut ne pas exister.
const SITE_URL = process.env.URL || 'https://comprendre-comment-rouler-plus-vite.netlify.app';

const SENDER = { name: 'Clem Kart Racing', email: 'clemkartracing@gmail.com' };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_EMAIL_LENGTH = 254;

// Palette (identique au site). En HTML email, pas de rgba() ni de variables CSS.
const C = {
  page: '#050505',
  card: '#0F0F0F',
  line: '#241f1f',
  text: '#f2ede8',
  muted: '#a49e97',
  faint: '#6f6a65',
  red: '#D9171D',
  gold: '#C9A84C'
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
function unsubscribeToken(email) {
  return crypto
    .createHmac('sha256', process.env.BREVO_API_KEY || '')
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
                          <td width="30" valign="top" style="font-family:Arial,Helvetica,sans-serif;font-size:18px;line-height:1.4;color:${C.gold};">${f.icone}</td>
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
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#141210;border:1px solid ${C.gold};">
                <tr>
                  <td style="padding:22px 24px 18px;">
                    <div style="font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;color:${C.gold};padding-bottom:16px;">
                      📎 ${fichiers.length} fichiers joints à cet email
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

function bouton(url, libelle) {
  return `
          <tr>
            <td style="padding:28px 36px 0;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="background:${C.red};">
                    <a href="${url}" style="display:inline-block;padding:15px 30px;font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;color:${C.text};text-decoration:none;">${libelle}</a>
                  </td>
                </tr>
              </table>
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
                    Bonnes sessions 🏁<br>
                    <strong style="color:${C.text};">Clément</strong><br>
                    <span style="font-size:12px;color:${C.faint};">Clem Kart Racing · Champion Régional 2023</span>
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
              Tu reçois cet email parce que tu l'as demandé sur clemkartracing.<br>
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

const TABLEUR_ATTACHMENT = {
  name: 'Tableur-Reglages-Kart-ClemKartRacing.xlsx',
  url: `${SITE_URL}/tableur-reglages-kart-v2.xlsx`
};

const EXTRAIT_ATTACHMENT = {
  name: 'Extrait-Comprendre-comment-rouler-plus-vite.pdf',
  url: `${SITE_URL}/extrait-comprendre-comment-rouler-plus-vite.pdf`
};

// ------------------------------------------------------------------------- magnets

const MAGNETS = {
  tableur: {
    source: 'tableur-reglages',
    deliveredAttribute: 'TABLEUR_ENVOYE',
    subject: '🏎️ Ton tableur de réglages est en pièce jointe',
    attachments: [TABLEUR_ATTACHMENT],
    html: (email) => enveloppe(
      header() +
      titre('Ton tableur est arrivé') +
      paragraphe(`C'est le tableur que je remplis après <strong style="color:${C.text};">chaque session</strong> : réglages châssis, conditions de piste, sensations. C'est lui qui me dit quoi changer la fois d'après, au lieu de repartir de zéro à chaque roulage.`) +
      blocPiecesJointes([
        { icone: '📊', nom: 'Tableur de réglages kart (Excel)', desc: 'Réglages, conditions de piste et notes pilote, session après session.' }
      ]) +
      paragraphe('Comment je m\'en sers, concrètement :', 0) +
      listePuces([
        'Une ligne par session, remplie <strong style="color:' + C.text + ';">avant</strong> de quitter le circuit, tant que les sensations sont fraîches.',
        'Avant chaque roulage, je relis ce que j\'avais réglé la dernière fois sur ce circuit.',
        'Au bout de trois ou quatre sessions, les schémas sautent aux yeux tout seuls.'
      ]) +
      signature() +
      pied(email),
      'Le tableur est en pièce jointe de cet email.'
    )
  },
  extrait: {
    source: 'extrait-guide',
    deliveredAttribute: 'EXTRAIT_ENVOYE',
    subject: '📖 Ton extrait est en pièce jointe (+ le tableur en cadeau)',
    attachments: [EXTRAIT_ATTACHMENT, TABLEUR_ATTACHMENT],
    html: (email) => enveloppe(
      header() +
      titre('Ton extrait est arrivé') +
      paragraphe('Comme promis, voilà l\'extrait de mon guide. Et comme tu as pris le temps de le demander, je t\'ai glissé mon tableur de réglages avec.') +
      blocPiecesJointes([
        { icone: '📖', nom: 'Extrait du guide (PDF)', desc: 'L\'introduction complète et le chapitre sur le freinage dégressif, schémas compris.' },
        { icone: '📊', nom: 'Tableur de réglages kart (Excel)', desc: 'Le cadeau : celui que je remplis après chaque session pour savoir quoi changer.' }
      ]) +
      paragraphe('Dans l\'extrait, tu vas comprendre :', 0) +
      listePuces([
        'Pourquoi ton kart refuse de tourner quand tu gardes trop de frein.',
        'Pourquoi la façon dont tu <strong style="color:' + C.text + ';">relâches</strong> le frein compte plus que la façon dont tu appuies dessus.',
        'Comment cette seule idée change ton entrée de virage dès la prochaine session.'
      ]) +
      paragraphe('Prends dix minutes au calme pour le lire, ça se lit vite. Et la prochaine fois que tu roules, teste juste ça : rien d\'autre, une seule chose à la fois.', 0) +
      signature() +
      pied(email),
      'L\'extrait et le tableur sont en pièce jointe de cet email.'
    )
  }
};

// --------------------------------------------------------------------------- handler

const CORS = { 'Access-Control-Allow-Origin': '*' };

function json(statusCode, payload) {
  return { statusCode, headers: CORS, body: JSON.stringify(payload) };
}

function brevoHeaders(key) {
  return {
    accept: 'application/json',
    'api-key': key,
    'content-type': 'application/json'
  };
}

exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: CORS, body: 'Method Not Allowed' };
  }

  const ip = event.headers['x-forwarded-for']?.split(',')[0]?.trim() || 'unknown';
  if (!checkRateLimit(ip)) {
    return json(429, { error: 'Trop de demandes. Réessaie dans une heure.' });
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return json(400, { error: 'Invalid JSON' });
  }

  // Validation stricte : sans le contrôle de type, un tableau passerait includes('@').
  const email = typeof body.email === 'string' ? body.email.trim() : '';
  if (!email || email.length > MAX_EMAIL_LENGTH || !EMAIL_RE.test(email)) {
    return json(400, { error: 'Email invalide' });
  }

  // 'tableur' par défaut : les anciens formulaires n'envoient pas de champ magnet.
  // Object.hasOwn, sinon magnet='constructor' remonterait la chaîne de prototypes
  // et passerait la garde avec un objet inutilisable.
  const magnetKey = typeof body.magnet === 'string' ? body.magnet : 'tableur';
  if (!Object.hasOwn(MAGNETS, magnetKey)) {
    return json(400, { error: 'Magnet inconnu' });
  }
  const magnet = MAGNETS[magnetKey];

  // La clé API est stockée dans Netlify (jamais dans le code)
  const BREVO_KEY = process.env.BREVO_API_KEY;
  if (!BREVO_KEY) {
    return json(500, { error: 'Service indisponible' });
  }

  const unsubUrl = unsubscribeUrl(email);
  const payload = {
    sender: SENDER,
    to: [{ email }],
    subject: magnet.subject,
    htmlContent: magnet.html(email),
    attachment: magnet.attachments,
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
      return json(500, { error: "Erreur d'envoi" });
    }
  } catch (err) {
    console.error('Fetch error:', err.message);
    return json(500, { error: 'Erreur réseau' });
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

  return json(200, { success: true });
};
