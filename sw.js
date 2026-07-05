/* Epikriz service worker — network-first, ağ yokken cache'ten sun */
const CACHE = 'epikriz-v1';
const CORE = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png', './apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  if (new URL(e.request.url).origin !== location.origin) return; // Supabase vb. dokunma
  e.respondWith(
    fetch(e.request)
      .then(r => {
        if (r.ok && r.type === 'basic') {
          const copy = r.clone();
          caches.open(CACHE).then(c => c.put(e.request, copy));
          return r;
        }
        // 404/500 vb. önbelleğe yazılmaz; varsa sağlam kopya sunulur
        return caches.match(e.request, { ignoreSearch: true })
          .then(m => m || (e.request.mode === 'navigate' ? caches.match('./index.html') : undefined))
          .then(m => m || r);
      })
      .catch(() =>
        caches.match(e.request, { ignoreSearch: true })
          .then(m => m || (e.request.mode === 'navigate' ? caches.match('./index.html') : undefined))
      )
  );
});
