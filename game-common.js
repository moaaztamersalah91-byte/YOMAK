// أدوات مشتركة لقواعد الألعاب الأونلاين: الاستسلام + الانسحاب أثناء اللعب
import { toast } from './ui.js';
/** run(silent) لازم تتجاهل نفسها لو اللعبة مش شغالة. silent=true معناها الخروج من الغرفة (من غير تأكيد). */
export function forfeitUI(stage, root, run, label = '🏳️ استسلام') {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'on-btn';
    b.textContent = label;
    b.hidden = true;
    b.onclick = async () => {
        if (!confirm('متأكد إنك عايز تستسلم؟ الجولة هتتحسب خسارة.'))
            return;
        b.disabled = true;
        try {
            await run(false);
        }
        catch (e) {
            toast(e?.message || 'تعذر الاستسلام', 'error');
        }
        b.disabled = false;
    };
    root.append(b);
    stage._onlineLeave = async () => { try {
        await run(true);
    }
    catch { } };
    return { sync: active => { b.hidden = !active; } };
}
