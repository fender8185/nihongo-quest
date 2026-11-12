"""test build (2026-11-12): the town's people come alive (TOWNLIFE) — out of doors they stroll about their spot now and then,
stop and turn to the hero when he comes near, hold still when tapped (the hero walks to where they are now); words pop up over
their heads, two who know each other talk; when the hour sends someone elsewhere they walk off that way and who comes walks in.
docs/superpowers/specs/2026-11-12-town-life-design.md"""
import json, os, subprocess, sys, time
sys.path.insert(0, os.path.dirname(__file__))
from cdp import Browser
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
PORT = 8815
URL = f"http://127.0.0.1:{PORT}/"
READY = "typeof state === 'object' && !!state.updatedAt && typeof speakScript === 'function'"

def ev(b, js, pre=()):
    return b.run([("nav", URL), ("wait", READY)] + list(pre) + [("eval", js)])[-1]

# a main-course account at m1 who has met the town's morning people; no events waiting; the people let loose (TOWNLIFE.still is
# on in headless Chrome so the other files' people stand still)
FRESH = """state.stage = 'main'; state.kanaKnown = true; state.introSeen = true; state.storyV = 9; state.startChosen = true; state.currentUnit = 'm1';
  state.met = { koharu: 1, mugi: 1 }; state.town = { done: {}, seen: { kenta: 1, lin: 1, miku: 1, nagisa: 1, hina: 1 }, stops: {}, talks: {} }; saveState(); DAILY_CACHE = null;
  localStorage.removeItem('nq_wake'); TOWN.EVENTS = []; TOWNLIFE.still = false;
  const wait = (ms) => new Promise(q => setTimeout(q, ms)), y = () => document.querySelector('#view .yard');
  const go = async (place, h) => { TOWNEV.clock = { h, day: new Date(2026, 10, 10) }; localStorage.removeItem('nq_hero'); location.hash = '#/' + place; document.getElementById('view').innerHTML = ''; route(); await wait(300); };
  const pos = (el) => { const m = el.style.transform.match(/translate\\(([-\\d.]+)px,\\s*([-\\d.]+)px\\)/); return [+m[1], -m[2]]; };
  const people = () => [...y().querySelectorAll('.npc[data-npc]')];"""

def test_people_stand_still_in_headless_chrome(b):
    r = ev(b, "TOWNLIFE.still")
    assert r is True, r

def test_people_stroll_about_their_spot(b):
    r = json.loads(ev(b, "(async () => { " + FRESH + """ await go('town', 10);
      const start = people().map(pos), out = [], blocks = walkBlocks('town');
      for (let i = 0; i < 45; i++) { await wait(300); people().forEach((el) => { const [X, Y] = pos(el), r = el.dataset.roam.split(',').map(Number);
        if (r.length === 2 && (Math.abs(X - +el.dataset.x) > r[0] + 2 || Math.abs(Y - +el.dataset.y) > r[1] + 2)) out.push([el.dataset.npc, X, Y]);
        if (blocks.some((b) => yIn(b, [X, Y]))) out.push(['block', el.dataset.npc, X, Y]); }); }
      const moved = people().filter((el, k) => Math.abs(pos(el)[0] - start[k][0]) > 1).map((el) => el.dataset.npc);
      return JSON.stringify({ n: people().length, moved: moved.length > 0, out }); })()"""))
    assert r['n'] >= 3 and r['moved'] and r['out'] == [], r

