/* Banc de mesure calé sur Lighthouse mobile — les VRAIS reglages.
 *
 * Mon erreur precedente : j'avais simule une 4G a 9 Mb/s. Lighthouse teste
 * une « 4G lente » a 1,6 Mb/s avec 150 ms de latence, sur un Moto G Power
 * (processeur ralenti 4x). D'ou un ecart de plusieurs SECONDES entre mes
 * mesures et PageSpeed. Ces valeurs sont celles de Lighthouse.
 */
const { chromium } = require('playwright-core');
const EXE = (process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome');

const LIGHTHOUSE = {
  offline: false,
  downloadThroughput: 1.6 * 1024 * 1024 / 8,   // 1,6 Mb/s
  uploadThroughput: 750 * 1024 / 8,            // 750 Kb/s
  latency: 150,                                 // 150 ms aller-retour
};
const CPU = 4;

async function mesure(navigateur, url, videCache) {
  const ctx = await navigateur.newContext({
    viewport: { width: 412, height: 823 },      // Moto G Power
    isMobile: true, hasTouch: true, deviceScaleFactor: 1.75,
  });
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('Network.emulateNetworkConditions', LIGHTHOUSE);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: CPU });
  if (videCache) await cdp.send('Network.clearBrowserCache');

  // Mon environnement bloque gstatic.com : sans cela, les ~130 Ko compresses
  // du SDK Firebase ne sont PAS telecharges et la mesure est trop flatteuse.
  // On les simule a leur taille reelle pour que le chiffre veuille dire
  // quelque chose. (Tailles constatees par PageSpeed sur le site en ligne.)
  const POIDS_FIREBASE = { 'firebase-app-compat.js': 30000, 'firebase-auth-compat.js': 45000, 'firebase-database-compat.js': 58000 };
  await page.route('**/firebasejs/**', route => {
    const nom = route.request().url().split('/').pop();
    const n = POIDS_FIREBASE[nom] || 30000;
    route.fulfill({ status: 200, contentType: 'application/javascript',
      body: 'window.firebase=window.firebase||{apps:[],initializeApp:function(){},auth:function(){return{onAuthStateChanged:function(){},getRedirectResult:function(){return Promise.resolve(null);}};},database:function(){return{ref:function(){return{once:function(){return Promise.resolve({val:function(){return null;},exists:function(){return false;},forEach:function(){}});},on:function(){},orderByChild:function(){return this;},get:function(){return Promise.resolve({exists:function(){return false;}});}};}};}};\n/*' + 'x'.repeat(n) + '*/' });
  });


  await page.addInitScript(() => {
    window.__m = { fcp: 0, lcp: 0, cls: 0, lcpEl: '' };
    new PerformanceObserver(l => {
      for (const e of l.getEntries()) if (e.name === 'first-contentful-paint') window.__m.fcp = Math.round(e.startTime);
    }).observe({ type: 'paint', buffered: true });
    new PerformanceObserver(l => {
      const e = l.getEntries().pop();
      window.__m.lcp = Math.round(e.startTime);
      window.__m.lcpEl = e.element ? (e.element.tagName + (e.element.className ? '.' + String(e.element.className).trim().split(/\s+/)[0] : '')) : (e.url || '?');
    }).observe({ type: 'largest-contentful-paint', buffered: true });
    new PerformanceObserver(l => {
      for (const e of l.getEntries()) if (!e.hadRecentInput) window.__m.cls += e.value;
    }).observe({ type: 'layout-shift', buffered: true });
  });

  await page.goto(url, { waitUntil: 'load', timeout: 120000 }).catch(() => {});
  await page.waitForTimeout(4000);
  const m = await page.evaluate(() => window.__m);
  await ctx.close();
  return m;
}

const median = a => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)];
const feu = (v, bon, moyen) => v <= bon ? '🟢' : v <= moyen ? '🟡' : '🔴';

(async () => {
  const cibles = process.argv.slice(2);
  const b = await chromium.launch({ executablePath: EXE });
  console.log('Réglages Lighthouse mobile : 1,6 Mb/s · 150 ms · processeur ÷4 · cache vide\n');
  console.log('page                          FCP        LCP        CLS      élément LCP');
  console.log('─'.repeat(84));
  for (const u of cibles) {
    const r = [];
    for (let i = 0; i < 3; i++) r.push(await mesure(b, 'http://localhost:8899/' + u, true));
    const fcp = median(r.map(x => x.fcp)), lcp = median(r.map(x => x.lcp)), cls = median(r.map(x => x.cls));
    console.log(
      u.padEnd(28) +
      (feu(fcp, 1800, 3000) + ' ' + (fcp / 1000).toFixed(1) + 's').padEnd(11) +
      (feu(lcp, 2500, 4000) + ' ' + (lcp / 1000).toFixed(1) + 's').padEnd(11) +
      (feu(cls, 0.1, 0.25) + ' ' + cls.toFixed(3)).padEnd(11) +
      r[0].lcpEl
    );
  }
  console.log('\nSeuils Google : FCP ≤1,8s · LCP ≤2,5s · CLS ≤0,1');
  await b.close();
})();
