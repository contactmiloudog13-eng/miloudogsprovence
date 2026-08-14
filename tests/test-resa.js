const { chromium } = require('playwright-core');
const BASE = 'http://127.0.0.1:8899';
const EXE = (process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome');

let pass = 0, fail = 0;
function check(n, ok, d) {
  if (ok) { pass++; console.log('  ✅ ' + n + (d ? '  → ' + d : '')); }
  else { fail++; console.log('  ❌ ' + n + (d ? '  → ' + d : '')); }
}

(async () => {
  const browser = await chromium.launch({ executablePath: EXE, args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 1100, height: 950 } });
  const errs = [];
  page.on('pageerror', (e) => { if (!/emailjs|firebase/i.test(e.message)) errs.push(e.message); });

  await page.goto(BASE + '/reservation.html', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);

  // Aller à l'étape 2
  await page.evaluate(() => {
    window.__acctOk = true;
    document.getElementById('prenom').value = 'Marie';
    document.getElementById('tel').value = '0612345678';
    document.getElementById('chien').value = 'Nala';
    goStep(2);
    const m = document.getElementById('acct-modal'); if (m) m.remove();
  });
  await page.waitForTimeout(400);

  console.log('\n▌ Sélecteur d\'animaux');
  check('grille des autres espèces construite',
    await page.evaluate(() => document.querySelectorAll('#autres-animaux .an-card').length) === 8,
    await page.evaluate(() => document.querySelectorAll('#autres-animaux .an-card').length) + ' espèces');
  check('1 chien par défaut', await page.evaluate(() => mdpNbChiens()) === 1);
  check('services chiens visibles', await page.evaluate(() => document.getElementById('svc-chiens').style.display !== 'none'));
  check('Pack Duo absent du DOM', await page.$('[data-pack]') === null);
  check('lien Forfait Évasion retiré de l\'étape 2', await page.$('#ev-resa-places') === null);
  check('Test 24 h présent, Test demi-journée absent',
    await page.evaluate(() => !!document.querySelector('[data-kind="test24"]') && !/Test demi/.test(document.body.innerText)));

  // Aide de calcul
  const devis = (opts) => page.evaluate((o) => {
    if (o.chiens !== undefined) setNbChiens(o.chiens);
    if (o.autres) Object.keys(o.autres).forEach((k) => { toggleAnimal(k, true); for (let i = 1; i < o.autres[k]; i++) bumpAnimal(k, 1); });
    if (o.kind) { const t = document.querySelector('[data-kind="' + o.kind + '"]'); if (!t.classList.contains('active')) t.click(); }
    if (o.d1) { const e = document.getElementById('date-debut'); e.value = o.d1; e.dispatchEvent(new Event('input')); e.dispatchEvent(new Event('change')); }
    if (o.d2) { const e = document.getElementById('date-fin'); e.value = o.d2; e.dispatchEvent(new Event('input')); e.dispatchEvent(new Event('change')); }
    document.getElementById('heure-debut-h').value = '09';
    document.getElementById('heure-fin-h').value = '08';
    if (o.freq) { const f = document.getElementById('visite-freq'); if (f) { f.value = String(o.freq); visiteRecalc(); } }
    if (o.vstart) { const e = document.getElementById('visite-start'); if (e) { e.value = o.vstart; visiteRecalc(); } }
    if (o.vend) { const e = document.getElementById('visite-end'); if (e) { e.value = o.vend; visiteRecalc(); } }
    calcPrice();
    return { total: document.getElementById('price-total').innerText, detail: document.getElementById('price-detail').innerText };
  }, opts);

  const reset = () => page.evaluate(() => {
    Object.keys(window.__animaux).forEach((k) => { if (k !== 'chien') toggleAnimal(k, false); });
    document.querySelectorAll('#autres-animaux input[type=checkbox]').forEach((c) => { c.checked = false; });
    setNbChiens(1);
    document.querySelectorAll('.service-tag.active').forEach((t) => t.click());
  });

  const nb = (s) => parseInt((s.match(/(\d+)\s*€/) || [])[1], 10);

  console.log('\n▌ Prix — parcours du plan');
  await reset();
  let r = await devis({ chiens: 1, kind: 'pension', d1: '2026-09-10', d2: '2026-09-13' });
  check('1 chien · pension · 3 nuits juillet = 75 €', nb(r.total) === 75, r.total.trim());

  await reset();
  r = await devis({ chiens: 1, kind: 'pension', d1: '2026-12-23', d2: '2026-12-26' });
  check('1 chien · pension · 23→26 déc = 100 € (Noël intact)', nb(r.total) === 100, r.total.trim());

  await reset();
  r = await devis({ chiens: 2, kind: 'pension', d1: '2026-09-10', d2: '2026-09-13' });
  check('2 chiens · 3 nuits = 135 € (150 −10 %)', nb(r.total) === 135, r.total.trim());

  await reset();
  r = await devis({ chiens: 1, autres: { chat: 1 }, kind: 'pension', d1: '2026-09-10', d2: '2026-09-13',
    vstart: '2026-09-10', vend: '2026-09-12', freq: 1 });
  check('1 chien pension + 1 chat visité = 100 € (111 −10 %)', nb(r.total) === 100, r.total.trim());
  check('  ↳ le devis détaille bien les deux postes (nuits + passages), avec leurs périodes',
    /\d+ nuits? · du /.test(r.detail) && /passages? \(/.test(r.detail),
    r.detail.replace(/\s+/g, ' ').slice(-90));

  await reset();
  r = await page.evaluate(() => {
    setNbChiens(0);
    toggleAnimal('chat', true);
    toggleAnimal('lapin', true); bumpAnimal('lapin', 1);
    const e1 = document.getElementById('visite-start'), e2 = document.getElementById('visite-end');
    if (e1) { e1.value = '2026-09-10'; } if (e2) { e2.value = '2026-09-10'; }
    visiteRecalc(); calcPrice();
    return { total: document.getElementById('price-total').innerText, detail: document.getElementById('price-detail').innerText,
             svcVisible: document.getElementById('svc-chiens').style.display !== 'none',
             px: mdpPrixAnimal('chat') + mdpPrixAnimal('lapin') * 2 };
  });
  check('aucun chien → services chiens masqués', !r.svcVisible);
  check('1 chat + 2 lapins : passage à 32 €', r.px === 32, r.px + ' €');
  check('  ↳ total remisé −15 % (3 animaux)', nb(r.total) === 27, r.total.trim() + ' (32 −15 % = 27)');

  console.log('\n▌ Test 24 h');
  await reset();
  r = await page.evaluate(() => {
    setNbChiens(1);
    document.querySelector('[data-kind="test24"]').click();
    const d = document.getElementById('date-debut');
    d.value = '2026-09-10'; d.dispatchEvent(new Event('change'));
    document.getElementById('heure-debut-h').value = '09';
    autoDepart(); calcPrice();
    return { fin: document.getElementById('date-fin').value, ro: document.getElementById('date-fin').readOnly,
             total: document.getElementById('price-total').innerText };
  });
  check('date de fin calculée à J+1', r.fin === '2026-09-11', r.fin);
  check('date de fin en lecture seule', r.ro === true);
  check('test 24 h facturé 25 €', nb(r.total) === 25, r.total.trim());

  console.log('\n▌ Options de fin');
  await reset();
  const opt = await page.evaluate(() => {
    setNbChiens(1);
    document.querySelector('[data-kind="pension"]').click();
    const d = document.getElementById('date-debut'); d.value = '2026-09-10'; d.dispatchEvent(new Event('change'));
    const f = document.getElementById('date-fin'); f.value = '2026-09-13'; f.dispatchEvent(new Event('change'));
    document.getElementById('heure-debut-h').value='09'; document.getElementById('heure-fin-h').value='08';
    syncOptions(); calcPrice();
    const box = document.getElementById('options-sejour');
    const ids = [].slice.call(box.children).map((c) => c.id).filter(Boolean);
    return { visible: box.style.display !== 'none', ordre: ids };
  });
  check('bloc d\'options affiché pour une pension', opt.visible);
  check('ordre : balades → transport → toilettage → évasion',
    JSON.stringify(opt.ordre) === JSON.stringify(['balade-card', 'pickup-card', 'toilettage-card', 'evasion-card']),
    opt.ordre.join(' → '));

  const t = await page.evaluate(() => { toggleToilettage(true); return document.getElementById('price-total').innerText; });
  check('toilettage ajoute 30 €', nb(t) === 105, t.trim() + ' (75 + 30)');
  await page.evaluate(() => toggleToilettage(false));

  console.log('\n▌ Devis au format de la facture (MDP-2026-0024)');
  await reset();
  const fac = await page.evaluate(() => {
    setNbChiens(1);
    document.querySelector('[data-kind="pension"]').click();
    const d = document.getElementById('date-debut'); d.value = '2027-08-19'; d.dispatchEvent(new Event('change'));
    const f = document.getElementById('date-fin'); f.value = '2027-08-26'; f.dispatchEvent(new Event('change'));
    document.getElementById('heure-debut-h').value = '10'; document.getElementById('heure-debut-m').value = '00';
    document.getElementById('heure-fin-h').value = '10'; document.getElementById('heure-fin-m').value = '00';
    calcPrice();
    return { detail: document.getElementById('price-detail').innerText.replace(/\n+/g, ' | '),
             total: document.getElementById('price-total').innerText.replace(/\n+/g, ' '),
             admin: (window.__priceLines || []).join('<br>') };
  });
  const plat = fac.detail.replace(/[|\s]+/g, ' ');
  check('ligne nuits identique à la facture', /7 nuits · du 19\/08 au 25\/08 ?25€ × 7 = 175€/.test(plat), '7 nuits · du 19/08 au 25/08 → 25€ × 7 = 175€');
  check('ligne demi-journée départ identique', /½ journée départ · 26\/08 ?10€ = 10€/.test(plat));
  check('récapitulatif Arrivée / Départ présent', /Arrivée ?19\/08\/2027 à 10:00/.test(plat) && /Départ ?26\/08\/2027 à 10:00/.test(plat));
  check('total à régler = 185 €', /185 €/.test(fac.total) && /r[ée]gler/i.test(fac.total), fac.total.replace(/\s+/g,' ').trim());
  check('chaîne admin toujours au format « libellé | montant »', /7 nuits.*—.*175€/.test(fac.admin));

  console.log('\n▌ Sous-total et remise en euros');
  await reset();
  const rem = await page.evaluate(() => {
    setNbChiens(2);
    document.querySelector('[data-kind="pension"]').click();
    const d = document.getElementById('date-debut'); d.value = '2026-09-10'; d.dispatchEvent(new Event('change'));
    const f = document.getElementById('date-fin'); f.value = '2026-09-13'; f.dispatchEvent(new Event('change'));
    document.getElementById('heure-debut-h').value = '09'; document.getElementById('heure-fin-h').value = '08';
    calcPrice();
    const txt = document.getElementById('price-detail').innerText;
    return { st: /Sous-total\s*\n?\s*(\d+)€/.exec(txt), rm: /−(\d+)€/.exec(txt),
             total: parseInt((document.getElementById('price-total').innerText.match(/(\d+)\s*€/) || [])[1], 10) };
  });
  check('sous-total affiché avant remise', rem.st && parseInt(rem.st[1], 10) === 150, rem.st ? rem.st[1] + '€' : 'absent');
  check('remise affichée en euros', rem.rm && parseInt(rem.rm[1], 10) === 15, rem.rm ? '−' + rem.rm[1] + '€' : 'absente');
  check('sous-total − remise = total', rem.st && rem.rm && (parseInt(rem.st[1], 10) - parseInt(rem.rm[1], 10)) === rem.total,
    (rem.st ? rem.st[1] : '?') + ' − ' + (rem.rm ? rem.rm[1] : '?') + ' = ' + rem.total);

  console.log('\n▌ Test obligatoire avant la 1re garde');
  await reset();
  const tp = await page.evaluate(() => {
    window.__nouveauClient = true;
    setNbChiens(1);
    document.querySelector('[data-kind="pension"]').click();
    const d = document.getElementById('date-debut'); d.value = '2026-09-10'; d.dispatchEvent(new Event('change'));
    const f = document.getElementById('date-fin'); f.value = '2026-09-13'; f.dispatchEvent(new Event('change'));
    document.getElementById('heure-debut-h').value = '09'; document.getElementById('heure-fin-h').value = '08';
    syncTestPrealable();
    const o = { visible: document.getElementById('test-prealable').style.display !== 'none', bloque: _validateStep2() === false };
    const td = document.getElementById('test-date');
    td.value = '2026-09-12'; majTestPrealable(); o.refuseApres = _validateStep2() === false;
    td.value = '2026-09-08'; majTestPrealable(); o.accepteAvant = _validateStep2() === true;
    o.total = parseInt((document.getElementById('price-total').innerText.match(/(\d+)\s*€/) || [])[1], 10);
    o.ligne = /Test 24 h avant la garde · 08\/09/.test(document.getElementById('price-detail').innerText.replace(/\s+/g, ' '));
    // Client reconnu comme deja venu -> le test disparait tout seul
    window.__nouveauClient = false; syncTestPrealable();
    o.masqueSiConnu = document.getElementById('test-prealable').style.display === 'none';
    o.totalSansTest = parseInt((document.getElementById('price-total').innerText.match(/(\d+)\s*€/) || [])[1], 10);
    o.cles = [_telKey('06 12 34 56 78'), _telKey('06.12.34.56.78'), _telKey('+33612345678'), _telKey('0612345678')];
    return o;
  });
  check('bloc test affiché pour un nouveau client', tp.visible);
  check('envoi bloqué sans date de test', tp.bloque);
  check('date de test APRÈS la garde refusée', tp.refuseApres);
  check('date de test AVANT la garde acceptée', tp.accepteAvant);
  check('test facturé 25 € en plus (75 + 25)', tp.total === 100, tp.total + ' €');
  check('ligne de test datée dans le devis', tp.ligne);
  check('client reconnu → le test disparaît', tp.masqueSiConnu && tp.totalSansTest === 75, tp.totalSansTest + ' €');
  check('le même numéro donne toujours la même clé',
    tp.cles.every((k) => k === '0612345678'), tp.cles.join(' · '));

  console.log('\n▌ Horaires 8h–12h / 13h30–19h');
  const cr = await page.evaluate(() => {
    const m = document.getElementById('heure-debut-m'), h = document.getElementById('heure-debut-h');
    const lire = () => [].slice.call(m.options).filter((o) => o.value).map((o) => o.value + (o.disabled ? '✗' : '✓')).join(' ');
    grise12h();
    const opt12 = [].slice.call(h.options).find((o) => o.value === '12');
    const midi = opt12 && opt12.disabled ? '12 non sélectionnable' : '12 encore sélectionnable';
    h.value = '13'; majCreneaux('heure-debut-h', 'heure-debut-m'); const treize = lire();
    h.value = '10'; majCreneaux('heure-debut-h', 'heure-debut-m'); const dix = lire();
    return { midi, treize, dix };
  });
  check('12h n\'est plus sélectionnable (fermé le midi)', cr.midi === '12 non sélectionnable', cr.midi);
  check('13h : rien avant :30', cr.treize === '00✗ 15✗ 30✓ 45✓', cr.treize);
  check('10h : tous les quarts d\'heure', cr.dix === '00✓ 15✓ 30✓ 45✓', cr.dix);

  console.log('\n▌ Non-régression des données');
  const out = await page.evaluate(() => {
    ['cgv-accept','sante-accept'].forEach((id)=>{const e=document.getElementById(id); if(e) e.checked=true;});
    goStep(3); prepareSubmit();
    return {
      service: document.getElementById('hidden-service').value,
      nbchiens: document.getElementById('hidden-nbchiens').value,
      devis: document.getElementById('hidden-devis').value,
      animaux: JSON.stringify(Object.keys(window.__animaux).map((k) => ({ type: k, qte: window.__animaux[k] })))
    };
  });
  check('hidden-service rempli', /Pension/.test(out.service), out.service);
  check('hidden-nbchiens au format attendu', /^\d+ chiens?$/.test(out.nbchiens), out.nbchiens);
  check('hidden-devis au format « libellé | montant »', /\|/.test(out.devis) && /Total \|/.test(out.devis));
  check('animaux structurés', /"type":"chien"/.test(out.animaux), out.animaux);

  check('aucune erreur JS', errs.length === 0, errs.join(' | ') || 'aucune');

  await browser.close();
  console.log('\n══════════════════════════════════');
  console.log('  ' + pass + ' réussi(s), ' + fail + ' échec(s)');
  console.log('══════════════════════════════════');
  process.exit(fail ? 1 : 0);
})();
