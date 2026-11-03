// غرف اللعب الأونلاين: كود من 6 حروف + لاعبين + شات الغرفة (بدون ألعاب لسه)
import { db } from './firebase.js';
import { doc, collection, addDoc, query, orderBy, limitToLast, onSnapshot, runTransaction, serverTimestamp, deleteField, setDoc } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js';
import { E } from './username.js';
const AL = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const genCode = () => { const a = new Uint32Array(6); crypto.getRandomValues(a); return [...a].map(n => AL[n % AL.length]).join(''); };
/** يقبل الكود نفسه أو لينك الدعوة كامل */
export const parseCode = s => { s = String(s || '').trim(); try {
    const c = new URL(s).searchParams.get('c');
    if (c)
        s = c;
}
catch (e) { } return s.toUpperCase().replace(/[^A-Z2-9]/g, '').slice(0, 6); };
export const inviteLink = code => new URL('room.html?c=' + code, location.href).href;
export async function copyText(t) {
    try {
        await navigator.clipboard.writeText(t);
        return true;
    }
    catch (e) { }
    const a = document.createElement('textarea');
    a.value = t;
    a.style.cssText = 'position:fixed;opacity:0';
    document.body.append(a);
    a.select();
    let ok = false;
    try {
        ok = document.execCommand('copy');
    }
    catch (e) { }
    a.remove();
    return ok;
}
export async function createRoom(uid, game, max, name) {
    for (let i = 0; i < 6; i++) {
        const code = genCode(), ref = doc(db, 'rooms', code);
        const ok = await runTransaction(db, async (tx) => { if ((await tx.get(ref)).exists())
            return false; tx.set(ref, { game, host: uid, players: [uid], names: { [uid]: name }, max, status: 'open', createdAt: serverTimestamp() }); return true; });
        if (ok)
            return code;
    }
    throw new E('busy', 'حاول تاني بعد لحظة');
}
export const watchRoom = (code, cb, err) => onSnapshot(doc(db, 'rooms', code), s => cb(s.exists() ? s.data() : null), err);
export async function joinRoom(uid, code, name) {
    const ref = doc(db, 'rooms', code);
    return runTransaction(db, async (tx) => {
        const s = await tx.get(ref);
        if (!s.exists())
            throw new E('noroom', 'مفيش غرفة بالكود ده');
        const r = s.data();
        if (r.players.includes(uid))
            return r;
        if (r.status !== 'open')
            throw new E('closed', 'الغرفة دي اتقفلت');
        if (r.players.length >= r.max)
            throw new E('full', 'الغرفة مكتملة');
        tx.update(ref, { players: [...r.players, uid], [`names.${uid}`]: name });
        return r;
    });
}
/** اللاعب بيخرج؛ المضيف خروجه بيقفل الغرفة */
export async function leaveRoom(uid, code) {
    const ref = doc(db, 'rooms', code);
    return runTransaction(db, async (tx) => {
        const s = await tx.get(ref);
        if (!s.exists())
            return;
        const r = s.data();
        if (r.host === uid) {
            if (r.status !== 'closed')
                tx.update(ref, { status: 'closed' });
            return;
        }
        if (r.players.includes(uid))
            tx.update(ref, { players: r.players.filter(p => p !== uid), [`names.${uid}`]: deleteField() });
    });
}
export const watchMessages = (code, cb, err) => onSnapshot(query(collection(db, 'rooms', code, 'messages'), orderBy('at'), limitToLast(100)), s => cb(s.docs.map(d => ({ id: d.id, ...d.data({ serverTimestamps: 'estimate' }) }))), err);
export const sendMessage = (uid, code, name, text) => addDoc(collection(db, 'rooms', code, 'messages'), { uid, name, text: text.slice(0, 300), at: serverTimestamp() });


/** حفظ سجل المباراة مرة واحدة لكل جولة مكتملة؛ قواعد Firestore تتحقق من حالة الغرفة والجولة. */
export async function saveGameHistory(code, room, state) {
    if (!room || !state || state.status !== 'over' || !room.players?.length) return;
    const round = Number(state.round || 1);
    let winner = 'draw';
    if (room.game === 'xo' && state.winner && state.winner !== 'draw') winner = state.winner === 'X' ? state.xUid : state.oUid;
    else if (room.game === 'hangman' || room.game === 'riddles') winner = state.winner || (state.forfeit ? (state.forfeit === state.p1 ? state.p2 : state.p1) : 'draw');
    else if (room.game === 'memory') winner = state.forfeit ? (state.forfeit === state.p1 ? state.p2 : state.p1) : (state.s1 === state.s2 ? 'draw' : state.s1 > state.s2 ? state.p1 : state.p2);
    else if (room.game === 'airhockey') winner = state.score1 === state.score2 ? 'draw' : room.players[state.score1 > state.score2 ? 0 : 1];
    else if (room.game === 'chess') winner = state.result === '1-0' ? state.white : state.result === '0-1' ? state.black : 'draw';
    else if (state.winner && room.players.includes(state.winner)) winner = state.winner;
    const result = winner === 'draw' ? 'تعادل' : `فوز ${room.names?.[winner] || 'أحد اللاعبين'}`;
    const id = `${code}_${round}`;
    await setDoc(doc(db, 'gameHistory', id), { roomCode: code, game: room.game, users: room.players.slice(0, 4), names: room.names || {}, round, winner, result, playedAt: serverTimestamp() });
}
export const watchGameState = (code, cb, err) => onSnapshot(doc(db, 'rooms', code, 'game', 'state'), s => cb(s.exists() ? s.data() : null), err);
