// YOMAK shell: مصادقة + اشتراك المهام + شريط جانبي — مشترك بين صفحات الأدوات الجديدة
import { auth, db } from './firebase.js';
import { onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js';
import { collection, onSnapshot, query, orderBy } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js';
import { toast, setLoading, setNum } from './ui.js';
import { mountXpChip, subscribeRewards } from './rewards.js';
import { today } from './logic.js';
export const $ = id => document.getElementById(id);
export const errMsg = e => ({ 'permission-denied': 'تحقق من قواعد أمان Firestore (انشر firestore.rules المحدّث)' })[e.code] || e.message || 'حدث خطأ غير متوقع';
const stamp = t => t.dueDate + (t.dueTime ? 'T' + t.dueTime : 'T23:59:59');
export const isLate = t => !t.completed && new Date(stamp(t)).getTime() < Date.now();
export function startShell({ onUser, onTasks, onRewards } = {}) {
    const page = document.body.dataset.page;
    document.querySelectorAll('#nav a[data-page]').forEach(a => { const on = a.dataset.page === page; a.classList.toggle('active', on); if (on)
        a.setAttribute('aria-current', 'page'); });
    document.querySelector('#nav a.active')?.scrollIntoView({ inline: 'center', block: 'nearest' });
    if ($('dateLabel'))
        $('dateLabel').textContent = new Intl.DateTimeFormat('ar-EG-u-nu-latn', { dateStyle: 'full' }).format(new Date());
    $('logout').onclick = async (e) => { setLoading(e.currentTarget, true); try {
        await signOut(auth);
    }
    catch (err) {
        setLoading(e.currentTarget, false);
        toast(errMsg(err), 'error');
    } };
    let unT = null, unR = null, first = true;
    onAuthStateChanged(auth, u => {
        unT && unT();
        unR && unR();
        unT = unR = null;
        if (!u) {
            location.replace('login.html');
            return;
        }
        $('userEmail').textContent = u.email || 'حساب Google';
        mountXpChip(u.uid);
        onUser && onUser(u);
        unT = onSnapshot(query(collection(db, 'users', u.uid, 'tasks'), orderBy('createdAt', 'desc')), snap => {
            const tasks = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            const nt = tasks.filter(x => x.dueDate === today()).length, nl = tasks.filter(isLate).length;
            if ($('nToday')) {
                setNum($('nToday'), nt);
                $('nToday').hidden = !nt;
            }
            if ($('nLate')) {
                setNum($('nLate'), nl);
                $('nLate').hidden = !nl;
            }
            onTasks && onTasks(tasks, u);
            if (first) {
                first = false;
                window.YomakLoader?.hide();
            }
        }, e => { toast(errMsg(e), 'error'); onTasks && onTasks([], u, e); window.YomakLoader?.hide(); });
        if (onRewards)
            unR = subscribeRewards(u.uid, s => onRewards(s, u), e => toast(errMsg(e), 'error'));
    });
}

