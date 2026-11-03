// التجويد: جدول الأحكام والألوان + محلّل نص Quran.com (uthmani_tajweed)
// النص بيجي بوسوم من نوع <tajweed class="madda_necessary">…</tajweed> — بنحوّلها لأجزاء {t:نص, c:اسم الحكم}
export const GROUPS = ['المدود', 'النون الساكنة والتنوين', 'الميم الساكنة', 'القلقلة والغنة', 'أحرف لا تُنطق', 'الإدغام الكبير والمتماثل'];
// k = اسم الحكم في البيانات، alias = أسماء بديلة محتملة
export const RULES = [
    { k: 'madda_normal', g: 0, name: 'مد طبيعي', color: '#537FFF', desc: 'مدّ حركتين: ألف أو واو أو ياء مدّية ليس بعدها همز ولا سكون.', ex: 'قَالَ' },
    { k: 'madda_necessary', g: 0, name: 'مد واجب (المد المتصل)', color: '#000EBC', desc: 'همزة بعد حرف المد في نفس الكلمة. يُمدّ 4 أو 5 حركات.', ex: 'جَآءَ' },
    { k: 'madda_permissible', g: 0, name: 'مد جائز (منفصل / عارض للسكون)', color: '#4050FF', desc: 'المنفصل: همزة في أول الكلمة التالية، والعارض للسكون عند الوقف. من 2 إلى 6 حركات.', ex: 'بِمَآ أُنزِلَ' },
    { k: 'madda_obligatory', g: 0, name: 'مد لازم', color: '#2144C1', desc: 'سكون أصلي بعد حرف المد. يُمدّ 6 حركات.', ex: 'ٱلضَّآلِّينَ' },
    { k: 'ikhfa', alias: ['ikhafa'], g: 1, name: 'إخفاء', color: '#9400A8', desc: 'النون الساكنة أو التنوين قبل أحد 15 حرفًا، تُنطق بين الإظهار والإدغام مع غنة.', ex: 'مَن كَانَ' },
    { k: 'iqlab', g: 1, name: 'إقلاب', color: '#26BFFD', desc: 'النون الساكنة أو التنوين قبل الباء: تُقلب ميمًا مخفاة بغنة.', ex: 'مِن بَعْدِ' },
    { k: 'idgham_ghunnah', alias: ['idghaam_ghunnah'], g: 1, name: 'إدغام بغنة', color: '#169777', desc: 'النون الساكنة أو التنوين قبل حروف «ينمو» (ي ن م و) مع غنة.', ex: 'مَن يَقُولُ' },
    { k: 'idgham_wo_ghunnah', alias: ['idgham_without_ghunnah', 'idghaam_wo_ghunnah'], g: 1, name: 'إدغام بلا غنة', color: '#169200', desc: 'النون الساكنة أو التنوين قبل اللام أو الراء، بدون غنة.', ex: 'مِن رَّبِّهِمْ' },
    { k: 'ikhfa_shafawi', alias: ['ikhafa_shafawi'], g: 2, name: 'إخفاء شفوي', color: '#D500B7', desc: 'الميم الساكنة قبل الباء: تُخفى بغنة.', ex: 'تَرْمِيهِم بِحِجَارَةٍ' },
    { k: 'idgham_shafawi', alias: ['idghaam_shafawi'], g: 2, name: 'إدغام شفوي', color: '#58B800', desc: 'الميم الساكنة قبل ميم: تُدغم بغنة.', ex: 'لَهُم مَّا' },
    { k: 'qalaqah', alias: ['qlq', 'qalqalah'], g: 3, name: 'قلقلة', color: '#DD0008', desc: 'اهتزاز الصوت عند سكون أحد حروف «قطب جد» (ق ط ب ج د).', ex: 'يَقْطَعُونَ' },
    { k: 'ghunnah', g: 3, name: 'غنة', color: '#FF7E1E', desc: 'النون أو الميم المشددة: غنة بمقدار حركتين.', ex: 'إِنَّ' },
    { k: 'ham_wasl', alias: ['hamzat_wasl'], g: 4, name: 'همزة الوصل', color: '#AAAAAA', desc: 'تُنطق في بدء الكلام وتسقط في وصله.', ex: 'ٱلْحَمْدُ' },
    { k: 'laam_shamsiyah', alias: ['lam_shamsiyyah', 'laam_shamsiyyah'], g: 4, name: 'لام شمسية', color: '#AAAAAA', desc: 'لام «ال» التي لا تُنطق، ويُشدَّد الحرف الشمسي بعدها.', ex: 'ٱلشَّمْسُ' },
    { k: 'slnt', alias: ['silent'], g: 4, name: 'حرف لا يُنطق', color: '#AAAAAA', desc: 'حرف يُكتب في المصحف ولا يُنطق.', ex: '' },
    { k: 'idgham_mutajanisayn', alias: ['idghaam_mutajanisayn'], g: 5, name: 'إدغام متجانسين', color: '#A1A1A1', desc: 'حرفان متفقان في المخرج مختلفان في الصفة، أولهما ساكن.', ex: 'قَد تَّبَيَّنَ' },
    { k: 'idgham_mutaqaribain', alias: ['idgham_mutaqaribayn', 'idghaam_mutaqaribain'], g: 5, name: 'إدغام متقاربين', color: '#A1A1A1', desc: 'حرفان متقاربان في المخرج أو الصفة، أولهما ساكن.', ex: 'أَلَمْ نَخْلُقكُّم' }
];
const BY = new Map();
for (const r of RULES) {
    BY.set(r.k, r);
    for (const a of r.alias || [])
        BY.set(a, r);
}
export const ruleOf = c => BY.get(String(c || '').toLowerCase().replace(/-/g, '_')) || null;
const ENT = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&nbsp;': ' ' };
const dec = s => s.replace(/&(amp|lt|gt|quot|nbsp|#39);/g, m => ENT[m]);
// html → [{t,c}] ؛ بنتجاهل علامة نهاية الآية (<span class=end>) لأن القارئ بيرسم رقم الآية بنفسه
export function parse(html) {
    const segs = [], re = /<(\/?)([a-zA-Z]+)([^>]*)>|([^<]+)/g;
    let m, cur = null, inEnd = false;
    while ((m = re.exec(html || ''))) {
        if (m[4] !== undefined) {
            if (!inEnd && m[4])
                segs.push({ t: dec(m[4]), c: cur });
            continue;
        }
        const close = !!m[1], tag = m[2].toLowerCase(), attrs = m[3] || '';
        if (tag === 'tajweed') {
            if (close)
                cur = null;
            else {
                const c = /class\s*=\s*["']?([\w-]+)/.exec(attrs);
                cur = c ? c[1] : null;
            }
        }
        else if (tag === 'span') {
            if (close) {
                inEnd = false;
            }
            else if (/class\s*=\s*["']?end\b/.test(attrs))
                inEnd = true;
        }
    }
    // دمج الأجزاء المتجاورة ذات نفس الحكم
    const out = [];
    for (const s of segs) {
        const l = out[out.length - 1];
        if (l && l.c === s.c)
            l.t += s.t;
        else
            out.push({ ...s });
    }
    return out;
}
export const plain = segs => segs.map(s => s.t).join('');
// حذف أول n كلمات (لفصل البسملة عن أول آية)
export function dropWords(segs, n) {
    let seen = 0, inWord = false;
    const out = [];
    let done = false;
    for (const s of segs) {
        if (done) {
            out.push(s);
            continue;
        }
        let cut = -1;
        for (let i = 0; i < s.t.length; i++) {
            if (/\s/.test(s.t[i])) {
                if (inWord) {
                    inWord = false;
                    if (++seen === n) {
                        cut = i + 1;
                        break;
                    }
                }
            }
            else
                inWord = true;
        }
        if (cut >= 0) {
            done = true;
            const rest = s.t.slice(cut);
            if (rest)
                out.push({ t: rest, c: s.c });
        }
    }
    return out;
}

