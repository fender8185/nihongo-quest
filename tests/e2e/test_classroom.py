"""2026-11-14 新手第一週 stage 3: 公民館 and its 日本語教室 — on the bus from the first day, its people there met or not, its own
events opening by the kana seen (beside the town's, not counted in m0's shares), the Chinese shown in 入門, the blackboard, かるた,
the song, the picture books, the classroom's 言靈 (10 a day), the hall shut at night."""
import json, os, subprocess, sys, time
sys.path.insert(0, os.path.dirname(__file__))
from cdp import Browser
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
PORT = 8819
URL = f"http://127.0.0.1:{PORT}/"
READY = "typeof state === 'object' && !!state.updatedAt && typeof speakScript === 'function'"

def ev(b, js, pre=()):
    return b.run([("nav", URL), ("wait", READY)] + list(pre) + [("eval", js)])[-1]

# a beginner in 入門 who has seen n kana (hiragana in order), the town's clock at 13:00 on a weekday
BEGIN = """const rec = () => ({ b: 2, due: addDays(todayStr(), 9), n: 2, ok: 2, ng: 0, s: 4, d: 5, last: addDays(todayStr(), -1) });
  const kana = (n) => { Object.keys(state.srs).filter((k) => k.startsWith('a:')).forEach((k) => delete state.srs[k]); REG.kana.slice(0, n).forEach((x) => { state.srs[x.key] = rec(); }); };
  state.storyV = 99; state.startChosen = true; state.stage = 'pre'; state.kanaKnown = false; state.srs = {}; state.dailyLogs = {};
  state.town = { done: {}, seen: {}, stops: {}, talks: {} }; state.koto.found = {}; localStorage.removeItem('nq_class'); localStorage.removeItem('nq_wake');
  TOWNEV.clock = { h: 13, day: new Date(2026, 10, 10) }; saveState(); DAILY_CACHE = null;
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));"""

def test_the_hall_is_on_the_bus_from_the_first_day_and_its_rooms_draw(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + """
      const open = busOpen('kominkan'), shut = busOpen('station');
      location.hash = '#/kominkan'; route(); await wait(300); const hall = { land: Boolean(document.querySelector('.kominkan-land')), door: Boolean(document.querySelector('[data-to="kyoshitsu"]')), pole: Boolean(document.querySelector('.bus-btn')) };
      location.hash = '#/kyoshitsu'; route(); await wait(300); const room = { indoor: Boolean(document.querySelector('.yard.indoor')), out: (document.querySelector('.way-btn[data-to]') || {}).dataset.to,
        uses: [...document.querySelectorAll('.use-btn')].map((u) => u.dataset.use).sort(), chalk: document.querySelector('[data-fx="board"]').textContent.includes('ひらがな') };
      return JSON.stringify({ open, shut, hall, room, hop: TOWNEV.hop('yard', 'kyoshitsu'), name: TOWNEV.PLACE_NAME.kyoshitsu }); })()"""))
    assert r['open'] and not r['shut'], r
    assert r['hall'] == {'land': True, 'door': True, 'pole': True}, r
    assert r['room']['indoor'] and r['room']['out'] == 'kominkan' and r['room']['chalk'], r
    assert {'board', 'karuta', 'radio', 'books', 'clock', 'table0'} <= set(r['room']['uses']), r
    assert r['hop'] == 'street' and r['name'] == '日本語教室', r

def test_the_blackboard_has_the_kana_seen_in_chalk(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + """ kana(7);
      location.hash = '#/kyoshitsu'; route(); await wait(200); const t = document.querySelector('[data-fx="board"]').textContent;
      return JSON.stringify({ a: t.includes('あ'), ka: t.includes('か'), ki: t.includes('き'), sa: t.includes('さ') }); })()"""))
    assert r == {'a': True, 'ka': True, 'ki': True, 'sa': False}, r   # あ行 + か き

def test_classroom_events_open_by_the_kana_seen_on_their_own_track(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + """
      const due = () => TOWNEV.due().map((e) => e.id).filter((id) => /^k\d/.test(id));
      const out = { fresh: due(), wait: (TOWNEV.classWaiting(17, TOWNEV.today(), 'kyoshitsu') || { ev: {} }).ev.id };
      state.town.done.k1 = todayStr(); out.k2at4 = (kana(4), due()); out.k2at5 = (kana(5), due());
      kana(10); out.town = (TOWNEV.waiting(13, TOWNEV.today()) || { ev: {} }).ev.id;   // the town's own (健太 at 13:00) waits beside the classroom's
      out.cls = (TOWNEV.classWaiting(17, TOWNEV.today(), 'kyoshitsu') || { ev: {} }).ev.id; out.street = (TOWNEV.classWaiting(13, TOWNEV.today(), 'chinatown') || { ev: {} }).ev.id;   // 中華街's own waits beside it
      out.m02 = TOWNEV.opened(TOWN.EVENTS.find((e) => e.id === 'm0-2'));   // m0's second event still needs 第 0 週 grammar: kana events are not in its share
      state.kanaKnown = true; out.known = TOWN.EVENTS.filter((e) => e.kana !== undefined).every((e) => TOWNEV.opened(e));
      return JSON.stringify(out); })()"""))
    assert r['fresh'] == ['k1'] and r['wait'] == 'k1', r
    assert r['k2at4'] == [] and r['k2at5'] == ['k2'], r
    assert r['town'] == 'm0-1' and r['cls'] == 'k2' and r['street'] == 'cn1' and r['m02'] is False and r['known'], r

