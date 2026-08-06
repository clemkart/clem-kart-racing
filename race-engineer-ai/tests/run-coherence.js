#!/usr/bin/env node
/* =============================================
 * Coherence navigateur <-> serveur
 * =============================================
 * Plusieurs valeurs vivent EN DOUBLE dans index.html et dans les functions
 * Netlify. Le code le signale par des commentaires "⚠️ doit rester aligne",
 * mais rien ne le VERIFIAIT : il suffisait qu'un des deux cotes bouge pour que
 * l'app affiche une chose et que l'IA en dise une autre, sur le meme ecran.
 *
 * Ce harnais ne fait AUCUN appel d'API. Il est gratuit et instantane :
 * a lancer a chaque modification d'un reglage, d'un symptome ou d'une marque.
 *
 * Usage : npm run test:coherence
 * ============================================= */
const fs = require("fs");
const path = require("path");

const RACINE = path.join(__dirname, "..");
const html = fs.readFileSync(path.join(RACINE, "index.html"), "utf-8");
const chatJs = fs.readFileSync(path.join(RACINE, "netlify/functions/chat.js"), "utf-8");
const kartSpecs = require(path.join(RACINE, "netlify/functions/kart-specs.js"));

let echecs = 0, controles = 0;
function verifie(nom, ok, detail) {
  controles++;
  if (ok) return console.log("  OK   " + nom);
  echecs++;
  console.log("  ECHEC " + nom + (detail ? "\n         " + detail : ""));
}

// Extrait un litteral objet par comptage d'accolades, puis l'evalue. Plus sur
// qu'une expression reguliere : la valeur testee est celle que le navigateur
// lira vraiment, pas une approximation.
function litteral(source, ancre) {
  const debut = source.indexOf(ancre);
  if (debut < 0) return null;
  const ouvrante = source.indexOf("{", debut);
  let profondeur = 0, i = ouvrante;
  for (; i < source.length; i++) {
    if (source[i] === "{") profondeur++;
    else if (source[i] === "}" && --profondeur === 0) break;
  }
  try {
    // eslint-disable-next-line no-new-func
    return new Function("return " + source.slice(ouvrante, i + 1))();
  } catch (e) {
    return null;
  }
}

console.log("Coherence navigateur <-> serveur\n");

// --- 1. Butees de reglage ---------------------------------------------------
console.log("1. Butees de reglage (SETUP_LIMITS)");
const limFront = litteral(html, "const SETUP_LIMITS = {");
const limServeur = litteral(chatJs, "const SETUP_LIMITS = {");
verifie("les deux tables sont lisibles", !!limFront && !!limServeur);
if (limFront && limServeur) {
  const clesF = Object.keys(limFront).sort().join(",");
  const clesS = Object.keys(limServeur).sort().join(",");
  verifie("memes reglages des deux cotes", clesF === clesS, "front: " + clesF + "\n         serveur: " + clesS);
  for (const k of Object.keys(limServeur)) {
    if (!limFront[k]) continue;
    verifie(
      `${k} : memes bornes`,
      limFront[k].min === limServeur[k].min && limFront[k].max === limServeur[k].max,
      `front ${limFront[k].min}..${limFront[k].max}, serveur ${limServeur[k].min}..${limServeur[k].max}`
    );
  }
}

// --- 2. Symptomes -----------------------------------------------------------
console.log("\n2. Symptomes (SYMPTOM_LABELS / KB.diagnostics)");
const sympServeur = litteral(chatJs, "const SYMPTOM_LABELS = {");
const diagFront = litteral(html, "diagnostics: {");
if (sympServeur && diagFront) {
  const a = Object.keys(sympServeur).sort(), b = Object.keys(diagFront).sort();
  verifie("memes codes de symptome", a.join(",") === b.join(","),
    "serveur seul: " + a.filter(x => !b.includes(x)) + " | front seul: " + b.filter(x => !a.includes(x)));
} else verifie("les deux tables sont lisibles", false);

// --- 3. Marques de chassis --------------------------------------------------
console.log("\n3. Marques de chassis (CHASSIS_SPECS / <select>)");
const blocSelect = html.slice(html.indexOf('id="profil-chassis"'), html.indexOf("</select>", html.indexOf('id="profil-chassis"')));
const marquesFront = [...blocSelect.matchAll(/<option value="([^"]+)"/g)].map(m => m[1]).filter(Boolean);
const marquesServeur = Object.keys(kartSpecs.CHASSIS_SPECS);
const sansFiche = marquesFront.filter(m => !marquesServeur.includes(m));
const jamaisProposees = marquesServeur.filter(m => !marquesFront.includes(m));
verifie("toute marque proposee au pilote a une fiche serveur", sansFiche.length === 0,
  "sans fiche, le pilote recevra un diagnostic generique : " + sansFiche.join(", "));
