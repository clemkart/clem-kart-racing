/* ============================================================
   Clem Kart Racing : diagnostic-donnees.js
   Les questions du diagnostic de pilotage, les 9 points à vérifier (un par chapitre de pilotage
   du livre) et le calcul. UN SEUL fichier, lu par deux côtés :
   - la page /diagnostic (assets/diagnostic.js), dans le navigateur : window.CKR_DIAGNOSTIC ;
   - la fonction netlify/functions/diagnostic.js, qui refait le calcul côté serveur avant
     d'écrire les emails (elle ne fait jamais confiance au score envoyé par le navigateur).
   Changer une question ou un poids ici change donc la page ET les emails.
   ============================================================ */
(function (racine, fabrique) {
  if (typeof module === 'object' && module.exports) module.exports = fabrique();
  else racine.CKR_DIAGNOSTIC = fabrique();
}(typeof self !== 'undefined' ? self : this, function () {
'use strict';

var ETAPES = ['Toi', 'Tes idées', 'Ton virage', 'Dans le détail', 'Tes objectifs'];

/* Les 9 points à vérifier : un par chapitre de pilotage du livre, dans l'ordre du virage. */
var ORDRE = ['FREIN', 'ROTA', 'GAZ', 'MAINS', 'TRAJ', 'GRIP', 'RYTHME', 'MENTAL', 'ANALYSE'];
var POINTS = {
  MAINS: { ch: '03', nom: 'Les mains du pilote', titre: 'Tes mains peuvent te donner plus d’informations', fort: 'Tes mains laissent le kart travailler.',
    texte: 'Le volant est un capteur : il te dit ce que le kart accepte et ce qu’il refuse. Des mains qui serrent figent la direction et couvrent ces informations. Une tenue ferme mais légère laisse le kart se placer tout seul.' },
  FREIN: { ch: '04', nom: 'Le freinage dégressif', titre: 'Ton freinage peut t’aider à faire tourner le kart', fort: 'Ton freinage aide déjà le kart à tourner.',
    texte: 'Le frein ne sert pas qu’à ralentir. Quand tu relâches le frein progressivement, la roue arrière intérieure se déleste et le kart se met à pivoter. C’est le freinage dégressif. Si la pression reste trop longtemps, le châssis ne peut pas travailler.' },
  ROTA: { ch: '05', nom: 'La rotation', titre: 'Ta rotation peut se faire avec moins de volant', fort: 'Ton kart pivote sans que tu le forces.',
    texte: 'La rotation, tu la déclenches et c’est le châssis qui la réalise. Ajouter du volant pour l’obtenir fait pousser le kart tout droit. Moins tu forces, plus il pivote.' },
  GAZ: { ch: '06', nom: 'Le point d’accélération', titre: 'Ta remise des gaz peut tomber au bon moment', fort: 'Tu remets les gaz au bon moment.',
    texte: 'Le kart accepte l’accélération une fois sa rotation terminée. La remise des gaz accompagne le débraquage, elle ne le précède pas. Trop tôt, les roues ne sont pas encore dans le bon axe.' },
  TRAJ: { ch: '07', nom: 'La trajectoire réelle', titre: 'Ta trajectoire peut devenir plus vivante', fort: 'Tu adaptes ta ligne au lieu de la réciter.',
    texte: 'La trajectoire du schéma est un point de départ. La bonne ligne est celle que le grip autorise au moment où tu passes, et elle bouge dans la journée.' },
  GRIP: { ch: '08', nom: 'Le grip', titre: 'La piste a des choses à te dire', fort: 'Tu sens la piste évoluer.',
    texte: 'La piste change tout le temps : la température, la gomme, la poussière. Lire ces changements te permet d’ajuster ton entrée et ta ligne avant que le chrono baisse.' },
  RYTHME: { ch: '09', nom: 'Rouler vite longtemps', titre: 'Ton rythme peut tenir plus longtemps', fort: 'Tu tiens ton rythme sur la durée.',
    texte: 'Un tour rapide ne fait pas un pilote complet. La constance vient de gestes réguliers, d’une respiration calme et de petites corrections faites tôt. Ce sont les gestes qui construisent le temps.' },
  MENTAL: { ch: '10', nom: 'Le mental', titre: 'L’enjeu peut devenir un allié', fort: 'L’enjeu ne dérègle pas ton pilotage.',
    texte: 'Avec de l’enjeu, on se tend sans s’en rendre compte. La finesse du relâché de frein et la légèreté des mains partent en premier. Ça se travaille, comme le reste.' },
  ANALYSE: { ch: '11', nom: 'L’analyse après la séance', titre: 'Tes séances peuvent t’apprendre plus', fort: 'Tu sais tirer quelque chose de tes séances.',
    texte: 'Un tour rapide que tu sais expliquer, tu peux le refaire. Trois questions après chaque séance suffisent : qu’est-ce que j’ai fait, qu’est-ce que j’ai senti, qu’est-ce que j’ai raté.' }
};

var PAR_CHAPITRE = ORDRE.slice().sort(function (x, y) { return POINTS[x].ch - POINTS[y].ch; });

/* Une question à choix. Chaque option : [texte, { POINT: poids }]. autre = le pilote peut écrire lui-même. */
function Q(id, s, th, q, o, autre) { return { id: id, type: 'choix', s: s, th: th, q: q, o: o, autre: autre !== false }; }
function inter(s, l1, l2) { return { type: 'inter', s: s, lignes: [l1, l2] }; }

var ECRANS = [
  { type: 'accueil' },
  /* Étape 1 : le contexte, 4 questions maximum */
  { id: 'prenom', type: 'texte', s: 0, th: 'Toi', q: 'Pour commencer, tu t’appelles comment ?' },
  Q('kart', 0, 'Toi', 'Enchanté {prenom}. Tu roules avec quel kart ?', [['Un kart de location'], ['Mini ou Cadet'], ['Rotax (Junior, Max, DD2)'], ['IAME X30 ou équivalent'], ['KZ à boîte']]),
  Q('cadre', 0, 'Toi', 'Tu roules dans quel cadre ?', [['Pour le plaisir, entre potes'], ['En entraînement, régulièrement'], ['En compétition, en club ou en région'], ['En compétition nationale ou plus']]),
  Q('anciennete', 0, 'Toi', 'Depuis combien de temps ?', [['Moins d’un an'], ['1 à 3 ans'], ['3 à 6 ans'], ['Plus de 6 ans']], false),
  inter(1, 'Merci {prenom}.', 'Ici, aucune réponse n’est mauvaise. Je cherche juste à comprendre comment tu roules.'),
  /* Étape 2 : ce que le pilote pense être juste */
  Q('cr_temps', 1, 'Ce que tu penses', 'D’après toi, où gagne-t-on le plus de temps sur un tour ?', [['En freinant plus tard', { FREIN: 1 }], ['En passant plus vite au milieu du virage', { ROTA: 1 }], ['En sortant plus fort du virage'], ['En faisant tous ses tours pareils']]),
  Q('cr_rapide', 1, 'Ce que tu penses', 'Quand un pilote va plus vite que toi avec le même matériel, tu te dis que :', [['Il freine plus tard que moi', { FREIN: 1 }], ['Son moteur ou son châssis marche mieux', { ANALYSE: 1 }], ['Il fait quelque chose que je ne vois pas encore'], ['Il a simplement plus d’heures de roulage', { ANALYSE: 1 }]]),
  Q('cr_traj', 1, 'Ce que tu penses', 'La bonne trajectoire, pour toi, c’est :', [['Celle des schémas : extérieur, corde, extérieur', { TRAJ: 2 }], ['Celle des pilotes rapides, je les copie', { TRAJ: 2 }], ['Celle qui change selon le grip du jour'], ['Je ne me suis jamais posé la question', { TRAJ: 1 }]]),
  inter(2, 'On entre dans le virage.', 'Dans l’ordre : le frein, la trajectoire, le volant, puis les gaz.'),
  /* Étape 3 : le virage, dans l'ordre où il se pilote */
  Q('frein', 2, 'Le frein', 'À l’approche d’un virage, ton freinage ressemble à quoi ?', [['Fort d’un coup, puis je relâche le frein progressivement'], ['Fort, et je garde le frein jusqu’à la corde', { FREIN: 3, ROTA: 1 }], ['Doux et long', { FREIN: 2 }], ['Ça change d’un tour à l’autre', { FREIN: 1, RYTHME: 1 }]]),
  Q('frein_tard', 2, 'Le frein', 'Quand tu essaies de freiner plus tard que d’habitude, il se passe quoi ?', [['Je gagne du temps', { FREIN: 1 }], ['J’arrive trop vite et le kart ne veut plus tourner', { FREIN: 1, ROTA: 1 }], ['Je rate ma corde et ma sortie', { FREIN: 1, TRAJ: 1 }], ['Je n’essaie pas, je garde mes repères']]),
  Q('corde', 2, 'La trajectoire', 'Ton point de corde, tu le places comment ?', [['Toujours au même endroit', { TRAJ: 2, GRIP: 1 }], ['Je le décale selon le grip et la sortie que je veux'], ['Je vise le vibreur et je m’adapte', { TRAJ: 1 }], ['Je ne sais pas vraiment où il est', { TRAJ: 3 }]]),
  Q('volant', 2, 'Le volant', 'Dans un virage serré, tu fais quoi avec le volant ?', [['Je braque une fois, puis je tiens'], ['Je braque, puis j’en rajoute au milieu', { ROTA: 2, MAINS: 1 }], ['Je fais plusieurs petites corrections', { MAINS: 2, ROTA: 1 }], ['Je braque fort d’un coup', { MAINS: 2, ROTA: 2 }]]),
  Q('mains', 2, 'Le volant', 'Et tes mains, pendant un run ?', [['Légères, je sens ce que fait le kart'], ['Fermes, sans être crispées', { MAINS: 1 }], ['Serrées, mes avant-bras fatiguent vite', { MAINS: 3, RYTHME: 1 }], ['Je n’y ai jamais fait attention', { MAINS: 2 }]]),
  Q('pivot', 2, 'La rotation', 'Au milieu d’un virage lent, ton kart :', [['Pivote tout seul, je l’accompagne'], ['Pousse tout droit, je dois braquer plus', { ROTA: 3, FREIN: 1 }], ['Glisse de l’arrière', { ROTA: 2, GAZ: 1 }], ['Réagit différemment à chaque tour', { ROTA: 1, RYTHME: 1 }]]),
  Q('gaz', 2, 'Les gaz', 'Tu remets les gaz à quel moment ?', [['Le plus tôt possible, même avant la corde', { GAZ: 3 }], ['À la corde', { GAZ: 1 }], ['Quand le kart est tourné vers la sortie et que je débraque'], ['Je ne saurais pas dire', { GAZ: 2 }]]),
  Q('sortie', 2, 'Les gaz', 'En sortie de virage, il t’arrive de :', [['Devoir relâcher les gaz', { GAZ: 3 }], ['Rajouter du volant en accélérant', { GAZ: 2, ROTA: 1 }], ['Manquer de piste et élargir', { GAZ: 2, TRAJ: 1 }], ['Rien de tout ça, je sors propre']]),
  inter(3, 'Tu avances bien, {prenom}.', 'On va un peu plus loin dans le détail. Si aucune réponse ne te ressemble, écris la tienne.'),
  /* Étape 4 : de plus en plus précis */
  Q('lacher', 3, 'Dans le détail', 'Au moment précis où tu relâches le frein, tu sens quoi dans le volant ?', [['Il devient plus léger et le kart pivote'], ['Rien de particulier', { FREIN: 2, MAINS: 1 }], ['Il devient lourd, le kart résiste', { FREIN: 2, ROTA: 1 }], ['Je n’ai jamais regardé ça', { FREIN: 1, MAINS: 1 }]]),
  Q('grip', 3, 'La piste', 'Quand la piste change dans la journée (elle se gomme, elle refroidit) :', [['J’adapte ma ligne et mes repères'], ['Je garde les mêmes repères', { GRIP: 3 }], ['Je sens que ça change, sans savoir quoi faire', { GRIP: 2 }], ['Je ne le remarque pas vraiment', { GRIP: 3 }]]),
  Q('regul', 3, 'Ton rythme', 'Entre ton meilleur tour et tes tours suivants, il y a combien ?', [['Moins de 2 dixièmes'], ['2 à 5 dixièmes', { RYTHME: 1 }], ['Plus de 5 dixièmes', { RYTHME: 3 }], ['Je ne regarde pas', { RYTHME: 2, ANALYSE: 2 }]]),
  Q('fin', 3, 'Ton rythme', 'En fin de run, par rapport au début :', [['Je tiens le même rythme'], ['Je suis plus rapide à la fin'], ['Je perds un peu, mes bras fatiguent', { RYTHME: 2, MAINS: 1 }], ['Je fais de plus en plus de petites fautes', { RYTHME: 3, MENTAL: 1 }]]),
  Q('enjeu', 3, 'Ta tête', 'Quand il y a de l’enjeu (un chrono, une course, un pote derrière) :', [['Je roule comme d’habitude'], ['Je roule mieux'], ['Je me crispe et je fais plus de fautes', { MENTAL: 3, MAINS: 1 }], ['J’attaque trop fort', { MENTAL: 3 }]]),
  Q('pourquoi', 3, 'Après la séance', 'Ton meilleur tour de la journée, tu saurais dire pourquoi il était rapide ?', [['Oui, précisément'], ['À peu près', { ANALYSE: 1 }], ['Non, il est arrivé tout seul', { ANALYSE: 3 }]]),
  Q('apres', 3, 'Après la séance', 'Après une séance, tu fais quoi ?', [['Je note ce que j’ai fait et senti'], ['J’en parle avec les autres, sans plus', { ANALYSE: 2 }], ['Je regarde seulement mes chronos', { ANALYSE: 2 }], ['Je passe à autre chose', { ANALYSE: 3 }]]),
  inter(4, 'Dernière ligne droite.', 'On parle de toi, et du pilote que tu as envie de devenir.'),
  /* Étape 5 : les objectifs, pour finir sur de l'envie */
  Q('camera', 4, 'Tes objectifs', 'Tu as des images embarquées de toi ?', [['Oui, j’ai déjà des vidéos'], ['J’ai une caméra, je peux me filmer'], ['Non, pas de caméra']], false),
  Q('reve', 4, 'Tes objectifs', 'Dans six mois, tu aimerais être quel pilote ?', [['Celui qui roule devant ses potes'], ['Un pilote propre et régulier, tour après tour'], ['Un pilote qui monte sur le podium'], ['Un pilote qui comprend enfin ce qu’il fait']]),
  Q('plaisir', 4, 'Tes objectifs', 'Qu’est-ce qui te ferait le plus plaisir à ta prochaine séance ?', [['Battre mon meilleur tour'], ['Sentir que je maîtrise mon kart'], ['Enchaîner dix tours dans le même dixième'], ['Comprendre où je perds du temps']]),
  { id: 'libre', type: 'libre', s: 4, th: 'Avec tes mots', q: 'Un virage ou une situation qui te pose problème ? Raconte-moi.' },
  { type: 'email', s: 4 },
  { type: 'analyse' },
  { type: 'resultat' }
];

/* ============ Calcul (ira dans une fonction testée côté serveur) ============ */
function maxParPoint() {
  var max = {};
  ORDRE.forEach(function (a) { max[a] = 0; });
  ECRANS.forEach(function (e) {
    if (e.type !== 'choix') return;
    ORDRE.forEach(function (a) {
      var m = 0;
      e.o.forEach(function (o) { var f = o[1] || {}; if ((f[a] || 0) > m) m = f[a]; });
      max[a] += m;
    });
  });
  return max;
}
function scorer(r) {
  var max = maxParPoint(), perte = {}, scores = {}, total = 0;
  ORDRE.forEach(function (a) { perte[a] = 0; });
  ECRANS.forEach(function (e) {
    if (e.type !== 'choix' || typeof r[e.id] !== 'number' || !e.o[r[e.id]]) return;
    var f = e.o[r[e.id]][1] || {};
    Object.keys(f).forEach(function (a) { perte[a] += f[a]; });
  });
  ORDRE.forEach(function (a) { scores[a] = Math.round(40 + 60 * (1 - perte[a] / max[a])); total += scores[a]; });
  function tri(sens) { return ORDRE.slice().sort(function (x, y) { return sens * (scores[x] - scores[y]) || ORDRE.indexOf(x) - ORDRE.indexOf(y); }); }
  var priorites = tri(1), top = priorites.slice(0, 3);
  /* Les points forts ne reprennent jamais une des 3 priorités, même à égalité. */
  var forts = tri(-1).filter(function (a) { return top.indexOf(a) < 0; }).slice(0, 2);
  return { scores: scores, priorites: priorites, forts: forts, indice: Math.round(total / ORDRE.length) };
}
/* Estimation marketing demandée par Clément : une fourchette selon l'indice, jamais une mesure. */
function marge(indice) { return indice >= 85 ? '2 à 3 dixièmes' : indice >= 70 ? '3 à 5 dixièmes' : indice >= 55 ? '5 à 8 dixièmes' : '8 dixièmes à 1 seconde'; }

return { ETAPES: ETAPES, ORDRE: ORDRE, PAR_CHAPITRE: PAR_CHAPITRE, POINTS: POINTS, ECRANS: ECRANS, maxParPoint: maxParPoint, scorer: scorer, marge: marge };
}));
