// ملخص إسلامي أسبوعي: آخر 7 أيام مقابل الأسبوع اللي قبله
import { startShell, $, errMsg } from './shell.js';
import { toast } from './ui.js';
import { today, addDays } from './logic.js';
import { watchDays, weekBars, mk } from './islamic.js';
import { TABS } from './adhkar-data.js';
const AR = new Intl.NumberFormat('ar-EG');
const D = { p: {}, a: {}, q: {}, h: {}, t: {}, f: {} };
const sum = (m, fn, from, to) => { let s = 0; for (let i = from; i <= to; i++) {
    const x = m[addDays(today(), -i)];
    if (x)
        s += fn(x);
} return s; };
const items = TABS.flatMap(t => t.items);
const M = [
    ['🕌 الصلوات', 'p', x => (x.done || []).length, 'من 35'],
    ['📿 الأذكار المكتملة', 'a', x => items.filter(i => (x.counts && x.counts[i.id] || 0) >= i.count).length, ''],
    ['📖 صفحات الورد', 'q', x => +x.pages || 0, ''],
    ['🧠 حفظ ومراجعة', 'h', x => +x.hz || 0, ''],
    ['📿 التسبيح', 't', x => +x.tasbih || 0, ''],
    ['🌙 أيام الصيام', 'f', x => x.fast ? 1 : 0, '']
];
function render() {
    const g = $('wkGrid');
    g.replaceChildren();
    let up = 0, down = 0;
    for (const [name, k, fn, suf] of M) {
        const a = sum(D[k], fn, 0, 6), b = sum(D[k], fn, 7, 13), d = a - b;
        if (d > 0)
            up++;
        else if (d < 0)
            down++;
        const c = mk('article', 'wk-card');
        c.append(mk('span', '', name), mk('strong', '', AR.format(a) + (suf ? ` ${suf}` : '')), mk('small', 'muted', `الأسبوع اللي فات: ${AR.format(b)}`));
        c.append(mk('em', 'wk-d' + (d > 0 ? ' up' : d < 0 ? ' down' : ''), d > 0 ? `▲ +${AR.format(d)}` : d < 0 ? `▼ ${AR.format(d)}` : '= زي الأسبوع اللي فات'));
        g.append(c);
    }
    $('wkMsg').textContent = up + down === 0 ? 'ابدأ بتسجيل صلواتك وأذكارك وهيظهر ملخصك هنا.' : up >= down ? `أسبوع كويس 🤍 اتحسّنت في ${AR.format(up)} مجال${down ? ` ونزلت في ${AR.format(down)}` : ''}.` : `نزلت في ${AR.format(down)} مجال، فرصة ترجّع نشاطك الأسبوع الجاي.`;
    weekBars($('wkBars'), d => ((D.p[d] && D.p[d].done) || []).length, 5);
}
render();
startShell({
    onUser: u => { for (const k of Object.keys(D))
        watchDays(u.uid, k + '_', 14, m => { D[k] = m; render(); }, e => toast(errMsg(e), 'error')); },
    onTasks: () => { }
});

