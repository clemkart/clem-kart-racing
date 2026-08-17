#!/usr/bin/env node
/* =============================================
 * Harnais du QUOTA EN MODE DEGRADE
 * =============================================
 * Avant le 2026-08-07, checkQuota renvoyait unlimited:true des que
 * SUPABASE_SERVICE_ROLE_KEY manquait : une variable Netlify mal nommee rendait
 * l'app GRATUITE ET ILLIMITEE pour tout le monde, sans aucune erreur visible.
 *
 * Le correctif avait ete verifie en LISANT le code, ce qui ne prouve rien.
 * Ce harnais l'EXECUTE : il simule Supabase (utilisateur authentifie) et
 * l'absence de cle service, puis compte combien de messages passent.
 *
 * Aucun appel d'API Claude : le SDK est intercepte. Gratuit et instantane.
 *
 * Usage : npm run test:quota
 * ============================================= */
const path = require("path");
const RACINE = path.join(__dirname, "..");

// --- Scenario : utilisateur authentifie, MAIS pas de cle service ------------
delete process.env.SUPABASE_SERVICE_ROLE_KEY;
delete process.env.ALLOW_ANON_CHAT; // on veut passer par la vraie auth
process.env.ANTHROPIC_API_KEY = "factice-non-utilisee";
process.env.DEGRADED_MAX_MESSAGES = "3"; // plafond volontairement bas pour le test

// --- Faux Supabase : getUser accepte toujours ------------------------------
const CHEMIN_SB = require.resolve(path.join(RACINE, "node_modules/@supabase/supabase-js"));
require.cache[CHEMIN_SB] = {
  id: CHEMIN_SB, filename: CHEMIN_SB, loaded: true,
  exports: {
    createClient: () => ({
      auth: { getUser: async () => ({ data: { user: { id: "pilote-de-test" } }, error: null }) },
      from: () => { throw new Error("aucune table ne doit etre lue sans cle service"); },
      rpc: async () => { throw new Error("aucun rpc ne doit partir sans cle service"); },
    }),
  },
};

// --- Faux SDK Anthropic : on ne paie rien, on note juste le passage ---------
let appelsApi = 0;
const CHEMIN_SDK = require.resolve(path.join(RACINE, "node_modules/@anthropic-ai/sdk"));
require.cache[CHEMIN_SDK] = {
  id: CHEMIN_SDK, filename: CHEMIN_SDK, loaded: true,
  exports: class {
    constructor() {
      this.messages = {
        create: async () => {
          appelsApi++;
          return {
            stop_reason: "end_turn",
            content: [{ type: "text", text: JSON.stringify({ titre: "t", cause: "c", aObserver: "a", confiance: "moyenne", apply: {} }) }],
            usage: {},
          };
        },
      };
    }
  },
};

// On capture stderr pour verifier le marqueur de journal.
let journal = "";
const vraiErr = console.error;
console.error = (...a) => { journal += a.join(" ") + "\n"; };

const { handler } = require(path.join(RACINE, "netlify/functions/chat.js"));

let echecs = 0, controles = 0;
function verifie(nom, ok, detail) {
  controles++;
  if (ok) return vraiErr("  OK   " + nom);
  echecs++;
  vraiErr("  ECHEC " + nom + (detail ? "\n         " + detail : ""));
}

async function envoie(i) {
  const res = await handler({
    httpMethod: "POST",
    headers: { origin: "http://localhost:8888", authorization: "Bearer jeton-factice", "x-forwarded-for": "10.0.0.1" },
    body: JSON.stringify({ message: "question numero " + i, context: null, history: [] }),
  });
  return { statut: res.statusCode, corps: JSON.parse(res.body) };
}

(async () => {
  vraiErr("Quota en mode degrade : execution reelle\n");
  vraiErr("Plafond de secours regle a 3 pour ce test.\n");

  const resultats = [];
  for (let i = 1; i <= 5; i++) resultats.push(await envoie(i));

  const passes = resultats.filter((r) => r.statut === 200).length;
  const refuses = resultats.filter((r) => r.statut === 503);

  verifie("l'app continue de servir malgre la panne de quota", passes >= 1,
    "aucun message n'est passe, le produit serait casse");
  verifie("le quota N'EST PAS illimite", passes <= 3,
    `${passes} messages sur 5 sont passes alors que le plafond est 3`);
  verifie("les messages au-dela du plafond sont refuses", refuses.length >= 1,
    "aucun 503 : le plafond de secours ne s'applique pas");
  verifie("le refus porte le code service_degraded", refuses.every((r) => r.corps.code === "service_degraded"),
    "codes vus : " + refuses.map((r) => r.corps.code).join(", "));
  verifie("le refus ne pretend PAS que le quota du pilote est epuise",
    refuses.every((r) => !/cr[eé]dits? .*du mois|1er du mois/i.test(r.corps.message || "")),
    "message trompeur : " + (refuses[0] && refuses[0].corps.message));
  verifie("le journal porte le marqueur [QUOTA-DEGRADE]", journal.includes("[QUOTA-DEGRADE]"),
    "introuvable : impossible d'alerter sur cette panne");
  verifie("le journal nomme la variable a verifier", /SUPABASE_SERVICE_ROLE_KEY/.test(journal));
  verifie("aucun appel d'API au-dela du plafond", appelsApi === passes,
    `${appelsApi} appels pour ${passes} reponses`);

  console.error = vraiErr;
  vraiErr(`\nRESULTAT : ${controles - echecs}/${controles} controles passes`);
  process.exit(echecs ? 1 : 0);
})().catch((e) => { console.error = vraiErr; vraiErr("ECHEC : " + e.message); process.exit(1); });
