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

const OTK_SPEC = {
  group: "OTK",
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
    pieges: [
      "Le Mans (tubes CrMo Ø30 mm) est calibré pour grip MEDIUM ; l'Opportunity (Ø28 mm) est le polyvalent toutes conditions. Ne pas confondre les deux modèles [OK]",
      "L'angle d'Ackermann est un levier réel sur Parolin : inexistant chez la plupart des concurrents [OK]",
    ],
    terminologie: "parler de 'Easy Caster', de 'cassette de palier', d'angle Ackermann.",
  },

  "Kart Republic": {
    group: "Kart Republic",
    label: "Kart Republic (KR)",
    leverPriority: ["voieAr", "pressions", "chasse", "voieAv"],
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

["Praga", "Energy Corse", "Maranello", "IPK", "Top Kart", "Zanardi", "Autre"].forEach((m) => {
  CHASSIS_SPECS[m] = Object.assign({}, CHASSIS_GENERIC, { label: m });
});

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
    lines.push(`\n### CHÂSSIS : ${chassis.label}`);
    lines.push(`- Comportement caractéristique : ${chassis.comportement}`);
    lines.push(`- Train avant : ${chassis.barreAv}`);
    lines.push(`- Géométrie : ${chassis.geometrie}`);
    lines.push(`- Terminologie à employer : ${chassis.terminologie}`);
    lines.push(
      `- ORDRE DE PRIORITÉ DES LEVIERS sur cette marque : ${chassis.leverPriority.join(" → ")}. Commence par le premier levier disponible de cette liste, pas par un autre.`
    );
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

  return lines.join("\n");
}

module.exports = {
  CHASSIS_SPECS,
  ENGINE_SPECS,
  ENGINE_MODEL_NOTES,
  getChassisSpec,
  getEngineSpec,
  buildKartSpecBlock,
};
