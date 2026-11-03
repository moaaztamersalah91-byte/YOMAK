// المصروفات: دخل ومصروفات، ميزانية لكل تصنيف، تحليلات وتوقّعات، تصدير PDF/Excel/CSV، وXP
import { startShell, $, errMsg } from './shell.js';
import { db } from './firebase.js';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, setDoc, doc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js';
import { toast, setLoading, setNum } from './ui.js';
import { awardFinance } from './rewards.js';
import { openExportMenu } from './export.js';
import { today, addDays, monthOf, addMonths, daysInMonth, summarize, forecast, budgetState, pctChange, parseAmount } from './logic.js';
const EXP = [['طعام', '🍔', '#c58a1f'], ['مواصلات', '🚗', '#4a8fd1'], ['فواتير', '💡', '#7a5cc4'], ['تسوق', '🛍️', '#c2477a'], ['صحة', '💊', '#3f9b4f'], ['ترفيه', '🎬', '#e07a3f'], ['تعليم', '📚', '#04796c'], ['أخرى', '📦', '#8a9a96']];
const INC = [['راتب', '💼', '#04796c'], ['عمل حر', '💻', '#4a8fd1'], ['هدية', '🎁', '#c2477a'], ['أخرى', '💰', '#8a9a96']];
let custom = [];
const PAL = ['#d1633a', '#2f8f9d', '#8b5fbf', '#b8860b', '#c2477a', '#4a8fd1', '#3f9b4f', '#e07a3f'];
const allCats = t => { const b = t === 'income' ? INC : EXP; return [...b.slice(0, -1), ...custom.filter(c => c.type === t).map(c => [c.name, c.icon, c.color]), b.at(-1)]; };
const META = (t, c) => allCats(t).find(x => x[0] === c) || (t === 'income' ? INC : EXP).at(-1);
const SUG = { expense: [['إيجار', '🏠'], ['اشتراكات', '📺'], ['قهوة', '☕'], ['رياضة', '🏋️'], ['سفر', '✈️'], ['ملابس', '👕'], ['إنترنت وموبايل', '📱'], ['صيانة', '🔧'], ['تبرعات', '🤲'], ['حيوانات أليفة', '🐾'], ['أطفال', '🧸'], ['هدايا', '🎁']], income: [['مكافأة', '🏆'], ['استثمار', '📈'], ['إيجار', '🏘️'], ['بيع', '🏷️']] };
const EMO = ['🏠', '☕', '🏋️', '✈️', '👕', '📱', '🔧', '🤲', '🐾', '🧸', '🎁', '🎮', '🍕', '⛽', '💄', '🧾'];
const NF = new Intl.NumberFormat('ar-EG-u-nu-latn', { maximumFractionDigits: 2 });
const money = n => NF.format(n) + ' ج.م';
const MON = new Intl.DateTimeFormat('ar-EG-u-nu-latn', { month: 'long', year: 'numeric' });
const DAY = new Intl.DateTimeFormat('ar-EG-u-nu-latn', { weekday: 'long', day: 'numeric', month: 'long' });
const at = d => new Date(d + 'T12:00');
let user = null, txs = [], limits = {}, month = today().slice(0, 7), filter = 'all', q = '', cur = null, type = 'expense', cat = 'طعام', again = false;
const mk = (t, c, x) => { const e = document.createElement(t); if (c)
    e.className = c; if (x != null)
    e.textContent = x; return e; };
const svg = (t, a = {}) => { const e = document.createElementNS('http://www.w3.org/2000/svg', t); for (const k in a)
    e.setAttribute(k, a[k]); return e; };
