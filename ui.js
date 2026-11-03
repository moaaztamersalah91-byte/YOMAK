// YOMAK UI helpers: Toast notifications + Loading states
const ICONS = {
    success: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="m8.5 12.5 2.5 2.5 4.5-5"/></svg>',
    error: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 8v5M12 16.5h.01"/></svg>',
    info: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 11v5M12 7.5h.01"/></svg>'
};
const MAX_TOASTS = 3;
let box = null;
function getBox() {
    if (box && box.isConnected)
        return box;
    box = document.createElement('div');
    box.id = 'toasts';
    box.setAttribute('aria-live', 'polite');
    box.setAttribute('aria-atomic', 'false');
    document.body.append(box);
    return box;
}
function dismiss(el) {
    if (!el || el.dataset.closing)
        return;
    el.dataset.closing = '1';
    el.classList.add('out');
    const done = () => el.remove();
    el.addEventListener('animationend', done, { once: true });
    setTimeout(done, 400);
}
/** toast('تم الحفظ','success') — types: success | error | info */
export function toast(message, type = 'info', duration) {
    if (!message)
        return;
    const wrap = getBox();
    while (wrap.children.length >= MAX_TOASTS)
        dismiss(wrap.firstElementChild) || wrap.firstElementChild.remove();
    const el = document.createElement('div');
    el.className = 'toast-item ' + type;
    el.setAttribute('role', type === 'error' ? 'alert' : 'status');
    const ic = document.createElement('span');
    ic.className = 'toast-ic';
    ic.innerHTML = ICONS[type] || ICONS.info;
    const tx = document.createElement('span');
    tx.className = 'toast-msg';
    tx.textContent = message;
    const x = document.createElement('button');
    x.type = 'button';
    x.className = 'toast-x';
    x.setAttribute('aria-label', 'إغلاق');
    x.textContent = '✕';
    x.onclick = () => dismiss(el);
    const ms = duration || (type === 'error' ? 5000 : 3200);
    const bar = document.createElement('i');
    bar.className = 'toast-bar';
    bar.style.animationDuration = ms + 'ms';
    el.append(ic, tx, x, bar);
    wrap.append(el);
    let t = setTimeout(() => dismiss(el), ms);
    el.onmouseenter = () => { clearTimeout(t); el.classList.add('paused'); };
    el.onmouseleave = () => { el.classList.remove('paused'); t = setTimeout(() => dismiss(el), 1500); };
}
/** Button loading state: spinner + disabled */
export function setLoading(btn, on, text) {
    if (!btn)
        return;
    if (on) {
        if (btn.dataset.label === undefined)
            btn.dataset.label = btn.textContent;
        btn.classList.add('is-loading');
        btn.disabled = true;
        btn.setAttribute('aria-busy', 'true');
        if (text && !btn.querySelector('svg'))
            btn.textContent = text;
    }
    else {
        btn.classList.remove('is-loading');
        btn.disabled = false;
        btn.removeAttribute('aria-busy');
        if (btn.dataset.label !== undefined && !btn.querySelector('svg')) {
            btn.textContent = btn.dataset.label;
        }
        delete btn.dataset.label;
    }
}
/** Skeleton placeholders for the task list */
export function showSkeleton(container, count = 4) {
    container.replaceChildren();
    container.setAttribute('aria-busy', 'true');
    for (let i = 0; i < count; i++) {
        const s = document.createElement('div');
        s.className = 'task skeleton';
        s.setAttribute('aria-hidden', 'true');
        s.innerHTML = '<span class="sk sk-cb"></span><div class="sk-body"><span class="sk sk-line w60"></span><span class="sk sk-line w85"></span><span class="sk-chips"><span class="sk sk-chip"></span><span class="sk sk-chip"></span></span></div>';
        container.append(s);
    }
}
export function hideSkeleton(container) { container.removeAttribute('aria-busy'); }
/* ================= Empty states ================= */
const NS = 'http://www.w3.org/2000/svg';
const ART = {
    tasks: '<rect x="30" y="26" width="100" height="92" rx="14" class="a-card"/><rect x="44" y="44" width="72" height="9" rx="4.5" class="a-line"/><rect x="44" y="62" width="52" height="9" rx="4.5" class="a-line"/><rect x="44" y="80" width="62" height="9" rx="4.5" class="a-line"/><circle cx="118" cy="104" r="20" class="a-accent"/><path d="M109 104l6 6 11-12" class="a-check"/>',
    today: '<circle cx="80" cy="70" r="26" class="a-accent"/><g class="a-rays"><path d="M80 24v12M80 104v12M34 70h12M114 70h12M47 37l8 8M105 95l8 8M113 37l-8 8M55 95l-8 8"/></g><path d="M68 71l8 8 16-17" class="a-check"/>',
    upcoming: '<rect x="32" y="34" width="96" height="84" rx="14" class="a-card"/><path d="M32 60h96" class="a-stroke"/><path d="M58 24v18M102 24v18" class="a-stroke thick"/><circle cx="62" cy="84" r="6" class="a-line-fill"/><circle cx="82" cy="84" r="6" class="a-line-fill"/><circle cx="102" cy="84" r="6" class="a-accent-fill"/><circle cx="62" cy="102" r="6" class="a-line-fill"/><circle cx="82" cy="102" r="6" class="a-line-fill"/>',
    completed: '<circle cx="80" cy="72" r="42" class="a-card"/><circle cx="80" cy="72" r="30" class="a-line-ring"/><path d="M64 72l11 11 21-23" class="a-check dim"/><circle cx="130" cy="34" r="5" class="a-accent-fill"/><circle cx="30" cy="110" r="4" class="a-line-fill"/>',
    late: '<circle cx="80" cy="72" r="42" class="a-card"/><path d="M80 46v28l18 11" class="a-stroke thick"/><circle cx="80" cy="72" r="4" class="a-accent-fill"/><path d="M52 30l-10-8M108 30l10-8" class="a-stroke thick"/>',
    search: '<circle cx="72" cy="64" r="32" class="a-card"/><path d="M96 88l26 26" class="a-stroke thick"/><path d="M60 64h24" class="a-stroke thick dim"/>',
    error: '<circle cx="80" cy="72" r="42" class="a-card"/><path d="M80 48v28M80 92h.01" class="a-stroke thick err"/>'
};
const EMPTY = {
    today: ['ماعندكش مهام النهاردة', 'يومك فاضي لحد دلوقتي. ضيف أول مهمة وابدأ بخطوة صغيرة.', 'tasks', '+ إضافة مهمة'],
    all: ['لسه ماضفتش أي مهمة', 'ابدأ بكتابة أول مهمة، وهنرتّبلك الباقي.', 'tasks', '+ مهمة جديدة'],
    upcoming: ['مفيش مهام قادمة', 'مفيش حاجة مجدولة بعد النهاردة. خطّط لأيامك الجاية من هنا.', 'upcoming', '+ جدولة مهمة'],
    completed: ['لسه ماخلّصتش مهام', 'أول ما تنجز مهمة هتظهر هنا، عشان تشوف رحلة إنجازك.', 'completed', null],
    late: ['ماشي زي الفل 🎉', 'مفيش أي مهمة متأخرة. كمّل على نفس الوتيرة!', 'late', null],
    search: ['مفيش نتائج مطابقة', 'جرّب كلمة تانية أو شيل الفلاتر عشان تشوف كل المهام.', 'search', 'مسح البحث والفلاتر'],
    planner: ['مفيش مهام لليوم ده', 'ضيف مهمة وحطها على الجدول، وهنرتّبلك يومك.', 'upcoming', '+ إضافة للخطة'],
    error: ['حصلت مشكلة في تحميل المهام', 'اتأكد من اتصالك بالإنترنت وجرّب تاني.', 'error', 'إعادة المحاولة']
};
/** emptyState(container,'today'|'all'|...|'search'|'error',onAction) */
export function emptyState(container, kind, onAction) {
    const [title, text, art, cta] = EMPTY[kind] || EMPTY.all;
    const d = document.createElement('div');
    d.className = 'empty-state ' + kind;
    d.innerHTML = '<svg class="empty-art" viewBox="0 0 160 140" aria-hidden="true">' + ART[art] + '</svg>';
    const h = document.createElement('h3');
    h.textContent = title;
    const p = document.createElement('p');
    p.textContent = text;
    d.append(h, p);
    if (cta && onAction) {
        const b = document.createElement('button');
        b.type = 'button';
        b.textContent = cta;
        b.onclick = onAction;
        d.append(b);
    }
    container.append(d);
}
/* ================= Micro-interactions ================= */
const reduce = () => matchMedia('(prefers-reduced-motion:reduce)').matches;
/** عدّاد رقمي متحرك. الحالة الأولى بتتحرك من 0 */
export function setNum(el, to, suffix = '') {
    if (!el)
        return;
    const from = parseInt(el.dataset.n ?? '0', 10) || 0;
    if (el.dataset.n === String(to)) {
        return;
    }
    el.dataset.n = String(to);
    if (reduce() || from === to) {
        el.textContent = to + suffix;
        return;
    }
    const t0 = performance.now(), dur = 550;
    const step = t => { const k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3); el.textContent = Math.round(from + (to - from) * e) + suffix; if (k < 1)
        requestAnimationFrame(step); };
    requestAnimationFrame(step);
    if (el.dataset.bumped !== undefined || from !== 0) {
        el.classList.remove('bump');
        void el.offsetWidth;
        el.classList.add('bump');
    }
    el.dataset.bumped = '1';
}
/** مفرقعات صغيرة عند إنجاز مهمة */
export function burst(x, y, big = false) {
    if (reduce())
        return;
    const colors = ['#04796c', '#2fb597', '#f28b3c', '#6ba3d8', '#e3f1ec'], n = big ? 34 : 14;
    for (let i = 0; i < n; i++) {
        const p = document.createElement('i');
        p.className = 'confetti';
        const a = Math.random() * Math.PI * 2, d = (big ? 90 : 46) + Math.random() * (big ? 150 : 44);
        p.style.cssText = `left:${x}px;top:${y}px;background:${colors[i % colors.length]};--dx:${Math.cos(a) * d}px;--dy:${Math.sin(a) * d - (big ? 40 : 10)}px;--r:${Math.random() * 540 - 270}deg;width:${5 + Math.random() * 5}px;height:${5 + Math.random() * 5}px;border-radius:${Math.random() > .5 ? '50%' : '2px'}`;
        document.body.append(p);
        setTimeout(() => p.remove(), 950);
    }
}
/** Ripple على الأزرار + اهتزاز للنماذج */
export function shake(el) { if (!el || reduce())
    return; el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake'); }
document.addEventListener('pointerdown', e => {
    const b = e.target.closest && e.target.closest('button:not(.dd-btn):not(.toast-x):not(.icon-btn):not(.link)');
    if (!b || b.disabled || reduce())
        return;
    b.classList.add('has-ripple');
    const r = b.getBoundingClientRect(), s = Math.max(r.width, r.height) * 2, w = document.createElement('span');
    w.className = 'ripple';
    w.style.cssText = `width:${s}px;height:${s}px;left:${e.clientX - r.left - s / 2}px;top:${e.clientY - r.top - s / 2}px`;
    b.append(w);
    setTimeout(() => w.remove(), 600);
});

