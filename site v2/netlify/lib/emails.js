'use strict';
// Modèles d'emails : HTML en tableaux avec styles en ligne (ni flexbox ni variables CSS) + version texte brut.
// Tout contenu venant du client (prénom, champs, message) est échappé dans le HTML.
//
// Site 1 (V4, 30/09/2026) : seuls les emails de la fonction de rétractation sont publiés (accusé de réception
// au client, copie interne). Les modèles de livraison du paquet « livraison-phase2 » (guide, débrief,
// remboursement, alertes du webhook Stripe) arrivent avec le lot 3 : ils écrivaient des prix et des délais
// en dur, ils devront les lire dans config/offres.json avant d'entrer dans ce dépôt.

const { echapperHtml, estUrlHttps, estUrlWeb, typographier } = require('./format');
const { urlSite } = require('./config');

const C = Object.freeze({
  page: '#050505',
  carte: '#0F0F0F',
  ligne: '#241f1f',
  texte: '#f2ede8',
  attenue: '#a49e97',
  discret: '#6f6a65',
  rouge: '#D9171D',
  or: '#C9A84C',
});
const POLICE = 'Arial, Helvetica, sans-serif';
const MENTION_LEGALE = 'Clem Kart Racing, EI Clément Daniel';
// Libellé réglementaire de la fonction de rétractation (article D221-5 du Code de la consommation).
const LIBELLE_RETRACTATION = 'Renoncer au contrat ici';
const PIED_INTERNE = 'Email interne envoyé par la fonction de rétractation.';

// ---------- Briques de contenu ----------

const gras = (texte) => ({ type: 'gras', texte: String(texte == null ? '' : texte) });
const p = (contenu, ton = 'texte') => ({ type: 'p', segments: [].concat(contenu), ton });
const titre = (texte) => ({ type: 'titre', texte });
const tableau = (lignes) => ({ type: 'tableau', lignes });

function salutation(prenom) {
  return prenom ? `Salut ${prenom},` : 'Salut,';
}

// ---------- Rendu HTML ----------

// Tons de paragraphe : texte (16 px), attenue (16 px, gris clair), mention (14 px, gris clair, mentions légales
// lisibles), discret (13 px, gris foncé).
function couleurTon(ton) {
  if (ton === 'attenue' || ton === 'mention') return C.attenue;
  if (ton === 'discret') return C.discret;
  return C.texte;
}

const TAILLES = Object.freeze({ discret: [13, 20], mention: [14, 21] });

// Références d'articles de loi (« L221-25 », « L221-28 13° ») : jamais coupées au trait d'union en fin de ligne.
const REFERENCE_ARTICLE = /\b([LRD]\d{3}-\d+(?:\s\d+°)?)/g;

// Texte affiché : typographie française, échappement, retours à la ligne conservés.
function texteHtml(valeur) {
  return echapperHtml(typographier(valeur))
    .replace(REFERENCE_ARTICLE, '<span style="white-space:nowrap;">$1</span>')
    .replace(/\r?\n/g, '<br>');
}

// Libellé d'un lien : une URL affichée telle quelle n'est jamais retouchée.
function libelleLien(segment) {
  return segment.texte === segment.url ? segment.texte : typographier(segment.texte);
}

function segmentHtml(segment) {
  if (segment == null) return '';
  if (typeof segment === 'string') return texteHtml(segment);
  if (segment.type === 'gras') return `<strong style="color:${C.texte};font-weight:bold;">${texteHtml(segment.texte)}</strong>`;
  if (segment.type === 'lien') {
    const libelle = echapperHtml(libelleLien(segment)).replace(/\r?\n/g, '<br>');
    // Un lien n'est cliquable que s'il commence par https:// (les liens saisis par le client en particulier).
    if (!estUrlHttps(segment.url)) return libelle;
    // Une URL brute peut se couper n'importe où (écran étroit) ; un libellé se coupe entre les mots.
    const coupure = segment.texte === segment.url ? 'word-break:break-all;' : '';
    return `<a href="${echapperHtml(segment.url)}" style="color:${C.or};text-decoration:underline;${coupure}">${libelle}</a>`;
  }
  return '';
}

