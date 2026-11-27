"""2026-11-27 (test.5, Task 3): 作答畫面的新樣式「A 極簡版」(A2，the user's pick) — 16 px 的進度條和騎在填色前端的梅花珠、夜晚原樣的題數（白天是書籤標籤）、
題型小色標、圓角選項卡和選項的數字圓章、結果的上緣色條和圓圈裡的 ✓／×、平的琥珀色下一題；白天和夜晚的對比都至少 4.5:1；減少動態時珠子和圓圈都不動。

The user: 「我希望目前答題的那個進度條可以粗一點然後有一點風格，現在的每日練習的作答介面有些太像工程師用的沒有包裝過」; of the mockups 「A不錯但有點太花了尤其
是選項的那個線」, 「剩下幾分鐘之幾的那個底色如果是夜晚版太顯眼了跟原本一樣」; the pick 「A2A極簡版」."""
import asyncio, json, os, subprocess, sys, time
sys.path.insert(0, os.path.dirname(__file__))
import websockets
from cdp import Browser
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
PORT = 8838
URL = f"http://127.0.0.1:{PORT}/"
READY = "typeof state === 'object' && !!state.updatedAt && typeof speakScript === 'function'"

def page(b, w, h, js, touch=None, reduce=False):
    """js evaluated in b's page, opened at w×h: a phone's emulation (scale 2, a touch screen: no hover, a coarse pointer) up to 600 px wide
    unless touch says otherwise, a desktop's beyond; motion reduced (prefers-reduced-motion) when asked. One CDP session from the metrics
    to the value, so the emulation holds throughout"""
    mobile = w <= 600 if touch is None else touch
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
            async def ev(src):
                r = await call("Runtime.evaluate", {"expression": src, "returnByValue": True, "awaitPromise": True})
                if "exceptionDetails" in r: raise RuntimeError(r["exceptionDetails"].get("exception", {}).get("description", "eval error"))
                return r["result"].get("value")
            await call("Page.enable"); await call("Page.addScriptToEvaluateOnNewDocument", {"source": "window.NQ_E2E = 1"})
            await call("Emulation.setDeviceMetricsOverride", {"width": w, "height": h, "deviceScaleFactor": 2 if mobile else 1, "mobile": mobile})
            await call("Emulation.setTouchEmulationEnabled", {"enabled": True, "maxTouchPoints": 5} if mobile else {"enabled": False})
            await call("Emulation.setEmulatedMedia", {"features": [{"name": "prefers-reduced-motion", "value": "reduce" if reduce else "no-preference"}]})
            await call("Storage.clearDataForOrigin", {"origin": URL.rstrip("/"), "storageTypes": "all"})   # a fresh install each time (a test opens the page more than once)
            await call("Page.navigate", {"url": URL})
            for _ in range(450):
                try:
                    if await ev(READY): break
                except Exception: pass
                await asyncio.sleep(0.1)
            return await ev(js)
    return asyncio.run(go())

# a main-course account at week 1 (nothing learned); colours read as [r, g, b, a] — rgb(), rgba() or color(srgb …), as color-mix() gives — and
# WCAG ratios of a text's colour (over what it sits on) to what it sits on (the flat backgrounds of the element and its ancestors, composed)
KIT = r"""const wait = (ms) => new Promise((r) => setTimeout(r, ms)), box = (el) => el.getBoundingClientRect();
  const theme = (t) => { state.settings.theme = t; saveState(); applyTheme(); };
  speak = () => Promise.resolve(); speakScript = () => Promise.resolve();   // no voice: a listening question's progress line stays put
  state.stage = 'main'; state.kanaKnown = true; state.introSeen = true; state.storyV = 9; state.startChosen = true; state.currentUnit = 'm1'; saveState(); DAILY_CACHE = null;
  const rgba = (s) => { let m = String(s).match(/^rgba?\(([^)]+)\)$/); if (m) { const p = m[1].split(/[\s,\/]+/).filter(Boolean).map(Number); return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1]; }
    m = String(s).match(/^color\(srgb ([^)]+)\)$/); if (m) { const p = m[1].split(/[\s\/]+/).filter(Boolean).map(Number); return [p[0] * 255, p[1] * 255, p[2] * 255, p.length > 3 ? p[3] : 1]; } return null; };
  const over = (t, b) => [0, 1, 2].map((i) => t[i] * t[3] + b[i] * (1 - t[3])).concat(1);
  const lum = (c) => { const f = (v) => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }; return .2126 * f(c[0]) + .7152 * f(c[1]) + .0722 * f(c[2]); };
  const ratio = (a, b) => { const x = lum(a), y = lum(b); return Math.round((Math.max(x, y) + .05) / (Math.min(x, y) + .05) * 100) / 100; };
  const hex = (c) => c && '#' + c.slice(0, 3).map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');
  const bgOf = (el) => { const chain = []; for (let n = el; n; n = n.parentElement) chain.unshift(n); let c = [255, 255, 255, 1];
    chain.forEach((n) => { const k = rgba(getComputedStyle(n).backgroundColor); if (k && k[3] > 0) c = over(k, c); }); return c; };
  const read = (el, prop = 'color') => ratio(over(rgba(getComputedStyle(el)[prop]), bgOf(el)), bgOf(el));   // its text (or a stroke: prop) on what it sits on
  // an item asked as the current card, a question of it given or built, its preview skipped, the fonts in
  const ask = async (item, q) => { startSession('items', { items: [item, item] }); route(); const e = currentEntry(); e.preview = false; e.autoPlayed = true;
    e.q = q || makeQuestion(item, {}); renderPractice(); window.scrollTo(0, 0); await wait(60); if (document.fonts) await document.fonts.ready; return e; };
  const word = (w) => REG.vocab.find((v) => v.builtin && jaPlain(v.w) === w);
  const done = () => { SESSION = null; document.body.classList.remove('practicing'); };"""
