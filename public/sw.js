/*
 * Service Worker – bewusst schlank und selbst geschrieben (keine SW-Library),
 * damit das Verhalten nachvollziehbar und wartbar bleibt.
 *
 * Strategie:
 *   - /api/*        : immer Netzwerk (nie cachen; Versionspruefung braucht Frische).
 *   - Navigationen  : Network-first, offline Fallback auf gecachte App-Shell "/".
 *   - statische Assets (_next, Icons, Manifest): Cache-first mit Nachladen.
 *
 * Die eigentlichen Daten liegen offline in IndexedDB – der SW cacht nur die Huelle.
 */
const CACHE = 'gemeindeplaner-v1';
const SHELL = ['/', '/manifest.webmanifest', '/icons/icon-192.png', '/icons/icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // API niemals cachen.
  if (url.pathname.startsWith('/api/')) {
    return; // Standard-Netzwerkverhalten des Browsers
  }

  // Navigationen: Network-first mit Offline-Fallback auf die App-Shell.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put('/', copy)).catch(() => {});
          return res;
        })
        .catch(async () => (await caches.match('/')) || (await caches.match(req)) || offlineFallback()),
    );
    return;
  }

  // Statische Assets: Cache-first, dann Netzwerk (und nachcachen).
  event.respondWith(
    caches.match(req).then(
      (hit) =>
        hit ||
        fetch(req).then((res) => {
          if (res.ok && (url.pathname.startsWith('/_next/') || url.pathname.startsWith('/icons/'))) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
          }
          return res;
        }),
    ),
  );
});

function offlineFallback() {
  return new Response(
    '<!doctype html><meta charset="utf-8"><title>Offline</title>' +
      '<body style="font-family:system-ui;padding:2rem"><h1>Offline</h1>' +
      '<p>Die App-Huelle ist noch nicht gecacht. Bitte einmal online oeffnen.</p>',
    { headers: { 'Content-Type': 'text/html; charset=utf-8' }, status: 200 },
  );
}
