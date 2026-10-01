'use strict';
// Dates en français, fuseau Europe/Paris (heure d'été gérée par la base de fuseaux de Node).
// Exemple : « jeudi 26 septembre à 14 h 05 ».
// Les noms de jours et de mois sont écrits ici : le résultat ne dépend pas des données de langue installées.

const FUSEAU = 'Europe/Paris';
// Espace insécable dans « 14 h 05 » : l'heure ne se coupe jamais en fin de ligne.
const ESPACE_INSECABLE = String.fromCharCode(0x00a0);
const JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
const MOIS = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
];

// Délai de livraison promis pour un débrief, lu dans config/offres.json (delais.debrief_h), jamais écrit ici.
const OFFRES = require('../../../config/offres.json');
const DELAI_DEBRIEF_MS = OFFRES.delais.debrief_h * 60 * 60 * 1000;

// Formateur numérique en anglais (toujours disponible) : on ne lui demande que des nombres.
const FORMATEUR = new Intl.DateTimeFormat('en-US', {
  timeZone: FUSEAU,
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
  hour: 'numeric',
  minute: 'numeric',
  hourCycle: 'h23',
});

function versDate(valeur) {
  const date = valeur instanceof Date ? valeur : new Date(valeur);
  if (Number.isNaN(date.getTime())) throw new Error('Date invalide');
  return date;
}

// Composantes de la date à l'heure de Paris.
function partiesParis(valeur) {
  const parties = {};
  for (const partie of FORMATEUR.formatToParts(versDate(valeur))) {
    if (partie.type !== 'literal') parties[partie.type] = Number(partie.value);
  }
  const heure = parties.hour === 24 ? 0 : parties.hour;
  const jourSemaine = new Date(Date.UTC(parties.year, parties.month - 1, parties.day)).getUTCDay();
  return { annee: parties.year, mois: parties.month, jour: parties.day, heure, minute: parties.minute, jourSemaine };
}

// « jeudi 26 septembre » (ou « jeudi 26 septembre 2024 » avec { annee: true }). Le premier du mois s'écrit « 1er ».
function formaterDate(valeur, { annee = false } = {}) {
  const p = partiesParis(valeur);
  const jour = p.jour === 1 ? '1er' : String(p.jour);
  return `${JOURS[p.jourSemaine]} ${jour} ${MOIS[p.mois - 1]}${annee ? ` ${p.annee}` : ''}`;
}

// « 14 h 05 » (espaces insécables)
function formaterHeure(valeur) {
  const p = partiesParis(valeur);
  return `${p.heure}${ESPACE_INSECABLE}h${ESPACE_INSECABLE}${String(p.minute).padStart(2, '0')}`;
}

// « jeudi 26 septembre à 14 h 05 »
function formaterDateHeure(valeur, options = {}) {
  return `${formaterDate(valeur, options)} à ${formaterHeure(valeur)}`;
}

// Échéance d'un débrief : paiement + delais.debrief_h.
function echeanceDebrief(datePaiement) {
  return new Date(versDate(datePaiement).getTime() + DELAI_DEBRIEF_MS);
}

module.exports = {
  FUSEAU,
  DELAI_DEBRIEF_MS,
  partiesParis,
  formaterDate,
  formaterHeure,
  formaterDateHeure,
  echeanceDebrief,
};
