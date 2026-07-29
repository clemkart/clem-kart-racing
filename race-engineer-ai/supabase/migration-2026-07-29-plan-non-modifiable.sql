-- =============================================
-- Le pilote ne doit pas pouvoir s'attribuer un plan payant
-- =============================================
-- PROBLEME
-- La politique RLS "Profiles: mise a jour propre" autorise un utilisateur
-- authentifie a modifier SA ligne de profil :
--     FOR UPDATE USING (auth.uid() = id)
-- RLS filtre les LIGNES, jamais les COLONNES. La colonne `plan` etait donc
-- modifiable par le pilote lui-meme. Avec son propre jeton, visible dans le
-- navigateur, il pouvait faire :
--     PATCH /rest/v1/profiles?id=eq.<son id>   {"plan":"paddock"}
-- et passer de 100 credits par mois a 1500. checkQuota() lit ensuite
-- profiles.plan cote serveur et fait confiance a cette valeur.
--
-- Sans consequence tant que tout est gratuit. Bloquant des la premiere vente :
-- n'importe qui pourrait s'offrir le palier le plus haut.
--
-- CORRECTIF
-- Privileges au niveau COLONNE. On retire le UPDATE global au role
-- `authenticated` et on le redonne uniquement sur les colonnes que le
-- formulaire de profil renseigne reellement (cf. pushProfileToCloud dans
-- index.html). `plan` en est exclu : seul le service_role, qui n'est jamais
-- expose au navigateur, peut y toucher.
--
-- Effet de bord VOULU : une nouvelle colonne de profil ne sera pas modifiable
-- par le pilote tant qu'elle n'est pas ajoutee a la liste ci-dessous. Un
-- oubli se traduit par un champ qui ne s'enregistre pas, jamais par une faille.
--
-- A JOUER dans l'editeur SQL de Supabase. Idempotent, sans risque a rejouer.
-- Aucun deploiement Netlify necessaire.
-- =============================================

REVOKE UPDATE ON public.profiles FROM authenticated;

GRANT UPDATE (
  taille_cm,
  poids_kg,
  categorie_principale,
  chassis,
  chassis_modele,
  chassis_annee,
  moteur,
  style_pilotage,
  niveau,
  mode_pilotage,
  qui_pilote,
  updated_at
) ON public.profiles TO authenticated;

-- Le role anonyme n'a rien a faire en ecriture sur les profils.
REVOKE UPDATE ON public.profiles FROM anon;

-- =============================================
-- VERIFICATION
-- =============================================
-- Doit lister les colonnes autorisees, et surtout PAS `plan` :
--
--   SELECT column_name
--     FROM information_schema.column_privileges
--    WHERE table_name = 'profiles'
--      AND grantee = 'authenticated'
--      AND privilege_type = 'UPDATE'
--    ORDER BY column_name;
--
-- Test negatif, connecte en tant que pilote, doit echouer :
--   PATCH /rest/v1/profiles?id=eq.<son id>  {"plan":"paddock"}
-- =============================================
