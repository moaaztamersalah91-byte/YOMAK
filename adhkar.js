// الأذكار: عدّاد لكل ذكر، بيتصفّر كل يوم
import { startShell, $, errMsg } from './shell.js';
import { toast } from './ui.js';
import { today } from './logic.js';
import { TABS } from './adhkar-data.js';
import { iref, saveDay, saveSettings, watchSettings, mk } from './islamic.js';
import { awardIslamic } from './rewards.js';
import { onSnapshot } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js';
let user = null, counts = {}, tab = (() => { const h = new Date().getHours(); return h < 12 ? 'm' : h < 17 ? 'p' : h < 20 ? 'e' : 's'; })(), timer = null;
let custom = [];
const tabs = () => [...TABS, { id: 'c', icon: '✨', label: 'أذكاري', items: custom.map(x => ({ id: x.id, text: x.text, count: x.count, note: '' })) }];
const cur = () => tabs().find(t => t.id === tab) || tabs()[0];
function renderTabs() {
    const box = $('adTabs');
    box.replaceChildren();
    for (const t of tabs()) {
        const b = mk('button', t.id === tab ? 'on' : '', `${t.icon} ${t.label}`);
        b.type = 'button';
        b.dataset.t = t.id;
        b.onclick = () => { tab = t.id; render(); };
        box.append(b);
    }
}
function render() {
    renderTabs();
    const T = cur(), box = $('adList');
    box.replaceChildren();
    let done = 0;
    for (const it of T.items) {
        const n = counts[it.id] || 0, ok = n >= it.count;
        if (ok)
            done++;
        const c = mk('button', 'isl-card' + (ok ? ' ok' : ''));
        c.type = 'button';
        c.setAttribute('aria-label', `${it.note || 'ذكر'} — ${n} من ${it.count}. اضغط للعد`);
        if (it.note)
            c.append(mk('small', 'isl-cn', it.note));
        c.append(mk('p', 'isl-tx', it.text));
        const f = mk('div', 'isl-cf');
        f.append(mk('span', 'isl-ct', ok ? '✓ تم' : `${n} / ${it.count}`));
        const bar = mk('div', 'isl-bar sm'), u = mk('u');
        u.style.width = Math.min(100, n / it.count * 100) + '%';
        bar.append(u);
        f.append(bar);
        c.append(f);
        c.onclick = () => bump(it);
        box.append(c);
    }
    $('adCustom').hidden = tab !== 'c';
    if (tab === 'c') {
        if (!T.items.length)
            box.append(mk('p', 'muted', 'لسه ما أضفتش أذكار. اكتب ذكرك واختار عدده اليومي.'));
        const mg = $('adManage');
        mg.replaceChildren();
        for (const x of custom) {
            const r = mk('div', 'ad-mrow', `${x.text} — ${x.count}`);
            const d = mk('button', 'secondary', '🗑');
            d.type = 'button';
            d.setAttribute('aria-label', 'حذف');
            d.onclick = () => saveCustom(custom.filter(y => y.id !== x.id));
            r.append(d);
            mg.append(r);
        }
    }
    $('adDone').textContent = done;
    $('adAll').textContent = T.items.length;
    $('adBar').style.width = (T.items.length ? done / T.items.length * 100 : 0) + '%';
}
function bump(it) {
    if ((counts[it.id] || 0) >= it.count)
        return;
    counts[it.id] = (counts[it.id] || 0) + 1;
    window.SFX && SFX.play('count');
    try {
        navigator.vibrate && navigator.vibrate(12);
    }
    catch { }
    render();
    persist();
    const T = cur();
    if (user && T.items.every(x => (counts[x.id] || 0) >= x.count))
        awardIslamic(user.uid, 'adhkar', 'أتممت ' + T.label, { key: T.id });
}
function persist() {
    clearTimeout(timer);
    timer = setTimeout(() => { timer = null; if (user)
        saveDay(user.uid, 'a_', today(), { counts }).catch(e => toast(errMsg(e), 'error')); }, 600);
}
function saveCustom(list) {
    custom = list;
    render();
    if (user)
        saveSettings(user.uid, { cadhkar: list }).catch(e => toast(errMsg(e), 'error'));
}
$('adForm').onsubmit = e => {
    e.preventDefault();
    if (custom.length >= 20) {
        toast('وصلت للحد الأقصى (20 ذكر)', 'info');
        return;
    }
    const text = $('adTxt').value.trim(), count = Math.min(1000, Math.max(1, Math.floor(+$('adCnt').value) || 1));
    if (!text)
        return;
    saveCustom([...custom, { id: 'c' + Date.now().toString(36), text, count }]);
    $('adTxt').value = '';
};
$('adReset').onclick = () => {
    if (!confirm('تصفير عدّادات القسم ده؟'))
        return;
    cur().items.forEach(i => delete counts[i.id]);
    render();
    persist();
};
render();
startShell({
    onUser: u => {
        user = u;
        watchSettings(u.uid, st => { custom = Array.isArray(st.cadhkar) ? st.cadhkar : []; render(); }, () => { });
        onSnapshot(iref(u.uid, 'a_' + today()), s => { if (timer)
            return; counts = s.exists() ? (s.data().counts || {}) : {}; render(); }, e => toast(errMsg(e), 'error'));
    },
    onTasks: () => { }
});

