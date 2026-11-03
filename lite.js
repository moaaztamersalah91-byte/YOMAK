/* وضع الأداء الخفيف: بيقلل الأنيميشن والظلال على الموبايلات الضعيفة (تلقائي / شغّال / مقفول) */
(function () {
  var KEY = 'yomak_perf', root = document.documentElement;
  function get() { try { return localStorage.getItem(KEY) || 'auto'; } catch (e) { return 'auto'; } }
  function weak() {
    try {
      var n = navigator, c = n.connection || {};
      return (n.deviceMemory && n.deviceMemory <= 4) || (n.hardwareConcurrency && n.hardwareConcurrency <= 4) ||
        c.saveData === true || (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
    } catch (e) { return false; }
  }
  var CSS = 'html.lite *,html.lite *::before,html.lite *::after{animation-duration:.001ms!important;animation-delay:0s!important;animation-iteration-count:1!important;transition-duration:.001ms!important;transition-delay:0s!important;scroll-behavior:auto!important;box-shadow:none!important;text-shadow:none!important;filter:none!important;-webkit-backdrop-filter:none!important;backdrop-filter:none!important}' +
    'html.lite .confetti,html.lite .empty-art,html.lite .a-rays{display:none!important}' +
    'html.lite .card,html.lite .panel{border:1px solid rgba(0,0,0,.08)}';
  function apply() {
    var m = get(), on = m === 'on' || (m === 'auto' && weak());
    root.classList.toggle('lite', !!on);
    var s = document.getElementById('lite-css');
    if (on && !s) { s = document.createElement('style'); s.id = 'lite-css'; s.textContent = CSS; (document.head || root).appendChild(s); }
    if (!on && s) s.remove();
  }
  apply();
  window.YomakPerf = { get: get, set: function (v) { try { localStorage.setItem(KEY, v); } catch (e) {} apply(); } };

  function ui() {
    var grid = document.querySelector('.ym-more-grid');
    if (!grid || document.getElementById('perfCard')) return;
    var box = document.createElement('section');
    box.id = 'perfCard';
    box.style.cssText = 'margin:16px 0;padding:16px;border-radius:16px;border:1px solid rgba(0,0,0,.1);background:var(--surface,#fff)';
    box.innerHTML = '<h3 style="margin:0 0 6px;font-size:1.05rem">⚡ وضع الأداء الخفيف</h3>' +
      '<p style="margin:0 0 12px;font-size:.88rem;opacity:.75">بيقلل الحركات والظلال عشان التطبيق يبقى أسلس على الموبايلات الضعيفة.</p>' +
      '<div id="perfOpts" style="display:flex;gap:8px;flex-wrap:wrap"></div>';
    grid.parentNode.insertBefore(box, grid.nextSibling);
    var opts = [['auto', 'تلقائي'], ['on', 'شغّال'], ['off', 'مقفول']], wrap = box.querySelector('#perfOpts');
    function paint() {
      wrap.innerHTML = '';
      opts.forEach(function (o) {
        var b = document.createElement('button');
        b.type = 'button'; b.textContent = o[1];
        var sel = get() === o[0];
        b.style.cssText = 'flex:1;min-width:80px;padding:10px 12px;border-radius:12px;border:1px solid ' + (sel ? '#04796C' : 'rgba(0,0,0,.15)') + ';background:' + (sel ? '#04796C' : 'transparent') + ';color:' + (sel ? '#fff' : 'inherit') + ';font:inherit;cursor:pointer';
        b.onclick = function () { window.YomakPerf.set(o[0]); paint(); };
        wrap.appendChild(b);
      });
    }
    paint();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ui); else ui();
})();
