'use strict';
// Petites fonctions de mise en forme partagées : échappement HTML, montants, prénoms, emails, URL.

// Espaces insécables construites par code (invisibles dans un éditeur si on les tape).
const ESPACE_INSECABLE = String.fromCharCode(0x00a0);
const ESPACE_FINE_INSECABLE = String.fromCharCode(0x202f);

// Échappe tout texte avant insertion dans du HTML (contenu ou attribut).
function echapperHtml(valeur) {
  return String(valeur == null ? '' : valeur)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// 1250 -> « 12,50 € » (espace insécable avant le symbole). Calcul manuel : ne dépend pas des données de langue de Node.
function formaterMontant(centimes, devise = 'eur') {
  const nombre = Number(centimes);
  if (!Number.isFinite(nombre)) return '';
  const [entier, decimales] = (Math.abs(Math.round(nombre)) / 100).toFixed(2).split('.');
  const groupes = entier.replace(/\B(?=(\d{3})+(?!\d))/g, ESPACE_FINE_INSECABLE);
  const code = String(devise || 'eur').toUpperCase();
  const symbole = code === 'EUR' ? '€' : code;
  return `${nombre < 0 ? '-' : ''}${groupes},${decimales}${ESPACE_INSECABLE}${symbole}`;
}

// Typographie française : espace insécable avant € : ; ? ! » et après «, pour qu'une ligne ne commence
// jamais par « € » ou « : ». Les URL ne contiennent pas d'espace : elles ne sont jamais modifiées.
function typographier(texte) {
  return String(texte == null ? '' : texte)
    .replace(/ ([€:;?!»])/g, `${ESPACE_INSECABLE}$1`)
    .replace(/« /g, `«${ESPACE_INSECABLE}`)
    .replace(/(\b[LRD]\d{3}-\d+) (\d+°)/g, `$1${ESPACE_INSECABLE}$2`); // « L221-28 13° » d'un seul tenant
}

// Prénom affichable à partir du nom saisi au paiement : premier mot, casse corrigée si tout est en
// majuscules ou tout en minuscules (« JEAN-PIERRE DUPONT » -> « Jean-Pierre »). Chaîne vide si rien d'exploitable.
function prenomDepuisNom(nom) {
  if (typeof nom !== 'string') return '';
  let prenom = (nom.trim().split(/\s+/)[0] || '').slice(0, 40);
  if (prenom && (prenom === prenom.toUpperCase() || prenom === prenom.toLowerCase())) {
    prenom = prenom.toLowerCase().replace(/(^|[-'’])(\p{L})/gu, (tout, separateur, lettre) => separateur + lettre.toUpperCase());
  }
  return prenom;
}

// « jean.dupont@exemple.fr » -> « j***@exemple.fr ». Jamais l'adresse complète.
function masquerEmail(email) {
  if (typeof email !== 'string') return '';
  const arobase = email.lastIndexOf('@');
  if (arobase < 1 || arobase === email.length - 1) return '';
  return `${email[0]}***@${email.slice(arobase + 1)}`;
}

// Contrôle simple et volontairement strict d'une adresse email.
function estEmailValide(email) {
  return (
    typeof email === 'string' &&
    email.length <= 254 &&
    /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[^\s@<>()[\]\\,;:"]{2,}$/.test(email)
  );
}

// URL cliquable venant d'un tiers : uniquement https://, sans espace ni guillemet.
function estUrlHttps(valeur) {
  if (typeof valeur !== 'string' || !/^https:\/\//i.test(valeur) || /[\s<>"'`]/.test(valeur)) return false;
  try {
    const url = new URL(valeur);
    return url.protocol === 'https:' && Boolean(url.hostname);
  } catch {
    return false;
  }
}

// URL de nos propres liens (site, Stripe) : http:// accepté pour le développement local.
function estUrlWeb(valeur) {
  if (typeof valeur !== 'string' || /[\s<>"'`]/.test(valeur)) return false;
  try {
    const url = new URL(valeur);
    return (url.protocol === 'https:' || url.protocol === 'http:') && Boolean(url.hostname);
  } catch {
    return false;
  }
}

module.exports = {
  ESPACE_INSECABLE,
  echapperHtml,
  formaterMontant,
  typographier,
  prenomDepuisNom,
  masquerEmail,
  estEmailValide,
  estUrlHttps,
  estUrlWeb,
};
