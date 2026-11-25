/* ============================================================
   Clem Kart Racing : annonce.js (page de liens, 25/11/2026)
   La petite fenetre de verre qui annonce le diagnostic de pilotage, en bas de l ecran.
   - Au premier passage seulement : une cle dans la memoire du navigateur. Sans memoire
     (navigation privee stricte), on ne peut pas tenir « une seule fois » : rien ne s affiche.
   - Elle ne recouvre jamais le lien du livre : si elle le ferait, elle se range (est-ecartee)
     et revient des que la place est libre.
   - Elle se ferme par la croix, par un glissement vers le bas ou par Echap.
   - Sans ce script, la fenetre reste cachee (attribut hidden) : la page marche pareil.
   Le clic sur son bouton est suivi par site.js (attribut data-bio), comme les autres boutons.
   ============================================================ */
(function () {
  'use strict';
  var d = document;
  var boite = d.getElementById('annonce-diagnostic');
  if (!boite) return;

  var CLE = 'ckr-annonce-diagnostic-v1';
  var DELAI_OUVERTURE_MS = 1500;   /* apres les feux de depart et la grille (finis avant 1,2 s) */
  var DUREE_SORTIE_MS = 640;       /* la transition de page-liens.css, plus une marge */
  var SEUIL_GESTE_PX = 56;         /* glissement vers le bas au-dela duquel la fenetre se ferme */
  var SEUIL_DEBUT_PX = 6;          /* en dessous, c est un appui, pas un glissement */
  var MARGE_LIVRE_PX = 8;

  var memoire;
  try {
    memoire = window.localStorage;
    if (memoire.getItem(CLE)) return;
  } catch (e) { return; }

  var livre = d.querySelector('.lien-bio-principal');
  var ouverte = false;
  var attente = false;

  /* La place de la fenetre au repos (sans tenir compte du glissement en cours) face au lien du livre */
  function recouvreLeLivre() {
    if (!livre) return false;
    var l = livre.getBoundingClientRect();
    var haut = boite.offsetTop;
    var gauche = boite.offsetLeft;
    return l.bottom > haut - MARGE_LIVRE_PX && l.top < haut + boite.offsetHeight
      && l.right > gauche && l.left < gauche + boite.offsetWidth;
  }
  function placer() {
    attente = false;
    if (ouverte) boite.classList.toggle('est-ecartee', recouvreLeLivre());
  }
  function demander() {
    if (!attente) { attente = true; window.requestAnimationFrame(placer); }
  }

  function ouvrir() {
    /* La cle est ecrite au moment ou la fenetre s affiche : un visiteur reparti avant ne l a pas vue */
    try { memoire.setItem(CLE, '1'); } catch (e) { return; }
    boite.hidden = false;
    void boite.offsetHeight;         /* la position de depart est peinte avant la transition */
    ouverte = true;
    boite.classList.toggle('est-ecartee', recouvreLeLivre());
    boite.classList.add('est-ouverte');
  }
  function fermer() {
    if (!ouverte) return;
    ouverte = false;
    boite.classList.remove('est-ouverte', 'est-tenue');
    boite.style.removeProperty('--tire');
    window.setTimeout(function () { boite.hidden = true; }, DUREE_SORTIE_MS);
  }

  /* Le glissement vers le bas : la fenetre suit le doigt, puis se ferme ou revient */
  var departY = null;
  var ecart = 0;
  var glisse = false;
  boite.addEventListener('pointerdown', function (e) {
    glisse = false;
    if (e.target.closest && e.target.closest('.annonce-fermer')) return;
    departY = e.clientY;
    ecart = 0;
  });
  boite.addEventListener('pointermove', function (e) {
    if (departY === null) return;
    ecart = e.clientY - departY;
    if (!glisse && Math.abs(ecart) > SEUIL_DEBUT_PX) {
      glisse = true;
      boite.classList.add('est-tenue');
      try { boite.setPointerCapture(e.pointerId); } catch (err) { /* le glissement marche sans capture */ }
    }
    if (glisse) boite.style.setProperty('--tire', Math.max(0, ecart) + 'px');
  });
  function lacher() {
    if (departY === null) return;
    departY = null;
    boite.classList.remove('est-tenue');
    if (glisse && ecart > SEUIL_GESTE_PX) fermer();
    else boite.style.removeProperty('--tire');
  }
  boite.addEventListener('pointerup', lacher);
  boite.addEventListener('pointercancel', lacher);
  /* Un glissement n est pas un clic : le lien ne s ouvre pas, et rien n est compte par site.js */
  boite.addEventListener('click', function (e) {
    if (!glisse) return;
    glisse = false;
    e.preventDefault();
    e.stopPropagation();
  }, true);

  boite.querySelector('.annonce-fermer').addEventListener('click', fermer);
  d.addEventListener('keydown', function (e) { if (e.key === 'Escape') fermer(); });
  window.addEventListener('scroll', demander, { passive: true });
  window.addEventListener('resize', demander);

  window.setTimeout(ouvrir, DELAI_OUVERTURE_MS);
})();
