// نوافذ الاختيار: Username العام (إجباري أول مرة) + اسم اللاعب الخاص بكل لعبة
import { setUsername, setGameName, setProfilePhoto, checkName, errText, toAvatar, avatarEl, MAX_IN } from './username.js';
import { GAMES } from './games-list.js';
import { toast, setLoading } from './ui.js';
const mk = (t, c, x) => { const e = document.createElement(t); if (c)
    e.className = c; if (x != null)
    e.textContent = x; return e; };
function ask({ title, desc, label, ph, value = '', mandatory, ok, max = 16, check, save, photo = '' }) {
    return new Promise(res => {
        const dlg = mk('dialog', 'gm-dlg'), f = mk('form'), h = mk('div', 'dialog-head');
        h.append(mk('h2', '', title));
        if (!mandatory) {
            const x = mk('button', 'icon-btn', '✕');
            x.type = 'button';
            x.setAttribute('aria-label', 'إغلاق');
            x.onclick = () => close(null);
            h.append(x);
        }
        const p = mk('p', 'muted', desc), l = mk('label', '', label), i = mk('input');
        i.value = value;
        i.maxLength = max;
        i.placeholder = ph;
        i.autocomplete = 'off';
        i.required = true;
        l.append(i);
        const er = mk('div', 'error');
        er.setAttribute('role', 'alert');
        const a = mk('div', 'dialog-actions'), b = mk('button', '', ok);
        b.type = 'submit';
        a.append(b);
        let pic;
        const row = mk('div', 'gm-photo'), pv = mk('span', 'gm-pv'), pb = mk('button', 'secondary', '📷 اختار صورة'), pd = mk('button', 'secondary', 'حذف'), fi = mk('input');
        fi.type = 'file';
        fi.accept = 'image/*';
        fi.hidden = true;
        pb.type = pd.type = 'button';
        const paint = () => { const cur = pic === undefined ? photo : pic; pv.replaceChildren(avatarEl(value || i.value || '?', null, cur, 'big')); pd.hidden = !cur; };
        pb.onclick = () => fi.click();
        pd.onclick = () => { pic = ''; paint(); };
        fi.onchange = async () => {
            const f = fi.files[0];
            if (!f)
                return;
            er.textContent = '';
            pb.disabled = true;
            try {
                pic = await toAvatar(f);
                paint();
                if (f.size > MAX_IN)
                    toast('الصورة أكبر من 10MB، اتضغطت تلقائيًا ✓', 'info');
            }
            catch (x) {
                er.textContent = errText(x);
            }
            pb.disabled = false;
            fi.value = '';
        };
        row.append(pv, pb, pd, fi);
        paint();
        i.addEventListener('input', paint);
        if (!mandatory) {
            const c = mk('button', 'secondary', 'إلغاء');
            c.type = 'button';
            c.onclick = () => close(null);
            a.append(c);
        }
        f.append(h, p, row, l, er, a);
        dlg.append(f);
        document.body.append(dlg);
        const close = v => { dlg.close(); dlg.remove(); res(v); };
        dlg.addEventListener('cancel', e => { if (mandatory)
            e.preventDefault();
        else
            close(null); });
        f.onsubmit = async (e) => {
            e.preventDefault();
            er.textContent = '';
            const c = check(i.value);
            if (c.err) {
                er.textContent = c.err;
                return;
            }
            setLoading(b, true);
            try {
                close(await save(i.value, pic));
            }
            catch (x) {
                er.textContent = errText(x);
                setLoading(b, false);
            }
        };
        dlg.showModal();
        i.focus();
    });
}
/** Username العام: mandatory=true يمنع الإغلاق لحد ما يختار اسم */
export const promptUsername = (uid, { mandatory = false, value = '', photo = '' } = {}) => ask({
    photo,
    title: mandatory ? 'اختار Username' : 'تغيير الـ Username', mandatory, value, ok: 'حفظ', label: 'Username (الأصحاب هيضيفوك بيه)', ph: 'عربي أو إنجليزي، 3 لـ 16 حرف',
    desc: mandatory ? 'ده اسمك بين أصحابك في الألعاب. لازم يكون فريد، وتقدر تغيّره بعد كده مرة كل 30 يوم.' : 'تقدر تغيّره مرة كل 30 يوم، والاسم القديم بيتحجز لك 14 يوم.',
    check: v => checkName(v, { reserve: true }), save: async (v, ph) => { const c = await setUsername(uid, v); if (ph !== undefined)
        await setProfilePhoto(uid, ph); toast(`أهلًا ${c.name} 🎮`, 'success'); return c.name; }
});
/** اسم اللاعب داخل لعبة معيّنة. بيرجّع الاسم المحفوظ لو موجود (إلا لو force) */
export async function ensureGameName(uid, gameId, names = {}, { force = false } = {}) {
    const cur = names[gameId]?.name;
    if (cur && !force)
        return cur;
    const g = GAMES.find(x => x.id === gameId);
    return ask({ photo: names[gameId]?.photo || '', title: `اسمك في ${g?.t || 'اللعبة'}`, mandatory: false, value: cur || '', ok: 'تمام', label: 'اسم اللاعب', ph: '2 لـ 16 حرف',
        desc: 'الاسم والصورة دول بيظهروا لك ولأصحابك جوه اللعبة دي بس، والاسم لازم يكون مش مستخدم فيها.',
        check: v => checkName(v, { min: 2, max: 16 }), save: async (v, ph) => { const n = await setGameName(uid, gameId, v, ph); toast(`اتحفظ اسمك: ${n}`, 'success'); return n; } });
}

