"""test build (2026-11-07): 言靈, 古道具屋 up the hill, things placed in 書房, the hero."""
import json, os, subprocess, sys, time
sys.path.insert(0, os.path.dirname(__file__))
from cdp import Browser
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
PORT = 8811
URL = f"http://127.0.0.1:{PORT}/"
READY = "typeof state === 'object' && !!state.updatedAt && typeof speakScript === 'function'"

def ev(b, js, pre=()):
    return b.run([("nav", URL), ("wait", READY)] + list(pre) + [("eval", js)])[-1]

# a main-course account at week 1 with nothing learned yet
FRESH = "state.stage = 'main'; state.kanaKnown = true; state.introSeen = true; state.startChosen = true; state.currentUnit = 'm1'; saveState(); DAILY_CACHE = null;"
# plays the current session to its end (preview cards dismissed), the summary drawn as the app does
PLAY = """(() => { let guard = 0;
  while (SESSION && SESSION.idx < SESSION.entries.length && guard++ < 600) {
    const e = currentEntry();
    if (e.preview && !e.previewDone) { dismissPreview(); continue; }
    if (!e.q) { prepareEntry(SESSION.idx); continue; }
    if (!e.done) { answerCurrent(e.q.answer); if (!e.done) e.done = true; }
    nextQuestion();
  }
  const gain = SESSION && SESSION.koto; SESSION = null; document.body.classList.remove('practicing'); DAILY_CACHE = null; return gain; })()"""

# ---- 言靈 ----
def test_a_finished_daily_set_gives_one_koto(b):
    js = "(() => { " + FRESH + " startSession('daily', { size: 5 }); const gain = " + PLAY + """;
      const line = document.querySelector('#view .koto-gain');
      return JSON.stringify({ gain, bal: kotoBalance(), line: line ? line.textContent.replace(/\\s+/g, '') : null, left: dayProgress().left > 0 }); })()"""
    r = json.loads(ev(b, js))
    assert r['left'], r   # five items do not finish the day
    assert r['gain'] == {'set': 1, 'day': 0}, r
    assert r['bal'] == 1, r
    assert r['line'] == 'あ言靈+1做完一組共1', r   # the あ is the icon's

def test_quitting_a_set_early_gives_nothing(b):
    js = "(() => { " + FRESH + """ startSession('daily', { size: 8 }); let n = 0;
      while (n < 3) { const e = currentEntry(); if (e.preview && !e.previewDone) { dismissPreview(); continue; } answerCurrent(e.q.answer); nextQuestion(); n++; }
      exitPractice(); const gain = SESSION.koto;
      return JSON.stringify({ gain, bal: kotoBalance(), line: !!document.querySelector('#view .koto-gain') }); })()"""
    r = json.loads(ev(b, js))
    assert r == {'gain': {'set': 0, 'day': 0}, 'bal': 0, 'line': False}, r

def test_other_practice_gives_no_set_koto(b):
    js = "(() => { " + FRESH + " startSession('unit', { unit: 'm1', size: 6 }); const gain = " + PLAY + """;
      return JSON.stringify({ gain, bal: kotoBalance() }); })()"""
    r = json.loads(ev(b, js))
    assert r['gain']['set'] == 0 and r['bal'] == r['gain']['day'], r

def test_the_day_bonus_comes_once(b):
    js = "(() => { " + FRESH + """ const gains = []; let guard = 0;
      while (dailyPlan().remaining > 0 && guard++ < 20) { startSession('daily'); gains.push(""" + PLAY + """); }
      const sets = gains.length, bal1 = kotoBalance(), days = state.koto.days.slice();
      startSession('daily'); const more = """ + PLAY + """;   // a 多學 set once the day is done
      return JSON.stringify({ sets, bal1, days, last: gains[gains.length - 1], more, bal2: kotoBalance(), today: todayStr() }); })()"""
    r = json.loads(ev(b, js))
    assert r['days'] == [r['today']], r
    assert r['last'] == {'set': 1, 'day': 10}, r
    assert r['bal1'] == r['sets'] + 10, r
    assert r['more'] == {'set': 1, 'day': 0}, r
    assert r['bal2'] == r['bal1'] + 1, r

