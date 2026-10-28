'use strict';
// Webhook Stripe : POST /.netlify/functions/stripe-webhook (même endpoint, plus tard, pour la livraison du guide).
// Aujourd'hui : les commandes de débrief onboard. Pour chaque session payée d'un des deux liens du débrief
// (config/offres.json : debrief.stripe.plink et equitable.debrief_lecteur.stripe.plink) :
//   1. email « Nouveau débrief : <nom> » à EMAIL_INTERNE (défaut contact.email) : lien vidéo, circuit et kart,
//      accord d'utilisation, montant, option guide, dates, lien du paiement dans le Dashboard ;
//   2. confirmation au client, avec le guide et le tableur s'il a pris l'option (GUIDE_PDF_URL, TABLEUR_URL).
// Un seul envoi par session : la session est d'abord réservée dans la table debriefs (clé primaire session_id),
// puis interne_envoye_le est daté une fois l'email interne parti. Rejeu de Stripe : la ligne est datée, rien ne
// repart. Échec de l'email interne : la réservation est annulée et la fonction répond 500, Stripe réessaie
// (jusqu'à 3 jours). Réservation jamais datée (fonction coupée) : reprise au rejeu après 2 minutes.
// Mode test Stripe : signature vérifiée avec STRIPE_WEBHOOK_SECRET_TEST (facultatif), session reconnue au champ
// lienonboard (les liens de test ont d'autres identifiants), sujet interne préfixé [TEST].
// Aucun nom ni email dans les logs : seulement l'identifiant de session.

const { envoyerEmail } = require('../lib/brevo');
const emails = require('../lib/emails');
const supabase = require('../lib/supabase');
const { verifierSignature, lireLignesSession, lienDashboardPaiement } = require('../lib/stripe');
const { echeanceDebrief, formaterDateHeure } = require('../lib/dates');
const { formaterMontant, prenomDepuisNom, estEmailValide, estUrlHttps } = require('../lib/format');
const { reponseJson, corpsBrut, corpsTexte, entete } = require('../lib/http');
const { lire, avecDefaut } = require('../lib/config');
const OFFRES = require('../../../config/offres.json');

const JOURNAL = '[stripe-webhook]';
const TYPES_TRAITES = new Set(['checkout.session.completed', 'checkout.session.async_payment_succeeded']);
const LIENS_DEBRIEF = new Set([OFFRES.debrief.stripe.plink, OFFRES.equitable.debrief_lecteur.stripe.plink]);
// Montant à partir duquel l'option guide est comprise (repli si les lignes du panier sont illisibles).
// Les codes promo sont désactivés sur les liens du débrief : le montant payé suffit à trancher.
const SEUIL_OPTION_CENTIMES = Math.round((OFFRES.debrief.prix + OFFRES.debrief.option_guide.prix) * 100);
const LONGUEUR_MAX_CHAMP = 300;
// Au-delà, une réservation sans email interne est abandonnée (une fonction Netlify dure au plus quelques secondes).
const RESERVATION_PERIMEE_MS = 2 * 60 * 1000;
const USAGES = Object.freeze({
  non: 'Non, vidéo privée',
  ouianonyme: "Oui, si son nom n'apparaît pas",
  ouilibre: 'Oui, sans restriction',
});

async function handler(event) {
  if (event.httpMethod !== 'POST') return reponseJson(405, { ok: false, erreur: 'methode_non_autorisee' }, { Allow: 'POST' });

  const signature = verifierEvenement(event);
  if (signature.erreur) return reponseJson(signature.statut, { ok: false, erreur: signature.erreur });

  let evenement;
  try {
    evenement = JSON.parse(corpsTexte(event));
  } catch {
    return reponseJson(400, { ok: false, erreur: 'json_invalide' });
  }
  // Un secret de test ne fait jamais passer un événement réel (et inversement).
  if (!evenement || evenement.livemode !== signature.livemode) return reponseJson(400, { ok: false, erreur: 'mode_incoherent' });
  if (!TYPES_TRAITES.has(evenement.type)) return reponseJson(200, { ok: true, ignore: 'type' });

  const session = evenement.data && evenement.data.object;
  if (!session || session.object !== 'checkout.session' || typeof session.id !== 'string') {
    return reponseJson(200, { ok: true, ignore: 'objet' });
  }
  if (session.payment_status !== 'paid') return reponseJson(200, { ok: true, ignore: 'non_paye' });
  if (!estSessionDebrief(session)) return reponseJson(200, { ok: true, ignore: 'autre_produit' });

  try {
    const resultat = await traiterDebrief(session, evenement);
    return reponseJson(200, { ok: true, ...resultat });
  } catch (err) {
    console.error(`${JOURNAL} ${session.id} : ${err.message}`);
    return reponseJson(500, { ok: false, erreur: 'traitement' });
  }
}

