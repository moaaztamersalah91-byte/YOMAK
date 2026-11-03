// تواريخ ميلادي + هجري (أم القرى) — بالأرقام وبالكتابة
const mk = (loc, o) => new Intl.DateTimeFormat(loc, o);
const G = 'ar-EG-u-nu-latn', H = 'ar-SA-u-ca-islamic-umalqura-nu-latn';
const gNum = mk('en-GB', { day: 'numeric', month: 'numeric', year: 'numeric' });
const hNum = mk(H, { day: 'numeric', month: 'numeric', year: 'numeric' });
const gTxt = mk(G, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
const hTxt = mk(H, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
const hMon = mk(H, { month: 'long', year: 'numeric' }), gMon = mk(G, { month: 'long', year: 'numeric' });
const at = s => typeof s === 'string' ? new Date(s + 'T12:00') : s;
const parts = (f, d) => Object.fromEntries(f.formatToParts(d).filter(p => p.type !== 'literal').map(p => [p.type, p.value]));
export const gDay = d => +parts(gNum, at(d)).day;
export const hDay = d => +parts(hNum, at(d)).day;
export const numG = d => { const p = parts(gNum, at(d)); return `${p.day}/${p.month}/${p.year}`; };
export const numH = d => { const p = parts(hNum, at(d)); return `${p.day}/${p.month}/${p.year}`; };
export const txtG = d => gTxt.format(at(d));
export const txtH = d => hTxt.format(at(d)) + (/هـ/.test(hTxt.format(at(d))) ? '' : ' هـ');
export const monG = d => gMon.format(at(d));
export const monH = d => hMon.format(at(d));