def test_each_device_counts_its_own_sets(b):
    js = """(() => { state.koto = { sets: { 'dev-other': 4 }, days: ['2026-01-01'], gift: 0 }; state.owned = { clock: { paid: 1, on: '2026-01-02' } }; saveState();
      """ + FRESH + " startSession('daily', { size: 4 }); " + PLAY + """;
      return JSON.stringify({ sets: state.koto.sets, dev: kotoDevice(), bal: kotoBalance() }); })()"""
    r = json.loads(ev(b, js))
    assert r['sets']['dev-other'] == 4 and r['sets'][r['dev']] == 1, r
    assert r['bal'] == 4 + 1 + 10 - 1, r

def test_the_shop_letter_is_in_the_mailbox(b):
    js = """(() => { const l = letters().find(x => x.id === 'shop'); if (!l) return 'none';
      openLetters(); const btn = document.querySelector('#modalBody [data-letter="shop"] [data-act="letter-done"]'); btn.click();
      return JSON.stringify({ title: l.title, gone: !letters().some(x => x.id === 'shop') }); })()"""
    r = json.loads(ev(b, js))
    assert r == {'title': '山上的古道具屋開張了', 'gone': True}, r

# ---- 古道具屋, 書房's wares, 擺設 ----
GO_ROOM = "location.hash = '#/today'; document.getElementById('view').innerHTML = ''; route();"
def test_the_clock_hangs_again_once_bought_and_a_nail_waits_till_then(b):
    js = "(() => { " + FRESH + GO_ROOM + """ const before = { hands: !!document.querySelector('.study .clock-hands'), nail: document.querySelectorAll('.study svg.art circle[r=".055"]').length };
      state.koto.gift = 1; saveState(); location.hash = '#/shop'; route();
      document.querySelector('[data-act="ware-buy"][data-id="clock"]').click(); document.querySelector('[data-act="ware-buy-ok"]').click();
      const card = document.querySelector('[data-ware="clock"] .chip').textContent;
      """ + GO_ROOM + """ const after = { hands: !!document.querySelector('.study .clock-hands'), nail: document.querySelectorAll('.study svg.art circle[r=".055"]').length };
      return JSON.stringify({ before, after, card, bal: kotoBalance(), at: state.placed.clock }); })()"""
    r = json.loads(ev(b, js))
    assert r['before'] == {'hands': False, 'nail': 1}, r
    assert r['after'] == {'hands': True, 'nail': 0}, r
    assert r['card'] == '在書房' and r['bal'] == 0 and r['at'] == {'w': 'L', 'u': 1.25, 'v': 9.9}, r

def test_short_koto_buys_nothing_and_says_so(b):
    js = "(() => { " + FRESH + """ state.koto.gift = 5; saveState(); location.hash = '#/shop'; route();
      const btn = document.querySelector('[data-ware="cactus"] [data-act="ware-short"]'); const label = btn.textContent; btn.click();
      return JSON.stringify({ label, say: document.querySelector('.fuku-say').textContent, owned: owns('cactus'), buy: !!document.querySelector('[data-act="ware-buy"][data-id="cactus"]') }); })()"""
    r = json.loads(ev(b, js))
    assert r['label'] == '還差 1' and not r['owned'] and not r['buy'], r
    assert '言靈還不夠' in r['say'] or '再加油' in r['say'], r

def test_a_bought_ware_goes_to_its_spot_or_the_storage_box(b):
    js = "(() => { " + FRESH + """ state.koto.gift = 200; state.owned.bonsai = { paid: 0, on: todayStr() }; state.placed.bonsai = { w: 'F', x: 14, y: 0.75, r: 0 }; saveState();   // the gramophone's spot is taken
      const a = buyWare(WARE.get('cactus')), b2 = buyWare(WARE.get('gramophone'));
      return JSON.stringify({ a, b: b2, cactus: state.placed.cactus || null, gram: state.placed.gramophone || null, bal: kotoBalance() }); })()"""
    r = json.loads(ev(b, js))
    assert r['cactus'] == {'w': 'F', 'x': 0.6, 'y': 3.15, 'r': 0} and r['a'] == '放進書房了', r
    assert r['gram'] is None and '收納箱' in r['b'], r
    assert r['bal'] == 200 - 6 - 40, r

def test_wearing_goes_on_and_off_and_shows_on_the_hero(b):
    js = "(() => { " + FRESH + """ state.koto.gift = 30; saveState(); buyWare(WARE.get('beanie')); buyWare(WARE.get('strawhat'));
      const worn = state.wear.head; """ + GO_ROOM + """ const has = document.querySelector('.study .hero').innerHTML.includes('cy="-166" r="8"');   /* the beanie's pompom (colours are lit, so not its hex) */
      document.querySelector('.study-tools [data-act="wardrobe"]').click(); const swap = document.querySelector('#modalBody [data-act="ware-wear"][data-id="strawhat"]'); swap.click();
      const now = state.wear.head; document.querySelector('#modalBody [data-act="ware-wear"][data-id="strawhat"]').click();
      return JSON.stringify({ worn, has, now, off: state.wear.head }); })()"""
    r = json.loads(ev(b, js))
    assert r == {'worn': 'beanie', 'has': True, 'now': 'strawhat', 'off': None}, r

