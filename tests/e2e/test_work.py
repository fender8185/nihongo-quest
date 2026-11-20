"""2026-11-14 中華街の打工 (docs/superpowers/specs/2026-11-14-chinatown-work-design.md §4–§7): four workplaces opening by the
kana seen (收銀: the numbers learned, 2026-11-19), at most one a day, a shift of ten left halfway waiting for its day, pay by the 打工證 and the grade, into the wallet."""
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
      for (const n of [4, 5, 14, 15, 29, 30, 45, 46]) { kana(n); out[n] = ['buns', 'counter', 'waiter', 'till'].filter((j) => WORK.can(j).ok).join(','); }
      kana(4); out.why = WORK.can('buns').why; state.kanaKnown = true; out.known = WORK.can('buns').ok;
      return JSON.stringify(out); })()"""))
    assert (r['4'], r['5'], r['14'], r['15'], r['29'], r['30'], r['45'], r['46']) == ('', 'buns', 'buns', 'buns,counter', 'buns,counter', 'buns,counter,waiter', 'buns,counter,waiter', 'buns,counter,waiter'), r   # 包包子 the first, 收銀 by the numbers (2026-11-19)
    assert '再學 1 個假名' in r['why'] and r['known'], r

def test_one_workplace_a_day_and_a_shift_left_halfway_waits(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + """ kana(46); stub('buns', true); stub('counter'); location.hash = '#/chinadori'; route(); await wait(200); const out = {};
      WORK.start(yard(), 'counter'); [0, 1, 2].forEach((k) => __ctx.right(k, 0)); out.done = WORK.today().done;
      window.__ctx = null; out.other = WORK.can('buns'); WORK.start(yard(), 'buns'); out.otherRan = Boolean(window.__ctx);
      WORK.start(yard(), 'counter'); out.resumed = __ctx.done; out.place = WORK.today().place;
      return JSON.stringify(out); })()"""))
    assert r['done'] == 3 and not r['other']['ok'] and '站櫃' in r['other']['why'] and not r['otherRan'], r
    assert r['resumed'] == 3 and r['place'] == 'counter', r

def test_a_shift_begun_before_closing_runs_to_its_end(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + """ kana(46); stub('counter'); TOWNEV.clock = { h: 18.98, day: new Date(2026, 10, 10) };
      location.hash = '#/chinadori'; route(); await wait(200); const out = { before: WORK.can('counter').ok };
      WORK.start(yard(), 'counter'); TOWNEV.clock = { h: 19.5, day: new Date(2026, 10, 10) };
      for (let k = 0; k < 10; k++) __ctx.right(k, 0); __ctx.finish(); await wait(100);
      out.yen = WORK.today().yen; document.querySelectorAll('.wk-result').forEach((x) => x.remove());
      TOWNEV.clock = { h: 19.5, day: new Date(2026, 10, 11) }; out.after = WORK.can('counter');
      return JSON.stringify(out); })()"""))
    assert r['before'] and r['yen'] == 150 and not r['after']['ok'] and '19' in r['after']['why'], r

def test_the_shift_keeps_the_day_it_began(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + """ kana(46); stub('counter'); location.hash = '#/chinadori'; route(); await wait(200);
      WORK.start(yard(), 'counter'); TOWNEV.clock = { h: 12, day: new Date(2026, 10, 11) };
      for (let k = 0; k < 10; k++) __ctx.right(k, 0); __ctx.finish(); await wait(100); document.querySelectorAll('.wk-result').forEach((x) => x.remove());
      return JSON.stringify(Object.fromEntries(Object.entries(state.work.res).filter(([, x]) => x.yen !== undefined).map(([d, x]) => [d, x.yen]))); })()"""))
    assert r == {'2026-11-10': 150}, r

def test_the_keeper_says_how_the_first_time(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + """ kana(46); stub('counter', true); location.hash = '#/chinadori'; route(); await wait(200); window.__ctx = null;
      WORK.start(yard(), 'counter'); await wait(300); const t = document.querySelector('.talk');
      return JSON.stringify({ talk: Boolean(t), ran: Boolean(window.__ctx), text: t ? t.textContent : '' }); })()"""))
    assert r['talk'] and not r['ran'] and 'わたして' in r['text'], r

def test_pay_grade_and_licence(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + """
      const sc = (first) => Object.fromEntries(Array.from({ length: 10 }, (_, k) => [k, k < first ? 0 : 1]));
      return JSON.stringify({ pays: [WORK.pay(1, 'S', 0).yen, WORK.pay(5, 'B', 0).yen, WORK.pay(30, 'E', 30).yen, WORK.pay(15, 'A', 10)],
        ranks: [0, 1, 4, 5, 14, 15, 29, 30].map((n) => WORK.rank(n)), grades: [10, 9, 8, 7, 5, 3, 2].map((n) => WORK.grade(sc(n))) }); })()"""))
    assert r['pays'][:3] == [150, 140, 230] and r['pays'][3] == {'base': 150, 'bonus': 30, 'tip': 10, 'yen': 190}, r
    assert r['ranks'] == ['', '新人', '新人', 'アルバイト', 'アルバイト', 'ベテラン', 'ベテラン', 'バイトリーダー'], r
    assert r['grades'] == ['S', 'A', 'B', 'B', 'C', 'D', 'E'], r

def test_the_pay_goes_into_the_wallet(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + """ kana(46); stub('counter'); location.hash = '#/chinadori'; route(); await wait(200);
      const before = yenEarned(); WORK.start(yard(), 'counter'); for (let k = 0; k < 10; k++) __ctx.right(k, k < 9 ? 0 : 1); __ctx.finish(); await wait(200);
      const card = document.querySelector('.wk-result'), out = { got: yenEarned() - before, card: Boolean(card), text: card ? card.textContent : '' };
      card.querySelector('.crr-ok').click(); await wait(100); DIARY.open('town'); await wait(100);
      out.tab = Boolean(document.querySelector('[data-diary="tab-work"]')); document.querySelector('[data-diary="tab-work"]').click(); await wait(100);
      out.book = document.querySelector('.diary').textContent; DIARY.close();
      return JSON.stringify(out); })()"""))
    assert r['got'] == 130 and r['card'] and '打工證' in r['text'] and '新人' in r['text'], r   # 9 of 10 at once: A, +30 on 新人's 100
    assert r['tab'] and '新人' in r['book'] and '1 班' in r['book'], r

# a keeper's choices (2026-11-20, the user: no blue button — picked as a reply in the talk): what the hero would say, each where it goes
PICKS = """const picks = async (id) => { document.querySelector(`.npc[data-npc="${id}"]`).click(); for (let i = 0; i < 60 && !document.querySelector('.talk'); i++) await wait(100); await wait(300);
    const t = document.querySelector('.talk'), b = t ? [...t.querySelectorAll('[data-choose]')].map((x) => { const zh = x.querySelector('small'); return x.dataset.go + ':' + x.textContent.replace(zh ? zh.textContent : '', '').trim() + (zh ? '／' + zh.textContent : ''); }) : [];
    if (t && t.querySelector('.btn-primary')) b.push('blue'); TALK.close && TALK.close(); document.querySelectorAll('.talk').forEach((x) => x.remove()); return b; };"""

def test_the_owners_offer_work_when_it_is_open(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + PICKS + """ state.town.done = { cn1: '2026-11-01', cn2: '2026-11-01', cnw: '2026-11-01', cn3: '2026-11-01', cn4: '2026-11-01' };
      kana(14); location.hash = '#/chinadori'; route(); await wait(400); const out = { four: await picks('zhou') };
      kana(15); route(); await wait(400); out.five = await picks('zhou'); kana(5);
      location.hash = '#/chinatown'; route(); await wait(400); out.wang = await picks('wang');   // five kana: 包包子 the first job (2026-11-19)
      return JSON.stringify(out); })()"""))
    assert r['four'] == [], r   # only a chat: straight into it, no choice
    assert r['five'] == ['work:はい、てつだいます。／好，我來幫忙。', 'chat:ちょっと よっただけです。／只是順道過來看看。'], r   # yes to her てつだって くれる？ (in 入門: the Chinese shown under each)
    assert [x.split('／')[0] for x in r['wang']] == ['order:メニュー、みせて ください。', 'work:アルバイト、させて ください。', 'chat:ちょっと よっただけです。'], r   # his shop's greeting: work asked for

def test_the_generator_has_the_choices(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + """ const all = talkLines().map(([w, l]) => w + ':' + l);
      return JSON.stringify(['ちょっと よっただけです。', 'メニュー、みせて ください。', 'はい、おねがいします。', 'アルバイト、させて ください。', 'はい、はたらきます。', 'はい、てつだいます。', 'はい、いま いきます！', 'はい、つくります！']
        .map((l) => 'hero:' + l).filter((x) => !all.includes(x))); })()"""))
    assert r == [], r

def test_the_board_lists_the_four_jobs(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + """ kana(15); location.hash = '#/chinadori'; route(); await wait(300);
      WORK.board(yard()); await wait(100); const card = document.querySelector('.wk-board'), rows = [...card.querySelectorAll('.wk-job')].map((x) => [x.dataset.job, x.classList.contains('ok')]);
      const text = card.textContent; CLASS.close();
      state.work.res['2026-11-10'] = { place: 'counter', done: 4, score: {} }; WORK.board(yard()); const today = document.querySelector('.wk-board').textContent; CLASS.close();
      return JSON.stringify({ rows, text, today }); })()"""))
    assert r['rows'] == [['buns', True], ['counter', True], ['waiter', False], ['till', False]], r
    assert all(w in r['text'] for w in ['包包子', '站櫃', '外場', '收銀', '30', '「いくら」「円」和數字']) and '今天' in r['today'] and '站櫃' in r['today'], r

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

# a job been to before (no first-day word); kana-only 入門 words learned
HELP = """const earlier = (job) => { state.work.res['2026-01-01'] = { place: job, done: 1, score: { 0: 0 } }; };   // been there before: no first-day word
  const words = (ws) => ws.forEach((w) => { const v = REG.vocab.find((x) => x.w === w && x.lv === 'PRE_N5'); state.srs[v.key] = rec(); });"""

# a new version (each push) waits while a job's card is up (2026-11-17: the page reloaded itself mid-shift, like a crash)
def test_no_new_version_put_on_while_a_job_card_is_up(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + HELP + """ kana(46); earlier('counter'); window.speak = () => Promise.resolve(); window.speakAs = () => Promise.resolve();
      location.hash = '#/chinadori'; route(); await wait(300); WORK.start(yard(), 'counter'); await wait(300);
      const n = () => window.__re || 0; reloadPage = () => { window.__re = n() + 1; }; swUpdated = true; const out = { card: Boolean(document.querySelector('.wk-counter')) };
      updateIfCalm(); out.up = n(); CLASS.close(); updateIfCalm(); out.shut = n(); return JSON.stringify(out); })()"""))
    assert r == {'card': True, 'up': 0, 'shut': 1}, r

# ---- 站櫃 (らんらん, 周おばあさん): a customer says what they want; hand it over (two of it) ----
COUNTER = """const vocab = (r) => { const v = REG.vocab.find((x) => x.r === r && (x.lv === 'PRE_N5' || x.lv === 'N5')); state.srs[v.key] = rec(); };
  const num = (w, r) => { const v = REG.vocab.find((x) => x.w === w && x.r === r); state.srs[v.key] = rec(); };   // a number word learned
  const nums = () => [['一', 'いち'], ['二', 'に'], ['三', 'さん'], ['四', 'よん'], ['五', 'ご'], ['六', 'ろく'], ['七', 'なな'], ['八', 'はち'], ['九', 'きゅう'], ['十', 'じゅう'], ['百', 'ひゃく'], ['千', 'せん'], ['円', 'えん']].forEach(([w, r]) => num(w, r));
  const serve = async () => { const t = JOBS.counter.now(), g = document.querySelector(`.wk-good[data-good="${t.good[0]}"]`); g.click(); if (t.kind === 'two') { await wait(150); g.click(); } await wait(900); };"""

def test_counter_offers_only_readable_goods(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + COUNTER + """ kana(15);
      const runs = Array.from({ length: 6 }, () => JOBS.counter.make()).flat();
      return JSON.stringify({ goods: [...new Set(runs.flatMap((t) => t.goods.map((g) => g[0])))].sort(), kinds: [...new Set(runs.map((t) => t.kind))], four: runs.every((t) => t.goods.length === 4 && t.goods.some((g) => g[0] === t.good[0])) }); })()"""))
    assert set(r['goods']) <= {'かさ', 'すし', 'いす', 'こけし'} and len(r['goods']) == 4 and r['kinds'] == ['name'] and r['four'], r

def test_counter_offers_a_good_with_a_small_kana(b):   # せっけん: its っ read as the つ seen
    r = json.loads(ev(b, "(async () => { " + BEGIN + COUNTER + """ kana(46);
      const runs = Array.from({ length: 10 }, () => JOBS.counter.make()).flat(); return JSON.stringify({ soap: runs.some((t) => t.goods.some((g) => g[0] === 'せっけん')) }); })()"""))
    assert r == {'soap': True}, r

# 2026-11-19, the user: 周 keeps the listening, no reckoning — two of it once ふたつ is learned, a price never (that is 收銀's)
def test_counter_asks_two_once_learned_and_never_a_price(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + COUNTER + """ kana(46); vocab('ふたつ'); vocab('いくら'); nums();
      const runs = Array.from({ length: 8 }, () => JOBS.counter.make()).flat(); return JSON.stringify({ kinds: [...new Set(runs.map((t) => t.kind))].sort() }); })()"""))
    assert r == {'kinds': ['name', 'two']}, r

# 2026-11-19, the user: a shift should begin with how it is played and what it asks of you, then はい／いいえ — はたらく opens the
# rules card; はい begins the shift, いいえ leaves it be; the keepers' first word keeps only what they say in Japanese
def test_working_starts_with_the_rules_and_a_yes(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + """ kana(46); stub('counter'); location.hash = '#/chinadori'; route(); await wait(300); window.__ctx = null;
      document.querySelector('.npc[data-npc="zhou"]').click(); for (let i = 0; i < 60 && !document.querySelector('.talk [data-go="work"]'); i++) await wait(100); await wait(300);
      document.querySelector('.talk [data-go="work"]').click(); await wait(200);   // the hero says it; a tap on
      const said = document.querySelector('.talk .talk-ja').textContent.trim(), early = Boolean(document.querySelector('.wk-rules')); document.querySelector('.talk').click();
      for (let i = 0; i < 30 && !document.querySelector('.wk-rules'); i++) await wait(100);
      const card = document.querySelector('.wk-rules'), text = card ? card.textContent : '', btn = (a) => document.querySelector(`.wk-rules [data-rules="${a}"]`);
      const out = { said: said.startsWith('はい、てつだいます。') && !early, card: Boolean(card), ran: Boolean(window.__ctx), name: text.includes('站櫃'), how: text.includes('玩法'), uses: text.includes('需要的能力'), pay: text.includes('100 円'), secs: text.includes('5 秒'),
        yes: btn('yes') && btn('yes').textContent.includes('はい'), no: btn('no') && btn('no').textContent.includes('いいえ'), blue: card.querySelectorAll('.btn-primary').length };
      btn('no').click(); await wait(300); Object.assign(out, { gone: !document.querySelector('.wk-rules'), ranNo: Boolean(window.__ctx), day: WORK.today() });
      WORK.intro(yard(), 'counter'); await wait(200); btn('yes').click(); await wait(300); Object.assign(out, { ranYes: Boolean(window.__ctx), shut: !document.querySelector('.wk-rules') });
      kana(4); WORK.intro(yard(), 'counter'); await wait(200); out.closed = !document.querySelector('.wk-rules');   // not open to this learner: why, and no card
      out.zhOnly = Object.values(TOWN.WORK.first).flat().filter((l) => !l[1]).length;
      return JSON.stringify(out); })()"""))
    assert r == {'said': True, 'card': True, 'ran': False, 'name': True, 'how': True, 'uses': True, 'pay': True, 'secs': True, 'yes': True, 'no': True, 'blue': 0, 'gone': True, 'ranNo': False, 'day': None, 'ranYes': True, 'shut': True, 'closed': True, 'zhOnly': 0}, r

# 2026-11-15, the user: the thing asked for was printed in the bubble and on the counter both — matching the same kana, nothing
# heard; now the word in the bubble is a blank to listen to (tap it to hear it again), shown once handed over or after two misses
def test_the_customers_word_is_heard_not_read(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + HELP + COUNTER + """ kana(46); earlier('counter'); window.__said = []; window.speakAs = (w, l) => { __said.push(w + ':' + l); return Promise.resolve(); };
      location.hash = '#/chinadori'; route(); await wait(300); WORK.start(yard(), 'counter');
      for (let i = 0; i < 30 && !document.querySelector('.wk-cust.on'); i++) await wait(100);
      const t = JOBS.counter.now(), bub = () => document.querySelector('.wk-bub b').textContent, out = { kind: t.kind, hidden: !bub().includes(t.good[0]) };
      out.icon = Boolean(document.querySelector('.wk-bub .wk-ear svg')) && !document.querySelector('.wk-bub').textContent.includes('🔊');   // the app's speaker, not 🔊 (2026-11-20)
      __said = []; document.querySelector('.wk-bub .wk-ear').click(); await wait(100); out.again = __said.includes(t.who + ':' + t.good[0] + 'を ください。');
      const wrong = [...document.querySelectorAll('.wk-good')].find((g) => g.dataset.good !== t.good[0]); wrong.click(); await wait(100); out.oneMiss = !bub().includes(t.good[0]);
      wrong.click(); await wait(100); out.twoMiss = bub().includes(t.good[0]);
      return JSON.stringify(out); })()"""))
    assert r == {'kind': 'name', 'hidden': True, 'icon': True, 'again': True, 'oneMiss': True, 'twoMiss': True}, r

# 2026-11-20, the user: 20 s was too long — 5, and from the end of their asking: none of it lost while the word is still being said
def test_the_counter_clock_starts_once_the_customer_has_asked(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + HELP + COUNTER + """ kana(46); earlier('counter'); window.speakAs = (w, l) => (l.endsWith('ください。') ? wait(800) : Promise.resolve());
      location.hash = '#/chinadori'; route(); await wait(300); WORK.start(yard(), 'counter');
      for (let i = 0; i < 30 && !document.querySelector('.wk-cust.on'); i++) await wait(100);
      const bar = () => parseFloat(document.querySelector('.wk-counter .wk-pat').style.getPropertyValue('--p')); await wait(500); const out = { asking: bar() === 1 };
      await wait(1300); out.after = bar() > 0.7 && bar() < 0.9;   // about a second of five gone
      return JSON.stringify(out); })()"""))
    assert r == {'asking': True, 'after': True}, r

def test_the_word_shows_once_handed_over(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + HELP + COUNTER + """ kana(46); earlier('counter'); window.speakAs = () => Promise.resolve();
      location.hash = '#/chinadori'; route(); await wait(300); WORK.start(yard(), 'counter');
      for (let i = 0; i < 30 && !document.querySelector('.wk-cust.on'); i++) await wait(100);
      const t = JOBS.counter.now(); document.querySelector(`.wk-good[data-good="${t.good[0]}"]`).click(); await wait(100);
      return JSON.stringify({ shown: document.querySelector('.wk-bub b').textContent.includes(t.good[0] + 'を ください') }); })()"""))
    assert r == {'shown': True}, r

def test_a_counter_shift_pays(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + HELP + COUNTER + """ kana(46); vocab('ふたつ'); vocab('いくら'); nums(); earlier('counter'); window.speak = () => Promise.resolve(); window.speakAs = () => Promise.resolve();
      location.hash = '#/chinadori'; route(); await wait(300); WORK.start(yard(), 'counter'); await wait(1200); const out = { card: Boolean(document.querySelector('.wk-counter')) };
      for (let k = 0; k < 10; k++) { for (let i = 0; i < 30 && !document.querySelector('.wk-cust.on'); i++) await wait(100); await serve(); }
      for (let i = 0; i < 40 && !document.querySelector('.wk-result'); i++) await wait(100); const t = state.work.res['2026-11-10'];
      return JSON.stringify(Object.assign(out, { yen: t.yen, grade: t.grade })); })()"""))
    assert r == {'card': True, 'yen': 150, 'grade': 'S'}, r

# 2026-11-19, the user: every job timed, as 外場 is — a customer's patience under them (5 s at the counter, 2026-11-20), from their asking;
# a wrong thing handed costs some; 💦 あの、すみません！ then 💢 ちょっと！ (外場's words, in their voice); at none, いいです！ and
# off they go, the thing they wanted lit, the task lost (3), the next customer up
def test_a_counter_customer_out_of_patience_goes(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + HELP + COUNTER + """ kana(46); earlier('counter'); window.__said = []; window.speakAs = (w, l) => { __said.push(w + ':' + l); return Promise.resolve(); };
      location.hash = '#/chinadori'; route(); await wait(300); WORK.start(yard(), 'counter');
      for (let i = 0; i < 30 && !document.querySelector('.wk-cust.on'); i++) await wait(100);
      const t = JOBS.counter.now(), bar = () => parseFloat(document.querySelector('.wk-counter .wk-pat').style.getPropertyValue('--p')), cust = () => document.querySelector('.wk-counter .wk-cust');
      const out = { full: bar() > 0.95 }; [...document.querySelectorAll('.wk-good')].find((g) => g.dataset.good !== t.good[0]).click(); await wait(100); out.cost = bar() < 0.82;
      let moods = new Set(); JOBS.pat.scale = 0.08; for (let i = 0; i < 80 && !(0 in WORK.today().score); i++) { moods.add(cust().dataset.mood); await wait(25); } JOBS.pat.scale = 1;
      Object.assign(out, { moods: [...moods].filter(Boolean).sort(), sign: cust().querySelector('.wk-emo').textContent, score: WORK.today().score[0],
        again: __said.includes(t.who + ':あの、すみません！'), hey: __said.includes(t.who + ':ちょっと！'), out: __said.some((x) => x === t.who + ':いいです！' || x === t.who + ':もう いいです！'),
        lit: (document.querySelector('.wk-good.wk-hint') || {}).dataset.good === t.good[0] });
      for (let i = 0; i < 40 && JOBS.counter.now() === t; i++) await wait(100); for (let i = 0; i < 30 && !document.querySelector('.wk-cust.on'); i++) await wait(100);
      Object.assign(out, { next: document.querySelector('.wk-counter .wk-n').textContent, fresh: bar() > 0.95 && !cust().dataset.mood });
      return JSON.stringify(out); })()"""))
    assert r == {'full': True, 'cost': True, 'moods': ['mad', 'meh'], 'sign': '💢', 'score': 3, 'again': True, 'hey': True, 'out': True, 'lit': True, 'next': '2／10', 'fresh': True}, r

def test_the_counter_card_fits_a_phone(b):
    r = json.loads(b.run([("metrics", (360, 640)), ("nav", URL), ("wait", READY), ("eval", "(async () => { " + BEGIN + HELP + COUNTER + """ kana(46); vocab('いくら'); nums(); earlier('counter');
      location.hash = '#/chinadori'; route(); await wait(300); WORK.start(yard(), 'counter'); await wait(1500);
      const c = document.querySelector('.wk-counter .cls-card').getBoundingClientRect(), goods = [...document.querySelectorAll('.wk-good')].map((x) => x.getBoundingClientRect());
      return JSON.stringify({ bottom: c.bottom <= innerHeight + 1, side: c.left >= 0 && c.right <= innerWidth + 1, goods: goods.length === 4 && goods.every((q) => q.width >= 60 && q.height >= 60),
        tags: document.querySelectorAll('.wk-counter .wk-good small').length }); })()""")])[-1])
    assert r == {'bottom': True, 'side': True, 'goods': True, 'tags': 0}, r   # no prices at the counter (2026-11-20, the user: those are 收銀's)

def test_the_generator_has_the_counter_lines(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + """ const all = talkLines().map(([w, l]) => w + ':' + l), sayer = JOBS.counter.sayer;
      return JSON.stringify([sayer('かさ') + ':かさを ください。', sayer('かさ') + ':かさを ふたつ ください。', 'hero:いらっしゃいませ！', 'hero:ありがとうございました！'].filter((x) => !all.includes(x))); })()"""))
    assert r == [], r

# ---- 收銀 (ふく, 張さん): 2026-11-19, the user — 張's tasks to 包包子, his shop the money: a thing's price, then two (or one of it
# twice) summed, spelled in pieces; open once いくら, 円 and the numbers are learned. 2026-11-20, the user: prices to the yen (tens
# and ones), never three things (that is reckoning) ----
TILL = """const tiles = () => [...document.querySelectorAll('.wk-till .wk-tile')];
  const ready = async () => { for (let i = 0; i < 60 && !(tiles().length && !tiles().some((x) => x.disabled)); i++) await wait(100); };   // the next customer's pieces up
  const pay = async () => { const t = JOBS.till.now(); for (const p of t.parts) { tiles().find((x) => x.dataset.p === p && !x.disabled).click(); await wait(60); } await wait(900); };"""

def test_the_till_opens_once_the_numbers_are_learned(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + COUNTER + """ kana(46); const out = { bare: WORK.can('till') }; vocab('いくら');
      [['円', 'えん'], ['十', 'じゅう'], ['百', 'ひゃく'], ['千', 'せん'], ['二', 'に'], ['三', 'さん'], ['四', 'よん'], ['五', 'ご'], ['六', 'ろく'], ['七', 'なな'], ['八', 'はち']].forEach(([w, r]) => num(w, r));
      out.one = WORK.can('till'); num('九', 'きゅう'); out.all = WORK.can('till').ok;
      return JSON.stringify(out); })()"""))
    assert not r['bare']['ok'] and '「いくら」' in r['bare']['why'] and '「九」' in r['bare']['why'], r
    assert not r['one']['ok'] and r['one']['why'] == '先學會「九」，就能來收銀。' and r['all'], r

def test_a_till_shift_is_four_of_one_then_six_of_two(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + COUNTER + """ kana(46); vocab('ふたつ'); const runs = Array.from({ length: 30 }, () => JOBS.till.make()), all = runs.flat();
      return JSON.stringify({ many: [...new Set(runs.map((t) => t.map((x) => x.things.length).join('')))], kinds: [...new Set(all.map((t) => t.kind))].sort(),
        sums: all.every((t) => t.sum === t.things.reduce((a, g) => a + g[2], 0) && t.parts.join('') === YEN.reading(t.sum)),
        twice: all.filter((t) => t.kind === 'two').every((t) => t.things.length === 2 && t.things[0] === t.things[1]),
        apart: all.filter((t) => t.kind === 'sum').every((t) => new Set(t.things).size === t.things.length) }); })()"""))
    assert r == {'many': ['1111222222'], 'kinds': ['one', 'sum', 'two'], 'sums': True, 'twice': True, 'apart': True}, r

# the pieces: the thousands (せん, に＋せん, さん＋ぜん), the hundreds (さんびゃく, ろっぴゃく, はっぴゃく), the tens (はち＋じゅう), the ones
# (4: よ), えん — among ひゃく's other sounds, せん／ぜん, ろく by ろっ, はち by はっ (はっ by はち), いち before a bare ひゃく, せん or じゅう; every
# price and sum ふく's shelves come to, and none of those sums ends in a 4, 7 or 9
def test_every_sum_is_spelled_with_its_sound_changes(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + """ const sp = JOBS.till.spell, has = (n, ...ps) => ps.every((p) => sp(n).tiles.includes(p)), ps = TOWN.WORK.fuku.map((g) => g[2]);
      const ns = [...new Set([...Array.from({ length: 40 }, (_, i) => (i + 1) * 100), ...Array.from({ length: 99 }, (_, i) => i + 1), ...ps, ...ps.flatMap((a) => ps.map((c) => a + c))])];
      const bad = ns.filter((n) => { const t = sp(n), near = t.tiles.filter((x) => !t.parts.includes(x)); return t.parts.join('') !== YEN.reading(n) || new Set(near).size !== near.length || t.tiles.length > 12 || !t.parts.every((p) => t.tiles.includes(p)); });
      return JSON.stringify({ bad, parts: [1700, 3200, 600, 198, 2360, 14].map((n) => sp(n).parts.join('|')), ones: [...new Set(ps.flatMap((a) => ps.map((c) => (a + c) % 10)))].sort(),
        near: [has(600, 'ろっ', 'ろく', 'ぴゃく', 'ひゃく', 'びゃく'), has(800, 'はち'), has(100, 'いち'), has(1000, 'いち', 'ぜん'), has(3200, 'せん'), has(1700, 'ぜん'), has(10, 'いち'), has(180, 'はっ', 'いち'), has(4, 'よん')] }); })()"""))
    assert r == {'bad': [], 'parts': ['せん|なな|ひゃく|えん', 'さん|ぜん|に|ひゃく|えん', 'ろっ|ぴゃく|えん', 'ひゃく|きゅう|じゅう|はち|えん', 'に|せん|さん|びゃく|ろく|じゅう|えん', 'じゅう|よ|えん'],
                 'ones': [0, 3, 5, 6, 8], 'near': [True] * 9}, r

def test_a_sum_is_spelled_piece_by_piece(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + HELP + COUNTER + TILL + """ kana(46); vocab('いくら'); nums(); earlier('till'); window.__said = []; window.speakAs = (w, l) => { __said.push(w + ':' + l); return Promise.resolve(); };
      state.work.res['2026-11-10'] = { place: 'till', done: 7, score: { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 } };   // the eighth customer: two things
      location.hash = '#/chinadori'; route(); await wait(300); WORK.start(yard(), 'till'); await ready();
      const t = JOBS.till.now(), out = { kind: t.kind, things: document.querySelectorAll('.wk-till .wk-goods .wk-good').length, tags: [...document.querySelectorAll('.wk-till .wk-good small')].reduce((a, x) => a + parseInt(x.textContent, 10), 0) === t.sum,
        asked: document.querySelector('.wk-till .wk-bub').textContent.includes('ぜんぶで いくらですか'), slots: document.querySelectorAll('.wk-till .wk-spell i').length === t.parts.length };
      const bad = tiles().find((x) => !t.parts.includes(x.dataset.p)); bad.click(); await wait(100); bad.click(); await wait(100);
      out.hint = tiles().some((x) => x.classList.contains('wk-hint') && x.dataset.p === t.parts[0]);
      for (const p of t.parts) { tiles().find((x) => x.dataset.p === p && !x.disabled).click(); await wait(60); }
      await wait(400); out.said = __said.includes('hero:ぜんぶで ' + YEN.reading(t.sum) + 'です。'); out.misses = WORK.today().score[7];
      return JSON.stringify(out); })()"""))
    assert r == {'kind': 'sum', 'things': 2, 'tags': True, 'asked': True, 'slots': True, 'hint': True, 'said': True, 'misses': 2}, r

def test_a_till_shift_pays(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + HELP + COUNTER + TILL + """ kana(46); vocab('ふたつ'); vocab('いくら'); nums(); earlier('till'); window.speak = () => Promise.resolve(); window.speakAs = () => Promise.resolve();
      location.hash = '#/chinadori'; route(); await wait(300); WORK.start(yard(), 'till'); const out = { card: Boolean(document.querySelector('.wk-till')) };
      for (let k = 0; k < 10; k++) { await ready(); await pay(); }
      for (let i = 0; i < 40 && !document.querySelector('.wk-result'); i++) await wait(100); const t = state.work.res['2026-11-10'];
      return JSON.stringify(Object.assign(out, { yen: t.yen, grade: t.grade, place: t.place })); })()"""))
    assert r == {'card': True, 'yen': 150, 'grade': 'S', 'place': 'till'}, r

# the till's customers wait as long as their things take: 30 s for one, 45 for two; at none they go, the sum shown whole
def test_a_till_customer_out_of_patience_goes(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + HELP + COUNTER + TILL + """ kana(46); vocab('いくら'); nums(); earlier('till'); window.__said = []; window.speakAs = (w, l) => { __said.push(w + ':' + l); return Promise.resolve(); };
      location.hash = '#/chinadori'; route(); await wait(300); WORK.start(yard(), 'till'); await ready();
      const t = JOBS.till.now(), bar = () => parseFloat(document.querySelector('.wk-till .wk-pat').style.getPropertyValue('--p'));
      const bad = tiles().find((x) => !t.parts.includes(x.dataset.p)); bad.click(); await wait(100); const out = { cost: bar() < 0.91 && bar() > 0.85 };
      JOBS.pat.scale = 0.02; for (let i = 0; i < 80 && !(0 in WORK.today().score); i++) await wait(25); JOBS.pat.scale = 1;
      Object.assign(out, { score: WORK.today().score[0], out: __said.some((x) => x === t.who + ':いいです！' || x === t.who + ':もう いいです！'),
        whole: [...document.querySelectorAll('.wk-till .wk-spell b')].map((x) => x.textContent).join('') === YEN.reading(t.sum), shut: tiles().every((x) => x.disabled) });
      await ready(); out.next = document.querySelector('.wk-till .wk-n').textContent;
      return JSON.stringify(out); })()"""))
    assert r == {'cost': True, 'score': 3, 'out': True, 'whole': True, 'shut': True, 'next': '2／10'}, r

def test_the_till_card_fits_a_phone(b):
    r = json.loads(b.run([("metrics", (360, 640)), ("nav", URL), ("wait", READY), ("eval", "(async () => { " + BEGIN + HELP + COUNTER + TILL + """ kana(46); vocab('いくら'); nums(); earlier('till');
      state.work.res['2026-11-10'] = { place: 'till', done: 9, score: Object.fromEntries(Array.from({ length: 9 }, (_, k) => [k, 0])) };   // two things
      TOWN.WORK.fuku = [['こめ', '米', 1480], ['ぎょうざ', '餃子', 880]];   // 2,360: the most pieces
      location.hash = '#/chinadori'; route(); await wait(300); WORK.start(yard(), 'till'); await ready(); await wait(300);
      const c = document.querySelector('.wk-till .cls-card'), q = c.getBoundingClientRect(), ts = tiles().map((x) => x.getBoundingClientRect());
      return JSON.stringify({ n: ts.length, bottom: q.bottom <= innerHeight + 1, side: q.left >= 0 && q.right <= innerWidth + 1, tiles: ts.every((t) => t.height >= 36 && t.right <= q.right && t.bottom <= innerHeight) }); })()""")])[-1])
    assert r == {'n': 12, 'bottom': True, 'side': True, 'tiles': True}, r

# the test site's switch (2026-11-19, the user had never met a price): 收銀 open whatever is learned
# — the kana too (2026-11-20: on a device still in 入門, under 46 seen, 張 never offered it, the switch on or not)
def test_the_test_site_can_open_the_till(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + """ kana(30); const out = { before: WORK.can('till').ok, offer0: WORK.offer('zhang', 'chinadori') };
      out.on = JOBS.till.numsTool(); out.open = WORK.can('till').ok; out.offer = WORK.offer('zhang', 'chinadori'); out.off = JOBS.till.numsTool(); out.after = WORK.can('till').ok;
      return JSON.stringify(out); })()"""))
    assert [r['before'], r['offer0'], r['open'], r['offer'], r['after']] == [False, None, True, 'till', False] and '不看學過沒' in r['on'] and '恢復' in r['off'], r

def test_the_generator_has_the_till_lines(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + """ const all = talkLines().map(([w, l]) => w + ':' + l);
      return JSON.stringify(['kaneda:これ、いくらですか。', 'kaneda:ぜんぶで いくらですか。', 'mike:これを ふたつ ください。', 'hero:きゅうじゅうはちえんです。', 'hero:ぜんぶで にせんさんびゃくろくじゅうえんです。',
        'hero:ぜんぶで ひゃくきゅうじゅうろくえんです。', 'zhang:…ゆっくりで いい。まちがえないで。', 'zhang:よし。'].filter((x) => !all.includes(x))); })()"""))
    assert r == [], r

# ---- 包包子 (福明, 王): 2026-11-15, the user — a close-up of the hero making the bun; six cells of kana, a kana said, tap it: the
# bun one step on, that cell a new kana, the next said; thirty taps = five buns; all right in time, five buns in the steamer ----
BUNS = """const make = async () => { location.hash = '#/chinatown'; route(); await wait(300); earlier('buns'); WORK.start(yard(), 'buns'); await wait(300); };
  const idle = async () => { for (let i = 0; i < 60 && JOBS.buns.now() && JOBS.buns.now().wait; i++) await wait(50); };
  const tap = async (right) => { await idle(); const n = JOBS.buns.now(), keys = [...document.querySelectorAll('.wk-key')];
    (right ? keys.find((x) => x.dataset.k === n.target) : keys.find((x) => x.dataset.k !== n.target)).click(); await wait(40); };
  const step = () => Number(document.querySelector('.wk-closeup').dataset.step), basic = new Set(REG.kana.slice(0, 46).map((x) => x.ch));"""

def test_the_bun_board_says_a_kana_on_it(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + HELP + BUNS + """ kana(46); window.__said = []; window.speak = (t) => { __said.push(t); return Promise.resolve(); }; window.speakAs = () => Promise.resolve();
      await make(); const n = JOBS.buns.now(), keys = [...document.querySelectorAll('.wk-key')].map((x) => x.dataset.k);
      return JSON.stringify({ six: keys.length === 6 && new Set(keys).size === 6, on: keys.includes(n.target), said: __said[__said.length - 1] === n.target, basic: keys.every((c) => basic.has(c)),
        twins: keys.includes('お') && keys.includes('を'), step: step(), steamer: document.querySelectorAll('.wk-steamer .wk-done').length }); })()"""))
    assert r == {'six': True, 'on': True, 'said': True, 'basic': True, 'twins': False, 'step': 0, 'steamer': 0}, r

def test_a_right_tap_moves_the_bun_and_swaps_the_cell(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + HELP + BUNS + """ kana(46); window.__said = []; window.speak = (t) => { __said.push(t); return Promise.resolve(); }; window.speakAs = () => Promise.resolve();
      await make(); const t = JOBS.buns.now().target, at = [...document.querySelectorAll('.wk-key')].findIndex((x) => x.dataset.k === t);
      await tap(true); const keys = [...document.querySelectorAll('.wk-key')].map((x) => x.dataset.k), n = JOBS.buns.now();
      return JSON.stringify({ step: step(), swapped: keys[at] !== t, six: new Set(keys).size === 6, next: n.target !== t && keys.includes(n.target) && __said[__said.length - 1] === n.target, tap: n.tap }); })()"""))
    assert r == {'step': 1, 'swapped': True, 'six': True, 'next': True, 'tap': 1}, r

def test_a_miss_sets_the_bun_askew_and_twice_lights_the_cell(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + HELP + BUNS + """ kana(46); window.speak = () => Promise.resolve(); window.speakAs = () => Promise.resolve();
      await make(); const t = JOBS.buns.now().target; await tap(false); const out = { step: step(), askew: document.querySelector('.wk-closeup').classList.contains('flaw'), hint: Boolean(document.querySelector('.wk-key.wk-hint')) };
      await tap(false); out.lit = document.querySelector('.wk-key.wk-hint').dataset.k === t; out.same = JOBS.buns.now().target === t;
      return JSON.stringify(out); })()"""))
    assert r == {'step': 0, 'askew': True, 'hint': False, 'lit': True, 'same': True}, r

def test_three_taps_are_one_task_and_thirty_pay(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + HELP + BUNS + """ kana(46); window.speak = () => Promise.resolve(); window.speakAs = () => Promise.resolve();
      await make(); const day = () => state.work.res['2026-11-10']; await tap(true); await tap(true); const out = { two: day().done }; await tap(true); out.three = day().done;
      for (let i = 3; i < 30; i++) await tap(true);
      for (let i = 0; i < 60 && !document.querySelector('.wk-result'); i++) await wait(100);
      return JSON.stringify(Object.assign(out, { done: day().done, yen: day().yen, grade: day().grade })); })()"""))
    assert r == {'two': 0, 'three': 1, 'done': 10, 'yen': 150, 'grade': 'S'}, r

def test_a_shift_resumed_starts_at_its_tap(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + HELP + BUNS + """ kana(46); window.speak = () => Promise.resolve(); window.speakAs = () => Promise.resolve();
      state.work.res['2026-11-10'] = { place: 'buns', done: 7, score: { 0: 0, 1: 0, 2: 1, 3: 0, 4: 3, 5: 3, 6: 1 } }; await make();   // a perfect bun, an askew one, a late one, half of one
      return JSON.stringify({ tap: JOBS.buns.now().tap, step: step(), askew: document.querySelector('.wk-closeup').classList.contains('flaw'), steamer: document.querySelectorAll('.wk-steamer .wk-done').length,
        shiny: document.querySelectorAll('.wk-steamer .wk-done.ok').length, ugly: document.querySelectorAll('.wk-steamer .wk-done.ugly').length, clock: getComputedStyle(document.querySelector('.wk-clock')).display !== 'none' }); })()"""))
    assert r == {'tap': 21, 'step': 3, 'askew': True, 'steamer': 3, 'shiny': 1, 'ugly': 1, 'clock': True}, r

def test_all_right_in_time_fills_the_steamer(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + HELP + BUNS + """ kana(46); window.speak = () => Promise.resolve(); window.speakAs = () => Promise.resolve();
      await make(); for (let i = 0; i < 30; i++) await tap(true); await wait(300);
      return JSON.stringify({ gold: document.querySelector('.wk-buns .cls-card').classList.contains('wk-shine-all'), buns: document.querySelectorAll('.wk-steamer .wk-done.ok').length,
        said: document.querySelector('.wk-say').textContent.includes('てんさい') }); })()"""))
    assert r == {'gold': True, 'buns': 5, 'said': True}, r

def test_a_miss_keeps_the_steamer_plain(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + HELP + BUNS + """ kana(46); window.speak = () => Promise.resolve(); window.speakAs = () => Promise.resolve();
      await make(); await tap(false); for (let i = 0; i < 30; i++) await tap(true); await wait(300);
      return JSON.stringify({ gold: document.querySelector('.wk-buns .cls-card').classList.contains('wk-shine-all') }); })()"""))
    assert r == {'gold': False}, r

# 2026-11-19, the user: every job timed, as 外場 is — each bun on its own clock (the bar by the speaker, from its first step; 15 s, 2026-11-20): out, the
# rest of its tasks lost, 王's おそい！, the bun a sorry lump on the board (2026-11-20, the user: an ugly bun for one not finished)
# that goes into the steamer so, and the next bun is begun; no gold for that shift
def test_a_bun_past_its_clock_goes_in_ugly_and_the_next_begins(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + HELP + BUNS + """ kana(46); window.speak = () => Promise.resolve(); window.__said = []; window.speakAs = (w, l) => { __said.push(w + ':' + l); return Promise.resolve(); };
      await make(); const bar = () => parseFloat(document.querySelector('.wk-clock').style.getPropertyValue('--p'));
      await tap(true); await tap(true); await wait(400); const out = { running: bar() < 1 && bar() > 0.9 };
      JOBS.pat.scale = 0.01; for (let i = 0; i < 40 && JOBS.buns.now() && JOBS.buns.now().tap < 6; i++) await wait(50); JOBS.pat.scale = 1;
      Object.assign(out, { tap: JOBS.buns.now().tap, score: Object.assign({}, WORK.today().score), said: __said.includes('wang:おそい！'), lump: JOBS.buns.now().lump && document.querySelector('.wk-closeup').classList.contains('lump'),
        steamer: document.querySelectorAll('.wk-steamer .wk-done').length, red: document.querySelector('.wk-clock').dataset.mood === 'mad' });
      await idle(); await wait(300); Object.assign(out, { fresh: bar() > 0.95 && document.querySelector('.wk-clock').dataset.mood === 'ok', step: step(), board: !document.querySelector('.wk-closeup').classList.contains('lump'),
        ugly: document.querySelectorAll('.wk-steamer .wk-done.ugly').length, after: document.querySelectorAll('.wk-steamer .wk-done').length });
      for (let i = 6; i < 30; i++) await tap(true); await wait(300);
      Object.assign(out, { gold: document.querySelector('.wk-buns .cls-card').classList.contains('wk-shine-all'), grade: WORK.today().grade });
      return JSON.stringify(out); })()"""))
    assert r == {'running': True, 'tap': 6, 'score': {'0': 3, '1': 3}, 'said': True, 'lump': True, 'steamer': 0, 'red': True, 'fresh': True, 'step': 0, 'board': True, 'ugly': 1, 'after': 1, 'gold': False, 'grade': 'B'}, r

def test_buns_only_while_wang_is_there(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + """ kana(46); TOWNEV.clock = { h: 21, day: new Date(2026, 10, 10) }; const night = WORK.can('buns');
      TOWNEV.clock = { h: 12, day: new Date(2026, 10, 10) }; return JSON.stringify({ night, noon: WORK.can('buns').ok }); })()"""))
    assert not r['night']['ok'] and '王' in r['night']['why'] and r['noon'], r

def test_the_bun_card_fits_a_phone(b):
    r = json.loads(b.run([("metrics", (360, 640)), ("nav", URL), ("wait", READY), ("eval", "(async () => { " + BEGIN + HELP + BUNS + """ kana(46); await make(); await wait(200);
      const card = document.querySelector('.wk-buns .cls-card'), keys = [...document.querySelectorAll('.wk-key')].map((x) => x.getBoundingClientRect()), c = card.getBoundingClientRect();
      const ear = document.querySelector('.wk-krow .wk-ear'), svg = ear.querySelector('svg'), out = { fits: card.scrollHeight <= card.clientHeight + 1 && c.bottom <= innerHeight + 1, side: c.left >= 0 && c.right <= innerWidth + 1,
        keys: keys.length === 6 && keys.every((q) => q.width >= 60 && q.height >= 48), ear: Boolean(svg) && !ear.textContent.includes('🔊') && svg.getBoundingClientRect().width >= 18 && ear.getBoundingClientRect().width >= 40 };   // the app's speaker, not 🔊 (2026-11-20, the user)
      CLASS.close(); WORK.intro(yard(), 'buns'); await wait(200); const rules = document.querySelector('.wk-rules').textContent; out.rules = rules.includes('15 秒') && !rules.includes('🔊');
      return JSON.stringify(out); })()""")])[-1])
    assert r == {'fits': True, 'side': True, 'keys': True, 'ear': True, 'rules': True}, r

# 2026-11-19, the user: 張's tasks to 包包子 — the first job, at five kana seen: four cells of those while under twelve are seen
def test_buns_open_at_five_kana_on_a_board_of_four(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + HELP + BUNS + """ kana(5); window.speak = () => Promise.resolve(); window.speakAs = () => Promise.resolve(); window.__errs = []; window.addEventListener('error', (e) => __errs.push(String(e.message)));
      const out = { can: WORK.can('buns').ok }, keys = () => [...document.querySelectorAll('.wk-key')].map((x) => x.dataset.k), mine = (ks) => ks.length === 4 && new Set(ks).size === 4 && ks.every((c) => 'あいうえお'.includes(c));
      await make(); out.four = mine(keys()) && document.querySelector('.wk-keys').classList.contains('four');
      for (let i = 0; i < 12; i++) await tap(true); out.still = mine(keys()) && JOBS.buns.now().tap === 12;
      CLASS.close(); delete state.work.res['2026-11-10']; kana(12); await make(); out.six = keys().length;
      return JSON.stringify(Object.assign(out, { errs: __errs })); })()"""))
    assert r == {'can': True, 'four': True, 'still': True, 'six': 6, 'errs': []}, r

# 2026-11-20, the user: 包包子 back to kana only (張's words that came in with test.31 out again), hiragana and katakana both — the
# board from every 清音 seen, a kana never beside its other script (あ／ア sound the same), never a word, however many are learned
def test_the_bun_board_has_hiragana_and_katakana_and_no_words(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + HELP + BUNS + """ REG.kana.filter((x) => x.seion).forEach((x) => { state.srs[x.key] = rec(); }); words(['これ', 'それ', 'あれ', 'どれ', 'ここ']);
      window.__said = []; window.speak = (t) => { __said.push(t); return Promise.resolve(); }; window.speakAs = () => Promise.resolve();
      const kata = (c) => c >= 'ァ' && c <= 'ヶ', hira = (c) => (kata(c) ? String.fromCharCode(c.charCodeAt(0) - 0x60) : c), boards = [];
      await make(); for (let i = 0; i < 24; i++) { await idle(); boards.push([...document.querySelectorAll('.wk-key')].map((x) => x.dataset.k)); await tap(true); }
      const all = boards.flat();
      return JSON.stringify({ six: boards.every((k) => k.length === 6), kata: all.some(kata), hira: all.some((c) => !kata(c)), kana: all.every((c) => c.length === 1),
        apart: boards.every((k) => new Set(k.map(hira)).size === 6 && !(k.map(hira).includes('お') && k.map(hira).includes('を'))), saidKata: __said.some(kata), words: __said.filter((t) => t.length > 1) }); })()"""))
    assert r == {'six': True, 'kata': True, 'hira': True, 'kana': True, 'apart': True, 'saidKata': True, 'words': []}, r

# ---- the final review's findings (2026-11-15) ----
def test_a_shift_closed_at_its_last_moment_is_still_paid(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + HELP + COUNTER + """ kana(46); earlier('counter'); window.__errs = []; window.addEventListener('error', (e) => __errs.push(String(e.message)));
      window.speak = () => Promise.resolve(); window.speakAs = () => Promise.resolve(); location.hash = '#/chinadori'; route(); await wait(300);
      const on = async () => { for (let i = 0; i < 40 && !document.querySelector('.wk-cust.on'); i++) await wait(100); };
      WORK.start(yard(), 'counter'); for (let k = 0; k < 9; k++) { await on(); await serve(); }
      await on(); const t = JOBS.counter.now(); document.querySelector(`.wk-good[data-good="${t.good[0]}"]`).click(); CLASS.close();   // the tenth, and the card shut at once
      await wait(1500); document.querySelectorAll('.wk-result').forEach((x) => x.remove()); const d = state.work.res['2026-11-10'];
      const again = WORK.start(yard(), 'counter'); await wait(300);
      return JSON.stringify({ yen: d.yen, again, errs: __errs }); })()"""))
    assert r == {'yen': 150, 'again': False, 'errs': []}, r

def test_one_who_knows_kana_already_can_do_every_job(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + HELP + """ kana(0); state.kanaKnown = true; window.__errs = []; window.addEventListener('error', (e) => __errs.push(String(e.message)));
      window.speak = () => Promise.resolve(); window.speakAs = () => Promise.resolve(); const out = {};
      out.buns = WORK.can('buns').ok; out.counter = JOBS.counter.make().every((t) => t.good && t.goods.length === 4);
      out.waiter = WORK.can('waiter').ok; out.till = WORK.can('till').ok;
      return JSON.stringify(Object.assign(out, { errs: __errs })); })()"""))
    assert r == {'buns': True, 'counter': True, 'waiter': False, 'till': False, 'errs': []}, r   # 外場 still wants its 入門 words, 收銀 its numbers

def test_a_card_shut_and_opened_again_follows_the_new_one(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + HELP + BUNS + """ kana(46); earlier('buns'); window.speak = () => Promise.resolve(); window.speakAs = () => new Promise((ok) => setTimeout(ok, 400));
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

