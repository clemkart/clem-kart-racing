-- =============================================
-- Race Engineer AI : SETUP COMPLET de la base
-- =============================================
-- A jouer dans Supabase > SQL Editor > New query > coller > Run
-- PROJET CONCERNE : hkpknrrymgbnjmbewlyc (verifier l'URL du dashboard)
--
-- Ce script cree TOUT ce qui manque et applique la migration du 28/07/2026.
-- Entierement idempotent : rejouable sans risque, aucune donnee existante
-- n'est supprimee ni ecrasee.
-- =============================================


-- =============================================
-- 1. PROFILS PILOTES
-- =============================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS taille_cm INTEGER,
  ADD COLUMN IF NOT EXISTS poids_kg INTEGER,
  ADD COLUMN IF NOT EXISTS categorie_principale TEXT,
  ADD COLUMN IF NOT EXISTS chassis TEXT,
  ADD COLUMN IF NOT EXISTS chassis_modele TEXT,
  ADD COLUMN IF NOT EXISTS chassis_annee TEXT,
  ADD COLUMN IF NOT EXISTS moteur TEXT,
  ADD COLUMN IF NOT EXISTS style_pilotage TEXT,
  ADD COLUMN IF NOT EXISTS niveau TEXT,
  ADD COLUMN IF NOT EXISTS mode_pilotage TEXT DEFAULT 'proprio',
  ADD COLUMN IF NOT EXISTS qui_pilote TEXT DEFAULT 'moi',
  ADD COLUMN IF NOT EXISTS plan TEXT DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();


-- =============================================
-- 2. SESSIONS KARTING
-- =============================================
CREATE TABLE IF NOT EXISTS public.sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.sessions
  -- Conditions de piste
  ADD COLUMN IF NOT EXISTS circuit TEXT,
  ADD COLUMN IF NOT EXISTS meteo TEXT,
  ADD COLUMN IF NOT EXISTS grip TEXT,
  ADD COLUMN IF NOT EXISTS temp_air INTEGER,
  ADD COLUMN IF NOT EXISTS temp_piste INTEGER,
  ADD COLUMN IF NOT EXISTS session_type TEXT,
  -- Ressenti pilote
  ADD COLUMN IF NOT EXISTS comportement TEXT,
  ADD COLUMN IF NOT EXISTS intensite INTEGER,
  ADD COLUMN IF NOT EXISTS notes TEXT,
  -- Chronos
  ADD COLUMN IF NOT EXISTS best_lap TEXT,
  ADD COLUMN IF NOT EXISTS avg_lap TEXT,
  ADD COLUMN IF NOT EXISTS laps INTEGER,
  -- Reglages chassis
  ADD COLUMN IF NOT EXISTS barre TEXT,
  ADD COLUMN IF NOT EXISTS voie_av INTEGER,
  ADD COLUMN IF NOT EXISTS pincement INTEGER,
  ADD COLUMN IF NOT EXISTS voie_ar DECIMAL(4,1),
  ADD COLUMN IF NOT EXISTS arbre TEXT,
  ADD COLUMN IF NOT EXISTS arbre_longueur TEXT,
  ADD COLUMN IF NOT EXISTS moyeux TEXT,
  ADD COLUMN IF NOT EXISTS parechocs TEXT,
  ADD COLUMN IF NOT EXISTS chasse INTEGER,
  ADD COLUMN IF NOT EXISTS carrossage INTEGER,
  ADD COLUMN IF NOT EXISTS garde_av TEXT,
  ADD COLUMN IF NOT EXISTS garde_ar TEXT,
  -- Position pilote
  ADD COLUMN IF NOT EXISTS siege TEXT,
  ADD COLUMN IF NOT EXISTS siege_hauteur TEXT,
  ADD COLUMN IF NOT EXISTS lestage INTEGER,
  -- Materiel
  ADD COLUMN IF NOT EXISTS chassis TEXT,
  ADD COLUMN IF NOT EXISTS moteur TEXT,
  ADD COLUMN IF NOT EXISTS moteur_type TEXT,
  ADD COLUMN IF NOT EXISTS moteur_family TEXT,
  ADD COLUMN IF NOT EXISTS couronne INTEGER,
  ADD COLUMN IF NOT EXISTS pignon INTEGER,
  ADD COLUMN IF NOT EXISTS gicleur INTEGER,
  -- Pneus
  ADD COLUMN IF NOT EXISTS pneu_marque TEXT,
  ADD COLUMN IF NOT EXISTS pneu_modele TEXT,
  ADD COLUMN IF NOT EXISTS pressures JSONB,
  -- Resultat
  ADD COLUMN IF NOT EXISTS diagnostic_html TEXT,
  ADD COLUMN IF NOT EXISTS chat_history JSONB DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON public.sessions(user_id);
CREATE INDEX IF NOT EXISTS sessions_created_at_idx ON public.sessions(created_at DESC);


-- =============================================
-- 3. COMPTEUR D'USAGE IA (freemium)
-- =============================================
CREATE TABLE IF NOT EXISTS public.ai_usage (
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  month TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, month)
);


