/* ============================================================
   Clem Kart Racing : site.js
   Aucune dependance. Charge en fin de body (defer) sur chaque page.
   1. Apparitions au defilement (.reveal), une seule fois.
   2. Suivi anonyme : reutilise la fonction track-site du site 1
      (pageview, bio_click, stripe_click, faq_open), sans cookie.
   3. Propagation des UTM vers les liens internes.
   4. Menu mobile, barre collante des pages de vente.
   Les balises a doubles accolades sont remplacees par scripts/build.js.
   ============================================================ */
(function () {
  'use strict';

  var doc = document;
  var html = doc.documentElement;
  html.classList.add('a-js');

  /* ---------- Config injectee au build ---------- */
  var SITE1 = '{{sites.site1}}';
  var SITE2 = '{{sites.site2}}';
  var TRACK_PATH = '/.netlify/functions/track-site';
  var CLE_SESSION = 'ckr_sid';
  var CLE_UTM = 'ckr_utm';

  var reduitMouvement = false;
  try {
    reduitMouvement = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch (e) { reduitMouvement = false; }

  function hote(url) {
    try { return new URL(url).hostname.toLowerCase(); } catch (e) { return ''; }
  }

  /* La fonction vit sur le site 1. Depuis le site 2 (ou ses brouillons), on l appelle en absolu. */
  function urlSuivi() {
    var ici = location.hostname.toLowerCase();
    var h2 = hote(SITE2);
    if (h2 && (ici === h2 || ici.slice(-(h2.length + 2)) === '--' + h2)) return SITE1 + TRACK_PATH;
    return TRACK_PATH;
  }
  var FN = urlSuivi();

  /* ---------- 1. Session et UTM ---------- */
  var sid = null;
  var utm = {};
  try {
    sid = sessionStorage.getItem(CLE_SESSION);
    if (!sid) {
      sid = (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : String(Date.now()) + '-' + Math.random().toString(16).slice(2);
      sessionStorage.setItem(CLE_SESSION, sid);
    }
    var q = new URLSearchParams(location.search);
    if (q.get('utm_source')) {
      utm = { utm_source: q.get('utm_source'), utm_medium: q.get('utm_medium'), utm_campaign: q.get('utm_campaign') };
      sessionStorage.setItem(CLE_UTM, JSON.stringify(utm));
    } else {
      utm = JSON.parse(sessionStorage.getItem(CLE_UTM) || '{}') || {};
    }
  } catch (e) { sid = null; utm = {}; }

  /* ---------- 2. Envoi d un evenement (jamais bloquant) ---------- */
  function suivre(type, meta) {
    try {
      var corps = JSON.stringify({
        type: type,
        site: location.hostname,
        path: location.pathname,
        referrer: doc.referrer || '',
        utm_source: utm.utm_source || null,
        utm_medium: utm.utm_medium || null,
        utm_campaign: utm.utm_campaign || null,
        session_id: sid,
        meta: meta || null
      });
      /* text/plain : pas de requete preliminaire CORS, et l envoi part meme pendant un changement de page */
      if (navigator.sendBeacon && navigator.sendBeacon(FN, new Blob([corps], { type: 'text/plain;charset=UTF-8' }))) return;
      fetch(FN, { method: 'POST', mode: 'no-cors', keepalive: true, headers: { 'Content-Type': 'text/plain;charset=UTF-8' }, body: corps });
    } catch (e) { /* le suivi ne casse jamais la page */ }
  }
  /* Les deux noms historiques restent valables (site 1 : __ckrTrack, site 2 : ckrTrack) */
  window.ckrTrack = suivre;
  window.__ckrTrack = suivre;
  window.ckrSid = function () { return sid; };
  window.ckrUtm = function () { return utm; };

  suivre('pageview');

  /* ---------- 3. Liens internes : UTM propages, locale sur /aller/* ---------- */
  function estInterne(a) {
    var href = a.getAttribute('href') || '';
    if (!href || href.charAt(0) === '#') return false;
    if (/^(mailto:|tel:|javascript:)/i.test(href)) return false;
    try { return new URL(a.href).origin === location.origin; } catch (e) { return false; }
  }
  function estPorteStripe(a) {
    return /^\/aller\//.test(a.pathname || '');
  }
  function ajouterParams(a, params) {
    try {
      var u = new URL(a.href);
      var change = false;
      Object.keys(params).forEach(function (k) {
        if (params[k] && !u.searchParams.has(k)) { u.searchParams.set(k, params[k]); change = true; }
      });
      if (change) a.href = u.toString();
    } catch (e) { /* lien laisse tel quel */ }
  }

  function preparerLiens() {
    var liens = doc.querySelectorAll('a[href]');
    var plateforme = utm.utm_source || '';
    var position = 0;
    for (var i = 0; i < liens.length; i++) {
      var a = liens[i];
      if (!estInterne(a)) continue;
      if (a.hasAttribute('data-bio')) {
        /* Page de liens : chaque bouton porte sa propre campagne, la plateforme vient de la bio */
        position += 1;
        a.setAttribute('data-bio-position', String(position));
        if (!estPorteStripe(a)) {
          ajouterParams(a, { utm_source: plateforme, utm_medium: plateforme ? 'bio' : '', utm_campaign: a.getAttribute('data-bio') });
        }
        continue;
      }
      if (estPorteStripe(a)) {
        /* Les portes vers Stripe ne recoivent aucun UTM : seulement la langue */
        ajouterParams(a, { locale: 'fr' });
        continue;
      }
      ajouterParams(a, { utm_source: utm.utm_source, utm_medium: utm.utm_medium, utm_campaign: utm.utm_campaign });
    }
  }

  /* ---------- 4. Clics suivis ---------- */
  doc.addEventListener('click', function (e) {
    var a = e.target && e.target.closest ? e.target.closest('a[href]') : null;
    if (!a) return;
    if (a.hasAttribute('data-bio')) {
      suivre('bio_click', {
        bouton: a.getAttribute('data-bio'),
        position: Number(a.getAttribute('data-bio-position') || 0),
        plateforme: utm.utm_source || 'direct'
      });
      return;
    }
    if (estPorteStripe(a)) {
      suivre('stripe_click', {
        cta: a.getAttribute('data-cta') || a.className || '',
        zone: a.getAttribute('data-zone') || '',
        route: a.pathname
      });
      return;
    }
    var href = a.getAttribute('href') || '';
    if (href.indexOf('/extrait') === 0 || href.indexOf('extrait-guide') > -1) suivre('extract_click', { cta: a.getAttribute('data-cta') || a.className || '' });
  }, { passive: true });

  /* FAQ : question ouverte (meta.q = rang dans la page) */
  function preparerFaq() {
    var details = doc.querySelectorAll('.faq details');
    for (var i = 0; i < details.length; i++) {
      (function (d, n) {
        d.addEventListener('toggle', function () { if (d.open) suivre('faq_open', { q: n }); });
      })(details[i], i + 1);
    }
  }

  /* ---------- 5. Apparitions au defilement, une seule fois ---------- */
  function preparerReveal() {
    var cibles = doc.querySelectorAll('.reveal');
    if (!cibles.length) return;
    if (reduitMouvement || !('IntersectionObserver' in window)) {
      for (var i = 0; i < cibles.length; i++) cibles[i].classList.add('est-visible');
      return;
    }
    var obs = new IntersectionObserver(function (entrees) {
      entrees.forEach(function (en) {
        if (!en.isIntersecting) return;
        en.target.classList.add('est-visible');
        obs.unobserve(en.target);
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.1 });
    for (var j = 0; j < cibles.length; j++) obs.observe(cibles[j]);
  }

  /* ---------- 6. Menu mobile ---------- */
  function preparerMenu() {
    var nav = doc.querySelector('.nav');
    var bouton = doc.querySelector('.nav-menu-bouton');
    if (!nav || !bouton) return;
    function basculer(ouvrir) {
      nav.classList.toggle('est-ouverte', ouvrir);
      doc.body.classList.toggle('menu-ouvert', ouvrir);
      bouton.setAttribute('aria-expanded', ouvrir ? 'true' : 'false');
      bouton.textContent = ouvrir ? 'Fermer' : 'Menu';
    }
    bouton.addEventListener('click', function () {
      var ouvrir = !nav.classList.contains('est-ouverte');
      basculer(ouvrir);
      /* Clavier et lecteur d ecran : le focus entre dans le menu, sur la premiere destination */
      if (ouvrir) {
        var premier = nav.querySelector('.nav-liens a');
        if (premier) { try { premier.focus({ preventScroll: true }); } catch (e) { premier.focus(); } }
      }
    });
    doc.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && nav.classList.contains('est-ouverte')) { basculer(false); bouton.focus(); }
    });
    /* Un lien du menu choisi : le menu se referme (utile pour les ancres de la meme page) */
    nav.addEventListener('click', function (e) {
      if (e.target && e.target.closest && e.target.closest('.nav-liens a')) basculer(false);
    });
    /* Passage en largeur ordinateur : le menu telephone ne reste pas ouvert */
    try {
      /* Meme seuil que base.css (section 7) : au-dela, les liens tiennent dans la barre */
      var bureau = window.matchMedia('(min-width: 1024px)');
      var surChangement = function (m) { if (m.matches) basculer(false); };
      if (bureau.addEventListener) bureau.addEventListener('change', surChangement);
      else if (bureau.addListener) bureau.addListener(surChangement);
    } catch (e) { /* rien */ }
  }

  /* Page courante marquee dans la navigation */
  function marquerPageCourante() {
    var liens = doc.querySelectorAll('.nav-liens a');
    var ici = location.pathname.replace(/\/index\.html$/, '/').replace(/\/$/, '') || '/';
    for (var i = 0; i < liens.length; i++) {
      var p = (liens[i].pathname || '').replace(/\/$/, '') || '/';
      if (p === ici) liens[i].setAttribute('aria-current', 'page');
    }
  }

  /* ---------- 7. Barre collante : visible une fois le hero passe ---------- */
  function preparerBarre() {
    var barre = doc.querySelector('.barre');
    var hero = doc.querySelector('[data-hero]') || doc.querySelector('.hero');
    if (!barre) return;
    doc.body.classList.add('a-barre');
    if (!hero || !('IntersectionObserver' in window)) { barre.classList.add('est-visible'); return; }
    var obs = new IntersectionObserver(function (entrees) {
      var en = entrees[0];
      var passe = !en.isIntersecting && en.boundingClientRect.bottom < 0;
      barre.classList.toggle('est-visible', passe);
    }, { threshold: 0 });
    obs.observe(hero);
  }

  /* ---------- 8. Ancrage doux vers une section (?section=cgv) ---------- */
  function allerSection() {
    try {
      var s = new URLSearchParams(location.search).get('section');
      if (!s) return;
      var cible = doc.getElementById(s);
      if (cible) cible.scrollIntoView({ behavior: reduitMouvement ? 'auto' : 'smooth', block: 'start' });
    } catch (e) { /* rien */ }
  }

  function demarrer() {
    preparerLiens();
    preparerFaq();
    preparerReveal();
    preparerMenu();
    marquerPageCourante();
    preparerBarre();
    allerSection();
  }
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', demarrer);
  else demarrer();
})();
