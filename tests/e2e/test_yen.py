"""test build (2026-11-13): 円 spent (YEN) — a thing with a menu (PLACE_USE buy → TOWN.MENU) opens it in Japanese, the prices
read out above them; bought, the 円 go (state.purse.spent, this device's sum), the hero orders it in Japanese and the keeper says the
price (a machine just takes the coins), then he has it (sat down to it in the 食堂, a can down the chute, into the bath); the first
of each is stamped into 美食手帳 (a tab of 町の手帳). No 円 yet: the menu says how to come by some."""
import json, os, subprocess, sys, time
sys.path.insert(0, os.path.dirname(__file__))
from cdp import Browser
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
PORT = 8818
URL = f"http://127.0.0.1:{PORT}/"
READY = "typeof state === 'object' && !!state.updatedAt && typeof speakScript === 'function'"

def ev(b, js):
    return b.run([("nav", URL), ("wait", READY), ("eval", js)], timeout=90)[-1]

# a main-course account at 12 noon (the 食堂 and the bakery open), a trip done for 5,000 円 (or none: yen = 0); motion reduced
def fresh(yen):
    return f"""state.stage = 'main'; state.kanaKnown = true; state.introSeen = true; state.storyV = 9; state.startChosen = true; state.currentUnit = 'm2';
  state.met = {{ koharu: 1, mugi: 1 }}; state.town = {{ done: {{}}, seen: {{}}, stops: {{ station: 1, sento: 1, shrine: 1, castle: 1 }}, talks: {{}} }}; TOWN.EVENTS = [];
  state.cruise = {{ done: {{}}, on: null, res: {yen and "{ t1: { first: 20, asks: 20, koto: 40, yen: " + str(yen) + ", grade: 0, day: '2026-11-10' } }" or "{}"} }}; state.purse = {{ spent: {{}}, book: {{}} }}; saveState(); DAILY_CACHE = null;
  const mm = window.matchMedia; window.matchMedia = (q) => (/reduced-motion/.test(q) ? {{ matches: true }} : mm.call(window, q));
  const wait = (ms) => new Promise(q => setTimeout(q, ms)), y = () => document.querySelector('#view .yard');
  const go = async (place) => {{ TOWNEV.clock = {{ h: 12, day: new Date(2026, 10, 10) }}; location.hash = '#/' + place; document.getElementById('view').innerHTML = ''; route(); await wait(300); }};
  const use = (id) => {{ y().querySelector(`.use-btn[data-use="${{id}}"]`).click(); }};
  const menu = () => [...document.querySelectorAll('button.mc-item')].map((b) => [b.dataset.item, b.disabled]);
  const learn = (...ws) => {{ const t = todayStr(); REG.vocab.filter((v) => ws.includes(jaPlain(v.w))).forEach((v) => {{ state.srs[v.key] = {{ b: 3, due: addDays(t, 9), n: 4, ok: 4, ng: 0, s: 9, d: 5, last: addDays(t, -2), intro: addDays(t, -20), lrn: addDays(t, -2) }}; }}); saveState(); }};
  learn('お茶', 'コーヒー', 'ジュース', '水', 'カレー', 'うどん', '牛丼', '魚', '鶏肉', 'おにぎり', '味噌汁', 'お風呂', '牛乳', 'パン');   // ラーメン not (からあげ定食: 鶏肉)
  const talk = async () => {{ const said = []; while (document.querySelector('.talk-card')) {{ said.push(document.querySelector('.talk-ja').textContent.trim()); document.querySelector('.talk').click(); await wait(40); }} return said; }};"""

def test_no_yen_yet_the_menu_shows_but_says_how_to_come_by_some(b):
    r = json.loads(ev(b, "(async () => { " + fresh(0) + """ await go('street'); use('vend'); await wait(100);
      return JSON.stringify({ items: menu(), none: !!document.querySelector('.mc-none'), spent: yenSpent() }); })()"""))
    assert [i[0] for i in r['items']] == ['ocha', 'coffee', 'juice', 'water'] and all(d for _, d in r['items']), r   # all there, none to be had
    assert r['none'] and r['spent'] == 0, r