def test_arrange_takes_out_moves_turns_and_puts_away(b):
    js = "(async () => { " + FRESH + """ state.owned.chabudai = { paid: 0, on: todayStr() }; saveState(); """ + GO_ROOM + """
      document.querySelector('.study-edit').click(); const st = () => document.querySelector('.study');
      const tray = [...st().querySelectorAll('.tray-it')].map(x => x.dataset.id);
      st().querySelector('.tray-it[data-id="chabudai"]').click(); const p1 = Object.assign({}, state.placed.chabudai);
      const d = st().querySelector('.deco[data-ware="chabudai"]'), r = d.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height * 0.7;
      const pe = (el, type, px, py) => el.dispatchEvent(new PointerEvent(type, { clientX: px, clientY: py, pointerId: 9, pointerType: 'mouse', button: 0, buttons: type === 'pointerup' ? 0 : 1, bubbles: true }));
      pe(d, 'pointerdown', x, y); for (let i = 1; i <= 6; i++) { pe(st(), 'pointermove', x + 6 * i, y + 4 * i); await new Promise(q => setTimeout(q, 20)); } pe(st(), 'pointerup', x + 36, y + 24);
      const p2 = Object.assign({}, state.placed.chabudai);
      st().querySelector('[data-act="room-edit-turn"]').click(); const p3 = Object.assign({}, state.placed.chabudai);
      const desk = ROOM.fits(WARE.get('chabudai'), { w: 'F', x: 3, y: 1, r: 0 });
      st().querySelector('[data-act="room-edit-put"]').click(); const gone = !state.placed.chabudai;
      st().querySelector('[data-act="room-edit-done"]').click();
      return JSON.stringify({ tray, p1ok: ROOM.fits(WARE.get('chabudai'), p1), moved: p1.x !== p2.x || p1.y !== p2.y, turned: p3.r === 1, desk, gone, edit: !!document.querySelector('.study.edit') }); })()"""
    r = json.loads(ev(b, js))
    assert r == {'tray': ['chabudai'], 'p1ok': True, 'moved': True, 'turned': True, 'desk': False, 'gone': True, 'edit': False}, r

def test_the_rooms_own_things_are_laid_out_and_can_be_put_away(b):
    js = "(() => { " + FRESH + """ const own = ['bed', 'nightTable', 'bigPlant', 'umbrella', 'sageRug', 'bedRug', 'doorMat', 'fujiPrint', 'kanaChart', 'nightPicture', 'pegRail'];
      const laid = own.every(id => state.placed[id]); """ + GO_ROOM + """
      document.querySelector('.study-edit').click(); const st = () => document.querySelector('.study');
      st().querySelector('.deco[data-ware="bed"]').dispatchEvent(new PointerEvent('pointerdown', { clientX: 1, clientY: 1, pointerId: 3, pointerType: 'mouse', button: 0, buttons: 1, bubbles: true }));
      st().dispatchEvent(new PointerEvent('pointerup', { clientX: 1, clientY: 1, pointerId: 3, pointerType: 'mouse', button: 0, bubbles: true }));
      const turn = !!st().querySelector('[data-act="room-edit-turn"]'); st().querySelector('[data-act="room-edit-put"]').click();
      const stored = !state.placed.bed, inBox = !!st().querySelector('.tray-it[data-id="bed"]'), notSold = !WARES.some(w => w.starter && document.querySelector('#view [data-ware="' + w.id + '"] .price'));
      st().querySelector('.tray-it[data-id="bed"]').click(); const back = !!state.placed.bed;
      return JSON.stringify({ laid, turn, stored, inBox, back, shop: WARES.filter(w => w.starter).some(w => shopCardHtml(w, 0).includes('ware-buy')) }); })()"""
    r = json.loads(ev(b, js))
    assert r == {'laid': True, 'turn': False, 'stored': True, 'inBox': True, 'back': True, 'shop': False}, r

