// Service Worker – wird beim Build von vite.config.ts mit Version und Dateiliste befüllt.
// Strategie: Seite (index.html) zuerst aus dem Netz, damit nie ein alter Build hängen bleibt;
// offline aus dem Cache. Alles andere (gehashte Assets, Icons) aus dem Cache.
const VERSION = __VERSION__;
const PRECACHE = __PRECACHE__;
const CACHE = `haveyoutried-${VERSION}`;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.addAll(PRECACHE.map((p) => new Request(p, { cache: 'reload' }))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('haveyoutried-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;

  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put('./', copy));
          }
          return res;
        })
        .catch(() => caches.match('./', { cacheName: CACHE, ignoreVary: true }).then((r) => r ?? Response.error())),
    );
    return;
  }

  event.respondWith(
    caches.match(req, { cacheName: CACHE, ignoreSearch: true, ignoreVary: true }).then((hit) => hit ?? fetch(req)),
  );
});
