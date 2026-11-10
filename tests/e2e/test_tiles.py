"""2026-11-05 (1.0.44): 拼字、活用、排序的字塊——點一下放到最後或拿回來、按住拖到答案列任意位置、拖回下面拿掉；放滿後按「確定」才送出。"""
import json, os, subprocess, sys, time
sys.path.insert(0, os.path.dirname(__file__))
from cdp import Browser
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
PORT = 8807
URL = f"http://127.0.0.1:{PORT}/"
READY = "typeof state === 'object' && !!state.updatedAt && typeof speakScript === 'function'"

def ev(b, js, pre=()):
    return b.run(list(pre) + [("nav", URL), ("wait", READY), ("eval", js)])[-1]

FRESH = "state.stage = 'main'; state.kanaKnown = true; state.introSeen = true; state.storyV = 9; state.startChosen = true; state.currentUnit = 'm1'; saveState(); DAILY_CACHE = null;"
# a 假名拼字 card for a four-kana word with no repeated kana; LINE: the kana on the line
SPELL = FRESH + """ const v = REG.vocab.find(x => x.builtin && x.lv === 'N5' && [...x.r].length === 4 && new Set([...x.r]).size === 4 && canSpell(x)); srsAnswer(v.key, true);
  startSession('items', { items: [v] }); route(); const e = currentEntry(); e.q = makeVocabQuestion(v, { forceFmt: 'v-spell' }); renderPractice();
  const want = [...e.q.options[0].text]; const tiles = e.q.tiles; const LINE = () => (e.spell || []).map(i => tiles[i]).join('');
  const free = (ch) => document.querySelector(`.spell-tile[data-i="${tiles.indexOf(ch)}"]`);"""
# a drag made of pointer events: press on el, move in steps to (x, y), let go; `mid` runs while it is held there
DRAG = """const at = (el, fx = .5) => { document.getAnimations().forEach(a => a.finish()); const r = el.getBoundingClientRect(); return [r.left + r.width * fx, r.top + r.height / 2]; };   // where a gliding tile lands
  const fire = (target, type, x, y) => target.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, pointerId: 7, pointerType: 'touch', isPrimary: true, button: 0, clientX: x, clientY: y }));
  const drag = (el, [x, y], mid) => { const [x0, y0] = at(el); fire(el, 'pointerdown', x0, y0);
    for (let k = 1; k <= 6; k++) fire(document, 'pointermove', x0 + (x - x0) * k / 6, y0 + (y - y0) * k / 6);
    const held = mid ? mid() : null; fire(document, 'pointerup', x, y); return held; };"""

def test_a_full_line_waits_for_ok_and_keys_take_back_or_send(b):
    js = "(() => { " + SPELL + """
      want.forEach(ch => free(ch).click());
      const full = { line: LINE(), done: !!e.done, ok: !document.querySelector('.tile-ok').disabled, count: document.querySelector('.tile-row').textContent.trim().startsWith('4 / 4') };
      const extra = document.querySelector('.spell-tile[data-ti]'); extra.click(); const refused = LINE() === full.line;   // a full line takes no more
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Backspace', bubbles: true })); const back = { line: LINE(), ok: !document.querySelector('.tile-ok').disabled };
      free(want[3]).click(); document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      const out = { want: want.join(''), full, refused, back, sent: !!e.done, right: e.chosen === e.q.answer };
      SESSION = null; document.body.classList.remove('practicing'); return JSON.stringify(out); })()"""
    r = json.loads(ev(b, js))
    assert r['full'] == {'line': r['want'], 'done': False, 'ok': True, 'count': True}, r
    assert r['refused'] and r['back'] == {'line': r['want'][:3], 'ok': False}, r
    assert r['sent'] and r['right'], r

