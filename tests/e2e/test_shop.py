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
FRESH = "state.stage = 'main'; state.kanaKnown = true; state.introSeen = true; state.storyV = 9; state.startChosen = true; state.currentUnit = 'm1'; saveState(); DAILY_CACHE = null;"
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
    assert r['gain'] == {'set': 1, 'day': 0, 'full': False}, r
    assert r['bal'] == 1, r
    assert r['line'] == 'あ言靈+1做完一組共1', r   # the あ is the icon's

def test_quitting_a_set_early_gives_nothing(b):
    js = "(() => { " + FRESH + """ startSession('daily', { size: 8 }); let n = 0;
      while (n < 3) { const e = currentEntry(); if (e.preview && !e.previewDone) { dismissPreview(); continue; } answerCurrent(e.q.answer); nextQuestion(); n++; }
      exitPractice(); const gain = SESSION.koto;
      return JSON.stringify({ gain, bal: kotoBalance(), line: !!document.querySelector('#view .koto-gain') }); })()"""
    r = json.loads(ev(b, js))
    assert r == {'gain': {'set': 0, 'day': 0, 'full': False}, 'bal': 0, 'line': False}, r

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
    assert r['last'] == {'set': 1, 'day': 10, 'full': False}, r
    assert r['bal1'] == r['sets'] + 10, r
    assert r['more'] == {'set': 1, 'day': 0, 'full': False}, r
    assert r['bal2'] == r['bal1'] + 1, r

def test_each_device_counts_its_own_sets(b):
    js = """(() => { state.koto = { daySets: { [todayStr()]: { 'dev-other': 4 } }, days: ['2026-01-01'], listen: {}, mail: {}, sets: { 'dev-old': 2 }, gift: 0 }; state.owned = { clock: { paid: 1, on: '2026-01-02' } }; saveState();
      """ + FRESH + " startSession('daily', { size: 4 }); " + PLAY + """;
      return JSON.stringify({ sets: state.koto.daySets[todayStr()], dev: kotoDevice(), bal: kotoBalance() }); })()"""
    r = json.loads(ev(b, js))
    assert r['sets']['dev-other'] == 4 and r['sets'][r['dev']] == 1, r
    assert r['bal'] == 4 + 1 + 10 + 2 - 1, r   # today's sets on both devices, an old day's bonus, the first rule's sets, less the clock

def test_answering_gives_at_most_20_a_day_and_listening_at_most_30(b):
    js = "(() => { " + FRESH + """ const t = todayStr(), d = kotoDevice();
      state.koto = { daySets: { [t]: { [d]: 9, 'dev-other': 9 }, '2026-01-02': { [d]: 30 } }, days: [], listen: { [t]: { 'dev-other': 28 } }, mail: {}, sets: {}, gift: 0 }; saveState();
      const b0 = kotoBalance(); startSession('daily', { size: 4 }); const g1 = """ + PLAY + """; const b1 = kotoBalance();
      startSession('daily', { size: 4 }); const g2 = """ + PLAY + """; const b2 = kotoBalance();
      const L = { since: 0 }; let now = 1000, got = 0; listenKotoTick(L, now);
      for (let i = 0; i < 60; i++) { now += 20000; got += listenKotoTick(L, now); }   /* 20 minutes of lines, a line every 20 s */
      const b3 = kotoBalance(); now += 200000; listenKotoTick(L, now); const broke = L.heard;   /* over a minute and a half without a line: starts over */
      listenKotoStop(L); const stopped = [L.since, L.heard];
      return JSON.stringify({ b0, g1, g2, b1, b2, got, b3, mine: state.koto.listen[t][d], broke, stopped, pops: document.querySelectorAll('.koto-pop').length }); })()"""
    r = json.loads(ev(b, js))
    assert r['b0'] == 18 + 20 + 28, r   # an old day's 30 sets count as 20; today 18 so far; listening 28
    assert r['g1'] == {'set': 1, 'day': 0, 'full': False} and r['b1'] == r['b0'] + 1, r
    assert r['g2'] == {'set': 1, 'day': 0, 'full': False} and r['b2'] == r['b1'] + 1, r   # 20 now: the cap
    assert r['got'] == 2 and r['mine'] == 2 and r['b3'] == r['b2'] + 2, r   # four lots of 5 minutes, but the day stops at 30
    assert r['broke'] == 0 and r['stopped'] == [0, 0] and r['pops'] >= 1, r

def test_a_set_past_the_days_cap_gives_nothing_and_says_so(b):
    js = "(() => { " + FRESH + """ const t = todayStr(); state.koto.daySets = { [t]: { 'dev-other': 20 } }; saveState();
      startSession('daily', { size: 4 }); const gain = """ + PLAY + """;
      const line = document.querySelector('#view .koto-gain'); return JSON.stringify({ gain, line: line ? line.textContent.replace(/\\s+/g, '') : null, bal: kotoBalance() }); })()"""
    r = json.loads(ev(b, js))
    assert r['gain'] == {'set': 0, 'day': 0, 'full': True} and r['bal'] == 20, r
    assert r['line'] == 'あ言靈今天作答的言靈拿滿了共20', r

def test_fukuyas_opening_letter_brings_10_koto_once_with_his_face_and_no_rules(b):
    js = """(() => { state.koto.gift = (Number(state.koto.gift) || 0) + 20; const l = letters().find(x => x.id === 'opening'); if (!l) return 'none';   /* 20 earned: 古道具屋 opens */
      const bal0 = kotoBalance(); openLetters('opening'); const card = () => document.querySelector('#modalBody [data-letter="opening"]');
      const face = !!card().querySelector('.letter-from svg'), stamp = getComputedStyle(card(), '::before').display, rules = /做完一組|\\+1|\\+10|一組|掛鐘|擺設|衣櫃/.test(card().textContent), learn = card().textContent.includes('吸收一分知識');
      card().querySelector('[data-act="letter-gift"]').click(); const gain = kotoBalance() - bal0, got = !!card().querySelector('.letter-got'), shop = !!card().querySelector('[data-route="#/shop"]');
      takeLetterGift('opening'); const again = kotoBalance() - bal0 - gain;   /* another device took it as well: once */
      card().querySelector('[data-act="letter-done"]').click();
      return JSON.stringify({ title: l.title, from: l.from, face, stamp, rules, learn, gain, got, shop, again, kept: letters().some(x => x.id === 'opening'), unread: !letters().find(x => x.id === 'opening').read, mail: state.koto.mail }); })()"""
    r = json.loads(ev(b, js))
    assert r == {'title': '古道具屋開張了', 'from': 'fuku', 'face': True, 'stamp': 'none', 'rules': False, 'learn': True, 'gain': 10, 'got': True, 'shop': True, 'again': 0, 'kept': True, 'unread': False, 'mail': {'opening': 10}}, r   # no rules, no wares, no how-to

def test_putting_the_opening_letter_away_still_takes_its_koto(b):
    js = """(() => { state.koto.gift = (Number(state.koto.gift) || 0) + 20; const bal0 = kotoBalance(); openLetters('opening'); document.querySelector('#modalBody [data-letter="opening"] [data-act="letter-done"]').click();
      return JSON.stringify({ gain: kotoBalance() - bal0, kept: letters().some(x => x.id === 'opening') }); })()"""
    r = json.loads(ev(b, js))
    assert r == {'gain': 10, 'kept': True}, r   # put away: its 言靈 taken; the letter stays, read

# ---- 古道具屋, 書房's wares, 擺設 ----
GO_ROOM = "location.hash = '#/today'; document.getElementById('view').innerHTML = ''; route();"
def test_a_bought_clock_waits_in_the_storage_box_till_it_hangs(b):
    js = "(() => { " + FRESH + GO_ROOM + """ const now = () => ({ hands: !!document.querySelector('.study .clock-hands'), nail: document.querySelectorAll('.study svg.art circle[r=".055"]').length, placed: !!state.placed.clock });
      const before = now();
      state.koto.gift = 20; saveState(); location.hash = '#/shop'; route();
      document.querySelector('[data-act="ware-buy"][data-id="clock"]').click(); const ask = document.querySelector('#modalBody p').textContent; document.querySelector('[data-act="ware-buy-ok"]').click();
      const card = document.querySelector('[data-ware="clock"] .chip').textContent;
      """ + GO_ROOM + """ const bought = now();
      document.querySelector('.study-edit').click(); document.querySelector('.tray-it[data-id="clock"]').click(); document.querySelector('[data-act="room-edit-done"]').click();
      return JSON.stringify({ before, bought, hung: now(), card, ask: ask.includes('收納箱'), bal: kotoBalance() }); })()"""
    r = json.loads(ev(b, js))
    assert r['before'] == {'hands': False, 'nail': 0, 'placed': False}, r   # the room has no clock of its own (and no nail where one hung)
    assert r['bought'] == {'hands': False, 'nail': 0, 'placed': False} and r['card'] == '在收納箱' and r['ask'] and r['bal'] == 0, r
    assert r['hung'] == {'hands': True, 'nail': 0, 'placed': True}, r

def test_short_koto_buys_nothing_and_says_so(b):
    js = "(() => { " + FRESH + """ state.koto.gift = 5; saveState(); location.hash = '#/shop'; route();
      const btn = document.querySelector('[data-ware="cactus"] [data-act="ware-short"]'); const label = btn.textContent; btn.click();
      return JSON.stringify({ label, say: document.querySelector('.fuku-say').textContent, owned: owns('cactus'), buy: !!document.querySelector('[data-act="ware-buy"][data-id="cactus"]') }); })()"""
    r = json.loads(ev(b, js))
    assert r['label'] == '還差 1' and not r['owned'] and not r['buy'], r
    assert '言靈還不夠' in r['say'] or '再加油' in r['say'], r

def test_a_bought_ware_goes_in_the_storage_box_and_a_wear_in_the_wardrobe(b):
    js = "(() => { " + FRESH + """ state.koto.gift = 200; saveState();
      const a = buyWare(WARE.get('cactus')), w = buyWare(WARE.get('beanie'));
      return JSON.stringify({ a, w, cactus: state.placed.cactus || null, head: state.wear.head || null, owned: owns('cactus') && owns('beanie'), bal: kotoBalance() }); })()"""
    r = json.loads(ev(b, js))
    assert r['cactus'] is None and '收納箱' in r['a'], r   # set out in 擺設 when they like
    assert r['head'] is None and '衣櫃' in r['w'], r   # put on from the wardrobe
    assert r['owned'] and r['bal'] == 200 - 6 - 30, r

def test_wearing_goes_on_and_off_and_shows_on_the_hero(b):
    js = "(async () => { " + FRESH + """ state.koto.gift = 30; saveState(); buyWare(WARE.get('beanie')); buyWare(WARE.get('strawhat'));
      const bought = state.wear.head || null; """ + GO_ROOM + """
      const wait = (ms) => new Promise(q => setTimeout(q, ms)), act = (sel) => document.querySelector(sel).click();
      const dress = async (ids, keep) => { act('.study-tools [data-act="wardrobe"]'); act('[data-act="dress-tab"][data-tab="wear"]'); ids.forEach(id => act('[data-act="dress-wear"][data-id="' + id + '"]')); act(keep ? '[data-act="dress-done"]' : '[data-act="dress-cancel"]'); await wait(600); };
      await dress(['beanie'], true); const worn = state.wear.head, has = document.querySelector('.study .room .hero').innerHTML.includes('cy="-187" r="8.6"');   /* the beanie's pompom (colours are lit, so not its hex) */
      await dress(['strawhat'], true); const now = state.wear.head;
      await dress(['strawhat'], false); const kept = state.wear.head;   /* taken off, then 取消: still on */
      await dress(['strawhat'], true);
      return JSON.stringify({ bought, worn, has, now, kept, off: state.wear.head }); })()"""
    r = json.loads(ev(b, js))
    assert r == {'bought': None, 'worn': 'beanie', 'has': True, 'now': 'strawhat', 'kept': 'strawhat', 'off': None}, r

def test_arrange_takes_out_moves_turns_and_puts_away(b):
    js = "(async () => { " + FRESH + """ state.owned.chabudai = { paid: 0, on: todayStr() }; saveState(); """ + GO_ROOM + """
      document.querySelector('.study-edit').click(); const st = () => document.querySelector('.study');
      const tray = [...st().querySelectorAll('.tray-it')].map(x => x.dataset.id);
      st().querySelector('.tray-it[data-id="chabudai"]').click(); const p1 = Object.assign({}, state.placed.chabudai);
      const d = st().querySelector('.deco[data-ware="chabudai"]'), r = d.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height * 0.7;
      const pe = (el, type, px, py) => el.dispatchEvent(new PointerEvent(type, { clientX: px, clientY: py, pointerId: 9, pointerType: 'mouse', button: 0, buttons: type === 'pointerup' ? 0 : 1, bubbles: true }));
      pe(d, 'pointerdown', x, y); for (let i = 1; i <= 6; i++) { pe(st(), 'pointermove', x + 6 * i, y - 4 * i); await new Promise(q => setTimeout(q, 20)); } pe(st(), 'pointerup', x + 36, y - 24);   /* up the room: just above the box it is taken out to (down would drop it back in) */
      const p2 = Object.assign({}, state.placed.chabudai);
      st().querySelector('[data-act="room-edit-turn"]').click(); const p3 = Object.assign({}, state.placed.chabudai);
      const desk = ROOM.fits(WARE.get('chabudai'), { w: 'F', x: 3, y: 1, r: 0 });
      st().querySelector('[data-act="room-edit-put"]').click(); const gone = !state.placed.chabudai;
      st().querySelector('[data-act="room-edit-done"]').click();
      return JSON.stringify({ tray, p1ok: ROOM.fits(WARE.get('chabudai'), p1), moved: p1.x !== p2.x || p1.y !== p2.y, turned: p3.r === 1, desk, gone, edit: !!document.querySelector('.study.edit') }); })()"""
    r = json.loads(ev(b, js))
    assert r == {'tray': ['chabudai', 'garland1'], 'p1ok': True, 'moved': True, 'turned': True, 'desk': False, 'gone': True, 'edit': False}, r

