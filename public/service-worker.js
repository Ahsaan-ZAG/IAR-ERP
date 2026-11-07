/* Imam Ahmed Raza Academy — Service Worker
 * STRICT: caches ONLY static shell assets.
 * Never caches HTML, API, mobile routes, or private data.
 */

const CACHE_NAME = 'ira-shell-v1';
const STATIC_ASSETS = [
  '/css/app.css',
  '/js/pwa-register.js',
  '/manifest.webmanifest',
  '/icons/ira.svg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Same-origin only
  if (url.origin !== self.location.origin) return;

  // Never intercept non-GET
  if (req.method !== 'GET') return;

  // Never intercept private/session routes
  if (url.pathname.startsWith('/api/')) return;
  if (url.pathname.startsWith('/auth/')) return;
  if (url.pathname.startsWith('/mobile/auth/')) return;
  if (url.pathname.startsWith('/ai/ask')) return;
  if (url.pathname.startsWith('/analytics/chart/')) return;
  if (url.pathname.startsWith('/reports/')) return;
  if (url.pathname.startsWith('/payments/') && url.pathname.endsWith('.pdf')) return;

  // Only serve from cache for the explicit whitelist
  if (!STATIC_ASSETS.includes(url.pathname)) return;

  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        if (!res || res.status !== 200 || res.type !== 'basic') return res;
        const copy = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(req, copy)).catch(() => {});
        return res;
      }).catch(() => cached);
    })
  );
});