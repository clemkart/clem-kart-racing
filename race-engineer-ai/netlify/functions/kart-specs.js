// =============================================
// KART_SPECS : Registre des spécificités châssis × moteur
// =============================================
// SOURCE DE VÉRITÉ de l'adaptation matériel. C'est ce fichier qui garantit
// qu'un Sodikart en Rotax Senior ne reçoit PAS le même diagnostic qu'un
// Tony Kart en X30.
//
// Chaque entrée décrit :
//   - les leviers RÉELLEMENT disponibles sur ce matériel
//   - l'ordre dans lequel un ingénieur les essaie sur cette marque
//   - la terminologie propre à la marque
//   - le comportement caractéristique (prior)
//   - les pièges à ne pas commettre sur ce matériel
//
// Niveaux de fiabilité (repris de skill/materiel-specifique.md) :
//   [OK]  sourcé (manuels constructeur, forums techniques, presse spécialisée)
//   [?]   déduction ou connaissance générale : à présenter comme indicatif
//   [CD]  validé par l'expérience directe de Clément Daniel
//
// ⚠️ La liste des marques doit rester alignée avec le <select id="profil-chassis">
//    et CHASSIS_HINTS dans index.html.
// =============================================

// --- CHÂSSIS ---------------------------------------------------------------

// Leviers du formulaire qui n'existent pas sur certaines marques. Sans cette
// declaration, le prompt envoyait "Barre avant : plate_h" a un pilote
// Sodikart tout en lui disant que son chassis n'a pas de barre : instruction
// contradictoire, donc diagnostic peu fiable.
// Cle = nom du champ dans le formulaire, valeur = ce qui le remplace.
const OTK_SPEC = {
  group: "OTK",
  leviersAbsents: {}, // tous les leviers du formulaire existent sur OTK
  modeles: {
    "Racer 401 RR": "tubes de cadre Ø32 mm. Décliné en monorapport (OK, OKJ), shifter (KZ) et DD2. Carénage M10. Sorti en 2022 [OK 2026-07]",
    "Racer 401 S": "évolution de la gamme, diamètre de cadre différent du 401 RR (le RR se distingue justement par ses Ø32 mm). Supports de plancher de section plus large que sur le RR [OK 2026-07]",
    "Racer 401 T": "génération la plus récente : carénages M11, systèmes de freinage BWD et BWZ [OK 2026-07]",
    TDX: "modèle récent de la gamme Tony Kart [OK 2026-07]",
  },
  // Ordre d'essai des leviers [CD] : c'est l'ordre réel de travail de Clément
  leverPriority: ["voieAr", "pressions", "barre", "chasse", "parechocs", "voieAv"],
  barreAv: "présente sur TOUS les OTK. Réglage standard = barre plate HORIZONTALE [CD]",
  geometrie: "caster/camber par rondelle excentrique multi-position (king pin washers). Neutre = flèches haut+bas vers l'avant [OK]",
  comportement:
    "front-biased : beaucoup d'avant, très réactif, freinage incisif. Très polyvalent : 'tu peux le poser et rouler vite directement', peu de mise au point nécessaire [CD]",
  pieges: [
    "Sur piste froide, l'avant est déjà très vif : éviter de sur-rigidifier l'avant, ça rend l'arrière nerveux [?]",
    "Barre plus rigide = +grip avant et kart plus réactif en milieu de virage, MAIS peut créer du slide arrière [OK]",
    "La qualité d'un exemplaire individuel compte : un 2e châssis OTK identique peut être mauvais [CD]",
  ],
  terminologie: "terminologie native du formulaire (barre ronde/plate, voie AV en bagues, voie AR en cm, arbres dur/medium/tendre)",
};

