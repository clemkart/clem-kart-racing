-- =============================================
-- Mesurer la qualite reelle des conseils
-- =============================================
-- A coller dans Supabase > SQL Editor quand tu auras quelques semaines de
-- verdicts. C'est la seule mesure objective de fiabilite du produit : le
-- pourcentage de reglages recommandes qui ont reellement rendu le pilote
-- plus rapide.
--
-- Ces requetes ne renvoient rien tant qu'aucun pilote n'a donne de verdict.
-- =============================================


-- 1. LE CHIFFRE PRINCIPAL : nos conseils fonctionnent-ils ?
SELECT
  count(*)                                                   AS verdicts,
  round(100.0 * count(*) FILTER (WHERE meta->>'verdict' = 'mieux')  / count(*), 1) AS pct_mieux,
  round(100.0 * count(*) FILTER (WHERE meta->>'verdict' = 'pareil') / count(*), 1) AS pct_pareil,
  round(100.0 * count(*) FILTER (WHERE meta->>'verdict' = 'pire')   / count(*), 1) AS pct_pire
FROM public.events
WHERE event = 'test_verdict';


-- 2. PAR COMBO CHASSIS x MOTEUR : ou sommes-nous bons, ou sommes-nous mauvais ?
--    C'est ce qui dira quelles marques meritent d'etre enrichies en priorite.
SELECT
  meta->>'chassis' AS chassis,
  meta->>'moteur'  AS moteur,
  count(*)         AS verdicts,
  round(100.0 * count(*) FILTER (WHERE meta->>'verdict' = 'mieux') / count(*), 1) AS pct_mieux
FROM public.events
WHERE event = 'test_verdict' AND meta->>'chassis' IS NOT NULL
GROUP BY 1, 2
HAVING count(*) >= 3          -- sous 3 verdicts, le chiffre ne veut rien dire
ORDER BY pct_mieux ASC;       -- les pires en premier : ce sont eux qu'il faut corriger


-- 3. PAR SYMPTOME : quels problemes savons-nous vraiment resoudre ?
SELECT
  meta->>'comportement' AS symptome,
  count(*)              AS verdicts,
  round(100.0 * count(*) FILTER (WHERE meta->>'verdict' = 'mieux') / count(*), 1) AS pct_mieux
FROM public.events
WHERE event = 'test_verdict' AND meta->>'comportement' IS NOT NULL
GROUP BY 1
HAVING count(*) >= 3
ORDER BY pct_mieux ASC;


-- 4. LES ECHECS EN DETAIL : a lire une par une avec un pilote experimente.
--    Chaque ligne est un conseil qui a rendu quelqu'un plus lent.
SELECT
  created_at,
  meta->>'chassis'       AS chassis,
  meta->>'chassisModele' AS modele,
  meta->>'moteur'        AS moteur,
  meta->>'comportement'  AS symptome,
  meta->'leviers'        AS leviers_appliques,
  meta->>'circuit'       AS circuit
FROM public.events
WHERE event = 'test_verdict' AND meta->>'verdict' = 'pire'
ORDER BY created_at DESC
LIMIT 50;


-- 5. FIABILITE DU SIGNAL : un verdict donne 3 semaines plus tard vaut moins
--    qu'un verdict donne le lendemain. Pondere en consequence.
SELECT
  CASE
    WHEN (meta->>'delaiJours')::int <= 2  THEN 'a chaud (0-2 jours)'
    WHEN (meta->>'delaiJours')::int <= 14 THEN 'recent (3-14 jours)'
    ELSE 'tardif (15 jours et plus)'
  END AS fraicheur,
  count(*) AS verdicts,
  round(100.0 * count(*) FILTER (WHERE meta->>'verdict' = 'mieux') / count(*), 1) AS pct_mieux
FROM public.events
WHERE event = 'test_verdict' AND meta->>'delaiJours' IS NOT NULL
GROUP BY 1
ORDER BY 1;


-- 6. TAUX DE RETOUR : combien de conseils appliques recoivent un verdict ?
--    Si ce chiffre est bas, la mesure n'est pas representative.
SELECT
  (SELECT count(*) FROM public.events WHERE event = 'analyze')       AS analyses,
  (SELECT count(*) FROM public.events WHERE event = 'test_verdict')  AS verdicts_recus;
