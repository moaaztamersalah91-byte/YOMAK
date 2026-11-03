// ورد القرآن: هدف يومي بالصفحات + تقدّم الختمة (604 صفحة)
import { startShell, $, errMsg } from './shell.js';
import { toast } from './ui.js';
import { today, addDays } from './logic.js';
import { awardIslamic } from './rewards.js';
import { watchSettings, watchDays, saveSettings, saveDay, streakOf, weekBars, mk } from './islamic.js';
const TOTAL = 604, GOALS = [1, 2, 3, 5, 10, 20], ADD = [1, 2, 5, 10, 20];
let user = null, S = {}, logs = {}, busy = false;
const goal = () => +S.goal || 5, page = () => +S.page || 0, kh = () => +S.khatmas || 0, pages = d => +(logs[d]?.pages) || 0;
const DF = new Intl.DateTimeFormat('ar-EG-u-nu-latn', { day: 'numeric', month: 'long' });
function render() {
    const t = today(), g = goal(), p = pages(t), pct = Math.min(100, Math.round(p / g * 100));
    $('qrRing').style.setProperty('--p', pct);
    $('qrRingTxt').textContent = pct + '%';
    $('qrMsg').textContent = p >= g ? 'ما شاء الله، خلّصت ورد النهارده ✅' : p > 0 ? `باقي ${g - p} صفحة على ورد النهارده` : 'ابدأ ورد النهارده';
    $('qrSub').textContent = `هدفك ${g} صفحة في اليوم`;
    $('qrToday').textContent = p;
    $('qrKh').textContent = kh();
    $('qrStreak').textContent = streakOf(logs, t, x => (+x?.pages || 0) >= g);
    $('qrBar').style.width = (page() / TOTAL * 100) + '%';
    $('qrPage').textContent = page();
    const left = TOTAL - page();
    $('qrEta').textContent = left > 0 ? `الختمة تخلص تقريبًا ${DF.format(new Date(addDays(t, Math.max(0, Math.round((left - Math.max(0, g - p)) / g))) + 'T12:00'))}` : '';
    $('qrPlan').textContent = `ختمة كل ${Math.round(TOTAL / g)} يوم`;
    const add = $('qrAdd');
    add.replaceChildren();
    for (const n of ADD) {
        const b = mk('button', 'secondary', n === 20 ? 'جزء (20)' : `+${n}`);
        b.type = 'button';
        b.onclick = () => log(n);
        add.append(b);
    }
    const u = mk('button', 'secondary', '↩ تراجع');
    u.type = 'button';
    u.disabled = p < 1;
    u.onclick = () => log(-1);
    add.append(u);
    const gl = $('qrGoals');
    gl.replaceChildren();
    for (const n of GOALS) {
        const b = mk('button', 'ex-c' + (n === g ? ' on' : ''), `${n} ${n === 1 ? 'صفحة' : 'صفحات'}`);
        b.type = 'button';
        b.setAttribute('aria-pressed', n === g);
        b.onclick = () => setGoal(n);
        gl.append(b);
    }
    weekBars($('qrWeek'), pages, Math.max(g, ...[...Array(7)].map((_, i) => pages(addDays(t, -i)))), '');
}
async function log(n) {
    if (!user || busy)
        return;
    const t = today(), cur = pages(t);
    if (n < 0 && cur < 1)
        return;
    let pg = page(), k = kh();
    pg += n;
    if (pg >= TOTAL) {
        pg -= TOTAL;
        k++;
    }
    if (pg < 0) {
        if (k > 0) {
            pg += TOTAL;
            k--;
        }
        else
            pg = 0;
    }
    const np = Math.max(0, cur + n);
    logs[t] = { ...(logs[t] || {}), pages: np };
    S = { ...S, page: pg, khatmas: k };
    render();
    busy = true;
    try {
        await Promise.all([saveDay(user.uid, 'q_', t, { pages: np }), saveSettings(user.uid, { page: pg, khatmas: k })]);
        if (n > 0 && pg < n && k > 0) {
            toast('مبارك! أتممت ختمة 🎉', 'success', 6000);
            awardIslamic(user.uid, 'khatma', 'أتممت ختمة كاملة', { total: k });
        }
        if (n > 0 && cur < goal() && np >= goal()) {
            toast('أتممت ورد النهارده 🤍', 'success');
            awardIslamic(user.uid, 'wird', 'أتممت ورد القرآن اليوم');
        }
    }
    catch (e) {
        toast(errMsg(e), 'error');
    }
    busy = false;
}
async function setGoal(n) {
    if (!user)
        return;
    S = { ...S, goal: n };
    render();
    try {
        await saveSettings(user.uid, { goal: n });
    }
    catch (e) {
        toast(errMsg(e), 'error');
    }
}
render();
startShell({
    onUser: u => {
        user = u;
        watchSettings(u.uid, s => { if (!busy)
            S = s; render(); }, e => toast(errMsg(e), 'error'));
        watchDays(u.uid, 'q_', 60, m => { if (!busy)
            logs = m; render(); }, e => toast(errMsg(e), 'error'));
    },
    onTasks: () => { }
});

