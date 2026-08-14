/* ─────────────────────────────────────────────────────────────────────────
   site-images.js — images du site pilotées depuis l'admin (Milou Admin).
   Chaque « emplacement » d'image peut être remplacé, réinitialisé ou masqué
   sans toucher au code : l'admin écrit dans Firebase `site_images/{slotId}`,
   et ce script applique les changements au chargement de la page.
   Le registre ci-dessous est PARTAGÉ avec l'admin (garder les deux identiques).
   ───────────────────────────────────────────────────────────────────────── */
window.SITE_IMAGE_REGISTRY = {
  home: [
    { id:'hero',        cls:'hero-bg', kind:'hero-desktop', def:'hero-banner.webp', label:'Hero — ordinateur' },
    { id:'hero-mobile', cls:'hero-bg', kind:'hero-mobile',  def:'hero-mobile.webp', label:'Hero — mobile' },
    { id:'mc1', cls:'mc1', def:'IMG_0952.webp', label:'Galerie accueil 1' },
    { id:'mc2', cls:'mc2', def:'IMG_1073.webp', label:'Galerie accueil 2' },
    { id:'mc3', cls:'mc3', def:'IMG_1130.webp', label:'Galerie accueil 3' },
    { id:'mc4', cls:'mc4', def:'IMG_3307.webp', label:'Galerie accueil 4' },
    { id:'mc5', cls:'mc5', def:'IMG_1078.webp', label:'Galerie accueil 5' },
    { id:'evasion', cls:'evh-photo', def:'IMG_1073.webp', label:'Bandeau Forfait Évasion' }
  ],
  apropos: [
    { id:'ap1', cls:'ap1', def:'IMG_1075.webp', label:'Mosaïque 1' },
    { id:'ap2', cls:'ap2', def:'IMG_1138.webp', label:'Mosaïque 2' },
    { id:'ap3', cls:'ap3', def:'IMG_1146.webp', label:'Mosaïque 3' },
    { id:'ap4', cls:'ap4', def:'IMG_1191.webp', label:'Mosaïque 4' }
  ],
  evasion: [
    { id:'evhero', cls:'evhero', def:'IMG_1073.webp', label:'Grande photo du haut' },
    { id:'ev-photo-journee', cls:'ev-photo-journee', def:'IMG_1240.webp', label:'Photo « déroulé de la journée »' },
    { id:'ev1', cls:'ev1', def:'lieu-miramas-le-vieux.webp', label:'Lieu 1 — Miramas-le-Vieux' },
    { id:'ev2', cls:'ev2', def:'IMG_1073.webp', label:'Lieu 2 — Poudrerie St-Chamas' },
    { id:'ev3', cls:'ev3', def:'lieu-etang-de-berre.webp', label:'Lieu 3 — Étang de Berre' },
    { id:'ev4', cls:'ev4', def:'lieu-etang-olivier.webp', label:'Lieu 4 — Étang de l\'Olivier' },
    { id:'ev5', cls:'ev5', def:'IMG_3307.webp', label:'Lieu 5 — Bois de Castillon' },
    { id:'ev6', cls:'ev6', def:'lieu-pont-flavien.webp', label:'Lieu 6 — La Touloubre & Pont Flavien' },
    { id:'evg1', cls:'evg1', def:'IMG_1073.webp', label:'Galerie Évasion 1' },
    { id:'evg2', cls:'evg2', def:'IMG_3307.webp', label:'Galerie Évasion 2' },
    { id:'evg3', cls:'evg3', def:'IMG_1212.webp', label:'Galerie Évasion 3' }
  ],
  services: [
    { id:'g1', cls:'g1', def:'IMG_0952.webp', label:'Galerie 1' },
    { id:'g2', cls:'g2', def:'IMG_1073.webp', label:'Galerie 2' },
    { id:'g3', cls:'g3', def:'IMG_1130.webp', label:'Galerie 3' },
    { id:'g4', cls:'g4', def:'IMG_1240.webp', label:'Galerie 4' },
    { id:'g5', cls:'g5', def:'IMG_1212.webp', label:'Galerie 5' },
    { id:'tp1', cls:'tp1', def:'IMG_1078.webp', label:'Photo service 1' },
    { id:'tp2', cls:'tp2', def:'IMG_1191.webp', label:'Photo service 2' },
    { id:'tp3', cls:'tp3', def:'IMG_1075.webp', label:'Photo service 3' },
    { id:'tp4', cls:'tp4', def:'IMG_1079.webp', label:'Photo service 4' }
  ]
};