def test_the_till_says_each_line_to_its_end(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + HELP + COUNTER + TILL + TALK + """ kana(46); vocab('いくら'); nums(); earlier('till'); talk(700, 400); upTo('till', 8);
      location.hash = '#/chinadori'; route(); await wait(300); WORK.start(yard(), 'till'); const R = Math.random; Math.random = () => 0.1;   // 張's word after each
      for (let k = 0; k < 2; k++) { await ready(); await hush(); const t = JOBS.till.now(); for (const p of t.parts) { tiles().find((x) => x.dataset.p === p && !x.disabled).click(); await wait(60); } await wait(200); }
      for (let i = 0; i < 100 && !document.querySelector('.wk-result'); i++) await wait(100); Math.random = R;
      return JSON.stringify({ cut: __cut, shut: !document.querySelector('.wk-till'), paid: state.work.res['2026-11-10'].yen > 0 }); })()"""))
    assert r == {'cut': [], 'shut': True, 'paid': True}, r

def test_the_counter_says_each_line_to_its_end(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + HELP + COUNTER + TALK + """ kana(46); earlier('counter'); talk(700, 400); upTo('counter', 8);
      location.hash = '#/chinadori'; route(); await wait(300); WORK.start(yard(), 'counter'); const R = Math.random; Math.random = () => 0.1;   // 周's word after each
      for (let k = 0; k < 2; k++) { for (let i = 0; i < 60 && !document.querySelector('.wk-cust.on'); i++) await wait(100); await hush();
        const t = JOBS.counter.now(); document.querySelector(`.wk-good[data-good="${t.good[0]}"]`).click(); await wait(200); }
      for (let i = 0; i < 80 && !document.querySelector('.wk-result'); i++) await wait(100); Math.random = R;
      return JSON.stringify({ cut: __cut, shut: !document.querySelector('.wk-counter'), paid: state.work.res['2026-11-10'].yen > 0 }); })()"""))
    assert r == {'cut': [], 'shut': True, 'paid': True}, r

