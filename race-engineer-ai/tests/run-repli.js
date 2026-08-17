#!/usr/bin/env node
/* =============================================
 * Harnais du REPLI HORS LIGNE (getChatResponse)
 * =============================================
 * Le repli hors ligne est du code NAVIGATEUR : ni run-diagnostics.js ni
 * run-chat.js ne l'exécutent, et run-coherence.js n'inspecte que ses tables
 * de façon statique. Résultat : la fonction de routage a été réécrite le
 * 2026-08-07 sans jamais être lancée une seule fois.
 *
 * Ce harnais charge le script d'index.html dans un bac à sable avec un DOM
 * minimal, puis APPELLE réellement getChatResponse. Aucun appel d'API, donc
 * gratuit et instantané.
 *
 * Usage : npm run test:repli
 * ============================================= */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const RACINE = path.join(__dirname, "..");
const html = fs.readFileSync(path.join(RACINE, "index.html"), "utf-8");

// --- Bac à sable : un DOM juste assez riche pour que le script se charge ----
function elementFactice() {
  // ⚠️ textContent et innerHTML doivent être LIÉS : escapeHtml() d'index.html
  // écrit dans textContent et relit innerHTML. Avec deux champs inertes, il
  // renvoyait la chaîne vide et le test accusait le produit à tort.
  let contenu = "";
  const el = {
    get textContent() { return contenu; },
    set textContent(v) { contenu = String(v); },
    get innerHTML() {
      return contenu.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    },
    set innerHTML(v) { contenu = String(v); },
    value: "", style: {}, className: "", dataset: {},
    classList: { add() {}, remove() {}, toggle() {}, contains: () => false },
    appendChild() {}, removeChild() {}, remove() {}, focus() {}, blur() {}, click() {},
    setAttribute() {}, getAttribute: () => null, removeAttribute() {},
    addEventListener() {}, removeEventListener() {},
    querySelector: () => elementFactice(), querySelectorAll: () => [],
    scrollTop: 0, scrollHeight: 0, checked: false, files: [],
    insertAdjacentHTML() {}, getContext: () => null,
  };
  return el;
}
const stockage = new Map();
const sandbox = {
  console,
  document: {
    getElementById: () => elementFactice(),
    querySelector: () => elementFactice(),
    querySelectorAll: () => [],
    createElement: () => elementFactice(),
    addEventListener() {},
    body: elementFactice(),
    documentElement: elementFactice(),
    cookie: "",
  },
  localStorage: {
    getItem: (k) => (stockage.has(k) ? stockage.get(k) : null),
    setItem: (k, v) => stockage.set(k, String(v)),
    removeItem: (k) => stockage.delete(k),
  },
  location: { href: "http://localhost/", search: "", hostname: "localhost", pathname: "/" },
  navigator: { userAgent: "node", language: "fr-FR", onLine: true },
  fetch: async () => { throw new Error("reseau coupe : c'est le point du test"); },
  setTimeout, clearTimeout, setInterval, clearInterval,
  requestAnimationFrame: (f) => setTimeout(f, 0),
  Date, Math, JSON, RegExp, Error, Promise, Intl,
  URL, URLSearchParams, TextEncoder, TextDecoder,
  alert() {}, confirm: () => true, prompt: () => null,
  matchMedia: () => ({ matches: false, addEventListener() {}, addListener() {} }),
};
sandbox.window = sandbox;
sandbox.globalThis = sandbox;
sandbox.self = sandbox;

const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
const contexte = vm.createContext(sandbox);
let charges = 0;
for (const src of scripts) {
  try {
    vm.runInContext(src, contexte, { timeout: 10000 });
    charges++;
  } catch (e) {
    console.log("  (bloc script non chargeable dans le bac a sable : " + e.message.slice(0, 90) + ")");
  }
}

let echecs = 0, controles = 0;
function verifie(nom, ok, detail) {
  controles++;
  if (ok) return console.log("  OK   " + nom);
  echecs++;
  console.log("  ECHEC " + nom + (detail ? "\n         " + detail : ""));
}

console.log("Repli hors ligne : execution reelle de getChatResponse\n");
console.log(`${charges}/${scripts.length} bloc(s) script charge(s)\n`);

// ⚠️ `const` et `let` de haut niveau NE deviennent PAS des propriétés du global
// dans un contexte vm : SETUP_LIMITS et KB restent invisibles depuis sandbox.
// Les fonctions déclarées, elles, sont attachées. On exécute donc un second
// script DANS LE MÊME contexte pour republier ce dont le test a besoin.
try {
  vm.runInContext("var __LIMITES = SETUP_LIMITS; var __KB = KB;", contexte);
} catch (e) {
  console.log("  (impossible de republier SETUP_LIMITS : " + e.message + ")");
}

