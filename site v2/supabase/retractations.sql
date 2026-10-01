-- =============================================
-- Clem Kart Racing : demandes de rétractation (page /retractation/)
-- Table écrite et lue par netlify/functions/retractation.js (clé service_role).
-- Trace horodatée SANS nom ni email : seulement la référence de commande (masquée si
-- c'est un email), le produit et l'empreinte sha256 de l'email (limite de 2 demandes
-- par email sur 24 h). tests/run-schemas.js vérifie que ce fichier déclare bien chaque
-- colonne que la fonction écrit ou filtre.
-- À exécuter une fois dans : Supabase, SQL Editor, New query, Run. Sans risque si la
-- table existe déjà (créée par stripe-livraison.sql sans la colonne email_empreinte) :
-- le « alter table » ajoute la colonne manquante, rien n'est effacé.
-- =============================================

create table if not exists public.retractations (
  id              bigint generated always as identity primary key,
  reference       text not null,
  produit         text not null check (produit in ('debrief', 'guide', 'les_deux')),
  recu_le         timestamptz not null default now(),
  email_empreinte text not null
);

-- Table créée avant la page /retractation/ : la colonne manquait. Les anciennes lignes
-- n'ont pas d'empreinte, la colonne reste donc facultative dans ce cas.
alter table public.retractations add column if not exists email_empreinte text;

-- Lecture de la limite par email : « email_empreinte = x et recu_le >= il y a 24 h ».
create index if not exists retractations_recu_le_idx on public.retractations (recu_le desc);
create index if not exists retractations_email_recu_idx on public.retractations (email_empreinte, recu_le desc);

-- RLS activée, aucune policy : les rôles anon et authenticated n'ont accès à rien.
alter table public.retractations enable row level security;

-- Ceinture et bretelles : aucun droit pour les clés publiques (service_role garde ses droits).
revoke all on public.retractations from anon, authenticated;
