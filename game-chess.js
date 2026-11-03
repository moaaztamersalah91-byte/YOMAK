// شطرنج أونلاين داخل غرفة اللعب (بيتحمّل من room.js). الحالة في rooms/{code}/game/state
import { db } from './firebase.js';
import { doc, onSnapshot, runTransaction, serverTimestamp } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js';
import { toast } from './ui.js';
import { Game, uci } from './chess-engine.js';
import { createBoard } from './chess-ui.js';
import { watchRoom } from './rooms.js';
import { getProfile } from './username.js';
const mk = (t, c, x) => { const e = document.createElement(t); if (c)
    e.className = c; if (x != null)
    e.textContent = x; return e; };
const TC = [['بدون وقت', 0, 0], ['3 | 2', 180, 2], ['5 دقايق', 300, 0], ['10 دقايق', 600, 0], ['15 | 10', 900, 10]];
const REASON = { mate: 'كش مات', stalemate: 'تعادل بالجمود', insufficient: 'مفيش قطع كفاية', '50': 'قاعدة الـ 50 حركة', repetition: 'تكرار الوضع', resign: 'استسلام / خروج', timeout: 'انتهى الوقت', draw: 'اتفاق على التعادل' };
const err = e => toast(e?.code === 'permission-denied' ? 'انشر firestore.rules المحدّث في Firebase الأول' : (e?.message || 'حصل خطأ'), 'error');
export async function mount(stage, { code, uid, room }) {
    if (!document.querySelector('link[data-chess-css]')) {
        const l = document.createElement('link');
        l.rel = 'stylesheet';
        l.href = 'chess.css';
        l.dataset.chessCss = '1';
        document.head.append(l);
    }
    stage.replaceChildren();
    stage.classList.add('ch-stage');
    stage.closest('.rw-two')?.classList.add('rm-wide');
    const ref = doc(db, 'rooms', code, 'game', 'state');
    const bar = mk('div', 'rm-banner');
    bar.hidden = true;
    const root = mk('div');
    stage.append(bar, root);
    let st, rm = room(), game = null, ui = null, N = -1, lastLen = -1, clk = { w: 0, b: 0 }, sync = Date.now(), mine = 'w', shown = -1, tcSel = 2, historySavedFor = '';
    const timed = () => st && st.tc && st.tc.base > 0, opp = () => st && (mine === 'w' ? st.black : st.white);
    const rem = c => !timed() ? null : Math.max(0, clk[c] - (st.status === 'active' && game && game.cur.t === c && !game.res ? Date.now() - sync : 0));
    const nameOf = u => rm?.names?.[u] || 'لاعب';
    function showBar(msg, btns = []) { bar.hidden = !msg; bar.replaceChildren(); if (!msg)
        return; bar.dataset.tone = ''; bar.style.display = 'flex'; bar.style.gap = '10px'; bar.style.flexWrap = 'wrap'; bar.style.alignItems = 'center'; bar.append(mk('span', '', msg)); for (const [t, fn, cls] of btns) {
        const b = mk('button', cls || '', t);
        b.type = 'button';
        b.onclick = fn;
        bar.append(b);
    } }
    function waiting() {
        ui = null;
        N = -1;
        root.replaceChildren();
        showBar('');
        const w = mk('div', 'ch-wait');
        w.append(mk('div', 'rm-soon', '♟️'));
        const n = rm?.players?.length || 1;
        if (n < 2) {
            w.append(mk('h3', '', 'في انتظار صاحبك…'), mk('p', 'muted', `ابعتله كود الغرفة ${code} أو لينك الدعوة من فوق.`));
        }
        else if (rm.host === uid) {
            w.append(mk('h3', '', 'الاتنين جاهزين! اختار الوقت وابدأ'));
            const g = mk('div', 'chs-grid');
            TC.forEach(([t], i) => { const b = mk('button', 'chs-opt'); b.type = 'button'; b.setAttribute('aria-pressed', i === tcSel); b.append(mk('b', '', t)); b.onclick = () => { tcSel = i; waiting(); }; g.append(b); });
            w.append(g);
            const go = mk('button', '', 'ابدأ اللعبة ♟️');
            go.type = 'button';
            go.onclick = async () => {
                go.disabled = true;
                const [, base, ic] = TC[tcSel], [a, b] = Math.random() < .5 ? rm.players : [rm.players[1], rm.players[0]];
                try {
                    await runTransaction(db, async (tx) => { if ((await tx.get(ref)).exists())
                        return; tx.set(ref, { white: a, black: b, moves: [], turn: 'w', tc: { base, inc: ic }, wms: base * 1000, bms: base * 1000, status: 'active', result: '', reason: '', drawBy: '', n: 0, at: serverTimestamp() }); });
                }
                catch (e) {
                    err(e);
                    go.disabled = false;
                }
            };
            w.append(go);
        }
        else
            w.append(mk('h3', '', 'صاحبك المضيف بيجهّز اللعبة…'));
        root.append(w);
    }
    function build() {
        mine = st.white === uid ? 'w' : 'b';
        game = new Game();
        N = st.n;
        lastLen = -1;
        shown = -1;
        root.replaceChildren();
        ui = createBoard(root, { game, flip: mine === 'b',
            side: () => st.status === 'active' && !game.res && game.cur.t === mine && st.moves.length === game.mv.length ? mine : '',
            players: () => ({ w: { name: nameOf(st.white) + (mine === 'w' ? ' (إنت)' : ''), icon: '🙂' }, b: { name: nameOf(st.black) + (mine === 'b' ? ' (إنت)' : ''), icon: '🙂' } }),
            onMove });
        ui.addAction('♻️ اطلع للألعاب', () => { if (st.status === 'active' && !confirm('اللعبة لسه شغالة. تخرج؟'))
            return; location.href = 'games.html'; });
        ui.addAction('🏳️ استسلام', () => { if (st.status !== 'active' || !confirm('متأكد إنك عايز تستسلم؟'))
            return; end(mine === 'w' ? '0-1' : '1-0', 'resign'); });
    }
    stage._onlineLeave = async () => { if (st && st.status === 'active' && (st.white === uid || st.black === uid))
        await end(st.white === uid ? '0-1' : '1-0', 'resign'); };
    async function end(result, reason) {
        try {
            await runTransaction(db, async (tx) => { const s = await tx.get(ref); if (s.exists() && s.data().status === 'active')
                tx.update(ref, { status: 'over', result, reason, drawBy: '', at: serverTimestamp() }); });
        }
        catch (e) {
            err(e);
        }
    }
    async function onMove(f, t, pr) {
        if (!game.play(f, t, pr))
            return;
        const mover = mine, now = Date.now(), mvs = [...st.moves, uci(game.mv[game.mv.length - 1])];
        const left = timed() ? Math.round(Math.max(0, rem(mover)) + st.tc.inc * 1000) : 0;
        clk = { ...clk, [mover]: left };
        sync = now;
        lastLen = mvs.length;
        const upd = { moves: mvs, turn: game.cur.t, wms: Math.round(mover === 'w' ? left : clk.w), bms: Math.round(mover === 'b' ? left : clk.b), at: serverTimestamp() };
        if (game.res) {
            upd.status = 'over';
            upd.result = game.res.result;
            upd.reason = game.res.reason;
        }
        st = { ...st, ...upd, moves: mvs };
        ui.refresh();
        paint();
        try {
            await runTransaction(db, async (tx) => { const s = await tx.get(ref); if (!s.exists() || s.data().moves.length !== mvs.length - 1)
                throw Error('stale'); tx.update(ref, upd); });
        }
        catch (e) {
            if (e.message !== 'stale')
                err(e);
            else
                toast('الحركة ماتسجّلتش، اتحدّثت اللوحة', 'info');
            build();
        }
    }
    async function saveFriendHistory() {
        if (st?.status !== 'over' || !game || !game.mv.length)
            return;
        const id = `${code}-${st.n}-${st.result || ''}`;
        if (historySavedFor === id)
            return;
        historySavedFor = id;
        let opponent = nameOf(opp());
        try {
            const p = await getProfile(opp());
            if (p?.username)
                opponent = '@' + p.username;
        }
        catch { }
        const key = 'yomak_chess_friend_history';
        let list = [];
        try {
            list = JSON.parse(localStorage.getItem(key) || '[]');
        }
        catch { }
        if (list.some(x => x.id === id))
            return;
        list.unshift({ id, date: new Date().toISOString(), mode: 'friend', opponent, result: st.result || '', reason: st.reason || '', moves: game.san.slice(-100) });
        try {
            localStorage.setItem(key, JSON.stringify(list.slice(0, 100)));
        }
        catch { }
    }
    function paint() {
        if (!ui)
            return;
        for (const c of ['w', 'b'])
            ui.setClock(c, rem(c), st.status === 'active' && !game.res && game.cur.t === c, !timed());
        const t = game.cur.t;
        if (st.status === 'over') {
            const r = st.result;
            ui.setStatus(`${r === '1/2-1/2' ? 'تعادل' : r === '1-0' ? 'فاز الأبيض' : 'فاز الأسود'} — ${REASON[st.reason] || ''}`, 'warn');
        }
        else {
            const chk = /[+#]$/.test(game.san[game.san.length - 1] || '');
            ui.setStatus((t === mine ? 'دورك' : `دور ${nameOf(t === 'w' ? st.white : st.black)}`) + (chk ? ' — كش! ⚠️' : ''), chk ? 'warn' : '');
        }
        // شريط التنبيهات: خروج الخصم
        if (st.status === 'active') {
            if (rm && (rm.status === 'closed' || !rm.players.includes(opp())))
                showBar('صاحبك خرج من الغرفة.');
            else
                showBar('');
        }
        else
            showBar('');
        if (st.status === 'over')
            saveFriendHistory();
        if (st.status === 'over' && shown !== st.n) {
            shown = st.n;
            const r = st.result, w = r === '1-0' ? 'w' : r === '0-1' ? 'b' : '';
            ui.sound('end');
            ui.showResult({ title: !w ? 'تعادل 🤝' : w === mine ? 'كسبت! 🎉' : 'خسرت المرة دي', sub: REASON[st.reason] || '', actions: [{ t: 'ريماتش (بنبدّل الألوان)', primary: true, fn: rematch }, { t: 'مراجعة الحركات', fn: () => { } }, { t: 'للألعاب', fn: () => location.href = 'games.html' }] });
        }
    }
    async function rematch() {
        try {
            await runTransaction(db, async (tx) => {
                const s = await tx.get(ref), d = s.data();
                if (d.status !== 'over')
                    return;
                const b = d.tc.base * 1000;
                tx.update(ref, { white: d.black, black: d.white, moves: [], turn: 'w', wms: b, bms: b, status: 'active', result: '', reason: '', drawBy: '', n: d.n + 1, at: serverTimestamp() });
            });
        }
        catch (e) {
            err(e);
        }
    }
    function onState(s) {
        if (!s) {
            st = null;
            waiting();
            return;
        }
        const first = !st || s.n !== N;
        st = s;
        if (first || !ui) {
            build();
        }
        // مزامنة الحركات
        const mv = st.moves;
        let ok = game.mv.length <= mv.length;
        for (let i = 0; ok && i < game.mv.length; i++)
            if (uci(game.mv[i]) !== mv[i])
                ok = false;
        if (!ok) {
            game = new Game();
            ui.destroy();
            build();
        }
        const had = game.mv.length;
        for (let i = game.mv.length; i < mv.length; i++) {
            if (!game.playUci(mv[i])) {
                toast('حركة غير صالحة من الخصم', 'error');
                break;
            }
        }
        if (mv.length !== lastLen) {
            clk = { w: st.wms, b: st.bms };
            sync = Date.now();
            lastLen = mv.length;
        }
        if (st.status === 'over' && !game.res)
            game.setResult(st.result, st.reason);
        if (game.mv.length !== had)
            ui.refresh();
        else
            ui.render();
        paint();
    }
    setInterval(() => {
        if (!st || !ui || st.status !== 'active' || !timed())
            return;
        paint();
        const c = game.cur.t;
        if (rem(c) <= 0 && !game.res) {
            end(c === 'w' ? '0-1' : '1-0', 'timeout');
        }
    }, 250);
    watchRoom(code, r => { rm = r; if (!st)
        waiting();
    else
        paint(); }, () => { });
    onSnapshot(ref, s => onState(s.exists() ? s.data() : null), e => { err(e); waiting(); });
    waiting();
}