-- =============================================
-- 4. ANALYTICS (anonyme, sans cookies)
-- =============================================
CREATE TABLE IF NOT EXISTS public.events (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  event TEXT NOT NULL,
  user_id UUID,
  meta JSONB
);

CREATE INDEX IF NOT EXISTS events_event_created_idx ON public.events(event, created_at DESC);


-- =============================================
-- 5. SECURITE : chaque pilote ne voit que ses donnees
-- =============================================
ALTER TABLE public.profiles  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_usage  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events    ENABLE ROW LEVEL SECURITY;

-- DROP puis CREATE : rend le script rejouable (CREATE POLICY IF NOT EXISTS
-- n'existe pas sur toutes les versions de Postgres).
DROP POLICY IF EXISTS "Profiles: lecture propre" ON public.profiles;
CREATE POLICY "Profiles: lecture propre" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Profiles: mise a jour propre" ON public.profiles;
DROP POLICY IF EXISTS "Profiles: mise à jour propre" ON public.profiles;
CREATE POLICY "Profiles: mise a jour propre" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Profiles: insertion propre" ON public.profiles;
CREATE POLICY "Profiles: insertion propre" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Sessions: lecture propre" ON public.sessions;
CREATE POLICY "Sessions: lecture propre" ON public.sessions
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Sessions: insertion propre" ON public.sessions;
CREATE POLICY "Sessions: insertion propre" ON public.sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Sessions: suppression propre" ON public.sessions;
CREATE POLICY "Sessions: suppression propre" ON public.sessions
  FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Usage: lecture propre" ON public.ai_usage;
CREATE POLICY "Usage: lecture propre" ON public.ai_usage
  FOR SELECT USING (auth.uid() = user_id);
-- Aucune policy d'ecriture sur ai_usage ni events : seules les fonctions
-- serveur (service_role) y ecrivent.


-- =============================================
-- 6. CREATION AUTOMATIQUE DU PROFIL A L'INSCRIPTION
-- =============================================
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

-- Rattrapage : cree le profil des comptes deja inscrits qui n'en ont pas
INSERT INTO public.profiles (id, email)
SELECT u.id, u.email FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL;


-- =============================================
-- 7. INCREMENT ATOMIQUE DU COMPTEUR IA
-- =============================================
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

-- Interdire l'appel depuis le navigateur : sinon n'importe qui pourrait
-- incrementer le compteur d'un autre pilote avec la cle publique.
REVOKE EXECUTE ON FUNCTION public.increment_ai_usage(UUID, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.increment_ai_usage(UUID, TEXT) FROM anon;
REVOKE EXECUTE ON FUNCTION public.increment_ai_usage(UUID, TEXT) FROM authenticated;
GRANT  EXECUTE ON FUNCTION public.increment_ai_usage(UUID, TEXT) TO service_role;



-- =============================================
-- 7 bis. COLONNE `plan` NON MODIFIABLE PAR LE PILOTE
-- =============================================
-- ⚠️ CORRECTIF DE SECURITE, PAS UNE OPTION.
-- La policy "Profiles: mise a jour propre" autorise le pilote a mettre a jour
-- SA ligne. Sans le grant colonne par colonne ci-dessous, elle l autorise donc
-- aussi a ecrire `plan` : n importe quel compte gratuit pouvait s attribuer
-- `paddock` et s offrir 1500 credits par mois. RLS dit QUELLES LIGNES on peut
-- toucher, jamais QUELLES COLONNES : c est le grant qui le dit.
--
-- Ce fichier s appelle "setup complet" : il DOIT produire une base sure. Le
-- bloc ne vivait que dans migration-2026-07-29-plan-non-modifiable.sql, donc
-- toute installation neuve faite avec ce script rouvrait le trou en silence.
-- Ajoute ici le 2026-08-07. Ne pas le retirer.
REVOKE UPDATE ON public.profiles FROM authenticated;

GRANT UPDATE (
  taille_cm, poids_kg, categorie_principale,
  chassis, chassis_modele, chassis_annee, moteur,
  style_pilotage, niveau, mode_pilotage, qui_pilote,
  updated_at
) ON public.profiles TO authenticated;

REVOKE UPDATE ON public.profiles FROM anon;

-- =============================================
-- 8. VERIFICATION FINALE
-- =============================================
-- Doit renvoyer les 4 tables : ai_usage, events, profiles, sessions
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_name IN ('profiles','sessions','ai_usage','events')
ORDER BY table_name;
