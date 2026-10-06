# DIRECTION V5 : « La trajectoire »

Direction artistique de Clem Kart Racing. Version du 2 octobre 2026, écrite pour les intégrateurs : on la suit à la lettre.

**Ce que ce document remplace.** Il remplace `design/COMPOSITION.md` pour tout ce qui se voit : couleurs, polices, mise en page, photos, mouvement. COMPOSITION.md reste la référence des règles fonctionnelles qu'il fixe et que ce document ne contredit pas : un seul bouton rouge visible par écran, chiffres lus dans la config, barre collante cachée devant le bloc prix et le bouton final, états des formulaires à hauteur constante, pages merci sans vente. Une règle de COMPOSITION est levée à la demande de Clément (choix du 02/10) : « une seule animation d'entrée, aucun parallaxe ». Le mouvement devient une signature, tenu par le budget du chapitre 4.

**Périmètre : l'esthétique seulement.** Ne changent pas :
- les textes, mot pour mot (seules exceptions : les textes alternatifs des photos remplacées, donnés ici, et la page 404 qui n'existe pas encore, dont le texte est à valider par Clément) ;
- les prix, les liens, les formulaires et leur fonctionnement : noms de champs, `action`, validation, messages, scripts de page ;
- le suivi : tous les attributs `data-*` (`data-cta`, `data-zone`, `data-bio`, `data-bouton`, `data-position`, `data-parcours`, `data-formule`, `data-demande`, `data-rappel`, `data-kit`, `data-planche`, `data-type`, `data-hero`, `data-page`, `data-si-version`, `data-extrait-version`), et dans `site.js` les UTM, `track-site` et les portes `/aller/*` ;
- les pages légales (texte mot pour mot) et `config/offres.json` ;
- Race Engineer AI reste invisible.

**Dossier de travail.** Dans ce document, `scratchpad/` désigne `C:/Users/cleme/AppData/Local/Temp/claude/C--Users-cleme-Documents-GitHub-clem-kart-racing-site-v2--claude-worktrees-email-capture-guide-excerpt-930e6c/4bb4bb44-3c6e-48ab-8923-8034c5162d85/scratchpad/`. On y trouve l'outil d'export des photos (`photos-tri/export.py`), les photos déjà exportées (`da-v5/export-mesure/`), le banc de vérification (`verif-v4.mjs`) et les maquettes. C'est un dossier temporaire de Windows : copier ce qui sert avant qu'il soit vidé.

**Maquettes de contrôle** (non contractuelles, faites pendant l'écriture de ce document pour valider les choix) : dossier `scratchpad/da-v5/maquettes-out/`. Les plus utiles : `accueil-b-html-1440-ecran1.jpg`, `accueil-b-html-1920-ecran1.jpg`, `accueil-html-390-ecran1.jpg` (affiche de l'accueil), `liens-html-390-ecran1.jpg` et `l664/liens-html-390-ecran1.jpg` (grille de départ), `guide-html-1440-ecran1.jpg` (tracé sur photo), `circuit-html-820-ecran1.jpg` (carte des 13 virages). Le code des maquettes est dans `../maquettes/`. Les captures du site actuel sont dans `../actuel/` et `../actuel-site2/`.

---

## 0. Lecture du brief

**Lecture.** Site de vente et vitrine d'un pilote de karting (champion régional 2023, 8 ans de compétition) pour deux publics. D'un côté, des pilotes amateurs, souvent sur téléphone, qui arrivent d'une bio Instagram ou TikTok et achètent un guide PDF (16,99 €), une analyse de vidéo (29,99 €) ou une journée sur piste (150 €). De l'autre, des entreprises locales qui évaluent un parrainage. Langage visuel : cinéma sombre et télémétrie de course. Réalisation : HTML et CSS natifs, GSAP (ScrollTrigger, SplitText), Lenis, View Transitions.

**Réglages.** Variance 8, mouvement 7, densité 3. Sur /marques (public entreprise) : mouvement 5, densité 4.

**Ce qu'on corrige, constaté sur les captures du 02/10 à 390 et 1440 px.**
- Un gabarit sombre générique : Bebas Neue partout, filets gris, vignettes 3:2 minuscules, grands vides sans intention.
- Une page /liens en mode Linktree, ouverte sur un gros plan du visage.
- Aucun mouvement qui raconte quelque chose, aucune signature qu'on reconnaîtrait sur une capture.
- Un bug visible : sur l'accueil à 1440 px, la plaque « Eux savent lesquelles. » passe sous la photo et le texte est coupé (« EUX SAVENT LESQ »).

---

## 1. Le concept

1. **Chaque page est un tour de piste.** Une seule ligne rouge, la trajectoire, se dessine pendant qu'on fait défiler. Elle part d'une ligne de départ à damier au bas du premier écran, passe de virage en virage entre les sections, marque une corde à hauteur de chaque titre et franchit l'arrivée dans le pied de page.
2. **Autour d'elle, la télémétrie.** Tous les chiffres sont en police à chasse fixe. Une barre de trois secteurs, sous la navigation, se remplit avec la lecture. Des relevés discrets en bas d'écran (secteur, section, chrono du tour) et des compteurs qui défilent une seule fois.
3. **Le cinéma.** Les vraies photos de Clément en kart, en couleur, plein cadre, sous des voiles noirs qui fondent l'image dans la page. Grain léger, relief au défilement, coupes franches entre les plans.
4. **Une typographie de machine.** Hubot Sans très étroit et très gras pour les titres (la machine), Mona Sans pour la voix de Clément (le pilote), Martian Mono pour toutes les données (le chrono). Noir profond, craie, et un seul rouge : celui de la couverture du guide.
5. **La marque vient du produit.** Les pastilles rouges numérotées et le circuit de 13 virages de la couverture du guide (« 13 chapitres, 13 virages, un circuit ») deviennent le langage du site.

**Reconnaissable en une capture** : un noir profond, une photo de kart plein cadre fondue dans le noir, un titre condensé géant en capitales, un fil rouge de 2 px qui traverse l'écran avec une pastille rouge cerclée de craie, et des relevés en chasse fixe dans les coins.

**Ce qu'on ne fait jamais** : visage de Clément en gros plan, carrousel (défilement automatique, flèches, points), trois cartes identiques côte à côte, halo ou lueur, dégradé de couleur, curseur personnalisé, écran de chargement, vidéo d'arrière-plan, 3D, donnée inventée, diagonales et coupes en biais, deuxième couleur vive.

---

## 2. Le système

### 2.1 Couleurs

Les noms de variables existants de `site v2/assets/tokens.css` sont gardés (leurs valeurs changent) pour que les feuilles de page restent lisibles pendant la refonte. Les nouvelles variables s'ajoutent.

| Variable | Valeur | Rôle | Contraste |
|---|---|---|---|
| `--fond-0` | `#060607` | fond de page, « noir piste » | référence |
| `--fond-1` | `#0E0E10` | bandes (prix, gratuit, saison) | |
| `--fond-2` | `#161619` | panneaux, champs de formulaire | |
| `--fond-3` | `#1C1C1F` | survols de surface, fond de la couverture du guide | |
| `--texte` | `#F2F0EB` | texte « craie » | 17,8:1 sur fond-0, 15,9:1 sur fond-2 |
| `--texte-rgb` | `242, 240, 235` | pour les transparences | |
| `--texte-2` | `rgba(var(--texte-rgb), .68)` | texte secondaire | 8,2:1 sur fond-0, 7,8:1 sur fond-2 |
| `--texte-3` | `rgba(var(--texte-rgb), .56)` | mentions, légendes (minimum pour du petit texte) | 5,8:1 sur fond-0, 5,0:1 sur fond-2 |
| `--filet` | `rgba(var(--texte-rgb), .12)` | filets décoratifs | décoratif |
| `--filet-fort` | `rgba(var(--texte-rgb), .24)` | filets de structure, contours de boutons fantômes | décoratif |
| `--filet-champ` | `rgba(var(--texte-rgb), .40)` | bord des champs, cases, cases de la grille de départ | 3,4:1 (exigé 3:1 pour un composant) |
| `--gris-piste` | `#46464A` | piste du circuit, secteurs à venir, cordes éteintes | 2,2:1, décoratif seulement |
| `--rouge` | `#C40C2C` | le rouge de la couverture du guide | 3,31:1 sur fond-0 |
| `--rouge-bouton` | `#C40C2C` | fond du bouton principal | craie dessus : 5,4:1 |
| `--rouge-survol` | `#A80A26` | balayage de survol et appui | craie dessus : 6,7:1 |
| `--rouge-rgb` | `196, 12, 44` | transparences | |
| `--ok` | `var(--texte)` | l'ancien vert disparaît | |

Règles :
- **Un seul rouge.** Il sert à : fond du bouton principal, trajectoire, cordes, pastilles numérotées, secteurs remplis, bord gauche des états d'erreur, titres de 24 px et plus (seul cas : « plus vite » dans le titre du guide), sélection de texte. Rien d'autre.
- **Jamais de texte rouge sous 24 px** (3,31:1 ne passe pas pour du petit texte). Une erreur s'écrit en craie, signalée par une marque rouge.
- **Plus de vert.** Un état réussi s'écrit en craie avec une coche (icône 2.6). Les coches du diagnostic du site 2 passent en craie.
- **Texte sur photo.** Sous tout texte courant posé sur une photo, le voile noir atteint au moins 0,65 d'opacité ; sous un titre de 48 px et plus, au moins 0,5. Calcul de contrôle : craie sur un ciel blanc voilé à 0,65 donne 6,1:1 ; voilé à 0,5, 3,5:1.
- **La couleur des photos ne se règle jamais en CSS** (aucun `filter`). On ne joue que sur les voiles.
- **Un seul thème, sombre** : `color-scheme: dark` sur `:root`. C'est le choix de Clément, il n'y a pas de version claire.
- Sélection : `::selection { background: var(--rouge); color: var(--texte); }`.
- Barre de défilement : `html { scrollbar-color: var(--gris-piste) var(--fond-0); scrollbar-width: thin; }`.

### 2.2 Typographie

**Trois familles Google Fonts, pas une de plus.**

| Famille | Rôle | Pourquoi elle | Fichier latin mesuré |
|---|---|---|---|
| **Hubot Sans**, largeur 75, graisse 800 | titres, boutons, nom de marque | Grotesque mécanique de GitHub : contrepoints carrés, dessin d'ingénieur, très étroite et très grasse. Elle fait « machine » sans tomber dans le cliché Eurostile des sites de course. | 20 Ko (une seule instance) |
| **Mona Sans**, graisses 400 à 600 | texte courant, chapôs, formulaires, navigation | Sa famille sœur, dessinée pour aller avec Hubot. Humaine, très lisible, chiffres à zéro normal. C'est la voix de Clément. | 40 Ko (variable 400 à 600) |
| **Martian Mono**, largeur 87,5, graisses 400 à 600 | toutes les données : prix, chronos, délais, pages, numéros, relevés, libellés | Chasse fixe au dessin d'instrument, zéro sans barre, étroite : les relevés tiennent sur un téléphone. | 24 Ko (variable 400 à 600) |

Total : environ 84 Ko pour le jeu latin, contre plus de 100 Ko pour les cinq fichiers actuels.

Feuille à charger dans `site v2/_partials/head.html` (remplace la feuille actuelle, en gardant les deux `preconnect`) :

```html
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Hubot+Sans:wdth,wght@75,800&family=Martian+Mono:wdth,wght@87.5,400..600&family=Mona+Sans:wght@400..600&display=swap">
```

Variables :

```css
--police-titre: 'Hubot Sans', 'Hubot Sans Repli', 'Arial Narrow', sans-serif;
--police-texte: 'Mona Sans', 'Mona Sans Repli', system-ui, sans-serif;
--police-mono: 'Martian Mono', 'Martian Mono Repli', ui-monospace, Consolas, monospace;
--graisse-normal: 400;
--graisse-moyenne: 500;
--graisse-forte: 600;
--graisse-titre: 800;
--largeur-titre: 75%;
--largeur-mono: 87.5%;
```

`--police-libelle` disparaît : les boutons prennent `--police-titre`, les petits libellés `--police-mono`. Couverture vérifiée le 02/10 par un rendu de contrôle : tous les glyphes français (é è à ç œ « » ’ €) existent dans les trois fichiers.

**Polices de secours calées (CLS nul).** Déclarer dans `tokens.css` trois `@font-face` locales (`Hubot Sans Repli` sur `local('Arial Narrow Bold'), local('Arial Narrow'), local('Arial Bold')` ; `Mona Sans Repli` sur `local('Arial')` ; `Martian Mono Repli` sur `local('Consolas'), local('Courier New')`) avec `size-adjust`, `ascent-override` et `descent-override`. Méthode de réglage : afficher le titre de l'accueil et un paragraphe de 3 lignes avec la vraie police puis avec la police de secours seule, et ajuster `size-adjust` jusqu'à ce que les coupures de ligne soient identiques et la hauteur du bloc égale à 2 % près. Valeurs de départ : Hubot Repli `size-adjust: 96%`, Mona Repli `size-adjust: 100%; ascent-override: 92%; descent-override: 24%`, Martian Repli `size-adjust: 92%`.

**Échelle fluide (360 à 1440 px).**

| Variable | Valeur | Taille | Usage |
|---|---|---|---|
| `--t-micro` | `clamp(0.6875rem, 0.6667rem + 0.0926vw, 0.75rem)` | 11 à 12 | relevés du HUD, positions P1 à P5, étiquettes |
| `--t-donnee` | `clamp(0.8125rem, 0.7917rem + 0.0926vw, 0.875rem)` | 13 à 14 | lignes de données mono, sommaire, mentions mono |
| `--t-petit` | `clamp(0.875rem, 0.8542rem + 0.0926vw, 0.9375rem)` | 14 à 15 | sous-lignes, navigation, aides de formulaire |
| `--t-texte` | `clamp(1.0625rem, 1.0417rem + 0.0926vw, 1.125rem)` | 17 à 18 | texte courant |
| `--t-chapo` | `clamp(1.1875rem, 1.0833rem + 0.463vw, 1.5rem)` | 19 à 24 | chapôs, citations, questions de FAQ |
| `--t-titre-4` | `clamp(1.375rem, 1.2083rem + 0.7407vw, 1.875rem)` | 22 à 30 | h3 |
| `--t-titre-3` | `clamp(1.75rem, 1.4167rem + 1.4815vw, 2.75rem)` | 28 à 44 | h3 forts, portes, entrées du menu |
| `--t-titre-2` | `clamp(2.25rem, 1.5rem + 3.3333vw, 4.5rem)` | 36 à 72 | h2 de section |
| `--t-titre-1` | `clamp(2.75rem, 1.3333rem + 6.2963vw, 7rem)` | 44 à 112 | h1 de page |
| `--t-affiche` | `clamp(3.25rem, 1.5rem + 7.7778vw, 8.5rem)` | 52 à 136 | la chute du titre de l'accueil, le nom sur /liens |
| `--t-chiffre` | `clamp(3.5rem, 2.1667rem + 5.9259vw, 7.5rem)` | 56 à 120 | prix et chiffres géants, en mono |

Réglages :
- **Hubot Sans** : toujours en capitales (`text-transform: uppercase`), `font-stretch: 75%`, graisse 800. Interligne 0,86 pour les tailles d'affiche, 0,9 pour h1 et h2, 1 pour h3 et boutons. Approche 0 à partir de 48 px, `0.02em` de 22 à 47 px, `0.04em` sur les boutons. `text-wrap: balance`.
- **Mona Sans** : jamais en capitales. Texte courant 400, interligne 1,65, mesure 62 à 68 caractères. Chapô 400, interligne 1,4, mesure 42 caractères. Navigation et libellés de champ en 500. Accent dans un texte (`strong`) en 600, couleur craie. `text-wrap: pretty` sur paragraphes et listes.
- **Martian Mono** : `font-stretch: 87.5%`, `font-variant-numeric: tabular-nums`, approche 0 (0,04em sur les étiquettes de moins de 12 px). En capitales seulement pour les codes de deux ou trois signes (S1, P1, PDF). Les libellés (`.libelle`, `.mono`) restent dans la casse du texte HTML.
- **Les chiffres sont des données.** Tout chiffre affiché en grand, toute ligne de données, tout tableau, tout prix (y compris le prix d'un bouton) et tout relevé sont en Martian Mono. Un chiffre au milieu d'une phrase reste en Mona Sans, chiffres normaux (une mono au milieu d'une phrase se lit comme une police de secours ; et en Mona, la variante `tabular-nums` barre le zéro : « 2Ø23 »). `tabular-nums` seulement en Martian Mono (`.mono`, relevés, prix, compteurs). **Aucun nombre contenant un zéro en Hubot Sans** : son zéro est barré (« 2θ27 »). Seul titre concerné aujourd'hui : le h2 de /marques « Votre logo sur ma saison {{sponsoring.saison}}. » ; envelopper la balise dans `<span class="chiffre-titre">` (Martian Mono 400, `font-size: .82em`). Un chiffre sans zéro pris dans la phrase d'un titre ou d'un libellé de bouton (« 72 », « 3 ») reste dans la police du titre.
- Les capitales espacées en petit corps (anciens `.libelle` en Barlow Condensed) disparaissent.

**Mise à jour de `tests/run-fonts.js`** (obligatoire, le test bloque la mise en ligne) :
- Liste autorisée : `'hubot sans': graisses [800], largeurs [75]` ; `'mona sans': graisses [400, 500, 600], largeur 100 (ou axe absent)` ; `'martian mono': graisses [400, 500, 600], largeurs [87.5]`.
- `GRAISSES_AUTORISEES` : `400, 500, 600, 800, normal, inherit, initial, unset` (retirer `700` et `bold` : aucun fichier gras 700 n'est chargé).
- Nouveau contrôle `font-stretch` dans le CSS : `75%, 87.5%, 100%, normal, inherit, initial, unset` ou `var(...)`.
- Lecture de l'URL Google Fonts : accepter les n-uplets `wdth,wght@75,800` et les plages `400..600`. Une plage se développe par pas de 100 (400, 500, 600) et chaque graisse doit être autorisée ; une largeur doit figurer dans la liste de la famille.
- Familles tolérées en fin de pile : ajouter `hubot sans repli`, `mona sans repli`, `martian mono repli`, `arial narrow bold`, `courier new`.
- Libellé du test : `Hubot Sans 800 (largeur 75), Mona Sans 400 a 600, Martian Mono 400 a 600 (largeur 87,5)`.
- `site v2/dashboard.html` (privé) : remplacer sa feuille Google Fonts par la nouvelle, ses variables `--fd` par Hubot Sans, `--fc` et `--fb` par Mona Sans, et chaque `font-weight: 700` par `600`. Rien d'autre ne change sur ce tableau de bord.

### 2.3 Grille, espacements, plans

- **Cadre** : `--conteneur: 1400px` ; marge latérale `--gouttiere-large: clamp(1rem, -0.1667rem + 5.1852vw, 4.5rem)` (16 à 72 px) ; `--gouttiere: 16px` reste pour les petits blocs à marge fixe. Le nom de classe `.conteneur` reste.
- **Grille** : 12 colonnes, écart `--grille-ecart: clamp(1rem, 0.6667rem + 1.4815vw, 2rem)` (16 à 32 px). Une seule colonne sous 900 px.
- **Couloirs de la trajectoire** : la ligne court dans la marge, à mi-chemin entre le bord de l'écran et le bord du contenu : `x = bord gauche du contenu / 2` (9 px sur un téléphone de 390 px, 46 px à 1440, 166 px à 1920, puisque `.conteneur` garde `box-sizing: border-box` et inclut sa marge intérieure dans ses 1400 px). Rien ne se pose dans les couloirs.
- **Rythme vertical** : `--rythme-section: clamp(5rem, 3.6667rem + 5.9259vw, 9rem)` (80 à 144 px) en haut et en bas de chaque section. Titre de section vers contenu : 48 px. Paragraphes : 16 px. Base 4 px pour tout le reste (4, 8, 12, 16, 24, 32, 48, 64, 96).
- **Points de rupture** : 360 et 390 (téléphones), 600, 900 (passage en grille), 1100 (navigation en ligne), 1440, 1920.
- **Hauteur de navigation** : `--nav-h: 56px` sous 1100 px, `64px` au-dessus.
- **Ancres** : `[id] { scroll-margin-top: calc(var(--nav-h) + 24px); }`.
- **Plans (z-index)** : trajectoire 1 ; contenu des sections 2 (`.conteneur` en `position: relative; z-index: 2`) ; photos plein cadre 0 ; HUD 70 ; barre d'achat 80 ; navigation 100 ; menu plein écran 110 ; lien d'évitement 120. Aucune autre valeur.
- **Formes** : rayon 0 partout. Seuls les repères sont ronds : cordes, pastilles numérotées, feux de départ, tête de trajectoire, bouton radio. C'est la règle des formes du site, elle est écrite et elle ne souffre pas d'exception.
- **Hauteurs** : bouton 56 px, bouton petit 44 px, champ 56 px, toute zone touchable 44 px au moins.

### 2.4 Textures

- **Grain**, sur les photos seulement (jamais sur le noir ni sur le texte) : un pseudo-élément `::after` du cadre photo (`.cine`), `pointer-events: none`, opacité `.06`, image fixe (aucune animation) :

  ```css
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 .6 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23g)'/%3E%3C/svg%3E");
  ```
- **Grille de télémétrie**, derrière les bandes de données seulement (blocs prix, chiffres d'audience, objectif de saison, carte du circuit) : `.grille-telemetrie::before` couvrant le cadre, douze lignes verticales de 1 px à `rgba(var(--texte-rgb), .045)` alignées sur les colonnes. Jamais sur toute la page.
- **Damier** (départ et arrivée uniquement) : `.damier { height: 12px; background: conic-gradient(var(--texte) 90deg, var(--fond-0) 90deg 180deg, var(--texte) 180deg 270deg, var(--fond-0) 270deg) 0 0 / 12px 12px; }` (cases de 6 px).
- **Voiles** (dégradés noirs posés sur les photos, la seule « couleur » qu'on ajoute aux images) :
  - `--voile-haut: linear-gradient(to bottom, rgba(6,6,7,.94) 0%, rgba(6,6,7,.78) 24%, rgba(6,6,7,.25) 40%, rgba(6,6,7,0) 50%)` ;
  - `--voile-bas: linear-gradient(to top, rgba(6,6,7,.97) 0%, rgba(6,6,7,.8) 20%, rgba(6,6,7,0) 38%)` ;
  - `--voile-fondu: linear-gradient(to top, rgba(6,6,7,1) 0%, rgba(6,6,7,.75) 22%, rgba(6,6,7,0) 55%)` (bas des bandes photo sur téléphone : la photo fond dans la page) ;
  - `--voile-gauche: linear-gradient(to right, rgba(6,6,7,.96) 0%, rgba(6,6,7,.9) 34%, rgba(6,6,7,.35) 58%, rgba(6,6,7,0) 75%)`.

### 2.5 Photos

**Traitement.** Toutes les photos viennent de `site v2/photos/` et sont passées par le même étalonnage (`scratchpad/photos-tri/export.py` : noirs denses, saturation baissée de 16 % sauf les rouges, aucune métadonnée). Une photo se pose de trois façons :
- **plein cadre** (fond perdu, sous voile, grain) : premiers écrans ;
- **cadre** (`.cine`, `overflow: hidden`, `aspect-ratio` fixe, fond `--fond-2` pendant le chargement, contour intérieur `outline: 1px solid rgba(var(--texte-rgb), .08); outline-offset: -1px`, grain) : sections ;
- **objet** (la couverture et les pages du PDF) : posé sur le noir, ombre `0 40px 80px rgba(0,0,0,.55)`, contour `1px rgba(var(--texte-rgb), .14)`, jamais de grain.

Chaque image garde `width`, `height`, `alt`, `decoding="async"`, `loading="lazy"` sauf l'image du premier écran (`fetchpriority="high"` et préchargement). Art direction par `<picture>` avec `media` quand le cadrage change entre téléphone et ordinateur.

**Aucun visage en gros plan, nulle part.** Ne sont plus utilisés et sortent du dossier publié (ils restent dans l'historique git) :
- `site v2/photos/clement-portrait-*`, `clement-avatar-*`, `clement-sourire-*`, `clement-trophee-*`, `clement-podium-*` ;
- `site v2/consulting/clement-640.*`, `clement-800.*` ;
- `site v2/clement-trophee-nb.jpg`, `site v2/assets/clement.jpg` ;
- `site v2/clement-casque-nb.jpg` (casque en gros plan, yeux visibles derrière la visière) : il n'est plus cité que par la règle morte `.photo-casque` de `page-demande.css`, qui disparaît avec la réécriture de cette feuille ;
- `site-catalogue/clement.jpg` ;
- `site-catalogue/partage.jpg` (image de partage du site 2 : un gros plan avec d'autres personnes) est refaite, voir ci-dessous.

Après remplacement, une recherche de ces noms dans `site v2/`, `site-catalogue/` et `scripts/` ne doit plus rien trouver (hors `PHOTOS.md`, à mettre à jour).

**Photos à exporter depuis E:** (lecture seule sur E:). Ajouter ces lignes à la liste `PHOTOS` d'une copie de `scratchpad/photos-tri/export.py` (même fonctions `recadre`, `retouche`, `propre`, `enregistre`, mêmes qualités : JPEG progressif 80, WebP 78), et n'exporter que ces entrées : les photos existantes ne sont pas réécrites. Format d'une ligne : nom, source, rapport largeur sur hauteur, boîte de recadrage (x0, y0, x1, y1 en fractions), largeurs.

```python
("piste-25-file", "E:/KARTING 2024/Photo Kart/ligue/Le mans/854_5067.jpg", 16 / 9, (0.0, 0.156, 1.0, 1.0), (960, 1600, 2400)),
("piste-25-file-portrait", "E:/KARTING 2024/Photo Kart/ligue/Le mans/854_5067.jpg", 4 / 5, (0.243, 0.0, 0.777, 1.0), (640, 1280)),
("piste-25-contre-jour", "E:/2025/KARTING/Photo Kart/IMG_6767.jpeg", 4 / 5, (0.0, 0.17, 1.0, 1.0), (640, 1280, 1600)),
("piste-95-dos-virage", "E:/KARTING 2024/Photo Kart/mina/MINA LAVAL 2022/DSC_1133.jpg", 16 / 9, (0.0, 0.10, 1.0, 1.0), (960, 1600, 2400)),
("piste-95-dos-virage-portrait", "E:/KARTING 2024/Photo Kart/mina/MINA LAVAL 2022/DSC_1133.jpg", 4 / 5, (0.25, 0.0, 0.92, 1.0), (640, 1280)),
("piste-95-epingle", "E:/2025/KARTING/Photo Kart/lcp_mina_ancenis_20240907_0161_HD.jpeg", 4 / 5, (0.05, 0.0, 0.70, 1.0), (640, 1280)),
("pilote-contre-jour", "E:/KARTING 2024/Photo Kart/ligue/ancenis/wetransfer__isa6387-jpg_2023-04-10_1856/_ISA6387.jpg", 4 / 5, (0.0, 0.08, 1.0, 1.0), (640, 1280)),
("cockpit-volant", "E:/2025/KARTING/Photo Kart/IMG_3187.jpeg", 4 / 5, (0.30, 0.0, 0.90, 1.0), (640, 1280)),
("cockpit-dessus", "E:/2025/KARTING/Photo Kart/IMG_2773.jpeg", 4 / 5, (0.10, 0.0, 0.80, 1.0), (640, 1280)),
("piste-795-public-portrait", "E:/KARTING 2024/Photo Kart/nsk/NSK ESSAY/IMG_4349.jpeg", 4 / 5, (0.22, 0.0, 0.82, 1.0), (640, 1280)),
("piste-95-arriere", "E:/2025/KARTING/Photo Kart/IMG_4439.jpeg", 3 / 2, (0.0, 0.0, 1.0, 1.0), (640, 1280)),
```

Plus l'image de partage du site 2 : `site-catalogue/partage.jpg`, 1200 x 630, JPEG progressif 82, depuis `854_5067.jpg` avec la boîte `(0.0, 0.156, 1.0, 1.0)` recadrée en 1200/630 (même code que `og-image.jpg` dans `export.py`).

Ces onze entrées ont été exportées pour mesure avec ce même code le 02/10 : les fichiers sont prêts dans `scratchpad/da-v5/export-mesure/` (sans métadonnées) et peuvent être copiés tels quels dans `site v2/photos/` après un contrôle visuel. Poids mesuré : 5,0 Mo ajoutés au dépôt (WebP et JPEG), dont 2,3 Mo compensés par les photos de visage retirées. Poids de l'image du premier écran en WebP : accueil 21 Ko (640, téléphone) et 75 Ko (2400) ; /liens 32 Ko (640) à 120 Ko (1600) ; /guide 34 Ko (640) et 127 Ko (2400). Toujours sous 130 Ko. Reporter dans `width` et `height` les dimensions réelles des fichiers produits (par exemple `piste-795-public-portrait-1280` fait 1280 x 1599).

Textes alternatifs des nouvelles photos (à reporter dans `PHOTOS.md`) :
- `piste-25-file` et `-portrait` : « Clément Daniel lancé à pleine vitesse dans son kart rouge numéro 25, l’arrière-plan filé par la vitesse, au circuit du Mans »
- `piste-25-contre-jour` : « Clément Daniel au volant de son kart rouge numéro 25, face à l’objectif, dans la lumière dorée d’une fin de journée »
- `piste-95-dos-virage` et `-portrait` : « Clément Daniel, vu de dos dans son kart numéro 95, au milieu d’un virage à gauche bordé d’un vibreur »
- `piste-95-epingle` : « Clément Daniel, vu de dos dans son kart numéro 95, collé au vibreur à l’entrée d’une épingle »
- `pilote-contre-jour` : « Clément Daniel de profil, casque sur la tête, en contre-jour dans la lumière du soir »
- `cockpit-volant` : « Clément Daniel installé dans son kart, casque et visière iridescente, les mains sur le volant »
- `cockpit-dessus` : « Vue plongeante sur Clément Daniel dans son kart, les mains sur le volant, comme une caméra embarquée »
- `piste-795-public-portrait` : le texte actuel de `piste-795-public`
- `piste-95-arriere` : « Le kart numéro 95 de Clément Daniel vu de l’arrière, son nom et les logos de partenaires sur la combinaison et le ponton »

À confirmer par Clément (liste en annexe 7.3) : le kart numéro 25 est bien le sien (même autocollant de châssis « 1817 » que le kart 95), et les crédits photo.

**Qui va où** (détail par page au chapitre 5) :

| Photo | Où |
|---|---|
| `piste-25-file` et `-portrait` | premier écran de l'accueil ; écran d'accueil du diagnostic (site 2) |
| `piste-25-contre-jour` | /liens |
| `piste-95-dos-virage` et `-portrait` | premier écran de /guide, avec le tracé ; page 404 |
| `piste-95-virage` (existante) | bloc final de /guide |
| `clement-drapeau` (existante, de dos) | « Qui je suis » de l'accueil |
| `pilote-contre-jour` | « Qui l'a écrit » (/guide), « Clément Daniel, pilote et créateur » (/marques), « Qui regarde ta vidéo » (site 2) |
| `cockpit-volant` | offre « L'analyse de ton onboard » de l'accueil |
| `piste-795-public` (existante) et `-portrait` | premier écran de /consulting ; offre consulting de l'accueil (portrait) |
| `paddock-echange-pilote` (existante) | « Ce que ça change » (/consulting) |
| `piste-95-epingle` | « Pourquoi moi » (/consulting) |
| `piste-695-ciel` (existante) | premier écran de /marques |
| `cockpit-dessus` | « Des vidéos qui sont vues » (/marques) |
| `marques-combinaison-kart` (existante) | « Inclus dans toutes les formules » (/marques), avec trois cordes |
| `piste-95-arriere` | « Comment ça se passe » de la saison (/marques), à la place de `marques-cockpit-logos` |
| `paddock-gants` (existante) | « Ce que mes vidéos font » (/marques) |
| `guide/couverture-640` et `-1280` (existantes) | premier écran de /guide (objet), offre guide de l'accueil |
| `guide/page-0x` (existantes) | feuilletage, extrait |

`marques-cockpit-logos` et `paddock-pre-grille` ne sont plus utilisées (la première laisse voir les yeux, la seconde un adulte non validé) : elles peuvent rester dans le dossier.

### 2.6 Iconographie

Toutes les icônes sont des SVG en ligne, `aria-hidden="true" focusable="false"`, trait de 2 px, extrémités carrées (rondes pour la trajectoire), couleur `currentColor`. Pas de bibliothèque d'icônes : le site n'en a besoin que de six.

- **Symbole de la marque** (« la corde ») : un arc de virage en craie et un point rouge à la corde. Il précède « Clem Kart Racing » dans la navigation, le pied de page et /liens.
  ```html
  <svg viewBox="0 0 22 22" width="22" height="22" aria-hidden="true" focusable="false"><path d="M2 20C2 9 9 2 20 2" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="7.6" cy="7.6" r="2.6" fill="#C40C2C"/></svg>
  ```
- **Favicon** des deux sites (SVG en `data:` dans le partial head et dans la page du site 2, à la place du « // » actuel) : carré `#060607`, arc `M5 27C5 13 13 5 27 5` en craie trait 3, point rouge `cx 11 cy 11 r 3.5`.
- **Coche** (états réussis, « Prends-le si », « Oui, si ») : `M4 12.5l5 5L20 6.5`, craie.
- **Croix** (« Passe ton chemin si », « Non, si ») : `M6 6l12 12M18 6L6 18`, rouge (graphique, 3,3:1).
- **Menu** : deux barres dessinées en CSS (`::before`, `::after` du bouton), qui pivotent en croix à l'ouverture.
- **Flèches** : celles qui existent en texte (`&rarr;` dans /liens et les portes) restent du texte, en Martian Mono. On n'en ajoute aucune.
- **Réseaux** : les trois SVG actuels de /liens, en 24 px dans une zone de 44 px.

---

## 3. Composants signature

### 3.1 La ligne de trajectoire

**Où.** Accueil, /guide, /extrait (et /tableur-reglages), /consulting, /marques. Pas sur /liens, les pages merci, les pages légales, /retractation, la 404 (elle a son propre tracé sur photo, 5.9), le site 2.

**À quoi elle ressemble.** Une seule ligne par page, 2 px sur ordinateur et 1,5 px sur téléphone, `--rouge`, extrémités rondes. Elle part de la ligne de départ (un damier de 48 x 12 px suivi d'un trait rouge, au bas du premier écran), descend dans un couloir, traverse la page d'un couloir à l'autre dans l'espace entre deux sections, marque une corde à hauteur de chaque titre de section, et finit sur le damier d'arrivée du pied de page. Sous elle, le tracé complet est visible en fantôme : trait de 1 px, `rgba(var(--texte-rgb), .18)`, pointillé `2 6`. Le rouge recouvre le fantôme à mesure qu'on lit : c'est l'écho du schéma du guide, trajectoire apprise en pointillés, trajectoire réelle en rouge.

**Balisage.**
- `<main>` reçoit `data-trajectoire` et `position: relative`.
- `mouvement.js` y insère, en premier enfant, `<svg class="trajectoire" aria-hidden="true" focusable="false">` en `position: absolute; inset: 0; width: 100%; height: 100%; z-index: 1; pointer-events: none; overflow: visible`.
- Chaque titre de section qui porte une corde reçoit `data-virage="g"` ou `data-virage="d"` (côté du couloir). Les listes par page sont au chapitre 5. Par défaut, on alterne g et d dans l'ordre de la page.
- La ligne de départ est un élément `.depart` (damier et trait) placé en bas du premier écran ; l'arrivée est le `.damier` du pied de page. Ce sont les deux extrémités du tracé.

**Géométrie** (calculée par `mouvement.js` au chargement, après `document.fonts.ready`, puis à chaque redimensionnement par `ResizeObserver` sur `<main>`, avec un délai de 150 ms) :
1. `L` = bord gauche du contenu (le `getBoundingClientRect().left` du `.conteneur` de la première section, relatif à `<main>`) ; `couloirG = max(8, L / 2)` ; `couloirD = largeur - couloirG`.
2. Points dans l'ordre : départ (fin du trait rouge de `.depart`) ; puis pour chaque titre `data-virage` : une **corde** `C = (couloir du côté indiqué, centre de la première ligne du titre)`. Sur ordinateur (900 px et plus), la corde s'avance vers le contenu : `x = couloirG + min(24, L/2 - 12)` à gauche, symétrique à droite. Sur téléphone, elle reste dans le couloir.
3. Quand deux cordes successives sont de côtés différents, on insère deux points de **traversée** dans l'espace entre les sections : `(couloir de départ, haut de la section suivante - 40 % de son retrait haut)` puis `(couloir d'arrivée, haut de la section suivante - 10 % de son retrait haut)`. Quand elles sont du même côté, on insère un point de couloir 140 px sous la première corde, pour que la ligne revienne dans le couloir après l'avoir touchée.
4. Chaque segment entre deux points consécutifs est une courbe de Bézier à tangentes verticales : `C x0,(y0+y1)/2 x1,(y0+y1)/2 x1,y1`. Cette forme ne dépasse jamais horizontalement ses deux extrémités : la ligne ne mord jamais sur le texte.
5. Le dernier point est le centre du damier d'arrivée.

**Dessin au défilement.**
- `stroke-dasharray` et `stroke-dashoffset` égaux à la longueur totale ; une table de correspondance « y vers longueur » est construite une fois (échantillon tous les 4 px avec `getPointAtLength`).
- La tête de la ligne suit la hauteur `scrollY + 0,6 x hauteur de fenêtre` ; ScrollTrigger (`trigger: main`, `start: 'top top'`, `end: 'bottom bottom'`, `onUpdate`) recalcule l'offset. Avec Lenis, la mise à jour suit son lissage.
- **Tête** : un disque rouge de 8 px cerclé de 2 px de `--fond-0`, posé au bout du trait rouge (le kart sur sa trajectoire). Rien d'autre ne bouge.
- Performance : si le profil montre plus de 4 ms par image sur un téléphone moyen, découper le tracé en un chemin par section (même calcul) pour limiter la zone repeinte.

**Sans animation** (préférence de mouvement réduit, ou GSAP absent) : `mouvement.js` calcule et dessine le tracé entier, rouge, sans fantôme, sans tête, toutes cordes allumées. **Sans JavaScript** : pas de tracé ; le damier de départ et celui d'arrivée restent (ils sont en HTML et CSS).

**Impression et contraste forcé** : `.trajectoire` masquée.

### 3.2 Cordes, secteurs

- **Corde** (`.corde`) : disque de 10 px en `--rouge`, cerclé d'un anneau de 1 px craie séparé par 3 px de noir (`box-shadow: 0 0 0 3px var(--fond-0), 0 0 0 4px var(--texte)`). Éteinte, avant que la tête passe : anneau seul en `--gris-piste`. Quand la tête passe : le disque apparaît (échelle 0,4 vers 1, 220 ms, `--ease-sortie`) et l'anneau s'élargit une fois (échelle 1 vers 1,8 en s'effaçant, 400 ms). Dans le SVG de la trajectoire, aux points de corde.
- **Repères de secteur** : le tracé est coupé en trois secteurs de longueur égale. À la fin du premier tiers et du deuxième, une petite traverse de 12 px perpendiculaire au tracé (craie à 50 %). Sur ordinateur seulement (900 px et plus), l'étiquette `S2`, puis `S3`, en Martian Mono `--t-micro`, `--texte-2`, dans le couloir à 8 px du tracé, du côté de l'écran (jamais sur le contenu) ; sur téléphone, la traverse seule. `S1` est inscrit au-dessus du damier de départ. Ces secteurs sont les mêmes que ceux de la barre de secteurs (3.4), qui découpe la hauteur de la page en trois tiers.

### 3.3 Pastilles numérotées et carte du circuit

**Pastille** (`.virage-num`) : disque rouge de 26 px (32 px pour la carte du sommaire sur ordinateur), chiffre en Martian Mono 600 `--t-micro`, craie (5,4:1 sur le rouge), centré. Copie exacte des pastilles de la couverture du guide. On ne l'utilise que pour du contenu vraiment ordonné : les 13 chapitres, les étapes « Comment ça se passe », les trois temps de la journée de consulting, les étapes des pages merci, les étapes « Trois étapes, rien à installer » du site 2. État éteint : fond `--fond-3`, anneau `--gris-piste`, chiffre `--texte-2`.

**Carte du circuit** (`.circuit`) : le circuit de la couverture du guide, redessiné en SVG. Coordonnées relevées sur `guide/couverture-1280.png` et vérifiées (maquette `circuit-html-820-ecran1.jpg`) :

```html
<svg class="circuit" viewBox="-32 -32 812 537" role="img" aria-label="Le circuit du guide : 13 chapitres, 13 virages">
  <path class="circuit-piste" d="M201 395 L558 443 L673 380 L632 283 L718 205 L654 94 L539 142 L450 49 L346 97 L253 30 L134 68 L30 164 L108 268 L45 376 Z"/>
  <path class="circuit-trace" d="M201 395 L558 443 L673 380 L632 283 L718 205 L654 94 L539 142 L450 49 L346 97 L253 30 L134 68 L30 164 L108 268 L45 376 Z"/>
  <g class="circuit-damier" transform="translate(201 395) rotate(7.4)">...</g>
  <!-- treize groupes : <g class="circuit-virage" data-virage-num="1"><circle cx="558" cy="443" r="17"/><text x="558" y="443">1</text></g> ... -->
</svg>
```

Centres des virages : 1 (558, 443) ; 2 (673, 380) ; 3 (632, 283) ; 4 (718, 205) ; 5 (654, 94) ; 6 (539, 142) ; 7 (450, 49) ; 8 (346, 97) ; 9 (253, 30) ; 10 (134, 68) ; 11 (30, 164) ; 12 (108, 268) ; 13 (45, 376). Départ et arrivée : damier de 24 x 14 px centré en (201, 395), tourné de 7,4 degrés (cases de 6 x 7 px, craie et noir).

Longueur du tracé depuis le départ jusqu'à chaque virage (pour `stroke-dashoffset`, total 2002) : 1 : 360 ; 2 : 491 ; 3 : 597 ; 4 : 713 ; 5 : 841 ; 6 : 965 ; 7 : 1094 ; 8 : 1209 ; 9 : 1323 ; 10 : 1448 ; 11 : 1590 ; 12 : 1720 ; 13 : 1845 ; arrivée : 2002.

Styles : `.circuit-piste` trait `--gris-piste` 14, jointures rondes, sans remplissage ; `.circuit-trace` trait `--rouge` 3, jointures rondes, `stroke-dasharray: 2002`, `stroke-dashoffset: 2002` (vide) ; virage éteint : disque `--fond-3` anneau `--gris-piste`, chiffre `--texte-2` ; virage allumé : disque `--rouge`, chiffre craie ; virage actif : anneau craie de 3 px. Chiffres en Martian Mono 600, 14 unités, `text-anchor: middle; dominant-baseline: central`.

Usages : sommaire de /guide (piloté par la lecture), bande « Gratuit » de l'accueil et premier écran de /extrait (chapitres offerts allumés).

### 3.4 Le HUD de télémétrie

**Barre de secteurs** (dans `nav.html`, et dans la navigation de capture de /extrait et /tableur-reglages, qui reçoit le même conteneur `.secteurs` ; pas sur /liens ni sur les pages merci) : sous la navigation, collée à son bord bas, trois segments de 2 px de haut sur toute la largeur, séparés par 4 px. Fond des segments `--gris-piste` à 70 % ; chaque segment se remplit en `--rouge` de gauche à droite pendant son tiers de page (`transform: scaleX()`, `transform-origin: left`). Réalisation en CSS pur avec les animations liées au défilement :

```css
.secteurs i b { transform: scaleX(0); transform-origin: left; animation: secteur linear both; animation-timeline: scroll(root); }
.secteurs i:nth-child(1) b { animation-range: 0% 33.333%; }
.secteurs i:nth-child(2) b { animation-range: 33.333% 66.666%; }
.secteurs i:nth-child(3) b { animation-range: 66.666% 100%; }
@keyframes secteur { to { transform: scaleX(1); } }
```
Repli quand `@supports not (animation-timeline: scroll())` (Firefox) : `interface.js` met à jour une variable `--progression` sur un écouteur de défilement passif, limité à une écriture par image (`requestAnimationFrame`). C'est une barre de progression : elle fonctionne aussi avec la préférence de mouvement réduit.

**Relevés en coin** (ordinateur, 1024 px et plus, pages sans barre d'achat : accueil, /marques, /extrait, pages légales) : deux éléments fixes, `aria-hidden="true"`, `pointer-events: none`, à 16 px du bas, alignés sur les bords du contenu (`left` et `right: max(var(--gouttiere-large), (100vw - var(--conteneur)) / 2 + var(--gouttiere-large))`), donc hors des couloirs de la trajectoire. Martian Mono `--t-micro`, `--texte-2`. Chacun sur une petite plaque qui le garde lisible quand le contenu passe dessous : fond `rgba(6,6,7,.72)`, `backdrop-filter: blur(8px)`, `padding: 6px 10px`, rayon 0.
- À gauche : trois mini-segments de 22 x 3 px (le secteur en cours en rouge), puis `S1`, `S2` ou `S3` en craie 600, puis le titre de la section en cours (le texte du `h2` qui croise le milieu de l'écran), coupé à 32 caractères avec points de suspension (`text-overflow: ellipsis`).
- À droite : `Tour` puis un chrono en craie 600 : le temps écoulé depuis l'arrivée sur la page, figé au passage de chaque secteur (un temps intermédiaire par secteur, au format `0:42.3`). Il ne défile pas en continu : il change trois fois par page, au passage d'un secteur, par un compteur (3.5). Aucune animation automatique, donc aucun bouton pause nécessaire.
- Visibles de la fin du premier écran jusqu'à l'arrivée (apparition en fondu 220 ms). Quand le damier d'arrivée entre à l'écran, le chrono affiche le temps du tour complet ; les relevés s'effacent quand le pied de page atteint le milieu de l'écran. Cachés sous 1024 px.

Les noms de section et le chrono sont écrits par `interface.js` au moment de l'affichage : le HTML de départ ne contient que `S1` et `0:00.0`, sans aucun texte de section (les tests lisent le texte visible des sources).

### 3.5 Compteurs qui défilent

`[data-compteur]` sur un élément qui contient un chiffre de la config (prix géants, chiffres d'audience, objectif de saison, « 72 h », faits de l'accueil). À la première apparition (IntersectionObserver, seuil 0,6), `interface.js` :
1. garde le texte exact dans un `<span class="visuellement-cache">` pour les lecteurs d'écran ;
2. remplace chaque chiffre visible par une colonne `0123456789` (`aria-hidden="true"`, hauteur d'un chiffre, `overflow: hidden`) qui part de 0 et monte jusqu'au bon chiffre (`transform: translateY()`, 900 ms, `--ease-expo`, de droite à gauche avec 40 ms d'écart) ; espaces, virgules, « € » et « h » ne bougent pas ;
3. remet le texte d'origine à la fin (espaces insécables compris).
Les chiffres sont en Martian Mono, donc la largeur ne change jamais (CLS nul). Mouvement réduit : rien ne défile. Jamais dans un bouton, jamais sur un prix de moins de 40 px.

### 3.6 Navigation

**La barre** (partial `nav.html`, balisage actuel conservé) :
- Fixe, `--nav-h`. Au-dessus d'un premier écran photo : transparente, avec le voile haut de la photo dessous. Après 80 px de défilement (classe `.nav-pleine` posée par `interface.js` avec un IntersectionObserver sur une sentinelle, pas d'écouteur de défilement) : fond `rgba(6,6,7,.86)`, `backdrop-filter: blur(14px) saturate(140%)`, filet bas `--filet`, transition 220 ms. `prefers-reduced-transparency: reduce` : fond `--fond-0` plein.
- À gauche : symbole et « Clem Kart Racing » en Hubot 800, 15 px, approche `0.06em`. Sous 420 px, le nom passe sur deux lignes (« Clem Kart » / « Racing », `max-width: 9ch`) : c'est un blason, pas un accident.
- **1100 px et plus** : les trois liens en ligne (Mona 500 `--t-petit`, `--texte-2`, survol craie) puis le bouton fantôme petit « Le guide » (`.nav-guide`, `data-cta="nav"`). Page en cours (`aria-current="page"`, déjà posé par `site.js`) : texte craie et une corde de 6 px centrée 10 px sous le lien. Les sous-lignes, `.nav-lien-guide` et `.nav-lien-extrait` restent cachées.
- **Sous 1100 px** : à droite, le bouton fantôme petit « Le guide » (`.nav-guide-court`, dès 360 px) et le bouton « Menu ». Le bouton Menu : 44 x 44 px minimum, bord `--filet-champ`, texte « Menu » ou « Fermer » (écrit par `site.js`, à garder) en Martian Mono `--t-micro` en capitales, précédé de deux barres de 16 px en CSS qui pivotent en croix quand `aria-expanded="true"` (220 ms, `--ease-sortie`).
- La barre de secteurs (3.4) est son bord bas.
- `view-transition-name: nav-principale` (elle reste immobile pendant les changements de page).
- Le seuil de `site.js` qui referme le menu (`min-width: 1024px`) passe à `1100px`.

**Le menu plein écran** (sous 1100 px, l'élément `#nav-liens` actuel) :
- Panneau fixe sous la barre (`top: var(--nav-h)`, jusqu'en bas), fond `--fond-0`, défilement interne si besoin (`overscroll-behavior: contain`, `data-lenis-prevent`).
- Ouverture : `clip-path: inset(0 0 100% 0)` vers `inset(0)`, 420 ms, `--ease-glisse`. Fermeture : 260 ms, `--ease-sortie`. `visibility` basculée en fin de fermeture.
- Entrées : chaque `.nav-lien` sur une ligne séparée par `--filet`, hauteur 72 px minimum. Devant le titre, un numéro `01` à `05` par compteur CSS (`content: counter(menu, decimal-leading-zero) / ""`, Martian Mono `--t-micro`, `--texte-2`). Titre en Hubot `--t-titre-3`. Sous-ligne en Mona `--t-petit`, `--texte-2`. Page en cours : corde de 8 px devant le titre.
- Les entrées montent de 24 px en apparaissant, une par une (`transition-delay` de 120, 160, 200, 240, 280 ms par `:nth-child`).
- Signature : un tracé rouge de 2 px (SVG en ligne dans le partial, `aria-hidden`, derrière les entrées) traverse le panneau en S du coin haut droit au coin bas gauche, et se dessine en 600 ms à l'ouverture (`stroke-dashoffset`).
- Accessibilité : focus envoyé sur la première entrée à l'ouverture (déjà fait par `site.js`), **focus piégé** dans le panneau et le bouton Menu tant qu'il est ouvert (à ajouter dans `site.js` : Tab et Maj+Tab bouclent), Échap ferme et rend le focus au bouton (déjà fait), `aria-expanded` à jour (déjà fait), défilement de la page bloqué (`body.menu-ouvert`) et Lenis arrêté.
- Mouvement réduit : ouverture et fermeture immédiates.

**Navigation réduite** (`nav-merci.html`, `.nav-capture` de /extrait) : symbole et nom seuls, plus le lien « Retour au site » en Mona 500 `--t-petit` à droite sur les pages de capture.

**Lien d'évitement** (`.evitement`) : bouton rouge plein, en haut à gauche, visible au focus.

### 3.7 Boutons et liens

- `.bouton` : hauteur 56 px, `padding: 0 24px`, Hubot 800 16 px, capitales, approche `0.04em`, rayon 0, bord 1 px. Les classes restent celles du HTML (`bouton bouton-principal`, `bouton bouton-fantome`, `bouton-petit`, `bouton-large`) : un test exige `<a class="bouton bouton-principal" href="#demande"` mot pour mot sur /consulting, n'ajouter aucune classe à ces liens et mettre tout nouvel attribut après `href`.
- **Prix dans un bouton** (`.bouton .chrono`) : Martian Mono 400 15 px, séparé du libellé par un filet vertical de 1 px craie à 45 % et 14 px de marge. Plus de tiret rouge.
- **Principal** : fond `--rouge-bouton`, texte craie. Survol (souris seulement, `@media (hover: hover) and (pointer: fine)`) : un calque `::before` en `--rouge-survol` balaie le bouton de gauche à droite (`scaleX` 0 vers 1, `transform-origin: left`, 320 ms, `--ease-sortie`) sous le libellé. Appui : `scale(.97)` en 120 ms et fond `--rouge-survol` immédiat (c'est aussi le retour au toucher).
- **Fantôme** : transparent, bord `--filet-fort`, texte craie. Survol : bord craie, fond `--fond-2`. Appui : `scale(.97)`.
- **Désactivé** : opacité 0,45, curseur interdit, aucun mouvement.
- **Focus** (tous) : `outline: 2px solid var(--texte); outline-offset: 3px`. Jamais de contour rouge (invisible sur le bouton rouge).
- **Magnétisme léger** : seulement sur les boutons principaux des premiers écrans, des blocs prix et des blocs finaux (attribut `data-aimant`, posé après `href`), seulement sur ordinateur à souris (`(hover: hover) and (pointer: fine)`), jamais avec mouvement réduit. Dans un rayon de 24 px autour du bouton, il glisse vers le pointeur : déplacement égal à 25 % de l'écart au centre, plafonné à 6 px en horizontal et 4 px en vertical, lissé (interpolation 0,18 par image) ; le libellé suit à 1,4 fois. Retour en 400 ms, `--ease-sortie`. Transformations seulement.
- **Lien dans le texte** : craie, soulignement 1 px à `--filet-fort`, décalé de `0.2em` ; survol : soulignement craie.
- **Lien texte** (`.lien-texte`) : Mona 600 `--t-petit`, sans capitales, soulignement 1 px `--filet-fort` décalé de 4 px ; survol : soulignement craie de 2 px.
- **Sous-lignes de bouton** (`.bouton-sous`, `.bouton-cgv`) : Mona `--t-petit`, `--texte-2`, 8 px sous le bouton.

### 3.8 Offres et cartes

- **Registre des offres de l'accueil** : « trois plans », décrit en 5.1.
- **Choix de /marques** (`.choix`) : deux « stands » côte à côte (une colonne sous 900 px). Chaque carte : `padding: 32px`, bord `--filet`, fond transparent. Index (`.choix-index`) en Martian Mono `--t-donnee`, `--texte-2` ; titre en Hubot `--t-titre-3` ; texte en Mona ; pied en Martian Mono `--t-donnee` ; action (`.choix-action`) en lien texte. Survol : un filet rouge de 2 px traverse le bord haut de gauche à droite (`scaleX`, 380 ms), fond `--fond-1`, l'action se souligne en craie. Toute la carte reste le lien.
- **Formules de saison et formats** : registres en lignes, jamais en cartes (5.6).
- **Cases de la grille de départ** (/liens) : 5.2.
- Pas de carte dans une carte, pas d'ombre sur une carte, pas de rangée de trois cartes identiques.

### 3.9 En-têtes de section

- `h2` en Hubot `--t-titre-2`, capitales, aligné à gauche, `max-width: 18ch` sauf exception notée, 48 px avant le contenu.
- La corde de la trajectoire s'aligne sur sa première ligne, dans le couloir : c'est la seule « décoration » d'un titre.
- Libellé au-dessus du titre (`.libelle`) : seulement là où le HTML en contient déjà un. Martian Mono `--t-donnee`, `--texte-2`, casse du texte, aucun symbole devant.
- Chapô d'en-tête (`.entete-section .chapo`) : sous le titre, jamais à côté.
- Apparition : lignes qui montent derrière un masque (4.6).

### 3.10 Citations (« Messages reçus de lecteurs »)

- Ordinateur : trois colonnes ; la deuxième décalée de 64 px vers le bas, la troisième de 128 px (rythme éditorial). Sur chaque citation, un trait rouge de 32 x 2 px au-dessus du texte (plus de filet vertical).
- Texte en Mona 400 `--t-chapo`, craie, interligne 1,45. Signature (`footer`) en Martian Mono `--t-donnee`, `--texte-2`. Mention sous le groupe en Martian Mono `--t-micro`, `--texte-3`.
- Téléphone : une bande qu'on fait glisser du doigt (`overflow-x: auto; scroll-snap-type: x mandatory`), chaque citation à 86 % de largeur pour qu'on voie la suivante, aucun compteur ni point de pagination. Pour qu'on puisse aussi la faire défiler au clavier : en HTML, `.quotes` porte `role="region"` et `aria-labelledby` vers le titre de sa section (`messages-titre` sur l'accueil ; ajouter `id="preuves-titre"` au `h2` de /guide), et `interface.js` lui ajoute `tabindex="0"` seulement quand elle déborde (`scrollWidth > clientWidth`).
- Apparition : chaque colonne monte de 28 px avec 80 ms d'écart.

### 3.11 Formulaires

- Libellés au-dessus, en Mona 500 `--t-petit`, craie, casse du texte (plus de capitales).
- Champs : 56 px de haut, fond `--fond-2`, bord 1 px `--filet-champ`, rayon 0, texte craie 17 px (au moins 16 px pour empêcher le zoom d'iOS), indication de saisie `--texte-3`. `textarea` : 140 px minimum, `data-lenis-prevent`.
- Focus : bord craie, filet intérieur rouge de 3 px à gauche (`box-shadow: inset 3px 0 0 var(--rouge)`) et le contour de focus général.
- Erreur (`.est-invalide`, `aria-invalid="true"`) : bord rouge 2 px ; message (`.champ-erreur`) en craie `--t-petit`, précédé d'un carré rouge de 8 px. Message général (`.form-message.est-erreur`) : craie, filet rouge 2 px à gauche.
- Cases et boutons radio : 22 px, bord `--filet-champ` ; cochée : fond rouge et coche craie ; radio : point rouge de 10 px dans un cercle craie. Zone cliquable de 44 px avec le libellé.
- Choix de projet de /marques (`.projet`) : grandes cases de 72 px minimum, bord `--filet-fort` ; sélectionnée : bord craie, filet rouge de 3 px en haut, fond `--fond-1`.
- `details.preciser` : même rendu que la FAQ.
- Envoyé (`.form-envoye`) : plaque `--fond-1`, `padding: 32px`, bord `--filet`, coche craie de 24 px devant la première phrase ; à hauteur constante (déjà géré par les scripts).
- Bloc formulaire de /consulting et /marques : panneau `--fond-1`, `padding: 32px` (24 px sur téléphone), bord `--filet`.
- Lenis ne lisse jamais le défilement à l'intérieur d'un champ.

### 3.12 FAQ

- `details` séparés par `--filet` ; `summary` en Mona 600 `--t-chapo`, craie, 20 px de marge verticale, zone cliquable pleine largeur ; signe « + » en Martian Mono à droite qui pivote de 45 degrés à l'ouverture (220 ms).
- Ouverture animée sans JavaScript là où c'est possible : `:root { interpolate-size: allow-keywords; }` et `details::details-content { height: 0; overflow: clip; transition: height .32s var(--ease-sortie), content-visibility .32s allow-discrete; }`, `details[open]::details-content { height: auto; }`. Ailleurs : ouverture immédiate.
- Réponses en Mona `--t-texte`, `--texte-2`, mesure 64 caractères.

### 3.13 Barre d'achat collante (/guide, /consulting)

- 64 px de haut plus la zone de sécurité (`padding-bottom: env(safe-area-inset-bottom)`), fond `rgba(6,6,7,.92)` avec `backdrop-filter: blur(12px)`.
- Bord haut : la barre de secteurs (même mécanique que 3.4, en 2 px).
- À gauche (600 px et plus) : le texte en Hubot 800 16 px et le prix en Martian Mono. À droite : le bouton principal (petit, 44 px). Sous 600 px : le bouton prend toute la largeur (règle actuelle).
- Apparition : `translateY(100%)` vers 0, 320 ms, `--ease-sortie`. Elle se cache devant le bloc prix et le bloc final (scripts actuels).
- Sur ces pages, pas de relevés en coin (3.4).

### 3.14 Pied de page

- Haut du pied : l'arrivée. Damier de 12 px sur toute la largeur du contenu, sur lequel se termine la trajectoire (avec une dernière corde). Sur les pages sans trajectoire, le damier est là quand même.
- Quatre colonnes (une sous 900 px) : marque (symbole et nom en Hubot 24 px, phrase en Mona, email en lien), « Rouler plus vite », « Marques », « Réseaux ». Titres de colonne (`.pied h2`) en Martian Mono `--t-donnee`, `--texte-2`, casse du texte. Liens en Mona `--t-petit`, `--texte-2`, survol craie, 12 px entre eux.
- Bas : liens légaux en Mona `--t-petit` soulignés, puis les deux lignes d'information en Martian Mono `--t-micro`, `--texte-3`.
- Pied réduit des pages merci : damier, puis la ligne unique actuelle.
- Le pied n'a aucune animation d'entrée (il est atteint en fin de lecture, on ne le fait pas attendre).

### 3.15 Feux de départ (/liens)

- Cinq disques de 14 px en ligne, 10 px d'écart, `aria-hidden="true"`, en haut à gauche de la photo (téléphone) ou au-dessus du nom (ordinateur). Éteints : fond `#2A2A2E`, anneau intérieur 1 px craie à 18 %.
- **Séquence** (1 seconde au plus, une fois par session, jamais avec mouvement réduit) : les feux s'allument en rouge un par un toutes les 120 ms (de 0 à 480 ms), restent allumés jusqu'à 650 ms, s'éteignent tous ensemble en 100 ms (le départ). Au départ, les cinq cases de la grille avancent de 6 px vers le haut et reviennent (`translateY(6px)` vers 0, 300 ms, `--ease-sortie`, 30 ms d'écart). Fin à 950 ms.
- Déclenchement : un script en ligne en bas de /liens (ou `interface.js`) ajoute la classe `feux-depart` à `<html>` si la préférence de mouvement réduit est absente et si `sessionStorage` ne contient pas `ckr_feux`, puis écrit `ckr_feux` (lecture et écriture dans un `try`). Les animations CSS ne tournent que sous `html.feux-depart`.
- Rien n'est caché ni bloqué : les cases sont visibles et cliquables dès la première image, la séquence ne touche pas leur opacité.

### 3.16 Damier

Le damier (2.4) marque le départ et l'arrivée, rien d'autre : départ en bas du premier écran des pages avec trajectoire (48 x 12 px, suivi du trait rouge), arrivée en haut du pied de page (pleine largeur), haut des pages merci (pleine largeur, c'est le drapeau d'arrivée de l'achat), départ et arrivée de la carte du circuit. Apparition en marches sur les pages merci et en haut du pied : `clip-path: inset(0 100% 0 0)` vers `inset(0)` en `steps(16)`, 600 ms, une fois.

### 3.17 Fenêtre des pages du guide (`dialog.dialog-planche`)

- Fond `::backdrop` `rgba(6,6,7,.92)` avec `backdrop-filter: blur(6px)`. La page du PDF centrée, `max-height: 90svh`, contour 1 px `--filet-fort`. Bouton « Fermer » fantôme petit en haut à droite.
- Ouverture : opacité 0 vers 1 et `scale(.96)` vers 1 en 220 ms avec `@starting-style` ; fermeture 160 ms. Lenis arrêté tant qu'elle est ouverte.

---

## 4. Le système de mouvement

### 4.1 Bibliothèques

Versions vérifiées le 02/10/2026, empreintes calculées sur les fichiers téléchargés (celles de GSAP sont identiques à celles publiées par cdnjs).

| Fichier | Adresse | `integrity` |
|---|---|---|
| GSAP 3.15.0 (cœur, 73 Ko) | `https://cdnjs.cloudflare.com/ajax/libs/gsap/3.15.0/gsap.min.js` | `sha512-oJ8QbaQThQoJZ7oEv+29jfPM6CcP+zUxh3PKJs1vyOhx0UraUrE7PQgeItu3dOuCJyrzWpoYMsVjkkPEBzbUqw==` |
| ScrollTrigger 3.15.0 (45 Ko) | `https://cdnjs.cloudflare.com/ajax/libs/gsap/3.15.0/ScrollTrigger.min.js` | `sha512-OaIE7ud4P04EhnBuhEcm0wQSceIxbi2pV03oBLS/+F6ampfxsnxcIxOp7H2eF9G7N0kEht0VAzOLG+dTLSo17Q==` |
| SplitText 3.15.0 (8 Ko) | `https://cdnjs.cloudflare.com/ajax/libs/gsap/3.15.0/SplitText.min.js` | `sha512-LFdAHEel9Gwq2HmgZUgnl3mLwXjC6nrfMU6IRLA2AOaKQaWgdrT8ZlmI2ZjVkgB32TeYyi7KdD80ihb9W6uH8Q==` |
| Lenis 1.3.26 (19 Ko, expose `window.Lenis`) | `https://cdn.jsdelivr.net/npm/lenis@1.3.26/dist/lenis.min.js` | `sha384-jqpi9VmOdhyLoLURgjCn7EpnG9BbnHW57ibIZoeaIU+erWDH3k8fQQg0xH2ySjnw` |

GSAP et tous ses modules sont gratuits depuis la version 3.13. Les deux CDN renvoient `Access-Control-Allow-Origin: *` (exigé pour `integrity`). On n'utilise ni DrawSVG, ni ScrambleText, ni CustomEase : le tracé se dessine par `stroke-dashoffset`, et les courbes GSAP intégrées suffisent. La feuille `lenis.css` n'est pas chargée : ses six règles sont recopiées dans `base.css` (`html.lenis, html.lenis body { height: auto }`, `.lenis.lenis-stopped { overflow: clip }`, `[data-lenis-prevent] { overscroll-behavior: contain }`, `.lenis.lenis-smooth iframe { pointer-events: none }`), avec `html.lenis { scroll-behavior: auto }` pour annuler le défilement doux natif.

### 4.2 Chargement et garde-fous

Nouveau partial `site v2/_partials/mouvement.html`, inclus dans le `<head>` des pages à mouvement seulement (accueil, /guide, /extrait, /tableur-reglages, /consulting, /marques, 404), juste après `{{partial:head}}` :

```html
<script>(function(d){try{if(matchMedia('(prefers-reduced-motion: no-preference)').matches){d.classList.add('js-anim');setTimeout(function(){if(!window.__ckrMouvement)d.classList.remove('js-anim');},2000);}}catch(e){}})(document.documentElement);</script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.15.0/gsap.min.js" integrity="sha512-oJ8QbaQThQoJZ7oEv+29jfPM6CcP+zUxh3PKJs1vyOhx0UraUrE7PQgeItu3dOuCJyrzWpoYMsVjkkPEBzbUqw==" crossorigin="anonymous" referrerpolicy="no-referrer" defer onerror="document.documentElement.classList.remove('js-anim')"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.15.0/ScrollTrigger.min.js" integrity="sha512-OaIE7ud4P04EhnBuhEcm0wQSceIxbi2pV03oBLS/+F6ampfxsnxcIxOp7H2eF9G7N0kEht0VAzOLG+dTLSo17Q==" crossorigin="anonymous" referrerpolicy="no-referrer" defer onerror="document.documentElement.classList.remove('js-anim')"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.15.0/SplitText.min.js" integrity="sha512-LFdAHEel9Gwq2HmgZUgnl3mLwXjC6nrfMU6IRLA2AOaKQaWgdrT8ZlmI2ZjVkgB32TeYyi7KdD80ihb9W6uH8Q==" crossorigin="anonymous" referrerpolicy="no-referrer" defer onerror="document.documentElement.classList.remove('js-anim')"></script>
<script src="https://cdn.jsdelivr.net/npm/lenis@1.3.26/dist/lenis.min.js" integrity="sha384-jqpi9VmOdhyLoLURgjCn7EpnG9BbnHW57ibIZoeaIU+erWDH3k8fQQg0xH2ySjnw" crossorigin="anonymous" referrerpolicy="no-referrer" defer></script>
<script src="/assets/mouvement.js" defer></script>
```

Règles :
- **Rien n'est caché sans la classe `html.js-anim`.** Tous les états de départ des animations (titres masqués, photos agrandies, textes à remplir) sont écrits sous `html.js-anim`. Sans script, avec un CDN coupé (`onerror`), ou si `mouvement.js` n'a pas démarré au bout de 2 secondes, la classe tombe et tout s'affiche.
- `mouvement.js` vérifie `window.gsap && window.ScrollTrigger` ; il pose `window.__ckrMouvement = true` dès qu'il démarre. Sans GSAP, il dessine quand même le tracé statique (3.1) et retire `js-anim`.
- SplitText absent : `mouvement.js` fait apparaître les titres d'un bloc, par un fondu montant de 24 px. Lenis absent : défilement natif.
- `interface.js` (sans dépendance, toutes les pages) ne dépend pas de ce partial.
- Pages sans ce partial (/liens, pages merci, pages légales, rétractation) : leurs entrées sont de simples animations CSS (`animation-fill-mode: both`) écrites sous `@media (prefers-reduced-motion: no-preference)`. Aucun état caché en dehors de l'animation elle-même : si la feuille ou un script manque, tout reste visible.
- Le partial `head.html` garde `site.js` (inchangé pour le suivi) et ajoute `interface.js` en `defer`.
- Le build injecte les balises `{{...}}` dans les `.js` : `mouvement.js` et `interface.js` ne contiennent jamais deux accolades de suite.

### 4.3 Jetons de mouvement

Dans `tokens.css` :

| Variable | Valeur | Usage |
|---|---|---|
| `--d-instant` | `120ms` | appui |
| `--d-court` | `220ms` | survol, focus, petits éléments d'interface |
| `--d-moyen` | `420ms` | menu, panneaux, changement de page |
| `--d-long` | `900ms` | révélations de titres, compteurs |
| `--d-hero` | `1400ms` | mise en place de la photo du premier écran |
| `--ease-sortie` | `cubic-bezier(0.23, 1, 0.32, 1)` | courbe par défaut de l'interface (départ vif, fin douce) |
| `--ease-expo` | `cubic-bezier(0.16, 1, 0.3, 1)` | révélations, entrées |
| `--ease-glisse` | `cubic-bezier(0.77, 0, 0.175, 1)` | déplacements à l'écran (panneau du menu, volets) |

Équivalents GSAP : entrées et révélations `expo.out` ; interface `power3.out` ; glissés `power4.inOut` ; tout ce qui est lié au défilement `ease: 'none'` avec `scrub: 0.6` sur ordinateur et `scrub: true` sur téléphone. `gsap.defaults({ ease: 'expo.out', duration: 0.9 })`.

Jamais : `ease-in` sur une entrée, `transition: all`, `linear` sur un mouvement d'interface, animation de `width`, `height`, `top`, `left`, `margin`, `padding`, `box-shadow` ou `filter` sur une grande surface. Seulement `transform`, `opacity`, `clip-path` (petits éléments ou cadres), `stroke-dashoffset`.

### 4.4 Règles d'emploi

1. Chaque animation a une raison écrite : guider (la trajectoire, les secteurs), révéler un contenu dans l'ordre (titres, photos), répondre à un geste (boutons, menu), dire qu'un état a changé (formulaires, cordes).
2. **Une seule entrée orchestrée par page**, celle du premier écran : titres, chapôs et boutons en place en 1,2 s au plus ; décor (photo, trait de départ, tracés, couverture) et compteurs finis en 1,6 s au plus. Le contenu est lisible dès 400 ms et le bouton principal cliquable dès 500 ms.
3. Une seule phrase par page en remplissage mot à mot (4.7).
4. Rien de ce qui bouge n'empêche de lire ou de cliquer : aucun élément cliquable invisible (on utilise `autoAlpha`, qui rend `visibility: hidden` à opacité nulle), aucune section épinglée, aucune animation qui retient le défilement.
5. Le défilement n'est jamais détourné : pas d'épinglage, pas de défilement horizontal forcé, pas de saut d'ancre animé plus long que le défilement natif.
6. Interactions fréquentes (survol de lien, ouverture de FAQ, menu) sous 250 ms.
7. Sur téléphone : amplitudes divisées par deux, pas de Lenis, pas de magnétisme, pas de relevés en coin.

### 4.5 Chorégraphie d'entrée par page

| Page | Séquence (début et durée) |
|---|---|
| Accueil | photo : `scale` 1,12 vers 1 (0 ms, 1400 ms, `expo.out`) ; deux lignes d'amorce du titre derrière masque (150 ms, 800 ms, 80 ms d'écart) ; chute « Eux savent lesquelles. » (300 ms, 900 ms) ; chapô et actions montent de 16 px (300 ms, 600 ms, `autoAlpha`) ; damier de départ en marches puis trait rouge qui se dessine de gauche à droite (700 ms, 900 ms) |
| /liens | feux de départ (3.15) ; photo `scale` 1,06 vers 1 (0 ms, 1200 ms) ; rien d'autre |
| /guide | photo `scale` 1,1 vers 1 (0 ms, 1400 ms) ; libellé mono et titre derrière masque (100 ms, 900 ms) ; « plus vite » en rouge glisse de 0,3em (250 ms, 900 ms) ; couverture monte de 40 px et tourne de 4 à 0 degré (200 ms, 1000 ms) ; tracé sur la photo : le trait de sortie se dessine depuis le kart (600 ms, 1000 ms), la corde s'allume à la fin |
| /extrait | titre derrière masque (0 ms, 800 ms) ; carte du circuit : tracé rouge du départ jusqu'au dernier virage offert (300 ms, 1200 ms), virages offerts allumés en suivant |
| /consulting | bande photo : volet `clip-path: inset(0 0 100% 0)` vers `inset(0)` (0 ms, 900 ms, `power4.inOut`) ; titre à cheval sur la bande derrière masque (300 ms, 900 ms) ; actions (500 ms, 600 ms) |
| /marques | photo de droite : volet depuis la gauche (0 ms, 900 ms) ; titre derrière masque (150 ms, 900 ms) ; ligne d'audience en compteur (500 ms) |
| Pages merci | damier en marches (0 ms, 600 ms) ; titre monte de 24 px (100 ms, 700 ms) ; « 72 h » en compteur (merci-onboard, 200 ms) |
| Pages légales | titre monte de 24 px (0 ms, 700 ms) ; rien d'autre |
| 404 | photo `scale` 1,1 vers 1 ; tracé hors piste dessiné une fois (400 ms, 1200 ms) |

Toutes ces entrées sont coupées par la préférence de mouvement réduit.

### 4.6 Révélations de texte

- **Titres h1 et h2** des pages à mouvement : SplitText, `type: 'lines'`, `mask: 'lines'`, `autoSplit: true`, découpe après `document.fonts.ready` ; chaque ligne monte de 100 % de sa hauteur derrière son masque (900 ms, `expo.out`, 80 ms d'écart). Déclenchement à 85 % de la hauteur de l'écran, une seule fois. `aria` laissé sur `auto` (le texte entier reste lu d'un bloc).
- Pas de découpe en lettres, pas de brouillage de caractères, pas de machine à écrire.
- **Blocs** (paragraphes, listes, cartes) : la classe `.reveal` existante, gérée par `site.js` (IntersectionObserver) : départ à `translateY(28px)` et opacité 0, arrivée en place en 800 ms, `--ease-expo` ; enfants décalés de 60 ms par `--i`. Ne jamais mettre `.reveal` sur un élément que GSAP anime aussi.

### 4.7 Remplissage mot à mot

Une seule phrase par page : chaque mot passe de 28 % à 100 % d'opacité pendant que la phrase traverse l'écran (de 80 % à 40 % de sa hauteur), en scrub. SplitText `type: 'words'`. Couleur craie seulement, jamais de mot en rouge. Phrases retenues :
- accueil : les lignes de « Qui je suis » (`.qui-lignes`) ;
- /guide : le titre final « Tu peux faire dix sessions de plus en espérant que ça vienne. » ;
- /consulting : « Tu ne repars pas avec vingt conseils. Tu repars avec un plan. ».
Aucune sur /marques, /extrait, les pages merci, les pages légales.

### 4.8 Relief des photos

- **Cadres** (`.cine` hors premier écran) : l'image, plus grande que son cadre (`scale` 1,12), descend de -6 % à +6 % de sa hauteur (`yPercent`) et revient à l'échelle 1,04 pendant que le cadre traverse l'écran, en scrub. Téléphone : `scale` 1,06 et ±3 %.
- **Volet d'entrée** des photos de section importantes (offres de l'accueil, « Qui je suis », « Pourquoi moi ») : `clip-path: inset(100% 0 0 0)` vers `inset(0)` au moment où le cadre entre (900 ms, `power4.inOut`, joué une fois sur téléphone, en scrub sur ordinateur).
- **Premier écran de l'accueil, ordinateur** : en quittant l'écran, le cadre de la photo rétrécit (`scale` 1 vers 0,92) pendant que l'image grossit en sens inverse (1 vers 1,09) : l'écran de cinéma s'éloigne. Le bloc de texte monte un peu plus vite (`yPercent` -12) et passe à 20 % d'opacité. Transformations seulement, en scrub, sans épinglage. Téléphone : seulement `yPercent` 0 vers 10 sur l'image.
- **Couverture du guide** : monte de 8 % plus vite que la page.
- Jamais de relief sur une photo qui porte du texte courant.

### 4.9 Défilement doux (Lenis)

```js
new Lenis({ lerp: 0.1, wheelMultiplier: 1, syncTouch: false, autoRaf: false, anchors: { offset: -88 }, prevent: (n) => !!n.closest('[data-lenis-prevent], textarea, select, dialog') })
```
- Seulement si `(hover: hover) and (pointer: fine) and (min-width: 1024px)` et sans mouvement réduit. Sur écran tactile, défilement natif.
- Branché sur GSAP : `lenis.on('scroll', ScrollTrigger.update)`, `gsap.ticker.add((t) => lenis.raf(t * 1000))`, `gsap.ticker.lagSmoothing(0)`.
- Arrêté (`lenis.stop()`) quand le menu, une fenêtre `dialog` ou un `details.preciser` long s'ouvre ; relancé à la fermeture.
- Le clavier (Espace, Page bas, flèches, Tab) et les ancres continuent de marcher ; les scripts qui placent le focus dans le premier champ après 450 ms (/consulting, /marques) ne changent pas.
- `site.js` (`allerSection`) garde `scrollIntoView` : sous Lenis, `html.lenis` a `scroll-behavior: auto`.

### 4.10 Transitions entre pages

En CSS pur, dans `base.css`, pour toutes les pages du site 1 :

```css
@view-transition { navigation: auto; }
::view-transition-old(root) { animation: 280ms var(--ease-glisse) both vt-sortie; }
::view-transition-new(root) { animation: 400ms var(--ease-sortie) both vt-entree; }
@keyframes vt-sortie { to { opacity: 0; transform: scale(.985); } }
@keyframes vt-entree { from { clip-path: inset(0 0 100% 0); } to { clip-path: inset(0); } }
.nav { view-transition-name: nav-principale; }
@media (prefers-reduced-motion: reduce) { @view-transition { navigation: none; } }
```
La nouvelle page tombe comme un volet sur l'ancienne qui recule ; la barre de navigation ne bouge pas. Chrome et Edge 126 et plus, Safari 18.2 et plus ; ailleurs, navigation normale. Les sorties vers Stripe (`/aller/*`, autre domaine) ne sont pas concernées. Durée totale 400 ms, pour ne pas retenir les clics.

### 4.11 Budget de performance

- **LCP** sous 2,5 s sur un téléphone moyen en 4G : l'image du premier écran est l'élément le plus grand, préchargée avec `imagesrcset`, `imagesizes` et `media` (une ligne par cadrage), `fetchpriority="high"`, jamais animée en opacité. Les titres ne sont jamais l'élément LCP masqué.
- **CLS nul** : `width` et `height` sur toutes les images, polices de secours calées (2.2), compteurs en chasse fixe, découpe des titres après chargement des polices, barre d'achat et HUD en position fixe, aucun contenu ajouté au-dessus de ce qui est déjà affiché.
- **JavaScript** : 55 Ko de bibliothèques en gzip, 50 Ko en brotli (mesuré le 02/10 en gzip : GSAP 28, ScrollTrigger 18, Lenis 5, SplitText 4), sur les pages à mouvement seulement ; `mouvement.js` 12 Ko compressés au plus ; `interface.js` 4 Ko au plus. /liens, les pages merci, les pages légales et le site 2 ne chargent aucune bibliothèque.
- **CSS** : `tokens.css` + `base.css` + `signature.css` 30 Ko compressés au plus ; une feuille par page.
- **Images** : premier écran sous 130 Ko sur téléphone ; images des sections en `loading="lazy"`.
- **Tenue** : 60 images par seconde au défilement sur un téléphone moyen ; une seule mise à jour d'attribut SVG par image pour la trajectoire ; aucun écouteur de défilement hors du repli de la barre de secteurs ; `will-change` posé seulement pendant une animation.
- Contrôle : Lighthouse mobile 90 au moins en performance et 100 en accessibilité sur l'accueil, /liens et /guide.

### 4.12 Préférence de mouvement réduit

Avec `prefers-reduced-motion: reduce` :
- la classe `js-anim` n'est jamais posée : tout est visible tout de suite ;
- `base.css` garde sa règle générale (durées à 0,001 ms, délais à 0) ;
- tracé de la trajectoire dessiné en entier, sans tête, cordes allumées ; carte du circuit entièrement dessinée ;
- pas de compteur, pas de feux, pas de relief, pas de magnétisme, pas de Lenis, pas de transition de page, pas de remplissage mot à mot ;
- la barre de secteurs reste (c'est une indication de progression liée au geste de l'utilisateur), sans transition ;
- les états de survol changent de couleur sans bouger.

### 4.13 Sans JavaScript ou CDN coupé

Le site reste entièrement utilisable : liens, formulaires (envoi direct vers les fonctions), menu (ouvert par l'ancre de repli actuelle si elle existe, sinon les destinations sont aussi dans le pied de page), FAQ native, fenêtre des pages du guide (le lien ouvre l'image). Visuellement : pas de trajectoire, pas de HUD, damiers présents, toutes les photos et tous les textes visibles.

### 4.14 Fichiers

- `site v2/assets/tokens.css` : toutes les variables (2.1 à 2.4, 4.3), polices de secours.
- `site v2/assets/base.css` : remise à zéro, typographie, grille, boutons, liens, formulaires, FAQ, navigation, menu, pied de page, barre d'achat, utilitaires, mouvement réduit, impression, règles Lenis, transitions de page.
- `site v2/assets/signature.css` (nouveau, chargé par `head.html` après `base.css`) : trajectoire, cordes, pastilles, circuit, HUD et barre de secteurs, compteurs, damier, feux, cadres photo et voiles, grain, grille de télémétrie, états `html.js-anim`.
- Feuilles de page : celles qui existent (`page-accueil.css`, `page-liens.css`, `page-guide.css`, `page-extrait.css`, `page-demande.css`, `page-marques.css`, `page-merci.css`, `page-legal.css`), réécrites, plus `page-404.css` (nouvelle, courte, partagée avec la page retirée). Chaque fichier sous 800 lignes.
- `site v2/assets/interface.js` (nouveau, toutes les pages, sans dépendance) : classe `.nav-pleine`, repli de la barre de secteurs, relevés en coin, compteurs, feux de /liens. Aucune fonction de suivi.
- `site v2/assets/mouvement.js` (nouveau, pages à mouvement) : Lenis, trajectoire, révélations, remplissage, relief, entrée du premier écran, magnétisme, scènes de page (`data-scene="offres"`, `"sommaire"`, `"croyances"`, `"trois-temps"`, `"trace-photo"`, `"hors-piste"`). Fonctions de moins de 50 lignes ; nettoyage par `gsap.matchMedia()` (une condition pour ordinateur, une pour téléphone).
- `site v2/assets/site.js` : le suivi, les UTM et les portes ne bougent pas. Seules retouches : focus piégé dans le menu, seuil du menu à 1100 px.
- `site v2/_partials/` : `head.html` (polices, favicon, `signature.css`, `interface.js`), `mouvement.html` (nouveau), `nav.html` (symbole, SVG du tracé du menu, conteneur `.secteurs`), `footer.html` (damier d'arrivée, symbole), `nav-merci.html`, `footer-merci.html`, `hud.html` (nouveau : les deux relevés en coin, inclus par les pages concernées).

---

## 5. Direction page par page

Pour chaque page : la composition écran par écran (ordinateur 1440 x 900 et téléphone 390 x 844), les photos, les mouvements. L'ordre des sections du HTML ne change pas.

### 5.1 Accueil (`/`)

**Écran 1 : l'affiche** (`section.hero`). Maquettes : `accueil-b-html-1440-ecran1.jpg`, `accueil-b-html-1920-ecran1.jpg`, `accueil-html-390-ecran1.jpg`.
- Ordinateur (900 px et plus) : section de `100svh` (640 à 1100 px). Photo `piste-25-file` (960, 1600, 2400) en plein cadre, `object-position: 42% 60%`, voiles haut et bas (2.4), grain. Le kart file au milieu de l'écran, de gauche à droite.
  - En haut à gauche, sous la navigation (`padding-top: calc(var(--nav-h) + clamp(20px, 4svh, 48px))`) : le `h1`. Les deux premiers `.hero-ligne` en amorce : Hubot `clamp(1.375rem, 0.6rem + min(1.8vw, 3.4svh), 2.375rem)`, interligne 1,02, approche 0,01em. Le troisième, la chute « Eux savent lesquelles. » : Hubot `clamp(3.25rem, min(7.4vw, 12.5svh), 8.5rem)`, interligne 0,84, sur une ligne. La plaque (`.plaque-titre`) perd son fond noir et sa marge négative : plus de plaque.
  - En bas, une rangée sur la grille de 12 : le chapô à gauche (colonnes 1 à 6, `--t-chapo`, 42 caractères au plus), les actions à droite (colonnes 8 à 12) : bouton principal « Voir le guide » avec son prix (`data-aimant`) et, à côté, le lien du diagnostic en Mona `--t-petit` souligné.
  - Sous la rangée : la ligne de départ (`.depart` : damier 48 x 12 px puis trait rouge jusqu'au bord droit du contenu), avec `S1` en Martian Mono `--t-micro` au-dessus du damier. La trajectoire commence au bout de ce trait.
- Téléphone : photo `piste-25-file-portrait` (640, 1280) dans une bande de `56svh` (320 à 520 px), `object-position: 50% 50%`, voile haut léger et `--voile-fondu` en bas. Le bloc de texte remonte de 118 px sur la photo : amorce en deux lignes, chute sur deux lignes, chapô (17 px), bouton, lien. Le bouton est visible sans défiler à 390 x 844 et à 375 x 667.
- Préchargement : deux `<link rel="preload" as="image">`, l'un `media="(max-width: 899px)"` sur le portrait, l'autre `media="(min-width: 900px)"` sur le 16:9.
- Texte alternatif de la photo : celui de `piste-25-file` (2.5).
- Mouvement : entrée (4.5) ; au défilement, l'écran de cinéma s'éloigne (4.8). HUD caché pendant cet écran.

**Écran 2 : la bande de chronométrage** (`section.faits`).
- Pleine largeur, `--fond-0`, filet haut `--filet`. Quatre cellules séparées par des filets verticaux (deux sur deux sous 900 px).
- `.preuve-chiffre` en Martian Mono 400 `clamp(1.25rem, 1rem + 0.9vw, 1.75rem)`, craie, `data-compteur` ; `.preuve-detail` en Mona `--t-petit`, `--texte-2`. Les textes restent ceux de la config, entiers.
- Mouvement : compteurs à l'apparition.

**Écran 3 : trois plans** (`section.offres`, `data-scene="offres"`). Titre `data-virage="g"`.
- Ordinateur (1100 px et plus) : chaque `article.registre-ligne` fait au moins `92svh`. Le visuel (`.registre-objet`) occupe les colonnes 1 à 5 et reste collé (`position: sticky; top: calc(var(--nav-h) + 32px); height: min(72svh, 640px)`) pendant que le texte de son offre défile à droite (colonnes 7 à 12, centré verticalement sur le visuel). Quand l'offre suivante arrive, son visuel monte et prend la place : trois plans successifs, sans épinglage.
  - Visuels : offre guide : la couverture entière `guide/couverture-640` et `-1280` (640 x 906, remplace `couverture-registre`), posée en objet au centre d'un panneau `--fond-1` 4:5, texte alternatif « Couverture du guide {{guide.titre}}, par {{marque.auteur}} » ; offre analyse : `cockpit-volant` (4:5), à la place de `marques-cockpit-logos`, texte alternatif « {{marque.auteur}} installé dans son kart, casque et visière iridescente, les mains sur le volant » ; offre consulting : `piste-795-public-portrait` (4:5), texte alternatif actuel.
  - Texte : `h3` en Hubot `--t-titre-3` ; paragraphe en Mona `--t-texte` craie ; faits (`.registre-faits`) en lignes de données Martian Mono `--t-donnee`, `--texte-2`, une par ligne, séparées par `--filet` ; bouton fantôme avec prix ; sous-ligne `--t-petit`.
- Téléphone et tablette : chaque offre empile son visuel (4:5, largeur pleine moins les marges, couverture à 64 % de largeur centrée sur son panneau) puis son texte.
- Survol de l'offre (ordinateur) : l'image du visuel grossit à 1,03 en 600 ms.
- Mouvement : titre derrière masque ; volet et relief des visuels (4.8) ; les faits apparaissent en `.reveal`.

**Écran 4 : messages reçus** (`section.messages-recus`). Titre `data-virage="d"`. Composant 3.10.

**Écran 5 : qui je suis** (`section.qui`). Titre `data-virage="g"`.
- Ordinateur : photo `clement-drapeau` (4:5, 640 et 1280, texte alternatif actuel) en colonnes 1 à 5, collée au bord gauche de l'écran (marge négative jusqu'au bord), sur toute la hauteur de la section. Texte en colonnes 7 à 12 : `h2`, les lignes `.qui-lignes` en Mona `--t-chapo` en remplissage mot à mot (4.7), puis les deux liens réseaux en liens texte.
- Téléphone : photo 4:5 pleine largeur, puis le texte.
- Mouvement : volet et relief de la photo ; remplissage.

**Écran 6 : gratuit** (`section.gratuit`). Titre `data-virage="d"`.
- Bande `--fond-1` avec grille de télémétrie, filets haut et bas.
- Colonnes 1 à 5 : le libellé « Gratuit » (le seul libellé de la page), `h2`, promesse en `--t-chapo`, texte, bouton fantôme.
- Colonnes 7 à 12 : la carte du circuit (3.3), décorative (`aria-hidden="true"` sur ce `svg`, la liste suffit). Version 2 de l'extrait : le damier de départ et le virage 4 allumés (l'introduction est le départ, le chapitre 4 est le virage 4) ; version 3 : virages 3, 4 et 5. La version se lit sur `data-extrait-version` du conteneur (sélecteurs CSS). Sous la carte, les listes `.numeraux` existantes deviennent une légende : chaque `.numeral` sur une ligne, sa pastille (le chiffre) ou un mini damier (pour « Intro » : ajouter la classe `numeral-intro` à ce `li`, sans changer son texte), puis le nom du chapitre en Martian Mono `--t-donnee`.
- Téléphone : texte, bouton, carte, légende.
- Mouvement : à l'apparition, le tracé rouge de la carte se dessine du départ jusqu'au dernier virage offert (1200 ms), les virages offerts s'allument en suivant.

**Écran 7 : et ensuite** (`section.ensuite`). Titre `data-virage="g"`.
- Les quatre `.portes` en lignes de classement : 88 px de haut (64 sur téléphone), filets entre elles, libellé en Hubot `--t-titre-3`, flèche en Martian Mono à droite (poussée au bout de la ligne).
- Survol : un aplat `--rouge` balaie la ligne de gauche à droite sous le texte (`scaleX`, 380 ms, `--ease-sortie`), la flèche avance de 6 px. Appui (téléphone) : aplat rouge immédiat.

**Pied de page** : arrivée (3.14).

**HUD** : relevés en coin (ordinateur), barre de secteurs.

### 5.2 /liens

Page d'arrivée des bios. Pas de navigation, pas de pied de page complet (comme aujourd'hui). Aucune bibliothèque. Maquettes : `liens-html-390-ecran1.jpg` (390 x 844), `l664/liens-html-390-ecran1.jpg` (390 x 664, le navigateur d'Instagram), `liens-html-1440-ecran1.jpg` (à corriger selon ce qui suit : la photo passe en panneau de droite).

**Photo** : `piste-25-contre-jour` (4:5 ; 640, 1280, 1600). Clément de face dans son kart, casque et visière baissée, dans la lumière dorée. Texte alternatif : celui de 2.5. Aucun visage.

**Téléphone** (sous 900 px) :
- Bande photo pleine largeur de `40svh` (240 à 380 px), `object-position: 50% 72%` (le kart au centre de la bande), voile haut léger et `--voile-fondu` en bas. Les feux de départ (3.15) en haut à gauche de la bande, à la marge.
- Le bloc nom remonte de 64 px sur la photo : `h1` « Clément Daniel » en Hubot `clamp(2.75rem, 12.5vw, 4rem)` (une ligne à 390 px) ; « Clem Kart Racing » (`.liens-marque`) en Martian Mono `--t-micro`, capitales permises (c'est la marque), `--texte-2` ; la ligne de faits en Mona `--t-petit`, `--texte-2`, deux à trois lignes.
- **La grille de départ** (`nav.liens-boutons`) : les cinq `.lien-bio` en cases, en une colonne décalée comme une grille de kart : cases impaires collées à gauche (`margin-right: 9%`), cases paires collées à droite (`margin-left: 9%`), 10 px entre les cases.
  - Une case : marquage de grille peint, c'est-à-dire seulement un bord haut et un bord gauche de 1 px `--filet-champ` ; fond `rgba(6,6,7,.55)` ; `padding: 26px 14px 12px`. En haut à gauche, la position `P1` à `P5` écrite par CSS depuis l'attribut existant (`.lien-bio::before { content: "P" attr(data-position); }`), Martian Mono 600 `--t-micro`, `--texte-2`. Titre (`.lien-bio-titre`) en Hubot 19 à 21 px ; prix (`.lien-bio-prix`) en Martian Mono 16 px à droite du titre ; sous-ligne en Mona 13 px `--texte-2` ; flèche (`.lien-bio-fleche`) en Martian Mono à droite, centrée sur les deux lignes.
  - P1, le guide (`.lien-bio-principal`) : la pole position, la seule case pleine en `--rouge`, bords rouges, position, titre, prix et sous-ligne en craie pleine (5,4:1 ; une craie à 90 % tomberait sous 4,5:1).
  - Survol : bord haut et bord gauche passent en craie, fond craie à 4 %, la flèche avance de 4 px. Appui : `scale(.98)`. Focus : contour général.
  - À 390 x 664, P1, P2 et P3 sont visibles sans défiler.
- Dessous : la phrase de l'extrait (lien souligné craie), les trois garanties en Martian Mono `--t-micro` `--texte-2` sous un filet, les trois icônes réseaux (24 px dans 44 px), les liens légaux.

**Ordinateur** (900 px et plus) :
- Photo en panneau à droite : de 42 % de la largeur jusqu'au bord, toute la hauteur de l'écran, fixe pendant que la colonne défile (`position: fixed`), `object-position: 50% 62%`, bord gauche fondu dans le noir (`mask-image: linear-gradient(to right, transparent 0, #000 22%)`). Le kart occupe le centre du panneau, jamais sous la colonne.
- Colonne de contenu à gauche, 540 px au plus, `padding-top: 40px` : feux, `h1` en Hubot `--t-affiche` sur deux lignes (« Clément » / « Daniel »), marque, faits, grille en une colonne décalée de 44 px, puis la suite.
- Préchargement : l'image 1280 (ou 1600 sur grand écran) avec `imagesrcset` et `imagesizes="(min-width: 900px) 58vw, 100vw"`.

**Mouvement** : feux (3.15) ; photo `scale` 1,06 vers 1 en 1200 ms (transformation seulement) ; rien d'autre.

### 5.3 /guide

**Écran 1 : le virage** (`section.hero-guide`, `data-scene="trace-photo"`). Maquette : `guide-html-1440-ecran1.jpg`.
- Ordinateur : section de `100svh` (640 à 1100). Photo `piste-95-dos-virage` (960, 1600, 2400) en plein cadre, `object-position: 50% 50%`, voiles haut, gauche et bas, grain. Clément de dos dans le kart 95, au milieu d'un virage à gauche.
- **Le tracé sur la photo** : un `svg` décoratif (`aria-hidden="true"`) posé sur l'image avec le même cadrage (`viewBox="0 0 1600 900"`, `preserveAspectRatio="xMidYMid slice"`, ce qui reproduit `object-fit: cover`) :
  - trajectoire déjà parcourue, en pointillé craie à 55 % (trait 3, pointillé `2 10`) : `M1600 770 C1380 720 1140 640 985 566` ;
  - trajectoire à suivre, en rouge (trait 4, extrémités rondes) : `M845 462 C760 440 520 424 0 417` (elle sort de derrière le kart et file vers l'extérieur de la sortie du virage) ;
  - la corde, sur le bout du vibreur : disque rouge de rayon 9 cerclé de noir (4) en (872, 590), anneau craie de rayon 14.
  - Téléphone, sur `piste-95-dos-virage-portrait` (`viewBox="0 0 1280 1600"`) : parcourue `M1636 1360 C1306 1285 946 1165 714 1054` ; à suivre `M504 898 C376 865 16 841 -764 831` ; corde en (544, 1090).
  - Le tracé est une illustration : Clément le valide (annexe 7.3) avant la mise en ligne. S'il le refuse, on retire le `svg`, rien d'autre ne change.
- Contenu en bas à gauche (colonnes 1 à 6) : libellé mono (`.hero-surtitre`) ; `h1` en Hubot `--t-titre-1` qui reproduit la couverture : « Comprendre comment rouler » en craie et « plus vite » en rouge. Pour cela, envelopper « plus vite » dans `<span class="titre-rouge">` à l'intérieur de `.titre-ligne`, sans toucher au texte. Puis le chapô (`--t-chapo`), le résumé en ligne de données, les actions (bouton principal avec prix et `data-aimant`, garantie, CGV, lien « Feuilleter quelques pages »), la ligne des lecteurs en Martian Mono.
- Colonnes 9 à 12, en bas : la couverture `guide/couverture-640` et `-1280` en objet (330 px de large, ombre, contour), qui déborde de 48 px sur la section suivante.
- Téléphone : bande photo de `52svh` avec le tracé portrait ; texte qui remonte de 96 px sur la bande ; bouton visible sans défiler à 390 x 844 ; la couverture vient après les actions, à 64 % de largeur, centrée.
- Départ de la trajectoire : en bas de l'écran, sous les actions.
- Mouvement : entrée (4.5) ; au défilement, la couverture monte plus vite (4.8).

**Feuilleter** (`#feuilleter`). Titre `data-virage="g"`.
- Colonnes 1 à 7 : l'introduction en colonne de lecture (Mona `--t-texte`, interligne 1,7, 62 caractères), `h3` en Hubot `--t-titre-4`. Colonnes 9 à 12 : les quatre pages du PDF en grille 2 x 2, collée sous la navigation pendant la lecture ; survol : la page monte de 4 px et son contour passe à `--filet-fort`. Le bouton fantôme et ses sous-lignes en dessous.
- Téléphone : les quatre pages en grille 2 x 2 pleine largeur, au-dessus du texte ; un appui ouvre la fenêtre des pages (3.17). Pas de bande horizontale ici : la page en a déjà une (les citations).

**Pour qui** (`section.pourqui`). Titre caché (inchangé).
- Deux colonnes séparées par un filet vertical ; « Prends-le si » précédé de la coche craie, « Passe ton chemin si » de la croix rouge ; `h3` en Hubot `--t-titre-4`, textes en Mona.

**Le sommaire** (`section.sommaire-section`, `data-scene="sommaire"`). Titre `data-virage="d"`. La scène signature de la page.
- Ordinateur : colonnes 1 à 5, la carte du circuit (3.3, 32 px par pastille) collée sous la navigation (`top: calc(var(--nav-h) + 48px)`) sur une grille de télémétrie ; colonnes 7 à 12, les cinq parties et leurs treize chapitres.
- Chaque chapitre (`.sommaire-chapitre`) : sa pastille numérotée à la place du chrono (le `span.chrono-bloc` existant devient une pastille : fond rouge, chiffre craie centré, 32 px) ; titre en Hubot `--t-titre-4` ; filet de conduite pointillé et numéro de page en Martian Mono `--t-donnee` ; ligne en Mona `--t-petit` `--texte-2` ; la mention « Dans l'extrait gratuit » en étiquette Martian Mono `--t-micro` dans un cadre de 1 px `--filet-champ`. Titres de partie (`.libelle`) en Martian Mono.
- Lecture pilotée : quand le milieu d'un chapitre passe le milieu de l'écran, son virage devient actif sur la carte. Le tracé rouge se dessine du départ jusqu'à ce virage (longueurs de 3.3, transition 600 ms), les virages passés sont rouges, l'actif porte l'anneau craie et grossit à 1,15, les suivants sont éteints. Dans la liste, le chapitre actif a sa pastille rouge et un filet rouge de 2 px à sa gauche ; les chapitres pas encore lus gardent leur texte en craie et leur pastille éteinte. Après le treizième, le tracé rejoint l'arrivée.
- Téléphone : la carte, pleine largeur, reste collée en haut de la section (`top: var(--nav-h)`, hauteur `clamp(150px, 46vw, 220px)`, fond `--fond-0` fondu vers le bas) pendant que la liste défile dessous ; même lecture pilotée.
- Mouvement réduit : carte entièrement tracée, toutes les pastilles rouges.
- La phrase de fin (`.sommaire-fin`) en Mona `--t-chapo` craie.

**Trois croyances** (`section.croyances`, `data-scene="croyances"`). Titre `data-virage="g"`.
- Le schéma du virage existant garde son dessin et ses textes ; nouvelles couleurs : bords de piste craie à 35 %, hachures à 10 %, trajectoire apprise en pointillé craie à 55 %, trajectoire du grip en rouge 3 px, points rouges, textes en Martian Mono 13 px (titres de repère en craie, explications en `--texte-2`).
- À l'apparition : la trajectoire apprise se dessine (600 ms), puis celle du grip (900 ms, `expo.out`), puis les points (échelle 0,6 vers 1) et les textes (60 ms d'écart).
- Colonne de droite : chaque croyance a son libellé mono, sa phrase barrée en Hubot `--t-titre-4` craie à 70 % dont le trait (un `::after` rouge de 2 px à la place de `text-decoration`) se dessine de gauche à droite à l'apparition (450 ms), puis la réponse en Mona. Filets entre les croyances.

**Preuves** (`section.preuves`). Titre `data-virage="d"`. Composant 3.10, décalage des colonnes inversé par rapport à l'accueil (la première colonne est la plus basse).

**Qui l'a écrit** (`section.auteur`). Titre `data-virage="g"`.
- Photo `pilote-contre-jour` (4:5, 640 et 1280, texte alternatif de 2.5) en colonnes 1 à 4, à la place de `clement-trophee`. Texte en colonnes 6 à 11, ligne de faits en Martian Mono.
- Mouvement : volet et relief.

**Ce que tu reçois** (`#prix`, `section.bloc-prix`). Titre `data-virage="d"`.
- Bande `--fond-1`, grille de télémétrie, filets haut et bas.
- Colonnes 1 à 5 : le prix en Martian Mono 400 `--t-chiffre` craie (`data-compteur`), puis les trois lignes de données. Colonnes 7 à 12 : la liste (puces carrées de 6 px `--texte-3`), le bouton principal pleine largeur (`data-aimant`), ses sous-lignes, la garantie en Mona `--t-chapo`.

**Avant de te décider** (FAQ). Titre `data-virage="g"`. Composant 3.12, colonnes 1 à 8.

**Final** (`#final`). Titre `data-virage="d"`.
- Photo `piste-95-virage` (3:2 existante) en colonnes 1 à 5, collée au bord gauche ; colonnes 7 à 12 : le `h2` en Hubot `--t-titre-2` en remplissage mot à mot, le chapô, le bouton principal (`data-aimant`) et ses sous-lignes.

**Barre d'achat** (3.13) et **fenêtre des pages** (3.17).

### 5.4 /extrait (`extrait-guide.html`) et /tableur-reglages

Navigation de capture (3.6), pied de page commun.

**Écran 1 : le formulaire et la carte.**
- Ordinateur : colonnes 1 à 6 : libellé mono, `h1` en Hubot `--t-titre-1`, chapô, le formulaire (champ de 56 px, bouton principal pleine largeur, note mono) ; colonnes 8 à 12 : la carte du circuit (3.3) avec le damier et le virage 4 allumés (version 2) ou les virages 3 à 5 (version 3 : ajouter `data-extrait-version="{{extrait.version}}"` sur le conteneur de la carte). Sous la carte, la pile `.extrait-pile` devient une légende : « L'introduction complète » avec un mini damier, « Le freinage dégressif » avec la pastille 04 (le grand numéro `.numeral` devient la pastille).
- Téléphone : titre, formulaire (visible sans défiler), puis la carte.
- Départ de la trajectoire sous l'écran.
- Mouvement : titre derrière masque ; tracé de la carte (4.5).

**Ce que tu reçois.** Titre `data-virage="g"`. Deux blocs (un trait rouge de 32 x 2 px au-dessus de chacun, à la place du filet d'apex) ; la ligne du tableur avec les cinq onglets en étiquettes Martian Mono `--t-donnee` encadrées de 1 px `--filet-champ` ; la ligne honnête en Mona `--t-chapo`.

**Envoyé** (`#envoye`) : plaque `--fond-1`, coche craie.

**Le guide complet.** Titre `data-virage="d"`. Bande `--fond-1` avec grille de télémétrie : la page 1 du PDF en objet (colonnes 1 et 2, légèrement inclinée de -3 degrés, qui se redresse au survol), titre et chapô, bouton fantôme avec prix.

**/tableur-reglages.html** : même gabarit et même feuille (`page-extrait.css`) ; sa liste « Cinq onglets, dans cet ordre » en lignes numérotées par pastilles (c'est un ordre) ; pas de carte du circuit (pas de chapitre offert sur cette page) ; titres `data-virage` alternés à partir de « Cinq onglets ».

### 5.5 /consulting

**Écran 1 : la bande cinémascope** (`section.hero-bande`).
- Ordinateur : sous la navigation, la photo `piste-795-public` (960, 1600, 2400, existante) dans une bande au format cinéma 2,39:1 (`height: min(41.8vw, 68svh)`), `object-position: 50% 45%`, voile bas, grain. Le `h1` « Consulting en piste » (Hubot `--t-titre-1`) est à cheval sur le bas de la bande (`transform: translateY(50%)`) : moitié sur la photo, moitié sur le noir. La plaque perd son fond. Dessous, une rangée : le chapô (colonnes 1 à 7) et, à droite (colonnes 8 à 12), le bouton principal « Demander une date » (`data-aimant` après `href`) puis la ligne de prix en Martian Mono `--t-donnee`.
- Téléphone : `piste-795-public-portrait` (4:5) en bande pleine largeur, titre à cheval, chapô, bouton visible sans défiler.
- Mouvement : volet de la bande, titre derrière masque, actions (4.5).

**C'est pour toi ?** Titre `data-virage="g"`. Deux colonnes : « Oui, si » avec la coche, « Non, si » avec la croix ; listes à puces carrées.

**Comment se passe la journée** (`#journee`, `data-scene="trois-temps"`). Titre `data-virage="d"`.
- Les trois temps sont les trois secteurs de la journée. Ordinateur : trois colonnes séparées par des filets verticaux. En haut de chaque colonne, un segment de secteur pleine largeur de 3 px (fond `--gris-piste`) qui se remplit en rouge pendant que la section défile : le premier pendant le premier tiers de la section, puis le deuxième, puis le troisième (scrub). L'index existant (« 01 · Avant », etc.) en Martian Mono `--t-donnee` ; `h3` en Hubot `--t-titre-4` ; textes et listes en Mona.
- Téléphone : les trois temps empilés ; le segment devient un filet vertical de 3 px à gauche de chaque temps, qui se remplit de haut en bas.
- Mouvement réduit : segments pleins.

**Ce que ça change.** Titre `data-virage="g"`. Bande `--fond-1` : le `h2` en remplissage mot à mot (colonnes 1 à 6) puis les trois paragraphes ; photo `paddock-echange-pilote` (3:2) en colonnes 7 à 12, avec relief.

**Pourquoi moi.** Titre `data-virage="d"`. Photo `piste-95-epingle` (4:5, 640 et 1280, texte alternatif de 2.5) en colonnes 1 à 4, à la place de `consulting/clement-*` ; texte en colonnes 6 à 11 ; ligne de faits en Martian Mono.

**Le prix** (`#prix`). Titre `data-virage="g"`. Bande `--fond-1`, grille de télémétrie : « 150 € » en Martian Mono `--t-chiffre` (`data-compteur`) et l'unité en mono ; note en Mona ; à droite, « Ce qui est compris » et « Ce qui n'est pas compris » (`h3` en Hubot `--t-titre-4`), le bouton principal (`data-aimant`) et sa sous-ligne.

**Demander une date** (`#demande`). Titre `data-virage="d"`. Colonnes 1 à 6 : `h2`, chapô, les quatre étapes en pastilles numérotées (c'est un ordre), la ligne email. Colonnes 8 à 12 : le formulaire en panneau (3.11).

**Avant de demander** (FAQ). Titre `data-virage="g"`. Composant 3.12, puis le bouton fantôme de fin.

**Barre d'achat** (3.13).

### 5.6 /marques (vouvoiement, mouvement 5, densité 4)

Contraintes de test à garder en tête : une seule image sans `loading="lazy"` (celle du premier écran), au moins cinq images, au moins dix fichiers différents de `site v2/photos/` cités, aucun montant ni délai écrit en dur, aucun tutoiement dans le texte visible.

**Écran 1 : scindé** (`section.marques-hero`).
- Ordinateur : colonnes 1 à 6 sur le noir : `h1` « Mettez votre marque en piste. » en Hubot `--t-titre-1`, chapô en Mona `--t-chapo`, la ligne d'audience (`.chrono-ligne`) en Martian Mono `--t-donnee` avec compteurs sur « 912 570 » et « 4 322 ». Colonnes 7 à 12 jusqu'au bord droit de l'écran : la photo `piste-695-ciel` (960, 1600, 2400, existante, texte alternatif actuel du fichier), sur toute la hauteur de l'écran (au moins `80svh`), `object-position: 70% 55%`, bord gauche fondu dans le noir, grain. C'est la photo qu'une marque veut voir : le kart et ses logos.
- Téléphone : texte, puis la photo en bande 16:9 pleine largeur, puis les deux choix.
- Sous l'écran : la ligne de départ (damier et trait) remplace le filet rouge de `.marques-choix`.
- **Les deux choix** (`.marques-choix`) : composant 3.8, deux stands côte à côte ; le lien « Vous hésitez » en lien texte dessous.
- Mouvement : volet de la photo, titre derrière masque, compteurs (4.5).

**Des vidéos qui sont vues** (`section.marques-preuves`). Titre `data-virage="g"`.
- Photo `cockpit-dessus` (4:5, texte alternatif de 2.5) en colonnes 1 à 4, à la place de `clement-trophee`. Colonnes 6 à 12 sur une grille de télémétrie : `h2`, puis les deux `.preuve` : chiffre en Martian Mono `--t-chiffre` (`data-compteur`), texte en Mona ; la source en Martian Mono `--t-micro`.

**Parrainage de saison** (`#saison`). Titre `data-virage="d"`. Bande `--fond-1`.
- En-tête : libellé mono, `h2` (avec `span.chiffre-titre` sur l'année), chapô.
- Objectif : « 20 000 à 30 000 € » en Martian Mono `--t-chiffre` (`data-compteur`, deux nombres) et sa ligne mono ; à droite, le texte.
- Où va votre logo : `marques-combinaison-kart` (4:5) avec trois cordes posées sur la photo (`aria-hidden`, en pourcentages du cadre) : casque (55 %, 18 %), poitrine de la combinaison (50 %, 35 %), ponton du kart (40 %, 88 %). Elles s'allument l'une après l'autre quand la photo apparaît (anneau qui s'élargit une fois). Légende en Martian Mono `--t-donnee`. À droite, « Inclus dans toutes les formules ».
- **Les formules** : registre de quatre lignes (jamais quatre cartes). Chaque ligne : nom en Hubot `--t-titre-4`, « à partir de » en Martian Mono `--t-micro`, prix en Martian Mono `--t-titre-3` craie, « la saison » en mono ; pour qui en Mona 600 ; liste ; places en Martian Mono ; bouton fantôme « Choisir ». La formule mise en avant (`.formule-avant`) : filet rouge de 3 px sur toute la hauteur à gauche, fond `--fond-2`, et son étiquette (« Le meilleur rapport visibilité et prix ») en Martian Mono `--t-micro` encadrée de 1 px craie. Survol d'une ligne : fond `--fond-2`.
- Comment ça se passe : étapes en pastilles ; la note ; à droite la photo `piste-95-arriere` (3:2, à la place de `marques-cockpit-logos`, texte alternatif de 2.5, légende actuelle inchangée car elle décrit toujours des logos sur la combinaison et le ponton) ; la ligne pour le comptable en plaque `--fond-2`.
- Fin de bande : bouton principal (`data-aimant`) et lien texte.

**Collaboration réseaux** (`#reseaux`). Titre `data-virage="g"`.
- Photo `paddock-gants` (4:5) et « Ce que mes vidéos font » (chiffres en Martian Mono).
- Les six formats : liste de prix en lignes séparées par des filets ; nom en Hubot `--t-titre-4`, texte en Mona `--t-petit`, prix à droite en Martian Mono (« à partir de » en `--t-micro`, montant en `--t-chapo`).
- Comment ça se passe (pastilles) et mes engagements ; bouton principal et lien texte.

**Clément Daniel, pilote et créateur** (`section.marques-qui`). Titre `data-virage="d"`. Photo `pilote-contre-jour` (4:5) à la place de `clement-portrait` ; texte ; ligne en Martian Mono.

**Saison ou réseaux** (`section.marques-resume`). Titre `data-virage="g"`. Tableau de télémétrie : en-têtes de colonne en Hubot `--t-titre-4`, en-têtes de ligne en Mona 600, cellules en Mona, filets entre les lignes, prix en Martian Mono. Sous 900 px : chaque ligne devient un bloc lisible grâce aux `data-col` existants.

**Vos questions** (FAQ, trois groupes). Titre `data-virage="d"`. `h3.faq-groupe` en Hubot `--t-titre-4`.

**Parlons de votre projet** (`#contact`). Titre `data-virage="g"`. Colonnes 1 à 5 : `h2`, chapô, étapes en pastilles, email, mention ; colonnes 7 à 12 : le formulaire en panneau, avec les cases de projet (3.11).

**HUD** : relevés en coin (ordinateur).

### 5.7 Pages merci (`/merci-guide`, `/merci-guide-lecteur`, `/merci-onboard`, `merci.html`)

Navigation réduite, pied réduit, aucune bibliothèque, aucune trajectoire. Ce sont des pages d'arrivée : le damier en est l'image.
- **Haut de page** : le damier d'arrivée sur toute la largeur, juste sous la navigation (apparition en marches, 3.16). Puis le libellé « Paiement reçu » en Martian Mono `--t-donnee`, le `h1` en Hubot `--t-titre-1`, le chapô en Mona `--t-chapo`.
- **/merci-onboard** : le « 72 h » (`.chrono-grand-hero`, décoratif) en Martian Mono 400 `clamp(6rem, 3rem + 13vw, 13.75rem)` en colonnes 1 à 5 (`data-compteur`) avec sa ligne mono dessous ; le `h1` « Reçu. » et le chapô en colonnes 7 à 12.
- **Bon de livraison** (`.bon-livraison`) : trois cellules séparées par des filets ; libellé en Martian Mono `--t-micro` `--texte-2`, valeur en Martian Mono `--t-chapo` craie.
- Le filet de départ (`.filet-depart`) devient un trait rouge de 2 px qui se termine sur un mini damier à droite.
- **Étapes** (`.merci-etapes`) : pastilles numérotées (c'est un ordre), titre en Mona 600 `--t-chapo`, détail en Mona `--texte-2`.
- **Plaques** (`.plaque-bloc`) : fond `--fond-1`, bord `--filet`, trait rouge de 32 x 2 px en haut à gauche.
- **Lecture** (`.merci-lecture`) : colonne de 62 caractères ; les filets d'apex deviennent des filets de 48 px.
- Mouvement : damier, titre, compteur, `.reveal` sur les blocs.

### 5.8 Pages légales (`/mentions-legales`, `/cgv`, `/confidentialite`) et `/retractation/`

Style seulement : aucun mot ne change (test `tests/livraison/legal.test.js` et suivants). Pas de trajectoire, barre de secteurs active, relevés en coin.
- **En-tête** (`.legal-hero`) : libellé en Martian Mono, `h1` en Hubot `--t-titre-1`, date en Martian Mono `--t-donnee` `--texte-2`.
- **Sommaire** (`.legal-nav`) : ordinateur, colonnes 1 à 3, collé sous la navigation ; titre « Sommaire » en Martian Mono `--t-micro` ; liens en Mona `--t-petit` `--texte-2`, l'entrée de la section lue (repérée par le script actuel) en craie avec une corde de 6 px devant. Téléphone : liste sur deux colonnes sous le titre, non collée.
- **Corps** (`.legal-corps`) : colonnes 4 à 11, Mona `--t-texte`, interligne 1,7, 68 caractères ; `h2` en Hubot `--t-titre-4` ; leur numéro (`.legal-num`) en Martian Mono craie ; `h3` en Mona 600 `--t-chapo` ; listes de définitions sur deux colonnes, termes en Martian Mono `--t-donnee` ; tableaux à filets ; liens soulignés.
- **Formulaire de rétractation** : composant 3.11 ; le bouton « Renoncer au contrat ici » et « Confirmer la rétractation » en bouton principal ; erreurs et confirmation selon 3.11.
- Impression : règles actuelles conservées ; masquer la trajectoire, le HUD, le grain et le damier.

### 5.9 Page 404 (nouvelle) et page retirée

**`site v2/404.html`** (Netlify la sert d'office pour toute adresse inconnue). `{{partial:head}}`, `{{partial:mouvement}}`, navigation et pied communs, `<meta name="robots" content="noindex">`, titre de page à valider.
- Plein cadre : `piste-95-dos-virage` (et son portrait sur téléphone), voiles, grain. Le tracé rouge part du kart, puis quitte la piste : il sort par le bord extérieur du virage et finit dans l'herbe sur un anneau de corde vide (ordinateur, `viewBox="0 0 1600 900"` : `M845 462 C760 440 640 380 560 300 S 460 170 420 150`, anneau en (420, 150)). Le tracé se dessine une fois au chargement (1200 ms).
- Texte (en bas à gauche), **à valider par Clément** : `h1` « Sortie de piste. » ; paragraphe « Cette page n’existe pas, ou plus. » ; actions : bouton principal « Retour à l’accueil » et lien texte « Voir le guide » (les deux libellés existent déjà sur la page retirée).
- Mouvement réduit : tracé complet, immobile.

**`race-engineer-ai.html`** (page retirée) : même gabarit que la 404 sans photo ni tracé (typographique), texte inchangé.

### 5.10 /onboard/ (site 2, `site-catalogue/onboard/index.html`)

Page autonome : on garde son CSS en ligne et ses scripts, on change les valeurs. Aucune bibliothèque, pas de Lenis, pas de trajectoire (la page est un parcours en étapes, sa barre de progression joue ce rôle).
- **Variables** : reprendre les valeurs de 2.1 dans son `:root` (noms actuels : `--red`, `--black`, `--b2`... sont remplacés par les valeurs V5 : `--red: #C40C2C`, `--red-btn: #C40C2C`, `--red-dark: #A80A26`, `--black: #060607`, `--b2: #0E0E10`, `--b3: #161619`, `--b4: #1C1C1F`, `--w: #F2F0EB`, `--wd: rgba(242,240,235,.68)`, `--wq: rgba(242,240,235,.56)`, `--ok: #F2F0EB`). Polices : la feuille Google Fonts de 2.2 ; `--fd` Hubot Sans, `--fc` et `--fb` Mona Sans, et une variable mono en Martian Mono pour les chiffres, compteurs et libellés.
- **Favicon** : celui de 2.6.
- **Écran 0** (accueil du diagnostic) : plein écran (`100svh`) ; photo `piste-25-file-portrait` (téléphone) ou `piste-25-file` (ordinateur), copiées dans `site-catalogue/photos/` (640 et 1280 en portrait, 1600 en 16:9, WebP et JPEG), voile général à 0,55 et voile bas à 0,96. En bas : le libellé (`.kick`) en Martian Mono, le `h1` en Hubot `--t-titre-1` (le `span.r` reste craie), l'indication en Mona, le bouton « Commencer le diagnostic » en principal pleine largeur sur téléphone, « Par Clément Daniel » en Martian Mono. Préchargement de la photo.
- **Étapes 1 à 7** : fond noir sans photo. Barre du haut : nom, puis une barre de sept segments (un par question, 3 px, 3 px d'écart : faits en craie à 60 %, en cours en rouge, à venir en `--gris-piste`) à la place de la barre continue, puis le compteur « 1 / 7 » en Martian Mono. Question en Hubot `--t-titre-3` ; indication en Mona `--texte-2` ; réponses en lignes de 56 px minimum, bord 1 px `--filet-champ` ; réponse choisie : bord craie, filet rouge de 3 px à gauche, point rouge dans le rond. Encadré « Ce que ça dit » : fond `--b2`, filet rouge à gauche, libellé en Martian Mono. « Retour » en lien texte mono, « Continuer » en bouton principal.
- **Passage d'une étape à l'autre** : l'étape entrante glisse de 16 px depuis la droite en apparaissant (260 ms, `--ease-sortie`), l'animation actuelle `in` est remplacée par celle-ci. Mouvement réduit : immédiat.
- **Lecture des réponses** : les quatre lignes se cochent en craie (la coche se dessine en 300 ms) ; barre pleine en rouge.
- **Diagnostic et offre** (`#diag`) : l'étiquette « Ton diagnostic » en Martian Mono encadrée ; le titre en Hubot `--t-titre-2` ; les trois cartes `.dcard` deviennent trois lignes de données séparées par des filets (libellé mono, texte en Mona) ; le bouton principal pleine largeur.
- **Sections** : « Trois choses, sous 72 heures » : les trois `.card` deviennent un registre de trois lignes (index mono, titre en Hubot, texte), plus de cartes identiques ; « Je ne note pas ton niveau » en bande `--b2` ; « Trois étapes, rien à installer » : pastilles numérotées, en trois colonnes sur ordinateur ; « Qui regarde ta vidéo » : photo `pilote-contre-jour` (copiée dans `site-catalogue/photos/`, 640, WebP et JPEG, texte alternatif de 2.5) à la place de `/clement.jpg` ; « Le prix » : bloc prix en bande avec « 29,99 » en Martian Mono `--t-chiffre`, le symbole en exposant, la liste, l'option en encadré 1 px `--filet-champ` avec l'étiquette « Option au moment du paiement » en mono, la garantie, le bouton principal ; FAQ selon 3.12 ; final : `h2` en Hubot `--t-titre-2` ; pied ; barre collante selon 3.13 (bord haut rouge plein de 2 px).
- `site-catalogue/index.html` (page de repli) : `background: #060607; color: #F2F0EB`, police Mona Sans si chargée, sinon système.

### 5.11 Tableau de bord privé (`site v2/dashboard.html`)

Polices seulement (2.2). Aucun autre changement.

---

## 6. Checklist anti « site banal » (les relecteurs cochent chaque point, page par page, à 390 et 1440 px)

1. **La capture se reconnaît** : sur le premier écran de chaque page à trajectoire, on voit au moins trois des cinq signatures : photo plein cadre fondue dans le noir, titre Hubot condensé géant, trait rouge (trajectoire, tracé ou départ à damier), pastille ou corde rouge, relevé en Martian Mono.
2. **Un seul rouge, bien employé** : aucune autre couleur vive ; aucun texte rouge sous 24 px ; un seul bouton rouge visible par écran (barre collante comprise).
3. **Typographie tenue** : trois familles seulement ; titres et boutons en Hubot capitales ; aucun nombre contenant un zéro en Hubot ; tous les chiffres de données en Martian Mono ; aucune capitale espacée en petit corps ; aucune police de secours visible après chargement.
4. **Aucun visage en gros plan** et aucune photo de la liste de retrait (2.5) citée dans les sources des deux sites, image de partage du site 2 comprise.
5. **La trajectoire est juste** : continue du départ à l'arrivée, ne mord sur aucun texte à 360, 390, 768, 1024, 1440 et 1920 px, cordes alignées sur les titres, dessinée en entier avec mouvement réduit.
6. **Pas de gabarit** : pas de rangée de trois cartes identiques, pas de carte dans une carte, pas de carrousel automatique, à flèches ou à points (seule bande horizontale admise : les citations à glisser du doigt sur téléphone, 3.10), pas de libellé au-dessus de chaque titre (un sur trois sections au plus), pas de point de couleur décoratif, pas de flèche ajoutée aux libellés, pas de tiret cadratin ni demi-cadratin, pas d'emoji.
7. **Le mouvement a une raison** : une seule entrée orchestrée par page (textes et boutons en place en 1,2 s, décor et compteurs en 1,6 s) ; une seule phrase remplie mot à mot ; aucun épinglage ; aucun élément cliquable invisible ; aucune animation de propriété de mise en page.
8. **Mouvement réduit** : avec `prefers-reduced-motion: reduce`, tout est visible au premier affichage, rien ne bouge en dehors des changements d'état au survol.
9. **Accessibilité** : contrastes de 2.1 respectés (y compris texte sur photo, voiles mesurés), focus visible partout, menu au clavier (focus piégé, Échap), zones touchables de 44 px, textes alternatifs à jour, `aria-hidden` sur tout le décor (trajectoire, HUD, feux, cartes décoratives, cordes de photo).
10. **Performance** : LCP sous 2,5 s sur téléphone, CLS à 0, aucune bibliothèque sur /liens, les pages merci, les pages légales et le site 2, Lighthouse mobile 90 et plus en performance et 100 en accessibilité sur l'accueil, /liens et /guide.
11. **Le site marche sans script** : avec JavaScript coupé puis avec les deux CDN bloqués, chaque page s'affiche entière, chaque lien et chaque formulaire fonctionne.
12. **Rien de fonctionnel n'a bougé** : textes identiques (à part les exceptions du préambule), mêmes `data-*`, mêmes noms de champs, `npm test` et `node --test tests/livraison/` verts après `node scripts/build.js` (et `--site2`), `tests/run-fonts.js` mis à jour selon 2.2.

---

## 7. Annexes

### 7.1 Points des tests à ne pas casser

- `tests/run-demande.js` : sur /consulting, au moins un `<a class="bouton bouton-principal" href="#demande"...>Demander une date</a>` avec l'attribut `class` exactement ainsi et en premier ; `<h1>{{journee.titre}}</h1>` tel quel ; aucun prix ni délai écrit en dur. Sur /marques : la feuille `page-marques.css`, les ancres `#saison`, `#reseaux`, `#contact`, une seule image sans `loading="lazy"`, au moins cinq images avec `width`, `height` et un `alt` de dix caractères au moins, au moins dix fichiers de `site v2/photos/` cités et existants, aucune photo `-nb`, aucun montant en euros ni délai en heures dans le texte visible, aucun tutoiement.
- `tests/run-fonts.js` : à mettre à jour (2.2).
- `tests/run-typographie.js` : le build applique la typographie française aux pages ; les textes écrits par `interface.js` (chrono, noms de section) ne sont pas concernés, mais un compteur doit remettre le texte d'origine avec ses espaces insécables.
- `tests/livraison/` : pages légales et rétractation mot pour mot, aucun tiret cadratin ni demi-cadratin dans `page-legal.css`.
- `tests/run-prix.js` : aucun prix en dur ailleurs que dans la config (ni dans `mouvement.js`, ni dans `interface.js`).
- Le banc `scratchpad/verif-v4.mjs` : aucun débordement horizontal, un seul `h1`, toutes les images avec `width` et `height`, aucun lien mort, aucune balise `{{...}}` restante, zéro tiret, aucune mention de Gumroad ni de Race Engineer AI.

### 7.2 Ordre de travail conseillé

1. **Socle** : photos (exports, retraits, `PHOTOS.md`), `tokens.css`, `base.css`, `signature.css`, partials, `interface.js`, `mouvement.js` (trajectoire, révélations, relief, Lenis, magnétisme, compteurs), `tests/run-fonts.js`, `dashboard.html` (polices).
2. **Accueil et /liens** (les deux pages que Clément montrera d'abord).
3. **/guide, /extrait, /tableur-reglages.**
4. **/consulting, /marques.**
5. **Pages merci, légales, rétractation, 404, page retirée.**
6. **Site 2 (/onboard/).**
7. **Recette** : la checklist du chapitre 6, captures à 390 et 1440 px avec et sans mouvement réduit, script coupé, CDN bloqués, Lighthouse, `npm test`, `node --test tests/livraison/`.

### 7.3 À faire valider par Clément avant la mise en ligne

1. Le tracé rouge dessiné sur la photo du virage (/guide) : est-ce une trajectoire crédible dans ce virage de Laval ? Sinon on le retire, rien d'autre ne change.
2. Le kart numéro 25 des photos `piste-25-file` et `piste-25-contre-jour` est bien le sien (même autocollant de châssis « 1817 » que le kart 95).
3. Les droits et les crédits des nouvelles photos (préfixes `854_`, `_ISA`, `lcp_`, `DSC_`).
4. Le texte de la page 404 (« Sortie de piste. » et « Cette page n’existe pas, ou plus. »).
5. `marques-cockpit-logos` n'est plus utilisée parce qu'on y voit ses yeux sous la visière : il peut la réautoriser s'il le souhaite.
