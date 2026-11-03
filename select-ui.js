/* YOMAK — unified custom select menus. Keeps the original select as the source of truth. */
(() => {
    const mobile = () => matchMedia('(max-width:760px)').matches;
    const getVal = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value');
    let current = null;
    const closeAll = () => { if (!current)
        return; current.dd.classList.remove('open', 'up'); current.btn.setAttribute('aria-expanded', 'false'); current = null; };
    document.addEventListener('pointerdown', e => { if (current && !current.dd.contains(e.target))
        closeAll(); });
    window.addEventListener('resize', closeAll);
    function enhance(sel) {
        // Avoid double-enhancing a select if this script is ever loaded twice.
        if (sel.dataset.yomakSelectReady === '1')
            return;
        sel.dataset.yomakSelectReady = '1';
        const dd = document.createElement('div');
        dd.className = 'dd';
        sel.before(dd);
        dd.append(sel);
        sel.hidden = true;
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'dd-btn';
        btn.setAttribute('role', 'combobox');
        btn.setAttribute('aria-haspopup', 'listbox');
        btn.setAttribute('aria-expanded', 'false');
        btn.innerHTML = '<i class="dd-dot"></i><span class="dd-text"></span>';
        const txt = btn.querySelector('.dd-text');
        const list = document.createElement('div');
        list.className = 'dd-list';
        list.setAttribute('role', 'listbox');
        const back = document.createElement('div');
        back.className = 'dd-backdrop';
        back.onclick = closeAll;
        dd.append(btn, back, list);
        let act = sel.selectedIndex;
        const items = () => [...list.querySelectorAll(':scope > .dd-opt')];
        function mark(i) {
            const all = items();
            if (!all.length) {
                act = -1;
                return;
            }
            act = Math.max(0, Math.min(i, all.length - 1));
            all.forEach((it, k) => it.classList.toggle('act', k === act));
        }
        function sync() {
            const o = sel.options[sel.selectedIndex];
            txt.textContent = o ? o.textContent : '';
            btn.dataset.v = o ? o.value : '';
            btn.disabled = sel.disabled;
            btn.setAttribute('aria-label', sel.getAttribute('aria-label') || sel.labels?.[0]?.textContent?.trim() || o?.textContent || 'اختيار');
            items().forEach((it, k) => {
                const option = sel.options[k];
                const on = !!option && k === sel.selectedIndex;
                it.classList.toggle('sel', on);
                it.setAttribute('aria-selected', String(on));
                it.classList.toggle('disabled', !option || option.disabled || option.parentElement?.disabled || sel.disabled);
                it.setAttribute('aria-disabled', String(!option || option.disabled || option.parentElement?.disabled || sel.disabled));
            });
            if (sel.disabled)
                closeAll();
        }
        function rebuild() {
            const previous = sel.selectedIndex;
            const frag = document.createDocumentFragment();
            [...sel.options].forEach((o, i) => {
                const it = document.createElement('div');
                it.className = 'dd-opt';
                it.setAttribute('role', 'option');
                it.dataset.index = String(i);
                it.dataset.v = o.value;
                const dot = document.createElement('i');
                dot.className = 'dd-dot';
                const label = document.createElement('span');
                label.textContent = o.textContent;
                const check = document.createElement('i');
                check.className = 'dd-check';
                it.append(dot, label, check);
                it.addEventListener('click', () => { if (o.disabled || o.parentElement?.disabled || sel.disabled)
                    return; choose(Number(it.dataset.index)); });
                it.addEventListener('pointermove', () => { if (!o.disabled)
                    mark(i); });
                frag.append(it);
            });
            list.replaceChildren(frag);
            mark(previous >= 0 ? previous : 0);
            sync();
        }
        function choose(i) {
            const o = sel.options[i];
            if (!o || o.disabled || o.parentElement?.disabled || sel.disabled)
                return;
            sel.selectedIndex = i;
            sel.dispatchEvent(new Event('input', { bubbles: true }));
            sel.dispatchEvent(new Event('change', { bubbles: true }));
            sync();
            closeAll();
            btn.focus();
        }
        function openMenu() {
            if (sel.disabled)
                return;
            closeAll();
            dd.classList.add('open');
            btn.setAttribute('aria-expanded', 'true');
            current = { dd, btn };
            mark(sel.selectedIndex >= 0 ? sel.selectedIndex : 0);
            if (!mobile()) {
                const r = btn.getBoundingClientRect(), h = list.offsetHeight, box = dd.closest('dialog')?.getBoundingClientRect(), lo = box ? box.bottom : innerHeight, hi = box ? box.top : 0;
                dd.classList.toggle('up', lo - r.bottom < h + 16 && r.top - hi > h + 16);
            }
            items()[Math.max(0, sel.selectedIndex)]?.scrollIntoView({ block: 'nearest' });
        }
        btn.addEventListener('click', () => dd.classList.contains('open') ? closeAll() : openMenu());
        btn.addEventListener('keydown', e => {
            const open = dd.classList.contains('open'), all = items(), n = all.length;
            const nextEnabled = (from, step) => { if (!n)
                return -1; for (let j = 1; j <= n; j++) {
                const k = (from + step * j + n) % n;
                if (!all[k].classList.contains('disabled'))
                    return k;
            } return from; };
            if (['ArrowDown', 'ArrowUp'].includes(e.key)) {
                e.preventDefault();
                if (!open) {
                    openMenu();
                    return;
                }
                mark(nextEnabled(act, e.key === 'ArrowDown' ? 1 : -1));
                items()[act]?.scrollIntoView({ block: 'nearest' });
            }
            else if (e.key === 'Home' || e.key === 'End') {
                if (open) {
                    e.preventDefault();
                    mark(e.key === 'Home' ? 0 : n - 1);
                }
            }
            else if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                open ? choose(act) : openMenu();
            }
            else if (e.key === 'Escape' && open) {
                e.preventDefault();
                e.stopPropagation();
                closeAll();
            }
            else if (e.key === 'Tab')
                closeAll();
        });
        // Keep the visual menu aligned with dynamic option lists (e.g. notes and reciters).
        const observer = new MutationObserver(() => { const wasOpen = dd.classList.contains('open'); rebuild(); if (wasOpen) {
            dd.classList.add('open');
            btn.setAttribute('aria-expanded', 'true');
            current = { dd, btn };
        } });
        observer.observe(sel, { childList: true, subtree: true, attributes: true, attributeFilter: ['disabled', 'label', 'selected', 'value'] });
        Object.defineProperty(sel, 'value', { get() { return getVal.get.call(sel); }, set(v) { getVal.set.call(sel, v); sync(); }, configurable: true });
        sel.form?.addEventListener('reset', () => setTimeout(sync));
        rebuild();
    }
    // Enhance every <select> now, and any select a page renders later (games build their UI from JS).
    const scan = r => { (r.matches?.('select') ? [r] : []).concat([...(r.querySelectorAll?.('select') || [])]).forEach(enhance); };
    scan(document);
    new MutationObserver(ms => ms.forEach(m => m.addedNodes.forEach(n => { if (n.nodeType === 1 && !n.closest?.('.dd'))
        scan(n); }))).observe(document.documentElement, { childList: true, subtree: true });
})();

