/**
 * Service Worker for Calculator & Grapher PWA
 * Caches all static assets so the app works offline.
 */

const CACHE_NAME = 'calcgraph-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.webmanifest'
];

// Install: cache all static assets immediately
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching static assets');
      return cache.addAll(STATIC_ASSETS);
    })
  );
  // Activate immediately without waiting
  self.skipWaiting();
});

// Activate: clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => {
            console.log(`[SW] Deleting old cache: ${name}`);
            return caches.delete(name);
          })
      );
    }).then(() => {
      // Take control of all pages immediately
      self.clients.claim();
    })
  );
});

// Fetch: serve from cache, fall back to network
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      // Not in cache — fetch from network
      return fetch(event.request).then((response) => {
        // Don't cache non-GET requests
        if (
          event.request.method !== 'GET' ||
          !response.ok ||
          response.type !== 'basic'
        ) {
          return response;
        }
        // Clone and cache the response
        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });
        return response;
      }).catch(() => {
        // Offline fallback for navigation requests
        if (event.request.destination === 'document') {
          return caches.match('/index.html');
        }
        throw new Error('Offline and not cached');
      });
    })
  );
});

// Log service worker lifecycle events
self.addEventListener('push', (event) => {
  const title = 'Calculator & Grapher';
  const options = {
    body: 'PWA push notification support ready',
    icon: '/icon-192.png'
  };
  event.waitUntil(self.registration.showNotification(title, options));
});
