const { chromium } = require('playwright-core');
const EXE=(process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome');
const PAGES=['index.html','services.html','a-propos.html','forfait-evasion.html','galerie.html','garde-chat-domicile.html'];
let ok=0,ko=0;
const T=(n,c,d)=>{c?(ok++,console.log('  ✅ '+n+(d?'  → '+d:''))):(ko++,console.log('  ❌ '+n+(d?'  → '+d:'')));};
(async()=>{
  const b=await chromium.launch({executablePath:EXE});
  for(const vue of [{n:'mobile',w:390,h:844,m:true},{n:'bureau',w:1440,h:900,m:false}]){
    console.log('\n▌ '+vue.n);
    const ctx=await b.newContext({viewport:{width:vue.w,height:vue.h},isMobile:vue.m,deviceScaleFactor:vue.m?3:1});
    const p=await ctx.newPage();
    const img404=[];
    p.on('response',r=>{ if(r.status()>=400 && /\.(webp|png|jpg|jpeg)$/i.test(r.url())) img404.push(r.url().split('/').pop()); });
    for(const u of PAGES){
      await p.goto('http://localhost:8899/'+u,{waitUntil:'load'});
      // fait defiler toute la page pour declencher content-visibility
      await p.evaluate(async()=>{ for(let y=0;y<document.body.scrollHeight;y+=400){window.scrollTo(0,y);await new Promise(r=>setTimeout(r,25));} window.scrollTo(0,0); });
      await p.waitForTimeout(500);
      const d=await p.evaluate(async()=>{
        // content-visibility:auto fait rapporter une taille NULLE aux blocs
        // hors ecran : c'est le comportement recherche. Pour juger de la mise
        // en page, il faut donc amener chaque bloc a l'ecran avant de mesurer.
        const fonds=[...document.querySelectorAll('*')].filter(e=>{
          const bi=getComputedStyle(e).backgroundImage;
          return bi && bi!=='none' && bi.includes('url(') && !bi.includes('gradient');
        });
        const vides=[];
        for(const e of fonds){
          if(getComputedStyle(e).display==='none') continue;   // masque volontairement
          e.scrollIntoView({block:'center'});
          await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
          const r=e.getBoundingClientRect();
          if(r.width<2||r.height<2) vides.push(e.className||e.tagName);
        }
        window.scrollTo(0,0);
        return {
          fonds:fonds.length, vides:vides.length, quels:vides.join(' / '),
          debordement:document.documentElement.scrollWidth>document.documentElement.clientWidth+1,
          largeur:document.documentElement.scrollWidth, vue:document.documentElement.clientWidth,
          hauteur:document.body.scrollHeight
        };
      });
      T(u+' — '+d.fonds+' fond(s) CSS, aucun bloc effondré', d.vides===0, d.vides?d.vides+' bloc(s) sans dimension : '+d.quels:'hauteur '+d.hauteur+'px');
      T(u+' — pas de défilement horizontal', !d.debordement, d.largeur+'px pour '+d.vue+'px');
    }
    T('aucune image en erreur', img404.length===0, img404.length?img404.join(', '):'0');
    await ctx.close();
  }
  await b.close();
  console.log('\n══════════════════════════════════');
  console.log('  '+ok+' réussi(s), '+ko+' échec(s)');
  console.log('══════════════════════════════════');
  process.exit(ko?1:0);
})();
