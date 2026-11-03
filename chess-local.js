// صفحة الشطرنج (أوفلاين): ضد الكمبيوتر (5 مستويات) أو لاعبين على نفس الجهاز، مع ساعة + حفظ + تلميح + تراجع
const $ = id => document.getElementById(id);
import { toast } from './ui.js';
import { Game, fen, uci } from './chess-engine.js';
import { createBoard } from './chess-ui.js';
const mk = (t, c, x) => { const e = document.createElement(t); if (c)
    e.className = c; if (x != null)
    e.textContent = x; return e; };
const ls = (k, v) => { try {
    if (v === undefined)
        return JSON.parse(localStorage.getItem(k) || 'null');
    if (v === null)
        localStorage.removeItem(k);
    else
        localStorage.setItem(k, JSON.stringify(v));
}
catch (e) {
    return null;
} };
const LV = [['مبتدئ', 'بيغلط كتير — للتعلّم'], ['سهل', 'بيفكّر حركتين'], ['متوسط', 'لعب منظّم'], ['متقدم', 'تكتيكات قوية'], ['خبير', 'أقوى مستوى — بياخد وقته']];
const TC = [['بدون وقت', '0+0'], ['1 دقيقة', '60+0'], ['3 | 2', '180+2'], ['5 دقايق', '300+0'], ['10 دقايق', '600+0'], ['15 | 10', '900+10'], ['30 دقيقة', '1800+0']];
const REASON = { mate: 'كش مات', stalemate: 'تعادل بالجمود (Stalemate)', insufficient: 'مفيش قطع كفاية للكش مات', '50': 'قاعدة الـ 50 حركة', repetition: 'تكرار الوضع 3 مرات', resign: 'استسلام', timeout: 'انتهى الوقت', draw: 'اتفاق على التعادل' };
let cfg = { mode: 'ai', level: 3, color: 'w', tc: '0+0', autoFlip: true, ...(ls('yomak_chess_cfg') || {}) };
let game, ui, human = 'w', clocks, inc = 0, timed = false, lastTick = 0, timer = 0, thinking = false, token = 0, statsDone = false, hints = 0, worker = null, wreq = 0;
const pend = new Map();
/* ---- الذكاء: Worker + احتياطي لو المتصفح مش بيدعم module workers ---- */
function getWorker() {
    if (worker !== null)
        return worker;
    try {
        worker = new Worker('chess-worker.js', { type: 'module' });
        worker.onmessage = e => { const r = pend.get(e.data.id); if (r) {
            pend.delete(e.data.id);
            r(e.data.m);
        } };
        worker.onerror = () => { worker = false; for (const [, r] of pend)
            fallback(r); pend.clear(); };
    }
    catch (e) {
        worker = false;
    }
    return worker;
}
let fb = null;
async function fallback(args) { fb = fb || await import('./chess-ai.js'); const { parse } = await import('./chess-engine.js'); setTimeout(() => { const m = fb.search(parse(args.fen), Math.min(args.level, 2), args.hist); args.res(m && { f: m.f, t: m.t, pr: m.pr || '', v: m.v }); }, 30); }
function askAI(fenS, level, hist) {
    return new Promise(res => {
        const w = getWorker(), id = ++wreq;
        if (w) {
            pend.set(id, res);
            w.postMessage({ id, fen: fenS, level, hist });
        }
        else
            fallback({ fen: fenS, level, hist, res });
    });
}
/* ---- الإحصائيات والحفظ ---- */
const stats = () => ls('yomak_chess_stats') || { w: 0, l: 0, d: 0 };
function record(r) { const s = stats(); s[r]++; ls('yomak_chess_stats', s); }
function historyList(key) { return ls(key) || []; }
function saveHistory() { if (!game || !game.mv.length)
    return; const key = cfg.mode === 'ai' ? 'yomak_chess_vs_computer' : 'yomak_chess_local_friends'; const list = historyList(key); const id = `${game.mv.length}-${game.san.join(' ')}`; if (list[0]?.id === id)
    return; list.unshift({ id, date: new Date().toISOString(), mode: cfg.mode, opponent: cfg.mode === 'ai' ? 'YOMAK AI' : 'صديق على نفس الجهاز', result: game.res?.result || '', reason: game.res?.reason || '', moves: game.san.slice(-80) }); ls(key, list.slice(0, 100)); }
