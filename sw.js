/* Nihongo Quest service worker: versioned app-shell cache, cache-first for same-origin GETs. */
const CACHE = 'nq-v1.0.29';
const AUDIO_CACHE = 'nq-audio';   // 雲端音檔 heard so far: kept across releases
// A clip's two addresses: R2, where the app fetches it since 1.0.29, and the Supabase bucket R2 is a copy of, which the
// app falls back to and which every clip cached before 1.0.29 is filed under
const AUDIO_HOST = 'https://audio.nihongoquest.app/';
const AUDIO_PATH = '/storage/v1/object/public/JPY_audio/';
const AUDIO_SUPABASE = 'https://pwudaariihdshiwqbkfx.supabase.co' + AUDIO_PATH;
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
  './data.js?v=16'
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
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE && k !== AUDIO_CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const r2 = req.url.startsWith(AUDIO_HOST);
  if (r2 || url.pathname.includes(AUDIO_PATH)) {   // a clip is immutable (named by its hash): cache first, forever
    event.respondWith(caches.open(AUDIO_CACHE).then(async (cache) => {
      const match = (key) => cache.match(key, { ignoreVary: true });   // by address alone: R2 answers "Vary: Origin"
      const hit = (await match(req)) || (r2 && await match(AUDIO_SUPABASE + req.url.slice(AUDIO_HOST.length)));
      if (hit) return hit;
      const res = await fetch(req);
      if (res && res.ok) cache.put(req, res.clone());
      return res;
    }));
    return;
  }
  if (url.origin !== self.location.origin) return; // Supabase, fonts, APIs: network only
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
