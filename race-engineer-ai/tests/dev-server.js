#!/usr/bin/env node
/* =============================================
 * Serveur de dev local
 * =============================================
 * Permet de tester l'application AVANT de pousser, comme le demande
 * CLAUDE.md, sans installer la CLI Netlify.
 *
 * Il sert les fichiers du depot et route /.netlify/functions/chat vers le
 * vrai handler, exactement comme le fait Netlify en production.
 *
 * Usage :
 *   node tests/dev-server.js
 *   puis ouvrir http://localhost:8888
 *
 * Prerequis : un fichier .env a la racine du dossier race-engineer-ai
 * contenant ANTHROPIC_API_KEY. Il est charge ici sans jamais etre affiche,
 * et il est deja ignore par git.
 *
 * ⚠️ ALLOW_ANON_CHAT est force a true : le serveur repond sans compte
 * Supabase. C'est un mode de DEV, jamais celui de la production.
 *
 * ⚠️ Le navigateur, lui, exige quand meme un jeton Supabase avant d'appeler
 * le diagnostic. Pour tester le diagnostic en local sans compte, ouvre la
 * console du navigateur et tape :
 *     window.getAccessToken = async () => 'jeton-de-dev';
 * puis relance l'analyse. Le serveur ignore la valeur du jeton dans ce mode.
 * ============================================= */

const http = require("http");
const fs = require("fs");
const path = require("path");

const RACINE = path.resolve(__dirname, "..");
const PORT = parseInt(process.env.PORT, 10) || 8888;

// --- .env : charge en memoire, jamais affiche -------------------------------
const envFile = path.join(RACINE, ".env");
if (fs.existsSync(envFile)) {
  for (const ligne of fs.readFileSync(envFile, "utf8").split(/\r?\n/)) {
    if (ligne.trim().startsWith("#")) continue;
    const m = ligne.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!m) continue;
    const val = m[2].trim().replace(/^(["'])(.*)\1$/, "$2");
    if (val) process.env[m[1]] = val;
  }
}
process.env.ALLOW_ANON_CHAT = "true";

const chat = require(path.join(RACINE, "netlify/functions/chat.js"));

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webmanifest": "application/manifest+json",
};

function lireCorps(req) {
  return new Promise((res) => {
    let d = "";
    req.on("data", (c) => (d += c));
    req.on("end", () => res(d));
  });
}

const serveur = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const chemin = url.pathname;

  if (chemin.startsWith("/.netlify/functions/")) {
    const nom = chemin.replace("/.netlify/functions/", "").split("/")[0];

    // track (analytique) et session (Supabase) demandent des secrets serveur
    // absents en local. On repond OK pour ne pas polluer la console : ce ne
    // sont pas eux qu'on teste ici.
    if (nom === "track" || nom === "session") {
      res.writeHead(200, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ ok: true, stub: true, sessions: [] }));
    }

    if (nom === "chat") {
      const body = await lireCorps(req);
      const t0 = Date.now();
      try {
        const r = await chat.handler({
          httpMethod: req.method,
          headers: Object.assign({ origin: `http://localhost:${PORT}` }, req.headers),
          body,
        });
        console.log(`[chat] ${req.method} -> ${r.statusCode} en ${((Date.now() - t0) / 1000).toFixed(1)}s`);
        res.writeHead(r.statusCode, Object.assign({ "Content-Type": "application/json" }, r.headers || {}));
        return res.end(r.body);
      } catch (e) {
        console.log(`[chat] ERREUR : ${e.message}`);
        res.writeHead(500, { "Content-Type": "application/json" });
        return res.end(JSON.stringify({ error: e.message }));
      }
    }

    res.writeHead(404);
    return res.end("fonction inconnue");
  }

  // --- Fichiers statiques ---
  // path.resolve des DEUX cotes : sous Windows path.join produit des
  // antislashs et la comparaison de prefixe echouerait.
  const fichier = path.resolve(RACINE, chemin === "/" ? "index.html" : decodeURIComponent(chemin).replace(/^\//, ""));
  if (!fichier.startsWith(RACINE)) {
    res.writeHead(403);
    return res.end("interdit");
  }
  if (!fs.existsSync(fichier) || fs.statSync(fichier).isDirectory()) {
    res.writeHead(404);
    return res.end("introuvable");
  }
  res.writeHead(200, { "Content-Type": MIME[path.extname(fichier)] || "application/octet-stream" });
  fs.createReadStream(fichier).pipe(res);
});

serveur.listen(PORT, () => {
  console.log(`Race Engineer AI en local : http://localhost:${PORT}`);
  console.log(`ALLOW_ANON_CHAT=true, cle Anthropic ${process.env.ANTHROPIC_API_KEY ? "chargee" : "ABSENTE, le diagnostic IA echouera"}`);
});
