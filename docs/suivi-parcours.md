# Suivi du parcours : de la vidéo à l'achat

But : savoir à quelle étape on perd les gens entre une vidéo publiée et un livre vendu,
par réseau et par vidéo. Tout reste anonyme : ni nom, ni email, ni adresse IP dans le suivi.

## Ce qui est mesuré

| Étape | Événement | Où |
|---|---|---|
| Visite | `pageview` | toutes les pages (`assets/site.js`) |
| Page du livre ouverte | `pageview` sur `/livre` | `assets/site.js` |
| Lu à 25, 50, 90 % | `lecture` (`meta.pct`) | `assets/page-vente.js` |
| Prix vu | `prix_vu` (bloc de l'offre resté 1 s à l'écran) | `assets/page-vente.js` |
| Bouton d'achat vu | `cta_vu` (`meta.cta`) | `assets/page-vente.js` |
| Vidéo de vente lancée / finie | `video_play`, `video_fin` | `assets/page-vente.js` |
| Clic vers le paiement | `stripe_click` | `assets/site.js` |
| Achat | session Stripe payée | lue par `dashboard-data.js` |

## Comment une vente retrouve sa vidéo

1. À l'arrivée, `site.js` tire un identifiant de visite au hasard (gardé dans l'onglet, effacé à sa fermeture).
2. Il lit les UTM du lien, dont `utm_content` = le code de la vidéo.
3. Sur chaque bouton « Obtenir le livre » (`/aller/guide`), il ajoute
   `client_reference_id=s1-livre-sid-XXXXXXXXXXXX` (12 caractères de l'identifiant).
   Netlify garde ce paramètre dans la redirection, Stripe le range dans la session de paiement.
4. `dashboard-data.js` relit les sessions Stripe, retrouve la visite par ces 12 caractères, donc sa source et sa vidéo.
   Aucune donnée client (email, nom) ne sort de la fonction.

## Format des liens à poser

Un code court par vidéo, toujours le même partout : `v` + numéro + mot clé, par exemple `v12-freinage`.
Lettres, chiffres, `-`, `_` et `.` seulement (le reste est effacé).

- ManyChat, mot clé « Guide » :
  `https://comprendre-comment-rouler-plus-vite.netlify.app/livre?utm_source=manychat&utm_medium=dm&utm_campaign=guide&utm_content=v12-freinage`
- ManyChat, mot clé « Extrait » :
  `https://comprendre-comment-rouler-plus-vite.netlify.app/extrait?utm_source=manychat&utm_medium=dm&utm_campaign=extrait&utm_content=v12-freinage`
- Bio (inchangée) : `.../liens?utm_source=instagram` (ou `youtube`, `tiktok`). Les vues venues de la bio
  ne disent pas quelle vidéo : elles tombent dans « (sans code vidéo) ».

## Ce que `dashboard-data` renvoie (clé `parcours`)

- `etapes` : les 9 étapes ci-dessus, avec `valeur`, `pct_precedente` (où ça fuit) et `pct_depart`.
- `par_source` : mêmes colonnes par réseau (instagram, tiktok, youtube, manychat, direct…), plus `ventes`, `revenu_cents`, `conversion` (achats pour 100 visites).
- `par_video` : mêmes colonnes par code vidéo (`utm_content`), 30 au plus.
- `ventes` : `total`, `reliees` (retrouvées jusqu'à leur visite), `non_reliees`, `stripe` (statut de lecture).

Une visite est comptée dans la période où elle commence. Une vente est rattachée à sa visite même si celle-ci a commencé dans la période d'avant.

## Plus tard : webhook ManyChat vers Pit Wall (pas codé)

Plan ManyChat Pro (18 €/mois) : l'action « External Request » est disponible.

- Emplacement prévu : dépôt `clemkart/Pitwall`, fonction `netlify/functions/manychat-webhook.js`,
  qui écrira dans une table Supabase `manychat_events` (même projet Supabase que `site_events`).
- Déclencheur dans ManyChat : à chaque envoi du lien « Guide » ou « Extrait », une External Request
  `POST` avec `{ mot_cle, code_video, date }` et un secret partagé dans un en-tête.
- Ne jamais envoyer le pseudo Instagram ni l'identifiant ManyChat de la personne : seulement le mot clé et le code vidéo.
- Ce que ça ajoute : l'étape « DM envoyé » avant « Visite », donc le taux de clic du DM vers le site.