const CHASSIS_SPECS = {
  "Tony Kart": Object.assign({}, OTK_SPEC, { label: "Tony Kart (OTK)" }),
  Kosmic: Object.assign({}, OTK_SPEC, {
    label: "Kosmic (OTK)",
    comportement: OTK_SPEC.comportement + ". Direction parfois ressentie plus vive selon les modèles [?]",
  }),
  Exprit: Object.assign({}, OTK_SPEC, {
    label: "Exprit (OTK)",
    comportement: OTK_SPEC.comportement + ". Réputé stable en courbes rapides [?]",
  }),
  "FA Kart": Object.assign({}, OTK_SPEC, { label: "FA Kart (OTK)" }),
  EOS: Object.assign({}, OTK_SPEC, {
    label: "EOS (OTK)",
    comportement: OTK_SPEC.comportement + ". Orienté rotation [?]",
  }),

  CRG: {
    group: "CRG",
    label: "CRG",
    leverPriority: ["voieAr", "barre", "chasse", "pressions", "voieAv"],
    modeles: {
      KT2: "Ø30 mm CrMo. Monorapport (OK, OKJ, Rotax, X30, Rok), KZ en option avec kit boîte. Réputé facile à marier avec tous types de pneus et à régler simplement. Plus de grip AVANT que le Heron [OK 2026-07]",
      KT4: "mix Ø30 et Ø32 mm. Excellent grip latéral, positionné à mi-chemin entre un 30 et un 32. Particulièrement bon sur pistes GLISSANTES et peu gommées. Sa place naturelle est le monorapport [OK 2026-07]",
      KT5: "corps Ø30 mm, Ø32 mm dans la zone des fusées avant. Très précis à l'AVANT, apprécié des pilotes qui recherchent ce trait [OK 2026-07]",
      "Road Rebel": "Ø32 mm CrMo. Orienté SHIFTER (KZ, KZ2) mais aussi Rotax, X30, Rok. Points forts : freinage, motricité, grip latéral. Polyvalent en hiver et à bas grip. Version DD possible, sans freins avant [OK 2026-07]",
      "Black Mirror": "Ø28 mm CrMo. Catégories MINI. Très bon équilibre de base en réglage standard, permet à un pilote peu expérimenté d'être immédiatement à l'aise [OK 2026-07]",
      Heron: "Ø30 mm, géométrie particulière en partie centrale. Plus de grip ARRIÈRE que le KT2 [OK 2026-07]",
    },
    barreAv: "barre de torsion tubulaire. Partie plate HORIZONTALE = flexible, tournée VERTICALE = beaucoup plus rigide [OK]",
    geometrie: "caster/camber baseline = II en haut / II en bas aux fusées. Voie avant 45,5\" à 46\". Pare-chocs AVANT TOUJOURS serré [OK]",
    comportement:
      "châssis très réactif aux petits changements. Barre installée = plus de grip arrière (le châssis lève moins la roue intérieure, redescend et accélère plus tôt) [OK]",
    pieges: [
      "Voie arrière : règle CRG = aussi large que le règlement le permet, grip max vers 54\". Passer aux moyeux COURTS avant de descendre sous 54.5\", par incréments de 1/8\" [OK]",
      "Correction sous-virage CRG : écarter d'1 spacer sur les 2 fusées ; si l'avant devient trop large, revenir et passer caster/camber de II/II vers II/III ou III/III, puis re-vérifier le pincement [OK]",
      "Châssis trop soft = moins de grip, mais trop ferme ne performe plus : il existe un point de rendement décroissant [OK]",
    ],
    terminologie: "voie AV parfois exprimée en mm ou en pouces, spacers par 1/8\". Convertir avant de conseiller.",
  },

  "Birel ART": {
    group: "Birel ART",
    label: "Birel ART",
    leverPriority: ["pressions", "voieAr", "voieAv", "chasse", "arbre"],
    modeles: {
      "RY30": "gamme tout Ø30 mm (RY30-S12 à S18 selon millésime). Monorapport OK / OKJ et shifter selon version [OK 2026-07]",
      "RY32": "gamme tout Ø32 mm, épaisseur 2 mm (RY32-S16, S18...). Structure plus rigide, spécifique shifter à l'origine, déclinée aussi en DD / OK / OKJ. Le S18 2025 apporte de nouvelles fusées, une nouvelle géométrie de direction et un répartiteur de freinage revu [OK 2026-07]",
      "AM29": "châssis dédié aux moteurs 4 TEMPS. Recherche d'équilibre dynamique et de polyvalence [OK 2026-07]",
    },
    barreAv: "système de pré-charge avant selon modèles : 'sans barre' ≈ pré-charge libre, 'plate verticale' ≈ pré-charge max [?]",
    geometrie: "solution tube 32 mm = structure plus rigide, meilleures traction et grip [OK]",
    comportement:
      "fenêtre de réglage tolérante et prévisible, facile à travailler sur une large plage de grip. Très bon grip latéral de l'axe arrière, bonne stabilité au freinage, kart qui reste libre. Fort sur grip medium [OK][CD]",
    pieges: [
      "Récompense les inputs SMOOTH : un pilote brutal n'en tire rien [OK]",
      "Très sensible aux pressions pneus : commencer par là avant de toucher au châssis [?]",
      "Point fort sous forte chaleur : tient mieux quand d'autres décrochent. À exploiter plutôt qu'à corriger [CD]",
    ],
    terminologie: "setup haut grip Birel = axe avant court (~1000 mm) + arrière large (~1400 mm) [OK]",
  },

  Sodikart: {
    group: "Sodikart",
    label: "Sodikart (Sigma)",
    leverPriority: ["voieAr", "pressions", "chasse", "arbre", "parechocs"],
    // Le Sigma n'a pas de barre de torsion avant classique : le reglage avant
    // passe par la bague excentrique, donc par chasse et carrossage.
    leviersAbsents: {
      barre:
        "le Sigma n'a PAS de barre de torsion avant. Le reglage du train avant passe par la BAGUE EXCENTRIQUE (chasse en haut, carrossage en bas). Ignore la valeur du champ 'barre' et ne propose jamais de la modifier : agis sur la chasse ou le carrossage a la place",
    },
    modeles: {
      "Sigma RS3":
        "⚠️ C'EST LE MODÈLE DES CATÉGORIES ROTAX / X30 / OK. Développé spécifiquement pour les gommes de dureté MEDIUM. Avant de châssis redessiné pour augmenter la performance et faciliter l'ENTRÉE en courbe. Système de freinage plus sensible et progressif, réglable sur 2 à 4 positions [OK 2026-07]",
      "Sigma KZ":
        "modèle SHIFTER. Freinage hydraulique avant + arrière à étrier 4 pistons, avant du cadre redessiné pour améliorer l'entrée en courbe. Champion du monde KZ 2025 [OK 2026-07]",
      "Sigma DD2": "déclinaison pour la catégorie Rotax DD2 [OK 2026-07]",
    },
    barreAv:
      "⚠️ Sur Sigma, la géométrie avant passe par une BAGUE EXCENTRIQUE 4+ positions (haut = caster, bas = camber), pas par une barre de torsion classique comme chez OTK. Ne pas raisonner en 'barre plate horizontale/verticale' avec un pilote Sodikart : ce n'est pas son vocabulaire [OK]",
    geometrie:
      "bague excentrique avant 4+ positions. Tubes Ø30 mm partout (choix assumé). Frein réglable sur 2 à 4 positions [OK]",
    comportement:
      "philosophie Sigma : un setup de base volontairement polyvalent + de PETITS ajustements à fort impact. Le Sigma moderne (2023-2025) est performant dans TOUTES les conditions, développé sur circuits internationaux, très compétitif en KZ [OK]",
    pieges: [
      "⚠️ NE PAS transmettre le ressenti 'flou/flottant' du Sodikart 2019 : il est OBSOLÈTE. Le Sigma moderne est une référence, pas un châssis capricieux [CD]",
      "Le Sodikart accepte mieux la glisse et perd moins de temps en glissant que d'autres marques : ne pas corriger une micro-glisse qui, sur ce châssis, est normale et rapide [CD]",
      "Petits ajustements à fort impact : proposer des pas PLUS FINS que sur OTK. Un changement large peut faire dépasser la fenêtre [OK]",
      "Le tube lui-même flexe peu ; ce sont les pièces autour qui travaillent. Les leviers périphériques (pare-chocs, paliers, moyeux) comptent proportionnellement plus [CD]",
      "⚠️ Un pilote Rotax ou X30 sur Sodikart roule normalement en Sigma RS3, PAS en Sigma KZ. Si le modèle n'est pas précisé, le demander avant de conseiller : le RS3 est calibré pour les gommes medium et son avant est spécifiquement conçu pour l'entrée en courbe [OK 2026-07]",
      "Le frein Sigma est réglable sur 2 à 4 positions : c'est un levier réel sur ce châssis, à ne pas oublier face à un problème d'entrée de virage [OK 2026-07]",
    ],
    terminologie:
      "platine arrière gérée via la voie AR. Parler de 'bague excentrique' et de 'positions', pas de 'crans de barre'.",
  },

  Parolin: {
    group: "Parolin",
    label: "Parolin",
    leverPriority: ["chasse", "voieAr", "pressions", "voieAv", "arbre"],
    barreAv: "systèmes propriétaires : 'Easy Caster System' (caster et camber réglables indépendamment et rapidement) [OK]",
    geometrie:
      "Easy Caster System + support de colonne de direction réglable (angle Ackermann modifiable selon circuit et style) + cassette de palier d'axe arrière à 4 vis pour la hauteur [OK]",
    comportement:
      "adaptabilité supérieure à toutes conditions de grip (forme du cadre + type de tubes). Souvent souple, privilégie la rotation [OK]",
    modeles: {
      "Le Mans": "monorapport / TAG : Rotax, X30, OK. Tubes CrMo Ø30 mm, sauf la traverse AVANT en Ø32 mm. Vainqueur du Championnat d'Europe FIA OK 2025 [OK 2026-07]",
      Invader: "catégories SHIFTER (KZ). Tubes Ø32 mm sur tout le cadre, épaisseur 2 mm [OK 2026-07]",
      Opportunity: "⚠️ châssis CADET / MINI (pilotes 7 à 12 ans), tubes Ø28 mm. Ne JAMAIS le proposer comme alternative à un pilote adulte [OK 2026-07]",
    },
    pieges: [
      "⚠️ Ne pas confondre les modèles : Le Mans = monorapport adulte (Ø30), Invader = shifter (Ø32), Opportunity = CADET/MINI (Ø28). L'Opportunity n'est pas une variante polyvalente pour senior [OK 2026-07]",
      "L'angle d'Ackermann est un levier réel sur Parolin : inexistant chez la plupart des concurrents [OK]",
    ],
    terminologie: "parler de 'Easy Caster', de 'cassette de palier', d'angle Ackermann.",
  },

  "Kart Republic": {
    group: "Kart Republic",
    label: "Kart Republic (KR)",
    leverPriority: ["voieAr", "pressions", "chasse", "voieAv"],
    modeles: {
      KR2: "monorapport, mix Ø30 et Ø32 mm, empattement 1050 mm. Couvre toutes les catégories monorapport, du KA100 au Rotax et X30 jusqu'à l'OK. Permet d'être agressif au maximum tout en restant précis au millimètre : demande un pilotage méticuleux et propre [OK 2026-07]",
      KR1: "modèle shifter de la gamme [OK 2026-07]",
      KR3: "modèle de la gamme KR [OK 2026-07]",
    },
    barreAv: "terminologie 'TUBE' avant et non 'barre'. Garder la logique souplesse/rigidité [?]",
    geometrie: "KR2 : mix de tubes 30 mm et 32 mm, couvre toutes les catégories monorapport (KA100 → Rotax/X30 → OK) [OK]",
    comportement:
      "facile à régler, s'adapte bien à tous circuits et tous pneus. Se conduit avec une GLISSE CONTRÔLÉE : style de pilotage légèrement différent [OK][CD]",
    pieges: [
      "La glisse maîtrisée fait partie du fonctionnement du châssis : ne pas la diagnostiquer systématiquement comme un survirage à corriger [CD]",
    ],
    terminologie: "dire 'tube avant' et non 'barre avant'.",
  },
};

