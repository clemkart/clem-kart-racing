'use strict';
// Porte /aller/plan-camera (pilote avec caméra) : 302 vers le lien Stripe du moment (lancement ou prix habituel).
const { repondre } = require('../lib/porte-plan');

exports.handler = async (event) => repondre(event, true);