def test_working_things_move_but_never_go_in_the_box(b):
    js = "(() => { " + FRESH + GO_ROOM + """ const st = () => document.querySelector('.study'), box = (id) => { const r = st().querySelector('[data-thing="' + id + '"]').getBoundingClientRect(); return [Math.round(r.left), Math.round(r.top)]; };
      const before = box('notebook'), spot0 = ROOM.use.length;
      const ok = ROOM.fits(WARE.get('desk'), { w: 'F', x: 6, y: 6, r: 0 }); state.placed.desk = { w: 'F', x: 6, y: 6, r: 0 }; saveState(); """ + GO_ROOM + """
      const after = box('notebook');
      document.querySelector('.study-edit').click();
      const tray = [...st().querySelectorAll('.tray-it')].map(x => x.dataset.id).filter(id => WARE.get(id).fixed);
      st().querySelector('.deco[data-ware="desk"]').dispatchEvent(new PointerEvent('pointerdown', { clientX: 1, clientY: 1, pointerId: 4, pointerType: 'mouse', button: 0, buttons: 1, bubbles: true }));
      st().dispatchEvent(new PointerEvent('pointerup', { clientX: 1, clientY: 1, pointerId: 4, pointerType: 'mouse', button: 0, bubbles: true }));
      const put = !!st().querySelector('[data-act="room-edit-put"]'), note = (st().querySelector('.edit-sel .sel-note') || {}).textContent || '';
      ROOM.edit(st().querySelector('.edit-top button'), 'put'); const still = !!state.placed.desk;
      const wall = ROOM.fits(WARE.get('calendar'), { w: 'L', u: 3.2, v: 5.5 }), door = ROOM.fits(WARE.get('calendar'), { w: 'L', u: 4.6, v: 5.5 });
      return JSON.stringify({ ok, moved: before[0] !== after[0] || before[1] !== after[1], tray, put, note, still, wall, door }); })()"""
    r = json.loads(ev(b, js))
    assert r == {'ok': True, 'moved': True, 'tray': [], 'put': False, 'note': '只能搬，不能收', 'still': True, 'wall': True, 'door': False}, r

def test_the_hero_finds_a_thing_moved_to_the_other_wall(b):
    js = "(async () => { " + FRESH + """ localStorage.removeItem('nq_hero'); state.placed.calendar = { w: 'L', u: 3.2, v: 5.5 }; saveState(); """ + GO_ROOM + """
      const t = document.querySelector('[data-thing="calendar"]'); let n = 0; ROOM.use(t, () => { n++; });
      await new Promise(q => setTimeout(q, 2400)); const h = JSON.parse(localStorage.getItem('nq_hero')).room;
      return JSON.stringify({ n, nearWall: h.x < 2.5 && Math.abs(h.y - 3.2) < 0.3, faces: h.back && h.flip }); })()"""
    r = json.loads(ev(b, js))
    assert r == {'n': 1, 'nearWall': True, 'faces': True}, r

# ---- the hero ----
def test_the_hero_walks_to_a_thing_then_opens_it(b):
    js = "(async () => { " + FRESH + " localStorage.removeItem('nq_hero'); " + GO_ROOM + """
      let opened = 0; const t0 = Date.now(); ROOM.use(document.querySelector('[data-thing="calendar"]'), () => { opened = Date.now() - t0; });
      await new Promise(q => setTimeout(q, 2500));
      const h = JSON.parse(localStorage.getItem('nq_hero')).room;
      return JSON.stringify({ opened: opened > 200, at: [h.x, h.y], back: h.back }); })()"""
    r = json.loads(ev(b, js))
    assert r == {'opened': True, 'at': [10.65, 1.4], 'back': True}, r   # the first clear place in front of the calendar

def test_a_second_tap_goes_straight_in_and_a_floor_tap_moves_the_hero(b):
    js = "(async () => { " + FRESH + " localStorage.removeItem('nq_hero'); " + GO_ROOM + """
      let n = 0; const shelf = document.querySelector('[data-thing="shelf"]'); ROOM.use(shelf, () => { n++; }); ROOM.use(shelf, () => { n++; });
      const quick = n; await new Promise(q => setTimeout(q, 1500)); const later = n;
      const room = document.querySelector('.study .room').getBoundingClientRect(), vb = ROOM.kit.VB, S = ROOM.kit.S;
      const [sx, sy] = ROOM.kit.P(4.5, 5.5, 0), cx = room.left + (sx - vb[0]) / vb[2] * room.width, cy = room.top + (sy - vb[1]) / vb[3] * room.height;
      document.elementFromPoint(cx, cy).dispatchEvent(new MouseEvent('click', { clientX: cx, clientY: cy, bubbles: true }));
      await new Promise(q => setTimeout(q, 1600)); const h = JSON.parse(localStorage.getItem('nq_hero')).room;
      return JSON.stringify({ quick, later, near: Math.hypot(h.x - 4.5, h.y - 5.5) < 0.6 }); })()"""
    r = json.loads(ev(b, js))
    assert r == {'quick': 1, 'later': 1, 'near': True}, r

