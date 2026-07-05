// =============================================
// Race Engineer AI — Function chat
// Intègre le skill pilotage-karting comme system prompt avec prompt caching
// Garde-fous moteur stricts (refus avant API)
// Auth Supabase obligatoire + quota mensuel freemium
// Mémoire de conversation (12 derniers messages)
// Modèle : Claude Sonnet 4.6
// =============================================

const Anthropic = require("@anthropic-ai/sdk");
const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

// =============================================
// CONFIG (env vars)
// =============================================
const SUPABASE_URL = process.env.SUPABASE_URL || "https://hkpknrrymgbnjmbewlyc.supabase.co";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || "";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
// Dev local uniquement : ALLOW_ANON_CHAT=true dans .env pour tester sans compte
const ALLOW_ANON_CHAT = process.env.ALLOW_ANON_CHAT === "true";
// Quota mensuel du plan gratuit (messages IA / mois)
const FREE_MONTHLY_LIMIT = parseInt(process.env.FREE_MONTHLY_LIMIT, 10) || 30;
const UNLIMITED_PLANS = ["pro", "club", "founder"];

// Limites de taille des entrées (anti-abus de coût API)
const MAX_MESSAGE_CHARS = 2000;
const MAX_HISTORY_ITEMS = 12;
const MAX_HISTORY_ITEM_CHARS = 4000;
const MAX_HISTORY_TOTAL_CHARS = 16000;
const MAX_CONTEXT_CHARS = 25000;

// =============================================
// CHARGEMENT DU SKILL (au cold start uniquement)
// Noyau toujours chargé ; racecraft et circuits chargés
// seulement si la question le justifie (économie de tokens)
// =============================================
const SKILL_CORE_FILES = [
  "SKILL.md",
  "vision-pilote.md",
  "principes-universels.md",
  "mecanique-kart-specifique.md",
  "materiel-specifique.md",
  "reglages-detailles.md",
  "matrice-symptomes.md",
  "methodologie-coach.md",
];
const SKILL_MODULE_FILES = ["racecraft-course.md", "circuits.md", "carburation.md", "transmission.md", "pneus-gommes.md"];

const SKILL_PARTS = {}; // nom fichier → contenu formaté
let SKILL_CORE = "";
try {
  for (const f of [...SKILL_CORE_FILES, ...SKILL_MODULE_FILES]) {
    const content = fs.readFileSync(path.join(__dirname, "skill", f), "utf-8");
    SKILL_PARTS[f] = `\n\n========== FILE: ${f} ==========\n\n${content}`;
  }
  SKILL_CORE = SKILL_CORE_FILES.map((f) => SKILL_PARTS[f]).join("");
} catch (e) {
  console.error("Failed to load skill files:", e.message);
  SKILL_CORE = ""; // fallback — la function marchera mais sans expertise karting
}

