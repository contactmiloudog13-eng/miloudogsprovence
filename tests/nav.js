const { chromium } = require('playwright-core');
let ok=0,ko=0; const T=(n,c,d)=>{c?(ok++,console.log('  ✅ '+n+(d?'  → '+d:''))):(ko++,console.log('  ❌ '+n+(d?'  → '+d:'')));};
  const STUB = `window.firebase={apps:[],initializeApp:function(){},
    auth:Object.assign(function(){return{setPersistence:function(){return Promise.resolve();},onAuthStateChanged:function(cb){setTimeout(function(){cb(window.__faussSession||null);},600);},
                            getRedirectResult:function(){return Promise.resolve(null);}};},{Auth:{Persistence:{LOCAL:'local',SESSION:'session',NONE:'none'}},Persistence:{LOCAL:'local',SESSION:'session',NONE:'none'},GoogleAuthProvider:function(){}}),
    database:function(){return{ref:function(){return{get:function(){return Promise.resolve({exists:function(){return true;},val:function(){return {prenom:'Lilou'};}});},
      once:function(){return Promise.resolve({val:function(){return null;},exists:function(){return false;},forEach:function(){}});},
      on:function(){},orderByChild:function(){return this;}};}};}};`;
  async function brancher(p){ await p.route('**/firebasejs/**', r=>r.fulfill({status:200,contentType:'application/javascript',body:STUB})); }
(async()=>{
  const b=await chromium.launch({executablePath:(process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome')});
  console.log('\n▌ Menu « Mon espace » — visiteur jamais connecté');
  let ctx=await b.newContext(); let p=await ctx.newPage(); await brancher(p);
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://localhost:8899/index.html',{waitUntil:'load'}); await p.waitForTimeout(1200);
  let m=await p.evaluate(()=>({mob:document.getElementById('nav-auth-item').innerHTML,
                               bur:document.getElementById('nav-desktop-auth').innerHTML}));
  T('menu mobile rempli', m.mob.includes('connexion.html'), m.mob.replace(/\s+/g,' ').slice(0,60));
  T('menu bureau rempli', m.bur.includes('connexion.html'), m.bur.replace(/\s+/g,' ').slice(0,60));
  T('pas de bouton Déconnexion', !m.mob.includes('Déconnexion'));
  await ctx.close();

  console.log('\n▌ Menu — visiteur déjà venu (prénom en cache, réseau coupé)');
  ctx=await b.newContext(); p=await ctx.newPage(); await brancher(p);
  p.on('pageerror',e=>errs.push(e.message));
  await p.addInitScript(()=>{ try{ localStorage.setItem('mdpDejaConnecte','Lilou'); }catch(e){} });
  await p.goto('http://localhost:8899/index.html',{waitUntil:'domcontentloaded'});
  await p.waitForTimeout(400);   // volontairement TOT : le reseau n'a pas eu le temps
  m=await p.evaluate(()=>({mob:document.getElementById('nav-auth-item').innerHTML}));
  T('« Lilou » affiché immédiatement, sans attendre Firebase', m.mob.includes('Lilou'), m.mob.replace(/\s+/g,' ').slice(0,70));
  T('lien vers l\'espace client', m.mob.includes('espace-client.html'));
  T('bouton Déconnexion présent', m.mob.includes('Déconnexion'));
  await ctx.close();

  console.log('\n▌ Sécurité : un prénom piégé dans le cache reste inoffensif');
  ctx=await b.newContext(); p=await ctx.newPage(); await brancher(p);
  p.on('pageerror',e=>errs.push(e.message));
  await p.addInitScript(()=>{ try{ localStorage.setItem('mdpDejaConnecte','<img src=x onerror=alert(1)>'); }catch(e){} });
  await p.goto('http://localhost:8899/index.html',{waitUntil:'domcontentloaded'}); await p.waitForTimeout(400);
  const inj=await p.evaluate(()=>({html:document.getElementById('nav-auth-item').innerHTML,
                                    img:document.querySelectorAll('#nav-auth-item img').length}));
  T('aucune balise injectée', inj.img===0, inj.img+' <img> créé(s)');
  T('le texte est échappé', inj.html.includes('&lt;') || !inj.html.includes('<img'), inj.html.replace(/\s+/g,' ').slice(0,70));
  await ctx.close();

  T('aucune erreur JavaScript', errs.length===0, errs.slice(0,2).join(' | ')||'aucune');
  await b.close();
  console.log('\n  '+ok+' réussi(s), '+ko+' échec(s)');
  process.exit(ko?1:0);
})();
