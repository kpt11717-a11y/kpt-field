/* Service Worker — فایل‌های برنامه را روی گوشی نگه می‌دارد تا بدون اینترنت هم باز شود.
   با هر نسخه‌ی جدید، عدد VERSION را یکی بالا ببرید. */
var PREFIX = 'kpt-field-';          // نسخه‌ی آزمایشی: 'kpt-field-test-'
var VERSION = PREFIX + 'v8';
var FILES = ['./', 'index.html', 'rcv.html', 'snd.html', 'config.js', 'api.js', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'icon-maskable.png', 'logo.png', 'app-logo.png'];

self.addEventListener('install', function (e) {
  // cache:'reload' یعنی نسخه‌ی تازه از سایت، نه از حافظه‌ی مرورگر
  e.waitUntil(caches.open(VERSION).then(function (c) { return c.addAll(FILES.map(function (f) { return new Request(f, { cache: 'reload' }); })); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    // فقط نسخه‌های قدیمی همین برنامه پاک شوند (برنامه‌ی آزمایشی و اصلی کش هم را پاک نکنند)
    return Promise.all(keys.filter(function (k) { return k !== VERSION && k.indexOf(PREFIX) === 0 && (PREFIX !== 'kpt-field-' || k.indexOf('kpt-field-test-') !== 0); }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
// فقط فایل‌های خود برنامه: اول از حافظه‌ی گوشی، و اگر اینترنت بود بی‌صدا نسخه‌ی تازه گرفته می‌شود
self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  var isConfig = /\/config\.js$/.test(new URL(req.url).pathname);
  e.respondWith(caches.open(VERSION).then(function (cache) {
    return cache.match(req, { ignoreSearch: true }).then(function (hit) {
      var net = fetch(req, { cache: 'no-cache' }).then(function (res) {
        if (res && res.ok) cache.put(req, res.clone());
        return res;
      }).catch(function () { return hit; });
      // تنظیمات (آدرس سرورها) اول از اینترنت خوانده می‌شود؛ اگر نبود، از حافظه‌ی گوشی
      // (حداکثر ۳ ثانیه صبر؛ در اینترنت ضعیف باز شدن برنامه کند نشود)
      if (hit && isConfig) return Promise.race([
        net.then(function (r) { return (r && r.ok) ? r : hit; }, function () { return hit; }),
        new Promise(function (ok) { setTimeout(function () { ok(hit); }, 3000); })
      ]);
      if (hit) { e.waitUntil(net.catch(function () {})); return hit; }
      return net.then(function (r) { return r || caches.match('index.html'); });
    });
  }));
});