// Racecraft : stratégie de course, départs, dépassements, défense, qualifs
const RACECRAFT_TRIGGER = /(course|d[ée]part|d[ée]pass|d[ée]fen[ds]|attaqu|duel|bagarre|qualif|grille|premier\s+virage|aspiration|roue\s+dans\s+roue|position|peloton|strat[ée]gie)/i;
// Circuits : besoin de la base circuits si un circuit est nommé ou évoqué
const CIRCUIT_TRIGGER = /(circuit|trac[ée]|piste\s+de|loh[ée]ac|laval|le\s+mans|pless[ée]|ancenis|angerville|varennes|argenton|genk|lonato|wackersdorf|zuera)/i;
// Carburation : gicleurs, mélange, bougie, symptômes moteur riche/pauvre
const CARBU_TRIGGER = /(gicleur|carbu|m[ée]lange|bougie|serrage|serr[ée]|d[ée]tonation|cliquetis|quatre[\s-]?temps|4[\s-]?temps|jetting|pop[\s-]?off|richesse|trop\s+(riche|pauvre)|tillotson|dell'?orto|essence|huile)/i;
// Transmission : couronne, pignon, rapport, régime, vitesse de pointe, chaîne
const TRANSMISSION_TRIGGER = /(couronne|pignon|\bdents?\b|rapport|transmission|d[ée]multiplication|vitesse\s+de\s+pointe|r[ée]gime|\brpm\b|tr\/?min|limiteur|cha[îi]ne|compte[\s-]?tours)/i;
// Pneus : pressions, gommes, marques, pluie
const PNEUS_TRIGGER = /(pression|pneu|gomme|mojo|vega|lecont|le\s+cont|komet|bridgestone|\bdelta\b|pluie|slick|pyrom[eè]tre)/i;

function selectSkillModules(message, context) {
  const modules = [];
  const sessionType = (context && context.session) || "";
  if (RACECRAFT_TRIGGER.test(message) || sessionType === "qualifs" || sessionType === "course") {
    modules.push("racecraft-course.md");
  }
  if (CIRCUIT_TRIGGER.test(message) || (context && context.circuitName)) {
    modules.push("circuits.md");
  }
  if (CARBU_TRIGGER.test(message)) {
    modules.push("carburation.md");
  }
  if (TRANSMISSION_TRIGGER.test(message)) {
    modules.push("transmission.md");
  }
  if (PNEUS_TRIGGER.test(message) || (context && (context.meteo === "pluie" || context.meteo === "mixte"))) {
    modules.push("pneus-gommes.md");
  }
  return modules.map((f) => SKILL_PARTS[f] || "").join("");
}

// =============================================
// CORS — restreint au site (env URL fournie par Netlify) + dev local
// =============================================
const ALLOWED_ORIGINS = [
  process.env.URL,
  process.env.DEPLOY_PRIME_URL,
  "http://localhost:8888",
  "http://localhost:3000",
].filter(Boolean);

function buildHeaders(event) {
  const origin = event.headers["origin"] || "";
  const allowOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0] || "";
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json",
    Vary: "Origin",
  };
}

// =============================================
// GARDE-FOUS MOTEUR (refus avant API call)
// =============================================
const ENGINE_BLOCKED_PATTERNS = [
  /(boost\w*|augment\w*|gagner)\s+(de\s+)?(la\s+)?(puissance|vitesse|chevaux?)/i,
  /(modifi|trafiqu|pr[ée]par|tuni)\w*\s+(le\s+|du\s+|mon\s+)?(carbu|moteur|allumage|admission|[ée]chappement|pot|piston|cylindre)/i,
  /(carbu|moteur).+(plus\s+)?(de\s+)?(puissance|vitesse|cheval|chevaux)/i,
  /rendre.+(ill[ée]gal|hors\s+r[èe]gle|non[\s-]conforme)/i,
  /contourn\w+.+(r[èe]glement|cik|fia|ffsa)/i,
  /(enlever|supprimer|retirer)\s+(le\s+|la\s+)?(restricteur|limiteur|bride)/i,
  /(d[ée]brid|reprogramm)\w+/i,
  /(jet[éer]|bidouill|magouill)\w+\s+(le\s+|du\s+|mon\s+)?moteur/i,
  /modifier\s+(la\s+)?(g[ée]om[ée]trie|cote)\s+(du\s+|interne\s+)?moteur/i,
  /(percer|al[ée]ser|usiner|toucher\s+aux?)\s+(le\s+|les\s+)?(piston|cylindre|culasse|admission|[ée]chappement)/i,
];

const ENGINE_REFUSAL_MESSAGE = "Je ne peux pas te répondre sur ce point, pour deux raisons :\n\n**1. Risque de casse moteur** — sans connaître l'état exact de ton moteur, te donner des indications pourrait t'amener à le détruire (et un moteur karting coûte cher).\n\n**2. Cadre réglementaire** — ce que tu décris peut sortir des règlements de ta catégorie. Tu risquerais la disqualification voire une suspension.\n\nPour ce sujet, va voir :\n- Ton préparateur moteur attitré\n- Le constructeur du moteur (IAME, Rotax, Vortex, TM, Modena, etc.)\n- Le règlement officiel de ta catégorie (CIK-FIA, FFSA, etc.)\n\nSur ce que je peux t'aider en revanche : pilotage, réglages châssis (voie, pincement, hauteur, barres, position siège, pression pneus), choix stratégie en session.";

