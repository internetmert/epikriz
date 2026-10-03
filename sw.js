/* Epikriz service worker — network-first, ağ yokken cache'ten sun */
const CACHE = 'epikriz-v2';
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

// Sayfa önbellekten açıldıysa ve ağdaki sürüm farklıysa sayfaya "yeni sürüm var" de
async function notifyUpdate(clientId) {
  let targets = [];
  if (clientId) { const c = await self.clients.get(clientId); if (c) targets = [c]; }
  if (!targets.length) targets = await self.clients.matchAll({ type: 'window' });
  targets.forEach(c => c.postMessage({ type: 'update-available' }));
}

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  if (new URL(e.request.url).origin !== location.origin) return; // Supabase vb. dokunma
  const isPage = e.request.mode === 'navigate';
  e.respondWith((async () => {
    const networkRaw = fetch(e.request);
    const cached = await caches.match(e.request, { ignoreSearch: true })
      .then(m => m || (isPage ? caches.match('./index.html') : undefined))
      .catch(() => undefined); // bozuk cache-storage sağlam ağdaki isteği düşürmesin
    const cachedCopy = (cached && isPage) ? cached.clone() : null; // karşılaştırma için
    let servedFromCache = false, networkArrived = false;
    const network = networkRaw.then(r => {
      const wasCached = servedFromCache; // ağ geldiği anda sayfa önbellekten mi açılmıştı?
      networkArrived = true;
      if (r.ok && r.type === 'basic') {
        const copy = r.clone();
        if (cachedCopy && wasCached) {
          const fresh = r.clone();
          // Ağ cevabı geldiğinde sayfa zaten önbellekten açılmışsa ve içerik değiştiyse haber ver
          e.waitUntil(Promise.all([cachedCopy.text(), fresh.text()]).then(([a, b]) => {
            if (a !== b) return notifyUpdate(e.resultingClientId || e.clientId);
          }).catch(() => {}));
        }
        e.waitUntil(caches.open(CACHE).then(c => c.put(e.request, copy)));
        return r;
      }
      // 404/500 vb. önbelleğe yazılmaz; varsa sağlam kopya sunulur
      return cached || r;
    });
    if (!cached) return network; // önbellek yoksa ağı beklemekten başka yol yok
    // Zayıf ağda (lie-fi) açılışı ağ zaman aşımına kilitleme: yanıt gecikirse
    // önbellekten aç; ağ yanıtı arka planda önbelleği tazelemeye devam eder.
    e.waitUntil(network.catch(() => {}));
    const timeout = new Promise(res => setTimeout(() => { if (!networkArrived) servedFromCache = true; res(cached); }, 2500));
    return Promise.race([network.catch(() => { servedFromCache = true; return cached; }), timeout]);
  })());
});
