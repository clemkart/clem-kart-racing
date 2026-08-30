-- =============================================
-- Clem Kart Racing : Ventes reelles Gumroad (Phase 2)
-- Table des ventes recues via le webhook "Ping" de Gumroad.
-- Pas d'email ni de nom stockes (ni dans les colonnes, ni dans "raw").
-- Ecriture : uniquement via netlify/functions/gumroad-ping.js (service_role).
-- A executer une fois dans : Supabase -> SQL Editor -> New query -> Run.
-- =============================================

CREATE TABLE IF NOT EXISTS public.sales (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  created_at    TIMESTAMPTZ DEFAULT NOW(),  -- moment de reception du ping
  sale_id       TEXT UNIQUE,                -- id Gumroad, cle d'idempotence (evite les doublons)
  product_name  TEXT,
  price_cents   INTEGER,                    -- prix en centimes (ex 1499 = 14,99)
  currency      TEXT,
  quantity      INTEGER DEFAULT 1,
  discount_code TEXT,
  referrer      TEXT,                       -- si Gumroad le fournit, sinon NULL
  is_refund     BOOLEAN DEFAULT FALSE,
  is_test       BOOLEAN DEFAULT FALSE,       -- ping de test Gumroad ("Send test ping")
  raw           JSONB                        -- payload complet SANS email/nom, pour ne rien perdre
);

-- RLS activee, AUCUNE policy : la table est invisible au public.
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS sales_created_idx ON public.sales(created_at DESC);
