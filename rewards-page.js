// صفحة المكافآت: مستوى، سلسلة أيام، شارات، آخر نشاط
import { startShell, $ } from './shell.js';
import { setNum } from './ui.js';
import { today } from './logic.js';
import { levelInfo, BADGES, badgeEarned, effStreak } from './rewards.js';
const ICON = { task: '✅', focus: '⏱️', clear: '🎉', habit: '🔁', habitday: '🌈', goal: '🏁', finance: '💰', prayers: '🕌', sunnah: '🏡', adhkar: '📿', nafl: '✨', wird: '📖', khatma: '🌟' };
const WHEN = at => { const m = Math.round((Date.now() - at) / 60000); return m < 1 ? 'الآن' : m < 60 ? `منذ ${m} د` : m < 1440 ? `منذ ${Math.round(m / 60)} س` : `منذ ${Math.round(m / 1440)} يوم`; };
let first = true;
function render(s) {
    const i = levelInfo(s.xp), st = effStreak(s);
    setNum($('rwLevel'), i.level);
    $('rwTitle').textContent = i.title;
    $('rwRing').style.setProperty('--p', i.pct);
    $('rwBar').style.width = i.pct + '%';
    $('rwNext').textContent = `${i.into} / ${i.span} XP — باقي ${i.left} XP للمستوى ${i.level + 1}`;
    setNum($('rwStreak'), st);
    $('rwHint').textContent = !st ? 'ابدأ سلسلتك النهاردة بإنجاز مهمة' : s.lastDay === today() ? 'ممتاز! سلسلة اليوم محفوظة' : 'أنجز مهمة النهاردة عشان ما تنقطعش السلسلة';
    setNum($('rwXp'), s.xp);
    setNum($('rwTasks'), s.tasksDone);
    setNum($('rwFocus'), s.focusMinutes);
    setNum($('rwBest'), s.bestStreak);
    const earned = BADGES.filter(b => badgeEarned(b, s)).length;
    $('rwBadgeCount').textContent = `${earned} من ${BADGES.length}`;
    const g = $('badges');
    g.replaceChildren();
    for (const b of BADGES) {
        const [c, t] = b.goal(s), ok = c >= t, el = document.createElement('div');
        el.className = 'badge-card' + (ok ? ' on' : '');
        el.innerHTML = '<span class="b-ic"></span><b></b><small></small><i class="b-bar"><u></u></i>';
        el.querySelector('.b-ic').textContent = ok ? b.icon : '🔒';
        el.querySelector('b').textContent = b.name;
        el.querySelector('small').textContent = ok ? b.desc : `${b.desc} — ${Math.min(c, t)}/${t}`;
        el.querySelector('u').style.width = Math.min(100, c / t * 100) + '%';
        g.append(el);
    }
    const r = $('recent');
    r.replaceChildren();
    if (!s.recent.length) {
        const p = document.createElement('p');
        p.className = 'muted';
        p.textContent = 'لسه مفيش نشاط. أنجز مهمة أو ابدأ جلسة تركيز وهتظهر هنا.';
        r.append(p);
    }
    for (const e of s.recent) {
        const d = document.createElement('div');
        d.className = 'rec';
        d.innerHTML = '<span class="rec-i"></span><span class="rec-t"></span><b></b><small></small>';
        d.querySelector('.rec-i').textContent = ICON[e.t] || '⭐';
        d.querySelector('.rec-t').textContent = e.label || (e.t === 'focus' ? 'جلسة تركيز' : 'مهمة');
        d.querySelector('b').textContent = '+' + e.xp + ' XP';
        d.querySelector('small').textContent = WHEN(e.at);
        r.append(d);
    }
}
startShell({ onRewards: s => { render(s); if (first) {
        first = false;
        window.YomakLoader?.hide();
    } }, onTasks: () => { } });

