// لوحة YOMAK: كانبان (قيد الانتظار / جاري العمل / تم) بسحب وإفلات
import { startShell, $, errMsg } from './shell.js';
import { db } from './firebase.js';
import { collection, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js';
import { toast, burst, setLoading } from './ui.js';
import { setTaskCompleted } from './rewards.js';
import { today } from './logic.js';
const COLS = [['todo', 'قيد الانتظار'], ['doing', 'جاري العمل'], ['done', 'تم']];
const PR = { high: 'عالية', medium: 'متوسطة', low: 'منخفضة' }, PO = { high: 0, medium: 1, low: 2 };
let user = null, tasks = [], drag = '';
const colOf = t => t.completed ? 'done' : t.board === 'doing' ? 'doing' : 'todo';
const cmp = (a, b) => (PO[a.priority] ?? 1) - (PO[b.priority] ?? 1) || (a.dueDate + (a.dueTime || '')).localeCompare(b.dueDate + (b.dueTime || ''));
function card(t, c) {
    const el = document.createElement('article');
    el.className = 'bd-card p-' + (t.priority || 'medium') + (t.completed ? ' done' : '');
    el.draggable = true;
    el.dataset.id = t.id;
    const late = !t.completed && t.dueDate < today();
    el.innerHTML = '<b class="bd-t"></b><div class="bd-m"></div><div class="bd-a"></div>';
    el.querySelector('.bd-t').textContent = t.title;
    const m = el.querySelector('.bd-m');
    [PR[t.priority] || 'متوسطة', t.dueDate === today() ? 'اليوم' : t.dueDate, t.category, t.focusMin ? `⏱ ${t.focusMin} د` : ''].filter(Boolean).forEach((x, i) => { const s = document.createElement('span'); s.textContent = x; if (i === 1 && late)
        s.className = 'late'; m.append(s); });
    const a = el.querySelector('.bd-a'), i = COLS.findIndex(x => x[0] === c);
    const mk = (txt, label, fn) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'secondary'; b.textContent = txt; b.setAttribute('aria-label', label); b.onclick = fn; a.append(b); };
    mk('✏️', 'تعديل', () => edit(t));
    mk('🗑', 'حذف', () => del(t));
    if (i > 0)
        mk('▶', 'نقل إلى ' + COLS[i - 1][1], () => move(t, COLS[i - 1][0]));
    if (c !== 'done')
        mk('🎯', 'ابدأ تركيز', () => location.href = 'focus.html?task=' + t.id);
    if (i < 2)
        mk('◀', 'نقل إلى ' + COLS[i + 1][1], () => move(t, COLS[i + 1][0]));
    el.ondragstart = e => { drag = t.id; el.classList.add('drag'); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', t.id); };
    el.ondragend = () => { drag = ''; el.classList.remove('drag'); document.querySelectorAll('.bd-col.over').forEach(x => x.classList.remove('over')); };
    return el;
}
function render() {
    const box = $('bdCols');
    box.replaceChildren();
    for (const [k, name] of COLS) {
        let list = tasks.filter(t => colOf(t) === k);
        if (k === 'done')
            list = list.sort((a, b) => (b.doneDay || b.dueDate).localeCompare(a.doneDay || a.dueDate)).slice(0, 30);
        else
            list.sort(cmp);
        const col = document.createElement('section');
        col.className = 'bd-col bd-' + k;
        col.dataset.k = k;
        col.innerHTML = '<h2><span></span><em></em></h2><div class="bd-list"></div>';
        col.querySelector('span').textContent = name;
        col.querySelector('em').textContent = list.length;
        const L = col.querySelector('.bd-list');
        if (!list.length) {
            const p = document.createElement('p');
            p.className = 'bd-empty muted';
            p.textContent = k === 'done' ? 'أول ما تنجز مهمة هتظهر هنا' : 'اسحب مهمة هنا';
            L.append(p);
        }
        list.forEach(t => L.append(card(t, k)));
        col.ondragover = e => { e.preventDefault(); col.classList.add('over'); };
        col.ondragleave = e => { if (!col.contains(e.relatedTarget))
            col.classList.remove('over'); };
        col.ondrop = e => { e.preventDefault(); col.classList.remove('over'); const t = tasks.find(x => x.id === (drag || e.dataTransfer.getData('text/plain'))); if (t)
            move(t, k, e.clientX, e.clientY); };
        box.append(col);
    }
}
async function move(t, to, x, y) {
    if (colOf(t) === to || !user)
        return;
    try {
        if (to === 'done') {
            burst(x ?? innerWidth / 2, y ?? innerHeight / 2, false);
            await setTaskCompleted(user.uid, t, true);
        }
        else if (t.completed)
            await setTaskCompleted(user.uid, t, false, { board: to });
        else
            await updateDoc(doc(db, 'users', user.uid, 'tasks', t.id), { board: to });
    }
    catch (e) {
        toast(errMsg(e), 'error');
    }
}
$('bdAdd').onsubmit = async (e) => {
    e.preventDefault();
    const title = $('bdTitle').value.trim();
    if (!title || !user)
        return;
    setLoading($('bdSave'), true);
    try {
        await addDoc(collection(db, 'users', user.uid, 'tasks'), { title, description: '', dueDate: today(), dueTime: '', priority: 'medium', category: 'شخصي', notes: '', completed: false, createdAt: serverTimestamp() });
        $('bdTitle').value = '';
        toast('تمت إضافة المهمة', 'success');
    }
    catch (err) {
        toast(errMsg(err), 'error');
    }
    setLoading($('bdSave'), false);
};
async function del(t) {
    if (!user || !confirm(`حذف «${t.title}» نهائيًا؟`))
        return;
    try {
        await deleteDoc(doc(db, 'users', user.uid, 'tasks', t.id));
        $('bdDialog').open && $('bdDialog').close();
        toast('تم حذف المهمة', 'success');
    }
    catch (e) {
        toast(errMsg(e), 'error');
    }
}
let cur = null;
function edit(t) {
    cur = t;
    $('eTitle').value = t.title || '';
    $('eDesc').value = t.description || '';
    $('eDate').value = t.dueDate || today();
    $('eTime').value = t.dueTime || '';
    $('ePri').value = t.priority || 'medium';
    $('eCat').value = t.category || 'شخصي';
    $('bdDialog').showModal();
}
$('bdClose').onclick = () => $('bdDialog').close();
$('eDel').onclick = () => cur && del(cur);
$('bdForm').onsubmit = async (e) => {
    e.preventDefault();
    if (!cur || !user)
        return;
    setLoading($('eSave'), true);
    try {
        await updateDoc(doc(db, 'users', user.uid, 'tasks', cur.id), { title: $('eTitle').value.trim(), description: $('eDesc').value.trim(), dueDate: $('eDate').value, dueTime: $('eTime').value, priority: $('ePri').value, category: $('eCat').value });
        $('bdDialog').close();
        toast('تم حفظ التعديلات', 'success');
    }
    catch (err) {
        toast(errMsg(err), 'error');
    }
    setLoading($('eSave'), false);
};
render();
startShell({ onUser: u => { user = u; }, onTasks: t => { tasks = t; render(); } });

