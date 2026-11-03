// صفحة الألعاب: الملف الشخصي + الأصدقاء + كروت الألعاب
import { startShell, $, errMsg } from './shell.js';
import { toast, setLoading } from './ui.js';
import { watchProfile, watchFriendships, sendRequest, acceptRequest, removeFriendship, getProfile, watchGameNames, errText, COOLDOWN, DAY, toAvatar, setProfilePhoto, avatarEl, MAX_IN, watchPresence, writePresence, watchGameInvites, sendGameInvite, updateGameInvite, watchGameHistory } from './username.js';
import { promptUsername, ensureGameName } from './game-gate.js';
import { GAMES, MODES, hasOnline } from './games-list.js';
import { createRoom, parseCode } from './rooms.js';
const mk = (t, c, x) => { const e = document.createElement(t); if (c)
    e.className = c; if (x != null)
    e.textContent = x; return e; };
const av = (name, key, photo) => avatarEl(name, key, photo);
let user = null, profile, fr = [], names = {}, prompted = false, invites = [], history = [], presence = {}, presenceOff = new Map();
const nm = {};
async function nameOf(uid) { if (nm[uid])
    return nm[uid]; const p = await getProfile(uid); return nm[uid] = p || { username: 'مستخدم', key: uid }; }
function renderProfile() {
    const b = $('gmProfBox');
    b.replaceChildren();
    if (profile === undefined)
        return;
    if (!profile) {
        b.append(mk('p', 'muted', 'اختار Username علشان تبدأ.'));
        const x = mk('button', '', 'اختار Username');
        x.onclick = () => promptUsername(user.uid, { mandatory: true });
        b.append(x);
        return;
    }
    const left = (profile.changedAt?.toMillis?.() || 0) + COOLDOWN - Date.now();
    const info = mk('div', 'gm-who');
    info.append(mk('strong', '', profile.username), mk('small', 'muted', left > 0 ? `تقدر تغيّره بعد ${Math.ceil(left / DAY)} يوم` : 'تقدر تغيّره دلوقتي'));
    const ch = mk('button', 'secondary', 'تغيير');
    ch.type = 'button';
    ch.onclick = () => left > 0 ? toast(`تقدر تغيّر الـ Username بعد ${Math.ceil(left / DAY)} يوم`, 'info') : promptUsername(user.uid, { value: profile.username, photo: profile.photo || '' });
    const pb = mk('button', 'secondary', '📷 الصورة');
    pb.type = 'button';
    pb.onclick = () => { const fi = mk('input'); fi.type = 'file'; fi.accept = 'image/*'; fi.onchange = async () => { const f = fi.files[0]; if (!f)
        return; try {
        const d = await toAvatar(f);
        await setProfilePhoto(user.uid, d);
        toast(f.size > MAX_IN ? 'الصورة كبيرة، اتضغطت واتحفظت ✓' : 'اتحفظت الصورة ✓', 'success');
    }
    catch (e) {
        toast(errText(e), 'error');
    } }; fi.click(); };
    b.append(av(profile.username, profile.key, profile.photo), info, pb, ch);
}
function renderGames() {
    const g = $('gmGrid');
    g.replaceChildren();
    for (const x of GAMES) {
        const c = mk('article', 'gm-card');
        c.append(mk('div', 'gm-ico', x.icon));
        const h = mk('h3', '', x.t);
        if (!x.ready) h.append(mk('em', 'gm-soon', 'قريبًا'));
        if (x.mode) h.append(mk('em', MODES[x.mode][1], MODES[x.mode][0]));
        c.append(h, mk('p', 'muted', x.d));
        const n = names[x.id]?.name, nk = mk('div', 'gm-nickrow');
        if (n) nk.append(av(n, null, names[x.id]?.photo, 'sm'));
        nk.append(mk('small', 'gm-nick', n ? `اسمك فيها: ${n}` : 'لسه ماختارتش اسم'));
        c.append(nk);
        const a = mk('div', 'gm-act'), play = mk('button', '', x.ready ? 'العب' : 'قريبًا');
        play.type = 'button'; play.disabled = !x.ready;
        play.onclick = () => { if (x.ready) location.href = `game-${x.id}.html`; };
        const edit = mk('button', 'secondary', n ? 'تغيير اسم اللعبة' : 'اختيار اسمك في اللعبة');
        edit.type = 'button'; edit.onclick = async () => { try { await ensureGameName(user.uid, x.id, names, { force: true }); } catch (e) { toast(errText(e), 'error'); } };
        a.append(play, edit);
        if (hasOnline(x) && x.id !== 'bazooka') {
            const invite = mk('button', 'secondary', '＋ تحدي صديق'); invite.type = 'button';
            invite.onclick = () => challengeFriend(x, invite); a.append(invite);
        }
        c.append(a); g.append(c);
    }
}
async function challengeFriend(game, trigger) {
    const friends = fr.filter(f => f.status === 'accepted');
    if (!friends.length) { toast('ضيف أصدقاء الأول علشان تقدر تتحداهم.', 'info'); $('gmAdd').focus(); return; }
    const d = mk('dialog', 'gm-dlg'), head = mk('div', 'dialog-head'), close = mk('button', 'icon-btn', '✕');
    close.type = 'button'; head.append(mk('h2', '', `تحدي صديق — ${game.t}`), close); d.append(head);
    const done = () => { d.close(); d.remove(); }; close.onclick = done; d.addEventListener('cancel', done);
    for (const f of friends) {
        const other = f.users.find(u => u !== user.uid), p = await nameOf(other), b = mk('button', 'secondary gm-pb', `🎮 ${p.username}`);
        b.type = 'button'; b.onclick = async () => { setLoading(b, true); try {
            const playerName = await ensureGameName(user.uid, game.id, names); if (!playerName) { setLoading(b, false); return; }
            const code = await createRoom(user.uid, game.id, 2, playerName);
            await sendGameInvite(user.uid, other, game.id, code);
            done(); toast(`اتبعث تحدي إلى ${p.username} بنجاح!`, 'success');
            location.href = `room.html?c=${code}`;
        } catch (e) { toast(errText(e), 'error'); setLoading(b, false); } }; d.append(b);
    }
    document.body.append(d); d.showModal();
}
function renderInvites() {
    const box = $('gmInviteList'); if (!box) return; box.replaceChildren();
    const pending = invites.filter(i => i.status === 'pending');
    if (!pending.length) { box.append(mk('p', 'muted', 'مفيش دعوات جديدة.')); return; }
    pending.forEach(async inv => {
        const p = await nameOf(inv.from), g = GAMES.find(x => x.id === inv.game), r = mk('div', 'gm-row');
        r.append(av(p.username, p.key, p.photo), mk('span', 'gm-rn', `${p.username} بيتحداك في ${g?.t || 'لعبة'}`));
        const actions = mk('div', 'gm-rb');
        actions.append(btn('قبول', '', async () => { await updateGameInvite(inv.id, 'accepted'); location.href = `room.html?c=${inv.roomCode}`; }), btn('رفض', 'secondary', () => updateGameInvite(inv.id, 'declined')));
        r.append(actions); if (invites.some(x => x.id === inv.id && x.status === 'pending')) box.append(r);
    });
}

