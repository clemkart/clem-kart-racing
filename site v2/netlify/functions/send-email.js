exports.handler = async function(event) {
  // Accepte uniquement les requêtes POST
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  // Récupère l'email envoyé par le formulaire
  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON' }) };
  }

  const { email } = body;
  if (!email || !email.includes('@')) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Email invalide' }) };
  }

  // La clé API est stockée dans Netlify (jamais dans le code)
  const BREVO_KEY = process.env.BREVO_API_KEY;
  if (!BREVO_KEY) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Clé API manquante' }) };
  }


  const payload = {
    sender: { name: 'Clem Kart Racing', email: 'clemkartracing@gmail.com' },
    to: [{ email }],
    subject: '🏎️ Ton tableur de réglages kart est là',
    htmlContent: `
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
        <a href="https://clemkartracing.gumroad.com/l/umjfwx"
           style="display:inline-block;background:#D9171D;color:#f2ede8;font-family:Arial,sans-serif;font-size:14px;font-weight:700;letter-spacing:2px;text-transform:uppercase;text-decoration:none;padding:14px 28px;">
          Découvrir le guide complet · 14,99€ →
        </a>
        <p style="color:rgba(242,237,232,0.4);font-size:12px;margin-top:32px;line-height:1.6;">
          Clem Kart Racing · Tu peux te désinscrire à tout moment en répondant STOP à cet email.<br>📬 Si tu ne vois pas cet email, vérifie ton dossier spam ou courrier indésirable.
        </p>
      </div>
    `,
    attachment: [{
      name: 'Tableur-Reglages-Kart-ClemKartRacing.xlsx',
      url: 'https://comprendre-comment-rouler-plus-vite.netlify.app/tableur-reglages-kart-v2.xlsx'
    }]
  };

  try {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': BREVO_KEY,
        'content-type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (response.ok) {
      return {
        statusCode: 200,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ success: true })
      };
    } else {
      const err = await response.json();
      console.error('Brevo error:', err);
      return {
        statusCode: 500,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'Erreur Brevo', detail: err })
      };
    }
  } catch (err) {
    console.error('Fetch error:', err);
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Erreur réseau' })
    };
  }
};
