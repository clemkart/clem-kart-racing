-- =============================================
-- Race Engineer AI : migration du 28/07/2026
-- =============================================
-- OU LA JOUER : Supabase > SQL Editor > New query > coller > Run
--
-- A FAIRE AVANT LE DEPLOIEMENT. Sans elle, la sauvegarde cloud des sessions
-- echouera : les fonctions ecrivent desormais des colonnes qui n'existent pas.
--
-- Sure a rejouer autant de fois que voulu : tout est en IF NOT EXISTS,
-- aucune donnee existante n'est modifiee ni supprimee.
-- =============================================

-- 1. L'arbre a DEUX caracteristiques physiques independantes.
--    L'ancien champ unique melangeait longueur (court/standard) et rigidite
--    (tendre/medium/dur), ce qui rendait impossible de decrire un arbre court
--    ET dur. Desormais "arbre" ne porte plus que la rigidite.
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS arbre_longueur TEXT;

-- 2. Direct drive : le rapport est couronne / pignon, pas la couronne seule.
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS pignon INTEGER;

-- 3. Materiel. Le chassis n'etait stocke nulle part, ce qui rendait impossible
--    d'analyser a posteriori les diagnostics par combo chassis x moteur.
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS chassis TEXT;
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS moteur_type TEXT;
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS moteur_family TEXT;

-- 4. Geometrie avant complete, position pilote et gomme montee.
--    Ces reglages sont parmi les plus determinants du karting et n'etaient
--    pas demandes au pilote jusqu'ici.
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS carrossage INTEGER;
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS siege TEXT;
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS siege_hauteur TEXT;
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS lestage INTEGER;
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS pneu_marque TEXT;
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS pneu_modele TEXT;

-- 5. Modele et millesime de chassis, sur le PROFIL pilote.
--    Le modele change la logique de reglage autant que la marque : un
--    Sodikart Sigma RS3 (Rotax / X30 / OK, gommes medium) et un Sigma KZ
--    (shifter) ne se reglent pas pareil.
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS chassis_modele TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS chassis_annee TEXT;

-- =============================================
-- VERIFICATION : doit renvoyer 13 lignes
-- =============================================
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND (
    (table_name = 'sessions' AND column_name IN (
      'arbre_longueur','pignon','chassis','moteur_type','moteur_family',
      'carrossage','siege','siege_hauteur','lestage','pneu_marque','pneu_modele'))
    OR
    (table_name = 'profiles' AND column_name IN ('chassis_modele','chassis_annee'))
  )
ORDER BY table_name, column_name;
