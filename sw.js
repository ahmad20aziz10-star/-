/* ============================================================
   سهرة — عامل الخدمة (Service Worker)
   الهدف: بعد أول زيارة تعمل اللعبة بلا إنترنت إطلاقاً.
   الاستراتيجية: الشبكة أولاً للصفحة (ليصل التحديث فوراً)،
   ومع فشلها نرجع للنسخة المحفوظة. والأيقونات من المخزن مباشرة.
   ============================================================ */
const V = 'sahra-v1';
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
      .then(c => c.addAll(SHELL))
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

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  /* لا نلمس وسطاء MQTT ولا أي طلب خارج نطاق الموقع */
  if (url.origin !== self.location.origin) return;

  const isPage = req.mode === 'navigate' ||
    (req.headers.get('accept') || '').includes('text/html');

  if (isPage) {
    /* الشبكة أولاً: التحديث يصل فوراً، وبلا إنترنت نرجع للمحفوظ */
    e.respondWith(
      fetch(req)
        .then(res => {
          const copy = res.clone();
          caches.open(V).then(c => c.put('./index.html', copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match('./index.html').then(r => r || caches.match('./')))
    );
    return;
  }

  /* الأصول الثابتة: المخزن أولاً */
  e.respondWith(
    caches.match(req).then(hit => hit || fetch(req).then(res => {
      if (res && res.ok) {
        const copy = res.clone();
        caches.open(V).then(c => c.put(req, copy)).catch(() => {});
      }
      return res;
    }).catch(() => hit))
  );
});
