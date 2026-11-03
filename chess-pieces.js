// قطع الشطرنج SVG (رسم خاص بالمشروع، مقاس 45×45) — الأبيض بحروف كبيرة والأسود بحروف صغيرة
const base = '<path d="M10 39.5h25v-3.2c0-1.3-1-2.3-2.3-2.3H12.3C11 34 10 35 10 36.3z"/>';
const S = {
    p: '<circle cx="22.5" cy="12.5" r="5.3"/><path d="M17.8 19.8h9.4c.2 4 4 5.6 5.4 9.7.6 1.9.5 3.8.5 5.5H11.9c0-1.7-.1-3.6.5-5.5 1.4-4.1 5.2-5.7 5.4-9.7z"/><path d="M10 39.5h25v-3.6c0-.9-.7-1.6-1.6-1.6H11.6c-.9 0-1.6.7-1.6 1.6z"/>',
    r: '<path d="M12 19.5V9.5h4.5v3h3v-3h6v3h3v-3H33v10z"/><path d="M14.5 19.5h16l-1.6 4.5H16.1z"/><path d="M16.1 24h12.8l1.4 8.5H14.7z"/><path d="M12.3 32.5h20.4V36H12.3z"/>' + '<path d="M10 39.5h25V36H10z"/>',
    n: '<path d="M12.5 39.5c-.5-8 1.5-13 6.5-16.5-3 .3-5.5 2-8 3.8l-2.2-3C13.3 18 17 13 20 8.8l.6-4.3 3.4 3.3c8.7.8 13.7 7.2 12.2 31.7z"/><circle cx="23.5" cy="14.5" r="1.4" fill="currentColor" stroke="none"/><path d="M12.2 24.8l3.5-2.1" fill="none"/>',
    b: '<circle cx="22.5" cy="9" r="3.2"/><path d="M22.5 12.2c-5.8 3.8-8.5 8.2-8.5 12.3 0 3 1.9 4.7 4.5 5.8h8c2.6-1.1 4.5-2.8 4.5-5.8 0-4.1-2.7-8.5-8.5-12.3z"/><path d="M19 30.3h7l1.5 4.2h-10z"/><path d="M22.5 15.8v6M19.8 18.8h5.4" fill="none"/>' + base,
    q: '<circle cx="8.5" cy="14" r="2.6"/><circle cx="15.5" cy="9.5" r="2.6"/><circle cx="22.5" cy="8" r="2.6"/><circle cx="29.5" cy="9.5" r="2.6"/><circle cx="36.5" cy="14" r="2.6"/><path d="M9.5 16.5l4.5 14.5h17l4.5-14.5-6.5 7-2.8-11.3-3.7 10.8-3.7-10.8-2.8 11.3z"/><path d="M13.3 31h18.4l1.3 4H12z"/>' + base,
    k: '<path d="M11.2 31L8.6 17.5l7.9 5.4L22.5 12l6 10.9 7.9-5.4L33.8 31z"/><circle cx="8.4" cy="15.2" r="2.4"/><circle cx="36.6" cy="15.2" r="2.4"/><circle cx="22.5" cy="8.6" r="3.4"/><path d="M13 26.2h19" fill="none"/><path d="M10.2 31h24.6l1.4 4H8.8z"/>' + base,
};
// الأبيض: تعبئة فاتحة وخط غامق. الأسود: تعبئة غامقة وخط فاتح داخلي
export function pieceSVG(pc) {
    if (!pc)
        return '';
    const w = pc < 'a', u = pc.toLowerCase();
    return `<svg viewBox="0 0 45 45" class="pcs ${w ? 'chw' : 'chb'}" aria-hidden="true" focusable="false"><g fill="${w ? '#fbfaf5' : '#34403d'}" stroke="${w ? '#1d2a27' : '#0d1413'}" stroke-width="1.7" stroke-linejoin="round" stroke-linecap="round" color="${w ? '#1d2a27' : '#e9f0ee'}">${S[u]}</g></svg>`;
}

