let auth = null, db = null, onAuthStateChanged = null, doc = null, getDoc = null, setDoc = null, updateDoc = null, onSnapshot = null, runTransaction = null, serverTimestamp = null;
let onlineModulesPromise = null;
async function loadOnlineModules() {
    if (onlineModulesPromise)
        return onlineModulesPromise;
    onlineModulesPromise = (async () => {
        const app = await import('./firebase.js');
        const authSdk = await import('https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js');
        const store = await import('https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js');
        auth = app.auth;
        db = app.db;
        onAuthStateChanged = authSdk.onAuthStateChanged;
        ({ doc, getDoc, setDoc, updateDoc, onSnapshot, runTransaction, serverTimestamp } = store);
        uid = auth.currentUser?.uid || null;
        return true;
    })().catch(e => { onlineModulesPromise = null; throw e; });
    return onlineModulesPromise;
}
const $ = id => document.getElementById(id), root = $('bzApp');
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
let uid = null, online = false, code = '', host = false, unsub = null, state = null, playerName = '';
const newId = () => Math.random().toString(36).slice(2, 10).toUpperCase();
function showOnlineError(e) { const box = $('bzError'); if (box)
    box.textContent = 'اللعب المحلي شغال، لكن تعذر تجهيز الأونلاين. تأكد من اتصال الإنترنت وإعدادات Firebase. ' + (e?.message || '');
else
    alert('تعذر تجهيز الأونلاين: ' + (e?.message || e)); }
function button(label, fn, cls = '') { return `<button class="bz-btn ${cls}" data-action="${esc(label)}">${label}</button>`; }
function renderStart() {
    root.innerHTML = `<div class="bz-grid"><article class="bz-card"><h2 class="bz-title">📱 لعب على نفس الجهاز</h2><p class="bz-muted">سجّل من 5 إلى 30 لاعبًا، ومرّر الجهاز بينهم عند ظهور الدور أو الاختيار السري.</p><button class="bz-btn" id="localStart">إنشاء مباراة محلية</button></article><article class="bz-card"><h2 class="bz-title">🌐 لعب أونلاين</h2><p class="bz-muted">أنشئ غرفة وشارك الكود مع أصحابك. كل لاعب يحتاج حسابًا مسجلًا في YOMAK.</p><input class="bz-input" id="bzName" placeholder="اسمك في اللعبة" maxlength="16"><div class="bz-actions"><button class="bz-btn" id="onlineCreate">إنشاء غرفة</button><input class="bz-input" id="bzCode" placeholder="كود الغرفة" maxlength="6" style="width:125px;text-transform:uppercase"><button class="bz-btn alt" id="onlineJoin">انضمام</button></div><p class="bz-small">الأونلاين يتطلب نشر قواعد Firestore المضافة في الملف.</p></article></div><div id="bzError" class="bz-muted" role="status"></div>`;
    $('localStart').onclick = () => setupLocal();
    $('onlineCreate').onclick = () => createOnline().catch(showOnlineError);
    $('onlineJoin').onclick = () => joinOnline().catch(showOnlineError);
}
function setupLocal() { online = false; code = ''; host = true; root.innerHTML = `<h2>تسجيل اللاعبين</h2><p class="bz-muted">أدخل من 5 إلى 30 اسمًا. تقدر تسيب أسماء افتراضية وتعدّلها.</p><label>عدد اللاعبين <select id="bzCount" class="bz-select">${Array.from({ length: 26 }, (_, i) => `<option value="${i + 5}" ${i === 3 ? 'selected' : ''}>${i + 5}</option>`).join('')}</select></label><div id="bzNames" class="bz-name-grid"></div><div class="bz-actions"><button class="bz-btn" id="bzStart">ابدأ المباراة</button><button class="bz-btn alt" id="bzBack">رجوع</button></div>`; const draw = () => { const n = +$('bzCount').value; const old = [...root.querySelectorAll('[data-player-name]')].map(x => x.value); $('bzNames').innerHTML = Array.from({ length: n }, (_, i) => `<input class="bz-input" data-player-name="${i}" maxlength="16" placeholder="اسم اللاعب ${i + 1}" value="${esc(old[i] || '')}">`).join(''); }; $('bzCount').onchange = draw; draw(); $('bzBack').onclick = renderStart; $('bzStart').onclick = () => { const names = [...root.querySelectorAll('[data-player-name]')].map((x, i) => x.value.trim() || `لاعب ${i + 1}`); if (new Set(names.map(n => n.toLowerCase())).size !== names.length) {
    alert('اختار أسماء مختلفة للاعبين.');
    return;
} state = initialState(names.map((name, i) => ({ id: 'p' + i, name, uid: null }))); chooseTurn(); renderGame(); }; }
function initialState(players) { return { game: 'bazooka', status: 'active', phase: 'turns', players: players.map(p => ({ ...p, hp: 3, alive: true, bazookas: 0 })), turn: null, round: 1, final: null, log: ['بدأت المباراة! كل لاعب عنده 3 قلوب.'], createdAt: Date.now(), updatedAt: Date.now() }; }
function active() { return state.players.filter(p => p.alive); }
function aliveCount() { return active().length; }
function chooseTurn() { const a = active(); if (a.length > 1)
    state.turn = a[Math.floor(Math.random() * a.length)].id;
else
    state.turn = a[0]?.id || null; }
