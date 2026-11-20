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

# みなと駅のホーム (spec §3): through 駅前's 改札 up to the platform, down its stairs back; ハル at her stall by day only
def test_platform_way_in_and_out(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + """ location.hash = '#/station'; route(); await wait(400); const out = {};
      document.querySelector('.use-btn[data-use="gate"]').click(); for (let i = 0; i < 80 && location.hash !== '#/platform'; i++) await wait(100);
      out.up = location.hash; await wait(500); out.haru = Boolean(document.querySelector('.npc-haru'));
      document.querySelector('.way-btn[data-to="station"]').click(); for (let i = 0; i < 80 && location.hash !== '#/station'; i++) await wait(100); out.down = location.hash;
      TOWNEV.clock = { h: 21, day: new Date(2026, 10, 10) }; location.hash = '#/platform'; route(); await wait(400); out.night = Boolean(document.querySelector('.npc-haru'));
      return JSON.stringify(out); })()"""))
    assert r == {'up': '#/platform', 'haru': True, 'down': '#/station', 'night': False}, r

# a train in on 1番線 (to 白鷺, its LED says so), stopped with its doors open, then away; then one on 2番線 (to みなと港)
def test_platform_trains_come_and_go(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + """ PLATFORM.speed = 12; location.hash = '#/platform'; route(); const out = { seen: [] };
      for (let i = 0; i < 120; i++) { await wait(50); const n = PLATFORM.now(), g = document.querySelector('.pf-near'); const k = n ? n.track + n.phase + (n.phase === 'stop' ? (document.querySelector(`.pf-train[data-track="${n.track}"]`).classList.contains('open') ? '+open' : '') : '') : '-';
        if (out.seen[out.seen.length - 1] !== k) out.seen.push(k); if (n && n.track === 1 && n.phase === 'stop') out.led = g.textContent.includes('白鷺'); }
      PLATFORM.speed = 1; return JSON.stringify(out); })()"""))
    s = r['seen']
    assert '1in' in s and '1stop+open' in s and '1out' in s and '2in' in s and s.index('1in') < s.index('1stop+open') < s.index('1out') < s.index('2in'), r
    assert r['led'], r

# ---- 駅弁の立ち売り (spec §4) ----
# what a passenger wants follows the unit: one tea before m2, hot and cold after; one to three of a thing, at most two things; three
# trains of 3, 3 and 4, nobody twice on a train
def test_bento_orders_follow_the_unit(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + """ const ids = (o) => o.items.map(([id]) => id), out = {};
      state.currentUnit = 'm1'; out.goods1 = BENTO.goods().map((g) => g[0]); let a = []; for (let i = 0; i < 20; i++) a = a.concat(BENTO.make().flat());
      state.currentUnit = 'm2'; out.goods2 = BENTO.goods().map((g) => g[0]); let c = [], trains = []; for (let i = 0; i < 20; i++) { const m = BENTO.make(); trains.push(m.map((t) => t.length).join()); c = c.concat(m.flat()); if (m.some((t) => new Set(t.map((o) => o.who)).size !== t.length)) out.twice = true; }
      out.hot1 = a.some((o) => ids(o).some((x) => /tea_/.test(x))); out.plain2 = c.some((o) => ids(o).includes('tea')); out.hot2 = c.some((o) => ids(o).includes('tea_hot')) && c.some((o) => ids(o).includes('tea_cold'));
      out.counts = [...new Set(c.flatMap((o) => o.items.map(([, n]) => n)))].sort(); out.most = Math.max(...c.map((o) => o.items.length)); out.trains = [...new Set(trains)];
      out.lines = c.slice(0, 3).map((o) => o.line); return JSON.stringify(out); })()"""))
    assert 'tea' in r['goods1'] and 'tea_hot' not in r['goods1'] and 'tea_hot' in r['goods2'] and 'tea_cold' in r['goods2'] and 'tea' not in r['goods2'], r
    assert not r['hot1'] and not r['plain2'] and r['hot2'] and r['counts'] == [1, 2, 3] and r['most'] <= 2 and r['trains'] == ['3,3,4'] and not r.get('twice'), r

