// =============================================
// Clem Kart Racing — Relance J+7 vers le guide complet (fonction planifiée)
// Tourne chaque jour (cron dans netlify.toml). Relance UNE fois, vers le guide complet,
// les contacts à qui l'extrait a réellement été livré il y a 7 à 9 jours.
//
// Garde-fous (dans l'ordre d'importance) :
// 1. Eligibilité fondée sur l'attribut EXTRAIT_ENVOYE, posé par send-email.js APRES un
//    envoi réussi. Un contact de la liste qui n'a jamais reçu l'extrait (inscrits tableur,
//    contacts historiques, envoi échoué) n'a pas cet attribut : il n'est jamais relancé.
// 2. Fenêtre 7-9 jours : même si un attribut traînait, le stock historique est hors fenêtre.
// 3. Attribut RELANCE_GUIDE posé AVANT l'envoi (sémantique at-most-once) : en cas de crash
//    ou de timeout, on rate une relance plutôt que d'en envoyer deux.
// 4. ensureAttributes vérifie vraiment la réponse Brevo : si le marquage ne peut pas être
//    stocké, le run s'arrête avant le premier envoi au lieu de spammer chaque jour.
// 5. Plafond MAX_SENDS_PER_RUN, contacts blacklistés ignorés, déduplication par email.
// Les fonctions planifiées Netlify ne sont pas invocables par HTTP public.
// =============================================

const crypto = require('crypto');

const SITE_URL = process.env.URL || 'https://comprendre-comment-rouler-plus-vite.netlify.app';
const GUIDE_URL = 'https://clemkartracing.gumroad.com/l/umjfwx';
const SENDER = { name: 'Clem Kart Racing', email: 'clemkartracing@gmail.com' };

const DAY_MS = 24 * 60 * 60 * 1000;
const WINDOW_MIN_DAYS = 7;   // relance au plus tôt 7 jours après la livraison de l'extrait
const WINDOW_MAX_DAYS = 9;   // au-delà, trop tard : on ne relance plus
const MAX_SENDS_PER_RUN = 40;
const SEND_CONCURRENCY = 5;  // les fonctions planifiées Netlify sont coupées à 30 s
const PAGE_LIMIT = 500;      // pagination Brevo (max 500)
const MAX_PAGES = 20;        // garde-fou : 10 000 contacts max parcourus

const DELIVERED_ATTRIBUTE = 'EXTRAIT_ENVOYE';
const RELANCE_ATTRIBUTE = 'RELANCE_GUIDE';
// Attributs que send-email.js et cette fonction écrivent. Brevo ignore SILENCIEUSEMENT
// un attribut inconnu du compte : ils doivent donc exister avant tout marquage.
const REQUIRED_ATTRIBUTES = [RELANCE_ATTRIBUTE, DELIVERED_ATTRIBUTE, 'TABLEUR_ENVOYE'];

const RELANCE_SUBJECT = 'Tu as lu l’extrait ? Voilà ce qui vient après';

// Dupliqué depuis send-email.js : chaque fonction Netlify est bundlée isolément.
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

