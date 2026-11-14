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
    assert r['talk'] and not r['ran'] and 'きいて' in r['text'], r

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

# ---- 整理貨架 (ふく, 張さん): a box's things to the shelf's cells by their labels ----
SHELF = """const earlier = (job) => { state.work.res['2026-01-01'] = { place: job, done: 1, score: { 0: 0 } }; };   // been there before: no first-day word
  const words = (ws) => ws.forEach((w) => { const v = REG.vocab.find((x) => x.w === w && x.lv === 'PRE_N5'); state.srs[v.key] = rec(); });
  const put = async (right) => { const item = document.querySelector('.wk-item').dataset.label, bins = [...document.querySelectorAll('.wk-bin')];
    (right ? bins.find((x) => x.dataset.label === item) : bins.find((x) => x.dataset.label !== item)).click(); await wait(right ? 600 : 300); };"""

def test_shelf_labels_come_from_what_is_seen(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + SHELF + """ kana(5);
      const t = JOBS.shelf.make(); return JSON.stringify({ n: t.length, all: [...new Set(t.flatMap((x) => [x.label, ...x.bins]))].sort().join(''), four: t.every((x) => x.bins.length === 4 && new Set(x.bins).size === 4 && x.bins.includes(x.label)) }); })()"""))
    assert r == {'n': 10, 'all': 'あいうえお', 'four': True}, r

# 2026-11-15, the user: a label beside the same label is only two like shapes, nothing Japanese — the thing's label is heard, not
# shown (🔊, tap to hear it again), printed once it is put away or after two misses
def test_the_shelf_label_is_heard_not_read(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + SHELF + """ kana(10); earlier('shelf'); window.__said = []; window.speak = (t) => { __said.push(t); return Promise.resolve(); }; window.speakAs = () => Promise.resolve();
      location.hash = '#/chinadori'; route(); await wait(300); WORK.start(yard(), 'shelf'); await wait(300);
      const item = () => document.querySelector('.wk-item'), label = item().dataset.label, out = { hidden: !item().textContent.includes(label), ear: Boolean(item().querySelector('.wk-ear')) };
      __said = []; item().querySelector('.wk-ear').click(); await wait(100); out.again = __said.includes(label);
      const wrong = [...document.querySelectorAll('.wk-bin')].find((x) => x.dataset.label !== label); wrong.click(); await wait(100); out.oneMiss = !item().textContent.includes(label);
      wrong.click(); await wait(100); out.twoMiss = item().textContent.includes(label);
      document.querySelector(`.wk-bin[data-label="${label}"]`).click(); await wait(500); const next = item().dataset.label;
      document.querySelector(`.wk-bin[data-label="${next}"]`).click(); await wait(60); out.shownOnRight = item().textContent.includes(next);
      return JSON.stringify(out); })()"""))
    assert r == {'hidden': True, 'ear': True, 'again': True, 'oneMiss': True, 'twoMiss': True, 'shownOnRight': True}, r

# heard, a look-alike beside it is no trap at all — so the cells hold what sounds alike too (す／つ, し／ち …), of what is seen
def test_shelf_cells_hold_sound_alikes(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + SHELF + """ kana(46);
      const ts = Array.from({ length: 40 }, () => JOBS.shelf.make()).flat(), of = (c) => ts.filter((t) => t.label === c);
      return JSON.stringify({ su: of('す').every((t) => t.bins.includes('つ')), shi: of('し').every((t) => t.bins.includes('ち')), seen: of('す').length > 0 && of('し').length > 0 }); })()"""))
    assert r == {'su': True, 'shi': True, 'seen': True}, r

def test_shelf_mixes_words_once_learned(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + SHELF + """ kana(46); words(['これ', 'それ', 'あれ', 'どれ', 'ここ']);
      const runs = Array.from({ length: 5 }, () => JOBS.shelf.make()), w = runs.flat().filter((x) => x.label.length > 1);
      return JSON.stringify({ some: w.length > 0, most: runs.every((t) => t.filter((x) => x.label.length > 1).length <= 5), binsWords: w.every((x) => x.bins.every((y) => y.length > 1)),
        known: w.every((x) => ['これ', 'それ', 'あれ', 'どれ', 'ここ'].includes(x.label)) }); })()"""))
    assert r == {'some': True, 'most': True, 'binsWords': True, 'known': True}, r