PHONE, WIDE = (390, 664), (1280, 800)
KIND = {'v': ('單字', '#b8463a'), 'g': ('文法', '#3e5f8e'), 'l': ('聽力', '#477754'), 'r': ('閱讀', '#6b4d8a'), 'k': ('漢字', '#8a6620'), 'a': ('假名', '#a94a63'), 'c': ('變化練習', '#2f6f73'), 'm': ('錯題本', '#55525e')}

def _hx(s): return [int(s[i:i + 2], 16) for i in (1, 3, 5)]
def near(a, b, tol=2.5): return a is not None and all(abs(x - y) <= tol for x, y in zip(_hx(a), _hx(b)))
def mix(a, b, p): x, y = _hx(a), _hx(b); return '#' + ''.join('%02x' % round(x[i] * p + y[i] * (1 - p)) for i in range(3))
def kind_fill(k, t): return KIND[k][1] if t == 'day' else mix(KIND[k][1], '#1c1e38', .76)   # 課程's covers: full by day, 76% under the night lamps

# the bar (prBarHtml): 16 px, the bead (24 px) centred on the fill's end at 0%, 50% and 100%, in sight (not clipped, nothing over it) and inside
# the strip's gaps (clear of ✕ and the count); a plain .bar elsewhere keeps its 8 px, its border and its clipped fill; the 模擬考 keeps its bar
def test_the_bar_is_16px_with_its_bead_at_the_fills_end(b):
    js = "(async () => { " + KIT + """ theme('night'); await ask(word('学校'), makeVocabQuestion(word('学校'), { forceFmt: 'v-meaning' })); const sc = sessionCount, out = {};
      for (const pct of [0, 50, 100]) { window.sessionCount = () => ({ before: pct, n: Math.max(1, pct), total: 100 }); SESSION.barPct = pct; renderPractice(); await wait(30);
        const bar = document.querySelector('.pr-top > .bar'), fill = bar.firstElementChild, bead = fill.querySelector('.pq-bead'), B = box(bar), F = box(fill), D = box(bead);
        const x = box(document.querySelector('.pr-top > .btn-icon')), c = box(document.querySelector('.pr-top > .pr-count')), hit = document.elementFromPoint(D.left + D.width / 2, D.top + D.height / 2);
        out[pct] = { h: B.height, fill: Math.round(F.width / B.width * 100), x: Math.round((D.left + D.width / 2 - F.right) * 2) / 2, y: Math.round((D.top + D.height / 2 - B.top - B.height / 2) * 2) / 2,
          size: [D.width, D.height], seen: hit === bead, clear: D.left >= x.right && D.right <= c.left }; }
      window.sessionCount = sc; done();
      const plain = document.createElement('div'); plain.className = 'bar'; plain.innerHTML = '<span style="width:50%"></span>'; document.body.appendChild(plain);
      out.plain = { h: box(plain).height, over: getComputedStyle(plain).overflowX, border: getComputedStyle(plain).borderTopWidth }; plain.remove();
      window.speak = () => Promise.resolve(); window.speakScript = () => Promise.resolve(); location.hash = '#/exam'; route(); await wait(300); startExam(); await wait(600);
      const xb = document.querySelector('#view .pr-top > .bar');
      out.exam = { bar: xb ? [xb.className, box(xb).height] : null, card: Boolean(document.querySelector('#view .q-card')), pq: document.querySelectorAll('#view [class*="pq-"]').length };
      return JSON.stringify(out); })()"""
    for w, h in (PHONE, WIDE):
        r = json.loads(page(b, w, h, js))
        for pct in ('0', '50', '100'):
            x = r[pct]
            assert x['h'] == 16 and x['fill'] == int(pct) and x['x'] == 0 and x['y'] == 0 and x['size'] == [24, 24] and x['seen'] and x['clear'], (w, h, pct, x)
        assert r['plain'] == {'h': 8, 'over': 'hidden', 'border': '1px'}, (w, h, r['plain'])   # other bars as before
        assert r['exam'] == {'bar': ['bar', 8], 'card': True, 'pq': 0}, (w, h, r['exam'])   # the 模擬考's runner keeps today's look

