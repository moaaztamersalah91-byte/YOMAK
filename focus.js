// YOMAK Focus Mode — مؤقت بومودورو مرتبط بالمهام والمكافآت
import { startShell, $, errMsg } from './shell.js';
import { db } from './firebase.js';
import { collection, addDoc, updateDoc, setDoc, getDoc, doc, increment, onSnapshot, query, orderBy, limit, serverTimestamp } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js';
import { toast, burst, emptyState } from './ui.js';
import { award, notify, setTaskCompleted, XP } from './rewards.js';
import { today, ymd, addDays } from './logic.js';
const KEY = 'yomak_focus_v1', C = 2 * Math.PI * 90;
const MODES = { focus: 'تركيز', short: 'راحة قصيرة', long: 'راحة طويلة' };
const DEF = { mode: 'focus', dur: { focus: 25, short: 5, long: 15 }, running: false, endAt: 0, rem: 0, total: 0, taskId: '', cycles: 0, sound: true };
let S = (() => { try {
    const s = JSON.parse(localStorage.getItem(KEY) || '{}');
    return { ...DEF, ...s, dur: { ...DEF.dur, ...(s.dur || {}) } };
}
catch {
    return { ...DEF };
} })();
let user = null, tasks = [], sessions = [], tick = null, asked = false, prefsOk = false, pTimer = null;
// حالة المؤقت الحيّة (شغّال/وقت الانتهاء) تفضل على الجهاز، أما الإعدادات (المدد/الصوت/الدورات) فبتتحفظ في Firestore: users/{uid}/prefs/focus
const pushPrefs = () => { if (!user || !prefsOk)
    return; clearTimeout(pTimer); pTimer = setTimeout(() => setDoc(doc(db, 'users', user.uid, 'prefs', 'focus'), { dur: S.dur, sound: !!S.sound, cycles: S.cycles | 0, updatedAt: serverTimestamp() }, { merge: true }).catch(e => toast(errMsg(e), 'error')), 700); };
const save = () => { try {
    localStorage.setItem(KEY, JSON.stringify(S));
}
catch { } pushPrefs(); };
const full = () => S.dur[S.mode] * 60000;
const left = () => S.running ? Math.max(0, S.endAt - Date.now()) : (S.rem > 0 ? S.rem : full());
const total = () => (S.running || S.rem > 0) ? S.total : full();
const started = () => S.running || S.rem > 0;
const mmss = ms => { const s = Math.ceil(ms / 1000); return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); };
const curTask = () => tasks.find(t => t.id === S.taskId && !t.completed);
/* ---------- صوت وتنبيه ---------- */
function chime() { }
function pushNote(body) {
    try {
        if (document.hidden)
            import('./notify.js').then(m => m.deviceNotify('YOMAK', body, { url: 'focus.html', tag: 'focus' }));
    }
    catch { }
}
/* ---------- العرض ---------- */
function render() {
    const rem = left(), tot = total(), prog = tot ? 1 - rem / tot : 0;
    $('tTime').textContent = mmss(rem);
    $('tFg').style.strokeDasharray = C;
    $('tFg').style.strokeDashoffset = C * (1 - Math.min(1, Math.max(0, prog)));
    const brk = S.mode !== 'focus';
    $('focusCard').classList.toggle('is-break', brk);
    $('focusCard').classList.toggle('is-running', S.running);
    $('tLabel').textContent = S.running ? (brk ? 'استرح شوية ☕' : 'ركّز... أنت قدها') : started() ? 'متوقف مؤقتًا' : brk ? 'وقت الراحة' : 'جاهز للتركيز';
    $('tToggle').textContent = S.running ? 'إيقاف مؤقت' : started() ? 'استئناف' : 'ابدأ';
    $('tToggle').setAttribute('aria-pressed', S.running);
    document.querySelectorAll('#modes button').forEach(b => { const on = b.dataset.mode === S.mode; b.classList.toggle('on', on); b.setAttribute('aria-selected', on); });
    $('durVal').textContent = S.dur.focus;
    const lock = started() || S.mode !== 'focus';
    $('durMinus').disabled = lock || S.dur.focus <= 5;
    $('durPlus').disabled = lock || S.dur.focus >= 90;
    $('soundBtn').hidden = true;
    const t = curTask();
    $('curTask').textContent = t ? '🎯 ' + t.title : 'بدون مهمة محددة';
    $('finishTask').hidden = !t;
    document.title = S.running ? `${mmss(rem)} • ${brk ? 'راحة' : 'تركيز'} | YOMAK` : 'وضع التركيز | YOMAK';
}
function renderPick() {
    const box = $('pickList'), t0 = today();
    const rank = x => x.dueDate === t0 ? 0 : x.dueDate < t0 ? 1 : 2;
    const list = tasks.filter(x => !x.completed).sort((a, b) => rank(a) - rank(b) || (a.dueDate + (a.dueTime || '')).localeCompare(b.dueDate + (b.dueTime || ''))).slice(0, 12);
    box.replaceChildren();
    if (!list.length) {
        emptyState(box, 'today', () => location.href = 'today.html');
        const h = box.querySelector('h3');
        if (h)
            h.textContent = 'مفيش مهام تركّز عليها';
        return;
    }
    for (const x of list) {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'pick';
        b.setAttribute('aria-pressed', x.id === S.taskId);
        const tt = document.createElement('span');
        tt.className = 'pick-t';
        tt.textContent = x.title;
        const m = document.createElement('small');
        m.textContent = [x.dueDate === t0 ? 'اليوم' : x.dueDate < t0 ? 'متأخرة' : x.dueDate, { high: 'عالية', medium: 'متوسطة', low: 'منخفضة' }[x.priority], x.focusMin ? `⏱ ${x.focusMin} د` : ''].filter(Boolean).join(' • ');
        b.append(tt, m);
        b.onclick = () => { S.taskId = S.taskId === x.id ? '' : x.id; save(); renderPick(); render(); };
        box.append(b);
    }
}
function renderStats() {
    const t0 = today(), byDay = {};
    for (const s of sessions)
        byDay[s.day] = (byDay[s.day] || 0) + s.minutes;
    const todayS = sessions.filter(s => s.day === t0);
    $('fMinToday').textContent = byDay[t0] || 0;
    $('fSesToday').textContent = todayS.length;
    $('fMinTotal').textContent = sessions.reduce((a, s) => a + s.minutes, 0);
    const days = [...Array(7)].map((_, i) => addDays(t0, i - 6)), max = Math.max(30, ...days.map(d => byDay[d] || 0));
    const w = $('weekBars');
    w.replaceChildren();
    for (const d of days) {
        const v = byDay[d] || 0, c = document.createElement('div');
        c.className = 'wk' + (d === t0 ? ' now' : '');
        c.title = `${v} دقيقة`;
        c.innerHTML = `<i style="--h:${Math.max(4, v / max * 100)}%"></i><small>${new Intl.DateTimeFormat('ar-EG', { weekday: 'narrow' }).format(new Date(d + 'T00:00'))}</small>`;
        w.append(c);
    }
}
/* ---------- المؤقت ---------- */
function startTick() { clearInterval(tick); tick = setInterval(onTick, 250); }
function onTick() { if (S.running && left() <= 0)
    return complete(); render(); }
