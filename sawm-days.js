// التاريخ الهجري (أم القرى) + أيام الصيام المستحبة
const F = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn', { day: 'numeric', month: 'numeric', year: 'numeric' });
export const HM = ['محرم', 'صفر', 'ربيع الأول', 'ربيع الآخر', 'جمادى الأولى', 'جمادى الآخرة', 'رجب', 'شعبان', 'رمضان', 'شوال', 'ذو القعدة', 'ذو الحجة'];
export function hijri(d) { const p = F.formatToParts(d), g = t => +p.find(x => x.type === t).value; return { d: g('day'), m: g('month'), y: g('year') }; }
export const hijriStr = d => { const h = hijri(d); return `${h.d.toLocaleString('ar-EG')} ${HM[h.m - 1]} ${h.y.toLocaleString('ar-EG', { useGrouping: false })} هـ`; };
/** {ramadan, forbidden, reasons[]} ليوم ميلادي */
export function fastInfo(date) {
    const h = hijri(date), wd = date.getDay(), r = [];
    if (h.m === 9)
        return { ramadan: true, forbidden: false, reasons: ['رمضان (فرض)'] };
    if ((h.m === 10 && h.d === 1) || (h.m === 12 && h.d >= 10 && h.d <= 13))
        return { ramadan: false, forbidden: true, reasons: ['يوم عيد/تشريق — لا يُصام'] };
    if (h.m === 12 && h.d === 9)
        r.push('يوم عرفة');
    if (h.m === 1 && h.d === 10)
        r.push('يوم عاشوراء');
    if (h.m === 1 && h.d === 9)
        r.push('تاسوعاء');
    if (h.d >= 13 && h.d <= 15)
        r.push('من الأيام البيض');
    if (wd === 1)
        r.push('الاثنين');
    if (wd === 4)
        r.push('الخميس');
    return { ramadan: false, forbidden: false, reasons: r };
}

