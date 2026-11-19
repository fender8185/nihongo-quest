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
      ['いらっしゃいませ', 'どうぞ', 'はい'].forEach((w) => { const v = REG.vocab.find((x) => x.w === w && x.lv === 'PRE_N5'); state.srs[v.key] = rec(); });
      for (const n of [4, 5, 14, 15, 29, 30, 45, 46]) { kana(n); out[n] = ['buns', 'shelf', 'counter', 'waiter'].filter((j) => WORK.can(j).ok).join(','); }
      kana(4); out.why = WORK.can('shelf').why; state.kanaKnown = true; out.known = WORK.can('buns').ok;
      return JSON.stringify(out); })()"""))
    assert (r['4'], r['5'], r['14'], r['15'], r['29'], r['30'], r['45'], r['46']) == ('', 'buns,shelf', 'buns,shelf', 'buns,shelf,counter', 'buns,shelf,counter', 'buns,shelf,counter,waiter', 'buns,shelf,counter,waiter', 'buns,shelf,counter,waiter'), r   # 包包子 the first (2026-11-19)
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
      location.hash = '#/chinatown'; route(); await wait(400); out.wang = await picks('wang');   // five kana: 包包子 the first job (2026-11-19)
      return JSON.stringify(out); })()"""))
    assert 'はたらく' not in r['four'] and 'はたらく' in r['five'] and 'おしゃべりする' in r['five'], r
    assert 'はたらく' in r['wang'] and 'ちゅうもんする' in r['wang'], r

def test_the_board_lists_the_four_jobs(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + """ kana(15); location.hash = '#/chinadori'; route(); await wait(300);
      WORK.board(yard()); await wait(100); const card = document.querySelector('.wk-board'), rows = [...card.querySelectorAll('.wk-job')].map((x) => [x.dataset.job, x.classList.contains('ok')]);
      const text = card.textContent; CLASS.close();
      state.work.res['2026-11-10'] = { place: 'counter', done: 4, score: {} }; WORK.board(yard()); const today = document.querySelector('.wk-board').textContent; CLASS.close();
      return JSON.stringify({ rows, text, today }); })()"""))
    assert r['rows'] == [['buns', True], ['shelf', True], ['counter', True], ['waiter', False]], r
    assert all(w in r['text'] for w in ['整理貨架', '站櫃', '外場', '包包子', '30']) and '今天' in r['today'] and '站櫃' in r['today'], r

def test_the_board_names_the_words_still_needed(b):   # 外場's kana seen, its three 入門 words not: not ✓ yet, the words said
    r = json.loads(ev(b, "(async () => { " + BEGIN + """ kana(30); location.hash = '#/chinadori'; route(); await wait(300);
      const row = () => document.querySelector('.wk-job[data-job="waiter"]'); WORK.board(yard()); await wait(100); const out = { ok: row().classList.contains('ok'), text: row().textContent }; CLASS.close();
      ['いらっしゃいませ', 'どうぞ', 'はい'].forEach((w) => { const v = REG.vocab.find((x) => x.w === w && x.lv === 'PRE_N5'); state.srs[v.key] = rec(); });
      WORK.board(yard()); await wait(100); out.then = row().classList.contains('ok'); CLASS.close(); return JSON.stringify(out); })()"""))
    assert r['ok'] is False and '3 個入門單字' in r['text'] and '可以做' not in r['text'] and r['then'] is True, r

def test_chen_asks_at_five_kana(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + """ const ids = () => TOWNEV.due().map((e) => e.id).filter((id) => id.startsWith('cn'));
      state.town.done = { cn1: '2026-11-01' }; kana(5); const before = ids();
      state.town.done.cn2 = '2026-11-02'; kana(4); const four = ids(); kana(5); const five = ids();
      return JSON.stringify({ before, four, five }); })()"""))
    assert 'cnw' not in r['before'] and 'cnw' not in r['four'] and r['five'][0] == 'cnw', r