function relanceHtml(email) {
  return `
  <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;background:#070707;color:#f2ede8;padding:40px 32px;">
    <h1 style="font-family:Arial,sans-serif;font-size:28px;margin-bottom:8px;color:#f2ede8;">Et maintenant, la suite 🏁</h1>
    <p style="color:rgba(242,237,232,0.7);line-height:1.7;margin-bottom:24px;">
      Il y a une semaine, tu as reçu l'extrait du guide et le tableur de réglages.
      Si tu as lu le chapitre sur le freinage dégressif, tu sais déjà que
      <strong style="color:#f2ede8;">la façon dont tu relâches le frein compte plus que la façon dont tu appuies dessus</strong>.
    </p>
    <p style="color:rgba(242,237,232,0.7);line-height:1.7;margin-bottom:24px;">
      L'extrait s'arrête exactement là où ça devient intéressant. Le guide complet, c'est 13 chapitres pour :
    </p>
    <ul style="color:rgba(242,237,232,0.7);line-height:1.8;margin:0 0 24px;padding-left:20px;">
      <li>utiliser ton regard pour anticiper au lieu de subir ;</li>
      <li>découper chaque virage en points de référence, pour te répéter tour après tour ;</li>
      <li>faire de la réaccélération ton vrai levier de chrono ;</li>
      <li>construire une confiance calme, à la place d'un pilotage nerveux et aléatoire.</li>
    </ul>
    <p style="color:rgba(242,237,232,0.7);line-height:1.7;margin-bottom:32px;">
      14,99€, accès immédiat, <strong style="color:#f2ede8;">garantie satisfait ou remboursé 7 jours</strong>, sans condition.
      Ce que tu lis ce soir, tu l'appliques à ta prochaine session.
    </p>
    <a href="${GUIDE_URL}"
       style="display:inline-block;background:#D9171D;color:#f2ede8;font-family:Arial,sans-serif;font-size:14px;font-weight:700;letter-spacing:2px;text-transform:uppercase;text-decoration:none;padding:14px 28px;">
      Obtenir le guide complet · 14,99€ →
    </a>
    <p style="color:rgba(242,237,232,0.5);font-size:13px;margin-top:24px;line-height:1.6;">
      Déjà pris le guide ? Ignore cet email, et merci pour ta confiance.
    </p>
    <p style="color:rgba(242,237,232,0.4);font-size:12px;margin-top:32px;line-height:1.6;">
      Clem Kart Racing · <a href="${unsubscribeUrl(email)}" style="color:rgba(242,237,232,0.55);">Me désinscrire en un clic</a>.
    </p>
  </div>
`;
}

function brevoHeaders(key) {
  return {
    accept: 'application/json',
    'api-key': key,
    'content-type': 'application/json'
  };
}

// Crée les attributs manquants. Un attribut déjà existant renvoie une erreur Brevo
// qu'on tolère ; tout autre échec fait échouer le run AVANT le premier envoi, car sans
// marquage stockable chaque contact serait relancé à chaque run de la fenêtre.
async function ensureAttributes(key) {
  for (const name of REQUIRED_ATTRIBUTES) {
    const res = await fetch(`https://api.brevo.com/v3/contacts/attributes/normal/${name}`, {
      method: 'POST',
      headers: brevoHeaders(key),
      body: JSON.stringify({ type: 'text' })
    });
    if (res.ok) {
      console.log(`relance-guide: attribut ${name} créé.`);
      continue;
    }
    const detail = await res.text();
    // 400 = déjà existant (cas nominal après le premier run).
    if (res.status === 400 && /exist/i.test(detail)) continue;
    throw new Error(`attribut ${name} indisponible : HTTP ${res.status} ${detail}`);
  }
}

async function fetchListContacts(key, listId) {
  const byEmail = new Map(); // dédupliqué : la pagination par offset peut répéter un contact
  for (let page = 0; page < MAX_PAGES; page++) {
    const res = await fetch(
      `https://api.brevo.com/v3/contacts/lists/${listId}/contacts?limit=${PAGE_LIMIT}&offset=${page * PAGE_LIMIT}`,
      { headers: brevoHeaders(key) }
    );
    if (!res.ok) {
      throw new Error(`liste ${listId} : HTTP ${res.status} ${await res.text()}`);
    }
    const data = await res.json();
    const batch = Array.isArray(data.contacts) ? data.contacts : [];
    for (const contact of batch) {
      if (contact && contact.email) byEmail.set(contact.email.toLowerCase(), contact);
    }
    if (batch.length < PAGE_LIMIT) break;
  }
  return [...byEmail.values()];
}

// Date de livraison de l'extrait (YYYY-MM-DD posé par send-email.js), en ms. null si absent.
function deliveredAt(contact) {
  const raw = (contact.attributes || {})[DELIVERED_ATTRIBUTE];
  if (!raw) return null;
  const ts = Date.parse(raw);
  return Number.isNaN(ts) ? null : ts;
}

