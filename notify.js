// إشعارات الجهاز (كمبيوتر + موبايل): تمر عبر Service Worker علشان تشتغل على أندرويد كمان
export const supported = () => typeof Notification !== 'undefined';
export const permission = () => supported() ? Notification.permission : 'unsupported';
let regP = null;
export function registerSW() {
    if (!('serviceWorker' in navigator))
        return Promise.resolve(null);
    return regP || (regP = navigator.serviceWorker.register('sw.js').catch(() => null));
}
export async function enable() {
    if (!supported())
        return 'unsupported';
    let r = 'denied';
    try {
        r = await Notification.requestPermission();
    }
    catch (e) { }
    if (r === 'granted') {
        registerSW();
        window.dispatchEvent(new Event('yomak-notif-granted'));
    }
    return r;
}
export async function deviceNotify(title, body, { url, tag } = {}) {
    if (permission() !== 'granted')
        return false;
    const opts = { body, icon: 'assets/logo.png', badge: 'assets/logo.png', tag, lang: 'ar', dir: 'rtl', data: { url: url || location.pathname.split('/').pop() || 'today.html' } };
    try {
        if (await registerSW()) {
            const r = await navigator.serviceWorker.ready;
            await r.showNotification(title, opts);
            return true;
        }
    }
    catch (e) { }
    try {
        const n = new Notification(title, opts);
        n.onclick = () => { window.focus(); if (opts.data.url)
            location.href = opts.data.url; n.close(); };
        return true;
    }
    catch (e) { }
    return false;
}
// شريط تفعيل الإشعارات (مرة واحدة، يتأجّل لو المستخدم قال لاحقًا)
const KEY = 'yomak.notif.later';
export function promptBar() {
    if (!supported() || permission() !== 'default')
        return;
    try {
        if (Date.now() - (+localStorage.getItem(KEY) || 0) < 3 * 864e5)
            return;
    }
    catch (e) { }
    const bar = document.createElement('div');
    bar.className = 'nt-bar';
    bar.setAttribute('role', 'region');
    bar.setAttribute('aria-label', 'تفعيل الإشعارات');
    const t = document.createElement('span');
    t.textContent = '🔔 فعّل الإشعارات علشان توصلك تذكيرات المهام والعادات على جهازك';
    const ok = document.createElement('button');
    ok.type = 'button';
    ok.textContent = 'تفعيل';
    const no = document.createElement('button');
    no.type = 'button';
    no.className = 'secondary';
    no.textContent = 'لاحقًا';
    ok.onclick = async () => { await enable(); bar.remove(); };
    no.onclick = () => { try {
        localStorage.setItem(KEY, String(Date.now()));
    }
    catch (e) { } bar.remove(); };
    bar.append(t, ok, no);
    document.body.append(bar);
}
if (permission() === 'granted')
    registerSW();

