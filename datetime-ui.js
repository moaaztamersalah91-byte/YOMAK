/* YOMAK — custom date & time pickers (progressive enhancement over native inputs) */
(() => {
    const LOC = 'ar-EG-u-nu-latn';
    const mobile = () => matchMedia('(max-width:760px)').matches;
    const pad = n => String(n).padStart(2, '0');
    const ymd = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    const parseD = s => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || ''); return m ? new Date(+m[1], m[2] - 1, +m[3]) : null; };
    const parseT = s => { const m = /^(\d{1,2}):(\d{2})/.exec(s || ''); return m ? { h: +m[1], m: +m[2] } : null; };
    const t12 = ({ h, m }) => `${(h % 12) || 12}:${pad(m)} ${h < 12 ? 'ص' : 'م'}`;
    const startOfToday = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
    const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
    const desc = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
    let cur = null;
    const closeAll = () => { if (!cur)
        return; cur.dd.classList.remove('open'); cur.btn.setAttribute('aria-expanded', 'false'); cur.list.style.cssText = ''; cur = null; };
    document.addEventListener('pointerdown', e => { if (cur && !cur.dd.contains(e.target))
        closeAll(); });
    addEventListener('resize', closeAll);
    addEventListener('scroll', e => { if (cur && !cur.list.contains(e.target))
        closeAll(); }, true);
    function shell(inp, kind) {
        const dd = document.createElement('div');
        dd.className = 'dd';
        inp.before(dd);
        dd.append(inp);
        inp.hidden = true;
        inp.required = false;
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'dd-btn dd-' + kind;
        btn.setAttribute('aria-haspopup', 'dialog');
        btn.setAttribute('aria-expanded', 'false');
        const txt = document.createElement('span');
        txt.className = 'dd-text';
        btn.append(txt);
        const list = document.createElement('div');
        list.className = 'dd-list pk';
        list.setAttribute('role', 'dialog');
        const back = document.createElement('div');
        back.className = 'dd-backdrop';
        back.onclick = closeAll;
        dd.append(btn, back, list);
        const emit = () => { inp.dispatchEvent(new Event('input', { bubbles: true })); inp.dispatchEvent(new Event('change', { bubbles: true })); };
        const place = () => {
            if (mobile())
                return;
            const r = btn.getBoundingClientRect(), w = list.offsetWidth, h = list.offsetHeight, vw = innerWidth, vh = innerHeight;
            const below = vh - r.bottom - 12, above = r.top - 12;
            let top = below >= h ? r.bottom + 8 : above >= h ? r.top - 8 - h : Math.max(8, (vh - h) / 2);
            let left = Math.min(Math.max(8, r.right - w), vw - w - 8);
            Object.assign(list.style, { position: 'fixed', top: top + 'px', left: left + 'px', right: 'auto', bottom: 'auto', insetInlineStart: 'auto' });
        };
        const open = build => { closeAll(); build(); dd.classList.add('open'); btn.setAttribute('aria-expanded', 'true'); cur = { dd, btn, list }; place(); };
        dd.addEventListener('keydown', e => { if (e.key === 'Escape' && dd.classList.contains('open')) {
            e.preventDefault();
            e.stopPropagation();
            closeAll();
            btn.focus();
        } });
        inp.form?.addEventListener('reset', () => setTimeout(() => inp.dispatchEvent(new Event('yomak-sync'))));
        return { dd, btn, txt, list, emit, open };
    }
    const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls)
        e.className = cls; if (text != null)
        e.textContent = text; return e; };
    const btn = (cls, text, fn, label) => { const b = el('button', cls, text); b.type = 'button'; b.onclick = fn; if (label)
        b.setAttribute('aria-label', label); return b; };
    /* ---------------- date ---------------- */
    function initDate(inp) {
        const s = shell(inp, 'date');
        let view = null;
        const sync = () => {
            const d = parseD(inp.value), t = startOfToday();
            if (!d) {
                s.txt.textContent = 'اختر التاريخ';
                s.btn.classList.add('empty');
                return;
            }
            s.btn.classList.remove('empty');
            const diff = Math.round((d - t) / 864e5);
            const base = new Intl.DateTimeFormat(LOC, { weekday: 'long', day: 'numeric', month: 'long', ...(d.getFullYear() !== t.getFullYear() ? { year: 'numeric' } : {}) }).format(d);
            s.txt.textContent = (diff === 0 ? 'اليوم، ' : diff === 1 ? 'غدًا، ' : diff === -1 ? 'أمس، ' : '') + base;
        };
        const pick = d => { desc.set.call(inp, ymd(d)); sync(); s.emit(); closeAll(); s.btn.focus(); };
        function render() {
            const sel = parseD(inp.value), today = startOfToday(), body = el('div', 'pk-body');
            const head = el('div', 'pk-head');
            head.append(btn('pk-nav prev', '', () => { view = new Date(view.getFullYear(), view.getMonth() - 1, 1); render(); }, 'الشهر السابق'), el('strong', 'pk-title', new Intl.DateTimeFormat(LOC, { month: 'long', year: 'numeric' }).format(view)), btn('pk-nav next', '', () => { view = new Date(view.getFullYear(), view.getMonth() + 1, 1); render(); }, 'الشهر التالي'));
            const week = el('div', 'pk-week');
            ['س', 'ح', 'ن', 'ث', 'ر', 'خ', 'ج'].forEach(w => week.append(el('span', '', w)));
            const grid = el('div', 'pk-grid');
            const first = new Date(view.getFullYear(), view.getMonth(), 1), offset = (first.getDay() + 1) % 7, start = addDays(first, -offset);
            for (let i = 0; i < 42; i++) {
                const d = addDays(start, i);
                const b = btn('pk-day' + (d.getMonth() !== view.getMonth() ? ' out' : '') + (+d === +today ? ' today' : '') + (sel && +d === +sel ? ' sel' : ''), String(d.getDate()), () => pick(d), new Intl.DateTimeFormat(LOC, { dateStyle: 'full' }).format(d));
                grid.append(b);
            }
            const quick = el('div', 'pk-quick');
            [['اليوم', 0], ['غدًا', 1], ['بعد أسبوع', 7]].forEach(([t, n]) => quick.append(btn('pk-chip', t, () => pick(addDays(today, n)))));
            body.append(head, week, grid, quick);
            list.replaceChildren(body);
        }
        const list = s.list;
        s.btn.addEventListener('click', () => s.dd.classList.contains('open') ? closeAll() : s.open(() => { const d = parseD(inp.value) || startOfToday(); view = new Date(d.getFullYear(), d.getMonth(), 1); render(); }));
        Object.defineProperty(inp, 'value', { get() { return desc.get.call(inp); }, set(v) { desc.set.call(inp, v); sync(); }, configurable: true });
        inp.addEventListener('yomak-sync', sync);
        sync();
    }
    /* ---------------- time ---------------- */
    function initTime(inp) {
        const s = shell(inp, 'time'), list = s.list;
        const sync = () => { const t = parseT(inp.value); s.txt.textContent = t ? t12(t) : 'بدون وقت'; s.btn.classList.toggle('empty', !t); };
        const state = () => { const t = parseT(inp.value) || { h: 9, m: 0 }; return { h12: (t.h % 12) || 12, m: t.m, pm: t.h >= 12 }; };
        const commit = ({ h12, m, pm }) => { const h = (h12 % 12) + (pm ? 12 : 0); desc.set.call(inp, `${pad(h)}:${pad(m)}`); sync(); s.emit(); mark(); };
        let hours, mins, pers;
        function mark() {
            const st = state(), has = !!parseT(inp.value);
            hours.forEach((b, i) => b.classList.toggle('sel', has && i + 1 === st.h12));
            mins.forEach(b => b.classList.toggle('sel', has && +b.dataset.m === st.m));
            pers.forEach((b, i) => b.classList.toggle('sel', has && (i === 1) === st.pm));
        }
        function build() {
            const body = el('div', 'pk-body'), cols = el('div', 'pk-time');
            const cm = parseT(inp.value)?.m;
            const mv = [...Array(12).keys()].map(i => i * 5);
            if (cm != null && !mv.includes(cm)) {
                mv.push(cm);
                mv.sort((a, b) => a - b);
            }
            hours = [...Array(12).keys()].map(i => btn('pk-cell', String(i + 1), () => commit({ ...state(), h12: i + 1 })));
            mins = mv.map(m => { const b = btn('pk-cell', pad(m), () => commit({ ...state(), m })); b.dataset.m = m; return b; });
            pers = ['ص', 'م'].map((t, i) => btn('pk-cell', t, () => commit({ ...state(), pm: i === 1 })));
            const col = (label, items, cls = '') => { const w = el('div', 'pk-colwrap ' + cls); w.append(el('small', '', label)); const c = el('div', 'pk-col'); c.append(...items); w.append(c); return w; };
            cols.append(col('الساعة', hours), col('الدقيقة', mins), col('الفترة', pers, 'per'));
            const quick = el('div', 'pk-quick');
            const setT = (h, m) => commit({ h12: (h % 12) || 12, m, pm: h >= 12 });
            quick.append(btn('pk-chip', 'الآن', () => { const n = new Date(); let m = Math.round(n.getMinutes() / 5) * 5, h = n.getHours(); if (m === 60) {
                m = 0;
                h = (h + 1) % 24;
            } setT(h, m); scroll(); }));
            [[9, 0], [13, 0], [18, 0]].forEach(([h, m]) => quick.append(btn('pk-chip', t12({ h, m }), () => { setT(h, m); scroll(); })));
            const foot = el('div', 'pk-foot');
            foot.append(btn('pk-ghost', 'بدون وقت', () => { desc.set.call(inp, ''); sync(); s.emit(); closeAll(); s.btn.focus(); }), btn('pk-ok', 'تم', () => { closeAll(); s.btn.focus(); }));
            body.append(cols, quick, foot);
            list.replaceChildren(body);
            mark();
        }
        function scroll() { [...list.querySelectorAll('.pk-col')].forEach(c => { const x = c.querySelector('.sel'); if (x)
            c.scrollTop = x.offsetTop - c.clientHeight / 2 + x.offsetHeight / 2; }); }
        s.btn.addEventListener('click', () => { if (s.dd.classList.contains('open'))
            return closeAll(); s.open(build); scroll(); });
        Object.defineProperty(inp, 'value', { get() { return desc.get.call(inp); }, set(v) { desc.set.call(inp, v); sync(); }, configurable: true });
        inp.addEventListener('yomak-sync', sync);
        sync();
    }
    /* ---------------- month & year ---------------- */
    const MONTHS = [...Array(12).keys()].map(i => new Intl.DateTimeFormat(LOC, { month: 'long' }).format(new Date(2024, i, 1)));
    function initMonth(inp) {
        const s = shell(inp, 'date'), list = s.list;
        let vy = null;
        const parseM = v => { const m = /^(\d{4})-(\d{2})$/.exec(v || ''); return m ? { y: +m[1], m: +m[2] - 1 } : null; };
        const sync = () => { const p = parseM(inp.value); s.txt.textContent = p ? MONTHS[p.m] + ' ' + p.y : 'اختر الشهر'; s.btn.classList.toggle('empty', !p); };
        const pick = (y, m) => { desc.set.call(inp, y + '-' + pad(m + 1)); sync(); s.emit(); closeAll(); s.btn.focus(); };
        function render() {
            const p = parseM(inp.value), n = new Date(), body = el('div', 'pk-body');
            const head = el('div', 'pk-head');
            head.append(btn('pk-nav prev', '', () => { vy--; render(); }, 'السنة السابقة'), el('strong', 'pk-title', String(vy)), btn('pk-nav next', '', () => { vy++; render(); }, 'السنة التالية'));
            const grid = el('div', 'pk-grid pk-months');
            MONTHS.forEach((t, i) => grid.append(btn('pk-cell' + (p && p.y === vy && p.m === i ? ' sel' : ''), t, () => pick(vy, i))));
            const quick = el('div', 'pk-quick');
            quick.append(btn('pk-chip', 'هذا الشهر', () => pick(n.getFullYear(), n.getMonth())));
            body.append(head, grid, quick);
            list.replaceChildren(body);
        }
        s.btn.addEventListener('click', () => s.dd.classList.contains('open') ? closeAll() : s.open(() => { vy = (parseM(inp.value) || { y: new Date().getFullYear() }).y; render(); }));
        Object.defineProperty(inp, 'value', { get() { return desc.get.call(inp); }, set(v) { desc.set.call(inp, v); sync(); }, configurable: true });
        inp.addEventListener('yomak-sync', sync);
        sync();
    }
    function initYear(inp) {
        const s = shell(inp, 'date'), list = s.list;
        let base = 0;
        const sync = () => { const y = parseInt(inp.value, 10); s.txt.textContent = y ? String(y) : 'اختر السنة'; s.btn.classList.toggle('empty', !y); };
        const pick = y => { desc.set.call(inp, String(y)); sync(); s.emit(); closeAll(); s.btn.focus(); };
        function render() {
            const cur = parseInt(inp.value, 10), ty = new Date().getFullYear(), body = el('div', 'pk-body'), head = el('div', 'pk-head');
            head.append(btn('pk-nav prev', '', () => { base -= 12; render(); }, 'السابق'), el('strong', 'pk-title', base + ' – ' + (base + 11)), btn('pk-nav next', '', () => { base += 12; render(); }, 'التالي'));
            const grid = el('div', 'pk-grid pk-months');
            for (let y = base; y < base + 12; y++)
                grid.append(btn('pk-cell' + (y === cur ? ' sel' : ''), String(y), () => pick(y)));
            const quick = el('div', 'pk-quick');
            quick.append(btn('pk-chip', 'هذه السنة', () => pick(ty)));
            body.append(head, grid, quick);
            list.replaceChildren(body);
        }
        s.btn.addEventListener('click', () => s.dd.classList.contains('open') ? closeAll() : s.open(() => { const y = parseInt(inp.value, 10) || new Date().getFullYear(); base = y - (y % 12); render(); }));
        Object.defineProperty(inp, 'value', { get() { return desc.get.call(inp); }, set(v) { desc.set.call(inp, v); sync(); }, configurable: true });
        inp.addEventListener('yomak-sync', sync);
        sync();
    }
    document.querySelectorAll('input[type=date]').forEach(initDate);
    document.querySelectorAll('input[type=time]').forEach(initTime);
    document.querySelectorAll('input[type=month]').forEach(initMonth);
    document.querySelectorAll('input[data-pick=year]').forEach(initYear);
})();

