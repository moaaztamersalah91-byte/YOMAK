// التقويم: ميلادي + هجري، اليوم معلّم، ومهام كل يوم
import { startShell, $ } from './shell.js';
import { today, ymd, addDays } from './logic.js';
import { numG, numH, txtG, txtH, monG, monH, gDay, hDay } from './dates.js';
const WD = ['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'];
let tasks = [], view = new Date(), sel = today();
view = new Date(view.getFullYear(), view.getMonth(), 1, 12);
const $$ = (t, c, x) => { const e = document.createElement(t); if (c)
    e.className = c; if (x != null)
    e.textContent = x; return e; };
function top() {
    const t = today();
    $('ctGn').textContent = numG(t);
    $('ctGt').textContent = txtG(t);
    $('ctHn').textContent = numH(t);
    $('ctHt').textContent = txtH(t);
    const w = $('calWd');
    if (!w.children.length)
        WD.forEach(n => w.append($$('span', '', n)));
}
function grid() {
    const t = today(), y = view.getFullYear(), m = view.getMonth(), first = new Date(y, m, 1, 12);
    $('calG').textContent = monG(first);
    $('calH').textContent = monH(first) + ' – ' + monH(new Date(y, m + 1, 0, 12));
    const by = {};
    for (const k of tasks)
        (by[k.dueDate] || (by[k.dueDate] = [])).push(k);
    const g = $('calGrid');
    g.replaceChildren();
    const lead = (first.getDay() + 1) % 7, days = new Date(y, m + 1, 0).getDate();
    for (let i = 0; i < lead; i++)
        g.append($$('span', 'cal-blank'));
    for (let d = 1; d <= days; d++) {
        const s = ymd(new Date(y, m, d, 12)), b = $$('button', 'cal-c' + (s === t ? ' now' : '') + (s === sel ? ' sel' : ''));
        b.type = 'button';
        const n = (by[s] || []).length;
        b.append($$('b', '', gDay(s)), $$('small', '', hDay(s)));
        if (n) {
            const o = $$('i', 'cal-n', n > 9 ? '9+' : n);
            b.append(o);
        }
        b.setAttribute('aria-label', `${txtG(s)} — ${txtH(s)}${s === t ? ' (اليوم)' : ''}${n ? ` — ${n} مهام` : ''}`);
        if (s === t)
            b.setAttribute('aria-current', 'date');
        b.onclick = () => { sel = s; grid(); detail(); };
        g.append(b);
    }
}
function detail() {
    const t = today();
    $('cdNum').textContent = numG(sel) + ' م  •  ' + numH(sel) + ' هـ' + (sel === t ? '  (اليوم)' : '');
    $('cdTxt').textContent = txtG(sel) + ' — ' + txtH(sel);
    const L = $('cdList');
    L.replaceChildren();
    const list = tasks.filter(x => x.dueDate === sel).sort((a, b) => (a.dueTime || '99').localeCompare(b.dueTime || '99'));
    if (!list.length)
        L.append($$('p', 'muted', 'مفيش مهام في اليوم ده.'));
    for (const x of list) {
        const r = $$('div', 'wr-row');
        r.append($$('span', '', (x.completed ? '✅ ' : '○ ') + x.title), $$('small', '', x.dueTime || ''));
        L.append(r);
    }
}
const go = n => { view = new Date(view.getFullYear(), view.getMonth() + n, 1, 12); grid(); };
$('calPrev').onclick = () => go(-1);
$('calNext').onclick = () => go(1);
$('calNow').onclick = () => { const n = new Date(); view = new Date(n.getFullYear(), n.getMonth(), 1, 12); sel = today(); grid(); detail(); };
top();
grid();
detail();
startShell({ onTasks: t => { tasks = t; top(); grid(); detail(); } });