def test_bento_counter_readings(b):
    r = json.loads(ev(b, "JSON.stringify([1, 2, 3].map((n) => BENTO.said('tea', n)).concat([1, 2, 3].map((n) => BENTO.said('onigiri', n)), [BENTO.said('tea_hot', 2), BENTO.said('paper', 1)]))"))
    assert r == ['お{茶|ちゃ}を {一本|いっぽん}', 'お{茶|ちゃ}を {二本|にほん}', 'お{茶|ちゃ}を {三本|さんぼん}', 'おにぎりを {一|ひと}つ', 'おにぎりを {二|ふた}つ', 'おにぎりを {三|みっ}つ', 'あたたかい お{茶|ちゃ}を {二本|にほん}', '{新聞|しんぶん}を'], r

# a shift driven by hand: each train's windows served by tapping them, taking what they want and どうぞ — one wrong first on the
# second train (a miss), one left unserved on the third (lost when it goes); ten tasks, paid for the job (120) and the grade
BENTO_HELP = """ window.speak = () => Promise.resolve(); window.speakAs = () => Promise.resolve(); JOBS.pat.scale = 0.03; s(); reg();
  state.work.res['2026-10-20'] = { place: 'bento', done: 10, score: {}, yen: 1, grade: 'C' };   // been before: no first word
  const card = () => document.querySelector('.wk-bento'), click = (q) => { const e = card() && card().querySelector(q); if (e) e.click(); return Boolean(e); };
  const calling = () => [...document.querySelectorAll('.wk-bento .bt-win.calling')].map((x) => Number(x.dataset.w));
  async function serve(w, wrong) {
    click(`.bt-win[data-w="${w}"]`); await wait(60); const o = BENTO_RUN.now().wins.find((x) => x.w === w).o;
    if (o.kind === 'have') { click(`.bt-reply[data-r="${o.has ? 'yes' : 'no'}"]`); await wait(80); }
    const items = BENTO_RUN.now().wins.find((x) => x.w === w).o.items;
    if (wrong) { click(`.bt-good[data-g="${items[0][0] === 'paper' ? 'water' : 'paper'}"]`); click('.bt-give'); await wait(60); click('.bt-hand [data-drop]'); }
    for (const [id, n] of items) for (let i = 0; i < n; i++) click(`.bt-good[data-g="${id}"]`);
    click('.bt-give'); await wait(60);
  }"""

def test_bento_shift_runs_three_trains(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + BENTO_HELP + """ location.hash = '#/platform'; route(); await wait(300); TOWNEV.clock = { h: 10, day: new Date(2026, 10, 10) };
      WORK.start(yard(), 'bento'); const out = { trains: [] };
      for (let t = 0; t < 3; t++) {
        for (let i = 0; i < 200 && !(BENTO_RUN.now() && BENTO_RUN.now().t === t && BENTO_RUN.now().phase === 'stop'); i++) await wait(30);
        const want = BENTO_RUN.now().wins.length; out.trains.push(want); let served = 0;
        for (let i = 0; i < 300 && served < (t === 2 ? want - 1 : want); i++) { const c = calling(); if (c.length) { await serve(c[0], t === 1 && served === 0); served++; } else await wait(30); }
      }
      for (let i = 0; i < 300 && WORK.today().yen === undefined; i++) await wait(30);
      const r = WORK.today(); out.score = r.score; out.yen = r.yen; out.grade = r.grade; document.querySelectorAll('.wk-result').forEach((x) => x.remove()); CLASS.close(); JOBS.pat.scale = 1;
      return JSON.stringify(out); })()"""))
    v = sorted(r['score'].values())
    assert r['trains'] == [3, 3, 4] and len(r['score']) == 10 and v == [0, 0, 0, 0, 0, 0, 0, 0, 1, 3], r
    assert r['grade'] == 'B' and r['yen'] == 143, r   # 8 of 10 at once (B 20) on 120, 2% more for 中華街's 一人前

