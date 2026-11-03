// صفحة الغرفة: اللاعبين + كود ولينك دعوة (نسخ) + شات الغرفة + مكان اللعبة
import { startShell, $, errMsg } from './shell.js';
import { toast, setLoading } from './ui.js';
import { watchProfile, watchGameNames, errText, avatarEl, gamePhoto, writePresence } from './username.js';
import { promptUsername, ensureGameName } from './game-gate.js';
import { GAMES } from './games-list.js';
import { parseCode, inviteLink, copyText, watchRoom, watchMessages, joinRoom, leaveRoom, sendMessage, watchGameState, saveGameHistory } from './rooms.js';
const mk = (t, c, x) => { const e = document.createElement(t); if (c)
    e.className = c; if (x != null)
    e.textContent = x; return e; };
const code = parseCode(new URLSearchParams(location.search).get('c') || location.hash.slice(1));
const TF = new Intl.DateTimeFormat('ar-EG-u-nu-latn', { hour: 'numeric', minute: '2-digit' });
const ph = {};
let user, room, profile, names, joining = false, msgOff = null, mounted = false, last = 0, failed = '';
const me = () => room?.names?.[user.uid];
const isMember = () => !!room && room.players.includes(user.uid);
function banner(t, tone) { const b = $('rmBanner'); b.hidden = !t; b.textContent = t || ''; b.dataset.tone = tone || ''; }
async function tryJoin() {
    if (joining || !room || isMember() || room.status !== 'open' || profile === undefined || names === undefined || failed)
        return;
    joining = true;
    try {
        if (!profile)
            await promptUsername(user.uid, { mandatory: true });
        const n = await ensureGameName(user.uid, room.game, names || {});
        if (!n) {
            failed = 'محتاج تختار اسم لاعب علشان تدخل الغرفة.';
            render();
            return;
        }
        await joinRoom(user.uid, code, n);
    }
    catch (e) {
        failed = errText(e);
        render();
    }
    joining = false;
}
function render() {
    if (!room) {
        $('rmMain').hidden = true;
        banner(room === null ? 'مفيش غرفة بالكود ده.' : 'بنفتح الغرفة…', room === null ? 'err' : '');
        $('rmRetry').hidden = true;
        return;
    }
    const g = GAMES.find(x => x.id === room.game) || { t: room.game, icon: '🎮' }, closed = room.status === 'closed', mem = isMember();
    $('rmTitle').textContent = `${g.icon} غرفة ${g.t}`;
    $('rmCode').textContent = code;
    $('rmMain').hidden = !mem && !closed;
    banner(closed ? 'الغرفة دي اتقفلت.' : failed || (!mem && room.players.length >= room.max ? 'الغرفة مكتملة.' : ''), closed || failed || !mem ? 'err' : '');
    $('rmRetry').hidden = !failed;
    $('rmCount').textContent = `${room.players.length} / ${room.max}`;
    const pl = $('rmPlayers');
    pl.replaceChildren();
    room.players.forEach(u => {
        const r = mk('div', 'gm-row' + (u === user.uid ? ' me' : '')), a = avatarEl(room.names[u] || '?', null, ph[u]);
        if (ph[u] === undefined) {
            ph[u] = '';
            gamePhoto(room.game, room.names[u] || '').then(p => { if (p) {
                ph[u] = p;
                render();
            } });
        }
        r.append(a, mk('span', 'gm-rn', room.names[u] || 'لاعب'));
        if (u === room.host)
            r.append(mk('em', 'gm-on', 'المضيف'));
        if (u === user.uid)
            r.append(mk('em', 'gm-soon', 'إنت'));
        pl.append(r);
    });
    if (mem && !historyOff) historyOff = watchGameState(code, st => { if (st?.status === 'over' && room) { const key = `${code}_${st.round || 1}`; if (historyKey !== key) { historyKey = key; saveGameHistory(code, room, st).catch(() => {}); } } }, () => {});
    const dis = closed || !mem;
    $('rmMsg').disabled = dis;
    $('rmSend').disabled = dis;
    document.querySelectorAll('#rmQuick button').forEach(b => b.disabled = dis);
    $('rmLeave').textContent = room.host === user.uid ? 'قفل الغرفة' : 'خروج من الغرفة';
    if (mem && !msgOff)
        msgOff = watchMessages(code, renderMsgs, e => toast(errMsg(e), 'error'));
    if (mem && !mounted) {
        mounted = true;
        mountGame();
    }
}
async function mountGame() {
    const st = $('rmStage');
    try {
        const m = await import(`./game-${room.game}.js`);
        st.replaceChildren();
        await m.mount(st, { code, uid: user.uid, room: () => room });
    }
    catch (e) {
        const g = GAMES.find(x => x.id === room.game);
        st.replaceChildren(mk('div', 'rm-soon', '🎮'), mk('p', '', `لعبة ${g?.t || ''} لسه مش متاحة. تقدروا تجهّزوا الغرفة وتتكلموا هنا لحد ما تتفعّل.`));
    }
}
function renderMsgs(list) {
    const box = $('rmLog'), near = box.scrollHeight - box.scrollTop - box.clientHeight < 80;
    box.replaceChildren();
    if (!list.length)
        box.append(mk('p', 'muted', 'ابدأ الكلام 👋'));
    list.forEach(m => {
        const mine = m.uid === user.uid, d = mk('div', 'rm-m' + (mine ? ' mine' : ''));
        if (!mine)
            d.append(mk('b', '', m.name));
        d.append(mk('span', '', m.text), mk('small', '', m.at?.toDate ? TF.format(m.at.toDate()) : ''));
        box.append(d);
    });
    if (near || list.length < 2)
        box.scrollTop = box.scrollHeight;
}
async function send(t) {
    t = t.trim();
    if (!t || !isMember() || room.status !== 'open')
        return;
    if (Date.now() - last < 800) {
        toast('براحة شوية 😄', 'info');
        return;
    }
    last = Date.now();
    try {
        await sendMessage(user.uid, code, me(), t);
    }
    catch (e) {
        toast(errText(e), 'error');
    }
}
$('rmForm').onsubmit = e => { e.preventDefault(); const v = $('rmMsg').value; $('rmMsg').value = ''; send(v); };
document.querySelectorAll('#rmQuick button').forEach(b => b.onclick = () => send(b.textContent));
const cp = async (t, m) => toast(await copyText(t) ? m : 'ماقدرتش أنسخ، انسخه يدوي', 'success');
$('rmCopy').onclick = () => cp(code, 'اتنسخ الكود ✓');
$('rmCopyLink').onclick = () => cp(inviteLink(code), 'اتنسخ لينك الدعوة ✓');
if (navigator.share)
    $('rmShare').hidden = false;
