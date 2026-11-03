// العادات: تشيك يومي + سلاسل أيام + تكامل مع المكافآت (XP) وخريطة الإنتاجية
import { startShell, $, errMsg } from './shell.js';
import { db } from './firebase.js';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, arrayUnion, arrayRemove, serverTimestamp } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js';
import { toast, setLoading, setNum, burst } from './ui.js';
import { awardHabit } from './rewards.js';
import { permission, enable } from './reminders.js';
import { today, addDays, wd, isDue, habitStreak, habitBest, habitRate } from './logic.js';
const PALETTE = ['#04796c', '#4a8fd1', '#c58a1f', '#7a5cc4', '#c2477a', '#3f9b4f'];
const DAYS = [[6, 'السبت'], [0, 'الأحد'], [1, 'الاثنين'], [2, 'الثلاثاء'], [3, 'الأربعاء'], [4, 'الخميس'], [5, 'الجمعة']];
const SHORT = new Intl.DateTimeFormat('ar-EG-u-nu-latn', { weekday: 'short' });
const FULL = new Intl.DateTimeFormat('ar-EG-u-nu-latn', { weekday: 'long', day: 'numeric', month: 'long' });
let user = null, habits = [], cur = null, icon = '💧', busy = new Set(), loaded = false;
const mk = (t, c, x) => { const e = document.createElement(t); if (c)
    e.className = c; if (x != null)
    e.textContent = x; return e; };