# ---- 書房's camera (no stops): a swipe looks round freely, a drag on the hero leads him and the view follows, two fingers zoom ----
PHONE, DESK = (390, 844), (1280, 800, False)
def ev_at(b, size, js):   # the page opened at that screen size
    return b.run([("metrics", size), ("nav", URL), ("wait", READY), ("eval", js)])[-1]
# pe: a pointer event (a finger unless said); cam: the room's offset on screen (px)
POINTER = """const wait = (ms) => new Promise(q => setTimeout(q, ms));
  const pe = (el, type, x, y, id, kind) => el.dispatchEvent(new PointerEvent(type, { clientX: x, clientY: y, pointerId: id, pointerType: kind || 'touch', isPrimary: id === 1, button: 0, buttons: type === 'pointerup' ? 0 : 1, bubbles: true, cancelable: true }));
  const cam = () => { const m = new DOMMatrix(getComputedStyle(document.querySelector('.study .room')).transform); return [m.m41, m.m42]; };"""

def test_the_wardrobe_is_a_button_up_top_and_a_tap_on_the_hero_makes_him_hop(b):
    js = "(async () => { " + FRESH + GO_ROOM + POINTER + """ await wait(200);
      const btn = document.querySelector('.study-tools [data-act="wardrobe"]'); if (btn) btn.click();
      const wardrobe = !!document.querySelector('#modalBody .wardrobe'); closeModal();
      document.querySelector('.study .hero .fig').dispatchEvent(new MouseEvent('click', { bubbles: true }));
      const room = { modal: modalOpen(), hop: document.querySelector('.study .hero').classList.contains('hop') }; closeModal();
      location.hash = '#/outside'; document.getElementById('view').innerHTML = ''; route(); await wait(200);
      document.querySelector('.yard .yhero .fig').dispatchEvent(new MouseEvent('click', { bubbles: true }));
      const yard = { modal: modalOpen(), hop: document.querySelector('.yard .yhero').classList.contains('hop') };
      return JSON.stringify({ wardrobe, room, yard }); })()"""
    r = json.loads(ev(b, js))
    assert r == {'wardrobe': True, 'room': {'modal': False, 'hop': True}, 'yard': {'modal': False, 'hop': True}}, r

def test_a_swipe_looks_round_the_room_and_stays_where_it_is_let_go(b):
    js = "(async () => { " + FRESH + " localStorage.removeItem('nq_hero'); localStorage.removeItem('nq_room_zoom'); " + GO_ROOM + POINTER + """ await wait(300);
      const st = document.querySelector('.study'), r = st.getBoundingClientRect(), x0 = r.left + r.width * 0.6, y0 = r.top + r.height * 0.85, before = cam();
      pe(st, 'pointerdown', x0, y0, 1);
      for (let i = 1; i <= 15; i++) { pe(st, 'pointermove', x0 - 20 * i, y0, 1); await wait(30); }   /* 300 px to the left */
      await wait(200); pe(st, 'pointermove', x0 - 300, y0, 1); pe(st, 'pointerup', x0 - 300, y0, 1);   /* held still before letting go: no fling */
      await wait(700); const after = cam(), away = (id) => document.querySelector('.study [data-thing="' + id + '"]').classList.contains('away');
      return JSON.stringify({ dots: !!st.querySelector('.room-stops'), dx: Math.round(after[0] - before[0]), notebook: away('notebook'), drawer: away('drawer') }); })()"""
    r = json.loads(ev_at(b, PHONE, js))
    assert abs(r['dx'] + 300) <= 2, r   # the room moved with the finger and stayed there (no stop to snap to)
    assert {k: r[k] for k in ('dots', 'notebook', 'drawer')} == {'dots': False, 'notebook': True, 'drawer': False}, r   # the desk's tag waits off screen, the chest's shows

