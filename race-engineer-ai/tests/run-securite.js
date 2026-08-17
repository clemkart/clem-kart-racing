#!/usr/bin/env node
/* =============================================
 * Harnais de SECURITE
 * =============================================
 * Verifie par EXECUTION les garde-fous poses lors de l'audit du 2026-08-07 :
 *   - le journal d'audit ne fuit aucune donnee personnelle
 *   - l'endpoint analytique public n'accepte pas n'importe quoi
 *   - aucun secret ne traine dans les fichiers suivis par git
 *   - le schema SQL contient bien le durcissement de la colonne `plan`
 *
 * Aucun appel d'API. Gratuit et instantane.
 * Usage : npm run test:securite
 * ============================================= */
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const RACINE = path.join(__dirname, "..");
const { audit, ipTronquee, idTronque } = require(path.join(RACINE, "netlify/functions/audit-log"));

let echecs = 0, controles = 0;
function verifie(nom, ok, detail) {
  controles++;
  if (ok) return console.log("  OK   " + nom);
  echecs++;
  console.log("  ECHEC " + nom + (detail ? "\n         " + detail : ""));
}

console.log("Securite : execution reelle\n");

// --- 1. Le journal ne doit rien laisser fuiter -----------------------------
console.log("1. Journal d'audit et vie privee");
verifie("une IPv4 est reduite a deux octets", ipTronquee("82.64.12.34") === "82.64.x.x", ipTronquee("82.64.12.34"));
verifie("une IPv6 est reduite a deux groupes", ipTronquee("2a01:cb00:1234::1").startsWith("2a01:cb00"), ipTronquee("2a01:cb00:1234::1"));
verifie("une chaine d'IP ne garde que la premiere", ipTronquee("82.64.12.34, 10.0.0.1") === "82.64.x.x");
verifie("un identifiant est tronque a 8 caracteres", idTronque("3f2a9c1e-dead-beef-0000-111122223333").length === 8);

// On capture la sortie pour verifier ce qui est reellement ecrit.
const lignes = [];
const vraiLog = console.log;
console.log = (...a) => lignes.push(a.join(" "));
audit("auth-ok", { user: "3f2a9c1e-dead-beef-0000-111122223333", ip: "82.64.12.34" });
audit("test-fuite", { user: "abcdef12-3456", ip: "10.20.30.40", email: "pilote@exemple.fr" });
console.log = vraiLog;

verifie("la ligne porte le prefixe greppable [AUDIT]", lignes.every((l) => l.startsWith("[AUDIT] ")));
verifie("l'identifiant complet n'apparait JAMAIS", !lignes.join(" ").includes("3f2a9c1e-dead-beef"));
verifie("l'IP complete n'apparait JAMAIS", !lignes.join(" ").includes("82.64.12.34"));
verifie("une ligne d'audit tient sur une seule ligne", lignes.every((l) => !l.includes("\n")));
// ⚠️ L'helper ne peut pas empecher un appelant de passer un champ sensible : ce
// controle documente la limite plutot que de pretendre qu'elle n'existe pas.
verifie("⚠️ limite connue : un champ libre passe tel quel", lignes[1].includes("pilote@exemple.fr"),
  "si ce controle echoue, c'est que la protection a ete renforcee, mettez a jour ce test");

// --- 2. L'endpoint analytique public --------------------------------------
console.log("\n2. Endpoint analytique public (track.js)");
const src = fs.readFileSync(path.join(RACINE, "netlify/functions/track.js"), "utf-8");
// metaAcceptable n'est pas exportee : on la reconstruit depuis le source pour
// l'executer telle qu'elle est ecrite, sans la recopier a la main.
const debut = src.indexOf("function metaAcceptable");
const fin = src.indexOf("\n}", debut) + 2;
const prelude = `
const MAX_META_CLES = ${(src.match(/MAX_META_CLES = (\d+)/) || [])[1]};
const MAX_META_CHARS = ${(src.match(/MAX_META_CHARS = (\d+)/) || [])[1]};
const RESSEMBLE_A_UN_EMAIL = ${(src.match(/RESSEMBLE_A_UN_EMAIL = (\/.*?\/i);/) || [])[1]};
const console = { error() {} };
`;
// eslint-disable-next-line no-new-func
const metaAcceptable = new Function(prelude + src.slice(debut, fin) + "\nreturn metaAcceptable;")();

