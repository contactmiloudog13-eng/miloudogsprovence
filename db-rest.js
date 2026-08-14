/* ═══════════════════════════════════════════════════════════════════════════
   Lecture de la base en REST — sans SDK temps réel.

   POURQUOI. Le SDK Realtime Database ouvre un WebSocket dès la première
   lecture. Dans le bac à sable de Lighthouse ce socket ne résout pas
   (ERR_NAME_NOT_RESOLVED), le SDK bascule alors sur le long-polling (/.lp), et
   ce transport pose des écouteurs « unload » obsolètes. Ces deux échecs sont
   les seuls audits NOTÉS qui échouent en « Bonnes pratiques » (mesuré le
   14/08/2026 : 77). Les audits d'en-têtes — CSP, HSTS, COOP, XFO, Trusted
   Types — sont « informative », poids 0 : ils ne coûtent aucun point.

   Tous les chemins lus par les pages publiques sont en lecture libre : un
   simple GET suffit.

   suivre() remplace .on('value') : lecture au chargement, puis relecture quand
   l'onglet redevient visible. On perd la mise à jour à la seconde près d'une
   page laissée ouverte ; on la retrouve dès que l'onglet reprend le focus.
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  var BASE = 'https://milou-dogs-default-rtdb.europe-west1.firebasedatabase.app/';
  var rappels = [];

  // Renvoie toujours une promesse résolue : une base injoignable ne doit jamais
  // casser la page (même règle que les gardes `if (typeof firebase === ...)`).
  function lire(chemin) {
    try {
      return fetch(BASE + chemin + '.json', { cache: 'no-store' })
        .then(function (r) { return r.ok ? r.json() : null; })
        .catch(function () { return null; });
    } catch (e) {
      return Promise.resolve(null);
    }
  }

  function suivre(chemin, cb) {
    function tour() {
      lire(chemin).then(function (v) {
        if (v == null) return;
        try { cb(v); } catch (e) {}
      });
    }
    rappels.push(tour);
    tour();
  }

  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState !== 'visible') return;
    rappels.forEach(function (f) { try { f(); } catch (e) {} });
  });

  // Équivalent de .orderByChild(cle) puis .reverse() : les enfants sans la clé
  // passent en dernier, comme avec le SDK.
  function trierParDesc(objet, cle) {
    var liste = [];
    for (var k in objet) if (Object.prototype.hasOwnProperty.call(objet, k)) liste.push(objet[k]);
    liste.sort(function (a, b) {
      var va = (a && a[cle] != null) ? a[cle] : -Infinity;
      var vb = (b && b[cle] != null) ? b[cle] : -Infinity;
      return va === vb ? 0 : (va < vb ? 1 : -1);
    });
    return liste;
  }

  window.MDPdb = { lire: lire, suivre: suivre, trierParDesc: trierParDesc };
})();
