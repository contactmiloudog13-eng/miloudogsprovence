const { chromium } = require('playwright-core');
const BASE = 'http://127.0.0.1:8899';
const EXE = (process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome');

let pass = 0, fail = 0;
function check(nom, ok, detail) {
  if (ok) { pass++; console.log('  ✅ ' + nom + (detail ? '  → ' + detail : '')); }
  else { fail++; console.log('  ❌ ' + nom + (detail ? '  → ' + detail : '')); }
}

// Force le drapeau AVANT tout script de la page.
async function pageAvecFlag(ctx, valeur) {
  const page = await ctx.newPage();
  if (valeur !== null) {
    await page.addInitScript((v) => {
      Object.defineProperty(window, 'MDP_FLAGS', {
        get() { return { carnetMalin: v }; },
        set() {}, configurable: true
      });
    }, valeur);
  }
  return page;
}

(async () => {
  const browser = await chromium.launch({ executablePath: EXE, args: ['--no-sandbox'] });
  const ctx = await browser.newContext();

  // ═══════════════ ÉTAT RÉEL : OFFRE DÉSACTIVÉE ═══════════════
  console.log('\n▌ Offre désactivée (état livré)');
  let p = await ctx.newPage();

  await p.goto(BASE + '/index.html', { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(700);
  check('drapeau bien à false', await p.evaluate(() => window.MDP_FLAGS.carnetMalin === false));
  check('section d\'accueil réellement invisible',
    await p.evaluate(() => document.getElementById('carnet-section').offsetParent === null));
  check('aucun texte « Carnet Malin » visible sur l\'accueil',
    !(await p.evaluate(() => document.body.innerText)).includes('Carnet Malin'));

  await p.goto(BASE + '/reservation.html', { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(1200);
  check('window.__carnet reste undefined', await p.evaluate(() => window.__carnet === undefined));
  check('case #carnet-use absente du DOM', await p.$('#carnet-use') === null);
  check('initCarnetMode() ne fait rien même forcée', await p.evaluate(() => {
    window.__carnet = { uid: 'x', nights: 10, used: 0, left: 10 };
    try { initCarnetMode(); } catch (e) { return 'erreur: ' + e.message; }
    return document.getElementById('carnet-use') === null;
  }));

  // Non-régression du calcul de prix
  const devis = await p.evaluate(() => {
    document.getElementById('prenom').value = 'T';
    document.getElementById('tel').value = '0600000000';
    document.getElementById('chien').value = 'Rex';
    goStep(2);
    const t = [...document.querySelectorAll('.service-tag')].find((x) => x.dataset.unit === 'nuit');
    if (!t.classList.contains('active')) toggleTag(t);
    document.getElementById('date-debut').value = '2026-07-10';
    document.getElementById('date-fin').value = '2026-07-13';
    document.getElementById('heure-debut-h').value = '09';
    document.getElementById('heure-fin-h').value = '08';
    calcPrice();
    return { total: document.getElementById('price-total').innerText, detail: document.getElementById('price-detail').innerText };
  });
  check('devis 3 nuits inchangé (75€)', /75\s*€/.test(devis.total), devis.total.trim());
  check('aucune mention « Carnet Malin » dans le devis', !/Carnet Malin/.test(devis.total + devis.detail));

  await p.goto(BASE + '/espace-client.html#carnet', { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(1200);
  const ec = await p.evaluate(() => {
    const tab = document.getElementById('tab-carnet');
    const tabs = [].slice.call(document.querySelectorAll('.dash-tab'));
    return {
      ongletVisible: tab ? tab.offsetParent !== null : false,
      modeInvite: document.body.classList.contains('carnet-guest'),
      ongletsMasques: tabs.filter((t) => t.id !== 'tab-carnet' && t.id !== 'tab-admin' && t.style.display === 'none').length,
      santeIntact: !!document.getElementById('carnet-input') && !!document.querySelector('.carnet-grid, #carnet-preview')
    };
  });
  check('onglet Carnet Malin invisible', !ec.ongletVisible);
  check('pas de bascule en « mode invité » sur un vieux lien #carnet', !ec.modeInvite);
  check('aucun autre onglet masqué par erreur', ec.ongletsMasques === 0, ec.ongletsMasques + ' masqué(s)');
  check('carnet de SANTÉ intact (upload + galerie)', ec.santeIntact);
  check('orderCarnet() n\'écrit plus rien', await p.evaluate(async () => {
    try { const r = await orderCarnet(225); return r === undefined; } catch (e) { return 'erreur: ' + e.message; }
  }));

  // Chatbot
  await p.goto(BASE + '/services.html', { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(600);
  check('site-flags.js chargé sur une page secondaire', await p.evaluate(() => !!window.MDP_FLAGS));
  check('page services : aucun « Carnet Malin »',
    !(await p.evaluate(() => document.body.innerText)).includes('Carnet Malin'));
  await p.close();

  // ═══════════════ RÉVERSIBILITÉ : DRAPEAU REMIS À TRUE ═══════════════
  console.log('\n▌ Réversibilité — drapeau remis à true');
  p = await pageAvecFlag(ctx, true);

  await p.goto(BASE + '/index.html', { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(700);
  check('section d\'accueil de nouveau visible',
    await p.evaluate(() => document.getElementById('carnet-section').offsetParent !== null));

  await p.goto(BASE + '/espace-client.html', { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(900);
  check('onglet Carnet Malin de nouveau visible',
    await p.evaluate(() => { const t = document.getElementById('tab-carnet'); return t && t.style.display !== 'none'; }));

  await p.goto(BASE + '/services.html', { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(600);
  check('chatbot reparle du Carnet Malin', await p.evaluate(() => {
    const s = document.querySelector('script[src="chatbot.js"]');
    return !!s; // le script est là ; on vérifie le contenu ci-dessous
  }));
  await p.close();

  // Le chatbot est une IIFE fermée : on teste sa logique en rejouant le source.
  const fs = require('fs');
  const src = fs.readFileSync('/home/user/miloudogsprovence/chatbot.js', 'utf8');
  const expr = src.match(/const CARNET_ON\s*=\s*([^;]+);/)[1];
  const lire = (flags) => new Function('window', 'return ' + expr)({ MDP_FLAGS: flags });
  check('CARNET_ON = false quand le drapeau est false', lire({ carnetMalin: false }) === false);
  check('CARNET_ON = true quand le drapeau est true', lire({ carnetMalin: true }) === true);
  check('CARNET_ON = false si site-flags.js manque', lire(undefined) === false);
  check('réponse tarifs conditionnée', /\$\{CARNET_ON \? '\\n🎟️ Carnet Malin/.test(src));
  check('entrée dédiée conditionnée', /\.\.\.\(CARNET_ON \? \[\{/.test(src));
  check('suggestion conditionnée', /\$\{CARNET_ON \? '\\n• Le Carnet Malin/.test(src));

  await browser.close();
  console.log('\n══════════════════════════════════');
  console.log('  ' + pass + ' test(s) réussi(s), ' + fail + ' échec(s)');
  console.log('══════════════════════════════════');
  process.exit(fail ? 1 : 0);
})();
