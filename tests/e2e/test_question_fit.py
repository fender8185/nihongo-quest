"""2026-11-28 (test.5, Task 4): 每種題目在各種螢幕一開始就看得到全部選項——every practice question the app can build shows, at every size of the
matrix and from its first frame, all its options (an audio option's two buttons, the tiles with 確定 and 我不會, 配對's words) whole and
tapped at their middle, and its stem at least beginning in sight; answered, 下一題 is in sight and, on a phone, nothing under the result moved.

The user: 「這種還是要讓使用者一開始就能看得到選項」 and 「但感覺還是必須全面適配各種size，畢竟之後還是要上架到app store 和 googlestore」.

A deterministic sample of the full sweep (.superpowers/sdd/2026-11-27-test5-practice/t4-sweep.py: every question of every format, 37,000-odd,
at the 8 sizes in every state; 12–14 minutes): every grammar, listening, reading, kanji, kana and 變化練習 question is built, and of each
vocabulary format the words its question is likeliest longest in and a stride over the rest; then of each format its 12 longest questions
(by their text) and a stride over the rest, about 40, are drawn at each size — new, as a word missed again and again (錯題複習 and 常錯: the
widest label row), a listening question with its progress line up — and the 12 longest also under a session's note and answered."""
import asyncio, json, os, subprocess, sys, time
sys.path.insert(0, os.path.dirname(__file__))
import websockets
from cdp import Browser
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
PORT = 8839
URL = f"http://127.0.0.1:{PORT}/"
READY = "typeof state === 'object' && !!state.updatedAt && typeof speakScript === 'function'"
SIZES = [(360, 640), (375, 553), (390, 664), (412, 780), (430, 740), (768, 1024), (1024, 768), (1280, 800)]

def page(b, w, h, js, timeout=600):
    """js evaluated in b's page, opened at w×h: a phone's emulation (scale 2) up to 600 px wide; a touch screen up to 1024 (the phones, an
    iPad either way up), a keyboard and a mouse at 1280. One CDP session from the metrics to the value, so the emulation holds throughout"""
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
            await call("Emulation.setDeviceMetricsOverride", {"width": w, "height": h, "deviceScaleFactor": 2 if mobile else 1, "mobile": mobile})
            await call("Emulation.setTouchEmulationEnabled", {"enabled": True, "maxTouchPoints": 5} if touch else {"enabled": False})
            await call("Storage.clearDataForOrigin", {"origin": URL.rstrip("/"), "storageTypes": "all"})
            await call("Page.navigate", {"url": URL})
            for _ in range(450):
                try:
                    if await ev(READY, 10): break
                except Exception: pass
                await asyncio.sleep(0.1)
            return await ev(js, timeout)
    return asyncio.run(go())

