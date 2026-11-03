// ملخص اليوم: إنجازاتك، ترحيل غير المكتمل، ومزاج وملاحظة اليوم
import { startShell, $, errMsg, isLate } from './shell.js';
import { db } from './firebase.js';
import { collection, doc, getDoc, setDoc, updateDoc, deleteDoc, onSnapshot, query, where, serverTimestamp } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js';
import { toast, setNum, setLoading } from './ui.js';
import { today, addDays, XP } from './logic.js';
import { effStreak } from './rewards.js';
let user = null, tasks = [], focusMin = 0, stats = null, mood = 0, loadedNote = false;
const T = today(), tmr = addDays(T, 1);
const doneToday = t => t.completed && (t.doneDay ? t.doneDay === T : t.dueDate === T);
const openList = () => tasks.filter(t => !t.completed && t.dueDate <= T);
function row(t, btn) {
    const d = document.createElement('div');
    d.className = 'wr-row';
    const s = document.createElement('span');
    s.textContent = t.title;
    d.append(s);
    const sm = document.createElement('small');
    sm.textContent = t.dueDate < T ? 'متأخرة' : (t.dueTime || '');
    d.append(sm);
    if (btn) {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'secondary';
        b.textContent = 'رحّل لبكرة';
        b.onclick = () => postpone([t], b);
        d.append(b);
    }
    const x = document.createElement('button');
    x.type = 'button';
    x.className = 'secondary';
    x.textContent = '🗑';
    x.setAttribute('aria-label', 'حذف');
    x.onclick = async () => { if (!confirm(`حذف «${t.title}» نهائيًا؟`))
        return; try {
        await deleteDoc(doc(db, 'users', user.uid, 'tasks', t.id));
        toast('تم حذف المهمة', 'success');
    }
    catch (e) {
        toast(errMsg(e), 'error');
    } };
    d.append(x);
    return d;
}
function render() {
    const done = tasks.filter(doneToday), open = openList(), dueToday = tasks.filter(t => t.dueDate === T);
    const total = dueToday.length, dn = dueToday.filter(t => t.completed).length, pct = total ? Math.round(dn / total * 100) : (done.length ? 100 : 0);
    $('wrRing').style.setProperty('--p', pct);
    setNum($('wrPct'), pct, '%');
    $('wrHead').textContent = !total && !done.length ? 'يوم هادي' : pct === 100 ? 'يوم مكتمل! 🎉' : pct >= 50 ? 'يوم كويس 👏' : 'لسه في وقت تلحق';
    $('wrSub').textContent = total ? `خلّصت ${dn} من ${total} مهام النهاردة.` : 'مفيش مهام مجدولة النهاردة.';
    const xp = done.reduce((a, t) => a + (XP[t.priority] || XP.medium), 0) + focusMin + (stats?.lastClearDay === T ? XP.clear : 0);
    setNum($('wrDone'), done.length);
    setNum($('wrFocus'), focusMin);
    setNum($('wrXp'), xp);
    setNum($('wrStreak'), stats ? effStreak(stats) : 0);
    $('wrDoneN').textContent = done.length ? `${done.length} مهمة` : '';
    const dl = $('wrDoneList');
    dl.replaceChildren();
    if (!done.length) {
        const p = document.createElement('p');
        p.className = 'muted';
        p.textContent = 'لسه ماخلصتش حاجة النهاردة.';
        dl.append(p);
    }
    done.forEach(t => dl.append(row(t)));
    const ol = $('wrOpenList');
    ol.replaceChildren();
    if (!open.length) {
        const p = document.createElement('p');
        p.className = 'muted';
        p.textContent = 'مفيش حاجة معلّقة. برافو! ✅';
        ol.append(p);
    }
    open.forEach(t => ol.append(row(t, true)));
    $('wrAll').hidden = open.length < 2;
}
async function postpone(list, btn) {
    btn && setLoading(btn, true);
    try {
        await Promise.all(list.map(t => updateDoc(doc(db, 'users', user.uid, 'tasks', t.id), { dueDate: tmr })));
        toast(list.length > 1 ? `اترحّلت ${list.length} مهام لبكرة` : 'اترحّلت المهمة لبكرة', 'success');
    }
    catch (e) {
        toast(errMsg(e), 'error');
        btn && setLoading(btn, false);
    }
}
$('wrAll').onclick = e => postpone(openList(), e.currentTarget);
document.querySelectorAll('#wrMoods button').forEach(b => b.onclick = () => { mood = mood === +b.dataset.v ? 0 : +b.dataset.v; paintMood(); });
function paintMood() { document.querySelectorAll('#wrMoods button').forEach(b => { const on = +b.dataset.v === mood; b.classList.toggle('on', on); b.setAttribute('aria-checked', on); }); }
$('wrSave').onclick = async (e) => {
    if (!user)
        return;
    setLoading(e.currentTarget, true);
    try {
        await setDoc(doc(db, 'users', user.uid, 'wraps', T), { mood, note: $('wrNote').value.trim().slice(0, 500), updatedAt: serverTimestamp() });
        $('wrSaved').textContent = 'تم الحفظ ✓';
        toast('اتحفظ ملخص يومك', 'success');
    }
    catch (err) {
        toast(errMsg(err), 'error');
    }
    setLoading(e.currentTarget, false);
};
render();
startShell({
    onUser: async (u) => {
        user = u;
        onSnapshot(query(collection(db, 'users', u.uid, 'focus'), where('day', '==', T)), s => { focusMin = s.docs.reduce((a, d) => a + (d.data().minutes || 0), 0); render(); }, e => toast(errMsg(e), 'error'));
        try {
            const s = await getDoc(doc(db, 'users', u.uid, 'wraps', T));
            if (s.exists() && !loadedNote) {
                mood = s.data().mood || 0;
                $('wrNote').value = s.data().note || '';
                paintMood();
                $('wrSaved').textContent = 'محفوظ سابقًا';
            }
            loadedNote = true;
        }
        catch (e) { }
    },
    onTasks: t => { tasks = t; render(); },
    onRewards: s => { stats = s; render(); }
});