def test_a_can_from_the_machine_costs_its_price_and_goes_into_the_book(b):
    r = json.loads(ev(b, "(async () => { " + fresh(5000) + """ await go('street'); use('vend'); await wait(100);
      const price = document.querySelector('.mc-item[data-item="ocha"] .mc-price').textContent, zh0 = document.querySelector('.menu-card').classList.contains('zh');
      document.querySelector('[data-act="yen-zh"]').click(); const zh1 = document.querySelector('.menu-card').classList.contains('zh');
      document.querySelector('.mc-item[data-item="ocha"]').click(); await wait(300);
      return JSON.stringify({ price, zh0, zh1, talk: !!document.querySelector('.talk-card'), modal: !!document.querySelector('.mc-item'), bal: yenBalance(), book: Object.keys(state.purse.book) }); })()"""))
    assert r['price'] == 'ひゃくさんじゅうえん130円' and not r['zh0'] and r['zh1'], r   # the price read out above it; the Chinese on a tap
    assert not r['talk'] and not r['modal'] and r['bal'] == 4870 and r['book'] == ['ocha'], r   # a machine: no talk

def test_at_the_shokudo_he_orders_in_japanese_tome_says_the_price_and_he_sits_down_to_it(b):
    r = json.loads(ev(b, "(async () => { " + fresh(5000) + """ await go('shokudo'); use('menu'); await wait(100);
      document.querySelector('.mc-item[data-item="curry"]').click(); await wait(100);
      const who = document.querySelector('.talk-name').firstChild.textContent, said = await talk(); await wait(300);
      await wait(1700); const es = document.querySelector('.eat-scene'), look = [], first = es.querySelector('.es-face').dataset.mood;
      while (es.querySelector('.es-face').dataset.mood === 'drool') { look.push(es.querySelector('.es-say').textContent); es.querySelector('.es-ok').click(); await wait(60); }   // how good it looks, then いただきます
      const screen = es && { mood: es.querySelector('.es-face').dataset.mood, name: es.querySelector('.es-name').textContent, done: es.classList.contains('done'), bites: es.querySelectorAll('.es-bite.on').length, ok: !es.querySelector('.es-ok').hidden, left: !!es.querySelector('.es-left') };
      const rave = []; while (document.querySelector('.eat-scene')) { rave.push(document.querySelector('.es-say').textContent); document.querySelector('.es-ok').click(); await wait(60); } await wait(400);
      return JSON.stringify({ who, said, bal: yenBalance(), sat: !!yh.use, book: state.purse.book.curry || '', screen, rave, first, look, looks: TOWN.MENU.shokudo.items[0][4].look.map((l) => l[0].replace(/\{([^|}]+)\|[^}]+\}/g, '$1')), says: TOWN.MENU.shokudo.items[0][4].say.map((l) => l[0].replace(/\{([^|}]+)\|[^}]+\}/g, '$1')), gone: !document.querySelector('.eat-scene'), stamp: !!document.querySelector('.yen-stamp'), today: state.purse.today }); })()"""))
    assert r['said'] == ['カレーを ください。', 'はいよ！ 500円ごひゃくえんね。'], r
    assert r['bal'] == 4500 and r['sat'] and r['book'], r
    assert r['screen'] == {'name': 'カレー', 'done': True, 'bites': 6, 'ok': True, 'left': False, 'mood': 'bliss'}, r   # had on a screen of its own: bitten till gone
    assert r['first'] == 'drool' and [x.replace(' ', '') for x in r['look']] == [x.replace(' ', '') for x in r['looks']], r   # star-eyed, how good it looks first
    assert [x.replace(' ', '') for x in r['rave']] == [x.replace(' ', '') for x in r['says']], r   # then he goes on about it, a line a tap
    assert r['gone'] and r['stamp'] and r['today']['f'] == 1 and r['today']['d'] == 0, r   # the first カレー: stamped

def test_short_of_yen_a_thing_cannot_be_had_and_the_bath_takes_its_fee(b):
    r = json.loads(ev(b, "(async () => { " + fresh(5000) + """ state.purse.spent = { other: 4600 }; saveState(); await go('shokudo'); use('menu'); await wait(100);
      const can = menu().filter(([, d]) => !d).map(([i]) => i); closeModal(); state.purse.spent = {}; saveState();
      await go('sento'); use('bath'); await wait(100); document.querySelector('.mc-item[data-item="bath"]').click(); await wait(100);
      const said = await talk(); await wait(200);
      return JSON.stringify({ can, said, bal: yenBalance(), out: y().querySelector('.yhero').classList.contains('out') }); })()"""))
    assert r['can'] == ['onigiri', 'miso'], r   # 400 円 left: only those
    assert r['said'] == ['大人おとな 一人ひとり、おねがいします。', '480円よんひゃくはちじゅうえんです。ごゆっくり どうぞ。'] and r['bal'] == 4520 and r['out'], r   # the fee paid, into the bath

