// YOMAK My Day Planner — جدول يومي بالساعات: سحب وإفلات، تغيير الحجم، ترتيب تلقائي
import { startShell, $, errMsg } from './shell.js';
import { db } from './firebase.js';
import { collection, doc, addDoc, updateDoc, deleteField, writeBatch, serverTimestamp } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js';
import { toast, setLoading, emptyState, shake } from './ui.js';
import { setTaskCompleted } from './rewards.js';
import { today, addDays, toMin, fromMin, fmt12, snap, ceil15, layoutLanes, findSlot } from './logic.js';
const START = 6 * 60, END = 24 * 60, PPM = 1.1, MINH = 26;
const DUR = { high: 60, medium: 45, low: 30 };
let user = null, tasks = [], date = today(), loaded = false, needScroll = true, justDragged = false;
const hrLabel = h => `${(h % 12) || 12} ${h < 12 || h === 24 ? 'ص' : 'م'}`;
const isPlanned = (x, d = date) => x.planStart && x.dueDate === d && toMin(x.planStart) != null;
const prio = { high: 0, medium: 1, low: 2 };
const DURS = [15, 30, 45, 60, 75, 90, 105, 120, 135, 150, 165, 180, 240, 300, 360, 480];
const nearestDur = d => DURS.reduce((a, b) => Math.abs(b - d) < Math.abs(a - d) ? b : a);
/* ---------- الشبكة الزمنية ---------- */
(function buildGrid() {
    const g = $('tlGrid');
    $('tl').style.height = (END - START) * PPM + 'px';
    for (let h = START / 60; h <= END / 60; h++) {
        const y = (h * 60 - START) * PPM;
        const l = document.createElement('div');
        l.className = 'tl-line';
        l.style.top = y + 'px';
        const s = document.createElement('span');
        s.className = 'tl-lbl';
        s.style.top = y + 'px';
        s.textContent = hrLabel(h);
        g.append(l, s);
    }
})();
const yToMin = clientY => { const r = $('tlBlocks').getBoundingClientRect(); return Math.min(END - 15, Math.max(START, START + snap((clientY - r.top) / PPM))); };
/* ---------- العرض ---------- */
function unscheduled() {
    const t = today();
    return tasks.filter(x => !x.completed && !isPlanned(x) && (x.dueDate === date || (date === t && x.dueDate < t)))
        .sort((a, b) => prio[a.priority] - prio[b.priority] || (a.dueTime || '99').localeCompare(b.dueTime || '99'));
}
function render() {
    if (!loaded)
        return;
    const t = today(), rel = date === t ? 'اليوم' : date === addDays(t, 1) ? 'غدًا' : date === addDays(t, -1) ? 'أمس' : '';
    $('pDate').textContent = (rel ? rel + ' — ' : '') + new Intl.DateTimeFormat('ar-EG-u-nu-latn', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(date + 'T00:00'));
    const planned = tasks.filter(x => isPlanned(x)), un = unscheduled();
    renderList(un, planned.length);
    renderBlocks(planned);
    renderSummary(planned, un);
    updateNow();
    if (needScroll) {
        needScroll = false;
        const nowM = new Date().getHours() * 60 + new Date().getMinutes();
        const at = date === t ? nowM : (planned.length ? Math.min(...planned.map(x => toMin(x.planStart))) : 8 * 60);
        $('tlScroll').scrollTop = Math.max(0, (Math.max(START, at) - START) * PPM - 140);
    }
}
function renderSummary(planned, un) {
    const mins = planned.reduce((a, x) => a + (x.planDur || 30), 0), done = planned.filter(x => x.completed).length;
    const h = Math.floor(mins / 60), m = mins % 60;
    $('pSum').innerHTML = '';
    for (const [txt, cls] of [[`⏳ مجدول: ${h ? h + ' ساعة' : ''}${h && m ? ' و' : ''}${m ? m + ' دقيقة' : ''}${!mins ? 'لا شيء' : ''}`, ''], [`✅ مكتمل: ${done}/${planned.length}`, ''], [`📥 غير مجدول: ${un.length}`, un.length ? 'warn' : '']]) {
        const c = document.createElement('span');
        c.className = 'chip ' + cls;
        c.textContent = txt;
        $('pSum').append(c);
    }
    $('autoPlan').disabled = !un.length;
}
function renderList(un, plannedCount) {
    const box = $('unList');
    box.replaceChildren();
    if (!un.length) {
        if (!plannedCount)
            emptyState(box, 'planner', () => openAdd());
        else {
            const d = document.createElement('div');
            d.className = 'all-set';
            d.textContent = 'كل مهامك على الجدول 👌';
            box.append(d);
        }
        return;
    }
    for (const x of un) {
        const it = document.createElement('button');
        it.type = 'button';
        it.className = 'pick u-item p-' + (x.priority || 'medium');
        it.draggable = true;
        const tt = document.createElement('span');
        tt.className = 'pick-t';
        tt.textContent = x.title;
        const m = document.createElement('small');
        m.textContent = [x.dueDate < today() && date === today() ? 'متأخرة' : '', x.dueTime ? 'موعدها ' + fmt12(toMin(x.dueTime)) : '', { high: 'عالية', medium: 'متوسطة', low: 'منخفضة' }[x.priority]].filter(Boolean).join(' • ');
        it.append(tt, m);
        it.ondragstart = e => { e.dataTransfer.setData('text/plain', x.id); e.dataTransfer.effectAllowed = 'move'; it.classList.add('dragging'); };
        it.ondragend = () => it.classList.remove('dragging');
        it.onclick = () => openAdd(null, x.id);
        box.append(it);
    }
}
function renderBlocks(planned) {
    const L = $('tlBlocks');
    L.replaceChildren();
    const items = layoutLanes(planned.map(x => { const s = Math.max(START, toMin(x.planStart)), d = x.planDur || 30; return { x, s, e: Math.min(END, s + d), d }; }));
    for (const it of items) {
        const { x, s, d } = it, b = document.createElement('div');
        b.className = 'pb p-' + (x.priority || 'medium') + (x.completed ? ' done' : '') + (it.d * PPM < 44 ? ' tiny' : '');
        b.style.cssText = `top:${(s - START) * PPM}px;height:${Math.max(MINH, Math.min(d, END - s) * PPM)}px;inset-inline-start:${it.lane / it.lanes * 100}%;width:calc(${100 / it.lanes}% - 4px)`;
        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.className = 'pb-cb';
        cb.checked = !!x.completed;
        cb.setAttribute('aria-label', 'إنجاز المهمة');
        cb.onchange = async () => { cb.disabled = true; try {
            await setTaskCompleted(user.uid, x, cb.checked);
        }
        catch (e) {
            cb.checked = !cb.checked;
            toast(errMsg(e), 'error');
        }
        finally {
            cb.disabled = false;
        } };
        const body = document.createElement('div');
        body.className = 'pb-body';
        const st = document.createElement('strong');
        st.textContent = x.title;
        const tm = document.createElement('small');
        tm.className = 'pb-time';
        tm.textContent = `${fmt12(s)} – ${fmt12(s + d)}`;
        body.append(st, tm);
        const go = document.createElement('a');
        go.className = 'pb-act pb-focus';
        go.href = 'focus.html?task=' + encodeURIComponent(x.id);
        go.title = 'ابدأ تركيز';
        go.textContent = '▶';
        const rm = document.createElement('button');
        rm.type = 'button';
        rm.className = 'pb-act pb-x';
        rm.title = 'إزالة من الخطة';
        rm.setAttribute('aria-label', 'إزالة من الخطة');
        rm.textContent = '✕';
        rm.onclick = () => unplan(x);
        const grip = document.createElement('span');
        grip.className = 'pb-grip';
        grip.setAttribute('aria-hidden', 'true');
        const rz = document.createElement('span');
        rz.className = 'pb-resize';
        rz.setAttribute('aria-hidden', 'true');
        b.append(cb, body, go, rm, grip, rz);
        wireDrag(b, x, s, d, tm);
        b.addEventListener('click', e => { if (justDragged || e.target.closest('button,a,input,.pb-grip,.pb-resize'))
            return; openAdd(null, null, x); });
        L.append(b);
    }
}
function updateNow() {
    const n = $('tlNow'), now = new Date(), m = now.getHours() * 60 + now.getMinutes();
    n.hidden = date !== today() || m < START || m > END;
    if (!n.hidden)
        n.style.top = (m - START) * PPM + 'px';
}
setInterval(updateNow, 30000);
/* ---------- سحب وتغيير الحجم (Pointer Events) ---------- */
function wireDrag(b, x, s, d, tm) {
    let mode = null, y0 = 0, moved = false, ns = s, nd = d;
    b.addEventListener('pointerdown', e => {
        if (e.target.closest('button,a,input'))
            return;
        const res = e.target.classList.contains('pb-resize');
        if (e.pointerType === 'touch' && !res && !e.target.classList.contains('pb-grip'))
            return;
        mode = res ? 'resize' : 'move';
        y0 = e.clientY;
        moved = false;
        ns = s;
        nd = d;
        b.setPointerCapture(e.pointerId);
        b.classList.add('dragging');
    });
    b.addEventListener('pointermove', e => {
        if (!mode)
            return;
        const dy = e.clientY - y0;
        if (Math.abs(dy) > 4)
            moved = true;
        if (!moved)
            return;
        const dm = snap(dy / PPM);
        if (mode === 'move')
            ns = Math.min(Math.max(START, s + dm), END - d);
        else
            nd = Math.min(Math.max(15, d + dm), END - s);
        b.style.top = (ns - START) * PPM + 'px';
        b.style.height = Math.max(MINH, nd * PPM) + 'px';
        tm.textContent = `${fmt12(ns)} – ${fmt12(ns + nd)}`;
    });
    const end = async () => {
        if (!mode)
            return;
        mode = null;
        b.classList.remove('dragging');
        if (!moved)
            return;
        justDragged = true;
        setTimeout(() => justDragged = false, 80);
        if (ns === s && nd === d) {
            render();
            return;
        }
        try {
            await updateDoc(doc(db, 'users', user.uid, 'tasks', x.id), { planStart: fromMin(ns), planDur: nd });
        }
        catch (e) {
            toast(errMsg(e), 'error');
            render();
        }
    };
    b.addEventListener('pointerup', end);
    b.addEventListener('pointercancel', end);
}
// إفلات مهمة من القائمة على الجدول
const L = $('tlBlocks');
L.addEventListener('dragover', e => { e.preventDefault(); L.classList.add('drop'); });
L.addEventListener('dragleave', () => L.classList.remove('drop'));
L.addEventListener('drop', async (e) => {
    e.preventDefault();
    L.classList.remove('drop');
    const x = tasks.find(t => t.id === e.dataTransfer.getData('text/plain'));
    if (!x)
        return;
    const d = x.planDur || DUR[x.priority] || 45, s = Math.min(yToMin(e.clientY), END - d);
    try {
        await updateDoc(doc(db, 'users', user.uid, 'tasks', x.id), { dueDate: date, planStart: fromMin(s), planDur: d });
        toast('اتضافت للخطة', 'success', 1800);
    }
    catch (err) {
        toast(errMsg(err), 'error');
    }
});
// ضغطة على فراغ في الجدول
L.addEventListener('click', e => { if (e.target === L)
    openAdd(yToMin(e.clientY)); });
