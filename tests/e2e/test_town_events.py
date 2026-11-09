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

# ---- the one waiting: its mark, the way to it, a word on entering 書房 ----
def test_one_mark_on_the_waiting_person(b):
    r = json.loads(ev(b, "(async () => { " + FRESH + TOWN_AT + """ fake([['a1', 'm1', 'kenta', 'town'], ['a2', 'm1', 'lin', 'town']]); begin('m1'); state.town.seen.lin = 1;
      await go('town', 9); const marks = [...y().querySelectorAll('.ev-mark')].map(m => m.closest('.npc').dataset.npc);
      return JSON.stringify({ marks, people: [...y().querySelectorAll('.npc')].map(e => e.dataset.npc).sort() }); })()"""))
    assert r == {'marks': ['kenta'], 'people': ['kenta', 'lin']}, r   # 健太 not met yet, there for his event

def test_the_yard_signs_point_toward_the_event(b):
    r = json.loads(ev(b, "(async () => { " + FRESH + TOWN_AT + """ fake([['a1', 'm1', 'mugi', 'beach']]); begin('m1'); state.met = { koharu: 1, mugi: 1 };
      await go('outside', 9); const dots = [...y().querySelectorAll('.way-btn .ev-dot')].map(d => d.closest('.way-btn').dataset.to);
      fake([]); await go('outside', 9); const none = y().querySelectorAll('.ev-dot').length;
      return JSON.stringify({ dots, none }); })()"""))
    assert r == {'dots': ['beach'], 'none': 0}, r

def test_entering_the_study_says_where_someone_waits_once_a_day(b):
    r = json.loads(ev(b, "(async () => { " + FRESH + TOWN_AT + """ fake([['a1', 'm1', 'kenta', 'town']]); begin('m1'); localStorage.removeItem('nq_town_hint');
      const said = []; toast = (m) => said.push(m); TOWNEV.clock = { h: 9, day: new Date(2026, 10, 10) };
      location.hash = '#/today'; document.getElementById('view').innerHTML = ''; route(); await wait(400);
      document.getElementById('view').innerHTML = ''; route(); await wait(400);
      return JSON.stringify(said); })()"""))
    assert len(r) == 1 and '小鎮' in r[0], r

# ---- the talk: several people, reply choices, glosses, the Chinese folded away, done ----
TALK_EV = """fake([['a1', 'm1', 'kenta', 'town', { title: '試吃', lines: [['kenta', '{経済|けいざい|經濟}だ！', '是經濟！'],
      { ask: '回答健太', opts: [['はい。', 1, '是。'], ['いいえ。', 0, '不對喔']], pt: 'm1' }, ['miku', 'よし！', '好！']] }]]); begin('m1');
  await go('town', 9); const k0 = kotoBalance(); y().querySelector('.npc-kenta').click();
  let t = null; for (let i = 0; i < 120 && !t; i++) { await wait(50); t = document.querySelector('.talk'); }
  const card = () => ({ name: t.querySelector('.talk-name') && t.querySelector('.talk-name').firstChild.textContent, ja: t.querySelector('.talk-ja') && t.querySelector('.talk-ja').textContent.trim(),
    opts: [...t.querySelectorAll('.talk-opt')].map(o => o.className.includes('wrong') ? 'x' : '-').join(''), why: (t.querySelector('.talk-why') || {}).textContent || '' });"""

def test_a_line_shows_its_gloss_and_folds_the_chinese(b):
    r = json.loads(ev(b, "(async () => { " + FRESH + TOWN_AT + TALK_EV + """
      const first = { gloss: t.querySelector('.talk-gloss').textContent, hidden: t.querySelector('.talk-zh').classList.contains('hide'), ja: card().ja };
      t.querySelector('[data-talk="zh"]').click(); const shown = !t.querySelector('.talk-zh').classList.contains('hide');
      return JSON.stringify({ first, shown, still: card().name }); })()"""))
    assert '經濟' in r['first']['gloss'] and r['first']['hidden'] and r['first']['ja'].startswith('経済'), r
    assert r['shown'] and r['still'] == '森 健太', r   # 中文 opens the Chinese, the line stays

def test_a_wrong_reply_shakes_and_stays(b):
    r = json.loads(ev(b, "(async () => { " + FRESH + TOWN_AT + TALK_EV + """
      t.click(); await wait(30); const ask = card(); t.click(); await wait(30); const tapped = card();
      t.querySelectorAll('.talk-opt')[1].click(); await wait(30); const wrong = card();
      return JSON.stringify({ ask, tapped, wrong }); })()"""))
    assert r['ask']['opts'] == '--' and r['ask']['name'] == '我', r   # the hero's turn: two replies
    assert r['tapped']['opts'] == '--', r   # a tap beside them does not go on
    assert r['wrong']['opts'] == '-x' and r['wrong']['why'] == '不對喔', r