def test_a_tapped_walker_stops_and_the_hero_goes_to_where_they_are(b):
    r = json.loads(ev(b, "(async () => { " + FRESH + """ await go('town', 10);
      let el = null; for (let i = 0; i < 80 && !el; i++) { await wait(150); el = people().find((e) => e.matches('.walk, .run')); }
      if (!el) return JSON.stringify({ walker: false });
      const id = el.dataset.npc; TOWNEV.talk(el); const at = TOWNLIFE.at(id); await wait(900); const still = TOWNLIFE.at(id);
      for (let i = 0; i < 60 && !document.querySelector('.talk-card'); i++) await wait(100);
      const talked = !!document.querySelector('.talk-card'), dx = Math.abs(yh.X - still[0]);
      TALK.close(); await new Promise((q) => yHeroWalk(y(), [still[0] > 0 ? -560 : 560, 40], q)); const back = pos(el); let again = false;   /* he waits while the hero stands by */
      for (let i = 0; i < 80 && !again; i++) { await wait(150); again = Math.abs(pos(el)[0] - back[0]) > 1; }
      return JSON.stringify({ walker: true, held: Math.abs(at[0] - still[0]) < 0.5 && Math.abs(at[1] - still[1]) < 0.5, talked, near: dx < 120, again }); })()"""))
    assert r == {'walker': True, 'held': True, 'talked': True, 'near': True, 'again': True}, r

def test_a_hold_with_no_talk_lets_go_by_itself(b):
    r = json.loads(ev(b, "(async () => { " + FRESH + """ await go('town', 10);
      const el = people().find((e) => e.dataset.roam !== '0'), id = el.dataset.npc; TOWNLIFE.hold(id); const p0 = pos(el);
      await wait(7000); const kept = Math.abs(pos(el)[0] - p0[0]) < 0.5; let again = false;
      for (let i = 0; i < 80 && !again; i++) { await wait(150); again = Math.abs(pos(el)[0] - p0[0]) > 1; }
      return JSON.stringify({ kept, again }); })()"""))
    assert r == {'kept': True, 'again': True}, r

def test_drawn_anew_mid_walk_without_errors(b):
    r = json.loads(ev(b, "(async () => { " + FRESH + """ const errs = []; window.addEventListener('error', (e) => errs.push(String(e.message)));
      await go('town', 10); let el = null; for (let i = 0; i < 80 && !el; i++) { await wait(150); el = people().find((e) => e.matches('.walk, .run')); }
      document.getElementById('view').innerHTML = ''; route(); await wait(100);
      const fresh = people().map((e) => { const [X, Y] = pos(e); return Math.abs(X - +e.dataset.x) < 0.5 && Math.abs(Y - +e.dataset.y) < 0.5; });
      await wait(2000);
      return JSON.stringify({ walker: !!el, errs, fresh: fresh.every(Boolean) }); })()"""))
    assert r == {'walker': True, 'errs': [], 'fresh': True}, r

def test_the_hero_near_stops_them_and_they_turn_to_him(b):
    r = json.loads(ev(b, "(async () => { " + FRESH + """ await go('town', 10);
      const el = people().find((e) => e.dataset.npc === 'kenta'), [X, Y] = pos(el);
      await new Promise((q) => yHeroWalk(y(), [X - 90, Y], q)); await wait(100);
      const a = pos(el), faced = el.classList.contains('flip') && el.classList.contains('turn'); await wait(2500);
      return JSON.stringify({ faced, stayed: Math.abs(pos(el)[0] - a[0]) < 0.5 }); })()"""))
    assert r == {'faced': True, 'stayed': True}, r   # the hero on their left: they turn to the left (flip), and wait

def test_reduced_motion_keeps_them_still(b):
    r = json.loads(ev(b, "(async () => { " + FRESH + """ const mm = window.matchMedia; window.matchMedia = (q) => (/reduced-motion/.test(q) ? { matches: true } : mm.call(window, q));
      await go('town', 10); const p0 = people().map(pos); await wait(8000);
      return JSON.stringify(people().every((el, k) => Math.abs(pos(el)[0] - p0[k][0]) < 0.5)); })()"""))
    assert r is True, r

def test_a_chat_with_no_storage_still_opens_and_counts(b):
    r = json.loads(ev(b, "(async () => { " + FRESH + """ TOWNLIFE.still = true; await go('town', 10);
      const g = Storage.prototype.getItem, s = Storage.prototype.setItem;
      Storage.prototype.getItem = function (k) { if (k === 'nq_chat') throw new Error('no'); return g.call(this, k); };
      Storage.prototype.setItem = function (k, v) { if (k === 'nq_chat') throw new Error('no'); return s.call(this, k, v); };
      TOWNEV.talk(people().find((e) => e.dataset.npc === 'kenta')); for (let i = 0; i < 60 && !document.querySelector('.talk-card'); i++) await wait(100);
      Storage.prototype.getItem = g; Storage.prototype.setItem = s;
      return JSON.stringify({ talked: !!document.querySelector('.talk-card .talk-ja'), talks: state.town.talks.kenta }); })()"""))
    assert r == {'talked': True, 'talks': 1}, r

