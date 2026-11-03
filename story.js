// يومك كقصة: ملخّص مصوّر بستايل Stories (قصة اليوم) + فيلم السنة — بيترسم على Canvas ويتحفظ/يتشارك كصورة
import { startShell, $, errMsg } from './shell.js';
import { db } from './firebase.js';
import { collection, query, where, documentId, onSnapshot } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js';
import { toast } from './ui.js';
import { today, addDays } from './logic.js';
import { effStreak } from './rewards.js';
import { watchDays, watchSettings } from './islamic.js';
const W = 1080, H = 1920, T = today(), Y = T.slice(0, 4), Y0 = Y + '-01-01', DUR = 5200;
const NF = new Intl.NumberFormat('en'), MON = new Intl.DateTimeFormat('ar-EG-u-nu-latn', { month: 'long' }), DLONG = new Intl.DateTimeFormat('ar-EG-u-nu-latn', { weekday: 'long', day: 'numeric', month: 'long' });
const dt = d => new Date(d + 'T12:00');
const MOODS = ['', '😞', '😐', '🙂', '😄', '🤩'];
const PAL = [['#063e37', '#04796c'], ['#0b3d5c', '#3f8fc9'], ['#4a2a6b', '#9a62c9'], ['#7a3b0c', '#e08a2e'], ['#0f4f3a', '#2eae7d'], ['#5b1f2e', '#c9506b']];
let user = null, tasks = [], stats = null, S = {}, focus = [], P = {}, Q = {}, wraps = {}, mode = location.hash === '#year' ? 'year' : 'day', slides = [], idx = 0, timer = null, paused = false, t0 = 0;
const cv = $('stCanvas'), ctx = cv.getContext('2d');
cv.width = W;
cv.height = H;
const doneDay = t => t.completed ? (t.doneDay || t.dueDate) : null;
const hm = m => m >= 60 ? `${Math.floor(m / 60)} س${m % 60 ? ` و${m % 60} د` : ''}` : `${m} د`;
/* ---------- تجميع البيانات لكل يوم ---------- */
function dayData(d) {
    const done = tasks.filter(t => doneDay(t) === d), fm = focus.filter(f => f.day === d).reduce((a, f) => a + (f.minutes || 0), 0);
    return { d, done, tasks: done.length, focus: fm, prayers: (P[d]?.done || []).length, pages: +Q[d]?.pages || 0, mood: wraps[d]?.mood || 0, note: wraps[d]?.note || '' };
}
const score = x => x.tasks * 3 + x.focus / 10 + x.prayers * 2 + x.pages * 1.5 + (x.mood >= 4 ? 2 : 0);
const goal = () => +S.goal || 5;
/* ---------- بناء السلايدات ---------- */
function buildDay() {
    const x = dayData(T), due = tasks.filter(t => t.dueDate === T), tot = due.length, dn = due.filter(t => t.completed).length;
    const pct = tot ? Math.round(dn / tot * 100) : (x.tasks ? 100 : 0), s = [];
    s.push({ k: 'cover', pal: 0, title: pct === 100 ? 'يوم مكتمل 🎉' : pct >= 50 ? 'يوم كويس 👏' : x.tasks || x.focus || x.prayers ? 'يوم فيه بركة' : 'يوم هادي', sub: DLONG.format(dt(T)), pct });
    s.push({ k: 'tasks', pal: 1, n: x.tasks, list: x.done.slice(0, 4).map(t => t.title), more: Math.max(0, x.tasks - 4) });
    s.push({ k: 'focus', pal: 2, min: x.focus, sess: focus.filter(f => f.day === T).length });
    s.push({ k: 'prayer', pal: 4, n: x.prayers });
    s.push({ k: 'quran', pal: 3, pages: x.pages, goal: goal(), kh: +S.khatmas || 0 });
    s.push({ k: 'end', pal: 5, mood: x.mood, note: x.note, streak: stats ? effStreak(stats) : 0 });
    return s;
}
function buildYear() {
    const days = [];
    for (let d = Y0; d <= T; d = addDays(d, 1))
        days.push(dayData(d));
    const tot = days.reduce((a, x) => ({ tasks: a.tasks + x.tasks, focus: a.focus + x.focus, prayers: a.prayers + x.prayers, pages: a.pages + x.pages }), { tasks: 0, focus: 0, prayers: 0, pages: 0 });
    const s = [{ k: 'ycover', pal: 0, year: Y, tot }];
    const mons = {};
    days.forEach(x => (mons[x.d.slice(5, 7)] ??= []).push(x));
    Object.keys(mons).sort().forEach((m, i) => {
        const a = mons[m], best = a.reduce((b, x) => score(x) > score(b) ? x : b, a[0]);
        if (score(best) <= 0)
            return;
        const sum = a.reduce((z, x) => ({ tasks: z.tasks + x.tasks, focus: z.focus + x.focus, prayers: z.prayers + x.prayers, pages: z.pages + x.pages }), { tasks: 0, focus: 0, prayers: 0, pages: 0 });
        s.push({ k: 'month', pal: (i % 5) + 1, month: MON.format(dt(Y + '-' + m + '-01')), best, sum });
    });
    s.push({ k: 'yend', pal: 5, tot, months: s.length - 1 });
    return s;
}
const rebuild = () => { slides = mode === 'year' ? buildYear() : buildDay(); if (idx >= slides.length)
    idx = 0; renderBars(); draw(); };
