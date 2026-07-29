// =============================================
// Race Engineer AI : Function chat
// Intègre le skill pilotage-karting comme system prompt avec prompt caching
// Garde-fous moteur stricts (refus avant API)
// Auth Supabase obligatoire + quota mensuel freemium
// Mémoire de conversation (12 derniers messages)
// Modèle : Claude Opus 5 (surchargeable par la variable CLAUDE_MODEL)
// =============================================

const Anthropic = require("@anthropic-ai/sdk");
const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");
// Registre des spécificités châssis × moteur : c'est lui qui garantit qu'un
// Sodikart en Rotax ne reçoit pas le même diagnostic qu'un Tony Kart en X30.
const { buildKartSpecBlock, getLeviersAbsents, CARBU_HORS_LEVIERS } = require("./kart-specs");

// =============================================
// CONFIG (env vars)
// =============================================
const SUPABASE_URL = process.env.SUPABASE_URL || "https://hkpknrrymgbnjmbewlyc.supabase.co";
// ⚠️ Repli obligatoire : sans lui, si la variable d'env Netlify n'est pas
// réglée (ou mal réglée), SUPABASE_ANON_KEY vaut "" et authenticateUser()
// refuse alors TOUT LE MONDE, jeton valide ou non — la clé anon Supabase est
// publique par conception (protégée par RLS, jamais un secret), donc ce
// repli est aussi sûr que le SUPABASE_URL codé en dur juste au-dessus.
// C'est la cause du "reconnecte-toi" en boucle alors que le pilote est
// bien connecté (identique à la clé codée en dur dans index.html).
const SUPABASE_ANON_KEY =
  process.env.SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhrcGtucnJ5bWdibmptYmV3bHljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE2ODgyNzksImV4cCI6MjA5NzI2NDI3OX0.kNbCMJK2FNxoiPOFxgWNoh7sqb89gAAxumZGqTWW014";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
// Dev local uniquement : ALLOW_ANON_CHAT=true dans .env pour tester sans compte
const ALLOW_ANON_CHAT = process.env.ALLOW_ANON_CHAT === "true";

// =============================================
// MODÈLE
// =============================================
// Le diagnostic et le chat partagent le MÊME modèle, volontairement : le cache
// de prompt est lié au modèle, et les deux partagent ~30k tokens de skill.
// Deux modèles différents = deux caches à payer au lieu d'un.
//
// Réglable sans redéploiement via les variables d'environnement Netlify, pour
// arbitrer qualité / latence / coût une fois mesuré en conditions réelles.
const MODEL = process.env.CLAUDE_MODEL || "claude-opus-5";
// Le diagnostic porte la valeur du produit : il réfléchit plus que le chat.
const EFFORT_DIAGNOSTIC = process.env.CLAUDE_EFFORT_DIAGNOSTIC || "medium";
const EFFORT_CHAT = process.env.CLAUDE_EFFORT_CHAT || "low";
// ⚠️ Sur Opus 5 la réflexion est active par défaut et compte DANS max_tokens.
// Un budget calé sur la seule réponse tronquerait le JSON en plein milieu.
const MAX_TOKENS_DIAGNOSTIC = parseInt(process.env.CLAUDE_MAX_TOKENS_DIAGNOSTIC, 10) || 4000;
const MAX_TOKENS_CHAT = parseInt(process.env.CLAUDE_MAX_TOKENS_CHAT, 10) || 3000;
// =============================================
// CRÉDITS (aligné sur les offres : Découverte 100 / Saison Pro 500 / Paddock 1500)
// 1 message coach IA = 10 crédits. Le diagnostic express local reste gratuit.
// La DB compte les MESSAGES (ai_usage.count) ; la conversion en crédits se fait ici (count × 10).
// =============================================
const CREDITS_PER_MESSAGE = 10;
const PLAN_MONTHLY_CREDITS = {
  free: parseInt(process.env.FREE_MONTHLY_CREDITS, 10) || 100,
  pro: 500,
  founder: 500, // fondateurs = Saison Pro à vie
  club: 500,   // legacy
  paddock: 1500,
};

// =============================================
// SETUP_LIMITS : miroir serveur de la table du front (index.html).
// Sert à DEUX choses : décrire les butées à Claude dans le prompt, et
// borner son "apply" avant de le renvoyer au navigateur.
// ⚠️ Toute modification ici doit être répercutée dans index.html.
// =============================================
const SETUP_LIMITS = {
  // Plage réelle d'utilisation, pas la plage théorique : sous 136 on ne roule
  // pas, même sous la pluie. Doit rester alignée avec index.html.
  voieAr:    { min: 136, max: 140, unit: 'cm', label: 'Voie arrière' },
  voieAv:    { min: 0,  max: 6,  unit: 'bagues', label: 'Voie avant' },
  pincement: { min: -3, max: 3,  unit: '',      label: 'Pincement' },
  chasse:    { min: -1, max: 4,  unit: 'crans', label: 'Chasse' },
  carrossage: { min: -3, max: 3, unit: '',      label: 'Carrossage' },
  // ⛔ Pas de gicleur ici : depuis le 2026-07-29 la carburation n'est plus un
  // levier de l'outil (cf. CARBU_HORS_LEVIERS dans kart-specs.js). Une plage
  // affichée dans "PLAGES DE RÉGLAGE DISPONIBLES" reviendrait à inviter le
  // modèle à s'en servir. Le gicleur reste une donnée de contexte, plus bas.
};

// Pressions : gérées à part car ce sont des deltas en bar appliqués à un
// ESSIEU entier (c'est ainsi qu'un ingénieur raisonne), pas à une roue.
// Transmission : la plage dépend de la famille moteur, donc le champ visé
// change aussi. Bornes alignées sur les curseurs du formulaire.
const TRANSMISSION_LIMITS = {
  mono: { couronne: { min: 60, max: 90 }, pignon: { min: 9, max: 14 } },
  dd2:  { couronne: { min: 32, max: 38 } }, // le contre-pignon suit (somme = 100)
  kz:   { couronne: { min: 16, max: 26 } },
};

