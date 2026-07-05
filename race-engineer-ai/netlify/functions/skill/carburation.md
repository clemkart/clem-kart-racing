# Carburation & gicleurs — module conditionnel

> Chargé quand le pilote parle de gicleur, carburation, mélange, bougie, serrage, 4-temps moteur.
> Rôle du coach : donner le SENS de la correction et l'ordre de grandeur, jamais un chiffre exact sans les conditions complètes. Pour le chiffre exact sur Rotax : renvoyer vers l'app officielle ROTAX MAX Jetting.

## Le principe qui gouverne tout : la densité d'air

Un moteur 2 temps est une pompe à air. Le carburateur doit maintenir le bon ratio air/essence quelles que soient les conditions. Ce qui change ce ratio, c'est la DENSITÉ de l'air, combinaison de 3 facteurs, par ordre d'importance :

1. **Température air** (facteur dominant). Air froid = dense = plus d'oxygène = le mélange s'appauvrit relativement → il faut ENRICHIR (gicleur plus gros). Air chaud → APPAUVRIR (plus petit).
2. **Pression atmosphérique / altitude**. Haute pression = air dense → enrichir. Altitude ou dépression météo = air raréfié → appauvrir. Un circuit en altitude demande nettement plus petit qu'au niveau de la mer.
3. **Humidité** (facteur mineur). La vapeur d'eau remplace un peu d'oxygène : air très humide → très légèrement appauvrir. La correction humidité est petite ; ne jamais la prioriser devant température et pression.

**Ordre de grandeur** : environ une taille de gicleur par tranche de 5 à 10 °C de changement de température. Un matin à 8 °C et un après-midi à 24 °C sur la même journée = souvent 2 tailles d'écart.

## La règle de sécurité, avant toute performance

- **Trop pauvre = danger.** Surchauffe, détonation, et au pire SERRAGE : moteur détruit, plusieurs centaines à plus de mille euros. La perte est soudaine (roue arrière qui bloque) : danger physique aussi.
- **Trop riche = juste plus lent.** Le moteur "quatre-temps", la reprise est molle, la bougie s'encrasse. Aucun risque mécanique majeur.
- **Règle d'or : dans le doute, toujours le gicleur le plus gros des deux.** On descend ensuite taille par taille, jamais deux d'un coup.
- Ne jamais appauvrir juste avant une manche sans avoir validé aux essais.

## Lire les symptômes

**Trop riche :**
- Le moteur "quatre-temps" (bruit sourd, brrrr) à haut régime en bout de ligne droite
- Reprise molle, moteur qui s'étouffe à la remise des gaz
- Bougie noire, humide, suie
- Perte de tours/min en fin de ligne droite

**Trop pauvre :**
- À-coups, cliquetis ou détonation à haut régime
- Le moteur semble "fort" puis perd brutalement de la puissance à chaud
- Bougie blanche ou gris très clair, isolant brillant
- Température moteur/EGT qui grimpe anormalement

**Le bon réglage :** isolant de bougie couleur noisette/brun clair, le moteur prend ses tours franchement jusqu'au bout de la ligne droite avec un tout léger quatre-temps au débouché qui disparaît en charge.

## Par moteur

### Rotax Max (carbu Dellorto VHSB 34, à flotteur, gicleur fixe)
- Le levier principal = **gicleur principal interchangeable** (pas réglable en roulant). Stock #130 sur EVO 2024+ ; garder un jeu ~124-136 pour couvrir toutes les conditions.
- **Le bon réflexe = l'app officielle ROTAX MAX Jetting** (et les apps équivalentes type Jetting Rotax Max Kart) : on entre température, pression, altitude, humidité et la config moteur (Micro/Mini/Junior/Senior/DD2), elle sort gicleur principal, aiguille/position de clip et préconisation bougie. C'est la référence, calibrée par le constructeur.
- Le coach donne le SENS ("il a fait 10 °C de moins qu'hier, pars une taille plus riche et vérifie avec l'app officielle"), l'app officielle donne le CHIFFRE.
- L'aiguille et sa position de clip affinent les mi-régimes ; ne pas y toucher tant que le gicleur principal n'est pas correct.

### IAME X30 (carbu Tillotson HW-27A à membrane)
- **Pas de gicleurs** : deux vis de richesse réglables, même en piste. **Low (L)** = bas régime et reprise, **High (H)** = haut régime et bout de ligne droite.
- Notation "horloge" : 1 tour complet + minutes. **Bases usine typiques : L ≈ 1h05 à 1h10, H ≈ 1h25 à 1h30.** Pop-off ≈ 10 psi.
- **Visser = appauvrir, dévisser = enrichir.** Ajuster par petits pas (≈ "2 minutes" sur le cadran) et un seul réglage à la fois.
- Méthode piste : régler le H pour un très léger quatre-temps au débouché de la plus longue ligne droite qui se nettoie en charge ; régler le L sur la qualité de reprise en sortie de virage lent.
- Air plus froid/dense → ouvrir légèrement (enrichir) ; chaleur ou altitude → visser légèrement (appauvrir). Mêmes lois de densité que le Rotax.

### KZ / boîte (Dellorto VHSH 30)
- Gicleur principal + aiguille + gicleur de ralenti + flotteur : plus de variables, interactions fines. Donner les principes, mais orienter vers le préparateur/motoriste pour la calibration complète.

### Moteurs à carburation scellée (KA100 et 4-temps réglementés selon championnat)
- Aucun réglage autorisé : le rappeler et rediriger le travail sur châssis, pressions et pilotage.

## Protocole de changement (à faire respecter)

1. **Un seul changement à la fois**, une seule taille (ou "2 minutes" sur X30).
2. 3 à 5 tours à rythme réel, pas des tours de chauffe.
3. Comparer chrono ET sensation moteur (reprise, bout de ligne droite) ET bougie.
4. Noter conditions (T° air, météo, altitude du circuit) et réglage dans l'historique : c'est exactement le genre de donnée que la mémoire du coach exploite d'une session à l'autre.
5. Si le temps se réchauffe en cours de journée, re-vérifier : une carburation calée le matin froid devient riche l'après-midi.

## Limites du coach (à énoncer si pertinent)

- Le calcul exact du gicleur dépend de la pression et de l'altitude du jour : sans ces données, donner une plage et le sens, pas un chiffre définitif.
- Tout ce qui est interne au carbu (pop-off, membranes, flotteur) ou interne moteur = préparateur.
