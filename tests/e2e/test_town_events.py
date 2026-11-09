"""test build (2026-11-09): the town's events — when the next one opens (the unit reached and begun, study days between them),
who is where by the hour, the mark on the one waiting, the talk with reply choices, the 言靈 for finishing."""
import json, os, subprocess, sys, time
sys.path.insert(0, os.path.dirname(__file__))
from cdp import Browser
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
PORT = 8812
URL = f"http://127.0.0.1:{PORT}/"
READY = "typeof state === 'object' && !!state.updatedAt && typeof speakScript === 'function'"

def ev(b, js, pre=()):
    return b.run([("nav", URL), ("wait", READY)] + list(pre) + [("eval", js)])[-1]

# a main-course account at m1, nothing learned; helpers: a study day, an m-unit begun, fake events in place of the real ones
FRESH = """state.stage = 'main'; state.kanaKnown = true; state.introSeen = true; state.storyV = 9; state.startChosen = true; state.currentUnit = 'm1';
  state.srs = {}; state.dailyLogs = {}; state.town = { done: {}, seen: {}, stops: {} }; saveState(); DAILY_CACHE = null;
  const study = (...ds) => ds.forEach((d) => { state.dailyLogs[d] = { date: d, vocabCount: 3, grammarCount: 2, quizCount: 0, bonusCount: 0, minutes: 2, topics: [], mistakeTopics: [] }; });
  const begin = (u) => { const g = REG.grammar.find((x) => x.u === u); state.srs['g:' + g.id] = { n: 1, last: '2026-11-01' }; };
  const fake = (list) => { TOWN.EVENTS = list.map(([id, u, who, at, more]) => Object.assign({ id, u, who, at, title: id, lines: [[who, 'はい。', '是。']] }, more || {})); };
  const ids = () => TOWNEV.due().map((e) => e.id);"""

def test_first_event_needs_the_unit_begun(b):
    r = json.loads(ev(b, "(() => { " + FRESH + """ fake([['a1', 'm1', 'kenta', 'town']]);
      const before = ids(); begin('m1'); return JSON.stringify({ before, after: ids() }); })()"""))
    assert r == {'before': [], 'after': ['a1']}, r

def test_two_study_days_between_events_of_the_current_unit(b):
    r = json.loads(ev(b, "(() => { " + FRESH + """ fake([['a1', 'm1', 'kenta', 'town'], ['a2', 'm1', 'kenta', 'town']]); begin('m1');
      state.town.done.a1 = '2026-11-01'; study('2026-11-01'); const sameDay = ids();
      study('2026-11-02'); const one = ids(); study('2026-11-04'); const two = ids();
      return JSON.stringify({ sameDay, one, two }); })()"""))
    assert r == {'sameDay': [], 'one': [], 'two': ['a2']}, r   # the day it was done does not count

def test_catching_up_takes_one_study_day(b):
    r = json.loads(ev(b, "(() => { " + FRESH + """ fake([['a1', 'm1', 'kenta', 'town'], ['a2', 'm1', 'kenta', 'town'], ['b1', 'm2', 'kenta', 'town']]);
      state.currentUnit = 'm3'; begin('m3'); state.town.done.a1 = '2026-11-01'; const none = ids(); study('2026-11-02'); const one = ids();
      return JSON.stringify({ none, one }); })()"""))
    assert r == {'none': [], 'one': ['a2', 'b1']}, r   # units already passed (m1, m2) need no begun mark and one day

def test_pre_stage_only_reaches_m0(b):
    r = json.loads(ev(b, "(() => { " + FRESH + """ fake([['p1', 'm0', 'miku', 'town'], ['a1', 'm1', 'kenta', 'town']]);
      state.stage = 'pre'; state.currentUnit = 'm1'; const none = ids(); state.srs['k:a'] = { n: 1 };
      return JSON.stringify({ reached: TOWNEV.reachedIdx(), none, then: ids() }); })()"""))
    assert r == {'reached': 0, 'none': [], 'then': ['p1']}, r   # m0 begins with anything learned

