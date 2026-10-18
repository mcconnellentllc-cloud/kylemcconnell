// Kyle's Hub service worker. Caches only the app shell (this page, its
// stylesheet and icons) so the app opens instantly and offline. It never
// caches or touches m77ag.com: all data, and the sign-in, always go live.
const CACHE = 'kyles-hub-v1';
const SHELL = ['/life/', '/styles.css', '/life/manifest.webmanifest', '/life/icons/icon-192.png', '/life/icons/apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== self.location.origin) return;
  // Network first so updates show right away; the cache is the offline fallback.
  e.respondWith(
    fetch(e.request).then(res => {
      if (res.ok && SHELL.includes(url.pathname)) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); }
      return res;
    }).catch(() => caches.match(e.request).then(r => r || caches.match('/life/')))
  );
});