// Signature valide avec le secret réel (livemode true) ou celui du mode test (livemode false).
function verifierEvenement(event) {
  const secretReel = lire('STRIPE_WEBHOOK_SECRET');
  const secretTest = lire('STRIPE_WEBHOOK_SECRET_TEST');
  if (!secretReel && !secretTest) {
    console.error(`${JOURNAL} STRIPE_WEBHOOK_SECRET manquante`);
    return { statut: 500, erreur: 'configuration' };
  }
  const brut = corpsBrut(event);
  const enteteSignature = entete(event, 'stripe-signature');
  if (secretReel && verifierSignature(brut, enteteSignature, secretReel).valide) return { livemode: true };
  if (secretTest && verifierSignature(brut, enteteSignature, secretTest).valide) return { livemode: false };
  console.warn(`${JOURNAL} signature refusée`);
  return { statut: 400, erreur: 'signature_invalide' };
}

function idLien(paymentLink) {
  if (typeof paymentLink === 'string') return paymentLink;
  return (paymentLink && paymentLink.id) || '';
}

// Réel : un des deux liens du débrief. Test : n'importe quel lien qui demande le lien de la vidéo.
function estSessionDebrief(session) {
  if (session.livemode !== false) return LIENS_DEBRIEF.has(idLien(session.payment_link));
  return LIENS_DEBRIEF.has(idLien(session.payment_link)) || Boolean(champ(session, 'lienonboard'));
}

// Valeur d'un champ personnalisé du paiement (texte ou liste déroulante), nettoyée et bornée.
function champ(session, cle) {
  const trouve = (Array.isArray(session.custom_fields) ? session.custom_fields : []).find((c) => c && c.key === cle);
  if (!trouve) return '';
  const valeur = trouve.type === 'dropdown' ? trouve.dropdown && trouve.dropdown.value : trouve.text && trouve.text.value;
  return typeof valeur === 'string' ? valeur.replace(/[\r\n]+/g, ' ').trim().slice(0, LONGUEUR_MAX_CHAMP) : '';
}

