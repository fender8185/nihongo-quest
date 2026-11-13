"""test build (2026-11-12): the cruise ship (CRUISE) — once a unit (t1 = m1 round the whole town, t2 = m2 白鷺城 and the 居酒屋),
after meeting 高橋 (m1-7); far out off みなと漁港, tapped it asks first (a long one), then comes in; 高橋 and the passengers (a group
that only grows: t2 brings マイク) come down and crowd round; the stops one after another — next door all walking over together,
further off by bus or on foot, into the 食堂 and the 居酒屋 to sit down — seen off at the end. Kept with the progress
(state.cruise): left halfway they wait where they are. docs/superpowers/specs/2026-11-12-cruise-tour-design.md"""
import json, os, subprocess, sys, time
sys.path.insert(0, os.path.dirname(__file__))
from cdp import Browser
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
PORT = 8817
URL = f"http://127.0.0.1:{PORT}/"
READY = "typeof state === 'object' && !!state.updatedAt && typeof speakScript === 'function'"

def ev(b, js, pre=()):
    return b.run([("nav", URL), ("wait", READY)] + list(pre) + [("eval", js)], timeout=90)[-1]

# a main-course account at m2 (past t1's m1) at 10 in the morning, ムギ met, 高橋 met at the castle (m1-7), no town event waiting;
# motion reduced so walks and the ship's run in are over at once (the passengers still come down one at a time)
FRESH = """state.stage = 'main'; state.kanaKnown = true; state.introSeen = true; state.storyV = 9; state.startChosen = true; state.currentUnit = 'm2';
  state.met = { koharu: 1, mugi: 1 }; state.town = { done: { 'm1-6': '2026-11-09', 'm1-7': '2026-11-09' }, seen: {}, stops: { castle: 1 }, talks: {} };
  state.cruise = { done: {}, on: null }; saveState(); DAILY_CACHE = null;
  localStorage.removeItem('nq_wake'); localStorage.removeItem('nq_cruise_force'); localStorage.removeItem('nq_cruise_told'); TOWN.EVENTS = [];
  const mm = window.matchMedia; window.matchMedia = (q) => (/reduced-motion/.test(q) ? { matches: true } : mm.call(window, q));
  const wait = (ms) => new Promise(q => setTimeout(q, ms)), y = () => document.querySelector('#view .yard');
  const go = async (place) => { TOWNEV.clock = { h: 10, day: new Date(2026, 10, 10) }; location.hash = '#/' + place; document.getElementById('view').innerHTML = ''; route(); await wait(300); };
  const people = () => [...document.querySelectorAll('#view .tourist')].map((e) => e.dataset.who);
  const until = async (f, ms = 20000) => { const t0 = Date.now(); while (!f() && Date.now() - t0 < ms) await wait(50); return f(); };
  // through the talks (a reply choice: the options in turn till the right one) and on along the bar, till done() or stuck
  const drive = async (done, ms = 60000) => { const seen = [], places = new Set(), t0 = Date.now(); let sat = 0;
    while (!done() && Date.now() - t0 < ms) {
      if (y()) places.add(y().dataset.place); sat = Math.max(sat, document.querySelectorAll('#view .tourist.bench, #view .tourist.kneel').length);
      const card = document.querySelector('.talk-card');
      if (card) { if (card.classList.contains('asking')) { const o = card.querySelector('.talk-opt:not(.wrong) .talk-pick'); if (o) o.click(); } else document.querySelector('.talk').click(); await wait(15); continue; }
      const b = document.querySelector('#view .cr-takahashi .ev-mark'); if (b) { seen.push(document.querySelector('.cruise-bar .cb-t').textContent); b.closest('.tourist').click(); await wait(40); continue; }   // 高橋's 「！」
      await wait(60); }
    return { seen, places: [...places].sort(), sat }; };
  const call = async () => { await go('harbor'); document.querySelector('.cruise-call').click(); await wait(100); document.querySelector('[data-act=cruise-start]').click(); await until(() => document.querySelector('.talk-card')); };"""

