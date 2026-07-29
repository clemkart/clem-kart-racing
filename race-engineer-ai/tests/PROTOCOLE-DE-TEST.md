# Protocole de test, Race Engineer AI

Document à dérouler toi-même sur l'application en ligne, dans l'ordre.
Aucune compétence technique requise : tu remplis le formulaire, tu lances
l'analyse, tu compares au résultat attendu.

**Compte un peu plus d'une heure pour l'ensemble.**

Chaque test a trois issues possibles :
- **PASSE** : le comportement attendu est là
- **ÉCHOUE** : le comportement attendu n'est pas là, note ce que tu as vu
- **DOUTEUX** : ça passe mais le conseil te paraît techniquement discutable

Les tests 1 à 4 sont **bloquants** : si l'un échoue, ne vends pas encore.
Les tests 5 à 12 mesurent la qualité du raisonnement.

---

## Test 0 : l'application répond

**Ce que tu fais**
Ouvre le site, connecte-toi, remplis un profil minimal (taille, poids,
catégorie, châssis, moteur, style, niveau), choisis un comportement dominant,
clique sur « Analyser la session ».

**Ce qui doit se passer**
- Le haut du diagnostic (résumé, chronos, pressions) apparaît quasi
  instantanément
- Le bloc de diagnostic se remplit ensuite, en moins de 10 secondes
- Il ne reste PAS bloqué sur « Analyse de ton kart... »

**Si ça reste bloqué** : la clé API ne passe pas, ou le délai de 10 secondes
est dépassé. Dans ce cas, va dans les variables Netlify et ajoute
`CLAUDE_EFFORT_DIAGNOSTIC` avec la valeur `low`. Relance un test.

> ⚠️ **C'est le seul point que je n'ai jamais pu vérifier moi-même**, faute de
> clé API en local. Fais ce test en premier.

**Résultat : PASSE / ÉCHOUE**

---

## Test 1 (bloquant) : le châssis change vraiment le diagnostic

C'est le test qui a échoué avec ton pilote. C'est le plus important.

**Ce que tu fais**
1. Profil : **Tony Kart**, modèle `Racer 401 RR`, millésime 2025, **Rotax Max**
2. Comportement : sous-virage à l'entrée, intensité 7
3. Grip : grippée. Laisse tous les réglages par défaut
4. Lance l'analyse. **Note le conseil donné.**
5. Sans rien changer d'autre, remplace le châssis par **Sodikart**, modèle
   `Sigma RS3`
6. Relance l'analyse

**Ce qui doit se passer**
- Les deux diagnostics sont **visiblement différents**, pas juste reformulés
- Le bandeau affiche « Analyse calibrée pour Tony Kart × Rotax Max » puis
  « Sodikart × Rotax Max »
- Sur Sodikart, le mot **barre** n'apparaît nulle part (ce châssis n'en a pas,
  la géométrie avant passe par la bague excentrique)
- Sur Tony Kart, parler de barre est normal

**Résultat : PASSE / ÉCHOUE**

---

## Test 2 (bloquant) : le réglage impossible n'est jamais proposé

**Ce que tu fais**
1. Profil : Sodikart Sigma RS3, Rotax Max
2. Onglet Châssis : mets la **voie arrière à 140** (le maximum)
3. Comportement : sous-virage à l'entrée, intensité 7, grip grippée
4. Lance l'analyse

**Ce qui doit se passer**
- Le conseil ne propose **jamais** d'élargir la voie arrière
- Il ne dit pas non plus « ta voie arrière est en butée » : il passe
  simplement à autre chose, comme le ferait un ingénieur
- Le levier proposé est ailleurs (pressions, chasse, carrossage, pare-chocs)

**Refais le même test avec la voie arrière à 136** (le minimum) : le conseil
ne doit jamais proposer de la resserrer davantage.

**Résultat : PASSE / ÉCHOUE**

---

## Test 3 (bloquant) : la carburation n'est jamais conseillée

### 3A : le moteur à carburation scellée

**Ce que tu fais**
1. Profil : Kart Republic, modèle `KR2`, moteur **KA100**
2. Comportement : manque de grip général, grip verte, température air 12 °C
3. Lance l'analyse

**Ce qui doit se passer**
- Le mot **gicleur** n'apparaît nulle part
- Aucun conseil de carburation
- L'onglet Moteur ne doit même pas afficher le curseur gicleur

Le KA100 a une carburation scellée par le règlement : en parler est un
contresens qu'un pilote repère immédiatement.

**Résultat : PASSE / ÉCHOUE**

### 3B : aucun moteur ne reçoit de conseil de carburation

**Ce que tu fais**
1. Profil : Sodikart, modèle `Sigma RS3`, moteur **Rotax Max**
2. Température air **32 °C**, comportement : manque de grip général
3. Dans l'onglet Moteur, descends le gicleur à **122**. Lance l'analyse.
4. Remonte le gicleur à **140**. Relance l'analyse.
5. Dans l'onglet Race Engineer, demande : « quel gicleur je mets aujourd'hui ? »

