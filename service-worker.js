/* ================================================================
   Service Worker — caches all assets for offline use.
   Includes index.html and any future graphing JS modules.
   ================================================================ */

const CACHE_NAME = 'calcgraph-v1';
const PRECACHE_URLS = [
  '/',
  '/index.html',
];

// Install: precache core assets.
self.addEventListener('install', (evt) => {
  evt.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      cache.addAll(PRECACHE_URLS)
    )
  );
  self.skipWaiting();   // activate immediately
});

// Activate: clean old caches.
self.addEventListener('activate', (evt) => {
  evt.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names.filter(n => n !== CACHE_NAME)
             .map(n => caches.delete(n))
      )
    )
  );
  self.clients.claim();   // take control of pages
});

// Fetch: serve from cache; fall back to network.
self.addEventListener('fetch', (evt) => {
  evt.respondWith(
    caches.match(evt.request).then((cached) =>
      cached || fetch(evt.request)
    )
  );
});
