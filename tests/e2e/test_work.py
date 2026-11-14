"""2026-11-14 中華街の打工 (docs/superpowers/specs/2026-11-14-chinatown-work-design.md §4–§7): four workplaces opening by the
kana seen, at most one a day, a shift of ten left halfway waiting for its day, pay by the 打工證 and the grade, into the wallet."""
import json, os, subprocess, sys, time
sys.path.insert(0, os.path.dirname(__file__))
from cdp import Browser
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
PORT = 8832
URL = f"http://127.0.0.1:{PORT}/"
READY = "typeof state === 'object' && !!state.updatedAt && typeof speakScript === 'function'"

def ev(b, js, pre=()):
    return b.run([("nav", URL), ("wait", READY)] + list(pre) + [("eval", js)])[-1]

# a beginner in 入門 with n kana seen (kana(n)), no 円, no work yet, the town's clock at noon on a weekday; a job's runner caught
# (stub(job): its ctx in __ctx, nothing drawn) so the rules can be driven by hand
BEGIN = """const rec = () => ({ b: 2, due: addDays(todayStr(), 9), n: 2, ok: 2, ng: 0, s: 4, d: 5, last: addDays(todayStr(), -1) });
  const kana = (n) => { Object.keys(state.srs).filter((k) => k.startsWith('a:')).forEach((k) => delete state.srs[k]); REG.kana.slice(0, n).forEach((x) => { state.srs[x.key] = rec(); }); };
  state.storyV = 99; state.startChosen = true; state.stage = 'pre'; state.kanaKnown = false; state.srs = {}; kana(10);
  state.town = { done: {}, seen: {}, stops: {}, talks: {} }; state.koto.found = {}; state.purse = { spent: {}, book: {} }; state.cruise = { done: {}, on: null, res: {} }; state.work = { res: {} };
  ['nq_class', 'nq_taste', 'nq_wake'].forEach((k) => localStorage.removeItem(k));
  TOWNEV.clock = { h: 12, day: new Date(2026, 10, 10) }; saveState(); DAILY_CACHE = null;
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const stub = (job, fresh) => { WORK.register(job, { run: (ctx) => { window.__ctx = ctx; }, lines: () => {} }); if (!fresh) state.work.res['2026-01-01'] = { place: job, done: 1, score: { 0: 0 } }; };   // fresh: never there before (the keeper's first word)
  const yard = () => document.querySelector('.yard');"""

def test_the_jobs_open_by_kana_seen(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + """ location.hash = '#/chinadori'; route(); await wait(200); const out = {};
      for (const n of [4, 5, 14, 15, 29, 30, 45, 46]) { kana(n); out[n] = ['shelf', 'counter', 'deliver', 'buns'].filter((j) => WORK.can(j).ok).join(','); }
      kana(4); out.why = WORK.can('shelf').why; state.kanaKnown = true; out.known = WORK.can('buns').ok;
      return JSON.stringify(out); })()"""))
    assert (r['4'], r['5'], r['14'], r['15'], r['29'], r['30'], r['45'], r['46']) == ('', 'shelf', 'shelf', 'shelf,counter', 'shelf,counter', 'shelf,counter,deliver', 'shelf,counter,deliver', 'shelf,counter,deliver,buns'), r
    assert '再學 1 個假名' in r['why'] and r['known'], r

def test_one_workplace_a_day_and_a_shift_left_halfway_waits(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + """ kana(46); stub('counter', true); stub('shelf'); location.hash = '#/chinadori'; route(); await wait(200); const out = {};
      WORK.start(yard(), 'shelf'); [0, 1, 2].forEach((k) => __ctx.right(k, 0)); out.done = WORK.today().done;
      window.__ctx = null; out.other = WORK.can('counter'); WORK.start(yard(), 'counter'); out.otherRan = Boolean(window.__ctx);
      WORK.start(yard(), 'shelf'); out.resumed = __ctx.done; out.place = WORK.today().place;
      return JSON.stringify(out); })()"""))
    assert r['done'] == 3 and not r['other']['ok'] and '整理貨架' in r['other']['why'] and not r['otherRan'], r
    assert r['resumed'] == 3 and r['place'] == 'shelf', r