def test_the_classroom_shows_its_people_unmet_and_its_host_marked(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + """
      TOWNEV.clock = { h: 10, day: new Date(2026, 10, 10) }; location.hash = '#/kyoshitsu'; route(); await wait(200);
      const ppl = [...document.querySelectorAll('#view .npc')].map((n) => n.dataset.npc + (n.classList.contains('ev-host') ? '!' : '')).sort();
      TOWNEV.clock = { h: 20, day: new Date(2026, 10, 10) }; route(); await wait(200);
      const night = [...document.querySelectorAll('#view .npc')].map((n) => n.dataset.npc).sort();
      return JSON.stringify({ ppl, night }); })()"""))
    assert r['ppl'] == ['chen!', 'hori', 'maria'], r   # 10:00: 陳 (his event waiting), 堀先生 (mornings) and マリア; 陳 is at 中華街 11–15
    assert r['night'] == ['chen', 'hori', 'lin', 'maria'], r   # the evening class: 林 teaching, everyone in (陳's event waits while the town's 健太 does not)

def test_the_first_classroom_event_plays_with_the_chinese_shown_in_nyumon(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + """
      TOWNEV.clock = { h: 17, day: new Date(2026, 10, 10) }; location.hash = '#/kyoshitsu'; route(); await wait(200);
      document.querySelector('#view .npc-chen').click(); for (let i = 0; i < 60 && !document.querySelector('.talk-card'); i++) await wait(100);
      const zhShown = !document.querySelector('.talk-zh.hide') && !document.querySelector('.zh-btn');
      for (let i = 0; i < 40 && document.querySelector('.talk'); i++) {
        const pick = [...document.querySelectorAll('.talk-opt')].find((o) => o.textContent.includes('チェンさん') && o.textContent.includes('はじめまして'));
        (pick ? pick.querySelector('.talk-pick') : document.querySelector('.talk-card')).click(); await wait(60);
      }
      const done = Boolean(state.town.done.k1), koto = state.koto.found['ev-k1'];
      state.stage = 'main'; TALK.open(document.body, 'chen', [['はい。', '是。']]); const folded = Boolean(document.querySelector('.talk-zh.hide')); TALK.close();
      return JSON.stringify({ zhShown, done, koto, folded }); })()"""))
    assert r == {'zhShown': True, 'done': True, 'koto': 10, 'folded': True}, r

def test_lin_greets_one_she_knows_from_the_classroom(b):
    r = json.loads(ev(b, "(() => { " + BEGIN + """
      const m04 = TOWN.EVENTS.find((e) => e.id === 'm0-4'), k4 = TOWN.EVENTS.find((e) => e.id === 'k4');
      const plain = TOWNEV.linesOf(m04)[1][1]; state.town.done.k4 = todayStr(); const known = TOWNEV.linesOf(m04);
      delete state.town.done.k4; state.town.done['m0-4'] = todayStr(); const k4known = TOWNEV.linesOf(k4)[1][2];
      return JSON.stringify({ plain: plain.includes('台湾'), known: known[1][2].includes('教室的同學') && !known.some((l) => Array.isArray(l) && l[1].includes('台湾|たいわん}の')), k4: k4known.includes('原來你也來教室了') }); })()"""))
    assert r == {'plain': True, 'known': True, 'k4': True}, r

def test_karuta_needs_five_kana_and_scores_the_card_taken(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + """ kana(4);
      const y = () => document.querySelector('.yard'); location.hash = '#/kyoshitsu'; route(); await wait(100);
      CLASS.karuta(y()); const few = Boolean(document.querySelector('.cls-note')); CLASS.close();
      kana(12); CLASS.karuta(y()); const cards = [...document.querySelectorAll('.kr-card')].map((c) => c.dataset.card);
      return JSON.stringify({ few, n: cards.length, seenOnly: cards.every((c) => state.srs['a:' + c]), open: CLASS.on() }); })()"""))
    assert r == {'few': True, 'n': 8, 'seenOnly': True, 'open': True}, r

