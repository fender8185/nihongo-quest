"""2026-11-20 駅前の打工 (docs/superpowers/specs/2026-11-20-ekimae-work-design.md): the N5 work area — open once the 打工證 (one for all areas, 2026-11-22) is
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
# (打工證 經驗 20: ベテラン, 駅前 open, 4% more pay); stub(job): a job's runner caught (its ctx in __ctx, nothing drawn)
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
    assert r['ok'] == 1 and '打工證：' in r['text2'] and '駅前打工證' not in r['text2'] and r['china'], r   # one card for all the areas (2026-11-22)

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
      fares: ['minatoko', 'byoin', 'koen', 'daigaku', 'shirasagi'].map((s) => [EKI.fare('minato', s), EKI.fare('minato', s, true)]), back: EKI.fare('shirasagi', 'minato'), far: EKI.fare('shirasagi', 'minatoko'),
      rapid: EKI.stops('快速', 'shirasagi'), local: EKI.stops('普通', 'shirasagi'), port: EKI.stops('快速', 'minatoko'), names: [EKI.name('koen'), EKI.kana('koen')] })"""))
    assert r['at'] == [['10:25', '快速', 'shirasagi', 1], ['10:32', '普通', 'minatoko', 2], ['10:40', '普通', 'shirasagi', 1], ['10:47', '快速', 'minatoko', 2]], r
    assert r['late'] == [['6:02', 'minatoko']], r
    assert r['fares'] == [[140, 70], [170, 80], [220, 110], [260, 130], [310, 150]] and r['back'] == 310 and r['far'] == 350, r
    assert r['rapid'] == ['byoin', 'shirasagi'] and r['local'] == ['byoin', 'koen', 'daigaku', 'shirasagi'] and r['port'] == ['minatoko'], r
    assert r['names'] == ['公園前', 'こうえんまえ'], r

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
    assert r['grade'] == 'B' and r['yen'] == 146, r   # 8 of 10 at once (B 20) on 120, 4% more: 中華街's four S, 經驗 20 (ベテラン)

# the card shut the moment the last passenger has theirs (before the train goes): the shift paid all the same; and one all done but
# never paid (an older build, the app gone) paid when tapped again, ハル gone home or not (2026-11-22, the review: after 19 時 never)
def test_bento_paid_when_shut_at_the_end(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + BENTO_HELP + """ location.hash = '#/platform'; route(); await wait(300); TOWNEV.clock = { h: 10, day: new Date(2026, 10, 10) };
      WORK.start(yard(), 'bento'); const out = {};
      for (let t = 0; t < 3; t++) {
        for (let i = 0; i < 200 && !(BENTO_RUN.now() && BENTO_RUN.now().t === t && BENTO_RUN.now().phase === 'stop'); i++) await wait(30);
        const want = BENTO_RUN.now().wins.length; let served = 0;
        for (let i = 0; i < 300 && served < want; i++) { const c = calling(); if (c.length) { await serve(c[0]); served++; } else await wait(30); }
      }
      CLASS.close(); await wait(1500); out.yen = WORK.today().yen; document.querySelectorAll('.wk-result').forEach((x) => x.remove());
      const d = Object.keys(state.work.res).find((k) => state.work.res[k] === WORK.today()); state.work.res[d] = { place: 'bento', done: 10, score: Object.fromEntries([...Array(10).keys()].map((k) => [k, 0])) };
      TOWNEV.clock = { h: 21, day: new Date(2026, 10, 10) }; out.can = WORK.can('bento').ok; WORK.start(yard(), 'bento'); await wait(300); out.late = WORK.today().yen;
      state.work.res[d] = { place: 'bento', done: 3, score: { 0: 0, 1: 0, 2: 0 } }; out.half = WORK.can('bento').ok;
      document.querySelectorAll('.wk-result').forEach((x) => x.remove()); JOBS.pat.scale = 1; return JSON.stringify(out); })()"""))
    assert r['yen'] and r['can'] and r['late'] and not r['half'], r

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
    assert r['h'] == ['しちじ', 'くじ', 'じゅうよじ', 'にじゅうじ'] and r['mark'] == '{10時25分|じゅうじ にじゅうごふん}', r

# every answer is a thing on the wall: the fare to the station (its neighbours' the wrong ones), the next train that way by the
# clock (the other way's and the one after the wrong ones), the track, whether the 快速 stops, the sum for the tickets
def test_window_answers_come_from_the_wall(b):
    r = json.loads(ev(b, """JSON.stringify(['fare:byoin', 'fare:shirasagi', 'next:shirasagi', 'next:minatoko', 'track:minatoko', 'stop:koen', 'stop:byoin', 'buy:daigaku:1', 'buy:minatoko:0'].map((x) => { const [kind, to, kid] = x.split(':'), t = MADO.ask(kind, to, 10, 24, kid === '1');
      return [t.q[0], t.opts[t.right][0], t.opts.length, new Set(t.opts.map((o) => o[0])).size]; }))"""))
    want = [['{病院|びょういん}{前|まえ}まで いくらですか。', '{170円|ひゃくななじゅうえん}です。'], ['{白鷺|しらさぎ}まで いくらですか。', '{310円|さんびゃくじゅうえん}です。'],
            ['つぎの {白鷺|しらさぎ}{行|ゆ}きは {何時|なんじ}ですか。', '{10時25分|じゅうじ にじゅうごふん}です。'], ['つぎの みなと{港|こう}{行|ゆ}きは {何時|なんじ}ですか。', '{10時32分|じゅうじ さんじゅうにふん}です。'],
            ['みなと{港|こう}{行|ゆ}きは {何番線|なんばんせん}ですか。', '{二番線|にばんせん}です。'], ['{白鷺|しらさぎ}{行|ゆ}きの {快速|かいそく|快速}は {公園|こうえん}{前|まえ}に {止|と}まりますか。', 'いいえ、{止|と}まりません。'],
            ['{白鷺|しらさぎ}{行|ゆ}きの {快速|かいそく|快速}は {病院|びょういん}{前|まえ}に {止|と}まりますか。', 'はい、{止|と}まります。'], ['{大学|だいがく}{前|まえ}まで、{大人|おとな} {一枚|いちまい}と {子|こ}ども {一枚|いちまい} ください。', 'ぜんぶで {390円|さんびゃくきゅうじゅうえん}です。'],
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
    assert r['score'] == [0] * 10 and r['yen'] == 198, r   # 140 + S 50, 4% more

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

# ---- 落とし物 (spec §7) ----
# a thing described by two of its looks joined with くて／で (茶色, 緑: で); the 中に line with あります (m3) or 入って います (m4)
def test_lost_descriptions(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + """ const d = (o) => LOST.describe(o); const out = [d({ kind: 'wallet', color: 'black', dim: 'small' }), d({ kind: 'bag', color: 'brown', dim: 'big' }), d({ kind: 'umbrella', color: 'red', dim: 'big' }),
      d({ kind: 'glasses', color: 'black', dim: 'round' }), d({ kind: 'hat', color: 'white', dim: 'old' }), d({ kind: 'book', color: 'green', dim: 'small' })];
      state.currentUnit = 'm3'; out.push(LOST.inside(['card', 'photo'])); state.currentUnit = 'm4'; out.push(LOST.inside(['card', 'photo'])); return JSON.stringify(out); })()"""))
    assert r == ['{黒|くろ}くて、{小|ちい}さい {財布|さいふ}です。', '{茶色|ちゃいろ}で、{大|おお}きい かばんです。', '{赤|あか}くて、{大|おお}きい {傘|かさ}です。', '{丸|まる}くて、{黒|くろ}い {眼鏡|めがね}です。',
                 '{白|しろ}くて、{古|ふる}い {帽子|ぼうし}です。', '{緑|みどり}で、{小|ちい}さい {本|ほん}です。', '{中|なか}に カードと {写真|しゃしん}が あります。', '{中|なか}に カードと {写真|しゃしん}が {入|はい}って います。'], r

