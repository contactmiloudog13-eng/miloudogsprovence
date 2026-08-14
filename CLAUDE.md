# Milou Dogs Provence — mémo de reprise

Ce fichier est chargé automatiquement par Claude Code. Il résume ce qui a déjà
été fait, ce qui ne doit pas être refait, et les pièges déjà rencontrés.

---

## Le projet

Site vitrine et réservation de **Lilou Houssard**, pension et garde d'animaux à
Miramas (13140).

- **Domaine** : `miloudogsprovence.fr` (fichier `CNAME`)
- **Hébergement** : GitHub Pages, dépôt `contactmiloudog13-eng/miloudogsprovence`
- **Déploiement** : tout commit sur `main` est en ligne en une à deux minutes.
  Il n'y a ni préproduction ni étape de compilation.
- **56 pages HTML**, 47 URL au sitemap.

## Architecture

Site **statique**, sans serveur applicatif. Tout le dynamique passe par des
services tiers appelés depuis le navigateur.

| Brique | Rôle |
|---|---|
| Firebase Realtime Database | réservations, comptes clients, galerie, tarifs |
| Firebase Auth | connexion client (**hors du chemin critique**, voir plus bas) |
| EmailJS | `service_i6phwqu` · `template_el176m5` (demande) · `template_jfbovaq` (confirmation) |
| Web3Forms | secours e-mail — dépend des attributs `name=` des champs |
| `app/` | PWA avec service worker (`app/sw.js`, cache `milou-app-v22`) |

### Les tarifs

`site_config/tarifs` dans Firebase pilote les prix **à l'exécution**. Des valeurs
de repli sont codées en dur dans **5 fichiers**. Toute modification de tarif doit
être répercutée partout, sinon le site affiche deux prix différents selon la page.

`tarifs-fetes.js` gère les majorations de fin d'année ; `site-flags.js` est un
interrupteur de fonctionnalités. **Ces deux fichiers sont désormais inclus
directement dans `index.html`** (ils étaient bloquants, 160 ms chacun).

---

## Règles à ne pas enfreindre

1. **Ne rien casser.** C'est la consigne constante du client, répétée à chaque
   demande. Tout changement de vitesse ou de style doit être vérifié par les
   tests avant d'être poussé.
2. **Mesurer avant de conclure.** Plusieurs « optimisations » évidentes se sont
   révélées être des régressions (détail plus bas). Ne jamais annoncer un gain
   sans l'avoir mesuré sous le bridage de Lighthouse.
3. **Ne jamais tester un site tiers** autrement que par PageSpeed Insights.
   Le client a posé la question ; la réponse donnée était : PageSpeed sur un
   site public, oui ; scan, sondage ou soumission de formulaire, non.
4. **Le format `hidden-devis`** (`libellé | montant`, séparés par `<br>`, ligne
   `Total | …` finale) est lu par l'administration. Ne pas le modifier.
5. **Bumper `CACHE` dans `app/sw.js`** à chaque modification de la PWA, sinon
   les clients gardent l'ancienne version.

---

## Travaux déjà réalisés — ne pas recommencer

### Vitesse

Mesures **réelles**, relevées par le client sur PageSpeed Insights (mobile) :

| | Avant | Après |
|---|---|---|
| FCP | 3,1 s | **1,5 s** |
| LCP | 9,3 s | **3,6 s** |
| CLS | 0,208 | **0,02** |
| Speed Index | 3,1 s | **1,5 s** |
| TBT | — | 20 ms |

Ce qui a produit ces gains, dans l'ordre d'importance :

- **Le hero n'attend plus Firebase.** `.hero-bg` était maintenu à `opacity:0`
  jusqu'à une réponse de la base. C'était la cause du LCP à 9,3 s.
  Il est désormais `opacity:1!important` d'entrée.
- **Le bloc `<style>` mobile a été déplacé en fin de `<body>` vers le `<head>`.**
  C'était la cause unique du CLS à 0,208 : la page se dessinait, puis se
  réorganisait quand la règle arrivait.
- **Firebase Auth sorti du chemin critique** (`firebase-auth.js`). Il déclenchait
  une iframe de 93 Ko depuis une quatrième origine et un appel `getProjectConfig`
  de 944 ms. Il est maintenant lancé en `requestIdleCallback`, et le prénom est
  lu depuis `localStorage` (`mdpDejaConnecte`) pour éviter tout accès réseau.
- **Polices auto-hébergées et sous-ensemblées** dans `polices/` — Lato 300/400/700
  et Playfair Display 400/400i/700, en latin et latin-ext. Plus aucun appel à
  Google Fonts. ~113 Ko retirés du chemin critique.
- **Images redimensionnées** : mosaïque en `-800` sur ordinateur, `-500` sur
  mobile ; `.ap1`–`.ap4` en `-500` ; fond Évasion en `IMG_1073-fond-mob.webp`.
- **`content-visibility:auto`** sur `.mosaic-grid`, `.about-photo-grid`,
  `.video-wrap` — diffère le rendu *et* le chargement des images hors écran.

### Le bug de la page blanche

Signalé par le client comme « le site charge dans le vide » chez certains
visiteurs. Deux causes, toutes deux corrigées :

- `effects-extra.js` mettait `document.body.style.opacity = '0'` et n'attendait
  que `window.load` pour le rétablir. **Une seule ressource bloquée laissait la
  page blanche indéfiniment.** Il y a maintenant trois filets : `DOMContentLoaded`,
  `load`, et un `setTimeout` de 1 500 ms.
- `app/app.css` avait un `@import` bloquant — même classe de panne.

