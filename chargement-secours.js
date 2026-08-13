/* ============================================================
   Milou Dogs Provence — Filet de securite « chargement infini ».

   Plusieurs clients ont signale un site qui « tourne en rond ».
   Cause : les lectures Firebase sont posees sans callback d'erreur.
   Quand une requete est refusee (droits, index manquant, reseau
   coupe), elle echoue EN SILENCE : le rendu n'est jamais declenche
   et l'ecran reste sur « Chargement… » indefiniment.

   Corriger chaque appel un par un serait long et risque. Ce module
   surveille donc l'ecran : si un bloc affiche encore « Chargement »
   au bout de 8 secondes, il le remplace par un message clair et un
   bouton pour reessayer. Le visiteur n'est jamais coince.
   ============================================================ */
(function () {
  'use strict';
  var DELAI = 12000;   // large : mieux vaut attendre un peu que couper un chargement lent

  function estUnLoader(el) {
    var t = (el.textContent || '').trim();
    return /^chargement/i.test(t) && t.length < 60;
  }

  function secours(el) {
    if (!el || !el.isConnected || !estUnLoader(el)) return;
    el.innerHTML =
      '<div style="text-align:center;padding:22px 16px;font-size:.88rem;color:#6B6760;line-height:1.6;">' +
      '😕 Le chargement prend plus de temps que prévu.<br>' +
      'Vérifiez votre connexion, puis réessayez.' +
      '<div style="margin-top:14px;">' +
      '<button type="button" onclick="location.reload()" style="background:#7B6FA0;color:#fff;border:none;' +
      'padding:9px 20px;border-radius:20px;font-family:Lato,sans-serif;font-size:.85rem;font-weight:700;cursor:pointer;">' +
      '↻ Réessayer</button></div>' +
      '<div style="margin-top:10px;font-size:.78rem;opacity:.8;">Si le problème persiste : 07 77 23 40 88</div>' +
      '</div>';
  }

  function surveiller() {
    // On remplace le TEXTE du loader lui-meme, pas son parent : le parent
    // contient souvent d'autres elements et le message de secours ecraserait
    // du contenu legitime.
    document.querySelectorAll('div,p,span').forEach(function (el) {
      if (el.children.length !== 0 || !estUnLoader(el)) return;
      setTimeout(function () { secours(el); }, DELAI);
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', surveiller);
  else surveiller();
  // Deuxieme passe : certains loaders sont injectes apres coup
  setTimeout(surveiller, 2500);
})();
