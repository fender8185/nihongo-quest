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
# shop's own (TOWN.HOURS.yunohanado), pinned equal; tapped, each greets and has a word (no work talk yet: Task 4), 竹内 his まんじゅう to
# order; each has ten things to say or more, from m1 for one who rides up at N5, more by the N4 units
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
    assert r['chiyo'] and r['chiyo']['name'] == '花村 千代' and r['chiyo']['ja'] and r['chiyo']['picks'] == [], r   # a word: no work talk yet (ruling 2)
    assert r['sato'] and r['sato']['name'] == '佐藤 一' and r['sato']['ja'] and r['sato']['picks'] == [], r
    assert r['makoto'] and r['makoto']['name'] == '竹内 まこと' and r['makoto']['picks'] == ['order', 'chat'] and r['menu'] == ['onsenmanju'], r   # his まんじゅう to order
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

# spec §5.1 (rulings 6, 7, 8): every answer is read off the board — two shifts whose 足湯 differ (dogs in or not, a towel to buy or
# not) flip the right reply; the hours and prices said are the board's; what the town itself shows is the same on every board (射的
# 300 円 a go, the 湯畑 free, open all night and lit up by night, the 足湯 free and open all night); a shift is ten tourists, at most
# one of them a fun one; every tourist's three replies all differ, one right, none a ら抜き form nor a 五段 verb + れる／られる (heard
# as honorific: 入られます, 買われます); the fun ones — the phrasebook (マイク), the child's ghost (ゆうた: the playful reply right),
# ミヨコ's future
def test_annai_answers_come_from_the_board(b):
    r = json.loads(ev(b, """(() => { const MARK = /\\{([^|}]+)\\|([^|}]+)(?:\\|[^}]+)?\\}/g, kana = (s) => s.replace(MARK, '$2').replace(/\\s/g, '');
      const m7 = TOWNEV.unitIdx('m7'), f = (sh, id) => sh.board.find((x) => x.id === id), right = (t) => t.opts.find((o) => o[2])[0], out = {};
      let a = null, c = null; for (let s = 1; s < 500 && !(a && c); s++) { const x = ANNAI.make(m7, s), ft = f(x, 'ashiyu'); if (!a && ft.dog && ft.towel) a = x; if (!c && !ft.dog && !ft.towel) c = x; }
      out.found = Boolean(a && c); const said = (sh, q) => right(ANNAI.ask(sh.board, q, m7));
      out.dog = [said(a, 'dog'), said(c, 'dog')]; out.towel = [said(a, 'towelAshi'), said(c, 'towelAshi')]; out.towelPrice = said(a, 'towelAshi').includes(ANNAI.priceMark(f(a, 'ashiyu').towel));
      out.read = [a, c].map((sh) => [said(sh, 'yuTo').includes(ANNAI.timeMark(f(sh, 'yu').hours[1])), said(sh, 'kaFrom').includes(ANNAI.timeMark(f(sh, 'kagetsu').hours[0])),
        said(sh, 'priceYu').includes(ANNAI.priceMark(f(sh, 'yu').price)), said(sh, 'priceYk').includes(ANNAI.priceMark(f(sh, 'yukata').price))]);
      const fixed = [], RANUKI = ['みれます', 'みれません', 'みれる', 'かりれ', 'きれます', 'きれません', 'これます', 'これません', 'たべれ', 'ねれます', 'でれます'];
      const GODAN = ['はいられ', 'かわれ', 'いかれ', 'あそばれ', 'つかわれ', 'のられ', 'とられ', 'とまられ'], bad = []; let n = 0;
      for (let s = 1; s <= 80; s++) for (const u of [7, 9, 10, 15]) { const sh = ANNAI.make(u, s); n += sh.tasks.length;
        const sht = f(sh, 'shateki'), yb = f(sh, 'yubatake'), as = f(sh, 'ashiyu');
        if (sht.price !== 300 || yb.price !== 0 || yb.hours.join() !== '0,24' || !yb.night || as.price !== 0 || as.hours.join() !== '0,24' || sh.board.length !== 6) fixed.push(s);
        if (sh.tasks.length !== 10 || sh.tasks.filter((t) => t.fun).length > 1) bad.push(s + ':shift');
        sh.tasks.forEach((t, k) => { const js = t.opts.map((o) => o[0]);
          if (t.opts.length !== 3 || new Set(js).size !== 3 || t.opts.filter((o) => o[2]).length !== 1 || t.opts.some((o) => !o[1])) bad.push(`${s}.${k}:${t.kind}:opts`);
          if (!t.who || !t.q || !t.q[0] || !t.q[1] || !CAST_VOICE[t.who]) bad.push(`${s}.${k}:q`);
          js.forEach((j) => { const kk = kana(j); RANUKI.concat(GODAN).forEach((w) => { if (kk.includes(w)) bad.push(`${s}.${k}:${w}:${j}`); }); }); }); }
      out.fixed = fixed.slice(0, 5); out.scan = [n, bad.slice(0, 8)];
      out.fun = ['book', 'ghost', 'future'].map((k) => { const sh = ANNAI.make(m7, 3, k), t = sh.tasks.find((x) => x.fun === k); return t ? [t.who, right(t), t.opts.length, sh.tasks.filter((x) => x.fun).length] : null; });
      return JSON.stringify(out); })()"""))
    assert r['found'], r
    assert r['dog'][0].startswith('はい') and r['dog'][1].startswith('いいえ'), r   # dogs in on one board, not on the other
    assert r['towel'][0].startswith('はい') and r['towel'][1].startswith('いいえ') and r['towelPrice'], r   # a towel at the 足湯 on one, elsewhere on the other
    assert r['read'] == [[True] * 4, [True] * 4], r   # the hours and the prices said are the board's
    assert r['fixed'] == [], r   # what the town shows: the same on every board
    assert r['scan'][0] == 3200 and r['scan'][1] == [], r
    assert [x and x[0] for x in r['fun']] == ['mike', 'yuta', 'miyoko'] and all(x[2] == 3 and x[3] == 1 for x in r['fun']), r
    assert '{見|み}られるかも' in r['fun'][1][1], r   # the child's ghost: the playful reply is the right one

