/* Milou Dogs — Service Worker (offline app shell + cache images) */
const CACHE = 'milou-app-v14';
const IMG_CACHE = 'milou-img-v1';
const IMG_MAX = 120; // nb max de photos gardées hors-ligne
const SHELL = [
  './',
  './index.html',
  './app.css',
  './app.js',
  './chiens.js',
  './reservation.js',
  './galerie.js',
  './profil.js',
  './avis.js',
  './manifest.webmanifest',
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((k) => k !== CACHE && k !== IMG_CACHE).map((k) => caches.delete(k))
    )).then(() => self.clients.claim())
  );
});

// Limite la taille du cache d'images (supprime les plus anciennes)
function trimCache(name, max) {
  caches.open(name).then((c) => c.keys().then((keys) => {
    if (keys.length > max) c.delete(keys[0]).then(() => trimCache(name, max));
  }));
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Images Cloudinary → stale-while-revalidate (instantané au 2e affichage, dispo hors-ligne)
  if (url.hostname === 'res.cloudinary.com') {
    e.respondWith(
      caches.open(IMG_CACHE).then((c) => c.match(req).then((cached) => {
        const net = fetch(req).then((res) => {
          if (res && (res.status === 200 || res.type === 'opaque')) {
            c.put(req, res.clone()); trimCache(IMG_CACHE, IMG_MAX);
          }
          return res;
        }).catch(() => cached);
        return cached || net;
      }))
    );
    return;
  }

  // Autre cross-origin (Firebase, geo API…) → réseau direct
  if (url.origin !== self.location.origin) return;

  // Navigation → réseau d'abord, repli cache hors-ligne
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put('./index.html', copy));
        return res;
      }).catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Fichiers de l'app → cache d'abord, réseau en repli
  e.respondWith(
    caches.match(req).then((cached) => cached || fetch(req).then((res) => {
      if (res && res.status === 200 && res.type === 'basic') {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy));
      }
      return res;
    }).catch(() => cached))
  );
});