/* ---------- حوار الإضافة / التعديل ---------- */
let dlg = { edit: null, sel: null };
function busy(skipId) { return tasks.filter(x => isPlanned(x) && x.id !== skipId).map(x => ({ s: toMin(x.planStart), e: toMin(x.planStart) + (x.planDur || 30) })); }
function suggest(dur, skipId) {
    const now = new Date(), from = date === today() ? Math.max(START, ceil15(now.getHours() * 60 + now.getMinutes())) : 9 * 60;
    const s = findSlot(busy(skipId), from, dur, END);
    return s < 0 ? START : s;
}
function openAdd(startMin = null, taskId = null, edit = null) {
    const un = unscheduled();
    dlg = { edit, sel: edit ? edit.id : (taskId || (un[0]?.id ?? 'new')), fixed: startMin };
    $('planTitle').textContent = edit ? 'تعديل الخطة' : 'إضافة للخطة';
    $('planRemove').hidden = !edit;
    const pick = $('planPick');
    pick.replaceChildren();
    $('planPick').hidden = !!edit;
    if (!edit) {
        for (const x of un)
            pick.append(row(x.id, x.title));
        pick.append(row('new', '＋ مهمة جديدة'));
    }
    syncSel(true);
    $('planDialog').showModal();
}
function row(id, label) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'pick';
    b.dataset.id = id;
    const t = document.createElement('span');
    t.className = 'pick-t';
    t.textContent = label;
    b.append(t);
    b.onclick = () => { dlg.sel = id; syncSel(false); };
    return b;
}
function syncSel(init) {
    document.querySelectorAll('#planPick .pick').forEach(b => b.setAttribute('aria-pressed', b.dataset.id === dlg.sel));
    const isNew = dlg.sel === 'new';
    $('newTitleWrap').hidden = !isNew;
    const x = dlg.edit || tasks.find(t => t.id === dlg.sel);
    const dur = dlg.edit ? (dlg.edit.planDur || 30) : (x ? (x.planDur || DUR[x.priority] || 45) : 30);
    $('pDur').value = String(nearestDur(dur));
    if (init || !dlg.fixed && !dlg.edit) {
        const s = dlg.edit ? toMin(dlg.edit.planStart) : (dlg.fixed ?? suggest(dur, null));
        $('pStart').value = fromMin(Math.min(s, END - 15));
    }
    if (isNew && !init)
        $('newTitle').focus();
}
$('pPrev').onclick = () => { date = addDays(date, -1); needScroll = true; render(); };
$('pNext').onclick = () => { date = addDays(date, 1); needScroll = true; render(); };
$('pToday').onclick = () => { date = today(); needScroll = true; render(); };
$('addPlan').onclick = () => openAdd();
$('planClose').onclick = $('planCancel').onclick = () => $('planDialog').close();
$('planRemove').onclick = () => { if (dlg.edit) {
    $('planDialog').close();
    unplan(dlg.edit);
} };
$('planForm').onsubmit = async (e) => {
    e.preventDefault();
    const s = toMin($('pStart').value);
    let d = +$('pDur').value;
    if (s == null || s < START || s >= END) {
        shake($('planForm'));
        toast('اختر وقتًا بين 6 صباحًا و12 منتصف الليل', 'error');
        return;
    }
    if (s + d > END)
        d = END - s;
    const btn = $('planSave');
    setLoading(btn, true);
    try {
        if (dlg.edit)
            await updateDoc(doc(db, 'users', user.uid, 'tasks', dlg.edit.id), { planStart: fromMin(s), planDur: d });
        else if (dlg.sel === 'new') {
            const title = $('newTitle').value.trim();
            if (!title) {
                shake($('planForm'));
                $('newTitle').focus();
                setLoading(btn, false);
                return;
            }
            await addDoc(collection(db, 'users', user.uid, 'tasks'), { title, description: '', dueDate: date, dueTime: '', priority: 'medium', category: 'شخصي', notes: '', completed: false, createdAt: serverTimestamp(), planStart: fromMin(s), planDur: d });
            $('newTitle').value = '';
        }
        else
            await updateDoc(doc(db, 'users', user.uid, 'tasks', dlg.sel), { dueDate: date, planStart: fromMin(s), planDur: d });
        $('planDialog').close();
        toast('تم حفظ الخطة', 'success', 1800);
    }
    catch (err) {
        shake($('planForm'));
        toast(errMsg(err), 'error');
    }
    finally {
        setLoading(btn, false);
    }
};
async function unplan(x) {
    try {
        await updateDoc(doc(db, 'users', user.uid, 'tasks', x.id), { planStart: deleteField(), planDur: deleteField() });
        toast('اتشالت من الخطة', 'info', 1800);
    }
    catch (e) {
        toast(errMsg(e), 'error');
    }
}
/* ---------- ترتيب تلقائي ---------- */
$('autoPlan').onclick = async (e) => {
    const un = unscheduled();
    if (!un.length)
        return;
    const btn = e.currentTarget, now = new Date(), b = busy(null);
    let cur = date === today() ? Math.max(START, ceil15(now.getHours() * 60 + now.getMinutes())) : 9 * 60;
    const wb = writeBatch(db);
    let placed = 0;
    for (const x of un) {
        const d = x.planDur || DUR[x.priority] || 45, s = findSlot(b, cur, d, END);
        if (s < 0)
            continue;
        b.push({ s, e: s + d });
        cur = s;
        placed++;
        wb.update(doc(db, 'users', user.uid, 'tasks', x.id), { dueDate: date, planStart: fromMin(s), planDur: d });
    }
    if (!placed) {
        toast('مفيش وقت فاضي كفاية في اليوم ده', 'info');
        return;
    }
    setLoading(btn, true);
    try {
        await wb.commit();
        toast(`رتّبت ${placed} ${placed > 2 ? 'مهام' : 'مهمة'} على جدولك ✨${placed < un.length ? ` (والباقي مفيش له مكان)` : ''}`, 'success', 3500);
    }
    catch (err) {
        toast(errMsg(err), 'error');
    }
    finally {
        setLoading(btn, false);
    }
};
startShell({
    onUser: u => { user = u; },
    onTasks: (t, u, err) => { tasks = t; loaded = true; render(); }
});

