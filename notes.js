// الملاحظات: تصنيفات + تثبيت + بحث + ربط بمهمة
import { startShell, $, errMsg } from './shell.js';
import { db } from './firebase.js';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js';
import { toast, setLoading } from './ui.js';
const CATS = ['عام', 'شغل', 'دراسة', 'أفكار', 'شخصي', 'مهم'];
const DT = new Intl.DateTimeFormat('ar-EG-u-nu-latn', { day: 'numeric', month: 'short' });
let user = null, notes = [], tasks = [], cat = 'all', q = '', cur = null, loaded = false;
const mk = (t, c, x) => { const e = document.createElement(t); if (c)
    e.className = c; if (x != null)
    e.textContent = x; return e; };
const ci = c => Math.max(0, CATS.indexOf(c));
const ms = n => (n.updatedAt?.seconds ?? n.createdAt?.seconds ?? Date.now() / 1000) * 1000;
const norm = s => String(s || '').toLowerCase().replace(/[ً-ْـ]/g, '').replace(/[إأآ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه');
const taskOf = n => n.taskId ? tasks.find(t => t.id === n.taskId) : null;
// تظليل نتيجة البحث بدون innerHTML
function hl(el, text) {
    const n = norm(q.trim());
    if (!n) {
        el.textContent = text;
        return;
    }
    const nt = norm(text);
    let i = 0, p = 0;
    el.textContent = '';
    if (nt.length !== text.length) {
        el.textContent = text;
        return;
    }
    while ((i = nt.indexOf(n, p)) >= 0) {
        el.append(document.createTextNode(text.slice(p, i)));
        el.append(mk('mark', '', text.slice(i, i + n.length)));
        p = i + n.length;
    }
    el.append(document.createTextNode(text.slice(p)));
}
const match = n => !q.trim() || norm(n.title + ' ' + n.body + ' ' + (taskOf(n)?.title || '')).includes(norm(q.trim()));
function card(n) {
    const el = mk('article', `nt-card k${ci(n.category)}` + (n.pinned ? ' pin' : ''));
    el.tabIndex = 0;
    el.setAttribute('role', 'button');
    const top = mk('div', 'nt-top');
    if (n.title) {
        const h = mk('h3');
        hl(h, n.title);
        top.append(h);
    }
    const pin = mk('button', 'nt-pinb' + (n.pinned ? ' on' : ''), '📌');
    pin.type = 'button';
    pin.title = n.pinned ? 'إلغاء التثبيت' : 'تثبيت';
    pin.setAttribute('aria-label', pin.title);
    pin.setAttribute('aria-pressed', !!n.pinned);
    pin.onclick = e => { e.stopPropagation(); togglePin(n); };
    top.append(pin);
    el.append(top);
    if (n.body) {
        const p = mk('p', 'nt-body');
        hl(p, n.body);
        el.append(p);
    }
    const f = mk('div', 'nt-foot');
    f.append(mk('span', 'nt-cat', n.category || 'عام'));
    const t = taskOf(n);
    if (n.taskId) {
        const a = mk('span', 'nt-task' + (t?.completed ? ' done' : ''), (t ? (t.completed ? '✅ ' : '🔗 ') + t.title : '🔗 مهمة محذوفة'));
        a.title = 'مهمة مرتبطة';
        f.append(a);
    }
    f.append(mk('time', '', DT.format(new Date(ms(n)))));
    el.append(f);
    el.onclick = () => edit(n);
    el.onkeydown = e => { if (e.key === 'Enter' && e.target === el)
        edit(n); };
    return el;
}
function cats() {
    const box = $('ntCats');
    box.replaceChildren();
    const cnt = {};
    notes.forEach(n => cnt[n.category || 'عام'] = (cnt[n.category || 'عام'] || 0) + 1);
    const add = (k, label, c) => { const b = mk('button', 'nt-chip' + (cat === k ? ' on' : '') + (k !== 'all' ? ` k${ci(k)}` : '')); b.type = 'button'; b.append(document.createTextNode(label), mk('em', '', c)); b.setAttribute('aria-pressed', cat === k); b.onclick = () => { cat = k; render(); }; box.append(b); };
    add('all', 'الكل', notes.length);
    CATS.forEach(c => add(c, c, cnt[c] || 0));
}
function render() {
    cats();
    const body = $('ntBody');
    body.replaceChildren();
    if (loaded && !notes.length) {
        const e = mk('div', 'empty');
        e.append(mk('div', 'hb-empty-i', '📝'), mk('h3', '', 'مفيش ملاحظات لسه'), mk('p', 'muted', 'اكتب أول ملاحظة من الخانة اللي فوق، أو اضغط «ملاحظة جديدة».'));
        body.append(e);
        return;
    }
    const list = notes.filter(n => (cat === 'all' || (n.category || 'عام') === cat) && match(n)).sort((a, b) => ms(b) - ms(a));
    if (!list.length) {
        const e = mk('div', 'empty');
        e.append(mk('div', 'hb-empty-i', '🔍'), mk('h3', '', 'مفيش نتائج'), mk('p', 'muted', 'جرّب كلمة تانية أو غيّر التصنيف.'));
        body.append(e);
        return;
    }
    const pinned = list.filter(n => n.pinned), rest = list.filter(n => !n.pinned);
    const sec = (title, arr) => { if (!arr.length)
        return; if (title)
        body.append(mk('h2', 'nt-sec', title)); const g = mk('div', 'nt-grid'); arr.forEach(n => g.append(card(n))); body.append(g); };
    sec(pinned.length && rest.length ? '📌 المثبّتة' : '', pinned);
    sec(pinned.length && rest.length ? 'الباقي' : '', rest);
}
/* ---------- كتابة ---------- */
async function togglePin(n) {
    try {
        await updateDoc(doc(db, 'users', user.uid, 'notes', n.id), { pinned: !n.pinned });
    }
    catch (e) {
        toast(errMsg(e), 'error');
    }
}
$('ntQuick').onsubmit = async (e) => {
    e.preventDefault();
    const v = $('ntQ').value.trim();
    if (!v || !user)
        return;
    setLoading($('ntQSave'), true);
    try {
        await addDoc(collection(db, 'users', user.uid, 'notes'), { title: v.length <= 60 ? v : '', body: v.length <= 60 ? '' : v, category: cat === 'all' ? 'عام' : cat, pinned: false, taskId: '', createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
        $('ntQ').value = '';
        toast('تم حفظ الملاحظة', 'success');
    }
    catch (err) {
        toast(errMsg(err), 'error');
    }
    setLoading($('ntQSave'), false);
    $('ntQ').focus();
};
let st;
$('ntSearch').oninput = e => { clearTimeout(st); st = setTimeout(() => { q = e.target.value; render(); }, 120); };
function taskOptions(sel) {
    const s = $('ntTask');
    s.replaceChildren();
    s.append(new Option('بدون ربط', ''));
    const open = tasks.filter(t => !t.completed || t.id === sel).sort((a, b) => (a.dueDate || '').localeCompare(b.dueDate || ''));
    open.forEach(t => s.append(new Option(t.title + (t.dueDate ? ` — ${t.dueDate}` : ''), t.id)));
    if (sel && !tasks.some(t => t.id === sel))
        s.append(new Option('مهمة محذوفة', sel));
    s.value = sel || '';
}
function edit(n) {
    cur = n;
    $('ntDTitle').textContent = n ? 'تعديل الملاحظة' : 'ملاحظة جديدة';
    $('ntTitle').value = n?.title || '';
    $('ntText').value = n?.body || '';
    const c = $('ntCat');
    if (!c.options.length)
        CATS.forEach(x => c.append(new Option(x, x)));
    c.value = n?.category || (cat === 'all' ? 'عام' : cat);
    taskOptions(n?.taskId || '');
    $('ntPin').checked = !!n?.pinned;
    $('ntDel').hidden = !n;
    $('ntDialog').showModal();
    (n ? $('ntText') : $('ntTitle')).focus();
}
$('ntNew').onclick = () => edit(null);
$('ntClose').onclick = () => $('ntDialog').close();
$('ntForm').onsubmit = async (e) => {
    e.preventDefault();
    if (!user)
        return;
    const title = $('ntTitle').value.trim(), body = $('ntText').value.trim();
    if (!title && !body) {
        toast('اكتب عنوانًا أو محتوى', 'error');
        return;
    }
    const data = { title, body, category: $('ntCat').value, pinned: $('ntPin').checked, taskId: $('ntTask').value, updatedAt: serverTimestamp() };
    setLoading($('ntSave'), true);
    try {
        if (cur)
            await updateDoc(doc(db, 'users', user.uid, 'notes', cur.id), data);
        else
            await addDoc(collection(db, 'users', user.uid, 'notes'), { ...data, createdAt: serverTimestamp() });
        $('ntDialog').close();
        toast('تم حفظ الملاحظة', 'success');
    }
    catch (err) {
        toast(errMsg(err), 'error');
    }
    setLoading($('ntSave'), false);
};
$('ntDel').onclick = async () => {
    if (!cur || !user || !confirm('حذف الملاحظة نهائيًا؟'))
        return;
    try {
        await deleteDoc(doc(db, 'users', user.uid, 'notes', cur.id));
        $('ntDialog').close();
        toast('تم حذف الملاحظة', 'success');
    }
    catch (e) {
        toast(errMsg(e), 'error');
    }
};
render();
startShell({
    onUser: u => {
        user = u;
        onSnapshot(collection(db, 'users', u.uid, 'notes'), s => {
            notes = s.docs.map(d => ({ id: d.id, title: '', body: '', category: 'عام', pinned: false, taskId: '', ...d.data() }));
            loaded = true;
            render();
        }, e => { loaded = true; toast(errMsg(e), 'error'); render(); });
    },
    onTasks: t => { tasks = t; render(); }
});

