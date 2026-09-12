const V = 'sahra-v4';
const PAGE = './index.html';
const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon.svg',
  './icon-180.png',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(V)
      .then(c => Promise.all(SHELL.map(u => c.add(u).catch(() => {}))))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function refresh(req, key) {
  return fetch(req).then(res => {
    if (res && (res.ok || res.type === 'opaqueredirect')) {
      const copy = res.clone();
      caches.open(V).then(c => c.put(key || req, copy)).catch(() => {});
    }
    return res;
  });
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  const isPage = req.mode === 'navigate' ||
    (req.headers.get('accept') || '').includes('text/html');

  if (isPage) {
    e.respondWith(
      caches.match(PAGE).then(hit => {
        const net = refresh(req, PAGE).catch(() => null);
        if (hit) { e.waitUntil(net); return hit; }
        return net.then(res => res || caches.match('./'));
      })
    );
    return;
  }

  e.respondWith(
    caches.match(req).then(hit => {
      if (hit) return hit;
      return refresh(req).catch(() => caches.match(PAGE));
    })
  );
});

self.addEventListener('message', e => {
  if (e.data === 'skip-waiting') self.skipWaiting();
});