# a shift's ten: each a different thing; four on the counter of its kind, the colour and the other look crossed — one right (a twin:
# two that look so, the inside tells), or none (ありません); each wrong one shares a look with what was asked for; never two the same
# but a twin's (2026-11-22, the review: the camera had two colours, so two alike sat on the counter)
def test_lost_candidates_need_both_looks(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + """ state.currentUnit = 'm4'; const out = { bad: [], kinds: [], types: {} };
      for (let n = 0; n < 30; n++) { const ts = LOST.make(); out.kinds.push(new Set(ts.map((t) => t.kind)).size);
        ts.forEach((t) => { out.types[t.type] = (out.types[t.type] || 0) + 1; const same = (c) => c.color === t.color && c.dim === t.dim, match = t.cands.filter(same);
          if (t.cands.length !== 4 || t.cands.some((c) => c.kind !== t.kind)) out.bad.push('four ' + t.kind);
          if (t.type === 'plain' && match.length !== 1) out.bad.push('plain ' + match.length);
          if (t.type === 'twin' && (match.length !== 2 || match[0].inside.join() === match[1].inside.join() || !match.some((c) => c.inside.join() === t.inside.join()))) out.bad.push('twin');
          if ((t.type === 'none' || t.type === 'gag') && match.length) out.bad.push('none');
          if (t.cands.some((c) => !same(c) && c.color !== t.color && c.dim !== t.dim)) out.bad.push('far');
          if (t.type !== 'twin' && new Set(t.cands.map((c) => c.color + c.dim)).size !== 4) out.bad.push('alike ' + t.kind); }); }
      return JSON.stringify(out); })()"""))
    assert not r['bad'] and set(r['kinds']) == {10}, r
    assert r['types'].get('twin', 0) > 0 and r['types'].get('none', 0) > 0 and r['types'].get('plain', 0) > 150, r

LOST_HELP = """ window.speak = () => Promise.resolve(); window.speakAs = () => Promise.resolve(); window.voiceFx = () => Promise.resolve(); s(); reg(); state.currentUnit = 'm4';
  state.work.res['2026-10-22'] = { place: 'lost', done: 10, score: {}, yen: 1, grade: 'C' };
  const card = () => document.querySelector('.wk-lost'), click = (q) => { const e = card() && card().querySelector(q); if (e) e.click(); return Boolean(e); };
  const at = (n) => LOST_RUN.now() && LOST_RUN.now().k === n;
  // a question (what, where, look, inside) asked; asks(): each one not yet told, till the four are out
  const ask = async (q) => { click(`.lf-q[data-q="${q}"]`); for (let i = 0; i < 200 && LOST_RUN.now().phase === 'tell'; i++) await wait(30); };
  const asks = async () => { for (let g = 0; g < 5 && ['ask', 'ask2'].includes(LOST_RUN.now().phase); g++) await ask([...card().querySelectorAll('.lf-q')].map((x) => x.dataset.q).find((q) => !LOST_RUN.now().know[q])); };
  async function solve(n) {
    for (let i = 0; i < 200 && !(at(n) && LOST_RUN.now().phase === 'ask'); i++) await wait(30); const t = LOST_RUN.now().task; await asks();
    if (t.type === 'none') { click('.lf-none'); return; } if (t.type === 'gag') { click('.lf-gag'); return; }
    const c = t.cands.findIndex((x) => x.color === t.color && x.dim === t.dim && x.inside.join() === t.inside.join()); click(`.lf-cand[data-c="${c}"]`); await wait(40); click('.lf-give');
  }"""

def test_lost_shift_by_hand(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + LOST_HELP + """ location.hash = '#/station'; route(); await wait(300); TOWNEV.clock = { h: 10, day: new Date(2026, 10, 10) };
      WORK.start(yard(), 'lost'); for (let n = 0; n < 10; n++) await solve(n);
      for (let i = 0; i < 300 && WORK.today().yen === undefined; i++) await wait(30);
      const x = WORK.today(), out = { score: Object.values(x.score), yen: x.yen }; document.querySelectorAll('.wk-result').forEach((e) => e.remove()); CLASS.close(); return JSON.stringify(out); })()"""))
    assert r['score'] == [0] * 10 and r['yen'] == 218, r   # 160 + S 50, 4% more

# the wrong one handed over, ありません when it is there: misses; a shift left after three resumes at the fourth
def test_lost_misses_and_resume(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + LOST_HELP + """ location.hash = '#/station'; route(); await wait(300); TOWNEV.clock = { h: 10, day: new Date(2026, 10, 10) };
      const realMake = LOST.make; LOST.make = () => { const ts = realMake(); ts[0] = LOST.task('wallet', 'plain', 'both'); return ts; };
      WORK.start(yard(), 'lost'); for (let i = 0; i < 200 && !(at(0) && LOST_RUN.now().phase === 'ask'); i++) await wait(30); let t = LOST_RUN.now().task;
      await ask('what'); await ask('look'); for (let i = 0; i < 200 && LOST_RUN.now().phase !== 'find'; i++) await wait(30);
      const wrong = t.cands.findIndex((x) => !(x.color === t.color && x.dim === t.dim)); click(`.lf-cand[data-c="${wrong}"]`); await wait(40); click('.lf-give'); await wait(80);
      click('.lf-none'); await wait(80); const c = t.cands.findIndex((x) => x.color === t.color && x.dim === t.dim); click(`.lf-cand[data-c="${c}"]`); await wait(40); click('.lf-give');
      await solve(1); await solve(2); await wait(200); LOST.make = realMake; CLASS.close(); await wait(100); const score = WORK.today().score;
      WORK.start(yard(), 'lost'); for (let i = 0; i < 200 && !(LOST_RUN.now() && LOST_RUN.now().phase === 'ask'); i++) await wait(30); const k = LOST_RUN.now().k; CLASS.close();
      return JSON.stringify({ score, k }); })()"""))
    assert r['score'] == {'0': 3, '1': 0, '2': 0} and r['k'] == 3, r   # what it is asked when it was said, the wrong wallet, ありません: three misses