def titles(b, k):
    return [s['title'] for s in json.loads(ev(b, f"JSON.stringify(TOWN.CRUISE.TRIPS[{k}].stops)"))]

def test_no_ship_till_takahashi_is_met_and_the_course_is_there(b):
    r = json.loads(ev(b, "(async () => { " + FRESH + """ state.town.done = {}; saveState(); await go('harbor');
      const before = !!y().querySelector('.cruise-ship');
      state.town.done = { 'm1-6': '2026-11-09', 'm1-7': '2026-11-09' }; state.currentUnit = 'm0'; saveState(); await go('harbor'); const early = !!y().querySelector('.cruise-ship');
      state.currentUnit = 'm2'; saveState(); await go('harbor');
      return JSON.stringify({ before, early, far: !!y().querySelector('.cruise-ship.far'), call: !!y().querySelector('.cruise-call'), trip: (CRUISE.waiting() || {}).id }); })()"""))
    assert r == {'before': False, 'early': False, 'far': True, 'call': True, 'trip': 't1'}, r

def test_tapped_it_asks_first_then_comes_in_and_they_come_down_one_by_one(b):
    r = json.loads(ev(b, "(async () => { " + FRESH + """ await go('harbor'); document.querySelector('.cruise-call').click(); await wait(100);
      const asked = (document.querySelector('.modal') || {}).textContent || ''; document.querySelector('[data-act=close-modal]').click(); await wait(100);
      const still = !!y().querySelector('.cruise-ship.far') && !state.cruise.on;
      document.querySelector('.cruise-call').click(); await wait(100); document.querySelector('[data-act=cruise-start]').click(); await wait(400);
      const docked = !y().querySelector('.cruise-ship.far') && !!y().querySelector('.cruise-ramp');
      await wait(2000); const early = people().filter((id) => id !== 'takahashi').length;
      await until(() => document.querySelector('.talk-card'));
      return JSON.stringify({ asked: /20.30 分鐘/.test(asked) && /中途可以離開/.test(asked), still, docked, early, all: people().sort(), on: state.cruise.on }); })()"""))
    assert r['asked'] and r['still'] and r['docked'] and 0 < r['early'] < 8, r   # asked first (等一下: still out there); then down in turn
    assert r['all'] == sorted(['takahashi', 'kaneda', 'umeko', 'yuta', 'rina', 'yoshimoto', 'ken', 'ai', 'michiyama']), r
    assert r['on'] == {'trip': 't1', 'step': 0, 'place': 'harbor', 'score': {}}, r   # its replies tallied as they come (score)

