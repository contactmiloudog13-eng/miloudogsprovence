/* ============================================================
   Milou Dogs — Vue « Réservation » (Phase 3)
   Formulaire de réservation + liste de mes réservations.
   Écrit dans `reservations` + `/clients/` (comme reservation.html).
   ============================================================ */
(function () {
  const esc = App.esc;
  const db = App._db();

  const SERVICES = [
    { id: 'pension', label: '🏠 Pension complète (nuit & journée)', price: 20, unit: 'nuit', range: true },
    { id: 'garderie', label: '☀️ Garderie journée', price: 20, unit: 'jour', range: true },
    { id: 'demi', label: '🌤️ Garderie demi-journée', price: 10, unit: 'jour', range: false },
    { id: 'test', label: '🐣 Test demi-journée', price: 10, unit: 'fixe', range: false },
    { id: 'promenade', label: '🦮 Promenade', price: 15, unit: 'fixe', range: false },
    { id: 'toilettage', label: '🛁 Toilettage', price: 30, unit: 'fixe', range: false }
  ];
  let _svc = null;

  App.renderReservation = function () {
    const body = document.getElementById('reservation-body');
    const ds = App.getChiens();
    const dogOpts = Object.values(ds).map((d) => '<option value="' + esc(d.nom) + '">' + esc(d.nom) + '</option>').join('');
    const today = new Date().toISOString().slice(0, 10);

    body.innerHTML =
      '<div class="card">' +
      '<div class="card-title">📅 Nouvelle réservation</div>' +
      '<div class="field"><label>Prestation</label><div id="svc-chips" class="dog-chips" style="flex-wrap:wrap;">' +
      SERVICES.map((s) => '<button type="button" class="dog-chip" data-svc="' + s.id + '" onclick="App.resaSvc(\'' + s.id + '\')">' + esc(s.label) + '</button>').join('') +
      '</div></div>' +

      '<div class="field"><label>Pour quel chien ?</label>' +
      (dogOpts
        ? '<select id="r-chien">' + dogOpts + '</select>'
        : '<input type="text" id="r-chien" placeholder="Nom de votre chien"><div style="font-size:.74rem;color:var(--text-muted);margin-top:6px;">💡 Ajoutez le profil complet dans « Mes chiens » pour transmettre carnet & vaccins.</div>') +
      '</div>' +

      '<div class="row-2">' +
      '<div class="field"><label>Date d\'arrivée</label><input type="date" id="r-arr" min="' + today + '"></div>' +
      '<div class="field"><label>Heure</label><input type="time" id="r-arrh"></div>' +
      '</div>' +
      '<div class="field" id="r-dep-field"><label>Date de départ</label><input type="date" id="r-dep" min="' + today + '"></div>' +

      '<div class="field"><label>Message (facultatif)</label><textarea id="r-msg" rows="3" placeholder="Précisions, besoins particuliers…"></textarea></div>' +

      '<div id="r-estimate" style="font-size:.85rem;color:var(--lavande-dark);font-weight:700;margin-bottom:12px;"></div>' +
      '<button class="btn btn-soleil" id="r-btn" onclick="App.resaSubmit()">📩 Envoyer la demande</button>' +
      '<div class="auth-msg" id="r-msg-out"></div>' +
      '</div>' +

      '<div class="section-label">Mes réservations</div>' +
      '<div id="resa-list"></div>' +

      '<div class="section-label">🧾 Mes factures</div>' +
      '<div id="factures-list"></div>';

    _svc = null;
    ['r-arr', 'r-dep'].forEach((id) => { const e = document.getElementById(id); if (e) e.addEventListener('change', updateEstimate); });
    App.renderReservationList();
  };

  App.resaSvc = function (id) {
    _svc = SERVICES.find((s) => s.id === id);
    document.querySelectorAll('#svc-chips .dog-chip').forEach((c) => c.classList.toggle('active', c.dataset.svc === id));
    document.getElementById('r-dep-field').style.display = _svc && _svc.range ? '' : 'none';
    updateEstimate();
  };

  function nights() {
    const a = document.getElementById('r-arr').value, d = document.getElementById('r-dep').value;
    if (!a || !d) return 0;
    const n = Math.round((new Date(d) - new Date(a)) / 86400000);
    return n > 0 ? n : 0;
  }
  function updateEstimate() {
    const el = document.getElementById('r-estimate'); if (!el || !_svc) { if (el) el.textContent = ''; return; }
    let txt = '';
    if (_svc.range) {
      const n = nights() || 1;
      txt = 'Estimation : ~' + (n * _svc.price) + '€ (' + n + ' × ' + _svc.price + '€) · à confirmer';
    } else {
      txt = 'Tarif : ' + _svc.price + '€ · à confirmer';
    }
    el.textContent = '💶 ' + txt;
  }

  App.resaSubmit = async function () {
    const out = document.getElementById('r-msg-out');
    out.className = 'auth-msg';
    if (!_svc) { out.classList.add('err'); out.textContent = 'Choisissez une prestation.'; return; }
    const chienEl = document.getElementById('r-chien');
    const chienNom = (chienEl.value || '').trim();
    const arr = document.getElementById('r-arr').value;
    if (!chienNom) { out.classList.add('err'); out.textContent = 'Indiquez le chien.'; return; }
    if (!arr) { out.classList.add('err'); out.textContent = 'Choisissez une date d\'arrivée.'; return; }

    const btn = document.getElementById('r-btn'); btn.disabled = true;
    const p = App.getProfile(); const user = App.getUser();

    // Profil chien complet (photo, carnet, vaccins…) si disponible
    const ds = App.getChiens();
    const match = Object.values(ds).find((d) => (d.nom || '').trim().toLowerCase() === chienNom.toLowerCase());
    const chien = match ? Object.assign({}, match) : { nom: chienNom };

    const dep = _svc.range ? document.getElementById('r-dep').value : '';
    const estimate = _svc.range ? String((nights() || 1) * _svc.price) : String(_svc.price);

    const fbData = {
      userId: user.uid,
      statut: 'en-attente',
      email: p.email || user.email || '',
      client: { prenom: p.prenom || '', nom: p.nom || '', telephone: p.telephone || '', email: p.email || user.email || '' },
      chien: chien,
      service: _svc.label,
      nbChiens: '1',
      dateArrivee: arr,
      heureArrivee: document.getElementById('r-arrh').value || '',
      dateDepart: dep,
      heureDepart: '',
      prix: estimate,
      message: document.getElementById('r-msg').value.trim(),
      parrainage: '',
      createdAt: Date.now()
    };

    try {
      await db.ref('reservations').push(fbData);
      // Fiche client persistante (indépendante de la réservation)
      try {
        const tel = (p.telephone || '').replace(/\s/g, '');
        const key = tel || ((p.prenom || '') + '_' + (p.nom || '')).toLowerCase().replace(/\s/g, '_');
        const ref = db.ref('clients/' + key);
        const snap = await ref.get(); const ex = snap.val() || {};
        await ref.update({
          prenom: p.prenom || '', nom: p.nom || '', email: p.email || user.email || '',
          telephone: tel, adresse: p.adresse || '', codePostal: p.codePostal || '', ville: p.ville || '',
          createdAt: ex.createdAt || Date.now(), updatedAt: Date.now(), nbResas: (ex.nbResas || 0) + 1
        });
        if (chien.nom) {
          const cs = await ref.child('chiens').get(); const chiens = cs.val() || {};
          const entry = Object.entries(chiens).find(([, c]) => c.nom === chien.nom);
          if (entry) await ref.child('chiens/' + entry[0]).update(Object.assign({}, chien, { updatedAt: Date.now() }));
          else await ref.child('chiens').push(Object.assign({}, chien, { createdAt: Date.now() }));
        }
      } catch (e) { /* non bloquant */ }

      out.classList.add('ok'); out.textContent = '✓ Demande envoyée ! Nous revenons vers vous sous 24h.';
      App.toast('Réservation envoyée 🎉');
      setTimeout(() => App.renderReservation(), 1500);
    } catch (e) {
      out.classList.add('err'); out.textContent = 'Erreur : ' + (e.message || 'envoi impossible');
      btn.disabled = false;
    }
  };

  App.renderReservationList = function () {
    const host = document.getElementById('resa-list'); if (!host) return;
    const list = App.getResaList();
    if (!list.length) { host.innerHTML = '<div class="card"><div class="empty">Aucune réservation pour le moment.</div></div>'; App.renderFacturesList(); return; }
    host.innerHTML = list.map((r) => {
      const svc = r.service || r['Service souhaité'] || 'Séjour';
      const arr = r.dateArrivee || r["Date d'arrivée"];
      const dep = r.dateDepart || r['Date de départ'];
      const dog = (r.chien && r.chien.nom) || r['Nom du chien'] || '';
      const st = (r.statut || r._statut || '').toLowerCase();
      const pill = st.includes('confirm') ? '<span class="pill ok">✅ Confirmée</span>'
        : st.includes('refus') ? '<span class="pill refus">❌ Refusée</span>'
          : '<span class="pill attente">⏳ En attente</span>';
      return '<div class="card"><div class="card-title" style="justify-content:space-between;">' +
        '<span>' + esc(svc) + '</span>' + pill + '</div>' +
        (dog ? '<div style="font-size:.85rem;margin-bottom:4px;">🐕 ' + esc(dog) + '</div>' : '') +
        '<div style="font-size:.82rem;color:var(--text-muted);">Du <b style="color:var(--text)">' + App.fmtDate(arr) + '</b>' +
        (dep ? ' au <b style="color:var(--text)">' + App.fmtDate(dep) + '</b>' : '') + '</div></div>';
    }).join('');
    App.renderFacturesList();
  };

  // Factures = réservations acceptées par Milou Dogs (statut « confirmé »)
  App.renderFacturesList = function () {
    const host = document.getElementById('factures-list'); if (!host) return;
    const confirmed = App.getResaList().filter((r) => {
      const st = (r.statut || r._statut || '').toLowerCase();
      return st.includes('confirm') || st.includes('accept');
    });
    if (!confirmed.length) {
      host.innerHTML = '<div class="card"><div class="empty">Vos factures apparaîtront ici une fois vos réservations acceptées.</div></div>';
      return;
    }
    host.innerHTML = confirmed.map((r) => {
      const svc = r.service || r['Service souhaité'] || 'Séjour';
      const arr = r.dateArrivee || r["Date d'arrivée"];
      const dep = r.dateDepart || r['Date de départ'];
      const dog = (r.chien && r.chien.nom) || r['Nom du chien'] || '';
      const prix = r.prix || r.montant || r.total || '';
      const num = 'MDP-' + String(r.createdAt || r.key || Date.now()).replace(/[^0-9]/g, '').slice(-6);
      return '<div class="card">' +
        '<div class="card-title" style="justify-content:space-between;"><span>🧾 ' + esc(svc) + '</span>' +
        '<span class="pill ok">✅ Acceptée</span></div>' +
        '<div style="font-family:monospace;font-size:.74rem;color:var(--text-muted);margin-bottom:6px;">N° ' + esc(num) + '</div>' +
        (dog ? '<div style="font-size:.85rem;margin-bottom:4px;">🐕 ' + esc(dog) + '</div>' : '') +
        '<div style="font-size:.82rem;color:var(--text-muted);margin-bottom:8px;">Du <b style="color:var(--text)">' + App.fmtDate(arr) + '</b>' +
        (dep ? ' au <b style="color:var(--text)">' + App.fmtDate(dep) + '</b>' : '') + '</div>' +
        '<div style="display:flex;justify-content:space-between;align-items:center;border-top:1px solid var(--border);padding-top:8px;">' +
        '<span style="font-size:.78rem;color:var(--text-muted);">Montant</span>' +
        '<span style="font-size:1.1rem;font-weight:800;color:var(--lavande-dark);">' + (prix ? esc(String(prix).replace(/€?$/, '')) + ' €' : '—') + '</span>' +
        '</div></div>';
    }).join('');
  };
})();
