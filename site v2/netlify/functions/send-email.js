// =============================================
// Clem Kart Racing — Envoi des lead magnets par email (Brevo)
// POST { email, magnet? } -> contact ajouté à la liste Brevo + email transactionnel.
// magnet = 'tableur' (défaut, page tableur-reglages.html)
//        | 'extrait' (page extrait-guide.html : extrait v2 du guide + tableur en cadeau)
//
// L'attribut de livraison (EXTRAIT_ENVOYE / TABLEUR_ENVOYE) n'est posé qu'APRES un envoi
// réussi. C'est lui, et pas la date de création du contact, qui rend un contact éligible
// à la relance J+7 (relance-guide.js) : une adresse ajoutée à la liste sans avoir reçu
// son magnet ne recevra donc jamais de relance.
// =============================================

const crypto = require('crypto');

// URL du déploiement courant (Netlify la fournit) : sur un deploy preview, les pièces
// jointes pointent vers le preview et non vers la prod, où le fichier peut ne pas exister.
const SITE_URL = process.env.URL || 'https://comprendre-comment-rouler-plus-vite.netlify.app';
const GUIDE_URL = 'https://clemkartracing.gumroad.com/l/umjfwx';

const SENDER = { name: 'Clem Kart Racing', email: 'clemkartracing@gmail.com' };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_EMAIL_LENGTH = 254;

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

function footerHtml(email) {
  return `
      <p style="color:rgba(242,237,232,0.4);font-size:12px;margin-top:32px;line-height:1.6;">
        Clem Kart Racing · <a href="${unsubscribeUrl(email)}" style="color:rgba(242,237,232,0.55);">Me désinscrire en un clic</a>.<br>📬 Si tu ne vois pas cet email, vérifie ton dossier spam ou courrier indésirable.
      </p>`;
}

const GUIDE_CTA_HTML = `
        <a href="${GUIDE_URL}"
           style="display:inline-block;background:#D9171D;color:#f2ede8;font-family:Arial,sans-serif;font-size:14px;font-weight:700;letter-spacing:2px;text-transform:uppercase;text-decoration:none;padding:14px 28px;">
          Découvrir le guide complet · 14,99€ →
        </a>`;

const TABLEUR_ATTACHMENT = {
  name: 'Tableur-Reglages-Kart-ClemKartRacing.xlsx',
  url: `${SITE_URL}/tableur-reglages-kart-v2.xlsx`
};

const EXTRAIT_ATTACHMENT = {
  name: 'Extrait-Comprendre-comment-rouler-plus-vite.pdf',
  url: `${SITE_URL}/extrait-comprendre-comment-rouler-plus-vite.pdf`
};

// Chaque lead magnet définit son email de livraison, sa source et son attribut de livraison.
const MAGNETS = {
  tableur: {
    source: 'tableur-reglages',
    deliveredAttribute: 'TABLEUR_ENVOYE',
    subject: '🏎️ Ton tableur de réglages kart est là',
    attachments: [TABLEUR_ATTACHMENT],
    html: (email) => `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;background:#070707;color:#f2ede8;padding:40px 32px;">
        <h1 style="font-family:Arial,sans-serif;font-size:28px;margin-bottom:8px;color:#f2ede8;">Ton tableur de réglages 🏁</h1>
        <p style="color:rgba(242,237,232,0.7);line-height:1.7;margin-bottom:24px;">
          C'est le tableur que j'utilise après chaque session pour noter et comparer mes réglages.
          Tu le trouveras en pièce jointe de cet email.
        </p>
        <p style="color:rgba(242,237,232,0.7);line-height:1.7;margin-bottom:32px;">
          Si tu veux aller plus loin et comprendre <strong style="color:#f2ede8;">pourquoi un tour est rapide pour pouvoir le répéter</strong>,
          c'est exactement ce que le guide t'apporte.
        </p>
        ${GUIDE_CTA_HTML}
        ${footerHtml(email)}
      </div>
    `
  },
  extrait: {
    source: 'extrait-guide',
    deliveredAttribute: 'EXTRAIT_ENVOYE',
    subject: '📖 Ton extrait du guide est là (+ le tableur en cadeau)',
    attachments: [EXTRAIT_ATTACHMENT, TABLEUR_ATTACHMENT],
    html: (email) => `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;background:#070707;color:#f2ede8;padding:40px 32px;">
        <h1 style="font-family:Arial,sans-serif;font-size:28px;margin-bottom:8px;color:#f2ede8;">Ton extrait du guide 🏁</h1>
        <p style="color:rgba(242,237,232,0.7);line-height:1.7;margin-bottom:24px;">
          Tu trouveras en pièce jointe l'extrait de <strong style="color:#f2ede8;">« Comprendre comment rouler plus vite »</strong> :
          l'introduction complète du guide et le chapitre sur le freinage dégressif,
          celui qui change ta façon d'aborder chaque virage.
        </p>
        <p style="color:rgba(242,237,232,0.7);line-height:1.7;margin-bottom:24px;">
          Petit cadeau en plus : je t'ai aussi joint <strong style="color:#f2ede8;">mon tableur de réglages</strong>,
          celui que j'utilise après chaque session pour noter mes réglages châssis et progresser de façon structurée.
        </p>
        <p style="color:rgba(242,237,232,0.7);line-height:1.7;margin-bottom:32px;">
          Si ce que tu lis dans l'extrait te parle, la suite est dans le guide complet :
          13 chapitres pour comprendre <strong style="color:#f2ede8;">pourquoi un tour est rapide, et enfin le répéter</strong>.
          Garantie satisfait ou remboursé 7 jours.
        </p>
        ${GUIDE_CTA_HTML}
        ${footerHtml(email)}
      </div>
    `
  }
};

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
