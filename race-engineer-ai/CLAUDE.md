# Race Engineer AI : Contexte projet pour Claude Code

## ⚠️ RÈGLE ABSOLUE AVANT DE CODER
**Ne jamais coder immédiatement.** Avant toute implémentation :
1. Comprendre le besoin exact
2. Proposer un plan clair (architecture, fichiers, étapes)
3. Attendre validation
4. Coder étape par étape, pas tout d'un bloc

Les crédits sont limités (abonnement $20). Chaque token compte. Réfléchir avant d'agir.

---

## Vision du projet

Un outil d'assistant Race Engineer personnel pour pilotes de karting amateur/compétitif.
L'idée : reproduire ce qu'un vrai race engineer ferait entre les sessions : analyser les données, proposer des réglages, identifier les causes de sous-performance.

**Ce n'est pas un chatbot générique.** C'est un outil spécialisé, ancré dans la réalité du karting, qui parle le langage d'un pilote.

---

## Utilisateur cible

- Homme 25 à 40 ans
- Pilote karting compétitif amateur (championnat régional, national)
- Frustré par son irrégularité et son manque de données exploitables
- N'a pas de race engineer humain
- Veut comprendre pourquoi il est lent et quoi changer

---

## Fonctionnalités prévues

### MVP (à construire en premier)
- Interface de saisie post-session : conditions piste, ressenti pilote, chronos
- Analyse des symptômes de comportement kart (sous-virage, survirage, instabilité au freinage, etc.)
- Recommandations de réglages ciblées (châssis, pression pneus, carbu, position de conduite)
- Historique des sessions avec comparaison

### V2 (après validation MVP)
- Import de données GPS / chrono (format CSV)
- Analyse de trajectoire
- Comparaison entre sessions
- Intégration avec le tableur de réglages existant

### V3 (monétisation)
- Accès freemium / abonnement
- Version pro pour clubs et équipes

---

## Stack technique envisagée

- **Frontend** : HTML/CSS/JS vanilla (pas de framework pour l'instant : simplicité)
- **Backend** : Netlify Functions (Node.js) : déjà utilisé sur le site principal
- **IA** : API Anthropic (Claude) : modèle à définir selon coût/perf
- **Auth** : Supabase (prévu, pas encore implémenté)
- **BDD** : Supabase (sessions, historique, utilisateurs)
- **Hébergement** : Netlify

---

## État actuel

- Prototype HTML statique existant (interface de chat basique)
- Pas encore de backend connecté
- Pas d'authentification
- Pas de persistance des données
- Le fichier HTML de base est dans ce dossier

---

## Ce qui existe déjà sur le site principal

- `netlify/functions/send-email.js` : fonction Netlify opérationnelle (Brevo API)
- Variables d'environnement Netlify configurées :
  - `BREVO_API_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY` (à ajouter)
- Repo GitHub : `github.com/clemkart/clem-kart-racing`
- Site live : `https://comprendre-comment-rouler-plus-vite.netlify.app/`

---

## Concepts clés du karting à maîtriser

Ces concepts viennent du guide PDF vendu sur Gumroad (59 pages, 16,99€) :

- **Light hands (Ch.3)** : le volant est un capteur, pas une commande. Serrer = châssis figé.
- **Freinage dégressif (Ch.4)** : pic de pression → relâché progressif. Maintenir = kart refuse de pivoter. ~2-3 dixièmes perdus par virage si raté.
- **Rotation (Ch.5)** : c'est le délestage de la roue arrière intérieure via la pédale de frein qui fait tourner, pas le volant.
- **Point d'accélération (Ch.6)** : remettre les gaz avant fin de rotation = kart tout droit = ~3 dixièmes perdus par virage.
- **Trajectoire réelle (Ch.7)** : la trajectoire parfaite des schémas n'existe pas. Le grip dicte la trajectoire.
- **Grip (Ch.8)** : froid (patient), chaud (plus exigeant), sale (ligne décalée), humide (grip hors trajectoire habituelle).
- **Mental (Ch.10)** : vouloir prouver = forcer = erreurs. Calme ≠ lenteur.
- **Analyse post-session (Ch.11)** : 3 questions, transformer une mauvaise session en data.

---

## Réglages châssis karting (base de connaissance)

### Axes de réglage principaux
- **Voie avant/arrière** : élargir = plus de grip, réduire = moins de résistance
- **Carrossage** : négatif = meilleur grip en courbe
- **Pincement** : influence stabilité en ligne droite et entrée de courbe
- **Position siège** : avancer = plus d'appui avant, reculer = plus de motricité
- **Pression pneus** : ±0.1 bar change significativement le comportement
- **Hauteur de caisse** : influence aérodynamique et comportement global
- **Barres de torsion** : rigidité châssis, influence délestage
- **Longueur biellettes** : géométrie direction

### Symptômes → Causes probables
- Sous-virage entrée virage → pression avant trop haute, voie avant trop large, pincement incorrect
- Survirage sortie virage → pression arrière trop haute, voie arrière trop étroite, siège trop en avant
- Instabilité au freinage → pression arrière inégale, châssis tordu, conduite (freinage asymétrique)
- Kart "planté" → châssis trop rigide, conditions piste froide, pneus pas en température
- Perte de temps en sortie → point d'accélération trop tôt, rotation incomplète

---

## Monétisation prévue

1. **Gratuit** : 3 analyses par mois
2. **Pro (9,99€/mois)** : analyses illimitées, historique, export PDF
3. **Club (29,99€/mois)** : multi-pilotes, comparaison équipe

Lien avec l'écosystème existant :
- Le guide PDF (16,99€) reste le produit d'entrée
- Le tableur gratuit capte les emails
- Le Race Engineer AI = montée en gamme naturelle

---

## Instructions pour Claude Code

1. **Toujours proposer un plan avant de coder**
2. **Commencer par le MVP uniquement** : pas de feature creep
3. **Garder le code simple** : HTML/JS vanilla tant que possible
4. **Chaque fonction Netlify = un fichier séparé**
5. **Ne jamais hardcoder de clés API** : toujours via variables d'environnement
6. **Tester localement avec `netlify dev` avant de pusher**
7. **Un commit = une feature** : commits atomiques et descriptifs
