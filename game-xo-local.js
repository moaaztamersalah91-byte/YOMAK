const $ = id => document.getElementById(id);
const board = Array(9).fill('');
let turn = 'X', done = false, scores = { X: 0, O: 0, D: 0 };
const wins = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
function paint() { const root = $('xoBoard'); root.replaceChildren(); board.forEach((v, i) => { const b = document.createElement('button'); b.className = 'xo-cell ' + (v === 'X' ? 'x' : v === 'O' ? 'o' : ''); b.textContent = v; b.setAttribute('aria-label', `مربع ${i + 1} ${v || 'فارغ'}`); b.disabled = !!v || done; b.onclick = () => move(i); root.append(b); }); $('xoStatus').textContent = done ? $('xoStatus').textContent : `دور اللاعب ${turn}`; $('xScore').textContent = scores.X; $('oScore').textContent = scores.O; $('dScore').textContent = scores.D; }
function move(i) { if (done || board[i])
    return; board[i] = turn; const win = wins.find(line => line.every(j => board[j] === turn)); if (win) {
    done = true;
    scores[turn]++;
    $('xoStatus').textContent = `🏆 اللاعب ${turn} كسب الجولة!`;
}
else if (board.every(Boolean)) {
    done = true;
    scores.D++;
    $('xoStatus').textContent = 'تعادل! مفيش مربعات فاضية.';
}
else
    turn = turn === 'X' ? 'O' : 'X'; paint(); }
function reset(clear = false) { board.fill(''); turn = 'X'; done = false; if (clear)
    scores = { X: 0, O: 0, D: 0 }; $('xoStatus').textContent = 'دور اللاعب X'; paint(); }
$('xoReset').onclick = () => reset();
$('xoClear').onclick = () => reset(true);
paint();

