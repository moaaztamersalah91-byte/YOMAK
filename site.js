(function () {
    var nav = document.querySelector('.site-nav');
    if (!nav)
        return;
    function stuck() { nav.classList.toggle('stuck', scrollY > 8); }
    stuck();
    addEventListener('scroll', stuck, { passive: true });
    // ===== قائمة الـ 3 شرطات (Drawer جانبي) — نفس شكل قائمة التطبيق =====
    var inner = nav.querySelector('.site-nav-in'), b = document.getElementById('snBurger');
    if (!b) {
        b = document.createElement('button');
        b.id = 'snBurger';
        b.className = 'sn-burger';
        b.setAttribute('aria-label', 'القائمة');
        b.innerHTML = '<i></i><i></i><i></i>';
        var cta = inner.querySelector('.sn-actions');
        inner.insertBefore(b, cta || null);
    }
    b.setAttribute('aria-expanded', 'false');
    var here = location.pathname.split('/').pop() || 'index.html';
    var bd = document.createElement('div');
    bd.id = 'ymBackdrop';
    var dr = document.createElement('div');
    dr.id = 'ymDrawer';
    dr.setAttribute('role', 'dialog');
    dr.setAttribute('aria-label', 'القائمة');
    dr.innerHTML = '<div class="ymd-head"><b>القائمة</b><button type="button" aria-label="إغلاق">✕</button></div>';
    var n = document.createElement('nav');
    function lab(t) { var s = document.createElement('span'); s.className = 'ymd-label'; s.textContent = t; n.appendChild(s); }
    function link(h, t, cls) { var a = document.createElement('a'); a.href = h; a.textContent = t; if (h === here)
        a.className = 'on'; if (cls)
        a.className += ' ' + cls; n.appendChild(a); }
    lab('صفحات الموقع');
    [['index.html', 'الصفحة الرئيسية'], ['features.html', 'المميزات'], ['dashboard-intro.html', 'لوحة التحكم'], ['about.html', 'عن YOMAK'], ['privacy.html', 'سياسة الخصوصية'], ['terms.html', 'الشروط والأحكام']].forEach(function (x) { link(x[0], x[1]); });
    lab('حسابك');
    link('login.html', 'تسجيل الدخول');
    link('register.html', 'ابدأ مجانًا', 'ymd-cta');
    dr.appendChild(n);
    document.body.appendChild(bd);
    document.body.appendChild(dr);
    function set(o) { document.body.classList.toggle('ym-drawer-open', o); b.setAttribute('aria-expanded', o); }
    b.onclick = function (e) { e.preventDefault(); set(!document.body.classList.contains('ym-drawer-open')); };
    bd.onclick = dr.querySelector('button').onclick = function () { set(false); };
    addEventListener('keydown', function (e) { if (e.key === 'Escape')
        set(false); });
    dr.addEventListener('click', function (e) { if (e.target.closest('a'))
        set(false); });
})();

