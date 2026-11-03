import { db } from './firebase.js';
import { doc, onSnapshot, runTransaction, serverTimestamp } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js';
import { toast } from './ui.js';
const bank = [['شيء له أسنان ولا يعض؟', 'المشط', 'أداة نستخدمها لترتيب الشعر وفك تشابكه.'], ['كلما أخذت منه كبر، ما هو؟', 'الحفرة', 'مكان في الأرض يزداد اتساعًا كلما أزلت منه التراب.'], ['له عين ولا يرى؟', 'الإبرة', 'أداة صغيرة للخياطة يمر الخيط من فتحتها.'], ['يمشي بلا قدمين ويبكي بلا عينين؟', 'السحاب', 'تراه في السماء وقد ينزل منه المطر.'], ['ما الشيء الذي يكتب ولا يقرأ؟', 'القلم', 'نمسكه بأيدينا لنكتب به على الورق.'], ['بيت بلا أبواب ولا نوافذ؟', 'البيضة', 'قشرتها تحيط بما بداخلها، ونأكلها في الإفطار.'], ['شيء كلما زاد نقص؟', 'العمر', 'يمر مع الوقت ويقل ما تبقى منه.'], ['ما الذي يسمع بلا أذن ويتكلم بلا لسان؟', 'الصدى', 'هو تكرار للصوت عندما يرتد عن سطح بعيد.'], ['ما الشيء الذي له أوراق وليس نباتًا؟', 'الكتاب', 'نقرأ ما بداخله وتكون صفحاته كثيرة.'], ['شيء إذا كسرته لا يصدر صوتًا؟', 'الصمت', 'ينتهي عندما يبدأ شخص في الكلام.'], ['ما الشيء الذي كلما مشى فقد جزءًا من ذيله؟', 'الإبرة', 'أداة خياطة يمر الخيط في عينها وتترك الخيط خلفها.'], ['له رقبة وليس له رأس؟', 'الزجاجة', 'وعاء نضع فيه الماء أو العصير.'], ['شيء تملكه ويستخدمه غيرك أكثر منك؟', 'اسمك', 'يناديك به الناس ليميزوك عن غيرك.'], ['ما الشيء الذي يدخل الماء ولا يبتل؟', 'الضوء', 'يساعدنا على الرؤية ويمكن أن ينعكس على سطح الماء.']];
const el = (t, c = '', v = '') => { const n = document.createElement(t); if (c)
    n.className = c; if (v !== undefined)
    n.textContent = v; return n; };
