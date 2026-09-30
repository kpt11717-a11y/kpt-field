/* ارتباط با سرور (Apps Script) از بیرون گوگل + ثبت Service Worker برای کار بدون اینترنت */
(function () {
  var SKEY = ((window.KPT_CONFIG && window.KPT_CONFIG.storePrefix) || '') + 'kpt_field_session';
  window.KPT = {
    session: function () { try { return JSON.parse(localStorage.getItem(SKEY) || 'null'); } catch (e) { return null; } },
    saveSession: function (s) { try { s ? localStorage.setItem(SKEY, JSON.stringify(s)) : localStorage.removeItem(SKEY); } catch (e) {} },
    // درخواست به سرور؛ اگر اینترنت نباشد یا ۳۰ ثانیه جواب نیاید، خطا
    call: function (api, fn, args, token) {
      var ctrl = ('AbortController' in window) ? new AbortController() : null;
      var t = ctrl ? setTimeout(function () { ctrl.abort(); }, 30000) : null;
      return fetch(api, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ fn: fn, args: args || [], token: token }),
                          redirect: 'follow', signal: ctrl ? ctrl.signal : undefined })
        .then(function (r) { if (t) clearTimeout(t); return r.json(); })
        .then(function (j) {
          if (!j || !j.ok) {
            var m = (j && j.error) || 'خطای سرور';
            if (m === 'SESSION_INVALID') m = 'SESSION_INVALID — ورود شما منقضی شده؛ از صفحه‌ی خانه دوباره وارد شوید.';
            throw new Error(m);
          }
          return j.result;
        }, function (e) { if (t) clearTimeout(t); throw new Error('ارتباط با سرور برقرار نشد (اینترنت).'); });
    }
  };
  // همان شکل google.script.run تا کد فرم‌ها بدون تغییر کار کند
  // opts.token: تابعی که توکن ورود را می‌دهد (برای سرور ارسال)
  // opts.cache: فهرست توابعی که جوابشان روی گوشی نگه داشته می‌شود تا بدون اینترنت هم جواب بدهند (مثل getReference)
  function runner(api, h, opts) {
    return new Proxy({}, { get: function (_, name) {
      if (name === 'withSuccessHandler') return function (f) { return runner(api, { s: f, f: h.f }, opts); };
      if (name === 'withFailureHandler') return function (f) { return runner(api, { s: h.s, f: f }, opts); };
      return function () {
        var args = [].slice.call(arguments);
        var cacheKey = (opts.cache || []).indexOf(name) !== -1 ? 'kpt_cache_' + name + '_' + JSON.stringify(args) : null;
        KPT.call(api, name, args, opts.token ? opts.token() : undefined).then(function (r) {
          if (cacheKey) { try { localStorage.setItem(cacheKey, JSON.stringify(r)); } catch (e) {} }
          h.s && h.s(r);
        }, function (e) {
          if (cacheKey) {
            var c = null; try { c = localStorage.getItem(cacheKey); } catch (x) {}
            if (c !== null) { h.s && h.s(JSON.parse(c)); return; }
          }
          h.f && h.f(e);
        });
      };
    } });
  }
  window.KPT.runner = function (api, opts) { return runner(api, {}, opts || {}); };
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () { navigator.serviceWorker.register('sw.js').catch(function () {}); });
  }
})();