def test_a_thing_is_on_the_menu_once_its_word_is_learned(b):
    r = json.loads(ev(b, "(async () => { " + fresh(5000) + """ await go('shokudo'); use('menu'); await wait(100);
      const lock = [...document.querySelectorAll('.mc-item.locked')].map((x) => x.querySelector('.mc-lock').textContent), sold = menu().map(([i]) => i);
      return JSON.stringify({ lock, sold }); })()"""))
    assert r['lock'] == ['學會「ラーメン」這個字，就能點'] and 'ramen' not in r['sold'] and 'curry' in r['sold'], r   # ラーメン not learned yet

def test_two_foods_and_a_drink_a_day_then_he_is_full(b):
    r = json.loads(ev(b, "(async () => { " + fresh(5000) + """ await go('shokudo');
      const buy = async (id) => { use('menu'); await wait(100); document.querySelector(`.mc-item[data-item="${id}"]`).click(); await wait(100); const said = await talk(); await wait(1700); while (document.querySelector('.eat-scene')) { document.querySelector('.es-ok').click(); await wait(40); } return said; };
      await buy('onigiri'); await buy('miso'); const bal = yenBalance();
      use('menu'); await wait(100); const banner = !!document.querySelector('.mc-today'), full = document.querySelector('.mc-item[data-item="curry"]').classList.contains('full');
      document.querySelector('.mc-item[data-item="curry"]').click(); await wait(100); const said = await talk(), after = yenBalance();
      await go('street'); use('vend'); await wait(100); document.querySelector('.mc-item[data-item="ocha"]').click(); await wait(1700); const es = document.querySelector('.eat-scene'); const drink = es && es.classList.contains('drink'); while (document.querySelector('.eat-scene')) { document.querySelector('.es-ok').click(); await wait(40); }
      use('vend'); await wait(100); document.querySelector('.mc-item[data-item="water"]').click(); await wait(100); const said2 = await talk();
      return JSON.stringify({ bal, banner, full, said, after, drink, said2, end: yenBalance(), today: state.purse.today }); })()"""))
    assert r['bal'] == 5000 - 150 - 100 and not r['banner'] and r['full'], r   # how many more today not shown (the user), the rest marked 吃不下了
    assert r['said'] == ['まだ おなかが いっぱいです。', 'また あした どうぞ！'] and r['after'] == r['bal'], r   # full: nothing paid
    assert r['drink'] and r['said2'] == ['もう のめません。'] and r['today']['f'] == 2 and r['today']['d'] == 1, r   # one drink, then no more
    assert r['end'] == r['bal'] - 130, r

def test_the_food_book_shows_what_has_been_had(b):
    r = json.loads(ev(b, "(async () => { " + fresh(5000) + """ state.purse.book = { melonpan: '2026-11-11', ocha: '2026-11-12' }; saveState(); await go('town');
      DIARY.open('food'); await wait(50); const t = document.querySelector('.diary');
      return JSON.stringify({ tab: !!t.querySelector('[data-diary="tab-food"]'), count: t.querySelector('.fb-count').textContent, had: [...t.querySelectorAll('.fb-item.had .fb-name')].map((x) => x.textContent) }); })()"""))
    assert r['tab'] and r['count'].startswith('吃過、用過 2 / ') and sorted(r['had']) == sorted(['お茶ちゃ', 'メロンパン']), r

def test_prices_are_read_out_with_their_sound_changes(b):
    r = json.loads(ev(b, "JSON.stringify([100, 120, 130, 150, 300, 480, 600, 750, 800, 1000, 3000, 8000, 104, 9999].map(YEN.reading))"))
    assert r == ['ひゃくえん', 'ひゃくにじゅうえん', 'ひゃくさんじゅうえん', 'ひゃくごじゅうえん', 'さんびゃくえん', 'よんひゃくはちじゅうえん', 'ろっぴゃくえん', 'ななひゃくごじゅうえん',
                 'はっぴゃくえん', 'せんえん', 'さんぜんえん', 'はっせんえん', 'ひゃくよえん', 'きゅうせんきゅうひゃくきゅうじゅうきゅうえん'], r