// Marques sans data fine sourcée : physique générale + demander la terminologie
const CHASSIS_GENERIC = {
  group: "générique",
  leverPriority: ["pressions", "voieAr", "chasse", "voieAv", "arbre"],
  barreAv: "à confirmer avec le pilote : la terminologie varie selon la marque [?]",
  geometrie: "non documentée précisément pour cette marque",
  comportement: "marque établie, données fines non sourcées. Appliquer la physique générale du kart [?]",
  pieges: [
    "NE PAS inventer de spécificités pour cette marque. Appliquer les principes universels et inviter le pilote à décrire sa terminologie dans 'Notes libres'.",
  ],
  terminologie: "demander au pilote sa terminologie si un réglage est ambigu.",
};

// Groupe IPK : Praga Kart, Formula K, OK1 et RS Kart sortent de la MÊME usine
// et partagent les mêmes modèles de châssis. Les traiter séparément revenait à
// ignorer une donnée structurante, exactement comme pour le groupe OTK.
const IPK_SPEC = {
  group: "IPK",
  leverPriority: ["voieAr", "pressions", "chasse", "voieAv", "arbre"],
  modeles: {
    "Dragon Evo 3": "tout Ø30 mm [OK 2026-07]",
    "Fighter Evo": "mix Ø30 et Ø32 mm [OK 2026-07]",
    "Invictus Evo": "tout Ø32 mm [OK 2026-07]",
    "Monster Evo 3": "cadet, Ø28 mm. Catégories MINI uniquement [OK 2026-07]",
  },
  versions:
    "Dragon et Fighter existent en trois versions Junior et Senior : XS1 (recommandée SHIFTER), XS3 (recommandée TAG) et DD2 (développée spécifiquement pour la série Rotax DD2). Demander la version avant de conseiller : elle change la logique [OK 2026-07]",
  barreAv: "terminologie à confirmer avec le pilote [?]",
  geometrie: "pédalier multi-réglable IPK, avec support de réglage en hauteur du câble d'accélérateur [OK 2026-07]",
  comportement:
    "gamme complète couvrant du cadet au shifter. Data comportementale fine non sourcée : appliquer la physique générale et le diamètre de tube du modèle [?]",
  pieges: [
    "Praga Kart, Formula K, OK1 et RS Kart sont le MÊME châssis sous quatre marques (groupe IPK). Ne pas raisonner comme s'il s'agissait de constructeurs différents [OK 2026-07]",
    "Le diamètre de tube du modèle est l'information la plus exploitable : Ø30 = plus de flex et de rotation, Ø32 = plus rigide, plus de traction et de grip [OK]",
  ],
  terminologie: "demander la version exacte (XS1 shifter / XS3 TAG / DD2) en plus du modèle.",
};

