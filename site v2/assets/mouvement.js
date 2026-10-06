/* ============================================================
   Clem Kart Racing : mouvement.js (direction V5, chapitre 4)
   Le moteur d animation des pages a mouvement. Il se pilote par des attributs
   dans le HTML : une page s en sert SANS modifier ce fichier.

   ---------- CHARGEMENT ----------
   Dans le <head>, juste apres la balise partial:head : la balise partial:mouvement
   (entre doubles accolades, comme partial:head).
   Elle pose html.js-anim (si le mouvement n est pas reduit), charge GSAP 3.15,
   ScrollTrigger, SplitText, Lenis (CDN, integrity, defer) puis ce fichier.
   Garde-fous : si un CDN repond en erreur, js-anim tombe et tout s affiche. Aucune minuterie ne coupe
   l entree : elle est en CSS (signature.css, chapitre 10) et ne depend pas des CDN, sauf le decoupage du h1
   en lignes (SplitText) et les dessins du premier ecran, qui ont chacun un secours CSS (le script les laisse
   finir s ils ont commence). Sans ce fichier au bout de 4 s : html.anim-secours affiche les etats qui
   attendent le script (circuit, cordes). Avec prefers-reduced-motion: reduce, js-anim n est jamais pose :
   rien ne bouge, la trajectoire et le circuit sont dessines en entier.

   ---------- LA TRAJECTOIRE (3.1) ----------
   <main id="contenu" data-trajectoire>
     Un trait rouge dessine au defilement, du depart a l arrivee.
   .depart (dans le premier ecran) : <div class="depart"><span class="depart-s1" aria-hidden="true">S1</span>
     <span class="damier"></span><span class="depart-trait"></span></div>. Le trace part du bout du trait rouge.
   [data-virage="g"] ou [data-virage="d"] sur un titre de section : une corde dans le couloir
     gauche ou droit, a hauteur de sa premiere ligne. Alterner g et d dans l ordre de la page.
   L arrivee est le damier du pied de page (_partials/footer.html, .pied-arrivee). Rien a ajouter.
   Les cordes s allument au passage de la tete ; deux reperes de secteur (S2, S3) coupent le trace.

   ---------- L ENTREE DU PREMIER ECRAN (4.5) ----------
   Joue en CSS des le premier rendu (signature.css), sauf les lignes du titre (ici, avec SplitText).
   [data-entree="photo"]  cadre d une photo : son <picture> ou <img> enfant passe de l echelle 1,12 a 1.
                          Echelle de depart : style="--entree-echelle: 1.06" sur le cadre.
   [data-entree="titre"]  h1 ou ligne de titre : lignes qui montent derriere un masque (SplitText).
   [data-entree="texte"]  chapo, actions : montent de 16 px en apparaissant.
   [data-entree="objet"]  couverture : monte de 40 px et tourne de 4 a 0 degre.
   [data-entree="depart"] la ligne de depart : damier en marches, puis le trait se dessine.
   Reglages en millisecondes : data-t="150" (debut, multiple de 10 jusqu a 700) et data-duree="800"
   (duree des lignes du titre seulement).
   Par defaut : photo 0/1400, titre 150/800, texte 300/600, objet 200/1000, depart 700/900.

   ---------- AU DEFILEMENT ----------
   Titres : chaque h2 de <main> sous le premier ecran monte ligne a ligne derriere un masque,
     a 85 % de la hauteur de l ecran, une fois. Rien a ajouter. data-revele="non" pour l exclure,
     data-revele pour l appliquer a un autre element. (Les blocs gardent .reveal de site.js.)
   [data-remplissage]     UNE phrase par page : chaque mot passe de 50 % a 100 % d opacite.
   [data-volet]           cadre photo : volet clip-path qui descend du haut a l entree (une fois, 0,9 s).
   [data-relief]          cadre .cine : l image glisse dans son cadre (relief). Valeur facultative :
                          un selecteur du parent qui sert de declencheur (ex. data-relief="article"
                          pour un cadre colle en position: sticky). Meme valeur possible pour data-volet.
   [data-parallaxe="8"]   l element monte de 8 % de sa hauteur plus vite que la page.
   [data-aimant]          bouton principal (premier ecran, bloc prix, bloc final) : magnetisme leger,
                          ordinateur a souris seulement. A poser APRES href.
   [data-affiche]         premier ecran de l accueil : [data-affiche-cadre] (le cadre photo),
                          [data-affiche-image] (l image), [data-affiche-texte] (blocs de texte) :
                          l ecran de cinema s eloigne en quittant l ecran.
   [data-compteur]        chiffre de la config qui defile une fois (gere par interface.js).

   ---------- DESSINS (traces SVG, apparitions, allumages) ----------
   [data-dessin]              conteneur : joue quand il entre a l ecran (75 %), une fois.
   [data-dessin="chargement"] conteneur du premier ecran : joue au chargement.
     Enfants, tous avec data-t (debut en ms) et data-duree (ms) :
     [data-trace]       trace SVG qui se dessine (path, line, polyline, circle). Un trace en pointille
                        se devoile par un balayage : data-balayage="droite|gauche|haut|bas".
     [data-apparait]    apparait en fondu ; data-apparait="echelle" : de 0,6 a 1 en plus ;
                        data-pas="60" : ses enfants apparaissent un par un, 60 ms d ecart.
     [data-allume]      recoit la classe .est-allumee (une .corde s allume et son anneau s elargit).
   Exemples : virage de /guide (data-dessin="chargement", trace a 600/1000, corde a 1600),
   croyances (apprise 0/600, grip 600/900, points 1500 echelle, textes 1600 pas 60), 404.

   ---------- CIRCUIT DU GUIDE (3.3) ----------
   svg.circuit[data-circuit="offerts"] dans un parent [data-extrait-version] : le trace va du depart
     au dernier virage offert, les virages offerts s allument au passage (signature.css dit lesquels).
   [data-scene="sommaire"] : un svg.circuit et les chapitres (.sommaire-chapitre ou [data-chapitre])
     dans l ordre 1 a 13. Le chapitre dont le milieu passe le milieu de l ecran devient actif :
     classes .est-actif et .est-lu sur les chapitres, .est-allume et .est-actif sur les virages.
   ---------- SEGMENTS (trois temps du consulting) ----------
   [data-segments] (ou [data-scene="trois-temps"]) et ses enfants [data-segment] : chaque segment
     recoit --remplissage de 0 a 1 pendant son tiers de la section. La feuille de page dessine
     le remplissage : transform: scaleX(var(--remplissage, 1)) (plein sans script).

   Classes utiles : html.js-anim (mouvement actif), html.lenis (defilement doux actif).
   Aucun prix, aucun texte : ce fichier ne contient jamais deux accolades de suite.
   ============================================================ */