const at = d => new Date(d + 'T12:00');
/* ---------- العرض ---------- */
function stats() {
    const t = today(), due = habits.filter(h => isDue(h, t)), done = due.filter(h => (h.done || []).includes(t));
    $('hbToday').textContent = `${done.length}/${due.length}`;
    setNum($('hbStreak'), Math.max(0, ...habits.map(h => habitStreak(h))));
    $('hbRate').textContent = (habits.length ? Math.round(habits.reduce((a, h) => a + habitRate(h, 30), 0) / habits.length) : 0) + '%';
    setNum($('hbTotal'), habits.reduce((a, h) => a + (h.done || []).length, 0));
    const pct = due.length ? Math.round(done.length / due.length * 100) : 0;
    $('hbRing').style.setProperty('--p', pct);
    $('hbRingTxt').textContent = pct + '%';
    $('hbBar').style.width = pct + '%';
    $('hbHero').classList.toggle('full', due.length > 0 && pct === 100);
    $('hbMsg').textContent = !habits.length ? 'ابدأ يومك بعادة صغيرة' : !due.length ? 'النهارده إجازة من العادات 🌴' : pct === 100 ? 'يوم مثالي! خلّصت كل عاداتك 🎉' : pct >= 50 ? `قربت! باقي ${due.length - done.length} من ${due.length}` : done.length ? `بداية حلوة — ${done.length} من ${due.length}` : `عندك ${due.length} ${due.length > 2 ? 'عادات' : 'عادة'} النهارده`;
}
function strip(h) {
    const box = mk('div', 'hb-strip'), t = today(), done = new Set(h.done || []);
    for (let i = 6; i >= 0; i--) {
        const d = addDays(t, -i), pre = d < h.start && !done.has(d), due = isDue(h, d) && !pre, on = done.has(d);
        const b = mk('button', 'hb-d' + (on ? ' on' : '') + (!due && !on ? ' off' : '') + (d === t ? ' now' : '') + (!on && due && d < t ? ' miss' : ''));
        b.type = 'button';
        b.append(mk('small', '', SHORT.format(at(d))), mk('i', '', on ? '✓' : ''));
        b.setAttribute('aria-pressed', on);
        b.setAttribute('aria-label', `${FULL.format(at(d))} — ${on ? 'تم' : due ? 'لم يتم' : 'غير مجدول'}`);
        if (pre)
            b.disabled = true;
        b.onclick = () => toggle(h, d, b);
        box.append(b);
    }
    return box;
}
function row(h) {
    const t = today(), due = isDue(h, t), on = (h.done || []).includes(t), st = habitStreak(h);
    const el = mk('article', 'hb-row' + (on ? ' done' : '') + (!due ? ' rest' : ''));
    el.style.setProperty('--c', h.color || PALETTE[0]);
    const chk = mk('button', 'hb-chk', on ? '✓' : '');
    chk.type = 'button';
    chk.disabled = !due && !on;
    chk.setAttribute('aria-pressed', on);
    chk.setAttribute('aria-label', `${on ? 'إلغاء تشيك' : 'تشيك'} ${h.name}`);
    chk.onclick = () => toggle(h, t, chk);
    const info = mk('div', 'hb-info');
    const nm = mk('h3', '');
    nm.append(mk('span', 'hb-ic', h.icon || '✅'), document.createTextNode(' ' + h.name));
    const meta = mk('div', 'hb-meta');
    const days = h.days && h.days.length ? DAYS.filter(([k]) => h.days.includes(k)).map(x => x[1]).join('، ') : 'كل يوم';
    if (h.remind)
        meta.append(mk('span', 'chip', `🔔 ${h.remind}`));
    meta.append(mk('span', 'chip' + (st >= 3 ? ' fire' : ''), st ? `🔥 ${st} ${st > 2 && st < 11 ? 'أيام' : 'يوم'}` : 'بدون سلسلة'), mk('span', 'chip', `أفضل ${habitBest(h)}`), mk('span', 'chip', `${habitRate(h, 30)}% / 30 يوم`), mk('span', 'hb-days muted', !due ? `إجازة اليوم • ${days}` : days));
    info.append(nm, meta);
    const act = mk('div', 'hb-act'), ed = mk('button', 'secondary icon-btn', '✏️');
    ed.type = 'button';
    ed.setAttribute('aria-label', 'تعديل ' + h.name);
    ed.onclick = () => edit(h);
    act.append(ed);
    el.append(chk, info, strip(h), act);
    return el;
}
function render() {
    const L = $('hbList');
    L.replaceChildren();
    if (loaded && !habits.length) {
        const e = mk('div', 'empty hb-empty');
        e.append(mk('div', 'hb-empty-i', '🌱'), mk('h3', '', 'لسه مفيش عادات'), mk('p', 'muted', 'ابدأ بعادة واحدة صغيرة زي «شرب المياه» أو «الرياضة 15 دقيقة»، وخلّي السلسلة تكبر يوم بعد يوم.'));
        const b = mk('button', '', '+ أضف أول عادة');
        b.type = 'button';
        b.onclick = () => edit(null);
        e.append(b);
        L.append(e);
    }
    else
        habits.forEach(h => L.append(row(h)));
    $('hbWeekHint').hidden = !habits.length;
    stats();
}
/* ---------- التشيك + المكافآت ---------- */
async function toggle(h, day, btn) {
    const key = h.id + day;
    if (busy.has(key) || !user)
        return;
    busy.add(key);
    const ref = doc(db, 'users', user.uid, 'habits', h.id), on = (h.done || []).includes(day), t = today();
    try {
        if (on) {
            await updateDoc(ref, { done: arrayRemove(day) });
        }
        else {
            const fresh = day === t && !(h.paid || []).includes(day);
            await updateDoc(ref, { done: arrayUnion(day), ...(fresh ? { paid: arrayUnion(day) } : {}) });
            if (day === t && btn) {
                const r = btn.getBoundingClientRect();
                burst(r.left + r.width / 2, r.top + r.height / 2, false);
            }
            if (fresh) {
                const due = habits.filter(x => isDue(x, day));
                const all = due.length >= 2 && due.every(x => x.id === h.id || (x.done || []).includes(day));
                awardHabit(user.uid, h.name, all);
            }
        }
    }
    catch (e) {
        toast(errMsg(e), 'error');
    }
    busy.delete(key);
}
/* ---------- إضافة / تعديل ---------- */
const selDays = () => [...document.querySelectorAll('#hbDays .on')].map(b => +b.dataset.d);
function hint() {
    const s = selDays();
    $('hbDaysHint').textContent = !s.length || s.length === 7 ? 'كل يوم' : 'كل: ' + DAYS.filter(([k]) => s.includes(k)).map(x => x[1]).join('، ');
}
function pickIcon(e) {
    icon = e;
    document.querySelectorAll('#hbIcons .pk-e').forEach(b => b.classList.toggle('on', b.dataset.e === e));
}
document.querySelectorAll('#hbIcons .pk-e').forEach(b => b.onclick = () => pickIcon(b.dataset.e));
(() => { const w = $('hbDays'); for (const [k, n] of DAYS) {
    const b = mk('button', 'dp', n.replace('ال', ''));
    b.type = 'button';
    b.dataset.d = k;
    b.setAttribute('aria-pressed', 'false');
    b.onclick = () => { b.classList.toggle('on'); b.setAttribute('aria-pressed', b.classList.contains('on')); hint(); };
    w.append(b);
} })();
function edit(h) {
    cur = h;
    $('hbDTitle').textContent = h ? 'تعديل العادة' : 'عادة جديدة';
    $('hbName').value = h ? h.name : '';
    $('hbRemind').value = h?.remind || '';
    pickIcon(h?.icon || '💧');
    document.querySelectorAll('#hbDays .dp').forEach(b => { const on = !!h && (h.days || []).includes(+b.dataset.d); b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); });
    hint();
    $('hbDel').hidden = !h;
    $('hbDialog').showModal();
    $('hbName').focus();
}
$('hbNew').onclick = () => edit(null);
$('hbClose').onclick = () => $('hbDialog').close();
$('hbForm').onsubmit = async (e) => {
    e.preventDefault();
    if (!user)
        return;
    const name = $('hbName').value.trim();
    if (!name)
        return;
    let days = selDays();
    if (days.length === 7)
        days = [];
    setLoading($('hbSave'), true);
    try {
        const remind = $('hbRemind').value || '';
        if (cur)
            await updateDoc(doc(db, 'users', user.uid, 'habits', cur.id), { name, icon, days, remind });
        else
            await addDoc(collection(db, 'users', user.uid, 'habits'), { name, icon, remind, color: PALETTE[habits.length % PALETTE.length], days, start: today(), done: [], paid: [], createdAt: serverTimestamp() });
        $('hbDialog').close();
        toast(cur ? 'تم حفظ العادة' : 'تمت إضافة العادة', 'success');
        remBanner();
    }
    catch (err) {
        toast(errMsg(err), 'error');
    }
    setLoading($('hbSave'), false);
};
$('hbDel').onclick = async () => {
    if (!cur || !user || !confirm(`حذف عادة «${cur.name}» وكل سجلها؟`))
        return;
    try {
        await deleteDoc(doc(db, 'users', user.uid, 'habits', cur.id));
        $('hbDialog').close();
        toast('تم حذف العادة', 'success');
    }
    catch (e) {
        toast(errMsg(e), 'error');
    }
};
function remBanner() {
    const p = permission(), need = habits.some(h => h.remind), box = $('hbRem');
    box.hidden = !need || p === 'granted';
    if (box.hidden)
        return;
    const T = { default: ['فعّل إشعارات التذكير 🔔', 'عشان يوصلك تنبيه في وقت كل عادة حتى لو بتتصفح تبويب تاني.'],
        denied: ['الإشعارات محظورة من المتصفح', 'التذكيرات هتظهر جوه التطبيق وهو مفتوح. لتفعيل الإشعارات اسمح بها من إعدادات الموقع في المتصفح.'],
        unsupported: ['المتصفح ده مش بيدعم الإشعارات', 'التذكيرات هتظهر جوه التطبيق وهو مفتوح.'] }[p];
    $('hbRemT').textContent = T[0];
    $('hbRemP').textContent = T[1];
    $('hbRemBtn').hidden = p !== 'default';
}
$('hbRemBtn').onclick = async () => { const r = await enable(); remBanner(); toast(r === 'granted' ? 'تم تفعيل الإشعارات ✅' : 'لم يتم السماح بالإشعارات', r === 'granted' ? 'success' : 'info'); };
render();
startShell({
    onUser: u => {
        user = u;
        onSnapshot(collection(db, 'users', u.uid, 'habits'), s => {
            habits = s.docs.map(d => ({ id: d.id, start: '0000-00-00', days: [], done: [], paid: [], ...d.data() })).sort((a, b) => (a.createdAt?.seconds ?? 1e12) - (b.createdAt?.seconds ?? 1e12));
            loaded = true;
            render();
            remBanner();
        }, e => { loaded = true; toast(errMsg(e), 'error'); render(); });
    },
    onTasks: () => { }
});

