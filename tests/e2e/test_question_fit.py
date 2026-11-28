"""2026-11-28 (test.5, Task 4; its fix round 1 the same day): 每種題目在各種螢幕一開始就看得到全部選項——every practice question the app can build
shows, at every size of the matrix and from its first frame, all its options (an audio option's two buttons, the tiles with 確定 and 我不會,
配對's words) whole and tapped at their middle, and its stem at least beginning in sight; answered — for real, 我不會 on a tile question
too — 下一題 is in sight and, on a phone, nothing under the result moved.

The user: 「這種還是要讓使用者一開始就能看得到選項」 and 「但感覺還是必須全面適配各種size，畢竟之後還是要上架到app store 和 googlestore」.

A deterministic sample of the full sweep (scripts/sweep-question-fit.py OUT_DIR: every question of every format, 37,000-odd, at the 8 sizes in
every state; 12–14 minutes; --sizes and --limit run a part of it): every grammar, listening, reading, kanji, kana and 變化練習 question and six 錯題卡 is built, and
of each vocabulary format the words its question is likeliest longest in and a stride over the rest; then of each format its 12 longest
questions (by their text) and a stride over the rest, about 32, are drawn at each size — new, as a word missed again and again (錯題複習 and
常錯: the widest label row), a listening question with its progress line up — and the 12 longest also under a session's note, on the 換個方式再考
and 再練一次 label rows, and answered by a real click on a wrong option (我不會 on a tile or 配對 question), as the Chinese under the stem
hidden (顯示中文) too. Its fix round's own checks, on every card drawn: a stem or Chinese line never taller than its own content, 還有 and the
fade only over about a third of a line or more, 句意拼貼's pieces and 配對's words at their own size (never under 40 px) unless the card would run
over and then squeezed no more than it takes, the wide 下一題 strip clear; and five tests of their own — a real touch swipe on the card scrolls
the page (before the answer and after it), the set's note on an SE comes in the first result, a full 句意拼貼 line keeps 確定 in sight, and a
phone's address bar come back over a squeezed card squeezes it again (the re-review's NB-1).

The final fix (2026-11-28; the final review's Important 1 and 2): a practice card going away — a set played to its summary, one left with ✕ after four
answers and one left with ✕ on its first question — reports no page error (what js/30_report.js would send to app_errors: its ResizeObserver threw on a
strip the view had drawn over); and every preview card (a new word's, a relearn's, a new kana's, a lesson section's two pages) shows its main button
whole and tapped at its middle from its first frame at all 8 sizes — pinned at a phone's foot (.pv-foot, .gp-foot), the card's last line scrolling clear
of the strip."""
import asyncio, json, os, subprocess, sys, time
sys.path.insert(0, os.path.dirname(__file__))
import websockets
from cdp import Browser
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
PORT = 8839
URL = f"http://127.0.0.1:{PORT}/"
READY = "typeof state === 'object' && !!state.updatedAt && typeof speakScript === 'function'"
SIZES = [(360, 640), (375, 553), (390, 664), (412, 780), (430, 740), (768, 1024), (1024, 768), (1280, 800)]

def drive(b, w, h, main, reduce=True, inject=None):
    """b's page opened at w×h — a phone's emulation (scale 2) up to 600 px wide, a touch screen up to 1024 (the phones, an iPad either way up),
    a keyboard and a mouse at 1280, motion reduced (nothing in flight when a card is measured) — then `await main(call, ev)`: call(method,
    params) is one CDP command, ev(js, timeout) evaluates js (a promise is awaited). One CDP session from the metrics to the value, so the
    emulation holds throughout. inject: a script run in every new document before the app's own (a listener that must be there from the start)"""
    mobile, touch = w <= 600, w <= 1024
    async def go():
        async with websockets.connect(b.ws_url, max_size=None) as ws:
            n = 0
            async def call(m, p=None):
                nonlocal n; n += 1; k = n
                await ws.send(json.dumps({"id": k, "method": m, "params": p or {}}))
                while True:
                    r = json.loads(await ws.recv())
                    if r.get("id") == k:
                        if "error" in r: raise RuntimeError(f"{m}: {r['error']}")
                        return r.get("result", {})
            async def ev(src, t=60):
                r = await asyncio.wait_for(call("Runtime.evaluate", {"expression": src, "returnByValue": True, "awaitPromise": True}), t)
                if "exceptionDetails" in r: raise RuntimeError(r["exceptionDetails"].get("exception", {}).get("description", "eval error")[:900])
                return r["result"].get("value")
            await call("Page.enable"); await call("Page.addScriptToEvaluateOnNewDocument", {"source": "window.NQ_E2E = 1"})
            if inject: await call("Page.addScriptToEvaluateOnNewDocument", {"source": inject})
            await call("Emulation.setDeviceMetricsOverride", {"width": w, "height": h, "deviceScaleFactor": 2 if mobile else 1, "mobile": mobile})
            await call("Emulation.setTouchEmulationEnabled", {"enabled": True, "maxTouchPoints": 5} if touch else {"enabled": False})
            if reduce: await call("Emulation.setEmulatedMedia", {"features": [{"name": "prefers-reduced-motion", "value": "reduce"}]})
            await call("Storage.clearDataForOrigin", {"origin": URL.rstrip("/"), "storageTypes": "all"})
            await call("Page.navigate", {"url": URL})
            for _ in range(450):
                try:
                    if await ev(READY, 10): break
                except Exception: pass
                await asyncio.sleep(0.1)
            return await main(call, ev)
    return asyncio.run(go())

def page(b, w, h, js, timeout=600):
    async def main(call, ev): return await ev(js, timeout)
    return drive(b, w, h, main)

async def tap(call, x, y):
    """a real touch tap at x, y: the browser's pointer events and then the click, as a finger sends them"""
    await call("Input.dispatchTouchEvent", {"type": "touchStart", "touchPoints": [{"x": x, "y": y}]}); await asyncio.sleep(0.05)
    await call("Input.dispatchTouchEvent", {"type": "touchEnd", "touchPoints": []}); await asyncio.sleep(0.2)

async def swipe(call, x, y, dy):
    """a real touch scroll gesture: the finger from x, y moving dy px (up: negative) — the browser's own scrolling, scroll chaining included"""
    await call("Input.synthesizeScrollGesture", {"x": x, "y": y, "yDistance": dy, "gestureSourceType": "touch", "speed": 1200}); await asyncio.sleep(0.35)