def test_buying_leaves_the_cruise_pay_and_lines_for_the_generator(b):
    r = json.loads(ev(b, """(() => { const l = []; YEN.lines((w, ja) => l.push([w, ja]));
      return JSON.stringify({ n: l.length, tome: l.filter(([w]) => w === 'tome').length, hero: l.filter(([w]) => w === 'hero').length, all: talkLines().filter(([w, ja]) => w === 'teppei' && /へい！/.test(ja)).length }); })()"""))
    assert r['tome'] == 10 and r['all'] == 5, r   # each thing with a keeper: the hero's order and their price, 「また あした どうぞ」 and their greeting

def test_the_test_sites_tools_give_yen_open_every_menu_and_empty_the_stomach(b):
    r = json.loads(ev(b, "(async () => { " + fresh(0) + """ await go('town');   // 127.0.0.1: the test site
      DIARY.open('town'); await wait(50); const tool = (t) => document.querySelector(`.diary [data-tool="${t}"]`).click();
      tool('yen-gift'); const bal = yenBalance(); tool('yen-all'); await wait(50); DIARY.close();
      await go('shokudo'); use('menu'); await wait(100); const locked = document.querySelectorAll('.mc-item.locked').length; closeModal();
      state.purse.today = { day: dateStr(TOWNEV.today()), f: 2, d: 1 }; saveState(); DIARY.open('town'); await wait(50); tool('yen-full'); const today = state.purse.today || null;
      tool('yen-all'); const back = YEN.allOpen(); DIARY.close();
      return JSON.stringify({ bal, locked, today, back }); })()"""))
    assert r == {'bal': 10000, 'locked': 0, 'today': None, 'back': False}, r   # +10,000 円; ラーメン open too; the day's foods and drinks gone; back to words first

def test_a_keeper_tapped_asks_order_or_chat(b):
    # 2026-11-13, the user: food bought from the one who sells it; one with words of their own now asks 點餐 or 閒聊
    r = json.loads(ev(b, "(async () => { " + fresh(5000) + """ state.town.seen = { tome: 1 }; saveState(); await go('shokudo');   // トメ met
      const tap = async () => { y().querySelector('.npc[data-npc="tome"]').click(); await wait(300); return document.querySelector('.talk-card'); };
      let c = await tap(); const first = { ja: c.querySelector('.talk-ja').textContent.trim(), picks: [...c.querySelectorAll('[data-choose]')].map((x) => x.textContent) };
      c.querySelector('[data-choose="0"]').click(); await wait(150); const opened = !!document.querySelector('.mc-item[data-item="curry"]'); closeModal();
      c = await tap(); c.querySelector('[data-choose="1"]').click(); await wait(150); const chat = document.querySelector('.talk-card'), talked = chat && chat.querySelector('[data-choose]') === null && chat.querySelector('.talk-name').firstChild.textContent;
      return JSON.stringify({ first, menu: opened, talked }); })()"""))
    assert r['first']['ja'].startswith('いらっしゃい') and r['first']['picks'] == ['ちゅうもんする', 'おしゃべりする'], r   # in Japanese (the user)
    assert r['menu'] and r['talked'] == '大山 トメ', r   # 點餐: her menu; 閒聊: a word as before

def test_the_bath_and_omikuji_once_a_day_and_out_of_the_bath_he_is_hungry_again(b):
    # 2026-11-13, the user: the bath and おみくじ once a day each; a bath makes him hungry — the day's foods and drinks begin anew
    r = json.loads(ev(b, "(async () => { " + fresh(5000) + """ state.purse.today = { day: dateStr(TOWNEV.today()), f: 2, d: 1 }; saveState();
      const buy = async (id) => { document.querySelector(`.mc-item[data-item="${id}"]`).click(); await wait(100); return talk(); };
      await go('sento'); use('bath'); await wait(100); await buy('bath'); await wait(300); const after = Object.assign({}, state.purse.today); await wait(4500);   // out of the bath again
      use('bath'); await wait(100); const full = document.querySelector('.mc-item[data-item="bath"]').matches('.full[data-k="b"]'); const again = await buy('bath');
      await go('shrine'); use('kuji'); await wait(100); await buy('kuji'); await wait(2500); use('kuji'); await wait(100); const kuji = await buy('kuji');
      return JSON.stringify({ after, full, again, kuji, today: state.purse.today, bal: yenBalance() }); })()"""))
    assert r['after']['f'] == 0 and r['after']['d'] == 0 and r['after']['b'] == 1, r   # full before; out of the bath, hungry
    assert r['full'] and r['again'] == ['今日きょうは もう おふろに 入はいりました。', 'また あした どうぞ！'], r
    assert r['kuji'] == ['今日きょうは もう ひきました。'] and r['today']['o'] == 1 and r['bal'] == 5000 - 480 - 100, r   # once each, paid once each

