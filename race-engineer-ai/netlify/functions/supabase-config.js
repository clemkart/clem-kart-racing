// =============================================
// Configuration Supabase partagée par les fonctions serveur
// =============================================
// Pourquoi ce fichier existe : chat.js et session.js dupliquaient tous les
// deux l'URL, la clé anon et le repli "process.env.X || valeur en dur". Le
// problème est que "||" ne se déclenche QUE si la variable est absente. Une
// variable PRÉSENTE mais fausse passe telle quelle, et alors :
//   - chat.js refuse tous les jetons : "Connecte-toi pour utiliser le coach IA"
//   - session.js répond "Token invalide" : l'historique cloud ne sauvegarde plus
// C'est exactement ce qui s'est produit en production, et le fait que les deux
// fichiers portaient leur propre copie de la logique a fait qu'on n'a corrigé
// qu'un seul des deux symptômes.
//
// Ici on valide la COHÉRENCE du couple avant de s'en servir, une fois, pour
// tout le monde.
// =============================================

// Valeurs de repli vérifiées le 2026-07-29 : un appel REST direct avec ce
// couple renvoie 200 sur profiles et sur sessions. La clé anon est publique par
// conception (protégée par RLS), elle figure déjà dans le source d'index.html.
const REPLI_URL = "https://hkpknrrymgbnjmbewlyc.supabase.co";
const REPLI_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhrcGtucnJ5bWdibmptYmV3bHljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE2ODgyNzksImV4cCI6MjA5NzI2NDI3OX0.kNbCMJK2FNxoiPOFxgWNoh7sqb89gAAxumZGqTWW014";

/**
 * Lit le "ref" du projet et le rôle dans la charge utile d'un JWT Supabase.
 * Renvoie des null si la chaîne n'est pas un JWT lisible : c'est le cas des
 * nouvelles clés Supabase au format sb_publishable_..., qui sont valides mais
 * non décodables.
 */
function lireJetonSupabase(jwt) {
  try {
    const charge = JSON.parse(Buffer.from(String(jwt).split(".")[1], "base64").toString("utf8"));
    return { ref: charge.ref || null, role: charge.role || null };
  } catch (e) {
    return { ref: null, role: null };
  }
}

function resoudreConfig() {
  const url = process.env.SUPABASE_URL || REPLI_URL;
  const cle = process.env.SUPABASE_ANON_KEY || REPLI_ANON_KEY;
  const { ref, role } = lireJetonSupabase(cle);

  if (role && role !== "anon") {
    console.error(
      `[CONFIG] SUPABASE_ANON_KEY porte le rôle "${role}" et non "anon". Si c'est la clé service_role, retire-la immédiatement de cette variable.`
    );
  }

  let hote = "";
  try {
    hote = new URL(url).host;
  } catch (e) {
    console.error(`[CONFIG] SUPABASE_URL n'est pas une URL valide : "${url}". Repli sur la valeur vérifiée.`);
    return { url: REPLI_URL, cle: REPLI_ANON_KEY };
  }

  // Les nouvelles clés Supabase ne sont pas des JWT : on ne peut pas vérifier
  // leur cohérence. On ne les refuse pas, on laisse une trace pour le jour où
  // l'authentification échouera.
  if (!ref && process.env.SUPABASE_ANON_KEY) {
    console.warn(
      "[CONFIG] La SUPABASE_ANON_KEY fournie n'est pas un JWT lisible (nouveau format de clé ?). " +
        "Sa cohérence avec SUPABASE_URL n'a pas pu être vérifiée. En cas de 401 en boucle, supprime cette variable : le repli codé en dur est vérifié."
    );
  }

  if (ref && hote !== `${ref}.supabase.co`) {
    console.error(
      `[CONFIG] INCOHÉRENCE : SUPABASE_URL pointe sur "${hote}" alors que la clé anon appartient au projet "${ref}". ` +
        `Toutes les authentifications échoueraient. Repli sur le couple vérifié. ` +
        `Corrige les variables Netlify : SUPABASE_URL doit valoir exactement ${REPLI_URL}`
    );
    return { url: REPLI_URL, cle: REPLI_ANON_KEY };
  }

  return { url, cle };
}

const _config = resoudreConfig();

module.exports = {
  SUPABASE_URL: _config.url,
  SUPABASE_ANON_KEY: _config.cle,
  lireJetonSupabase,
};
