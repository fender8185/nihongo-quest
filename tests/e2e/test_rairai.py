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

# ---- 外場 (HALL): customers come in, sit, call, eat, pay; the hero goes to them and picks what to say ----
HALLT = """const yard = () => document.querySelector('.yard');
  const start = async (fresh) => { word('いらっしゃいませ', 'どうぞ', 'はい'); if (!fresh) state.work.res['2026-01-01'] = { place: 'waiter', done: 1, score: { 0: 0 }, yen: 100, grade: 'S' };
    window.speakAs = () => Promise.resolve(); HALL.pace = 0.02; await into(); WORK.start(yard(), 'waiter'); await wait(300); };
  const now = () => HALL.now(), ask = () => now().ask, goTo = async (k) => { HALL.at(yard(), k); await wait(120); };
  const answer = async (right) => { const a = ask(); [...document.querySelectorAll('.hl-opt')].find((x) => (x.dataset.o === a.right) === right).click(); await wait(150); };
  const until = async (f) => { for (let i = 0; i < 100 && !f(); i++) await wait(50); return f(); };
  const cust = (st) => now().cust.find((c) => c.state === st);
  const drive = async () => { for (let i = 0; i < 600 && now() && !now().over; i++) { const n = now(), c = n.cust;
      if (n.ask) { await answer(true); continue; }
      if (c.some((x) => x.state === 'in')) { await goTo('entry'); continue; }
      if (c.some((x) => x.state === 'wait')) { const free = [0, 1, 2].find((t) => !c.some((x) => x.table === t)); if (free !== undefined) { await goTo('table' + free); continue; } }
      const call = c.find((x) => x.state === 'call'); if (call) { await goTo('table' + call.table); continue; }
      if (n.tray) { await goTo('table' + c.find((x) => x.id === n.tray.for).table); continue; }
      if (n.ready.length) { await goTo('pass'); continue; }
      if (c.some((x) => x.state === 'pay')) { await goTo('register'); continue; }
      await wait(40); } };"""

def test_waiter_needs_the_three_words(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + """ const out = { none: WORK.can('waiter') }; word('いらっしゃいませ', 'どうぞ'); out.two = WORK.can('waiter').why; word('はい'); out.all = WORK.can('waiter').ok;
      TOWNEV.clock = { h: 21, day: new Date(2026, 10, 10) }; out.night = WORK.can('waiter').why; TOWNEV.clock = { h: 12, day: new Date(2026, 10, 10) };
      await into(); out.offer = WORK.offer('huang', 'rairai'); return JSON.stringify(out); })()"""))
    assert not r['none']['ok'] and 'いらっしゃいませ' in r['none']['why'] and 'はい' in r['two'] and 'どうぞ' not in r['two'] and r['all'], r
    assert '20' in r['night'] and r['offer'] == 'waiter', r

def test_a_customer_comes_in_and_is_greeted(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + HALLT + """ await start(); await until(() => cust('in'));
      const el = document.querySelector('.yard .cust'), out = { mark: Boolean(el && el.querySelector('.hl-mark')) && el.classList.contains('need') };
      await goTo('entry'); const a = ask(); out.kind = a.kind; out.opts = a.opts.length === 3 && a.opts.includes('いらっしゃいませ！'); out.panel = document.querySelectorAll('.hl-pick .hl-opt').length;
      await answer(false); out.still = Boolean(ask()) && WORK.today().done === 0; await answer(false); out.hint = document.querySelector('.hl-opt.wk-hint').dataset.o;
      await answer(true); out.done = WORK.today().done; out.state = now().cust[0].state; out.gone = !document.querySelector('.hl-pick'); out.score = WORK.today().score[0];
      return JSON.stringify(out); })()"""))
    assert r == {'mark': True, 'kind': 'greet', 'opts': True, 'panel': 3, 'still': True, 'hint': 'いらっしゃいませ！', 'done': 1, 'state': 'wait', 'gone': True, 'score': 2}, r