def test_the_right_reply_is_said_and_the_event_finishes_with_10_koto(b):
    r = json.loads(ev(b, "(async () => { " + FRESH + TOWN_AT + TALK_EV + """
      t.click(); await wait(30); t.querySelectorAll('.talk-opt')[0].click(); await wait(30); const said = card();
      t.click(); await wait(30); const next = card(); t.click(); await wait(400);
      return JSON.stringify({ said, next, open: !!document.querySelector('.talk'), done: !!state.town.done.a1, gain: kotoBalance() - k0, mark: !!y().querySelector('.ev-mark'), seen: state.town.seen }); })()"""))
    assert r['said']['name'] == '我' and r['said']['ja'] == 'はい。' and r['said']['opts'] == '', r
    assert r['next']['name'] == '美玖' and r['next']['ja'] == 'よし！', r
    assert not r['open'] and r['done'] and r['gain'] == 10 and not r['mark'] and r['seen'] == {'kenta': 1, 'miku': 1}, r

def test_a_line_in_chinese_only_shows_no_japanese(b):
    r = json.loads(ev(b, "(async () => { " + FRESH + TOWN_AT + """ fake([['a1', 'm1', 'lin', 'town', { lines: [['lin', '', '（用中文）你好！']] }]]); begin('m1');
      await go('town', 12); y().querySelector('.npc-lin').click(); let t = null; for (let i = 0; i < 120 && !t; i++) { await wait(50); t = document.querySelector('.talk'); }
      return JSON.stringify({ ja: !!t.querySelector('.talk-ja'), zh: t.querySelector('.talk-zh').textContent, hidden: t.querySelector('.talk-zh').classList.contains('hide'), btn: !!t.querySelector('[data-talk="zh"]') }); })()"""))
    assert r == {'ja': False, 'zh': '（用中文）你好！', 'hidden': False, 'btn': False}, r

def test_every_written_event_plays_to_its_end(b):
    # events.js as written: each event opens in the talk, every line shows (furigana, no stray braces), each reply choice is
    # answered right first time, and the last line closes it
    r = json.loads(ev(b, """(() => { const root = document.body, bad = [];
      for (const e of TOWN.EVENTS) {
        let ended = false, guard = 0; TALK.open(root, e.who, e.lines, () => { ended = true; }, null, { ev: true });
        while (!ended && guard++ < 200) {
          const t = document.querySelector('.talk'); if (/[{}|]/.test(t.textContent)) bad.push(e.id + ': ' + t.textContent.slice(0, 40));
          const opts = t.querySelectorAll('.talk-opt'); if (opts.length) { const L = e.lines.find((l, i) => !Array.isArray(l) && t.querySelector('.talk-name span').textContent === l.ask);
            opts[L.opts.findIndex((o) => o[1])].click(); } else t.click();
        }
        if (!ended) bad.push(e.id + ': did not end');
      }
      return JSON.stringify({ n: TOWN.EVENTS.length, bad }); })()"""))
    assert r['n'] >= 5 and r['bad'] == [], r

# ---- pass 1: まんぷく食堂 and 居酒屋とり吉, walked into ----
def test_the_shokudo_is_walked_into_while_open_and_left_by_its_door(b):
    r = json.loads(ev(b, "(async () => { " + FRESH + TOWN_AT + """ fake([]); state.town.seen.tome = 1; state.town.seen.go = 1; await go('town', 12);
      y().querySelector('.town-shop[data-shop="shokudo"]').click(); for (let i = 0; i < 100 && location.hash !== '#/shokudo'; i++) await wait(50); await wait(300);
      const inside = { place: y().dataset.place, room: !!y().querySelector('.indoor-land'), indoor: y().classList.contains('indoor'), people: [...y().querySelectorAll('.npc')].map(e => e.dataset.npc).sort() };
      y().querySelector('.way-btn[data-to="town"]').click(); for (let i = 0; i < 100 && location.hash !== '#/town'; i++) await wait(50);
      return JSON.stringify({ inside, back: location.hash }); })()"""))
    assert r['inside'] == {'place': 'shokudo', 'room': True, 'indoor': True, 'people': ['go', 'tome']} and r['back'] == '#/town', r

