// Genere la page de relecture des six brouillons a partir de articles.json.
const fs = require('fs');
const path = require('path');

const BASE = path.dirname(__filename);
const articles = JSON.parse(fs.readFileSync(path.join(BASE, 'articles.json'), 'utf8'));

const esc = (s) =>
  String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// Gras et code inline, apres echappement.
function inline(s) {
  return esc(s)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[\s(])\*(?!\s)(.+?)(?<!\s)\*/g, '$1<em>$2</em>');
}

// Markdown restreint : titres, listes a puces, listes numerotees, paragraphes.
function markdown(md) {
  const out = [];
  let liste = null; // 'ul' | 'ol'
  const fermer = () => { if (liste) { out.push(`</${liste}>`); liste = null; } };

  for (const ligneBrute of md.split('\n')) {
    const l = ligneBrute.trim();
    if (!l) { fermer(); continue; }

    let m;
    if ((m = l.match(/^###\s+(.*)$/))) { fermer(); out.push(`<h3>${inline(m[1])}</h3>`); continue; }
    if ((m = l.match(/^##\s+(.*)$/)))  { fermer(); out.push(`<h2>${inline(m[1])}</h2>`); continue; }
    if ((m = l.match(/^#\s+(.*)$/)))   { fermer(); out.push(`<h2>${inline(m[1])}</h2>`); continue; }

    if ((m = l.match(/^[-*]\s+(.*)$/))) {
      if (liste !== 'ul') { fermer(); out.push('<ul>'); liste = 'ul'; }
      out.push(`<li>${inline(m[1])}</li>`);
      continue;
    }
    if ((m = l.match(/^\d+[.)]\s+(.*)$/))) {
      if (liste !== 'ol') { fermer(); out.push('<ol>'); liste = 'ol'; }
      out.push(`<li>${inline(m[1])}</li>`);
      continue;
    }

    fermer();
    // Un paragraphe qui commence par « En pratique : » devient un encadre.
    if (/^\*\*En pratique\s*:/i.test(l)) out.push(`<p class="pratique">${inline(l)}</p>`);
    else out.push(`<p>${inline(l)}</p>`);
  }
  fermer();
  return out.join('\n');
}

const mots = (s) => s.split(/\s+/).filter(Boolean).length;

const nav = articles
  .map((a, i) => `        <a class="rail-lien" href="#a${i}"><span class="rail-titre">${esc(a.titreH1)}</span><span class="rail-cle">${esc(a.motCleePrincipal)}</span></a>`)
  .join('\n');

const sections = articles
  .map((a, i) => {
    const faq = (a.faq || [])
      .map((q) => `          <div class="qr"><p class="q">${inline(q.question)}</p><p class="r">${inline(q.reponse)}</p></div>`)
      .join('\n');
    const verifs = (a.aVerifierParClement || [])
      .map((v, j) => `            <li><label><input type="checkbox" data-cle="v${i}-${j}"><span>${inline(v)}</span></label></li>`)
      .join('\n');
    const secondaires = (a.motsClesSecondaires || []).slice(0, 10)
      .map((k) => `<span class="tag">${esc(k)}</span>`).join('');

    return `      <article class="article" id="a${i}">
        <p class="eyebrow">Mot cle vise · ${esc(a.motCleePrincipal)}</p>
        <h2 class="titre">${esc(a.titreH1)}</h2>
        <p class="chapo">${inline(a.chapo)}</p>

        <div class="fiche">
          <div class="fiche-l"><span class="fiche-k">Balise title</span><span class="fiche-v">${esc(a.titleTag)}</span><span class="fiche-n">${a.titleTag.length}/60</span></div>
          <div class="fiche-l"><span class="fiche-k">Meta description</span><span class="fiche-v">${esc(a.metaDescription)}</span><span class="fiche-n">${a.metaDescription.length}/160</span></div>
          <div class="fiche-l"><span class="fiche-k">Nom de fichier</span><span class="fiche-v mono">${esc(a.slug)}.html</span><span class="fiche-n">${mots(a.corps)} mots</span></div>
        </div>
        ${secondaires ? `<div class="tags">${secondaires}</div>` : ''}

        <div class="corps">
${markdown(a.corps)}
        </div>

        <section class="faq">
          <h3 class="bloc-titre">Questions frequentes</h3>
${faq}
        </section>

        <section class="verifs">
          <h3 class="bloc-titre">A verifier avant publication</h3>
          <p class="verifs-intro">Les chiffres viennent de sources officielles datees, mais un tarif ou un reglement peut avoir bouge. Coche ce que tu as confirme.</p>
          <ul class="liste-verifs">
${verifs}
          </ul>
        </section>
      </article>`;
  })
  .join('\n\n');

const html = `<title>Brouillons blog karting</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Barlow+Condensed:wght@400;600;700&family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,600;1,6..72,400&display=swap">
<style>
  :root{
    --ground:#F5F1EC; --surface:#FFFFFF; --surface-2:#EFE9E1;
    --text:#17110F; --muted:#5E564E; --line:#DFD6CB;
    --red:#C0141A; --gold:#8A6C1E; --gold-soft:#F0E6CC;
    --fd:'Bebas Neue',Impact,sans-serif;
    --fc:'Barlow Condensed','Arial Narrow',sans-serif;
    --fb:'Newsreader',Georgia,'Times New Roman',serif;
    --mesure:66ch;
  }
  @media (prefers-color-scheme: dark){
    :root:not([data-theme="light"]){
      --ground:#0B0A0A; --surface:#131110; --surface-2:#1B1817;
      --text:#F2EDE8; --muted:#A79F97; --line:#2C2624;
      --red:#E8353B; --gold:#C9A84C; --gold-soft:#241E12;
    }
  }
  :root[data-theme="dark"]{
    --ground:#0B0A0A; --surface:#131110; --surface-2:#1B1817;
    --text:#F2EDE8; --muted:#A79F97; --line:#2C2624;
    --red:#E8353B; --gold:#C9A84C; --gold-soft:#241E12;
  }

  *,*::before,*::after{box-sizing:border-box;}
  body{margin:0;background:var(--ground);color:var(--text);font-family:var(--fb);font-size:18px;line-height:1.7;}
  a{color:var(--red);}
  ::selection{background:var(--gold-soft);}
  :focus-visible{outline:2px solid var(--red);outline-offset:3px;}

  .page{display:grid;grid-template-columns:minmax(0,1fr);gap:0;}
  @media (min-width:1080px){
    .page{grid-template-columns:19rem minmax(0,1fr);align-items:start;}
  }

  /* ---------- rail ---------- */
  .rail{background:var(--surface);border-bottom:1px solid var(--line);padding:1.6rem 1.4rem;}
  @media (min-width:1080px){
    .rail{position:sticky;top:0;max-height:100vh;overflow-y:auto;border-bottom:0;border-right:1px solid var(--line);padding:2.4rem 1.8rem;}
  }
  .marque{font-family:var(--fd);font-size:1.35rem;letter-spacing:.06em;line-height:1;margin:0;}
  .marque em{font-style:normal;color:var(--red);}
  .rail-sous{font-family:var(--fc);font-size:.78rem;letter-spacing:.22em;text-transform:uppercase;color:var(--muted);margin:.55rem 0 1.6rem;}
  .rail-liste{display:flex;flex-direction:column;gap:.15rem;}
  .rail-lien{display:block;padding:.7rem .8rem;text-decoration:none;color:var(--text);border-left:2px solid transparent;transition:background .15s,border-color .15s;}
  .rail-lien:hover{background:var(--surface-2);border-left-color:var(--red);}
  .rail-titre{display:block;font-family:var(--fc);font-size:1rem;font-weight:600;line-height:1.3;}
  .rail-cle{display:block;font-family:var(--fc);font-size:.76rem;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);margin-top:.2rem;}

  /* ---------- corps ---------- */
  .flux{padding:2.2rem 1.3rem 5rem;display:flex;flex-direction:column;gap:3.5rem;min-width:0;}
  @media (min-width:760px){ .flux{padding:3.5rem 3rem 6rem;} }

  .intro{max-width:var(--mesure);}
  .intro h1{font-family:var(--fd);font-size:clamp(2.4rem,6vw,3.6rem);line-height:.98;letter-spacing:.01em;margin:0 0 .6rem;text-wrap:balance;}
  .intro p{color:var(--muted);margin:0 0 .8rem;}

  .article{border-top:1px solid var(--line);padding-top:2.4rem;max-width:var(--mesure);scroll-margin-top:1.5rem;}
  .eyebrow{font-family:var(--fc);font-size:.76rem;letter-spacing:.24em;text-transform:uppercase;color:var(--red);margin:0 0 .7rem;}
  .titre{font-family:var(--fd);font-size:clamp(1.9rem,4.6vw,2.9rem);line-height:1.02;letter-spacing:.01em;margin:0 0 .9rem;text-wrap:balance;font-weight:400;}
  .chapo{font-size:1.12rem;line-height:1.65;color:var(--text);margin:0 0 1.6rem;font-style:italic;}

  /* fiche technique SEO */
  .fiche{border:1px solid var(--line);background:var(--surface);display:flex;flex-direction:column;}
  .fiche-l{display:grid;grid-template-columns:9.5rem minmax(0,1fr) auto;gap:.9rem;align-items:baseline;padding:.7rem .9rem;border-bottom:1px solid var(--line);}
  .fiche-l:last-child{border-bottom:0;}
  @media (max-width:600px){ .fiche-l{grid-template-columns:1fr auto;} .fiche-k{grid-column:1/-1;} }
  .fiche-k{font-family:var(--fc);font-size:.74rem;letter-spacing:.18em;text-transform:uppercase;color:var(--muted);}
  .fiche-v{font-family:var(--fc);font-size:.98rem;line-height:1.45;}
  .fiche-v.mono{font-family:var(--fc);letter-spacing:.02em;color:var(--muted);}
  .fiche-n{font-family:var(--fc);font-size:.76rem;letter-spacing:.08em;color:var(--muted);font-variant-numeric:tabular-nums;white-space:nowrap;}

  .tags{display:flex;flex-wrap:wrap;gap:.35rem;margin-top:.8rem;}
  .tag{font-family:var(--fc);font-size:.75rem;letter-spacing:.06em;color:var(--muted);border:1px solid var(--line);padding:.15rem .5rem;}

  .corps{margin-top:2rem;}
  .corps h2{font-family:var(--fc);font-size:1.42rem;font-weight:700;line-height:1.25;letter-spacing:.01em;margin:2.4rem 0 .8rem;text-wrap:balance;}
  .corps h3{font-family:var(--fc);font-size:1.12rem;font-weight:600;line-height:1.3;margin:1.8rem 0 .6rem;color:var(--muted);text-wrap:balance;}
  .corps p{margin:0 0 1.05rem;}
  .corps ul,.corps ol{margin:0 0 1.2rem;padding-left:1.3rem;}
  .corps li{margin-bottom:.5rem;}
  .corps ul{list-style:none;padding-left:0;}
  .corps ul li{padding-left:1.3rem;position:relative;}
  .corps ul li::before{content:'';position:absolute;left:.25rem;top:.72em;width:.4rem;height:1px;background:var(--red);}
  .corps ol{list-style:decimal;}
  .corps ol li::marker{font-family:var(--fc);color:var(--red);font-weight:700;}
  .corps strong{font-weight:600;}
  .pratique{background:var(--surface);border-left:3px solid var(--gold);padding:1rem 1.1rem;margin:1.6rem 0;}

  .bloc-titre{font-family:var(--fc);font-size:.82rem;letter-spacing:.24em;text-transform:uppercase;color:var(--muted);margin:0 0 1rem;font-weight:600;}
  .faq{margin-top:2.6rem;padding-top:1.6rem;border-top:1px solid var(--line);}
  .qr{margin-bottom:1.3rem;}
  .q{font-family:var(--fc);font-size:1.08rem;font-weight:600;margin:0 0 .3rem;}
  .r{margin:0;color:var(--muted);font-size:.98rem;}

  .verifs{margin-top:2.4rem;background:var(--gold-soft);border:1px solid var(--gold);padding:1.3rem 1.4rem;}
  .verifs .bloc-titre{color:var(--gold);}
  .verifs-intro{margin:0 0 1rem;font-size:.95rem;color:var(--muted);}
  .liste-verifs{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:.65rem;}
  .liste-verifs label{display:flex;gap:.7rem;align-items:flex-start;cursor:pointer;font-size:.95rem;line-height:1.55;}
  .liste-verifs input{margin-top:.42em;accent-color:var(--red);flex-shrink:0;width:1rem;height:1rem;}
  .liste-verifs input:checked + span{color:var(--muted);text-decoration:line-through;}

  .fin{border-top:1px solid var(--line);padding-top:1.6rem;max-width:var(--mesure);font-family:var(--fc);font-size:.88rem;letter-spacing:.04em;color:var(--muted);}
</style>

<div class="page">
  <nav class="rail">
    <p class="marque">CLEM <em>KART</em> RACING</p>
    <p class="rail-sous">Brouillons blog</p>
    <div class="rail-liste">
${nav}
    </div>
  </nav>

  <main class="flux">
    <header class="intro">
      <h1>SIX ARTICLES,<br>ZERO CHAPITRE DONNE</h1>
      <p>Six brouillons sur la logistique de la competition, le seul terrain qui attire des pilotes sans rien livrer des 13 chapitres du guide. Chaque article ouvre sur une scene concrete, renvoie vers l'extrait gratuit, et ne mentionne jamais le guide payant.</p>
      <p>Les faits viennent de l'annexe sportive FFSA 2026, des prescriptions CIK-FIA et des tarifs officiels des licences. Ce qui n'etait pas verifiable est signale en bas de chaque article plutot qu'invente.</p>
    </header>

${sections}

    <footer class="fin">
      Brouillons rediges le 31 aout 2026. Rien n'est publie : dis-moi ce que tu corriges et je les mets en ligne avec le gabarit du site.
    </footer>
  </main>
</div>

<script>
  // Les cases cochees restent d'une visite a l'autre, dans ce navigateur uniquement.
  (function () {
    var cases = document.querySelectorAll('.liste-verifs input[type=checkbox]');
    cases.forEach(function (c) {
      var cle = 'ckr-verif-' + c.dataset.cle;
      try { if (localStorage.getItem(cle) === '1') c.checked = true; } catch (e) {}
      c.addEventListener('change', function () {
        try { localStorage.setItem(cle, c.checked ? '1' : '0'); } catch (e) {}
      });
    });
  })();
</script>
`;

const dest = path.join(BASE, 'brouillons-blog.html');
fs.writeFileSync(dest, html, 'utf8');
console.log('ecrit : ' + dest);
console.log('taille : ' + (Buffer.byteLength(html, 'utf8') / 1024).toFixed(0) + ' Ko');
console.log('tirets cadratins dans la page : ' + (html.match(/—/g) || []).length);
