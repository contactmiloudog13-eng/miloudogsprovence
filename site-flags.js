/* ============================================================
   Milou Dogs Provence — Interrupteurs de fonctionnalités.

   Passer une valeur à true réactive l'offre correspondante :
   rien n'est supprimé, le code reste en place et se rallume seul.

   ⚠️ Ce fichier existe en double : /site-flags.js et
   /app/site-flags.js (le service worker de la PWA ne peut pas
   mettre en cache un fichier situé hors de /app/).
   Toute modification doit être reportée dans les deux.
   ============================================================ */
(function (g) {
  'use strict';

  g.MDP_FLAGS = {
    // Carnet Malin — 10 nuits de pension prépayées à prix réduit.
    // Désactivé : aucune vente à ce jour, l'offre est retirée du site.
    // Repasser à true pour la remettre en ligne partout d'un coup.
    carnetMalin: false
  };

  /* Lecture sûre d'un drapeau. Un drapeau inconnu, ou un fichier non
     chargé sur la page, vaut « désactivé » : on ne montre jamais par
     accident une offre qu'on ne vend plus. */
  g.mdpFlag = function (nom) {
    return !!(g.MDP_FLAGS && g.MDP_FLAGS[nom]);
  };
})(window);
