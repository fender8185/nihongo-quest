"""2026-11-23 湯の花温泉 (docs/superpowers/specs/2026-11-23-onsen-work-design.md): the hot-spring town reached by train — やまなみ線 from 白鷺
(森下, 湯の花), the ride with a change at 白鷺, 湯の花駅前 (its 足湯, 観光案内所, the way home through the station's 改札)."""
import json, os, subprocess, sys, time
sys.path.insert(0, os.path.dirname(__file__))
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
  async function arrive(st, to) { await watch(end(st)); click('.rd-off'); await watch(() => location.hash === to, 5000); await wait(600); }"""

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

# みなと's machine sells as far as 湯の花 (420; its chart has やまなみ線 past 白鷺); a 420 ticket aboard 1番線: on past 白鷺 — the change
# there (its announcement), やまなみ線's stops, off at 湯の花駅前, the ticket used and nothing more to pay
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
    assert r['fares'] == [140, 170, 220, 260, 310, 350, 420], r   # 森下 350, 湯の花 420 besides みなと線's five
    assert '森下' in r['chart'] and '湯の花' in r['chart'] and '420' in r['chart'] and '350' in r['chart'] and 'のりかえ' in r['chart'], r
    assert r['ticket']['fare'] == 420 and r['paid'] == 580 and r['to'] == 'yunohana' and 'やまなみ' in r['head'], r
    p = r['phases']
    assert 'change@shirasagi' in p and 'stop@morishita' in p and p.index('stop@daigaku') < p.index('change@shirasagi') < p.index('stop@morishita') < p.index('end@yunohana'), p
    assert r['at'] == '#/onsen' and r['used'] is None and r['left'] == 580, r
    said = r['said']
    assert '{終点|しゅうてん|終點}、{白鷺|しらさぎ}です。やまなみ{線|せん}は お{乗り換え|のりかえ|轉乘}です。' in said, said
    assert said.index('つぎは {森下|もりした}、{森下|もりした}です。') < said.index('まもなく {終点|しゅうてん|終點}、{湯の花|ゆのはな}です。'), said
    assert said[-1].startswith('{終点|しゅうてん|終點}、{湯の花|ゆのはな}です。'), said
    assert not any(l.startswith('{終点|しゅうてん|終點}、{白鷺|しらさぎ}です。お{忘れ物') for l in said), said   # changing, not getting off

# Review Focus 3: a ticket bought at みなと for less than 湯の花 (310, to 白鷺) — at 白鷺 the ride may go on (やまなみ線に 乗り換える), and
# 乗り越し精算 at 湯の花 takes the 110 still owed
def test_short_ticket_pays_the_rest_at_yunohana(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + """ const out = {};
      RIDE.keep({ from: 'minato', fare: 310, day: todayStr() }); await at('platform'); RIDE.board(yard(), 1);
      await watch(end('shirasagi')); out.on = (document.querySelector('.rd-card .os-on') || {}).textContent || ''; out.off = Boolean(document.querySelector('.rd-card .rd-off'));
      click('.rd-card .os-on'); await watch(end('yunohana')); out.pay = document.querySelector('.rd-card .rd-end').textContent; out.before = yenBalance();
      click('.rd-off'); await watch(() => location.hash === '#/onsen', 5000); await wait(300);
      out.phases = phases; out.at = location.hash; out.left = yenBalance(); out.used = RIDE.ticket(); return JSON.stringify(out); })()"""))
    assert 'やまなみ' in r['on'] and r['off'], r   # 白鷺: off here, or on by やまなみ線
    assert '110' in r['pay'] and r['before'] == 1000 and r['left'] == 890 and r['at'] == '#/onsen' and r['used'] is None, r
    p = r['phases']
    assert p.index('end@shirasagi') < p.index('change@shirasagi') < p.index('end@yunohana'), p

# home from 湯の花: the station's 改札 opens its machine (湯の花 現在地, fares from there), a ticket to みなと (420): the change at 白鷺 the
# other way (みなと線は お乗り換えです), off at みなと's platform; a ticket only as far as 白鷺 (260) ends there, at the castle
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
    assert r['fares'] == [220, 260, 310, 350, 420] and r['rides'] == 1, r
    p = r['phases']
    assert 'change@shirasagi' in p and p.index('stop@morishita') < p.index('change@shirasagi') < p.index('end@minato'), p
    assert r['home'] == '#/platform' and r['left'] == 580, r
    assert '{終点|しゅうてん|終點}、{白鷺|しらさぎ}です。みなと{線|せん}は お{乗り換え|のりかえ|轉乘}です。' in r['said'] and r['said'].index('つぎは {白鷺|しらさぎ}、{白鷺|しらさぎ}です。') > r['said'].index('つぎは {森下|もりした}、{森下|もりした}です。'), r['said']
    assert r['castle'] == '#/castle' and r['left2'] == 320, r

# 白鷺 is on both lines: its machine sells to 湯の花 (260) and asks which train — みなと線 (home, first: as before) or やまなみ線
def test_shirasagi_sells_both_lines(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + """ const out = {};
      await at('castle'); RIDE.machine(yard(), 'shirasagi'); await wait(100); out.fares = [...document.querySelectorAll('.kb-fare')].map((x) => Number(x.dataset.f));
      click('.kb-fare[data-f="260"]'); await wait(60); click('.kb-pay'); await wait(200); out.rides = [...document.querySelectorAll('.kb-ride')].map((x) => [x.dataset.line || '', x.textContent.trim()]);
      click('.kb-ride[data-line="yama"]'); await arrive('yunohana', '#/onsen'); out.phases = phases; out.at = location.hash; out.left = yenBalance(); return JSON.stringify(out); })()"""))
    assert r['fares'] == [170, 220, 260, 310, 350], r
    assert [x[0] for x in r['rides']] == ['minato', 'yama'] and 'みなと' in r['rides'][0][1] and 'やまなみ' in r['rides'][1][1], r
    assert 'change@shirasagi' not in r['phases'] and 'stop@morishita' in r['phases'] and r['at'] == '#/onsen' and r['left'] == 740, r

# 湯の花駅前 (spec §3.1, §4): あかり at the 観光案内所's window calls ようこそ the first time the hero is there while she is (9–18) — once,
# kept as state.town.arrived (synced, kept on load); the 足湯: sat on, his feet in it
def test_foot_bath_and_first_greeting(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + """ const out = {}, toasts = [], said = []; window.toast = (m) => toasts.push(m); window.speakAs = (w, l) => { said.push([w, l]); return Promise.resolve(); };
      const greeted = () => said.filter(([w, l]) => w === 'akari' && /ようこそ/.test(l)).length, told = () => toasts.filter((m) => /ベテラン/.test(m)).length;
      TOWNEV.clock = { h: 21, day: new Date(2026, 10, 10) }; await at('onsen'); await wait(1500); out.night = [greeted(), told(), JSON.stringify(state.town.arrived || {})];
      click('.use-btn[data-use="annai"]'); await watch(() => toasts.some((m) => /観光案内所/.test(m)), 5000); out.shut = toasts.filter((m) => /観光案内所/.test(m)).join('|');
      TOWNEV.clock = { h: 10, day: new Date(2026, 10, 10) }; await at('onsen'); await wait(1500); out.akari = Boolean(document.querySelector('.npc-akari')); out.first = [greeted(), told(), state.town.arrived];
      out.line = (said.find(([w]) => w === 'akari') || [])[1];
      click('.use-btn[data-use="ashiyu"]'); await watch(() => document.querySelector('.yhero.bench'), 6000); await wait(300);
      const h = document.querySelector('.yhero'); out.sat = h ? [...h.classList].filter((c) => ['bench', 'os-soak'].includes(c)) : [];
      out.pop = [...document.querySelectorAll('.ypop')].map((e) => e.textContent).join('|'); out.rings = document.querySelectorAll('.os-soakrings > *').length;
      await new Promise((q) => yHeroWalk(yard(), [-300, 60], q)); await wait(100);   // up again and away: shoes back on
      out.up = [Boolean(document.querySelector('.yhero.os-soak')), document.querySelectorAll('.os-soakrings > *').length, Boolean(yh.use)];
      await at('platform'); await at('onsen'); await wait(1500); out.again = [greeted(), told()];
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
      RIDE.keep({ from: 'minato', fare: 420, day: todayStr() }); await at('platform'); RIDE.board(yard(), 1); await arrive('yunohana', '#/onsen');
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