def test_the_generator_has_the_street_lines(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + """ const all = talkLines().map(([w, l]) => w + ':' + l);
      return JSON.stringify(['zhang:…いらっしゃい。はたらく？', 'zhou:あら、いらっしゃい。てつだって くれる？', 'huang:はやく！ おみせ、てつだって！', 'zhang:ラベルを よく みて。', 'chen:ねえ、バイト しない？'].filter((x) => !all.includes(x))); })()"""))
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

# a new version (each push) waits while a job's card is up (2026-11-17: the page reloaded itself mid-shift, like a crash)
def test_no_new_version_put_on_while_a_job_card_is_up(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + SHELF + """ kana(10); earlier('shelf'); window.speak = () => Promise.resolve(); window.speakAs = () => Promise.resolve();
      location.hash = '#/chinadori'; route(); await wait(300); WORK.start(yard(), 'shelf'); await wait(300);
      const n = () => window.__re || 0; reloadPage = () => { window.__re = n() + 1; }; swUpdated = true; const out = { card: Boolean(document.querySelector('.wk-shelf')) };
      updateIfCalm(); out.up = n(); CLASS.close(); updateIfCalm(); out.shut = n(); return JSON.stringify(out); })()"""))
    assert r == {'card': True, 'up': 0, 'shut': 1}, r

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
  const serve = async () => { const t = JOBS.counter.now(); if (t.kind === 'price') { for (const p of t.parts) { document.querySelector(`.wk-tile[data-p="${p}"]`).click(); await wait(60); } }
    else { const g = document.querySelector(`.wk-good[data-good="${t.good[0]}"]`); g.click(); if (t.kind === 'two') { await wait(150); g.click(); } } await wait(900); };"""

def test_counter_offers_only_readable_goods(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + COUNTER + """ kana(15);
      const runs = Array.from({ length: 6 }, () => JOBS.counter.make()).flat();
      return JSON.stringify({ goods: [...new Set(runs.flatMap((t) => t.goods.map((g) => g[0])))].sort(), kinds: [...new Set(runs.map((t) => t.kind))], four: runs.every((t) => t.goods.length === 4 && t.goods.some((g) => g[0] === t.good[0])) }); })()"""))
    assert set(r['goods']) <= {'かさ', 'すし', 'いす', 'こけし'} and len(r['goods']) == 4 and r['kinds'] == ['name'] and r['four'], r

def test_counter_offers_a_good_with_a_small_kana(b):   # せっけん: its っ read as the つ seen
    r = json.loads(ev(b, "(async () => { " + BEGIN + COUNTER + """ kana(46);
      const runs = Array.from({ length: 10 }, () => JOBS.counter.make()).flat(); return JSON.stringify({ soap: runs.some((t) => t.goods.some((g) => g[0] === 'せっけん')) }); })()"""))
    assert r == {'soap': True}, r

def test_counter_asks_two_and_prices_once_learned(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + COUNTER + """ kana(46); vocab('ふたつ'); vocab('いくら'); nums();
      const runs = Array.from({ length: 8 }, () => JOBS.counter.make()).flat(), price = runs.filter((t) => t.kind === 'price');
      const hy = price.filter((t) => t.good[2] !== 100 && t.good[2] !== 1000);
      return JSON.stringify({ kinds: [...new Set(runs.map((t) => t.kind))].sort(), spell: price.every((t) => t.parts.join('') === YEN.reading(t.good[2]) && t.parts.every((p) => t.tiles.includes(p)) && new Set(t.tiles).size === t.tiles.length && t.good[2] <= 1000),
        sounds: hy.length > 0 && hy.every((t) => ['ひゃく', 'びゃく', 'ぴゃく'].every((p) => t.tiles.includes(p))),
        cuts: ['ろっ', 'ろく', 'ぴゃく'].every((p) => (JOBS.counter.spell(600).tiles).includes(p)) && JOBS.counter.spell(800).tiles.includes('はち') && JOBS.counter.spell(100).tiles.includes('いち') }); })()"""))
    assert r == {'kinds': ['name', 'price', 'two'], 'spell': True, 'sounds': True, 'cuts': True}, r   # ひゃく as it sounds after each digit; ろく beside ろっ, はち beside はっ, いち before a bare ひゃく

# 2026-11-15, the user: prices are past 入門 — いくら is an 入門 word, but reading 三百円 needs N5's numbers; a price is asked only
# when its tag can be read: いくら and 円 learned, 百 (and the digit before it), or 千
def test_prices_wait_for_the_numbers_they_need(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + COUNTER + """ kana(46); vocab('いくら'); const runs = () => Array.from({ length: 8 }, () => JOBS.counter.make()).flat();
      const out = { bare: runs().filter((t) => t.kind === 'price').length };
      num('円', 'えん'); num('百', 'ひゃく'); num('三', 'さん'); const some = runs().filter((t) => t.kind === 'price');
      return JSON.stringify(Object.assign(out, { some: some.length > 5, tags: [...new Set(some.map((t) => t.good[2]))].sort(), spell: some.every((t) => t.parts.join('') === YEN.reading(t.good[2])) })); })()"""))
    assert r == {'bare': 0, 'some': True, 'tags': [100, 300], 'spell': True}, r

# 2026-11-19, the user: a price chosen from three readings only matched — now it is spelled: its pieces (the digit, ひゃく as it
# sounds after it, えん) tapped in order among ひゃく's other sounds and a digit beside; a wrong one a miss, two and the next lights
def test_a_price_is_spelled_with_tiles(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + SHELF + COUNTER + """ kana(46); vocab('いくら'); nums(); earlier('counter'); window.__said = []; window.speakAs = (w, l) => { __said.push(w + ':' + l); return Promise.resolve(); };
      location.hash = '#/chinadori'; route(); await wait(300); const R = Math.random; Math.random = () => 0.1; WORK.start(yard(), 'counter'); Math.random = R;
      for (let i = 0; i < 30 && !document.querySelector('.wk-cust.on'); i++) await wait(100);
      const t = JOBS.counter.now(), tile = (p) => document.querySelector(`.wk-tile[data-p="${p}"]`), out = { kind: t.kind, slots: document.querySelectorAll('.wk-spell i').length === t.parts.length };
      const bad = [...document.querySelectorAll('.wk-tile')].find((x) => !t.parts.includes(x.dataset.p)); bad.click(); await wait(100); bad.click(); await wait(100);
      out.hint = tile(t.parts[0]).classList.contains('wk-hint');
      tile(t.parts[0]).click(); await wait(100); out.used = tile(t.parts[0]).disabled; out.built = document.querySelector('.wk-spell').textContent === t.parts[0];
      for (const p of t.parts.slice(1)) { tile(p).click(); await wait(100); }
      await wait(300); out.said = __said.includes('hero:' + YEN.reading(t.good[2]) + 'です。'); out.misses = WORK.today().score[0];
      return JSON.stringify(out); })()"""))
    assert r == {'kind': 'price', 'slots': True, 'hint': True, 'used': True, 'built': True, 'said': True, 'misses': 2}, r

# 2026-11-19, the user: a shift should begin with how it is played and what it asks of you, then はい／いいえ — はたらく opens the
# rules card; はい begins the shift, いいえ leaves it be; the keepers' first word keeps only what they say in Japanese
def test_working_starts_with_the_rules_and_a_yes(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + """ kana(46); stub('shelf'); location.hash = '#/chinadori'; route(); await wait(300); window.__ctx = null;
      document.querySelector('.npc[data-npc="zhang"]').click(); for (let i = 0; i < 60 && !document.querySelector('.talk-picks button'); i++) await wait(100); await wait(300);
      [...document.querySelectorAll('.talk-picks button')].find((x) => x.textContent.trim() === 'はたらく').click();
      for (let i = 0; i < 30 && !document.querySelector('.wk-rules'); i++) await wait(100);
      const card = document.querySelector('.wk-rules'), text = card ? card.textContent : '', btn = (a) => document.querySelector(`.wk-rules [data-rules="${a}"]`);
      const out = { card: Boolean(card), ran: Boolean(window.__ctx), name: text.includes('整理貨架'), how: text.includes('玩法'), uses: text.includes('需要的能力'), pay: text.includes('100 円'), yes: btn('yes') && btn('yes').textContent.includes('はい'), no: btn('no') && btn('no').textContent.includes('いいえ') };
      btn('no').click(); await wait(300); Object.assign(out, { gone: !document.querySelector('.wk-rules'), ranNo: Boolean(window.__ctx), day: WORK.today() });
      WORK.intro(yard(), 'shelf'); await wait(200); btn('yes').click(); await wait(300); Object.assign(out, { ranYes: Boolean(window.__ctx), shut: !document.querySelector('.wk-rules') });
      kana(4); WORK.intro(yard(), 'shelf'); await wait(200); out.closed = !document.querySelector('.wk-rules');   // not open to this learner: why, and no card
      out.zhOnly = Object.values(TOWN.WORK.first).flat().filter((l) => !l[1]).length;
      return JSON.stringify(out); })()"""))
    assert r == {'card': True, 'ran': False, 'name': True, 'how': True, 'uses': True, 'pay': True, 'yes': True, 'no': True, 'gone': True, 'ranNo': False, 'day': None, 'ranYes': True, 'shut': True, 'closed': True, 'zhOnly': 0}, r

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
      return JSON.stringify({ kind: t.kind, pic: Boolean(document.querySelector('.wk-bub .wk-held svg.pic')), held: held && held.dataset.good === t.good[0], goods: document.querySelectorAll('.wk-good').length, tag: held && held.textContent.includes(t.good[2] + '円') }); })()"""))
    assert r == {'kind': 'price', 'pic': True, 'held': True, 'goods': 1, 'tag': True}, r   # 2026-11-19, the user: the thing known, only it on the counter (no four to choose from), its tag on it