# the count (prCountHtml): by night today's plain count — no background, no padding, its weight (the user: the pill was too bright by night);
# by day a quiet book label (--label, 2 px 9 px, bold); its text the same; 4.5:1 either way
def test_the_count_is_plain_by_night_and_a_label_by_day(b):
    js = "(async () => { " + KIT + """ await ask(word('学校'), makeVocabQuestion(word('学校'), { forceFmt: 'v-meaning' })); const out = {};
      for (const t of ['night', 'day']) { theme(t); renderPractice(); const c = document.querySelector('.pr-top > .pr-count'), cs = getComputedStyle(c), bg = rgba(cs.backgroundColor);
        out[t] = { text: c.textContent.trim(), bg: bg[3] ? hex(bg) : 'none', pad: cs.padding, weight: cs.fontWeight, ratio: read(c) }; }
      done(); return JSON.stringify(out); })()"""
    for w, h in (PHONE, WIDE):
        r = json.loads(page(b, w, h, js))
        n, d = r['night'], r['day']
        assert n['bg'] == 'none' and n['pad'] == '0px' and n['weight'] == '400' and n['ratio'] >= 4.5, (w, h, n)
        assert d['bg'] == '#f6efdf' and d['pad'] == '2px 9px' and d['weight'] == '700' and d['ratio'] >= 4.5, (w, h, d)
        assert n['text'] == d['text'] and '/' in n['text'], (w, h, r)

# every kind the app asks — 單字 文法 聽力 閱讀 漢字 假名 變化練習 錯題本 — a small filled label at the head of the label row naming it, in its
# colour (by night dimmed as 課程's covers are), its text 4.5:1 on its fill; the row's own text without the kind's word; 新 an outline in the
# kind's ink, 4.5:1 on the page. By night and by day
def test_each_kind_has_its_label_in_its_colour(b):
    js = "(async () => { " + KIT + """ const t = todayStr(), out = {};
      const mk = (id, prompt, answer) => ({ id, cat: '單字', prompt, answer, wrong: '', why: '', count: 1, streak: 0, mastered: false, note: '', date: t });
      state.mistakes = [mk('mk_a', 'さくら', '櫻花'), mk('mk_b', 'うめ', '梅花'), mk('mk_c', 'もも', '桃子'), mk('mk_d', 'きく', '菊花')];
      const g = REG.grammar.find((x) => x.u === 'm1' && (x.t || 'choice') === 'choice'), c = REG.drills[0];
      const kinds = { v: [word('学校'), makeVocabQuestion(word('学校'), { forceFmt: 'v-meaning' })], g: [g, makeQuestion(g, { choiceOnly: true })], l: [REG.listen.find((x) => x.lv === 'N5')],
        r: [REG.read.find((x) => x.lv === 'N5')], k: [REG.kanji.find((x) => x.lv === 'N5')], a: [REG.kana[0]], c: [c, makeQuestion(c, { choiceOnly: true })] };
      const look = () => { const lab = document.querySelector('.q-card > .q-label'), tag = lab.firstElementChild, rest = tag.nextElementSibling, chip = lab.querySelector('.chip-accent');
        const page = bgOf(document.querySelector('.q-card')), cc = chip && getComputedStyle(chip);
        return { kind: document.querySelector('.q-card').dataset.pqKind, tag: tag.classList.contains('pq-kind-tag') ? tag.textContent : null, fill: hex(rgba(getComputedStyle(tag).backgroundColor)), ratio: read(tag),
          rest: rest ? rest.textContent : '', label: currentEntry().q.label,
          chip: chip ? { text: chip.textContent, bg: rgba(cc.backgroundColor)[3], edge: hex(rgba(cc.borderTopColor)), ink: hex(rgba(cc.color)), ratio: ratio(rgba(cc.color), page) } : null }; };
      for (const th of ['night', 'day']) { theme(th); out[th] = {};
        for (const [k, [it, q]] of Object.entries(kinds)) { await ask(it, q); out[th][k] = look(); }
        startSession('mistakes'); route(); renderPractice(); await wait(30); out[th].m = look(); }
      done(); return JSON.stringify(out); })()"""
    for w, h in (PHONE, WIDE):
        r = json.loads(page(b, w, h, js))
        for t in ('night', 'day'):
            assert sorted(r[t]) == sorted(KIND), (w, h, t, sorted(r[t]))
            for k, (name, _) in KIND.items():
                x = r[t][k]
                assert x['kind'] == k and x['tag'] == name and x['ratio'] >= 4.5, (w, h, t, k, x)
                assert near(x['fill'], kind_fill(k, t)), (w, h, t, k, x['fill'], kind_fill(k, t))
                assert not x['rest'].startswith(name) and x['label'] == f"{name} · {x['rest']}", (w, h, t, k, x)   # the row's text: the label without its kind
                if k != 'm':   # a new item's 新: an outline in the kind's ink (the notebook's card has no 新)
                    c = x['chip']
                    assert c and c['text'] == '新' and c['bg'] == 0 and c['edge'] == c['ink'] and c['ratio'] >= 4.5, (w, h, t, k, c)

