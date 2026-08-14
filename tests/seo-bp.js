/* Reproduit localement les controles que Lighthouse effectue pour ses notes
 * « SEO » et « Bonnes pratiques ». Chaque point correspond a un audit reel,
 * nomme comme dans le rapport, pour pouvoir corriger a la source. */
const { chromium } = require('playwright-core');
const fs = require('fs');

const STUB = `window.firebase=undefined;`;
const soucis = {};
function noter(regle, page, detail) {
  (soucis[regle] = soucis[regle] || []).push(page + (detail ? '  → ' + detail : ''));
}

(async () => {
  const pages = process.argv.slice(2);
  const b = await chromium.launch({ executablePath: (process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome') });
  const ctx = await b.newContext({ viewport: { width: 412, height: 823 }, isMobile: true, deviceScaleFactor: 1.75 });
  await ctx.route('**/firebasejs/**', r => r.fulfill({ status: 200, contentType: 'application/javascript', body: STUB }));
  const p = await ctx.newPage();

  const titres = new Map(), descs = new Map();

  for (const url of pages) {
    const consoleErreurs = [], depreciations = [];
    const hC = m => { if (m.type() === 'error') consoleErreurs.push(m.text().slice(0, 110)); };
    const hE = e => consoleErreurs.push('EXCEPTION ' + e.message.slice(0, 90));
    p.on('console', hC); p.on('pageerror', hE);

    const rep = await p.goto('http://localhost:8899/' + url, { waitUntil: 'load' });
    await p.waitForTimeout(700);
    p.off('console', hC); p.off('pageerror', hE);

    if (rep.status() !== 200) noter('http-status-code', url, 'HTTP ' + rep.status());

    const d = await p.evaluate(() => {
      const g = s => { const e = document.querySelector(s); return e ? (e.content || e.href || '').trim() : null; };
      const petits = [];
      // taille de police lisible : Lighthouse veut ≥12px sur l'essentiel du texte
      let carTotal = 0, carPetits = 0;
      document.querySelectorAll('body *').forEach(e => {
        const t = [...e.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent.trim()).join('');
        if (!t) return;
        const cs = getComputedStyle(e);
        if (cs.display === 'none' || cs.visibility === 'hidden') return;
        const px = parseFloat(cs.fontSize);
        carTotal += t.length;
        if (px < 12) { carPetits += t.length; if (petits.length < 4) petits.push(Math.round(px) + 'px « ' + t.slice(0, 30) + ' »'); }
      });

      const liensVides = [], liensNonExplorables = [], liensSansRel = [];
      document.querySelectorAll('a').forEach(a => {
        const txt = (a.textContent || '').trim() || a.getAttribute('aria-label') || a.title || '';
        const href = a.getAttribute('href') || '';
        if (!txt && !a.querySelector('img[alt]:not([alt=""])')) liensVides.push(a.outerHTML.slice(0, 70));
        if (!href || href === '#' || href.startsWith('javascript:')) liensNonExplorables.push((txt || '?').slice(0, 30) + ' [' + href + ']');
        if (a.target === '_blank' && !(a.rel || '').includes('noopener')) liensSansRel.push((txt || '?').slice(0, 30));
      });

      const imgsSansAlt = [], imgsRatio = [];
      document.querySelectorAll('img').forEach(i => {
        if (!i.hasAttribute('alt')) imgsSansAlt.push((i.getAttribute('src') || '?').split('/').pop());
        if (i.naturalWidth && i.clientWidth) {
          const rNat = i.naturalWidth / i.naturalHeight, rAff = i.clientWidth / i.clientHeight;
          if (Math.abs(rNat - rAff) / rNat > 0.05) imgsRatio.push((i.getAttribute('src') || '?').split('/').pop());
        }
      });

      // JSON-LD valide
      const ldKo = [];
      document.querySelectorAll('script[type="application/ld+json"]').forEach((s, i) => {
        try { JSON.parse(s.textContent); } catch (e) { ldKo.push('bloc ' + (i + 1)); }
      });

      return {
        titre: (document.title || '').trim(),
        desc: g('meta[name="description"]'),
        canonical: g('link[rel="canonical"]'),
        viewport: g('meta[name="viewport"]'),
        robots: g('meta[name="robots"]'),
        lang: document.documentElement.lang,
        charset: !!document.querySelector('meta[charset]'),
        doctype: !!document.doctype,
        petits, ratioPetits: carTotal ? carPetits / carTotal : 0,
        liensVides, liensNonExplorables, liensSansRel,
        imgsSansAlt, imgsRatio, ldKo,
        docWrite: /document\.write\s*\(/.test(document.documentElement.innerHTML),
        unload: false,
      };
    });

    const indexable = !(d.robots || '').includes('noindex');

    // ── SEO ──────────────────────────────────────────────────────────────
    if (!d.titre) noter('document-title', url, 'titre absent');
    else if (titres.has(d.titre) && indexable) noter('titre en double', url, 'identique à ' + titres.get(d.titre));
    else if (indexable) titres.set(d.titre, url);

    if (indexable) {
      if (!d.desc) noter('meta-description', url, 'absente');
      else if (descs.has(d.desc)) noter('description en double', url, 'identique à ' + descs.get(d.desc));
      else descs.set(d.desc, url);
      if (!d.canonical) noter('canonical', url, 'absent');
    }
    if (!d.viewport) noter('viewport', url, 'absent');
    if (!d.lang) noter('html-has-lang', url, 'attribut lang absent');
    if (d.ratioPetits > 0.4) noter('font-size', url, Math.round(d.ratioPetits * 100) + '% du texte < 12px : ' + d.petits.join(' · '));
    if (d.liensVides.length) noter('link-name', url, d.liensVides.length + ' lien(s) sans texte : ' + d.liensVides[0]);
    if (d.liensNonExplorables.length) noter('crawlable-anchors', url, d.liensNonExplorables.length + ' : ' + d.liensNonExplorables.slice(0, 2).join(' · '));
    if (d.imgsSansAlt.length) noter('image-alt', url, d.imgsSansAlt.join(', '));

    // ── Bonnes pratiques ─────────────────────────────────────────────────
    if (!d.charset) noter('charset', url, 'absent');
    if (!d.doctype) noter('doctype', url, 'absent');
    if (consoleErreurs.length) noter('errors-in-console', url, consoleErreurs.slice(0, 2).join(' | '));
    if (d.liensSansRel.length) noter('external-anchors-use-rel-noopener', url, d.liensSansRel.join(', '));
    if (d.imgsRatio.length) noter('image-aspect-ratio', url, d.imgsRatio.join(', '));
    if (d.ldKo.length) noter('structured-data', url, 'JSON-LD invalide : ' + d.ldKo.join(', '));
    if (d.docWrite) noter('no-document-write', url, 'document.write() présent');
  }

  await b.close();
  const n = Object.keys(soucis).length;
  console.log(`\n${pages.length} page(s) auditée(s) — ${n} type(s) de problème\n`);
  for (const [regle, liste] of Object.entries(soucis).sort((a, b) => b[1].length - a[1].length)) {
    console.log(`▌ ${regle} — ${liste.length} page(s)`);
    liste.slice(0, 6).forEach(l => console.log('    · ' + l));
    if (liste.length > 6) console.log(`    … et ${liste.length - 6} autres`);
    console.log('');
  }
  if (!n) console.log('✅ aucun problème détecté');
  process.exit(n ? 1 : 0);
})();
