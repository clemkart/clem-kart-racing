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
