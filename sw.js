/**
 * BRPD NIBRS Compliance Tool — Service Worker
 * 
 * UPDATE INSTRUCTIONS:
 *   When deploying a new version of index.html, increment CACHE_VERSION below.
 *   Format: 'vYYYY.M.N'  (e.g. 'v2025.2.0')
 *   On next visit, users will see an "Update available" toast and can refresh
 *   to get the new version immediately.
 */

const CACHE_VERSION = 'v2025.1.0';
const CACHE_NAME    = `brpd-nibrs-${CACHE_VERSION}`;

// Files to pre-cache on install
const PRECACHE_ASSETS = [
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

// ── Install: pre-cache all assets ──────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_ASSETS))
      .then(() => self.skipWaiting())   // Activate immediately after install
  );
});

// ── Activate: clean up old caches ─────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames
            .filter((name) => name.startsWith('brpd-nibrs-') && name !== CACHE_NAME)
            .map((name) => caches.delete(name))
        )
      )
      .then(() => self.clients.claim())
  );
});

// ── Fetch: network-first for HTML, cache-first for everything else ─────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle same-origin requests
  if (url.origin !== location.origin) {
    return;
  }

  if (request.destination === 'document') {
    // Network-first for HTML: ensures updates reach users quickly
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return networkResponse;
        })
        .catch(() => caches.match(request))
    );
  } else {
    // Cache-first for all other assets
    event.respondWith(
      caches.match(request)
        .then((cached) =>
          cached ||
          fetch(request).then((networkResponse) => {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
            return networkResponse;
          })
        )
    );
  }
});

// ── Message handler: force refresh on client request ──────────────────────
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