/* ---------- الرسم ---------- */
function bg(pal) {
    const [a, b] = PAL[pal % PAL.length], g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, a);
    g.addColorStop(1, b);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(255,255,255,.06)';
    [[900, 260, 420], [120, 1500, 520], [980, 1700, 260]].forEach(([x, y, r]) => { ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); });
}
const F = (w, s) => `${w} ${s}px "IBM Plex Sans Arabic","Readex Pro",Tahoma,sans-serif`;
function txt(s, y, size, w = 600, col = '#fff', al = 'center', x = W / 2, a = 1) { ctx.globalAlpha = a; ctx.font = F(w, size); ctx.fillStyle = col; ctx.textAlign = al; ctx.direction = 'rtl'; ctx.fillText(s, x, y); ctx.globalAlpha = 1; }
function wrap(s, y, size, maxW, maxLines = 3, lh = 1.45, w = 500) {
    ctx.font = F(w, size);
    const words = s.split(/\s+/), lines = [];
    let cur = '';
    for (const wd of words) {
        const t = cur ? cur + ' ' + wd : wd;
        if (ctx.measureText(t).width > maxW && cur) {
            lines.push(cur);
            cur = wd;
        }
        else
            cur = t;
    }
    if (cur)
        lines.push(cur);
    if (lines.length > maxLines) {
        lines.length = maxLines;
        lines[maxLines - 1] = lines[maxLines - 1].replace(/.{0,2}$/, '…');
    }
    lines.forEach((l, i) => txt(l, y + i * size * lh, size, w));
    return y + lines.length * size * lh;
}
function ring(cx, cy, r, p, lw = 34) {
    ctx.lineWidth = lw;
    ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(255,255,255,.2)';
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, 7);
    ctx.stroke();
    if (p > 0) {
        ctx.strokeStyle = '#fff';
        ctx.beginPath();
        ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, p));
        ctx.stroke();
    }
}
function pill(s, y) { ctx.font = F(500, 38); const w = ctx.measureText(s).width + 80; ctx.fillStyle = 'rgba(255,255,255,.16)'; ctx.beginPath(); ctx.roundRect(W / 2 - w / 2, y - 52, w, 80, 40); ctx.fill(); txt(s, y, 38, 500); }
function brand() { txt('YOMAK · يومك', 1840, 34, 600, '#fff', 'center', W / 2, .7); }
function stat(label, val, x, y) { txt(val, y, 84, 700, '#fff', 'center', x); txt(label, y + 52, 32, 500, '#fff', 'center', x, .8); }
function draw() {
    const s = slides[idx];
    ctx.clearRect(0, 0, W, H);
    if (!s) {
        bg(0);
        txt('مفيش بيانات لسه', H / 2, 60);
        return;
    }
    bg(s.pal);
    if (s.k === 'cover') {
        txt('قصة يومك', 300, 64, 700);
        pill(s.sub, 400);
        ring(W / 2, 880, 270, s.pct / 100, 46);
        txt(s.pct + '%', 910, 190, 700);
        txt('إنجاز اليوم', 1010, 44, 500, '#fff', 'center', W / 2, .85);
        txt(s.title, 1380, 78, 700);
    }
    else if (s.k === 'tasks') {
        txt('✅ مهامك', 300, 60, 600);
        txt(NF.format(s.n), 700, 420, 700);
        txt(s.n === 1 ? 'مهمة خلّصتها' : 'مهام خلّصتها', 800, 56, 500);
        let y = 1020;
        s.list.forEach(t => { ctx.fillStyle = 'rgba(255,255,255,.14)'; ctx.beginPath(); ctx.roundRect(90, y - 58, W - 180, 96, 28); ctx.fill(); ctx.save(); ctx.beginPath(); ctx.rect(110, y - 58, W - 220, 96); ctx.clip(); txt('✓  ' + (t.length > 34 ? t.slice(0, 33) + '…' : t), y + 4, 40, 500); ctx.restore(); y += 118; });
        if (s.more)
            txt(`و ${s.more} كمان`, y + 30, 38, 500, '#fff', 'center', W / 2, .8);
        if (!s.n)
            txt('بكرة يوم جديد، ابدأ بمهمة صغيرة', 1100, 44, 500, '#fff', 'center', W / 2, .85);
    }
    else if (s.k === 'focus') {
        txt('🎯 تركيزك', 300, 60, 600);
        txt(NF.format(s.min), 760, 380, 700);
        txt('دقيقة تركيز', 870, 60, 500);
        if (s.min)
            pill(`${hm(s.min)} · ${s.sess} ${s.sess === 1 ? 'جلسة' : 'جلسات'}`, 1060);
        else
            txt('لسه ماجبتش جلسة تركيز النهاردة', 1080, 44, 500, '#fff', 'center', W / 2, .85);
    }
    else if (s.k === 'prayer') {
        txt('🕌 صلواتك', 300, 60, 600);
        txt(`${s.n} / 5`, 720, 300, 700);
        for (let i = 0; i < 5; i++) {
            const cx = W / 2 + (2 - i) * 170;
            ctx.beginPath();
            ctx.arc(cx, 1000, 56, 0, 7);
            ctx.fillStyle = i < s.n ? '#fff' : 'rgba(255,255,255,.2)';
            ctx.fill();
            if (i < s.n) {
                ctx.fillStyle = '#0f7a62';
                ctx.font = F(700, 64);
                ctx.textAlign = 'center';
                ctx.fillText('✓', cx, 1022);
            }
        }
        txt(s.n === 5 ? 'ما شاء الله، حافظت على كل صلواتك' : s.n ? 'الله يتقبّل منك' : 'سجّل صلواتك علشان تظهر هنا', 1230, 50, 600);
    }
    else if (s.k === 'quran') {
        txt('📖 ورد القرآن', 300, 60, 600);
        ring(W / 2, 760, 240, s.goal ? s.pages / s.goal : 0, 44);
        txt(NF.format(s.pages), 790, 170, 700);
        txt(`من ${s.goal} صفحة`, 1130, 50, 500);
        if (s.kh)
            pill(`ختمات مكتملة: ${s.kh}`, 1260);
        txt(s.pages >= s.goal ? 'أتممت ورد النهارده 🤍' : 'كل صفحة بتفرق', 1420, 56, 700);
    }
    else if (s.k === 'end') {
        txt(s.mood ? MOODS[s.mood] : '🌙', 640, 300, 500);
        txt(s.mood ? 'مزاجك النهاردة' : 'خلّص يومك', 820, 56, 600);
        if (s.note)
            wrap('«' + s.note + '»', 960, 46, 860, 5, 1.5);
        if (s.streak)
            pill(`🔥 ${s.streak} ${s.streak === 1 ? 'يوم' : 'أيام'} متتالية`, 1450);
        txt('تصبح على خير', 1620, 60, 700);
    }
    else if (s.k === 'ycover') {
        txt('فيلم سنتك', 330, 70, 700);
        txt(s.year, 760, 330, 700);
        const t = s.tot;
        stat('مهمة', NF.format(t.tasks), W * .75, 1120);
        stat('ساعة تركيز', NF.format(Math.round(t.focus / 60)), W * .25, 1120);
        stat('صلاة', NF.format(t.prayers), W * .75, 1380);
        stat('صفحة قرآن', NF.format(t.pages), W * .25, 1380);
    }
    else if (s.k === 'month') {
        const b = s.best;
        txt('أحلى لحظة في', 270, 50, 500, '#fff', 'center', W / 2, .85);
        txt(s.month, 420, 150, 700);
        pill(DLONG.format(dt(b.d)), 540);
        txt(b.mood ? MOODS[b.mood] : '⭐', 800, 230, 500);
        const rows = [['✅', `${b.tasks} مهمة`], ['🎯', `${b.focus} دقيقة تركيز`], ['🕌', `${b.prayers} صلوات`], ['📖', `${b.pages} صفحة`]];
        let y = 1010;
        rows.forEach(([i, t]) => { txt(i + '  ' + t, y, 52, 600); y += 90; });
        if (b.note)
            wrap('«' + b.note + '»', 1400, 38, 820, 3, 1.45, 500);
        txt(`الشهر كله: ${s.sum.tasks} مهمة · ${s.sum.prayers} صلاة · ${s.sum.pages} صفحة`, 1730, 34, 500, '#fff', 'center', W / 2, .8);
    }
    else if (s.k === 'yend') {
        txt('🌟', 520, 260, 500);
        txt(`سنة ${Y}`, 760, 110, 700);
        txt(`${s.months} ${s.months === 1 ? 'شهر' : 'شهور'} فيها لحظات تتحكي`, 900, 48, 500);
        txt('كمّل، السنة لسه فيها حكايات', 1100, 52, 700);
    }
    brand();
}
/* ---------- التحكم (تقدّم تلقائي / لمس / مشاركة) ---------- */
function renderBars() {
    const b = $('stBars');
    b.replaceChildren();
    slides.forEach((_, i) => { const d = document.createElement('i'), f = document.createElement('b'); d.append(f); d.onclick = () => go(i); b.append(d); });
    paintBars(0);
}
function paintBars(p) { [...$('stBars').children].forEach((d, i) => d.firstChild.style.width = (i < idx ? 100 : i === idx ? p * 100 : 0) + '%'); }
function go(i) { idx = Math.max(0, Math.min(slides.length - 1, i)); t0 = performance.now(); draw(); paintBars(0); }
function tick(now) {
    if (!paused && slides.length) {
        const p = (now - t0) / DUR;
        if (p >= 1) {
            if (idx < slides.length - 1)
                go(idx + 1);
            else {
                paintBars(1);
                paused = true;
                $('stPlay').textContent = '↻';
            }
        }
        else
            paintBars(p);
    }
    timer = requestAnimationFrame(tick);
}
$('stNext').onclick = () => go(idx + 1);
$('stPrev').onclick = () => go(idx - 1);
let pausedAt = 0;
$('stPlay').onclick = () => {
    const btn = $('stPlay');
    if (btn.textContent === '↻') {
        paused = false;
        btn.textContent = '⏸';
        go(0);
        return;
    }
    paused = !paused;
    btn.textContent = paused ? '▶' : '⏸';
    if (paused)
        pausedAt = performance.now();
    else
        t0 += performance.now() - pausedAt;
};
document.addEventListener('keydown', e => { if (e.key === 'ArrowLeft')
    go(idx + 1); if (e.key === 'ArrowRight')
    go(idx - 1); });
