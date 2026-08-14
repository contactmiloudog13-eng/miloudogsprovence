const { chromium } = require('playwright-core');
const fs=require('fs'); const AXE=fs.readFileSync(__dirname+'/node_modules/axe-core/axe.min.js','utf8');
(async()=>{
  const b=await chromium.launch({executablePath:(process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome')});
  const ctx=await b.newContext({viewport:{width:412,height:823},isMobile:true});
  const p=await ctx.newPage();
  await p.route('**/firebasejs/**',r=>r.fulfill({status:200,contentType:'application/javascript',body:'window.firebase=undefined;'}));
  const paires={};
  for(const u of process.argv.slice(2)){
    await p.goto('http://localhost:8899/'+u,{waitUntil:'load'}); await p.waitForTimeout(700);
    await p.addScriptTag({content:AXE});
    const v=await p.evaluate(async()=>{
      const r=await axe.run(document,{runOnly:{type:'rule',values:['color-contrast']}});
      return (r.violations[0]?r.violations[0].nodes:[]).map(n=>({s:n.failureSummary||'',sel:n.target.join(' ')}));
    });
    v.forEach(x=>{
      const m=x.s.match(/contrast of ([\d.]+).*foreground color: (#\w+), background color: (#\w+), font size: ([\d.]+)pt \(([\d.]+)px\), font weight: (\w+)/s);
      if(!m) return;
      const cle=`${m[2]} sur ${m[3]}  ${m[5]}px ${m[6]}`;
      paires[cle]=paires[cle]||{ratio:m[1],n:0,ex:[]};
      paires[cle].n++; if(paires[cle].ex.length<2) paires[cle].ex.push(u+' → '+x.sel.slice(0,50));
    });
  }
  console.log('Combinaisons de couleurs insuffisantes (seuil 4,5 pour du texte normal, 3,0 si ≥24px ou ≥18,7px gras)\n');
  Object.entries(paires).sort((a,b)=>b[1].n-a[1].n).forEach(([k,v])=>{
    console.log(`  ${k.padEnd(42)} ratio ${v.ratio}   ${v.n} cas`);
    v.ex.forEach(e=>console.log('      '+e));
  });
  await b.close();
})();