# spec §5, §5.1: the first shift — あかり's first word (the answers are on the board), the Chinese under the hero's reply; ten tourists,
# all right at once: S, 200 + 50 and the ベテラン card's 4%; the onsen's tune is not in yet (Task 8): no music, quietly; the next day's
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
    assert r['first'] and r['music'] == '' and r['zh'], r   # her first word, then the card; no tune yet; the Chinese under the reply (first shift)
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

# ruling 10 (spec §5.1): あかり's 〜ようになる line — 「去年から、犬も 足湯に 入れるように なりました。」 — is said on a shift whose board lets
# dogs into the 足湯, and never on one that does not
def test_akari_tells_of_the_dogs_only_on_a_board_that_lets_them_in(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + CALM + WORK4 + """ card(['S', 'S', 'S', 'S']); state.currentUnit = 'm7'; const out = {}, said = []; window.speakAs = (w, l) => { said.push([w, l]); return Promise.resolve(); };
      const m7 = TOWNEV.unitIdx('m7'), dogs = (s) => ANNAI.make(m7, s).board.find((x) => x.id === 'ashiyu').dog;
      let yes = 0, no = 0; for (let s = 1; s < 300 && !(yes && no); s++) { if (!yes && dogs(s)) yes = s; if (!no && !dogs(s)) no = s; }
      state.work.res['2026-10-20'] = { place: 'annai', done: 10, score: {}, yen: 1, grade: 'C' };   // not the first shift: no first word
      const shift = async (seed, d) => { TOWNEV.clock = { h: 10, day: new Date(2026, 10, d) }; state.work.res[dateStr(TOWNEV.today())] = { place: 'annai', done: 0, score: {}, keep: { seed } }; saveState();
        said.length = 0; await at('onsen'); WORK.start(yard(), 'annai'); await watch(() => ANNAI_RUN.now() && ANNAI_RUN.now().phase === 'ask', 12000); await wait(200);
        const line = said.filter(([w, l]) => w === 'akari' && /ように/.test(l)).map(([, l]) => l); CLASS.close(); return [ANNAI_RUN.now().seed, line]; };
      out.yes = await shift(yes, 10); out.no = await shift(no, 11);
      return JSON.stringify(out); })()"""))
    assert r['yes'][1] and '{犬|いぬ}も' in r['yes'][1][0] and 'ように なりました' in r['yes'][1][0], r
    assert r['no'][1] == [], r

