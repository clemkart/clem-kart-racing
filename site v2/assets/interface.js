/* ============================================================
   Clem Kart Racing : interface.js (toutes les pages, aucune dependance)
   Charge en defer par _partials/head.html, apres site.js. Aucune fonction de suivi.
   1. Navigation : classe .nav-pleine apres 80 px (sentinelle + IntersectionObserver).
   2. Barre de secteurs : repli quand animation-timeline: scroll() manque (variable --progression).
   3. Releves en coin (_partials/hud.html) : secteur, section en cours, chrono du tour.
   4. Compteurs qui defilent : [data-compteur].
   5. Damier en marches : .damier-marches (une fois, quand il entre a l ecran).
   6. Feux de depart (/liens) : classe html.feux-depart, une fois par session.
   7. Citations a glisser (.quotes[role="region"]) : tabindex="0" seulement quand la bande deborde.
   Aucun ecouteur de defilement, sauf le repli de la barre de secteurs (une ecriture par image).
   ============================================================ */
(function () {
  'use strict';

  var doc = document;
  var html = doc.documentElement;
  html.classList.add('a-ui');

  var reduit = false;
  try { reduit = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { reduit = false; }
  var IO = 'IntersectionObserver' in window;

  function chaque(liste, fn) { Array.prototype.forEach.call(liste, fn); }
  function differer(fn, ms) {
    var t = null;
    return function () { clearTimeout(t); t = setTimeout(fn, ms); };
  }

  /* ---------- 1. Navigation pleine apres 80 px ---------- */
  function navPleine() {
    var nav = doc.querySelector('.nav');
    if (!nav) return;
    if (!IO) { nav.classList.add('nav-pleine'); return; }
    var sentinelle = doc.createElement('div');
    sentinelle.setAttribute('aria-hidden', 'true');
    sentinelle.style.cssText = 'position:absolute;top:0;left:0;width:1px;height:80px;pointer-events:none';
    doc.body.appendChild(sentinelle);
    new IntersectionObserver(function (entrees) {
      nav.classList.toggle('nav-pleine', !entrees[0].isIntersecting);
    }).observe(sentinelle);
  }

  /* ---------- 2. Barre de secteurs : repli (Firefox) ---------- */
  function secteursRepli() {
    if (!doc.querySelector('.secteurs')) return;
    var natif = false;
    try { natif = window.CSS && CSS.supports('animation-timeline: scroll()'); } catch (e) { natif = false; }
    if (natif) return;
    var attente = false;
    function ecrire() {
      attente = false;
      var max = Math.max(1, html.scrollHeight - window.innerHeight);
      var p = Math.min(1, Math.max(0, window.scrollY / max));
      html.style.setProperty('--progression', p.toFixed(4));
    }
    window.addEventListener('scroll', function () {
      if (attente) return;
      attente = true;
      window.requestAnimationFrame(ecrire);
    }, { passive: true });
    window.addEventListener('resize', differer(ecrire, 100));
    ecrire();
  }

  /* ---------- 4. Compteurs : chaque chiffre monte de 0 a sa valeur, une seule fois ---------- */
  function rail(chiffre) {
    var col = doc.createElement('span');
    col.className = 'compteur-col';
    var r = doc.createElement('span');
    r.className = 'compteur-rail';
    for (var i = 0; i < 10; i++) {
      var s = doc.createElement('span');
      s.textContent = String(i);
      r.appendChild(s);
    }
    col.appendChild(r);
    return { col: col, rail: r, valeur: Number(chiffre) };
  }

  /* Remplace le texte visible par des colonnes de chiffres, garde le texte exact pour les lecteurs d ecran,
     puis remet le HTML d origine (espaces insecables compris). */
  function defiler(el, fin) {
    var origine = el.innerHTML;
    var texte = el.textContent;
    if (!/\d/.test(texte)) return;
    var lecteur = doc.createElement('span');
    lecteur.className = 'visuellement-cache';
    lecteur.textContent = texte;
    var vue = doc.createElement('span');
    vue.setAttribute('aria-hidden', 'true');
    var rails = [];
    /* Un nombre (chiffres et leurs separateurs internes) reste d un seul tenant : jamais coupe en fin de ligne
       pendant le defilement (« 2023 » ne passe pas en « 20 / 23 ») */
    var morceaux = texte.split(/(\d(?:[\d\u00a0\u202f.,]*\d)?)/);
    for (var m = 0; m < morceaux.length; m++) {
      var morceau = morceaux[m];
      if (!morceau) continue;
      if (!/^\d/.test(morceau)) { vue.appendChild(doc.createTextNode(morceau)); continue; }
      var bloc = doc.createElement('span');
      bloc.className = 'compteur-nombre';
      for (var i = 0; i < morceau.length; i++) {
        var c = morceau.charAt(i);
        if (c >= '0' && c <= '9') { var r = rail(c); rails.push(r); bloc.appendChild(r.col); }
        else bloc.appendChild(doc.createTextNode(c));
      }
      vue.appendChild(bloc);
    }
    el.textContent = '';
    el.appendChild(lecteur);
    el.appendChild(vue);
    window.requestAnimationFrame(function () {
      window.requestAnimationFrame(function () {
        for (var k = rails.length - 1, n = 0; k >= 0; k--, n++) {
          rails[k].rail.style.transitionDelay = (n * 40) + 'ms';
          rails[k].rail.style.transform = 'translateY(' + (-10 * rails[k].valeur) + '%)';
        }
      });
    });
    setTimeout(function () { el.innerHTML = origine; if (fin) fin(); }, 900 + rails.length * 40 + 120);
  }

  function compteurs() {
    var cibles = doc.querySelectorAll('[data-compteur]');
    if (!cibles.length || reduit || !IO) return;
    var obs = new IntersectionObserver(function (entrees) {
      entrees.forEach(function (en) {
        if (!en.isIntersecting) return;
        obs.unobserve(en.target);
        defiler(en.target);
      });
    }, { threshold: 0.6 });
    chaque(cibles, function (c) { obs.observe(c); });
  }

  /* ---------- 3. Releves en coin ---------- */
  function formatChrono(ms) {
    var dixiemes = Math.floor(ms / 100);
    var min = Math.floor(dixiemes / 600);
    var sec = Math.floor((dixiemes % 600) / 10);
    return min + ':' + (sec < 10 ? '0' : '') + sec + '.' + (dixiemes % 10);
  }

  function hudAfficherChrono(chrono, ms) {
    chrono.textContent = formatChrono(ms);
    if (!reduit) defiler(chrono);
  }

  /* Deux sentinelles placees aux tiers du defilement : leur passage fige un temps intermediaire */
  function hudSentinelles(surPassage) {
    var s = [doc.createElement('div'), doc.createElement('div')];
    chaque(s, function (el) {
      el.setAttribute('aria-hidden', 'true');
      el.style.cssText = 'position:absolute;left:0;width:1px;height:1px;pointer-events:none';
      doc.body.appendChild(el);
    });
    function placer() {
      var max = Math.max(1, html.scrollHeight - window.innerHeight);
      s[0].style.top = Math.round(max / 3) + 'px';
      s[1].style.top = Math.round(2 * max / 3) + 'px';
    }
    placer();
    if ('ResizeObserver' in window) new ResizeObserver(differer(placer, 150)).observe(doc.body);
    /* Zone d observation : tout ce qui est au-dessus du haut de l ecran. Un saut de defilement
       (Fin, Page bas) change donc toujours l etat d une sentinelle franchie. */
    var obs = new IntersectionObserver(function () {
      var passes = 0;
      chaque(s, function (el) { if (el.getBoundingClientRect().top < 0) passes++; });
      surPassage(passes);
    }, { rootMargin: '100000px 0px -100% 0px' });
    chaque(s, function (el) { obs.observe(el); });
  }

  /* Le titre de section dont le haut a passe le milieu de l ecran. On observe les titres eux-memes
     (leur passage sur la ligne du milieu) et les sections contigues (la ligne du milieu est toujours
     dans l une d elles, meme apres un saut de defilement : Fin, Page bas). Un titre trop long pour le
     cartouche se coupe au mot, avec un fondu en bout de ligne (classe .est-coupe), jamais d ellipse. */
  function hudSection(sortie) {
    var titres = doc.querySelectorAll('main h2');
    var blocs = doc.querySelectorAll('main > *');
    if (!sortie || !titres.length || !blocs.length) return;
    var affiche = null;
    function maj() {
      var milieu = window.innerHeight / 2;
      var courant = null;
      chaque(titres, function (t) { if (t.getBoundingClientRect().top < milieu) courant = t; });
      if (courant === affiche) return;
      affiche = courant;
      sortie.textContent = courant ? courant.textContent.replace(/\s+/g, ' ').trim() : '';
      sortie.classList.toggle('est-coupe', sortie.scrollWidth > sortie.clientWidth + 1);
    }
    var obs = new IntersectionObserver(maj, { rootMargin: '-50% 0px -50% 0px' });
    chaque(blocs, function (b) { obs.observe(b); });
    chaque(titres, function (t) { obs.observe(t); });
  }

  /* Un texte (paragraphe, liste, legende, bouton) qui passe sous un cartouche : le cartouche s efface le temps
     du passage, jamais un mot cache sous un releve. Zone observee : le rectangle du cartouche, elargi a sa
     largeur maximale (46vw) pour le gauche, qui s allonge avec le nom de section ; le droit garde sa largeur. */
  var SOUS_CARTOUCHE = 'main p, main li, main h2, main h3, main summary, main blockquote, main dt, main dd, main figcaption, main [class*="legende"], main .bouton, main .lien-texte, main label, main input, main textarea, main select, main td, main th';
  function hudMasquer(cartouche, versDroite) {
    var textes = doc.querySelectorAll(SOUS_CARTOUCHE);
    if (!textes.length) return;
    var obs = null;
    var vus = [];
    function poser() {
      if (obs) obs.disconnect();
      vus = [];
      cartouche.classList.remove('est-masque');
      var r = cartouche.getBoundingClientRect();
      if (!r.width || !r.height) return;
      var W = window.innerWidth;
      var gauche = r.left;
      var droite = versDroite ? Math.min(W, r.left + 0.46 * W) : r.right;
      var marge = [-Math.round(r.top - 4), -Math.round(Math.max(0, W - droite - 8)), -Math.round(window.innerHeight - r.bottom - 4), -Math.round(Math.max(0, gauche - 8))];
      obs = new IntersectionObserver(function (entrees) {
        entrees.forEach(function (en) {
          var i = vus.indexOf(en.target);
          if (en.isIntersecting && i < 0) vus.push(en.target);
          if (!en.isIntersecting && i >= 0) vus.splice(i, 1);
        });
        cartouche.classList.toggle('est-masque', vus.length > 0);
      }, { rootMargin: marge.join('px ') + 'px' });
      chaque(textes, function (l) { obs.observe(l); });
    }
    poser();
    window.addEventListener('resize', differer(poser, 200));
  }

  function hudVisibilite(huds) {
    var hero = doc.querySelector('[data-hero]') || doc.querySelector('main > section');
    var pied = doc.querySelector('.pied');
    var apresHero = !hero;
    var avantPied = true;
    function appliquer() { chaque(huds, function (h) { h.classList.toggle('est-visible', apresHero && avantPied); }); }
    if (hero) new IntersectionObserver(function (e) {
      apresHero = !e[0].isIntersecting && e[0].boundingClientRect.top < 0;
      appliquer();
    }).observe(hero);
    if (pied) new IntersectionObserver(function (e) {
      avantPied = !e[0].isIntersecting;
      appliquer();
    }, { rootMargin: '100000px 0px -50% 0px' }).observe(pied);
    appliquer();
  }

  function hud() {
    var gauche = doc.querySelector('.hud-gauche');
    var droite = doc.querySelector('.hud-droite');
    if (!gauche || !droite || !IO) return;
    var segments = gauche.querySelectorAll('.hud-segments i');
    var secteur = gauche.querySelector('.hud-secteur');
    var chrono = droite.querySelector('.hud-chrono');
    var temps = [null, null, null];
    /* Pas de chrono bloque a zero : le releve de droite attend le premier temps de secteur */
    droite.classList.add('est-en-attente');
    function figer(i) {
      temps[i] = window.performance.now();
      hudAfficherChrono(chrono, temps[i]);
      droite.classList.remove('est-en-attente');
    }
    function afficherSecteur(n) {
      chaque(segments, function (s, i) {
        s.classList.toggle('est-fait', i < n);
        s.classList.toggle('est-en-cours', i === n);
      });
      if (secteur) secteur.textContent = 'S' + (Math.min(n, 2) + 1);
    }
    hudSentinelles(function (passes) {
      afficherSecteur(passes);
      if (passes > 0 && temps[passes - 1] === null && chrono) figer(passes - 1);
    });
    var arrivee = doc.querySelector('.pied-arrivee, .pied .damier');
    if (arrivee && chrono) new IntersectionObserver(function (e) {
      if (!e[0].isIntersecting || temps[2] !== null) return;
      figer(2);
    }, { rootMargin: '100000px 0px 0px 0px' }).observe(arrivee);
    hudSection(gauche.querySelector('.hud-section'));
    hudMasquer(gauche, true);
    hudMasquer(droite, false);
    hudVisibilite([gauche, droite]);
  }

  /* ---------- 5. Damier en marches ---------- */
  /* On observe le parent : le damier lui-meme est masque par clip-path, que l observateur applique */
  function damiers() {
    var cibles = doc.querySelectorAll('.damier-marches');
    if (!cibles.length) return;
    if (!IO) { chaque(cibles, function (d) { d.classList.add('est-vue'); }); return; }
    var obs = new IntersectionObserver(function (entrees) {
      entrees.forEach(function (en) {
        if (!en.isIntersecting) return;
        chaque(en.target.querySelectorAll('.damier-marches'), function (d) { d.classList.add('est-vue'); });
        obs.unobserve(en.target);
      });
    }, { threshold: 0.5 });
    chaque(cibles, function (d) { obs.observe(d.parentElement || d); });
  }

  /* ---------- 6. Feux de depart (/liens), une fois par session ---------- */
  function feux() {
    if (reduit || !doc.querySelector('.feux')) return;
    try {
      if (window.sessionStorage.getItem('ckr_feux')) return;
      window.sessionStorage.setItem('ckr_feux', '1');
    } catch (e) { return; }
    html.classList.add('feux-depart');
  }

  /* ---------- 7. Citations a glisser du doigt : accessibles au clavier quand elles debordent ---------- */
  function citations() {
    var bandes = doc.querySelectorAll('.quotes[role="region"]');
    if (!bandes.length) return;
    function maj() {
      chaque(bandes, function (b) {
        if (b.scrollWidth > b.clientWidth + 1) b.setAttribute('tabindex', '0');
        else b.removeAttribute('tabindex');
      });
    }
    maj();
    window.addEventListener('resize', differer(maj, 150));
  }

  function demarrer() {
    var etapes = [navPleine, secteursRepli, hud, compteurs, damiers, feux, citations];
    for (var i = 0; i < etapes.length; i++) {
      try { etapes[i](); } catch (e) { /* une etape en echec ne casse jamais les autres */ }
    }
  }
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', demarrer);
  else demarrer();
})();