def test_chat_follows_the_hour_and_tells_news_once(b):
    r = json.loads(ev(b, "(async () => { " + FRESH + """ TOWNLIFE.still = true; localStorage.removeItem('nq_chat');
      TOWN.CHAT.kenta = [['m0', 'あさ', '早'], ['m0', 'よる', '晚', { h: 'night' }], ['m0', 'ニュース', '新', { fresh: 'm0-1' }]];
      state.town.done = { 'm0-1': dateStr(new Date(2026, 10, 9)) };
      const say = () => TOWNEV.chatLine('kenta')[0];
      TOWNEV.clock = { h: 9, day: new Date(2026, 10, 10) }; const first = say(), next = [say(), say(), say()];
      return JSON.stringify({ first, next }); })()"""))
    assert r == {'first': 'ニュース', 'next': ['あさ', 'あさ', 'あさ']}, r   # news once; the night line not by day (the morning one again: nothing else)

# ---- words over their heads, two talking, walking off and in (Task 2) ----
def test_words_pop_up_over_someone_and_not_while_talking(b):
    r = json.loads(ev(b, "(async () => { " + FRESH + """ TOWNLIFE.still = true; TOWN.MUTTER = { kenta: [['m0', 'よーし！', '好！']], lin: [['m0', 'ふふ。', '呵呵。']] }; TOWN.PAIRS = []; TOWNLIFE.gap = [400, 500]; await go('town', 10);
      TOWNLIFE.still = false; let el = null; for (let i = 0; i < 30 && !el; i++) { await wait(100); el = y().querySelector('.ysay'); }
      const text = el && el.textContent; let gone = false; for (let i = 0; i < 50 && !gone; i++) { await wait(100); gone = !el.isConnected; }
      TOWNEV.talk(people().find((e) => e.dataset.npc === 'lin')); for (let i = 0; i < 60 && !document.querySelector('.talk-card'); i++) await wait(100);
      y().querySelectorAll('.ysay').forEach((e) => e.remove()); await wait(2000);
      return JSON.stringify({ text, gone, quiet: !y().querySelector('.ysay') }); })()"""))
    assert r['text'] in ('よーし！', 'ふふ。') and r['gone'] and r['quiet'], r

def test_two_who_know_each_other_talk_one_walking_over(b):
    r = json.loads(ev(b, "(async () => { " + FRESH + """ TOWNLIFE.still = true; TOWN.MUTTER = {};
      TOWN.PAIRS = [[['koharu', 'lin'], 'm0', [['koharu', 'ねえねえ！', '欸欸！'], ['lin', 'はい、はい。', '好、好。'], ['koharu', 'えへへ。', '嘿嘿。']]]]; await go('town', 10);
      TOWNLIFE.still = false; TOWNLIFE.pair('koharu', 'lin'); const said = [];
      for (let i = 0; i < 120 && said.length < 3; i++) { await wait(100); y().querySelectorAll('.ysay').forEach((e) => { if (!e._seen) { e._seen = 1; said.push(e.textContent); } }); }
      const a = TOWNLIFE.at('koharu'), c = TOWNLIFE.at('lin');
      return JSON.stringify({ said, close: Math.hypot(a[0] - c[0], a[1] - c[1]) <= 160 }); })()"""))
    assert r == {'said': ['ねえねえ！', 'はい、はい。', 'えへへ。'], 'close': True}, r   # 小春 at the salon, 林 at the far end of the street

