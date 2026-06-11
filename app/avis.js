/* ============================================================
   Milou Dogs — Vue « Avis » (Phase 5)
   Laisser un avis (→ node `avis`) + liste des avis publiés.
   ============================================================ */
(function () {
  const esc = App.esc;
  const db = App._db();
  let _note = 5;

  App.renderAvis = function () {
    const body = document.getElementById('avis-body');
    body.innerHTML =
      '<div class="card">' +
      '<div class="card-title">⭐ Laisser un avis</div>' +
      '<div class="stars" id="avis-stars">' +
      [1, 2, 3, 4, 5].map((n) => '<span onclick="App.avisStar(' + n + ')">★</span>').join('') +
      '</div>' +
      '<div class="field" style="margin-top:12px;"><textarea id="avis-text" rows="4" placeholder="Partagez votre expérience avec Milou Dogs…" maxlength="600"></textarea></div>' +
      '<button class="btn btn-soleil" id="avis-btn" onclick="App.avisSubmit()">📨 Publier mon avis</button>' +
      '<div class="auth-msg" id="avis-out"></div>' +
      '</div>' +
      '<div class="section-label">Ce qu\'ils en pensent</div>' +
      '<div id="avis-list"><div class="card"><div class="empty"><span class="spin" style="border-color:rgba(123,111,160,.3);border-top-color:var(--lavande);margin:0 auto;"></span></div></div></div>';
    _note = 5; paintStars();
    loadAvis();
  };

  function paintStars() {
    document.querySelectorAll('#avis-stars span').forEach((s, i) => s.classList.toggle('off', i >= _note));
  }
  App.avisStar = function (n) { _note = n; paintStars(); };

  App.avisSubmit = async function () {
    const out = document.getElementById('avis-out'); out.className = 'auth-msg';
    const texte = document.getElementById('avis-text').value.trim();
    if (!texte) { out.classList.add('err'); out.textContent = 'Écrivez quelques mots 🙂'; return; }
    const btn = document.getElementById('avis-btn'); btn.disabled = true;
    const p = App.getProfile(); const user = App.getUser();
    try {
      await db.ref('avis').push({
        userId: user.uid,
        prenom: p.prenom || user.displayName || '',
        nom: p.nom || '',
        note: _note,
        texte: texte,
        visible: true,
        source: 'app',
        createdAt: Date.now()
      });
      out.classList.add('ok'); out.textContent = '✓ Merci pour votre avis !';
      document.getElementById('avis-text').value = '';
      App.toast('Avis publié, merci 🐾');
      loadAvis();
    } catch (e) { out.classList.add('err'); out.textContent = 'Erreur : ' + (e.message || 'envoi'); }
    btn.disabled = false;
  };

  function getInitiales(prenom, nom, fallback) {
    const a = (String(prenom || '')[0] || ''); const b = (String(nom || '')[0] || '');
    return (a + b).toUpperCase() || (String(fallback || 'A')[0] || 'A').toUpperCase();
  }
  function stars(n) { n = Math.max(1, Math.min(5, n || 5)); return '★'.repeat(n) + '☆'.repeat(5 - n); }

  async function loadAvis() {
    const host = document.getElementById('avis-list');
    try {
      const [aSnap, gSnap] = await Promise.all([
        db.ref('avis').once('value'),
        db.ref('google_avis').once('value')
      ]);
      const items = [];
      aSnap.forEach((c) => { const a = c.val(); if (a && a.visible !== false) items.push({ nom: ((a.prenom || '') + ' ' + ((a.nom || '')[0] || '') + (a.nom ? '.' : '')).trim() || 'Client', texte: a.texte, note: a.note, ts: a.createdAt || 0, src: 'client' }); });
      gSnap.forEach((c) => { const a = c.val(); if (a) items.push({ nom: a.nom || 'Client', texte: a.texte, note: a.note, ts: a.ts || 0, src: 'google', date: a.date }); });
      items.sort((x, y) => (y.ts || 0) - (x.ts || 0));
      if (!items.length) { host.innerHTML = '<div class="card"><div class="empty">Aucun avis pour le moment. Soyez le premier !</div></div>'; return; }
      host.innerHTML = items.slice(0, 30).map((a) =>
        '<div class="avis-card"><div class="avis-head">' +
        '<div class="avis-av">' + esc(getInitiales(a.nom.split(' ')[0], a.nom.split(' ')[1], a.nom)) + '</div>' +
        '<div><div class="avis-name">' + esc(a.nom) + '</div>' +
        '<div class="avis-date">' + (a.src === 'google' ? 'Avis Google ✓' : (a.ts ? App.fmtDate(new Date(a.ts).toISOString()) : '')) + '</div></div>' +
        '<div style="margin-left:auto;color:var(--gold);font-size:.95rem;">' + stars(a.note) + '</div>' +
        '</div><div class="avis-text">« ' + esc(a.texte || '') + ' »</div></div>'
      ).join('');
    } catch (e) {
      host.innerHTML = '<div class="card"><div class="empty">Impossible de charger les avis.</div></div>';
    }
  }
})();