function detectEngineMod(message) {
  return ENGINE_BLOCKED_PATTERNS.some((p) => p.test(message));
}

// =============================================
// RATE LIMITING (en mémoire, reset à chaque cold start)
// Couche d'appoint anti-rafale — la vraie protection est auth + quota
// =============================================
const rateLimitMap = new Map();
const RATE_LIMIT = 30;
const RATE_WINDOW_MS = 60 * 1000;

function checkRateLimit(ip) {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now - entry.windowStart > RATE_WINDOW_MS) {
    rateLimitMap.set(ip, { count: 1, windowStart: now });
    return true;
  }
  if (entry.count >= RATE_LIMIT) return false;
  entry.count++;
  return true;
}

// =============================================
// VALIDATION DES ENTRÉES
// =============================================
function validateInputs(message, history, context) {
  if (!message || typeof message !== "string") return "Message requis";
  if (message.length > MAX_MESSAGE_CHARS) return `Message trop long (max ${MAX_MESSAGE_CHARS} caractères)`;

  if (history !== undefined && history !== null) {
    if (!Array.isArray(history)) return "Historique invalide";
    if (history.length > MAX_HISTORY_ITEMS) return "Historique trop long";
    let total = 0;
    for (const h of history) {
      if (!h || typeof h.content !== "string" || (h.role !== "user" && h.role !== "assistant")) {
        return "Historique invalide";
      }
      if (h.content.length > MAX_HISTORY_ITEM_CHARS) return "Historique invalide (message trop long)";
      total += h.content.length;
    }
    if (total > MAX_HISTORY_TOTAL_CHARS) return "Historique trop volumineux";
  }

  if (context !== undefined && context !== null) {
    if (typeof context !== "object" || Array.isArray(context)) return "Contexte invalide";
    if (JSON.stringify(context).length > MAX_CONTEXT_CHARS) return "Contexte trop volumineux";
  }
  return null;
}

// =============================================
// AUTH + QUOTA
// =============================================
async function authenticateUser(event) {
  const authHeader = event.headers["authorization"] || "";
  const token = authHeader.replace("Bearer ", "").trim();
  if (!token || !SUPABASE_ANON_KEY) return null;
  const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data: { user }, error } = await sb.auth.getUser(token);
  if (error || !user) return null;
  return user;
}

function getAdminClient() {
  if (!SUPABASE_SERVICE_KEY) return null;
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
}

function currentMonth() {
  return new Date().toISOString().slice(0, 7); // 'YYYY-MM'
}

// Retourne { allowed, used, limit, unlimited } — fail-open si la DB est KO
// (mieux vaut une réponse IA en trop qu'un produit cassé)
async function checkQuota(admin, userId) {
  const noQuota = { allowed: true, used: 0, limit: FREE_MONTHLY_LIMIT, unlimited: true };
  if (!admin) return noQuota;
  try {
    const { data: profile } = await admin
      .from("profiles").select("plan").eq("id", userId).single();
    if (profile && UNLIMITED_PLANS.includes(profile.plan)) return noQuota;

    const { data: usage } = await admin
      .from("ai_usage").select("count")
      .eq("user_id", userId).eq("month", currentMonth()).maybeSingle();
    const used = (usage && usage.count) || 0;
    return { allowed: used < FREE_MONTHLY_LIMIT, used, limit: FREE_MONTHLY_LIMIT, unlimited: false };
  } catch (e) {
    console.error("checkQuota failed (fail-open):", e.message);
    return noQuota;
  }
}

async function incrementUsage(admin, userId) {
  if (!admin) return null;
  try {
    const { data, error } = await admin.rpc("increment_ai_usage", {
      p_user_id: userId,
      p_month: currentMonth(),
    });
    if (error) throw error;
    return data; // nouveau compteur
  } catch (e) {
    console.error("incrementUsage failed:", e.message);
    return null;
  }
}