def test_a_karuta_game_plays_to_its_end_and_a_win_gives_three(b):
    # the rivals made slow (never in time): the hero takes every card read, wins 8–0, +3 言靈 (the classroom's, play-<day>)
    r = json.loads(ev(b, "(async () => { " + BEGIN + """ kana(12);
      location.hash = '#/kyoshitsu'; route(); await wait(100); const spoken = []; window.speak = (t) => { spoken.push(t); return Promise.resolve(); };
      CLASS.karuta(document.querySelector('.yard'));
      for (let round = 0; round < 8; round++) {
        for (let i = 0; i < 40 && spoken.length <= round; i++) await wait(50);
        const c = spoken[round]; document.querySelector(`.kr-card[data-card="${c}"]`).click();
        if (round === 0) { const t = document.querySelector('.kr-card.kr-got'), r = t && t.getBoundingClientRect(); window.__taken = { pos: t && getComputedStyle(t).position, small: Boolean(r) && r.width < innerWidth / 3, got: Boolean(document.querySelector('.cls .got')) }; }
        for (let i = 0; i < 60 && !document.querySelector('.kr-end') && spoken.length <= round + 1; i++) await wait(50);
      }
      for (let i = 0; i < 60 && !document.querySelector('.kr-end'); i++) await wait(50);
      const end = (document.querySelector('.kr-result') || {}).textContent || '';
      return JSON.stringify({ end, koto: state.koto.found['play-' + todayStr()], taken: window.__taken }); })()"""))
    assert '你贏了' in r['end'] and '你 8' in r['end'] and r['koto'] == 3, r
    assert r['taken'] == {'pos': 'static', 'small': True, 'got': False}, r   # 2026-11-14 the user: a taken card filled the screen (it wore .got, the 獲得 close-up's class)

def test_the_classroom_gives_at_most_ten_a_day(b):
    r = json.loads(ev(b, "(() => { " + BEGIN + """
      const got = [CLASS.playKoto(3), CLASS.playKoto(3), CLASS.playKoto(3), CLASS.playKoto(3), CLASS.playKoto(3)];
      return JSON.stringify({ got, day: state.koto.found['play-' + todayStr()] }); })()"""))
    assert r == {'got': [3, 3, 3, 1, 0], 'day': 10}, r

def test_the_board_the_song_and_a_picture_book(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + """ kana(10);
      location.hash = '#/kyoshitsu'; route(); await wait(100); const spoken = []; window.speak = (t) => { spoken.push(t); return Promise.resolve(); };
      CLASS.board(document.querySelector('.yard')); const lit = [...document.querySelectorAll('.cb-k[data-say]')].map((k) => k.dataset.say);
      document.querySelector('[data-script="kata"]').click(); const kata = document.querySelectorAll('.cb-k[data-say]').length;
      const boardKoto = state.koto.found['play-' + todayStr()]; CLASS.close();
      const plan = CLASS.songPlan([0, 1]), beat = 60 / 112, bar = 4 * beat;
      const sung = plan.said.map((x) => x[3]).join(''), on = plan.said.map((x) => +(x[0] / beat).toFixed(2)).join(','), parts = plan.parts.map((p) => p.map((v) => +(v / bar).toFixed(2)));
      window.engineBlob = () => Promise.resolve(null); CLASS.song(); for (let i = 0; i < 60 && document.querySelector('.sg-note').textContent; i++) await wait(50);
      await wait(2600); const litNow = (document.querySelector('.sg-k.on') || {}).textContent || '', playing = document.querySelector('[data-fx="radio"]').classList.contains('playing'); CLASS.close();
      CLASS.close(); spoken.length = 0; CLASS.book(); const word = (document.querySelector('.bk-word') || {}).textContent || '';
      const readable = [...word].every((c) => state.srs['a:' + c]); CLASS.close();
      return JSON.stringify({ lit: lit.length, kata, boardKoto, sung, on, parts, litK: litNow.charAt(0), playing, readable, said: CLASS.clockSay()[0] }); })()"""))
    assert r['lit'] == 10 and r['kata'] == 0 and r['boardKoto'] == 1, r
    assert r['sung'] == 'あいうえおかきくけこ' and r['on'] == '4,5,6,7,8,12,13,14,15,16', r   # the rows learned, a kana a beat after the bar counted in
    assert r['parts'] == [[0, 0, 1], [1, 1, 2], [3, 3, 2], [5, 23, 1.56]] and r['litK'] == 'あ' and r['playing'], r   # count-in, あ's bars, か's, the end
    assert r['readable'] and r['said'].startswith('いま、ごご いちじ'), r   # 13:00 on the town's clock: ごご いちじ