def test_one_waiting_and_a_closed_place_lets_the_next_through(b):
    r = json.loads(ev(b, "(() => { " + FRESH + """ fake([['c1', 'm1', 'hina', 'town'], ['c2', 'm1', 'kenta', 'town']]); begin('m1');
      const wd = new Date(2026, 10, 10), we = new Date(2026, 10, 14);   /* a Tuesday, a Saturday */
      const w = (h, d) => { const x = TOWNEV.waiting(h, d); return x && [x.ev.id, x.place, x.spot]; };
      return JSON.stringify({ morning: w(10, wd), evening: w(17, wd), weekend: w(10, we), night: w(3, wd) }); })()"""))
    assert r == {'morning': ['c2', 'town', 'bakery'], 'evening': ['c1', 'town', 'flowers'], 'weekend': ['c1', 'town', 'flowers'], 'night': None}, r

def test_an_event_waiting_long_finds_its_host_at_any_hour(b):
    r = json.loads(ev(b, "(() => { " + FRESH + """ fake([['c1', 'm1', 'hina', 'town'], ['n1', 'm1', 'kenta', 'town', { after: 'c1', when: 'night' }]]); begin('m1');
      const wd = new Date(2026, 10, 10), w = (h) => { const x = TOWNEV.waiting(h, wd); return x && [x.ev.id, x.spot]; };
      const soon = w(9); study('2026-11-02', '2026-11-03'); const two = w(9); study('2026-11-04'); const three = w(9);
      return JSON.stringify({ soon, two, three }); })()"""))
    assert r == {'soon': None, 'two': None, 'three': ['c1', 'flowers']}, r   # three study days on, 陽菜 waits at her shop whatever the hour

def test_open_hours_wrap_past_midnight(b):
    r = json.loads(ev(b, "JSON.stringify([TOWNEV.isOpen('izakaya', 0.5), TOWNEV.isOpen('izakaya', 12), TOWNEV.isOpen('izakaya', 20), TOWNEV.isOpen('bakery', 13.9), TOWNEV.isOpen('bakery', 14), TOWNEV.isOpen('beach', 3)])"))
    assert r == [True, False, True, True, False, True], r

def test_finishing_gives_10_koto_once(b):
    r = json.loads(ev(b, "(() => { " + FRESH + """ fake([['a1', 'm1', 'kenta', 'town', { lines: [['kenta', 'はい。', '是。'], ['miku', 'うん。', '嗯。']] }]]); begin('m1');
      const k0 = kotoBalance(); TOWNEV.finish('a1'); const k1 = kotoBalance(); TOWNEV.finish('a1');
      return JSON.stringify({ gain: k1 - k0, again: kotoBalance() - k1, done: state.town.done.a1 === todayStr(), seen: state.town.seen, due: ids() }); })()"""))
    assert r == {'gain': 10, 'again': 0, 'done': True, 'seen': {'kenta': 1, 'miku': 1}, 'due': []}, r

def test_an_old_save_without_town_loads(b):
    js = """(() => { const s = JSON.parse(JSON.stringify(state)); delete s.town; const n = normalizeState(s);
      return JSON.stringify({ town: n.town }); })()"""
    r = json.loads(ev(b, js))
    assert r == {'town': {'done': {}, 'seen': {}, 'stops': {}}}, r

# ---- the town: its shops, their hours, the people where their hours put them ----
TOWN_AT = """const wait = (ms) => new Promise(q => setTimeout(q, ms)), y = () => document.querySelector('#view .yard');
  const toastText = () => [...document.querySelectorAll('#toast, .toast')].map(t => t.textContent).join(' ');
  const go = async (place, h, day) => { TOWNEV.clock = { h, day: day || new Date(2026, 10, 10) }; localStorage.removeItem('nq_hero'); location.hash = '#/' + place; document.getElementById('view').innerHTML = ''; route(); await wait(300); };"""

