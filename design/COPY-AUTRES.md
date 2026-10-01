# Textes des autres pages du site 1 (lot 1)

Écrit le 24/09/2026 à partir du plan V4 (sections 2, 3, 5, 7, 8), des pages existantes (extrait-guide.html, mentions-legales.html, tableur-reglages.html) et du texte intégral du guide. Ce fichier est la source de copie pour /liens, /extrait, /journee-piste, /marques, /mentions-legales et la page /race-engineer-ai redirigée.

Règles appliquées partout : tutoiement, phrases courtes, une ligne = une idée, aucun tiret cadratin ni demi-cadratin, aucun emoji, aucune fausse urgence, aucun chiffre inventé, aucun prix ni lien Stripe écrit en dur. Les mots interdits par la section 7 du plan (ceux qui désignent un éducateur sportif) n'apparaissent nulle part dans ce fichier, y compris dans les notes.

## 0. Balises utilisées dans ce fichier

Tout ce qui est entre doubles accolades est remplacé par scripts/build.js depuis config/offres.json (lu le 24/09/2026). Les chemins ci-dessous sont ceux du fichier réel. Aucun texte de ce fichier ne contient la valeur en dur. Les prix s'écrivent toujours avec la balise `prix_affiche`, qui contient déjà l'espace insécable et le symbole euro.

