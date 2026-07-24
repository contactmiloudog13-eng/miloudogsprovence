// ─── Firebase Auth — Milou Dogs Provence ───────────────────────────────────
// Requires firebase-app-compat + firebase-auth-compat + firebase-firestore-compat
// loaded via CDN before this script.

const _firebaseConfig = {
  apiKey: "AIzaSyBdjT1i0BAwmZ3R4FYCcGMyyRmkBx6E-pk",
  authDomain: "milou-dogs.firebaseapp.com",
  databaseURL: "https://milou-dogs-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "milou-dogs",
  storageBucket: "milou-dogs.firebasestorage.app",
  messagingSenderId: "574605669289",
  appId: "1:574605669289:web:af278e11680c9ed1138ab8"
};

if (!firebase.apps.length) firebase.initializeApp(_firebaseConfig);

const _auth = firebase.auth();
const _db   = firebase.database();

// Persistance LOCAL par défaut : la session reste valide même après quelques
// secondes / un rafraîchissement (évite les déconnexions intempestives).
_auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL).catch(() => {});

// ── Mise à jour de la navbar selon l'état de connexion ──────────────────────
function _updateNav(user) {
  const mobileItem   = document.getElementById('nav-auth-item');
  const desktopSlot  = document.getElementById('nav-desktop-auth');

  if (user) {
    _db.ref('users/' + user.uid).get().then(snap => {
      const data   = snap.exists() ? snap.val() : {};
      const prenom = data.prenom || user.displayName || 'Mon espace';

      if (mobileItem) mobileItem.innerHTML =
        `<a href="espace-client.html" data-icon="👤" style="color:var(--lavande-dark)!important;font-weight:800;">👤 ${prenom}</a>
         <a href="#" data-icon="🚪" onclick="logoutUser();return false;" style="color:#c0392b!important;">🚪 Déconnexion</a>`;

      if (desktopSlot) desktopSlot.innerHTML =
        `<a href="espace-client.html" style="
            font-size:.82rem;font-weight:700;text-transform:uppercase;letter-spacing:.05em;
            color:var(--lavande-dark);text-decoration:none;
            background:var(--lavande-light);padding:8px 16px;border-radius:30px;
            border:1.5px solid var(--lavande);transition:all .2s;margin-right:8px;
          " onmouseover="this.style.background='var(--lavande)';this.style.color='white';"
             onmouseout="this.style.background='var(--lavande-light)';this.style.color='var(--lavande-dark)';"
          >👤 ${prenom}</a>
         <button onclick="logoutUser()" style="
            font-size:.82rem;font-weight:700;text-transform:uppercase;letter-spacing:.05em;
            color:var(--text-muted);background:transparent;border:1.5px solid var(--border);
            padding:8px 16px;border-radius:30px;cursor:pointer;transition:all .2s;
          " onmouseover="this.style.borderColor='#c0392b';this.style.color='#c0392b';"
             onmouseout="this.style.borderColor='var(--border)';this.style.color='var(--text-muted)';"
          >Déconnexion</button>`;
    });
  } else {
    if (mobileItem) mobileItem.innerHTML =
      `<a href="connexion.html" data-icon="👤">Mon espace</a>`;

    if (desktopSlot) desktopSlot.innerHTML =
      `<a href="connexion.html" style="
          font-size:.82rem;font-weight:700;text-transform:uppercase;letter-spacing:.05em;
          color:var(--lavande);text-decoration:none;margin-right:16px;transition:color .2s;
        " onmouseover="this.style.color='var(--lavande-dark)';"
           onmouseout="this.style.color='var(--lavande)';"
        >Mon espace</a>`;
  }
}

_auth.onAuthStateChanged(_updateNav);

