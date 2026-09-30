/* Service Worker — فایل‌های برنامه را روی گوشی نگه می‌دارد تا بدون اینترنت هم باز شود.
   با هر نسخه‌ی جدید، عدد VERSION را یکی بالا ببرید. */
var VERSION = 'kpt-field-v3';
var FILES = ['./', 'index.html', 'rcv.html', 'config.js', 'api.js', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'logo.png', 'app-logo.png'];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(VERSION).then(function (c) { return c.addAll(FILES); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== VERSION; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
// فقط فایل‌های خود برنامه: اول از حافظه‌ی گوشی، و اگر اینترنت بود بی‌صدا نسخه‌ی تازه گرفته می‌شود
self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith(caches.open(VERSION).then(function (cache) {
    return cache.match(req, { ignoreSearch: true }).then(function (hit) {
      var net = fetch(req).then(function (res) {
        if (res && res.ok) cache.put(req, res.clone());
        return res;
      }).catch(function () { return hit; });
      if (hit) { e.waitUntil(net.catch(function () {})); return hit; }
      return net.then(function (r) { return r || caches.match('index.html'); });
    });
  }));
});