def test_the_izakaya_lets_you_in_only_at_night(b):
    r = json.loads(ev(b, "(async () => { " + FRESH + TOWN_AT + """ fake([]); state.town.seen.teppei = 1; await go('town', 12);
      y().querySelector('.town-shop[data-shop="izakaya"]').click(); await wait(200); const day = { hash: location.hash, toast: toastText() };
      await go('town', 20); y().querySelector('.town-shop[data-shop="izakaya"]').click(); for (let i = 0; i < 100 && location.hash !== '#/izakaya'; i++) await wait(50); await wait(300);
      return JSON.stringify({ day, night: location.hash, teppei: !!y().querySelector('.npc-teppei') }); })()"""))
    assert r['day']['hash'] == '#/town' and '18' in r['day']['toast'], r
    assert r['night'] == '#/izakaya' and r['teppei'], r

def test_a_shop_opens_its_door_the_first_time_an_event_waits_inside(b):
    r = json.loads(ev(b, "(async () => { " + FRESH + TOWN_AT + """ fake([['s1', 'm1', 'tome', 'shokudo']]); begin('m1'); await go('town', 12);
      const st = TOWNEV.shopState('shokudo'), dot = !!y().querySelector('.ev-dot');
      y().querySelector('.town-shop[data-shop="shokudo"]').click(); for (let i = 0; i < 100 && location.hash !== '#/shokudo'; i++) await wait(50); await wait(300);
      return JSON.stringify({ st, mark: [...y().querySelectorAll('.ev-mark')].map(m => m.closest('.npc').dataset.npc) }); })()"""))
    assert r == {'st': 'open', 'mark': ['tome']}, r

def test_people_indoors_are_drawn_closer_up_than_in_town(b):
    r = json.loads(ev(b, "(async () => { " + FRESH + TOWN_AT + """ fake([]); state.town.seen.tome = 1; state.town.seen.go = 1; state.town.seen.kenta = 1;
      const k = (sel) => Number(/scale\(([\d.]+)\)/.exec(y().querySelector(sel).style.transform)[1]);
      await go('town', 12); const town = k('.npc-kenta'); await go('shokudo', 12); const room = k('.npc-tome'), hero = k('.yhero');
      return JSON.stringify({ town, room, hero }); })()"""))
    assert r['town'] < 0.5 and r['room'] > 0.6 and r['hero'] > 0.6, r   # the counter comes to their middle, not over their heads

# ---- review fixes (pass 0) ----
def test_mugi_hosts_nothing_before_he_has_knocked(b):
    r = json.loads(ev(b, "(() => { " + FRESH + """ fake([['k1', 'm1', 'kenta', 'town'], ['g1', 'm1', 'mugi', 'beach'], ['k2', 'm1', 'kenta', 'town']]); begin('m1');
      state.met = { koharu: Date.now() - 86400000 }; state.koto.sets = { dev: 1 }; state.town.done.k1 = '2026-11-01'; study('2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05', '2026-11-06');
      const wd = new Date(2026, 10, 10), w = (h) => { const x = TOWNEV.waiting(h, wd); return x && x.ev.id; };
      return JSON.stringify({ due: ids(), noon: w(12), late: w(23), visitor: NPC.visitor() }); })()"""))
    assert r == {'due': ['k2'], 'noon': 'k2', 'late': 'k2', 'visitor': 'mugi'}, r   # not 'g1' before he knocks; the one after him goes on

def test_the_town_redraws_when_an_event_ends_and_when_the_hour_moves_on(b):
    r = json.loads(ev(b, "(async () => { " + FRESH + TOWN_AT + TALK_EV + """
      t.click(); await wait(30); t.querySelectorAll('.talk-opt')[0].click(); await wait(30); t.click(); await wait(30); t.click(); await wait(400);
      const shut = y().querySelector('.shop-front[data-shop="bakery"]').classList.contains('closed');
      TOWNEV.clock = { h: 23, day: new Date(2026, 10, 10) }; sceneMinute(); await wait(300);
      return JSON.stringify({ shut, kenta: !!y().querySelector('.npc-kenta'), place: y().dataset.place }); })()"""))
    assert r == {'shut': False, 'kenta': False, 'place': 'town'}, r   # 健太 met: his bakery open at once; at 23 he has gone home

def test_tapping_someone_who_has_left_says_so(b):
    r = json.loads(ev(b, "(async () => { " + FRESH + TOWN_AT + """ fake([]); state.town.seen.kenta = 1; await go('town', 9);
      const k = y().querySelector('.npc-kenta'); TOWNEV.clock = { h: 23, day: new Date(2026, 10, 10) }; k.click(); await wait(200);
      return JSON.stringify({ toast: toastText(), talk: !!document.querySelector('.talk') }); })()"""))
    assert '離開' in r['toast'] and not r['talk'], r

