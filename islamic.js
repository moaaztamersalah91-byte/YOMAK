// مساعدات مشتركة لصفحات إسلاميات (الصلاة / الأذكار / ورد القرآن)
import { db } from './firebase.js';
import { doc, collection, query, where, documentId, onSnapshot, setDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js';
import { today, addDays } from './logic.js';
export const iref = (uid, id) => doc(db, 'users', uid, 'islamic', id);
export const watchSettings = (uid, cb, err) => onSnapshot(iref(uid, 'settings'), s => cb(s.exists() ? s.data() : {}), err);
export const saveSettings = (uid, patch) => setDoc(iref(uid, 'settings'), { ...patch, updatedAt: serverTimestamp() }, { merge: true });
export const saveDay = (uid, prefix, day, data) => setDoc(iref(uid, prefix + day), { ...data, updatedAt: serverTimestamp() });
/** آخر n يوم من مستندات بادئتها prefix (p_ / a_ / q_) كخريطة {YYYY-MM-DD: data} */
export function watchDays(uid, prefix, n, cb, err) {
    const t = today();
    return onSnapshot(query(collection(db, 'users', uid, 'islamic'), where(documentId(), '>=', prefix + addDays(t, -(n - 1))), where(documentId(), '<=', prefix + t)), s => { const m = {}; s.docs.forEach(d => { m[d.id.slice(prefix.length)] = d.data(); }); cb(m); }, err);
}
/** أيام متتالية تحقق الشرط (اليوم الحالي غير المكتمل لا يقطع السلسلة) */
export function streakOf(map, t, ok) { let d = t, n = 0; if (!ok(map[d]))
    d = addDays(d, -1); while (ok(map[d])) {
    n++;
    d = addDays(d, -1);
} return n; }
export const mk = (tag, cls, text) => { const e = document.createElement(tag); if (cls)
    e.className = cls; if (text != null)
    e.textContent = text; return e; };
const WD = new Intl.DateTimeFormat('ar-EG-u-nu-latn', { weekday: 'short' });
export function weekBars(box, valFn, max, unit = '') {
    box.replaceChildren();
    const t = today();
    for (let i = 6; i >= 0; i--) {
        const d = addDays(t, -i), v = valFn(d) || 0, w = mk('div', 'isl-wd' + (d === t ? ' now' : '')), bar = mk('div', 'isl-wb'), f = mk('i');
        f.style.height = Math.min(100, v / max * 100) + '%';
        f.title = `${v}${unit}`;
        bar.append(f);
        w.append(mk('b', '', String(v)), bar, mk('small', '', WD.format(new Date(d + 'T12:00'))));
        box.append(w);
    }
}

