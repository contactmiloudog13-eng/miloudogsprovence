/* Compare MOBILE et BUREAU avec les reglages exacts de Lighthouse, pour
 * expliquer chiffres a l'appui pourquoi le bureau note toujours mieux. */
const { chromium } = require('playwright-core');
const EXE = (process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome');

const PROFILS = {
  mobile: {
    reseau: { offline: false, downloadThroughput: 1.6 * 1024 * 1024 / 8, uploadThroughput: 750 * 1024 / 8, latency: 150 },
    cpu: 4,
    vue: { width: 412, height: 823 }, mobile: true, dpr: 1.75,
    desc: '1,6 Mb/s · 150 ms · processeur ÷4',
  },
  bureau: {
    reseau: { offline: false, downloadThroughput: 10 * 1024 * 1024 / 8, uploadThroughput: 10 * 1024 * 1024 / 8, latency: 40 },
    cpu: 1,
    vue: { width: 1350, height: 940 }, mobile: false, dpr: 1,
    desc: '10 Mb/s · 40 ms · processeur normal',
  },
};

const POIDS_FIREBASE = { 'firebase-app-compat.js': 30000, 'firebase-auth-compat.js': 45000, 'firebase-database-compat.js': 58000 };

async function mesure(b, profil, url) {
  const p = PROFILS[profil];
  const ctx = await b.newContext({ viewport: p.vue, isMobile: p.mobile, hasTouch: p.mobile, deviceScaleFactor: p.dpr });
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('Network.emulateNetworkConditions', p.reseau);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: p.cpu });
  await cdp.send('Network.clearBrowserCache');

  await page.route('**/firebasejs/**', r => {
    const n = POIDS_FIREBASE[r.request().url().split('/').pop()] || 30000;
    r.fulfill({ status: 200, contentType: 'application/javascript',
      body: 'window.firebase=window.firebase||{apps:[],initializeApp:function(){},auth:function(){return{onAuthStateChanged:function(){},getRedirectResult:function(){return Promise.resolve(null);}};},database:function(){return{ref:function(){return{once:function(){return Promise.resolve({val:function(){return null;},exists:function(){return false;},forEach:function(){}});},on:function(){},orderByChild:function(){return this;},get:function(){return Promise.resolve({exists:function(){return false;}});}};}};}};\n/*' + 'x'.repeat(n) + '*/' });
  });

  let octets = 0;
  page.on('response', async r => { try { octets += parseInt(r.headers()['content-length'] || 0, 10); } catch (e) {} });

  await page.addInitScript(() => {
    window.__m = { fcp: 0, lcp: 0, cls: 0, lcpEl: '' };
    new PerformanceObserver(l => { for (const e of l.getEntries()) if (e.name === 'first-contentful-paint') window.__m.fcp = Math.round(e.startTime); }).observe({ type: 'paint', buffered: true });
    new PerformanceObserver(l => { const e = l.getEntries().pop(); window.__m.lcp = Math.round(e.startTime); window.__m.lcpEl = e.element ? e.element.tagName + (e.element.className ? '.' + String(e.element.className).trim().split(/\s+/)[0] : '') : '?'; }).observe({ type: 'largest-contentful-paint', buffered: true });
    new PerformanceObserver(l => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__m.cls += e.value; }).observe({ type: 'layout-shift', buffered: true });
  });

  await page.goto(url, { waitUntil: 'load', timeout: 120000 }).catch(() => {});
  await page.waitForTimeout(3500);
  const m = await page.evaluate(() => window.__m);
  m.octets = octets;
  await ctx.close();
  return m;
}

const med = a => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)];

(async () => {
  const b = await chromium.launch({ executablePath: EXE });
  const res = {};
  for (const profil of ['mobile', 'bureau']) {
    const r = [];
    for (let i = 0; i < 3; i++) r.push(await mesure(b, profil, 'http://localhost:8899/index.html'));
    res[profil] = { fcp: med(r.map(x => x.fcp)), lcp: med(r.map(x => x.lcp)), cls: med(r.map(x => x.cls)), octets: med(r.map(x => x.octets)), el: r[0].lcpEl };
  }
  console.log('Page d\'accueil — même code, deux profils Lighthouse\n');
  console.log('                          MOBILE                 BUREAU');
  console.log('                   ' + PROFILS.mobile.desc.padEnd(24) + PROFILS.bureau.desc);
  console.log('─'.repeat(72));
  const l = (nom, m, d, u = '') => console.log(nom.padEnd(19) + String(m + u).padEnd(24) + String(d + u));
  l('FCP', (res.mobile.fcp / 1000).toFixed(1), (res.bureau.fcp / 1000).toFixed(1), ' s');
  l('LCP', (res.mobile.lcp / 1000).toFixed(1), (res.bureau.lcp / 1000).toFixed(1), ' s');
  l('CLS', res.mobile.cls.toFixed(3), res.bureau.cls.toFixed(3));
  l('octets telecharges', (res.mobile.octets / 1024).toFixed(0), (res.bureau.octets / 1024).toFixed(0), ' Ko');
  l('element LCP', res.mobile.el, res.bureau.el);
  console.log('\nRapport de vitesse reseau : ' + (10 / 1.6).toFixed(1) + 'x   ·   latence : ' + (150 / 40).toFixed(1) + 'x   ·   processeur : 4x');
  await b.close();
})();
