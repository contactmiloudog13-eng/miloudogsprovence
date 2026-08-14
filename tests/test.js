const { chromium } = require('playwright-core');
const BASE = 'http://127.0.0.1:8899';
const EXE = (process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome');

let pass = 0, fail = 0;
function check(nom, ok, detail) {
  if (ok) { pass++; console.log('  ✅ ' + nom + (detail ? '  → ' + detail : '')); }
  else { fail++; console.log('  ❌ ' + nom + (detail ? '  → ' + detail : '')); }
}

(async () => {
  const browser = await chromium.launch({ executablePath: EXE, args: ['--no-sandbox'] });
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const erreursJs = [];
  page.on('pageerror', (e) => erreursJs.push(e.message));

  // ─────────────────────────────────────────────── RÉSERVATION
  console.log('\n▌ reservation.html — devis & acceptation des CGV');
  await page.goto(BASE + '/reservation.html', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1200);

  check('module tarifs-fetes.js chargé', await page.evaluate(() => !!window.MDP_FETES));

  // Remplit l'étape 1
  await page.evaluate(()=>{document.getElementById('prenom').value='Test';});
  await page.evaluate(()=>{document.getElementById('tel').value='0600000000';});
  await page.evaluate(()=>{document.getElementById('chien').value='Rex';});
  await page.evaluate(() => goStep(2));
  await page.waitForTimeout(300);

  // Sélectionne la pension à la nuit
  await page.evaluate(() => {
    const tag = [...document.querySelectorAll('.service-tag')].find((t) => t.dataset.unit === 'nuit');
    if (!tag.classList.contains('active')) toggleTag(tag);
  });

  // Devis pour une période donnée
  async function devis(d1, d2, hDep) {
    return await page.evaluate(([a, b, h]) => {
      document.getElementById('date-debut').value = a;
      document.getElementById('date-fin').value = b;
      document.getElementById('heure-debut-h').value = '09';
      document.getElementById('heure-debut-m').value = '00';
      document.getElementById('heure-fin-h').value = h;
      document.getElementById('heure-fin-m').value = '00';
      calcPrice();
      return {
        detail: document.getElementById('price-detail').innerText,
        total: document.getElementById('price-total').innerText
      };
    }, [d1, d2, hDep]);
  }

  const cas = [
    ['2026-12-18', '2026-12-22', '08', 110, '2 nuits normales + 2 nuits à 30€'],
    ['2026-12-23', '2026-12-26', '08', 100, '30 + 35 + 35'],
    ['2026-12-30', '2027-01-02', '08', 100, '30 + 35 + 35'],
    ['2027-01-03', '2027-01-06', '08', 75, 'après la période → tarif de base'],
    ['2026-09-10', '2026-09-14', '08', 100, 'plein été → aucune majoration'],
    ['2027-02-15', '2027-02-18', '08', 75, 'hors période → tarif de base']
  ];
  for (const [d1, d2, h, attendu, libelle] of cas) {
    const r = await devis(d1, d2, h);
    const n = parseInt((r.total.match(/(\d+)\s*€/) || [])[1], 10);
    check(d1 + ' → ' + d2 + '  (' + libelle + ')', n === attendu, r.total.trim() + ' [attendu ' + attendu + '€]');
  }

  // Mention « uniquement la période » présente dans le devis majoré
  const dNoel = await devis('2026-12-23', '2026-12-26', '08');
  check('devis majoré : mention de la période', /uniquement du 20 décembre 2026 au 2 janvier 2027/.test(dNoel.detail), dNoel.detail.split('\n').pop().slice(0, 90));
  const _plat = dNoel.detail.replace(/\s+/g, ' ');
  check('devis majoré : une ligne par tarif, avec sa période',
    /1 nuit · 23\/12 ?30€ = 30€/.test(_plat) && /2 nuits · du 24\/12 au 25\/12 ?35€ × 2 = 70€/.test(_plat),
    '1 nuit 23/12 à 30€ + 2 nuits 24-25/12 à 35€');

  const dNormal = await devis('2026-09-10', '2026-09-14', '08');
  check('devis hors période : aucune mention de Noël', !/Noël|🎄/.test(dNormal.detail), dNormal.detail.trim().slice(0, 70));

  // Arrivée tardive : suspendue pendant les fêtes, maintenue hors période
  const tardifNoel = await page.evaluate(() => {
    document.getElementById('date-debut').value = '2026-12-24';
    document.getElementById('date-fin').value = '2026-12-25';
    document.getElementById('heure-debut-h').value = '15';
    document.getElementById('heure-fin-h').value = '08';
    calcPrice();
    return document.getElementById('price-total').innerText;
  });
  check('arrivée tardive le 24 déc → 35€ (offre suspendue)', /35\s*€/.test(tardifNoel), tardifNoel.trim());

  const tardifNormal = await page.evaluate(() => {
    document.getElementById('date-debut').value = '2026-09-10';
    document.getElementById('date-fin').value = '2026-09-11';
    document.getElementById('heure-debut-h').value = '15';
    calcPrice();
    return document.getElementById('price-total').innerText;
  });
  check('arrivée tardive hors période → 10€ (offre maintenue)', /10\s*€/.test(tardifNormal), tardifNormal.trim());

  // Bandeau d'information
  const bandeau = await page.evaluate(() => {
    const d = document.getElementById('date-debut');
    d.value = '2026-12-23';
    d.dispatchEvent(new Event('change'));
    const b = document.getElementById('fetes-banner');
    return { visible: b && b.style.display === 'block', txt: b ? b.innerText : '' };
  });
  check('bandeau fêtes visible sur des dates de la période', bandeau.visible);
  check('bandeau : mention « uniquement »', /uniquement du 20 décembre/.test(bandeau.txt));

  const bandeauHors = await page.evaluate(() => {
    const d = document.getElementById('date-debut'), f = document.getElementById('date-fin');
    d.value = '2026-09-10'; f.value = '2026-09-14';
    d.dispatchEvent(new Event('change'));
    const b = document.getElementById('fetes-banner');
    return b.style.display;
  });
  check('bandeau masqué hors période', bandeauHors === 'none', 'display=' + bandeauHors);

  // ── Acceptation des CGV : blocage
  console.log('\n▌ reservation.html — la case CGV est bloquante');
  await page.evaluate(() => goStep(3));
  await page.waitForTimeout(300);

  check('case CGV présente et décochée', await page.isVisible('#cgv-accept') && !(await page.isChecked('#cgv-accept')));
  check('lien vers les CGV', await page.getAttribute('.cgu-row a', 'href') === 'cgv.html');

  const bloque = await page.evaluate(() => prepareSubmit());
  check('envoi refusé si la case n\'est pas cochée', bloque === false);

  const msg = await page.evaluate(() => {
    const m = document.getElementById('error-msg');
    return { txt: m.innerText, visible: m.offsetParent !== null, parent: m.parentElement.id };
  });
  check('message d\'erreur affiché (et non dans un panneau masqué)', msg.visible && msg.parent === 'step-panel-3',
    'parent=' + msg.parent + ', visible=' + msg.visible);
  check('message explicite', /attester|conditions générales/.test(msg.txt), msg.txt.trim());

  // Simule une erreur d'étape 1 d'abord (déplace #error-msg), puis revérifie
  await page.evaluate(() => { document.getElementById('prenom').value = ''; _validateStep1(); });
  const deplace = await page.evaluate(() => document.getElementById('error-msg').parentElement.id);
  await page.evaluate(() => prepareSubmit());
  const rapatrie = await page.evaluate(() => {
    const m = document.getElementById('error-msg');
    return { parent: m.parentElement.id, visible: m.offsetParent !== null };
  });
  check('#error-msg rapatrié dans l\'étape 3 après une erreur d\'étape 1',
    rapatrie.parent === 'step-panel-3' && rapatrie.visible, 'était dans ' + deplace + ' → ' + rapatrie.parent);

  await page.evaluate(() => { document.getElementById('cgv-accept').checked = true; document.getElementById('sante-accept').checked = true; });
  await page.evaluate(() => { document.getElementById('prenom').value = 'Test'; });
  const passe = await page.evaluate(() => prepareSubmit());
  check('envoi autorisé une fois la case cochée', passe === true);

  // ─────────────────────────────────────────────── CGV
  console.log('\n▌ cgv.html — articles');
  await page.goto(BASE + '/cgv.html', { waitUntil: 'domcontentloaded' });
  const arts = await page.$$eval('.ml-box h2', (hs) => hs.map((h) => h.textContent.trim()));
  const nums = arts.map((a) => parseInt(a));
  check('numérotation continue 1 → 14', nums.join(',') === [...Array(14)].map((_, i) => i + 1).join(','), nums.join(','));
  check('article 12 = Propreté', /^12\. Propreté/.test(arts[11]), arts[11]);
  check('article 13 = Dégâts matériels', /^13\. Dégâts/.test(arts[12]), arts[12]);
  check('article 14 = Droit applicable (reste le dernier)', /^14\. Droit applicable/.test(arts[13]), arts[13]);

  const corps = await page.innerText('.ml-box');
  check('date de mise à jour inchangée', /Dernière mise à jour : juin 2026/.test(corps));
  check('aucune date d\'entrée en vigueur sur les nouvelles clauses',
    !/(applicable|en vigueur|à compter du|à partir du)\s+(le\s+)?\d{1,2}\s+\w+\s+20\d\d/i.test(corps));
  check('clause propreté : 24 h + 5 €/jour', /24 heures/.test(corps) && /5 €/.test(corps));
  check('clause dégâts : le propriétaire paie', /son propriétaire le paie/.test(corps));
  check('lien article 8 → article 13 fonctionnel', await page.$('#art-degats') !== null);

  // ─────────────────────────────────────────────── SERVICES
  console.log('\n▌ services.html — encadré tarifs');
  await page.goto(BASE + '/services.html', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(800);
  const enc = await page.innerText('#fetes-info').catch(() => '');
  check('encadré fêtes affiché', enc.length > 50);
  check('grille 30 € / 35 € présente', /30€ \/ nuit/.test(enc) && /35€ \/ nuit/.test(enc));
  check('mention « uniquement » la période', /uniquement du 20 décembre 2026 au 2 janvier 2027/.test(enc));
  check('mention « en dehors de cette période »', /En dehors de cette période/.test(enc));
  check('services non concernés précisés', /garderie/i.test(enc) && /toilettage/i.test(enc));

  // ─────────────────────────────────────────────── FAQ
  console.log('\n▌ faq.html — nouvelles questions');
  await page.goto(BASE + '/faq.html', { waitUntil: 'domcontentloaded' });
  const faq = await page.innerText('body');
  check('question tarifs de fêtes', /Vos tarifs changent-ils pendant les fêtes/.test(faq));
  check('question propreté', /Et si mon chien n'est pas propre/.test(faq));
  check('question dégâts', /Que se passe-t-il si mon chien casse quelque chose/.test(faq));
  const ld = await page.$eval('script[type="application/ld+json"]', (s) => s.textContent);
  // On ne fige plus le nombre de questions (il grandit a chaque ajout) : on
  // verifie que le JSON-LD est valide et qu'il contient bien les questions
  // ajoutees par les evolutions successives.
  check('JSON-LD valide', (() => { try {
      const d = JSON.parse(ld);
      const noms = d.mainEntity.map(q => q.name).join(' | ');
      return d['@type'] === 'FAQPage'
          && d.mainEntity.length >= 11
          && /pas propre/.test(noms) && /casse quelque chose/.test(noms)
          && /Gardez-vous les chats/.test(noms) && /poules, des lapins/.test(noms);
    } catch (e) { return false; } })(),
    JSON.parse(ld).mainEntity.length + ' questions');

  // ─────────────────────────────────────────────── ACCUEIL
  console.log('\n▌ index.html — note sous le simulateur');
  await page.goto(BASE + '/index.html', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(800);
  const note = await page.evaluate(() => {
    const n = document.getElementById('simu-fetes');
    return { visible: n && n.style.display === 'block', txt: n ? n.innerText : '' };
  });
  check('note fêtes visible', note.visible, note.txt.slice(0, 80));

  console.log('\n▌ Erreurs JavaScript');
  const vraies = erreursJs.filter((e) => !/emailjs|firebase|network|Failed to fetch|ERR_/i.test(e));
  check('aucune erreur JS imputable aux modifications', vraies.length === 0, vraies.join(' | ') || 'aucune');

  await browser.close();
  console.log('\n══════════════════════════════════');
  console.log('  ' + pass + ' test(s) réussi(s), ' + fail + ' échec(s)');
  console.log('══════════════════════════════════');
  process.exit(fail ? 1 : 0);
})();
