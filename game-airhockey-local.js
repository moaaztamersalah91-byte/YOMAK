const root = document.querySelector('#airhockey'), W = 900, H = 500;
const e = (t, c = '', txt = '') => { const n = document.createElement(t); if (c)
    n.className = c; if (txt !== undefined)
    n.textContent = txt; return n; };
const status = e('div', 'on-status', 'اللاعب 1: WASD — اللاعب 2: الأسهم');
const score = e('div', 'on-scores', '🔴 0 — 0 🔵');
const canvas = e('canvas');
canvas.width = W;
canvas.height = H;
canvas.style.cssText = 'width:100%;height:auto;border-radius:16px;touch-action:none';
const reset = e('button', 'on-btn', 'إعادة المباراة');
root.append(status, score, canvas, reset);
const c = canvas.getContext('2d');
let keys = {}, s1 = 0, s2 = 0, p1 = { x: 150, y: 250 }, p2 = { x: 750, y: 250 }, ball = { x: 450, y: 250, vx: 4, vy: 2 }, over = false;
window.addEventListener('keydown', d => { keys[d.key.toLowerCase()] = true; if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(d.key.toLowerCase()))
    d.preventDefault(); });
window.addEventListener('keyup', d => keys[d.key.toLowerCase()] = false);
reset.onclick = () => { s1 = s2 = 0; over = false; serve(); draw(); };
function serve() { p1 = { x: 150, y: 250 }; p2 = { x: 750, y: 250 }; ball = { x: 450, y: 250, vx: Math.random() < .5 ? -4 : 4, vy: Math.random() * 4 - 2 }; status.textContent = over ? 'انتهت المباراة! اضغط إعادة المباراة' : 'WASD للاعب 1 — الأسهم للاعب 2'; }
function move(p, ks) { p.x += ((keys[ks[1]] ? 1 : 0) - (keys[ks[0]] ? 1 : 0)) * 5; p.y += ((keys[ks[3]] ? 1 : 0) - (keys[ks[2]] ? 1 : 0)) * 5; p.x = Math.max(25, Math.min(W - 25, p.x)); p.y = Math.max(25, Math.min(H - 25, p.y)); }
function draw() { c.clearRect(0, 0, W, H); c.fillStyle = '#073d47'; c.fillRect(0, 0, W, H); c.strokeStyle = '#d8ffff'; c.lineWidth = 4; c.strokeRect(10, 10, W - 20, H - 20); c.beginPath(); c.moveTo(W / 2, 10); c.lineTo(W / 2, H - 10); c.stroke(); c.beginPath(); c.arc(W / 2, H / 2, 70, 0, Math.PI * 2); c.stroke(); c.fillStyle = '#ff646e'; c.beginPath(); c.arc(p1.x, p1.y, 25, 0, Math.PI * 2); c.fill(); c.fillStyle = '#56b6ff'; c.beginPath(); c.arc(p2.x, p2.y, 25, 0, Math.PI * 2); c.fill(); c.fillStyle = '#fff'; c.beginPath(); c.arc(ball.x, ball.y, 14, 0, Math.PI * 2); c.fill(); }
function tick() { if (!over) {
    move(p1, ['a', 'd', 'w', 's']);
    move(p2, ['arrowleft', 'arrowright', 'arrowup', 'arrowdown']);
    ball.x += ball.vx;
    ball.y += ball.vy;
    if (ball.y < 24 || ball.y > H - 24) {
        ball.vy *= -1;
        window.SFX && SFX.play('bounce');
    }
    for (const p of [p1, p2]) {
        let dx = ball.x - p.x, dy = ball.y - p.y, dist = Math.hypot(dx, dy);
        if (dist < 39) {
            let a = Math.atan2(dy, dx);
            window.SFX && SFX.play('hit');
            ball.vx = Math.cos(a) * 7;
            ball.vy = Math.sin(a) * 7;
            ball.x = p.x + Math.cos(a) * 40;
            ball.y = p.y + Math.sin(a) * 40;
        }
    }
    if (ball.x < 0) {
        s2++;
        serve();
    }
    if (ball.x > W) {
        s1++;
        serve();
    }
    if (s1 >= 5 || s2 >= 5) {
        over = true;
        status.textContent = `🏆 اللاعب ${s1 > s2 ? 1 : 2} كسب!`;
    }
    score.textContent = `🔴 ${s1} — ${s2} 🔵`;
} draw(); requestAnimationFrame(tick); }
serve();
tick();

