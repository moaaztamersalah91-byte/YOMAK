// محرك التذكيرات: إشعار في وقت كل عادة + تنبيه المساء لو السلسلة هتنقطع. يشتغل في كل صفحات اللوحة.
import { auth, db } from './firebase.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js';
import { collection, onSnapshot } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js';
import { toast } from './ui.js';
import { supported, permission, enable, deviceNotify } from './notify.js';
import { doc } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js';
import { timesFor, PRAYERS, CITIES } from './prayer-times.js';
import { fastInfo } from './sawm-days.js';
import { today, addDays, toMin, isDue, habitStreak } from './logic.js';
export { supported, permission, enable };
const EVENING = 21 * 60, MORNING = 9 * 60, WINDOW = 180;
let isl = {}, habits = [], tasks = [], timer = null, unsub = null, unsubT = null, unsubI = null;
const sentKey = 'yomak.rem.sent';
function sent() { try {
    const o = JSON.parse(localStorage.getItem(sentKey) || '{}');
    return o.day === today() ? o : { day: today(), k: [] };
}
catch (e) {
    return { day: today(), k: [] };
} }
const mark = k => { try {
    const o = sent();
    o.k.push(k);
    localStorage.setItem(sentKey, JSON.stringify(o));
}
catch (e) { } };
async function notify(key, title, body, url = 'habits.html') {
    mark(key);
    const shown = await deviceNotify(title, body, { url, tag: key });
    if (!shown || document.visibilityState === 'visible')
        toast(`🔔 ${title} — ${body}`, 'info', 7000);
}
export function tick(now = new Date()) {
    const t = today(), min = now.getHours() * 60 + now.getMinutes(), s = new Set(sent().k);
    for (const h of habits) {
        if (!h.remind || !isDue(h, t) || (h.done || []).includes(t))
            continue;
        const at = toMin(h.remind), key = 'h:' + h.id;
        if (at != null && min >= at && min < at + WINDOW && !s.has(key))
            notify(key, h.name, `وقت العادة ${h.icon || ''}`.trim());
    }
    if (isl.adhan) {
        const c = isl.city && isl.city.lat != null ? isl.city : { lat: CITIES[0][1], lng: CITIES[0][2] }, T = timesFor(now, c.lat, c.lng);
        for (const [k, n] of PRAYERS) {
            const at = T[k];
            if (at != null && min >= at && min < at + 10 && !s.has('pr:' + k)) {
                notify('pr:' + k, `حان وقت صلاة ${n} 🕌`, 'حيّ على الصلاة', 'prayer.html');
            }
        }
    }
    if (isl.fremind && min >= 20 * 60) {
        const tm = new Date(now.getTime() + 864e5), f = fastInfo(tm), k = 'sw:' + tm.toDateString();
        if (!f.forbidden && !f.ramadan && f.reasons.length && !s.has(k))
            notify(k, 'صيام بكرة 🌙', f.reasons.join(' • '), 'sawm.html');
    }
    const open = tasks.filter(x => !x.completed && x.dueDate === t);
    for (const x of open) {
        const at = toMin(x.dueTime), key = 't:' + x.id;
        if (at != null && min >= at && min < at + WINDOW && !s.has(key))
            notify(key, x.title, 'حان موعد المهمة ⏰', 'today.html');
    }
    if (min >= MORNING && min < MORNING + WINDOW && !s.has('morning')) {
        if (open.length)
            notify('morning', 'صباح الخير ☀️', open.length === 1 ? `عندك مهمة النهارده: «${open[0].title}»` : `عندك ${open.length} مهام النهارده`, 'today.html');
        else
            mark('morning');
    }
    if (min >= EVENING && !s.has('evening')) {
        const risk = habits.filter(h => isDue(h, t) && !(h.done || []).includes(t) && habitStreak(h) >= 2);
        if (risk.length) {
            const top = risk.sort((a, b) => habitStreak(b) - habitStreak(a))[0];
            notify('evening', 'سلسلتك هتنقطع 🔥', risk.length === 1 ? `«${top.name}» — ${habitStreak(top)} أيام متواصلة` : `${risk.length} عادات منهم «${top.name}» (${habitStreak(top)} أيام)`);
        }
        else
            mark('evening');
    }
}
onAuthStateChanged(auth, u => {
    unsub && unsub();
    unsub = null;
    habits = [];
    unsubT && unsubT();
    unsubT = null;
    tasks = [];
    unsubI && unsubI();
    unsubI = null;
    isl = {};
    if (!u)
        return;
    unsub = onSnapshot(collection(db, 'users', u.uid, 'habits'), snap => { habits = snap.docs.map(d => ({ id: d.id, ...d.data() })); tick(); }, () => { });
    unsubI = onSnapshot(doc(db, 'users', u.uid, 'islamic', 'settings'), s => { isl = s.exists() ? s.data() : {}; tick(); }, () => { });
    unsubT = onSnapshot(collection(db, 'users', u.uid, 'tasks'), snap => { tasks = snap.docs.map(d => ({ id: d.id, ...d.data() })); tick(); }, () => { });
    if (!timer) {
        timer = setInterval(() => tick(), 30000);
        document.addEventListener('visibilitychange', () => tick());
    }
});

