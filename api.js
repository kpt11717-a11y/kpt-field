/* ارتباط با سرور (Apps Script) از بیرون گوگل + ثبت Service Worker برای کار بدون اینترنت */
(function () {
  var SKEY = 'kpt_field_session';
  window.KPT = {
    session: function () { try { return JSON.parse(localStorage.getItem(SKEY) || 'null'); } catch (e) { return null; } },
    saveSession: function (s) { try { s ? localStorage.setItem(SKEY, JSON.stringify(s)) : localStorage.removeItem(SKEY); } catch (e) {} },
    // درخواست به سرور؛ اگر اینترنت نباشد یا ۳۰ ثانیه جواب نیاید، خطا
    call: function (api, fn, args) {
      var ctrl = ('AbortController' in window) ? new AbortController() : null;
      var t = ctrl ? setTimeout(function () { ctrl.abort(); }, 30000) : null;
      return fetch(api, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ fn: fn, args: args || [] }),
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
  function runner(api, h) {
    return new Proxy({}, { get: function (_, name) {
      if (name === 'withSuccessHandler') return function (f) { return runner(api, { s: f, f: h.f }); };
      if (name === 'withFailureHandler') return function (f) { return runner(api, { s: h.s, f: f }); };
      return function () {
        var args = [].slice.call(arguments);
        KPT.call(api, name, args).then(function (r) { h.s && h.s(r); }, function (e) { h.f && h.f(e); });
      };
    } });
  }
  window.KPT.runner = function (api) { return runner(api, {}); };
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () { navigator.serviceWorker.register('sw.js').catch(function () {}); });
  }
})();