def test_at_the_hour_they_walk_off_and_who_comes_walks_in(b):
    r = json.loads(ev(b, "(async () => { " + FRESH + """ TOWNLIFE.still = true; await go('beach', 17.99); TOWNLIFE.still = false;
      const mugi = () => y().querySelector('.npc-mugi'), before = !!mugi(); const x0 = TOWNLIFE.at('mugi')[0];
      TOWNEV.clock = { h: 18.01, day: new Date(2026, 10, 10) }; sceneMinute(); await wait(400);
      const walking = mugi() && mugi().matches('.walk, .run'), x1 = TOWNLIFE.at('mugi') && TOWNLIFE.at('mugi')[0];
      for (let i = 0; i < 60 && mugi(); i++) await wait(100);
      const goneFromBeach = !mugi();
      yh.arrive = null; location.hash = '#/town'; document.getElementById('view').innerHTML = ''; route(); await wait(300);
      const atCafeAlready = Math.abs(TOWNLIFE.at('mugi')[0] - +mugi().dataset.x) < 1;
      return JSON.stringify({ before, walking, toward: x1 > x0, goneFromBeach, atCafeAlready }); })()"""))
    assert r == {'before': True, 'walking': True, 'toward': True, 'goneFromBeach': True, 'atCafeAlready': True}, r   # off toward the yard (right); in town already when the hero comes

def test_who_comes_while_the_hero_is_there_walks_in_from_the_way_they_come(b):
    r = json.loads(ev(b, "(async () => { " + FRESH + """ TOWNLIFE.still = true; await go('town', 17.99); TOWNLIFE.still = false;
      const had = !!y().querySelector('.npc-mugi');
      TOWNEV.clock = { h: 18.01, day: new Date(2026, 10, 10) }; sceneMinute();
      for (let i = 0; i < 60 && !(y() && y().querySelector('.npc-mugi')); i++) await wait(100);   /* 渚 walks off first (home at 18), then the town is drawn anew */
      await wait(150); const m = y().querySelector('.npc-mugi'), x = TOWNLIFE.at('mugi')[0], home = +m.dataset.x, walking = m.matches('.walk, .run');
      for (let i = 0; i < 80 && Math.abs(TOWNLIFE.at('mugi')[0] - home) > 1; i++) await wait(100);
      return JSON.stringify({ had, from: x < home - 100, walking, there: Math.abs(TOWNLIFE.at('mugi')[0] - home) <= 1 }); })()"""))
    assert r == {'had': False, 'from': True, 'walking': True, 'there': True}, r   # in from the yard's side (the left), as 渚 shuts her café and walks off

def test_someone_moving_to_another_spot_here_walks_over(b):
    r = json.loads(ev(b, "(async () => { " + FRESH + """ TOWNLIFE.still = true; state.town.seen.chihaya = 1; TOWN.CAST.chihaya.hours = [[9, 18, 'shrine', 'haiden'], [18, 23, 'shrine', 'ennichi']]; await go('shrine', 17.99); TOWNLIFE.still = false;
      const x0 = TOWNLIFE.at('chihaya')[0]; TOWNEV.clock = { h: 18.01, day: new Date(2026, 10, 10) }; sceneMinute(); await wait(300);
      const el = y().querySelector('.npc-chihaya'), home = +el.dataset.x, x1 = TOWNLIFE.at('chihaya')[0];
      return JSON.stringify({ moved: home !== x0, startsWhereSheWas: Math.abs(x1 - x0) < 60, walking: el.matches('.walk, .run') }); })()"""))
    assert r == {'moved': True, 'startsWhereSheWas': True, 'walking': True}, r   # 千早 (her hours made one after the other) from the hall to the fortune stall as the 緣日 opens

def test_no_walking_off_while_a_talk_is_open(b):
    r = json.loads(ev(b, "(async () => { " + FRESH + """ TOWNLIFE.still = true; await go('beach', 17.99); TOWNLIFE.still = false;
      TOWNEV.talk(y().querySelector('.npc-mugi')); for (let i = 0; i < 60 && !document.querySelector('.talk-card'); i++) await wait(100);
      TOWNEV.clock = { h: 18.01, day: new Date(2026, 10, 10) }; sceneMinute(); await wait(1500);
      const stayed = !!y().querySelector('.npc-mugi') && !y().querySelector('.npc-mugi').matches('.walk, .run');
      TALK.close(); sceneMinute(); for (let i = 0; i < 60 && y().querySelector('.npc-mugi'); i++) await wait(100);
      return JSON.stringify({ stayed, after: !y().querySelector('.npc-mugi') }); })()"""))
    assert r == {'stayed': True, 'after': True}, r

