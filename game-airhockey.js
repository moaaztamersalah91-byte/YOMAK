import { db } from './firebase.js';
import { doc, onSnapshot, runTransaction, serverTimestamp } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js';
import { toast } from './ui.js';
const el = (t, c = '', v = '') => { const n = document.createElement(t); if (c)
    n.className = c; if (v !== undefined)
    n.textContent = v; return n; };
export async function mount(stage, { code, uid, room }) {
    const ref = doc(db, 'rooms', code, 'game', 'state');
    let rm = room(), st = null, off, roomOff, keys = {}, timer = null, lastPush = 0;
    const root = el('div', 'on-game'), status = el('div', 'on-status', 'بنجهز الهوكي…'), score = el('div', 'on-scores'), canvas = el('canvas');
    canvas.width = 900;
    canvas.height = 500;
    canvas.style.cssText = 'width:100%;height:auto;touch-action:none;border-radius:14px';
    const again = el('button', 'on-btn', '🔁 إعادة المباراة');
    again.hidden = true;
    again.onclick = () => runTransaction(db, async (tx) => { const s = await tx.get(ref); if (!s.exists() || s.data().status !== 'over' || uid !== rm?.host)
        return; const d = s.data(), nr = (d.round || 1) + 1, f = { left: false, right: false, up: false, down: false }; tx.update(ref, { p1: { x: 150, y: 250 }, p2: { x: 750, y: 250 }, ball: { x: 450, y: 250, vx: nr % 2 ? 4 : -4, vy: 2 }, score1: 0, score2: 0, input1: { ...f }, input2: { ...f }, status: 'active', round: nr, at: serverTimestamp() }); }).catch(e => toast(e.message || 'تعذر إعادة المباراة', 'error'));
    root.append(status, score, canvas, again);
    stage.replaceChildren(root);
    const ctx = canvas.getContext('2d');
    const host = () => uid === rm?.host;
    function render() { if (!st) {
        status.textContent = rm?.players?.length === 2 ? 'المضيف بيجهز الملعب…' : 'مستنيين اللاعب التاني يدخل الغرفة…';
        return;
    } score.textContent = `🔴 ${st.score1} — ${st.score2} 🔵`; status.textContent = st.status === 'over' ? `🏆 ${st.score1 > st.score2 ? 'اللاعب 1' : 'اللاعب 2'} كسب!` : (host() ? 'أنت الأحمر: WASD — المنافس الأزرق: الأسهم' : 'أنت الأزرق: الأسهم — المضيف الأحمر: WASD'); draw(st); }
    function draw(s) { const c = ctx; c.clearRect(0, 0, 900, 500); c.fillStyle = '#073d47'; c.fillRect(0, 0, 900, 500); c.strokeStyle = '#d8ffff'; c.lineWidth = 4; c.strokeRect(10, 10, 880, 480); c.beginPath(); c.moveTo(450, 10); c.lineTo(450, 490); c.arc(450, 250, 65, Math.PI / 2, -Math.PI / 2, true); c.stroke(); for (const [p, color] of [[s.p1, '#ff646e'], [s.p2, '#56b6ff']]) {
        c.fillStyle = color;
        c.beginPath();
        c.arc(p.x, p.y, 25, 0, Math.PI * 2);
        c.fill();
    } c.fillStyle = 'white'; c.beginPath(); c.arc(s.ball.x, s.ball.y, 14, 0, Math.PI * 2); c.fill(); }
    async function init() { if (!host() || rm?.players?.length !== 2)
        return; try {
        await runTransaction(db, async (tx) => { const s = await tx.get(ref); if (s.exists())
            return; tx.set(ref, { p1: { x: 150, y: 250 }, p2: { x: 750, y: 250 }, ball: { x: 450, y: 250, vx: 4, vy: 2 }, score1: 0, score2: 0, input1: { left: false, right: false, up: false, down: false }, input2: { left: false, right: false, up: false, down: false }, status: 'active', round: 1, at: serverTimestamp() }); });
    }
    catch (e) {
        toast(e.message || 'تعذر بدء الهوكي', 'error');
    } }
    function step() { if (!st || st.status !== 'active' || !host())
        return; let d = structuredClone(st), speed = 5; for (const [p, inp] of [[d.p1, d.input1], [d.p2, d.input2]]) {
        p.x += ((inp.right ? 1 : 0) - (inp.left ? 1 : 0)) * speed;
        p.y += ((inp.down ? 1 : 0) - (inp.up ? 1 : 0)) * speed;
        p.x = Math.max(25, Math.min(875, p.x));
        p.y = Math.max(25, Math.min(475, p.y));
    } d.ball.x += d.ball.vx; d.ball.y += d.ball.vy; if (d.ball.y < 24 || d.ball.y > 476)
        d.ball.vy *= -1, window.SFX && SFX.play('bounce'); for (const p of [d.p1, d.p2]) {
        let dx = d.ball.x - p.x, dy = d.ball.y - p.y, dist = Math.hypot(dx, dy);
        if (dist < 39) {
            window.SFX && SFX.play('hit');
            let a = Math.atan2(dy, dx);
            d.ball.vx = Math.cos(a) * 7;
            d.ball.vy = Math.sin(a) * 7;
            d.ball.x = p.x + Math.cos(a) * 40;
            d.ball.y = p.y + Math.sin(a) * 40;
        }
    } if (d.ball.x < 0) {
        d.score2++;
        d.ball = { x: 450, y: 250, vx: -4, vy: 2 };
    } if (d.ball.x > 900) {
        d.score1++;
        d.ball = { x: 450, y: 250, vx: 4, vy: -2 };
    } if (d.score1 >= 5 || d.score2 >= 5)
        d.status = 'over'; const now = Date.now(); if (now - lastPush > 80) {
        lastPush = now;
        runTransaction(db, async (tx) => { const s = await tx.get(ref); if (!s.exists() || s.data().status !== 'active')
            return; tx.update(ref, { p1: d.p1, p2: d.p2, ball: d.ball, score1: d.score1, score2: d.score2, status: d.status, at: serverTimestamp() }); }).catch(e => toast(e.message || 'فقدنا الاتصال باللعبة', 'error'));
    } }
    function key(e, down) { const k = e.key.toLowerCase(); let prop = null, player = null; if (['a', 'd', 'w', 's'].includes(k)) {
        player = host() ? 'input1' : 'input1';
        prop = ({ a: 'left', d: 'right', w: 'up', s: 'down' })[k];
    }
    else if (['arrowleft', 'arrowright', 'arrowup', 'arrowdown'].includes(k)) {
        player = host() ? 'input2' : 'input2';
        prop = ({ 'arrowleft': 'left', 'arrowright': 'right', 'arrowup': 'up', 'arrowdown': 'down' })[k];
    }
    else
        return; e.preventDefault(); if (!rm?.players?.includes(uid))
        return; const myInput = host() ? (player === 'input1' ? 'input1' : 'input2') : (player === 'input1' ? 'input1' : 'input2'); if (!host() && myInput === 'input1')
        return; runTransaction(db, async (tx) => { const s = await tx.get(ref); if (!s.exists() || s.data().status !== 'active')
        return; const d = s.data(), inp = { ...(d[myInput] || {}) }; inp[prop] = down; tx.update(ref, { [myInput]: inp, at: serverTimestamp() }); }).catch(() => { }); }
    const kd = e => key(e, true), ku = e => key(e, false);
    window.addEventListener('keydown', kd);
    window.addEventListener('keyup', ku);
    off = onSnapshot(ref, s => { st = s.exists() ? s.data() : null; render(); again.hidden = !(st?.status === 'over' && uid === rm?.host); if (!st)
        init(); }, e => toast('تعذر الاتصال: ' + e.message, 'error'));
    roomOff = onSnapshot(doc(db, 'rooms', code), s => { rm = s.exists() ? s.data() : null; render(); if (!st)
        init(); });
    timer = setInterval(step, 40);
    stage._onlineCleanup = () => { clearInterval(timer); window.removeEventListener('keydown', kd); window.removeEventListener('keyup', ku); off?.(); roomOff?.(); };
}