def test_a_shelf_shift_pays_and_grades(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + SHELF + """ kana(10); earlier('shelf'); window.speak = () => Promise.resolve(); window.speakAs = () => Promise.resolve();
      location.hash = '#/chinadori'; route(); await wait(300); WORK.start(yard(), 'shelf'); await wait(300); const out = { card: Boolean(document.querySelector('.wk-shelf')) };
      for (let k = 0; k < 9; k++) await put(true);
      await put(false); out.miss = document.querySelector('.wk-say').textContent; await put(false); out.hint = Boolean(document.querySelector('.wk-bin.wk-hint')); await put(true);
      for (let i = 0; i < 40 && !document.querySelector('.wk-result'); i++) await wait(100); const t = state.work.res['2026-11-10']; out.yen = t.yen; out.grade = t.grade; out.result = Boolean(document.querySelector('.wk-result'));
      return JSON.stringify(out); })()"""))
    assert r['card'] and 'ちがう' in r['miss'] and r['hint'] and r['yen'] == 130 and r['grade'] == 'A' and r['result'], r

def test_the_shelf_card_fits_a_phone(b):
    r = json.loads(b.run([("metrics", (360, 640)), ("nav", URL), ("wait", READY), ("eval", "(async () => { " + BEGIN + SHELF + """ kana(10); earlier('shelf');
      location.hash = '#/chinadori'; route(); await wait(300); WORK.start(yard(), 'shelf'); await wait(400);
      const c = document.querySelector('.wk-shelf .cls-card').getBoundingClientRect(), bins = [...document.querySelectorAll('.wk-bin')].map((x) => x.getBoundingClientRect());
      return JSON.stringify({ bottom: c.bottom <= innerHeight + 1, side: c.left >= 0 && c.right <= innerWidth + 1, bins: bins.every((q) => q.width >= 60 && q.height >= 44) }); })()""")])[-1])
    assert r == {'bottom': True, 'side': True, 'bins': True}, r

# ---- 站櫃 (らんらん, 周おばあさん): a customer says what they want; hand it over (two of it; or say its price) ----
COUNTER = """const vocab = (r) => { const v = REG.vocab.find((x) => x.r === r && (x.lv === 'PRE_N5' || x.lv === 'N5')); state.srs[v.key] = rec(); };
  const num = (w, r) => { const v = REG.vocab.find((x) => x.w === w && x.r === r); state.srs[v.key] = rec(); };   // a number word learned
  const nums = () => [['一', 'いち'], ['二', 'に'], ['三', 'さん'], ['四', 'よん'], ['五', 'ご'], ['六', 'ろく'], ['七', 'なな'], ['八', 'はち'], ['九', 'きゅう'], ['百', 'ひゃく'], ['千', 'せん'], ['円', 'えん']].forEach(([w, r]) => num(w, r));
  const serve = async () => { const t = JOBS.counter.now(); if (t.kind === 'price') { document.querySelector(`.wk-opt[data-n="${t.good[2]}"]`).click(); }
    else { const g = document.querySelector(`.wk-good[data-good="${t.good[0]}"]`); g.click(); if (t.kind === 'two') { await wait(150); g.click(); } } await wait(900); };"""

def test_counter_offers_only_readable_goods(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + COUNTER + """ kana(15);
      const runs = Array.from({ length: 6 }, () => JOBS.counter.make()).flat();
      return JSON.stringify({ goods: [...new Set(runs.flatMap((t) => t.goods.map((g) => g[0])))].sort(), kinds: [...new Set(runs.map((t) => t.kind))], four: runs.every((t) => t.goods.length === 4 && t.goods.some((g) => g[0] === t.good[0])) }); })()"""))
    assert set(r['goods']) <= {'かさ', 'すし', 'いす', 'こけし'} and len(r['goods']) == 4 and r['kinds'] == ['name'] and r['four'], r

def test_counter_asks_two_and_prices_once_learned(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + COUNTER + """ kana(46); vocab('ふたつ'); vocab('いくら'); nums();
      const runs = Array.from({ length: 8 }, () => JOBS.counter.make()).flat(), price = runs.filter((t) => t.kind === 'price');
      return JSON.stringify({ kinds: [...new Set(runs.map((t) => t.kind))].sort(), opts: price.every((t) => t.opts.length === 3 && t.opts.includes(t.good[2]) && t.good[2] <= 1000) }); })()"""))
    assert r == {'kinds': ['name', 'price', 'two'], 'opts': True}, r

