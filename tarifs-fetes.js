/* ============================================================
   Milou Dogs Provence — Majorations tarifaires des périodes
   de forte affluence (fêtes de fin d'année, vacances…).

   Ne concerne QUE la pension à la nuit. La garderie, les
   promenades, les visites à domicile et le toilettage gardent
   leur tarif habituel.

   Une nuit est facturée au tarif de son JOUR D'ARRIVÉE :
   la nuit du 24 au 25 décembre est au tarif du 24.

   ⚠️ Ce fichier existe en double : /tarifs-fetes.js et
   /app/tarifs-fetes.js (le service worker de la PWA ne peut
   pas mettre en cache un fichier situé hors de /app/).
   Toute modification doit être reportée dans les deux.
   ============================================================ */
(function (g) {
  'use strict';

  var PERIODES = [{
    id: 'noel-2026',
    label: 'Vacances de Noël',
    libelleCourt: 'du 20 décembre 2026 au 2 janvier 2027',
    debut: '2026-12-20',
    fin: '2027-01-02',
    tarifHaut: 30,
    tarifFort: 35,
    joursForts: ['2026-12-24', '2026-12-25', '2026-12-31', '2027-01-01']
  }];

  /* Période majorée contenant la date ISO (YYYY-MM-DD), sinon null.
     La comparaison lexicographique est exacte sur ce format. */
  function periodeDe(iso) {
    if (!iso) return null;
    for (var i = 0; i < PERIODES.length; i++) {
      if (iso >= PERIODES[i].debut && iso <= PERIODES[i].fin) return PERIODES[i];
    }
    return null;
  }

  /* Tarif de la nuit commençant le jour `iso`.
     `base` = tarif pension courant (piloté depuis Firebase). */
  function tarifNuit(iso, base) {
    var p = periodeDe(iso);
    if (!p) return base;
    return p.joursForts.indexOf(iso) !== -1 ? p.tarifFort : p.tarifHaut;
  }

  /* Dates ISO des `n` nuits à partir de `isoDebut`.
     Midi local : insensible aux fuseaux et au changement d'heure. */
  function datesNuits(isoDebut, n) {
    var out = [], d, i;
    if (!isoDebut || !(n > 0)) return out;
    d = new Date(isoDebut + 'T12:00:00');
    if (isNaN(d)) return out;
    for (i = 0; i < n; i++) {
      out.push(d.getFullYear() + '-' +
        ('0' + (d.getMonth() + 1)).slice(-2) + '-' +
        ('0' + d.getDate()).slice(-2));
      d.setDate(d.getDate() + 1);
    }
    return out;
  }

  /* Tarifs nuit par nuit pour un séjour, prêts à sommer. */
  function tarifsSejour(isoDebut, nuits, base) {
    return datesNuits(isoDebut, nuits).map(function (iso) {
      return tarifNuit(iso, base);
    });
  }

  /* Périodes majorées encore à venir (pour les bandeaux d'information). */
  function periodesAVenir(auj) {
    var today = auj || new Date().toISOString().slice(0, 10);
    return PERIODES.filter(function (p) { return p.fin >= today; });
  }

  g.MDP_FETES = {
    periodes: PERIODES,
    periodeDe: periodeDe,
    tarifNuit: tarifNuit,
    datesNuits: datesNuits,
    tarifsSejour: tarifsSejour,
    periodesAVenir: periodesAVenir
  };
})(window);
