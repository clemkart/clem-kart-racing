-- =============================================
-- Clem Kart Racing : débriefs onboard commandés sur Stripe
-- Table écrite par netlify/functions/stripe-webhook.js (clé service_role).
-- Une ligne par session de paiement : elle est créée AVANT l'envoi des emails et sa clé
-- primaire garantit un seul email par commande, même si Stripe renvoie l'événement.
-- Aucune donnée personnelle : ni nom, ni email, ni lien vidéo (ils voyagent dans l'email).
-- tests/run-schemas.js vérifie que ce fichier déclare chaque colonne que la fonction écrit.
-- À exécuter une fois dans : Supabase, SQL Editor, New query, Run. Sans risque si la
-- table existe déjà (créée par stripe-livraison.sql du paquet livraison-phase2) : rien
-- n'est effacé.
-- =============================================

create table if not exists public.debriefs (
  session_id   text primary key,
  echeance     timestamptz not null,
  statut       text not null default 'a_faire' check (statut in ('a_faire', 'en_cours', 'livre', 'annule')),
  option_guide boolean not null default false,
  cree_le      timestamptz not null default now(),
  livre_le     timestamptz,
  interne_envoye_le timestamptz
);

-- Table créée par stripe-livraison.sql avant le webhook : la colonne manquait. Vide = email
-- interne pas encore parti ; une ligne vide de plus de 2 minutes est reprise au rejeu de Stripe.
alter table public.debriefs add column if not exists interne_envoye_le timestamptz;

-- Débriefs à livrer, du plus urgent au moins urgent.
create index if not exists debriefs_statut_echeance_idx on public.debriefs (statut, echeance);

-- RLS activée, aucune policy : les rôles anon et authenticated n'ont accès à rien.
alter table public.debriefs enable row level security;

-- Ceinture et bretelles : aucun droit pour les clés publiques (service_role garde ses droits).
revoke all on public.debriefs from anon, authenticated;