verifie("un meta legitime passe", !!metaAcceptable({ comportement: "understeer_entry", mode: "proprio" }));
verifie("un meta non-objet est refuse", metaAcceptable("bonjour") === null);
verifie("un tableau est refuse", metaAcceptable([1, 2, 3]) === null);
const trop = {}; for (let i = 0; i < 30; i++) trop["k" + i] = i;
verifie("trop de cles est refuse (signal d'abus)", metaAcceptable(trop) === null);
verifie("un meta trop long est refuse", metaAcceptable({ t: "x".repeat(5000) }) === null);

const redige = metaAcceptable({ prenom: "Kevin", texte: "super outil, ecris-moi a kevin@exemple.fr" });
verifie("l'evenement avec email est CONSERVE", !!redige, "il a ete jete, le temoignage serait perdu");
verifie("mais l'email est RETIRE", redige && !/kevin@exemple\.fr/.test(JSON.stringify(redige)),
  redige && JSON.stringify(redige));
verifie("le reste du texte survit a la redaction", redige && /super outil/.test(redige.texte));
const imbrique = metaAcceptable({ a: { b: { c: "contact@exemple.fr" } } });
verifie("un email imbrique est retire aussi", imbrique && !/contact@exemple\.fr/.test(JSON.stringify(imbrique)));

// --- 3. Aucun secret dans les fichiers suivis -----------------------------
console.log("\n3. Secrets dans le depot");
const suivis = execSync("git ls-files", { cwd: RACINE }).toString().trim().split("\n");
verifie("aucun fichier .env suivi par git", !suivis.some((f) => /(^|\/)\.env($|\.)/.test(f)),
  suivis.filter((f) => /\.env/.test(f)).join(", "));
const MOTIFS = /(sk-ant-api[0-9A-Za-z_-]{20,}|sk_live_[0-9A-Za-z]{20,}|xkeysib-[0-9a-f]{40,}|whsec_[0-9A-Za-z]{20,})/;
const coupables = [];
for (const f of suivis) {
  if (!/\.(js|html|json|toml|sql|md)$/.test(f)) continue;
  try { if (MOTIFS.test(fs.readFileSync(path.join(RACINE, f), "utf-8"))) coupables.push(f); } catch (e) {}
}
verifie("aucune cle secrete en clair dans les fichiers suivis", coupables.length === 0, coupables.join(", "));

// --- 4. Le durcissement SQL est dans le schema, pas seulement en migration --
console.log("\n4. Durcissement de la colonne `plan`");
for (const f of ["supabase/schema.sql", "supabase/setup-complet.sql"]) {
  const sql = fs.readFileSync(path.join(RACINE, f), "utf-8");
  const revoqueAuth = /REVOKE UPDATE ON public\.profiles FROM authenticated/i.test(sql);
  const revoqueAnon = /REVOKE UPDATE ON public\.profiles FROM anon/i.test(sql);
  const grantSansPlan = /GRANT UPDATE \(([\s\S]*?)\) ON public\.profiles TO authenticated/i.exec(sql);
  verifie(`${f} : revoque UPDATE a authenticated et anon`, revoqueAuth && revoqueAnon);
  verifie(`${f} : le grant colonne ne contient PAS \`plan\``,
    !!grantSansPlan && !/\bplan\b/.test(grantSansPlan[1]),
    grantSansPlan ? "colonnes accordees : " + grantSansPlan[1].replace(/\s+/g, " ").trim() : "aucun GRANT UPDATE trouve");
}

// --- 5. Toute table du depot a RLS active ---------------------------------
console.log("\n5. RLS sur toutes les tables du depot");
const racineRepo = path.join(RACINE, "..");
const sqls = execSync("git ls-files -- \"*.sql\"", { cwd: racineRepo }).toString().trim().split("\n");
const sansRls = [];
for (const rel of sqls) {
  const sql = fs.readFileSync(path.join(racineRepo, rel), "utf-8");
  for (const m of sql.matchAll(/CREATE TABLE (?:IF NOT EXISTS )?public\.(\w+)/gi)) {
    const table = m[1];
    const active = new RegExp(`ALTER TABLE public\\.${table}\\s+ENABLE ROW LEVEL SECURITY`, "i").test(sql);
    if (!active) sansRls.push(`${table} (${rel})`);
  }
}
verifie("chaque table creee a ENABLE ROW LEVEL SECURITY dans le meme fichier", sansRls.length === 0,
  "sans RLS : " + sansRls.join(", "));

console.log(`\nRESULTAT : ${controles - echecs}/${controles} controles passes`);
process.exit(echecs ? 1 : 0);
