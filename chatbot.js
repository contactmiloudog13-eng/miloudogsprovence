(function(){

const REPONSES = [
  // ── NOMBRE DE CHIENS ─────────────────────────────────────
  {
    mots: ['chien','max','maximum','nombre','limite','place','simultane','gardez','capacite'],
    rep: `🐕 Nous accueillons maximum 7 chiens simultanément.\n\nPas de box, pas de cage — ils vivent dans la maison sur un terrain de 2 000 m² clôturé. Ambiance 100% familiale !`
  },
  // ── TARIFS ───────────────────────────────────────────────
  {
    mots: ['tarif','prix','cout','coute','cher','combien','nuit','journee','demi','promenade','toilettage','pension','euro','20','15','10','30','semaine','seance'],
    rep: `🐾 Voici nos tarifs :\n\n🏠 Pension nuit complète : 20€/nuit\n☀️ Garderie journée : 20€\n🌤️ Garderie demi-journée : 10€\n🐣 Test demi-journée (1ère fois) : 10€\n🦮 Promenade : 15€\n🛁 Toilettage : 30€ (bientôt)\n\n💡 2 chiens de la même famille = réduction !`
  },
  // ── RÉSERVATION ──────────────────────────────────────────
  {
    mots: ['reserver','reserv','reservation','reserver','booker','prendre','rendez','comment','inscrire','inscription'],
    rep: `📅 Pour réserver :\n\n1. Remplissez le formulaire sur la page Réservation\n2. Ou appelez-nous : 07 77 23 40 88\n\nUne visite de présentation est organisée avant le 1er séjour 🐶`
  },
  // ── DISPONIBILITÉS ───────────────────────────────────────
  {
    mots: ['dispo','disponible','disponibilite','place','libre','occupe','complet','plein','juillet','aout','vacances','ete','noel','paques','ferie'],
    rep: `📅 Pour connaître nos disponibilités, contactez-nous directement :\n\n📞 07 77 23 40 88\n💬 WhatsApp au même numéro\n\nOn vous répond sous 24h !`
  },
  // ── VISITE DE PRÉSENTATION ───────────────────────────────
  {
    mots: ['visite','presentation','rencontre','premiere','premier','obligatoire','avant','decouvrir','connaitre'],
    rep: `🤝 Avant tout 1er séjour, on organise une visite de présentation chez nous.\n\nVotre chien découvre les lieux, rencontre les autres pensionnaires, et on échange sur ses habitudes, son alimentation et son caractère. C'est gratuit et indispensable !`
  },
  // ── VACCINS / SANTÉ ──────────────────────────────────────
  {
    mots: ['vaccin','vaccine','sante','obligatoire','carnet','puce','tique','traitement','vermifuge','antiparasitaire','chppil','non vaccine','pas vaccine','sans vaccin'],
    rep: `💉 Oui, les vaccins sont obligatoires !\n\nVotre chien doit être :\n• À jour des vaccins (CHPPIL minimum)\n• Traité contre les puces et tiques\n\nLe carnet de santé est demandé lors de la visite de présentation.`
  },
  // ── PHOTOS / NOUVELLES ───────────────────────────────────
  {
    mots: ['photo','nouvelle','suivi','whatsapp','sms','message','video','info','rassurer','nouvelles','quotidien'],
    rep: `📸 Oui, j'envoie des photos et un message chaque jour !\n\nVia WhatsApp, Facebook ou SMS selon votre préférence. Vous partez l'esprit tranquille 😊`
  },
  // ── NOURRITURE / ALIMENTATION ────────────────────────────
  {
    mots: ['nourriture','croquette','alimentation','repas','manger','nourrir','gamelle','regime','allergie','kibble'],
    rep: `🍖 Vous apportez la nourriture habituelle de votre chien !\n\nCela évite tout changement alimentaire et les problèmes digestifs. Je suis les habitudes de chaque pensionnaire à la lettre.`
  },
  // ── MÉDICAMENTS ──────────────────────────────────────────
  {
    mots: ['medicament','traitement','comprime','pilule','soin','medical','ordonnance'],
    rep: `💊 Oui, je peux administrer des médicaments si nécessaire.\n\nMentionnez-le lors de la visite de présentation et laissez les instructions claires. La santé de votre chien est ma priorité !`
  },
  // ── RACES / TAILLES ──────────────────────────────────────
  {
    mots: ['race','taille','grand','petit','gros','labrador','berger','bouledogue','chihuahua','epagneul','golden','husky','categorie','dangereux','1ere','2eme','agressif','mechant'],
    rep: `🐕 J'accueille la grande majorité des chiens, toutes races et toutes tailles !\n\nSeuls les chiens avec une agressivité avérée envers d'autres animaux ou humains ne peuvent pas être acceptés. La visite de présentation permet d'évaluer ça ensemble sereinement.`
  },
  // ── CHIOT / VIEUX CHIEN ──────────────────────────────────
  {
    mots: ['chiot','bebe','jeune','vieux','vieille','age','senior','fragile','handicap'],
    rep: `🐶 J'accueille les chiots comme les seniors !\n\nChaque chien reçoit une attention adaptée à son âge et ses besoins. On en discute lors de la visite de présentation.`
  },
  // ── PARRAINAGE ───────────────────────────────────────────
  {
    mots: ['parrain','parrainage','filleul','ami','recommande','recommandation','sponsor','offre','bon plan','gagne','gagner','combien gagne','si je parraine'],
    rep: `🎁 Notre offre parrainage :\n\n→ Vous parrainez un ami = 10€ offerts pour VOUS sur votre prochaine garde !\n→ Votre ami veut aussi une réduction ? Il n'a qu'à parrainer quelqu'un à son tour 😊\n\nIl suffit que votre ami mentionne votre prénom lors de sa réservation.`
  },
  // ── RÉDUCTIONS / PROMOS ──────────────────────────────────
  {
    mots: ['reduction','remise','promo','promotion','offre','gratuit','cadeau','nuit offerte'],
    rep: `💰 Nos offres en ce moment :\n\n🎁 1 nuit offerte sur la pension complète !\n👨‍👩‍👧 2 chiens de la même famille = réduction (appelez pour devis)\n🤝 Parrainage : 10€ offerts pour vous si votre ami réserve\n\nContactez-nous au 07 77 23 40 88 🐾`
  },
  // ── PAIEMENT ─────────────────────────────────────────────
  {
    mots: ['paiem','payer','virement','paypal','espece','cb','carte','cheque','acompte','depot','reglement'],
    rep: `💳 Modes de paiement acceptés :\n\n• Espèces\n• Virement bancaire\n• PayPal\n\nLe règlement se fait à la fin du séjour. Un acompte peut être demandé pour les longs séjours.`
  },
  // ── URGENCE VÉTÉRINAIRE ──────────────────────────────────
  {
    mots: ['urgence','veterinaire','accident','blesse','blessure','malade','maladie','probleme','sante','clinique','frais'],
    rep: `🚨 En cas d'urgence, je vous contacte immédiatement.\n\nSi vous n'êtes pas joignable, votre chien est emmené chez le vétérinaire de votre choix (indiqué à la réservation) ou le plus proche.\n\nLes frais vétérinaires restent à votre charge.`
  },
  // ── TERRAIN / ESPACE ─────────────────────────────────────
  {
    mots: ['terrain','jardin','cloture','espace','superficie','2000','m2','exterieur','grand','nature','securise'],
    rep: `🏡 Notre terrain fait 2 000 m², entièrement clôturé et sécurisé.\n\nLes chiens sont en liberté toute la journée et ont accès à la maison la nuit. Pas de box, pas de cage !`
  },
  // ── VIE DANS LA MAISON ───────────────────────────────────
  {
    mots: ['maison','interieur','box','cage','chenil','conditions','dort','nuit','famille','ambiance'],
    rep: `🏠 Les chiens vivent vraiment dans la maison !\n\nPas de box, pas de cage. Ils dorment à l'intérieur la nuit et profitent du terrain de 2 000 m² la journée. Une vraie vie de famille 🐾`
  },
  // ── PLUSIEURS CHIENS MÊME FAMILLE ───────────────────────
  {
    mots: ['deux','2','plusieurs','frere','soeur','ensemble','meme famille','meme maison'],
    rep: `🐕🐕 Oui, j'accepte plusieurs chiens de la même famille !\n\nIls restent ensemble et une réduction est appliquée. Contactez-nous au 07 77 23 40 88 pour un devis personnalisé.`
  },
  // ── CONTACT / TÉLÉPHONE ──────────────────────────────────
  {
    mots: ['contact','telephone','appel','appeler','joindre','numero','whatsapp','facebook','tiktok','reseau','mail','email'],
    rep: `📞 Contactez-nous :\n\n• Téléphone / WhatsApp : 07 77 23 40 88\n• Facebook : Milou Dogs Provence\n• TikTok : @miloudogs_provence\n\nDisponible 7j/7 de 8h à 19h 🐾`
  },
  // ── HORAIRES ─────────────────────────────────────────────
  {
    mots: ['horaire','heure','ouvert','ouverture','ferme','quand','matin','soir','weekend','dimanche','samedi'],
    rep: `🕐 Nous sommes disponibles 7j/7 de 8h à 19h.\n\n📞 07 77 23 40 88`
  },
  // ── LOCALISATION ─────────────────────────────────────────
  {
    mots: ['miramas','adresse','localisation','lieu','situe','trouve','ville','13','bouches','rhone','provence','trajet','distance','loin'],
    rep: `📍 Nous sommes situés à Miramas, Bouches-du-Rhône (13).\n\nL'adresse exacte est communiquée lors de la prise de contact. Appelez le 07 77 23 40 88 !`
  },
  // ── PROMENADE ────────────────────────────────────────────
  {
    mots: ['promen','balade','sortie','marche','randon','foret','nature','dehors'],
    rep: `🦮 Promenades en pleine nature provençale : 15€\n\n30 à 60 minutes, seul ou en petit groupe, dans les environs de Miramas 🌿`
  },
  // ── TOILETTAGE ───────────────────────────────────────────
  {
    mots: ['toilett','bain','brossage','poil','propre','coiffure','seche','shampoo','shampooing'],
    rep: `🛁 Le toilettage simple sera bientôt disponible à 30€ !\n\n(Bain, séchage, brossage, nettoyage des oreilles)\n\nLaissez votre email sur la page Services pour être prévenu au lancement.`
  },
  // ── AVIS / RÉPUTATION ────────────────────────────────────
  {
    mots: ['avis','note','google','commentaire','reputation','etoile','stars','confiance','serieux','fiable'],
    rep: `⭐ Nous avons une note parfaite 5.0/5 sur Google avec 41 avis vérifiés !\n\nConsultez tous les témoignages sur notre page Avis 😊`
  },
  // ── ASSURANCE ────────────────────────────────────────────
  {
    mots: ['assurance','assure','responsabilite','garantie','couvert'],
    rep: `🛡️ Pour toute question sur la responsabilité ou les garanties, contactez-nous directement au 07 77 23 40 88.\n\nNous ferons le point ensemble avant la réservation.`
  },
];

const DEFAUT = `Hmm, je n'ai pas bien compris 😊\n\nVous pouvez me demander par exemple :\n• Les tarifs\n• Comment réserver\n• Les vaccins requis\n• Les conditions d'accueil\n• Le parrainage\n\nOu appelez-nous directement 📞 07 77 23 40 88 !`;

function normalise(t){
  return t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9 ]/g,' ');
}
function repondre(msg){
  const m = normalise(msg);
  let bestScore=0, bestRep=null;
  for(const r of REPONSES){
    const score=r.mots.filter(mot=>m.includes(normalise(mot))).length;
    if(score>bestScore){bestScore=score;bestRep=r.rep;}
  }
  return bestScore>0 ? bestRep : DEFAUT;
}

