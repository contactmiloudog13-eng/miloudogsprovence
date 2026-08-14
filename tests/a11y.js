/* Audit d'accessibilite avec axe-core — le moteur exact que Lighthouse
 * utilise pour sa note « Accessibilite ». Chaque violation est listee avec
 * l'element fautif, pour pouvoir corriger a la source. */
const { chromium } = require('playwright-core');
const fs = require('fs');
const AXE = fs.readFileSync(__dirname + '/node_modules/axe-core/axe.min.js', 'utf8');

const STUB = `window.firebase={apps:[],initializeApp:function(){},
  auth:Object.assign(function(){return{setPersistence:function(){return Promise.resolve();},
    onAuthStateChanged:function(cb){setTimeout(function(){cb(null);},100);},
    getRedirectResult:function(){return Promise.resolve(null);}};},
    {Auth:{Persistence:{LOCAL:'local'}},Persistence:{LOCAL:'local'},GoogleAuthProvider:function(){}}),
  database:function(){return{ref:function(){return{get:function(){return Promise.resolve({exists:function(){return false;},val:function(){return{};}});},
    once:function(){return Promise.resolve({val:function(){return null;},exists:function(){return false;},forEach:function(){}});},
    on:function(){},orderByChild:function(){return this;}};}};}};`;

(async () => {
  const pages = process.argv.slice(2);
  const b = await chromium.launch({ executablePath: (process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome') });
  const ctx = await b.newContext({ viewport: { width: 412, height: 823 }, isMobile: true });
  const p = await ctx.newPage();
  await p.route('**/firebasejs/**', r => r.fulfill({ status: 200, contentType: 'application/javascript', body: STUB }));

  const parRegle = {};
  for (const url of pages) {
    await p.goto('http://localhost:8899/' + url, { waitUntil: 'load' });
    await p.waitForTimeout(900);
    await p.addScriptTag({ content: AXE });
    const r = await p.evaluate(async () => {
      const res = await axe.run(document, {
        runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'] },
      });
      return res.violations.map(v => ({
        id: v.id, impact: v.impact, help: v.help,
        cibles: v.nodes.slice(0, 4).map(n => ({
          sel: n.target.join(' '),
          html: n.html.slice(0, 120),
          resume: (n.failureSummary || '').split('\n').filter(Boolean).slice(1, 3).join(' · '),
        })),
        total: v.nodes.length,
      }));
    });
    for (const v of r) {
      parRegle[v.id] = parRegle[v.id] || { help: v.help, impact: v.impact, pages: {}, exemples: [] };
      parRegle[v.id].pages[url] = v.total;
      if (parRegle[v.id].exemples.length < 4) parRegle[v.id].exemples.push(...v.cibles.slice(0, 2));
    }
  }

  const ordre = { critical: 0, serious: 1, moderate: 2, minor: 3 };
  const regles = Object.entries(parRegle).sort((a, b) => (ordre[a[1].impact] ?? 9) - (ordre[b[1].impact] ?? 9));
  if (!regles.length) { console.log('✅ Aucune violation sur ' + pages.length + ' page(s)'); }
  for (const [id, v] of regles) {
    const total = Object.values(v.pages).reduce((a, c) => a + c, 0);
    console.log(`\n▌ [${v.impact}] ${id} — ${total} cas`);
    console.log('  ' + v.help);
    console.log('  pages : ' + Object.entries(v.pages).map(([k, n]) => `${k}(${n})`).join(', '));
    v.exemples.slice(0, 3).forEach(c => {
      console.log('    · ' + c.sel);
      console.log('      ' + c.html.replace(/\s+/g, ' '));
      if (c.resume) console.log('      → ' + c.resume);
    });
  }
  await b.close();
})();