def test_a_shift_begun_before_closing_runs_to_its_end(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + """ kana(46); stub('shelf'); TOWNEV.clock = { h: 18.98, day: new Date(2026, 10, 10) };
      location.hash = '#/chinadori'; route(); await wait(200); const out = { before: WORK.can('shelf').ok };
      WORK.start(yard(), 'shelf'); TOWNEV.clock = { h: 19.5, day: new Date(2026, 10, 10) };
      for (let k = 0; k < 10; k++) __ctx.right(k, 0); __ctx.finish(); await wait(100);
      out.yen = WORK.today().yen; document.querySelectorAll('.wk-result').forEach((x) => x.remove());
      TOWNEV.clock = { h: 19.5, day: new Date(2026, 10, 11) }; out.after = WORK.can('shelf');
      return JSON.stringify(out); })()"""))
    assert r['before'] and r['yen'] == 150 and not r['after']['ok'] and '19' in r['after']['why'], r

def test_the_shift_keeps_the_day_it_began(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + """ kana(46); stub('shelf'); location.hash = '#/chinadori'; route(); await wait(200);
      WORK.start(yard(), 'shelf'); TOWNEV.clock = { h: 12, day: new Date(2026, 10, 11) };
      for (let k = 0; k < 10; k++) __ctx.right(k, 0); __ctx.finish(); await wait(100); document.querySelectorAll('.wk-result').forEach((x) => x.remove());
      return JSON.stringify(Object.fromEntries(Object.entries(state.work.res).filter(([, x]) => x.yen !== undefined).map(([d, x]) => [d, x.yen]))); })()"""))
    assert r == {'2026-11-10': 150}, r

def test_the_keeper_says_how_the_first_time(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + """ kana(46); stub('shelf', true); location.hash = '#/chinadori'; route(); await wait(200); window.__ctx = null;
      WORK.start(yard(), 'shelf'); await wait(300); const t = document.querySelector('.talk');
      return JSON.stringify({ talk: Boolean(t), ran: Boolean(window.__ctx), text: t ? t.textContent : '' }); })()"""))
    assert r['talk'] and not r['ran'] and 'ラベル' in r['text'], r

def test_pay_grade_and_licence(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + """
      const sc = (first) => Object.fromEntries(Array.from({ length: 10 }, (_, k) => [k, k < first ? 0 : 1]));
      return JSON.stringify({ pays: [WORK.pay(1, 'S', 0).yen, WORK.pay(5, 'B', 0).yen, WORK.pay(30, 'E', 30).yen, WORK.pay(15, 'A', 10)],
        ranks: [0, 1, 4, 5, 14, 15, 29, 30].map((n) => WORK.rank(n)), grades: [10, 9, 8, 7, 5, 3, 2].map((n) => WORK.grade(sc(n))) }); })()"""))
    assert r['pays'][:3] == [150, 140, 230] and r['pays'][3] == {'base': 150, 'bonus': 30, 'tip': 10, 'yen': 190}, r
    assert r['ranks'] == ['', '新人', '新人', 'アルバイト', 'アルバイト', 'ベテラン', 'ベテラン', 'バイトリーダー'], r
    assert r['grades'] == ['S', 'A', 'B', 'B', 'C', 'D', 'E'], r