# the questions (each built with Math.random seeded by its place in the list, so a question is the same wherever it is built), drawn as the
# current card and measured: every answer control inside the screen and every box that clips it, and hit at its middle; the stem's first
# line (a play button, a picture, a word) in sight and not covered. A question's text length: its stem's, its options', its tiles' and the
# Chinese under it, furigana left out
KIT = r"""const wait = (ms) => new Promise((r) => setTimeout(r, ms)), R0 = Math.random;
  const seed = (s) => { let a = s >>> 0; Math.random = () => { a |= 0; a = a + 0x6D2B79F5 | 0; let x = Math.imul(a ^ a >>> 15, 1 | a); x = x + Math.imul(x ^ x >>> 7, 61 | x) ^ x; return ((x ^ x >>> 14) >>> 0) / 4294967296; }; };
  const LEECH = () => ({ b: 2, s: 5, d: 5, due: todayStr(), n: 6, ok: 2, ng: 4, st: 0, last: addDays(todayStr(), -3), lapse: 5, intro: addDays(todayStr(), -40), leech: true, rl: 1, f: {} });
  const SEL = '.q-card .opt:not(.opt-audio), .q-card .opt-play, .q-card .opt-pick, .q-card .spell-tile, .q-card .order-tile, .q-card .match-word, .q-card .match-meaning, .q-card [data-act="tiles-submit"], .q-card [data-act="custom-giveup"], .q-card .conj-in, .q-card [data-act="conj-submit"]';
  speak = () => Promise.resolve(); speakScript = () => Promise.resolve();
  // the notebook's own entries (錯題卡, m-card), a short one to a long one: makeMistakeCard borrows the other answers for its options from them
  const MIST = [['駅（　）行きます。', 'へ', 'を'], ['昨日は雨が降っていたので、出かけないで家で本を読んだり映画を見たり（　）、ゆっくり過ごしました。', 'して', 'する'],
    ['部長に「この資料は明日までに必ず仕上げておくように」と言われたのに、急な出張が入ってしまい、結局（　）。', '間に合わなかった', '間に合った'], ['お客様がいらっしゃる前に、会議室の準備を（　）。', 'しておかなければならない', 'しておいてもいい'],
    ['雨（　）降る。', 'が', 'は'], ['彼は日本語（　）話せる。', 'しか', 'だけ']].map(([prompt, answer, wrong], k) => ({ id: 'qfm' + k, key: '', cat: '自訂', prompt, answer, wrong, why: '', count: 1, streak: 0, mastered: false, note: '', date: todayStr() }));
  state.mistakes = MIST.map((m) => Object.assign({}, m));
  state.stage = 'main'; state.kanaKnown = true; state.introSeen = true; state.storyV = 99; state.startChosen = true; state.currentUnit = DATA.UNITS[DATA.UNITS.length - 1].id; saveState(); DAILY_CACHE = null;
  const plain = (s) => String(s || '').replace(/<rt>[\s\S]*?<\/rt>/g, '').replace(/\[[^\]]*\]|\{|\}/g, '').replace(/<[^>]+>/g, '').replace(/\s+/g, '');
  // the words: building every built-in word in every format takes a minute (a word's distractors are looked for over all the others), so
  // of each vocabulary format the 48 words its question is likeliest longest in, by the word's own text (its meaning, its word, its reading,
  // its examples), and every n-th of the others it can be asked in, about 96 a format; the rest is built whole (a second, all told)
  const ex = (v) => plain(v.ex).length + plain(v.ex2).length, m = (v) => String(v.m || '').length, w = (v) => plain(v.w).length, kanji = (v) => Boolean(v.r) && HAS_KANJI.test(v.w);
  const VF = { 'v-meaning': [(v) => w(v) + 2 * m(v)], 'v-listen': [(v) => 2 * m(v)], 'v-recall': [(v) => m(v) + 2 * w(v)], 'v-pic': [w, (v) => picKey(v)], 'v-match': [m],
    'v-cloze': [(v) => ex(v) + String(v.exZh || '').length, (v) => v.exZh], 'v-reading': [ex, kanji], 'v-kanji': [ex, kanji], 'v-spell': [(v) => 2 * String(v.r || '').length + m(v), canSpell], 'v-para': [ex, (v) => v.ip] };
  const list = () => { const L = [], V = REG.vocab.filter((v) => v.builtin);
    Object.entries(VF).forEach(([f, [len, can]]) => { const ws = V.filter((v) => !can || can(v)).sort((a, c) => len(c) - len(a) || (a.key < c.key ? -1 : 1)), n = Math.max(1, Math.ceil((ws.length - 48) / 48));
      ws.slice(0, 48).concat(ws.slice(48).filter((_, k) => k % n === 0)).forEach((v) => { L.push([v, { forceFmt: f, kana: false }, f]); if (/^v-(recall|pic|cloze)$/.test(f)) L.push([v, { forceFmt: f, kana: true }, f + '+kana']); }); });
    REG.grammar.forEach((g) => { const t = g.t || 'choice';
      if (t === 'choice') ['g-choice', 'g-meaning', 'g-zh', 'g-fill-type'].forEach((f) => L.push([g, { forceFmt: f }, f]));
      else if (t === 'meaning') { L.push([g, {}, 'g-meaning*']); L.push([g, { choiceOnly: true }, 'g-meaning']); }
      else if (t === 'order') L.push([g, {}, 'g-order']);
      else if (t === 'conj' || t === 'adj') { const c = t === 'conj' ? 'g-conj' : 'g-adj'; L.push([g, { forceFmt: c }, c]); L.push([g, { forceFmt: c + '-type' }, c + '-type']); if (t === 'conj') L.push([g, { identify: true }, 'g-identify']); } });
    REG.listen.forEach((l) => L.push([l, {}, 'l-' + l.t]));
    REG.read.forEach((r) => L.push([r, {}, 'r-passage']));
    REG.kanji.forEach((k) => ['k-meaning', 'k-shape', 'k-read'].forEach((f) => L.push([k, { kanjiFmt: f }, f])));
    REG.kana.forEach((a) => ['a-read', 'a-sound', 'a-pair', 'a-word'].forEach((f) => L.push([a, { forceFmt: f }, f])));
    REG.drills.forEach((d) => { for (let s = 0; s < 6; s++) { L.push([d, { drill: s }, 'c-tiles']); L.push([d, { drill: s, choiceOnly: true }, 'c-choice']); } });
    MIST.forEach((mm) => L.push([{ key: 'm:' + mm.id }, { mistake: mm.id }, 'm-card']));
    return L; };
  const held = (key, rec, fn) => { const keep = state.srs[key]; state.srs[key] = rec; try { return fn(); } finally { if (keep) state.srs[key] = keep; else delete state.srs[key]; } };
  const make = (it, ctx, i) => { seed(7000 + i);
    try {
      if (ctx.mistake) return makeMistakeCard(state.mistakes.find((x) => x.id === ctx.mistake));
      if (ctx.identify) return held(it.key, Object.assign(LEECH(), { b: 2, leech: false, rl: undefined }), () => { Math.random = () => 0.05; const q = makeQuestion(it, {}); return q && q.fmt === 'g-identify' ? q : null; });
      if (ctx.kanjiFmt) return held(it.key, Object.assign(LEECH(), { b: 0, leech: false, rl: undefined }), () => { const q = makeQuestion(it, { avoidFmt: ['k-meaning', 'k-shape', 'k-read'].filter((f) => f !== ctx.kanjiFmt) }); return q && q.fmt === ctx.kanjiFmt ? q : null; });
      const q = makeQuestion(it, ctx); return q && (!ctx.forceFmt || q.fmt === ctx.forceFmt) ? q : null;
    } catch (x) { return null; } finally { Math.random = R0; } };
  const size = (q) => plain(q.stemHtml).length + plain(q.subHtml).length + String(q.zhText || '').length + q.options.reduce((a, o) => a + plain(o.text).length, 0) + (q.tiles || []).join('').length + (q.words || []).join('').length + (q.meanings || []).join('').length;
  // every kana seen (讀讀看 asks a word of kana seen) and every built-in word learned, not due (配對 pairs learned words); a card's own
  // record is set as it is drawn (新, or 錯題複習 and 常錯)
  REG.kana.forEach((a) => { if (!state.srs[a.key]) state.srs[a.key] = Object.assign(LEECH(), { leech: false, rl: undefined }); });
  REG.vocab.filter((v) => v.builtin).forEach((v) => { const t = todayStr(); if (!state.srs[v.key]) state.srs[v.key] = { b: 3, s: 9, d: 5, due: addDays(t, 5), n: 3, ok: 3, ng: 0, st: 3, last: addDays(t, -3), lapse: 0, intro: addDays(t, -30), f: {} }; });
  const L = list(); let QS = [];
  const build = (idx) => { QS = []; (idx || L.map((_, i) => i)).forEach((i) => { const q = make(L[i][0], L[i][1], i); if (q) QS.push({ i, it: L[i][0], q, tag: L[i][2] }); });
    REG.kana.forEach((a) => { delete state.srs[a.key]; }); return QS; };
  // of each format (its tag: v-cloze and v-cloze+kana apart), the 12 longest, then every n-th of the rest to about 32
  const sample = () => { const by = {}; QS.forEach((x) => { (by[x.tag] = by[x.tag] || []).push(x); }); const out = [];
    Object.values(by).forEach((xs) => { xs.forEach((x) => { x.len = size(x.q); }); xs.sort((a, c) => c.len - a.len || a.i - c.i);
      const top = xs.slice(0, 12), rest = xs.slice(12), n = Math.max(1, Math.ceil(rest.length / 20)); top.forEach((x) => { x.top = true; });
      out.push(...top, ...rest.filter((_, k) => k % n === 0)); });
    return out.sort((a, c) => a.i - c.i); };
  const it0 = REG.vocab.find((v) => v.builtin); startSession('items', { items: [it0, it0] }); route(); const e = currentEntry(); e.preview = false;
  const NOTE = '最近錯得比較多、錯題本比較滿，今天新內容少一點（5 題）。先把 N5 的單字（還剩 12 個）和漢字（還剩 8 個）學完，再開始第 3–4 週・て形。';
  // a card drawn as the app draws it: modes new, leech (錯題複習 and 常錯), prog (a listening question's progress line up), note (the day's
  // note over the first question), encore (換個方式再考, on a word missed again and again) and requeued (再練一次, the same)
  const draw = (x, mode) => { const { it, q } = x, nb = q.kind === 'm';
    e.item = nb ? undefined : it; e.mistake = nb ? state.mistakes.find((y) => y.id === q.mistakeId) : undefined; e.q = q; e.done = false; e.chosen = undefined; e.requeued = mode === 'requeued'; e.encore = mode === 'encore';
    ['spell', 'order', 'zh', 'conj', 'match', 'blockH', 'lineH', 'pqRowH', 'pqCardH', 'pqSq', 'typed', 'zhShown', 'srs', 'missed', 'undo', 'slip', 'lvUp', 'mistakeDone', 'justAnswered', 'combo', 'comboBig', 'comboBefore'].forEach((k) => delete e[k]);
    e.autoPlayed = true; e.rpTop = 0; e.rpStem = 0; e.rpSub = 0; e.rpCard = 0; e.rpStemH = 0;
    SESSION.idx = 0; SESSION.combo = 0; SESSION.meta = Object.assign({}, SESSION.meta, { note: mode === 'note' ? NOTE : '' });
    if (q.key) { if (mode === 'leech' || mode === 'encore' || mode === 'requeued') state.srs[q.key] = LEECH(); else delete state.srs[q.key]; }
    renderPractice(); window.scrollTo(0, 0);
    if (mode === 'prog') { const sp = document.getElementById('speechProg'); if (sp) { sp.hidden = false; sp.querySelector('.lab').textContent = '第 1 / 6 句'; } } };
  const clip = (el) => { let top = 0, bot = innerHeight, a = el.parentElement;
    while (a && a !== document.body) { if (getComputedStyle(a).overflowY !== 'visible') { const r = a.getBoundingClientRect(); top = Math.max(top, r.top + a.clientTop); bot = Math.min(bot, r.top + a.clientTop + a.clientHeight); } a = a.parentElement; }
    return [Math.max(top, 0), Math.min(bot, innerHeight)]; };
  const whole = (el) => { const r = el.getBoundingClientRect(), [top, bot] = clip(el); return r.width > 0 && r.height > 0 && r.top >= top - 0.5 && r.bottom <= bot + 0.5 && r.left >= -0.5 && r.right <= innerWidth + 0.5; };
  const hit = (el, sel) => { const r = el.getBoundingClientRect(), h = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return Boolean(h && h.closest(sel) === el); };
  const firstLine = (st) => { const tw = document.createTreeWalker(st, NodeFilter.SHOW_TEXT);
    while (tw.nextNode()) { const n = tw.currentNode; if (!n.textContent.trim() || n.parentElement.closest('rt')) continue; const rg = document.createRange(); rg.selectNodeContents(n); const r = [...rg.getClientRects()].find((x) => x.width > 0.5 && x.height > 0.5); if (r) return r; }
    const c = st.querySelector('svg, button') || st, r = c.getBoundingClientRect(); return { top: r.top, bottom: Math.min(r.bottom, r.top + 30), left: r.left, width: r.width, height: Math.min(r.height, 30) }; };
  // what is wrong with the card drawn now: [n controls, the worst miss (px), controls not whole, controls whole but not hit, the stem not begun]
  const check = () => { const els = [...document.querySelectorAll(SEL)]; let miss = 0, out = 0, cover = 0;
    els.forEach((el) => { const r = el.getBoundingClientRect(), [top, bot] = clip(el); miss = Math.max(miss, r.bottom - bot, top - r.top); if (!whole(el)) out++; else if (!hit(el, SEL)) cover++; });
    let stem = true; const st = document.querySelector('.q-card .q-stem');
    if (st) { const F = firstLine(st), [top, bot] = clip(st), h = F.top >= top - 0.5 && F.bottom <= bot + 0.5 && document.elementFromPoint(F.left + Math.min(F.width / 2, 8), F.top + F.height / 2); stem = Boolean(h && st.contains(h)); }
    return [els.length, Math.round(miss * 10) / 10, out, cover, stem]; };
  const bad = (m) => !m[0] || m[2] || m[3] || !m[4];
  // the cards' own rules, as [what, a box or a detail, a number]: floor — a stem or Chinese line standing taller than its own content (a floor
  // that overshoots: 6 px more a Chinese line, 9 a scene line: px); sliver — a 還有 or a fade over less than a third of a line (the lowest line
  // cut has under 0.3 of its height below the foot); quiet — a line cut by half its height or more with no 還有 or fade; target — a 句意拼貼
  // piece or a 配對 word under 40 px, or under its own size (54, 51.6) though nothing was squeezed; squeeze — pieces and words squeezed where
  // the card holds them at their own size, or by a px more than it takes (the card still holds them one less), their lines closer or packed
  // two to a row where the step before would do
  const natural = (el) => { const keep = el.getAttribute('style'); Object.assign(el.style, { minHeight: '0px', maxHeight: 'none', height: 'auto', flex: 'none', overflow: 'visible' }); const h = el.getBoundingClientRect().height;
    if (keep === null) el.removeAttribute('style'); else el.setAttribute('style', keep); return h; };
  const hid = (el) => { const foot = el.getBoundingClientRect().top + el.clientTop + el.clientHeight, tw = document.createTreeWalker(el, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT); let worst = -1;
    for (let n = tw.nextNode(); n; n = tw.nextNode()) {
      let rs = [];
      if (n.nodeType === 3) { if (!n.textContent.trim()) continue; const rg = document.createRange(); rg.selectNodeContents(n); rs = [...rg.getClientRects()]; }
      else if (n.matches('button, svg, img')) rs = [n.getBoundingClientRect()];
      rs.forEach((r) => { if (r.height > 0) worst = Math.max(worst, (r.bottom - foot) / r.height); }); }
    return Math.round(worst * 100) / 100; };   // how much of the lowest line cut (a fraction of its height) is under the box's foot
  const audit = () => { const out = [], card = document.querySelector('#view > .q-card.pq-fit'); if (!card || getComputedStyle(card).overflowY !== 'auto') return out;
    for (const el of card.querySelectorAll(':scope > .q-stem, :scope > .q-sub')) {
      if (el.matches('.picstem') || el.querySelector('.kanji-big')) continue;
      const cut = el.scrollHeight - el.clientHeight > 0.5, say = el.classList.contains('rp-more'), what = el.matches('.q-sub') ? 'sub' : 'stem', tall = el.getBoundingClientRect().height - natural(el);
      if (!cut && tall > 1) out.push(['floor', what, Math.round(tall * 10) / 10]);
      if (say && hid(el) < 0.3) out.push(['sliver', what, hid(el)]);
      if (!say && cut && hid(el) >= 0.5) out.push(['quiet', what, hid(el)]); }
    const tiles = [...card.querySelectorAll('.zh-build .order-tile, .match-word, .match-meaning')];
    if (tiles.length) { const low = Math.min(...tiles.map((t) => t.getBoundingClientRect().height)), sq = parseFloat(card.style.getPropertyValue('--pq-sq')) || 0, pack = card.classList.contains('pq-pack'), tight = card.classList.contains('pq-tight'), match = Boolean(card.querySelector('.match-word'));
      const over = () => card.scrollHeight - card.clientHeight, set = (s, p, t) => { card.style.setProperty('--pq-sq', s + 'px'); card.classList.toggle('pq-pack', p); card.classList.toggle('pq-tight', t); };
      if (low < 39.5) out.push(['target', 'under 40 px', low]);
      if (!sq && !pack && !tight && low < (match ? 51.5 : 53.5)) out.push(['target', 'under its own size, nothing squeezed', low]);
      set(0, false, false); const base = over(); set(sq, pack, tight);
      if (base <= 0 && (sq || pack || tight)) out.push(['squeeze', 'the card holds them as they are', sq]);
      if (sq > 0) { set(sq - 1, pack, tight); const less = over(); set(sq, pack, tight); if (less <= 0) out.push(['squeeze', 'a px less would do', sq]); }
      if (tight && !pack) { set(9, false, false); const loose = over(); set(sq, pack, tight); if (loose <= 0) out.push(['squeeze', 'lines closer not needed', sq]); }
      if (pack) { set(9, false, true); const loose = over(); set(sq, pack, tight); if (loose <= 0) out.push(['squeeze', 'packing not needed', sq]); } }
    return out; };
  // answered for real, by a click on a wrong option (the app's own handler: its bookkeeping, its draw) or, on a tile or 配對 question, on 我不會
  // (which puts the whole answer on the line): 下一題 whole in sight and hit, what moved (the label row's, the instruction's and the stem's tops,
  // the options' — the tiles', 配對's words' — tops and heights; not an audio option's: answered, 即時應答 and 情境表達 show their words, as
  // before), and on a wide screen the 下一題 strip clear (no band over the card, taps let through, the button itself taking them)
  const spots = () => [...document.querySelectorAll('.q-card > :is(.q-label, .q-instr, .q-stem)' + (e.q.audioOptions ? '' : ', .q-card .opt, .q-card :is(.spell-tile, .order-tile, .match-word, .match-meaning)'))].map((el) => {
    const r = el.getBoundingClientRect(); return [Math.round(r.top * 2) / 2, el.matches('.q-card > *') ? 0 : Math.round(r.height * 2) / 2]; });
  const answer = (x) => { const t0 = spots(), q = x.q, el = q.custom ? document.querySelector('.q-card [data-act="custom-giveup"]') : document.querySelector('.q-card [data-act="answer"][data-i="' + ((q.answer + 1) % q.options.length) + '"]');
    if (!el) return [false, -1, 'no control to answer with', false]; el.click();
    const nb = document.getElementById('btnNext'), t1 = spots(), moved = t0.length !== t1.length ? -1 : t0.filter((p, k) => Math.abs(p[0] - t1[k][0]) > 0.5 || Math.abs(p[1] - t1[k][1]) > 0.5).length;
    let strip = ''; const s = innerWidth > 600 && document.querySelector('#view > .pr-next');
    if (s) { const cs = getComputedStyle(s), bs = getComputedStyle(s.querySelector('.btn')); if (cs.backgroundColor !== 'rgba(0, 0, 0, 0)' || cs.pointerEvents !== 'none' || bs.pointerEvents !== 'auto') strip = cs.backgroundColor + ' / ' + cs.pointerEvents + ' / ' + bs.pointerEvents; }
    return [Boolean(nb) && whole(nb) && hit(nb, '#btnNext'), moved, strip, Boolean(q.custom)]; };
  // the sample measured at this size: every state; the ones that fail as [key, format, tag, state, the check]. A phone also draws the
  // 換個方式再考 and 再練一次 rows and answers in more states; zh false: the Chinese under the stem hidden (顯示中文)
  const run = async (xs, opt = {}) => { const phone = innerWidth <= 600, zh0 = state.settings.showZh; if (opt.zh === false) state.settings.showZh = false;
    for (const x of xs) { draw(x, 'new'); void document.body.offsetHeight; } await wait(300); if (document.fonts) await document.fonts.ready; await wait(100);
    const fails = [], next = [], moves = [], audits = [], strips = [], n = {}, steps = { sq: 0, tight: 0, pack: 0 }; let answered = 0, giveups = 0;
    for (const x of xs) { n[x.q.fmt] = (n[x.q.fmt] || 0) + 1; const key = x.q.key || x.it.key;
      for (const mode of ['new', 'leech'].concat(x.q.fmt === 'l-dialog' || x.q.fmt === 'l-resp' ? ['prog'] : [], x.top ? ['note'] : [], phone && x.top ? ['encore', 'requeued'] : [])) {
        draw(x, mode); if (mode === 'prog') await wait(80);   // the progress line grows the stem: the observers (rpFit) say so a frame later
        const m = check(); if (bad(m)) fails.push([key, x.q.fmt, x.tag, mode, m]); audit().forEach((a) => audits.push([key, x.q.fmt, mode].concat(a)));
        const cd = document.querySelector('#view > .q-card.pq-fit'); if (cd) { if (parseFloat(cd.style.getPropertyValue('--pq-sq')) > 0) steps.sq++; if (cd.classList.contains('pq-tight')) steps.tight++; if (cd.classList.contains('pq-pack')) steps.pack++; } }
      if (x.top) for (const mode of phone ? ['new', ['leech', 'note', 'encore', 'requeued'][x.i % 4]] : ['new']) {
        draw(x, mode); const [shown, moved, strip, giveup] = answer(x); answered++; if (giveup) giveups++;
        if (!shown) next.push([key, x.q.fmt, mode]); if (moved) moves.push([key, x.q.fmt, mode, moved]); if (strip) strips.push([key, x.q.fmt, strip]); } }
    state.settings.showZh = zh0;
    return { n, fails, next, moves, audits, strips, steps, answered, giveups }; };
  const done = () => { if (e.q && e.q.key) delete state.srs[e.q.key]; SESSION = null; document.body.classList.remove('practicing'); };"""

