#!/usr/bin/env node
/* Schemas Supabase : chaque table que les fonctions ecrivent ou lisent est declaree dans
   "site v2/supabase/*.sql", avec la RLS activee. Pour la table retractations, chaque colonne
   ecrite ou filtree par retractation.js existe, et la liste des produits autorises est la meme
   que dans la fonction. Sans ca, la trace et la limite par email s eteignent en silence
   (erreur 400 visible seulement dans les journaux Netlify).
   Usage : node tests/run-schemas.js */
'use strict';

const fs = require('fs');
const path = require('path');

const RACINE = path.resolve(__dirname, '..');
const DOSSIER_SQL = path.join(RACINE, 'site v2', 'supabase');
const DOSSIER_FONCTIONS = path.join(RACINE, 'site v2', 'netlify', 'functions');

let ok = 0;
let ko = 0;
function check(nom, condition, detail) {
  if (condition) { ok++; console.log('  OK   ' + nom); } else { ko++; console.log('  FAIL ' + nom + (detail !== undefined ? ' -> ' + detail : '')); }
}

/* Toutes les declarations SQL, commentaires retires, en minuscules */
const sql = fs.readdirSync(DOSSIER_SQL)
  .filter((f) => f.endsWith('.sql'))
  .map((f) => fs.readFileSync(path.join(DOSSIER_SQL, f), 'utf8'))
  .join('\n')
  .replace(/--[^\n]*/g, '')
  .toLowerCase();

function blocCreation(table) {
  const m = sql.match(new RegExp('create table if not exists public\\.' + table + '\\s*\\(([\\s\\S]*?)\\);'));
  return m ? m[1] : null;
}
function colonneDeclaree(table, colonne) {
  const bloc = blocCreation(table) || '';
  const dansCreation = new RegExp('(^|,)\\s*' + colonne + '\\s+[a-z]', 'm').test(bloc.replace(/\n/g, ','));
  const ajoutee = new RegExp('alter table public\\.' + table + '\\s+add column if not exists ' + colonne + '\\s').test(sql);
  return dansCreation || ajoutee;
}

/* Tables utilisees par les fonctions : REST direct (rest/v1/<table>) ou lib/supabase.js */
const tables = new Set();
for (const f of fs.readdirSync(DOSSIER_FONCTIONS).filter((n) => n.endsWith('.js'))) {
  const code = fs.readFileSync(path.join(DOSSIER_FONCTIONS, f), 'utf8');
  for (const m of code.matchAll(/rest\/v1\/([a-z_]+)/g)) tables.add(m[1]);
  for (const m of code.matchAll(/supabase\.(?:inserer|lire|mettreAJour)\(\s*'([a-z_]+)'/g)) tables.add(m[1]);
}

console.log('\n=== tables utilisees par les fonctions');
check('au moins les tables site_events, sales et retractations sont reperees', ['site_events', 'sales', 'retractations'].every((t) => tables.has(t)), [...tables].join(', '));
for (const t of tables) {
  check(`${t} : declaree dans site v2/supabase/`, blocCreation(t) !== null);
  check(`${t} : RLS activee`, new RegExp('alter table public\\.' + t + ' enable row level security').test(sql));
}

console.log('\n=== retractations : colonnes de retractation.js');
const codeRetractation = fs.readFileSync(path.join(DOSSIER_FONCTIONS, 'retractation.js'), 'utf8');
const insertion = codeRetractation.match(/supabase\.inserer\('retractations',\s*\{([\s\S]*?)\}\);/);
check('retractation.js ecrit bien dans retractations', Boolean(insertion));
const colonnesEcrites = insertion ? [...insertion[1].matchAll(/^\s*([a-z_]+)\s*:/gm)].map((m) => m[1]) : [];
const filtre = codeRetractation.match(/supabase\.lire\('retractations',[\s\S]*?filtres:\s*\{([^}]*)\}/);
const colonnesFiltrees = filtre ? [...filtre[1].matchAll(/([a-z_]+)\s*:/g)].map((m) => m[1]) : [];
check('colonnes ecrites reperees (reference, produit, recu_le, email_empreinte)', ['reference', 'produit', 'recu_le', 'email_empreinte'].every((c) => colonnesEcrites.includes(c)), colonnesEcrites.join(', '));
for (const c of new Set([...colonnesEcrites, ...colonnesFiltrees])) {
  check(`colonne ${c} declaree`, colonneDeclaree('retractations', c));
}
const produitsFonction = (codeRetractation.match(/PRODUITS_RETRACTATION = Object\.freeze\(\{([\s\S]*?)\}\);/) || [, ''])[1]
  .match(/^\s*([a-z_]+)\s*:/gm) || [];
const clesFonction = produitsFonction.map((s) => s.replace(/[\s:]/g, '')).sort();
const contrainte = (blocCreation('retractations') || '').match(/check \(produit in \(([^)]*)\)\)/);
const clesSql = contrainte ? contrainte[1].split(',').map((s) => s.trim().replace(/'/g, '')).sort() : [];
check('produits autorises identiques dans la fonction et dans la table', clesFonction.length > 0 && clesFonction.join(',') === clesSql.join(','), clesFonction.join(',') + ' / ' + clesSql.join(','));
check('index pour la limite par email', /on public\.retractations \(email_empreinte, recu_le desc\)/.test(sql));
check('aucun droit pour anon et authenticated', /revoke all on public\.retractations from anon, authenticated/.test(sql));

console.log(`\n${ok} tests OK, ${ko} echecs`);
process.exit(ko ? 1 : 0);
