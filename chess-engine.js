// محرك الشطرنج: قواعد كاملة (رُقعة 8×8، بدون مكتبات). r=0 هو الصف 8 (فوق).
export const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const FL = 'abcdefgh';
export const nm = i => FL[i & 7] + (8 - (i >> 3));
export const ix = s => (8 - (+s[1])) * 8 + FL.indexOf(s[0]);
export const col = p => p ? (p < 'a' ? 'w' : 'b') : '';
export const opp = c => c === 'w' ? 'b' : 'w';
const KN = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]];
const KG = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
const BD = [[-1, -1], [-1, 1], [1, -1], [1, 1]], RD = [[-1, 0], [1, 0], [0, -1], [0, 1]];
export function parse(f) {
    const [pl, t = 'w', c = '-', e = '-', h = '0', n = '1'] = f.trim().split(/\s+/), b = [];
    for (const ch of pl) {
        if (ch === '/')
            continue;
        if (ch >= '1' && ch <= '8')
            for (let i = 0; i < +ch; i++)
                b.push('');
        else
            b.push(ch);
    }
    if (b.length !== 64)
        throw new Error('bad fen');
    return { b, t, c: c === '-' ? '' : c, e: e === '-' ? -1 : ix(e), h: +h, n: +n };
}
export function fen(p) {
    let s = '';
    for (let r = 0; r < 8; r++) {
        let z = 0;
        for (let f = 0; f < 8; f++) {
            const x = p.b[r * 8 + f];
            if (!x)
                z++;
            else {
                if (z) {
                    s += z;
                    z = 0;
                }
                s += x;
            }
        }
        if (z)
            s += z;
        if (r < 7)
            s += '/';
    }
    return `${s} ${p.t} ${p.c || '-'} ${p.e < 0 ? '-' : nm(p.e)} ${p.h} ${p.n}`;
}
export function attacked(b, s, by) {
    const r = s >> 3, f = s & 7, w = by === 'w', pr = w ? r + 1 : r - 1, P = w ? 'P' : 'p', N = w ? 'N' : 'n', K = w ? 'K' : 'k', B = w ? 'B' : 'b', R = w ? 'R' : 'r', Q = w ? 'Q' : 'q';
    if (pr >= 0 && pr < 8) {
        if (f > 0 && b[pr * 8 + f - 1] === P)
            return true;
        if (f < 7 && b[pr * 8 + f + 1] === P)
            return true;
    }
    for (const [dr, df] of KN) {
        const rr = r + dr, ff = f + df;
        if (rr >= 0 && rr < 8 && ff >= 0 && ff < 8 && b[rr * 8 + ff] === N)
            return true;
    }
    for (const [dr, df] of KG) {
        const rr = r + dr, ff = f + df;
        if (rr >= 0 && rr < 8 && ff >= 0 && ff < 8 && b[rr * 8 + ff] === K)
            return true;
    }
    for (const [dr, df] of BD) {
        let rr = r + dr, ff = f + df;
        while (rr >= 0 && rr < 8 && ff >= 0 && ff < 8) {
            const x = b[rr * 8 + ff];
            if (x) {
                if (x === B || x === Q)
                    return true;
                break;
            }
            rr += dr;
            ff += df;
        }
    }
    for (const [dr, df] of RD) {
        let rr = r + dr, ff = f + df;
        while (rr >= 0 && rr < 8 && ff >= 0 && ff < 8) {
            const x = b[rr * 8 + ff];
            if (x) {
                if (x === R || x === Q)
                    return true;
                break;
            }
            rr += dr;
            ff += df;
        }
    }
    return false;
}
/** حركات شبه قانونية. caps=true: الأخذ والترقية فقط (للبحث الهادئ) */
export function pseudo(p, caps = false) {
    const b = p.b, t = p.t, out = [];
    const add = (f, to, pc, c, k = '', pr = '') => out.push({ f, t: to, p: pc, c, k, pr });
    for (let s = 0; s < 64; s++) {
        const pc = b[s];
        if (!pc || (pc < 'a' ? 'w' : 'b') !== t)
            continue;
        const r = s >> 3, f = s & 7, u = pc.toUpperCase();
        if (u === 'P') {
            const d = t === 'w' ? -1 : 1, st = t === 'w' ? 6 : 1, la = t === 'w' ? 0 : 7, r1 = r + d;
            if (r1 < 0 || r1 > 7)
                continue;
            const prm = (to, c) => { if (r1 === la)
                for (const q of 'qrbn')
                    add(s, to, pc, c, '', q);
            else
                add(s, to, pc, c); };
            if (!b[r1 * 8 + f]) {
                if (!caps || r1 === la)
                    prm(r1 * 8 + f, '');
                if (!caps && r === st && !b[(r + 2 * d) * 8 + f])
                    add(s, (r + 2 * d) * 8 + f, pc, '');
            }
            for (const df of [-1, 1]) {
                const ff = f + df;
                if (ff < 0 || ff > 7)
                    continue;
                const to = r1 * 8 + ff, x = b[to];
                if (x && (x < 'a' ? 'w' : 'b') !== t)
                    prm(to, x);
                else if (!x && to === p.e)
                    add(s, to, pc, t === 'w' ? 'p' : 'P', 'e');
            }
        }
        else if (u === 'N' || u === 'K') {
            for (const [dr, df] of u === 'N' ? KN : KG) {
                const rr = r + dr, ff = f + df;
                if (rr < 0 || rr > 7 || ff < 0 || ff > 7)
                    continue;
                const to = rr * 8 + ff, x = b[to];
                if (!x) {
                    if (!caps)
                        add(s, to, pc, '');
                }
                else if (col(x) !== t)
                    add(s, to, pc, x);
            }
        }
        else {
            const dirs = u === 'B' ? BD : u === 'R' ? RD : BD.concat(RD);
            for (const [dr, df] of dirs) {
                let rr = r + dr, ff = f + df;
                while (rr >= 0 && rr < 8 && ff >= 0 && ff < 8) {
                    const to = rr * 8 + ff, x = b[to];
                    if (!x) {
                        if (!caps)
                            add(s, to, pc, '');
                    }
                    else {
                        if (col(x) !== t)
                            add(s, to, pc, x);
                        break;
                    }
                    rr += dr;
                    ff += df;
                }
            }
        }
    }
    if (!caps) {
        const ks = t === 'w' ? 60 : 4, kp = t === 'w' ? 'K' : 'k', rp = t === 'w' ? 'R' : 'r', op = opp(t);
        if (b[ks] === kp && p.c && !attacked(b, ks, op)) {
            if (p.c.includes(t === 'w' ? 'K' : 'k') && b[ks + 3] === rp && !b[ks + 1] && !b[ks + 2] && !attacked(b, ks + 1, op) && !attacked(b, ks + 2, op))
                add(ks, ks + 2, kp, '', 'K');
            if (p.c.includes(t === 'w' ? 'Q' : 'q') && b[ks - 4] === rp && !b[ks - 1] && !b[ks - 2] && !b[ks - 3] && !attacked(b, ks - 1, op) && !attacked(b, ks - 2, op))
                add(ks, ks - 2, kp, '', 'Q');
        }
    }
    return out;
}
export function make(p, m) {
    const b = p.b.slice(), t = p.t;
    let pc = m.p;
    b[m.f] = '';
    if (m.k === 'e')
        b[m.t + (t === 'w' ? 8 : -8)] = '';
    if (m.pr)
        pc = t === 'w' ? m.pr.toUpperCase() : m.pr;
    b[m.t] = pc;
    if (m.k === 'K') {
        b[m.t + 1] = '';
        b[m.t - 1] = t === 'w' ? 'R' : 'r';
    }
    if (m.k === 'Q') {
        b[m.t - 2] = '';
        b[m.t + 1] = t === 'w' ? 'R' : 'r';
    }
    let c = p.c;
    if (c) {
        const strip = x => { c = c.replace(x, ''); };
        if (m.p === 'K') {
            strip('K');
            strip('Q');
        }
        else if (m.p === 'k') {
            strip('k');
            strip('q');
        }
        for (const s of [m.f, m.t]) {
            if (s === 63)
                strip('K');
            else if (s === 56)
                strip('Q');
            else if (s === 7)
                strip('k');
            else if (s === 0)
                strip('q');
        }
    }
    const pawn = m.p === 'P' || m.p === 'p';
    return { b, t: opp(t), c, e: pawn && Math.abs(m.t - m.f) === 16 ? (m.f + m.t) >> 1 : -1, h: pawn || m.c ? 0 : p.h + 1, n: p.n + (t === 'b' ? 1 : 0) };
}
export const inCheck = (p, t = p.t) => { const k = p.b.indexOf(t === 'w' ? 'K' : 'k'); return k >= 0 && attacked(p.b, k, opp(t)); };
export function legal(p) { const o = []; for (const m of pseudo(p))
    if (!inCheck(make(p, m), p.t))
        o.push(m); return o; }
