// =============================================
// Clem Kart Racing : Relance J+7 vers le guide complet (fonction planifiée)
// Tourne chaque jour (cron dans netlify.toml). Relance UNE fois, vers le guide complet,
// les contacts à qui l'extrait a réellement été livré il y a 7 à 9 jours.
//
// Garde-fous (dans l'ordre d'importance) :
// 1. Eligibilité fondée sur un attribut de livraison (EXTRAIT_ENVOYE / TABLEUR_ENVOYE)
//    posé par send-email.js APRES un envoi réussi, et le texte de la relance est choisi
//    d'après cet attribut. Un contact qui n'a rien reçu (contacts historiques, envoi
//    échoué) n'a aucun de ces attributs : il n'est jamais relancé, et personne ne reçoit
//    un email qui parle d'un document qu'il n'a pas eu.
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

const RELANCE_ATTRIBUTE = 'RELANCE_GUIDE';
// Attributs que send-email.js et cette fonction écrivent. Brevo ignore SILENCIEUSEMENT
// un attribut inconnu du compte : ils doivent donc exister avant tout marquage.
const REQUIRED_ATTRIBUTES = [RELANCE_ATTRIBUTE, 'EXTRAIT_ENVOYE', 'TABLEUR_ENVOYE'];

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

// Palette et briques identiques aux emails de livraison (send-email.js) : tableaux HTML
// et styles inline, seule mise en forme que Gmail, Outlook et Apple Mail respectent.
const C = {
  page: '#050505', card: '#0F0F0F', line: '#241f1f',
  text: '#f2ede8', muted: '#a49e97', faint: '#6f6a65',
  red: '#D9171D'
};

// Accroche propre à chaque parcours : on ne parle que de ce que le contact a vraiment reçu.
const ACCROCHES = {
  EXTRAIT_ENVOYE: {
    subject: 'Tu as lu l’extrait ? Voilà ce qui vient après',
    apercu: 'La suite du chapitre sur le freinage dégressif.',
    intro: `Il y a une semaine, tu as reçu l'extrait de mon guide. Si tu as lu le chapitre sur le freinage dégressif,
            tu sais déjà que <strong style="color:${C.text};">la façon dont tu relâches le frein compte plus que la façon dont tu appuies dessus</strong>.`,
    transition: "L'extrait s'arrête exactement là où ça devient intéressant. Le guide complet, c'est 13 chapitres pour :"
  },
  TABLEUR_ENVOYE: {
    subject: 'Ton tableur est rempli ? Il manque la grille de lecture',
    apercu: 'Noter tes réglages, c\'est la moitié du travail.',
    intro: `Il y a une semaine, tu as reçu mon tableur de réglages. Si tu l'as rempli deux ou trois fois,
            tu commences à voir des schémas revenir. Et très vite arrive la vraie question :
            <strong style="color:${C.text};">pourquoi ce réglage marche ici et pas là-bas ?</strong>`,
    transition: "Noter, c'est la moitié du travail. Comprendre, c'est l'autre moitié. Le guide, c'est 13 chapitres pour :"
  }
};