def test_a_tag_at_a_side_of_the_screen_slides_in_to_stay_whole(b):
    js = "(async () => { " + FRESH + " localStorage.removeItem('nq_hero'); localStorage.removeItem('nq_room_zoom'); " + GO_ROOM + POINTER + """ await wait(300);
      const st = document.querySelector('.study'), tag = () => document.querySelector('.study [data-thing="phones"] .tag').getBoundingClientRect();
      const t0 = tag(), x0 = 300, y0 = 330, dx = Math.round(t0.left + t0.width / 2 - 30);   /* the 聽一輪 tag's middle to 30 px from the left side */
      pe(st, 'pointerdown', x0, y0, 1);
      for (let i = 1; i <= 10; i++) { pe(st, 'pointermove', x0 - dx * i / 10, y0, 1); await wait(30); }
      await wait(200); pe(st, 'pointermove', x0 - dx, y0, 1); pe(st, 'pointerup', x0 - dx, y0, 1); await wait(600);
      const t1 = tag();
      return JSON.stringify({ away: document.querySelector('.study [data-thing="phones"]').classList.contains('away'), left: Math.round(t1.left), right: Math.round(t1.right), w: Math.round(t1.width) }); })()"""
    r = json.loads(ev_at(b, PHONE, js))
    assert r['away'] is False and r['left'] >= 0 and r['right'] <= 390, r   # half of it would be off the screen where it stands

# ---- the things' badges: signs instead of words; at rest they go out of sight, a touch brings them back ----
def test_the_things_wear_signs_with_the_days_ring_and_the_notebook_stays_plain(b):
    js = "(async () => { " + FRESH + " state.mistakes = [{ key: 'v1' }, { key: 'v2' }, { key: 'v3', mastered: true }]; saveState(); " + GO_ROOM + POINTER + """ await wait(200);
      const st = document.querySelector('.study'); ROOM.level(st, 40);
      const things = [...st.querySelectorAll('.thing')].map(t => { const tag = t.querySelector('.tag'), name = tag.querySelector('.tag-name');
        return [t.dataset.thing, !!tag.querySelector('svg:not(.ring)'), name ? getComputedStyle(name).display : 'no name', t.getAttribute('aria-label')]; });
      const fill = st.querySelector('[data-thing="notebook"] .ring .fill'), count = st.querySelector('[data-thing="drawer"] .count');
      return JSON.stringify({ things, ring: fill && fill.getAttribute('stroke-dasharray'), count: count && count.textContent }); })()"""
    r = json.loads(ev(b, js))
    got = {t[0]: t[1:] for t in r['things']}
    assert all(v[0] is True and v[1] == 'none' for v in got.values()), got   # every thing shows its sign, its words wait
    assert {k: v[2] for k, v in got.items() if k != 'door'} == {'shelf': '課程', 'cards': '單字', 'notebook': '今日練習 40%', 'phones': '聽一輪', 'drawer': '錯題本', 'board': '學習分析', 'calendar': '模擬考'}, got
    assert got['door'][2].startswith('出門'), got   # the words are still there for a screen reader
    assert (r['ring'], r['count']) == ('40 100', None), r   # two in the notebook, nothing on it asking for a tap (聽一輪 is the one to push)

def test_a_tap_on_a_thing_shows_its_name_for_a_moment_then_opens_it(b):
    js = "(async () => { " + FRESH + " localStorage.removeItem('nq_hero'); " + GO_ROOM + POINTER + """ await wait(200);
      const t = document.querySelector('.study [data-thing="shelf"]'); t.click(); await wait(50);
      const name = t.querySelector('.tag-name'), shown = { named: t.classList.contains('named'), shown: !!name && getComputedStyle(name).display !== 'none', text: name ? name.textContent : '' };
      await wait(2600);
      return JSON.stringify({ shown, hash: location.hash }); })()"""
    r = json.loads(ev(b, js))
    assert r == {'shown': {'named': True, 'shown': True, 'text': '課程'}, 'hash': '#/course'}, r