def test_the_pay_goes_into_the_wallet(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + """ kana(46); stub('shelf'); location.hash = '#/chinadori'; route(); await wait(200);
      const before = yenEarned(); WORK.start(yard(), 'shelf'); for (let k = 0; k < 10; k++) __ctx.right(k, k < 9 ? 0 : 1); __ctx.finish(); await wait(200);
      const card = document.querySelector('.wk-result'), out = { got: yenEarned() - before, card: Boolean(card), text: card ? card.textContent : '' };
      card.querySelector('.crr-ok').click(); await wait(100); DIARY.open('town'); await wait(100);
      out.tab = Boolean(document.querySelector('[data-diary="tab-work"]')); document.querySelector('[data-diary="tab-work"]').click(); await wait(100);
      out.book = document.querySelector('.diary').textContent; DIARY.close();
      return JSON.stringify(out); })()"""))
    assert r['got'] == 130 and r['card'] and '打工證' in r['text'] and '新人' in r['text'], r   # 9 of 10 at once: A, +30 on 新人's 100
    assert r['tab'] and '新人' in r['book'] and '1 班' in r['book'], r

PICKS = """const picks = async (id) => { document.querySelector(`.npc[data-npc="${id}"]`).click(); for (let i = 0; i < 60 && !document.querySelector('.talk'); i++) await wait(100); await wait(300);
    const b = [...document.querySelectorAll('.talk-picks button')].map((x) => x.textContent.trim()); TALK.close && TALK.close(); document.querySelectorAll('.talk').forEach((x) => x.remove()); return b; };"""

def test_the_owners_offer_work_when_it_is_open(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + PICKS + """ state.town.done = { cn1: '2026-11-01', cn2: '2026-11-01', cnw: '2026-11-01', cn3: '2026-11-01', cn4: '2026-11-01' };
      kana(4); location.hash = '#/chinadori'; route(); await wait(400); const out = { four: await picks('zhang') };
      kana(5); route(); await wait(400); out.five = await picks('zhang');
      kana(46); location.hash = '#/chinatown'; route(); await wait(400); out.wang = await picks('wang');
      return JSON.stringify(out); })()"""))
    assert 'はたらく' not in r['four'] and 'はたらく' in r['five'] and 'おしゃべりする' in r['five'], r
    assert 'はたらく' in r['wang'] and 'ちゅうもんする' in r['wang'], r

def test_the_board_lists_the_four_jobs(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + """ kana(15); location.hash = '#/chinadori'; route(); await wait(300);
      WORK.board(yard()); await wait(100); const card = document.querySelector('.wk-board'), rows = [...card.querySelectorAll('.wk-job')].map((x) => [x.dataset.job, x.classList.contains('ok')]);
      const text = card.textContent; CLASS.close();
      state.work.res['2026-11-10'] = { place: 'counter', done: 4, score: {} }; WORK.board(yard()); const today = document.querySelector('.wk-board').textContent; CLASS.close();
      return JSON.stringify({ rows, text, today }); })()"""))
    assert r['rows'] == [['shelf', True], ['counter', True], ['deliver', False], ['buns', False]], r
    assert all(w in r['text'] for w in ['整理貨架', '站櫃', '外送', '包包子', '30', '46']) and '今天' in r['today'] and '站櫃' in r['today'], r

def test_chen_asks_at_five_kana(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + """ const ids = () => TOWNEV.due().map((e) => e.id).filter((id) => id.startsWith('cn'));
      state.town.done = { cn1: '2026-11-01' }; kana(5); const before = ids();
      state.town.done.cn2 = '2026-11-02'; kana(4); const four = ids(); kana(5); const five = ids();
      return JSON.stringify({ before, four, five }); })()"""))
    assert 'cnw' not in r['before'] and 'cnw' not in r['four'] and r['five'][0] == 'cnw', r

def test_the_generator_has_the_street_lines(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + """ const all = talkLines().map(([w, l]) => w + ':' + l);
      return JSON.stringify(['zhang:…いらっしゃい。はたらく？', 'zhou:あら、いらっしゃい。てつだって くれる？', 'huang:はやく！ でまえ、てつだって！', 'zhang:ラベルを よく みて。', 'chen:ねえ、バイト しない？'].filter((x) => !all.includes(x))); })()"""))
    assert r == [], r

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