# the test site's switch (2026-11-19, the user had never met a price): every customer asks one, nothing learned needed
def test_the_test_site_can_ask_only_prices(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + """ kana(46);
      const kinds = () => [...new Set(JOBS.counter.make().map((t) => t.kind))].sort().join(), out = { before: kinds() };
      out.on = JOBS.counter.priceTool(); out.all = kinds(); out.parts = JOBS.counter.make().every((t) => t.parts.join('') === YEN.reading(t.good[2]));
      out.off = JOBS.counter.priceTool(); out.after = kinds();
      return JSON.stringify(out); })()"""))
    assert [r['before'], r['all'], r['after'], r['parts']] == ['name', 'price', 'name', True], r
    assert '問價錢' in r['on'] and '恢復' in r['off'], r

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

# ---- 包包子 (福明, 王): 2026-11-15, the user — a close-up of the hero making the bun; six cells of hiragana, a kana said, tap it: the
# bun one step on, that cell a new kana, the next said; thirty taps = five buns; all right in time, five buns in the steamer ----
BUNS = """const make = async () => { location.hash = '#/chinatown'; route(); await wait(300); earlier('buns'); WORK.start(yard(), 'buns'); await wait(300); };
  const idle = async () => { for (let i = 0; i < 60 && JOBS.buns.now() && JOBS.buns.now().wait; i++) await wait(50); };
  const tap = async (right) => { await idle(); const n = JOBS.buns.now(), keys = [...document.querySelectorAll('.wk-key')];
    (right ? keys.find((x) => x.dataset.k === n.target) : keys.find((x) => x.dataset.k !== n.target)).click(); await wait(40); };
  const step = () => Number(document.querySelector('.wk-closeup').dataset.step), basic = new Set(REG.kana.slice(0, 46).map((x) => x.ch));"""