// =============================================
// HANDLER
// =============================================
exports.handler = async (event) => {
  const headers = buildHeaders(event);

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  // Rate limiting par IP (couche d'appoint)
  const clientIp = event.headers["x-forwarded-for"]?.split(",")[0]?.trim() || "unknown";
  if (!checkRateLimit(clientIp)) {
    return {
      statusCode: 429,
      headers,
      body: JSON.stringify({ message: "Trop de requêtes. Attends quelques secondes.", apply: {} }),
    };
  }

  try {
    let payload;
    try {
      payload = JSON.parse(event.body || "{}");
    } catch (e) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: "JSON invalide" }) };
    }
    const { message, context, history } = payload;

    const validationError = validateInputs(message, history, context);
    if (validationError) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: validationError }) };
    }

    // === AUTH : compte obligatoire (sauf dev local avec ALLOW_ANON_CHAT=true) ===
    let user = null;
    if (!ALLOW_ANON_CHAT) {
      user = await authenticateUser(event);
      if (!user) {
        return {
          statusCode: 401,
          headers,
          body: JSON.stringify({
            code: "auth_required",
            message: "Connecte-toi pour utiliser le coach IA (gratuit). Tes analyses seront aussi sauvegardées dans le cloud.",
            apply: {},
          }),
        };
      }
    }

    // === GARDE-FOU MOTEUR : refus avant API call ===
    if (detectEngineMod(message)) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ message: ENGINE_REFUSAL_MESSAGE, apply: {} }),
      };
    }

    // === QUOTA mensuel (plan free) ===
    const admin = user ? getAdminClient() : null;
    let quota = { allowed: true, used: 0, limit: FREE_MONTHLY_LIMIT, unlimited: true };
    if (user) {
      quota = await checkQuota(admin, user.id);
      if (!quota.allowed) {
        return {
          statusCode: 403,
          headers,
          body: JSON.stringify({
            code: "quota_exceeded",
            message: `Tu as utilisé tes ${quota.limit} analyses IA gratuites du mois. Le compteur se remet à zéro le 1er du mois prochain. (Le diagnostic local et l'historique restent dispo sans limite.)`,
            quota: { used: quota.used, limit: quota.limit },
            apply: {},
          }),
        };
      }
    }

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    // === Construction du contexte pilote ===
    const contextStr = context
      ? `
CONTEXTE PILOTE & SESSION ACTUELLE
==================================
Profil pilote :
- Catégorie principale : ${context.categorie || "non renseignée"}
- Moteur : ${context.moteur || "non renseigné"} (famille : ${context.moteur_family || "direct_drive"})
- Châssis : ${context.chassis || "non renseigné"}
- Taille / poids : ${context.taille || "?"}cm / ${context.poids || "?"}kg
- Style pilotage : ${context.style || "non renseigné"}
- Niveau : ${context.niveau || "non renseigné"}
- Interlocuteur : ${context.pilote === "enfant" ? "le PARENT d'un jeune pilote (pas le pilote lui-même)" : "le pilote lui-même"}
- Kart : ${context.mode === "location" ? "LOCATION / LOISIR — aucun réglage châssis ou moteur possible" : "kart personnel réglable"}
${context.pilote === "enfant" ? `
RÈGLE PARENT (prioritaire) : tu parles à un parent qui gère le kart de son enfant, souvent sans bagage mécanique. Ton rassurant et pédagogique, chaque terme technique expliqué en une phrase, la SÉCURITÉ passe avant la performance, parle du pilote à la troisième personne ("ton enfant", "le pilote"). Jamais culpabilisant — un week-end raté n'est pas une faute.` : ""}
${context.mode === "location" ? `
RÈGLE LOCATION (prioritaire) : le pilote roule en location, il ne peut RIEN régler — "apply" doit TOUJOURS être {}. Focalise 100 % du diagnostic sur le pilotage : freinage dégressif, light hands, rotation par délestage, point d'accélération, trajectoire dictée par le grip, régularité, mental. Si le comportement décrit semble venir du matériel (kart fatigué), conseille de le signaler à l'accueil et d'en changer.` : ""}