def test_while_he_eats_the_back_button_keeps_the_page(b):
    # 2026-11-13, the user: watched to the end — no going elsewhere while it is up
    r = json.loads(ev(b, "(async () => { " + fresh(5000) + """ await go('street'); use('vend'); await wait(100);
      document.querySelector('.mc-item[data-item="ocha"]').click(); await wait(1700); const up = !!document.querySelector('.eat-scene');
      location.hash = '#/today'; await wait(300); const kept = location.hash, still = !!document.querySelector('.eat-scene'), place = y() && y().dataset.place;
      while (document.querySelector('.eat-scene')) { document.querySelector('.es-ok').click(); await wait(40); }
      location.hash = '#/today'; await wait(300);
      return JSON.stringify({ up, kept, still, place, after: location.hash }); })()"""))
    assert r == {'up': True, 'kept': '#/street', 'still': True, 'place': 'street', 'after': '#/today'}, r

def test_the_festival_has_seven_stalls_six_selling_something_to_eat(b):
    # 2026-11-13, the user: seven or eight stalls at the 緣日, cotton candy, takoyaki and the like — more to eat
    r = json.loads(ev(b, "(async () => { " + fresh(5000) + """ learn('りんご', '氷', 'バナナ');
      const at = async (h) => { TOWNEV.clock = { h, day: new Date(2026, 10, 10) }; location.hash = '#/shrine'; document.getElementById('view').innerHTML = ''; route(); await wait(300); };
      await at(12); const day = SHRINE_STALLS.filter(([id]) => y().querySelector(`.use-btn[data-use="${id}"]`)).length;
      await at(20); const night = SHRINE_STALLS.filter(([id]) => y().querySelector(`.use-btn[data-use="${id}"]`)).map(([id]) => id), menus = night.filter((id) => TOWN.MENU[id]);
      use('kakigori'); await wait(100); const cold = menu().map(([i]) => i); closeModal();
      use('takoyaki'); await wait(100); document.querySelector('.mc-item[data-item="takoyaki"]').click(); await wait(100);
      const who = [], said = []; let face = false;
      while (document.querySelector('.talk-card')) { who.push(document.querySelector('.talk-name').firstChild.textContent); face = face || !!document.querySelector('.talk-card svg'); said.push(document.querySelector('.talk-ja').textContent.trim()); document.querySelector('.talk').click(); await wait(40); }
      await wait(1700);
      const es = document.querySelector('.eat-scene'), name = es && es.querySelector('.es-name').textContent; while (document.querySelector('.eat-scene')) { document.querySelector('.es-ok').click(); await wait(40); }
      const l = []; YEN.lines((w, ja) => l.push(w));
      return JSON.stringify({ day, night, menus, cold, who, face, said, name, bal: yenBalance(), keepers: ['ojisan', 'obasan', 'oniisan'].map((k) => l.filter((w) => w === k).length), voiced: ['ojisan', 'obasan', 'oniisan'].every((k) => CAST_VOICE[k]) }); })()"""))
    assert r['day'] == 0 and len(r['night']) == 7 and r['menus'] == ['yakisoba', 'takoyaki', 'wataame', 'ringoame', 'kakigori', 'chocobanana'], r   # only at the festival; all but the goldfish sell something
    assert r['cold'] == ['kakigori', 'ramune'], r   # shaved ice, and ラムネ to drink
    assert r['who'] == ['我', '屋台のおじさん'] and r['face'] and r['said'] == ['たこやきを ください。', 'まいど！ 500円ごひゃくえんだよ！'] and r['bal'] == 4500, r
    assert r['name'] == 'たこやき', r   # had on its own screen
    assert r['keepers'] == [4, 6, 3] and r['voiced'], r   # each one's prices and 「また あした」 for the generator, in their own voices

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