$('rmShare').onclick = () => navigator.share({ title: 'تعالى العب معايا على يومك', text: `كود الغرفة: ${code}`, url: inviteLink(code) }).catch(() => { });
$('rmRetry').onclick = () => { failed = ''; tryJoin(); };
$('rmLeave').onclick = async (e) => {
    if (!isMember() || room.status === 'closed') {
        location.href = 'games.html';
        return;
    }
    if (!confirm(room.host === user.uid ? 'تقفل الغرفة للكل؟' : 'تخرج من الغرفة؟'))
        return;
    setLoading(e.currentTarget, true);
    try {
        await Promise.race([Promise.resolve($('rmStage')._onlineLeave?.()).catch(() => { }), new Promise(r => setTimeout(r, 2500))]);
        await leaveRoom(user.uid, code);
    }
    catch (err) {
        toast(errText(err), 'error');
    }
    location.href = 'games.html';
};
if (!code)
    banner('الكود مش صحيح. ارجع لصفحة الألعاب وادخل كود تاني.', 'err');
startShell({
    onUser: u => {
        user = u;
        if (!code) {
            $('rmMain').hidden = true;
            return;
        }
        const er = e => toast(errMsg(e), 'error');
        watchProfile(u.uid, p => { profile = p; tryJoin(); }, er);
        watchGameNames(u.uid, m => { names = m; tryJoin(); }, er);
        watchRoom(code, r => { room = r; render(); tryJoin(); writePresence(u.uid, { online: !document.hidden, page: 'room', game: room?.game || '' }).catch(() => {}); }, e => { room = null; banner(errText(e), 'err'); });
        document.addEventListener('visibilitychange', () => writePresence(u.uid, { online: !document.hidden, page: 'room', game: room?.game || '' }).catch(() => {}));
        window.setInterval(() => { if (!document.hidden) writePresence(u.uid, { online: true, page: 'room', game: room?.game || '' }).catch(() => {}); }, 60000);
        window.addEventListener('pagehide', () => writePresence(u.uid, { online: false, page: 'room', game: room?.game || '' }).catch(() => {}));

    },
    onTasks: () => { }
});