# each option's number (the options' own .kbd) a quiet badge where there is a keyboard and a fine pointer — 1–4, a 22 px circle at the
# option's left and in its middle, 4.5:1; answered, the right one's in --ok, the picked wrong one's in --bad, 4.5:1 — and none on a touch
# screen (2026-11-11, the user; Ruling 37): not on a word question, a kana glyph question or a reading question's panel, at a phone's sizes
# and a tablet's; the key hint 按 1–4 作答 with the badges. By night and by day
def test_option_numbers_show_with_a_keyboard_and_never_on_a_touch_screen(b):
    js = "(async () => { " + KIT + """ const v = word('学校'), out = {};
      const nums = () => [...document.querySelectorAll('.q-card .opt')].map((o) => { const n = o.querySelector(':scope > .kbd'), cs = getComputedStyle(n), N = box(n), O = box(o);
        return { text: n.textContent, shown: cs.display !== 'none', size: [N.width, N.height], round: cs.borderTopLeftRadius === '50%', left: Math.round(N.left - O.left),
          mid: Math.abs((N.top + N.bottom) / 2 - (O.top + O.bottom) / 2) <= 1, ratio: cs.display !== 'none' ? read(n) : 0 }; });
      const hint = () => { const k = document.querySelector('.pr-actions .kbd-hint'); return Boolean(k) && getComputedStyle(k).display !== 'none'; };
      for (const th of ['night', 'day']) { theme(th); const e = await ask(v, makeVocabQuestion(v, { forceFmt: 'v-meaning' })); out[th] = { word: nums(), hint: hint() };
        await ask(REG.kana[0], makeQuestion(REG.kana[0], { forceFmt: 'a-read' })); out[th].glyph = nums(); out[th].glyphOpts = Boolean(document.querySelector('.opts.glyph'));
        await ask(REG.read.find((x) => x.lv === 'N5')); out[th].reading = nums();
        const e2 = await ask(v, makeVocabQuestion(v, { forceFmt: 'v-meaning' })), pick = (e2.q.answer + 1) % 4; answerCurrent(pick); await wait(30);
        const badge = (i) => { const n = document.querySelectorAll('.q-card .opt')[i].querySelector('.kbd'), cs = getComputedStyle(n); return { shown: cs.display !== 'none', bg: hex(rgba(cs.backgroundColor)), ratio: cs.display !== 'none' ? read(n) : 0 }; };
        const root = getComputedStyle(document.documentElement);
        out[th].answered = { right: badge(e2.q.answer), wrong: badge(pick), okv: root.getPropertyValue('--ok').trim(), badv: root.getPropertyValue('--bad').trim() }; }
      done(); return JSON.stringify(out); })()"""
    for (w, h, touch) in ((390, 664, True), (430, 740, True), (768, 1024, True), (390, 664, False), (1280, 800, False)):
        r = json.loads(page(b, w, h, js, touch=touch))
        for t in ('night', 'day'):
            x = r[t]
            assert x['glyphOpts'] and x['hint'] == (not touch), (w, h, touch, t, x)
            for k in ('word', 'glyph', 'reading'):
                assert [o['text'] for o in x[k]] == ['1', '2', '3', '4'], (w, h, touch, t, k, x[k])
                assert all(o['shown'] != touch for o in x[k]), (w, h, touch, t, k, x[k])   # four with a keyboard, none on a touch screen
            if touch:
                assert not x['answered']['right']['shown'] and not x['answered']['wrong']['shown'], (w, h, touch, t, x['answered'])
                continue
            for o in x['word'] + x['reading']:
                assert o['size'] == [22, 22] and o['round'] and 10 <= o['left'] <= 18 and o['mid'] and o['ratio'] >= 4.5, (w, h, t, o)
            assert all(o['size'] == [22, 22] and o['round'] and o['ratio'] >= 4.5 for o in x['glyph']), (w, h, t, x['glyph'])   # in the corner
            a = x['answered']
            assert near(a['right']['bg'], a['okv']) and near(a['wrong']['bg'], a['badv']) and a['right']['ratio'] >= 4.5 and a['wrong']['ratio'] >= 4.5, (w, h, t, a)

