// Harnais de test de l'agregation du dashboard : Supabase et Stripe sont remplaces par un
// faux fetch qui renvoie des evenements, des ventes et des sessions fabriques. Aucune donnee
// reelle lue. Les liens Stripe (plink_) et les portes /aller/* viennent de config/offres.json.
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
process.env.DASHBOARD_PASSWORD = 'secret';

const path = require('path');
const FN = path.join(__dirname, '..', 'site v2', 'netlify', 'functions', 'dashboard-data.js');

const DAY = 86400000;
const iso = (dAgo, h = 12) => new Date(Date.now() - dAgo * DAY + h * 3600000 - 12 * 3600000).toISOString();

let events = [];
let sales = [];
// Faux Stripe : liste de sessions de paiement, ou panne (status != 200).
let stripe = { status: 200, sessions: [] };
const urlsAppelees = [];

// De vraies instances de Response : dashboard-data.js verifie `instanceof Response`
// avant d'exploiter les ventes (il degrade proprement si la table n'existe pas encore).
global.fetch = async (url) => {
  const u = String(url);
  urlsAppelees.push(u);
  if (u.includes('api.stripe.com')) {
    const corps = stripe.status === 200 ? { object: 'list', data: stripe.sessions, has_more: false } : { error: { message: 'panne simulee' } };
    return new Response(JSON.stringify(corps), { status: stripe.status, headers: { 'Content-Type': 'application/json' } });
  }
  return new Response(JSON.stringify(u.includes('/sales') ? sales : events), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
};

let pass = 0, fail = 0;
function check(name, cond, extra) {
  if (cond) { pass++; console.log(`  OK   ${name}`); }
  else { fail++; console.log(`  FAIL ${name}${extra !== undefined ? ' -> ' + extra : ''}`); }
}
function section(t) { console.log(`\n=== ${t}`); }

const ev = (o) => Object.assign({
  created_at: iso(1), type: 'pageview', source: 'direct', device: 'mobile',
  session_id: 's1', path: '/', meta: null, utm_source: null, utm_medium: null, utm_campaign: null
}, o);

(async () => {
  const dash = require(FN);
  const appel = async (days = 30) => {
    const r = await dash.handler({
      httpMethod: 'POST',
      headers: {},
      body: JSON.stringify({ password: 'secret', days })
    });
    return { statusCode: r.statusCode, data: JSON.parse(r.body) };
  };

  section('acces');
  let r = await dash.handler({ httpMethod: 'POST', headers: {}, body: JSON.stringify({ password: 'faux' }) });
  check('mauvais mot de passe -> 401', r.statusCode === 401);
  for (let i = 0; i < 10; i++) {
    await dash.handler({ httpMethod: 'POST', headers: { 'x-forwarded-for': '9.9.9.9' }, body: JSON.stringify({ password: 'essai' + i }) });
  }
  r = await dash.handler({ httpMethod: 'POST', headers: { 'x-forwarded-for': '9.9.9.9' }, body: JSON.stringify({ password: 'secret' }) });
  check('10 essais rates -> 429, meme avec le bon mot de passe', r.statusCode === 429);
  r = await dash.handler({ httpMethod: 'POST', headers: { 'x-forwarded-for': '9.9.9.9' }, body: JSON.stringify({}) });
  check('mot de passe absent -> refuse sans planter', r.statusCode === 429 || r.statusCode === 401);

  section('entonnoir et inscriptions');
  events = [
    // 3 visiteurs distincts sur la page extrait
    ev({ session_id: 'a', path: '/extrait-guide.html', utm_source: 'instagram', utm_medium: 'manychat', utm_campaign: 'extrait' }),
    ev({ session_id: 'b', path: '/extrait-guide.html', utm_source: 'instagram', utm_medium: 'manychat', utm_campaign: 'extrait' }),
    ev({ session_id: 'c', path: '/extrait-guide.html' }),
    // 1 visiteur sur la page tableur
    ev({ session_id: 'd', path: '/tableur-reglages.html' }),
    // 1 visiteur sur l'accueil
    ev({ session_id: 'e', path: '/index.html' }),
    // inscriptions
    ev({ session_id: 'a', type: 'extrait_signup', path: '/extrait-guide.html', utm_source: 'instagram', utm_medium: 'manychat', utm_campaign: 'extrait' }),
    ev({ session_id: 'b', type: 'extrait_signup', path: '/extrait-guide.html', utm_source: 'instagram', utm_medium: 'manychat', utm_campaign: 'extrait' }),
    ev({ session_id: 'd', type: 'tableur_signup', path: '/tableur-reglages.html' }),
    // clic vers le guide
    ev({ session_id: 'a', type: 'gumroad_click', path: '/extrait-guide.html', meta: { cta: 'btn-red' } }),
    // mes propres visites du dashboard : doivent etre ignorees
    ev({ session_id: 'moi', path: '/dashboard.html' }),
    ev({ session_id: 'moi', path: '/dashboard.html' }),
  ];
  sales = [
    { created_at: iso(2), price_cents: 1699, quantity: 1, currency: 'EUR' },
    { created_at: iso(40), price_cents: 1499, quantity: 1, currency: 'EUR' },
  ];

  let { data } = await appel(30);
  const f = data.funnel;
  check('entonnoir en 5 etapes', f.length === 5, f.length);
  check('visiteurs = 5 (visites du dashboard exclues)', f[0].valeur === 5, f[0].valeur);
  check('vues des pages de capture = 4', f[1].valeur === 4, f[1].valeur);
  check('emails laisses = 3', f[2].valeur === 3, f[2].valeur);
  check('clics guide = 1', f[3].valeur === 1, f[3].valeur);
  check('ventes = 1 sur 30j', f[4].valeur === 1, f[4].valeur);
  check('taux calcule sur l etape precedente (3/4 = 75%)', f[2].taux === 75, f[2].taux);
  check('1re etape sans taux', f[0].taux === null);
  check('total inscriptions expose', data.totals.inscriptions === 3, data.totals.inscriptions);
  check('page dashboard absente de la liste des pages', !data.by_page.some(p => p.path === '/dashboard.html'));

  section('pages nommees');
  const pageExtrait = data.by_page.find(p => p.path === '/extrait-guide.html');
  check('la page extrait a un nom lisible', pageExtrait && pageExtrait.nom === 'Page extrait (capture email)', pageExtrait && pageExtrait.nom);
  check('vues comptees par page', pageExtrait && pageExtrait.pageviews === 3, pageExtrait && pageExtrait.pageviews);

  section('campagnes');
  const camp = data.by_campaign[0];
  check('une campagne remontee', data.by_campaign.length === 1, JSON.stringify(data.by_campaign));
  check('libelle = source · medium · campagne', camp.campagne === 'instagram · manychat · extrait', camp.campagne);
  check('visiteurs uniques de la campagne = 2', camp.visiteurs === 2, camp.visiteurs);
  check('inscriptions de la campagne = 2', camp.inscriptions === 2, camp.inscriptions);
  check('taux inscription campagne = 100%', camp.taux_inscription === 100, camp.taux_inscription);

  section('dates cles');
  check('premiere vente = la plus ancienne, meme hors periode', data.dates.premiere_vente === iso(40).slice(0, 10), data.dates.premiere_vente);
  check('derniere vente correcte', data.dates.derniere_vente === iso(2).slice(0, 10), data.dates.derniere_vente);
  check('derniere inscription datee', data.dates.derniere_inscription === iso(1).slice(0, 10), data.dates.derniere_inscription);
  check('meilleur jour identifie', data.dates.meilleur_jour && data.dates.meilleur_jour.visiteurs === 5, JSON.stringify(data.dates.meilleur_jour));

  section('courbe par jour');
  const jour = data.by_day.find(j => j.date === iso(1).slice(0, 10));
  check('les inscriptions sont dans la courbe', jour && jour.inscriptions === 3, jour && jour.inscriptions);
  check('les ventes sont dans la courbe', data.by_day.some(j => j.ventes === 1));

  section("extrait gratuit vs vente payante");
  // Gumroad envoie un ping pour le produit gratuit exactement comme pour une vente.
  // Sans tri, chaque telechargement gonflait ventes, CA et taux d'achat.
  events = [
    ev({ type: 'pageview', path: '/extrait-guide.html', session_id: 'x1' }),
    ev({ type: 'pageview', path: '/extrait-guide.html', session_id: 'x2' }),
    ev({ type: 'extrait_signup', path: '/extrait-guide.html', session_id: 'x1' })
  ];
  sales = [
    { created_at: iso(1), product_name: 'Comprendre Comment Rouler Plus Vite.', price_cents: 1699, quantity: 1, currency: 'EUR', raw: { permalink: 'umjfwx' } },
    { created_at: iso(1), product_name: 'Comprendre... (Extrait)', price_cents: 0, quantity: 1, currency: 'EUR', raw: { permalink: 'ehdkm' } },
    { created_at: iso(2), product_name: '', price_cents: 0, quantity: 1, currency: 'EUR', raw: { product_permalink: 'https://clemkartracing.gumroad.com/l/Extrait' } }
  ];
  ({ data } = await appel(30));
  check('une seule vraie vente comptee', data.totals.ventes === 1, data.totals.ventes);
  check('les 2 extraits gratuits comptes a part', data.totals.extraits_gumroad === 2, data.totals.extraits_gumroad);
  check('le CA ne contient que la vente payante', data.totals.revenu_cents === 1699, data.totals.revenu_cents);
  check('l entonnoir ne gonfle pas', data.funnel[data.funnel.length - 1].valeur === 1);

  // Un produit payant inconnu doit rester une vente : mieux vaut mal etiqueter
  // qu'effacer du chiffre d'affaires.
  sales = [{ created_at: iso(1), product_name: 'Produit inconnu', price_cents: 2500, quantity: 1, currency: 'EUR', raw: {} }];
  ({ data } = await appel(30));
  check('produit payant inconnu reste une vente', data.totals.ventes === 1 && data.totals.revenu_cents === 2500);

  section("entonnoir extrait");
  events = [
    ev({ type: 'pageview', path: '/extrait-guide.html', session_id: 'e1' }),
    ev({ type: 'pageview', path: '/extrait-guide.html', session_id: 'e2' }),
    ev({ type: 'pageview', path: '/extrait-guide.html', session_id: 'e3' }),
    ev({ type: 'pageview', path: '/extrait-guide.html', session_id: 'e4' }),
    ev({ type: 'extrait_signup', path: '/extrait-guide.html', session_id: 'e1' }),
    ev({ type: 'tableur_signup', path: '/tableur-reglages.html', session_id: 'e9' })
  ];
  sales = [];
  ({ data } = await appel(30));
  check('l entonnoir extrait existe', Array.isArray(data.funnel_extrait) && data.funnel_extrait.length === 3);
  check('vues de la page extrait isolees du tableur', data.funnel_extrait[0].valeur === 4, data.funnel_extrait[0].valeur);
  check('inscriptions extrait seules, sans le tableur', data.funnel_extrait[1].valeur === 1, data.funnel_extrait[1].valeur);
  check('taux page extrait -> email', data.funnel_extrait[1].taux === 25, data.funnel_extrait[1].taux);
  check('mails envoyes = inscriptions reussies', data.funnel_extrait[2].valeur === 1);

  section('lecture Supabase : colonnes UTM demandees (panneau Campagnes)');
  urlsAppelees.length = 0;
  events = [ev({ session_id: 'u1', utm_source: 'instagram', utm_medium: 'story', utm_campaign: 'debrief' })];
  sales = [];
  ({ data } = await appel(30));
  const urlEvents = urlsAppelees.find(u => u.includes('/site_events')) || '';
  check('la requete demande utm_source, utm_medium et utm_campaign', /utm_source/.test(urlEvents) && /utm_medium/.test(urlEvents) && /utm_campaign/.test(urlEvents), urlEvents);

  section('site 2 : pages nommees, brouillons des deux sites ignores');
  const s2 = (o) => ev(Object.assign({ meta: { site: 'site2' } }, o));
  events = [
    s2({ session_id: 'h1', path: '/' }),
    s2({ session_id: 'h1', type: 'diag_click', path: '/', meta: { site: 'site2', cta: 'hero' } }),
    s2({ session_id: 'h2', path: '/index.html' }),
    s2({ session_id: 'o1', path: '/onboard/' }),
    ev({ session_id: 'b1', path: '/onboard/', meta: { site: 'site2-brouillon' } }),
    ev({ session_id: 'l1', path: '/', meta: { site: 'local' } }),
    ev({ session_id: 'd1', path: '/guide/', meta: { site: 'site1-brouillon' } }),
    ev({ session_id: 'p1', path: '/' }),
  ];
  ({ data } = await appel(30));
  check('brouillons et apercus locaux exclus des visiteurs', data.totals.visiteurs === 4, data.totals.visiteurs);
  check('evenements de test comptes a part (brouillons des deux sites, apercu local)', data.tests_ignores === 3, data.tests_ignores);
  const accueil2 = data.by_page.find(p => p.nom === 'Site 2 · Accueil catalogue');
  check("l'accueil du site 2 a son nom et regroupe / et /index.html", accueil2 && accueil2.pageviews === 2, JSON.stringify(data.by_page));
  check("l'accueil du site 1 reste separe", data.by_page.some(p => p.nom === 'Accueil' && p.pageviews === 1), JSON.stringify(data.by_page));
  check('clic accueil vers le diagnostic compte', data.debrief && data.debrief.clics_accueil.diagnostic === 1, JSON.stringify(data.debrief && data.debrief.clics_accueil));

  section('tunnel du debrief');
  delete process.env.STRIPE_READ_KEY;
  const d2 = (sid, type, meta) => ev({ session_id: sid, type, path: '/onboard/', meta: Object.assign({ site: 'site2' }, meta || {}) });
  const etape = (sid, step, key, value) => d2(sid, 'diag_step', { step, key, value });
  const reponses = { 1: ['kart', 'perso'], 2: ['stag', '1an'], 3: ['why', 'non'], 4: ['zone', 'frein'], 5: ['essai', 'matos_onboard'], 6: ['rage', 'potes'] };
  events = [];
  for (const sid of ['v1', 'v2', 'v3', 'v4', 'v5']) events.push(d2(sid, 'pageview'));
  for (const sid of ['v1', 'v2', 'v3', 'v4']) events.push(d2(sid, 'diag_start'));
  events.push(etape('v4', 1, 'kart', 'loc'), d2('v4', 'diag_exit', { kind: 'loc', step: 1 }));
  for (const sid of ['v1', 'v2', 'v3']) {
    for (let s = 1; s <= 6; s++) events.push(etape(sid, s, reponses[s][0], reponses[s][1]));
  }
  events.push(etape('v1', 7, 'video', 'souvent'), etape('v2', 7, 'video', 'parfois'), etape('v3', 7, 'video', 'jamais'), d2('v3', 'diag_exit', { kind: 'nocam', step: 7 }));
  events.push(d2('v1', 'diag_result', { kart: 'perso', zone: 'frein' }), d2('v2', 'diag_result', { kart: 'perso', zone: 'frein' }));
  events.push(d2('v1', 'stripe_click', { cta: 'diag' }), d2('v1', 'stripe_click', { cta: 'prix' }), d2('v2', 'stripe_click', { cta: 'barre' }));
  events.push(d2('v1', 'faq_open', { q: 1 }), d2('v2', 'faq_open', { q: 1 }), d2('v2', 'faq_open', { q: 3 }));
  // v1 revient a la question 1 et change d'avis : seule sa derniere reponse compte dans les profils.
  events.push(etape('v1', 1, 'kart', 'mixte'));
  sales = [];
  ({ data } = await appel(30));
  const db = data.debrief || { funnel: [], etapes: [], sorties: {}, boutons_paiement: [], faq: [], profils: [], stripe: {} };
  check('le bloc debrief existe', Array.isArray(db.funnel) && db.funnel.length === 5, db.funnel.length);
  check('entonnoir : visiteurs du diagnostic = 5', db.funnel[0] && db.funnel[0].valeur === 5, db.funnel[0] && db.funnel[0].valeur);
  check('entonnoir : diagnostic commence = 4', db.funnel[1] && db.funnel[1].valeur === 4, db.funnel[1] && db.funnel[1].valeur);
  check('entonnoir : diagnostic termine = 2', db.funnel[2] && db.funnel[2].valeur === 2, db.funnel[2] && db.funnel[2].valeur);
  check('entonnoir : clic vers le paiement = 2 visiteurs (pas 3 clics)', db.funnel[3] && db.funnel[3].valeur === 2, db.funnel[3] && db.funnel[3].valeur);
  check('taux termine / commence = 50%', db.funnel[2] && db.funnel[2].taux === 50, db.funnel[2] && db.funnel[2].taux);
  const q1 = db.etapes.find(e => e.step === 1), q2 = db.etapes.find(e => e.step === 2), q7 = db.etapes.find(e => e.step === 7);
  check('question 1 validee par 4 visiteurs', q1 && q1.sessions === 4, q1 && q1.sessions);
  check('question 2 validee par 3 visiteurs (la location est sortie)', q2 && q2.sessions === 3, q2 && q2.sessions);
  check('question 2 : 75% des visiteurs qui ont commence', q2 && q2.taux_depuis_depart === 75, q2 && q2.taux_depuis_depart);
  check('question 7 validee par 3 visiteurs', q7 && q7.sessions === 3, q7 && q7.sessions);
  check('sorties honnetes : 1 location, 1 sans images', db.sorties.location === 1 && db.sorties.sans_images === 1, JSON.stringify(db.sorties));
  const bPrix = db.boutons_paiement.find(b => b.cta === 'prix');
  check('boutons de paiement nommes et comptes', bPrix && bPrix.sessions === 1 && bPrix.label === 'Bouton du bloc prix', JSON.stringify(db.boutons_paiement));
  const faq1 = db.faq.find(f => f.q === 1);
  check('FAQ : question 1 ouverte par 2 visiteurs', faq1 && faq1.ouvertures === 2 && /chronos/.test(faq1.question), JSON.stringify(db.faq));
  const nb = (p, v) => ((p && p.reponses.find(x => x.valeur === v)) || { n: 0 }).n;
  const kart = db.profils.find(p => p.cle === 'kart');
  check('profils : derniere reponse gardee (v1 passe a mixte)', nb(kart, 'perso') === 2 && nb(kart, 'mixte') === 1 && nb(kart, 'loc') === 1, JSON.stringify(kart));
  const video = db.profils.find(p => p.cle === 'video');
  check('profils : les sorties comptent dans les reponses', nb(video, 'jamais') === 1, JSON.stringify(video));
  check('profils : libelles lisibles', kart && kart.reponses.some(x => x.label === 'Son propre kart'), JSON.stringify(kart));
  check('sans cle Stripe : statut non_configure, pas de plantage', db.stripe.statut === 'non_configure' && db.ventes === 0, JSON.stringify(db.stripe));

  section('ventes Stripe du debrief');
  process.env.STRIPE_READ_KEY = 'rk_test_lecture';
  urlsAppelees.length = 0;
  const hier = Math.floor((Date.now() - DAY) / 1000);
  const sessionStripe = (o) => Object.assign({
    id: 'cs_' + Math.random().toString(36).slice(2), object: 'checkout.session', created: hier,
    status: 'complete', payment_status: 'paid', livemode: true, amount_total: 2999, currency: 'eur', client_reference_id: null,
    customer_details: { email: 'pilote@example.com', name: 'Jean Pilote' },
    line_items: { object: 'list', data: [{ description: 'Débrief onboard personnalisé', amount_total: 2999, quantity: 1 }] },
    payment_intent: { id: 'pi_x', latest_charge: { id: 'ch_x', refunded: false, amount_refunded: 0 } }
  }, o);
  events = [
    ev({ session_id: 'v1-abc', path: '/onboard/', source: 'instagram', meta: { site: 'site2' } }),
    ev({ session_id: 'v2', path: '/onboard/', source: 'direct', meta: { site: 'site2' } }),
  ];
  sales = [{ created_at: iso(1), price_cents: 1699, quantity: 1, currency: 'EUR', product_name: 'Guide' }];
  stripe = { status: 200, sessions: [
    sessionStripe({ amount_total: 3998, client_reference_id: 'kart-perso-zone-frein-sid-v1abc',
      line_items: { object: 'list', data: [
        { description: 'Débrief onboard personnalisé', amount_total: 2999, quantity: 1 },
        { description: 'Comprendre comment rouler plus vite (Guide PDF)', amount_total: 999, quantity: 1 }] } }),
    sessionStripe({ client_reference_id: 'kart-mixte-sid-inconnu' }),
    sessionStripe({ payment_intent: { id: 'pi_r', latest_charge: { id: 'ch_r', refunded: true, amount_refunded: 2999 } } }),
    sessionStripe({ livemode: false }),
    sessionStripe({ payment_intent: { id: 'pi_p', latest_charge: { id: 'ch_p', refunded: false, amount_refunded: 999 } } }),
    sessionStripe({ payment_status: 'unpaid' }),
  ] };
  ({ data } = await appel(30));
  const dv = data.debrief || { stripe: {}, ventes_par_source: [], funnel: [] };
  check('statut Stripe ok', dv.stripe.statut === 'ok', JSON.stringify(dv.stripe));
  check('3 debriefs payes (rembourse, test et impaye exclus)', dv.ventes === 3, dv.ventes);
  check('1 option guide prise', dv.options_guide === 1, dv.options_guide);
  check('CA debrief = 3998 + 2999 + (2999 - 999 rembourses)', dv.revenu_cents === 8997, dv.revenu_cents);
  check("derniere etape de l'entonnoir = debriefs payes", dv.funnel.length && dv.funnel[dv.funnel.length - 1].valeur === 3);
  const insta = dv.ventes_par_source.find(x => x.source === 'instagram');
  check('vente reliee a sa visite Instagram', insta && insta.ventes === 1, JSON.stringify(dv.ventes_par_source));
  const nonReliee = dv.ventes_par_source.find(x => x.source === 'non reliée');
  check('ventes sans visite retrouvee comptees a part', nonReliee && nonReliee.ventes === 2, JSON.stringify(dv.ventes_par_source));
  check('CA total = Gumroad + Stripe', data.totals.revenu_total_cents === 1699 + 8997, data.totals.revenu_total_cents);
  check('le CA du guide reste separe', data.totals.revenu_cents === 1699, data.totals.revenu_cents);
  const urlStripe = decodeURIComponent(urlsAppelees.filter(u => u.includes('api.stripe.com')).pop() || '');
  check('Stripe lu sur la periode, sessions terminees seulement', /status=complete/.test(urlStripe) && /created\[gte\]=\d+/.test(urlStripe), urlStripe);
  const brut = JSON.stringify(data);
  check('aucune donnee client renvoyee au navigateur', !brut.includes('pilote@example.com') && !brut.includes('Jean Pilote'));

  section('Stripe en panne');
  stripe = { status: 500, sessions: [] };
  r = await dash.handler({ httpMethod: 'POST', headers: {}, body: JSON.stringify({ password: 'secret', days: 30 }) });
  const dErr = JSON.parse(r.body);
  check('Stripe en panne : le dashboard repond quand meme', r.statusCode === 200, r.statusCode);
  check('statut erreur signale', dErr.debrief && dErr.debrief.stripe.statut === 'erreur', JSON.stringify(dErr.debrief && dErr.debrief.stripe));
  delete process.env.STRIPE_READ_KEY;
  stripe = { status: 200, sessions: [] };

  section('clics vers Stripe et page de liens (site 1)');
  // Les portes /aller/* et les identifiants plink_ viennent de la config : jamais en dur ici.
  const OFFRES = require(path.join(__dirname, '..', 'config', 'offres.json'));
  delete process.env.STRIPE_READ_KEY;
  // Les clics de cette section datent de 6 h : ils doivent aussi apparaitre dans les deltas 24 h.
  const recent = iso(0, 6);
  const bio = (sid, bouton, position, plateforme, chemin) => ev({
    created_at: recent, session_id: sid, type: 'bio_click', path: chemin || '/liens',
    utm_source: plateforme === 'direct' ? null : plateforme, utm_medium: plateforme === 'direct' ? null : 'bio',
    meta: { bouton, position, plateforme }
  });
  events = [
    // 3 visiteurs sur la page de liens, ecrite de 3 facons : une seule page
    ev({ session_id: 'l1', path: '/liens', utm_source: 'instagram', utm_medium: 'bio' }),
    ev({ session_id: 'l2', path: '/liens/', utm_source: 'tiktok', utm_medium: 'bio' }),
    ev({ session_id: 'l3', path: '/liens/index.html' }),
    bio('l1', 'guide', 1, 'instagram'),
    bio('l1', 'onboard', 2, 'instagram'),
    bio('l2', 'guide', 1, 'tiktok', '/liens/'),
    // l1 arrive sur /guide depuis la bio et clique deux boutons vers Stripe
    ev({ session_id: 'l1', path: '/guide/', utm_source: 'instagram', utm_medium: 'bio', utm_campaign: 'guide' }),
    ev({ created_at: recent, session_id: 'l1', type: 'stripe_click', path: '/guide/', utm_source: 'instagram', utm_medium: 'bio', utm_campaign: 'guide', meta: { cta: 'hero', route: OFFRES.guide.aller } }),
    ev({ created_at: recent, session_id: 'l1', type: 'stripe_click', path: '/guide/', meta: { cta: 'prix', route: OFFRES.guide.aller } }),
    // l2 prend le debrief au prix lecteur depuis la page merci
    ev({ created_at: recent, session_id: 'l2', type: 'stripe_click', path: '/merci-guide', meta: { cta: 'merci-guide-suite', route: OFFRES.equitable.debrief_lecteur.aller } }),
    // l3 : clic vers l'extrait depuis la page de liens (pas un clic d'achat)
    ev({ created_at: recent, session_id: 'l3', type: 'extract_click', path: '/liens/index.html', meta: { cta: 'liens-extrait' } }),
    // l4 : un ancien clic Gumroad (historique), toujours compte a part
    ev({ session_id: 'l4', path: '/extrait-guide.html' }),
    ev({ session_id: 'l4', type: 'gumroad_click', path: '/extrait-guide.html', meta: { cta: 'btn-red' } }),
  ];
  sales = [];
  ({ data } = await appel(30));
  check('clics vers Stripe = 3', data.totals.stripe_clicks === 3, data.totals.stripe_clicks);
  check('dont 2 vers le guide et 1 vers le debrief', data.totals.stripe_clicks_guide === 2 && data.totals.stripe_clicks_debrief === 1, JSON.stringify([data.totals.stripe_clicks_guide, data.totals.stripe_clicks_debrief]));
  check('l ancien clic Gumroad reste compte a part', data.totals.gumroad_clicks === 1 && data.totals.clics_achat === 4, data.totals.clics_achat);
  check('entonnoir : « Clics vers Stripe (guide) » = 2 Stripe + 1 Gumroad', data.funnel[3].etape === 'Clics vers Stripe (guide)' && data.funnel[3].valeur === 3, JSON.stringify(data.funnel[3]));
  check('taux de clic = cliqueurs uniques / visiteurs (3 sur 4 = 75%)', data.totals.ctr === 75, data.totals.ctr);
  check('courbe : clics Stripe et clics achat par jour (Gumroad la veille)', data.by_day.some(j => j.stripe_clicks === 3 && j.clics_achat === 3) && data.by_day.some(j => j.gumroad_clicks === 1 && j.clics_achat === 1), JSON.stringify(data.by_day.filter(j => j.clics_achat)));
  check('deltas 24h : clics Stripe et clics bio', data.deltas24h.stripe_clicks === 3 && data.deltas24h.bio_clicks === 3, JSON.stringify(data.deltas24h));
  const li = data.liens || {};
  check('page de liens : 3 visiteurs, 3 clics, 2 cliqueurs', li.visiteurs === 3 && li.clics === 3 && li.cliqueurs === 2, JSON.stringify(li));
  check('taux de clic de la page de liens = 66,7%', li.taux_clic === 66.7, li.taux_clic);
  const bGuide = (li.par_bouton || []).find(b => b.bouton === 'guide');
  check('bouton guide : 2 clics, 2 visiteurs, nomme, en position 1', bGuide && bGuide.clics === 2 && bGuide.visiteurs === 2 && bGuide.label === 'Le guide' && bGuide.position === 1, JSON.stringify(bGuide));
  check('boutons dans l ordre de la page', (li.par_bouton || []).map(b => b.bouton).join(',') === 'guide,onboard', JSON.stringify(li.par_bouton));
  const pInsta = (li.par_plateforme || []).find(p => p.plateforme === 'instagram');
  check('instagram : 1 visiteur, 2 clics, 100% de cliqueurs', pInsta && pInsta.visiteurs === 1 && pInsta.clics === 2 && pInsta.taux_clic === 100, JSON.stringify(pInsta));
  check('sans UTM : plateforme « direct »', (li.par_plateforme || []).some(p => p.plateforme === 'direct' && p.visiteurs === 1), JSON.stringify(li.par_plateforme));
  const pageLiens = data.by_page.find(p => p.nom === 'Page de liens (bio)');
  check('les 3 ecritures de /liens sont une seule page nommee', pageLiens && pageLiens.pageviews === 3 && pageLiens.path === '/liens', JSON.stringify(data.by_page));
  check('/guide/ est nomme et sans barre finale', data.by_page.some(p => p.path === '/guide' && p.nom === 'Page de vente du guide'), JSON.stringify(data.by_page));
  const ctaHero = data.by_cta.find(c => c.cta === 'Bouton haut de page (guide)');
  check('boutons Stripe nommes avec leur porte', ctaHero && ctaHero.stripe === 1 && ctaHero.total === 1, JSON.stringify(data.by_cta));
  check('porte du prix lecteur nommee', data.by_cta.some(c => c.cta === 'Merci guide, débrief au prix lecteur (débrief, prix lecteur)'), JSON.stringify(data.by_cta));
  const ctaExtrait = data.by_cta.find(c => c.cta === "Page de liens, lien de l'extrait");
  check('clic extrait de /liens : nomme, compte en extrait, jamais en achat', ctaExtrait && ctaExtrait.extract === 1 && ctaExtrait.stripe === 0 && data.totals.extract_clicks === 1 && data.totals.stripe_clicks === 3, JSON.stringify(ctaExtrait));
  check('aucun nom de bouton V4 brut (Stripe ou extrait)', data.by_cta.filter(c => c.stripe || c.extract).every(c => !/^[a-z-]+$/.test(c.cta)), JSON.stringify(data.by_cta.map(c => c.cta)));
  const campBio = data.by_campaign.find(c => c.campagne === 'instagram · bio · guide');
  check('campagne bio : clics vers l achat comptes', campBio && campBio.clics_achat === 1, JSON.stringify(data.by_campaign));
  check('conversion par source lit les clics Stripe et Gumroad', data.conv_by_source.some(s => s.source === 'direct' && s.clics_achat === 3 && s.rate === 75), JSON.stringify(data.conv_by_source));
  check('cle Stripe absente : dite en clair, pas un zero muet', data.stripe && data.stripe.cle_absente === true && /STRIPE_READ_KEY/.test(data.stripe.detail || ''), JSON.stringify(data.stripe));
  check('sans cle : les ventes Stripe sont a zero mais Gumroad reste lu', data.totals.ventes_guide_stripe === 0 && data.remboursements && data.remboursements.total === 0, JSON.stringify(data.remboursements));

  section('ventes Stripe : guide et debrief separes par plink_, remboursements');
  process.env.STRIPE_READ_KEY = 'rk_test_lecture';
  const pl = (o) => o.stripe.plink;
  const ligneGuide = { object: 'list', data: [{ description: 'Comprendre comment rouler plus vite (PDF)', amount_total: 1699, quantity: 1 }] };
  const secondes = (dAgo) => Math.floor((Date.now() - dAgo * DAY) / 1000);
  events = [ev({ session_id: 'g1', path: '/guide' })];
  sales = [
    { created_at: iso(1), price_cents: 1699, quantity: 1, currency: 'EUR', product_name: 'Guide' },
    { created_at: iso(2), price_cents: 1699, quantity: 1, currency: 'EUR', product_name: 'Guide', is_refund: true },
  ];
  stripe = { status: 200, sessions: [
    sessionStripe({ payment_link: pl(OFFRES.guide), amount_total: 1699, line_items: ligneGuide }),
    sessionStripe({ payment_link: pl(OFFRES.guide), amount_total: 1699, line_items: ligneGuide, created: secondes(3) }),
    sessionStripe({ payment_link: pl(OFFRES.equitable.guide_lecteur), amount_total: 999, line_items: ligneGuide }),
    sessionStripe({ payment_link: pl(OFFRES.guide), amount_total: 1699, line_items: ligneGuide,
      payment_intent: { id: 'pi_r', latest_charge: { id: 'ch_r', refunded: true, amount_refunded: 1699 } } }),
    sessionStripe({ payment_link: pl(OFFRES.debrief) }),
    sessionStripe({ payment_link: pl(OFFRES.equitable.debrief_lecteur), amount_total: 2299 }),
    // Lien inconnu : le panier decide. Un guide cree a la main dans Stripe reste un guide.
    sessionStripe({ payment_link: 'plink_inconnu', amount_total: 1699, line_items: ligneGuide }),
    // Produit inconnu : ni guide ni debrief, jamais compte.
    sessionStripe({ payment_link: 'plink_inconnu', amount_total: 2500, line_items: { object: 'list', data: [{ description: 'Casquette', amount_total: 2500, quantity: 1 }] } }),
    // Periode precedente : sert a la comparaison, pas aux totaux.
    sessionStripe({ payment_link: pl(OFFRES.guide), amount_total: 1699, line_items: ligneGuide, created: secondes(45) }),
  ] };
  ({ data } = await appel(30));
  check('statut Stripe ok, cle presente', data.stripe.statut === 'ok' && data.stripe.cle_absente === false, JSON.stringify(data.stripe));
  check('guide Stripe : 4 ventes payees (le rembourse sort, le lien inconnu entre)', data.stripe.guide.ventes === 4, data.stripe.guide.ventes);
  check('dont 1 au prix lecteur', data.stripe.guide.ventes_lecteur === 1, data.stripe.guide.ventes_lecteur);
  check('debrief Stripe : 2 ventes, dont 1 au prix lecteur', data.stripe.debrief.ventes === 2 && data.stripe.debrief.ventes_lecteur === 1 && data.debrief.ventes === 2, JSON.stringify(data.stripe.debrief));
  check('ventes du guide = Gumroad + Stripe (1 + 4)', data.totals.ventes === 5 && data.totals.ventes_guide_stripe === 4 && data.totals.ventes_guide_gumroad === 1, JSON.stringify([data.totals.ventes, data.totals.ventes_guide_stripe, data.totals.ventes_guide_gumroad]));
  check('CA du guide = Gumroad + 3 guides + 1 prix lecteur', data.totals.revenu_cents === 1699 * 4 + 999, data.totals.revenu_cents);
  check('CA debrief = plein tarif + prix lecteur', data.debrief.revenu_cents === 2999 + 2299, data.debrief.revenu_cents);
  check('CA total = guide + debrief', data.totals.revenu_total_cents === 1699 * 4 + 999 + 2999 + 2299, data.totals.revenu_total_cents);
  check('la casquette n est nulle part', data.totals.revenu_total_cents < 1699 * 4 + 999 + 2999 + 2299 + 2500);
  check('periode precedente : la vente Stripe d il y a 45 jours', data.previous.ventes === 1, data.previous.ventes);
  const rb = data.remboursements || {};
  check('remboursements : 1 Stripe + 1 Gumroad, tous sur le guide', rb.total === 2 && rb.guide === 2 && rb.debrief === 0 && rb.gumroad === 1, JSON.stringify(rb));
  check('taux de remboursement = 2 sur (7 payees + 2) = 22,2%', rb.ventes_payees === 7 && rb.taux === 22.2, JSON.stringify(rb));
  check('derniere vente du guide = la plus recente entre Gumroad et Stripe', data.dates.derniere_vente === iso(1).slice(0, 10), data.dates.derniere_vente);
  check('premiere vente du guide remonte a la session Stripe la plus ancienne', data.dates.premiere_vente === iso(45).slice(0, 10), data.dates.premiere_vente);
  check('entonnoir : derniere etape = ventes du guide (5)', data.funnel[4].etape === 'Ventes du guide' && data.funnel[4].valeur === 5, JSON.stringify(data.funnel[4]));
  const jourVentes = data.by_day.find(j => j.date === iso(1).slice(0, 10));
  check('courbe : 6 ventes hier (3 guides Stripe, 2 debriefs, 1 Gumroad)', jourVentes && jourVentes.ventes === 6, JSON.stringify(jourVentes));
  check('aucune donnee client renvoyee', !JSON.stringify(data).includes('pilote@example.com') && !JSON.stringify(data).includes('Jean Pilote'));
  const urlVentes = urlsAppelees.filter(u => u.includes('/sales')).pop() || '';
  check('les remboursements Gumroad sont lus (plus de filtre is_refund)', /is_test=eq\.false/.test(urlVentes) && !/is_refund=eq\.false/.test(urlVentes), urlVentes);
  delete process.env.STRIPE_READ_KEY;
  stripe = { status: 200, sessions: [] };

  section('robustesse');
  events = []; sales = [];
  ({ data } = await appel(7));
  check('aucune donnee -> tunnel du debrief a zero', data.debrief && data.debrief.funnel.every(s => s.valeur === 0));
  check('aucune donnee -> entonnoir a zero sans planter', data.funnel.every(s => s.valeur === 0));
  check('aucune donnee -> pas de division par zero', data.funnel.every(s => s.taux === null || s.taux === 0));
  check('aucune donnee -> dates nulles', data.dates.premiere_vente === null && data.dates.meilleur_jour === null);
  check('aucune donnee -> campagnes vides', data.by_campaign.length === 0);
  check('aucune donnee -> page de liens a zero sans planter', data.liens && data.liens.visiteurs === 0 && data.liens.taux_clic === 0 && data.liens.par_bouton.length === 0);
  check('aucune donnee -> taux de remboursement a zero', data.remboursements && data.remboursements.taux === 0);

  console.log(`\n${pass} tests OK, ${fail} echecs`);
  process.exit(fail ? 1 : 0);
})();
