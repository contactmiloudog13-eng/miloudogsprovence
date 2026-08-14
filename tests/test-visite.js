/* Reproduit le parcours signale : 1 chien + 3 chats, tous en VISITE A DOMICILE.
 * Le formulaire reclamait une date et une heure d'arrivee de pension, alors
 * que ces champs ne sont pas affiches dans ce cas. Reservation impossible. */
const { chromium } = require('playwright-core');
const BASE = 'http://localhost:8899';
let ok = 0, ko = 0;
const T = (n, c, d) => { c ? (ok++, console.log('  ✅ ' + n + (d ? '  → ' + d : ''))) : (ko++, console.log('  ❌ ' + n + (d ? '  → ' + d : ''))); };

async function ouvrir(b) {
  const ctx = await b.newContext({ viewport: { width: 412, height: 823 }, isMobile: true });
  const p = await ctx.newPage();
  await p.route('**/firebasejs/**', r => r.fulfill({ status: 200, contentType: 'application/javascript', body: 'window.firebase=undefined;' }));
  await p.goto(BASE + '/reservation.html', { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(1200);
  return { ctx, p };
}

async function etape1(p) {
  await p.evaluate(() => {
    document.getElementById('prenom').value = 'Test';
    document.getElementById('tel').value = '0600000000';
    document.getElementById('chien').value = 'Rex';
    goStep(2);
  });
  await p.waitForTimeout(300);
}

(async () => {
  const b = await chromium.launch({ executablePath: (process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome') });

  // ── Le cas signale ────────────────────────────────────────────────────────
  console.log('\n▌ 1 chien + 3 chats, tout en visite à domicile');
  let { ctx, p } = await ouvrir(b);
  await etape1(p);

  await p.evaluate(() => {
    setNbChiens(1);
    toggleAnimal('chat', true); bumpAnimal('chat', +1); bumpAnimal('chat', +1);   // 3 chats
    const v = [...document.querySelectorAll('.service-tag')].find(t => t.dataset.visite === '1');
    if (!v.classList.contains('active')) toggleTag(v);
  });
  await p.waitForTimeout(400);

  const etat = await p.evaluate(() => ({
    chiens: mdpNbChiens(), chats: window.__animaux.chat || 0,
    visite: !!(window.__visite && window.__visite.active),
    services: [...document.querySelectorAll('.service-tag.active')].map(t => t.dataset.kind),
    sejourVisible: (() => { const c = document.getElementById('sejour-card'); return !!c && c.style.display !== 'none'; })(),
  }));
  T('animaux et service bien pris en compte', etat.chiens === 1 && etat.chats === 3 && etat.visite,
    etat.chiens + ' chien, ' + etat.chats + ' chats, services : ' + etat.services.join('+'));
  T('le bloc « dates du séjour » reste masqué', !etat.sejourVisible,
    etat.sejourVisible ? 'affiché à tort' : 'masqué, comme attendu');

  // On remplit la visite comme sur la capture
  await p.evaluate(() => {
    document.getElementById('visite-start').value = '2026-09-15';
    document.getElementById('visite-end').value = '2026-09-20';
    visiteSetDur(60);
    document.getElementById('visite-freq').value = '1';
    document.getElementById('visite-unit').value = 'jour';
    document.getElementById('visite-addr').value = '341 Chemin du Cèdre 13140 Miramas';
    window.__visite.km = 0; window.__visite.city = 'Miramas'; window.__visite.postcode = '13140';
    window.__visite.travelPerDay = 0; window.__visite.travelTotal = 0;
    if (typeof visiteRecalc === 'function') visiteRecalc();
    if (typeof calcPrice === 'function') calcPrice();
  });
  await p.waitForTimeout(400);

  const passe = await p.evaluate(() => _validateStep2());
  T('« Étape suivante » n\'est plus bloquée', passe === true, passe ? 'validation acceptée' : 'ENCORE BLOQUÉ');

  const msg = await p.evaluate(() => {
    const m = document.getElementById('error-msg');
    return { txt: (m.textContent || '').trim(), visible: m.offsetParent !== null };
  });
  T('aucun message d\'erreur affiché', !msg.visible, msg.visible ? msg.txt : 'aucun');
  await ctx.close();

  // ── Cas voisin : visite seule SANS chien (ne doit pas avoir regresse) ─────
  console.log('\n▌ 3 chats seuls, aucun chien');
  ({ ctx, p } = await ouvrir(b));
  await etape1(p);
  await p.evaluate(() => {
    setNbChiens(0);
    toggleAnimal('chat', true); bumpAnimal('chat', +1); bumpAnimal('chat', +1);
    const v = [...document.querySelectorAll('.service-tag')].find(t => t.dataset.visite === '1');
    if (!v.classList.contains('active')) toggleTag(v);
    document.getElementById('visite-start').value = '2026-09-15';
    document.getElementById('visite-end').value = '2026-09-20';
    document.getElementById('visite-addr').value = '341 Chemin du Cèdre 13140 Miramas';
    window.__visite.km = 0; window.__visite.travelPerDay = 0; window.__visite.travelTotal = 0;
    if (typeof calcPrice === 'function') calcPrice();
  });
  await p.waitForTimeout(400);
  T('validation acceptée', await p.evaluate(() => _validateStep2()) === true);
  await ctx.close();

  // ── Cas voisin : chien en PENSION + chats visités (validation complète) ──
  console.log('\n▌ 1 chien en pension + 3 chats visités — le séjour doit rester obligatoire');
  ({ ctx, p } = await ouvrir(b));
  await etape1(p);
  await p.evaluate(() => {
    setNbChiens(1);
    toggleAnimal('chat', true); bumpAnimal('chat', +1); bumpAnimal('chat', +1);
    const n = [...document.querySelectorAll('.service-tag')].find(t => t.dataset.unit === 'nuit');
    if (!n.classList.contains('active')) toggleTag(n);
  });
  await p.waitForTimeout(400);
  const sansDates = await p.evaluate(() => _validateStep2());
  T('refuse tant que les dates de pension manquent', sansDates === false,
    sansDates ? 'accepté à tort' : 'refusé, comme attendu');

  await p.evaluate(() => {
    document.getElementById('date-debut').value = '2026-09-15';
    document.getElementById('date-fin').value = '2026-09-20';
    document.getElementById('heure-debut-h').value = '09';
    document.getElementById('heure-debut-m').value = '00';
    document.getElementById('heure-fin-h').value = '10';
    document.getElementById('heure-fin-m').value = '00';
    const c = document.getElementById('test-deja');   // « mon chien a déjà fait le test »
    if (c) { c.checked = true; testDejaFait(true); }
    if (typeof calcPrice === 'function') calcPrice();
  });
  await p.waitForTimeout(400);
  T('refuse encore : la visite des chats n\'est pas renseignée',
    await p.evaluate(() => _validateStep2()) === false,
    await p.evaluate(() => (document.getElementById('error-msg').textContent || '').trim()));

  await p.evaluate(() => {
    document.getElementById('visite-start').value = '2026-09-15';
    document.getElementById('visite-end').value = '2026-09-20';
    document.getElementById('visite-addr').value = '341 Chemin du Cèdre 13140 Miramas';
    window.__visite.km = 0; window.__visite.travelPerDay = 0; window.__visite.travelTotal = 0;
    if (typeof calcPrice === 'function') calcPrice();
  });
  await p.waitForTimeout(400);
  T('accepte une fois séjour ET visite renseignés', await p.evaluate(() => _validateStep2()) === true);
  await ctx.close();

  // ── Le trou signale : reservation acceptee sans adresse de visite ────────
  console.log('\n▌ Garde-fou : chien en pension + chats, sans aucune info de visite');
  ({ ctx, p } = await ouvrir(b));
  await etape1(p);
  await p.evaluate(() => {
    setNbChiens(1); toggleAnimal('chat', true); bumpAnimal('chat', +1); bumpAnimal('chat', +1);
    const n = [...document.querySelectorAll('.service-tag')].find(t => t.dataset.unit === 'nuit');
    if (!n.classList.contains('active')) toggleTag(n);
    document.getElementById('date-debut').value = '2026-09-15';
    document.getElementById('date-fin').value = '2026-09-20';
    document.getElementById('heure-debut-h').value = '09';
    document.getElementById('heure-debut-m').value = '00';
    document.getElementById('heure-fin-h').value = '10';
    document.getElementById('heure-fin-m').value = '00';
    const c = document.getElementById('test-deja'); if (c) { c.checked = true; testDejaFait(true); }
    if (typeof calcPrice === 'function') calcPrice();
  });
  await p.waitForTimeout(400);
  T('la réservation est refusée (adresse des chats manquante)',
    await p.evaluate(() => _validateStep2()) === false,
    await p.evaluate(() => (document.getElementById('error-msg').textContent || '').trim()));
  await ctx.close();

  await b.close();
  console.log('\n  ' + ok + ' réussi(s), ' + ko + ' échec(s)');
  process.exit(ko ? 1 : 0);
})();