["Praga", "IPK"].forEach((m) => {
  CHASSIS_SPECS[m] = Object.assign({}, IPK_SPEC, { label: m + " (groupe IPK)" });
});

["Energy Corse", "Maranello", "Top Kart", "Zanardi", "Autre"].forEach((m) => {
  CHASSIS_SPECS[m] = Object.assign({}, CHASSIS_GENERIC, { label: m });
});

// Maranello : seule précision sourcée disponible
CHASSIS_SPECS["Maranello"].comportement =
  "spécialiste des châssis KZ (gammes MK1, MK3, MK4), composants réputés faciles à régler. Data comportementale fine non sourcée [OK 2026-07]";

// --- MOTEURS ---------------------------------------------------------------

const ENGINE_SPECS = {
  direct_drive: {
    label: "Direct Drive (monorapport)",
    transmission: "couronne + pignon. Le rapport = couronne ÷ pignon. 1 dent de couronne ≈ 200 à 300 tr/min en bout de ligne droite [OK]",
    // ⚠️ La famille direct_drive couvre des moteurs aux carbus très différents :
    // le X30 s'affine EN PISTE (vis high/low), le Rotax a un gicleur FIXE qu'on
    // ne change qu'à l'arrêt. Confondre les deux est un contresens repérable.
    carburation:
      "dépend du MODÈLE : voir les précisions moteur ci-dessous. Ne jamais supposer qu'un carbu est ajustable en roulant sans l'avoir vérifié dans ces précisions.",
    voieArBaseline: 140,
    leviersDispo: ["couronne", "pignon", "gicleur", "châssis complet"],
    leviersAbsents: ["rapports de boîte", "contre-pignon"],
    pilotage: null,
  },
  dd2: {
    label: "Rotax DD2 (boîte 2 vitesses automatique)",
    transmission: "couronne + contre-pignon, dont la somme fait TOUJOURS 100 [CD]",
    carburation: "gicleur fixe Rotax, ajusté selon la densité de l'air",
    voieArBaseline: 139,
    leviersDispo: ["couronne", "contre-pignon", "gicleur", "châssis complet"],
    leviersAbsents: ["pignon libre", "rapports de boîte"],
    pilotage:
      "inertie marquée en entrée de virage sur la 2e vitesse : 'point dur' et sensation de lourdeur en tournant sur la 2, contrairement au KZ. Plus rapide en ligne droite, sans doute plus coupleux en réaccélération. Freins ressentis moins efficaces que sur un KZ malgré les freins avant [CD]",
    note: "l'arbre DD2 a un diamètre plus petit mais est plus lourd que l'arbre Rotax Max → la voie arrière se règle différemment, référence ≈ 139 contre ≈ 140 sur Rotax [CD]",
  },
  kz_shifter: {
    label: "KZ Shifter (boîte 6 manuelle)",
    transmission: "boîte 6 séquentielle + embrayage. Couronne typiquement 70-80 dents, pignon 10-11 dents [OK]",
    carburation: "Dell'Orto VHSH 30 mm homologué : réglages slide height + position d'aiguille [OK]",
    voieArBaseline: 139,
    leviersDispo: ["couronne", "pignon", "rapports de boîte", "carburation Dell'Orto", "châssis complet"],
    leviersAbsents: [],
    pilotage:
      "frein avant + arrière. Le frein moteur (engine braking) est exploitable au rétrogradage : levier de pilotage absent des monorapports [OK]",
    note: "la cascade complète des 6 rapports se travaille avec le préparateur : donner le principe, pas les valeurs.",
  },
  "4t": {
    label: "4 temps réglementé (KA100 et assimilés)",
    transmission: "couronne uniquement",
    carburation:
      "⚠️ CARBURATION SCELLÉE PAR LE RÈGLEMENT. Aucun réglage de gicleur possible. Proposer un changement de gicleur est un contresens technique immédiatement repéré [OK]",
    voieArBaseline: 139.5,
    leviersDispo: ["couronne", "châssis complet"],
    leviersAbsents: ["gicleur", "carburation", "rapports de boîte"],
    pilotage: null,
  },
};

