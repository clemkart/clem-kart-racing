/* ============================================================
   Clem Kart Racing : decor.js (refonte « verre », 24/11/2026)
   COPIE de "site v2/assets/decor.js" pour le site 2 : modifier l original, puis recopier ici.
   Le décor commun à toutes les pages, posé derrière le contenu :
   1. un circuit en lacets, fixe à l'écran, dont le tracé rouge avance avec le défilement ;
   2. deux engrenages qui tournent d'un cran à mesure qu'on descend.
   Rien ne bouge tout seul : tout suit le geste du visiteur. Les panneaux de verre
   (verre.css) floutent ce décor en passant dessus.
   Sans JavaScript ou avec le mouvement réduit : le circuit est dessiné en entier, immobile.
   ============================================================ */
(function () {
  'use strict';
  var d = document;
  if (!d.body || d.querySelector('.decor')) return;
  var reduit = false;
  try { reduit = matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { /* vieux navigateur : on anime */ }

  /* Engrenage : n dents, rayon extérieur R, rayon de fond r, trou central */
  function dents(n, R, r, trou) {
    var p = '', pas = Math.PI * 2 / n;
    for (var i = 0; i < n; i++) {
      var a = i * pas;
      [[a - pas * .3, r], [a - pas * .16, R], [a + pas * .16, R], [a + pas * .3, r]].forEach(function (c, k) {
        p += (i === 0 && k === 0 ? 'M' : 'L') + (Math.cos(c[0]) * c[1]).toFixed(2) + ' ' + (Math.sin(c[0]) * c[1]).toFixed(2);
      });
    }
    return p + 'ZM' + trou + ' 0A' + trou + ' ' + trou + ' 0 1 0 ' + (-trou) + ' 0A' + trou + ' ' + trou + ' 0 1 0 ' + trou + ' 0Z';
  }
  function roue(n, R, r, trou, cls) {
    return '<svg class="decor-roue ' + cls + '" viewBox="-50 -50 100 100"><path fill-rule="evenodd" d="' + dents(n, R, r, trou) + '"/><circle r="' + (r - 8) + '"/></svg>';
  }

  var decor = d.createElement('div');
  decor.className = 'decor';
  decor.setAttribute('aria-hidden', 'true');
  decor.innerHTML =
    '<svg class="decor-defs" width="0" height="0"><defs>' +
    '<linearGradient id="dc-metal" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".9"/><stop offset=".5" stop-color="#C9C6C0" stop-opacity=".45"/><stop offset="1" stop-color="#fff" stop-opacity=".2"/></linearGradient>' +
    '<linearGradient id="dc-braise" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FF6A5E"/><stop offset="1" stop-color="#B00500"/></linearGradient>' +
    '</defs></svg>' +
    '<svg class="decor-circuit"><path class="dc-fantome"/><path class="dc-halo"/><path class="dc-lueur"/><path class="dc-trace"/></svg>' +
    '<i class="decor-tete"></i>' +
    '<div class="decor-meca">' + roue(12, 46, 37, 13, 'dr-1') + roue(8, 47, 34, 12, 'dr-2') + '</div>';
  d.body.insertBefore(decor, d.body.firstChild);

  var svg = decor.querySelector('.decor-circuit'), tete = decor.querySelector('.decor-tete');
  var traits = [].slice.call(svg.querySelectorAll('path'));
  var trace = traits[3], r1 = decor.querySelector('.dr-1'), r2 = decor.querySelector('.dr-2');
  var longueur = 0, attente = false;

  /* Le circuit : quatre lacets, du haut à droite au bas de l'écran. Tangentes verticales aux virages. */
  function chemin(w, h) {
    var p = [[.88, -.06], [.14, .2], [.86, .46], [.12, .72], [.62, 1.06]], s = '';
    for (var i = 0; i < p.length; i++) {
      var x = p[i][0] * w, y = p[i][1] * h;
      if (!i) { s = 'M' + x.toFixed(1) + ' ' + y.toFixed(1); continue; }
      var x0 = p[i - 1][0] * w, y0 = p[i - 1][1] * h, dy = (y - y0) * .56;
      s += 'C' + x0.toFixed(1) + ' ' + (y0 + dy).toFixed(1) + ' ' + x.toFixed(1) + ' ' + (y - dy).toFixed(1) + ' ' + x.toFixed(1) + ' ' + y.toFixed(1);
    }
    return s;
  }
  function tracer() {
    var w = d.documentElement.clientWidth, h = window.innerHeight, c = chemin(w, h);
    svg.setAttribute('viewBox', '0 0 ' + w + ' ' + h);
    traits.forEach(function (t) { t.setAttribute('d', c); });
    longueur = trace.getTotalLength();
    traits.slice(1).forEach(function (t) { t.style.strokeDasharray = longueur; });
    maj();
  }
  function maj() {
    attente = false;
    var y = window.scrollY || 0, max = d.documentElement.scrollHeight - window.innerHeight;
    /* Page courte (elle tient à l'écran) ou mouvement réduit : le circuit est dessiné en entier */
    var p = (reduit || max < 80) ? 1 : Math.max(0, Math.min(1, y / max));
    var fait = longueur * (.06 + .94 * p);
    traits.slice(1).forEach(function (t) { t.style.strokeDashoffset = longueur - fait; });
    var pt = trace.getPointAtLength(fait);
    tete.style.transform = 'translate3d(' + pt.x.toFixed(1) + 'px,' + pt.y.toFixed(1) + 'px,0)';
    if (!reduit) {
      r1.style.transform = 'rotate(' + (y * .12).toFixed(2) + 'deg)';
      r2.style.transform = 'rotate(' + (22.5 - y * .18).toFixed(2) + 'deg)';
    }
  }
  function demander() { if (!attente) { attente = true; requestAnimationFrame(maj); } }

  tracer();
  decor.classList.add('est-pret');
  window.addEventListener('scroll', demander, { passive: true });
  window.addEventListener('resize', function () { if (!attente) { attente = true; requestAnimationFrame(tracer); } });
  /* Les images et les polices changent la hauteur de la page : on recale la progression une fois chargé */
  window.addEventListener('load', demander);
})();
