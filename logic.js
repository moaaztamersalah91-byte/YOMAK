// YOMAK — منطق خالص (بدون DOM أو Firebase) لسهولة الاختبار
export const pad = n => String(n).padStart(2, '0');
export const ymd = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const today = () => ymd(new Date());
export const addDays = (s, n) => { const d = new Date(s + 'T00:00'); d.setDate(d.getDate() + n); return ymd(d); };
export const toMin = s => { const m = /^(\d{1,2}):(\d{2})/.exec(s || ''); return m ? +m[1] * 60 + +m[2] : null; };
export const fromMin = m => `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
export const fmt12 = m => { const h = Math.floor(m / 60) % 24, mm = m % 60; return `${(h % 12) || 12}:${pad(mm)} ${h < 12 ? 'ص' : 'م'}`; };
export const snap = (m, step = 15) => Math.round(m / step) * step;
export const ceil15 = m => Math.ceil(m / 15) * 15;
/* ---------- المكافآت ---------- */
export const XP = { low: 10, medium: 15, high: 25, clear: 30, habit: 5, habitDay: 20, goal: 100, finance: 5, prayers: 25, sunnah: 15, adhkar: 10, nafl: 5, wird: 20, khatma: 200, hifz: 5, hifzs: 50, review: 10 };
export const TITLES = ['مبتدئ', 'منظّم', 'منجز', 'متقدّم', 'محترف', 'خبير', 'قائد يومه', 'أسطورة'];
export const levelOf = xp => Math.floor(Math.sqrt(Math.max(0, xp) / 50)) + 1;
export const levelBase = l => 50 * (l - 1) * (l - 1);
export function levelInfo(xp) {
    const level = levelOf(xp), a = levelBase(level), b = levelBase(level + 1);
    return { level, title: TITLES[Math.min(level - 1, TITLES.length - 1)], into: xp - a, span: b - a, left: b - xp, pct: Math.round((xp - a) / (b - a) * 100) };
}
export const DEFAULT_STATS = { xp: 0, streak: 0, bestStreak: 0, lastDay: '', lastClearDay: '', clears: 0, tasksDone: 0, focusSessions: 0, focusMinutes: 0, habitsDone: 0, habitDays: 0, lastHabitDay: '', goalsDone: 0, expenseDays: 0, lastExpenseDay: '', badges: [], recent: [], prayerDays: 0, sunnahDays: 0, adhkarSets: 0, naflDone: 0, wirdDays: 0, khatmasDone: 0, onceDay: '', once: [], islStreak: 0, bestIslStreak: 0, lastIslDay: '' };
export const effIslStreak = (s, now = today()) => !s.lastIslDay ? 0 : (s.lastIslDay === now || s.lastIslDay === addDays(now, -1)) ? s.islStreak : 0;
export const effStreak = (s, now = today()) => !s.lastDay ? 0 : (s.lastDay === now || s.lastDay === addDays(now, -1)) ? s.streak : 0;
// goal: [القيمة الحالية، الهدف]
export const BADGES = [
    { id: 'first_task', icon: '🌱', name: 'البداية', desc: 'أنجز أول مهمة', goal: s => [s.tasksDone, 1] },
    { id: 'tasks_10', icon: '🎯', name: 'عشرة على عشرة', desc: 'أنجز 10 مهام', goal: s => [s.tasksDone, 10] },
    { id: 'tasks_50', icon: '🏅', name: 'ماكينة إنجاز', desc: 'أنجز 50 مهمة', goal: s => [s.tasksDone, 50] },
    { id: 'tasks_200', icon: '👑', name: 'ملك المهام', desc: 'أنجز 200 مهمة', goal: s => [s.tasksDone, 200] },
    { id: 'streak_3', icon: '🔥', name: 'ثلاثة متواصلة', desc: '3 أيام متتالية من الإنجاز', goal: s => [s.bestStreak, 3] },
    { id: 'streak_7', icon: '⚡', name: 'أسبوع كامل', desc: '7 أيام متتالية', goal: s => [s.bestStreak, 7] },
    { id: 'streak_30', icon: '🌟', name: 'شهر من الالتزام', desc: '30 يومًا متتاليًا', goal: s => [s.bestStreak, 30] },
    { id: 'focus_1', icon: '⏱️', name: 'أول جلسة تركيز', desc: 'أكمل جلسة تركيز واحدة', goal: s => [s.focusSessions, 1] },
    { id: 'focus_100', icon: '🧠', name: 'عقل صافي', desc: '100 دقيقة تركيز', goal: s => [s.focusMinutes, 100] },
    { id: 'focus_1000', icon: '🚀', name: 'تركيز خارق', desc: '1000 دقيقة تركيز', goal: s => [s.focusMinutes, 1000] },
    { id: 'clear_1', icon: '✅', name: 'يوم مكتمل', desc: 'أنهِ كل مهام يوم (3 مهام أو أكثر)', goal: s => [s.clears, 1] },
    { id: 'habit_1', icon: '🔁', name: 'أول عادة', desc: 'سجّل أول تشيك لعادة', goal: s => [s.habitsDone, 1] },
    { id: 'habit_100', icon: '💪', name: 'مداوم', desc: '100 تشيك عادات', goal: s => [s.habitsDone, 100] },
    { id: 'habit_day', icon: '🌈', name: 'يوم مثالي', desc: 'أنهِ كل عادات يوم (عادتين أو أكثر)', goal: s => [s.habitDays, 1] },
    { id: 'goal_1', icon: '🏁', name: 'محقق الأهداف', desc: 'حقّق هدفًا كاملًا', goal: s => [s.goalsDone, 1] },
    { id: 'fin_1', icon: '💰', name: 'أول تسجيل مالي', desc: 'سجّل أول معاملة', goal: s => [s.expenseDays, 1] },
    { id: 'fin_30', icon: '📒', name: 'محاسب شاطر', desc: 'سجّل مصروفاتك في 30 يومًا', goal: s => [s.expenseDays, 30] },
    { id: 'pray_1', icon: '🕌', name: 'يوم المحافظة', desc: 'صلِّ الخمس فروض في يوم', goal: s => [s.prayerDays, 1] },
    { id: 'pray_7', icon: '🌙', name: 'أسبوع الصلاة', desc: '7 أيام أكملت فيها الصلوات الخمس', goal: s => [s.prayerDays, 7] },
    { id: 'pray_30', icon: '🕋', name: 'ثابت على الصلاة', desc: '30 يومًا أكملت فيها الصلوات الخمس', goal: s => [s.prayerDays, 30] },
    { id: 'sunnah_1', icon: '🏡', name: 'بيت في الجنة', desc: 'أتمّ السنن الرواتب (12 ركعة) في يوم', goal: s => [s.sunnahDays, 1] },
    { id: 'sunnah_30', icon: '🌿', name: 'محافظ على السنن', desc: '30 يومًا أتممت فيها السنن الرواتب', goal: s => [s.sunnahDays, 30] },
    { id: 'nafl_20', icon: '✨', name: 'قيّام الليل والضحى', desc: '20 نافلة (ضحى / وتر / قيام)', goal: s => [s.naflDone, 20] },
    { id: 'adhkar_1', icon: '📿', name: 'ذاكر', desc: 'أتمّ مجموعة أذكار كاملة', goal: s => [s.adhkarSets, 1] },
    { id: 'adhkar_50', icon: '💎', name: 'لسان رطب بالذكر', desc: 'أتمّ 50 مجموعة أذكار', goal: s => [s.adhkarSets, 50] },
    { id: 'wird_7', icon: '📖', name: 'صاحب ورد', desc: '7 أيام أتممت فيها ورد القرآن', goal: s => [s.wirdDays, 7] },
    { id: 'khatma_1', icon: '🌟', name: 'ختمة مباركة', desc: 'أتمّ ختمة كاملة', goal: s => [s.khatmasDone, 1] },
    { id: 'isl_7', icon: '🔥', name: 'سلسلة إسلاميات', desc: '7 أيام متتالية من الطاعات في إسلاميات', goal: s => [s.bestIslStreak, 7] },
    { id: 'isl_30', icon: '🏆', name: 'شهر من الطاعة', desc: '30 يومًا متتاليًا في إسلاميات', goal: s => [s.bestIslStreak, 30] },
    { id: 'level_5', icon: '🏆', name: 'المستوى الخامس', desc: 'ابلغ المستوى 5', goal: s => [levelOf(s.xp), 5] }
];
export const badgeEarned = (b, s) => { const [c, t] = b.goal(s); return c >= t; };
/* ---------- المخطط اليومي ---------- */
// يوزّع العناصر المتداخلة على "حارات" جنبًا إلى جنب. items: [{s,e}] بالدقائق
export function layoutLanes(items) {
    items.sort((a, b) => a.s - b.s || b.e - a.e);
    const groups = [];
    let cur = [], end = -1;
    for (const it of items) {
        if (cur.length && it.s >= end) {
            groups.push(cur);
            cur = [];
            end = -1;
        }
        cur.push(it);
        end = Math.max(end, it.e);
    }
    if (cur.length)
        groups.push(cur);
    for (const g of groups) {
        const lanes = [];
        for (const it of g) {
            let l = lanes.findIndex(e => e <= it.s);
            if (l < 0) {
                l = lanes.length;
                lanes.push(0);
            }
            lanes[l] = it.e;
            it.lane = l;
        }
        for (const it of g)
            it.lanes = lanes.length;
    }
    return items;
}
// أول فجوة فاضية طولها dur تبدأ من from قبل end. busy: [{s,e}] — يرجع -1 لو مفيش
export function findSlot(busy, from, dur, end) {
    let s = ceil15(from);
    for (const b of [...busy].sort((x, y) => x.s - y.s)) {
        if (b.e <= s)
            continue;
        if (b.s >= s + dur)
            break;
        s = ceil15(b.e);
    }
    return s + dur <= end ? s : -1;
}
/* ---------- العادات ---------- */
// freq: مصفوفة أيام الأسبوع (0=الأحد … 6=السبت بحسب Date.getDay). فاضية/غير موجودة = كل يوم
export const wd = day => new Date(day + 'T12:00').getDay();
export const isDue = (h, day) => !h.days || !h.days.length || h.days.includes(wd(day));
// السلسلة الحالية: أيام مجدولة متتالية منجزة. اليوم الحالي غير المنجز لا يقطع السلسلة (لسه فيه وقت)
export function habitStreak(h, now = today()) {
    const done = new Set(h.done || []);
    let n = 0, d = now, guard = 0;
    if (isDue(h, d) && !done.has(d))
        d = addDays(d, -1);
    while (guard++ < 1000) {
        if (!isDue(h, d)) {
            d = addDays(d, -1);
            continue;
        }
        if (done.has(d)) {
            n++;
            d = addDays(d, -1);
        }
        else
            break;
    }
    return n;
}
export function habitBest(h) {
    const days = [...new Set(h.done || [])].sort();
    if (!days.length)
        return 0;
    let best = 0, run = 0, prev = '';
    for (const d of days) {
        if (!isDue(h, d)) {
            continue;
        }
        if (prev) {
            let k = addDays(prev, 1), gap = false;
            while (k < d) {
                if (isDue(h, k)) {
                    gap = true;
                    break;
                }
                k = addDays(k, 1);
            }
            run = gap ? 1 : run + 1;
        }
        else
            run = 1;
        best = Math.max(best, run);
        prev = d;
    }
    return best;
}
// نسبة الالتزام خلال آخر n يوم (الأيام المجدولة فقط، من تاريخ إنشاء العادة)
export function habitRate(h, n = 30, now = today()) {
    const done = new Set(h.done || []);
    let due = 0, ok = 0;
    for (let i = 0; i < n; i++) {
        const d = addDays(now, -i);
        if (h.start && d < h.start)
            break;
        if (!isDue(h, d))
            continue;
        due++;
        if (done.has(d))
            ok++;
    }
    return due ? Math.round(ok / due * 100) : 0;
}
/* ---------- الأهداف ---------- */
// تقدّم المرحلة: من المهام المرتبطة بها، وإن لم يكن لها مهام فبالتأشير اليدوي
export function milestonePct(m, byId) {
    const ts = (m.taskIds || []).map(i => byId[i]).filter(Boolean);
    return ts.length ? Math.round(ts.filter(t => t.completed).length / ts.length * 100) : (m.done ? 100 : 0);
}
// تقدّم الهدف: متوسط المراحل + (المهام المباشرة كمرحلة إضافية لو موجودة)
export function goalProgress(g, byId) {
    const parts = (g.milestones || []).map(m => milestonePct(m, byId));
    const direct = (g.taskIds || []).map(i => byId[i]).filter(Boolean);
    if (direct.length)
        parts.push(Math.round(direct.filter(t => t.completed).length / direct.length * 100));
    return parts.length ? Math.round(parts.reduce((a, b) => a + b, 0) / parts.length) : 0;
}
export const goalEnd = g => g.type === 'year' ? `${g.period}-12-31` : ymd(new Date(+g.period.slice(0, 4), +g.period.slice(5, 7), 0, 12));
export const goalStart = g => g.type === 'year' ? `${g.period}-01-01` : `${g.period}-01`;
export const daysBetween = (a, b) => Math.round((new Date(b + 'T12:00') - new Date(a + 'T12:00')) / 864e5);
// حالة الهدف: done | late (المدة خلصت) | behind (التقدّم أقل من الزمن المنقضي بفارق كبير) | track
export function goalStatus(g, pct, now = today()) {
    if (pct >= 100)
        return 'done';
    const s = goalStart(g), e = goalEnd(g);
    if (now > e)
        return 'late';
    if (now < s)
        return 'track';
    const total = daysBetween(s, e) + 1, spent = daysBetween(s, now) + 1;
    return pct + 15 < spent / total * 100 ? 'behind' : 'track';
}
/* ---------- المصروفات ---------- */
export const monthOf = d => String(d).slice(0, 7);
export const addMonths = (m, n) => { const [y, mo] = m.split('-').map(Number); const d = new Date(y, mo - 1 + n, 1, 12); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`; };
export const daysInMonth = m => { const [y, mo] = m.split('-').map(Number); return new Date(y, mo, 0).getDate(); };
export function summarize(txs, month) {
    const r = { income: 0, expense: 0, byCat: {}, byDay: {}, incByCat: {}, count: 0 };
    for (const t of txs) {
        if (monthOf(t.date) !== month)
            continue;
        r.count++;
        if (t.type === 'income') {
            r.income += t.amount;
            r.incByCat[t.category] = (r.incByCat[t.category] || 0) + t.amount;
        }
        else {
            r.expense += t.amount;
            r.byCat[t.category] = (r.byCat[t.category] || 0) + t.amount;
            r.byDay[t.date] = (r.byDay[t.date] || 0) + t.amount;
        }
    }
    return r;
}
// توقّع إجمالي صرف الشهر بناءً على المتوسط اليومي حتى الآن
export function forecast(spent, month, now = today()) {
    const cur = monthOf(now);
    if (cur < month)
        return 0;
    const dim = daysInMonth(month), el = cur > month ? dim : +now.slice(8, 10);
    return el ? Math.round(spent / el * dim) : 0;
}
export const budgetState = (spent, limit) => !limit ? 'none' : spent >= limit ? 'over' : spent >= limit * .8 ? 'warn' : 'ok';
export const pctChange = (cur, prev) => prev ? Math.round((cur - prev) / prev * 100) : null;
export function parseAmount(v) {
    let x = String(v).replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/٫/g, '.').replace(/،/g, ',').replace(/\s/g, '');
    x = x.replace(/,(?=\d{3}(\D|$))/g, '').replace(',', '.'); // 1,500 = ألف وخمسمية، 1,5 = 1.5
    const n = parseFloat(x.replace(/[^0-9.]/g, ''));
    return Number.isFinite(n) && n > 0 && n <= 1e9 ? Math.round(n * 100) / 100 : 0;
}