// Précisions par modèle de moteur (au-delà de la famille)
const ENGINE_MODEL_NOTES = {
  "Rotax Max": {
    puissance: "125cc 2T, ~30 ch [OK]",
    carbu: "gicleur FIXE non ajustable en roulant, moteur scellé usine (philosophie de parité). 2024+ EVO : gicleur stock #130, garder un jeu 124-136 [OK]",
    temperature: "température d'eau optimale ~140-150°F (sonde Mychron) [OK]",
    securite: "toujours jetter pour le pire cas : mieux légèrement riche que trop pauvre (risque de casse) [OK]",
    circuits: "délivrance mid-range à haute vitesse → compétitif sur circuits rapides à courbes fluides [OK]",
    pilotage:
      "⚠️ INSIGHT PILOTAGE MAJEUR : sur Rotax il faut DOSER la remise de gaz. Pied au plancher brutal = moteur engorgé (trop d'essence d'un coup). La remise de gaz doit être plus progressive que sur un X30. À intégrer systématiquement au coaching du point d'accélération d'un pilote Rotax [CD]",
    trajectoire:
      "Rotax = peu puissant, léger, linéaire → TRAJECTOIRE EN 'U' : freiner bien droit, optimiser le freinage en ligne droite, ENROULER le virage, garder un maximum de vitesse minimale, rouler sur l'inertie et la vitesse moyenne. Avec moins de puissance, on préserve la vitesse [CD]",
  },
  "Rotax Max Junior": {
    puissance: "version Junior du Rotax Max EVO",
    carbu: "gicleur fixe, même logique que le Senior",
    pilotage: "même exigence de dosage de la remise de gaz que le Senior [CD]",
    trajectoire: "trajectoire en 'U' comme le Senior : préserver la vitesse [CD]",
  },
  "X30 Senior": {
    puissance: "~28 ch [OK]",
    carbu:
      "carbu AJUSTABLE (Tillotson ou Tryton à membrane) : vis high speed + vis low speed + pop-off. Standard : low 1 à 1¼ tour, high 1¼ à 1½ tour, pop-off ~10 psi. Le pilote affine EN PISTE [OK]",
    temperature: "EGT recommandé 1050-1100°F [OK]",
    circuits: "fort couple bas et mi-régime → efficace sur circuits techniques et serrés [OK]",
    pilotage:
      "a un embrayage (aide au freinage tardif). Réponse permissive : on peut mettre le pied à fond directement sans gêner le moteur : contrairement au Rotax [CD]",
  },
  "X30 Junior": { carbu: "carbu ajustable, même logique que le Senior", circuits: "couple bas régime, circuits techniques [OK]" },
  "X30 Mini": { carbu: "carbu ajustable", circuits: "puissance réduite, réglages limités [?]" },
  OK: {
    puissance: "125cc reed valve, ~35 ch, limite ~15 000 tr/min [OK]",
    pilotage:
      "⚠️ DIRECT DRIVE SANS EMBRAYAGE : contrairement au X30, pas de point mort à bas régime. Le pilote doit adapter son style avec des TRAJECTOIRES PLUS LARGES et garder la vitesse : il ne peut pas se permettre de trop ralentir [OK]",
  },
  "OK-J": { pilotage: "sans embrayage, trajectoires plus larges, garder la vitesse [OK]" },
  KA100: {
    carbu: "⚠️ souvent traité comme carburation FIXE en compétition mono-marque. Vérifier le règlement local avant tout conseil carbu [?]",
  },
  "Rok GP Senior": { puissance: "~36 ch selon une source : potentiellement plus puissant que X30 et Rotax [OK]" },
  "Rok GP Junior": { puissance: "famille Vortex Rok, variante Junior [?]" },
  "Mini Swift": { puissance: "petit moteur catégorie jeune, puissance réduite, réglages limités [?]" },
  "Micro Swift": { puissance: "petit moteur catégorie jeune, puissance réduite, réglages limités [?]" },
  "KZ Vortex": { note: "Vortex suit bien l'écosystème OTK et les pilotes ROK [OK]" },
  "KZ TM": { note: "TM KZ-R2, motoriste KZ2 majeur [OK]" },
  "KZ IAME": { note: "IAME Screamer III [OK]" },
  "KZ Modena": { note: "Modena KK3 [OK]" },
};

