import { mk } from './islamic.js';
import { ADHAN, IQAMA, AFTER } from './adhan-data.js';
const $ = id => document.getElementById(id);
let tab = 'adhan', resp = true;
function render() {
    const box = $('adList');
    box.replaceChildren();
    for (const l of tab === 'adhan' ? ADHAN : IQAMA) {
        const row = mk('div', 'ad-line');
        row.append(mk('div', 'ad-t', l.t));
        if (resp)
            row.append(mk('div', 'ad-r', '↩ ' + l.r));
        box.append(row);
    }
    if (tab === 'adhan' && resp) {
        const d = mk('div', 'ad-after');
        d.append(mk('b', '', 'بعد الأذان:'));
        AFTER.forEach(t => d.append(mk('p', '', t)));
        box.append(d);
    }
    document.querySelectorAll('#adTabs button').forEach(b => { b.classList.toggle('on', b.dataset.t === tab); b.setAttribute('aria-pressed', b.dataset.t === tab); });
    $('adResp').checked = resp;
}
document.querySelectorAll('#adTabs button').forEach(b => b.onclick = () => { tab = b.dataset.t; render(); });
$('adResp').onchange = e => { resp = e.target.checked; render(); };
render();

