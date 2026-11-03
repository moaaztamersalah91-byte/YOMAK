const $ = id => document.getElementById(id);
const faces = ['🦊', '🐼', '🐸', '🦁', '🐙', '🦄', '🐧', '🐯'];
let cards = [], open = [], matched = new Set(), turn = 1, score = [0, 0], busy = false;
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
} return a; };
function init() { cards = shuffle([...faces, ...faces].map((face, id) => ({ face, id }))); open = []; matched = new Set(); turn = 1; score = [0, 0]; busy = false; $('memStatus').textContent = 'دور اللاعب 1 — اختار كارتين'; paint(); }
function paint() { const root = $('memBoard'); root.replaceChildren(); cards.forEach((c, i) => { const b = document.createElement('button'); b.className = 'mem-card' + (open.includes(i) ? ' open' : '') + (matched.has(i) ? ' matched' : ''); b.textContent = open.includes(i) || matched.has(i) ? c.face : '❔'; b.disabled = busy || matched.has(i) || open.includes(i); b.setAttribute('aria-label', `كارت ${i + 1}`); b.onclick = () => flip(i); root.append(b); }); $('m1').textContent = score[0]; $('m2').textContent = score[1]; $('left').textContent = (cards.length - matched.size) / 2; }
function flip(i) { if (busy || matched.has(i) || open.includes(i))
    return; open.push(i); paint(); if (open.length < 2)
    return; busy = true; const [a, b] = open; if (cards[a].face === cards[b].face) {
    matched.add(a);
    matched.add(b);
    score[turn - 1]++;
    setTimeout(() => { open = []; busy = false; if (matched.size === cards.length) {
        const msg = score[0] === score[1] ? 'تعادل!' : `🏆 اللاعب ${score[0] > score[1] ? '1' : '2'} كسب بـ ${Math.max(...score)} أزواج!`;
        $('memStatus').textContent = msg;
    }
    else
        $('memStatus').textContent = `صح! اللاعب ${turn} ياخد نقطة ويلعب تاني`; paint(); }, 450);
}
else {
    setTimeout(() => { open = []; turn = turn === 1 ? 2 : 1; busy = false; $('memStatus').textContent = `دور اللاعب ${turn} — اختار كارتين`; paint(); }, 850);
} }
$('memReset').onclick = init;
init();