const norm = s => String(s || '').trim().toLowerCase().replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').replace(/[ًٌٍَُِّْـ]/g, '').replace(/\s+/g, '');
export async function mount(stage, { code, uid, room }) {
    const ref = doc(db, 'rooms', code, 'game', 'state');
    let rm = room(), st = null, off, roomOff;
    const root = el('div', 'on-game'), status = el('div', 'on-status', 'بنجهز الفزورة…'), scores = el('div', 'on-scores'), split = el('div', 'riddle-split'), left = el('section', 'riddle-side'), right = el('section', 'riddle-side'), question = el('h2', ''), input = el('input'), submit = el('button', 'on-btn', 'إجابة'), hintBtn = el('button', 'on-btn', '💡 تلميح'), answerBtn = el('button', 'on-btn', '👁️ معرفة الإجابة'), hintBox = el('p', 'riddle-feedback'), feedback = el('p', 'riddle-feedback'), otherInfo = el('p', 'on-muted');
    hintBox.hidden = true;
    hintBtn.type = 'button';
    input.placeholder = 'اكتب إجابتك هنا';
    input.autocomplete = 'off';
    left.append(el('h3', '', 'تحدي الفوازير'), question, input, submit, hintBtn, answerBtn, hintBox, feedback);
    right.append(el('h3', '', 'المنافس'), otherInfo);
    split.append(left, right);
    root.append(status, scores, split);
    stage.replaceChildren(root);
    function render() { if (!st) {
        status.textContent = rm?.players?.length === 2 ? 'المضيف بيجهز أول فزورة…' : 'مستنيين اللاعب التاني يدخل الغرفة…';
        return;
    } const other = rm?.players?.find(x => x !== uid); scores.textContent = `${rm?.names?.[st.p1] || 'لاعب 1'}: ${st.s1}  |  ${rm?.names?.[st.p2] || 'لاعب 2'}: ${st.s2}`; question.textContent = st.status === 'over' ? `الإجابة: ${st.answer}` : st.question; hintBox.hidden = true; hintBox.textContent = ''; hintBtn.disabled = st.status !== 'active'; answerBtn.disabled = st.status !== 'active'; hintBtn.onclick = () => { hintBox.textContent = 'تلميح: ' + (st.hint || 'فكر في وصف الشيء المذكور في الفزورة.'); hintBox.hidden = false; hintBtn.disabled = true; }; answerBtn.onclick = () => { hintBox.textContent = 'الإجابة: ' + st.answer; hintBox.hidden = false; answerBtn.disabled = true; }; status.textContent = st.status === 'over' ? (st.winner === 'draw' ? 'تعادل الجولة!' : `الفائز بالجولة: ${rm?.names?.[st.winner] || 'لاعب'}`) : 'أسرع إجابة صحيحة تكسب النقطة!'; otherInfo.textContent = `${rm?.names?.[other] || 'المنافس'} — ${other === st.first ? 'أجاب صح أولًا' : 'جاهز للمنافسة'}`; input.disabled = st.status !== 'active' || st.answered?.includes(uid); submit.disabled = input.disabled; feedback.textContent = st.answered?.includes(uid) ? 'إجابتك اتسجلت. استنى نتيجة الجولة.' : ''; if (st.status === 'over' && !root.querySelector('[data-next]')) {
        const b = el('button', 'on-btn', 'الفزورة التالية');
        b.dataset.next = '1';
        b.disabled = false;
        b.onclick = next;
        right.append(b);
    } if (st.status !== 'over')
        root.querySelector('[data-next]')?.remove(); }
    async function init() { if (uid !== rm?.host || rm?.players?.length !== 2)
        return; try {
        await runTransaction(db, async (tx) => { const s = await tx.get(ref); if (s.exists())
            return; const [p1, p2] = rm.players; const q = bank[Math.floor(Math.random() * bank.length)]; tx.set(ref, { p1, p2, idx: 0, question: q[0], answer: q[1], hint: q[2], s1: 0, s2: 0, answered: [], first: '', winner: '', status: 'active', round: 1, at: serverTimestamp() }); });
    }
    catch (e) {
        toast(e.message || 'تعذر بدء الفوازير', 'error');
    } }
    async function answer() { const val = norm(input.value); if (!val)
        return; try {
        let correct = false;
        await runTransaction(db, async (tx) => { const s = await tx.get(ref); if (!s.exists())
            return; const d = s.data(); if (d.status !== 'active' || d.answered.includes(uid))
            return; correct = val === norm(d.answer); if (correct) {
            const answered = [...d.answered, uid];
            tx.update(ref, { answered, first: uid, winner: uid, status: 'over', [uid === d.p1 ? 's1' : 's2']: (uid === d.p1 ? d.s1 : d.s2) + 1, at: serverTimestamp() });
        } });
        feedback.textContent = correct ? 'إجابة صحيحة! 🎉' : 'إجابة مش صحيحة، جرّب تاني بسرعة';
        input.value = '';
    }
    catch (e) {
        toast(e.message || 'تعذر إرسال الإجابة', 'error');
    } }
    async function next() { try {
        await runTransaction(db, async (tx) => { const s = await tx.get(ref); if (!s.exists() || !rm?.players?.includes(uid) || s.data().status !== 'over')
            return; const d = s.data(), q = bank[Math.floor(Math.random() * bank.length)]; tx.update(ref, { idx: d.idx + 1, question: q[0], answer: q[1], hint: q[2], answered: [], first: '', winner: '', status: 'active', round: d.round + 1, at: serverTimestamp() }); });
    }
    catch (e) {
        toast(e.message || 'تعذر بدء فزورة جديدة', 'error');
    } }
    submit.onclick = answer;
    input.onkeydown = e => { if (e.key === 'Enter')
        answer(); };
    off = onSnapshot(ref, s => { st = s.exists() ? s.data() : null; render(); if (!st)
        init(); }, e => toast('تعذر الاتصال: ' + e.message, 'error'));
    roomOff = onSnapshot(doc(db, 'rooms', code), s => { rm = s.exists() ? s.data() : null; render(); if (!st)
        init(); });
    stage._onlineCleanup = () => { off?.(); roomOff?.(); };
}

