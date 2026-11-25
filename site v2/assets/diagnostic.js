/* ============================================================
   Clem Kart Racing : diagnostic.js (page /diagnostic)
   Le diagnostic de pilotage : 25 questions, puis les 3 premiers points à travailler.
   Les questions, les 9 points et le calcul viennent de diagnostic-donnees.js (partagé avec
   la fonction qui écrit les emails). Les prix, le délai et les portes de paiement viennent
   de config/offres.json, posés par le build sur #diag (data-*). Rien n'est écrit en dur ici.
   Les réponses restent dans le navigateur (reprise possible) ; elles partent une seule fois,
   avec l'email, vers /.netlify/functions/diagnostic.
   ============================================================ */
(function () {
'use strict';

var D = window.CKR_DIAGNOSTIC, app = document.getElementById('diag');
if (!D || !app) return;
var ETAPES = D.ETAPES, ORDRE = D.ORDRE, PAR_CHAPITRE = D.PAR_CHAPITRE, POINTS = D.POINTS, ECRANS = D.ECRANS;
var O = app.dataset;
var DUREE_INTER = 2900;

/* ============ État et outils ============ */
var CLE = 'ckr-diagnostic-v1', CLE_EMAIL = 'ckr-diagnostic-email';
var etat = { i: 0, r: {} }, contact = { email: '', consent: false, envoi: '' };
try { var garde = JSON.parse(localStorage.getItem(CLE)); if (garde && typeof garde.i === 'number' && garde.i < ECRANS.length && garde.r) etat = garde; } catch (e) { /* stockage indisponible : on repart de zéro */ }
try { var gardeEmail = JSON.parse(sessionStorage.getItem(CLE_EMAIL)); if (gardeEmail && typeof gardeEmail.email === 'string') contact = gardeEmail; } catch (e) { /* idem */ }
function sauver() {
  try { localStorage.setItem(CLE, JSON.stringify(etat)); sessionStorage.setItem(CLE_EMAIL, JSON.stringify(contact)); } catch (e) { /* navigation privée : le diagnostic marche quand même */ }
}

var tete = document.getElementById('dg-tete');
var minuteries = [], clicPris = false;
function plusTard(f, ms) { minuteries.push(setTimeout(f, ms)); }
function stop() { minuteries.forEach(clearTimeout); minuteries = []; clicPris = false; }
function estQuestion(e) { return e.type === 'choix' || e.type === 'texte'; }
var N = ECRANS.filter(estQuestion).length;
function avant(i) { var n = 0; for (var k = 0; k < i; k++) if (estQuestion(ECRANS[k])) n++; return n; }
function deux(n) { return (n < 10 ? '0' : '') + n; }
function esc(t) { return String(t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
var INSECABLE = String.fromCharCode(160);
function typo(t) { return t.replace(/ ([?!:;»])/g, INSECABLE + '$1').replace(/« /g, '«' + INSECABLE); }
function txt(t) { return typo(esc(t)).replace('{prenom}', esc(etat.r.prenom || 'pilote')); }
function suivre(type, meta) { try { if (window.ckrTrack) window.ckrTrack(type, meta || {}); } catch (e) { /* le suivi ne bloque jamais le diagnostic */ } }

/* Engrenage : n dents, rayon extérieur R, rayon de fond r, trou central. */
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
function gear(n, R, r, trou, cls) { return '<svg class="gear ' + (cls || '') + '" viewBox="-50 -50 100 100" aria-hidden="true"><path fill-rule="evenodd" d="' + dents(n, R, r, trou) + '"/><circle r="' + (r - 8) + '"/></svg>'; }
function meca(vite) { return '<div class="meca' + (vite ? ' vite' : '') + '" aria-hidden="true">' + gear(12, 46, 37, 13, 'g1') + gear(8, 47, 34, 12, 'g2 rouge') + '</div>'; }
var CADENAS = '<span class="cadenas" aria-hidden="true"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="5" y="11" width="14" height="9" rx="2.5"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg></span>';

/* ============ Décor et bandeau de progression ============ */
function decor() {
  var feux = [['9%', '34vw', '2px', '8px', '11s', '-2s', .55, '1px'], ['19%', '52vw', '3px', '13px', '8s', '-5s', .95, '0px', 1], ['41%', '44vw', '3px', '12px', '9.5s', '-1s', .9, '0px'], ['55%', '30vw', '2px', '7px', '13s', '-7s', .5, '1.5px', 1], ['68%', '58vw', '4px', '16px', '7s', '-3.5s', 1, '0px'], ['83%', '40vw', '3px', '11px', '10s', '-8s', .8, '.5px', 1], ['93%', '30vw', '2px', '8px', '12s', '-4s', .5, '1px']];
  var fond = document.getElementById('dg-fond');
  if (fond) fond.innerHTML = feux.map(function (f) {
    return '<i class="dg-feu' + (f[8] ? ' inv' : '') + '" style="--y:' + f[0] + ';--w:max(170px,' + f[1] + ');--h:' + f[2] + ';--e:' + f[3] + ';--d:' + f[4] + ';--t:' + f[5] + ';--o:' + f[6] + ';--b:' + f[7] + '"></i>';
  }).join('');
  document.querySelectorAll('[data-gear]').forEach(function (s) { s.outerHTML = gear(12, 46, 37, 14); });
  var etapes = document.getElementById('dg-etapes');
  if (etapes) etapes.innerHTML = ETAPES.map(function (n, k) { return '<li><i>' + deux(k + 1) + '</i>' + esc(n) + '</li>'; }).join('');
}
function progres(fait) {
  document.querySelectorAll('.roue').forEach(function (r) { r.style.setProperty('--p', Math.min(1, fait / N)); r.style.setProperty('--cran', fait); });
  document.querySelectorAll('[data-pct]').forEach(function (p) { p.textContent = Math.round(Math.min(1, fait / N) * 100) + INSECABLE + '%'; });
}
function maj() {
  var e = ECRANS[etat.i], quiz = ['choix', 'texte', 'libre', 'inter', 'email'].indexOf(e.type) >= 0, fait = avant(etat.i);
  document.body.classList.toggle('quiz', quiz);
  tete.hidden = !quiz;
  if (!quiz) return;
  progres(fait);
  tete.querySelector('[data-etape]').textContent = ETAPES[e.s];
  tete.querySelector('[data-num]').textContent = estQuestion(e) ? 'Question ' + (fait + 1) + ' sur ' + N : e.type === 'inter' ? 'Étape ' + (e.s + 1) + ' sur ' + ETAPES.length : 'Presque fini';
  document.querySelectorAll('#dg-etapes li').forEach(function (li, k) { li.className = k < e.s ? 'fait' : k === e.s ? 'ici' : ''; });
}

/* ============ Navigation ============ */
function rendre() { stop(); var e = ECRANS[etat.i]; maj(); app.innerHTML = VUES[e.type](e, etat.i); if (BRANCHE[e.type]) BRANCHE[e.type](e); }
function aller(i) { etat.i = Math.max(0, Math.min(ECRANS.length - 1, i)); sauver(); rendre(); window.scrollTo(0, 0); }
function suivant() { aller(etat.i + 1); }
function precedent() { var k = etat.i - 1; while (k > 0 && ECRANS[k].type === 'inter') k--; aller(k); }
function boutonRetour() { return '<button type="button" class="lien" data-retour>← Revenir en arrière</button>'; }
function entete(e, i) { return '<p class="sur"><span class="num">' + deux(avant(i) + 1) + '</span>' + esc(e.th) + '</p><h1 class="q">' + txt(e.q) + '</h1>'; }

/* ============ Envoi des réponses (une fois, avec l'email) ============ */
function envoyer(piege) {
  var corps = { prenom: etat.r.prenom || '', email: contact.email, consent: !!contact.consent, reponses: {}, libre: etat.r.libre || '', site_web: piege || '', utm: {} };
  ECRANS.forEach(function (e) { if (e.type === 'choix' && etat.r[e.id] != null) corps.reponses[e.id] = etat.r[e.id]; });
  try { if (window.ckrUtm) corps.utm = window.ckrUtm() || {}; } catch (e) { /* sans source, tant pis */ }
  contact.envoi = 'encours'; sauver();
  function fin(ok) { contact.envoi = ok ? 'ok' : 'echec'; sauver(); var n = document.querySelector('[data-notice-envoi]'); if (n) n.hidden = ok; }
  try {
    fetch(O.envoi, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corps) })
      .then(function (r) { fin(r.ok); }).catch(function () { fin(false); });
  } catch (e) { fin(false); }
}

/* ============ Les écrans ============ */
var VUES = {
  accueil: function () {
    return '<section class="ecran accueil"><p class="marque"><a href="' + esc(O.accueil) + '">Clem Kart Racing</a> · Diagnostic de pilotage</p><div class="vitrine vr">' + meca() + '</div>' +
      '<h1 class="display">Où peux-tu gagner du temps ?</h1>' +
      '<p class="chapo">Je te pose ' + N + ' questions sur ta façon de piloter, dans l’ordre d’un virage. À la fin, tu repars avec <strong>tes 3 premiers points à travailler</strong>. C’est gratuit.</p>' +
      '<ul class="puces"><li>4 minutes</li><li>Sans jugement</li><li>Résultat tout de suite</li></ul>' +
      '<button type="button" class="bouton bouton-principal bouton-large" data-suite>Commencer</button>' +
      '<p class="mini">Ici, aucune réponse n’est mauvaise. Réponds comme tu roules vraiment, pas comme tu penses qu’il faudrait rouler.</p></section>';
  },
  texte: function (e, i) {
    return '<section class="ecran">' + entete(e, i) + '<form class="saisie vr" data-form novalidate><input class="dg-champ" name="v" autocomplete="given-name" maxlength="30" placeholder="Ton prénom" aria-label="Ton prénom" value="' + esc(etat.r[e.id] || '') + '"><p class="erreur" role="alert"></p><button class="bouton bouton-principal">Continuer</button></form></section>';
  },
  choix: function (e, i) {
    var v = etat.r[e.id], ecrit = v && typeof v === 'object';
    var h = '<section class="ecran">' + entete(e, i) + '<div class="opts">';
    e.o.forEach(function (o, k) { h += '<button type="button" class="opt vr' + (v === k ? ' choisi' : '') + '" data-o="' + k + '" style="--k:' + k + '"><span>' + txt(o[0]) + '</span><span class="puce"></span></button>'; });
    if (e.autre) h += '<button type="button" class="opt vr ecrire' + (ecrit ? ' choisi' : '') + '" data-autre style="--k:' + e.o.length + '"><span>Autre : je l’écris moi-même</span><span class="puce" aria-hidden="true">✎</span></button>';
    h += '</div>';
    if (e.autre) h += '<form class="saisie vr" data-saisie' + (ecrit ? '' : ' hidden') + '><textarea class="dg-champ" rows="3" maxlength="400" placeholder="Écris avec tes mots, même en vrac." aria-label="Ta réponse">' + (ecrit ? esc(v.autre) : '') + '</textarea><button class="bouton bouton-principal bouton-petit">Valider ma réponse</button></form>';
    return h + boutonRetour() + '</section>';
  },
  libre: function (e) {
    return '<section class="ecran"><p class="sur"><span class="num">+</span>' + esc(e.th) + '</p><h1 class="q">' + txt(e.q) + '</h1><p class="sub">Facultatif. Plus tu es précis, plus ton diagnostic le sera.</p>' +
      '<form class="saisie vr" data-form><textarea class="dg-champ" name="v" rows="4" maxlength="600" placeholder="Par exemple : dans l’épingle, je sors toujours trop large." aria-label="Ta réponse">' + esc(etat.r[e.id] || '') + '</textarea><button class="bouton bouton-principal">Continuer</button></form>' + boutonRetour() + '</section>';
  },
  inter: function (e) {
    return '<section class="ecran inter">' + meca(true) + '<div class="lignes">' + e.lignes.map(function (l, k) { return '<p style="--k:' + k + '">' + txt(l) + '</p>'; }).join('') + '</div><div class="charge" style="--duree:' + DUREE_INTER + 'ms"><b></b></div></section>';
  },
  email: function () {
    return '<section class="ecran"><p class="sur"><span class="num">✓</span>C’est terminé</p><h1 class="q">' + txt('Bravo {prenom}. Je prépare ton diagnostic. Je te l’envoie à quelle adresse ?') + '</h1>' +
      '<form class="saisie vr" data-form novalidate><input class="dg-champ" type="email" name="v" autocomplete="email" inputmode="email" placeholder="ton@email.fr" aria-label="Ton email" value="' + esc(contact.email) + '">' +
      '<div class="piege" aria-hidden="true"><label>Ne remplis pas ce champ<input type="text" name="site_web" tabindex="-1" autocomplete="off"></label></div>' +
      '<label class="coche"><input type="checkbox" name="c"' + (contact.consent ? ' checked' : '') + '><span>Je veux aussi recevoir les conseils de pilotage de Clément par email. Facultatif, désinscription en un clic.</span></label>' +
      '<p class="erreur" role="alert"></p><button class="bouton bouton-principal">Voir mon diagnostic</button>' +
      '<p class="mini">Ton email sert à t’envoyer ton diagnostic, et tes réponses arrivent à Clément. Rien d’autre sans ton accord. <a href="' + esc(O.confidentialite) + '">Confidentialité</a></p></form>' + boutonRetour() + '</section>';
  },
  analyse: function () {
    return '<section class="ecran analyse"><div class="atelier vr"><div class="at-tete mono"><span><i class="voyant"></i>JE PRÉPARE TON DIAGNOSTIC</span><span data-chrono>00.0 s</span></div>' +
      '<div class="at-coeur">' + meca(true) + '<p class="big"><span data-pc>0</span><small>%</small></p></div><p class="at-etat mono" data-etat aria-live="polite"></p><ul class="at-liste">' +
      PAR_CHAPITRE.map(function (a) { return '<li><span class="ch mono">' + POINTS[a].ch + '</span><span>' + esc(POINTS[a].nom) + '</span><span class="jb"><b></b></span><span class="ok mono">OK</span></li>'; }).join('') + '</ul></div></section>';
  },
  resultat: vueResultat
};

var BRANCHE = {
  accueil: function () { app.querySelector('[data-suite]').onclick = function () { suivre('diag_start', { form: 'diagnostic' }); suivant(); }; },
  texte: function (e) {
    var f = app.querySelector('[data-form]');
    f.onsubmit = function (ev) { ev.preventDefault(); var v = f.v.value.trim(); if (!v) { f.querySelector('.erreur').textContent = 'Il me faut juste ton prénom.'; f.v.focus(); return; } etat.r[e.id] = v; suivant(); };
  },
  choix: function (e) {
    var saisie = app.querySelector('[data-saisie]');
    app.querySelectorAll('[data-o]').forEach(function (b) {
      b.onclick = function () {
        if (clicPris) return; clicPris = true;
        app.querySelectorAll('.opt').forEach(function (o) { o.classList.remove('choisi'); });
        b.classList.add('choisi'); etat.r[e.id] = +b.dataset.o; sauver(); progres(avant(etat.i) + 1);
        suivre('diag_step', { form: 'diagnostic', step: avant(etat.i) + 1, key: e.id, value: b.dataset.o });
        plusTard(suivant, 430);
      };
    });
    if (saisie) {
      app.querySelector('[data-autre]').onclick = function () { saisie.hidden = false; saisie.querySelector('textarea').focus(); };
      saisie.onsubmit = function (ev) {
        ev.preventDefault(); var v = saisie.querySelector('textarea').value.trim(); if (!v) { saisie.querySelector('textarea').focus(); return; }
        etat.r[e.id] = { autre: v }; suivre('diag_step', { form: 'diagnostic', step: avant(etat.i) + 1, key: e.id, value: 'autre' }); suivant();
      };
    }
    app.querySelector('[data-retour]').onclick = precedent;
  },
  libre: function (e) {
    var f = app.querySelector('[data-form]');
    f.onsubmit = function (ev) { ev.preventDefault(); etat.r[e.id] = f.v.value.trim(); suivant(); };
    app.querySelector('[data-retour]').onclick = precedent;
  },
  inter: function () { plusTard(suivant, DUREE_INTER); app.querySelector('.inter').onclick = suivant; },
  email: function () {
    var f = app.querySelector('[data-form]');
    f.onsubmit = function (ev) {
      ev.preventDefault(); var v = f.v.value.trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) { f.querySelector('.erreur').textContent = 'Cette adresse ne passe pas. Vérifie-la.'; f.v.focus(); return; }
      var deja = contact.envoi === 'ok' && contact.email === v;
      contact.email = v; contact.consent = f.c.checked;
      if (!deja) envoyer(f.site_web.value);
      suivant();
    };
    app.querySelector('[data-retour]').onclick = precedent;
  },
  analyse: function () {
    var lignes = app.querySelectorAll('.at-liste li'), etatEl = app.querySelector('[data-etat]'), pc = app.querySelector('[data-pc]'), chrono = app.querySelector('[data-chrono]');
    var debut = Date.now(), t = 0, pas = [], dernier = PAR_CHAPITRE.length - 1;
    pas.push([900, 'Lecture de tes ' + N + ' réponses']);
    PAR_CHAPITRE.forEach(function (a, k) { pas.push([430, 'Chapitre ' + POINTS[a].ch + ' · ' + POINTS[a].nom, k]); });
    pas.push([750, 'Classement de tes priorités'], [750, 'Estimation de ta marge de progression'], [550, 'Diagnostic prêt']);
    var total = pas.reduce(function (s, p) { return s + p[0]; }, 0);
    var tic = setInterval(function () { var ms = Date.now() - debut; chrono.textContent = deux(Math.floor(ms / 1000)) + '.' + Math.floor(ms % 1000 / 100) + ' s'; pc.textContent = Math.min(100, Math.round(ms / total * 100)); }, 80);
    minuteries.push(tic);
    pas.forEach(function (p) {
      plusTard(function () {
        etatEl.textContent = '> ' + p[1];
        if (p[2] != null) { if (p[2] > 0) lignes[p[2] - 1].className = 'fait'; lignes[p[2]].className = 'encours'; } else if (lignes[dernier].className === 'encours') lignes[dernier].className = 'fait';
      }, t);
      t += p[0];
    });
    plusTard(function () { clearInterval(tic); suivant(); }, total);
  },
  resultat: brancherResultat
};

/* ============ Résultat ============ */
var RESERVES = [
  'Ce que tes réponses montrent sur ce point, et ce que ça change dans ton virage.',
  'Le détail de ce que j’ai lu dans tes réponses, avec ce que je regarderais en premier sur la piste.',
  'Ce point se travaille après les trois premiers. Voilà comment je le prendrais avec toi.',
  'Ce que tu fais déjà ici, ce qui te manque encore, et par quoi commencer.',
  'Tes réponses sur ce point, mises en regard du chapitre du livre qui le traite.',
  'Pourquoi ce point passe après les autres dans ton cas, et quand y revenir.'
];
function citations(a) {
  var out = [];
  ECRANS.forEach(function (e) {
    if (e.type !== 'choix' || typeof etat.r[e.id] !== 'number' || !e.o[etat.r[e.id]]) return;
    var o = e.o[etat.r[e.id]], poids = (o[1] || {})[a]; if (poids) out.push([poids, '« ' + o[0] + ' »']);
  });
  /* La réponse la plus parlante d'abord. */
  return out.sort(function (x, y) { return y[0] - x[0]; }).slice(0, 2).map(function (c) { return c[1]; });
}
function teteDePoint(a, rang, suite) {
  var p = POINTS[a];
  return '<div class="point-tete"><span class="rang">' + rang + '</span><div><p class="lbl">Chapitre ' + p.ch + ' · ' + esc(p.nom) + '</p><h3>' + txt(p.titre) + '</h3></div>' + (suite || '') + '</div>';
}
function cartePoint(a, rang, res) {
  var p = POINTS[a], dit = citations(a);
  return '<article class="point vr">' + teteDePoint(a, rang) +
    '<div class="niv"><span>Maîtrise</span><span class="jb"><b style="--v:' + res.scores[a] + '%"></b></span><span class="mono">' + res.scores[a] + '/100</span></div><p>' + txt(p.texte) + '</p>' +
    (dit.length ? '<p class="dit">' + txt('Tu m’as répondu : ' + dit.join(' et ')) + '</p>' : '') + '</article>';
}
/* Point réservé au plan : la carte reste nette, seul son texte est flouté (un texte neutre, jamais le vrai). */
function carteReservee(a, rang, k) {
  return '<article class="point reserve vr">' + teteDePoint(a, rang, CADENAS) + '<p class="floute" aria-hidden="true">' + txt(RESERVES[k % RESERVES.length]) + '</p></article>';
}
function porte(camera) {
  var a = document.getElementById(camera ? 'dg-porte-camera' : 'dg-porte');
  if (!a || O.pret !== 'oui') return '';
  try { var u = new URL(a.href); if (contact.email) u.searchParams.set('prefilled_email', contact.email); if (!u.searchParams.has('locale')) u.searchParams.set('locale', 'fr'); return u.toString(); } catch (e) { return ''; }
}
/* Prix de lancement : affiché tant que la date de fin (config) n'est pas passée, puis le prix habituel revient
   tout seul. Jamais de prix barré, de « au lieu de » ni de pourcentage : le plan n'a jamais été vendu au prix
   plein. La porte de paiement fait la même bascule côté serveur (lib/porte-plan.js). */
function lancementEnCours() {
  var fin = Date.parse(O.lancementFin || '');
  return Boolean(O.lancementPrix && O.lancementPhrase) && isFinite(fin) && Date.now() < fin;
}
function vueResultat() {
  var res = D.scorer(etat.r), top = res.priorites.slice(0, 3), reste = res.priorites.slice(3), camera = etat.r.camera === 0 || etat.r.camera === 1, lienPlan = porte(camera);
  var lancement = lancementEnCours(), prixPlan = lancement ? O.lancementPrix : O.prix;
  var options = 'Au paiement, tu peux ajouter le livre digital pour ' + esc(O.livre) + ' au lieu de ' + esc(O.livrePlein) + (camera ? ', et l’analyse de ton onboard pour ' + esc(O.onboard) + ' au lieu de ' + esc(O.onboardPlein) : '') + '.';
  return '<section class="ecran resultat"><p class="marque"><a href="' + esc(O.accueil) + '">Clem Kart Racing</a> · Diagnostic de pilotage</p><h1 class="display">' + txt('{prenom}, voici ton diagnostic') + '</h1>' +
    '<p class="notice-envoi" data-notice-envoi' + (contact.envoi === 'echec' ? '' : ' hidden') + '>Ton diagnostic n’a pas pu partir par email. Il reste affiché ici. <button type="button" class="lien" data-renvoyer>Réessayer l’envoi</button></p>' +
    '<div class="synthese vr"><div class="jauge"><svg viewBox="0 0 104 104" aria-hidden="true"><circle cx="52" cy="52" r="46"/><circle class="av" cx="52" cy="52" r="46"/></svg><p class="big" data-indice>0</p></div>' +
    '<div><p class="lbl">Indice de maîtrise sur 100</p><p class="marge">Marge de progression estimée<strong>' + esc(D.marge(res.indice)) + ' au tour</strong></p><p class="mini">Estimation à partir de tes réponses, pas une promesse de gain.</p></div></div>' +
    '<h2 class="h2">Ce que tu fais déjà bien</h2><div class="forts">' +
    res.forts.map(function (a) { return '<div class="fort vr"><i aria-hidden="true">✓</i><div><strong>' + esc(POINTS[a].nom) + '</strong><span>' + txt(POINTS[a].fort) + '</span></div></div>'; }).join('') + '</div>' +
    '<h2 class="h2">Tes 3 premiers points à travailler</h2><p class="sub">Dans l’ordre où je les prendrais avec toi.</p>' +
    top.map(function (a, k) { return cartePoint(a, k + 1, res); }).join('') +
    '<h2 class="h2">Tes ' + reste.length + ' autres points</h2><p class="sub">Ils sont classés. Leur détail est dans ton plan d’action.</p>' +
    '<div class="reserves">' + reste.map(function (a, k) { return carteReservee(a, k + 4, k); }).join('') + '</div>' +
    '<div class="plan-apercu vr"><p class="lbl">Ton plan d’action</p>' +
    top.map(function (a, k) { return '<p class="ligne"><b>' + (k + 1) + '</b><span>' + esc(POINTS[a].nom) + ' : <span class="floute" aria-hidden="true">l’exercice à faire dès ta prochaine séance, et le repère pour savoir si c’est réussi.</span></span></p>'; }).join('') +
    '<button type="button" class="bouton bouton-fantome bouton-large" data-vers-offre>Voir comment le recevoir</button></div>' +
    '<div class="offre vr" id="dg-offre"><p class="lbl">Pour aller plus loin</p><h2>Ton plan d’action personnalisé</h2>' +
    '<p class="main">Ce n’est pas une IA qui te répond. Je lis tes réponses une par une, y compris ce que tu as écrit avec tes mots, et j’écris ton plan moi-même.</p>' +
    '<ul class="inclus"><li>Tes 9 points passés en revue, pas seulement les 3 premiers</li><li>Un exercice précis pour chaque priorité, à faire dès ta prochaine séance</li><li>Le repère qui te dit si l’exercice est réussi</li><li>Un objectif clair pour ta prochaine sortie</li><li>Envoyé par email sous ' + esc(O.delai) + '</li></ul>' +
    '<div class="prix"><span class="big">' + esc(prixPlan) + '</span></div>' +
    (lancement ? '<p class="lancement">' + txt(O.lancementPhrase) + '</p>' : '') +
    (lienPlan
      ? '<a class="bouton bouton-principal bouton-large" href="' + esc(lienPlan) + '" data-cta="diagnostic-plan">Recevoir mon plan<span class="chrono">' + esc(prixPlan) + '</span></a><p class="sub">' + options + '</p>' +
        '<p class="mini">' + esc(O.garantie) + '. Paiement sécurisé par Stripe. En commandant, tu acceptes les <a href="' + esc(O.cgv) + '">CGV</a>.</p>'
      : '<p class="notice-envoi">Le plan d’action ouvre très bientôt. Ton diagnostic, lui, est déjà à toi.</p>') +
    '</div>' +
    '<p class="sub">Ton diagnostic et tes 3 premiers points restent gratuits. Tu les reçois aussi par email.</p>' +
    '<div class="pied-diag"><button type="button" class="lien" data-carte>Télécharger ma carte pilote</button><button type="button" class="lien" data-recommencer>Refaire le diagnostic</button><a class="lien" href="' + esc(O.accueil) + '">Retour au site</a></div></section>';
}
function brancherResultat() {
  var res = D.scorer(etat.r), el = app.querySelector('[data-indice]'), arc = app.querySelector('.jauge .av'), debut = null;
  requestAnimationFrame(function () { arc.style.strokeDashoffset = 289 * (1 - res.indice / 100); });
  (function compter(t) { if (debut == null) debut = t || 0; var k = Math.min(1, ((t || 0) - debut) / 1500); el.textContent = Math.round(res.indice * (1 - Math.pow(1 - k, 3))); if (k < 1) requestAnimationFrame(compter); })();
  app.querySelector('[data-vers-offre]').onclick = function () { document.getElementById('dg-offre').scrollIntoView({ behavior: 'smooth', block: 'start' }); };
  app.querySelector('[data-carte]').onclick = function () { carte(res); };
  app.querySelector('[data-recommencer]').onclick = function () { etat = { i: 0, r: {} }; contact.envoi = ''; aller(0); };
  app.querySelector('[data-renvoyer]').onclick = function () { envoyer(''); };
  suivre('diag_result', { form: 'diagnostic', priorites: res.priorites.slice(0, 3).join('-'), indice: res.indice });
}

/* Carte pilote à partager (1080 x 1920) */
function carte(res) {
  var c = document.createElement('canvas'), x = c.getContext('2d'); c.width = 1080; c.height = 1920;
  var titre = '"Hubot Sans", "Arial Narrow", sans-serif', texte = '"Mona Sans", Arial, sans-serif', mono = '"Martian Mono", Consolas, monospace';
  x.fillStyle = '#050506'; x.fillRect(0, 0, 1080, 1920);
  var halo = x.createRadialGradient(900, 160, 0, 900, 160, 900); halo.addColorStop(0, 'rgba(225,6,0,.5)'); halo.addColorStop(1, 'rgba(225,6,0,0)'); x.fillStyle = halo; x.fillRect(0, 0, 1080, 1920);
  [[260, 620, 5], [1150, 760, 7], [1620, 520, 4]].forEach(function (f) {
    var g = x.createLinearGradient(1080 - f[1], 0, 1080, 0); g.addColorStop(0, 'rgba(225,6,0,0)'); g.addColorStop(1, '#FF3B30');
    x.shadowColor = '#FF3B30'; x.shadowBlur = 40; x.fillStyle = g; x.fillRect(1080 - f[1], f[0], f[1], f[2]); x.fillRect(1080 - f[1], f[0] + 22, f[1], f[2]);
  });
  x.shadowBlur = 0; x.fillStyle = 'rgba(245,243,238,.75)'; x.font = '500 28px ' + mono; x.fillText('DIAGNOSTIC DE PILOTAGE', 80, 200);
  x.fillStyle = '#F5F3EE'; x.font = '800 condensed 120px ' + titre; x.fillText((etat.r.prenom || 'Pilote').toUpperCase(), 80, 380);
  x.font = '400 280px ' + mono; x.fillText(String(res.indice), 60, 760);
  x.font = '500 38px ' + texte; x.fillStyle = 'rgba(245,243,238,.7)'; x.fillText('indice de maîtrise sur 100', 80, 830);
  x.fillStyle = '#F5F3EE'; x.font = '600 44px ' + texte; x.fillText('Mes 3 points à travailler', 80, 1040);
  res.priorites.slice(0, 3).forEach(function (a, k) {
    x.fillStyle = '#E10600'; x.fillRect(80, 1110 + k * 150, 84, 84); x.fillStyle = '#fff'; x.font = '500 44px ' + mono; x.fillText(String(k + 1), 106, 1168 + k * 150);
    x.fillStyle = '#F5F3EE'; x.font = '500 46px ' + texte; x.fillText(POINTS[a].nom, 200, 1168 + k * 150);
  });
  x.fillStyle = 'rgba(245,243,238,.6)'; x.font = '500 32px ' + texte; x.fillText('Clem Kart Racing', 80, 1820);
  c.toBlob(function (b) { if (!b) return; var l = document.createElement('a'); l.href = URL.createObjectURL(b); l.download = 'carte-pilote.png'; l.click(); setTimeout(function () { URL.revokeObjectURL(l.href); }, 2000); });
}

/* ============ Départ ============ */
decor();
rendre();
})();
