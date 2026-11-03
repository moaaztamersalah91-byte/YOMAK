// السبحة الإلكترونية: عدّاد تسبيح يومي بجولات (33 / 100)
import { startShell, $, errMsg } from './shell.js';
import { toast } from './ui.js';
import { today } from './logic.js';
import { iref, saveDay, saveSettings, watchSettings, watchDays, weekBars, mk } from './islamic.js';
import { awardIslamic } from './rewards.js';
import { onSnapshot } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js';
const GOALS = [33, 99, 100, 1000], DH = ['سبحان الله', 'الحمد لله', 'الله أكبر', 'لا إله إلا الله', 'أستغفر الله', 'اللهم صلِّ على محمد'];
const AR = new Intl.NumberFormat('ar-EG');
let user = null, total = 0, goal = 33, dh = 0, timer = null;
try {
    dh = Math.min(DH.length - 1, +localStorage.getItem('yomak.tsb.dh') || 0);
}
catch { }
function render() {
    const bx = $('tsDh');
    bx.replaceChildren();
    DH.forEach((t, i) => { const b = mk('button', i === dh ? 'on' : '', t); b.type = 'button'; b.onclick = () => { dh = i; try {
        localStorage.setItem('yomak.tsb.dh', i);
    }
    catch { } render(); }; bx.append(b); });
    const gl = $('tsGoals');
    gl.replaceChildren();
    for (const g of GOALS) {
        const b = mk('button', 'ex-c' + (g === goal ? ' on' : ''), AR.format(g));
        b.type = 'button';
        b.setAttribute('aria-pressed', g === goal);
        b.onclick = () => { goal = g; render(); user && saveSettings(user.uid, { tgoal: g }).catch(() => { }); };
        gl.append(b);
    }
    $('tsRound').textContent = AR.format(total % goal);
    $('tsOf').textContent = `من ${AR.format(goal)} — ${DH[dh]}`;
    $('tsToday').textContent = AR.format(total);
    $('tsLaps').textContent = AR.format(Math.floor(total / goal));
    $('tsUndo').disabled = total < 1;
}
function persist() {
    clearTimeout(timer);
    timer = setTimeout(() => { timer = null; if (user)
        saveDay(user.uid, 't_', today(), { tasbih: total }).catch(e => toast(errMsg(e), 'error')); }, 500);
}
function bump(n) {
    if (total + n < 0 || total + n > 100000)
        return;
    const before = total;
    total += n;
    if (n > 0) {
        window.SFX && SFX.play(total % goal === 0 ? 'countGoal' : 'count');
        try {
            navigator.vibrate && navigator.vibrate(total % goal === 0 ? [30, 40, 30] : 10);
        }
        catch { }
        if (total % goal === 0)
            toast(`ما شاء الله، أتممت ${AR.format(goal)} 🤍`, 'success');
        if (user && before < 100 && total >= 100)
            awardIslamic(user.uid, 'adhkar', 'سبّحت ١٠٠ مرة', { key: 'tasbih' });
    }
    render();
    persist();
}
$('tsBtn').onclick = () => bump(1);
$('tsUndo').onclick = () => bump(-1);
$('tsReset').onclick = () => { if (total && confirm('تصفير تسبيح النهارده؟')) {
    total = 0;
    render();
    persist();
} };
render();
startShell({
    onUser: u => {
        user = u;
        watchSettings(u.uid, s => { const g = +s.tgoal; if (g && g !== goal) {
            goal = g;
            render();
        } }, () => { });
        onSnapshot(iref(u.uid, 't_' + today()), s => { if (timer)
            return; total = s.exists() ? (+s.data().tasbih || 0) : 0; render(); }, e => toast(errMsg(e), 'error'));
        watchDays(u.uid, 't_', 7, m => { const mx = Math.max(goal, ...Object.values(m).map(x => +x.tasbih || 0)); weekBars($('tsWeek'), d => +(m[d] && m[d].tasbih) || 0, mx); }, () => { });
    },
    onTasks: () => { }
});