function log(t) { state.log.unshift(t); state.log = state.log.slice(0, 35); }
function renderGame() {
    if (!state) {
        renderStart();
        return;
    }
    const me = state.players.find(p => p.uid === uid);
    const turn = state.players.find(p => p.id === state.turn);
    root.innerHTML = `<div class="bz-row"><div><h2 class="bz-title">${online ? '🌐 غرفة ' + esc(code) : '📱 مباراة محلية'}</h2><p class="bz-muted">${state.status === 'over' ? 'انتهت المباراة' : `اللاعبون النشطون: ${aliveCount()} / ${state.players.length}`}</p></div><div class="bz-actions"><button class="bz-btn alt" id="bzCopy">نسخ كود الغرفة</button><button class="bz-btn alt" id="bzLeave">${online ? 'مغادرة الغرفة' : 'إنهاء المباراة'}</button></div></div><div class="bz-status" id="bzStatus">${statusText()}</div><div class="bz-row"><h3 class="bz-title">اللاعبون</h3><span class="bz-muted">الدور الحالي: <b>${esc(turn?.name || '—')}</b></span></div><div class="bz-list">${state.players.map(p => `<article class="bz-player ${p.id === state.turn ? 'active' : ''} ${!p.alive ? 'dead' : ''}"><div><strong>${esc(p.name)}</strong><div class="bz-hearts">${'❤️'.repeat(p.hp)}${'🩶'.repeat(3 - p.hp)}</div><div class="bz-muted">${p.alive ? 'نشط' : 'خارج الجولة'} · 🚀 ${p.bazookas}</div></div><span>${p.id === state.turn ? '👈' : ''}</span></article>`).join('')}</div><div id="bzControls">${controls(me, turn)}</div><h3>سجل المباراة</h3><ol class="bz-log">${state.log.map(x => `<li>${esc(x)}</li>`).join('')}</ol>`;
    $('bzCopy')?.addEventListener('click', async () => { if (!code) {
        alert('دي مباراة محلية ومفيش كود.');
        return;
    } try {
        await navigator.clipboard.writeText(code);
        alert('اتنسخ الكود: ' + code);
    }
    catch {
        alert('كود الغرفة: ' + code);
    } });
    $('bzLeave').onclick = () => { if (online) {
        if (unsub)
            unsub();
        unsub = null;
        online = false;
        state = null;
        code = '';
        renderStart();
    }
    else if (confirm('تنهي المباراة الحالية؟')) {
        state = null;
        renderStart();
    } };
    bindControls(me, turn);
}
function statusText() { if (state.status === 'over')
    return `🏆 الفائز: ${state.winner || 'غير محدد'}`; if (state.phase === 'final')
    return '🏁 المواجهة النهائية: طوبة ورقة مقص من 3 جولات. أول لاعب يفوز بجولتين يحصل على Bazooka.'; if (state.phase === 'rps')
    return 'اختار كل لاعب طوبة أو ورقة أو مقص؛ الاختيارات تظهر بعد ما الاثنين يختاروا.'; return 'اختيار عشوائي لصاحب كل دور. الضربة العادية تخصم قلبًا واحدًا.'; }
