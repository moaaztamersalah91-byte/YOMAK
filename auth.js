import { auth } from './firebase.js';
import { toast, setLoading, shake } from './ui.js';
import { onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, signInWithCredential, sendPasswordResetEmail } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js';
const $ = id => document.getElementById(id);
let mode = location.pathname.endsWith('register.html') ? 'register' : 'login';
const error = e => ({ 'auth/invalid-credential': 'البريد الإلكتروني أو كلمة المرور غير صحيحة', 'auth/email-already-in-use': 'البريد الإلكتروني مستخدم بالفعل', 'auth/weak-password': 'كلمة المرور ضعيفة', 'auth/popup-closed-by-user': 'تم إغلاق نافذة Google', 'auth/unauthorized-domain': 'أضف نطاق الموقع إلى Authorized domains في Firebase' })[e.code] || e.message || 'حدث خطأ غير متوقع';
let registering = false;
onAuthStateChanged(auth, u => { if (u) {
    if (registering)
        return;
    window.YomakLoader?.arm();
    location.replace('dashboard.html');
}
else
    window.YomakLoader?.hide(); });
$('authForm').onsubmit = async (e) => {
    e.preventDefault();
    $('authError').textContent = '';
    let uname = null;
    if (mode === 'register') {
        const { checkName } = await import('./username.js');
        const c = checkName($('username').value, { reserve: true });
        if (c.err) {
            $('authError').textContent = c.err;
            shake(document.querySelector('.auth-card'));
            return;
        }
        uname = c.name;
    }
    setLoading($('authSubmit'), true);
    try {
        if (mode === 'login')
            await signInWithEmailAndPassword(auth, $('email').value.trim(), $('password').value);
        else {
            registering = true;
            await createUserWithEmailAndPassword(auth, $('email').value.trim(), $('password').value);
            let dest = 'dashboard.html';
            try {
                const m = await import('./username.js');
                await m.setUsername(auth.currentUser.uid, uname);
            }
            catch (x) {
                dest = 'games.html';
                toast(x.code === 'taken' ? 'الـ Username ده متاخد، اختار غيره في صفحة الألعاب' : 'هتختار الـ Username من صفحة الألعاب', 'info', 6000);
            }
            window.YomakLoader?.arm();
            location.replace(dest);
            return;
        }
    }
    catch (e) {
        registering = false;
        $('authError').textContent = error(e);
        shake(document.querySelector('.auth-card'));
        toast(error(e), 'error');
    }
    finally {
        setLoading($('authSubmit'), false);
    }
};
$('google').onclick = async () => { const b = $('google'); $('authError').textContent = ''; setLoading(b, true); try {
    if (window.Capacitor?.isNativePlatform?.() && window.YomakNativeGoogleSignIn) {
        const idToken = await window.YomakNativeGoogleSignIn();
        const credential = GoogleAuthProvider.credential(idToken);
        await signInWithCredential(auth, credential);
    } else {
        await signInWithPopup(auth, new GoogleAuthProvider());
    }
}
catch (e) {
    $('authError').textContent = error(e);
    shake(document.querySelector('.auth-card'));
    toast(error(e), 'error');
}
finally {
    setLoading(b, false);
} };
$('reset')?.addEventListener('click', async () => { const email = $('email').value.trim(); if (!email) {
    $('authError').textContent = 'اكتب بريدك الإلكتروني أولًا';
    toast('اكتب بريدك الإلكتروني أولًا', 'info');
    return;
} const b = $('reset'); setLoading(b, true); try {
    await sendPasswordResetEmail(auth, email);
    $('authError').textContent = '';
    toast('إذا كان البريد مسجّلًا، ستصلك رسالة الاستعادة', 'success');
}
catch (e) {
    $('authError').textContent = error(e);
    shake(document.querySelector('.auth-card'));
    toast(error(e), 'error');
}
finally {
    setLoading(b, false);
} });



