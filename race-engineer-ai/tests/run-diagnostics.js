#!/usr/bin/env node
/* =============================================
 * Harnais de regression du diagnostic
 * =============================================
 * Lance chaque cas de tests/cas-de-reference.json contre le VRAI modele et
 * verifie la reponse. Transforme "je crois que c'est bon" en un pourcentage.
 *
 * Usage :
 *   ANTHROPIC_API_KEY=sk-ant-... node tests/run-diagnostics.js
 *   node tests/run-diagnostics.js --cas 1        (un seul cas)
 *   node tests/run-diagnostics.js --verbeux      (affiche les reponses)
 *
 * Ce que ce harnais peut prouver : que les contraintes structurelles tiennent
 * (pas de levier inexistant, pas de reglage hors plage, silence sur les
 * butees, frontiere ingenieur/coach respectee).
 *
 * Ce qu'il ne peut PAS prouver : que le diagnostic est le bon. Seul un pilote
 * experimente peut juger ca, en relisant les sorties une par une.
 * ============================================= */

const fs = require("fs");
const path = require("path");

process.env.ALLOW_ANON_CHAT = "true"; // pas d'auth Supabase dans le harnais

const { handler } = require("../netlify/functions/chat.js");

const CAS = JSON.parse(fs.readFileSync(path.join(__dirname, "cas-de-reference.json"), "utf-8")).cas;
const args = process.argv.slice(2);
const verbeux = args.includes("--verbeux");
const seul = args.includes("--cas") ? parseInt(args[args.indexOf("--cas") + 1], 10) : null;

const RANG_CONFIANCE = { faible: 0, moyenne: 1, haute: 2 };

// Termes qui signalent un renvoi vers du coaching humain
const MARQUEURS_COACH = [
  "coach", "pilotage", "se travaille", "en roulant", "regularite", "régularité",
  "constance", "pilote experimente", "pilote expérimenté",
];

function texteComplet(d) {
  return [d.titre, d.lecture, d.pilotage, d.cause, d.action, d.pourquoi, d.aObserver]
    .filter(Boolean).join(" ").toLowerCase();
}

async function lancerCas(cas, index) {
  const echecs = [];
  const alertes = [];

  const res = await handler({
    httpMethod: "POST",
    headers: {},
    body: JSON.stringify({ mode: "diagnostic", context: cas.contexte }),
  });

  if (res.statusCode !== 200) {
    return { echecs: [`HTTP ${res.statusCode} : ${res.body.slice(0, 200)}`], alertes, diag: null };
  }

  const d = JSON.parse(res.body);
  const a = cas.attendu;
  const leviers = Object.keys(d.apply || {});
  const texte = texteComplet(d);

  // 1. Aucun levier interdit ne doit etre applique
  (a.levierInterdit || []).forEach((l) => {
    if (leviers.includes(l)) echecs.push(`levier interdit applique : ${l}`);
  });

  // 2. Si un levier est applique, il doit faire partie des leviers acceptables
  if (leviers.length > 0 && (a.levierParmi || []).length > 0) {
    const hors = leviers.filter((l) => !a.levierParmi.includes(l));
    if (hors.length) echecs.push(`levier hors liste acceptable : ${hors.join(", ")}`);
  }

  // 3. Aucun reglage propose quand la situation l'interdit (location, coach)
  if ((a.levierParmi || []).length === 0 && leviers.length > 0) {
    echecs.push(`un reglage a ete propose alors qu'aucun n'etait acceptable : ${leviers.join(", ")}`);
  }

  // 4. Un seul levier a la fois
  if (leviers.length > 1) echecs.push(`${leviers.length} leviers proposes, un seul est autorise`);

  // 5. Sens du reglage
  if (a.sens && leviers.length === 1) {
    const v = d.apply[leviers[0]];
    if (typeof v === "number") {
      if (a.sens === "augmenter" && v <= 0) echecs.push(`sens attendu : augmenter, obtenu ${v}`);
      if (a.sens === "reduire" && v >= 0) echecs.push(`sens attendu : reduire, obtenu ${v}`);
    }
  }

  // 6. Vocabulaire interdit (levier inexistant, terme d'une autre marque)
  (a.motsInterdits || []).forEach((m) => {
    if (texte.includes(m.toLowerCase())) echecs.push(`terme interdit present : "${m}"`);
  });

  // 6 bis. SECURITE : aucun chiffre de carburation prescrit, quel que soit le
  // moteur. Le champ "apply" est deja verrouille cote serveur, mais rien
  // n'empeche le modele d'ecrire un numero de gicleur dans sa prose. C'est le
  // seul reglage du kart ou une erreur detruit un moteur, donc c'est le seul
  // que le harnais verifie aussi dans le TEXTE. On cible la formulation
  // prescriptive (un verbe d'action pres d'un chiffre), pas la simple mention
  // de la valeur que le pilote a lui-meme saisie.
  const PRESCRIPTION_CARBU = [
    // Le negatif "(?!\s+mont)" evite de confondre une PRESCRIPTION avec le
    // libelle du formulaire, "Gicleur monte", qui precede toujours la valeur
    // que le pilote a lui-meme saisie.
    /(gicleur(?!\s+mont)|carbu\w*)[^.\n]{0,60}?(passe|mets|monte|descends|prends|essaie|remplace|vise|point de d[ée]part|plage)[^.\n]{0,20}?\d{2,3}/i,
    /(passe|mets|monte|descends|prends|essaie|remplace|vise)[^.\n]{0,40}?(gicleur|carbu\w*)[^.\n]{0,20}?\d{2,3}/i,
    /gicleur[^.\n]{0,15}\d{2,3}\s*(a|à|-|vers)\s*\d{2,3}/i,
  ];
  if (PRESCRIPTION_CARBU.some((re) => re.test(texte))) {
    echecs.push("chiffre de carburation prescrit dans le texte : la carburation est hors leviers");
  }

  // 6 ter. SECURITE : les freins peuvent etre EXPLIQUES, jamais prescrits.
  // "frein(?!age)" : le FREINAGE est une technique de pilotage, coeur du
  // produit, et "regle ton freinage" doit passer. Seul le FREIN, l'organe,
  // est concerne par la regle de securite.
  if (/(passe|mets|monte|descends|r[èe]gle|avance|recule)[^.\n]{0,30}(le\s+|les\s+|ton\s+|tes\s+)?frein(?!age)/i.test(texte)) {
    alertes.push("prescrit une intervention sur les freins : verifier la formulation");
  }

  // 7. Le diagnostic ne doit jamais expliquer qu'un reglage est en butee
  ["en butée", "en butee", "butée maximale", "impossible d'augmenter", "impossible de reduire"].forEach((m) => {
    if (texte.includes(m)) alertes.push(`explique une butee au pilote : "${m}"`);
  });

  // 8. Niveau de confiance honnete
  const rangObtenu = RANG_CONFIANCE[d.confiance];
  const rangMin = RANG_CONFIANCE[a.confianceMin];
  if (rangObtenu === undefined) echecs.push(`confiance absente ou invalide : ${d.confiance}`);
  else if (rangMin !== undefined && rangObtenu < rangMin) {
    alertes.push(`confiance ${d.confiance} sous le minimum attendu ${a.confianceMin}`);
  }

  // 9. Renvoi vers du coaching humain quand le probleme vient du pilote
  if (a.doitRenvoyerCoach) {
    const renvoie = MARQUEURS_COACH.some((m) => texte.includes(m));
    if (!renvoie) echecs.push("aurait du orienter vers le pilotage / un coach, ne l'a pas fait");
  }

  // 10. Champs obligatoires de la reponse
  ["titre", "cause", "aObserver"].forEach((c) => {
    if (!d[c]) echecs.push(`champ manquant dans la reponse : ${c}`);
  });

  return { echecs, alertes, diag: d };
}