IMPORTANT — Adapte tes recommandations au matériel :
- Le châssis "${context.chassis || "?"}" a ses propres terminologies et comportements : tiens-en compte (voir mecanique-kart-specifique.md et tes connaissances de la marque).
- La famille moteur "${context.moteur_family || "direct_drive"}" conditionne les leviers dispo : direct_drive = couronne + gicleur ; dd2 = couronne + contre-pignon ; kz_shifter = boîte 6 + embrayage + engine braking ; 4t = carburation fixe (pas de gicleur).
- Croise TOUJOURS châssis × moteur × conditions × style pilote. Un même réglage ne convient pas à deux combos différents.

Conditions session :
- Grip piste : ${context.grip || "non renseigné"}
- Météo : ${context.meteo || "non renseigné"}
- Temp air : ${context.tempAir || "?"}°C, Temp piste : ${context.tempPiste || "?"}°C
- Circuit : ${context.circuitName || "non précisé"} (type : ${context.circuit || "non renseigné"})
  ${context.circuitName ? "→ Si ce circuit est documenté dans circuits.md, exploite ses spécificités (profil, secteurs, pièges, réglage type). Sinon, demande au pilote de décrire le tracé, n'invente jamais de specs." : ""}
- Type session : ${context.session || "non renseigné"}
- Problème dominant : ${context.comportement || "non renseigné"}
- Intensité : ${context.intensite || "?"}/10
- Chronos : meilleur tour ${context.chronoBest || "non renseigné"}, tour moyen ${context.chronoAvg || "?"}, ${context.chronoLaps || "?"} tours
  → Si meilleur et moyen sont renseignés, l'écart entre les deux mesure la RÉGULARITÉ. Un pilote irrégulier gagne plus en travaillant la constance qu'en cherchant le tour parfait.
- Tendance multi-sessions : ${context.insightsSummary || "pas encore assez de sessions pour dégager une tendance"}
  → Un symptôme qui revient session après session malgré des réglages ou conditions différents pointe vers le pilotage, pas le matériel. Exploite cette tendance dans ton diagnostic.

Réglages actuels (châssis) :
- Barre avant : ${context.barre || "?"}
- Voie avant : ${context.voieAv || "?"} bagues
- Pincement : ${context.pincement || "?"}
- Voie arrière : ${context.voieAr || "?"} cm
- Arbre transmission : ${context.arbre || "?"}
- Moyeux : ${context.moyeux || "?"}
- Pare-chocs : ${context.parechocs || "?"}
- Chasse : ${context.chasse || "?"}
- Garde au sol AV/AR : ${context.gardeAv || "?"} / ${context.gardeAr || "?"}

Réglages moteur (DESCRIPTIFS UNIQUEMENT — pas de modifs internes) :
- Couronne : ${context.couronne || "?"} dents
- Gicleur : ${context.gicleur || "?"}

Notes pilote : ${context.notes || "aucune"}

Suivi de test (méthode "un seul changement à la fois") :
- Test EN COURS (verdict pas encore donné) : ${context.pendingTest && Array.isArray(context.pendingTest.changes) ? context.pendingTest.changes.join(" · ") : "aucun"}
- Dernier test CONCLU : ${context.lastTest && Array.isArray(context.lastTest.changes) ? `${context.lastTest.changes.join(" · ")} → verdict pilote : ${context.lastTest.verdict || "?"}` : "aucun"}
→ Si un test est en cours, demande d'abord le verdict avant de proposer un nouveau changement. Si le dernier verdict est "pire", envisage le retour au réglage précédent avant toute nouvelle piste. Ne propose JAMAIS deux changements simultanés.
`
      : "Aucun contexte de session fourni — répondre de façon générale en demandant les infos manquantes si nécessaire.";

    // === Instructions de format (forcé JSON pour UI) ===
    const formatInstructions = `

# FORMAT DE RÉPONSE OBLIGATOIRE

Tu réponds UNIQUEMENT en JSON valide avec deux clés : "message" et "apply".