# ruling 22: with the test site's 無限次數 a shift begun again at once — an ended one's goodbye, still being said, never acts on the new
# card of the same job: 原田's window and 小林's lost and found each keep their new card up, their own first customer at the counter
def test_an_ended_shifts_goodbye_never_touches_the_next_card(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + LOST_HELP + """ state.currentUnit = 'm4'; localStorage.setItem('nq_work_free', '1');
      window.speakAs = () => new Promise((ok) => setTimeout(ok, 300)); location.hash = '#/station'; route(); await wait(300); TOWNEV.clock = { h: 10, day: new Date(2026, 10, 10) };
      const out = {}, last = (job) => { state.work.res['2026-11-10'] = { place: job, done: 9, score: Object.fromEntries(Array.from({ length: 9 }, (_, k) => [k, 0])) }; saveState(); };
      last('window'); WORK.start(yard(), 'window'); for (let i = 0; i < 200 && !(MADO_RUN.now() && MADO_RUN.now().phase === 'ask' && MADO_RUN.now().k === 9); i++) await wait(30);
      const t = MADO_RUN.now().task, w = document.querySelector('.wk-window');
      if (t.kind === 'buy') { w.querySelector(`.md-st[data-st="${t.to}"]`).click(); await wait(80); } w.querySelector(`.md-opt[data-o="${t.right}"]`).click();
      for (let i = 0; i < 100 && WORK.today().yen === undefined; i++) await wait(20);
      await wait(200); CLASS.close(); WORK.start(yard(), 'window'); await wait(4500);   // the old one's goodbye, still being said, ran out meanwhile
      out.window = [Boolean(document.querySelector('.wk-window')), MADO_RUN.now() && MADO_RUN.now().k, !document.querySelector('.wk-window .wk-cust.bye')];
      CLASS.close(); document.querySelectorAll('.wk-result').forEach((e) => e.remove());
      last('lost'); WORK.start(yard(), 'lost'); await solve(9); for (let i = 0; i < 200 && WORK.today().yen === undefined; i++) await wait(30);
      await wait(200); CLASS.close(); WORK.start(yard(), 'lost'); await wait(4500);
      out.lost = [Boolean(document.querySelector('.wk-lost')), LOST_RUN.now() && LOST_RUN.now().k, !document.querySelector('.wk-lost .wk-cust.bye')];
      CLASS.close(); document.querySelectorAll('.wk-result').forEach((e) => e.remove()); localStorage.removeItem('nq_work_free'); return JSON.stringify(out); })()"""))
    assert r == {'window': [True, 0, True], 'lost': [True, 0, True]}, r

# M-2 (spec §5): a customer at 原田's window who gives up waiting goes — the question shown whole in their bubble, their leaving line
# popping up beside it (never over it), the right reply lit
def test_a_window_customer_who_leaves_shows_the_question(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + WIN_HELP + """ location.hash = '#/station'; route(); await wait(300); TOWNEV.clock = { h: 10, day: new Date(2026, 10, 10) };
      WORK.start(yard(), 'window'); for (let i = 0; i < 200 && !(MADO_RUN.now() && MADO_RUN.now().phase === 'ask' && card().querySelector('.md-opt')); i++) await wait(30);
      const t = MADO_RUN.now().task; JOBS.pat.scale = 0.02; for (let i = 0; i < 300 && MADO_RUN.now().phase !== 'done'; i++) await wait(30); await wait(120); JOBS.pat.scale = 1;
      const c = card().querySelector('.wk-cust'), bub = c.querySelector('.wk-bub').textContent, grr = [...c.querySelectorAll('.wk-grr')].map((g) => g.textContent).join('|'), lit = card().querySelector('.md-opt.wk-hint');
      const out = { q: bub.includes(t.q[1]), over: /いいです/.test(bub), grr: /いいです/.test(grr), lit: Boolean(lit) && Number(lit.dataset.o) === t.right }; CLASS.close(); return JSON.stringify(out); })()"""))
    assert r == {'q': True, 'over': False, 'grr': True, 'lit': True}, r

# ---- タクシー (spec §8) ----
# left and right as the taxi faces (going down the map, 右 is the map's left); the shortest way; what a passenger says for it —
# つぎの角, 二つ目の角 (the first crossing straight on), まっすぐ, あの〜の前で止めて
def test_taxi_turns_and_instructions(b):
    r = json.loads(ev(b, """JSON.stringify({ turns: [TAXI.turn(2, 'right'), TAXI.turn(0, 'left'), TAXI.turn(1, 'right'), TAXI.turn(3, 'straight')],
      r1: TAXI.route([1, 2], 0, [2, 2]), r2: TAXI.route([1, 2], 0, [2, 1]), r3: TAXI.route([1, 2], 0, [1, 0]),
      i1: TAXI.instructions(['right', 'stop'], 'hotel').map((x) => [x.at, x.line[0]]), i2: TAXI.instructions(['straight', 'right', 'stop'], 'cafe').map((x) => [x.at, x.line[0]]),
      i3: TAXI.instructions(['straight', 'straight', 'stop'], 'school').map((x) => [x.at, x.line[0]]) })"""))
    assert r['turns'] == [3, 3, 2, 3], r
    assert r['r1'] == ['right', 'stop'] and r['r2'] == ['straight', 'right', 'stop'] and r['r3'] == ['straight', 'straight', 'stop'], r
    assert r['i1'] == [[0, 'つぎの {角|かど}を {右|みぎ}に {曲|ま}がって ください。'], [1, 'あの ホテルの {前|まえ}で {止|と}めて ください。']], r
    assert r['i2'] == [[0, '{二|ふた}つ{目|め}の {角|かど}を {右|みぎ}に {曲|ま}がって ください。'], [2, 'あの {喫茶店|きっさてん}の {前|まえ}で {止|と}めて ください。']], r
    assert r['i3'] == [[0, 'まっすぐ {行|い}って ください。'], [2, 'あの {学校|がっこう}の {前|まえ}で {止|と}めて ください。']], r

