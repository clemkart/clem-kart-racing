# COMPOSITION : la mise en page des pages du lot 1

Version du 24/09/2026. Direction de création, à partir des trois propositions de composition et de la section 9 du plan V4.
Pages couvertes : /, /guide, /liens, /extrait, /merci-guide, /merci-guide-lecteur, /merci-onboard, /journee-piste, /marques, /mentions-legales.
Les textes sont dans design/COPY-VENTE.md et design/COPY-AUTRES.md. Ce fichier ne dit que la forme : où va chaque bloc, sur combien de colonnes, avec ou sans photo, et ce qui bouge.
Aucun prix, aucun lien Stripe, aucune adresse email n'est écrit ici : tout passe par les balises de config/offres.json.

---

## 0. Checklist anti IA slop, à cocher sur chaque page avant publication

1. Une seule couleur d'accent, le rouge. Aucun or, aucun vert (sauf l'état « envoyé » d'un formulaire), aucun violet, aucun dégradé, aucun halo, aucune ombre colorée. Le rouge ne colore jamais un texte de moins de 24 px : le tiret du chrono est rouge, le chiffre reste blanc cassé.
2. Zéro photo de banque, zéro image générée. Chaque image est Clément, son kart ou une vraie page du PDF. Les photos sont réétalonnées au build (désaturation forte), jamais filtrées en CSS.
3. Le hero tient dans l'écran : titre trois lignes maximum sur ordinateur, quatre sur téléphone, texte à gauche, un seul bouton principal visible sans défiler, la photo ou l'objet à droite.
4. Pas de trois cartes identiques, pas de carte dans une carte, pas de bandeau de statistiques, pas d'étapes 1-2-3 avec icônes. Les groupes se font par l'espace et par des filets 1 px. Jamais deux mises en page de la même famille à la suite.
5. Libellé en capitales espacées sur une section sur trois maximum, espacement sous .12em. On compte mécaniquement par page avant de publier.
6. Zéro emoji, zéro tiret cadratin ou demi-cadratin (texte, code, commentaires), zéro « Transformez », « Boostez », zéro compteur, zéro étoile, zéro témoignage inventé.
7. Une seule animation d'entrée par page (le hero), apparitions au défilement une seule fois, aucune boucle, aucun parallaxe, aucun curseur, aucun texte défilant, tout coupé par prefers-reduced-motion, transform et opacity seulement.
8. Chaque chiffre est vrai, daté et porte « environ » s'il est approximatif ; il vient de la config et s'affiche en chrono (JetBrains Mono tabulaire).
9. Lighthouse mobile 90 ou plus, cinq fichiers woff2 auto-hébergés, aucune requête Google Fonts, aucune bibliothèque, width et height sur chaque image, preload de l'image du hero, page de liens sous 100 Ko hors photo.
10. Prix, liens Stripe, garantie, délais, email et chiffre de lecteurs viennent de config/offres.json par balises ; la recherche des prix dans les sources publiées ne renvoie que ce fichier ; les boutons d'achat pointent vers /aller/guide, /aller/onboard, /aller/guide-lecteur, /aller/onboard-lecteur.

---

## 1. Les trois propositions, notées

Barème sur 10, cinq critères : conformité à la section 9 du plan, lisibilité, conversion, effet « site à 100 000 € », faisabilité en HTML et CSS purs.