# 2026-11-15, the user: prices are past 入門 — いくら is an 入門 word, but reading 三百円 needs N5's numbers; a price is asked only
# when its tag can be read: いくら and 円 learned, 百 (and the digit before it), or 千
def test_prices_wait_for_the_numbers_they_need(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + COUNTER + """ kana(46); vocab('いくら'); const runs = () => Array.from({ length: 8 }, () => JOBS.counter.make()).flat();
      const out = { bare: runs().filter((t) => t.kind === 'price').length };
      num('円', 'えん'); num('百', 'ひゃく'); num('三', 'さん'); const some = runs().filter((t) => t.kind === 'price');
      return JSON.stringify(Object.assign(out, { some: some.length > 5, tags: [...new Set(some.map((t) => t.good[2]))].sort(), opts: some.every((t) => t.opts.length === 3 && t.opts.includes(t.good[2])) })); })()"""))
    assert r == {'bare': 0, 'some': True, 'tags': [100, 300], 'opts': True}, r

# 2026-11-15, the user: the thing asked for was printed in the bubble and on the counter both — matching the same kana, nothing
# heard; now the word in the bubble is a blank to listen to (tap it to hear it again), shown once handed over or after two misses
def test_the_customers_word_is_heard_not_read(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + SHELF + COUNTER + """ kana(46); earlier('counter'); window.__said = []; window.speakAs = (w, l) => { __said.push(w + ':' + l); return Promise.resolve(); };
      location.hash = '#/chinadori'; route(); await wait(300); WORK.start(yard(), 'counter');
      for (let i = 0; i < 30 && !document.querySelector('.wk-cust.on'); i++) await wait(100);
      const t = JOBS.counter.now(), bub = () => document.querySelector('.wk-bub b').textContent, out = { kind: t.kind, hidden: !bub().includes(t.good[0]) };
      __said = []; document.querySelector('.wk-bub .wk-ear').click(); await wait(100); out.again = __said.includes(t.who + ':' + t.good[0] + 'を ください。');
      const wrong = [...document.querySelectorAll('.wk-good')].find((g) => g.dataset.good !== t.good[0]); wrong.click(); await wait(100); out.oneMiss = !bub().includes(t.good[0]);
      wrong.click(); await wait(100); out.twoMiss = bub().includes(t.good[0]);
      return JSON.stringify(out); })()"""))
    assert r == {'kind': 'name', 'hidden': True, 'again': True, 'oneMiss': True, 'twoMiss': True}, r

def test_the_word_shows_once_handed_over(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + SHELF + COUNTER + """ kana(46); earlier('counter'); window.speakAs = () => Promise.resolve();
      location.hash = '#/chinadori'; route(); await wait(300); WORK.start(yard(), 'counter');
      for (let i = 0; i < 30 && !document.querySelector('.wk-cust.on'); i++) await wait(100);
      const t = JOBS.counter.now(); document.querySelector(`.wk-good[data-good="${t.good[0]}"]`).click(); await wait(100);
      return JSON.stringify({ shown: document.querySelector('.wk-bub b').textContent.includes(t.good[0] + 'を ください') }); })()"""))
    assert r == {'shown': True}, r

# 2026-11-15, the user: 「これ、いくらですか」 with nothing to see what これ was (only a thin ring round it on the counter): the
# customer holds it up — its picture in the bubble
def test_a_price_asked_shows_the_thing_held_up(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + SHELF + COUNTER + """ kana(46); vocab('いくら'); nums(); earlier('counter'); window.speakAs = () => Promise.resolve();
      location.hash = '#/chinadori'; route(); await wait(300); const R = Math.random; Math.random = () => 0.1; WORK.start(yard(), 'counter'); Math.random = R;
      for (let i = 0; i < 30 && !document.querySelector('.wk-cust.on'); i++) await wait(100);
      const t = JOBS.counter.now(), held = document.querySelector('.wk-good.held');
      return JSON.stringify({ kind: t.kind, pic: Boolean(document.querySelector('.wk-bub .wk-held svg.pic')), held: held && held.dataset.good === t.good[0] }); })()"""))
    assert r == {'kind': 'price', 'pic': True, 'held': True}, r

