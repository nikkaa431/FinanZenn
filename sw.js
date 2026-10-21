// FinanZen — service worker (modo sin conexión)
const CACHE = 'finanzen-v1.9.5';
const CORE = [
  './FinanZen.html',
  './manifest.webmanifest',
  './icons/apple-touch-icon.png',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Tipos de cambio: siempre de la red (la app guarda su propia copia).
  if (url.hostname.endsWith('er-api.com')) return;

  // La app (HTML): primero red para recibir actualizaciones; si no hay internet, la copia guardada.
  if (req.mode === 'navigate' || (url.origin === location.origin && url.pathname.endsWith('.html'))) {
    e.respondWith(
      // cache:'no-cache' = siempre pregunta a GitHub si hay versión nueva (no usa la copia de 10 min del navegador)
      fetch(url.href, {cache: 'no-cache', credentials: 'same-origin'})
        .then(res => { if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); } return res; })
        .catch(() => caches.match(req, {ignoreSearch: true}).then(r => r || caches.match('./FinanZen.html')))
    );
    return;
  }

  // Todo lo demás (iconos, pdf.js del CDN): copia guardada primero, y se guarda al descargarse.
  e.respondWith(
    caches.match(req).then(hit => hit || fetch(req).then(res => {
      if (res.ok || res.type === 'opaque') { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
      return res;
    }))
  );
});