# ---- the review's (2026-11-12) ----
def test_tapping_one_on_the_way_to_a_talk_frees_both_and_the_words_go_on(b):
    r = json.loads(ev(b, "(async () => { " + FRESH + """ TOWNLIFE.still = true; TOWN.MUTTER = { kenta: [['m0', 'よーし！', '好！']] };
      TOWN.PAIRS = [[['koharu', 'lin'], 'm0', [['koharu', 'ねえねえ！', '']]]]; TOWNLIFE.gap = [99999, 99999]; await go('town', 10);
      TOWNLIFE.still = false; TOWNLIFE.pair('koharu', 'lin'); await wait(300);
      const mover = people().find((e) => e.matches('.walk, .run')), id = mover && mover.dataset.npc;
      TOWNEV.talk(mover); for (let i = 0; i < 60 && !document.querySelector('.talk-card'); i++) await wait(100); TALK.close();
      const other = id === 'koharu' ? 'lin' : 'koharu'; await new Promise((q) => yHeroWalk(y(), [(TOWNLIFE.at(id)[0] + TOWNLIFE.at(other)[0]) / 2, 30], q));   /* away from both: they wait for no one */
      const p0 = [TOWNLIFE.at(id), TOWNLIFE.at(other)];
      let moved = false; for (let i = 0; i < 100 && !moved; i++) { await wait(150); moved = [id, other].every((x, k) => Math.abs(TOWNLIFE.at(x)[0] - p0[k][0]) > 1); }
      TOWNLIFE.say('kenta', 'よーし！'); const words = !!y().querySelector('.ysay');
      return JSON.stringify({ mover: !!mover, moved, words, said: !!y().querySelector('.ysay[data-who="koharu"]') }); })()"""))
    assert r == {'mover': True, 'moved': True, 'words': True, 'said': False}, r   # both stroll again; the pair's line never came

def test_a_chat_is_kept_on_the_device_without_an_upload(b):
    r = json.loads(ev(b, "(async () => { " + FRESH + """ TOWNLIFE.still = true; localStorage.removeItem('nq_chat'); await wait(50);
      const t0 = state.updatedAt; TOWNEV.chatLine('kenta'); TOWNEV.chatLine('kenta');
      state.look = Object.assign({}, state.look, { hairColor: '#123456' }); TOWNEV.chatLine('kenta');
      const m = JSON.parse(localStorage.getItem('nq_chat')), keys = Object.keys(m.news || {}).concat(...Object.values(m.said || {}));
      return JSON.stringify({ same: state.updatedAt === t0, talks: state.town.talks.kenta, short: keys.every((k) => k.length < 80), saw: m.saw.kenta.every((s) => /^L[0-9a-z]+$/.test(s)) }); })()"""))
    assert r == {'same': True, 'talks': 3, 'short': True, 'saw': True}, r

def test_a_long_line_wraps_inside_its_bubble(b):
    r = json.loads(ev(b, "(async () => { " + FRESH + """ TOWNLIFE.still = true; await go('town', 10); TOWNLIFE.still = false;
      TOWNLIFE.say('kenta', '{原田|はらだ}さん、{本官|ほんかん}の {時計|とけい}、{合|あ}って いますか！ もう いちど {聞|き}きます！', 4000); await wait(200);
      const el = y().querySelector('.ysay'), b = el.getBoundingClientRect(), k = b.width / el.offsetWidth;
      return JSON.stringify({ w: el.offsetWidth <= 200, inside: el.scrollWidth <= el.clientWidth + 1 }); })()"""))
    assert r == {'w': True, 'inside': True}, r

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