# what the touch tests use on top of the kit: the page's own numbers about a card and where to put a finger
TOUCH = r"""
  const pick = (tags) => L.map((l, i) => tags.includes(l[2]) ? i : -1).filter((i) => i >= 0);
  const longest = (tag) => QS.filter((x) => x.tag === tag).sort((a, c) => size(c.q) - size(a.q) || a.i - c.i)[0];
  let cur = null;
  // a finger's start for a swipe (on the element, kept clear of the screen's edges) and the centre of a control (the tap that presses it)
  const point = (sel) => { const el = document.querySelector(sel); if (!el) return null; const r = el.getBoundingClientRect(); return [Math.round(r.left + r.width / 2), Math.round(Math.min(Math.max(r.top + Math.min(r.height / 2, 24), 70), innerHeight - 70))]; };
  const center = (sel) => { const el = document.querySelector(sel); if (!el) return null; const r = el.getBoundingClientRect(); return [Math.round(r.left + r.width / 2), Math.round(Math.min(Math.max(r.top + r.height / 2, 4), innerHeight - 4))]; };
  const tools = () => { const tb = document.querySelector('#view > .pr-actions [data-act="replay"]'), r = tb && tb.getBoundingClientRect(); return r ? [Math.round(r.top), Math.round(r.bottom)] : null; };
  const panel = () => { const os = [...document.querySelectorAll('.q-card .opt, .q-card :is(.order-tile, .match-word, .match-meaning)')], sh = document.querySelector('.fb-sheet');
    return { last: Math.round(Math.max(...os.map((el) => el.getBoundingClientRect().bottom))), sheet: sh ? Math.round(sh.getBoundingClientRect().top) : null, y: Math.round(scrollY), max: Math.round(document.scrollingElement.scrollHeight - innerHeight), h: innerHeight }; };
  // a wrong option's centre (the tap that answers), on a freshly drawn card of the longest question of a format
  const fresh = (tag, mode = 'new') => { cur = longest(tag); draw(cur, mode); window.scrollTo(0, 0); const q = cur.q; return center('.q-card [data-act="answer"][data-i="' + ((q.answer + 1) % q.options.length) + '"]'); };
  // the first card, among the longest 220 of the formats asked for, in a mode, with its tool row under the screen's foot while the page can scroll
  // (need: a part of the card a swipe is to start on, in sight there too — the Chinese line: the re-review's NB-6)
  const find = (tags, need) => { build(pick(tags)); const xs = QS.slice().sort((a, c) => size(c.q) - size(a.q) || a.i - c.i).slice(0, 220);
    const seen = () => { if (!need) return true; const el = document.querySelector(need), r = el && el.getBoundingClientRect(); return Boolean(r) && r.height > 0 && r.top < innerHeight - 70 && r.bottom > 70; };
    for (const mode of ['new', 'leech', 'note']) for (const x of xs) { draw(x, mode); const t = tools(); if (t && t[0] > innerHeight - 4 && document.scrollingElement.scrollHeight > innerHeight + 4 && seen()) { cur = [x, mode]; return [x.tag, x.q.key || x.it.key, mode]; } }
    return null; };
  // the longest card of the formats asked for whose Chinese line, the card answered (a wrong option), is above the result panel: drawn again
  // unanswered, the centre of the wrong option a finger taps
  const subAbove = (tags) => { build(pick(tags)); const xs = QS.slice().sort((a, c) => size(c.q) - size(a.q) || a.i - c.i).slice(0, 220);
    for (const x of xs) { draw(x, 'new'); const q = x.q, sel = '.q-card [data-act="answer"][data-i="' + ((q.answer + 1) % q.options.length) + '"]', el = document.querySelector(sel);
      if (!el || !document.querySelector('.q-card > .q-sub')) continue;
      el.click(); const p = panel(), pt = point('.q-card > .q-sub');
      if (pt && p.sheet !== null && pt[1] < p.sheet - 20) { cur = x; draw(x, 'new'); window.scrollTo(0, 0); return [center(sel), x.q.key || x.it.key]; } }
    return null; };
  // the first n cards of the formats asked for (in the list's order) whose pieces or words the squeeze holds at this size, in a mode: their
  // places in the list; and one of them drawn again, by its place
  const squeezed = (tags, mode, n) => { build(pick(tags)); const out = [];
    for (const x of QS) { draw(x, mode); const s = e.pqSq; if (s && (s[0] > 0 || s[1] || s[2]) && !bad(check())) out.push(x.i); if (out.length >= n) break; }
    return out; };
  const drawAt = (i, mode) => { const x = QS.find((y) => y.i === i); cur = x; draw(x, mode); window.scrollTo(0, 0); return x.q.key || x.it.key; };
  const again = () => { draw(cur[0], cur[1]); window.scrollTo(0, 0); };
  // the 句意拼貼 question whose full line runs the card over the most: [its key, the px over]
  const longLine = () => { build(pick(['g-zh'])); let best = null;
    for (const x of QS) { draw(x, 'new'); e.zh = x.q.zhParts.map((p) => x.q.tiles.indexOf(p)); renderPractice(); const card = document.querySelector('#view > .q-card'), over = card.scrollHeight - card.clientHeight; if (!best || over > best[1]) best = [x, over]; }
    cur = best[0]; draw(cur, 'new'); window.scrollTo(0, 0); return [cur.q.key, Math.round(best[1])]; };
  const order = () => cur.q.zhParts.map((p) => cur.q.tiles.indexOf(p));
  const tileAt = (i) => center('.q-card .order-tile[data-i="' + i + '"]:not([disabled])');
  const line = () => { const card = document.querySelector('#view > .q-card'), ok = document.querySelector('.q-card [data-act="tiles-submit"]');
    const cs = getComputedStyle(card), mask = cs.maskImage || cs.webkitMaskImage || 'none';
    return { over: Math.round((card.scrollHeight - card.clientHeight) * 10) / 10, top: Math.round(card.scrollTop * 10) / 10, more: card.classList.contains('rp-more'), mask, whole: Boolean(ok) && whole(ok), hit: Boolean(ok) && hit(ok, '[data-act="tiles-submit"]'), on: Boolean(ok) && !ok.disabled, at: ok ? center('.q-card [data-act="tiles-submit"]') : null, h: innerHeight }; };
  // the day's note, over the question and in the result: where it shows, and how tall
  const noteIn = () => { const top = document.querySelector('#view > .plan-note'), res = document.querySelector('.fb-sheet .pq-rp-note');
    return { top: top ? [getComputedStyle(top).display, Math.round(top.getBoundingClientRect().height)] : null, res: res ? [getComputedStyle(res).display, Math.round(res.getBoundingClientRect().height), res.textContent] : null, sheet: Boolean(document.querySelector('.fb-sheet')), second: (() => { SESSION.idx = 1; const s = sessionNoteHtml() + (typeof sessionNoteInResult === 'function' ? sessionNoteInResult() : ''); SESSION.idx = 0; return s; })() }; };
  return { L, build, draw, check, whole, hit, size, pick, fresh, find, subAbove, squeezed, drawAt, again, point, center, tools, panel, longLine, order, tileAt, line, noteIn, NOTE, get QS() { return QS; } };"""