# a ticket past 白鷺 whose rest the wallet cannot pay ends at 白鷺 — it covers that far — and is never refused (350, 森下's fare, with 50 円);
# with the money it goes on to 湯の花 and pays the 70 there; 乗り換える at 白鷺 with too little: a toast, and still the way off
def test_a_short_wallet_ends_at_shirasagi_and_rides_on_only_with_the_money(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + """ const out = {}, toasts = []; window.toast = (m) => toasts.push(m);
      state.purse.gift = 50; saveState(); RIDE.keep({ from: 'minato', fare: 350, day: todayStr() }); await at('platform');
      out.boarded = RIDE.board(yard(), 1); out.to = RIDE.now() && RIDE.now().to; await watch(end('shirasagi'));
      click('.rd-card .os-on'); await wait(200); out.on = [RIDE.now().phase, Boolean(document.querySelector('.rd-card .rd-off')), toasts.filter((m) => /錢包不夠/.test(m)).length];
      await arrive('shirasagi', '#/castle'); out.castle = [location.hash, yenBalance()];
      state.purse.gift = 1000; saveState(); RIDE.keep({ from: 'minato', fare: 350, day: todayStr() }); await at('platform');
      RIDE.board(yard(), 1); out.to2 = RIDE.now() && RIDE.now().to; await arrive('yunohana', '#/onsen'); out.onsen = [location.hash, yenBalance()];
      return JSON.stringify(out); })()"""))
    assert r['boarded'] and r['to'] == 'shirasagi' and r['on'] == ['end', True, 1] and r['castle'] == ['#/castle', 50], r
    assert r['to2'] == 'yunohana' and r['onsen'] == ['#/onsen', 930], r

