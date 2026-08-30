// =============================================
// Clem Kart Racing : Désinscription en un clic
// GET  ?e=<email>&t=<jeton> -> page de confirmation (un bouton).
// POST (mêmes paramètres)   -> blacklist l'adresse chez Brevo, plus aucun email.
//
// Pourquoi deux méthodes : les antivirus et proxys de messagerie préchargent les liens
// des emails. Une désinscription sur simple GET désabonnerait des gens qui n'ont rien
// demandé. Le POST sert aussi au "one-click" RFC 8058 annoncé par l'en-tête
// List-Unsubscribe-Post des emails envoyés.
//
// Le jeton est un HMAC de l'adresse : sans lui, n'importe qui pourrait désinscrire
// n'importe quelle adresse connue.
// =============================================

const crypto = require('crypto');

// Dupliqué depuis send-email.js : chaque fonction Netlify est bundlée isolément.
function unsubscribeToken(email) {
  return crypto
    .createHmac('sha256', process.env.BREVO_API_KEY || '')
    .update(email.toLowerCase())
    .digest('hex')
    .slice(0, 32);
}

// Comparaison à temps constant (les deux chaînes font 32 caractères hexadécimaux).
function tokenMatches(expected, received) {
  if (typeof received !== 'string' || received.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(received));
}

function page(title, message, formHtml) {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="robots" content="noindex">
<title>${title} | Clem Kart Racing</title>
<style>
  body{background:#070707;color:rgb(242,237,232);font-family:Arial,Helvetica,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;padding:24px;}
  .card{background:#0F0F0F;border:1px solid rgba(242,237,232,0.08);border-top:2px solid #D9171D;padding:40px 36px;max-width:460px;text-align:center;}
  h1{font-size:24px;margin:0 0 16px;letter-spacing:.02em;}
  p{color:rgba(242,237,232,0.7);line-height:1.7;font-size:15px;margin:0 0 24px;}
  button{background:#D9171D;color:rgb(242,237,232);border:none;font-size:14px;font-weight:700;letter-spacing:2px;text-transform:uppercase;padding:14px 28px;cursor:pointer;}
  a{color:rgba(242,237,232,0.55);font-size:13px;}
</style>
</head>
<body>
  <div class="card">
    <h1>${title}</h1>
    <p>${message}</p>
    ${formHtml}
    <a href="https://comprendre-comment-rouler-plus-vite.netlify.app/">Retour au site Clem Kart Racing</a>
  </div>
</body>
</html>`;
}

function html(statusCode, body) {
  return {
    statusCode,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
    body
  };
}

exports.handler = async function(event) {
  if (event.httpMethod !== 'GET' && event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const params = event.queryStringParameters || {};
  const email = typeof params.e === 'string' ? params.e.trim() : '';
  const token = params.t;

  const BREVO_KEY = process.env.BREVO_API_KEY;
  if (!BREVO_KEY) {
    console.error('desinscription: BREVO_API_KEY manquante');
    return html(500, page('Service indisponible', 'Réessaie dans quelques minutes, ou réponds simplement à un de mes emails et je te retire de la liste à la main.', ''));
  }

  if (!email || !tokenMatches(unsubscribeToken(email), token)) {
    return html(400, page(
      'Lien invalide',
      "Ce lien de désinscription n'est pas valide ou a été tronqué par ta messagerie. Réponds à un de mes emails et je te retire de la liste à la main.",
      ''
    ));
  }

  // GET : on demande confirmation (un scanner de liens ne validera pas le formulaire).
  if (event.httpMethod === 'GET') {
    const action = `${event.path}?e=${encodeURIComponent(email)}&t=${encodeURIComponent(token)}`;
    return html(200, page(
      'Se désinscrire',
      `Confirme la désinscription de <strong>${email.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</strong>. Tu ne recevras plus aucun email de Clem Kart Racing.`,
      `<form method="POST" action="${action}"><button type="submit">Confirmer la désinscription</button></form>`
    ));
  }

  try {
    const res = await fetch(`https://api.brevo.com/v3/contacts/${encodeURIComponent(email)}`, {
      method: 'PUT',
      headers: {
        accept: 'application/json',
        'api-key': BREVO_KEY,
        'content-type': 'application/json'
      },
      body: JSON.stringify({ emailBlacklisted: true })
    });

    // 404 = contact inconnu de Brevo : il ne recevra rien de toute façon.
    if (!res.ok && res.status !== 404) {
      console.error('desinscription: Brevo', res.status, await res.text());
      return html(500, page('Désinscription impossible', "Un problème technique est survenu. Réponds à un de mes emails et je te retire de la liste à la main.", ''));
    }
  } catch (err) {
    console.error('desinscription failed:', err.message);
    return html(500, page('Désinscription impossible', "Un problème technique est survenu. Réponds à un de mes emails et je te retire de la liste à la main.", ''));
  }

  return html(200, page(
    'C\'est fait',
    'Tu es désinscrit. Tu ne recevras plus aucun email de Clem Kart Racing. Bonne route et bonnes sessions 🏁',
    ''
  ));
};