def test_a_counter_shift_pays(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + SHELF + COUNTER + """ kana(46); vocab('ふたつ'); vocab('いくら'); nums(); earlier('counter'); window.speak = () => Promise.resolve(); window.speakAs = () => Promise.resolve();
      location.hash = '#/chinadori'; route(); await wait(300); WORK.start(yard(), 'counter'); await wait(1200); const out = { card: Boolean(document.querySelector('.wk-counter')) };
      for (let k = 0; k < 10; k++) { for (let i = 0; i < 30 && !document.querySelector('.wk-cust.on'); i++) await wait(100); await serve(); }
      for (let i = 0; i < 40 && !document.querySelector('.wk-result'); i++) await wait(100); const t = state.work.res['2026-11-10'];
      return JSON.stringify(Object.assign(out, { yen: t.yen, grade: t.grade })); })()"""))
    assert r == {'card': True, 'yen': 150, 'grade': 'S'}, r

def test_the_counter_card_fits_a_phone(b):
    r = json.loads(b.run([("metrics", (360, 640)), ("nav", URL), ("wait", READY), ("eval", "(async () => { " + BEGIN + SHELF + COUNTER + """ kana(46); vocab('いくら'); nums(); earlier('counter');
      location.hash = '#/chinadori'; route(); await wait(300); WORK.start(yard(), 'counter'); await wait(1500);
      const c = document.querySelector('.wk-counter .cls-card').getBoundingClientRect(), goods = [...document.querySelectorAll('.wk-good')].map((x) => x.getBoundingClientRect());
      return JSON.stringify({ bottom: c.bottom <= innerHeight + 1, side: c.left >= 0 && c.right <= innerWidth + 1, goods: goods.length === 4 && goods.every((q) => q.width >= 60 && q.height >= 60) }); })()""")])[-1])
    assert r == {'bottom': True, 'side': True, 'goods': True}, r

def test_the_generator_has_the_counter_lines(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + """ const all = talkLines().map(([w, l]) => w + ':' + l), sayer = JOBS.counter.sayer;
      return JSON.stringify([sayer('かさ') + ':かさを ください。', sayer('かさ') + ':かさを ふたつ ください。', 'hero:いらっしゃいませ！', 'hero:ありがとうございました！', 'hero:さんびゃくえんです。', 'kaneda:これ、いくらですか。'].filter((x) => !all.includes(x))); })()"""))
    assert r == [], r

# ---- 外送 (らいらいけん, 黄さん): a slip with a shop's name; walk to the shop with that sign, back for the next ----
DELIVER = """const go = async () => { location.hash = '#/chinadori'; route(); await wait(300); earlier('deliver'); WORK.start(yard(), 'deliver'); await wait(300); };"""

def test_delivery_goes_only_to_readable_shops(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + """ kana(30);
      const runs = Array.from({ length: 6 }, () => JOBS.deliver.make()), all = runs.flat();
      return JSON.stringify({ to: [...new Set(all)].sort(), n: runs.every((t) => t.length === 10), twice: runs.some((t) => t.some((x, i) => i && t[i - 1] === x)) }); })()"""))
    assert r == {'to': ['fuku', 'kohaku', 'toka'], 'n': True, 'twice': False}, r

def test_a_wrong_shop_says_not_here_and_counts_a_miss(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + SHELF + DELIVER + """ kana(46); window.speakAs = () => Promise.resolve(); await go();
      const D = JOBS.deliver.state(), out = { slip: document.querySelector('.wk-slip').textContent.includes(DORI.shop(D.to).sign) };
      const wrong = DORI.SHOPS.find((s) => s.id !== D.to && s.id !== 'rairai').id; JOBS.deliver.at(yard(), wrong); await wait(100);
      out.said = document.body.textContent.includes('うちじゃ ないよ'); out.miss = JOBS.deliver.state().miss;
      JOBS.deliver.at(yard(), D.to); await wait(100); out.score = state.work.res['2026-11-10'].score; out.back = document.querySelector('.wk-slip').textContent.includes('らいらいけん');
      JOBS.deliver.at(yard(), 'rairai'); out.next = JOBS.deliver.state().k; out.carry = Boolean(document.querySelector('.yhero.wk-carry'));
      return JSON.stringify(out); })()"""))
    assert r == {'slip': True, 'said': True, 'miss': 1, 'score': {'0': 1}, 'back': True, 'next': 1, 'carry': True}, r

