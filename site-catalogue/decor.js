/* ============================================================
   Clem Kart Racing : decor.js (refonte « verre », 24/11/2026, deuxieme passe le 25/11)
   COPIE de "site v2/assets/decor.js" pour le site 2 : modifier l original, puis recopier ici.
   Le décor et les reflets, communs à toutes les pages :
   1. derrière le contenu : un circuit en lacets, fixe à l'écran, dont le tracé rouge avance avec le
      défilement, deux engrenages et (sur ordinateur) un volant qui braque comme le circuit tourne ;
   2. en haut du pied de page : la transmission (roue, engrenages, volant reliés par une chaîne) ;
   3. sur le verre : le reflet qui suit la souris (--mx, --my, --lum lus par verre.css) et le relief
      des cartes (--rx, --ry).
   Rien ne bouge tout seul : tout suit le geste du visiteur.
   Sans JavaScript ou avec le mouvement réduit : le circuit est dessiné en entier, immobile, sans reflet suivi.
   ============================================================ */
(function () {
  'use strict';
  var d = document;
  if (!d.body || d.querySelector('.decor')) return;
  var reduit = false, souris = false;
  try {
    reduit = matchMedia('(prefers-reduced-motion: reduce)').matches;
    souris = matchMedia('(hover: hover) and (pointer: fine)').matches;
  } catch (e) { /* vieux navigateur : on anime, sans reflet suivi */ }

  /* ---------- Les pièces ---------- */
  function svg(cls, corps) { return '<svg class="piece ' + cls + '" viewBox="-50 -50 100 100" aria-hidden="true">' + corps + '</svg>'; }
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
  function engrenage(n, R, r, trou, cls, matiere) {
    return svg(cls, '<path class="' + matiere + '" fill-rule="evenodd" d="' + dents(n, R, r, trou) + '"/><circle class="filet" r="' + (r - 8) + '"/>');
  }
  function anneau(R, r) { return 'M' + R + ' 0A' + R + ' ' + R + ' 0 1 0 ' + (-R) + ' 0A' + R + ' ' + R + ' 0 1 0 ' + R + ' 0ZM' + r + ' 0A' + r + ' ' + r + ' 0 1 1 ' + (-r) + ' 0A' + r + ' ' + r + ' 0 1 1 ' + r + ' 0Z'; }
  /* Roue de kart : le pneu, la jante à cinq trous, le moyeu */
  function roue(cls) {
    var trous = '';
    for (var i = 0; i < 5; i++) { var a = i * Math.PI * 2 / 5 - Math.PI / 2; trous += '<circle class="creux" cx="' + (Math.cos(a) * 19).toFixed(1) + '" cy="' + (Math.sin(a) * 19).toFixed(1) + '" r="5.6"/>'; }
    return svg(cls, '<path class="gomme" fill-rule="evenodd" d="' + anneau(48, 31) + '"/><circle class="filet" r="40" stroke-dasharray="3 5"/><circle class="metal" r="31"/>' + trous + '<circle class="braise" r="7"/>');
  }
  /* Volant : la couronne, trois branches, le moyeu, le repère rouge du point milieu */
  function volant(cls) {
    return svg(cls, '<path class="metal" fill-rule="evenodd" d="' + anneau(47, 38) + '"/><path class="metal" d="M-39 -5H39V5H-39Z"/><path class="metal" d="M-5 0H5V39H-5Z"/><circle class="metal" r="12"/><circle class="creux" r="5"/><path class="braise" d="M-3 -47H3V-38H-3Z"/>');
  }

  /* ---------- Le décor fixe ---------- */
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
    volant('decor-volant') +
    '<div class="decor-meca">' + engrenage(12, 46, 37, 13, 'dr-1', 'metal') + engrenage(8, 47, 34, 12, 'dr-2', 'braise') + '</div>';
  d.body.insertBefore(decor, d.body.firstChild);

  /* La transmission du pied de page, à la place de l'ancien damier */
  var arrivee = d.querySelector('.pied-arrivee');
  if (arrivee) {
    arrivee.innerHTML = '<div class="pied-meca">' + roue('pm-roue') +
      '<div class="pm-engrenages">' + engrenage(12, 46, 37, 13, 'pm-e1', 'metal') + engrenage(8, 47, 34, 12, 'pm-e2', 'braise') + '</div>' +
      volant('pm-volant') + '</div>';
  }

  var circuit = decor.querySelector('.decor-circuit'), tete = decor.querySelector('.decor-tete');
  var traits = [].slice.call(circuit.querySelectorAll('path'));
  var trace = traits[3];
  var grandes = [].slice.call(d.querySelectorAll('.dr-1, .pm-e1')), petites = [].slice.call(d.querySelectorAll('.dr-2, .pm-e2'));
  var roues = [].slice.call(d.querySelectorAll('.pm-roue')), volants = [].slice.call(d.querySelectorAll('.decor-volant, .pm-volant'));
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
    circuit.setAttribute('viewBox', '0 0 ' + w + ' ' + h);
    traits.forEach(function (t) { t.setAttribute('d', c); });
    longueur = trace.getTotalLength();
    traits.slice(1).forEach(function (t) { t.style.strokeDasharray = longueur; });
    maj();
  }
  function tourner(liste, valeur) { for (var i = 0; i < liste.length; i++) liste[i].style.transform = 'rotate(' + valeur.toFixed(2) + 'deg)'; }
  function maj() {
    attente = false;
    var y = window.scrollY || 0, max = d.documentElement.scrollHeight - window.innerHeight;
    /* Page courte (elle tient à l'écran) ou mouvement réduit : le circuit est dessiné en entier */
    var p = (reduit || max < 80) ? 1 : Math.max(0, Math.min(1, y / max));
    var fait = longueur * (.06 + .94 * p);
    traits.slice(1).forEach(function (t) { t.style.strokeDashoffset = longueur - fait; });
    var pt = trace.getPointAtLength(fait);
    tete.style.transform = 'translate3d(' + pt.x.toFixed(1) + 'px,' + pt.y.toFixed(1) + 'px,0)';
    if (reduit) return;
    tourner(grandes, y * .12);
    tourner(petites, 22.5 - y * .18);
    tourner(roues, y * .3);
    /* Le volant braque dans le sens où le circuit tourne à cet endroit */
    var suite = trace.getPointAtLength(Math.min(longueur, fait + 8));
    tourner(volants, Math.atan2(suite.x - pt.x, Math.max(.001, suite.y - pt.y)) * 180 / Math.PI * .5);
  }
  function demander() { if (!attente) { attente = true; requestAnimationFrame(maj); } }

  tracer();
  decor.classList.add('est-pret');
  window.addEventListener('scroll', demander, { passive: true });
  window.addEventListener('resize', function () { if (!attente) { attente = true; requestAnimationFrame(tracer); } });
  /* Les images et les polices changent la hauteur de la page : on recale la progression une fois chargé */
  window.addEventListener('load', demander);

  /* ---------- Le reflet qui suit la souris, et le relief des cartes ---------- */
  if (!souris) return;
  var VERRE = '.bouton, .lien-bio, .preuves-ligne li, .portes a, .pied-grille ul a, .formule, .quote-colonne, .faq details, .vente-mythes li, .registre-ligne, .gratuit-carte, .sommaire-carte, .bloc-prix, .opt, .next, .btp';
  var RELIEF = '.lien-bio, .portes a, .preuves-ligne li, .formule, .quote-colonne';
  var cible = null, dernier = null, reflet = false;
  function poser() {
    reflet = false;
    if (!cible || !dernier) return;
    var r = cible.getBoundingClientRect(), x = dernier.clientX - r.left, y = dernier.clientY - r.top;
    cible.style.setProperty('--mx', x.toFixed(0) + 'px');
    cible.style.setProperty('--my', y.toFixed(0) + 'px');
    if (!reduit && cible.matches(RELIEF) && r.width && r.height) {
      cible.style.setProperty('--ry', ((x / r.width - .5) * 7).toFixed(2) + 'deg');
      cible.style.setProperty('--rx', ((.5 - y / r.height) * 7).toFixed(2) + 'deg');
    }
  }
  d.addEventListener('pointermove', function (e) {
    if (e.pointerType && e.pointerType !== 'mouse') return;
    var el = e.target && e.target.closest ? e.target.closest(VERRE) : null;
    if (el !== cible) {
      if (cible) { cible.style.removeProperty('--rx'); cible.style.removeProperty('--ry'); }
      cible = el;
    }
    dernier = e;
    if (cible && !reflet) { reflet = true; requestAnimationFrame(poser); }
  }, { passive: true });
})();