# the questions (each built with Math.random seeded by its place in the list, so a question is the same wherever it is built), drawn as the
# current card and measured: every answer control inside the screen and every box that clips it, and hit at its middle; the stem's first
# line (a play button, a picture, a word) in sight and not covered. A question's text length: its stem's, its options', its tiles' and the
# Chinese under it, furigana left out
KIT = r"""const wait = (ms) => new Promise((r) => setTimeout(r, ms)), R0 = Math.random;
  const seed = (s) => { let a = s >>> 0; Math.random = () => { a |= 0; a = a + 0x6D2B79F5 | 0; let x = Math.imul(a ^ a >>> 15, 1 | a); x = x + Math.imul(x ^ x >>> 7, 61 | x) ^ x; return ((x ^ x >>> 14) >>> 0) / 4294967296; }; };
  const LEECH = () => ({ b: 2, s: 5, d: 5, due: todayStr(), n: 6, ok: 2, ng: 4, st: 0, last: addDays(todayStr(), -3), lapse: 5, intro: addDays(todayStr(), -40), leech: true, rl: 1, f: {} });
  const SEL = '.q-card .opt:not(.opt-audio), .q-card .opt-play, .q-card .opt-pick, .q-card .spell-tile, .q-card .order-tile, .q-card .match-word, .q-card .match-meaning, .q-card [data-act="tiles-submit"], .q-card [data-act="custom-giveup"], .q-card .conj-in, .q-card [data-act="conj-submit"]';
  speak = () => Promise.resolve(); speakScript = () => Promise.resolve();
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
    return L; };
  const held = (key, rec, fn) => { const keep = state.srs[key]; state.srs[key] = rec; try { return fn(); } finally { if (keep) state.srs[key] = keep; else delete state.srs[key]; } };
  const make = (it, ctx, i) => { seed(7000 + i);
    try {
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
  // of each format (its tag: v-cloze and v-cloze+kana apart), the 12 longest, then every n-th of the rest to about 40
  const sample = () => { const by = {}; QS.forEach((x) => { (by[x.tag] = by[x.tag] || []).push(x); }); const out = [];
    Object.values(by).forEach((xs) => { xs.forEach((x) => { x.len = size(x.q); }); xs.sort((a, c) => c.len - a.len || a.i - c.i);
      const top = xs.slice(0, 12), rest = xs.slice(12), n = Math.max(1, Math.ceil(rest.length / 28)); top.forEach((x) => { x.top = true; });
      out.push(...top, ...rest.filter((_, k) => k % n === 0)); });
    return out.sort((a, c) => a.i - c.i); };
  const it0 = REG.vocab.find((v) => v.builtin); startSession('items', { items: [it0, it0] }); route(); const e = currentEntry(); e.preview = false;
  const NOTE = '最近錯得比較多、錯題本比較滿，今天新內容少一點（5 題）。先把 N5 的單字（還剩 12 個）和漢字（還剩 8 個）學完，再開始第 3–4 週・て形。';
  const draw = (x, mode) => { const { it, q } = x; e.item = it; e.q = q; e.done = false; e.chosen = undefined; e.requeued = false; e.encore = false;
    ['spell', 'order', 'zh', 'conj', 'match', 'blockH', 'pqRowH', 'pqCardH', 'typed', 'zhShown'].forEach((k) => delete e[k]);
    e.autoPlayed = true; e.rpTop = 0; e.rpStem = 0; e.rpSub = 0; e.rpCard = 0; e.rpStemH = 0;
    SESSION.idx = 0; SESSION.meta = Object.assign({}, SESSION.meta, { note: mode === 'note' ? NOTE : '' });
    if (q.key) { if (mode === 'leech') state.srs[q.key] = LEECH(); else delete state.srs[q.key]; }
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
  // answered as answerCurrent draws it (a wrong pick; its hold first), without its bookkeeping: 下一題 whole in sight and hit, and what moved —
  // the label row's, the instruction's and the stem's tops, the options' (the tiles', 配對's words') tops and heights; not an audio option's
  // (answered, it shows its words: 聽力's 即時應答 and 情境表達, as before)
  const spots = () => [...document.querySelectorAll('.q-card > :is(.q-label, .q-instr, .q-stem)' + (e.q.audioOptions ? '' : ', .q-card .opt, .q-card :is(.spell-tile, .order-tile, .match-word, .match-meaning)'))].map((el) => {
    const r = el.getBoundingClientRect(); return [Math.round(r.top * 2) / 2, el.matches('.q-card > *') ? 0 : Math.round(r.height * 2) / 2]; });
  const answer = (x) => { const t0 = spots(); if (typeof pqHold === 'function') pqHold(e); e.done = true; e.chosen = x.q.custom ? 1 : (x.q.answer + 1) % x.q.options.length; renderPractice();
    const nb = document.getElementById('btnNext'), t1 = spots(), moved = t0.length !== t1.length ? -1 : t0.filter((p, k) => Math.abs(p[0] - t1[k][0]) > 0.5 || Math.abs(p[1] - t1[k][1]) > 0.5).length;
    return [Boolean(nb) && whole(nb) && hit(nb, '#btnNext'), moved]; };
  // the sample measured at this size: every state; the ones that fail as [key, format, tag, state, the check]
  const run = async (xs) => { for (const x of xs) { draw(x, 'new'); void document.body.offsetHeight; } await wait(300); if (document.fonts) await document.fonts.ready; await wait(100);
    const fails = [], next = [], moves = [], n = {};
    for (const x of xs) { n[x.q.fmt] = (n[x.q.fmt] || 0) + 1;
      for (const mode of ['new', 'leech'].concat(x.q.fmt === 'l-dialog' || x.q.fmt === 'l-resp' ? ['prog'] : [], x.top ? ['note'] : [])) { draw(x, mode); const m = check(); if (bad(m)) fails.push([x.q.key || x.it.key, x.q.fmt, x.tag, mode, m]); }
      if (x.top) { draw(x, 'new'); const [shown, moved] = answer(x); if (!shown) next.push([x.q.key || x.it.key, x.q.fmt]); if (moved) moves.push([x.q.key || x.it.key, x.q.fmt, moved]); } }
    if (e.q && e.q.key) delete state.srs[e.q.key]; SESSION = null; document.body.classList.remove('practicing');
    return { n, fails, next, moves }; };"""

