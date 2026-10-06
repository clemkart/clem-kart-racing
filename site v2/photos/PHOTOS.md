# Photos du site

Vraies photos de Clément, en couleur, tirées du disque E: (lecture seule, rien n'a été déplacé ni modifié sur E:).

Retouche identique sur toutes : noirs un peu plus denses, légère courbe de contraste, saturation baissée d'environ 16 % sauf les rouges (gardés à 100 %). Aucune métadonnée (EXIF, GPS, appareil, profil couleur) : vérifié fichier par fichier, les JPEG ne contiennent que les blocs JFIF et image, les WebP qu'un seul bloc VP8.

Formats : JPEG progressif qualité 80 et WebP qualité 78, même nom, même largeur. Le chiffre à la fin du nom est la largeur en pixels. Poids total du dossier : 7,2 Mo.

Usage dans le HTML (exemple) :

```html
<picture>
  <source type="image/webp" srcset="/photos/piste-695-ciel-960.webp 960w, /photos/piste-695-ciel-1600.webp 1600w, /photos/piste-695-ciel-2400.webp 2400w" sizes="100vw">
  <img src="/photos/piste-695-ciel-1600.jpg" srcset="/photos/piste-695-ciel-960.jpg 960w, /photos/piste-695-ciel-1600.jpg 1600w, /photos/piste-695-ciel-2400.jpg 2400w" sizes="100vw" width="1600" height="900" alt="...">
</picture>
```

## Direction V5 (02/10/2026) : aucun visage en gros plan

Plus aucune page ne doit citer un gros plan du visage. Ne sont plus utilisées (elles sortiront du dossier publié quand plus aucune page ne les cite ; elles restent dans l'historique git) : clement-portrait, clement-avatar, clement-sourire, clement-trophee, clement-podium, marques-cockpit-logos (les yeux se voient sous la visière), paddock-pre-grille (un adulte non validé). Hors de ce dossier : consulting/clement-640 et -800, clement-trophee-nb.jpg, clement-casque-nb.jpg, assets/clement.jpg, site-catalogue/clement.jpg et site-catalogue/partage.jpg (à refaire).

## Nouvelles photos V5 (exportées le 02/10/2026, même retouche, aucune métadonnée)

Exportées avec le script de retouche habituel (recadre, retouche, propre, enregistre ; JPEG progressif 80, WebP 78), depuis E: en lecture seule. Poids ajouté : 5,2 Mo (JPEG et WebP).

### piste-25-file
- Fichiers : piste-25-file-960 (960x540), -1600 (1600x900), -2400 (2400x1350), .jpg et .webp
- Cadre : 16:9, boîte (0.0, 0.156, 1.0, 1.0)
- Source : E:/KARTING 2024/Photo Kart/ligue/Le mans/854_5067.jpg
- Usage : premier écran de l'accueil (ordinateur) ; écran d'accueil du diagnostic (site 2)
- Alt : « Clément Daniel lancé à pleine vitesse dans son kart rouge numéro 25, l’arrière-plan filé par la vitesse, au circuit du Mans »

### piste-25-file-portrait
- Fichiers : piste-25-file-portrait-640 (640x800), -1280 (1280x1600), .jpg et .webp
- Cadre (refait le 06/10) : 4:5 serré sur le kart (environ 80 % de la largeur), ciel coupé, piste en bas ; recadré dans piste-25-file-2400 (x 710 à 1726, y 80 à 1350), le disque E: n'étant pas branché
- Étalonnage cinéma du 06/10 (voir plus bas) avec un dégradé neutre en haut : le haut de l'image est sombre dès la source (gris moyen 95/255 sur le cinquième du haut, contre 241 avant)
- Source : la même que piste-25-file
- Usage : premier écran de l'accueil (téléphone) ; diagnostic du site 2 (téléphone)
- Alt : celui de piste-25-file

### piste-25-contre-jour
- Fichiers : piste-25-contre-jour-640 (640x800), -1280 (1280x1600), -1600 (1600x2000), .jpg et .webp
- Cadre : 4:5, boîte (0.0, 0.17, 1.0, 1.0)
- Source : E:/2025/KARTING/Photo Kart/IMG_6767.jpeg
- Usage : page /liens
- Alt : « Clément Daniel au volant de son kart rouge numéro 25, face à l’objectif, dans la lumière dorée d’une fin de journée »

### piste-95-dos-virage
- Fichiers : piste-95-dos-virage-960 (960x540), -1600 (1600x900), -2400 (2400x1350), .jpg et .webp
- Cadre : 16:9, boîte (0.0, 0.10, 1.0, 1.0)
- Source : E:/KARTING 2024/Photo Kart/mina/MINA LAVAL 2022/DSC_1133.jpg
- Usage : premier écran de /guide, avec le tracé ; page 404
- Alt : « Clément Daniel, vu de dos dans son kart numéro 95, au milieu d’un virage à gauche bordé d’un vibreur »

### piste-95-dos-virage-portrait
- Fichiers : piste-95-dos-virage-portrait-640 (640x800), -1280 (1280x1600), .jpg et .webp
- Cadre : 4:5, boîte (0.25, 0.0, 0.92, 1.0)
- Source : la même que piste-95-dos-virage
- Usage : premier écran de /guide et 404 (téléphone)
- Alt : celui de piste-95-dos-virage

### piste-95-epingle
- Fichiers : piste-95-epingle-640 (640x800), -1280 (1280x1600), .jpg et .webp
- Poids : la 1280 est reencodee le 06/10 depuis l export (lissage 0,7 px, WebP 64 : 146 Ko au lieu de 285 ; JPEG 72 : 243 Ko). Le bitume tres detaille gonflait le fichier ; le grain CSS des cadres .cine le remplace a l ecran.
- Cadre : 4:5, boîte (0.05, 0.0, 0.70, 1.0)
- Source : E:/2025/KARTING/Photo Kart/lcp_mina_ancenis_20240907_0161_HD.jpeg
- Usage : « Pourquoi moi » (/consulting)
- Alt : « Clément Daniel, vu de dos dans son kart numéro 95, collé au vibreur à l’entrée d’une épingle »

### pilote-contre-jour
- Fichiers : pilote-contre-jour-640 (640x800), -1280 (1280x1600), .jpg et .webp
- Cadre : 4:5, boîte (0.0, 0.08, 1.0, 1.0)
- Source : E:/KARTING 2024/Photo Kart/ligue/ancenis/wetransfer__isa6387-jpg_2023-04-10_1856/_ISA6387.jpg
- Usage : « Qui l'a écrit » (/guide), « Clément Daniel, pilote et créateur » (/marques), « Qui regarde ta vidéo » (site 2)
- Alt : « Clément Daniel de profil, casque sur la tête, en contre-jour dans la lumière du soir »

### cockpit-volant
- Fichiers : cockpit-volant-640 (640x800), -1280 (1280x1600), .jpg et .webp
- Cadre : 4:5, boîte (0.30, 0.0, 0.90, 1.0)
- Source : E:/2025/KARTING/Photo Kart/IMG_3187.jpeg
- Usage : offre « L'analyse de ton onboard » de l'accueil
- Alt : « Clément Daniel installé dans son kart, casque et visière iridescente, les mains sur le volant »

### cockpit-dessus
- Fichiers : cockpit-dessus-640 (640x800), -1280 (1280x1600), .jpg et .webp
- Cadre : 4:5, boîte (0.10, 0.0, 0.80, 1.0)
- Source : E:/2025/KARTING/Photo Kart/IMG_2773.jpeg
- Usage : « Des vidéos qui sont vues » (/marques)
- Alt : « Vue plongeante sur Clément Daniel dans son kart, les mains sur le volant, comme une caméra embarquée »

### piste-795-public-portrait
- Fichiers : piste-795-public-portrait-640 (640x800), -1280 (1280x1599), .jpg et .webp
- Cadre : 4:5, boîte (0.22, 0.0, 0.82, 1.0)
- Source : E:/KARTING 2024/Photo Kart/nsk/NSK ESSAY/IMG_4349.jpeg
- Usage : premier écran de /consulting (téléphone) ; offre consulting de l'accueil
- Alt : celui de piste-795-public

### piste-95-arriere
- Fichiers : piste-95-arriere-640 (640x427), -1280 (1280x853), .jpg et .webp
- Cadre : 3:2 (photo entière)
- Source : E:/2025/KARTING/Photo Kart/IMG_4439.jpeg
- Usage : « Comment ça se passe » de la saison (/marques), à la place de marques-cockpit-logos
- Alt : « Le kart numéro 95 de Clément Daniel vu de l’arrière, son nom et les logos de partenaires sur la combinaison et le ponton »

### Étalonnage cinéma (06/10/2026)

Pour que les photos du contenu fondent dans le noir comme celles des premiers écrans : noirs plus denses (point noir 3 %, gamma 1,06), hautes lumières baissées par un genou doux au-dessus de 52 %, vignettage léger, dégradé neutre en haut quand le ciel est clair. Le calcul porte sur la luminance seule : teintes et rouges intacts. Script : scratchpad photos-tri/etalonnage_cine.py (repart des exports d'avant, copiés dans origines-t2, pour ne jamais retoucher deux fois). Mêmes noms, mêmes tailles, aucune métadonnée.
- piste-25-file-portrait (nouveau cadre, ci-dessus)
- clement-drapeau (ciel gris assombri en haut)
- piste-795-public-portrait
- cockpit-volant

### Existantes, toujours utilisées en V5
- clement-drapeau (de dos) : « Qui je suis » de l'accueil
- piste-95-virage : bloc final de /guide
- piste-795-public : premier écran de /consulting (ordinateur)
- paddock-echange-pilote : « Ce que ça change » (/consulting)
- piste-695-ciel : premier écran de /marques
- marques-combinaison-kart : « Inclus dans toutes les formules » (/marques)
- paddock-gants : « Ce que mes vidéos font » (/marques)

À confirmer par Clément : le kart numéro 25 (piste-25-file, piste-25-contre-jour) est bien le sien (même autocollant de châssis « 1817 » que le kart 95), et les crédits des photos (préfixes 854_, _ISA, lcp_, DSC_).

## Avant la V5 : Clément, visage visible (plus utilisées)

### clement-portrait
- Fichiers : clement-portrait-640 (640x800), clement-portrait-1280 (1280x1600), .jpg et .webp
- Cadre : portrait 4:5
- Source : E:/KARTING 2024/Photo Kart/rmcit/rmcit 2023 photo+/_ISA3496.jpg (même image dans E:/2025/KARTING/Photo Kart/IMG_7728.jpeg)
- Usage : page /liens (photo principale), page marques (bloc « qui vous parle »)
- Alt : « Clément Daniel, pilote de karting, de face en veste d'équipe grise, regard droit vers l'objectif, au bord d'une piste »

### clement-avatar
- Fichiers : clement-avatar-640 (640x640), clement-avatar-1280 (1280x1280), .jpg et .webp
- Cadre : carré, visage serré (même photo que le portrait)
- Source : E:/KARTING 2024/Photo Kart/rmcit/rmcit 2023 photo+/_ISA3496.jpg
- Usage : vignette ronde en haut de /liens, signature, bloc auteur du guide
- Alt : « Portrait de Clément Daniel, pilote de karting »

### clement-sourire
- Fichiers : clement-sourire-640 (640x800), clement-sourire-1280 (1280x1600), .jpg et .webp
- Cadre : portrait 4:5
- Source : E:/2025/KARTING/Photo Kart/IMG_3174.jpeg (série Le Mans, dossier HYPE RMCIT 22)
- Usage : accueil, section « qui je suis »
- Alt : « Clément Daniel sourit dans le paddock, protège-côtes sur les épaules, juste avant de prendre la piste »

### clement-trophee
- Fichiers : clement-trophee-640 (640x800), .jpg et .webp (une seule largeur : la photo d'origine ne fait que 2000 px de large, le recadrage serré en donne 760)
- Cadre : portrait 4:5, recadré pour sortir les autres personnes du champ
- Source : E:/2025/KARTING/Photo Kart/LCP03651_SD.jpeg (même image dans E:/KARTING 2024/Photo Kart/mina/MINA ANCENIS 2024/)
- Usage : page marques (preuve de résultats), accueil « qui je suis »
- Alt : « Clément Daniel tout sourire, un trophée d'Ancenis dans une main et son casque dans l'autre »

### clement-podium
- Fichiers : clement-podium-640 (640x800), clement-podium-1280 (1280x1600), .jpg et .webp
- Cadre : portrait 4:5 (photo entière)
- Source : E:/2023/karting/photo à compressée dossier rouge/8921B241-5C88-48FC-9F8A-E7449672DECF.jpg (photo de téléphone, 1440x1795)
- Usage : page marques, section palmarès
- Alt : « Clément Daniel sur la plus haute marche du podium au circuit ASK Laval, coupe à la main »
- Attention : les deux autres pilotes du podium sont reconnaissables (adultes, plan moyen). À garder seulement si Clément est d'accord, sinon utiliser clement-trophee.

## En piste (hero)

### piste-695-ciel
- Fichiers : piste-695-ciel-960 (960x540), -1600 (1600x900), -2400 (2400x1350), .jpg et .webp
- Cadre : 16:9
- Source : E:/2025/KARTING/Photo Kart/IMG_3183.jpeg (même image en 2000 px dans E:/HYPE RMCIT 22/IMG_3183.JPG)
- Usage : premier écran de /marques (V5) ; sert aussi à og-image.jpg (ancien premier écran de l'accueil)
- Alt : « Clément Daniel dans son kart Redspeed numéro 695, vu de profil en contre-plongée sous un ciel bleu chargé de nuages, sur la grille du circuit du Mans »

### piste-95-virage
- Fichiers : piste-95-virage-960 (960x640), -1600 (1600x1067), -2400 (2400x1600), .jpg et .webp
- Cadre : 3:2
- Source : E:/KARTING 2024/Photo Kart/mina/MINA LAVAL 2022/DSC_1120.jpg
- Usage : hero de la page guide
- Alt : « Clément Daniel en pleine courbe au volant de son kart rouge numéro 95, roue intérieure sur le vibreur »

### piste-795-public
- Fichiers : piste-795-public-960 (960x640), -1600 (1600x1067), -2400 (2400x1600), .jpg et .webp
- Cadre : 3:2
- Source : E:/KARTING 2024/Photo Kart/nsk/NSK ESSAY/IMG_4349.jpeg
- Usage : hero de la page consulting en piste (journée sur circuit)
- Alt : « Clément Daniel en course dans son kart bleu et blanc numéro 795, devant une tribune pleine de spectateurs »

### piste-795-vibreur
- Fichiers : piste-795-vibreur-640 (640x427), -1280 (1280x853), .jpg et .webp
- Cadre : 3:2
- Source : E:/KARTING 2024/Photo Kart/nsk/NSK VAL D'ARGENTON/IMG_2775.jpeg
- Usage : guide ou consulting (illustration de trajectoire), page marques (kart entier avec ses zones de déco)
- Alt : « Kart numéro 795 de Clément Daniel qui longe un vibreur rouge et jaune, casque Arai et combinaison bleue bien visibles »

## Paddock et échanges (consulting)

### paddock-pre-grille
- Fichiers : paddock-pre-grille-640 (640x427), -1280 (1280x853), .jpg et .webp
- Cadre : 3:2
- Source : E:/KARTING 2024/Photo Kart/mina/MINA LAVAL 2022/DSC_0234.jpg
- Usage : consulting en piste (la journée côté paddock, préparation du kart)
- Alt : « Clément Daniel en combinaison pousse son kart numéro 95 sur un chariot vers la pré-grille »
- Note : un membre de l'équipe (adulte, lunettes) est visible au second plan, à valider avec Clément.

### paddock-echange-pilote
- Fichiers : paddock-echange-pilote-640 (640x427), -1280 (1280x854), .jpg et .webp
- Cadre : 3:2
- Source : E:/KARTING 2024/Photo Kart/nsk/NSK ESSAY/IMG_4356.jpeg
- Usage : consulting en piste (échange avec un pilote) ; les deux pilotes ont le casque, aucun visage reconnaissable
- Alt : « Clément Daniel, casque sur la tête, serre la main d'un autre pilote sur la grille après une manche »

### paddock-gants
- Fichiers : paddock-gants-640 (640x800), -1280 (1280x1600), .jpg et .webp
- Cadre : portrait 4:5
- Source : E:/2025/KARTING/Photo Kart/IMG_3173.jpeg (série Le Mans, dossier HYPE RMCIT 22)
- Usage : consulting ou guide (bloc vertical à côté d'un texte), version mobile d'un hero
- Alt : « Clément Daniel casqué enfile ses gants avant de rouler, ciel bleu derrière lui »

## Marques (zones de logos)

### marques-combinaison-kart
- Fichiers : marques-combinaison-kart-640 (640x800), -1280 (1280x1600), .jpg et .webp
- Cadre : portrait 4:5
- Source : E:/KARTING 2024/Photo Kart/nsk/NSK VARENNES/IMG_2351.jpeg
- Usage : page marques, schéma des emplacements (casque, combinaison de la tête aux pieds, ponton du kart)
- Alt : « Clément Daniel debout dans son kart numéro 795, casque, combinaison et kart visibles en entier »

### marques-cockpit-logos
- Fichiers : marques-cockpit-logos-640 (640x427), -1280 (1280x853), .jpg et .webp
- Cadre : 3:2
- Source : E:/2025/KARTING/Photo Kart/IMG_4417.jpeg (Laval)
- Usage : page marques (exemple de logos partenaires portés sur la combinaison et le kart)
- Alt : « Clément Daniel s'installe dans son kart Redspeed numéro 95, logos de partenaires visibles sur la combinaison et le ponton »

## Partage

### og-image.jpg
- 1200x630, JPEG progressif qualité 82, sans métadonnées
- Source : E:/2025/KARTING/Photo Kart/IMG_3183.jpeg (même photo que piste-695-ciel)
- Usage : balise og:image et twitter:image de toutes les pages
- Alt (og:image:alt) : « Clément Daniel dans son kart Redspeed numéro 695 sous un ciel bleu »

## À valider par Clément

- Droits : ces photos viennent de photographes de course (préfixes 854_, _ISA, LCP, DSC, série HYPE). Vérifier qu'il a le droit de les utiliser sur un site commercial et s'il faut créditer quelqu'un.
- Les numéros de kart visibles sont 95, 695 et 795 (selon l'année et la course), pas 91.