def test_a_tile_is_dragged_in_anywhere_moved_along_and_dragged_back_out(b):
    js = "(() => { " + SPELL + DRAG + """
      const line = () => document.querySelector('.spell-out'); const piece = (k) => document.querySelector(`.spell-out [data-k="${k}"]`);
      const out = {};
      drag(free(want[2]), at(line())); out.first = LINE();                                  // onto the empty line
      free(want[0]).click(); out.tap = LINE();                                               // a tap goes to the end
      out.mid = drag(piece(1), at(piece(0), .1), () => ({ ghost: !!document.querySelector('.tile-drag'), gap: !!document.querySelector('.spell-out .tile-gap') }));
      out.moved = LINE(); out.after = { ghost: !!document.querySelector('.tile-drag'), gap: !!document.querySelector('.tile-gap') };
      drag(free(want[1]), at(piece(1), .1)); out.between = LINE();                           // in between two pieces
      drag(piece(0), at(document.querySelector('.spell-tiles'))); out.out = LINE();          // dragged down off the line
      out.freed = !free(want[0]).disabled;
      drag(free(want[0]), at(line(), .02)); drag(free(want[3]), at(line(), .98)); out.full = LINE();
      const spare = document.querySelector('.spell-tile[data-ti]'); drag(spare, at(line())); out.refused = LINE();   // a full line takes no more
      out.done = !!e.done;
      SESSION = null; document.body.classList.remove('practicing'); return JSON.stringify({ want: want.join(''), ...out }); })()"""
    r = json.loads(ev(b, js))
    w = r['want']
    assert r['first'] == w[2] and r['tap'] == w[2] + w[0], r
    assert r['mid'] == {'ghost': True, 'gap': True} and r['moved'] == w[0] + w[2] and r['after'] == {'ghost': False, 'gap': False}, r
    assert r['between'] == w[0] + w[1] + w[2] and r['out'] == w[1] + w[2] and r['freed'], r
    assert r['full'] == w and r['refused'] == w and not r['done'], r

def test_sentence_pieces_drag_between_the_fixed_words(b):
    js = "(() => { " + FRESH + DRAG + """ const g = REG.grammar.find(x => x.t === 'order' && new Set(x.parts).size === x.parts.length && x.parts.length >= 4);
      startSession('items', { items: [g] }); route(); const e = currentEntry(); renderPractice();
      const tiles = e.q.tiles; const LINE = () => (e.order || []).map(i => tiles[i]).join('|');
      const free = (p) => document.querySelector(`.order-tile[data-i="${tiles.indexOf(p)}"]`); const piece = (k) => document.querySelector(`.order-out [data-k="${k}"]`);
      const plain = { badges: document.querySelectorAll('.order-tile .kbd').length, hint: !!document.querySelector('.pr-actions .kbd-hint') };   // 1.0.51: no 1–4 on the tiles
      document.dispatchEvent(new KeyboardEvent('keydown', { key: '1', bubbles: true })); plain.keyed = (e.order || []).length;
      free(g.parts[0]).click(); free(g.parts[2]).click();
      drag(free(g.parts[1]), at(piece(1), .1)); const between = LINE();
      free(g.parts[3]).click(); const ok = !document.querySelector('.tile-ok').disabled; ACTIONS['tiles-submit']();
      const out = { parts: g.parts.join('|'), between, ok, right: e.done && e.chosen === e.q.answer, plain };
      SESSION = null; document.body.classList.remove('practicing'); delete state.srs[g.key]; saveState(); return JSON.stringify(out); })()"""
    r = json.loads(ev(b, js))
    p = r['parts'].split('|')
    assert r['between'] == '|'.join(p[:3]) and r['ok'] and r['right'], r
    assert r['plain'] == {'badges': 0, 'hint': False, 'keyed': 0}, r

# ---- 2026-11-10 (the user): 句意拼貼 — the Japanese over Chinese pieces, its own shuffled with decoys that change the grammar point;
# graded by the pieces placed, in any order; answered, a decoy on the line is red and the grammar's piece marked; 看答案 shows the right ones ----
# a fill-in item (not a particle's 用法) given three pieces and two decoys here, so the test does not hang on the data
ZHQ = FRESH + """ const g = REG.grammar.find(x => (x.t || 'choice') === 'choice' && x.zh && [...x.zh].length >= 9 && !grammarUsageDistractors(x));
  const c = [...g.zh], a = Math.floor(c.length / 3), z = Math.floor(c.length * 2 / 3);
  g.zt = [c.slice(0, a).join(''), c.slice(a, z).join(''), c.slice(z).join('')]; g.zk = 1; g.zd = ['完全不同的一塊', '另一塊假的']; srsAnswer(g.key, true);
  const open = () => { SESSION = null; startSession('items', { items: [g] }); route(); const e = currentEntry(); e.q = makeGrammarQuestion(g, { forceFmt: 'g-zh' }); renderPractice(); return e; };
  const tile = (e, p) => document.querySelector(`.order-tile[data-i="${e.q.tiles.indexOf(p)}"]`);"""