# the result's head (phone's panel and the box under the options on a wide screen): ✓ or × in a 28 px circle of --ok／--bad, its stroke in
# --pq-on-mark (3:1 at least: a mark, not text), the head's words 4.5:1 on the panel; a 4 px ok／bad edge along its rounded top (a top border
# of the slip's own 14 px corner curve, no flat strip: fix round 1); 下一題 flat amber, its words 4.5:1; the circle pops in (in the panel once
# it has risen). Right and wrong, by night and by day
def test_the_result_heads_circle_right_and_wrong(b):
    js = "(async () => { " + KIT + """ const v = word('学校'), out = {};
      for (const th of ['night', 'day']) { theme(th); for (const right of [true, false]) { const e = await ask(v, makeVocabQuestion(v, { forceFmt: 'v-meaning' }));
        answerCurrent(right ? e.q.answer : (e.q.answer + 1) % 4); await wait(30);
        const sheet = document.querySelector('.fb-sheet'), slip = sheet || document.querySelector('.q-card .feedback'), head = slip.querySelector('.fb-head'), svg = head.querySelector(':scope > svg:first-child');
        const cs = getComputedStyle(svg), edge = getComputedStyle(slip, '::before'), next = document.getElementById('btnNext'), ncs = getComputedStyle(next), root = getComputedStyle(document.documentElement);
        const mark = right ? '--ok' : '--bad';   // its size as laid out (it is mid-pop now: scaled)
        out[th + (right ? 'Right' : 'Wrong')] = { sheet: Boolean(sheet), cls: head.className, size: [cs.width, cs.height], round: cs.borderTopLeftRadius === '50%', fill: hex(rgba(cs.backgroundColor)), want: root.getPropertyValue(mark).trim(),
          stroke: ratio(rgba(cs.color), rgba(cs.backgroundColor)), words: read(head.querySelector(':scope > span')),
          edge: [edge.content !== 'none', edge.borderTopWidth, hex(rgba(edge.borderTopColor)), edge.borderTopLeftRadius, edge.borderTopRightRadius, parseFloat(edge.height) >= 14, rgba(edge.backgroundColor)[3], getComputedStyle(slip).borderTopLeftRadius],
          next: [hex(rgba(ncs.backgroundColor)), hex(rgba(ncs.color)), ratio(rgba(ncs.color), rgba(ncs.backgroundColor))], pop: svg.getAnimations().map((a) => a.animationName) }; } }
      done(); return JSON.stringify(out); })()"""
    for w, h in (PHONE, WIDE):
        r = json.loads(page(b, w, h, js))
        for k, x in r.items():
            right = k.endswith('Right')
            assert x['sheet'] == (w <= 600) and x['cls'] == ('fb-head ok' if right else 'fb-head bad'), (w, h, k, x)
            assert x['size'] == ['28px', '28px'] and x['round'] and near(x['fill'], x['want']) and x['stroke'] >= 3, (w, h, k, x)
            assert x['words'] >= 4.5, (w, h, k, x)
            e = x['edge']   # drawn, 4 px, ok／bad, along the slip's own 14 px corners, as tall as they are, no fill
            assert e[0] and e[1] == '4px' and near(e[2], x['want']) and e[3] == e[4] == e[7] == '14px' and e[5] and e[6] == 0, (w, h, k, x)
            assert x['next'][0] == '#f0a660' and x['next'][1] == '#2e1c12' and x['next'][2] >= 4.5, (w, h, k, x)
            assert x['pop'] == ['iconPop'], (w, h, k, x)   # ✓ and × alike

# motion reduced (prefers-reduced-motion): the bar's fill — and the bead riding it — does not slide to its new place, and the result's circle
# does not pop; without it, both play (1.0.41's slide, the circle after the panel's rise)
def test_the_bead_and_the_circle_follow_reduced_motion(b):
    js = "(async () => { " + KIT + """ const v = word('学校'); const e = await ask(v, makeVocabQuestion(v, { forceFmt: 'v-meaning' })); answerCurrent(e.q.answer); await wait(30);
      const svg = document.querySelector(':is(.fb-sheet, .q-card) .fb-head > svg'), out = { pop: svg.getAnimations().map((a) => a.animationName) };
      nextQuestion(); await wait(30); const fill = document.querySelector('.pr-top > .bar > span'), cs = getComputedStyle(fill);
      out.slide = { cls: fill.className, names: fill.getAnimations().map((a) => a.animationName), ease: cs.transitionDuration };
      done(); return JSON.stringify(out); })()"""
    for w, h in (PHONE, WIDE):
        moving = json.loads(page(b, w, h, js))
        assert moving['pop'] == ['iconPop'] and moving['slide']['cls'] == 'slide' and moving['slide']['names'] == ['barSlide'], (w, h, moving)
        still = json.loads(page(b, w, h, js, reduce=True))
        assert still['pop'] == [] and still['slide']['names'] == [] and still['slide']['ease'] == '0s', (w, h, still)