// ── STYLES ───────────────────────────────────────────────────
const css=`
#mdp-btn{position:fixed;bottom:24px;right:24px;z-index:9999;width:62px;height:62px;border-radius:50%;background:linear-gradient(135deg,#F5C84A,#E8A030);display:flex;align-items:center;justify-content:center;font-size:1.55rem;cursor:pointer;border:none;box-shadow:0 6px 24px rgba(232,160,48,0.5);transition:transform .3s;animation:mdppulse 2.8s ease-in-out infinite;}
#mdp-btn:hover{transform:scale(1.1);}
@keyframes mdppulse{0%,100%{box-shadow:0 6px 24px rgba(245,200,74,0.55);}50%{box-shadow:0 6px 36px rgba(232,160,48,0.9),0 0 0 10px rgba(245,200,74,0.08);}}
#mdp-notif{position:fixed;bottom:92px;right:24px;z-index:9998;background:white;border-radius:16px 16px 4px 16px;padding:12px 16px 12px 14px;box-shadow:0 8px 32px rgba(74,63,114,0.22);font-family:'Lato',sans-serif;font-size:.88rem;color:#2C2A26;max-width:220px;line-height:1.5;border:1px solid #E5E0D8;display:none;cursor:pointer;}
#mdp-notif strong{color:#4A3F72;}
#mdp-notif-close{float:right;background:none;border:none;font-size:.9rem;cursor:pointer;color:#6B6760;margin-left:8px;line-height:1;}
#mdp-box{position:fixed;bottom:92px;right:24px;z-index:9999;width:340px;max-width:calc(100vw - 32px);background:white;border-radius:20px;box-shadow:0 16px 56px rgba(74,63,114,0.25);border:1px solid #E5E0D8;display:none;flex-direction:column;overflow:hidden;font-family:'Lato',sans-serif;animation:mdpboxin .35s cubic-bezier(.23,1,.32,1);}
@keyframes mdpboxin{from{opacity:0;transform:translateY(16px) scale(.97);}to{opacity:1;transform:translateY(0) scale(1);}}
#mdp-head{background:linear-gradient(135deg,#2d1f4e,#4A3F72);padding:14px 16px;display:flex;align-items:center;gap:10px;}
#mdp-head-txt{flex:1;}
#mdp-head-txt span{color:white;font-weight:700;font-size:.95rem;display:block;}
#mdp-head-txt small{color:rgba(255,255,255,.7);font-size:.72rem;}
#mdp-close{background:none;border:none;color:rgba(255,255,255,.8);font-size:1.1rem;cursor:pointer;padding:0 4px;}
#mdp-msgs{flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:10px;max-height:340px;min-height:80px;scroll-behavior:smooth;}
.mdp-msg{max-width:84%;padding:10px 14px;border-radius:16px;font-size:.87rem;line-height:1.6;word-break:break-word;white-space:pre-wrap;}
.mdp-msg.bot{background:#F0EDF8;color:#2C2A26;border-radius:4px 16px 16px 16px;align-self:flex-start;}
.mdp-msg.user{background:linear-gradient(135deg,#7B6FA0,#4A3F72);color:white;border-radius:16px 4px 16px 16px;align-self:flex-end;}
#mdp-suggestions{display:flex;flex-wrap:wrap;gap:6px;padding:0 16px 10px;}
.mdp-sug{background:#F0EDF8;border:1px solid #D8D2EE;color:#4A3F72;border-radius:20px;padding:6px 12px;font-size:.78rem;cursor:pointer;font-family:'Lato',sans-serif;transition:background .2s;white-space:nowrap;}
.mdp-sug:hover{background:#D8D2EE;}
#mdp-form{display:flex;gap:8px;padding:12px 16px;border-top:1px solid #E5E0D8;}
#mdp-input{flex:1;border:1px solid #E5E0D8;border-radius:24px;padding:9px 14px;font-family:'Lato',sans-serif;font-size:.87rem;outline:none;color:#2C2A26;}
#mdp-input:focus{border-color:#7B6FA0;box-shadow:0 0 0 3px rgba(123,111,160,0.12);}
#mdp-send{background:linear-gradient(135deg,#7B6FA0,#4A3F72);border:none;border-radius:50%;width:36px;height:36px;flex-shrink:0;cursor:pointer;color:white;font-size:.9rem;}
@media(max-width:400px){#mdp-box,#mdp-notif{right:12px;width:calc(100vw - 24px);}#mdp-btn{right:12px;bottom:16px;}}
`;
const st=document.createElement('style');
st.textContent=css;
document.head.appendChild(st);