def test_the_bun_keepers_last_word_is_said_to_its_end(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + HELP + BUNS + TALK + """ kana(46); talk(1500, 300); upTo('buns', 9); await make();
      for (let i = 0; i < 3; i++) { await hush(); await tap(true); }
      for (let i = 0; i < 80 && !document.querySelector('.wk-result'); i++) await wait(100);
      return JSON.stringify({ cut: __cut, shut: !document.querySelector('.wk-buns'), paid: state.work.res['2026-11-10'].yen > 0 }); })()"""))
    assert r == {'cut': [], 'shut': True, 'paid': True}, r

# 2026-11-18, the user: the jobs wanted a little music — 中華街の しごと while a street job's card is up, gone with the card
def test_a_street_job_plays_its_music_while_its_card_is_up(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + HELP + """ kana(46); earlier('counter'); state.settings.musicVol = 1; window.speak = () => Promise.resolve(); window.speakAs = () => Promise.resolve();
      location.hash = '#/chinadori'; route(); await wait(300); const out = { before: MUSIC.wants() };
      WORK.start(yard(), 'counter'); await wait(300); out.on = [MUSIC.wants(), MUSIC.playing()];
      CLASS.close(); await wait(800); out.shut = [MUSIC.wants(), MUSIC.playing()];
      return JSON.stringify(out); })()"""))
    assert r == {'before': '', 'on': ['chukagai', True], 'shut': ['', False]}, r

# ---- the test site's 無限次數 (2026-11-15, the user): shift after shift, any place, on this device; each kept with its pay ----
def test_the_test_site_can_work_without_end(b):
    r = json.loads(ev(b, "(async () => { " + BEGIN + """ kana(46); stub('buns'); stub('counter', true); state.work.res['2026-01-02'] = { place: 'counter', done: 1, score: { 0: 0 } }; location.hash = '#/chinadori'; route(); await wait(200);
      const shift = (job) => { WORK.start(yard(), job); for (let k = 0; k < 10; k++) __ctx.right(k, 0); __ctx.finish(); document.querySelectorAll('.wk-result').forEach((x) => x.remove()); };
      const out = {}; shift('buns'); out.limited = WORK.can('buns').ok; out.earned = yenEarned();
      out.msg = WORK.tool(); out.again = WORK.can('buns').ok && WORK.can('counter').ok; shift('counter'); shift('buns');
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