# nothing moves on the answer, right or wrong (fix round 1): the label row's top, the instruction, the question and the options stay put —
# a new item (新 turning into dots), a review answered right and missed (錯題複習 comes), one missed into a leech (錯題複習 and 常錯 come), a
# word on the ladder missed into a leech (常錯 comes to a row already two lines at 360: it goes on one line, holding its height), a leech, an
# encore and a 再練一次 copy missed. Every chip is set into the row's line, so a row of chips is a line tall (20.8 px on a phone, 19.2 wide,
# BASE's height for a row with no chip), and before the answer no row wraps where BASE's did not (BASE: a chip's row 26.8, two lines 41.8).
# At 360, 375, 390, 412 and 430 wide and 1280; words asked by their kanji (one asked by its reading shows its kanji over the options once answered
# on a wide screen: 1.0.43), measured once the answer's pop is over
def test_nothing_moves_on_the_answer(b):
    js = "(async () => { " + KIT + """ const out = {}, t = todayStr(), v = word('勉強'), w2 = word('手紙');
      const rec = (o) => Object.assign({ b: 2, s: 5, d: 5, due: t, n: 3, ok: 3, ng: 0, st: 2, last: addDays(t, -5), lapse: 0, intro: addDays(t, -20), f: {} }, o);
      const tops = () => Object.fromEntries([...document.querySelectorAll('.q-card > :is(.q-label, .q-instr, .q-stem), .q-card .opt')].map((el, i) => [el.className.split(' ')[0] + i, Math.round(box(el).top * 10) / 10]));
      const row = () => Math.round(box(document.querySelector('.q-card > .q-label')).height * 10) / 10;
      const g = REG.grammar.find((x) => unitTag(x) === '第 1–2 週・格助詞' && (x.t || 'choice') === 'choice' && (makeQuestion(x, { choiceOnly: true }) || {}).fmt === 'g-choice');
      const cases = [['newRight', v, null, {}, true], ['newWrong', v, null, {}, false], ['reviewRight', w2, rec({}), {}, true], ['reviewWrong', w2, rec({}), {}, false],
        ['toLeech', w2, rec({ lapse: 3 }), {}, false], ['ladderToLeech', w2, rec({ rl: 1, lapse: 3 }), {}, false], ['leech', w2, rec({ rl: 1, lapse: 5, leech: true }), {}, false],
        ['encore', w2, rec({}), { encore: true }, false], ['redo', w2, rec({}), { requeued: true }, false]];
      // a phone: a grammar question on the ladder whose row is two lines at 360 (its unit's name, 錯題複習, the dots under) missed into a leech —
      // 常錯 would fill the dots' line (its options at the foot; on a wide screen its filled blank re-lays the sentence, BASE's own move)
      if (innerWidth <= 600) cases.push(['grammarLadderToLeech', g, rec({ rl: 1, lapse: 3 }), {}, false]);
      for (const [k, it, srs, flags, right] of cases) { if (srs) state.srs[it.key] = srs; else delete state.srs[it.key];
        const e = await ask(it, it.kind === 'g' ? makeQuestion(it, { choiceOnly: true }) : makeVocabQuestion(it, { forceFmt: 'v-meaning' })); Object.assign(e, flags); renderPractice(); await wait(30);
        const before = tops(), r0 = row(); answerCurrent(right ? e.q.answer : (e.q.answer + 1) % 4); await wait(1100); const after = tops();
        out[k] = { reveal: Boolean(e.q.revealHtml), rows: [r0, row()], moved: Object.keys(before).filter((n) => after[n] === undefined || Math.abs(after[n] - before[n]) > 0.5).map((n) => n + ' ' + Math.round((after[n] - before[n]) * 10) / 10) }; }
      // the row no wider than BASE's: 「單字」N5 · 例句填空 on the ladder or as an encore is one line at 360 (BASE's 26.8; the label at its first
      // width wrapped it to 41.8 — the review); drawn only, not answered (a fill-in's blank is filled on the answer)
      const m = word('毎晩'); out.cloze = {};
      for (const [k, srs, flags] of [['ladder', rec({ rl: 1, lapse: 1 }), {}], ['encore', rec({}), { encore: true }]]) { state.srs[m.key] = srs;
        const e = await ask(m, makeVocabQuestion(m, { forceFmt: 'v-cloze' })); Object.assign(e, flags); renderPractice(); await wait(30); out.cloze[k] = [e.q.label, row()]; }
      done(); return JSON.stringify(out); })()"""
    for w, h in ((360, 640), (375, 553), (390, 664), (412, 780), (430, 740), WIDE):
        r = json.loads(page(b, w, h, js))
        line = 20.8 if w <= 600 else 19.2
        cloze = r.pop('cloze')
        assert all(lab == '單字 · N5 · 例句填空' and h_ == line for lab, h_ in cloze.values()), (w, h, cloze)
        for k, x in r.items():
            assert not x['reveal'] and x['moved'] == [], (w, h, k, x)
        assert r['newRight']['rows'] == [line, line] and r['reviewRight']['rows'] == [line, line], (w, h, r)   # 新 a line tall, so are the dots
        for k in ('encore', 'redo', 'reviewWrong'):
            assert r[k]['rows'][0] == line, (w, h, k, r[k])   # a chip's row before the answer one line, as BASE's (26.8)
        assert r['leech']['rows'][0] == (35.8 if w <= 375 else line), (w, h, r['leech'])   # at 360 and 375 two lines, as BASE's (41.8); one line from 390, as BASE's (26.8)
        if w <= 600:
            x = r['grammarLadderToLeech']
            assert x['rows'][0] == (35.8 if w == 360 else line), (w, h, x)   # two lines at 360 (BASE 41.8), one from 375 (BASE 26.8)
            if w == 360: assert x['rows'][1] == line, (w, h, x)   # answered: one line, its height of before held under it

