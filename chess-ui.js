// واجهة اللوحة المشتركة (أوفلاين + أونلاين): رسم + سحب وإفلات + نقر + ترقية + ساعات + أصوات
import { pieceSVG } from './chess-pieces.js';
import { nm, col, inCheck } from './chess-engine.js';
const mk = (t, c, x) => { const e = document.createElement(t); if (c)
    e.className = c; if (x != null)
    e.textContent = x; return e; };
const LS = (k, v) => { try {
    if (v === undefined)
        return localStorage.getItem(k);
    localStorage.setItem(k, v);
}
catch (e) {
    return null;
} };
const VAL = { p: 1, n: 3, b: 3, r: 5, q: 9 }, FULL = { p: 8, n: 2, b: 2, r: 2, q: 1 };
function sfx(kind) { const S = window.SFX; if (!S)
    return; S.play({ end: 'win', check: 'check', cap: 'capture', move: 'move' }[kind] || 'move'); }
export const fmtClock = ms => {
    if (ms == null)
        return '';
    ms = Math.max(0, ms);
    if (ms < 10000)
        return `0:${String(Math.floor(ms / 1000)).padStart(2, '0')}.${Math.floor(ms % 1000 / 100)}`;
    const s = Math.floor(ms / 1000), h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60);
    return h ? `${h}:${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}` : `${m}:${String(s % 60).padStart(2, '0')}`;
};
const RTI = { Brilliant: '!!', Great: '!', Best: '★', Excellent: '👍', Good: '✓', Book: '📖', Inaccuracy: '?!', Mistake: '?', Blunder: '??', Forced: '→' };
export function createBoard(root, o) {
    const g = o.game, S = { view: g.pos.length - 1, sel: -1, tg: [], flip: !!o.flip, promo: null, hint: null, drag: null };
    const theme = 'teal';
    root.replaceChildren();
    const box = mk('div', 'ch');
    box.dataset.theme = theme;
    const left = mk('div', 'ch-left'), right = mk('div', 'ch-right');
    const pl = { top: mk('div', 'ch-pl'), bot: mk('div', 'ch-pl') };
    for (const k in pl) {
        const x = pl[k];
        x.append(mk('span', 'ch-av'), (() => { const d = mk('div', 'ch-pn'); d.append(mk('b', 'ch-name'), mk('div', 'ch-cap')); return d; })(), mk('div', 'ch-clock'));
    }
    const bw = mk('div', 'ch-bw'), board = mk('div', 'ch-board');
    board.dir = 'ltr';
    board.setAttribute('role', 'grid');
    board.setAttribute('aria-label', 'لوحة الشطرنج');
    const sqs = [];
    for (let k = 0; k < 64; k++) {
        const e = mk('div', 'sq');
        e.dataset.k = k;
        sqs.push(e);
        board.append(e);
    }
    const over = mk('div', 'ch-over');
    over.hidden = true;
    const promo = mk('div', 'ch-promo');
    promo.hidden = true;
    bw.append(board, promo, over);
    left.append(pl.top, bw, pl.bot);
    const status = mk('div', 'ch-status');
    status.setAttribute('aria-live', 'polite');
    const moves = mk('div', 'ch-moves');
    moves.tabIndex = 0;
    const nav = mk('div', 'ch-nav');
    const nb = (t, l, fn) => { const b = mk('button', 'secondary ch-nb', t); b.type = 'button'; b.title = l; b.setAttribute('aria-label', l); b.onclick = fn; nav.append(b); return b; };
    nb('⏮', 'أول حركة', () => setView(0));
    nb('◀', 'السابقة', () => setView(S.view - 1));
    nb('▶', 'التالية', () => setView(S.view + 1));
    nb('⏭', 'آخر حركة', () => setView(g.pos.length - 1));
    const tools = mk('div', 'ch-tools'), actions = mk('div', 'ch-actions');
    const tb = (t, l, fn) => { const b = mk('button', 'secondary ch-tb', t); b.type = 'button'; b.title = l; b.setAttribute('aria-label', l); b.onclick = fn; tools.append(b); return b; };
    tb('⇅', 'اقلب اللوحة', () => api.flip());
    const ad = mk('aside', 'ad-slot');
    ad.id = 'adSlot';
    ad.hidden = true;
    ad.setAttribute('aria-label', 'إعلان');
    right.append(status, moves, nav, tools, actions, ad);
    box.append(left, right);
    root.append(box);
    const cur = () => g.pos[S.view], last = () => S.view === g.pos.length - 1;
    const bi = k => S.flip ? 63 - k : k;
    const canMove = () => last() && !g.res && !!o.side() && !S.promo;
    const mine = pc => pc && col(pc) === cur().t && o.side().includes(col(pc));
    function render(mv) {
        const p = cur(), lm = S.view > 0 ? g.mv[S.view - 1] : null, chk = inCheck(p) ? p.b.indexOf(p.t === 'w' ? 'K' : 'k') : -1;
        sqs.forEach((e, k) => {
            const i = bi(k), r = i >> 3, f = i & 7, pc = p.b[i];
            e.className = 'sq ' + ((r + f) & 1 ? 'dk' : 'lt');
            e.dataset.i = i;
            if (lm && (i === lm.f || i === lm.t))
                e.classList.add('lm');
            if (i === S.sel)
                e.classList.add('chsel');
            if (S.hint && (i === S.hint[0] || i === S.hint[1]))
                e.classList.add('hint');
            if (i === chk)
                e.classList.add('chk');
            if (S.tg.includes(i))
                e.classList.add(pc ? 'tgc' : 'tg');
            if (e._pc !== pc) {
                e._pc = pc;
                e.replaceChildren();
                if (pc) {
                    const d = mk('div', 'pc');
                    d.innerHTML = pieceSVG(pc);
                    e.append(d);
                }
            }
            e.querySelectorAll('.rk,.fl').forEach(x => x.remove());
            const row = Math.floor(k / 8), cl = k % 8;
            if (cl === 0)
                e.append(Object.assign(mk('i', 'rk', String(8 - (i >> 3))), {}));
            if (row === 7)
                e.append(mk('i', 'fl', String.fromCharCode(97 + (i & 7))));
        });
        if (mv && last())
            animate(mv);
        renderSide();
        renderMoves();
    }
    function animate(m) {
        if (matchMedia('(prefers-reduced-motion:reduce)').matches)
            return;
        const to = sqs.find(e => +e.dataset.i === m.t), fr = sqs.find(e => +e.dataset.i === m.f), pc = to?.querySelector('.pc');
        if (!pc || !fr)
            return;
        const a = fr.getBoundingClientRect(), b = to.getBoundingClientRect();
        pc.style.zIndex = 5;
        pc.animate([{ transform: `translate(${a.left - b.left}px,${a.top - b.top}px)` }, { transform: 'none' }], { duration: 160, easing: 'ease-out' }).onfinish = () => { pc.style.zIndex = ''; };
    }
    function renderSide() {
        const p = cur(), cnt = { w: {}, b: {} };
        let mat = 0;
        for (const x of p.b) {
            if (!x)
                continue;
            const u = x.toLowerCase(), c = col(x);
            cnt[c][u] = (cnt[c][u] || 0) + 1;
            if (VAL[u])
                mat += (c === 'w' ? 1 : -1) * VAL[u];
        }
        const lost = c => { const a = []; for (const u of 'qrbnp') {
            const n = Math.max(0, FULL[u] - (cnt[c][u] || 0));
            for (let j = 0; j < n; j++)
                a.push(c === 'w' ? u.toUpperCase() : u);
        } return a; };
        const bottom = S.flip ? 'b' : 'w';
        for (const k of ['top', 'bot']) {
            const c = k === 'bot' ? bottom : (bottom === 'w' ? 'b' : 'w'), x = pl[k], cap = x.querySelector('.ch-cap');
            x.dataset.c = c;
            cap.replaceChildren();
            const taken = lost(c === 'w' ? 'b' : 'w');
            taken.forEach(t => { const s = mk('span', 'cp'); s.innerHTML = pieceSVG(t); cap.append(s); });
            const d = (c === 'w' ? mat : -mat);
            if (d > 0)
                cap.append(mk('em', '', `+${d}`));
            const info = o.players?.() || {};
            const pi = info[c] || {};
            x.querySelector('.ch-name').textContent = pi.name || (c === 'w' ? 'الأبيض' : 'الأسود');
            const av = x.querySelector('.ch-av');
            if (pi.icon) av.textContent = pi.icon;
            else av.innerHTML = pieceSVG(c === 'w' ? 'K' : 'k');
            av.dataset.c = c;
            x.classList.toggle('turn', !g.res && g.cur.t === c && last());
        }
    }
    function renderMoves() {
        moves.replaceChildren();
        if (!g.san.length) {
            moves.append(mk('p', 'muted ch-empty', 'لسه ماحدش لعب. حرّك أي قطعة تبدأ اللعبة.'));
            return;
        }
        for (let i = 0; i < g.san.length; i += 2) {
            const r = mk('div', 'mr');
            r.append(mk('span', 'mn', `${i / 2 + 1}.`));
            for (const j of [i, i + 1]) {
                if (j >= g.san.length)
                    break;
                const b = mk('button', 'mv' + (j + 1 === S.view ? ' chon' : ''), g.san[j]);
                b.type = 'button';
                const lb = S.review && g.rt && g.rt[j];
                if (lb) {
                    const t = mk('i', 'rt rt-' + lb, RTI[lb]);
                    t.title = lb;
                    b.append(t);
                }
                b.onclick = () => setView(j + 1);
                r.append(b);
            }
            moves.append(r);
        }
        const on = moves.querySelector('.chon');
        if (on)
            on.scrollIntoView({ block: 'nearest' });
        else
            moves.scrollTop = moves.scrollHeight;
    }
    function setView(i) { i = Math.max(0, Math.min(g.pos.length - 1, i)); S.view = i; clear(); render(); }
    function clear() { S.sel = -1; S.tg = []; S.promo = null; promo.hidden = true; }
    function select(i) { S.sel = i; S.tg = g.legal().filter(m => m.f === i).map(m => m.t); render(); }
    function attempt(f, t) {
        if (g.needsPromo(f, t)) {
            const c = cur().t;
            promo.replaceChildren();
            promo.hidden = false;
            S.promo = [f, t];
            for (const q of 'qrbn') {
                const b = mk('button', 'pq');
                b.type = 'button';
                b.innerHTML = pieceSVG(c === 'w' ? q.toUpperCase() : q);
                b.setAttribute('aria-label', { q: 'وزير', r: 'قلعة', b: 'فيل', n: 'حصان' }[q]);
                b.onclick = () => { const [a, z] = S.promo; clear(); render(); o.onMove(a, z, q); };
                promo.append(b);
            }
            const x = mk('button', 'pq pc2', '✕');
            x.type = 'button';
            x.onclick = () => { clear(); render(); };
            promo.append(x);
            return;
        }
        clear();
        render();
        o.onMove(f, t, '');
    }
    const sqAt = (x, y) => document.elementFromPoint(x, y)?.closest?.('.sq');
    board.addEventListener('pointerdown', e => {
        const el = e.target.closest('.sq');
        if (!el || e.button > 0)
            return;
        if (!canMove()) {
            return;
        }
        const i = +el.dataset.i, pc = cur().b[i];
        if (S.sel >= 0 && S.tg.includes(i)) {
            attempt(S.sel, i);
            return;
        }
        if (mine(pc)) {
            const was = S.sel === i;
            select(i);
            const sx = e.clientX, sy = e.clientY, d = { i, was, moved: false, ghost: null };
            S.drag = d;
            const mv = ev => {
                if (!d.moved && Math.hypot(ev.clientX - sx, ev.clientY - sy) < 6)
                    return;
                if (!d.moved) {
                    d.moved = true;
                    const src = sqs.find(z => +z.dataset.i === i), r = src.getBoundingClientRect();
                    d.ghost = mk('div', 'pc ch-ghost');
                    d.ghost.innerHTML = pieceSVG(pc);
                    d.ghost.style.width = r.width + 'px';
                    d.ghost.style.height = r.height + 'px';
                    document.body.append(d.ghost);
                    src.classList.add('chdrag');
                }
                d.ghost.style.left = ev.clientX - d.ghost.offsetWidth / 2 + 'px';
                d.ghost.style.top = ev.clientY - d.ghost.offsetHeight / 2 + 'px';
            };
            const up = ev => {
                removeEventListener('pointermove', mv);
                removeEventListener('pointerup', up);
                removeEventListener('pointercancel', up);
                S.drag = null;
                if (d.ghost) {
                    d.ghost.remove();
                    sqs.forEach(z => z.classList.remove('chdrag'));
                }
                if (d.moved) {
                    const t = sqAt(ev.clientX, ev.clientY);
                    const ti = t ? +t.dataset.i : -1;
                    if (S.tg.includes(ti))
                        attempt(i, ti);
                    else
                        render();
                }
                else if (d.was) {
                    clear();
                    render();
                }
            };
            addEventListener('pointermove', mv);
            addEventListener('pointerup', up);
            addEventListener('pointercancel', up);
            e.preventDefault();
        }
        else {
            clear();
            render();
        }
    });
    addEventListener('keydown', ev => {
        if (!root.isConnected || /INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName || '') || document.querySelector('dialog[open]'))
            return;
        if (ev.key === 'ArrowLeft') {
            setView(S.view - 1);
            ev.preventDefault();
        }
        else if (ev.key === 'ArrowRight') {
            setView(S.view + 1);
            ev.preventDefault();
        }
        else if (ev.key === 'Home')
            setView(0);
        else if (ev.key === 'End')
            setView(g.pos.length - 1);
        else if (ev.key === 'Escape' && S.sel >= 0) {
            clear();
            render();
        }
    });
    const api = {
        el: box, actions,
        render: () => render(),
        /** بعد أي حركة جديدة: بيروح لآخر وضع ويشغّل أنيميشن وصوت */
        refresh() {
            S.hint = null;
            clear();
            S.view = g.pos.length - 1;
            const m = g.mv[g.mv.length - 1];
            render(m);
            if (m) {
                const s = g.san[g.san.length - 1] || '';
                sfx(g.res ? 'end' : /[+#]/.test(s) ? 'check' : m.c ? 'cap' : 'move');
            }
        },
        setView, flip() { S.flip = !S.flip; render(); }, isFlipped: () => S.flip, setFlip(v) { S.flip = !!v; render(); },
        setStatus(t, tone = '') { status.textContent = t; status.dataset.tone = tone; },
        setClock(c, ms, active, hide) {
            for (const k of ['top', 'bot']) {
                const x = pl[k];
                if (x.dataset.c !== c)
                    continue;
                const el = x.querySelector('.ch-clock');
                el.hidden = !!hide || ms == null;
                el.textContent = fmtClock(ms);
                el.classList.toggle('chon', !!active);
                el.classList.toggle('low', ms != null && ms < 20000);
            }
        },
        setHint(f, t) { S.hint = [f, t]; render(); setTimeout(() => { if (S.hint && S.hint[0] === f) {
            S.hint = null;
            render();
        } }, 3500); },
        sound: sfx,
        showResult({ title, sub, actions = [] }) {
            over.replaceChildren();
            const c = mk('div', 'ch-card');
            c.append(mk('h3', '', title), mk('p', 'muted', sub || ''));
            const a = mk('div', 'ch-card-a');
            actions.forEach(x => { const b = mk('button', x.primary ? '' : 'secondary', x.t); b.type = 'button'; b.onclick = () => { if (x.keep !== true)
                over.hidden = true; x.fn(); }; a.append(b); });
            c.append(a);
            over.append(c);
            over.hidden = false;
        },
        hideResult() { over.hidden = true; },
        addAction(t, fn, cls = 'secondary') { const b = mk('button', cls, t); b.type = 'button'; b.onclick = fn; actions.append(b); return b; },
        clearActions() { actions.replaceChildren(); },
        destroy() { root.replaceChildren(); }
    };
    render();
    return api;
}

