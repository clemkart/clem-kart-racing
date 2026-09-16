// Harnais de test de l'agregation du dashboard : Supabase est remplace par un faux
// fetch qui renvoie des evenements et des ventes fabriques. Aucune donnee reelle lue.
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

  section('site 2 : pages nommees, brouillons ignores');
  const s2 = (o) => ev(Object.assign({ meta: { site: 'site2' } }, o));
  events = [
    s2({ session_id: 'h1', path: '/' }),
    s2({ session_id: 'h1', type: 'diag_click', path: '/', meta: { site: 'site2', cta: 'hero' } }),
    s2({ session_id: 'h2', path: '/index.html' }),
    s2({ session_id: 'o1', path: '/onboard/' }),
    ev({ session_id: 'b1', path: '/onboard/', meta: { site: 'site2-brouillon' } }),
    ev({ session_id: 'l1', path: '/', meta: { site: 'local' } }),
    ev({ session_id: 'p1', path: '/' }),
  ];
  ({ data } = await appel(30));
  check('brouillons et apercus locaux exclus des visiteurs', data.totals.visiteurs === 4, data.totals.visiteurs);
  check('evenements de test comptes a part', data.tests_ignores === 2, data.tests_ignores);
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

  section('robustesse');
  events = []; sales = [];
  ({ data } = await appel(7));
  check('aucune donnee -> tunnel du debrief a zero', data.debrief && data.debrief.funnel.every(s => s.valeur === 0));
  check('aucune donnee -> entonnoir a zero sans planter', data.funnel.every(s => s.valeur === 0));
  check('aucune donnee -> pas de division par zero', data.funnel.every(s => s.taux === null || s.taux === 0));
  check('aucune donnee -> dates nulles', data.dates.premiere_vente === null && data.dates.meilleur_jour === null);
  check('aucune donnee -> campagnes vides', data.by_campaign.length === 0);

  console.log(`\n${pass} tests OK, ${fail} echecs`);
  process.exit(fail ? 1 : 0);
})();