function isEligible(contact, now) {
  if (!contact || !contact.email) return false;
  if (contact.emailBlacklisted) return false;
  if ((contact.attributes || {})[RELANCE_ATTRIBUTE]) return false; // déjà relancé
  const delivered = deliveredAt(contact);
  if (delivered === null) return false; // n'a jamais reçu l'extrait
  const ageDays = (now - delivered) / DAY_MS;
  return ageDays >= WINDOW_MIN_DAYS && ageDays < WINDOW_MAX_DAYS;
}

async function markRelanced(key, email, dateISO) {
  const res = await fetch(`https://api.brevo.com/v3/contacts/${encodeURIComponent(email)}`, {
    method: 'PUT',
    headers: brevoHeaders(key),
    body: JSON.stringify({ attributes: { [RELANCE_ATTRIBUTE]: dateISO } })
  });
  if (!res.ok) {
    throw new Error(`marquage HTTP ${res.status} ${await res.text()}`);
  }
}

async function sendRelance(key, email) {
  const unsubUrl = unsubscribeUrl(email);
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: brevoHeaders(key),
    body: JSON.stringify({
      sender: SENDER,
      to: [{ email }],
      subject: RELANCE_SUBJECT,
      htmlContent: relanceHtml(email),
      headers: {
        'List-Unsubscribe': `<${unsubUrl}>`,
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click'
      }
    })
  });
  if (!res.ok) {
    throw new Error(`envoi HTTP ${res.status} ${await res.text()}`);
  }
}

// Marquage PUIS envoi : un contact marqué mais non servi rate sa relance,
// ce qui est préférable à un doublon.
async function relanceOne(key, contact, dateISO) {
  try {
    await markRelanced(key, contact.email, dateISO);
  } catch (err) {
    console.error(`relance-guide: marquage impossible, envoi annulé (${err.message})`);
    return false;
  }
  try {
    await sendRelance(key, contact.email);
    return true;
  } catch (err) {
    console.error(`relance-guide: envoi échoué après marquage (${err.message})`);
    return false;
  }
}

exports.handler = async function() {
  const BREVO_KEY = process.env.BREVO_API_KEY;
  if (!BREVO_KEY) {
    console.error('relance-guide: BREVO_API_KEY manquante');
    return { statusCode: 500, body: '' };
  }
  const LIST_ID = parseInt(process.env.BREVO_TABLEUR_LIST_ID || '6', 10);

  try {
    await ensureAttributes(BREVO_KEY);

    const now = Date.now();
    const contacts = await fetchListContacts(BREVO_KEY, LIST_ID);
    const eligible = contacts
      .filter((c) => isEligible(c, now))
      // Les plus anciens d'abord : ce sont eux qui vont sortir de la fenêtre en premier.
      .sort((a, b) => deliveredAt(a) - deliveredAt(b));

    if (eligible.length === 0) {
      console.log(`relance-guide: aucun contact éligible (${contacts.length} contacts dans la liste ${LIST_ID}).`);
      return { statusCode: 200, body: '' };
    }
    if (eligible.length > MAX_SENDS_PER_RUN) {
      console.log(`relance-guide: ${eligible.length} éligibles, plafonné à ${MAX_SENDS_PER_RUN} ; le reste passera au prochain run.`);
    }

    const batchList = eligible.slice(0, MAX_SENDS_PER_RUN);
    const dateISO = new Date(now).toISOString().slice(0, 10);

    let sent = 0;
    for (let i = 0; i < batchList.length; i += SEND_CONCURRENCY) {
      const results = await Promise.all(
        batchList.slice(i, i + SEND_CONCURRENCY).map((c) => relanceOne(BREVO_KEY, c, dateISO))
      );
      sent += results.filter(Boolean).length;
    }

    console.log(`relance-guide: ${sent}/${batchList.length} relances envoyées (liste ${LIST_ID}, ${contacts.length} contacts).`);
    return { statusCode: 200, body: '' };
  } catch (err) {
    console.error('relance-guide failed:', err.message);
    return { statusCode: 500, body: '' };
  }
};