const blob = () => new Promise(r => cv.toBlob(r, 'image/png'));
const fname = () => `yomak-${mode === 'year' ? 'year-' + Y : T}-${idx + 1}.png`;
$('stSave').onclick = async () => { const b = await blob(), a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = fname(); a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); toast('اتحفظت الصورة', 'success'); };
$('stShare').onclick = async () => {
    const b = await blob(), f = new File([b], fname(), { type: 'image/png' });
    try {
        if (navigator.canShare?.({ files: [f] }))
            await navigator.share({ files: [f], title: 'يومك' });
        else
            $('stSave').click();
    }
    catch (e) {
        if (e.name !== 'AbortError')
            toast(errMsg(e), 'error');
    }
};
document.querySelectorAll('#stTabs button').forEach(b => b.onclick = () => { mode = b.dataset.m; history.replaceState(null, '', mode === 'year' ? '#year' : '#day'); idx = 0; paused = false; $('stPlay').textContent = '⏸'; paintTabs(); rebuild(); t0 = performance.now(); });
const paintTabs = () => document.querySelectorAll('#stTabs button').forEach(b => { const on = b.dataset.m === mode; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); });
paintTabs();
/* ---------- البيانات ---------- */
let pending;
const refresh = () => { clearTimeout(pending); pending = setTimeout(rebuild, 120); };
const days = Math.round((dt(T) - dt(Y0)) / 864e5) + 1;
document.fonts.load(F(700, 40)).then(() => document.fonts.load(F(500, 40))).finally(() => { rebuild(); t0 = performance.now(); timer = requestAnimationFrame(tick); });
startShell({
    onUser: u => {
        user = u;
        const er = e => toast(errMsg(e), 'error');
        onSnapshot(query(collection(db, 'users', u.uid, 'focus'), where('day', '>=', Y0)), s => { focus = s.docs.map(d => d.data()); refresh(); }, er);
        watchSettings(u.uid, s => { S = s; refresh(); }, er);
        watchDays(u.uid, 'p_', days, m => { P = m; refresh(); }, er);
        watchDays(u.uid, 'q_', days, m => { Q = m; refresh(); }, er);
        onSnapshot(query(collection(db, 'users', u.uid, 'wraps'), where(documentId(), '>=', Y0), where(documentId(), '<=', T)), s => { wraps = {}; s.docs.forEach(d => wraps[d.id] = d.data()); refresh(); }, er);
    },
    onTasks: t => { tasks = t; refresh(); },
    onRewards: s => { stats = s; refresh(); }
});

