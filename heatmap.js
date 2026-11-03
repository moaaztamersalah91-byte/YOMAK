// خريطة الإنتاجية: نشاط آخر 26 أسبوع (مهام منجزة + دقائق تركيز)
import { startShell, $, errMsg } from './shell.js';
import { db } from './firebase.js';
import { collection, onSnapshot, query, orderBy, limit } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js';
import { toast, setNum } from './ui.js';
import { today, ymd, addDays } from './logic.js';
import { watchDays } from './islamic.js';
const WEEKS = 26, AR = new Intl.DateTimeFormat('ar-EG-u-nu-latn', { weekday: 'long', day: 'numeric', month: 'long' }), MON = new Intl.DateTimeFormat('ar-EG-u-nu-latn', { month: 'short' });
const WD = ['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'];
let tasks = [], sessions = [], habits = [], hz = {}, mode = 'all', sel = '';
const idx = d => (new Date(d + 'T00:00').getDay() + 1) % 7; // السبت = 0
const doneDay = t => t.doneDay || t.dueDate;
function collect() {
    const m = {};
    const g = d => m[d] || (m[d] = { t: 0, f: 0, h: 0, q: 0 });
    for (const t of tasks)
        if (t.completed && doneDay(t))
            g(doneDay(t)).t++;
    for (const s of sessions)
        if (s.day)
            g(s.day).f += s.minutes || 0;
    for (const h of habits)
        for (const d of h.done || [])
            g(d).h++;
    for (const d in hz)
        g(d).q += hz[d].hz || 0;
    return m;
}
const val = x => !x ? 0 : mode === 'tasks' ? x.t : mode === 'focus' ? x.f / 25 : mode === 'habits' ? x.h : mode === 'hifz' ? x.q : x.t + x.f / 25 + x.h / 2 + x.q / 2;
function render() {
    const m = collect(), t0 = today(), start = addDays(t0, -idx(t0) - (WEEKS - 1) * 7);
    const days = [];
    for (let i = 0; i < WEEKS * 7; i++)
        days.push(addDays(start, i));
    const vals = days.filter(d => d <= t0).map(d => val(m[d])), max = Math.max(1, ...vals);
    const lvl = v => v <= 0 ? 0 : Math.min(4, Math.max(1, Math.ceil(v / max * 4)));
    const grid = $('hmGrid');
    grid.replaceChildren();
    days.forEach(d => {
        const b = document.createElement('button');
        b.type = 'button';
        if (d > t0) {
            b.className = 'hm-c fut';
            b.disabled = true;
            b.tabIndex = -1;
            grid.append(b);
            return;
        }
        const x = m[d] || { t: 0, f: 0, h: 0, q: 0 };
        b.className = 'hm-c l' + lvl(val(m[d])) + (d === t0 ? ' now' : '') + (d === sel ? ' sel' : '');
        b.setAttribute('aria-label', `${AR.format(new Date(d + 'T00:00'))}: ${x.t} مهام، ${x.f} دقيقة تركيز، ${x.h} عادات، ${x.q} حفظ/مراجعة`);
        b.onclick = () => { sel = d; $('hmPick').textContent = `${AR.format(new Date(d + 'T00:00'))} — ${x.t} مهمة منجزة • ${x.f} دقيقة تركيز • ${x.h} تشيك عادات • ${x.q} حفظ/مراجعة`; grid.querySelectorAll('.sel').forEach(e => e.classList.remove('sel')); b.classList.add('sel'); };
        grid.append(b);
    });
    const mo = $('hmMonths');
    mo.replaceChildren();
    let last = -1;
    for (let w = 0; w < WEEKS; w++) {
        const d = new Date(days[w * 7] + 'T00:00'), k = d.getMonth();
        if (k !== last && (w > 0 || d.getDate() <= 7)) {
            const s = document.createElement('span');
            s.textContent = MON.format(d);
            s.style.gridColumn = w + 1;
            mo.append(s);
        }
        last = k;
    }
    const dl = $('hmDays');
    if (!dl.children.length)
        WD.forEach((n, i) => { const s = document.createElement('span'); s.textContent = i % 2 === 0 ? n : ''; dl.append(s); });
    // إحصائيات
    const past = days.filter(d => d <= t0);
    let tt = 0, ff = 0, act = 0, run = 0, best = 0;
    const wd = Array(7).fill(0), wn = Array(7).fill(0);
    for (const d of past) {
        const x = m[d] || { t: 0, f: 0 };
        tt += x.t;
        ff += x.f;
        const on = x.t > 0 || x.f > 0 || x.q > 0;
        if (on) {
            act++;
            run++;
            best = Math.max(best, run);
        }
        else
            run = 0;
        wd[idx(d)] += x.t + x.f / 25 + x.h / 2 + (x.q || 0) / 2;
        wn[idx(d)]++;
    }
    setNum($('hmTasks'), tt);
    setNum($('hmFocus'), ff);
    setNum($('hmActive'), act);
    setNum($('hmStreak'), best);
    const avg = wd.map((v, i) => wn[i] ? v / wn[i] : 0), mx = Math.max(0.01, ...avg), box = $('hmWd');
    box.replaceChildren();
    avg.forEach((v, i) => { const r = document.createElement('div'); r.className = 'hm-wr'; r.innerHTML = '<span></span><i><u></u></i><b></b>'; r.children[0].textContent = WD[i]; r.querySelector('u').style.width = (v / mx * 100) + '%'; r.children[2].textContent = v.toFixed(1); box.append(r); });
    const bi = avg.indexOf(Math.max(...avg));
    $('hmBest').textContent = Math.max(...avg) > 0 ? `أكتر يوم بتنتج فيه: ${WD[bi]} (متوسط ${avg[bi].toFixed(1)} نقطة نشاط).` : 'ابدأ بإنجاز مهام وجلسات تركيز وهتظهر أنماطك هنا.';
}
document.querySelectorAll('#hmMode button').forEach(b => b.onclick = () => { mode = b.dataset.m; document.querySelectorAll('#hmMode button').forEach(x => x.classList.toggle('on', x === b)); render(); });
let first = true;
const ready = () => { if (first) {
    first = false;
    window.YomakLoader?.hide();
} };
render();
startShell({
    onUser: u => {
        onSnapshot(query(collection(db, 'users', u.uid, 'focus'), orderBy('endedAt', 'desc'), limit(1500)), s => { sessions = s.docs.map(d => d.data()); render(); }, e => toast(errMsg(e), 'error'));
        watchDays(u.uid, 'h_', 182, m => { hz = m; render(); }, () => { });
        onSnapshot(collection(db, 'users', u.uid, 'habits'), s => { habits = s.docs.map(d => d.data()); render(); }, () => { });
    },
    onTasks: t => { tasks = t; render(); ready(); }
});