# a shift left after the first train: taken up again at the second, its three passengers
def test_bento_resume(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + BENTO_HELP + """ location.hash = '#/platform'; route(); await wait(300); TOWNEV.clock = { h: 10, day: new Date(2026, 10, 10) };
      WORK.start(yard(), 'bento'); for (let i = 0; i < 200 && !(BENTO_RUN.now() && BENTO_RUN.now().phase === 'stop'); i++) await wait(30);
      let served = 0; for (let i = 0; i < 300 && served < 3; i++) { const c = calling(); if (c.length) { await serve(c[0]); served++; } else await wait(30); }
      await wait(100); CLASS.close(); await wait(100); const done = WORK.today().done;
      WORK.start(yard(), 'bento'); for (let i = 0; i < 200 && !(BENTO_RUN.now() && BENTO_RUN.now().phase === 'stop'); i++) await wait(30);
      const out = { done, t: BENTO_RUN.now().t, wins: BENTO_RUN.now().wins.length }; CLASS.close(); JOBS.pat.scale = 1; return JSON.stringify(out); })()"""))
    assert r == {'done': 3, 't': 1, 'wins': 3}, r

# ---- きっぷ売り場 (spec §5) ----
# the readings said: the hour (7 しちじ, 9 くじ, 14 じゅうよじ), the minutes (ふん／ぷん; 10 じゅっぷん)
def test_window_time_readings(b):
    r = json.loads(ev(b, "JSON.stringify({ m: [2, 10, 17, 25, 32, 40, 47, 55, 1, 6, 8].map(MADO.minKana), h: [7, 9, 14, 20].map((h) => MADO.HK[h]), mark: MADO.timeMark(10, 25) })"))
    assert r['m'] == ['にふん', 'じゅっぷん', 'じゅうななふん', 'にじゅうごふん', 'さんじゅうにふん', 'よんじゅっぷん', 'よんじゅうななふん', 'ごじゅうごふん', 'いっぷん', 'ろっぷん', 'はっぷん'], r
    assert r['h'] == ['しちじ', 'くじ', 'じゅうよじ', 'にじゅうじ'] and r['mark'] == '{10時25分|じゅうじにじゅうごふん}', r

# every answer is a thing on the wall: the fare to the station (its neighbours' the wrong ones), the next train that way by the
# clock (the other way's and the one after the wrong ones), the track, whether the 快速 stops, the sum for the tickets
def test_window_answers_come_from_the_wall(b):
    r = json.loads(ev(b, """JSON.stringify(['fare:kawaguchi', 'fare:shirasagi', 'next:shirasagi', 'next:minatoko', 'track:minatoko', 'stop:hanada', 'stop:kawaguchi', 'buy:okawa:1', 'buy:minatoko:0'].map((x) => { const [kind, to, kid] = x.split(':'), t = MADO.ask(kind, to, 10, 24, kid === '1');
      return [t.q[0], t.opts[t.right][0], t.opts.length, new Set(t.opts.map((o) => o[0])).size]; }))"""))
    want = [['{川口|かわぐち}まで いくらですか。', '{170円|ひゃくななじゅうえん}です。'], ['{白鷺|しらさぎ}まで いくらですか。', '{310円|さんびゃくじゅうえん}です。'],
            ['つぎの {白鷺|しらさぎ}{行|ゆ}きは {何時|なんじ}ですか。', '{10時25分|じゅうじにじゅうごふん}です。'], ['つぎの みなと{港|こう}{行|ゆ}きは {何時|なんじ}ですか。', '{10時32分|じゅうじさんじゅうにふん}です。'],
            ['みなと{港|こう}{行|ゆ}きは {何番線|なんばんせん}ですか。', '{二番線|にばんせん}です。'], ['この {快速|かいそく|快速}は {花田|はなだ}に {止|と}まりますか。', 'いいえ、{止|と}まりません。'],
            ['この {快速|かいそく|快速}は {川口|かわぐち}に {止|と}まりますか。', 'はい、{止|と}まります。'], ['{大川|おおかわ}まで、{大人|おとな} {一枚|いちまい}と {子|こ}ども {一枚|いちまい} ください。', 'ぜんぶで {390円|さんびゃくきゅうじゅうえん}です。'],
            ['みなと{港|こう}まで、{大人|おとな} {一枚|いちまい} ください。', '{140円|ひゃくよんじゅうえん}です。']]
    assert [x[:2] for x in r] == want, r
    assert all(x[2] == x[3] and x[2] >= 2 for x in r), r   # the replies all different

