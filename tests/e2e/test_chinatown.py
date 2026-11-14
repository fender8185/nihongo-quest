"""2026-11-14 新手第一週 stage 4: みなと中華街 — on the bus from the first day, 王 and his stand (a free 豚まん a day), 龍鳳飯店's
menu, its own events by the kana seen, and 漢字陷阱: the Chinese reading is the trap, the right one gives 1 言靈 the first time."""
import json, os, subprocess, sys, time
sys.path.insert(0, os.path.dirname(__file__))
from cdp import Browser
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
PORT = 8820
URL = f"http://127.0.0.1:{PORT}/"
READY = "typeof state === 'object' && !!state.updatedAt && typeof speakScript === 'function'"

def ev(b, js, pre=()):
    return b.run([("nav", URL), ("wait", READY)] + list(pre) + [("eval", js)])[-1]

# a beginner in 入門 with 10 kana seen, no 円, the town's clock at noon on a weekday
BEGIN = """const rec = () => ({ b: 2, due: addDays(todayStr(), 9), n: 2, ok: 2, ng: 0, s: 4, d: 5, last: addDays(todayStr(), -1) });
  state.storyV = 99; state.startChosen = true; state.stage = 'pre'; state.kanaKnown = false; state.srs = {}; REG.kana.slice(0, 10).forEach((x) => { state.srs[x.key] = rec(); });
  state.town = { done: {}, seen: {}, stops: {}, talks: {} }; state.koto.found = {}; state.purse = { spent: {}, book: {} };
  ['nq_class', 'nq_taste', 'nq_wake'].forEach((k) => localStorage.removeItem(k));
  TOWNEV.clock = { h: 12, day: new Date(2026, 10, 10) }; saveState(); DAILY_CACHE = null;
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));"""

def test_chinatown_is_on_the_bus_from_the_first_day_with_wang_waiting(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + """
      location.hash = '#/chinatown'; route(); await wait(300);
      return JSON.stringify({ open: busOpen('chinatown'), land: Boolean(document.querySelector('.china-land')), uses: [...document.querySelectorAll('.use-btn')].map((u) => u.dataset.use).sort(),
        ppl: [...document.querySelectorAll('#view .npc')].map((n) => n.dataset.npc + (n.classList.contains('ev-host') ? '!' : '')).sort(), name: TOWNEV.PLACE_NAME.chinatown, hop: TOWNEV.hop('yard', 'chinatown') }); })()"""))
    assert r['open'] and r['land'] and r['name'] == '中華街' and r['hop'] == 'street', r
    assert {'post', 'notice', 'shirt', 'seiro', 'bmenu', 'panda', 'rmenu', 'ryuho', 'yuka', 'shishi', 'uranai', 'gate'} <= set(r['uses']), r
    assert r['ppl'] == ['chen', 'wang!'], r   # noon: 陳 helping at the stand, 王 with his event (cn1) waiting

def test_chinatown_events_go_by_the_kana_seen_one_after_another(b):
    r = json.loads(ev(b, "(() => { " + BEGIN + """
      const cn = () => TOWNEV.due().map((e) => e.id).filter((id) => id.startsWith('cn'));
      const out = { first: cn() }; state.town.done.cn1 = todayStr(); out.second = cn();
      state.town.done.cn2 = todayStr(); out.third = cn(); REG.kana.slice(0, 15).forEach((x) => { state.srs[x.key] = rec(); }); out.at15 = cn();
      out.hosts = TOWN.EVENTS.filter((e) => e.at === 'chinatown').every((e) => TOWNEV.slots(e).length > 0);
      return JSON.stringify(out); })()"""))
    assert r == {'first': ['cn1'], 'second': ['cn2'], 'third': [], 'at15': ['cn3'], 'hosts': True}, r

def test_a_trap_read_the_chinese_way_says_what_happens_and_the_right_one_gives_one(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + """
      location.hash = '#/chinatown'; route(); await wait(100); const y = document.querySelector('.yard'); window.speak = () => Promise.resolve();
      CHINA.trap(y, 'post'); const word = document.querySelector('.tp-word').textContent;
      document.querySelector('.tp-opt[data-k="t"]').click(); const react = document.querySelector('.tp-react').textContent, solvedAfterTrap = Boolean((state.town.traps || {})['手紙']);
      document.querySelector('.tp-opt[data-k="r"]').click(); const note = document.querySelector('.tp-note').textContent, koto = state.koto.found['play-' + todayStr()];
      document.querySelector('[data-cls="next"]').click(); const next = document.querySelector('.tp-word').textContent; CLASS.close();
      CHINA.trap(y, 'post', '手紙'); document.querySelector('.tp-opt[data-k="r"]').click(); const again = state.koto.found['play-' + todayStr()]; CLASS.close();
      return JSON.stringify({ word, react: react.includes('衛生紙'), solvedAfterTrap, note: note.includes('信'), koto, next, again, head: Object.keys(state.town.traps) }); })()"""))
    assert r['word'].startswith('手紙') and r['react'] and not r['solvedAfterTrap'] and r['note'] and r['koto'] == 1, r
    assert r['next'].startswith('切手') and r['again'] == 1 and r['head'] == ['手紙'], r   # the next of its sign; seen through once, no more 言靈 for it