verifie("aucune fiche serveur orpheline", jamaisProposees.length === 0,
  "jamais proposees dans le formulaire : " + jamaisProposees.join(", "));

// --- 4. Moteurs -------------------------------------------------------------
console.log("\n4. Moteurs (<select> / ENGINE_MODEL_NOTES)");
const blocMoteur = html.slice(html.indexOf('id="profil-moteur"'), html.indexOf("</select>", html.indexOf('id="profil-moteur"')));
const moteursFront = [...blocMoteur.matchAll(/<option value="([^"]+)"/g)].map(m => m[1]).filter((v) => v && v !== "Autre");
const sansNotes = moteursFront.filter(m => !kartSpecs.ENGINE_MODEL_NOTES[m]);
verifie("tout moteur proposable a une fiche moteur", sansNotes.length === 0,
  "sans precisions moteur : " + sansNotes.join(", "));

// --- 5. Chassis sans barre de torsion ---------------------------------------
console.log("\n5. Chassis sans barre (CHASSIS_SANS_BARRE / leviersAbsents)");
const sansBarreFront = Object.keys(litteral(html, "const CHASSIS_SANS_BARRE = {") || {});
const sansBarreServeur = marquesServeur.filter((m) => {
  const s = kartSpecs.CHASSIS_SPECS[m];
  return s && s.leviersAbsents && s.leviersAbsents.barre;
});
verifie("meme liste des deux cotes", sansBarreFront.sort().join(",") === sansBarreServeur.sort().join(","),
  "front: " + sansBarreFront.join(", ") + " | serveur: " + sansBarreServeur.join(", "));

// --- 6. Aucune valeur hors butees dans les textes du navigateur -------------
// Un texte qui conseille une voie arriere que le curseur ne peut pas atteindre
// decredibilise l'app aupres du seul public qui compte : celui qui essaie.
console.log("\n6. Valeurs citees dans les textes du navigateur");
if (limFront && limFront.voieAr) {
  const { min, max } = limFront.voieAr;
  const zoneKB = html.slice(html.indexOf("const KB = {"), html.indexOf("// ====", html.indexOf("const KB = {")));
  const citees = new Set();
  for (const m of zoneKB.matchAll(/\b(1[34]\d(?:[.,]\d)?)\b\s*(?:a|à|-|et)?\s*(1[34]\d(?:[.,]\d)?)?\s*cm/g)) {
    [m[1], m[2]].filter(Boolean).forEach((v) => citees.add(parseFloat(String(v).replace(",", "."))));
  }
  const hors = [...citees].filter((v) => v < min || v > max);
  verifie(`voie arriere : aucune valeur hors ${min}..${max}`, hors.length === 0,
    "valeurs hors plage citees au pilote : " + hors.join(", "));
} else verifie("butees de voie arriere lisibles", false);

// --- 7. Routage des mots-cles hors ligne ------------------------------------
// Le repli hors ligne rend l'entree dont le mot-cle correspondant est le plus
// LONG. Si un mot-cle generique masque une entree dediee, le pilote qui pose
// une question precise recoit une reponse a cote.
console.log("\n7. Routage du repli hors ligne");
const kbChat = litteral(html, "chatbot: {");
if (kbChat) {
  const noms = Object.keys(kbChat);
  const masques = [];
  for (const nom of noms) {
    const propre = (kbChat[nom].keywords || []).filter((k) => k === nom || nom.includes(k));
    if (!propre.length) continue;
    for (const autre of noms) {
      if (autre === nom) continue;
      const plusLong = (kbChat[autre].keywords || []).some((k) => nom.includes(k) && k.length > Math.max(...propre.map((p) => p.length)));
      if (plusLong) masques.push(nom + " masque par " + autre);
    }
  }
  verifie("aucune entree n'est masquee par une autre", masques.length === 0, masques.join(" | "));
  verifie("chaque entree a au moins un mot-cle", noms.every((n) => (kbChat[n].keywords || []).length > 0));
} else verifie("table du repli lisible", false);

console.log(`\nRESULTAT : ${controles - echecs}/${controles} controles passes`);
process.exit(echecs ? 1 : 0);
