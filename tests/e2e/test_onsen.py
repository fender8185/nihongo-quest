"""2026-11-23 湯の花温泉 (docs/superpowers/specs/2026-11-23-onsen-work-design.md): the hot-spring town reached by train — やまなみ線 from 白鷺
(森下, 湯の花), the ride with a change at 白鷺, 湯の花駅前 (its 足湯, 観光案内所, the way home through the station's 改札)."""
import asyncio, json, os, subprocess, sys, time
sys.path.insert(0, os.path.dirname(__file__))
import websockets
from cdp import Browser
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
PORT = 8836
URL = f"http://127.0.0.1:{PORT}/"
READY = "typeof state === 'object' && !!state.updatedAt && typeof speakScript === 'function'"

def ev(b, js, pre=()):
    return b.run([("nav", URL), ("wait", READY)] + list(pre) + [("eval", js)], timeout=90)[-1]

# a learner in the course (m6), no work, the town's clock at 10 on a weekday, 1000 円 to spend; the ride at twenty times its pace,
# the voices quiet. arrive(to): the ride left to run to its end there (降りる tapped), walked in; phases: the ride's phases as they
# went by, 'phase@station' — recorded by RIDE itself (RIDE.trace, the tests' hook: no sampling to miss a short stop)
BEGIN = """state.storyV = 99; state.startChosen = true; state.introSeen = true; state.stage = 'main'; state.kanaKnown = true; state.currentUnit = 'm6'; state.completedUnits = [];
  state.town = { done: {}, seen: {}, stops: { station: '2026-11-01', castle: '2026-11-01' }, talks: {} }; state.koto.found = {}; state.purse = { spent: {}, book: {}, gift: 1000 }; state.cruise = { done: {}, on: null, res: {} }; state.work = { res: {} };
  TOWNEV.clock = { h: 10, day: new Date(2026, 10, 10) }; saveState(); DAILY_CACHE = null;
  const wait = (ms) => new Promise((r) => setTimeout(r, ms)), yard = () => document.querySelector('.yard');
  window.speak = () => Promise.resolve(); window.speakAs = () => Promise.resolve(); RIDE.speed = 20; RIDE.keep(null);
  const click = (q) => { const e = document.querySelector(q); if (e && !e.disabled) e.click(); return Boolean(e && !e.disabled); };
  const at = async (place) => { location.hash = '#/' + place; document.getElementById('view').innerHTML = ''; route(); await wait(400); };
  const phases = RIDE.trace = [];
  const watch = async (done, ms = 15000) => { const t0 = Date.now(); while (!done() && Date.now() - t0 < ms) await wait(10); return done(); };
  const end = (st) => () => { const n = RIDE.now(); return Boolean(n && n.phase === 'end' && n.at === st); };
  async function arrive(st, to) { await watch(end(st)); click('.rd-off'); await watch(() => location.hash === to, 5000); await wait(600); }
  // the next 湯の花 drawn: its greeting's moment (ONSEN.mount's own timer) over, whether she greeted or not (the final review's Minor 2: waited on
  // the event, not a fixed 1.5 s against its 900 ms) — called before the place is drawn, awaited after
  const greeting = () => { let ok; const p = new Promise((q) => { ok = q; }), m0 = ONSEN.mount;
    ONSEN.mount = (y, pl) => { if (pl !== 'onsen') return m0(y, pl); ONSEN.mount = m0; const st = window.setTimeout; let set = false;
      window.setTimeout = (fn, ms, ...a) => { set = true; return st(() => { try { fn(...a); } finally { ok(); } }, ms); };
      try { m0(y, pl); } finally { window.setTimeout = st; } if (!set) ok(); };
    return p; };"""

# やまなみ線 (spec §2.1): 森下 31 km and 湯の花 38 km from みなと港 as みなと線's stations are; two more bands (≤40 km 420, ≤50 km 480; a
# child half, under 10 円 dropped); one train an hour each way at :05 from 白鷺 and :20 :50 from 湯の花 — :05 :35 from 白鷺 — from 6 to
# the 22:50 from 湯の花, the next morning's first after it; みなと線's own trains as they were
def test_fares_and_times_reach_yunohana(b):
    r = json.loads(ev(b, """JSON.stringify({ fares: [EKI.fare('minato', 'yunohana'), EKI.fare('minato', 'yunohana', true), EKI.fare('shirasagi', 'yunohana'), EKI.fare('shirasagi', 'yunohana', true),
        EKI.fare('minato', 'morishita'), EKI.fare('yunohana', 'minato'), EKI.fare('minatoko', 'yunohana'), EKI.fare('yunohana', 'shirasagi'), EKI.fare('minatoko', 'shirasagi')],
      bands: TOWN.EKI.FARES.slice(-2), first: EKI.next(5, 0, 2, 'yunohana').map((x) => [x.t, x.kind, x.to]), last: EKI.next(22, 40, 2, 'yunohana').map((x) => x.t), late: EKI.next(22, 51, 1, 'yunohana').map((x) => x.t),
      noon: EKI.next(12, 21, 3, 'yunohana').map((x) => x.t), up: EKI.next(5, 0, 1, 'shirasagi').map((x) => [x.t, x.to]), upLast: EKI.next(22, 30, 2, 'shirasagi').map((x) => x.t),
      minato: EKI.next(10, 24, 2).map((x) => [x.t, x.to]), line: EKI.line().map((x) => x.id),
      names: [EKI.name('yunohana'), EKI.kana('yunohana'), EKI.name('morishita'), EKI.kana('morishita')], label: EKI.label('yunohana', true) })"""))
    assert r['fares'] == [420, 210, 260, 130, 350, 420, 420, 260, 350], r
    assert r['bands'] == [[40, 420], [50, 480]], r
    assert r['first'] == [['6:20', '普通', 'shirasagi'], ['6:50', '普通', 'shirasagi']] and r['last'] == ['22:50', '6:20'] and r['late'] == ['6:20'], r   # the first at 6, the last 22:50
    assert r['noon'] == ['12:50', '13:20', '13:50'] and r['up'] == [['6:05', 'yunohana']] and r['upLast'] == ['22:35', '6:05'], r
    assert r['minato'] == [['10:25', 'shirasagi'], ['10:32', 'minatoko']] and r['line'] == ['shirasagi', 'daigaku', 'koen', 'byoin', 'minato', 'minatoko'], r   # みなと線 as it was
    assert r['names'] == ['湯の花', 'ゆのはな', '森下', 'もりした'] and 'ゆのはな' in r['label'] and '湯の花' in r['label'], r

# みなと's machine sells one ticket, up to 湯の花 (420; its chart still has every station, やまなみ線 past 白鷺); aboard 1番線: on past 白鷺 —
# the change there (its announcement), やまなみ線's stops, off at 湯の花駅前, the ticket used and nothing more to pay (2026-11-25, the user:
# tickets only where walking cannot take you)
def test_a_ride_to_yunohana_changes_at_shirasagi(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + """ await at('station'); const out = { said: [] };
      RIDE.machine(yard(), 'minato'); await wait(100); out.fares = [...document.querySelectorAll('.kb-fare')].map((x) => Number(x.dataset.f));
      const y = document.querySelector('.kb-card .os-yama'); out.chart = y ? y.textContent.replace(/\\s+/g, ' ') : '';
      click('.kb-fare[data-f="420"]'); await wait(60); click('.kb-pay'); await wait(200); out.ticket = RIDE.ticket(); out.paid = yenBalance(); CLASS.close();
      window.speakAs = (w, l) => { if (w === 'ann') out.said.push(l); return Promise.resolve(); };
      await at('platform'); RIDE.board(yard(), 1); await wait(50); out.to = RIDE.now() && RIDE.now().to;
      await watch(() => RIDE.now() && RIDE.now().phase === 'run' && RIDE.now().line === 'yama'); out.head = document.querySelector('.rd-card .wk-head').textContent;
      await arrive('yunohana', '#/onsen'); out.phases = phases; out.at = location.hash; out.used = RIDE.ticket(); out.left = yenBalance();
      return JSON.stringify(out); })()"""))
    assert r['fares'] == [420], r   # 湯の花 only
    assert '森下' in r['chart'] and '湯の花' in r['chart'] and '420' in r['chart'] and '350' in r['chart'] and 'のりかえ' in r['chart'], r
    assert r['ticket']['fare'] == 420 and r['ticket']['to'] == 'yunohana' and r['paid'] == 580 and r['to'] == 'yunohana' and 'やまなみ' in r['head'], r
    p = r['phases']
    assert 'change@shirasagi' in p and 'stop@morishita' in p and p.index('stop@daigaku') < p.index('change@shirasagi') < p.index('stop@morishita') < p.index('end@yunohana'), p
    assert r['at'] == '#/onsen' and r['used'] is None and r['left'] == 580, r
    said = r['said']
    assert '{終点|しゅうてん|終點}、{白鷺|しらさぎ}です。やまなみ{線|せん}は お{乗り換え|のりかえ|轉乘}です。' in said, said
    assert said.index('つぎは {森下|もりした}、{森下|もりした}です。') < said.index('まもなく {終点|しゅうてん|終點}、{湯の花|ゆのはな}です。'), said
    assert said[-1].startswith('{終点|しゅうてん|終點}、{湯の花|ゆのはな}です。'), said
    assert not any(l.startswith('{終点|しゅうてん|終點}、{白鷺|しらさぎ}です。お{忘れ物') for l in said), said   # changing, not getting off

# home from 湯の花: the station's 改札 opens its machine (湯の花 現在地, its two tickets down), the one to みなと (420): the change at 白鷺 the
# other way (みなと線は お乗り換えです), off at みなと's platform; the one to 白鷺 (260) ends there, at the castle
def test_the_way_home_from_yunohana(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + """ const out = { said: [] }; window.speakAs = (w, l) => { if (w === 'ann') out.said.push(l); return Promise.resolve(); };
      await at('onsen'); click('.use-btn[data-use="gate"]'); await watch(() => document.querySelector('.kb-card'), 5000);
      const c = document.querySelector('.kb-card'); out.here = c && c.dataset.here; out.now = ((c && c.querySelector('.md-st.here')) || {}).textContent || '';
      out.fares = [...document.querySelectorAll('.kb-fare')].map((x) => Number(x.dataset.f));
      click('.kb-fare[data-f="420"]'); await wait(60); click('.kb-pay'); await wait(200); out.rides = document.querySelectorAll('.kb-ride').length; click('.kb-ride');
      await arrive('minato', '#/platform'); out.home = location.hash; out.phases = phases.slice(); out.left = yenBalance();
      await at('onsen'); click('.use-btn[data-use="gate"]'); await watch(() => document.querySelector('.kb-card'), 5000);
      click('.kb-fare[data-f="260"]'); await wait(60); click('.kb-pay'); await wait(200); click('.kb-ride'); await arrive('shirasagi', '#/castle'); out.castle = location.hash; out.left2 = yenBalance();
      return JSON.stringify(out); })()"""))
    assert r['here'] == 'yunohana' and '湯の花' in r['now'] and '現在地' in r['now'], r
    assert r['fares'] == [260, 420] and r['rides'] == 1, r
    p = r['phases']
    assert 'change@shirasagi' in p and p.index('stop@morishita') < p.index('change@shirasagi') < p.index('end@minato'), p
    assert r['home'] == '#/platform' and r['left'] == 580, r
    assert '{終点|しゅうてん|終點}、{白鷺|しらさぎ}です。みなと{線|せん}は お{乗り換え|のりかえ|轉乘}です。' in r['said'] and r['said'].index('つぎは {白鷺|しらさぎ}、{白鷺|しらさぎ}です。') > r['said'].index('つぎは {森下|もりした}、{森下|もりした}です。'), r['said']
    assert r['castle'] == '#/castle' and r['left2'] == 320, r

# 白鷺's machine sells the way up: one ticket (to 湯の花, 260), one train — 「電車に 乗る」 — up the やまなみ線, no change
def test_shirasagi_sells_the_way_up(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + """ const out = {};
      await at('castle'); RIDE.machine(yard(), 'shirasagi'); await wait(100); out.fares = [...document.querySelectorAll('.kb-fare')].map((x) => Number(x.dataset.f));
      click('.kb-fare[data-f="260"]'); await wait(60); click('.kb-pay'); await wait(200); out.rides = [...document.querySelectorAll('.kb-ride')].map((x) => { const c = x.cloneNode(true); c.querySelectorAll('rt').forEach((e) => e.remove()); return c.textContent.trim(); });
      click('.kb-ride'); await arrive('yunohana', '#/onsen'); out.phases = phases; out.at = location.hash; out.left = yenBalance(); return JSON.stringify(out); })()"""))
    assert r['fares'] == [260], r
    assert r['rides'] == ['電車に 乗る'], r
    assert 'change@shirasagi' not in r['phases'] and 'stop@morishita' in r['phases'] and r['at'] == '#/onsen' and r['left'] == 740, r

# ---- 2026-11-25, the user's test of nq-v1.21.0-test.1: tickets only where walking cannot take you, a ticket names its station and the
# ride ends there, one ticket at a time (払いもどし pays one back), the train in at みなと with a ticket, 跳過 on every ride, 2番線 not his ----
# buy(to): the fare button of the ticket to `to` pressed and the money put in; face(): the ticket's face as read (no furigana)
TICKET = """const buy = async (to) => { click(`.kb-fare[data-to="${to}"]`); await wait(60); click('.kb-pay'); await wait(200); };
  const face = () => { const t = document.querySelector('.kb-ticket'); if (!t) return ''; const c = t.cloneNode(true); c.querySelectorAll('rt').forEach((x) => x.remove()); return c.textContent.replace(/\\s+/g, ' ').trim(); };"""

# the town's three machines (みなと, みなと港, 白鷺) sell one ticket — up to 湯の花 — with a Chinese note why (the castle and the harbour are a
# walk or the free bus away); 湯の花's two, down to 白鷺 and to みなと; none to 森下 or to a station with nowhere to get off; every chart
# still has every station with its fare (reading practice)
def test_each_machine_sells_only_its_tickets(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + """ const out = {};
      for (const [place, here] of [['station', 'minato'], ['harbor', 'minatoko'], ['castle', 'shirasagi'], ['onsen', 'yunohana']]) {
        await at(place); RIDE.machine(yard(), here); await wait(100); const c = document.querySelector('.kb-card');
        out[here] = { fares: [...c.querySelectorAll('.kb-fare')].map((x) => [Number(x.dataset.f), x.dataset.to]), prices: [...c.querySelectorAll('.md-f')].map((x) => Number(x.textContent)),
          note: (c.querySelector('.kb-note') || {}).textContent || '' }; CLASS.close(); }
      return JSON.stringify(out); })()"""))
    assert r['minato']['fares'] == [[420, 'yunohana']] and r['minatoko']['fares'] == [[420, 'yunohana']] and r['shirasagi']['fares'] == [[260, 'yunohana']], r
    assert r['yunohana']['fares'] == [[260, 'shirasagi'], [420, 'minato']], r
    for k in ('minato', 'minatoko', 'shirasagi'):
        assert '湯の花' in r[k]['note'] and '免費' in r[k]['note'] and '公車' in r[k]['note'], r
    assert r['yunohana']['note'] == '', r
    assert all(len(r[k]['prices']) == 7 for k in r) and 350 in r['minato']['prices'] and 220 in r['yunohana']['prices'], r   # every other station's fare, 森下's too

# a ticket names its station ({ from, to, fare, day }; its face 「みなと → 湯の花　420円」) and the ride ends there: from みなと's platform up to
# 湯の花 through the change at 白鷺 (never off there: no 乗り換える, no 乗り越し精算); from みなと港's machine the same, みなと passed through; from
# 白鷺 up the やまなみ線; from 湯の花 down to 白鷺 (the castle), or through to みなと (the platform); each ride costs its ticket and nothing more
def test_a_ticket_names_its_station_and_the_ride_ends_there(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + TICKET + """ const out = {}; state.purse.gift = 3000; saveState();
      let extra = false; const spy = setInterval(() => { const n = RIDE.now(); if (document.querySelector('.rd-card .os-on, .rd-card .rd-pay') || (n && n.phase === 'end' && n.at !== n.to)) extra = true; }, 15);
      await at('station'); RIDE.machine(yard(), 'minato'); await wait(100); await buy('yunohana'); out.ticket = RIDE.ticket(); out.face = face(); out.paid = yenBalance(); CLASS.close();
      await at('platform'); RIDE.board(yard(), 1); await wait(50); out.to = RIDE.now() && RIDE.now().to; await arrive('yunohana', '#/onsen');
      out.up = [location.hash, yenBalance(), RIDE.ticket(), phases.includes('change@shirasagi'), phases.filter((p) => p.startsWith('end@'))];
      phases.length = 0; await at('harbor'); RIDE.machine(yard(), 'minatoko'); await wait(100); await buy('yunohana'); click('.kb-ride'); await arrive('yunohana', '#/onsen');
      out.port = [location.hash, yenBalance(), phases.includes('stop@minato'), phases.includes('change@shirasagi'), phases.filter((p) => p.startsWith('end@'))];
      phases.length = 0; await at('castle'); RIDE.machine(yard(), 'shirasagi'); await wait(100); await buy('yunohana'); out.rides = document.querySelectorAll('.kb-ride').length; click('.kb-ride'); await arrive('yunohana', '#/onsen');
      out.castle = [location.hash, yenBalance(), phases.includes('change@shirasagi'), phases.filter((p) => p.startsWith('end@'))];
      phases.length = 0; RIDE.machine(yard(), 'yunohana'); await wait(100); await buy('shirasagi'); out.face2 = face(); click('.kb-ride'); await arrive('shirasagi', '#/castle');
      out.down = [location.hash, yenBalance(), phases.filter((p) => p.startsWith('end@'))];
      phases.length = 0; await at('onsen'); RIDE.machine(yard(), 'yunohana'); await wait(100); await buy('minato'); click('.kb-ride'); await arrive('minato', '#/platform');
      out.home = [location.hash, yenBalance(), phases.includes('change@shirasagi'), phases.filter((p) => p.startsWith('end@'))];
      clearInterval(spy); out.extra = extra; return JSON.stringify(out); })()"""))
    t = r['ticket']
    assert t['from'] == 'minato' and t['to'] == 'yunohana' and t['fare'] == 420 and t['day'], r
    assert 'みなと → 湯の花' in r['face'] and '420円' in r['face'] and r['paid'] == 2580 and r['to'] == 'yunohana', r
    assert r['up'] == ['#/onsen', 2580, None, True, ['end@yunohana']], r
    assert r['port'] == ['#/onsen', 2160, True, True, ['end@yunohana']], r
    assert r['rides'] == 1 and r['castle'] == ['#/onsen', 1900, False, ['end@yunohana']], r
    assert '湯の花 → 白鷺' in r['face2'] and '260円' in r['face2'] and r['down'] == ['#/castle', 1640, ['end@shirasagi']], r
    assert r['home'] == ['#/platform', 1220, True, ['end@minato']], r
    assert r['extra'] is False, r   # never 乗り換える or 乗り越し精算, never off anywhere but where the ticket says

# one ticket at a time (the user): while one is held no machine sells another — its screen says so, shows the ticket, its fare buttons
# off — and every machine pays it back in full (払いもどし), then sells again: a 湯の花→白鷺 ticket still held after going home by ‹ 書房,
# paid back at みなと. The money back is the wallet's for good: kept through a reload and a merge with a copy that never had it
def test_one_ticket_at_a_time_and_its_refund(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + TICKET + """ const out = {};
      await at('onsen'); RIDE.machine(yard(), 'yunohana'); await wait(100); await buy('shirasagi'); out.bought = [yenBalance(), (RIDE.ticket() || {}).to];
      await buy('minato'); out.second = [yenBalance(), (RIDE.ticket() || {}).to, [...document.querySelectorAll('.kb-fare')].map((x) => x.disabled)];
      CLASS.close(); window.go('#/today'); await wait(300);   // home by 書房, the ticket still held
      await at('station'); RIDE.machine(yard(), 'minato'); await wait(100); const c = document.querySelector('.kb-card');
      out.held = [c.querySelector('.kb-screen').textContent, face(), [...c.querySelectorAll('.kb-fare')].map((x) => x.disabled), Boolean(c.querySelector('.kb-back')), Boolean(c.querySelector('.kb-ride'))];
      await buy('yunohana'); out.refused = [yenBalance(), (RIDE.ticket() || {}).to];
      click('.kb-back'); await wait(200); out.back = [yenBalance(), RIDE.ticket(), [...document.querySelectorAll('.kb-fare')].map((x) => x.disabled), Boolean(document.querySelector('.kb-back')), document.querySelector('.kb-screen').textContent];
      await buy('yunohana'); out.again = [yenBalance(), (RIDE.ticket() || {}).to]; CLASS.close();
      const T = (s, t) => Object.assign(JSON.parse(JSON.stringify(s)), { updatedAt: t }), mine = normalizeState(JSON.parse(JSON.stringify(state))), theirs = JSON.parse(JSON.stringify(mine)); delete theirs.refunds;
      out.kept = [mine.refunds].concat([['2026-11-25T10:00:00.000Z', '2026-11-25T11:00:00.000Z'], ['2026-11-25T12:00:00.000Z', '2026-11-25T11:00:00.000Z']]
        .flatMap(([a, c]) => [SyncCore.mergeStates(T(mine, a), T(theirs, c)), SyncCore.mergeStates(T(theirs, c), T(mine, a))]).map((m) => { const s = normalizeState(m); return Object.values(s.refunds || {}).reduce((x, y) => x + y, 0); }));
      return JSON.stringify(out); })()"""))
    assert r['bought'] == [740, 'shirasagi'], r
    assert r['second'] == [740, 'shirasagi', [True, True]], r   # one at a time: nothing more sold, the buttons off
    assert 'きっぷが あります' in r['held'][0] and '湯の花 → 白鷺' in r['held'][1] and '260円' in r['held'][1] and r['held'][2:] == [[True], True, False], r
    assert r['refused'] == [740, 'shirasagi'], r
    assert r['back'][:4] == [1000, None, [False], False] and '払' in r['back'][4], r   # all of it back, the ticket gone, the machine selling again
    assert r['again'] == [580, 'yunohana'], r
    assert sum(r['kept'][0].values()) == 260 and r['kept'][1:] == [260] * 4, r

# fix round 1 (the review's Minor 1): 重設所有進度 takes the ticket held and the day's fare with the progress that paid them — else
# 払いもどし would pay 円 into the new start
def test_a_reset_takes_the_ticket_and_the_fare_with_it(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + TICKET + """ await at('station'); RIDE.machine(yard(), 'minato'); await wait(100); await buy('yunohana'); CLASS.close();
      localStorage.setItem('nq_fare', JSON.stringify({ day: dateStr(TOWNEV.today()), yen: 420 })); const before = [Boolean(RIDE.ticket()), RIDE.fare(dateStr(TOWNEV.today())), yenBalance()];
      window.confirm = () => true; openSettings('data'); await wait(200); const btn = document.querySelector('.modal [data-act=reset-all]'); btn.closest('details').open = true; btn.click(); await wait(400);
      return JSON.stringify({ before, after: [RIDE.ticket(), localStorage.getItem('nq_ticket'), localStorage.getItem('nq_fare'), yenBalance()] }); })()"""))
    assert r['before'] == [True, 420, 580], r
    assert r['after'] == [None, None, None, 0], r   # nothing held, nothing to pay back into the new start

# fix round 1 (the review's Minor 2): the food book's 「一共花了」 leaves out what was paid back — a ticket bought and paid back adds nothing
def test_the_food_book_total_leaves_out_a_refund(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + TICKET + """ const spent = () => (/一共花了 ([\\d,]+) 円/.exec(YEN.book()) || [])[1];
      const before = spent(); await at('station'); RIDE.machine(yard(), 'minato'); await wait(100); await buy('yunohana'); const bought = spent();
      click('.kb-back'); await wait(200); const back = spent(); CLASS.close(); return JSON.stringify({ before, bought, back }); })()"""))
    assert r == {'before': '0', 'bought': '420', 'back': '0'}, r

# the train is in (the user's pick): up to みなと's platform holding a ticket from みなと, the 1番線 train to 白鷺 stands there at once, doors
# open, its 搭車 button, for as long as he stays — the timetable meanwhile on 2番線 (in and out, never a button there); aboard, it goes; ✕ on
# the ride card mid-ride: the ticket still his and the train in again. Without a ticket the timetable on both tracks (no button at 2番線);
# a ticket from another station: a toast naming where it is from, no train held. The cruise group's own (t3, 2番線) wins over his
def test_the_train_is_in_with_a_ticket_from_minato(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + """ const out = {}, toasts = []; window.toast = (m) => toasts.push(m); PLATFORM.speed = 12;
      const g = (k) => yard().querySelector(`.pf-train[data-track="${k}"]`), btn = (k) => Boolean(yard().querySelector(`.pf-board[data-use="board${k}"]`));
      const look = async (ms, f) => { const t0 = Date.now(), seen = new Set(); let bad = false; while (Date.now() - t0 < ms) { const n = PLATFORM.now(); if (n) seen.add(n.track + n.phase); if (f()) bad = true; await wait(25); } return [bad, [...seen].sort()]; };
      RIDE.keep({ from: 'minato', to: 'yunohana', fare: 420, day: todayStr() }); await at('station'); await at('platform');
      out.at = [g(1).style.transform, g(1).classList.contains('open'), btn(1), btn(2)];
      out.stay = await look(4500, () => g(1).style.transform !== 'translateX(0px)' || !g(1).classList.contains('open') || !btn(1) || btn(2));
      RIDE.board(yard(), 1); await wait(400); out.gone = [Boolean(document.querySelector('.rd-card')), g(1).classList.contains('open'), btn(1)];
      document.querySelector('.rd-card .cls-x').click(); await wait(300);
      out.back = [(RIDE.ticket() || {}).to, g(1).style.transform, g(1).classList.contains('open'), btn(1)];
      RIDE.keep(null); await at('station'); await at('platform'); let one = false;
      out.none = await look(5000, () => { if (btn(1)) one = true; return btn(2); }); out.none.push(one);
      toasts.length = 0; RIDE.keep({ from: 'yunohana', to: 'minato', fare: 420, day: todayStr() }); await at('station'); await at('platform');
      out.other = [toasts.filter((m) => /湯の花/.test(m)).length, g(1).style.transform === 'translateX(0px)' && g(1).classList.contains('open')];
      const cb = CRUISE.boarding; CRUISE.boarding = () => 'minatoko'; RIDE.keep({ from: 'minato', to: 'yunohana', fare: 420, day: todayStr() }); await at('station'); await at('platform'); await wait(200);
      out.cruise = [g(2).classList.contains('open'), g(2).style.transform, /1400px/.test(g(1).style.transform), btn(1), btn(2)]; CRUISE.boarding = cb;
      out.board2 = PLACE_USE.platform.some((t) => t.id === 'board2'); PLATFORM.speed = 1; return JSON.stringify(out); })()"""))
    assert r['at'] == ['translateX(0px)', True, True, False], r   # in at once, doors open, its button; none at 2番線
    assert r['stay'][0] is False and {'2in', '2stop', '2out'} <= set(r['stay'][1]) and not any(x.startswith('1') for x in r['stay'][1]), r   # it stays; 2番線 runs
    assert r['gone'] == [True, False, False], r   # aboard: its doors shut, its button gone
    assert r['back'] == ['yunohana', 'translateX(0px)', True, True], r   # ✕ mid-ride: the ticket still his, the train in again
    assert r['none'][0] is False and '1stop' in r['none'][1] and '2stop' in r['none'][1] and r['none'][2] is True, r   # no ticket: both tracks by the timetable, a button at 1番線 only
    assert r['other'] == [1, False], r
    assert r['cruise'] == [True, 'translateX(0px)', True, False, False] and r['board2'] is False, r

# 跳過 (the user's pick: top right of the ride card, on every ride): tapped, the line being said stops and the ride jumps past the stops and
# the change to the arrival — the LED (終点 at 湯の花), 降りる, the arrival's one line said, none of the stops skipped said after — and 降りる
# uses the ticket and keeps the 交通費 just as a full ride's; down to みなと (no 終点 there) likewise, its own line, みなと線's car
def test_skip_jumps_to_the_arrival(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + """ const out = {}, said = []; let stops = 0; const st0 = window.stopSpeaking; window.stopSpeaking = () => { stops++; return st0(); };
      window.speakAs = (w, l) => { if (w === 'ann') said.push(l); return new Promise((ok) => setTimeout(ok, 350)); };
      const led = () => { const e = document.querySelector('.rd-card .rd-led'); if (!e) return ''; const c = e.cloneNode(true); c.querySelectorAll('rt').forEach((x) => x.remove()); return c.textContent.replace(/\\s+/g, ' ').trim(); };
      RIDE.speed = 1; localStorage.removeItem('nq_fare'); RIDE.keep({ from: 'minato', to: 'yunohana', fare: 420, day: todayStr() });
      await at('platform'); RIDE.board(yard(), 1); await wait(500); const n0 = said.length, s0 = stops; out.first = said.slice();
      click('.rd-card .rd-skip'); await wait(250);
      out.up = { phase: RIDE.now().phase, at: RIDE.now().at, led: led(), off: Boolean(document.querySelector('.rd-card .rd-off')), skip: Boolean(document.querySelector('.rd-card .rd-skip')), diesel: Boolean(document.querySelector('.rd-card .os-dcar')), stopped: stops > s0 };
      await wait(1600); out.up.said = said.slice(n0);
      click('.rd-off'); await watch(() => location.hash === '#/onsen', 5000); await wait(300);
      out.up.after = [location.hash, RIDE.ticket(), RIDE.fare(dateStr(TOWNEV.today())), yenBalance()];
      RIDE.keep({ from: 'yunohana', to: 'minato', fare: 420, day: todayStr() }); RIDE.machine(yard(), 'yunohana'); await wait(100); click('.kb-ride'); await wait(500);
      const n1 = said.length; click('.rd-card .rd-skip'); await wait(250);
      out.down = { phase: RIDE.now().phase, at: RIDE.now().at, led: led(), car: Boolean(document.querySelector('.rd-card .rd-car:not(.os-dcar)')) };
      await wait(1600); out.down.said = said.slice(n1);
      click('.rd-off'); await watch(() => location.hash === '#/platform', 5000); await wait(300); out.down.after = [location.hash, RIDE.ticket(), RIDE.fare(dateStr(TOWNEV.today()))];
      RIDE.speed = 20; return JSON.stringify(out); })()"""))
    u = r['up']
    assert r['first'] and r['first'][0].startswith('つぎは'), r   # under way when skipped
    assert u['phase'] == 'end' and u['at'] == 'yunohana' and '湯の花' in u['led'] and '終点' in u['led'] and u['off'] and not u['skip'] and u['diesel'] and u['stopped'], r
    assert len(u['said']) == 1 and u['said'][0].startswith('{終点|しゅうてん|終點}、{湯の花|ゆのはな}です。'), r   # the arrival's line, once; nothing of the stops
    assert u['after'] == ['#/onsen', None, 420, 1000], r   # the ticket used, the 交通費 kept, nothing paid on board
    d = r['down']
    assert d['phase'] == 'end' and d['at'] == 'minato' and 'みなと' in d['led'] and '終点' not in d['led'] and d['car'], r
    assert d['said'] == ['みなと、みなとです。お{忘れ物|わすれもの|遺失物}の ないように ご{注意|ちゅうい|注意} ください。'], r
    assert d['after'] == ['#/platform', None, 420], r   # down: no 交通費 of its own (the day's ride up stays)

# 跳過 at its two other moments (the review of 2bd06dd): tapped during the change at 白鷺 (off the みなと線, the platform there) it still
# lands at 湯の花 — the diesel's car, the LED with 終点, 降りる, nothing of the change left — and 降りる there uses the ticket and keeps the
# 交通費 as a full ride's; tapped and then ✕ on the arrival (降りる not tapped): the ticket still his, the みなと train in again at 1番線,
# doors open, its 搭車 button, and the ride goes again
def test_skip_in_the_change_and_skip_then_close(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + """ const out = {}, said = []; window.speakAs = (w, l) => { if (w === 'ann') said.push(l); return new Promise((ok) => setTimeout(ok, 300)); };
      const led = () => { const e = document.querySelector('.rd-card .rd-led'); if (!e) return ''; const c = e.cloneNode(true); c.querySelectorAll('rt').forEach((x) => x.remove()); return c.textContent.replace(/\\s+/g, ' ').trim(); };
      const g = () => yard().querySelector('.pf-train[data-track="1"]'), btn = () => Boolean(yard().querySelector('.pf-board[data-use="board1"]'));
      RIDE.speed = 6; localStorage.removeItem('nq_fare'); RIDE.keep({ from: 'minato', to: 'yunohana', fare: 420, day: todayStr() });
      await at('platform'); RIDE.board(yard(), 1); out.change = await watch(() => RIDE.now() && RIDE.now().phase === 'change', 30000); await wait(150);
      const n0 = said.length; click('.rd-card .rd-skip'); await wait(300);
      out.chg = { phase: RIDE.now().phase, at: RIDE.now().at, led: led(), off: Boolean(document.querySelector('.rd-card .rd-off')), skip: Boolean(document.querySelector('.rd-card .rd-skip')),
        diesel: Boolean(document.querySelector('.rd-card .os-dcar')), left: document.querySelectorAll('.rd-card .os-chgsvg, .rd-card .os-walker').length };
      await wait(1200); out.chg.said = said.slice(n0); click('.rd-off'); await watch(() => location.hash === '#/onsen', 5000); await wait(300);
      out.chg.after = [location.hash, RIDE.ticket(), RIDE.fare(dateStr(TOWNEV.today())), yenBalance()];
      RIDE.speed = 1; RIDE.keep({ from: 'minato', to: 'yunohana', fare: 420, day: todayStr() }); await at('station'); await at('platform'); RIDE.board(yard(), 1); await wait(400);
      click('.rd-card .rd-skip'); await wait(300); out.shut = { phase: RIDE.now().phase, off: Boolean(document.querySelector('.rd-card .rd-off')) };
      document.querySelector('.rd-card .cls-x').click(); await wait(400);
      out.shut.after = [(RIDE.ticket() || {}).to, location.hash, g().style.transform, g().classList.contains('open'), btn(), Boolean(document.querySelector('.rd-card'))];
      RIDE.speed = 20; RIDE.board(yard(), 1); await arrive('yunohana', '#/onsen'); out.shut.again = [location.hash, RIDE.ticket()];
      return JSON.stringify(out); })()"""))
    c = r['chg']
    assert r['change'] and c['phase'] == 'end' and c['at'] == 'yunohana' and '湯の花' in c['led'] and '終点' in c['led'] and c['off'] and not c['skip'], r
    assert c['diesel'] and c['left'] == 0, r   # the diesel's car, nothing of the change left on it
    assert len(c['said']) == 1 and c['said'][0].startswith('{終点|しゅうてん|終點}、{湯の花|ゆのはな}です。'), r
    assert c['after'] == ['#/onsen', None, 420, 1000], r   # the ticket used, the 交通費 kept, nothing paid on board
    s = r['shut']
    assert s['phase'] == 'end' and s['off'], r
    assert s['after'] == ['yunohana', '#/platform', 'translateX(0px)', True, True, False], r   # ✕: the ticket kept, his train in again
    assert s['again'] == ['#/onsen', None], r

# 跳過 sits at the ride card's top right — in the car's top right corner (the user: 「車上右上角」), over the ride's picture — never over its ✕
# nor crowding it (4 px clear at least), a 40 px target, at 360, 390 and 1280
def test_the_skip_button_sits_by_the_close(b):
    out = {}
    for w, h in ((360, 640), (390, 844), (1280, 800)):
        out[w] = json.loads(b.run([("metrics", (w, h)), ("nav", URL), ("wait", READY), ("eval", "(async () => { " + BEGIN + """ RIDE.speed = 1;
          RIDE.keep({ from: 'minato', to: 'yunohana', fare: 420, day: todayStr() }); await at('platform'); RIDE.board(yard(), 1); await wait(300);
          const R = (q) => { const e = document.querySelector('.rd-card ' + q); if (!e) return null; const k = e.getBoundingClientRect(); return [k.left, k.top, k.right, k.bottom].map((n) => Math.round(n)); };
          const s = R('.rd-skip'), x = R('.cls-x'), card = R('.cls-card'), box = R('.rd-box'), ann = R('.rd-ann'); CLASS.close(); RIDE.speed = 20;
          return JSON.stringify({ s, x, card, box, ann }); })()""")])[-1])
    for w, v in out.items():
        s, x, card, box = v['s'], v['x'], v['card'], v['box']
        assert s and x, (w, v)
        assert s[2] - s[0] >= 40 and s[3] - s[1] >= 40, (w, v)   # a 40 px target
        assert s[0] >= x[2] + 4 or s[2] <= x[0] - 4 or s[1] >= x[3] + 4 or s[3] <= x[1] - 4, (w, v)   # clear of the ✕
        assert box[0] <= s[0] and s[2] <= box[2] and s[1] >= box[1] and s[3] <= v['ann'][1], (w, v)   # over the car's picture
        assert box[2] - s[2] <= 12 and s[1] - box[1] <= 12 and card[2] - s[2] <= 40, (w, v)   # in its top right corner, at the card's right

# ✕ on the ride card from 湯の花 mid-ride: the ticket still his, the machine there shows it with its ride button, and the ride goes again
def test_a_ride_shut_midway_leaves_the_ticket(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + TICKET + """ const out = {};
      await at('onsen'); RIDE.machine(yard(), 'yunohana'); await wait(100); await buy('shirasagi'); click('.kb-ride'); await wait(300);
      document.querySelector('.rd-card .cls-x').click(); await wait(200); out.after = [(RIDE.ticket() || {}).to, yenBalance(), location.hash];
      RIDE.machine(yard(), 'yunohana'); await wait(100); out.machine = [face(), Boolean(document.querySelector('.kb-ride')), Boolean(document.querySelector('.kb-back'))];
      click('.kb-ride'); await arrive('shirasagi', '#/castle'); out.end = [location.hash, RIDE.ticket(), yenBalance()]; return JSON.stringify(out); })()"""))
    assert r['after'] == ['shirasagi', 740, '#/onsen'] and '湯の花 → 白鷺' in r['machine'][0] and r['machine'][1:] == [True, True] and r['end'] == ['#/castle', None, 740], r

# 湯の花駅前 (spec §3.1, §4): あかり at the 観光案内所's window calls ようこそ the first time the hero is there while she is (9–18) — once,
# kept as state.town.arrived (synced, kept on load); the 足湯: sat on, his feet in it
def test_foot_bath_and_first_greeting(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + """ const out = {}, toasts = [], said = []; window.toast = (m) => toasts.push(m); window.speakAs = (w, l) => { said.push([w, l]); return Promise.resolve(); };
      const greeted = () => said.filter(([w, l]) => w === 'akari' && /ようこそ/.test(l)).length, told = () => toasts.filter((m) => /ベテラン/.test(m)).length;
      TOWNEV.clock = { h: 21, day: new Date(2026, 10, 10) }; let g = greeting(); await at('onsen'); await g; out.night = [greeted(), told(), JSON.stringify(state.town.arrived || {})];
      click('.use-btn[data-use="annai"]'); await watch(() => toasts.some((m) => /観光案内所/.test(m)), 5000); out.shut = toasts.filter((m) => /観光案内所/.test(m)).join('|');
      TOWNEV.clock = { h: 10, day: new Date(2026, 10, 10) }; g = greeting(); await at('onsen'); await g; out.akari = Boolean(document.querySelector('.npc-akari')); out.first = [greeted(), told(), state.town.arrived];
      out.line = (said.find(([w]) => w === 'akari') || [])[1];
      click('.use-btn[data-use="ashiyu"]'); await watch(() => document.querySelector('.yhero.bench'), 6000); await wait(300);
      const h = document.querySelector('.yhero'); out.sat = h ? [...h.classList].filter((c) => ['bench', 'os-soak'].includes(c)) : [];
      out.pop = [...document.querySelectorAll('.ypop')].map((e) => e.textContent).join('|'); out.rings = document.querySelectorAll('.os-soakrings > *').length;
      await new Promise((q) => yHeroWalk(yard(), [-300, 60], q)); await wait(100);   // up again and away: shoes back on
      out.up = [Boolean(document.querySelector('.yhero.os-soak')), document.querySelectorAll('.os-soakrings > *').length, Boolean(yh.use)];
      await at('platform'); g = greeting(); await at('onsen'); await g; out.again = [greeted(), told()];
      out.kept = normalizeState(JSON.parse(JSON.stringify(state))).town.arrived;
      return JSON.stringify(out); })()"""))
    assert r['night'] == [0, 0, '{}'], r   # nobody at the window by night: no greeting yet
    assert '9:00' in r['shut'] and '18:00' in r['shut'], r   # the window by night: when it opens
    assert r['akari'] and r['first'] == [1, 1, {'onsen': 1}] and r['line'] == 'ようこそ、{湯の花|ゆのはな}{温泉|おんせん}へ！', r
    assert r['sat'] == ['bench', 'os-soak'] and 'あったか' in r['pop'] and r['rings'] >= 3, r   # his feet in it: rings and his shoes on the rim
    assert r['up'] == [False, 0, False], r   # up and away: out of the water, his shoes gone from the rim
    assert r['again'] == [1, 1] and r['kept'] == {'onsen': 1}, r

# Review Focus 5: no announcement cuts another — the change at 白鷺 is said to its end before つぎは 森下 (a clip of 0.9 s), and none at
# all starts while one is still being said: every clip (0.4 s) is longer than a stretch between stations at twenty times the pace
# (0.225–0.31 s), so lines said without waiting would overlap
def test_the_change_announcement_is_not_cut(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + """ const log = [];
      window.speakAs = (w, l) => { if (w !== 'ann') return Promise.resolve(); log.push(['say', l, performance.now()]); const long = /乗り換え/.test(l);
        return new Promise((ok) => setTimeout(() => { log.push(['done', l, performance.now()]); ok(); }, long ? 900 : 400)); };
      RIDE.keep({ from: 'minato', to: 'yunohana', fare: 420, day: todayStr() }); await at('platform'); RIDE.board(yard(), 1); await arrive('yunohana', '#/onsen');
      const says = log.filter((x) => x[0] === 'say'), ch = says.findIndex((x) => /乗り換え/.test(x[1])), doneAt = (k) => (log.find((x) => x[0] === 'done' && x[1] === says[k][1] && x[2] >= says[k][2]) || [])[2];
      const cut = says.slice(1).filter((x, k) => !(doneAt(k) <= x[2] + 1)).map((x) => x[1]);
      return JSON.stringify({ n: says.length, ch, next: ch >= 0 && says[ch + 1] ? says[ch + 1][1] : null, gap: ch >= 0 && says[ch + 1] ? says[ch + 1][2] - doneAt(ch) : null, cut, at: location.hash }); })()"""))
    assert r['ch'] > 0 and r['next'] == 'つぎは {森下|もりした}、{森下|もりした}です。' and r['gap'] is not None and r['gap'] >= 0, r
    assert r['cut'] == [] and r['at'] == '#/onsen', r

# the town's keys this build does not rebuild itself are kept, through a load and a sync both (2026-11-23, the review's I2: 中華街's 漢字陷阱
# — traps — were dropped at every load): traps, arrived, and a key a later build adds; a 1.21.0 device's copy (newer, without them)
# merged in does not take them away
def test_town_keys_survive_a_load_and_a_merge(b):
    r = json.loads(ev(b, """(() => { const base = JSON.parse(JSON.stringify(state));
      const mine = Object.assign({}, base, { updatedAt: '2026-11-23T10:00:00.000Z', town: { done: { a1: '2026-11-01' }, seen: { kenta: 1 }, stops: {}, talks: {}, traps: { 手紙: 1 }, arrived: { onsen: 1 }, later: { k: 1 } } });
      const theirs = Object.assign({}, base, { updatedAt: '2026-11-23T11:00:00.000Z', town: { done: {}, seen: { akari: 1 }, stops: {}, talks: {} } });
      const loaded = normalizeState(JSON.parse(JSON.stringify(mine))), merged = normalizeState(SyncCore.mergeStates(loaded, normalizeState(JSON.parse(JSON.stringify(theirs)))));
      const pick = (t) => [t.traps || null, t.arrived || null, t.later || null];
      return JSON.stringify({ loaded: pick(loaded.town), merged: pick(merged.town), seen: merged.town.seen, done: merged.town.done, bare: normalizeState({}).town }); })()"""))
    assert r['loaded'] == [{'手紙': 1}, {'onsen': 1}, {'k': 1}], r   # a reload keeps them
    assert r['merged'] == [{'手紙': 1}, {'onsen': 1}, {'k': 1}] and r['seen'] == {'kenta': 1, 'akari': 1} and r['done'] == {'a1': '2026-11-01'}, r   # a sync too
    assert r['bare'] == {'done': {}, 'seen': {}, 'stops': {}, 'talks': {}}, r   # nothing invented

# no free ride home (the coordinator's ruling 6): 湯の花's machine, the money short — the app's own way home (書房) in the card and in
# its toast; a ticket to 湯の花 bought with too little left for the way back (260 to 白鷺): a warning, the ticket sold all the same
def test_short_of_money_the_way_home_is_named(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + """ const out = {}, toasts = []; window.toast = (m) => toasts.push(m);
      state.purse.gift = 100; saveState(); await at('onsen'); RIDE.machine(yard(), 'yunohana'); await wait(100);
      click('.kb-fare[data-f="260"]'); await wait(60); click('.kb-pay'); await wait(200);
      out.home = [Boolean(document.querySelector('.kb-card .os-home')), toasts.filter((m) => /書房/.test(m)).length, RIDE.ticket()];
      click('.kb-card .os-home'); await watch(() => location.hash === '#/today', 3000); out.at = location.hash;
      state.purse.gift = 500; saveState(); await at('station'); RIDE.machine(yard(), 'minato'); await wait(100);
      click('.kb-fare[data-f="420"]'); await wait(60); click('.kb-pay'); await wait(200); CLASS.close();
      out.warn = [toasts.filter((m) => /260/.test(m) && /湯の花/.test(m)).length, RIDE.ticket() && RIDE.ticket().fare, yenBalance()];
      return JSON.stringify(out); })()"""))
    assert r['home'] == [True, 1, None] and r['at'] == '#/today', r
    assert r['warn'] == [1, 420, 80], r

# every ticket is paid in full at the machine, so a machine sells one whenever the wallet holds its fare and never when it does not
# (the wallet untouched, the way home named in the card and the toast): 湯の花's 260 with 230 円, 白鷺's 260 with 200, みなと's 420 with 400;
# with just the fare it sells, and the ride needs nothing more (0 円 left: still the whole way)
def test_no_ticket_is_sold_the_wallet_cannot_pay(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + TICKET + """ const out = {}, toasts = []; window.toast = (m) => toasts.push(m);
      const money = (n) => { state.purse = { spent: {}, book: {}, gift: n }; saveState(); };
      const tried = () => [yenBalance(), RIDE.ticket(), Boolean(document.querySelector('.kb-card .os-home')), toasts.filter((m) => /書房/.test(m)).length];
      money(230); await at('onsen'); RIDE.machine(yard(), 'yunohana'); await wait(100); await buy('shirasagi'); out.yunohana = tried(); CLASS.close();
      toasts.length = 0; money(200); await at('castle'); RIDE.machine(yard(), 'shirasagi'); await wait(100); await buy('yunohana'); out.castle = tried(); CLASS.close();
      toasts.length = 0; money(400); await at('station'); RIDE.machine(yard(), 'minato'); await wait(100); await buy('yunohana'); out.minato = tried(); CLASS.close();
      money(260); await at('castle'); RIDE.machine(yard(), 'shirasagi'); await wait(100); await buy('yunohana'); out.exact = [yenBalance(), (RIDE.ticket() || {}).to];
      click('.kb-ride'); await arrive('yunohana', '#/onsen'); out.rode = [location.hash, yenBalance(), RIDE.ticket()];
      return JSON.stringify(out); })()"""))
    assert r['yunohana'] == [230, None, True, 1] and r['castle'] == [200, None, True, 1] and r['minato'] == [400, None, True, 1], r   # nothing taken, no ticket, the way home
    assert r['exact'] == [0, 'yunohana'] and r['rode'] == ['#/onsen', 0, None], r

# ---- Task 2: 湯けむり通り, 湯畑, the food and 射的 (spec §3.2, §3.3, §6) ----
# motion reduced (a walk out is there at once, a meal straight to its end) and nobody about the street
CALM = """const mm = window.matchMedia; window.matchMedia = (q) => (/reduced-motion/.test(q) ? { matches: true } : mm.call(window, q));
  const eat = async () => { await watch(() => { const tk = document.querySelector('.talk-card') && document.querySelector('.talk'); if (tk) tk.click(); return document.querySelector('.eat-scene'); }, 6000); const es = document.querySelector('.eat-scene'); if (!es) return null;   // a keeper's order said first (竹内, Task 3): tapped through
    const o = { bg: es.querySelector('.es-face').dataset.bg, name: es.querySelector('.es-name').textContent, look: 0, say: 0 };
    while (es.querySelector('.es-face').dataset.mood === 'drool') { o.look += 1; es.querySelector('.es-ok').click(); await wait(60); }
    while (document.querySelector('.eat-scene')) { o.say += 1; document.querySelector('.es-ok').click(); await wait(60); } return o; };"""

# the onsen's own ring grows (ruling 1): 湯の花駅前 ↔ 湯けむり通り ↔ 湯畑, joined both ways and walked both ways by their way buttons; still a
# ring of its own — none of the harbour town's places is reached from it on foot, nor it from them (the train only)
def test_the_town_walks_station_street_yubatake(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + CALM + """ const out = {};
      out.ways = [['onsen', 'yudori'], ['yudori', 'yubatake']].filter(([a, c]) => !(WAYS[a + '>' + c] && WAYS[c + '>' + a]));
      out.routes = ['yudori', 'yubatake'].map((p) => PLACE_ROUTE[p]); out.names = ['yudori', 'yubatake'].map((p) => TOWNEV.PLACE_NAME[p]);
      out.hops = [TOWNEV.hop('onsen', 'yubatake'), TOWNEV.hop('yubatake', 'onsen'), TOWNEV.hop('onsen', 'town'), TOWNEV.hop('town', 'yubatake'), TOWNEV.hop('yudori', 'harbor'), TOWNEV.hop('harbor', 'beach')];
      const ways = () => [...yard().querySelectorAll('.way-btn')].map((w) => w.dataset.to).sort();
      const walk = async (to, hash) => { click(`.yard .way-btn[data-to="${to}"]`); await watch(() => location.hash === hash, 8000); await wait(500); return location.hash; };
      await at('onsen'); out.station = ways(); out.walked = [await walk('yudori', '#/yudori')]; out.street = ways(); out.cam = Math.round(ycam.x);
      out.walked.push(await walk('yubatake', '#/yubatake')); out.square = ways();
      out.walked.push(await walk('yudori', '#/yudori'), await walk('onsen', '#/onsen'));
      return JSON.stringify(out); })()"""))
    assert r['ways'] == [] and r['routes'] == ['#/yudori', '#/yubatake'] and r['names'] == ['湯けむり通り', '湯畑'], r
    assert r['hops'] == ['yudori', 'yudori', None, None, None, 'beach'], r   # its own ring; the harbour town's as it was
    assert r['station'] == ['yudori'] and r['street'] == ['onsen', 'ryokan', 'yubatake'] and r['square'] == ['yudori'], r   # 旅館「花月」's door off the street (Task 3)
    assert r['walked'] == ['#/yudori', '#/yubatake', '#/yudori', '#/onsen'] and r['cam'] == 0, r   # down the street: one screen, seen down its length

# ゆのはな堂 (ruling 2) keeps 竹内's hours, 9–21 (TOWN.HOURS.yunohanado): outside them its front is shut — a tap says when it opens, never
# an empty menu — and in them its 温泉まんじゅう is sold (竹内 by his steamers since Task 3: SPOTS.yudori.yunohanado, his hours the same)
def test_the_manju_shop_keeps_its_hours(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + CALM + """ const out = {}, toasts = []; window.toast = (m) => toasts.push(m);
      const look = async (h) => { TOWNEV.clock = { h, day: new Date(2026, 10, 10) }; await at('yudori'); const o = [Boolean(yard().querySelector('.use-btn[data-use="yunohanado"]')), Boolean(yard().querySelector('.use-btn[data-use="junbi"]'))];
        click(`.yard .use-btn[data-use="${o[0] ? 'yunohanado' : 'junbi'}"]`); await wait(1200); o.push(Boolean(document.querySelector('.mc-item')), toasts.splice(0).join('|')); closeModal(); return o; };
      out.early = await look(8); out.open = await look(10); out.late = await look(21.5);
      out.hours = TOWN.HOURS.yunohanado; out.spot = TOWN.SPOTS.yudori && TOWN.SPOTS.yudori.yunohanado; return JSON.stringify(out); })()"""))
    assert r['early'][:3] == [False, True, False] and '9:00' in r['early'][3], r   # shut: the tap says it opens at 9
    assert r['open'][:3] == [True, False, True], r   # open: its menu
    assert r['late'][:3] == [False, True, False] and '明天' in r['late'][3] and '9:00' in r['late'][3], r
    assert r['hours'] == [9, 21] and r['spot'] and r['spot']['X'] < 0, r   # the hours kept once, the spot before the shop on the left

# ゆのはな堂's 温泉まんじゅう (120 円): no course word to learn first (spec §6); the 湯畑's 無人販売所's 温泉たまご (100 円): locked till たまご is
# learned, then paid for by reading its hand-written sign (ひとつ 100円。お金は この 箱へ) — the 100 円 coin into the box (50 is too little,
# 500 wants change nobody is there to give), one egg taken; each had on a screen of its own where it is had, three looks and five
# words at least; the two foods of the day
def test_manju_and_eggs_are_bought_and_eaten(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + CALM + """ const out = {}; state.srs = {}; saveState();
      await at('yudori'); click('.yard .use-btn[data-use="yunohanado"]'); await wait(200);
      out.menu = [...document.querySelectorAll('.mc-item')].map((x) => [x.dataset.item || 'locked', x.disabled]);
      click('.mc-item[data-item="onsenmanju"]'); out.manju = await eat(); out.bal1 = yenBalance();
      await at('yubatake'); click('.yard .use-btn[data-use="tamago"]'); await watch(() => document.querySelector('.yb-stand'), 6000);
      const card = () => document.querySelector('.yb-stand'), coins = () => [...card().querySelectorAll('.yb-coin')].map((c) => [c.dataset.coin, c.disabled]);
      out.sign = card().querySelector('.yb-sign').textContent.replace(/\\s+/g, ''); out.locked = [Boolean(card().querySelector('.yb-lock')), coins()]; CLASS.close();
      const t = todayStr(); REG.vocab.filter((v) => jaPlain(v.w) === '卵').forEach((v) => { state.srs[v.key] = { b: 3, due: addDays(t, 9), n: 4, ok: 4, ng: 0, s: 9, d: 5, last: addDays(t, -2), intro: addDays(t, -20), lrn: addDays(t, -2) }; }); saveState();
      click('.yard .use-btn[data-use="tamago"]'); await watch(() => document.querySelector('.yb-stand'), 6000); out.open = [Boolean(card().querySelector('.yb-lock')), coins()];
      click('.yb-coin[data-coin="500"]'); await wait(300); out.change = [yenBalance(), Boolean(card())];
      click('.yb-coin[data-coin="50"]'); await wait(300); out.short = [yenBalance(), Boolean(card())];
      click('.yb-coin[data-coin="100"]'); out.egg = await eat(); out.bal2 = yenBalance(); out.today = state.purse.today; out.book = Object.keys(state.purse.book).sort();
      out.dish = [EATSCENE.way(TOWN.MENU.yunohanado.items[0]), EATSCENE.way(TOWN.MENU.tamago.items[0])]; out.pics = ['温泉まんじゅう', '温泉たまご'].map((k) => Boolean(PICS_TOWN[k]));
      return JSON.stringify(out); })()"""))
    assert r['menu'] == [['onsenmanju', False]], r   # no word to learn first
    m, e = r['manju'], r['egg']
    assert m and m['bg'] == 'yudori' and m['look'] >= 3 and m['say'] >= 5 and 'まんじゅう' in m['name'] and r['bal1'] == 880, r
    assert 'ひとつ' in r['sign'] and '100円' in r['sign'] and '箱' in r['sign'], r   # the sign as written, to be read
    assert r['locked'] == [True, [['50', True], ['100', True], ['500', True]]], r   # たまご not learned: the sign to read, nothing to pay with
    assert r['open'] == [False, [['50', False], ['100', False], ['500', False]]] and r['change'] == [880, True] and r['short'] == [880, True], r
    assert e and e['bg'] == 'yubatake' and e['look'] >= 3 and e['say'] >= 5 and 'たまご' in e['name'] and r['bal2'] == 780, r
    assert r['today']['f'] == 2 and r['book'] == ['onsenmanju', 'onsentamago'] and r['dish'] == ['bite', 'spoon'] and r['pics'] == [True, True], r

# 射的 (spec §3.2): 300 円 a go, once a day — a cork gun's ポン, a prize at random (mostly はずれ; キャラメル or 小こけし; now and then
# 大当たり, the big bear), nothing kept; a second go the same day refused with nothing taken, the next day again. The day is kept in
# state.oneADay.shateki: normalizeState keeps it, mergeStates keeps the later day (tests/sync-core.test.js)
def test_shateki_once_a_day(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + CALM + """ const out = {}, toasts = []; window.toast = (m) => toasts.push(m);
      const go = async () => { click('.yard .use-btn[data-use="shateki"]'); await watch(() => document.querySelector('.yd-shateki'), 6000); const c = document.querySelector('.yd-shateki');
        const o = { card: Boolean(c), btn: Boolean(c && c.querySelector('.yd-go:not(:disabled)')), done: Boolean(c && c.querySelector('.yd-done')) };
        if (o.btn) { c.querySelector('.yd-go').click(); await watch(() => toasts.some((m) => /射的/.test(m)), 6000); }
        o.toast = toasts.splice(0).join('|'); o.bal = yenBalance(); CLASS.close(); return o; };
      await at('yudori'); out.first = await go(); out.day = state.oneADay && state.oneADay.shateki; out.again = await go();
      out.kept = normalizeState(JSON.parse(JSON.stringify(state))).oneADay;
      TOWNEV.clock = { h: 10, day: new Date(2026, 10, 11) }; await at('yudori'); out.next = await go();
      const n = {}; for (let i = 0; i < 4000; i++) { const p = YUDORI.prize(); n[p] = (n[p] || 0) + 1; } out.odds = n; out.prizes = YUDORI.PRIZES.map((p) => p[0]);
      return JSON.stringify(out); })()"""))
    f, a, n = r['first'], r['again'], r['next']
    assert f['card'] and f['btn'] and f['bal'] == 700 and '射的' in f['toast'] and r['day'] == '2026-11-10', r   # 300 円, and what came of it
    assert a['card'] and not a['btn'] and a['done'] and a['bal'] == 700 and '射的' not in a['toast'], r   # the same day: refused, nothing taken
    assert r['kept'] == {'shateki': '2026-11-10'}, r   # kept through a load
    assert n['btn'] and n['bal'] == 400, r   # the next day again
    o = r['odds']
    assert r['prizes'] == ['hazure', 'caramel', 'kokeshi', 'bear'] and o['hazure'] > o['caramel'] > 0 and o['kokeshi'] > o['bear'] > 0 and o['hazure'] > 4000 * 0.45, r

# ---- Task 2, fix round 1 (task-2-review-1.md) ----
# Important 1: the 湯畑's square is walked in front of its stone railing only (it stands on F = 236: Y 134) — a tap past it stops short
# of it (WALK_TOP 128), the two benches and the stone lamps are walked round (WALK_BLOCK), a spot kept past the railing comes back in
# front of it on arrival
def test_the_yubatake_keeps_him_in_front_of_its_railing(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + CALM + """ const out = {};
      await at('yubatake'); await new Promise((q) => yHeroWalk(yard(), [100, 200], q)); out.tap = Math.round(yh.Y);
      await new Promise((q) => yHeroWalk(yard(), [-420, 180], q)); out.tap2 = Math.round(yh.Y);
      const blocks = walkBlocks('yubatake'), clear = (w) => w.every((q, i) => !i || blocks.every((bk) => !yCross(bk, w[i - 1], q)));
      const w1 = yRoute('yubatake', [-260, 66], [-90, 66]), w2 = yRoute('yubatake', [-60, 66], [130, 66]), w3 = yRoute('yubatake', [-340, 86], [-260, 86]);
      out.round = [w1.length > 2 && clear(w1), w2.length > 2 && clear(w2), w3.length > 2 && clear(w3)];
      const onIt = yRoute('yubatake', [-320, 30], [-175, 67]), last = onIt[onIt.length - 1]; out.off = !blocks.some((bk) => yIn(bk, last));
      localStorage.setItem('nq_hero', JSON.stringify({ yubatake: { X: 120, Y: 200 } })); yPlace = 'yard'; await at('yubatake'); out.kept = [Math.round(yh.X), Math.round(yh.Y)];
      return JSON.stringify(out); })()"""))
    assert r['tap'] <= 128 and r['tap2'] <= 128, r   # never past the railing (Y 134)
    assert r['round'] == [True, True, True] and r['off'], r   # round each bench and the stone lamp, never through
    assert r['kept'][1] <= 128, r   # a spot kept past the railing: back in front of it

# Minor 8: on 湯けむり通り, ゆのはな堂's steamer table and price board and 花月's 行灯, stone lantern and pine stand out on the pavement,
# partly inside the street's walkable edge — walked round (WALK_BLOCK.yudori), a walk to one ends beside it
def test_the_street_keeps_him_off_its_pavement_things(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + CALM + """ const out = {};
      await at('yudori'); const blocks = walkBlocks('yudori'), things = YUDORI.BLOCKS.map((x) => x.id);
      const has = (id) => (YUDORI.BLOCKS.find((x) => x.id === id) || {}).box, seiro = has('seiro'), andon = has('andon');
      const mid = (bk) => [(bk[0] + bk[1]) / 2, (bk[2] + bk[3]) / 2], clear = (w) => w.every((q, i) => !i || blocks.every((bk) => !yCross(bk, w[i - 1], q)));
      const [sx, sy] = mid(seiro), [ax, ay] = mid(andon);
      const w1 = yRoute('yudori', [sx, sy - 18], [sx, sy + 18]), w2 = yRoute('yudori', [ax, ay - 16], [ax, ay + 16]);
      await new Promise((q) => yHeroWalk(yard(), [sx, sy], q)); const at1 = [yh.X, yh.Y];
      await new Promise((q) => yHeroWalk(yard(), [ax, ay], q)); const at2 = [yh.X, yh.Y];
      out.things = things; out.inside = [YUDORI.half(sy) > Math.abs(seiro[1]) - 1, YUDORI.half(ay) > Math.abs(andon[0]) - 1];
      out.round = [w1.length > 2 && clear(w1), w2.length > 2 && clear(w2)]; out.off = [at1, at2].map((p) => !blocks.some((bk) => yIn(bk, p)));
      return JSON.stringify(out); })()"""))
    assert {'seiro', 'andon'} <= set(r['things']), r
    assert r['inside'] == [True, True], r   # both reach inside the street's walkable edge (else no block were needed)
    assert r['round'] == [True, True] and r['off'] == [True, True], r

# Minor 1 / Minor 9: the stand's coins are drawn by their faces (五十円, 百円, 五百円: no digits), so the sign's 100円 has to be read as
# 百円; a wrong coin gets its Japanese line and a short Chinese hint under it; full today (two foods had), the right coin buys nothing:
# he says so, nothing is paid, no egg
def test_the_egg_stand_coins_read_and_a_full_stomach(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + CALM + """ const out = {}; const t = todayStr();
      REG.vocab.filter((v) => jaPlain(v.w) === '卵').forEach((v) => { state.srs[v.key] = { b: 3, due: addDays(t, 9), n: 4, ok: 4, ng: 0, s: 9, d: 5, last: addDays(t, -2), intro: addDays(t, -20), lrn: addDays(t, -2) }; }); saveState();
      const card = () => document.querySelector('.yb-stand'), open = async () => { click('.yard .use-btn[data-use="tamago"]'); await watch(() => card(), 6000); };
      await at('yubatake'); await open();
      out.faces = [...card().querySelectorAll('.yb-coin')].map((c) => [c.dataset.coin, c.textContent.replace(/\\s+/g, ''), [...c.classList].filter((k) => k !== 'yb-coin').join(' '), Math.round(c.getBoundingClientRect().width)]);
      click('.yb-coin[data-coin="500"]'); await wait(200); out.w500 = [card().querySelector('.yb-said').textContent, (card().querySelector('.yb-hint') || {}).textContent || ''];
      click('.yb-coin[data-coin="50"]'); await wait(200); out.w50 = [card().querySelector('.yb-said').textContent, (card().querySelector('.yb-hint') || {}).textContent || ''];
      CLASS.close(); state.purse.today = { day: dateStr(TOWNEV.today()), f: 2, d: 0, b: 0, o: 0 }; saveState(); const bal = yenBalance(), book = Object.keys(state.purse.book).length;
      await open(); click('.yb-coin[data-coin="100"]'); await watch(() => document.querySelector('.talk-card'), 4000);
      out.full = [((document.querySelector('.talk-ja') || {}).textContent || '').trim(), yenBalance() - bal, Object.keys(state.purse.book).length - book, state.purse.today.f];
      await wait(1800); out.eat = Boolean(document.querySelector('.eat-scene')); return JSON.stringify(out); })()"""))
    faces = {c: (txt, cls, w) for c, txt, cls, w in r['faces']}
    assert faces['50'][0] == '五十円' and faces['100'][0] == '百円' and faces['500'][0] == '五百円', r   # kanji faces, no digits
    assert [faces[c][1] for c in ('50', '100', '500')] == ['yb-c50', 'yb-c100', 'yb-c500'] and all(faces[c][2] >= 40 for c in faces), r
    assert r['w500'][0] == 'おつりが ない…' and '找零' in r['w500'][1], r
    assert r['w50'][0] == 'たりない…' and '不夠' in r['w50'][1] and '牌子' in r['w50'][1], r
    assert r['full'] == ['まだ おなかが いっぱいです。', 0, 0, 2] and not r['eat'], r   # a third food: refused, nothing paid, no egg

# Minor 9: a 射的 card shut halfway with motion on (its corks still flying): the result still comes as a toast, the 300 円 spent once
def test_shateki_shut_halfway_still_tells_and_spends_once(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + """ const out = {}, toasts = []; window.toast = (m) => toasts.push(m);
      await at('yudori'); const bal = yenBalance(); YUDORI.shateki(yard()); await watch(() => document.querySelector('.yd-shateki .yd-go'), 3000);
      click('.yd-shateki .yd-go'); click('.yd-shateki .yd-go'); await wait(500); out.mid = [Boolean(document.querySelector('.yd-shateki')), toasts.filter((m) => /射的/.test(m)).length, bal - yenBalance()];
      CLASS.close(); await watch(() => toasts.some((m) => /射的/.test(m)), 6000); await wait(400);
      YUDORI.shateki(yard()); await wait(300); out.after = [toasts.filter((m) => /射的/.test(m)).length, bal - yenBalance(), Boolean(document.querySelector('.yd-shateki .yd-done')), state.oneADay.shateki];
      return JSON.stringify(out); })()"""))
    assert r['mid'] == [True, 0, 300], r   # under way: paid once, nothing told yet
    assert r['after'] == [1, 300, True, '2026-11-10'], r   # shut halfway: told once, still 300 spent once, played today

# Minor 7: 湯けむり通り's visitors come in parties of one to three, but never more than seven walk at once — a party is sent only when
# all of it fits (here every party a family of three: two fit, a third would make nine)
def test_street_passers_never_more_than_seven(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + """ await at('yudori'); const rnd = Math.random; Math.random = () => 0.4;
      for (let i = 0; i < 10; i++) PASSERS.spawn(); Math.random = rnd; await wait(100);
      return JSON.stringify({ n: document.querySelectorAll('.yard .passer').length }); })()"""))
    assert 6 <= r['n'] <= 7, r

# ---- Task 3: 旅館「花月」 — its lobby, 桜の間 and the onsen town's people (spec §3.4, §3.5, §4) ----
# 花月's gate on 湯けむり通り (its door to tap, and its way sign) into the lobby (#/ryokan), seen at 45° as the town's rooms; up its stairs
# 「客室 ↑」 to 桜の間 (#/washitsu); down and out again — both in the onsen's own ring (ruling 1: the harbour's ring as it was)
def test_the_ryokan_and_its_room(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + CALM + """ const out = {};
      out.ways = [['yudori', 'ryokan'], ['ryokan', 'washitsu']].filter(([a, c]) => !(WAYS[a + '>' + c] && WAYS[c + '>' + a]));
      out.routes = ['ryokan', 'washitsu'].map((p) => PLACE_ROUTE[p]); out.names = ['ryokan', 'washitsu'].map((p) => TOWNEV.PLACE_NAME[p]);
      out.indoor = ['ryokan', 'washitsu'].map((p) => INDOOR.includes(p)); out.places = ['ryokan', 'washitsu'].map((p) => TOWN.PLACES.includes(p));
      out.hops = [TOWNEV.hop('onsen', 'washitsu'), TOWNEV.hop('washitsu', 'onsen'), TOWNEV.hop('ryokan', 'town'), TOWNEV.hop('harbor', 'ryokan'), TOWNEV.hop('harbor', 'beach')];
      const ways = () => [...yard().querySelectorAll('.way-btn')].map((w) => w.dataset.to).sort();
      const walk = async (to, hash) => { click(`.yard .way-btn[data-to="${to}"]`); await watch(() => location.hash === hash, 8000); await wait(500); return location.hash; };
      await at('yudori'); click('.yard .use-btn[data-use="kagetsu"]'); await watch(() => location.hash === '#/ryokan', 8000); await wait(500);
      out.door = location.hash; out.lobby = ways(); out.iso = [Boolean(yard().querySelector('.indoor-land.iso')), yard().classList.contains('indoor')];
      out.walked = [await walk('washitsu', '#/washitsu')]; out.room = ways(); out.iso.push(Boolean(yard().querySelector('.indoor-land.iso')));
      out.walked.push(await walk('ryokan', '#/ryokan'), await walk('yudori', '#/yudori'), await walk('ryokan', '#/ryokan'));
      return JSON.stringify(out); })()"""))
    assert r['ways'] == [] and r['routes'] == ['#/ryokan', '#/washitsu'] and r['indoor'] == [True, True] and r['places'] == [True, True], r
    assert r['names'] == ['旅館「花月」', '花月・桜の間'], r
    assert r['hops'] == ['yudori', 'ryokan', None, None, 'beach'], r   # the onsen's own ring; the harbour's as it was
    assert r['door'] == '#/ryokan' and r['lobby'] == ['washitsu', 'yudori'] and r['room'] == ['ryokan'] and r['iso'] == [True, True, True], r
    assert r['walked'] == ['#/washitsu', '#/ryokan', '#/yudori', '#/ryokan'], r

# spec §4 (ruling 2): 千代 in the lobby 8–21, 佐藤 at the front desk 7–11 and 14–22, 竹内 by ゆのはな堂's steamers 9–21 — his hours the
# shop's own (TOWN.HOURS.yunohanado), pinned equal; tapped, each greets and has a word — 千代 her 仲居 too (Task 5: its runner in), 佐藤
# his フロント too (Task 7), 竹内 his まんじゅう to order and his おみやげ屋 (Task 6); each has ten things to say or more, from m1 for one
# who rides up at N5, more by the N4 units
def test_keepers_by_their_hours(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + CALM + """ const out = {};
      const who = async (place, h) => { TOWNEV.clock = { h, day: new Date(2026, 10, 10) }; await at(place); return [...yard().querySelectorAll('.npc')].map((n) => n.dataset.npc).sort(); };
      out.lobby = [await who('ryokan', 7.5), await who('ryokan', 9), await who('ryokan', 12), await who('ryokan', 15), await who('ryokan', 21.5), await who('ryokan', 22.5)];
      out.street = [await who('yudori', 8.5), await who('yudori', 20), await who('yudori', 21.5)];
      out.hours = [TOWN.CAST.makoto.hours.map((x) => [x[0], x[1], x[2]]), TOWN.HOURS.yunohanado];
      const tap = async (place, h, id) => { TOWNEV.clock = { h, day: new Date(2026, 10, 10) }; await at(place); TALK.close(); click(`.yard .npc-${id}`); await watch(() => document.querySelector('.talk-card'), 4000);
        const c = document.querySelector('.talk-card'); return c ? { name: c.querySelector('.talk-name').firstChild.textContent, ja: c.querySelector('.talk-ja').textContent.trim(), picks: [...c.querySelectorAll('[data-go]')].map((x) => x.dataset.go) } : null; };
      out.chiyo = await tap('ryokan', 12, 'chiyo'); out.sato = await tap('ryokan', 9, 'sato'); out.makoto = await tap('yudori', 10, 'makoto');
      click('.talk-card [data-go="order"]'); await wait(150); click('.talk'); await watch(() => document.querySelector('.mc-item'), 3000); out.menu = [...document.querySelectorAll('.mc-item')].map((x) => x.dataset.item); closeModal(); TALK.close();
      state.currentUnit = 'm1'; saveState(); out.n5 = ['chiyo', 'sato', 'makoto'].map((id) => TOWNEV.chatLine(id)[0]);
      const ch = (id) => TOWN.CHAT[id] || [], ix = (u) => TOWNEV.unitIdx(u);
      out.lines = Object.fromEntries(['chiyo', 'sato', 'makoto'].map((id) => [id, [ch(id).length, ch(id).filter((l) => l[0] === 'm1' && !l[3]).length, ch(id).filter((l) => ix(l[0]) <= ix('m6')).length, ch(id).filter((l) => ix(l[0]) >= ix('m7') && ix(l[0]) <= ix('m18')).length]]));
      return JSON.stringify(out); })()"""))
    assert r['lobby'] == [['sato'], ['chiyo', 'sato'], ['chiyo'], ['chiyo', 'sato'], ['sato'], []], r   # 佐藤 7–11 and 14–22, 千代 8–21
    assert r['street'] == [[], ['makoto'], []] and r['hours'] == [[[9, 21, 'yudori']], [9, 21]], r   # 竹内 by his shop's hours, pinned
    assert r['chiyo'] and r['chiyo']['name'] == '花村 千代' and r['chiyo']['ja'] and r['chiyo']['picks'] == ['work', 'chat'], r   # her 仲居 (Task 5): work, or a word
    assert r['sato'] and r['sato']['name'] == '佐藤 一' and r['sato']['ja'] and r['sato']['picks'] == ['work', 'chat'], r   # his フロント (Task 7: its runner in): work, or a word
    assert r['makoto'] and r['makoto']['name'] == '竹内 まこと' and r['makoto']['picks'] == ['order', 'work', 'chat'] and r['menu'] == ['onsenmanju'], r   # his まんじゅう to order, his おみやげ屋 (Task 6: its runner in)
    assert all(x and x != '……' for x in r['n5']), r   # an N5 visitor (m1) has a word from each
    for k, (n, m1, n5, n4) in r['lines'].items():
        assert n >= 10 and m1 >= 2 and n4 >= 5 and n4 >= n5, (k, r['lines'])   # ten or more, two from m1, more by the N4 units

# spec §3.4–§3.5, §6 (ruling 10): the lobby's tea 「ご自由に どうぞ」 is free — had there, no 円 — and 桜の間's welcome 温泉まんじゅう waits on
# its 座卓, a gift (TOWN.GIFTS): tapped while not had today it is had (no 円, not one of the day's two foods, stamped in 美食手帳), had
# before 桜の間 on a screen of its own; the plate then holds only its wrapper till tomorrow, a second the same day refused; the day kept
# as purse.gifts.<id> through a load
def test_welcome_manju_once_a_day_and_free_tea(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + CALM + """ const out = {}, toasts = []; window.toast = (m) => toasts.push(m);
      const btn = (id) => Boolean(yard().querySelector(`.use-btn[data-use="${id}"]`)), bal = yenBalance(), pops = () => [...yard().querySelectorAll('.ypop')].map((e) => e.textContent).join('|');
      const plate = () => [Boolean(yard().querySelector('.rk-plate .rk-manju')), Boolean(yard().querySelector('.rk-plate .rk-wrap'))];
      await at('ryokan'); click('.yard .use-btn[data-use="tea"]'); await wait(1600);
      out.tea = [bal - yenBalance(), Boolean(document.querySelector('.mc-item')), Boolean(document.querySelector('.eat-scene')), pops(), (state.purse.today || {}).d || 0];
      await at('washitsu'); out.before = [btn('manju'), btn('wrapper'), ...plate()];
      click('.yard .use-btn[data-use="manju"]'); out.manju = await eat(); await wait(300);
      const g = Object.keys(TOWN.GIFTS).find((k) => TOWN.GIFTS[k].place === 'washitsu'), it = g ? TOWN.GIFTS[g].item : [];
      out.gift = [(state.purse.gifts || {})[g], state.purse.book[it[0]], (state.purse.today || {}).f || 0, bal - yenBalance()];
      out.after = [btn('manju'), btn('wrapper'), ...plate()];
      click('.yard .use-btn[data-use="wrapper"]'); await wait(1500); out.again = [Boolean(document.querySelector('.eat-scene')), pops()];
      await at('ryokan'); await at('washitsu'); out.later = [btn('manju'), btn('wrapper'), ...plate()];   // still had today, drawn anew
      out.kept = (normalizeState(JSON.parse(JSON.stringify(state))).purse.gifts || {})[g]; out.how = g ? TOWN.GIFTS[g].how : '';
      TOWNEV.clock = { h: 10, day: new Date(2026, 10, 11) }; await at('washitsu'); out.next = [btn('manju'), btn('wrapper'), ...plate()];
      return JSON.stringify(out); })()"""))
    t = r['tea']
    assert t[0] == 0 and not t[1] and not t[2] and t[3] and t[4] == 0, r   # the tea: no 円, no menu, not the day's drink; a word as he has it
    assert r['before'] == [True, False, True, False], r   # the まんじゅう on its plate
    m = r['manju']
    assert m and m['bg'] == 'washitsu' and m['look'] >= 3 and m['say'] >= 5 and 'まんじゅう' in m['name'], r   # before 桜の間, its own lines
    assert r['gift'] == ['2026-11-10', '2026-11-10', 0, 0], r   # given today: stamped, free, not one of the day's two foods
    assert r['after'] == [False, True, False, True] and not r['again'][0] and r['again'][1], r   # its wrapper till tomorrow; a second refused
    assert r['later'] == [False, True, False, True] and r['kept'] == '2026-11-10' and r['how'], r
    assert r['next'] == [True, False, True, False], r   # the next day: a new one

# fix round 1 (Minor 6): the welcome まんじゅう already had today elsewhere (another device's sync, the room drawn before it came): a tap
# on its plate never does nothing — the plate turns to its wrapper there and then, and he says so; nothing given twice
def test_welcome_manju_already_had_elsewhere(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + CALM + """ const out = {};
      await at('washitsu'); const btn = (id) => Boolean(yard().querySelector(`.use-btn[data-use="${id}"]`));
      out.before = [btn('manju'), Boolean(yard().querySelector('.rk-plate .rk-manju'))];
      state.purse.gifts = { kangei: dateStr(TOWNEV.today()) }; const book = Object.keys(state.purse.book).length;   // synced in from another device, the room as it was
      click('.yard .use-btn[data-use="manju"]'); await wait(1800);
      out.after = [btn('manju'), btn('wrapper'), Boolean(yard().querySelector('.rk-plate .rk-wrap')), Boolean(document.querySelector('.eat-scene')), Object.keys(state.purse.book).length - book];
      out.pops = [...yard().querySelectorAll('.ypop')].map((e) => e.textContent).join('|');
      return JSON.stringify(out); })()"""))
    assert r['before'] == [True, True], r
    assert r['after'] == [False, True, True, False, 0] and 'また あした' in r['pops'], r   # its wrapper at once, a word; nothing had twice

# fix round 1 (Minor 5, Minor 8): the 鹿威し turns slowly (15–20 s a turn, its コーン at each by its own animation); with motion reduced
# it stands still, so the lobby hears a faint コーン now and then instead; the bell rung while 佐藤 is away names his hours as CAST has them
def test_the_shishi_odoshi_and_the_bell(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + """ const out = {}, toasts = []; window.toast = (m) => toasts.push(m);
      await at('ryokan'); const sh = yard().querySelector('.rk-shishi'); out.cycle = sh ? parseFloat(getComputedStyle(sh).animationDuration) : 0;
      out.moving = SND.later('ryokan').filter(([n]) => n === 'kon').length;
      const mm = window.matchMedia; window.matchMedia = (q) => (/reduced-motion/.test(q) ? { matches: true } : mm.call(window, q));
      out.still = SND.later('ryokan').filter(([n]) => n === 'kon').map((x) => x[3]); window.matchMedia = mm;
      TOWN.CAST.sato.hours = [[6, 10, 'ryokan', 'desk'], [15, 21, 'ryokan', 'desk']]; TOWNEV.clock = { h: 12, day: new Date(2026, 10, 10) }; await at('ryokan');
      RYOKAN.bell(yard()); out.away = toasts.splice(0).join('|');
      return JSON.stringify(out); })()"""))
    assert 15 <= r['cycle'] <= 20 and r['moving'] == 0, r   # a slow turn; while it moves, its own animation sounds it
    assert len(r['still']) == 1 and r['still'][0] <= 0.3, r   # motion reduced: a faint コーン now and then
    assert '6:00〜10:00' in r['away'] and '15:00〜21:00' in r['away'], r   # the bell's "not here" from 佐藤's own hours

# 2026-11-25 (the user: 「花月一樓的風鈴按了那個互動方式應該只需要輕輕晃動就好，目前是上下大震」): looking at the garden rings the lobby's 風鈴 — a few
# small swings about its hook that die away (8° at most, a third or less of that by the end), never up and down: its bell keeps its
# height, its group is not turned (the shared ring's swing turned it round the land's corner: the shake); its idle sway stays gentle (4°)
def test_the_furin_swings_gently(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + """ await at('ryokan'); const g = yard().querySelector('[data-fx="furin"]'), sw = g.querySelector('.fx-sway'), bell = sw.querySelectorAll('path')[1];
      const turn = (e) => { const m = getComputedStyle(e).transform; if (!m || m === 'none') return 0; const v = m.match(/matrix\\(([^)]+)\\)/); if (!v) return 0; const [p, q] = v[1].split(',').map(Number); return Math.atan2(q, p) * 180 / Math.PI; };
      const rot = (e) => parseFloat(getComputedStyle(e).rotate) || 0;
      const at0 = () => { const k = bell.getBoundingClientRect(); return [k.left + k.width / 2, k.top + k.height / 2]; };
      const sample = async (ms) => { const o = []; const t0 = performance.now(); while (performance.now() - t0 < ms) { o.push([performance.now() - t0, turn(g), turn(sw), rot(sw), ...at0()]); await wait(25); } return o; };
      const idle = await sample(2700);
      click('.use-btn[data-use="niwa"]'); await watch(() => g.classList.contains('ring'), 8000); const rung = await sample(2300);
      const mx = (xs) => Math.max(...xs.map(Math.abs)), span = (xs) => Math.max(...xs) - Math.min(...xs), part = (a, b) => rung.filter((x) => x[0] >= a && x[0] < b);
      const mm = window.matchMedia; window.matchMedia = (q) => (/reduced-motion/.test(q) ? { matches: true } : mm.call(window, q));
      return JSON.stringify({ idle: mx(idle.map((x) => x[2] + x[3])), group: mx(rung.map((x) => x[1])), swing: mx(rung.map((x) => x[3])), early: mx(part(0, 700).map((x) => x[3])), late: mx(part(1600, 2300).map((x) => x[3])),
        updown: span(rung.map((x) => x[5])), across: span(rung.map((x) => x[4])), bellH: bell.getBoundingClientRect().height }); })()"""))
    assert r['group'] < 0.5, r   # its group never turned (the ring's swing round the land's corner: the shake)
    assert 4 <= r['swing'] <= 8.5 and r['late'] <= r['early'] / 3, r   # a small swing, dying away
    assert r['updown'] <= max(1.5, r['bellH'] * 0.12), r   # no up and down: the bell keeps its height
    assert r['idle'] <= 4.5, r   # its idle sway gentle

# ruling 3: 桜の間 front-on for the 仲居 card — washitsuArt(state) draws the room from { window, shoji, light, ac, tv, futon 0–3, zabuton 0–4,
# tea, yukata, flower } (and room: sakura | kiku | matsu — the scroll and the flower; cat: the inn's cat asleep on a futon): every key
# changes the drawing; each thing its own group carrying data-k — the futons' three places and the cushions' four each their own,
# data-i 0..n−1 — 40 px or more to tap where a card on a 360-px phone really draws it (fix round 1: about 296 px across, inside the
# card's gutters and padding); with everything out nothing lies over another but the cat, asleep on a futon
def test_washitsu_art_draws_every_state(b):
    r = json.loads(ev(b, """(() => { const none = { window: false, shoji: false, light: false, ac: false, tv: false, futon: 0, zabuton: 0, tea: false, yukata: false, flower: false, room: 'sakura', cat: false };
      const all = { window: true, shoji: true, light: true, ac: true, tv: true, futon: 3, zabuton: 4, tea: true, yukata: true, flower: true, room: 'sakura', cat: true };
      const art = (o) => washitsuArt(Object.assign({}, none, o)), keys = ['window', 'shoji', 'light', 'ac', 'tv', 'futon', 'zabuton', 'tea', 'yukata', 'flower', 'cat'];
      const same = keys.filter((k) => art({ [k]: all[k] }) === art({}));
      const counts = [[0, 1, 2, 3].map((n) => art({ futon: n })), [0, 1, 2, 3, 4].map((n) => art({ zabuton: n }))].map((xs) => new Set(xs).size);
      const rooms = new Set(['sakura', 'kiku', 'matsu'].map((room) => art({ room, flower: true }))).size, bare = new Set(['sakura', 'kiku', 'matsu'].map((room) => art({ room }))).size;
      const W = 296, host = document.createElement('div'); host.style.cssText = `position:fixed;left:0;top:0;width:${W}px;z-index:9999`; document.body.appendChild(host);
      const box = (o) => { host.innerHTML = art(o); const svg = host.querySelector('svg'); svg.style.width = W + 'px'; svg.style.height = 'auto';
        return Object.fromEntries(keys.map((k) => [k, [...host.querySelectorAll(`[data-k="${k}"]`)].map((e) => { const q = e.getBoundingClientRect(); return [q.left, q.top, q.right, q.bottom].map((n) => Math.round(n * 10) / 10); })])); };
      const on = box(all), slots = ['futon', 'zabuton'].map((k) => [...host.querySelectorAll(`[data-k="${k}"]`)].map((e) => e.dataset.i)), off = box({}), lone = box({ cat: true });
      const small = keys.flatMap((k) => on[k].concat(off[k]).filter(([l, t, rr, bb]) => rr - l < 40 || bb - t < 40).map((q) => k + ':' + Math.min(q[2] - q[0], q[3] - q[1])));
      const missing = keys.filter((k) => !on[k].length || (k !== 'cat' && !off[k].length));
      const meet = (a, c) => a[0] < c[2] - 1 && c[0] < a[2] - 1 && a[1] < c[3] - 1 && c[1] < a[3] - 1, over = [], items = keys.filter((k) => k !== 'cat');
      items.forEach((a, i) => items.slice(i + 1).forEach((c) => { if (on[a].some((p) => on[c].some((q) => meet(p, q)))) over.push(a + '/' + c); }));
      const catOn = [on, lone].map((s) => s.cat.length > 0 && s.cat.every((p) => s.futon.some((q) => meet(p, q))));
      host.remove(); return JSON.stringify({ same, counts, rooms, bare, small, missing, over, catOn, slots, svg: /^<svg[^>]*viewBox/.test(art({}).trim()) }); })()"""))
    assert r['svg'] and r['same'] == [] and r['counts'] == [4, 5], r   # every key changes the drawing, each count its own
    assert r['rooms'] == 3 and r['bare'] == 3, r   # each room its own scroll (and flower)
    assert r['slots'] == [['0', '1', '2'], ['0', '1', '2', '3']], r   # the futons' three places, the cushions' four, each its own
    assert r['missing'] == [] and r['small'] == [], r   # every thing its own group, 40 px or more to tap at a 360-px phone's card
    assert r['over'] == [] and r['catOn'] == [True, True], r   # nothing over another; the cat asleep on a futon (laid or still to lay)

# ruling 2 (as 湯畑's review found): each room's floor walked round its things — the lobby's front desk (never behind it), its 土間 (in and
# out at the 上がり框 only), the sofas, the tea table; 桜の間's 座卓 with its 座椅子, the TV, the 広縁's chairs — a tap on one ends beside
# it, a spot kept inside one or off the floor comes back onto the floor beside it
def test_the_inn_keeps_him_on_its_floor(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + CALM + """ const out = {};
      const uv = () => isoUV(yh.X, yh.Y), inBlock = () => { const [u, v] = uv(), p = yard().dataset.place; return walkBlocks(p).filter((k) => u > k[0] + 0.01 && u < k[1] - 0.01 && v > k[2] + 0.01 && v < k[3] - 0.01).length; };
      const onFloor = () => { const [u, v] = uv(); return u >= 0.5 && u <= ISO.RW - 0.5 && v >= 0.5 && v <= ISO.RD - 0.5; };
      const go = async (u, v) => { await new Promise((q) => yHeroWalk(yard(), isoXY(u, v), q)); return [inBlock(), onFloor(), ...uv().map((n) => Math.round(n * 10) / 10)]; };
      const mid = (k) => [(k[0] + k[1]) / 2, (k[2] + k[3]) / 2], clear = (p, w) => w.map((q) => isoUV(q[0], q[1])).every((q, i, a) => !i || walkBlocks(p).every((k) => !yCross(k, a[i - 1], q)));
      const kept = async (p, u, v) => { localStorage.setItem('nq_hero', JSON.stringify({ [p]: { X: Math.round(isoXY(u, v)[0]), Y: Math.round(isoXY(u, v)[1]) } })); yPlace = 'yard'; await at(p); return [inBlock(), onFloor()]; };
      await at('ryokan'); const D = RYOKAN.DESK;
      out.desk = await go((D[0] + D[1]) / 2, D[2] - 1.2); out.deskV = D[3];   // behind the front desk, where 佐藤 stands
      out.doma = await go(...mid(RYOKAN.DOMA)); out.domaU = RYOKAN.DOMA[1];   // down into the 土間
      out.sofa = await go(...mid(RYOKAN.SOFA)); out.tea = await go(...mid(RYOKAN.TEA)); out.wall = await go(30, -6);
      out.round = [clear('ryokan', yRoute('ryokan', isoXY(12, 9.5), isoXY(15.4, 2))), clear('ryokan', yRoute('ryokan', isoXY(5, 12.5), isoXY(21, 8)))];
      out.keptLobby = [await kept('ryokan', ...mid(D)), await kept('ryokan', 40, 40)];
      await at('washitsu'); out.zataku = await go(...mid(RYOKAN.ZATAKU)); out.engawa = await go(...mid(RYOKAN.ENGAWA_SET)); out.tv = await go(...mid(RYOKAN.TV));
      out.round.push(clear('washitsu', yRoute('washitsu', isoXY(13, 13.5), isoXY(14, 2.4))));
      out.keptRoom = [await kept('washitsu', ...mid(RYOKAN.ZATAKU)), await kept('washitsu', -8, 30)];
      return JSON.stringify(out); })()"""))
    for k in ('desk', 'doma', 'sofa', 'tea', 'wall', 'zataku', 'engawa', 'tv'):
        assert r[k][:2] == [0, True], (k, r)   # beside it, on the floor
    assert r['desk'][3] >= r['deskV'], r   # in front of the front desk, never behind it
    assert r['doma'][2] >= r['domaU'] - 0.01, r   # up on the floor, not down in the 土間
    assert r['round'] == [True, True, True], r   # round the things, never through
    assert r['keptLobby'] == [[0, True], [0, True]] and r['keptRoom'] == [[0, True], [0, True]], r   # a spot kept in a thing or off the floor: back beside it

# 2026-11-25 (the user: 「花月二樓那些椅子類的互動都有些問題」, then 「椅子是人會變成在椅子後面」): sat on any of 桜の間's seats — the 広縁's two chairs,
# the four 座椅子 — the hero is drawn in front of what he sits on. Facing us (the far seats) nothing of his seat covers him: his head and
# chest in sight; his back to us (the near seats) only the seat's own back, truly nearer, covers his chest; his head always in sight (the
# 鴨居 over the shoji's track no more across his face in the 広縁). Points on him (where he is hit with the room's things hidden) are hit
# on him with them shown, by the browser's own paint order (elementFromPoint), at 390×844 and 1280×800
def test_sat_in_the_washitsu_he_is_drawn_before_his_seat(b):
    out = {}
    for w, h in ((390, 844), (1280, 800)):
        out[w] = json.loads(b.run([("metrics", (w, h)), ("nav", URL), ("wait", READY), ("eval", "(async () => { " + BEGIN + CALM + """ const res = {};
          const light = (e) => e.matches('.glow, .rk-glow, .lit, [fill^="url(#gl"], [fill^="url(#rkPool"]');   // a lamp's glow over him is light, not a thing
          const hits = (ps) => ps.map(([x, y]) => { const e = document.elementsFromPoint(x, y).find((q) => !light(q)); return e ? (e.closest('.yhero') ? 'hero' : e.closest('svg.land') ? 'prop' : 'other') : 'none'; });
          const grid = (k, y0, y1) => [0.25, 0.4, 0.5, 0.6, 0.75].flatMap((fx) => [y0, (y0 + y1) / 2, y1].map((fy) => [k.left + k.width * fx, k.top + k.height * fy]));
          for (const id of ['engawa', 'zaisu']) { const t = PLACE_USE.washitsu.find((q) => q.id === id);
            for (let i = 0; i < t.seats.length; i++) { await at('washitsu'); const s = t.seats[i], [X, Y] = isoXY(s[0], s[1], s[2]); yard()._at = { x: X, y: Y };
              click(`.use-btn[data-use="${id}"]`); await watch(() => yh.use, 8000); yCamTo(yard(), yh.X); await wait(300);   // (motion reduced: the camera on him as a walk would bring it)
              document.querySelectorAll('.yard .use-btn, .yard .way-btn, .yard .thing, .yard .ypop, .yard .ysay, .yard-tools, .topbar').forEach((e) => { e.style.pointerEvents = 'none'; e.style.visibility = 'hidden'; });
              if (!document.getElementById('hitPaint')) document.head.insertAdjacentHTML('beforeend', '<style id="hitPaint">.yard svg.land * { pointer-events: visiblePainted !important; }</style>');   // the scene's layers hit where they are drawn (the sky takes no taps: none by inheritance; a layer's own box never)
              const hel = document.querySelector('.yhero'), hs = [...hel.querySelectorAll('.head')].map((e) => e.getBoundingClientRect()).filter((k) => k.width > 0);   // the view shown: its back hair's and its face's heads
              const head = { left: Math.min(...hs.map((k) => k.left)), top: Math.min(...hs.map((k) => k.top)), right: Math.max(...hs.map((k) => k.right)), bottom: Math.max(...hs.map((k) => k.bottom)) }; head.width = head.right - head.left; head.height = head.bottom - head.top;
              const hp = grid(head, 0.35, 0.8), cp = [0.3, 0.42, 0.5, 0.58, 0.7].map((fx) => [head.left + head.width * fx, head.bottom + head.height * 0.12]);
              const props = [...document.querySelectorAll('.yard svg.land.prop')]; props.forEach((e) => { e.style.visibility = 'hidden'; });
              const on = [hits(hp), hits(cp)]; props.forEach((e) => { e.style.visibility = ''; }); const now = [hits(hp), hits(cp)];
              const k = (j, want) => on[j].reduce((n, x, q) => n + (x === 'hero' && now[j][q] === want ? 1 : 0), 0);
              res[id + i] = { far: !/back/.test(s[3]), head: [on[0].filter((x) => x === 'hero').length, k(0, 'hero')], chest: [on[1].filter((x) => x === 'hero').length, k(1, 'hero'), k(1, 'prop')] }; } }
          return JSON.stringify(res); })()""")])[-1])
    for w, v in out.items():
        for seat, x in v.items():
            assert x['head'][0] >= 6 and x['head'][1] == x['head'][0], (w, seat, x, v)   # his head never covered
            if x['far']: assert x['chest'][0] >= 2 and x['chest'][1] == x['chest'][0], (w, seat, x, v)   # facing us: nothing of his seat over him
            else: assert x['chest'][2] >= 1, (w, seat, x, v)   # his back to us: the seat's back, nearer, before his chest

# 2026-11-25 (the user: 「浴衣如果可以讓使用者取得感覺應該是滿好的，首次互動就真的多了一套可以穿的浴衣，而且取得當下就直接換上」): the first tap on 桜の間's
# yukata tray gives the hero the inn's own (innyukata: given, as the neighbours' presents — never 古道具屋's), on at once — drawn anew where he
# stands, in the inn's white, indigo and navy — with its toast; the 衣櫃 lists it; later taps: the tray's toast, nothing given or put on again
def test_the_inn_gives_its_yukata_once_and_on(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + CALM + """ const out = {}, toasts = []; window.toast = (m) => toasts.push(m);
      await at('washitsu'); out.before = [owns('innyukata'), HERO.norm(state.look).topStyle];
      click('.use-btn[data-use="yukata"]'); await watch(() => owns('innyukata'), 6000); await wait(200);
      const h = document.querySelector('.yhero'); out.got = [state.owned.innyukata, state.look.topStyle, Boolean(h && h.innerHTML.includes('#2f3a5e') && h.innerHTML.includes('#f4f2ec')), toasts.filter((m) => /拿到旅館的浴衣/.test(m)).length];
      const w = WARE.get('innyukata'); out.ware = [w && w.kind, w && w.slot, w && w.gift, w && w.price];
      state.look = Object.assign({}, state.look, { topStyle: 'hoodie' }); saveState(); toasts.length = 0; await at('washitsu');
      click('.use-btn[data-use="yukata"]'); await wait(1500); out.again = [state.look.topStyle, toasts.filter((m) => /浴衣/.test(m)).length, toasts.some((m) => /拿到/.test(m)), Object.keys(state.owned).filter((k) => /yukata/.test(k))];
      DRESS.open(yard(), 'wear'); await wait(300); click('[data-act="dress-tab"][data-tab="top"]'); await wait(150);
      out.wardrobe = [...document.querySelectorAll('.dress-opt[data-key="topStyle"]')].map((x) => x.dataset.val); DRESS.close(false); await wait(600);
      return JSON.stringify(out); })()"""))
    assert r['before'] == [False, 'hoodie'], r
    assert r['got'][0]['gift'] == 'kagetsu' and r['got'][0]['paid'] == 0 and r['got'][1:] == ['innyukata', True, 1], r   # his, on, drawn anew, said so
    assert r['ware'] == ['clothes', 'top', 'kagetsu', None], r   # given, never sold
    assert r['again'] == ['hoodie', 1, False, ['innyukata']], r   # the tray's toast only, nothing put on again
    assert 'innyukata' in r['wardrobe'], r

# ゆかた屋 sells it (the user's pick; ruling 5: 3,000 円 — not under a day's rental on the 案内所's board): open, a tap on the shop opens its card — the 浴衣 drawn on the hero's shoulders in
# his own top colour, its price tag, 「買う」 — too few 円: refused with a toast, nothing spent; enough: the 円 spent, the ware his and on at
# once, his 「これを ください。」, a toast, the card saying so; again: the card says it is his; the 衣櫃 lists it (its colour his choice); not
# 古道具屋's; shut, its knock and when it opens, as before
def test_yukataya_sells_a_yukata(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + CALM + """ const out = {}, toasts = [], said = []; window.toast = (m) => toasts.push(m); window.speakAs = (w, l) => { said.push(w + ':' + l); return Promise.resolve(); };
      const card = () => document.querySelector('.yd-yukata'), tag = () => { const t = card() && card().querySelector('.yd-ytag'); if (!t) return ''; const c = t.cloneNode(true); c.querySelectorAll('rt').forEach((x) => x.remove()); return c.textContent; };
      await at('yudori'); click('.use-btn[data-use="yukataya"]'); await watch(card, 6000);
      out.card = [Boolean(card()), tag(), Boolean(card() && card().querySelector('.yd-ywear svg')), Boolean(card() && card().querySelector('.yd-buy'))];
      click('.yd-buy'); await wait(200); out.short = [yenBalance(), owns('yukata'), toasts.filter((m) => /3,000/.test(m)).length, said.length];
      CLASS.close(); state.purse.gift = 3800; saveState(); await at('yudori'); click('.use-btn[data-use="yukataya"]'); await watch(card, 6000);
      click('.yd-buy'); await wait(300); out.bought = [yenBalance(), state.owned.yukata && state.owned.yukata.paid, state.look.topStyle, said.slice(), toasts.filter((m) => /買了浴衣/.test(m)).length, (card().querySelector('.yd-foot') || {}).textContent];
      out.drawn = Boolean(document.querySelector('.yhero') && /M13 -66 L-8 -40/.test(document.querySelector('.yhero').innerHTML));   // on him, crossed 右前
      CLASS.close(); click('.use-btn[data-use="yukataya"]'); await watch(card, 6000); out.again = [Boolean(card().querySelector('.yd-buy')), /已經是你的/.test(card().textContent)]; CLASS.close();
      const w = WARE.get('yukata'); out.ware = [w.kind, w.slot, w.shop, w.yen, w.price];
      DRESS.open(yard(), 'wear'); await wait(300); click('[data-act="dress-tab"][data-tab="top"]'); await wait(150);
      out.wardrobe = [...document.querySelectorAll('.dress-opt[data-key="topStyle"]')].map((x) => x.dataset.val); DRESS.close(false); await wait(600);
      TOWNEV.clock = { h: 20, day: new Date(2026, 10, 10) }; toasts.length = 0; await at('yudori'); out.shut = [Boolean(document.querySelector('.use-btn[data-use="yukataya"]')), Boolean(document.querySelector('.use-btn[data-use="yukatayashut"]'))];
      return JSON.stringify(out); })()"""))
    assert r['card'] == [True, 'ゆかた　3,000円', True, True], r
    assert r['short'] == [1000, False, 1, 0], r   # 1,000 円: refused, nothing spent, not his
    assert r['bought'][:5] == [800, 0, 'yukata', ['hero:これを ください。'], 1] and '換上' in r['bought'][5], r   # 3,800 − 3,000
    assert r['drawn'] and r['again'] == [False, True], r
    assert r['ware'] == ['clothes', 'top', 'yukataya', 3000, None], r   # sold for 円 here, never at 古道具屋 (no 言靈 price)
    assert 'yukata' in r['wardrobe'] and r['shut'] == [False, True], r

# fix round 1, ruling 6 (左前 is how the dead are dressed): every crossed front — the 女将's kimono, the 巫女's 白衣, the 作務衣, the 甚平
# and both yukata — reads 右前 on the screen whichever way its wearer faces: the top panel's edge running from the viewer's right at the
# neck down to the viewer's left, facing us and turned, and mirrored by .flip (a passer walking down to the left, a seat that flips) too
def test_every_crossed_robe_reads_migimae_whichever_way(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + """ const poses = ['', 'flip', 'turn', 'turn flip', 'bench flip', 'kneel flip', 'walk flip', 'back', 'back flip', 'back turn', 'back turn flip'], out = {}, kinds = {};
      const host = document.createElement('div'); host.className = 'yard'; host.style.cssText = 'position:fixed;left:0;top:0;width:200px;height:400px;z-index:9999;background:#fff'; document.body.appendChild(host);
      const shown = (e) => { for (let x = e; x && x !== host; x = x.parentNode) if (x.nodeType === 1 && getComputedStyle(x).display === 'none') return false; return true; };
      for (const top of ['kimono', 'hakui', 'samue', 'jinbei', 'yukata', 'innyukata']) for (const cls of poses) {
        host.innerHTML = `<div class="hero ${cls}" style="position:absolute;left:0;top:0;width:200px;height:350px">${HERO.svg({ look: Object.assign({}, HERO.norm(state.look), { topStyle: top }), wear: {} })}</div>`; await wait(30);
        const vis = [...host.querySelectorAll('.h-cross, .h-cross-m')].filter(shown); kinds[top + '/' + cls] = [...new Set(vis.map((e) => e.getAttribute('class')))].sort().join(',');   // the copies on show: one kind only (none from behind)
        const g = vis.find((e) => e.closest('.f-front, .f-front3'));
        if (!g) { out[top + '/' + cls] = 'none'; continue; }
        const path = g.querySelector('path'), a = path.getPointAtLength(0), z = path.getPointAtLength(Math.min(8, path.getTotalLength())), dot = (p) => { const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle'); c.setAttribute('cx', p.x); c.setAttribute('cy', p.y); c.setAttribute('r', '.5'); path.parentNode.appendChild(c); const k = c.getBoundingClientRect(); c.remove(); return [k.left + k.width / 2, k.top + k.height / 2]; };
        const [p0, p1] = [dot(a), dot(z)]; out[top + '/' + cls] = p1[0] < p0[0] - 0.5 && p1[1] > p0[1] ? 'migi' : 'hidari'; }
      host.remove(); return JSON.stringify({ out, kinds }); })()"""))
    want = {k: ('none' if '/back' in k else 'migi') for k in r['out']}
    assert r['out'] == want, {k: v for k, v in r['out'].items() if v != want[k]}
    one = {k: ('' if '/back' in k else 'h-cross-m' if 'flip' in k.split('/')[1] else 'h-cross') for k in r['kinds']}   # fix round 2 (the review's Minor 3): exactly one of the two copies shows, never both
    assert r['kinds'] == one, {k: v for k, v in r['kinds'].items() if v != one[k]}

# the yukata on the hero (both kinds): to the ankles, nothing of the bottoms out from under it — no trousers, skirt nor cat's tail, only
# ankles over his shoes, whatever bottoms he has on; crossed 右前 front-on; kneeling on a 座椅子 its hem gathered up (never through the
# cushion: its foot at his seat's); turned and from behind, walking too
def test_the_yukata_on_the_hero(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + CALM + """ const out = { bottoms: {} };
      for (const top of ['yukata', 'innyukata']) for (const bs of ['pants', 'shorts', 'wide', 'skirt', 'catpants', 'santapants']) {
        const svg = HERO.svg({ look: Object.assign({}, state.look, { topStyle: top, bottomStyle: bs, bottom: '#123456', top: '#d0574b' }), wear: {} });
        out.bottoms[top + ':' + bs] = [svg.includes('#123456'), /class="tail/.test(svg), svg.includes('L30 -5'), /M13 -66 L-8 -40/.test(svg), /M-9 -66 L12 -40/.test(svg)]; }
      state.look = Object.assign({}, state.look, { topStyle: 'innyukata' }); state.owned.innyukata = { paid: 0, on: todayStr(), gift: 'kagetsu' }; saveState();
      await at('washitsu'); const t = PLACE_USE.washitsu.find((q) => q.id === 'zaisu'), s = t.seats[2], [X, Y] = isoXY(s[0], s[1], s[2]); yard()._at = { x: X, y: Y };
      click('.use-btn[data-use="zaisu"]'); await watch(() => yh.use, 8000); yCamTo(yard(), yh.X); await wait(300);
      const h = document.querySelector('.yhero'), hem = [...h.querySelectorAll('.h-hem')].map((e) => e.getBoundingClientRect()).filter((k) => k.width > 0)[0], box = h.getBoundingClientRect();
      out.kneel = [h.classList.contains('kneel'), Math.round(hem.bottom - (box.top + box.height * 200 / 210))];   // the hem's foot against his own (the seat)
      return JSON.stringify(out); })()"""))
    for k, v in r['bottoms'].items():
        assert v == [False, False, True, True, False], (k, v)   # no bottoms' colour, no tail; to the ankles; 右前, never 左前
    assert r['kneel'][0] and r['kneel'][1] <= 2, r   # gathered up: its foot no lower than his

# ---- Task 4: the onsen work area and its 観光案内所 (spec §1, §5, §5.1, §8) ----
# the four jobs; card(grades): the 打工證's 經驗 from shifts done in the other areas (S 5, A 4 …, one a job); stub(job): a stand-in
# runner for a job whose own comes in Tasks 5–7 (never one already in, as test_ekimae's reg()); open(): which of the four may start now
WORK4 = """const ONSEN4 = ['annai', 'nakai', 'miyage', 'front'], OTHER = ['buns', 'counter', 'waiter', 'till', 'bento', 'window', 'lost', 'taxi'];
  ['nq_work_onsen', 'nq_work_free', 'nq_work_eki'].forEach((k) => localStorage.removeItem(k));
  const card = (gs) => { state.work.res = {}; gs.forEach((g, k) => { state.work.res['2026-10-' + String(k + 1).padStart(2, '0')] = { place: OTHER[k], done: 10, score: {}, yen: 1, grade: g }; }); saveState(); };
  const stub = (job) => { if (!WORK.has(job)) WORK.register(job, { run: (ctx) => { window.__ctx = ctx; }, lines: () => {} }); };
  const stubs = () => ['nakai', 'miyage', 'front'].forEach(stub);
  const open = () => ONSEN4.filter((j) => WORK.can(j).ok).join(',');"""

# spec §1 (ruling 2): 湯の花温泉's four jobs — 観光案内所 (あかり, m7, 200 円), 仲居 (千代, m8, 220), おみやげ屋 (竹内, m11, 240), フロント
# (佐藤, m15, 260) — open once the 打工證 is ベテラン (經驗 20), each by its unit: 經驗 19 opens none and says ベテラン; the test site's
# switch (nq_work_onsen) opens all four whatever the card and the unit — and only them (駅前 keeps its own switch)
def test_onsen_work_opens_at_veteran_and_by_unit(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + WORK4 + """ stubs(); const out = {};
      out.places = ONSEN4.map((j) => { const P = WORK.PLACES[j] || {}; return [P.area, P.pay, P.course, P.who, P.place, P.tune]; }); out.area = [(WORK.AREAS.onsen || {}).name, (WORK.AREAS.onsen || {}).need];
      state.currentUnit = 'm7'; card(['S', 'S', 'S', 'A']); out.xp19 = [WORK.xp(), WORK.title(), open(), WORK.can('annai').why];
      card(['S', 'S', 'S', 'S']); out.xp20 = [WORK.xp(), WORK.title()];
      for (const u of ['m7', 'm8', 'm11', 'm15']) { state.currentUnit = u; out[u] = open(); }
      card([]); state.currentUnit = 'm1'; out.none = [open(), WORK.can('bento').ok];
      out.on = WORK.onsenTool(); out.free = [open(), WORK.can('bento').ok]; out.off = WORK.onsenTool(); out.after = open();
      return JSON.stringify(out); })()"""))
    assert r['places'] == [['onsen', 200, 'm7', 'akari', 'onsen', 'onsen'], ['onsen', 220, 'm8', 'chiyo', 'ryokan', 'onsen'], ['onsen', 240, 'm11', 'makoto', 'yudori', 'onsen'], ['onsen', 260, 'm15', 'sato', 'ryokan', 'onsen']], r
    assert r['area'] == ['湯の花温泉', 2], r
    assert r['xp19'][:3] == [19, '一人前', ''] and 'ベテラン' in r['xp19'][3], r
    assert r['xp20'] == [20, 'ベテラン'], r
    assert (r['m7'], r['m8'], r['m11'], r['m15']) == ('annai', 'annai,nakai', 'annai,nakai,miyage', 'annai,nakai,miyage,front'), r
    assert r['none'] == ['', False], r
    assert r['free'] == ['annai,nakai,miyage,front', False] and '湯の花' in r['on'] and r['after'] == '', r   # its own area only

# Review Focus 1 (ruling 4): one in N5 (m3) with no ベテラン rides up — each of the four keepers, asked for work, says in the reply why
# not: the 打工證 step it needs and the job's unit; no job card opens. A job whose runner is not in yet (Tasks 5–7 bring them) is never
# offered (ruling 2): its keeper only chats — once a runner is in, the same reason
def test_an_n5_visitor_gets_the_reason_not_a_card(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + CALM + WORK4 + """ state.currentUnit = 'm3'; saveState(); const out = { pre: {} }, toasts = []; window.toast = (m) => toasts.push(m);
      const tap = async (place, h, id) => { TOWNEV.clock = { h, day: new Date(2026, 10, 10) }; await at(place); TALK.close(); toasts.length = 0;
        click(`.yard .npc-${id}`); await watch(() => document.querySelector('.talk-card'), 5000); await wait(150);
        const c = document.querySelector('.talk-card'), picks = c ? [...c.querySelectorAll('[data-go]')].map((x) => x.dataset.go) : [];
        if (picks.includes('work')) { click('.talk-card [data-go="work"]'); await wait(200); click('.talk'); await watch(() => toasts.length, 3000); await wait(400); }
        const opened = Boolean(document.querySelector('.cls')); TALK.close(); return { picks, said: toasts.join('|'), card: opened }; };
      out.akari = await tap('onsen', 10, 'akari');
      for (const [job, place, h, id] of [['nakai', 'ryokan', 12, 'chiyo'], ['front', 'ryokan', 9, 'sato'], ['miyage', 'yudori', 10, 'makoto']]) {
        if (!WORK.has(job)) { out.pre[id] = (await tap(place, h, id)).picks; stub(job); }
        out[id] = await tap(place, h, id); }
      return JSON.stringify(out); })()"""))
    for id, unit in {'akari': '可能形', 'chiyo': '自他動詞', 'sato': '敬語', 'makoto': '授受'}.items():
        x = r[id]
        assert 'work' in x['picks'] and 'ベテラン' in x['said'] and unit in x['said'] and not x['card'], (id, r)
    for id, picks in r['pre'].items():
        assert 'work' not in picks, (id, r)   # no runner yet: a chat (竹内: his まんじゅう too), no work talk
    assert r['makoto']['picks'][0] == 'order', r   # 竹内 sells still, his runner in or not

# spec §5.1 (rulings 6, 7, 8, 21, 24, 25, 26): every answer is read off the board — two shifts whose ゆかた屋 differs on dogs and whose
# 足湯 differs on a towel to buy flip the right reply; the hours and prices said are the board's; what the town itself shows is the same
# on every board (射的 300 円 a go and its hours, ゆかた屋's hours — both TOWN.HOURS —, the 湯畑 free, open all night and lit up by
# night, the 足湯 free, open all night and open to dogs); a shift is ten tourists, the first asking a time, at most one a fun one, no question twice, no tourist
# twice running; every tourist's three replies all differ, one right, none a ら抜き form, a 五段 verb + れる／られる (heard as honorific:
# 入られます, 買われます) nor 見せる; the fun ones — マイク's phrasebook (the yukata's price: at 愛's own place when the shift has it),
# ゆうた's ghost (the playful reply right), ミヨコ's future. Swept at m7, m9, m10 and m15 (TOWNEV.unitIdx: index 7 is m7)
def test_annai_answers_come_from_the_board(b):
    r = json.loads(ev(b, """(() => { const MARK = /\\{([^|}]+)\\|([^|}]+)(?:\\|[^}]+)?\\}/g, kana = (s) => s.replace(MARK, '$2').replace(/\\s/g, '');
      const m7 = TOWNEV.unitIdx('m7'), f = (sh, id) => sh.board.find((x) => x.id === id), right = (t) => t.opts.find((o) => o[2])[0], out = {};
      let a = null, c = null; for (let s = 1; s < 500 && !(a && c); s++) { const x = ANNAI.make(m7, s), yk = f(x, 'yukata'), ft = f(x, 'ashiyu'); if (!a && yk.dog && ft.towel) a = x; if (!c && !yk.dog && !ft.towel) c = x; }
      out.found = Boolean(a && c); const said = (sh, q) => right(ANNAI.ask(sh.board, q, m7));
      out.dog = [said(a, 'dog'), said(c, 'dog')]; out.towel = [said(a, 'towelAshi'), said(c, 'towelAshi')]; out.towelPrice = said(a, 'towelAshi').includes(ANNAI.priceMark(f(a, 'ashiyu').towel));
      out.dogAsk = TOWN.ONSEN.annai.ask.dog[2];
      out.read = [a, c].map((sh) => [said(sh, 'yuTo').includes(ANNAI.timeMark(f(sh, 'yu').hours[1])), said(sh, 'kaFrom').includes(ANNAI.timeMark(f(sh, 'kagetsu').hours[0])),
        said(sh, 'priceYu').includes(ANNAI.priceMark(f(sh, 'yu').price)), said(sh, 'priceYk').includes(ANNAI.priceMark(f(sh, 'yukata').price))]);
      const fixed = [], RANUKI = ['みれます', 'みれません', 'みれる', 'かりれ', 'きれます', 'きれません', 'これます', 'これません', 'たべれ', 'ねれます', 'でれます'];
      const GODAN = ['はいられ', 'かわれ', 'いかれ', 'あそばれ', 'つかわれ', 'のられ', 'とられ', 'とまられ'], SHOW = ['みせま', 'みせる'], bad = []; let n = 0;
      const units = ['m7', 'm9', 'm10', 'm15'].map((u) => TOWNEV.unitIdx(u)); out.units = units;
      for (let s = 1; s <= 80; s++) for (const u of units) { const sh = ANNAI.make(u, s); n += sh.tasks.length;
        const sht = f(sh, 'shateki'), yb = f(sh, 'yubatake'), as = f(sh, 'ashiyu'), yk = f(sh, 'yukata');
        if (sht.price !== 300 || sht.hours.join() !== TOWN.HOURS.shateki.join() || yk.hours.join() !== TOWN.HOURS.yukataya.join() || yb.price !== 0 || yb.hours.join() !== '0,24' || !yb.night
          || as.price !== 0 || as.hours.join() !== '0,24' || as.dog !== true || sh.board.length !== 6) fixed.push(s);
        const ids = sh.tasks.map((t) => t.id); if (sh.tasks.length !== 10 || sh.tasks.filter((t) => t.fun).length > 1 || new Set(ids).size !== ids.length) bad.push(`${s}@${u}:shift:${ids.join()}`);
        if (sh.tasks[0].kind !== 'time' || sh.tasks[0].fun) bad.push(`${s}@${u}:first:${sh.tasks[0].id}`);   // the first tourist asks a time (fix round 2: M-1's gap)
        sh.tasks.forEach((t, k) => { const js = t.opts.map((o) => o[0]);
          if (k && t.who === sh.tasks[k - 1].who) bad.push(`${s}@${u}.${k}:running:${t.who}`);
          if (t.opts.length !== 3 || new Set(js).size !== 3 || t.opts.filter((o) => o[2]).length !== 1 || t.opts.some((o) => !o[1])) bad.push(`${s}.${k}:${t.kind}:opts`);
          if (!t.who || !t.q || !t.q[0] || !t.q[1] || !CAST_VOICE[t.who]) bad.push(`${s}.${k}:q`);
          js.forEach((j) => { const kk = kana(j); RANUKI.concat(GODAN, SHOW).forEach((w) => { if (kk.includes(w)) bad.push(`${s}.${k}:${w}:${j}`); }); }); }); }
      out.fixed = fixed.slice(0, 5); out.scan = [n, bad.slice(0, 8)];
      out.fun = ['book', 'ghost', 'future'].map((k) => { const sh = ANNAI.make(m7, 3, k), t = sh.tasks.find((x) => x.fun === k); return t ? [t.who, right(t), t.opts.length, sh.tasks.filter((x) => x.fun).length] : null; });
      let books = 0; const misplaced = []; for (let s = 1; s <= 200; s++) { const plain = ANNAI.make(m7, s, null), i = plain.tasks.findIndex((t) => t.id === 'priceYk'); if (i < 0) continue; books++;
        const bk = ANNAI.make(m7, s, 'book'); if (!bk.tasks[i].fun || bk.tasks.filter((t) => t.id === 'priceYk').length !== 1) misplaced.push(s); }
      out.book = [books, misplaced.slice(0, 5)];
      return JSON.stringify(out); })()"""))
    assert r['found'], r
    assert 'ゆかた' in r['dogAsk'] and r['dog'][0].startswith('はい') and r['dog'][1].startswith('いいえ'), r   # ゆかた屋: dogs in on one board, not on the other
    assert r['towel'][0].startswith('はい') and r['towel'][1].startswith('いいえ') and r['towelPrice'], r   # a towel at the 足湯 on one, elsewhere on the other
    assert r['read'] == [[True] * 4, [True] * 4], r   # the hours and the prices said are the board's
    assert r['fixed'] == [], r   # what the town shows: the same on every board
    assert r['units'] == [7, 9, 10, 15] and r['scan'][0] == 3200 and r['scan'][1] == [], r
    assert [x and x[0] for x in r['fun']] == ['mike', 'yuta', 'miyoko'] and all(x[2] == 3 and x[3] == 1 for x in r['fun']), r
    assert '{見|み}られるかも' in r['fun'][1][1], r   # the child's ghost: the playful reply is the right one
    assert r['book'][0] > 20 and r['book'][1] == [], r   # マイク's yukata question in 愛's own place, never as well as hers

# spec §5, §5.1: the first shift — あかり's first word (the answers are on the board), the Chinese under the hero's reply; ten tourists,
# all right at once: S, 200 + 50 and the ベテラン card's 4%; the town's own record playing (Task 8, 「湯けむり」); the next day's
# shift shut after three tourists picks up at the fourth, on the same board
def test_annai_shift_grade_pay_and_resume(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + CALM + WORK4 + """ card(['S', 'S', 'S', 'S']); state.currentUnit = 'm7'; state.settings.musicVol = 1; saveState(); const out = {};
      const now = () => ANNAI_RUN.now(), asking = (n) => now() && now().phase === 'ask' && now().k === n && document.querySelector('.wk-annai .an-opt');
      const pick = () => { const t = now().task; click(`.wk-annai .an-opt[data-o="${t.opts.findIndex((o) => o[2])}"]`); };
      await at('onsen'); WORK.start(yard(), 'annai');
      for (let i = 0; i < 40 && !document.querySelector('.wk-annai'); i++) { click('.talk'); await wait(150); }   // あかり's first word, tapped through
      out.first = Boolean(document.querySelector('.wk-annai')); out.music = MUSIC.wants();
      for (let n = 0; n < 10; n++) { await watch(() => asking(n), 12000); pick(); if (!n) { await watch(() => document.querySelector('.wk-annai .wk-me span'), 5000); out.zh = (document.querySelector('.wk-annai .wk-me span') || {}).textContent || ''; } }
      await watch(() => WORK.today() && WORK.today().yen !== undefined, 20000); const x = WORK.today() || {};
      out.paid = [x.grade, x.yen, Object.values(x.score || {})]; document.querySelectorAll('.wk-result').forEach((e) => e.remove()); CLASS.close();
      TOWNEV.clock = { h: 10, day: new Date(2026, 10, 11) }; await at('onsen'); WORK.start(yard(), 'annai'); await watch(() => asking(0), 12000);
      out.talk = Boolean(document.querySelector('.talk-card')); const seed = now().seed;
      for (let n = 0; n < 3; n++) { await watch(() => asking(n), 12000); pick(); } await watch(() => (WORK.today() || {}).done >= 3, 6000); await wait(300); CLASS.close(); await wait(200);
      out.score = (WORK.today() || {}).score; WORK.start(yard(), 'annai'); await watch(() => now() && now().phase === 'ask', 12000); out.k = now() && now().k; out.same = Boolean(now()) && now().seed === seed; CLASS.close();
      return JSON.stringify(out); })()"""))
    assert r['first'] and r['music'] == 'onsen' and r['zh'], r   # her first word, then the card and the town's record; the Chinese under the reply (first shift)
    assert r['paid'] == ['S', 260, [0] * 10], r   # 200 + S 50, ベテラン's 4%
    assert not r['talk'] and r['score'] == {'0': 0, '1': 0, '2': 0} and r['k'] == 3 and r['same'], r

# Review Focus 4 (ruling 5): records of the four new jobs (done, and one under way with what it keeps) and the once-a-day days (射的:
# oneADay.shateki; the welcome まんじゅう: purse.gifts.kangei) survive this build's load and a merge with a copy that has none of them
# (a 1.21.0 device's), whichever was saved later — and 町の手帳's 打工證 shows them. (1.21.0's own merge: tests/sync-core.test.js)
def test_new_job_records_survive_an_old_merge(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + WORK4 + """ const base = JSON.parse(JSON.stringify(state));
      const res = { '2026-11-01': { place: 'annai', done: 10, score: { 0: 0, 1: 1 }, yen: 260, grade: 'S', tip: 0 }, '2026-11-02': { place: 'nakai', done: 10, score: { 0: 0 }, yen: 240, grade: 'A', tip: 0 },
        '2026-11-03': { place: 'miyage', done: 10, score: { 0: 2 }, yen: 270, grade: 'B', tip: 5 }, '2026-11-04': { place: 'front', done: 3, score: { 0: 0, 1: 0, 2: 1 }, keep: { seed: 77 } } };
      const mine = Object.assign({}, base, { work: { res }, oneADay: { shateki: '2026-11-04' }, purse: { spent: {}, book: {}, gifts: { kangei: '2026-11-04' } } });
      const theirs = Object.assign({}, base, { work: { res: { '2026-10-01': { place: 'buns', done: 10, score: {}, yen: 80, grade: 'B', tip: 0 } } }, purse: { spent: {}, book: {} } }); delete theirs.oneADay;
      const stamp = (s, t) => Object.assign(JSON.parse(JSON.stringify(s)), { updatedAt: t });
      const keep = (s) => ({ places: Object.values(s.work.res).map((x) => x.place).sort(), done: ['2026-11-01', '2026-11-02', '2026-11-03'].map((d) => [(s.work.res[d] || {}).yen, (s.work.res[d] || {}).grade]),
        front: s.work.res['2026-11-04'] ? [s.work.res['2026-11-04'].done, s.work.res['2026-11-04'].keep] : null, shateki: (s.oneADay || {}).shateki, kangei: ((s.purse || {}).gifts || {}).kangei });
      const loaded = normalizeState(stamp(mine, '2026-11-23T10:00:00.000Z')), out = { loaded: keep(loaded) };
      const newer = normalizeState(SyncCore.mergeStates(loaded, normalizeState(stamp(theirs, '2026-11-23T11:00:00.000Z')))), older = normalizeState(SyncCore.mergeStates(normalizeState(stamp(theirs, '2026-11-23T09:00:00.000Z')), loaded));
      out.theirsNewer = keep(newer); out.theirsOlder = keep(older);
      state.work = newer.work; const box = document.createElement('div'); box.innerHTML = WORK.book();
      const rows = [...box.querySelectorAll('tr')].map((tr) => tr.textContent);
      out.book = ONSEN4.map((j) => { const row = rows.find((t) => WORK.PLACES[j] && t.includes(WORK.PLACES[j].name)) || ''; return [row.includes('1 班'), row.includes('0 班')]; }); out.xp = WORK.xp();
      return JSON.stringify(out); })()"""))
    mine = {'places': ['annai', 'front', 'miyage', 'nakai'], 'done': [[260, 'S'], [240, 'A'], [270, 'B']], 'front': [3, {'seed': 77}], 'shateki': '2026-11-04', 'kangei': '2026-11-04'}
    assert r['loaded'] == mine, r
    both = dict(mine, places=['annai', 'buns', 'front', 'miyage', 'nakai'])
    assert r['theirsNewer'] == both and r['theirsOlder'] == both, r   # nothing dropped, whichever copy was saved later
    assert r['book'] == [[True, False], [True, False], [True, False], [False, True]] and r['xp'] == 15, r   # 1 班 each (フロント's under way), S 5 + A 4 + B 3 + 包包子's B 3

# ruling 25 (spec §5.1): the 足湯 always takes dogs (the town's own, like its 24 hours and its free entry), so あかり's 〜ようになる line —
# 「去年から、犬も 足湯に 入れるように なりました。」 — is true on every board: she says it on the job's first shift, then on about one
# shift in four, as each shift's seed decides — never on every one
def test_akari_tells_of_the_dogs_on_the_first_shift_and_now_and_then(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + CALM + WORK4 + """ card(['S', 'S', 'S', 'S']); state.currentUnit = 'm7'; saveState(); const out = {}, said = []; window.speakAs = (w, l) => { said.push([w, l]); return Promise.resolve(); };
      let yes = 0, no = 0; for (let s = 1; s < 300 && !(yes && no); s++) { if (!yes && ANNAI.tells(s)) yes = s; if (!no && !ANNAI.tells(s)) no = s; }
      let n = 0; for (let s = 1; s <= 2000; s++) if (ANNAI.tells(s)) n++; out.share = n / 2000;
      const line = () => said.filter(([w, l]) => w === 'akari' && /ように/.test(l)).map(([, l]) => l);
      const shift = async (seed, d) => { TOWNEV.clock = { h: 10, day: new Date(2026, 10, d) }; state.work.res[dateStr(TOWNEV.today())] = { place: 'annai', done: 0, score: {}, keep: { seed } }; saveState();
        said.length = 0; await at('onsen'); WORK.start(yard(), 'annai'); for (let i = 0; i < 40 && !document.querySelector('.wk-annai'); i++) { click('.talk'); await wait(120); }
        await watch(() => ANNAI_RUN.now() && ANNAI_RUN.now().phase === 'ask' && ANNAI_RUN.now().seed === seed, 12000); await wait(200); const l = line(); CLASS.close(); return l; };
      out.first = await shift(no, 10);   // the first shift: told, whatever its seed
      state.work.res['2026-10-20'] = { place: 'annai', done: 10, score: {}, yen: 1, grade: 'C' }; saveState();
      out.yes = await shift(yes, 11); out.no = await shift(no, 12);
      return JSON.stringify(out); })()"""))
    assert r['first'] and '{足湯|あしゆ|足湯}' in r['first'][0] and 'ように なりました' in r['first'][0], r
    assert r['yes'] and r['no'] == [], r   # after it, as the seed decides
    assert 0.15 < r['share'] < 0.35, r   # about one shift in four, never every one

# lines that take 700 ms each (speakAs; 400 ms for speak): a line begun while another is still being said, or the voices stopped
# while one is (a card shut), is cut — __cut names it; __log keeps every line in order; hush() waits for quiet
SAYS = """window.__cut = []; window.__log = []; window.talking = null;
  const says = (ms) => (w, l) => { __log.push(w + ':' + l); if (talking) __cut.push(talking + ' ← ' + w + ':' + l); const me = talking = w + ':' + l; return new Promise((ok) => setTimeout(() => { if (talking === me) talking = null; ok(); }, ms)); };
  window.speakAs = says(700); window.speak = (t) => says(400)('', t); window.voiceFx = () => Promise.resolve(); window.stopSpeaking = () => { if (talking) __cut.push(talking + '（停）'); talking = null; };
  const hush = async () => { for (let i = 0; i < 100 && talking; i++) await wait(50); };"""

# Review Focus 5, ruling 27: each line said to its end. A fresh first shift: あかり's start and her 足湯 news (ruling 25); a miss as the
# tourist's patience nears 0.6 — her word to its end, then the miss's cost, then the tourist's 「あの、すみません！」; a right reply
# picked during her word — the hero's reply after it. Then a shift taken up at a fun tourist near its end: their own after-line, the
# last tourist, her goodbye, the card shut, paid
# lines that take 1.5 s each, timed from the start (log: [ms, who, line]); a line begun while another is still being said is cut (cuts:
# [ms, 'the one cut ← the new one']); stopSpeaking (a card shut) stops the one being said — the re-review's probe (rereview4_probe.py)
LANE = """const t0 = Date.now(), log = [], cuts = []; let talking = null; const ms = () => Date.now() - t0;
  window.speakAs = (w, l) => { if (talking) cuts.push([ms(), talking + ' ← ' + w + ':' + l]); log.push([ms(), w, l]); const me = talking = w + ':' + l; return new Promise((ok) => setTimeout(() => { if (talking === me) talking = null; ok(); }, 1500)); };
  window.speak = (t) => window.speakAs('', t); window.stopSpeaking = () => { talking = null; };"""

# N-1 (fix round 2): the voice lane is its card's — a wrong reply picked while the tourist's question is still being said queues あかり's
# word; the card shut at once and the job begun again: the old word is never said, nor shown in the new card, and the new shift's first
# lines (あかり's start, the hero's こんにちは) are each said whole
def test_a_shut_annai_card_says_nothing_more(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + CALM + WORK4 + LANE + """ card(['S', 'S', 'S', 'S']); state.currentUnit = 'm7';
      state.work.res['2026-10-20'] = { place: 'annai', done: 10, score: {}, yen: 1, grade: 'C' }; saveState(); await at('onsen'); WORK.start(yard(), 'annai');
      const begun = () => { const n = ANNAI_RUN.now(); return n && n.phase === 'ask' && document.querySelector('.wk-annai .an-opt') && log.some(([, w, l]) => w === n.task.who && l === n.task.q[0]); };
      await watch(begun, 20000); const t = ANNAI_RUN.now().task, A = TOWN.ONSEN.annai.say; await wait(200);
      document.querySelector(`.wk-annai .an-opt[data-o="${t.opts.findIndex((o) => !o[2])}"]`).click(); await wait(100);
      const at0 = ms(); CLASS.close(); WORK.start(yard(), 'annai'); await wait(4500);
      const after = log.filter(([m]) => m >= at0), out = { old: after.filter(([, w, l]) => w === A.who && (l === A.fact[0] || l === A.form[0])).length,
        cut: cuts.filter(([m]) => m >= at0).map(([, x]) => x), bad: Boolean(document.querySelector('.wk-annai .wk-say.bad')), card: Boolean(document.querySelector('.wk-annai')), said: after.map(([, w]) => w) };
      CLASS.close(); return JSON.stringify(out); })()"""))
    assert r['old'] == 0 and r['cut'] == [] and not r['bad'] and r['card'], r
    assert r['said'][:1] == ['akari'] and 'hero' in r['said'], r   # the new shift's start, then the hero's こんにちは, each whole

# N-2 (fix round 2): a replay holds the tourist's clock till the question has been said again in full, counted from the replay's own
# start — here it waits behind あかり's word after a miss (lines of 3 s: her word, then the question again, 6 s in all). Read on the lane's
# own events (the final review's Minor 2: no fixed sleeps against the clips): the bar as her word ends (still paused, no cost yet), as the
# question again begins (the cost landed after her word) and as it ends (held all through), then on once it is over
def test_a_replay_holds_the_clock_till_it_is_said_again(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + CALM + WORK4 + """ card(['S', 'S', 'S', 'S']); state.currentUnit = 'm7';
      state.work.res['2026-10-20'] = { place: 'annai', done: 10, score: {}, yen: 1, grade: 'C' }; saveState();
      const bar = () => { const p = document.querySelector('.wk-annai .wk-pat'); return p ? parseFloat(p.style.getPropertyValue('--p')) : null; }, ev = [];
      window.speakAs = (w, l) => { ev.push(['start', w, l, bar()]); return new Promise((ok) => setTimeout(() => { ev.push(['end', w, l, bar()]); ok(); }, 3000)); };
      window.speak = () => Promise.resolve(); await at('onsen'); WORK.start(yard(), 'annai');
      await watch(() => ANNAI_RUN.now() && ANNAI_RUN.now().phase === 'ask' && document.querySelector('.wk-annai .an-ear') && bar() < 0.995, 20000);
      const t = ANNAI_RUN.now().task, from = ev.length; document.querySelector(`.wk-annai .an-opt[data-o="${t.opts.findIndex((o) => !o[2])}"]`).click(); document.querySelector('.wk-annai .an-ear').click();
      const b0 = bar(), q = (kind, who) => ev.slice(from).find((x) => x[0] === kind && x[1] === who && (who !== t.who || x[2] === t.q[0]));
      await watch(() => q('end', t.who), 15000); const b3a = bar(); await watch(() => bar() < b3a, 3000); const b3 = bar(); CLASS.close();
      const word = q('end', 'akari'), again = q('start', t.who), over = q('end', t.who);
      return JSON.stringify({ paused: Boolean(word) && word[3] === b0, cost: Boolean(again) && b0 - again[3] > 0.12, held: Boolean(over) && over[3] === again[3], on: b3 < over[3], bars: [b0, word && word[3], again && again[3], over && over[3], b3] }); })()"""))
    assert [r['paused'], r['cost'], r['held'], r['on']] == [True, True, True, True], r   # paused through her word, its cost after it; held through the question again; then on

def test_annai_says_each_line_to_its_end(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + CALM + WORK4 + SAYS + """ card(['S', 'S', 'S', 'S']); state.currentUnit = 'm7'; saveState(); const out = {};
      const now = () => ANNAI_RUN.now(), asking = (n) => now() && now().phase === 'ask' && now().k === n && document.querySelector('.wk-annai .an-opt') && !talking;
      const opt = (good) => { const t = now().task, i = t.opts.findIndex((o) => (good ? o[2] : !o[2])); return document.querySelector(`.wk-annai .an-opt[data-o="${i}"]`); };
      const bar = () => parseFloat(document.querySelector('.wk-annai .wk-pat').style.getPropertyValue('--p'));
      const A = TOWN.ONSEN.annai.say, X = TOWN.WORK.say.waiter.cust;
      await at('onsen'); WORK.start(yard(), 'annai');
      for (let i = 0; i < 60 && !document.querySelector('.wk-annai'); i++) { await hush(); click('.talk'); await wait(120); }   // あかり's first word, each line heard
      await watch(() => asking(0), 15000); out.start = [__log.some((l) => l === 'akari:' + A.start[0]), __log.some((l) => l === 'akari:' + A.dogs[0])];
      JOBS.pat.scale = 0.1; await watch(() => bar() <= 0.72, 8000);
      const t0 = now().task, from = __log.length; opt(false).click(); JOBS.pat.scale = 1;
      await watch(() => __log.slice(from).some((l) => l === t0.who + ':' + X.again[0]), 6000); await hush();
      out.miss = __log.slice(from, from + 2); opt(true).click();
      await watch(() => asking(1), 15000); const t1 = now().task, at1 = __log.length; opt(false).click(); await wait(150); opt(true).click();
      await watch(() => __log.slice(at1).some((l) => l.startsWith('hero:')), 6000); await hush(); out.picked = __log.slice(at1, at1 + 2).map((l) => l.split(':')[0]);
      await watch(() => asking(2), 15000); CLASS.close();
      // the next day: picked up at a fun tourist, two from the end
      const m7 = TOWNEV.unitIdx('m7'); let seed = 0, fi = 0; for (let s = 1; s < 2000 && !seed; s++) { const i = ANNAI.make(m7, s).tasks.findIndex((t) => t.fun); if (i === 8) { seed = s; fi = i; } }
      TOWNEV.clock = { h: 10, day: new Date(2026, 10, 11) }; state.work.res['2026-11-11'] = { place: 'annai', done: fi, score: Object.fromEntries(Array.from({ length: fi }, (_, k) => [k, 0])), keep: { seed } }; saveState();
      const R = Math.random; Math.random = () => 0.1;   // あかり's word after each
      await at('onsen'); WORK.start(yard(), 'annai'); const fun = ANNAI.make(m7, seed).tasks[fi];
      for (const n of [fi, fi + 1]) { await watch(() => asking(n), 15000); opt(true).click(); await wait(200); }
      await watch(() => document.querySelector('.wk-result'), 20000); Math.random = R;
      out.fun = [Boolean(seed), __log.includes(fun.who + ':' + fun.after[0])];
      out.end = [!document.querySelector('.wk-annai'), (state.work.res['2026-11-11'] || {}).yen > 0, __log.some((l) => l === 'akari:' + A.end[0] || l === 'akari:' + A.all[0])];
      out.cut = __cut; return JSON.stringify(out); })()"""))
    assert r['start'] == [True, True], r   # the start word and the 足湯 news, each heard (the first shift)
    assert r['miss'][0].startswith('akari:') and r['miss'][1].split(':')[1] == 'あの、すみません！', r   # her word, then the tourist's
    assert r['picked'] == ['akari', 'hero'], r   # the reply picked during her word: said after it
    assert r['fun'] == [True, True] and r['end'] == [True, True, True], r
    assert r['cut'] == [], r

# ruling 2, spec §3.1: 湯の花駅前's 求人看板 opens the area's board — its four jobs, what each is, where and with whom, the pay; the ones
# whose runners are not in yet shown with no way in (準備中); shut while the card is short of ベテラン, and says so
def test_the_onsen_board_lists_its_four_jobs(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + CALM + WORK4 + """ const out = {};
      await at('onsen'); click('.yard .use-btn[data-use="jobs"]'); await watch(() => document.querySelector('.wk-board'), 8000);
      const rows = () => [...document.querySelectorAll('.wk-board .wk-job')].map((x) => [x.dataset.job, x.querySelector('.wk-need').textContent, x.textContent.includes('円')]);
      out.shut = rows(); out.lock = (document.querySelector('.wk-board .wk-lock') || {}).textContent || ''; out.head = document.querySelector('.wk-board').textContent; CLASS.close();
      card(['S', 'S', 'S', 'S']); state.currentUnit = 'm7'; WORK.board('onsen'); out.open = rows(); out.lock2 = Boolean(document.querySelector('.wk-board .wk-lock')); CLASS.close();
      out.has = ['nakai', 'miyage', 'front'].map((j) => WORK.has(j)); stubs(); WORK.board('onsen'); out.built = rows(); CLASS.close();
      return JSON.stringify(out); })()"""))
    assert [x[0] for x in r['shut']] == ['annai', 'nakai', 'miyage', 'front'] and all(x[2] for x in r['shut']), r
    assert 'ベテラン' in r['lock'] and '湯の花温泉' in r['head'], r
    assert r['open'][0][1] == '✓ 可以做' and not r['lock2'], r
    assert all(x[1] == '準備中' for x, has in zip(r['open'][1:], r['has']) if not has), r   # no runner yet (Tasks 5–7 bring them): no way in
    assert '準備中' not in [x[1] for x in r['built']] and r['built'][1][1] != '✓ 可以做', r   # in: 仲居 waits for m8

# the card (spec §5.1, ruling 9): seen from inside the counter — the 「湯の花温泉 ごあんない」 board with its six places (a picture, the
# name with its reading, the hours, the price, the rules), the glass with the tourist outside and their patience, the three replies;
# it fits a 360-px phone and a 390-px one, its board's words 12 px or more, every button to tap 40 px or more
def test_the_annai_card_fits_a_phone(b):
    out = []
    for w, h in ((360, 640), (390, 844)):
        r = json.loads(b.run([("metrics", (w, h)), ("nav", URL), ("wait", READY), ("eval", "(async () => { " + BEGIN + CALM + WORK4 + """ card(['S', 'S', 'S', 'S']); state.currentUnit = 'm7';
          state.work.res['2026-10-20'] = { place: 'annai', done: 10, score: {}, yen: 1, grade: 'C' }; saveState(); await at('onsen'); WORK.start(yard(), 'annai');
          await watch(() => ANNAI_RUN.now() && ANNAI_RUN.now().phase === 'ask' && document.querySelector('.wk-annai .an-opt'), 12000); await wait(300);
          const c = document.querySelector('.wk-annai .cls-card'), q = c.getBoundingClientRect(), R = (e) => e.getBoundingClientRect();
          const facs = [...c.querySelectorAll('.an-fac')], taps = [...c.querySelectorAll('button')].filter((x) => x.offsetParent).map((x) => [x.className, Math.round(R(x).width), Math.round(R(x).height)]);
          const small = [...c.querySelectorAll('.an-fac *')].filter((e) => !e.closest('svg') && e.childNodes.length && [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()) && e.tagName !== 'RT' && parseFloat(getComputedStyle(e).fontSize) < 12).map((e) => e.className + ':' + e.textContent);
          const lit = c.querySelector('.an-lit'), tn = [lit, ...lit.querySelectorAll('*')].flatMap((e) => [...e.childNodes]).find((n) => n.nodeType === 3 && n.textContent.includes('ライトアップ')), rg = document.createRange(), at0 = tn.textContent.indexOf('ライトアップ');
          rg.setStart(tn, at0); rg.setEnd(tn, at0 + 6); const whole = new Set([...rg.getClientRects()].filter((x) => x.width > 0).map((x) => Math.round(x.top))).size === 1;   // the 湯畑's ライトアップ never broken (fix round 2)
          return JSON.stringify({ side: q.left >= 0 && q.right <= innerWidth + 1, bottom: q.bottom <= innerHeight + 1, facs: facs.length, inside: facs.every((e) => R(e).left >= q.left && R(e).right <= q.right + 0.5), whole,
            parts: facs.every((e) => e.querySelector('svg') && e.querySelector('ruby') && e.querySelector('.an-hr') && e.querySelector('.an-pr') && e.querySelector('.an-rules')),
            glass: Boolean(c.querySelector('.an-glass .wk-cust .kr-face') && c.querySelector('.an-glass .wk-pat') && c.querySelector('.an-board')), opts: c.querySelectorAll('.an-opt').length,
            taps: taps.filter(([, ww, hh]) => ww < 40 || hh < 40), small: small.slice(0, 5) }); })()""")])[-1])
        out.append(r)
    for x in out:
        assert x['side'] and x['bottom'] and x['facs'] == 6 and x['inside'] and x['parts'] and x['glass'] and x['opts'] == 3 and x['whole'], out
        assert x['taps'] == [] and x['small'] == [], out
    # M-3: at 390×844 the talk line stays on screen (no scroll) after a fun tourist's answer — their after-line, the hero's reply with
    # its Chinese (a first shift: the most to show) — and after two misses on a fun question (the question shown, あかり's reason); at
    # 360×640, where the card cannot hold it all, the card scrolls itself just far enough to keep that line in sight, and is back at its
    # top for the next tourist (fix round 1's screenshots; CALM's reduced motion: the scroll is at once)
    fits = {}
    for w, h in ((390, 844), (360, 640)):
        for kind in ('future', 'ghost', 'book'):
            for case in ('right', 'miss'):
                fits[f'{w}.{kind}.{case}'] = json.loads(b.run([("metrics", (w, h)), ("nav", URL), ("wait", READY), ("eval", "(async () => { " + BEGIN + CALM + WORK4 + """ card(['S', 'S', 'S', 'S']); state.currentUnit = 'm7';
                  const m7 = TOWNEV.unitIdx('m7'); let seed = 0, fi = 0; for (let s = 1; s < 3000 && !seed; s++) { const i = ANNAI.make(m7, s).tasks.findIndex((t) => t.fun === '""" + kind + """'); if (i > 0) { seed = s; fi = i; } }
                  state.work.res['2026-11-10'] = { place: 'annai', done: fi, score: Object.fromEntries(Array.from({ length: fi }, (_, k) => [k, 0])), keep: { seed } }; saveState();
                  await at('onsen'); WORK.start(yard(), 'annai'); await watch(() => ANNAI_RUN.now() && ANNAI_RUN.now().phase === 'ask' && ANNAI_RUN.now().k === fi && document.querySelector('.wk-annai .an-opt'), 12000);
                  const t = ANNAI_RUN.now().task, pick = (i) => document.querySelector(`.wk-annai .an-opt[data-o="${i}"]`).click();
                  const hs = [...document.querySelectorAll('.wk-annai .an-opt')].map((o) => o.getBoundingClientRect().height), even = Math.max(...hs) - Math.min(...hs) < 3;   // no reply stands out by its lines (N-3)
                  if ('""" + case + """' === 'right') { pick(t.opts.findIndex((o) => o[2])); await wait(1100); }
                  else { const w = t.opts.map((o, i) => (o[2] ? -1 : i)).filter((i) => i >= 0); pick(w[0]); await wait(300); pick(w[1]); await wait(500); }
                  const c = document.querySelector('.wk-annai .cls-card'), talk = c.querySelector('.an-talk'), shown = talk.querySelector(talk.dataset.who === 'me' ? '.wk-me' : '.wk-say');
                  const cr = c.getBoundingClientRect(), top = cr.top + c.clientTop, sr = shown.getBoundingClientRect(), tall = innerHeight > 700, under = Math.max(top, c.querySelector('.wk-head').getBoundingClientRect().bottom);   // in sight: under the sticky header (task 2, ruling 17)
                  const out = { seed: Boolean(seed), even, on: sr.top >= under - 1 && sr.bottom <= top + c.clientHeight + 1 && (!tall || (c.scrollTop === 0 && c.scrollHeight <= c.clientHeight + 1)), text: shown.textContent.length > 0,
                    zh: '""" + case + """' !== 'right' || Boolean(talk.querySelector('.wk-me span')) };
                  if (!tall && '""" + case + """' === 'right') { out.scrolled = c.scrollTop > 0 || c.scrollHeight <= c.clientHeight + 1;   // scrolled, if it had to
                     await watch(() => ANNAI_RUN.now().k === fi + 1 && ANNAI_RUN.now().phase === 'ask', 12000); await wait(200); out.top = c.scrollTop === 0; }
                  return JSON.stringify(out); })()""")])[-1])
    want = {'seed': True, 'even': True, 'on': True, 'text': True, 'zh': True}
    assert all(v == (dict(want, scrolled=True, top=True) if k.startswith('360') and k.endswith('right') else want) for k, v in fits.items()), fits

# the generator (生成) has the 案内所's lines: each tourist's question in their own voice, the hero's every right reply the boards can
# make, あかり's words, the work talk of the four keepers, and the fun ones; every tourist one the town already voices (no voice left)
def test_the_generator_has_the_annai_lines(b):
    r = json.loads(ev(b, """(() => { const all = new Set(talkLines().map(([w, l]) => w + '|' + l)), m7 = TOWNEV.unitIdx('m7'), miss = [];
      for (let s = 1; s <= 40; s++) for (const u of [7, 10]) ANNAI.make(u, s).tasks.forEach((t) => { if (!all.has(t.who + '|' + t.q[0])) miss.push(t.who + '|' + t.q[0]); const ok = t.opts.find((o) => o[2])[0]; if (!all.has('hero|' + ok)) miss.push('hero|' + ok); });
      ['book', 'ghost', 'future'].forEach((k) => { const t = ANNAI.make(m7, 5, k).tasks.find((x) => x.fun === k); if (!all.has(t.who + '|' + t.q[0])) miss.push(t.who + '|' + t.q[0]); });
      const W = TOWN.WORK, A = TOWN.ONSEN.annai || {}, keepers = ['akari', 'chiyo', 'sato', 'makoto'].map((id) => [Boolean((W.hello || {})[id]), Boolean((W.yes || {})[id]), all.has(id + '|' + ((W.hello || {})[id] || [''])[0])]);
      const akari = [(A.say || {}).end, (A.say || {}).dogs].filter(Boolean).map((l) => all.has('akari|' + l[0])), book = A.fun.book;
      return JSON.stringify({ miss: [...new Set(miss)].slice(0, 6), keepers, akari, first: ((W.first || {}).annai || []).length, voices: Object.keys(CAST_VOICE).length,
        book: [book.q[0], book.after[0]], yes: (W.yes.akari || [])[1] }); })()"""))
    assert r['miss'] == [] and r['keepers'] == [[True, True, True]] * 3 + [[False, False, False]] and r['akari'] == [True, True] and r['first'] >= 1, r   # 竹内's never heard (ruling 29)
    assert r['voices'] == 69, r   # no new voice for the tourists: people the town already voices (69: the フロント's sumo wrestler, Task 7)
    assert 'ワ' in r['book'][0] and 'ハ' not in r['book'][0] and not r['book'][1].startswith('オー'), r   # マイク reads his phrasebook's sounds; no flat 「オー！」
    assert r['yes'] == '好啊，我很樂意！', r

# rulings 21, 26: 射的 (10–23) and ゆかた屋 (9–18) keep the town's own hours, TOWN.HOURS — the 案内所's boards show the same: outside
# them they are drawn shut (射的: its prizes covered, a 準備中 plate on its counter, its lanterns out; ゆかた屋: its window dark, its noren
# in, its lantern out)
# and a tap says when they open — 射的 takes nothing then (no 円, no day kept); ゆかた屋 says it rents yukata only while open
def test_shateki_and_the_yukata_shop_keep_their_hours(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + CALM + """ const out = {}, toasts = []; window.toast = (m) => toasts.push(m);
      const look = async (h) => { TOWNEV.clock = { h, day: new Date(2026, 10, 10) }; await at('yudori'); const y = yard();
        const card = y.querySelector('[data-shut="shateki-card"]'), sg = y.querySelector('.yd-sign[data-sign="shateki"]');
        return { sh: [Boolean(y.querySelector('.use-btn[data-use="shateki"]')), Boolean(y.querySelector('.use-btn[data-use="shatekishut"]')), Boolean(y.querySelector('.land [data-shut="shateki"]') && y.querySelector('.land [data-shut="shateki-plate"]'))],
          card: card ? [Math.round(card.getBoundingClientRect().height), card.getBoundingClientRect().top >= sg.getBoundingClientRect().bottom - 1, card.textContent] : null,
          yk: [Boolean(y.querySelector('.land [data-shut="yukataya"]')), Boolean(y.querySelector('.use-btn[data-use="yukataya"]')), Boolean(y.querySelector('.use-btn[data-use="yukatayashut"]'))] }; };
      out.hours = [TOWN.HOURS.shateki, TOWN.HOURS.yukataya];
      for (const h of [8, 9, 10, 17, 18, 22, 23]) out[h] = await look(h);
      TOWNEV.clock = { h: 23.5, day: new Date(2026, 10, 10) }; await at('yudori'); const bal = yenBalance(); toasts.length = 0;
      click('.yard .use-btn[data-use="shatekishut"]'); await wait(1400); out.shutSay = toasts.join('|'); out.kept = [bal - yenBalance(), (state.oneADay || {}).shateki || null, Boolean(document.querySelector('.yd-shateki'))];
      toasts.length = 0; click('.yard .use-btn[data-use="yukatayashut"]'); await wait(1400); out.ykShut = toasts.join('|');
      const th = (id) => PLACE_USE.yudori.find((x) => x.id === id); out.snd = ['shatekishut', 'yukatayashut', 'yukataya', 'junbi'].map((id) => useSound('yudori', th(id)).join());   // shut, a knock (fix round 2)
      TOWNEV.clock = { h: 8.5, day: new Date(2026, 10, 10) }; await at('yudori'); toasts.length = 0; click('.yard .use-btn[data-use="shatekishut"]'); await wait(1400); out.early = toasts.join('|');
      TOWNEV.clock = { h: 12, day: new Date(2026, 10, 10) }; await at('yudori'); toasts.length = 0; click('.yard .use-btn[data-use="yukataya"]'); await wait(1400); out.ykOpen = [Boolean(document.querySelector('.yd-yukata')), toasts.join('|')]; CLASS.close();
      return JSON.stringify(out); })()"""))
    assert r['hours'] == [[10, 23], [9, 18]], r
    for h, shut in ((9, True), (23, True), (10, False), (22, False)):
        assert r[str(h)]['sh'] == ([False, True, True] if shut else [True, False, False]), (h, r)   # 射的 shut at 9 and 23, open at 10 and 22
        assert (r[str(h)]['card'] is not None) == shut, (h, r)   # and its 準備中 card hung under its sign while shut (fix round 2)
        if shut:
            assert r[str(h)]['card'][0] >= 20 and r[str(h)]['card'][1] and r[str(h)]['card'][2] == '準備中', (h, r)
    for h, shut in ((8, True), (18, True), (9, False), (17, False)):
        assert r[str(h)]['yk'] == [shut, not shut, shut], (h, r)   # ゆかた屋 shut at 8 and 18, open at 9 and 17: drawn so, and its tap
    assert r['snd'] == ['knock', 'knock', 'cloth', 'knock'], r   # a shut shop knocks, as ゆのはな堂 does
    assert '射的' in r['shutSay'] and '明天' in r['shutSay'] and '10:00' in r['shutSay'] and r['kept'] == [0, None, False], r   # nothing taken
    assert '10:00' in r['early'] and '明天' not in r['early'], r
    assert 'ゆかた屋' in r['ykShut'] and '9:00' in r['ykShut'] and '可以租' not in r['ykShut'], r
    assert r['ykOpen'][0] and '可以租' not in r['ykOpen'][1], r   # open: its card, a 浴衣 to buy (2026-11-25) — no rental promised that there is none of

# M-2 (spec §5): a tourist who gives up waiting goes — the question shown whole in their bubble, their leaving line popping up beside it
# (as their mood lines do), never over it (N-4, fix round 2: over the face while the bubble is open; at 390×844 and 360×640); the right
# reply lit; the task lost
def test_a_tourist_who_leaves_shows_the_question(b):
    out = {}
    for w, h in ((390, 844), (360, 640)):
        out[w] = json.loads(b.run([("metrics", (w, h)), ("nav", URL), ("wait", READY), ("eval", "(async () => { " + BEGIN + CALM + WORK4 + """ card(['S', 'S', 'S', 'S']); state.currentUnit = 'm7';
          state.work.res['2026-10-20'] = { place: 'annai', done: 10, score: {}, yen: 1, grade: 'C' }; saveState(); await at('onsen'); WORK.start(yard(), 'annai');
          await watch(() => ANNAI_RUN.now() && ANNAI_RUN.now().phase === 'ask' && document.querySelector('.wk-annai .an-opt'), 12000); const t = ANNAI_RUN.now().task; JOBS.pat.scale = 0.02;
          await watch(() => ANNAI_RUN.now().phase === 'done', 8000); await wait(120); JOBS.pat.scale = 1;
          const c = document.querySelector('.wk-annai .wk-cust'), bub = c.querySelector('.wk-bub').textContent, g = c.querySelector('.wk-grr'), lit = document.querySelector('.wk-annai .an-opt.wk-hint');
          const Q = c.querySelector('.wk-bub b').getBoundingClientRect(), G = g ? g.getBoundingClientRect() : null;
          const r = { q: bub.includes(t.q[1]), over: /いいです/.test(bub), grr: Boolean(g) && /いいです/.test(g.textContent), lit: Boolean(lit) && Number(lit.dataset.o) === t.opts.findIndex((o) => o[2]), score: WORK.today().score[0],
            clear: Boolean(G) && (G.right <= Q.left + 1 || G.left >= Q.right - 1 || G.bottom <= Q.top + 1 || G.top >= Q.bottom - 1) }; CLASS.close(); return JSON.stringify(r); })()""")])[-1])
    assert all(r == {'q': True, 'over': False, 'grr': True, 'lit': True, 'score': 3, 'clear': True} for r in out.values()), out

# M-9: a time as said, for every hour (Tasks 5–7 use it too): 午前 before noon, 昼の十二時 at noon, 午後 to 16, 夕方 17–18, 夜 from 19,
# 夜中の十二時 at midnight (0 and 24); its Chinese alike
def test_time_marks_read_every_hour(b):
    r = json.loads(ev(b, "JSON.stringify([0, 6, 9, 12, 13, 16, 17, 18, 19, 21, 23, 24].map((h) => [ANNAI.timeMark(h), ANNAI.timeZh(h)]))"))
    assert [x[0] for x in r] == ['{夜中|よなか|半夜}の {十二時|じゅうにじ}', '{午前|ごぜん}{六時|ろくじ}', '{午前|ごぜん}{九時|くじ}', '{昼|ひる}の {十二時|じゅうにじ}', '{午後|ごご}{一時|いちじ}', '{午後|ごご}{四時|よじ}',
        '{夕方|ゆうがた}{五時|ごじ}', '{夕方|ゆうがた}{六時|ろくじ}', '{夜|よる}{七時|しちじ}', '{夜|よる}{九時|くじ}', '{夜|よる}{十一時|じゅういちじ}', '{夜中|よなか|半夜}の {十二時|じゅうにじ}'], r
    assert [x[1] for x in r] == ['半夜 12 點', '上午 6 點', '上午 9 點', '中午 12 點', '下午 1 點', '下午 4 點', '傍晚 5 點', '傍晚 6 點', '晚上 7 點', '晚上 9 點', '晚上 11 點', '半夜 12 點'], r

# M-10 (spec §4): a ride up to 湯の花 with あかり at her window: off the train at 湯の花駅前, she greets once (ようこそ, in her voice; the
# place kept as arrived); the next ride up, no more
def test_arriving_by_train_akari_greets_once(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + """ const said = []; window.speakAs = (w, l) => { said.push(w + ':' + l); return Promise.resolve(); };
      const ride = async () => { RIDE.keep({ from: 'minato', to: 'yunohana', fare: 420, day: todayStr() }); await at('platform'); RIDE.board(yard(), 1); const g = greeting(); await arrive('yunohana', '#/onsen'); await g; };
      await ride(); const once = said.filter((x) => x.startsWith('akari:')), first = [location.hash, state.town.arrived, Boolean(document.querySelector('.cls'))];
      await ride(); return JSON.stringify({ once, first, again: said.filter((x) => x.startsWith('akari:')).length }); })()"""))
    assert r['first'] == ['#/onsen', {'onsen': 1}, False] and r['once'] == ['akari:ようこそ、{湯の花|ゆのはな}{温泉|おんせん}へ！'] and r['again'] == 1, r

# ---- Task 5: 仲居 at 旅館「花月」 with 千代 (spec §5, §5.2, §3.5) ----
# nk(): the room as the card has it now (NAKAI_RUN.now(): { k, task, room, st, phase, seed, busy }); solve(): the right thing done
# for it — the right reply picked, or the thing the instruction names tapped (a futon or a cushion: its next empty place, never the
# cat's); work(to): solved till task `to`; shiftAt(seed, done, score): today's 仲居 record set to begin there (a shift done before:
# not the job's first); seedWhere(f): the first seed whose shift is so
NK = """const nk = () => NAKAI_RUN.now(), m8 = TOWNEV.unitIdx('m8');
  const opt = (good) => { const n = nk(), i = n.task.opts.findIndex((o) => (good ? o[2] : !o[2])); return document.querySelector(`.wk-nakai .nk-opt[data-o="${i}"]`); };
  const empty = (n, key) => n.st[key].findIndex((x, j) => !x && !(key === 'futon' && j === 0 && n.st.cat));
  const ready = () => { const n = nk(); return Boolean(n) && (n.phase === 'ask' || n.phase === 'do') && !n.busy; };
  async function solve() { const n = nk(); if (!n || n.busy) return false;
    if (n.phase === 'ask') { const b = opt(true); if (b && !b.disabled) b.click(); return true; }
    if (n.phase === 'do') { const [key] = n.task.target; if (Array.isArray(n.st[key])) { const i = empty(n, key); NAKAI.tap(key, i >= 0 ? i : 0); } else NAKAI.tap(key); return true; }
    return false; }
  const before = (to) => Boolean(nk()) && nk().k < to;
  async function work(to) { let at = -1, since = Date.now(); while (before(to) && Date.now() - since < 20000) { await watch(() => ready() || !before(to), 2000); if (!before(to)) break; if (nk().k !== at) { at = nk().k; since = Date.now(); } await solve(); await wait(80); } }   // never past `to`; gives up after 20 s with no task done
  const shiftAt = (seed, done = 0, score = {}) => { state.work.res['2026-10-20'] = { place: 'nakai', done: 16, score: {}, yen: 1, grade: 'C' }; state.work.res[dateStr(TOWNEV.today())] = { place: 'nakai', done, score, keep: { seed } }; saveState(); };
  const seedWhere = (f, from = 1) => { for (let s = from; s < 6000; s++) { if (f(NAKAI.make(m8, s))) return s; } return 0; };"""

# spec §5.2 (做), dispatch ruling 3: 千代's instruction heard first — 「お客さまが 来る 前に、エアコンを つけて おいて ください。」, its words
# not shown yet — tapping the light is a miss: it changes, she says 「それは ちがいますよ。」 and it goes back as it was; tapping the
# air conditioner turns it on and the task is right with that one miss, its words shown
def test_nakai_do_by_tapping_the_right_thing(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + CALM + WORK4 + NK + """ card(['S', 'S', 'S', 'S']); state.currentUnit = 'm8';
      const said = []; window.speakAs = (w, l) => { said.push(w + ':' + l); return Promise.resolve(); };
      const seed = seedWhere((sh) => { const t = sh.tasks[1], r0 = sh.rooms[0]; return t.kind === 'do' && t.target[0] === 'ac' && /エアコン/.test(t.line[0]) && r0.tasks.every((x) => x.key !== 'light' && !(x.target && x.target[0] === 'light')); });
      shiftAt(seed); await at('ryokan'); WORK.start(yard(), 'nakai');
      await watch(() => nk() && nk().k === 0 && ready(), 12000); await solve();
      await watch(() => nk() && nk().k === 1 && ready(), 12000); await wait(200);
      const out = { seed, line: nk().task.line[0], dots: Boolean(document.querySelector('.wk-nakai .nk-bub .nk-dots')) };
      const l0 = nk().st.light; said.length = 0;
      NAKAI.tap('light'); await wait(120); out.changed = nk().st.light !== l0;
      await watch(() => nk().st.light === l0 && !nk().busy, 3000); out.back = nk().st.light === l0; await wait(100); out.word = said.filter((x) => x.startsWith('chiyo:'));
      NAKAI.tap('ac'); await watch(() => (WORK.today().score || {})[1] !== undefined, 4000);
      out.score = WORK.today().score[1]; out.ac = Boolean(nk() && nk().st.ac); out.shown = document.querySelector('.wk-nakai .nk-bub').textContent.includes('エアコン');
      CLASS.close(); return JSON.stringify(out); })()"""))
    assert r['seed'] and 'エアコン' in r['line'] and 'おいて' in r['line'] and r['dots'], r   # heard first
    assert r['changed'] and r['back'] and r['word'] == ['chiyo:それは ちがいますよ。'], r   # a miss: it changes, her word, back as it was
    assert r['score'] == 1 and r['ac'] and r['shown'], r   # the right thing: on, with its one miss; the words shown

# dispatch ruling 1, spec §5.2 (確認): 千代 asks what the room is like now, and the right reply is what it is — 「お茶は 用意して ありますか。」
# with the tea things on the 座卓: 「はい、用意して あります。」; without: 「いいえ、まだ 用意して いません。」. No 他動詞 + ている is ever
# offered (「用意して います」「つけて います」: a state one keeps — a second fair answer); every check has one right reply and a reason for
# each wrong one; in a shift the reply that is right is the one the room drawn on the card says
def test_nakai_checks_follow_the_room(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + CALM + WORK4 + NK + """ card(['S', 'S', 'S', 'S']); state.currentUnit = 'm8'; const out = {};
      window.speakAs = () => Promise.resolve(); const right = (c) => c.opts.find((o) => o[2])[0];
      out.tea = [right(NAKAI.check('tea', true)), right(NAKAI.check('tea', false))];
      const all = [], bad = [];
      NAKAI.CHECKS.forEach((k) => [true, false].forEach((on) => { const c = NAKAI.check(k, on); all.push(c); if (c.opts.filter((o) => o[2]).length !== 1 || c.opts.length < 2 || c.opts.length > 3 || c.opts.some((o) => !o[1])) bad.push(k + on); }));
      for (let s = 1; s <= 300; s++) NAKAI.make(m8, s).tasks.forEach((t) => { if (t.kind !== 'do') all.push(t); });
      const TE_IRU = /(\\{用意\\|ようい[^}]*\\}して|つけて|\\{開\\|あ[^}]*\\}けて|\\{閉\\|し[^}]*\\}めて|\\{消\\|け[^}]*\\}して|\\{敷\\|し[^}]*\\}いて|\\{置\\|お[^}]*\\}いて|\\{飾\\|かざ[^}]*\\}って|\\{並\\|なら[^}]*\\}べて) います/;
      out.teiru = [...new Set(all.flatMap((t) => t.opts.map((o) => o[0])).filter((j) => TE_IRU.test(j)))];
      out.bad = bad; out.keys = NAKAI.CHECKS;
      const live = async (on) => { const seed = seedWhere((sh) => sh.tasks[0].key === 'tea' && Boolean(sh.rooms[0].start.tea) === on); shiftAt(seed); await at('ryokan'); WORK.start(yard(), 'nakai');
        await watch(() => nk() && nk().k === 0 && ready(), 12000); await wait(150);
        const g = document.querySelector('.wk-nakai .nk-art [data-k="tea"]'), drawn = Boolean(g) && g.children.length > 1, lit = right(nk().task), btn = opt(true);
        const said = btn ? btn.textContent.replace(/\\s/g, '') : ''; CLASS.close(); await wait(200); return [drawn, lit, said]; };
      out.live = [await live(true), await live(false)];
      return JSON.stringify(out); })()"""))
    assert r['tea'] == ['はい、{用意|ようい}して あります。', 'いいえ、まだ {用意|ようい}して いません。'], r
    assert r['teiru'] == [] and r['bad'] == [] and 'tea' in r['keys'] and len(r['keys']) >= 6, r
    assert r['live'][0][:2] == [True, 'はい、{用意|ようい}して あります。'] and r['live'][1][:2] == [False, 'いいえ、まだ {用意|ようい}して いません。'], r
    assert 'ようい' in r['live'][0][2] and 'あります' in r['live'][0][2] and 'いません' in r['live'][1][2], r   # the button that is right says it

# dispatch ruling 1, spec §5.2 (客人): a guest comes in and remarks on the room — 「あれ、窓が 開いて いますね。」 — and the hero says what
# was done beforehand: 「はい、開けて おきました。閉めましょうか。」. A 自動詞 never takes ておく: no right reply ever has one (あいて
# おきました is a wrong one — in kana: with the furigana hidden 開いて reads ひらいて, a fair transitive (the final Japanese review, 3) —
# offered beside 閉めて おきました — the other way, the wrong fact); every guest has two or three replies, one
# right, each wrong one with its reason, in a voice the town has; what they say is true of the room as it stands when they come in
def test_nakai_guest_reply_never_jidoushi_with_teoku(b):
    r = json.loads(ev(b, """(() => { const m8 = TOWNEV.unitIdx('m8'), JI = /(\\{開\\|あ\\}いて|あいて|ついて|\\{閉\\|し\\}まって|\\{消\\|き\\}えて|\\{並\\|なら\\}んで) おき/, bad = [], gs = [];
      for (let s = 1; s <= 300; s++) NAKAI.make(m8, s).tasks.filter((t) => t.kind === 'guest').forEach((t) => gs.push(t));
      NAKAI.GUESTS.forEach((key) => gs.push(NAKAI.guest(NAKAI.readyState(key), key)));
      gs.forEach((g) => { const rt = g.opts.filter((o) => o[2]); if (rt.length !== 1 || g.opts.length < 2 || g.opts.length > 3 || g.opts.some((o) => !o[1]) || !g.who || !CAST_VOICE[g.who] || !g.after) bad.push(g.key); else if (JI.test(rt[0][0])) bad.push('ji:' + rt[0][0]); });
      const win = NAKAI.guest(NAKAI.readyState('window'), 'window'), fall = NAKAI.guest(NAKAI.readyState('tea'), 'window');
      return JSON.stringify({ n: gs.length, bad: bad.slice(0, 6), win: [win.line[0], win.opts.find((o) => o[2])[0], win.opts.filter((o) => !o[2]).map((o) => o[0])], fall: fall.key, keys: NAKAI.GUESTS }); })()"""))
    assert r['n'] > 300 and r['bad'] == [] and len(r['keys']) >= 6, r
    w = r['win']
    assert w[0] == 'あれ、{窓|まど}が {開|あ}いて いますね。' and w[1] == 'はい、あけて おきました。{閉|し}めましょうか。', r
    assert any('あいて おきました' in x for x in w[2]) and any('{閉|し}めて おきました' in x for x in w[2]), r
    assert r['fall'] == 'tea', r   # the window shut after all: they remark on what is so (the tea set out)

# dispatch ruling 4, spec §5.2: the 「お客様 到着まで」 countdown (NAKAI.speed: the tests' hook, 30 times as fast) runs out with the first
# room's instructions not done — each of them failed (3), the late arrival said, the guest in; red for its last 10 s, with 千代's
# 「いそいで！」
def test_nakai_clock_fails_what_is_left(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + CALM + WORK4 + NK + """ card(['S', 'S', 'S', 'S']); state.currentUnit = 'm8';
      const said = []; window.speakAs = (w, l) => { said.push(w + ':' + l); return Promise.resolve(); };
      const seed = seedWhere(() => true); shiftAt(seed); const sh = NAKAI.make(m8, seed), dos = sh.tasks.filter((t) => t.room === 0 && t.kind === 'do').map((t) => t.k), g0 = sh.tasks.find((t) => t.room === 0 && t.kind === 'guest').k;
      NAKAI.speed = 30; await at('ryokan'); WORK.start(yard(), 'nakai');
      await watch(() => nk() && nk().k === 0 && ready(), 12000); await solve();
      let red = false; await watch(() => { const d = document.querySelector('.wk-nakai .nk-dep'); if (d && d.classList.contains('late')) red = true; return nk() && nk().k === g0; }, 15000);
      const sc = WORK.today().score || {}; NAKAI.speed = 1; await watch(() => ready(), 6000);
      const wants = sh.rooms[0].tasks.filter((t) => t.kind === 'do').map((t) => t.target), g = nk().task;   // the late guest: what they say is so (M-8)
      const out = { dos: dos.map((k) => sc[k]), at: Boolean(nk()) && nk().k === g0, red, hurry: said.includes('chiyo:いそいで！'), late: said.some((x) => /もう お\\{客\\|きゃく\\}さまが/.test(x)),
        true: Boolean(g && g.key) && NAKAI.isReady(nk().st, g.key) && !wants.some(([k, v]) => k === g.key && typeof v === 'boolean' && v !== NAKAI.READY[k]) };
      CLASS.close(); return JSON.stringify(out); })()"""))
    assert r['dos'] and all(x == 3 for x in r['dos']), r   # every instruction left undone: failed
    assert r['at'] and r['red'] and r['hurry'] and r['late'] and r['true'], r   # the guest in, saying what is so of the room as it stands

# spec §5.2, Review Focus 2: a shift is three rooms — 桜, 菊 and 松 (the same room, its scroll and flowers its own) — each with 2–4 things
# to do (ten in all), one check first and one guest last: 16 tasks. The first shift: 千代's first word, then up to 桜の間 with her (she
# stands there while the card is up, in the lobby again after); shut after three tasks and taken up again it goes on at the fourth on
# the same seed with the room as it was left, nothing counted twice; all right at once: S, 220 + 50 and ベテラン's 4%
def test_nakai_three_rooms_ten_tasks_and_resume(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + CALM + WORK4 + NK + """ card(['S', 'S', 'S', 'S']); state.currentUnit = 'm8'; saveState(); const out = {}, bad = [];
      window.speakAs = () => Promise.resolve();
      for (let s = 1; s <= 200; s++) for (const u of [m8, TOWNEV.unitIdx('m15')]) { const sh = NAKAI.make(u, s), dos = sh.rooms.map((rm) => rm.tasks.filter((t) => t.kind === 'do').length);
        if (sh.rooms.map((rm) => rm.name).join() !== '桜,菊,松' || sh.rooms.map((rm) => rm.start.room).join() !== 'sakura,kiku,matsu' || sh.tasks.length !== 16 || dos.reduce((a, n) => a + n, 0) !== 10 || dos.some((n) => n < 2 || n > 4)
          || sh.rooms.some((rm) => rm.tasks[0].kind !== 'check' || rm.tasks[rm.tasks.length - 1].kind !== 'guest' || rm.tasks.filter((t) => t.kind === 'check').length !== 1 || rm.tasks.filter((t) => t.kind === 'guest').length !== 1)
          || sh.tasks.some((t, k) => t.k !== k)) bad.push(s); }
      out.bad = bad.slice(0, 5); out.n = WORK.PLACES.nakai.n;
      WORK.PLACES.nakai.n = 13; const s13 = NAKAI.make(m8, 5); WORK.PLACES.nakai.n = 16;   // the count from one source: WORK's n (M-6)
      out.n13 = [s13.tasks.length, s13.rooms.map((rm) => rm.tasks.filter((t) => t.kind === 'do').length).reduce((a, x) => a + x, 0)];
      out.dice = ['rng', 'pickR', 'shuffleR'].every((f) => typeof JOBS[f] === 'function') && NAKAI.rng === JOBS.rng;
      const rules = () => { WORK.intro(yard(), 'nakai'); const t = (document.querySelector('.wk-rules .wk-pay') || {}).textContent || ''; CLASS.close(); return t; };   // the rules card says the shift's length from n too (fix round 2)
      out.rules = [rules()]; WORK.PLACES.nakai.n = 13; out.rules.push(rules()); WORK.PLACES.nakai.n = 16;
      await at('ryokan'); WORK.start(yard(), 'nakai');
      for (let i = 0; i < 40 && !document.querySelector('.wk-nakai'); i++) { click('.talk'); await wait(150); }   // 千代's first word, tapped through
      await watch(() => location.hash === '#/washitsu' && yard() && yard().querySelector('.npc-chiyo'), 6000);
      out.up = [location.hash, Boolean(yard() && yard().querySelector('.npc-chiyo')), (TOWNEV.whereIs('chiyo', 10, TOWNEV.today()) || {}).place];
      await work(3); await watch(() => Object.keys(WORK.today().score || {}).length >= 3 && nk() && nk().k === 3, 6000); await wait(300);
      const seed = nk().seed, st3 = JSON.stringify(nk().st); CLASS.close(); await wait(300);
      out.down = (TOWNEV.whereIs('chiyo', 10, TOWNEV.today()) || {}).place;
      WORK.start(yard(), 'nakai'); await watch(() => nk() && nk().k === 3 && ready(), 12000);
      out.resume = [nk().k, nk().seed === seed, JSON.stringify(nk().st) === st3, Object.keys(WORK.today().score).join()];
      await work(16); await watch(() => WORK.today() && WORK.today().yen !== undefined, 30000); const x = WORK.today();
      out.paid = [x.grade, x.yen, Object.keys(x.score).length, Object.values(x.score).every((m) => m === 0)];
      await watch(() => document.querySelector('.wk-result'), 15000); out.result = Boolean(document.querySelector('.wk-result')); document.querySelectorAll('.wk-result').forEach((e) => e.remove()); CLASS.close();
      return JSON.stringify(out); })()"""))
    assert r['bad'] == [] and r['n'] == 16 and r['n13'] == [13, 7] and r['dice'], r   # make()'s count is WORK's n; the seeded dice are JOBS'
    assert '3 間房：10 件要準備的事、3 次確認、3 位客人' in r['rules'][0] and '3 間房：7 件要準備的事' in r['rules'][1], r['rules']
    assert r['up'] == ['#/washitsu', True, 'washitsu'] and r['down'] == 'ryokan', r   # in 桜の間 with her while the card is up
    assert r['resume'] == [3, True, True, '0,1,2'], r   # at the fourth, the same room, nothing counted twice
    assert r['paid'] == ['S', 281, 16, True] and r['result'], r

# Review Focus 5 (ruling 27): each line said to its end — the hero's reply to 千代's check, then her instruction; a wrong tap's word after
# a line still being said; 「いらっしゃいました」 then the guest's remark, the hero's reply, the guest's word, the next room's; and on
# a shift taken up at its last guest, the guest's word and 千代's goodbye both said before the results open
def test_nakai_says_each_line_to_its_end(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + CALM + WORK4 + NK + SAYS + """ card(['S', 'S', 'S', 'S']); state.currentUnit = 'm8'; const out = {};
      const seed = seedWhere((sh) => sh.rooms[0].tasks.length <= 5); shiftAt(seed); const g0 = NAKAI.make(m8, seed).rooms[0].tasks.slice(-1)[0].k;
      await at('ryokan'); WORK.start(yard(), 'nakai');
      await watch(() => nk() && nk().k === 0 && ready(), 15000); await solve();   // the check: the hero's reply, then the instruction after it
      await watch(() => nk() && nk().phase === 'do' && ready() && talking, 15000);   // her instruction being said
      const wrong = ['window', 'shoji', 'light', 'ac', 'tv', 'tea', 'yukata', 'flower'].find((k) => k !== nk().task.target[0]);
      NAKAI.tap(wrong); await wait(80); NAKAI.tap(wrong);   // a wrong tap while she speaks (the second while it goes back: nothing)
      await work(g0 + 1); await watch(() => nk() && nk().k === g0 + 1 && ready(), 30000); await hush();   // the next room's question asked: nothing more is said till a reply is picked
      out.miss = __log.filter((l) => l === 'chiyo:それは ちがいますよ。').length;
      const row = document.querySelector('.wk-nakai .nk-task'); out.row = [getComputedStyle(row).opacity, row.querySelector('.nk-face').dataset.who];   // the guest gone, the next room's speaker in sight
      CLASS.close();
      TOWNEV.clock = { h: 10, day: new Date(2026, 10, 11) }; shiftAt(seed, 15, Object.fromEntries(Array.from({ length: 15 }, (_, k) => [k, 0])));
      await at('ryokan'); WORK.start(yard(), 'nakai'); await work(16);
      await watch(() => document.querySelector('.wk-result'), 30000); out.end = [__log.slice(-1)[0], talking, Boolean(document.querySelector('.wk-result'))];
      out.cut = __cut; document.querySelectorAll('.wk-result').forEach((e) => e.remove()); return JSON.stringify(out); })()"""))
    assert r['cut'] == [] and r['miss'] == 1, r
    assert r['row'] == ['1', 'chiyo'], r   # the first room's guest gone: 千代 asking in the next, in sight
    assert r['end'][0].startswith('chiyo:') and r['end'][1] is None and r['end'][2], r   # her goodbye the last line, said whole before the results

# dispatch ruling 3 (spec §5.2's fun ones): the inn's cat asleep where a futon is to go — a tap on it, or anywhere in that futon's place
# while it sleeps there, and it is off with ニャ (its sound, the word popping up): never a miss; then the place is the futon's. Now and
# then 千代 finds a thing already seen to — 「あら、窓は もう 開けて ありますね。」 — the thing drawn so
def test_nakai_the_cat_and_chiyo_herself(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + CALM + WORK4 + NK + """ card(['S', 'S', 'S', 'S']); state.currentUnit = 'm8'; const out = {};
      const said = [], played = [], realP = SND.play; window.speakAs = (w, l) => { said.push(w + ':' + l); return Promise.resolve(); }; SND.play = (n, o) => { played.push(n); };
      const seed = seedWhere((sh) => sh.rooms[0].cat && sh.tasks[1].kind === 'do' && sh.tasks[1].target[0] === 'futon' && sh.tasks[1].target[1] === 3); shiftAt(seed);
      await at('ryokan'); WORK.start(yard(), 'nakai'); await watch(() => nk() && nk().k === 0 && ready(), 12000); await solve();
      await watch(() => nk() && nk().k === 1 && ready(), 12000); await wait(200);
      out.cat0 = [Boolean(nk().st.cat), Boolean(document.querySelector('.wk-nakai .nk-art [data-k="cat"]'))]; said.length = 0;
      NAKAI.tap('futon', 0); await wait(100); out.nya = [document.querySelector('.wk-nakai').textContent.includes('ニャ'), played.includes('meow')];
      await watch(() => !nk().st.cat && !document.querySelector('.wk-nakai .nk-art [data-k="cat"]'), 3000);
      out.after = [Boolean(nk().st.cat), Boolean(nk().st.futon[0]), said.filter((x) => x === 'chiyo:それは ちがいますよ。').length];
      NAKAI.tap('futon', 0); await wait(200); out.laid = [Boolean(nk().st.futon[0]), played.includes('flop')];
      await work(2); out.score = WORK.today().score[1]; CLASS.close(); await wait(200);
      const s2 = seedWhere((sh) => sh.rooms[0].self === 'window' && sh.rooms[0].tasks.filter((t) => t.kind === 'do').length >= 2);
      TOWNEV.clock = { h: 10, day: new Date(2026, 10, 11) }; shiftAt(s2); said.length = 0;
      await at('ryokan'); WORK.start(yard(), 'nakai'); await watch(() => nk() && nk().k === 0 && ready(), 12000);
      out.open0 = Boolean(nk().st.window); await work(2); await watch(() => said.some((x) => x.startsWith('chiyo:あら、')), 8000);
      out.self = [s2, said.find((x) => x.startsWith('chiyo:あら、')) || '', Boolean(nk().st.window)]; CLASS.close(); SND.play = realP;
      return JSON.stringify(out); })()"""))
    assert r['cat0'] == [True, True], r
    assert r['nya'] == [True, True] and r['after'] == [False, False, 0], r   # off with ニャ, not a miss, nothing laid by that tap
    assert r['laid'] == [True, True] and r['score'] == 0, r   # then the place is the futon's; the task right at once
    assert r['self'][0] and r['open0'] and r['self'][2] and '{窓|まど}は もう {開|あ}けて ありますね' in r['self'][1], r

# the card (spec §5.2, §9): 桜の間 front-on, every thing in it 40 px or more to tap on a 360-px phone, the countdown at its top right; on
# 360×640 and 390×844 it stays inside the screen — at a check with its replies, and while things are done (the art and 千代's bubble
# in sight, nothing to scroll)
def test_the_nakai_card_fits_a_phone(b):
    out = {}
    for w, h in ((360, 640), (390, 844)):
        out[w] = json.loads(b.run([("metrics", (w, h)), ("nav", URL), ("wait", READY), ("eval", "(async () => { " + BEGIN + CALM + WORK4 + NK + """ card(['S', 'S', 'S', 'S']); state.currentUnit = 'm8';
          window.speakAs = () => Promise.resolve(); const seed = seedWhere((sh) => sh.tasks[0].opts.length === 3); shiftAt(seed); await at('ryokan'); WORK.start(yard(), 'nakai');
          await watch(() => nk() && nk().k === 0 && ready(), 12000); await wait(400);
          const c = document.querySelector('.wk-nakai .cls-card'), q = c.getBoundingClientRect(), R = (e) => e.getBoundingClientRect();
          const btns = [...c.querySelectorAll('button')].filter((x) => x.offsetParent).map((x) => [x.className, Math.round(R(x).width), Math.round(R(x).height)]).filter(([, ww, hh]) => ww < 40 || hh < 40);
          const ask = { inside: q.left >= 0 && q.right <= innerWidth + 1 && q.bottom <= innerHeight + 1, opts: [...c.querySelectorAll('.nk-opt')].every((o) => R(o).bottom <= q.bottom + 1 && R(o).top >= q.top - 1), art: R(c.querySelector('.nk-art')).top >= q.top - 1 };
          await solve(); await watch(() => nk() && nk().phase === 'do' && ready(), 12000); await wait(400);
          const small = [...c.querySelectorAll('.nk-art [data-k]')].map((g) => [g.dataset.k + (g.dataset.i || ''), Math.round(R(g).width), Math.round(R(g).height)]).filter(([, ww, hh]) => ww < 40 || hh < 40);   // things are tapped while one is to be done
          const dep = R(c.querySelector('.nk-dep')), art = R(c.querySelector('.nk-art'));
          const a2 = R(c.querySelector('.nk-art')), t2 = R(c.querySelector('.nk-bub')), d = { bub: t2.bottom <= q.bottom + 1 && t2.top >= q.top - 1, art: a2.top >= q.top - 1 && a2.bottom <= q.bottom + 1, scroll: c.scrollHeight <= c.clientHeight + 1 };
          CLASS.close(); return JSON.stringify({ small, btns, top: dep.bottom <= art.top + 1 && dep.right >= q.right - 26 && dep.left > q.left + q.width * 0.25, ask, d }); })()""")])[-1])
    for w, x in out.items():
        assert x['small'] == [] and x['btns'] == [] and x['top'], (w, out)
        assert x['ask'] == {'inside': True, 'opts': True, 'art': True}, (w, out)   # the room in sight with the replies
        assert x['d'] == {'bub': True, 'art': True, 'scroll': True}, (w, out)
    # M-2 (fix round 1): a guest with three replies of two lines (the window's, the shoji's, the AC's, the light's), on 360×640 and
    # 390×844 — asking, after a wrong reply (千代's reason in the talk row) and after the right one (the hero's reply with its 中文 on a
    # first shift, the guest's word in the bubble): the card never scrolls, the bubble, the replies and the talk row all in sight
    gfit = {}
    for w, h in ((360, 640), (390, 844)):
        gfit[w] = json.loads(b.run([("metrics", (w, h)), ("nav", URL), ("wait", READY), ("eval", "(async () => { " + BEGIN + CALM + WORK4 + NK + """ card(['S', 'S', 'S', 'S']); state.currentUnit = 'm8';
          window.speakAs = () => Promise.resolve(); const seed = seedWhere((sh) => ['window', 'shoji', 'ac', 'light'].includes(sh.rooms[0].tasks.slice(-1)[0].key)), g0 = NAKAI.make(m8, seed).rooms[0].tasks.slice(-1)[0].k;
          state.work.res[dateStr(TOWNEV.today())] = { place: 'nakai', done: g0, score: Object.fromEntries(Array.from({ length: g0 }, (_, k) => [k, 0])), keep: { seed } }; saveState();   // a first shift: the hero's 中文 shown
          await at('ryokan'); WORK.start(yard(), 'nakai'); await watch(() => nk() && nk().k === g0 && ready(), 12000); await wait(400);
          const c = document.querySelector('.wk-nakai .cls-card'), R = (e) => e.getBoundingClientRect();
          const fit = () => { const q = R(c), top = Math.max(q.top + c.clientTop, R(c.querySelector('.wk-head')).bottom), bot = q.top + c.clientTop + c.clientHeight, inv = (e) => Boolean(e) && R(e).top >= top - 1 && R(e).bottom <= bot + 1;   // in sight: under the sticky header (task 2, ruling 17)
            return [c.scrollHeight <= c.clientHeight + 1, [...c.querySelectorAll('.nk-opt')].every(inv), inv(c.querySelector('.nk-talk')), inv(c.querySelector('.nk-bub'))]; };
          const out = { n: c.querySelectorAll('.nk-opt').length, tall: Math.max(...[...c.querySelectorAll('.nk-opt')].map((o) => Math.round(R(o).height))), ask: fit() };
          opt(false).click(); await wait(500); out.wrong = fit();
          opt(true).click(); await watch(() => c.querySelector('.nk-talk .wk-say.nk-me span'), 4000); await wait(600); out.right = fit();
          CLASS.close(); return JSON.stringify(out); })()""")])[-1])
    for w, x in gfit.items():
        assert x['n'] == 3 and x['ask'] == x['wrong'] == x['right'] == [True, True, True, True], (w, gfit)
    # fix round 2: on a desktop (1280×800) the room stays large when a guest comes in (more than 300 px tall at a guest as at a check) —
    # its height may differ between the two (ruling 8, fix round 2 of the test.2 feedback: the room takes what the task leaves it, one
    # height for the whole task)
    big = json.loads(b.run([("metrics", (1280, 800)), ("nav", URL), ("wait", READY), ("eval", "(async () => { " + BEGIN + CALM + WORK4 + NK + """ card(['S', 'S', 'S', 'S']); state.currentUnit = 'm8';
      window.speakAs = () => Promise.resolve(); const seed = seedWhere((sh) => ['window', 'shoji', 'ac', 'light'].includes(sh.rooms[0].tasks.slice(-1)[0].key)), g0 = NAKAI.make(m8, seed).rooms[0].tasks.slice(-1)[0].k;
      shiftAt(seed, g0, Object.fromEntries(Array.from({ length: g0 }, (_, k) => [k, 0]))); await at('ryokan'); WORK.start(yard(), 'nakai');
      const h = () => Math.round(document.querySelector('.wk-nakai .nk-art svg').getBoundingClientRect().height);
      await watch(() => nk() && nk().k === g0 && ready(), 12000); await wait(300); const guest = h();
      await solve(); await watch(() => nk() && nk().k === g0 + 1 && ready(), 12000); await wait(300); const check = h();
      CLASS.close(); return JSON.stringify({ guest, check }); })()""")])[-1])
    assert big['guest'] > 300 and big['check'] > 300, big   # at a guest as at a check

# task 2, ruling 18 (review-4's Minor 3): a room's check is laid out as 千代 comes into the room, before she names it (fix round 3) — its
# replies in their places, not yet to be tapped and their words not yet shown (……, as the おみやげ屋's) till she asks; then their words, and
# nothing moving as they come in: the shift's first room (after her start word) and a later one, at 390×664
def test_nakai_check_replies_wait_for_her_question(b):
    r = json.loads(b.run([("metrics", (390, 664)), ("nav", URL), ("wait", READY), ("eval", "(async () => { " + BEGIN + CALM + WORK4 + NK + """ card(['S', 'S', 'S', 'S']); state.currentUnit = 'm8';
      window.speakAs = () => new Promise((ok) => setTimeout(ok, 800)); const sh = NAKAI.make(m8, 3), k2 = sh.tasks.findIndex((t, i) => i > 0 && t.kind === 'check');
      const look = () => { const bs = [...document.querySelectorAll('.wk-nakai .nk-opt')];
        return { phase: nk().phase, n: bs.length, later: bs.filter((x) => x.classList.contains('nk-later') && x.disabled && getComputedStyle(x.querySelector('span')).visibility === 'hidden' && getComputedStyle(x, '::after').content.includes('……')).length,
          words: bs.filter((x) => !x.classList.contains('nk-later') && !x.disabled && getComputedStyle(x.querySelector('span')).visibility === 'visible').length, rects: bs.map((x) => { const q = x.getBoundingClientRect(); return [Math.round(q.top * 10) / 10, Math.round(q.height * 10) / 10]; }) }; };
      const one = async (k) => { if (k) shiftAt(3, k, Object.fromEntries(Array.from({ length: k }, (_, i) => [i, 0]))); else { state.work.res[dateStr(TOWNEV.today())] = { place: 'nakai', done: 0, score: {}, keep: { seed: 3 } }; saveState(); }
        await at('ryokan'); WORK.start(yard(), 'nakai'); for (let i = 0; i < 60 && !document.querySelector('.wk-nakai'); i++) { click('.talk'); await wait(150); }
        await watch(() => nk() && nk().k === k && nk().task && nk().task.kind === 'check' && nk().phase !== 'ask' && document.querySelector('.wk-nakai .nk-opt'), 15000);
        await watch(() => !document.querySelector('.cls.wk-nakai').getAnimations().some((a) => a.playState === 'running'), 3000); await wait(100); const before = look();   // she names the room (the card's own opening over: a shift taken up opens at the check)
        await watch(() => nk().phase === 'ask', 8000); await wait(100); const asked = look(); CLASS.close(); await wait(300); return { k, before, asked }; };
      return JSON.stringify([await one(0), await one(k2)]); })()""")], timeout=120)[-1])
    for x in r:
        assert x['before']['phase'] != 'ask' and x['before']['n'] >= 2 and x['before']['later'] == x['before']['n'] and x['before']['words'] == 0, x   # in their places, ……, not to be tapped
        assert x['asked']['words'] == x['asked']['n'] == x['before']['n'] and x['asked']['later'] == 0 and x['asked']['rects'] == x['before']['rects'], x   # their words in; nothing moved

# I-1, ruling 33 (fix round 1): over 6,000 shifts every room's guest says something true of the room as it stands when they come in —
# with nothing done (the countdown beat the hero), with everything done, with some done — and never of a thing whose instruction this
# room wanted the other way and left undone (窓を 閉めて left: no 「窓が 開いて いますね」); the room keeps a thing for that, untouched by
# any instruction, from its start. Seed 2955 (桜の間: the light check off, then light, flower, yukata, tea) had nothing to say
def test_nakai_every_guest_is_true_of_the_room(b):
    r = json.loads(ev(b, """(() => { const m8 = TOWNEV.unitIdx('m8'), RD = NAKAI.READY, bad = [], cp = (o) => JSON.parse(JSON.stringify(o)); let n = 0;
      const against = (key, wants) => wants.some(([k, v]) => k === key && typeof v === 'boolean' && v !== RD[k]);   // this room wanted it the other way (a futon or a cushion: always laid)
      const look = (s, ri, rm, name, done, used) => { const dos = rm.tasks.filter((t) => t.kind === 'do'), wants = dos.map((t) => t.target), st = cp(rm.start); done.forEach((t) => NAKAI.put(st, t.target)); n++;
        const g = NAKAI.guest(st, rm.tasks[rm.tasks.length - 1].plan, used, null, wants);
        if (!g) bad.push(`${s}.${ri}.${name}:none`); else if (!NAKAI.isReady(st, g.key) || against(g.key, wants)) bad.push(`${s}.${ri}.${name}:${g.key}`); };
      for (let s = 1; s <= 6000; s++) { const sh = NAKAI.make(m8, s), used = []; sh.rooms.forEach((rm, ri) => { const dos = rm.tasks.filter((t) => t.kind === 'do');
        look(s, ri, rm, 'none', [], used); look(s, ri, rm, 'all', dos, used); look(s, ri, rm, 'mix', dos.filter((t, i) => (s + ri + i) % 2 === 0), used); look(s, ri, rm, 'mix2', dos.filter((t, i) => (s * 7 + ri + i) % 3 === 1), used);
        used.push(rm.tasks[rm.tasks.length - 1].key); }); }
      const rm = NAKAI.make(m8, 2955).rooms[0], g = NAKAI.guest(rm.start, rm.tasks[rm.tasks.length - 1].plan, [], null, rm.tasks.filter((t) => t.kind === 'do').map((t) => t.target));
      return JSON.stringify({ n, nbad: bad.length, bad: bad.slice(0, 8), s2955: g ? [g.key, NAKAI.isReady(rm.start, g.key)] : null }); })()"""))
    assert r['n'] >= 72000 and r['nbad'] == 0, r
    assert r['s2955'] and r['s2955'][1], r   # the room that had nothing true to say has its untouched thing now

# M-3 (fix round 1): 千代 stands in 桜の間 only while her card is up, and only at this hour (whereIs asked of another hour: her hours);
# once the card is gone — ✕ halfway, or the shift's results — she is back in the lobby at once: 桜の間 drawn without her, no minute's wait
def test_nakai_chiyo_back_in_the_lobby_at_once(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + CALM + WORK4 + NK + """ card(['S', 'S', 'S', 'S']); state.currentUnit = 'm8'; window.speakAs = () => Promise.resolve(); const out = {};
      const where = (h) => (TOWNEV.whereIs('chiyo', h, TOWNEV.today()) || {}).place, drawn = () => Boolean(yard() && yard().querySelector('.npc-chiyo'));
      const seed = seedWhere(() => true); shiftAt(seed); await at('ryokan'); WORK.start(yard(), 'nakai');
      await watch(() => nk() && ready() && location.hash === '#/washitsu' && drawn(), 12000); out.up = [where(10), where(15), drawn()];   // now: 桜の間; at 15 (her hours): the lobby
      CLASS.close(); await wait(1200); out.shut = [yard().dataset.place, drawn(), where(10)];   // ✕ halfway
      await at('ryokan'); out.lobby = drawn();
      TOWNEV.clock = { h: 10, day: new Date(2026, 10, 11) }; shiftAt(seed, 15, Object.fromEntries(Array.from({ length: 15 }, (_, k) => [k, 0])));   // the next day, at its last guest
      WORK.start(yard(), 'nakai'); await watch(() => nk() && nk().k === 15 && ready() && drawn(), 12000); await solve();
      await watch(() => document.querySelector('.wk-result') && !document.querySelector('.wk-nakai'), 15000); await wait(1200);
      out.end = [yard().dataset.place, drawn(), where(10)]; document.querySelectorAll('.wk-result').forEach((e) => e.remove());
      return JSON.stringify(out); })()"""))
    assert r['up'] == ['washitsu', 'ryokan', True], r
    assert r['shut'] == ['washitsu', False, 'ryokan'] and r['lobby'], r   # ✕ halfway: gone from 桜の間 at once, in the lobby
    assert r['end'] == ['washitsu', False, 'ryokan'], r   # the shift's end: the same

# M-5 (fix round 1): a 仲居 card shut while a wrong thing is still to go back says and plays nothing more — no sound after the shut, even
# with no new shift; and shut at once and begun again at once: her old word never said, nothing old in the new card, the new lines whole
def test_a_shut_nakai_card_says_nothing_more(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + CALM + WORK4 + NK + LANE + """ card(['S', 'S', 'S', 'S']); state.currentUnit = 'm8'; const out = {}, played = []; SND.play = (n) => played.push([ms(), n]);
      const SND_OF = { window: 'slide-door', shoji: 'fusuma', light: 'switch', ac: 'ic', tv: 'ic', tea: 'dishes', yukata: 'cloth', flower: 'rustle' };
      const seed = seedWhere((sh) => sh.tasks[1].kind === 'do'); shiftAt(seed);
      const wrongTap = async () => { await watch(() => nk() && nk().phase === 'do' && ready() && log.some(([, w, l]) => w === 'chiyo' && l === nk().task.line[0]), 20000);   // her instruction begun
        const tk = nk().task.target[0], w = ['tv', 'yukata', 'flower', 'tea', 'ac', 'shoji', 'window', 'light'].find((x) => x !== tk); NAKAI.tap(w); await wait(60); return SND_OF[w]; };
      await at('ryokan'); WORK.start(yard(), 'nakai'); await watch(() => nk() && nk().k === 0 && ready(), 20000); await solve();
      const s1 = await wrongTap(), at1 = ms(); CLASS.close(); await wait(1000);   // shut, nothing begun
      out.alone = played.filter(([m, n]) => m >= at1 && n === s1).length;
      WORK.start(yard(), 'nakai'); const s2 = await wrongTap(), at2 = ms(); CLASS.close(); WORK.start(yard(), 'nakai'); await wait(2600);   // shut and begun again at once
      const after = log.filter(([m]) => m >= at2), A = TOWN.ONSEN.nakai.say;
      out.again = { old: after.filter(([, w, l]) => w === 'chiyo' && l === A.miss[0]).length, snd: played.filter(([m, n]) => m >= at2 && n === s2).length, cut: cuts.filter(([m]) => m >= at2).map(([, x]) => x),
        bad: Boolean(document.querySelector('.wk-nakai .wk-say.bad')), card: Boolean(document.querySelector('.wk-nakai')), said: after.map(([, w]) => w) };
      CLASS.close(); return JSON.stringify(out); })()"""))
    assert r['alone'] == 0, r   # no sound after a shut
    a = r['again']
    assert a['old'] == 0 and a['snd'] == 0 and a['cut'] == [] and not a['bad'] and a['card'] and a['said'][:1] == ['chiyo'], r

# fix round 2 (New Breakage 3): the countdown runs out while a thing tapped wrong is still going back, so the guest waits for it to be
# back; the card shut in that wait — no guest comes in, no door is heard, nothing at all plays after the shut
def test_a_nakai_card_shut_while_its_guest_waits_stays_quiet(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + CALM + WORK4 + NK + """ card(['S', 'S', 'S', 'S']); state.currentUnit = 'm8';
      const said = [], played = []; window.speakAs = (w, l) => { said.push(w + ':' + l); return Promise.resolve(); }; SND.play = (n) => played.push([Date.now(), n]);
      const seed = seedWhere((sh) => sh.tasks[1].kind === 'do'); shiftAt(seed); NAKAI.speed = 30; await at('ryokan'); WORK.start(yard(), 'nakai');
      await watch(() => nk() && nk().k === 0 && ready(), 12000); await solve();
      await watch(() => document.querySelector('.wk-nakai .nk-dep.late'), 15000);
      const tk = nk().task.target[0], w = ['tv', 'yukata', 'flower', 'tea', 'ac', 'shoji', 'window', 'light'].find((x) => x !== tk); NAKAI.tap(w);   // tapped wrong: back in 650 ms
      const late = 'chiyo:' + TOWN.ONSEN.nakai.say.late[0]; await watch(() => said.includes(late), 4000); const busy = Boolean(nk() && nk().busy);   // the guests come while it goes back
      const t0 = Date.now(); CLASS.close(); await wait(1200); NAKAI.speed = 1;
      return JSON.stringify({ late: said.includes(late), busy, after: played.filter(([t]) => t >= t0).map(([, n]) => n) }); })()"""))
    assert r['late'] and r['busy'] and r['after'] == [], r   # the wait was under way when shut; then nothing (no 'fusuma')

# M-8 (fix round 1, Review Focus 2): a shift taken up in the middle of laying three futons goes on at the same task with the one laid,
# and counts it once; one taken up after the countdown failed a room goes on at that room's guest with the room as it stood (its
# instructions not done) and its 3s kept, not counted again
def test_nakai_resumes_mid_futon_and_after_a_failed_room(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + CALM + WORK4 + NK + """ card(['S', 'S', 'S', 'S']); state.currentUnit = 'm8'; window.speakAs = () => Promise.resolve(); const out = {};
      const seed = seedWhere((sh) => sh.tasks[1].kind === 'do' && sh.tasks[1].target.join() === 'futon,3' && !sh.rooms[0].cat); shiftAt(seed);
      await at('ryokan'); WORK.start(yard(), 'nakai'); await watch(() => nk() && nk().k === 0 && ready(), 12000); await solve();
      await watch(() => nk() && nk().k === 1 && ready(), 12000); NAKAI.tap('futon', 2); await wait(200);
      const st1 = JSON.stringify(nk().st); CLASS.close(); await wait(200);
      WORK.start(yard(), 'nakai'); await watch(() => nk() && nk().k === 1 && ready(), 12000);
      out.futon = [nk().k, JSON.stringify(nk().st) === st1, nk().st.futon, Object.keys(WORK.today().score).join()];
      NAKAI.tap('futon', 0); await wait(120); NAKAI.tap('futon', 1); await watch(() => WORK.today().score[1] !== undefined, 4000);
      out.laid = [WORK.today().score[1], Object.keys(WORK.today().score).join()]; CLASS.close(); await wait(200);
      TOWNEV.clock = { h: 10, day: new Date(2026, 10, 11) }; const s2 = seedWhere(() => true, 40); shiftAt(s2);
      const sh2 = NAKAI.make(m8, s2), dos = sh2.rooms[0].tasks.filter((t) => t.kind === 'do'), g0 = sh2.rooms[0].tasks.slice(-1)[0].k;
      NAKAI.speed = 30; await at('ryokan'); WORK.start(yard(), 'nakai'); await watch(() => nk() && nk().k === 0 && ready(), 12000); await solve();
      await watch(() => nk() && nk().k === g0 && ready(), 15000); NAKAI.speed = 1; const st2 = JSON.stringify(nk().st), sc2 = JSON.stringify(WORK.today().score); CLASS.close(); await wait(200);
      WORK.start(yard(), 'nakai'); await watch(() => nk() && nk().k === g0 && ready(), 12000);
      out.failed = [nk().k === g0, JSON.stringify(nk().st) === st2, JSON.stringify(WORK.today().score) === sc2, dos.every((t) => WORK.today().score[t.k] === 3), dos.every((t) => !NAKAI.meets(nk().st, t.target))];
      CLASS.close(); return JSON.stringify(out); })()"""))
    assert r['futon'] == [1, True, [False, False, True], '0'], r   # the one laid kept, the same task, nothing counted
    assert r['laid'] == [0, '0,1'], r   # then done once
    assert r['failed'] == [True, True, True, True, True], r

# the generator (生成) has the 仲居's lines: 千代's every instruction, check, follow-up and word, each guest's remark and word in their own
# voice (the town's and the cruise's people: no new voice), the hero's every right reply
def test_the_generator_has_the_nakai_lines(b):
    r = json.loads(ev(b, """(() => { const all = new Set(talkLines().map(([w, l]) => w + '|' + l)), m8 = TOWNEV.unitIdx('m8'), miss = [];
      const need = (w, l) => { if (!all.has(w + '|' + l)) miss.push(w + '|' + l); };
      for (let s = 1; s <= 80; s++) NAKAI.make(m8, s).tasks.forEach((t) => { need(t.kind === 'guest' ? t.who : 'chiyo', t.line[0]); if (t.opts) need('hero', t.opts.find((o) => o[2])[0]); if (t.after) need(t.who, t.after[0]); });
      NAKAI.GUESTS.forEach((key) => { const g = NAKAI.guest(NAKAI.readyState(key), key); need(g.who, g.line[0]); need(g.who, g.after[0]); need('hero', g.opts.find((o) => o[2])[0]); });
      const S = TOWN.ONSEN.nakai.say; Object.entries(S).filter(([k]) => k !== 'who').forEach(([, l]) => (Array.isArray(l[0]) ? l : [l]).forEach((x) => need('chiyo', x[0])));
      ((TOWN.WORK.first || {}).nakai || []).forEach((l) => need(l[0], l[1]));
      return JSON.stringify({ miss: [...new Set(miss)].slice(0, 6), voices: Object.keys(CAST_VOICE).length }); })()"""))
    assert r['miss'] == [] and r['voices'] == 69, r   # 69: the フロント's sumo wrestler (Task 7)

# ---- Task 6: おみやげ屋 at ゆのはな堂 with 竹内 (spec §5, §5.3) ----
# my(): the customer at the counter now (MIYAGE_RUN.now(): { k, c, step, phase, tray, seed, miss, busy, plate }); good(g): a good on the
# shelves; put(ids): the tray made exactly ids (a good tapped on, one not wanted tapped off — the tray holds one of each); give(): どうぞ;
# opt(right): the right reply (or a wrong one); serve(): the right thing done for the step now; work(to): served till customer `to`;
# shiftAt(seed, done, score): today's おみやげ屋 record set to begin there (a shift done before: not the job's first); seedWhere(f): the
# first seed whose shift is so; at(id): where that customer is in the shift of seed s
MY = """const my = () => MIYAGE_RUN.now(), m11 = TOWNEV.unitIdx('m11');
  const good = (g) => document.querySelector(`.wk-miyage .om-good[data-g="${g}"]`);
  const put = (ids) => { const n = my(); [...new Set([...n.tray, ...ids])].forEach((g) => { if (my().tray.includes(g) !== ids.includes(g)) { const b = good(g); if (b) b.click(); } }); };
  const give = () => click('.wk-miyage .om-give');
  const opt = (right) => { const n = my(), i = n.c.opts.findIndex((o) => (right ? o[2] : !o[2])); return document.querySelector(`.wk-miyage .om-opt[data-o="${i}"]`); };
  const ready = () => { const n = my(); return Boolean(n) && (n.phase === 'pick' || n.phase === 'reply') && !n.busy; };
  async function serve() { const n = my(); if (!ready()) return false;
    if (n.phase === 'pick') { put(MIYAGE.answer(n.c)); await wait(60); give(); return true; }
    const b = opt(true); if (b && !b.disabled) b.click(); return true; }
  const before = (to) => Boolean(my()) && my().k < to;
  async function work(to) { let at = -1, since = Date.now(); while (before(to) && Date.now() - since < 25000) { await watch(() => ready() || !before(to), 3000); if (!before(to)) break; if (my().k !== at) { at = my().k; since = Date.now(); } await serve(); await wait(150); } }   // never past `to`
  const shiftAt = (seed, done = 0, score = {}) => { state.work.res['2026-10-20'] = { place: 'miyage', done: 10, score: {}, yen: 1, grade: 'C' }; state.work.res[dateStr(TOWNEV.today())] = { place: 'miyage', done, score, keep: { seed } }; saveState(); };
  const seedWhere = (f, from = 1) => { for (let s = from; s < 8000; s++) { if (f(MIYAGE.make(m11, s))) return s; } return 0; };
  const where = (s, f) => MIYAGE.make(m11, s).findIndex(f);
  const upTo = (k) => Object.fromEntries(Array.from({ length: k }, (_, i) => [i, 0]));
  const begin = async (seed, k) => { shiftAt(seed, k, upTo(k)); await at('yudori'); WORK.start(yard(), 'miyage'); await watch(() => my() && my().k === k && ready(), 15000); await wait(150); };"""

# spec §5.3 (rulings 16, 17): a shift is ten customers — the first a plain pick (a box for so many, a thing each for two, what they
# were given), then one each with a coin to spend, asking a favour (包んで), their hands full, buying for a superior, unable to choose (a
# taste), the rest plain picks, each plain kind once at least; 金田 now and then in a plain one's place (never first or second); no
# customer twice, no person twice in a shift (fix round 1, M-3: fourteen people for ten customers); each one someone with a voice, wanting
# what the shelves hold, with one right tray their words decide (a box for ten: the twelve; the small one: the six; a superior who likes
# お酒: 地酒, かざる もの: こけし); every reply three, one right, each wrong with its reason — the wrap's wrong ones もらいます／くれます, the
# bag's もらいましょうか, the gift's くださるのでしたら／いただくのでしたら in the shop's register (M-5) — and none a plain fair one; hands full
# of luggage, never 手一杯 (M-6); the coin's lit good one, not three (M-2)
def test_miyage_customers_come_as_the_spec_says(b):
    r = json.loads(ev(b, """(() => { const m11 = TOWNEV.unitIdx('m11'), bad = [], kinds = {}; let kaneda = 0;
      const ids = MIYAGE.goods().map((g) => g[0]);
      for (let s = 1; s <= 400; s++) { const sh = MIYAGE.make(m11, s), ks = sh.map((c) => c.kind);
        if (sh.length !== 10) bad.push(s + ':n'); if (!['count', 'two', 'got'].includes(sh[0].kind)) bad.push(s + ':first:' + sh[0].kind);
        ['budget', 'reply', 'offer', 'elder', 'taste'].forEach((k) => { if (ks.filter((x) => x === k).length !== 1) bad.push(s + ':' + k); });
        const n = ks.filter((x) => x === 'all').length; if (n > 1 || ks[0] === 'all' || ks[1] === 'all') bad.push(s + ':all'); kaneda += n;
        if (new Set(sh.map((c) => c.id)).size !== 10) bad.push(s + ':twice');
        if (new Set(sh.map((c) => c.who)).size !== 10) bad.push(s + ':person:' + sh.map((c) => c.who).join());   // no person twice in a shift (M-3)
        ['count', 'two', 'got'].forEach((k) => { if (!ks.includes(k)) bad.push(s + ':plain:' + k); });   // each plain kind once at least
        sh.forEach((c, k) => { if (k && c.who === sh[k - 1].who) bad.push(`${s}.${k}:running:${c.who}`); if (!CAST_VOICE[c.who]) bad.push(c.id + ':voice');
          if (Array.isArray(c.want) && c.want.some((g) => !ids.includes(g))) bad.push(c.id + ':want');
          kinds[c.kind] = (kinds[c.kind] || 0) + 1;
          if (!MIYAGE.judge(c, MIYAGE.answer(c)).ok) bad.push(c.id + ':answer');
          if (c.opts) { const r = c.opts.filter((o) => o[2]); if (c.opts.length !== 3 || r.length !== 1 || c.opts.some((o) => !o[1]) || new Set(c.opts.map((o) => o[0])).size !== 3) bad.push(c.id + ':opts'); } }); }
      const C = (id) => MIYAGE.cust(id), right = (c) => c.opts.find((o) => o[2])[0], wrong = (c) => c.opts.filter((o) => !o[2]).map((o) => o[0]);
      const one = (id) => ids.filter((g) => MIYAGE.judge(C(id), [g]).ok);
      const all = MIYAGE.ids().map(C), fair = all.filter((c) => c.opts).flatMap(wrong).filter((j) => /どうですか|いかがですか。$|いかがでしょうか。$/.test(j) && !/くださる|いただく/.test(j));
      const hands = all.filter((c) => c.kind === 'offer').map((c) => c.then[0]), lit = C('budget').lit;
      return JSON.stringify({ bad: bad.slice(0, 8), kinds, kaneda, count: [one('count10'), one('count8'), one('count2')], elder: [one('elder1'), one('elder2'), one('elder3')], elderLine: [C('elder1').line[0], C('elder2').line[0]],
        wrap: [right(C('wrap1')), wrong(C('wrap1'))], bag: [right(C('offer1')), wrong(C('offer1'))], give: [right(C('elder1')), wrong(C('elder1')), right(C('elder2')), right(C('elder3'))], taste: [right(C('taste1')), wrong(C('taste1'))], fair, hands, lit,
        over: TOWN.ONSEN.miyage.why.over }); })()"""))
    assert r['bad'] == [], r
    assert 100 < r['kaneda'] < 240 and r['kinds']['all'] == r['kaneda'], r   # 金田 in about half the shifts, once at most
    assert r['count'] == [['manju12'], ['manju12'], ['manju6']], r   # ten, eight: the twelve (the six is too few); the small one: the six
    assert r['elder'] == [['sake'], ['kokeshi'], ['sake']] and 'お{酒|さけ}が お{好|す}き' in r['elderLine'][0] and 'かざる' in r['elderLine'][1], r   # what the superior likes decides
    assert r['wrap'][0] == 'はい、{包|つつ}みますね。' and any('{包|つつ}んで もらいます' in x for x in r['wrap'][1]) and any('{包|つつ}んで くれます' in x for x in r['wrap'][1]), r
    assert r['bag'][0] == '{袋|ふくろ}に {入|い}れましょうか。' and any('{入|い}れて もらいましょうか' in x for x in r['bag'][1]), r
    assert r['give'][0] == '{先生|せんせい}に さしあげるのでしたら、こちらの {地酒|じざけ|當地酒}は いかがでしょうか。', r   # the shop's register (M-5)
    assert r['give'][2] == '{先生|せんせい}に さしあげるのでしたら、こちらの こけしは いかがでしょうか。' and r['give'][3] == '{部長|ぶちょう}さんに さしあげるのでしたら、こちらの {地酒|じざけ|當地酒}は いかがでしょうか。', r
    assert sorted(x.split('、')[0] for x in r['give'][1]) == ['{先生|せんせい}に いただくのでしたら', '{先生|せんせい}に くださるのでしたら'], r
    assert r['taste'][0] == 'よかったら、{食|た}べて みて ください。' and r['fair'] == [], r
    assert len(r['hands']) == 2 and all('{荷物|にもつ}で {手|て}が いっぱい' in x for x in r['hands']), r   # their hands full of luggage, never 手一杯 (M-6)
    assert r['lit'] == ['keyring'] and '選一樣 500 円以內的' in r['over'], r   # the coin: one good lit, and the reason says pick one (M-2)

# spec §5.3 (送誰、幾個), §5: a customer's words heard first (…… in the bubble till right, two misses or gone) — 「会社の 人たちに
# おまんじゅうを あげたいんですが、十人 いるんです。」: the box of six is a miss (their 「ちょっと たりないですね…」), the box of twelve is
# right, with that one miss
def test_miyage_ten_people_need_the_box_of_twelve(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + CALM + WORK4 + MY + """ card(['S', 'S', 'S', 'S']); state.currentUnit = 'm11';
      const said = []; window.speakAs = (w, l) => { said.push(w + ':' + l); return Promise.resolve(); };
      const seed = seedWhere((sh) => sh[0].id === 'count10'); await begin(seed, 0);
      const c = my().c, out = { seed, kind: c.kind, line: c.line[0], dots: Boolean(document.querySelector('.wk-miyage .wk-bub .om-dots')),
        judge: [MIYAGE.judge(c, ['manju6']).ok, MIYAGE.judge(c, ['manju12']).ok, MIYAGE.judge(c, ['manju6', 'manju12']).ok, MIYAGE.judge(c, ['senbei']).ok, MIYAGE.judge(c, ['manju6']).why] };
      put(['manju6']); await wait(100); out.tray = my().tray.slice(); said.length = 0; give(); await wait(500);
      out.few = said.filter((x) => x.startsWith(c.who + ':')); out.k = my().k; out.miss = my().miss; out.still = Boolean(document.querySelector('.wk-miyage .wk-bub .om-dots'));
      put(['manju12']); await wait(100); give(); await watch(() => (WORK.today().score || {})[0] !== undefined, 6000);
      out.score = WORK.today().score[0]; out.shown = document.querySelector('.wk-miyage .wk-bub').textContent.includes('十人');
      CLASS.close(); return JSON.stringify(out); })()"""))
    assert r['seed'] and r['kind'] == 'count' and '{十人|じゅうにん|十個人}' in r['line'] and r['dots'], r   # heard first
    assert r['judge'] == [False, True, False, False, 'few'], r
    assert r['tray'] == ['manju6'] and r['few'] == ['ken:ちょっと たりないですね…'] and r['k'] == 0 and r['miss'] == 1 and r['still'], r   # one miss: their words not shown yet
    assert r['score'] == 1 and r['shown'], r   # right with its one miss; the words shown

# spec §5.3 (兩個人): 「父には お酒を、母には てぬぐいを 買って あげたいです。」 — both on the tray, in either order, is right at once; one
# of them only (or one more) is not
def test_miyage_two_people_two_things_any_order(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + CALM + WORK4 + MY + """ card(['S', 'S', 'S', 'S']); state.currentUnit = 'm11';
      window.speakAs = () => Promise.resolve(); const seed = seedWhere((sh) => sh[0].id === 'two1'); await begin(seed, 0);
      const c = my().c, j = (ids) => { const x = MIYAGE.judge(c, ids); return x.ok || x.why; };
      const out = { want: c.want.slice().sort(), judge: [j(['sake', 'tenugui']), j(['tenugui', 'sake']), j(['sake']), j(['sake', 'tenugui', 'jam']), j(['jam'])] };
      good('tenugui').click(); await wait(80); good('sake').click(); await wait(80); out.tray = my().tray.slice(); give();
      await watch(() => (WORK.today().score || {})[0] !== undefined, 6000); out.score = WORK.today().score[0]; CLASS.close(); return JSON.stringify(out); })()"""))
    assert r['want'] == ['sake', 'tenugui'] and r['judge'] == [True, True, 'more', 'extra', 'other'], r
    assert r['tray'] == ['tenugui', 'sake'] and r['score'] == 0, r   # the order they were tapped in: right at once

# spec §5.3 (收到過的): 「となりの 人が くれた おせんべいが おいしかったんです。同じのを ください。」 — the one they were given (せんべい),
# not another: ゆずジャム is a miss (竹内's word, the reason under it), then せんべい right
def test_miyage_what_they_were_given(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + CALM + WORK4 + MY + """ card(['S', 'S', 'S', 'S']); state.currentUnit = 'm11';
      const said = []; window.speakAs = (w, l) => { said.push(w + ':' + l); return Promise.resolve(); };
      const seed = seedWhere((sh) => sh[0].id === 'got1'); await begin(seed, 0);
      const c = my().c, out = { line: c.line[0], judge: [MIYAGE.judge(c, ['senbei']).ok, MIYAGE.judge(c, ['jam']).ok] };
      put(['jam']); said.length = 0; give(); await wait(500); out.word = said.filter((x) => x.startsWith('makoto:'));
      out.why = (document.querySelector('.wk-miyage .om-talk .wk-say span') || {}).textContent || '';
      put(['senbei']); give(); await watch(() => (WORK.today().score || {})[0] !== undefined, 6000); out.score = WORK.today().score[0];
      CLASS.close(); return JSON.stringify(out); })()"""))
    assert 'くれた おせんべい' in r['line'] and r['judge'] == [True, False], r
    assert r['word'] == ['makoto:あれ？ もう {一度|いちど}、よく {聞|き}いて みて！'] and r['why'], r
    assert r['score'] == 1, r

# spec §5.3 (預算): ゆうた with 500 円 in his hand (a coin shown by him) — 「おばあちゃんに もらった お金で 買います！」: any good of 500 円
# or less is right, one dearer (or two that come to more) a miss — his 「お金が たりない…」, the reason 「選一樣 500 円以內的」; after two
# misses one right good is lit, not all three (fix round 1, M-2: the three together are over)
def test_miyage_budget_of_500(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + CALM + WORK4 + MY + """ card(['S', 'S', 'S', 'S']); state.currentUnit = 'm11';
      const said = []; window.speakAs = (w, l) => { said.push(w + ':' + l); return Promise.resolve(); };
      const seed = seedWhere((sh) => sh.findIndex((c) => c.kind === 'budget') > 0), k = where(seed, (c) => c.kind === 'budget');
      await begin(seed, k); const c = my().c;
      const out = { who: c.who, budget: c.budget, each: MIYAGE.goods().map((g) => MIYAGE.judge(c, [g[0]]).ok === (g[2] <= 500)), two: MIYAGE.judge(c, ['keyring', 'bath']).why,
        coin: (document.querySelector('.wk-miyage .om-hold') || {}).textContent || '' };
      put(['sake']); said.length = 0; give(); await wait(500); out.over = said.filter((x) => x.startsWith(c.who + ':')); out.why = (document.querySelector('.wk-miyage .om-talk .wk-say span') || {}).textContent || '';
      put(['keyring', 'bath']); await wait(80); give(); await wait(500); out.lit = [...document.querySelectorAll('.wk-miyage .om-good.wk-hint')].map((x) => x.dataset.g);
      put(['keyring']); give(); await watch(() => (WORK.today().score || {})[k] !== undefined, 6000); out.score = WORK.today().score[k];
      CLASS.close(); return JSON.stringify(out); })()"""))
    assert r['who'] == 'yuta' and r['budget'] == 500 and all(r['each']) and r['two'] == 'over' and '500' in r['coin'], r
    assert len(r['over']) == 1 and 'たりない' in r['over'][0] and '選一樣 500 円以內的' in r['why'], r
    assert r['lit'] == ['keyring'] and r['score'] == 2, r   # two misses: one right good lit

# spec §5.3 (回話), rulings 2, 7, 23: a customer gets their thing, then asks 「包んで もらえますか。」 (heard first) — 「はい、包みますね。」 is
# right; 「はい、包んで もらいます。」 and 「はい、包んで くれます。」 are wrong, each with a reason that says whose giving it is (竹内's word
# with it); the two steps' misses add up to one task. Shut after the pick and taken up again, the customer starts over, nothing counted
def test_miyage_reply_keeps_the_giving_the_right_way(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + CALM + WORK4 + MY + """ card(['S', 'S', 'S', 'S']); state.currentUnit = 'm11';
      const said = []; window.speakAs = (w, l) => { said.push(w + ':' + l); return Promise.resolve(); };
      const seed = seedWhere((sh) => sh.findIndex((c) => c.id === 'wrap1') > 0), k = where(seed, (c) => c.id === 'wrap1'); await begin(seed, k);
      const c = my().c, out = { first: [my().phase, my().step] };
      put(['kokeshi']); give(); await watch(() => my().phase === 'reply' && ready(), 6000); await wait(100);
      out.then = [said.includes(c.who + ':' + c.then[0]), Boolean(document.querySelector('.wk-miyage .wk-bub .om-dots')), my().step];
      CLASS.close(); await wait(200); WORK.start(yard(), 'miyage'); await watch(() => my() && my().k === k && ready(), 12000);
      out.again = [my().k, my().step, my().phase, Object.keys(WORK.today().score).length];
      put(['jam']); give(); await wait(300); put(['kokeshi']); give(); await watch(() => my().phase === 'reply' && ready(), 6000); await wait(100);
      out.opts = [...document.querySelectorAll('.wk-miyage .om-opt')].map((x) => x.textContent.replace(/\\s/g, ''));
      const w = opt(false), wi = Number(w.dataset.o); said.length = 0; w.click(); await wait(400);
      out.word = said.filter((x) => x.startsWith('makoto:')); out.why = (document.querySelector('.wk-miyage .om-talk .wk-say span') || {}).textContent || ''; out.why0 = my().c.opts[wi][1]; out.dis = w.disabled;
      opt(true).click(); await watch(() => (WORK.today().score || {})[k] !== undefined, 6000); await wait(300);
      out.score = WORK.today().score[k]; out.hero = said.includes('hero:はい、{包|つつ}みますね。');
      CLASS.close(); return JSON.stringify(out); })()"""))
    assert r['first'] == ['pick', 0] and r['then'] == [True, True, 1], r   # the pick first; then their favour, heard first
    assert r['again'][:3] == [r['again'][0], 0, 'pick'] and r['again'][3] == r['again'][0], r   # shut halfway: the same customer from the start, nothing counted
    assert len(r['opts']) == 3 and any('つつみますね' in x for x in r['opts']), r
    assert r['word'] == ['makoto:あれ？ だれが だれに するのか、よく {考|かんが}えて！'] and r['why'] == r['why0'] and r['dis'], r
    assert any(k in r['why'] for k in ('請別人', '別人幫')), r   # whose giving: the reason says so
    assert r['score'] == 2 and r['hero'], r   # a wrong pick and a wrong reply: two misses, one task

# spec §5.3 (主動提議, 長輩): their hands full — 「袋に 入れましょうか。」 offered, not 「袋に 入れて もらいましょうか。」; a gift for a
# superior who likes お酒 — 地酒, presented with 「先生に さしあげるのでしたら、こちらの 地酒は いかがでしょうか。」 (くださる／いただく wrong)
def test_miyage_a_bag_offered_and_a_gift_for_a_superior(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + CALM + WORK4 + MY + """ card(['S', 'S', 'S', 'S']); state.currentUnit = 'm11';
      const said = []; window.speakAs = (w, l) => { said.push(w + ':' + l); return Promise.resolve(); }; const out = {};
      const s1 = seedWhere((sh) => sh.findIndex((c) => c.id === 'offer1') > 0), k1 = where(s1, (c) => c.id === 'offer1'); await begin(s1, k1);
      out.bags = Boolean(document.querySelector('.wk-miyage .om-hold')); put(['senbei', 'bath']); give(); await watch(() => my().phase === 'reply' && ready(), 6000);
      out.offer = [said.includes(my().c.who + ':' + my().c.then[0]), my().c.opts.find((o) => o[2])[0]]; opt(true).click();
      await watch(() => (WORK.today().score || {})[k1] !== undefined, 6000); await wait(600); out.offerSaid = said.filter((x) => x.startsWith('hero:') || x.startsWith('yoshimoto:')).slice(-3);
      CLASS.close(); TOWNEV.clock = { h: 10, day: new Date(2026, 10, 11) };
      const s2 = seedWhere((sh) => sh.findIndex((c) => c.id === 'elder1') > 0), k2 = where(s2, (c) => c.id === 'elder1'); said.length = 0; await begin(s2, k2);
      put(['kokeshi']); give(); await wait(400); out.elderMiss = my().miss; put(['sake']); give(); await watch(() => my().phase === 'reply' && ready(), 6000);
      out.elder = [my().c.opts.find((o) => o[2])[0], my().step]; opt(true).click(); await watch(() => (WORK.today().score || {})[k2] !== undefined, 6000); await wait(300);
      out.elderScore = WORK.today().score[k2]; out.elderSaid = said.filter((x) => x.startsWith('hero:')).slice(-1);
      CLASS.close(); return JSON.stringify(out); })()"""))
    assert r['bags'] and r['offer'] == [True, '{袋|ふくろ}に {入|い}れましょうか。'], r
    assert 'hero:{袋|ふくろ}に {入|い}れましょうか。' in r['offerSaid'], r
    assert r['elderMiss'] == 1 and r['elder'][0] == '{先生|せんせい}に さしあげるのでしたら、こちらの {地酒|じざけ|當地酒}は いかがでしょうか。' and r['elder'][1] == 1, r
    assert r['elderScore'] == 1 and r['elderSaid'] == ['hero:' + r['elder'][0]], r

# spec §5.3 (試吃): one who cannot choose — 「どれが おいしいですか…」 — the replies first: 「よかったら、食べて みて ください。」; they take a
# piece off the tasting plate on the counter, 「おいしい！ これに します。…」, and then the box they named
def test_miyage_a_taste_then_the_box(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + CALM + WORK4 + MY + """ card(['S', 'S', 'S', 'S']); state.currentUnit = 'm11';
      const said = []; window.speakAs = (w, l) => { said.push(w + ':' + l); return Promise.resolve(); };
      const seed = seedWhere((sh) => sh.findIndex((c) => c.id === 'taste1') > 0), k = where(seed, (c) => c.id === 'taste1'); await begin(seed, k);
      const c = my().c, plate = () => document.querySelectorAll('.wk-miyage .om-plate .om-bit').length, out = { first: [my().phase, my().step, document.querySelectorAll('.wk-miyage .om-opt').length], line: c.line[0], plate0: plate() };
      const hint = () => Boolean(document.querySelector('.wk-miyage .om-tray .om-empty')); out.hint = [hint()];   // no 「點架上的…」 while the shelves do nothing (M-9)
      opt(true).click(); await watch(() => my().phase === 'pick' && ready(), 8000); await wait(200);
      out.after = [plate(), said.includes('hero:よかったら、{食|た}べて みて ください。'), said.includes(c.who + ':' + c.then[0]), my().step]; out.hint.push(hint());
      put(MIYAGE.answer(my().c)); give(); await watch(() => (WORK.today().score || {})[k] !== undefined, 6000); out.score = WORK.today().score[k]; out.want = c.want;
      CLASS.close(); return JSON.stringify(out); })()"""))
    assert r['first'] == ['reply', 0, 3] and 'どれが おいしいですか' in r['line'], r   # the replies first
    assert r['after'][0] == r['plate0'] - 1 and r['after'][1:] == [True, True, 2], r   # a piece off the plate; their word; then the box
    assert r['want'] == ['manju12'] and r['score'] == 0 and r['hint'] == [False, True], r

# spec §5.3 (好玩的), ruling 17: 金田 from the cruise — 「ここの おみやげ、ぜんぶ ください！」 — every one of the eight goods on the tray is
# right, either まんじゅう box (or both) counting for the まんじゅう; seven is a miss (his 「ぜんぶですよ、ぜんぶ！」); in his own voice
def test_miyage_kaneda_takes_all_eight(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + CALM + WORK4 + MY + """ card(['S', 'S', 'S', 'S']); state.currentUnit = 'm11';
      const said = []; window.speakAs = (w, l) => { said.push(w + ':' + l); return Promise.resolve(); };
      const seed = seedWhere((sh) => sh.findIndex((c) => c.kind === 'all') > 0), k = where(seed, (c) => c.kind === 'all'); await begin(seed, k);
      const c = my().c, seven = ['manju12', 'senbei', 'jam', 'tenugui', 'kokeshi', 'bath', 'sake'];
      const out = { who: c.who, line: c.line[0], voice: Boolean(CAST_VOICE[c.who]), judge: [seven.concat('keyring'), ['manju6'].concat(seven.slice(1), 'keyring'), seven.concat('keyring', 'manju6'), seven].map((ids) => MIYAGE.judge(c, ids).ok) };
      put(seven); said.length = 0; give(); await wait(500); out.short = said.filter((x) => x.startsWith('kaneda:'));
      put(seven.concat('keyring')); out.tray = my().tray.length; give(); await watch(() => (WORK.today().score || {})[k] !== undefined, 6000); await watch(() => said.some((x) => x.startsWith('kaneda:') && /あげます/.test(x)), 5000);
      out.score = WORK.today().score[k]; out.after = said.filter((x) => x.startsWith('kaneda:')).slice(-1);
      CLASS.close(); return JSON.stringify(out); })()"""))
    assert r['who'] == 'kaneda' and r['voice'] and 'ぜんぶ ください' in r['line'], r
    assert r['judge'] == [True, True, True, False] and r['short'] == ['kaneda:ぜんぶですよ、ぜんぶ！'], r
    assert r['tray'] == 8 and r['score'] == 1 and r['after'] and 'あげます' in r['after'][0], r

# fix round 1, I-1: one どうぞ, one miss — a wrong tray handed twice at once (a double tap; the second while the word is still to be said)
# costs one miss and one word, their words still not shown; どうぞ waits for the tray to change; then the right tray: right with that miss
def test_miyage_one_dozo_one_miss(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + CALM + WORK4 + MY + """ card(['S', 'S', 'S', 'S']); state.currentUnit = 'm11';
      const said = []; window.speakAs = (w, l) => { said.push(w + ':' + l); return Promise.resolve(); };
      const seed = seedWhere((sh) => sh[0].id === 'count10'); await begin(seed, 0); const c = my().c;
      put(['manju6']); await wait(80); said.length = 0; const d = document.querySelector('.wk-miyage .om-give');
      d.click(); const off = d.disabled; d.disabled = false; d.click(); d.disabled = off;   // the second as though どうぞ were still live, while the word is queued
      await wait(500); const out = { off, miss: my().miss, words: said.filter((x) => x.startsWith(c.who + ':')).length, hidden: Boolean(document.querySelector('.wk-miyage .wk-bub .om-dots')), still: d.disabled };
      put(['manju12']); await wait(80); out.again = !d.disabled; give(); await watch(() => (WORK.today().score || {})[0] !== undefined, 6000); out.score = WORK.today().score[0];
      CLASS.close(); return JSON.stringify(out); })()"""))
    assert r['off'] and r['miss'] == 1 and r['words'] == 1 and r['hidden'], r   # one miss, one word; their words still not shown
    assert r['still'] and r['again'] and r['score'] == 1, r   # どうぞ waits for the tray to change

# fix round 1, I-2 (as 駅弁 taught: what is in hand is tapped to put it back): a good on the tray is tapped off it — the tray takes the tap
# (its chips are no targets of their own) and the chip under it goes, the other stays, its place on the shelf filled again; a tap on the
# tray past them takes the nearest; the tray 40 px tall or more; the empty tray says both ways
def test_miyage_a_good_tapped_off_the_tray(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + CALM + WORK4 + MY + """ card(['S', 'S', 'S', 'S']); state.currentUnit = 'm11';
      window.speakAs = () => Promise.resolve(); const seed = seedWhere((sh) => sh[0].id === 'two1'); await begin(seed, 0);
      const t = document.querySelector('.wk-miyage .om-tray'), out = { hint: (t.querySelector('.om-empty') || {}).textContent || '', tall: Math.round(t.getBoundingClientRect().height) };
      const tapAt = (x, y) => t.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: x, clientY: y }));
      put(['sake', 'tenugui']); await wait(150); const r0 = t.querySelector('.om-chip[data-t="sake"]').getBoundingClientRect();
      tapAt(r0.left + r0.width / 2, r0.top + r0.height / 2); await wait(120);
      out.one = [my().tray.slice(), good('sake').classList.contains('om-on'), good('tenugui').classList.contains('om-on')];
      const tr = t.getBoundingClientRect(); tapAt(tr.right - 8, tr.top + tr.height / 2); await wait(120); out.two = my().tray.slice();
      CLASS.close(); return JSON.stringify(out); })()"""))
    assert r['tall'] >= 40 and '放上托盤' in r['hint'] and '放回' in r['hint'], r
    assert r['one'] == [['tenugui'], False, True], r   # the one tapped off, the other stays
    assert r['two'] == [], r   # past the chips: the nearest

# task 2, ruling 16 (review-4's out of scope 1: 金田's tray wrapped at his 5th good — at 390×664 the replies, the talk row and the card's
# foot dropped 28 px, came back at the 6th, dropped 14 px at the 7th): the tray keeps one height through a customer at any count of goods
# the player can put on it — at most every good on the shelves, nine (a good tapped again goes back) — at every width from 360 to 1280 and
# any height. 金田 at his turn (seed 13), the screen turned through six sizes: the goods put one at a time up to all nine, one taken back by
# a tap on the tray where it lies, one on its shelf; after each, the tray 46 px tall and where it was, and his face and bubble, the front,
# どうぞ, the replies, the talk row and the shelves where they were (0.5 px); the chips one row inside the tray, 24 px or more, each at least
# half in sight under the next (the one put last whole, on top)
def test_the_miyage_tray_keeps_one_height(b):
    sizes = ((360, 640), (375, 553), (390, 664), (414, 896), (768, 1024), (1280, 800))
    begin = "(async () => { " + BEGIN + CALM + WORK4 + MY + """ card(['S', 'S', 'S', 'S']); state.currentUnit = 'm11'; window.speakAs = () => Promise.resolve();
      JOBS.pat.scale = 100; const k = where(13, (c) => c.kind === 'all'); await begin(13, k); return my().c.kind; })()"""   # his patience long enough for six sizes
    sweep = """(async () => { const wait = (ms) => new Promise((ok) => setTimeout(ok, ms)), my = () => MIYAGE_RUN.now(), good = (g) => document.querySelector(`.wk-miyage .om-good[data-g="${g}"]`);
      const c = document.querySelector('.wk-miyage .cls-card'), q = (s) => c.querySelector(s), R = (e) => e.getBoundingClientRect(), t = q('.om-tray');
      for (const g of my().tray.slice()) { good(g).click(); await wait(60); } await wait(500);   // the size before's goods back; the screen turned: the holds measured again
      const PARTS = ['.wk-cust .kr-face', '.wk-cust .wk-bub', '.om-front', '.om-tray', '.om-give', '.om-opts', '.om-talk', '.om-shelves'];
      const tops = () => PARTS.map((s) => { const e = q(s); return e ? [R(e).top, R(e).bottom] : null; }), base = tops(), out = { moved: [], tall: [], chips: [], most: 0, backs: [] };
      const look = (what, lying = true) => { tops().forEach((x, i) => { if (x && base[i] && Math.max(Math.abs(x[0] - base[i][0]), Math.abs(x[1] - base[i][1])) > 0.5) out.moved.push([what, PARTS[i], base[i].map(Math.round), x.map(Math.round)]); });
        const tr = R(t), ch = [...t.querySelectorAll('.om-chip')].map(R); out.tall.push(Math.round(tr.height * 10) / 10); out.most = Math.max(out.most, ch.length);
        if (ch.length && lying) out.chips.push([ch.length, Math.round(ch[0].width * 10) / 10, new Set(ch.map((r) => Math.round(r.top))).size, ch.every((r) => r.left >= tr.left + 2 && r.right <= tr.right - 2 && r.top >= tr.top && r.bottom <= tr.bottom),
          Math.round(Math.min(...ch.map((r, i) => (i < ch.length - 1 ? Math.min(r.right, ch[i + 1].left) - r.left : r.width) / r.width)) * 100) / 100]); };   // how many, their size, rows, inside, the least part of one in sight
      const all = MIYAGE.goods().map((g) => g[0]), want = MIYAGE.answer(my().c), extra = all.find((g) => !want.includes(g));
      const still = async () => { await wait(40); await Promise.all(t.getAnimations({ subtree: true }).map((a) => a.finished.catch(() => {}))); };   // a good put drops in (omIn): measured once it lies there
      look('none'); for (const g of want.concat(extra)) { good(g).click(); look('+' + g, false); await still(); look('+' + g); }   // the layout at once, the chips once still
      const r = R(t.querySelector(`.om-chip[data-t="${extra}"]`)); t.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: r.right - 4, clientY: r.top + r.height / 2 })); await still();
      out.backs.push(!my().tray.includes(extra) && my().tray.length === all.length - 1); look('the tray took one back');
      good(want[0]).click(); await still(); out.backs.push(!my().tray.includes(want[0])); look('the shelf took one back');
      return JSON.stringify(Object.assign(out, { size: [innerWidth, innerHeight], goods: all.length })); })()"""
    r = b.run([("metrics", sizes[0]), ("nav", URL), ("wait", READY), ("eval", begin)] + [x for wh in sizes for x in (("metrics", wh), ("eval", sweep))], timeout=120)
    assert r[0] == 'all', r[0]
    for x in map(json.loads, r[1:]):
        assert x['goods'] == 9 and x['most'] == 9 and x['backs'] == [True, True] and x['moved'] == [] and set(x['tall']) == {46}, x   # every good on it at once: nine
        assert all(rows == 1 and inside and size >= 23.9 and seen >= 0.5 for _, size, rows, inside, seen in x['chips']), x

# fix round 1, M-1: each step its own clock and a fresh mood — a customer kept waiting through their pick (💦) starts their favour calm
def test_miyage_a_second_step_starts_calm(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + CALM + WORK4 + MY + """ card(['S', 'S', 'S', 'S']); state.currentUnit = 'm11';
      window.speakAs = () => Promise.resolve(); const seed = seedWhere((sh) => sh.findIndex((c) => c.id === 'wrap1') > 0), k = where(seed, (c) => c.id === 'wrap1'); await begin(seed, k);
      const cu = () => document.querySelector('.wk-miyage .wk-cust'), mood = () => [cu().dataset.mood || '', (cu().querySelector('.wk-emo') || {}).textContent || ''];
      JOBS.pat.scale = 0.1; await watch(() => cu().dataset.mood === 'meh', 8000); JOBS.pat.scale = 1; const was = mood();
      put(['kokeshi']); give(); await watch(() => my().phase === 'reply' && ready(), 6000); await wait(200);
      const out = { was, now: mood(), bar: parseFloat(cu().querySelector('.wk-pat').style.getPropertyValue('--p')) }; CLASS.close(); return JSON.stringify(out); })()"""))
    assert r['was'] == ['meh', '💦'] and r['now'] == ['', ''] and r['bar'] > 0.9, r

# spec §5, Review Focus 2: the first shift — 竹内's first word, then the card (the town's record, 「湯けむり」); the Chinese of the hero's
# reply under it once said (ruling 23); ten customers all right at once: S, 240 + 50 and ベテラン's 4% (302 円); the next day's shift shut
# after three customers is taken up at the fourth on the same seed, nothing counted twice
def test_miyage_shift_and_resume(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + CALM + WORK4 + MY + """ card(['S', 'S', 'S', 'S']); state.currentUnit = 'm11'; state.settings.musicVol = 1; saveState(); const out = {};
      const said = []; window.speakAs = (w, l) => { said.push(w + ':' + l); return Promise.resolve(); }; await at('yudori'); WORK.start(yard(), 'miyage');
      for (let i = 0; i < 40 && !document.querySelector('.wk-miyage'); i++) { click('.talk'); await wait(150); }   // 竹内's first word, tapped through
      out.first = Boolean(document.querySelector('.wk-miyage')); out.music = MUSIC.wants(); out.firstWord = ((TOWN.WORK.first || {}).miyage || []).length;
      let zh = '', kids = 0, seen = 0; const look = setInterval(() => { const m = document.querySelector('.wk-miyage .om-talk .wk-say.om-me span'); if (m && m.textContent) zh = m.textContent;
        document.querySelectorAll('.wk-miyage .om-opt').forEach((o) => { seen++; kids = Math.max(kids, o.children.length); }); }, 30);   // the replies: their Japanese only (ruling 23)
      await work(10); await watch(() => WORK.today() && WORK.today().yen !== undefined, 30000); clearInterval(look); const x = WORK.today() || {};
      out.paid = [x.grade, x.yen, Object.values(x.score || {})]; out.zh = zh; out.opts = [seen > 0, kids];
      await watch(() => document.querySelector('.wk-result'), 15000); out.result = Boolean(document.querySelector('.wk-result')); document.querySelectorAll('.wk-result').forEach((e) => e.remove()); CLASS.close();
      const A = TOWN.ONSEN.miyage.say; out.bye = [said.includes('makoto:' + A.all[0]), said.includes('makoto:' + A.end[0])];   // all right at once: his all-right word (M-8)
      TOWNEV.clock = { h: 10, day: new Date(2026, 10, 11) }; await at('yudori'); WORK.start(yard(), 'miyage'); await watch(() => my() && my().k === 0 && ready(), 12000);
      out.talk = Boolean(document.querySelector('.talk-card')); const seed = my().seed;
      await work(3); await watch(() => (WORK.today() || {}).done >= 3 && my().k === 3, 8000); await wait(300); CLASS.close(); await wait(200);
      out.score = (WORK.today() || {}).score; WORK.start(yard(), 'miyage'); await watch(() => my() && my().k === 3 && ready(), 12000); out.k = my() && my().k; out.same = Boolean(my()) && my().seed === seed; CLASS.close();
      return JSON.stringify(out); })()"""))
    assert r['first'] and r['music'] == 'onsen' and r['firstWord'] >= 1, r   # 竹内's first word, then the card and the town's record
    assert r['zh'] and r['opts'] == [True, 1], r   # the hero's reply with its Chinese under it (the first shift), never under the buttons
    assert r['paid'] == ['S', 302, [0] * 10] and r['result'] and r['bye'] == [True, False], r   # 240 + S 50, ベテラン's 4%; 竹内's 「すごい！…」
    assert not r['talk'] and r['score'] == {'0': 0, '1': 0, '2': 0} and r['k'] == 3 and r['same'], r

# spec §5 (M-2 of Task 4): a customer who gives up waiting goes — what they said shown whole, the right goods lit on the shelves, their
# leaving word popping up beside it; the task lost
def test_a_miyage_customer_who_leaves_shows_what_they_wanted(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + CALM + WORK4 + MY + """ card(['S', 'S', 'S', 'S']); state.currentUnit = 'm11';
      window.speakAs = () => Promise.resolve(); const seed = seedWhere((sh) => sh[0].id === 'two2'); await begin(seed, 0);
      const c = my().c; JOBS.pat.scale = 0.02; await watch(() => my().phase === 'done', 8000); await wait(120); JOBS.pat.scale = 1;
      const cu = document.querySelector('.wk-miyage .wk-cust'), bub = cu.querySelector('.wk-bub').textContent, g = cu.querySelector('.wk-grr');
      const lit = [...document.querySelectorAll('.wk-miyage .om-good.wk-hint')].map((x) => x.dataset.g).sort();
      const out = { q: bub.includes(c.line[1]), grr: Boolean(g) && /いいです/.test(g.textContent), lit, want: c.want.slice().sort(), score: WORK.today().score[0] }; CLASS.close(); return JSON.stringify(out); })()"""))
    assert r['q'] and r['grr'] and r['lit'] == r['want'] and r['score'] == 3, r

# Review Focus 5 (ruling 27): each line said to its end — a wrong tray while the customer is still speaking (their word, or 竹内's, after
# theirs), a two-step customer's favour after the hero's どうぞ, the next customer's いらっしゃいませ after the thanks; on a shift taken up
# at its last customer, the thanks and 竹内's goodbye said whole before the results
def test_miyage_says_each_line_to_its_end(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + CALM + WORK4 + MY + SAYS + """ card(['S', 'S', 'S', 'S']); state.currentUnit = 'm11'; const out = {};
      const seed = seedWhere((sh) => sh[0].kind !== 'all' && ['reply', 'offer'].includes(sh[1].kind)); shiftAt(seed); await at('yudori'); WORK.start(yard(), 'miyage');
      await watch(() => my() && my().k === 0 && my().phase === 'pick' && talking, 15000);   // the customer speaking
      put(MIYAGE.goods().map((g) => g[0]).filter((g) => !MIYAGE.judge(my().c, [g]).ok).slice(0, 1)); give();   // a wrong tray while they speak
      await work(2); await watch(() => my() && my().k === 2 && ready(), 30000); await hush();
      out.miss = WORK.today().score[0]; CLASS.close();
      TOWNEV.clock = { h: 10, day: new Date(2026, 10, 11) }; shiftAt(seed, 9, upTo(9)); await at('yudori'); WORK.start(yard(), 'miyage'); await work(10);
      await watch(() => document.querySelector('.wk-result'), 30000); out.end = [__log.slice(-1)[0], talking, Boolean(document.querySelector('.wk-result'))];
      out.cut = __cut; document.querySelectorAll('.wk-result').forEach((e) => e.remove()); return JSON.stringify(out); })()"""))
    assert r['cut'] == [] and r['miss'] == 1, r
    assert r['end'][0].startswith('makoto:') and r['end'][1] is None and r['end'][2], r   # his goodbye the last line, said whole before the results

# N-1 of Task 4: the voice lane is its card's — a wrong tray given while the customer is still speaking queues a word; the card shut at
# once and the job begun again: the old word is never said nor shown in the new card, and the new shift's first lines are said whole
def test_a_shut_miyage_card_says_nothing_more(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + CALM + WORK4 + MY + LANE + """ card(['S', 'S', 'S', 'S']); state.currentUnit = 'm11';
      const seed = seedWhere((sh) => sh[0].kind === 'got'); shiftAt(seed); await at('yudori'); WORK.start(yard(), 'miyage');
      const begun = () => { const n = my(); return n && n.phase === 'pick' && log.some(([, w, l]) => w === n.c.who && l === n.c.line[0]); };
      await watch(begun, 20000); await wait(200); put(MIYAGE.goods().map((g) => g[0]).filter((g) => !MIYAGE.judge(my().c, [g]).ok).slice(0, 1)); give(); await wait(100);
      const at0 = ms(); CLASS.close(); WORK.start(yard(), 'miyage'); await wait(4500);
      const S = TOWN.ONSEN.miyage.say, after = log.filter(([m]) => m >= at0), out = { old: after.filter(([, w, l]) => w === 'makoto' && l === S.pick[0]).length,
        cut: cuts.filter(([m]) => m >= at0).map(([, x]) => x), bad: Boolean(document.querySelector('.wk-miyage .wk-say.bad')), card: Boolean(document.querySelector('.wk-miyage')), said: after.map(([, w]) => w) };
      CLASS.close(); return JSON.stringify(out); })()"""))
    assert r['old'] == 0 and r['cut'] == [] and not r['bad'] and r['card'], r
    assert r['said'][:1] == ['makoto'] and 'hero' in r['said'], r   # the new shift's start, then the hero's いらっしゃいませ, each whole

# the card (spec §5.3, §9): ゆのはな堂's two shelves of the eight goods (the まんじゅう in its two boxes) — each a picture, its name with
# its reading, its price, the まんじゅう's pieces — the tasting plate and the tray on the counter, どうぞ, the customer and their patience;
# on a 360-px phone and a 390-px one it stays inside the screen, every button 40 px or more, the tags' words 11 px or more, their
# readings 8.5 px or more (fix round 1, M-4: にゅうよくざい still inside its tag; a box's pieces read whole, ろっこいり, じゅうにこいり);
# at a reply the replies and the talk row in sight — the talk row whole where the card holds it all; where it does not (360×640: the
# shelves' floor of 136 px kept in sight first, rulings 11 and 13), its centre in sight under the header and taking a tap, as the iPhone
# tests have it at 390×664 (fix round 3); at a pick after two misses the shelves still in reach (M-8)
def test_the_miyage_card_fits_a_phone(b):
    out = {}
    for w, h in ((360, 640), (390, 844)):
        out[w] = json.loads(b.run([("metrics", (w, h)), ("nav", URL), ("wait", READY), ("eval", "(async () => { " + BEGIN + CALM + WORK4 + MY + """ card(['S', 'S', 'S', 'S']); state.currentUnit = 'm11';
          window.speakAs = () => Promise.resolve(); const seed = seedWhere((sh) => sh.findIndex((c) => c.kind === 'offer') > 0), k = where(seed, (c) => c.kind === 'offer');
          state.work.res[dateStr(TOWNEV.today())] = { place: 'miyage', done: k, score: upTo(k), keep: { seed } }; saveState();   // a first shift: the hero's 中文 shown
          await at('yudori'); WORK.start(yard(), 'miyage'); for (let i = 0; i < 40 && !document.querySelector('.wk-miyage'); i++) { click('.talk'); await wait(120); }
          await watch(() => my() && my().k === k && ready(), 12000); await wait(300);
          const c = document.querySelector('.wk-miyage .cls-card'), q = c.getBoundingClientRect(), R = (e) => e.getBoundingClientRect();
          const goods = [...c.querySelectorAll('.om-good')], btns = () => [...c.querySelectorAll('button')].filter((x) => x.offsetParent).map((x) => [x.className, Math.round(R(x).width), Math.round(R(x).height)]).filter(([, ww, hh]) => ww < 40 || hh < 40);
          const small = [...c.querySelectorAll('.om-tag *')].filter((e) => e.childNodes.length && [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()) && e.tagName !== 'RT' && parseFloat(getComputedStyle(e).fontSize) < 11).map((e) => e.className + ':' + e.textContent);
          const pick = { inside: q.left >= 0 && q.right <= innerWidth + 1 && q.top >= 0 && q.bottom <= innerHeight + 1, goods: goods.length, parts: goods.every((g) => g.querySelector('.om-pic svg') && g.querySelector('.om-tag b') && /円/.test(g.textContent)),
            manju: goods.filter((g) => /個入/.test(g.textContent)).map((g) => g.dataset.g), plate: Boolean(c.querySelector('.om-counter .om-plate')), tray: Boolean(c.querySelector('.om-counter .om-tray')), give: Boolean(c.querySelector('.om-counter .om-give')),
            cust: Boolean(c.querySelector('.wk-cust .kr-face') && c.querySelector('.wk-cust .wk-pat')), btns: btns(), small: small.slice(0, 5),
            rt: Math.min(...[...c.querySelectorAll('.om-tag rt, .om-sign rt')].map((e) => parseFloat(getComputedStyle(e).fontSize))),
            pieces: [...c.querySelectorAll('.om-good[data-g^="manju"] .om-tag b')].map((e) => { const rb = e.querySelector('ruby'); return rb ? [rb.firstChild.textContent, (rb.querySelector('rt') || {}).textContent] : [e.textContent]; }),
            bath: ['bath', 'manju12', 'manju6'].map((id) => { const g = c.querySelector(`.om-good[data-g="${id}"]`), t = R(g.querySelector('.om-tag')), n = R(g.querySelector('.om-tag rt')); return n.left >= t.left - 0.5 && n.right <= t.right + 0.5; }) };   // 入浴剤, and the tightest: じゅうにこいり (parked 6)
          put(MIYAGE.answer(my().c)); await wait(60); give(); await watch(() => my().phase === 'reply' && ready(), 8000); await wait(300);
          const fit = () => { const qq = R(c), top = Math.max(qq.top + c.clientTop, R(c.querySelector('.wk-head')).bottom), bot = qq.top + c.clientTop + c.clientHeight, inv = (e) => Boolean(e) && R(e).top >= top - 1 && R(e).bottom <= bot + 1;   // in sight: under the sticky header (task 2, ruling 17)
            const tapAt = (e) => { const r = R(e), x = r.left + r.width / 2, y = r.top + r.height / 2; if (y < Math.max(top, R(c.querySelector('.wk-head')).bottom) || y > bot) return false; const h = document.elementFromPoint(x, y); return Boolean(h && (h === e || e.contains(h))); };
            return [[...c.querySelectorAll('.om-opt')].every(inv), (c.scrollHeight - c.clientHeight > 1 ? tapAt : inv)(c.querySelector('.om-talk')), inv(c.querySelector('.wk-cust .wk-bub'))]; };   // the talk row whole where the card holds it all (ruling 13)
          const ask = fit(), btns2 = btns(); const w = opt(false); w.click(); await wait(500); const wrong = fit(); opt(true).click(); await wait(900); const right = fit();
          CLASS.close(); return JSON.stringify({ pick, ask, wrong, right, btns2 }); })()""")])[-1])
    for w, x in out.items():
        p = x['pick']
        assert p['inside'] and p['goods'] == 9 and p['parts'] and p['manju'] == ['manju6', 'manju12'] and p['plate'] and p['tray'] and p['give'] and p['cust'], (w, out)
        assert p['btns'] == [] and x['btns2'] == [] and p['small'] == [], (w, out)
        assert p['rt'] >= 8.5 and p['bath'] == [True, True, True] and p['pieces'] == [['6個入', 'ろっこいり'], ['12個入', 'じゅうにこいり']], (w, out)   # M-4
        assert x['ask'] == [True, True, True] and x['wrong'] == [True, True, True] and x['right'][1], (w, out)
    # M-8 (fix round 1): a pick after two misses — their words opened, the right goods lit, 竹内's word with its reason — on a first shift
    # at 360×640 and 390×844: every good still inside the card's view, the words and the talk row too
    reach = {}
    for w, h in ((360, 640), (390, 844)):
        reach[w] = json.loads(b.run([("metrics", (w, h)), ("nav", URL), ("wait", READY), ("eval", "(async () => { " + BEGIN + CALM + WORK4 + MY + """ card(['S', 'S', 'S', 'S']); state.currentUnit = 'm11';
          window.speakAs = () => Promise.resolve(); const seed = seedWhere((sh) => sh[0].id === 'two1');
          state.work.res[dateStr(TOWNEV.today())] = { place: 'miyage', done: 0, score: {}, keep: { seed } }; saveState();   // a first shift: the most to show
          await at('yudori'); WORK.start(yard(), 'miyage'); for (let i = 0; i < 40 && !document.querySelector('.wk-miyage'); i++) { click('.talk'); await wait(120); }
          await watch(() => my() && my().k === 0 && ready(), 15000); await wait(200);
          put(['jam']); give(); await watch(() => ready(), 4000); await wait(200); put(['kokeshi']); give(); await watch(() => ready(), 4000); await wait(400);
          const c = document.querySelector('.wk-miyage .cls-card'), R = (e) => e.getBoundingClientRect(), q = R(c), top = Math.max(q.top + c.clientTop, R(c.querySelector('.wk-head')).bottom), bot = q.top + c.clientTop + c.clientHeight, inv = (e) => R(e).top >= top - 1 && R(e).bottom <= bot + 1;
          const out = { open: Boolean(c.querySelector('.wk-bub.wk-open')), lit: c.querySelectorAll('.om-good.wk-hint').length, goods: [...c.querySelectorAll('.om-good')].every(inv), bub: inv(c.querySelector('.wk-cust .wk-bub')), talk: inv(c.querySelector('.om-talk')), miss: my().miss };
          CLASS.close(); return JSON.stringify(out); })()""")])[-1])
    assert all(x == {'open': True, 'lit': 2, 'goods': True, 'bub': True, 'talk': True, 'miss': 2} for x in reach.values()), reach

# the generator (生成) has the おみやげ屋's lines: every customer's words (and their favour, their word after, what they say to a wrong
# tray) in their own voice, the hero's every right reply, 竹内's words and his first; every customer one the town already voices
def test_the_generator_has_the_miyage_lines(b):
    r = json.loads(ev(b, """(() => { const all = new Set(talkLines().map(([w, l]) => w + '|' + l)), miss = [], need = (w, l) => { if (l && !all.has(w + '|' + l)) miss.push(w + '|' + l); };
      MIYAGE.ids().map((id) => MIYAGE.cust(id)).forEach((c) => { need(c.who, c.line[0]); if (c.then) need(c.who, c.then[0]); need(c.who, (c.after || TOWN.ONSEN.miyage.thanks)[0]);
        Object.values(c.no || {}).forEach((l) => need(c.who, l[0])); if (c.over) need(c.who, c.over[0]); if (c.short) need(c.who, c.short[0]); if (c.opts) need('hero', c.opts.find((o) => o[2])[0]); });
      const M = TOWN.ONSEN.miyage, S = M.say; Object.entries(S).filter(([k]) => k !== 'who').forEach(([, l]) => (Array.isArray(l[0]) ? l : [l]).forEach((x) => need('makoto', x[0])));
      need('hero', M.hi[0]); need('hero', M.give[0]); ((TOWN.WORK.first || {}).miyage || []).forEach((l) => need(l[0], l[1]));
      return JSON.stringify({ miss: [...new Set(miss)].slice(0, 6), voices: Object.keys(CAST_VOICE).length, first: ((TOWN.WORK.first || {}).miyage || []).length }); })()"""))
    assert r['miss'] == [] and r['voices'] == 69 and r['first'] >= 1, r   # 69: the フロント's sumo wrestler (Task 7)

# the shelves' pictures (spec §5.3, ruling 4): each good drawn — the town's own (PICS_TOWN) for those that are no course word, the まんじゅう's
# two boxes each its own; each picture a drawing of some detail (a dozen shapes or more), the six and the twelve not the same drawing
def test_the_miyage_goods_are_drawn(b):
    r = json.loads(ev(b, """(() => { const pic = (k) => PICS_TOWN[k] || PICS[k] || ''; const gs = MIYAGE.goods();
      return JSON.stringify({ drawn: gs.map((g) => [g[0], Boolean(pic(g[4])), (pic(g[4]).match(/<(path|ellipse|circle|rect|polygon)/g) || []).length]), town: gs.map((g) => Boolean(PICS_TOWN[g[4]])),
        boxes: pic(gs[0][4]) !== pic(gs[1][4]) }); })()"""))
    assert all(x[1] and x[2] >= 12 for x in r['drawn']) and all(r['town']) and r['boxes'], r

# ---- Task 7: フロント (spec §5.4, §3.4; rulings 15, 23, 27, 28 and the dispatch's) ----
# fr(): the guest at the desk now (FRONT_RUN.now(): k, task, phase, step, miss, morning); fc(): its card; opt(right): a right reply (never the
# birthday wish) or a wrong one; key(room): a tag on the board; serve(): the step there now done right (a reply; their key); work(to): guests
# served up to task `to`; shiftAt(seed, morning, done, score): the day's record (been before: no first word); seedWhere(f, morning): a shift
# (FRONT.make) for which f holds; begin(seed, k, morning): the shift taken up at task k, its guest asked (9:00 a morning's, 15:00 an
# afternoon's: 佐藤 is at the desk 7–11 and 14–22)
FR = """const fr = () => FRONT_RUN.now(), m15 = TOWNEV.unitIdx('m15'), fc = () => document.querySelector('.wk-front');
  const opt = (right) => { const n = fr(), i = n.task.opts.findIndex((o) => (right ? o[2] && o[3] !== 'bday' : !o[2])); return document.querySelector(`.wk-front .fr-opt[data-o="${i}"]`); };
  const key = (room) => document.querySelector(`.wk-front .fr-key[data-room="${room}"]`);
  const ready = () => { const n = fr(); return Boolean(n) && n.phase === 'ask'; };
  async function serve() { const n = fr(); if (!ready()) return false; if (n.step === 1) { key(n.task.room).click(); return true; } const b = opt(true); if (b && !b.disabled) b.click(); return true; }
  const before = (to) => Boolean(fr()) && fr().k < to;
  async function work(to) { let at = -1, since = Date.now(); while (before(to) && Date.now() - since < 25000) { await watch(() => ready() || !before(to), 3000); if (!before(to)) break; if (fr().k !== at) { at = fr().k; since = Date.now(); } await serve(); await wait(150); } }
  const shiftAt = (seed, morning, done = 0, score = {}) => { state.work.res['2026-10-20'] = { place: 'front', done: 10, score: {}, yen: 1, grade: 'C' }; state.work.res[dateStr(TOWNEV.today())] = { place: 'front', done, score, keep: { seed, morning } }; saveState(); };
  const seedWhere = (f, morning = false, from = 1) => { for (let s = from; s < 8000; s++) { if (f(FRONT.make(m15, morning, s))) return s; } return 0; };
  const where = (s, morning, f) => FRONT.make(m15, morning, s).tasks.findIndex(f);
  const upTo = (k) => Object.fromEntries(Array.from({ length: k }, (_, i) => [i, 0]));
  const clock = (morning, d = 10) => { TOWNEV.clock = { h: morning ? 9 : 15, day: new Date(2026, 10, d) }; };
  const begin = async (seed, k, morning = false) => { clock(morning); shiftAt(seed, morning, k, upTo(k)); await at('ryokan'); WORK.start(yard(), 'front'); await watch(() => fr() && fr().k === k && ready(), 15000); await wait(150); };"""

# spec §5.4 (入住), the dispatch's ruling 2: a guest checking in gives their name — heard, not shown — the hero greets them (お待ちして
# おりました), then finds them in today's 予約台帳 (five parties, names in kanji with their readings over them, each in its own room) and taps
# their room's key on the board: another key is a miss (佐藤's word) and stays; theirs leaves the board for them, their row is marked in,
# 「金田様、お部屋は …の間で ございます」 (their name at last: fix round 1, M-7); each check-in's party is in the book, its room the one its key
# opens
def test_front_checkin_finds_the_key_in_the_book(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + CALM + WORK4 + FR + """ card(['S', 'S', 'S', 'S']); state.currentUnit = 'm15';
      const said = []; window.speakAs = (w, l) => { said.push(w + ':' + l); return Promise.resolve(); };
      const sweep = []; for (let s = 1; s <= 150; s++) [false, true].forEach((mo) => { const sh = FRONT.make(m15, mo, s);
        if (sh.book.length !== 5 || new Set(sh.book.map((p) => p.room)).size !== 5 || new Set(sh.book.map((p) => p.name)).size !== 5 || sh.book.some((p) => !p.kana || !(p.n >= 1))) sweep.push(s + ':book');
        sh.tasks.filter((t) => t.kind === 'checkin').forEach((t) => { const p = sh.book[t.party]; if (!p || p.room !== t.room || p.who !== t.who || p.in || !t.q[0].includes(p.name)) sweep.push(s + ':' + t.who); }); });
      const seed = seedWhere((sh) => sh.tasks[0].kind === 'checkin' && !sh.tasks[0].bday), sh = FRONT.make(m15, false, seed); await begin(seed, 0);
      const t = fr().task, out = { sweep: sweep.slice(0, 5), kind: t.kind, dots: Boolean(fc().querySelector('.wk-bub .fr-dots')), opts: fc().querySelectorAll('.fr-opt').length, rows: fc().querySelectorAll('.fr-row').length };
      opt(true).click(); await watch(() => fr().step === 1 && ready(), 6000); await wait(100);
      out.step = fr().step; out.dotsStill = Boolean(fc().querySelector('.wk-bub .fr-dots'));
      const row = [...fc().querySelectorAll('.fr-row')].find((x) => (x.querySelector('.fr-nm rt') || {}).textContent === sh.book[t.party].kana);
      out.room = row && row.dataset.room; out.want = t.room;
      const other = FRONT.ROOMS.map((x) => x[0]).find((x) => x !== t.room && !key(x).classList.contains('fr-out')); key(other).click(); await wait(300);
      out.miss = fr().miss; out.word = said.filter((x) => x.startsWith('sato:')).slice(-1)[0] || ''; out.otherOn = !key(other).classList.contains('fr-out');
      key(t.room).click(); await watch(() => fr() && fr().k === 1, 8000); await wait(200);
      out.gone = key(t.room).classList.contains('fr-out'); out.tick = Boolean(fc().querySelector(`.fr-row[data-room="${t.room}"].fr-in`));
      const p0 = sh.book[t.party]; out.roomLine = said.includes('hero:' + FRONT.roomLine(t.who, t.room)[0]) && FRONT.roomLine(t.who, t.room)[0].startsWith(`{${p0.name}|${p0.kana}}`);   // their name with their room (fix round 1, M-7)
      out.score = WORK.today().score[0]; CLASS.close(); return JSON.stringify(out); })()"""))
    assert r['sweep'] == [] and r['kind'] == 'checkin' and r['dots'] and r['opts'] == 3 and r['rows'] == 5, r
    assert r['step'] == 1 and r['dotsStill'] and r['room'] == r['want'], r   # their name still only heard; their row's room is the key's
    assert r['miss'] == 1 and '{鍵|かぎ}' in r['word'] and r['otherOn'], r   # another key: 佐藤's word, a miss; nothing handed over
    assert r['gone'] and r['tick'] and r['roomLine'] and r['score'] == 1, r

# rulings 15 and 1 of the dispatch: every wrong reply turns the keigo the wrong way — 尊敬語 on what we do ('self': お〜に なる, いらっしゃる,
# おいでに なる, 〜て くださる, なさる), 謙譲語 on what the guest does ('guest': いただく, お〜する, 伺う), いらっしゃる／おる for a thing
# ('thing') — or, where the book has the answer, misreads it ('fact'); never a plain reply, never 「何時に いたしますか」 (the inn's own
# いたしましょうか) nor 「何時に いらっしゃいますか」 (the guest's); each wrong one's 中文 says whose doing it is; the spec's own (お待ちに なって
# おりました, お持ちに なります, 一階の 奥に いらっしゃいます) among them; every kind turns up
def test_front_keigo_decoys_are_direction_errors(b):
    r = json.loads(ev(b, """(() => { const bad = [], seen = {}, MARK = /\\{([^|}]+)\\|[^}]+\\}/g, plain = (s) => s.replace(MARK, '$1'), words = new Set();
      const SELF = /に な[りっ]|いらっしゃ|おいでに|くださ|なさ/, GUEST = /いただ|伺|お[^\\s、。]{1,4}し(ます|て)/, THING = /いらっしゃ|おり/;
      const KEIGO = /ござい|おり|いたし|いらっしゃ|なさ|いただ|伺|くださ|お[^\\s、。]{1,4}し(ます|て|ません)|に な[りっ]|でしょうか|おめでとう/;
      [TOWNEV.unitIdx('m15'), TOWNEV.unitIdx('m17')].forEach((u) => { for (let s = 1; s <= 200; s++) [false, true].forEach((mo) => FRONT.make(u, mo, s).tasks.forEach((t) => {
        const id = t.kind + (t.fun ? ':' + t.fun : ''), w = t.opts.filter((o) => !o[2]), right = t.opts.filter((o) => o[2]);
        if (t.opts.length !== (t.bday ? 4 : 3) || w.length !== 2 || right.length !== (t.bday ? 2 : 1) || new Set(t.opts.map((o) => o[0])).size !== t.opts.length) bad.push(id + ':count');
        t.opts.forEach(([ja, zh, ok, how]) => { const p = plain(ja); words.add(p); seen[how || 'right'] = (seen[how || 'right'] || 0) + 1;
          if (!KEIGO.test(p)) bad.push(id + ':plain:' + p);
          if (!zh) bad.push(id + ':no zh:' + p);
          if (/何時に いたしますか|何時に いらっしゃいますか|また 来て/.test(p)) bad.push(id + ':fair:' + p);
          if (ok) { if (!['', 'bday'].includes(how)) bad.push(id + ':right how ' + how); return; }
          if (!['self', 'guest', 'thing', 'fact'].includes(how)) bad.push(id + ':how:' + how);
          if (how === 'fact' && t.kind !== 'memo') bad.push(id + ':fact outside the book');
          if (how === 'self' && !(SELF.test(p) && /我/.test(zh))) bad.push(id + ':self:' + p);
          if (how === 'guest' && !(GUEST.test(p) && /客人/.test(zh))) bad.push(id + ':guest:' + p);
          if (how === 'thing' && !(THING.test(p) && /東西|地方/.test(zh))) bad.push(id + ':thing:' + p);
          if (how === 'fact' && !/台帳/.test(zh)) bad.push(id + ':fact:' + p); }); })); });
      return JSON.stringify({ bad: [...new Set(bad)].slice(0, 8), seen, spec: ['お待ちに なって おりました。', 'お荷物を お持ちに なります。', '一階の 奥に いらっしゃいます。'].map((x) => words.has(x)) }); })()"""))
    assert r['bad'] == [], r
    assert all(r['seen'].get(k, 0) > 0 for k in ('right', 'self', 'guest', 'thing', 'fact', 'bday')), r
    assert r['spec'] == [True, True, True], r

# spec §5.4: check-outs come only on the morning shift (佐藤 7–11) — three a morning, none an afternoon (14–22), where the check-ins are
# (three or four; one in a morning); a morning's first guest is leaving, an afternoon's arriving; no guest twice running; a shift begun
# at 9:00 is a morning's — kept with its seed, so the same shift is taken up in the afternoon — one begun at 15:00 an afternoon's
def test_front_checkout_only_in_the_morning(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + CALM + WORK4 + FR + """ card(['S', 'S', 'S', 'S']); state.currentUnit = 'm15'; window.speakAs = () => Promise.resolve();
      const n = (sh, k) => sh.tasks.filter((t) => t.kind === k).length, bad = [];
      for (let s = 1; s <= 300; s++) { const am = FRONT.make(m15, true, s), pm = FRONT.make(m15, false, s);
        if (am.tasks.length !== 10 || pm.tasks.length !== 10 || !am.morning || pm.morning) bad.push(s + ':n');
        if (n(am, 'checkout') !== 3 || n(pm, 'checkout') !== 0) bad.push(s + ':out');
        if (n(am, 'checkin') !== 1 || ![3, 4].includes(n(pm, 'checkin'))) bad.push(s + ':in');
        if (am.tasks[0].kind !== 'checkout' || pm.tasks[0].kind !== 'checkin') bad.push(s + ':first');
        [am, pm].forEach((sh) => sh.tasks.forEach((t, k) => { if (k && t.who === sh.tasks[k - 1].who) bad.push(s + ':running'); })); }
      const out = { bad: bad.slice(0, 6) }; state.work.res['2026-10-20'] = { place: 'front', done: 10, score: {}, yen: 1, grade: 'C' }; saveState();
      clock(true); await at('ryokan'); WORK.start(yard(), 'front'); await watch(() => fr() && ready(), 15000); out.am = [fr().morning, fr().task.kind, WORK.today().keep.morning]; CLASS.close();
      clock(false); await at('ryokan'); WORK.start(yard(), 'front'); await watch(() => fr() && ready(), 15000); out.later = [fr().morning, fr().k, fr().task.kind]; CLASS.close();
      clock(false, 11); await at('ryokan'); WORK.start(yard(), 'front'); await watch(() => fr() && ready(), 15000); out.pm = [fr().morning, fr().task.kind]; CLASS.close();
      return JSON.stringify(out); })()"""))
    assert r['bad'] == [], r
    assert r['am'] == [True, 'checkout', True] and r['later'] == [True, 0, 'checkout'] and r['pm'] == [False, 'checkin'], r

# spec §5.4 (好玩的): a party whose row in the book says お誕生日 — at their check-in a fourth reply, 「お誕生日 おめでとう ございます。」: the
# hero says it, they are glad (their own word) and leave a 心付け — 50 円, kept with the day's record over a break (the card shut before
# their key and taken up again: the wish once more, the tip not twice), on top of the pay; the plain greeting is right too, with no tip;
# no other guest has the wish
def test_front_birthday_line_adds_a_tip(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + CALM + WORK4 + FR + """ card(['S', 'S', 'S', 'S']); state.currentUnit = 'm15';
      const said = []; window.speakAs = (w, l) => { said.push(w + ':' + l); return Promise.resolve(); };
      const bad = []; for (let s = 1; s <= 300; s++) [false, true].forEach((mo) => { const sh = FRONT.make(m15, mo, s);
        sh.tasks.forEach((t) => { const wish = t.opts.some((o) => o[3] === 'bday'), row = t.kind === 'checkin' && sh.book[t.party];
          if (wish !== Boolean(row && row.memo === 'bday') || wish !== Boolean(t.bday)) bad.push(s + ':' + t.kind); }); });
      const seed = seedWhere((sh) => sh.tasks.slice(1, 9).some((t) => t.bday)), k = where(seed, false, (t) => t.bday); await begin(seed, k);
      const t = fr().task, i = t.opts.findIndex((o) => o[3] === 'bday'); fc().querySelector(`.fr-opt[data-o="${i}"]`).click();
      await watch(() => fr().step === 1 && ready(), 8000); const keep = Object.assign({}, WORK.today().keep), glad = said.filter((x) => x.startsWith(t.who + ':')).slice(-1)[0] || '', dots = Boolean(fc().querySelector('.wk-bub .fr-dots'));   /* their gladness said, the bubble back to what 🔊 plays: their name, heard (M-8) */
      CLASS.close(); await wait(200); WORK.start(yard(), 'front'); await watch(() => fr() && fr().k === k && ready(), 15000);   // shut before their key, taken up again: the wish again, no second tip
      fc().querySelector(`.fr-opt[data-o="${i}"]`).click(); await watch(() => fr().step === 1 && ready(), 8000); const again = WORK.today().keep.tip;
      await work(10); await watch(() => WORK.today() && WORK.today().yen !== undefined, 30000); const x = WORK.today();
      const out = { bad: bad.slice(0, 5), keep, again, dots, glad: glad === t.who + ':' + TOWN.ONSEN.front.named[t.who].bday[0], wish: said.includes('hero:' + TOWN.ONSEN.front.bday[0]), tip: x.tip, yen: x.yen, grade: x.grade };
      await watch(() => document.querySelector('.wk-result'), 15000); out.row = /心付け/.test((document.querySelector('.wk-result') || {}).textContent || ''); document.querySelectorAll('.wk-result').forEach((e) => e.remove()); CLASS.close();
      clock(false, 11); shiftAt(seed, false, k, upTo(k)); await at('ryokan'); WORK.start(yard(), 'front'); await watch(() => fr() && fr().k === k && ready(), 15000);
      opt(true).click(); await work(10); await watch(() => WORK.today() && WORK.today().yen !== undefined, 30000); out.plain = [WORK.today().tip, WORK.today().yen]; document.querySelectorAll('.wk-result').forEach((e) => e.remove()); CLASS.close();
      return JSON.stringify(out); })()"""))
    assert r['bad'] == [], r
    assert r['wish'] and r['glad'] and r['keep'].get('tip') == 50 and r['keep'].get('seed') and r['again'] == 50, r   # kept over a break, never given twice
    assert r['dots'], r   # at their key the bubble holds their words unread, as 🔊 plays them (fix round 1, M-8)
    assert r['tip'] == 50 and r['grade'] == 'S' and r['yen'] == 260 + 50 + 50 + round((260 + 50 + 50) * 0.04) and r['row'], r   # 374
    assert r['plain'] == [0, 260 + 50 + round((260 + 50) * 0.04)], r   # 322: the plain greeting, no tip

# spec §5, Review Focus 2: the first shift — 佐藤's first word, then the card (the town's record, 「湯けむり」); the hero's reply with its
# Chinese under it once said, never under the reply buttons (ruling 23); ten guests right at once: S, 260 + 50 and ベテラン's 4% (322 円),
# 佐藤's all-right word; the next day's shift shut after three guests is taken up at the fourth on the same seed — the same book, the keys
# handed out still out — nothing counted twice
def test_front_shift_and_resume(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + CALM + WORK4 + FR + """ card(['S', 'S', 'S', 'S']); state.currentUnit = 'm15'; state.settings.musicVol = 1; saveState(); const out = {};
      const said = []; window.speakAs = (w, l) => { said.push(w + ':' + l); return Promise.resolve(); }; clock(false); await at('ryokan'); WORK.start(yard(), 'front');
      for (let i = 0; i < 40 && !fc(); i++) { click('.talk'); await wait(150); }   // 佐藤's first word, tapped through
      out.first = Boolean(fc()); out.music = MUSIC.wants(); out.firstWord = ((TOWN.WORK.first || {}).front || []).length;
      let zh = '', kids = 0, seen = 0; const look = setInterval(() => { const m = document.querySelector('.wk-front .fr-talk .wk-me span'); if (m && m.textContent) zh = m.textContent;
        document.querySelectorAll('.wk-front .fr-opt').forEach((o) => { seen++; kids = Math.max(kids, o.children.length); }); }, 30);   // the replies: their Japanese only (ruling 23)
      await watch(() => fr() && ready(), 15000); /* 佐藤's start word first: no guest till it is said */ await work(10); await watch(() => WORK.today() && WORK.today().yen !== undefined, 30000); clearInterval(look); const x = WORK.today() || {};
      out.paid = [x.grade, x.yen, Object.values(x.score || {})]; out.zh = zh; out.opts = [seen > 0, kids];
      await watch(() => document.querySelector('.wk-result'), 15000); out.result = Boolean(document.querySelector('.wk-result')); document.querySelectorAll('.wk-result').forEach((e) => e.remove()); CLASS.close();
      const S = TOWN.ONSEN.front.say; out.bye = [said.includes('sato:' + S.all[0]), said.includes('sato:' + S.end[0])];
      clock(false, 11); await at('ryokan'); WORK.start(yard(), 'front'); await watch(() => fr() && fr().k === 0 && ready(), 12000);
      out.talk = Boolean(document.querySelector('.talk-card')); const seed = fr().seed;
      await work(3); await watch(() => (WORK.today() || {}).done >= 3 && fr().k === 3, 8000); await wait(300);
      const outKeys = () => [...document.querySelectorAll('.wk-front .fr-key.fr-out')].map((e) => e.dataset.room).sort().join(), outBefore = outKeys(); CLASS.close(); await wait(200);
      out.score = (WORK.today() || {}).score; WORK.start(yard(), 'front'); await watch(() => fr() && fr().k === 3 && ready(), 12000);
      out.k = fr() && fr().k; out.same = Boolean(fr()) && fr().seed === seed; out.keys = [outBefore, outKeys()]; CLASS.close();
      return JSON.stringify(out); })()"""))
    assert r['first'] and r['music'] == 'onsen' and r['firstWord'] >= 1, r   # 佐藤's first word, then the card and the town's record
    assert r['zh'] and r['opts'] == [True, 1], r   # the hero's reply with its Chinese under it (the first shift), never under the buttons
    assert r['paid'] == ['S', 322, [0] * 10] and r['result'] and r['bye'] == [True, False], r   # 260 + S 50, ベテラン's 4%; 佐藤's all-right word
    assert not r['talk'] and r['score'] == {'0': 0, '1': 0, '2': 0} and r['k'] == 3 and r['same'], r
    assert r['keys'][0] and r['keys'][0] == r['keys'][1], r   # the keys handed out before the break still out after it

# the dispatch's ruling 4: 佐藤 coaches in his own voice — a wrong reply: his word naming whose doing it is (わたくしどもの 動作 for ours,
# お客さまの 動作 for the guest's, 人では ございません for a thing), the reply's own 中文 (whose, and why) under it; the reply cannot be
# picked again; two and the guest's words show with the right one lit; a guest served right at once: 「結構で ございます」 (the shift's first
# always)
def test_front_sato_coaches(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + CALM + WORK4 + FR + """ card(['S', 'S', 'S', 'S']); state.currentUnit = 'm15';
      const said = []; window.speakAs = (w, l) => { said.push(w + ':' + l); return Promise.resolve(); }; const S = TOWN.ONSEN.front.say, out = {};
      const last = () => said.filter((x) => x.startsWith('sato:')).slice(-1)[0] || '', shown = () => (fc().querySelector('.fr-talk .wk-say') || {}).textContent || '';
      const wrongOf = (how) => { const t = fr().task, i = t.opts.findIndex((o) => !o[2] && o[3] === how); return [document.querySelector(`.wk-front .fr-opt[data-o="${i}"]`), t.opts[i]]; };
      for (const [how, f] of [['self', (t) => t.kind === 'checkin' && !t.bday], ['guest', (t) => t.kind === 'dinner'], ['thing', (t) => t.kind === 'where' && t.opts.some((o) => o[3] === 'thing')]]) {
        const seed = seedWhere((sh) => sh.tasks.slice(1).some(f)), k = where(seed, false, f); await begin(seed, k);
        const [b1, o1] = wrongOf(how); b1.click(); await wait(250);
        const rec = { word: last() === 'sato:' + S[how][0], zh: shown().includes(o1[1]), off: b1.disabled, miss: fr().miss, open: Boolean(fc().querySelector('.wk-bub.wk-open')) };
        if (how === 'self') { const [b2] = fr().task.opts.map((o, i) => [document.querySelector(`.wk-front .fr-opt[data-o="${i}"]`), o]).find(([b, o]) => !o[2] && !b.disabled); b2.click(); await wait(250);
          rec.two = [Boolean(fc().querySelector('.wk-bub.wk-open')), fc().querySelectorAll('.fr-opt.wk-hint').length]; }
        out[how] = rec; CLASS.close(); }
      clock(false, 11); const seed = seedWhere((sh) => sh.tasks[0].kind === 'checkin' && !sh.tasks[0].bday); shiftAt(seed, false); await at('ryokan'); WORK.start(yard(), 'front');
      await watch(() => fr() && fr().k === 0 && ready(), 15000); const from = said.length; await work(1); await watch(() => fr() && fr().k === 1 && ready(), 15000);
      out.ok = said.slice(from).includes('sato:' + S.ok[0][0]); CLASS.close(); return JSON.stringify(out); })()"""))
    for how in ('self', 'guest', 'thing'):
        x = r[how]
        assert x['word'] and x['zh'] and x['off'] and x['miss'] == 1 and not x['open'], (how, r)
    assert r['self']['two'] == [True, 1] and r['ok'], r   # two wrong: their words shown, the right one lit; served right at once: 結構で ございます

# spec §5.4 (好玩的): 道山 of the cruise, lost again, at the wrong inn — 「ここは どこですか？」 in his own voice; 「旅館「花月」で
# ございます。」 (いらっしゃいます／おります for a place: wrong); his after-word and 佐藤's offer to see him to the station; a sumo wrestler —
# a guest of the inn's own (TOWN.GUESTS: drawn in the hero's parts, a look HERO.norm keeps, his own voice) — whose futon is too small:
# 「お布団は 二枚で よろしいでしょうか。」 and his ごっつぁんです; each at most one a shift, never in the book
def test_front_michiyama_and_the_rikishi(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + CALM + WORK4 + FR + """ card(['S', 'S', 'S', 'S']); state.currentUnit = 'm15';
      const said = []; window.speakAs = (w, l) => { said.push(w + ':' + l); return Promise.resolve(); }; const F = TOWN.ONSEN.front, out = {}, bad = [], seen = { michiyama: 0, rikishi: 0 };
      for (let s = 1; s <= 400; s++) [false, true].forEach((mo) => { const sh = FRONT.make(m15, mo, s), f = sh.tasks.filter((t) => t.fun);
        if (f.length > 1 || f.some((t) => !['michiyama', 'rikishi'].includes(t.fun)) || sh.book.some((p) => ['michiyama', 'rikishi'].includes(p.who))) bad.push(s); f.forEach((t) => { seen[t.fun]++; }); });
      out.bad = bad.slice(0, 5); out.seen = seen;
      const g = (TOWN.GUESTS || {}).rikishi || {}, n = HERO.norm(g.look || {}); out.look = [Boolean(g.name), Object.keys(n).filter((k) => n[k] !== (g.look || {})[k])]; out.voice = Boolean(CAST_VOICE.rikishi) && CAST_VOICE.rikishi[2] === 0;
      for (const fun of ['michiyama', 'rikishi']) {
        const seed = seedWhere((sh) => sh.tasks.slice(1).some((t) => t.fun === fun)), k = where(seed, false, (t) => t.fun === fun); await begin(seed, k);
        const t = fr().task, face = fc().querySelector('.wk-cust .kr-face svg'); const rec = { who: t.who, asked: said.includes(t.who + ':' + F.fun[fun].line[0]), face: Boolean(face) };
        rec.right = t.opts.find((o) => o[2])[0]; opt(true).click(); await watch(() => fr().k === k + 1, 12000); await wait(100);
        rec.after = said.includes(t.who + ':' + F.fun[fun].after[0]); rec.sato = fun !== 'michiyama' || said.includes('sato:' + F.say.lost[0]);
        out[fun] = rec; CLASS.close(); }
      return JSON.stringify(out); })()"""))
    assert r['bad'] == [] and r['seen']['michiyama'] > 40 and r['seen']['rikishi'] > 40, r
    assert r['look'][0] and r['look'][1] == [] and r['voice'], r
    m, k = r['michiyama'], r['rikishi']
    assert m['who'] == 'michiyama' and m['asked'] and m['face'] and m['right'] == '{旅館|りょかん}「{花月|かげつ}」で ございます。' and m['after'] and m['sato'], r
    assert k['who'] == 'rikishi' and k['asked'] and k['face'] and k['right'] == 'お{布団|ふとん}は {二枚|にまい|兩床}で よろしいでしょうか。' and k['after'], r

# spec §5.4 (晚餐, 看台帳): a guest who has not said when to dine — the hero asks (なさいますか), they say a time, the book has it; a guest
# asking of the book: shrimp tonight — 「伺って おります。えびは お出ししません。」 where their row says えびが だめ, else 「はい、えびの てんぷら
# を お出しいたします。」; when dinner is — the time on their row (another row's: a miss); the book's notes: お誕生日, お子さま 二人, えびが だめ
def test_front_the_book_answers_and_takes_the_dinner_time(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + CALM + WORK4 + FR + """ card(['S', 'S', 'S', 'S']); state.currentUnit = 'm15';
      const said = []; window.speakAs = (w, l) => { said.push(w + ':' + l); return Promise.resolve(); }; const F = TOWN.ONSEN.front, bad = [], memos = new Set(), asks = new Set();
      const mark = (h) => F.times.find((x) => x[0] === h)[1], has = (s, h) => s.includes(mark(h) + 'から');   /* 六時 is in 六時半: the time and its から */
      for (let s = 1; s <= 300; s++) [false, true].forEach((mo) => { const sh = FRONT.make(m15, mo, s);
        sh.book.forEach((p) => { if (p.memo) memos.add(p.memo); });
        sh.tasks.forEach((t, k) => { const p = sh.book[t.party], right = (t.opts.find((o) => o[2]) || [''])[0];
          if (t.kind === 'dinner') { if (!p || p.dinner !== null || p.who !== t.who || !t.time || Boolean(p.in) !== mo) bad.push(s + ':dinner'); }   /* staying on (in) only on a morning */
          if (t.kind !== 'memo') return; asks.add(t.ask); if (!p || p.who !== t.who) { bad.push(s + ':memo who'); return; }
          if (t.ask === 'ebi' && right !== (p.memo === 'ebi' ? F.reply.ebiNo[0][0] : F.reply.ebiYes[0][0])) bad.push(s + ':ebi');
          if (t.ask === 'when') { if (p.dinner === null || !has(right, p.dinner)) bad.push(s + ':when');
            const f = t.opts.find((o) => o[3] === 'fact'); if (!f || has(f[0], p.dinner) || !sh.book.some((q) => q !== p && q.dinner !== null && has(f[0], q.dinner))) bad.push(s + ':when fact'); } }); });
      const out = { bad: bad.slice(0, 6), memos: [...memos].sort(), asks: [...asks].sort() };
      const seed = seedWhere((sh) => sh.tasks.slice(1).some((t) => t.kind === 'dinner')), k = where(seed, false, (t) => t.kind === 'dinner'), sh = FRONT.make(m15, false, seed); await begin(seed, k);
      const t = fr().task, cell = () => (fc().querySelector(`.fr-row[data-room="${sh.book[t.party].room}"] .fr-dn`) || {}).textContent || '';
      out.before = cell(); opt(true).click(); await watch(() => fr().k === k + 1, 12000); await wait(100);
      out.after = cell(); out.time = t.time; out.asked = said.includes('hero:' + F.reply.dinner[0][0]) && said.includes(t.who + ':' + F.named[t.who].dinner[1][0]);
      CLASS.close(); return JSON.stringify(out); })()"""))
    assert r['bad'] == [] and r['memos'] == ['bday', 'ebi', 'kids'] and r['asks'] == ['ebi', 'when'], r
    hh = int(r['time']); mm = '30' if r['time'] % 1 else '00'
    assert r['before'] == '―' and r['after'] == f"{hh}:{mm}" and r['asked'], r

# Review Focus 5 (ruling 27): each line said to its end — a wrong reply while the guest is still speaking (佐藤's word after theirs), the
# next guest's greeting after the thanks, a check-in's key after the hero's greeting; on a shift taken up at its last guest, the thanks
# and 佐藤's goodbye said whole before the results
def test_front_says_each_line_to_its_end(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + CALM + WORK4 + FR + SAYS + """ card(['S', 'S', 'S', 'S']); state.currentUnit = 'm15'; const out = {};
      const seed = seedWhere((sh) => sh.tasks[0].kind === 'checkin' && !sh.tasks[0].bday); clock(false); shiftAt(seed, false); await at('ryokan'); WORK.start(yard(), 'front');
      await watch(() => fr() && fr().k === 0 && fr().phase === 'ask' && talking, 15000);   // the guest speaking
      opt(false).click();   // a wrong reply while they speak
      await work(3); await watch(() => fr() && fr().k === 3 && ready(), 30000); await hush();
      out.miss = WORK.today().score[0]; CLASS.close();
      clock(false, 11); shiftAt(seed, false, 9, upTo(9)); await at('ryokan'); WORK.start(yard(), 'front'); await work(10);
      await watch(() => document.querySelector('.wk-result'), 30000); out.end = [__log.slice(-1)[0], talking, Boolean(document.querySelector('.wk-result'))];
      out.cut = __cut; document.querySelectorAll('.wk-result').forEach((e) => e.remove()); return JSON.stringify(out); })()"""))
    assert r['cut'] == [] and r['miss'] == 1, r
    assert r['end'][0].startswith('sato:') and r['end'][1] is None and r['end'][2], r   # his goodbye the last line, said whole before the results

# N-1 of Task 4: the voice lane is its card's — a wrong reply while the guest is still speaking queues 佐藤's word; the card shut at once
# and the job begun again: the old word is never said nor shown in the new card, and the new shift's first lines are said whole
def test_a_shut_front_card_says_nothing_more(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + CALM + WORK4 + FR + LANE + """ card(['S', 'S', 'S', 'S']); state.currentUnit = 'm15';
      const seed = seedWhere((sh) => sh.tasks[0].kind === 'checkin' && !sh.tasks[0].bday); clock(false); shiftAt(seed, false); await at('ryokan'); WORK.start(yard(), 'front');
      const begun = () => { const n = fr(); return n && n.phase === 'ask' && log.some(([, w, l]) => w === n.task.who && l === n.task.q[0]); };
      await watch(begun, 20000); await wait(200); opt(false).click(); await wait(100);
      const at0 = ms(); CLASS.close(); WORK.start(yard(), 'front'); await wait(4500);
      const S = TOWN.ONSEN.front.say, after = log.filter(([m]) => m >= at0), out = { old: after.filter(([, w, l]) => w === 'sato' && l === S.self[0]).length,
        cut: cuts.filter(([m]) => m >= at0).map(([, x]) => x), bad: Boolean(document.querySelector('.wk-front .wk-say.bad')), card: Boolean(fc()), said: after.map(([, w]) => w) };
      CLASS.close(); return JSON.stringify(out); })()"""))
    assert r['old'] == 0 and r['cut'] == [] and not r['bad'] and r['card'], r
    assert r['said'][:1] == ['sato'] and 'hero' in r['said'], r   # the new shift's start, then the hero's greeting, each whole

# the card (spec §5.4, §9): from behind the counter — the open 予約台帳 on the left (five rows: a name with its reading, how many, the room,
# dinner, a note), the key board (five tags) and the bell on the right, the guest across the counter with their patience, the replies,
# 佐藤; on a 360-px phone and a 390-px one it stays inside the screen, every button and key 40 px or more, the book's words 11 px or more
# and their readings 8 or more; at the key step and after two misses the book, the keys and the talk row in sight — the talk row whole
# where the card holds it all; where it does not (360×640's birthday guest: the book's floor kept in sight first, ruling 13), its centre
# in sight under the header and taking a tap, as the iPhone tests have it at 390×664 (fix round 3)
def test_the_front_card_fits_a_phone(b):
    out = {}
    for w, h in ((360, 640), (390, 844)):
        out[w] = json.loads(b.run([("metrics", (w, h)), ("nav", URL), ("wait", READY), ("eval", "(async () => { " + BEGIN + CALM + WORK4 + FR + """ card(['S', 'S', 'S', 'S']); state.currentUnit = 'm15';
          window.speakAs = () => Promise.resolve(); const seed = seedWhere((sh) => sh.tasks.slice(1, 9).some((t) => t.bday)), k = where(seed, false, (t) => t.bday);
          clock(false); state.work.res[dateStr(TOWNEV.today())] = { place: 'front', done: k, score: upTo(k), keep: { seed, morning: false } }; saveState();   // a first shift: the hero's 中文 shown
          await at('ryokan'); WORK.start(yard(), 'front'); for (let i = 0; i < 40 && !fc(); i++) { click('.talk'); await wait(120); }
          await watch(() => fr() && fr().k === k && ready(), 12000); await wait(300);
          const c = fc().querySelector('.cls-card'), R = (e) => e.getBoundingClientRect(), q = R(c), top = Math.max(q.top + c.clientTop, R(c.querySelector('.wk-head')).bottom), bot = q.top + c.clientTop + c.clientHeight, inv = (e) => Boolean(e) && R(e).top >= top - 1 && R(e).bottom <= bot + 1;   // in sight: under the sticky header (task 2, ruling 17)
          const btns = () => [...c.querySelectorAll('button')].filter((x) => x.offsetParent && !x.classList.contains('fr-out')).map((x) => [x.className, Math.round(R(x).width), Math.round(R(x).height)]).filter(([, ww, hh]) => ww < 40 || hh < 40);
          const txt = (e) => [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
          const small = [...c.querySelectorAll('.fr-book *')].filter((e) => e.tagName !== 'RT' && txt(e) && parseFloat(getComputedStyle(e).fontSize) < 11).map((e) => e.className + ':' + e.textContent);
          const rt = Math.min(...[...c.querySelectorAll('.fr-book rt, .fr-board rt')].map((e) => parseFloat(getComputedStyle(e).fontSize)));
          const book = c.querySelector('.fr-book'), board = c.querySelector('.fr-board'), first = { inside: q.left >= 0 && q.right <= innerWidth + 1 && q.top >= 0 && q.bottom <= innerHeight + 1,
            rows: c.querySelectorAll('.fr-row').length, keys: c.querySelectorAll('.fr-key').length, bell: Boolean(c.querySelector('.fr-bell svg')), left: R(book).right <= R(board).left + 1,
            cust: Boolean(c.querySelector('.wk-cust .kr-face') && c.querySelector('.wk-cust .wk-pat')), opts: c.querySelectorAll('.fr-opt').length, btns: btns(), small: small.slice(0, 5), rt,
            names: [...c.querySelectorAll('.fr-row .fr-nm')].every((e) => e.querySelector('ruby rt') && e.scrollWidth <= e.clientWidth && R(e).right <= R(book).right + 0.5),   /* never clipped (fix round 1, M-6) */
            reads: [[...c.querySelectorAll('.fr-row .fr-n')].every((e) => (e.querySelector('rt') || {}).textContent === 'めい'), c.querySelectorAll('.fr-btitle small rt').length] };   /* 名, 月 and 日 read (M-12) */
          const tapAt = (e) => { const r = R(e), x = r.left + r.width / 2, y = r.top + r.height / 2; if (y < Math.max(top, R(c.querySelector('.wk-head')).bottom) || y > bot) return false; const h = document.elementFromPoint(x, y); return Boolean(h && (h === e || e.contains(h))); };
          const talkSeen = () => (c.scrollHeight - c.clientHeight > 1 ? tapAt : inv)(c.querySelector('.fr-talk'));   // whole where the card holds it all (ruling 13)
          const fit = () => [inv(book), [...c.querySelectorAll('.fr-key')].every(inv), talkSeen(), inv(c.querySelector('.wk-cust .wk-bub'))];
          const i = fr().task.opts.findIndex((o) => o[3] === 'bday'); c.querySelector(`.fr-opt[data-o="${i}"]`).click(); await watch(() => fr().step === 1 && ready(), 8000); await wait(400);
          const keyStep = fit(), btns2 = btns(); const t = fr().task, other = FRONT.ROOMS.map((x) => x[0]).filter((x) => x !== t.room && !key(x).classList.contains('fr-out'));
          key(other[0]).click(); await wait(300); key(other[1]).click(); await wait(500); const two = fit(), lit = [key(t.room).classList.contains('wk-hint'), Boolean(c.querySelector('.fr-row.fr-lit'))];
          CLASS.close(); return JSON.stringify({ first, keyStep, two, lit, btns2 }); })()""")])[-1])
    for w, x in out.items():
        f = x['first']
        assert f['inside'] and f['rows'] == 5 and f['keys'] == 5 and f['bell'] and f['left'] and f['cust'] and f['opts'] == 4 and f['names'] and f['reads'][0] and f['reads'][1] >= 2, (w, out)
        assert f['btns'] == [] and x['btns2'] == [] and f['small'] == [] and f['rt'] >= 8, (w, out)
        assert x['keyStep'] == [True, True, True, True] and x['two'] == [True, True, True, True] and x['lit'] == [True, True], (w, out)

# fix round 1 (the review's Minor 3): a held bubble is measured again, its customer's own, when the screen changes — the フロント's guest's
# bubble held at 390×844, held again on a turn to 360×640 (on every screen since fix round 2, ruling 8: at least as tall, the card
# narrower), as before back at 390×844; the 案内所's tourist's bubble held taller on a narrower screen
def test_a_held_bubble_is_measured_again_on_a_resize(b):
    pre = "(async () => { " + BEGIN + CALM + WORK4 + FR + """ card(['S', 'S', 'S', 'S']); state.currentUnit = 'm15'; clock(false); window.speakAs = () => new Promise((ok) => setTimeout(ok, 200));
      state.work.res[dateStr(TOWNEV.today())] = { place: 'front', done: 0, score: {}, keep: { seed: 5, morning: false } }; saveState();
      await at('ryokan'); WORK.start(yard(), 'front'); for (let i = 0; i < 40 && !fc(); i++) { click('.talk'); await wait(120); }
      await watch(() => ready() && fr().k === 0, 12000); await wait(600); return fc().querySelector('.wk-cust .wk-bub').style.minHeight; })()"""
    look = "(async () => { await new Promise((r) => setTimeout(r, 600)); const b = document.querySelector('.wk-front .wk-cust .wk-bub'); return b ? b.style.minHeight : 'gone'; })()"
    m1 = b.run([("metrics", (390, 844)), ("nav", URL), ("wait", READY), ("eval", pre)], timeout=120)[-1]
    m2 = b.run([("metrics", (360, 640)), ("eval", look)], timeout=30)[-1]
    m3 = b.run([("metrics", (390, 844)), ("eval", look)], timeout=30)[-1]
    assert m1.endswith('px') and m2.endswith('px') and float(m2[:-2]) >= float(m1[:-2]) and m3 == m1, (m1, m2, m3)
    pre2 = "(async () => { " + BEGIN + CALM + WORK4 + """ card(['S', 'S', 'S', 'S']); state.currentUnit = 'm7'; window.speakAs = () => new Promise((ok) => setTimeout(ok, 200));
      await at('onsen'); WORK.start(yard(), 'annai'); for (let i = 0; i < 60 && !document.querySelector('.wk-annai'); i++) { click('.talk'); await wait(150); }
      await watch(() => ANNAI_RUN.now() && ANNAI_RUN.now().phase === 'ask', 12000); await wait(600); return parseFloat(document.querySelector('.wk-annai .wk-cust .wk-bub').style.minHeight); })()"""
    look2 = "(async () => { await new Promise((r) => setTimeout(r, 600)); return parseFloat(document.querySelector('.wk-annai .wk-cust .wk-bub').style.minHeight); })()"
    a1 = b.run([("metrics", (1280, 800)), ("nav", URL), ("wait", READY), ("eval", pre2)], timeout=120)[-1]
    a2 = b.run([("metrics", (360, 640)), ("eval", look2)], timeout=30)[-1]
    assert a1 > 0 and a2 > a1, (a1, a2)   # narrower: its words run to more lines, held taller

# the review of 2bd06dd (Important 2) and of f9f1047: on a 360×640 phone the フロント card's ✕ stays in the screen and takes a tap without
# the player scrolling — at every guest of a shift (the 備註 guest, #8 of seed 5, too), as each starts and after a wrong reply (佐藤's word
# and its reason, three lines of them or four); the card's scroll never changed by the reply (fix round 2, ruling 8: a card taller than
# the screen, as the 備註 guest's, scrolls itself once as the guest comes, its header with the ✕ stuck at the top)
def test_the_front_close_stays_in_sight_on_a_small_phone(b):
    r = json.loads(b.run([("metrics", (360, 640)), ("nav", URL), ("wait", READY), ("eval", "(async () => { " + BEGIN + CALM + WORK4 + FR + """ card(['S', 'S', 'S', 'S']); state.currentUnit = 'm15'; clock(false);
      window.speakAs = () => new Promise((ok) => setTimeout(ok, 200));
      state.work.res[dateStr(TOWNEV.today())] = { place: 'front', done: 0, score: {}, keep: { seed: 5, morning: false } }; saveState();   // a first shift: the hero's 中文 under his lines
      await at('ryokan'); WORK.start(yard(), 'front'); for (let i = 0; i < 40 && !fc(); i++) { click('.talk'); await wait(120); }
      const c = () => fc().querySelector('.cls-card');
      const look = () => { const x = fc().querySelector('.cls-x'), q = x.getBoundingClientRect(), e = document.elementFromPoint(q.left + q.width / 2, q.top + q.height / 2);
        return { inView: q.top >= 0 && q.bottom <= innerHeight, hit: Boolean(e && e.closest('.cls-x')), st: Math.round(c().scrollTop), kind: fr().task.kind }; };
      const out = [];
      for (let k = 0; k < 10; k++) { if (!(await watch(() => ready() && fr().k === k && fr().step === 0, 15000))) break; await wait(600); const g = { k, start: look() };
        const w = opt(false); if (w && !w.disabled) { w.click(); await watch(() => fc().querySelector('.fr-talk .wk-say.bad'), 4000); await wait(500); g.wrong = look(); }
        out.push(g); await work(k + 1); }
      CLASS.close(); return JSON.stringify(out); })()""")], timeout=240)[-1])
    assert len(r) == 10 and any(g['start']['kind'] == 'memo' for g in r), r
    bad = [(g['k'], m, v) for g in r for m, v in g.items() if m != 'k' and not (v['inView'] and v['hit'] and v['st'] == g['start']['st'])]
    assert bad == [], bad

# Task 4's N-3: no reply stands out by its shape — every set of replies (each of the book's dinner times too, the birthday wish with the
# greeting's), laid out as the card lays them out on a 360-px phone, a 390-px one and a 1280-px screen: each of a set on as many lines as
# the others, and as tall
def test_no_front_reply_stands_out_by_its_shape(b):
    out = {}
    for w, h in ((360, 640), (390, 844), (1280, 800)):
        out[w] = json.loads(b.run([("metrics", (w, h)), ("nav", URL), ("wait", READY), ("eval", "(async () => { " + BEGIN + CALM + WORK4 + FR + """ card(['S', 'S', 'S', 'S']); state.currentUnit = 'm15';
          window.speakAs = () => Promise.resolve(); const seed = seedWhere((sh) => sh.tasks[0].kind === 'checkin' && !sh.tasks[0].bday); await begin(seed, 0);
          const F = TOWN.ONSEN.front, box = fc().querySelector('.fr-opts'), rb = (ja) => ja.replace(/\\{([^|}]+)\\|([^|}]+)(?:\\|[^}]+)?\\}/g, '<ruby>$1<rt>$2</rt></ruby>');
          const sets = Object.entries(F.reply).flatMap(([k, v]) => (k === 'when' ? F.times.map((x) => [k + x[0], v, x[1]]) : [[k, v, '']])).map(([k, v, m]) => [k, [v[0][0]].concat(v[1].map((x) => x[0])).map((ja) => ja.replace('{T}', m))])
            .concat(Object.entries(F.fun).map(([k, f]) => ['fun:' + k, [f.reply[0][0]].concat(f.reply[1].map((x) => x[0]))]), [['bday', [F.reply.in[0][0], F.bday[0]].concat(F.reply.in[1].map((x) => x[0]))]]);
          const lines = (e) => { const tw = document.createTreeWalker(e.querySelector('span'), NodeFilter.SHOW_TEXT), bs = []; let n;   /* the lines its words sit on (not their readings): a .btn lays its span out as a block, one box however many lines */
            while ((n = tw.nextNode())) { if (n.parentElement.closest('rt') || !n.textContent.trim()) continue; const rg = document.createRange(); rg.selectNodeContents(n); [...rg.getClientRects()].forEach((x) => bs.push(x.bottom)); }
            bs.sort((p, q) => p - q); let c = 0, last = -1e9; bs.forEach((y) => { if (y - last > 8) c++; last = y; }); return c; }, bad = [];
          for (const [k, opts] of sets) { box.innerHTML = opts.map((ja, i) => `<button type="button" class="btn fr-opt" data-o="${i}" lang="ja"><span>${rb(ja)}</span></button>`).join(''); await wait(30);
            const bs = [...box.children], ls = bs.map(lines), hs = bs.map((e) => Math.round(e.getBoundingClientRect().height));
            if (new Set(ls).size > 1) bad.push(k + ':' + ls.join('/'));   // every one on as many lines (the right one never alone, nor a wrong one: 道山's いらっしゃいます wrapped alone once)
            if (Math.max(...hs) - Math.min(...hs) > 1) bad.push(k + ':h' + hs.join('/')); }
          CLASS.close(); return JSON.stringify({ bad, sets: sets.length }); })()""")])[-1])
    assert all(x['bad'] == [] and x['sets'] >= 16 for x in out.values()), out

# the generator (生成) has the フロント's lines: every guest's words in their own voice (their name, the book's questions, the dinner time,
# their gladness at the wish, the fun ones), the hero's every right reply and greeting, 佐藤's words and his first; one new voice (the
# sumo wrestler's, TOWN.GUESTS) — every other guest one the town already voices
def test_the_generator_has_the_front_lines(b):
    r = json.loads(ev(b, """(() => { const all = new Set(talkLines().map(([w, l]) => w + '|' + l)), miss = [], need = (w, l) => { if (l && !all.has(w + '|' + l)) miss.push(w + '|' + l); };
      const m15 = TOWNEV.unitIdx('m15'), F = TOWN.ONSEN.front, X = TOWN.WORK.say.waiter.cust;
      for (const u of [m15, TOWNEV.unitIdx('m17')]) for (let s = 1; s <= 60; s++) [false, true].forEach((mo) => { const sh = FRONT.make(u, mo, s);
        sh.tasks.forEach((t) => { need(t.who, t.q[0]); t.opts.filter((o) => o[2]).forEach((o) => need('hero', o[0])); if (t.after) need(t.who, t.after[0]); if (t.answer) need(t.who, t.answer[0]); }); });
      Object.entries(F.named).forEach(([w, p]) => [p.in, p.ebi, p.when, p.late, p.dinner[1], p.bday].forEach((l) => need(w, l[0])));
      Object.keys(F.named).forEach((w) => FRONT.ROOMS.forEach((x) => need('hero', FRONT.roomLine(w, x[0])[0]))); Object.values(F.hi).forEach((l) => need('hero', l[0])); need('hero', F.ok[0]);
      const fun = Object.values(F.fun).map((f) => f.who); FRONT.guests().forEach((w) => (fun.includes(w) ? [] : [F.thanks]).concat([X.again, X.hey, X.out, X.out0]).forEach((l) => need(w, l[0])));   // the fun ones' own word after, not thanks
      Object.entries(F.say).filter(([k]) => k !== 'who').forEach(([, l]) => (Array.isArray(l[0]) ? l : [l]).forEach((x) => need('sato', x[0])));
      ((TOWN.WORK.first || {}).front || []).forEach((l) => need(l[0], l[1]));
      return JSON.stringify({ miss: [...new Set(miss)].slice(0, 6), voices: Object.keys(CAST_VOICE).length, first: ((TOWN.WORK.first || {}).front || []).length, guests: FRONT.guests().length }); })()"""))
    assert r['miss'] == [] and r['voices'] == 69 and r['first'] >= 1 and r['guests'] >= 15, r

# ---- Task 7, fix round 1 ----
# lines as long as the test wants: LONG(ms, f) — a line f picks (who, line) takes ms, every other 300; a line begun while another is being
# said is a cut, and so is the voices stopped while one is (a card shut: stopSpeaking); the log [ms from the start, who, line]
LONG = """const t0 = Date.now(), log = [], cuts = []; let talking = null; const ms = () => Date.now() - t0;
  const LONG = (len, f) => { window.speakAs = (w, l) => { if (talking) cuts.push(ms() + ' cut ' + talking + ' <- ' + w); const me = talking = w + ':' + l; log.push([ms(), w, l]);
      return new Promise((ok) => setTimeout(() => { if (talking === me) talking = null; ok(); }, f(w, l) ? len : 300)); };
    window.speak = (t) => window.speakAs('', t); window.stopSpeaking = () => { if (talking) cuts.push(ms() + ' stop ' + talking); talking = null; }; };"""

# I-1 (ruling 27): a shift's closing word is said whole — a keeper's last line of 6 s is never stopped by the card shutting, and the results
# show only once it is over; for the フロント (佐藤 at rate 0.86) and the 案内所 (あかり), both on the desk
def test_a_long_closing_word_is_said_whole(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + CALM + WORK4 + FR + LONG + """ card(['S', 'S', 'S', 'S']); state.currentUnit = 'm15'; const out = {};
      const S = TOWN.ONSEN.front.say, A = TOWN.ONSEN.annai.say, closing = (w, l) => (w === 'sato' && [S.end[0], S.all[0]].includes(l)) || (w === 'akari' && [A.end[0], A.all[0]].includes(l));
      LONG(6000, closing); const res = () => document.querySelector('.wk-result');
      const seed = seedWhere((sh) => sh.tasks[9].kind !== 'checkin'); clock(false, 12); shiftAt(seed, false, 9, upTo(9)); await at('ryokan'); WORK.start(yard(), 'front');
      await watch(() => fr() && fr().k === 9 && ready(), 15000); await wait(300); opt(true).click(); await watch(res, 25000);
      const last = log.find(([, w, l]) => closing(w, l)); out.front = { cuts: cuts.slice(), said: Boolean(last), whole: Boolean(last) && ms() - last[0] >= 5900 };
      document.querySelectorAll('.wk-result').forEach((e) => e.remove()); cuts.length = 0;
      state.currentUnit = 'm7'; const m7 = TOWNEV.unitIdx('m7'); state.work.res['2026-10-21'] = { place: 'annai', done: 10, score: {}, yen: 1, grade: 'C' };
      state.work.res['2026-11-13'] = { place: 'annai', done: 9, score: upTo(9), keep: { seed: 5 } }; TOWNEV.clock = { h: 10, day: new Date(2026, 10, 13) }; saveState();
      await at('onsen'); WORK.start(yard(), 'annai'); await watch(() => ANNAI_RUN.now() && ANNAI_RUN.now().k === 9 && ANNAI_RUN.now().phase === 'ask' && document.querySelector('.wk-annai .an-opt'), 15000); await wait(300);
      const t = ANNAI_RUN.now().task; document.querySelector(`.wk-annai .an-opt[data-o="${t.opts.findIndex((o) => o[2])}"]`).click(); const from = log.length; await watch(res, 25000);
      const end2 = log.slice(from).find(([, w, l]) => closing(w, l)); out.annai = { cuts: cuts.slice(), said: Boolean(end2), whole: Boolean(end2) && ms() - end2[0] >= 5900 };
      document.querySelectorAll('.wk-result').forEach((e) => e.remove()); return JSON.stringify(out); })()"""))
    assert r['front'] == {'cuts': [], 'said': True, 'whole': True} and r['annai'] == {'cuts': [], 'said': True, 'whole': True}, r

# M-1, as rulings 8 and 13 have it (fix rounds 2–3): the book stays in sight while it is wanted — at 360×640 a guest asks of the book,
# their party in its first row (the 備註 guest's card taller than the screen): the book's title, its header row and its first row in
# sight under the card's header, as the guest comes and after a miss (nothing moved: the card's scroll, the desk's place); after two
# (their row lit, the right reply lit) the lit row in sight inside the desk and the lit reply in sight — 佐藤's word may lie under the
# fold there (ruling 13: a scroll away, as on an SE)
FR_BOOK = """const C = () => fc().querySelector('.cls-card'), R = (e) => e.getBoundingClientRect(), D = () => C().querySelector('.fr-desk');
  const win = () => { const c = C(), ct = R(c).top + c.clientTop; return [Math.max(R(D()).top, ct, R(c.querySelector('.wk-head')).bottom), Math.min(R(D()).bottom, ct + c.clientHeight)]; };
  const sees = (e) => { const [t, b] = win(), r = e && R(e); return Boolean(e) && r.top >= t - 1 && r.bottom <= b + 1; };
  const book = () => [sees(fc().querySelector('.fr-btitle')), sees(fc().querySelector('.fr-hd')), sees(fc().querySelector('.fr-row'))];
  const inView = (sel) => { const c = C(), top = Math.max(R(c).top + c.clientTop, R(c.querySelector('.wk-head')).bottom), bot = R(c).top + c.clientTop + c.clientHeight, e = fc().querySelector(sel); return Boolean(e) && R(e).top >= top - 1 && R(e).bottom <= bot + 1; };"""
def test_the_front_book_stays_in_sight_at_a_book_question(b):
    r = json.loads(b.run([("metrics", (360, 640)), ("nav", URL), ("wait", READY), ("eval", "(async () => { " + BEGIN + CALM + WORK4 + FR + FR_BOOK + """ card(['S', 'S', 'S', 'S']); state.currentUnit = 'm15';
      window.speakAs = () => Promise.resolve(); const out = {};
      const seed = seedWhere((sh) => sh.tasks.some((t, k) => k > 0 && t.kind === 'memo' && t.party === 0 && t.opts.every((o) => o[0].length > 18))), k = where(seed, false, (t) => t.kind === 'memo');
      await begin(seed, k); await wait(400); const st0 = C().scrollTop, top0 = Math.round(R(D()).top); out.asked = book();
      const wrong = () => { const t = fr().task, i = t.opts.findIndex((o, j) => !o[2] && !fc().querySelector(`.fr-opt[data-o="${j}"]`).disabled); fc().querySelector(`.fr-opt[data-o="${i}"]`).click(); };
      wrong(); await wait(900); out.one = book().concat([C().scrollTop === st0, Math.round(R(D()).top) === top0]);
      wrong(); await wait(900); out.two = [inView('.fr-opt.wk-hint'), sees(fc().querySelector('.fr-row.fr-lit'))]; out.party = fr().task.party; out.lit = Boolean(fc().querySelector('.fr-row.fr-lit'));
      CLASS.close(); return JSON.stringify(out); })()""")], timeout=120)[-1])
    assert r['party'] == 0 and r['asked'] == [True, True, True], r   # the title, the header row, the first row
    assert r['one'] == [True, True, True, True, True] and r['two'] == [True, True] and r['lit'], r

# M-2: the hero's greeting follows the hour, not the shift's half — a morning shift (kept so: its check-outs) taken up at 15:00 greets a
# guest coming to the desk with 「はい、いかが なさいましたか。」; at 9:00 with おはようございます; one arriving always with いらっしゃいませ
def test_front_greets_by_the_hour(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + CALM + WORK4 + FR + """ card(['S', 'S', 'S', 'S']); state.currentUnit = 'm15';
      const said = []; window.speakAs = (w, l) => { said.push(w + ':' + l); return Promise.resolve(); }; const F = TOWN.ONSEN.front, out = {};
      const seed = seedWhere((sh) => sh.tasks.slice(1, 9).some((t) => t.kind === 'checkout'), true), k = where(seed, true, (t, i) => i > 0 && t.kind === 'checkout');
      for (const [h, d] of [[15, 12], [9, 13]]) { TOWNEV.clock = { h, day: new Date(2026, 10, d) }; shiftAt(seed, true, k, upTo(k)); const from = said.length;
        await at('ryokan'); WORK.start(yard(), 'front'); await watch(() => fr() && fr().k === k && ready(), 15000);
        out[h] = [fr().morning, fr().task.kind, said.slice(from).filter((x) => x.startsWith('hero:')).pop()]; CLASS.close(); }
      out.hi = F.hi; return JSON.stringify(out); })()"""))
    assert r['15'] == [True, 'checkout', 'hero:' + r['hi']['pm'][0]] and r['9'] == [True, 'checkout', 'hero:' + r['hi']['am'][0]], r

# M-3: the guest's mood mark (💦／💢) sits by their face and is never cut — with their words opened over three lines (a book question after
# two misses: the question and its 中文), at 390×844 and 360×640, the mark inside the lobby and touching the face's corner
def test_the_front_mood_mark_stays_by_the_face(b):
    out = {}
    for w, h in ((390, 844), (360, 640)):
        out[w] = json.loads(b.run([("metrics", (w, h)), ("nav", URL), ("wait", READY), ("eval", "(async () => { " + BEGIN + CALM + WORK4 + FR + """ card(['S', 'S', 'S', 'S']); state.currentUnit = 'm15';
          window.speakAs = () => Promise.resolve(); const seed = seedWhere((sh) => sh.tasks.some((t, k) => k > 0 && t.kind === 'memo')), k = where(seed, false, (t) => t.kind === 'memo'); await begin(seed, k);
          const wrong = () => { const t = fr().task, i = t.opts.findIndex((o, j) => !o[2] && !fc().querySelector(`.fr-opt[data-o="${j}"]`).disabled); fc().querySelector(`.fr-opt[data-o="${i}"]`).click(); };
          wrong(); await wait(500); wrong(); await wait(700); const cu = fc().querySelector('.wk-cust'); cu.dataset.mood = 'mad'; cu.querySelector('.wk-emo').textContent = '💢'; await wait(100);
          const R = (e) => e.getBoundingClientRect(), e = R(cu.querySelector('.wk-emo')), f = R(cu.querySelector('.kr-face')), l = R(fc().querySelector('.fr-lobby')), bub = R(cu.querySelector('.wk-bub'));
          const lines = Math.round(bub.height / 20); CLASS.close();
          return JSON.stringify({ inside: e.top >= l.top + 2 && e.bottom <= l.bottom && e.left >= l.left, by: e.left <= f.right + 4 && e.right >= f.right - 24 && e.top <= f.top + 4 && e.bottom >= f.top + 8, clear: e.right <= bub.left, tall: bub.height > f.height + 12, lines }); })()""")])[-1])   # on the face's top corner, with room above it, never under the bubble's edge
    assert all(x['inside'] and x['by'] and x['clear'] and x['tall'] for x in out.values()), out

# N-2 of Task 4, for the フロント: 🔊 again holds the guest's clock till their words are said again in full — at a reply, and at a check-in's
# key on its fresh clock (lines of 3 s each)
def test_a_front_replay_holds_the_clock_at_the_key_too(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + CALM + WORK4 + FR + """ card(['S', 'S', 'S', 'S']); state.currentUnit = 'm15';
      const seed = seedWhere((sh) => sh.tasks[0].kind === 'checkin' && !sh.tasks[0].bday); clock(false); shiftAt(seed, false); window.speakAs = () => new Promise((ok) => setTimeout(ok, 3000));
      await at('ryokan'); WORK.start(yard(), 'front'); const bar = () => parseFloat(fc().querySelector('.wk-pat').style.getPropertyValue('--p'));
      const held = async () => { await watch(() => fr().phase === 'ask' && bar() < 0.995, 20000); fc().querySelector('.fr-ear').click(); const b0 = bar(); await wait(2400); const b1 = bar(); await wait(1400); const b2 = bar();
        return [Math.abs(b1 - b0) < 0.004, b2 < b1]; };
      await watch(() => fr() && fr().k === 0 && fr().phase === 'ask', 20000); const say = await held(); opt(true).click();
      await watch(() => fr().step === 1 && fr().phase === 'ask', 12000); const atKey = await held(); CLASS.close(); return JSON.stringify({ say, atKey }); })()"""))
    assert r['say'] == [True, True] and r['atKey'] == [True, True], r   # held while said again; on once it is over

# N-4 of Task 4, for the フロント: a guest who gives up waiting goes — their words shown whole, their leaving word popping up under them,
# never over their words, at 390×844 and 360×640
def test_a_front_guest_who_leaves_shows_their_words(b):
    out = {}
    for w, h in ((390, 844), (360, 640)):
        out[w] = json.loads(b.run([("metrics", (w, h)), ("nav", URL), ("wait", READY), ("eval", "(async () => { " + BEGIN + CALM + WORK4 + FR + """ card(['S', 'S', 'S', 'S']); state.currentUnit = 'm15';
          window.speakAs = () => Promise.resolve(); const seed = seedWhere((sh) => sh.tasks[0].kind === 'checkin' && !sh.tasks[0].bday); await begin(seed, 0); const t = fr().task;
          JOBS.pat.scale = 0.02; await watch(() => fr().phase === 'done', 8000); JOBS.pat.scale = 1; await wait(150);
          const cu = fc().querySelector('.wk-cust'), g = cu.querySelector('.wk-grr'), q = cu.querySelector('.wk-bub'), R = (e) => e.getBoundingClientRect(), a = g && R(g), c = R(q);
          const meet = Boolean(a) && a.left < c.right && a.right > c.left && a.top < c.bottom && a.bottom > c.top;
          const o = { words: q.textContent.includes(t.q[1]), grr: Boolean(g) && /いいです/.test(g.textContent), meet, score: WORK.today().score[0] }; CLASS.close(); return JSON.stringify(o); })()""")])[-1])
    assert all(x == {'words': True, 'grr': True, 'meet': False, 'score': 3} for x in out.values()), out

# M-9: the right key leaves the board at once — tapped while 佐藤's word for a wrong one is still being said (3 s), it is off its hook and
# their row ticked straight away, not once he has finished
def test_front_the_right_key_leaves_at_once(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + CALM + WORK4 + FR + """ card(['S', 'S', 'S', 'S']); state.currentUnit = 'm15'; window.speakAs = () => Promise.resolve();
      const seed = seedWhere((sh) => sh.tasks[0].kind === 'checkin' && !sh.tasks[0].bday); await begin(seed, 0); opt(true).click(); await watch(() => fr().step === 1 && ready(), 8000);
      window.speakAs = (w) => new Promise((ok) => setTimeout(ok, w === 'sato' ? 3000 : 200)); const t = fr().task, other = FRONT.ROOMS.map((x) => x[0]).find((x) => x !== t.room && !key(x).disabled);
      key(other).click(); await wait(150); key(t.room).click(); await wait(200);
      const out = { out: key(t.room).classList.contains('fr-out'), off: key(t.room).disabled, tick: Boolean(fc().querySelector(`.fr-row[data-room="${t.room}"].fr-in`)) }; CLASS.close(); return JSON.stringify(out); })()"""))
    assert r == {'out': True, 'off': True, 'tick': True}, r

# M-12: a guest who left in a huff at their check-in does not come back later in the shift — the one who would have asked of the book or
# told dinner's time is someone else (another party in, or a want or a where); their row stays without its tick, their key on the board
def test_a_front_guest_who_left_in_a_huff_does_not_come_back(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + CALM + WORK4 + FR + """ card(['S', 'S', 'S', 'S']); state.currentUnit = 'm15'; window.speakAs = () => Promise.resolve();
      const back = (sh) => { const m = sh.tasks.findIndex((t) => ['memo', 'dinner'].includes(t.kind)), j = m < 0 ? -1 : sh.tasks.findIndex((t) => t.kind === 'checkin' && t.who === sh.tasks[m].who); return [j, m]; };
      const seed = seedWhere((sh) => { const [j, m] = back(sh); return j > 0 && m > j + 1; }), sh = FRONT.make(m15, false, seed), [j, m] = back(sh), who = sh.tasks[j].who;
      await begin(seed, j); JOBS.pat.scale = 0.02; await watch(() => fr().phase === 'done', 8000); JOBS.pat.scale = 1;
      await work(m); await watch(() => fr() && fr().k === m && ready(), 15000); const t = fr().task, row = fc().querySelector(`.fr-row[data-room="${sh.book[sh.tasks[j].party].room}"]`);
      const out = { lost: WORK.today().score[j], who: t.who !== who, kind: t.kind, was: sh.tasks[m].kind, tick: row.classList.contains('fr-in'), key: !key(sh.book[sh.tasks[j].party].room).disabled };
      CLASS.close(); return JSON.stringify(out); })()"""))
    assert r['lost'] == 3 and r['who'] and not r['tick'] and r['key'], r
    assert r['kind'] in ('memo', 'request', 'where'), r   # the book's question to another party, or a want or a where in its place

# ruling 36, M-4: 佐藤 is told from 金田 and 味村 at a glance (dark hair, no moustache — they are grey with moustaches), his look still
# drawn as written (HERO.norm keeps it); the wrestler reads as a big man (no blush) and his topknot is tied with a 元結's white, never a
# girl's red ribbon (TOWN.GUESTS' tie)
def test_sato_and_the_wrestler_read_at_card_size(b):
    r = json.loads(ev(b, """(() => { const s = TOWN.CAST.sato.look, P = TOWN.CRUISE.PEOPLE, k = P.kaneda.look, a = P.ajimura.look, n = HERO.norm(s), g = TOWN.GUESTS.rikishi;
      const face = TOWNEV.face('rikishi');
      return JSON.stringify({ sato: [s.beard, s.hairColor !== k.hairColor && s.hairColor !== a.hairColor, Object.keys(n).filter((x) => n[x] !== s[x])],
        rikishi: [g.look.cheeks, face.includes('stroke="#d0574b" stroke-width="2.6"'), face.includes(`stroke="${g.tie}" stroke-width="2.6"`), HERO.OPTS.top.some(([c]) => c === g.tie)] }); })()"""))
    assert r['sato'] == ['none', True, []], r
    assert r['rikishi'] == ['none', False, True, True], r

# ---- the final fix round (2026-11-25: the final reviews and the parked list, task-8c) ----
# the final review's I-1: はい shuts the rules card (CLASS.close), which draws the place anew at once when it is out of date (an hour
# turned while the card was up) — 佐藤's first word opens in the lobby as it is drawn now, never in the old one taken off the page; tapped
# through, the フロント's card
def test_yes_on_the_rules_begins_the_first_shift_after_a_redraw(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + WORK4 + FR + """ card(['S', 'S', 'S', 'S']); state.currentUnit = 'm15'; saveState(); window.speakAs = () => Promise.resolve();
      clock(false); await at('ryokan'); const old = yard();
      WORK.intro(yard(), 'front'); await wait(200); yard().dataset.sig = 'stale';   // the hour turned while the rules card was up
      click('.wk-rules [data-rules="yes"]'); await wait(300);
      const t = document.querySelector('.talk'), out = { redrawn: yard() !== old, talk: Boolean(t) && t.textContent.length > 0 };
      for (let i = 0; i < 40 && !fc(); i++) { click('.talk'); await wait(150); }
      out.card = Boolean(fc()); CLASS.close(); return JSON.stringify(out); })()"""))
    assert r == {'redrawn': True, 'talk': True, 'card': True}, r

# ruling 37 (the final review's I-2): 交通費 — the day's first onsen shift pays back what the ride up to 湯の花 cost that day (the
# ticket, kept on arriving there, on this device — every ticket paid in full at the machine since 2026-11-25): from みなと 420, once (a
# second shift that day: none); via 白鷺 260; no ride, none. Shown on the results as 交通費 (none of the card's +% on it); the day kept as
# oneADay.koutsuhi, kept by a load and by a merge with a copy that has none, either way
def test_the_fare_up_is_paid_back_once_with_the_days_first_shift(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + CALM + WORK4 + """ card(['S', 'S', 'S', 'S']); state.currentUnit = 'm7'; state.purse.gift = 3000;
      state.work.res['2026-10-21'] = { place: 'annai', done: 10, score: {}, yen: 1, grade: 'C' }; saveState(); localStorage.removeItem('nq_fare'); localStorage.setItem('nq_work_free', '1');
      WORK.register('annai', { run: (ctx) => { window.__ctx = ctx; }, lines: () => {} });   // the shift done by hand (been there before: no first word)
      const day = (d) => { TOWNEV.clock = { h: 10, day: new Date(2026, 10, d) }; };
      const shift = async () => { window.__ctx = null; WORK.start(yard(), 'annai'); await watch(() => window.__ctx, 3000); for (let k = 0; k < 10; k++) __ctx.right(k, 0); __ctx.finish();
        await watch(() => document.querySelector('.wk-result'), 3000); const res = document.querySelector('.wk-result'), row = res ? [...res.querySelectorAll('.crr-row')].find((x) => /交通費/.test(x.textContent)) : null;
        const got = [WORK.today().yen, row ? row.textContent.replace(/\\s+/g, '') : '']; document.querySelectorAll('.wk-result').forEach((e) => e.remove()); return got; };
      const out = {};
      day(10); await at('station'); RIDE.machine(yard(), 'minato'); await wait(100); click('.kb-fare[data-f="420"]'); await wait(60); click('.kb-pay'); await wait(200); CLASS.close();
      await at('platform'); RIDE.board(yard(), 1); await arrive('yunohana', '#/onsen'); out.minato = await shift(); out.again = await shift(); out.day = (state.oneADay || {}).koutsuhi;
      const T = (s, t) => Object.assign(JSON.parse(JSON.stringify(s)), { updatedAt: t }), mine = normalizeState(JSON.parse(JSON.stringify(state))), theirs = JSON.parse(JSON.stringify(mine)); delete theirs.oneADay;
      out.kept = [mine.oneADay && mine.oneADay.koutsuhi].concat([['2026-11-25T10:00:00.000Z', '2026-11-25T11:00:00.000Z'], ['2026-11-25T12:00:00.000Z', '2026-11-25T11:00:00.000Z']]
        .flatMap(([a, c]) => [SyncCore.mergeStates(T(mine, a), T(theirs, c)), SyncCore.mergeStates(T(theirs, c), T(mine, a))]).map((m) => (normalizeState(m).oneADay || {}).koutsuhi));
      day(11); await at('castle'); RIDE.machine(yard(), 'shirasagi'); await wait(100); click('.kb-fare[data-f="260"]'); await wait(60); click('.kb-pay'); await wait(200); click('.kb-ride');
      await arrive('yunohana', '#/onsen'); out.shirasagi = await shift();
      day(12); await at('onsen'); out.none = await shift(); localStorage.removeItem('nq_work_free'); return JSON.stringify(out); })()"""))
    assert r['minato'][0] == 680 and '交通費' in r['minato'][1] and '+420円' in r['minato'][1], r   # 200 + S 50 + ベテラン's 4%, and the 420 back
    assert r['again'] == [260, ''] and r['day'] == '2026-11-10', r   # once a day
    assert r['kept'] == ['2026-11-10'] * 5, r   # a load, and a merge with a copy without it, either copy newer, either way round
    assert r['shirasagi'][0] == 520 and '+260円' in r['shirasagi'][1], r
    assert r['none'] == [260, ''], r

# the final review's I-1, the egg stand's own case: full today, the right coin shuts its card (CLASS.close) — the square drawn anew at once
# when it is out of date (an hour turned while the card was up) — and his 「まだ おなかが いっぱいです。」 opens on the square as drawn now
def test_the_egg_stand_says_full_on_the_square_as_drawn_now(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + CALM + """ const t = todayStr();
      REG.vocab.filter((v) => jaPlain(v.w) === '卵').forEach((v) => { state.srs[v.key] = { b: 3, due: addDays(t, 9), n: 4, ok: 4, ng: 0, s: 9, d: 5, last: addDays(t, -2), intro: addDays(t, -20), lrn: addDays(t, -2) }; });
      state.purse.today = { day: dateStr(TOWNEV.today()), f: 2, d: 0, b: 0, o: 0 }; saveState();
      await at('yubatake'); const old = yard(); click('.yard .use-btn[data-use="tamago"]'); await watch(() => document.querySelector('.yb-stand'), 6000);
      yard().dataset.sig = 'stale'; click('.yb-coin[data-coin="100"]'); await watch(() => document.querySelector('.talk-card'), 4000);
      return JSON.stringify({ redrawn: yard() !== old, said: ((document.querySelector('.talk-ja') || {}).textContent || '').trim() }); })()"""))
    assert r == {'redrawn': True, 'said': 'まだ おなかが いっぱいです。'}, r

# parked 2 (Task 2): the shut ゆのはな堂 has no price board out on its pavement — nothing there to walk round; open, its board is
def test_the_shut_manju_shop_has_no_board_to_walk_round(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + CALM + """ const board = () => (YUDORI.BLOCKS.find((x) => x.id === 'board') || {}).box;
      const has = () => walkBlocks('yudori').some((bk) => bk.join() === board().join());
      TOWNEV.clock = { h: 8, day: new Date(2026, 10, 10) }; await at('yudori'); const shut = [YUDORI.open(), has()];
      TOWNEV.clock = { h: 12, day: new Date(2026, 10, 10) }; await at('yudori'); const open = [YUDORI.open(), has()];
      return JSON.stringify({ shut, open }); })()"""))
    assert r == {'shut': [False, False], 'open': [True, True]}, r

# parked 6 (Task 6's re-review): while 竹内's word after a wrong tray is said the shelves and the tray stay live — a good tapped then
# goes on the tray, one tapped off comes off it, never dropped without a sign; どうぞ waits only till the tray has changed
def test_miyage_the_shelves_stay_live_while_the_miss_word_is_said(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + CALM + WORK4 + MY + """ card(['S', 'S', 'S', 'S']); state.currentUnit = 'm11';
      window.speakAs = () => Promise.resolve(); const seed = seedWhere((sh) => sh[0].id === 'count10'); await begin(seed, 0);
      window.speakAs = () => new Promise((ok) => setTimeout(ok, 2000));   // 竹内's word: two seconds
      put(['manju6']); await wait(80); give(); await wait(200); const d = document.querySelector('.wk-miyage .om-give'), out = { off: d.disabled, miss: my().miss };
      good('manju6').click(); await wait(60); good('manju12').click(); await wait(80); out.tray = my().tray; out.on = !d.disabled;   // still being said
      give(); await watch(() => (WORK.today().score || {})[0] !== undefined, 8000); out.score = WORK.today().score[0];
      CLASS.close(); return JSON.stringify(out); })()"""))
    assert r == {'off': True, 'miss': 1, 'tray': ['manju12'], 'on': True, 'score': 1}, r

# parked 7 (Task 7's re-review): two guests who left in a huff at their check-ins — the book question's and dinner's — are each made up
# for by someone else (FRONT.instead, given the guests come so far): never the same want or where twice in a shift, never one speaker
# twice running; over 1500 afternoon shifts where both are lost
def test_two_huffs_never_bring_the_same_want_twice(b):
    r = json.loads(ev(b, """(() => { const m15 = TOWNEV.unitIdx('m15'); let both = 0, swaps = 0; const bad = [];
      for (let s = 1; s <= 1500; s++) { const sh = FRONT.make(m15, false, s), ci = (who) => sh.tasks.findIndex((x) => x.kind === 'checkin' && x.who === who);
        const lost = sh.tasks.filter((x) => ['memo', 'dinner'].includes(x.kind) && ci(x.who) >= 0); if (lost.length < 2) continue; both++;
        const sc = {}; lost.forEach((t) => { sc[ci(t.who)] = 3; });
        const came = {}; for (let k = 0; k < 10; k++) { const t = sh.tasks[k], j = ['memo', 'dinner'].includes(t.kind) ? ci(t.who) : -1;
          came[k] = j >= 0 && j < k && sc[j] >= 3 ? FRONT.instead(sh, k, sc, m15, came) : t; if (came[k] !== t) swaps++; }
        const seq = Array.from({ length: 10 }, (_, k) => came[k]), ids = seq.map((t) => t.id);
        if (new Set(ids).size !== ids.length) bad.push(s + ':twice:' + ids.join());
        seq.forEach((t, k) => { if (k && t.who === seq[k - 1].who) bad.push(s + ':running:' + t.who); }); }
      return JSON.stringify({ both, swaps, n: bad.length, bad: bad.slice(0, 4) }); })()"""))
    assert r['both'] > 300 and r['swaps'] > 600 and r['n'] == 0, r

# parked 8 (Task 7): the mood mark (💦／💢) sits on the face's top corner, clear of the bubble's edge, with the words opened (two misses):
# the 観光案内所's 40 px face and the おみやげ屋's 44 px one, at 390×844 and 360×640
def test_the_mood_mark_stays_by_the_face_at_the_annai_and_the_miyage(b):
    out = {}
    for w, h in ((390, 844), (360, 640)):
        out[w] = json.loads(b.run([("metrics", (w, h)), ("nav", URL), ("wait", READY), ("eval", "(async () => { " + BEGIN + CALM + WORK4 + MY + """ card(['S', 'S', 'S', 'S']); window.speakAs = () => Promise.resolve();
          const mark = (box) => { const cu = box.querySelector('.wk-cust'); cu.dataset.mood = 'mad'; cu.querySelector('.wk-emo').textContent = '💢';
            const R = (e) => e.getBoundingClientRect(), e = R(cu.querySelector('.wk-emo')), f = R(cu.querySelector('.kr-face')), bub = R(cu.querySelector('.wk-bub'));
            return { by: e.left <= f.right + 4 && e.right >= f.right - 24 && e.top <= f.top + 4 && e.bottom >= f.top + 8, clear: e.right <= bub.left + 0.5, tall: bub.height > f.height + 8 }; };
          state.currentUnit = 'm7'; state.work.res['2026-10-21'] = { place: 'annai', done: 10, score: {}, yen: 1, grade: 'C' }; saveState(); await at('onsen'); WORK.start(yard(), 'annai');
          await watch(() => ANNAI_RUN.now() && ANNAI_RUN.now().phase === 'ask' && document.querySelector('.wk-annai .an-opt'), 15000); await wait(200);
          const wrongA = () => { const t = ANNAI_RUN.now().task, i = t.opts.findIndex((o, j) => !o[2] && !document.querySelector(`.wk-annai .an-opt[data-o="${j}"]`).disabled); document.querySelector(`.wk-annai .an-opt[data-o="${i}"]`).click(); };
          wrongA(); await wait(300); wrongA(); await wait(500); const annai = mark(document.querySelector('.wk-annai')); CLASS.close();
          state.currentUnit = 'm11'; const seed = seedWhere((sh) => sh[0].id === 'two1'); await begin(seed, 0);
          put(['jam']); give(); await watch(() => ready(), 4000); await wait(100); put(['kokeshi']); give(); await watch(() => ready(), 4000); await wait(300);
          const miyage = mark(document.querySelector('.wk-miyage')); CLASS.close(); return JSON.stringify({ annai, miyage }); })()""")])[-1])
    assert all(x == {'by': True, 'clear': True, 'tall': True} for v in out.values() for x in v.values()), out

# task 2, ruling 18 (review-4's Minor 2): the おみやげ屋's customer kept waiting — their word popping up over them (JOBS.grr: again, cross)
# while their words are not yet shown — whole inside the shop's front, which clips: under 700 px tall too, where the noren is 14 px (it
# cut the word's top 4 px), on an iPhone and an SE, and on a tall screen; nothing moving for it
def test_the_miyage_pop_up_word_is_whole(b):
    out = {}
    for w, h in ((390, 664), (375, 553), (390, 844)):
        out[f'{w}x{h}'] = json.loads(b.run([("metrics", (w, h)), ("nav", URL), ("wait", READY), ("eval", "(async () => { " + BEGIN + CALM + WORK4 + MY + """ card(['S', 'S', 'S', 'S']); state.currentUnit = 'm11';
          window.speakAs = () => Promise.resolve(); await begin(5, 0); await wait(200);
          const c = document.querySelector('.wk-miyage .cls-card'), cu = c.querySelector('.wk-cust'), R = (e) => e.getBoundingClientRect(), PARTS = ['.wk-cust .kr-face', '.wk-cust .wk-bub', '.om-front', '.om-tray', '.om-opts', '.om-talk'];
          const tops = () => PARTS.map((s) => { const e = c.querySelector(s); return e ? Math.round(R(e).top * 10) / 10 : null; }), t0 = tops();
          JOBS.grr(cu, TOWN.WORK.say.waiter.cust.again[0]); await wait(700); const g = R(cu.querySelector('.wk-grr')), f = R(c.querySelector('.om-front'));
          const o = { shut: !c.querySelector('.wk-bub.wk-open'), whole: g.top >= f.top && g.bottom <= f.bottom && g.left >= f.left && g.right <= f.right, room: Math.round((g.top - f.top) * 10) / 10, still: JSON.stringify(tops()) === JSON.stringify(t0) };
          CLASS.close(); return JSON.stringify(o); })()""")])[-1])
    assert all(x['shut'] and x['whole'] and x['still'] for x in out.values()), out

# task 2, fix round 1, ruling 20 (iOS hides scrollbars, and at the shelves' floor the fade has no room): while the shelves have more below
# what shows (.wk-more), a cue says so at their foot — the 目上 customer of seed 5 at his pick, the shelves at their floor, on an iPhone
# and an SE: the cue in sight under the header, over no good and no price tag where they show, taking no tap (the noren under it takes
# it); nothing moving as it goes and comes — the shelves scrolled to their end: gone; back to their top: there again
def test_the_miyage_shelves_say_more_below(b):
    out = {}
    for w, h in ((390, 664), (375, 553)):
        out[f'{w}x{h}'] = json.loads(b.run([("metrics", (w, h)), ("nav", URL), ("wait", READY), ("eval", "(async () => { " + BEGIN + CALM + WORK4 + MY + """ card(['S', 'S', 'S', 'S']); state.currentUnit = 'm11';
          window.speakAs = () => Promise.resolve(); JOBS.pat.scale = 100; await begin(5, where(5, (c) => c.kind === 'elder')); await wait(400);
          const c = document.querySelector('.wk-miyage .cls-card'), s = c.querySelector('.om-shelves'), m = c.querySelector('.om-more'), R = (e) => e.getBoundingClientRect(); if (!m) { CLASS.close(); return JSON.stringify({ cue: false }); }
          const PARTS = ['.wk-head', '.om-shelves', '.om-front', '.wk-cust .kr-face', '.wk-cust .wk-bub', '.om-tray', '.om-give', '.om-opts', '.om-talk'];
          const tops = () => JSON.stringify(PARTS.map((q) => { const r = R(c.querySelector(q)); return [Math.round(r.top * 10) / 10, Math.round(r.bottom * 10) / 10]; }).concat([c.scrollTop]));
          const seen = () => Number(getComputedStyle(m).opacity), r = R(m), sr = R(s), top = sr.top + s.clientTop, bot = top + s.clientHeight;   // a good or tag where it shows: inside the shelves' window
          const over = (x) => { const g = R(x), t = Math.max(g.top, top), bb = Math.min(g.bottom, bot); return t < bb && r.left < g.right && r.right > g.left && r.top < bb && r.bottom > t; };
          const beneath = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2), head = R(c.querySelector('.wk-head')).bottom, fold = Math.min(R(c).top + c.clientTop + c.clientHeight, innerHeight);
          const o = { floor: sr.height <= parseFloat(getComputedStyle(s).minHeight) + 0.5, more: s.classList.contains('wk-more'), seen: seen(), inSight: r.top >= head && r.bottom <= fold && r.width >= 30 && r.height >= 10,
            covers: [...c.querySelectorAll('.om-good, .om-tag')].filter(over).map((x) => x.className), tap: Boolean(beneath && beneath.closest('.om-noren')) };
          const t0 = tops(); s.scrollTop = s.scrollHeight; await wait(400); o.end = [s.classList.contains('wk-more'), seen()]; o.still = [tops() === t0];
          s.scrollTop = 0; await wait(400); o.back = [s.classList.contains('wk-more'), seen()]; o.still.push(tops() === t0);
          CLASS.close(); return JSON.stringify(o); })()""")])[-1])
    assert all(x == {'floor': True, 'more': True, 'seen': 1, 'inSight': True, 'covers': [], 'tap': True, 'end': [False, 0], 'still': [True, True], 'back': [True, 1]} for x in out.values()), out

# task 2, fix round 1, ruling 20: a good 竹内 lights (two misses, or as the customer goes) brought into sight inside the shelves — JOBS.inSight,
# as the フロント's lit row and key; never the card's own scroll. Seed 13's 目上 customer (#4) at 390×664 wants 地酒, in the second row: at
# his pick the shelves are at their floor and it lies out of sight below them; two wrong trays handed over, it is lit, its centre takes a
# tap, the card's scroll as it was
def test_a_lit_good_comes_into_sight_on_the_shelves(b):
    r = json.loads(b.run([("metrics", (390, 664)), ("nav", URL), ("wait", READY), ("eval", "(async () => { " + BEGIN + CALM + WORK4 + MY + """ card(['S', 'S', 'S', 'S']); state.currentUnit = 'm11';
      window.speakAs = () => Promise.resolve(); JOBS.pat.scale = 100; const k = where(13, (c) => c.kind === 'elder'); await begin(13, k); await wait(400);
      const c = document.querySelector('.wk-miyage .cls-card'), s = c.querySelector('.om-shelves'), R = (e) => e.getBoundingClientRect(), want = MIYAGE.answer(my().c), g = good(want[0]);
      const tap = () => { const q = R(g), h = document.elementFromPoint(q.left + q.width / 2, q.top + q.height / 2); return Boolean(h && g.contains(h)); };
      const out = { k, want, row2: g.parentNode === c.querySelectorAll('.om-shelf')[1], floor: R(s).height <= parseFloat(getComputedStyle(s).minHeight) + 0.5, before: tap(), st0: c.scrollTop };
      const wrong = MIYAGE.goods().map((x) => x[0]).filter((x) => !want.includes(x));
      put([wrong[0]]); give(); await watch(() => my().miss === 1 && !my().busy, 5000); await wait(200); put([wrong[1]]); give(); await watch(() => g.classList.contains('wk-hint'), 5000); await wait(300);
      Object.assign(out, { lit: g.classList.contains('wk-hint'), miss: my().miss, after: tap(), st: c.scrollTop, shelves: s.scrollTop }); CLASS.close(); return JSON.stringify(out); })()""")])[-1])
    assert r['k'] == 3 and r['want'] == ['sake'] and r['row2'] and r['floor'] and not r['before'], r   # 地酒: out of sight below the shelves at their floor
    assert r['lit'] and r['miss'] == 2 and r['after'] and r['st'] == r['st0'] and r['shelves'] > 0, r   # lit and brought into sight inside the shelves; the card never scrolled

# 2026-11-25 (the user: 「新的打工回答會跑版，版面會因為回覆導致版面向上擠壓」): in the onsen's four jobs a reply moves nothing — the card, what is read
# (the board, the room, the shelves, the book), the customer's face and bubble, the replies and the talk row each keep their top from just
# before a reply, watched every 50 ms until its line is up (right: the hero's line shown; wrong: the keeper's word and why — each said after
# the customer's question, still being said when the reply is tapped), on a first shift (the hero's 中文 under his line) and a later one, at
# 390×844, 360×640 and 1280×800 — none of it re-centred (the 案内所's card rose by half of what grew in it), no bubble grown by its words
# shown, no short phone's card scrolled by itself mid-customer (the フロント's on 360×640 to its talk row as a keeper's word of two lines grew it);
# on the tall screens (390×844, 1280×800) the reading block whole at the first customer (fix round 3, ruling 12)
F_JOBS = {
  'annai': ('.wk-annai', ['.an-board', '.wk-cust .kr-face', '.wk-bub', '.an-opts', '.an-talk'], """ const N = () => ANNAI_RUN.now(); state.currentUnit = 'm7';
    if (!FIRST) state.work.res['2026-10-20'] = { place: 'annai', done: 10, score: {}, yen: 1, grade: 'C' }; saveState();
    await at('onsen'); WORK.start(yard(), 'annai'); for (let i = 0; i < 60 && !document.querySelector('.wk-annai'); i++) { click('.talk'); await wait(150); }
    const k = () => (N() || {}).k, ask = () => Boolean(N()) && N().phase === 'ask' && Boolean(document.querySelector('.wk-annai .an-opt:not(:disabled)'));
    const opt = (good) => document.querySelector(`.wk-annai .an-opt[data-o="${N().task.opts.findIndex((o) => (good ? o[2] : !o[2]))}"]`); const step = async () => {};"""),
  'nakai': ('.wk-nakai', ['.nk-art', '.nk-task .kr-face', '.nk-bub', '.nk-opts', '.nk-talk'], """ state.currentUnit = 'm8';
    if (FIRST) { state.work.res[dateStr(TOWNEV.today())] = { place: 'nakai', done: 0, score: {}, keep: { seed: 5 } }; saveState(); } else shiftAt(5);
    await at('ryokan'); WORK.start(yard(), 'nakai'); for (let i = 0; i < 60 && !document.querySelector('.wk-nakai'); i++) { click('.talk'); await wait(150); }
    const k = () => (nk() || {}).k, ask = () => Boolean(nk()) && nk().phase === 'ask' && !nk().busy && Boolean(document.querySelector('.wk-nakai .nk-opt:not(:disabled)'));
    const step = async () => { if (ready() && nk().phase === 'do') await solve(); };"""),
  'miyage': ('.wk-miyage', ['.om-shelves', '.wk-cust .kr-face', '.wk-bub', '.om-tray', '.om-opts', '.om-talk'], """ state.currentUnit = 'm11';
    const r0 = MIYAGE.make(m11, 5).findIndex((c) => MIYAGE.steps(c).includes('reply'));   // the shift taken up at its first customer with a reply
    if (FIRST) { state.work.res[dateStr(TOWNEV.today())] = { place: 'miyage', done: r0, score: upTo(r0), keep: { seed: 5 } }; saveState(); } else shiftAt(5, r0, upTo(r0));
    await at('yudori'); WORK.start(yard(), 'miyage'); for (let i = 0; i < 60 && !document.querySelector('.wk-miyage'); i++) { click('.talk'); await wait(150); }
    const k = () => (my() || {}).k, ask = () => Boolean(my()) && my().phase === 'reply' && !my().busy && Boolean(document.querySelector('.wk-miyage .om-opt:not(:disabled)'));
    const step = async () => { if (ready() && my().phase === 'pick') await serve(); };"""),
  'front': ('.wk-front', ['.fr-desk', '.wk-cust .kr-face', '.wk-bub', '.fr-opts', '.fr-talk'], """ state.currentUnit = 'm15'; clock(false);
    if (FIRST) { state.work.res[dateStr(TOWNEV.today())] = { place: 'front', done: 0, score: {}, keep: { seed: 5, morning: false } }; saveState(); } else shiftAt(5, false);
    await at('ryokan'); WORK.start(yard(), 'front'); for (let i = 0; i < 60 && !document.querySelector('.wk-front'); i++) { click('.talk'); await wait(150); }
    const k = () => (fr() || {}).k, ask = () => ready() && fr().step !== 1 && Boolean(document.querySelector('.wk-front .fr-opt:not(:disabled)'));
    const step = async () => { if (ready() && fr().step === 1) await serve(); };""")}
F_FLOW = """ window.speakAs = () => new Promise((ok) => setTimeout(ok, 1500));
  const tops = () => { const o = {}, c = document.querySelector(CARD + ' .cls-card'); o.card = c ? Math.round(c.getBoundingClientRect().top) : null; o.scroll = c ? c.scrollTop : null;
    ROWS.forEach((q) => { const e = document.querySelector(CARD + ' ' + q); o[q] = e && e.offsetParent ? Math.round(e.getBoundingClientRect().top) : null; }); return o; };
  const until = async (f, ms = 30000) => { const t0 = Date.now(); while (!f() && Date.now() - t0 < ms) { await step(); await wait(60); } return f(); };
  const heroSaid = () => Boolean(document.querySelector(CARD + ' :is(.wk-say.nk-me, .wk-say.om-me)')) || [...document.querySelectorAll(CARD + ' [data-who="me"] .wk-me')].some((e) => e.textContent.trim());
  const keeperSaid = () => Boolean(document.querySelector(CARD + ' .wk-say.bad'));
  const gone = (k0) => k() !== k0 || !document.querySelector(CARD + ' .cls-card') || Boolean(document.querySelector(CARD + ' :is(.wk-cust.bye, .nk-task.nk-bye)'));
  const follow = async (a, k0, said) => { const t0 = Date.now(); let saw = 0, moved = null;
    while (Date.now() - t0 < 6000) { await wait(50); if (gone(k0)) break; const x = tops(), d = Object.keys(a).filter((q) => a[q] !== null && x[q] !== null && Math.abs(a[q] - x[q]) > 1);
      if (d.length && !moved) moved = Object.fromEntries(d.map((q) => [q, [a[q], x[q]]]));
      if (said()) { if (!saw) saw = Date.now(); else if (Date.now() - saw > 300) break; } }
    return { moved, said: Boolean(saw) }; };
  if (!(await until(ask))) return JSON.stringify({ err: 'no ask' }); await wait(500); const k0 = k(), a = tops(), rd = document.querySelector(CARD + ' ' + READ), whole = rd ? rd.scrollHeight - rd.clientHeight <= 1 : null;
  opt(true).click(); const right = await follow(a, k0, heroSaid);
  if (!(await until(() => ask() && k() !== k0))) return JSON.stringify({ err: 'no next', right }); await wait(500); const k1 = k(), c = tops(); opt(false).click(); const wrong = await follow(c, k1, keeperSaid);
  CLASS.close(); return JSON.stringify({ right, wrong, whole });"""
F_READ = {'annai': '.an-board', 'front': '.fr-desk', 'nakai': '.nk-stage', 'miyage': '.om-shelves'}   # the reading block (fix round 3, ruling 12): whole at the first customer on a tall screen

def test_a_reply_moves_nothing_in_the_onsen_jobs(b):
    bad = []
    for job, (card, rows, js) in F_JOBS.items():
        helper = {'annai': '', 'nakai': NK, 'miyage': MY, 'front': FR}[job]
        for first in (True, False):
            for w, h in ((390, 844), (360, 640), (1280, 800)):
                r = json.loads(b.run([("metrics", (w, h)), ("nav", URL), ("wait", READY), ("eval", "(async () => { " + BEGIN + CALM + WORK4 + helper + " card(['S', 'S', 'S', 'S']); const FIRST = " + ('true' if first else 'false') + ";"
                    + js + f" const CARD = '{card}', ROWS = {json.dumps(rows)}, READ = '{F_READ[job]}';" + F_FLOW + " })()")], timeout=150)[-1])
                if 'err' in r: bad.append((job, first, w, r)); continue
                if h != 640 and r['whole'] is False: bad.append((job, 'first' if first else 'later', w, 'its reading block cut on a tall screen'))   # 390×844, 1280×800: the 案内所's six cards, the フロント's book and keys whole
                for moment in ('right', 'wrong'):
                    if r[moment]['moved'] or not r[moment]['said']: bad.append((job, 'first' if first else 'later', w, moment, r[moment]))
    assert bad == [], bad

# fix rounds 2–3 and task 2, rulings 8, 12 and 17 (the user plays on an iPhone: 「新的打工回答會跑版，版面會因為回覆導致版面向上擠壓」): the
# onsen's four job cards are columns no taller than the screen. Whole first shifts in Safari on an iPhone (390×664) whose seeds between them
# bring every kind of customer the job has — the kinds read from the job's own code as it runs (what its shifts bring over 300 seeds,
# and the lists it keeps), so a kind added later fails here till a seed here brings it — and seed 5's on an SE (375×553): a wrong reply,
# then the right one; the フロント's keys, the 仲居's things to set right, and the おみやげ屋's picks as a player makes them (a good not
# wanted put on and taken back by a tap on the tray where it lies, the goods one at a time, that good again — every good on the tray for
# 金田 — and taken back on its shelf, どうぞ). Every tap a real one (ip_drive: a trusted press and release) at the control's centre, once
# that point is hit-tested to it (the book or the shelves scrolled first should they hide it, as the player would; on an SE a control
# under the fold is reached by the player's own scroll of the card, noted). In the page from before the job opens, every painted frame
# (requestAnimationFrame) from each customer's draw till they leave — the last one till the card shuts, its closing word said — the top
# and the foot of the card, its header and ✕, the reading block, the face, the bubble, the replies and each reply, the talk row, and the
# job's own (the おみやげ屋's front and tray; the フロント's book and keys, as their desk scrolls them) against the first frame: none moves
# more than 1 px (the face and the bubble as they leave aside), the card's scroll never changes; the ✕ whole in every frame (its centre
# and four points 2 px inside its round edge, on its diagonals, each take a tap); after each reply the bubble, the replies and the talk
# row take a tap at their centres (390×664; on an SE what lies under the fold is the report's: IP_UNDER); every tap lands; each run's
# exact count. IP_JOBS: job → (customers a shift, helpers, the 390×664 runs [(seed, morning)], its parts and steps, its first shift opened)
IP_JOBS = {
  'front': (10, FR, [(5, False), (14, False), (1, True)], """ const CARD = '.wk-front', READ = '.fr-desk', OPTS = '.fr-opts', OPT = '.fr-opt', TALK = '.fr-talk', BUB = '.wk-cust .wk-bub', FACE = '.wk-cust .kr-face', EXTRA = { lobby: '.fr-lobby', book: '.fr-book', board: '.fr-board' }, INNER = ['book', 'board'];
    const runNow = () => fr(), ask = () => ready() && fr().step !== 1 && Boolean(document.querySelector('.wk-front .fr-opt:not(:disabled)')), need = () => (ready() && fr().step === 1 ? 'key' : null);
    const doStep = async () => [['key', await tap(key(fr().task.room), '.fr-desk')]];
    const kindOf = (t) => t.fun || (t.bday ? 'bday' : t.kind === 'memo' ? 'memo:' + t.ask : t.kind);   // a book question by what it asks: tonight's shrimp, dinner's time
    const KINDS = () => SEEDS.flatMap((s) => [false, true].flatMap((am) => FRONT.make(m15, am, s).tasks.map(kindOf))).concat(Object.keys(TOWN.ONSEN.front.fun));""",
    """ state.currentUnit = 'm15'; clock(MORNING); state.work.res[dateStr(TOWNEV.today())] = { place: 'front', done: 0, score: {}, keep: { seed: SEED, morning: MORNING } }; saveState();
    await at('ryokan'); WORK.start(yard(), 'front'); for (let i = 0; i < 60 && !document.querySelector('.wk-front'); i++) { click('.talk'); await wait(150); }"""),
  'annai': (10, '', [(5, False), (6, False), (14, False)], """ const CARD = '.wk-annai', READ = '.an-board', OPTS = '.an-opts', OPT = '.an-opt', TALK = '.an-talk', BUB = '.wk-cust .wk-bub', FACE = '.wk-cust .kr-face', EXTRA = { glass: '.an-glass' }, INNER = [];
    const N = () => ANNAI_RUN.now(), m7 = TOWNEV.unitIdx('m7'), runNow = () => N(), ask = () => Boolean(N()) && N().phase === 'ask' && Boolean(document.querySelector('.wk-annai .an-opt:not(:disabled)')), need = () => null, doStep = async () => [];
    const opt = (good) => document.querySelector(`.wk-annai .an-opt[data-o="${N().task.opts.findIndex((o) => (good ? o[2] : !o[2]))}"]`);
    const kindOf = (t) => t.fun || t.kind, KINDS = () => SEEDS.flatMap((s) => ANNAI.make(m7, s).tasks.map(kindOf)).concat(ANNAI.FUN);""",
    """ state.currentUnit = 'm7'; state.work.res[dateStr(TOWNEV.today())] = { place: 'annai', done: 0, score: {}, keep: { seed: SEED } }; saveState();
    await at('onsen'); WORK.start(yard(), 'annai'); for (let i = 0; i < 60 && !document.querySelector('.wk-annai'); i++) { click('.talk'); await wait(150); }"""),
  'nakai': (16, NK, [(3, False)],   # seed 3: the cat asleep in a room and 千代 finding a thing seen to, too
    """ const CARD = '.wk-nakai', READ = '.nk-stage', OPTS = '.nk-opts', OPT = '.nk-opt', TALK = '.nk-talk', BUB = '.nk-bub', FACE = '.nk-task .kr-face', EXTRA = { top: '.nk-top' }, INNER = [];
    const runNow = () => nk(), ask = () => Boolean(nk()) && nk().phase === 'ask' && !nk().busy && Boolean(document.querySelector('.wk-nakai .nk-opt:not(:disabled)')), need = () => (Boolean(nk()) && nk().phase === 'do' && !nk().busy ? 'do' : null);
    const doStep = async () => { const n = nk(), [key] = n.task.target, many = Array.isArray(n.st[key]), i = many ? Math.max(0, empty(n, key)) : undefined;
      return [['do ' + key, await tap(document.querySelector(`.wk-nakai .nk-art [data-k="${key}"]` + (many ? `[data-i="${i}"]` : '')))]]; };
    const kindOf = (t) => t.kind, KINDS = () => SEEDS.flatMap((s) => NAKAI.make(m8, s).tasks.map(kindOf));""",
    """ state.currentUnit = 'm8'; state.work.res[dateStr(TOWNEV.today())] = { place: 'nakai', done: 0, score: {}, keep: { seed: SEED } }; saveState();
    await at('ryokan'); WORK.start(yard(), 'nakai'); for (let i = 0; i < 60 && !document.querySelector('.wk-nakai'); i++) { click('.talk'); await wait(150); }"""),
  'miyage': (10, MY, [(13, False)], """ const CARD = '.wk-miyage', READ = '.om-shelves', OPTS = '.om-opts', OPT = '.om-opt', TALK = '.om-talk', BUB = '.wk-cust .wk-bub', FACE = '.wk-cust .kr-face', EXTRA = { front: '.om-front', tray: '.om-tray' }, INNER = [];
    const runNow = () => my(), ask = () => Boolean(my()) && my().phase === 'reply' && !my().busy && Boolean(document.querySelector('.wk-miyage .om-opt:not(:disabled)')), need = () => (Boolean(my()) && my().phase === 'pick' && !my().busy ? 'pick' : null);
    const doStep = async () => { const out = [], n0 = my(), want = MIYAGE.answer(n0.c), extra = MIYAGE.goods().map((g) => g[0]).find((g) => !want.includes(g)), tr = document.querySelector('.wk-miyage .om-tray');
      const put = async (g, what) => { out.push([what + ' ' + g, await tap(good(g), '.om-shelves')]); await wait(120); };
      await put(extra, 'extra');
      { const ch = tr.querySelector(`.om-chip[data-t="${extra}"]`), r = ch && RR(ch); out.push(['tray takes ' + extra, Boolean(r) && (await tapAt(tr, r.left + r.width / 2, r.top + r.height / 2)) && !my().tray.includes(extra)]); await wait(120); }
      for (const g of want) await put(g, 'good');
      await put(extra, 'extra again'); const most = my().tray.length; await put(extra, 'shelf takes');
      PICKS.push([n0.k, n0.c.kind, most, my().tray.slice().sort().join() === want.slice().sort().join()]);   // the most on the tray at once; the tray as wanted at どうぞ
      out.push(['どうぞ', await tap(document.querySelector('.wk-miyage .om-give'))]); return out; };
    const kindOf = (c) => c.kind, KINDS = () => SEEDS.flatMap((s) => MIYAGE.make(m11, s).map(kindOf)).concat(MIYAGE.KINDS);""",
    """ state.currentUnit = 'm11'; state.work.res[dateStr(TOWNEV.today())] = { place: 'miyage', done: 0, score: {}, keep: { seed: SEED } }; saveState();
    await at('yudori'); WORK.start(yard(), 'miyage'); for (let i = 0; i < 60 && !document.querySelector('.wk-miyage'); i++) { click('.talk'); await wait(150); }""")}
IP_UNDER = {}   # what lay under the fold on an SE after a reply (the report's), by job
IP_KIT = """ const SEEDS = Array.from({ length: 300 }, (_, i) => i + 1), PICKS = [], PLAYER = [];
  const C = () => document.querySelector(CARD + ' .cls-card'), RR = (e) => e.getBoundingClientRect(), shown = (e) => Boolean(e) && e.getClientRects().length > 0;
  const win = () => { const c = C(), ct = RR(c).top + c.clientTop, h = c.querySelector('.wk-head'); return [Math.max(ct, h ? RR(h).bottom : ct, 0), Math.min(ct + c.clientHeight, innerHeight)]; };
  const hitOn = (e) => { if (!shown(e)) return false; const r = RR(e), x = r.left + r.width / 2, y = r.top + r.height / 2, [t, b] = win(); if (y < t || y > b) return false; const h = document.elementFromPoint(x, y); return Boolean(h && (h === e || e.contains(h))); };
  // a real tap: the test's driver (ip_drive) answers __nqTap with trusted input at the point — a press and a release (dy: a wheel turn)
  let TAPS = 0; const TAPW = {}; window.__nqTapped = (id) => { const f = TAPW[id]; delete TAPW[id]; if (f) f(true); };
  const press = (x, y, dy = 0) => new Promise((ok) => { const id = ++TAPS; TAPW[id] = ok; window.__nqTap(JSON.stringify({ id, x, y, dy })); });
  const tapAt = async (e, x, y) => { const [t, b] = win(); if (y < t || y > b || x < 0 || x > innerWidth) return false; const h = document.elementFromPoint(x, y); if (!h || !(h === e || e.contains(h))) return false; await press(x, y); return true; };
  const tap = async (e, scroller) => { if (!shown(e)) return false; const c = C();
    if (scroller) { const s = c.querySelector(scroller), [t, b] = win(), sr = RR(s), top = Math.max(t, sr.top), bot = Math.min(b, sr.bottom), r = RR(e); if (r.top < top) s.scrollTop -= top - r.top + 2; else if (r.bottom > bot) s.scrollTop += r.bottom - bot + 2; }
    let r = RR(e), y = r.top + r.height / 2; const [t, b] = win();
    if (SE && (y < t + 4 || y > b - 4)) { await playerScroll(y < t + 4 ? y - t - 24 : y - b + 24); r = RR(e); }   // an SE: under the fold — the player scrolls the card to it
    return tapAt(e, r.left + r.width / 2, r.top + r.height / 2); };"""
IP_SAMPLER = r""" const SPEAK = 400; window.speakAs = () => new Promise((ok) => setTimeout(ok, SPEAK));
  const PARTS = Object.assign({ card: '', head: '.wk-head', x: '.cls-x', read: READ, face: FACE, bub: BUB, opts: OPTS, talk: TALK }, EXTRA);
  const snap = () => { const c = C(); if (!c) return null; const o = { st: c.scrollTop }, rd = c.querySelector(READ), rs = rd ? rd.scrollTop : 0;
    for (const [n, q] of Object.entries(PARTS)) { const e = q ? c.querySelector(q) : c; if (!shown(e)) { o[n] = null; continue; } const r = RR(e), d = INNER.includes(n) ? rs : 0; o[n] = [r.top + d, r.bottom + d]; }
    [...c.querySelectorAll(OPT)].forEach((b, i) => { if (shown(b)) o['o' + i] = [RR(b).top, RR(b).bottom]; }); return o; };
  const xWhole = () => { const c = C(), x = c && c.querySelector('.cls-x'); if (!x) return false; const r = RR(x), cx = r.left + r.width / 2, cy = r.top + r.height / 2, d = (Math.min(r.width, r.height) / 2 - 2) / Math.SQRT2;
    return [[0, 0], [-d, -d], [d, -d], [-d, d], [d, d]].every(([dx, dy]) => { const h = document.elementFromPoint(cx + dx, cy + dy); return Boolean(h && h.closest('.cls-x')); }); };   // the ✕ is round: its corners' points 2 px inside its edge
  const leaving = () => Boolean(document.querySelector(CARD + ' :is(.wk-cust.bye, .nk-task.nk-bye)'));
  const who = () => { const n = runNow(); return n ? (n.task || n.c || null) : null; };
  const S = { cur: null, base: null, recs: [], xMiss: 0, frames: 0, stop: false, hold: false };
  function cmp(x) { const rec = S.recs[S.recs.length - 1], base = S.base, bye = leaving();
    for (const key of Object.keys(x)) { if (key === 'st' || (bye && (key === 'face' || key === 'bub'))) continue;
      if (x[key] && base[key] === undefined) { base[key] = x[key]; continue; }   // a part come on show (a reply): from then
      if (!x[key] || !base[key]) continue;
      const m = Math.max(Math.abs(x[key][0] - base[key][0]), Math.abs(x[key][1] - base[key][1])); if (m > (rec.max[key] || 0)) rec.max[key] = Math.round(m * 10) / 10; }
    rec.st = Math.max(rec.st, Math.abs(x.st - base.st)); }
  function tick() { const c = C();   // from before the job opens; (the card's own opening — talkIn, the whole card rising into place — waited out before a customer's first frame is taken)
    if (c) { S.frames++; if (!xWhole()) S.xMiss++; const w = who(), opening = c.closest('.cls').getAnimations().some((a) => a.playState === 'running');
      if (w && w !== S.cur) { S.cur = w; S.base = null; S.recs.push({ k: runNow().k, kind: kindOf(w), max: {}, st: 0, read: null, start: null }); }
      if (S.cur && !opening && !S.hold) { if (!S.base) { const rec = S.recs[S.recs.length - 1], rd = c.querySelector(READ); S.base = snap(); if (rec.start === null) { rec.read = rd ? Math.round(RR(rd).height) : null; rec.start = Math.round(c.scrollTop); } } else cmp(snap()); } }
    if (!S.stop) requestAnimationFrame(tick); }
  requestAnimationFrame(tick);
  // the player's own scroll of the card (a wheel turn over its header): the customer's frames taken again from where it stops
  const playerScroll = async (dy) => { const c = C(), h = c.querySelector('.wk-head'), hr = RR(h), n = runNow(); S.hold = true; await press(hr.left + hr.width / 3, hr.top + hr.height / 2, Math.round(dy)); await wait(500);
    PLAYER.push([n ? n.k : null, Math.round(dy), Math.round(c.scrollTop)]); S.base = null; S.hold = false; };"""
IP_FLOW = r""" const keeperSaid = () => [...document.querySelectorAll(CARD + ' .wk-say.bad')].some((e) => shown(e) && e.textContent.trim());
  const heroSaid = () => [...document.querySelectorAll(CARD + ' :is(.wk-say.nk-me, .wk-say.om-me)')].some(shown) || [...document.querySelectorAll(CARD + ' [data-who="me"] .wk-me')].some((e) => shown(e) && e.textContent.trim());
  const sees = () => { const c = C(), under = (q) => { const e = c.querySelector(q); return shown(e) ? Math.max(0, Math.round(RR(e).bottom - win()[1])) : 0; };
    return { bub: hitOn(c.querySelector(BUB)), opts: hitOn(c.querySelector(OPTS)), talk: hitOn(c.querySelector(TALK)), under: { bub: under(BUB), opts: under(OPTS), talk: under(TALK) } }; };
  const out = { after: [], taps: [], stuck: null }, done = new Set(), t0 = Date.now();
  while (C() && Date.now() - t0 < 300000) {
    const t1 = Date.now(); while (C() && !ask() && !need() && Date.now() - t1 < 30000) await wait(60);
    if (!C()) break; if (!ask() && !need()) { out.stuck = [runNow() && runNow().k, 'nothing to do']; break; }
    const n = runNow(), key = n.k + '/' + (n.step === undefined ? '' : n.step) + '/' + (n.phase || '');
    if (need()) { await wait(250); if (!need()) continue; const r = await doStep(); out.taps.push([n.k, r]); await wait(350); continue; }
    if (done.has(key)) { await wait(100); continue; } done.add(key);
    await wait(300); const w = opt(false);
    if (w && !w.disabled) { const ok = await tap(w); out.taps.push([n.k, [['wrong reply', ok]]]);
      if (ok) { const s1 = Date.now(); while (C() && !keeperSaid() && Date.now() - s1 < 6000) await wait(50); await wait(SPEAK + 300); if (C()) out.after.push([n.k, 'wrong', sees()]); } }
    const s2 = Date.now(); while (C() && !ask() && Date.now() - s2 < 9000) await wait(60);
    if (C() && ask()) { const r = opt(true); if (r && !r.disabled) { const ok = await tap(r); out.taps.push([n.k, [['right reply', ok]]]);
      if (ok) { const s3 = Date.now(); while (C() && !heroSaid() && Date.now() - s3 < 6000) await wait(50); await wait(250); if (C()) out.after.push([n.k, 'right', sees()]); } } }
  }
  const e1 = Date.now(); while (C() && Date.now() - e1 < 30000) await wait(100); await wait(200); S.stop = true;
  Object.assign(out, { recs: S.recs, xMiss: S.xMiss, frames: S.frames, closed: !C(), player: PLAYER, picks: PICKS, kinds: [...new Set(KINDS())].sort() }); return JSON.stringify(out);"""

def ip_drive(w, h, code, b, timeout=480):
    """`code` (an async function's body's call, returning JSON) run in b's page at w×h as an iPhone has it (device scale 2, mobile), each
    of its taps a real one: the page asks through the binding __nqTap({ id, x, y, dy }), the driver answers with trusted input at that
    point — a mouse press and release (dy: a wheel turn of dy over it) — then calls __nqTapped(id)"""
    async def go():
        async with websockets.connect(b.ws_url, max_size=None) as ws:
            seq, waits, asks = 0, {}, asyncio.Queue()
            async def call(m, params=None):
                nonlocal seq; seq += 1; i = seq; f = asyncio.get_running_loop().create_future(); waits[i] = f
                await ws.send(json.dumps({"id": i, "method": m, "params": params or {}}))
                r = await f
                if "error" in r: raise RuntimeError(f"{m}: {r['error']}")
                return r.get("result", {})
            async def read():
                async for raw in ws:
                    r = json.loads(raw)
                    if "id" in r:
                        f = waits.pop(r["id"], None)
                        if f and not f.done(): f.set_result(r)
                    elif r.get("method") == "Runtime.bindingCalled" and r["params"].get("name") == "__nqTap": asks.put_nowait(json.loads(r["params"]["payload"]))
            async def answer():
                while True:
                    a = await asks.get(); x, y = a["x"], a["y"]
                    try:
                        if a.get("dy"): await call("Input.dispatchMouseEvent", {"type": "mouseWheel", "x": x, "y": y, "deltaX": 0, "deltaY": a["dy"]})
                        else:
                            await call("Input.dispatchMouseEvent", {"type": "mouseMoved", "x": x, "y": y})
                            await call("Input.dispatchMouseEvent", {"type": "mousePressed", "x": x, "y": y, "button": "left", "buttons": 1, "clickCount": 1})
                            await call("Input.dispatchMouseEvent", {"type": "mouseReleased", "x": x, "y": y, "button": "left", "buttons": 0, "clickCount": 1})
                    finally:
                        await call("Runtime.evaluate", {"expression": f"window.__nqTapped && window.__nqTapped({int(a['id'])})"})
            async def ev(js):
                r = await call("Runtime.evaluate", {"expression": js, "returnByValue": True, "awaitPromise": True})
                if "exceptionDetails" in r: raise RuntimeError(r["exceptionDetails"].get("exception", {}).get("description", "eval error"))
                return r["result"].get("value")
            reader, answerer = asyncio.ensure_future(read()), asyncio.ensure_future(answer())
            try:
                await call("Page.enable"); await call("Page.addScriptToEvaluateOnNewDocument", {"source": "window.NQ_E2E = 1"})
                await call("Emulation.setDeviceMetricsOverride", {"width": w, "height": h, "deviceScaleFactor": 2, "mobile": True})
                await call("Page.navigate", {"url": URL}); await asyncio.sleep(0.3)
                deadline = time.time() + 90
                while True:   # the app up (READY), as Browser.run's 'wait'
                    try:
                        if await ev(READY): break
                    except Exception: pass
                    if time.time() > deadline: raise TimeoutError("the page never got ready")
                    await asyncio.sleep(0.2)
                await call("Runtime.addBinding", {"name": "__nqTap"})
                return await asyncio.wait_for(ev(code), timeout)
            finally:
                reader.cancel(); answerer.cancel()
    return asyncio.run(go())

def ip_run(b, job, w, h, seed, morning=False):
    count, helper, _, kit, start = IP_JOBS[job]
    code = ("(async () => { " + BEGIN + CALM + WORK4 + helper + " card(['S', 'S', 'S', 'S']);" + f" const SEED = {seed}, MORNING = {'true' if morning else 'false'}, SE = {'true' if h < 600 else 'false'};"
            + kit + IP_KIT + IP_SAMPLER + start + IP_FLOW + " })()")
    return count, json.loads(ip_drive(w, h, code, b))

def ip_check(b, job):
    count, _, runs, _, _ = IP_JOBS[job]
    bad, under, sums, seen, kinds = [], [], [], set(), None
    for (w, h), seed, morning in [((390, 664), s, m) for s, m in runs] + [((375, 553), 5, False)]:
        _, r = ip_run(b, job, w, h, seed, morning)
        se, run = h < 600, (job, f'{w}x{h}', seed) + (('morning',) if morning else ())
        moves = [(g['k'], q, v) for g in r['recs'] for q, v in g['max'].items() if v > 1]
        if len(r['recs']) != count: bad.append(run + ('customers', len(r['recs']), count, r['stuck']))
        if not r['closed']: bad.append(run + ('the card never shut', r['stuck']))
        if moves: bad.append(run + ('moved', [(g['k'], g['kind'], q, v) for g in r['recs'] for q, v in g['max'].items() if v > 1][:6]))
        if any(g['st'] for g in r['recs']): bad.append(run + ('the card scrolled itself', [(g['k'], g['st']) for g in r['recs'] if g['st']]))
        if r['xMiss']: bad.append(run + ('the ✕ not whole in frames', r['xMiss'], r['frames']))
        missed = [(k, t) for k, ts in r['taps'] for t in ts if not t[1]]
        if missed: bad.append(run + ('a tap missed', missed[:6]))
        if [p for p in r['picks'] if not p[3]]: bad.append(run + ('a tray not as wanted at どうぞ', [p for p in r['picks'] if not p[3]]))
        if r['player'] and not se: bad.append(run + ('the player had to scroll the card', r['player']))
        for k, m, v in r['after']:
            if se: (under.append((k, m, v['under'])) if any(v['under'].values()) else None)
            elif not (v['bub'] and v['opts'] and v['talk']): bad.append(run + (k, m, 'out of reach', v))
        if not se: seen |= {g['kind'] for g in r['recs']}; kinds = r['kinds']
        sums.append({'job': job, 'size': f'{w}x{h}', 'seed': seed, 'morning': morning, 'customers': len(r['recs']), 'kinds': sorted({g['kind'] for g in r['recs']}),
                     'moved': max([v for g in r['recs'] for v in g['max'].values()] or [0]), 'scrolled': max([g['st'] for g in r['recs']] or [0]), 'start': sorted({g['start'] for g in r['recs']}),
                     'xMiss': r['xMiss'], 'frames': r['frames'], 'taps': [sum(len(ts) for _, ts in r['taps']), len(missed)], 'player': r['player'], 'most': max([p[2] for p in r['picks']] or [0]),
                     'read': [min(g['read'] for g in r['recs']), max(g['read'] for g in r['recs'])] if r['recs'] and r['recs'][0]['read'] is not None else None,
                     'seen': [sum(1 for _, _, v in r['after'] if v['bub'] and v['opts'] and v['talk']), len(r['after'])]})
    if sorted(seen) != kinds: bad.append((job, '390x664: the kinds seen', sorted(seen), 'not the job\'s', kinds))
    IP_UNDER[job] = under
    if os.environ.get('NQ_IP_OUT'):   # the numbers for the report: each run's moves, scroll, ✕, taps, reading block heights, kinds; on an SE what lay under the fold
        with open(os.environ['NQ_IP_OUT'], 'a', encoding='utf-8') as f: f.write(json.dumps({'job': job, 'runs': sums, 'under': under, 'kinds': kinds}, ensure_ascii=False) + '\n')
    assert bad == [], bad[:12]

def test_a_reply_moves_nothing_on_an_iphone_front(b):
    ip_check(b, 'front')

def test_a_reply_moves_nothing_on_an_iphone_annai(b):
    ip_check(b, 'annai')

def test_a_reply_moves_nothing_on_an_iphone_nakai(b):
    ip_check(b, 'nakai')

def test_a_reply_moves_nothing_on_an_iphone_miyage(b):
    ip_check(b, 'miyage')

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