(async () => {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("ANTHROPIC_API_KEY absente. Renseigne-la avant de lancer le harnais.");
    process.exit(1);
  }

  // ⚠️ --cas est indexe a partir de 1, comme l'aide en tete de fichier et comme
  // l'affichage "[3/7]". Il lisait CAS[seul], donc "--cas 4" testait en realite
  // le 5e cas : on debuggait un cas en croyant en tester un autre, et chaque
  // erreur coutait un appel API.
  const aTester = seul != null ? [CAS[seul - 1]].filter(Boolean) : CAS;
  if (seul != null && aTester.length === 0) {
    console.error(`Cas ${seul} inexistant. Numerote de 1 a ${CAS.length}.`);
    process.exit(1);
  }
  let ok = 0;
  const echecsGlobaux = [];

  console.log(`\nHarnais de regression du diagnostic : ${aTester.length} cas\n`);

  for (let i = 0; i < aTester.length; i++) {
    const cas = aTester[i];
    process.stdout.write(`[${i + 1}/${aTester.length}] ${cas.nom}\n`);

    let r;
    const debut = Date.now();
    try {
      r = await lancerCas(cas, i);
    } catch (e) {
      r = { echecs: [`exception : ${e.message}`], alertes: [], diag: null };
    }
    const duree = ((Date.now() - debut) / 1000).toFixed(1);

    if (r.echecs.length === 0) {
      ok++;
      console.log(`    OK  (${duree}s)`);
    } else {
      console.log(`    ECHEC (${duree}s)`);
      r.echecs.forEach((e) => console.log(`      - ${e}`));
      echecsGlobaux.push({ cas: cas.nom, echecs: r.echecs });
    }
    r.alertes.forEach((x) => console.log(`      ~ ${x}`));

    if (verbeux && r.diag) {
      console.log("      ---");
      ["titre", "lecture", "pilotage", "cause", "action", "pourquoi", "aObserver"].forEach((c) => {
        if (r.diag[c]) console.log(`      ${c} : ${r.diag[c]}`);
      });
      console.log(`      apply : ${JSON.stringify(r.diag.apply)}  confiance : ${r.diag.confiance}`);
      console.log("      ---");
    }
    console.log();
  }

  const pct = Math.round((ok / aTester.length) * 100);
  console.log(`Resultat : ${ok}/${aTester.length} cas conformes (${pct}%)\n`);

  if (echecsGlobaux.length) {
    console.log("A corriger :");
    echecsGlobaux.forEach((e) => console.log(`  ${e.cas}\n    ${e.echecs.join("\n    ")}`));
    console.log();
  }

  console.log("Rappel : ce harnais verifie les contraintes structurelles, pas la");
  console.log("justesse technique du diagnostic. Relis les sorties avec --verbeux");
  console.log("et fais-les valider par un pilote experimente.\n");

  process.exit(echecsGlobaux.length ? 1 : 0);
})();
