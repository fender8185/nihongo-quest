"""2026-11-20 駅前の打工 (docs/superpowers/specs/2026-11-20-ekimae-work-design.md): the N5 work area — open once 中華街's 打工證 is
一人前, each job by the unit studied (駅弁 m1, きっぷ売り場 m2, 落とし物 m3, タクシー m4); its 求人看板 on 駅前's square."""
import json, os, subprocess, sys, time
sys.path.insert(0, os.path.dirname(__file__))
from cdp import Browser
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
PORT = 8834
URL = f"http://127.0.0.1:{PORT}/"
READY = "typeof state === 'object' && !!state.updatedAt && typeof speakScript === 'function'"

def ev(b, js, pre=()):
    return b.run([("nav", URL), ("wait", READY)] + list(pre) + [("eval", js)])[-1]

# a learner past 入門 (unit m1), no work yet, the town's clock at noon on a weekday (鈴木 at lunch: 10 o'clock where the taxi counts); s(): 中華街's four jobs each with an S shift
# (its 打工證 一人前); stub(job): a job's runner caught (its ctx in __ctx, nothing drawn)
BEGIN = """state.storyV = 99; state.startChosen = true; state.introSeen = true; state.stage = 'main'; state.kanaKnown = true; state.currentUnit = 'm1'; state.completedUnits = [];
  state.town = { done: {}, seen: {}, stops: { station: '2026-11-01' }, talks: {} }; state.koto.found = {}; state.purse = { spent: {}, book: {} }; state.cruise = { done: {}, on: null, res: {} }; state.work = { res: {} };
  ['nq_work_free', 'nq_work_eki', 'nq_work_nums'].forEach((k) => localStorage.removeItem(k));
  TOWNEV.clock = { h: 12, day: new Date(2026, 10, 10) }; saveState(); DAILY_CACHE = null;
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const s = () => ['buns', 'counter', 'waiter', 'till'].forEach((j, k) => { state.work.res['2026-10-0' + (k + 1)] = { place: j, done: 10, score: {}, yen: 1, grade: 'S' }; });
  const stub = (job) => { WORK.register(job, { run: (ctx) => { window.__ctx = ctx; }, lines: () => {} }); state.work.res['2026-01-01'] = { place: job, done: 1, score: { 0: 0 } }; };
  const yard = () => document.querySelector('.yard');
  const reg = () => ['bento', 'window', 'lost', 'taxi'].forEach((j) => { if (!WORK.has(j)) WORK.register(j, { run: (ctx) => { window.__ctx = ctx; }, lines: () => {} }); });"""
EKI = "['bento', 'window', 'lost', 'taxi']"

def test_ekimae_opens_after_chinatown_and_by_unit(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + """ TOWNEV.clock = { h: 10, day: new Date(2026, 10, 10) }; const out = {}, open = () => """ + EKI + """.filter((j) => WORK.can(j).ok).join(',');
      out.before = open(); out.why = WORK.can('bento').why; s();
      for (const u of ['m1', 'm2', 'm3', 'm4', 'm6']) { state.currentUnit = u; out[u] = open(); }
      state.currentUnit = 'm1'; out.unitWhy = WORK.can('taxi').why;
      return JSON.stringify(out); })()"""))
    assert r['before'] == '' and '中華街' in r['why'] and '一人前' in r['why'], r
    assert (r['m1'], r['m2'], r['m3'], r['m4'], r['m6']) == ('bento', 'bento,window', 'bento,window,lost', 'bento,window,lost,taxi', 'bento,window,lost,taxi'), r
    assert '第' in r['unitWhy'] or 'm4' in r['unitWhy'] or '單元' in r['unitWhy'], r

def test_the_test_site_switch_opens_ekimae(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + """ TOWNEV.clock = { h: 10, day: new Date(2026, 10, 10) }; window.onTestSite = () => true; const said = WORK.ekiTool();
      const out = { said, open: """ + EKI + """.filter((j) => WORK.can(j).ok).join(',') }; WORK.ekiTool(); out.after = """ + EKI + """.filter((j) => WORK.can(j).ok).join(',');
      return JSON.stringify(out); })()"""))
    assert r['open'] == 'bento,window,lost,taxi' and r['after'] == '' and '駅前' in r['said'], r

def test_ekimae_jobs_keep_their_hours(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + """ s(); state.currentUnit = 'm6'; const out = {};
      for (const h of [6, 9, 13, 16, 20]) { TOWNEV.clock = { h, day: new Date(2026, 10, 10) }; out[h] = """ + EKI + """.filter((j) => WORK.can(j).ok).join(','); }
      return JSON.stringify(out); })()"""))
    assert r['9'] == 'bento,window,lost,taxi' and r['13'] == 'bento,window,lost', r   # 鈴木 at lunch in the 食堂 12–15
    assert r['16'] == 'bento,window,lost,taxi' and r['6'] == '' and r['20'] == 'window,lost', r   # ハル 7–19, the window 7–21, 小林's counter 8–22

