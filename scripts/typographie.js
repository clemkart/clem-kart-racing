/* ============================================================
   Clem Kart Racing : scripts/typographie.js (Node, aucune dependance)

   Typographie francaise appliquee au HTML genere, sur le texte seulement :
   jamais dans les balises, les attributs, les scripts, les styles,
   les commentaires, <pre>, <code>, <kbd>, <textarea>, ni dans une URL
   ecrite en clair dans le texte.
     « texte »          ->  «&nbsp;texte&nbsp;»  (ajoutee si l espace manque)
     mot : ; ? !        ->  mot&nbsp;: ; ? !  (le signe ne part jamais seul a la ligne)
     1 000              ->  1&nbsp;000
     16 € / 72 h / 5 %  ->  16&nbsp;€ / 72&nbsp;h / 5&nbsp;%
     7 jours, 59 pages  ->  7&nbsp;jours, 59&nbsp;pages  (nombre et unite comptee, voir UNITES)
   Idempotent : un texte deja corrige ressort a l identique (aucune double insecable).
   Option retirerCommentaires : les commentaires <!-- --> ne partent pas en ligne
   (sauf les commentaires conditionnels <!--[if ...]>).

   Utilise par scripts/build.js (pages du site) et par les fonctions qui envoient
   des emails (corps HTML seulement : les objets et les versions texte restent tels quels).
   ============================================================ */
'use strict';

const NBSP = '&nbsp;';

/* Morceaux a ne jamais toucher, puis toute autre balise */
const JETON = new RegExp([
  '<!--[\\s\\S]*?-->',
  '<script\\b[\\s\\S]*?<\\/script>',
  '<style\\b[\\s\\S]*?<\\/style>',
  '<pre\\b[\\s\\S]*?<\\/pre>',
  '<code\\b[\\s\\S]*?<\\/code>',
  '<kbd\\b[\\s\\S]*?<\\/kbd>',
  '<textarea\\b[\\s\\S]*?<\\/textarea>',
  '<[^>]*>',
].join('|'), 'gi');

/* Une adresse ecrite dans le texte (https://..., www...., nom@domaine) reste intacte */
const URL_TEXTE = /(?:https?:\/\/|www\.)[^\s<]+|[^\s<@]+@[^\s<@]+\.[a-z]{2,}/gi;

/* Une espace deja insecable (entite ou caractere) : ne jamais en ajouter une deuxieme */
const DEJA_INSECABLE = '(?!&nbsp;|&#160;|&#xa0;|&#8239;|\\u00a0|\\u202f)';

/* Unites comptees qui ne partent jamais seules a la ligne : « 7 / jours » se lit mal.
   Singulier et pluriel ; \b laisse « 3 moissons » ou « 2 pagaies » intacts. */
const UNITES = /(\d) (jours?|semaines?|mois|ans?|heures?|minutes?|secondes?|pages?|chapitres?|questions?|sessions?|tours?|places?|fois)\b/g;

const DEBUT_LIGNE_VIDE = /^[ \t]*\n/;
const FIN_SUR_LIGNE_VIDE = /(^|\n)[ \t]*$/;

function corrigerMorceau(t) {
  return t
    .replace(/« +/g, '«' + NBSP)
    .replace(new RegExp('«' + DEJA_INSECABLE + '(?=\\S)', 'g'), '«' + NBSP)
    .replace(/ +»/g, NBSP + '»')
    .replace(/(^|[^\s;\u00a0\u202f])»/g, (tout, avant) => (avant === '' ? tout : avant + NBSP + '»'))
    .replace(/ +([:;?!])/g, NBSP + '$1')
    .replace(/(^|[^\d])(\d{1,3}(?: \d{3})+)(?!\d)/g, (tout, avant, nombre) => avant + nombre.replace(/ /g, NBSP))
    .replace(/(\d) (€|%|h\b)/g, '$1' + NBSP + '$2')
    .replace(UNITES, '$1' + NBSP + '$2');
}

/* Corrige le texte hors adresses : les URL et emails ecrits en clair passent tels quels */
function corrigerTexte(t) {
  let sortie = '';
  let dernier = 0;
  let m;
  URL_TEXTE.lastIndex = 0;
  while ((m = URL_TEXTE.exec(t))) {
    sortie += corrigerMorceau(t.slice(dernier, m.index)) + m[0];
    dernier = m.index + m[0].length;
  }
  return sortie + corrigerMorceau(t.slice(dernier));
}

function typographier(html, options) {
  const retirer = Boolean(options && options.retirerCommentaires);
  let sortie = '';
  let dernier = 0;
  let ligneRetiree = false;
  let m;
  JETON.lastIndex = 0;
  while ((m = JETON.exec(html))) {
    let texte = html.slice(dernier, m.index);
    /* Un commentaire seul sur sa ligne ne laisse pas de ligne vide */
    if (ligneRetiree) texte = texte.replace(DEBUT_LIGNE_VIDE, '');
    ligneRetiree = false;
    sortie += corrigerTexte(texte);
    const jeton = m[0];
    const aRetirer = retirer && jeton.startsWith('<!--') && !/^<!--\[if/i.test(jeton);
    if (!aRetirer) {
      sortie += jeton;
    } else if (FIN_SUR_LIGNE_VIDE.test(sortie)) {
      sortie = sortie.replace(/[ \t]*$/, '');
      ligneRetiree = true;
    }
    dernier = m.index + jeton.length;
  }
  let fin = html.slice(dernier);
  if (ligneRetiree) fin = fin.replace(DEBUT_LIGNE_VIDE, '');
  return sortie + corrigerTexte(fin);
}

module.exports = { typographier, corrigerTexte };
