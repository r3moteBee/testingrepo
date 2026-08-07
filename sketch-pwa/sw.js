/**
 * Service Worker for Sketch PWA
 * Implements cache-first strategy for app shell
 */

const CACHE_NAME = 'sketch-pwa-v1';
const APP_SHELL_FILES = [
  './',
  './index.html',
  './styles.css',
  './canvas.js',
  './storage.js',
  './app.js'
];

// Install event - cache app shell files
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Cache opened:', CACHE_NAME);
        return cache.addAll(APP_SHELL_FILES);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_NAME)
            .map((name) => caches.delete(name))
        );
      })
      .then(() => self.clients.claim())
  );
});

// Fetch event - cache-first strategy
self.addEventListener('fetch', (event) => {
  // Only handle GET requests for HTML, CSS, JS
  if (event.request.method !== 'GET' ||
      !event.request.url.match(/\.(html|css|js|json|svg|png|jpg|jpeg|gif|webp|ico)$/)) {
    return;
  }
  
  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        
        // If not in cache, fetch from network
        return fetch(event.request)
          .then((response) => {
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            
            // Clone the response for caching
            const responseToCache = response.clone();
            
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });
            
            return response;
          })
          .catch(() => {
            // Return cached index.html for navigation requests
            if (event.request.headers.get('accept').includes('text/html')) {
              return caches.match('./index.html');
            }
            
            throw new Error('Network request failed');
          });
      })
  );
});