// Bornes alignées sur les champs du formulaire (0.5 à 2.0 bar).
const PRESSURE_LIMITS = {
  pressionAv: { min: 0.5, max: 2.0, maxDelta: 0.15, label: 'Pression avant (à froid)', roues: ['avg', 'avd'] },
  pressionAr: { min: 0.5, max: 2.0, maxDelta: 0.15, label: 'Pression arrière (à froid)', roues: ['arg', 'ard'] },
};

// Décrit les butées ET signale celles déjà atteintes, pour que Claude ne
// propose jamais d'aller au-delà (le pilote à 140.0 de voie AR ne doit pas
// s'entendre dire "élargis encore").
function buildLimitsBlock(context) {
  const lines = [];
  const reached = [];
  for (const [key, lim] of Object.entries(SETUP_LIMITS)) {
    lines.push(`- ${lim.label} : de ${lim.min} à ${lim.max}${lim.unit ? ' ' + lim.unit : ''}${lim.note ? ', ' + lim.note : ''}`);
    const v = context ? parseFloat(context[key]) : NaN;
    if (isNaN(v)) continue;
    if (v >= lim.max) reached.push(`${lim.label} : ${v}${lim.unit ? ' ' + lim.unit : ''}, on ne peut plus l'augmenter`);
    else if (v <= lim.min) reached.push(`${lim.label} : ${v}${lim.unit ? ' ' + lim.unit : ''}, on ne peut plus le réduire`);
  }
  let block = `\nPLAGES DE RÉGLAGE DISPONIBLES\n=============================\n${lines.join("\n")}\n`;
  if (reached.length) {
    block += `\nLEVIERS INDISPONIBLES SUR CE KART (déjà au bout de leur plage) :\n${reached.map((r) => "- " + r).join("\n")}\n`;
    block += `→ Raisonne comme si ces leviers n'existaient pas. Ne les propose pas, et n'explique pas au pilote qu'ils sont en butée : il le sait, il a réglé son kart lui-même. Trouve simplement autre chose.\n`;
  }
  return block;
}

// Borne l'apply de Claude et n'en garde qu'UN SEUL levier (méthode
// "un seul changement à la fois"). Les valeurs numériques sont des DELTAS.
const APPLY_ENUMS = {
  barre: ["sans", "plate_h", "ronde", "plate_v"],
  arbre: ["tendre", "medium", "dur"],            // rigidité
  arbreLongueur: ["court", "standard", "long"],  // longueur, indépendante
  // ⚠️ siege / siegeHauteur volontairement ABSENTS.
  // La position de siège se règle au montage du châssis, aux cotes du
  // constructeur, et ne se touche quasiment jamais sur un week-end de course.
  // C'est une DONNÉE DE CONTEXTE (répartition de masse), pas un levier de
  // réglage. La proposer en un clic entre deux relais serait un contresens.
  moyeux: ["courts", "medium", "longs"],
  parechocs: ["desserre", "serre"],
  gardeAv: ["bas", "medium", "haut"],
  gardeAr: ["bas", "medium", "haut"],
};

// Le prompt interdit déjà le tiret cadratin, mais un modèle finit toujours par
// en glisser un. Filet de sécurité : on nettoie tout texte sortant.
// U+2014 (cadratin) et U+2013 (demi-cadratin) deviennent une ponctuation
// française naturelle. Le trait d'union U+002D des mots composés est préservé.
// U+2014 = tiret cadratin, U+2013 = demi-cadratin. Écrits en échappements pour
// que le caractère lui-même n'apparaisse dans AUCUN fichier du projet.
const DASH_RE = new RegExp("\s*[\u2014\u2013]\s*", "g");

function stripLongDashes(value) {
  if (typeof value === "string") {
    return value.replace(DASH_RE, (m, offset, str) => {
      // Entre deux chiffres il s'agit d'un intervalle (124-136) : trait d'union
      const before = str[offset - 1];
      const after = str[offset + m.length];
      if (/\d/.test(before || "") && /\d/.test(after || "")) return "-";
      // Si la suite de la phrase porte déjà un deux-points, la virgule évite
      // une ponctuation doublée qui se verrait autant que le tiret.
      const rest = str.slice(offset + m.length).split(/[.\n]/)[0];
      return rest.includes(":") ? ", " : " : ";
    });
  }
  if (Array.isArray(value)) return value.map(stripLongDashes);
  if (value && typeof value === "object") {
    const out = {};
    for (const [k, v] of Object.entries(value)) out[k] = stripLongDashes(v);
    return out;
  }
  return value;
}