function relanceHtml(email, attribut) {
  const a = ACCROCHES[attribut];
  const puces = [
    'comprendre le rôle exact du freinage dans la rotation du kart ;',
    'utiliser ton regard pour anticiper au lieu de subir ;',
    'découper chaque virage en points de référence, pour te répéter tour après tour ;',
    'construire une confiance calme, à la place d\'un pilotage nerveux et aléatoire.'
  ].map((p) => `
                  <tr>
                    <td width="18" valign="top" style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.7;color:${C.red};">▸</td>
                    <td style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.7;color:${C.muted};padding-bottom:6px;">${p}</td>
                  </tr>`).join('');

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
</head>
<body style="margin:0;padding:0;background:${C.page};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;">${a.apercu}</div>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${C.page};">
  <tr>
    <td align="center" style="padding:24px 12px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="width:100%;max-width:600px;background:${C.card};border-top:3px solid ${C.red};">
        <tr>
          <td style="padding:32px 36px 0;">
            <div style="font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:bold;letter-spacing:3px;text-transform:uppercase;color:${C.text};">
              CLEM <span style="color:${C.red};">KART</span> RACING
            </div>
            <div style="height:2px;width:44px;background:${C.red};margin-top:12px;font-size:0;line-height:0;">&nbsp;</div>
          </td>
        </tr>
        <tr>
          <td style="padding:26px 36px 0;">
            <h1 style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:28px;line-height:1.2;color:${C.text};font-weight:bold;">Et maintenant, la suite 🏁</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:18px 36px 0;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.7;color:${C.muted};">
            ${a.intro}
          </td>
        </tr>
        <tr>
          <td style="padding:18px 36px 0;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.7;color:${C.muted};">
            ${a.transition}
          </td>
        </tr>
        <tr>
          <td style="padding:18px 36px 0;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">${puces}</table>
          </td>
        </tr>
        <tr>
          <td style="padding:22px 36px 0;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.7;color:${C.muted};">
            16,99&nbsp;€, accès immédiat, <strong style="color:${C.text};">garantie satisfait ou remboursé 7 jours</strong>, sans condition.
            Ce que tu lis ce soir, tu l'appliques à ta prochaine session.
          </td>
        </tr>
        <tr>
          <td style="padding:28px 36px 0;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="background:${C.red};">
                  <a href="${GUIDE_URL}" style="display:inline-block;padding:15px 30px;font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;color:${C.text};text-decoration:none;">Découvrir le guide · 16,99&nbsp;€</a>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:30px 36px 0;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
              <tr>
                <td style="border-top:1px solid ${C.line};padding-top:22px;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.7;color:${C.muted};">
                  Déjà pris le guide ? Ignore cet email, et merci pour ta confiance.<br><br>
                  Bonnes sessions 🏁<br>
                  <strong style="color:${C.text};">Clément</strong><br>
                  <span style="font-size:12px;color:${C.faint};">Clem Kart Racing · Champion Régional 2023</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:26px 36px 34px;font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:1.7;color:${C.faint};">
            Tu reçois cet email parce que tu as demandé une ressource gratuite sur clemkartracing.<br>
            <a href="${unsubscribeUrl(email)}" style="color:${C.faint};text-decoration:underline;">Me désinscrire en un clic</a>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
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

// Ce que le contact a REELLEMENT reçu, et quand (YYYY-MM-DD posé par send-email.js après
// un envoi réussi). L'extrait prime : c'est l'engagement le plus fort, et son email de
// relance rebondit sur le chapitre lu. null si le contact n'a jamais rien reçu.
function livraison(contact) {
  const attrs = contact.attributes || {};
  for (const nom of ['EXTRAIT_ENVOYE', 'TABLEUR_ENVOYE']) {
    const ts = Date.parse(attrs[nom] || '');
    if (!Number.isNaN(ts)) return { attribut: nom, date: ts };
  }
  return null;
}

function isEligible(contact, now) {
  if (!contact || !contact.email) return false;
  if (contact.emailBlacklisted) return false;
  if ((contact.attributes || {})[RELANCE_ATTRIBUTE]) return false; // déjà relancé
  const recu = livraison(contact);
  if (!recu) return false; // n'a jamais reçu de lead magnet
  const ageDays = (now - recu.date) / DAY_MS;
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

async function sendRelance(key, email, attribut) {
  const unsubUrl = unsubscribeUrl(email);
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: brevoHeaders(key),
    body: JSON.stringify({
      sender: SENDER,
      to: [{ email }],
      subject: ACCROCHES[attribut].subject,
      htmlContent: relanceHtml(email, attribut),
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
  const recu = livraison(contact);
  if (!recu) return false; // filtré en amont par isEligible, garde-fou de dernier recours
  try {
    await markRelanced(key, contact.email, dateISO);
  } catch (err) {
    console.error(`relance-guide: marquage impossible, envoi annulé (${err.message})`);
    return false;
  }
  try {
    await sendRelance(key, contact.email, recu.attribut);
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
      .sort((a, b) => livraison(a).date - livraison(b).date);

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