// ── HTML ─────────────────────────────────────────────────────
const notif=document.createElement('div');
notif.id='mdp-notif';
notif.innerHTML=`<button id="mdp-notif-close">✕</button><strong>🐾 Besoin d'aide ?</strong><br>Notre assistant répond à vos questions !`;
document.body.appendChild(notif);

const btn=document.createElement('button');
btn.id='mdp-btn';btn.title='Assistant Milou Dogs';btn.textContent='🤖';
document.body.appendChild(btn);


const box=document.createElement('div');
box.id='mdp-box';
box.innerHTML=`
<div id="mdp-head">
  <span style="font-size:1.4rem">🐾</span>
  <div id="mdp-head-txt"><span>Assistant Milou Dogs</span><small>Répond instantanément</small></div>
  <button id="mdp-close">✕</button>
</div>
<div id="mdp-msgs"></div>
<div id="mdp-suggestions">
  <button class="mdp-sug">💰 Tarifs</button>
  <button class="mdp-sug">📅 Réserver</button>
  <button class="mdp-sug">🐕 Combien de chiens ?</button>
  <button class="mdp-sug">💉 Vaccins requis ?</button>
  <button class="mdp-sug">🎁 Parrainage</button>
  <button class="mdp-sug">📞 Contact</button>
</div>
<div id="mdp-form">
  <input id="mdp-input" type="text" placeholder="Posez votre question…" autocomplete="off">
  <button id="mdp-send">➤</button>
</div>`;
document.body.appendChild(box);

