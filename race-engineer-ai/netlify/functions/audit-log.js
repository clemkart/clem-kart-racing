// =============================================
// JOURNAL D'AUDIT : une ligne par action sensible
// =============================================
// Avant le 2026-08-07, le projet n'écrivait QUE des console.error. Aucune trace
// d'une connexion réussie, d'un accès aux données, ou d'un garde-fou qui se
// déclenche. Conséquence : une intrusion ne laissait rien derrière elle, et on
// ne pouvait ni la voir passer, ni la reconstituer après coup.
//
// Ces lignes atterrissent dans les logs de fonction Netlify. Elles sont
// volontairement greppables : chercher [AUDIT] pour tout, ou
// [AUDIT] auth-echec pour une seule catégorie.
//
// ⚠️ RÈGLE DE VIE PRIVÉE, NON NÉGOCIABLE
// Ce journal ne doit JAMAIS contenir de donnée personnelle en clair. Ni email,
// ni prénom, ni contenu écrit par le pilote, ni adresse IP complète. Les CGU
// promettent une analytique sans IP ni PII, et un journal est un traitement
// comme un autre. On garde donc juste assez pour repérer une anomalie :
//   - l'identifiant de compte tronqué à 8 caractères (assez pour corréler
//     deux lignes entre elles, pas pour identifier quelqu'un hors de la base)
//   - l'adresse IP réduite à ses deux premiers octets (assez pour voir que
//     tout vient du même réseau, pas pour désigner un abonné)
// Si vous ajoutez un champ ici, posez-vous la question : est-ce que ça aiderait
// à repérer une intrusion ? Si non, ne le mettez pas.

// 82.64.12.34 -> 82.64.x.x   ·   une IPv6 est réduite à ses deux groupes
function ipTronquee(ip) {
  if (!ip || typeof ip !== "string") return "?";
  const propre = ip.split(",")[0].trim();
  if (propre.includes(":")) {
    const g = propre.split(":");
    return `${g[0]}:${g[1]}:x`;
  }
  const o = propre.split(".");
  return o.length === 4 ? `${o[0]}.${o[1]}.x.x` : "?";
}

function idTronque(id) {
  return typeof id === "string" && id.length >= 8 ? id.slice(0, 8) : "?";
}

/**
 * Écrit une ligne d'audit.
 * @param {string} action  verbe court et stable, en kebab-case (auth-ok,
 *                         quota-epuise, refus-moteur, session-ecriture...).
 *                         Stable = greppable : ne pas le reformuler après coup.
 * @param {object} champs  { user, ip, ...libres }. `user` et `ip` sont
 *                         tronqués ici, pas par l'appelant : on ne veut pas
 *                         que la règle dépende de la vigilance du site d'appel.
 */
function audit(action, champs = {}) {
  const parts = [];
  if (champs.user !== undefined) parts.push(`user=${idTronque(champs.user)}`);
  if (champs.ip !== undefined) parts.push(`ip=${ipTronquee(champs.ip)}`);
  for (const [k, v] of Object.entries(champs)) {
    if (k === "user" || k === "ip" || v === undefined || v === null) continue;
    // Un champ libre reste court et sans espace : le journal doit rester une
    // ligne lisible et découpable, pas une phrase.
    parts.push(`${k}=${String(v).replace(/\s+/g, "_").slice(0, 40)}`);
  }
  console.log(`[AUDIT] ${action} ${parts.join(" ")}`);
}

module.exports = { audit, ipTronquee, idTronque };
