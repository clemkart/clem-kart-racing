-- =============================================
-- Race Engineer AI : Schéma Supabase
-- À exécuter dans Supabase → SQL Editor
-- =============================================

-- Table des profils pilotes (liée à auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  -- Profil pilote technique (étape C)
  taille_cm INTEGER,
  poids_kg INTEGER,
  categorie_principale TEXT,   -- "Mini", "Cadet", "Junior X30", "Senior Rotax", "KZ", "DD2", "Endurance", "Loisir", etc.
  chassis TEXT DEFAULT 'OTK',   -- "Tony Kart", "Kosmic", "CRG", "Birel ART", "Sodikart", "Praga", etc.
  moteur TEXT DEFAULT 'mono',   -- "X30 Senior", "Rotax Max", "DD2", "KZ", "OK", "Rok GP", "Mini Swift", etc.
  style_pilotage TEXT,           -- "Agressif freinage", "Finesse glisses", "Conservateur régulier", "Intuitif", "Analytique", "Mixte"
  niveau TEXT,                   -- "Loisir", "Régional", "National", "International"
  mode_pilotage TEXT DEFAULT 'proprio',  -- 'proprio' (kart réglable) | 'location' (focus pilotage)
  qui_pilote TEXT DEFAULT 'moi',         -- 'moi' | 'enfant' (parent qui gère le kart de son enfant)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Migration pour bases existantes (idempotent : safe à ré-exécuter)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS taille_cm INTEGER,
  ADD COLUMN IF NOT EXISTS poids_kg INTEGER,
  ADD COLUMN IF NOT EXISTS categorie_principale TEXT,
  ADD COLUMN IF NOT EXISTS style_pilotage TEXT,
  ADD COLUMN IF NOT EXISTS niveau TEXT,
  ADD COLUMN IF NOT EXISTS mode_pilotage TEXT DEFAULT 'proprio',
  ADD COLUMN IF NOT EXISTS qui_pilote TEXT DEFAULT 'moi',
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Table des sessions karting
CREATE TABLE IF NOT EXISTS public.sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Conditions
  circuit TEXT,
  meteo TEXT,
  grip TEXT,
  temp_air INTEGER,
  temp_piste INTEGER,
  session_type TEXT,

  -- Comportement
  comportement TEXT,
  intensite INTEGER,
  notes TEXT,

  -- Chronos (format brut saisi : "52.34" ou "1:02.45")
  best_lap TEXT,
  avg_lap TEXT,
  laps INTEGER,

  -- Réglages châssis
  barre TEXT,
  voie_av INTEGER,
  pincement INTEGER,
  voie_ar DECIMAL(4,1),
  arbre TEXT,           -- rigidite : tendre / medium / dur
  arbre_longueur TEXT,  -- longueur : court / standard / long (independant)
  moyeux TEXT,
  parechocs TEXT,
  chasse INTEGER,
  garde_av TEXT,
  garde_ar TEXT,

  -- Materiel
  chassis TEXT,
  moteur TEXT,
  moteur_type TEXT,     -- mono / dd2 / kz (toggle transmission)
  moteur_family TEXT,   -- direct_drive / dd2 / kz_shifter / 4t
  couronne INTEGER,
  pignon INTEGER,       -- direct drive uniquement
  gicleur INTEGER,

  -- Pressions pneus (JSON)
  pressures JSONB,

  -- Résultat IA
  diagnostic_html TEXT,
  chat_history JSONB DEFAULT '[]'::jsonb
);

-- Migration chronos pour bases existantes (idempotent)
ALTER TABLE public.sessions
  ADD COLUMN IF NOT EXISTS best_lap TEXT,
  ADD COLUMN IF NOT EXISTS avg_lap TEXT,
  ADD COLUMN IF NOT EXISTS laps INTEGER;

-- Index pour requêtes rapides par user
CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON public.sessions(user_id);
CREATE INDEX IF NOT EXISTS sessions_created_at_idx ON public.sessions(created_at DESC);

-- RLS (Row Level Security) : chaque pilote ne voit que ses sessions
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles: lecture propre" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Profiles: mise à jour propre" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Profiles: insertion propre" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Sessions: lecture propre" ON public.sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Sessions: insertion propre" ON public.sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Sessions: suppression propre" ON public.sessions
  FOR DELETE USING (auth.uid() = user_id);

-- Trigger : créer un profil automatiquement à l'inscription
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================
-- FREEMIUM : plan + compteur d'usage IA mensuel
-- =============================================

-- Plan d'abonnement ('free' par défaut ; 'pro' / 'club' / 'founder' = illimité)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS plan TEXT DEFAULT 'free';

-- Compteur de messages IA par utilisateur et par mois ('YYYY-MM')
CREATE TABLE IF NOT EXISTS public.ai_usage (
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  month TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, month)
);

ALTER TABLE public.ai_usage ENABLE ROW LEVEL SECURITY;

-- Le pilote peut consulter son propre usage (affichage "X/30 ce mois-ci")
DROP POLICY IF EXISTS "Usage: lecture propre" ON public.ai_usage;
CREATE POLICY "Usage: lecture propre" ON public.ai_usage
  FOR SELECT USING (auth.uid() = user_id);
-- Aucune policy INSERT/UPDATE : seules les functions serveur (service_role) écrivent

-- Incrément atomique, appelé uniquement côté serveur (chat.js avec service_role)
CREATE OR REPLACE FUNCTION public.increment_ai_usage(p_user_id UUID, p_month TEXT)
RETURNS INTEGER AS $$
DECLARE new_count INTEGER;
BEGIN
  INSERT INTO public.ai_usage (user_id, month, count, updated_at)
  VALUES (p_user_id, p_month, 1, NOW())
  ON CONFLICT (user_id, month)
  DO UPDATE SET count = public.ai_usage.count + 1, updated_at = NOW()
  RETURNING count INTO new_count;
  RETURN new_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- SECURITY DEFINER exposé via PostgREST : interdire l'appel aux clients web,
-- sinon n'importe qui avec l'anon key pourrait incrémenter le compteur d'autrui
REVOKE EXECUTE ON FUNCTION public.increment_ai_usage(UUID, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.increment_ai_usage(UUID, TEXT) FROM anon;
REVOKE EXECUTE ON FUNCTION public.increment_ai_usage(UUID, TEXT) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.increment_ai_usage(UUID, TEXT) TO service_role;

-- =============================================
-- ANALYTICS FIRST-PARTY (anonyme, sans cookies)
-- Évènements produit : page_view, analyze, chat_sent, auth_wall,
-- login, quota_exhausted, pro_waitlist, export_card, feedback, demo_session…
-- =============================================
CREATE TABLE IF NOT EXISTS public.events (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  event TEXT NOT NULL,
  user_id UUID,
  meta JSONB
);

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
-- Aucune policy : seul le service_role (function track.js) écrit/lit.
-- Consultation : Supabase Dashboard → Table Editor, ou requêtes SQL ad hoc.

CREATE INDEX IF NOT EXISTS events_event_created_idx ON public.events(event, created_at DESC);