// ── LOGIQUE ──────────────────────────────────────────────────
const msgs=document.getElementById('mdp-msgs');
const input=document.getElementById('mdp-input');
let open=false,notifDone=false,started=false;

function addMsg(text,role){
  const d=document.createElement('div');
  d.className='mdp-msg '+role;d.textContent=text;
  msgs.appendChild(d);msgs.scrollTop=msgs.scrollHeight;
}
function send(text){
  text=text.trim();if(!text)return;
  input.value='';
  if(!started){document.getElementById('mdp-suggestions').style.display='none';started=true;}
  addMsg(text,'user');
  setTimeout(()=>addMsg(repondre(text),'bot'),350);
}
function openChat(){
  open=true;box.style.display='flex';notif.style.display='none';notifDone=true;btn.textContent='✕';
  if(!started)addMsg("Bonjour ! 🐾 Comment puis-je vous aider ?",'bot');
  setTimeout(()=>input.focus(),100);
}
function closeChat(){open=false;box.style.display='none';btn.textContent='🤖';}

btn.addEventListener('click',()=>open?closeChat():openChat());
document.getElementById('mdp-close').addEventListener('click',closeChat);
document.getElementById('mdp-send').addEventListener('click',()=>send(input.value));
input.addEventListener('keydown',e=>{if(e.key==='Enter')send(input.value);});
notif.addEventListener('click',openChat);
document.getElementById('mdp-notif-close').addEventListener('click',e=>{e.stopPropagation();notif.style.display='none';notifDone=true;});
document.querySelectorAll('.mdp-sug').forEach(b=>b.addEventListener('click',()=>{openChat();send(b.textContent);}));