const repond = sandbox.getChatResponse;
if (typeof repond !== "function") {
  console.log("ECHEC : getChatResponse introuvable dans le bac a sable. Rien n'a pu etre teste.");
  process.exit(1);
}

// Texte brut, sans balises, pour les assertions.
const brut = (s) => String(s).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

// --- 1. Routage : un mot-cle generique ne doit pas masquer l'entree dediee --
console.log("1. Routage des questions");
const casRoutage = [
  { q: "comment je regle la chasse ?", attendu: /chasse/i, interdit: /survirage, les causes|Survirage : l'arri/i, nom: "une question sur la chasse ne renvoie PAS survirage" },
  { q: "c'est quoi un bon chassis ?", attendu: /./, interdit: /barre avant, du plus souple/i, nom: "une question sur le chassis ne renvoie PAS la barre avant" },
  { q: "mon kart survire en sortie", attendu: /survirage|arri[eè]re/i, interdit: null, nom: "une question sur le survirage renvoie bien le survirage" },
  { q: "quelle pression pneu ?", attendu: /pression|delta|bar/i, interdit: null, nom: "une question sur les pressions renvoie les pressions" },
  { q: "quel gicleur par 30 degres ?", attendu: /je ne te donnerai pas de chiffre|motoriste/i, interdit: null, nom: "une question carburation renvoie le refus de chiffrer" },
];
for (const c of casRoutage) {
  const r = brut(repond(c.q));
  const ok = c.attendu.test(r) && (!c.interdit || !c.interdit.test(r));
  verifie(c.nom, ok, ok ? "" : `"${c.q}" -> ${r.slice(0, 120)}`);
}

// --- 2. Aucune valeur chiffree prescrite hors ligne -------------------------
// Le repli ne connait ni le kart, ni les reglages actuels, ni les butees : il
// n'a donc PAS le droit de prescrire une valeur. Il peut citer une plage a
// titre pedagogique, mais jamais "augmente de X".
console.log("\n2. Aucune prescription chiffree (le repli ne voit pas le kart)");
const PRESCRIPTION = /(augmente|augmenter|r[eé]duis|r[eé]duire|monte|descends|[eé]largis|resserre|passe|ajoute|enl[eè]ve|all[eè]ge)[^.!?]{0,40}?[-+]?\d+([.,]\d+)?\s*(bar|cm|cran|dent|bague|mm|%)/i;
for (const q of ["mon kart sous-vire a l'entree", "mon kart survire", "je n'ai pas de grip, piste verte", "comment ameliorer la rotation"]) {
  const r = brut(repond(q));
  const m = r.match(PRESCRIPTION);
  verifie(`"${q}" : aucune valeur prescrite`, !m, m ? "trouve : " + m[0] : "");
}

// --- 3. Aucune valeur hors des butees de l'app ------------------------------
console.log("\n3. Aucune valeur hors butees dans les reponses du repli");
const lim = sandbox.__LIMITES;
verifie("SETUP_LIMITS accessible dans le bac a sable", !!(lim && lim.voieAr));
if (lim && lim.voieAr) {
  const hors = new Set();
  for (const q of ["sous-virage", "survirage", "voie arriere", "piste verte no grip", "rotation", "pluie"]) {
    for (const m of brut(repond(q)).matchAll(/\b(1[34]\d(?:[.,]\d)?)\s*(?:cm)?\b/g)) {
      const v = parseFloat(m[1].replace(",", "."));
      if (v >= 130 && v <= 145 && (v < lim.voieAr.min || v > lim.voieAr.max)) hors.add(v);
    }
  }
  verifie(`voie arriere : aucune valeur hors ${lim.voieAr.min}..${lim.voieAr.max}`, hors.size === 0,
    "valeurs hors plage servies au pilote : " + [...hors].join(", "));
}

// --- 4. Le repli reste utilisable quand rien ne matche ----------------------
console.log("\n4. Question hors sujet");
const horsSujet = brut(repond("est-ce qu'il va pleuvoir dimanche a Lohéac ?"));
verifie("repond quelque chose d'utile plutot que de planter", horsSujet.length > 20);

console.log(`\nRESULTAT : ${controles - echecs}/${controles} controles passes`);
process.exit(echecs ? 1 : 0);
