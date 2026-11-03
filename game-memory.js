// تطابق الكروت أونلاين — كل كشف/نقطة متزامنة عبر Firestore
import { db } from './firebase.js';
import { doc, onSnapshot, runTransaction, serverTimestamp } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js';
import { toast } from './ui.js';
import { forfeitUI } from './game-common.js';
const el = (t, c = '', txt = '') => { const n = document.createElement(t); if (c)
    n.className = c; if (txt !== undefined)
    n.textContent = txt; return n; };
const faces = ['🐱', '🐶', '🦊', '🐼', '🐸', '🦁', '🐵', '🐙'];
const shuffled = () => [...faces, ...faces].sort(() => Math.random() - .5);
export async function mount(stage, { code, uid, room }) {
    stage.replaceChildren();
    const ref = doc(db, 'rooms', code, 'game', 'state');
    let rm = room(), st = null, timer = null;
    const root = el('div', 'on-game'), status = el('div', 'on-status', 'بنجهّز اللعبة…'), scores = el('div', 'on-scores'), board = el('div', 'on-memory-board'), controls = el('div', 'on-controls');
    root.append(status, scores, board, controls);
    stage.append(root);
    const ff = forfeitUI(stage, root, async (silent) => { await runTransaction(db, async (tx) => { const s = await tx.get(ref); if (!s.exists())
        return; const d = s.data(); if ((d.p1 !== uid && d.p2 !== uid) || d.status !== 'active')
        return; tx.update(ref, { status: 'over', forfeit: uid, picks: [], at: serverTimestamp() }); }); });
    const name = u => rm?.names?.[u] || 'لاعب', me = () => st?.p1 === uid ? 1 : st?.p2 === uid ? 2 : 0;
    function render() {
        if (!st) {
            status.textContent = rm?.players?.length < 2 ? 'مستنيين اللاعب التاني يدخل الغرفة…' : 'المضيف بيجهّز اللعبة…';
            board.replaceChildren();
            return;
        }
        const p = me();
        scores.textContent = `🟢 ${name(st.p1)}: ${st.s1 || 0}  |  🔵 ${name(st.p2)}: ${st.s2 || 0}  |  أزواج متبقية: ${8 - (st.matched || []).length / 2}`;
        status.textContent = st.status === 'over' ? 'خلصت اللعبة! ' + (st.forfeit ? `الفائز: ${name(st.forfeit === st.p1 ? st.p2 : st.p1)} (${name(st.forfeit)} استسلم)` : (st.s1 || 0) === (st.s2 || 0) ? 'تعادل 🤝' : `الفائز: ${name((st.s1 || 0) > (st.s2 || 0) ? st.p1 : st.p2)}`) : (st.turn === p ? `دورك يا ${name(uid)} — اقلب كارتين` : `دور ${name(st.turn === 1 ? st.p1 : st.p2)}`);
        board.replaceChildren();
        st.deck.forEach((face, i) => { const open = (st.picks || []).includes(i) || (st.matched || []).includes(i); const b = el('button', 'on-memory-card' + ((st.matched || []).includes(i) ? ' matched' : ''), open ? face : '?'); b.disabled = !p || st.status !== 'active' || st.turn !== p || open || (st.picks || []).length >= 2; b.onclick = () => flip(i); board.append(b); });
        controls.replaceChildren();
        const reset = el('button', 'on-btn', 'خلط وابدأ من جديد');
        reset.disabled = st.status !== 'over';
        reset.onclick = newGame;
        controls.append(reset);
        controls.append(el('small', 'on-muted', 'أي لاعب يقدر يبدأ لعبة جديدة، والبداية بتتبدل كل مرة.'));
    }
    async function init() { if (rm?.players?.length !== 2 || uid !== rm.host)
        return; try {
        await runTransaction(db, async (tx) => { const s = await tx.get(ref); if (s.exists())
            return; tx.set(ref, { p1: rm.players[0], p2: rm.players[1], deck: shuffled(), matched: [], picks: [], turn: 1, s1: 0, s2: 0, status: 'active', round: 1, at: serverTimestamp() }); });
    }
    catch (e) {
        toast(e.code === 'permission-denied' ? 'انشر قواعد Firestore الجديدة من الملف المرفق.' : e.message, 'error');
    } }
    async function flip(i) { try {
        let resolve = false, keep = false;
        await runTransaction(db, async (tx) => { const s = await tx.get(ref); if (!s.exists())
            return; const d = s.data(), p = d.p1 === uid ? 1 : d.p2 === uid ? 2 : 0; if (!p || d.status !== 'active' || d.turn !== p || (d.picks || []).length >= 2 || (d.matched || []).includes(i))
            return; const picks = [...(d.picks || []), i]; if (picks.length === 2) {
            if (d.deck[picks[0]] === d.deck[picks[1]]) {
                const matched = [...(d.matched || []), ...picks], scoreKey = p === 1 ? 's1' : 's2', score = (d[scoreKey] || 0) + 1;
                tx.update(ref, { picks: [], matched, [scoreKey]: score, status: matched.length === 16 ? 'over' : 'active', at: serverTimestamp() });
                keep = true;
            }
            else {
                tx.update(ref, { picks, at: serverTimestamp() });
                resolve = true;
            }
        }
        else
            tx.update(ref, { picks, at: serverTimestamp() }); });
        if (resolve) {
            clearTimeout(timer);
            timer = setTimeout(async () => { try {
                await runTransaction(db, async (tx) => { const s = await tx.get(ref); if (!s.exists())
                    return; const d = s.data(); if ((d.picks || []).length === 2)
                    tx.update(ref, { picks: [], turn: d.turn === 1 ? 2 : 1, at: serverTimestamp() }); });
            }
            catch (e) {
                toast(e.message, 'error');
            } }, 900);
        }
    }
    catch (e) {
        toast(e.code === 'permission-denied' ? 'انشر قواعد Firestore الجديدة أولًا.' : (e.message || 'تعذر قلب الكارت'), 'error');
    } }
    async function newGame() { try {
        await runTransaction(db, async (tx) => { const s = await tx.get(ref); if (!s.exists() || s.data().status !== 'over' || !rm?.players?.includes(uid))
            return; const d = s.data(), nr = (d.round || 1) + 1; tx.update(ref, { deck: shuffled(), matched: [], picks: [], turn: nr % 2 ? 1 : 2, s1: 0, s2: 0, status: 'active', forfeit: '', round: nr, at: serverTimestamp() }); });
    }
    catch (e) {
        toast(e.message || 'حصل خطأ', 'error');
    } }
    const off = onSnapshot(ref, s => { st = s.exists() ? s.data() : null; render(); ff.sync(st?.status === 'active'); if (!st)
        init(); }, e => toast(e.code === 'permission-denied' ? 'انشر قواعد Firestore الجديدة من الملف المرفق.' : e.message, 'error'));
    const stop = onSnapshot(doc(db, 'rooms', code), s => { rm = s.exists() ? s.data() : null; render(); if (!st)
        init(); });
    stage._onlineCleanup = () => { off(); stop(); clearTimeout(timer); };
}

