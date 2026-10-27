/* Nihongo Quest service worker: versioned app-shell cache, cache-first for same-origin GETs. */
const CACHE = 'nq-v52';
const PRECACHE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
  './vendor/supabase.js',
  './sync-core.js',
  './config.js',
  './data.js?v=5'
];
// Versioned, immutable files: when the previous cache already holds the same URL, copy it instead of downloading
const IMMUTABLE = /\?v=\d+$/;

self.addEventListener('install', (event) => {
  // cache: 'reload' bypasses the HTTP cache (GitHub Pages sends max-age=600) so a new release never precaches a stale index.html
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    const fresh = [];
    for (const u of PRECACHE) {
      if (IMMUTABLE.test(u)) { const old = await caches.match(u); if (old) { await cache.put(u, old); continue; } }
      fresh.push(new Request(u, { cache: 'reload' }));
    }
    await cache.addAll(fresh);
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  if (new URL(req.url).origin !== self.location.origin) return; // Supabase, fonts, APIs: network only
  event.respondWith(
    caches.match(req).then((hit) => {
      if (hit) return hit;
      return fetch(req).then((res) => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((cache) => cache.put(req, copy));
        }
        return res;
      }).catch(() => (req.mode === 'navigate' ? caches.match('./index.html') : undefined));
    })
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});