function sanitizeApply(apply, context) {
  if (!apply || typeof apply !== "object" || Array.isArray(apply)) {
    return { apply: {}, notes: [] };
  }
  const clean = {};
  const notes = [];
  const ctx = context || {};

  // KART DE LOCATION : le pilote ne peut RIEN regler. Le prompt le dit deja,
  // mais rien ne l'empechait : un bouton "appliquer" apparaissait sur un kart
  // auquel il n'a pas acces.
  if (ctx.mode === "location") {
    return {
      apply: {},
      notes: Object.keys(apply).length
        ? ["Kart de location : aucun réglage n'est modifiable, le gain est à chercher dans le pilotage."]
        : [],
    };
  }

  // Un levier absent de ce chassis ne doit jamais etre applique, meme si le
  // modele le propose : sur un Sodikart, "changer la barre avant" n'a pas de
  // sens physique, le reglage passe par la bague excentrique.
  const absents = getLeviersAbsents(context);

  // Carburation hors leviers pour TOUS les moteurs (cf. CARBU_HORS_LEVIERS
  // dans kart-specs.js) : un gicleur juste depend de la densite de l'air, que
  // l'app ne mesure pas, et se tromper coute un moteur. Le prompt l'interdit
  // deja ; ce filet retire le conseil si le modele passe outre. Le 4 temps
  // garde sa formulation propre : chez lui c'est le reglement qui scelle.
  const carbuScellee = ctx.moteur_family === "4t";

  for (const [key, value] of Object.entries(apply)) {
    if (absents.includes(key)) {
      notes.push(`Ce châssis n'a pas de réglage "${key}" : conseil retiré.`);
      continue;
    }
    if (key === "gicleur" || key === "carburation") {
      notes.push(
        carbuScellee
          ? "Carburation scellée par le règlement sur ce moteur : le conseil sur le gicleur a été retiré."
          : "La carburation ne fait pas partie des leviers de cet outil : un gicleur juste dépend de la pression atmosphérique et de l'altitude, que l'app ne mesure pas. Conseil retiré : c'est le domaine de ton motoriste et de l'app officielle ROTAX MAX Jetting."
      );
      continue;
    }
    if (APPLY_ENUMS[key]) {
      if (APPLY_ENUMS[key].includes(value)) clean[key] = value;
      continue;
    }

    // Transmission : delta en dents, borné selon la famille moteur
    if (key === "couronne" || key === "pignon") {
      if (typeof value !== "number" || !isFinite(value) || value === 0) continue;
      const type = (context && context.moteur_type) || "mono";
      const lim = (TRANSMISSION_LIMITS[type] || {})[key];
      if (!lim) {
        notes.push(`Ce moteur n'a pas de réglage "${key}" ajustable : conseil retiré.`);
        continue;
      }
      const cur = context
        ? parseFloat(key === "pignon" ? context.pignonMono
            : type === "dd2" ? context.couronneDD2
            : type === "kz" ? context.couronneKz
            : context.couronneMono)
        : NaN;
      if (!isNaN(cur)) {
        if ((value > 0 && cur >= lim.max) || (value < 0 && cur <= lim.min)) {
          notes.push(`${key === "pignon" ? "Pignon" : "Couronne"} déjà en butée (${cur} dents) : conseil retiré.`);
          continue;
        }
        const cible = Math.max(lim.min, Math.min(lim.max, cur + value));
        clean[key] = Math.round(cible - cur);
        if (clean[key] === 0) continue;
      } else {
        clean[key] = Math.round(value);
      }
      continue;
    }

    // Pressions : delta en bar sur un essieu, plafonné pour éviter qu'un
    // conseil ne rende le kart dangereux ou inexploitable en une fois.
    const pl = PRESSURE_LIMITS[key];
    if (pl) {
      if (typeof value !== "number" || !isFinite(value) || value === 0) continue;
      let d = Math.max(-pl.maxDelta, Math.min(pl.maxDelta, value));
      if (Math.abs(d - value) > 0.001) {
        notes.push(`${pl.label} : correction ramenée à ${d > 0 ? "+" : ""}${d.toFixed(2)} bar (un pas plus grand n'est pas exploitable en une session).`);
      }
      // Vérification contre la pression réelle si elle est connue
      const p = context && context.pressures;
      const courante = p && p[pl.roues[0]] ? parseFloat(p[pl.roues[0]].froid) : NaN;
      if (!isNaN(courante)) {
        const cible = Math.max(pl.min, Math.min(pl.max, courante + d));
        d = Math.round((cible - courante) * 100) / 100;
        if (Math.abs(d) < 0.005) {
          notes.push(`${pl.label} est déjà en limite de plage : ce conseil a été retiré.`);
          continue;
        }
      }
      clean[key] = Math.round(d * 100) / 100;
      continue;
    }
    const lim = SETUP_LIMITS[key];
    if (!lim || typeof value !== "number" || !isFinite(value) || value === 0) continue;

    const current = context ? parseFloat(context[key]) : NaN;
    if (!isNaN(current)) {
      // Déjà en butée dans le sens demandé → on retire le conseil
      if ((value > 0 && current >= lim.max) || (value < 0 && current <= lim.min)) {
        notes.push(`${lim.label} est déjà à sa butée (${current}${lim.unit ? " " + lim.unit : ""}) : ce conseil a été retiré.`);
        continue;
      }
      // Le delta dépasserait la butée → on le tronque
      const target = current + value;
      const clamped = Math.max(lim.min, Math.min(lim.max, target));
      if (Math.abs(clamped - target) > 0.001) {
        notes.push(`${lim.label} : conseil ramené à la butée ${clamped}${lim.unit ? " " + lim.unit : ""}.`);
      }
      const delta = clamped - current;
      if (Math.abs(delta) < 0.001) continue;
      clean[key] = Math.round(delta * 100) / 100;
    } else {
      clean[key] = value;
    }
  }

  // Un seul changement à la fois : si Claude en propose plusieurs, on garde le
  // premier (les autres restent décrits dans le texte de sa réponse).
  const keys = Object.keys(clean);
  if (keys.length > 1) {
    const kept = keys[0];
    keys.slice(1).forEach((k) => delete clean[k]);
    notes.push(`Plusieurs réglages proposés : seul "${kept}" est appliquable en un clic (un seul changement à la fois).`);
  }

  return { apply: clean, notes };
}

// Libellés des symptômes : le code interne ne doit jamais atteindre le modèle
// tel quel ("understeer_entry" est plus pauvre que "sous-virage à l'entrée").
// ⚠️ Doit rester aligné avec KB.diagnostics dans index.html.
const SYMPTOM_LABELS = {
  understeer_entry: "sous-virage à l'entrée du virage",
  understeer_mid: "sous-virage en milieu de virage (en appui)",
  oversteer_entry: "survirage à l'entrée du virage",
  oversteer_exit: "survirage à la sortie du virage",
  no_rotation: "le kart refuse de tourner, pas de rotation",
  too_much_rotation: "trop de rotation, kart nerveux",
  good_entry_bad_exit: "bonne entrée mais mauvaise sortie",
  general_lack_of_grip: "manque de grip général",
  instability_straight: "instabilité en ligne droite",
  balanced: "kart équilibré, pas de défaut marqué",
};