TAXI_HELP = """ window.speak = () => Promise.resolve(); window.speakAs = () => Promise.resolve(); JOBS.pat.scale = 0.03; TAXI.tips = false; s(); reg(); state.currentUnit = 'm4';
  state.work.res['2026-10-23'] = { place: 'taxi', done: 5, score: {}, yen: 1, grade: 'C' };
  const card = () => document.querySelector('.wk-taxi'), click = (q) => { const e = card() && card().querySelector(q); if (e && !e.disabled) e.click(); return Boolean(e && !e.disabled); };
  const now = () => TAXI_RUN.now();
  async function choose() {   // the next right choice: the passenger's (told) or the way to where they go
    const n = now(); const ch = n.ride.guided ? n.want : TAXI.route(n.at, n.h, TAXI.where(n.ride.to))[0]; click(`.tx-go[data-ch="${ch}"]`); }
  async function ride(k) {
    for (let i = 0; i < 400 && !(now() && now().k === k && now().phase === 'drive'); i++) await wait(20);
    for (let i = 0; i < 2000 && now().k === k && now().phase === 'drive'; i++) { if (now().choosing) await choose(); await wait(15); }
    for (let i = 0; i < 400 && !(now().k === k && now().phase === 'pay'); i++) await wait(20); click(`.tx-pay[data-o="${now().payRight}"]`);
  }"""

def test_taxi_shift_by_hand(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + TAXI_HELP + """ location.hash = '#/station'; route(); await wait(300); TOWNEV.clock = { h: 10, day: new Date(2026, 10, 10) };
      const kinds = TAXI.make().map((x) => x.guided); WORK.start(yard(), 'taxi'); for (let k = 0; k < 5; k++) await ride(k);
      for (let i = 0; i < 400 && WORK.today().yen === undefined; i++) await wait(20);
      for (let i = 0; i < 400 && !document.querySelector('.wk-result'); i++) await wait(20);
      const x = WORK.today(), out = { kinds, score: Object.values(x.score), yen: x.yen, result: Boolean(document.querySelector('.wk-result')), card: Boolean(document.querySelector('.wk-taxi')) }; document.querySelectorAll('.wk-result').forEach((e) => e.remove()); CLASS.close(); JOBS.pat.scale = 1; return JSON.stringify(out); })()"""))
    assert r['kinds'] == [True, True, True, False, False], r
    assert r['result'] and not r['card'], r   # the taxi's card shut once the last has gone: the results not under it (2026-11-22, the user)
    assert r['score'] == [0] * 5 and r['yen'] == 239, r   # 180 + S 50, 4% more; no おつり in the test

# a wrong turn: the passenger stops it (a miss), the taxi stays, told again; nothing chosen at a crossing: straight on (a miss when
# a turn was wanted); a shift left after two rides takes up at the third
def test_taxi_wrong_turns_and_resume(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + TAXI_HELP + """ location.hash = '#/station'; route(); await wait(300); TOWNEV.clock = { h: 10, day: new Date(2026, 10, 10) };
      const realMake = TAXI.make; TAXI.make = () => { const rs = realMake(); rs[0] = TAXI.ride('super', true, 'nishimura'); rs[1] = TAXI.ride('hotel', true, 'sophia', true); return rs; };
      WORK.start(yard(), 'taxi'); const out = {};
      for (let i = 0; i < 400 && !(now() && now().choosing); i++) await wait(20); out.want0 = now().want; click('.tx-go[data-ch="left"]'); await wait(200); out.still = now().at.join(); out.again = now().want;
      for (let i = 0; i < 2000 && now().k === 0 && now().phase === 'drive'; i++) { if (now().choosing) await choose(); await wait(15); }
      for (let i = 0; i < 400 && now().phase !== 'pay'; i++) await wait(20); click(`.tx-pay[data-o="${now().payRight}"]`);
      for (let i = 0; i < 400 && !(now().k === 1 && now().choosing); i++) await wait(20); out.want1 = now().want; out.at1 = now().at.join();   // 二つ目: straight here, let it time out
      for (let i = 0; i < 600 && now().k === 1 && now().at.join() === out.at1; i++) await wait(20);
      for (let i = 0; i < 2000 && now().k === 1 && now().phase === 'drive'; i++) { if (now().choosing) await choose(); await wait(15); }
      for (let i = 0; i < 400 && now().phase !== 'pay'; i++) await wait(20); click(`.tx-pay[data-o="${now().payRight}"]`); await wait(300);
      TAXI.make = realMake; CLASS.close(); await wait(100); out.score = WORK.today().score;
      WORK.start(yard(), 'taxi'); for (let i = 0; i < 400 && !(now() && now().phase === 'drive'); i++) await wait(20); out.k = now().k; CLASS.close(); JOBS.pat.scale = 1;
      return JSON.stringify(out); })()"""))
    assert r['want0'] == 'right' and r['still'] == '1,3' and r['again'] == 'right', r
    assert r['want1'] == 'straight' and r['score'] == {'0': 1, '1': 0} and r['k'] == 2, r   # 二つ目's first crossing straight on by itself: no miss

# ---- 券売機 and the train (spec §9) ----
# arrive(to): off at the end of the line, walked in (a click on the way in would race his walk)
RIDE_HELP = """ window.speak = () => Promise.resolve(); window.speakAs = () => Promise.resolve(); RIDE.speed = 25; RIDE.keep(null); state.purse.gift = 1000; saveState();
  const card = (c) => document.querySelector(c), click = (q) => { const e = document.querySelector(q); if (e && !e.disabled) e.click(); return Boolean(e && !e.disabled); };
  async function arrive(to) { for (let i = 0; i < 400 && !(RIDE.now() && RIDE.now().phase === 'end'); i++) await wait(20); click('.rd-off'); for (let i = 0; i < 100 && location.hash !== to; i++) await wait(50); await wait(900); }"""

# the fare pressed and the money in: a ticket (from みなと, 310) and 310 円 gone; too little money: none
def test_ticket_machine_sells_by_fare(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + RIDE_HELP + """ location.hash = '#/station'; route(); await wait(300); const out = {};
      RIDE.machine(yard(), 'minato'); await wait(100); out.fares = [...document.querySelectorAll('.kb-fare')].map((x) => Number(x.dataset.f));
      click('.kb-fare[data-f="310"]'); await wait(60); click('.kb-pay'); await wait(300); out.ticket = RIDE.ticket(); out.left = yenBalance(); CLASS.close();
      state.purse.gift = 0; state.purse.spent = {}; saveState(); RIDE.keep(null); RIDE.machine(yard(), 'minato'); await wait(100); click('.kb-fare[data-f="140"]'); await wait(60); click('.kb-pay'); await wait(300);
      out.none = RIDE.ticket(); out.said = document.querySelector('.kb-screen').textContent; CLASS.close(); return JSON.stringify(out); })()"""))
    assert r['fares'] == [140, 170, 220, 260, 310, 350, 420], r   # みなと線's five, and やまなみ線's 森下 350 and 湯の花 420 past 白鷺 (2026-11-23, test_onsen.py)
    assert r['ticket']['from'] == 'minato' and r['ticket']['fare'] == 310 and r['left'] == 690, r
    assert r['none'] is None and 'たりません' in r['said'], r

