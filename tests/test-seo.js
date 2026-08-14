const { chromium } = require('playwright-core');
const EXE = (process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome');
const BASE = 'http://localhost:8899/';
let ok=0, ko=0;
const T=(n,c,d)=>{ if(c){ok++;console.log('  ✅ '+n+(d?'  → '+d:''));} else {ko++;console.log('  ❌ '+n+(d?'  → '+d:''));} };

const NOUVELLES = ['garde-chat-domicile.html',
 ...['miramas','istres','saint-chamas','salon-de-provence','fos-sur-mer','berre-letang','port-de-bouc','martigues'].map(v=>`garde-chat-${v}.html`),
 'garde-lapin-rongeur-domicile.html','garde-poules-basse-cour-domicile.html','garde-nac-furet-oiseau-tortue.html',
 'combien-de-temps-laisser-chat-seul.html','chat-pension-ou-visites-a-domicile.html','partir-en-vacances-avec-des-poules.html'];

(async () => {
  const b = await chromium.launch({ executablePath: EXE });

  console.log('\n▌ Les 15 nouvelles pages — structure et SEO');
  const page = await b.newPage();
  const erreurs = [];
  page.on('pageerror', e => erreurs.push(e.message));
  const titres = new Set(), descs = new Set(), h1s = [];

  for (const url of NOUVELLES) {
    const r = await page.goto(BASE+url, {waitUntil:'domcontentloaded'});
    if (r.status() !== 200) { T(url, false, 'HTTP '+r.status()); continue; }
    const d = await page.evaluate(() => {
      const g = s => { const e=document.querySelector(s); return e ? (e.content||e.href||e.textContent||'').trim() : null; };
      const lds = [...document.querySelectorAll('script[type="application/ld+json"]')].map(s=>{
        try { return JSON.parse(s.textContent)['@type']; } catch(e){ return 'INVALIDE'; }});
      return {
        titre: document.title,
        desc: g('meta[name="description"]'),
        canon: g('link[rel="canonical"]'),
        h1: [...document.querySelectorAll('h1')].map(h=>h.textContent.trim()),
        h2: document.querySelectorAll('h2').length,
        og: !!g('meta[property="og:title"]'),
        lds,
        mots: document.body.innerText.split(/\s+/).length,
        liensInternes: [...document.querySelectorAll('a[href$=".html"]')].length,
        // Les polices ne doivent bloquer AUCUN affichage et ne plus dependre
        // d'un domaine tiers : declarees dans la page, fichiers chez nous.
        police: [...document.styleSheets].some(f=>{ try{ return [...f.cssRules]
                  .some(r=>r.constructor.name==='CSSFontFaceRule'); }catch(e){ return false; } })
                && !document.querySelector('link[href*="fonts.googleapis.com"]'),
        importBloquant: [...document.styleSheets].length
      };
    });
    const pbs = [];
    if (!d.titre || d.titre.length > 75) pbs.push('titre '+(d.titre?d.titre.length+' car.':'absent'));
    if (!d.desc || d.desc.length < 70) pbs.push('description trop courte');
    if (!d.canon) pbs.push('canonical absent');
    if (d.h1.length !== 1) pbs.push(d.h1.length+' H1');
    if (d.h2 < 3) pbs.push('seulement '+d.h2+' H2');
    if (!d.og) pbs.push('og:title absent');
    if (d.lds.includes('INVALIDE')) pbs.push('JSON-LD invalide');
    if (d.mots < 500) pbs.push('contenu maigre ('+d.mots+' mots)');
    if (d.liensInternes < 8) pbs.push('peu de liens internes');
    if (!d.police) pbs.push('polices absentes ou encore chez Google');
    T(url, pbs.length===0, pbs.length ? pbs.join(', ') : d.mots+' mots · '+d.h2+' H2 · '+d.lds.length+' JSON-LD');
    titres.add(d.titre); descs.add(d.desc); h1s.push(d.h1[0]);
  }

  console.log('\n▌ Pas de contenu dupliqué');
  T('15 titres tous différents', titres.size===15, titres.size+'/15');
  T('15 descriptions toutes différentes', descs.size===15, descs.size+'/15');
  T('15 H1 tous différents', new Set(h1s).size===15, new Set(h1s).size+'/15');

  console.log('\n▌ Maillage interne — les pages sont-elles atteignables ?');
  for (const [depuis, attendus] of [
    ['index.html', ['garde-chat-domicile.html','garde-chat-miramas.html','garde-poules-basse-cour-domicile.html','combien-de-temps-laisser-chat-seul.html']],
    ['blog.html',  ['combien-de-temps-laisser-chat-seul.html','chat-pension-ou-visites-a-domicile.html','partir-en-vacances-avec-des-poules.html']],
    ['services.html', ['garde-chat-domicile.html','garde-lapin-rongeur-domicile.html','garde-nac-furet-oiseau-tortue.html']],
    ['garde-animaux-domicile-miramas.html', ['garde-chat-domicile.html','garde-chat-martigues.html','garde-poules-basse-cour-domicile.html']]
  ]) {
    await page.goto(BASE+depuis, {waitUntil:'domcontentloaded'});
    const liens = await page.evaluate(()=>[...document.querySelectorAll('a[href]')].map(a=>a.getAttribute('href')));
    const manquants = attendus.filter(a=>!liens.includes(a));
    T(depuis+' → nouvelles pages', manquants.length===0, manquants.length?('manque '+manquants.join(', ')):attendus.length+' liens OK');
  }

  console.log('\n▌ Aucun lien mort');
  const vus = new Set(); let morts = [];
  for (const url of [...NOUVELLES, 'index.html','blog.html','services.html','faq.html','garde-animaux-domicile-miramas.html']) {
    await page.goto(BASE+url, {waitUntil:'domcontentloaded'});
    const liens = await page.evaluate(()=>[...document.querySelectorAll('a[href$=".html"]')].map(a=>a.getAttribute('href')));
    for (const l of new Set(liens)) {
      if (vus.has(l) || l.startsWith('http')) continue;
      vus.add(l);
      const r = await page.request.get(BASE+l);
      if (r.status() !== 200) morts.push(l+' ('+r.status()+')');
    }
  }
  T('tous les liens internes répondent', morts.length===0, morts.length?morts.join(', '):vus.size+' liens vérifiés');

  console.log('\n▌ Sitemap');
  const sm = await page.request.get(BASE+'sitemap.xml');
  const xml = await sm.text();
  const dansSitemap = NOUVELLES.filter(u => xml.includes('/'+u));
  T('les 15 pages sont dans le sitemap', dansSitemap.length===15, dansSitemap.length+'/15');
  T('sitemap servi en 200', sm.status()===200, 'HTTP '+sm.status());

  console.log('\n▌ Mobile — pas de débordement');
  const m = await b.newPage({ viewport:{width:390,height:844}, isMobile:true, hasTouch:true,
    userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' });
  for (const url of ['garde-chat-domicile.html','garde-chat-martigues.html','garde-poules-basse-cour-domicile.html','combien-de-temps-laisser-chat-seul.html']) {
    await m.goto(BASE+url, {waitUntil:'domcontentloaded'});
    const d = await m.evaluate(()=>({sw:document.documentElement.scrollWidth, cw:document.documentElement.clientWidth}));
    T(url+' ne défile pas horizontalement', d.sw <= d.cw+1, d.sw+'px pour '+d.cw+'px');
  }
  await m.close();

  console.log('\n▌ Erreurs JavaScript');
  T('aucune erreur JS sur les nouvelles pages', erreurs.length===0, erreurs.length?erreurs.slice(0,3).join(' | '):'aucune');

  await b.close();
  console.log('\n══════════════════════════════════');
  console.log('  '+ok+' réussi(s), '+ko+' échec(s)');
  console.log('══════════════════════════════════');
  process.exit(ko?1:0);
})();