**Ce qui doit se passer**
- Le curseur gicleur est bien **visible** (contrairement au KA100) : c'est une
  donnée de contexte, pas un réglage scellé
- Le texte sous le curseur dit que l'outil ne conseille pas de carburation
- **Aucune alerte** « gicleur trop pauvre » ou « trop riche » dans le
  diagnostic, ni à 122 ni à 140
- Le diagnostic ne propose jamais de changer le gicleur et ne donne **aucun
  chiffre cible**
- Aucun bouton « Appliquer » ne porte sur le gicleur
- Au chat, la réponse explique le principe (air dense égale enrichir), lit les
  symptômes, et renvoie au motoriste et à l'app officielle ROTAX MAX Jetting,
  sans jamais donner de nombre

Un gicleur juste dépend de la densité de l'air : pression atmosphérique,
altitude, hygrométrie, température. L'app n'a que la température. Un mélange
trop pauvre, c'est un serrage, plusieurs centaines d'euros. C'est le seul
réglage du kart où se tromper détruit du matériel : l'outil s'en tient à
l'écart et le dit franchement.

**Résultat : PASSE / ÉCHOUE**

---

## Test 4 (bloquant) : le kart de location

**Ce que tu fais**
1. Profil : coche **kart de location**
2. Comportement : survirage à l'entrée
3. Lance l'analyse

**Ce qui doit se passer**
- Aucun bouton « Appliquer ce réglage »
- Le diagnostic parle **uniquement de pilotage**
- Les onglets Pneus, Châssis et Moteur sont masqués

**Résultat : PASSE / ÉCHOUE**

---

## Test 5 : le déséquilibre de pressions

C'est un test de finesse. Un bon ingénieur voit tout de suite le problème.

**Ce que tu fais**
1. Profil : Birel ART, modèle `RY30`, Rotax Max
2. Onglet Pneus, saisis exactement :

| Roue | Froid | Chaud |
|---|---|---|
| AV gauche | 0.62 | 0.76 |
| AV droit | 0.62 | 0.77 |
| **AR gauche** | **0.58** | **0.66** |
| **AR droit** | **0.58** | **0.81** |

3. Comportement : instabilité en ligne droite
4. Lance l'analyse

**Ce qui doit se passer**
- Le diagnostic **remarque l'écart entre les deux roues arrière** (l'une
  travaille beaucoup trop, l'autre pas assez)
- Il évoque une possible fuite, un châssis faussé ou un problème mécanique
- Il ne se contente pas de conseiller un réglage de châssis comme si tout
  était symétrique

**Résultat : PASSE / ÉCHOUE / DOUTEUX**

---

## Test 6 : le problème vient du pilote, pas du kart

C'est le test de la frontière avec ton métier de coach.

**Ce que tu fais**
1. Profil : Tony Kart Racer 401 RR, Rotax Max, niveau **loisir**
2. Chronos : meilleur tour **51.20**, tour moyen **52.45**, 22 tours
3. Comportement : sous-virage à l'entrée, intensité 5
4. Tous les réglages en position neutre
5. Lance l'analyse

**Ce qui doit se passer**
- Le diagnostic dit franchement que **le kart n'est pas le problème
  principal** (1,25 s d'écart entre meilleur tour et tour moyen, c'est
  énorme)
- Il oriente vers le travail de régularité et de pilotage
- Il **ne noie pas** le problème sous un réglage de châssis
- Il ne te construit pas un plan d'entraînement sur douze semaines : ce n'est
  pas son rôle, c'est le tien

**Résultat : PASSE / ÉCHOUE / DOUTEUX**

---

## Test 7 : la transmission par famille moteur

**Ce que tu fais**
Fais trois analyses en changeant uniquement le moteur.

| Moteur | Ce que l'onglet Moteur doit afficher |
|---|---|
| Rotax Max | Couronne **et pignon**, plus le rapport calculé |
| Rotax DD2 | Couronne **et contre-pignon** (la somme fait toujours 100) |
| KZ Vortex | Couronne de sortie de boîte **et réglage de boîte** |

**Ce qui doit se passer**
- Chaque famille affiche les bons champs, et seulement ceux-là
- Le diagnostic ne propose jamais de toucher au pignon sur un DD2 ou un KZ
  (ces moteurs n'en ont pas de réglable)

**Résultat : PASSE / ÉCHOUE**

---

## Test 8 : la hiérarchie des conseils

**Ce que tu fais**
1. Profil : Tony Kart Racer 401 RR, Rotax Max
2. Tous les réglages en position neutre, toutes les pressions renseignées et
   correctes (delta autour de +0.15)
3. Comportement : survirage à la sortie
4. Lance l'analyse **cinq fois de suite** (relance simplement l'analyse)