def test_every_trap_is_whole_and_on_one_sign(b):
    r = json.loads(ev(b, """(() => { const signs = Object.values(TRAP_SIGNS).flatMap((s) => s[1]);
      return JSON.stringify({ n: CHINA.TRAPS.length, whole: CHINA.TRAPS.every((t) => t.length === 7 && t.every((x) => typeof x === 'string' && x)),
        once: CHINA.TRAPS.every((t) => signs.filter((w) => w === t[0]).length === 1), known: signs.every((w) => CHINA.TRAPS.some((t) => t[0] === w)),
        distinct: CHINA.TRAPS.every((t) => new Set([t[2], t[3], t[4]]).size === 3) }); })()"""))
    assert r == {'n': 33, 'whole': True, 'once': True, 'known': True, 'distinct': True}, r

def test_a_free_buta_man_a_day_while_wang_is_at_his_stand(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + """
      location.hash = '#/chinatown'; route(); await wait(200); const y = () => document.querySelector('.yard'), t = PLACE_USE.chinatown.find((q) => q.id === 'seiro');
      CHINA.taste(y(), t); for (let i = 0; i < 20 && !document.querySelector('.talk-card'); i++) await wait(50);
      for (let i = 0; i < 10 && document.querySelector('.talk'); i++) { document.querySelector('.talk-card').click(); await wait(80); }
      for (let i = 0; i < 60 && !document.querySelector('.eat-scene'); i++) await wait(50);
      const scene = Boolean(document.querySelector('.eat-scene')), spent = yenSpent(), book = Boolean(state.purse.book.butaman);
      document.querySelectorAll('.eat-scene').forEach((e) => e.remove());
      CHINA.taste(y(), t); for (let i = 0; i < 20 && !document.querySelector('.talk-card'); i++) await wait(50); const twice = (document.querySelector('.talk-card') || {}).textContent || ''; TALK.close();
      TOWNEV.clock = { h: 21, day: new Date(2026, 10, 10) }; route(); await wait(100); const toasts = []; window.toast = (m) => toasts.push(m); CHINA.taste(y(), t);
      return JSON.stringify({ scene, spent, book, twice: twice.includes('いちにち ひとつ'), shut: toasts.some((m) => m.includes('不在')), where: YEN.where('butaman') }); })()"""))
    assert r == {'scene': True, 'spent': 0, 'book': True, 'twice': True, 'shut': True, 'where': 'chinatown'}, r

def test_the_menus_and_their_ways_of_eating(b):
    r = json.loads(ev(b, "(() => { " + BEGIN + """
      const ids = (m) => TOWN.MENU[m].items.map((i) => i[0]);
      return JSON.stringify({ buta: ids('butaman'), ryuho: ids('ryuho'), pics: ['豚まん', '小籠包', 'ごまだんご', 'タピオカミルクティー'].every((k) => PICS_TOWN[k]),
        gyoza: YEN.known(TOWN.MENU.ryuho.items[0]), buns: YEN.known(TOWN.MENU.butaman.items[0]) }); })()"""))
    assert r['buta'] == ['butaman', 'shoronpo', 'gomadango', 'tapioca'] and r['ryuho'] == ['gyoza', 'chukasoba', 'jasmine'] and r['pics'], r
    assert r['gyoza'] is False and r['buns'] is True, r   # 餃子 waits for its word; 王's own things are for anyone

def test_the_generator_has_wang_s_lines(b):
    r = json.loads(ev(b, """(() => { const ls = talkLines(); return JSON.stringify({ wang: ls.some(([w, l]) => w === 'wang' && l.includes('ニーハオ')), taste: ls.some(([w, l]) => w === 'wang' && l.includes('ししょく')),
      price: ls.some(([w, l]) => w === 'wang' && l.includes('250円')), ryuho: ls.some(([w]) => w === 'ryuho') }); })()"""))
    assert r == {'wang': True, 'taste': True, 'price': True, 'ryuho': True}, r

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
