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

# the page's helpers: motion reduced so walks and the ship's run in are over at once (the passengers still come down one at a
# time; mm: the real one); to a place at 10 in the morning, through the talks and on along the bar (drive), the ship called in
KIT = """const mm = window.matchMedia; window.matchMedia = (q) => (/reduced-motion/.test(q) ? { matches: true } : mm.call(window, q));
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
# a main-course account at m2 (past t1's m1), ムギ met, 高橋 met at the castle (m1-7), no town event waiting
FRESH = """state.stage = 'main'; state.kanaKnown = true; state.introSeen = true; state.storyV = 9; state.startChosen = true; state.currentUnit = 'm2';
  state.met = { koharu: 1, mugi: 1 }; state.town = { done: { 'm1-6': '2026-11-09', 'm1-7': '2026-11-09' }, seen: {}, stops: { castle: 1 }, talks: {} };
  state.cruise = { done: {}, on: null }; saveState(); DAILY_CACHE = null;
  localStorage.removeItem('nq_wake'); localStorage.removeItem('nq_cruise_force'); localStorage.removeItem('nq_cruise_told'); TOWN.EVENTS = [];
  """ + KIT
# a trip of the test's own (2026-11-23, docs/superpowers/specs/2026-11-23-cruise-t3-t6-design.md §1.1–§1.3): t1's stops put
# aside for stops written here — 高橋's line, and a reply choice where asked — and the group set down before one of them (at: the
# next stop, where they wait, the replies so far)
TRY = """const T1 = TOWN.CRUISE.TRIPS[0], line = ['takahashi', 'はい、こちらです。', '來，這邊請。'], reply = { ask: '回答', opts: [['はい。', 1], ['いいえ。', 0, '不對']], pt: 'm1' };
  const stop = (id, place, hero, crowd, { ask, ...o } = {}) => Object.assign({ id, at: place, title: '站' + id, hero, crowd, lines: ask ? [line, reply] : [line] }, o);
  const at = (id, place, score = {}) => { state.cruise.on = { trip: 't1', step: T1.stops.findIndex((s) => s.id === id), stop: id, place, score }; saveState(); };
  const XY = (e) => { const m = /translate\\(([-\\d.]+)px,\\s*([-\\d.]+)px\\)/.exec(e.style.transform); return [+m[1], -m[2]]; };
  const tourists = () => [...document.querySelectorAll('#view .tourist')];"""
# みなと駅's platform, then by train to the harbour (spec §1.1); 奥社's 茶屋 for a meal out of doors (§1.2); by bus to 稲荷神社,
# 白鷺城 and 稲荷神社 again (§1.3)
TRAIN = """[stop('hi', 'harbor', [180, 56], [40, 40]), stop('pf', 'platform', [300, 64], [150, 50], { ask: 1 }),
  stop('tr', 'harbor', [-200, 56], [-330, 44], { go: 'train', ask: 1 }), stop('bye', 'harbor', [180, 56], [40, 40], { bye: true })]"""
MEAL = """[stop('hi', 'harbor', [180, 56], [40, 40]), stop('ok', 'oku', [330, 80], [460, 96], { eat: true, ask: 1 }),
  stop('nx', 'oku', [-100, 80], [-230, 90], { ask: 1 }), stop('bye', 'harbor', [180, 56], [40, 40], { go: 'bus', bye: true })]"""
BUS = """[stop('hi', 'harbor', [180, 56], [40, 40]), stop('sh', 'shrine', [300, 62], [180, 54], { go: 'bus' }), stop('cs', 'castle', [90, 60], [230, 54], { go: 'bus' }),
  stop('sh2', 'shrine', [300, 62], [180, 54], { go: 'bus' }), stop('bye', 'harbor', [180, 56], [40, 40], { go: 'bus', bye: true })]"""
# a whole trip through, every reply right at once (the one its stop's data marks right, wherever the card shows it): the places in
# the order they come, the most sat down at each, the town's people seen at each (there or brought out), the stops on along the bar
RIGHT = """const right = (card) => { const t = CRUISE.current(), s = t && t.stops.find((x) => x.id === state.cruise.on.stop), ask = (card.querySelector('.talk-name span') || {}).textContent;
    const L = s && s.lines.find((l) => !Array.isArray(l) && l.ask === ask), k = L ? L.opts.findIndex((o) => o[1]) : -1; return card.querySelector(`.talk-opt[data-pick="${k}"] .talk-pick`); };
  const tour = async (done, look, ms = 240000) => { const seen = [], order = [], sat = {}, folk = {}, t0 = Date.now();   // look(place): a peek each step
    while (!done() && Date.now() - t0 < ms) {
      const p = y() && y().dataset.place; if (p && look) await look(p);
      if (p) { if (order[order.length - 1] !== p) order.push(p); sat[p] = Math.max(sat[p] || 0, document.querySelectorAll('#view .tourist.bench, #view .tourist.kneel').length);
        folk[p] = [...new Set((folk[p] || []).concat([...document.querySelectorAll('#view [data-npc], #view .cr-extra')].map((e) => e.dataset.npc || (/npc-(\\w+)/.exec(e.className) || [])[1])))]; }
      const card = document.querySelector('.talk-card');
      if (card) { if (card.classList.contains('asking')) { const o = right(card); if (!o) return { stuck: (card.querySelector('.talk-name span') || {}).textContent, seen, order }; o.click(); } else document.querySelector('.talk').click(); await wait(15); continue; }
      const b = document.querySelector('#view .cr-takahashi .ev-mark'); if (b) { seen.push(document.querySelector('.cruise-bar .cb-t').textContent); b.closest('.tourist').click(); await wait(40); continue; }
      await wait(60); }
    return { seen, order, sat, folk }; };
  const trip = (id) => TOWN.CRUISE.TRIPS.find((t) => t.id === id);
  const asks = (t) => t.stops.flatMap((s) => s.lines).filter((l) => !Array.isArray(l));"""

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
    assert r['on'] == {'trip': 't1', 'step': 0, 'stop': 'hello', 'place': 'harbor', 'score': {}}, r   # its replies tallied as they come (score); the next stop by its id too

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
    # 2026-11-13: an event of his waiting at the castle comes first — he is there for it while they wait elsewhere (not when
    # they are at the castle with him)
    r = json.loads(ev(b, "(async () => { " + FRESH + """ state.town.seen = { takahashi: 1 }; TOWN.EVENTS = [{ id: 'x-taka', u: 'm1', who: 'takahashi', at: 'castle', title: 't', lines: [['takahashi', 'こんにちは。', '你好。']] }];
      state.cruise.on = { trip: 't1', step: 3, place: 'harbor' }; saveState(); await go('castle'); const waits = !!y().querySelector('.npc[data-npc=takahashi]');
      state.cruise.on = { trip: 't2', step: 2, place: 'castle' }; saveState(); await go('castle');
      return JSON.stringify({ waits, with: !!y().querySelector('.npc[data-npc=takahashi]') }); })()"""))
    assert r == {'waits': True, 'with': False}, r

def test_the_trip_under_way_is_kept_by_its_stops_ids(b):
    # 2026-11-13: a trip rewritten later (a stop added) carries on from the same stop; each reply counted once all the same;
    # one begun before the ids (step and scores by number) is put by id; a shop on the way opens only where they are
    r = json.loads(ev(b, "(async () => { " + FRESH + """ const t1 = TOWN.CRUISE.TRIPS[0];
      state.cruise.on = { trip: 't1', step: 3, place: 'harbor', score: { '1.5': 0, '3.9': 2 } }; saveState(); await go('harbor');
      const moved = Object.assign({}, state.cruise.on); await until(() => !document.querySelector('.talk-card'));
      t1.stops.splice(1, 0, Object.assign({}, t1.stops[1], { id: 'extra' }));   // a stop added before it
      await go('harbor'); const bar = document.querySelector('.cruise-bar .cb-t').textContent;
      const away = TOWNEV.shopState('shokudo'); state.cruise.on.place = 'shokudo'; const there = TOWNEV.shopState('shokudo');
      return JSON.stringify({ stop: moved.stop, score: moved.score, bar, want: t1.stops[4].title, away, there }); })()"""))
    s = r['score']
    assert r['stop'] == 'cat' and sorted(s) == ['cat.0', 'ship.0'] and s['ship.0'] == 0 and s['cat.0'] == 2, r   # by id now
    assert r['bar'] == r['want'], r   # still the same stop, a stop before it added
    assert r['away'] != 'open' and r['there'] == 'open', r   # 10 o'clock, before the 食堂's hours: open only with them in it

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

def test_a_train_takes_the_group_to_the_harbour(b):
    # 2026-11-23 (spec §1.1): a stop the group goes to by train — the screen fades under 「🚃 …」, then they all come in from the
    # side the station is on (みなと漁港: its sign to みなと駅, at the left edge) and over to the stop, on the harbour's ground
    r = json.loads(ev(b, "(async () => { " + FRESH + TRY + " T1.stops = " + TRAIN + """; at('pf', 'platform'); await go('platform');
      await drive(() => state.cruise.on.stop === 'tr', 30000); await until(() => document.querySelector('#view .cr-takahashi .ev-mark'));
      const bar = (document.querySelector('.cruise-bar .cb-go') || {}).textContent || '';
      window.matchMedia = mm; CRUISE.next(); const cap = (document.querySelector('.cruise-travel') || {}).textContent || '';   // walking in as they do
      await until(() => y() && y().dataset.place === 'harbor', 8000); const first = tourists().map((e) => Math.round(XY(e)[0]));
      await until(() => document.querySelector('.talk-card'), 20000); await until(() => !document.querySelector('#view .tourist.walk, #view .tourist.run'), 15000);
      const lim = ycam.YW / 2 - 20, bs = walkBlocks('harbor'), off = tourists().map((e) => [e.dataset.who, ...XY(e)]).filter(([, X, Y]) => Math.abs(X) > lim || Y < 12 || Y > walkTop('harbor', X) || bs.some((k) => yIn(k, [X, Y])));
      return JSON.stringify({ bar, cap, place: y().dataset.place, first, off, on: state.cruise.on }); })()"""))
    assert r['bar'] == '搭電車去みなと漁港' and r['cap'] == '🚃 大家一起搭電車去みなと漁港' and r['place'] == 'harbor', r
    assert len(r['first']) == 9 and all(x < -500 for x in r['first']), r   # 高橋 and the eight, in from the station's side
    assert r['off'] == [] and r['on']['place'] == 'harbor' and r['on']['stop'] == 'tr', r   # on the harbour's ground for the stop

def test_an_outdoor_meal_seats_them_on_benches_and_locks(b):
    # 2026-11-23 (spec §1.2): a meal out of doors (eat) — one to each seat of the place's (奥社: the 茶屋's 縁台), the rest
    # standing round in a loose ring; five seconds over it before the next stop, as at a table; on a phone's screen any of them
    # tapped, sat or standing, has a word for the meal
    out = b.run([("metrics", (390, 844)), ("nav", URL), ("wait", READY), ("eval", "(async () => { " + FRESH + TRY + " T1.stops = " + MEAL + """; at('ok', 'oku'); await go('oku');
      await drive(() => state.cruise.on.stop === 'nx', 30000); const t0 = Date.now(); await wait(150);
      const seats = PLACE_USE.oku.filter((t) => t.kind === 'sit').flatMap((t) => t.seats), sat = [...document.querySelectorAll('#view .tourist.bench')].map((e) => Math.round(XY(e)[0]));
      const ring = tourists().filter((e) => !e.matches('.bench, .cr-takahashi')).map(XY), lock = { bar: document.querySelector('.cruise-bar').textContent, mark: !!document.querySelector('#view .cr-takahashi .ev-mark') };
      CRUISE.next(); await wait(200); lock.went = state.cruise.on.stop !== 'nx' || !!document.querySelector('.talk-card, .cruise-travel');
      const realS = speakAs, heard = []; speakAs = (w, l) => { heard.push([w, l]); return Promise.resolve(); };
      const tap = (e) => { if (!e) return null; const r = [...e.querySelectorAll('.head')].map((h) => h.getBoundingClientRect()).find((q) => q.width > 0), x = (r.left + r.right) / 2, yy = (r.top + r.bottom) / 2;   // where a finger lands: on the head (the one shown, as they face)
        const hit = document.elementFromPoint(x, yy), w = hit && hit.closest('.tourist'); if (w) hit.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: x, clientY: yy })); return w ? [w.dataset.who, w.matches('.bench')] : null; };
      const taps = [tap(document.querySelector('#view .tourist.bench')), tap(tourists().find((e) => !e.matches('.bench, .cr-takahashi')))]; await wait(100); speakAs = realS;
      const eat = (id) => (TOWN.CRUISE.EAT[id] || []).filter((l) => l[0] === 'm1').map((l) => l[1]);
      await until(() => document.querySelector('#view .cr-takahashi .ev-mark'), 8000); const later = Date.now() - t0;
      CRUISE.next(); const went = await until(() => document.querySelector('.talk-card'), 5000);
      return JSON.stringify({ seats, sat, ring, lock, taps, eats: heard.map(([w, l]) => eat(w).includes(l)), later, went: !!went, w: innerWidth }); })()""")], timeout=90)
    r = json.loads(out[-1])
    assert r['w'] == 390 and len(r['seats']) >= 2 and sorted(r['sat']) == sorted(r['seats']), r   # one to a seat, all taken (no one of the town sits at 奥社)
    cx, cy = 442, 96   # the crowd's spot (112 from the hero at most)
    xs, ys = [p[0] for p in r['ring']], [p[1] for p in r['ring']]
    assert len(r['ring']) == 8 - len(r['sat']) and min(xs) < cx < max(xs) and min(ys) < cy < max(ys), r   # the rest stand round it
    assert '用餐' in r['lock']['bar'] and not r['lock']['mark'] and not r['lock']['went'], r   # at it five seconds: not on yet
    assert r['taps'][0] and r['taps'][0][1] and r['taps'][1] and not r['taps'][1][1] and len(r['eats']) == 2 and all(r['eats']), r   # sat or standing: a word for the meal
    assert 4800 < r['later'] < 6500 and r['went'], r
    # a seat one of the town sits on (西村, on 駅前's bench 10–16) is not theirs: the others only, one each
    r = json.loads(ev(b, "(async () => { " + FRESH + TRY + """ state.town.seen.nishimura = 1;
      T1.stops = [stop('hi', 'harbor', [180, 56], [40, 40]), stop('st', 'station', [60, 76], [-60, 72], { eat: true }), stop('bye', 'harbor', [180, 56], [40, 40], { go: 'bus', bye: true })];
      at('st', 'station'); await go('station'); await drive(() => state.cruise.on.stop === 'bye', 30000); await wait(150); const her = document.querySelector('#view .npc-nishimura');
      return JSON.stringify({ her: her && [her.matches('.bench'), Math.round(npcAt(her))], sat: [...document.querySelectorAll('#view .tourist.bench')].map((e) => Math.round(XY(e)[0])),
        seats: PLACE_USE.station.filter((t) => t.kind === 'sit').flatMap((t) => t.seats) }); })()"""))
    assert r['her'] == [True, -355] and sorted(r['sat']) == sorted(x for x in r['seats'] if x != -355), r

def test_the_tour_opens_a_bus_stop_it_takes_them_to(b):
    # 2026-11-23 (spec §1.3): a bus stop the story has not opened yet (稲荷神社: m8-1's) is opened by the group arriving there with
    # the tour, said once; 白鷺城 (open already) says nothing; the story's own opening still waits to be played
    r = json.loads(ev(b, "(async () => { const story = TOWN.EVENTS; " + FRESH + TRY + " T1.stops = " + BUS + """; at('sh', 'harbor'); await go('harbor');
      const toasts = [], realT = toast; toast = (m, ms) => { toasts.push(m); return realT(m, ms); };
      const before = Boolean(state.town.stops.shrine), d = await drive(() => state.cruise.on.stop === 'bye', 90000); toast = realT;
      TOWN.EVENTS = story; state.currentUnit = 'm9';   // the course past m8: its events open
      return JSON.stringify({ before, stops: state.town.stops, opened: toasts.filter((m) => /導覽/.test(m)), places: d.places, seen: d.seen,
        due: TOWNEV.due().some((e) => e.id === 'm8-1'), done: Boolean(state.town.done['m8-1']) }); })()"""))
    assert not r['before'] and r['stops'] == {'castle': 1, 'shrine': 1}, r   # open from now on: the bus takes the hero there himself
    assert r['opened'] == ['跟著導覽認識了稲荷神社，之後可以自己搭公車來'], r   # once, there; not for 白鷺城, open already, nor the second time
    assert r['places'] == ['castle', 'harbor', 'shrine'] and r['seen'] == ['站sh', '站cs', '站sh2'], r
    assert r['due'] and not r['done'], r   # m8-1 (陽菜, opening it in the story) still to come

def test_reload_mid_train_or_meal_resumes_without_double_score(b):
    # 2026-11-23 (the review): the page reloaded under the train's caption, or over a meal out of doors — the trip takes up again
    # at the stop it was at, the replies given kept and none given twice
    def twice(stops, first, place, step):
        return b.run([("nav", URL), ("wait", READY), ("eval", "(async () => { " + FRESH + TRY + " T1.stops = " + stops + "; at('" + first + "', '" + place + "', { 'hi.0': 0 }); await go('" + place + """');
          await drive(() => state.cruise.on.stop !== '""" + first + """', 30000); await until(() => !document.querySelector('.talk-card')); await wait(400);
          """ + step + """
          return JSON.stringify({ on: state.cruise.on, bar: document.querySelector('.cruise-bar').textContent, cap: (document.querySelector('.cruise-travel') || {}).textContent || '' }); })()"""),
          ("nav", URL), ("wait", READY), ("eval", "(async () => { const on = JSON.parse(JSON.stringify(state.cruise.on)); TOWN.EVENTS = []; " + KIT + TRY + " T1.stops = " + stops + """;
          await go(on.place); const sat = document.querySelectorAll('#view .tourist.bench').length, bar = [...document.querySelectorAll('.cruise-bar span')].map((e) => e.textContent);
          await drive(() => state.cruise.on.stop === 'bye', 60000);
          return JSON.stringify({ on, sat, bar, after: state.cruise.on, place: y().dataset.place }); })()""")], timeout=120)
    # the train: the platform's stop done, the caption up (a second and a half, walking as it is) and the page gone under it
    out = twice(TRAIN, 'pf', 'platform', "window.matchMedia = mm; CRUISE.next();")
    was, r = json.loads(out[0]), json.loads(out[1])
    assert '🚃' in was['cap'] and was['on']['stop'] == 'tr' and was['on']['place'] == 'platform' and sorted(was['on']['score']) == ['hi.0', 'pf.0'], was
    assert r['on'] == was['on'] and r['bar'][1:3] == ['站tr', '搭電車去みなと漁港'], r   # still on the platform, the train still to take
    assert r['place'] == 'harbor' and r['after']['stop'] == 'bye' and sorted(r['after']['score']) == ['hi.0', 'pf.0', 'tr.0'], r
    assert {k: r['after']['score'][k] for k in was['on']['score']} == was['on']['score'], r   # those given before, as they were
    # the meal: its talk over, the five seconds at it not
    out = twice(MEAL, 'ok', 'oku', "")
    was, r = json.loads(out[0]), json.loads(out[1])
    assert '用餐' in was['bar'] and was['on']['stop'] == 'nx' and was['on']['place'] == 'oku' and sorted(was['on']['score']) == ['hi.0', 'ok.0'], was
    assert r['on'] == was['on'] and r['sat'] >= 2 and r['bar'][1] == '站nx', r   # sat down again at the meal, the next stop next
    assert r['after']['stop'] == 'bye' and sorted(r['after']['score']) == ['hi.0', 'nx.0', 'ok.0'], r
    assert {k: r['after']['score'][k] for k in was['on']['score']} == was['on']['score'], r

# the four who join one a trip from t3 (spec §1.4): the trip each comes down on last, and its unit (one trip a unit)
NEW = {'hikaru': ['t3', 'm3'], 'mizuno': ['t4', 'm4'], 'miyoko': ['t5', 'm5'], 'ajimura': ['t6', 'm6']}

def test_four_new_passengers_join_one_a_trip_with_their_own_voice(b):
    # 2026-11-23 (spec §1.4): one more a trip — ひかる on t3, 水野 on t4, ミヨコ on t5, 味村 on t6 — each drawn in the hero's parts,
    # in a voice no one else on a tour has (all 30 Chirp 3 HD voices are someone's already: theirs said its own way, as
    # 日本語教室's), with words from their own trip's unit on; aboard from that trip only (a trip not written yet: none)
    r = json.loads(ev(b, """(() => { const C = TOWN.CRUISE, P = C.PEOPLE, NEW = """ + json.dumps(NEW) + """;
      const tIdx = (id) => C.TRIPS.findIndex((t) => t.id === id), uIdx = (u) => TOWNEV.unitIdx(u), name = (w) => (CAST_VOICE[w] || [])[0];
      const heard = new Set(['hero', 'takahashi', ...Object.keys(P)]);   // whom a tour hears: the passengers, the hero, 高橋, anyone on a trip
      C.TRIPS.forEach((t) => t.stops.forEach((s) => { (s.lines || []).forEach((l) => { if (Array.isArray(l)) heard.add(l[0]); }); (s.after || []).forEach((l) => heard.add(l[0])); Object.keys(s.cast || {}).forEach((w) => heard.add(w)); }));
      const full = (v) => JSON.stringify([v[0], v[1] || 1, v[2] || 0, v[3] || 0]);   // a voice as it is made and played
      return JSON.stringify(Object.fromEntries(Object.entries(NEW).map(([id, [trip, u]]) => { const p = P[id] || {}, v = CAST_VOICE[id] || [], lk = p.look || {}, wear = p.wear || {};
        return [id, { from: p.from, named: Boolean(p.name && p.kana && p.role),
          look: Object.keys(HERO.LOOK0).filter((k) => HERO.norm(lk)[k] !== lk[k]), wear: ['head', 'face', 'neck', 'back', 'body'].filter((k) => wear[k] && !HERO.slots.includes(wear[k])),
          chirp: Boolean(v[0]) && !OLD_VOICE.test(v[0]), shared: [...heard].filter((w) => w !== id && name(w) === v[0]), same: Object.keys(CAST_VOICE).filter((w) => w !== id && full(CAST_VOICE[w]) === full(v)),
          first: ['OFF', 'SAY', 'EAT'].map((k) => (C[k][id] || []).map((l) => l[0]).sort((a, c) => uIdx(a) - uIdx(c))[0] || ''),
          aboard: C.TRIPS.filter((t) => CRUISE.party(t).includes(id)).map((t) => t.id), due: C.TRIPS.filter((t) => tIdx(trip) >= 0 && tIdx(t.id) >= tIdx(trip)).map((t) => t.id),
          unit: (C.TRIPS.find((t) => t.id === trip) || { u }).u }]; }))); })()"""))
    for id, (trip, u) in NEW.items():
        p = r[id]
        assert p['from'] == trip and p['named'] and p['look'] == [] and p['wear'] == [], (id, p)   # every part one the hero's drawing has
        assert p['chirp'] and p['shared'] == [] and p['same'] == [], (id, p)   # a Chirp 3 HD voice no one on a tour has, and no one's as it is
        assert p['first'] == [u, u, u] and p['unit'] == u, (id, p)   # off the ship, chatting and at a meal: from their own trip's unit
        assert p['aboard'] == p['due'], (id, p)   # on their own trip and the ones after, never before

def test_the_old_members_have_something_new_to_say_each_unit(b):
    # 2026-11-23 (spec §1.4): the chatter grows with the learner — each of the nine who came on t1 and t2 has something new to say
    # on each trip from t3 to t6, in that unit's grammar
    r = json.loads(ev(b, """(() => { const C = TOWN.CRUISE, old = Object.keys(C.PEOPLE).filter((id) => ['t1', 't2'].includes(C.PEOPLE[id].from));
      return JSON.stringify({ old, missing: old.flatMap((id) => ['m3', 'm4', 'm5', 'm6'].filter((u) => !(C.SAY[id] || []).some((l) => l[0] === u)).map((u) => `${id} ${u}`)) }); })()"""))
    assert sorted(r['old']) == sorted(['umeko', 'kaneda', 'yuta', 'rina', 'yoshimoto', 'ken', 'ai', 'michiyama', 'mike']), r
    assert r['missing'] == [], r

def test_trip_three_rides_the_train_back_and_eats_bento_on_the_platform(b):
    # 2026-11-23 (spec §2): t3「電車に 乗って」— ひかる comes down last; by bus to 駅前 (its stop opened by the tour), up through the
    # gate to the platform, where ハル sells the group her 駅弁 and they eat them there out of doors (eat), then home by train to the
    # harbour; every reply right at once: grade S. His photos go off with a shutter's カシャ (a sound there is)
    r = json.loads(ev(b, "(async () => { " + FRESH + RIGHT + """ const errs = []; window.addEventListener('error', (e) => errs.push(String(e.message)));
      CRUISE.skipTo('t3'); await call(); const party = people(), t = trip('t3');
      // after the 駅弁's talk: ひかる, new today, sat down to his dream 駅弁; after the 電車 stop's: their train in at 二番線, doors open,
      // the other track empty, the timetable held, no 搭車 button for the hero (2026-11-23, the review)
      let meal = null, board = null; const quiet = () => !document.querySelector('.talk-card'), on = () => state.cruise.on || {};
      const look = async (p) => { if (p !== 'platform' || !quiet()) return; const g = (k) => y().querySelector(`.pf-train[data-track="${k}"]`);
        if (!meal && on().stop === 'densha') meal = { hikaru: !!document.querySelector('#view .cr-hikaru.bench') };
        if (!board && on().stop === 'bye') board = { now: PLATFORM.now(), open: g(2).classList.contains('open'), two: g(2).style.transform, one: g(1).style.transform, btn: !!y().querySelector('.pf-board') }; };
      const d = await tour(() => !!state.cruise.done.t3, look);
      const photos = t.stops.flatMap((s) => s.lines).filter((l) => Array.isArray(l) && l[0] === 'hikaru' && l[3] && l[3].snd === 'shutter').length;
      return JSON.stringify(Object.assign(d, { party: party.length, last: CRUISE.party(t).slice(-1)[0], errs, res: state.cruise.res.t3, asks: asks(t).length, pts: asks(t).map((a) => a.pt),
        eats: t.stops.filter((s) => s.eat).map((s) => [s.at, Object.keys(s.cast || {})]), photos, shutter: typeof SND.SYNTH.shutter, stops: state.town.stops, meal, board })); })()"""))
    assert r.get('stuck') is None and r['errs'] == [], r
    assert r['party'] == 11 and r['last'] == 'hikaru', r   # the eight, マイク, ひかる (down last), 高橋
    assert r['seen'] == titles(b, 2)[1:] and r['order'] == ['harbor', 'station', 'platform', 'harbor'], r   # by bus, up the stairs, home by train
    assert r['eats'] == [['platform', ['haru']]] and 'haru' in r['folk']['platform'] and r['sat']['platform'] >= 4 and r['meal'] == {'hikaru': True}, r   # ハル's 駅弁 on the benches, ひかる among those sat
    bd = r['board']   # the みなと港 train standing at 二番線 with its doors open while they board; 1番線 empty
    assert bd['now'] == {'track': 2, 'to': 'minatoko', 'kind': bd['now']['kind'], 'phase': 'stop'} and bd['open'] and bd['two'] == 'translateX(0px)' and '1400px' in bd['one'] and not bd['btn'], bd
    assert r['asks'] >= 20 and r['pts'].count('m3') > len(r['pts']) / 2, r
    assert r['res']['asks'] == r['asks'] and r['res']['first'] == r['asks'] and r['res']['grade'] == 5, r   # S
    assert r['photos'] >= 2 and r['shutter'] == 'function' and r['stops'].get('station') == 1, r

def test_trip_four_bathes_by_the_rules_and_lunches_at_rairai(b):
    # 2026-11-23 (spec §3): t4「月の湯と 中華街」— 水野 comes down last; by bus to 月の湯 (松's rules; its stop opened by the tour),
    # by bus to 中華街 (王 making 豚まん), through the 牌樓 into 大通り and in to らいらいけん, sat down at its tables (黄), home by bus
    r = json.loads(ev(b, "(async () => { " + FRESH + RIGHT + """ const errs = []; window.addEventListener('error', (e) => errs.push(String(e.message)));
      CRUISE.skipTo('t4'); await call(); const party = people(), t = trip('t4');
      // at らいらいけん after its talk: 水野, new today (his appetite the joke), sat at a table — tapped, a word for the meal (EAT), not chatter
      let mz = null; const look = async (p) => { if (mz || p !== 'rairai' || document.querySelector('.talk-card') || (state.cruise.on || {}).stop !== 'bye') return;
        const e = document.querySelector('#view .cr-mizuno'), realS = speakAs, heard = []; if (!e) return; speakAs = (w, l) => { heard.push(l); return Promise.resolve(); };
        e.click(); await wait(30); speakAs = realS; mz = { sat: e.matches('.bench'), heard }; };
      const d = await tour(() => !!state.cruise.done.t4, look), of = (k) => (TOWN.CRUISE[k].mizuno || []).map((l) => l[1]);
      return JSON.stringify(Object.assign(d, { party: party.length, last: CRUISE.party(t).slice(-1)[0], errs, res: state.cruise.res.t4, asks: asks(t).length, pts: asks(t).map((a) => a.pt),
        seat: t.stops.filter((s) => s.seat).map((s) => s.at), stops: state.town.stops, mz, eat: of('EAT'), say: of('SAY') })); })()"""))
    assert r.get('stuck') is None and r['errs'] == [], r
    assert r['party'] == 12 and r['last'] == 'mizuno', r   # ひかる and 水野 aboard now
    assert r['seen'] == titles(b, 3)[1:] and r['order'] == ['harbor', 'sento', 'chinatown', 'chinadori', 'rairai', 'harbor'], r
    assert r['seat'] == ['rairai'] and r['sat']['rairai'] >= 9, r   # all らいらいけん's stools taken (nine), the rest standing by
    mz = r['mz']   # 水野 among them, the newcomer seated first
    assert mz and mz['sat'] and len(mz['heard']) == 1 and mz['heard'][0] in r['eat'] and mz['heard'][0] not in r['say'], mz
    assert all(w in r['folk'][p] for p, w in [('sento', 'matsu'), ('chinatown', 'wang'), ('chinadori', 'zhou'), ('rairai', 'huang')]), r
    assert r['asks'] >= 20 and r['pts'].count('m4') > len(r['pts']) / 2, r
    assert r['res']['asks'] == r['asks'] and r['res']['first'] == r['asks'] and r['res']['grade'] == 5 and r['stops'].get('sento') == 1, r

def test_a_meal_has_words_for_what_is_eaten_there_only(b):
    # 2026-11-23 (the ruling): a word at a meal about a dish (t2's やきとり and からあげ at the 居酒屋, 梅子's cold tea …) carries where
    # it is eaten (EAT's at) and is said there only — never at らいらいけん's tables, where the others' are; at the 居酒屋 it still is
    r = json.loads(ev(b, "(async () => { " + FRESH + TRY + """ T1.u = 'm4';   // t1's eight, their words up to m4
      const tagged = Object.entries(TOWN.CRUISE.EAT).flatMap(([id, ls]) => ls.filter((l) => l[3]).map((l) => [id, l[1], [].concat(l[3].at)]));
      const heard = async (place, mid) => { T1.stops = [stop('hi', 'harbor', [180, 56], [40, 40]), mid, stop('bye', 'harbor', [180, 56], [40, 40], { go: 'bus', bye: true })];
        at(mid.id, place); await go(place); await drive(() => state.cruise.on.stop === 'bye', 30000); await wait(100);
        const realS = speakAs, out = [], sat = document.querySelectorAll('#view .tourist.bench').length; speakAs = (w, l) => { out.push([w, l]); return Promise.resolve(); };
        for (let n = 0; n < 24; n++) for (const id of ['rina', 'yoshimoto', 'umeko']) { const e = document.querySelector(`#view .cr-${id}`); if (e) { e.click(); await wait(5); } }
        speakAs = realS; return { out, sat }; };
      const rl = await heard('rairai', stop('rl', 'rairai', [11.6, 9.6], [12.4, 10.8], { room: true, seat: true }));
      const iz = await heard('izakaya', stop('iz', 'izakaya', [7, 8.6], [12, 9], { room: true, seat: true }));
      const eat = (w) => (TOWN.CRUISE.EAT[w] || []).map((l) => l[1]), isTagged = (w, l) => tagged.some((x) => x[0] === w && x[1] === l);
      return JSON.stringify({ tagged, rl: { sat: rl.sat, n: rl.out.length, notEat: rl.out.filter(([w, l]) => !eat(w).includes(l)), tagged: rl.out.filter(([w, l]) => isTagged(w, l)) },
        iz: { n: iz.out.length, tagged: [...new Set(iz.out.filter(([w, l]) => isTagged(w, l)).map(([w, l]) => l))] } }); })()"""))
    t = r['tagged']
    assert any('やきとり' in l and at == ['izakaya'] for _, l, at in t) and any('からあげ' in l for _, l, at in t) and any('ラーメン' in l for _, l, at in t), t   # the dishes named
    assert all(at and all(isinstance(p, str) for p in at) for _, _, at in t), t
    assert r['rl']['sat'] == 8 and r['rl']['n'] == 72 and r['rl']['notEat'] == [] and r['rl']['tagged'] == [], r['rl']   # sat at らいらいけん: words for a meal, none about another's dish
    assert r['iz']['n'] == 72 and len(r['iz']['tagged']) >= 2, r['iz']   # at the 居酒屋 its own come up

def test_every_train_the_tour_takes_comes_in_by_its_station(b):
    # 2026-11-23 (the review of the train): a stop gone to by train (go: 'train') arrives by that place's station (WAYS' train>place:
    # where one steps in off a train) — check-events cannot see WAYS
    r = json.loads(ev(b, """(() => JSON.stringify(TOWN.CRUISE.TRIPS.flatMap((t) => t.stops.filter((s) => s.go === 'train').map((s) => [t.id, s.id, s.at, Boolean(WAYS['train>' + s.at])]))))()"""))
    assert r and all(w for _, _, _, w in r), r

def test_after_hours_the_tour_still_goes_in_to_lunch(b):
    # 2026-11-23: らいらいけん's door shut after 20:00 (PLACE_SHUT) opens for the tour on its way in (CRUISE.opens), as the town's shops
    # do for it — the group would else stand in 大通り for ever; on one's own at that hour it stays shut
    r = json.loads(ev(b, "(async () => { " + FRESH + TRY + """ T1.stops = [stop('hi', 'harbor', [180, 56], [40, 40]), stop('dr', 'chinadori', [40, 60], [-40, 50]),
        stop('rl', 'rairai', [11.6, 9.6], [12.4, 10.8], { room: true, seat: true }), stop('bye', 'harbor', [180, 56], [40, 40], { go: 'bus', bye: true })];
      at('dr', 'chinadori'); await go('chinadori'); TOWNEV.clock = { h: 21, day: new Date(2026, 10, 10) };
      const before = PLACE_SHUT.rairai(), d = await drive(() => state.cruise.on.stop === 'bye', 30000);
      const alone = (() => { const on = state.cruise.on; state.cruise.on = null; const s = PLACE_SHUT.rairai(); state.cruise.on = on; return s; })();
      return JSON.stringify({ before, places: d.places, stop: state.cruise.on.stop, alone }); })()"""))
    assert r['before'] and r['alone'], r   # shut at 21:00, to anyone on their own
    assert 'rairai' in r['places'] and r['stop'] == 'bye', r   # in to lunch with the tour all the same

def test_the_morning_market_stands_six_to_ten(b):
    # 2026-11-23 (spec §1.6): みなと漁港's 朝市 every morning 6:00–10:00 — three stalls (fish, dried fish, the grill), their keepers
    # behind them, a few shoppers, more gulls; none at 5:59 nor at 10:00 sharp; a trip under way with its stop at the harbour flagged
    # market (t6) has them whatever the hour — standing as the ship comes in. Never over the gangway, the shop's door nor the ground
    # walked on
    r = json.loads(ev(b, "(async () => { " + FRESH + TRY + """
      const look = async (h) => { TOWNEV.clock = { h, day: new Date(2026, 10, 10) }; location.hash = '#/harbor'; document.getElementById('view').innerHTML = ''; route(); await wait(300);
        return { stalls: [...y().querySelectorAll('.ic-stall')].map((g) => g.dataset.stall), btns: ['sakana', 'himono', 'yaki'].filter((id) => y().querySelector(`.use-btn[data-use="${id}"]`)),
          keepers: [...y().querySelectorAll('.ic-market .stall-keeper')].map((g) => g.dataset.keeper), shoppers: y().querySelectorAll('.ic-shopper').length, gulls: y().querySelectorAll('.ic-gull').length }; };
      const hours = {}; for (const h of [5 + 59 / 60, 6, 9 + 59 / 60, 10, 15]) hours[h.toFixed(2)] = await look(h);
      const fn = [5 + 59 / 60, 6, 9 + 59 / 60, 10, 15].map((h) => ICHIBA.open(h, false)).concat([ICHIBA.open(15, true), ICHIBA.open(3, true)]);
      // a trip under way, at a stop of the harbour flagged market: at 15:00 the stalls stand; the same trip unflagged: none
      T1.stops = [stop('hi', 'harbor', [180, 56], [40, 40], { market: true }), stop('bye', 'harbor', [180, 56], [40, 40], { go: 'bus', bye: true })];
      at('hi', 'harbor'); const tour = await look(15);
      const box = (e) => { const q = e.getBBox(); return [q.x, q.y, q.x + q.width, q.y + q.height]; }, cross = (a, c) => a[0] < c[2] && c[0] < a[2] && a[1] < c[3] && c[1] < a[3];
      const stalls = [...y().querySelectorAll('.ic-stall')].map(box), ramp = box(y().querySelector('.cruise-ramp')), door = box(y().querySelector('.su-door'));
      const clear = { ramp: stalls.every((s) => !cross(s, ramp)), door: stalls.every((s) => !cross(s, door)), ground: stalls.every((s) => s[3] <= 370 - walkTop('harbor') + 1) };   // behind the ground walked on
      T1.stops[0].market = undefined; const plain = await look(15);
      // the ship called in at 15:00 for a trip whose first stop is the market's: they stand as it comes in, the harbour not drawn anew
      state.cruise.on = null; T1.stops[0].market = true; saveState(); await look(15); const yd = y(), before = yd.querySelectorAll('.ic-stall').length;
      document.querySelector('.cruise-call').click(); await wait(100); document.querySelector('[data-act=cruise-start]').click(); await wait(300);
      const arrived = { same: y() === yd, stalls: yd.querySelectorAll('.ic-stall').length, btns: yd.querySelectorAll('.use-btn[data-use="yaki"]').length, sig: yd.dataset.sig === TOWNEV.sig('harbor') };
      return JSON.stringify({ hours, fn, tour, plain, clear, before, arrived }); })()"""))
    h = r['hours']
    assert h['5.98']['stalls'] == [] and h['10.00']['stalls'] == [] and h['15.00']['stalls'] == [] and h['5.98']['btns'] == [] and h['10.00']['btns'] == [], h   # 5:59, 10:00 sharp, the afternoon: none
    for k in ('6.00', '9.98'):
        m = h[k]
        assert m['stalls'] == ['sakana', 'himono', 'yaki'] and m['btns'] == ['sakana', 'himono', 'yaki'], (k, m)   # three, each a thing to tap
        assert m['keepers'] == ['sakanaya', 'himonoya', 'hamayaki'] and m['shoppers'] >= 2 and m['gulls'] >= 3, (k, m)   # someone behind each; shoppers; more gulls
    assert r['fn'] == [False, True, True, False, False, True, True], r['fn']
    assert r['tour']['stalls'] == ['sakana', 'himono', 'yaki'] and r['plain']['stalls'] == [], r   # a t6 market stop at 15:00: standing
    assert r['clear'] == {'ramp': True, 'door': True, 'ground': True}, r['clear']
    assert r['before'] == 0 and r['arrived'] == {'same': True, 'stalls': 3, 'btns': 1, 'sig': True}, r

def test_a_save_as_the_market_packs_up_leaves_who_comes_at_ten_to_the_minute(b):
    # 2026-11-23 (review): at 10:00 the 朝市 packs up, みなと寿司's noren goes out and 健二 comes to the harbour; a save before the
    # minute's tick puts the market away and the noren out in place (ICHIBA.sync) but leaves who stands where to that tick — the
    # harbour then drawn anew, 健二 in it
    r = json.loads(ev(b, "(async () => { " + FRESH + """ state.town.seen.kenji = 1; saveState();
      TOWNEV.clock = { h: 9 + 59 / 60, day: new Date(2026, 10, 10) }; location.hash = '#/harbor'; document.getElementById('view').innerHTML = ''; route(); await wait(300);
      const yd = y(), before = { stalls: yd.querySelectorAll('.ic-stall').length, kenji: !!yd.querySelector('.npc-kenji') };
      TOWNEV.clock = { h: 10, day: new Date(2026, 10, 10) }; saveState();
      const saved = { same: y() === yd, stalls: yd.querySelectorAll('.ic-stall').length, noren: !!yd.querySelector('.su-front .su-noren'), behind: yd.dataset.sig !== TOWNEV.sig('harbor') };
      sceneMinute(); await until(() => y() && y() !== yd, 6000); await wait(300);
      return JSON.stringify({ before, saved, after: { kenji: !!y().querySelector('.npc-kenji'), sig: y().dataset.sig === TOWNEV.sig('harbor') } }); })()"""))
    assert r['before'] == {'stalls': 3, 'kenji': False}, r
    assert r['saved'] == {'same': True, 'stalls': 0, 'noren': True, 'behind': True}, r   # put away in place, the noren out; who stands where left to the tick
    assert r['after'] == {'kenji': True, 'sig': True}, r   # the minute's tick: drawn anew, 健二 at the harbour

def test_minato_sushi_opens_off_the_harbour(b):
    # 2026-11-23 (spec §1.5): みなと寿司 beside the 漁協, in by its door on the harbour; 源さん behind the counter 10–14 and 17–21, his
    # hands at work; in the break or by night its door says when it opens, and in the shop then 源さん is away and its menu shut,
    # saying when it opens — never an empty card. Its seats: enough for the tour, none on top of another, none where he stands
    r = json.loads(ev(b, "(async () => { " + FRESH + """ const toasts = [], realT = toast; toast = (m, ms) => { toasts.push(m); return realT(m, ms); };
      const at = async (place, h) => { TOWNEV.clock = { h, day: new Date(2026, 10, 10) }; location.hash = '#/' + place; document.getElementById('view').innerHTML = ''; route(); await wait(300); };
      const cards = () => ({ menu: !!document.querySelector('.menu-card'), talk: !!document.querySelector('.talk-card') });
      await at('harbor', 12); const open12 = { noren: !!y().querySelector('.su-front .su-noren'), shut: !!y().querySelector('.su-front .su-junbi') };
      y().querySelector('.use-btn[data-use="sushi"]').click(); await until(() => y() && y().dataset.place === 'sushi', 8000); await wait(300);
      const inside = { place: y().dataset.place, hash: location.hash, gen: !!y().querySelector('.npc-gen'), hands: !!y().querySelector('.su-hands'), menu: !!y().querySelector('.use-btn[data-use="menu"]'), fuda: !!y().querySelector('.use-btn[data-use="fuda"]') };
      y().querySelector('.npc-gen').click(); await until(() => document.querySelector('.talk-card'), 5000);
      const hello = { who: (document.querySelector('.talk-name') || {}).textContent || '', picks: [...document.querySelectorAll('.talk-card [data-choose]')].map((x) => x.dataset.go) }; TALK.close();
      toasts.length = 0; await at('harbor', 15); const shut15 = { noren: !!y().querySelector('.su-front .su-noren'), shut: !!y().querySelector('.su-front .su-junbi') };
      y().querySelector('.use-btn[data-use="sushi"]').click(); await wait(1500); const door15 = { place: y().dataset.place, toast: toasts.slice() };
      const away = async (h) => { toasts.length = 0; await at('sushi', h); const o = { gen: !!y().querySelector('.npc-gen'), hands: !!y().querySelector('.su-hands'), menu: !!y().querySelector('.use-btn[data-use="menu"]') };
        const f = y().querySelector('.use-btn[data-use="fuda"]'); o.fuda = !!f; if (f) { f.click(); await wait(1600); } return Object.assign(o, cards(), { toast: toasts.slice() }); };
      const in15 = await away(15), in22 = await away(22), in8 = await away(8);
      toast = realT;
      const u = TOWN.SPOTS.sushi.counter, me = isoXY(u.u, u.v), seats = []; PLACE_USE.sushi.filter((t) => t.kind === 'seat').forEach((t) => t.seats.forEach((q) => { const p = isoXY(q[0], q[1], q[2]); if (!seats.some((s) => Math.hypot(s[0] - p[0], s[1] - p[1]) < 1)) seats.push(p); }));
      let near = Infinity; seats.forEach((p, i) => seats.forEach((q, j) => { if (i < j) near = Math.min(near, Math.hypot(p[0] - q[0], p[1] - q[1])); }));
      return JSON.stringify({ open12, inside, hello, shut15, door15, in15, in22, in8, seats: seats.length, near: Math.round(near), gen: Math.round(Math.min(...seats.map((p) => Math.hypot(p[0] - me[0], p[1] - me[1])))),
        hours: TOWN.CAST.gen.hours.map((x) => x.slice(0, 3)) }); })()"""))
    assert r['hours'] == [[10, 14, 'sushi'], [17, 21, 'sushi']], r['hours']
    assert r['open12'] == {'noren': True, 'shut': False} and r['shut15'] == {'noren': False, 'shut': True}, r   # its noren out while open; 準備中 in the break
    assert r['inside'] == {'place': 'sushi', 'hash': '#/sushi', 'gen': True, 'hands': True, 'menu': True, 'fuda': False}, r['inside']   # in off the harbour; 源さん at work
    assert '源' in r['hello']['who'] and r['hello']['picks'] == ['order', 'chat'], r['hello']   # tapped: 點餐 or 閒聊, as the town's keepers
    hours = '（營業時間 10:00–14:00、17:00–21:00）。'
    assert r['door15']['place'] == 'harbor' and 'みなと寿司 準備中，17:00 開店' + hours in r['door15']['toast'], r['door15']   # the break: shut, and when it opens
    for k, want in (('in15', 'みなと寿司 準備中，17:00 開店'), ('in22', 'みなと寿司 今天的營業結束了，明天 10:00 開店'), ('in8', 'みなと寿司 準備中，10:00 開店')):
        x = r[k]
        assert not x['gen'] and not x['hands'] and not x['menu'] and x['fuda'], (k, x)   # 源さん away, the menu's tags shut
        assert not x['menu'] and not x['talk'] and want + hours in x['toast'], (k, x)   # no empty card: a toast with when it opens next (8:00: today, not tomorrow)
    assert r['seats'] >= 13 and r['near'] >= 30 and r['gen'] >= 30, r   # room for the thirteen of t6; the 30 px a seat; not where 源さん stands

def test_thirteen_sit_down_to_lunch_at_minato_sushi(b):
    # 2026-11-23 (spec §5, for t6): by t6 the group is thirteen (the eight, マイク, ひかる, 水野, ミヨコ, 味村); a lunch stop at みなと寿司
    # (seat) sits all thirteen at its counter and tables, none closer than 30 px to another — a trip of the test's own after t5 and t6
    # (stand-ins for them till they are written: whoever joins on them is aboard)
    r = json.loads(ev(b, "(async () => { " + FRESH + TRY + """ const C = TOWN.CRUISE;
      ['t5', 't6'].forEach((id, k) => { if (!C.TRIPS.some((t) => t.id === id)) C.TRIPS.push({ id, u: ['m5', 'm6'][k], title: id, stops: [] }); });
      C.TRIPS.push({ id: 'tz', u: 'm6', title: '昼', stops: [stop('hi', 'harbor', [180, 56], [40, 40]), stop('su', 'sushi', [6.4, 9.4], [8.4, 9.6], { room: true, seat: true }), stop('bye', 'harbor', [180, 56], [40, 40], { go: 'bus', bye: true })] });
      state.currentUnit = 'm6'; state.cruise.on = { trip: 'tz', step: 1, stop: 'su', place: 'harbor', score: {} }; saveState();
      TOWNEV.clock = { h: 12, day: new Date(2026, 10, 10) }; location.hash = '#/harbor'; document.getElementById('view').innerHTML = ''; route(); await wait(300);
      const d = await drive(() => state.cruise.on.stop === 'bye' && y().dataset.place === 'sushi' && !document.querySelector('.talk-card'), 60000); await wait(300);
      const sat = [...document.querySelectorAll('#view .tourist.bench, #view .tourist.kneel')], xy = sat.map(XY); let near = Infinity;
      xy.forEach((p, i) => xy.forEach((q, j) => { if (i < j) near = Math.min(near, Math.hypot(p[0] - q[0], p[1] - q[1])); }));
      return JSON.stringify({ party: CRUISE.party(C.TRIPS.find((t) => t.id === 'tz')).length, place: y().dataset.place, sat: sat.length, near: Math.round(near), aji: !!document.querySelector('#view .cr-ajimura.bench'),
        standing: tourists().filter((e) => !e.matches('.bench, .kneel')).map((e) => e.dataset.who), gen: !!document.querySelector('#view .npc-gen') }); })()"""))
    assert r['party'] == 13 and r['place'] == 'sushi', r
    assert r['sat'] == 13 and r['aji'] and r['standing'] == ['takahashi'], r   # every one of them sat down (味村 too); 高橋 standing by
    assert r['near'] >= 30 and r['gen'], r

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