def test_the_bun_board_says_a_kana_on_it(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + SHELF + BUNS + """ kana(46); window.__said = []; window.speak = (t) => { __said.push(t); return Promise.resolve(); }; window.speakAs = () => Promise.resolve();
      await make(); const n = JOBS.buns.now(), keys = [...document.querySelectorAll('.wk-key')].map((x) => x.dataset.k);
      return JSON.stringify({ six: keys.length === 6 && new Set(keys).size === 6, on: keys.includes(n.target), said: __said[__said.length - 1] === n.target, basic: keys.every((c) => basic.has(c)),
        twins: keys.includes('お') && keys.includes('を'), step: step(), steamer: document.querySelectorAll('.wk-steamer .wk-done').length }); })()"""))
    assert r == {'six': True, 'on': True, 'said': True, 'basic': True, 'twins': False, 'step': 0, 'steamer': 0}, r

def test_a_right_tap_moves_the_bun_and_swaps_the_cell(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + SHELF + BUNS + """ kana(46); window.__said = []; window.speak = (t) => { __said.push(t); return Promise.resolve(); }; window.speakAs = () => Promise.resolve();
      await make(); const t = JOBS.buns.now().target, at = [...document.querySelectorAll('.wk-key')].findIndex((x) => x.dataset.k === t);
      await tap(true); const keys = [...document.querySelectorAll('.wk-key')].map((x) => x.dataset.k), n = JOBS.buns.now();
      return JSON.stringify({ step: step(), swapped: keys[at] !== t, six: new Set(keys).size === 6, next: n.target !== t && keys.includes(n.target) && __said[__said.length - 1] === n.target, tap: n.tap }); })()"""))
    assert r == {'step': 1, 'swapped': True, 'six': True, 'next': True, 'tap': 1}, r

