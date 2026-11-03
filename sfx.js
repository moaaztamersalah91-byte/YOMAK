/* YOMAK SFX — محرك مؤثرات صوتية احترافي (WebAudio، بدون ملفات خارجية)
   window.SFX.play(name) | SFX.mute(true/false) | SFX.volume(0..1)
   الثيمات: default (الإنتاجية) | islamic (أذكار/قرآن/صلاة/تسبيح) | game (الألعاب) */
(function () {
    'use strict';
    if (window.SFX)
        return;
    var LS = function (k, v) { try {
        if (v === undefined)
            return localStorage.getItem(k);
        localStorage.setItem(k, v);
    }
    catch (e) {
        return null;
    } };
    var page = (document.body && document.body.dataset.page) || (location.pathname.split('/').pop() || 'index').replace('.html', '');
    var ISL = /tasbih|adhkar|quran|prayer|sawm|isl|hifz|tajweed|calendar-hijri|adhan/i;
    var theme = /^game|^games$|^room$/.test(page) || /game-/.test(location.pathname) ? 'game' : ISL.test(page) || ISL.test(location.pathname) ? 'islamic' : 'default';
    var ctx = null, master = null, verb = null, verbGain = null, enabled = LS('yomak_sfx') !== '0', vol = parseFloat(LS('yomak_sfx_vol'));
    if (isNaN(vol))
        vol = 0.7;
    var reduce = false;
    try {
        reduce = false;
    }
    catch (e) { }
    var last = {};
    function init() {
        if (ctx)
            return ctx;
        var AC = window.AudioContext || window.webkitAudioContext;
        if (!AC)
            return null;
        try {
            ctx = new AC();
        }
        catch (e) {
            return null;
        }
        var comp = ctx.createDynamicsCompressor();
        comp.threshold.value = -14;
        comp.ratio.value = 4;
        comp.attack.value = .003;
        comp.release.value = .15;
        master = ctx.createGain();
        master.gain.value = vol;
        master.connect(comp);
        comp.connect(ctx.destination);
        // reverb صناعي خفيف (impulse من ضجيج متضائل)
        var len = ctx.sampleRate * 1.1, buf = ctx.createBuffer(2, len, ctx.sampleRate);
        for (var c = 0; c < 2; c++) {
            var d = buf.getChannelData(c);
            for (var i = 0; i < len; i++)
                d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6);
        }
        verb = ctx.createConvolver();
        verb.buffer = buf;
        verbGain = ctx.createGain();
        verbGain.gain.value = theme === 'islamic' ? .38 : .2;
        verb.connect(verbGain);
        verbGain.connect(master);
        return ctx;
    }
    function unlock() { var c = init(); if (c && c.state === 'suspended')
        c.resume(); }
    ['pointerdown', 'keydown', 'touchstart'].forEach(function (ev) { window.addEventListener(ev, unlock, { capture: true, passive: true }); });
    document.addEventListener('visibilitychange', function () { if (ctx && document.hidden && ctx.state === 'running')
        ctx.suspend().catch(function () { });
    else if (ctx && !document.hidden)
        ctx.resume().catch(function () { }); });
    /* ---------- بنّاءات الأصوات ---------- */
    function env(g, t, a, d, peak, sus) { g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(Math.max(0.0001, (sus || 0.0001)), t + a + d); }
    // نغمة: f تردد، d مدة، type موجة، v شدة، at تأخير، to انزلاق للتردد، rev كمية reverb
    function tone(f, d, type, v, at, to, rev, a) {
        var t = ctx.currentTime + (at || 0), o = ctx.createOscillator(), g = ctx.createGain();
        o.type = type || 'sine';
        o.frequency.setValueAtTime(f, t);
        if (to)
            o.frequency.exponentialRampToValueAtTime(to, t + d);
        env(g, t, a || .004, d, v || .2);
        o.connect(g);
        g.connect(master);
        if (rev && verb) {
            var s = ctx.createGain();
            s.gain.value = rev;
            g.connect(s);
            s.connect(verb);
        }
        o.start(t);
        o.stop(t + d + .05);
    }
    // ضجيج مفلتر (للضربات والـ whoosh)
    function noise(d, v, at, ftype, f1, f2, q, rev) {
        var t = ctx.currentTime + (at || 0), n = Math.floor(ctx.sampleRate * d), b = ctx.createBuffer(1, n, ctx.sampleRate), ch = b.getChannelData(0);
        for (var i = 0; i < n; i++)
            ch[i] = Math.random() * 2 - 1;
        var s = ctx.createBufferSource();
        s.buffer = b;
        var fl = ctx.createBiquadFilter();
        fl.type = ftype || 'bandpass';
        fl.Q.value = q || 1;
        fl.frequency.setValueAtTime(f1 || 1000, t);
        if (f2)
            fl.frequency.exponentialRampToValueAtTime(f2, t + d);
        var g = ctx.createGain();
        env(g, t, .005, d, v || .2);
        s.connect(fl);
        fl.connect(g);
        g.connect(master);
        if (rev && verb) {
            var r = ctx.createGain();
            r.gain.value = rev;
            g.connect(r);
            r.connect(verb);
        }
        s.start(t);
        s.stop(t + d + .05);
    }
    // جرس/ناقوس بتوافقيات غير تامة
    function bell(f, d, v, at, rev) {
        [1, 2.01, 2.76, 4.07].forEach(function (m, i) { tone(f * m, d / (1 + i * .6), 'sine', (v || .18) / (1 + i * 1.3), at, null, rev == null ? .6 : rev, .002); });
    }
    function arp(notes, step, type, v, d, rev) { notes.forEach(function (n, i) { tone(n, d || .22, type || 'triangle', v || .17, i * step, null, rev == null ? .3 : rev); }); }
    var N = { C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392, A4: 440, B4: 493.88, C5: 523.25, D5: 587.33, E5: 659.25, F5: 698.46, G5: 783.99, A5: 880, B5: 987.77, C6: 1046.5, E6: 1318.5, G3: 196, A3: 220, B3: 246.94, E3: 164.81, C3: 130.81, Eb5: 622.25, Ab4: 415.3, Bb4: 466.16 };
    /* ---------- مكتبة الأصوات ---------- */
    var S = {
        // واجهة عامة
        click: function () { var i = theme === 'islamic'; tone(i ? 520 : 880, .06, i ? 'sine' : 'triangle', .13, 0, i ? 420 : 640); noise(.02, .05, 0, 'highpass', 3000); },
        tap: function () { tone(theme === 'game' ? 540 : 700, .07, theme === 'game' ? 'square' : 'triangle', .1, 0, 420); noise(.015, .04, 0, 'highpass', 4000); },
        soft: function () { tone(660, .05, 'sine', .07, 0, 520); },
        nav: function () { noise(.18, .07, 0, 'bandpass', 500, 2200, 1.2); tone(520, .1, 'sine', .07, .04, 780); },
        confirm: function () { tone(N.E5, .08, 'triangle', .14); tone(N.A5, .14, 'triangle', .14, .07, null, .25); },
        open: function () { tone(420, .12, 'sine', .1, 0, 760, .2); noise(.1, .04, 0, 'bandpass', 900, 2400, 1); },
        close: function () { tone(760, .1, 'sine', .09, 0, 420); },
        on: function () { tone(520, .06, 'triangle', .12); tone(780, .09, 'triangle', .12, .05); },
        off: function () { tone(780, .06, 'triangle', .1); tone(480, .09, 'triangle', .1, .05); },
        type: function () { tone(1200 + Math.random() * 300, .025, 'square', .025); },
        delete: function () { noise(.2, .14, 0, 'bandpass', 1800, 260, 1.4); tone(260, .18, 'triangle', .12, 0, 110); },
        // إشعارات
        success: function () { arp([N.C5, N.E5, N.G5], .07, 'triangle', .15, .2, .35); tone(N.C6, .3, 'sine', .09, .2, null, .5); },
        error: function () { tone(180, .16, 'sawtooth', .13, 0, 120); tone(150, .22, 'sawtooth', .13, .13, 95); },
        info: function () { bell(N.A5, .45, .13, 0, .4); },
        warn: function () { tone(440, .1, 'square', .09); tone(440, .1, 'square', .09, .15); },
        notify: function () { bell(N.E5, .7, .16, 0, .5); bell(N.B5, .7, .12, .16, .5); },
        // إنجاز
        complete: function () { tone(N.G4, .09, 'triangle', .15); tone(N.C5, .09, 'triangle', .15, .07); tone(N.E5, .12, 'triangle', .15, .14); tone(N.G5, .4, 'sine', .16, .22, null, .55); bell(N.C6, .8, .07, .22, .7); },
        celebrate: function () { arp([N.C5, N.E5, N.G5, N.C6, N.E6], .075, 'triangle', .15, .3, .45); noise(.5, .05, .28, 'highpass', 5000, 9000, .7, .4); },
        levelup: function () { arp([N.C4, N.E4, N.G4, N.C5, N.E5, N.G5, N.C6], .07, 'square', .09, .18, .3); bell(N.C6, 1.3, .18, .5, .8); bell(N.G5, 1.3, .12, .5, .8); },
        xp: function () { tone(N.E6, .07, 'sine', .12); tone(N.A5 * 2, .16, 'sine', .11, .06, null, .4); },
        coin: function () { tone(N.B5, .07, 'square', .09); tone(N.E6, .28, 'square', .09, .07, null, .3); },
        // مؤقت/تركيز
        tick: function () { tone(1500, .03, 'square', .05); },
        timerEnd: function () { [0, .28, .56].forEach(function (t) { bell(N.G5, .9, .17, t, .6); }); bell(N.C6, 1.4, .12, .9, .7); },
        focusStart: function () { tone(220, .4, 'sine', .14, 0, 440, .4); noise(.4, .05, 0, 'bandpass', 400, 2400, 1); },
        breakStart: function () { arp([N.E5, N.C5, N.G4], .14, 'sine', .14, .5, .6); },
        // ألعاب
        win: function () { arp([N.C5, N.E5, N.G5, N.C6], .1, 'square', .1, .22, .3); arp([N.E5, N.G5, N.C6, N.E6], .1, 'triangle', .12, .4, .5); noise(.7, .05, .3, 'highpass', 6000, 9000, .6, .4); },
        lose: function () { arp([N.E4, N.D4, N.C4, N.G3], .2, 'sawtooth', .09, .3, .3); tone(110, .7, 'sine', .14, .6, 70); },
        draw: function () { tone(N.G4, .18, 'triangle', .13); tone(N.G4, .3, 'triangle', .13, .2); },
        turn: function () { tone(N.A5, .05, 'sine', .08); tone(N.E6, .08, 'sine', .08, .05); },
        place: function () { tone(300, .09, 'triangle', .18, 0, 150); noise(.03, .08, 0, 'lowpass', 1500); },
        placeX: function () { tone(420, .09, 'triangle', .17, 0, 260); noise(.025, .07, 0, 'bandpass', 2200); },
        placeO: function () { tone(560, .14, 'sine', .17, 0, 520, .25); },
        flip: function () { noise(.09, .1, 0, 'bandpass', 2500, 5000, 1.2); tone(900, .06, 'triangle', .07, .02, 1500); },
        match: function () { arp([N.E5, N.G5, N.C6], .07, 'triangle', .14, .2, .4); },
        mismatch: function () { tone(300, .14, 'triangle', .11, 0, 200); },
        dice: function () { for (var i = 0; i < 7; i++) {
            noise(.04, .12, i * .07 + Math.random() * .02, 'bandpass', 900 + Math.random() * 1800, null, 2);
            tone(180 + Math.random() * 80, .04, 'square', .04, i * .07);
        } tone(300, .08, 'triangle', .1, .55); },
        step: function () { tone(520, .05, 'triangle', .08, 0, 640); },
        ladder: function () { arp([N.C5, N.D5, N.E5, N.G5, N.C6, N.E6], .06, 'triangle', .13, .2, .3); },
        snake: function () { tone(700, .55, 'sawtooth', .1, 0, 110, .2); noise(.5, .06, 0, 'bandpass', 3000, 400, 3); },
        start: function () { tone(N.C5, .1, 'square', .1); tone(N.G5, .2, 'square', .1, .1, null, .3); },
        hit: function () { noise(.1, .2, 0, 'lowpass', 1800, 300, 1); tone(150, .12, 'sine', .25, 0, 60); },
        bounce: function () { tone(420, .07, 'sine', .15, 0, 300); noise(.03, .06, 0, 'bandpass', 2500, null, 1); },
        goal: function () { noise(.6, .12, 0, 'bandpass', 400, 3500, 1); arp([N.G4, N.C5, N.E5, N.G5], .07, 'square', .1, .2, .3); tone(80, .4, 'sine', .22, 0, 50); },
        explosion: function () { noise(.9, .34, 0, 'lowpass', 2500, 80, .8, .3); tone(90, .8, 'sine', .35, 0, 35); noise(.25, .2, 0, 'highpass', 3000, 1000); },
        rocket: function () { noise(.5, .14, 0, 'bandpass', 300, 3000, 1.5); tone(200, .5, 'sawtooth', .07, 0, 900); },
        revive: function () { arp([N.C4, N.E4, N.G4, N.C5, N.E5], .08, 'sine', .14, .4, .7); },
        correct: function () { tone(N.G5, .08, 'triangle', .14); tone(N.C6, .2, 'triangle', .14, .08, null, .4); },
        wrong: function () { tone(200, .22, 'sawtooth', .11, 0, 130); },
        reveal: function () { noise(.35, .08, 0, 'bandpass', 600, 3000, 1); tone(N.E5, .25, 'sine', .1, .2, null, .5); },
        // شطرنج
        move: function () { tone(210, .07, 'triangle', .22, 0, 120); noise(.03, .1, 0, 'lowpass', 1200); },
        capture: function () { tone(150, .1, 'triangle', .28, 0, 80); noise(.09, .2, 0, 'lowpass', 2500, 500); tone(300, .06, 'square', .06, .01, 200); },
        castle: function () { S.move(); setTimeout(S.move, 110); },
        check: function () { tone(N.A5, .1, 'square', .1); tone(N.A5, .14, 'square', .1, .1, null, .3); },
        promote: function () { arp([N.C5, N.E5, N.G5, N.C6], .06, 'triangle', .14, .2, .4); },
        illegal: function () { tone(130, .12, 'square', .1); },
        // إسلامي هادئ
        count: function () { bell(N.E5, .28, .12, 0, .5); },
        countGoal: function () { bell(N.C5, 1.1, .2, 0, .8); bell(N.G5, 1.1, .15, .14, .8); bell(N.C6, 1.3, .12, .3, .8); },
        amen: function () { bell(N.G5, .9, .14, 0, .8); bell(N.D5, 1, .12, .12, .8); },
        prayerDone: function () { bell(N.D5, 1.2, .16, 0, .9); bell(N.A5, 1.4, .12, .18, .9); bell(N.D5 * 2, 1.6, .1, .36, .9); },
        adhan: function () { [0, .45, .9].forEach(function (t, i) { bell([N.D5, N.F5, N.A5][i], 1.5, .15, t, .9); }); },
        page: function () { noise(.22, .07, 0, 'highpass', 2500, 6000, .5); tone(300, .08, 'sine', .04, .1); },
        welcome: function () { bell(N.G5, 1, .12, 0, .8); bell(N.C6, 1.2, .1, .15, .8); }
    };
    var THROTTLE = { tick: 30, type: 40, click: 25, tap: 25, soft: 40, bounce: 70, hit: 50, step: 50, flip: 40, xp: 80, celebrate: 600, count: 35 };
    function play(name, opt) {
        if (!enabled)
            return;
        var f = S[name];
        if (!f)
            return;
        var now = Date.now(), th = THROTTLE[name] || 0;
        if (th && last[name] && now - last[name] < th)
            return;
        last[name] = now;
        var c = init();
        if (!c)
            return;
        if (c.state === 'suspended') {
            c.resume().then(function () { try {
                f(opt);
            }
            catch (e) { } }).catch(function () { });
            return;
        }
        try {
            f(opt);
        }
        catch (e) { }
    }
    /* ---------- ربط تلقائي بالواجهة ---------- */
    var DEL = /حذف|مسح|إزالة|حذف|delete|remove|تصفير|خروج|تسجيل الخروج/i;
    var OK = /حفظ|إضافة|أضف|إنشاء|تأكيد|ابدأ|إرسال|تسجيل|دخول|save|add|create|submit/i;
    var CLOSE = /إغلاق|إلغاء|رجوع|×|✕|close|cancel/i;
    var GAMECELL = '.xo-cell,.mem-card,.bg-cell,.ch-sq,.lg-board button,.hm-key,.hang-key,.key,.kb button,.letter,[data-letter],[data-cell]';
    function classify(el) {
        var t = (el.textContent || '').trim().slice(0, 40), id = el.id || '', cl = el.className && el.className.toString() || '';
        if (el.matches && el.matches(GAMECELL))
            return null; // الألعاب بتتعامل بأصواتها
        if (el.type === 'checkbox' || el.type === 'radio' || el.getAttribute('role') === 'switch' || /switch|toggle/i.test(cl))
            return el.checked === false ? 'off' : 'on';
        if (DEL.test(t) || /delete|remove|danger/i.test(cl + id))
            return 'delete';
        if (CLOSE.test(t) || /close|cancel/i.test(cl + id))
            return 'close';
        if (el.type === 'submit' || /primary/.test(cl) || OK.test(t))
            return 'confirm';
        if (el.closest && el.closest('nav,#nav,.tabs,[role=tablist]'))
            return 'nav';
        if (el.tagName === 'A' && el.getAttribute('href') && !/^#/.test(el.getAttribute('href')))
            return 'nav';
        return 'click';
    }
    document.addEventListener('click', function (e) {
        var el = e.target.closest && e.target.closest('button,a,[role=button],[role=tab],[role=switch],input[type=checkbox],input[type=radio],summary,.chip,.btn,label.switch');
        if (!el || el.disabled || el.hasAttribute('data-nosfx'))
            return;
        if (el.closest('.sfx-toggle'))
            return;
        // الأصوات الخاصة بأزرار محددة
        var id = el.id || '';
        if (id === 'roll') {
            play('dice');
            return;
        }
        if (id === 'bzHit') {
            play('hit');
            return;
        }
        if (id === 'bzBazooka') {
            play('rocket');
            setTimeout(function () { play('explosion'); }, 420);
            return;
        }
        if (id === 'bzRevive') {
            play('revive');
            return;
        }
        if (el.dataset && el.dataset.rps) {
            play('flip');
            return;
        }
        if (el.matches && el.matches('.xo-cell') && !el.disabled) {
            play(el.classList.contains('o') ? 'placeO' : 'placeX');
            return;
        }
        if (el.matches && el.matches('.mem-card')) {
            play('flip');
            return;
        }
        if (el.matches && el.matches(GAMECELL)) {
            play('tap');
            return;
        }
        var k = classify(el);
        if (k)
            play(k);
    }, true);
    // كتابة خفيفة في الحقول
    document.addEventListener('input', function (e) { var t = e.target; if (t && /^(INPUT|TEXTAREA)$/.test(t.tagName) && !/range|checkbox|radio|file|color/.test(t.type || '') && e.inputType && /insert/.test(e.inputType))
        play('type'); }, true);
    document.addEventListener('change', function (e) { var t = e.target; if (t && (t.tagName === 'SELECT' || t.type === 'range' || t.type === 'date' || t.type === 'time'))
        play('soft'); }, true);
    // الأخطاء في الفورم
    document.addEventListener('invalid', function () { play('error'); }, true);
    /* ---------- مراقبة DOM: toasts، confetti، shake، حالة الألعاب ---------- */
    var WIN = /🏆|كسب|فاز|فوز|مبروك|نجحت|أحسنت|عرفت|ربحت|الفائز/, LOSE = /خسر|خسرت|انتهى الوقت|انتهت المحاولات|فشل|هزيمة|مات|الكلمة كانت/, DRAW = /تعادل/, GOOD = /^صح|إجابة صحيحة|✅|ممتاز/, BAD = /غلط|خطأ|❌|إجابة خاطئة/;
    var lastStatus = new WeakMap();
    var STATUS = '#xoStatus,#memStatus,#status,.lg-status,.on-status,.bz-status,#bzStatus,.ch-status,[id$="Status"].lg-status';
    var SCORE = '.on-scores';
    function onStatus(el) {
        var t = (el.textContent || '').trim();
        if (!t || lastStatus.get(el) === t)
            return;
        lastStatus.set(el, t);
        if (DRAW.test(t))
            return play('draw');
        if (LOSE.test(t) && !WIN.test(t))
            return play('lose');
        if (WIN.test(t)) {
            if (/ورقة|طوبة|مقص/.test(t) && !/كسب جولة|فاز بالمواجهة/.test(t))
                return;
            return play('win');
        }
        if (/صعد السلم/.test(t))
            return play('ladder');
        if (/التعبان/.test(t))
            return play('snake');
        if (/خرج من البيت/.test(t))
            return play('start');
        if (GOOD.test(t))
            return play('match');
        if (BAD.test(t))
            return play('wrong');
        if (/^دور|دورك/.test(t))
            return play('turn');
    }
    var lastScore = new WeakMap();
    function onScore(el) { var t = el.textContent; var p = lastScore.get(el); lastScore.set(el, t); if (p !== undefined && p !== t)
        play('goal'); }
    function handleAdded(n) {
        if (n.nodeType !== 1)
            return;
        var cl = n.className && n.className.toString ? n.className.toString() : '';
        if (n.parentNode && n.parentNode.id === 'toasts' || /toast-item/.test(cl)) {
            play(/error/.test(cl) ? 'error' : /success/.test(cl) ? 'success' : 'info');
            return;
        }
        if (/confetti/.test(cl)) {
            play('celebrate');
            return;
        }
        if (/modal|dialog|popup|sheet/i.test(cl) && !/hidden/.test(cl) && n.tagName !== 'SCRIPT')
            play('open');
    }
    function scan(root) {
        if (!root || !root.querySelectorAll)
            return;
        var s = root.matches && root.matches(STATUS) ? root : root.closest && root.closest(STATUS);
        if (s)
            onStatus(s);
        var sc = root.matches && root.matches(SCORE) ? root : root.closest && root.closest(SCORE);
        if (sc)
            onScore(sc);
    }
    function startObserver() {
        if (!document.body || /chess/i.test(location.pathname))
            return;
        new MutationObserver(function (ms) {
            for (var i = 0; i < ms.length; i++) {
                var m = ms[i];
                if (m.type === 'childList') {
                    for (var j = 0; j < m.addedNodes.length; j++)
                        handleAdded(m.addedNodes[j]);
                    var el = m.target.nodeType === 1 ? m.target : m.target.parentElement;
                    if (el) {
                        scan(el);
                        var g = el.closest && el.closest('#log');
                        if (g && g.firstElementChild && m.addedNodes.length)
                            onStatus(g.firstElementChild);
                    }
                }
                else if (m.type === 'characterData') {
                    scan(m.target.parentElement);
                }
                else if (m.type === 'attributes') {
                    var t = m.target;
                    if (m.attributeName === 'class' && t.classList) {
                        if (t.classList.contains('shake') && !/old/.test(m.oldValue || 'shake'))
                            play('error');
                        if (/\bmatched\b/.test(t.className) && !/matched/.test(m.oldValue || ''))
                            play('match');
                    }
                }
            }
        }).observe(document.body, { childList: true, subtree: true, characterData: true });
    }
    /* ---------- زر الكتم + الواجهة ---------- */
    function buildToggle() {
        if (document.querySelector('.sfx-toggle') || /^(index|login|register)$/.test(page) && false)
            return;
        var st = document.createElement('style');
        st.textContent = '.sfx-toggle{position:fixed;inset-inline-start:12px;bottom:calc(12px + env(safe-area-inset-bottom,0px));z-index:9999;width:38px;height:38px;border-radius:50%;border:1px solid rgba(0,0,0,.12);background:rgba(255,255,255,.92);color:#04796C;font-size:18px;line-height:1;cursor:pointer;box-shadow:0 4px 14px rgba(0,0,0,.14);display:grid;place-items:center;padding:0;opacity:.75;transition:opacity .2s,transform .2s}.sfx-toggle:hover{opacity:1;transform:scale(1.08)}.sfx-toggle[aria-pressed=true]{color:#999}@media(max-width:700px){.sfx-toggle{bottom:calc(76px + env(safe-area-inset-bottom,0px));width:34px;height:34px;font-size:16px}}';
        document.head.appendChild(st);
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'sfx-toggle';
        b.setAttribute('data-nosfx', '');
        function paint() { b.textContent = enabled ? '🔊' : '🔇'; b.setAttribute('aria-pressed', String(!enabled)); b.title = b.ariaLabel = enabled ? 'كتم المؤثرات الصوتية' : 'تشغيل المؤثرات الصوتية'; }
        b.onclick = function () { enabled = !enabled; LS('yomak_sfx', enabled ? '1' : '0'); paint(); if (enabled) {
            unlock();
            play('on');
        } };
        paint();
        document.body.appendChild(b);
    }
    window.SFX = { play: play, mute: function (m) { enabled = !m; LS('yomak_sfx', enabled ? '1' : '0'); }, enabled: function () { return enabled; }, volume: function (v) { if (v === undefined)
            return vol; vol = Math.max(0, Math.min(1, v)); LS('yomak_sfx_vol', String(vol)); if (master)
            master.gain.value = vol; }, theme: theme, names: Object.keys(S) };
    function boot() {
        startObserver();
        buildToggle();
        // صوت دخول الصفحة لأول تفاعل (الإسلامي: جرس هادئ)
        if (theme === 'islamic' || page === 'index') {
            var once = function () { play(theme === 'islamic' ? 'welcome' : 'open'); window.removeEventListener('pointerdown', once, true); };
            window.addEventListener('pointerdown', once, true);
        }
    }
    if (document.readyState === 'loading')
        document.addEventListener('DOMContentLoaded', boot);
    else
        boot();
})();