// Chronos et régularité.
// ⚠️ La couche locale du navigateur calcule déjà l'écart et affiche un verdict
// avec des seuils précis. Si le modèle raisonne sur des chronos bruts, il peut
// écrire l'inverse de ce que le pilote lit juste au-dessus, sur le même écran.
// On lui transmet donc le MÊME calcul et les MÊMES seuils.
// ⚠️ Doit rester aligné avec regularityVerdict() dans index.html.
function parseChronoServer(v) {
  if (typeof v !== "string" || !v.trim()) return null;
  const s = v.trim().replace(",", ".");
  const m = s.match(/^(?:(\d+):)?(\d+(?:\.\d+)?)$/);
  if (!m) return null;
  const sec = (m[1] ? parseInt(m[1], 10) * 60 : 0) + parseFloat(m[2]);
  return isFinite(sec) && sec > 0 ? sec : null;
}

function buildChronoBlock(context) {
  const c = context || {};
  const best = parseChronoServer(c.chronoBest);
  const avg = parseChronoServer(c.chronoAvg);
  let bloc = `\nCHRONOS\n- Meilleur tour : ${c.chronoBest || "non renseigné"}\n- Tour moyen : ${c.chronoAvg || "non renseigné"}\n- Nombre de tours : ${c.chronoLaps || "non renseigné"}\n`;

  if (best && avg && avg >= best) {
    const gap = avg - best;
    const verdict = gap <= 0.15
      ? "TRÈS RÉGULIER : le rythme est là, le gain restant est dans le tour pur"
      : gap <= 0.4
      ? "RÉGULARITÉ MOYENNE : du temps se perd dans l'inconstance"
      : "IRRÉGULIER : le plus gros gain est dans la constance, pas dans le tour parfait";
    bloc += `- Écart meilleur / moyen : +${gap.toFixed(2)} s → ${verdict}\n`;
    bloc += "→ Ce verdict est DÉJÀ AFFICHÉ au pilote juste au-dessus de ton diagnostic. Appuie-toi dessus, ne le contredis pas et ne recalcule pas différemment.\n";
    if (gap > 0.4) {
      bloc += "→ Avec un tel écart, un réglage châssis ne réglera pas le problème principal. Dis-le franchement et oriente vers la régularité.\n";
    }
  } else if (best && !avg) {
    bloc += "→ Le tour moyen manque : tu ne peux rien conclure sur la régularité. Demande-le pour la prochaine session.\n";
  } else if (!best) {
    bloc += "→ Aucun chrono renseigné : ne fais aucune hypothèse de performance chiffrée.\n";
  }

  if (c.deltaSessionPrecedente != null && c.circuitNamePrecedent) {
    const d = parseFloat(c.deltaSessionPrecedente);
    if (isFinite(d)) {
      bloc += `- Comparaison avec la session précédente sur ${c.circuitNamePrecedent} : ${d >= 0 ? "+" : ""}${d.toFixed(2)} s sur le meilleur tour (${d < 0 ? "PROGRÈS" : d > 0 ? "RECUL" : "stable"}).\n`;
      bloc += "→ Croise cette évolution avec le dernier changement testé avant de conclure.\n";
    }
  }
  return bloc;
}

// Met en forme les pressions pour le prompt.
// ⚠️ Elles étaient totalement absentes du contexte envoyé au modèle, alors
// que le format de réponse lui demandait de les commenter : il ne pouvait
// que les inventer ou les éluder. C'est pourtant le premier levier du kart.
const TIRE_LABELS = { avg: "AV gauche", avd: "AV droit", arg: "AR gauche", ard: "AR droit" };

function buildPressureBlock(context) {
  const p = context && context.pressures;
  if (!p || typeof p !== "object") {
    return "\nPressions pneus : NON RENSEIGNÉES. Ne commente pas les pressions et ne fais aucune hypothèse dessus. Si le symptôme décrit peut venir des pneus, demande au pilote de les relever froid ET chaud.\n";
  }
  const lignes = [];
  let mesures = 0;
  for (const [k, label] of Object.entries(TIRE_LABELS)) {
    const t = p[k];
    if (!t || t.froid == null || isNaN(parseFloat(t.froid))) continue;
    mesures++;
    const froid = parseFloat(t.froid).toFixed(2);
    const chaud = t.chaud != null && !isNaN(parseFloat(t.chaud)) ? parseFloat(t.chaud).toFixed(2) : null;
    const delta = t.delta != null && !isNaN(parseFloat(t.delta)) ? parseFloat(t.delta) : null;
    let l = `- ${label} : froid ${froid} bar`;
    if (chaud) l += `, chaud ${chaud} bar`;
    if (delta != null) {
      const verdict = delta >= 0.13 && delta <= 0.17 ? "dans la cible"
        : delta < 0.10 ? "TROP FAIBLE, le pneu ne travaille pas assez"
        : delta > 0.20 ? "TROP ÉLEVÉ, le pneu travaille trop"
        : "limite, à surveiller";
      l += ` → delta ${delta >= 0 ? "+" : ""}${delta.toFixed(2)} (${verdict})`;
    }
    lignes.push(l);
  }
  if (mesures === 0) {
    return "\nPressions pneus : NON RENSEIGNÉES. Ne commente pas les pressions et ne fais aucune hypothèse dessus.\n";
  }
  let bloc = `\nPRESSIONS PNEUS (${mesures}/4 roues renseignées)\n${lignes.join("\n")}\n`;
  bloc += "→ Cible générique de delta froid vers chaud : +0.13 à +0.17 bar. Un delta trop faible signifie que le pneu ne monte pas en température (monter la pression à froid), un delta trop élevé qu'il travaille trop (la baisser).\n";
  bloc += "→ Compare aussi les CÔTÉS entre eux : un écart marqué gauche/droite sur un même essieu trahit un déséquilibre de châssis, une fuite, ou un circuit très asymétrique.\n";
  if (mesures < 4) {
    bloc += "→ Toutes les roues ne sont pas renseignées : ne conclus pas sur celles qui manquent.\n";
  }
  return bloc;
}