function controls(me, turn) { if (state.status === 'over')
    return `<button class="bz-btn" id="bzAgain">مباراة جديدة</button>`; if (state.phase === 'final')
    return `<div class="bz-card"><p>اختار لاعبَي المواجهة حركة سرية على نفس الجهاز أو من جهاز كل لاعب.</p><div class="bz-actions">${['طوبة', 'ورقة', 'مقص'].map(x => `<button class="bz-btn alt" data-rps="${x}">${x}</button>`).join('')}</div><p class="bz-small">الأونلاين: كل لاعب يرسل اختياره من جهازه. المحلي: مرّر الجهاز بين اللاعبين.</p></div>`; if (state.phase === 'turns' && turn) {
    if (online && (!me || me.id !== turn.id))
        return '<p class="bz-muted">استنى دورك… اللعبة بتتزامن تلقائيًا.</p>';
    return `<div class="bz-card"><h3>دور ${esc(turn.name)}</h3><p class="bz-muted">اختار لاعبًا آخر أو استخدم Bazooka لو عندك.</p><label>الهدف <select id="bzTarget" class="bz-select">${state.players.filter(p => p.alive && p.id !== turn.id).map(p => `<option value="${p.id}">${esc(p.name)} (${p.hp} ❤️)</option>`).join('')}</select></label><div class="bz-actions"><button class="bz-btn" id="bzHit">ضربة عادية − قلب</button>${turn.bazookas > 0 ? `<button class="bz-btn danger" id="bzBazooka">استخدام Bazooka (${turn.bazookas})</button><button class="bz-btn alt" id="bzRevive">إحياء لاعب</button><button class="bz-btn alt" id="bzTransfer">نقل Bazooka</button>` : ''}</div></div>`;
} return '<p class="bz-muted">جاري تحديث حالة المباراة…</p>'; }
function bindControls(me, turn) { $('bzAgain')?.addEventListener('click', () => { if (online) {
    if (!host)
        return alert('صاحب الغرفة فقط يبدأ مباراة جديدة.');
    state = initialState(state.players.map(p => ({ id: p.id, name: p.name, uid: p.uid })));
    sync();
}
else
    setupLocal(); }); $('bzHit')?.addEventListener('click', () => act('hit')); $('bzBazooka')?.addEventListener('click', () => act('bazooka')); $('bzRevive')?.addEventListener('click', () => act('revive')); $('bzTransfer')?.addEventListener('click', () => act('transfer')); root.querySelectorAll('[data-rps]').forEach(b => b.onclick = () => playRps(b.dataset.rps)); }
