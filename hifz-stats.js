// يضيف لوحة إحصائيات الحفظ في صفحة الإحصائيات
import { auth } from './firebase.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js';
import { watchSettings, watchDays } from './islamic.js';
import { today, addDays } from './logic.js';
import { renderHifzStats } from './hifz-core.js';
const p = document.createElement('section');
p.className = 'panel';
p.innerHTML = '<div class="rw-head"><h2>📖 إحصائيات الحفظ</h2><a class="muted" href="quran.html">المصحف ›</a></div><div id="hzStatsBox"></div>';
document.querySelector('main').append(p);
onAuthStateChanged(auth, u => { if (u)
    watchSettings(u.uid, s => renderHifzStats(p.querySelector('#hzStatsBox'), s.qhz || {}), () => { }); });
const q = document.createElement('section');
q.className = 'panel';
q.innerHTML = '<div class="rw-head"><h2>📿 التسبيح والصيام</h2><a class="muted" href="isl-week.html">ملخص الأسبوع ›</a></div><p id="tfLine" class="muted"></p>';
document.querySelector('main').append(q);
const T = { t: {}, f: {} }, AR = new Intl.NumberFormat('ar-EG');
function tf() {
    const t = today();
    let ts = 0, fs = 0;
    for (let i = 0; i < 7; i++) {
        const d = addDays(t, -i);
        ts += +(T.t[d] && T.t[d].tasbih) || 0;
        fs += T.f[d] && T.f[d].fast ? 1 : 0;
    }
    q.querySelector('#tfLine').textContent = `التسبيح: النهارده ${AR.format(+(T.t[t] && T.t[t].tasbih) || 0)} • آخر 7 أيام ${AR.format(ts)} — أيام الصيام آخر 7 أيام: ${AR.format(fs)}`;
}
onAuthStateChanged(auth, u => { if (u)
    for (const k of ['t', 'f'])
        watchDays(u.uid, k + '_', 7, m => { T[k] = m; tf(); }, () => { }); });
tf();

