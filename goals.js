// الأهداف: شهرية/سنوية، مقسّمة لمراحل، والتقدّم بيتحسب من المهام المرتبطة
import { startShell, $, errMsg } from './shell.js';
import { db } from './firebase.js';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js';
import { toast, setLoading, setNum } from './ui.js';
import { setTaskCompleted, awardGoal } from './rewards.js';
import { today, milestonePct, goalProgress, goalEnd, goalStatus, daysBetween } from './logic.js';
const MON = new Intl.DateTimeFormat('ar-EG-u-nu-latn', { month: 'long', year: 'numeric' });
const ST = { done: ['محقق ✅', 'ok'], late: ['انتهت المدة', 'bad'], behind: ['متأخر عن الخطة', 'warn'], track: ['في المسار', 'ok'] };
let user = null, tasksLoaded = false, goals = [], tasks = [], by = {}, filter = 'all', open = new Set(), cur = null, icon = '🎯', loaded = false, deferred = false;
const inflight = new Set();
const mk = (t, c, x) => { const e = document.createElement(t); if (c)
    e.className = c; if (x != null)
    e.textContent = x; return e; };
const uid8 = () => (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36)).replace(/-/g, '').slice(0, 10);
const gref = g => doc(db, 'users', user.uid, 'goals', g.id);
const label = g => g.type === 'year' ? `سنة ${g.period}` : MON.format(new Date(+g.period.slice(0, 4), +g.period.slice(5, 7) - 1, 1, 12));
const clone = g => JSON.parse(JSON.stringify(g.milestones || []));
const info = g => { const p = goalProgress(g, by); return { p, s: goalStatus(g, p) }; };
const hasParts = g => (g.milestones || []).length > 0 || (g.taskIds || []).some(i => by[i]);
async function save(g, patch) { try {
    await updateDoc(gref(g), patch);
}
catch (e) {
    toast(errMsg(e), 'error');
} }
// يربط مهمة بمرحلة (m = معرّف المرحلة) أو بالهدف مباشرة (m=null)
async function link(g, m, taskId) {
    if (m) {
        const ms = clone(g), x = ms.find(k => k.id === m);
        if (!x)
            return;
        x.taskIds = [...new Set([...(x.taskIds || []), taskId])];
        await save(g, { milestones: ms });
    }
    else
        await save(g, { taskIds: [...new Set([...(g.taskIds || []), taskId])] });
}
async function unlink(g, m, taskId) {
    if (m) {
        const ms = clone(g), x = ms.find(k => k.id === m);
        if (!x)
            return;
        x.taskIds = (x.taskIds || []).filter(i => i !== taskId);
        await save(g, { milestones: ms });
    }
    else
        await save(g, { taskIds: (g.taskIds || []).filter(i => i !== taskId) });
}
async function newTask(g, m, title, input) {
    if (!title.trim() || !user)
        return;
    input.disabled = true;
    try {
        const r = await addDoc(collection(db, 'users', user.uid, 'tasks'), { title: title.trim().slice(0, 120), description: '', dueDate: today(), dueTime: '', priority: 'medium', category: 'شخصي', notes: '', completed: false, createdAt: serverTimestamp() });
        await link(g, m, r.id);
        input.value = '';
        toast('تمت إضافة المهمة وربطها', 'success');
    }
    catch (e) {
        toast(errMsg(e), 'error');
    }
    input.disabled = false;
}
/* ---------- مهام مرحلة / مهام مباشرة ---------- */
function taskBlock(g, m, ids) {
    const box = mk('div', 'gl-tasks');
    const used = new Set([...(g.taskIds || []), ...(g.milestones || []).flatMap(k => k.taskIds || [])]);
    for (const id of ids) {
        const t = by[id], r = mk('div', 'gl-t' + (t?.completed ? ' done' : ''));
        if (!t) {
            r.append(mk('span', 'muted', 'مهمة محذوفة'));
        }
        else {
            const c = mk('input');
            c.type = 'checkbox';
            c.checked = !!t.completed;
            c.setAttribute('aria-label', 'إنجاز ' + t.title);
            c.onchange = async () => { c.disabled = true; try {
                await setTaskCompleted(user.uid, t, c.checked);
            }
            catch (e) {
                toast(errMsg(e), 'error');
                c.checked = !c.checked;
            } c.disabled = false; };
            r.append(c, mk('span', 'gl-tt', t.title), mk('small', 'muted', t.dueDate === today() ? 'اليوم' : t.dueDate || ''));
        }
        const x = mk('button', 'gl-x', '✕');
        x.type = 'button';
        x.title = 'فك الربط';
        x.setAttribute('aria-label', 'فك ربط المهمة');
        x.onclick = () => unlink(g, m, id);
        r.append(x);
        box.append(r);
    }
    const add = mk('div', 'gl-add');
    const sel = mk('select', '');
    sel.setAttribute('aria-label', 'ربط مهمة موجودة');
    sel.append(new Option('🔗 ربط مهمة موجودة…', ''));
    tasks.filter(t => !t.completed && !used.has(t.id)).sort((a, b) => (a.dueDate || '').localeCompare(b.dueDate || '')).forEach(t => sel.append(new Option(t.title, t.id)));
    sel.onchange = () => { if (sel.value)
        link(g, m, sel.value); };
    const inp = mk('input');
    inp.placeholder = '+ مهمة جديدة (Enter)';
    inp.maxLength = 120;
    inp.setAttribute('aria-label', 'مهمة جديدة');
    inp.onkeydown = e => { if (e.key === 'Enter') {
        e.preventDefault();
        newTask(g, m, inp.value, inp);
    } };
    add.append(sel, inp);
    box.append(add);
    return box;
}
function msRow(g, m) {
    const p = milestonePct(m, by), linked = (m.taskIds || []).some(i => by[i]);
    const el = mk('div', 'gl-m' + (p === 100 ? ' done' : ''));
    const head = mk('div', 'gl-mh');
    if (linked)
        head.append(mk('span', 'gl-dot' + (p === 100 ? ' on' : ''), p === 100 ? '✓' : ''));
    else {
        const c = mk('input');
        c.type = 'checkbox';
        c.checked = !!m.done;
        c.setAttribute('aria-label', 'إنجاز المرحلة ' + m.title);
        c.onchange = () => { const ms = clone(g); ms.find(k => k.id === m.id).done = c.checked; save(g, { milestones: ms }); };
        head.append(c);
    }
    head.append(mk('b', '', m.title), mk('em', '', p + '%'));
    const rn = mk('button', 'gl-x', '✏️');
    rn.type = 'button';
    rn.title = 'إعادة تسمية';
    rn.setAttribute('aria-label', 'إعادة تسمية المرحلة');
    rn.onclick = () => { const v = prompt('اسم المرحلة', m.title); if (v && v.trim()) {
        const ms = clone(g);
        ms.find(k => k.id === m.id).title = v.trim().slice(0, 100);
        save(g, { milestones: ms });
    } };
    const dl = mk('button', 'gl-x', '🗑');
    dl.type = 'button';
    dl.title = 'حذف المرحلة';
    dl.setAttribute('aria-label', 'حذف المرحلة');
    dl.onclick = () => { if (confirm(`حذف المرحلة «${m.title}»؟ (المهام المرتبطة هتفضل موجودة)`))
        save(g, { milestones: clone(g).filter(k => k.id !== m.id) }); };
    head.append(rn, dl);
    const bar = mk('div', 'track gl-mb');
    bar.append(mk('div'));
    bar.firstChild.style.width = p + '%';
    el.append(head, bar, taskBlock(g, m.id, m.taskIds || []));
    return el;
}
/* ---------- كارت الهدف ---------- */
function card(g) {
    const { p, s } = info(g), isOpen = open.has(g.id), end = goalEnd(g), left = daysBetween(today(), end);
    const el = mk('article', 'gl-card' + (s === 'done' ? ' done' : '') + (isOpen ? ' open' : ''));
    const head = mk('button', 'gl-head');
    head.type = 'button';
    head.setAttribute('aria-expanded', isOpen);
    const ring = mk('div', 'gl-ring');
    ring.style.setProperty('--p', p);
    ring.append(mk('b', '', p + '%'));
    const t = mk('div', 'gl-title');
    t.append(mk('h3', '', `${g.icon || '🎯'} ${g.title}`));
    const meta = mk('div', 'gl-meta');
    const ms = g.milestones || [], done = ms.filter(m => milestonePct(m, by) === 100).length;
    meta.append(mk('span', 'chip', g.type === 'year' ? 'سنوي' : 'شهري'), mk('span', 'chip', label(g)), mk('span', 'chip gl-s ' + ST[s][1], ST[s][0]));
    if (ms.length)
        meta.append(mk('span', 'chip', `${done}/${ms.length} مراحل`));
    if (s !== 'done')
        meta.append(mk('span', 'muted gl-left', left >= 0 ? (left === 0 ? 'آخر يوم' : `باقي ${left} يوم`) : `انتهى من ${-left} يوم`));
    t.append(meta);
    const bar = mk('div', 'track');
    bar.append(mk('div'));
    bar.firstChild.style.width = p + '%';
    t.append(bar);
    head.append(ring, t, mk('span', 'gl-chev', '‹'));
    head.onclick = () => { isOpen ? open.delete(g.id) : open.add(g.id); render(); };
    el.append(head);
    if (isOpen) {
        const d = mk('div', 'gl-detail');
        if (g.description)
            d.append(mk('p', 'muted gl-desc', g.description));
        d.append(mk('h4', '', 'المراحل'));
        if (!ms.length)
            d.append(mk('p', 'muted', 'لسه مفيش مراحل — قسّم الهدف لخطوات واضحة.'));
        ms.forEach(m => d.append(msRow(g, m)));
        const af = mk('form', 'gl-addm'), ai = mk('input');
        ai.placeholder = '+ مرحلة جديدة';
        ai.maxLength = 100;
        ai.setAttribute('aria-label', 'مرحلة جديدة');
        const ab = mk('button', 'secondary', 'إضافة');
        ab.type = 'submit';
        af.append(ai, ab);
        af.onsubmit = e => { e.preventDefault(); const v = ai.value.trim(); if (!v)
            return; if (ms.length >= 20) {
            toast('الحد الأقصى 20 مرحلة', 'error');
            return;
        } save(g, { milestones: [...clone(g), { id: uid8(), title: v, done: false, taskIds: [] }] }); ai.value = ''; };
        d.append(af);
        d.append(mk('h4', '', 'مهام مرتبطة بالهدف مباشرة'));
        d.append(taskBlock(g, null, g.taskIds || []));
        const act = mk('div', 'gl-act'), ed = mk('button', 'secondary', '✏️ تعديل الهدف');
        ed.type = 'button';
        ed.onclick = () => edit(g);
        act.append(ed);
        d.append(act);
        el.append(d);
    }
    return el;
}
function stats() {
    const all = goals.map(g => ({ g, ...info(g) }));
    const doneN = all.filter(x => x.s === 'done').length, act = all.filter(x => x.s !== 'done' && x.s !== 'late');
    setNum($('glActive'), act.length);
    setNum($('glDone'), doneN);
    $('glAvg').textContent = (act.length ? Math.round(act.reduce((a, x) => a + x.p, 0) / act.length) : 0) + '%';
    setNum($('glMs'), goals.reduce((a, g) => a + (g.milestones || []).filter(m => milestonePct(m, by) === 100).length, 0));
}
function render() {
    const a = document.activeElement;
    if (a && a.closest && a.closest('#glList') && a.matches('input:not([type=checkbox])') && a.value) {
        deferred = true;
        return;
    }
    deferred = false;
    stats();
    const L = $('glList');
    L.replaceChildren();
    let list = goals.map(g => ({ g, ...info(g) }));
    list = list.filter(x => filter === 'all' || (filter === 'done' ? x.s === 'done' : x.g.type === filter));
    list.sort((a, b) => (a.s === 'done') - (b.s === 'done') || goalEnd(a.g).localeCompare(goalEnd(b.g)));
    if (loaded && !goals.length) {
        const e = mk('div', 'empty');
        e.append(mk('div', 'hb-empty-i', '🎯'), mk('h3', '', 'لسه مفيش أهداف'), mk('p', 'muted', 'حدّد هدف كبير (شهري أو سنوي)، قسّمه لمراحل، واربط مهامك بيه — والتقدّم هيتحسب لوحده.'));
        const b = mk('button', '', '+ أضف أول هدف');
        b.type = 'button';
        b.onclick = () => edit(null);
        e.append(b);
        L.append(e);
        return;
    }
    if (loaded && !list.length) {
        const e = mk('div', 'empty');
        e.append(mk('p', 'muted', 'مفيش أهداف في التصنيف ده.'));
        L.append(e);
        return;
    }
    list.forEach(x => L.append(card(x.g)));
}
document.addEventListener('focusout', () => setTimeout(() => { if (deferred)
    render(); }, 50));
