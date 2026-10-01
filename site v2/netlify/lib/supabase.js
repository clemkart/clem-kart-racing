'use strict';
// Supabase en REST avec fetch (même convention que les fonctions existantes du site) :
// en-têtes « apikey » et « Authorization: Bearer » avec SUPABASE_SERVICE_ROLE_KEY, côté serveur uniquement.
// Aucune donnée personnelle n'est écrite en base par ce paquet.

const { requete } = require('./http');
const { obligatoire, avecDefaut } = require('./config');

function urlBase() {
  return avecDefaut('SUPABASE_URL').replace(/\/+$/, '');
}

function entetes(supplement = {}) {
  const cle = obligatoire('SUPABASE_SERVICE_ROLE_KEY');
  return { apikey: cle, Authorization: `Bearer ${cle}`, ...supplement };
}

function urlTable(table, params) {
  const chaine = params && params.toString();
  return `${urlBase()}/rest/v1/${encodeURIComponent(table)}${chaine ? `?${chaine}` : ''}`;
}

// Insertion d'une ou plusieurs lignes. ignorerDoublons : un conflit sur la clé primaire est ignoré (rejeu sans erreur).
async function inserer(table, lignes, { ignorerDoublons = false, timeoutMs } = {}) {
  const prefer = ['return=minimal'];
  if (ignorerDoublons) prefer.push('resolution=ignore-duplicates');
  await requete('Supabase', urlTable(table), {
    method: 'POST',
    headers: entetes({ 'Content-Type': 'application/json', Prefer: prefer.join(',') }),
    body: JSON.stringify(lignes),
    timeoutMs,
  });
}

// Lecture : filtres au format PostgREST, ex. { session_id: 'eq.cs_live_x' }.
async function lire(table, { select = '*', filtres = {}, limite, timeoutMs } = {}) {
  const params = new URLSearchParams();
  params.set('select', select);
  for (const [colonne, condition] of Object.entries(filtres)) params.append(colonne, condition);
  if (limite) params.set('limit', String(limite));
  const lignes = await requete('Supabase', urlTable(table, params), {
    method: 'GET',
    headers: entetes({ Accept: 'application/json' }),
    timeoutMs,
  });
  return Array.isArray(lignes) ? lignes : [];
}

// Mise à jour des lignes qui correspondent aux filtres.
async function mettreAJour(table, filtres, valeurs, { timeoutMs } = {}) {
  const params = new URLSearchParams();
  for (const [colonne, condition] of Object.entries(filtres || {})) params.append(colonne, condition);
  if (![...params.keys()].length) throw new Error('Supabase : mise à jour sans filtre refusée');
  await requete('Supabase', urlTable(table, params), {
    method: 'PATCH',
    headers: entetes({ 'Content-Type': 'application/json', Prefer: 'return=minimal' }),
    body: JSON.stringify(valeurs),
    timeoutMs,
  });
}

// URL signée de téléchargement d'un fichier du Storage (bucket privé).
// La réponse contient « signedURL », souvent relative (/object/sign/produits/...?token=...) :
// on construit l'URL absolue ${SUPABASE_URL}/storage/v1${signedURL}, puis on force le nom avec &download=.
async function urlSignee(chemin, nomTelechargement, { bucket = 'produits', expiresIn = 600 } = {}) {
  const base = urlBase();
  const cheminEncode = String(chemin).split('/').map(encodeURIComponent).join('/');
  const reponse = await requete('Supabase Storage', `${base}/storage/v1/object/sign/${encodeURIComponent(bucket)}/${cheminEncode}`, {
    method: 'POST',
    headers: entetes({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ expiresIn }),
  });
  const signee = reponse && (reponse.signedURL || reponse.signedUrl);
  if (typeof signee !== 'string' || !signee) throw new Error('Supabase Storage : réponse sans signedURL');

  let url;
  if (/^https?:\/\//i.test(signee)) url = signee;
  else if (signee.startsWith('/storage/v1/')) url = `${base}${signee}`;
  else url = `${base}/storage/v1${signee.startsWith('/') ? '' : '/'}${signee}`;

  if (nomTelechargement) url += `${url.includes('?') ? '&' : '?'}download=${encodeURIComponent(nomTelechargement)}`;
  return url;
}

module.exports = { urlBase, inserer, lire, mettreAJour, urlSignee };
