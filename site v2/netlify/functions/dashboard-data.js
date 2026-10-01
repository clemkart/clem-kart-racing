// =============================================
// Clem Kart Racing : Dashboard analytics (lecture/agregation)
// POST { password, days } -> JSON des metriques du site sur la periode demandee.
// Protege par DASHBOARD_PASSWORD. Lecture Supabase via REST (service_role), sans SDK.
// Ventes Stripe (guide et debrief) : lecture directe de Stripe (STRIPE_READ_KEY, cle
// restreinte en lecture). Le guide et le debrief sont separes grace aux identifiants
// plink_ de config/offres.json (un seul point de verite, jamais de prix en dur ici).
// Contrairement a track-site.js, ici on VEUT voir les erreurs -> 500 explicite.
// =============================================

const crypto = require('crypto');
const OFFRES = require('../../../config/offres.json');
// IP du visiteur : x-nf-client-connection-ip (pose par Netlify, non falsifiable par le client)
// en priorite. Le premier element de x-forwarded-for, lui, pouvait contourner la limite d essais.
const { ipClient } = require('../lib/http.js');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://hkpknrrymgbnjmbewlyc.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const DASHBOARD_PASSWORD = process.env.DASHBOARD_PASSWORD || '';

const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_DAYS = 30;
const MAX_DAYS = 3650;        // "Tout"
const MAX_DAY_POINTS = 92;    // points max sur la courbe

const STRIPE_API = 'https://api.stripe.com/v1/checkout/sessions';
const STRIPE_MAX_PAGES = 10;  // 1000 sessions max par ouverture du dashboard

const ALLOWED_ORIGINS = [
  process.env.URL,
  process.env.DEPLOY_PRIME_URL,
  'http://localhost:8888',
  'http://localhost:3000',
].filter(Boolean);

function buildHeaders(event) {
  const origin = event.headers['origin'] || '';
  const allowOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0] || '';
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
    Vary: 'Origin',
  };
}

// ---------- Ce que la config apporte au dashboard : routes, portes Stripe, plink_ ----------
const ROUTES = OFFRES.routes || {};
const EQ = OFFRES.equitable || {};