API = "window.T = (() => { " + KIT + TOUCH + " })()"

FORMATS = {'v-meaning', 'v-recall', 'v-cloze', 'v-reading', 'v-kanji', 'v-listen', 'v-spell', 'v-match', 'v-pic', 'v-para', 'g-choice', 'g-meaning', 'g-zh', 'g-fill-type', 'g-order',
           'g-conj', 'g-conj-type', 'g-adj', 'g-adj-type', 'g-identify', 'l-dialog', 'l-resp', 'l-scene', 'r-passage', 'k-meaning', 'k-shape', 'k-read', 'a-read', 'a-sound', 'a-pair', 'a-word', 'm-card'}

def test_every_question_shows_all_its_options_from_its_first_frame_at_every_size(b):
    # built once at the first size (9,000-odd questions); each size builds again only the sample, by its places in the list
    tail = "const r = await run(xs); const z = innerWidth <= 600 ? await run(xs.filter((x) => x.q.zhText), { zh: false }) : null; done();"
    first = "(async () => { " + KIT + """ build(); const S = sample(); const idx = S.map((x) => x.i), top = S.filter((x) => x.top).map((x) => x.i);
      const by = {}; QS.forEach((x) => { by[x.q.fmt] = (by[x.q.fmt] || 0) + 1; }); const xs = S; """ + tail + """
      return JSON.stringify({ r, z, idx, top, built: QS.length, by }); })()"""
    w, h = SIZES[0]
    r0 = json.loads(page(b, w, h, first, 900))
    assert r0['built'] > 8000 and set(r0['by']) == FORMATS, (r0['built'], sorted(r0['by']))   # every format the app asks in, 錯題卡 too
    assert set(r0['r']['n']) == FORMATS and all(v >= 12 for k, v in r0['r']['n'].items() if r0['by'][k] >= 12), r0['r']['n']   # each sampled: its longest and a stride
    results = {(w, h): r0}
    for w, h in SIZES[1:]:
        js = "(async () => { " + KIT + f""" const idx = {json.dumps(r0['idx'])}, top = new Set({json.dumps(r0['top'])}); build(idx); QS.forEach((x) => {{ x.top = top.has(x.i); }}); const xs = QS; """ + tail + """
          return JSON.stringify({ r, z }); })()"""
        results[(w, h)] = json.loads(page(b, w, h, js, 600))
    for (w, h), res in results.items():
        r, z = res['r'], res['z']
        assert sum(r['n'].values()) == len(r0['idx']), (w, h, sum(r['n'].values()))   # the same sample at every size
        assert r['fails'] == [], (w, h, len(r['fails']), r['fails'][:8])   # every option whole and tapped, the stem begun — new, missed again and again, playing, under a note, on the 換個方式再考 and 再練一次 rows
        assert r['next'] == [], (w, h, r['next'][:8])   # answered for real: 下一題 in sight and tapped
        assert r['answered'] >= 400 and r['giveups'] >= 80 and (w > 600 or (r['answered'] >= 800 and r['giveups'] >= 170)), (w, h, r['answered'], r['giveups'])   # the longest 12 of every format (a phone: in two states each), 我不會 on a tile or 配對 question among them
        assert r['audits'] == [], (w, h, len(r['audits']), r['audits'][:8])   # floors, 還有 and fades, tile and word sizes, the squeeze (see audit)
        # the sample reaches every step of the squeeze where the screen needs it (else the audit would say nothing): pieces' and words' padding,
        # their lines closer, 句意拼貼 two to a row (an SE)
        if (w, h) == (375, 553): assert r['steps']['sq'] >= 10 and r['steps']['tight'] >= 1 and r['steps']['pack'] >= 1, (w, h, r['steps'])
        if (w, h) == (360, 640): assert r['steps']['sq'] >= 5 and r['steps']['tight'] >= 1, (w, h, r['steps'])
        if w > 600: assert r['strips'] == [], (w, h, r['strips'][:8])   # the wide 下一題 strip: no band over the card, taps let through
        # answered on a phone nothing under the result panel moves (the card keeps its height; an audio option's top stays as it shows its
        # words; 我不會 on a tile question keeps the line's height): a label row too — 新 turning into dots, a miss's 錯題複習, 換個方式再考,
        # 再練一次. A wide screen shows the result under the options as before, with what it always did there — a listening or a kana-read
        # word's words or kanji over the options, the wrong options' asides, a filled blank's line — its 下一題 held in sight (above)
        if w <= 600:
            assert r['moves'] == [], (w, h, len(r['moves']), r['moves'][:8])
            assert z is not None and z['fails'] == [] and z['next'] == [] and z['moves'] == [] and z['audits'] == [], (w, h, 'Chinese hidden', z['fails'][:4], z['next'][:4], z['moves'][:4], z['audits'][:4])
            assert z['answered'] >= 200 and sum(z['n'].values()) >= 300, (w, h, z['answered'], sum(z['n'].values()))   # the 顯示中文 line drawn for the questions that have one