const delta = (el, cur, prev, goodUp) => {
    const c = pctChange(cur, prev);
    el.className = 'ex-d';
    if (c === null || (!cur && !prev)) {
        el.textContent = prev ? '' : '—';
        return;
    }
    el.textContent = `${c > 0 ? '▲' : c < 0 ? '▼' : '•'} ${Math.abs(c)}% عن الشهر اللي فات`;
    el.classList.add(c === 0 ? '' : ((c > 0) === goodUp ? 'good' : 'bad'));
};
/* ---------- العرض ---------- */
function render() {
    const S = summarize(txs, month), P = summarize(txs, addMonths(month, -1)), isNow = month === today().slice(0, 7);
    $('exMonth').textContent = MON.format(at(month + '-01'));
    $('exNext').disabled = month >= addMonths(today().slice(0, 7), 0) && false;
    const net = S.income - S.expense, pnet = P.income - P.expense;
    const elapsed = month > today().slice(0, 7) ? 0 : isNow ? +today().slice(8, 10) : daysInMonth(month);
    setNum($('exInc'), Math.round(S.income));
    setNum($('exExp'), Math.round(S.expense));
    setNum($('exNet'), Math.round(net));
    $('exNet').classList.toggle('neg', net < 0);
    const avg = elapsed ? S.expense / elapsed : 0;
    $('exAvg').textContent = NF.format(Math.round(avg));
    delta($('exIncD'), S.income, P.income, true);
    delta($('exExpD'), S.expense, P.expense, false);
    $('exNetD').className = 'ex-d';
    $('exNetD').textContent = S.income ? `معدل الادخار ${Math.round(net / S.income * 100)}%` : '';
    $('exAvgD').className = 'ex-d';
    $('exAvgD').textContent = elapsed ? `خلال ${elapsed} يوم` : '';
    insights(S, P, isNow);
    donut(S);
    bars(S, elapsed, avg);
    list();
}
function insights(S, P, isNow) {
    const L = $('exInsL');
    L.replaceChildren();
    const add = (i, t, c = '') => { const li = mk('li', c); li.append(mk('span', 'ex-i', i), mk('span', '', t)); L.append(li); };
    const cats = Object.entries(S.byCat).sort((a, b) => b[1] - a[1]);
    if (cats.length) {
        const [c, v] = cats[0];
        add(META('expense', c)[1], `أكتر تصنيف صرف: ${c} — ${money(v)} (${Math.round(v / S.expense * 100)}% من مصروفاتك)`);
    }
    const ch = pctChange(S.expense, P.expense);
    if (ch !== null && S.expense)
        add(ch > 0 ? '📈' : '📉', ch === 0 ? 'مصروفاتك زي الشهر اللي فات بالظبط' : `مصروفاتك ${ch > 0 ? 'زادت' : 'قلّت'} ${Math.abs(ch)}% عن الشهر اللي فات (${money(Math.abs(S.expense - P.expense))})`, ch > 0 ? 'bad' : 'good');
    const total = Object.values(limits).reduce((a, b) => a + (+b || 0), 0);
    if (isNow && S.expense > 0) {
        const f = forecast(S.expense, month);
        add('🔮', `على معدلك الحالي هتصرف حوالي ${money(f)} بنهاية الشهر` + (total ? (f > total ? ` — أعلى من ميزانيتك (${money(total)}) بـ ${money(f - total)}` : ` — داخل ميزانيتك (${money(total)})`) : ''), total && f > total ? 'bad' : '');
    }
    for (const [c, v] of cats) {
        const st = budgetState(v, limits[c]);
        if (st === 'over')
            add('🚨', `تجاوزت ميزانية ${c} بـ ${money(v - limits[c])}`, 'bad');
        else if (st === 'warn')
            add('⚠️', `قربت تخلّص ميزانية ${c} (${Math.round(v / limits[c] * 100)}%)`, 'warn');
    }
    const big = txs.filter(t => t.type === 'expense' && monthOf(t.date) === month).sort((a, b) => b.amount - a.amount)[0];
    if (big && S.count > 2)
        add('🧾', `أكبر مصروف: ${money(big.amount)} — ${big.note || big.category} (${DAY.format(at(big.date))})`);
    $('exIns').hidden = !L.children.length;
}
function donut(S) {
    const cats = Object.entries(S.byCat).sort((a, b) => b[1] - a[1]), D = $('exDonut'), leg = $('exLeg');
    leg.replaceChildren();
    $('exDonutT').textContent = NF.format(Math.round(S.expense));
    if (!cats.length) {
        D.style.background = 'var(--mint-2)';
        leg.append(mk('p', 'muted', 'مفيش مصروفات في الشهر ده.'));
        return;
    }
    let acc = 0;
    const stops = [];
    for (const [c, v] of cats) {
        const col = META('expense', c)[2], a = acc / S.expense * 100;
        acc += v;
        stops.push(`${col} ${a}% ${acc / S.expense * 100}%`);
    }
    D.style.background = `conic-gradient(${stops.join(',')})`;
    D.setAttribute('aria-label', 'توزيع المصروفات: ' + cats.map(([c, v]) => `${c} ${Math.round(v / S.expense * 100)}%`).join('، '));
    for (const [c, v] of cats) {
        const m = META('expense', c), lim = +limits[c] || 0, st = budgetState(v, lim), r = mk('div', 'ex-lg');
        const top = mk('div', 'ex-lt');
        top.append(mk('i', 'ex-sw'), mk('span', '', `${m[1]} ${c}`), mk('b', '', money(v)), mk('small', 'muted', Math.round(v / S.expense * 100) + '%'));
        top.firstChild.style.background = m[2];
        r.append(top);
        if (lim) {
            const bar = mk('div', 'ex-bd ' + st), f = mk('u');
            f.style.width = Math.min(100, v / lim * 100) + '%';
            bar.append(f);
            r.append(bar, mk('small', 'muted ex-bl', `${money(v)} من ${money(lim)} — ${st === 'over' ? 'تجاوزت الحد' : `باقي ${money(lim - v)}`}`));
        }
        leg.append(r);
    }
}
function bars(S, elapsed, avg) {
    const box = $('exBars');
    box.replaceChildren();
    const dim = daysInMonth(month), vals = [];
    for (let d = 1; d <= dim; d++)
        vals.push(S.byDay[`${month}-${String(d).padStart(2, '0')}`] || 0);
    const max = Math.max(1, ...vals), W = Math.max(320, dim * 22), H = 170, pb = 26, pt = 10, bw = W / dim, svgE = svg('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': 'الصرف اليومي خلال الشهر', class: 'ex-svg' });
    const t = today();
    vals.forEach((v, i) => {
        const d = `${month}-${String(i + 1).padStart(2, '0')}`, h = v / max * (H - pb - pt), g = svg('g'), r = svg('rect', { x: i * bw + bw * .18, y: H - pb - h, width: bw * .64, height: Math.max(v ? 2 : 0, h), rx: 3, class: 'ex-bar' + (d === t ? ' now' : '') + (v ? '' : ' z') });
        const tt = svg('title');
        tt.textContent = `${DAY.format(at(d))}: ${money(v)}`;
        r.append(tt);
        g.append(r);
        if ((i + 1) % 5 === 0 || i === 0) {
            const l = svg('text', { x: i * bw + bw / 2, y: H - 8, 'text-anchor': 'middle', class: 'ex-ax' });
            l.textContent = i + 1;
            g.append(l);
        }
        svgE.append(g);
    });
    if (avg > 0) {
        const y = H - pb - avg / max * (H - pb - pt);
        svgE.append(svg('line', { x1: 0, x2: W, y1: y, y2: y, class: 'ex-avgl' }));
        const l = svg('text', { x: 6, y: y - 5, class: 'ex-ax' });
        l.textContent = 'المتوسط';
        svgE.append(l);
    }
    box.append(svgE);
    $('exBarHint').textContent = S.expense ? `أعلى يوم: ${money(max)}` : '';
}
function list() {
    const box = $('exList');
    box.replaceChildren();
    const n = q.trim();
    const rows = txs.filter(t => monthOf(t.date) === month && (filter === 'all' || t.type === filter) && (!n || `${t.category} ${t.note} ${t.amount}`.includes(n))).sort((a, b) => b.date.localeCompare(a.date) || (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
    if (!rows.length) {
        const e = mk('div', 'empty');
        e.append(mk('div', 'hb-empty-i', txs.length ? '🔍' : '💸'), mk('h3', '', txs.length ? 'مفيش معاملات هنا' : 'لسه مفيش معاملات'), mk('p', 'muted', txs.length ? 'جرّب شهر أو فلتر تاني.' : 'سجّل أول مصروف أو دخل وهتشوف التحليلات والميزانية.'));
        if (!txs.length) {
            const b = mk('button', '', '+ سجّل أول معاملة');
            b.type = 'button';
            b.onclick = () => edit(null);
            e.append(b);
        }
        box.append(e);
        return;
    }
    const days = {};
    rows.forEach(t => (days[t.date] || (days[t.date] = [])).push(t));
    for (const d of Object.keys(days).sort().reverse()) {
        const tot = days[d].reduce((a, t) => a + (t.type === 'income' ? t.amount : -t.amount), 0), h = mk('div', 'ex-dh');
        h.append(mk('b', '', d === today() ? 'اليوم' : d === addDays(today(), -1) ? 'امبارح' : DAY.format(at(d))), mk('small', tot < 0 ? 'neg' : 'pos', (tot > 0 ? '+' : '') + NF.format(tot)));
        box.append(h);
        for (const t of days[d]) {
            const m = META(t.type, t.category), r = mk('button', 'ex-tx');
            r.type = 'button';
            const ic = mk('span', 'ex-ti', m[1]);
            ic.style.background = `color-mix(in srgb,${m[2]} 16%,#fff)`;
            const info = mk('span', 'ex-tn');
            info.append(mk('b', '', t.note || t.category), mk('small', 'muted', t.note ? t.category : ''));
            r.append(ic, info, mk('strong', t.type === 'income' ? 'pos' : 'neg', (t.type === 'income' ? '+' : '−') + NF.format(t.amount)));
            r.setAttribute('aria-label', `${t.type === 'income' ? 'دخل' : 'مصروف'} ${money(t.amount)} — ${t.category} ${t.note || ''}. اضغط للتعديل`);
            r.onclick = () => edit(t);
            box.append(r);
        }
    }
}
/* ---------- الإضافة والتعديل ---------- */
function cats() {
    const box = $('exCats');
    box.replaceChildren();
    const base = (type === 'income' ? INC : EXP).map(x => x[0]);
    for (const [c, i, col] of allCats(type)) {
        const b = mk('button', 'ex-c' + (c === cat ? ' on' : ''));
        b.type = 'button';
        b.style.setProperty('--c', col);
        b.append(mk('span', '', i), document.createTextNode(' ' + c));
        b.setAttribute('aria-pressed', c === cat);
        b.onclick = () => { cat = c; cats(); };
        if (!base.includes(c)) {
            const x = mk('span', 'ex-cx', '✕');
            x.setAttribute('role', 'button');
            x.setAttribute('aria-label', 'حذف التصنيف ' + c);
            x.onclick = e => { e.stopPropagation(); delCat(c); };
            b.append(x);
        }
        box.append(b);
    }
    catTools();
}
let adding = false, emo = EMO[0];
async function saveCats(next) {
    if (!user)
        return false;
    try {
        await setDoc(doc(db, 'users', user.uid, 'finance', 'categories'), { items: next, updatedAt: serverTimestamp() });
        return true;
    }
    catch (e) {
        toast(errMsg(e), 'error');
        return false;
    }
}
async function addCat(name, icon) {
    name = name.trim().replace(/\s+/g, ' ');
    if (!name) {
        toast('اكتب اسم التصنيف', 'error');
        return;
    }
    if (name.length > 30) {
        toast('اسم التصنيف طويل (30 حرف بحد أقصى)', 'error');
        return;
    }
    if (allCats(type).some(x => x[0] === name)) {
        toast('التصنيف ده موجود بالفعل', 'info');
        return;
    }
    if (custom.length >= 40) {
        toast('وصلت للحد الأقصى من التصنيفات المخصصة', 'error');
        return;
    }
    const item = { type, name, icon, color: PAL[custom.length % PAL.length] };
    const prev = custom;
    custom = [...custom, item];
    if (await saveCats(custom)) {
        cat = name;
        adding = false;
        toast('تمت إضافة التصنيف', 'success');
    }
    else
        custom = prev;
    cats();
}
async function delCat(name) {
    if (!confirm(`حذف تصنيف «${name}»؟ المعاملات القديمة هتفضل زي ما هي.`))
        return;
    const prev = custom;
    custom = custom.filter(c => !(c.type === type && c.name === name));
    if (await saveCats(custom)) {
        if (cat === name)
            cat = allCats(type)[0][0];
    }
    else
        custom = prev;
    cats();
}
function catTools() {
    const box = $('exCatTools');
    box.replaceChildren();
    const add = mk('button', 'ex-c ex-add', '+ تصنيف جديد');
    add.type = 'button';
    add.setAttribute('aria-expanded', adding);
    add.onclick = () => { adding = !adding; catTools(); if (adding)
        $('exCatName')?.focus(); };
    const sug = SUG[type].filter(x => !allCats(type).some(c => c[0] === x[0]));
    const row = mk('div', 'ex-sugrow');
    row.append(add);
    box.append(row);
    if (adding) {
        const f = mk('div', 'ex-newcat'), er = mk('div', 'ex-emo');
        EMO.forEach(e => { const b = mk('button', 'ex-eb' + (e === emo ? ' on' : ''), e); b.type = 'button'; b.onclick = () => { emo = e; catTools(); $('exCatName').focus(); }; er.append(b); });
        const inp = mk('input');
        inp.id = 'exCatName';
        inp.maxLength = 30;
        inp.placeholder = 'اسم التصنيف، مثال: قهوة';
        inp.autocomplete = 'off';
        inp.onkeydown = e => { if (e.key === 'Enter') {
            e.preventDefault();
            e.stopPropagation();
            addCat(inp.value, emo);
        } };
        const ok = mk('button', '', ' إضافة');
        ok.type = 'button';
        ok.onclick = () => addCat(inp.value, emo);
        const line = mk('div', 'ex-nl');
        line.append(inp, ok);
        f.append(er, line);
        box.append(f);
    }
    if (sug.length) {
        const sw = mk('div', 'ex-sug');
        sw.append(mk('small', 'muted', 'مقترحات ليك (اضغط للإضافة):'));
        const w = mk('div', 'ex-sugl');
        sug.forEach(([n, i]) => { const b = mk('button', 'ex-s'); b.type = 'button'; b.append(mk('span', '', i), document.createTextNode(' ' + n), mk('em', '', '+')); b.onclick = () => addCat(n, i); w.append(b); });
        sw.append(w);
        box.append(sw);
    }
}
function setType(t) { type = t; document.querySelectorAll('#exType button').forEach(b => b.classList.toggle('on', b.dataset.t === t)); if (!(t === 'income' ? INC : EXP).some(x => x[0] === cat))
    cat = (t === 'income' ? INC : EXP)[0][0]; cats(); }
document.querySelectorAll('#exType button').forEach(b => b.onclick = () => setType(b.dataset.t));
function edit(t) {
    adding = false;
    cur = t;
    $('exDTitle').textContent = t ? 'تعديل المعاملة' : 'معاملة جديدة';
    cat = t ? t.category : 'طعام';
    setType(t ? t.type : 'expense');
    $('exAmt').value = t ? String(t.amount) : '';
    $('exNote').value = t?.note || '';
    $('exDate').value = t ? t.date : (monthOf(today()) === month ? today() : month + '-01');
    $('exDel').hidden = !t;
    $('exMore').hidden = !!t;
    $('exDialog').showModal();
    $('exAmt').focus();
}
$('exNew').onclick = () => edit(null);
$('exClose').onclick = () => $('exDialog').close();
$('exMore').onclick = () => { again = true; $('exForm').requestSubmit(); };
$('exForm').onsubmit = async (e) => {
    e.preventDefault();
    if (!user)
        return;
    const amount = parseAmount($('exAmt').value);
    if (!amount) {
        toast('اكتب مبلغ صحيح أكبر من صفر', 'error');
        $('exAmt').focus();
        again = false;
        return;
    }
    const data = { type, amount, category: cat, note: $('exNote').value.trim(), date: $('exDate').value || today() };
    const keep = again;
    again = false;
    setLoading($('exSave'), true);
    try {
        const before = type === 'expense' ? (summarize(txs.filter(t => !cur || t.id !== cur.id), monthOf(data.date)).byCat[cat] || 0) : 0;
        if (cur)
            await updateDoc(doc(db, 'users', user.uid, 'expenses', cur.id), data);
        else {
            await addDoc(collection(db, 'users', user.uid, 'expenses'), { ...data, createdAt: serverTimestamp() });
            awardFinance(user.uid);
        }
        toast(cur ? 'تم حفظ التعديل' : 'تم تسجيل المعاملة', 'success');
        const lim = +limits[cat] || 0;
        if (lim && type === 'expense') {
            const a = before + amount, sb = budgetState(before, lim), sa = budgetState(a, lim);
            if (sa === 'over' && sb !== 'over')
                toast(`⚠️ تجاوزت ميزانية ${cat} (${money(a)} من ${money(lim)})`, 'error', 6000);
            else if (sa === 'warn' && sb === 'ok')
                toast(`قربت تخلّص ميزانية ${cat} — ${Math.round(a / lim * 100)}%`, 'info', 5000);
        }
        if (keep && !cur) {
            $('exAmt').value = '';
            $('exNote').value = '';
            $('exAmt').focus();
        }
        else
            $('exDialog').close();
    }
    catch (err) {
        toast(errMsg(err), 'error');
    }
    setLoading($('exSave'), false);
};
$('exDel').onclick = async () => {
    if (!cur || !user || !confirm('حذف المعاملة نهائيًا؟'))
        return;
    try {
        await deleteDoc(doc(db, 'users', user.uid, 'expenses', cur.id));
        $('exDialog').close();
        toast('تم حذف المعاملة', 'success');
    }
    catch (e) {
        toast(errMsg(e), 'error');
    }
};
/* ---------- الميزانية ---------- */
$('exBudget').onclick = () => {
    const box = $('exBdFields');
    box.replaceChildren();
    for (const [c, i] of allCats('expense')) {
        const l = mk('label', 'ex-bdl'), inp = mk('input');
        inp.inputMode = 'decimal';
        inp.dataset.c = c;
        inp.placeholder = 'بدون حد';
        inp.value = limits[c] || '';
        l.append(mk('span', '', `${i} ${c}`), inp);
        box.append(l);
    }
    $('exBdDialog').showModal();
};
$('exBdClose').onclick = () => $('exBdDialog').close();
$('exBdForm').onsubmit = async (e) => {
    e.preventDefault();
    if (!user)
        return;
    const l = {};
    document.querySelectorAll('#exBdFields input').forEach(i => { const v = parseAmount(i.value); if (v)
        l[i.dataset.c] = v; });
    setLoading($('exBdSave'), true);
    try {
        await setDoc(doc(db, 'users', user.uid, 'finance', 'budget'), { limits: l, updatedAt: serverTimestamp() });
        $('exBdDialog').close();
        toast('تم حفظ الميزانية', 'success');
    }
    catch (err) {
        toast(errMsg(err), 'error');
    }
    setLoading($('exBdSave'), false);
};
/* ---------- تصدير ---------- */
// بيانات التصدير (الشهر المعروض) — بتتحسب وقت الضغط فتبقى دايمًا محدّثة
function exportData() {
    const rows = txs.filter(t => monthOf(t.date) === month).sort((a, b) => a.date.localeCompare(b.date));
    if (!rows.length)
        return null;
    const S = summarize(txs, month);
    return {
        title: 'المصروفات — ' + MON.format(at(month + '-01')),
        subtitle: 'تقرير المعاملات الشهري',
        filename: `yomak-expenses-${month}`,
        sheet: 'المصروفات ' + month,
        columns: ['التاريخ', 'النوع', 'التصنيف', 'المبلغ', 'ملاحظة'],
        rows: rows.map(t => [t.date, t.type === 'income' ? 'دخل' : 'مصروف', t.category, Number(t.amount) || 0, t.note || '']),
        summary: [['إجمالي الدخل', NF.format(S.income)], ['إجمالي المصروفات', NF.format(S.expense)], ['الصافي', NF.format(S.income - S.expense)]]
    };
}
$('exExport').onclick = e => { e.stopPropagation(); openExportMenu(e.currentTarget, exportData); };
/* ---------- تنقّل وفلاتر ---------- */
$('exPrev').onclick = () => { month = addMonths(month, -1); render(); };
$('exNext').onclick = () => { month = addMonths(month, 1); render(); };
$('exNow').onclick = () => { month = today().slice(0, 7); render(); };
document.querySelectorAll('#exFilter button').forEach(b => b.onclick = () => { filter = b.dataset.f; document.querySelectorAll('#exFilter button').forEach(x => x.classList.toggle('on', x === b)); list(); });
let st;
$('exSearch').oninput = e => { clearTimeout(st); st = setTimeout(() => { q = e.target.value; list(); }, 120); };
render();
startShell({
    onUser: u => {
        user = u;
        onSnapshot(collection(db, 'users', u.uid, 'expenses'), s => { txs = s.docs.map(d => ({ id: d.id, note: '', ...d.data() })); render(); }, e => toast(errMsg(e), 'error'));
        onSnapshot(doc(db, 'users', u.uid, 'finance', 'categories'), s => { custom = s.exists() ? (s.data().items || []).filter(c => c && c.name && (c.type === 'expense' || c.type === 'income')) : []; render(); if ($('exDialog').open)
            cats(); }, () => { });
        onSnapshot(doc(db, 'users', u.uid, 'finance', 'budget'), s => { limits = s.exists() ? (s.data().limits || {}) : {}; render(); }, () => { });
    },
    onTasks: () => { }
});