# every text in sight on the practice screens 4.5:1 to what it sits on (the mockup's walker, mock/tools/checks.js: a gradient behind counts each
# of its colours, the worst wins; opacity counted; text covered by the result panel, or drawn by ::before/::after or in an SVG, not seen),
# by night and by day, on a phone and a wide screen — a word, a grammar, a listening and a reading question, before and after a wrong answer
# (a right one for the word), a tile question before and given up, the word, grammar and kana previews and the 常錯 card; the result's
# chips (連對 3 and 這次記住了 in its head, 升到熟悉 and 已移出錯題本 by the level's dots: a phone's panel read at its top and at its end) and a
# spelled conjugation's miss (你的答案 with its wrong character marked) — each of those walked (fix round 1). Not the controls put out of
# use on purpose (WCAG's inactive components): the answer's other options faded, the used tiles, a 確定 not yet lit
WALK = r"""const toC = (s) => { s = String(s || '').trim(); if (s === 'transparent') return [0, 0, 0, 0]; return rgba(s); };
  const split = (s) => { const out = []; let d = 0, cur = ''; for (const ch of s) { if (ch === '(') d++; else if (ch === ')') d--; if (ch === ',' && d === 0) { out.push(cur.trim()); cur = ''; } else cur += ch; } if (cur.trim()) out.push(cur.trim()); return out; };
  const grads = (img, size) => { const out = []; out.cover = false; if (!img || img === 'none') return out; const ls = split(img), ss = split(size || 'auto');
    ls.forEach((l, i) => { const sz = ss[i % ss.length] || 'auto'; if (sz.split(/\s+/).some((v) => /^[\d.]+px$/.test(v) && parseFloat(v) <= 3)) return;
      const cs = []; const re = /rgba?\([^)]*\)|color\(srgb [^)]*\)|transparent/g; let m; while ((m = re.exec(l))) { const c = toC(m[0]); if (c) cs.push(c); }
      if (cs.length && cs.every((c) => c[3] >= 1) && /^linear-gradient/.test(l) && /^(auto|100% 100%|auto auto)$/.test(sz.trim())) out.cover = true; out.push(...cs); }); return out; };
  const mixC = (x, y, o) => [0, 1, 2].map((i) => x[i] * o + y[i] * (1 - o)).concat(1);
  const lows = () => { const bad = [], seen = new Set(), walked = [], tw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); let n = 0;
    for (let t = tw.nextNode(); t; t = tw.nextNode()) { if (!t.textContent.trim()) continue; const el = t.parentElement;
      if (!el || el.closest('svg, script, style, template, .faded, button:disabled:not(.opt), .koto-coin')) continue;
      const cs = getComputedStyle(el); if (cs.visibility !== 'visible' || cs.display === 'none') continue;
      const rg = document.createRange(); rg.selectNodeContents(t); const r = [...rg.getClientRects()].find((x) => x.width > 1 && x.height > 1); if (!r) continue;
      const cx = r.left + Math.min(r.width / 2, 8), cy = r.top + r.height / 2; if (cx < 0 || cy < 0 || cx > innerWidth || cy > innerHeight) continue;
      const top = document.elementFromPoint(cx, cy); if (!top || !(top === el || el.contains(top) || top.contains(el))) continue;
      const chain = []; for (let k = el; k && k.nodeType === 1; k = k.parentElement) chain.unshift(k);
      let set = [[255, 255, 255, 1]]; const fades = [];
      for (const k of chain) { const s = getComputedStyle(k), op = parseFloat(s.opacity); if (op < 1) fades.push({ op, out: set[0] });
        const bc = toC(s.backgroundColor); if (bc && bc[3] > 0) set = set.map((b) => over(bc, b));
        const gs = grads(s.backgroundImage, s.backgroundSize); if (gs.length) { const next = gs.cover ? [] : set.slice(); set.forEach((b) => gs.forEach((g) => next.push(over(g, b)))); set = next.slice(0, 96); } }
      const fg = toC(cs.color); if (!fg) continue; let worst = 99;
      for (const b of set) { let f = over(fg, b), bb = b; for (let i = fades.length - 1; i >= 0; i--) { f = mixC(f, fades[i].out, fades[i].op); bb = mixC(bb, fades[i].out, fades[i].op); } worst = Math.min(worst, ratio(f, bb)); }
      n++; walked.push((el.closest('mark') ? 'mark:' : '') + t.textContent.trim()); const key = el.className + '|' + t.textContent.trim().slice(0, 10);
      if (worst < 4.5 && !seen.has(key)) { seen.add(key); bad.push([t.textContent.trim().slice(0, 12), worst, String(el.className).slice(0, 40)]); } }
    return { n, bad, walked }; };"""
