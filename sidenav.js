/* YOMAK — سايد بار خاص بكل قسم من أقسام الشريط العلوي (يشتغل مباشرة بعد <aside> قبل باقي السكريبتات) */
(() => {
    const page = document.body.dataset.page, nav = document.getElementById('nav');
    if (!nav)
        return;
    const G = (label, items) => ({ label, items });
    const COMMON = G('عام', [{ t: 'الرئيسية', i: 'dashboard', href: 'dashboard.html' }, { t: 'الإعدادات', i: 'settings', href: 'settings.html' }]);
    const SECTIONS = [
        { title: 'العادات', sub: 'سلاسل وعادات يومية', pages: ['habits'], groups: [
                G('العادات', [{ t: 'نظرة عامة', i: 'dashboard', go: '#hbStats' }, { t: 'تقدّم اليوم', i: 'today', go: '#hbHero' }, { t: 'كل عاداتي', i: 'all', go: '#hbList' }]),
                G('إجراءات', [{ t: 'عادة جديدة', i: 'plus', act: 'hbNew' }])
            ] },
        { title: 'إسلاميات', sub: 'صلاة، أذكار، وورد القرآن', pages: ['prayer', 'adhkar', 'quran'], groups: [
                G('إسلاميات', [{ t: 'مواعيد الصلاة', i: 'today', p: 'prayer', href: 'prayer.html' }, { t: 'الأذكار', i: 'completed', p: 'adhkar', href: 'adhkar.html' }, { t: 'ورد القرآن', i: 'all', p: 'quran', href: 'quran.html' }, { t: 'السبحة', i: 'plus', p: 'tasbih', href: 'tasbih.html' }, { t: 'الصيام', i: 'upcoming', p: 'sawm', href: 'sawm.html' }, { t: 'ملخص الأسبوع', i: 'stats', p: 'islweek', href: 'isl-week.html' }])
            ] },
        { title: 'الملاحظات', sub: 'أفكارك في مكان واحد', pages: ['notes'], groups: [
                G('الملاحظات', [{ t: 'ملاحظة سريعة', i: 'plus', go: '#ntQuick' }, { t: 'التصنيفات', i: 'board', go: '#ntCats' }, { t: 'كل الملاحظات', i: 'all', go: '#ntBody' }]),
                G('إجراءات', [{ t: 'ملاحظة جديدة', i: 'plus', act: 'ntNew' }])
            ] },
        { title: 'الأهداف', sub: 'أهداف شهرية وسنوية', pages: ['goals'], groups: [
                G('الأهداف', [{ t: 'تصفية الأهداف', i: 'board', go: '#glFilter' }, { t: 'قائمة الأهداف', i: 'all', go: '#glList' }]),
                G('إجراءات', [{ t: 'هدف جديد', i: 'plus', act: 'glNew' }])
            ] },
        { title: 'المصروفات', sub: 'دخل ومصروفات وميزانية', pages: ['expenses'], groups: [
                G('نظرة عامة', [{ t: 'ملخص الشهر', i: 'dashboard', go: '.ex-stats' }, { t: 'توزيع المصروفات', i: 'stats', go: '#exDonut' }, { t: 'الصرف اليومي', i: 'heatmap', go: '#exBars' }, { t: 'المعاملات', i: 'all', go: '#exList' }]),
                G('إجراءات', [{ t: 'معاملة جديدة', i: 'plus', act: 'exNew' }, { t: 'الميزانية', i: 'rewards', act: 'exBudget' }, { t: 'تصدير (PDF / Excel / CSV)', i: 'completed', act: 'exExport' }])
            ] },
        { title: 'ألعاب', sub: 'العب مع أصحابك', pages: ['games'], groups: [
                G('ألعاب', [{ t: 'ملفي', i: 'dashboard', go: '#gmProfile' }, { t: 'الألعاب', i: 'all', go: '#gmGames' }, { t: 'الغرف', i: 'upcoming', go: '#gmRooms' }, { t: 'الأصدقاء', i: 'today', go: '#gmFriends' }])
            ] },
        { title: 'غرفة لعب', sub: 'العب وادردش مع صحابك', pages: ['room'], groups: [
                G('الغرفة', [{ t: 'اللاعبين', i: 'today', go: '#rmPlayersBox' }, { t: 'الشات', i: 'all', go: '#rmChat' }]),
                G('تنقّل', [{ t: 'رجوع للألعاب', i: 'late', href: 'games.html' }])
            ] },
        { title: 'التقويم', sub: 'مواعيدك على مدار الشهر', pages: ['calendar'], groups: [
                G('التقويم', [{ t: 'الشهر', i: 'upcoming', go: '#calGrid' }, { t: 'تفاصيل اليوم', i: 'today', go: '#calDetail' }]),
                G('تنقّل', [{ t: 'اليوم', i: 'today', act: 'calNow' }, { t: 'الشهر السابق', i: 'late', act: 'calPrev' }, { t: 'الشهر التالي', i: 'upcoming', act: 'calNext' }])
            ] }
    ];
    const S = SECTIONS.find(s => s.pages.includes(page));
    if (!S)
        return; // أقسام To Do List تفضل بالسايد بار الأصلي
    const sub = document.querySelector('aside>.muted');
    if (sub)
        sub.textContent = S.sub;
    nav.replaceChildren();
    let first = true;
    for (const g of [...S.groups, COMMON]) {
        const l = document.createElement('span');
        l.className = 'nav-label';
        l.textContent = g.label;
        nav.append(l);
        for (const it of g.items) {
            const a = document.createElement('a');
            a.textContent = it.t;
            a.style.setProperty('--ico', `var(--i-${it.i})`);
            if (it.p)
                a.dataset.page = it.p;
            if (it.href)
                a.href = it.href;
            else {
                a.href = '#';
                a.setAttribute('role', 'button');
            }
            if (it.go) {
                a.dataset.go = it.go;
            }
            if (it.act) {
                a.dataset.act = it.act;
            }
            if (first && !it.p && !it.href) {
                a.classList.add('active');
                first = false;
            }
            nav.append(a);
        }
    }
    nav.addEventListener('click', e => {
        const a = e.target.closest('a[data-go],a[data-act]');
        if (!a)
            return;
        e.preventDefault();
        if (a.dataset.act) {
            document.getElementById(a.dataset.act)?.click();
            return;
        }
        const t = document.querySelector(a.dataset.go);
        if (!t)
            return;
        nav.querySelectorAll('a.active').forEach(x => x.classList.remove('active'));
        a.classList.add('active');
        t.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion:reduce)').matches ? 'auto' : 'smooth', block: 'start' });
    });
})();