document.querySelectorAll('#glFilter button').forEach(b => b.onclick = () => { filter = b.dataset.f; document.querySelectorAll('#glFilter button').forEach(x => x.classList.toggle('on', x === b)); render(); });
/* ---------- مكافأة تحقيق الهدف (مرة واحدة) ---------- */
function rewards() {
    if (!user || !loaded || !tasksLoaded)
        return;
    for (const g of goals) {
        if (g.rewarded || inflight.has(g.id) || !hasParts(g) || info(g).p < 100)
            continue;
        inflight.add(g.id);
        save(g, { rewarded: true }).then(() => awardGoal(user.uid, g.title)).finally(() => inflight.delete(g.id));
    }
}
/* ---------- إضافة / تعديل ---------- */
const nowY = new Date().getFullYear(), nowM = today().slice(0, 7);
function pickIcon(e) { icon = e; document.querySelectorAll('#glIcons .pk-e').forEach(b => b.classList.toggle('on', b.dataset.e === e)); }
document.querySelectorAll('#glIcons .pk-e').forEach(b => b.onclick = () => pickIcon(b.dataset.e));
const syncType = () => { const y = $('glType').value === 'year'; $('glPerM').hidden = y; $('glPerY').hidden = !y; };
$('glType').onchange = syncType;
function edit(g) {
    cur = g;
    $('glDTitle').textContent = g ? 'تعديل الهدف' : 'هدف جديد';
    $('glTitle').value = g?.title || '';
    $('glDesc').value = g?.description || '';
    $('glType').value = g?.type || 'month';
    $('glMonth').value = g?.type === 'month' ? g.period : nowM;
    $('glYear').value = g?.type === 'year' ? g.period : nowY;
    pickIcon(g?.icon || '🎯');
    $('glMsText').value = '';
    $('glMsWrap').hidden = !!g;
    $('glDel').hidden = !g;
    syncType();
    $('glDialog').showModal();
    $('glTitle').focus();
}
$('glNew').onclick = () => edit(null);
$('glClose').onclick = () => $('glDialog').close();
$('glForm').onsubmit = async (e) => {
    e.preventDefault();
    if (!user)
        return;
    const type = $('glType').value, period = type === 'year' ? String($('glYear').value) : $('glMonth').value;
    if (!period || (type === 'year' && !/^\d{4}$/.test(period))) {
        toast('اختر الفترة', 'error');
        return;
    }
    const base = { title: $('glTitle').value.trim(), description: $('glDesc').value.trim(), type, period, icon };
    if (!base.title)
        return;
    setLoading($('glSave'), true);
    try {
        if (cur)
            await updateDoc(gref(cur), base);
        else {
            const milestones = $('glMsText').value.split('\n').map(x => x.trim()).filter(Boolean).slice(0, 20).map(title => ({ id: uid8(), title: title.slice(0, 100), done: false, taskIds: [] }));
            const r = await addDoc(collection(db, 'users', user.uid, 'goals'), { ...base, milestones, taskIds: [], rewarded: false, createdAt: serverTimestamp() });
            open.add(r.id);
            render();
        }
        $('glDialog').close();
        toast('تم حفظ الهدف', 'success');
    }
    catch (err) {
        toast(errMsg(err), 'error');
    }
    setLoading($('glSave'), false);
};
$('glDel').onclick = async () => {
    if (!cur || !user || !confirm(`حذف الهدف «${cur.title}» ومراحله؟ (المهام هتفضل موجودة)`))
        return;
    try {
        await deleteDoc(gref(cur));
        open.delete(cur.id);
        $('glDialog').close();
        toast('تم حذف الهدف', 'success');
    }
    catch (e) {
        toast(errMsg(e), 'error');
    }
};
render();
startShell({
    onUser: u => {
        user = u;
        onSnapshot(collection(db, 'users', u.uid, 'goals'), s => {
            goals = s.docs.map(d => ({ id: d.id, milestones: [], taskIds: [], ...d.data() }));
            loaded = true;
            render();
            rewards();
        }, e => { loaded = true; toast(errMsg(e), 'error'); render(); });
    },
    onTasks: t => { tasks = t; tasksLoaded = true; by = Object.fromEntries(t.map(x => [x.id, x])); render(); rewards(); }
});