def test_trip_one_goes_right_round_the_town_into_the_shokudo_and_back(b):
    r = json.loads(ev(b, "(async () => { " + FRESH + """ const errs = []; window.addEventListener('error', (e) => errs.push(String(e.message)));
      await call(); const d = await drive(() => !!state.cruise.done.t1, 150000);
      await wait(300); const box = document.querySelector('.cr-result'), res = state.cruise.res.t1;
      const shown = box && { stamp: box.querySelector('.crr-stamp b').textContent, nums: [...box.querySelectorAll('i[data-n]')].map((x) => x.textContent), rank: box.querySelector('.crr-rank').textContent };
      box.querySelector('.crr-ok').click(); await wait(200); const intro = (document.querySelector('.talk-card') || {}).textContent || '';
      while (document.querySelector('.talk-card')) { document.querySelector('.talk').click(); await wait(30); }
      const kb = () => document.querySelector('.yard-tools .study-koto'), koto = kb().textContent, act = kb().dataset.act;
      kb().click(); const yen = { text: kb().querySelector('span').textContent, cls: kb().className }; kb().click(); const back = kb().querySelector('span').textContent;
      await go('harbor');
      return JSON.stringify(Object.assign(d, { done: state.cruise.done, on: state.cruise.on, ship: !!y().querySelector('.cruise-ship'), errs, res, found: state.koto.found['cruise-t1'],
        shown, intro, koto, act, yen, back, kotoNow: kotoBalance(), bal: yenBalance(), asks: TOWN.CRUISE.TRIPS[0].stops.flatMap((s) => s.lines).filter((l) => !Array.isArray(l)).length })); })()"""))
    assert r['seen'] == titles(b, 0)[1:], r   # every stop after the first (that one begins by itself) on along the bar, ムギ's too
    assert r['places'] == ['beach', 'harbor', 'park', 'shokudo', 'street', 'town', 'yard'] and r['sat'] >= 4, r   # round the whole map; sat down in the 食堂
    assert list(r['done']) == ['t1'] and r['on'] is None and not r['ship'] and r['errs'] == [], r   # the next one comes another day (on the test site: at once)
    res = r['res']   # each reply once: right at once 2 言靈, after one wrong 1, the last 0; N5's pay 5,000 円 and 200 a grade up
    assert res['asks'] == r['asks'] and res['koto'] == r['found'] and res['yen'] == 5000 + 200 * res['grade'] and r['bal'] == res['yen'], r
    assert r['shown']['stamp'] == 'EDCBAS'[res['grade']], r
    assert r['shown']['nums'] == [str(res['first']), str(res['koto']), '5,000'] + (['{:,}'.format(200 * res['grade'])] if res['grade'] else []) + ['{:,}'.format(res['yen'])] and '見習いガイド' in r['shown']['rank'], r
    assert 'お礼' in r['intro'], r   # the wallet's first 円: 高橋 says what it is
    assert r['act'] == 'purse' and r['yen']['text'] == '{:,}'.format(res['yen']) and 'yen' in r['yen']['cls'] and r['back'] == str(r['kotoNow']), r   # 言靈 ↔ 円 up top

def test_trip_two_brings_mike_by_bus_to_the_castle_and_into_the_izakaya(b):
    r = json.loads(ev(b, "(async () => { " + FRESH + """ const errs = []; window.addEventListener('error', (e) => errs.push(String(e.message)));
      CRUISE.skipTo('t2'); await go('harbor'); document.querySelector('.cruise-call').click(); await wait(100);
      const asked = document.querySelector('.modal').textContent; document.querySelector('[data-act=cruise-start]').click();
      await until(() => document.querySelector('.talk-card')); const party = people().length;
      const d = await drive(() => !!state.cruise.done.t2, 150000);
      return JSON.stringify(Object.assign(d, { asked: /マイク/.test(asked), party, done: Object.keys(state.cruise.done).sort(), errs })); })()"""))
    assert r['asked'] and r['party'] == 10, r   # the eight, マイク, 高橋
    assert r['seen'] == titles(b, 1)[1:] and r['places'] == ['castle', 'harbor', 'izakaya'] and r['sat'] >= 6, r
    assert r['done'] == ['t1', 't2'] and r['errs'] == [], r

def test_left_halfway_they_wait_where_they_are_even_after_a_reload(b):
    out = b.run([("nav", URL), ("wait", READY), ("eval", "(async () => { " + FRESH + """ await call();
      await drive(() => state.cruise.on && state.cruise.on.place === 'town', 80000); await until(() => document.querySelector('#view .cr-takahashi .ev-mark'));
      return JSON.stringify(state.cruise.on); })()"""), ("nav", URL), ("wait", READY), ("eval", """(async () => {
      const wait = (ms) => new Promise(q => setTimeout(q, ms)), y = () => document.querySelector('#view .yard'), people = () => document.querySelectorAll('#view .tourist').length;
      const go = async (place) => { location.hash = '#/' + place; document.getElementById('view').innerHTML = ''; route(); await wait(300); };
      const on = state.cruise.on; await go('harbor'); const harbor = { ship: !!y().querySelector('.cruise-ship:not(.far)'), people: people(), bar: y().querySelector('.cruise-bar').textContent };
      await go('town'); const town = { people: people(), bar: y().querySelector('.cruise-bar').textContent };
      return JSON.stringify({ on, harbor, town }); })()""")], timeout=120)
    was, r = json.loads(out[-2]), json.loads(out[-1])
    assert was['trip'] == 't1' and was['place'] == 'town' and r['on'] == was, r   # kept with the progress
    assert r['harbor'] == {'ship': True, 'people': 0, 'bar': '遊客在小鎮等你'}, r   # the ship still in; they wait in town
    assert r['town']['people'] == 9 and '「！」' in r['town']['bar'], r   # on by 高橋's 「！」