// Chemin normalise du site 1 : « /guide/ », « /guide/index.html » et « /guide » sont la meme page.
function cheminNormalise(p) {
  let s = String(p || '/').replace(/[?#].*$/, '');
  s = s.replace(/\/index\.html$/, '/');
  if (s.length > 1) s = s.replace(/\/+$/, '');
  return s || '/';
}

// Portes /aller/* -> produit vise. Le site 2 n'a pas de porte : ses clics Stripe sont le debrief.
const PORTES = {};
function porte(offre, produit) {
  if (offre && typeof offre.aller === 'string') PORTES[cheminNormalise(offre.aller)] = produit;
}
porte(OFFRES.guide, 'guide');
porte(EQ.guide_lecteur, 'guide');
porte(OFFRES.debrief, 'debrief');
porte(EQ.debrief_lecteur, 'debrief');
const PORTE_LABELS = {};
function porteLabel(offre, label) {
  if (offre && typeof offre.aller === 'string') PORTE_LABELS[cheminNormalise(offre.aller)] = label;
}
porteLabel(OFFRES.guide, 'guide');
porteLabel(EQ.guide_lecteur, 'guide, prix lecteur');
porteLabel(OFFRES.debrief, 'débrief');
porteLabel(EQ.debrief_lecteur, 'débrief, prix lecteur');

// Identifiants plink_ des 4 liens Stripe : c'est eux qui separent le guide du debrief.
const PLINKS = {};
function plink(offre, produit, variante) {
  const id = offre && offre.stripe && offre.stripe.plink;
  if (typeof id === 'string' && id) PLINKS[id] = { produit, variante };
}
plink(OFFRES.guide, 'guide', 'guide');
plink(EQ.guide_lecteur, 'guide', 'guide_lecteur');
plink(OFFRES.debrief, 'debrief', 'debrief');
plink(EQ.debrief_lecteur, 'debrief', 'debrief_lecteur');

// Classes CSS ou data-cta des boutons -> libelles lisibles (fallback : la valeur brute).
const CTA_LABELS = {
  // Site 1, page de vente du guide et pages merci
  hero: 'Bouton haut de page',
  prix: 'Bouton du bloc prix',
  final: 'Bouton de fin de page',
  barre: 'Barre fixe en bas',
  nav: 'Bouton du menu',
  merci: 'Page merci, offre suivante',
  liens: 'Page de liens',
  // Noms data-cta des pages V4 (site v2/*/index.html) : un nom brut serait illisible.
  feuilleter: 'Bouton sous les pages feuilletées',
  'merci-guide-suite': 'Merci guide, débrief au prix lecteur',
  'offre-guide': 'Accueil, bloc du guide',
  'offre-debrief': 'Accueil, bloc du débrief',
  'hero-diagnostic': 'Accueil, lien du diagnostic',
  'accueil-gratuit': "Accueil, lien de l'extrait",
  'liens-extrait': "Page de liens, lien de l'extrait",
  'extrait-guide': 'Page extrait, bouton du guide',
  'extrait-planche': 'Page extrait, planche du guide',
  'tableur-guide': 'Page tableur, bouton du guide',
  'tableur-extrait': "Page tableur, lien de l'extrait",
  // Anciennes classes (historique Gumroad)
  ncta: 'CTA haut de page',
  btp: 'CTA bloc prix',
  btg: 'CTA extrait (accueil)',
  bpaid: 'CTA option payante',
  btw: 'CTA bas de page',
  'btn-p': 'CTA article (achat)',
  'btn-g': 'CTA article (extrait)',
  // Site 2
  'carte-guide': 'Site 2 · fiche du guide',
  'sortie-loc': 'Diagnostic · sortie location',
  'sortie-nocam': 'Diagnostic · sortie sans images',
};
function ctaLabel(raw) { return CTA_LABELS[raw] || raw || '(sans nom)'; }

// Boutons de la page de liens (valeur data-bio) -> libelles. Fallback : la valeur brute.
const BIO_LABELS = {
  guide: 'Le guide',
  onboard: (OFFRES.debrief && OFFRES.debrief.titre) || 'Analyse de ton onboard',
  journee: (OFFRES.journee && OFFRES.journee.titre) || 'Journée sur piste',
  marques: 'Marques et partenaires',
  site: 'Le site',
  extrait: 'Extrait gratuit',
};
function bioLabel(raw) { return BIO_LABELS[raw] || raw || '(sans nom)'; }

// Chemins -> noms lisibles. Sans ça la liste des pages est une suite de fichiers .html.
// Les adresses viennent de config/offres.json (routes). Les pages du site 2 sont
// prefixees « s2: » : les deux sites ont une page « / ».
const PAGE_LABELS = {
  '/': 'Accueil',
  '/extrait-guide.html': 'Page extrait (capture email)',
  '/tableur-reglages.html': 'Page tableur (capture email)',
  '/race-engineer-ai.html': 'Ancienne page app (retirée)',
  '/blog.html': 'Blog, sommaire (dépublié)',
  '/merci.html': 'Page merci (ancienne, Gumroad)',
  '/merci-fondateur.html': 'Ancienne page merci app (retirée)',
  '/mentions-legales.html': 'Mentions légales',
  '/app-preview.html': "Aperçu de l'app (retiré)",
  '/dashboard.html': 'Dashboard',
  // Articles depublies le 2026-08-31 : le libelle reste, sinon l'historique du
  // dashboard afficherait des chemins bruts pour les visites d'avant cette date.
  '/blog-freinage-degressif.html': 'Article freinage dégressif (dépublié)',
  '/blog-mental-karting.html': 'Article mental (dépublié)',
  '/blog-trajectoire-grip.html': 'Article trajectoire et grip (dépublié)',
  '/blog-volant-karting.html': 'Article le volant (dépublié)',
  's2:/': 'Site 2 · Accueil catalogue',
  's2:/onboard/': 'Site 2 · Diagnostic et offre débrief',
};
function routeLabel(cle, label) {
  const chemin = ROUTES[cle];
  if (typeof chemin === 'string' && chemin) PAGE_LABELS[cheminNormalise(chemin)] = label;
}
routeLabel('guide', 'Page de vente du guide');
routeLabel('liens', 'Page de liens (bio)');
routeLabel('extrait', 'Page extrait (capture email)');
routeLabel('onboard', 'Diagnostic et offre débrief');
routeLabel('merci_guide', 'Merci guide (livraison)');
routeLabel('merci_guide_lecteur', 'Merci guide, prix lecteur');
routeLabel('merci_onboard', 'Merci débrief');
routeLabel('clement', 'Page Clément (parcours)');
routeLabel('journee', "Journée sur piste (liste d'attente)");
routeLabel('marques', 'Marques et partenaires');
routeLabel('sponsors', 'Sponsors');
routeLabel('kit_media', 'Kit média');
routeLabel('mentions', 'Mentions légales');
routeLabel('cgv', 'Conditions générales de vente');
routeLabel('confidentialite', 'Confidentialité');
routeLabel('retractation', 'Rétractation (renoncer au contrat)');
function pageLabel(path) {
  if (PAGE_LABELS[path]) return PAGE_LABELS[path];
  return (path || '(inconnu)').replace(/^\//, '').replace(/\.html$/, '');
}

// Pages de capture email : elles alimentent l'entonnoir, pas seulement la liste des pages.
const PAGE_EXTRAIT = new Set(['/extrait-guide.html', cheminNormalise(ROUTES.extrait || '/extrait')]);
const PAGE_TABLEUR = new Set(['/tableur-reglages.html']);
const PAGE_LIENS = cheminNormalise(ROUTES.liens || '/liens');

// Les visites du dashboard, ce sont les miennes : elles fausseraient visiteurs et pages vues.
const PATHS_EXCLUS = new Set(['/dashboard.html', '/dashboard']);

// Site d'un evenement : les lignes du site 1 n'ont pas d'etiquette (historique inchange).
// Brouillons Netlify et apercus locaux = tests, jamais comptes.
const SITES_DE_TEST = new Set(['site1-brouillon', 'site2-brouillon', 'local']);
function siteOf(row) {
  return (row.meta && typeof row.meta.site === 'string') ? row.meta.site : 'site1';
}
// Cle de page : sur le site 2, « /index.html » et « / » sont la meme page, « /onboard » aussi.
function pageKey(row, site) {
  if (site !== 'site2') return cheminNormalise(row.path);
  let p = row.path || '/';
  p = p.replace(/index\.html$/, '');
  if (!p.endsWith('/')) p += '/';
  return `s2:${p}`;
}

// Produit vise par un clic Stripe : la porte /aller/* sur le site 1, le debrief sur le site 2.
function produitDuClic(row, site) {
  if (site === 'site2') return 'debrief';
  const route = (row.meta && typeof row.meta.route === 'string') ? cheminNormalise(row.meta.route) : '';
  return PORTES[route] || 'guide';
}

// Libelle d'une campagne d'acquisition (les UTM poses par ManyChat, la bio, etc.).
function campaignLabel(row) {
  const parts = [row.utm_source, row.utm_medium, row.utm_campaign].filter(Boolean);
  return parts.length ? parts.join(' · ') : null;
}

// Identifiant de visite tel qu'il est colle a la fin du profil envoye a Stripe
// (« ...-sid-XXXXXXXXXXXX ») : alphanumerique, 12 caracteres.
function cleSession(sid) {
  return String(sid || '').replace(/[^A-Za-z0-9]/g, '').slice(0, 12);
}

// Chaque etape rapportee a la precedente (c'est la que ca fuit).
function pct(a, b) { return b ? +((a / b) * 100).toFixed(1) : 0; }

// ---------- Tunnel du debrief : questions, boutons, FAQ nommes ----------
const DIAG_QUESTIONS = [
  { step: 1, cle: 'kart', question: 'Sur quoi il roule', reponses: { perso: 'Son propre kart', loc: 'De la location', mixte: 'Les deux' } },
  { step: 2, cle: 'stag', question: 'Depuis quand ses chronos stagnent', reponses: { semaines: 'Quelques semaines', mois: 'Quelques mois', '1an': 'Environ un an', '2ans': 'Deux ans ou plus' } },
  { step: 3, cle: 'why', question: 'Sait dire pourquoi son meilleur tour était bon', reponses: { oui: 'Oui, précisément', vague: 'Vaguement', non: 'Non' } },
  { step: 4, cle: 'zone', question: 'Où il sent que ça part', reponses: { frein: 'Au freinage', traj: "De l'entrée au point de corde", gaz: 'À la remise de gaz', nsp: 'Ne sait pas dire' } },
  { step: 5, cle: 'essai', question: "Ce qu'il a déjà essayé", reponses: { matos: 'Du meilleur matériel', volume: 'Rouler plus souvent', paddock: 'Les conseils du paddock', onboard: 'Regarder des onboards', rien: 'Rien de précis' } },
  { step: 6, cle: 'rage', question: "Ce qui l'agace le plus", reponses: { potes: 'Se faire battre par ses potes', argent: 'Dépenser sans avancer', flou: 'Rouler sans comprendre' } },
  { step: 7, cle: 'video', question: 'Ses images onboard', reponses: { souvent: 'À chaque session', parfois: 'De temps en temps', jamais: 'Jamais filmé' } },
];
const BOUTONS_PAIEMENT = {
  diag: 'Bouton après le diagnostic',
  prix: 'Bouton du bloc prix',
  final: 'Bouton de fin de page',
  barre: 'Barre fixe en bas',
};
const FAQ_QUESTIONS = {
  1: 'Et si ça ne change rien à mes chronos ?',
  2: 'Quelle vidéo je dois envoyer ?',
  3: 'Je ne roule pas souvent. Ça vaut le coup ?',
  4: 'Quelle différence avec le guide ?',
  5: 'Et si je suis vraiment lent ?',
  6: "Comment je t'envoie mon onboard ?",
  7: 'Je reçois quoi, et quand ?',
};

function blankTotals() {
  return {
    visiteurs: 0, pageviews: 0,
    stripe_clicks: 0, stripe_clicks_guide: 0, stripe_clicks_debrief: 0,
    gumroad_clicks: 0, clics_achat: 0, clics_guide: 0,
    extract_clicks: 0, tableur_clicks: 0, tableur_signups: 0, extrait_signups: 0, ctr: 0,
    ventes: 0, revenu_cents: 0, taux_achat: 0, extraits_gumroad: 0,
  };
}
function bump(tot, type, produit) {
  if (type === 'pageview') tot.pageviews++;
  else if (type === 'stripe_click') {
    tot.stripe_clicks++;
    if (produit === 'guide') tot.stripe_clicks_guide++;
    else if (produit === 'debrief') tot.stripe_clicks_debrief++;
  }
  else if (type === 'gumroad_click') tot.gumroad_clicks++;
  else if (type === 'extract_click') tot.extract_clicks++;
  else if (type === 'tableur_click') tot.tableur_clicks++;
  else if (type === 'tableur_signup') tot.tableur_signups++;
  else if (type === 'extrait_signup') tot.extrait_signups++;
}
// ctr = % de VISITEURS UNIQUES ayant clique au moins une fois vers l'achat (Stripe, ou
// Gumroad dans l'historique), et non le nombre brut de clics, qui compterait 2x la
// meme personne si elle clique sur 2 boutons differents.
function finalize(tot, sessionsSize, uniqueClickersSize) {
  tot.visiteurs = sessionsSize;
  tot.clics_achat = tot.stripe_clicks + tot.gumroad_clicks;
  tot.clics_guide = tot.stripe_clicks_guide + tot.gumroad_clicks;
  tot.ctr = tot.visiteurs ? +((uniqueClickersSize / tot.visiteurs) * 100).toFixed(1) : 0;
  return tot;
}

// Agrege les ventes Gumroad (historique) sur les memes fenetres temporelles que les visites.
// salesRows est filtre is_test=false par la requete Supabase ; les lignes is_refund sont
// comptees a part (taux de remboursement), jamais dans les ventes ni le CA.
// L'extrait est un produit Gumroad a 0 EUR : Gumroad envoie un ping pour lui
// exactement comme pour une vente payante. Sans ce tri, chaque telechargement
// gonflait le nombre de "ventes reelles", le taux d'achat et l'entonnoir, alors
// qu'il n'a rapporte aucun euro.
const EXTRAIT_PERMALINKS = String(process.env.GUMROAD_EXTRAIT_PERMALINKS || 'extrait,ehdkm')
  .toLowerCase().split(',').map((x) => x.trim()).filter(Boolean);

function estExtraitGratuit(s) {
  const raw = s.raw || {};
  const liens = [];
  for (const v of [raw.permalink, raw.short_product_id, raw.product_permalink, raw.product_id]) {
    if (!v) continue;
    const str = String(v).toLowerCase().replace(/[?#].*$/, '').replace(/\/+$/, '');
    liens.push(str.slice(str.lastIndexOf('/') + 1));
  }
  if (liens.length) return liens.some((x) => EXTRAIT_PERMALINKS.includes(x));
  const nom = String(s.product_name || '').toLowerCase();
  if (nom) return nom.includes('extrait');
  // Sans nom ni permalink, un prix nul est presque toujours l'extrait offert.
  // Un produit payant inconnu reste une vente : mieux vaut une vente mal
  // etiquetee qu'une vente perdue.
  return (s.price_cents || 0) === 0;
}

function aggregateSales(salesRows, now, curStart, prevStart, dayStart) {
  const daySales = new Map(); // 'YYYY-MM-DD' -> nb ventes
  let curVentes = 0, curRevenueCents = 0, prevVentes = 0, d24Ventes = 0, currency = '';
  // Dates calculees sur TOUT l'historique recupere, pas seulement la periode affichee :
  // « ma premiere vente » ne doit pas changer parce qu'on regarde 7 jours.
  let firstSaleDate = null, lastSaleDate = null;
  let curExtraits = 0, prevExtraits = 0, d24Extraits = 0, curRembourses = 0;

  for (const s of salesRows) {
    const ts = Date.parse(s.created_at);
    if (isNaN(ts)) continue;
    if (s.is_refund) { if (ts >= curStart) curRembourses++; continue; }
    // Un extrait gratuit n'est pas une vente : compte a part, jamais dans le CA.
    if (estExtraitGratuit(s)) {
      if (ts >= dayStart) d24Extraits++;
      if (ts >= curStart) curExtraits++;
      else if (ts >= prevStart) prevExtraits++;
      continue;
    }
    const amount = (s.price_cents || 0) * (s.quantity || 1);
    const day = (s.created_at || '').slice(0, 10);
    if (day) {
      if (!firstSaleDate || day < firstSaleDate) firstSaleDate = day;
      if (!lastSaleDate || day > lastSaleDate) lastSaleDate = day;
    }

    if (ts >= dayStart) d24Ventes++;

    if (ts >= curStart) {
      curVentes++;
      curRevenueCents += amount;
      if (s.currency) currency = s.currency;
      if (day) daySales.set(day, (daySales.get(day) || 0) + 1);
    } else if (ts >= prevStart) {
      prevVentes++;
    }
  }

  return { curVentes, curRevenueCents, prevVentes, d24Ventes, daySales, currency, firstSaleDate, lastSaleDate,
           curExtraits, prevExtraits, d24Extraits, curRembourses };
}

// ---------- Ventes Stripe : guide et debrief ----------
// Lecture seule, sessions de paiement terminees depuis `sinceMs`. Jamais bloquant :
// sans cle ou en cas de panne, le dashboard s'affiche et signale le statut.
async function lireStripe(sinceMs) {
  const cle = process.env.STRIPE_READ_KEY || '';
  if (!cle) return { statut: 'non_configure', detail: 'Clé Stripe absente : STRIPE_READ_KEY manque dans Netlify (site 1).', sessions: [] };
  const sessions = [];
  let apres = null;
  try {
    for (let page = 0; page < STRIPE_MAX_PAGES; page++) {
      const params = new URLSearchParams({ limit: '100', status: 'complete', 'created[gte]': String(Math.floor(sinceMs / 1000)) });
      params.append('expand[]', 'data.line_items');
      params.append('expand[]', 'data.payment_intent.latest_charge');
      if (apres) params.set('starting_after', apres);
      const res = await fetch(`${STRIPE_API}?${params}`, { headers: { Authorization: `Bearer ${cle}` } });
      if (!res.ok) {
        console.error('dashboard-data stripe read failed:', res.status);
        return { statut: 'erreur', detail: `Stripe HTTP ${res.status}`, sessions: [] };
      }
      const corps = await res.json();
      const lot = Array.isArray(corps.data) ? corps.data : [];
      sessions.push(...lot);
      if (!corps.has_more || !lot.length) break;
      apres = lot[lot.length - 1].id;
    }
    return { statut: 'ok', sessions };
  } catch (e) {
    console.error('dashboard-data stripe read failed:', e.message);
    return { statut: 'erreur', detail: 'Stripe injoignable', sessions: [] };
  }
}

const estLigneDebrief = (l) => /d[ée]brief/i.test(l.description || '');
const estLigneGuide = (l) => /guide|comprendre/i.test(l.description || '');

// Produit d'une session : d'abord le lien de paiement (plink_ de la config), sinon les
// lignes du panier (sessions anciennes ou creees a la main dans Stripe).
function produitStripe(s) {
  const lien = typeof s.payment_link === 'string' ? s.payment_link : (s.payment_link && s.payment_link.id) || '';
  if (lien && PLINKS[lien]) return PLINKS[lien];
  const lignes = (s.line_items && Array.isArray(s.line_items.data)) ? s.line_items.data : [];
  if (lignes.some(estLigneDebrief)) return { produit: 'debrief', variante: 'inconnu' };
  if (lignes.some(estLigneGuide)) return { produit: 'guide', variante: 'inconnu' };
  return { produit: 'autre', variante: 'inconnu' };
}

function produitVide() {
  return { ventes: 0, ventes_prev: 0, ventes_lecteur: 0, options_guide: 0, revenu_cents: 0, currency: '',
           premiere_vente: null, derniere_vente: null, rembourses: 0, rembourses_partiels: 0,
           parSource: new Map(), parJour: new Map() };
}

// Une vente = session payee, en mode reel, non remboursee en totalite, rattachee a un produit connu.
// Remboursement total : la vente sort, elle entre dans le taux de remboursement.
// Remboursement partiel : la vente reste, le montant rembourse sort du CA.
// Aucune donnee client (email, nom, lien video) ne sort de cette fonction.
function aggregateStripe(sessions, curStart, prevStart, sourceParSession) {
  const out = { guide: produitVide(), debrief: produitVide(), payees: 0, rembourses: 0, partiels: 0 };
  for (const s of sessions || []) {
    if (!s || s.status !== 'complete' || s.payment_status !== 'paid' || s.livemode === false) continue;
    const p = produitStripe(s);
    if (p.produit === 'autre') continue; // une future offre ne doit gonfler ni le guide ni le debrief
    const cible = out[p.produit];
    const charge = (s.payment_intent && typeof s.payment_intent === 'object'
      && s.payment_intent.latest_charge && typeof s.payment_intent.latest_charge === 'object')
      ? s.payment_intent.latest_charge : null;
    const ts = (s.created || 0) * 1000;
    const jour = ts ? new Date(ts).toISOString().slice(0, 10) : null;

    if (charge && charge.refunded) {
      if (ts >= curStart) { cible.rembourses++; out.rembourses++; }
      continue;
    }
    if (jour) {
      if (!cible.premiere_vente || jour < cible.premiere_vente) cible.premiere_vente = jour;
      if (!cible.derniere_vente || jour > cible.derniere_vente) cible.derniere_vente = jour;
    }
    if (ts < curStart) {
      if (ts >= prevStart) cible.ventes_prev++;
      continue;
    }

    cible.ventes++;
    out.payees++;
    if (/_lecteur$/.test(p.variante)) cible.ventes_lecteur++;
    const rembourse = (charge && charge.amount_refunded) || 0;
    if (rembourse > 0) { cible.rembourses_partiels++; out.partiels++; }
    const lignes = (s.line_items && Array.isArray(s.line_items.data)) ? s.line_items.data : [];
    if (p.produit === 'debrief' && lignes.some((l) => !estLigneDebrief(l) && estLigneGuide(l))) cible.options_guide++;
    cible.revenu_cents += Math.max(0, (s.amount_total || 0) - rembourse);
    if (s.currency) cible.currency = s.currency;
    if (jour) cible.parJour.set(jour, (cible.parJour.get(jour) || 0) + 1);

    const lien = /-sid-([A-Za-z0-9]{1,32})$/.exec(s.client_reference_id || '');
    const source = (lien && sourceParSession.get(lien[1].slice(0, 12))) || 'non reliée';
    cible.parSource.set(source, (cible.parSource.get(source) || 0) + 1);
  }
  return out;
}

// Agrege les lignes brutes en metriques pretes a afficher, pour une periode de `days` jours.
function aggregate(rows, days, salesRows, stripeLu) {
  const now = Date.now();
  const curStart = now - days * DAY_MS;
  const prevStart = now - 2 * days * DAY_MS;
  const dayStart = now - DAY_MS; // pour les deltas 24h

  // Periode courante
  const cur = blankTotals();
  const curSessions = new Set();
  const curClickers = new Set();  // session_id ayant clique >=1 fois vers l'achat (periode courante)
  const srcOfSession = new Map(); // session_id -> source (1ere vue)
  const devOfSession = new Map(); // session_id -> device (1ere vue)
  const dayVisitors = new Map();  // 'YYYY-MM-DD' -> Set(session_id)
  const dayStripe = new Map();    // 'YYYY-MM-DD' -> nb clics vers Stripe
  const dayGumroad = new Map();   // 'YYYY-MM-DD' -> nb clics gumroad (historique)
  const pageViews = new Map();    // cle de page -> nb pageviews
  const ctaMap = new Map();       // cle de bouton -> { label, stripe, gumroad, extract }
  const srcClickers = new Map();  // source -> Set(session_id) ayant clique vers l'achat
  const daySignups = new Map();   // 'YYYY-MM-DD' -> nb inscriptions email
  // campagne -> { visiteurs:Set, inscriptions, clics_achat }
  const campaigns = new Map();
  // Toutes periodes : visite -> source, pour relier une vente Stripe a son origine.
  const sourceParSession = new Map();

  // Page de liens (bio) : vues, clics par bouton et par plateforme, en visiteurs uniques
  const liens = {
    vues: new Set(), clics: 0, cliqueurs: new Set(),
    boutons: new Map(),      // bouton -> { position, clics, sessions:Set }
    plateformes: new Map(),  // plateforme -> { vues:Set, clics, sessions:Set }
  };

  // Tunnel du debrief (site 2), en visiteurs uniques sur la periode courante
  const deb = {
    onboard: new Set(), start: new Set(), result: new Set(), paiement: new Set(),
    accueilDiag: new Set(), accueilGuide: new Set(),
    steps: new Map(),    // step -> Set(session_id)
    exits: { loc: new Set(), nocam: new Set() },
    boutons: new Map(),  // cta -> Set(session_id)
    faq: new Map(),      // n° de question -> Set(session_id)
    reponses: new Map(), // cle -> Map(session_id -> derniere reponse)
  };

  // Periode precedente (juste les totaux, pour comparaison)
  const prev = blankTotals();
  const prevSessions = new Set();
  const prevClickers = new Set();

  // Deltas dernieres 24h
  const d24 = { visiteurs: new Set(), pageviews: 0, stripe_clicks: 0, gumroad_clicks: 0, extract_clicks: 0, tableur_clicks: 0, tableur_signups: 0, extrait_signups: 0, bio_clicks: 0 };

  let earliestTs = null;
  let testsIgnores = 0;

  for (const r of rows) {
    const ts = Date.parse(r.created_at);
    if (isNaN(ts)) continue;
    if (PATHS_EXCLUS.has(cheminNormalise(r.path))) continue; // mes propres consultations du dashboard
    const site = siteOf(r);
    if (SITES_DE_TEST.has(site)) { testsIgnores++; continue; } // brouillons et apercus locaux
    if (earliestTs === null || ts < earliestTs) earliestTs = ts;
    const type = r.type;
    const sid = r.session_id || null;
    const estInscription = type === 'tableur_signup' || type === 'extrait_signup';
    const estClicAchat = type === 'stripe_click' || type === 'gumroad_click';
    const produit = type === 'stripe_click' ? produitDuClic(r, site) : null;
    const pk = pageKey(r, site);
    if (sid) {
      const cle = cleSession(sid);
      if (cle && !sourceParSession.has(cle)) sourceParSession.set(cle, r.source || 'autre');
    }

    // --- deltas 24h (independants de la periode) ---
    if (ts >= dayStart) {
      if (type === 'pageview') d24.pageviews++;
      else if (type === 'stripe_click') d24.stripe_clicks++;
      else if (type === 'gumroad_click') d24.gumroad_clicks++;
      else if (type === 'extract_click') d24.extract_clicks++;
      else if (type === 'tableur_click') d24.tableur_clicks++;
      else if (type === 'tableur_signup') d24.tableur_signups++;
      else if (type === 'extrait_signup') d24.extrait_signups++;
      else if (type === 'bio_click') d24.bio_clicks++;
      if (sid) d24.visiteurs.add(sid);
    }

    if (ts >= curStart) {
      // ---------- PERIODE COURANTE ----------
      bump(cur, type, produit);
      if (sid) {
        curSessions.add(sid);
        if (!srcOfSession.has(sid)) srcOfSession.set(sid, r.source || 'autre');
        if (!devOfSession.has(sid)) devOfSession.set(sid, r.device || 'desktop');
        if (estClicAchat) curClickers.add(sid);
      }
      const day = (r.created_at || '').slice(0, 10);
      if (day) {
        if (!dayVisitors.has(day)) dayVisitors.set(day, new Set());
        if (sid) dayVisitors.get(day).add(sid);
        if (type === 'stripe_click') dayStripe.set(day, (dayStripe.get(day) || 0) + 1);
        if (type === 'gumroad_click') dayGumroad.set(day, (dayGumroad.get(day) || 0) + 1);
        if (estInscription) daySignups.set(day, (daySignups.get(day) || 0) + 1);
      }
      if (type === 'pageview' && pk) {
        pageViews.set(pk, (pageViews.get(pk) || 0) + 1);
      }
      // Attribution par campagne : d'ou vient le trafic, qui laisse son email, qui clique vers l'achat.
      const camp = campaignLabel(r);
      if (camp) {
        if (!campaigns.has(camp)) campaigns.set(camp, { visiteurs: new Set(), inscriptions: 0, clics_achat: 0 });
        const c = campaigns.get(camp);
        if (sid) c.visiteurs.add(sid);
        if (estInscription) c.inscriptions++;
        if (estClicAchat) c.clics_achat++;
      }
      if (estClicAchat || type === 'extract_click') compterBouton(ctaMap, r, type, site);
      if (estClicAchat && sid) {
        const src = srcOfSession.get(sid) || r.source || 'autre';
        if (!srcClickers.has(src)) srcClickers.set(src, new Set());
        srcClickers.get(src).add(sid);
      }
      if (site === 'site1') compterLiens(liens, r, type, sid, pk);
      if (site === 'site2' && sid) compterDebrief(deb, r, type, sid, pk);
    } else if (ts >= prevStart) {
      // ---------- PERIODE PRECEDENTE (comparaison) ----------
      bump(prev, type, produit);
      if (sid) {
        prevSessions.add(sid);
        if (estClicAchat) prevClickers.add(sid);
      }
    }
  }

  finalize(cur, curSessions.size, curClickers.size);
  finalize(prev, prevSessions.size, prevClickers.size);

  // ---------- Ventes du guide : Gumroad (historique) + Stripe ----------
  const salesAgg = aggregateSales(salesRows || [], now, curStart, prevStart, dayStart);
  const lu = stripeLu || { statut: 'non_configure', sessions: [] };
  const st = aggregateStripe(lu.sessions, curStart, prevStart, sourceParSession);
  cur.ventes_guide_gumroad = salesAgg.curVentes;
  cur.ventes_guide_stripe = st.guide.ventes;
  cur.ventes = salesAgg.curVentes + st.guide.ventes;
  cur.revenu_cents = salesAgg.curRevenueCents + st.guide.revenu_cents;
  cur.currency = salesAgg.currency || st.guide.currency || 'EUR';
  cur.taux_achat = cur.visiteurs ? +((cur.ventes / cur.visiteurs) * 100).toFixed(2) : 0;
  prev.ventes = salesAgg.prevVentes + st.guide.ventes_prev;

  // ---------- Ventes Stripe du debrief, CA total ----------
  cur.revenu_total_cents = cur.revenu_cents + st.debrief.revenu_cents;

  // ---------- Remboursements (Stripe guide + debrief, Gumroad historique) ----------
  const rembourses = st.rembourses + salesAgg.curRembourses;
  const ventesPayees = cur.ventes + st.debrief.ventes;
  const remboursements = {
    total: rembourses,
    guide: st.guide.rembourses + salesAgg.curRembourses,
    debrief: st.debrief.rembourses,
    gumroad: salesAgg.curRembourses,
    partiels: st.partiels,
    ventes_payees: ventesPayees,
    taux: pct(rembourses, ventesPayees + rembourses),
  };

  // Transparence : le suivi ne demarre que depuis earliestTs. Si la periode precedente
  // remonte avant cette date, la comparaison est partielle (pas assez d'historique).
  const tracking_since = earliestTs ? new Date(earliestTs).toISOString().slice(0, 10) : null;
  const previous_partial = earliestTs === null ? true : earliestTs > prevStart;

  // Courbe (jours remplis, max MAX_DAY_POINTS points). « ventes » = guide + debrief.
  const dayCount = Math.min(days, MAX_DAY_POINTS);
  const by_day = [];
  for (let i = dayCount - 1; i >= 0; i--) {
    const dd = new Date(now - i * DAY_MS).toISOString().slice(0, 10);
    const stripeClics = dayStripe.get(dd) || 0;
    const gumroadClics = dayGumroad.get(dd) || 0;
    by_day.push({
      date: dd,
      visiteurs: dayVisitors.has(dd) ? dayVisitors.get(dd).size : 0,
      stripe_clicks: stripeClics,
      gumroad_clicks: gumroadClics,
      clics_achat: stripeClics + gumroadClics,
      inscriptions: daySignups.get(dd) || 0,
      ventes: (salesAgg.daySales.get(dd) || 0) + (st.guide.parJour.get(dd) || 0) + (st.debrief.parJour.get(dd) || 0),
    });
  }

  // ---------- Entonnoir reel : du trafic a la vente, en passant par l'email ----------
  cur.extraits_gumroad = salesAgg.curExtraits;
  prev.extraits_gumroad = salesAgg.prevExtraits;
  cur.inscriptions = cur.tableur_signups + cur.extrait_signups;
  prev.inscriptions = prev.tableur_signups + prev.extrait_signups;
  cur.vues_page_extrait = 0;
  cur.vues_page_tableur = 0;
  for (const [path, vues] of pageViews.entries()) {
    if (PAGE_EXTRAIT.has(path)) cur.vues_page_extrait += vues;
    if (PAGE_TABLEUR.has(path)) cur.vues_page_tableur += vues;
  }
  const vuesCapture = cur.vues_page_extrait + cur.vues_page_tableur;

  const funnel = [
    { etape: 'Visiteurs du site', valeur: cur.visiteurs, taux: null },
    { etape: 'Vues des pages de capture', valeur: vuesCapture, taux: pct(vuesCapture, cur.visiteurs) },
    { etape: 'Emails laissés', valeur: cur.inscriptions, taux: pct(cur.inscriptions, vuesCapture) },
    { etape: 'Clics vers Stripe (guide)', valeur: cur.clics_guide, taux: pct(cur.clics_guide, cur.inscriptions) },
    { etape: 'Ventes du guide', valeur: cur.ventes, taux: pct(cur.ventes, cur.clics_guide) },
  ];

  // Entonnoir de l'extrait seul. L'entonnoir global melange tableur et extrait,
  // or l'appel a l'action Instagram ("commente EXTRAIT") a son propre parcours :
  // commentaire -> DM ManyChat -> page extrait -> email laisse -> mail envoye.
  // Le nombre de commentaires vit dans ManyChat, le dashboard prend la suite.
  const funnel_extrait = [
    { etape: 'Vues de la page extrait', valeur: cur.vues_page_extrait, taux: null },
    { etape: 'Emails laissés', valeur: cur.extrait_signups, taux: pct(cur.extrait_signups, cur.vues_page_extrait) },
    { etape: 'Mails extrait envoyés', valeur: cur.extrait_signups, taux: 100 },
  ];

  const debrief = construireDebrief(deb, st.debrief, lu);

  // Meilleur jour de la periode (en visiteurs), utile apres une video qui marche.
  let meilleurJour = null;
  for (const j of by_day) {
    if (!meilleurJour || j.visiteurs > meilleurJour.visiteurs) meilleurJour = j;
  }

  const dates = {
    suivi_depuis: tracking_since,
    meilleur_jour: meilleurJour && meilleurJour.visiteurs ? meilleurJour : null,
    premiere_vente: minDate(salesAgg.firstSaleDate, st.guide.premiere_vente),
    derniere_vente: maxDate(salesAgg.lastSaleDate, st.guide.derniere_vente),
    derniere_vente_debrief: st.debrief.derniere_vente,
    derniere_inscription: [...daySignups.keys()].sort().pop() || null,
  };

  const by_campaign = [...campaigns.entries()]
    .map(([campagne, c]) => ({
      campagne,
      visiteurs: c.visiteurs.size,
      inscriptions: c.inscriptions,
      clics_achat: c.clics_achat,
      taux_inscription: c.visiteurs.size ? +((c.inscriptions / c.visiteurs.size) * 100).toFixed(1) : 0,
    }))
    .sort((a, b) => b.visiteurs - a.visiteurs)
    .slice(0, 10);

  // Visiteurs uniques par source / appareil
  const srcCount = {};
  for (const s of srcOfSession.values()) srcCount[s] = (srcCount[s] || 0) + 1;
  const by_source = Object.entries(srcCount).map(([source, visiteurs]) => ({ source, visiteurs })).sort((a, b) => b.visiteurs - a.visiteurs);

  const devCount = {};
  for (const d of devOfSession.values()) devCount[d] = (devCount[d] || 0) + 1;
  const by_device = Object.entries(devCount).map(([device, visiteurs]) => ({ device, visiteurs })).sort((a, b) => b.visiteurs - a.visiteurs);

  // Top pages par pages vues, avec un nom lisible
  const by_page = [...pageViews.entries()]
    .map(([path, pageviews]) => ({ path, nom: pageLabel(path), pageviews }))
    .sort((a, b) => b.pageviews - a.pageviews)
    .slice(0, 12);

  // Clics par bouton (CTA), avec libelle lisible
  const by_cta = [...ctaMap.values()]
    .map((c) => ({ cta: c.label, stripe: c.stripe, gumroad: c.gumroad, extract: c.extract, total: c.stripe + c.gumroad + c.extract }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);

  // Conversion par source (visiteurs uniques -> visiteurs uniques ayant clique vers l'achat)
  const conv_by_source = Object.entries(srcCount).map(([source, visiteurs]) => {
    const g = srcClickers.has(source) ? srcClickers.get(source).size : 0;
    return { source, visiteurs, clics_achat: g, rate: visiteurs ? +((g / visiteurs) * 100).toFixed(1) : 0 };
  }).sort((a, b) => b.visiteurs - a.visiteurs);

  const deltas24h = {
    visiteurs: d24.visiteurs.size,
    pageviews: d24.pageviews,
    stripe_clicks: d24.stripe_clicks,
    gumroad_clicks: d24.gumroad_clicks,
    clics_achat: d24.stripe_clicks + d24.gumroad_clicks,
    bio_clicks: d24.bio_clicks,
    extract_clicks: d24.extract_clicks,
    tableur_clicks: d24.tableur_clicks,
    tableur_signups: d24.tableur_signups,
    extrait_signups: d24.extrait_signups,
    inscriptions: d24.tableur_signups + d24.extrait_signups,
    ventes: salesAgg.d24Ventes,
  };

  const stripe = {
    statut: lu.statut,
    cle_absente: lu.statut === 'non_configure',
    guide: { ventes: st.guide.ventes, ventes_lecteur: st.guide.ventes_lecteur, revenu_cents: st.guide.revenu_cents, derniere_vente: st.guide.derniere_vente },
    debrief: { ventes: st.debrief.ventes, ventes_lecteur: st.debrief.ventes_lecteur, options_guide: st.debrief.options_guide, revenu_cents: st.debrief.revenu_cents, derniere_vente: st.debrief.derniere_vente },
  };
  if (lu.detail) stripe.detail = lu.detail;

  return {
    period_days: days,
    tracking_since,
    previous_partial,
    tests_ignores: testsIgnores,
    totals: cur,
    previous: prev,
    deltas24h,
    stripe,
    remboursements,
    funnel,
    funnel_extrait,
    liens: construireLiens(liens),
    debrief,
    dates,
    by_day,
    by_source,
    by_device,
    by_page,
    by_campaign,
    by_cta,
    conv_by_source,
  };
}

function minDate(a, b) { if (!a) return b || null; if (!b) return a; return a < b ? a : b; }
function maxDate(a, b) { if (!a) return b || null; if (!b) return a; return a > b ? a : b; }

// Un clic vers l'achat ou l'extrait, range par bouton. Sur le site 1, un clic Stripe porte
// sa porte (/aller/guide, /aller/onboard...) : le meme bouton « prix » sur deux pages reste distinct.
function compterBouton(ctaMap, r, type, site) {
  const meta = r.meta || {};
  const cta = meta.cta ? String(meta.cta).slice(0, 40) : '';
  let cle = cta, label = ctaLabel(cta);
  if (type === 'stripe_click') {
    if (site === 'site2') {
      cle = `s2|${cta}`;
      label = 'Site 2 · ' + (BOUTONS_PAIEMENT[cta] || ctaLabel(cta));
    } else {
      const route = typeof meta.route === 'string' ? cheminNormalise(meta.route) : '';
      cle = `${route}|${cta}`;
      if (PORTE_LABELS[route]) label += ` (${PORTE_LABELS[route]})`;
    }
  }
  if (!ctaMap.has(cle)) ctaMap.set(cle, { label, stripe: 0, gumroad: 0, extract: 0 });
  const c = ctaMap.get(cle);
  if (type === 'stripe_click') c.stripe++;
  else if (type === 'gumroad_click') c.gumroad++;
  else c.extract++;
}

// Page de liens (bio) : qui la voit, depuis quelle plateforme, quel bouton il clique.
function compterLiens(liens, r, type, sid, pk) {
  if (type === 'pageview') {
    if (pk !== PAGE_LIENS || !sid) return;
    liens.vues.add(sid);
    const plateforme = r.utm_source || 'direct';
    if (!liens.plateformes.has(plateforme)) liens.plateformes.set(plateforme, { vues: new Set(), clics: 0, sessions: new Set() });
    liens.plateformes.get(plateforme).vues.add(sid);
    return;
  }
  if (type !== 'bio_click') return;
  const meta = r.meta || {};
  const bouton = String(meta.bouton || '(sans nom)').slice(0, 40);
  const plateforme = String(meta.plateforme || r.utm_source || 'direct').slice(0, 40);
  liens.clics++;
  if (sid) liens.cliqueurs.add(sid);
  if (!liens.boutons.has(bouton)) liens.boutons.set(bouton, { position: Number(meta.position) || 0, clics: 0, sessions: new Set() });
  const b = liens.boutons.get(bouton);
  b.clics++;
  if (sid) b.sessions.add(sid);
  if (!liens.plateformes.has(plateforme)) liens.plateformes.set(plateforme, { vues: new Set(), clics: 0, sessions: new Set() });
  const p = liens.plateformes.get(plateforme);
  p.clics++;
  if (sid) p.sessions.add(sid);
}

function construireLiens(liens) {
  return {
    visiteurs: liens.vues.size,
    clics: liens.clics,
    cliqueurs: liens.cliqueurs.size,
    taux_clic: pct(liens.cliqueurs.size, liens.vues.size),
    par_bouton: [...liens.boutons.entries()]
      .map(([bouton, b]) => ({ bouton, label: bioLabel(bouton), position: b.position, clics: b.clics, visiteurs: b.sessions.size }))
      .sort((a, b) => (a.position || 99) - (b.position || 99) || b.clics - a.clics),
    par_plateforme: [...liens.plateformes.entries()]
      .map(([plateforme, p]) => ({ plateforme, visiteurs: p.vues.size, clics: p.clics, cliqueurs: p.sessions.size, taux_clic: pct(p.sessions.size, p.vues.size) }))
      .sort((a, b) => b.visiteurs - a.visiteurs || b.clics - a.clics),
  };
}

// Un evenement du site 2, compte dans le tunnel du debrief (visiteurs uniques).
function compterDebrief(deb, r, type, sid, pk) {
  const meta = r.meta || {};
  const ajouter = (map, cle) => {
    if (!map.has(cle)) map.set(cle, new Set());
    map.get(cle).add(sid);
  };
  if (type === 'pageview') {
    if (pk === 's2:/onboard/') deb.onboard.add(sid);
  } else if (type === 'diag_click') {
    deb.accueilDiag.add(sid);
  } else if (type === 'gumroad_click') {
    if (meta.cta === 'carte-guide') deb.accueilGuide.add(sid);
  } else if (type === 'diag_start') {
    deb.start.add(sid);
  } else if (type === 'diag_step') {
    const step = Number(meta.step);
    if (step >= 1 && step <= DIAG_QUESTIONS.length) ajouter(deb.steps, step);
    if (typeof meta.key === 'string' && meta.value !== undefined && meta.value !== null) {
      if (!deb.reponses.has(meta.key)) deb.reponses.set(meta.key, new Map());
      deb.reponses.get(meta.key).set(sid, String(meta.value)); // les lignes arrivent dans l'ordre : la derniere gagne
    }
  } else if (type === 'diag_exit') {
    if (meta.kind === 'loc') deb.exits.loc.add(sid);
    else if (meta.kind === 'nocam') deb.exits.nocam.add(sid);
  } else if (type === 'diag_result') {
    deb.result.add(sid);
  } else if (type === 'stripe_click') {
    deb.paiement.add(sid);
    ajouter(deb.boutons, String(meta.cta || '(sans nom)').slice(0, 20));
  } else if (type === 'faq_open') {
    const q = Number(meta.q);
    if (q >= 1) ajouter(deb.faq, q);
  }
}

// Met en forme le bloc « debrief » renvoye au navigateur (agregats uniquement).
function construireDebrief(deb, st, lu) {
  const commencent = deb.start.size;
  const profils = DIAG_QUESTIONS.map((q) => {
    const compte = new Map();
    for (const valeur of (deb.reponses.get(q.cle) || new Map()).values()) {
      // Question 5 a plusieurs reponses possibles, envoyees jointes par « _ ».
      const parts = q.cle === 'essai' ? valeur.split('_').filter(Boolean) : [valeur];
      for (const v of parts) compte.set(v, (compte.get(v) || 0) + 1);
    }
    const reponses = [...compte.entries()]
      .map(([valeur, n]) => ({ valeur, label: q.reponses[valeur] || valeur, n }))
      .sort((a, b) => b.n - a.n);
    return { cle: q.cle, question: q.question, reponses };
  });

  return {
    stripe: lu.detail ? { statut: lu.statut, detail: lu.detail } : { statut: lu.statut },
    clics_accueil: { diagnostic: deb.accueilDiag.size, guide: deb.accueilGuide.size },
    funnel: [
      { etape: 'Visiteurs du diagnostic', valeur: deb.onboard.size, taux: null },
      { etape: 'Diagnostic commencé', valeur: commencent, taux: pct(commencent, deb.onboard.size) },
      { etape: 'Diagnostic terminé', valeur: deb.result.size, taux: pct(deb.result.size, commencent) },
      { etape: 'Clic vers le paiement', valeur: deb.paiement.size, taux: pct(deb.paiement.size, deb.result.size) },
      { etape: 'Débriefs payés', valeur: st.ventes, taux: pct(st.ventes, deb.paiement.size) },
    ],
    etapes: DIAG_QUESTIONS.map((q) => {
      const sessions = (deb.steps.get(q.step) || new Set()).size;
      return { step: q.step, question: q.question, sessions, taux_depuis_depart: pct(sessions, commencent) };
    }),
    sorties: { location: deb.exits.loc.size, sans_images: deb.exits.nocam.size },
    boutons_paiement: [...deb.boutons.entries()]
      .map(([cta, set]) => ({ cta, label: BOUTONS_PAIEMENT[cta] || cta, sessions: set.size }))
      .sort((a, b) => b.sessions - a.sessions),
    faq: [...deb.faq.entries()]
      .map(([q, set]) => ({ q, question: FAQ_QUESTIONS[q] || `Question ${q}`, ouvertures: set.size }))
      .sort((a, b) => b.ouvertures - a.ouvertures),
    profils,
    ventes: st.ventes,
    ventes_lecteur: st.ventes_lecteur,
    options_guide: st.options_guide,
    revenu_cents: st.revenu_cents,
    rembourses: st.rembourses,
    currency: st.currency || 'eur',
    ventes_par_source: [...st.parSource.entries()]
      .map(([source, ventes]) => ({ source, ventes }))
      .sort((a, b) => b.ventes - a.ventes),
    derniere_vente: st.derniere_vente,
  };
}

// Mot de passe : comparaison a duree constante (empreintes de meme longueur), et au plus
// 10 essais rates par heure et par adresse IP (memoire de l instance chaude, comme send-email.js).
const ESSAIS_MAX = 10;
const ESSAIS_FENETRE_MS = 60 * 60 * 1000;
const essaisRates = new Map();

function empreinte(t) {
  return crypto.createHash('sha256').update(String(t)).digest();
}
function motDePasseValide(recu) {
  return crypto.timingSafeEqual(empreinte(recu || ''), empreinte(DASHBOARD_PASSWORD));
}
function ipDe(event) {
  return ipClient(event);
}
function tropDEssais(ip) {
  const e = essaisRates.get(ip);
  if (!e || Date.now() - e.debut > ESSAIS_FENETRE_MS) return false;
  return e.nombre >= ESSAIS_MAX;
}
function noterEchec(ip) {
  const e = essaisRates.get(ip);
  if (!e || Date.now() - e.debut > ESSAIS_FENETRE_MS) essaisRates.set(ip, { debut: Date.now(), nombre: 1 });
  else e.nombre += 1;
}

exports.handler = async (event) => {
  const headers = buildHeaders(event);
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  // Jamais ouvert par defaut : sans config -> on refuse.
  if (!DASHBOARD_PASSWORD || !SUPABASE_SERVICE_KEY) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Dashboard non configure (variables env manquantes).' }) };
  }

  const ip = ipDe(event);
  if (tropDEssais(ip)) {
    return { statusCode: 429, headers, body: JSON.stringify({ error: 'Trop d essais. Reessaie dans une heure.' }) };
  }
  let body;
  try { body = JSON.parse(event.body || '{}'); } catch { body = {}; }
  if (!motDePasseValide(body.password)) {
    noterEchec(ip);
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'Mot de passe invalide.' }) };
  }

  let days = parseInt(body.days, 10);
  if (!Number.isFinite(days) || days < 1) days = DEFAULT_DAYS;
  if (days > MAX_DAYS) days = MAX_DAYS;

  try {
    // On recupere 2x la periode (courante + precedente) pour la comparaison, plafonne.
    const fetchDays = Math.min(days * 2, 4000);
    const sinceMs = Date.now() - fetchDays * DAY_MS;
    const sinceISO = new Date(sinceMs).toISOString();
    // Les colonnes UTM doivent etre demandees : sans elles, le panneau Campagnes restait vide.
    const url =
      `${SUPABASE_URL}/rest/v1/site_events` +
      `?select=created_at,type,source,device,session_id,path,meta,utm_source,utm_medium,utm_campaign` +
      `&created_at=gte.${encodeURIComponent(sinceISO)}` +
      `&order=created_at.asc` +
      `&limit=100000`;

    // Les remboursements Gumroad (is_refund) sont lus aussi : ils nourrissent le taux de remboursement.
    const salesUrl =
      `${SUPABASE_URL}/rest/v1/sales` +
      `?select=created_at,product_name,price_cents,quantity,currency,raw,is_refund` +
      `&created_at=gte.${encodeURIComponent(sinceISO)}` +
      `&is_test=eq.false` +
      `&order=created_at.asc&limit=100000`;

    const [res, salesRes, stripeLu] = await Promise.all([
      fetch(url, { headers: { apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}` } }),
      // Ventes = amelioration optionnelle : si la table "sales" n'existe pas encore
      // (SQL pas encore execute), on ne veut pas casser le reste du dashboard.
      fetch(salesUrl, { headers: { apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}` } }).catch((e) => e),
      lireStripe(sinceMs),
    ]);

    if (!res.ok) {
      console.error('dashboard-data read failed:', res.status, await res.text());
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Lecture Supabase echouee.' }) };
    }

    let salesRows = [];
    if (salesRes instanceof Response && salesRes.ok) {
      salesRows = await salesRes.json();
    } else {
      const detail = salesRes instanceof Response ? `${salesRes.status} ${await salesRes.text()}` : salesRes.message;
      console.error('dashboard-data sales read failed (degrade sans ventes):', detail);
    }

    const rows = await res.json();
    return { statusCode: 200, headers, body: JSON.stringify(aggregate(rows, days, salesRows, stripeLu)) };
  } catch (e) {
    console.error('dashboard-data failed:', e.message);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Erreur serveur.' }) };
  }
};