function showHistory() { const p = $('chSetup'); p.replaceChildren(); p.append(mk('h2', '', 'سجل اللعب')); for (const [title, key] of [['ضد الكمبيوتر', 'yomak_chess_vs_computer'], ['ضد الأصدقاء', 'yomak_chess_friend_history'], ['لاعبان على نفس الجهاز', 'yomak_chess_local_friends']]) {
    p.append(mk('h3', 'chs-lbl', title));
    const list = historyList(key);
    if (!list.length) {
        p.append(mk('p', 'muted', 'مفيش مباريات محفوظة هنا لسه.'));
        continue;
    }
    for (const item of list.slice(0, 20)) {
        const card = mk('div', 'chs-opt');
        const date = new Date(item.date);
        const result = item.result === '1-0' ? 'فاز الأبيض' : item.result === '0-1' ? 'فاز الأسود' : item.result === '1/2-1/2' ? 'تعادل' : 'غير مكتملة';
        card.append(mk('b', '', `${item.opponent || 'خصم'} · ${result}`), mk('small', '', `${Number.isNaN(date.getTime()) ? '' : date.toLocaleString('ar-EG')} · ${item.moves?.length || 0} نقلة`));
        p.append(card);
    }
} const back = mk('button', 'secondary', 'رجوع'); back.onclick = setup; p.append(back); }
const save = () => { if (!game || game.res)
    return ls('yomak_chess_save', null); ls('yomak_chess_save', { cfg, human, moves: game.mv.map(uci), clocks, inc, timed }); };
/* ---- شاشة الإعداد ---- */
function opt(txt, sub, on, fn) { const b = mk('button', 'chs-opt'); b.type = 'button'; b.setAttribute('aria-pressed', on); b.append(mk('b', '', txt)); if (sub)
    b.append(mk('small', '', sub)); b.onclick = fn; return b; }