def test_the_rooms_own_things_are_laid_out_and_can_be_put_away(b):
    js = "(() => { " + FRESH + """ const own = ['bed', 'nightTable', 'bigPlant', 'sageRug', 'bedRug', 'fujiPrint', 'kanaChart', 'nightPicture', 'pegRail', 'sofaWindow', 'shelfWindow', 'bedWindow2', 'sconce1', 'sconce2', 'sconce3', 'sconce4'];
      const laid = own.every(id => state.placed[id]) && ['garland1', 'garland2', 'garland3', 'garland4'].every(id => !state.placed[id] && owns(id)) && !WARE.has('doorMat'); """ + GO_ROOM + """
      document.querySelector('.study-edit').click(); const st = () => document.querySelector('.study');
      st().querySelector('.deco[data-ware="bigPlant"]').dispatchEvent(new PointerEvent('pointerdown', { clientX: 1, clientY: 1, pointerId: 3, pointerType: 'mouse', button: 0, buttons: 1, bubbles: true }));
      st().dispatchEvent(new PointerEvent('pointerup', { clientX: 1, clientY: 1, pointerId: 3, pointerType: 'mouse', button: 0, bubbles: true }));
      const turn = !!st().querySelector('[data-act="room-edit-turn"]'); st().querySelector('[data-act="room-edit-put"]').click();
      const stored = !state.placed.bigPlant, inBox = !!st().querySelector('.tray-it[data-id="bigPlant"]'), notSold = !WARES.some(w => w.starter && document.querySelector('#view [data-ware="' + w.id + '"] .price'));
      st().querySelector('.tray-it[data-id="bigPlant"]').click(); const back = !!state.placed.bigPlant;   /* (the bed is in the bedroom since 1.3.0) */
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

def test_the_desk_and_the_window_stand_off_the_bookcase_and_an_older_room_follows(b):
    js = "(() => { " + FRESH + """ const fresh = Object.assign({}, state.placed.desk), v = state.roomV;
      const p0 = JSON.parse(JSON.stringify(state.placed)); ['garland1', 'garland2', 'garland3', 'garland4'].forEach(id => delete p0[id]);
      const old = (placed, owned) => normalizeState(Object.assign(JSON.parse(JSON.stringify(state)), { roomV: 2, placed: Object.assign({}, p0, placed), owned: owned || {} }));   /* a room saved before roomV 3 */
      const a = old({ desk: { w: 'F', x: 3.3, y: 1.85, r: 0 }, japanmap: { w: 'R', u: 6.4, v: 6.3 } }, { japanmap: { paid: 18, on: todayStr() } });
      const b2 = old({ desk: { w: 'F', x: 3.3, y: 1.85, r: 0 }, gramophone: { w: 'F', x: 5.75, y: 2.75, r: 0 } }, { gramophone: { paid: 40, on: todayStr() } });   /* (the telescope that stood here went out to the yard) */
      const c = old({ desk: { w: 'F', x: 10, y: 6, r: 0 } });
      return JSON.stringify({ fresh, v, a: { desk: a.placed.desk.x, map: a.placed.japanmap || null, lights: ['garland1', 'garland2', 'garland3', 'garland4'].every(id => a.placed[id]), v: a.roomV },
        b: b2.placed.desk.x, c: c.placed.desk.x, win: ROOM.fits(WARE.get('japanmap'), { w: 'R', u: 6.4, v: 6.3 }), gap: ROOM.fits(WARE.get('cactus'), { w: 'F', x: 1.75, y: 0.5, r: 0 }) }); })()"""
    r = json.loads(ev(b, js))
    assert r['fresh'] == {'w': 'F', 'x': 5.5, 'y': 1.85, 'r': 0} and r['v'] == 9, r   # roomV 8: the desk further off the bookcase (roomV 7: the bedroom)
    assert r['a'] == {'desk': 5.5, 'map': None, 'lights': False, 'v': 9}, r   # the desk went along; the map the window now covers went in the box; the strings came down
    assert r['b'] == 3.3 and r['c'] == 10, r   # a gramophone where the desk would go keeps it where it was; a desk moved by hand stays put
    assert r['win'] is False and r['gap'] is True, r   # the window and its curtains reach further right; a cactus fits between the bookcase and the desk

def test_the_string_of_lights_is_four_strings_that_move_and_go_in_the_box(b):
    js = "(async () => { " + FRESH + """ ['garland1', 'garland2', 'garland3', 'garland4'].forEach(id => { state.placed[id] = Object.assign({}, WARE.get(id).at); }); saveState(); """ + GO_ROOM + """ const st = () => document.querySelector('.study'), bulbs = () => st().querySelectorAll('.bulb').length;   /* (in the box from the start since roomV 8: hung where they used to hang) */
      const all = bulbs(), wires = ['garland1', 'garland2', 'garland3', 'garland4'].map(id => !!st().querySelector('svg.art [data-o="w:' + id + '"] path'));
      document.querySelector('.study-edit').click();
      const pe = (el, type, px, py) => el.dispatchEvent(new PointerEvent(type, { clientX: px, clientY: py, pointerId: 9, pointerType: 'mouse', button: 0, buttons: type === 'pointerup' ? 0 : 1, bubbles: true }));
      pe(st().querySelector('.deco[data-ware="garland2"]'), 'pointerdown', 1, 1); pe(st(), 'pointerup', 1, 1);   /* a tap picks it */
      const under = !!st().querySelector('.edit-sel.under'), clip = st().querySelector('.deco[data-ware="garland2"]').style.clipPath.startsWith('polygon');
      const d = st().querySelector('.deco[data-ware="garland2"]'), r0 = d.getBoundingClientRect(), x = r0.left + r0.width / 2, y = r0.top + r0.height / 2, v0 = state.placed.garland2.v;
      pe(d, 'pointerdown', x, y); for (let i = 1; i <= 5; i++) { pe(st(), 'pointermove', x, y + 9 * i); await new Promise(q => setTimeout(q, 20)); }   /* dragged 45 px down its wall */
      const dragging = { hidden: [...st().querySelectorAll('.bulb[data-w="garland2"]')].every(e => e.style.visibility === 'hidden'), ghost: st().querySelectorAll('.ghost ellipse').length };
      pe(st(), 'pointerup', x, y + 45); const lower = state.placed.garland2.v <= v0 - 0.5;
      st().querySelector('[data-act="room-edit-put"]').click();
      const stored = !state.placed.garland2, inBox = !!st().querySelector('.tray-it[data-id="garland2"] svg.thumb ellipse'), fewer = bulbs();
      const low = { w: 'L', u: 10, v: 10 }, ok = ROOM.fits(WARE.get('garland4'), low), tooHigh = ROOM.fits(WARE.get('garland4'), { w: 'L', u: 10, v: 11 });
      state.placed.garland4 = low; saveState(); st().querySelector('[data-act="room-edit-done"]').click();
      const moved = st().querySelectorAll('.bulb[data-w="garland4"]').length, ts = [...st().querySelectorAll('.bulb')].map(e => Number(e.dataset.t)).sort((x, y) => x - y);
      return JSON.stringify({ all, wires, dragging, lower, under, clip, stored, inBox, fewer, ok, tooHigh, moved, first: ts.slice(0, 3), last: ts[ts.length - 1] }); })()"""
    r = json.loads(ev(b, js))
    assert r['all'] == 64 and r['wires'] == [True] * 4, r   # four strings of sixteen bulbs where the one string ran
    assert r['dragging'] == {'hidden': True, 'ghost': 16} and r['lower'], r   # dragged: its own bulbs wait, the ghost shows them; let go lower down
    assert r['under'] and r['clip'] and r['stored'] and r['inBox'] and r['fewer'] == 48, r   # picked up high, its tools under it; put away with its bulbs
    assert r['ok'] and not r['tooHigh'] and r['moved'] == 16, r   # lower down the other wall, its bulbs with it
    assert r['first'] == [0, 0.02, 0.04] and r['last'] == 0.98, r   # the bulbs still hung light up in turn over the day

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
    assert r == {'opened': True, 'at': [14.7, 1.4], 'back': True}, r   # the first clear place in front of the calendar (moved right in 1.3.0)

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

def test_the_wardrobe_is_a_button_up_top_and_a_tap_on_the_hero_gets_a_reaction(b):
    js = "(async () => { " + FRESH + GO_ROOM + POINTER + """ await wait(200);
      const btn = document.querySelector('.study-tools [data-act="wardrobe"]'); if (btn) btn.click();
      const dressing = !!document.querySelector('.study.dressing .dress'); document.querySelector('[data-act="dress-cancel"]').click(); await wait(600);
      const moves = ['hop', 'wave', 'spin', 'cheer'], did = (el) => moves.filter(m => el.classList.contains(m));
      document.querySelector('.study .room .hero .fig').dispatchEvent(new MouseEvent('click', { bubbles: true }));
      const room = { modal: modalOpen(), did: did(document.querySelector('.study .room .hero')) };
      location.hash = '#/outside'; document.getElementById('view').innerHTML = ''; route(); await wait(200);
      document.querySelector('.yard .yhero .fig').dispatchEvent(new MouseEvent('click', { bubbles: true }));
      const yard = { modal: modalOpen(), did: did(document.querySelector('.yard .yhero')) };
      return JSON.stringify({ dressing, room, yard }); })()"""
    r = json.loads(ev(b, js))
    assert r['dressing'] and not r['room']['modal'] and not r['yard']['modal'], r
    assert len(r['room']['did']) == 1 and len(r['yard']['did']) == 1, r   # one of a hop, a wave, a spin or a cheer

def test_a_swipe_looks_round_the_room_and_stays_where_it_is_let_go(b):
    js = "(async () => { " + FRESH + " localStorage.removeItem('nq_hero'); localStorage.removeItem('nq_room_zoom'); " + GO_ROOM + POINTER + """ await wait(300);
      const st = document.querySelector('.study'), r = st.getBoundingClientRect(), x0 = r.left + r.width * 0.88, y0 = r.top + r.height * 0.85, before = cam();   /* clear of the hero, in the middle since 1.3.0 */
      pe(st, 'pointerdown', x0, y0, 1);
      for (let i = 1; i <= 15; i++) { pe(st, 'pointermove', x0 - 20 * i, y0, 1); await wait(30); }   /* 300 px to the left */
      await wait(200); pe(st, 'pointermove', x0 - 300, y0, 1); pe(st, 'pointerup', x0 - 300, y0, 1);   /* held still before letting go: no fling */
      await wait(700); const after = cam(), away = (id) => document.querySelector('.study [data-thing="' + id + '"]').classList.contains('away');
      return JSON.stringify({ dots: !!st.querySelector('.room-stops'), dx: Math.round(after[0] - before[0]), notebook: away('notebook'), phones: away('phones'), drawer: away('drawer') }); })()"""
    r = json.loads(ev_at(b, PHONE, js))
    assert abs(r['dx'] + 300) <= 2, r   # the room moved with the finger and stayed there (no stop to snap to)
    assert {k: r[k] for k in ('dots', 'notebook', 'phones', 'drawer')} == {'dots': False, 'notebook': False, 'phones': False, 'drawer': True}, r   # the chest's tag waits off screen, the desk's show (the chest is further on since 1.3.0, the desk since roomV 8)

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
    assert {k: v[2] for k, v in got.items() if k != 'door'} == {'bdoor': '臥房', 'shelf': '課程', 'cards': '單字', 'notebook': '今日練習 40%', 'phones': '聽一輪 0/5 分鐘', 'drawer': '錯題本', 'board': '學習分析', 'calendar': '模擬考'}, got
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

def test_the_buttons_up_top_rest_with_the_signs_and_a_first_tap_only_wakes_them(b):
    js = "(async () => { " + FRESH + GO_ROOM + """ await new Promise(q => setTimeout(q, 4500));
      const st = document.querySelector('.study'), gear = st.querySelector('.study-gear'), quiet = st.classList.contains('quiet'), faded = getComputedStyle(gear).opacity;
      const tap = () => { const r = gear.getBoundingClientRect(), o = { clientX: r.left + 10, clientY: r.top + 10, pointerId: 1, pointerType: 'touch', isPrimary: true, button: 0, bubbles: true, cancelable: true };
        gear.dispatchEvent(new PointerEvent('pointerdown', Object.assign({ buttons: 1 }, o))); gear.dispatchEvent(new PointerEvent('pointerup', Object.assign({ buttons: 0 }, o))); gear.click(); };
      tap(); const first = { modal: modalOpen(), quiet: st.classList.contains('quiet') };
      tap(); const second = modalOpen();
      return JSON.stringify({ quiet, faded, first, second }); })()"""
    r = json.loads(ev(b, js))
    assert r == {'quiet': True, 'faded': '0', 'first': {'modal': False, 'quiet': False}, 'second': True}, r

# ---- the hero's looks (test build): the dressing room zooms in on them; idling; a tap gets a reaction ----
def test_the_dressing_room_zooms_in_and_keeps_or_drops_what_was_chosen(b):
    js = "(async () => { " + FRESH + " localStorage.removeItem('nq_hero'); " + GO_ROOM + """
      const wait = (ms) => new Promise(q => setTimeout(q, ms)), act = (sel) => document.querySelector(sel).click(), st = document.querySelector('.study');
      const scale = () => new DOMMatrix(getComputedStyle(document.querySelector('.dress-hero')).transform).a, small = document.querySelector('.study .room .hero').getBoundingClientRect().width / 120;
      const tabs = () => [...document.querySelectorAll('.dress-tabs button')].map(t => t.textContent), mirror = () => DRESS.open(st, 'mirror');   /* (the full-length mirror in the bedroom opens it) */
      act('.study-tools [data-act="wardrobe"]'); await wait(650);
      const open = { dressing: st.classList.contains('dressing'), hidden: getComputedStyle(document.querySelector('.study .room .hero')).visibility, tabs: tabs(), title: document.querySelector('.dress-bar .t').textContent };
      const body = scale(); act('[data-act="dress-cancel"]'); await wait(650);
      mirror(); await wait(650); const mtabs = [tabs(), document.querySelector('.dress-bar .t').textContent], head = scale();
      act('[data-act="dress-tab"][data-tab="hair"]'); act('[data-act="dress-pick"][data-key="hairTop"][data-val="bun"]');
      const tried = { copy: document.querySelector('.dress-hero').innerHTML.includes('cy="-183"'), saved: HERO.norm(state.look).hairTop };   /* the bun on the copy, not yet kept */
      act('[data-act="dress-cancel"]'); await wait(650);
      const dropped = { hair: HERO.norm(state.look).hairTop, gone: !document.querySelector('.dress'), back: !st.classList.contains('dressing') && getComputedStyle(document.querySelector('.study .room .hero')).visibility };
      mirror(); await wait(200);
      act('[data-act="dress-tab"][data-tab="hair"]'); ['fringe:curtain', 'sides:long', 'hairBack:long'].forEach((kv) => { const [k, v] = kv.split(':'); act('[data-act="dress-pick"][data-key="' + k + '"][data-val="' + v + '"]'); }); act('[data-act="dress-pick"][data-key="hairColor"][data-val="#c9a25a"]');
      act('[data-act="dress-tab"][data-tab="features"]'); act('[data-act="dress-pick"][data-key="eyes"][data-val="big"]');
      act('[data-act="dress-pick"][data-key="beard"][data-val="goatee"]');   /* the beard is among the features */
      act('[data-act="dress-done"]'); await wait(650); act('.study-tools [data-act="wardrobe"]'); await wait(200);
      act('[data-act="dress-tab"][data-tab="clothes"]'); act('[data-act="dress-pick"][data-key="top"][data-val="#d0574b"]');
      const pressed = document.querySelector('[data-act="dress-pick"][data-key="top"][data-val="#d0574b"]').getAttribute('aria-pressed');
      act('[data-act="dress-done"]'); await wait(650);
      const lk = HERO.norm(state.look), sig = st.dataset.sig === roomSig();
      return JSON.stringify({ open, mtabs, zoom: [head > small * 2, body < head], tried, dropped, pressed, kept: [lk.fringe, lk.sides, lk.hairBack, lk.hairColor, lk.eyes, lk.beard, lk.top], sig }); })()"""
    r = json.loads(ev_at(b, PHONE, js))
    assert r['open'] == {'dressing': True, 'hidden': 'hidden', 'tabs': ['衣服', '穿戴'], 'title': '衣櫃'}, r   # the wardrobe: what is worn
    assert r['mtabs'] == [['臉型', '髮型', '五官'], '全身鏡'], r   # the mirror: the face, the hair, the features
    assert r['zoom'] == [True, True], r   # flown up to frame the head, all of them for clothes
    assert r['tried'] == {'copy': True, 'saved': 'bun'}, r   # a new hero's 丸子 (the default since 2026-11-10)
    assert r['dropped'] == {'hair': 'bun', 'gone': True, 'back': 'visible'}, r
    assert r['pressed'] == 'true' and r['kept'] == ['curtain', 'long', 'long', '#c9a25a', 'big', 'goatee', '#d0574b'] and r['sig'], r

def test_the_hero_idles_now_and_then_and_a_tap_never_gets_the_same_reaction_twice(b):
    js = "(async () => { " + FRESH + " localStorage.removeItem('nq_hero'); " + GO_ROOM + """
      const el = document.querySelector('.study .room .hero'), seen = new Set(), t0 = Date.now();
      while (Date.now() - t0 < 6500) { [...el.classList].filter(c => c.startsWith('idle-')).forEach(c => seen.add(c)); await new Promise(q => setTimeout(q, 100)); }
      const moves = ['hop', 'wave', 'spin', 'cheer'], got = [];
      for (let i = 0; i < 6; i++) { ROOM.tapHero(el); got.push(moves.find(m => el.classList.contains(m))); }
      return JSON.stringify({ idle: [...seen], got, idleOff: ![...el.classList].some(c => c.startsWith('idle-')) }); })()"""
    r = json.loads(ev(b, js))
    assert len(r['idle']) >= 1 and all(c in ('idle-look', 'idle-stretch', 'idle-wave', 'idle-sway', 'idle-bounce') for c in r['idle']), r   # within a few seconds of standing still
    assert all(g in ('hop', 'wave', 'spin', 'cheer') for g in r['got']) and all(a != b2 for a, b2 in zip(r['got'], r['got'][1:])), r
    assert r['idleOff'], r   # a tap stops what they were idly doing

# 1.2.1: hair in parts. Nothing on the head cuts the hair and no hat swaps it any more: a hat tucks away only what sits
# on top of the head (呆毛, 丸子, 雙丸子); fringes, sides, backs and tails stay. A look from before (one of the 16 hairstyles) gets the
# parts nearest it; an unknown part falls back to the new hero's
def test_a_hat_tucks_away_what_sits_on_top_and_old_looks_become_parts(b):
    js = """(() => { const heads = WARES.filter(w => w.kind === 'wear' && w.slot === 'head').map(w => w.id), tops = HERO.OPTS.hairTop.map(h => h[0]);
      const cut = heads.some(h => tops.some(t => /clip-path="url\\(#hc/.test(HERO.svg({ look: { hairTop: t }, wear: { head: h } }))));
      const tucks = {}; heads.forEach(h => { const t = tops.filter(x => HERO.tucked({ hairTop: x }, h)); if (t.length) tucks[h] = t; });
      const bun = (head) => HERO.svg({ look: { hairTop: 'bun' }, wear: head ? { head } : {} }).includes('cy="-183"');
      const tail = HERO.svg({ look: { hairTop: 'ponytail' }, wear: { head: 'beanie' } }).includes('M19.5 -170');
      const old = HERO.norm({ hair: 'bun' }), wavy = HERO.norm({ hair: 'wavy' }), odd = HERO.norm({ fringe: 'mohawk', sides: 'long', skin: '#123456', eyes: 'big' });
      state.look = 'nope'; const fixed = normalizeState(state).look;
      return JSON.stringify({ cut, tucks, bun: [bun(), bun('beanie'), bun('catears')], tail, cat: HERO.whole('cathead'), old: [old.fringe, old.sides, old.hairBack, old.hairTop], wavy: [wavy.fringe, wavy.sides, wavy.hairBack],
        odd: [odd.fringe, odd.sides, odd.skin, odd.eyes], fixed, counts: ['fringe', 'sides', 'hairBack', 'hairTop'].map(k => HERO.OPTS[k].length) }); })()"""
    r = json.loads(ev(b, js))
    assert r['cut'] is False and r['cat'] is True, r
    assert r['tucks'] == {h: ['ahoge', 'bun', 'twinbuns'] for h in ['beanie', 'strawhat', 'beret', 'gradcap', 'cathood', 'witchhat']}, r   # a hat over what sits on top
    assert r['bun'] == [True, False, True] and r['tail'], r   # tucked under a beanie, not under 貓耳髮箍; a high tail stays
    assert r['old'] == ['short', 'short', 'short', 'bun'] and r['wavy'] == ['sidepart', 'wave', 'wavy'], r   # the old 丸子頭, 長捲髮
    assert r['odd'] == ['blunt', 'long', '#f3d1b5', 'big'] and r['fixed'] == {} and r['counts'] == [20, 16, 8, 13], r   # 後面 gained 清爽 (test, 2026-11-09)

def test_a_hat_that_tucks_away_what_sits_on_top_says_so_in_the_shop_and_the_dressing_room(b):
    js = "(async () => { " + FRESH + """ state.koto.gift = 120; ['beanie', 'catears', 'cathead'].forEach(id => buyWare(WARE.get(id))); state.look = Object.assign({}, state.look, { hairTop: 'bun' }); saveState();
      const wait = (ms) => new Promise(q => setTimeout(q, ms)), act = (sel) => document.querySelector(sel).click(), note = () => { const n = document.querySelector('.dress-note'); return n ? n.textContent : null; };
      const card = (id) => { const n = document.querySelector('[data-ware="' + id + '"] .ds.swap'); return n ? n.textContent : null; };
      shopTab = 'wear'; location.hash = '#/shop'; route(); const shop = { beanie: card('beanie'), beret: card('beret'), catears: card('catears'), scarf: card('scarf') };
      state.wear = { head: 'beanie' }; saveState(); """ + GO_ROOM + """ await wait(200);
      const st = document.querySelector('.study'); DRESS.open(st, 'mirror'); await wait(200); const face = note();
      act('[data-act="dress-tab"][data-tab="hair"]'); const hair = note();
      act('[data-act="dress-pick"][data-key="hairTop"][data-val="ponytail"]'); const long = note();
      act('[data-act="dress-cancel"]'); await wait(600); act('.study-tools [data-act="wardrobe"]'); await wait(200);
      act('[data-act="dress-tab"][data-tab="wear"]'); act('[data-act="dress-wear"][data-id="cathead"]'); const wear = note();
      act('[data-act="dress-done"]'); await wait(600); DRESS.open(st, 'mirror'); await wait(200);
      act('[data-act="dress-tab"][data-tab="features"]'); const cat = note();
      act('[data-act="dress-cancel"]'); await wait(600);
      return JSON.stringify({ shop, face, hair, long, wear, cat }); })()"""
    r = json.loads(ev(b, js))
    assert r['shop'] == {'beanie': '戴著時丸子會收進帽子裡。', 'beret': '戴著時丸子會收進帽子裡。', 'catears': None, 'scarf': None}, r
    assert r['face'] is None and r['hair'] == '毛帽戴著時丸子會收進帽子裡。' and r['long'] is None, r   # a high tail stays out
    assert r['wear'] is None and r['cat'] == '戴著貓咪頭套，看不到臉和頭髮。', r

# 2026-11-07 (test build): 貓耳兜帽 in their top's colour; with 貓咪上衣 and 貓咪褲 (or the whole cat's head) it is the cat suit, which
# beckons like a 招き猫 instead of waving or bouncing and answers a tap with a にゃ; the tail sways in a group of its own
def test_the_cat_hood_makes_a_cat_suit_that_beckons_and_says_nya(b):
    js = "(async () => { " + FRESH + """ state.koto.gift = 100; ['cathood', 'cattop', 'catpants'].forEach(id => buyWare(WARE.get(id)));
      const suit = { topStyle: 'cattop', bottomStyle: 'catpants', top: '#4a4a55' }, svg = (look, head) => HERO.svg({ look, wear: { head } });
      const hood = svg(suit, 'cathood'), sets = { hood: hood.includes('data-set="cat"'), head: svg(suit, 'cathead').includes('data-set="cat"'),
        noPants: svg(Object.assign({}, suit, { bottomStyle: 'pants' }), 'cathood').includes('data-set'), ears: svg(suit, 'catears').includes('data-set') };
      const fur = /<path fill="#4a4a55" d="M-48 -98 C-54 -128/.test(hood), tails = (hood.match(/<g class="tail t[01]">/g) || []).length;
      shopTab = 'wear'; location.hash = '#/shop'; route(); const card = !!document.querySelector('[data-ware="cathood"] [data-act="ware-wear"]');
      const box = (look) => { const el = document.createElement('div'); el.className = 'hero'; el.innerHTML = svg(look, 'cathood'); document.body.appendChild(el); return el; };   /* not in #view: the hash change redraws it */
      const cat = box(suit), person = box({});
      HERO.react(cat); HERO.react(person); const nya = cat.querySelector('.nya'), said = nya ? nya.textContent : null, quiet = !person.querySelector('.nya');
      const rnd = Math.random; Math.random = () => 0.6; HERO.idle(cat, () => true, true); HERO.idle(person, () => true, true);
      await new Promise(q => setTimeout(q, 4300)); Math.random = rnd;
      const idles = [cat, person].map(el => [...el.classList].find(c => c.startsWith('idle-')) || null);
      return JSON.stringify({ sets, fur, tails, card, said, quiet, idles }); })()"""
    r = json.loads(ev(b, js))
    assert r['sets'] == {'hood': True, 'head': True, 'noPants': False, 'ears': False} and r['fur'] and r['tails'] == 4 and r['card'], r   # a tail in each of the four views (straight and turned, facing us and from behind)
    assert r['said'] in ('にゃ', 'にゃーん', 'にゃ？', 'にゃっ') and r['quiet'], r
    assert r['idles'] == ['idle-maneki', 'idle-sway'], r   # the same roll: the cat's third idle, a person's fourth

# ---- 2026-11-07 (test build): the shop's tabs, limited sales by the server's day, the yard's own wares and 擺設 ----
def test_haori_is_gone_and_its_purchase_with_it(b):
    js = "(() => { " + FRESH + """ state.koto.gift = 40; state.owned.haori = { paid: 30, on: '2026-11-07' }; state.wear = { body: 'haori', head: 'beanie' }; const before = kotoBalance();
      state = normalizeState(state); return JSON.stringify({ known: WARE.has('haori'), owned: 'haori' in state.owned, wear: state.wear, back: kotoBalance() - before, drawn: HERO.slots.includes('haori') }); })()"""
    r = json.loads(ev(b, js))
    assert r == {'known': False, 'owned': False, 'wear': {'head': 'beanie'}, 'back': 30, 'drawn': False}, r   # what was paid comes back

def test_the_shop_has_four_tabs_and_opens_on_the_last_one_used(b):
    js = "(async () => { " + FRESH + """ saveState(); location.hash = '#/shop'; route(); await new Promise(q => setTimeout(q, 300));
      const heads = () => [...document.querySelectorAll('#view .shop-h')].map(h => h.textContent), cards = () => [...document.querySelectorAll('#view .shop-item[data-ware]')].map(c => c.dataset.ware);
      const tab = (t) => document.querySelector('[data-act="shop-tab"][data-tab="' + t + '"]').click(), limited = WARES.filter(w => w.limited).map(w => w.id);
      const tabs = [...document.querySelectorAll('.shop-tabs [data-act="shop-tab"]')].map(t => t.textContent), seen = { in: heads() }; let leak = cards().some(id => limited.includes(id));
      tab('wear'); seen.wear = heads(); leak = leak || cards().some(id => limited.includes(id));
      tab('out'); seen.out = heads(); seen.outCards = cards();
      location.hash = '#/today'; route(); location.hash = '#/shop'; route();
      return JSON.stringify({ tabs, seen, leak, back: document.querySelector('.shop-tabs [aria-selected="true"]').dataset.tab, stored: localStorage.getItem('nq_shop_tab') }); })()"""
    r = json.loads(ev(b, js))
    assert r['tabs'] == ['室內', '戶外', '穿搭', '限時'], r
    assert r['seen']['in'] == ['家具擺飾', '地墊', '牆上'] and r['seen']['out'] == ['戶外擺設', '房子外觀'] and r['seen']['wear'] == ['衣服褲子', '主角穿戴'], r
    assert r['seen']['outCards'] == ['telescope', 'stonelantern', 'engawa', 'tanuki', 'pond', 'mushroomhouse', 'gingerhouse', 'stumphouse', 'teapothouse'] and not r['leak'], r   # limited wares (南瓜屋 too) only under 限時
    assert r['back'] == 'out' and r['stored'] == 'out', r

def test_limited_sales_go_by_the_servers_day_not_the_phones(b):
    js = "(async () => { " + FRESH + """ state.koto.gift = 100; saveState();
      const edges = ['2026-10-20', '2026-10-21', '2026-11-10', '2026-11-11'].map(d => saleOn('halloween', d)), real = await saleClock();   /* this server's own Date header */
      const look = () => ({ head: [...document.querySelectorAll('#view .shop-h')].map(h => h.textContent), cards: [...document.querySelectorAll('#view .shop-item[data-ware]')].map(c => c.dataset.ware), note: (document.querySelector('#view .shop-note') || {}).textContent || null, dot: !!document.querySelector('.shop-tabs .dot') });
      const at = (day) => { saleDay = { day, at: Date.now(), ask: null, failed: false }; shopTab = 'sale'; location.hash = '#/shop'; route(); return look(); };
      const on = at('2026-11-07'), last = at('2026-11-10'), off = at('2026-11-11');
      saleDay = { day: null, at: 0, ask: null, failed: true }; route(); const offline = look().note;
      saleDay = { day: '2026-12-01', at: Date.now(), ask: null, failed: false };   /* whatever the phone says, the server says December */
      let bought = null; saleCheck(WARE.get('witchhat'), () => { bought = 'yes'; }); await new Promise(q => setTimeout(q, 50));
      localStorage.setItem('nq_sale_preview', '1'); const preview = at('2026-12-01');
      return JSON.stringify({ edges, real: /^\\d{4}-\\d{2}-\\d{2}$/.test(real), on, last: last.head, off, offline, bought, preview: preview.cards }); })()"""
    r = json.loads(ev(b, js))
    assert r['edges'] == [False, True, True, False] and r['real'], r   # ten days either side of Halloween, both ends in
    assert r['on'] == {'head': ['萬聖節限定 · 賣到 11/10（還有 3 天）'], 'cards': ['witchhat', 'wizrobe', 'pumpkinhouse', 'pumpkin'], 'note': None, 'dot': True}, r
    assert r['last'] == ['萬聖節限定 · 賣到 11/10（今天最後一天）'], r
    assert r['off'] == {'head': [], 'cards': [], 'note': '現在沒有限時商品。下一檔：萬聖節 10/21–11/10', 'dot': False}, r
    assert r['offline'] == '限時商品要連上網路才看得到。' and r['bought'] is None, r
    assert r['preview'] == ['witchhat', 'wizrobe', 'pumpkinhouse', 'pumpkin'], r   # the test site can look whatever the day

def test_the_halloween_wares_are_a_hat_a_robe_and_a_pumpkin_that_glows(b):
    js = """(() => { const robe = HERO.svg({ look: { topStyle: 'wizrobe', top: '#e58fa8' } }), p = WARE.get('pumpkin');
      return JSON.stringify({ hat: HERO.tucked({ hairTop: 'bun' }, 'witchhat'), keep: HERO.tucked({ hairTop: 'none', hairBack: 'long' }, 'witchhat'), dyed: robe.includes('fill="#e58fa8"'),
        style: HERO.OPTS.topStyle.some(([v]) => v === 'wizrobe'), lamp: !!p.light && p.kind === 'floor', glow: DECOR.thumb('pumpkin').includes('#ffd36a'), sale: ['witchhat', 'wizrobe', 'pumpkin'].map(id => WARE.get(id).limited) }); })()"""
    r = json.loads(ev(b, js))
    assert r == {'hat': '丸子', 'keep': '', 'dyed': True, 'style': True, 'lamp': True, 'glow': True, 'sale': ['halloween'] * 3}, r

# the Halloween witch: far off in the yard's night sky while Halloween is on (the server's day), a tap drops her off her broom
# for 100 言靈 once a Halloween. open(theme, day): the yard drawn anew under 永夜／永晝 on that server day
WITCH_OPEN = """const wait = (ms) => new Promise(q => setTimeout(q, ms));
  const open = (theme, day) => { state.settings.theme = theme; saveState(); saleDay = { day, at: Date.now(), ask: null, failed: false };
    location.hash = '#/outside'; document.getElementById('view').innerHTML = ''; route(); return document.querySelector('.yard .sky .night .witch'); };"""

def test_the_halloween_witch_flies_far_off_in_the_yards_night_sky(b):
    js = "(async () => { " + FRESH + WITCH_OPEN + """
      const w = open('night', '2026-11-07'), id = w && w.dataset.witch, shown = !!w && w.getClientRects().length > 0;
      w.style.animationDelay = '-5s'; await wait(50);   /* mid-way over, not resting off the screen */
      const fig = () => w.querySelector('.w-fig').getBoundingClientRect(), r0 = fig(); await wait(1200); const r1 = fig();
      const hit = w.querySelector('.w-hit'), hr = hit.getBoundingClientRect();
      const out = { id, shown, size: [Math.round(r0.width), Math.round(r0.height)], moved: Math.abs(r1.left - r0.left) > 5, high: r1.bottom < innerHeight * 0.45,
        hit: getComputedStyle(hit).pointerEvents, tap: [Math.round(hr.width), Math.round(hr.height)], top: document.elementFromPoint(hr.left + hr.width / 2, hr.top + hr.height / 2) === hit };
      const day = open('day', '2026-11-07'); out.day = !!day && day.getClientRects().length > 0;
      out.edges = ['2026-10-20', '2026-10-21', '2026-11-10', '2026-11-11'].map(d => !!open('night', d));
      return JSON.stringify(out); })()"""
    r = json.loads(ev_at(b, PHONE, js))
    assert r['id'] == 'witch-2026' and r['shown'], r
    assert 16 <= r['size'][0] <= 24 and r['size'][1] <= 18, r   # far off: about 20 px across
    assert r['moved'] and r['high'], r   # flying, up in the sky
    assert r['hit'] == 'auto' and r['tap'] == [44, 44] and r['top'], r   # a finger can catch her, small as she is (nothing over her)
    assert r['day'] is False, r   # not by day
    assert r['edges'] == [False, True, True, False], r   # Halloween by the server's day, as the limited sale

def test_a_tap_on_the_witch_drops_her_off_her_broom_for_100_koto_once(b):
    js = "(async () => { " + FRESH + WITCH_OPEN + """
      const w = open('night', '2026-11-07'), bal0 = kotoBalance();
      w.querySelector('.w-hit').click();
      const out = { fall: w.classList.contains('fall'), found: Object.assign({}, state.koto.found), add: kotoBalance() - bal0 };
      w.querySelector('.w-hit').click(); out.again = kotoBalance() - bal0 - out.add;   /* a second tap while she falls */
      await wait(3400); out.gone = !document.querySelector('.yard .witch');
      out.back = !!open('night', '2026-11-07');   /* the yard drawn anew: caught is caught */
      out.kept = normalizeState(JSON.parse(JSON.stringify(state))).koto.found;
      out.junk = normalizeState({ koto: { found: [3] } }).koto.found;
      location.hash = '#/shop'; route(); document.querySelector('[data-act="witch-again"]').click();   /* the test site: once more */
      out.reset = Object.keys(state.koto.found).length === 0; out.there = !!open('night', '2026-11-07');
      state.koto.found['witch-2026'] = 100; route(); out.synced = !document.querySelector('.yard .witch');   /* caught on another device */
      out.next = !!open('night', '2027-10-25');   /* next Halloween she flies again */
      return JSON.stringify(out); })()"""
    r = json.loads(ev_at(b, PHONE, js))
    assert r['fall'] and r['found'] == {'witch-2026': 100} and r['add'] == 100 and r['again'] == 0, r
    assert r['gone'] and not r['back'], r
    assert r['kept'] == {'witch-2026': 100} and r['junk'] == {}, r
    assert r['reset'] and r['there'] and r['synced'] and r['next'], r

# her 100 言靈 seen: ten あ burst out where she slipped, then fly into the 言靈 button up top, which counts up 10 a coin; +100
# beside it at the end; the buttons stay up meanwhile. In 擺設 (the buttons put away) the pop up top says it instead
def test_the_witchs_koto_fly_from_her_into_the_koto_button_and_count_up(b):
    js = "(async () => { " + FRESH + WITCH_OPEN + """
      const w = open('night', '2026-11-07'); w.style.animationDelay = '-8s'; await wait(50);   /* on the screen, by the moon */
      const y = document.querySelector('.yard'), bal0 = kotoBalance(), num = () => Number(y.querySelector('.study-koto span').textContent);
      const wr = w.querySelector('.w-fig').getBoundingClientRect(), wc = [wr.left + wr.width / 2, wr.top + wr.height / 2];
      w.querySelector('.w-hit').click();
      const seen = [], t0 = performance.now(); let coins = null, near = null, ring = null, plus = null, pops = 0;
      while (performance.now() - t0 < 3600) {
        await wait(40);
        const cs = [...document.querySelectorAll('.koto-coin')];
        if (coins === null && performance.now() - t0 > 800 && cs.length) { coins = cs.length; near = cs.every(c => { const r = c.getBoundingClientRect(); return Math.hypot(r.left + r.width / 2 - wc[0], r.top + r.height / 2 - wc[1]) < 70; }); }
        const ri = document.querySelector('.koto-burst'); if (ri && ring === null) { const r = ri.getBoundingClientRect(); ring = Math.hypot(r.left + r.width / 2 - wc[0], r.top + r.height / 2 - wc[1]) < 12; }
        seen.push(num() - bal0); const p = document.querySelector('.koto-plus'); if (p && plus === null) plus = p.textContent;
        pops = Math.max(pops, document.querySelectorAll('.koto-pop').length);
      }
      await wait(1000);   /* 4.6 s after the tap: past the yard's 4 s rest */
      const out = { coins, near, ring, seen, plus, pops, awake: !y.classList.contains('quiet'), left: document.querySelectorAll('.koto-coin').length, final: num() - bal0 };
      state.koto.found = {}; const w2 = open('night', '2026-11-07'); document.querySelector('.yard [data-act="yard-edit"]').click();
      w2.querySelector('.w-hit').click(); await wait(800);
      out.edit = [...document.querySelectorAll('.koto-pop')].map(p => p.textContent.replace(/\\s+/g, '')).join('|'); out.editCoins = document.querySelectorAll('.koto-coin').length;
      return JSON.stringify(out); })()"""
    r = json.loads(ev_at(b, PHONE, js))
    assert r['coins'] == 10 and r['near'] and r['ring'], r   # where she slipped (the ring too), while she falls
    s = r['seen']
    assert s[0] == 0 and s[-1] == 100 and all(a <= b for a, b in zip(s, s[1:])) and all(v % 10 == 0 for v in s), s   # 10 a coin, never back
    assert len({v for v in s if 0 < v < 100}) >= 3, s   # counted up coin by coin, not in one jump
    assert r['plus'] == '+100' and r['pops'] == 0 and r['awake'] and r['left'] == 0 and r['final'] == 100, r
    assert 'あ言靈+100' in r['edit'] and r['editCoins'] == 0, r   # the button put away: the pop up top

def test_the_telescope_went_out_to_the_yard(b):
    js = "(() => { " + FRESH + """ state.owned.telescope = { paid: 45, on: '2026-11-01' }; state.placed.telescope = { w: 'F', x: 6, y: 6, r: 0 }; state.roomV = 3;
      const s = normalizeState(state); return JSON.stringify({ kind: WARE.get('telescope').kind, placed: s.placed.telescope || null, v: s.roomV, owned: !!s.owned.telescope }); })()"""
    r = json.loads(ev(b, js))
    assert r == {'kind': 'yard', 'placed': None, 'v': 9, 'owned': True}, r   # waits in the yard's box

def test_the_yard_is_arranged_like_the_room(b):
    js = "(async () => { " + FRESH + """ state.koto.gift = 200; ['pond', 'engawa', 'tanuki'].forEach(id => buyWare(WARE.get(id))); saveState();
      const wait = (ms) => new Promise(q => setTimeout(q, ms)); location.hash = '#/outside'; document.getElementById('view').innerHTML = ''; route(); await wait(300);
      const y = document.querySelector('.yard'), q = (sel) => y.querySelector(sel), ids = ['pond', 'engawa', 'tanuki'];
      q('[data-act="yard-edit"]').click(); const edit = y.classList.contains('edit'), tray = [...y.querySelectorAll('.yedit .tray-it')].map(t => t.dataset.id);
      ids.forEach(id => q('.yedit [data-act="yard-edit-take"][data-id="' + id + '"]').click());
      const spots = Object.fromEntries(ids.map(id => [id, Object.assign({}, state.placed[id])])), ok = ids.every(id => spots[id].w === 'Y' && yardFits(id, spots[id]));
      const rules = { path: yardFits('tanuki', { x: -20, y: 40 }), house: yardFits('tanuki', { x: 0, y: 194 }), mailbox: yardFits('tanuki', { x: 56, y: 150 }), over: yardFits('tanuki', { x: spots.pond.x, y: spots.pond.y }), edge: yardFits('tanuki', { x: 580, y: 60 }), wide: yardFits('tanuki', { x: -440, y: 60 }) };   /* (the far left edge is the way to the beach) */
      const pe = (el, type, x, yy) => el.dispatchEvent(new PointerEvent(type, { clientX: x, clientY: yy, pointerId: 7, pointerType: 'touch', isPrimary: true, button: 0, buttons: type === 'pointerup' ? 0 : 1, bubbles: true, cancelable: true }));
      const sky = q('.yworld').getBoundingClientRect(), scr = (p) => [sky.left + sky.width / 2 + p.x, sky.bottom - p.y], t0 = spots.tanuki, [a0, b0] = scr(t0);
      const drag = (to) => { const [a1, b1] = scr(to); pe(q('.yware[data-ware="tanuki"]'), 'pointerdown', a0, b0); pe(y, 'pointermove', a0 + 10, b0); pe(y, 'pointermove', a1, b1); const red = q('.yware[data-ware="tanuki"]').classList.contains('bad'); pe(y, 'pointerup', a1, b1); return red; };
      const red = drag(spots.pond), back = state.placed.tanuki.x === t0.x && state.placed.tanuki.y === t0.y;   /* onto the pond: red, and back it goes */
      let free = null; for (let yy = 30; yy <= 180 && !free; yy += 10) for (let x = -160; x <= 160 && !free; x += 10) if (Math.abs(x - t0.x) > 40 && yardFits('tanuki', { x, y: yy })) free = { x, y: yy };
      const green = !drag(free), moved = state.placed.tanuki; await wait(20);
      q('.yware[data-ware="engawa"]').click(); q('.ysel [data-act="yard-edit-put"]').click(); const away = !state.placed.engawa && !!q('.yedit .tray-it[data-id="engawa"]');
      q('.yedit [data-act="yard-edit-done"]').click(); const done = !y.classList.contains('edit') && !q('.yedit .edit-top');
      const order = [...y.querySelectorAll('.sky .yware')].every(w => Number(w.style.zIndex) === 300 - state.placed[w.dataset.ware].y);
      return JSON.stringify({ edit, tray, ok, rules, red, back, green, moved: moved.x === free.x && moved.y === free.y, away, done, order }); })()"""
    r = json.loads(ev_at(b, PHONE, js))
    assert r['edit'] and r['tray'] == ['engawa', 'tanuki', 'pond'] and r['ok'], r
    assert r['rules'] == {'path': False, 'house': False, 'mailbox': False, 'over': False, 'edge': False, 'wide': True}, r   # anywhere on the 1200px lawn
    assert r['red'] and r['back'] and r['green'] and r['moved'], r   # where it cannot stand it turns red and goes back
    assert r['away'] and r['done'] and r['order'], r   # drawn by how far up the lawn

def test_a_tap_on_a_yard_ware_sends_the_hero_beside_it(b):
    js = "(async () => { " + FRESH + """ buyWare(WARE.get('tanuki')); state.placed.tanuki = { w: 'Y', x: 120, y: 60 }; saveState(); localStorage.removeItem('nq_hero');
      location.hash = '#/outside'; document.getElementById('view').innerHTML = ''; route(); await new Promise(q => setTimeout(q, 300));
      const y = document.querySelector('.yard'), gx = 120 - (72 * yScale(60) / 2 + 16); yh.X = 0; yh.Y = 100; yHeroPlace(y);
      y.querySelector('.yware[data-ware="tanuki"]').click(); await new Promise(q => setTimeout(q, 1600));
      return JSON.stringify({ near: Math.abs(yh.X - gx) < 1, y: Math.round(yh.Y), flip: yh.flip, z: y.querySelector('.yhero').style.zIndex }); })()"""
    r = json.loads(ev_at(b, PHONE, js))
    assert r == {'near': True, 'y': 56, 'flip': False, 'z': '244'}, r   # on the side he came from, facing it, in front of it

def test_clothes_are_sold_put_on_in_the_dressing_room_and_dyed_in_the_heros_colours(b):
    js = "(async () => { " + FRESH + """ state.koto.gift = 50; saveState(); const msg = buyWare(WARE.get('tee'));
      const bought = { owned: owns('tee'), style: HERO.norm(state.look).topStyle, msg: msg.includes('衣服') }; """ + GO_ROOM + """
      const wait = (ms) => new Promise(q => setTimeout(q, ms)), act = (sel) => document.querySelector(sel).click();
      act('.study-edit'); const box = [...document.querySelectorAll('.tray-it')].some(t => t.dataset.id === 'tee'); act('[data-act="room-edit-done"]');   /* clothes are no furniture */
      act('.study-tools [data-act="wardrobe"]'); act('[data-act="dress-tab"][data-tab="clothes"]');
      const offered = [...document.querySelectorAll('[data-act="dress-pick"][data-key="topStyle"]')].map(b => b.dataset.val), more = (document.querySelector('.dress-more') || {}).textContent || '', sold = WARES.filter(it => it.kind === 'clothes' && !owns(it.id) && forSale(it)).length;
      act('[data-act="dress-pick"][data-key="topStyle"][data-val="tee"]'); act('[data-act="dress-pick"][data-key="top"][data-val="#3f9a8c"]'); DRESS.pick('topStyle', 'sweater');   /* not bought: not put on */
      act('[data-act="dress-done"]'); await wait(600); const worn = HERO.norm(state.look);
      shopTab = 'wear'; location.hash = '#/shop'; route(); const card = document.querySelector('[data-ware="tee"] [data-act="clothes-wear"]'), label = card.textContent, clip = document.querySelector('[data-ware="tee"] .art svg').getAttribute('style');
      card.click(); const off = HERO.norm(state.look).topStyle;
      return JSON.stringify({ bought, box, offered, more: sold >= 8 && more.includes(String(sold)), worn: [worn.topStyle, worn.top], label, clip, off }); })()"""
    r = json.loads(ev(b, js))
    assert r['bought'] == {'owned': True, 'style': 'hoodie', 'msg': True} and r['box'] is False, r   # into the wardrobe, not put on, not in the storage box
    assert r['offered'] == ['hoodie', 'tee'] and r['more'], r   # 帽T and what was bought; eight more at 古道具屋
    assert r['worn'] == ['tee', '#3f9a8c'] and r['label'] == '脫下' and r['clip'] == 'overflow:hidden' and r['off'] == 'hoodie', r

def test_a_cat_head_top_and_trousers_make_a_cat(b):
    js = """(() => { const cat = HERO.svg({ look: { face: 'round', topStyle: 'cattop', bottomStyle: 'catpants', top: '#d9a43a', bottom: '#d9a43a' }, wear: { head: 'cathead', face: 'glasses' } });
      const plain = HERO.svg({ look: { face: 'round' }, wear: { face: 'glasses' } });
      const face = 'C36 -110 21 -94 2 -94', glasses = '<circle cx="-10.5" cy="-117" r="8.6"/>';   /* their own (round) face; the glasses over its eyes */
      return JSON.stringify({ catHead: cat.includes('#e8869a'), fur: cat.includes('#d9a43a'), tail: cat.includes('C32 -32 38 -46 33 -58'), ownFace: cat.replace(/<defs>[\s\S]*?<\/defs>/, '').includes(face), glasses: cat.includes(glasses), plain: [plain.includes(face), plain.includes(glasses)], sold: ['cathead', 'cattop', 'catpants'].every(id => WARE.has(id)) }); })()"""
    r = json.loads(ev(b, js))
    assert r == {'catHead': True, 'fur': True, 'tail': True, 'ownFace': False, 'glasses': False, 'plain': [True, True], 'sold': True}, r   # the whole head takes the place of theirs (and their glasses)

# 1.2.1, the 日系 round: a small round ear only with the sides that leave it free (耳上短, the new hero's, among them);
# 麻糬臉 is the new hero's face. Test 2026-11-09 (the Q版 body): 水汪汪 and Q版眼 first among the eyes, 柔腮紅; the hair drawn flat —
# no gradient, no outline — each part in a thin stroke of its own colour, a soft shine on the crown
def test_ears_show_only_with_the_sides_that_leave_them_free_and_the_new_choices(b):
    js = """(() => { const o = HERO.OPTS, ear = (sides) => HERO.svg({ look: sides ? { sides } : {} }).includes('M-31.4 -124.6 C-35.8'), svg = HERO.svg({ look: {} });
      return JSON.stringify({ ears: [ear(), ear('short'), ear('tucked'), ear('long')], eyes: o.eyes.map(e => e[1]), mouth: o.mouth.length, cheeks: o.cheeks.map(c => c[1]), hair: o.fringe.length, face: o.face.map(f => f[0]),
        drawn: [/<linearGradient id="hg\d+"/.test(svg), /stroke-width:2px/.test(svg), /<path style="fill:#[0-9a-f]{6};stroke:#[0-9a-f]{6};stroke-width:1.6px/.test(svg), svg.includes('fill-opacity=".2"')], old: HERO.norm({ eyes: 'round', face: 'square', hair: 'tucked' }) }); })()"""
    r = json.loads(ev(b, js))
    assert r['ears'] == [True, False, True, False] and r['eyes'] == ['水汪汪', 'Q版眼', '普通', '吊眼', '垂眼', '笑眼', '大眼', '睏眼'] and r['mouth'] == 6 and r['hair'] == 20, r
    assert r['cheeks'] == ['腮紅', '柔腮紅', '害羞', '雀斑', '無'] and r['face'] == ['mochi', 'round', 'chubby', 'oval', 'pointed'] and r['drawn'] == [False, False, True, True], r
    assert [r['old'][k] for k in ('eyes', 'face', 'fringe')] == ['normal', 'chubby', 'blunt'], r   # a look saved before falls back where its choice is gone

# 髮型 is the four parts and the colour; 隨機 rolls one of the user's 48 hairstyles (HERO.STYLES), so its parts go together
def test_the_hair_tab_is_the_parts_and_random_rolls_one_of_the_48_hairstyles(b):
    js = "(async () => { " + FRESH + " localStorage.removeItem('nq_hero'); " + GO_ROOM + """
      const wait = (ms) => new Promise(q => setTimeout(q, ms)), act = (sel) => document.querySelector(sel).click();
      DRESS.open(document.querySelector('.study'), 'mirror'); await wait(200); act('[data-act="dress-tab"][data-tab="hair"]');
      const heads = [...document.querySelectorAll('.dress-sec h3')].map(h => h.textContent), rolls = [];
      for (let i = 0; i < 5; i++) { act('[data-act="dress-random"]'); rolls.push(['fringe', 'sides', 'hairBack', 'hairTop'].map(k => document.querySelector('[data-act="dress-pick"][data-key="' + k + '"][aria-pressed="true"]').dataset.val).join()); }
      act('[data-act="dress-cancel"]'); await wait(650);
      return JSON.stringify({ heads, styles: HERO.STYLES.length, rolled: rolls.every(x => HERO.STYLES.some(st => st.slice(1).join() === x)), parts: HERO.STYLES.every(st => ['fringe', 'sides', 'hairBack', 'hairTop'].every((k, j) => HERO.OPTS[k].some(o => o[0] === st[j + 1]))) }); })()"""
    r = json.loads(ev_at(b, PHONE, js))
    assert r == {'heads': ['瀏海', '兩側', '後面', '造型', '髮色'], 'styles': 48, 'rolled': True, 'parts': True}, r

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
    # at 390×844 the start is 390 / (8 × 40) = 1.21875 (the bookcase with the desk across the screen) and the whole block with the
    # sky round it (57 room units across since 1.3.0's bigger room) is 390 / (57 × 40) = 0.17105, so as far out as it goes is 0.1404
    # of the start
    assert abs(r['small'] - 0.1404) < 0.002, r

# the room as a block cut open in the sky (test build): all of it on the screen at the widest, a phone zoomed out or a wide screen as it opens
BLOCK = """const st = document.querySelector('.study'), box = st.getBoundingClientRect(), room = st.querySelector('.room').getBoundingClientRect(), vb = ROOM.kit.VB, P = ROOM.kit.P;
      const at = (x, y, z) => { const [sx, sy] = P(x, y, z); return [room.left + (sx - vb[0]) / vb[2] * room.width, room.top + (sy - vb[1]) / vb[3] * room.height]; };
      const ends = [at(-0.45, -0.45, 12), at(24, -0.45, 12), at(-0.45, 16, 12), at(-0.45, 16, -0.9), at(24, -0.45, -0.9), at(24, 16, -0.9)];   /* the walls' tops and ends, the floor's edge */
      const whole = ends.every(([x, y]) => x >= box.left - 1 && x <= box.right + 1 && y >= box.top - 1 && y <= box.bottom + 1);
      return JSON.stringify({ whole, sky: getComputedStyle(st).backgroundImage.includes('radial-gradient') && getComputedStyle(st, '::before').backgroundImage.includes('linear-gradient') });"""
def test_zoomed_all_the_way_out_the_room_is_a_block_in_the_sky(b):
    js = "(async () => { " + FRESH + " localStorage.removeItem('nq_room_zoom'); " + GO_ROOM + """ await new Promise(q => setTimeout(q, 300));
      for (let i = 0; i < 14; i++) document.dispatchEvent(new KeyboardEvent('keydown', { key: '-' })); await new Promise(q => setTimeout(q, 700));
      """ + BLOCK + " })()"
    assert json.loads(ev_at(b, PHONE, js)) == {'whole': True, 'sky': True}
    js = "(async () => { " + FRESH + " localStorage.removeItem('nq_room_zoom'); " + GO_ROOM + " await new Promise(q => setTimeout(q, 500)); " + BLOCK + " })()"
    assert json.loads(ev_at(b, DESK, js)) == {'whole': True, 'sky': True}

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
    js = "(async () => { " + FRESH + """ state.koto.gift = 20; location.hash = '#/outside'; document.getElementById('view').innerHTML = ''; route();
      const tag = document.querySelector('.yard .shop-btn .tag').textContent, hero = !!document.querySelector('.yard .yhero');
      document.querySelector('.yard .shop-btn').click(); await new Promise(q => setTimeout(q, 4500));
      return JSON.stringify({ tag, hero, hash: location.hash, fuku: !!document.querySelector('.shop-front .fuku') }); })()"""
    r = json.loads(ev(b, js))
    assert r == {'tag': '古道具屋', 'hero': True, 'hash': '#/shop', 'fuku': True}, r

# a tap on 古道具屋: the hero runs over the lawn and up the hill path, small with the distance but outlined, in at the shop's door
def test_a_tap_on_the_shop_runs_the_hero_up_the_hill_path(b):
    js = "(async () => { " + FRESH + """ state.koto.gift = 20; TOWN.EVENTS = []; TOWNEV.clock = { h: 12, day: new Date(2026, 10, 10) }; localStorage.removeItem('nq_hero'); location.hash = '#/outside'; document.getElementById('view').innerHTML = ''; route();
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

def test_the_yards_signs_rest_wake_and_say_their_names_on_a_tap(b):
    js = "(async () => { " + FRESH + """ localStorage.removeItem('nq_hero'); location.hash = '#/outside'; document.getElementById('view').innerHTML = ''; route();
      const y = document.querySelector('.yard'), tag = (sel) => y.querySelector(sel + ' .tag'), shown = (sel) => getComputedStyle(tag(sel)).opacity === '1';
      const signs = ['.enter', '.mbox', '.shop-btn'].map(sel => !!tag(sel).querySelector('svg') && tag(sel).querySelector('.tag-name').offsetWidth === 0);
      const words = ['.enter', '.shop-btn'].map(sel => tag(sel).textContent), mail = mailCount() > 0, red = y.querySelector('.mbox').classList.contains('mail');
      await new Promise(q => setTimeout(q, 4500));
      const rest = { quiet: y.classList.contains('quiet'), enter: shown('.enter'), shop: shown('.shop-btn'), mbox: shown('.mbox') };
      y.dispatchEvent(new PointerEvent('pointerdown', { clientX: 5, clientY: 5, pointerId: 1, pointerType: 'touch', bubbles: true })); const woke = !y.classList.contains('quiet');
      y.querySelector('.shop-btn').click(); const named = y.querySelector('.shop-btn').classList.contains('named') && tag('.shop-btn').querySelector('.tag-name').offsetWidth > 0;
      return JSON.stringify({ signs, words, mail: mail === red, rest, woke, named, mbox: mail }); })()"""
    r = json.loads(ev_at(b, PHONE, js))
    assert r['signs'] == [True] * 3 and r['words'] == ['進屋', '古道具屋'] and r['mail'], r   # signs, the words kept for screen readers and a tap
    assert r['rest'] == {'quiet': True, 'enter': False, 'shop': False, 'mbox': r['mbox']}, r   # resting; the mailbox's stays while letters wait
    assert r['woke'] and r['named'], r

def test_a_second_tap_on_the_shop_goes_straight_in(b):
    js = "(async () => { " + FRESH + """ state.koto.gift = 20; localStorage.removeItem('nq_hero'); location.hash = '#/outside'; document.getElementById('view').innerHTML = ''; route();   /* 古道具屋 open: 20 言靈 earned */
      await new Promise(q => setTimeout(q, 200)); const btn = document.querySelector('.yard .shop-btn');
      btn.click(); await new Promise(q => setTimeout(q, 300)); btn.click(); await new Promise(q => setTimeout(q, 700));
      return location.hash; })()"""
    assert ev_at(b, PHONE, js) == '#/shop'

# ---- 2026-11-08 (test build): prices, the window as a ware, the storage box by drag, the wide yard, its buttons, 蘑菇屋 ----
def test_prices_the_globe_and_the_umbrella_gone(b):
    js = "(() => { " + FRESH + """ state.koto.gift = 40; state.owned.globe = { paid: 25, on: '2026-11-07' }; state.placed.globe = { w: 'F', x: 6, y: 6, r: 0 }; state.placed.umbrella = { w: 'F', x: 0.45, y: 7.75, r: 0 };
      const before = kotoBalance(); state = normalizeState(state);
      return JSON.stringify({ gramophone: WARE.get('gramophone').price, beanie: WARE.get('beanie').price, tee: WARE.get('tee').price, witchhat: WARE.get('witchhat').price, gradcap: WARE.get('gradcap').price,
        known: ['globe', 'umbrella'].filter(id => WARE.has(id)), kept: ['globe', 'umbrella'].filter(id => id in state.placed || id in state.owned), back: kotoBalance() - before }); })()"""
    r = json.loads(ev(b, js))
    assert r == {'gramophone': 100, 'beanie': 30, 'tee': 24, 'witchhat': 66, 'gradcap': 150, 'known': [], 'kept': [], 'back': 25}, r   # what was paid for the globe comes back

def test_the_window_moves_along_either_wall_and_can_be_put_away(b):
    js = "(async () => { " + FRESH + """ ['sofaWindow', 'shelfWindow', 'sconce2'].forEach(id => { delete state.placed[id]; }); saveState(); """ + GO_ROOM + """ await new Promise(q => setTimeout(q, 200));   /* the one window (roomV 8 put up two more, and a lamp where it goes) */
      const look = () => { const st = document.querySelector('.study'), sky = st.querySelector('.w-sky'); return { sky: sky ? (sky.classList.contains('l') ? 'L' : 'R') : null, holes: [...st.querySelectorAll('svg.art > path[fill-rule="evenodd"]')].filter(p => (p.getAttribute('d').match(/M/g) || []).length > 1).length, drawn: !!st.querySelector('svg.art [data-o="w:window"]') }; };
      const at = Object.assign({}, state.placed.window), start = look(), win = WARE.get('window');
      const fits = { right: ROOM.fits(win, { w: 'R', u: 27, v: 7.5 }), left: ROOM.fits(win, { w: 'L', u: 11.5, v: 6.8 }), door: ROOM.fits(win, { w: 'L', u: 5, v: 6.6 }), low: ROOM.fits(win, { w: 'R', u: 27, v: 6 }) };
      state.placed.window = { w: 'L', u: 11.5, v: 6.8 }; saveState(); """ + GO_ROOM + """ const left = look();
      document.querySelector('.study-edit').click(); const dw = document.querySelector('.study .deco[data-ware="window"]'), wr = dw.getBoundingClientRect(), o = { clientX: wr.left + wr.width / 2, clientY: wr.top + wr.height / 2, pointerId: 1, pointerType: 'touch', isPrimary: true, button: 0, bubbles: true, cancelable: true };
      dw.dispatchEvent(new PointerEvent('pointerdown', Object.assign({ buttons: 1 }, o))); dw.dispatchEvent(new PointerEvent('pointerup', Object.assign({ buttons: 0 }, o))); const tools = document.querySelector('.edit-sel').textContent;
      delete state.placed.window; saveState(); """ + GO_ROOM + """ const away = look(); document.querySelector('.study-edit').click(); const box = !!document.querySelector('.tray-it[data-id="window"] svg.thumb');
      const old = normalizeState(Object.assign(JSON.parse(JSON.stringify(state)), { roomV: 4 }));   /* a room saved before the window was a ware */
      return JSON.stringify({ at, start, fits, left, tools, away, box, old: old.placed.window, v: old.roomV }); })()"""
    r = json.loads(ev(b, js))
    assert r['at'] == {'w': 'R', 'u': 5.5, 'v': 6.6} and r['start'] == {'sky': 'R', 'holes': 1, 'drawn': True}, r
    assert r['fits'] == {'right': True, 'left': True, 'door': False, 'low': False}, r   # not over the door, not into the wainscot
    assert r['left'] == {'sky': 'L', 'holes': 1, 'drawn': True} and r['tools'] == '收起', r   # the opening went along to the left wall
    assert r['away'] == {'sky': None, 'holes': 0, 'drawn': False} and r['box'], r   # put away: the wall is whole, the window waits in the box
    assert r['old'] == {'w': 'R', 'u': 5.5, 'v': 6.6} and r['v'] == 9, r

def test_a_ware_is_dragged_out_of_the_box_to_a_spot_and_back_into_the_box(b):
    js = "(async () => { " + FRESH + " state.koto.gift = 100; buyWare(WARE.get('chabudai')); saveState(); localStorage.removeItem('nq_room_zoom'); " + GO_ROOM + POINTER + """ await wait(300);
      const st = () => document.querySelector('.study'), room = () => st().querySelector('.room').getBoundingClientRect();
      const VBx = [-24.5 * 40, -12.5 * 40, 55 * 40, (12 + 27 + 1.5) * 40 + 30]   /* the room's viewBox: 30 × 24, walls 12 (1.3.0) */, scr = (x, y) => { const r = room(), sx = (x - y) * 40, sy = (x + y) * 20; return [r.left + (sx - VBx[0]) / VBx[2] * r.width, r.top + (sy - VBx[1]) / VBx[3] * r.height]; };
      st().querySelector('.study-edit').click(); await wait(100);
      for (let i = 0; i < 3; i++) document.dispatchEvent(new KeyboardEvent('keydown', { key: '-', bubbles: true }));   /* zoomed out: more floor in view */
      await wait(100); let it = st().querySelector('.tray-it[data-id="chabudai"]').getBoundingClientRect(); const [tx, ty] = [it.left + it.width / 2, it.top + it.height / 2];
      const top = st().querySelector('.edit-tray').getBoundingClientRect().top, spot = (() => { for (let x = 2; x < 16; x += 0.5) for (let y = 2; y < 12; y += 0.5) { const [a, c] = scr(x, y); if (a > 60 && a < 330 && c > 260 && c < top - 40 && ROOM.fits(WARE.get('chabudai'), { w: 'F', x, y, r: 0 })) return [x, y]; } })();   /* on screen, above the box */
      const [sx, sy] = scr(...spot);
      pe(st().querySelector('.tray-it[data-id="chabudai"]'), 'pointerdown', tx, ty, 1); pe(st(), 'pointermove', tx, ty - 20, 1); pe(st(), 'pointermove', sx, sy, 1); const ghost = st().querySelector('.ghost g').innerHTML.length > 0;
      pe(st(), 'pointerup', sx, sy, 1); await wait(50); const placed = Object.assign({}, state.placed.chabudai || {}), picked = !!st().querySelector('.deco.sel[data-ware="chabudai"]');
      const d = st().querySelector('.deco[data-ware="chabudai"]').getBoundingClientRect(), [dx, dy] = [d.left + d.width / 2, d.top + d.height * 0.7];
      it = st().querySelector('.edit-tray').getBoundingClientRect();
      pe(st().querySelector('.deco[data-ware="chabudai"]'), 'pointerdown', dx, dy, 1); pe(st(), 'pointermove', dx, dy + 20, 1); pe(st(), 'pointermove', it.left + 40, it.top + 20, 1);
      const over = { drop: st().querySelector('.edit-tray').classList.contains('drop'), hint: st().querySelector('.edit-hint').textContent };
      pe(st(), 'pointerup', it.left + 40, it.top + 20, 1); await wait(50); const stored = !state.placed.chabudai && !!st().querySelector('.tray-it[data-id="chabudai"]');
      const c = st().querySelector('.deco[data-ware="chest"]').getBoundingClientRect(); it = st().querySelector('.edit-tray').getBoundingClientRect();
      pe(st().querySelector('.deco[data-ware="chest"]'), 'pointerdown', c.left + c.width / 2, c.top + c.height / 2, 1); pe(st(), 'pointermove', c.left + c.width / 2, c.top + c.height / 2 + 20, 1); pe(st(), 'pointermove', it.left + 40, it.top + 20, 1);
      const fixed = { nodrop: st().querySelector('.edit-tray').classList.contains('no-drop'), hint: st().querySelector('.edit-hint').textContent };
      pe(st(), 'pointerup', it.left + 40, it.top + 20, 1); await wait(50);
      return JSON.stringify({ ghost, placed, spot, picked, over, stored, fixed, chest: !!state.placed.chest }); })()"""
    r = json.loads(ev_at(b, PHONE, js))
    assert r['ghost'] and r['placed'] == {'w': 'F', 'x': r['spot'][0], 'y': r['spot'][1], 'r': 0} and r['picked'], r   # let go where the finger was
    assert r['over'] == {'drop': True, 'hint': '放開就收起來'} and r['stored'], r
    assert r['fixed'] == {'nodrop': True, 'hint': '只能搬，不能收'} and r['chest'], r   # a working thing stays out

def test_the_yard_is_as_wide_as_a_computers_and_a_phone_swipes_along_it(b):
    js = "(async () => { " + FRESH + " localStorage.removeItem('nq_hero'); " + POINTER + """ location.hash = '#/outside'; document.getElementById('view').innerHTML = ''; route(); await wait(300);
      const y = document.querySelector('.yard'), w = y.querySelector('.yworld'), off = () => Math.round(new DOMMatrix(getComputedStyle(w).transform).m41), r = y.getBoundingClientRect();
      const start = { width: w.offsetWidth, off: off(), house: Math.round(y.querySelector('.house').getBoundingClientRect().left + 70 * 1.15 / 1.15 - r.width / 2) };
      pe(y, 'pointerdown', 300, 600, 1); for (let i = 1; i <= 10; i++) { pe(y, 'pointermove', 300 - 25 * i, 600, 1); await wait(30); } await wait(150); pe(y, 'pointermove', 50, 600, 1); pe(y, 'pointerup', 50, 600, 1);
      await wait(400); const swiped = off();
      pe(y, 'pointerdown', 100, 600, 1); for (let i = 1; i <= 30; i++) { pe(y, 'pointermove', 100 - 30 * i, 600, 1); await wait(16); } pe(y, 'pointerup', -800, 600, 1); await wait(900);
      const end = off();
      yCamTo(y, 0); yh.X = 0; yh.Y = 120; yHeroPlace(y); yHeroWalk(y, [520, 100]); await wait(2000);
      const walked = { x: Math.round(yh.X), off: off(), onScreen: (() => { const h = y.querySelector('.yhero').getBoundingClientRect(); return h.left > 0 && h.right < r.width; })() };
      return JSON.stringify({ start, swiped, end, walked }); })()"""
    r = json.loads(ev_at(b, PHONE, js))
    assert r['start'] == {'width': 1200, 'off': 0, 'house': r['start']['house']} and r['start']['off'] == 0, r
    assert r['swiped'] == -405, r   # a 250 px swipe left moves the view 1.8× as far (YSWIPE): all the way to the yard's end
    assert r['end'] == -405, r   # a fling stops at the yard's end: (1200 − 390) / 2
    assert r['walked']['x'] == 520 and r['walked']['onScreen'] and r['walked']['off'] < -200, r   # the camera went along with the hero

def test_a_yard_ware_comes_out_of_the_box_by_drag_and_goes_back_in(b):
    js = "(async () => { " + FRESH + " state.koto.gift = 100; buyWare(WARE.get('tanuki')); saveState(); " + POINTER + """ location.hash = '#/outside'; document.getElementById('view').innerHTML = ''; route(); await wait(300);
      const y = document.querySelector('.yard'), q = (s) => y.querySelector(s); q('[data-act="yard-edit"]').click(); await wait(50);
      const it = q('.yedit .tray-it[data-id="tanuki"]').getBoundingClientRect(), wr = () => q('.yworld').getBoundingClientRect(), scr = (p) => [wr().left + wr().width / 2 + p.x, wr().bottom - p.y];
      const [ax, ay] = [it.left + it.width / 2, it.top + it.height / 2], [bx, by] = scr({ x: 120, y: 60 });
      pe(it.width ? q('.yedit .tray-it[data-id="tanuki"]') : y, 'pointerdown', ax, ay, 1); pe(y, 'pointermove', ax, ay + 20, 1); pe(y, 'pointermove', bx, by, 1); const shown = !!q('.yware.new'); pe(y, 'pointerup', bx, by, 1); await wait(50);
      const placed = Object.assign({}, state.placed.tanuki || {});
      const [cx, cy] = scr({ x: 120, y: 75 }), tray = q('.yedit .edit-tray').getBoundingClientRect();
      pe(q('.yware[data-ware="tanuki"]'), 'pointerdown', cx, cy, 1); pe(y, 'pointermove', cx, cy - 20, 1); pe(y, 'pointermove', tray.left + 40, tray.top + 20, 1);
      const over = { drop: q('.yedit .edit-tray').classList.contains('drop'), hint: q('.yedit .edit-hint').textContent }; pe(y, 'pointerup', tray.left + 40, tray.top + 20, 1); await wait(50);
      return JSON.stringify({ shown, placed, over, stored: !state.placed.tanuki && !!q('.yedit .tray-it[data-id="tanuki"]') }); })()"""
    r = json.loads(ev_at(b, PHONE, js))
    assert r['shown'] and r['placed'] == {'w': 'Y', 'x': 120, 'y': 60}, r   # where the finger let go
    assert r['over'] == {'drop': True, 'hint': '放開就收起來'} and r['stored'], r

def test_the_yard_has_the_rooms_buttons_up_top_that_rest_and_its_own_dressing_room(b):
    js = "(async () => { " + FRESH + " state.koto.gift = 120; buyWare(WARE.get('beanie')); saveState(); " + POINTER + """ location.hash = '#/outside'; document.getElementById('view').innerHTML = ''; route(); await wait(200);
      const y = document.querySelector('.yard'), acts = [...y.querySelectorAll('.yard-tools button')].map(b => b.dataset.act), bal = y.querySelector('.study-koto span').textContent;
      await wait(4400); const quiet = y.classList.contains('quiet'), gear = y.querySelector('.study-gear'), faded = getComputedStyle(gear).opacity;
      const g = gear.getBoundingClientRect(); pe(gear, 'pointerdown', g.left + 5, g.top + 5, 1); pe(gear, 'pointerup', g.left + 5, g.top + 5, 1); gear.click(); const first = modalOpen();
      y.querySelector('[data-act="wardrobe"]').click(); await wait(100); const dressing = y.classList.contains('dressing') && !!y.querySelector('.dress .dress-hero');
      const shown = (sel) => getComputedStyle(y.querySelector('.dress .dress-hero ' + sel)).display, facing = [shown('.f-front'), shown('.f-back')];   /* facing us, not from behind */
      document.querySelector('[data-act="dress-tab"][data-tab="wear"]').click(); document.querySelector('[data-act="dress-wear"][data-id="beanie"]').click(); document.querySelector('[data-act="dress-done"]').click(); await wait(650);
      return JSON.stringify({ acts, bal, quiet, faded, first, dressing, facing, worn: state.wear.head, hat: !!y.querySelector('.yhero svg [class*="beanie"], .yhero svg .w-beanie') || y.querySelector('.yhero').innerHTML.includes('beanie'), closed: !y.classList.contains('dressing') && !y.querySelector('.dress') }); })()"""
    r = json.loads(ev_at(b, PHONE, js))
    assert r['acts'] == ['koto-shop', 'wardrobe', 'yard-edit', 'settings'] and r['bal'] == '90', r   # 言靈, 衣櫃, 擺設, 設定
    assert r['quiet'] and r['faded'] == '0' and r['first'] is False, r   # resting; a first tap only wakes them
    assert r['dressing'] and r['facing'] == ['inline', 'none'] and r['worn'] == 'beanie' and r['closed'], r

def test_the_mushroom_house_changes_the_yards_house_and_its_card_switches_back(b):
    js = "(async () => { " + FRESH + """ state.koto.gift = 2000; saveState(); location.hash = '#/shop'; shopTab = 'out'; route();
      document.querySelector('[data-act="ware-buy"][data-id="mushroomhouse"]').click(); document.querySelector('[data-act="ware-buy-ok"]').click(); await new Promise(q => setTimeout(q, 50));
      const after = { house: state.house, bal: kotoBalance(), btn: document.querySelector('[data-ware="mushroomhouse"] [data-act="house-wear"]').textContent };
      location.hash = '#/outside'; document.getElementById('view').innerHTML = ''; route(); const drawn = !!document.querySelector('.yard .house .m-cap');
      location.hash = '#/shop'; route(); document.querySelector('[data-act="house-wear"][data-id="mushroomhouse"]').click(); const back = state.house;
      const odd = normalizeState(Object.assign(JSON.parse(JSON.stringify(state)), { house: 'castle' }));   /* a later build's look: kept, the cottage drawn */
      state = odd; location.hash = '#/outside'; document.getElementById('view').innerHTML = ''; route();
      return JSON.stringify({ price: WARE.get('mushroomhouse').price, after, drawn, back, kept: odd.house, cottage: !!document.querySelector('.yard .house .chim') && !document.querySelector('.yard .house .m-cap') }); })()"""
    r = json.loads(ev(b, js))
    assert r['price'] == 2000 and r['after'] == {'house': 'mushroomhouse', 'bal': 0, 'btn': '換回小屋'} and r['drawn'], r
    assert r['back'] == '' and r['kept'] == 'castle' and r['cottage'], r

def test_a_led_hero_keeps_stepping_while_the_finger_moves(b):
    # 1.2.1: led by a finger, he caught up between two new aims (about 11 a second), stood a frame, and his walk began again from
    # its first step each time: his legs kept snapping back, so he seemed to slide
    js = "(async () => { " + FRESH + " localStorage.removeItem('nq_hero'); localStorage.setItem('nq_hero_led', '1'); " + GO_ROOM + POINTER + """ await wait(500);
      const st = document.querySelector('.study'), hero = () => st.querySelector('.room .hero'), f = hero().querySelector('.fig').getBoundingClientRect(), [x0, y0] = [f.left + f.width / 2, f.top + f.height / 2];
      const frames = []; let on = true;
      const watch = () => { const h = hero(), legs = h.getAnimations({ subtree: true }).filter(a => a.animationName === 'heroLeg'); frames.push({ pose: h.matches('.walk, .run'), anim: legs[0] || null }); if (on) requestAnimationFrame(watch); };
      pe(st, 'pointerdown', x0, y0, 1); requestAnimationFrame(watch);
      for (let i = 1; i <= 20; i++) { pe(st, 'pointermove', x0 - 6 * i, y0 + 4 * i, 1); await wait(70); }   /* a slow, steady finger */
      on = false; pe(st, 'pointerup', x0 - 120, y0 + 80, 1); await wait(50);
      const first = frames.findIndex(q => q.pose), during = frames.slice(first, frames.length - 3);
      return JSON.stringify({ frames: frames.length, first, gaps: during.filter(q => !q.pose).length, walks: new Set(during.map(q => q.anim).filter(Boolean)).size }); })()"""
    r = json.loads(ev_at(b, PHONE, js))
    assert r['first'] >= 0 and r['gaps'] == 0, r   # once he set off, he never stood still while the finger moved
    assert r['walks'] == 1, r   # one walk all along: his steps never began again

def test_walking_across_the_screen_he_does_not_keep_turning_round(b):
    # 1.2.1: going sideways on the screen his step points a hair toward the back or the front by turns, and he turned round with it
    # (from behind, facing us, from behind…), each turn showing legs that began their step again: he seemed to slide
    js = "(async () => { " + FRESH + " localStorage.setItem('nq_hero', JSON.stringify({ room: { x: 9, y: 7, back: false, flip: false, pose: '' } })); localStorage.setItem('nq_hero_led', '1'); location.reload(); })()"
    js2 = "(async () => { " + GO_ROOM + POINTER + """ await wait(500);
      const st = document.querySelector('.study'), hero = () => st.querySelector('.room .hero'), out = {};
      for (const [name, dx] of [['left', -6], ['right', 6]]) {
        const f = hero().querySelector('.fig').getBoundingClientRect(), [x0, y0] = [f.left + f.width / 2, f.top + f.height / 2], frames = []; let on = true;
        const w = () => { const h = hero(); frames.push({ pose: h.matches('.walk, .run'), back: h.classList.contains('back') }); if (on) requestAnimationFrame(w); };
        pe(st, 'pointerdown', x0, y0, 1); requestAnimationFrame(w);
        for (let i = 1; i <= 24; i++) { pe(st, 'pointermove', x0 + dx * i, y0, 1); await wait(60); }
        on = false; pe(st, 'pointerup', x0 + dx * 24, y0, 1); await wait(400);
        const m = frames.filter(q => q.pose); out[name] = { moving: m.length, turns: m.filter((q, i) => i && q.back !== m[i - 1].back).length };
      }
      return JSON.stringify(out); })()"""
    r = json.loads(b.run([("metrics", PHONE), ("nav", URL), ("wait", READY), ("eval", js), ("wait", READY), ("eval", js2)])[-1])
    assert r['left']['moving'] > 30 and r['right']['moving'] > 30, r
    assert r['left']['turns'] <= 1 and r['right']['turns'] <= 1, r   # sideways he keeps the way he faced

def test_a_long_yard_walk_or_the_climb_sets_no_css_variable_round_the_hero_each_frame(b):
    # 1.2.1: on an iPhone his legs stopped on long walks out in the yard: the camera following him set a CSS variable on the whole
    # yard every frame (and the climb one on him), and every change round him began his steps again there
    js = "(async () => { " + FRESH + " localStorage.removeItem('nq_hero'); " + POINTER + """ location.hash = '#/outside'; document.getElementById('view').innerHTML = ''; route(); await wait(500);
      const y = document.querySelector('.yard'), h = y.querySelector('.yhero'), set = CSSStyleDeclaration.prototype.setProperty, seen = [];
      CSSStyleDeclaration.prototype.setProperty = function (k, v, p) { if (String(k).startsWith('--')) seen.push(k); return set.call(this, k, v, p); };
      yHeroWalk(y, [520, 100]); await wait(1400); const walk = { calls: seen.length, cam: Math.round(ycam.x) }; seen.length = 0;
      y.querySelector('.shop-btn').click(); await wait(2600); const climb = { calls: seen.length, hash: location.hash };
      CSSStyleDeclaration.prototype.setProperty = set;
      return JSON.stringify({ walk, climb }); })()"""
    r = json.loads(ev_at(b, PHONE, js))
    assert r['walk']['cam'] > 200 and r['walk']['calls'] == 0, r   # the camera went along, no variable set
    assert r['climb']['calls'] <= 1, r   # up the hill: none per frame (the one before the shop opens is fine)

# ---- 1.3.0: the bedroom, a room of its own beyond a door in 書房's left wall ----
def test_the_bedroom_is_a_room_of_its_own_through_a_door(b):
    js = "(async () => { " + FRESH + " localStorage.removeItem('nq_hero'); " + GO_ROOM + """ const wait = (ms) => new Promise(q => setTimeout(q, ms)); await wait(300);
      const st = () => document.querySelector('#view .study'), things = () => [...st().querySelectorAll('.thing')].map(t => t.dataset.thing).sort();
      const study = { room: st().dataset.room, things: things(), sofa: !!st().querySelector('svg.art [data-o="w:sofa"]'), bed: !!st().querySelector('svg.art [data-o="w:bed"]') };
      st().querySelector('[data-thing="bdoor"]').click(); let opening = false;
      for (let i = 0; i < 40 && !opening && location.hash === '#/today'; i++) { await wait(50); opening = !!st().querySelector('.fx-door.on[data-door="bdoor"]'); }   /* he walks over, then it swings */
      await wait(2400);
      const bed = { hash: location.hash, room: st().dataset.room, things: things(), bed: !!st().querySelector('svg.art [data-o="w:bed"]'), wardrobe: !!st().querySelector('.ware-use[data-ware="wardrobe"]'), skies: st().querySelectorAll('.w-sky').length, mail: !!st().querySelector('.mail-hint') };
      const h = JSON.parse(localStorage.getItem('nq_hero')).bed;
      st().querySelector('[data-thing="sdoor"]').click(); await wait(3400);
      return JSON.stringify({ study, opening, bed, h, back: [location.hash, st().dataset.room], hero: JSON.parse(localStorage.getItem('nq_hero')).room }); })()"""
    r = json.loads(ev(b, js))
    assert r['study'] == {'room': 'study', 'things': ['bdoor', 'board', 'calendar', 'cards', 'door', 'drawer', 'notebook', 'phones', 'shelf'], 'sofa': True, 'bed': False}, r
    assert r['opening'], r   # the door swings open
    assert r['bed'] == {'hash': '#/bedroom', 'room': 'bed', 'things': ['sdoor'], 'bed': True, 'wardrobe': True, 'skies': 2, 'mail': False}, r   # two windows since roomV 8
    assert r['h']['x'] == 1.55 and abs(r['h']['y'] - 3.2) < 1e-6, r   # in just inside the bedroom's door
    assert r['back'] == ['#/today', 'study'] and r['hero']['y'] == 19.5, r   # back in 書房 by its bedroom door

def test_a_ware_moves_between_the_rooms_through_the_storage_box(b):
    js = "(() => { " + FRESH + " " + GO_ROOM + """ const st = () => document.querySelector('#view .study');
      st().querySelector('.study-edit').click(); ROOM.edit(st().querySelector('.study-edit'), 'on');
      delete state.placed.sofa; saveState();
      location.hash = '#/bedroom'; route(); ROOM.edit(st().querySelector('.study-edit'), 'take', 'sofa');
      const p = Object.assign({}, state.placed.sofa), drawn = !!st().querySelector('svg.art [data-o="w:sofa"]'), room = st().dataset.room;
      ROOM.edit(st().querySelector('.study-edit'), 'done'); location.hash = '#/today'; route();
      return JSON.stringify({ p, drawn, room, inStudy: !!st().querySelector('svg.art [data-o="w:sofa"]') }); })()"""
    r = json.loads(ev(b, js))
    assert r['room'] == 'bed' and r['drawn'] and r['p']['rm'] == 'bed', r   # taken out in the bedroom, it stands there
    assert r['inStudy'] is False, r

def test_an_older_room_moves_its_bed_into_the_bedroom(b):
    js = "(() => { " + FRESH + """ const base = JSON.parse(JSON.stringify(state)); ['sofa', 'sideTable', 'loungeRug', 'lowShelf', 'kotatsu', 'bedWindow', 'wardrobe', 'dresser', 'bedPlant'].forEach(id => delete base.placed[id]);
      const old = (placed) => normalizeState(Object.assign(JSON.parse(JSON.stringify(base)), { roomV: 5, placed: Object.assign({}, base.placed, placed) }));
      const a = old({ bed: { w: 'F', x: 18.45, y: 2.625, r: 0 }, nightTable: { w: 'F', x: 16.25, y: 0.55, r: 0 }, bedRug: { w: 'F', x: 14.9, y: 2.92, r: 0 }, nightPicture: { w: 'R', u: 18.45, v: 4.4 }, chest: { w: 'F', x: 8.45, y: 0.85, r: 0 }, board: { w: 'R', u: 8.45, v: 5.5 } });
      const b2 = old({ bed: { w: 'F', x: 6, y: 8, r: 0 }, chest: { w: 'F', x: 15, y: 9, r: 0 } });   /* moved by hand */
      const t6 = normalizeState(Object.assign(JSON.parse(JSON.stringify(base)), { roomV: 6, placed: Object.assign({}, base.placed, { bed: { w: 'F', x: 1.6, y: 14.775, r: 0 } }) }));   /* the test build's bedroom corner */
      return JSON.stringify({ v: a.roomV, bed: a.placed.bed, nt: a.placed.nightTable.rm, rug: a.placed.bedRug.rm, pic: a.placed.nightPicture, chest: a.placed.chest.x, board: a.placed.board.u,
        sofa: a.placed.sofa, wardrobe: a.placed.wardrobe, moved: [b2.placed.bed, b2.placed.chest.x], t6: t6.placed.bed.rm }); })()"""
    r = json.loads(ev(b, js))
    assert r['v'] == 9 and r['bed'] == {'w': 'F', 'x': 9.45, 'y': 2.625, 'r': 0, 'rm': 'bed'} and r['nt'] == 'bed' and r['rug'] == 'bed', r
    assert r['pic'] == {'w': 'R', 'u': 9.45, 'v': 4.4, 'rm': 'bed'} and r['chest'] == 12.5 and r['board'] == 12.5, r   # 書房's own things spread out
    assert r['sofa'] == {'w': 'F', 'x': 22.2, 'y': 0.75, 'r': 0} and r['wardrobe']['rm'] == 'bed', r   # the new things are set out
    assert r['moved'] == [{'w': 'F', 'x': 6, 'y': 8, 'r': 0}, 15], r   # what was moved by hand stays where it is
    assert r['t6'] == 'bed', r

def test_roomV_8_takes_the_lights_down_and_lays_the_room_out_again(b):
    js = "(() => { " + FRESH + """ const base = JSON.parse(JSON.stringify(state)); WARES.filter(w => w.since === 8).forEach(w => { delete base.placed[w.id]; }); base.owned.cactus = { paid: 6, on: todayStr() };
      const old = (placed) => normalizeState(Object.assign(JSON.parse(JSON.stringify(base)), { roomV: 7, placed: Object.assign({}, base.placed, placed) }));
      const g = (id) => Object.assign({}, WARE.get(id).at);
      const a = old({ garland1: g('garland1'), garland2: g('garland2'), garland3: { w: 'R', u: 19.05, v: 10 }, doorMat: { w: 'F', x: 0.7, y: 5.1, r: 0 }, desk: { w: 'F', x: 4.1, y: 1.85, r: 0 }, window: { w: 'R', u: 4.1, v: 6.6 },
        kanaChart: { w: 'R', u: 22.2, v: 5.6 }, kotatsu: { w: 'F', x: 11.5, y: 9, r: 0 }, sageRug: { w: 'F', x: 3.4, y: 12.6, r: 0 } });   /* roomV 7's places; one string moved by hand */
      const b2 = old({ desk: { w: 'F', x: 4.1, y: 1.85, r: 0 }, kotatsu: { w: 'F', x: 15, y: 15, r: 0 }, cactus: { w: 'F', x: 6.2, y: 1, r: 0 } });   /* a cactus where the desk would go; the kotatsu moved by hand */
      const pl = a.placed;
      return JSON.stringify({ v: a.roomV, lights: ['garland1', 'garland2', 'garland3'].map(id => pl[id] || null), mat: 'doorMat' in pl, desk: pl.desk.x, win: pl.window.u, kana: pl.kanaChart.u, kotatsu: [pl.kotatsu.x, pl.kotatsu.y], rug: [pl.sageRug.x, pl.sageRug.y],
        added: WARES.filter(w => w.since === 8).every(w => pl[w.id] && (pl[w.id].rm || '') === (w.at.rm || '')), kept: [b2.placed.desk.x, b2.placed.kotatsu.x] }); })()"""
    r = json.loads(ev(b, js))
    assert r['v'] == 9 and r['lights'] == [None, None, {'w': 'R', 'u': 19.05, 'v': 10}] and r['mat'] is False, r   # the strings still hung where they first hung come down; 腳踏墊 is gone
    assert r['desk'] == 5.5 and r['win'] == 5.5 and r['kana'] == 18.6 and r['kotatsu'] == [4.6, 12.6] and r['rug'] == [5.4, 6.2], r
    assert r['added'] and r['kept'] == [4.1, 15], r   # the new windows and wall lamps go up; what blocks the new place, or was moved by hand, keeps it where it is

def test_the_yards_box_holds_the_houses_bought_and_a_tap_puts_one_up(b):
    js = "(async () => { " + FRESH + """ const go = () => { location.hash = '#/outside'; document.getElementById('view').innerHTML = ''; route(); document.querySelector('.yard-edit').click(); };
      go(); const none = document.querySelectorAll('.yard .tray-house').length;
      ['stumphouse', 'teapothouse'].forEach(id => { state.owned[id] = { paid: 2000, on: todayStr() }; }); saveState(); go();
      const ids = [...document.querySelectorAll('.yard .tray-house')].map(e => e.dataset.id), pressed = () => document.querySelector('.yard .tray-house[aria-pressed="true"]').dataset.id;
      const p0 = pressed(); document.querySelector('.yard .tray-house[data-id="stumphouse"]').click();
      const up = { house: state.house, drawn: (() => { const t = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); t.innerHTML = HOUSE_ART.stumphouse; return document.querySelector('.yard .house svg').innerHTML === t.innerHTML; })(), pressed: pressed(), edit: !!document.querySelector('.yard.edit') };
      document.querySelector('.yard .tray-house[data-id=""]').click();
      return JSON.stringify({ none, ids, p0, up, back: [state.house, !!document.querySelector('.yard .house .chim')], prices: WARES.filter(w => w.kind === 'house').map(w => w.price), pumpkin: WARE.get('pumpkinhouse').limited }); })()"""
    r = json.loads(ev(b, js))
    assert r['none'] == 0 and r['ids'] == ['', 'stumphouse', 'teapothouse'] and r['p0'] == '', r   # no house bought: no houses in the box; then the cottage and the two bought
    assert r['up'] == {'house': 'stumphouse', 'drawn': True, 'pressed': 'stumphouse', 'edit': True}, r   # a tap puts it up at once, still in 擺設
    assert r['back'] == ['', True] and r['prices'] == [2000] * 5 and r['pumpkin'] == 'halloween', r

def test_the_same_things_lie_in_one_pile_in_the_box(b):
    js = "(() => { " + FRESH + """ ['sconce1', 'sconce2'].forEach(id => { delete state.placed[id]; }); saveState(); """ + GO_ROOM + """ document.querySelector('.study-edit').click(); const st = () => document.querySelector('.study');
      const tray = () => [...st().querySelectorAll('.tray-it')].map(e => [e.dataset.id, (e.querySelector('.tray-n') || {}).textContent || '', e.querySelector('span').textContent]);
      const before = tray(); st().querySelector('.tray-it[data-id="garland1"]').click(); const after = tray();
      return JSON.stringify({ before, after, out: !!state.placed.garland1 }); })()"""
    r = json.loads(ev(b, js))
    assert r['before'] == [['sconce1', '×2', '壁燈'], ['garland1', '×4', '串燈']], r   # four strings of lights, one pile
    assert r['out'] and r['after'] == [['sconce1', '×2', '壁燈'], ['garland2', '×3', '串燈']], r   # the pile gives out its first one

def test_a_tap_switches_a_lamp_and_the_room_keeps_its_place(b):
    js = "(async () => { " + FRESH + GO_ROOM + """ await new Promise(q => setTimeout(q, 300)); const st = () => document.querySelector('.study'), tf = () => st().querySelector('.room').style.transform;
      const lamps = [...st().querySelectorAll('.lamp-tap')].map(e => e.dataset.lamp).sort(), glows = () => st().querySelectorAll('.lamp-glow').length, a = tf(), g0 = glows();
      st().querySelector('.lamp-tap[data-lamp="sconce1"]').click(); await new Promise(q => setTimeout(q, 100));
      const off = { saved: state.lampsOff.sconce1 === true, wrapped: !!st().querySelector('svg.art [data-o="w:sconce1"] .lamp-off'), glows: glows(), btn: st().querySelector('.lamp-tap[data-lamp="sconce1"]').classList.contains('off'), cam: tf() === a };
      st().querySelector('.lamp-tap[data-lamp="sconce1"]').click(); await new Promise(q => setTimeout(q, 100));
      return JSON.stringify({ lamps, g0, off, on: [!!state.lampsOff.sconce1, glows()] }); })()"""
    r = json.loads(ev(b, js))
    assert r['lamps'] == ['chest', 'desk', 'sconce1', 'sconce2', 'sconce3', 'sideTable'] and r['g0'] == 6, r   # every lamp in 書房 can be tapped
    assert r['off'] == {'saved': True, 'wrapped': True, 'glows': 5, 'btn': True, 'cam': True}, r   # off: its light and glow gone, the camera stays
    assert r['on'] == [False, 6], r

def test_the_hero_sits_on_the_sofa_and_kneels_at_the_kotatsu(b):
    js = "(async () => { " + FRESH + " localStorage.removeItem('nq_hero'); " + GO_ROOM + """ const wait = (ms) => new Promise(q => setTimeout(q, ms)), st = () => document.querySelector('.study'), h = () => st().querySelector('.hero');
      const seat = async (id) => { const b = st().querySelector('.ware-use[data-ware="' + id + '"]'); b.click(); await wait(2200); b.click(); await wait(500); return [...h().classList].filter(c => ['sofa', 'kneel', 'sit'].includes(c)); };
      const sofa = await seat('sofa'), saved = JSON.parse(localStorage.getItem('nq_hero')).room.pose;
      const kneel = await seat('kotatsu');
      st().querySelector('.ware-use[data-ware="sofa"]').click(); await wait(200); const up = [...h().classList].includes('kneel');
      return JSON.stringify({ sofa, saved, kneel, up }); })()"""
    r = json.loads(ev(b, js))
    assert r == {'sofa': ['sofa'], 'saved': '', 'kneel': ['kneel'], 'up': False}, r   # seated, saved standing; off the cushion to walk on

def test_the_telescope_shows_the_stars_and_a_stone_lantern_switches(b):
    js = "(async () => { " + FRESH + """ ['telescope', 'stonelantern'].forEach(id => { state.owned[id] = { paid: 0, on: todayStr() }; }); state.placed.telescope = { w: 'Y', x: -60, y: 80 }; state.placed.stonelantern = { w: 'Y', x: 60, y: 60 }; saveState();
      location.hash = '#/outside'; document.getElementById('view').innerHTML = ''; route(); const wait = (ms) => new Promise(q => setTimeout(q, ms)), y = () => document.querySelector('.yard');
      y().querySelector('.yware[data-ware="telescope"]').click(); let open = false; for (let i = 0; i < 60 && !open; i++) { await wait(100); open = !!y().querySelector('.scope'); }
      const name = y().querySelector('.scope .sc-name').textContent, lines = y().querySelectorAll('.scope .sc-line').length;
      y().querySelector('.scope [data-sc="1"]').click(); const next = y().querySelector('.scope .sc-name').textContent;
      y().querySelector('.scope [data-sc="x"]').click(); const closed = !y().querySelector('.scope');
      y().querySelector('.yware[data-ware="stonelantern"]').click(); await wait(2500);
      return JSON.stringify({ open, name, lines, next, closed, n: SCOPE.SKIES.length, lantern: [!!state.lampsOff.stonelantern, y().querySelector('.yware[data-ware="stonelantern"]').classList.contains('off')] }); })()"""
    r = json.loads(ev(b, js))
    assert r['open'] and r['name'] == '北斗七星ほくとしちせい' and r['lines'] == 7 and r['next'] == 'オリオン座オリオンざ' and r['closed'] and r['n'] == 6, r
    assert r['lantern'] == [True, True], r   # walked over, switched off

def test_the_hero_sleeps_on_the_bed_and_waters_a_plant(b):
    js = "(async () => { " + FRESH + " localStorage.removeItem('nq_hero'); location.hash = '#/bedroom'; document.getElementById('view').innerHTML = ''; route(); " + """ const wait = (ms) => new Promise(q => setTimeout(q, ms)), st = () => document.querySelector('#view .study'), h = () => st().querySelector('.hero');
      const bed = st().querySelector('.ware-use[data-ware="bed"]'); bed.click(); await wait(2200); bed.click(); await wait(500);
      const sleep = h().classList.contains('sleep'), saved = JSON.parse(localStorage.getItem('nq_hero')).bed.pose;
      const plant = st().querySelector('.ware-use[data-ware="bedPlant"]'); plant.click(); let can = false;
      for (let i = 0; i < 80 && !can; i++) { await wait(50); can = !!st().querySelector('.watering'); }
      const joy = !!st().querySelector('svg.art [data-o="w:bedPlant"].joy'), awake = !h().classList.contains('sleep'); await wait(3200);
      return JSON.stringify({ sleep, saved, can, joy, awake, gone: !st().querySelector('.watering'), plants: WARES.filter(w => w.act === 'water').map(w => w.id).sort() }); })()"""
    r = json.loads(ev(b, js))
    assert r == {'sleep': True, 'saved': '', 'can': True, 'joy': True, 'awake': True, 'gone': True, 'plants': ['bamboo', 'bedPlant', 'bigPlant', 'bonsai', 'cactus']}, r

def test_the_full_length_mirror_stands_in_the_bedroom_and_the_wardrobe_rolls_clothes(b):
    js = "(async () => { " + FRESH + """ const old = normalizeState(Object.assign(JSON.parse(JSON.stringify(state)), { roomV: 8 }));   /* roomV 9 no longer sets it out: 小春 brings it */
      state.owned.fullMirror = { paid: 0, on: todayStr() }; state.placed.fullMirror = { w: 'F', x: 0.3, y: 11.2, r: 0, rm: 'bed' }; saveState();
      location.hash = '#/bedroom'; document.getElementById('view').innerHTML = ''; route(); const wait = (ms) => new Promise(q => setTimeout(q, ms)), st = () => document.querySelector('#view .study');
      const btn = !!st().querySelector('.ware-use[data-ware="fullMirror"]'); st().querySelector('.ware-use[data-ware="fullMirror"]').click(); let open = false;
      for (let i = 0; i < 80 && !open; i++) { await wait(50); open = !!st().querySelector('.dress.on'); }
      const tabs = [...st().querySelectorAll('.dress-tabs button')].map(t => t.textContent), feats = (st().querySelector('[data-act="dress-tab"][data-tab="features"]').click(), [...st().querySelectorAll('.dress-sec h3')].map(h => h.textContent));
      st().querySelector('[data-act="dress-cancel"]').click(); await wait(650);
      st().querySelector('.study-tools [data-act="wardrobe"]').click(); await wait(200); const lk0 = JSON.stringify(HERO.norm(state.look));
      const face = ['face', 'fringe', 'eyes', 'beard']; for (let i = 0; i < 4; i++) st().querySelector('[data-act="dress-random"]').click();
      st().querySelector('[data-act="dress-done"]').click(); await wait(650); const lk = HERO.norm(state.look), before = JSON.parse(lk0);
      return JSON.stringify({ at: old.placed.fullMirror, v: old.roomV, btn, open, tabs, feats, faceKept: face.every(k => lk[k] === before[k]), styles: [HERO.OPTS.topStyle.some(o => o[0] === lk.topStyle), lk.topStyle === 'hoodie' || owns(lk.topStyle)] }); })()"""
    r = json.loads(ev(b, js))
    assert r.get('at') is None and r['v'] == 9 and r['btn'] and r['open'], r   # 小春's present now, not the house's own
    assert r['tabs'] == ['臉型', '髮型', '五官'] and r['feats'] == ['眼睛', '眼睛顏色', '眉毛', '嘴巴', '鬍子'], r
    assert r['faceKept'] and r['styles'] == [True, True], r   # the wardrobe's dice: only clothes they have

def test_every_mirror_opens_the_mirror_and_a_low_table_or_a_cushion_is_knelt_at(b):
    js = "(async () => { " + FRESH + " localStorage.removeItem('nq_hero'); " + """ ['mirror', 'chabudai', 'zabuton'].forEach(id => { state.owned[id] = { paid: 0, on: todayStr() }; });
      state.placed.mirror = { w: 'L', u: 9.5, v: 5 }; state.placed.chabudai = { w: 'F', x: 12, y: 9, r: 0 }; state.placed.zabuton = { w: 'F', x: 10.6, y: 9, r: 0 }; saveState(); """ + GO_ROOM + """
      const wait = (ms) => new Promise(q => setTimeout(q, ms)), st = () => document.querySelector('.study'), h = () => st().querySelector('.hero');
      st().querySelector('.ware-use[data-ware="mirror"]').click(); let open = false; for (let i = 0; i < 100 && !open; i++) { await wait(50); open = !!st().querySelector('.dress.on'); }
      const title = st().querySelector('.dress-bar .t').textContent, tabs = [...st().querySelectorAll('.dress-tabs button')].map(t => t.textContent);
      st().querySelector('[data-act="dress-cancel"]').click(); await wait(650);
      const t = st().querySelector('.ware-use[data-ware="chabudai"]'); t.click(); await wait(2500); t.click(); await wait(500);
      const knelt = { pose: h().classList.contains('kneel'), turn: h().classList.contains('turn'), back: h().classList.contains('back') };
      return JSON.stringify({ open, title, tabs, knelt, mirrors: WARES.filter(w => w.act === 'mirror').map(w => w.id).sort(), kneel: WARES.filter(w => w.act === 'kneel').map(w => w.id).sort() }); })()"""
    r = json.loads(ev(b, js))
    assert r['open'] and r['title'] == '圓鏡' and r['tabs'] == ['臉型', '髮型', '五官'], r
    assert r['knelt'] == {'pose': True, 'turn': True, 'back': False}, r   # on the cushion left of the table, turned to it
    assert r['mirrors'] == ['dresser', 'fullMirror', 'mirror'] and r['kneel'] == ['chabudai', 'zabuton'], r

def test_the_gramophone_plays_a_record_and_its_records_change(b):
    js = "(async () => { " + FRESH + """ state.owned.gramophone = { paid: 0, on: todayStr() }; state.placed.gramophone = { w: 'F', x: 12, y: 9, r: 0 }; saveState(); """ + GO_ROOM + """
      const wait = (ms) => new Promise(q => setTimeout(q, ms)), st = () => document.querySelector('.study');
      await wait(600); const first = { playing: MUSIC.playing(), shown: st().classList.contains('music'), notes: !!st().querySelector('.tune.gramo'), file: MUSIC.mode() };
      st().querySelector('.ware-use[data-ware="gramophone"]').click(); let open = false; for (let i = 0; i < 100 && !open; i++) { await wait(50); open = !!document.querySelector('.rec-list'); }
      const recs = [...document.querySelectorAll('.rec')].map(e => [e.dataset.id, e.classList.contains('on')]);
      document.querySelector('.rec[data-id="yozakura"]').click();
      const put = [state.record, document.querySelector('.rec[data-id="yozakura"]').classList.contains('on'), MUSIC.playing()];
      document.querySelector('[data-act="music-stop"]').click(); const stopped = [state.musicOff, MUSIC.playing(), st().classList.contains('music')];
      document.querySelector('[data-act="music-stop"]').click(); const again = MUSIC.playing(); closeModal();
      location.hash = '#/stats'; await wait(300); const away = MUSIC.playing();
      return JSON.stringify({ first, open, recs, put, stopped, again, away, saved: [normalizeState({ record: 3, musicOff: 'x' }).record, normalizeState({}).musicOff] }); })()"""
    r = json.loads(ev(b, js))
    assert r['first'] == {'playing': True, 'shown': True, 'notes': True, 'file': 'file'} and r['open'], r   # on from the start, from its file, notes from its horn
    assert r['recs'] == [['engawa', True], ['yozakura', False]] and r['put'] == ['yozakura', True, True], r
    assert r['stopped'] == [True, False, False] and r['again'] and not r['away'], r   # stopped by hand; only in the rooms
    assert r['saved'] == ['', False], r

def test_a_tap_on_the_pond_stirs_it(b):
    js = "(async () => { " + FRESH + """ state.owned.pond = { paid: 0, on: todayStr() }; state.placed.pond = { w: 'Y', x: 60, y: 60 }; saveState();
      location.hash = '#/outside'; document.getElementById('view').innerHTML = ''; route(); const wait = (ms) => new Promise(q => setTimeout(q, ms)), y = () => document.querySelector('.yard');
      y().querySelector('.yware[data-ware="pond"]').click(); let stir = false; for (let i = 0; i < 80 && !stir; i++) { await wait(50); stir = !!y().querySelector('.yware[data-ware="pond"] .stir'); }
      const crouch = y().querySelector('.yhero').classList.contains('crouch'), parts = [y().querySelectorAll('.stir .rip').length, !!y().querySelector('.stir .leap')]; await wait(3800);
      return JSON.stringify({ stir, crouch, parts, gone: !y().querySelector('.stir') }); })()"""
    r = json.loads(ev(b, js))
    assert r == {'stir': True, 'crouch': True, 'parts': [9, True], 'gone': True}, r

def test_down_the_path_to_the_main_road_the_bus_stop_and_home_again(b):
    js = "(async () => { " + FRESH + """ localStorage.removeItem('nq_hero'); location.hash = '#/outside'; document.getElementById('view').innerHTML = ''; route(); const wait = (ms) => new Promise(q => setTimeout(q, ms)), y = () => document.querySelector('#view .yard'), h = () => y().querySelector('.yhero');
      const yard = { bus: !!y().querySelector('.busstop'), way: y().querySelector('[data-to="street"]').getAttribute('aria-label') };
      y().querySelector('[data-to="street"]').click(); for (let i = 0; i < 100 && location.hash !== '#/street'; i++) await wait(50); await wait(2500);
      const street = { hash: location.hash, place: y().dataset.place, bus: !!y().querySelector('.busstop svg'), house: !!y().querySelector('.house, .mailbox, .ywares'), edit: getComputedStyle(y().querySelector('.study-edit')).display };
      y().querySelector('.bus-btn').click(); await wait(3000); const sat = [h().classList.contains('bench'), !h().classList.contains('back')];
      y().querySelector('[data-to="yard"]').click(); const up = !h().classList.contains('bench'); for (let i = 0; i < 100 && location.hash !== '#/outside'; i++) await wait(50); await wait(300);
      const home = { hash: location.hash, place: y().dataset.place, house: !!y().querySelector('.house') }, saved = JSON.parse(localStorage.getItem('nq_hero'));
      return JSON.stringify({ yard, street, sat, up, home, both: !!(saved.yard && saved.street), keepOff: yardFits('pond', { w: 'Y', x: LANE.at(1)[0], y: 14 }) }); })()"""
    r = json.loads(ev(b, js))
    assert r['yard'] == {'bus': False, 'way': '公車站'}, r   # the yard stays quiet: only a sign at the path's end
    assert r['street'] == {'hash': '#/street', 'place': 'street', 'bus': True, 'house': False, 'edit': 'none'}, r
    assert r['sat'] == [True, True] and r['up'], r   # sat on the bench facing us; up to walk home
    assert r['home'] == {'hash': '#/outside', 'place': 'yard', 'house': True} and r['both'] and r['keepOff'] is False, r

def test_a_neighbour_knocks_brings_a_present_and_lives_on_the_beach(b):
    js = "(async () => { " + FRESH + """ TOWN.EVENTS = []; TOWNEV.clock = { h: 12, day: new Date(2026, 10, 10) }; localStorage.removeItem('nq_hero'); state.storyV = 9; state.koto.sets = { dev: 1 }; state.koto.listen = { '2026-11-08': 2 }; state.owned.gramophone = { paid: 100, on: '2026-11-01' }; saveState();
      const before = { visitor: NPC.visitor(), shop: WARES.filter(w => w.gift).map(w => w.id).sort(), mirror: owns('fullMirror') };
      """ + GO_ROOM + """ const wait = (ms) => new Promise(q => setTimeout(q, ms)), st = () => document.querySelector('#view .study');
      await wait(1200); const knock = [!!st().querySelector('.knock'), st().querySelector('[data-thing="door"]').classList.contains('knocking')];
      st().querySelector('[data-thing="door"]').click(); let talk = null; for (let i = 0; i < 100 && !talk; i++) { await wait(50); talk = document.querySelector('.talk'); }
      const guest = !!st().querySelector('.guest') && !!(document.elementFromPoint(20, 200) || document.body).closest('.talk'), name = talk.querySelector('.talk-name').textContent;   /* the talk covers the screen */
      let held = 0; for (let i = 0; i < 6 && !talk.querySelector('[data-talk="take"]'); i++) { talk.click(); await wait(30); }
      talk.click(); held = !!talk.querySelector('[data-talk="take"]');   /* the present waits for 收下 */
      talk.querySelector('[data-talk="take"]').click(); const got = [owns('fullMirror'), state.placed.fullMirror && [state.placed.fullMirror.rm || 'study', state.placed.fullMirror.y], typeof state.met.koharu === 'number'];
      while (document.querySelector('.talk')) { document.querySelector('.talk').click(); await wait(30); } await wait(300);
      const after = { visitor: NPC.visitor(), knock: !!document.querySelector('#view .knock'), doorOut: (() => { const d = st().querySelector('[data-thing="door"]'); return !d.classList.contains('knocking'); })() };
      state.met.koharu = Date.now() - NPC.gap.ms - 1000; const k0 = kotoBalance(), next = NPC.visitor();   /* a few minutes on */
      location.hash = '#/beach'; await wait(600); const npcs = [...document.querySelectorAll('#view .yard .npc')].map(e => e.dataset.npc);   /* 小春 is in town, not on the beach */
      location.hash = '#/town'; await wait(600); const bch = document.querySelector('#view .yard'), town = [bch.dataset.place, [...bch.querySelectorAll('.npc')].map(e => e.dataset.npc)];
      bch.querySelector('.town-shop[data-shop="salon"]').click(); let chat = null; for (let i = 0; i < 120 && !chat; i++) { await wait(50); chat = bch.querySelector('.talk'); }
      return JSON.stringify({ before, knock, guest, name, held, got, after, next, k0, npcs, town, chat: !!chat && chat.querySelector('.talk-name').textContent, take: !!(chat && chat.querySelector('[data-talk="take"]')) }); })()"""
    r = json.loads(ev(b, js))
    assert r['before'] == {'visitor': 'koharu', 'shop': ['fullMirror', 'gramophone'], 'mirror': False}, r   # 小春 first; presents are not sold
    assert r['knock'] == [True, True] and r['guest'] and r['name'].startswith('小春') and r['held'], r
    assert r['got'] == [True, ['study', 3.25], True], r   # the mirror by 書房's front door
    assert r['after'] == {'visitor': None, 'knock': False, 'doorOut': True} and r['next'] == 'mugi', r   # not straight after; ムギ a few minutes after 小春
    assert r['npcs'] == [] and r['town'] == ['town', ['koharu']] and r['chat'].startswith('小春') and not r['take'], r   # in her salon in town once met: a word, no present

def test_mugi_gives_back_what_a_bought_gramophone_cost(b):
    js = "(async () => { " + FRESH + """ localStorage.removeItem('nq_hero'); state.storyV = 9; state.koto.listen = { '2026-11-08': 2 }; state.met = { koharu: '2026-11-01' }; state.owned.gramophone = { paid: 100, on: '2026-11-01' }; saveState();
      """ + GO_ROOM + """ const wait = (ms) => new Promise(q => setTimeout(q, ms)), st = () => document.querySelector('#view .study'), k0 = kotoBalance();
      st().querySelector('[data-thing="door"]').click(); let talk = null; for (let i = 0; i < 100 && !talk; i++) { await wait(50); talk = document.querySelector('.talk'); }
      for (let i = 0; i < 6 && !talk.querySelector('[data-talk="take"]'); i++) { talk.click(); await wait(30); }
      talk.querySelector('[data-talk="take"]').click(); const zh = talk.querySelector('.talk-zh').textContent;
      state.koto.listen = {}; state.met = { koharu: Date.now() - 60000 }; const soon = NPC.visitor(); state.met = { koharu: Date.now() - NPC.gap.ms - 1000 }; const due = NPC.visitor();
      state.met = {}; state.koto.sets = {}; const none = NPC.visitor();
      return JSON.stringify({ back: kotoBalance() - k0, zh, placed: !!state.placed.gramophone, on: !state.musicOff, soon, due, none }); })()"""
    r = json.loads(ev(b, js))
    assert r['soon'] is None and r['due'] == 'mugi' and r['none'] is None, r   # ムギ three minutes after 小春, listening or not
    assert r['back'] == 100 and '100 言靈還你' in r['zh'] and r['placed'] and r['on'], r

def test_the_opening_tells_of_the_grandmothers_house_once(b):
    js = "(async () => { " + FRESH + """ state.storyV = 0; state.koto.sets = { dev: 1 }; saveState(); """ + GO_ROOM + """ const wait = (ms) => new Promise(q => setTimeout(q, ms));
      const st = document.querySelector('.story'), pages = []; for (let i = 0; i < 6 && document.querySelector('.story [data-page]'); i++) { pages.push(document.querySelector('.story [data-page]').dataset.page); if (document.querySelector('.story [data-story="end"]')) break; st.click(); await wait(20); }
      const letter = !!document.querySelector('.story-letter') || pages.includes('1'), knockBefore = !!document.querySelector('#view .knock');
      document.querySelector('.story [data-story="end"]').click(); await wait(500);
      const after = { seen: state.storyV, gone: !document.querySelector('.story'), knock: !!document.querySelector('#view .knock') };
      """ + GO_ROOM + """ await wait(200); const again = !!document.querySelector('.story');
      return JSON.stringify({ pages, letter, knockBefore, after, again, norm: [normalizeState({}).storyV, normalizeState({ storySeen: true }).storyV, 'storySeen' in normalizeState({ storySeen: true })] }); })()"""
    r = json.loads(ev(b, js))
    assert r['pages'] == ['0', '1', '2', '3', '4', '5'] and r['letter'] and not r['knockBefore'], r   # six pages, the letter among them; no knock under it
    assert r['after'] == {'seen': 2, 'gone': True, 'knock': True} and not r['again'] and r['norm'] == [0, 1, False], r   # once; then 小春 knocks; the old four-page one seen: this one still shows

def test_the_grandmothers_diary_opens_a_page_more_for_each_stage_passed(b):
    js = "(async () => { " + FRESH + """ state.stageTests = {}; saveState(); """ + GO_ROOM + """ const wait = (ms) => new Promise(q => setTimeout(q, ms)), st = () => document.querySelector('#view .study');
      st().querySelector('.ware-use[data-ware="lowShelf"]').click(); let d = null; for (let i = 0; i < 100 && !d; i++) { await wait(50); d = document.querySelector('.diary'); }
      const first = { page: d.querySelector('.diary-head span:last-child').textContent, ruby: !!d.querySelector('.diary-page rt'), zh: !!d.querySelector('.diary-zh') };
      d.querySelector('[data-diary="1"]').click(); const second = { locked: d.querySelector('.diary-page').classList.contains('locked'), hint: d.querySelector('.diary-lock').textContent };
      d.querySelector('[data-diary="x"]').click(); const closed = !document.querySelector('.diary');
      state.stageTests = { [STAGES[0].id]: [{ passed: true }] }; DIARY.open(); const later = document.querySelector('.diary .diary-head span:last-child').textContent; DIARY.close();
      return JSON.stringify({ first, second, closed, later, last: DIARY.readable(DIARY.PAGES.length - 1) }); })()"""
    r = json.loads(ev(b, js))
    assert r['first'] == {'page': '1 / 6', 'ruby': True, 'zh': True}, r   # the first page from the start, with furigana and 看中文
    assert r['second']['locked'] and '入門' in r['second']['hint'] and r['closed'], r   # the next blurred: what it takes
    assert r['later'] == '2 / 6' and r['last'] is False, r   # a stage passed: it opens at the page just readable; the last needs them all

def test_the_town_is_along_the_yard_to_the_right(b):
    js = "(async () => { " + FRESH + """ localStorage.removeItem('nq_hero'); location.hash = '#/outside'; document.getElementById('view').innerHTML = ''; route(); const wait = (ms) => new Promise(q => setTimeout(q, ms)), y = () => document.querySelector('#view .yard');
      const signs = [...y().querySelectorAll('.way-btn')].map(e => e.dataset.to).sort();
      y().querySelector('[data-to="town"]').click(); for (let i = 0; i < 100 && location.hash !== '#/town'; i++) await wait(50); await wait(300);
      const town = { place: y().dataset.place, shops: [...y().querySelectorAll('.town-shop')].map(e => e.dataset.shop), koharu: !!y().querySelector('.npc-koharu'), edit: getComputedStyle(y().querySelector('.study-edit')).display };
      y().querySelector('.town-shop[data-shop="bakery"]').click(); await wait(100); const shut = document.querySelector('#toast') ? document.querySelector('#toast').textContent : [...document.querySelectorAll('.toast')].map(t => t.textContent).join();
      y().querySelector('[data-to="yard"]').click(); for (let i = 0; i < 100 && location.hash !== '#/outside'; i++) await wait(50);
      return JSON.stringify({ signs, town, shut, back: location.hash }); })()"""
    r = json.loads(ev(b, js))
    assert r['signs'] == ['beach', 'street', 'town'], r
    assert r['town'] == {'place': 'town', 'shops': ['salon', 'bakery', 'shokudo', 'cafe', 'flowers', 'izakaya', 'goods'], 'koharu': False, 'edit': 'none'}, r   # 小春 only once she has come by
    assert '準備中' in r['shut'] and r['back'] == '#/outside', r

def test_an_owned_wares_label_in_the_shop_does_not_cover_the_screen(b):
    # 1.4.1 bug (the user): after buying, the shop came back dimmed and nothing could be tapped — the card's 已擁有 label wore
    # the class of the 獲得 close-up (.got: fixed over the whole screen)
    js = "(async () => { " + FRESH + """ state.koto.gift = 200; saveState(); buyWare(WARE.get('cactus'));
      location.hash = '#/shop'; document.getElementById('view').innerHTML = ''; route(); await new Promise(q => setTimeout(q, 400));
      const tabs = [...document.querySelectorAll('[data-act="shop-tab"]')]; const indoor = tabs.find(t => /室內/.test(t.textContent)); if (indoor) { indoor.click(); await new Promise(q => setTimeout(q, 300)); }
      const label = [...document.querySelectorAll('.shop-item .price')].find(p => p.textContent.includes('已擁有'));
      const top = document.elementFromPoint(innerWidth / 2, innerHeight / 2), cs = label && getComputedStyle(label);
      return JSON.stringify({ label: !!label, position: cs && cs.position, cover: !!(top && top.closest('.price')) }); })()"""
    r = json.loads(ev(b, js))
    assert r == {'label': True, 'position': 'static', 'cover': False}, r

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