# Review Focus 5: each line is said to its end — the hero's reply, the tourist's thanks, あかり's word, the next tourist's question, the
# card shut at the end — never cut by the next (lines 700 ms each); the shift paid
def test_annai_says_each_line_to_its_end(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + CALM + WORK4 + """ card(['S', 'S', 'S', 'S']); state.currentUnit = 'm7'; window.__cut = []; let talking = null;
      const says = (ms) => (w, l) => { if (talking) __cut.push(talking); const me = talking = w + ':' + l; return new Promise((ok) => setTimeout(() => { if (talking === me) talking = null; ok(); }, ms)); };
      window.speakAs = says(700); window.speak = (t) => says(400)('', t); window.stopSpeaking = () => { if (talking) __cut.push(talking + '（停）'); talking = null; };
      state.work.res['2026-10-20'] = { place: 'annai', done: 10, score: {}, yen: 1, grade: 'C' }; state.work.res['2026-11-10'] = { place: 'annai', done: 8, score: Object.fromEntries(Array.from({ length: 8 }, (_, k) => [k, 0])), keep: { seed: 11 } }; saveState();
      const R = Math.random; Math.random = () => 0.1;   // あかり's word after each
      await at('onsen'); WORK.start(yard(), 'annai');
      for (const n of [8, 9]) { await watch(() => ANNAI_RUN.now() && ANNAI_RUN.now().phase === 'ask' && ANNAI_RUN.now().k === n && !talking, 15000); const t = ANNAI_RUN.now().task;
        document.querySelector(`.wk-annai .an-opt[data-o="${t.opts.findIndex((o) => o[2])}"]`).click(); await wait(200); }
      await watch(() => document.querySelector('.wk-result'), 20000); Math.random = R;
      return JSON.stringify({ cut: __cut, shut: !document.querySelector('.wk-annai'), paid: (state.work.res['2026-11-10'] || {}).yen > 0 }); })()"""))
    assert r == {'cut': [], 'shut': True, 'paid': True}, r

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
          return JSON.stringify({ side: q.left >= 0 && q.right <= innerWidth + 1, bottom: q.bottom <= innerHeight + 1, facs: facs.length, inside: facs.every((e) => R(e).left >= q.left && R(e).right <= q.right + 0.5),
            parts: facs.every((e) => e.querySelector('svg') && e.querySelector('ruby') && e.querySelector('.an-hr') && e.querySelector('.an-pr') && e.querySelector('.an-rules')),
            glass: Boolean(c.querySelector('.an-glass .wk-cust .kr-face') && c.querySelector('.an-glass .wk-pat') && c.querySelector('.an-board')), opts: c.querySelectorAll('.an-opt').length,
            taps: taps.filter(([, ww, hh]) => ww < 40 || hh < 40), small: small.slice(0, 5) }); })()""")])[-1])
        out.append(r)
    for x in out:
        assert x['side'] and x['bottom'] and x['facs'] == 6 and x['inside'] and x['parts'] and x['glass'] and x['opts'] == 3, out
        assert x['taps'] == [] and x['small'] == [], out

# the generator (生成) has the 案内所's lines: each tourist's question in their own voice, the hero's every right reply the boards can
# make, あかり's words, the work talk of the four keepers, and the fun ones; every tourist one the town already voices (no voice left)
def test_the_generator_has_the_annai_lines(b):
    r = json.loads(ev(b, """(() => { const all = new Set(talkLines().map(([w, l]) => w + '|' + l)), m7 = TOWNEV.unitIdx('m7'), miss = [];
      for (let s = 1; s <= 40; s++) for (const u of [7, 10]) ANNAI.make(u, s).tasks.forEach((t) => { if (!all.has(t.who + '|' + t.q[0])) miss.push(t.who + '|' + t.q[0]); const ok = t.opts.find((o) => o[2])[0]; if (!all.has('hero|' + ok)) miss.push('hero|' + ok); });
      ['book', 'ghost', 'future'].forEach((k) => { const t = ANNAI.make(m7, 5, k).tasks.find((x) => x.fun === k); if (!all.has(t.who + '|' + t.q[0])) miss.push(t.who + '|' + t.q[0]); });
      const W = TOWN.WORK, A = TOWN.ONSEN.annai || {}, keepers = ['akari', 'chiyo', 'sato', 'makoto'].map((id) => [Boolean((W.hello || {})[id]), Boolean((W.yes || {})[id]), all.has(id + '|' + ((W.hello || {})[id] || [''])[0])]);
      const akari = [(A.say || {}).end, (A.say || {}).dogs].filter(Boolean).map((l) => all.has('akari|' + l[0]));
      return JSON.stringify({ miss: [...new Set(miss)].slice(0, 6), keepers, akari, first: ((W.first || {}).annai || []).length, voices: Object.keys(CAST_VOICE).length }); })()"""))
    assert r['miss'] == [] and r['keepers'] == [[True, True, True]] * 4 and r['akari'] == [True, True] and r['first'] >= 1, r
    assert r['voices'] == 68, r   # no new voice: the tourists are people the town already voices

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
