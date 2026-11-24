/* page-vente.js : video de vente (Short YouTube) et barre d achat fixe sur telephone (/livre).
   Rien de YouTube ne se charge avant le clic sur la miniature. */
(function () {
  function suivre(type, meta) { if (window.ckrTrack) window.ckrTrack(type, meta); }

  var bloc = document.querySelector('.vente-video');
  if (bloc) {
    var id = bloc.getAttribute('data-video');
    var lancer = bloc.querySelector('.vente-video-lancer');
    var fin = bloc.querySelector('.vente-video-fin');
    var revoir = bloc.querySelector('.vente-video-revoir');
    var lecteur = null;

    var chargerApi = function (pret) {
      if (window.YT && window.YT.Player) { pret(); return; }
      var precedent = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = function () { if (precedent) precedent(); pret(); };
      var s = document.createElement('script');
      s.src = 'https://www.youtube.com/iframe_api';
      document.head.appendChild(s);
    };

    lancer.addEventListener('click', function () {
      suivre('video_play', { video: id });
      /* Le cadre est cree pendant le clic : le navigateur accepte alors la lecture automatique */
      var cadre = document.createElement('iframe');
      cadre.src = 'https://www.youtube-nocookie.com/embed/' + id + '?autoplay=1&playsinline=1&rel=0&modestbranding=1&enablejsapi=1&origin=' + encodeURIComponent(location.origin);
      cadre.title = 'Vidéo de présentation du livre';
      cadre.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
      cadre.allowFullscreen = true;
      bloc.insertBefore(cadre, lancer);
      lancer.hidden = true;
      chargerApi(function () {
        lecteur = new window.YT.Player(cadre, {
          events: {
            onStateChange: function (e) {
              if (e.data === 0) { fin.hidden = false; suivre('video_fin', { video: id }); }
            }
          }
        });
      });
    });

    revoir.addEventListener('click', function () {
      fin.hidden = true;
      if (lecteur && lecteur.seekTo) { lecteur.seekTo(0, true); lecteur.playVideo(); }
    });
  }

  /* Lecture de la page (anonyme, une fois par chargement) :
     - lecture : 25, 50 puis 90 % de la page parcourus (meta.pct) ;
     - prix_vu : le bloc de l offre (data-suivi="prix") est reste a l ecran ;
     - cta_vu : un bouton d achat (porte /aller/*) est apparu a moitie au moins (meta.cta).
     Le dashboard en deduit ou les visiteurs decrochent entre l arrivee et le clic. */
  var paliers = [25, 50, 90];
  var atteints = {};
  function mesurerLecture() {
    var hauteur = Math.max(document.documentElement.scrollHeight, document.body ? document.body.scrollHeight : 0);
    var vu = (window.scrollY || window.pageYOffset || 0) + (window.innerHeight || 0);
    if (!hauteur) return;
    var p = (vu / hauteur) * 100;
    for (var i = 0; i < paliers.length; i++) {
      if (p >= paliers[i] && !atteints[paliers[i]]) { atteints[paliers[i]] = true; suivre('lecture', { pct: paliers[i] }); }
    }
    if (atteints[90]) window.removeEventListener('scroll', surDefilement);
  }
  var attente = null;
  function surDefilement() {
    if (attente) return;
    attente = setTimeout(function () { attente = null; mesurerLecture(); }, 250);
  }
  window.addEventListener('scroll', surDefilement, { passive: true });
  /* Une page courte (grand ecran) peut deja etre lue a 25 % sans defiler */
  setTimeout(mesurerLecture, 1500);

  if ('IntersectionObserver' in window) {
    var prix = document.querySelector('[data-suivi="prix"]');
    if (prix) {
      var minuteur = null;
      var obsPrix = new IntersectionObserver(function (entrees) {
        var e = entrees[0];
        /* Une seconde a l ecran : un defilement rapide ne compte pas comme « prix vu » */
        if (e.isIntersecting) {
          if (!minuteur) minuteur = setTimeout(function () { suivre('prix_vu', { zone: 'offre' }); obsPrix.disconnect(); }, 1000);
        } else if (minuteur) { clearTimeout(minuteur); minuteur = null; }
      }, { threshold: 0.4 });
      obsPrix.observe(prix);
    }
    var boutonsVus = {};
    var obsBoutons = new IntersectionObserver(function (entrees) {
      entrees.forEach(function (e) {
        if (!e.isIntersecting) return;
        var cta = e.target.getAttribute('data-cta') || 'bouton';
        obsBoutons.unobserve(e.target);
        if (boutonsVus[cta]) return;
        boutonsVus[cta] = true;
        suivre('cta_vu', { cta: cta, zone: e.target.getAttribute('data-zone') || '' });
      });
    }, { threshold: 0.5 });
    /* La barre fixe et l ecran de fin de video ne comptent pas : ils n apparaissent que sous condition */
    var boutons = document.querySelectorAll('a[data-cta][href*="/aller/"]');
    for (var b = 0; b < boutons.length; b++) {
      var c = boutons[b].getAttribute('data-cta');
      if (c !== 'barre' && c !== 'video-fin') obsBoutons.observe(boutons[b]);
    }
  }

  /* Barre fixe : visible quand ni le bouton du haut ni celui du bas ne sont a l ecran */
  var barre = document.querySelector('.vente-barre');
  var haut = document.querySelector('.vente-tete .vente-action');
  var bas = document.querySelector('.vente-bloc:last-of-type .vente-action');
  if (barre && haut && 'IntersectionObserver' in window) {
    var vus = new Map();
    var lien = barre.querySelector('a');
    var obs = new IntersectionObserver(function (entrees) {
      entrees.forEach(function (e) { vus.set(e.target, e.isIntersecting); });
      var montrer = !vus.get(haut) && !(bas && vus.get(bas));
      barre.classList.toggle('est-visible', montrer);
      barre.setAttribute('aria-hidden', montrer ? 'false' : 'true');
      if (lien) lien.tabIndex = montrer ? 0 : -1;
    });
    obs.observe(haut);
    if (bas) obs.observe(bas);
  }
})();