def test_the_signs_rest_out_of_sight_a_touch_brings_them_back_and_a_tap_still_opens(b):
    js = "(async () => { " + FRESH + " localStorage.removeItem('nq_hero'); localStorage.removeItem('nq_room_zoom'); " + GO_ROOM + POINTER + """
      const st = document.querySelector('.study'), quiet = () => st.classList.contains('quiet'), op = (id) => getComputedStyle(st.querySelector('[data-thing="' + id + '"] .tag')).opacity;
      await wait(300); const atFirst = quiet();
      await wait(4600); const later = [quiet(), op('phones'), op('door')];   /* letters wait in the mailbox: the door's sign stays */
      const r = st.getBoundingClientRect(), x0 = r.left + r.width * 0.6, y0 = r.top + 300;
      pe(st, 'pointerdown', x0, y0, 1); const touched = quiet();
      for (let i = 1; i <= 6; i++) { pe(st, 'pointermove', x0 - 15 * i, y0, 1); await wait(30); } const moving = quiet();
      await wait(200); pe(st, 'pointermove', x0 - 90, y0, 1); pe(st, 'pointerup', x0 - 90, y0, 1); const letGo = quiet();   /* held still, then let go (a fling keeps them away while it coasts) */
      await wait(4600); const again = quiet();
      const ph = st.querySelector('[data-thing="phones"]'), q = ph.getBoundingClientRect(), px = q.left + q.width / 2, py = q.top + q.height / 2;
      pe(ph, 'pointerdown', px, py, 2); pe(ph, 'pointerup', px, py, 2); ph.click(); await wait(2600);   /* a tap: out of sight, still there to tap */
      return JSON.stringify({ atFirst, later, touched, moving, letGo, again, hash: location.hash }); })()"""
    r = json.loads(ev_at(b, DESK, js))
    assert r == {'atFirst': False, 'later': [True, '0', '1'], 'touched': False, 'moving': True, 'letGo': False, 'again': True, 'hash': '#/listen'}, r

def test_a_drag_on_the_hero_leads_him_and_the_view_follows(b):
    js = "(async () => { " + FRESH + " localStorage.removeItem('nq_hero'); localStorage.removeItem('nq_room_zoom'); " + GO_ROOM + POINTER + """ await wait(300);
      const st = document.querySelector('.study'), r = st.getBoundingClientRect(), f = st.querySelector('.hero .fig').getBoundingClientRect();
      const x0 = f.left + f.width / 2, y0 = f.top + f.height * 0.6, edge = r.right - 6, before = cam();
      pe(document.elementFromPoint(x0, y0), 'pointerdown', x0, y0, 5);
      for (let i = 1; i <= 10; i++) { pe(st, 'pointermove', x0 + (edge - x0) * i / 10, y0, 5); await wait(30); }
      for (let i = 0; i < 24; i++) { pe(st, 'pointermove', edge, y0, 5); await wait(50); }   /* held at the screen's edge */
      pe(st, 'pointerup', edge, y0, 5); await wait(1500);
      const h = JSON.parse(localStorage.getItem('nq_hero') || '{}').room || { x: 3.4, y: 4.7 }, after = cam();
      return JSON.stringify({ went: +((h.x - h.y) - (3.4 - 4.7)).toFixed(2), panned: Math.round(before[0] - after[0]), modal: modalOpen(), hash: location.hash }); })()"""
    r = json.loads(ev_at(b, PHONE, js))
    assert r['went'] > 4 and r['panned'] > 80, r   # he went right along the room (screen units) and the view went with him
    assert (r['modal'], r['hash']) == (False, '#/today'), r

def test_two_fingers_zoom_between_the_whole_room_and_twice_as_close_and_it_is_remembered(b):
    js = "(async () => { " + FRESH + " localStorage.removeItem('nq_room_zoom'); " + GO_ROOM + POINTER + """ await wait(300);
      const st = () => document.querySelector('.study'), width = () => document.querySelector('.study .room').offsetWidth, w0 = width();
      const pinch = async (a0, b0, a1, b1) => { pe(st(), 'pointerdown', a0, 400, 11); pe(st(), 'pointerdown', b0, 400, 12);
        for (let i = 1; i <= 8; i++) { pe(st(), 'pointermove', a0 + (a1 - a0) * i / 8, 400, 11); pe(st(), 'pointermove', b0 + (b1 - b0) * i / 8, 400, 12); await wait(20); }
        pe(st(), 'pointerup', a1, 400, 11); pe(st(), 'pointerup', b1, 400, 12); await wait(150); };
      await pinch(150, 240, 60, 330); const big = width() / w0, saved = localStorage.getItem('nq_room_zoom');   /* 90 → 270 px apart */
      """ + GO_ROOM + """ await wait(150); const again = width() / w0;
      await pinch(60, 330, 190, 200); const small = width() / w0;   /* 270 → 10 px apart */
      return JSON.stringify({ size: [st().clientWidth, st().clientHeight], big: +big.toFixed(3), saved: Number(saved), again: +again.toFixed(3), small: +small.toFixed(4) }); })()"""
    r = json.loads(ev_at(b, PHONE, js))
    assert r['size'] == [390, 844], r
    assert (r['big'], r['saved'], r['again']) == (2.0, 2.0, 2.0), r   # three times as close is held to twice the starting zoom, kept for next time
    # at 390×844 the start is 390 / (8 × 40) = 1.21875 (the bookcase with the desk across the screen) and the whole room (as far
    # as the old stops reached: 28.8 room units across) is 390 / (28.8 × 40) = 0.33854, so as far out as it goes is 0.2778 of the start
    assert abs(r['small'] - 0.2778) < 0.002, r

