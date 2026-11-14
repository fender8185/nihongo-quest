"""2026-11-15 らいらいけん (docs/superpowers/specs/2026-11-15-work-redesign-design.md §5–§6): 大通り's 中華料理店 walked into —
a room at 45° (round tables, the register, the kitchen's pass with 黄, the toilet door) — and the 外場 job there in place of 外送."""
import json, os, subprocess, sys, time
sys.path.insert(0, os.path.dirname(__file__))
from cdp import Browser
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
PORT = 8833
URL = f"http://127.0.0.1:{PORT}/"
READY = "typeof state === 'object' && !!state.updatedAt && typeof speakScript === 'function'"

def ev(b, js, pre=()):
    return b.run([("nav", URL), ("wait", READY)] + list(pre) + [("eval", js)])[-1]

# a beginner in 入門 with n kana seen (kana(n)), 入門 words learned by word(...), the town's clock at noon on a weekday
BEGIN = """const rec = () => ({ b: 2, due: addDays(todayStr(), 9), n: 2, ok: 2, ng: 0, s: 4, d: 5, last: addDays(todayStr(), -1) });
  const kana = (n) => { Object.keys(state.srs).filter((k) => k.startsWith('a:')).forEach((k) => delete state.srs[k]); REG.kana.slice(0, n).forEach((x) => { state.srs[x.key] = rec(); }); };
  const word = (...ws) => ws.forEach((w) => { const v = REG.vocab.find((x) => x.w === w && x.lv === 'PRE_N5'); state.srs[v.key] = rec(); });
  state.storyV = 99; state.startChosen = true; state.stage = 'pre'; state.kanaKnown = false; state.srs = {}; kana(30);
  state.town = { done: {}, seen: {}, stops: {}, talks: {} }; state.koto.found = {}; state.purse = { spent: {}, book: {} }; state.cruise = { done: {}, on: null, res: {} }; state.work = { res: {} };
  ['nq_class', 'nq_taste', 'nq_wake'].forEach((k) => localStorage.removeItem(k));
  TOWNEV.clock = { h: 12, day: new Date(2026, 10, 10) }; saveState(); DAILY_CACHE = null;
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const still = async () => { for (let i = 0; i < 80 && yh.rem !== undefined; i++) await wait(100); await wait(150); };
  const into = async () => { location.hash = '#/rairai'; route(); await wait(400); };"""

def test_in_from_the_street_and_back(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + """ window.__errs = []; window.addEventListener('error', (e) => __errs.push(String(e.message)));
      location.hash = '#/chinadori'; route(); await wait(300); document.querySelector('.use-btn[data-use="rairai"]').click();
      for (let i = 0; i < 100 && location.hash !== '#/rairai'; i++) await wait(100);
      const out = { in: location.hash }; await wait(500); out.land = Boolean(document.querySelector('.rairai-land')); out.place = yPlace; out.huang = Boolean(document.querySelector('.npc[data-npc="huang"]'));
      document.querySelector('.way-btn[data-to="chinadori"]').click(); for (let i = 0; i < 100 && location.hash !== '#/chinadori'; i++) await wait(100);
      out.back = location.hash; await wait(400); const d = DORI.door('rairai'); out.by = Math.hypot(yh.X - d[0], yh.Y - d[1]) < 60; out.street = !document.querySelector('.npc[data-npc="huang"]');
      return JSON.stringify(Object.assign(out, { errs: __errs })); })()"""))
    assert r == {'in': '#/rairai', 'land': True, 'place': 'rairai', 'huang': True, 'back': '#/chinadori', 'by': True, 'street': True, 'errs': []}, r

def test_shut_at_night(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + """ TOWNEV.clock = { h: 22, day: new Date(2026, 10, 10) };
      location.hash = '#/chinadori'; route(); await wait(300); document.querySelector('.use-btn[data-use="rairai"]').click(); await wait(2500);
      return JSON.stringify({ hash: location.hash }); })()"""))
    assert r == {'hash': '#/chinadori'}, r