// « youtu.be/abc » devient « https://youtu.be/abc » ; une saisie qui n'est pas une adresse reste du texte.
function normaliserLienVideo(valeur) {
  if (!valeur) return '';
  if (/^https?:\/\//i.test(valeur)) return valeur.replace(/^http:\/\//i, 'https://');
  if (/^(www\.)?[a-z0-9-]+(\.[a-z0-9-]+)+\/\S*$/i.test(valeur)) return `https://${valeur}`;
  return valeur;
}

// Option guide : d'abord les lignes du panier (réel seulement : la clé de lecture est celle du compte réel),
// sinon le montant payé. deduite = true quand le montant a tranché.
async function lireOptionGuide(session) {
  if (session.livemode !== false) {
    try {
      const lignes = await lireLignesSession(session.id);
      if (lignes) {
        const option = lignes.some((l) => /guide|comprendre/i.test(l.description || '') && !/d[ée]brief/i.test(l.description || ''));
        return { option, deduite: false };
      }
    } catch (err) {
      console.warn(`${JOURNAL} ${session.id} : lignes du panier illisibles (${err.message}), repli sur le montant`);
    }
  }
  return { option: Number(session.amount_total) >= SEUIL_OPTION_CENTIMES, deduite: true };
}

// Adresses du guide et du tableur (fichiers-payants.json, hors dépôt public) : variables Netlify.
function fichiersGuide() {
  const guide = lire('GUIDE_PDF_URL');
  const tableur = lire('TABLEUR_URL');
  return estUrlHttps(guide) && estUrlHttps(tableur) ? { guide, tableur } : null;
}

// Session déjà réservée : 'faite' (email interne parti), 'perimee' (réservation abandonnée, par exemple une
// fonction coupée entre la réservation et l'email : on reprend) ou 'en_cours' (trop récente pour trancher).
async function etatReservation(sessionId) {
  const [ligne] = await supabase.lire('debriefs', {
    select: 'interne_envoye_le,cree_le',
    filtres: { session_id: `eq.${sessionId}` },
    limite: 1,
  });
  if (!ligne) return 'en_cours';
  if (ligne.interne_envoye_le) return 'faite';
  const age = Date.now() - new Date(ligne.cree_le).getTime();
  return age > RESERVATION_PERIMEE_MS ? 'perimee' : 'en_cours';
}

// Annule la réservation : Stripe réessaiera et l'envoi repartira de zéro.
// Si l'annulation échoue, la réservation sans email interne sera reprise une fois périmée.
async function liberer(sessionId) {
  try {
    await supabase.supprimer('debriefs', { session_id: `eq.${sessionId}` });
  } catch (err) {
    console.error(`${JOURNAL} ${sessionId} : réservation non annulée (${err.message}), reprise au rejeu une fois périmée`);
  }
}

function lireClient(session) {
  const details = session.customer_details || {};
  const individuel = session.collected_information && session.collected_information.individual_name;
  return {
    nom: String(details.name || individuel || '').trim(),
    email: String(details.email || session.customer_email || '').trim(),
  };
}

async function traiterDebrief(session, evenement) {
  const commande = new Date((Number(evenement.created) || Math.floor(Date.now() / 1000)) * 1000);
  const echeance = echeanceDebrief(commande);
  const { option, deduite } = await lireOptionGuide(session);
  // Jamais les vrais fichiers pour un paiement de test (carte 4242) : un lien de test partagé les donnerait.
  const fichiers = option && session.livemode !== false ? fichiersGuide() : null;

  const reserves = await supabase.inserer(
    'debriefs',
    [{ session_id: session.id, echeance: echeance.toISOString(), option_guide: option, statut: 'a_faire' }],
    { ignorerDoublons: true, renvoyer: true }
  );
  if (!reserves.length) {
    const etat = await etatReservation(session.id);
    if (etat === 'faite') {
      console.log(`${JOURNAL} ${session.id} : déjà traitée, aucun email`);
      return { deja_traite: true };
    }
    // Réservation récente sans email interne : un autre envoi est en cours, Stripe réessaiera plus tard.
    if (etat === 'en_cours') throw new Error('réservation en cours, nouvel essai attendu');
    console.warn(`${JOURNAL} ${session.id} : réservation périmée sans email interne, reprise`);
  }

  const { nom, email } = lireClient(session);
  const lienVideo = normaliserLienVideo(champ(session, 'lienonboard'));
  const usage = champ(session, 'usagevideo');
  const echeanceTexte = formaterDateHeure(echeance);

  const interne = emails.emailDebriefInterne({
    nom,
    email,
    lienVideo,
    circuitKart: champ(session, 'circuitkart'),
    usageLibelle: USAGES[usage] || (usage ? `Réponse inconnue (${usage})` : 'Non renseigné'),
    montant: formaterMontant(session.amount_total, session.currency),
    optionGuide: option,
    optionDeduite: deduite,
    commandeLe: formaterDateHeure(commande),
    echeance: echeanceTexte,
    lienDashboard: lienDashboardPaiement(session.payment_intent, session.livemode),
    sessionId: session.id,
    guideAEnvoyer: option && !fichiers && session.livemode !== false,
  });
  const sujetInterne = session.livemode === false ? `[TEST] ${interne.sujet}` : interne.sujet;
  try {
    await envoyerEmail({
      destinataire: { email: avecDefaut('EMAIL_INTERNE') },
      ...interne,
      sujet: sujetInterne,
      repondreA: estEmailValide(email) ? email : undefined,
    });
  } catch (err) {
    await liberer(session.id);
    throw err;
  }
  // Marque l'email interne comme parti. Un échec ici n'est pas bloquant : la réponse 200 empêche tout rejeu.
  try {
    await supabase.mettreAJour('debriefs', { session_id: `eq.${session.id}` }, { interne_envoye_le: new Date(Date.now()).toISOString() });
  } catch (err) {
    console.error(`${JOURNAL} ${session.id} : envoi interne non marqué (${err.message})`);
  }

  if (!estEmailValide(email)) {
    await alerter(session.id, { nom, email, raison: 'adresse email du client invalide' });
    return { interne: true, client: false };
  }
  try {
    const confirmation = emails.emailDebriefClient({
      prenom: prenomDepuisNom(nom),
      lienVideo,
      echeance: echeanceTexte,
      optionGuide: option,
      fichiers,
      delaiGuideH: OFFRES.delais.option_guide_h,
    });
    await envoyerEmail({ destinataire: { email, nom }, ...confirmation });
    return { interne: true, client: true };
  } catch (err) {
    // La commande est arrivée chez Clément : on ne la renvoie pas, on le prévient d'écrire au client.
    console.error(`${JOURNAL} ${session.id} : confirmation client non envoyée (${err.message})`);
    await alerter(session.id, { nom, email, raison: err.message });
    return { interne: true, client: false };
  }
}

async function alerter(sessionId, details) {
  try {
    await envoyerEmail({ destinataire: { email: avecDefaut('EMAIL_INTERNE') }, ...emails.emailAlerteDebrief(details) });
  } catch (err) {
    console.error(`${JOURNAL} ${sessionId} : alerte non envoyée (${err.message})`);
  }
}

module.exports = { handler, estSessionDebrief, champ, normaliserLienVideo, SEUIL_OPTION_CENTIMES };