function boutonHtml({ texte, url, style }) {
  if (!estUrlWeb(url)) return `<p style="margin:0 0 16px;font-family:${POLICE};font-size:16px;line-height:24px;color:${C.texte};">${texteHtml(texte)}</p>`;
  const principal = style !== 'secondaire';
  const fond = principal ? C.rouge : C.carte;
  const couleur = principal ? '#ffffff' : C.or;
  const bordure = principal ? C.rouge : C.or;
  return [
    '<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:4px 0 20px;">',
    `<tr><td bgcolor="${fond}" style="background-color:${fond};border:1px solid ${bordure};border-radius:2px;">`,
    `<a href="${echapperHtml(url)}" style="display:inline-block;padding:14px 24px;font-family:${POLICE};font-size:15px;line-height:18px;font-weight:bold;letter-spacing:1px;text-transform:uppercase;color:${couleur};text-decoration:none;">${texteHtml(texte)}</a>`,
    '</td></tr></table>',
  ].join('');
}

function tableauHtml(lignes) {
  const rangees = lignes
    .map(
      ([cle, valeur]) =>
        `<tr><td valign="top" width="38%" style="padding:9px 12px 9px 0;border-bottom:1px solid ${C.ligne};font-family:${POLICE};font-size:13px;line-height:20px;color:${C.attenue};">${texteHtml(cle)}</td>` +
        `<td valign="top" style="padding:9px 0;border-bottom:1px solid ${C.ligne};font-family:${POLICE};font-size:14px;line-height:20px;color:${C.texte};word-break:break-word;">${[].concat(valeur).map(segmentHtml).join('')}</td></tr>`
    )
    .join('');
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 20px;border-collapse:collapse;border-top:1px solid ${C.ligne};">${rangees}</table>`;
}

function blocHtml(bloc) {
  switch (bloc.type) {
    case 'titre':
      return `<h1 style="margin:0 0 20px;font-family:${POLICE};font-size:24px;line-height:30px;font-weight:bold;letter-spacing:1px;text-transform:uppercase;color:${C.texte};">${texteHtml(bloc.texte)}</h1>`;
    case 'p': {
      const [taille, interligne] = TAILLES[bloc.ton] || [16, 24];
      return `<p style="margin:0 0 16px;font-family:${POLICE};font-size:${taille}px;line-height:${interligne}px;color:${couleurTon(bloc.ton)};">${bloc.segments.map(segmentHtml).join('')}</p>`;
    }
    case 'bouton':
      return boutonHtml(bloc);
    case 'tableau':
      return tableauHtml(bloc.lignes);
    default:
      return '';
  }
}

function gabarit({ sujet, preheader, corpsHtml, piedHtml }) {
  return [
    '<!DOCTYPE html>',
    '<html lang="fr">',
    '<head>',
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    '<meta name="x-apple-disable-message-reformatting">',
    '<meta name="color-scheme" content="dark">',
    '<meta name="supported-color-schemes" content="dark">',
    `<title>${echapperHtml(sujet)}</title>`,
    '</head>',
    `<body style="margin:0;padding:0;background-color:${C.page};">`,
    preheader
      ? `<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:${C.page};">${texteHtml(preheader)}</div>`
      : '',
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${C.page}" style="background-color:${C.page};">`,
    '<tr><td align="center" style="padding:24px 12px;">',
    '<!--[if mso]><table role="presentation" width="560" align="center" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->',
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">',
    `<tr><td bgcolor="${C.carte}" style="background-color:${C.carte};border:1px solid ${C.ligne};border-top:3px solid ${C.rouge};">`,
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">',
    `<tr><td style="padding:18px 24px;border-bottom:1px solid ${C.ligne};font-family:${POLICE};font-size:13px;line-height:16px;font-weight:bold;letter-spacing:3px;color:${C.texte};">CLEM <span style="color:${C.rouge};">KART</span> RACING</td></tr>`,
    `<tr><td style="padding:28px 24px 12px;">${corpsHtml}</td></tr>`,
    '</table>',
    '</td></tr>',
    `<tr><td align="center" style="padding:18px 20px 8px;font-family:${POLICE};font-size:12px;line-height:18px;color:${C.discret};">${piedHtml}</td></tr>`,
    '</table>',
    '<!--[if mso]></td></tr></table><![endif]-->',
    '</td></tr>',
    '</table>',
    '</body>',
    '</html>',
  ]
    .filter(Boolean)
    .join('\n');
}

// ---------- Rendu texte brut ----------