# aboard at みなと's platform: no ticket, no ride; with one, to 白鷺 by every stop (つぎは…), off at the castle, the ticket used up
def test_ride_to_shirasagi(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + RIDE_HELP + """ location.hash = '#/platform'; route(); await wait(300); const out = { said: [] };
      RIDE.board(yard(), 1); await wait(200); out.without = Boolean(RIDE.now());
      RIDE.keep({ from: 'minato', fare: 310, day: todayStr() }); window.speakAs = (w, l) => { if (w === 'ann') out.said.push(l); return Promise.resolve(); };
      RIDE.board(yard(), 1); await wait(100); out.to = RIDE.now() && RIDE.now().to; await arrive('#/castle');
      out.at = location.hash; out.ticket = RIDE.ticket(); out.left = yenBalance(); return JSON.stringify(out); })()"""))
    assert not r['without'] and r['to'] == 'shirasagi' and r['at'] == '#/castle' and r['ticket'] is None and r['left'] == 1000, r
    assert r['said'][-1].startswith('{終点|しゅうてん|終點}、{白鷺|しらさぎ}です。'), r   # 白鷺 is the end of the line
    assert [l for l in r['said'] if l.startswith('つぎは')] == ['つぎは {病院|びょういん}{前|まえ}、{病院|びょういん}{前|まえ}です。', 'つぎは {公園|こうえん}{前|まえ}、{公園|こうえん}{前|まえ}です。', 'つぎは {大学|だいがく}{前|まえ}、{大学|だいがく}{前|まえ}です。', 'つぎは {白鷺|しらさぎ}、{白鷺|しらさぎ}です。'], r

# back from 白鷺 to みなと: みなと is not the end of the line (みなと港 is) — its own arrival, no 終点 (2026-11-22, the review); 白鷺 is
def test_ride_home_is_not_the_end(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + RIDE_HELP + """ location.hash = '#/castle'; route(); await wait(400); const out = { said: [] };
      window.speakAs = (w, l) => { if (w === 'ann') out.said.push(l); return Promise.resolve(); };
      RIDE.machine(yard(), 'shirasagi'); await wait(100); click('.kb-fare[data-f="310"]'); await wait(60); click('.kb-pay'); await wait(200); click('.kb-ride');
      for (let i = 0; i < 400 && !(RIDE.now() && RIDE.now().phase === 'end'); i++) await wait(20); out.led = document.querySelector('.rd-card').textContent; await arrive('#/platform');
      out.last = out.said[out.said.length - 1]; out.end = TOWN.EKI.ride.end[0]; return JSON.stringify(out); })()"""))
    assert r['last'] == 'みなと、みなとです。お{忘れ物|わすれもの|遺失物}の ないように ご{注意|ちゅうい|注意} ください。' and '終点' not in r['led'], r
    assert r['end'].startswith('{終点|しゅうてん|終點}、'), r

# a ticket short of the end: the rest paid there (乗り越し精算: 170 to 白鷺's 310); back from 白鷺 by its station's sign, home to みなと's platform
def test_ride_short_ticket_and_back(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + RIDE_HELP + """ location.hash = '#/platform'; route(); await wait(300); const out = {};
      RIDE.keep({ from: 'minato', fare: 170, day: todayStr() }); RIDE.board(yard(), 1); for (let i = 0; i < 400 && !(RIDE.now() && RIDE.now().phase === 'end'); i++) await wait(20);
      out.short = document.querySelector('.rd-card').textContent.includes('140'); await arrive('#/castle'); out.paid = yenBalance();
      document.querySelector('.eki-btn[data-act="eki-sign"]').click(); for (let i = 0; i < 100 && !document.querySelector('.kb-card'); i++) await wait(50);
      out.here = document.querySelector('.kb-card').dataset.here; click('.kb-fare[data-f="310"]'); await wait(60); click('.kb-pay'); await wait(200); click('.kb-ride'); await arrive('#/platform');
      out.home = location.hash; out.left = yenBalance(); return JSON.stringify(out); })()"""))
    assert r['short'] and r['paid'] == 860 and r['here'] == 'shirasagi' and r['home'] == '#/platform' and r['left'] == 550, r

# ---- the final review's findings (2026-11-21) ----
# the last train 22:40 (原田's word); the next train counted from the minute after; the station's own board on the timetable
def test_review_timetable_ends_and_next_minute(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + """ const u = PLACE_USE.station.find((x) => x.id === 'board'); const real = (sceneHour() - wakeOff() + 24) % 24; localStorage.setItem('nq_wake', JSON.stringify({ day: todayStr(), off: ((10.4 - real) % 24 + 24) % 24 }));
      const out = { late: EKI.next(22, 41, 1).map((x) => x.t), last: EKI.next(22, 30, 3).map((x) => x.t), board: u.toast() }; const t10 = MADO.ask('next', 'shirasagi', 10, 10); out.at10 = t10.opts.map((o) => o[0]); out.right = t10.right;
      localStorage.removeItem('nq_wake'); out.at10r = out.at10[out.right]; return JSON.stringify(out); })()"""))
    assert r['late'] == ['6:02'] and r['last'] == ['22:32', '22:40', '6:02'], r
    assert '10:25' in r['board'] and '白鷺' in r['board'] and '10:30' not in r['board'], r
    assert '10時25分' in r['at10r'], r

# the ticket machine: お金を入れる twice takes the fare once
def test_review_ticket_machine_charges_once(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + RIDE_HELP + """ location.hash = '#/station'; route(); await wait(300);
      RIDE.machine(yard(), 'minato'); await wait(100); click('.kb-fare[data-f="310"]'); await wait(60); click('.kb-pay'); await wait(100); document.querySelector('.kb-pay').click(); await wait(200);
      const out = { left: yenBalance(), ticket: document.querySelector('.kb-ticket').textContent }; CLASS.close(); return JSON.stringify(out); })()"""))
    assert r['left'] == 690 and '310円' in r['ticket'] and '→ 0円' not in r['ticket'], r   # the ticket the fare paid (2026-11-22: it said 0円)

# 2026-11-22, the user: お金を 入れる's kana and kanji out of line — a button's label one piece (a ruby a flex item of its own sat
# lower, the gap between the pieces): the machine's buttons, the taxi's four
ONE = """ const one = (b) => [...b.childNodes].filter((n) => n.nodeType === 1 ? !n.matches('small') : n.textContent.trim()).length === 1; """
def test_review_ruby_buttons_are_one_piece(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + RIDE_HELP + ONE + """ location.hash = '#/station'; route(); await wait(300);
      RIDE.machine(yard(), 'shirasagi'); await wait(100); click('.kb-fare'); await wait(60); const out = { pay: one(document.querySelector('.kb-pay')) };
      click('.kb-pay'); await wait(100); out.ride = one(document.querySelector('.kb-ride')); CLASS.close();
      return JSON.stringify(out); })()"""))
    assert r == {'pay': True, 'ride': True}, r
    r = json.loads(ev(b, "(async () => { " + BEGIN + TAXI_HELP + ONE + """ location.hash = '#/station'; route(); await wait(300); TOWNEV.clock = { h: 10, day: new Date(2026, 10, 10) };
      WORK.start(yard(), 'taxi'); for (let i = 0; i < 400 && !(now() && now().choosing); i++) await wait(20);
      const out = [...document.querySelectorAll('.tx-go')].map(one); CLASS.close(); JOBS.pat.scale = 1; return JSON.stringify(out); })()"""))
    assert r == [True] * 4, r

