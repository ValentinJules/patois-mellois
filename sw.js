const CACHE = 'patois-mellois-v1';

// Assets to pre-cache on install
const PRE_CACHE = ['./'];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE).then(c => c.addAll(PRE_CACHE))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Navigation: réseau d'abord, cache en fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(res => {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(request, clone));
          return res;
        })
        .catch(() => caches.match('./'))
    );
    return;
  }

  // Google Fonts: stale-while-revalidate
  if (url.hostname.includes('googleapis') || url.hostname.includes('gstatic')) {
    event.respondWith(
      caches.open(CACHE).then(async c => {
        const cached = await c.match(request);
        const fetchPromise = fetch(request)
          .then(res => { if (res.ok) c.put(request, res.clone()); return res; })
          .catch(() => null);
        return cached || fetchPromise;
      })
    );
    return;
  }

  // Reste: cache-first
  event.respondWith(
    caches.match(request).then(cached => cached || fetch(request))
  );
});