// Notification auto désactivée — trop intrusive sur mobile

// Masquer le bouton chatbot quand un champ de saisie est actif (mobile)
document.addEventListener('focusin', function(e){
  if(e.target.matches('input,textarea,select')){
    btn.style.opacity='0';btn.style.pointerEvents='none';
    notif.style.display='none';
  }
});
document.addEventListener('focusout', function(){
  setTimeout(function(){ btn.style.opacity='1';btn.style.pointerEvents=''; },300);
});

// ── Google Analytics GA4 ─────────────────────────────────────
const GA_ID = 'G-XXXXXXXXXX'; // ← remplace par ton vrai ID GA4
function loadGA() {
  if (window._gaLoaded) return;
  window._gaLoaded = true;
  const s = document.createElement('script');
  s.async = true;
  s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_ID;
  document.head.appendChild(s);
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  window.gtag = gtag;
  gtag('js', new Date());
  gtag('config', GA_ID);
}

// ── Bandeau RGPD ─────────────────────────────────────────────
(function(){
  const KEY = 'mdp_consent';
  const consent = localStorage.getItem(KEY);
  if (consent === 'accepted') { loadGA(); return; }
  if (consent === 'refused') return;

  const cssRgpd = `
  #mdp-rgpd{position:fixed;bottom:0;left:0;right:0;z-index:99999;background:#1a1625;color:white;padding:14px 20px;display:flex;align-items:center;gap:16px;flex-wrap:wrap;box-shadow:0 -4px 24px rgba(0,0,0,0.3);font-family:'Lato',sans-serif;font-size:.82rem;line-height:1.5;}
  #mdp-rgpd p{flex:1;min-width:220px;margin:0;color:rgba(255,255,255,.75);}
  #mdp-rgpd a{color:#b8aee8;text-underline-offset:3px;}
  .rgpd-btns{display:flex;gap:10px;flex-shrink:0;flex-wrap:wrap;}
  #rgpd-accept{background:var(--vert,#5a7a4a);color:white;border:none;padding:9px 22px;border-radius:30px;font-family:'Lato',sans-serif;font-weight:700;font-size:.82rem;cursor:pointer;transition:opacity .2s;}
  #rgpd-accept:hover{opacity:.85;}
  #rgpd-refuse{background:transparent;color:rgba(255,255,255,.55);border:1px solid rgba(255,255,255,.2);padding:9px 18px;border-radius:30px;font-family:'Lato',sans-serif;font-weight:700;font-size:.82rem;cursor:pointer;transition:all .2s;}
  #rgpd-refuse:hover{color:white;border-color:rgba(255,255,255,.5);}
  @media(max-width:480px){#mdp-rgpd{flex-direction:column;gap:12px;}.rgpd-btns{width:100%;}}`;
  const stR = document.createElement('style'); stR.textContent = cssRgpd; document.head.appendChild(stR);

  const bar = document.createElement('div');
  bar.id = 'mdp-rgpd';
  bar.innerHTML = `
    <p>🍪 Nous utilisons des cookies pour mesurer l'audience et améliorer votre expérience. Vos données ne sont jamais vendues. <a href="mentions-legales.html">En savoir plus</a></p>
    <div class="rgpd-btns">
      <button id="rgpd-refuse">Uniquement les nécessaires</button>
      <button id="rgpd-accept">✓ Tout accepter</button>
    </div>`;
  document.body.appendChild(bar);

  document.getElementById('rgpd-accept').addEventListener('click', function(){
    localStorage.setItem(KEY, 'accepted');
    bar.remove(); loadGA();
  });
  document.getElementById('rgpd-refuse').addEventListener('click', function(){
    localStorage.setItem(KEY, 'refused');
    bar.remove();
  });
})();