def test_zh_pieces_count_in_any_order_and_a_decoy_shows_red(b):
    js = "(() => { " + ZHQ + """
      let e = open(); const q = e.q;
      const build = { fmt: q.fmt, custom: q.custom, n: q.tiles.length, all: g.zt.concat(g.zd).every(p => q.tiles.includes(p)), zh: q.zhText, stem: !!q.stemHtml, slots: document.querySelectorAll('.zh-build .order-slot').length };
      [...g.zt].reverse().forEach(p => tile(e, p).click());
      const full = { ok: !document.querySelector('.tile-ok').disabled, line: (e.zh || []).map(i => q.tiles[i]).join('') };
      document.querySelector('.tile-ok').click();
      const right = { right: e.chosen === e.q.answer, okCls: document.querySelector('.order-out').classList.contains('ok'), key: (document.querySelector('.order-slot.key') || {}).textContent || '' };
      e = open(); const mist = state.mistakes.length;
      [g.zt[0], g.zd[0], g.zt[2]].forEach(p => tile(e, p).click()); document.querySelector('.tile-ok').click();
      const m = state.mistakes.find(x => x.key === g.key) || {};
      const wrong = { right: e.chosen === e.q.answer, red: [...document.querySelectorAll('.order-slot.wrong')].map(x => x.textContent), book: state.mistakes.length - mist, ans: m.answer, chose: m.wrong };
      e = open(); ACTIONS['custom-giveup'](); const shown = [...document.querySelectorAll('.zh-build .order-slot')].map(x => x.textContent);
      SESSION = null; document.body.classList.remove('practicing'); delete state.srs[g.key]; state.mistakes = state.mistakes.filter(x => x.key !== g.key);
      return JSON.stringify({ build, full, right, wrong, shown, zt: g.zt, zd: g.zd, zh: g.zh }); })()"""
    r = json.loads(ev(b, js))
    assert r['build'] == {'fmt': 'g-zh', 'custom': 'g-zh', 'n': 5, 'all': True, 'zh': '', 'stem': True, 'slots': 3}, r
    assert r['full']['ok'] and r['full']['line'] == ''.join(reversed(r['zt'])), r   # placed back to front...
    assert r['right'] == {'right': True, 'okCls': True, 'key': r['zt'][1]}, r      # ...still right, and the grammar's piece is marked
    assert r['wrong'] == {'right': False, 'red': [r['zd'][0]], 'book': 1, 'ans': r['zh'], 'chose': r['zt'][0] + r['zd'][0] + r['zt'][2]}, r
    assert r['shown'] == r['zt'], r   # 看答案: the right pieces in their order

def test_zh_pieces_stay_out_of_stage_tests_and_particles_keep_their_usage_question(b):
    js = "(() => { " + FRESH + """
      const g = REG.grammar.find(x => (x.t || 'choice') === 'choice' && x.zh && [...x.zh].length >= 9 && !grammarUsageDistractors(x));
      const m = REG.grammar.find(x => x.t === 'meaning'); const p = REG.grammar.find(x => (x.t || 'choice') === 'choice' && x.zh && grammarUsageDistractors(x));
      const cut = (s) => [[...s].slice(0, 3).join(''), [...s].slice(3).join('')];
      g.zt = cut(g.zh); m.zt = cut(m.a); p.zt = cut(p.zh); [g, m, p].forEach(x => { x.zk = 0; x.zd = ['假的一塊', '假的兩塊']; srsAnswer(x.key, true); });
      const fmts = (x, ctx) => { const s = new Set(); for (let i = 0; i < 40; i++) { const q = makeQuestion(x, Object.assign({}, ctx)); s.add(q ? q.fmt : null); } return [...s].sort(); };
      const out = { gFormats: grammarFormats(g), pFormats: grammarFormats(p), gPlain: fmts(g, {}), gStage: fmts(g, { choiceOnly: true }), mPlain: fmts(m, {}), mStage: fmts(m, { choiceOnly: true }), pPlain: fmts(p, {}) };
      [g, m, p].forEach(x => { delete state.srs[x.key]; });
      return JSON.stringify(out); })()"""
    r = json.loads(ev(b, js))
    assert r['gFormats'] == ['g-choice', 'g-zh'] and r['pFormats'] == ['g-choice', 'g-meaning'], r
    assert r['gPlain'] == ['g-choice', 'g-zh'] and r['gStage'] == ['g-choice'], r   # a 階段測驗 asks with options only
    assert r['mPlain'] == ['g-zh'] and r['mStage'] == ['g-meaning'], r              # a 句意 item: pieces; in a test, its own four sentences
    assert r['pPlain'] == ['g-choice', 'g-meaning'], r                             # a particle keeps 「畫線的に表示什麼」

TESTS = [f for n, f in sorted(globals().items()) if n.startswith('test_') and callable(f)]
if __name__ == "__main__":
    srv = subprocess.Popen([sys.executable, "-m", "http.server", str(PORT), "--bind", "127.0.0.1"], cwd=ROOT, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
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
                failed += 1; print("FAIL", t.__name__, "-", str(err)[:400])
    finally:
        srv.terminate()
    print("ALL PASS" if not failed else f"{failed} FAILED")
    sys.exit(1 if failed else 0)
