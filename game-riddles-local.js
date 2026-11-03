const root = document.querySelector('#riddles');
const bank = [['شيء له أسنان ولا يعض؟', 'المشط', 'أداة نستخدمها لترتيب الشعر وفك تشابكه.'], ['كلما أخذت منه كبر، ما هو؟', 'الحفرة', 'مكان في الأرض يزداد اتساعًا كلما أزلت منه التراب.'], ['له عين ولا يرى؟', 'الإبرة', 'أداة صغيرة للخياطة يمر الخيط من فتحتها.'], ['يمشي بلا قدمين ويبكي بلا عينين؟', 'السحاب', 'تراه في السماء وقد ينزل منه المطر.'], ['ما الشيء الذي يكتب ولا يقرأ؟', 'القلم', 'نمسكه بأيدينا لنكتب به على الورق.'], ['بيت بلا أبواب ولا نوافذ؟', 'البيضة', 'قشرتها تحيط بما بداخلها، ونأكلها في الإفطار.'], ['شيء كلما زاد نقص؟', 'العمر', 'يمر مع الوقت ويقل ما تبقى منه.'], ['ما الذي يسمع بلا أذن ويتكلم بلا لسان؟', 'الصدى', 'هو تكرار للصوت عندما يرتد عن سطح بعيد.'], ['ما الشيء الذي له أوراق وليس نباتًا؟', 'الكتاب', 'نقرأ ما بداخله وتكون صفحاته كثيرة.'], ['شيء إذا كسرته لا يصدر صوتًا؟', 'الصمت', 'ينتهي عندما يبدأ شخص في الكلام.']];
let score = 0, round = 0, used = [];
const e = (t, c = '', txt = '') => { const n = document.createElement(t); if (c)
    n.className = c; if (txt !== undefined)
    n.textContent = txt; return n; };
function next() { if (used.length === bank.length)
    used = []; let i; do {
    i = Math.floor(Math.random() * bank.length);
} while (used.includes(i)); used.push(i); round++; render(i); }
function render(i) { root.replaceChildren(); root.append(e('div', 'on-status', `جولة ${round} — نقاطك: ${score}`), e('h2', '', bank[i][0])); const inp = e('input'); inp.placeholder = 'اكتب إجابتك'; inp.autocomplete = 'off'; const b = e('button', 'on-btn', 'تحقق'); const hintBtn = e('button', 'on-btn', '💡 تلميح'); hintBtn.type = 'button'; const answerBtn = e('button', 'on-btn', '👁️ معرفة الإجابة'); answerBtn.type = 'button'; const hint = e('p', 'riddle-feedback'); hint.hidden = true; hintBtn.onclick = () => { hint.textContent = 'تلميح: ' + bank[i][2]; hint.hidden = false; hintBtn.disabled = true; }; answerBtn.onclick = () => { hint.textContent = 'الإجابة: ' + bank[i][1]; hint.hidden = false; answerBtn.disabled = true; }; const msg = e('p', 'riddle-feedback'); const check = () => { if (norm(inp.value) === norm(bank[i][1])) {
    score++;
    msg.textContent = 'إجابة صحيحة! 🎉';
    b.textContent = 'الفزورة التالية';
    b.onclick = next;
}
else {
    msg.textContent = 'مش دي الإجابة، جرّب تاني';
    inp.focus();
} }; b.onclick = check; inp.onkeydown = x => { if (x.key === 'Enter')
    check(); }; root.append(inp, b, hintBtn, answerBtn, hint, msg, e('p', 'on-muted', 'لو مش عارف الإجابة، اضغط على «تلميح» للحصول على وصف يساعدك.')); }
function norm(s) { return s.trim().replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').replace(/[ًٌٍَُِّْ]/g, '').replace(/\s+/g, ''); }
next();