// ── Capacité max chiens : pilotée depuis l'admin (site_config/maxChiens) ──────
// Met à jour partout le texte « Max N chiens » / « Maximum N chiens » / « N chiens maximum ».
(function () {
  function applyMaxChiens(n) {
    if (!n || n < 1) return;
    var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null);
    var nodes = [], node;
    while ((node = walker.nextNode())) nodes.push(node);
    nodes.forEach(function (t) {
      // data-capacite-fixe : zone dont le nombre de chiens ne dépend PAS de la
      // capacité de la pension (ex. le groupe de 5 du Forfait Évasion).
      try { if (t.parentElement && t.parentElement.closest('[data-capacite-fixe]')) return; } catch (e) {}
      var v = t.nodeValue, o = v;
      // « Maximum N chiens » / « Max N chiens » / « maximum de N chiens »
      v = v.replace(/(\bMaximum\s+|\bMax\s+|\bmaximum\s+de\s+)\d+(\s+chiens\b)/gi, function (m, a, b) { return a + n + b; });
      // « N chiens maximum »
      v = v.replace(/\b\d+(\s+chiens\s+maximum\b)/gi, function (m, b) { return n + b; });
      // « N max » (stat du hero)
      v = v.replace(/\b\d+(\s+max\b)/gi, function (m, b) { return n + b; });
      if (v !== o) t.nodeValue = v;
    });
  }
  function start() {
    try {
      _db.ref('site_config/maxChiens').on('value', function (snap) {
        var n = snap.val();
        if (n) applyMaxChiens(parseInt(n));
      });
    } catch (e) {}
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();

// ── Nombre d'avis Google : piloté depuis l'admin (site_config/reviews) ─────────
// Remplace partout « N avis » / « N AVIS » par le vrai nombre saisi dans l'admin.
(function () {
  function applyReviewCount(n) {
    if (!n || n < 1) return;
    var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null);
    var nodes = [], node;
    while ((node = walker.nextNode())) nodes.push(node);
    nodes.forEach(function (t) {
      var v = t.nodeValue, o = v;
      // « 41 avis », « 41 AVIS », « 41 Avis » (préserve la casse du mot "avis")
      v = v.replace(/\b\d+(\s+)(avis)\b/gi, function (m, sp, word) { return n + sp + word; });
      if (v !== o) t.nodeValue = v;
    });
  }
  function start() {
    try {
      _db.ref('site_config/reviews').on('value', function (snap) {
        var r = snap.val() || {};
        if (r.count) applyReviewCount(parseInt(r.count));
      });
    } catch (e) {}
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();

// ── Fonctions globales ───────────────────────────────────────────────────────

function logoutUser() {
  _auth.signOut().then(() => { window.location.href = 'index.html'; });
}

// Redirige vers connexion si non connecté (pages protégées)
function requireAuth() {
  _auth.onAuthStateChanged(user => {
    if (!user) window.location.href = 'connexion.html';
  });
}

// Redirige si déjà connecté (pages login/inscription).
// __suppressAuthRedirect : posé pendant une inscription en cours pour laisser le
// temps d'écrire le profil avant la redirection manuelle (évite la double saisie).
function redirectIfLoggedIn(dest) {
  _auth.onAuthStateChanged(user => {
    if (user && !window.__suppressAuthRedirect) window.location.href = dest || 'espace-client.html';
  });
}

// ── Affluence du site — compteur maison v2 (lu depuis Milou Admin) ──────────
//
// Mesure d'audience 100 % première partie : aucun cookie, aucune donnée
// personnelle, aucun partage avec un tiers, uniquement des compteurs agrégés
// sur notre propre Firebase. Entre dans l'exemption de consentement CNIL pour
// la mesure d'audience (pas de traçage inter-sites, identifiant local anonyme
// purgé au bout de 13 mois).
//
// Structure écrite dans /analytics :
//   total, daily/<jour>, dailyUnique/<jour>, pages/<page>   ← historique v1 (conservé)
//   j/<jour>/vues        nombre de pages vues
//   j/<jour>/uniques     visiteurs uniques du jour
//   j/<jour>/sessions    nombre de visites (sessions)
//   j/<jour>/nouveaux    sessions de visiteurs jamais venus
//   j/<jour>/rebonds     sessions à une seule page
//   j/<jour>/secondes    temps cumulé passé sur le site
//   j/<jour>/pages/<page>/{v,u}   vues et visiteurs uniques par page
//   j/<jour>/entrees/<page>       page d'arrivée des sessions
//   j/<jour>/src/<source>         google, direct, instagram, ia…
//   j/<jour>/ref/<hote>           domaine référent brut
//   j/<jour>/dev/<appareil>       mobile / tablette / ordi
//   j/<jour>/nav/<navigateur>     Chrome, Safari, Firefox…
//   j/<jour>/h/<00-23>            heure d'arrivée
//   j/<jour>/ev/<evenement>       appel, whatsapp, clic_reserver…
//
// MDPtrack('nom_evenement') est exposé globalement pour marquer un événement
// métier depuis n'importe quelle page (envoi de demande, réservation Évasion…).
(function trackVisit(){
  var A, inc1, JOUR, PAGE, PREFIX;

  function nb(n){
    return firebase.database.ServerValue.increment(n);
  }
  function bump(chemin, n){
    try { A.child(chemin).set(n === 1 ? inc1 : nb(n)); } catch(e){}
  }
  function cle(s){
    // Une clé Firebase ne peut pas contenir . # $ [ ] /
    return String(s || '').replace(/[.#$\[\]\/]/g, '_').slice(0, 64) || 'autre';
  }
  function drapeau(k){
    // true si c'est la première fois aujourd'hui (mémoire locale, sans cookie)
    try {
      if (localStorage.getItem(k)) return false;
      localStorage.setItem(k, '1');
      return true;
    } catch(e){ return false; }
  }

  try {
    if (!firebase.database.ServerValue || !firebase.database.ServerValue.increment) return;
    if (location.protocol === 'file:') return;
    if (/localhost|127\.0\.0\.1/.test(location.hostname)) return;
    if (navigator.webdriver) return;
    if (/bot|crawl|spider|slurp|bingpreview|headless|lighthouse|pagespeed|gtmetrix|preview/i.test(navigator.userAgent)) return;

    // Exclusion volontaire : ouvrir n'importe quelle page avec ?noanalytics=1
    // (et ?noanalytics=0 pour se remettre dans les stats).
    try {
      if (/[?&]noanalytics=1/.test(location.search)) localStorage.setItem('mdp_no_analytics', '1');
      if (/[?&]noanalytics=0/.test(location.search)) localStorage.removeItem('mdp_no_analytics');
      if (localStorage.getItem('mdp_no_analytics')) return;
    } catch(e){}

    A     = _db.ref('analytics');
    inc1  = nb(1);
    var d = new Date();
    JOUR  = d.getFullYear() + '-' + ('0'+(d.getMonth()+1)).slice(-2) + '-' + ('0'+d.getDate()).slice(-2);
    PAGE  = cle(location.pathname.split('/').pop() || 'index.html') || 'index_html';
    PREFIX = 'j/' + JOUR + '/';

    // ── Ménage : on ne garde que les drapeaux locaux du jour ────────────────
    try {
      for (var i = localStorage.length - 1; i >= 0; i--) {
        var k = localStorage.key(i);
        if (k && /^mdp_(visit|u|up)_/.test(k) && k.indexOf(JOUR) === -1) localStorage.removeItem(k);
      }
    } catch(e){}

    // ── Identifiant visiteur anonyme (local, durée de vie 13 mois) ──────────
    var vid = null, visiteurNouveau = false;
    try {
      var brut = localStorage.getItem('mdp_vid');
      var obj  = brut ? JSON.parse(brut) : null;
      if (!obj || !obj.id || (Date.now() - (obj.ne || 0)) > 400 * 864e5) {
        obj = { id: Math.random().toString(36).slice(2) + Date.now().toString(36), ne: Date.now() };
        visiteurNouveau = true;
      }
      localStorage.setItem('mdp_vid', JSON.stringify(obj));
      vid = obj.id;
    } catch(e){}

    // ── Session (30 min d'inactivité = nouvelle visite) ─────────────────────
    var sess = null, sessionNouvelle = false;
    try {
      sess = JSON.parse(sessionStorage.getItem('mdp_sess') || 'null');
      if (sess && (Date.now() - (sess.vu || 0)) > 30 * 60000) sess = null;
    } catch(e){}
    if (!sess) { sess = { n: 0, debut: Date.now(), sec: 0 }; sessionNouvelle = true; }
    sess.n  = (sess.n || 0) + 1;
    sess.vu = Date.now();
    try { sessionStorage.setItem('mdp_sess', JSON.stringify(sess)); } catch(e){}

    // ── Compteurs historiques (v1) : on continue de les alimenter ───────────
    bump('total', 1);
    bump('daily/' + JOUR, 1);
    bump('pages/' + PAGE, 1);
    if (drapeau('mdp_visit_' + JOUR)) bump('dailyUnique/' + JOUR, 1);

    // ── Pages vues ─────────────────────────────────────────────────────────
    bump(PREFIX + 'vues', 1);
    bump(PREFIX + 'pages/' + PAGE + '/v', 1);
    bump(PREFIX + 'h/' + ('0' + d.getHours()).slice(-2), 1);
    if (drapeau('mdp_u_' + JOUR)) bump(PREFIX + 'uniques', 1);
    if (drapeau('mdp_up_' + JOUR + '_' + PAGE)) bump(PREFIX + 'pages/' + PAGE + '/u', 1);

    // ── Début de visite : source, appareil, page d'entrée ───────────────────
    if (sessionNouvelle) {
      bump(PREFIX + 'sessions', 1);
      bump(PREFIX + 'rebonds', 1);           // supposé rebond, corrigé à la 2ᵉ page
      bump(PREFIX + 'entrees/' + PAGE, 1);
      if (visiteurNouveau) bump(PREFIX + 'nouveaux', 1);

      // Source du trafic
      var ref = '', hote = '';
      try { ref = document.referrer || ''; hote = ref ? new URL(ref).hostname.replace(/^www\./, '') : ''; } catch(e){}
      var utm = '';
      try { utm = new URLSearchParams(location.search).get('utm_source') || ''; } catch(e){}

      var src;
      if (utm) src = cle(utm.toLowerCase());
      else if (!hote) src = 'direct';
      else if (hote.indexOf(location.hostname.replace(/^www\./, '')) !== -1) src = 'interne';
      else if (/google/.test(hote))                       src = 'google';
      else if (/bing/.test(hote))                         src = 'bing';
      else if (/yahoo/.test(hote))                        src = 'yahoo';
      else if (/duckduckgo/.test(hote))                   src = 'duckduckgo';
      else if (/ecosia/.test(hote))                       src = 'ecosia';
      else if (/qwant/.test(hote))                        src = 'qwant';
      else if (/instagram/.test(hote))                    src = 'instagram';
      else if (/facebook|fb\.com|fb\.me/.test(hote))      src = 'facebook';
      else if (/tiktok/.test(hote))                       src = 'tiktok';
      else if (/snapchat/.test(hote))                     src = 'snapchat';
      else if (/youtube|youtu\.be/.test(hote))            src = 'youtube';
      else if (/whatsapp|wa\.me/.test(hote))              src = 'whatsapp';
      else if (/pinterest/.test(hote))                    src = 'pinterest';
      else if (/linkedin|lnkd/.test(hote))                src = 'linkedin';
      else if (/twitter|t\.co|x\.com/.test(hote))         src = 'twitter';
      else if (/chatgpt|openai|perplexity|claude|gemini|copilot/.test(hote)) src = 'ia';
      else if (/pagesjaunes|mappy|yelp|tripadvisor/.test(hote)) src = 'annuaires';
      else src = 'autre';

      bump(PREFIX + 'src/' + src, 1);
      if (hote && src !== 'interne') bump(PREFIX + 'ref/' + cle(hote), 1);

      // Appareil
      var ua = navigator.userAgent;
      var appareil = /iPad|Tablet|PlayBook|Silk|(Android(?!.*Mobi))/i.test(ua) ? 'tablette'
                   : /Mobi|Android|iPhone|iPod|Windows Phone/i.test(ua)       ? 'mobile'
                   : 'ordi';
      bump(PREFIX + 'dev/' + appareil, 1);

      // Navigateur
      var navi = /Edg\//.test(ua)                      ? 'Edge'
               : /OPR\/|Opera/.test(ua)                ? 'Opera'
               : /SamsungBrowser/.test(ua)             ? 'Samsung'
               : /Firefox\//.test(ua)                  ? 'Firefox'
               : /Chrome\//.test(ua)                   ? 'Chrome'
               : /Safari\//.test(ua)                   ? 'Safari'
               : 'Autre';
      bump(PREFIX + 'nav/' + navi, 1);
    }

    // 2ᵉ page de la visite → ce n'était finalement pas un rebond
    if (sess.n === 2) bump(PREFIX + 'rebonds', -1);

    // ── Temps passé : battement toutes les 20 s, plafonné à 30 min/visite ───
    var PAS = 20, PLAFOND = 1800;
    var battement = setInterval(function(){
      if (document.hidden) return;
      if ((sess.sec || 0) >= PLAFOND) { clearInterval(battement); return; }
      sess.sec = (sess.sec || 0) + PAS;
      try { sessionStorage.setItem('mdp_sess', JSON.stringify(sess)); } catch(e){}
      bump(PREFIX + 'secondes', PAS);
    }, PAS * 1000);

    // ── Événements : appel, WhatsApp, email, clic « Réserver » ──────────────
    window.MDPtrack = function(nom){ bump(PREFIX + 'ev/' + cle(nom), 1); };

    document.addEventListener('click', function(e){
      var a = e.target && e.target.closest ? e.target.closest('a,[data-ev]') : null;
      if (!a) return;
      var manuel = a.getAttribute('data-ev');
      if (manuel) { window.MDPtrack(manuel); return; }
      var href = (a.getAttribute('href') || '').toLowerCase();
      if (!href) return;
      if (href.indexOf('tel:') === 0)                                window.MDPtrack('appel');
      else if (href.indexOf('mailto:') === 0)                        window.MDPtrack('email');
      else if (href.indexOf('wa.me') !== -1 || href.indexOf('whatsapp') !== -1) window.MDPtrack('whatsapp');
      else if (href.indexOf('maps') !== -1 && href.indexOf('goo') !== -1)       window.MDPtrack('itineraire');
      else if (href.indexOf('forfait-evasion') !== -1)               window.MDPtrack('clic_evasion');
      else if (href.indexOf('reservation.html') !== -1)              window.MDPtrack('clic_reserver');
    }, true);
  } catch(e){}
})();
