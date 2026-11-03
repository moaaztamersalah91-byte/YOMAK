import { auth, db } from './firebase.js';
import { onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js';
import { toast, setLoading, showSkeleton, hideSkeleton, emptyState, setNum, burst, shake } from './ui.js';
import { setTaskCompleted, mountXpChip, awardClear } from './rewards.js';
import { getFirestore, collection, addDoc, doc, updateDoc, deleteDoc, onSnapshot, query, orderBy, serverTimestamp } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js';
const $ = id => document.getElementById(id);
const fmtDate = d => { const t = new Date(), x = new Date(d + 'T00:00'); t.setHours(0, 0, 0, 0); const n = Math.round((x - t) / 864e5); return n === 0 ? 'اليوم' : n === 1 ? 'غدًا' : n === -1 ? 'أمس' : new Intl.DateTimeFormat('ar-EG-u-nu-latn', { weekday: 'short', day: 'numeric', month: 'short' }).format(x); };
const fmtTime = s => { const [h, m] = (s || '').split(':').map(Number); return isNaN(h) ? s : `${(h % 12) || 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'ص' : 'م'}`; };
let user = null, unsubscribe = null, tasks = [], view = document.body.dataset.page || 'dashboard', editing = null, mode = 'login';
const today = () => { let d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const stamp = t => t.dueDate + (t.dueTime ? 'T' + t.dueTime : 'T23:59:59');
const late = t => !t.completed && new Date(stamp(t)).getTime() < Date.now();
const upcoming = t => !t.completed && t.dueDate > today();
const error = e => ({ 'auth/invalid-credential': 'البريد الإلكتروني أو كلمة المرور غير صحيحة', 'auth/email-already-in-use': 'البريد الإلكتروني مستخدم بالفعل', 'auth/weak-password': 'كلمة المرور ضعيفة', 'auth/popup-closed-by-user': 'تم إغلاق نافذة Google', 'auth/unauthorized-domain': 'أضف نطاق الموقع إلى Authorized domains في Firebase', 'permission-denied': 'تحقق من قواعد أمان Firestore' })[e.code] || e.message || 'حدث خطأ غير متوقع';
$('logout').onclick = async (e) => { setLoading(e.currentTarget, true); try {
    await signOut(auth);
}
catch (err) {
    setLoading(e.currentTarget, false);
    toast(error(err), 'error');
} };
let loaded = false, loadFailed = false, prevPct = null;
const seen = new Set(), justDone = new Set(), sleep = ms => new Promise(r => setTimeout(r, ms));
document.querySelector('main').classList.add('is-loading-data');
showSkeleton($('taskList'));
onAuthStateChanged(auth, u => { if (unsubscribe) {
    unsubscribe();
    unsubscribe = null;
} user = u; tasks = []; if (!u) {
    location.replace('login.html');
    return;
} $('userEmail').textContent = u.email || 'حساب Google'; mountXpChip(u.uid); $('settingsEmail').textContent = u.email || 'حساب Google'; unsubscribe = onSnapshot(query(collection(db, 'users', u.uid, 'tasks'), orderBy('createdAt', 'desc')), snap => { loadFailed = false; tasks = snap.docs.map(d => ({ id: d.id, ...d.data() })); loaded = true; render(); }, e => { loaded = true; loadFailed = true; toast(error(e), 'error'); render(); }); });
$('dateLabel').textContent = new Intl.DateTimeFormat('ar-EG-u-nu-latn', { dateStyle: 'full' }).format(new Date());
const labels = { dashboard: 'نظرة عامة', today: 'مهام اليوم', all: 'كل المهام', upcoming: 'المهام القادمة', completed: 'المهام المكتملة', late: 'المهام المتأخرة', stats: 'الإحصائيات', settings: 'الإعدادات' };
$('heading').textContent = labels[view];
document.querySelectorAll('[data-page]').forEach(a => { a.classList.toggle('active', a.dataset.page === view); if (a.dataset.page === view)
    a.setAttribute('aria-current', 'page'); });
$('statsSection').hidden = !['dashboard', 'stats'].includes(view);
$('progressSection').hidden = !['dashboard', 'stats'].includes(view);
$('listSection').hidden = ['stats', 'settings'].includes(view);
$('settingsSection').hidden = view !== 'settings';
$('settingsLogout').onclick = async (e) => { setLoading(e.currentTarget, true); try {
    await signOut(auth);
}
catch (err) {
    setLoading(e.currentTarget, false);
    toast(error(err), 'error');
} };
$('search').oninput = render;
$('status').onchange = render;
$('sort').onchange = render;
function render() { if (!loaded)
    return; document.querySelector('main').classList.remove('is-loading-data'); window.YomakLoader?.hide(); hideSkeleton($('taskList')); let t = today(), day = tasks.filter(x => x.dueDate === t), done = day.filter(x => x.completed).length; setNum($('sToday'), day.length); setNum($('sDone'), tasks.filter(x => x.completed).length); setNum($('sUpcoming'), tasks.filter(upcoming).length); setNum($('sLate'), tasks.filter(late).length); let pct = day.length ? Math.round(done / day.length * 100) : 0; setNum($('progressText'), pct, '%'); if (prevPct !== null && pct === 100 && prevPct < 100 && day.length) {
    const r = $('progressText').getBoundingClientRect();
    burst(r.left + r.width / 2, r.top + r.height / 2, true);
    $('progressText').parentElement.classList.remove('celebrate');
    void $('progressText').offsetWidth;
    $('progressText').parentElement.classList.add('celebrate');
    toast('يوم ممتاز! خلّصت كل مهام النهاردة 🎉', 'success');
    if (day.length >= 3)
        awardClear(user.uid);
} prevPct = pct; $('progressBar').style.width = pct + '%'; $('progressSection').style.setProperty('--p', pct); $('progressSub').textContent = day.length ? `${done} من ${day.length} مهام اليوم` : 'لا توجد مهام اليوم'; setNum($('nToday'), day.length); $('nToday').hidden = !day.length; let nl = tasks.filter(late).length; setNum($('nLate'), nl); $('nLate').hidden = !nl; let list = tasks.filter(x => view === 'today' ? x.dueDate === t : view === 'upcoming' ? upcoming(x) : view === 'completed' ? x.completed : view === 'late' ? late(x) : true).filter(x => $('status').value === 'all' || ($('status').value === 'done' ? x.completed : !x.completed)).filter(x => (x.title + ' ' + (x.description || '') + ' ' + (x.notes || '')).toLowerCase().includes($('search').value.trim().toLowerCase())); let priority = { high: 0, medium: 1, low: 2 }; list.sort((a, b) => $('sort').value === 'priority' ? priority[a.priority] - priority[b.priority] : $('sort').value === 'created' ? (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0) : stamp(a).localeCompare(stamp(b))); $('taskList').replaceChildren(); if (!list.length) {
    const filtered = $('search').value.trim() || $('status').value !== 'all';
    emptyState($('taskList'), loadFailed ? 'error' : filtered && tasks.length ? 'search' : view, loadFailed ? () => location.reload() : filtered && tasks.length ? () => { $('search').value = ''; $('status').value = 'all'; render(); } : () => openTask());
} let idx = 0; for (let x of list) {
    let item = document.createElement('div');
    item.className = 'task' + (x.completed ? ' done' : '') + ' p-' + (x.priority || 'low');
    if (!seen.has(x.id)) {
        item.classList.add('enter');
        item.style.setProperty('--i', Math.min(idx, 8));
    }
    idx++;
    seen.add(x.id);
    if (justDone.has(x.id)) {
        item.classList.add('just-done');
        justDone.delete(x.id);
    }
    let cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.checked = !!x.completed;
    cb.setAttribute('aria-label', 'تحديد المهمة كمكتملة');
    cb.onchange = async () => { if (cb.checked) {
        justDone.add(x.id);
        const r = cb.getBoundingClientRect();
        burst(r.left + r.width / 2, r.top + r.height / 2);
    } cb.disabled = true; item.classList.add('saving'); try {
        const rw = await setTaskCompleted(user.uid, x, cb.checked);
        if (!rw)
            toast(cb.checked ? 'أحسنت! تم إنجاز المهمة' : 'تمت إعادة المهمة إلى غير المكتملة', 'success');
    }
    catch (e) {
        justDone.delete(x.id);
        cb.checked = !cb.checked;
        toast(error(e), 'error');
    }
    finally {
        cb.disabled = false;
        item.classList.remove('saving');
    } };
    let body = document.createElement('div');
    body.className = 'task-content';
    let h = document.createElement('h3');
    h.textContent = x.title;
    body.append(h);
    if (x.description) {
        let p = document.createElement('p');
        p.textContent = x.description;
        body.append(p);
    }
    let chips = document.createElement('div');
    chips.className = 'chips';
    for (let [s, c] of [[x.category, ''], [fmtDate(x.dueDate) + (x.dueTime ? ' • ' + fmtTime(x.dueTime) : ''), 'when'], [{ high: 'عالية', medium: 'متوسطة', low: 'منخفضة' }[x.priority], x.priority], [late(x) ? 'متأخرة' : '', late(x) ? 'late' : '']])
        if (s) {
            let tag = document.createElement('span');
            tag.className = 'chip ' + c;
            tag.textContent = s;
            chips.append(tag);
        }
    body.append(chips);
    if (x.notes) {
        let p = document.createElement('p');
        p.textContent = 'ملاحظات: ' + x.notes;
        body.append(p);
    }
    let actions = document.createElement('div');
    actions.className = 'actions';
    let edit = document.createElement('button');
    edit.className = 'secondary';
    edit.textContent = 'تعديل';
    edit.onclick = () => openTask(x);
    let del = document.createElement('button');
    del.className = 'danger';
    del.textContent = 'حذف';
    del.onclick = async () => { if (!confirm('هل تريد حذف هذه المهمة نهائيًا؟'))
        return; setLoading(del, true); item.classList.add('removing'); try {
        await sleep(240);
        await deleteDoc(doc(db, 'users', user.uid, 'tasks', x.id));
        toast('تم حذف المهمة', 'success');
    }
    catch (e) {
        item.classList.remove('removing');
        setLoading(del, false);
        toast(error(e), 'error');
    } };
    actions.append(edit, del);
    item.append(cb, body, actions);
    $('taskList').append(item);
} }
function openTask(x = null) { editing = x?.id || null; $('dialogTitle').textContent = x ? 'تعديل المهمة' : 'مهمة جديدة'; $('taskForm').reset(); $('title').value = x?.title || ''; $('description').value = x?.description || ''; $('dueDate').value = x?.dueDate || today(); $('dueTime').value = x?.dueTime || ''; $('priority').value = x?.priority || 'medium'; $('category').value = x?.category || 'شخصي'; $('notes').value = x?.notes || ''; $('taskDialog').showModal(); }
$('newTask').onclick = () => openTask();
$('closeDialog').onclick = $('cancel').onclick = () => $('taskDialog').close();
$('taskForm').onsubmit = async (e) => { e.preventDefault(); if (!user)
    return; let data = { title: $('title').value.trim(), description: $('description').value.trim(), dueDate: $('dueDate').value, dueTime: $('dueTime').value, priority: $('priority').value, category: $('category').value, notes: $('notes').value.trim() }; if (!data.title || !data.dueDate)
    return; setLoading($('save'), true); try {
    if (editing)
        await updateDoc(doc(db, 'users', user.uid, 'tasks', editing), data);
    else
        await addDoc(collection(db, 'users', user.uid, 'tasks'), { ...data, completed: false, createdAt: serverTimestamp() });
    $('taskDialog').close();
    toast(editing ? 'تم تحديث المهمة' : 'تمت إضافة المهمة', 'success');
}
catch (e) {
    shake($('taskForm'));
    toast(error(e), 'error');
}
finally {
    setLoading($('save'), false);
} };
document.querySelector('#nav a.active')?.scrollIntoView({ inline: 'center', block: 'nearest' });