def test_everything_in_the_room_answers_a_tap(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + """ window.__errs = []; window.addEventListener('error', (e) => __errs.push(String(e.message)));
      await into(); const uses = [...document.querySelectorAll('.use-btn')].map((u) => u.dataset.use).sort();
      for (const id of uses) { document.querySelector(`.use-btn[data-use="${id}"]`).click(); await still(); }
      return JSON.stringify({ uses, errs: __errs, place: yPlace }); })()"""))
    assert r['uses'] == sorted(['pass', 'register', 'table0', 'table1', 'table2', 'menu', 'poster', 'toilet', 'tank']), r
    assert r['errs'] == [] and r['place'] == 'rairai', r

# a room is wider than a phone (as the 食堂's): the camera goes with the hero, so each thing comes onto the screen once he is at it
def test_the_room_works_on_a_phone(b):
    r = json.loads(b.run([("metrics", (360, 640)), ("nav", URL), ("wait", READY), ("eval", "(async () => { " + BEGIN + """ await into(); await wait(300);
      const on = (el) => { const q = el.getBoundingClientRect(); return q.left >= -2 && q.right <= innerWidth + 2 && q.top >= -2 && q.bottom <= innerHeight + 2; }, off = [];
      for (const u of [...document.querySelectorAll('.use-btn')].map((x) => x.dataset.use)) { document.querySelector(`.use-btn[data-use="${u}"]`).click(); await still(); await wait(500); const el = document.querySelector(`.use-btn[data-use="${u}"]`); const q = el.getBoundingClientRect(), mid = [(q.left + q.right) / 2, (q.top + q.bottom) / 2];
        if (!(mid[0] >= 0 && mid[0] <= innerWidth && mid[1] >= 0 && mid[1] <= innerHeight)) off.push(u); }
      yHeroWalk(document.querySelector('.yard'), isoXY(...ISO.in)); await still(); await wait(500); if (!on(document.querySelector('.way-btn'))) off.push('door');
      return JSON.stringify({ off }); })()""")])[-1])
    assert r == {'off': []}, r

def test_the_hero_walks_round_the_tables(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + """ await into(); const yard = document.querySelector('.yard'), out = {};
      for (const [i, [u, v]] of RAIRAI.TABLES.entries()) { yHeroWalk(yard, isoXY(u, v)); await still(); const [hu, hv] = isoUV(yh.X, yh.Y); out['t' + i] = Math.hypot(hu - u, hv - v) >= RAIRAI.R; }
      return JSON.stringify(out); })()"""))
    assert r == {'t0': True, 't1': True, 't2': True}, r

# ---- 外送 gone: the old records still read ----
def test_an_old_delivery_record_still_shows(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + """ window.__errs = []; window.addEventListener('error', (e) => __errs.push(String(e.message)));
      word('いらっしゃいませ', 'どうぞ', 'はい'); state.work.res['2026-11-01'] = { place: 'deliver', done: 10, score: {}, yen: 120, grade: 'B' }; state.work.res['2026-11-10'] = { place: 'deliver', done: 3, score: {} };
      location.hash = '#/chinadori'; route(); await wait(300); WORK.board(document.querySelector('.yard')); const board = document.querySelector('.wk-board').textContent; CLASS.close();
      const can = WORK.can('waiter'); const book = WORK.book();
      return JSON.stringify({ board: board.includes('外送'), book: String(book).includes('外送'), why: can.why.includes('外送'), gone: typeof JOBS.deliver, errs: __errs }); })()"""))
    assert r == {'board': True, 'book': True, 'why': True, 'gone': 'undefined', 'errs': []}, r

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
                failed += 1; print("FAIL", t.__name__, "-", str(err)[:400])
    finally:
        srv.terminate()
    print("ALL PASS" if not failed else f"{failed} FAILED")
    sys.exit(1 if failed else 0)