"message" : ta réponse en français. Suis le format DIAGNOSTIC / CAUSE PROBABLE / ACTION CONCRÈTE / POURQUOI (2-3 lignes max) / POUR APPROFONDIR / À OBSERVER (cf. methodologie-coach.md). Max 250 mots. Utilise le vocabulaire pilote karting (rotation, délestage, light hands, freinage dégressif, point de corde, point d'accélération, micro-glisse contrôlée, châssis qui respire). Bannis le jargon générique IA.

"apply" : objet JSON avec UNIQUEMENT les réglages châssis à modifier (laisser {} si aucun changement à appliquer).

Format apply autorisé :
{
  "barre": "sans" | "plate_h" | "ronde" | "plate_v",
  "voieAv": nombre 0-6 (valeur absolue en bagues),
  "pincement": nombre -3 à +3 (valeur absolue),
  "voieAr": nombre delta en cm (ex: +0.5 ou -0.5),
  "arbre": "court" | "standard" | "tendre" | "medium" | "dur",
  "moyeux": "courts" | "medium" | "longs",
  "parechocs": "desserre" | "serre",
  "chasse": nombre delta (ex: +1 ou -1),
  "gardeAv": "bas" | "medium" | "haut",
  "gardeAr": "bas" | "medium" | "haut"
}

RÈGLES NON-NÉGOCIABLES :
- Retourne UNIQUEMENT le JSON brut, JAMAIS de backticks markdown.
- Un seul changement à la fois (sauf cas extrême avec justification explicite).
- Si la question est purement conceptuelle/théorique, "apply": {}.
- Si la question touche à la préparation / modification / boost moteur ou au contournement réglementaire : REFUSE selon la formulation type décrite dans methodologie-coach.md § Garde-fous, et "apply": {}.
- Personnalise TOUJOURS selon le profil pilote (taille, poids, style) et le châssis. Un même réglage ne convient pas à deux pilotes différents.
- Quand la profondeur conceptuelle dépasse 2-3 lignes : renvoie vers le guide PDF "Quand comprendre change tout" (cf. politique anti-cannibalisation dans methodologie-coach.md).
- Tu disposes de l'historique de la conversation : tiens compte des échanges précédents (réglages déjà testés, problèmes déjà évoqués), ne te répète pas.

${contextStr}
`;

    // === System prompt : noyau caché + modules conditionnels cachés + format ===
    const skillModules = selectSkillModules(message, context);
    const system = [
      {
        type: "text",
        text: SKILL_CORE, // ~30k tokens — gros, stable, cachable (TTL 5 min)
        cache_control: { type: "ephemeral" },
      },
    ];
    if (skillModules) {
      system.push({
        type: "text",
        text: skillModules, // racecraft/circuits — caché séparément par combinaison
        cache_control: { type: "ephemeral" },
      });
    }
    system.push({ type: "text", text: formatInstructions }); // petit, variable selon contexte

    // === Messages : historique de conversation + question actuelle ===
    const messages = [
      ...(Array.isArray(history) ? history.map((h) => ({ role: h.role, content: h.content })) : []),
      { role: "user", content: message },
    ];

    // max_tokens 1000 : la réponse fait 250 mots max (~400 tokens) + marge JSON.
    // Limite la latence (timeout Netlify 10s par défaut, pas de streaming en MVP).
    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1000,
      system,
      messages,
    });

    // === Parse JSON de la réponse Claude ===
    let parsed;
    try {
      let raw = response.content[0].text.trim();
      // Nettoyer d'éventuels backticks markdown malgré l'instruction
      raw = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
      parsed = JSON.parse(raw);
    } catch (e) {
      // Si Claude n'a pas respecté le format JSON, on encapsule le texte brut
      parsed = {
        message: response.content[0].text,
        apply: {},
      };
    }

    // === Incrément du compteur d'usage (après succès uniquement) ===
    if (user && !quota.unlimited) {
      const newCount = await incrementUsage(admin, user.id);
      if (newCount !== null) {
        parsed.quota = { used: newCount, limit: quota.limit };
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(parsed),
    };
  } catch (err) {
    console.error("Erreur chat function:", err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        message: "Erreur serveur. Vérifie ta clé API dans les variables d'environnement Netlify (ANTHROPIC_API_KEY).",
        apply: {},
      }),
    };
  }
};
