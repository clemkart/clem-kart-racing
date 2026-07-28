# Race Engineer AI

Assistant Race Engineer personnel pour pilotes de karting.

## Démarrage rapide

Lire `CLAUDE.md` en premier : il contient toute la vision, le contexte business et les règles de développement.

## Structure du dossier

```
race-engineer-ai/
├── CLAUDE.md            ← Contexte complet pour Claude Code (lire en premier)
├── README.md            ← Ce fichier
├── CGU.md               ← Conditions générales d'utilisation
├── index.html           ← App complète (profil, diagnostic, chat IA, historique, auth)
├── netlify.toml         ← Config Netlify (headers sécurité, CSP, bundling skill)
├── supabase/
│   └── schema.sql       ← À exécuter dans Supabase → SQL Editor (idempotent)
├── cgu.html             ← Page CGU lisible (rend CGU.md)
├── manifest.json        ← PWA installable (icône écran d'accueil)
├── og-image.png         ← Aperçu lors d'un partage WhatsApp/réseaux
├── icon-192/512.png     ← Icônes PWA
└── netlify/functions/
    ├── chat.js          ← IA Sonnet 4.6 (auth + quota + mémoire conversation)
    ├── session.js       ← Persistance sessions Supabase (RLS)
    ├── track.js         ← Analytics first-party (table events)
    └── skill/           ← Expertise karting embarquée (system prompt)
```

## Configuration (à faire une fois)

### 1. Clé front (index.html)
Dans `index.html`, en haut du fichier :
```js
window.SUPABASE_ANON_KEY = '...'; // Dashboard Supabase → Settings → API → anon/public key
```
Cette clé est publique (protégée par RLS), pas un secret.

### 2. Variables d'environnement Netlify (Site settings → Environment variables)

| Variable | Rôle | Obligatoire |
|---|---|---|
| `ANTHROPIC_API_KEY` | Appels Claude (chat.js) | Oui |
| `SUPABASE_ANON_KEY` | Vérification des tokens user + RLS (chat.js, session.js) | Oui |
| `SUPABASE_SERVICE_ROLE_KEY` | Lecture plan + incrément quota (chat.js uniquement) | Oui (sinon quota désactivé) |
| `SUPABASE_URL` | URL du projet Supabase | Non (fallback codé) |
| `FREE_MONTHLY_LIMIT` | Quota mensuel plan gratuit (défaut : 30 messages IA/mois) | Non |
| `ALLOW_ANON_CHAT` | `true` = chat sans compte (DEV LOCAL UNIQUEMENT, jamais en prod) | Non |

### 3. Base de données
Exécuter `supabase/schema.sql` dans Supabase → SQL Editor (safe à ré-exécuter).
Pour un compte illimité (toi) : `UPDATE profiles SET plan = 'founder' WHERE email = 'ton@email';`

### 4. Au premier déploiement
Dans `index.html`, remplacer `og:image` par l'URL absolue du domaine final
(ex: `https://ton-domaine/og-image.png`) : sinon WhatsApp n'affiche pas l'aperçu.

## Analytics (first-party, sans cookies)

Chaque évènement produit part dans la table Supabase `events` via la function `track.js` :
`page_view`, `demo_session`, `analyze`, `chat_sent`, `auth_wall`, `magic_link_sent`,
`login`, `quota_exhausted`, `pro_waitlist` (avec email → prospects plan Pro !),
`export_card`, `feedback` (👍/👎 avec question+réponse → améliorer le skill).

Requêtes utiles (SQL Editor) :
```sql
-- Funnel global par jour
SELECT date_trunc('day', created_at) AS jour, event, COUNT(*)
FROM events GROUP BY 1, 2 ORDER BY 1 DESC, 3 DESC;

-- Prospects plan Pro
SELECT created_at, meta->>'email' AS email FROM events WHERE event = 'pro_waitlist';

-- Mauvaises recommandations à corriger dans le skill
SELECT created_at, meta->>'q' AS question, meta->>'a' AS reponse
FROM events WHERE event = 'feedback' AND meta->>'vote' = 'down';
```

## Tester en local (sans crédits Netlify)

```bash
# .env à la racine du projet :
# ANTHROPIC_API_KEY=sk-ant-...
# ALLOW_ANON_CHAT=true        ← permet de tester le chat sans config Supabase
netlify dev
```

## Déployer

```bash
git add . && git commit -m "..." && git push
```

## Modèle freemium (câblé)

- Plan `free` : `FREE_MONTHLY_LIMIT` messages IA / mois (compteur dans la table `ai_usage`, reset implicite au changement de mois)
- Plans `pro` / `club` / `founder` : illimité (colonne `profiles.plan`)
- Le diagnostic local et l'historique restent gratuits et illimités (aucun appel API)
