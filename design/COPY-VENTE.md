# COPY-VENTE : les textes des pages qui vendent

Version du 24/09/2026. Lot 1 du plan V4.
Pages couvertes : accueil (/), /guide, /merci-guide, /merci-guide-lecteur, /merci-onboard.

## Comment lire ce fichier

- Une section par page. Dans chaque section, un bloc par élément, avec son rôle entre crochets.
- Tout chiffre, prix, délai, garantie, email ou adresse de page est une balise `{{...}}` remplacée au build par config/offres.json. Aucun prix n'est écrit en dur ici.
- Les balises utilisées :
  - `{{offres.guide.prix_affiche}}` : prix du guide, avec le symbole.
  - `{{offres.guide.prix_lecteur_affiche}}` : prix du guide pour un acheteur du débrief.
  - `{{offres.guide.garantie_jours}}` : nombre de jours de garantie.
  - `{{offres.debrief.prix_affiche}}` : prix du débrief.
  - `{{offres.debrief.prix_lecteur_affiche}}` : prix du débrief pour un lecteur du guide.
  - `{{offres.debrief.delai_h}}` : délai de livraison du débrief, en heures.
  - `{{offres.lecteurs.affiche}}` : chiffre de lecteurs, déjà écrit avec « environ » et daté dans la config (exemple : « environ 80 pilotes depuis janvier »).
  - `{{offres.total_deux_affiche}}` : total des deux produits, identique dans les deux sens.
  - `{{contact.email}}` : adresse de contact.
  - `{{faits.ligne}}` : la ligne de faits, variante « avec titre » ou « sans titre » selon l'interrupteur `afficher_titre`.
  - `{{extrait.titre_court}}` et `{{extrait.lien_texte}}` : le nom du cadeau gratuit, qui change entre le lot 1 (intro + freinage dégressif) et le lot 2 (3 chapitres).
- Les boutons d'achat pointent vers les routes internes : `/aller/guide`, `/aller/onboard`, `/aller/guide-lecteur`, `/aller/onboard-lecteur`.
- Les trois messages de lecteurs sont repris mot pour mot de la page Gumroad, sans prénom : aucun accord écrit n'existe.
- Le mot « coaching » n'apparaît nulle part. Race Engineer AI et Gumroad n'apparaissent nulle part.

Règle de ton : tutoiement, phrases courtes, une ligne une idée, direct, fraternel. On vend le résultat, jamais le contenu. Le prix n'arrive jamais avant la valeur, sauf sur /guide où il est déjà connu du visiteur (bio, DM, email) et où le cacher se lirait comme un piège.

---

## 1. Accueil : /

**But** : le « tout le reste » du bouton 5 de la page de liens. En 10 secondes : qui tu es, les deux offres, le gratuit, YouTube, les marques.
**Action principale** : voir le guide.

### Balises meta

[title] Clem Kart Racing, pilote de karting : comprendre pourquoi tu vas vite
[meta description] Clément Daniel, {{faits.ligne}}. Un guide de pilotage karting, une analyse de ta vidéo onboard, et des chapitres gratuits pour commencer.

### Section 1 : hero

[h1]
Les rapides n'ont pas un truc en plus.
Ils font les mêmes erreurs que toi.
Eux savent lesquelles.

[sous-titre]
Je m'appelle Clément. Je roule en karting depuis 8 ans.
Je t'aide à comprendre ce que ton kart te dit, pour refaire tes bons tours exprès.

[bouton principal, vers /guide]
Voir le guide · {{offres.guide.prix_affiche}}

[lien texte sous le bouton, vers /onboard/]
Ou commence par le diagnostic gratuit : 7 questions, 2 minutes, sans email

[image]
Photo de Clément en piste, alt : « Clément Daniel en kart, en appui dans un virage ».

### Section 2 : ligne de faits

[texte, une ligne, depuis la config]
{{faits.ligne}}

Variante « avec titre » (valeur recommandée, décision 5) : « Pilote de karting depuis 8 ans, champion régional 2023 (NSK, Rotax Max). Je t'aide à rouler plus vite, sans promesse miracle. »
Variante « sans titre » : « 8 ans de compétition en karting. Je t'aide à rouler plus vite, sans promesse miracle. »

