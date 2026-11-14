"""2026-11-14 中華街大通り (docs/superpowers/specs/2026-11-14-chinatown-work-design.md §3): through 中華街's 牌樓 into a street seen
down its length — the ground a trapezoid narrowing up the screen, the hero smaller the further in, one screen wide (no swipe)."""
import json, os, subprocess, sys, time
sys.path.insert(0, os.path.dirname(__file__))
from cdp import Browser
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
PORT = 8831
URL = f"http://127.0.0.1:{PORT}/"
READY = "typeof state === 'object' && !!state.updatedAt && typeof speakScript === 'function'"

def ev(b, js, pre=()):
    return b.run([("nav", URL), ("wait", READY)] + list(pre) + [("eval", js)])[-1]

# a beginner in 入門 with 10 kana seen, the town's clock at noon on a weekday
BEGIN = """const rec = () => ({ b: 2, due: addDays(todayStr(), 9), n: 2, ok: 2, ng: 0, s: 4, d: 5, last: addDays(todayStr(), -1) });
  state.storyV = 99; state.startChosen = true; state.stage = 'pre'; state.kanaKnown = false; state.srs = {}; REG.kana.slice(0, 10).forEach((x) => { state.srs[x.key] = rec(); });
  state.town = { done: {}, seen: {}, stops: {}, talks: {} }; state.koto.found = {}; state.purse = { spent: {}, book: {} };
  ['nq_class', 'nq_taste', 'nq_wake'].forEach((k) => localStorage.removeItem(k));
  TOWNEV.clock = { h: 12, day: new Date(2026, 10, 10) }; saveState(); DAILY_CACHE = null;
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const still = async () => { for (let i = 0; i < 60 && yh.rem !== undefined; i++) await wait(100); await wait(100); };"""

def test_the_street_narrows_and_the_hero_shrinks(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + """
      location.hash = '#/chinadori'; route(); await wait(300); const yard = document.querySelector('.yard'), out = {};
      Object.assign(out, { s0: DORI.scale(12), sFar: DORI.scale(DORI.FAR), top0: walkTop('chinadori', 0), topEdge: walkTop('chinadori', DORI.HALF0),
        y100: yScale(100) === DORI.scale(100), cam: yCamMax() });
      yHeroWalk(yard, [0, 400]); await still(); out.deep = [yh.X, yh.Y];
      yHeroWalk(yard, [300, 30]); await still(); out.side = [yh.X, yh.Y, DORI.half(yh.Y)];
      return JSON.stringify(Object.assign(out, { far: DORI.FAR })); })()"""))
    assert r['s0'] == 0.5 and r['sFar'] < 0.2 and r['top0'] == r['far'] and abs(r['topEdge'] - 12) < 1e-6 and r['y100'] and r['cam'] == 0, r
    assert r['deep'][1] <= r['far'] + 1e-6 and abs(r['deep'][0]) < 1, r   # up the middle: no further than the street's end
    assert abs(r['side'][0]) <= r['side'][2] + 1, r   # out to the side: held inside the street's edge at that depth

def test_the_gate_leads_into_the_street_and_back(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + """ window.__errs = window.__errs || []; window.addEventListener('error', (e) => __errs.push(String(e.message)));
      location.hash = '#/chinatown'; route(); await wait(300); const out = {};
      document.querySelector('.use-btn[data-use="gate"]').click();
      for (let i = 0; i < 80 && location.hash !== '#/chinadori'; i++) await wait(100);
      out.in = location.hash; await wait(400); out.land = Boolean(document.querySelector('.dori-land')); out.place = yPlace;
      document.querySelector('.way-btn[data-to="chinatown"]').click();
      for (let i = 0; i < 80 && location.hash !== '#/chinatown'; i++) await wait(100);
      out.back = location.hash; await wait(300); out.under = Math.abs(yh.X + 360) < 40;
      return JSON.stringify(Object.assign(out, { errs: __errs })); })()"""))
    assert r == {'in': '#/chinadori', 'land': True, 'place': 'chinadori', 'back': '#/chinatown', 'under': True, 'errs': []}, r

def test_every_thing_on_the_street_answers_a_tap(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + """ window.__errs = window.__errs || []; window.addEventListener('error', (e) => __errs.push(String(e.message)));
      location.hash = '#/chinadori'; route(); await wait(300); const out = { uses: [...document.querySelectorAll('.use-btn')].map((u) => u.dataset.use).sort() };
      out.signs = Object.fromEntries([...document.querySelectorAll('.dr-sign')].map((g) => [g.dataset.sign, [...g.querySelectorAll('text')].map((t) => t.textContent).join('')]));
      for (const id of out.uses) { document.querySelector(`.use-btn[data-use="${id}"]`).click(); await wait(1200); closeModal && closeModal(true); }
      return JSON.stringify(Object.assign(out, { errs: __errs })); })()"""))
    assert r['uses'] == sorted(['ranran', 'fuku', 'toka', 'rairai', 'kuriya', 'kohaku', 'board', 'hourai']), r
    assert r['signs'] == {'ranran': 'らんらん', 'fuku': 'ふく', 'toka': 'とうか', 'rairai': 'らいらいけん', 'kuriya': 'くりや', 'kohaku': 'こはく'}, r
    assert r['errs'] == [], r

def test_the_street_fits_a_phone(b):
    r = json.loads(b.run([("metrics", (360, 640)), ("nav", URL), ("wait", READY), ("eval", "(async () => { " + BEGIN + """
      location.hash = '#/chinadori'; route(); await wait(500);
      const off = [...document.querySelectorAll('.use-btn, .way-btn')].filter((u) => { const q = u.getBoundingClientRect(); return q.left < -1 || q.right > innerWidth + 1 || q.top < 0 || q.bottom > innerHeight + 1; }).map((u) => u.dataset.use || u.dataset.to);
      return JSON.stringify({ cam: yCamMax(), off, n: document.querySelectorAll('.use-btn').length }); })()""")])[-1])
    assert r == {'cam': 0, 'off': [], 'n': 8}, r

def test_the_street_by_night(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + """ TOWNEV.clock = { h: 22, day: new Date(2026, 10, 10) };
      location.hash = '#/chinadori'; route(); await wait(300);
      const shut = document.querySelectorAll('.dr-shop .dr-shut').length, glow = document.querySelectorAll('.dori-land .glow').length;
      TOWNEV.clock = { h: 12, day: new Date(2026, 10, 10) }; location.hash = '#/street'; route(); await wait(100); location.hash = '#/chinadori'; route(); await wait(300);
      return JSON.stringify({ shut, glow: glow >= 25, day: document.querySelectorAll('.dr-shop .dr-shut').length }); })()"""))
    assert r == {'shut': 6, 'glow': True, 'day': 0}, r

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
