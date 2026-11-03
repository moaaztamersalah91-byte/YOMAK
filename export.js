// تصدير موحّد: PDF وExcel وCSV — لأي جدول بيانات في التطبيق
// الاستخدام: openExportMenu(anchorEl,()=>({title,filename,columns:['العمود1',...],rows:[[...],...],summary:[['الإجمالي','100'],...]}))
// الدالة الثانية بترجّع البيانات وقت الضغط (فبتصدّر دايمًا أحدث حالة)، أو null لو مفيش بيانات.
import { toast } from './ui.js';
const CDN = {
    xlsx: 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
    jspdf: 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
    h2c: 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js'
};
const loaded = {};
const loadScript = url => loaded[url] || (loaded[url] = new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = url;
    s.async = true;
    s.onload = () => res();
    s.onerror = () => { delete loaded[url]; rej(new Error('تعذّر تحميل مكتبة التصدير — تأكد من الاتصال بالإنترنت')); };
    document.head.append(s);
}));
const save = (blob, name) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1500);
};
const safe = n => String(n || 'export').replace(/[\\/:*?"<>|]+/g, '-').trim() || 'export';
/* ---------- CSV ---------- */
// محمي من حقن الصيغ: أي نص بيبدأ بـ = + - @ أو Tab/CR بنحط قدامه '
const csvCell = v => {
    if (v == null)
        return '""';
    const isNum = typeof v === 'number' && isFinite(v);
    v = String(v);
    if (!isNum && /^[=+\-@\t\r]/.test(v))
        v = "'" + v;
    return `"${v.replace(/"/g, '""')}"`;
};
export function toCSV({ columns, rows }) {
    return '﻿' + [columns, ...rows].map(r => r.map(csvCell).join(',')).join('\r\n');
}
export function exportCSV(d) {
    save(new Blob([toCSV(d)], { type: 'text/csv;charset=utf-8' }), safe(d.filename) + '.csv');
}
/* ---------- Excel ---------- */
export async function exportXLSX(d) {
    await loadScript(CDN.xlsx);
    const X = window.XLSX;
    // نصوص بتفضل نصوص (مش صيغ) فمفيش حقن، والأرقام بتفضل أرقام
    const aoa = [d.columns, ...d.rows];
    if (d.summary && d.summary.length)
        aoa.push([], ...d.summary.map(([k, v]) => [k, v]));
    const ws = X.utils.aoa_to_sheet(aoa);
    const all = [d.columns, ...d.rows];
    ws['!cols'] = d.columns.map((_, i) => ({ wch: Math.min(40, Math.max(10, ...all.map(r => String(r[i] ?? '').length + 2))) }));
    const wb = X.utils.book_new();
    wb.Workbook = { Views: [{ RTL: true }] };
    X.utils.book_append_sheet(wb, ws, safe(d.sheet || d.title).replace(/[\[\]]/g, '').slice(0, 31) || 'Sheet1');
    const out = X.write(wb, { bookType: 'xlsx', type: 'array' });
    save(new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), safe(d.filename) + '.xlsx');
}
/* ---------- PDF ---------- */
// الخط العربي مش بيتشكّل صح جوه jsPDF، فبنرسم الصفحات HTML (بنفس خط الموقع) ونحوّلها لصور داخل PDF
const ROWS_PER_PAGE = 26;
const el = (t, css, txt) => { const e = document.createElement(t); if (css)
    e.style.cssText = css; if (txt != null)
    e.textContent = txt; return e; };
function buildPage(d, rows, pageNo, pages, first) {
    const W = 794, H = 1123; // A4 @96dpi
    const p = el('div', `width:${W}px;height:${H}px;box-sizing:border-box;padding:48px 44px;background:#fff;color:#16302c;direction:rtl;font-family:'IBM Plex Sans Arabic',Tahoma,sans-serif;position:relative;overflow:hidden`);
    const head = el('div', 'display:flex;justify-content:space-between;align-items:flex-end;border-bottom:3px solid #04796c;padding-bottom:12px;margin-bottom:18px');
    const l = el('div');
    l.append(el('div', 'font-size:24px;font-weight:700;color:#04796c', d.title));
    if (d.subtitle)
        l.append(el('div', 'font-size:13px;color:#5b6f6b;margin-top:4px', d.subtitle));
    head.append(l, el('div', 'font-size:20px;font-weight:700;color:#04796c;letter-spacing:1px', 'YOMAK'));
    p.append(head);
    if (first && d.summary && d.summary.length) {
        const box = el('div', 'display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px');
        for (const [k, v] of d.summary) {
            const c = el('div', 'flex:1 1 120px;background:#eef6f4;border-radius:10px;padding:10px 12px');
            c.append(el('div', 'font-size:12px;color:#5b6f6b', k), el('div', 'font-size:16px;font-weight:700;margin-top:2px', String(v)));
            box.append(c);
        }
        p.append(box);
    }
    const tb = el('table', 'width:100%;border-collapse:collapse;font-size:13px;table-layout:auto');
    const tr = el('tr');
    for (const c of d.columns)
        tr.append(el('th', 'background:#04796c;color:#fff;padding:8px 10px;text-align:right;font-weight:600', c));
    const thead = el('thead');
    thead.append(tr);
    tb.append(thead);
    const body = el('tbody');
    rows.forEach((r, i) => {
        const row = el('tr', i % 2 ? 'background:#f5faf9' : '');
        r.forEach(v => row.append(el('td', 'padding:7px 10px;border-bottom:1px solid #e3eeeb;text-align:right;vertical-align:top;word-break:break-word', v == null ? '' : String(v))));
        body.append(row);
    });
    tb.append(body);
    p.append(tb);
    p.append(el('div', 'position:absolute;bottom:22px;left:44px;right:44px;display:flex;justify-content:space-between;font-size:11px;color:#8a9a96', ''));
    const foot = p.lastChild;
    foot.append(el('span', '', new Date().toLocaleDateString('ar-EG-u-nu-latn', { year: 'numeric', month: 'long', day: 'numeric' })), el('span', '', `صفحة ${pageNo} من ${pages}`));
    return p;
}
export async function exportPDF(d) {
    await Promise.all([loadScript(CDN.jspdf), loadScript(CDN.h2c)]);
    if (document.fonts && document.fonts.ready)
        await document.fonts.ready;
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait', compress: true });
    const chunks = [];
    for (let i = 0; i < d.rows.length; i += ROWS_PER_PAGE)
        chunks.push(d.rows.slice(i, i + ROWS_PER_PAGE));
    if (!chunks.length)
        chunks.push([]);
    const stage = el('div', 'position:fixed;left:-10000px;top:0;pointer-events:none');
    document.body.append(stage);
    try {
        for (let i = 0; i < chunks.length; i++) {
            const page = buildPage(d, chunks[i], i + 1, chunks.length, i === 0);
            stage.replaceChildren(page);
            const canvas = await window.html2canvas(page, { scale: 2, backgroundColor: '#ffffff', useCORS: true, logging: false });
            if (i)
                pdf.addPage();
            pdf.addImage(canvas.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, 210, 297, undefined, 'FAST');
        }
    }
    finally {
        stage.remove();
    }
    pdf.save(safe(d.filename) + '.pdf');
}
/* ---------- القائمة ---------- */
const FORMATS = [
    ['pdf', '📄', 'PDF', 'ملف جاهز للطباعة والمشاركة', exportPDF],
    ['xlsx', '📊', 'Excel', 'جدول .xlsx يتفتح في Excel وGoogle Sheets', exportXLSX],
    ['csv', '🧾', 'CSV', 'نص بسيط للاستيراد في أي برنامج', async (d) => exportCSV(d)]
];
let openMenu = null;
const closeMenu = () => { if (openMenu) {
    openMenu.remove();
    openMenu = null;
    document.removeEventListener('pointerdown', onOut, true);
    document.removeEventListener('keydown', onKey, true);
} };
const onOut = e => { if (openMenu && !openMenu.contains(e.target) && !openMenu._anchor.contains(e.target))
    closeMenu(); };
const onKey = e => { if (e.key === 'Escape') {
    const a = openMenu && openMenu._anchor;
    closeMenu();
    a && a.focus();
} };
export function openExportMenu(anchor, getData) {
    if (openMenu) {
        closeMenu();
        return;
    }
    const m = el('div');
    m.className = 'export-menu';
    m.setAttribute('role', 'menu');
    m._anchor = anchor;
    for (const [key, ico, name, desc, fn] of FORMATS) {
        const b = el('button');
        b.type = 'button';
        b.className = 'export-item';
        b.setAttribute('role', 'menuitem');
        b.dataset.fmt = key;
        b.append(el('span', '', ico), (() => { const s = el('span'); s.append(el('b', '', name), el('small', '', desc)); return s; })());
        b.onclick = async () => {
            const d = getData();
            if (!d || !d.rows || !d.rows.length) {
                closeMenu();
                toast('مفيش بيانات للتصدير', 'info');
                return;
            }
            b.disabled = true;
            b.classList.add('busy');
            try {
                await fn(d);
                toast(`تم تصدير ملف ${name}`, 'success');
            }
            catch (err) {
                console.error(err);
                toast(err.message || 'فشل التصدير', 'error');
            }
            closeMenu();
        };
        m.append(b);
    }
    document.body.append(m);
    openMenu = m;
    const r = anchor.getBoundingClientRect(), w = m.offsetWidth;
    const left = Math.max(8, Math.min(innerWidth - w - 8, r.right - w));
    m.style.top = Math.min(r.bottom + 6, innerHeight - m.offsetHeight - 8) + 'px';
    m.style.left = left + 'px';
    document.addEventListener('pointerdown', onOut, true);
    document.addEventListener('keydown', onKey, true);
    m.querySelector('button').focus();
}

