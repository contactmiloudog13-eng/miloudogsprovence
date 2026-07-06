/* ============================================================
   Milou Dogs — Vue « Galerie »
   Photos depuis `gallery_photos`, optimisées Cloudinary (f_auto,
   q_auto, largeur adaptée), chargement paresseux, lightbox.
   ============================================================ */
(function () {
  const esc = App.esc;
  const db = App._db();

  // Optimisation Cloudinary : format auto + qualité auto + largeur cible
  function cldOpt(u, w) {
    try {
      if (!u || u.indexOf('res.cloudinary.com') === -1 || u.indexOf('/upload/') === -1) return u;
      if (u.indexOf('f_auto') !== -1) return u;
      return u.replace('/upload/', '/upload/f_auto,q_auto,w_' + (w || 500) + ',c_limit/');
    } catch (e) { return u; }
  }

  let _photos = null;

  // Aperçu horizontal pour l'accueil (6 dernières photos)
  App.galeriePreview = function (hostId) {
    const host = document.getElementById(hostId); if (!host) return;
    loadPhotos().then((ph) => {
      if (!ph.length) { host.style.display = 'none'; return; }
      host.innerHTML =
        '<div class="section-label" style="display:flex;justify-content:space-between;align-items:center;">' +
        '<span>📸 En photos</span>' +
        '<button onclick="App.go(\'galerie\')" style="background:none;border:none;color:var(--lavande);font-weight:700;font-size:.8rem;cursor:pointer;">Tout voir →</button></div>' +
        '<div class="gal-strip">' + ph.slice(0, 8).map((p, i) =>
          '<div class="gal-scell" onclick="App.galOpen(' + i + ')"><img loading="lazy" decoding="async" src="' + esc(cldOpt(p.url, 260)) + '" alt=""></div>'
        ).join('') + '</div>';
    });
  };

  App.renderGalerie = function () {
    const body = document.getElementById('galerie-body');
    if (_photos) { paint(body); return; }
    body.innerHTML = skeleton();
    loadPhotos().then(() => paint(body))
      .catch(() => { body.innerHTML = '<div class="card"><div class="empty">Galerie momentanément indisponible.</div></div>'; });
  };

  function loadPhotos() {
    if (_photos) return Promise.resolve(_photos);
    return db.ref('gallery_photos').orderByChild('ts').once('value').then((snap) => {
      const arr = [];
      snap.forEach((c) => { const v = c.val(); if (v && v.url) arr.push(v); });
      arr.reverse(); // plus récentes en premier
      _photos = arr;
      return _photos;
    });
  }

  function skeleton() {
    let s = '<div class="gal-grid">';
    for (let i = 0; i < 9; i++) s += '<div class="gal-cell skel"></div>';
    return s + '</div>';
  }

  function paint(body) {
    if (!_photos.length) { body.innerHTML = '<div class="card"><div class="empty">Aucune photo pour le moment 🐾</div></div>'; return; }
    body.innerHTML =
      '<div style="font-size:.82rem;color:var(--text-muted);margin-bottom:12px;">' + _photos.length + ' photo' + (_photos.length > 1 ? 's' : '') + ' de nos pensionnaires 🐾</div>' +
      '<div class="gal-grid">' + _photos.map((p, i) =>
        '<div class="gal-cell" onclick="App.galOpen(' + i + ')">' +
        '<img loading="lazy" decoding="async" src="' + esc(cldOpt(p.url, 500)) + '" alt="' + esc(p.caption || 'Photo Milou Dogs') + '">' +
        (p.caption ? '<span class="gal-cap">' + esc(p.caption) + '</span>' : '') +
        '</div>').join('') + '</div>';
  }

  App.galOpen = function (i) {
    const p = _photos && _photos[i]; if (!p) return;
    App.openLightbox(cldOpt(p.url, 1200));
  };
})();
