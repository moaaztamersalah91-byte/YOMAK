// XO أونلاين: الحالة متزامنة لحظيًا داخل rooms/{code}/game/state
import { db } from './firebase.js';
import { doc, onSnapshot, runTransaction, serverTimestamp } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js';
import { toast } from './ui.js';
import { forfeitUI } from './game-common.js';
const el = (t, c = '', txt = '') => { const n = document.createElement(t); if (c)
    n.className = c; if (txt !== undefined)
    n.textContent = txt; return n; };
export async function mount(stage, { code, uid, room }) {
    stage.replaceChildren();
    const ref = doc(db, 'rooms', code, 'game', 'state');
    let rm = room(), st = null, off = null;
    const root = el('div', 'on-game on-xo'), status = el('div', 'on-status', 'بنجهّز اللعبة…'), scores = el('div', 'on-scores'), board = el('div', 'on-xo-board'), controls = el('div', 'on-controls');
    root.append(status, scores, board, controls);
    stage.append(root);
    const ff = forfeitUI(stage, root, async (silent) => { await runTransaction(db, async (tx) => { const s = await tx.get(ref); if (!s.exists())
        return; const d = s.data(), me = d.xUid === uid ? 'X' : d.oUid === uid ? 'O' : ''; if (!me || d.status !== 'active')
        return; const w = me === 'X' ? 'O' : 'X', k = w === 'X' ? 'sx' : 'so'; tx.update(ref, { status: 'over', winner: w, forfeit: uid, [k]: (d[k] || 0) + 1, at: serverTimestamp() }); }); });
    const name = u => rm?.names?.[u] || 'لاعب';
    function render() {
        if (!st) {
            status.textContent = rm?.players?.length < 2 ? 'مستنيين اللاعب التاني يدخل الغرفة…' : 'المضيف بيجهّز اللعبة…';
            board.replaceChildren();
            return;
        }
        const me = st.xUid === uid ? 'X' : st.oUid === uid ? 'O' : '';
        scores.textContent = `❎ ${name(st.xUid)}: ${st.sx || 0}  |  ⭕ ${name(st.oUid)}: ${st.so || 0}  |  تعادل: ${st.sd || 0}`;
        status.textContent = st.status === 'over' ? (st.winner === 'draw' ? 'تعادل!' : st.forfeit ? `الفائز: ${name(st.winner === 'X' ? st.xUid : st.oUid)} (${name(st.forfeit)} استسلم)` : `الفائز: ${name(st.winner === 'X' ? st.xUid : st.oUid)} (${st.winner})`) : (st.turn === me ? `دورك (${me})` : `دور ${name(st.turn === 'X' ? st.xUid : st.oUid)} (${st.turn})`);
        board.replaceChildren();
        st.board.forEach((v, i) => { const b = el('button', 'on-xo-cell ' + (v ? 'filled ' + v.toLowerCase() : ''), v || ''); b.disabled = !!v || st.status !== 'active' || st.turn !== me; b.onclick = () => move(i); board.append(b); });
        controls.replaceChildren();
        const reset = el('button', 'on-btn', 'جولة جديدة');
        reset.disabled = st.status !== 'over';
        reset.onclick = newRound;
        controls.append(reset);
        const note = el('small', 'on-muted', 'أي لاعب يقدر يبدأ الجولة التالية، والبداية بتتبدل كل جولة.');
        controls.append(note);
    }
    async function init() { if (rm?.players?.length !== 2 || uid !== rm?.host)
        return; try {
        await runTransaction(db, async (tx) => { const s = await tx.get(ref); if (s.exists())
            return; const [xUid, oUid] = Math.random() < .5 ? rm.players : [rm.players[1], rm.players[0]]; tx.set(ref, { xUid, oUid, board: Array(9).fill(''), turn: 'X', status: 'active', winner: '', sx: 0, so: 0, sd: 0, round: 1, at: serverTimestamp() }); });
    }
    catch (e) {
        toast(e.code === 'permission-denied' ? 'لازم تنشر قواعد Firestore الجديدة من الملف المرفق.' : (e.message || 'تعذر بدء XO'), 'error');
    } }
    async function move(i) { try {
        await runTransaction(db, async (tx) => { const s = await tx.get(ref); if (!s.exists())
            throw Error('اللعبة لسه بتبدأ'); const d = s.data(), sym = d.xUid === uid ? 'X' : d.oUid === uid ? 'O' : ''; if (!sym || d.status !== 'active' || d.turn !== sym || d.board[i])
            return; const b = [...d.board]; b[i] = sym; const lines = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]]; const win = lines.some(l => l.every(k => b[k] === sym)), draw = !win && b.every(Boolean); let patch = { board: b, turn: sym === 'X' ? 'O' : 'X', at: serverTimestamp() }; if (win) {
            patch.status = 'over';
            patch.winner = sym;
            patch[sym === 'X' ? 'sx' : 'so'] = (d[sym === 'X' ? 'sx' : 'so'] || 0) + 1;
        }
        else if (draw) {
            patch.status = 'over';
            patch.winner = 'draw';
            patch.sd = (d.sd || 0) + 1;
        } tx.update(ref, patch); });
    }
    catch (e) {
        toast(e.code === 'permission-denied' ? 'انشر قواعد Firestore المحدّثة أولًا.' : (e.message || 'الحركة ما اتسجلتش'), 'error');
    } }
    async function newRound() { try {
        await runTransaction(db, async (tx) => { const s = await tx.get(ref); if (!s.exists() || s.data().status !== 'over' || !rm?.players?.includes(uid))
            return; const d = s.data(), nr = (d.round || 1) + 1; tx.update(ref, { board: Array(9).fill(''), turn: nr % 2 ? 'X' : 'O', status: 'active', winner: '', forfeit: '', round: nr, at: serverTimestamp() }); });
    }
    catch (e) {
        toast(e.message || 'حصل خطأ', 'error');
    } }
    off = onSnapshot(ref, s => { st = s.exists() ? s.data() : null; render(); ff.sync(st?.status === 'active'); if (!st)
        init(); }, e => toast(e.code === 'permission-denied' ? 'انشر قواعد Firestore الجديدة من الملف المرفق.' : e.message, 'error'));
    const stop = onSnapshot(doc(db, 'rooms', code), s => { rm = s.exists() ? s.data() : null; render(); if (!st)
        init(); });
    stage._onlineCleanup = () => { off?.(); stop?.(); };
}

