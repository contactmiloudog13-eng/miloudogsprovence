/* ============================================================
   Milou Dogs — Vue « Mes chiens » (Phase 2)
   Profils complets, photo, carnet multi-photos, âge auto.
   S'accroche à l'objet global App (défini dans app.js).
   ============================================================ */
(function () {
  const esc = App.esc;
  const db = App._db();

  function uid() { return App.getUser().uid; }
  function dogs() { return App.getChiens(); }
  function selId() { return App.getSelectedChien(); }

  let _chienEdit = false; // mode édition d'un animal existant
  let _lockAttr = '';     // ' disabled' quand les champs sont en lecture seule

  // Espèces d'animaux (comme sur le site)
  const ESPECES = [
    ['chien', '🐶 Chien'], ['chat', '🐱 Chat'], ['lapin', '🐰 Lapin'], ['furet', '🦡 Furet'],
    ['poules', '🐔 Poules / basse-cour'], ['rongeur', '🐹 Rongeur'], ['oiseau', '🦜 Oiseau'],
    ['tortue', '🐢 Tortue / reptile'], ['poisson', '🐠 Poisson'], ['autre', '🐾 Autre']
  ];
  const EMOJI = { chien: '🐶', chat: '🐱', lapin: '🐰', furet: '🦡', poules: '🐔', rongeur: '🐹', oiseau: '🦜', tortue: '🐢', poisson: '🐠', autre: '🐾' };
  const emo = (e) => EMOJI[e] || '🐕';

  // Carnet : liste normalisée (champ carnetUrls[] + rétro-compat carnetUrl)
  function carnetList(d) {
    d = d || {};
    let list = Array.isArray(d.carnetUrls) ? d.carnetUrls.slice() : [];
    if (d.carnetUrl && list.indexOf(d.carnetUrl) === -1) list.unshift(d.carnetUrl);
    return list.filter(Boolean);
  }
  const isImg = (u) => /^data:image/.test(u || '') || /\.(jpe?g|png|webp|gif|heic)(\?|$)/i.test(u || '');

  // Champ <select>
  function sel(id, options, cur) {
    return '<select id="' + id + '"' + _lockAttr + '>' +
      '<option value="">—</option>' +
      options.map((o) => '<option value="' + esc(o) + '"' + (cur === o ? ' selected' : '') + '>' + esc(o) + '</option>').join('') +
      '</select>';
  }
  function inp(id, val, ph, type) {
    return '<input type="' + (type || 'text') + '" id="' + id + '" value="' + esc(val || '') + '" placeholder="' + esc(ph || '') + '"' + _lockAttr + '>';
  }

  // ── Rendu principal ───────────────────────────────────────
  App.renderChiens = function () {
    const body = document.getElementById('chiens-body');
    const ds = dogs();
    const ids = Object.keys(ds);

    // sélection courante par défaut
    if (selId() && !ds[selId()]) App.setSelectedChien(null);
    if (!selId() && ids.length) App.setSelectedChien(ids[0]);

    // Barre de sélection (chips)
    let chips = '<div class="dog-chips">';
    ids.forEach((id) => {
      const d = ds[id];
      const av = d.photoUrl ? '<span class="av"><img src="' + d.photoUrl + '"></span>' : '<span class="av">' + emo(d.espece) + '</span>';
      chips += '<button class="dog-chip' + (id === selId() ? ' active' : '') + '" onclick="App.chienSelect(\'' + id + '\')">' + av + esc(d.nom || 'Animal') + '</button>';
    });
    chips += '<button class="dog-chip add" onclick="App.chienNew()">＋ Ajouter</button>';
    chips += '</div>';

    const d = selId() ? (ds[selId()] || {}) : {};
    const isNew = !selId();
    const locked = !isNew && !_chienEdit; // chien existant non édité → lecture seule
    _lockAttr = locked ? ' disabled' : '';

    const form =
      '<div class="card">' +
      // En-tête : bouton Modifier quand verrouillé
      (locked ? '<div style="text-align:right;margin-bottom:6px;"><button class="btn btn-sm btn-ghost" style="width:auto;" onclick="App.chienEdit()">✏️ Modifier</button></div>' : '') +
      // Photo
      '<div class="photo-circle" id="dog-photo">' + (d.photoUrl ? '<img src="' + d.photoUrl + '">' : emo(d.espece)) + '</div>' +
      (locked ? '' :
        '<div style="text-align:center;margin-bottom:14px;">' +
        '<label class="btn btn-sm btn-ghost" style="display:inline-flex;">📷 ' + (d.photoUrl ? 'Changer la photo' : 'Ajouter une photo') +
        '<input type="file" accept="image/*" hidden onchange="App.chienPhoto(this)"></label></div>') +

      field('Type d\'animal', '<select id="c-espece"' + _lockAttr + '>' +
        ESPECES.map((e) => '<option value="' + e[0] + '"' + ((d.espece || 'chien') === e[0] ? ' selected' : '') + '>' + e[1] + '</option>').join('') + '</select>') +
      field('Nom de l\'animal', inp('c-nom', d.nom, 'Rex')) +
      row2(
        field('Race', inp('c-race', d.race, 'Berger…')),
        field('Sexe', sel('c-sexe', ['Mâle', 'Femelle'], d.sexe))
      ) +
      row2(
        field('Date de naissance', '<input type="date" id="c-naissance" value="' + esc(d.naissance || '') + '" onchange="App.chienAge()"' + _lockAttr + '>'),
        field('Âge (auto)', '<input type="text" id="c-age" value="' + esc(App.computeAge(d.naissance) || d.age || '') + '" placeholder="calculé automatiquement" readonly>')
      ) +
      field('🎂 Me rappeler son anniversaire', sel('c-birthdayReminder', ['Oui', 'Non'], d.birthdayReminder || 'Oui')) +
      row2(
        field('Poids', inp('c-poids', d.poids, 'kg')),
        field('Couleur', inp('c-couleur', d.couleur, 'Fauve…'))
      ) +
      field('Stérilisé(e) ?', sel('c-sterilise', ['Oui', 'Non'], d.sterilise)) +
      row2(
        field('Identification', sel('c-identification', ['Puce', 'Tatouage', 'Aucune'], d.identification)),
        field('N° identification', inp('c-numeroId', d.numeroId, ''))
      ) +
      field('Caractère / tempérament', inp('c-temperament', d.temperament, 'Joueur, calme…')) +
      row2(
        field('S\'entend avec chiens', sel('c-entendChiens', ['Oui', 'Non', 'À tester'], d.entendChiens)),
        field('S\'entend avec chats', sel('c-entendChats', ['Oui', 'Non', 'À tester'], d.entendChats))
      ) +
      row2(
        field('Niveau d\'énergie', sel('c-energie', ['Calme', 'Modéré', 'Élevé'], d.energie)),
        field('Vaccins à jour', sel('c-vaccins', ['Oui', 'Non', 'En partie'], d.vaccins))
      ) +
      field('Traitement en cours', sel('c-traitement', ['Oui', 'Non'], d.traitement)) +
      field('Détail du traitement', inp('c-traitementDetail', d.traitementDetail, 'Si oui, lequel…')) +
      field('Allergies', sel('c-allergies', ['Oui', 'Non'], d.allergies)) +
      field('Détail des allergies', inp('c-allergiesDetail', d.allergiesDetail, 'Si oui, lesquelles…')) +
      field('Infos complémentaires', '<textarea id="c-infos" rows="3" placeholder="Habitudes, peurs, alimentation…"' + _lockAttr + '>' + esc(d.infos || '') + '</textarea>') +

      // Carnet de santé
      '<div class="section-label" style="margin:18px 0 8px;">📎 Carnet de santé</div>' +
      (locked ? '' :
        '<label class="upload-zone" style="display:block;">Ajouter une ou plusieurs photos / PDF' +
        '<input type="file" accept="image/*,.pdf" multiple hidden onchange="App.chienCarnet(this)"></label>') +
      '<div class="bar" id="carnet-bar"><i></i></div>' +
      '<div id="carnet-grid"></div>' +

      (locked ? '' : '<button class="btn btn-soleil" style="margin-top:18px;" onclick="App.chienSave()">💾 ' + (isNew ? 'Enregistrer cet animal' : 'Enregistrer') + '</button>') +
      (isNew ? '' : '<button class="btn btn-danger" style="margin-top:10px;" onclick="App.chienDelete()">🗑️ Supprimer cet animal</button>') +
      '</div>';

    body.innerHTML = chips + form;
    renderCarnet(carnetList(d), locked);
    _lockAttr = '';
  };

  function field(label, control) {
    return '<div class="field"><label>' + esc(label) + '</label>' + control + '</div>';
  }
  function row2(a, b) { return '<div class="row-2">' + a + b + '</div>'; }

  function renderCarnet(list, locked) {
    const host = document.getElementById('carnet-grid');
    if (!host) return;
    if (!list.length) { host.innerHTML = locked ? '<div class="empty" style="padding:14px;">Aucun document.</div>' : ''; return; }
    host.innerHTML = '<div class="carnet-grid">' + list.map((u, i) =>
      '<div class="carnet-item">' +
      (isImg(u) ? '<img src="' + u + '" class="zoomable">' : '<a class="pdf" href="' + u + '" target="_blank">📄 PDF ' + (i + 1) + '</a>') +
      (locked ? '' : '<button class="del" onclick="App.chienCarnetDel(' + i + ')">🗑️</button>') + '</div>'
    ).join('') + '</div>';
  }

  // ── Actions ───────────────────────────────────────────────
  App.chienSelect = function (id) { _chienEdit = false; App.setSelectedChien(id); App.renderChiens(); };
  App.chienNew = function () { _chienEdit = false; App.setSelectedChien(null); App.renderChiens(); document.getElementById('c-nom').focus(); };
  App.chienEdit = function () { _chienEdit = true; App.renderChiens(); };
  App.chienAge = function () {
    const age = App.computeAge(document.getElementById('c-naissance').value);
    if (age) document.getElementById('c-age').value = age;
  };

  App.chienPhoto = async function (input) {
    const file = input.files[0]; if (!file) return;
    App.toast('Compression de la photo…');
    try {
      const b64 = await App.compressImage(file, 800, 0.82);
      document.getElementById('dog-photo').innerHTML = '<img src="' + b64 + '">';
      App._pendingPhoto = b64;
      if (selId()) { await db.ref('users/' + uid() + '/chiens/' + selId()).update({ photoUrl: b64 }); App.toast('Photo enregistrée ✓'); }
      else App.toast('Photo prête — enregistrez le chien');
    } catch (e) { App.toast('Erreur photo'); }
    input.value = '';
  };

  App.chienCarnet = async function (input) {
    const files = Array.from(input.files || []); if (!files.length) return;
    if (!selId()) { App.toast('Enregistrez d\'abord le chien'); input.value = ''; return; }
    const bar = document.getElementById('carnet-bar'); const fill = bar.querySelector('i');
    bar.style.display = 'block'; fill.style.width = '10%';
    try {
      const d = dogs()[selId()] || {};
      const list = carnetList(d);
      for (let k = 0; k < files.length; k++) {
        const f = files[k];
        const img = f.type.startsWith('image/');
        if (!img && f.size > 2 * 1024 * 1024) { App.toast('PDF « ' + f.name + ' » trop lourd (max 2 Mo)'); continue; }
        list.push(img ? await App.compressImage(f, 1400, 0.8) : await App.fileToDataURL(f));
        fill.style.width = Math.round(10 + ((k + 1) / files.length) * 80) + '%';
      }
      await db.ref('users/' + uid() + '/chiens/' + selId()).update({ carnetUrls: list, carnetUrl: null });
      fill.style.width = '100%';
      setTimeout(() => { bar.style.display = 'none'; fill.style.width = '0'; }, 400);
      renderCarnet(list);
      App.toast('Carnet mis à jour ✓');
    } catch (e) { App.toast('Erreur carnet'); bar.style.display = 'none'; }
    input.value = '';
  };

  App.chienCarnetDel = async function (i) {
    if (!selId()) return;
    if (!confirm('Supprimer cette photo du carnet ?')) return;
    const list = carnetList(dogs()[selId()] || {});
    list.splice(i, 1);
    await db.ref('users/' + uid() + '/chiens/' + selId()).update({ carnetUrls: list, carnetUrl: null });
    renderCarnet(list);
  };

  App.chienSave = async function () {
    const v = (id) => { const e = document.getElementById(id); return e ? e.value.trim() : ''; };
    const nom = v('c-nom');
    if (!nom) { App.toast('Le nom de l\'animal est obligatoire'); return; }
    const existing = selId() ? (dogs()[selId()] || {}) : {};
    const naissance = v('c-naissance');
    const data = {
      nom, espece: v('c-espece') || 'chien',
      race: v('c-race'), sexe: v('c-sexe'), naissance: naissance, age: App.computeAge(naissance) || v('c-age'),
      birthdayReminder: v('c-birthdayReminder') || 'Oui',
      poids: v('c-poids'), couleur: v('c-couleur'), sterilise: v('c-sterilise'),
      identification: v('c-identification'), numeroId: v('c-numeroId'), temperament: v('c-temperament'),
      entendChiens: v('c-entendChiens'), entendChats: v('c-entendChats'), energie: v('c-energie'),
      vaccins: v('c-vaccins'), traitement: v('c-traitement'), traitementDetail: v('c-traitementDetail'),
      allergies: v('c-allergies'), allergiesDetail: v('c-allergiesDetail'), infos: v('c-infos'),
      updatedAt: Date.now()
    };
    if (existing.photoUrl) data.photoUrl = existing.photoUrl;
    if (App._pendingPhoto && !selId()) data.photoUrl = App._pendingPhoto;
    const cl = carnetList(existing); if (cl.length) data.carnetUrls = cl;
    try {
      if (selId()) {
        await db.ref('users/' + uid() + '/chiens/' + selId()).set(data);
      } else {
        const ref = db.ref('users/' + uid() + '/chiens').push();
        await ref.set(data);
        App.setSelectedChien(ref.key);
        App._pendingPhoto = null;
      }
      _chienEdit = false; // reverrouille : le listener temps réel re-render en lecture seule
      App.toast('Profil de ' + nom + ' enregistré ✓');
    } catch (e) { App.toast('Erreur : ' + (e.message || 'enregistrement')); }
  };

  App.chienDelete = async function () {
    if (!selId()) return;
    const nom = (dogs()[selId()] || {}).nom || 'cet animal';
    if (!confirm('Supprimer définitivement ' + nom + ' ?')) return;
    await db.ref('users/' + uid() + '/chiens/' + selId()).remove();
    App.setSelectedChien(null);
    App.toast(nom + ' supprimé');
  };
})();