# ---- pass 2: the bus, 駅前, 町の手帳 ----
BUS = """const board = async () => { for (let i = 0; i < 120 && !document.querySelector('.bus-board'); i++) await wait(50); return document.querySelector('.bus-board'); };"""

def test_the_bus_goes_to_a_stop_opened_and_back(b):
    r = json.loads(ev(b, "(async () => { " + FRESH + TOWN_AT + BUS + """ fake([]); state.town.stops.station = 1; state.town.seen.harada = 1; await go('street', 12);
      y().querySelector('[data-act="bus-stop"]').click(); const bd = await board();
      const stops = [...bd.querySelectorAll('[data-bus]')].map(x => [x.dataset.bus, x.disabled]);
      bd.querySelector('[data-bus="station"]').click(); for (let i = 0; i < 120 && location.hash !== '#/station'; i++) await wait(50); await wait(300);
      const there = { place: y().dataset.place, harada: !!y().querySelector('.npc-harada') };
      y().querySelector('[data-act="bus-stop"]').click(); const bd2 = await board(); const back = [...bd2.querySelectorAll('[data-bus]')].filter(x => !x.disabled).map(x => x.dataset.bus);
      bd2.querySelector('[data-bus="street"]').click(); for (let i = 0; i < 120 && location.hash !== '#/street'; i++) await wait(50);
      return JSON.stringify({ stops, there, back, home: location.hash }); })()"""))
    assert r['stops'] == [['station', False], ['sento', True], ['shrine', True], ['castle', True]], r
    assert r['there'] == {'place': 'station', 'harada': True} and r['back'] == ['street'] and r['home'] == '#/street', r

def test_with_no_stop_open_the_bus_board_says_so(b):
    r = json.loads(ev(b, "(async () => { " + FRESH + TOWN_AT + BUS + """ fake([]); await go('street', 12);
      y().querySelector('[data-act="bus-stop"]').click(); const bd = await board();
      return JSON.stringify({ open: [...bd.querySelectorAll('[data-bus]')].filter(x => !x.disabled).length, note: bd.textContent }); })()"""))
    assert r['open'] == 0 and '還沒有開通' in r['note'], r

def test_taro_waits_by_the_bus_stop_in_the_morning(b):
    r = json.loads(ev(b, "(async () => { " + FRESH + TOWN_AT + """ fake([]); state.town.seen.taro = 1; await go('street', 9); const am = !!y().querySelector('.npc-taro');
      await go('street', 15); const pm = !!y().querySelector('.npc-taro'); return JSON.stringify({ am, pm }); })()"""))
    assert r == {'am': True, 'pm': False}, r

def test_the_town_notebook_lists_people_met_and_replays_without_koto(b):
    r = json.loads(ev(b, "(async () => { " + FRESH + TOWN_AT + """ fake([['a1', 'm1', 'kenta', 'town', { title: '試吃', lines: [['kenta', 'はい。', '是。']] }]]); state.town.seen.kenta = 1; state.town.done.a1 = '2026-11-01'; state.koto.found['ev-a1'] = 10;
      const k0 = kotoBalance(); DIARY.open(); document.querySelector('.diary [data-diary="tab-town"]').click(); await wait(50);
      const book = document.querySelector('.diary').textContent; document.querySelector('.diary [data-replay="a1"]').click(); await wait(50);
      const talk = !!document.querySelector('.talk'), gone = !document.querySelector('.diary'); document.querySelector('.talk').click(); await wait(50);
      return JSON.stringify({ kenta: book.includes('森 健太'), title: book.includes('試吃'), talk, gone, back: !!document.querySelector('.diary .town-book'), koto: kotoBalance() - k0 }); })()"""))
    assert r == {'kenta': True, 'title': True, 'talk': True, 'gone': True, 'back': True, 'koto': 0}, r

def test_an_event_at_a_bus_stop_waits_for_the_stop_to_open(b):
    r = json.loads(ev(b, "(() => { " + FRESH + """ fake([['s1', 'm1', 'kobayashi', 'station'], ['t1', 'm1', 'kenta', 'town']]); begin('m1');
      const before = ids(); state.town.stops.station = 1; return JSON.stringify({ before, after: ids() }); })()"""))
    assert r == {'before': ['t1'], 'after': ['s1', 't1']}, r

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
