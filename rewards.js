// YOMAK Rewards — نقاط XP ومستويات وسلاسل وشارات (محفوظة في Firestore)
import { db } from './firebase.js';
import { doc, onSnapshot, runTransaction, updateDoc, serverTimestamp, deleteField } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js';
import { toast, burst } from './ui.js';
import { XP, levelOf, levelInfo, DEFAULT_STATS, BADGES, badgeEarned, effStreak, today, addDays } from './logic.js';
import { effIslStreak } from './logic.js';
export { XP, levelInfo, BADGES, badgeEarned, effStreak, DEFAULT_STATS };
const ref = uid => doc(db, 'users', uid, 'stats', 'rewards');
const clean = d => ({ ...DEFAULT_STATS, ...(d || {}) });
export function subscribeRewards(uid, cb, onErr) {
    return onSnapshot(ref(uid), s => cb(clean(s.exists() ? s.data() : null)), e => onErr && onErr(e));
}
/** award(uid,{type:'task'|'focus'|'clear'|'habit'|'habitday'|'goal'|'finance', xp, minutes?, label}) */
export async function award(uid, { type, xp, minutes = 0, label = '', key = '', total = 0 }) {
    return runTransaction(db, async (tx) => {
        const snap = await tx.get(ref(uid));
        const s = clean(snap.exists() ? snap.data() : null);
        const day = today();
        if (type === 'clear' && s.lastClearDay === day)
            return { skipped: true };
        if (type === 'habitday' && s.lastHabitDay === day)
            return { skipped: true };
        if (type === 'finance' && s.lastExpenseDay === day)
            return { skipped: true };
        const ISL = ['prayers', 'sunnah', 'adhkar', 'nafl', 'wird', 'khatma', 'hifz', 'hifzs', 'review'].includes(type);
        if (ISL) {
            if (s.onceDay !== day) {
                s.onceDay = day;
                s.once = [];
            }
            const k = type + (key ? ':' + key : '');
            if (type === 'khatma') {
                if (!(total > s.khatmasDone))
                    return { skipped: true };
            }
            else if (s.once.includes(k))
                return { skipped: true };
            else
                s.once = [...s.once, k];
        }
        const before = s.xp, lvBefore = levelOf(before);
        s.xp += xp;
        if (type === 'task')
            s.tasksDone += 1;
        if (type === 'focus') {
            s.focusSessions += 1;
            s.focusMinutes += minutes;
        }
        if (type === 'clear') {
            s.clears += 1;
            s.lastClearDay = day;
        }
        if (type === 'habit')
            s.habitsDone += 1;
        if (type === 'habitday') {
            s.habitDays += 1;
            s.lastHabitDay = day;
        }
        if (type === 'goal')
            s.goalsDone += 1;
        if (type === 'finance') {
            s.expenseDays += 1;
            s.lastExpenseDay = day;
        }
        if (type === 'prayers')
            s.prayerDays += 1;
        if (type === 'sunnah')
            s.sunnahDays += 1;
        if (type === 'adhkar')
            s.adhkarSets += 1;
        if (type === 'nafl')
            s.naflDone += 1;
        if (type === 'wird')
            s.wirdDays += 1;
        if (type === 'khatma')
            s.khatmasDone = total;
        if (ISL && type !== 'khatma' && s.lastIslDay !== day) {
            s.islStreak = s.lastIslDay === addDays(day, -1) ? s.islStreak + 1 : 1;
            s.lastIslDay = day;
            s.bestIslStreak = Math.max(s.bestIslStreak, s.islStreak);
        }
        if (!['clear', 'habitday', 'goal', 'finance', 'prayers', 'sunnah', 'adhkar', 'nafl', 'wird', 'khatma', 'hifz', 'hifzs', 'review'].includes(type) && s.lastDay !== day) {
            s.streak = s.lastDay === addDays(day, -1) ? s.streak + 1 : 1;
            s.lastDay = day;
            s.bestStreak = Math.max(s.bestStreak, s.streak);
        }
        const fresh = BADGES.filter(b => !s.badges.includes(b.id) && badgeEarned(b, s)).map(b => b.id);
        s.badges = [...s.badges, ...fresh];
        s.recent = [{ t: type, xp, label: String(label).slice(0, 60), at: Date.now() }, ...s.recent].slice(0, 10);
        tx.set(ref(uid), { ...s, updatedAt: serverTimestamp() });
        return { xp, levelUp: levelOf(s.xp) > lvBefore ? levelOf(s.xp) : 0, fresh, stats: s };
    });
}
/** إشعارات الجوائز: +XP، ترقية مستوى، شارات جديدة */
export function notify(r) {
    if (!r || r.skipped)
        return;
    toast(`+${r.xp} XP ⭐`, 'success', 2600);
    if (r.levelUp) {
        window.SFX && SFX.play('levelup');
        const i = levelInfo(r.stats.xp);
        setTimeout(() => { toast(`ترقية! وصلت للمستوى ${i.level} — ${i.title} 🎉`, 'success', 4500); burst(innerWidth / 2, innerHeight / 3, true); }, 500);
    }
    r.fresh.slice(0, 2).forEach((id, k) => {
        const b = BADGES.find(x => x.id === id);
        if (b)
            setTimeout(() => toast(`شارة جديدة: ${b.icon} ${b.name}`, 'success', 4200), 1000 + k * 700);
    });
}
/** إنجاز/إلغاء إنجاز مهمة مع منح النقاط مرة واحدة فقط لكل مهمة */
export async function setTaskCompleted(uid, task, completed, extra = {}) {
    const first = completed && !task.rewarded;
    await updateDoc(doc(db, 'users', uid, 'tasks', task.id), { ...(first ? { completed: true, rewarded: true } : { completed }), doneDay: completed ? today() : deleteField(), ...extra });
    if (!first)
        return null;
    try {
        const r = await award(uid, { type: 'task', xp: XP[task.priority] || XP.medium, label: task.title });
        notify(r);
        return r;
    }
    catch (e) {
        toast('تم حفظ المهمة، لكن تعذّر تسجيل النقاط. انشر قواعد Firestore المحدّثة.', 'error', 6000);
        return null;
    }
}
export async function awardClear(uid) {
    try {
        notify(await award(uid, { type: 'clear', xp: XP.clear, label: 'أنهيت كل مهام اليوم' }));
    }
    catch (e) { }
}
/** شارة XP في الشريط الجانبي (تظهر في كل الصفحات) */
let chip = null, unsub = null;
export function mountXpChip(uid) {
    if (unsub) {
        unsub();
        unsub = null;
    }
    if (!chip || !chip.isConnected) {
        chip = document.createElement('a');
        chip.className = 'xp-chip';
        chip.href = 'rewards.html';
        chip.setAttribute('aria-label', 'المكافآت');
        chip.innerHTML = '<span class="xp-lvl">1</span><span class="xp-meta"><b>مبتدئ</b><small>0 XP</small><i class="xp-bar"><u></u></i></span><span class="xp-fire" hidden></span>';
        const slot = document.querySelector('aside .aside-bottom');
        if (slot)
            slot.before(chip);
        else
            return;
    }
    unsub = subscribeRewards(uid, s => {
        const i = levelInfo(s.xp), st = effStreak(s);
        chip.querySelector('.xp-lvl').textContent = i.level;
        chip.querySelector('b').textContent = i.title;
        chip.querySelector('small').textContent = `${s.xp} XP`;
        chip.querySelector('u').style.width = i.pct + '%';
        const f = chip.querySelector('.xp-fire');
        f.hidden = !st;
        f.textContent = '🔥 ' + st;
    });
}
/** XP للعادات: +5 لكل تشيك (مرة واحدة لكل عادة في اليوم — يتحكم فيها المستدعي)، و+20 عند إنهاء كل عادات اليوم */
export async function awardHabit(uid, label, allDone) {
    try {
        const r = await award(uid, { type: 'habit', xp: XP.habit, label });
        if (allDone) {
            const b = await award(uid, { type: 'habitday', xp: XP.habitDay, label: 'أنهيت كل عادات اليوم' });
            if (b && !b.skipped) {
                b.fresh = [...new Set([...(r.fresh || []), ...b.fresh])];
                b.xp += r.xp;
                b.levelUp = b.levelUp || r.levelUp;
                notify(b);
                return b;
            }
        }
        notify(r);
        return r;
    }
    catch (e) {
        toast('تم تسجيل العادة، لكن تعذّر تسجيل النقاط. انشر قواعد Firestore المحدّثة.', 'error', 6000);
        return null;
    }
}
export async function awardGoal(uid, title) {
    try {
        const r = await award(uid, { type: 'goal', xp: XP.goal, label: 'حققت هدف: ' + title });
        notify(r);
        return r;
    }
    catch (e) {
        return null;
    }
}
/** +5 XP لأول معاملة مسجّلة في اليوم */
export async function awardFinance(uid) {
    try {
        const r = await award(uid, { type: 'finance', xp: XP.finance, label: 'سجّلت معاملة مالية' });
        notify(r);
        return r;
    }
    catch (e) {
        return null;
    }
}
/** إنجازات إسلاميات: type = prayers | sunnah | adhkar(key=tab) | nafl(key=id) | wird | khatma(total) — مرة واحدة في اليوم لكل مفتاح */
export async function awardIslamic(uid, type, label, { key = '', total = 0 } = {}) {
    try {
        const r = await award(uid, { type, xp: XP[type], label, key, total });
        notify(r);
        return r;
    }
    catch (e) {
        return null;
    }
}