# the window's numbers are read, not matched: the replies with a price or a time are in kana only
def test_review_window_numbers_in_kana(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + WIN_HELP + """ location.hash = '#/station'; route(); await wait(300); TOWNEV.clock = { h: 10, day: new Date(2026, 10, 10) };
      const realMake = MADO.make; MADO.make = (h, m) => { const t = realMake(h, m); t[0] = MADO.ask('next', 'shirasagi', h, m); t[0].who = 'nakamura'; t[1] = MADO.ask('fare', 'koen', h, m); t[1].who = 'ai'; return t; };
      WORK.start(yard(), 'window'); for (let i = 0; i < 200 && !(MADO_RUN.now() && MADO_RUN.now().phase === 'ask'); i++) await wait(30);
      const a = [...card().querySelectorAll('.md-opt')].map((x) => x.textContent); click(`.md-opt[data-o="${MADO_RUN.now().task.right}"]`);
      for (let i = 0; i < 200 && !(MADO_RUN.now() && MADO_RUN.now().k === 1 && MADO_RUN.now().phase === 'ask'); i++) await wait(30);
      const f = [...card().querySelectorAll('.md-opt')].map((x) => x.textContent), names = [...card().querySelectorAll('.md-st')].map((x) => [x.querySelector('.md-nm').textContent, Boolean(x.querySelector('.md-rd').textContent)]);
      MADO.make = realMake; CLASS.close(); return JSON.stringify({ a, f, names }); })()"""))
    assert all(not any(c.isdigit() for c in t) for t in r['a'] + r['f']), r
    # past the first shift the chart's names stand bare (N5 words, read), all but 白鷺 (鷺 past N5: its reading always shown)
    assert dict(r['names']) == {'白鷺': True, '大学前': False, '公園前': False, '病院前': False, 'みなと': False, 'みなと港': False}, r['names']
    assert any('じゅうじ' in t for t in r['a']) and any('ひゃく' in t for t in r['f']), r

# a keeper whose job is not open yet still takes the reply, and says what is missing
def test_review_keeper_says_what_is_missing(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + """ reg(); location.hash = '#/station'; route(); await wait(300); TOWNEV.clock = { h: 10, day: new Date(2026, 10, 10) }; const said = []; window.toast = (m) => said.push(m);
      const out = { offer: WORK.offer('harada', 'station') }; WORK.intro(yard(), 'window'); out.said = said.join(' '); return JSON.stringify(out); })()"""))
    assert r['offer'] == 'window' and '一人前' in r['said'], r

# bento: a window's call waits for the order being heard (each line 600 ms; no すみません！ begins inside one)
def test_review_bento_calls_wait_for_the_order(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + BENTO_HELP + """ const log = []; window.speakAs = (w, l) => { const t = performance.now(); log.push([Math.round(t), w, l]); return new Promise((ok) => setTimeout(ok, 600)); };
      JOBS.pat.scale = 0.1; location.hash = '#/platform'; route(); await wait(300); TOWNEV.clock = { h: 10, day: new Date(2026, 10, 10) }; WORK.start(yard(), 'bento');
      for (let i = 0; i < 300 && !calling().length; i++) await wait(20); const w = calling()[0]; click(`.bt-win[data-w="${w}"]`); const t0 = performance.now(); await wait(2500);
      const order = log.find((x) => x[0] >= t0 - 5 && x[2] !== 'すみません！'); const cut = log.filter((x) => order && x[0] > order[0] && x[0] < order[0] + 590);
      CLASS.close(); JOBS.pat.scale = 1; return JSON.stringify({ order, cut }); })()"""))
    assert r['order'] and r['cut'] == [], r

# taxi: a shift's rides go on from where the last left off, so some turns come facing down or left the map — at least one in the
# told rides; a crossing told 曲がらないで: 鈴木 guesses a turn, so letting it go is a miss
def test_review_taxi_turns_face_every_way_and_dont_is_tested(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + TAXI_HELP + """ const out = { chained: true, reversed: 0 };
      for (let n = 0; n < 30; n++) { const rs = TAXI.make(); rs.forEach((x, k) => { if (k && (x.from.join() !== rs[k - 1].end.join())) out.chained = false; });
        if (rs.filter((x) => x.guided).some((x) => { let h = x.h0, p = x.from.slice(); return x.path.some((ch) => { if (ch === 'stop') return false; const turning = ch !== 'straight' && (h === 2 || h === 3); h = TAXI.turn(h, ch); p = TAXI.step(p, h); return turning; }); })) out.reversed++; }
      location.hash = '#/station'; route(); await wait(300); TOWNEV.clock = { h: 10, day: new Date(2026, 10, 10) }; state.currentUnit = 'm5';
      const realMake = TAXI.make; TAXI.make = () => { const rs = realMake(); rs[0] = TAXI.ride('cafe', true, 'nishimura'); return rs; };   // the station up to 喫茶店: one crossing straight on, then stop
      WORK.start(yard(), 'taxi'); for (let i = 0; i < 400 && !(now() && now().lean); i++) await wait(20); out.line = (now().ride.lines[0] || {}).line; out.lean = now().lean;
      for (let i = 0; i < 400 && now().k === 0 && now().at.join() === '1,3'; i++) await wait(20); for (let i = 0; i < 2000 && now().k === 0 && now().phase === 'drive'; i++) { if (now().choosing) await choose(); await wait(15); }
      for (let i = 0; i < 400 && now().phase !== 'pay'; i++) await wait(20); out.miss = now().miss; TAXI.make = realMake; CLASS.close(); JOBS.pat.scale = 1; return JSON.stringify(out); })()"""))
    assert r['chained'] and r['reversed'] >= 25, r
    assert r['line'][0] == 'つぎの {角|かど}は {曲|ま}がらないで ください。' and r['lean'] in ('left', 'right') and r['miss'] == 1, r   # his guess taken once, then straight on