def test_a_delivery_shift_pays_a_tip(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + SHELF + DELIVER + """ kana(46); window.speakAs = () => Promise.resolve(); await go();
      for (let k = 0; k < 10; k++) { JOBS.deliver.at(yard(), JOBS.deliver.state().to); if (k < 9) JOBS.deliver.at(yard(), 'rairai'); }
      for (let i = 0; i < 30 && !document.querySelector('.wk-result'); i++) await wait(100); const t = state.work.res['2026-11-10'];
      return JSON.stringify({ yen: t.yen, tip: t.tip, tips: [80, 120, 200, 300].map((s) => JOBS.deliver.tip(s)), slip: Boolean(document.querySelector('.wk-slip')) }); })()"""))
    assert r == {'yen': 180, 'tip': 30, 'tips': [30, 20, 10, 0], 'slip': False}, r

def test_the_slip_bar_leaves_the_signs_tappable_on_a_phone(b):
    r = json.loads(b.run([("metrics", (360, 640)), ("nav", URL), ("wait", READY), ("eval", "(async () => { " + BEGIN + SHELF + DELIVER + """ kana(46); await go();
      const s = document.querySelector('.wk-slip').getBoundingClientRect(), hit = (q) => !(q.right < s.left || q.left > s.right || q.bottom < s.top || q.top > s.bottom);
      const over = [...document.querySelectorAll('.use-btn')].filter((u) => hit(u.getBoundingClientRect())).map((u) => u.dataset.use);
      location.hash = '#/chinatown'; route(); await wait(400); const gone = !document.querySelector('.wk-slip');
      return JSON.stringify({ over, inside: s.left >= 0 && s.right <= innerWidth, gone }); })()""")])[-1])
    assert r == {'over': [], 'inside': True, 'gone': True}, r

# ---- 包包子 (福明, 王 and 陳): 王's word for each step, a picture beside it till it is known; the filling heard ----
BUNS = """const make = async () => { location.hash = '#/chinatown'; route(); await wait(300); earlier('buns'); WORK.start(yard(), 'buns'); await wait(300); };
  const doStep = async () => { const s = JOBS.buns.now(); document.querySelector(`.wk-act[data-step="${s}"]`).click(); await wait(420); };"""

def test_buns_steps_in_order_with_the_filling_heard(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + """ const runs = Array.from({ length: 4 }, () => JOBS.buns.make()).flat();
      return JSON.stringify({ n: runs.length, order: runs.every((x) => x.length === 5 && x[0] === 'kone' && x[1] === 'marume' && ['niku', 'an'].includes(x[2]) && x[3] === 'tsutsumu' && x[4] === 'musu'),
        both: new Set(runs.map((x) => x[2])).size }); })()"""))
    assert r == {'n': 40, 'order': True, 'both': 2}, r

def test_the_pictures_go_after_three_right(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + SHELF + BUNS + """ kana(46); window.speakAs = () => Promise.resolve(); state.work.seenSteps = { kone: 3 }; await make();
      const out = { first: Boolean(document.querySelector('.wk-inst .wk-pic')), acts: [...document.querySelectorAll('.wk-act')].map((x) => x.dataset.step).sort().join(',') };
      await doStep(); out.second = Boolean(document.querySelector('.wk-inst .wk-pic')); out.counted = state.work.seenSteps.marume ?? null;
      return JSON.stringify(out); })()"""))
    assert r == {'first': False, 'acts': 'an,kone,marume,musu,niku,tsutsumu', 'second': True, 'counted': None}, r   # marume shows its picture; counted once answered

def test_a_bun_shift_pays(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + SHELF + BUNS + """ kana(46); window.speakAs = () => Promise.resolve(); await make();
      for (let i = 0; i < 200; i++) { if (!JOBS.buns.now()) break; await doStep(); }
      for (let i = 0; i < 50 && !document.querySelector('.wk-result'); i++) await wait(100); const t = state.work.res['2026-11-10'];
      return JSON.stringify({ yen: t.yen, grade: t.grade, seen: state.work.seenSteps.kone }); })()"""))
    assert r == {'yen': 150, 'grade': 'S', 'seen': 10}, r