Tous les accès à Firebase sont désormais protégés par
`if (typeof firebase === 'undefined' || !firebase.database) { … }`, avec un
rappel d'erreur. Le site fonctionne intégralement sans Firebase.

### Accessibilité, SEO, bonnes pratiques

- **0 violation axe-core sur 16 pages** (le moteur exact de Lighthouse).
- **0 problème** aux contrôles SEO et bonnes pratiques sur 15 pages.
- **48 titres uniques sur 48 pages indexables** — plus aucun doublon.
- Liens `javascript:void(0)` convertis en `<button>` avec `aria-expanded`
  (bandeau cookies, menu « Plus ▾ » dans `chatbot.js`).
- Contraste : `--lavande` passé de `#7b6fa0` à `#706497`.

### SEO « autres animaux »

15 pages créées de zéro, 800 à 1 000 mots uniques chacune, avec JSON-LD
(LocalBusiness + Service + FAQPage + BreadcrumbList) :

- 1 page pilier : `garde-chat-domicile.html`
- 8 pages ville : Miramas, Istres, Salon, Martigues, Fos, Berre, Port-de-Bouc,
  Saint-Chamas
- 3 pages espèce : lapin/rongeur, poules, NAC
- 3 articles de fond

Une section `#autres-animaux` a été ajoutée à `index.html`.

### Réservation — bugs corrigés

- **1 chien + 3 chats en visite à domicile était refusé.** Le test portait sur
  « aucun chien », ce qui est faux : un chien peut être visité chez lui plutôt
  que mis en pension. Corrigé dans `_validateStep2()` en filtrant sur
  `dataset.visite !== '1'`.
- **Réservation acceptée sans adresse de visite** quand un chien partait en
  pension et que les chats étaient visités. Corrigé.
- **Les animaux autres que les chiens ne partaient pas dans l'e-mail.** Nouveau
  champ `hidden-animaux`, rempli au format `1 chien, 3 chats, 1 lapin`.
- `DEPL_MIRAMAS` remis de 10 à 0.

**112 combinaisons** (4 nombres de chiens × 4 compositions d'espèces × 7 services)
sont balayées par `tests/matrice.js` — toutes au vert.

---

## Régressions déjà commises — ne pas les refaire

Ce sont de vraies erreurs, mesurées puis annulées. Elles paraissent toutes
raisonnables sur le papier.

1. **`fetchpriority="high"` sur le préchargement du hero.** Faisait passer 108 Ko
   d'image *devant* le CSS bloquant. FCP : 3,1 s → **5,5 s**. Retiré.
2. **Première tentative d'auto-hébergement des polices.** CLS mesuré à 0,208 →
   **0,364** sur 8 exécutions. Annulée entièrement, puis refaite avec succès une
   fois la vraie cause du CLS (le bloc `<style>` mal placé) corrigée.
3. **Sous-ensemble de polices trop agressif.** Avait supprimé `²` (2 000 m²), `©`,
   `›` (fil d'Ariane), `ᵉʳ`. Refait avec le latin-1 complet ; les 135 caractères
   réellement présents sur le site sont couverts.
4. **Mesures faites à 9 Mb/s** alors que Lighthouse teste à **1,6 Mb/s, 150 ms,
   processeur ÷4**. Les chiffres annoncés étaient optimistes de plusieurs
   secondes. Utiliser `tests/lh.js`, qui applique le bon bridage.
5. **Changements de niveau de titre (`<h4>` → `<h2>`)** qui orphelinent les
   sélecteurs CSS. `.fp-col h4{…}` a dû être élargi en `.fp-col h2,.fp-col h3,
   .fp-col h4{…}`. Toujours vérifier les styles calculés dans le navigateur.

---

## État actuel et limites connues

**Notes PageSpeed** — le client observe une **variabilité forte : 98 un essai,
60 le suivant**. Ce point n'est **pas élucidé**. Hypothèse avancée mais non
vérifiée : cache froid du CDN GitHub Pages. C'est le sujet technique en cours.

- Accessibilité, bonnes pratiques et SEO ne dépendent **pas** de l'hébergement :
  ils sont directement actionnables.
- La performance mesurée en local ne peut pas coïncider avec GitHub Pages
  (en-têtes de cache, CDN réel, Firebase réel).
- **En-têtes de cache (628 Kio)** : limite de GitHub Pages. Il faudrait mettre
  Cloudflare devant le domaine pour les corriger. Décision du client à prendre.

**Lighthouse 13.4.1** est la version utilisée par PageSpeed (confirmé sur les
captures du client). L'installer en local permet de reproduire ses notes.

---

## Ce qui reste à faire

- **Élucider la variabilité 98 → 60.** Priorité du client.
- Re-mesurer **bonnes pratiques (77)** et **SEO (92)** après les corrections
  d'accessibilité et de balises — ces notes datent d'avant.
- Objectif affiché : **100 partout**.

Un plan validé mais **non implémenté** existe pour présenter le devis de
réservation au format de la facture (postes datés, sous-total, remise chiffrée
en euros). Il se trouve dans l'historique de plan, pas dans le dépôt.

---

## Tests

Voir `tests/LISEZMOI.md`. En résumé :

```bash
python3 tests/serveur.py &          # sert le dépôt sur :8899, avec gzip
node tests/matrice.js               # 112 combinaisons de réservation
node tests/a11y.js index.html …     # accessibilité (axe-core)
node tests/lh.js                    # vitesse, bridage Lighthouse exact
```

Le serveur de test **compresse en gzip** comme GitHub Pages ; un
`python3 -m http.server` ordinaire fausse toute mesure de vitesse.