def test_off_next_door_they_come_along_off_further_they_stay(b):
    r = json.loads(ev(b, "(async () => { " + FRESH + """ await call(); await drive(() => state.cruise.on.step >= 1, 20000);
      await until(() => document.querySelector('#view .cr-takahashi .ev-mark'));
      await go('beach'); await wait(200); const beach = { people: people().length, place: state.cruise.on.place };
      await go('castle'); const castle = { people: people().length, bar: (y().querySelector('.cruise-bar') || {}).textContent || '' };
      return JSON.stringify({ beach, castle, place: state.cruise.on.place }); })()"""))
    assert r['beach'] == {'people': 9, 'place': 'beach'}, r   # harbour → beach: next door, they tag along
    assert r['castle'] == {'people': 0, 'bar': '遊客在海邊等你'} and r['place'] == 'beach', r   # by bus on his own: they stay

def test_the_test_site_tools_call_the_next_one_and_begin_again(b):
    r = json.loads(ev(b, "(async () => { " + FRESH + """ state.town.done = {}; state.currentUnit = 'm0'; saveState();
      const t = CRUISE.force(); await go('harbor'); const forced = { trip: t.id, far: !!y().querySelector('.cruise-ship.far') };
      CRUISE.skipTo('t2'); const skipped = { done: Object.keys(state.cruise.done), waiting: CRUISE.waiting().id };
      CRUISE.reset(); return JSON.stringify({ forced, skipped, reset: state.cruise }); })()"""))
    assert r == {'forced': {'trip': 't1', 'far': True}, 'skipped': {'done': ['t1'], 'waiting': 't2'}, 'reset': {'done': {}, 'on': None, 'res': {}}}, r

def test_takahashi_is_met_early_and_his_castle_desk_is_empty_while_he_is_out_with_them(b):
    r = json.loads(ev(b, """(async () => { const ev = TOWN.EVENTS, m1 = ev.filter((e) => e.u === 'm1').map((e) => e.id);
      const opens = ev.find((e) => e.id === 'm1-6').opens, host = ev.find((e) => e.id === 'm1-7');
      return JSON.stringify({ order: m1.slice(0, 3), opens, host: [host.who, host.at], needs: TOWN.CRUISE.TRIPS[0].needs }); })()"""))
    assert r == {'order': ['m1-1', 'm1-6', 'm1-7'], 'opens': 'castle', 'host': ['takahashi', 'castle'], 'needs': 'm1-7'}, r   # second and third in m1
    r = json.loads(ev(b, "(async () => { " + FRESH + """ state.town.seen = { takahashi: 1 }; saveState(); await go('castle'); const before = !!y().querySelector('.npc[data-npc=takahashi]');
      state.cruise.on = { trip: 't1', step: 3, place: 'harbor' }; saveState(); await go('castle');
      return JSON.stringify({ before, after: !!y().querySelector('.npc[data-npc=takahashi]') }); })()"""))
    assert r == {'before': True, 'after': False}, r