function segmentTexte(segment) {
  if (segment == null) return '';
  if (typeof segment === 'string') return typographier(segment);
  if (segment.type === 'gras') return typographier(segment.texte);
  if (segment.type === 'lien') return segment.texte && segment.texte !== segment.url ? `${typographier(segment.texte)} (${segment.url})` : segment.url;
  return '';
}

function blocTexte(bloc) {
  switch (bloc.type) {
    case 'titre':
      return typographier(String(bloc.texte).toUpperCase());
    case 'p':
      return bloc.segments.map(segmentTexte).join('');
    case 'bouton':
      return `${typographier(bloc.texte)} : ${bloc.url}`;
    case 'tableau':
      return bloc.lignes.map(([cle, valeur]) => `${typographier(cle)} : ${[].concat(valeur).map(segmentTexte).join('')}`).join('\n');
    default:
      return '';
  }
}

// ---------- Assemblage ----------

// client = true : pied légal avec le lien de rétractation (obligatoire sur chaque email client).
function composer({ sujet, preheader, blocs, client = true, tags = [] }) {
  const liste = blocs.filter(Boolean);
  const urlRetractation = client ? `${urlSite()}/retractation/` : '';
  const piedHtml = client
    ? `${echapperHtml(MENTION_LEGALE)}<br><a href="${echapperHtml(urlRetractation)}" style="color:${C.discret};text-decoration:underline;">${echapperHtml(LIBELLE_RETRACTATION)}</a>`
    : echapperHtml(PIED_INTERNE);
  const piedTexte = client ? `${MENTION_LEGALE}\n${LIBELLE_RETRACTATION} : ${urlRetractation}` : PIED_INTERNE;
  return {
    sujet,
    html: gabarit({ sujet, preheader, corpsHtml: liste.map(blocHtml).join('\n'), piedHtml }),
    texte: `${[...liste.map(blocTexte), '-----', piedTexte].join('\n\n')}\n`,
    tags,
  };
}

// ---------- Emails de la fonction de rétractation ----------

// Accusé de réception de rétractation, sur support durable : reprend la demande, la date et l'heure de réception.
function emailAccuseRetractation({ prenom, nom, email, reference, produitLibelle, message, recuLe }) {
  return composer({
    sujet: 'Accusé de réception : ta demande de rétractation',
    preheader: `Demande reçue le ${recuLe}.`,
    tags: ['retractation'],
    blocs: [
      titre('Demande de rétractation reçue'),
      p(salutation(prenom)),
      p(["J'ai bien reçu ta demande de rétractation le ", gras(recuLe), ' (heure de Paris).']),
      p('Voici le contenu de ta demande :'),
      tableau([
        ['Nom', nom],
        ['Email', email],
        ['Référence de commande', reference],
        ['Produit concerné', produitLibelle],
        ['Message', message || '(aucun)'],
        ['Reçue le', `${recuLe} (heure de Paris)`],
      ]),
      p('Ta demande sera traitée, et le remboursement éventuel effectué, dans les 14 jours suivant sa réception.'),
      p("Garde cet email : c'est ton accusé de réception.", 'attenue'),
      p('Clément'),
    ],
  });
}

// Copie interne d'une demande de rétractation.
function emailCopieRetractation({ nom, email, reference, produitLibelle, message, recuLe, limiteTraitement }) {
  const referenceCourte = String(reference || '').replace(/\s+/g, ' ').slice(0, 80);
  return composer({
    client: false,
    sujet: `Rétractation reçue : ${referenceCourte}`,
    preheader: `À traiter avant le ${limiteTraitement}.`,
    tags: ['interne', 'retractation'],
    blocs: [
      titre('Rétractation reçue'),
      p(['Reçue le ', gras(recuLe), ' (heure de Paris). Traitement et remboursement éventuel avant le ', gras(limiteTraitement), '.']),
      tableau([
        ['Nom', nom],
        ['Email', email],
        ['Référence de commande', reference],
        ['Produit concerné', produitLibelle],
        ['Message', message || '(aucun)'],
      ]),
      p("L'accusé de réception est parti au client avec ce même contenu.", 'attenue'),
    ],
  });
}

module.exports = {
  MENTION_LEGALE,
  LIBELLE_RETRACTATION,
  emailAccuseRetractation,
  emailCopieRetractation,
};
