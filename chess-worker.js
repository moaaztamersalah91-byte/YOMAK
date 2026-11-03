// Worker: بيشغّل بحث الذكاء بعيد عن الواجهة علشان الصفحة ماتهنجش
import { parse } from './chess-engine.js';
import { search, rateMove, evalPos } from './chess-ai.js';
self.onmessage = e => {
    const { id, fen, level, hist, rate, ply, ev } = e.data;
    let m = null;
    if (ev) {
        let r = null;
        try {
            r = evalPos(parse(fen));
        }
        catch (err) { }
        self.postMessage({ id, m: r });
        return;
    }
    if (rate) {
        let r = null;
        try {
            r = rateMove(parse(fen), rate, ply);
        }
        catch (err) { }
        self.postMessage({ id, m: r });
        return;
    }
    try {
        m = search(parse(fen), level, hist || []);
    }
    catch (err) { }
    self.postMessage({ id, m: m && { f: m.f, t: m.t, pr: m.pr || '', v: m.v } });
};

