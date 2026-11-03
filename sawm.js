// تتبّع الصيام: تسجيل اليوم + الأيام المستحبة + سلسلة
import { startShell, $, errMsg } from './shell.js';
import { toast } from './ui.js';
import { today, addDays } from './logic.js';
import { saveDay, saveSettings, watchSettings, watchDays, streakOf, mk } from './islamic.js';
import { awardIslamic } from './rewards.js';
import { enable } from './notify.js';
import { fastInfo, hijriStr } from './sawm-days.js';
let user = null, logs = {}, S = {}, busy = false;
const AR = new Intl.NumberFormat('ar-EG');
const DF = new Intl.DateTimeFormat('ar-EG-u-nu-latn', { weekday: 'long', day: 'numeric', month: 'long' });
const at = d => new Date(d + 'T12:00');
const fasted = d => !!(logs[d] && logs[d].fast);
function render() {
    const t = today(), inf = fastInfo(at(t));
    $('swHijri').textContent = hijriStr(at(t));
    $('swReason').textContent = inf.reasons.length ? (inf.forbidden ? inf.reasons[0] : 'النهارده: ' + inf.reasons.join(' • ')) : 'مفيش مناسبة صيام مستحب النهارده';
    const b = $('swToggle');
    b.textContent = fasted(t) ? '✅ صمت النهارده (اضغط للإلغاء)' : 'سجّل صيام النهارده';
    b.classList.toggle('secondary', fasted(t));
    b.disabled = inf.forbidden;
    $('swStreak').textContent = AR.format(streakOf(logs, t, x => x && x.fast));
    const ym = t.slice(0, 7);
    let mo = 0, yr = 0;
    for (const d in logs)
        if (logs[d].fast) {
            yr++;
            if (d.startsWith(ym))
                mo++;
        }
    $('swMonth').textContent = AR.format(mo);
    $('swYear').textContent = AR.format(yr);
    const up = $('swUp');
    up.replaceChildren();
    let n = 0;
    for (let i = 0; i < 45 && n < 12; i++) {
        const d = addDays(t, i), f = fastInfo(at(d));
        if (f.forbidden || f.ramadan || !f.reasons.length)
            continue;
        n++;
        const row = mk('div', 'sw-row' + (fasted(d) ? ' ok' : ''));
        const l = mk('div');
        l.append(mk('b', '', i === 0 ? 'النهارده' : i === 1 ? 'بكرة' : DF.format(at(d))), mk('small', 'muted', hijriStr(at(d))));
        const r = mk('div', 'sw-tags');
        f.reasons.forEach(x => r.append(mk('span', 'sw-tag', x)));
        if (fasted(d))
            r.append(mk('span', 'sw-tag ok', '✓ صمت'));
        row.append(l, r);
        up.append(row);
    }
    if (!n)
        up.append(mk('p', 'muted', 'مفيش أيام مستحبة قريبة'));
    $('swRemind').textContent = `🔔 تذكير بالصيام: ${S.fremind ? 'شغّال' : 'متوقف'}`;
    $('swRemind').classList.toggle('on', !!S.fremind);
}
$('swToggle').onclick = async () => {
    if (!user || busy)
        return;
    busy = true;
    const t = today(), v = !fasted(t);
    logs[t] = { fast: v };
    render();
    try {
        await saveDay(user.uid, 'f_', t, { fast: v });
        if (v) {
            toast('تقبّل الله صيامك 🌙', 'success');
            awardIslamic(user.uid, 'nafl', 'صمت يوم', { key: 'fast' });
        }
    }
    catch (e) {
        toast(errMsg(e), 'error');
    }
    busy = false;
};
$('swRemind').onclick = async () => {
    if (!user)
        return;
    if (!S.fremind) {
        const r = await enable();
        if (r !== 'granted') {
            toast(r === 'unsupported' ? 'المتصفح مش بيدعم الإشعارات' : 'لازم تسمح بالإشعارات علشان التذكير يشتغل', 'info');
            return;
        }
    }
    try {
        const on = !S.fremind;
        await saveSettings(user.uid, { fremind: on });
        toast(on ? 'تم تفعيل تذكير الصيام (والموقع مفتوح)' : 'تم إيقاف تذكير الصيام', 'success');
    }
    catch (e) {
        toast(errMsg(e), 'error');
    }
};
render();
startShell({
    onUser: u => {
        user = u;
        watchSettings(u.uid, s => { S = s; render(); }, e => toast(errMsg(e), 'error'));
        watchDays(u.uid, 'f_', 370, m => { if (!busy)
            logs = m; render(); }, e => toast(errMsg(e), 'error'));
    },
    onTasks: () => { }
});

