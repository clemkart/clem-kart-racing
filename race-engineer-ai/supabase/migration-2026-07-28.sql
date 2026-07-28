-- =============================================
-- Migration du 28/07/2026
-- À jouer dans Supabase : SQL Editor > New query > coller > Run
-- =============================================
-- Sans cette migration, la sauvegarde cloud des sessions échouera :
-- les fonctions écrivent désormais des colonnes qui n'existent pas encore.
--
-- Sûr à rejouer : IF NOT EXISTS partout, aucune donnée existante touchée.
-- =============================================

-- 1. L'arbre a DEUX caractéristiques physiques indépendantes.
--    L'ancien champ unique mélangeait longueur (court/standard) et
--    rigidité (tendre/medium/dur), ce qui rendait impossible de décrire
--    un arbre court ET dur. "arbre" ne porte plus que la rigidité.
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS arbre_longueur TEXT;

-- 2. Direct drive : le rapport est couronne / pignon, pas la couronne seule.
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS pignon INTEGER;

-- 3. Matériel : indispensable pour analyser a posteriori les diagnostics
--    par combo châssis x moteur. Le châssis n'était nulle part en base.
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS chassis TEXT;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS moteur_type TEXT;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS moteur_family TEXT;

-- 4. Contrôle : la colonne couronne était systématiquement NULL car le code
--    lisait context.couronne, qui n'a jamais existé (c'est couronneMono,
--    couronneDD2 ou couronneKz selon la famille moteur). Corrigé côté code.
--    Cette requête doit renvoyer 0 ligne une fois quelques sessions créées :
-- SELECT count(*) FROM sessions WHERE couronne IS NULL AND created_at > now() - interval '1 day';

-- 5. Vérification finale des colonnes ajoutées
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'sessions'
  AND column_name IN ('arbre_longueur','pignon','chassis','moteur_type','moteur_family')
ORDER BY column_name;
