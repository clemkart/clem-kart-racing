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
    ├── chat.js          ← IA Claude Opus 5 (auth + quota + mémoire conversation)
    ├── kart-specs.js    ← Registre châssis × moteur, source de vérité du matériel
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
| `FREE_MONTHLY_CREDITS` | Quota mensuel plan gratuit, en CRÉDITS (défaut : 30 crédits, soit 3 messages IA/mois car 1 message = 10 crédits) | Non |
| `ALLOW_ANON_CHAT` | `true` = chat sans compte (DEV LOCAL UNIQUEMENT, jamais en prod) | Non |
| `DEGRADED_MAX_MESSAGES` | Plafond de secours par utilisateur quand le quota n'est plus vérifiable (défaut : 5). Voir ci-dessous. | Non |

**⚠️ Si `SUPABASE_SERVICE_ROLE_KEY` est absente ou mal nommée**, le quota n'est
plus vérifiable. L'app continue de servir, mais avec un plafond de secours de
5 messages par utilisateur et par instance, et elle écrit `[QUOTA-DEGRADE]`
dans les logs de fonction Netlify. Cherchez ce marqueur : avant le 2026-08-06,
ce cas rendait l'app **gratuite et illimitée pour tout le monde**, sans aucune
erreur visible.

### Réglages de coût (tous facultatifs, modifiables sans redéploiement)

Ces variables pilotent la facture d'API. Elles ont toutes un défaut sain dans
`chat.js` : ne les toucher qu'après avoir mesuré.

| Variable | Rôle | Défaut |
|---|---|---|
| `CLAUDE_CACHE_TTL` | Durée de vie du cache de prompt, `1h` ou `5m`. Le compteur repart à zéro à chaque lecture, gratuitement : en `1h` une journée de roulage (9h-12h30 puis 14h-18h) ne paie que deux écritures. En `5m` le cache meurt entre deux messages et ne sert plus à rien. | `1h` |
| `CLAUDE_MODEL` | Modèle utilisé. ⚠️ Le chat et le diagnostic doivent garder le MÊME : le cache est lié au modèle, deux modèles = deux caches à payer. | `claude-opus-5` |
| `CLAUDE_EFFORT_DIAGNOSTIC` | Profondeur de réflexion du diagnostic. C'est lui qui porte la valeur du produit. | `medium` |
| `CLAUDE_EFFORT_CHAT` | Idem pour les questions de suivi, moins exigeantes. | `low` |
| `CLAUDE_MAX_TOKENS_DIAGNOSTIC` | Plafond de sortie. ⚠️ La réflexion compte DEDANS : un plafond trop serré coupe le JSON en plein milieu et l'appel est facturé quand même. | `8000` |
| `CLAUDE_MAX_TOKENS_CHAT` | Idem pour le chat. | `4000` |

Repère de coût mesuré le 2026-08-06 sur Opus 5 : un diagnostic pèse 60 400
tokens d'entrée, dont 55 000 cachables. Premier appel 0,61 dollar, appels
suivants 0,08. Vérifier le taux de cache réel en production via
`usage.cache_read_input_tokens` dans les logs de fonction Netlify.

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

## Harnais de test

```bash
npm run test:gratuit      # les 3 harnais GRATUITS d'un coup, à lancer à chaque modif
npm run test:coherence    #   valeurs dupliquées navigateur <-> serveur
npm run test:repli        #   exécute le repli hors ligne (code navigateur)
npm run test:quota        #   prouve que le quota indisponible n'est jamais illimité
npm run test:diagnostic   # PAYANT : 7 cas de diagnostic contre le vrai modèle
npm run test:chat         # PAYANT : mode chat, sans profil, garde-fous, marques
```

`test:gratuit` ne consomme **aucun crédit API**. Les trois harnais couvrent ce
qu'aucun test ne voyait avant : les valeurs qui vivent en double entre
`index.html` et les functions, le code du repli hors ligne (que les harnais
payants n'exécutent jamais, puisqu'il vit dans le navigateur), et le garde-fou
qui empêche l'app de devenir gratuite et illimitée quand Supabase est
injoignable.

**`test:coherence` ne consomme aucun crédit API.** Il vérifie les valeurs qui
vivent EN DOUBLE dans `index.html` et dans les functions : butées de réglage,
codes de symptôme, marques de châssis, moteurs, châssis sans barre de torsion,
et l'absence de valeur conseillée hors des butées de l'app. Sans lui, rien
n'empêchait le navigateur d'afficher une chose et l'IA d'en dire une autre sur
le même écran. Lancez-le systématiquement après avoir touché un réglage, un
symptôme ou une marque.

Les deux autres consomment des crédits API (environ 0,60 € au premier appel
puis 0,08 € chacun).

⚠️ **Le score de ces harnais varie d'un tir à l'autre sur du code identique.**
Certains cas passent environ une fois sur deux. Un échec isolé ne prouve donc
pas une régression, et un 7/7 ne prouve pas son absence. Pour juger un
changement : isoler le cas avec `node tests/run-diagnostics.js --cas N`, le
lancer 3 fois, puis `git stash` et 3 fois sur le code d'avant. Comparer les
taux, pas les verdicts.

Ces harnais vérifient des CONTRAINTES (pas de levier inexistant, pas de valeur
hors plage, garde-fous respectés, vocabulaire de la bonne marque). Ils ne
peuvent pas juger si le diagnostic est techniquement JUSTE : ça, seul un pilote
expérimenté peut le faire, en relisant les sorties avec `--verbeux`.

## Déployer

```bash
git add . && git commit -m "..." && git push
```

## Modèle freemium (câblé)

- Plan `free` : `FREE_MONTHLY_CREDITS` crédits / mois, soit 3 messages IA au défaut de 30 (la table `ai_usage` compte des MESSAGES, la conversion en crédits se fait dans `chat.js`, reset implicite au changement de mois)
- Plans `pro` / `club` / `founder` : illimité (colonne `profiles.plan`)
- Le diagnostic local et l'historique restent gratuits et illimités (aucun appel API)

## Provenance de la base de connaissance karting

Ces notes vivaient dans `skill/materiel-specifique.md`, donc dans le system prompt :
elles étaient facturées à chaque appel d'API sans rien apprendre au modèle.
Elles sont ici, hors du prompt.

**Sources web consultées (2026-05)** : forums.kartpulse.com · kartclass.com ·
tkart.it · motorsportmalta.com · ekartingnews.com · kartwiki.com · guides de
réglage CRG et OTK (PDF) · nashvillekartinggroup.com · grokipedia (KZ2) ·
vroomkart.com · kartsportnews.com

**Ce qui manque encore, à enrichir par Clément** (l'expérience terrain est la
source la plus fiable, et elle porte le marqueur `[CD]` dans `kart-specs.js`) :

1. Retours directs sur OTK, Sodikart, Rotax Max et DD2
2. Spécificités de réglage propres à chaque marque qu'il connaît
3. Comportements observés par condition réelle

Les fiches par marque et par moteur vivent dans `netlify/functions/kart-specs.js`,
qui est la **source de vérité unique** de l'adaptation matériel : c'est lui qui
construit la fiche du kart exact du pilote et l'injecte dans le prompt. Ne pas
recréer un second registre de ces faits dans les fichiers du skill.