// Construit la demande de diagnostic à partir de la session.
// Le contexte détaillé arrive déjà par le system prompt ; ce message ne fait
// que cadrer la tâche et rappeler l'exigence d'ancrage matériel.
function buildDiagnosticPrompt(context) {
  const c = context || {};
  const chassis = c.chassis || "châssis non renseigné";
  const moteur = c.moteur || "moteur non renseigné";
  const symptome = SYMPTOM_LABELS[c.comportement] || c.comportement || "non renseigné";
  return [
    `Analyse ma session et donne-moi ton diagnostic de race engineer.`,
    `Kart : ${chassis} / ${moteur}.`,
    `Symptôme dominant que j'ai ressenti : ${symptome} (intensité ${c.intensite || "?"}/10).`,
    `Conditions : grip ${c.grip || "?"}, météo ${c.meteo || "?"}, circuit ${c.circuitName || c.circuit || "?"}.`,
    ``,
    `Tous mes réglages actuels, mes chronos et mes butées sont dans le contexte.`,
    `Ton diagnostic doit être valable pour CE ${chassis} en ${moteur} et pour aucun autre kart.`,
  ].join("\n");
}

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
  SKILL_CORE = ""; // fallback : la function marchera mais sans expertise karting
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

function selectSkillModules(message, context, isDiagnostic) {
  const modules = [];
  const sessionType = (context && context.session) || "";

  // Le diagnostic analyse SYSTÉMATIQUEMENT les pressions et la carburation :
  // ces modules ne peuvent pas dépendre du hasard des mots-clés.
  if (isDiagnostic) {
    modules.push("pneus-gommes.md");
    if (context && context.moteur_family !== "4t") modules.push("carburation.md");
  }
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
  // Dédoublonnage : un module forcé peut aussi être déclenché par un mot-clé
  return [...new Set(modules)].map((f) => SKILL_PARTS[f] || "").join("");
}

// =============================================
// CORS : restreint au site (env URL fournie par Netlify) + dev local
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

const ENGINE_REFUSAL_MESSAGE = "Je ne peux pas te répondre sur ce point, pour deux raisons :\n\n**1. Risque de casse moteur** : sans connaître l'état exact de ton moteur, te donner des indications pourrait t'amener à le détruire (et un moteur karting coûte cher).\n\n**2. Cadre réglementaire** : ce que tu décris peut sortir des règlements de ta catégorie. Tu risquerais la disqualification voire une suspension.\n\nPour ce sujet, va voir :\n- Ton préparateur moteur attitré\n- Le constructeur du moteur (IAME, Rotax, Vortex, TM, Modena, etc.)\n- Le règlement officiel de ta catégorie (CIK-FIA, FFSA, etc.)\n\nSur ce que je peux t'aider en revanche : pilotage, réglages châssis (voie, pincement, hauteur, barres, position siège, pression pneus), choix stratégie en session.";

function detectEngineMod(message) {
  return ENGINE_BLOCKED_PATTERNS.some((p) => p.test(message));
}

// =============================================
// RATE LIMITING (en mémoire, reset à chaque cold start)
// Couche d'appoint anti-rafale : la vraie protection est auth + quota
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

