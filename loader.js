// YOMAK splash loader: يظهر بعد صفحة الـ Intro وبعد تسجيل الدخول، ويختفي لما الصفحة تجهز
(function () {
    var KEY = 'yomak_splash', MIN = 250, MAX = 8000, shownAt = 0, el = null;
    function build() {
        el = document.createElement('div');
        el.id = 'splash';
        el.setAttribute('role', 'status');
        el.setAttribute('aria-live', 'polite');
        el.innerHTML = '<div class="splash-box"><div class="splash-logo"><i class="splash-ring"></i><img src="assets/logo.png" alt=""></div><strong>YOMAK</strong><span>جاري تجهيز يومك...</span><div class="splash-dots"><b></b><b></b><b></b></div></div>';
        document.documentElement.appendChild(el);
        shownAt = Date.now();
        document.documentElement.classList.add('splash-on');
    }
    function hide() {
        if (!el)
            return;
        var wait = Math.max(0, MIN - (Date.now() - shownAt)), n = el;
        el = null;
        setTimeout(function () { n.classList.add('out'); document.documentElement.classList.remove('splash-on'); setTimeout(function () { n.remove(); }, 450); }, wait);
    }
    window.YomakLoader = {
        // اعرض الشاشة الآن ثم انتقل لصفحة تانية
        go: function (url) { try {
            sessionStorage.setItem(KEY, '1');
        }
        catch (e) { } if (!el)
            build(); setTimeout(function () { location.href = url; }, MIN); },
        // اطلب إظهارها في الصفحة اللي بعدها (مثلًا بعد تسجيل الدخول)
        arm: function () { try {
            sessionStorage.setItem(KEY, '1');
        }
        catch (e) { } },
        hide: hide
    };
    var armed = false;
    try {
        armed = sessionStorage.getItem(KEY) === '1';
        sessionStorage.removeItem(KEY);
    }
    catch (e) { }
    if (armed && !/(^|\/)(index\.html)?$/.test(location.pathname)) {
        build();
        setTimeout(hide, MAX);
        window.addEventListener('pageshow', function (e) { if (e.persisted)
            hide(); });
    }
    // في صفحة الـ Intro: اعترض الروابط اللي بتفتح تسجيل الدخول/إنشاء حساب
    if (/(^|\/)(index\.html)?$/.test(location.pathname)) {
        document.addEventListener('click', function (e) {
            var a = e.target.closest && e.target.closest('a[href]');
            if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || a.target === '_blank')
                return;
            var h = a.getAttribute('href');
            if (!/^(login|register|dashboard)\.html/.test(h))
                return;
            e.preventDefault();
            window.YomakLoader.go(h);
        });
        window.addEventListener('pageshow', function (e) { if (e.persisted) {
            var s = document.getElementById('splash');
            if (s)
                s.remove();
            document.documentElement.classList.remove('splash-on');
            el = null;
        } });
    }
})();