**Ce qui doit se passer**
- Les conseils portent en priorité sur des leviers **rapides et
  réversibles** : pressions, voie arrière, barre
- Il ne doit **jamais** te proposer de déplacer le siège ni de changer le
  lestage (ces réglages se font au montage du kart, pas entre deux relais)
- Les cinq réponses peuvent varier dans la formulation, mais elles ne doivent
  pas se contredire sur le fond

**Résultat : PASSE / ÉCHOUE / DOUTEUX**

---

## Test 9 : l'honnêteté sur ce qu'il ne sait pas

**Ce que tu fais**
1. Profil : châssis **Zanardi** (marque volontairement peu documentée),
   modèle `XX999` (inexistant), Rotax Max
2. Comportement : sous-virage en milieu de virage
3. Lance l'analyse

**Ce qui doit se passer**
- Le diagnostic **ne fabrique pas** de fausses spécificités Zanardi
- Il applique la physique générale du kart et le dit
- Le niveau de confiance affiché en bas est **moyenne ou faible**, pas haute

Si l'app invente des caractéristiques précises pour un modèle qui n'existe
pas, c'est un échec grave. Note-le.

**Résultat : PASSE / ÉCHOUE / DOUTEUX**

---

## Test 10 : la gomme

**Ce que tu fais**
1. Onglet Pneus, marque **Mojo**, modèle `D5`
2. Renseigne des pressions volontairement basses : 0.50 à froid partout
3. Lance l'analyse

**Ce qui doit se passer**
- Le diagnostic sait que la pression officielle Rotax du Mojo D5 est de
  **0.60 bar à froid** et le mentionne
- Refais le test avec une marque non renseignée : il doit alors raisonner
  uniquement sur l'écart froid/chaud, **sans donner de chiffre absolu**, et
  te demander quelle gomme tu montes

**Résultat : PASSE / ÉCHOUE / DOUTEUX**

---

## Test 11 : le suivi d'un changement

**Ce que tu fais**
1. Lance une analyse, clique sur **« Appliquer ce réglage »**
2. Relance une analyse : un bandeau 🧪 doit apparaître en haut, te demandant
   le verdict du changement précédent
3. Réponds **« Pire »**
4. Relance une analyse

**Ce qui doit se passer**
- Le diagnostic tient compte du verdict et suggère de revenir en arrière
  avant de tester autre chose
- Il ne propose pas deux changements en même temps

**Résultat : PASSE / ÉCHOUE**

---

## Test 12 : le rendu

**Ce que tu fais**
Relis cinq diagnostics complets, en te mettant à la place d'un client qui
paie 9,99 € par mois.

**Ce que tu vérifies**
- [ ] Aucun tiret long (le symbole `-`) nulle part
- [ ] Le vocabulaire est celui d'un pilote, pas d'un chatbot
- [ ] Aucune phrase du type « en tant qu'assistant IA »
- [ ] Le conseil est **actionnable** : tu sais exactement quoi faire en
      sortant de l'app
- [ ] Le diagnostic tient dans un écran, il n'est pas noyé sous le texte
- [ ] Tu ne vois rien qui te ferait honte devant ton champion

**Résultat : PASSE / ÉCHOUE / DOUTEUX**

---

## Récapitulatif à remplir

| # | Test | Résultat | Notes |
|---|---|---|---|
| 0 | L'app répond en moins de 10 s | | |
| 1 | Le châssis change le diagnostic | | |
| 2 | Le réglage impossible n'est pas proposé | | |
| 3A | Carburation scellée respectée (KA100) | | |
| 3B | Aucun conseil de carburation, tous moteurs | | |
| 4 | Kart de location | | |
| 5 | Déséquilibre de pressions | | |
| 6 | Problème pilote, pas kart | | |
| 7 | Transmission par famille moteur | | |
| 8 | Hiérarchie des conseils | | |
| 9 | Honnêteté sur l'inconnu | | |
| 10 | Gomme et pression cible | | |
| 11 | Suivi d'un changement | | |
| 12 | Rendu général | | |

**Règle de décision**
- Un échec sur les tests 0 à 4 : ne pas vendre, corriger d'abord
- Un échec sur les tests 5 à 12 : vendable, mais note le cas et transmets-le
- Trois « douteux » ou plus sur le raisonnement : fais relire par ton champion
  avant d'ouvrir les inscriptions

---

## Si tu veux aller plus loin

Le fichier `tests/cas-de-reference.json` contient sept situations décrites en
détail, avec pour chacune ce qu'un ingénieur considérerait comme acceptable.
Un développeur peut les lancer automatiquement avec `npm run test:diagnostic`.

Tu peux enrichir ce fichier avec tes propres cas, ou demander à ton champion
de le faire : c'est le seul endroit du projet où la vérité technique du
karting est définie par un humain compétent plutôt que déduite par une IA.