def test_together_they_speak_as_one_quick_retort_a_laugh_is_a_laugh_and_a_cry_is_not_read(b):
    # 2026-11-13, the user: one even voice reading みんな's さむい and あはは, or 吉本's いたい, sounded like a robot
    r = json.loads(ev(b, """(async () => { const asked = [], fx = [], realE = engineBlob, realF = window.fetch;
      engineBlob = async (text, g, opt) => { asked.push(opt && opt.cast); return null; };
      window.fetch = async (url) => { fx.push(String(url)); return new Response(new Uint8Array(10), { status: 404 }); };
      const cfg = ttsConfig; ttsConfig = () => Object.assign({}, cfg(), { engine: 'cloud' });
      await speakAs('all', 'さむっ！'); const chorus = asked.splice(0);
      await speakAs('all', 'あはは！'); await speakAs('yoshimoto', 'いたい！ いたい！ カニが…！', 'ouch');
      engineBlob = realE; window.fetch = realF; ttsConfig = cfg;
      const listed = []; CRUISE.lines((who, ja) => listed.push([who, ja]));
      const of = (ja) => listed.filter((l) => l[1] === ja).map((l) => l[0]);
      const sam = TOWN.CRUISE.TRIPS[0].stops.flatMap((s) => s.lines).find((l) => Array.isArray(l) && l[0] === 'all' && l[1] === 'さむっ！');
      return JSON.stringify({ chorus, others: asked, fx: fx.map((u) => u.replace(/^.*\//, '')), samu: of('さむっ！'), laugh: of('あはは！'), ouch: of('いたい！ いたい！ カニが…！'),
        snd: sam[3], all: listed.some((l) => l[0] === 'all') }); })()"""))
    five = ['kaneda', 'umeko', 'rina', 'yoshimoto', 'ken']
    assert r['chorus'] == five + [None] and r['others'] == [], r   # five of them at once (no clips here: then as any line); the laugh and the cry: no voice
    assert r['fx'] == ['laugh-2.m4a', 'ouch-1.m4a'], r
    assert sorted(set(r['samu'])) == sorted(five) and r['laugh'] == [] and r['ouch'] == [] and not r['all'], r   # the generator makes each chorus voice's clip, no laugh or cry
    assert r['snd'] == {'snd': 'brr'}, r   # a cold gust under it

def test_the_tour_has_its_own_music_where_the_passengers_are_and_the_ship_its_horn(b):
    r = json.loads(ev(b, "(async () => { " + FRESH + """ const played = [], realP = SND.play; SND.play = (n, o) => { played.push(n); };
      await call(); SND.play = realP;
      const at = (r) => CRUISE.tune(r), on = state.cruise.on;
      const here = at('harbor'), there = at('town'); on.place = 'izakaya'; const iz = at('izakaya'); on.place = 'harbor';
      const rec = MUSIC.RECORDS.find((x) => x.id === 'minato');
      return JSON.stringify({ here, there, iz, horn: played.filter((n) => n === 'shiphorn').length, steps: played.includes('steps-wood'), rec: rec && [rec.place, rec.file], mine: MUSIC.have ? null : 0 }); })()"""))
    assert r['here'] == 'minato' and r['there'] == '' and r['iz'] == '', r   # with them, not elsewhere; the 居酒屋 keeps its own
    assert r['horn'] == 2 and r['steps'] and r['rec'] == ['cruise', 'music/minato-1.m4a'], r   # far out and as it docks; down the gangway