function renderHistory() {
    const box = $('gmHistory'); if (!box) return; box.replaceChildren();
    if (!history.length) { box.append(mk('p', 'muted', 'لسه مفيش مباريات أونلاين مكتملة.')); return; }
    history.slice(0, 10).forEach(item => {
        const other = item.users?.find(id => id !== user.uid), p = other ? (nm[other] || { username: item.names?.[other] || 'لاعب' }) : null;
        const g = GAMES.find(x => x.id === item.game), r = mk('div', 'gm-row');
        r.append(mk('span', 'gm-history-icon', g?.icon || '🎮'), mk('span', 'gm-rn', `${g?.t || item.game} — ${p?.username || 'مباراة'}`), mk('strong', item.winner === user.uid ? 'gm-history-win' : 'gm-history-result', item.winner === user.uid ? 'فوز' : item.winner === 'draw' ? 'تعادل' : 'خسارة'));
        const date = item.playedAt?.toDate?.(); if (date) r.append(mk('small', 'muted', new Intl.DateTimeFormat('ar-EG',{dateStyle:'medium',timeStyle:'short'}).format(date)));
        box.append(r);
    });
}
async function row(f, btns) {
    const other = f.users.find(u => u !== user.uid), p = await nameOf(other), r = mk('div', 'gm-row');
    r.append(av(p.username, p.key, p.photo), mk('span', 'gm-rn', p.username));
    const pr = presence[other], online = !!pr?.online && (pr.lastSeen?.toMillis?.() || 0) > Date.now() - 120000;
    r.append(mk('small', online ? 'gm-pres online' : 'gm-pres', online ? (pr?.game ? `يلعب ${GAMES.find(g => g.id === pr.game)?.t || 'الآن'}` : 'متصل الآن') : pr?.lastSeen?.toDate ? `آخر ظهور ${new Intl.DateTimeFormat('ar-EG',{dateStyle:'short',timeStyle:'short'}).format(pr.lastSeen.toDate())}` : 'غير متصل')); 
    const w = mk('div', 'gm-rb');
    btns.forEach(b => w.append(b));
    r.append(w);
    return r;
}
const btn = (t, cls, fn) => { const b = mk('button', cls, t); b.type = 'button'; b.onclick = async () => { setLoading(b, true); try {
    await fn();
    setLoading(b, false);
}
catch (e) {
    toast(errText(e), 'error');
    setLoading(b, false);
} }; return b; };
let rt = 0;
async function renderFriends() {
    const my = ++rt, inc = fr.filter(f => f.status === 'pending' && f.from !== user.uid), out = fr.filter(f => f.status === 'pending' && f.from === user.uid), ok = fr.filter(f => f.status === 'accepted');
    const fill = async (id, list, mkBtns, empty) => { const box = $(id), rows = await Promise.all(list.map(f => row(f, mkBtns(f)))); if (my !== rt)
        return; box.replaceChildren(); if (!rows.length)
        box.append(mk('p', 'muted', empty)); rows.forEach(r => box.append(r)); };
    $('gmReqN').textContent = inc.length ? inc.length : '';
    $('gmReqN').hidden = !inc.length;
    await Promise.all([
        fill('gmInc', inc, f => [btn('قبول', '', () => acceptRequest(f.id)), btn('رفض', 'secondary', () => removeFriendship(f.id))], 'مفيش طلبات جديدة.'),
        fill('gmOut', out, f => [btn('إلغاء', 'secondary', () => removeFriendship(f.id))], 'مفيش طلبات مبعوتة.'),
        fill('gmFr', ok, f => [btn('حذف', 'secondary', async () => { if (confirm('تحذف الصديق ده؟'))
                await removeFriendship(f.id);
            else
                throw { message: 'تم الإلغاء' }; })], 'لسه ماضفتش أصدقاء. ابعت طلب بالـ Username.')
    ]);
}
$('gmAddForm').onsubmit = async (e) => {
    e.preventDefault();
    if (!profile)
        return promptUsername(user.uid, { mandatory: true });
    const v = $('gmAdd').value.trim();
    if (!v)
        return;
    const b = $('gmAddBtn');
    setLoading(b, true);
    $('gmAddErr').textContent = '';
    try {
        const t = await sendRequest(user.uid, v, fr);
        $('gmAdd').value = '';
        toast(t.accepted ? `انتوا أصحاب دلوقتي مع ${t.name} 🤝` : `طلب الصداقة اتبعت لـ ${t.name}`, 'success');
    }
    catch (err) {
        $('gmAddErr').textContent = errText(err);
    }
    setLoading(b, false);
};
$('gmRoomForm').onsubmit = e => { e.preventDefault(); const c = parseCode($('gmCode').value); if (c.length !== 6) {
    $('gmRoomErr').textContent = 'الكود لازم يكون 6 حروف/أرقام';
    return;
} location.href = 'room.html?c=' + c; };
function pickGame() {
    return new Promise(res => {
        const d = mk('dialog', 'gm-dlg'), h = mk('div', 'dialog-head'), x = mk('button', 'icon-btn', '✕');
        x.type = 'button';
        h.append(mk('h2', '', 'اختار اللعبة'), x);
        d.append(h);
        const done = v => { d.close(); d.remove(); res(v); };
        x.onclick = () => done(null);
        d.addEventListener('cancel', () => done(null));
        GAMES.filter(hasOnline).forEach(g => { const b = mk('button', 'secondary gm-pb', `${g.icon}  ${g.t}`); b.type = 'button'; b.onclick = () => done(g); d.append(b); });
        document.body.append(d);
        d.showModal();
    });
}
$('gmNew').onclick = async (e) => {
    if (!profile)
        return promptUsername(user.uid, { mandatory: true });
    const g = await pickGame();
    if (!g)
        return;
    const b = e.currentTarget;
    try {
        const n = await ensureGameName(user.uid, g.id, names);
        if (!n)
            return;
        setLoading(b, true);
        const c = await createRoom(user.uid, g.id, g.max || 2, n);
        location.href = 'room.html?c=' + c;
    }
    catch (err) {
        toast(errText(err), 'error');
        setLoading(b, false);
    }
};
renderGames();
startShell({
    onUser: u => {
        user = u;
        const er = e => toast(errMsg(e), 'error');
        watchProfile(u.uid, p => { profile = p; renderProfile(); if (!p && !prompted) {
            prompted = true;
            promptUsername(u.uid, { mandatory: true });
        } }, er);
        watchFriendships(u.uid, l => { fr = l; renderFriends();
            const ids = new Set(l.filter(f => f.status === 'accepted').flatMap(f => f.users.filter(x => x !== u.uid)));
            for (const [id, off] of presenceOff) if (!ids.has(id)) { off(); presenceOff.delete(id); delete presence[id]; }
            for (const id of ids) if (!presenceOff.has(id)) presenceOff.set(id, watchPresence(id, p => { presence[id] = p; renderFriends(); }, er));
        }, er);
        watchGameInvites(u.uid, l => { invites = l; renderInvites(); }, er);
        watchGameHistory(u.uid, l => { history = l; renderHistory(); }, er);
        const ping = () => writePresence(u.uid, { online: !document.hidden, page: 'games', game: '' }).catch(() => {});
        ping(); document.addEventListener('visibilitychange', ping); window.addEventListener('pagehide', () => writePresence(u.uid, { online: false, page: 'games', game: '' }).catch(() => {}));
        window.setInterval(() => { if (!document.hidden) ping(); }, 60000);
        watchGameNames(u.uid, m => { names = m; renderGames(); }, er);
    },
    onTasks: () => { }
});

