# Handoff — Dashboard analytics du site Clem Kart Racing

> Note de passation écrite le 2026-06-18. **À lire en premier** pour reprendre le chantier.
> Contexte : le chantier a démarré depuis une session ancrée sur le mauvais dossier
> (un projet vidéo Remotion). On le reprend ici, à la racine du repo karting.

## ✅ État au 2026-06-18 — Phase 1 : CODE TERMINÉ
Tout le code de la Phase 1 est écrit (étapes 1→5). Reste UNIQUEMENT : config secrets + déploiement.
- ✅ 1. `site v2/supabase/site-events.sql` (table)
- ✅ 2. `site v2/netlify/functions/track-site.js` (collecte, fetch REST, 204 non bloquant)
- ✅ 3. `site v2/netlify/functions/dashboard-data.js` (agrégation + mot de passe)
- ✅ 4. `site v2/dashboard.html` (page, charte rouge/noir, Chart.js)
- ✅ 5. snippet de tracking posé sur `index.html` + 4 blogs (UTF-8 préservé ; option **A** retenue pour `tableur_signup` = clic sur le lien tableur. Au passage : 188 octets nuls parasites en fin d'`index.html` nettoyés).
- ⏭️ **PROCHAINE SESSION = config** : run du SQL dans Supabase, `.env` + `SUPABASE_SERVICE_ROLE_KEY`, choisir `DASHBOARD_PASSWORD`, env vars Netlify → puis test `netlify dev` → puis déploiement (crédits ~5 juillet 2026).

## Objectif
Construire un **dashboard analytics first-party** (maison, gratuit) pour le site vitrine.
Réutilise l'infra existante : **Supabase + Netlify Functions**, comme l'app `race-engineer-ai`.

## Pourquoi
- Le site (`site v2/`) est une vraie page de vente complète, mais fait **~0 vente depuis 1 mois**.
- **Aucun analytics** n'existe sur le site → impossible de savoir si le problème est le **trafic**
  (personne ne vient depuis les Reels) ou la **conversion** (les gens viennent et n'achètent pas).
- Le dashboard répondra à ça d'un coup d'œil : Visiteurs → Clics Gumroad → (Ventes en Phase 2).

## Règles de collaboration (IMPÉRATIF — cf. CLAUDE.md de l'app)
- **Pas de code sans plan validé.** Proposer le plan, attendre le OK, coder **étape par étape**
  (jamais tout d'un bloc). Crédits limités, chaque token compte.
- HTML/JS vanilla, simple. **Jamais de clé API en dur** (env vars). Tester avec `netlify dev`
  avant de pusher. Un commit = une feature.

## Architecture décidée
- **Sans dépendance npm** : les fonctions écrivent vers Supabase via l'**API REST (fetch)**,
  exactement comme `site v2/netlify/functions/send-email.js`. → Pas de `node_modules` à gérer.
- Table **dédiée** `site_events` (séparée de la table `events` de l'app, pour ne pas mélanger).
- **Anonyme, sans cookie, sans IP/PII** → pas de bandeau RGPD.

## Fichiers — Phase 1
1. ✅ **FAIT** — `site v2/supabase/site-events.sql` : la table (RLS activée, aucune policy, 2 index).
2. ⬜ **À FAIRE (étape suivante)** — `site v2/netlify/functions/track-site.js` : la collecte.
   Calqué sur `race-engineer-ai/netlify/functions/track.js` (rate-limit léger, no-op silencieux
   si non configuré, CORS restreint, **jamais bloquant → 204**) MAIS en **fetch REST** (pas de SDK).
   Dérive `source` depuis le referrer/UTM. Events : `pageview` | `gumroad_click` | `extract_click` | `tableur_signup`.
3. ⬜ **À FAIRE** — `site v2/netlify/functions/dashboard-data.js` : agrège les métriques
   (visiteurs, pages vues, clics Gumroad, CTR, courbe 30 j, sources, mobile/desktop).
   **Protégé par mot de passe** (env `DASHBOARD_PASSWORD`). Lecture via Supabase REST (service_role).
4. ⬜ **À FAIRE** — `site v2/dashboard.html` : la page (charte rouge/noir, Bebas Neue/Barlow, Chart.js).
   KPI + entonnoir + courbe visiteurs + sources + répartition appareils.
5. ⬜ **À FAIRE — STOP, valider avec Clément avant** : injecter le **snippet de tracking** dans
   `site v2/index.html` + les 4 blogs : `blog-freinage-degressif.html`, `blog-mental-karting.html`,
   `blog-trajectoire-grip.html`, `blog-volant-karting.html`.
   (sendBeacon, non bloquant, sans cookie, `session_id` anonyme en sessionStorage, auto-bind des clics Gumroad.)

## Ce que Clément doit faire lui-même (secrets / comptes)
- Exécuter `site v2/supabase/site-events.sql` dans **Supabase → SQL Editor → Run**.
- Créer un `.env` local (je le scaffolde) et y coller sa `SUPABASE_SERVICE_ROLE_KEY`.
- Choisir le `DASHBOARD_PASSWORD`.
- Poser les env vars sur **Netlify** (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `DASHBOARD_PASSWORD`).
- **Déployer** quand les crédits Netlify reviennent (~5 juillet 2026).

## Infra utile
- Supabase URL : `https://hkpknrrymgbnjmbewlyc.supabase.co` (l'ancienne `lqhtmwksxwjdspitului…` etait FAUSSE — DNS inexistant — cause du "fetch failed")
- Pattern de référence : `race-engineer-ai/netlify/functions/track.js` + `race-engineer-ai/supabase/schema.sql` (table `events`).
- Fonctions du site : `site v2/netlify/functions/` (`send-email.js` = sans dépendance, fetch + process.env).
- Pas de `netlify.toml` dans `site v2/` (config côté dashboard Netlify).
- Liens Gumroad du site : `https://clemkartracing.gumroad.com/l/umjfwx` (guide) et `/l/Extrait` (extrait gratuit).

## Phases suivantes (après P1)
- **P2 — boucler la boucle** : webhook « Ping » Gumroad → table `sales` → vraies ventes + CA dans le dashboard.
- **P3 — polish** : scroll/engagement, tracking par Reel (UTM dédiés), filtres de dates.

## Autres décisions de la session (contexte, PAS le chantier en cours)
- **Page Gumroad** → passer à un « closer » court (le site fait déjà toute la persuasion).
  Texte court déjà rédigé ; Clément doit le coller sur Gumroad.
- **Audit du site** : (1) pas d'analytics [= ce chantier], (2) témoignages faibles à renforcer
  (résultats, prénoms), (3) `cursor:none` desktop à tester en retrait.
- L'app `race-engineer-ai` : ~95 % codée, reste config clés + `schema.sql` + `netlify dev` + déploiement.
