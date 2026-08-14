# Suite de tests — Milou Dogs Provence

Tests automatisés écrits pendant les sessions d'audit. Ils pilotent un vrai
Chromium et vérifient le site tel qu'un client le voit, pas le code source.

## Mise en route

```bash
cd tests
npm init -y
npm i playwright-core axe-core lighthouse
npx playwright install chromium      # ou : export CHROME=/chemin/vers/chrome
```

Tous les scripts lisent la variable d'environnement `CHROME` pour trouver le
navigateur ; sans elle ils utilisent le chemin du conteneur d'origine.

## Le serveur local

Les tests attaquent `http://localhost:8899`. GitHub Pages compresse les fichiers
texte en gzip ; un `python3 -m http.server` ordinaire ne le fait pas, ce qui
fausse toute mesure de vitesse. D'où `serveur.py`, qui reproduit ce comportement :

```bash
python3 tests/serveur.py &     # sert la racine du dépôt sur le port 8899
```

## Les scripts

### Parcours et non-régression

| Script | Ce qu'il vérifie |
|---|---|
| `test.js` | Page d'accueil, tarifs, FAQ, liens, contenu éditorial |
| `test-resa.js` | Formulaire de réservation : étapes, calculs, validation |
| `test-visite.js` | Visite à domicile, seule ou combinée avec une pension |
| `test-mobile.js` | Affichage mobile, débordements, zones tactiles |
| `test-carnet.js` | Espace client et carnet |
| `test-seo.js` | Balises, JSON-LD, sitemap |
| `matrice.js` | **112 combinaisons** du formulaire, balayées systématiquement |

`matrice.js` est le plus utile après toute modification de `reservation.html` :
il croise 4 nombres de chiens × 4 compositions d'espèces × 7 services, remplit
tout ce que le formulaire affiche, et contrôle la validation, le prix, et les
champs transmis à l'administration.

### Qualité mesurée comme Lighthouse

| Script | Ce qu'il mesure |
|---|---|
| `a11y.js` | Accessibilité avec **axe-core**, le moteur exact de Lighthouse |
| `seo-bp.js` | Les contrôles SEO et « bonnes pratiques » de Lighthouse |
| `lh.js` | FCP / LCP / CLS avec le bridage réseau **exact** de Lighthouse |
| `mobile-vs-bureau.js` | Le même code sous les deux profils, chiffres à l'appui |
| `contraste.js` | Contraste des couleurs |
| `visuel.js`, `nav.js` | Rendu et navigation |

Usage : `node tests/a11y.js index.html reservation.html faq.html …`

## Pièges connus du harnais

Trois comportements du site ressemblent à des bugs quand on teste, mais sont
voulus. Ils sont documentés ici pour ne pas être « corrigés » par erreur.

1. **`goStep(1→2)` est bloqué** tant que la fenêtre « créez un compte » est
   ouverte. Elle n'apparaît qu'une fois par session.
   Neutraliser avec `sessionStorage.setItem('mdp_acct','1')`.
2. **Sans chien**, le bloc « quel service » est masqué et la visite à domicile
   est activée d'office. Les services réservés au chien sont alors sans objet.
3. **`toggleAnimal(k, on)` exige son second argument.** Appelée sans lui, elle
   **retire** l'animal au lieu de l'ajouter.

## Le bridage de Lighthouse

Pour mesurer la vitesse honnêtement, il faut ces réglages — pas du « bon Wi-Fi ».

|  | Mobile | Bureau |
|---|---|---|
| Débit descendant | 1,6 Mb/s | 10 Mb/s |
| Latence | 150 ms | 40 ms |
| Processeur | ÷ 4 | normal |
| Écran | 412 × 823 @ 1,75 | 1350 × 940 @ 1 |

Seuils à tenir : FCP ≤ 1,8 s · LCP ≤ 2,5 s · CLS ≤ 0,1.
