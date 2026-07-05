/* ============================================================
   Milou Dogs — Vue « Réserver » v2
   Toutes les fonctionnalités du site : tarifs pilotés depuis
   l'admin (site_config/tarifs), visite à domicile tous animaux
   (période du/au + fréquence /jour ou /semaine), récupération à
   domicile, Pack Duo, remises multi-chiens, disponibilités en
   direct, devis détaillé, journal de séjour, factures.
   ============================================================ */
(function () {
  const esc = App.esc;
  const db = App._db();

  /* ── Tarifs pilotés depuis l'admin (temps réel) ── */
  const T = {
    pension: 25, garderie: 20, demi: 10, promenade: 15, toilettage: 30,
    remise2: 10, remise3: 15, packDuo: 33,
    deplMiramas: 10, deplFixe: 5, deplKm: 0.5,
    vChien: 15, vChat: 12, vFuret: 13, vPoules: 13, vLapin: 10,
    vRongeur: 10, vOiseau: 10, vTortue: 10, vPoisson: 8, vSupp1h: 5
  };
  try {
    db.ref('site_config/tarifs').on('value', (s) => {
      const t = s.val() || {};
      Object.keys(t).forEach((k) => { if (t[k] != null && k in T) T[k] = Number(t[k]); });
      if (t.visite != null && t.vChien == null) T.vChien = Number(t.visite);
      if (document.getElementById('r-estimate')) updateEstimate();
    });
  } catch (e) {}

  const ANIMALS = [
    { id: 'chien', n: '🐶 Chien', k: 'vChien' }, { id: 'chat', n: '🐱 Chat', k: 'vChat' },
    { id: 'furet', n: '🦡 Furet', k: 'vFuret' }, { id: 'poules', n: '🐔 Poules / basse-cour', k: 'vPoules' },
    { id: 'lapin', n: '🐰 Lapin', k: 'vLapin' }, { id: 'rongeur', n: '🐹 Rongeur', k: 'vRongeur' },
    { id: 'oiseau', n: '🦜 Oiseau', k: 'vOiseau' }, { id: 'tortue', n: '🐢 Tortue / reptile', k: 'vTortue' },
    { id: 'poisson', n: '🐠 Poissons', k: 'vPoisson' }
  ];

  function SERVICES() {
    return [
      { id: 'pension', label: '🏠 Pension (nuit & journée)', price: T.pension, unit: 'nuit', range: true },
      { id: 'garderie', label: '☀️ Garderie journée', price: T.garderie, unit: 'jour', range: true },
      { id: 'demi', label: '🌤️ Demi-journée', price: T.demi, unit: 'fixe', range: false },
      { id: 'promenade', label: '🦮 Promenade', price: T.promenade, unit: 'fixe', range: false },
      { id: 'toilettage', label: '🛁 Toilettage', price: T.toilettage, unit: 'fixe', range: false },
      { id: 'visite', label: '🏡 Visite à domicile', price: 0, unit: 'visite', range: false },
      { id: 'packduo', label: '🎁 Pack Duo (pension + 2ᵉ animal)', price: 0, unit: 'pack', range: true }
    ];
  }
  let _svc = null;
  const V = { animal: 'chien', dur: 30, freq: 1, unit: 'jour', km: null, city: '', address: '' };
  const PK = { on: false, km: null, city: '', address: '', price: 0 };

  /* ── Géocodage (BAN) + distance depuis chez Milou ── */
  const HOME = [5.013373, 43.570176];
  function havKm(a, b) {
    const R = 6371, dLa = (b[1] - a[1]) * Math.PI / 180, dLo = (b[0] - a[0]) * Math.PI / 180;
    const x = Math.sin(dLa / 2) ** 2 + Math.cos(a[1] * Math.PI / 180) * Math.cos(b[1] * Math.PI / 180) * Math.sin(dLo / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
  }
  function geocode(q, cb) {
    fetch('https://api-adresse.data.gouv.fr/search/?limit=1&q=' + encodeURIComponent(q))
      .then((r) => r.json()).then((j) => {
        const f = j && j.features && j.features[0];
        if (!f) return cb(null);
        cb({ km: Math.round(havKm(HOME, f.geometry.coordinates) * 1.3 * 10) / 10, city: f.properties.city || '', label: f.properties.label });
      }).catch(() => cb(null));
  }
  function travelPrice(km, city) {
    if (/miramas/i.test(city || '')) return T.deplMiramas;
    const ar = Math.round(km * 2 * 10) / 10;
    return Math.round((T.deplFixe + ar * T.deplKm) * 100) / 100;
  }

  /* ── Vue principale ── */
  App.renderReservation = function () {
    const body = document.getElementById('reservation-body');
    const ds = App.getChiens();
    const dogOpts = Object.values(ds).map((d) => '<option value="' + esc(d.nom) + '">' + esc(d.nom) + '</option>').join('');
    const today = new Date().toISOString().slice(0, 10);
    const aniOpts = ANIMALS.map((a) => '<option value="' + a.id + '">' + a.n + ' — dès ' + T[a.k] + '€</option>').join('');

    body.innerHTML =
      '<div class="card">' +
      '<div class="card-title">📅 Nouvelle réservation</div>' +
      '<div class="field"><label>Prestation</label><div id="svc-chips" class="dog-chips" style="flex-wrap:wrap;">' +
      SERVICES().map((s) => '<button type="button" class="dog-chip" data-svc="' + s.id + '" onclick="App.resaSvc(\'' + s.id + '\')">' + esc(s.label) + '</button>').join('') +
      '</div></div>' +

      // ── Bloc garde classique ──
      '<div id="r-classic">' +
      '<div class="field"><label>Pour quel animal ?</label>' +
      (dogOpts ? '<select id="r-chien">' + dogOpts + '</select>'
        : '<input type="text" id="r-chien" placeholder="Nom de votre animal"><div style="font-size:.74rem;color:var(--text-muted);margin-top:6px;">💡 Ajoutez son profil dans « Mes animaux » pour transmettre carnet & vaccins.</div>') +
      '</div>' +
      '<div class="field"><label>Nombre de chiens</label><select id="r-nb" onchange="App.resaCalc()">' +
      '<option value="1">1 chien</option><option value="2">2 chiens (−' + T.remise2 + '%)</option><option value="3">3 chiens et + (−' + T.remise3 + '%)</option></select></div>' +
      '<div class="row-2">' +
      '<div class="field"><label>Date d\'arrivée</label><input type="date" id="r-arr" min="' + today + '"></div>' +
      '<div class="field"><label>Heure</label><input type="time" id="r-arrh"></div>' +
      '</div>' +
      '<div class="row-2" id="r-dep-field">' +
      '<div class="field"><label>Date de fin</label><input type="date" id="r-dep" min="' + today + '"></div>' +
      '<div class="field"><label>Heure de départ</label><input type="time" id="r-deph"></div>' +
      '</div>' +
      // Récupération à domicile
      '<div class="field" id="r-pickup-wrap"><label style="display:flex;align-items:center;gap:8px;">' +
      '<input type="checkbox" id="r-pickup" style="width:18px;height:18px;" onchange="App.resaPickup()"> 🚗 Récupération à domicile</label>' +
      '<div id="r-pickup-panel" style="display:none;margin-top:8px;">' +
      '<input type="text" id="r-pickup-addr" placeholder="Votre adresse (ex : 5 rue des Écoles, Istres)" onchange="App.resaPickupAddr()">' +
      '<div id="r-pickup-res" style="font-size:.78rem;color:var(--text-muted);margin-top:6px;"></div></div></div>' +
      '</div>' +

      // ── Bloc visite à domicile ──
      '<div id="r-visite" style="display:none;">' +
      '<div class="field"><label>Quel animal dois-je garder ?</label><select id="v-animal" onchange="App.resaCalc()">' + aniOpts + '</select></div>' +
      '<div class="field"><label>Durée par passage</label><div class="dog-chips">' +
      '<button type="button" class="dog-chip active" id="v-d30" onclick="App.resaDur(30)">30 min</button>' +
      '<button type="button" class="dog-chip" id="v-d60" onclick="App.resaDur(60)">1 heure (+' + T.vSupp1h + '€)</button></div></div>' +
      '<div class="row-2">' +
      '<div class="field"><label>Du (1ᵉʳ passage)</label><input type="date" id="v-start" min="' + today + '" onchange="App.resaCalc()"></div>' +
      '<div class="field"><label>Au (dernier)</label><input type="date" id="v-end" min="' + today + '" onchange="App.resaCalc()"></div>' +
      '</div>' +
      '<div class="row-2">' +
      '<div class="field"><label>Passages</label><select id="v-freq" onchange="App.resaCalc()"><option value="1">1</option><option value="2">2</option><option value="3">3</option><option value="4">4</option></select></div>' +
      '<div class="field"><label>Fréquence</label><select id="v-unit" onchange="App.resaCalc()"><option value="jour">par jour</option><option value="semaine">par semaine</option></select></div>' +
      '</div>' +
      '<div class="field"><label>Adresse où je dois passer</label><input type="text" id="v-addr" placeholder="Adresse complète" onchange="App.resaVisiteAddr()">' +
      '<div id="v-addr-res" style="font-size:.78rem;color:var(--text-muted);margin-top:6px;"></div></div>' +
      '<div id="v-summary" style="display:none;background:var(--lavande-light);border-radius:10px;padding:9px 12px;margin-bottom:12px;font-size:.8rem;color:var(--lavande-dark);font-weight:700;line-height:1.5;"></div>' +
      '</div>' +

      // ── Bandeau Pack Duo ──
      '<div id="r-packinfo" style="display:none;background:#FBEFD0;border:1px solid #E8A84C;border-radius:12px;padding:10px 12px;margin-bottom:12px;font-size:.8rem;color:#7a5a1a;line-height:1.5;">' +
      '🎁 <b>Pack Duo :</b> votre chien en pension chez nous + visites à domicile pour votre 2ᵉ animal, avec <b style="color:#159067;">−' + T.packDuo + '% sur les visites</b>. Remplissez la garde du chien ci-dessus ET la visite ci-dessous.</div>' +

      '<div class="field"><label>Message (facultatif)</label><textarea id="r-msg" rows="2" placeholder="Précisions, habitudes, besoins…"></textarea></div>' +
      '<div class="field"><label>Code parrainage (facultatif)</label><input type="text" id="r-parrain" placeholder="Code de votre ami"></div>' +

      '<div id="r-estimate" style="font-size:.85rem;color:var(--lavande-dark);font-weight:700;margin-bottom:12px;line-height:1.7;"></div>' +
      '<button class="btn btn-soleil" id="r-btn" onclick="App.resaSubmit()">📩 Envoyer la demande</button>' +
      '<div class="auth-msg" id="r-msg-out"></div>' +
      '</div>' +

      // ── Disponibilités en direct ──
      '<div class="section-label">📅 Disponibilités</div>' +
      '<div class="card"><div id="r-dispo" style="font-size:.78rem;color:var(--text-muted);">Chargement…</div></div>' +

      // ── Carnet Malin ──
      '<div class="card" style="background:linear-gradient(135deg,#F4F0FA,#FAF6F0);">' +
      '<div class="card-title">🎟️ Le Carnet Malin</div>' +
      '<div style="font-size:.82rem;color:var(--text-muted);line-height:1.6;">10 nuits de pension prépayées à <b style="color:var(--lavande-dark);">prix réduit</b>, valables 1 an — zéro paperasse à chaque garde. Ferme et définitif une fois réglé.<br>📞 Intéressé ? Appelez le <a href="tel:0777234088" style="color:var(--lavande);font-weight:700;">07 77 23 40 88</a></div></div>' +

      '<div class="section-label">Mes réservations</div>' +
      '<div id="resa-list"></div>' +
      '<div class="section-label">🧾 Mes factures</div>' +
      '<div id="factures-list"></div>';

    _svc = null; PK.on = false; PK.km = null; V.km = null;
    ['r-arr', 'r-dep'].forEach((id) => { const e = document.getElementById(id); if (e) e.addEventListener('change', updateEstimate); });
    App.renderReservationList();
    loadDispo();
  };

  /* ── Sélection de prestation ── */
  App.resaSvc = function (id) {
    _svc = SERVICES().find((s) => s.id === id);
    document.querySelectorAll('#svc-chips .dog-chip').forEach((c) => c.classList.toggle('active', c.dataset.svc === id));
    const isVisite = id === 'visite', isPack = id === 'packduo';
    document.getElementById('r-classic').style.display = isVisite ? 'none' : '';
    document.getElementById('r-visite').style.display = (isVisite || isPack) ? '' : 'none';
    document.getElementById('r-packinfo').style.display = isPack ? '' : 'none';
    document.getElementById('r-dep-field').style.display = (_svc && _svc.range) ? '' : 'none';
    const pk = document.getElementById('r-pickup-wrap');
    if (pk) pk.style.display = (isVisite || isPack) ? 'none' : '';
    updateEstimate();
  };
  App.resaDur = function (m) {
    V.dur = m;
    document.getElementById('v-d30').classList.toggle('active', m === 30);
    document.getElementById('v-d60').classList.toggle('active', m === 60);
    updateEstimate();
  };
  App.resaCalc = updateEstimate;

  App.resaPickup = function () {
    PK.on = document.getElementById('r-pickup').checked;
    document.getElementById('r-pickup-panel').style.display = PK.on ? '' : 'none';
    if (PK.on) {
      const p = App.getProfile();
      const inp = document.getElementById('r-pickup-addr');
      if (!inp.value && p.adresse) { inp.value = p.adresse + ' ' + (p.codePostal || '') + ' ' + (p.ville || ''); App.resaPickupAddr(); }
    } else { PK.km = null; }
    updateEstimate();
  };
  App.resaPickupAddr = function () {
    const q = document.getElementById('r-pickup-addr').value.trim();
    const res = document.getElementById('r-pickup-res');
    if (q.length < 5) return;
    res.textContent = '⏳ Calcul…';
    geocode(q, (g) => {
      if (!g) { res.textContent = 'Adresse introuvable — vérifiez.'; PK.km = null; updateEstimate(); return; }
      PK.km = g.km; PK.city = g.city; PK.address = g.label;
      PK.price = travelPrice(g.km, g.city);
      res.innerHTML = '✅ ' + esc(g.city || g.label) + ' → récupération <b>' + String(PK.price).replace('.', ',') + '€</b>';
      updateEstimate();
    });
  };
  App.resaVisiteAddr = function () {
    const q = document.getElementById('v-addr').value.trim();
    const res = document.getElementById('v-addr-res');
    if (q.length < 5) return;
    res.textContent = '⏳ Calcul du déplacement…';
    geocode(q, (g) => {
      if (!g) { res.textContent = 'Adresse introuvable — vérifiez.'; V.km = null; updateEstimate(); return; }
      V.km = g.km; V.city = g.city; V.address = g.label;
      const per = travelPrice(g.km, g.city);
      res.innerHTML = '✅ ' + esc(g.city || g.label) + ' — déplacement <b>' + String(per).replace('.', ',') + '€ / déplacement</b>';
      updateEstimate();
    });
  };

  /* ── Calculs ── */
  function daysBetween(a, b) {
    if (!a || !b) return 0;
    const n = Math.round((new Date(b) - new Date(a)) / 86400000) + 1;
    return n > 0 ? n : 0;
  }
  function nights() {
    const a = document.getElementById('r-arr'), d = document.getElementById('r-dep');
    if (!a || !d || !a.value || !d.value) return 0;
    const n = Math.round((new Date(d.value) - new Date(a.value)) / 86400000);
    return n > 0 ? n : 0;
  }
  function discRate(nb) { return nb >= 3 ? T.remise3 / 100 : nb === 2 ? T.remise2 / 100 : 0; }

  function visiteCalc() {
    V.freq = parseInt((document.getElementById('v-freq') || {}).value) || 1;
    V.unit = (document.getElementById('v-unit') || {}).value || 'jour';
    const start = (document.getElementById('v-start') || {}).value || '';
    const end = (document.getElementById('v-end') || {}).value || '';
    const days = daysBetween(start, end);
    let passages, travelDays;
    if (V.unit === 'jour') { passages = V.freq * Math.max(1, days); travelDays = Math.max(1, days); }
    else { const w = Math.max(1, Math.ceil(Math.max(1, days) / 7)); passages = V.freq * w; travelDays = passages; }
    const ani = ANIMALS.find((a) => a.id === (document.getElementById('v-animal') || {}).value) || ANIMALS[0];
    const unitPrice = T[ani.k] + (V.dur === 60 ? T.vSupp1h : 0);
    const travelPer = V.km != null ? travelPrice(V.km, V.city) : 0;
    const sum = document.getElementById('v-summary');
    if (sum) {
      if (days > 0) {
        sum.style.display = '';
        sum.innerHTML = '📅 ' + days + ' jour' + (days > 1 ? 's' : '') + ' · 🔁 ' + V.freq + ' passage' + (V.freq > 1 ? 's' : '') + ' ' + (V.unit === 'jour' ? 'par jour' : 'par semaine') + ' → <b>' + passages + ' passage' + (passages > 1 ? 's' : '') + ' au total</b>';
      } else sum.style.display = 'none';
    }
    return { days, passages, travelDays, ani, unitPrice, travelPer, start, end,
      visites: unitPrice * passages, travel: Math.round(travelPer * travelDays * 100) / 100 };
  }

  function updateEstimate() {
    const el = document.getElementById('r-estimate');
    if (!el || !_svc) { if (el) el.textContent = ''; return; }
    const lines = []; let total = 0;
    const nb = parseInt((document.getElementById('r-nb') || {}).value) || 1;
    const disc = discRate(nb);

    if (_svc.id === 'visite') {
      const v = visiteCalc();
      lines.push('🏡 ' + v.ani.n + ' — ' + v.unitPrice + '€ × ' + v.passages + ' passage' + (v.passages > 1 ? 's' : '') + ' = <b>' + v.visites + '€</b>');
      total += v.visites;
      if (V.km != null && v.travel > 0) { lines.push('🚗 Déplacement — <b>' + String(v.travel).replace('.', ',') + '€</b> (' + String(v.travelPer).replace('.', ',') + '€ × ' + v.travelDays + ')'); total += v.travel; }
      else if (V.km == null) lines.push('🚗 <small>Saisissez l\'adresse pour le déplacement</small>');
    } else if (_svc.id === 'packduo') {
      const n = nights() || 1;
      const pen = Math.round(T.pension * n * nb * (1 - disc));
      lines.push('🏠 Pension chien — ' + T.pension + '€ × ' + n + ' nuit' + (n > 1 ? 's' : '') + (disc ? ' (−' + Math.round(disc * 100) + '%)' : '') + ' = <b>' + pen + '€</b>');
      total += pen;
      const v = visiteCalc();
      const remV = Math.round(v.visites * (1 - T.packDuo / 100));
      lines.push('🎁 Visites 2ᵉ animal (' + v.ani.n + ') — <s>' + v.visites + '€</s> <b>' + remV + '€</b> (−' + T.packDuo + '%)');
      total += remV;
      if (V.km != null && v.travel > 0) { lines.push('🚗 Déplacement — <b>' + String(v.travel).replace('.', ',') + '€</b>'); total += v.travel; }
    } else if (_svc.range) {
      const n = nights() || 1;
      const sub = Math.round(_svc.price * n * nb * (1 - disc));
      lines.push(_svc.label + ' — ' + _svc.price + '€ × ' + n + ' × ' + nb + ' chien' + (nb > 1 ? 's' : '') + (disc ? ' (−' + Math.round(disc * 100) + '%)' : '') + ' = <b>' + sub + '€</b>');
      total += sub;
    } else {
      const sub = Math.round(_svc.price * nb * (1 - disc));
      lines.push(_svc.label + ' — <b>' + sub + '€</b>');
      total += sub;
    }
    if (PK.on && PK.km != null && _svc.id !== 'visite' && _svc.id !== 'packduo') {
      lines.push('🚗 Récupération à domicile — <b>' + String(PK.price).replace('.', ',') + '€</b>');
      total += PK.price;
    }
    total = Math.round(total * 100) / 100;
    el.innerHTML = lines.join('<br>') + '<br><span style="font-size:1.05rem;">💶 Total estimé : <b>' + String(total).replace('.', ',') + '€</b></span> <small style="color:var(--text-muted);">· à confirmer</small>';
    el.dataset.total = total;
    el.dataset.detail = lines.join(' | ').replace(/<[^>]+>/g, '');
  }

  /* ── Disponibilités (14 prochains jours) ── */
  function loadDispo() {
    const host = document.getElementById('r-dispo'); if (!host) return;
    Promise.all([db.ref('availability').get(), db.ref('closures').get()]).then(([a, c]) => {
      const av = a.val() || {}, cl = c.val() || {};
      const cap = av.capacity || 7, days = av.days || {};
      let html = '<div style="display:flex;gap:6px;overflow-x:auto;padding-bottom:6px;">';
      const now = new Date();
      for (let i = 0; i < 14; i++) {
        const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
        const key = d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
        const closed = !!cl[key];
        const used = days[key] || 0, left = cap - used;
        let bg = '#DCEFD8', co = '#2f5a24', txt = left + ' pl.';
        if (closed) { bg = '#3a3530'; co = '#fff'; txt = 'Congés'; }
        else if (left <= 0) { bg = '#F8D3CE'; co = '#8a2c20'; txt = 'Complet'; }
        else if (left <= 2) { bg = '#FDEBC8'; co = '#7a5a1a'; txt = left + ' pl.'; }
        html += '<div style="flex-shrink:0;text-align:center;background:' + bg + ';color:' + co + ';border-radius:10px;padding:7px 9px;min-width:52px;">' +
          '<div style="font-weight:800;font-size:.72rem;">' + d.toLocaleDateString('fr-FR', { weekday: 'short' }) + '</div>' +
          '<div style="font-size:.85rem;font-weight:800;">' + d.getDate() + '/' + (d.getMonth() + 1) + '</div>' +
          '<div style="font-size:.62rem;font-weight:700;">' + txt + '</div></div>';
      }
      host.innerHTML = html + '</div>';
    }).catch(() => { host.textContent = 'Disponibilités indisponibles — appelez-nous !'; });
  }

  /* ── Envoi ── */
  App.resaSubmit = async function () {
    const out = document.getElementById('r-msg-out');
    out.className = 'auth-msg';
    if (!_svc) { out.classList.add('err'); out.textContent = 'Choisissez une prestation.'; return; }
    const isVisite = _svc.id === 'visite', isPack = _svc.id === 'packduo';

    let chienNom = '', arr = '', dep = '';
    if (isVisite) {
      const v = visiteCalc();
      if (!v.start || !v.end || v.days < 1) { out.classList.add('err'); out.textContent = 'Indiquez les dates de début et de fin.'; return; }
      if (V.km == null) { out.classList.add('err'); out.textContent = 'Indiquez l\'adresse de la visite.'; return; }
      chienNom = v.ani.n; arr = v.start; dep = v.end;
    } else {
      const chienEl = document.getElementById('r-chien');
      chienNom = (chienEl.value || '').trim();
      arr = document.getElementById('r-arr').value;
      dep = _svc.range ? document.getElementById('r-dep').value : '';
      if (!chienNom) { out.classList.add('err'); out.textContent = 'Indiquez votre animal.'; return; }
      if (!arr) { out.classList.add('err'); out.textContent = 'Choisissez une date d\'arrivée.'; return; }
      if (_svc.range && !dep) { out.classList.add('err'); out.textContent = 'Indiquez la date de fin.'; return; }
      if (isPack) {
        const v = visiteCalc();
        if (!v.start || !v.end || v.days < 1 || V.km == null) { out.classList.add('err'); out.textContent = 'Pack Duo : remplissez aussi la visite du 2ᵉ animal (dates + adresse).'; return; }
      }
    }

    const btn = document.getElementById('r-btn'); btn.disabled = true;
    const p = App.getProfile(); const user = App.getUser();
    const ds = App.getChiens();
    const match = Object.values(ds).find((d) => (d.nom || '').trim().toLowerCase() === chienNom.toLowerCase());
    const chien = match ? Object.assign({}, match) : { nom: chienNom };
    const est = document.getElementById('r-estimate');

    let extra = '';
    if (isVisite || isPack) {
      const v = visiteCalc();
      extra = ' | 🏡 Visite (' + v.ani.n + ') à : ' + V.address + ' — ' + V.freq + '× ' + (V.unit === 'jour' ? 'par jour' : 'par semaine') + ' = ' + v.passages + ' passages (' + (V.dur === 60 ? '1h' : '30 min') + ')';
    }
    if (PK.on && PK.km != null) extra += ' | 🚗 Récupération à : ' + PK.address;

    const fbData = {
      userId: user.uid,
      statut: 'en-attente',
      email: p.email || user.email || '',
      client: { prenom: p.prenom || '', nom: p.nom || '', telephone: p.telephone || '', email: p.email || user.email || '' },
      chien: chien,
      service: _svc.label,
      nbChiens: (document.getElementById('r-nb') || { value: '1' }).value + ' chien(s)',
      dateArrivee: arr,
      heureArrivee: (document.getElementById('r-arrh') || {}).value || '',
      dateDepart: dep,
      heureDepart: (document.getElementById('r-deph') || {}).value || '',
      prix: est.dataset.total || '',
      devis: (est.dataset.detail || '') + extra,
      message: document.getElementById('r-msg').value.trim(),
      parrainage: (document.getElementById('r-parrain') || {}).value || '',
      source: 'app',
      createdAt: Date.now()
    };

    try {
      await db.ref('reservations').push(fbData);
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
      } catch (e) {}
      out.classList.add('ok'); out.textContent = '✓ Demande envoyée ! Nous revenons vers vous sous 24h.';
      App.toast('Réservation envoyée 🎉');
      setTimeout(() => App.renderReservation(), 1500);
    } catch (e) {
      out.classList.add('err'); out.textContent = 'Erreur : ' + (e.message || 'envoi impossible');
      btn.disabled = false;
    }
  };

  /* ── Liste des réservations + journal de séjour ── */
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
        (dog ? '<div style="font-size:.85rem;margin-bottom:4px;">🐾 ' + esc(dog) + '</div>' : '') +
        '<div style="font-size:.82rem;color:var(--text-muted);">Du <b style="color:var(--text)">' + App.fmtDate(arr) + '</b>' +
        (dep ? ' au <b style="color:var(--text)">' + App.fmtDate(dep) + '</b>' : '') + '</div>' +
        (st.includes('confirm') && r.key ? '<div class="resa-journal" id="jr-' + esc(r.key) + '"></div>' : '') +
        '</div>';
    }).join('');
    // Journal de séjour (notes + photos publiées depuis l'admin)
    list.filter((r) => (r.statut || '').toLowerCase().includes('confirm') && r.key).forEach((r) => {
      db.ref('sejour_journal/' + r.key).get().then((s) => {
        const j = s.val(); if (!j) return;
        const el = document.getElementById('jr-' + r.key); if (!el) return;
        const items = Object.values(j).sort((a, b) => (a.ts || 0) - (b.ts || 0));
        el.innerHTML = '<div style="border-top:1px dashed var(--border);margin-top:8px;padding-top:8px;">' +
          '<div style="font-size:.76rem;font-weight:800;color:#8a6d1f;margin-bottom:6px;">📔 Journal de séjour</div>' +
          items.map((it) => '<div style="font-size:.8rem;margin-bottom:6px;">' +
            (it.note ? esc(it.note) + '<br>' : '') +
            (it.url ? '<img src="' + esc(it.url) + '" style="width:100%;max-width:220px;border-radius:10px;margin-top:4px;" onclick="App.openLightbox(this.src)">' : '') +
            '</div>').join('') + '</div>';
      }).catch(() => {});
    });
    App.renderFacturesList();
  };

  /* ── Factures ── */
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
        (dog ? '<div style="font-size:.85rem;margin-bottom:4px;">🐾 ' + esc(dog) + '</div>' : '') +
        '<div style="font-size:.82rem;color:var(--text-muted);margin-bottom:8px;">Du <b style="color:var(--text)">' + App.fmtDate(arr) + '</b>' +
        (dep ? ' au <b style="color:var(--text)">' + App.fmtDate(dep) + '</b>' : '') + '</div>' +
        '<div style="display:flex;justify-content:space-between;align-items:center;border-top:1px solid var(--border);padding-top:8px;">' +
        '<span style="font-size:.78rem;color:var(--text-muted);">Montant</span>' +
        '<span style="font-size:1.1rem;font-weight:800;color:var(--lavande-dark);">' + (prix ? esc(String(prix).replace(/€?$/, '')) + ' €' : '—') + '</span>' +
        '</div></div>';
    }).join('');
  };
})();
