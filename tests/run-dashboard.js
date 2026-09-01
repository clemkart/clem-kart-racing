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

// De vraies instances de Response : dashboard-data.js verifie `instanceof Response`
// avant d'exploiter les ventes (il degrade proprement si la table n'existe pas encore).
global.fetch = async (url) =>
  new Response(JSON.stringify(url.includes('/sales') ? sales : events), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });

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

  section('robustesse');
  events = []; sales = [];
  ({ data } = await appel(7));
  check('aucune donnee -> entonnoir a zero sans planter', data.funnel.every(s => s.valeur === 0));
  check('aucune donnee -> pas de division par zero', data.funnel.every(s => s.taux === null || s.taux === 0));
  check('aucune donnee -> dates nulles', data.dates.premiere_vente === null && data.dates.meilleur_jour === null);
  check('aucune donnee -> campagnes vides', data.by_campaign.length === 0);

  console.log(`\n${pass} tests OK, ${fail} echecs`);
  process.exit(fail ? 1 : 0);
})();