// Normalisation : toute marque sans declaration explicite est reputee
// disposer de TOUS les leviers du formulaire. Evite un "undefined" silencieux
// au moment de construire le prompt.
Object.values(CHASSIS_SPECS).forEach((s) => {
  if (!s.leviersAbsents) s.leviersAbsents = {};
});

// =============================================
// HIÉRARCHIE DES LEVIERS
// =============================================
// Tous les réglages ne se valent pas. Un ingénieur de course commence par ce
// qui est rapide à faire, réversible et à fort effet, et ne descend vers le
// peaufinage que si le problème persiste. Sans cette hiérarchie, l'IA propose
// un réglage de géométrie fine là où un demi-tour de valve suffisait.
const LEVER_TIERS = [
  {
    tier: 1,
    nom: "RAPIDE ET À FORT EFFET, à essayer en premier",
    delai: "quelques minutes au stand, réversible immédiatement",
    leviers: ["pressions pneus", "voie arrière", "barre avant (si le châssis en a une)"],
    note: "Ces trois leviers couvrent la majorité des problèmes de comportement. Un pilote peut les changer entre deux relais.",
  },
  {
    tier: 2,
    nom: "STRUCTURANT, à essayer si le tier 1 ne suffit pas",
    delai: "10 à 20 minutes, nécessite de l'outillage",
    leviers: ["chasse", "carrossage", "voie avant", "pare-chocs arrière", "rigidité d'arbre"],
    note: "Effet réel mais plus lent à tester. Un seul à la fois, sinon le verdict est illisible.",
  },
  {
    tier: 3,
    nom: "PEAUFINAGE, en dernier",
    delai: "effet fin ou changement long",
    leviers: ["longueur d'arbre", "moyeux", "garde au sol", "pincement"],
    note: "On y descend quand le comportement est déjà proche et qu'il reste à affiner.",
  },
];

// Réglages qui existent, que l'IA doit CONNAÎTRE pour comprendre le kart,
// mais qu'elle ne doit jamais proposer de changer en session.
const REGLAGES_HORS_SESSION = {
  "position et hauteur de siège":
    "positionnée au montage du châssis, aux cotes du constructeur. Levier de répartition de masse très puissant, mais on ne déplace pas un siège entre deux relais. Sert à EXPLIQUER un comportement, pas à le corriger aujourd'hui.",
  lestage:
    "calé sur le poids du pilote pour atteindre le minimum de la catégorie. Se vérifie à la pesée, pas en cours de session.",
};