# ten people in a shift: the first plain (fares), every kind in it; a shift driven by hand, all right at once, paid 140 + S 50 + 2%
WIN_HELP = """ window.speak = () => Promise.resolve(); window.speakAs = () => Promise.resolve(); s(); reg(); state.currentUnit = 'm2';
  state.work.res['2026-10-21'] = { place: 'window', done: 10, score: {}, yen: 1, grade: 'C' };
  const card = () => document.querySelector('.wk-window'), click = (q) => { const e = card() && card().querySelector(q); if (e) e.click(); return Boolean(e); };"""

def test_window_shift_by_hand(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + WIN_HELP + """ location.hash = '#/station'; route(); await wait(300); TOWNEV.clock = { h: 10, day: new Date(2026, 10, 10) };
      const kinds = MADO.make(10, 24).map((t) => t.kind); WORK.start(yard(), 'window'); const out = { kinds };
      for (let n = 0; n < 10; n++) { for (let i = 0; i < 200 && !(MADO_RUN.now() && MADO_RUN.now().phase === 'ask' && MADO_RUN.now().k === n); i++) await wait(30);
        const t = MADO_RUN.now().task; if (t.kind === 'buy') { click(`.md-st[data-st="${t.to}"]`); await wait(80); } click(`.md-opt[data-o="${t.right}"]`); await wait(60); }
      for (let i = 0; i < 300 && WORK.today().yen === undefined; i++) await wait(30);
      const x = WORK.today(); out.score = Object.values(x.score); out.yen = x.yen; document.querySelectorAll('.wk-result').forEach((e) => e.remove()); CLASS.close(); return JSON.stringify(out); })()"""))
    assert r['kinds'][:2] == ['fare', 'fare'] and set(r['kinds']) == {'fare', 'next', 'track', 'stop', 'buy'}, r
    assert r['score'] == [0] * 10 and r['yen'] == 194, r

# a wrong station tapped for tickets, a wrong reply: misses; two and the right one lights; a shift left after three resumes at the fourth
def test_window_misses_and_resume(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + WIN_HELP + """ location.hash = '#/station'; route(); await wait(300); TOWNEV.clock = { h: 10, day: new Date(2026, 10, 10) };
      WORK.start(yard(), 'window'); const out = {}, at = (n) => MADO_RUN.now() && MADO_RUN.now().phase === 'ask' && MADO_RUN.now().k === n;
      for (let i = 0; i < 200 && !at(0); i++) await wait(30); let t = MADO_RUN.now().task; const bad = [0, 1, 2].filter((i) => i !== t.right && i < t.opts.length);
      click(`.md-opt[data-o="${bad[0]}"]`); await wait(60); click(`.md-opt[data-o="${bad[1] === undefined ? bad[0] : bad[1]}"]`); await wait(60); out.lit = card().querySelector('.md-opt.wk-hint').dataset.o === String(t.right);
      click(`.md-opt[data-o="${t.right}"]`); for (const n of [1, 2]) { for (let i = 0; i < 200 && !at(n); i++) await wait(30); t = MADO_RUN.now().task; if (t.kind === 'buy') { click(`.md-st[data-st="${t.to}"]`); await wait(80); } click(`.md-opt[data-o="${t.right}"]`); }
      await wait(200); CLASS.close(); await wait(100); out.score = WORK.today().score;
      WORK.start(yard(), 'window'); for (let i = 0; i < 200 && !(MADO_RUN.now() && MADO_RUN.now().phase === 'ask'); i++) await wait(30); out.k = MADO_RUN.now().k; CLASS.close();
      return JSON.stringify(out); })()"""))
    assert r['lit'] and r['score'] == {'0': 2, '1': 0, '2': 0} and r['k'] == 3, r

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
