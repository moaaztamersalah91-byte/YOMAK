// الناف بار العلوي للتطبيق: أقسام (To Do List، التقويم، ...) + تاريخ اليوم ميلادي وهجري
import { numG, numH, txtG, txtH } from './dates.js';
// لإضافة قسم جديد لاحقًا: أضف عنصرًا هنا (pages = قيم data-page التابعة للقسم)
const SECTIONS = [
    { key: 'tasks', label: 'المهام', href: 'today.html', pages: ['dashboard', 'today', 'all', 'upcoming', 'completed', 'late', 'stats', 'settings', 'planner', 'focus', 'rewards', 'heatmap', 'board', 'wrapup', 'story'] },
    { key: 'habits', label: 'العادات', href: 'habits.html', pages: ['habits'] },
    { key: 'islamic', label: 'إسلاميات', href: 'prayer.html', pages: ['prayer', 'adhkar', 'quran', 'tasbih', 'sawm', 'isl-week'] },
    { key: 'notes', label: 'الملاحظات', href: 'notes.html', pages: ['notes'] },
    { key: 'goals', label: 'الأهداف', href: 'goals.html', pages: ['goals'] },
    { key: 'expenses', label: 'المصروفات', href: 'expenses.html', pages: ['expenses'] },
    { key: 'games', label: 'ألعاب', href: 'games.html', pages: ['games', 'room'] },
    { key: 'calendar', label: 'التقويم', href: 'calendar.html', pages: ['calendar'] }
];
const page = document.body.dataset.page, now = new Date();
const bar = document.createElement('div');
bar.id = 'apptop';
const nav = document.createElement('nav');
nav.setAttribute('aria-label', 'أقسام YOMAK');
const prefs = (() => { try {
    return JSON.parse(localStorage.getItem('yomakMobileInterests') || 'null');
}
catch {
    return null;
} })();
for (const s of SECTIONS) {
    const a = document.createElement('a');
    a.href = s.href;
    a.textContent = s.label;
    a.dataset.section = s.key;
    if (s.pages.includes(page)) {
        a.className = 'on';
        a.setAttribute('aria-current', 'true');
    }
    if (prefs && !prefs.includes(s.key))
        a.classList.add('interest-hidden');
    if (['notes', 'goals', 'expenses', 'games', 'calendar'].includes(s.key))
        a.classList.add('mobile-more-item');
    nav.append(a);
}
const more = document.createElement('a');
more.href = 'more.html';
more.className = 'tb-more';
more.textContent = 'المزيد';
more.dataset.section = 'more';
if (page === 'more')
    more.classList.add('on');
