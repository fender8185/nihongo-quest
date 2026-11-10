"""test build (2026-11-09): the town's events — when the next one opens (the unit passed, or the one studied learned far enough;
no days between them, 2026-11-10), who is where by the hour, the mark on the one waiting, the talk with reply choices, the 言靈
for finishing; the bed (2026-11-10): after the day's practice a sleep moves the world on to 8, 12, 17 or 20 o'clock for the day."""
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
  state.srs = {}; state.dailyLogs = {}; state.town = { done: {}, seen: {}, stops: {} }; saveState(); DAILY_CACHE = null; localStorage.removeItem('nq_wake'); TOWNEV.clock = null;
  const study = (...ds) => ds.forEach((d) => { state.dailyLogs[d] = { date: d, vocabCount: 3, grammarCount: 2, quizCount: 0, bonusCount: 0, minutes: 2, topics: [], mistakeTopics: [] }; });
  const begin = (u) => { const g = REG.grammar.find((x) => x.u === u); state.srs['g:' + g.id] = { n: 1, last: '2026-11-01' }; };
  const fake = (list) => { TOWN.EVENTS = list.map(([id, u, who, at, more]) => Object.assign({ id, u, who, at, title: id, lines: [[who, 'はい。', '是。']] }, more || {})); };
  const learn = (u, f) => { const gs = REG.grammar.filter((x) => x.u === u); gs.slice(0, Math.ceil(gs.length * f)).forEach((g) => { state.srs['g:' + g.id] = { n: 1, last: '2026-11-01' }; }); };
  const doneToday = (yes) => { dayProgress = () => (yes ? { done: 3, left: 0, total: 3 } : { done: 1, left: 2, total: 3 }); };
  const ids = () => TOWNEV.due().map((e) => e.id);"""

def test_first_event_needs_the_unit_begun(b):
    r = json.loads(ev(b, "(() => { " + FRESH + """ fake([['a1', 'm1', 'kenta', 'town']]);
      const before = ids(); begin('m1'); return JSON.stringify({ before, after: ids() }); })()"""))
    assert r == {'before': [], 'after': ['a1']}, r

def test_events_of_the_unit_studied_open_as_its_grammar_is_learned(b):
    r = json.loads(ev(b, "(() => { " + FRESH + """ fake(['a1', 'a2', 'a3', 'a4', 'a5'].map((id) => [id, 'm1', 'kenta', 'town']));
      const at = [ids()]; begin('m1'); at.push(ids()); learn('m1', 0.4); at.push(ids()); learn('m1', 1); at.push(ids());
      return JSON.stringify(at); })()"""))
    assert r == [[], ['a1'], ['a1', 'a2', 'a3'], ['a1', 'a2', 'a3', 'a4', 'a5']], r   # the first once begun, then one more each fifth learned

def test_no_study_days_between_events(b):
    r = json.loads(ev(b, "(() => { " + FRESH + """ fake([['a1', 'm1', 'kenta', 'town'], ['a2', 'm1', 'kenta', 'town', { after: 'a1' }], ['b1', 'm2', 'kenta', 'town']]);
      learn('m1', 1); const first = ids(); TOWNEV.finish('a1'); const sameDay = ids();
      state.currentUnit = 'm3'; begin('m3'); const passed = ids();
      return JSON.stringify({ first, sameDay, passed }); })()"""))
    assert r == {'first': ['a1'], 'sameDay': ['a2'], 'passed': ['a2', 'b1']}, r   # the next is open the day one is done; units passed open whole

def test_pre_stage_only_reaches_m0(b):
    r = json.loads(ev(b, "(() => { " + FRESH + """ fake([['p1', 'm0', 'miku', 'town'], ['a1', 'm1', 'kenta', 'town']]);
      state.stage = 'pre'; state.currentUnit = 'm1'; const none = ids(); state.srs['k:a'] = { n: 1 };
      return JSON.stringify({ reached: TOWNEV.reachedIdx(), none, then: ids() }); })()"""))
    assert r == {'reached': 0, 'none': [], 'then': ['p1']}, r   # m0 begins with anything learned

def test_one_waiting_and_a_closed_place_lets_the_next_through(b):
    r = json.loads(ev(b, "(() => { " + FRESH + """ fake([['c1', 'm1', 'hina', 'town'], ['c2', 'm1', 'kenta', 'town']]); learn('m1', 1);
      const wd = new Date(2026, 10, 10), we = new Date(2026, 10, 14);   /* a Tuesday, a Saturday */
      const w = (h, d) => { const x = TOWNEV.waiting(h, d); return x && [x.ev.id, x.place, x.spot]; };
      return JSON.stringify({ morning: w(10, wd), evening: w(17, wd), weekend: w(10, we), night: w(3, wd) }); })()"""))
    assert r == {'morning': ['c2', 'town', 'bakery'], 'evening': ['c1', 'town', 'flowers'], 'weekend': ['c1', 'town', 'flowers'], 'night': None}, r

def test_an_event_waiting_two_study_days_finds_its_host_at_any_hour(b):
    r = json.loads(ev(b, "(() => { " + FRESH + """ fake([['c1', 'm1', 'hina', 'town'], ['n1', 'm1', 'kenta', 'town', { after: 'c1', when: 'night' }]]); begin('m1');
      const wd = new Date(2026, 10, 10), w = (h) => { const x = TOWNEV.waiting(h, wd); return x && [x.ev.id, x.spot]; };
      const soon = w(9); study('2026-11-02'); const one = w(9); study('2026-11-03'); const two = w(9);
      return JSON.stringify({ soon, one, two }); })()"""))
    assert r == {'soon': None, 'one': None, 'two': ['c1', 'flowers']}, r   # two study days on, 陽菜 waits at her shop whatever the hour

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
    r = json.loads(ev(b, "(() => { " + FRESH + """ fake([['k1', 'm1', 'kenta', 'town'], ['g1', 'm1', 'mugi', 'beach'], ['k2', 'm1', 'kenta', 'town']]); learn('m1', 1);
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
      const cover = document.querySelector('.diary').textContent; document.querySelector('.diary [data-page-of="kenta"]').click(); await wait(50);
      const book = document.querySelector('.diary').textContent; document.querySelector('.diary [data-replay="a1"]').click(); await wait(50);
      const talk = !!document.querySelector('.talk'), gone = !document.querySelector('.diary'); document.querySelector('.talk').click(); await wait(50);
      const page = document.querySelector('.diary .tb-page');
      return JSON.stringify({ kenta: cover.includes('森 健太') && book.includes('森 健太'), title: book.includes('試吃'), talk, gone, back: !!page && page.dataset.id === 'kenta', koto: kotoBalance() - k0 }); })()"""))
    assert r == {'kenta': True, 'title': True, 'talk': True, 'gone': True, 'back': True, 'koto': 0}, r   # back on his page

# 2026-11-10 (the user): a page each, turned over; those not met yet have theirs too, all of it blurred; each page keeps the talks had
def test_the_town_notebook_has_a_page_for_everyone_blurred_until_met_with_the_talks_had(b):
    r = json.loads(ev(b, "(async () => { " + FRESH + TOWN_AT + """ fake([['a1', 'm1', 'kenta', 'town', { title: '試吃', lines: [['kenta', '{新|あたら}しいパン！', '新麵包！'], ['miku', 'おいしい！', '好吃！'], { ask: '回答', opts: [['はい。', 1, '是。'], ['いいえ。', 0, '不對']], pt: 'm1' }] }]]);
      state.town.seen = { kenta: 1, miku: 1 }; state.town.done.a1 = '2026-11-01';
      DIARY.open('town'); const d = () => document.querySelector('.diary'), page = () => d().querySelector('.tb-page');
      const n = Object.keys(TOWN.CAST).length, head = d().querySelector('.tb-count').textContent;
      d().querySelector('[data-page-of="kenta"]').click(); await wait(30); const kenta = { id: page().dataset.id, blur: page().classList.contains('blur'), text: page().textContent };
      d().querySelector('[data-diary="1"]').click(); await wait(30); const next = page().dataset.id;
      DIARY.close(); DIARY.open('town', 'nakamura'); const stranger = { blur: page().classList.contains('blur'), named: page().textContent.includes('中村') };
      DIARY.open('town', 'miku'); const miku = page().textContent.includes('試吃');
      DIARY.close(); return JSON.stringify({ n, head, kenta, next, stranger, miku }); })()"""))
    assert r['head'] == '1 / %d' % (r['n'] + 1), r   # the cover, then a page each
    assert r['kenta']['id'] == 'kenta' and r['kenta']['blur'] is False and all(w in r['kenta']['text'] for w in ['森 健太', 'パン屋', '試吃', '新麵包！', '好吃！', 'はい。']), r   # the talk had: their lines and the hero's answer
    assert r['next'] != 'kenta' and r['stranger'] == {'blur': True, 'named': False}, r   # turned over; one not met: there, blurred, no name
    assert r['miku'] is True, r   # a talk one spoke in is on their page too

def test_an_event_at_a_bus_stop_waits_for_the_stop_to_open(b):
    r = json.loads(ev(b, "(() => { " + FRESH + """ fake([['s1', 'm1', 'kobayashi', 'station'], ['t1', 'm1', 'kenta', 'town']]); learn('m1', 1);
      const before = ids(); state.town.stops.station = 1; return JSON.stringify({ before, after: ids() }); })()"""))
    assert r == {'before': ['t1'], 'after': ['s1', 't1']}, r

# ---- pass 4: 月の湯 ----
def test_the_bus_goes_to_the_bathhouse_once_its_stop_is_open(b):
    r = json.loads(ev(b, "(async () => { " + FRESH + TOWN_AT + BUS + """ fake([]); state.town.stops = { station: 1, sento: 1 }; state.town.seen.matsu = 1; await go('street', 16);
      y().querySelector('[data-act="bus-stop"]').click(); const bd = await board(); bd.querySelector('[data-bus="sento"]').click();
      for (let i = 0; i < 120 && location.hash !== '#/sento'; i++) await wait(50); await wait(300);
      return JSON.stringify({ place: y().dataset.place, art: !!y().querySelector('.sento-land'), matsu: !!y().querySelector('.npc-matsu'), stop: !!y().querySelector('[data-act="bus-stop"]') }); })()"""))
    assert r == {'place': 'sento', 'art': True, 'matsu': True, 'stop': True}, r

# ---- pass 8: 稲荷神社 and its 緣日 by night ----
def test_the_shrine_holds_its_festival_by_night_with_people_in_yukata(b):
    r = json.loads(ev(b, "(async () => { " + FRESH + TOWN_AT + """ fake([]); state.town.stops = { station: 1, shrine: 1 }; state.town.seen.chihaya = 1; state.town.seen.tatsu = 1;
      await go('shrine', 12); const day = { place: y().dataset.place, stalls: !!y().querySelector('.shrine-land .ennichi'), people: [...y().querySelectorAll('.npc')].map(e => e.dataset.npc).sort() };
      await go('shrine', 20); const night = { stalls: !!y().querySelector('.shrine-land .ennichi'), people: [...y().querySelectorAll('.npc')].map(e => e.dataset.npc).sort(), yukata: y().querySelector('.npc-chihaya').innerHTML !== day.html };
      return JSON.stringify({ day, night, dress: [TOWNEV.look('hina', 'shrine', 20).topStyle, TOWNEV.look('chihaya', 'shrine', 20).topStyle] }); })()"""))
    assert r['day'] == {'place': 'shrine', 'stalls': False, 'people': ['chihaya']}, r
    assert r['night']['stalls'] and r['night']['people'] == ['chihaya', 'tatsu'], r
    assert r['dress'] == ['yukata', 'hakui'], r   # 陽菜 in a yukata for the festival; 千早 works it in her miko's white and red

def test_the_bus_goes_on_to_the_castle_and_its_guide(b):
    r = json.loads(ev(b, "(async () => { " + FRESH + TOWN_AT + BUS + """ fake([]); state.town.stops = { station: 1, castle: 1 }; state.town.seen.takahashi = 1; await go('station', 11);
      y().querySelector('[data-act="bus-stop"]').click(); const bd = await board(); const list = [...bd.querySelectorAll('[data-bus]')].filter(x => !x.disabled).map(x => x.dataset.bus);
      bd.querySelector('[data-bus="castle"]').click(); for (let i = 0; i < 120 && location.hash !== '#/castle'; i++) await wait(50); await wait(300);
      return JSON.stringify({ list, place: y().dataset.place, art: !!y().querySelector('.castle-land'), guide: !!y().querySelector('.npc-takahashi') }); })()"""))
    assert r == {'list': ['street', 'castle'], 'place': 'castle', 'art': True, 'guide': True}, r

# ---- the test site's tools in 町の手帳 (the user: try every stage's people on the test site) ----
def test_the_test_site_notebook_meets_everyone_sets_the_hour_and_plays_any_event(b):
    r = json.loads(ev(b, "(async () => { " + FRESH + """ const wait = (ms) => new Promise(q => setTimeout(q, ms)); const k0 = kotoBalance();
      DIARY.open('town'); const d = () => document.querySelector('.diary');
      const tools = !!d().querySelector('.town-tools'), listed = d().querySelectorAll('[data-try]').length;
      d().querySelector('[data-tool="meet"]').click(); await wait(30);
      const seen = Object.keys(TOWN.CAST).filter(id => TOWN.CAST[id].art !== 'npc').every(id => state.town.seen[id]), stops = Object.keys(state.town.stops).sort();
      d().querySelector('[data-tool="hour"][data-h="20"]').click(); const h = TOWNEV.clock && TOWNEV.clock.h;
      d().querySelector('[data-try="m10-3"]').click(); await wait(50); const talk = document.querySelector('.talk .talk-name').textContent;
      while (document.querySelector('.talk')) { const t = document.querySelector('.talk'), o = t.querySelectorAll('.talk-opt'); if (o.length) { const L = TOWN.EVENTS.find(e => e.id === 'm10-3').lines.find(l => !Array.isArray(l) && l.ask === t.querySelector('.talk-name span').textContent); o[L.opts.findIndex(x => x[1])].click(); } else t.click(); await wait(10); }
      const after = { done: !!state.town.done['m10-3'], koto: kotoBalance() - k0, back: !!document.querySelector('.diary .town-tools') };
      d().querySelector('[data-tool="hour"][data-h="now"]').click();
      return JSON.stringify({ tools, listed, seen, stops, h, talk, after, real: TOWNEV.clock }); })()"""))
    assert r['tools'] and r['listed'] >= 55 and r['seen'] and r['stops'] == ['castle', 'sento', 'shrine', 'station'], r
    assert r['h'] == 20 and r['talk'].startswith('ソフィア'), r
    assert r['after'] == {'done': False, 'koto': 0, 'back': True} and r['real'] is None, r   # a try gives nothing and marks nothing done

# ---- the bed (2026-11-10): after the day's practice, a sleep to 8, 12, 17 or 20 o'clock; the time holds for the day ----
NEAR = """const real = () => { const d = new Date(); return d.getHours() + d.getMinutes() / 60; };
  const near = (a, x) => Math.abs(((a - x) % 24 + 36) % 24 - 12) < 0.1;"""

def test_the_bed_offers_the_times_only_after_the_days_practice(b):
    r = json.loads(ev(b, "(() => { " + FRESH + """ const said = []; toast = (m) => said.push(m); closeModal();
      doneToday(false); NAP.offer(); const before = { modal: !!document.querySelector('#modalRoot .modal'), said: said.join(' ') };
      doneToday(true); NAP.offer(); const opts = [...document.querySelectorAll('#modalRoot [data-act="nap-to"]')].map((x) => [Number(x.dataset.h), x.textContent.trim()]);
      closeModal(); return JSON.stringify({ before, opts }); })()"""))
    assert r['before']['modal'] is False and '今日練習' in r['before']['said'], r
    assert r['opts'] == [[8, '早上 8 點'], [12, '中午 12 點'], [17, '傍晚 5 點'], [20, '晚上 8 點']], r

def test_sleeping_moves_the_world_on_and_holds_it_for_the_day(b):
    r = json.loads(ev(b, "(async () => { " + FRESH + NEAR + """ const wait = (ms) => new Promise(q => setTimeout(q, ms)); const said = []; toast = (m) => said.push(m); doneToday(true);
      const r0 = near(sceneHour(), real()); NAP.to(20); const night = near(sceneHour(), 20), o1 = JSON.parse(localStorage.getItem('nq_wake')).off;
      NAP.to(8); const morning = near(sceneHour(), 8), o2 = JSON.parse(localStorage.getItem('nq_wake')).off;
      const ahead = Math.abs(sceneDate().getTime() - Date.now() - o2 * 3600000) < 5000; await wait(1000);
      localStorage.setItem('nq_wake', JSON.stringify({ day: '2026-01-01', off: o2 })); const back = near(sceneHour(), real());
      return JSON.stringify({ r0, night, morning, on: o1 > 0 && o2 > o1, ahead, back, said: said.join(' ') }); })()"""))
    assert {k: r[k] for k in ['r0', 'night', 'morning', 'on', 'ahead', 'back']} == {'r0': True, 'night': True, 'morning': True, 'on': True, 'ahead': True, 'back': True}, r
    assert '晚上 8 點' in r['said'] and '早上 8 點' in r['said'], r   # 晚上 → 早上 is the next morning: always on; the next day the phone's own time

def test_the_time_slept_to_stays_when_the_app_is_opened_again(b):
    out = b.run([("nav", URL), ("wait", READY), ("eval", "localStorage.setItem('nq_wake', JSON.stringify({ day: todayStr(), off: 5 })); '1'"),
                 ("nav", URL), ("wait", READY), ("eval", "(() => { " + NEAR + " const r = near(sceneHour(), real() + 5); localStorage.removeItem('nq_wake'); return JSON.stringify(r); })()")])
    assert json.loads(out[-1]) is True, out

def test_the_sleep_menu_marks_the_times_someone_waits(b):
    r = json.loads(ev(b, "(() => { " + FRESH + """ doneToday(true); state.met = { koharu: 1, mugi: 1 }; TOWNEV.clock = { h: 9.5, day: new Date(2026, 10, 10) };
      const dots = () => { NAP.offer(); const d = [...document.querySelectorAll('#modalRoot [data-act="nap-to"]')].filter((x) => x.querySelector('.ev-dot')).map((x) => Number(x.dataset.h)); closeModal(); return d; };
      fake([['n1', 'm1', 'nakamura', 'izakaya', { when: 'night' }]]); begin('m1'); const night = dots();
      fake([['c1', 'm1', 'alex', 'beach']]); const late = dots();
      TOWNEV.clock = null; return JSON.stringify({ night, late }); })()"""))
    assert r == {'night': [20], 'late': [17]}, r   # 中村 at the izakaya 19–24; アレックス on the beach 15–18 (at noon in the 食堂)

def test_the_bed_can_be_moved_but_not_put_away(b):
    r = json.loads(ev(b, """(() => { const s = JSON.parse(JSON.stringify(state)); delete s.placed.bed; const n = normalizeState(s);
      return JSON.stringify({ fixed: !!WARES.find((w) => w.id === 'bed').fixed, back: !!n.placed.bed }); })()"""))
    assert r == {'fixed': True, 'back': True}, r

def test_a_tap_on_the_bed_lies_down_and_asks_how_long_to_sleep(b):
    r = json.loads(ev(b, "(async () => { " + FRESH + """ const wait = (ms) => new Promise(q => setTimeout(q, ms)); doneToday(true); state.met = { koharu: 1, mugi: 1 }; closeModal();
      location.hash = '#/bedroom'; document.getElementById('view').innerHTML = ''; route(); await wait(500);
      document.querySelector('[data-act="ware-use"][data-ware="bed"]').click();
      let m = null; for (let i = 0; i < 100 && !m; i++) { await wait(60); m = document.querySelector('#modalRoot [data-act="nap-to"]'); }
      const asleep = !!document.querySelector('.study .hero.sleep'); closeModal(); return JSON.stringify({ menu: !!m, asleep }); })()"""))
    assert r == {'menu': True, 'asleep': True}, r

def test_the_way_to_bed_is_marked_when_a_sleep_would_meet_someone(b):
    r = json.loads(ev(b, "(async () => { " + FRESH + """ const wait = (ms) => new Promise(q => setTimeout(q, ms)); state.met = { koharu: 1, mugi: 1 }; TOWNEV.clock = { h: 9.5, day: new Date(2026, 10, 10) };
      fake([['n1', 'm1', 'nakamura', 'izakaya', { when: 'night' }]]); begin('m1');
      const look = async (hash) => { location.hash = hash; document.getElementById('view').innerHTML = ''; route(); await wait(400); };
      const on = (sel) => document.querySelector(sel).classList.contains('calls');
      doneToday(false); await look('#/today'); const before = on('[data-thing="bdoor"]');
      doneToday(true); await look('#/today'); const door = on('[data-thing="bdoor"]');
      await look('#/bedroom'); const bed = on('[data-ware="bed"]');
      TOWNEV.clock = { h: 20, day: new Date(2026, 10, 10) }; await look('#/today'); const there = on('[data-thing="bdoor"]');
      TOWNEV.clock = null; return JSON.stringify({ before, door, bed, there }); })()"""))
    assert r == {'before': False, 'door': True, 'bed': True, 'there': False}, r   # at 20:00 he is there already: out, not to bed

def test_entering_the_study_says_when_someone_waits_and_that_a_sleep_gets_there(b):
    r = json.loads(ev(b, "(async () => { " + FRESH + TOWN_AT + """ fake([['n1', 'm1', 'nakamura', 'izakaya', { when: 'night' }]]); begin('m1'); localStorage.removeItem('nq_town_hint');
      state.met = { koharu: 1, mugi: 1 }; const said = []; toast = (m) => said.push(m); TOWNEV.clock = { h: 9.5, day: new Date(2026, 10, 10) };
      const look = async () => { location.hash = '#/today'; document.getElementById('view').innerHTML = ''; route(); await wait(400); };
      doneToday(false); await look(); await look(); doneToday(true); await look(); await look();
      TOWNEV.clock = null; return JSON.stringify(said); })()"""))
    assert len(r) == 2 and all(w in r[0] for w in ['晚上', '居酒屋', '今日練習']) and '床' in r[1] and '今日練習' not in r[1], r

def test_the_front_door_counts_the_events_open(b):
    r = json.loads(ev(b, "(async () => { " + FRESH + """ const wait = (ms) => new Promise(q => setTimeout(q, ms)); state.met = { koharu: 1, mugi: 1 };
      fake([['a1', 'm1', 'kenta', 'town'], ['a2', 'm1', 'kenta', 'town', { after: 'a1' }], ['a3', 'm1', 'kenta', 'town', { after: 'a2' }]]); learn('m1', 1);
      location.hash = '#/today'; document.getElementById('view').innerHTML = ''; route(); await wait(400);
      return JSON.stringify(document.querySelector('[data-thing="door"]').getAttribute('aria-label')); })()"""))
    assert r.startswith('出門') and r.endswith('・3 件事'), r

def test_the_town_notebook_says_who_waits_where_and_when(b):
    r = json.loads(ev(b, "(() => { " + FRESH + """ fake([['n1', 'm1', 'nakamura', 'izakaya', { when: 'night' }], ['n2', 'm1', 'nakamura', 'izakaya', { after: 'n1' }]]); learn('m1', 1); state.town.seen.nakamura = 1;
      DIARY.open('town'); const w = document.querySelector('.diary .tb-wait'); const t = w ? w.textContent : ''; DIARY.close && DIARY.close();
      return JSON.stringify(t); })()"""))
    assert all(w in r for w in ['2 件', '中村', '居酒屋とり吉', '晚上']), r

def test_a_weekend_of_sleeps_meets_every_event_open(b):
    r = json.loads(ev(b, "(() => { " + FRESH + """ state.currentUnit = 'm6'; learn('m6', 1); state.met = { koharu: 1, mugi: 1 };
      const run = (day) => { state.town = { done: {}, seen: {}, stops: {} }; let moved = true;
        while (moved) { moved = false; for (const h of TOWN.WAKE) { let w; while ((w = TOWNEV.waiting(h, day))) { TOWNEV.finish(w.ev.id); moved = true; } } }
        return TOWN.EVENTS.filter((e) => TOWNEV.unitIdx(e.u) <= TOWNEV.unitIdx('m6') && !state.town.done[e.id]).map((e) => e.id); };
      return JSON.stringify({ sat: run(new Date(2026, 10, 14)), tue: run(new Date(2026, 10, 10)) }); })()"""))
    assert r == {'sat': [], 'tue': []}, r   # weekdays only practice; a weekend (or any day) of sleeps meets them all

def test_the_shrine_festival_runs_until_23(b):
    r = json.loads(ev(b, "JSON.stringify([TOWNEV.isOpen('ennichi', 22.5), TOWNEV.isOpen('ennichi', 23), (TOWNEV.whereIs('hina', 22.5, new Date(2026, 10, 10)) || {}).place, (TOWNEV.whereIs('tatsu', 22.5) || {}).place])"))
    assert r == [True, False, 'shrine', 'shrine'], r

# ---- the scenes (2026-11-10, the user: the bus came from behind the stop; one could walk up onto the buildings) ----
def test_the_bus_pulls_up_on_the_road_in_front_of_the_stop(b):
    r = json.loads(ev(b, "(async () => { " + FRESH + TOWN_AT + """ state.town.stops = { station: 1, sento: 1, shrine: 1, castle: 1 }; const out = {};
      for (const p of ['street', 'station', 'sento', 'shrine', 'castle']) { await go(p, 12); busCome(y()); await wait(50); const bus = y().querySelector('.bus'), at = BUS_AT[p];
        out[p] = { front: parseFloat(bus.style.bottom) < at.Y - 20, over: Number(bus.style.zIndex) > 300 - at.Y, road: parseFloat(bus.style.bottom) === BUS_LANE[p] };
        document.querySelectorAll('.bus-board').forEach((x) => x.remove()); }
      return JSON.stringify(out); })()"""))
    want = {'front': True, 'over': True, 'road': True}
    assert all(v == want for v in r.values()), r   # on the road, nearer than the stop and drawn over it

def test_the_hero_never_walks_up_onto_the_buildings(b):
    r = json.loads(ev(b, "(async () => { " + FRESH + TOWN_AT + """ state.town.stops = { station: 1, sento: 1, shrine: 1, castle: 1 }; const out = {};
      for (const p of ['street', 'beach', 'town', 'shokudo', 'izakaya', 'station', 'sento', 'shrine', 'castle']) { await go(p, 12);
        await new Promise((q) => yHeroWalk(y(), [0, 220], q)); out[p] = Math.round(yh.Y); }
      localStorage.setItem('nq_hero', JSON.stringify({ castle: { X: 0, Y: 200 } })); yPlace = 'yard'; location.hash = '#/castle'; document.getElementById('view').innerHTML = ''; route(); await wait(300);
      out.kept = Math.round(yh.Y); return JSON.stringify(out); })()"""))
    top = {'street': 134, 'beach': 118, 'town': 126, 'shokudo': 128, 'izakaya': 128, 'station': 128, 'sento': 128, 'shrine': 128, 'castle': 128, 'kept': 128}
    assert all(r[k] <= v for k, v in top.items()), r   # the ground in front of the buildings, not on them (a spot kept from before too)

# ---- what stands in the way (2026-11-10, the user: he walked about as if every place were flat ground) ----
def test_the_hero_walks_round_a_table_and_a_tap_on_one_sends_him_beside_it(b):
    r = json.loads(ev(b, "(async () => { " + FRESH + TOWN_AT + """ fake([]); await go('shokudo', 12);
      const blocks = walkBlocks('shokudo'), inside = (p) => blocks.some((k) => p[0] > k[0] && p[0] < k[1] && p[1] > k[2] && p[1] < k[3]);
      yh.X = -380; yh.Y = 20; yHeroPlace(y()); const seen = []; let on = true;
      const watch = () => { if (!on) return; seen.push([yh.X, yh.Y]); requestAnimationFrame(watch); }; requestAnimationFrame(watch);
      await new Promise((q) => yHeroWalk(y(), [-380, 100], q)); on = false;
      const behind = [Math.round(yh.X), Math.round(yh.Y)], through = seen.some(inside);
      await new Promise((q) => yHeroWalk(y(), [-380, 58], q));
      return JSON.stringify({ behind, through, steps: seen.length > 5, tapped: inside([yh.X, yh.Y]) }); })()"""))
    assert r == {'behind': [-380, 100], 'through': False, 'steps': True, 'tapped': False}, r   # round the stools, not over the table; a tap on it: beside it

def test_a_bench_is_drawn_over_the_hero_behind_it_and_under_him_in_front(b):
    r = json.loads(ev(b, "(async () => { " + FRESH + TOWN_AT + """ fake([]); await go('park', 12);
      const z = (el) => Number(getComputedStyle(el).zIndex), bench = [...y().querySelectorAll('.land.prop')].find((e) => e.style.zIndex === '250'), h = y().querySelector('.yhero');
      yh.X = -350; yh.Y = 90; yHeroPlace(y()); const behind = z(bench) > z(h); yh.Y = 30; yHeroPlace(y()); const front = z(h) > z(bench);
      return JSON.stringify({ behind, front, taps: getComputedStyle(bench).pointerEvents }); })()"""))
    assert r == {'behind': True, 'front': True, 'taps': 'none'}, r

def test_someone_at_a_bench_sits_on_it_between_its_back_and_its_seat(b):
    r = json.loads(ev(b, "(async () => { " + FRESH + TOWN_AT + """ fake([]); state.town.stops = { station: 1 }; Object.keys(TOWN.CAST).forEach((id) => { state.town.seen[id] = 1; });
      await go('station', 12); const p = [...y().querySelectorAll('.npc.bench')], z = (el) => Number(getComputedStyle(el).zIndex), layers = [...y().querySelectorAll('.land.prop')].map(z);
      return JSON.stringify({ sitting: p.length, between: p.every((e) => layers.some((l) => l > z(e)) && layers.some((l) => l < z(e))) }); })()"""))
    assert r == {'sitting': 1, 'between': True}, r

def test_a_spot_kept_inside_a_thing_is_moved_off_it(b):
    r = json.loads(ev(b, "(async () => { " + FRESH + TOWN_AT + """ fake([]); localStorage.setItem('nq_hero', JSON.stringify({ izakaya: { X: 60, Y: 80 } })); yPlace = 'yard';
      TOWNEV.clock = { h: 21, day: new Date(2026, 10, 14) }; location.hash = '#/izakaya'; document.getElementById('view').innerHTML = ''; route(); await wait(300);
      return JSON.stringify([Math.round(yh.X), Math.round(yh.Y)]); })()"""))
    assert r[0] == 60 and (r[1] <= 67 or r[1] >= 93), r   # off the stool, in front of it or behind

# ---- a new player stays in (2026-11-10, the user): the front door holds until ムギ has brought the gramophone ----
def test_a_new_player_stays_in_until_mugi_has_brought_the_gramophone(b):
    r = json.loads(ev(b, "(async () => { " + FRESH + """ const wait = (ms) => new Promise(q => setTimeout(q, ms));
      const look = async () => { location.hash = '#/today'; document.getElementById('view').innerHTML = ''; route(); await wait(600); };
      const tryOut = async () => { TALK.close(); document.querySelector('#view [data-thing="door"]').click(); let t = null;
        for (let i = 0; i < 70 && !t && location.hash === '#/today'; i++) { await wait(80); t = document.querySelector('.talk'); } return { hash: location.hash, said: t ? t.textContent : '' }; };
      state.met = {}; state.koto.sets = {}; state.koto.daySets = {}; await look(); const fresh = await tryOut();
      state.met = { koharu: Date.now() - 60000 }; await look(); const waiting = await tryOut();
      state.met = { koharu: Date.now() - 86400000, mugi: Date.now() - 86400000 }; await look(); TALK.close(); document.querySelector('#view [data-thing="door"]').click();
      for (let i = 0; i < 50 && location.hash === '#/today'; i++) await wait(100);
      return JSON.stringify({ fresh, waiting, out: location.hash }); })()"""))
    assert r['fresh']['hash'] == '#/today' and '練習' in r['fresh']['said'], r   # first: practise a little
    assert r['waiting']['hash'] == '#/today' and '狗' in r['waiting']['said'], r   # 小春 has been: someone else is coming
    assert r['out'] == '#/outside', r   # ムギ has been: out

# ---- the town's people dressed for their work (2026-11-10, the user: a miko should look like one at a glance; an izakaya's 大将) ----
def test_people_wear_what_their_work_calls_for(b):
    r = json.loads(ev(b, """(() => { const top = (id) => HERO.norm(TOWN.CAST[id].look).topStyle, art = (id, p) => TOWNEV.art(id, p);
      return JSON.stringify({ tops: Object.fromEntries(['chihaya', 'teppei', 'go', 'tome', 'harada', 'kobayashi', 'tatsu', 'nagisa', 'sano'].map((id) => [id, top(id)])),
        miko: ['hakama', 'kosode'].every((k) => art('chihaya', 'shrine').includes(k)), festival: TOWNEV.look('chihaya', 'shrine', 20).topStyle,
        taisho: ['nejiri', 'apron'].every((k) => art('teppei', 'izakaya').includes(k)), sold: HERO.OPTS.topStyle.some(([v]) => ['hakui', 'samue', 'chef', 'kappogi', 'jacket', 'happi', 'vest'].includes(v)) }); })()"""))
    assert r['tops'] == {'chihaya': 'hakui', 'teppei': 'samue', 'go': 'chef', 'tome': 'kappogi', 'harada': 'jacket', 'kobayashi': 'jacket', 'tatsu': 'happi', 'nagisa': 'vest', 'sano': 'jacket'}, r
    assert r['miko'] and r['festival'] == 'hakui' and r['taisho'] and r['sold'] is False, r   # the miko works the festival in her white and red; none of it in the wardrobe

def test_a_new_hero_and_the_young_people_have_round_soft_faces(b):
    r = json.loads(ev(b, """(() => { const n = HERO.norm(undefined), young = ['miku', 'hina', 'taro', 'kobayashi', 'misaki', 'alex', 'chihaya', 'sophia', 'nishimura', 'lin', 'go', 'kenta', 'nakamura'];
      return JSON.stringify({ hero: ['face', 'cheeks', 'fringe', 'sides', 'hairBack', 'hairTop', 'hairColor', 'topStyle', 'top', 'bottomStyle', 'bottom', 'shoeStyle', 'shoe'].map((k) => n[k]),
        young: young.filter((id) => !['chubby', 'mochi', 'round'].includes(TOWN.CAST[id].look.face)),
        kira: Object.keys(TOWN.CAST).filter((id) => (TOWN.CAST[id].look || {}).eyes === 'kira').concat([KOHARU_LOOK, GRANNY_LOOK].filter((l) => l.eyes === 'kira').map(() => 'npc')) }); })()"""))
    assert r['hero'] == ['chubby', 'blush', 'blunt', 'wisps', 'crop', 'bun', '#6b4a32', 'hoodie', '#d0574b', 'pants', '#2b2b33', 'sneaker', '#2b2b33'], r   # the user's pick: reads neither boy nor girl
    assert r['young'] == [] and r['kira'] == [], r   # 包子臉, 麻糬臉, 圓臉; no one in town with 水汪汪 eyes (the user: it breaks the spell)

# 2026-11-10, the user: ムギ marked on the beach did nothing when tapped — the people's buttons took no taps at all (the hero's
# pointer-events: none won over them); .click() in the other tests never asks what a finger would hit
def test_a_finger_on_someone_lands_on_them(b):
    r = json.loads(ev(b, "(async () => { " + FRESH + TOWN_AT + """ state.met = { koharu: 1, mugi: 1 }; state.town.seen.kenta = 1; fake([['g1', 'm1', 'mugi', 'beach']]); learn('m1', 1);
      const hit = (sel) => { const el = y().querySelector(sel), r = el.getBoundingClientRect(), x = document.elementFromPoint(r.left + r.width / 2, r.top + r.height * 0.8); return Boolean(x && x.closest(sel)); };
      await go('beach', 12); const mugi = hit('.npc-mugi'); await go('town', 9); const kenta = hit('.npc-kenta');
      return JSON.stringify({ mugi, kenta }); })()"""))
    assert r == {'mugi': True, 'kenta': True}, r

# ---- the map joined up (2026-11-10, the user): beach | yard | town over harbor | street | park ----
def test_the_map_joins_up_all_round(b):
    r = json.loads(ev(b, """(() => { const pairs = [['yard', 'beach'], ['yard', 'town'], ['yard', 'street'], ['beach', 'harbor'], ['harbor', 'street'], ['street', 'park'], ['park', 'town']];
      return JSON.stringify({ ways: pairs.filter(([a, c]) => !(WAYS[a + '>' + c] && WAYS[c + '>' + a])), routes: ['harbor', 'park'].map((p) => PLACE_ROUTE[p]),
        hops: [TOWNEV.hop('harbor', 'town'), TOWNEV.hop('park', 'beach'), TOWNEV.hop('beach', 'street'), TOWNEV.hop('town', 'station'), TOWNEV.hop('harbor', 'izakaya')], names: [TOWNEV.PLACE_NAME.harbor, TOWNEV.PLACE_NAME.park] }); })()"""))
    assert r['ways'] == [] and r['routes'] == ['#/harbor', '#/park'], r
    assert r['hops'] == ['beach', 'town', 'yard', 'yard', 'beach'], r   # the next step on a shortest way (ties: the first way of a place)
    assert r['names'] == ['みなと漁港', 'ひだまり公園'], r

def test_the_harbor_and_the_park_have_their_ways_on_and_every_place_out_is_a_scene(b):
    r = json.loads(ev(b, "(async () => { " + FRESH + TOWN_AT + """ state.town.stops = { station: 1, sento: 1, shrine: 1, castle: 1 }; const out = {};
      for (const p of ['harbor', 'park', 'beach', 'street', 'town', 'station', 'izakaya']) { await go(p, 20); out[p] = { ways: [...y().querySelectorAll('.way-btn')].map((w) => w.dataset.to).sort(), scene: document.body.classList.contains('scene') && document.body.classList.contains('outside') }; }
      await go('street', 12); y().querySelector('.way-btn[data-to="harbor"]').click(); for (let i = 0; i < 60 && location.hash !== '#/harbor'; i++) await wait(100);
      out.walked = location.hash; return JSON.stringify(out); })()"""))
    assert r['harbor']['ways'] == ['beach', 'street'] and r['park']['ways'] == ['street', 'town'], r
    assert 'harbor' in r['beach']['ways'] and {'harbor', 'park'} <= set(r['street']['ways']) and 'park' in r['town']['ways'], r
    assert all(r[p]['scene'] for p in ['harbor', 'park', 'beach', 'street', 'town', 'station', 'izakaya']), r   # the clock ticks and the page is the scene
    assert r['walked'] == '#/harbor', r

# 2026-11-10 (the user): the yard is a hilltop — far off below on its left the beach and the sea, on its right the hillside town,
# paths winding down to them — and its ways go off those sides; one walks the top, not out over its edge
def test_the_yards_left_is_the_shore_and_its_right_the_market(b):
    r = json.loads(ev(b, "(async () => { " + FRESH + TOWN_AT + """ state.met = { koharu: 1, mugi: 1 };
      await go('outside', 12); const at = (to) => { const w = y().querySelector('.way-btn[data-to="' + to + '"]'); return [parseFloat(w.style.marginLeft) + 22, parseFloat(w.style.bottom)]; };
      const near = (to) => { const [x, bt] = at(to); return Math.abs(x - YARD_GATE[to][0]) < 30 && bt > 150; };
      const sides = { shore: !!y().querySelector('.land .yard-shore .sea'), market: !!y().querySelector('.land .yard-market'), beach: near('beach'), town: near('town') };
      await new Promise((q) => yHeroWalk(y(), [-520, 220], q)); sides.sea = Math.round(yh.Y); await new Promise((q) => yHeroWalk(y(), [520, 220], q)); sides.shops = Math.round(yh.Y);
      y().querySelector('.way-btn[data-to="beach"]').click(); for (let i = 0; i < 60 && location.hash !== '#/beach'; i++) await wait(80);
      sides.went = location.hash; yh.arrive = { from: 'town', to: 'yard' }; location.hash = '#/outside'; document.getElementById('view').innerHTML = ''; route(); sides.came = [Math.round(yh.X), Math.round(yh.Y)];
      return JSON.stringify(sides); })()"""))
    assert r == {'shore': True, 'market': True, 'beach': True, 'town': True, 'sea': 166, 'shops': 166, 'went': '#/beach', 'came': [480, 214]}, r   # the signs where the beach and the town are seen; back from the town, in from there

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