def test_one_customer_from_the_door_to_the_register(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + HALLT + """ await start(); await until(() => cust('in')); const kinds = [];
      const take = async () => { kinds.push(ask().kind); await answer(true); };
      await goTo('entry'); await take(); await goTo('table0'); await take();
      await until(() => cust('call')); const said = []; window.speakAs = (w, l) => { said.push(w + ':' + l); return Promise.resolve(); }; await goTo('table0'); const heard = said.slice(); await take();
      await until(() => now().ready.length); await goTo('pass'); const tray = Boolean(now().tray) && Boolean(document.querySelector('.yhero .hl-tray'));
      await goTo('table0'); await take(); await until(() => cust('pay')); await goTo('register'); await take();
      return JSON.stringify({ kinds, heard: heard.some((x) => x.endsWith(':すみません！')), tray, done: WORK.today().done, carry: Boolean(document.querySelector('.yhero .hl-tray')) }); })()"""))
    assert r == {'kinds': ['greet', 'seat', 'call', 'serve', 'pay'], 'heard': True, 'tray': True, 'done': 5, 'carry': False}, r

def test_a_dish_to_the_wrong_table(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + HALLT + """ await start(); await until(() => cust('in')); HALL.spawn();
      for (const t of [0, 1]) { await until(() => cust('in')); await goTo('entry'); await answer(true); await goTo('table' + t); await answer(true); }
      await until(() => now().cust.filter((c) => c.state === 'call').length === 2); await goTo('table0'); await answer(true); await goTo('table1'); await answer(true);
      await until(() => now().ready.length === 2); await goTo('pass'); const to = now().cust.find((c) => c.id === now().tray.for).table, other = to === 0 ? 1 : 0;
      await goTo('table' + other); const a = ask(), out = { kind: a.kind, right: a.right }; await answer(true); out.still = Boolean(now().tray); out.miss = WORK.today().score[WORK.today().done - 1];
      await goTo('table' + to); out.serve = ask().kind; return JSON.stringify(out); })()"""))
    assert r == {'kind': 'sorry', 'right': 'すみません！', 'still': True, 'miss': 1, 'serve': 'serve'}, r

def test_ten_answers_pay(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + HALLT + """ await start(); await drive(); await until(() => document.querySelector('.wk-result'));
      const t = WORK.today(); return JSON.stringify({ done: t.done, yen: t.yen, grade: t.grade, result: Boolean(document.querySelector('.wk-result')), over: now() ? now().over : null }); })()"""))
    assert r == {'done': 10, 'yen': 150, 'grade': 'S', 'result': True, 'over': True}, r

def test_leaving_mid_shift_and_back_picks_up(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + HALLT + """ await start(); await until(() => cust('in')); await goTo('entry'); await answer(true); await goTo('table0'); await answer(true);
      location.hash = '#/chinadori'; route(); await wait(400); const out = { off: !HALL.on(), custs: document.querySelectorAll('.cust').length };
      await into(); WORK.start(yard(), 'waiter'); await wait(300); out.k = now().k; out.on = HALL.on(); return JSON.stringify(out); })()"""))
    assert r == {'off': True, 'custs': 0, 'k': 2, 'on': True}, r

def test_huang_tapped_on_a_shift_hands_over_the_dish(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + HALLT + """ await start(); await until(() => cust('in')); await goTo('entry'); await answer(true); await goTo('table0'); await answer(true);
      await until(() => cust('call')); await goTo('table0'); await answer(true); await until(() => now().ready.length);
      const mark = Boolean(document.querySelector('.npc[data-npc="huang"] .hl-mark')); document.querySelector('.npc[data-npc="huang"]').click();
      await until(() => now().tray); return JSON.stringify({ mark, tray: Boolean(now().tray), talk: Boolean(document.querySelector('.talk')) }); })()"""))
    assert r == {'mark': True, 'tray': True, 'talk': False}, r

def test_the_pick_panel_fits_a_phone(b):
    r = json.loads(b.run([("metrics", (360, 640)), ("nav", URL), ("wait", READY), ("eval", "(async () => { " + BEGIN + HALLT + """ await start(); await until(() => cust('in')); await goTo('entry');
      const bs = [...document.querySelectorAll('.hl-opt')].map((x) => x.getBoundingClientRect());
      return JSON.stringify({ n: bs.length, fit: bs.every((q) => q.left >= 0 && q.right <= innerWidth && q.bottom <= innerHeight && q.top >= 0 && q.height >= 44) }); })()""")])[-1])
    assert r == {'n': 3, 'fit': True}, r

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
