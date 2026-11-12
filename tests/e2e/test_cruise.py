"""test build (2026-11-12): the cruise ship (CRUISE) — far out off みなと漁港 once the course is past m2; tapped, it comes in,
高橋 and eight passengers come down and crowd round; the tour's stops one after another (talks, reply choices), on to the beach
and back with them following, seen off at the end, and the ship gone for the day. ムギ's stop only while he is on the beach.
docs/superpowers/specs/2026-11-12-cruise-tour-design.md"""
import json, os, subprocess, sys, time
sys.path.insert(0, os.path.dirname(__file__))
from cdp import Browser
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
PORT = 8817
URL = f"http://127.0.0.1:{PORT}/"
READY = "typeof state === 'object' && !!state.updatedAt && typeof speakScript === 'function'"

def ev(b, js, pre=()):
    return b.run([("nav", URL), ("wait", READY)] + list(pre) + [("eval", js)], timeout=90)[-1]

# a main-course account at m3 (past the tour's m2) at 10 in the morning, ムギ met, no town event waiting; motion reduced so
# walks and the ship's run in are over at once (the passengers still come down one at a time)
FRESH = """state.stage = 'main'; state.kanaKnown = true; state.introSeen = true; state.storyV = 9; state.startChosen = true; state.currentUnit = 'm3';
  state.met = { koharu: 1, mugi: 1 }; state.town = { done: {}, seen: {}, stops: {}, talks: {} }; saveState(); DAILY_CACHE = null;
  localStorage.removeItem('nq_wake'); localStorage.removeItem('nq_cruise'); TOWN.EVENTS = [];
  const mm = window.matchMedia; window.matchMedia = (q) => (/reduced-motion/.test(q) ? { matches: true } : mm.call(window, q));
  const wait = (ms) => new Promise(q => setTimeout(q, ms)), y = () => document.querySelector('#view .yard');
  const go = async (place) => { TOWNEV.clock = { h: 10, day: new Date(2026, 10, 10) }; localStorage.removeItem('nq_hero'); location.hash = '#/' + place; document.getElementById('view').innerHTML = ''; route(); await wait(300); };
  const people = () => [...document.querySelectorAll('#view .tourist')].map((e) => e.dataset.who);
  const until = async (f, ms = 20000) => { const t0 = Date.now(); while (!f() && Date.now() - t0 < ms) await wait(50); return f(); };
  // through the talks (a reply choice: the options in turn till the right one) and on along the bar, till done() or stuck
  const drive = async (done, ms = 60000) => { const seen = [], t0 = Date.now();
    while (!done() && Date.now() - t0 < ms) {
      const card = document.querySelector('.talk-card');
      if (card) { if (card.classList.contains('asking')) { const o = card.querySelector('.talk-opt:not(.wrong) .talk-pick'); if (o) o.click(); } else document.querySelector('.talk').click(); await wait(15); continue; }
      const b = document.querySelector('[data-act=cruise-next]'); if (b) { seen.push(document.querySelector('.cruise-bar .cb-t').textContent); b.click(); await wait(40); continue; }
      await wait(60); }
    return seen; };
  const call = async () => { await go('harbor'); document.querySelector('.cruise-call').click(); await until(() => document.querySelector('.talk-card')); };"""

def test_no_ship_till_the_course_is_past_its_unit(b):
    r = json.loads(ev(b, "(async () => { " + FRESH + """ state.currentUnit = 'm2'; saveState(); await go('harbor');
      const before = { ship: !!y().querySelector('.cruise-ship'), call: !!y().querySelector('.cruise-call') };
      state.currentUnit = 'm3'; saveState(); await go('harbor');
      const after = { ship: !!y().querySelector('.cruise-ship.far'), call: !!y().querySelector('.cruise-call'), people: people().length };
      return JSON.stringify({ before, after }); })()"""))
    assert r == {'before': {'ship': False, 'call': False}, 'after': {'ship': True, 'call': True, 'people': 0}}, r