async function act(type) { if (!state || state.status === 'over')
    return; const p = state.players.find(x => x.id === state.turn); if (!p)
    return; if (online && p.uid !== uid)
    return alert('مش دورك.'); let target = $('bzTarget')?.value; if (type === 'revive') {
    const dead = state.players.filter(x => !x.alive);
    if (!dead.length)
        return alert('مفيش لاعب خارج الجولة لإحيائه.');
    target = await choosePlayer(dead, 'اختار لاعبًا لإحيائه');
    if (!target)
        return;
    target = target.id;
    if (!p.bazookas)
        return alert('مفيش Bazooka في حوزتك.');
}
else if (type === 'transfer') {
    if (!p.bazookas)
        return;
    const others = state.players.filter(x => x.id !== p.id);
    const to = await choosePlayer(others, 'اختار المستلم');
    if (!to)
        return;
    if (online && to.uid === uid)
        return alert('اختار لاعبًا آخر.');
    p.bazookas--;
    to.bazookas++;
    log(`${p.name} نقل Bazooka إلى ${to.name}.`);
    finishTurn();
    await persist();
    return;
} if (!target)
    return alert('مفيش هدف متاح.'); const t = state.players.find(x => x.id === target); if (!t)
    return; if (type === 'bazooka' || type === 'revive') {
    if (!p.bazookas)
        return alert('مفيش Bazooka في حوزتك.');
    if (type === 'bazooka' && !confirm(`تأكيد استخدام Bazooka ضد ${t.name}؟`))
        return;
    if (type === 'revive' && t.alive)
        return alert('اللاعب ده لسه نشط.');
    if (type === 'bazooka') {
        t.hp = 0;
        t.alive = false;
        p.bazookas--;
        log(`${p.name} استخدم Bazooka وأخرج ${t.name} فورًا.`);
    }
    else {
        t.hp = 3;
        t.alive = true;
        p.bazookas--;
        log(`${p.name} أعاد ${t.name} إلى المباراة بـ3 قلوب.`);
    }
}
else {
    if (!t.alive || p.id === t.id)
        return;
    t.hp = Math.max(0, t.hp - 1);
    if (t.hp === 0) {
        t.alive = false;
        log(`${p.name} استهدف ${t.name} بضربة عادية؛ خرج من الجولة.`);
    }
    else
        log(`${p.name} استهدف ${t.name}؛ صحته الآن ${t.hp}/3.`);
} finishTurn(); await persist(); }
function finishTurn() { if (aliveCount() <= 1) {
    state.status = 'over';
    state.winner = active()[0]?.name || 'لا يوجد فائز';
    log(`انتهت المباراة. الفائز: ${state.winner}`);
    return;
} if (aliveCount() > 2)
    state.finalAwarded = false; if (aliveCount() === 2 && !state.finalAwarded) {
    state.phase = 'final';
    state.final = { players: active().map(p => p.id), scores: {}, choices: {}, round: 1 };
    log('بدأت المواجهة النهائية بين آخر لاعبين نشطين.');
    return;
} state.phase = 'turns'; chooseTurn(); }
function playRps(choice) { if (state.phase !== 'final')
    return; const ids = state.final.players; if (online) {
    const p = state.players.find(x => x.uid === uid);
    if (!p || !ids.includes(p.id))
        return alert('المواجهة للاعبين الأخيرين فقط.');
    state.final.choices[p.id] = choice;
    if (ids.every(id => state.final.choices[id]))
        resolveRps();
    persist();
    renderGame();
    return;
} const first = state.players.find(x => x.id === ids[0]), second = state.players.find(x => x.id === ids[1]); const a = prompt(`${first.name}: اكتب طوبة أو ورقة أو مقص`); if (!a)
    return; const b = prompt(`${second.name}: اكتب طوبة أو ورقة أو مقص`); if (!b)
    return; const norm = s => ({ 'طوبة': 'طوبة', 'ورقة': 'ورقة', 'مقص': 'مقص' }[s.trim()]); state.final.choices = { [first.id]: norm(a), [second.id]: norm(b) }; if (!state.final.choices[first.id] || !state.final.choices[second.id])
    return alert('اكتب طوبة أو ورقة أو مقص بالضبط.'); resolveRps(); persist(); renderGame(); }
