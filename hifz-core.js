// متابعة الحفظ: مزامنة Firestore + إحصائيات (مشتركة بين المصحف وصفحة الإحصائيات)
import { iref, mk } from './islamic.js';
import { saveSettings } from './islamic.js';
import { setDoc, increment, serverTimestamp, deleteField } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js';
import { today } from './logic.js';
import { SURAHS } from './quran-data.js';
export const TOTAL = 6236;
const AR = new Intl.NumberFormat('ar-EG');
/** حفظ/مسح عنصر: key = s:<سورة> أو a:<سورة>:<آية> */
export const hzSave = (uid, key, v) => saveSettings(uid, { qhz: { [key]: v || deleteField() } });
/** عدّاد نشاط الحفظ اليومي (للـ Heatmap): h_YYYY-MM-DD */
export const hzDay = uid => setDoc(iref(uid, 'h_' + today()), { hz: increment(1), updatedAt: serverTimestamp() }, { merge: true });
export function hzStats(hz) {
    const set = new Set(), rev = new Set();
    let sm = 0, sr = 0;
    for (const [k, v] of Object.entries(hz || {})) {
        const [t, s, a] = k.split(':'), sx = SURAHS[+s - 1];
        if (!sx)
            continue;
        const tgt = v.st === 'm' ? set : rev;
        if (t === 's') {
            v.st === 'm' ? sm++ : sr++;
            for (let i = 1; i <= sx.ayahs; i++)
                tgt.add(s + ':' + i);
        }
        else if (a)
            tgt.add(s + ':' + a);
    }
    for (const x of set)
        rev.delete(x);
    const now = Date.parse(today()), due = Object.values(hz || {}).filter(v => (now - Date.parse(v.d)) / 864e5 >= (v.st === 'r' ? 3 : 7)).length;
    return { sm, sr, am: set.size, ar: rev.size, pct: Math.round(set.size / TOTAL * 1000) / 10, due };
}
export function renderHifzStats(box, hz) {
    const s = hzStats(hz);
    box.replaceChildren();
    const g = mk('div', 'hz-grid');
    [['سور محفوظة', s.sm], ['سور قيد المراجعة', s.sr], ['آيات محفوظة', s.am], ['آيات قيد المراجعة', s.ar], ['مستحق مراجعته', s.due]].forEach(([l, v]) => {
        const c = mk('article', 'hz-card');
        c.append(mk('span', '', l), mk('strong', '', AR.format(v)));
        g.append(c);
    });
    const bar = mk('div', 'isl-bar'), u = document.createElement('u');
    u.style.width = Math.min(100, s.pct) + '%';
    bar.append(u);
    box.append(g, bar, mk('p', 'muted', `${AR.format(s.am)} من ${AR.format(TOTAL)} آية — ${AR.format(s.pct)}٪ من القرآن`));
}

