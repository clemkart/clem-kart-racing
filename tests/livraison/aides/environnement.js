'use strict';
// Variables d'environnement FACTICES pour les tests : aucune vraie clé, aucun vrai domaine.
// Elles servent seulement à calculer des signatures et à construire des URL simulées.

const VALEURS = Object.freeze({
  STRIPE_SECRET_KEY: 'cle_stripe_factice_pour_tests',
  STRIPE_WEBHOOK_SECRET: 'secret_webhook_factice_pour_tests',
  BREVO_API_KEY: 'cle_brevo_factice_pour_tests',
  SUPABASE_URL: 'https://supabase.exemple.test',
  SUPABASE_SERVICE_ROLE_KEY: 'cle_supabase_factice_pour_tests',
  DOWNLOAD_SIGNING_SECRET: 'secret_de_signature_factice_pour_les_tests_0123456789',
  SITE_URL: 'https://boutique.exemple.test',
  EMAIL_SENDER: 'Clem Kart Racing <clement@exemple.test>',
  EMAIL_REPLY_TO: 'reponses@exemple.test',
  EMAIL_INTERNE: 'interne@exemple.test',
});

function installerEnvironnement() {
  for (const [nom, valeur] of Object.entries(VALEURS)) process.env[nom] = valeur;
  delete process.env.STRIPE_MODE;
  delete process.env.URL;
  delete process.env.CGV_PDF_URL;
}

module.exports = { VALEURS, installerEnvironnement };