def test_a_miss_sets_the_bun_askew_and_twice_lights_the_cell(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + SHELF + BUNS + """ kana(46); window.speak = () => Promise.resolve(); window.speakAs = () => Promise.resolve();
      await make(); const t = JOBS.buns.now().target; await tap(false); const out = { step: step(), askew: document.querySelector('.wk-closeup').classList.contains('flaw'), hint: Boolean(document.querySelector('.wk-key.wk-hint')) };
      await tap(false); out.lit = document.querySelector('.wk-key.wk-hint').dataset.k === t; out.same = JOBS.buns.now().target === t;
      return JSON.stringify(out); })()"""))
    assert r == {'step': 0, 'askew': True, 'hint': False, 'lit': True, 'same': True}, r

def test_three_taps_are_one_task_and_thirty_pay(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + SHELF + BUNS + """ kana(46); window.speak = () => Promise.resolve(); window.speakAs = () => Promise.resolve();
      await make(); const day = () => state.work.res['2026-11-10']; await tap(true); await tap(true); const out = { two: day().done }; await tap(true); out.three = day().done;
      for (let i = 3; i < 30; i++) await tap(true);
      for (let i = 0; i < 60 && !document.querySelector('.wk-result'); i++) await wait(100);
      return JSON.stringify(Object.assign(out, { done: day().done, yen: day().yen, grade: day().grade })); })()"""))
    assert r == {'two': 0, 'three': 1, 'done': 10, 'yen': 150, 'grade': 'S'}, r

def test_a_shift_resumed_starts_at_its_tap(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + SHELF + BUNS + """ kana(46); window.speak = () => Promise.resolve(); window.speakAs = () => Promise.resolve();
      state.work.res['2026-11-10'] = { place: 'buns', done: 5, score: { 0: 0, 1: 0, 2: 1, 3: 0, 4: 1 } }; await make();
      return JSON.stringify({ tap: JOBS.buns.now().tap, step: step(), askew: document.querySelector('.wk-closeup').classList.contains('flaw'), steamer: document.querySelectorAll('.wk-steamer .wk-done').length,
        shiny: document.querySelectorAll('.wk-steamer .wk-done.ok').length, clock: getComputedStyle(document.querySelector('.wk-clock')).display === 'none' }); })()"""))
    assert r == {'tap': 15, 'step': 3, 'askew': True, 'steamer': 2, 'shiny': 1, 'clock': True}, r

def test_all_right_in_time_fills_the_steamer(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + SHELF + BUNS + """ kana(46); window.speak = () => Promise.resolve(); window.speakAs = () => Promise.resolve();
      await make(); for (let i = 0; i < 30; i++) await tap(true); await wait(300);
      return JSON.stringify({ gold: document.querySelector('.wk-buns .cls-card').classList.contains('wk-shine-all'), buns: document.querySelectorAll('.wk-steamer .wk-done.ok').length,
        said: document.querySelector('.wk-say').textContent.includes('てんさい') }); })()"""))
    assert r == {'gold': True, 'buns': 5, 'said': True}, r