| Proposition | Section 9 | Lisibilité | Conversion | Effet 100 000 € | Faisabilité | Moyenne |
|---|---|---|---|---|---|---|
| 1. La grille de départ (plaque, filet d'apex, chrono) | 8,5 | 7,5 | 8 | 9 | 8 | 8,2 |
| 2. La feuille de télémétrie (ligne de données, un seul rouge par écran) | 8,5 | 9 | 8,5 | 7,5 | 8,5 | 8,4 |
| 3. Le tour de circuit (chrono rouge géant, filet de départ) | 7,5 | 8,5 | 7,5 | 7 | 9 | 7,9 |

Ce que chaque note veut dire.

Proposition 1. La plus reconnaissable : la plaque de numéro qui mord sur la photo, le filet qui s'arrête au point de corde, le chrono avec son tiret rouge. Trois signatures qui se voient en une capture d'écran, sans une seule décoration. Elle perd des points en lisibilité : l'escalier de citations sur l'accueil et la lettrine rouge ajoutent du dessin là où le texte devait respirer ; et le rythme à quatre familles strictes est parfois forcé (le registre à deux lignes pour deux offres, c'est juste).

Proposition 2. La plus disciplinée : « un seul bouton rouge visible par écran », la barre collante qui se cache devant tout bloc rouge, le sommaire avec numéros de page réels, le feuilletage dans un dialog natif, la page légale en liste de définitions. Elle perd des points en effet : la « ligne de données » à cellules ressemble de près à un bandeau de statistiques (point 4 de la checklist), et sans la plaque ni le filet d'apex le site reste un beau gabarit sombre, pas un site de pilote.

Proposition 3. La plus simple à coder et la plus honnête sur les pages merci (prix public barré au-dessus du prix lecteur, « 72 h » seul sur son écran). Elle perd des points en conformité : les numéros de chapitre en mono rouge petit (contraste 3,9:1), le prix en mono rouge quand la base met le prix en Bebas blanc cassé, et surtout un hero d'accueil qui coupe le titre validé par Clément à une phrase. Le filet de départ rouge est une bonne idée, mais seul il ne fait pas une identité.

**Choix : la proposition 1 sert de base.** C'est la seule qui donne au site une forme qu'on reconnaît de loin, et c'est ce qu'un site à 100 000 € a que les gabarits n'ont pas. On lui greffe :

De la proposition 2 :
- la règle « un seul bouton rouge visible par écran » (la barre collante se cache devant le bloc prix et le bouton final ; le bouton de la navigation passe en contour) ;
- la ligne de registre des offres avec la vraie couverture d'un côté et le chiffre « 72 h » de l'autre : image contre chiffre, rouge contre contour, jamais deux rangées jumelles ;
- le sommaire des 13 chapitres avec le numéro de page réel en mono à droite et un filet pointillé de conduite ;
- le feuilletage en dialog natif (repli sans JavaScript : le lien ouvre l'image) ;
- le « bon de livraison » des pages merci, version réduite à trois cellules, jamais plus, pour rester une fiche et pas un bandeau ;
- la page légale en liste de définitions à deux colonnes et sa feuille d'impression ;
- l'intro collante de /marques pendant qu'on remplit le formulaire.

De la proposition 3 :
- le filet de départ : un seul filet rouge 2 px, pleine largeur du conteneur, en sortie de hero, une fois par page, repris sur le bord haut de la barre collante ;
- l'état « envoyé » rendu à la même hauteur que le formulaire (zéro saut de mise en page) ;
- le prix public barré au-dessus du prix lecteur sur /merci-guide, les deux en chrono, depuis la config ;
- le « 72 h » seul sur son écran pour /merci-onboard ;
- les quatre icônes en fichiers SVG statiques monochromes.

Ce qu'on retire de la proposition 1 : l'escalier de citations (remplacé par une colonne de lecture avec filets, plus lisible), la lettrine rouge de l'introduction (un « seul rouge » en plus qui ne vend rien), et la règle des quatre familles à alternance stricte (on garde l'esprit : jamais deux mises en page de la même famille à la suite, sans compter mécaniquement les familles).

---

## 2. Le concept en cinq lignes

1. Chaque page se lit comme une grille avant le départ : une colonne qui parle à gauche (colonnes 1 à 5), une colonne qui montre à droite (colonnes 7 à 12), et un seul objet qui traverse la frontière entre les deux.
2. Trois signatures, les mêmes partout : la plaque (un aplat #070707 qui porte la dernière ligne d'un titre et mord sur la photo, comme la plaque de numéro du kart), le filet d'apex (un filet 1 px qui part de la marge gauche et s'arrête à la fin de la colonne 5, comme un repère de freinage), le chrono (tout chiffre en JetBrains Mono tabulaire, précédé d'un tiret vertical rouge 2 px, comme une ligne de chronométrage).
3. Une seule couleur, trois emplois : le bouton principal (un seul visible par écran), le filet de départ en sortie de hero, les tirets du chrono. Le rouge ne colore jamais un texte de moins de 24 px.
4. Aucune décoration : pas de carte, pas d'icône, pas de bandeau, pas de dégradé, pas d'ombre. Les seuls rectangles clairs du site sont les vraies pages du PDF, posées sur le noir comme des planches, encadrées d'un filet.
5. Un seul mouvement d'entrée par page, des apparitions une seule fois, et le reste ne bouge pas : la vitesse vient de la lisibilité, pas de l'animation.

Réglages : variance 7, mouvement 3, densité 3. Fond #070707, texte #F2EDE8, Bebas Neue pour les titres, Barlow Condensed 600 et 700 pour libellés et boutons, Barlow 400 pour le courant, JetBrains Mono 400 pour tout chiffre. Rayons 0 partout.

---

## 3. Règles de composition

**Grille.** Conteneur 1280 px (.conteneur), 12 colonnes (.grille), gouttière fluide, marge 16 px sur téléphone, tout en une colonne sous 900 px (déjà dans base.css : .grille > * prend toute la largeur en dessous de 900 px). Colonne de lecture : 62 caractères (.max-lecture), alignée sur la colonne 1, jamais centrée.

**Cinq familles de section.** On n'en enchaîne jamais deux de la même famille.
- (a) Hero scindé 5/7 : texte à gauche, objet à droite collé au bord de l'écran (photo), ou contenu (couverture, numéros, formulaire).
- (b) Bande : pleine largeur, fond #0F0F0F ou #161616 (.section-fond-1, .section-fond-2), filets haut et bas, contenu dans le conteneur. Réservée aux sections « argent » et « cadeau ». Jamais deux bandes à la suite.
- (c) Registre : rangées pleine largeur du conteneur séparées par des filets (.bloc-produit, .liste-filets), cellules en 12 colonnes, survol fond #0F0F0F. Pas de fond, pas de bordure de carte.
- (d) Lecture : colonne 62 caractères, colonnes 1 à 8 (.col-8), pour tout ce qui se lit : intro, FAQ, messages, textes légaux.
- (e) Scindé mini : image petite à gauche sur 3 ou 4 colonnes (.col-4), texte grand à droite (.col-7 .col-depart-7 ou équivalent), aucun bouton. Pour l'auteur.

**Ce qui est en pleine largeur d'écran** : la photo des heros (elle file jusqu'au bord droit), les bandes, la barre collante, la photo 21:9 de /journee-piste. **Ce qui ne l'est jamais** : le texte courant, les formulaires, la FAQ, les messages de lecteurs, les pages du PDF.

**Le rouge.** Trois emplois et pas un de plus : le fond du bouton principal (.bouton-principal, un seul visible par écran, la barre collante compte), le filet de départ (.filet-rouge, une occurrence par page, plus le bord haut de la barre collante), le tiret du chrono et le filet vertical des messages reçus (2 px). Les grands chiffres (72 h, prix) restent blanc cassé en Bebas ; le rouge en grand n'est pas interdit par le plan mais on garde l'accent pour ce qu'on clique. Exception unique : la nav marque « Clem Kart Racing » où « Kart » est rouge (déjà dans base.css), à 24 px.

**Espaces.** Base 4 px. Entre sections : --section-y (64 à 128 px). Entre un titre de section et son contenu : 32 px. Entre deux rangées de registre : 0 (le filet fait la séparation, padding 32 px de part et d'autre).

**Libellés en capitales** (.libelle) : une section sur trois au plus. Compte par page en section 5.

**Photos.** Au lot 1 le dépôt ne contient que clement-piste.jpg (1400 x 933, kart sur la grille) et clement-drapeau.jpg (1920 x 1278, marche vers la grille avec le drapeau), plus la photo Cloudinary LCP03651 du hero actuel (à rapatrier) et les dix pages du PDF en 640 x 906. clement.jpg (560 x 560) et partage.jpg cités par les propositions ne sont pas dans le dépôt : à retrouver ou à remplacer (voir risques). Chaque photo passe au build en AVIF + WebP + JPEG, deux tailles, recadrage 16:9 ordinateur et 4:5 téléphone, désaturation forte appliquée sur le fichier (pas de filtre CSS), width et height posés, lazy sauf le hero.

---

## 4. Composants communs

### 4.1 Ce qui existe déjà dans base.css et qu'on réutilise tel quel

- Structure : .conteneur, .conteneur-lecture, .conteneur-liens, .grille, .col-4, .col-5, .col-6, .col-7, .col-8, .col-12, .col-depart-2, .col-depart-7, .section, .section-serree, .section-fond-1, .section-fond-2, .filet-haut, .filet-bas, .filet-rouge, .filet-vertical, .entete-section, .max-lecture, .pile, .pile-serree, .ligne.
- Typographie : h1, h2, h3 (Bebas), h4 (Barlow Condensed), .titre-hero, .chapo, .secondaire, .mention, .libelle, .mono, .prix, .prix-note.
- Hero : .hero, .hero-texte, .hero-photo, .hero-actions, .hero-sous, .entree.
- Boutons : .bouton, .bouton-principal, .bouton-fantome, .bouton-large, .bouton-petit, .bouton-sous, .lien-texte.
- Navigation : .nav, .nav-inner, .nav-marque, .nav-liens, .nav-menu-bouton, .sous-nav, .evitement.
- Barre collante : .barre, .barre-inner, .barre-texte, body.a-barre.
- Listes : .liste, .liste-numeros, .liste-filets.
- Registre des offres : .bloc-produit.
- FAQ : .faq (details et summary natifs).
- Formulaire : .formulaire, .champ, .champ-ligne, .form-aide, .form-message, .form-envoye, .formulaire.est-envoye, .champ-piege.
- Confiance : .confiance, .confiance-ligne.
- Merci : .merci, .merci-actions, .merci-etape, .merci-suite.
- Messages : .message-recu, .messages.
- Photos : .photo, .photo-portrait, .photo-large, .photo-legende.
- Liens : .liens-page, .liens-nom, .liens-marque, .liens-faits, .liens-boutons, .lien-bio, .lien-bio-principal, .lien-bio-titre, .lien-bio-sous, .liens-reseaux.
- Pied : .pied, .pied-grille, .pied-marque, .pied-bas.
- Notices : .notice, .notice-ok.
- Mouvement : .reveal, .reveal.est-visible, .reveal-decale-1, .reveal-decale-2, .entree.
- Utilitaires : .centre, .mt-*, .mb-*, .cache-mobile, .cache-bureau, .visuellement-cache.

### 4.2 Ce qu'il faut ajouter à base.css (classes nouvelles, une section « 22. Composition » en fin de fichier)

| Classe | Rôle | Règles |
|---|---|---|
| .plaque | Bloc plein qui porte une ligne de titre ou un court paragraphe et chevauche une photo ou un bord de section | background var(--fond-0) (ou var(--fond-1) sur fond sombre), padding 8 px 16 px pour une ligne de titre, 32 px pour un paragraphe, position relative, marge négative vers l'objet chevauché (de 12 à 20 % de la largeur de la photo sur ordinateur, une demi-ligne sur téléphone), angles vifs, aucune ombre. Variantes : .plaque-titre (une ligne Bebas), .plaque-bloc (paragraphe) |
| .filet-apex | Filet 1 px à 10 % qui part de la marge gauche et s'arrête à la fin de la colonne 5 | width calc(5 / 12 * 100 %) sur ordinateur, 40 % sur téléphone, border-top var(--bordure), margin-bottom 32 px ; le libellé optionnel (.libelle) se pose au-dessus, à gauche. Remplace .filet-haut en tête de section |
| .filet-depart | Le filet de départ | Reprend .filet-rouge (2 px rouge) sur la largeur du conteneur, une occurrence par page, posée sur le bloc qui suit le hero ; la barre collante porte border-top 2px solid var(--rouge) |
| .chrono | Tout chiffre injecté depuis la config | span en var(--police-mono), var(--t--2), tabular-nums, padding-left 12 px, position relative ; ::before = 2 px de large, 12 px de haut, var(--rouge), collé à gauche, centré verticalement. Le chiffre reste var(--texte). Le build enveloppe automatiquement les balises de chiffre (prix, pages, chapitres, délais, garantie, lecteurs, dates) |
| .chrono-grand | Gros chiffre | Bebas, clamp(96px, 14vw, 180px), var(--texte), line-height 1, avec sous lui une ligne .mono ; sert au 72 H des pages merci et au prix de /guide |
| .registre, .registre-ligne | Rangée 12 colonnes séparée par des filets | display grid 12 colonnes sur ordinateur, padding-block 32 px, border-top var(--bordure), dernier enfant border-bottom ; survol background var(--fond-1) ; pile sur téléphone (index, nom, faits, bouton pleine largeur). Étend .bloc-produit |
| .numeral | Numéro de chapitre en Bebas géant | Trois échelles : .numeral-1 (64 px), .numeral-2 (clamp(96px, 14vw, 200px)), .numeral-3 (clamp(120px, 18vw, 260px)) ; var(--texte) ; nom de chapitre en .mono dessous ou à gauche |
| .sommaire, .sommaire-partie, .sommaire-chapitre | Les 13 chapitres en 5 parties | Deux colonnes 6/6 sur ordinateur ; titre de partie en .libelle (compte comme libellé) ; chaque chapitre = numéro .chrono, titre Barlow Condensed 700 var(--t-1), page réelle en .mono à droite avec un filet pointillé de conduite (border-bottom 1px dotted var(--filet) sur un élément flex 1) ; filet entre les parties seulement |
| .planche, .planche-rangee | Page du PDF posée sur le noir | border var(--bordure), width et height obligatoires, aucune ombre ; rangée de 4 (grid 4 colonnes égales sur ordinateur, défilement horizontal scroll-snap 70 % de large sur téléphone) ; survol translateY(-1px) |
| .dialog-planche | Feuilletage | dialog natif, fond var(--fond-0) à 95 %, page en 640 x 906 centrée, bouton fermer .bouton-fantome en haut à droite, fermeture par Échap ; le lien sous-jacent ouvre l'image sans JavaScript |
| .bloc-prix | La seule bande de prix du site | Étend .section-fond-1 : prix en .chrono-grand, trois lignes .mono, bouton principal, garantie en Barlow var(--t-1) sur quatre lignes maximum, sans encadré |
| .bouton-telechargement | Bouton 64 px à deux zones | Étend .bouton .bouton-large : libellé à gauche, à droite format et pages en .chrono ; variantes principal (PDF) et fantôme (tableau) |
| .livraison-texte | Deux variantes rendues au build | Deux blocs avec data-livraison="vrai" ou "faux" ; le build garde celui qui correspond à livraison.email_auto |
| .bon-livraison | Fiche de trois cellules sur les pages merci | Rail borné par deux filets, trois cellules séparées par des filets verticaux (fichier, reçu, garantie), libellé .mention au-dessus d'une valeur .chrono ; jamais plus de trois cellules, jamais un chiffre d'audience : c'est une fiche, pas un bandeau |
| .quote-colonne | Messages de lecteurs en colonne | Étend .message-recu : var(--t-1), filet vertical rouge 2 px, attribution .mono, 64 px d'espace entre messages ; mention « reproduits tels quels » en .mention sous le groupe. La grille 3 colonnes de .messages n'est pas utilisée (trois cartes jumelles) |
| .portes | Liste de liens pleine largeur | ul avec filets entre lignes, chaque a en Barlow Condensed 700 var(--t-1), flèche .mono à droite, survol translateX(4px) sur le texte |
| .sous-nav-legale | Sommaire collant de la page légale | Colonnes 1 à 3, position sticky top calc(var(--nav-h) + 24px), trois liens .libelle, lien actif = border-left 2px solid var(--rouge) padding-left 12 px ; masqué à l'impression ; en ligne sous le titre sur téléphone |
| .hero-objet | Colonne de droite d'un hero sans photo | Aligne à droite, pour la couverture, les numéros ou le formulaire |
| .hero-photo-bord | Photo collée au bord droit de l'écran | Sur ordinateur : margin-right calc(50% - 50vw), height 100 % du hero, object-fit cover ; sur téléphone : 4:5 au-dessus du texte, hauteur 42vh, pour que le titre et le bouton restent visibles sans défiler |

### 4.3 Les partials et site.js

- partial:head : balises meta, canonical et og:url depuis sites.url, og:image, noindex sur les pages merci (meta et en-tête X-Robots-Tag dans _redirects), preload de l'image du hero et des 5 woff2, tokens.css puis base.css, site.js en defer. La feuille Google Fonts actuelle sort dès que les woff2 sont dans assets/fonts.
- partial:nav : 64 px sur une ligne (la valeur --nav-h de tokens.css est à 72 px : ramener à 64), marque à gauche, quatre liens (Le guide, Analyse d'onboard, extrait selon extrait.appel, Marques), bouton **contour** vers /guide à droite (le bouton rouge actuel du partial contredit « un seul rouge par écran » et fait deux boutons rouges sur chaque hero). Le lien « Clément » du partial pointe vers /clement qui n'existe qu'au lot 2 : le remplacer par « Marques ». Variante réduite data-nav="reduite" (marque seule, sans liens) pour les trois pages merci ; absente sur /liens. Menu téléphone : liste plein écran fond #070707, liens en Bebas 48 px, ouverture par transform.
- partial:footer : garde ses quatre colonnes (marque et faits, Rouler plus vite, Clément, Réseaux) ; le lien « Mon parcours » vers /clement sort au lot 1 (remplacé par YouTube) ; variante réduite d'une ligne (mentions, email, retour au site) pour les pages merci et /liens.
- site.js : révélation une seule fois par IntersectionObserver, barre collante (afficher après le hero, cacher quand le bloc prix ou le bouton final est visible), UTM propagés, bio_click et stripe_click, lecture de ?section= sur la page légale, états des formulaires (envoi, envoyé, erreur) avec repli sans JavaScript, ouverture du dialog des planches, sélecteur « je suis » de /marques, lecture silencieuse du session_id sur les pages merci. Aucun écouteur scroll.

### 4.4 Budget d'animation, commun à toutes les pages

- Une seule animation d'entrée : le groupe du hero (.entree), 700 ms, cubic-bezier(0.16, 1, 0.3, 1), le titre puis, 100 ms après, l'objet de droite.
- Apparitions au défilement : .reveal, 24 px + opacité, une seule fois, jamais sur le hero, jamais sur la navigation ni la barre.
- Survol : bouton principal fond #A51115 + translateY(-1px), fantôme fond #161616 + translateY(-1px), lignes de registre fond #0F0F0F, portes translateX(4px) du texte ; appui scale(.98).
- Barre collante : transform seulement, 320 ms.
- Menu téléphone : transform seulement.
- Tout coupé par prefers-reduced-motion (déjà dans tokens.css et base.css).
- Rien d'autre. Pas de boucle, pas de parallaxe, pas de curseur, pas de ticker, pas de compteur qui monte.

---

## 5. Les pages

Pour chaque page : le hero, les sections dans l'ordre avec leur famille et leur mise en page, le détail signature, le budget d'animation et le compte des libellés.

### 5.1 / (accueil)

**Hero.** Famille (a). .hero .grille, min-height 88vh (jamais 100vh). Colonnes 1 à 5 (.col-5 .hero-texte) : h1 .titre-hero en trois lignes, une phrase par ligne, clamp(44px, 6.5vw, 96px) (un cran sous --t-hero pour que trois lignes tiennent), interligne .92 ; sous-titre .chapo deux lignes ; .hero-actions avec le bouton principal « Voir le guide » et le prix en balise ; dessous le .lien-texte vers le diagnostic gratuit de /onboard/. Colonnes 7 à 12 (.col-7 .hero-photo .hero-photo-bord) : clement-piste (kart 91 sur la grille) collée au bord droit de l'écran, pleine hauteur du hero, désaturée, preload, width et height. La troisième ligne du titre est posée sur .plaque-titre et mord sur la photo. Téléphone : photo 4:5 recadrée sur le casque et le volant en haut (42vh), titre dessous, la plaque chevauche le bas de la photo d'une demi-ligne, bouton visible sans défiler. Le gradient .hero-photo::after de base.css n'est pas utilisé : la lisibilité vient de la plaque.

**Sections.**
1. Filet de départ (.filet-depart) puis la ligne de faits. Une bande courte : fond #0F0F0F, 64 px de haut, une seule phrase Barlow var(--t-0) alignée sur la colonne 1, lue depuis faits.avec_titre ou faits.sans_titre selon afficher_titre. Les chiffres de la phrase (8 ans, 2023) en .chrono. Une phrase, pas des compteurs.
2. Les deux offres. Famille (c), .registre. Deux lignes pleine largeur du conteneur séparées par un filet, jamais deux cartes. Ligne guide : colonnes 1 à 2 la couverture du PDF en .planche à 96 px de large ; colonnes 3 à 7 titre h2 Bebas var(--t-3) + une ligne de résultat Barlow ; colonnes 8 à 10 trois faits .chrono empilés (format et pages, accès immédiat, garantie) ; colonnes 11 à 12 bouton principal vers /guide aligné à droite. Ligne débrief : colonnes 1 à 2 le délai « 72 H » en .numeral-1 (64 px) à la place de l'image ; colonnes 3 à 7 titre + une ligne ; colonnes 8 à 10 trois faits (vidéo commentée, 3 priorités, garantie) ; colonnes 11 à 12 bouton fantôme vers /onboard/. Image contre chiffre, rouge contre contour. Téléphone : pile (index, nom, faits, bouton pleine largeur). Un seul bouton rouge dans cet écran : celui du guide.
3. Messages reçus. Famille (d), colonne de lecture colonnes 1 à 8. h2 « Messages reçus de lecteurs, reproduits tels quels ». Trois .quote-colonne empilés, filet vertical rouge 2 px, Barlow var(--t-1), attribution .mono ; mention sous le groupe. Aucune étoile, aucune grille de trois.
4. Qui je suis. Famille (e), scindé mini : colonnes 1 à 4 la photo Cloudinary LCP03651 rapatriée (ou clement-piste recadrée serrée sur le casque) en .photo-portrait à 400 px de large maximum, filet 1 px ; colonnes 6 à 11 : h2 Bebas var(--t-3), trois lignes Barlow var(--t-1), la ligne de faits en .chrono, .lien-texte vers la chaîne YouTube (la page /clement n'existe qu'au lot 2).
5. Gratuit. Famille (b), bande #161616, padding vertical 96 px. Colonnes 1 à 5 : .libelle (le premier de la page), h2 Bebas, une ligne Barlow, bouton fantôme vers /extrait avec le texte extrait.bouton. Colonnes 7 à 12 : les numéros de chapitre en .numeral-2 côte à côte (« 03 04 05 » quand extrait.version vaut 3, « 04 » seul avec « intro » en .mono tant que la version 2 est en ligne), nom du chapitre en .mono sous chacun. Les numéros affichés sont ceux réellement livrés.
6. Et ensuite. .portes : quatre liens pleine largeur, un par ligne, filets entre eux, flèche .mono : YouTube, /journee-piste, /marques, /marques#sponsors (la page /sponsors n'existe qu'au lot 3). Pas de carte « prochainement ».
7. Footer commun.

**Détail signature.** La plaque du hero : la dernière ligne du titre en Bebas sort de la colonne sombre et mord sur la photo du kart posée sur un aplat #070707, comme la plaque 91 sur le kart de la photo. Titre à gauche, photo à droite, une plaque qui traverse la frontière : c'est la première image du site.

**Budget d'animation.** Entrée : les trois lignes du titre montent (décalage 80 ms entre elles), la photo apparaît 100 ms après. Reveal une fois sur les sections 2 à 6. Survols des boutons, des lignes de registre et des portes. Rien d'autre.

**Libellés en capitales.** Un sur sept sections (la bande gratuit). Le hero n'en porte pas.

### 5.2 /guide

**Hero.** Famille (a), objet au lieu de photo. Colonnes 1 à 6 : h1 « COMPRENDRE COMMENT ROULER PLUS VITE » sur deux lignes, clamp(56px, 8vw, 120px) ; accroche .chapo (trois phrases) ; ligne de format guide.resume_ligne en .chrono ; .hero-actions : bouton principal avec le prix, à côté .lien-texte « Feuilleter l'introduction » (ancre vers la section 2) ; .hero-sous : garantie courte et lecteurs.phrase, chaque chiffre en .chrono. Colonnes 8 à 12 (.hero-objet) : la couverture réelle du PDF en .planche, 420 px de large, décalée 48 px plus bas que le titre, posée sur la ligne de base du hero avec son bord inférieur coupé de 40 px par le filet de départ (elle rentre dans la page) ; la première ligne du titre mord sur son bord gauche par .plaque-titre. Tant que la couverture n'est pas exportée, page-01.png (le sommaire) prend sa place, moins vendeur. Téléphone : titre, accroche, bouton, puis la couverture à 60 % de large alignée à droite. Barre collante armée dès que le hero sort de l'écran.

**Sections.**
1. Filet de départ.
2. Feuilleter. Famille (d) éditoriale : colonnes 1 à 7 l'introduction complète en vrai HTML, h2 Bebas, Barlow var(--t-0) interligne 1.6, 62 caractères, sans lettrine. Colonnes 9 à 12 : bande collante (sticky sous la nav) de quatre .planche à 180 px (page-02 sommaire détaillé, page-04 ouverture du chapitre 04, page-06 texte courant, page-09 fiche d'exercice), 12 px d'écart ; clic = .dialog-planche avec la page en 640 x 906 ; sans JavaScript le lien ouvre l'image. Téléphone : les quatre planches en rangée horizontale scroll-snap au-dessus du texte, 200 px chacune.
3. Pour qui, pas pour qui. Deux colonnes 6/6 séparées par un seul filet vertical 1 px sur toute leur hauteur (.col-6 + .filet-vertical) : à gauche « Prends-le si » en Bebas var(--t-3) puis deux lignes, à droite « Passe ton chemin si » puis deux lignes (location, carburation). Pas de coches, pas de croix. Téléphone : pile, filet horizontal entre les deux.
4. Ce qu'il y a dedans. .sommaire : les 13 chapitres en cinq parties, deux colonnes 6/6 (parties I et II à gauche, III à V à droite). Titre de partie en .libelle (le seul de cette section), chaque chapitre = numéro .chrono, titre Barlow Condensed 700 var(--t-1), une ligne Barlow var(--t--1) à 62 %, numéro de page réel en .mono à droite avec le filet pointillé de conduite. Filet entre les parties seulement. Les chapitres livrés dans l'extrait portent la mention .mono « dans l'extrait », pilotée par extrait.version. Le lecteur reconnaît la page 2 du PDF.
5. Les trois croyances et le virage. Famille (a) sans photo : colonnes 1 à 5 le schéma du virage en SVG inline (la seule illustration dessinée du site, parce qu'elle est le contenu du guide) : bord de piste en trait 1 px blanc cassé, zone de freinage en hachures fines à 10 %, trajectoire supposée en tirets à 62 %, trajectoire réelle en trait plein rouge 2 px, point de corde en carré 6 px, libellés en .mono, aucun compteur de secondes, aucun script. Colonnes 7 à 12 : les trois croyances empilées, chacune = la croyance en Barlow Condensed 600 var(--t-1) barrée (line-through, 62 %), puis « Ce qui se passe vraiment » en Barlow var(--t-0) ; .filet-apex entre les trois. Téléphone : schéma en haut à 100 %, croyances dessous.
6. Preuves. Famille (d), colonnes 3 à 10 (décalage d'une colonne par rapport à l'accueil pour ne pas répéter la même image) : les trois .quote-colonne avec 64 px d'espace, mention sous le dernier. Juste avant le prix.
7. L'auteur. Famille (e), compact : colonnes 1 à 3 la photo portrait à 280 px maximum, colonnes 4 à 9 nom en Bebas var(--t-3), trois lignes Barlow, la ligne de faits en .chrono. Pas de titre de section.
8. Prix et garantie. Famille (b), .bloc-prix, la seule bande de prix du site : fond #0F0F0F, padding 96 px. Colonnes 1 à 5 : le prix en .chrono-grand depuis guide.prix_affiche, sous lui trois lignes .chrono (paiement unique, accès immédiat, PDF). Colonnes 7 à 12 : bouton principal « Je prends le guide » pleine largeur de colonne, .bouton-sous textes.sous_bouton_guide, puis textes.garantie_longue en Barlow var(--t-1) sur quatre lignes maximum, sans encadré. Ce bloc porte l'identifiant id="prix" que la barre collante surveille pour se cacher.
9. FAQ. .faq, colonnes 1 à 8, sept details natifs, summary Barlow Condensed 700 var(--t-1), marqueur « + » en .mono blanc cassé qui tourne en croix (transform seul), réponses Barlow var(--t-0), filets entre les questions. La question sur la rétractation renvoie vers routes.cgv.
10. Bouton final. Court, colonnes 1 à 7 : h2 Bebas var(--t-4) sur deux lignes, bouton principal, .bouton-sous. id="final" : la barre collante se cache quand ce bloc est visible.
11. Barre collante (.barre) : fond #0F0F0F plein, bord haut rouge 2 px (le filet de départ repris), à gauche « Le guide » .barre-texte + prix .chrono, à droite bouton principal compact vers /aller/guide ; sous 600 px le bouton prend toute la barre ; safe-area iOS ; body.a-barre compense le pied de page. Apparition par transform.
12. Footer commun.

**Détail signature.** La couverture debout : le livre posé sur la ligne de base du hero, coupé par le filet de départ comme s'il rentrait dans la page, avec le titre qui mord sur son bord gauche par la plaque. Deuxième signature propre à la page : le sommaire reproduit avec la même typographie mono que dans le livre, numéros de page compris, pour que le visiteur reconnaisse l'objet qu'il va recevoir.

**Budget d'animation.** Entrée : le titre puis la couverture 100 ms après. Reveal une fois sur les sections 2 à 10. Barre collante par transform. Dialog natif sans transition. Rien d'autre.

**Libellés en capitales.** Un sur dix sections (les titres de parties du sommaire). Le hero et le bloc prix n'en portent pas.

### 5.3 /liens

**Hero.** Pas de navigation, pas de pied de page complet, pas de formulaire. .conteneur-liens (420 px maximum), fond #070707, marges 16 px. Photo portrait 4:5 pleine largeur de colonne (.photo-portrait, photo à fournir par Clément ; en attendant clement-piste recadrée serrée sur le casque), désaturée, width et height. .plaque-titre porte « CLÉMENT DANIEL » en Bebas var(--t-3) et chevauche le bas de la photo de 24 px ; « Clem Kart Racing » en .liens-marque dessous. Le voile noir demandé par le plan est remplacé par la plaque pleine (pas de dégradé, la classe .photo-voile de base.css n'est pas utilisée). Puis la ligne de faits en .liens-faits (config, variante selon afficher_titre).

**Sections.**
1. Les cinq boutons (.liens-boutons, .lien-bio), pleine largeur, 64 px de haut avec la sous-ligne (le plan dit 56 : 56 sans sous-ligne ne se lit pas, 64 est la hauteur réelle), angles vifs, 12 px d'espace, dans l'ordre imposé : LE GUIDE (.lien-bio-principal, seul bouton rouge), ANALYSE DE TON ONBOARD, JOURNÉE SUR PISTE, MARQUES ET PARTENAIRES (contour), LE SITE (contour à 30 %). Chaque bouton = .lien-bio-titre à gauche, .lien-bio-sous (textes et prix depuis la config, prix en .chrono), flèche .mono à droite. Jamais de sixième bouton. Vrais liens sans JavaScript ; site.js réécrit les UTM et envoie bio_click.
2. Ligne de confiance : textes.confiance en .confiance-ligne, .mono var(--t--2) à 62 %, alignée à gauche ; le point médian n'est utilisé qu'ici et dans les sous-lignes des boutons.
3. Lien texte souligné vers /extrait, texte extrait.appel (config), Barlow var(--t--1).
4. Quatre icônes monochromes 20 px (.liens-reseaux), fichiers SVG statiques, alignées à gauche, zone de touche 44 px.
5. Ligne finale « Mentions légales · Clem Kart Racing » en .mention. Poids total sous 100 Ko hors photo.

**Détail signature.** La même plaque que sur l'accueil, réduite à 420 px sous la photo, pour que la page de liens et le site soient reconnus comme un seul objet depuis les trois bios. Et un seul bouton rouge sur cinq.

**Budget d'animation.** Entrée : la plaque puis la pile des cinq boutons (décalage 60 ms). Survol des boutons. Rien d'autre.

**Libellés en capitales.** Les titres des boutons sont des boutons, pas des libellés de section : zéro libellé.

### 5.4 /extrait

**Hero.** Famille (a), le formulaire est l'objet. Colonnes 1 à 6 : h1 sur deux lignes clamp(44px, 6vw, 88px) (promesse selon extrait.version), sous-titre .chapo, puis, dans la colonne et visible sans défiler, le formulaire à un champ : label au-dessus, champ email 56 px fond #0F0F0F filet 1 px (inputmode="email", autocomplete="email"), bouton principal extrait.bouton pleine largeur sous le champ, ligne .mono dessous (envoi immédiat, désinscription). Colonnes 8 à 12 (.hero-objet) : les numéros de chapitre en .numeral-3 empilés à droite, blanc cassé, nom de chapitre en .mono à gauche de chaque numéro ; le second numéro décalé de 32 px vers la gauche pour casser la pile. En version 2 la pile affiche « intro » en .mono puis « 04 » ; en version 3, « 03 04 05 ». Téléphone : titre, formulaire, puis les numéros réduits sur une ligne.

**Sections.**
1. Filet de départ.
2. États du formulaire (dans le hero) : envoi (bouton désactivé, texte « Envoi »), envoyé (le bloc .form-champs est remplacé, à la même hauteur, par une .plaque-bloc fond #0F0F0F avec « C'est envoyé » en Bebas var(--t-3) et deux lignes Barlow : regarde ta boîte et les spams, le tableur est dans le même email ; filet gauche vert d'état, la seule couleur autre que le rouge du site), erreur (Barlow var(--t--1) blanc cassé sous le champ, filet rouge 2 px à gauche, jamais de texte rouge). .champ-piege caché. Le formulaire fonctionne sans JavaScript (POST vers la fonction, retour vers #envoye).
3. Ce que tu reçois. Rangée de trois colonnes égales (ou deux en version 2), chacune = .filet-apex en tête, numéro .numeral-1, titre Barlow Condensed 700 var(--t-1), une ligne Barlow sur le geste concret ; puis une ligne pleine largeur différente pour le tableur : à gauche « Le tableur » en Bebas var(--t-3), à droite les trois onglets (Journal, Diagnostic express, Pressions et pluie) en .mono séparés par des filets verticaux. Contenu lu depuis extrait.chapitres_v3 ou la promesse v2. Pas de cartes, pas d'icônes.
4. Ce que ce n'est pas. Famille (d), colonnes 1 à 7, Barlow var(--t-0), quatre phrases (pas de carburation, pas de promesse de chrono, un email tout de suite puis cinq sur deux semaines, désinscription à chaque email). Aucun titre de section.
5. Bloc #envoye en bas de page pour le retour sans JavaScript, même texte que l'état envoyé, .notice-ok.
6. Le guide complet. Famille (b), bande #161616, padding 64 px : colonnes 1 à 2 page-01 en .planche à 160 px, colonnes 3 à 8 « Le guide complet » en Bebas var(--t-3) + une ligne Barlow (13 chapitres, garantie, chiffres en .chrono), colonnes 10 à 12 bouton fantôme vers /guide avec le prix. Le prix arrive ici seulement.
7. Footer commun.

**Détail signature.** La pile de numéros en Bebas géant à droite du formulaire, avec un numéro décalé : les chapitres sont l'image de la page (aucune photo ici), et on les retrouve en petit sur l'accueil et dans le sommaire de /guide. Une seule idée visuelle, à trois échelles.

**Budget d'animation.** Entrée : le groupe titre + formulaire, puis les numéros 100 ms après. Reveal une fois sur les sections 3 à 6. Changement d'état du formulaire sans transition (aria-live). Rien d'autre.

**Libellés en capitales.** Zéro.

### 5.5 /merci-guide

**Hero.** Noindex (meta et X-Robots-Tag), Referrer-Policy no-referrer, navigation réduite (marque seule), pas de photo, pas de barre collante. .merci, colonnes 1 à 8 : ligne .chrono « Paiement reçu », h1 « C'est bon, ton guide est là. » en Bebas clamp(48px, 7vw, 96px). Puis, toujours dans le hero, les téléchargements : deux .bouton-telechargement empilés (colonnes 1 à 6), 64 px, 12 px d'espace : le PDF en principal, le tableau de réglages en fantôme, chacun avec à droite le format et les pages en .chrono. Chemins depuis livraison.pdf_url et livraison.tableau_url. Le bouton rouge de l'écran, c'est le PDF.

**Sections.**
1. Filet de départ.
2. Bon de livraison (.bon-livraison) : trois cellules (fichier : PDF, pages ; reçu : par email Stripe ; garantie : jours), libellé .mention, valeur .chrono. Trois cellules, jamais plus.
3. La consigne. .plaque-bloc fond #0F0F0F colonnes 1 à 6, padding 32 px : « Ce soir, lis le chapitre 04 en premier » en Bebas var(--t-2), puis une ligne Barlow (une seule chose à ta prochaine session). Le seul bloc encadré de la page.
4. La suite à prix équitable. Famille (c), une seule .registre-ligne pleine largeur avec filets au-dessus et au-dessous, sous le pli (jamais dans le même écran que le bouton rouge du PDF) : colonnes 1 à 2 le prix public en .chrono barré (text-decoration line-through, 62 %) au-dessus du prix lecteur en .prix ; colonnes 3 à 7 « Tu as une vidéo onboard ? » en Bebas var(--t-3) + une ligne Barlow qui explique le prix lecteur et le total identique dans les deux sens (equitable.total_affiche) ; colonnes 8 à 10 faits .chrono (délai, garantie) ; colonnes 11 à 12 bouton principal « Envoyer ma vidéo » avec equitable.debrief_lecteur.prix_affiche vers /aller/onboard-lecteur. Jamais vers /onboard/.
5. Contact et garantie. Famille (d), colonnes 1 à 7, Barlow var(--t-0), la garantie en plus des droits légaux, l'email en clair depuis contact.email.
6. Texte de livraison (.livraison-texte) : deux variantes rendues au build selon livraison.email_auto, une seule affichée, Barlow var(--t--1) à 62 %, colonnes 1 à 7.
7. Pied de page réduit : mentions légales, email, retour au site. site.js lit le session_id de l'adresse sans rien afficher.

**Détail signature.** Les boutons de téléchargement écrits comme des lignes de chronométrage : libellé à gauche, format et pages en mono à droite, tiret rouge. Le chrono du site se reconnaît jusque dans la page de livraison.

**Budget d'animation.** Entrée : le titre puis les deux boutons. Reveal une fois sur les sections 3 à 6. Rien d'autre.

**Libellés en capitales.** Zéro.

### 5.6 /merci-guide-lecteur

**Hero.** Même squelette que /merci-guide (noindex, navigation réduite, pas de photo, pas de barre) : ligne .chrono « Paiement reçu », h1 « Ton guide est là. », les deux .bouton-telechargement (composant partagé, mêmes chemins config).

**Sections.**
1. Filet de départ.
2. Bon de livraison : trois cellules (fichier, débrief : en cours sous 72 h, garantie). La cellule débrief remplace toute offre.
3. Le débrief en cours. Famille (a) sans photo : colonnes 1 à 4 « 72 H » en .chrono-grand blanc cassé avec sous lui « délai de livraison » en .mono ; colonnes 6 à 12 deux phrases Barlow var(--t-1) (ta vidéo commentée arrive sous 72 h, ce soir lis le chapitre 04 en premier). Le gros chiffre remplace la ligne de vente de l'autre page : même hauteur de page, mise en page différente.
4. Contact et garantie : même bloc que /merci-guide.
5. Texte de livraison : même composant.
6. Pied de page réduit. Aucun bouton de vente, aucun rouge sous le pli.

**Détail signature.** Le « 72 H » en Bebas géant à gauche, seul chiffre en grand de la page : la promesse de délai devient l'image, et c'est la même que sur /merci-onboard, ce qui relie les deux pages du parcours débrief.

**Budget d'animation.** Entrée : le titre puis les boutons. Reveal une fois sur les sections 2 à 5. Rien d'autre.

**Libellés en capitales.** Zéro.

### 5.7 /merci-onboard

**Hero.** Noindex, navigation réduite, pas de photo, pas de barre. Famille (a) sans photo : colonnes 1 à 5 « 72 H » en .chrono-grand clamp(120px, 16vw, 220px) blanc cassé avec sous lui en .mono « le chrono démarre maintenant » ; colonnes 7 à 12 le h1 « Reçu. » en Bebas var(--t-4) puis une ligne Barlow var(--t-1). Aucun bouton rouge sur toute la page.

**Sections.**
1. Filet de départ.
2. Ce qui se passe. Trois lignes en registre vertical colonnes 1 à 8 (.liste-numeros avec numéros en .chrono blanc cassé, pas en rouge) : phrase en Barlow Condensed 600 var(--t-1) (je regarde ta vidéo en entier, je te renvoie une vidéo commentée par email, tu reçois 3 priorités et un objectif), .filet-apex entre les lignes. Pas d'icônes, pas de cercles numérotés.
3. Vidéo inexploitable. .plaque-bloc fond #0F0F0F colonnes 1 à 6, padding 32 px, Barlow var(--t-0) : je te le dis avant de commencer et je te rembourse.
4. Le guide coché. .livraison-texte, colonnes 1 à 7, Barlow var(--t-0), deux variantes rendues au build, prix depuis debrief.option_guide.prix_affiche en .chrono. Aucun bouton.
5. Ta vidéo reste entre toi et moi. Une ligne Barlow var(--t-0) colonnes 1 à 7, la durée de conservation delais.suppression_video_jours en .chrono.
6. Contact et garantie après réception : même composant que les autres pages merci.
7. Un seul lien « Retour au site » en .lien-texte avec flèche .mono, aligné à gauche. Pied de page réduit.

**Détail signature.** Le « 72 H » géant en ouverture : le délai est le seul chiffre affiché en grand, et les trois lignes « ce qui se passe » sont indexées comme des tours de chronométrage. Rien à acheter, tout à comprendre.

**Budget d'animation.** Entrée : le chiffre monte, puis le titre 100 ms après. Reveal une fois sur les sections 2 à 6. Rien d'autre.

**Libellés en capitales.** Zéro.

### 5.8 /journee-piste (liste d'attente, version courte du lot 1)

**Hero.** Famille différente des autres heros : photo en bande pleine largeur 21:9 (clement-drapeau, marche vers la grille avec le drapeau, recadrée sur les jambes et le drapeau, désaturée ; le rouge du drapeau reste la seule couleur photographique saturée du site, ce qui colle à la palette), 48vh de haut, width et height, preload ; puis .plaque-titre en bas à gauche qui déborde sous la photo avec « JOURNÉE SUR PISTE » en Bebas clamp(48px, 7vw, 96px) et, en .mono dessous, journee.sous_ligne_liste_attente. Téléphone : photo 4:5 recadrée sur le drapeau, plaque qui chevauche le bas.

**Sections.**
1. Filet de départ.
2. Le texte honnête. Famille (a) : colonnes 1 à 6 les trois lignes imposées par le plan en Barlow var(--t-1) (pas encore de journée payante, carte professionnelle, laisse ton email et ta région ; aucune date, aucun prix, aucun paiement). Aucun prix, aucun devis, aucun des mots qui décrivent un encadrement sur piste (la liste est dans la section 7 du plan).
3. Le formulaire réduit. Colonnes 8 à 12 sur ordinateur (dans la même .grille que le texte), bloc fond #0F0F0F padding 32 px filet 1 px : email (56 px), région (texte), niveau (select natif à cinq niveaux), case RGPD carrée 20 px avec la finalité en une ligne (te prévenir de l'ouverture, 12 mois), .champ-piege, bouton principal « Me prévenir à l'ouverture » pleine largeur. Libellés au-dessus, erreurs sous le champ. Envoi vers send-email avec l'attribut JOURNEE_ATTENTE. État envoyé : le bloc devient, à la même hauteur, une .plaque-bloc « Merci, je note ta demande » avec les deux phrases de l'accusé de réception. Téléphone : formulaire sous le texte.
4. Pas de section prix, pas de programme, pas de FAQ : la version longue arrive au lot 2 et reste verrouillée tant que journee.statut vaut liste_attente. Pied de page commun.

**Détail signature.** La photo en bande 21:9 avec la plaque qui déborde sous elle : le seul hero « paysage » du site, réservé à la page qui parle de la piste réelle.

**Budget d'animation.** Entrée : la plaque monte, une fois. Reveal une fois sur le texte et le formulaire. Rien d'autre.

**Libellés en capitales.** Zéro.

### 5.9 /marques (version courte du lot 1)

**Hero.** Famille (a) inversée en 4/8, sans plaque sur photo. Colonnes 1 à 4, collantes sur ordinateur (sticky sous la nav) pendant qu'on remplit le formulaire : h1 « Marques et partenaires » sur deux lignes clamp(48px, 7vw, 96px), les trois lignes imposées en Barlow var(--t-1) (collaboration commerciale, sponsoring, on en parle ; réponse sous 48 h en .chrono ; jamais de faux avis), un recadrage serré 4:5 de clement-piste sur le casque et la visière (art-direction distincte de l'accueil) en .photo-portrait à 240 px, filet 1 px, l'email de contact en clair en .mono. Colonnes 5 à 12 : le formulaire commun (section 2). Téléphone : titre, texte, photo à 60 % alignée à droite, formulaire.

**Sections.**
1. Filet de départ (sous le hero, avant le formulaire sur téléphone ; sur ordinateur il borde le haut de la grille).
2. Le formulaire commun. Colonnes 5 à 12, grille de champs 6/6 : « je suis » (select : marque, futur sponsor, autre) en tête sur toute la largeur, qui adapte les libellés suivants par JavaScript et reste complet sans JavaScript ; société, prénom ; email, site ou Instagram ; objectif (texte) ; formats en cases natives carrées 20 px sur deux colonnes ; fourchette de budget (select, cinq valeurs) et délai ; message pleine largeur ; .champ-piege ; bouton principal « Me contacter pour une collaboration » aligné à gauche, 56 px. Libellés au-dessus, erreurs dessous. Envoi vers send-email (COLLAB_DEMANDE ou SPONSOR_DEMANDE selon « je suis »), accusé de réception simple au lot 1. État envoyé : le formulaire est remplacé, à la même hauteur, par une .plaque-bloc « Bien reçu, je te réponds sous 48 h ».
3. Ancre #sponsors : au lot 1, un bloc colonnes 5 à 12 sous le formulaire, .filet-apex, h2 Bebas var(--t-3) « Ton logo sur mon kart » et deux lignes Barlow (le dossier complet arrive, laisse ton contact via le formulaire ci-dessus, choix « futur sponsor »). Il donne une cible réelle au lien de l'accueil et de /liens sans inventer un budget de saison.
4. Pied de page commun. Aucune audience chiffrée, aucun kit média, aucune FAQ avant le lot 2.

**Détail signature.** L'intro qui reste collée pendant qu'on remplit : la marque voit en permanence qui elle contacte (visage, faits, email en clair). Le formulaire en grille 6/6 est le seul formulaire large du site.

**Budget d'animation.** Entrée : le groupe titre, une fois. Reveal une fois sur le formulaire et le bloc sponsors. Rien d'autre.

**Libellés en capitales.** Zéro (les labels de champs sont en .champ label, pas des libellés de section).

### 5.10 /mentions-legales (trois ancres : #mentions, #cgv, #donnees)

**Hero.** Pas de photo, pas d'entrée animée autre que le titre. Colonnes 4 à 11 : h1 « Mentions légales, CGV, données » en Bebas clamp(40px, 6vw, 80px) sur deux lignes, sous lui la date de mise à jour (mis_a_jour) en .chrono.

**Sections.**
1. Sous-navigation collante (.sous-nav-legale). Colonnes 1 à 3 sur ordinateur (sticky sous la nav) : trois liens .libelle (Mentions, CGV, Données), le lien de la section visible porte un filet vertical 2 px rouge (IntersectionObserver). Trois lignes de JavaScript lisent ?section= et font défiler jusqu'à l'ancre ; sans JavaScript la page complète s'affiche et les ancres marchent. Téléphone : trois liens en ligne sous le titre, non collants. Le filet rouge de cette page tient lieu de filet de départ (une seule occurrence de rouge hors bouton).
2. Bloc #mentions. Colonnes 4 à 11, Barlow var(--t-0) interligne 1.6, h2 Bebas var(--t-3), h3 Barlow Condensed 700 var(--t-0). Les données éditeur en liste de définitions (dl) à deux colonnes : terme en .mention, valeur en Barlow. Éditeur et directeur de la publication, adresse, téléphone, email en clair (config), SIREN ou « en cours d'attribution » (config), TVA non applicable, hébergeur avec adresse complète, prestataires (Stripe, Brevo, Supabase). Aucun script de masquage d'email.
3. Bloc #cgv. Même colonne. Une sous-partie par offre (guide, débrief ; journée sur piste seulement si journee.statut vaut ouverte, sinon absente) avec pour chacune : prix depuis la config en .chrono, livraison, garantie en plus des droits légaux, rétractation avec le texte de renonciation. Le formulaire type de rétractation dans un details/summary replié, composé en .mono var(--t--1) dans un bloc à filet 1 px (le seul endroit où le texte légal prend la police des chiffres), ouvert par défaut à l'impression. Puis Responsabilité et Médiation (nom du médiateur depuis la config). Aucune mention de la plateforme européenne, de Gumroad, de « particulier ».
4. Bloc #donnees. Même colonne : durées de conservation en dl à deux colonnes avec valeurs en .chrono (30 jours vidéo, 3 ans prospects, 12 mois liste d'attente), sous-traitants en .liste-filets (paiement, emails, hébergement, statistiques, messages), droits RGPD, finalité de la liste d'attente, contact.
5. Feuille @media print : sous-navigation, nav et pied masqués, texte noir sur blanc (déjà amorcé dans base.css).
6. Pied de page commun. Aucun bouton de vente.

**Détail signature.** La sous-navigation collante à gauche avec le filet rouge qui suit la section lue : la page légale garde la grille du site (colonne qui parle à gauche, colonne qui montre à droite) au lieu de tomber dans un mur de texte.

**Budget d'animation.** Entrée : le titre, une fois. Pas de reveal sur les blocs de texte (on lit, on ne fait pas apparaître). Rien d'autre.

**Libellés en capitales.** Un (les trois liens de la sous-navigation, comptés comme un seul groupe) sur cinq sections.

---

## 6. Risques et arbitrages à trancher avant le jour 3

1. **Photos manquantes dans le dépôt.** Seules clement-piste.jpg (1400 x 933) et clement-drapeau.jpg (1920 x 1278) sont dans « site v2/ ». clement.jpg et partage.jpg cités par les propositions n'y sont pas ; le hero actuel charge une photo Cloudinary (LCP03651) à rapatrier. Il manque : la couverture réelle du PDF (page-01.png est le sommaire), un portrait 4:5 pour /liens et le bloc auteur. En attendant, /guide se replie sur page-01.png et les portraits sur un recadrage serré de clement-piste. À fournir par Clément entre les jours 3 et 5.
2. **Le titre de l'accueil fait trois phrases.** La checklist dit deux lignes ; Clément a validé le titre. Arbitrage : trois lignes sur ordinateur à clamp(44px, 6.5vw, 96px), quatre sur téléphone, plutôt que couper le texte. La proposition 3 (première phrase seule en h1) reste en réserve si Clément préfère.
3. **Le voile noir de /liens** demandé par le plan est un dégradé, interdit par la section 9. Arbitrage : la plaque pleine sous la photo. Les classes .hero-photo::after et .photo-voile de base.css (dégradés) ne sont utilisées par aucune page ; à retirer de base.css par son propriétaire pour que la règle « pas de dégradé » soit tenue dans le code aussi.
4. **Rouge en petit texte dans base.css.** .liste-numeros li::before (numéros mono rouge 13 px), .faq summary::after (« + » rouge 13 px), .libelle-rouge et .chiffre (rouge, mais à 36 px et plus, acceptable) : les deux premiers passent sous 4,5:1. À corriger dans base.css : numéros et marqueur en var(--texte), le rouge porté par un tiret 2 px (.chrono).
5. **Le bouton rouge de la navigation.** Le partial nav actuel a un bouton principal rouge sur chaque page, ce qui met deux boutons rouges sur chaque hero. Passer en .bouton-fantome. Le lien « Clément » vers /clement (lot 2) devient « Marques ». Le pied de page perd « Mon parcours » au lot 1.
6. **--nav-h vaut 72 px dans tokens.css**, la composition et le plan disent 64. À aligner (une valeur, un fichier).
7. **Désaturation sélective** (tout gris sauf le rouge du drapeau) : pas automatisable proprement avec sharp. À faire une fois à la main sur les photos, le build ne faisant que recadrage et conversion. Sinon, repli sur une désaturation totale au build, cohérente mais plus terne.
8. **La barre collante et la règle du rouge unique** reposent sur un IntersectionObserver qui la cache devant #prix et #final ; sans JavaScript la barre ne s'affiche pas (repli acceptable). À tester sur iOS avec safe-area et clavier ouvert.
9. **Liens vers des pages absentes au lot 1** : /clement, /sponsors, /kit-media. Remplacés par YouTube et /marques#sponsors ; le build ou test:track doit vérifier qu'aucun lien interne ne renvoie 404 sur le brouillon.
10. **Le schéma du virage** est le seul dessin du site ; il reste géométrique, monochrome avec un seul trait rouge, sans compteur ni script. S'il ressemble à une illustration décorative, on le retire et on met une vraie page du PDF à la place.
11. **Les balises {{...}} dans des attributs** (href des boutons /aller/*, width, height, meta) : build.js doit remplacer aussi dans les attributs, et le contrôle des balises restantes doit couvrir tout le HTML généré. L'enveloppe automatique .chrono des chiffres injectés est une règle de build à écrire.
12. **Cinq fichiers woff2, aucune italique** : la composition n'en utilise pas ; test:fonts doit faire échouer toute règle CSS qui demande 300, 500, 900 ou italic.
13. **Le hero de l'accueil sur téléphone** demande une seconde version 4:5 de clement-piste au build (script sharp, donc un npm install que Claude ne lance pas) ; sans elle, le kart sera minuscule et le LCP dépassera 2,5 s si l'image dépasse 200 Ko.
14. **Les trois messages de lecteurs** sont dans COPY-VENTE.md sans prénom (aucun accord écrit) : la section preuve affiche « Pilote en compétition » et « Lecteur du guide », jamais un texte de remplissage.
15. **Le point médian** n'apparaît que dans la ligne de confiance et les sous-lignes de /liens (textes imposés par le plan) ; ne pas le reprendre ailleurs, sinon la page ressemble aux gabarits générés.

---

## 7. Compte des libellés en capitales par page (règle : une section sur trois maximum)

| Page | Sections | Libellés | Où |
|---|---|---|---|
| / | 7 | 1 | bande gratuit |
| /guide | 10 | 1 | titres de parties du sommaire |
| /liens | 5 | 0 | |
| /extrait | 6 | 0 | |
| /merci-guide | 7 | 0 | |
| /merci-guide-lecteur | 6 | 0 | |
| /merci-onboard | 7 | 0 | |
| /journee-piste | 4 | 0 | |
| /marques | 4 | 0 | |
| /mentions-legales | 5 | 1 | sous-navigation |
