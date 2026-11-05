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

FRESH = "state.stage = 'main'; state.kanaKnown = true; state.introSeen = true; state.startChosen = true; state.currentUnit = 'm1'; saveState(); DAILY_CACHE = null;"
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