/* Détecte la page courante d'après le nom de fichier */
window.SITE_IMAGE_PAGE = (function(){
  var p = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
  if (p === '' || p === 'index.html') return 'home';
  if (p === 'a-propos.html') return 'apropos';
  if (p === 'services.html') return 'services';
  if (p === 'forfait-evasion.html') return 'evasion';
  return null;
})();

(function applySiteImages(){
  var page = window.SITE_IMAGE_PAGE;
  // Sécurité absolue : le hero ne doit jamais rester invisible
  setTimeout(function(){ var els=document.querySelectorAll('.hero-bg'); for(var i=0;i<els.length;i++) els[i].style.opacity='1'; }, 1200);

  if (!page || !window.SITE_IMAGE_REGISTRY[page]) return;
  // Lecture REST quand db-rest.js est charge (pas de WebSocket), sinon le SDK.
  var source = window.MDPdb
    ? window.MDPdb.lire('site_images')
    : ((typeof firebase === 'undefined' || !firebase.database)
        ? null
        : firebase.database().ref('site_images').once('value').then(function(snap){ return snap.val(); }));
  if (!source) return;

  source.then(function(val){
    var data = val || {};
    var slots = window.SITE_IMAGE_REGISTRY[page];
    var css = '';
    // Le hero est l'element LCP. Sa photo de remplacement vit sur Cloudinary et
    // n'est pas prechargee : l'injecter avant la fin du chargement fait attendre
    // le LCP apres CETTE image (mesure : 2,8 s -> 4,5 s sous bridage Lighthouse).
    // On l'applique donc apres `load`, une fois le LCP acquis sur l'image locale
    // prechargee. Aux visites suivantes le cache `siHero` la pose des le depart.
    var cssHero = '';
    slots.forEach(function(s){
      var ov = data[page + '__' + s.id];
      if (!ov) return;
      var estHero = (s.kind === 'hero-desktop' || s.kind === 'hero-mobile');
      if (ov.hidden) {
        var masque = '.' + s.cls + '{display:none!important;}\n';
        if (estHero) cssHero += masque; else css += masque;
        return;
      }
      if (ov.url) {
        // on force cover/centre/no-repeat pour un cadrage impeccable quelle que soit la photo
        var decl = "background-image:url('" + ov.url + "')!important;background-size:cover!important;background-position:center center!important;background-repeat:no-repeat!important;";
        var rule = '.' + s.cls + '{' + decl + '}';
        if (s.kind === 'hero-desktop')      cssHero += '@media(min-width:761px){' + rule + '}\n';
        else if (s.kind === 'hero-mobile')  cssHero += '@media(max-width:760px){' + rule + '}\n';
        else                                css += rule + '\n';
      }
    });
    function poser(id, regles){
      if (!regles) return;
      var style = document.createElement('style');
      style.id = id;
      style.textContent = regles;
      document.head.appendChild(style);
    }
    poser('site-images-overrides', css);
    if (cssHero) {
      if (document.readyState === 'complete') poser('site-images-hero', cssHero);
      else window.addEventListener('load', function(){ poser('site-images-hero', cssHero); });
    }
    // Hero : on met en cache l'image perso et on révèle (anti-flash)
    if (page === 'home') {
      var hd = data['home__hero'], hm = data['home__hero-mobile'];
      try {
        if ((hd && hd.url) || (hm && hm.url)) {
          localStorage.setItem('siHero', JSON.stringify({ desktop:(hd&&hd.url)||'', mobile:(hm&&hm.url)||'' }));
        } else {
          localStorage.removeItem('siHero');
        }
      } catch(e) {}
    }
    revealHero();
  }).catch(function(){ revealHero(); /* on garde les images d'origine */ });

  function revealHero(){
    var els = document.querySelectorAll('.hero-bg');
    for (var i=0;i<els.length;i++){ els[i].classList.add('si-ready'); els[i].style.opacity='1'; }
  }
  // Sécurité : on révèle le hero au plus tard après 1s même si Firebase tarde
  // Filet de securite conserve, mais il ne devrait plus jamais servir :
  // le hero est desormais visible des le premier rendu (cf. index.html).
  setTimeout(function(){ var els=document.querySelectorAll('.hero-bg'); for(var i=0;i<els.length;i++) els[i].style.opacity='1'; }, 1000);
})();
