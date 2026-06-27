// Service Worker - Hutang Puasa Family
// Cache app shell (HTML, manifest, icon) agar app bisa dibuka cepat / saat offline.
// Data chat & catatan tetap real-time lewat Firebase (tidak di-cache di sini).

const CACHE_NAME = 'hutang-puasa-v1';
const APP_SHELL = [
  './index_hutang_puasa.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-512-maskable.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
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

  // Hanya tangani request GET ke origin sendiri (file app shell).
  // Request ke Firebase / CDN luar dibiarkan lewat langsung (selalu online/network).
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) {
    return;
  }

  event.respondWith(
    caches.match(req).then((cached) => {
      const fetchPromise = fetch(req)
        .then((res) => {
          if (res && res.status === 200) {
            const resClone = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
          }
          return res;
        })
        .catch(() => cached); // offline -> pakai cache

      // Network-first untuk HTML (biar update terbaru kepakai), cache-first untuk asset lain
      if (req.destination === 'document') {
        return fetchPromise.then((res) => res || cached);
      }
      return cached || fetchPromise;
    })
  );
});
