"""test build (2026-11-12): the town's people come alive (TOWNLIFE) — out of doors they stroll about their spot now and then,
stop and turn to the hero when he comes near, hold still when tapped (the hero walks to where they are now); words pop up over
their heads, two who know each other talk; when the hour sends someone elsewhere they walk off that way and who comes walks in.
docs/superpowers/specs/2026-11-12-town-life-design.md"""
import json, os, subprocess, sys, time
sys.path.insert(0, os.path.dirname(__file__))
from cdp import Browser
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
PORT = 8815
URL = f"http://127.0.0.1:{PORT}/"
READY = "typeof state === 'object' && !!state.updatedAt && typeof speakScript === 'function'"

def ev(b, js, pre=()):
    return b.run([("nav", URL), ("wait", READY)] + list(pre) + [("eval", js)])[-1]

# a main-course account at m1 who has met the town's morning people; no events waiting; the people let loose (TOWNLIFE.still is
# on in headless Chrome so the other files' people stand still)
FRESH = """state.stage = 'main'; state.kanaKnown = true; state.introSeen = true; state.storyV = 9; state.startChosen = true; state.currentUnit = 'm1';
  state.met = { koharu: 1, mugi: 1 }; state.town = { done: {}, seen: { kenta: 1, lin: 1, miku: 1, nagisa: 1, hina: 1 }, stops: {}, talks: {} }; saveState(); DAILY_CACHE = null;
  localStorage.removeItem('nq_wake'); TOWN.EVENTS = []; TOWNLIFE.still = false;
  const wait = (ms) => new Promise(q => setTimeout(q, ms)), y = () => document.querySelector('#view .yard');
  const go = async (place, h) => { TOWNEV.clock = { h, day: new Date(2026, 10, 10) }; localStorage.removeItem('nq_hero'); location.hash = '#/' + place; document.getElementById('view').innerHTML = ''; route(); await wait(300); };
  const pos = (el) => { const m = el.style.transform.match(/translate\\(([-\\d.]+)px,\\s*([-\\d.]+)px\\)/); return [+m[1], -m[2]]; };
  const people = () => [...y().querySelectorAll('.npc[data-npc]')];"""

def test_people_stand_still_in_headless_chrome(b):
    r = ev(b, "TOWNLIFE.still")
    assert r is True, r

def test_people_stroll_about_their_spot(b):
    r = json.loads(ev(b, "(async () => { " + FRESH + """ await go('town', 10);
      const start = people().map(pos), out = [], blocks = walkBlocks('town');
      for (let i = 0; i < 45; i++) { await wait(300); people().forEach((el) => { const [X, Y] = pos(el), r = el.dataset.roam.split(',').map(Number);
        if (r.length === 2 && (Math.abs(X - +el.dataset.x) > r[0] + 2 || Math.abs(Y - +el.dataset.y) > r[1] + 2)) out.push([el.dataset.npc, X, Y]);
        if (blocks.some((b) => yIn(b, [X, Y]))) out.push(['block', el.dataset.npc, X, Y]); }); }
      const moved = people().filter((el, k) => Math.abs(pos(el)[0] - start[k][0]) > 1).map((el) => el.dataset.npc);
      return JSON.stringify({ n: people().length, moved: moved.length > 0, out }); })()"""))
    assert r['n'] >= 3 and r['moved'] and r['out'] == [], r

def test_a_tapped_walker_stops_and_the_hero_goes_to_where_they_are(b):
    r = json.loads(ev(b, "(async () => { " + FRESH + """ await go('town', 10);
      let el = null; for (let i = 0; i < 80 && !el; i++) { await wait(150); el = people().find((e) => e.matches('.walk, .run')); }
      if (!el) return JSON.stringify({ walker: false });
      const id = el.dataset.npc; TOWNEV.talk(el); const at = TOWNLIFE.at(id); await wait(900); const still = TOWNLIFE.at(id);
      for (let i = 0; i < 60 && !document.querySelector('.talk-card'); i++) await wait(100);
      const talked = !!document.querySelector('.talk-card'), dx = Math.abs(yh.X - still[0]);
      TALK.close(); await new Promise((q) => yHeroWalk(y(), [still[0] > 0 ? -560 : 560, 40], q)); const back = pos(el); let again = false;   /* he waits while the hero stands by */
      for (let i = 0; i < 80 && !again; i++) { await wait(150); again = Math.abs(pos(el)[0] - back[0]) > 1; }
      return JSON.stringify({ walker: true, held: Math.abs(at[0] - still[0]) < 0.5 && Math.abs(at[1] - still[1]) < 0.5, talked, near: dx < 120, again }); })()"""))
    assert r == {'walker': True, 'held': True, 'talked': True, 'near': True, 'again': True}, r

def test_a_hold_with_no_talk_lets_go_by_itself(b):
    r = json.loads(ev(b, "(async () => { " + FRESH + """ await go('town', 10);
      const el = people().find((e) => e.dataset.roam !== '0'), id = el.dataset.npc; TOWNLIFE.hold(id); const p0 = pos(el);
      await wait(7000); const kept = Math.abs(pos(el)[0] - p0[0]) < 0.5; let again = false;
      for (let i = 0; i < 80 && !again; i++) { await wait(150); again = Math.abs(pos(el)[0] - p0[0]) > 1; }
      return JSON.stringify({ kept, again }); })()"""))
    assert r == {'kept': True, 'again': True}, r

def test_drawn_anew_mid_walk_without_errors(b):
    r = json.loads(ev(b, "(async () => { " + FRESH + """ const errs = []; window.addEventListener('error', (e) => errs.push(String(e.message)));
      await go('town', 10); let el = null; for (let i = 0; i < 80 && !el; i++) { await wait(150); el = people().find((e) => e.matches('.walk, .run')); }
      document.getElementById('view').innerHTML = ''; route(); await wait(100);
      const fresh = people().map((e) => { const [X, Y] = pos(e); return Math.abs(X - +e.dataset.x) < 0.5 && Math.abs(Y - +e.dataset.y) < 0.5; });
      await wait(2000);
      return JSON.stringify({ walker: !!el, errs, fresh: fresh.every(Boolean) }); })()"""))
    assert r == {'walker': True, 'errs': [], 'fresh': True}, r

def test_the_hero_near_stops_them_and_they_turn_to_him(b):
    r = json.loads(ev(b, "(async () => { " + FRESH + """ await go('town', 10);
      const el = people().find((e) => e.dataset.npc === 'kenta'), [X, Y] = pos(el);
      await new Promise((q) => yHeroWalk(y(), [X - 90, Y], q)); await wait(100);
      const a = pos(el), faced = el.classList.contains('flip') && el.classList.contains('turn'); await wait(2500);
      return JSON.stringify({ faced, stayed: Math.abs(pos(el)[0] - a[0]) < 0.5 }); })()"""))
    assert r == {'faced': True, 'stayed': True}, r   # the hero on their left: they turn to the left (flip), and wait

def test_reduced_motion_keeps_them_still(b):
    r = json.loads(ev(b, "(async () => { " + FRESH + """ const mm = window.matchMedia; window.matchMedia = (q) => (/reduced-motion/.test(q) ? { matches: true } : mm.call(window, q));
      await go('town', 10); const p0 = people().map(pos); await wait(8000);
      return JSON.stringify(people().every((el, k) => Math.abs(pos(el)[0] - p0[k][0]) < 0.5)); })()"""))
    assert r is True, r

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