def test_tapped_it_comes_in_and_they_come_down_one_by_one(b):
    r = json.loads(ev(b, "(async () => { " + FRESH + """ await go('harbor'); document.querySelector('.cruise-call').click(); await wait(400);
      const docked = !y().querySelector('.cruise-ship.far') && !!y().querySelector('.cruise-ramp');
      await wait(2000); const early = people().filter((id) => id !== 'takahashi').length;
      await until(() => document.querySelector('.talk-card'));
      const name = document.querySelector('.talk-name').textContent;
      return JSON.stringify({ docked, early, all: people().sort(), name, step: CRUISE.tour().step }); })()"""))
    assert r['docked'] and 0 < r['early'] < 8, r   # they come down in turn, not all at once
    assert r['all'] == sorted(['takahashi', 'kaneda', 'umeko', 'yuta', 'rina', 'yoshimoto', 'ken', 'ai', 'michiyama']), r
    assert r['name'].startswith('高橋') and r['step'] == 0, r

def test_a_whole_tour_to_the_beach_and_back_and_seen_off(b):
    r = json.loads(ev(b, "(async () => { " + FRESH + """ const errs = []; window.addEventListener('error', (e) => errs.push(String(e.message)));
      await call(); const places = new Set();
      const seen = await drive(() => { places.add(y() && y().dataset.place); return CRUISE.tour().done; }, 80000);
      await wait(300); const t = CRUISE.tour(); await go('harbor');
      return JSON.stringify({ seen, places: [...places].filter(Boolean).sort(), done: t.done, ship: !!y().querySelector('.cruise-ship'), call: !!y().querySelector('.cruise-call'), errs }); })()"""))
    titles = [s['title'] for s in json.loads(ev(b, "JSON.stringify(TOWN.CRUISE.TOUR)"))]
    assert r['seen'] == titles[1:], r   # every stop after the first (that one begins by itself) on along the bar, ムギ's too
    assert r['places'] == ['beach', 'harbor'] and r['done'] and not r['ship'] and not r['call'] and r['errs'] == [], r

def test_mugi_s_stop_passed_by_while_he_is_not_on_the_beach(b):
    r = json.loads(ev(b, "(async () => { " + FRESH + """ state.met = { koharu: 1 }; saveState(); await call();
      const seen = await drive(() => CRUISE.tour().done, 80000);
      return JSON.stringify(seen); })()"""))
    assert 'ムギ' not in r and '沙堡與螃蟹' in r, r

def test_they_wait_where_they_are_while_the_hero_is_elsewhere(b):
    r = json.loads(ev(b, "(async () => { " + FRESH + """ await call();
      await drive(() => CRUISE.tour().step >= 3, 30000); await until(() => document.querySelector('[data-act=cruise-next]'));
      await go('street'); const away = { people: people().length, bar: !!y().querySelector('.cruise-bar') };
      await go('harbor'); const back = { people: people().length, bar: (y().querySelector('.cruise-bar') || {}).textContent || '' };
      return JSON.stringify({ away, back, step: CRUISE.tour().step }); })()"""))
    assert r['away'] == {'people': 0, 'bar': False}, r
    assert r['back']['people'] == 9 and '大漁旗' in r['back']['bar'] and r['step'] == 3, r

def test_off_to_the_beach_on_his_own_they_come_along_and_he_leads_them_back(b):
    r = json.loads(ev(b, "(async () => { " + FRESH + """ await call(); await drive(() => CRUISE.tour().step >= 1, 20000);
      await until(() => document.querySelector('[data-act=cruise-next]'));
      await go('beach'); await wait(300); const there = { people: people().length, place: CRUISE.tour().place, bar: (y().querySelector('.cruise-bar') || {}).textContent || '' };
      await drive(() => CRUISE.tour().step >= 2, 20000);
      return JSON.stringify({ there, now: y().dataset.place, place: CRUISE.tour().place }); })()"""))
    assert r['there']['people'] == 9 and r['there']['place'] == 'beach' and '回漁港' in r['there']['bar'], r   # harbour ⇄ beach: they tag along
    assert r['now'] == 'harbor' and r['place'] == 'harbor', r   # 回漁港: all back together for the next stop

def test_the_test_site_tool_brings_it_back_for_today(b):
    r = json.loads(ev(b, "(async () => { " + FRESH + """ localStorage.setItem('nq_cruise', JSON.stringify({ day: dateStr(new Date(2026, 10, 10)), step: 13, place: 'harbor', done: true, ever: true }));
      await go('harbor'); const gone = !y().querySelector('.cruise-ship');
      state.currentUnit = 'm1'; saveState(); CRUISE.force(); await go('harbor');
      return JSON.stringify({ gone, back: !!y().querySelector('.cruise-ship.far') && !!y().querySelector('.cruise-call') }); })()"""))
    assert r == {'gone': True, 'back': True}, r   # forced: whatever the day and the course

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