### Section 3 : les deux offres (deux blocs séparés par des filets, pas deux cartes identiques)

[libellé de section]
Deux façons de travailler avec moi

#### Bloc A : le guide

[titre du bloc]
Le guide : Comprendre comment rouler plus vite

[texte]
Tu sais faire un bon tour. Tu ne sais pas encore pourquoi il était bon.
Ce guide t'explique ce qui produit la vitesse dans un kart : les mains, le frein, la rotation, la remise de gaz, le grip.
Tu lis ce soir. Tu testes à ta prochaine session.

[ligne de faits produit]
PDF · 59 pages · 13 chapitres · Accès immédiat

[bouton, vers /guide]
Voir le guide · {{offres.guide.prix_affiche}}

[ligne sous le bouton]
Garantie {{offres.guide.garantie_jours}} jours, en plus de tes droits légaux · {{offres.lecteurs.affiche}}

#### Bloc B : l'analyse d'onboard

[titre du bloc]
L'analyse de ton onboard

[texte]
Tu m'envoies une vidéo que tu as déjà.
Je la regarde tour par tour et je te renvoie une vidéo commentée, tes 3 priorités et un seul objectif pour ta prochaine sortie.
Ta vidéo reste entre toi et moi.

[ligne de faits produit]
Vidéo commentée · 3 priorités · Livrée sous {{offres.debrief.delai_h}} h

[bouton, vers /onboard/]
Faire analyser ma vidéo · {{offres.debrief.prix_affiche}}

[ligne sous le bouton]
Garantie {{offres.guide.garantie_jours}} jours après réception, en plus de tes droits légaux

### Section 4 : messages de lecteurs

[titre de section]
Messages reçus de lecteurs, reproduits tels quels

[message 1]
« J'ai appris beaucoup et comme je suis visuel, ça fonctionne très bien. Je me suis vraiment amélioré en compétition, un podium le week-end dernier. Merci de tes conseils. »
[source] Pilote en compétition

[message 2]
« Franchement, c'est hyper bien fait. Bravo. Et je pense encore lire les exos, c'est une super idée. »
[source] Lecteur du guide

[message 3]
« Vraiment neuf, ça fait du bien à lire. Les concepts sont bien expliqués et c'est applicable rapidement. »
[source] Lecteur du guide

[note sous les messages, petit texte]
Sans étoiles, sans note. Ce sont des messages reçus, pas des avis notés.

### Section 5 : qui je suis

[titre de section]
Qui je suis

[image]
Portrait de Clément, casque sous le bras. Alt : « Clément Daniel, pilote de karting ».

[texte, 3 lignes]
Pas de mécano, pas de team. J'ai tout appris seul, session après session.
Longtemps, je ne comprenais pas pourquoi le tour d'avant était meilleur.
Le jour où j'ai trouvé les mots pour décrire ce que fait le kart, tout a changé. Ces mots, je te les donne.

[lien texte, vers /clement]
Mon parcours et mes vidéos

### Section 6 : gratuit

[titre de section]
Commence sans rien dépenser

[texte]
{{extrait.titre_court}}, plus mon tableur de réglages.
Tu les reçois par email, tout de suite.
Pas de réglage de carburation, pas de promesse de chrono.

[bouton secondaire, vers /extrait]
{{extrait.lien_texte}}

Valeurs attendues dans la config :
- Lot 1 : titre_court = « L'introduction et le chapitre sur le freinage dégressif, sortis tels quels du guide » ; lien_texte = « Lire l'extrait gratuit ».
- Lot 2 : titre_court = « 3 chapitres du guide : les mains, le freinage dégressif, la rotation » ; lien_texte = « Lire 3 chapitres gratuits ».

### Section 7 : et ensuite

[titre de section]
Et ensuite