function resolveRps() { const ids = state.final.players, [a, b] = ids, ca = state.final.choices[a], cb = state.final.choices[b]; let win = null; if (ca !== cb) {
    if ((ca === 'طوبة' && cb === 'مقص') || (ca === 'ورقة' && cb === 'طوبة') || (ca === 'مقص' && cb === 'ورقة'))
        win = a;
    else
        win = b;
} if (win) {
    state.final.scores[win] = (state.final.scores[win] || 0) + 1;
    log(`${state.players.find(p => p.id === win).name} كسب جولة طوبة ورقة مقص.`);
}
else
    log('تعادل في طوبة ورقة مقص.'); state.final.choices = {}; if ((state.final.scores[a] || 0) >= 2 || (state.final.scores[b] || 0) >= 2) {
    const w = (state.final.scores[a] || 0) >= (state.final.scores[b] || 0) ? a : b;
    state.players.find(p => p.id === w).bazookas++;
    state.finalAwarded = true;
    log(`${state.players.find(p => p.id === w).name} فاز بالمواجهة وحصل على Bazooka.`);
    state.phase = 'turns';
    state.final = null;
    chooseTurn();
}
else
    state.final.round++; }
function choosePlayer(players, title) { return new Promise(resolve => { const dlg = document.createElement('dialog'); dlg.className = 'bz-modal'; dlg.innerHTML = `<h3>${esc(title)}</h3><div class="bz-actions">${players.map(p => `<button class="bz-btn alt" data-p="${p.id}">${esc(p.name)}</button>`).join('')}</div><button class="bz-btn" id="cancel">إلغاء</button>`; dlg.querySelectorAll('[data-p]').forEach(b => b.onclick = () => { const p = players.find(p => p.id === b.dataset.p); dlg.close(); dlg.remove(); resolve(p); }); dlg.querySelector('#cancel').onclick = () => { dlg.close(); dlg.remove(); resolve(null); }; document.body.append(dlg); dlg.showModal(); }); }
async function persist() { if (!online) {
    renderGame();
    return;
} state.updatedAt = Date.now(); try {
    await runTransaction(db, async (tx) => { const ref = doc(db, 'bazookaRooms', code), s = await tx.get(ref); if (!s.exists())
        throw Error('الغرفة مش موجودة'); tx.update(ref, { state, updatedAt: Date.now() }); });
}
catch (e) {
    alert('تعذر حفظ الحركة أونلاين: ' + (e.message || e));
} }
async function createOnline() { await loadOnlineModules(); uid = auth.currentUser?.uid || null; if (!uid)
    return alert('سجّل الدخول إلى YOMAK أولًا، ثم أعد فتح اللعبة.'); playerName = $('bzName').value.trim(); if (playerName.length < 2)
    return alert('اكتب اسمًا من حرفين على الأقل.'); for (let i = 0; i < 8; i++) {
    code = newId().slice(0, 6);
    const ref = doc(db, 'bazookaRooms', code);
    if ((await getDoc(ref)).exists())
        continue;
    host = true;
    online = true;
    const p = { id: 'p' + uid, name: playerName, uid };
    state = initialState([p]);
    state.status = 'open';
    await setDoc(ref, { game: 'bazooka', host: uid, players: [uid], names: { [uid]: playerName }, max: 30, status: 'open', state, createdAt: serverTimestamp(), updatedAt: Date.now() });
    watchOnline();
    return;
} alert('حاول إنشاء الغرفة مرة أخرى.'); }
async function joinOnline() { await loadOnlineModules(); uid = auth.currentUser?.uid || null; if (!uid)
    return alert('سجّل الدخول إلى YOMAK أولًا، ثم أعد فتح اللعبة.'); playerName = $('bzName').value.trim(); code = $('bzCode').value.trim().toUpperCase(); if (playerName.length < 2 || code.length !== 6)
    return alert('اكتب اسمك وكودًا من 6 حروف/أرقام.'); const ref = doc(db, 'bazookaRooms', code); try {
    await runTransaction(db, async (tx) => { const s = await tx.get(ref); if (!s.exists())
        throw Error('الغرفة غير موجودة.'); const r = s.data(); if (r.status !== 'open')
        throw Error('المباراة بدأت بالفعل أو انتهت.'); if (r.players.length >= 30)
        throw Error('الغرفة مكتملة.'); if (r.players.includes(uid))
        return; const p = { id: 'p' + uid, name: playerName, uid }; const next = { ...r.state, players: [...r.state.players, p] }; tx.update(ref, { players: [...r.players, uid], [`names.${uid}`]: playerName, state: next }); });
    online = true;
    host = false;
    watchOnline();
}
catch (e) {
    alert(e.message || 'تعذر الانضمام');
} }
function watchOnline() { if (unsub)
    unsub(); unsub = onSnapshot(doc(db, 'bazookaRooms', code), s => { if (!s.exists()) {
    root.innerHTML = '<p>الغرفة غير موجودة.</p>';
    return;
} const r = s.data(); state = r.state; host = r.host === uid; if (state.status === 'open' && host) {
    root.innerHTML = `<div class="bz-row"><div><h2>غرفة ${esc(code)}</h2><p>اللاعبون: ${r.players.length}/30</p></div><button class="bz-btn" id="bzBegin" ${r.players.length < 5 ? 'disabled' : ''}>بدء المباراة</button></div><div class="bz-list">${state.players.map(p => `<div class="bz-player">${esc(p.name)}</div>`).join('')}</div><p class="bz-muted">شارك الكود ${esc(code)} مع أصحابك. لازم 5 لاعبين على الأقل.</p><button class="bz-btn alt" id="bzCopyLobby">نسخ الكود</button><button class="bz-btn alt" id="bzExitLobby">إلغاء الغرفة</button>`;
    $('bzBegin').onclick = async () => { if (state.players.length < 5)
        return; state.status = 'active'; state.phase = 'turns'; chooseTurn(); log('بدأت المباراة!'); await updateDoc(doc(db, 'bazookaRooms', code), { status: 'active', state, updatedAt: Date.now() }); };
    $('bzCopyLobby').onclick = () => navigator.clipboard?.writeText(code);
    $('bzExitLobby').onclick = () => { unsub?.(); unsub = null; online = false; state = null; renderStart(); };
    return;
} renderGame(); }, e => { root.innerHTML = `<p>تعذر الاتصال بالغرفة: ${esc(e.message)}</p><p class="bz-muted">تأكد من نشر قواعد Firestore الخاصة بـBazooka.</p>`; }); }
const roomParam = new URLSearchParams(location.search).get('c');
if (roomParam) {
    code = roomParam.toUpperCase();
    root.innerHTML = `<p>اكتب اسمك للانضمام إلى الغرفة ${esc(code)}</p><input class="bz-input" id="bzName" placeholder="اسمك" maxlength="16"><button class="bz-btn" id="onlineJoin">انضمام</button><p class="bz-muted">اللعب المحلي متاح بدون تسجيل دخول من صفحة اللعبة الرئيسية.</p>`;
    $('onlineJoin').onclick = () => joinOnlineFromLink().catch(showOnlineError);
}
else
    renderStart();
async function joinOnlineFromLink() { await loadOnlineModules(); uid = auth.currentUser?.uid || null; if (!uid)
    return alert('سجّل الدخول إلى YOMAK أولًا، ثم أعد فتح الرابط.'); playerName = $('bzName').value.trim(); if (playerName.length < 2)
    return alert('اكتب اسمك.'); const ref = doc(db, 'bazookaRooms', code); try {
    await runTransaction(db, async (tx) => { const s = await tx.get(ref); if (!s.exists())
        throw Error('الغرفة غير موجودة.'); const r = s.data(); if (r.status !== 'open')
        throw Error('المباراة بدأت بالفعل.'); if (r.players.length >= 30)
        throw Error('الغرفة مكتملة.'); if (!r.players.includes(uid)) {
        const p = { id: 'p' + uid, name: playerName, uid };
        tx.update(ref, { players: [...r.players, uid], [`names.${uid}`]: playerName, state: { ...r.state, players: [...r.state.players, p] } });
    } });
    online = true;
    watchOnline();
}
catch (e) {
    alert(e.message || 'تعذر الانضمام');
} }

