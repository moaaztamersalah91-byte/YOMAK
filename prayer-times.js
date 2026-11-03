// حساب مواعيد الصلاة محليًا (بدون إنترنت أو خدمة خارجية) — طريقة الهيئة المصرية العامة للمساحة: فجر 19.5° وعشاء 17.5°، عصر (شافعي)
const rad = d => d * Math.PI / 180, deg = r => r * 180 / Math.PI;
const sin = d => Math.sin(rad(d)), cos = d => Math.cos(rad(d)), tan = d => Math.tan(rad(d));
const asin = x => deg(Math.asin(x)), acos = x => deg(Math.acos(x)), atan2 = (y, x) => deg(Math.atan2(y, x)), acot = x => deg(Math.atan(1 / x));
const fix = (a, b) => { a -= b * Math.floor(a / b); return a < 0 ? a + b : a; };
function julian(y, m, d) { if (m <= 2) {
    y -= 1;
    m += 12;
} const A = Math.floor(y / 100), B = 2 - A + Math.floor(A / 4); return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + d + B - 1524.5; }
function sun(jd) {
    const D = jd - 2451545, g = fix(357.529 + 0.98560028 * D, 360), q = fix(280.459 + 0.98564736 * D, 360), L = fix(q + 1.915 * sin(g) + 0.02 * sin(2 * g), 360), e = 23.439 - 3.6e-7 * D;
    return { decl: asin(sin(e) * sin(L)), eq: q / 15 - fix(atan2(cos(e) * sin(L), cos(L)) / 15, 24) };
}
export const CITIES = [
    ['القاهرة', 30.0444, 31.2357], ['الجيزة', 30.0131, 31.2089], ['الإسكندرية', 31.2001, 29.9187], ['المنصورة', 31.0409, 31.3785], ['طنطا', 30.7865, 31.0004], ['الزقازيق', 30.5877, 31.502],
    ['بورسعيد', 31.2653, 32.3019], ['السويس', 29.9668, 32.5498], ['الفيوم', 29.3084, 30.8428], ['أسيوط', 27.1783, 31.1859], ['الأقصر', 25.6872, 32.6396], ['أسوان', 24.0889, 32.8998],
    ['مكة المكرمة', 21.3891, 39.8579], ['المدينة المنورة', 24.5247, 39.5692], ['جدة', 21.4858, 39.1925], ['الرياض', 24.7136, 46.6753], ['دبي', 25.2048, 55.2708], ['الكويت', 29.3759, 47.9774], ['الدوحة', 25.2854, 51.531], ['عمّان', 31.9454, 35.9284]
];
export const PRAYERS = [['fajr', 'الفجر', '🌅'], ['dhuhr', 'الظهر', '☀️'], ['asr', 'العصر', '🌤️'], ['maghrib', 'المغرب', '🌇'], ['isha', 'العشاء', '🌙']];
/** مواعيد يوم معيّن بالدقائق من منتصف الليل (بتوقيت الجهاز). date = كائن Date */
export function timesFor(date, lat, lng) {
    const tz = -date.getTimezoneOffset() / 60, jd = julian(date.getFullYear(), date.getMonth() + 1, date.getDate()) - lng / 360;
    const mid = t => fix(12 - sun(jd + t).eq, 24);
    const ang = (a, t, ccw) => { const dc = sun(jd + t).decl, v = acos((-sin(a) - sin(dc) * sin(lat)) / (cos(dc) * cos(lat))) / 15; return mid(t) + (ccw ? -v : v); };
    const asr = t => { const dc = sun(jd + t).decl; return ang(-acot(1 + tan(Math.abs(lat - dc))), t); };
    const adj = h => h + tz - lng / 15;
    const raw = { fajr: ang(19.5, 5 / 24, true), sunrise: ang(0.833, 5 / 24, true), dhuhr: mid(12 / 24) + 1 / 60, asr: asr(13 / 24), maghrib: ang(0.833, 18 / 24), isha: ang(17.5, 18 / 24) };
    const o = {};
    for (const k in raw)
        o[k] = Number.isFinite(raw[k]) ? Math.round(fix(adj(raw[k]), 24) * 60) : null;
    return o;
}
export const fmt = m => { if (m == null)
    return '--:--'; const h = Math.floor(m / 60) % 24, mm = m % 60; return `${(h % 12) || 12}:${String(mm).padStart(2, '0')} ${h < 12 ? 'ص' : 'م'}`; };
/** اتجاه القبلة بالدرجات من الشمال الحقيقي */
export function qibla(lat, lng) {
    const K = [21.4225, 39.8262], d = rad(K[1] - lng), p = rad(lat), k = rad(K[0]);
    return (deg(Math.atan2(Math.sin(d), Math.cos(p) * Math.tan(k) - Math.sin(p) * Math.cos(d))) + 360) % 360;
}