function start() {
    window.SFX && SFX.play(S.mode === 'focus' ? 'focusStart' : 'breakStart');
    if (S.running)
        return;
    if (!asked) {
        asked = true;
        import('./notify.js').then(m => { if (m.permission() === 'default')
            m.enable(); });
    }
    const r = S.rem > 0 ? S.rem : full();
    if (!(S.rem > 0))
        S.total = full();
    S.endAt = Date.now() + r;
    S.running = true;
    S.rem = 0;
    save();
    startTick();
    render();
}
function pause() { S.rem = Math.max(1000, S.endAt - Date.now()); S.running = false; save(); clearInterval(tick); render(); }
function reset() { S.running = false; S.rem = 0; S.total = 0; save(); clearInterval(tick); render(); }
function setMode(m) { S.mode = m; S.running = false; S.rem = 0; S.total = 0; save(); clearInterval(tick); render(); }
async function complete() {
    window.SFX && SFX.play('timerEnd');
    const mode = S.mode, mins = Math.max(1, Math.round(S.total / 60000)), day = ymd(new Date(S.endAt || Date.now()));
    clearInterval(tick);
    S.running = false;
    S.rem = 0;
    S.total = 0;
    chime();
    if (mode === 'focus') {
        S.cycles++;
        S.mode = S.cycles % 4 === 0 ? 'long' : 'short';
        save();
        render();
        const r = $('tFg').getBoundingClientRect();
        burst(r.left + r.width / 2, r.top + r.height / 2, true);
        toast(`أحسنت! خلّصت ${mins} دقيقة تركيز 🎯 — خد ${S.mode === 'long' ? 'راحة طويلة' : 'راحة قصيرة'}`, 'success', 4500);
        pushNote(`خلّصت جلسة تركيز ${mins} دقيقة. وقت الراحة!`);
        await record(mins, day);
    }
    else {
        S.mode = 'focus';
        save();
        render();
        toast('الراحة خلصت. يلا نرجع للتركيز 💪', 'info');
        pushNote('الراحة خلصت. يلا نرجع للتركيز!');
    }
}
async function record(mins, day) {
    if (!user)
        return;
    const t = curTask();
    try {
        const data = { minutes: mins, day, endedAt: serverTimestamp() };
        if (t) {
            data.taskId = t.id;
            data.taskTitle = t.title.slice(0, 120);
        }
        await addDoc(collection(db, 'users', user.uid, 'focus'), data);
        if (t)
            await updateDoc(doc(db, 'users', user.uid, 'tasks', t.id), { focusMin: increment(mins) });
        notify(await award(user.uid, { type: 'focus', xp: mins, minutes: mins, label: `جلسة تركيز ${mins} د` }));
    }
    catch (e) {
        toast('اتحسبت الجلسة لكن تعذّر حفظها: ' + errMsg(e), 'error', 6000);
    }
}
/* ---------- الأحداث ---------- */
$('tToggle').onclick = () => S.running ? pause() : start();
$('tReset').onclick = () => { if (started() && !confirm('إعادة ضبط الجلسة الحالية؟'))
    return; reset(); };