| Balise | Ce qu'elle rend | Dans config/offres.json |
|---|---|---|
| `{{guide.titre}}` | Titre du livre | existe |
| `{{guide.pages}}` | Nombre de pages du PDF | existe |
| `{{guide.chapitres}}` | Nombre de chapitres | existe |
| `{{guide.prix_affiche}}` | Prix du guide, déjà formaté avec le symbole | existe |
| `{{debrief.prix_affiche}}` | Prix du débrief, déjà formaté | existe |
| `{{debrief.resume_ligne}}` | Sous-ligne du débrief | existe |
| `{{equitable.debrief_lecteur.prix_affiche}}` | Débrief au prix lecteur du guide | existe |
| `{{equitable.guide_lecteur.prix_affiche}}` | Guide au prix client du débrief | existe |
| `{{garantie_jours}}` | Durée de la garantie, nombre seul | existe |
| `{{delais.debrief_h}}` | Délai de livraison du débrief, nombre seul (la page écrit « h » après) | existe |
| `{{delais.reponse_email_h}}` | Délai de réponse à un email, nombre seul | existe |
| `{{delais.reponse_marques_h}}` | Délai de réponse aux marques, nombre seul (48) | à ajouter |
| `{{delais.suppression_video_jours}}` | Jours avant suppression d'une vidéo onboard | existe |
| `{{contact.email}}` | Adresse de contact en clair (Gmail au lot 1, `contact.email_cible` au lot 2) | existe |
| `{{lecteurs.phrase}}` | Chiffre de lecteurs daté, arrondi vers le bas | existe |
| `{{faits.ligne}}` | La ligne de faits, calculée par build.js : `faits.avec_titre` si `faits.afficher_titre` est vrai, sinon `faits.sans_titre` | calculée |
| `{{faits.avec_titre}}` `{{faits.sans_titre}}` | Les deux variantes | existent |
| `{{extrait.promesse}}` `{{extrait.promesse_v3}}` | Promesse de l'extrait, v2 et v3 | existent |
| `{{extrait.appel}}` `{{extrait.appel_v3}}` | Texte du lien vers /extrait | existent |
| `{{extrait.bouton}}` `{{extrait.bouton_v3}}` | Texte du bouton du formulaire | existent |
| `{{journee.sous_ligne}}` | Calculée par build.js : `journee.sous_ligne_liste_attente` ou `journee.sous_ligne_ouverte` selon `journee.statut` | calculée |
| `{{marque.nom}}` `{{marque.auteur}}` `{{marque.signature}}` | Clem Kart Racing, Clément Daniel, Clément | existent |
| `{{mis_a_jour}}` | Date de mise à jour de la config, affichée sur la page légale | existe |
| `{{routes.accueil}}` `{{routes.liens}}` `{{routes.guide}}` `{{routes.onboard}}` `{{routes.extrait}}` `{{routes.journee}}` `{{routes.marques}}` `{{routes.mentions}}` `{{routes.cgv}}` `{{routes.donnees}}` `{{routes.clement}}` | Adresses des pages | existent |
| `{{reseaux.instagram}}` `{{reseaux.tiktok}}` `{{reseaux.youtube}}` `{{reseaux.facebook}}` | Adresses des quatre réseaux (Facebook vide au 24/09 : l'icône ne s'affiche que si l'adresse est remplie) | existent |
| `{{legal.editeur}}` | « Clément Daniel EI, Clem Kart Racing » | existe |
| `{{legal.tva}}` | « TVA non applicable, art. 293 B du CGI » | existe |
| `{{legal.siren}}` | SIREN ; si vide, build.js écrit « en cours d'attribution » | existe, vide |
| `{{legal.adresse}}` | Adresse postale de l'EI | à ajouter |
| `{{legal.telephone}}` | Téléphone (obligatoire, loi du 21 juin 2004) | à ajouter |
| `{{legal.hebergeur}}` | « Netlify, Inc. » | existe |
| `{{legal.hebergeur_adresse}}` | Adresse complète de Netlify, recopiée depuis netlify.com/legal | à ajouter |
| `{{legal.mediateur}}` | Nom, adresse postale et site du médiateur ; si vide, phrase de repli de 5.2 | existe, vide |
| `{{legal.assureur}}` | Nom et adresse de l'assureur RC pro ; si vide, phrase de repli de 5.1 | existe, vide |
| `{{legal.supabase_region}}` | Région du projet Supabase | à ajouter |

Trois drapeaux pilotent des variantes de texte : `faits.afficher_titre` (vrai au 24/09), `journee.statut` (`liste_attente` au lot 1) et `extrait.version` (2 au lot 1, 3 au lot 2). Quand `legal.mediateur` ou `legal.assureur` est vide, build.js affiche la phrase de repli écrite dans le bloc concerné.

---

## 1. /liens (page de liens pour les trois bios)

Adresse dans les bios : `{{routes.liens}}?utm_source=instagram&utm_medium=bio` (pareil avec `tiktok` et `facebook`). Une colonne, fond noir, aucun menu, aucun formulaire, aucun compteur. Les cinq boutons sont de vrais liens qui marchent sans JavaScript.

### 1.0 Balises meta

- `<title>` : Clem Kart Racing · Le guide, le débrief et le reste
- `meta description` : Clément Daniel, pilote de karting. Le guide « {{guide.titre}} », l'analyse de ton onboard, la journée sur piste, les marques. Tout part d'ici.
- `robots` : index, follow (la page reçoit les clics des bios, elle doit être indexable)
- `canonical` : {{routes.liens}} (sans paramètres UTM)

### 1.1 Photo

Portrait 4:5 de Clément, visage visible, voile noir vers le bas. Alt : « Clément Daniel, casque sous le bras, sur la grille d'un circuit de karting » (à ajuster à la vraie photo fournie).

### 1.2 Nom

- Ligne 1 (h1, Bebas Neue) : CLÉMENT DANIEL
- Ligne 2 : Clem Kart Racing

### 1.3 Ligne de faits (une seule phrase, lue depuis la config)

Le build injecte `{{faits.ligne}}`, qui vaut l'une des deux variantes selon `faits.afficher_titre`. Décision de Clément du 24/09 : afficher le titre, donc `avec_titre` est la valeur active.

- `faits.avec_titre` : Pilote de karting depuis 8 ans, champion régional 2023 (NSK, Rotax Max). Je t'aide à rouler plus vite, sans promesse miracle.
- `faits.sans_titre` : 8 ans de compétition en karting. Je t'aide à rouler plus vite, sans promesse miracle.

### 1.4 Les 5 boutons (ordre exact, textes exacts, jamais un sixième)

| N° | Libellé du bouton | Sous-ligne | Cible | Style |
|---|---|---|---|---|
| 1 | LE GUIDE | {{guide.titre}} · {{guide.chapitres}} chapitres · {{guide.prix_affiche}} | {{routes.guide}} | Seul bouton plein rouge |
| 2 | ANALYSE DE TON ONBOARD | Ta vidéo commentée + 3 priorités, sous {{delais.debrief_h}} h · {{debrief.prix_affiche}} | {{routes.onboard}} | Contour |
| 3 | JOURNÉE SUR PISTE | {{journee.sous_ligne}} (voir dessous) | {{routes.journee}} | Contour |
| 4 | MARQUES ET PARTENAIRES | Collaboration commerciale, sponsoring : on en parle | {{routes.marques}} | Contour |
| 5 | LE SITE | YouTube, mon parcours, tout le reste | {{routes.accueil}} | Bouton fantôme, contour fin |

Sous-ligne du bouton 3, deux valeurs dans la config :

- `journee.sous_ligne_liste_attente`, utilisée quand `journee.statut = liste_attente` (valeur active au lot 1) : Liste d'attente, pas encore ouverte
- `journee.sous_ligne_ouverte`, utilisée quand `journee.statut = ouverte` : Une journée avec moi sur circuit · sur devis

Attributs pour le suivi : chaque bouton porte `data-bouton="guide|onboard|journee|marques|site"` et `data-position="1..5"` ; site.js envoie `bio_click` avec le bouton, la position et la plateforme lue dans `utm_source`, et réécrit chaque lien sortant avec `utm_source=<plateforme>&utm_medium=bio&utm_campaign=<bouton>`.

Chaque bouton fait 56 px de haut, pleine largeur, angles vifs. Aucun emoji, aucune icône dans les boutons.

### 1.5 Sous les boutons

1. Ligne de confiance : Paiement sécurisé par Stripe · Garantie {{garantie_jours}} jours en plus de tes droits légaux · Débrief livré sous {{delais.debrief_h}} h
2. Lien texte discret vers {{routes.extrait}} (mêmes paramètres UTM). Texte de la page : « Pas encore prêt ? » suivi de la balise d'appel choisie par `extrait.version` :
   - `extrait.version = 2` (lot 1) : Pas encore prêt ? {{extrait.appel}} (rend « Lis l'extrait gratuit »)
   - `extrait.version = 3` (lot 2) : Pas encore prêt ? {{extrait.appel_v3}} (rend « Lis 3 chapitres gratuits »)
3. Quatre icônes monochromes, dans cet ordre : Instagram, TikTok, YouTube, Facebook. Chaque icône est un lien avec un `aria-label` : « Instagram de Clem Kart Racing », « TikTok de Clem Kart Racing », « Chaîne YouTube de Clem Kart Racing », « Page Facebook de Clem Kart Racing ».
4. Dernière ligne : Mentions légales · Clem Kart Racing (« Mentions légales » est un lien vers {{routes.mentions}}).

### 1.6 Ce qui n'y est pas

Aucune mention de l'app, aucun lien Gumroad, aucun compteur d'abonnés, aucun prix de la journée sur piste, aucun formulaire.

---

## 2. /extrait (le cadeau gratuit)

Adresse conservée : /extrait (la redirection 301 vers extrait-guide.html reste en place pour ManyChat et les anciens blogs). Le formulaire existant est conservé tel quel : un champ email `id="lm-email"`, bouton `id="lm-btn"`, message `id="lm-msg"`, envoi POST vers `/.netlify/functions/send-email` avec `{ email, magnet: "extrait" }`, événement `extrait_signup` après succès. Seuls les textes, les couleurs (plus d'or) et les liens changent.

### 2.0 La promesse, deux versions pilotées par `extrait.version`

- `extrait.version = 2` (active au lot 1, ce que send-email envoie aujourd'hui), balise `{{extrait.promesse}}` : l'introduction et le chapitre du freinage dégressif, plus mon tableur de réglages
- `extrait.version = 3` (prête pour le lot 2, activée seulement quand le PDF v3 est en ligne), balise `{{extrait.promesse_v3}}` : l'entrée de virage complète, les mains, le freinage dégressif, la rotation, plus mon tableur de réglages

La page a donc deux jeux de textes ci-dessous, notés (v2) et (v3). Le build choisit le jeu selon `extrait.version`. Tant que le PDF v3 n'est pas en ligne, la page ne promet jamais 3 chapitres.

### 2.1 Balises meta

- `<title>` (v2) : Extrait gratuit du guide karting · Clem Kart Racing
- `<title>` (v3) : 3 chapitres gratuits du guide karting · Clem Kart Racing
- `meta description` (v2) : L'introduction du guide « {{guide.titre}} » et le chapitre entier sur le freinage dégressif, plus mon tableur de réglages. Gratuit, par email.
- `meta description` (v3) : Les mains, le freinage dégressif, la rotation : 3 chapitres du guide « {{guide.titre}} », plus mon tableur de réglages. Gratuit, par email.

### 2.2 Navigation

- Logo : Clem Kart Racing (vers {{routes.accueil}})
- Lien retour : Retour au site
- Bouton de nav : Le guide · {{guide.prix_affiche}} (vers {{routes.guide}})

### 2.3 Hero

Petit libellé au-dessus du titre (une seule fois sur la page) : Gratuit · Par email

Titre h1 (v2) : L'EXTRAIT DU GUIDE, GRATUIT
Titre h1 (v3) : 3 CHAPITRES DU GUIDE, GRATUITS : LES MAINS, LE FREINAGE DÉGRESSIF, LA ROTATION.

Sous-titre (v2) : L'introduction complète de « {{guide.titre}} » et le chapitre entier sur le freinage dégressif. Plus mon tableur de réglages en cadeau. À tester à ta prochaine session.

Sous-titre (v3) : L'entrée de virage complète, à tester à ta prochaine session. Plus mon tableur de réglages en cadeau.

### 2.4 Formulaire (un seul champ)

- Libellé au-dessus du champ (v2) : Reçois l'extrait par email
- Libellé au-dessus du champ (v3) : Reçois les 3 chapitres par email
- Champ email, placeholder : Ton email
- Bouton (v2) : {{extrait.bouton}} (rend « Recevoir l'extrait »)
- Bouton (v3) : {{extrait.bouton_v3}} (rend « Recevoir les 3 chapitres »)
- Sous le bouton : Aucun spam. Désinscription en un clic.
- Bouton pendant l'envoi : Envoi en cours
- Bouton après succès : Envoyé. Regarde ta boîte mail
- Message après succès : Si tu ne vois rien dans 2 minutes, regarde dans Promotions ou Spam.
- Message d'erreur : L'envoi n'a pas marché. Réessaie, ou écris-moi à {{contact.email}}.

Note : le bouton après succès ne change plus de couleur vers l'or. Il passe sur le fond sombre du site avec le texte ci-dessus.

### 2.5 Ce que tu reçois (blocs séparés par des filets, pas des cartes)

Titre de section : CE QUE TU REÇOIS

Version v2 (trois blocs) :

1. L'introduction complète
   Pourquoi tu stagnes malgré les heures de roulage. Le guide part d'une idée simple : un kart n'a pas besoin d'être forcé, il a besoin d'être compris. L'introduction pose cette grille de lecture.
2. Chapitre 04 · Le freinage dégressif
   Un chapitre entier, tel qu'il est dans le guide. Pourquoi la façon dont tu relâches le frein compte plus que la façon dont tu appuies. Et pourquoi c'est le relâché qui décide si le kart pivote.
3. Le tableur de réglages
   Dans le même email. Trois onglets : Journal, Diagnostic express, Pressions et pluie. Tu notes ce que tu changes, session après session, pour arrêter de deviner.

Version v3 (quatre blocs) :

1. Chapitre 03 · Les mains du pilote
   Le volant n'est pas une commande, c'est un capteur. Pourquoi serrer plus fort te fait perdre du temps, et comment laisser l'avant vivre.
2. Chapitre 04 · Le freinage dégressif
   Fort quand la vitesse le permet, puis un relâché qui suit la baisse de vitesse. C'est le relâché, et seulement le relâché, qui décide si le kart pivote.
3. Chapitre 05 · La rotation
   La rotation n'est pas un geste, c'est un résultat. La fenêtre où le kart accepte de pivoter, et comment la sentir.
4. Le tableur de réglages
   Dans le même email. Trois onglets : Journal, Diagnostic express, Pressions et pluie. Tu notes ce que tu changes, session après session, pour arrêter de deviner.

### 2.6 La ligne honnête (texte courant, sous les blocs)

Version v2 : Pas de réglage de carburation, pas de promesse de chrono. Tu reçois un email tout de suite, puis un seul rappel une semaine plus tard. Désinscription à chaque email.

Version v3 : Pas de réglage de carburation, pas de promesse de chrono. Tu reçois un email tout de suite, puis 5 emails sur deux semaines. Désinscription à chaque email.

Note : la phrase v2 décrit ce que relance-guide.js fait aujourd'hui (un seul email J+7). Le jour où la séquence de 6 emails est en ligne, la phrase v3 devient vraie et pas avant.

### 2.7 Le guide complet (bloc de fin)

- Texte : Tu veux la méthode entière, les {{guide.chapitres}} chapitres, dans l'ordre ?
- Bouton : Le guide complet · {{guide.prix_affiche}} (vers {{routes.guide}})
- Sous le bouton : PDF · {{guide.pages}} pages · Garantie {{garantie_jours}} jours en plus de tes droits légaux

### 2.8 Pied de page

- Retour au site (vers {{routes.accueil}})
- Mentions légales (vers {{routes.mentions}})
- Clem Kart Racing · Clément Daniel

Le lien « Découvrir l'app IA » disparaît. Le bloc « Reçois le tableur seul » de tableur-reglages.html n'est pas repris ici : le tableur arrive avec l'extrait.

---

## 3. /journee-piste (liste d'attente, aucun paiement)

Version courte du lot 1 : titre, trois lignes, formulaire réduit, accusé de réception. Tant que `journee.statut = liste_attente`, aucun prix, aucun devis, aucune date. Aucun mot qui désigne un éducateur sportif ne décrit Clément.

### 3.0 Balises meta

- `<title>` : Journée sur piste · Liste d'attente · Clem Kart Racing
- `meta description` : Une journée avec moi sur circuit, un jour. Pas encore ouverte : laisse ton email et ta région, je te préviens quand c'est possible. Aucun prix, aucun paiement.
- `robots` : index, follow

### 3.1 En-tête

Titre h1 : JOURNÉE SUR PISTE

Texte d'en-tête (les trois lignes, exactes) :

Je ne propose pas encore de journée encadrée payante : la loi demande une carte professionnelle d'éducateur sportif, je m'en occupe.
Laisse ton email et ta région, je te préviens le jour où c'est possible.
Aucune date, aucun prix, aucun paiement aujourd'hui.

### 3.2 Formulaire réduit

Titre du formulaire : Me prévenir à l'ouverture

| Champ | Type | Libellé | Obligatoire |
|---|---|---|---|
| email | email | Ton email | oui |
| region | texte court | Ta région (ou ton département) | oui |
| niveau | liste | Ton niveau aujourd'hui | oui |
| rgpd | case à cocher | (texte ci-dessous) | oui |
| site_web | texte, caché aux humains | champ anti-spam, doit rester vide | non |

Options de la liste « niveau », dans cet ordre :

1. Loisir, débutant
2. Loisir, régulier
3. Compétition club
4. Régional
5. National

Texte de la case RGPD : J'accepte que Clément Daniel garde mon email et ma région pour me prévenir de l'ouverture de la journée sur piste. Rien d'autre. Suppression au bout de 12 mois. Détails dans la page données.

(« page données » est un lien vers {{routes.donnees}}.)

Bouton : Me prévenir à l'ouverture

Sous le bouton : Sans engagement. Tu ne reçois rien d'autre que ce message d'ouverture.

### 3.3 Accusé de réception dans la page (remplace le formulaire après envoi)

Merci, je note ta demande. Je te préviens dès que je peux ouvrir, sans engagement de ta part.

Message d'erreur : L'envoi n'a pas marché. Réessaie, ou écris-moi à {{contact.email}}.

### 3.4 Email d'accusé de réception automatique (envoyé par send-email, attribut Brevo JOURNEE_ATTENTE)

- Objet : Bien reçu : je te préviens à l'ouverture
- Corps :

Salut,

Merci, je note ta demande pour une journée sur piste.
Je te préviens dès que je peux ouvrir, sans engagement de ta part.
Aucune date, aucun prix, aucun paiement aujourd'hui.

En attendant, le guide et le débrief d'onboard sont là : {{routes.guide}} et {{routes.onboard}}.

Clément
Clem Kart Racing

Tu peux demander la suppression de ta demande à tout moment en répondant à cet email.

### 3.5 Ce qui n'y est pas

Pas de prix, pas de devis, pas de date, pas de bouton de paiement, pas de champ téléphone, âge, châssis ni licence (ils n'arrivent qu'à l'ouverture). Pas de bouton vers Stripe.

### 3.6 Variante quand `journee.statut = ouverte` (à ne pas publier au lot 1)

Réservée à la levée du verrou légal de la section 7 du plan. Le texte d'en-tête, la réponse type et le modèle de devis sont stockés hors site, marqués « NE PAS UTILISER avant levée du verrou ». Ce fichier ne les contient pas volontairement.

---

## 4. /marques (collaboration commerciale, sponsoring)

Version courte du lot 1 : titre, trois lignes, formulaire commun, accusé de réception. Le bloc audience, le kit média et la FAQ arrivent au lot 2. Jamais de lien Stripe sur cette page : devis, contrat, facture.

### 4.0 Balises meta

- `<title>` : Marques et partenaires · Clem Kart Racing
- `meta description` : Je fais des vidéos de karting que des pilotes regardent en entier. Collaboration commerciale ou sponsoring : écris-moi, je réponds sous {{delais.reponse_marques_h}} h.
- `robots` : index, follow

### 4.1 En-tête

Titre h1 : MARQUES ET PARTENAIRES

Les trois lignes :

Je fais des vidéos de karting que des pilotes regardent en entier.
Vidéo sponsorisée, produit testé sur piste, contenu livré à ta marque, logo sur mon kart pour une saison : on en parle.
Tu écris, je réponds sous {{delais.reponse_marques_h}} h. Chaque contenu payé porte la mention « Collaboration commerciale ».

### 4.2 Formulaire commun (collaboration ou sponsoring)

Titre du formulaire : Me contacter pour une collaboration

| Champ | Type | Libellé | Obligatoire |
|---|---|---|---|
| profil | choix unique | Je suis | oui |
| societe | texte | Société ou marque | oui |
| prenom | texte | Ton prénom | oui |
| email | email | Ton email | oui |
| site | texte | Site ou compte Instagram | non |
| objectif | texte court | Ce que tu cherches, en une phrase | oui |
| formats | cases à cocher | Formats qui t'intéressent | non |
| budget | liste | Fourchette de budget | non |
| delai | liste | Quand | non |
| message | texte long | Ton message | non |
| rgpd | case à cocher | (texte ci-dessous) | oui |
| site_web | texte, caché aux humains | champ anti-spam, doit rester vide | non |

Options « Je suis » : Une marque · Un futur sponsor · Autre

Le choix « Un futur sponsor » remplace l'intitulé des formats par « Ce qui t'intéresse » et ses options par celles de la deuxième liste ci-dessous. Sans JavaScript, les deux listes restent visibles et le formulaire marche quand même.

Formats (marque) : Vidéo sponsorisée · Produit testé sur piste · Vidéo livrée à la marque, non publiée chez moi · Programme ambassadeur à la saison · Je ne sais pas encore

Ce qui t'intéresse (sponsor) : Logo sur le kart · Logo sur la combinaison ou le casque · Mention dans les vidéos · Posts dédiés · Je ne sais pas encore

Fourchette de budget : Moins de 300 € · 300 à 1 000 € · 1 000 à 3 000 € · Plus · Je ne sais pas encore

Quand : Ce mois-ci · Dans les 3 mois · Plus tard · Pas de date

Texte de la case RGPD : J'accepte que Clément Daniel garde ces informations pour répondre à ma demande. Conservation 3 ans après le dernier échange. Détails dans la page données.

Bouton : Envoyer ma demande

Sous le bouton : Réponse humaine sous {{delais.reponse_marques_h}} h. Pas de devis automatique, pas de tarif public : on en parle d'abord.

### 4.3 Accusé de réception dans la page

Bien reçu. Je te réponds sous {{delais.reponse_marques_h}} h avec ce que je propose et ce que je refuse.

Message d'erreur : L'envoi n'a pas marché. Réessaie, ou écris-moi à {{contact.email}}.

### 4.4 Email d'accusé de réception automatique (send-email, attribut Brevo COLLAB_DEMANDE ou SPONSOR_DEMANDE selon le profil)

- Objet : Bien reçu : je te réponds sous {{delais.reponse_marques_h}} h
- Corps :

Bonjour,

Merci pour ta demande. Je la lis moi-même et je te réponds sous {{delais.reponse_marques_h}} h.

Trois choses pour gagner du temps :
Je ne fais pas la promotion d'un produit que je n'utiliserais pas.
Je ne fais pas de promesse miracle et pas de faux avis.
Chaque contenu payé porte la mention « Collaboration commerciale ».

Si c'est bon pour toi aussi, on trouve un format, je t'envoie un devis, on signe un contrat d'une page.

Clément Daniel
Clem Kart Racing

Au lot 2, cet email part avec le kit média en pièce jointe. Au lot 1, il part sans pièce jointe et le texte reste le même.

### 4.5 Ce qui n'y est pas au lot 1

Pas de bloc audience (les chiffres datés arrivent au lot 2), pas de tarifs, pas de kit média en téléchargement libre, pas de mur de trophées, pas de mot « mécénat », « don » ou « reçu fiscal ».

---

## 5. /mentions-legales (une page, trois ancres : #mentions, #cgv, #donnees)

/cgv et /confidentialite redirigent en 301 vers /mentions-legales?section=cgv et ?section=donnees ; trois lignes de JavaScript font défiler jusqu'à l'ancre, et sans JavaScript la page complète s'affiche. Réécriture complète : plus aucune mention de Gumroad comme vendeur, de « particulier », de l'ancien domaine en .com ni de la plateforme européenne de règlement en ligne des litiges (fermée le 20 juillet 2025). L'email est en clair, sans script de masquage.

### 5.0 Balises meta et en-tête

- `<title>` : Mentions légales, CGV et données · Clem Kart Racing
- `meta description` : Éditeur, hébergeur, conditions de vente du guide et du débrief, droit de rétractation, garantie {{garantie_jours}} jours, données personnelles. Tout sur une page.
- `robots` : index, follow

Titre h1 : MENTIONS LÉGALES

Sous le titre : Trois parties sur une seule page : l'éditeur du site, les conditions de vente, tes données. Mise à jour le {{mis_a_jour}}.

Sommaire (trois liens d'ancre) : Mentions · Conditions de vente · Données personnelles

---

### 5.1 Bloc #mentions

#### Éditeur et directeur de la publication

{{legal.editeur}}
Adresse : {{legal.adresse}}
Téléphone : {{legal.telephone}}
Email : {{contact.email}}
SIREN : {{legal.siren}}
TVA non applicable, art. 293 B du CGI.

Le site est exploité sous le nom Clem Kart Racing.

#### Hébergeur

Netlify, Inc.
{{legal.hebergeur_adresse}}
Site : netlify.com

#### Services utilisés

Paiement : Stripe. Le paiement se fait sur une page Stripe, jamais sur ce site. Je ne vois jamais ton numéro de carte.
Emails : Brevo, pour l'envoi de l'extrait, des rappels et des accusés de réception.
Mesure d'audience : anonyme, sans cookie, sans adresse IP conservée (base Supabase). Voir le bloc Données.

#### Assurance

Responsabilité civile professionnelle : {{legal.assureur}}.

Phrase de repli quand `{{legal.assureur}}` est vide : Assurance responsabilité civile professionnelle en cours de souscription pour l'activité de conseil et d'analyse vidéo, sans encadrement sur piste. Cette ligne sera mise à jour à la signature du contrat.

#### Propriété intellectuelle

Les textes, photos et vidéos de ce site, le guide « {{guide.titre}} », l'extrait gratuit et le tableur de réglages sont la propriété de {{marque.auteur}}.
Tu peux les lire, les utiliser pour toi et en parler. Tu ne peux pas les copier, les revendre ni les publier, en entier ou en partie, sans mon accord écrit. Toute reproduction non autorisée est une contrefaçon (articles L335-2 et suivants du Code de la propriété intellectuelle).

#### Contact

Pour toute question sur le site, un achat ou tes données : {{contact.email}}. Je réponds sous {{delais.reponse_email_h}} h les jours ouvrés.

---

### 5.2 Bloc #cgv (conditions générales de vente)

Titre h2 : CONDITIONS GÉNÉRALES DE VENTE

Intro : Ces conditions s'appliquent à tout achat fait sur ce site auprès de {{legal.editeur}}, par un consommateur. Elles sont acceptées au moment du paiement, sur la page Stripe, en cochant la case prévue. Les prix sont en euros, TVA non applicable (art. 293 B du CGI). Le paiement est unique, par carte, sur une page sécurisée Stripe. Une facture est émise automatiquement pour chaque paiement.

#### Article 1 · Le guide « {{guide.titre}} »

Ce que tu achètes : un livre numérique au format PDF, {{guide.pages}} pages, {{guide.chapitres}} chapitres, en français. Prix : {{guide.prix_affiche}}. Paiement unique.

Livraison : juste après le paiement, la page « merci » affiche les liens de téléchargement du guide et du tableau de réglages. Garde cette page dans tes favoris. Tu reçois aussi le reçu et la facture Stripe par email. Si tu perds le lien, écris-moi à {{contact.email}} : je te le renvoie dans la journée.

Usage : le guide est pour toi. Tu peux le lire sur tous tes appareils et l'imprimer pour toi. Tu ne peux pas le partager, le revendre ni le publier.

Rétractation : le guide est un contenu numérique fourni sans support matériel. En payant, tu demandes l'accès immédiat au PDF et tu acceptes de perdre ton droit de rétractation de 14 jours une fois le téléchargement disponible (art. L221-28 13° du Code de la consommation). Cette case est cochée sur la page Stripe avant le paiement. Texte exact coché : « En payant, je demande l'accès immédiat au PDF et j'accepte de perdre mon droit de rétractation de 14 jours une fois le téléchargement disponible (art. L221-28 13° du Code de la consommation). La garantie {{garantie_jours}} jours de Clément s'ajoute à mes droits légaux. »

Garantie {{garantie_jours}} jours, en plus de tes droits légaux : tu lis. Si ça ne t'apporte rien, un email à {{contact.email}} dans les {{garantie_jours}} jours qui suivent l'achat et je te rembourse. Sans justification, sans formulaire. Le remboursement part sur la carte utilisée, via Stripe, sous 14 jours au plus. Cette garantie est un engagement de ma part. Elle ne remplace ni ne limite aucun de tes droits légaux, dont la garantie légale de conformité des contenus numériques (articles L224-25-12 et suivants du Code de la consommation).

#### Article 2 · L'analyse d'onboard (débrief personnalisé)

Ce que tu achètes : je regarde ta vidéo onboard en entier, je te renvoie par email une vidéo commentée, 3 priorités et un objectif. Prix : {{debrief.prix_affiche}}. Paiement unique. Délai : sous {{delais.debrief_h}} h après réception d'une vidéo exploitable.

Ce qu'il te faut : une vidéo onboard de toi, lisible, d'au moins un tour complet, envoyée par le lien demandé sur la page Stripe. Si ta vidéo est inexploitable, je te le dis avant de commencer et je te rembourse en entier.

Ce que ce n'est pas : un débrief est un regard extérieur sur ta vidéo, à distance. Ce n'est ni une séance sur piste ni un encadrement. Je ne suis pas sur le circuit avec toi.

Option au paiement : sur la page Stripe du débrief, tu peux ajouter le guide à {{equitable.guide_lecteur.prix_affiche}} au lieu de {{guide.prix_affiche}}. Il t'est envoyé par email, avec ta vidéo commentée ou avant si tu me le demandes.

Rétractation : le débrief est une prestation de service. En payant, tu demandes que le travail commence avant la fin du délai de rétractation de 14 jours. Si tu te rétractes avant la livraison, tu paies le travail déjà fait au prorata (art. L221-25 du Code de la consommation). Une fois la vidéo commentée livrée, la prestation est entièrement exécutée et il n'y a plus de rétractation (art. L221-28 1°). Texte exact coché sur la page Stripe : « En payant, je demande que le débrief commence avant la fin du délai de rétractation de 14 jours. Si je me rétracte avant la livraison, je paie le travail déjà fait au prorata ; une fois la vidéo livrée, il n'y a plus de rétractation (art. L221-25). »

Garantie {{garantie_jours}} jours, en plus de tes droits légaux : elle court à partir de la réception de ta vidéo commentée. Si le débrief ne t'apporte rien, un email dans les {{garantie_jours}} jours et je te rembourse. Sans justification. Elle ne remplace ni ne limite tes droits légaux.

Ta vidéo : elle reste entre toi et moi. Elle n'est jamais publiée. Elle est supprimée {{delais.suppression_video_jours}} jours après la livraison du débrief.

#### Article 3 · Prix équitables entre les deux offres

Si tu as le guide et que tu prends ensuite le débrief, il passe à {{equitable.debrief_lecteur.prix_affiche}} au lieu de {{debrief.prix_affiche}}. Si tu as le débrief et que tu prends ensuite le guide, il passe à {{equitable.guide_lecteur.prix_affiche}} au lieu de {{guide.prix_affiche}}. Dans les deux sens, les deux offres coûtent le même total. Ces liens te sont donnés sur la page « merci » et par email, jamais ailleurs.

#### Article 4 · Journée sur piste

Aucune journée sur piste n'est vendue sur ce site aujourd'hui. La page {{routes.journee}} est une liste d'attente : aucun prix, aucun devis, aucun paiement. Cet article sera écrit le jour où l'offre ouvre, avec ses propres conditions de rétractation, d'annulation et de météo.

#### Article 5 · Responsabilité

Le guide et le débrief sont des conseils de pilotage. Tu les mets en pratique sous ta propre responsabilité, dans le respect du règlement du circuit, avec ton équipement et ton assurance. Ils ne remplacent ni un encadrement diplômé ni une licence.

#### Article 6 · Formulaire de rétractation

Tu n'as pas besoin de ce formulaire pour la garantie {{garantie_jours}} jours : un simple email suffit. Ce formulaire est le modèle légal (annexe à l'article R221-1 du Code de la consommation), utilisable dans les cas où le droit de rétractation s'applique encore. Tu peux le copier dans un email à {{contact.email}}.

À l'attention de {{legal.editeur}}, {{legal.adresse}}, {{contact.email}} :
Je vous notifie par la présente ma rétractation du contrat portant sur la vente du bien / pour la prestation de services ci-dessous :
Commandé le / reçu le :
Nom du consommateur :
Adresse du consommateur :
Signature du consommateur (uniquement en cas de notification du présent formulaire sur papier) :
Date :

#### Article 7 · Réclamation et médiation

Un problème ? Écris-moi d'abord à {{contact.email}} : je réponds sous {{delais.reponse_email_h}} h les jours ouvrés et on règle ça entre nous dans la plupart des cas.

En cas de litige non résolu, tu peux saisir gratuitement le médiateur de la consommation : {{legal.mediateur}} (art. L612-1 du Code de la consommation), après m'avoir écrit et au plus tard un an après ta réclamation écrite.

Phrase de repli quand `{{legal.mediateur}}` est vide : Le médiateur de la consommation est en cours de désignation ; son nom, son adresse et son site seront affichés ici dès la signature de la convention. En attendant, toute réclamation écrite à {{contact.email}} reçoit une réponse sous {{delais.reponse_email_h}} h les jours ouvrés.

Droit applicable : le droit français. Faute d'accord amiable, les tribunaux français sont compétents.

Note pour Clément : la médiation est obligatoire pour tout professionnel qui vend à des consommateurs. La phrase de repli ne vaut que quelques jours, le temps de signer avec un médiateur (liste sur la fiche F33338 de service-public). Aucune phrase sur la plateforme européenne de règlement en ligne : elle a fermé le 20 juillet 2025.

---

### 5.3 Bloc #donnees (données personnelles)

Titre h2 : TES DONNÉES

Intro : Ce site collecte le strict nécessaire. Voici quoi, pourquoi, combien de temps, et avec qui. Responsable du traitement : {{legal.editeur}}, {{contact.email}}.

#### Ce que je collecte et pourquoi

Extrait gratuit et tableur : ton email, pour t'envoyer les fichiers, puis les rappels décrits sur la page {{routes.extrait}}. Base légale : ton consentement. Désinscription en un clic dans chaque email.
Achat du guide ou du débrief : ton email, ton nom et l'adresse de facturation demandés par Stripe, pour livrer, facturer et répondre à la garantie. Base légale : le contrat. Le numéro de carte n'arrive jamais jusqu'à moi.
Débrief : ta vidéo onboard, pour l'analyser. Base légale : le contrat. Elle n'est jamais publiée.
Liste d'attente de la journée sur piste : ton email, ta région et ton niveau, dans un seul but : te prévenir de l'ouverture. Base légale : ton consentement.
Marques et sponsors : les informations du formulaire, pour répondre à ta demande et préparer un devis. Base légale : les mesures précontractuelles à ta demande.
Messages Instagram et Facebook : si tu m'écris un mot-clé en commentaire ou en message, un outil me sert à te répondre et à t'envoyer le lien de l'extrait.

#### Combien de temps

Ta vidéo onboard : supprimée {{delais.suppression_video_jours}} jours après la livraison du débrief.
Emails de prospects (extrait, tableur, formulaires) : 3 ans après le dernier échange, puis supprimés.
Demandes de liste d'attente : 12 mois, puis supprimées.
Données de facturation : 10 ans, parce que la loi m'oblige à garder les factures (art. L123-22 du Code de commerce).

#### Avec qui (sous-traitants)

Stripe : paiement et factures.
Brevo : envoi des emails, hébergé dans l'Union européenne.
Netlify : hébergement du site et des formulaires, États-Unis, encadré par les clauses contractuelles types de la Commission européenne.
Supabase : statistiques anonymes du site, région {{legal.supabase_region}}.
ManyChat : réponses automatiques aux messages Instagram et Facebook, États-Unis.

Je ne vends ni ne loue aucune donnée. Aucune publicité ciblée.

#### Mesure d'audience

Le site compte les pages vues et les clics sans cookie, sans adresse IP conservée et sans identifiant qui te suive d'un site à l'autre. Un identifiant temporaire, effacé à la fermeture de l'onglet, sert seulement à ne pas compter deux fois la même visite. Aucune bannière n'est nécessaire.

#### Tes droits

Tu peux à tout moment demander l'accès à tes données, les corriger, les faire supprimer, t'opposer à un usage, retirer ton consentement ou demander une copie. Un email à {{contact.email}} suffit, je réponds sous un mois au plus. Si tu penses que je ne respecte pas tes droits, tu peux écrire à la CNIL (cnil.fr).

Un registre des traitements d'une page (prospects, clients, demandes) est tenu conformément à l'article 30 du RGPD et disponible sur demande.

---

### 5.4 Pied de page de la page légale

Clem Kart Racing · {{marque.auteur}} · Mentions · CGV · Données · Retour au site

---

## 6. /race-engineer-ai (page redirigée, noindex)

La page est retirée du site : plus de lien dans la navigation, les sections, le pied de page ni le sitemap. Elle porte `<meta name="robots" content="noindex, nofollow">` et une redirection 301 vers {{routes.accueil}} dans _redirects. Le texte ci-dessous n'existe que pour le cas où la redirection ne s'applique pas (aperçu local, cache). Il ne nomme pas le produit, pour qu'il reste invisible partout.

- `<title>` : Page retirée · Clem Kart Racing
- Titre h1 : CETTE PAGE N'EXISTE PLUS
- Texte : Ce que tu cherchais n'est plus proposé sur ce site. Si tu avais laissé ton email pour un accès anticipé, rien ne t'est demandé et rien ne sera prélevé. Une question ? Écris-moi à {{contact.email}}.
- Bouton : Retour à l'accueil (vers {{routes.accueil}})
- Lien secondaire : Voir le guide (vers {{routes.guide}})

Rappel pour Clément (hors page) : mettre en pause le formulaire d'accès anticipé dans Brevo, sinon des inscriptions continuent d'arriver.

---

## 7. Vérifications faites sur ce fichier

- Aucun tiret cadratin ni demi-cadratin dans le fichier (vérifié par recherche).
- Aucun emoji.
- Aucun des quatre prix, aucun lien Stripe, aucun lien Gumroad, aucune adresse Gmail : tout passe par les balises de la section 0. Le fichier passe le motif de test:prix sans exception.
- Aucun mot qui désigne un éducateur sportif ne décrit Clément. Le verbe « encadrer » n'apparaît que pour dire ce que Clément ne fait pas.
- Chaque chiffre affiché est vrai ou vient de la config : 8 ans, 2023, 30 jours, 3 ans, 12 mois, 10 ans, 14 jours, 20 juillet 2025.
- Les textes de renonciation à la rétractation sont mot pour mot ceux de la section 4 du plan, pour que la page Stripe et les CGV disent la même chose.
- La garantie est toujours écrite « en plus de tes droits légaux », jamais comme seule voie de remboursement.
- Aucune mention de l'app, de Gumroad comme vendeur, de « particulier », de l'ancien domaine en .com, ni de la plateforme européenne de règlement en ligne des litiges.

## 8. Points ouverts (à trancher hors de ce fichier)

1. Les balises de la section 0 suivent config/offres.json tel qu'il existe au 24/09. Cinq clés sont à ajouter dans la config : `delais.reponse_marques_h` (48), `legal.adresse`, `legal.telephone`, `legal.hebergeur_adresse`, `legal.supabase_region`. Deux valeurs sont à calculer par build.js : `faits.ligne` (selon `faits.afficher_titre`) et `journee.sous_ligne` (selon `journee.statut`). Le repli « en cours d'attribution » quand `legal.siren` est vide est aussi à écrire dans build.js.
2. `{{legal.mediateur}}`, `{{legal.assureur}}`, `{{legal.adresse}}`, `{{legal.telephone}}`, `{{legal.siren}}`, `{{legal.hebergeur_adresse}}` et `{{legal.supabase_region}}` sont à remplir par Clément (jour 0 du plan) ; la page légale ne doit pas partir en ligne avec le téléphone ou l'adresse vides.
3. La durée de conservation des données de facturation (10 ans, art. L123-22 du Code de commerce) est un ajout de ce fichier au plan : à confirmer avec le comptable.
4. ManyChat figure dans la liste des sous-traitants (comme dans le plan section 3) alors que le brief n'en cite que quatre : je l'ai gardé parce que c'est vrai.
5. La garantie légale de conformité des contenus numériques (art. L224-25-12 et suivants) est citée dans l'article 1 des CGV : à relire par Clément ou un juriste, comme le reste du bloc #cgv, avant la diffusion du lien Stripe.
6. Le texte v3 de /extrait (3 chapitres, 5 emails) ne doit être activé que quand le PDF v3 et la séquence de 6 emails sont en ligne, jamais avant.
7. Le formulaire de /marques adapte ses options au profil choisi : cette petite logique est à écrire dans site.js, avec un repli sans JavaScript (les deux listes visibles).
8. Les fonctions send-email pour JOURNEE_ATTENTE, COLLAB_DEMANDE et SPONSOR_DEMANDE n'existent pas encore : les textes des accusés de réception sont prêts ici pour celui qui les écrit.