nav.append(more);
const d = document.createElement('a');
d.className = 'tb-date';
d.href = 'calendar.html';
d.title = `${txtG(now)}\\n${txtH(now)}`;
d.innerHTML = '<b></b><span></span><em>اليوم</em>';
d.querySelector('b').textContent = numG(now) + ' م';
d.querySelector('span').textContent = numH(now) + ' هـ';
bar.append(nav, d);
nav.querySelector('a.on')?.scrollIntoView({ inline: 'center', block: 'nearest' });
document.getElementById('app').before(bar);
// Onboarding mobile من 3 خطوات، يُعرض مرة واحدة على هذا الجهاز.
(function mobileOnboarding() {
    if (!matchMedia('(max-width:760px)').matches || localStorage.getItem('yomakMobileOnboardingDone'))
        return;
    let step = 1, selected = new Set(['tasks', 'habits']);
    const overlay = document.createElement('div');
    overlay.className = 'ym-onboard';
    const render = () => {
        overlay.innerHTML = '';
        const card = document.createElement('section');
        card.className = 'ym-onboard-card';
        const dots = document.createElement('div');
        dots.className = 'ym-steps';
        dots.innerHTML = `<i class="${step >= 1 ? 'active' : ''}"></i><i class="${step >= 2 ? 'active' : ''}"></i><i class="${step >= 3 ? 'active' : ''}"></i>`;
        card.append(dots);
        if (step === 1) {
            card.insertAdjacentHTML('beforeend', '<div class="ym-welcome-icon">☀️</div><p class="eyebrow">أهلًا بيك في YOMAK</p><h2>خلّي يومك على مقاسك</h2><p>هنظبطلك تجربة الموبايل حسب الحاجات اللي تهمك، وتقدر تغيّر اختيارك في أي وقت.</p>');
        }
        else if (step === 2) {
            card.insertAdjacentHTML('beforeend', '<p class="eyebrow">الخطوة الثانية</p><h2>إيه اللي يهمك؟</h2><p>اختار الأقسام اللي تحب تظهرلك من البداية.</p><div class="ym-interest-grid"></div>');
            const grid = card.querySelector('.ym-interest-grid');
            [['tasks', '✅', 'المهام'], ['habits', '🌱', 'العادات'], ['islamic', '🕌', 'إسلاميات'], ['games', '🎮', 'ألعاب']].forEach(([key, icon, label]) => {
                const b = document.createElement('button');
                b.type = 'button';
                b.className = 'ym-interest' + (selected.has(key) ? ' selected' : '');
                b.innerHTML = `<span>${icon}</span><b>${label}</b><small>${selected.has(key) ? 'محدد' : 'اضغط للاختيار'}</small>`;
                b.onclick = () => { selected.has(key) ? selected.delete(key) : selected.add(key); render(); };
                grid.append(b);
            });
        }
        else {
            card.insertAdjacentHTML('beforeend', `<div class="ym-welcome-icon">✨</div><p class="eyebrow">الخطوة الثالثة</p><h2>جاهز تبدأ؟</h2><p>الأقسام المختارة هتظهر في شريط الموبايل. باقي الأدوات هتلاقيها مرتبة داخل «المزيد».</p><div class="ym-summary">${[...selected].map(k => ({ 'tasks': 'المهام', 'habits': 'العادات', 'islamic': 'إسلاميات', 'games': 'الألعاب' }[k])).join(' • ') || 'تقدر تبدأ بأي قسم لاحقًا'}</div>`);
        }
        const actions = document.createElement('div');
        actions.className = 'ym-onboard-actions';
        if (step > 1) {
            const back = document.createElement('button');
            back.className = 'ym-back';
            back.textContent = 'رجوع';
            back.onclick = () => { step--; render(); };
            actions.append(back);
        }
        const next = document.createElement('button');
        next.className = 'ym-next';
        next.textContent = step === 3 ? 'ابدأ يومك' : 'التالي';
        next.onclick = () => {
            if (step < 3) {
                step++;
                render();
                return;
            }
            const choices = [...selected];
            localStorage.setItem('yomakMobileInterests', JSON.stringify(choices));
            localStorage.setItem('yomakMobileOnboardingDone', '1');
            overlay.remove();
            document.querySelectorAll('#apptop [data-section]').forEach(a => { if (a.dataset.section !== 'more')
                a.classList.toggle('interest-hidden', !choices.includes(a.dataset.section)); });
        };
        actions.append(next);
        card.append(actions);
        overlay.append(card);
    };
    render();
    document.body.append(overlay);
})();
// محرك التذكيرات (يعمل في كل صفحات اللوحة)
import('./reminders.js').catch(() => { });
import('./notify.js').then(m => setTimeout(m.promptBar, 2500)).catch(() => { });
// ===== موبايل: قائمة الـ 3 شرطات (Hamburger) فيها صفحات الموقع + صفحات الأقسام =====
(() => {
    const side = document.querySelector('#app aside'), src = document.getElementById('nav');
    if (!side || document.getElementById('ymBurger'))
        return;
    const btn = document.createElement('button');
    btn.id = 'ymBurger';
    btn.type = 'button';
    btn.setAttribute('aria-label', 'القائمة');
    btn.setAttribute('aria-expanded', 'false');
    btn.innerHTML = '<i></i><i></i><i></i>';
    side.insertBefore(btn, side.querySelector('.aside-bottom'));
    const bd = document.createElement('div');
    bd.id = 'ymBackdrop';
    const dr = document.createElement('div');
    dr.id = 'ymDrawer';
    dr.setAttribute('role', 'dialog');
    dr.setAttribute('aria-label', 'القائمة');
    const head = document.createElement('div');
    head.className = 'ymd-head';
    head.innerHTML = '<b>القائمة</b><button type="button" aria-label="إغلاق">✕</button>';
    dr.append(head);
    const nav = document.createElement('nav');
    const lab = t => { const s = document.createElement('span'); s.className = 'ymd-label'; s.textContent = t; nav.append(s); };
    const link = (h, t, on) => { const a = document.createElement('a'); a.href = h; a.textContent = t; if (on)
        a.className = 'on'; nav.append(a); };
    lab('صفحات الموقع');
    [['index.html', 'الصفحة الرئيسية'], ['features.html', 'المميزات'], ['dashboard-intro.html', 'لوحة التحكم'], ['about.html', 'عن YOMAK'], ['privacy.html', 'سياسة الخصوصية'], ['terms.html', 'الشروط والأحكام']].forEach(([h, t]) => link(h, t));
    if (src)
        src.querySelectorAll(':scope > span.nav-label, :scope > a').forEach(e => {
            if (e.tagName === 'SPAN')
                return lab(e.textContent);
            link(e.getAttribute('href'), e.childNodes[0]?.textContent || e.textContent, e.classList.contains('active'));
        });
    dr.append(nav);
    document.body.append(bd, dr);
    const set = o => { document.body.classList.toggle('ym-drawer-open', o); btn.setAttribute('aria-expanded', o); };
    btn.onclick = () => set(!document.body.classList.contains('ym-drawer-open'));
    bd.onclick = head.querySelector('button').onclick = () => set(false);
    addEventListener('keydown', e => { if (e.key === 'Escape')
        set(false); });
})();