# lost-and-found: 源三's glasses — ありません is true too (no miss); a twin needs 中に何がありますか asked; the Chinese reads well
def test_review_lost_gag_twin_and_chinese(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + LOST_HELP + """ location.hash = '#/station'; route(); await wait(300); TOWNEV.clock = { h: 10, day: new Date(2026, 10, 10) };
      const out = { zh: [LOST.zhOf({ kind: 'bag', color: 'brown', dim: 'big' }), LOST.zhOf({ kind: 'glasses', color: 'black', dim: 'round' })], umb: TOWN.EKI.lost.kinds.umbrella[3] };
      const realMake = LOST.make; LOST.make = () => { const ts = realMake(); ts[0] = LOST.task('glasses', 'gag'); ts[1] = LOST.task('wallet', 'twin', 'both'); return ts; };
      WORK.start(yard(), 'lost'); for (let i = 0; i < 200 && !(at(0) && LOST_RUN.now().phase === 'ask'); i++) await wait(30); let t = LOST_RUN.now().task;
      await asks(); click('.lf-none');
      for (let i = 0; i < 200 && !(at(1) && LOST_RUN.now().phase === 'ask'); i++) await wait(30); t = LOST_RUN.now().task; await ask('look');
      for (let i = 0; i < 200 && !['ask2', 'find'].includes(LOST_RUN.now().phase); i++) await wait(30); out.ask2 = LOST_RUN.now().phase; out.q2 = [...card().querySelectorAll('.lf-q')].map((x) => x.dataset.q);
      out.q2ja = card().querySelector('.lf-q[data-q="inside"]').textContent; const known = out.q2.find((q) => q !== 'inside'); await ask(known); out.phase2 = LOST_RUN.now().phase;
      out.score = WORK.today().score; LOST.make = realMake; CLASS.close(); return JSON.stringify(out); })()"""))
    assert r['zh'] == ['咖啡色的大包包', '黑色的圓形眼鏡'] and r['umb'] == ['big', 'small'], r
    assert r['score'].get('0') == 0 and r['ask2'] == 'ask2' and '中' in r['q2ja'], r
    # what is in it asked beside two things already told (no 多少錢／喜歡嗎 any more): one of those asked again a miss
    assert len(r['q2']) == 3 and 'inside' in r['q2'] and not {'price', 'like'} & set(r['q2']) and r['phase2'] == 'ask2', r

# 2026-11-22, the user: the first question was always どんな…ですか (the other two plainly wrong) — nothing learned. Now what someone
# says first varies (what and where, only what, only where) and the hero asks what was not said: 何を／どこに／どんな; one already told
# is a miss (小林: それは もう 聞きましたよ). The bubble, opened after two misses, shows only what was said, never the looks before asked
def test_lost_asks_what_was_not_said(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + LOST_HELP + """ location.hash = '#/station'; route(); await wait(300); TOWNEV.clock = { h: 10, day: new Date(2026, 10, 10) };
      const heard = []; window.speakAs = (who, l) => { heard.push([who, l]); return Promise.resolve(); };
      const realMake = LOST.make; LOST.make = () => { const ts = realMake(); ts[0] = LOST.task('wallet', 'plain', 'what'); ts[1] = LOST.task('umbrella', 'plain', 'where'); ts[2] = LOST.task('hat', 'plain', 'both'); return ts; };
      WORK.start(yard(), 'lost'); for (let i = 0; i < 200 && !(at(0) && LOST_RUN.now().phase === 'ask'); i++) await wait(30);
      const out = {}, said = (who) => heard.filter((h) => h[0] === who).map((h) => h[1]), qs = () => [...card().querySelectorAll('.lf-q')].map((x) => x.dataset.q).sort().join();
      let t = LOST_RUN.now().task; out.open0 = said(t.who).pop(); out.qs0 = qs(); out.look0 = card().querySelector('.lf-q[data-q="look"]').textContent;
      await ask('what'); out.miss0 = said('kobayashi').pop(); out.phase0 = LOST_RUN.now().phase;
      await ask('where'); out.me0 = said('hero').pop(); out.where0 = said(t.who).pop(); await ask('where');
      out.bub0 = card().querySelector('.wk-cust .wk-bub').textContent; out.desc0 = t.desc.replace(/\{([^|}]+)\|[^}]+\}/g, '$1');
      await ask('look'); out.phase0b = LOST_RUN.now().phase; await solve(0);
      for (let i = 0; i < 200 && !(at(1) && LOST_RUN.now().phase === 'ask'); i++) await wait(30); t = LOST_RUN.now().task;
      out.open1 = said(t.who).pop(); out.look1 = card().querySelector('.lf-q[data-q="look"]').textContent; await ask('look'); out.me1 = said('hero').pop(); out.phase1 = LOST_RUN.now().phase; await solve(1);
      for (let i = 0; i < 200 && !(at(2) && LOST_RUN.now().phase === 'ask'); i++) await wait(30); t = LOST_RUN.now().task; out.open2 = said(t.who).pop(); await solve(2);
      const ls = []; LOST_RUN.lines((who, l) => ls.push(who + ' ' + l));
      out.lines = ['hero {何|なに}を {忘|わす}れましたか。', 'hero どこに {忘|わす}れましたか。', 'hero どんな ものですか。', 'kobayashi それは もう {聞|き}きましたよ。',
        'nakamura {財布|さいふ}です。', 'nakamura バスに {忘|わす}れました。', 'nakamura すみません。{財布|さいふ}を {忘|わす}れました。', 'umeko すみません。{公園|こうえん}に {忘れ物|わすれもの}を しました。'].filter((l) => !ls.includes(l));
      out.gone = ['あれ？ ちがいましたか。'].filter((l) => ls.some((x) => x.endsWith(l)));
      out.score = WORK.today().score; LOST.make = realMake; CLASS.close(); return JSON.stringify(out); })()"""))
    assert r['open0'] == 'すみません。{財布|さいふ}を {忘|わす}れました。' and r['qs0'] == 'look,what,where' and '財布' in r['look0'], r
    assert r['miss0'] == 'それは もう {聞|き}きましたよ。' and r['phase0'] == 'ask', r   # 財布 was said: asking what it is again is a miss
    assert r['me0'] == 'どこに {忘|わす}れましたか。' and r['where0'].endswith('に {忘|わす}れました。'), r
    assert r['desc0'] not in r['bub0'] and '財布' in r['bub0'] and r['phase0b'] == 'find', r   # two misses: what was said shown, not the looks
    assert r['open1'].startswith('すみません。') and '{忘れ物|わすれもの}を しました。' in r['open1'] and 'もの' in r['look1'] and '傘' not in r['look1'], r
    assert r['me1'] == 'どんな ものですか。' and r['phase1'] == 'find', r   # its looks tell what it is too: the four out
    assert r['open2'].endswith('{帽子|ぼうし}を {忘|わす}れました。') and 'に' in r['open2'], r
    assert r['score'] == {'0': 2, '1': 0, '2': 0} and r['lines'] == [] and r['gone'] == [], r

