import { db } from './firebase.js';
import { doc, onSnapshot, runTransaction, serverTimestamp } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js';
import { toast } from './ui.js';
import { forfeitUI } from './game-common.js';
const words = ['مدرسة', 'كمبيوتر', 'برمجة', 'كرة', 'مكتبة', 'مغامرة', 'طائرة', 'مستشفى', 'شمس', 'بطريق', 'روبوت', 'حديقة', 'مفتاح', 'سيارة', 'تليفون', 'موزة', 'نجمة', 'قمر', 'بحر', 'فراشة', 'مظلة', 'سفينة', 'ليمون', 'وسادة', 'نحلة'];
const letters = [...'ابتثجحخدذرزسشصضطظعغفقكلمنهويءأإؤئ'];
const el = (t, c = '', v = '') => { const n = document.createElement(t); if (c)
    n.className = c; if (v !== undefined)
    n.textContent = v; return n; };
export async function mount(stage, { code, uid, room }) { const ref = doc(db, 'rooms', code, 'game', 'state'); let rm = room(), st = null, off, roomOff; const root = el('div', 'on-game'), status = el('div', 'on-status', 'بنجهز اللعبة…'), score = el('div', 'on-scores'), masked = el('h2', ''), bad = el('p', 'on-muted'), keys = el('div', 'on-controls'), controls = el('div', 'on-controls'); const ff = forfeitUI(stage, root, async (silent) => { await runTransaction(db, async (tx) => { const s = await tx.get(ref); if (!s.exists())
        return; const d = s.data(); if ((d.p1 !== uid && d.p2 !== uid) || d.status !== 'active')
        return; const w = uid === d.p1 ? d.p2 : d.p1, k = w === d.p1 ? 's1' : 's2'; tx.update(ref, { status: 'over', winner: w, forfeit: uid, [k]: (d[k] || 0) + 1, at: serverTimestamp() }); }); }); root.append(status, score, masked, bad, keys, controls); stage.replaceChildren(root); const other = () => rm?.players?.find(x => x !== uid); function render() { if (!st) {
    status.textContent = rm?.players?.length === 2 ? 'المضيف بيجهز الجولة…' : 'مستنيين اللاعب التاني يدخل الغرفة…';
    return;
} const turn = st.turn === uid; status.textContent = st.status === 'over' ? (st.winner === uid ? '🏆 كسبت الجولة!' : st.winner === 'draw' ? 'تعادل!' : 'الجولة للاعب التاني') : (turn ? 'دورك — اختار حرف' : 'دور اللاعب التاني'); score.textContent = `${rm?.names?.[st.p1] || 'لاعب 1'}: ${st.s1}  |  ${rm?.names?.[st.p2] || 'لاعب 2'}: ${st.s2}`; masked.textContent = [...st.word].map(c => st.guessed.includes(c) ? c : '＿').join(' '); bad.textContent = `أخطاء: ${st.wrong}/6 — الحروف المختارة: ${st.guessed.join('، ')}`; keys.replaceChildren(); keys.append(el('p', 'word-hint', 'اختار حروف من المجموعة دي علشان تكشف الكلمة:')); const choices = letterChoices(st.word); choices.forEach(ch => { const b = el('button', 'on-btn word-letter', ch); b.disabled = st.status !== 'active' || !turn || st.guessed.includes(ch); b.onclick = () => guess(ch); keys.append(b); }); controls.replaceChildren(); const next = el('button', 'on-btn', 'جولة جديدة'); next.disabled = st.status !== 'over'; next.onclick = newRound; controls.append(next); } async function init() { if (uid !== rm?.host || rm?.players?.length !== 2)
    return; try {
    await runTransaction(db, async (tx) => { const s = await tx.get(ref); if (s.exists())
        return; const [p1, p2] = rm.players; tx.set(ref, { p1, p2, word: words[Math.floor(Math.random() * words.length)], guessed: [], wrong: 0, turn: p1, s1: 0, s2: 0, status: 'active', winner: '', round: 1, at: serverTimestamp() }); });
}
catch (e) {
    toast(e.message || 'تعذر بدء اللعبة', 'error');
} } async function guess(ch) { try {
    await runTransaction(db, async (tx) => { const s = await tx.get(ref); if (!s.exists())
        return; const d = s.data(); if (d.status !== 'active' || d.turn !== uid || d.guessed.includes(ch))
        return; const guessed = [...d.guessed, ch], wrong = d.wrong + (d.word.includes(ch) ? 0 : 1), won = [...d.word].every(c => guessed.includes(c)), lost = wrong >= 6; const patch = { guessed, wrong, turn: other(), at: serverTimestamp() }; if (won || lost) {
        patch.status = 'over';
        patch.winner = won ? uid : other();
        patch[won ? (uid === d.p1 ? 's1' : 's2') : (other() === d.p1 ? 's1' : 's2')] = (won ? (uid === d.p1 ? d.s1 : d.s2) : (other() === d.p1 ? d.s1 : d.s2)) + 1;
    } tx.update(ref, patch); });
}
catch (e) {
    toast(e.message || 'الحرف ما اتسجلش', 'error');
} } async function newRound() { try {
    await runTransaction(db, async (tx) => { const s = await tx.get(ref); if (!s.exists() || !rm?.players?.includes(uid) || s.data().status !== 'over')
        return; const d = s.data(), nr = d.round + 1; tx.update(ref, { word: words[Math.floor(Math.random() * words.length)], guessed: [], wrong: 0, turn: nr % 2 ? d.p1 : d.p2, status: 'active', winner: '', forfeit: '', round: nr, at: serverTimestamp() }); });
}
catch (e) {
    toast(e.message || 'تعذر بدء الجولة', 'error');
} } off = onSnapshot(ref, s => { st = s.exists() ? s.data() : null; render(); ff.sync(st?.status === 'active'); if (!st)
    init(); }, e => toast('تعذر الاتصال: ' + e.message, 'error')); roomOff = onSnapshot(doc(db, 'rooms', code), s => { rm = s.exists() ? s.data() : null; render(); if (!st)
    init(); }); stage._onlineCleanup = () => { off?.(); roomOff?.(); }; }
function letterChoices(w) { const base = [...new Set([...w])]; const seed = [...w].reduce((n, c) => n + c.charCodeAt(0), 0); const extras = []; for (let i = 0; i < letters.length && extras.length < 3; i++) {
    const ch = letters[(seed + i * 7) % letters.length];
    if (!base.includes(ch) && !extras.includes(ch))
        extras.push(ch);
} return [...base, ...extras].sort((a, b) => ((a.charCodeAt(0) * 31 + seed) % 97) - ((b.charCodeAt(0) * 31 + seed) % 97)); }

