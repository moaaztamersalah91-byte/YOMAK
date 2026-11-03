/* YOMAK service worker — إشعارات الجهاز (كمبيوتر وموبايل) */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
// Push من السيرفر (FCM data message) — بيشتغل والموقع مقفول
self.addEventListener('push', e => {
    let p = {};
    try {
        p = e.data ? e.data.json() : {};
    }
    catch (_) { }
    const d = p.data || p.notification || p;
    const title = d.title || 'YOMAK';
    e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
        if (list.some(c => c.visibilityState === 'visible' && c.focused))
            return; // الصفحة مفتوحة قدامه: الصفحة بتعرض التنبيه بنفسها
        return self.registration.showNotification(title, { body: d.body || '', icon: new URL('assets/logo.png', self.registration.scope).href, badge: new URL('assets/logo.png', self.registration.scope).href, tag: d.tag || undefined, lang: 'ar', dir: 'rtl', data: { url: d.url || 'today.html' } });
    }));
});
self.addEventListener('notificationclick', e => {
    e.notification.close();
    const url = new URL((e.notification.data && e.notification.data.url) || 'today.html', self.registration.scope).href;
    e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
        const same = list.find(c => c.url === url);
        if (same)
            return same.focus();
        const any = list.find(c => 'focus' in c);
        if (any && 'navigate' in any)
            return any.navigate(url).then(c => c && c.focus());
        return self.clients.openWindow(url);
    }));
});