def test_ekimae_board_lists_four_jobs(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + """ reg(); location.hash = '#/station'; route(); await wait(200); WORK.board('ekimae'); await wait(100);
      const c = document.querySelector('.wk-board'), out = { rows: c.querySelectorAll('.wk-job').length, text: c.textContent };
      CLASS.close(); s(); WORK.board('ekimae'); await wait(100); const d = document.querySelector('.wk-board'); out.ok = d.querySelectorAll('.wk-job.ok').length; out.text2 = d.textContent; CLASS.close();
      WORK.board(); await wait(100); out.china = document.querySelector('.wk-board').textContent.includes('包包子');
      return JSON.stringify(out); })()"""))
    assert r['rows'] == 4 and '中華街' in r['text'] and '一人前' in r['text'], r
    assert r['ok'] == 1 and '駅前打工證' in r['text2'] and r['china'], r

def test_the_station_has_a_board_to_tap(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + """ location.hash = '#/station'; route(); await wait(300);
      const u = (PLACE_USE.station || []).find((x) => x.id === 'jobs'); return JSON.stringify({ use: Boolean(u), btn: Boolean(document.querySelector('.use-btn[data-use="jobs"]')) }); })()"""))
    assert r['use'] and r['btn'], r

def test_the_keepers_offer_their_jobs_at_the_station(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + """ s(); state.currentUnit = 'm6'; reg();
      return JSON.stringify([WORK.offer('harada', 'station'), WORK.offer('kobayashi', 'station'), WORK.offer('suzuki', 'station'), WORK.offer('haru', 'platform'), WORK.offer('harada', 'platform')]); })()"""))
    assert r == ['window', 'lost', 'taxi', 'bento', None], r

# a job whose runner is not in yet (the stages before it are on the test site): not offered by its keeper
def test_a_job_not_built_yet_is_not_offered(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + """ s(); state.currentUnit = 'm6'; const built = """ + EKI + """.filter((j) => WORK.has(j));
      return JSON.stringify({ built, offers: """ + EKI + """.filter((j) => !built.includes(j)).map((j) => WORK.offer(WORK.PLACES[j].who, WORK.PLACES[j].place)) }); })()"""))
    assert all(o is None for o in r['offers']), r

# みなと線 (spec §6): the next trains from みなと by the clock (the day's first after the last), fares by the distance (子ども half,
# under 10 円 dropped), the 快速's stops
def test_timetable_fares_and_stops(b):
    r = json.loads(ev(b, """JSON.stringify({ at: EKI.next(10, 24, 4).map((x) => [x.t, x.kind, x.to, x.track]), late: EKI.next(22, 58, 1).map((x) => [x.t, x.to]),
      fares: ['minatoko', 'kawaguchi', 'hanada', 'okawa', 'shirasagi'].map((s) => [EKI.fare('minato', s), EKI.fare('minato', s, true)]), back: EKI.fare('shirasagi', 'minato'), far: EKI.fare('shirasagi', 'minatoko'),
      rapid: EKI.stops('快速', 'shirasagi'), local: EKI.stops('普通', 'shirasagi'), port: EKI.stops('快速', 'minatoko'), names: [EKI.name('hanada'), EKI.kana('hanada')] })"""))
    assert r['at'] == [['10:25', '快速', 'shirasagi', 1], ['10:32', '普通', 'minatoko', 2], ['10:40', '普通', 'shirasagi', 1], ['10:47', '快速', 'minatoko', 2]], r
    assert r['late'] == [['6:02', 'minatoko']], r
    assert r['fares'] == [[140, 70], [170, 80], [220, 110], [260, 130], [310, 150]] and r['back'] == 310 and r['far'] == 350, r
    assert r['rapid'] == ['kawaguchi', 'shirasagi'] and r['local'] == ['kawaguchi', 'hanada', 'okawa', 'shirasagi'] and r['port'] == ['minatoko'], r
    assert r['names'] == ['花田', 'はなだ'], r

def test_the_station_board_runs_the_timetable(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + """ const real = (sceneHour() - wakeOff() + 24) % 24; localStorage.setItem('nq_wake', JSON.stringify({ day: todayStr(), off: ((10.4 - real) % 24 + 24) % 24 }));
      location.hash = '#/station'; route(); await wait(300); const t = document.querySelector('.station-land .fx-scroll text').textContent; localStorage.removeItem('nq_wake'); return JSON.stringify(t); })()"""))
    assert '10:25 快速 白鷺' in r and '10:32 普通 みなと港' in r, r

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
