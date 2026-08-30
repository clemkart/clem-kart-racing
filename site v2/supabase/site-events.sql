-- =============================================
-- Clem Kart Racing : Analytics site (first-party)
-- Table des événements du site vitrine.
-- Anonyme, sans cookies, sans PII (pas d'IP stockée).
-- Écriture/lecture : uniquement via les fonctions Netlify (service_role).
-- À exécuter une fois dans : Supabase → SQL Editor → New query → Run.
-- =============================================

CREATE TABLE IF NOT EXISTS public.site_events (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  type        TEXT NOT NULL,        -- pageview | gumroad_click | extract_click | tableur_signup
  path        TEXT,                 -- chemin de la page (ex: /index.html, /blog-freinage-degressif.html)
  referrer    TEXT,                 -- referrer brut (domaine d'origine)
  source      TEXT,                 -- dérivé : tiktok | instagram | youtube | google | direct | autre
  utm_source   TEXT,
  utm_medium   TEXT,
  utm_campaign TEXT,
  device      TEXT,                 -- mobile | desktop
  session_id  TEXT,                 -- id anonyme de visite (sessionStorage, pas de cookie)
  meta        JSONB                 -- détails libres (ex: { "cta": "hero" } pour un clic)
);

-- RLS activée, AUCUNE policy : la table est invisible au public.
-- Seules les fonctions Netlify utilisant la clé service_role peuvent écrire/lire.
ALTER TABLE public.site_events ENABLE ROW LEVEL SECURITY;

-- Index pour les requêtes du dashboard (par type + récence, et par récence seule).
CREATE INDEX IF NOT EXISTS site_events_type_created_idx ON public.site_events(type, created_at DESC);
CREATE INDEX IF NOT EXISTS site_events_created_idx      ON public.site_events(created_at DESC);
