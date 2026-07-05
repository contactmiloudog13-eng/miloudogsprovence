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

// ── Affluence du site (compteur maison, lu depuis Milou Admin) ──────────────
// Écrit dans analytics/{total, daily/YYYY-MM-DD, dailyUnique/YYYY-MM-DD, pages/<page>}.
(function trackVisit(){
  try {
    var inc = firebase.database.ServerValue && firebase.database.ServerValue.increment
              ? firebase.database.ServerValue.increment(1) : null;
    if (inc === null) return;                       // SDK trop ancien → on ne casse rien
    var d = new Date();
    var day = d.getFullYear() + '-' + ('0'+(d.getMonth()+1)).slice(-2) + '-' + ('0'+d.getDate()).slice(-2);
    var page = (location.pathname.split('/').pop() || 'index.html').replace(/[.#$\[\]]/g, '_') || 'index_html';
    var A = _db.ref('analytics');
    A.child('total').set(inc);
    A.child('daily/' + day).set(inc);
    A.child('pages/' + page).set(inc);
    // visiteur unique par jour (approx via localStorage)
    try {
      var vk = 'mdp_visit_' + day;
      if (!localStorage.getItem(vk)) { localStorage.setItem(vk, '1'); A.child('dailyUnique/' + day).set(inc); }
    } catch(e){}
  } catch(e){}
})();