def test_a_touch_swipe_on_the_card_scrolls_the_page_before_and_after_an_answer(b):
    # real touch scrolling (CDP synthesizeScrollGesture, the browser's own gesture): the card is a box that scrolls only as the last resort, so
    # a swipe on it, on its label row, its stem or an option, is the page's — before the answer the tool row (發音) under the screen's foot
    # comes up; after it the options come up above the result panel (1.0.43's room under the page). A phone in Chromium kept every swipe on the
    # card to itself when the card had overscroll-behavior: contain: only the 16 px gutters scrolled
    for w, h in [(430, 740), (375, 553)]:
        async def main(call, ev):
            await ev(API)
            found = await ev("T.find(['g-zh', 'g-meaning*', 'g-fill-type', 'g-choice', 'l-dialog', 'k-read', 'v-meaning'])")
            assert found, (w, h, 'no question leaves the tool row under the screen')
            swipes = []
            for where in ['.q-card > .q-label', '.q-card > .q-stem', '.q-card .opt']:   # (a tile is the app's own to drag: 1.0.44)
                pt = await ev(f"T.again(); T.point({json.dumps(where)})")
                if not pt: continue
                for _ in range(3): await swipe(call, pt[0], pt[1], -300)   # a stem cut short scrolls first, in its own box; once at its end the swipe is the page's
                tools, y = await ev("T.tools()"), await ev("Math.round(scrollY)")
                swipes.append((where, found, y, tools))
                assert y > 0 and tools and tools[1] <= h + 1, (w, h, 'before the answer', where, found, y, tools)   # the page went up, the tool row whole in sight
            assert len(swipes) >= 2, (w, h, swipes)
            # from the Chinese line under the stem too (the re-review's NB-6: a containment put back on it alone passed), on a card that has one in sight
            found = await ev("T.find(['g-zh', 'g-meaning*', 'g-fill-type', 'g-choice', 'l-dialog', 'k-read', 'v-meaning', 'v-cloze'], '.q-card > .q-sub')")
            assert found, (w, h, 'no question leaves the tool row under the screen with its Chinese line in sight')
            pt = await ev("T.again(); T.point('.q-card > .q-sub')")
            for _ in range(3): await swipe(call, pt[0], pt[1], -300)
            tools, y = await ev("T.tools()"), await ev("Math.round(scrollY)")
            assert y > 0 and tools and tools[1] <= h + 1, (w, h, 'before the answer', '.q-sub', found, y, tools)
            # after a real tap on a wrong option: swipes up the card's part above the panel, until the page stops — every option above the panel
            for tag in ['v-meaning', 'l-dialog']:
                for where in ['.q-card > .q-label', '.q-card > .q-stem', '.q-card .opt']:
                    pt = await ev(f"T.fresh({json.dumps(tag)})")
                    await tap(call, pt[0], pt[1])
                    start = await ev(f"(() => {{ const p = T.panel(); const pt = T.point({json.dumps(where)}); return pt && (p.sheet === null || pt[1] < p.sheet - 20) ? pt : null; }})()")
                    if not start: continue   # an option under the panel is the panel's to swipe, not the card's
                    await swipe(call, start[0], start[1], -300)
                    for _ in range(3):
                        p = await ev("T.panel()")
                        if p['y'] >= p['max'] - 1: break
                        await swipe(call, w // 2, 120, -300)
                    p = await ev("T.panel()")
                    assert p['sheet'] and p['y'] > 0 and p['last'] <= p['sheet'] + 1, (w, h, 'after the answer', tag, where, p)   # the options came up above the result panel
            # and from the Chinese line, answered: the longest card whose line is above the result panel (on an SE the panel covers the line of
            # the longest 220: that swipe is the panel's)
            got = await ev("T.subAbove(['v-cloze', 'g-choice', 'v-meaning', 'g-meaning'])")
            assert got or h < 600, (w, h, 'no question leaves its Chinese line above the result panel')
            if got:
                (x0, y0), key = got
                await tap(call, x0, y0)
                start = await ev("(() => { const p = T.panel(); const pt = T.point('.q-card > .q-sub'); return pt && p.sheet !== null && pt[1] < p.sheet - 20 ? pt : null; })()")
                assert start, (w, h, 'after the answer', key)
                await swipe(call, start[0], start[1], -300)
                for _ in range(3):
                    p = await ev("T.panel()")
                    if p['y'] >= p['max'] - 1: break
                    await swipe(call, w // 2, 120, -300)
                p = await ev("T.panel()")
                assert p['sheet'] and p['y'] > 0 and p['last'] <= p['sheet'] + 1, (w, h, 'after the answer', '.q-sub', key, p)
        drive(b, w, h, main)

def test_the_set_note_is_over_the_first_question_and_on_an_se_in_its_result(b):
    # the day's or a drill's note (SESSION.meta.note) is over the set's first question on a phone — but on an SE (≤ 600 px tall: the room is the
    # question's) it comes in that question's result panel instead, one line of its fb-meta (.pq-rp-note: Ruling 36's switch); none on the second
    for w, h, se in [(375, 553, True), (360, 640, False), (430, 740, False)]:
        async def main(call, ev):
            await ev(API)
            await ev("T.build(T.pick(['v-meaning']))")
            pt = await ev("T.fresh('v-meaning', 'note')")   # the longest 意思 question, under the note: the tap that answers it wrong
            before = await ev("T.noteIn()")
            await tap(call, pt[0], pt[1])
            after = await ev("T.noteIn()")
            assert before['top'] is not None and before['res'] is None and not before['sheet'], (w, h, before)
            assert after['sheet'] and after['second'] == '', (w, h, after)   # a result panel; the second question has no note, over it or in its result
            if se:
                assert before['top'][0] == 'none' and before['top'][1] == 0, (w, h, before)   # none over the question
                assert after['res'] and after['res'][0] != 'none' and after['res'][1] > 0 and '今天新內容少一點' in after['res'][2], (w, h, after)   # in its result
            else:
                assert before['top'][0] != 'none' and before['top'][1] > 20, (w, h, before)   # over the question as before
                assert after['res'] is None or after['res'][0] == 'none', (w, h, after)   # and not twice
        drive(b, w, h, main)

def test_a_full_sentence_line_keeps_the_ok_button_in_sight_and_a_card_that_scrolls_says_so(b):
    # 句意拼貼 filled to its last piece by real taps: the line grows by the pieces placed and can run the card over (up to ~60 px at 375×553);
    # the card stays scrolled to its end, so 確定 is whole and tappable, and where it is scrolled up it fades its foot (rp-more)
    for w, h in [(375, 553), (360, 640)]:
        async def main(call, ev):
            await ev(API)
            key, over = await ev("T.longLine()")
            assert over >= 20, (w, h, key, over)   # the card really is run over by the full line: the longest of them
            for i in await ev("T.order()"):
                pt = await ev(f"T.tileAt({i})")
                await tap(call, pt[0], pt[1])
            s = await ev("T.line()")
            assert s['over'] >= 20 and s['top'] >= s['over'] - 1.5 and not s['more'], (w, h, key, s)   # scrolled to its end: nothing under its foot
            assert s['whole'] and s['hit'] and s['on'], (w, h, key, s)   # 確定 whole, tappable, lit
            await swipe(call, w // 2, h // 2, 60)   # the finger down: the card scrolls up by what is left
            s2 = await ev("T.line()")
            assert s2['top'] < s['top'] - 5 and s2['more'] and s2['mask'] != 'none', (w, h, key, s2)   # it says there is more below: its foot fades
            await swipe(call, w // 2, h // 2, -120)
            s3 = await ev("T.line()")
            assert s3['whole'] and s3['top'] >= s3['over'] - 1.5, (w, h, key, s3)
            await tap(call, s3['at'][0], s3['at'][1])   # 確定, tapped: answered (the pieces are the right ones)
            assert await ev("currentEntry().done") is True, (w, h, key)
        drive(b, w, h, main)

def test_a_bar_come_back_over_a_squeezed_card_squeezes_it_again(b):
    # a phone's address bar comes and goes as the page scrolls: the screen's height alone changes. A card drawn while the bar was gone (its pieces
    # or words squeezed for the taller screen, or not at all) runs over once the bar is back: it is squeezed again for the shorter one, every
    # control whole and tapped where it shows (the fix round's re-review, NB-1: options 4–58 px under the card's foot on 375×553)
    for w, h, mode in [(375, 553, 'new'), (360, 640, 'note')]:
        async def main(call, ev):
            await ev(API)
            places = await ev(f"T.squeezed(['g-zh', 'v-match'], {json.dumps(mode)}, 4)")
            assert len(places) >= 2, (w, h, mode, places)
            for i in places:
                await call("Emulation.setDeviceMetricsOverride", {"width": w, "height": h + 56, "deviceScaleFactor": 2, "mobile": True})
                await asyncio.sleep(0.2)
                key = await ev(f"T.drawAt({i}, {json.dumps(mode)})")
                await asyncio.sleep(0.2)
                await call("Emulation.setDeviceMetricsOverride", {"width": w, "height": h, "deviceScaleFactor": 2, "mobile": True})
                await asyncio.sleep(0.4)
                m = await ev("T.check()")
                assert m[0] and not m[2] and not m[3] and m[4], (w, h, mode, key, m)   # [controls, worst miss, not whole, covered, the stem begun]
        drive(b, w, h, main)

# the preview cards (a new word's — a relearn's, 再看一次, too — a new kana's, a lesson section's two pages): drawn as the app draws them, each measured
# at its first frame (right after the draw, the layout forced) and settled (two frames and the web fonts later), as it is and under the day's note
# (over the first card of the day: on a wide screen the longest word's 看完了 was under the foot of a 1024×768 screen by 38 px with it). Not the
# question kit above: that one marks every item learned, and a learned item has no preview. A word's preview is the tallest of the 40 whose texts are
# the longest (the weight of its two examples, their Chinese and its meaning, a picture counting), a kana's and a section's the tallest of all of them
PVKIT = r"""
  const frames = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  speak = () => Promise.resolve(); speakScript = () => Promise.resolve();
  state.stage = 'main'; state.kanaKnown = true; state.introSeen = true; state.storyV = 99; state.startChosen = true; state.currentUnit = DATA.UNITS[DATA.UNITS.length - 1].id; saveState(); DAILY_CACHE = null;
  const words = REG.vocab.filter((v) => v.builtin), w0 = words[0], w1 = words[1];
  const show = (it, relearn, page2) => { startSession('items', { items: [it, w0, w1] }); route(); const e = currentEntry(); e.preview = true; e.relearn = Boolean(relearn); e.gpPage = 0; renderPractice();
    if (page2) { previewMain(); } window.scrollTo(0, 0); return e; };
  const plain = (s) => String(s || '').replace(/<rt>[\s\S]*?<\/rt>/g, '').replace(/\[[^\]]*\]|\{|\}/g, '').replace(/<[^>]+>/g, '').replace(/\s+/g, '');
  const weight = (v) => plain(v.ex).length + plain(v.ex2).length + String(v.exZh || '').length + String(v.exZh2 || '').length + String(v.m || '').length * 2 + (picKey(v) ? 12 : 0);
  const R = (el) => el.getBoundingClientRect(), page = () => R(document.querySelector('#view .preview')).height;
  const tallest = (xs, page2) => { let best = null; xs.forEach((x) => { const e = show(x, false, page2); if (page2 && e.gpPage !== 2) return; const h = page(); if (!best || h > best[1]) best = [x, h]; }); return best[0]; };
  // the cases at this size: the tallest word's preview (a picture, two examples), the same as a relearn, the tallest kana, the tallest lesson
  // section's two pages
  const seen = new Set(), secs = REG.grammar.filter((g) => { const k = lessonSecKey(g); if (!k || seen.has(k)) return false; seen.add(k); return true; });
  const word = tallest(words.slice().sort((a, b) => weight(b) - weight(a) || (a.key < b.key ? -1 : 1)).slice(0, 40)), kana = tallest(REG.kana.slice());
  const sec1 = tallest(secs.slice()), sec2 = tallest(secs.filter((g) => grammarPreviewPages({ item: g }) === 2), true);
  const CASES = { word: () => show(word), relearn: () => show(word, true), kana: () => show(kana), g1: () => show(sec1), g2: () => show(sec2, false, true) };
  // what a preview shows now: its main button (whole in the screen, and the one a tap at its middle reaches), its foot (the strip: how it is
  // held, how tall; every button in it inside it and the screen, none over another, how tall) and, the page scrolled to its end, whether the
  // card's last line is above the strip
  const probe = (kind) => { const btn = document.getElementById('btnNext'), strip = btn && btn.closest('.pr-actions'); if (!btn || !strip) return { kind, missing: true };
    const rb = R(btn), rs = R(strip), h = document.elementFromPoint(rb.left + rb.width / 2, rb.top + rb.height / 2), kids = [...strip.querySelectorAll('.btn')].map((k) => R(k));
    const inside = kids.every((k) => k.left >= rs.left - 0.5 && k.right <= rs.right + 0.5 && k.top >= rs.top - 0.5 && k.bottom <= rs.bottom + 0.5 && k.right <= innerWidth + 0.5 && k.left >= -0.5);
    const apart = kids.every((a, i) => kids.every((b, j) => i >= j || a.right <= b.left + 0.5 || b.right <= a.left + 0.5 || a.bottom <= b.top + 0.5 || b.bottom <= a.top + 0.5));
    return { kind, main: { whole: rb.width > 0 && rb.top >= -0.5 && rb.bottom <= innerHeight + 0.5 && rb.left >= -0.5 && rb.right <= innerWidth + 0.5, hit: Boolean(h && h.closest('#btnNext') === btn), gap: Math.round(rb.bottom - innerHeight), h: Math.round(rb.height * 10) / 10, text: btn.textContent.replace('Enter', '').trim() },
      strip: { pos: getComputedStyle(strip).position, h: Math.round(rs.height * 10) / 10, inside, apart, hs: kids.map((k) => Math.round(k.height * 10) / 10), n: kids.length }, scroll: Math.round(document.documentElement.scrollHeight - innerHeight) }; };
  const clear = async () => { window.scrollTo(0, 1e6); await frames(); const last = document.querySelector('#view .preview').lastElementChild, strip = document.querySelector('#view > .pr-actions'), y = scrollY;
    const out = { y: Math.round(y), clear: R(last).bottom <= R(strip).top + 0.5, gap: Math.round(R(strip).top - R(last).bottom), last: last.className }; window.scrollTo(0, 0); await frames(); return out; };
  const shape = () => ({ pic: Boolean(document.querySelector('.preview .pic')), examples: document.querySelectorAll('.preview .example').length, bad: Boolean(document.querySelector('.q-label .chip-bad')), left: document.querySelectorAll('#view > .pr-actions .left .btn').length, page: (document.querySelector('.preview.grammar') || { dataset: {} }).dataset.page || '' });
  const NOTE = '最近錯得比較多、錯題本比較滿，今天新內容少一點（5 題）。先把 N5 的單字（還剩 12 個）和漢字（還剩 8 個）學完，再開始第 3–4 週・て形。';
  const run = async () => { const out = {}; for (const [k, draw] of Object.entries(CASES)) for (const note of [false, true]) { const name = note ? k + '+note' : k; draw();
      if (note) { SESSION.meta = Object.assign({}, SESSION.meta, { note: NOTE }); renderPractice(); window.scrollTo(0, 0); }
      const first = probe(name); await frames(); if (document.fonts) await document.fonts.ready; const settled = probe(name); out[name] = { first, settled, end: await clear(), shape: shape(), note: Boolean(document.querySelector('#view > .plan-note')) === note }; }
    out.keys = { word: word.key, kana: kana.key, sec1: lessonSecKey(sec1), sec2: lessonSecKey(sec2) }; SESSION = null; document.body.classList.remove('practicing'); return out; };"""

def test_every_preview_shows_its_main_button_from_its_first_frame_at_every_size(b):
    # the final review's Important 2: a new word's 看完了 was under a phone's foot on the first screen of every new word (87–209 px at 375×553, 20 and
    # 104 at 390×664, 42 at 430×740; the relearn 再看一次 card the same) — the grammar card's foot was pinned (.gp-foot) and the word's and the kana's
    # are now (.pv-foot): a solid strip across the gutters at the foot, 看完了 big, the small buttons beside it 40 px at the least (the kana's three at
    # 360 px on one row with nothing cut or over another), the page above scrolling to its last line clear of the strip
    for w, h in SIZES:
        async def main(call, ev):
            return json.loads(await ev("(async () => { " + PVKIT + " return JSON.stringify(await run()); })()", 120))
        r = drive(b, w, h, main)
        phone = w <= 600
        sh = {k: r[k]['shape'] for k in ('word', 'relearn', 'kana', 'g1', 'g2')}
        # the cards are what the case says: the longest word's has a picture and two examples, the relearn's the 再看一次 chip, the kana's three buttons
        # on the left, the section's page 1 its main button 下一頁：例句 and page 2 its examples and 看完了
        assert sh['word']['pic'] and sh['word']['examples'] == 2 and not sh['word']['bad'] and sh['word']['left'] == 2, (w, h, sh['word'], r['keys'])
        assert sh['relearn']['pic'] and sh['relearn']['examples'] == 2 and sh['relearn']['bad'] and sh['relearn']['left'] == 1, (w, h, sh['relearn'])
        assert sh['kana']['left'] == 3 and r['kana']['first']['main']['text'] == '看完了', (w, h, sh['kana'], r['keys'])
        assert sh['g1']['page'] == '1' and r['g1']['first']['main']['text'] == '下一頁：例句' and sh['g2']['page'] == '2' and sh['g2']['examples'] >= 1 and r['g2']['first']['main']['text'] == '看完了', (w, h, sh['g1'], sh['g2'])
        for k in ('word', 'relearn', 'kana', 'g1', 'g2', 'word+note', 'relearn+note', 'kana+note', 'g1+note', 'g2+note'):
            assert r[k]['note'], (w, h, k, 'the day\'s note over the card (or not)')
            for when in ('first', 'settled'):
                p = r[k][when]
                assert not p.get('missing') and p['main']['whole'] and p['main']['hit'], (w, h, k, when, p)   # the main button whole in the screen and tapped at its middle
                assert p['strip']['inside'] and p['strip']['apart'] and p['strip']['pos'] == 'sticky', (w, h, k, when, p['strip'])   # nothing cut, nothing over another; held at the foot
                if phone:
                    assert p['main']['h'] >= 47.5, (w, h, k, when, p)   # 看完了 big
                    assert min(p['strip']['hs']) >= 39.5, (w, h, k, when, p['strip'])   # no button under 40 px
                    assert p['strip']['h'] <= 66, (w, h, k, when, p['strip'])   # one row: 8 + 48 + 8 (the kana's three buttons and 看完了 side by side)
            assert r[k]['end']['clear'], (w, h, k, r[k]['end'])   # scrolled to its end, the card's last line is above the strip
            if phone and k.split('+')[0] in ('word', 'relearn', 'g1', 'g2'): assert r[k]['first']['scroll'] > 0 and r[k]['end']['y'] > 0, (w, h, k, r[k])   # (the page really is longer than the screen: it scrolls)

# what js/30_report.js would send to public.app_errors, listened for from before the app's first script: an uncaught error (not a ResizeObserver
# loop notice, which the reporter ignores) and an unhandled rejection (not a sound the browser would not play)
ERRORS = r"""window.__nqErrs = [];
  window.addEventListener('error', (e) => { if (/ResizeObserver loop/.test(String(e.message || ''))) return; window.__nqErrs.push(['error', String(e.message || (e.error && e.error.message)), String(e.filename || '').split('/').pop() + ':' + e.lineno]); });
  window.addEventListener('unhandledrejection', (e) => { const r = e.reason; if (r && (r.name === 'NotAllowedError' || r.name === 'AbortError')) return; window.__nqErrs.push(['rejection', String((r && r.message) || r)]); });"""

def test_a_practice_card_going_away_reports_no_page_error(b):
    # the final review's Important 1: the observer of a card's strip (RP_RO) threw 「Cannot read properties of null (reading 'matches')」 for a
    # strip the view had drawn over — at every new item's preview, at the summary, on ✕ — and js/30_report.js sends each to app_errors. A daily
    # set of new words (previews among its cards) played through its summary, a second left with ✕ after four answers (the summary of a set
    # quit), a third left with ✕ on its first question: the page's errors and unhandled rejections, listened for from before the set, none
    for w, h in [(375, 553), (1280, 800)]:
        async def main(call, ev):
            js = """(async () => { const wait = (ms) => new Promise((r) => setTimeout(r, ms));
              speak = () => Promise.resolve(); speakScript = () => Promise.resolve(); window.confirm = () => true;
              state.stage = 'main'; state.kanaKnown = true; state.introSeen = true; state.storyV = 99; state.startChosen = true; state.currentUnit = DATA.UNITS[DATA.UNITS.length - 1].id; saveState();
              const fresh = () => { state.srs = {}; state.lessonSeen = []; state.mistakes = []; DAILY_CACHE = null; };
              const click = (sel) => { const el = document.querySelector(sel); if (!el) return false; el.click(); return true; };
              // a card of the set as a player does it: a preview's button; an answer (every third a wrong one, 我不會 on a tile question) and 下一題
              const step = async (k) => { const e = currentEntry();
                if (e.preview && !e.previewDone) { click('#btnNext'); await wait(60); return 'preview'; }
                if (!e.q) { prepareEntry(SESSION.idx); return 'prepare'; }
                if (!e.done) { const q = e.q, sel = q.custom ? '.q-card [data-act="custom-giveup"]' : '.q-card [data-act="answer"][data-i="' + ((q.answer + (k % 3 === 1 ? 1 : 0)) % q.options.length) + '"]'; if (!click(sel)) answerCurrent(q.answer); await wait(50); }
                if (!click('#btnNext')) nextQuestion(); await wait(50); return 'answer'; };
              const out = {}, errs = () => window.__nqErrs.length;
              fresh(); startSession('daily', {}); route(); await wait(300);
              let previews = 0, answered = 0, guard = 0;
              while (SESSION && SESSION.idx < SESSION.entries.length && guard++ < 300) { const what = await step(answered); if (what === 'preview') previews++; else if (what === 'answer') answered++; }
              await wait(500);   // the observers' last word, a frame or two after the view is drawn over
              out.played = { previews, answered, summary: Boolean(document.querySelector('.ring')), errs: errs() };
              click('[data-act="close-summary"]'); await wait(300); out.closed = { errs: errs(), hash: location.hash };
              fresh(); startSession('daily', {}); route(); await wait(300);
              previews = 0; answered = 0; guard = 0;
              while (SESSION && answered < 4 && guard++ < 300) { const what = await step(answered); if (what === 'preview') previews++; else if (what === 'answer') answered++; }
              click('[data-act="exit-practice"]'); await wait(500);
              out.quit = { previews, answered, summary: Boolean(document.querySelector('.ring')), errs: errs() };
              click('[data-act="close-summary"]'); await wait(300);
              fresh(); startSession('daily', {}); route(); await wait(300);
              guard = 0; while (SESSION && guard++ < 50) { const e = currentEntry(); if (e.preview && !e.previewDone) { click('#btnNext'); await wait(60); continue; } if (!e.q) { prepareEntry(SESSION.idx); continue; } break; }
              const onQuestion = Boolean(document.querySelector('#view > .q-card.pq-fit')); click('[data-act="exit-practice"]'); await wait(500);
              out.left = { onQuestion, gone: !SESSION, hash: location.hash, errs: errs() };
              out.errors = window.__nqErrs.slice(0, 6); return JSON.stringify(out); })()"""
            return json.loads(await ev(js, 240))
        r = drive(b, w, h, main, inject=ERRORS)
        assert r['played']['previews'] >= 3 and r['played']['answered'] >= 15 and r['played']['summary'], (w, h, r['played'])   # a set of new words, previews among its cards, to its summary
        assert r['quit']['previews'] >= 1 and r['quit']['answered'] == 4 and r['quit']['summary'], (w, h, r['quit'])   # ✕ after four answers: the summary of a set cut short
        assert r['left']['onQuestion'] and r['left']['gone'] and r['left']['hash'] == '#/today', (w, h, r['left'])   # ✕ on a question: out of practice
        assert r['errors'] == [] and r['left']['errs'] == 0, (w, h, r['played']['errs'], r['quit']['errs'], r['left']['errs'], r['errors'])

TESTS = [f for n, f in sorted(globals().items()) if n.startswith('test_') and callable(f)]
if __name__ == "__main__":
    srv = subprocess.Popen([sys.executable, os.path.join(ROOT, "tests", "e2e", "serve.py"), str(PORT), "--bind", "127.0.0.1"], cwd=ROOT, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(0.8)
    only = sys.argv[1:]
    failed = 0
    try:
        for t in TESTS:
            if only and t.__name__ not in only: continue
            err = None
            for attempt in (1, 2):   # a second try with a fresh browser absorbs load-related flakiness
                with Browser() as b:
                    try:
                        t0 = time.time(); t(b); print("ok  ", t.__name__ + (" (retry)" if attempt == 2 else ""), f"({time.time() - t0:.0f} s)"); err = None; break
                    except Exception as e:
                        err = e
            if err is not None:
                failed += 1; print("FAIL", t.__name__, "-", str(err)[:900])
    finally:
        srv.terminate()
    print("ALL PASS" if not failed else f"{failed} FAILED")
    sys.exit(1 if failed else 0)