// ── Bouton retour en haut ─────────────────────────────────────
(function(){
  const css2=`#mdp-top{position:fixed;bottom:96px;right:24px;z-index:9998;width:42px;height:42px;border-radius:50%;background:white;border:1.5px solid var(--border,#E5E0D8);color:#4A3F72;font-size:1.1rem;display:none;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 4px 16px rgba(74,63,114,0.18);transition:all .3s;}
  #mdp-top:hover{background:#4A3F72;color:white;border-color:#4A3F72;}
  @media(max-width:400px){#mdp-top{right:12px;}}`;
  const st2=document.createElement('style');st2.textContent=css2;document.head.appendChild(st2);
  const topBtn=document.createElement('button');
  topBtn.id='mdp-top';topBtn.title='Retour en haut';topBtn.innerHTML='↑';topBtn.style.display='none';
  document.body.appendChild(topBtn);
  topBtn.addEventListener('click',()=>window.scrollTo({top:0,behavior:'smooth'}));
  window.addEventListener('scroll',()=>{
    topBtn.style.display=window.scrollY>400?'flex':'none';
  },{passive:true});
})();

// ── Lien Google Maps dans le footer ──────────────────────────
(function(){
  const footer=document.querySelector('footer');
  if(!footer)return;
  const socialLinks=footer.querySelector('.social-links');
  if(!socialLinks)return;
  if(socialLinks.querySelector('[href*="maps.google"]'))return; // déjà ajouté
  const a=document.createElement('a');
  a.href='https://maps.google.com/?q=Miramas+13140+Bouches-du-Rhône';
  a.target='_blank';a.rel='noopener';a.textContent='📍 Miramas (Google Maps)';
  socialLinks.appendChild(a);
})();

})();