def test_the_hall_is_shut_at_night(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + """
      TOWNEV.clock = { h: 23, day: new Date(2026, 10, 10) }; location.hash = '#/kominkan'; route(); await wait(200);
      const sign = document.querySelector('[data-fx="kdoor"]').textContent.includes('閉館');
      ACTIONS['go-place'](document.querySelector('[data-to="kyoshitsu"]')); await wait(300);
      return JSON.stringify({ sign, still: location.hash }); })()"""))
    assert r == {'sign': True, 'still': '#/kominkan'}, r

def test_the_generator_has_the_classroom_lines(b):
    r = json.loads(ev(b, """(() => { const ls = talkLines(); return JSON.stringify({ chen: ls.some(([w, l]) => w === 'chen' && l.includes('チェンです')), karuta: ls.some(([w, l]) => w === 'chen' && l.includes('かるた おう')),
      hori: ls.some(([w]) => w === 'hori'), maria: ls.some(([w, l]) => w === 'maria' && l === 'サンバ！') }); })()"""))
    assert r == {'chen': True, 'karuta': True, 'hori': True, 'maria': True}, r

# ---- 寫寫看 (stage 5): KanjiVG's strokes, written one at a time ----
def test_every_kana_has_its_strokes_in_order(b):
    r = json.loads(ev(b, """JSON.stringify({ all: REG.kana.every((x) => WRITE.has(x.ch)), n: Object.keys(KANA_STROKES).length,
      counts: ['あ', 'い', 'か', 'き', 'ぬ', 'ア', 'カ', 'キ', 'ン', 'ぱ', 'ガ'].map((c) => KANA_STROKES[c].length) })"""))
    assert r == {'all': True, 'n': 142, 'counts': [3, 2, 3, 4, 2, 2, 2, 3, 2, 4, 4]}, r

def test_writing_a_kana_stroke_by_stroke(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + """ window.speak = () => Promise.resolve();
      const say = () => document.querySelector('.wr-say').textContent;
      WRITE.open('あ'); let S = WRITE.state(); const out = {};
      WRITE.stroke(S.model[0].pts.slice().reverse()); out.back = say(); WRITE.stroke(S.model[2].pts); out.later = say(); WRITE.stroke([[5, 100], [10, 95], [12, 98]]); out.no = say();
      out.i0 = WRITE.state().i; await wait(50); out.shown = Boolean(document.querySelector('.wr-show'));   // three misses: its stroke drawn for them
      WRITE.stroke(S.model[0].pts); out.i1 = WRITE.state().i; WRITE.stroke(S.model[1].pts.map(([x, y]) => [x + 3, y - 2])); out.i2 = WRITE.state().i;   // near enough
      WRITE.stroke(S.model[2].pts); out.done = say(); out.hana = Boolean(document.querySelector('.wr-hana')); out.koto = state.koto.found['play-' + todayStr()];
      CLASS.close(); WRITE.open('あ'); S = WRITE.state(); S.model.forEach((m) => WRITE.stroke(m.pts)); out.clean = Boolean(document.querySelector('.wr-hana')); out.again = state.koto.found['play-' + todayStr()]; CLASS.close();
      return JSON.stringify(out); })()"""))
    assert '方向反了' in r['back'] and '第 3 筆' in r['later'] and '先寫第 1 筆' in r['later'] and '第 1 筆是這樣寫的' in r['no'] and r['i0'] == 0 and r['shown'], r
    assert (r['i1'], r['i2']) == (1, 2) and '寫好了' in r['done'] and not r['hana'] and r['koto'] == 1, r
    assert r['clean'] and r['again'] == 1, r   # no misses: a はなまる; the same kana again today gives nothing more

def test_the_board_and_a_new_kana_card_open_the_pad(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + """ REG.kana.slice(0, 7).forEach((x) => { state.srs[x.key] = rec(); }); window.speak = () => Promise.resolve();
      location.hash = '#/kyoshitsu'; route(); await wait(100); CLASS.board(document.querySelector('.yard'));
      document.querySelector('[data-write]').click(); const first = WRITE.state().ch, list = WRITE.state().list.join('');
      document.querySelector('[data-w="prev"]').click(); const prev = WRITE.state().ch; CLASS.close();
      const it = REG.byKey.get('a:さ'); delete state.srs[it.key]; startSession('items', { items: [it, REG.byKey.get('a:し')] }); renderPractice();
      document.querySelector('[data-act="kana-write"]').click(); const card = WRITE.state().ch; CLASS.close(); exitPractice && exitPractice();
      openSettings('look'); const credit = document.body.textContent.includes('KanjiVG'); closeModal(true);
      return JSON.stringify({ first, list, prev, card, credit }); })()"""))
    assert r['list'] == 'あいうえおかき' and r['first'] == 'き' and r['prev'] == 'か' and r['card'] == 'さ' and r['credit'], r

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
