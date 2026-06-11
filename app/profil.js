/* ============================================================
   Milou Dogs — Vue « Profil » (Phase 4)
   Compte, adresse avec code postal → ville auto, déconnexion.
   ============================================================ */
(function () {
  const esc = App.esc;
  const db = App._db();
  let _cpTimer = null;

  App.renderProfil = function () {
    const p = App.getProfile(); const user = App.getUser();
    const body = document.getElementById('profil-body');
    body.innerHTML =
      '<div class="card">' +
      '<div class="card-title">👤 Mes informations</div>' +
      '<div class="row-2">' +
      f('Prénom', '<input type="text" id="p-prenom" value="' + esc(p.prenom || '') + '">') +
      f('Nom', '<input type="text" id="p-nom" value="' + esc(p.nom || '') + '">') +
      '</div>' +
      f('E-mail', '<input type="email" value="' + esc(p.email || user.email || '') + '" readonly>') +
      f('Téléphone', '<input type="tel" id="p-tel" inputmode="tel" value="' + esc(p.telephone || '') + '" placeholder="06 12 34 56 78">') +
      f('Adresse', '<input type="text" id="p-adresse" value="' + esc(p.adresse || '') + '" placeholder="12 rue des Mimosas">') +
      '<div class="row-2">' +
      f('Code postal', '<input type="text" id="p-cp" inputmode="numeric" maxlength="5" value="' + esc(p.codePostal || '') + '" placeholder="13140" oninput="App.cpLookup(this)">') +
      f('Ville', '<input type="text" id="p-ville" list="ville-sugg" value="' + esc(p.ville || '') + '" placeholder="Miramas"><datalist id="ville-sugg"></datalist>') +
      '</div>' +
      '<button class="btn btn-soleil" id="p-save" onclick="App.profilSave()">💾 Enregistrer</button>' +
      '<div class="auth-msg" id="p-out"></div>' +
      '</div>' +

      '<div class="card">' +
      '<div class="card-title">🔒 Sécurité</div>' +
      '<button class="btn btn-ghost" onclick="App.profilResetPwd()">Modifier mon mot de passe</button>' +
      '</div>' +

      '<button class="btn btn-danger" onclick="App.logout()">🚪 Se déconnecter</button>' +
      '<div style="text-align:center;color:var(--text-muted);font-size:.72rem;margin-top:16px;">Milou Dogs Provence · v1.0</div>';
  };

  function f(label, control) { return '<div class="field"><label>' + esc(label) + '</label>' + control + '</div>'; }

  App.cpLookup = function (input) {
    const cp = (input.value || '').replace(/\D/g, '').slice(0, 5);
    if (cp !== input.value) input.value = cp;
    if (cp.length !== 5) return;
    clearTimeout(_cpTimer);
    _cpTimer = setTimeout(() => {
      fetch('https://geo.api.gouv.fr/communes?codePostal=' + cp + '&fields=nom&format=json')
        .then((r) => r.ok ? r.json() : [])
        .then((list) => {
          if (!Array.isArray(list) || !list.length) return;
          const dl = document.getElementById('ville-sugg'); const v = document.getElementById('p-ville');
          dl.innerHTML = list.map((c) => '<option value="' + esc(c.nom) + '"></option>').join('');
          if (list.length === 1 || !v.value.trim()) v.value = list[0].nom;
        }).catch(() => {});
    }, 250);
  };

  App.profilSave = async function () {
    const out = document.getElementById('p-out'); out.className = 'auth-msg';
    const prenom = document.getElementById('p-prenom').value.trim();
    const nom = document.getElementById('p-nom').value.trim();
    if (!prenom || !nom) { out.classList.add('err'); out.textContent = 'Prénom et nom obligatoires.'; return; }
    const data = {
      prenom, nom,
      telephone: document.getElementById('p-tel').value.trim(),
      adresse: document.getElementById('p-adresse').value.trim(),
      codePostal: document.getElementById('p-cp').value.trim(),
      ville: document.getElementById('p-ville').value.trim()
    };
    const btn = document.getElementById('p-save'); btn.disabled = true;
    try {
      await db.ref('users/' + App.getUser().uid).update(data);
      try { await App.getUser().updateProfile({ displayName: prenom }); } catch (e) {}
      App.setProfile(Object.assign({}, App.getProfile(), data));
      App.updateAvatar(); App.renderHome();
      out.classList.add('ok'); out.textContent = '✓ Profil enregistré !';
      App.toast('Profil mis à jour ✓');
    } catch (e) { out.classList.add('err'); out.textContent = 'Erreur : ' + (e.message || 'enregistrement'); }
    btn.disabled = false;
  };

  App.profilResetPwd = function () {
    const email = (App.getProfile().email || App.getUser().email || '');
    if (!email) { App.toast('E-mail introuvable'); return; }
    App._auth().sendPasswordResetEmail(email)
      .then(() => App.toast('E-mail de changement de mot de passe envoyé ✓'))
      .catch(() => App.toast('Erreur, réessayez plus tard'));
  };
})();
