const { chromium, devices } = require('playwright-core');
const BASE = 'http://127.0.0.1:8899';
const EXE = (process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome');

let pass = 0, fail = 0;
function check(nom, ok, detail) {
  if (ok) { pass++; console.log('  ✅ ' + nom + (detail ? '  → ' + detail : '')); }
  else { fail++; console.log('  ❌ ' + nom + (detail ? '  → ' + detail : '')); }
}

(async () => {
  const browser = await chromium.launch({ executablePath: EXE, args: ['--no-sandbox'] });

  // Contexte tactile : hover:none + pointer:coarse, comme un vrai téléphone
  const ctx = await browser.newContext({
    viewport: { width: 414, height: 896 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
  });
  const page = await ctx.newPage();

  console.log('\n▌ Mobile (tactile) — effet 3D');
  await page.goto(BASE + '/reservation.html', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);

  check('le navigateur est bien vu comme tactile',
    await page.evaluate(() => matchMedia('(hover:none), (pointer:coarse)').matches));

  // Remplit et va à l'étape 2
  await page.evaluate(() => {
    document.getElementById('prenom').value = 'Marie';
    document.getElementById('tel').value = '0612345678';
    window.__acctOk = true;
    document.getElementById('chien').value = 'Nala';
    goStep(2);
    const t = [...document.querySelectorAll('.service-tag')].find((x) => x.dataset.unit === 'nuit');
    if (!t.classList.contains('active')) toggleTag(t);
    const m = document.getElementById('acct-modal'); if (m) m.remove();
  });
  await page.waitForTimeout(400);

  // Simule un appui/déplacement du doigt sur le formulaire : c'est ce qui
  // déclenchait le mousemove et laissait le bloc penché.
  const form = await page.$('.resa-form');
  if (form) {
    const b = await form.boundingBox();
    await page.mouse.move(b.x + b.width * 0.3, b.y + b.height * 0.3);
    await page.mouse.move(b.x + b.width * 0.7, b.y + b.height * 0.6);
    await page.waitForTimeout(300);
  }
  const t3d = await page.evaluate(() => {
    const f = document.querySelector('.resa-form');
    return f ? (f.style.transform || '(aucune)') : '(pas de .resa-form)';
  });
  check('le formulaire ne bascule plus en 3D au toucher', !/rotate|perspective/.test(t3d), 'transform = ' + t3d);

  const cards3d = await page.evaluate(() => {
    let touchees = 0;
    document.querySelectorAll('.avis-card,.service-card,.t-card').forEach((c) => {
      if (/rotate|perspective/.test(c.style.transform || '')) touchees++;
    });
    return touchees;
  });
  check('aucune carte inclinée sur mobile', cards3d === 0, cards3d + ' carte(s) inclinée(s)');

  console.log('\n▌ Mobile — débordement du champ date');
  await page.evaluate(() => {
    const d = document.getElementById('date-debut');
    d.value = '2026-12-23'; d.dispatchEvent(new Event('input')); d.dispatchEvent(new Event('change'));
    const f = document.getElementById('date-fin');
    if (f) { f.value = '2027-01-03'; f.dispatchEvent(new Event('input')); f.dispatchEvent(new Event('change')); }
  });
  await page.waitForTimeout(500);

  const debord = await page.evaluate(() => {
    const out = [];
    ['date-debut', 'date-fin'].forEach((id) => {
      const el = document.getElementById(id); if (!el || el.offsetParent === null) return;
      const par = el.parentElement;
      const r = el.getBoundingClientRect(), rp = par.getBoundingClientRect();
      out.push({ id, depasseDroite: +(r.right - rp.right).toFixed(1), largeur: +r.width.toFixed(1), conteneur: +rp.width.toFixed(1) });
    });
    return out;
  });
  for (const d of debord) {
    check('#' + d.id + ' ne déborde plus de son conteneur', d.depasseDroite <= 1,
      'dépassement ' + d.depasseDroite + 'px (champ ' + d.largeur + 'px / conteneur ' + d.conteneur + 'px)');
  }

  const scrollH = await page.evaluate(() => ({ doc: document.documentElement.scrollWidth, vue: window.innerWidth }));
  check('la page ne défile pas horizontalement', scrollH.doc <= scrollH.vue + 1,
    scrollH.doc + 'px pour ' + scrollH.vue + 'px de large');

  console.log('\n▌ Mobile — bandeau de Noël');
  const pos = await page.evaluate(() => {
    const b = document.getElementById('fetes-banner');
    if (!b) return null;
    const prev = b.previousElementSibling, next = b.nextElementSibling;
    return {
      visible: b.offsetParent !== null,
      avant: prev ? (prev.id || prev.className) : '(rien)',
      apres: next ? (next.id || next.className) : '(rien)',
      texte: b.innerText.replace(/\n+/g, ' | ')
    };
  });
  check('bandeau visible', pos && pos.visible);
  check('placé APRÈS le bloc de dates complet', pos && pos.avant === 'row-date-fin', 'précédé de : ' + (pos && pos.avant));
  check('« 1ᵉʳ janvier » correctement écrit', pos && /1ᵉʳ janvier/.test(pos.texte));
  if (pos) console.log('     texte : ' + pos.texte);

  try { await page.screenshot({ path: 'mobile-fix.png', fullPage: false }); } catch (e) { console.log('  (capture ignorée)'); }

  // ── Bureau : l'effet 3D doit toujours fonctionner ──
  console.log('\n▌ Bureau (souris) — l\'effet 3D est conservé');
  const ctxD = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const pd = await ctxD.newPage();
  await pd.goto(BASE + '/reservation.html', { waitUntil: 'domcontentloaded' });
  await pd.waitForTimeout(1200);
  check('le navigateur est vu comme pointeur précis',
    await pd.evaluate(() => matchMedia('(hover:hover) and (pointer:fine)').matches));
  const formD = await pd.$('.resa-form');
  if (formD) {
    const b = await formD.boundingBox();
    await pd.mouse.move(b.x + b.width * 0.4, b.y + 60);
    await pd.mouse.move(b.x + b.width * 0.6, b.y + 120);
    await pd.waitForTimeout(250);
  }
  const t3dD = await pd.evaluate(() => (document.querySelector('.resa-form') || {}).style?.transform || '(aucune)');
  check('le formulaire bascule bien en 3D à la souris', /perspective/.test(t3dD), t3dD.slice(0, 60));

  await browser.close();
  console.log('\n══════════════════════════════════');
  console.log('  ' + pass + ' test(s) réussi(s), ' + fail + ' échec(s)');
  console.log('══════════════════════════════════');
  process.exit(fail ? 1 : 0);
})();