export const uci = m => nm(m.f) + nm(m.t) + (m.pr || '');
export function san(p, m, lg = legal(p)) {
    let s;
    if (m.k === 'K')
        s = 'O-O';
    else if (m.k === 'Q')
        s = 'O-O-O';
    else {
        const u = m.p.toUpperCase();
        if (u === 'P')
            s = (m.c ? FL[m.f & 7] + 'x' : '') + nm(m.t) + (m.pr ? '=' + m.pr.toUpperCase() : '');
        else {
            const oth = lg.filter(x => x.p === m.p && x.t === m.t && x.f !== m.f);
            let d = '';
            if (oth.length) {
                const sf = oth.some(x => (x.f & 7) === (m.f & 7)), sr = oth.some(x => (x.f >> 3) === (m.f >> 3));
                d = !sf ? FL[m.f & 7] : !sr ? String(8 - (m.f >> 3)) : nm(m.f);
            }
            s = u + d + (m.c ? 'x' : '') + nm(m.t);
        }
    }
    const n = make(p, m);
    if (inCheck(n))
        s += legal(n).length ? '+' : '#';
    return s;
}
export function insufficient(p) {
    const o = [];
    for (let s = 0; s < 64; s++) {
        const x = p.b[s];
        if (x && x.toLowerCase() !== 'k')
            o.push([x.toLowerCase(), s]);
    }
    if (!o.length)
        return true;
    if (o.length === 1)
        return o[0][0] === 'n' || o[0][0] === 'b';
    if (o.every(x => x[0] === 'b')) {
        const c = o[0][1] >> 3, k = ((o[0][1] >> 3) + (o[0][1] & 7)) & 1;
        return o.every(x => (((x[1] >> 3) + (x[1] & 7)) & 1) === k);
    }
    return false;
}
/** مفتاح الوضع (للتكرار). الـ en-passant بيتحسب بس لو الأخذ ممكن فعلًا */
export function key(p) {
    let ep = -1;
    if (p.e >= 0 && pseudo(p).some(m => m.k === 'e' && !inCheck(make(p, m), p.t)))
        ep = p.e;
    return p.b.join('') + p.t + p.c + ep;
}
export class Game {
    constructor(f = START) { const p = parse(f); this.init = p; this.pos = [p]; this.mv = []; this.san = []; this.keys = [key(p)]; this.res = null; this.rt = []; this.check(); }
    get cur() { return this.pos[this.pos.length - 1]; }
    legal() { return legal(this.cur); }
    needsPromo(f, t) { return this.legal().some(m => m.f === f && m.t === t && m.pr); }
    play(f, t, pr = '') {
        if (this.res)
            return null;
        const lg = this.legal(), m = lg.find(x => x.f === f && x.t === t && (x.pr || '') === pr);
        if (!m)
            return null;
        this.san.push(san(this.cur, m, lg));
        const n = make(this.cur, m);
        this.mv.push(m);
        this.pos.push(n);
        this.keys.push(key(n));
        this.check();
        return m;
    }
    playUci(s) { return this.play(ix(s.slice(0, 2)), ix(s.slice(2, 4)), s[4] || ''); }
    undo(k = 1) { while (k-- && this.mv.length) {
        this.mv.pop();
        this.pos.pop();
        this.keys.pop();
        this.san.pop();
    } if (this.rt)
        this.rt.length = Math.min(this.rt.length, this.mv.length); this.res = null; this.check(); }
    check() {
        const p = this.cur;
        this.res = null;
        if (!legal(p).length)
            this.res = inCheck(p) ? { result: p.t === 'w' ? '0-1' : '1-0', reason: 'mate' } : { result: '1/2-1/2', reason: 'stalemate' };
        else if (insufficient(p))
            this.res = { result: '1/2-1/2', reason: 'insufficient' };
        else if (p.h >= 100)
            this.res = { result: '1/2-1/2', reason: '50' };
        else {
            const k = this.keys[this.keys.length - 1];
            if (this.keys.filter(x => x === k).length >= 3)
                this.res = { result: '1/2-1/2', reason: 'repetition' };
        }
    }
    setResult(result, reason) { this.res = { result, reason }; }
}
export function pgn(g, { white = 'White', black = 'Black', date = new Date() } = {}) {
    const r = g.res?.result || '*', d = date.toISOString().slice(0, 10).replace(/-/g, '.');
    let s = `[Event "YOMAK Chess"]\n[Site "YOMAK"]\n[Date "${d}"]\n[White "${white}"]\n[Black "${black}"]\n[Result "${r}"]\n\n`, line = '';
    g.san.forEach((m, i) => { line += (i % 2 ? '' : `${i / 2 + 1}. `) + m + ' '; });
    return s + line + r;
}
export function perft(p, d) { if (!d)
    return 1; let n = 0; for (const m of legal(p))
    n += perft(make(p, m), d - 1); return n; }