(function () {
  'use strict';

  var win = window;
  var doc = document;
  var html = doc.documentElement;
  win.__ckrMouvement = true;

  var gsap = win.gsap;
  var ST = win.ScrollTrigger;
  var Split = win.SplitText;
  var LenisLib = win.Lenis;
  var NS = 'http://www.w3.org/2000/svg';
  var BUREAU = '(min-width: 900px)';
  var TELEPHONE = '(max-width: 899px)';
  var LONGUEURS = [0, 360, 491, 597, 713, 841, 965, 1094, 1209, 1323, 1448, 1590, 1720, 1845, 2002];
  var DEFAUTS = { photo: [0, 1400], titre: [150, 800], texte: [300, 600], objet: [200, 1000], depart: [700, 900] };
  var NAV_H = 56;

  function mq(q) { try { return win.matchMedia(q).matches; } catch (e) { return false; } }
  function chaque(liste, fn) { Array.prototype.forEach.call(liste, fn); }
  function tous(sel, racine) { return Array.prototype.slice.call((racine || doc).querySelectorAll(sel)); }
  function nombre(el, attr, defaut) { var v = parseFloat(el.getAttribute(attr)); return isNaN(v) ? defaut : v; }
  function borne(v, a, b) { return Math.min(b, Math.max(a, v)); }
  function svgEl(nom, attrs, parent) {
    var e = doc.createElementNS(NS, nom);
    Object.keys(attrs || {}).forEach(function (k) { e.setAttribute(k, attrs[k]); });
    if (parent) parent.appendChild(e);
    return e;
  }

  var mouvement = mq('(prefers-reduced-motion: no-preference)');
  var outils = !!(gsap && ST);
  var entreeAutorisee = html.classList.contains('js-anim');

  /* ============================================================
     1. TRAJECTOIRE : geometrie (3.1)
     ============================================================ */
  /* Boite de mise en page d un element, relative a <main> : les decalages ignorent les transformations
     (trait de depart a l echelle 0 pendant l entree, blocs .reveal pas encore montes, affiche qui s eloigne). */
  function boite(el, main) {
    var x = 0;
    var y = 0;
    var n = el;
    while (n && n !== main) { x += n.offsetLeft; y += n.offsetTop; n = n.offsetParent; }
    if (n === main) return { x: x, y: y, w: el.offsetWidth, h: el.offsetHeight };
    var rM = main.getBoundingClientRect();
    var r = el.getBoundingClientRect();
    return { x: r.left - rM.left, y: r.top - rM.top, w: r.width, h: r.height };
  }

  function px(el, prop) { return parseFloat(win.getComputedStyle(el)[prop]) || 0; }

  /* Taille des cordes : petite sur telephone, ou la gouttiere ne fait que 16 px */
  var ETROIT = 600;
  var ECART_TEXTE = 10;
  function tailleCorde() {
    return win.innerWidth < ETROIT ? { anneau: 5, disque: 3 } : { anneau: 8.5, disque: 5 };
  }

  /* Couloirs : a mi-chemin entre le bord de l ecran et le bord du contenu.
     La corde avance vers le titre sans jamais l approcher a moins de 10 px (anneau et son trait compris).
     Sous 600 px, la gouttiere est trop etroite pour cet ecart : couloir a 6 px du bord, petite corde. */
  function couloirs(main) {
    var c = main.querySelector('.conteneur');
    var L = boite(c, main).x + px(c, 'paddingLeft');
    var W = main.clientWidth;
    var etroit = win.innerWidth < ETROIT;
    var g = etroit ? Math.max(6, L / 2 - 2) : Math.max(8, L / 2);
    var bord = tailleCorde().anneau + 0.5;
    var avance = Math.max(0, Math.min(24, L - g - bord - ECART_TEXTE));
    return { L: L, W: W, g: g, d: W - g, avance: avance };
  }

  /* Zone vide entre deux sections : marge basse de la precedente et marge haute de la suivante */
  function zoneLibre(section, main) {
    var haut = boite(section, main).y;
    var prec = section.previousElementSibling;
    var pb = prec ? px(prec, 'paddingBottom') : 0;
    return { debut: haut - Math.min(pb, 160), fin: haut + px(section, 'paddingTop') };
  }

  function pointsTrajectoire(main) {
    var depart = main.querySelector('.depart');
    if (!depart || !main.querySelector('.conteneur')) return null;
    var k = couloirs(main);
    var bt = boite(depart.querySelector('.depart-trait') || depart, main);
    var pts = [{ x: bt.x + bt.w, y: bt.y + bt.h / 2 }];
    var cote = 'd';
    tous('[data-virage]', main).forEach(function (t) {
      var b = boite(t, main);
      if (!b.h) return;
      var side = t.getAttribute('data-virage') === 'd' ? 'd' : 'g';
      var lh = px(t, 'lineHeight') || b.h;
      var y = b.y + Math.min(lh, b.h) / 2;
      var xc = side === 'g' ? k.g : k.d;
      var section = t.closest('section') || t.parentElement;
      if (side !== cote) {
        /* Changement de couloir : une vraie courbe en S sur presque toute la hauteur libre entre les deux
           sections (de 8 a 92 %), et la tete la parcourt sur un vrai temps de defilement (moments, plus bas) */
        var z = zoneLibre(section, main);
        var h = z.fin - z.debut;
        pts.push({ x: cote === 'g' ? k.g : k.d, y: z.debut + 0.08 * h, croise: true });
        pts.push({ x: xc, y: z.debut + 0.92 * h });
      } else {
        var dernier = pts[pts.length - 1];
        pts.push({ x: xc, y: Math.min(dernier.y + 140, y - 40) });
      }
      pts.push({ x: side === 'g' ? xc + k.avance : xc - k.avance, y: y, corde: true });
      cote = side;
    });
    return finTrajectoire(main, k, pts, cote);
  }

  /* Fin : on descend le couloir jusqu a la marge basse de la derniere section, puis le centre du damier */
  function finTrajectoire(main, k, pts, cote) {
    var damier = doc.querySelector('.pied-arrivee .damier');
    var derniere = main.lastElementChild;
    if (!damier || !derniere) return pts;
    var rM = main.getBoundingClientRect();
    var rd = damier.getBoundingClientRect();
    var bs = boite(derniere, main);
    var basContenu = bs.y + bs.h - px(derniere, 'paddingBottom');
    var yD = rd.top + rd.height / 2 - rM.top;
    var yA = basContenu + 0.12 * Math.max(0, yD - basContenu);
    var dernier = pts[pts.length - 1];
    if (yA > dernier.y + 4) pts.push({ x: cote === 'g' ? k.g : k.d, y: yA });
    pts.push({ x: rd.left - rM.left + rd.width / 2, y: yD, corde: true, arrivee: true });
    return pts;
  }

  /* Chaque segment : Bezier a tangentes verticales, qui ne depasse jamais ses deux extremites */
  function segmentsBezier(pts) {
    var segs = [];
    for (var i = 1; i < pts.length; i++) {
      var a = pts[i - 1];
      var b = pts[i];
      var m = (a.y + b.y) / 2;
      segs.push([a.x, a.y, a.x, m, b.x, m, b.x, b.y]);
    }
    return segs;
  }

  function cheminD(segs) {
    if (!segs.length) return '';
    var d = 'M' + segs[0][0].toFixed(1) + ' ' + segs[0][1].toFixed(1);
    segs.forEach(function (s) {
      d += ' C' + s[2].toFixed(1) + ' ' + s[3].toFixed(1) + ' ' + s[4].toFixed(1) + ' ' + s[5].toFixed(1) + ' ' + s[6].toFixed(1) + ' ' + s[7].toFixed(1);
    });
    return d;
  }

  /* Moment de chaque point cle, exprime en hauteur de page : la tete est au point quand la ligne de lecture
     (60 % de l ecran) passe cette hauteur. D ordinaire, sa propre hauteur. Le debut d un changement de couloir
     est avance (jusqu a 30 % d ecran, sans repasser le point precedent) : la traversee se joue pendant que le
     virage monte dans le bas de l ecran, sur un vrai temps de defilement, jamais d un seul coup. */
  function moments(pts) {
    var avance = 0.3 * win.innerHeight;
    return pts.map(function (p, i) {
      if (!p.croise || i === 0) return p.y;
      var prec = pts[i - 1].y;
      return p.y - Math.max(0, Math.min(avance, 0.6 * (p.y - prec)));
    });
  }

  /* Table de correspondance longueur / point, echantillonnee tous les 4 px environ (calcul exact des Bezier).
     Chaque echantillon porte aussi son moment (m), interpole selon la longueur parcourue dans son segment. */
  function echantillons(segs, pts) {
    var cles = moments(pts);
    var table = [{ l: 0, x: segs[0][0], y: segs[0][1], m: cles[0] }];
    var total = 0;
    var cordes = [];
    segs.forEach(function (s, i) {
      var approx = Math.abs(s[7] - s[1]) + Math.abs(s[6] - s[0]);
      var n = Math.max(4, Math.ceil(approx / 4));
      var px = s[0];
      var py = s[1];
      var debut = table.length;
      var l0 = total;
      for (var j = 1; j <= n; j++) {
        var t = j / n;
        var u = 1 - t;
        var x = u * u * u * s[0] + 3 * u * u * t * s[2] + 3 * u * t * t * s[4] + t * t * t * s[6];
        var y = u * u * u * s[1] + 3 * u * u * t * s[3] + 3 * u * t * t * s[5] + t * t * t * s[7];
        total += Math.hypot(x - px, y - py);
        table.push({ l: total, x: x, y: y });
        px = x;
        py = y;
      }
      var long = (total - l0) || 1;
      for (var k = debut; k < table.length; k++) table[k].m = cles[i] + (table[k].l - l0) / long * (cles[i + 1] - cles[i]);
      if (pts[i + 1].corde) cordes.push({ l: total, x: s[6], y: s[7], arrivee: !!pts[i + 1].arrivee });
    });
    var maxM = -Infinity;
    table.forEach(function (e) { maxM = Math.max(maxM, e.m); e.yMono = maxM; });
    return { table: table, total: total, cordes: cordes };
  }

  /* Longueur atteinte quand la ligne de lecture est a la hauteur y (moments croissants le long du trace) */
  function longueurA(ech, y) {
    var t = ech.table;
    if (y <= t[0].yMono) return 0;
    if (y >= t[t.length - 1].yMono) return ech.total;
    var a = 0;
    var b = t.length - 1;
    while (b - a > 1) {
      var m = (a + b) >> 1;
      if (t[m].yMono < y) a = m; else b = m;
    }
    var span = t[b].yMono - t[a].yMono;
    var f = span > 0 ? (y - t[a].yMono) / span : 0;
    return t[a].l + f * (t[b].l - t[a].l);
  }

  function pointA(ech, l) {
    var t = ech.table;
    var a = 0;
    var b = t.length - 1;
    if (l <= 0) return t[0];
    if (l >= ech.total) return t[b];
    while (b - a > 1) {
      var m = (a + b) >> 1;
      if (t[m].l < l) a = m; else b = m;
    }
    var f = (l - t[a].l) / ((t[b].l - t[a].l) || 1);
    return { x: t[a].x + f * (t[b].x - t[a].x), y: t[a].y + f * (t[b].y - t[a].y) };
  }

  /* ============================================================
     2. TRAJECTOIRE : dessin et defilement
     ============================================================ */
  function creerSvg(main) {
    var svg = svgEl('svg', { 'class': 'trajectoire', 'aria-hidden': 'true', focusable: 'false' });
    main.insertBefore(svg, main.firstChild);
    return {
      svg: svg,
      fantome: svgEl('path', { 'class': 'traj-fantome' }, svg),
      trace: svgEl('path', { 'class': 'traj-trace' }, svg),
      secteurs: svgEl('g', { 'class': 'traj-secteurs' }, svg),
      cordes: svgEl('g', { 'class': 'traj-cordes' }, svg),
      tete: svgEl('circle', { 'class': 'traj-tete', r: '4' }, svg)
    };
  }

  function dessinerCordes(t, ech) {
    var taille = tailleCorde();
    t.cordes.textContent = '';
    t.listeCordes = ech.cordes.map(function (c) {
      var g = svgEl('g', { 'class': 'traj-corde', transform: 'translate(' + c.x.toFixed(1) + ' ' + c.y.toFixed(1) + ')' }, t.cordes);
      svgEl('circle', { 'class': 'tc-anneau', r: String(taille.anneau) }, g);
      svgEl('circle', { 'class': 'tc-disque', r: String(taille.disque) }, g);
      svgEl('circle', { 'class': 'tc-onde', r: String(taille.anneau) }, g);
      return { g: g, l: c.l, allumee: false };
    });
  }

  /* Reperes de secteur aux tiers du defilement (memes tiers que la barre de secteurs et les releves) */
  function dessinerSecteurs(t, ech, main) {
    t.secteurs.textContent = '';
    var vh = win.innerHeight;
    var max = Math.max(1, html.scrollHeight - vh);
    var haut = main.getBoundingClientRect().top + win.scrollY;
    [1, 2].forEach(function (k) {
      var l = longueurA(ech, k * max / 3 + 0.6 * vh - haut);
      var p = pointA(ech, l);
      var q = pointA(ech, l + 2);
      var dx = q.x - p.x;
      var dy = q.y - p.y;
      var n = Math.hypot(dx, dy) || 1;
      /* Trait de repere : 12 px de long, 8 sur telephone (il ne doit pas venir frotter le texte de la gouttiere) */
      var demi = win.innerWidth < ETROIT ? 4 : 6;
      var nx = -dy / n * demi;
      var ny = dx / n * demi;
      var g = svgEl('g', { 'class': 'traj-secteur' }, t.secteurs);
      svgEl('line', { x1: (p.x - nx).toFixed(1), y1: (p.y - ny).toFixed(1), x2: (p.x + nx).toFixed(1), y2: (p.y + ny).toFixed(1) }, g);
      var gauche = p.x < main.clientWidth / 2;
      var txt = svgEl('text', { x: (gauche ? p.x - 10 : p.x + 10).toFixed(1), y: p.y.toFixed(1), 'text-anchor': gauche ? 'end' : 'start' }, g);
      txt.textContent = 'S' + (k + 1);
    });
  }

  function poserTete(t, l) {
    t.trace.style.strokeDashoffset = (t.ech.total - l).toFixed(1);
    var p = pointA(t.ech, l);
    t.tete.setAttribute('transform', 'translate(' + p.x.toFixed(1) + ' ' + p.y.toFixed(1) + ')');
    t.tete.style.opacity = l > 0.5 && l < t.ech.total - 0.5 ? '1' : '0';
    t.listeCordes.forEach(function (c) {
      var on = l >= c.l - 1;
      if (on !== c.allumee) { c.allumee = on; c.g.classList.toggle('est-allumee', on); }
    });
  }

  function suivreDefilement(t) {
    if (!t.ech) return;
    var y = win.scrollY + 0.6 * win.innerHeight - t.haut;
    var l = win.scrollY >= t.max - 2 ? t.ech.total : longueurA(t.ech, y);
    poserTete(t, l);
  }

  function mesurer(t) {
    t.haut = t.main.getBoundingClientRect().top + win.scrollY;
    t.max = Math.max(1, html.scrollHeight - win.innerHeight);
  }

  function construireTrajectoire(t) {
    var pts = pointsTrajectoire(t.main);
    if (!pts || pts.length < 2) { t.svg.style.display = 'none'; t.ech = null; return; }
    t.svg.style.display = '';
    var W = t.main.clientWidth;
    var H = t.main.offsetHeight;
    t.svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    var segs = segmentsBezier(pts);
    t.ech = echantillons(segs, pts);
    var d = cheminD(segs);
    var total = t.ech.total.toFixed(1);
    [t.fantome, t.trace].forEach(function (p) { p.setAttribute('d', d); p.setAttribute('pathLength', total); });
    t.trace.style.strokeDasharray = total;
    mesurer(t);
    dessinerCordes(t, t.ech);
    dessinerSecteurs(t, t.ech, t.main);
    if (t.statique) poserStatique(t);
    else suivreDefilement(t);
  }

  function poserStatique(t) {
    t.svg.classList.add('est-statique');
    t.trace.style.strokeDashoffset = '0';
    t.tete.style.display = 'none';
    t.listeCordes.forEach(function (c) { c.g.classList.add('est-allumee'); });
  }

  function trajectoire(statique) {
    var main = doc.querySelector('main[data-trajectoire]');
    if (!main) return;
    var t = creerSvg(main);
    t.main = main;
    t.statique = statique;
    var refaire = function () { try { construireTrajectoire(t); } catch (e) { t.svg.style.display = 'none'; } };
    refaire();
    var minuterie = null;
    var differe = function () { clearTimeout(minuterie); minuterie = setTimeout(function () { refaire(); if (ST) ST.refresh(); }, 150); };
    if ('ResizeObserver' in win) new win.ResizeObserver(differe).observe(main);
    win.addEventListener('load', differe);
    if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(differe);
    if (!statique && ST) ST.create({ trigger: main, start: 'top top', end: 'max', onUpdate: function () { suivreDefilement(t); }, onRefresh: function () { mesurer(t); suivreDefilement(t); } });
  }

  /* ============================================================
     3. ENTREE DU PREMIER ECRAN (4.5)
     ============================================================ */
  function tempsEntree(el, type) {
    var d = DEFAUTS[type] || [0, 800];
    return { t: nombre(el, 'data-t', d[0]) / 1000, d: nombre(el, 'data-duree', d[1]) / 1000 };
  }

  /* Titre en place : on rend le texte d origine (plus de masques ni de lignes decoupees). Un peu plus tard,
     pour ne pas couper la fin de l animation ; SplitText ne redecoupe plus apres un retour. */
  function retirerDecoupe(split) {
    return function () { setTimeout(function () { try { split.revert(); } catch (e) { /* deja rendu */ } }, 60); };
  }

  /* aria « auto » seulement sur un titre (h1 a h6) : sur un span ou un paragraphe, l etiquette serait ignoree */
  function ariaDecoupe(el) { return /^H[1-6]$/.test(el.tagName) ? 'auto' : 'none'; }

  /* Le secours CSS du titre (signature.css, entree-titre-secours) a-t-il deja commence ?
     Dans ce cas il finit seul : on ne redecoupe pas un titre deja a l ecran. */
  function secoursParti(el) {
    if (!el.getAnimations) return false;
    return el.getAnimations().some(function (a) {
      var t = a.effect && a.effect.getComputedTiming ? a.effect.getComputedTiming() : null;
      return !!t && t.progress !== null;
    });
  }

  function entreeTitre(el, tps) {
    if (secoursParti(el)) return;
    if (!Split) {
      el.classList.add('entree-js');
      gsap.fromTo(el, { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: tps.d, delay: tps.t });
      return;
    }
    Split.create(el, {
      type: 'lines', mask: 'lines', linesClass: 'titre-ligne', autoSplit: true, aria: ariaDecoupe(el),
      onSplit: function (self) {
        /* Les polices ont pu arriver apres le debut du secours : le titre est deja la, on rend le texte d origine */
        if (!el.classList.contains('entree-js') && secoursParti(el)) { retirerDecoupe(self)(); return null; }
        el.classList.add('entree-js');
        gsap.set(el, { visibility: 'visible' });
        return gsap.fromTo(self.lines, { yPercent: 140 }, { yPercent: 0, duration: tps.d, delay: tps.t, stagger: 0.08, ease: 'expo.out', onComplete: retirerDecoupe(self) });
      }
    });
  }

  /* L entree du premier ecran se joue en CSS des le premier rendu (signature.css, chapitre 10) :
     photo, textes, boutons, couverture et ligne de depart. Ici, seulement les lignes du h1. */
  function entree() {
    if (!entreeAutorisee || !html.classList.contains('js-anim')) return;
    tous('[data-entree="titre"]').forEach(function (el) { entreeTitre(el, tempsEntree(el, 'titre')); });
  }

  /* ============================================================
     4. REVELATIONS AU DEFILEMENT
     ============================================================ */
  function titresAReveler() {
    var liste = tous('main h2, main [data-revele]');
    return liste.filter(function (h, i) {
      if (liste.indexOf(h) !== i) return false;
      if (h.getAttribute('data-revele') === 'non' || h.classList.contains('visuellement-cache')) return false;
      if (h.closest('[data-entree], [data-revele="non"]')) return false;
      return h.getBoundingClientRect().top > win.innerHeight;
    });
  }

  function revelerTitres() {
    titresAReveler().forEach(function (h) {
      if (!Split) {
        gsap.from(h, { autoAlpha: 0, y: 24, duration: 0.9, scrollTrigger: { trigger: h, start: 'top 85%', once: true } });
        return;
      }
      Split.create(h, {
        type: 'lines', mask: 'lines', linesClass: 'titre-ligne', autoSplit: true, aria: ariaDecoupe(h),
        onSplit: function (self) {
          return gsap.fromTo(self.lines, { yPercent: 140 }, { yPercent: 0, duration: 0.9, stagger: 0.08, ease: 'expo.out', onComplete: retirerDecoupe(self), scrollTrigger: { trigger: h, start: 'top 85%', once: true } });
        }
      });
    });
  }

  function remplissage(bureau) {
    var el = doc.querySelector('[data-remplissage]');
    if (!el || !Split) return;
    Split.create(el, {
      type: 'words', aria: 'none', wordsClass: 'mot-rempli', autoSplit: true,
      onSplit: function (self) {
        /* Part de 50 % (deja lisible sur le noir) et finit quand le bas de la phrase passe aux 70 % de l ecran :
           a l arret, au milieu de l ecran, la phrase est toujours pleine */
        return gsap.fromTo(self.words, { opacity: 0.5 }, { opacity: 1, ease: 'none', stagger: 0.1, scrollTrigger: { trigger: el, start: 'top 85%', end: 'bottom 70%', scrub: bureau ? 0.6 : true } });
      }
    });
  }

  function declencheur(el, attr) {
    var sel = el.getAttribute(attr);
    return (sel && el.closest(sel)) || el;
  }

  /* Volet : une fois, en 0,9 s, quand le cadre passe les 92 % de l ecran (meme seuil que les blocs .reveal). Le haut apparait d abord (c est
     lui qui entre a l ecran le premier) et le volet n est jamais lie au defilement : une photo ne reste
     jamais a moitie masquee quand on lache la molette. Le relief, lui, reste lie au defilement. */
  function volets() {
    tous('[data-volet]').forEach(function (cadre) {
      gsap.fromTo(cadre, { clipPath: 'inset(0% 0% 100% 0%)' }, {
        clipPath: 'inset(0% 0% 0% 0%)', duration: 0.9, ease: 'power4.inOut',
        scrollTrigger: { trigger: declencheur(cadre, 'data-volet'), start: 'top 92%', once: true }
      });
    });
  }

  /* Relief : l image, plus grande que son cadre, glisse dedans. Echelle toujours suffisante
     pour couvrir le cadre (1 + 2 x deplacement), jamais de bord vide. */
  function reliefs(bureau) {
    var a = bureau ? 5 : 3;
    tous('[data-relief]').forEach(function (cadre) {
      var img = cadre.querySelector('img');
      if (!img) return;
      gsap.fromTo(img, { yPercent: -a, scale: bureau ? 1.12 : 1.07 }, {
        yPercent: a, scale: bureau ? 1.1 : 1.06, ease: 'none',
        scrollTrigger: { trigger: declencheur(cadre, 'data-relief'), start: 'top bottom', end: 'bottom top', scrub: bureau ? 0.6 : true }
      });
    });
  }

  function parallaxes(bureau) {
    tous('[data-parallaxe]').forEach(function (el) {
      var n = nombre(el, 'data-parallaxe', 8) * (bureau ? 1 : 0.5);
      var section = el.closest('section') || el;
      gsap.fromTo(el, { yPercent: 0 }, { yPercent: -n, ease: 'none', scrollTrigger: { trigger: section, start: 'top top', end: 'bottom top', scrub: bureau ? 0.6 : true } });
    });
  }

  function affiche(bureau) {
    var hero = doc.querySelector('[data-affiche]');
    if (!hero) return;
    var cadre = hero.querySelector('[data-affiche-cadre]');
    var image = hero.querySelector('[data-affiche-image]');
    var textes = tous('[data-affiche-texte]', hero);
    var st = { trigger: hero, start: 'top top', end: 'bottom top', scrub: bureau ? 0.6 : true };
    if (!bureau) { if (image) gsap.fromTo(image, { yPercent: 0 }, { yPercent: 10, ease: 'none', scrollTrigger: st }); return; }
    var tl = gsap.timeline({ scrollTrigger: st, defaults: { ease: 'none' } });
    if (cadre) tl.fromTo(cadre, { scale: 1 }, { scale: 0.92 }, 0);
    if (image) tl.fromTo(image, { scale: 1 }, { scale: 1.09 }, 0);
    /* Chaque bloc de texte s efface sur sa propre course : pleine opacite tant qu il est sous la navigation,
       fondu seulement pendant qu il passe dessous (de son haut a son bas). clamp() : jamais entame a l arret. */
    textes.forEach(function (bloc) {
      gsap.fromTo(bloc, { yPercent: 0, opacity: 1 }, {
        yPercent: -12, opacity: 0.2, ease: 'none',
        scrollTrigger: { trigger: bloc, start: 'clamp(top ' + NAV_H + 'px)', end: 'clamp(bottom ' + NAV_H + 'px)', scrub: 0.6 }
      });
    });
  }

  /* ============================================================
     5. DESSINS : traces SVG, apparitions, allumages
     ============================================================ */
  function preparerTrace(p) {
    var pointille = (win.getComputedStyle(p).strokeDasharray || 'none') !== 'none';
    if (pointille) {
      var sens = p.getAttribute('data-balayage') || 'droite';
      var depart = { droite: 'inset(0% 100% 0% 0%)', gauche: 'inset(0% 0% 0% 100%)', bas: 'inset(0% 0% 100% 0%)', haut: 'inset(100% 0% 0% 0%)' }[sens] || 'inset(0% 100% 0% 0%)';
      gsap.set(p, { clipPath: depart, visibility: 'visible' });
      return { clipPath: 'inset(0% 0% 0% 0%)' };
    }
    var L = p.getTotalLength ? p.getTotalLength() : 0;
    gsap.set(p, { strokeDasharray: L, strokeDashoffset: L, visibility: 'visible' });
    return { strokeDashoffset: 0 };
  }

  function ajouterApparition(tl, el, t) {
    var echelle = el.getAttribute('data-apparait') === 'echelle';
    var pas = nombre(el, 'data-pas', -1);
    var cibles = pas >= 0 ? Array.prototype.slice.call(el.children) : [el];
    if (pas >= 0) gsap.set(el, { visibility: 'visible' });
    gsap.set(cibles, echelle ? { autoAlpha: 0, scale: 0.6, transformOrigin: '50% 50%' } : { autoAlpha: 0 });
    var vers = { autoAlpha: 1, duration: nombre(el, 'data-duree', 400) / 1000, stagger: Math.max(0, pas) / 1000, ease: 'power3.out' };
    if (echelle) vers.scale = 1;
    tl.to(cibles, vers, t);
  }

  /* Le secours CSS d un dessin du premier ecran (entree-dessin-secours) a-t-il deja commence ? */
  function secoursDessinParti(bloc) {
    return tous('[data-trace], [data-apparait]', bloc).some(secoursParti);
  }

  function dessin(bloc) {
    var chargement = bloc.getAttribute('data-dessin') === 'chargement';
    /* Premier ecran deja affiche sans mouvement (CDN en erreur) ou deja dessine par son secours CSS (scripts
       arrives apres 1,2 s) : on ne l efface pas pour le redessiner */
    if (chargement && (!html.classList.contains('js-anim') || secoursDessinParti(bloc))) return;
    if (chargement) bloc.classList.add('dessin-js');
    var tl = gsap.timeline({ paused: true });
    tous('[data-trace]', bloc).forEach(function (p) {
      var vers = preparerTrace(p);
      vers.duration = nombre(p, 'data-duree', 900) / 1000;
      vers.ease = p.getAttribute('data-ease') || 'expo.out';
      tl.to(p, vers, nombre(p, 'data-t', 0) / 1000);
    });
    tous('[data-apparait]', bloc).forEach(function (el) { ajouterApparition(tl, el, nombre(el, 'data-t', 0) / 1000); });
    tous('[data-allume]', bloc).forEach(function (el) {
      tl.call(function () { el.classList.remove('corde-eteinte'); el.classList.add('est-allumee'); }, null, nombre(el, 'data-t', 0) / 1000);
    });
    if (bloc.getAttribute('data-dessin') === 'chargement') tl.play();
    else ST.create({ trigger: bloc, start: 'top 75%', once: true, onEnter: function () { tl.play(); } });
  }

  /* ============================================================
     6. CIRCUIT DU GUIDE ET SEGMENTS
     ============================================================ */
  function numeroVirage(g) { return parseInt(g.getAttribute('data-virage-num'), 10) || 0; }

  function circuitOfferts(svg) {
    /* Circuit deja dessine en CSS (CDN en erreur, ou html.anim-secours : scripts arrives apres 4 s) : on n y touche plus */
    if (!html.classList.contains('js-anim') || html.classList.contains('anim-secours')) return;
    var trace = svg.querySelector('.circuit-trace');
    var virages = tous('.circuit-virage', svg);
    var offerts = virages.filter(function (g) { return win.getComputedStyle(g).getPropertyValue('--offert').trim() === '1'; });
    if (!trace || !offerts.length) return;
    var dernier = Math.max.apply(null, offerts.map(numeroVirage));
    svg.classList.add('circuit-anime');
    gsap.set(trace, { strokeDashoffset: 2002 });
    var tw = gsap.to(trace, {
      strokeDashoffset: 2002 - LONGUEURS[dernier], duration: 1.2, ease: 'power2.inOut', paused: true,
      onUpdate: function () {
        var fait = 2002 - (parseFloat(gsap.getProperty(trace, 'strokeDashoffset')) || 2002);
        offerts.forEach(function (g) { if (fait >= LONGUEURS[numeroVirage(g)] - 2) g.classList.add('est-allume'); });
      }
    });
    /* Des que le haut du circuit est a l ecran : sur /extrait, il se dessine tout seul au chargement s il est visible */
    ST.create({ trigger: svg, start: 'top 92%', once: true, onEnter: function () { tw.play(); } });
  }

  function sommaire(scene) {
    var svg = scene.querySelector('svg.circuit');
    var chapitres = tous('.sommaire-chapitre, [data-chapitre]', scene);
    if (!svg || !chapitres.length) return;
    var trace = svg.querySelector('.circuit-trace');
    var virages = tous('.circuit-virage', svg);
    svg.classList.add('circuit-anime');
    function activer(n) {
      if (trace) gsap.to(trace, { strokeDashoffset: 2002 - LONGUEURS[Math.min(n, 14)], duration: 0.6, ease: 'power2.out', overwrite: true });
      virages.forEach(function (g) { var k = numeroVirage(g); g.classList.toggle('est-allume', k <= n); g.classList.toggle('est-actif', k === n); });
      chapitres.forEach(function (c, i) { c.classList.toggle('est-actif', i + 1 === n); c.classList.toggle('est-lu', i + 1 < n); });
    }
    activer(0);
    chapitres.forEach(function (c, i) {
      ST.create({ trigger: c, start: 'center center', onEnter: function () { activer(i + 1); }, onLeaveBack: function () { activer(i); } });
    });
    ST.create({ trigger: chapitres[chapitres.length - 1], start: 'bottom center', onEnter: function () { activer(14); }, onLeaveBack: function () { activer(chapitres.length); } });
  }

  function segments() {
    tous('[data-segments], [data-scene="trois-temps"]').forEach(function (bloc) {
      var segs = tous('[data-segment]', bloc);
      if (!segs.length) return;
      var ecrire = function (p) { segs.forEach(function (s, i) { s.style.setProperty('--remplissage', borne(p * segs.length - i, 0, 1).toFixed(3)); }); };
      ecrire(0);
      ST.create({ trigger: bloc, start: 'top 70%', end: 'bottom 55%', onUpdate: function (self) { ecrire(self.progress); }, onRefresh: function (self) { ecrire(self.progress); } });
    });
  }

  /* ============================================================
     7. MAGNETISME (ordinateur a souris)
     ============================================================ */
  function envelopper(b) {
    var lib = b.querySelector(':scope > .bouton-libelle');
    if (lib) return lib;
    lib = doc.createElement('span');
    lib.className = 'bouton-libelle';
    while (b.firstChild) lib.appendChild(b.firstChild);
    b.appendChild(lib);
    return lib;
  }

  function aimants() {
    var boutons = tous('[data-aimant]').map(function (b) {
      var lib = envelopper(b);
      return {
        b: b,
        x: gsap.quickTo(b, 'x', { duration: 0.4, ease: 'power3.out' }),
        y: gsap.quickTo(b, 'y', { duration: 0.4, ease: 'power3.out' }),
        lx: gsap.quickTo(lib, 'x', { duration: 0.4, ease: 'power3.out' }),
        ly: gsap.quickTo(lib, 'y', { duration: 0.4, ease: 'power3.out' })
      };
    });
    if (!boutons.length) return null;
    var attente = false;
    var ev = null;
    function appliquer() {
      attente = false;
      boutons.forEach(function (o) {
        var r = o.b.getBoundingClientRect();
        var dedans = ev.clientX > r.left - 24 && ev.clientX < r.right + 24 && ev.clientY > r.top - 24 && ev.clientY < r.bottom + 24;
        var dx = dedans ? borne((ev.clientX - (r.left + r.width / 2)) * 0.25, -6, 6) : 0;
        var dy = dedans ? borne((ev.clientY - (r.top + r.height / 2)) * 0.25, -4, 4) : 0;
        o.x(dx); o.y(dy); o.lx(dx * 0.4); o.ly(dy * 0.4);
      });
    }
    function bouger(e) { ev = e; if (!attente) { attente = true; win.requestAnimationFrame(appliquer); } }
    doc.addEventListener('pointermove', bouger, { passive: true });
    return function () {
      doc.removeEventListener('pointermove', bouger);
      boutons.forEach(function (o) { gsap.set([o.b, o.b.firstElementChild], { x: 0, y: 0 }); });
    };
  }

  /* ============================================================
     8. DEFILEMENT DOUX (Lenis), arrete quand le menu ou une fenetre s ouvre
     ============================================================ */
  function lenis() {
    if (!LenisLib || !mq('(hover: hover) and (pointer: fine) and (min-width: 1024px)')) return;
    var l = new LenisLib({
      lerp: 0.1, wheelMultiplier: 1, syncTouch: false, autoRaf: false, anchors: { offset: -88 },
      prevent: function (n) { return !!(n && n.closest && n.closest('[data-lenis-prevent], textarea, select, dialog')); }
    });
    l.on('scroll', ST.update);
    gsap.ticker.add(function (t) { l.raf(t * 1000); });
    gsap.ticker.lagSmoothing(0);
    var bloquer = function () {
      var ouvert = doc.body.classList.contains('menu-ouvert') || !!doc.querySelector('dialog[open]');
      if (ouvert) l.stop(); else l.start();
    };
    var mo = new win.MutationObserver(bloquer);
    mo.observe(doc.body, { attributes: true, attributeFilter: ['class'] });
    tous('dialog').forEach(function (d) { mo.observe(d, { attributes: true, attributeFilter: ['open'] }); });
    win.__ckrLenis = l;
  }

  /* ============================================================
     9. DEMARRAGE
     ============================================================ */
  function scenes(bureau) {
    revelerTitres();
    remplissage(bureau);
    volets();
    reliefs(bureau);
    parallaxes(bureau);
    affiche(bureau);
    segments();
    tous('[data-dessin]').forEach(dessin);
    tous('svg.circuit[data-circuit="offerts"]').forEach(circuitOfferts);
    tous('[data-scene="sommaire"]').forEach(sommaire);
    return bureau && mq('(hover: hover) and (pointer: fine)') ? aimants() : null;
  }

  function plusTard(fn) {
    if (win.requestIdleCallback) win.requestIdleCallback(fn, { timeout: 600 });
    else setTimeout(fn, 60);
  }

  function animer() {
    gsap.registerPlugin(ST);
    if (Split) gsap.registerPlugin(Split);
    gsap.defaults({ ease: 'expo.out', duration: 0.9 });
    ST.config({ ignoreMobileResize: true });
    lenis();
    entree();
    /* La trajectoire (mesures et echantillonnage du trace) attend un moment calme apres le premier rendu :
       elle ne rallonge pas la tache de demarrage sur un telephone lent */
    plusTard(function () { try { trajectoire(false); } catch (e) { /* sans trajectoire, la page reste entiere */ } });
    var mm = gsap.matchMedia();
    mm.add(BUREAU, function () { return scenes(true); });
    mm.add(TELEPHONE, function () { return scenes(false); });
    if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(function () { ST.refresh(); });
  }

  function demarrer() {
    try {
      if (!mouvement || !outils) {
        html.classList.remove('js-anim');
        trajectoire(true);
        return;
      }
      animer();
    } catch (e) {
      html.classList.remove('js-anim');
    }
  }

  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', demarrer);
  else demarrer();
})();
