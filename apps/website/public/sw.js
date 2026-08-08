const CACHE = 'mdh-v4';
// Only cache static assets — never precache HTML pages (breaks Next.js RSC navigation).
const PRECACHE = ['/manifest.json', '/images/logo.png', '/icon-192.png'];

function isAppNavigation(request) {
  if (request.mode === 'navigate') return true;
  const accept = request.headers.get('accept') || '';
  if (accept.includes('text/html')) return true;
  if (request.headers.get('RSC') === '1') return true;
  if (request.headers.get('Next-Router-Prefetch') === '1') return true;
  if (request.headers.get('Next-Router-State-Tree')) return true;
  return false;
}

function shouldCache(request, response) {
  const url = new URL(request.url);
  if (url.pathname.startsWith('/_next/')) return false;
  if (url.pathname.startsWith('/api/')) return false;
  if (request.headers.get('accept')?.includes('text/html')) return false;
  if (!response.ok || response.type === 'opaque') return false;
  return url.pathname.startsWith('/images/') || url.pathname === '/manifest.json';
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  // Never intercept Next.js bundles or app navigations.
  if (url.pathname.startsWith('/_next/')) return;
  if (isAppNavigation(event.request)) return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (shouldCache(event.request, response)) {
          const clone = response.clone();
          caches.open(CACHE).then((cache) => cache.put(event.request, clone));
        }
        return response;
      });
    }),
  );
});