def test_every_text_on_the_practice_screens_reads_at_4_5_by_day_and_night(b):
    js = "(async () => { " + KIT + WALK + """ const out = {}, v = word('毎晩'), w2 = word('手紙'), cj = REG.grammar.find((x) => x.t === 'conj' && x.g === '5' && x.f === 'te'),
        g = REG.grammar.find((x) => x.u === 'm3' && x.lv === 'N5' && (x.t || 'choice') === 'choice' && x.why),
        l = REG.listen.find((x) => x.lv === 'N5' && x.t === 'dialog'), rd = REG.read.find((x) => x.lv === 'N5'), ord = REG.grammar.find((x) => x.lv === 'N5' && (makeQuestion(x, { forceFmt: 'g-order' }) || {}).fmt === 'g-order');
      const check = async (name, draw) => { await draw(); await wait(1100); const r = lows(); out[name] = r; };
      const wrong = async (it, q) => { const e = await ask(it, q); answerCurrent((e.q.answer + 1) % e.q.options.length); };
      for (const th of ['night', 'day']) { theme(th);
        await check(th + ':word', () => ask(v, makeVocabQuestion(v, { forceFmt: 'v-meaning' })));
        await check(th + ':wordWrong', () => wrong(v, makeVocabQuestion(v, { forceFmt: 'v-meaning' })));
        await check(th + ':wordRight', async () => { const e = await ask(v, makeVocabQuestion(v, { forceFmt: 'v-meaning' })); answerCurrent(e.q.answer); });
        await check(th + ':grammar', () => ask(g, makeQuestion(g, { choiceOnly: true })));
        await check(th + ':grammarWrong', () => wrong(g, makeQuestion(g, { choiceOnly: true })));
        await check(th + ':listen', () => ask(l));
        await check(th + ':listenWrong', () => wrong(l));
        await check(th + ':reading', () => ask(rd));
        await check(th + ':readingWrong', () => wrong(rd));
        await check(th + ':tiles', () => ask(ord, makeQuestion(ord, { forceFmt: 'g-order' })));
        await check(th + ':tilesGiven', async () => { await ask(ord, makeQuestion(ord, { forceFmt: 'g-order' })); finishCustom(currentEntry(), false, '（看了答案）'); });
        for (const [k, it] of [['wordPreview', v], ['grammarPreview', REG.grammar.find((x) => x.u === 'm1' && lessonSecKey(x))], ['kanaPreview', REG.kana[0]]]) {
          await check(th + ':' + k, async () => { startSession('items', { items: [it, it] }); route(); const e = currentEntry(); e.preview = true; e.previewDone = false; e.autoPlayedPreview = true; renderPractice(); }); }
        await check(th + ':relearn', async () => { const t = todayStr(); state.srs[v.key] = { b: 1, s: 1, d: 5, due: t, n: 6, ok: 2, ng: 4, st: 0, last: addDays(t, -1), lapse: 4, intro: addDays(t, -30), leech: true, rl: 0, f: {} };
          startSession('items', { items: [v, v] }); route(); renderPractice(); delete state.srs[v.key]; });
        // the result's chips: a run of three (連對 3), a 再練一次 copy answered right (這次記住了), a level reached (升到熟悉), out of the notebook
        const chips = async () => { const e = await ask(w2, makeVocabQuestion(w2, { forceFmt: 'v-meaning' })); SESSION.combo = 2; answerCurrent(e.q.answer); await wait(1100);
          Object.assign(e, { lvUp: '熟悉', requeued: true, mistakeDone: true }); renderPractice(); };
        await check(th + ':resultChips', chips);
        await check(th + ':resultChipsEnd', async () => { await chips(); const body = document.querySelector('.fb-sheet-body'); if (body) body.scrollTop = 1e6; else window.scrollTo(0, 1e6); });
        // a spelled conjugation missed: 你的答案 with its first wrong character marked
        await check(th + ':spelledMiss', async () => { state.settings.conjInput = 'tiles'; srsAnswer(cj.key, true); state.srs[cj.key].b = 1; const e = await ask(cj, makeGrammarQuestion(cj, {}));
          finishCustom(e, false, answerKana(JConj.conjVerb(cj.v, cj.g, cj.f)).slice(0, -1) + 'た'); }); }
      done(); return JSON.stringify(out); })()"""
    for w, h in (PHONE, WIDE):
        r = json.loads(page(b, w, h, js))
        assert len(r) == 2 * 18, (w, h, sorted(r))
        bad = {k: x['bad'] for k, x in r.items() if x['bad']}
        assert not bad, (w, h, bad)
        assert all(x['n'] >= 8 for x in r.values()), (w, h, {k: x['n'] for k, x in r.items()})   # each screen's text was walked
        for t in ('night', 'day'):   # the result's chips and the marked character among them
            seen = r[t + ':resultChips']['walked'] + r[t + ':resultChipsEnd']['walked']
            assert all(any(s.startswith(c) for s in seen) for c in ('連對 3', '這次記住了', '升到熟悉', '已移出錯題本')), (w, h, t, seen)
            assert any(s.startswith('mark:') for s in r[t + ':spelledMiss']['walked']), (w, h, t, r[t + ':spelledMiss']['walked'])

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
                        t(b); print("ok  ", t.__name__ + (" (retry)" if attempt == 2 else "")); err = None; break
                    except Exception as e:
                        err = e
            if err is not None:
                failed += 1; print("FAIL", t.__name__, "-", str(err)[:600])
    finally:
        srv.terminate()
    print("ALL PASS" if not failed else f"{failed} FAILED")
    sys.exit(1 if failed else 0)
