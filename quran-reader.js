// المصحف: قائمة السور + قراءة السورة (النص بيتحمّل من api.alquran.cloud وبيتخزّن على الجهاز)
import { SURAHS } from './quran-data.js';
import { toast } from './ui.js';
import { auth } from './firebase.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js';
import { deleteField } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js';
import { watchSettings, saveSettings } from './islamic.js';
import { hzSave, hzDay, renderHifzStats } from './hifz-core.js';
import { awardIslamic } from './rewards.js';
import { RULES, GROUPS, ruleOf, parse, plain, dropWords } from './tajweed.js';
const API = n => `https://api.alquran.cloud/v1/surah/${n}/quran-uthmani`;
const $ = id => document.getElementById(id);
const mk = (t, c, x) => { const e = document.createElement(t); if (c)
    e.className = c; if (x != null)
    e.textContent = x; return e; };
const AR = new Intl.NumberFormat('ar-EG');
const strip = s => s.replace(/[ً-ٰٟۖ-ۭـ]/g, '');
const norm = s => strip(s).replace(/[أإآٱ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').replace(/\s+/g, '');
const lsGet = (k, d) => { try {
    const v = localStorage.getItem(k);
    return v == null ? d : JSON.parse(v);
}
catch {
    return d;
} };
const lsSet = (k, v) => { try {
    localStorage.setItem(k, JSON.stringify(v));
}
catch { } };
const TAPI = n => `https://api.quran.com/api/v4/quran/verses/uthmani_tajweed?chapter_number=${n}`;
// التفضيلات (علامة المصحف / حجم الخط / التجويد) محفوظة في Firestore: users/{uid}/islamic/settings (qbm,qfont,qtj,qtjSeen)
let cur = 0, fontSize = 30, mem = {}, tmem = {}, token = 0, tj = false, bmk = null, seen = false, user = null, fTimer = null, migrated = false;
const put = p => user ? saveSettings(user.uid, p).catch(e => { toast(e.code === 'permission-denied' ? 'انشر firestore.rules المحدّث علشان تتحفظ الإعدادات' : (e.message || 'تعذّر الحفظ'), 'error'); throw e; }) : Promise.reject();
const saveFont = () => { clearTimeout(fTimer); fTimer = setTimeout(() => { fTimer = null; put({ qfont: fontSize }).catch(() => { }); }, 800); };
/* ---------- جلب النص ---------- */
/* بيانات القرآن المدمجة في التطبيق (data/s/N.json) — لو مش موجودة بيرجع للإنترنت */
const LOCAL = {};
function localSurah(n) { return LOCAL[n] || (LOCAL[n] = fetch('data/s/' + n + '.json').then(r => r.ok ? r.json() : null).catch(() => null)); }
let simpleP = null;
async function localSearch(q) {
    simpleP = simpleP || fetch('data/simple.json').then(r => r.ok ? r.json() : null).catch(() => null);
    const all = await simpleP;
    if (!all)
        return null;
    const k = strip(q), out = [];
    for (let i = 0; i < all.length; i++)
        for (let j = 0; j < all[i].length; j++)
            if (all[i][j].includes(k))
                out.push({ surah: { number: i + 1, name: SURAHS[i].name }, numberInSurah: j + 1, text: all[i][j] });
    return out;
}
async function loadSurah(n) {
    if (mem[n])
        return mem[n];
    const cached = lsGet('yq_s' + n, null);
    if (cached && Array.isArray(cached) && cached.length === SURAHS[n - 1].ayahs)
        return mem[n] = cached;
    const L = await localSurah(n);
    let ay;
    if (L && Array.isArray(L.t) && L.t.length === SURAHS[n - 1].ayahs)
        ay = L.t.map(String);
    else {
        const r = await fetch(API(n));
        if (!r.ok)
            throw new Error('تعذّر تحميل السورة، جرّب تاني');
        const j = await r.json();
        ay = (j && j.data && j.data.ayahs || []).map(a => String(a.text));
    }
    if (ay.length !== SURAHS[n - 1].ayahs)
        throw new Error('البيانات المستلمة غير مكتملة، جرّب تاني');
    // البسملة بتيجي لازقة في أول آية: نفصلها (ما عدا الفاتحة)
    if (n !== 1) {
        const w = ay[0].split(/\s+/);
        if (w.length > 4 && strip(w[0]) === 'بسم')
            ay[0] = w.slice(4).join(' ');
    }
    lsSet('yq_s' + n, ay);
    return mem[n] = ay;
}
// نص التجويد: كل آية كـ HTML خام فيه وسوم الأحكام، والتحويل بيتم وقت العرض
async function loadTajweed(n) {
    if (tmem[n])
        return tmem[n];
    const need = SURAHS[n - 1].ayahs, cached = lsGet('yq_t' + n, null);
    if (Array.isArray(cached) && cached.length === need)
        return tmem[n] = cached;
    const L = await localSurah(n);
    let v;
    if (L && Array.isArray(L.j) && L.j.length === need)
        v = L.j.map(String);
    else {
        const r = await fetch(TAPI(n));
        if (!r.ok)
            throw new Error('تعذّر تحميل ألوان التجويد');
        const j = await r.json();
        v = (j && j.verses || []).map(x => String(x.text_uthmani_tajweed || ''));
    }
    if (v.length !== need || v.some(x => !x))
        throw new Error('بيانات التجويد غير مكتملة');
    lsSet('yq_t' + n, v);
    return tmem[n] = v;
}
// آية → أجزاء ملوّنة (مع فصل البسملة عن أول آية)
function versesSegs(n, raw) {
    return raw.map((h, i) => {
        let segs = parse(h);
        if (n !== 1 && i === 0) {
            const w = plain(segs).trim().split(/\s+/);
            if (w.length > 4 && w[0].replace(/[\u064B-\u065F\u0670\u06D6-\u06ED\u0640]/g, '') === 'بسم')
                segs = dropWords(segs, 4);
        }
        return segs;
    });
}
/* ---------- قائمة السور ---------- */
function renderList(q = '') {
    const box = $('qsList');
    box.replaceChildren();
    const nq = norm(q.trim());
    const items = SURAHS.filter(s => !nq || norm(s.name).includes(nq) || String(s.n) === nq);
    if (!items.length) {
        box.append(mk('p', 'muted', 'مفيش سورة بالاسم ده'));
        return;
    }
    const bm = bmk;
    for (const s of items) {
        const b = mk('button', 'qs-item');
        b.type = 'button';
        b.append(mk('span', 'qs-n', AR.format(s.n)), (() => { const d = mk('span', 'qs-t'); d.append(mk('b', '', `سورة ${s.name}`), mk('small', '', `${AR.format(s.ayahs)} آية`)); return d; })());
        if (bm && bm.s === s.n)
            b.append(mk('span', 'qs-mark', '🔖'));
        const hs = hzGet('s:' + s.n);
        if (hs)
            b.append(mk('span', 'qs-hz', hs.st === 'm' ? '✅' : '🔁'));
        b.onclick = () => openSurah(s.n, bm && bm.s === s.n ? bm.a : 1);
        box.append(b);
    }
}
/* ---------- القارئ ---------- */
function applyFont() { $('qrdText').style.fontSize = fontSize + 'px'; }
async function openSurah(n, ayah = 1) {
    const my = ++token;
    cur = n;
    rp = null;
    rpPaint();
    $('qrdAct').hidden = true;
    const s = SURAHS[n - 1], dlg = $('qrDialog');
    $('qrdTitle').textContent = `سورة ${s.name}`;
    $('qrdSub').textContent = `${AR.format(s.ayahs)} آية`;
    $('qrdAuAy').max = s.ayahs;
    $('qrdAuAy').value = 1;
    $('qrdPrev').disabled = n <= 1;
    $('qrdNext').disabled = n >= 114;
    const body = $('qrdText');
    body.replaceChildren(mk('p', 'muted qrd-load', 'جاري التحميل…'));
    if (!dlg.open)
        dlg.showModal();
    try {
        let tv = null, ay = null;
        if (tj) {
            try {
                tv = versesSegs(n, await loadTajweed(n));
            }
            catch (e) {
                if (my === token)
                    toast((e.message || 'تعذّر تحميل التجويد') + ' — اتعرض النص العادي', 'error');
            }
        }
        if (!tv)
            ay = await loadSurah(n);
        if (my !== token)
            return;
        body.replaceChildren();
        if (n !== 1 && n !== 9)
            body.append(mk('div', 'qrd-bsm', 'بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ'));
        const p = mk('p', 'qrd-ayahs'), count = (tv || ay).length;
        for (let i = 0; i < count; i++) {
            const sp = mk('span', 'qrd-a');
            sp.dataset.a = i + 1;
            if (tv) {
                for (const g of tv[i]) {
                    const r = ruleOf(g.c);
                    if (r) {
                        const c = mk('span', 'tj', g.t);
                        c.style.color = r.color;
                        c.title = r.name;
                        sp.append(c);
                    }
                    else
                        sp.append(document.createTextNode(g.t));
                }
                sp.append(document.createTextNode(' '));
            }
            else
                sp.append(document.createTextNode(ay[i] + ' '));
            sp.append(mk('span', 'qrd-num', '\u06DD' + AR.format(i + 1)), document.createTextNode(' '));
            sp.onclick = () => rec ? recGo(i + 1) : openAct(i + 1);
            p.append(sp);
        }
        body.append(p);
        applyFont();
        const bm = bmk;
        const target = ayah > 1 ? body.querySelector(`[data-a="${ayah}"]`) : null;
        if (target)
            target.scrollIntoView({ block: 'center' });
        else
            $('qrdBody').scrollTop = 0;
        paintMark(bm && bm.s === n ? bm.a : 0);
        paintAyahHz();
        paintHifzBtn();
        recReset();
        if (au) {
            auLoad(nextAu || !A().paused || A().ended, 1);
            nextAu = false;
        }
    }
    catch (e) {
        if (my !== token)
            return;
        const err = mk('div', 'qrd-err');
        err.append(mk('p', '', e.message || 'حصل خطأ في التحميل'));
        const r = mk('button', 'secondary', 'إعادة المحاولة');
        r.type = 'button';
        r.onclick = () => openSurah(n, ayah);
        err.append(r);
        body.replaceChildren(err);
    }
}
/* ---------- الاستماع بصوت القرّاء ---------- */
// لإضافة قارئ جديد: أضف عنصرًا هنا (server من mp3quran.net، الملفات 001.mp3 … 114.mp3)
const RECITERS = [
    { id: 'yasser', name: 'ياسر الدوسري', key: 'ياسر الدوسري', type: 'rt' },
    { id: 'qatami', name: 'ناصر القطامي', key: 'ناصر القطامي', type: 'rt' },
    { id: 'neana', name: 'أحمد نعينع', key: 'نعينع', type: 'rt' },
    { id: 'ghamdi', name: 'سعد الغامدي', key: 'سعد الغامدي', type: 'rt' },
    { id: 'husary', name: 'الحصري', key: 'الحصري', type: 'rt' },
    { id: 'husaryMuj', name: 'الحصري (مجوّد)', key: 'الحصري', type: 'mj' },
    { id: 'minshawi', name: 'المنشاوي', key: 'المنشاوي', type: 'rt' },
    { id: 'minshawiMuj', name: 'المنشاوي (مجوّد)', key: 'المنشاوي', type: 'mj' },
    { id: 'minshawiMu3', name: 'المنشاوي (معلّم)', key: 'المنشاوي', type: 'ml' }
];
// الصوت: تسجيل السورة كاملة (متصل بدون فجوات) من mp3quran.net، وتوقيت كل آية بييجي من API الموقع نفسه علشان نعلّم الآية.
const MQ = 'https://mp3quran.net/api/v3/';
let au = false, auAy = 1, auTimes = null, auTok = 0, rcId = lsGet('yq_reciter', RECITERS[0].id), mqList = null;
const rcOf = () => RECITERS.find(r => r.id === rcId) || RECITERS[0];
const A = () => $('qrdAudio');
const nrm = t => (t || '').replace(/[\u064B-\u065F\u0670\u0640]/g, '').replace(/[أإآ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه');
async function mqResolve(n) {
    if (!mqList) {
        const r = await fetch(MQ + 'reciters?language=ar');
        if (!r.ok)
            throw new Error('reciters');
        mqList = (await r.json()).reciters || [];
    }
    const rc = rcOf(), k = nrm(rc.key), re = { rt: /مرتل/, mj: /مجود/, ml: /معلم|تعليم|المعلم/ }[rc.type];
    const has = m => !m.surah_list || (',' + m.surah_list + ',').includes(',' + n + ',');
    const cands = [];
    for (const r of mqList)
        if (nrm(r.name).includes(k))
            for (const m of r.moshaf || [])
                if (has(m))
                    cands.push({ m, t: nrm(r.name + ' ' + m.name) });
    let pick = (cands.find(c => re.test(c.t)) || {}).m;
    if (!pick && rc.type === 'rt')
        pick = (cands.find(c => !/مجود|معلم|تعليم/.test(c.t)) || {}).m;
    if (!pick) {
        const base = nrm(rc.key.split(' ').pop());
        const seen = mqList.filter(r => nrm(r.name).includes(base)).map(r => r.name + ' ← ' + (r.moshaf || []).map(m => m.name + '#' + m.id).join(' | '));
        throw new Error('لم يُعثر على مصحف: ' + rc.name + ' (سورة ' + n + ') — المتاح: ' + (seen.join(' ؛ ') || 'لا شيء'));
    }
    return pick;
}
async function mqTimes(n, id, count) {
    try {
        const r = await fetch(`${MQ}ayat_timing?surah=${n}&read=${id}`);
        if (!r.ok)
            return null;
        const j = await r.json(), arr = (Array.isArray(j) ? j : j.ayat_timing || []).filter(x => x.ayah >= 1).sort((x, y) => x.ayah - y.ayah);
        if (arr.length !== count)
            return null;
        return arr.map(x => x.start_time / 1000);
    }
    catch (e) {
        return null;
    }
}
function paintPlay(a, scroll = true) {
    document.querySelectorAll('#qrdText .qrd-a.pl').forEach(x => x.classList.remove('pl'));
    if (!a)
        return;
    const t = document.querySelector(`#qrdText [data-a="${a}"]`);
    if (t) {
        t.classList.add('pl');
        if (scroll)
            t.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
}
/* تحميل الصوت اختياري: بيتخزّن على الجهاز (Cache) وبيشتغل بعدها من غير نت */
const AUC = 'yomak-quran-audio', auKey = n => `yq_au_${rcId}_${n}`;
async function auBlob(url) { try { const c = await caches.open(AUC), r = await c.match(url); return r ? URL.createObjectURL(await r.blob()) : null; } catch (e) { return null; } }
function paintDl() {
    const b = $('qrdAuDl');
    if (!b)
        return;
    b.disabled = false;
    b.textContent = lsGet(auKey(cur), null) ? '✔ محمّلة بدون نت — اضغط للحذف' : '⬇ تحميل السورة للاستماع بدون نت';
}
async function auDownload() {
    const b = $('qrdAuDl'), n = cur, k = auKey(n), had = lsGet(k, null);
    try {
        if (had) {
            const c = await caches.open(AUC);
            await c.delete(had.url);
            try { localStorage.removeItem(k); } catch (e) { }
            paintDl();
            toast('اتحذف التحميل', 'info');
            return;
        }
        b.disabled = true;
        b.textContent = 'جاري التجهيز…';
        const m = await mqResolve(n), url = m.server.replace(/\/?$/, '/') + String(n).padStart(3, '0') + '.mp3';
        const times = await mqTimes(n, m.id, SURAHS[n - 1].ayahs);
        const r = await fetch(url);
        if (!r.ok || !r.body)
            throw new Error('x');
        const total = +r.headers.get('content-length') || 0, rd = r.body.getReader(), parts = [];
        let got = 0;
        for (;;) {
            const { done, value } = await rd.read();
            if (done)
                break;
            parts.push(value);
            got += value.length;
            b.textContent = 'جاري التحميل… ' + (total ? Math.round(got / total * 100) + '%' : Math.round(got / 1048576) + ' MB');
        }
        const c = await caches.open(AUC);
        await c.put(url, new Response(new Blob(parts, { type: 'audio/mpeg' }), { headers: { 'Content-Type': 'audio/mpeg' } }));
        lsSet(k, { url, times });
        toast('تم التحميل — هتسمعها بدون نت', 'success');
    }
    catch (e) {
        toast('تعذّر تحميل الصوت، اتأكد من الإنترنت ومساحة الجهاز', 'error');
    }
    paintDl();
}
async function auLoad(play, ayah = 1) {
    const a = A(), tok = ++auTok, n = cur;
    $('qrdAuErr').hidden = true;
    auTimes = null;
    auAy = 0;
    paintPlay(0);
    paintDl();
    try {
        const off = lsGet(auKey(n), null), offUrl = off && off.url ? await auBlob(off.url) : null;
        let m = null;
        if (tok !== auTok)
            return;
        if (offUrl)
            auTimes = off.times || null;
        else {
            m = await mqResolve(n);
            if (tok !== auTok)
                return;
            auTimes = await mqTimes(n, m.id, SURAHS[n - 1].ayahs);
            if (tok !== auTok)
                return;
        }
        if (rp && !auTimes) {
            toast('توقيت الآيات مش متاح للشيخ ده، فالتكرار مش هيشتغل', 'error');
            rp = null;
            rpPaint();
        }
        const url = offUrl || m.server.replace(/\/?$/, '/') + String(n).padStart(3, '0') + '.mp3';
        a.src = url;
        const seek = () => { if (auTimes && ayah > 1)
            a.currentTime = auTimes[ayah - 1]; };
        a.addEventListener('loadedmetadata', seek, { once: true });
        if (play)
            a.play().catch(() => { });
    }
    catch (e) {
        if (tok === auTok) {
            const er = $('qrdAuErr');
            er.textContent = e.message && e.message.startsWith('لم يُعثر') ? e.message : 'تعذّر تشغيل الصوت، اتأكد من الإنترنت وجرّب تاني.';
            er.hidden = false;
        }
    }
}
function auGo(ay) {
    const n = SURAHS[cur - 1].ayahs;
    ay = Math.min(Math.max(1, Math.floor(+ay) || 1), n);
    const a = A();
    if (!au) {
        au = true;
        auPaint();
        return auLoad(true, ay);
    }
    if (auTimes && a.getAttribute('src') && a.readyState >= 1) {
        a.currentTime = auTimes[ay - 1];
        a.play().catch(() => { });
    }
    else
        auLoad(true, ay);
}
$('qrdAuGo').onclick = () => auGo($('qrdAuAy').value);
$('qrdAuAy').addEventListener('keydown', e => { if (e.key === 'Enter') {
    e.preventDefault();
    auGo($('qrdAuAy').value);
} });
function auStop() { auTok++; const a = A(); a.pause(); a.removeAttribute('src'); a.load(); paintPlay(0); }
function auPaint() { $('qrdAu').hidden = !au; $('qrdAuBtn').classList.toggle('on', au); $('qrdAuBtn').setAttribute('aria-pressed', au); }
A().ontimeupdate = () => {
    if (!auTimes)
        return;
    const t = A().currentTime;
    let i = 0;
    if (rp) {
        const endT = rp.t < auTimes.length ? auTimes[rp.t] : Infinity;
        if (t >= endT - 0.03)
            return rpLoop();
    }
    while (i + 1 < auTimes.length && auTimes[i + 1] <= t)
        i++;
    const ay = t < auTimes[0] - 0.05 ? 0 : i + 1;
    if (ay !== auAy) {
        auAy = ay;
        paintPlay(ay);
    }
};
$('qrdReciter').replaceChildren(...RECITERS.map(r => { const o = mk('option', '', r.name); o.value = r.id; return o; }));
$('qrdReciter').value = rcOf().id;
// نفس شكل القوائم المنسدلة في باقي الموقع (select-ui.js بيحوّل كل <select> بعد ما الخيارات تتملي)
{
    const sc = document.createElement('script');
    sc.src = 'select-ui.js';
    document.head.append(sc);
}
{
    const dl = mk('button', 'secondary', '⬇ تحميل السورة للاستماع بدون نت');
    dl.id = 'qrdAuDl';
    dl.type = 'button';
    dl.style.cssText = 'margin-top:8px;width:100%';
    dl.onclick = auDownload;
    $('qrdAu').append(dl);
}
$('qrdReciter').onchange = e => { rcId = e.target.value; lsSet('yq_reciter', rcId); const was = !A().paused; auLoad(was, Math.max(1, auAy)); };
$('qrdAuBtn').onclick = () => { au = !au; auPaint(); if (au)
    auLoad(true, 1);
else
    auStop(); };
A().onerror = () => { if (A().getAttribute('src')) {
    $('qrdAuErr').textContent = 'تعذّر تشغيل ملف الصوت: ' + A().getAttribute('src');
    $('qrdAuErr').hidden = false;
} };
A().onended = () => { if (rp && auTimes && rp.t >= SURAHS[cur - 1].ayahs)
    return rpLoop(); if ($('qrdAuNext').checked && cur < 114) {
    nextAu = true;
    openSurah(cur + 1);
}
else
    paintPlay(0); };
let nextAu = false;
$('qrDialog').addEventListener('close', () => { if (au) {
    au = false;
    auPaint();
    auStop();
} });
/* ---------- وضع التسميع ---------- */
let rec = false, rci = 1, rv = new Set();
const rcount = () => SURAHS[cur - 1].ayahs;
function recPaint() {
    const t = $('qrdText');
    t.classList.toggle('rec', rec);
    $('qrdRec').hidden = !rec;
    $('qrdRecBtn').classList.toggle('on', rec);
    $('qrdRecBtn').setAttribute('aria-pressed', rec);
    t.querySelectorAll('.qrd-a').forEach(e => { const a = +e.dataset.a; e.classList.toggle('rv', !rec || rv.has(a)); e.classList.toggle('rcur', rec && a === rci); });
    if (!rec)
        return;
    const n = rcount(), shown = rv.has(rci);
    $('qrdRecPos').textContent = rci > n ? '🎉 خلصت السورة' : `الآية ${AR.format(rci)} من ${AR.format(n)}`;
    $('qrdRecMain').textContent = rci > n ? '↺ ابدأ من جديد' : shown ? (rci >= n ? '✔ إنهاء' : 'التالية ›') : '👁 إظهار الآية';
    $('qrdRecPrev').disabled = rci <= 1;
    const c = t.querySelector(`[data-a="${rci}"]`);
    if (c)
        c.scrollIntoView({ block: 'center', behavior: 'smooth' });
}
function recReset() { rci = 1; rv = new Set(); recPaint(); }
function recGo(a) { rci = a; recPaint(); }
function recMain() {
    const n = rcount();
    if (rci > n)
        return recReset();
    if (!rv.has(rci)) {
        rv.add(rci);
        return recPaint();
    }
    if (!$('qrdRecKeep').checked)
        rv.delete(rci);
    rci++;
    if (rci > n)
        toast('ما شاء الله، خلصت تسميع السورة', 'success');
    recPaint();
}
function recPrev() { if (rci <= 1)
    return; if (rci <= rcount() && !$('qrdRecKeep').checked)
    rv.delete(rci); rci--; if (!$('qrdRecKeep').checked)
    rv.delete(rci); recPaint(); }
$('qrdRecBtn').onclick = () => { rec = !rec; if (rec)
    recReset();
else
    recPaint(); };
$('qrdRecMain').onclick = recMain;
$('qrdRecPrev').onclick = recPrev;
$('qrdRecReset').onclick = recReset;
function paintMark(a) {
    document.querySelectorAll('#qrdText .qrd-a.bm').forEach(x => x.classList.remove('bm'));
    if (a) {
        const t = document.querySelector(`#qrdText [data-a="${a}"]`);
        if (t)
            t.classList.add('bm');
    }
}
function mark(a) {
    const bm = bmk;
    if (bm && bm.s === cur && bm.a === a) {
        bmk = null;
        put({ qbm: deleteField() }).catch(() => { });
        paintMark(0);
        toast('اتشالت العلامة', 'info');
    }
    else {
        bmk = { s: cur, a };
        put({ qbm: bmk }).catch(() => { });
        paintMark(a);
        toast(`اتحفظت العلامة عند الآية ${AR.format(a)}`, 'success');
    }
    renderList($('qsSearch').value);
    renderResume();
}
function renderResume() {
    const bm = bmk, b = $('qsResume');
    if (!bm || !SURAHS[bm.s - 1]) {
        b.hidden = true;
        return;
    }
    b.hidden = false;
    b.textContent = `🔖 كمّل من سورة ${SURAHS[bm.s - 1].name} — آية ${AR.format(bm.a)}`;
    b.onclick = () => openSurah(bm.s, bm.a);
}
/* ---------- دليل ألوان التجويد ---------- */
function buildLegend() {
    const box = $('qrdLegend');
    box.replaceChildren();
    box.append(mk('p', 'muted tjl-note', 'كل لون بيعبّر عن حكم تجويدي. المصدر: بيانات التجويد الملوّنة من Quran.com. الألوان مساعد للتعلّم ومش بديل عن التلقّي من شيخ.'));
    GROUPS.forEach((gname, gi) => {
        const rs = RULES.filter(r => r.g === gi);
        if (!rs.length)
            return;
        box.append(mk('h3', 'tjl-g', gname));
        for (const r of rs) {
            const row = mk('div', 'tjl-row'), dot = mk('i', 'tjl-dot');
            dot.style.background = r.color;
            const t = mk('div', 'tjl-t');
            t.append(mk('b', '', r.name), mk('small', '', r.desc));
            row.append(dot, t);
            if (r.ex) {
                const e = mk('span', 'tjl-ex', r.ex);
                e.style.color = r.color;
                row.append(e);
            }
            box.append(row);
        }
    });
}
function syncTj() {
    const b = $('qrdTj');
    b.setAttribute('aria-pressed', tj);
    b.classList.toggle('on', tj);
    $('qrdLegendBtn').hidden = !tj;
    if (!tj)
        $('qrdLegendWrap').hidden = true;
}
/* ---------- تشغيل ---------- */
$('qrdTj').onclick = () => { tj = !tj; put({ qtj: tj }).catch(() => { }); syncTj(); if (cur) {
    const a = document.querySelector('#qrdText .qrd-a.bm');
    openSurah(cur, a ? +a.dataset.a : 1);
} if (tj && !seen) {
    seen = true;
    put({ qtjSeen: true }).catch(() => { });
    $('qrdLegendWrap').hidden = false;
} };
$('qrdLegendBtn').onclick = () => { const w = $('qrdLegendWrap'); w.hidden = !w.hidden; };
buildLegend();
syncTj();
$('qsSearch').oninput = e => renderList(e.target.value);
$('qrdClose').onclick = () => $('qrDialog').close();
$('qrdPrev').onclick = () => cur > 1 && openSurah(cur - 1);
$('qrdNext').onclick = () => cur < 114 && openSurah(cur + 1);
$('qrdBigger').onclick = () => { fontSize = Math.min(56, fontSize + 3); applyFont(); saveFont(); };
$('qrdSmaller').onclick = () => { fontSize = Math.max(18, fontSize - 3); applyFont(); saveFont(); };
$('qrDialog').addEventListener('click', e => { if (e.target === $('qrDialog'))
    $('qrDialog').close(); });
if (!document.getElementById('amiriQuran')) {
    const l = document.createElement('link');
    l.id = 'amiriQuran';
    l.rel = 'stylesheet';
    l.href = 'https://fonts.googleapis.com/css2?family=Amiri+Quran&display=swap';
    document.head.append(l);
}
/* ---------- مزامنة الإعدادات من Firestore (+ ترحيل مرة واحدة من localStorage القديم) ---------- */
const OLD = ['yq_bm', 'yq_font', 'yq_tj', 'yq_tj_seen'];
onAuthStateChanged(auth, u => {
    user = u;
    if (!u)
        return;
    watchSettings(u.uid, s => {
        if (!migrated) {
            migrated = true;
            const o = {}, b = lsGet('yq_bm', null), f = lsGet('yq_font', null), t = lsGet('yq_tj', null), sn = lsGet('yq_tj_seen', null);
            if (b && b.s >= 1 && b.s <= 114 && !s.qbm)
                o.qbm = { s: +b.s, a: +b.a };
            if (Number.isInteger(f) && s.qfont == null)
                o.qfont = f;
            if (t != null && s.qtj == null)
                o.qtj = !!t;
            if (sn && s.qtjSeen == null)
                o.qtjSeen = true;
            const clean = () => OLD.forEach(k => { try {
                localStorage.removeItem(k);
            }
            catch { } });
            if (Object.keys(o).length)
                put(o).then(clean).catch(() => { });
            else
                clean();
            s = { ...s, ...o };
        }
        if (!lsGet('yq_hz_mig', false)) {
            lsSet('yq_hz_mig', true);
            const loc = lsGet(HZ, {}), miss = {};
            for (const k in loc)
                if (!(s.qhz && s.qhz[k]))
                    miss[k] = loc[k];
            if (Object.keys(miss).length)
                put({ qhz: miss }).catch(() => { });
            HZM = { ...(s.qhz || {}), ...miss };
        }
        else
            HZM = { ...(s.qhz || {}) };
        lsSet(HZ, HZM);
        hzRefresh();
        bmk = s.qbm || null;
        seen = !!s.qtjSeen;
        const f = +s.qfont;
        if (f >= 18 && f <= 56 && f !== fontSize && !fTimer) {
            fontSize = f;
            applyFont();
        }
        const t = !!s.qtj;
        if (t !== tj) {
            tj = t;
            syncTj();
        }
        renderList($('qsSearch').value);
        renderResume();
        paintMark(bmk && bmk.s === cur ? bmk.a : 0);
    }, () => { });
});
/* ---------- تكرار مقطع ---------- */
let rp = null;
const clampI = (v, lo, hi) => Math.min(hi, Math.max(lo, Math.floor(+v) || lo));
function rpPaint() { const b = $('qrdRpGo'); b.textContent = rp ? `⏹ إيقاف التكرار (${rp.done + 1}/${rp.times})` : '🔁 ابدأ التكرار'; b.classList.toggle('on', !!rp); }
function rpLoop() {
    const a = A();
    rp.done++;
    if (rp.done < rp.times) {
        a.currentTime = auTimes[rp.f - 1];
        a.play().catch(() => { });
        rpPaint();
    }
    else {
        a.pause();
        rp = null;
        rpPaint();
        toast('خلص التكرار، تقبّل الله', 'success');
    }
}
$('qrdRpGo').onclick = () => {
    if (rp) {
        rp = null;
        rpPaint();
        return;
    }
    const n = SURAHS[cur - 1].ayahs;
    let f = clampI($('qrdRpFrom').value, 1, n), t = clampI($('qrdRpTo').value, 1, n);
    if (t < f)
        [f, t] = [t, f];
    $('qrdRpFrom').value = f;
    $('qrdRpTo').value = t;
    rp = { f, t, times: clampI($('qrdRpN').value, 1, 100), done: 0 };
    rpPaint();
    if (!au) {
        au = true;
        auPaint();
    }
    auLoad(true, f);
};
/* ---------- متابعة الحفظ (محفوظ على الجهاز) ---------- */
const HZ = 'yq_hifz', ST = { m: 'محفوظة', r: 'قيد المراجعة' };
let HZM = lsGet(HZ, {});
const hzAll = () => HZM;
const todayS = () => new Date().toLocaleDateString('en-CA');
const hzGet = k => HZM[k] || null;
function hzSet(k, st, review) {
    const old = HZM[k];
    if (st)
        HZM[k] = { st, d: todayS() };
    else
        delete HZM[k];
    lsSet(HZ, HZM);
    hzRefresh();
    if (!user)
        return;
    hzSave(user.uid, k, st ? { st, d: todayS() } : null).catch(e => toast(e.code === 'permission-denied' ? 'انشر firestore.rules المحدّث علشان يتزامن الحفظ' : (e.message || 'تعذّر حفظ الحفظ'), 'error'));
    const isS = k.startsWith('s:'), lbl = hzLabel(k);
    if (review) {
        hzDay(user.uid).catch(() => { });
        awardIslamic(user.uid, 'review', 'راجعت: ' + lbl, { key: k });
    }
    else if (st === 'm' && (!old || old.st !== 'm')) {
        hzDay(user.uid).catch(() => { });
        awardIslamic(user.uid, isS ? 'hifzs' : 'hifz', 'حفظت: ' + lbl, { key: k });
    }
}
function hzLabel(k) { const [t, sn, a] = k.split(':'); return t === 's' ? `سورة ${SURAHS[sn - 1].name}` : `سورة ${SURAHS[sn - 1].name} — آية ${AR.format(a)}`; }
function hzDue() {
    const now = Date.parse(todayS());
    return Object.entries(hzAll()).filter(([k, v]) => SURAHS[+k.split(':')[1] - 1] && (now - Date.parse(v.d)) / 864e5 >= (v.st === 'r' ? 3 : 7)).sort((x, y) => x[1].d.localeCompare(y[1].d)).slice(0, 5);
}
function renderReview() {
    const box = $('qsReview');
    box.replaceChildren();
    const due = hzDue();
    if (!due.length)
        return;
    const w = mk('div', 'qs-review');
    w.append(mk('b', '', '⏰ وقت المراجعة'));
    for (const [k, v] of due) {
        const row = mk('div', 'qs-rv-row'), go = mk('button', 'secondary', `${hzLabel(k)} · ${ST[v.st]}`);
        go.type = 'button';
        const [t, sn, a] = k.split(':');
        go.onclick = () => openSurah(+sn, t === 'a' ? +a : 1);
        const ok = mk('button', '', 'راجعت ✓');
        ok.type = 'button';
        ok.onclick = () => { hzSet(k, v.st, true); toast('تقبّل الله، اتسجّلت المراجعة', 'success'); };
        row.append(go, ok);
        w.append(row);
    }
    box.append(w);
}
function paintHifzBtn() { if (!cur)
    return; const h = hzGet('s:' + cur); $('qrdHifz').textContent = '📌 ' + (h ? ST[h.st] : 'الحفظ'); $('qrdHifz').classList.toggle('on', !!h); }
function paintAyahHz() {
    const h = hzAll();
    document.querySelectorAll('#qrdText .qrd-a').forEach(e => { const v = h[`a:${cur}:${e.dataset.a}`]; if (v)
        e.dataset.hz = v.st;
    else
        delete e.dataset.hz; });
}
function hzRefresh() { renderHifzStats($('hzStats'), HZM); renderReview(); renderList($('qsSearch').value); paintHifzBtn(); paintAyahHz(); if (!$('qrdAct').hidden)
    paintAct(); }
$('qrdHifz').onclick = () => { const h = hzGet('s:' + cur); hzSet('s:' + cur, !h ? 'r' : h.st === 'r' ? 'm' : null); };
/* ---------- قائمة الآية: علامة / استماع / تكرار / تفسير / حفظ ---------- */
let actA = 0;
function openAct(a) { actA = a; $('qrdAct').hidden = false; $('qrdActT').textContent = `آية ${AR.format(a)} — سورة ${SURAHS[cur - 1].name}`; $('qrdTafsir').hidden = true; paintAct(); }
function paintAct() {
    const h = hzGet(`a:${cur}:${actA}`), bm = bmk && bmk.s === cur && bmk.a === actA;
    $('qrdActBm').textContent = bm ? '🔖 شيل العلامة' : '🔖 علامة';
    $('qrdActM').classList.toggle('on', h?.st === 'm');
    $('qrdActR').classList.toggle('on', h?.st === 'r');
}
$('qrdActX').onclick = () => { $('qrdAct').hidden = true; };
$('qrdActBm').onclick = () => { mark(actA); paintAct(); };
$('qrdActPlay').onclick = () => auGo(actA);
$('qrdActRp').onclick = () => { $('qrdRpFrom').value = actA; $('qrdRpTo').value = actA; if (!au) {
    au = true;
    auPaint();
} $('qrdRpGo').scrollIntoView({ block: 'nearest' }); toast('حدّد عدد المرات واضغط "ابدأ التكرار"', 'info'); };
const hzTog = st => { const k = `a:${cur}:${actA}`, h = hzGet(k); hzSet(k, h && h.st === st ? null : st); };
$('qrdActM').onclick = () => hzTog('m');
$('qrdActR').onclick = () => hzTog('r');
$('qrdActTf').onclick = async () => {
    const box = $('qrdTafsir'), s = cur, a = actA;
    box.hidden = false;
    box.textContent = 'جاري تحميل التفسير…';
    try {
        const k = `yq_tf_${s}_${a}`;
        let t = lsGet(k, null);
        if (!t) {
            const L = await localSurah(s);
            if (L && L.f && L.f[a - 1])
                t = L.f[a - 1];
        }
        if (!t) {
            const r = await fetch(`https://api.alquran.cloud/v1/ayah/${s}:${a}/ar.muyassar`);
            if (!r.ok)
                throw new Error('تعذّر تحميل التفسير');
            t = ((await r.json()).data || {}).text;
            if (!t)
                throw new Error('تعذّر تحميل التفسير');
            lsSet(k, t);
        }
        if (s === cur && a === actA) {
            box.replaceChildren(mk('small', 'muted', 'التفسير الميسر'), mk('p', '', t));
        }
    }
    catch (e) {
        box.textContent = e.message || 'تعذّر تحميل التفسير';
    }
};
/* ---------- بحث في نص القرآن ---------- */
let vsT = 0, vsTok = 0;
$('qsVerse').oninput = e => {
    clearTimeout(vsT);
    const q = strip(e.target.value.trim()), box = $('qsVerseRes');
    if (q.length < 2) {
        vsTok++;
        box.replaceChildren();
        return;
    }
    vsT = setTimeout(() => verseSearch(q), 450);
};
async function verseSearch(q) {
    const box = $('qsVerseRes'), tok = ++vsTok;
    box.replaceChildren(mk('p', 'muted', 'جاري البحث…'));
    try {
        let m = await localSearch(q);
        if (!m) {
            const r = await fetch(`https://api.alquran.cloud/v1/search/${encodeURIComponent(q)}/all/quran-simple-clean`);
            if (tok !== vsTok)
                return;
            m = r.ok ? ((await r.json()).data || {}).matches || [] : [];
        }
        if (tok !== vsTok)
            return;
        box.replaceChildren();
        if (!m.length) {
            box.append(mk('p', 'muted', 'مفيش نتائج'));
            return;
        }
        box.append(mk('small', 'muted', `${AR.format(m.length)} نتيجة${m.length > 40 ? ' (أول ٤٠)' : ''}`));
        for (const x of m.slice(0, 40)) {
            const b = mk('button', 'qs-vr');
            b.type = 'button';
            b.append(mk('b', '', `سورة ${x.surah.name.replace(/^سورة\s*/, '')} — آية ${AR.format(x.numberInSurah)}`));
            const t = mk('span', 'qs-vr-t'), txt = strip(String(x.text)), i = txt.indexOf(q);
            if (i < 0)
                t.textContent = txt;
            else {
                t.append(txt.slice(0, i), mk('mark', '', q), txt.slice(i + q.length));
            }
            b.append(t);
            b.onclick = () => openSurah(x.surah.number, x.numberInSurah);
            box.append(b);
        }
    }
    catch (e) {
        if (tok === vsTok)
            box.replaceChildren(mk('p', 'muted', 'تعذّر البحث، اتأكد من الإنترنت'));
    }
}
renderResume();
hzRefresh();
/* ---------- اختبار الحفظ ---------- */
const qz = document.createElement('dialog');
qz.className = 'hz-quiz';
qz.innerHTML = '<div class="qrd-head"><div><h2>🧠 اختبار الحفظ</h2><small class="muted" id="hzqSub"></small></div><button type="button" class="icon-btn" id="hzqX" aria-label="إغلاق">✕</button></div><div class="hz-qb" id="hzqBody"></div>';
document.body.append(qz);
$('hzqX').onclick = () => qz.close();
let Q = null;
function hzPool() {
    const out = [];
    for (const [k, v] of Object.entries(HZM)) {
        if (v.st !== 'm')
            continue;
        const [t, s, a] = k.split(':'), sx = SURAHS[+s - 1];
        if (!sx)
            continue;
        out.push(t === 's' ? { s: +s, n: sx.ayahs } : { s: +s, a: +a });
    }
    return out;
}
function qzPick(pool) {
    const e = pool[Math.floor(Math.random() * pool.length)];
    return { s: e.s, a: e.a || 1 + Math.floor(Math.random() * e.n) };
}
async function qzShow() {
    const body = $('hzqBody');
    if (Q.i >= Q.total) {
        body.replaceChildren(mk('h3', '', `نتيجتك: ${AR.format(Q.ok)} من ${AR.format(Q.total)}`), mk('p', 'muted', Q.ok === Q.total ? 'ما شاء الله، حفظ متقن 🤍' : 'الآيات اللي نسيتها اتحطّت "قيد المراجعة" علشان تراجعها.'));
        const b = mk('button', '', 'اختبار جديد');
        b.type = 'button';
        b.onclick = startQuiz;
        body.append(b);
        if (user) {
            hzDay(user.uid).catch(() => { });
            awardIslamic(user.uid, 'review', 'أنهيت اختبار حفظ', { key: 'quiz' });
        }
        return;
    }
    const q = Q.items[Q.i];
    $('hzqSub').textContent = `السؤال ${AR.format(Q.i + 1)} من ${AR.format(Q.total)}`;
    body.replaceChildren(mk('p', 'muted', 'جاري التحميل…'));
    try {
        const ay = await loadSurah(q.s);
        if (Q.items[Q.i] !== q)
            return;
        body.replaceChildren();
        body.append(mk('b', '', `سورة ${SURAHS[q.s - 1].name}`));
        if (q.a > 1) {
            body.append(mk('p', 'muted', `كمّل بعد الآية ${AR.format(q.a - 1)}:`), mk('div', 'hz-ayah', ay[q.a - 2]));
        }
        else
            body.append(mk('p', 'muted', 'اقرأ أول آية في السورة:'));
        const ans = mk('div', 'hz-ayah hz-ans', ay[q.a - 1]);
        ans.hidden = true;
        const show = mk('button', 'secondary', `👁 أظهر الآية ${AR.format(q.a)}`);
        show.type = 'button';
        const row = mk('div', 'hz-qrow');
        row.hidden = true;
        const yes = mk('button', '', '✓ عرفتها'), no = mk('button', 'secondary', '✗ نسيتها');
        yes.type = no.type = 'button';
        yes.onclick = () => { Q.ok++; Q.i++; qzShow(); };
        no.onclick = () => { hzSet(`a:${q.s}:${q.a}`, 'r'); Q.i++; qzShow(); };
        show.onclick = () => { ans.hidden = false; show.hidden = true; row.hidden = false; };
        row.append(yes, no);
        body.append(show, ans, row);
    }
    catch (e) {
        body.replaceChildren(mk('p', 'muted', e.message || 'تعذّر التحميل'));
    }
}
function startQuiz() {
    const pool = hzPool(), body = $('hzqBody');
    if (!qz.open)
        qz.showModal();
    if (!pool.length) {
        $('hzqSub').textContent = '';
        body.replaceChildren(mk('p', 'muted', 'علّم سور أو آيات "محفوظة" الأول علشان نختبرك فيها.'));
        return;
    }
    const total = Math.min(10, Math.max(5, pool.length * 3)), items = [];
    for (let i = 0; i < total; i++)
        items.push(qzPick(pool));
    Q = { items, i: 0, ok: 0, total };
    qzShow();
}
$('hzQuizBtn').onclick = startQuiz;
/* ---------- إخفاء القوائم النازلة من غير إلغاء الميزة ---------- */
(() => {
    const COL = 'pn-collapsed';
    const mkBtn = (panel, label) => {
        const b = mk('button', 'pn-collapse', '⌃ ' + label);
        b.type = 'button';
        b.setAttribute('aria-label', label);
        b.onclick = () => { panel.classList.add(COL); sync(panel); };
        return b;
    };
    // [زرار التشغيل, اللوحة] — الميزة بتفضل شغّالة (الصوت/التسميع/التجويد) والإخفاء بصري بس
    const feats = [['qrdAuBtn', 'qrdAu'], ['qrdRecBtn', 'qrdRec']];
    const sync = panel => { const btn = feats.find(f => f[1] === panel.id); if (btn)
        $(btn[0]).classList.toggle('pn-hid', panel.classList.contains(COL) && !panel.hidden); };
    feats.forEach(([bid, pid]) => {
        const p = $(pid), b = $(bid), old = b.onclick;
        p.appendChild(mkBtn(p, 'إخفاء القائمة'));
        // الضغط على الزرار وهو شغّال ومخفي = يرجّع القائمة (مش يوقف الميزة)
        b.onclick = e => { if (p.classList.contains(COL) && !p.hidden) {
            p.classList.remove(COL);
            sync(p);
            return;
        } return old && old.call(b, e); };
        // لما الميزة تتقفل فعلاً نشيل حالة الإخفاء
        new MutationObserver(() => { if (p.hidden) {
            p.classList.remove(COL);
            sync(p);
        } }).observe(p, { attributes: true, attributeFilter: ['hidden'] });
    });
    // دليل ألوان التجويد + التفسير: زرار إخفاء (الألوان بتفضل شغّالة)
    [['qrdLegendWrap', 'إخفاء الدليل'], ['qrdTafsir', 'إخفاء التفسير']].forEach(([id, l]) => {
        const p = $(id), b = mkBtn(p, l);
        b.onclick = () => { p.hidden = true; };
        p.insertBefore(b, p.firstChild);
    });
    // التفسير بيتعمل له replaceChildren: نرجّع الزرار بعد كل تحديث
    const tf = $('qrdTafsir');
    new MutationObserver(() => { if (!tf.hidden && !tf.querySelector('.pn-collapse')) {
        const b = mkBtn(tf, 'إخفاء التفسير');
        b.onclick = () => { tf.hidden = true; };
        tf.insertBefore(b, tf.firstChild);
    } }).observe(tf, { childList: true });
})();

