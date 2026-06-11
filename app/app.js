/* ============================================================
   Milou Dogs — Application mobile (PWA)
   Phase 1 : Firebase, authentification, navigation, accueil.
   ============================================================ */
'use strict';

const firebaseConfig = {
  apiKey: "AIzaSyBdjT1i0BAwmZ3R4FYCcGMyyRmkBx6E-pk",
  authDomain: "milou-dogs.firebaseapp.com",
  databaseURL: "https://milou-dogs-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "milou-dogs",
  storageBucket: "milou-dogs.firebasestorage.app",
  messagingSenderId: "574605669289",
  appId: "1:574605669289:web:af278e11680c9ed1138ab8"
};
if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.database();
auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL).catch(() => {});

const App = (function () {
  // ── État ──────────────────────────────────────────────────
  let _user = null;
  let _profile = {};
  let _chiens = {};          // { id: dog }
  let _selectedChienId = null;
  let _resaList = [];
  let _currentView = 'home';
  let _builtViews = {};      // vues déjà rendues une fois

  // ── Helpers DOM ───────────────────────────────────────────
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function toast(msg) {
    const t = $('toast'); t.textContent = msg; t.classList.add('show');
    clearTimeout(t._tm); t._tm = setTimeout(() => t.classList.remove('show'), 2600);
  }
  function openLightbox(src) { if (!src) return; $('lightbox-img').src = src; $('lightbox').classList.add('show'); }
  function closeLightbox() { $('lightbox').classList.remove('show'); $('lightbox-img').src = ''; }

  // ── Utilitaires métier ────────────────────────────────────
  function fmtDate(s) {
    if (!s) return '';
    const d = new Date(s);
    if (isNaN(d)) return s;
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  }
  function computeAge(naissance) {
    if (!naissance) return '';
    const d = new Date(naissance); if (isNaN(d)) return '';
    const now = new Date();
    let m = (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
    if (now.getDate() < d.getDate()) m--;
    if (m < 0) return '';
    if (m < 12) return m + ' mois';
    const a = Math.floor(m / 12), r = m % 12;
    return r ? a + ' an' + (a > 1 ? 's' : '') + ' et ' + r + ' mois' : a + ' an' + (a > 1 ? 's' : '');
  }
  function initials(p, n) { return ((String(p || '')[0] || '') + (String(n || '')[0] || '')).toUpperCase() || '🐾'; }
  function serviceClass(s) {
    s = (s || '').toLowerCase();
    if (s.includes('garderie')) return 'garderie';
    if (s.includes('promenade') || s.includes('balade')) return 'promenade';
    return 'pension';
  }
  function fileToDataURL(file) {
    return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(file); });
  }
  function compressImage(file, maxW, quality) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxW / img.width);
        const c = document.createElement('canvas');
        c.width = Math.round(img.width * scale); c.height = Math.round(img.height * scale);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        resolve(c.toDataURL('image/jpeg', quality || 0.8));
      };
      img.onerror = reject;
      const r = new FileReader(); r.onload = () => { img.src = r.result; }; r.onerror = reject; r.readAsDataURL(file);
    });
  }

  // ── Authentification ──────────────────────────────────────
  function showAuthTab(which) {
    const login = which === 'login';
    $('tab-login').classList.toggle('active', login);
    $('tab-signup').classList.toggle('active', !login);
    $('form-login').classList.toggle('hidden', !login);
    $('form-signup').classList.toggle('hidden', login);
    $('auth-msg').textContent = '';
  }
  function authMsg(text, ok) { const m = $('auth-msg'); m.textContent = text; m.className = 'auth-msg ' + (ok ? 'ok' : 'err'); }

  function login(e) {
    e.preventDefault();
    const btn = $('lg-btn'); btn.disabled = true;
    authMsg('');
    auth.signInWithEmailAndPassword($('lg-email').value.trim(), $('lg-pwd').value)
      .catch((err) => { authMsg(authError(err)); btn.disabled = false; });
    return false;
  }
  function signup(e) {
    e.preventDefault();
    const btn = $('su-btn'); btn.disabled = true; authMsg('');
    const prenom = $('su-prenom').value.trim(), nom = $('su-nom').value.trim();
    const email = $('su-email').value.trim(), tel = $('su-tel').value.trim(), pwd = $('su-pwd').value;
    auth.createUserWithEmailAndPassword(email, pwd)
      .then((cred) => {
        const uid = cred.user.uid;
        return db.ref('users/' + uid).update({ prenom, nom, email, telephone: tel, createdAt: Date.now() })
          .then(() => cred.user.updateProfile({ displayName: prenom }));
      })
      .catch((err) => { authMsg(authError(err)); btn.disabled = false; });
    return false;
  }
  function resetPwd() {
    const email = ($('lg-email').value || '').trim();
    if (!email) { authMsg('Entrez votre e-mail puis recliquez.'); return false; }
    auth.sendPasswordResetEmail(email)
      .then(() => authMsg('E-mail de réinitialisation envoyé ✓', true))
      .catch((err) => authMsg(authError(err)));
    return false;
  }
  function authError(err) {
    const c = (err && err.code) || '';
    if (c.includes('wrong-password') || c.includes('invalid-credential')) return 'E-mail ou mot de passe incorrect.';
    if (c.includes('user-not-found')) return 'Aucun compte avec cet e-mail.';
    if (c.includes('email-already-in-use')) return 'Un compte existe déjà avec cet e-mail.';
    if (c.includes('weak-password')) return 'Mot de passe trop court (min. 6 caractères).';
    if (c.includes('invalid-email')) return 'Adresse e-mail invalide.';
    if (c.includes('too-many-requests')) return 'Trop de tentatives, réessayez plus tard.';
    return (err && err.message) || 'Une erreur est survenue.';
  }
  function logout() { if (confirm('Se déconnecter ?')) auth.signOut(); }

  // ── Démarrage / état de connexion ─────────────────────────
  function boot() {
    auth.onAuthStateChanged(async (user) => {
      if (user) {
        _user = user;
        try { const s = await db.ref('users/' + user.uid).get(); _profile = s.exists() ? s.val() : {}; }
        catch (e) { _profile = {}; }
        enterApp();
      } else {
        _user = null; _profile = {}; _chiens = {}; _resaList = [];
        $('app').classList.add('hidden');
        $('auth-screen').classList.remove('hidden');
        hideSplash();
      }
    });
  }
  function hideSplash() {
    const sp = $('splash'); if (!sp || sp.classList.contains('gone')) return;
    sp.classList.add('gone'); setTimeout(() => sp.remove(), 450);
  }
  function enterApp() {
    $('auth-screen').classList.add('hidden');
    $('app').classList.remove('hidden');
    updateAvatar();
    listenChiens();
    listenReservations();
    _builtViews = {};
    go(_currentView || 'home');
    renderHome();
    hideSplash();
  }
  function updateAvatar() {
    const av = $('tb-avatar');
    const dog = Object.values(_chiens)[0];
    if (dog && dog.photoUrl) { av.innerHTML = '<img src="' + dog.photoUrl + '" alt="">'; }
    else { av.textContent = initials(_profile.prenom, _profile.nom); }
  }

  // ── Données temps réel ────────────────────────────────────
  function listenChiens() {
    db.ref('users/' + _user.uid + '/chiens').on('value', (snap) => {
      _chiens = {};
      snap.forEach((c) => { _chiens[c.key] = c.val(); });
      updateAvatar();
      if (_currentView === 'chiens' && App.renderChiens) App.renderChiens();
      if (_currentView === 'home') renderHome();
    });
  }
  function listenReservations() {
    db.ref('reservations').on('value', (snap) => {
      const list = [];
      snap.forEach((c) => {
        const r = c.val();
        const matchUid = r.userId === _user.uid;
        const matchEmail = r.email === _user.email || (r.client && r.client.email === _user.email);
        if (matchUid || matchEmail) list.push(Object.assign({ id: c.key }, r));
      });
      list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      _resaList = list;
      if (_currentView === 'home') renderHome();
      if (_currentView === 'reservation' && App.renderReservationList) App.renderReservationList();
    });
  }

  // ── Navigation ────────────────────────────────────────────
  const TITLES = { home: 'Accueil', reservation: 'Réservation', chiens: 'Mes chiens', avis: 'Avis', profil: 'Mon profil' };
  function go(view) {
    _currentView = view;
    document.querySelectorAll('.view').forEach((v) => v.classList.remove('active'));
    const sec = $('view-' + view); if (sec) sec.classList.add('active');
    document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('active', t.dataset.view === view));
    $('tb-title').textContent = TITLES[view] || 'Milou Dogs';
    window.scrollTo({ top: 0 });
    renderView(view);
  }
  function renderView(view) {
    if (view === 'home') return renderHome();
    if (view === 'chiens' && App.renderChiens) return App.renderChiens();
    if (view === 'reservation' && App.renderReservation) return App.renderReservation();
    if (view === 'avis' && App.renderAvis) return App.renderAvis();
    if (view === 'profil' && App.renderProfil) return App.renderProfil();
    // Placeholder pour les vues pas encore construites
    const el = $(view + '-body');
    if (el && !_builtViews[view]) {
      el.innerHTML = '<div class="card"><div class="empty">🚧 Bientôt disponible dans l\'application.<br>Cette section arrive très vite !</div></div>';
    }
  }

  // ── Accueil ───────────────────────────────────────────────
  function renderHome() {
    $('home-name').textContent = 'Bonjour ' + (_profile.prenom || '') + ' !';
    const nbChiens = Object.keys(_chiens).length;
    $('home-sub').textContent = nbChiens
      ? (nbChiens + ' compagnon' + (nbChiens > 1 ? 's' : '') + ' enregistré' + (nbChiens > 1 ? 's' : '') + ' 🐾')
      : 'Ajoutez le profil de votre chien pour commencer.';

    // Prochaine réservation à venir
    const now = Date.now();
    const upcoming = _resaList
      .filter((r) => { const d = new Date(r.dateArrivee || r["Date d'arrivée"] || 0).getTime(); return d && d >= now - 86400000; })
      .sort((a, b) => new Date(a.dateArrivee || a["Date d'arrivée"]) - new Date(b.dateArrivee || b["Date d'arrivée"]))[0];

    const host = $('home-next');
    if (upcoming) {
      const svc = upcoming.service || upcoming['Service souhaité'] || 'Séjour';
      const arr = upcoming.dateArrivee || upcoming["Date d'arrivée"];
      const dep = upcoming.dateDepart || upcoming['Date de départ'];
      const dog = upcoming.chien && upcoming.chien.nom ? upcoming.chien.nom : (upcoming['Nom du chien'] || '');
      const st = (upcoming.statut || upcoming._statut || '').toLowerCase();
      const stPill = st.includes('confirm') || st === 'confirmed' ? '<span class="pill ok">✅ Confirmée</span>'
        : st.includes('refus') ? '<span class="pill refus">❌ Refusée</span>'
          : '<span class="pill attente">⏳ En attente</span>';
      host.innerHTML =
        '<div class="section-label">Prochain séjour</div>' +
        '<div class="card"><div class="card-title">📅 ' + esc(svc) + ' ' + stPill + '</div>' +
        (dog ? '<div style="font-size:.88rem;margin-bottom:6px;">🐕 ' + esc(dog) + '</div>' : '') +
        '<div style="font-size:.85rem;color:var(--text-muted);">Du <b style="color:var(--text)">' + fmtDate(arr) + '</b>' +
        (dep ? ' au <b style="color:var(--text)">' + fmtDate(dep) + '</b>' : '') + '</div></div>';
    } else {
      host.innerHTML =
        '<div class="section-label">Prochain séjour</div>' +
        '<div class="card"><div class="empty">Aucune réservation à venir.<br><button class="btn btn-sm" style="margin-top:12px" onclick="App.go(\'reservation\')">📅 Réserver un séjour</button></div></div>';
    }
  }

  // ── API publique ──────────────────────────────────────────
  return {
    boot, go, showAuthTab, login, signup, resetPwd, logout,
    toast, openLightbox, closeLightbox, renderHome,
    // utils exposés pour les phases suivantes
    _state: () => ({ user: _user, profile: _profile, chiens: _chiens, resaList: _resaList, get selectedChienId() { return _selectedChienId; }, set selectedChienId(v) { _selectedChienId = v; } }),
    _db: () => db, _auth: () => auth,
    esc, fmtDate, computeAge, initials, serviceClass, fileToDataURL, compressImage,
    setProfile: (p) => { _profile = p; }, getProfile: () => _profile,
    getUser: () => _user, getChiens: () => _chiens, getResaList: () => _resaList,
    setSelectedChien: (id) => { _selectedChienId = id; }, getSelectedChien: () => _selectedChienId,
    updateAvatar
  };
})();

// Lightbox délégué (images .zoomable)
document.addEventListener('click', (e) => {
  const z = e.target.closest && e.target.closest('img.zoomable');
  if (z) { e.preventDefault(); App.openLightbox(z.src); }
});

App.boot();
