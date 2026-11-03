// Username عام فريد + أصدقاء + أسماء اللاعبين لكل لعبة (يومك / ألعاب)
import { db } from './firebase.js';
import { doc, getDoc, onSnapshot, collection, query, where, runTransaction, setDoc, addDoc, updateDoc, deleteDoc, serverTimestamp, Timestamp } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js';
export const DAY = 864e5, COOLDOWN = 30 * DAY, HOLD = 14 * DAY;
export const NAME_RE = /^[\u0621-\u063F\u0641-\u064A\u0660-\u0669a-zA-Z0-9_ ]+$/;
export const clean = s => String(s ?? '').normalize('NFC').replace(/\s+/g, ' ').trim();
/** مفتاح المقارنة: بدون مسافات و _ ، حروف صغيرة، وتوحيد أ/إ/آ و ة/ه و ى/ي والأرقام العربية */
export const norm = s => clean(s).toLowerCase().replace(/[\u0660-\u0669]/g, c => c.charCodeAt(0) - 1632).replace(/[أإآٱ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').replace(/[\s_]+/g, '');
const RES = ['admin', 'yomak', 'ادمن', 'يومك', 'الاداره', 'مشرف', 'moderator'];
const LEET = { 0: 'o', 1: 'i', 3: 'e', 4: 'a', 5: 's', 7: 't', '@': 'a', '$': 's' };
export const isReserved = k => { const l = k.replace(/[0134577@$]/g, c => LEET[c]); return RES.some(r => k.includes(r) || l.includes(r)); };
export class E extends Error {
    constructor(code, msg) { super(msg || code); this.code = code; }
}
export function checkName(raw, { min = 3, max = 16, reserve = false } = {}) {
    const n = clean(raw), len = [...n].length;
    if (len < min || len > max)
        return { err: `الاسم من ${min} لـ ${max} حرف` };
    if (!NAME_RE.test(n))
        return { err: 'مسموح بالعربي والإنجليزي والأرقام والمسافة و _ فقط' };
    const key = norm(n);
    if (key.length < min)
        return { err: 'الاسم قصير بعد حذف المسافات' };
    if (reserve && isReserved(key))
        return { err: 'الاسم ده محجوز، اختار اسم تاني' };
    return { name: n, key };
}
export const errText = e => ({ taken: 'الاسم ده متاخد، جرّب اسم تاني', cooldown: e.message, notfound: 'مفيش مستخدم بالاسم ده', self: 'ده اسمك إنت 😄', already: 'انتوا أصحاب بالفعل', sent: 'طلب الصداقة اتبعت قبل كده', 'permission-denied': 'اتأكد إن قواعد Firestore الجديدة (firestore.rules) اتنشرت', 'not-friends': 'لازم تضيف اللاعب كصديق الأول.' })[e.code] || e.message || 'حدث خطأ غير متوقع';
/* ---------- الملف العام ---------- */
export const watchProfile = (uid, cb, err) => onSnapshot(doc(db, 'profiles', uid), s => cb(s.exists() ? s.data() : null), err);
const cache = new Map();
export async function getProfile(uid) { if (cache.has(uid))
    return cache.get(uid); let p = null; try {
    const s = await getDoc(doc(db, 'profiles', uid));
    p = s.exists() ? s.data() : null;
}
catch (e) { } if (p)
    cache.set(uid, p); return p; }
const free = (d, uid) => !d || (!d.active && (d.uid === uid || (d.holdUntil?.toMillis?.() || 0) < Date.now()));
/** حجز Username (أول مرة) أو تغييره (مرة كل 30 يوم) — بعملية واحدة (transaction) */
export async function setUsername(uid, raw) {
    const c = checkName(raw, { reserve: true });
    if (c.err)
        throw new E('invalid', c.err);
    return runTransaction(db, async (tx) => {
        const pref = doc(db, 'profiles', uid), nref = doc(db, 'usernames', c.key), [ps, ns] = await Promise.all([tx.get(pref), tx.get(nref)]);
        const cur = ps.exists() ? ps.data() : null;
        if (cur) {
            const left = (cur.changedAt?.toMillis?.() || 0) + COOLDOWN - Date.now();
            if (left > 0)
                throw new E('cooldown', `تقدر تغيّر الـ Username بعد ${Math.ceil(left / DAY)} يوم`);
            if (cur.key === c.key) {
                tx.update(nref, { uid, name: c.name, active: true });
                tx.update(pref, { username: c.name, key: c.key, changedAt: serverTimestamp() });
                return c;
            }
        }
        if (!free(ns.exists() ? ns.data() : null, uid))
            throw new E('taken');
        tx.set(nref, { uid, name: c.name, active: true });
        if (cur)
            tx.set(doc(db, 'usernames', cur.key), { uid, name: cur.username, active: false, holdUntil: Timestamp.fromMillis(Date.now() + HOLD) });
        cur ? tx.update(pref, { username: c.name, key: c.key, changedAt: serverTimestamp() }) : tx.set(pref, { username: c.name, key: c.key, changedAt: serverTimestamp() });
        return c;
    });
}
export const claimUsername = setUsername;
/** بحث عن مستخدم بالـ Username بالظبط */
export async function findByUsername(raw) {
    const key = norm(raw);
    if (key.length < 3)
        throw new E('notfound');
    const s = await getDoc(doc(db, 'usernames', key));
    if (!s.exists() || !s.data().active)
        throw new E('notfound');
    return { uid: s.data().uid, name: s.data().name };
}
/* ---------- الأصدقاء ---------- */
export const fid = (a, b) => a < b ? `${a}_${b}` : `${b}_${a}`;
export const watchFriendships = (uid, cb, err) => onSnapshot(query(collection(db, 'friendships'), where('users', 'array-contains', uid)), s => cb(s.docs.map(d => ({ id: d.id, ...d.data() }))), err);
export async function sendRequest(me, raw, list) {
    const t = await findByUsername(raw);
    if (t.uid === me)
        throw new E('self');
    const id = fid(me, t.uid), ex = list.find(f => f.id === id);
    if (ex) {
        if (ex.status === 'accepted')
            throw new E('already');
        if (ex.from === me)
            throw new E('sent');
        await acceptRequest(id);
        return { ...t, accepted: true };
    }
    const users = [me, t.uid].sort();
    await setDoc(doc(db, 'friendships', id), { users, from: me, status: 'pending', createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
    return t;
}
export const acceptRequest = id => updateDoc(doc(db, 'friendships', id), { status: 'accepted', updatedAt: serverTimestamp() });
export const removeFriendship = id => deleteDoc(doc(db, 'friendships', id));
/* ---------- اسم اللاعب الخاص بكل لعبة (فريد داخل اللعبة، بدون قيد زمني) ---------- */
export const watchGameNames = (uid, cb, err) => onSnapshot(collection(db, 'users', uid, 'gameprofile'), s => { const m = {}; s.docs.forEach(d => m[d.id] = d.data()); cb(m); }, err);
export async function setGameName(uid, game, raw, photo) {
    const c = checkName(raw, { min: 2, max: 16 });
    if (c.err)
        throw new E('invalid', c.err);
    const nid = `${game}_${c.key}`;
    return runTransaction(db, async (tx) => {
        const pref = doc(db, 'users', uid, 'gameprofile', game), nref = doc(db, 'gameNames', nid), [ps, ns] = await Promise.all([tx.get(pref), tx.get(nref)]);
        if (ns.exists() && ns.data().uid !== uid)
            throw new E('taken');
        const old = ps.exists() ? ps.data().nameId : null, ph = photo === undefined ? (ps.exists() ? ps.data().photo || '' : '') : photo;
        if (!ns.exists())
            tx.set(nref, { uid, game, name: c.name, photo: ph });
        else if (ns.data().photo !== ph)
            tx.update(nref, { photo: ph });
        if (old && old !== nid)
            tx.delete(doc(db, 'gameNames', old));
        tx.set(pref, { name: c.name, nameId: nid, photo: ph, updatedAt: serverTimestamp() });
        return c.name;
    });
}

/* ---------- الحضور والنشاط ---------- */
export const watchPresence = (uid, cb, err) => onSnapshot(doc(db, 'gamePresence', uid), s => cb(s.exists() ? s.data() : null), err);
export const writePresence = (uid, { online = true, page = 'games', game = '' } = {}) => setDoc(doc(db, 'gamePresence', uid), { online, page, game, lastSeen: serverTimestamp() }, { merge: true });
export const watchGameInvites = (uid, cb, err) => onSnapshot(query(collection(db, 'gameInvites'), where('to', '==', uid)), s => cb(s.docs.map(d => ({ id: d.id, ...d.data() }))), err);
export async function sendGameInvite(from, to, game, roomCode) {
    const f = await getDoc(doc(db, 'friendships', fid(from, to)));
    if (!f.exists() || f.data().status !== 'accepted' || !f.data().users.includes(from) || !f.data().users.includes(to)) throw new E('not-friends', 'لازم تضيف اللاعب كصديق الأول.');
    return addDoc(collection(db, 'gameInvites'), { from, to, game, roomCode, status: 'pending', createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
}
export const updateGameInvite = (id, status) => updateDoc(doc(db, 'gameInvites', id), { status, updatedAt: serverTimestamp() });
export const watchGameHistory = (uid, cb, err) => onSnapshot(query(collection(db, 'gameHistory'), where('users', 'array-contains', uid)), s => cb(s.docs.map(d => ({ id: d.id, ...d.data() })).sort((a,b) => (b.playedAt?.toMillis?.() || 0) - (a.playedAt?.toMillis?.() || 0)).slice(0, 20)), err);

/* ---------- الصور: أي صورة بتتقبل (حتى أكبر من 10MB) وبتتضغط تلقائيًا لصورة شخصية Base64 صغيرة ---------- */
export const MAX_IN = 10 * 1048576;
async function decode(file) {
    try {
        return await createImageBitmap(file, { imageOrientation: 'from-image' });
    }
    catch (e) { }
    return new Promise((ok, no) => { const url = URL.createObjectURL(file), i = new Image(); i.onload = () => { URL.revokeObjectURL(url); ok(i); }; i.onerror = () => { URL.revokeObjectURL(url); no(new E('decode', 'الصيغة دي مش مدعومة في المتصفح، جرّب JPG أو PNG')); }; i.src = url; });
}
/** بيرجّع data:image/jpeg;base64 مربّعة ومضغوطة (≤ ~150KB) مهما كان حجم الأصل */
export async function toAvatar(file, size = 320, maxChars = 150000) {
    const img = await decode(file), w = img.width || img.naturalWidth, h = img.height || img.naturalHeight, s = Math.min(w, h);
    for (let px = size; px >= 64; px = Math.round(px * .75)) {
        const c = document.createElement('canvas');
        c.width = c.height = px;
        const x = c.getContext('2d');
        x.fillStyle = '#fff';
        x.fillRect(0, 0, px, px);
        x.imageSmoothingQuality = 'high';
        x.drawImage(img, (w - s) / 2, (h - s) / 2, s, s, 0, 0, px, px);
        for (let q = .85; q >= .35; q -= .1) {
            const out = c.toDataURL('image/jpeg', q);
            if (out.length <= maxChars) {
                img.close?.();
                return out;
            }
        }
    }
    throw new E('decode', 'معرفتش أضغط الصورة دي، جرّب صورة تانية');
}
export const setProfilePhoto = (uid, photo) => updateDoc(doc(db, 'profiles', uid), { photo });
const COL = ['#04796c', '#3f8fc9', '#9a62c9', '#e08a2e', '#2eae7d', '#c9506b'];
export function avatarEl(name, key, photo, cls = '') {
    const a = document.createElement('span');
    a.className = 'gm-av ' + cls;
    if (photo) {
        const i = new Image();
        i.src = photo;
        i.alt = '';
        a.append(i);
        return a;
    }
    a.textContent = [...(name || '?')][0].toUpperCase();
    let h = 0;
    for (const ch of key || name || '')
        h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    a.style.background = COL[h % COL.length];
    return a;
}
export async function gamePhoto(game, name) {
    try {
        const s = await getDoc(doc(db, 'gameNames', `${game}_${norm(name)}`));
        return s.exists() ? s.data().photo || '' : '';
    }
    catch (e) {
        return '';
    }
}