[liens texte, un par ligne]
- Mes vidéos sur YouTube (lien externe)
- Une journée sur piste : liste d'attente (vers /journee-piste)
- Marques et partenaires (vers /marques)
- Sponsoriser ma saison (vers /marques#sponsors)

### Section 8 : footer

Partial commun. Contient {{contact.email}}, Mentions légales, CGV, réseaux.

---

## 2. Page de vente du guide : /guide

**But** : vendre le guide à un visiteur tiède, venu d'une vidéo, d'un DM ou d'un email. Seule page qui mène au paiement du guide.
**Action principale** : `/aller/guide`.
**Longueur** : 6 à 8 écrans de téléphone. Phrases de moins de 15 mots. Barre collante en bas dès que le hero est passé.
**Prix** : visible dès le hero. Il est déjà connu du visiteur.

### Balises meta

[title] Comprendre comment rouler plus vite : le guide de pilotage karting
[meta description] Un guide PDF de 59 pages pour comprendre pourquoi tes bons tours sont bons, et les refaire. Par Clément Daniel, {{faits.ligne}}. Garantie {{offres.guide.garantie_jours}} jours.

### Barre collante (apparaît après le hero)

[texte de gauche]
Le guide · {{offres.guide.prix_affiche}}

[bouton, vers /aller/guide]
Obtenir le guide

### Section 1 : hero, la promesse

[surtitre, petit]
Guide de pilotage karting · PDF

[h1]
Comprendre comment rouler plus vite

[accroche]
Tu sais faire un bon tour.
Tu ne sais pas encore pourquoi il était bon.
Ce guide te l'explique, pour que tu le refasses.

[image]
La vraie couverture du PDF. Alt : « Couverture du guide Comprendre comment rouler plus vite ».

[ligne de faits produit]
PDF · 59 pages · 13 chapitres · Accès immédiat

[bouton principal, vers /aller/guide]
Obtenir le guide · {{offres.guide.prix_affiche}}

[ligne sous le bouton]
Téléchargement immédiat · PDF · Garantie {{offres.guide.garantie_jours}} jours

[ligne de confiance]
Garantie {{offres.guide.garantie_jours}} jours, en plus de tes droits légaux · {{offres.lecteurs.affiche}}

[bouton secondaire, ancre vers la section Feuilleter]
Feuilleter l'introduction

### Section 2 : à qui c'est destiné

[titre de section]
Pour qui, pas pour qui

[colonne « prends-le »]
Prends-le si tu roules avec ton kart et que tu plafonnes.
Si tu sors parfois un tour qui te surprend, sans savoir d'où il vient.
Si tu débutes en compétition, ou si tu roules depuis des années et que le chrono ne bouge plus.

[colonne « passe ton chemin »]
Passe ton chemin si tu roules en location : le kart change à chaque session, et le guide parle du tien.
Passe ton chemin si tu cherches un réglage de carbu : il n'y en a pas dedans.
Passe ton chemin si tu veux un chiffre promis sur ton chrono : personne d'honnête ne peut le faire.

### Section 3 : ce que tu vas comprendre, chapitre par chapitre

[titre de section]
Ce que tu vas comprendre

[intro de section]
13 chapitres. Chacun règle une chose. Dans l'ordre où elle se joue dans le virage.

[liste, une ligne par chapitre, numéro en JetBrains Mono]
01. Le vrai rôle du pilote : pourquoi attaquer plus fort te fait perdre du temps.
02. Comment fonctionne vraiment un kart : pas de différentiel, pas de suspension, et ce que ça change dans tes mains.
03. Les mains du pilote : tenir le volant pour lire le kart, pas pour le forcer.
04. Le freinage dégressif : relâcher le frein au bon rythme pour que le kart accepte de tourner.
05. La rotation : faire pivoter le kart sans le brusquer, en délestant la roue arrière intérieure.
06. Le point d'accélération : remettre les gaz au moment où la rotation est finie, pas avant.
07. La trajectoire réelle : suivre le grip du jour, pas le schéma appris.
08. Le grip : chaud, froid, sale, humide, et comment tu adaptes ton pilotage en deux tours.
09. Rouler vite longtemps : constance, rythme, propreté, sans t'effondrer en fin de manche.
10. Le mental : calme, ego, pression, lucidité, ce qui se passe dans ta tête à l'entrée du virage.
11. L'analyse post-session : lire ta session toi-même, remonter du symptôme à la cause.
12. L'entraînement : 6 exercices à faire sur n'importe quelle journée de roulage, seul ou en équipe.
13. Les 10 fondements du pilotage karting : le socle, sur une page, à relire avant chaque session.

[ligne de fin de section]
Aucun réglage de carburation. Aucune promesse de chrono. Du pilotage.

### Section 4 : les 3 croyances retournées

[titre de section]
Trois choses que tu crois, et qui te ralentissent

[croyance 1, libellé]
Ce que tu crois
[croyance 1, phrase]
« Je dois freiner plus tard. »
[croyance 1, réponse]
Freiner plus tard décale ton relâché. La roue arrière intérieure ne se décharge plus, le kart refuse de pivoter. Tu perds dans le virage ce que tu croyais gagner au freinage.

[croyance 2, libellé]
Ce que tu crois
[croyance 2, phrase]
« Je dois braquer plus fort. »
[croyance 2, réponse]
Le volant est un capteur, pas une commande. Plus tu serres et plus tu braques, plus tu satures le châssis. Il ne respire plus, et il tourne moins.

[croyance 3, libellé]
Ce que tu crois
[croyance 3, phrase]
« Je dois suivre la trajectoire idéale. »
[croyance 3, réponse]
Elle n'existe pas. C'est le grip qui dicte la trajectoire, et il change à chaque session. La rigidité scolaire est une cause de lenteur, pas une solution.

[schéma]
Le schéma du virage récupéré de la page Gumroad, sans le compteur de secondes (estimation non mesurée). Alt : « Schéma d'un virage : zone de freinage dégressif, rotation, point d'accélération ».

### Section 5 : feuilleter

[titre de section]
Feuilleter avant d'acheter

[intro de section]
L'introduction complète, telle qu'elle est dans le PDF. Sans email. Puis quelques pages du guide, en image.

[texte de l'introduction, en vrai HTML, cité du guide]
Avant d'apprendre à aller vite

Le karting est l'une des formes de pilotage les plus pures. Pas d'assistance, pas de suspension, pas de différentiel, peu d'inertie. Rien pour masquer les erreurs, rien pour compenser les excès. Dans un kart, chaque geste compte. Chaque pression, chaque angle, chaque mouvement. Le pilote n'est jamais éloigné de la mécanique : il en fait partie.

C'est précisément cette simplicité qui rend la discipline exigeante. Pour aller vite, il ne suffit pas d'être courageux ou volontaire. Il faut comprendre ce que la machine demande, comment elle réagit, pourquoi elle accepte ou refuse une action. Le kart est une mécanique vivante. Il glisse, il crisse, il se charge, il se déleste. Il impose sa logique, et le pilote qui tente de la dominer finit toujours par perdre du temps.

La vérité, c'est que la plupart des pilotes roulent sans jamais apprendre la structure réelle d'un virage. Ils freinent comme ils peuvent, tournent quand ils pensent que c'est le bon moment, réaccélèrent quand la piste les y oblige. Ils cherchent la vitesse dans l'agressivité, alors qu'elle réside dans la maîtrise.

Ce livre a été conçu pour une autre approche.

Il s'appuie sur trois fondations :

La compréhension mécanique du kart. Parce qu'un kart tourne, accélère et freine pour des raisons très différentes d'une voiture.

La maîtrise du geste. Parce qu'un pilote rapide est avant tout un pilote précis, constant et technique.

La lecture de la piste. Parce qu'une trajectoire n'existe jamais seule : elle change selon l'adhérence, la température, le rythme et l'état du matériel.

Chaque concept présent ici a été pensé pour respecter la réalité d'un châssis rigide, d'un freinage arrière et d'une direction sans assistance.

Le but n'est pas de simplifier le pilotage. Le but est d'en révéler la logique, de manière à donner au pilote un contrôle total sur ses décisions et sur sa progression.

Un kart n'a pas besoin d'être forcé. Il a besoin d'être compris.

Ce livre est destiné à celles et ceux qui ne veulent pas seulement rouler vite, mais rouler bien, rouler propre, rouler intelligemment, et surtout se respecter comme pilotes.

Si tu appliques ce que tu vas lire ici, ton pilotage changera. Pas parce que tu feras plus. Mais parce que tu feras mieux.

[galerie de pages]
Les vraies pages du PDF déjà disponibles en image (jusqu'à 10 : les pages de l'extrait actuel, intro et chapitre 04, schémas compris). Chaque image avec width, height et un alt du type « Page 12 du guide : le freinage dégressif, schéma du relâché ». Aucune page des chapitres 11, 12 et 13.

[bouton, vers /aller/guide]
Obtenir le guide · {{offres.guide.prix_affiche}}

[ligne sous le bouton]
Téléchargement immédiat · PDF · Garantie {{offres.guide.garantie_jours}} jours

### Section 6 : vrais messages de lecteurs

[titre de section]
Messages reçus de lecteurs, reproduits tels quels

[message 1]
« J'ai appris beaucoup et comme je suis visuel, ça fonctionne très bien. Je me suis vraiment amélioré en compétition, un podium le week-end dernier. Merci de tes conseils. »
[source] Pilote en compétition

[message 2]
« Franchement, c'est hyper bien fait. Bravo. Et je pense encore lire les exos, c'est une super idée. »
[source] Lecteur du guide

[message 3]
« Vraiment neuf, ça fait du bien à lire. Les concepts sont bien expliqués et c'est applicable rapidement. »
[source] Lecteur du guide

[note, petit texte]
Sans étoiles, sans note. Prénoms retirés tant que je n'ai pas leur accord écrit.

### Section 7 : l'auteur

[titre de section]
Qui l'a écrit

[image]
Portrait de Clément. Alt : « Clément Daniel, auteur du guide ».

[texte, 3 lignes]
Je m'appelle Clément Daniel. Pas de mécano, pas de team : j'ai tout appris seul.
J'ai passé des années à ne pas comprendre pourquoi le tour d'avant était meilleur.
Ce guide, c'est ce que j'aurais voulu lire au début. Sans jargon, sans théorie creuse.

[ligne de faits, depuis la config]
{{faits.ligne}}

### Section 8 : ce qui est livré, prix et garantie (un seul bloc)

[titre de section]
Ce que tu reçois

[liste]
- Le guide en PDF, 59 pages, 13 chapitres, lisible sur téléphone, tablette et ordinateur.
- Les schémas et les 6 exercices du chapitre 12.
- Mon tableau de réglages, version acheteurs : tu notes ce que tu changes, le guide t'explique pourquoi ça marche.
- L'accès tout de suite après le paiement, sur la page qui suit.

[prix, en gros]
{{offres.guide.prix_affiche}}

[ligne sous le prix]
Paiement unique · Accès immédiat

[bouton principal, vers /aller/guide]
Obtenir le guide · {{offres.guide.prix_affiche}}

[ligne sous le bouton]
Téléchargement immédiat · PDF · Garantie {{offres.guide.garantie_jours}} jours · Paiement sécurisé par Stripe

[garantie, en gros]
Garantie {{offres.guide.garantie_jours}} jours, en plus de tes droits légaux.
Tu lis. Si ça ne t'apporte rien, un email dans les {{offres.guide.garantie_jours}} jours et je te rembourse.
Sans justification, sans formulaire.

### Section 9 : FAQ, 7 questions

[titre de section]
Avant de te décider

[Q1]
Je débute. C'est trop technique pour moi ?
[R1]
Non. Le guide part de zéro : comment un kart tourne, ce que tes mains font, ce que ton pied fait.
Chaque idée est expliquée avant d'être utilisée.
Si tu sais déjà faire un tour propre, tu as le niveau pour le lire.

[Q2]
C'est des exercices ou de la théorie ?
[R2]
Les deux, dans cet ordre.
Les chapitres 1 à 10 t'expliquent ce qui se passe dans le kart.
Les chapitres 11 et 12 te donnent la méthode et 6 exercices à faire dès ta prochaine session.

[Q3]
Je roule en location. Ça marche pour moi ?
[R3]
Le pilotage, oui. La lecture du kart, moins.
En location, le châssis, le moteur et les pneus changent à chaque session. Tu ne peux pas tester un réglage d'une fois sur l'autre.
Si tu ne roules qu'en location, commence par l'extrait gratuit et garde ton argent.

[Q4]
Je reçois quoi, et quand ?
[R4]
Juste après le paiement, une page te donne le PDF et le tableau de réglages.
Tu télécharges tout de suite. Tu reçois aussi le reçu Stripe par email.
Si tu perds le lien, tu m'écris à {{contact.email}} et je te le renvoie dans la journée.

[Q5]
Et si ça ne m'apporte rien ?
[R5]
Tu m'écris dans les {{offres.guide.garantie_jours}} jours, et je te rembourse.
Sans justification, sans formulaire.
C'est ma garantie. Elle s'ajoute à tes droits légaux, elle ne les remplace pas.

[Q6]
C'est différent de tes vidéos ?
[R6]
Mes vidéos montrent une idée à la fois, en une minute.
Le guide les met dans l'ordre, du premier virage au dernier, et explique pourquoi elles marchent ensemble.
Ce que tu as vu en vidéo, tu comprends enfin d'où ça vient.

[Q7]
Et mon droit de rétractation de 14 jours ?
[R7]
Le guide est un contenu numérique livré tout de suite.
En payant, tu demandes l'accès immédiat au PDF et tu acceptes de perdre ton droit de rétractation de 14 jours une fois le téléchargement disponible (article L221-28 13° du Code de la consommation). Stripe te le fait cocher avant de payer.
Ma garantie {{offres.guide.garantie_jours}} jours s'ajoute à tes droits légaux : si ça ne t'apporte rien, un email et je te rembourse.

### Section 10 : dernier bouton

[titre de section]
Tu peux faire dix sessions de plus en espérant que ça vienne.

[texte]
Ou tu lis ce soir, et à ta prochaine session tu sais quoi tester.
Une chose à la fois. Le guide te dit laquelle.

[bouton final, vers /aller/guide]
Je prends le guide · {{offres.guide.prix_affiche}}

[ligne sous le bouton]
Téléchargement immédiat · PDF · Garantie {{offres.guide.garantie_jours}} jours

---

## 3. Après paiement du guide seul : /merci-guide (noindex)

**But** : livrer tout de suite et proposer une seule suite, au prix équitable.
**Adresse réglée dans Stripe** : /merci-guide?session_id={CHECKOUT_SESSION_ID}
**Aucune navigation vers d'autres offres. Un seul bouton de vente.**

### Balises meta

[title] Ton guide est là
[meta robots] noindex

### Section 1 : confirmation

[h1]
C'est bon, ton guide est là.

[sous-titre]
Merci. Tu télécharges tout ici, maintenant.

### Section 2 : téléchargements

[bouton principal, vers le chemin non devinable du PDF]
Télécharger le guide (PDF, 59 pages)

[bouton secondaire, vers le chemin non devinable du tableau]
Télécharger le tableau de réglages (version acheteurs)

[ligne sous les boutons]
Les deux fichiers s'ouvrent sur téléphone, tablette et ordinateur.

### Section 3 : par quoi commencer

[titre de section]
Par quoi commencer

[texte]
Ce soir, lis le chapitre 04 en premier : le freinage dégressif.
À ta prochaine session, ne travaille qu'une chose.
Note-la dans l'onglet Journal du tableau avant de partir.

### Section 4 : la suite, au prix équitable

[titre de section]
Tu as une vidéo onboard ?

[texte]
Le guide t'explique comment ça marche. Le débrief te dit ce que toi, tu fais.
Tu m'envoies une vidéo que tu as déjà. Je la regarde tour par tour.
Tu reçois sous {{offres.debrief.delai_h}} h une vidéo commentée, tes 3 priorités et un seul objectif.
Pour les lecteurs du guide, le débrief passe à {{offres.debrief.prix_lecteur_affiche}} au lieu de {{offres.debrief.prix_affiche}}. Même total que dans l'autre sens : {{offres.total_deux_affiche}} pour les deux.
Ta vidéo reste entre toi et moi.

[bouton, vers /aller/onboard-lecteur]
Envoyer ma vidéo · {{offres.debrief.prix_lecteur_affiche}}

[ligne sous le bouton]
Livré sous {{offres.debrief.delai_h}} h · Garantie {{offres.guide.garantie_jours}} jours après réception · Vidéo privée

### Section 5 : contact et garantie

[titre de section]
Si quelque chose cloche

[texte]
Garantie {{offres.guide.garantie_jours}} jours, en plus de tes droits légaux : si ça ne t'apporte rien, un email et je te rembourse.
Une question, un fichier qui ne s'ouvre pas : {{contact.email}}. Je réponds dans la journée.

### Section 6 : livraison (texte piloté par le drapeau livraison.email_auto)

[texte quand livraison.email_auto = faux, lots 1 et 2]
Télécharge ton guide maintenant et garde cette page dans tes favoris.
Tu reçois seulement le reçu et la facture Stripe par email.
Si tu perds le lien, écris-moi à {{contact.email}} et je te le renvoie dans la journée.

[texte quand livraison.email_auto = vrai, lot 3]
Un email arrive avec ces mêmes liens. Si rien dans 10 minutes, écris-moi à {{contact.email}}.

### Section 7 : pied de page

[lien texte, vers /]
Retour au site

---

## 4. Après paiement du guide par un acheteur du débrief : /merci-guide-lecteur (noindex)

**But** : livrer le guide à quelqu'un qui vient de payer le débrief, sans lui reproposer le débrief.
**Adresse réglée dans Stripe pour le lien à {{offres.guide.prix_lecteur_affiche}}** : /merci-guide-lecteur?session_id={CHECKOUT_SESSION_ID}
**Aucun bouton de vente.**

### Balises meta

[title] Ton guide est là
[meta robots] noindex

### Section 1 : confirmation

[h1]
Ton guide est là.

[sous-titre]
Merci. Tu télécharges tout ici, maintenant.

### Section 2 : téléchargements

[bouton principal, vers le chemin non devinable du PDF]
Télécharger le guide (PDF, 59 pages)

[bouton secondaire, vers le chemin non devinable du tableau]
Télécharger le tableau de réglages (version acheteurs)

### Section 3 : ton débrief est en cours

[titre de section]
Ton débrief est en cours

[texte]
Tu reçois ta vidéo commentée sous {{offres.debrief.delai_h}} h.
Ce soir, lis le chapitre 04 en premier : le freinage dégressif.
Quand le débrief arrive, tu auras déjà les mots pour comprendre ce que je te montre.

### Section 4 : contact et garantie

[titre de section]
Si quelque chose cloche

[texte]
Garantie {{offres.guide.garantie_jours}} jours, en plus de tes droits légaux : si ça ne t'apporte rien, un email et je te rembourse.
Une question, un fichier qui ne s'ouvre pas : {{contact.email}}. Je réponds dans la journée.

### Section 5 : livraison (texte piloté par le drapeau livraison.email_auto)

[texte quand livraison.email_auto = faux, lots 1 et 2]
Télécharge ton guide maintenant et garde cette page dans tes favoris.
Tu reçois seulement le reçu et la facture Stripe par email.
Si tu perds le lien, écris-moi à {{contact.email}} et je te le renvoie dans la journée.

[texte quand livraison.email_auto = vrai, lot 3]
Un email arrive avec ces mêmes liens. Si rien dans 10 minutes, écris-moi à {{contact.email}}.

### Section 6 : pied de page

[lien texte, vers /]
Retour au site

---

## 5. Après paiement du débrief : /merci-onboard (noindex)

**But** : rassurer tout de suite après le paiement le plus cher.
**Adresse réglée dans Stripe pour les deux liens débrief (plein tarif et tarif lecteur)** : /merci-onboard?session_id={CHECKOUT_SESSION_ID}
**Aucun bouton de vente. Un seul lien : retour au site.**

### Balises meta

[title] Reçu, le chrono démarre
[meta robots] noindex

### Section 1 : confirmation

[h1]
Reçu. Le chrono des {{offres.debrief.delai_h}} h démarre maintenant.

[sous-titre]
Merci pour ta confiance. Voilà ce qui se passe de mon côté.

### Section 2 : ce qui se passe

[titre de section]
Ce qui se passe

[liste, une ligne par étape]
- Je regarde ta vidéo en entier, tour par tour, chrono à l'appui.
- Je te renvoie par email une vidéo commentée sur tes images.
- Avec elle : tes 3 priorités, classées par gain de temps, et un seul objectif pour ta prochaine sortie.
- Tu reçois tout sous {{offres.debrief.delai_h}} h après réception de ta vidéo.

### Section 3 : si la vidéo est inexploitable

[texte]
Si ta vidéo est inexploitable, je te le dis avant de commencer et je te rembourse.
Le plus souvent, c'est une caméra sur la poitrine : on ne voit que le bitume.
Dans ce cas, on en parle par email et tu me renvoies une vidéo qui montre tes mains et la piste.

### Section 4 : le guide coché (texte piloté par le drapeau livraison.email_auto)

[titre de section]
Tu as coché le guide à {{offres.guide.prix_lecteur_affiche}} ?

[texte quand livraison.email_auto = faux, lots 1 et 2]
Je te l'envoie moi-même par email, avec ta vidéo commentée. Ou avant, si tu me le demandes à {{contact.email}}.

[texte quand livraison.email_auto = vrai, lot 3]
Il arrive par email dans les minutes qui viennent. Si rien dans 10 minutes, écris-moi à {{contact.email}}.

### Section 5 : ta vidéo

[titre de section]
Ta vidéo reste entre toi et moi

[texte]
Je ne la publie pas et je ne m'en sers pour aucun contenu.
Elle est supprimée 30 jours après la livraison du débrief.

### Section 6 : contact et garantie

[titre de section]
Si quelque chose cloche

[texte]
Garantie {{offres.guide.garantie_jours}} jours après réception de ton débrief, en plus de tes droits légaux : si ça ne t'apporte rien, un email et je te rembourse.
Une question, un lien de vidéo à corriger : {{contact.email}}. Je réponds dans la journée.
Tu reçois le reçu et la facture Stripe par email.

### Section 7 : pied de page

[lien texte, vers /]
Retour au site

---

## 6. Textes communs aux pages de vente

[ligne de confiance, sous chaque bouton d'achat]
Téléchargement immédiat · PDF · Garantie {{offres.guide.garantie_jours}} jours

[mention Stripe, près du prix]
Paiement sécurisé par Stripe

[formule de garantie, la seule autorisée]
Garantie {{offres.guide.garantie_jours}} jours, en plus de tes droits légaux.

[verbes de bouton autorisés]
Obtenir, Voir, Je prends, Envoyer ma vidéo, Télécharger, Recevoir, Feuilleter.

[verbes de bouton interdits]
Acheter, Payer, Commander, Transformez, Boostez.

---

## 7. Contrôle avant intégration

- Aucun prix, lien Stripe, email ni chiffre de lecteurs écrit en dur : tout est en balise.
- Zéro tiret cadratin, zéro demi-cadratin, zéro emoji.
- Un seul h1 par page.
- Le mot « coaching » et les mots qui décrivent Clément comme encadrant sont absents.
- Les trois messages de lecteurs sont identiques, au caractère près, à ceux de la page Gumroad ; aucun prénom.
- Chaque chiffre est vrai et daté dans la config ; aucun compteur, aucune étoile, aucun compte à rebours.
- Sur /merci-guide-lecteur et /merci-onboard, aucun bouton de vente.
- Sur /merci-guide, le bouton de la suite pointe vers /aller/onboard-lecteur, jamais vers /onboard/.