$('tSkip').onclick = () => {
    if (started() && S.mode === 'focus' && !confirm('تخطّي الجلسة؟ مش هتتحسب لك نقاط.'))
        return;
    setMode(S.mode === 'focus' ? (S.cycles % 4 === 3 ? 'long' : 'short') : 'focus');
};
document.querySelectorAll('#modes button').forEach(b => b.onclick = () => {
    if (b.dataset.mode === S.mode)
        return;
    if (started() && !confirm('تغيير الوضع هينهي الجلسة الحالية. متأكد؟'))
        return;
    setMode(b.dataset.mode);
});
$('durMinus').onclick = () => { S.dur.focus = Math.max(5, S.dur.focus - 5); save(); render(); };
$('durPlus').onclick = () => { S.dur.focus = Math.min(90, S.dur.focus + 5); save(); render(); };
$('finishTask').onclick = async () => {
    const t = curTask();
    if (!t || !user)
        return;
    try {
        const r = $('finishTask').getBoundingClientRect();
        burst(r.left + r.width / 2, r.top, false);
        await setTaskCompleted(user.uid, t, true);
        S.taskId = '';
        save();
        toast('تم إنجاز المهمة ✅', 'success');
        renderPick();
        render();
    }
    catch (e) {
        toast(errMsg(e), 'error');
    }
};
// ملء الشاشة
const exitImm = () => { document.body.classList.remove('immersive'); if (document.fullscreenElement)
    document.exitFullscreen?.().catch(() => { }); };
$('immersive').onclick = () => { document.body.classList.add('immersive'); document.documentElement.requestFullscreen?.().catch(() => { }); };
$('fExit').onclick = exitImm;
document.addEventListener('fullscreenchange', () => { if (!document.fullscreenElement)
    document.body.classList.remove('immersive'); });
document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && document.body.classList.contains('immersive'))
        exitImm();
    if (e.code === 'Space' && document.body.classList.contains('immersive') && !e.target.closest('button,input')) {
        e.preventDefault();
        S.running ? pause() : start();
    }
});
document.addEventListener('visibilitychange', () => { if (!document.hidden)
    onTick(); });
window.addEventListener('beforeunload', e => { if (S.running && S.mode === 'focus') {
    e.preventDefault();
    e.returnValue = '';
} });
/* ---------- تشغيل ---------- */
const qp = new URLSearchParams(location.search).get('task');
if (qp) {
    S.taskId = qp;
    save();
}
render();
if (S.running) {
    if (left() <= 0)
        setTimeout(complete, 300);
    else
        startTick();
}
startShell({
    onUser: u => {
        user = u;
        getDoc(doc(db, 'users', u.uid, 'prefs', 'focus')).then(p => {
            if (p.exists()) {
                const d = p.data();
                if (d.dur)
                    S.dur = { ...S.dur, ...d.dur };
                if (typeof d.sound === 'boolean')
                    S.sound = d.sound;
                if (Number.isInteger(d.cycles))
                    S.cycles = d.cycles;
                try {
                    localStorage.setItem(KEY, JSON.stringify(S));
                }
                catch { }
                prefsOk = true;
                render();
            }
            else {
                prefsOk = true;
                pushPrefs();
            }
        }).catch(() => { });
        onSnapshot(query(collection(db, 'users', u.uid, 'focus'), orderBy('endedAt', 'desc'), limit(300)), s => { sessions = s.docs.map(d => d.data()); renderStats(); }, e => toast(errMsg(e), 'error'));
    },
    onTasks: t => { tasks = t; if (S.taskId && !t.some(x => x.id === S.taskId && !x.completed)) {
        S.taskId = '';
        save();
    } renderPick(); render(); }
});