// Retourne { allowed, used, limit, unlimited, plan } en CRÉDITS : fail-open si la DB est KO
// (mieux vaut une réponse IA en trop qu'un produit cassé)
async function checkQuota(admin, userId) {
  const noQuota = { allowed: true, used: 0, limit: PLAN_MONTHLY_CREDITS.free, unlimited: true, plan: "free" };
  if (!admin) return noQuota;
  try {
    const { data: profile } = await admin
      .from("profiles").select("plan").eq("id", userId).single();
    const plan = (profile && profile.plan) || "free";
    const limit = PLAN_MONTHLY_CREDITS[plan] != null ? PLAN_MONTHLY_CREDITS[plan] : PLAN_MONTHLY_CREDITS.free;

    const { data: usage } = await admin
      .from("ai_usage").select("count")
      .eq("user_id", userId).eq("month", currentMonth()).maybeSingle();
    const usedCredits = ((usage && usage.count) || 0) * CREDITS_PER_MESSAGE;
    return {
      allowed: usedCredits + CREDITS_PER_MESSAGE <= limit,
      used: usedCredits,
      limit,
      unlimited: false,
      plan,
    };
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
    const { context, history, mode } = payload;
    const isDiagnostic = mode === "diagnostic";

    // En mode diagnostic, il n'y a pas de question du pilote : on construit la
    // demande à partir de la session. Le reste du pipeline (auth, quota,
    // garde-fous, skill, bornage) est strictement identique au chat.
    const message = isDiagnostic
      ? buildDiagnosticPrompt(context)
      : payload.message;

    const validationError = validateInputs(message, isDiagnostic ? [] : history, context);
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

    // === QUOTA mensuel en crédits (selon le plan) ===
    const admin = user ? getAdminClient() : null;
    let quota = { allowed: true, used: 0, limit: PLAN_MONTHLY_CREDITS.free, unlimited: true, plan: "free" };
    if (user) {
      quota = await checkQuota(admin, user.id);
      if (!quota.allowed) {
        const upsell = quota.plan === "free"
          ? " Passe en Saison Pro pour 500 crédits chaque mois (guide offert)."
          : "";
        return {
          statusCode: 403,
          headers,
          body: JSON.stringify({
            code: "quota_exceeded",
            message: `Tu as utilisé tes ${quota.limit} crédits coach IA du mois. Ils se rechargent le 1er du mois prochain. (Le diagnostic express et ton historique restent dispo sans limite.)${upsell}`,
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
- Kart : ${context.mode === "location" ? "LOCATION / LOISIR, aucun réglage châssis ou moteur possible" : "kart personnel réglable"}
${context.pilote === "enfant" ? `
RÈGLE PARENT (prioritaire) : tu parles à un parent qui gère le kart de son enfant, souvent sans bagage mécanique. Ton rassurant et pédagogique, chaque terme technique expliqué en une phrase, la SÉCURITÉ passe avant la performance, parle du pilote à la troisième personne ("ton enfant", "le pilote"). Jamais culpabilisant, un week-end raté n'est pas une faute.` : ""}
${context.mode === "location" ? `
RÈGLE LOCATION (prioritaire) : le pilote roule en location, il ne peut RIEN régler : "apply" doit TOUJOURS être {}. Focalise 100 % du diagnostic sur le pilotage : freinage dégressif, light hands, rotation par délestage, point d'accélération, trajectoire dictée par le grip, régularité, mental. Si le comportement décrit semble venir du matériel (kart fatigué), conseille de le signaler à l'accueil et d'en changer.` : ""}

${buildKartSpecBlock(context)}

Conditions session :
- Grip piste : ${context.grip || "non renseigné"}
- Météo : ${context.meteo || "non renseigné"}
- Temp air : ${context.tempAir || "?"}°C, Temp piste : ${context.tempPiste || "?"}°C
- Circuit : ${context.circuitName || "non précisé"} (type : ${context.circuit || "non renseigné"})
  ${context.circuitName ? "→ Si ce circuit est documenté dans circuits.md, exploite ses spécificités (profil, secteurs, pièges, réglage type). Sinon, demande au pilote de décrire le tracé, n'invente jamais de specs." : ""}
- Type session : ${context.session || "non renseigné"}
- Problème dominant : ${SYMPTOM_LABELS[context.comportement] || context.comportement || "non renseigné"}
- Intensité : ${context.intensite || "?"}/10
${buildChronoBlock(context)}
- Tendance multi-sessions : ${context.insightsSummary || "pas encore assez de sessions pour dégager une tendance"}
  → Un symptôme qui revient session après session malgré des réglages ou conditions différents pointe vers le pilotage, pas le matériel. Exploite cette tendance dans ton diagnostic.

Réglages actuels (châssis) :
- Barre avant : ${context.barre || "?"}
- Voie avant : ${context.voieAv || "?"} bagues
- Pincement : ${context.pincement || "?"}
- Voie arrière : ${context.voieAr || "?"} cm
- Arbre : rigidité ${context.arbre || "?"}, longueur ${context.arbreLongueur || "?"} (deux réglages indépendants : un arbre peut être court ET dur)
- Moyeux : ${context.moyeux || "?"}
- Pare-chocs : ${context.parechocs || "?"}
- Chasse (caster, agit sur l'entrée) : ${context.chasse || "?"}
- Carrossage (camber, agit sur le milieu/sortie) : ${context.carrossage || "?"}
- Position siège : ${context.siege || "?"} (hauteur : ${context.siegeHauteur || "?"})
- Lestage : ${context.lestage && context.lestage !== "0" ? context.lestage + " kg" : "aucun"}
  ⚠️ SIÈGE ET LESTAGE = DONNÉES DE CONTEXTE, PAS DES LEVIERS.
  Le siège se positionne au montage du châssis, aux cotes du constructeur, et
  ne se déplace quasiment jamais sur un week-end. Ne propose JAMAIS de le
  bouger comme réglage de session. Sers-t'en pour COMPRENDRE la répartition de
  masse et expliquer un comportement : siège avancé = beaucoup d'avant et de
  turn-in ; reculé = traction en sortie mais sous-virage à l'entrée. Si tu es
  convaincu que la position est réellement inadaptée au pilote ou au moteur
  (gros moteurs plutôt reculés, petits moteurs plutôt centrés), dis-le comme
  une remarque de fond à traiter à l'atelier, hors session, et pas comme
  l'action du jour.
- Garde au sol AV/AR : ${context.gardeAv || "?"} / ${context.gardeAr || "?"}

${buildLimitsBlock(context)}
Réglages moteur (DESCRIPTIFS UNIQUEMENT, pas de modifs internes) :
${context.moteur_type === "dd2"
    ? `- Couronne DD2 : ${context.couronneDD2 || "?"} dents / Contre-pignon : ${context.couronneDD2 ? 100 - parseInt(context.couronneDD2, 10) : "?"} dents (somme = 100)`
    : context.moteur_type === "kz"
    ? `- Couronne KZ (sortie de boîte) : ${context.couronneKz || "?"} dents\n- Réglage boîte : ${context.kzRatio || "?"}`
    : `- Couronne : ${context.couronneMono || "?"} dents\n- Pignon : ${context.pignonMono || "?"} dents\n- Rapport (couronne ÷ pignon) : ${context.rapportMono || "?"}`}
- Gicleur monté : ${context.moteur_family === "4t" ? "carburation scellée par le règlement, AUCUN réglage possible" : context.gicleur || "?"}
  ⚠️ DONNÉE DE CONTEXTE, PAS UN LEVIER. Elle est là pour t'aider à interpréter
  un symptôme moteur (étouffement en bout de ligne droite, moteur qui monte
  mal en régime). Tu ne proposes JAMAIS de la changer et tu ne donnes JAMAIS
  de valeur cible : voir la règle carburation plus bas.

${buildPressureBlock(context)}
Gomme montée : ${[context.pneuMarque, context.pneuModele].filter(Boolean).join(" ") || "NON RENSEIGNÉE"}
${context.pneuMarque
    ? "→ Utilise la fenêtre de pression propre à cette gomme (cf. pneus-gommes.md). N'invente jamais un chiffre précis pour un modèle que tu ne connais pas : dis-le et renvoie à la fiche du manufacturier."
    : "→ La gomme n'est pas renseignée. Raisonne sur le DELTA froid/chaud uniquement, ne donne aucune pression absolue cible, et demande au pilote quelle gomme il monte."}

Notes pilote : ${context.notes || "aucune"}

Suivi de test (méthode "un seul changement à la fois") :
- Test EN COURS (verdict pas encore donné) : ${context.pendingTest && Array.isArray(context.pendingTest.changes) ? context.pendingTest.changes.join(" · ") : "aucun"}
- Dernier test CONCLU : ${context.lastTest && Array.isArray(context.lastTest.changes) ? `${context.lastTest.changes.join(" · ")} → verdict pilote : ${context.lastTest.verdict || "?"}` : "aucun"}
→ Si un test est en cours, demande d'abord le verdict avant de proposer un nouveau changement. Si le dernier verdict est "pire", envisage le retour au réglage précédent avant toute nouvelle piste. Ne propose JAMAIS deux changements simultanés.
`
      : "Aucun contexte de session fourni : répondre de façon générale en demandant les infos manquantes si nécessaire.";

    // === Instructions de format (forcé JSON pour UI) ===
    // Deux modes partagent le MÊME préfixe de system prompt (skill + modules),
    // donc le cache Anthropic est mutualisé entre le chat et le diagnostic.
    // Seul ce bloc final change.
    const responseShape = isDiagnostic
      ? `
Tu réponds UNIQUEMENT en JSON valide avec ces clés :

{
  "titre":     "une phrase qui nomme le problème dominant, calibrée sur CE kart (max 90 caractères)",
  "lecture":   "ce que disent les données de la session (chronos, régularité, pressions, conditions). 2 phrases max. Si une donnée manque, dis-le au lieu d'inventer.",
  "pilotage":  "le réflexe PILOTAGE à vérifier avant tout réglage. Toujours en premier : c'est la règle de la maison. 2 phrases max.",
  "cause":     "la cause mécanique la plus probable, ANCRÉE sur ce châssis et ce moteur précis. Nomme la marque. 2-3 phrases.",
  "action":    "LE seul changement à faire maintenant, avec sa valeur chiffrée de départ et d'arrivée. Un seul.",
  "pourquoi":  "pourquoi ce levier-là sur CE châssis plutôt qu'un autre. 2 phrases max.",
  "aObserver": "ce que le pilote doit ressentir au prochain relais pour valider ou invalider. 1-2 phrases.",
  "confiance": "haute" | "moyenne" | "faible",
  "apply":     { ... }
}

FRONTIÈRE INGÉNIEUR / COACH (positionnement produit, non négociable) :
- Ton métier ici est INGÉNIEUR DE COURSE, pas coach de pilotage. Tu es excellent
  sur ce qui se mesure et se règle : données de session, comportement du kart,
  choix du levier, méthode de test. Tu es bref sur ce qui s'entraîne.
- Le champ "pilotage" est un RÉFLEXE À VÉRIFIER, en 2 phrases maximum. C'est un
  garde-fou pour éviter de régler un problème qui vient du pilote, pas une
  séance de coaching.
- Quand le problème est clairement du ressort du pilotage et pas du matériel
  (symptôme qui revient session après session malgré des réglages différents,
  écart meilleur tour / tour moyen supérieur à 0.4 s, ressenti qui change d'un
  virage à l'autre sans changement de kart), DIS-LE FRANCHEMENT et n'essaie pas
  de le corriger toi-même par un réglage. Formule-le ainsi : le kart n'est pas
  le frein principal aujourd'hui, ce qui se joue là se travaille en roulant et
  s'accompagne mieux avec un vrai coach ou un pilote expérimenté à tes côtés.
- Ne construis JAMAIS un plan d'entraînement, une progression sur plusieurs
  semaines, ou un programme d'exercices. Ce n'est pas ton rôle : tu donnes le
  point à travailler au prochain relais, une seule chose, et tu t'arrêtes là.

RÈGLES DU DIAGNOSTIC :
- "confiance" reflète honnêtement ta certitude. "faible" si les données manquent
  ou si la marque du châssis n'est pas documentée. Ne bluffe jamais.
- Si le symptôme dominant n'est pas renseigné, dis dans "lecture" quelle
  information manque et pose la question dans "aObserver".
- N'invente JAMAIS une caractéristique de châssis absente de la fiche matériel.
  Si tu n'as pas la donnée pour cette marque, applique la physique générale et
  dis-le explicitement dans "cause".`
      : `
Tu réponds UNIQUEMENT en JSON valide avec deux clés : "message" et "apply".

"message" : ta réponse en français. Suis le format DIAGNOSTIC / CAUSE PROBABLE / ACTION CONCRÈTE / POURQUOI (2-3 lignes max) / POUR APPROFONDIR / À OBSERVER (cf. methodologie-coach.md). Max 250 mots. Utilise le vocabulaire pilote karting (rotation, délestage, light hands, freinage dégressif, point de corde, point d'accélération, micro-glisse contrôlée, châssis qui respire). Bannis le jargon générique IA.`;

    const formatInstructions = `

# FORMAT DE RÉPONSE OBLIGATOIRE
${responseShape}

"apply" : objet JSON avec UNIQUEMENT les réglages châssis à modifier (laisser {} si aucun changement à appliquer).

Format apply autorisé : ⚠️ TOUTES les valeurs numériques sont des DELTAS
(l'écart à appliquer au réglage actuel), JAMAIS des valeurs absolues :
{
  "barre": "sans" | "plate_h" | "ronde" | "plate_v",
  "voieAv": delta en bagues (ex: +1 ou -1),
  "pincement": delta (ex: +1 ou -1),
  "voieAr": delta en cm (ex: +0.5 ou -0.5),
  "arbre": "tendre" | "medium" | "dur"          (rigidité de l'arbre),
  "arbreLongueur": "court" | "standard" | "long" (longueur de l'arbre),
  "moyeux": "courts" | "medium" | "longs",
  "parechocs": "desserre" | "serre",
  "chasse": delta en crans (ex: +1 ou -1),
  "carrossage": delta (ex: +1 ou -1),
  "pressionAv": delta en bar sur la pression AVANT à froid (ex: +0.05 ou -0.05),
  "pressionAr": delta en bar sur la pression ARRIÈRE à froid (ex: +0.05 ou -0.05),
  "couronne": delta en dents (ex: +1 ou -1),
  "pignon": delta en dents, direct drive uniquement (ex: +1 ou -1),
  "gardeAv": "bas" | "medium" | "haut",
  "gardeAr": "bas" | "medium" | "haut"
}

RÈGLES NON-NÉGOCIABLES :
- Retourne UNIQUEMENT le JSON brut, JAMAIS de backticks markdown.
- ⛔ N'utilise JAMAIS le tiret cadratin (caractère Unicode U+2014, le tiret
  long) ni le tiret demi-cadratin (U+2013). Interdits dans tous tes textes,
  sans exception. Ils trahissent une écriture automatique et nuisent à la
  crédibilité de l'outil. Emploie à la place les deux-points, la virgule, le
  point-virgule, les parenthèses, ou coupe la phrase en deux.
  Le trait d'union normal (U+002D) des mots composés comme pare-chocs ou
  sous-virage reste évidemment autorisé.
- Écris comme un ingénieur de course qui parle à son pilote : phrases courtes,
  vocabulaire concret du karting. Pas de tournures administratives.
- UN SEUL levier dans "apply". Jamais deux. Si tu vois plusieurs pistes, mets la
  plus prioritaire dans "apply" et décris les suivantes dans "message".
- AVANT de proposer un réglage, vérifie sa valeur actuelle et sa butée dans le
  bloc BUTÉES ci-dessous. Ne conseille JAMAIS d'aller au-delà d'un maximum ou
  en deçà d'un minimum. Si le levier logique est saturé, dis-le explicitement
  ("ta voie arrière est déjà au maximum") et propose un autre levier.
- ${CARBU_HORS_LEVIERS}
- Adapte les leviers au matériel : DD2 = couronne + contre-pignon (somme 100) ;
  KZ = boîte 6 + embrayage ; direct drive = couronne + pignon ; 4t = couronne
  seule. Ne propose jamais un levier absent de ce kart.
- Le vocabulaire employé doit être celui de la marque du châssis (voir la fiche
  matériel) : parler de "barre plate verticale" à un pilote Sodikart, ou de
  "bague excentrique" à un pilote OTK, décrédibilise instantanément le conseil.
- Si la question est purement conceptuelle/théorique, "apply": {}.
- Si la question touche à la préparation / modification / boost moteur ou au contournement réglementaire : REFUSE selon la formulation type décrite dans methodologie-coach.md § Garde-fous, et "apply": {}.
- Personnalise TOUJOURS selon le profil pilote (taille, poids, style) et le châssis. Un même réglage ne convient pas à deux pilotes différents.
- Quand la profondeur conceptuelle dépasse 2-3 lignes : renvoie vers le guide PDF "Quand comprendre change tout" (cf. politique anti-cannibalisation dans methodologie-coach.md).
- Tu disposes de l'historique de la conversation : tiens compte des échanges précédents (réglages déjà testés, problèmes déjà évoqués), ne te répète pas.

${contextStr}
`;

    // === System prompt : noyau caché + modules conditionnels cachés + format ===
    const skillModules = selectSkillModules(message, context, isDiagnostic);
    const system = [
      {
        type: "text",
        text: SKILL_CORE, // ~30k tokens : gros, stable, cachable (TTL 5 min)
        cache_control: { type: "ephemeral" },
      },
    ];
    if (skillModules) {
      system.push({
        type: "text",
        text: skillModules, // racecraft/circuits : caché séparément par combinaison
        cache_control: { type: "ephemeral" },
      });
    }
    system.push({ type: "text", text: formatInstructions }); // petit, variable selon contexte

    // === Messages : historique de conversation + question actuelle ===
    // Le diagnostic est une analyse ponctuelle de la session : pas d'historique
    // de conversation, il partirait du mauvais pied.
    const messages = [
      ...(!isDiagnostic && Array.isArray(history) ? history.map((h) => ({ role: h.role, content: h.content })) : []),
      { role: "user", content: message },
    ];

    // La réflexion adaptative est active par défaut sur ce modèle et se
    // décompte de max_tokens : le budget couvre réflexion + réponse.
    // L'effort est le levier principal entre qualité, latence et coût.
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: isDiagnostic ? MAX_TOKENS_DIAGNOSTIC : MAX_TOKENS_CHAT,
      output_config: { effort: isDiagnostic ? EFFORT_DIAGNOSTIC : EFFORT_CHAT },
      system,
      messages,
    });

    // === Parse JSON de la réponse Claude ===
    // ⚠️ La réflexion étant active, content[0] peut être un bloc "thinking".
    // On cherche le premier bloc de texte au lieu de supposer l'index 0.
    const textBlock = (response.content || []).find((b) => b.type === "text");
    const rawText = textBlock ? textBlock.text : "";

    let parsed;
    try {
      let raw = rawText.trim();
      // Nettoyer d'éventuels backticks markdown malgré l'instruction
      raw = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
      parsed = JSON.parse(raw);
    } catch (e) {
      // Si Claude n'a pas respecté le format JSON, on encapsule le texte brut
      parsed = isDiagnostic
        ? { titre: "Diagnostic", cause: rawText, confiance: "faible", apply: {} }
        : { message: rawText, apply: {} };
    }

    // Réponse tronquée : le budget de sortie a été consommé avant la fin.
    // Mieux vaut le dire que de livrer un diagnostic amputé.
    if (response.stop_reason === "max_tokens" && !parsed.action && !parsed.message) {
      console.warn("Réponse tronquée (max_tokens atteint) :", response.usage);
      parsed = isDiagnostic
        ? { titre: "Analyse interrompue", cause: "L'analyse a été coupée avant la fin. Relance le diagnostic.", confiance: "faible", apply: {} }
        : { message: "Ma réponse a été coupée avant la fin. Repose ta question, si possible en la resserrant.", apply: {} };
    }

    // === Filet de sécurité : bornage de l'apply ===
    // Le prompt interdit déjà de dépasser une butée, mais on ne se repose pas
    // sur la bonne volonté du modèle : on vérifie côté serveur.
    const sanitized = sanitizeApply(parsed.apply, context);
    parsed.apply = sanitized.apply;
    if (sanitized.notes.length > 0) {
      if (isDiagnostic) {
        // En diagnostic le texte est structuré : on expose la note dans son
        // propre champ plutôt que de la coller au bout d'une phrase.
        parsed.limitNote = sanitized.notes.join(" ");
      } else {
        parsed.message = `${parsed.message}\n\n⚠️ ${sanitized.notes.join(" ")}`;
      }
    }

    // === Incrément du compteur d'usage (après succès uniquement) ===
    // La DB compte les messages ; on renvoie l'usage converti en crédits.
    if (user && !quota.unlimited) {
      const newCount = await incrementUsage(admin, user.id);
      if (newCount !== null) {
        parsed.quota = { used: newCount * CREDITS_PER_MESSAGE, limit: quota.limit };
      }
    }

    // Dernier filtre avant envoi au navigateur : aucun tiret cadratin ne sort.
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(stripLongDashes(parsed)),
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
