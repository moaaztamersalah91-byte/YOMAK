const root = document.querySelector('#hangman');
const words = ['مدرسة', 'كمبيوتر', 'برمجة', 'كرة', 'مكتبة', 'مغامرة', 'طائرة', 'مستشفى', 'شمس', 'بطريق', 'روبوت', 'حديقة', 'مفتاح', 'سيارة', 'تليفون', 'موزة', 'نجمة', 'قمر', 'بحر', 'فراشة'];
let word = '', guessed = [], wrong = 0, score = [0, 0], turn = 0, over = false;
const e = (t, c = '', txt = '') => { const n = document.createElement(t); if (c)
    n.className = c; if (txt !== undefined)
    n.textContent = txt; return n; };
function newRound() { word = words[Math.floor(Math.random() * words.length)]; guessed = []; wrong = 0; over = false; turn = 0; render(); }
function render() { root.replaceChildren(); const bar = e('div', 'on-status', `دور اللاعب ${turn + 1} — النقاط: 🔴 ${score[0]} | 🔵 ${score[1]}`); root.append(bar); const draw = e('div', 'on-scores', `الرسم: ${['', 'رأس', 'رأس + جسم', '+ ذراع', '+ ذراعين', '+ رجل', 'اكتمل!'][wrong]}`); root.append(draw); const masked = [...word].map(c => guessed.includes(c) ? c : '＿').join(' '); root.append(e('h2', '', masked)); root.append(e('p', 'on-muted', `الحروف الخاطئة: ${guessed.filter(c => !word.includes(c)).join(' ، ') || 'لا يوجد'}`)); const hint = e('p', 'word-hint', 'اختار حروف من المجموعة دي علشان تكشف الكلمة:'); root.append(hint); const keys = e('div', 'on-controls word-letters'); letterChoices(word).forEach(ch => { const b = e('button', 'on-btn word-letter', ch); b.disabled = over || guessed.includes(ch); b.onclick = () => guess(ch); keys.append(b); }); root.append(keys); if (over) {
    root.append(e('h3', '', wrong >= 6 ? `الكلمة كانت: ${word} — الجولة للاعب ${turn === 0 ? 2 : 1}` : `صح! اللاعب ${turn + 1} كسب الجولة`));
    const b = e('button', 'on-btn', 'جولة جديدة');
    b.onclick = newRound;
    root.append(b);
} root.append(e('p', 'on-muted', 'كل تخمين غلط يبدّل الدور؛ الفوز بتخمين الكلمة كاملة أو كشف كل حروفها.')); }
function guess(ch) { if (over || guessed.includes(ch))
    return; guessed.push(ch); if (!word.includes(ch))
    wrong++; if ([...word].every(c => guessed.includes(c))) {
    score[turn]++;
    over = true;
}
else if (wrong >= 6) {
    score[1 - turn]++;
    over = true;
}
else
    turn = 1 - turn; render(); }
newRound();
function letterChoices(w) { const base = [...new Set([...w])]; const alphabet = [...'ابتثجحخدذرزسشصضطظعغفقكلمنهويءأإؤئ']; const seed = [...w].reduce((n, c) => n + c.charCodeAt(0), 0); let extras = []; for (let i = 0; i < alphabet.length && extras.length < 3; i++) {
    const ch = alphabet[(seed + i * 7) % alphabet.length];
    if (!base.includes(ch) && !extras.includes(ch))
        extras.push(ch);
} return [...base, ...extras].sort((a, b) => ((a.charCodeAt(0) * 31 + seed) % 97) - ((b.charCodeAt(0) * 31 + seed) % 97)); }