function buildLeverHierarchyBlock(chassis) {
  const lines = ["\nHIÉRARCHIE DES LEVIERS (ordre de travail d'un ingénieur de course)"];
  lines.push("=================================================================");
  LEVER_TIERS.forEach((t) => {
    lines.push(`\nTIER ${t.tier} : ${t.nom}`);
    lines.push(`  Leviers : ${t.leviers.join(", ")}`);
    lines.push(`  Délai : ${t.delai}`);
    lines.push(`  ${t.note}`);
  });
  lines.push("\nHORS SESSION (à connaître, à ne JAMAIS proposer comme action du jour) :");
  Object.entries(REGLAGES_HORS_SESSION).forEach(([k, v]) => lines.push(`  · ${k} : ${v}`));

  lines.push(
    "\n→ Propose TOUJOURS le levier le plus haut dans cette hiérarchie qui traite réellement le problème. Ne descends au tier suivant que si les leviers du tier au-dessus sont indisponibles (en butée, absents de ce châssis) ou déjà exploités."
  );
  if (chassis && chassis.leverPriority) {
    lines.push(
      `→ À tier égal, l'ordre propre à cette marque prime : ${chassis.leverPriority.join(" puis ")}.`
    );
  }
  return lines.join("\n");
}

// --- CONSTRUCTION DU BLOC INJECTÉ DANS LE PROMPT ---------------------------

function getChassisSpec(chassis) {
  return CHASSIS_SPECS[chassis] || null;
}

function getEngineSpec(family) {
  return ENGINE_SPECS[family] || ENGINE_SPECS.direct_drive;
}

/**
 * Produit le bloc de spécifications matériel injecté dans le system prompt.
 * C'est CE bloc qui fait qu'un Sodikart × Rotax ne reçoit pas le même
 * diagnostic qu'un Tony Kart × X30.
 */
