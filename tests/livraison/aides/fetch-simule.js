'use strict';
// Simulateur de fetch global : routeur de réponses par méthode et début d'URL (ou expression régulière),
// avec journal des appels. Tout appel non prévu échoue : aucun test ne peut toucher le réseau.

function creerReponse({ status = 200, json, texte } = {}) {
  const sansCorps = status === 204 || status === 205 || status === 304;
  if (sansCorps) return new Response(null, { status });
  if (json !== undefined) {
    return new Response(JSON.stringify(json), { status, headers: { 'Content-Type': 'application/json' } });
  }
  return new Response(texte || '', { status, headers: { 'Content-Type': 'text/plain' } });
}

function normaliserEntetes(entetes) {
  const resultat = {};
  if (!entetes) return resultat;
  if (typeof entetes.forEach === 'function' && !Array.isArray(entetes)) {
    entetes.forEach((valeur, cle) => {
      resultat[String(cle).toLowerCase()] = valeur;
    });
    return resultat;
  }
  for (const [cle, valeur] of Object.entries(entetes)) resultat[cle.toLowerCase()] = valeur;
  return resultat;
}

function correspond(motif, url) {
  return typeof motif === 'string' ? url.startsWith(motif) : motif.test(url);
}

function installerFetch() {
  const routes = [];
  const appels = [];
  const fetchOriginal = global.fetch;

  global.fetch = async (url, options = {}) => {
    const appel = {
      url: String(url),
      methode: String(options.method || 'GET').toUpperCase(),
      entetes: normaliserEntetes(options.headers),
      corps: options.body == null ? '' : String(options.body),
    };
    appels.push(appel);
    const route = routes.find((r) => r.methode === appel.methode && correspond(r.motif, appel.url));
    if (!route) throw new Error(`Appel réseau non simulé : ${appel.methode} ${appel.url}`);
    // Une réponse sous forme de fonction peut lever une erreur : simule une panne réseau.
    const reponse = typeof route.reponse === 'function' ? await route.reponse(appel) : route.reponse;
    return creerReponse(reponse);
  };

  return {
    appels,
    // La dernière route déclarée est prioritaire : un test peut surcharger une route par défaut.
    sur(methode, motif, reponse) {
      routes.unshift({ methode: methode.toUpperCase(), motif, reponse });
      return this;
    },
    appelsVers(methode, motif) {
      return appels.filter((a) => a.methode === methode.toUpperCase() && correspond(motif, a.url));
    },
    restaurer() {
      global.fetch = fetchOriginal;
    },
  };
}

module.exports = { installerFetch, creerReponse };