def test_a_miss_or_the_clock_keeps_the_steamer_plain(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + SHELF + BUNS + """ kana(46); window.speak = () => Promise.resolve(); window.speakAs = () => Promise.resolve();
      await make(); await tap(false); for (let i = 0; i < 30; i++) await tap(true); await wait(300); const out = { missGold: document.querySelector('.wk-buns .cls-card').classList.contains('wk-shine-all') };
      document.querySelectorAll('.wk-result').forEach((x) => x.remove()); CLASS.close(); delete state.work.res['2026-11-10'];
      const now = Date.now; await make(); Date.now = () => now() + 121000; await wait(400); out.out = document.querySelector('.wk-clock').classList.contains('out');
      for (let i = 0; i < 30; i++) await tap(true); await wait(300); out.lateGold = document.querySelector('.wk-buns .cls-card').classList.contains('wk-shine-all'); Date.now = now;
      return JSON.stringify(out); })()"""))
    assert r == {'missGold': False, 'out': True, 'lateGold': False}, r

def test_buns_only_while_wang_is_there(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + """ kana(46); TOWNEV.clock = { h: 21, day: new Date(2026, 10, 10) }; const night = WORK.can('buns');
      TOWNEV.clock = { h: 12, day: new Date(2026, 10, 10) }; return JSON.stringify({ night, noon: WORK.can('buns').ok }); })()"""))
    assert not r['night']['ok'] and '王' in r['night']['why'] and r['noon'], r

def test_the_bun_card_fits_a_phone(b):
    r = json.loads(b.run([("metrics", (360, 640)), ("nav", URL), ("wait", READY), ("eval", "(async () => { " + BEGIN + SHELF + BUNS + """ kana(46); await make(); await wait(200);
      const card = document.querySelector('.wk-buns .cls-card'), keys = [...document.querySelectorAll('.wk-key')].map((x) => x.getBoundingClientRect()), c = card.getBoundingClientRect();
      return JSON.stringify({ fits: card.scrollHeight <= card.clientHeight + 1 && c.bottom <= innerHeight + 1, side: c.left >= 0 && c.right <= innerWidth + 1, keys: keys.length === 6 && keys.every((q) => q.width >= 60 && q.height >= 48) }); })()""")])[-1])
    assert r == {'fits': True, 'side': True, 'keys': True}, r

# 2026-11-19, the user: 張's tasks to 包包子 — the first job, at five kana seen: four cells of those while under twelve are seen
def test_buns_open_at_five_kana_on_a_board_of_four(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + SHELF + BUNS + """ kana(5); window.speak = () => Promise.resolve(); window.speakAs = () => Promise.resolve(); window.__errs = []; window.addEventListener('error', (e) => __errs.push(String(e.message)));
      const out = { can: WORK.can('buns').ok }, keys = () => [...document.querySelectorAll('.wk-key')].map((x) => x.dataset.k), mine = (ks) => ks.length === 4 && new Set(ks).size === 4 && ks.every((c) => 'あいうえお'.includes(c));
      await make(); out.four = mine(keys()) && document.querySelector('.wk-keys').classList.contains('four');
      for (let i = 0; i < 12; i++) await tap(true); out.still = mine(keys()) && JOBS.buns.now().tap === 12;
      CLASS.close(); delete state.work.res['2026-11-10']; kana(12); await make(); out.six = keys().length;
      return JSON.stringify(Object.assign(out, { errs: __errs })); })()"""))
    assert r == {'can': True, 'four': True, 'still': True, 'six': 6, 'errs': []}, r

