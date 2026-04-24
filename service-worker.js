/**
 * service-worker.js — Cache static assets for offline use.
 */

const CACHE_NAME = 'calc-graph-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/app.js',
  '/manifest.webmanifest',
];

// Install: cache all static assets.
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting(); // Activate immediately.
});

// Activate: clean up old caches.
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name))
      )
    )
  );
  self.clients.claim(); // Take control of all clients.
});

// Fetch: serve from cache, fallback to network.
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});