def test_the_wheel_zooms_round_the_pointer(b):
    js = "(async () => { " + FRESH + " localStorage.removeItem('nq_room_zoom'); " + GO_ROOM + POINTER + """ await wait(300);
      const st = document.querySelector('.study'), nb = () => { const q = document.querySelector('.study [data-thing="notebook"]').getBoundingClientRect(); return [q.left + q.width / 2, q.top + q.height / 2]; };
      const [x, y] = nb(), w0 = document.querySelector('.study .room').offsetWidth;
      st.dispatchEvent(new WheelEvent('wheel', { deltaY: -300, deltaMode: 0, clientX: x, clientY: y, bubbles: true, cancelable: true })); await wait(400);
      const [x1, y1] = nb();
      return JSON.stringify({ grew: +(document.querySelector('.study .room').offsetWidth / w0).toFixed(2), dx: Math.round(x1 - x), dy: Math.round(y1 - y) }); })()"""
    r = json.loads(ev_at(b, DESK, js))
    assert r['grew'] > 1.3 and abs(r['dx']) <= 2 and abs(r['dy']) <= 2, r   # closer, and the notebook under the pointer stayed under it

def test_the_yard_has_the_shop_and_the_hero_walks_up_to_it(b):
    js = "(async () => { " + FRESH + """ location.hash = '#/outside'; document.getElementById('view').innerHTML = ''; route();
      const tag = document.querySelector('.yard .shop-btn .tag').textContent, hero = !!document.querySelector('.yard .yhero');
      document.querySelector('.yard .shop-btn').click(); await new Promise(q => setTimeout(q, 4500));
      return JSON.stringify({ tag, hero, hash: location.hash, fuku: !!document.querySelector('.shop-front .fuku') }); })()"""
    r = json.loads(ev(b, js))
    assert r == {'tag': '古道具屋', 'hero': True, 'hash': '#/shop', 'fuku': True}, r

# a tap on 古道具屋: the hero runs over the lawn and up the hill path, small with the distance but outlined, in at the shop's door
def test_a_tap_on_the_shop_runs_the_hero_up_the_hill_path(b):
    js = "(async () => { " + FRESH + """ localStorage.removeItem('nq_hero'); location.hash = '#/outside'; document.getElementById('view').innerHTML = ''; route();
      await new Promise(q => setTimeout(q, 200));
      const h = () => document.querySelector('.yard .yhero'), scale = () => { const m = new DOMMatrix(getComputedStyle(h()).transform); return Math.hypot(m.a, m.b); };
      document.querySelector('.yard .shop-btn').click();
      let top = 0, small = 1, climb = false;
      for (let i = 0; i < 45 && location.hash === '#/outside'; i++) { await new Promise(q => setTimeout(q, 100)); if (!h()) break; top = Math.max(top, yh.Y); small = Math.min(small, scale()); climb = climb || h().classList.contains('climb'); }
      await new Promise(q => setTimeout(q, 600));
      const saved = JSON.parse(localStorage.getItem('nq_hero') || '{}').yard || null;
      return JSON.stringify({ top: Math.round(top), small: +small.toFixed(3), climb, hash: location.hash, saved }); })()"""
    r = json.loads(ev_at(b, PHONE, js))
    # on a 390 px phone the hill is drawn 1:1: the path starts 258 px up and the shop's door is 345 px up (the lawn ends at 214)
    assert r['top'] >= 330 and r['small'] < 0.12 and r['climb'] is True, r
    assert r['hash'] == '#/shop' and r['saved'] == {'X': -60, 'Y': 214}, r   # next time out he stands at the foot of the path

def test_a_second_tap_on_the_shop_goes_straight_in(b):
    js = "(async () => { " + FRESH + """ localStorage.removeItem('nq_hero'); location.hash = '#/outside'; document.getElementById('view').innerHTML = ''; route();
      await new Promise(q => setTimeout(q, 200)); const btn = document.querySelector('.yard .shop-btn');
      btn.click(); await new Promise(q => setTimeout(q, 300)); btn.click(); await new Promise(q => setTimeout(q, 700));
      return location.hash; })()"""
    assert ev_at(b, PHONE, js) == '#/shop'

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