# 張's labels that were words: once four kana-only 入門 words are learned, now and then (never twice running) a word is said and the
# board is four word cards for it; tapped, the kana board as it was
def test_a_word_step_puts_up_four_word_cards(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + SHELF + BUNS + """ kana(46); const ws = ['これ', 'それ', 'あれ', 'どれ', 'ここ']; words(ws);
      window.__said = []; window.speak = (t) => { __said.push(t); return Promise.resolve(); }; window.speakAs = () => Promise.resolve();
      await make(); let n = JOBS.buns.now();
      for (let i = 0; i < 29 && !n.cards; i++) { await tap(true); await idle(); n = JOBS.buns.now(); }
      const keys = [...document.querySelectorAll('.wk-key')].map((x) => x.dataset.k), before = n.board.join(), out = { cards: Boolean(n.cards), four: keys.length === 4 && keys.includes(n.target) && keys.every((k) => ws.includes(k)),
        said: __said[__said.length - 1] === n.target, wide: document.querySelector('.wk-keys').classList.contains('words') };
      await tap(true); await idle(); const m = JOBS.buns.now(); out.back = !m.cards && m.board.join() === before && document.querySelectorAll('.wk-key').length === 6;
      return JSON.stringify(out); })()"""))
    assert r == {'cards': True, 'four': True, 'said': True, 'wide': True, 'back': True}, r

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
      out.waiter = WORK.can('waiter').ok;
      return JSON.stringify(Object.assign(out, { errs: __errs })); })()"""))
    assert r == {'shelf': True, 'counter': True, 'waiter': False, 'errs': []}, r   # 外場 still wants its 入門 words (spec §6; the final review)

def test_a_card_shut_and_opened_again_follows_the_new_one(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + SHELF + BUNS + """ kana(46); earlier('buns'); window.speak = () => Promise.resolve(); window.speakAs = () => new Promise((ok) => setTimeout(ok, 400));
      location.hash = '#/chinatown'; route(); await wait(300); WORK.start(yard(), 'buns'); await wait(300);
      for (let i = 0; i < 6; i++) await tap(true);   // a bun done: 王's word, then the next — due after the card is shut
      CLASS.close(); WORK.start(yard(), 'buns'); await wait(1200);
      return JSON.stringify({ tap: JOBS.buns.now().tap, step: step(), steamer: document.querySelectorAll('.wk-steamer .wk-done').length, cards: document.querySelectorAll('.wk-buns').length }); })()"""))
    assert r == {'tap': 6, 'step': 0, 'steamer': 1, 'cards': 1}, r

# ---- each line said to its end (2026-11-18, the user: in the jobs out on the street the voices were cut off by the next customer —
# each line stops the one before): the next customer, the next thing, the card shut, only once the line before is over ----
TALK = """window.__cut = []; let talking = null;   // a line cut short by the next one (or by the card shut)
  const says = (ms) => (w, l) => { if (talking) __cut.push(talking); const me = talking = w + ':' + l; return new Promise((ok) => setTimeout(() => { if (talking === me) talking = null; ok(); }, ms)); };
  const talk = (asMs, kanaMs) => { window.speakAs = says(asMs); window.speak = (t) => says(kanaMs)('', t); window.stopSpeaking = () => { if (talking) __cut.push(talking + '（停）'); talking = null; }; };
  const hush = async () => { for (let i = 0; i < 80 && talking; i++) await wait(50); };
  const upTo = (job, n) => { state.work.res['2026-11-10'] = { place: job, done: n, score: Object.fromEntries(Array.from({ length: n }, (_, k) => [k, 0])) }; };"""

def test_the_shelf_says_each_line_to_its_end(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + SHELF + TALK + """ kana(10); earlier('shelf'); talk(700, 400); upTo('shelf', 8);
      location.hash = '#/chinadori'; route(); await wait(300); WORK.start(yard(), 'shelf'); const R = Math.random; Math.random = () => 0.1;   // 張's word after each
      for (let k = 0; k < 2; k++) { await hush(); const item = document.querySelector('.wk-item').dataset.label; document.querySelector(`.wk-bin[data-label="${item}"]`).click(); await wait(200); }
      for (let i = 0; i < 60 && !document.querySelector('.wk-result'); i++) await wait(100); Math.random = R;
      return JSON.stringify({ cut: __cut, shut: !document.querySelector('.wk-shelf'), paid: state.work.res['2026-11-10'].yen > 0 }); })()"""))
    assert r == {'cut': [], 'shut': True, 'paid': True}, r

def test_the_counter_says_each_line_to_its_end(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + SHELF + COUNTER + TALK + """ kana(46); earlier('counter'); talk(700, 400); upTo('counter', 8);
      location.hash = '#/chinadori'; route(); await wait(300); WORK.start(yard(), 'counter'); const R = Math.random; Math.random = () => 0.1;   // 周's word after each
      for (let k = 0; k < 2; k++) { for (let i = 0; i < 60 && !document.querySelector('.wk-cust.on'); i++) await wait(100); await hush();
        const t = JOBS.counter.now(); document.querySelector(`.wk-good[data-good="${t.good[0]}"]`).click(); await wait(200); }
      for (let i = 0; i < 80 && !document.querySelector('.wk-result'); i++) await wait(100); Math.random = R;
      return JSON.stringify({ cut: __cut, shut: !document.querySelector('.wk-counter'), paid: state.work.res['2026-11-10'].yen > 0 }); })()"""))
    assert r == {'cut': [], 'shut': True, 'paid': True}, r

def test_the_bun_keepers_last_word_is_said_to_its_end(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + SHELF + BUNS + TALK + """ kana(46); talk(1500, 300); upTo('buns', 9); await make();
      for (let i = 0; i < 3; i++) { await hush(); await tap(true); }
      for (let i = 0; i < 80 && !document.querySelector('.wk-result'); i++) await wait(100);
      return JSON.stringify({ cut: __cut, shut: !document.querySelector('.wk-buns'), paid: state.work.res['2026-11-10'].yen > 0 }); })()"""))
    assert r == {'cut': [], 'shut': True, 'paid': True}, r

# 2026-11-18, the user: the jobs wanted a little music — 中華街の しごと while a street job's card is up, gone with the card
def test_a_street_job_plays_its_music_while_its_card_is_up(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + SHELF + """ kana(10); earlier('shelf'); state.settings.musicVol = 1; window.speak = () => Promise.resolve(); window.speakAs = () => Promise.resolve();
      location.hash = '#/chinadori'; route(); await wait(300); const out = { before: MUSIC.wants() };
      WORK.start(yard(), 'shelf'); await wait(300); out.on = [MUSIC.wants(), MUSIC.playing()];
      CLASS.close(); await wait(800); out.shut = [MUSIC.wants(), MUSIC.playing()];
      return JSON.stringify(out); })()"""))
    assert r == {'before': '', 'on': ['chukagai', True], 'shut': ['', False]}, r

# ---- the test site's 無限次數 (2026-11-15, the user): shift after shift, any place, on this device; each kept with its pay ----
def test_the_test_site_can_work_without_end(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + """ kana(46); stub('shelf'); stub('counter', true); state.work.res['2026-01-02'] = { place: 'counter', done: 1, score: { 0: 0 } }; location.hash = '#/chinadori'; route(); await wait(200);
      const shift = (job) => { WORK.start(yard(), job); for (let k = 0; k < 10; k++) __ctx.right(k, 0); __ctx.finish(); document.querySelectorAll('.wk-result').forEach((x) => x.remove()); };
      const out = {}; shift('shelf'); out.limited = WORK.can('shelf').ok; out.earned = yenEarned();
      out.msg = WORK.tool(); out.again = WORK.can('shelf').ok && WORK.can('counter').ok; shift('counter'); shift('shelf');
      const res = state.work.res; out.keys = Object.keys(res).filter((k) => k.startsWith('2026-11-10')).sort(); out.paid = yenEarned() > out.earned * 2.5; out.shifts = WORK.shifts();
      out.kept = Object.keys(normalizeState(JSON.parse(JSON.stringify(state))).work.res).filter((k) => k.startsWith('2026-11-10')).length;
      out.off = WORK.tool(); out.limitedAgain = WORK.can('counter').ok;
      return JSON.stringify(out); })()"""))
    assert not r['limited'] and r['again'] and r['paid'] and not r['limitedAgain'], r
    assert r['keys'] == ['2026-11-10', '2026-11-10#2', '2026-11-10#3'] and r['kept'] == 3 and r['shifts'] == 3, r
    assert '無限' in r['msg'] and '一天' in r['off'], r

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