FORMATS = {'v-meaning', 'v-recall', 'v-cloze', 'v-reading', 'v-kanji', 'v-listen', 'v-spell', 'v-match', 'v-pic', 'v-para', 'g-choice', 'g-meaning', 'g-zh', 'g-fill-type', 'g-order',
           'g-conj', 'g-conj-type', 'g-adj', 'g-adj-type', 'g-identify', 'l-dialog', 'l-resp', 'l-scene', 'r-passage', 'k-meaning', 'k-shape', 'k-read', 'a-read', 'a-sound', 'a-pair', 'a-word'}

def test_every_question_shows_all_its_options_from_its_first_frame_at_every_size(b):
    # built once at the first size (9,000-odd questions); each size builds again only the sample, by its places in the list
    first = "(async () => { " + KIT + """ build(); const S = sample(); const idx = S.map((x) => x.i), top = S.filter((x) => x.top).map((x) => x.i);
      const by = {}; QS.forEach((x) => { by[x.q.fmt] = (by[x.q.fmt] || 0) + 1; });
      const r = await run(S); return JSON.stringify(Object.assign(r, { idx, top, built: QS.length, by })); })()"""
    w, h = SIZES[0]
    r0 = json.loads(page(b, w, h, first, 900))
    assert r0['built'] > 8000 and set(r0['by']) == FORMATS, (r0['built'], sorted(r0['by']))   # every format the app asks in
    assert set(r0['n']) == FORMATS and all(v >= 12 for k, v in r0['n'].items() if r0['by'][k] >= 12), r0['n']   # each sampled: its longest and a stride
    results = {(w, h): r0}
    for w, h in SIZES[1:]:
        js = "(async () => { " + KIT + f""" const idx = {json.dumps(r0['idx'])}, top = new Set({json.dumps(r0['top'])}); build(idx); QS.forEach((x) => {{ x.top = top.has(x.i); }});
          return JSON.stringify(await run(QS)); }})()"""
        results[(w, h)] = json.loads(page(b, w, h, js, 600))
    for (w, h), r in results.items():
        assert sum(r['n'].values()) == len(r0['idx']), (w, h, sum(r['n'].values()))   # the same sample at every size
        assert r['fails'] == [], (w, h, len(r['fails']), r['fails'][:8])   # every option whole and tapped, the stem begun — new, missed again and again, playing, under a note
        assert r['next'] == [], (w, h, r['next'][:8])   # answered: 下一題 in sight and tapped
        # answered on a phone nothing under the result panel moves (the card keeps its height; an audio option's top stays as it shows its
        # words). A wide screen shows the result under the options as before, with what it always did there — a listening or a kana-read
        # word's words or kanji over the options, the wrong options' asides, a filled blank's line — its 下一題 held in sight (above)
        if w <= 600: assert r['moves'] == [], (w, h, r['moves'][:8])

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
