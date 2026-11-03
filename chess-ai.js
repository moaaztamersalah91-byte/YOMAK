// ذكاء الكمبيوتر: Negamax + Alpha-Beta + Quiescence + ترتيب الحركات + تعميق تدريجي بحد زمني
import { pseudo, make, inCheck, legal, key, attacked, opp } from './chess-engine.js';
const V = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 0 };
const T = {
    p: [0, 0, 0, 0, 0, 0, 0, 0, 50, 50, 50, 50, 50, 50, 50, 50, 10, 10, 20, 30, 30, 20, 10, 10, 5, 5, 10, 25, 25, 10, 5, 5, 0, 0, 0, 20, 20, 0, 0, 0, 5, -5, -10, 0, 0, -10, -5, 5, 5, 10, 10, -20, -20, 10, 10, 5, 0, 0, 0, 0, 0, 0, 0, 0],
    n: [-50, -40, -30, -30, -30, -30, -40, -50, -40, -20, 0, 0, 0, 0, -20, -40, -30, 0, 10, 15, 15, 10, 0, -30, -30, 5, 15, 20, 20, 15, 5, -30, -30, 0, 15, 20, 20, 15, 0, -30, -30, 5, 10, 15, 15, 10, 5, -30, -40, -20, 0, 5, 5, 0, -20, -40, -50, -40, -30, -30, -30, -30, -40, -50],
    b: [-20, -10, -10, -10, -10, -10, -10, -20, -10, 0, 0, 0, 0, 0, 0, -10, -10, 0, 5, 10, 10, 5, 0, -10, -10, 5, 5, 10, 10, 5, 5, -10, -10, 0, 10, 10, 10, 10, 0, -10, -10, 10, 10, 10, 10, 10, 10, -10, -10, 5, 0, 0, 0, 0, 5, -10, -20, -10, -10, -10, -10, -10, -10, -20],
    r: [0, 0, 0, 0, 0, 0, 0, 0, 5, 10, 10, 10, 10, 10, 10, 5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, 0, 0, 0, 5, 5, 0, 0, 0],
    q: [-20, -10, -10, -5, -5, -10, -10, -20, -10, 0, 0, 0, 0, 0, 0, -10, -10, 0, 5, 5, 5, 5, 0, -10, -5, 0, 5, 5, 5, 5, 0, -5, 0, 0, 5, 5, 5, 5, 0, -5, -10, 5, 5, 5, 5, 5, 0, -10, -10, 0, 5, 0, 0, 0, 0, -10, -20, -10, -10, -5, -5, -10, -10, -20],
    k: [-30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -20, -30, -30, -40, -40, -30, -30, -20, -10, -20, -20, -20, -20, -20, -20, -10, 20, 20, 0, 0, 0, 0, 20, 20, 20, 30, 10, 0, 0, 10, 30, 20],
    e: [-50, -40, -30, -20, -20, -30, -40, -50, -30, -20, -10, 0, 0, -10, -20, -30, -30, -10, 20, 30, 30, 20, -10, -30, -30, -10, 30, 40, 40, 30, -10, -30, -30, -10, 30, 40, 40, 30, -10, -30, -30, -10, 20, 30, 30, 20, -10, -30, -30, -30, 0, 0, 0, 0, -30, -30, -50, -30, -30, -30, -30, -30, -30, -50]
};
const MATE = 100000;
export const LEVELS = [
    { depth: 1, ms: 300, rand: 150, blunder: .18 },
    { depth: 2, ms: 600, rand: 70, blunder: .04 },
    { depth: 3, ms: 1200, rand: 25, blunder: 0 },
    { depth: 5, ms: 2500, rand: 0, blunder: 0 },
    { depth: 9, ms: 5000, rand: 0, blunder: 0 }
];
export function evaluate(p) {
    const b = p.b;
    let mat = 0;
    for (let s = 0; s < 64; s++) {
        const x = b[s];
        if (!x)
            continue;
        const u = x.toLowerCase();
        if (u !== 'p' && u !== 'k')
            mat += V[u];
    }
    const end = mat < 2600;
    let sc = 0, bw = 0, bb = 0;
    for (let s = 0; s < 64; s++) {
        const x = b[s];
        if (!x)
            continue;
        const w = x < 'a', u = x.toLowerCase(), i = w ? s : (((7 - (s >> 3)) << 3) | (s & 7));
        const v = V[u] + (u === 'k' ? (end ? T.e : T.k) : T[u])[i];
        if (u === 'b')
            w ? bw++ : bb++;
        sc += w ? v : -v;
    }
    if (bw > 1)
        sc += 30;
    if (bb > 1)
        sc -= 30;
    return p.t === 'w' ? sc : -sc;
}
let deadline = 0, stop = false, nodes = 0;
const order = ms => {
    for (const m of ms)
        m.s = (m.c ? 10 * V[m.c.toLowerCase()] - V[m.p.toLowerCase()] / 10 + 1000 : 0) + (m.pr ? (m.pr === 'q' ? 900 : 100) : 0) + (m.k ? 50 : 0);
    ms.sort((a, b) => b.s - a.s);
    return ms;
};
function qs(p, a, b, d) {
    const st = evaluate(p);
    if (st >= b)
        return b;
    if (st > a)
        a = st;
    if (d > 6)
        return a;
    for (const m of order(pseudo(p, true))) {
        const n = make(p, m);
        if (inCheck(n, p.t))
            continue;
        const v = -qs(n, -b, -a, d + 1);
        if (v >= b)
            return b;
        if (v > a)
            a = v;
    }
    return a;
}
function ab(p, d, a, b, ply) {
    if ((++nodes & 511) === 0 && Date.now() > deadline)
        stop = true;
    if (stop)
        return 0;
    if (p.h >= 100)
        return 0;
    const chk = inCheck(p);
    if (chk && ply < 14)
        d++;
    if (d <= 0)
        return qs(p, a, b, 0);
    let any = false, best = -Infinity;
    for (const m of order(pseudo(p))) {
        const n = make(p, m);
        if (inCheck(n, p.t))
            continue;
        any = true;
        const v = -ab(n, d - 1, -b, -a, ply + 1);
        if (stop)
            return 0;
        if (v > best) {
            best = v;
            if (v > a) {
                a = v;
                if (a >= b)
                    break;
            }
        }
    }
    return any ? best : (chk ? -MATE + ply : 0);
}
/** بيرجّع أحسن حركة {f,t,p,c,k,pr,v} حسب المستوى (1 → 5). hist = مفاتيح الأوضاع السابقة */
export function search(p, level = 3, hist = []) {
    const L = LEVELS[Math.min(5, Math.max(1, level)) - 1], ms = legal(p);
    if (!ms.length)
        return null;
    deadline = Date.now() + (/Android|iPhone|Mobile/i.test((self.navigator||{}).userAgent||'') ? Math.round(L.ms * .6) : L.ms);
    stop = false;
    nodes = 0;
    let list = order(ms).map(m => ({ m, v: 0 })), done = null;
    for (let d = 1; d <= L.depth; d++) {
        const cur = [];
        let a = -Infinity;
        for (const e of list) {
            const n = make(p, e.m);
            let v = -ab(n, d - 1, -Infinity, L.rand ? Infinity : -a, 1);
            if (stop)
                break;
            if (hist.includes(key(n)))
                v -= 40;
            cur.push({ m: e.m, v });
            if (v > a)
                a = v;
        }
        if (stop && d > 1)
            break;
        if (cur.length === list.length || d === 1) {
            done = cur.length ? cur : list;
            cur.sort((x, y) => y.v - x.v);
            list = cur.length === list.length ? cur : list;
        }
        if (stop)
            break;
        if (Math.abs(cur[0]?.v) > MATE - 100)
            break;
    }
    done = done || list;
    done.sort((x, y) => y.v - x.v);
    let pick = done[0];
    if (L.blunder && Math.random() < L.blunder)
        pick = done[Math.floor(Math.random() * done.length)];
    else if (L.rand) {
        const c = done.filter(x => x.v >= done[0].v - L.rand);
        pick = c[Math.floor(Math.random() * c.length)];
    }
    return { ...pick.m, v: pick.v };
}
/** تقييم حركة: بيرجّع {label,loss,best} — Brilliant / Great / Best / Excellent / Good / Book / Inaccuracy / Mistake / Blunder / Forced */
export function rateMove(p, mv, ply = 99, D = 3) {
    deadline = Date.now() + 8000;
    stop = false;
    nodes = 0;
    const cl = v => Math.max(-1500, Math.min(1500, v)), ms = legal(p), sc = [];
    for (const x of ms)
        sc.push({ x, v: cl(-ab(make(p, x), D - 1, -Infinity, Infinity, 1)) });
    sc.sort((a, b) => b.v - a.v);
    const me = sc.find(e => e.x.f === mv.f && e.x.t === mv.t && (e.x.pr || '') === (mv.pr || ''));
    if (!me)
        return null;
    const best = sc[0].v, loss = Math.max(0, best - me.v), gap = sc[1] ? best - sc[1].v : 0;
    let label;
    if (ms.length === 1)
        label = 'Forced';
    else {
        const m = me.x, n = make(p, m), u = m.p.toLowerCase(), pv = V[u] || 0, cap = m.c ? V[m.c.toLowerCase()] : 0, mover = p.t;
        const sac = pv >= 300 && pv - cap >= 300 && attacked(n.b, m.t, opp(mover)) && !attacked(n.b, m.t, mover);
        if (sac && loss <= 15 && me.v >= -50 && best < 700)
            label = 'Brilliant';
        else if (loss <= 10 && gap >= 150 && best > -300 && best < 800)
            label = 'Great';
        else if (ply < 8 && loss <= 30)
            label = 'Book';
        else if (loss <= 5)
            label = 'Best';
        else if (loss <= 25)
            label = 'Excellent';
        else if (loss <= 60)
            label = 'Good';
        else if (loss <= 120)
            label = 'Inaccuracy';
        else if (loss <= 250)
            label = 'Mistake';
        else
            label = 'Blunder';
    }
    return { label, loss, best: sc[0].x && { f: sc[0].x.f, t: sc[0].x.t, pr: sc[0].x.pr || '' } };
}
/** تقييم الوضع: نقاط من وجهة نظر الأبيض (+ = الأبيض أفضل) */
export function evalPos(p, D = 4) {
    deadline = Date.now() + 1500;
    stop = false;
    nodes = 0;
    if (!legal(p).length)
        return inCheck(p) ? (p.t === 'w' ? -1500 : 1500) : 0;
    let v = ab(p, D, -Infinity, Infinity, 0);
    if (stop)
        return null;
    v = Math.max(-1500, Math.min(1500, v));
    return p.t === 'w' ? v : -v;
}