# what this round writes survives the app's start (normalizeState, 2026-11-22, the review): a gift's day (else offered again each
# reload), a shift's keep (the taxi's おつり, 外場's stars) till paid; the taxi's meter voiced to 2,900 円 (a lost ride runs long)
def test_review_state_kept_and_meter_voiced(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + """ const n = normalizeState(JSON.parse(JSON.stringify(Object.assign(defaultState(), { purse: { spent: {}, book: {}, gifts: { tamago: '2026-11-22', bad: 5 } },
        work: { res: { '2026-11-22': { place: 'taxi', done: 2, score: { 0: 0, 1: 0 }, keep: { tip: 20 } }, '2026-11-21': { place: 'taxi', done: 5, score: {}, yen: 100, grade: 'S', keep: { tip: 5 } } } } }))));
      const ls = []; TAXI_RUN.lines((who, l) => ls.push(who + ' ' + l));
      return JSON.stringify({ gifts: n.purse.gifts, keep: n.work.res['2026-11-22'].keep, paid: 'keep' in n.work.res['2026-11-21'], meter: ls.includes('hero ' + TOWN.WORK.say.taxi.pay[0].replace('{P}', YEN.priceMark(2900))) }); })()"""))
    assert r == {'gifts': {'tamago': '2026-11-22'}, 'keep': {'tip': 20}, 'paid': False, 'meter': True}, r


# 2026-11-22, the user: the station sells what nowhere else does — ハル's 駅弁 at her stall (while she is there; ordered from her
# too), the platform's machine of hot cans; each drawn, had its own way (chopsticks from the box, a can tipped), on the platform,
# with more to say than the town's (four looks, seven words after); 美食手帳 has their pages
def test_station_food_sold_on_the_platform(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + """ s(); location.hash = '#/platform'; route(); await wait(300); TOWNEV.clock = { h: 10, day: new Date(2026, 10, 10) };
      const thing = (id) => PLACE_USE.platform.find((t) => t.id === id), M = TOWN.MENU, items = (m) => M[m].items.map((it) => [it[0], it[3]]);
      const out = { here: [thing('ekiben').when(), thing('stall').when()], sells: Boolean(YEN.sells(yard(), 'haru')), vend: thing('vend').buy, ekiben: items('ekiben'), evend: items('evend'),
        pics: M.ekiben.items.concat(M.evend.items).every((it) => YEN.pic(it).includes('<path')), ways: ['sakanaben', 'makunouchi', 'reitomikan', 'cornsoup', 'oshiruko'].map((id) => EATSCENE.way(M.ekiben.items.concat(M.evend.items).find((it) => it[0] === id))),
        where: [YEN.where('ekiben'), YEN.where('evend')], bg: EATSCENE.BG.includes('platform'),
        lines: M.ekiben.items.concat(M.evend.items).map((it) => [it[4].look.length, it[4].say.length]),
        pages: (() => { const d = document.createElement('div'); d.innerHTML = YEN.book(); d.querySelectorAll('rt').forEach((x) => x.remove()); return [...d.querySelectorAll('.fb-menu h4')].map((h) => h.textContent); })() };   // each page's name as read, its furigana off
      TOWNEV.clock = { h: 21, day: new Date(2026, 10, 10) }; out.late = [thing('ekiben').when(), thing('stall').when()];
      return JSON.stringify(out); })()"""))
    assert r['here'] == [True, False] and r['sells'] and r['late'] == [False, True], r   # ハル 7–19 at her stall
    assert r['vend'] == 'evend' and r['ekiben'] == [['sakanaben', 800], ['makunouchi', 800], ['reitomikan', 300]] and r['evend'] == [['cornsoup', 130], ['oshiruko', 130]], r
    assert r['pics'] and r['ways'] == ['chop', 'chop', 'bite', 'tip', 'tip'] and r['where'] == ['platform', 'platform'] and r['bg'], r
    assert all(lk >= 4 and sy >= 7 for lk, sy in r['lines']), r['lines']
    assert '駅の みなと弁当' in r['pages'] and '駅の 自動販売機' in r['pages'], r['pages']   # their own pages (the town's machine is the page named 自動販売機)

# 2026-11-22, the user: a food or two not bought but given — ハル's 玉子焼き for 「おなかが すきました…」 picked in her talk (once a
# day), 原田's 白鷺まんじゅう once a shift at the window is graded S (its results put away); each had at once, stamped into 美食手帳
# (もらったもの, its hint before it is had). The window opens at unit m2: left at m1, WORK.start only toasts why not and the stubbed
# runner never runs (__ctx undefined)
def test_gifts_for_a_word_and_for_an_s(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + """ s(); reg(); window.speakAs = () => Promise.resolve(); location.hash = '#/platform'; route(); await wait(400); TOWNEV.clock = { h: 10, day: new Date(2026, 10, 10) }; route(); await wait(400);
      const out = { before: YEN.book().includes('？？？') };
      const talkTo = async (id) => { document.querySelector(`.npc[data-npc="${id}"]`).click(); for (let i = 0; i < 60 && !document.querySelector('.talk'); i++) await wait(100); await wait(300); };
      const through = async () => { for (let i = 0; i < 40 && !document.querySelector('.eat-scene'); i++) { const t = document.querySelector('.talk'); if (t) t.click(); await wait(150); } return Boolean(document.querySelector('.eat-scene')); };
      await talkTo('haru'); const p = document.querySelector('.talk [data-go="gift"]'); out.pick = p ? p.textContent.trim() : null; if (p) p.click(); await wait(200);
      out.ate = await through(); out.what = (document.querySelector('.eat-scene .es-name') || {}).textContent; document.querySelectorAll('.eat-scene').forEach((x) => x.remove());
      out.book = Boolean(state.purse.book.tamagoyaki); TALK.close(); document.querySelectorAll('.talk').forEach((x) => x.remove()); await talkTo('haru'); out.again = Boolean(document.querySelector('.talk [data-go="gift"]')); TALK.close(); document.querySelectorAll('.talk').forEach((x) => x.remove());
      location.hash = '#/station'; route(); await wait(400); state.currentUnit = 'm2'; stub('window');
      WORK.start(yard(), 'window'); await wait(300); for (let k = 0; k < 10; k++) __ctx.right(k, 0); __ctx.finish(); await wait(300);
      document.querySelector('.wk-result .crr-ok').click(); await wait(300); out.harada = Boolean(document.querySelector('.talk')); out.ate2 = await through();
      out.what2 = (document.querySelector('.eat-scene .es-name') || {}).textContent; document.querySelectorAll('.eat-scene').forEach((x) => x.remove()); out.book2 = Boolean(state.purse.book.shirasagimanju);
      out.page = YEN.book(); return JSON.stringify(out); })()"""))
    assert r['before'] and r['pick'] == 'おなかが すきました…' and r['ate'] and 'たまごやき' in r['what'] and r['book'] and not r['again'], r
    assert r['harada'] and r['ate2'] and 'まんじゅう' in r['what2'] and r['book2'] and 'もらったもの' in r['page'] and '非賣品' in r['page'], r

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