def test_town_has_the_new_shops(b):
    r = json.loads(ev(b, "(async () => { " + FRESH + TOWN_AT + """ fake([]); await go('town', 12);
      return JSON.stringify([...y().querySelectorAll('.town-shop')].map(e => e.dataset.shop)); })()"""))
    assert r == ['salon', 'bakery', 'shokudo', 'cafe', 'flowers', 'izakaya', 'goods'], r

def test_a_shop_whose_owner_you_have_not_met_is_still_preparing(b):
    r = json.loads(ev(b, "(async () => { " + FRESH + TOWN_AT + """ fake([]); await go('town', 12);
      const shut = y().querySelector('.shop-front[data-shop="flowers"]').classList.contains('closed'); y().querySelector('.town-shop[data-shop="flowers"]').click(); await wait(100);
      return JSON.stringify({ shut, toast: toastText(), hina: !!y().querySelector('.npc-hina') }); })()"""))
    assert r['shut'] and '準備中' in r['toast'] and not r['hina'], r

def test_a_closed_shop_says_its_hours(b):
    r = json.loads(ev(b, "(async () => { " + FRESH + TOWN_AT + """ fake([]); state.town.seen.kenta = 1; await go('town', 3);
      const shut = y().querySelector('.shop-front[data-shop="bakery"]').classList.contains('closed'); y().querySelector('.town-shop[data-shop="bakery"]').click(); await wait(100);
      const night = toastText(); await go('town', 9); const open = !y().querySelector('.shop-front[data-shop="bakery"]').classList.contains('closed');
      return JSON.stringify({ shut, night, open, kenta: !!y().querySelector('.npc-kenta') }); })()"""))
    assert r['shut'] and '6' in r['night'] and '14' in r['night'] and r['open'] and r['kenta'], r

def test_people_stand_where_their_hours_say(b):
    r = json.loads(ev(b, "(async () => { " + FRESH + TOWN_AT + """ fake([]); state.town.seen.hina = 1; state.met = { koharu: 1 };
      await go('town', 17); const eve = [...y().querySelectorAll('.npc')].map(e => e.dataset.npc).sort();
      await go('town', 10); const morning = [...y().querySelectorAll('.npc')].map(e => e.dataset.npc).sort();
      await go('town', 10, new Date(2026, 10, 14)); const sat = [...y().querySelectorAll('.npc')].map(e => e.dataset.npc).sort();
      return JSON.stringify({ eve, morning, sat }); })()"""))
    assert r == {'eve': ['hina', 'koharu'], 'morning': ['koharu'], 'sat': ['hina', 'koharu']}, r   # 陽菜 at school on a weekday morning

def test_the_izakaya_is_shut_by_day(b):
    r = json.loads(ev(b, "(async () => { " + FRESH + TOWN_AT + """ fake([]); await go('town', 12);
      return JSON.stringify(y().querySelector('.shop-front[data-shop="izakaya"]').classList.contains('closed')); })()"""))
    assert r is True, r

def test_someone_with_nothing_on_says_a_word_of_the_units_reached(b):
    r = json.loads(ev(b, "(async () => { " + FRESH + TOWN_AT + """ fake([]); state.town.seen.kenta = 1;
      TOWN.CHAT.kenta = [['m0', 'いらっしゃい！', '歡迎光臨！'], ['m9', 'まだだよ。', '還沒。']]; await go('town', 9);
      y().querySelector('.npc-kenta').click(); let t = null; for (let i = 0; i < 120 && !t; i++) { await wait(50); t = document.querySelector('.talk'); }
      return JSON.stringify({ name: t.querySelector('.talk-name').textContent, ja: t.querySelector('.talk-ja').textContent.trim() }); })()"""))
    assert r['name'].startswith('森 健太') and r['ja'] == 'いらっしゃい！', r

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