# no free ride home (the coordinator's ruling 6): 湯の花's machine, the money short — the app's own way home (書房) in the card and in
# its toast; a ticket to 湯の花 bought with too little left for the way back (260 to 白鷺): a warning, the ticket sold all the same
def test_short_of_money_the_way_home_is_named(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + """ const out = {}, toasts = []; window.toast = (m) => toasts.push(m);
      state.purse.gift = 100; saveState(); await at('onsen'); RIDE.machine(yard(), 'yunohana'); await wait(100);
      click('.kb-fare[data-f="220"]'); await wait(60); click('.kb-pay'); await wait(200);
      out.home = [Boolean(document.querySelector('.kb-card .os-home')), toasts.filter((m) => /書房/.test(m)).length, RIDE.ticket()];
      click('.kb-card .os-home'); await watch(() => location.hash === '#/today', 3000); out.at = location.hash;
      state.purse.gift = 500; saveState(); await at('station'); RIDE.machine(yard(), 'minato'); await wait(100);
      click('.kb-fare[data-f="420"]'); await wait(60); click('.kb-pay'); await wait(200); CLASS.close();
      out.warn = [toasts.filter((m) => /260/.test(m) && /湯の花/.test(m)).length, RIDE.ticket() && RIDE.ticket().fare, yenBalance()];
      return JSON.stringify(out); })()"""))
    assert r['home'] == [True, 1, None] and r['at'] == '#/today', r
    assert r['warn'] == [1, 420, 80], r

# a machine never sells a ticket no train from there can take with the money left (the coordinator's ruling, fix round 2): 湯の花's 220
# (森下: no scene) with 230 円 would leave 10, and the train to 白鷺 wants 40 more — refused as if too little money, the wallet untouched,
# the way home named; 白鷺's 170 with 200 円 likewise (either train wants more than the 30 left); a ticket that one of 白鷺's trains can
# take is sold, the other's button then refused in the card, the way home named, the ride by the other still there; みなと's always (2番線)
def test_no_ticket_is_sold_that_cannot_be_ridden(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + """ const out = {}, toasts = []; window.toast = (m) => toasts.push(m);
      const buy = async (f) => { click(`.kb-fare[data-f="${f}"]`); await wait(60); click('.kb-pay'); await wait(200); };
      const money = (n) => { state.purse = { spent: {}, book: {}, gift: n }; saveState(); };
      money(230); await at('onsen'); RIDE.machine(yard(), 'yunohana'); await wait(100); await buy(220);
      out.yunohana = [yenBalance(), RIDE.ticket(), Boolean(document.querySelector('.kb-card .os-home')), toasts.filter((m) => /書房/.test(m)).length]; CLASS.close();
      toasts.length = 0; money(200); await at('castle'); RIDE.machine(yard(), 'shirasagi'); await wait(100); await buy(170);
      out.castle = [yenBalance(), RIDE.ticket(), Boolean(document.querySelector('.kb-card .os-home')), toasts.filter((m) => /書房/.test(m)).length]; CLASS.close();
      toasts.length = 0; money(290); RIDE.machine(yard(), 'shirasagi'); await wait(100); await buy(260); out.sold = [yenBalance(), (RIDE.ticket() || {}).fare];
      click('.kb-ride[data-line="minato"]'); await wait(200);
      out.refused = [Boolean(document.querySelector('.kb-card')), Boolean(document.querySelector('.kb-card .os-home')), Boolean(document.querySelector('.kb-ride[data-line="yama"]')), toasts.filter((m) => /書房/.test(m) && /50/.test(m)).length, RIDE.now() ? RIDE.now().to : null];
      CLASS.close(); money(150); await at('station'); RIDE.machine(yard(), 'minato'); await wait(100); await buy(140); out.minato = [yenBalance(), (RIDE.ticket() || {}).fare]; CLASS.close();
      return JSON.stringify(out); })()"""))
    assert r['yunohana'] == [230, None, True, 1], r   # nothing taken, no ticket, the way home in the card and the toast
    assert r['castle'] == [200, None, True, 1], r
    assert r['sold'] == [30, 260] and r['refused'] == [True, True, True, 1, None], r   # みなと線 wants 50 more: refused in the card; やまなみ線 still to hand
    assert r['minato'] == [10, 140], r   # みなと's: 2番線 to みなと港 takes any ticket

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