def test_buns_only_while_wang_is_there(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + """ kana(46); TOWNEV.clock = { h: 21, day: new Date(2026, 10, 10) }; const night = WORK.can('buns');
      TOWNEV.clock = { h: 12, day: new Date(2026, 10, 10) }; return JSON.stringify({ night, noon: WORK.can('buns').ok }); })()"""))
    assert not r['night']['ok'] and '王' in r['night']['why'] and r['noon'], r

def test_the_bun_card_fits_a_phone(b):
    r = json.loads(b.run([("metrics", (360, 640)), ("nav", URL), ("wait", READY), ("eval", "(async () => { " + BEGIN + SHELF + BUNS + """ kana(46); await make(); await wait(200);
      const c = document.querySelector('.wk-buns .cls-card').getBoundingClientRect(), acts = [...document.querySelectorAll('.wk-act')].map((x) => x.getBoundingClientRect());
      return JSON.stringify({ bottom: c.bottom <= innerHeight + 1, side: c.left >= 0 && c.right <= innerWidth + 1, acts: acts.length === 6 && acts.every((q) => q.width >= 44 && q.height >= 44) }); })()""")])[-1])
    assert r == {'bottom': True, 'side': True, 'acts': True}, r

# ---- the final review's findings (2026-11-15) ----
def test_a_shift_closed_at_its_last_moment_is_still_paid(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + SHELF + """ kana(10); earlier('shelf'); window.__errs = []; window.addEventListener('error', (e) => __errs.push(String(e.message)));
      window.speak = () => Promise.resolve(); window.speakAs = () => Promise.resolve(); location.hash = '#/chinadori'; route(); await wait(300);
      WORK.start(yard(), 'shelf'); await wait(300); for (let k = 0; k < 9; k++) await put(true);
      const item = document.querySelector('.wk-item').dataset.label; document.querySelector(`.wk-bin[data-label="${item}"]`).click(); CLASS.close();   // the tenth, and the card shut at once
      await wait(1500); document.querySelectorAll('.wk-result').forEach((x) => x.remove()); const t = state.work.res['2026-11-10'];
      const again = WORK.start(yard(), 'shelf'); await wait(300);
      return JSON.stringify({ yen: t.yen, again, errs: __errs }); })()"""))
    assert r == {'yen': 150, 'again': False, 'errs': []}, r

def test_one_who_knows_kana_already_can_do_every_job(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + SHELF + """ kana(0); state.kanaKnown = true; window.__errs = []; window.addEventListener('error', (e) => __errs.push(String(e.message)));
      window.speak = () => Promise.resolve(); window.speakAs = () => Promise.resolve(); const out = {};
      out.shelf = JOBS.shelf.make().every((t) => t.label && t.bins.length === 4); out.counter = JOBS.counter.make().every((t) => t.good && t.goods.length === 4);
      out.deliver = JOBS.deliver.make().every((x) => DORI.shop(x)); location.hash = '#/chinadori'; route(); await wait(300); earlier('deliver'); WORK.start(yard(), 'deliver'); await wait(800);
      out.slip = document.querySelector('.wk-slip').textContent.includes('とどけさき');
      return JSON.stringify(Object.assign(out, { errs: __errs })); })()"""))
    assert r == {'shelf': True, 'counter': True, 'deliver': True, 'slip': True, 'errs': []}, r

def test_a_card_shut_and_opened_again_follows_the_new_one(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + SHELF + """ kana(46); earlier('buns'); window.speakAs = () => Promise.resolve();
      location.hash = '#/chinatown'; route(); await wait(300); WORK.start(yard(), 'buns'); await wait(300);
      document.querySelector('.wk-act[data-step="kone"]').click(); CLASS.close(); WORK.start(yard(), 'buns'); await wait(700);   // the old one's next step was due in 300 ms
      return JSON.stringify({ now: JOBS.buns.now(), shown: document.querySelector('.wk-inst b').textContent }); })()"""))
    assert r == {'now': 'kone', 'shown': 'こねて！'}, r

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