function setup() {
    clearInterval(timer);
    token++;
    $('chGame').hidden = true;
    $('chSetup').hidden = false;
    $('chBack').hidden = false;
    const p = $('chSetup');
    p.replaceChildren();
    const rh = mk('div', 'rw-head');
    rh.append(mk('h2', '', 'لعبة جديدة'));
    p.append(rh);
    const hist = mk('button', 'secondary', '📚 سجل اللعب');
    hist.type = 'button';
    hist.onclick = showHistory;
    p.append(hist);
    const sv = ls('yomak_chess_save');
    if (sv) {
        const r = mk('div', 'gm-add');
        r.style.marginBottom = '14px';
        const b = mk('button', '', '▶ كمّل اللعبة المحفوظة (' + Math.ceil(sv.moves.length / 2) + ' حركة)');
        b.type = 'button';
        b.onclick = () => start(sv);
        const d = mk('button', 'secondary', 'مسح');
        d.type = 'button';
        d.onclick = () => { ls('yomak_chess_save', null); setup(); };
        r.append(b, d);
        p.append(r);
    }
    const row = (label, items) => { p.append(mk('div', 'chs-lbl', label)); const g = mk('div', 'chs-grid'); items.forEach(i => g.append(i)); p.append(g); };
    const again = () => { ls('yomak_chess_cfg', cfg); setup(); };
    row('نوع اللعب', [opt('🤖 ضد الكمبيوتر', '5 مستويات', cfg.mode === 'ai', () => { cfg.mode = 'ai'; again(); }), opt('👥 لاعبين على نفس الجهاز', 'بالدور على نفس الشاشة', cfg.mode === 'pvp', () => { cfg.mode = 'pvp'; again(); })]);
    if (cfg.mode === 'ai') {
        row('المستوى', LV.map((l, i) => opt(`${i + 1} · ${l[0]}`, l[1], cfg.level === i + 1, () => { cfg.level = i + 1; again(); })));
        row('لونك', [['w', '⚪ أبيض'], ['r', '🎲 عشوائي'], ['b', '⚫ أسود']].map(([k, t]) => opt(t, '', cfg.color === k, () => { cfg.color = k; again(); })));
    }
    if (cfg.mode === 'pvp')
        row('قلب الطاولة', [opt('🔄 تلقائي', 'تتقلب بعد كل حركة', cfg.autoFlip !== false, () => { cfg.autoFlip = true; again(); }), opt('⏸️ ثابتة', 'من غير قلب', cfg.autoFlip === false, () => { cfg.autoFlip = false; again(); })]);
    row('الوقت', TC.map(([t, v]) => opt(t, '', cfg.tc === v, () => { cfg.tc = v; again(); })));
    const a = mk('div', 'chs-start'), go = mk('button', '', 'ابدأ اللعب ♟️');
    go.type = 'button';
    go.onclick = () => { ls('yomak_chess_cfg', cfg); start(); };
    const on = mk('a', 'btn secondary', '🌐 العب أونلاين مع صاحبك');
    on.href = 'games.html#gmRooms';
    on.style.textDecoration = 'none';
    a.append(go, on);
    p.append(a);
    if (cfg.mode === 'ai') {
        const st = stats(), sd = mk('div', 'chs-stats');
        sd.style.marginTop = '18px';
        [['فوز', st.w], ['خسارة', st.l], ['تعادل', st.d]].forEach(([t, n]) => { const x = mk('span', '', t + ' '); x.append(mk('b', '', n)); sd.append(x); });
        p.append(sd);
    }
}
/* ---- اللعبة ---- */
function start(resume) {
    if (resume) {
        cfg = { ...cfg, ...resume.cfg };
        human = resume.human;
    }
    else {
        human = cfg.mode === 'pvp' ? 'wb' : cfg.color === 'r' ? (Math.random() < .5 ? 'w' : 'b') : cfg.color;
        ls('yomak_chess_save', null);
    }
    game = new Game();
    const [base, ic] = cfg.tc.split('+').map(Number);
    inc = resume ? resume.inc : ic;
    timed = resume ? resume.timed : base > 0;
    clocks = resume ? resume.clocks : { w: base * 1000, b: base * 1000 };
    if (resume)
        for (const m of resume.moves)
            game.playUci(m);
    statsDone = false;
    hints = 0;
    thinking = false;
    token++;
    $('chSetup').hidden = true;
    $('chGame').hidden = false;
    $('chBack').hidden = true;
    const mode = cfg.mode;
    const me = mode === 'ai' ? human : null;
    ui = createBoard($('chGame'), {
        game, flip: mode === 'ai' ? human === 'b' : (mode === 'pvp' && cfg.autoFlip !== false && game.cur.t === 'b'),
        side: () => (!game.res && !thinking && (mode === 'pvp' || game.cur.t === human)) ? game.cur.t : '',
        players: () => mode === 'ai' ? { [human]: { name: 'إنت', icon: '🙂' }, [human === 'w' ? 'b' : 'w']: { name: `الكمبيوتر · ${LV[cfg.level - 1][0]}`, icon: '🤖' } } : { w: { name: 'الأبيض', icon: '♔' }, b: { name: 'الأسود', icon: '♚' } },
        onMove: (f, t, pr) => { const m = game.play(f, t, pr); if (m)
            afterMove(m); }
    });
    buildActions();
    updateClocks();
    status();
    lastTick = Date.now();
    clearInterval(timer);
    timer = setInterval(tick, 200);
    if (mode === 'ai' && !game.res && game.cur.t !== human)
        aiMove();
}
let flipTimer = 0;
function syncFlip(delay = 0) {
    clearTimeout(flipTimer);
    if (cfg.mode !== 'pvp' || cfg.autoFlip === false || !ui || !game)
        return;
    const apply = () => {
        if (!ui || !game || cfg.mode !== 'pvp' || cfg.autoFlip === false)
            return;
        const want = game.cur.t === 'b';
        if (ui.isFlipped() === want)
            return;
        const bd = document.querySelector('#chGame .ch-board');
        bd?.classList.remove('flipping');
        ui.setFlip(want);
        if (bd) {
            void bd.offsetWidth;
            bd.classList.add('flipping');
            setTimeout(() => bd.classList.remove('flipping'), 500);
        }
    };
    delay ? (flipTimer = setTimeout(apply, delay)) : apply();
}
function buildActions() {
    ui.clearActions();
    ui.addAction('↩ تراجع', undo);
    if (cfg.mode === 'ai')
        ui.addAction('💡 تلميح', hint);
    ui.addAction('♻️ لعبة جديدة', () => { if (!game.res && game.mv.length > 1 && !confirm('تسيب اللعبة الحالية؟ (هتفضل محفوظة)'))
        return; setup(); });
}
function status() {
    if (game.res) {
        const r = game.res;
        ui.setStatus(`${r.result === '1/2-1/2' ? 'تعادل' : r.result === '1-0' ? 'فاز الأبيض' : 'فاز الأسود'} — ${REASON[r.reason]}`, 'warn');
        return;
    }
    const t = game.cur.t, chk = /[+#]$/.test(game.san[game.san.length - 1] || '');
    ui.setStatus((cfg.mode === 'ai' ? 'دورك' : t === 'w' ? 'دور الأبيض' : 'دور الأسود') + (chk ? ' — كش!' : ''), chk ? 'warn' : '');
}
function afterMove(m) {
    const mover = m.p < 'a' ? 'w' : 'b';
    if (timed && !game.res)
        clocks[mover] += inc * 1000;
    lastTick = Date.now();
    ui.refresh();
    updateClocks();
    save();
    if (game.res)
        return finish();
    status();
    syncFlip(450);
    if (cfg.mode === 'ai' && game.cur.t !== human)
        aiMove();
}
async function aiMove() {
    const my = ++token;
    thinking = true;
    status();
    const m = await askAI(fen(game.cur), cfg.level, game.keys);
    if (my !== token || game.res)
        return;
    thinking = false;
    if (!m) {
        return;
    }
    const mv = game.play(m.f, m.t, m.pr);
    if (mv)
        afterMove(mv);
}
function tick() {
    const now = Date.now(), dt = now - lastTick;
    lastTick = now;
    if (!game || game.res || !timed)
        return;
    const t = game.cur.t;
    clocks[t] -= dt;
    if (clocks[t] <= 0) {
        clocks[t] = 0;
        updateClocks();
        const loser = t, other = t === 'w' ? 'b' : 'w';
        const lone = game.cur.b.filter(x => x && (x < 'a' ? 'w' : 'b') === other && x.toLowerCase() !== 'k').length === 0;
        game.setResult(lone ? '1/2-1/2' : other === 'w' ? '1-0' : '0-1', 'timeout');
        ui.render();
        return finish();
    }
    updateClocks();
}
function updateClocks() {
    for (const c of ['w', 'b'])
        ui.setClock(c, timed ? clocks[c] : null, timed && !game.res && game.cur.t === c, !timed);
}
function finish() {
    saveHistory();
    save();
    ui.sound('end');
    status();
    updateClocks();
    const r = game.res, hw = r.result === '1-0' ? 'w' : r.result === '0-1' ? 'b' : '';
    let title, key;
    if (cfg.mode === 'ai') {
        title = !hw ? 'تعادل 🤝' : hw === human ? 'كسبت! 🎉' : 'خسرت المرة دي';
        key = !hw ? 'd' : hw === human ? 'w' : 'l';
        if (!statsDone) {
            statsDone = true;
            record(key);
        }
    }
    else
        title = !hw ? 'تعادل 🤝' : hw === 'w' ? 'فاز الأبيض 🏆' : 'فاز الأسود 🏆';
    ui.showResult({ title, sub: REASON[r.reason], actions: [
            { t: 'العب تاني', primary: true, fn: () => { if (cfg.mode === 'ai' && cfg.color !== 'r')
                    cfg.color = human === 'w' ? 'b' : 'w'; start(); } },
            { t: 'لعبة جديدة', fn: setup }
        ] });
}
function undo() {
    if (!game.mv.length)
        return toast('مفيش حركات للتراجع', 'info');
    token++;
    const ai = cfg.mode === 'ai';
    const wasOver = !!game.res;
    thinking = false;
    game.undo(ai && (game.cur.t === human || wasOver) && game.mv.length >= 2 ? 2 : 1);
    ui.hideResult();
    buildActions();
    ui.refresh();
    lastTick = Date.now();
    updateClocks();
    status();
    save();
    syncFlip();
    if (ai && !game.res && game.cur.t !== human)
        aiMove();
}
async function hint() {
    if (game.res || thinking || game.cur.t !== human)
        return;
    thinking = true;
    status();
    const m = await askAI(fen(game.cur), 4, []);
    thinking = false;
    status();
    if (m && !game.res) {
        hints++;
        ui.setHint(m.f, m.t);
    }
}
document.addEventListener('visibilitychange', () => { lastTick = Date.now(); });
addEventListener('beforeunload', () => { if (game && !game.res && game.mv.length)
    save(); });
if ($('dateLabel'))
    $('dateLabel').textContent = new Intl.DateTimeFormat('ar-EG-u-nu-latn', { dateStyle: 'full' }).format(new Date());
setup();
window.YomakLoader?.hide();