def test_on_the_main_road_they_keep_to_the_pavement_and_a_bus_pulls_in_at_the_stop(b):
    r = json.loads(ev(b, "(async () => { " + FRESH + """ await call();
      await drive(() => state.cruise.on && state.cruise.on.step >= 18, 120000);
      await until(() => document.querySelector('#view .cr-takahashi .ev-mark')); document.querySelector('#view .cr-takahashi .ev-mark').closest('.tourist').click();
      await until(() => document.querySelector('.talk-card')); await wait(400);
      const XY = (e) => { const m = /translate\\(([-\\d.]+)px,\\s*([-\\d.]+)px\\)/.exec(e.style.transform); return [+m[1], -m[2]]; };
      const ys = [...document.querySelectorAll('#view .tourist')].map((e) => XY(e)[1]);
      return JSON.stringify({ place: y().dataset.place, step: state.cruise.on.step, bus: !!y().querySelector('.cr-bus'), road: ys.filter((Y) => Y > STREET.road[0] && Y < STREET.road[1]).length }); })()"""))
    assert r['place'] == 'street' and r['bus'] and r['road'] == 0, r   # the far pavement (Y 116–134), not the road

def test_at_the_table_they_eat_a_while_and_each_has_a_word_when_tapped(b):
    # 2026-11-13, the user: sat down and spread out they could each be talked to; 下一站 shows 用餐中 for five seconds
    r = json.loads(ev(b, "(async () => { " + FRESH + """ await call();
      await drive(() => state.cruise.on && state.cruise.on.step >= 14 && !document.querySelector('.talk-card'), 120000);
      await wait(200); const bar = document.querySelector('.cruise-bar').textContent, btn = !!document.querySelector('#view .cr-takahashi .ev-mark');
      const sat = document.querySelector('#view .tourist.bench:not(.cr-takahashi)'), id = sat && sat.dataset.who;
      const realS = speakAs, heard = []; speakAs = (w, l) => { heard.push([w, l]); return Promise.resolve(); };
      sat.click(); await wait(100); speakAs = realS;
      const word = heard[0] && heard[0][1], eat = (TOWN.CRUISE.EAT[id] || []).map((l) => l[1]);
      await wait(5200); const later = !!document.querySelector('#view .cr-takahashi .ev-mark');
      return JSON.stringify({ place: y().dataset.place, bar, btn, id, word, eat, later }); })()"""))
    assert r['place'] == 'shokudo' and '用餐' in r['bar'] and not r['btn'], r
    assert r['word'] in r['eat'], r   # a word for the table
    assert r['later'], r   # on after five seconds

def test_the_pay_goes_by_the_share_right_at_once_and_the_courses_level(b):
    r = json.loads(ev(b, """(() => { const t1 = TOWN.CRUISE.TRIPS[0], sc = (n0, n1, n2) => Object.fromEntries([...Array(n0).fill(0), ...Array(n1).fill(1), ...Array(n2).fill(2)].map((m, k) => [`1.${k}`, m]));
      const pick = (x) => [x.first, x.asks, x.koto, x.yen, x.grade];
      return JSON.stringify({ all: pick(CRUISE.result(t1, sc(20, 0, 0))), most: pick(CRUISE.result(t1, sc(17, 2, 1))), half: pick(CRUISE.result(t1, sc(10, 5, 5))), none: pick(CRUISE.result(t1, sc(2, 4, 14))),
        n4: CRUISE.result(Object.assign({}, t1, { u: DATA.UNITS.find((u) => u.lv === 'N4').id }), sc(20, 0, 0)).yen, n3: CRUISE.result(Object.assign({}, t1, { u: DATA.UNITS.find((u) => u.lv === 'N3').id }), sc(0, 0, 20)).yen,
        ranks: [0, 1, 2, 3, 7, 8, 14, 15, 33].map(CRUISE.rankOf) }); })()"""))
    assert r['all'] == [20, 20, 40, 6000, 5] and r['most'] == [17, 20, 36, 5800, 4] and r['half'] == [10, 20, 25, 5400, 2] and r['none'] == [2, 20, 8, 5000, 0], r   # S A C E
    assert r['n4'] == 8000 and r['n3'] == 10000, r
    assert r['ranks'] == ['', '見習いガイド', '見習いガイド', 'ガイド', 'ガイド', 'ベテランガイド', 'ベテランガイド', '主任ガイド', '主任ガイド'], r

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