function buildKartSpecBlock(context) {
  if (!context) return "";
  const chassisName = context.chassis || "";
  const chassis = getChassisSpec(chassisName);
  const family = context.moteur_family || "direct_drive";
  const engine = getEngineSpec(family);
  const modelNotes = ENGINE_MODEL_NOTES[context.moteur] || null;

  const lines = [];
  lines.push("\nFICHE MATÉRIEL DE CE PILOTE : À APPLIQUER IMPÉRATIVEMENT");
  lines.push("========================================================");
  lines.push(
    "Ce bloc décrit LE kart exact de ce pilote. Deux karts différents ne peuvent pas recevoir le même diagnostic : si ton analyse resterait valable en changeant de châssis, c'est qu'elle est trop générique. Recommence."
  );

  // --- Châssis ---
  if (chassis) {
    const modele = (context.chassisModele || "").trim();
    const annee = context.chassisAnnee || "";
    lines.push(`\n### CHÂSSIS : ${chassis.label}${modele ? " " + modele : ""}${annee ? " (millésime " + (annee === "anterieur" ? "2021 ou antérieur" : annee) + ")" : ""}`);

    // Fiche du modèle exact si le pilote l'a renseigné et qu'on la connaît
    if (chassis.modeles) {
      // Une saisie partielle ("Sigma") peut correspondre à plusieurs modèles
      // ("Sigma RS3", "Sigma KZ", "Sigma DD2"). Dans ce cas on ne tranche pas :
      // se tromper de modèle serait pire que de poser la question.
      const norm = (s) => s.toLowerCase().replace(/[\s\-_]/g, "");
      const n = norm(modele);
      const matches = n
        ? Object.keys(chassis.modeles).filter((k) => norm(k).includes(n) || n.includes(norm(k)))
        : [];

      if (matches.length === 1) {
        lines.push(`- ⭐ MODÈLE IDENTIFIÉ, ${matches[0]} : ${chassis.modeles[matches[0]]}`);
        lines.push("  Ces caractéristiques de modèle priment sur les généralités de marque.");
      } else if (matches.length > 1) {
        lines.push(`- ⚠️ SAISIE AMBIGUË : "${modele}" correspond à plusieurs modèles de cette marque :`);
        matches.forEach((k) => lines.push(`  · ${k} : ${chassis.modeles[k]}`));
        lines.push(
          "  DEMANDE au pilote lequel il utilise avant tout conseil qui dépend du modèle. Ne choisis pas à sa place."
        );
      } else {
        lines.push(`- Modèles connus de cette marque : ${Object.keys(chassis.modeles).join(", ")}.`);
        lines.push(
          modele
            ? `  Le pilote a saisi "${modele}", que tu ne trouves pas dans cette liste : ne suppose rien sur ce modèle précis et dis-le honnêtement.`
            : "  Le pilote n'a pas précisé son modèle. Si le conseil en dépend, demande-le : les modèles d'une même marque n'ont ni le même diamètre de tube ni la même vocation."
        );
      }
    }
    if (chassis.versions) lines.push(`- Versions : ${chassis.versions}`);

    // Le matériel ancien ne doit pas recevoir les données des millésimes récents
    if (annee === "anterieur") {
      lines.push(
        "- ⚠️ CHÂSSIS DE 2021 OU ANTÉRIEUR : les données ci-dessous décrivent les millésimes récents. Signale au pilote que son châssis peut se comporter différemment, et reste sur la physique générale plutôt que sur des spécificités de modèle récent."
      );
    }

    lines.push(`- Comportement caractéristique : ${chassis.comportement}`);
    lines.push(`- Train avant : ${chassis.barreAv}`);
    lines.push(`- Géométrie : ${chassis.geometrie}`);
    lines.push(`- Terminologie à employer : ${chassis.terminologie}`);
    lines.push(
      `- ORDRE DE PRIORITÉ DES LEVIERS sur cette marque : ${chassis.leverPriority.join(" → ")}. Commence par le premier levier disponible de cette liste, pas par un autre.`
    );
    // Leviers du formulaire qui n'existent pas sur ce chassis
    const absents = Object.entries(chassis.leviersAbsents || {});
    if (absents.length) {
      lines.push("- ⛔ LEVIERS DU FORMULAIRE QUI N'EXISTENT PAS SUR CE CHÂSSIS :");
      absents.forEach(([k, why]) => lines.push(`  · ${k} : ${why}`));
      lines.push(
        "  La valeur affichée plus bas pour ces réglages est un artefact du formulaire, pas une réalité de ce kart. Ne la commente pas, ne t'appuie pas dessus, et ne propose jamais de la modifier."
      );
    }

    if (chassis.pieges && chassis.pieges.length) {
      lines.push("- Pièges spécifiques à cette marque :");
      chassis.pieges.forEach((p) => lines.push(`  · ${p}`));
    }
  } else if (chassisName) {
    lines.push(`\n### CHÂSSIS : ${chassisName} (non répertorié)`);
    lines.push("- Applique la physique générale du kart. N'invente AUCUNE spécificité de marque.");
    lines.push("- Demande au pilote de décrire sa terminologie si un réglage est ambigu.");
  } else {
    lines.push("\n### CHÂSSIS : non renseigné");
    lines.push("- Demande la marque avant de donner un conseil de réglage châssis précis.");
  }

  // --- Moteur ---
  lines.push(`\n### MOTEUR : ${context.moteur || "non renseigné"} : famille ${engine.label}`);
  lines.push(`- Transmission : ${engine.transmission}`);
  lines.push(`- Carburation : ${engine.carburation}`);
  lines.push(`- Leviers DISPONIBLES sur ce moteur : ${engine.leviersDispo.join(", ")}`);
  if (engine.leviersAbsents.length) {
    lines.push(
      `- ⛔ Leviers INEXISTANTS sur ce moteur, ne JAMAIS les proposer : ${engine.leviersAbsents.join(", ")}`
    );
  }
  if (engine.pilotage) lines.push(`- Conséquence pilotage : ${engine.pilotage}`);
  if (engine.note) lines.push(`- À savoir : ${engine.note}`);
  lines.push(
    `- Référence de voie arrière pour cette famille : ≈ ${engine.voieArBaseline} (valeur de départ, pas une obligation)`
  );

  if (modelNotes) {
    lines.push(`\n### PRÉCISIONS SUR LE ${(context.moteur || "").toUpperCase()}`);
    Object.entries(modelNotes).forEach(([k, v]) => lines.push(`- ${k} : ${v}`));
  }

  // --- Croisement ---
  lines.push("\n### RÈGLE DE CROISEMENT");
  lines.push(
    "Croise TOUJOURS châssis × moteur × conditions × style pilote avant de conclure. Un même symptôme n'a pas la même cause principale sur deux karts différents, et le levier à bouger en premier dépend de la marque (voir l'ordre de priorité ci-dessus)."
  );
  lines.push(
    "Cite explicitement le châssis et le moteur dans ton diagnostic, pour que le pilote voie que l'analyse est calibrée sur SON matériel."
  );

  lines.push(buildLeverHierarchyBlock(chassis));

  return lines.join("\n");
}

// Leviers indisponibles pour ce contexte : consomme par sanitizeApply pour
// refuser un reglage que le kart ne possede pas.
function getLeviersAbsents(context) {
  const c = getChassisSpec(context && context.chassis);
  return c && c.leviersAbsents ? Object.keys(c.leviersAbsents) : [];
}

module.exports = {
  CHASSIS_SPECS,
  LEVER_TIERS,
  getLeviersAbsents,
  ENGINE_SPECS,
  ENGINE_MODEL_NOTES,
  getChassisSpec,
  getEngineSpec,
  buildKartSpecBlock,
};
