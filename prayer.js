// مواعيد الصلاة + تتبع الصلوات اليومية + اتجاه القبلة
import { startShell, $, errMsg } from './shell.js';
import { toast } from './ui.js';
import { today, addDays } from './logic.js';
import { timesFor, qibla, fmt, CITIES, PRAYERS } from './prayer-times.js';
import { enable, permission } from './reminders.js';
import { awardIslamic } from './rewards.js';
import { watchSettings, watchDays, saveSettings, saveDay, streakOf, weekBars, mk } from './islamic.js';
let user = null, S = {}, logs = {};
const city = () => S.city && S.city.lat != null ? S.city : { name: CITIES[0][0], lat: CITIES[0][1], lng: CITIES[0][2] };
const timesAt = d => { const c = city(); return timesFor(d, c.lat, c.lng); };
const nowMin = d => d.getHours() * 60 + d.getMinutes() + d.getSeconds() / 60;
const doneOf = day => (logs[day]?.done) || [];
const sunOf = day => (logs[day]?.sunnah) || [];
// السنن الرواتب (12 ركعة) + النوافل
const RAT = [['fajr_s', 'سنة الفجر', 'ركعتان قبل الفرض', '🌅'], ['dhuhr_b', 'قبل الظهر', '4 ركعات قبل الفرض', '☀️'], ['dhuhr_a', 'بعد الظهر', 'ركعتان بعد الفرض', '☀️'], ['maghrib_s', 'بعد المغرب', 'ركعتان بعد الفرض', '🌇'], ['isha_s', 'بعد العشاء', 'ركعتان بعد الفرض', '🌙']];
const NAFL = [['duha', 'صلاة الضحى', 'ركعتان فأكثر بعد ارتفاع الشمس', '🌤️'], ['witr', 'الوتر', 'ركعة فأكثر بعد العشاء', '🌌'], ['qiyam', 'قيام الليل', 'ما تيسّر من آخر الليل', '✨']];
function nextPrayer(now) {
    const T = timesAt(now), m = nowMin(now);
    for (const [k, n] of PRAYERS)
        if (T[k] != null && T[k] > m)
            return { k, n, at: T[k] };
    const tm = new Date(now);
    tm.setDate(tm.getDate() + 1);
    return { k: 'fajr', n: 'الفجر', at: timesAt(tm).fajr + 1440 };
}
const hms = s => { s = Math.max(0, Math.floor(s)); const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60); return [h, m, s % 60].map(x => String(x).padStart(2, '0')).join(':'); };
function tickClock() {
    const now = new Date(), nx = nextPrayer(now);
    $('prNext').textContent = `${nx.n} — ${fmt(nx.at % 1440)}`;
    $('prCd').textContent = hms((nx.at - nowMin(now)) * 60);
    const first = document.querySelector('.isl-row.next');
    if (first && first.dataset.k !== nx.k)
        renderList();
}
function renderList() {
    const box = $('prList');
    box.replaceChildren();
    const now = new Date(), T = timesAt(now), t = today(), done = new Set(doneOf(t)), nx = nextPrayer(now), m = nowMin(now);
    const row = (k, n, ic, check) => {
        const r = mk('div', 'isl-row' + (check && nx.k === k && nx.at < 1440 ? ' next' : '') + (check && done.has(k) ? ' ok' : '') + (!check ? ' sun' : ''));
        r.dataset.k = k;
        r.append(mk('span', 'isl-ic', ic), mk('b', '', n), mk('span', 'isl-tm', fmt(T[k])));
        if (check) {
            const b = mk('button', 'isl-chk', done.has(k) ? '✓' : '');
            b.type = 'button';
            b.setAttribute('aria-pressed', done.has(k));
            b.setAttribute('aria-label', `${done.has(k) ? 'إلغاء' : 'تسجيل'} صلاة ${n}`);
            if (!done.has(k) && T[k] > m)
                b.disabled = true, b.title = 'لسه ماجاش وقتها';
            b.onclick = () => toggle(k);
            r.append(b);
        }
        else
            r.append(mk('span', ''));
        box.append(r);
    };
    row('fajr', 'الفجر', '🌅', true);
    row('sunrise', 'الشروق', '🌄', false);
    PRAYERS.slice(1).forEach(([k, n, ic]) => row(k, n, ic, true));
    const c = done.size;
    $('prToday').textContent = `${c}/5`;
    renderSunnah();
}
function renderSunnah() {
    const t = today(), sn = new Set(sunOf(t));
    const fill = (box, list, ratib) => {
        box.replaceChildren();
        for (const [k, n, d, ic] of list) {
            const on = sn.has(k), r = mk('div', 'isl-row' + (on ? ' ok' : ''));
            r.append(mk('span', 'isl-ic', ic));
            const b = mk('b', '', n);
            b.append(mk('small', 'muted isl-sub', ' — ' + d));
            r.append(b, mk('span', ''));
            const btn = mk('button', 'isl-chk', on ? '✓' : '');
            btn.type = 'button';
            btn.setAttribute('aria-pressed', on);
            btn.setAttribute('aria-label', `${on ? 'إلغاء' : 'تسجيل'} ${n}`);
            btn.onclick = () => toggleSunnah(k);
            r.append(btn);
            box.append(r);
        }
    };
    fill($('prRatib'), RAT);
    fill($('prNafl'), NAFL);
    const rc = RAT.filter(x => sn.has(x[0])).length;
    $('prSun').textContent = `${rc}/5`;
    $('prRatibCnt').textContent = `${rc} من 5 — ${[2, 4, 2, 2, 2].reduce((a, v, i) => a + (sn.has(RAT[i][0]) ? v : 0), 0)} من 12 ركعة`;
    $('prRatibBar').style.width = rc / 5 * 100 + '%';
}
async function toggleSunnah(k) {
    if (!user)
        return;
    const t = today(), cur = new Set(sunOf(t)), was = cur.has(k);
    was ? cur.delete(k) : cur.add(k);
    const all = [...RAT, ...NAFL].map(x => x[0]).filter(x => cur.has(x));
    logs[t] = { ...(logs[t] || {}), sunnah: all };
    renderAll();
    try {
        await saveDay(user.uid, 'p_', t, { done: doneOf(t), sunnah: all });
        if (!was) {
            const item = [...RAT, ...NAFL].find(x => x[0] === k);
            if (NAFL.some(x => x[0] === k))
                awardIslamic(user.uid, 'nafl', item[1], { key: k });
            if (RAT.every(x => cur.has(x[0])))
                awardIslamic(user.uid, 'sunnah', 'أتممت السنن الرواتب (12 ركعة)');
        }
    }
    catch (e) {
        toast(errMsg(e), 'error');
    }
}
async function toggle(k) {
    if (!user)
        return;
    const t = today(), cur = new Set(doneOf(t));
    cur.has(k) ? cur.delete(k) : cur.add(k);
    const next = PRAYERS.map(p => p[0]).filter(x => cur.has(x));
    logs[t] = { ...(logs[t] || {}), done: next };
    renderAll();
    try {
        await saveDay(user.uid, 'p_', t, { done: next, sunnah: sunOf(t) });
        if (next.length === 5)
            awardIslamic(user.uid, 'prayers', 'أتممت الصلوات الخمس');
    }
    catch (e) {
        toast(errMsg(e), 'error');
    }
}
function renderAll() {
    const c = city(), t = today();
    $('prCity').value = S.city?.geo ? 'geo' : c.name;
    renderList();
    tickClock();
    const full = x => (x?.done || []).length === 5;
    $('prStreak').textContent = streakOf(logs, t, full);
    let ok = 0;
    for (let i = 0; i < 30; i++)
        ok += ((logs[addDays(t, -i)]?.done) || []).length;
    $('prRate').textContent = Math.round(ok / 150 * 100) + '%';
    weekBars($('prWeek'), d => doneOf(d).length, 5);
    const q = qibla(c.lat, c.lng);
    $('prDeg').textContent = Math.round(q) + '°';
    $('prArrow').style.transform = `rotate(${q}deg)`;
    $('prAdhan').textContent = `🔔 تنبيه الأذان: ${S.adhan ? 'شغّال' : 'متوقف'}`;
    $('prAdhan').classList.toggle('on', !!S.adhan);
}
function useGeo() {
    if (!navigator.geolocation) {
        toast('المتصفح مش بيدعم تحديد الموقع', 'error');
        return;
    }
    navigator.geolocation.getCurrentPosition(p => saveSettings(user.uid, { city: { name: 'موقعي الحالي', lat: +p.coords.latitude.toFixed(4), lng: +p.coords.longitude.toFixed(4), geo: true } }).then(() => toast('تم ضبط موقعك', 'success')).catch(e => toast(errMsg(e), 'error')), () => { toast('مقدرناش نحدد موقعك. اختار مدينتك من القائمة', 'info'); renderAll(); }, { timeout: 10000, maximumAge: 3600000 });
}
$('prGeo').onclick = useGeo;
$('prCity').onchange = async (e) => {
    const v = e.target.value;
    if (v === 'geo') {
        S.city?.geo ? renderAll() : useGeo();
        return;
    }
    const c = CITIES.find(x => x[0] === v);
    if (!c || !user)
        return;
    try {
        await saveSettings(user.uid, { city: { name: c[0], lat: c[1], lng: c[2] } });
    }
    catch (err) {
        toast(errMsg(err), 'error');
    }
};
$('prAdhan').onclick = async () => {
    if (!user)
        return;
    if (!S.adhan) {
        const r = await enable();
        if (r !== 'granted') {
            toast(r === 'unsupported' ? 'المتصفح مش بيدعم الإشعارات' : 'لازم تسمح بالإشعارات علشان التنبيه يشتغل', 'info');
            return;
        }
    }
    try {
        await saveSettings(user.uid, { adhan: !S.adhan });
        toast(!S.adhan ? 'تم تفعيل تنبيه الأذان (والموقع مفتوح)' : 'تم إيقاف تنبيه الأذان', 'success');
    }
    catch (e) {
        toast(errMsg(e), 'error');
    }
};
renderAll();
setInterval(tickClock, 1000);
startShell({
    onUser: u => {
        user = u;
        watchSettings(u.uid, s => { S = s; renderAll(); }, e => toast(errMsg(e), 'error'));
        watchDays(u.uid, 'p_', 60, m => { logs = m; renderAll(); }, e => toast(errMsg(e), 'error'));
    },
    onTasks: () => { }
});

