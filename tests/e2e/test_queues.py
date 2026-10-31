"""2026-10-30 (1.0.20): 三顆以下照間隔複習、四顆／五顆／錯題本是每天出固定比例的 queue、新題數看正確率與錯題本。"""
import json, os, subprocess, sys, time
sys.path.insert(0, os.path.dirname(__file__))
from cdp import Browser
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
PORT = 8801
URL = f"http://127.0.0.1:{PORT}/"
READY = "typeof state === 'object' && !!state.updatedAt && typeof speakScript === 'function'"

def ev(b, js, pre=()):
    return b.run([("nav", URL), ("wait", READY)] + list(pre) + [("eval", js)])[-1]

# a main-course account at week 1 with nothing learned yet
FRESH = "state.stage = 'main'; state.kanaKnown = true; state.introSeen = true; state.startChosen = true; state.currentUnit = 'm1'; saveState(); DAILY_CACHE = null;"
# rec(b, extra): a record at level b, last answered ten days ago, due in three days
REC = """const t = todayStr(); const rec = (b, extra) => Object.assign({ b, s: LEVEL_FROM_S[b - 1] || 0.5, d: 5, due: addDays(t, 3), n: 3, ok: 3, ng: 0, st: 3, last: addDays(t, -10), lapse: 0, intro: addDays(t, -30) }, extra || {});
  const words = REG.vocab.filter(v => v.builtin && v.lv === 'N5');"""

# ---- Task 1: 分層與升級 ----
def test_tier_follows_stars_ladder_and_out(b):
    js = "(() => { " + FRESH + REC + """ const k = words.slice(0, 7).map(v => v.key);
      state.srs[k[0]] = rec(2); state.srs[k[1]] = rec(3); state.srs[k[2]] = rec(4); state.srs[k[3]] = rec(6);
      state.srs[k[4]] = rec(4, { rl: 0 }); state.srs[k[5]] = rec(6, { out: 1, f: { 'v-spell': [1, 0] } }); delete state.srs[k[6]];   // out: left while 已熟練
      return JSON.stringify([...k.map(tierOf), tierOf(REG.listen[0].key), tierOf(REG.read[0].key)]); })()"""
    r = json.loads(ev(b, js))
    assert r == ['srs', 'srs', 'q4', 'q5', 'srs', 'out', 'new', None, None], r

# 1.0.21: four stars answered right go by memory strength, not straight to five: one that waited about twenty days in its
# queue reaches five, one answered the day it was marked stays at four, and so does a hard one (high difficulty)
def test_four_stars_go_up_by_memory_strength(b):
    js = "(() => { " + FRESH + REC + """ const [w, s, h] = words.slice(0, 3).map(v => v.key);
      state.srs[w] = rec(4, { last: addDays(t, -20) }); state.srs[s] = rec(4, { last: t }); state.srs[h] = rec(4, { d: 10, last: addDays(t, -20) });
      [w, s, h].forEach(k => srsAnswer(k, true));
      return JSON.stringify({ waited: state.srs[w].b >= 5, sameDay: state.srs[s].b, hard: state.srs[h].b }); })()"""
    r = json.loads(ev(b, js))
    assert r == {'waited': True, 'sameDay': 4, 'hard': 4}, r

# 1.0.21: the reviews' target recall is fixed at 90% (it followed the accuracy of the last 100 due reviews before), so
# nothing records those reviews any more
def test_retention_is_fixed_at_ninety(b):
    js = "(() => { " + FRESH + REC + """ const iv = () => Math.round(fsrsInterval(10));
      state.reviewRecent = Array(50).fill(0); const low = iv(); state.reviewRecent = Array(50).fill(1); const high = iv();
      delete state.reviewRecent; const k = words[0].key; state.srs[k] = rec(2, { due: t, last: addDays(t, -6) }); srsAnswer(k, true);
      return JSON.stringify({ low, high, written: 'reviewRecent' in state, gone: typeof autoRetention === 'undefined' }); })()"""
    r = json.loads(ev(b, js))
    assert r == {'low': 10, 'high': 10, 'written': False, 'gone': True}, r

def test_pre_items_leave_after_a_five_star_right_answer(b):
    js = "(() => { " + FRESH + REC + """ const a = 'a:あ', w = words[0].key, p = REG.vocab.find(v => v.builtin && v.lv === 'PRE_N5').key;
      state.srs[a] = rec(6); srsAnswer(a, true); const out1 = state.srs[a].out, tier1 = tierOf(a);
      srsAnswer(a, false); const out2 = state.srs[a].out, tier2 = tierOf(a);
      state.srs[w] = rec(6); srsAnswer(w, true); state.srs[p] = rec(5, { f: { 'v-spell': [1, 0] } }); srsAnswer(p, true);   // spelled: 已熟練
      return JSON.stringify({ out1, tier1, out2: out2 === undefined, tier2, word: state.srs[w].out === undefined, pre: state.srs[p].out, pre4: isPreItem(p), n5: isPreItem(w) }); })()"""
    r = json.loads(ev(b, js))
    assert r['out1'] == 1 and r['tier1'] == 'out', r
    assert r['out2'] is True and r['tier2'] == 'srs', r
    assert r['word'] is True and r['pre'] == 1 and r['pre4'] is True and r['n5'] is False, r

# 1.0.21: an 入門 word with a spelling question leaves for good only once it is 已熟練 (five stars and spelled) and is
# answered right again; a flashcard's right answer before that keeps it; 取消熟練 brings one that left back (M10)
def test_a_pre_word_leaves_only_once_mastered(b):
    js = "(() => { " + FRESH + REC + """ const p = REG.vocab.find(x => x.builtin && x.lv === 'PRE_N5' && x.r && !/[一-龯]/.test(x.r) && x.r.length >= 2 && x.r.length <= 8).key; const o = () => (state.srs[p].out === undefined ? null : state.srs[p].out);
      state.srs[p] = rec(6, { f: {} }); srsAnswer(p, true, { grade: 'good' }); const flash = o();
      state.srs[p].last = addDays(t, -30); srsAnswer(p, true); recordFormat(state.srs[p], 'v-spell', true); const stays = o(); const spelled = srsLevelLabel(state.srs[p], p);   // answerCurrent's order: schedule, then format
      state.srs[p].last = addDays(t, -30); srsAnswer(p, true); const leaves = o();
      unmarkKnown(p); const unmark = o();
      return JSON.stringify({ flash, stays, spelled, leaves, unmark }); })()"""
    r = json.loads(ev(b, js))
    assert r == {'flash': None, 'stays': None, 'spelled': '已熟練', 'leaves': 1, 'unmark': None}, r

# final review: 1.0.20 let an 入門 word leave (`out`) at five stars whether or not it had been spelled; under 1.0.21 such a
# word is not 已熟練, so it does not stay out: it waits in the five-star queue, is asked to spell, and is out once spelled
def test_a_pre_word_marked_out_before_its_spelling_comes_back_to_spell(b):
    js = "(() => { " + FRESH + REC + """ const p = REG.vocab.find(x => x.builtin && x.lv === 'PRE_N5' && x.r && !/[一-龯]/.test(x.r) && x.r.length >= 2 && x.r.length <= 8).key;
      state.srs = {}; state.srs[p] = rec(6, { out: 1, f: {} });
      const out = { tier: tierOf(p), label: dueLabel(state.srs[p], p) };
      delete state.today.plan; DAILY_CACHE = null; out.queued = computeDailyPlan().q5.some(x => x.key === p);
      out.fmt = makeQuestion(REG.byKey.get(p), {}).fmt;
      state.srs[p].f['v-spell'] = [1, 0]; out.spelledTier = tierOf(p);
      return JSON.stringify(out); })()"""
    r = json.loads(ev(b, js))
    assert r == {'tier': 'q5', 'label': '五顆・排隊中', 'queued': True, 'fmt': 'v-spell', 'spelledTier': 'out'}, r

def test_only_srs_tier_items_are_due(b):
    js = "(() => { " + FRESH + REC + """ const y = addDays(t, -1); const [k4, k2] = words.slice(0, 2);
      state.srs[k4.key] = rec(4, { due: y }); state.srs[k2.key] = rec(2, { due: y });
      return JSON.stringify([isDueToday(k4, t), isDueToday(k2, t)]); })()"""
    r = json.loads(ev(b, js))
    assert r == [False, True], r

def test_first_answers_are_tallied_as_fresh(b):
    js = "(() => { " + FRESH + REC + """ delete state.dailyLogs[t]; const [x, y] = words.slice(0, 2).map(v => v.key); delete state.srs[x]; delete state.srs[y];
      srsAnswer(x, true); srsAnswer(y, false); srsAnswer(x, true); const fresh = state.dailyLogs[t].fresh;
      markPassedStage('p1', new Set());
      return JSON.stringify({ fresh, after: state.dailyLogs[t].fresh }); })()"""
    r = json.loads(ev(b, js))
    assert r == {'fresh': 2, 'after': 2}, r

# ---- Task 2: 新題數與分配 ----
def test_new_count_follows_recent_accuracy_and_the_notebook(b):
    js = "(() => { " + FRESH + """ const set = (right, total, mk) => { state.recent = Array.from({ length: total }, (_, i) => (i < right ? 1 : 0));
        state.mistakes = Array.from({ length: mk }, (_, i) => ({ id: 'mk' + i, prompt: 'p' + i, answer: 'a', ts: i })); return newCountToday(); };
      return JSON.stringify([set(95, 100, 0), set(85, 100, 34), set(60, 100, 200), set(20, 20, 0)].map(x => x.n)); })()"""
    r = json.loads(ev(b, js))
    assert r == [20, 12, 3, 15], r

def largest_remainder(n, weights):
    total = sum(weights.values()); raw = {k: n * w / total for k, w in weights.items()}
    out = {k: int(v) for k, v in raw.items()}
    for k in sorted(raw, key=lambda k: raw[k] - out[k], reverse=True)[:n - sum(out.values())]: out[k] += 1
    return out

def test_split_follows_unseen_shares_and_passes_on_blocked_slots(b):
    js = "(() => { " + FRESH + """ const unseen = (x) => !state.srs[x.key];
      const w = { v: REG.vocab.filter(v => v.builtin && unseen(v)).length, g: REG.grammar.filter(g => g.u !== 'm0' && unseen(g)).length, k: REG.kanji.filter(unseen).length };
      const main = splitNew(15); const count = (s) => ({ a: s.a.length, v: s.v.length, g: s.g.length, k: s.k.length });
      state.stage = 'pre'; state.kanaKnown = false; const pre = splitNew(15);
      return JSON.stringify({ w, main: count(main), pre: count(pre), kana: pre.a.every(x => x.kind === 'a') }); })()"""
    r = json.loads(ev(b, js))
    want = largest_remainder(15, r['w'])
    assert r['main'] == {'a': 0, 'v': want['v'], 'g': want['g'], 'k': want['k']} and sum(r['main'].values()) == 15, (r, want)
    assert r['pre'] == {'a': 15, 'v': 0, 'g': 0, 'k': 0} and r['kana'], r   # the kana gate is closed: every slot goes to kana

def test_recent_keeps_the_last_hundred_answers(b):
    js = "(() => { " + FRESH + " state.recent = []; for (let i = 0; i < 120; i++) recordAccuracy(i % 2 === 0); return state.recent.length; })()"
    r = ev(b, js)
    assert r == 100, r

# ---- Task 3: 今天的清單照分層排 ----
def test_queue_draws_follow_the_rates_and_caps(b):
    js = "(() => { " + FRESH + REC + """ const ws = words.slice(0, 700);
      const plant = (n, b0) => { state.srs = {}; ws.slice(0, n).forEach((v, i) => { state.srs[v.key] = rec(b0, { last: addDays(t, -(i + 1)) }); }); };   // later ones have waited longer
      const out = {};
      plant(40, 4); const q40 = computeDailyPlan().q4; out.q40 = q40.length; out.oldest = q40.map(x => x.key).join() === ws.slice(38, 40).reverse().map(v => v.key).join();
      plant(700, 4); out.q700 = computeDailyPlan().q4.length;
      plant(1, 4); out.q1 = computeDailyPlan().q4.length;
      plant(100, 6); out.q5 = computeDailyPlan().q5.length;
      return JSON.stringify(out); })()"""
    r = json.loads(ev(b, js))
    assert r == {'q40': 2, 'oldest': True, 'q700': 30, 'q1': 1, 'q5': 3}, r

def test_srs_dues_are_capped_at_fifty_oldest_first(b):
    js = "(() => { " + FRESH + REC + """ state.srs = {}; const ws = words.slice(0, 80);
      ws.forEach((v, i) => { state.srs[v.key] = rec(2, { due: addDays(t, -(i + 1)), last: addDays(t, -(i + 4)) }); });   // due 1…80 days ago
      const p = computeDailyPlan(); const due = [].concat(p.dueV, p.dueG, p.dueK, p.dueA, p.dueC).map(x => x.key).sort();
      return JSON.stringify({ n: due.length, oldest: due.join() === ws.slice(30).map(v => v.key).sort().join() }); })()"""
    r = json.loads(ev(b, js))
    assert r == {'n': 50, 'oldest': True}, r

# 1.0.21: the missed items on the 1/3/7 ladder due today all come, on top of the 50 other reviews (the 50 oldest); a day
# with many of them still starts with a set of the usual size
def test_ladder_dues_come_on_top_of_the_fifty(b):
    js = "(() => { " + FRESH + REC + """ state.srs = {}; const ws = words.slice(0, 80), lad = words.slice(80, 90);
      ws.forEach((v, i) => { state.srs[v.key] = rec(2, { due: addDays(t, -(i + 1)), last: addDays(t, -(i + 4)) }); });   // due 1…80 days ago
      lad.forEach(v => { state.srs[v.key] = rec(1, { rl: 1, due: t, last: addDays(t, -2) }); });
      const p = computeDailyPlan(); const due = [].concat(p.dueV, p.dueG, p.dueK, p.dueA, p.dueC).map(x => x.key);
      const rest = due.filter(k => !lad.some(v => v.key === k)).sort();
      delete state.today.plan; DAILY_CACHE = null;
      return JSON.stringify({ n: due.length, ladder: lad.filter(v => due.includes(v.key)).length, oldest: rest.join() === ws.slice(30).map(v => v.key).sort().join(), session: dailyQueue(20).items.length }); })()"""
    r = json.loads(ev(b, js))
    assert r == {'n': 60, 'ladder': 10, 'oldest': True, 'session': 20}, r

def test_new_items_and_drills_follow_the_rule(b):
    js = "(() => { " + FRESH + """ state.recent = Array.from({ length: 100 }, (_, i) => (i < 95 ? 1 : 0)); state.mistakes = [];
      const p = computeDailyPlan(); const fresh = p.newV.length + p.newG.length + p.newK.length + p.newA.length;
      state.currentUnit = 'm18'; const p18 = computeDailyPlan();
      return JSON.stringify({ fresh, n: p.n, split: p.split, drills: p18.newC.length }); })()"""
    r = json.loads(ev(b, js))
    assert r['fresh'] == 20 and r['n'] == 20 and sum(r['split'].values()) == 20 and r['drills'] == 1, r

# four hand-made notebook cards of one category (a card needs three other answers for its options); mk_t3 waited longest
HANDMADE = """state.mistakes = ['測試', '學習', '日本', '語言'].map((a, i) => ({ id: 'mk_t' + i, key: '', cat: '自訂', prompt: 'テスト' + i, answer: a, wrong: '', why: '', count: 1, streak: 0, mastered: false, note: '', date: addDays(todayStr(), -(i + 1)) }));"""
# 1.0.21: there is no notebook queue any more: no `mk` list, no hand-made cards on today's list, and a notebook item whose
# ladder day is tomorrow waits for it
def test_the_daily_list_has_no_notebook_queue(b):
    js = "(() => { " + FRESH + REC + HANDMADE + """ const w = words[0];
      state.srs = {}; state.srs[w.key] = rec(1, { rl: 1, due: addDays(t, 1), last: addDays(t, -1) });
      state.mistakes.push({ id: 'mk_w', key: w.key, cat: '單字', prompt: 'p', answer: 'a', wrong: '', why: '', count: 1, streak: 0, mastered: false, note: '', date: addDays(t, -30) });
      const p = computeDailyPlan(); delete state.today.plan; DAILY_CACHE = null; dailyPlan(); const keys = Object.values(state.today.plan.lists).flat();
      return JSON.stringify({ mk: 'mk' in p, lists: PLAN_LISTS.includes('mk'), cards: keys.filter(k => k.startsWith('m:')).length, early: keys.includes(w.key) }); })()"""
    r = json.loads(ev(b, js))
    assert r == {'mk': False, 'lists': False, 'cards': 0, 'early': False}, r

# a hand-made notebook card answered on the notebook page counts in 今天做了, as it did from the daily list (B13)
def test_a_handmade_card_answered_in_the_notebook_counts_today(b):
    js = "(() => { " + FRESH + HANDMADE + """ const before = itemsDoneToday();
      startSession('mistakes'); const q = currentEntry().q; answerCurrent(q.answer);
      const out = { answered: answeredToday('m:' + q.mistakeId), more: itemsDoneToday() - before };
      SESSION = null; document.body.classList.remove('practicing'); return JSON.stringify(out); })()"""
    r = json.loads(ev(b, js))
    assert r == {'answered': True, 'more': 1}, r

# the day 1.0.21 arrives, today's list may have been made by 1.0.20 with notebook items in it (lists.mk, an answered card
# kept): it still loads, those are left out, and the ring counts the rest
def test_a_1_0_20_plan_with_notebook_cards_still_loads(b):
    js = "(() => { " + FRESH + REC + HANDMADE + """ let error = null; const out = {};
      try {
        delete state.today.plan; DAILY_CACHE = null; const p = computeDailyPlan(); const lists = {};
        PLAN_LISTS.filter(n => n !== 'mk').forEach(n => { lists[n] = (p[n] || []).map(x => x.key); });
        const listed = new Set(Object.values(lists).flat()); const extra = words.find(v => !listed.has(v.key));
        lists.mk = ['m:mk_t3', extra.key]; lists.kept = ['m:mk_t3'];
        state.today.plan = { lists, note: '', n4Open: p.n4Open, n: p.n, split: p.split, stage: state.stage, start: Boolean(state.startChosen), listenOn: speechAvailable() };
        const d = dailyPlan(); const got = Object.keys(d).filter(n => Array.isArray(d[n])).flatMap(n => d[n].map(x => x.key));
        out.mkGone = !got.includes(extra.key) && !got.some(k => k.startsWith('m:')); out.withoutMk = listed.size;
        out.total = dayProgress().total; renderToday(document.getElementById('view'));
      } catch (e) { error = String(e); }
      return JSON.stringify(Object.assign(out, { error })); })()"""
    r = json.loads(ev(b, js))
    assert r['error'] is None and r['mkGone'] and r['total'] == r['withoutMk'], r

def test_the_plan_keeps_its_queues_all_day(b):
    js = "(() => { " + FRESH + REC + """ state.srs = {}; words.slice(0, 40).forEach((v, i) => { state.srs[v.key] = rec(4, { last: addDays(t, -(i + 1)) }); });
      delete state.today.plan; DAILY_CACHE = null; const p = dailyPlan(); const before = dayProgress(); const k = p.q4[0].key;
      srsAnswer(k, true); const after = dayProgress();
      return JSON.stringify({ q4: p.q4.length, b: state.srs[k].b, total: after.total === before.total, done: after.done - before.done, n: state.today.plan.n, split: state.today.plan.split }); })()"""
    r = json.loads(ev(b, js))
    assert r['q4'] == 2 and r['b'] >= 5 and r['total'] and r['done'] == 1, r
    assert isinstance(r['n'], int) and r['n'] >= 3 and sorted(r['split']) == ['a', 'g', 'k', 'v'], r

# ---- Task 4: 拿掉負荷上限 ----
def test_settings_have_no_load_cap_or_kana_per_day(b):
    js = """(() => { const html = settingsLearn(); return JSON.stringify({ cap: /每天負荷上限|data-key="loadCap"/.test(html), kana: /每天新假名|data-key="newKanaPerDay"/.test(html) }); })()"""
    r = json.loads(ev(b, js))
    assert r == {'cap': False, 'kana': False}, r

def test_quota_users_follow_todays_split(b):
    js = "(() => { " + FRESH + """ delete state.today.plan; DAILY_CACHE = null; const sp = dailyPlan().split;
      const fresh = buildFlashQueue('N5').filter(k => !state.srs[k]).length;
      return JSON.stringify({ sp, left: ['v', 'g', 'k', 'a'].map(k => todayNewLeft(k)), fresh }); })()"""
    r = json.loads(ev(b, js))
    assert r['left'] == [r['sp']['v'], r['sp']['g'], r['sp']['k'], r['sp']['a']] and r['fresh'] == r['sp']['v'], r

def test_exam_countdown_projects_the_finish_date(b):
    js = "(() => { " + FRESH + """ const t = todayStr(); for (let i = 1; i <= 10; i++) state.dailyLogs[addDays(t, -i)] = { vocabCount: 20, fresh: 12 };
      state.settings.examDate = addDays(t, 400); saveState();
      const unseen = (arr) => arr.filter(x => !state.srs[x.key]).length;
      const left = unseen(REG.vocab.filter(v => v.builtin)) + unseen(REG.grammar.filter(g => g.u !== 'm0')) + unseen(REG.kanji);
      const a = coursePace(); const want = addDays(t, Math.ceil(left / 12));
      location.hash = '#/exam'; route(); const hint = (document.querySelector('.hero-advice') || {}).textContent || '';
      state.settings.examDate = addDays(t, 100); saveState(); const a2 = coursePace(); route(); const hint2 = (document.querySelector('.hero-advice') || {}).textContent || '';
      return JSON.stringify({ perDay: a.perDay, finish: a.finish.N4 === want, late: a.state, hint: hint.includes('預計') && hint.includes(want.replace(/-/g, '/')), late2: a2.state, hint2: hint2.includes('加練'), apply: !!document.querySelector('[data-act=apply-advice]') }); })()"""
    r = json.loads(ev(b, js))
    assert r['perDay'] == 12 and r['finish'] and r['late'] == 'ok' and r['hint'], r
    assert r['late2'] == 'late' and r['hint2'] and not r['apply'], r

# ---- 1.0.19 (Tasks 1–4 ship with it): the copy follows the new rules ----
def test_i_know_this_says_five_stars(b):
    js = "(() => { " + FRESH + """ delete state.today.plan; DAILY_CACHE = null; startSession('daily', { size: 20 });
      const i = SESSION.entries.findIndex(e => e.preview && e.item && e.item.kind === 'v'); SESSION.idx = i; const key = SESSION.entries[i].item.key;
      ACTIONS['preview-known'](); const msg = document.getElementById('toast').textContent;
      SESSION = null; document.body.classList.remove('practicing'); return JSON.stringify({ msg, tier: tierOf(key) }); })()"""
    r = json.loads(ev(b, js))
    assert '已標成五顆' in r['msg'] and '六週' not in r['msg'] and r['tier'] == 'q5', r

def test_today_help_describes_the_tiers(b):
    js = "(() => { " + FRESH + """ location.hash = '#/today'; route(); const help = document.querySelector('.hero-panel[data-panel=help]');
      return help ? help.textContent : ''; })()"""
    text = ev(b, js)
    assert all(s in text for s in ['每天最多 50 題', '四顆每天出 5%', '五顆每天出 3%', '不算在 50 題內', '最近 100 題', '假名拼字答對過']) and '錯題本每天出' not in text, text
    # 1.0.20: 加練 is a round of new items only, as many as today's new count, no reviews
    assert all(s in text for s in ['加練', '只出新內容', '等於今天的新題數', '不出複習']), text

# ---- 1.0.19 審查修正（Tasks 1–4） ----
# I2 (1.0.20: 加練 gives new items only, no reviews ahead): four and five stars, whatever date they carry, and a three-star-or-below
# item due tomorrow all stay out of it; they come in their queues and on their dates
def test_extra_practice_leaves_four_and_five_stars_to_their_queues(b):
    js = "(() => { " + FRESH + REC + """ const ws = words.slice(0, 41);
      ws.slice(0, 30).forEach(v => { state.srs[v.key] = rec(4, { due: addDays(t, 1) }); });
      ws.slice(30, 40).forEach(v => { state.srs[v.key] = rec(6, { due: addDays(t, 2) }); });
      state.srs[ws[40].key] = rec(2, { due: addDays(t, 1) });
      const q = extraQueue(); const keys = q.items.map(x => x.key);
      return JSON.stringify({ held: ws.map(v => v.key).filter(k => keys.includes(k)), seen: q.items.filter(x => state.srs[x.key]).length, newN: q.newN, n: dailyPlan().n, aheadN: q.aheadN, reviewCount: q.reviewCount }); })()"""
    r = json.loads(ev(b, js))
    assert r['held'] == [] and r['seen'] == 0 and r['aheadN'] == 0 and r['reviewCount'] == 0, r
    assert r['newN'] == r['n'], r

# I3: from the first day that has `fresh`, a later day without new items (idle, or reviews only) counts as 0
def test_exam_pace_counts_days_without_new_items(b):
    js = "(() => { " + FRESH + """ const t = todayStr(); state.dailyLogs = {};
      for (let i = 8; i <= 14; i++) state.dailyLogs[addDays(t, -i)] = { vocabCount: 25 };   // before fresh was tallied: left out
      [7, 5, 3, 1].forEach(i => { state.dailyLogs[addDays(t, -i)] = { vocabCount: 20, fresh: 12 }; });
      state.dailyLogs[addDays(t, -6)] = { vocabCount: 30 };   // reviews only
      return coursePace().perDay; })()"""
    r = ev(b, js)
    assert abs(r - 48 / 7) < 1e-9, r

# I4: the 單字 and 單元 pages and the flashcards follow the tiers: a queue item (or an 入門 item that left) with a past date is not due
def test_four_and_five_stars_are_not_counted_or_dealt_as_due(b):
    js = "(() => { " + FRESH + REC + """ const y = addDays(t, -1); const [w4, w5, w2] = words.slice(0, 3);
      state.srs[w4.key] = rec(4, { due: y }); state.srs[w5.key] = rec(6, { due: y }); state.srs[w2.key] = rec(2, { due: y });
      const p = REG.vocab.find(v => v.builtin && v.lv === 'PRE_N5'); state.srs[p.key] = rec(6, { due: y, out: 1, f: { 'v-spell': [1, 0] } });   // left while 已熟練
      const gs = unitItems('m1'); state.srs[gs[0].key] = rec(4, { due: y }); state.srs[gs[1].key] = rec(2, { due: y });
      const sum = (arr) => arr.reduce((a, g) => a + g.due, 0); const deck = buildFlashQueue('N5');
      return JSON.stringify({ vocab: vocabStats().due, level: levelStats('N5').due, themes: sum(themeStats('N5')), allThemes: sum(vocabThemes()), unit: unitStats('m1').due,
        deck: [w4, w5, w2].map(v => deck.includes(v.key)) }); })()"""
    r = json.loads(ev(b, js))
    assert r == {'vocab': 1, 'level': 1, 'themes': 1, 'allThemes': 1, 'unit': 1, 'deck': [False, False, True]}, r

# I4: four and five stars say which queue they wait in instead of a date, an 入門 item that left says it will not come
# back — in lists and in the answer feedback
def test_queue_items_are_labelled_as_queued(b):
    js = "(() => { " + FRESH + REC + """ state.srs = {}; words.slice(0, 40).forEach((v, i) => { state.srs[v.key] = rec(4, { last: addDays(t, -(i + 1)) }); });
      const [w5, w2] = words.slice(40, 42); state.srs[w5.key] = rec(6); state.srs[w2.key] = rec(2);
      const p = REG.vocab.find(v => v.builtin && v.lv === 'PRE_N5'); state.srs[p.key] = rec(6, { out: 1, f: { 'v-spell': [1, 0] } });   // left while 已熟練
      const text = (html) => { const d = document.createElement('div'); d.innerHTML = html; return d.textContent; };
      const list = text(vocabListResultsHtml({}, [words[0], w5, w2, p]));
      delete state.today.plan; DAILY_CACHE = null; const k = dailyPlan().q4[0].key;
      startSession('daily', { size: 60 }); const i = SESSION.entries.findIndex(e => e.item && e.item.key === k); SESSION.idx = i; prepareEntry(i);
      answerCurrent(currentEntry().q.answer); const fb = text(feedbackHtml(currentEntry()));
      SESSION = null; document.body.classList.remove('practicing');
      return JSON.stringify({ list, fb, i }); })()"""
    r = json.loads(ev(b, js))
    assert '四顆・排隊中' in r['list'] and '五顆・排隊中' in r['list'] and '不再出現' in r['list'] and r['list'].count('3 天後') == 1, r['list']
    assert r['i'] >= 0 and '五顆・排隊中' in r['fb'] and '天後複習' not in r['fb'], r

# I6 (the user's call, 2026-10-30): a ladder item answered right before its day — drawn by the notebook queue, a flashcard,
# unit practice — is extra practice: the 1/3/7 days and the notebook entry stay; on its day it moves up as before
def test_an_early_right_answer_leaves_the_relearn_ladder_alone(b):
    js = "(() => { " + FRESH + REC + """ const k = words[0].key; const due = addDays(t, 2);
      state.srs[k] = rec(1, { rl: 1, due, last: addDays(t, -1) });
      state.mistakes = [{ id: 'mk_w', key: k, cat: '單字', prompt: 'p', answer: 'a', wrong: '', why: '', count: 1, streak: 0, mastered: false, note: '', date: addDays(t, -2) }];
      srsAnswer(k, true); onCorrectForMistake({ key: k });
      const early = { rl: state.srs[k].rl, due: state.srs[k].due === due, mastered: state.mistakes[0].mastered };
      state.srs[k] = rec(1, { rl: 1, due: t, last: addDays(t, -2) }); srsAnswer(k, true);
      const onDay = { rl: state.srs[k].rl, due: state.srs[k].due === addDays(t, RELEARN_GAPS[1]) };
      return JSON.stringify({ early, onDay }); })()"""
    r = json.loads(ev(b, js))
    assert r == {'early': {'rl': 1, 'due': True, 'mastered': False}, 'onDay': {'rl': 2, 'due': True}}, r

# I6: a ladder item answered before its day (a flashcard, unit practice, the notebook page) says it is extra practice, not
# a ladder step; since 1.0.21 the daily list never holds one early
def test_an_early_ladder_item_is_labelled_extra_practice(b):
    js = "(() => { " + FRESH + REC + """ state.srs = {}; const [early, onDay] = words.slice(0, 2);
      state.srs[early.key] = rec(1, { rl: 1, due: addDays(t, 2), last: addDays(t, -1) }); state.srs[onDay.key] = rec(1, { rl: 1, due: t, last: addDays(t, -2) });
      state.mistakes = [early, onDay].map((v, i) => ({ id: 'mk_' + i, key: v.key, cat: '單字', prompt: 'p' + i, answer: 'a', wrong: '', why: '', count: 1, streak: 0, mastered: false, note: '', date: addDays(t, -3) }));
      delete state.today.plan; DAILY_CACHE = null; const p = dailyPlan(); const inDaily = PLAN_LISTS.some(n => (p[n] || []).some(x => x.key === early.key));
      startSession('items', { items: [early, onDay] });
      const label = (v) => { const i = SESSION.entries.findIndex(e => e.item && e.item.key === v.key); if (i < 0) return null; SESSION.idx = i; prepareEntry(i); renderPractice(); return document.querySelector('.q-label').textContent; };
      const out = { inDaily, early: label(early), onDay: label(onDay) };
      SESSION = null; document.body.classList.remove('practicing'); return JSON.stringify(out); })()"""
    r = json.loads(ev(b, js))
    assert not r['inDaily'] and '額外練習' in r['early'] and '錯題複習' not in r['early'] and '錯題複習 2/3' in r['onDay'], r

# I7: an 入門 item graded 模糊 (hard) at five stars stays; only a clear right answer moves it out
def test_a_fuzzy_flashcard_keeps_a_pre_item(b):
    js = "(() => { " + FRESH + REC + """ const a = 'a:あ';
      state.srs[a] = rec(6); srsAnswer(a, true, { grade: 'hard' }); const hard = state.srs[a].out === undefined;
      state.srs[a] = rec(6); srsAnswer(a, true, { grade: 'good' }); const good = state.srs[a].out;
      return JSON.stringify({ hard, good }); })()"""
    r = json.loads(ev(b, js))
    assert r == {'hard': True, 'good': 1}, r

# copy: the level picker no longer promises a load cap (我已有基礎 only hides the Chinese now)
def test_the_level_picker_does_not_mention_the_load_cap(b):
    r = ev(b, "levelPickerHtml()")
    assert '負荷上限' not in r and '我已有基礎' in r, r

# ---- Task 5: 加練只給新題 ----
# a round of 加練 is today's new-item count of items nobody has seen, none from today's list and no reviews; once a round is
# answered the next one is a new batch of the same size
def test_extra_round_is_new_items_only(b):
    js = "(() => { " + FRESH + """ delete state.today.plan; DAILY_CACHE = null; const n = dailyPlan().n; const listed = todayPlanKeys();
      const early = extraQueue().items.map(x => x.key);   // asked for before the list is done: the list's own new items are still left out
      listed.forEach(k => srsAnswer(k, true));   // today's whole list answered
      DAILY_CACHE = null; const left = dailyPlan().remaining;
      const q = extraQueue(); const round = q.items.map(x => x.key);
      const out = { n, listed: listed.length, left, early: early.length, earlyInList: early.filter(k => listed.includes(k)).length,
        len: round.length, unseen: q.items.every(x => !state.srs[x.key]), inList: round.filter(k => listed.includes(k)).length,
        kinds: [...new Set(q.items.map(x => x.kind))].sort(), counts: [q.newN, q.newCount, q.reviewCount, q.aheadN], note: extraNote(q) };
      round.forEach(k => srsAnswer(k, true));   // that round answered
      DAILY_CACHE = null; const next = extraQueue().items;
      Object.assign(out, { len2: next.length, unseen2: next.every(x => !state.srs[x.key]), repeats: next.filter(x => round.includes(x.key) || listed.includes(x.key)).length });
      return JSON.stringify(out); })()"""
    r = json.loads(ev(b, js))
    assert r['early'] == r['n'] and r['earlyInList'] == 0, r
    assert r['left'] == 0 and r['listed'] > 0, r
    assert r['len'] == r['n'] and r['unseen'] and r['inList'] == 0, r
    assert r['counts'] == [r['n'], r['n'], 0, 0] and r['note'] == f"今天的進度已完成，這組是 {r['n']} 題額外的新內容", r
    assert len(r['kinds']) >= 2, r   # shared between the banks by what each has left, not one kind only
    assert r['len2'] == r['n'] and r['unseen2'] and r['repeats'] == 0, r

# ---- Task 6: 通過測驗自動設四顆、入門三到五顆 ----
SNAP = "JSON.stringify([state.srs, state.mistakes, state.completedUnits, state.lessonSeen, state.currentUnit, state.stage, state.introSeen, state.kanaKnown])"
# playTest(miss): answers the open stage test to its end, wrong where miss(item) says so; returns the keys answered wrong
PLAY_TEST = """const playTest = (miss) => { const wrong = []; const n = SESSION.entries.length;
    for (let i = 0; i < n; i++) { const e = currentEntry(); const bad = miss(e.item); if (bad) wrong.push(e.item.key);
      answerCurrent(bad ? (e.q.answer + 1) % e.q.options.length : e.q.answer); nextQuestion(); }
    return wrong; };"""
# met(k): the record of an item a test missed (null: none), to compare with MET_ONCE
MET = """const met = (k) => { const r = state.srs[k]; if (!r) return null; const t = todayStr();
    return { b: r.b, n: r.n, ok: r.ok, ng: r.ng, st: r.st, lapse: r.lapse, fsrs: r.s === FSRS_W[0] && r.d === fsrsD0(1), due: daysBetween(t, r.due),
      today: r.last === t && r.intro === t, f: 'f' in r, rl: 'rl' in r, noted: state.mistakes.some(m => m.key === k && !m.mastered) }; };"""
# a grammar or kana miss never met before is met once and missed, as srsAnswer leaves a first wrong answer: back
# tomorrow, no format history (`f`, a word's), not on the relearning ladder and not in the notebook
MET_ONCE = {'b': 0, 'n': 1, 'ok': 0, 'ng': 1, 'st': 0, 'lapse': 0, 'fsrs': True, 'due': 1, 'today': True, 'f': False, 'rl': False, 'noted': False}

# a p1 pass marks 入門 and 第一階段 at once: items below four stars get four, listening and reading are left to their own
# rule; of the test's misses never met before, grammar is met once and missed while a word, a kanji, listening and
# reading stay new; the notebook is left as it was; today's list stays as it was and the four-star queue draws them from
# the next day; the result page says where the course is now, and 復原 there puts everything back
def test_passing_a_stage_marks_four_stars_and_leaves_today_alone(b):
    js = "(() => { " + FRESH + REC + PLAY_TEST + MET + """ state.srs = {}; state.mistakes = []; state.stageTests = {}; LAST_BULK_MARK = null;
      const isLR = (x) => x.kind === 'l' || x.kind === 'r'; const items = stagesUpTo('p1').flatMap(s => stageItems(s.id));
      const [three, noted] = words; state.srs[three.key] = rec(3); state.srs[noted.key] = rec(1, { rl: 0, due: addDays(t, 1) });
      state.mistakes = [{ id: 'mk_x', key: noted.key, cat: '單字', prompt: 'p', answer: 'a', wrong: '', why: '', count: 1, streak: 0, mastered: false, note: '', date: t }];
      saveState(); delete state.today.plan; DAILY_CACHE = null; dailyPlan(); const before = JSON.stringify(dayProgress()); const snap0 = """ + SNAP + """;
      const notedRec = JSON.stringify(state.srs[noted.key]);
      startSession('stage', { stage: 'p1' });
      const want = { g: 1, v: 1, k: 1, lr: 1 };   // four wrong, none with a record: a grammar item, a word, a kanji, a listening or reading question
      const wrong = playTest(x => { const k = isLR(x) ? 'lr' : x.kind; if (state.srs[x.key] || !want[k]) return false; want[k]--; return true; });
      const view = document.getElementById('view'); const txt = view.textContent; const skip = new Set(wrong.concat(noted.key));
      const core = items.filter(x => !isLR(x) && !skip.has(x.key)), lr = items.filter(x => isLR(x) && !skip.has(x.key));
      const out = { passed: state.stageTests.p1[0].passed, wrong: wrong.length, four: core.every(x => state.srs[x.key] && state.srs[x.key].b === 4), three: state.srs[three.key].b,
        lrNone: lr.every(x => !state.srs[x.key]),
        missed: wrong.map(k => [isLR(REG.byKey.get(k)) ? 'lr' : REG.byKey.get(k).kind, met(k)]), noted: JSON.stringify(state.srs[noted.key]) === notedRec, notebook: state.mistakes.length === 1 && !state.mistakes[0].mastered,
        today: JSON.stringify(dayProgress()) === before, says: txt.includes(`已把第一階段以前、還不到四顆的 ${core.length} 題設成四顆。`),   // listening and reading are not marked
        undo: Boolean(view.querySelector('[data-act="bulk-mark-undo"]')), old: txt.includes('標記到這裡為止') || Boolean(view.querySelector('[data-act="stage-mark"]')),
        unit: state.currentUnit, banner: (view.querySelector('.banner') || {}).textContent || '' };
      Object.values(state.srs).forEach(r => { if (r.last === t) r.last = addDays(t, -1); });   // the next day: today's marks were made yesterday
      delete state.today.plan; state.today.date = addDays(t, -1); checkDayRollover(); DAILY_CACHE = null; out.q4 = dailyPlan().q4.length;
      const ub = view.querySelector('[data-act="bulk-mark-undo"]'); if (ub) ub.click();
      out.restored = """ + SNAP + """ === snap0; out.undone = document.getElementById('view').textContent.includes('已復原'); out.missedGone = wrong.every(k => !state.srs[k]);
      return JSON.stringify(out); })()"""
    r = json.loads(ev(b, js))
    assert r['passed'] and r['wrong'] == 4, r
    assert r['four'] and r['three'] == 4 and r['lrNone'], r
    assert dict(r['missed']) == {'g': MET_ONCE, 'v': None, 'k': None, 'lr': None}, r   # grammar met once and missed (back tomorrow); the others stay new
    assert r['noted'] and r['notebook'], r
    assert r['today'] and r['says'] and r['undo'] and not r['old'], r
    assert r['unit'] == 'm7' and '設成四顆。目前單元：第 13–14 週・可能形' in r['banner'], r   # the pass moved the course on: the page says where to
    assert r['q4'] == 30, r
    assert r['restored'] and r['undone'] and r['missedGone'], r

# a learner still in 入門 with today's list made: a pass of the 入門 test or of p1 moves it to the main course and the list
# is made again the same day (a stage switch); its four- and five-star queues take nothing marked today
def test_items_marked_today_stay_out_of_a_list_rebuilt_the_same_day(b):
    js = "(() => { " + PLAY_TEST + """ const t = todayStr();
      const start = () => { state.srs = {}; state.mistakes = []; state.stageTests = {}; state.completedUnits = []; state.lessonSeen = []; state.stage = 'pre'; state.startChosen = true;
        state.kanaKnown = false; state.introSeen = false; state.currentUnit = 'm1'; LAST_BULK_MARK = null; saveState(); delete state.today.plan; DAILY_CACHE = null; dailyPlan(); return state.today.plan.stage; };
      const look = () => { DAILY_CACHE = null; dailyPlan(); const pl = state.today.plan; const recs = Object.values(state.srs).filter(r => r.last === t);
        return { stage: pl.stage, drawn: pl.lists.q4.concat(pl.lists.q5).filter(k => state.srs[k] && state.srs[k].last === t), four: recs.filter(r => r.b === 4).length, five: recs.filter(r => r.b >= 5).length }; };
      const out = { pre0: start() };
      startSession('stage', { stage: 'pre' }); playTest(() => false); SESSION = null; document.body.classList.remove('practicing');
      out.pre = look();
      out.p10 = start(); startSession('stage', { stage: 'p1' }); playTest(() => false); SESSION = null; document.body.classList.remove('practicing');
      out.p1 = look();
      return JSON.stringify(out); })()"""
    r = json.loads(ev(b, js))
    assert r['pre0'] == 'pre' and r['p10'] == 'pre', r   # each list was first made in 入門
    assert r['pre']['stage'] == 'main' and r['pre']['four'] > 0 and r['pre']['drawn'] == [], r['pre']
    assert r['p1']['stage'] == 'main' and r['p1']['four'] > 0 and r['p1']['drawn'] == [], r['p1']

# ---- 1.0.20 最終審查修正 ----
# grammar or kana a test missed that was never met is met once and missed, so the next day's reviews bring it (today's
# list does not). No new-item list would: after a p1 pass its units count as done, and after a 入門 pass the main course
# has no kana bank and 第 0 週 is done. A missed word never met stays new: it is still a
# new-word candidate, taught later with its preview card
def test_a_tests_unseen_grammar_and_kana_misses_come_back_the_next_day(b):
    js = "(() => { " + PLAY_TEST + """ const t = todayStr();
      const start = (stage) => { state.srs = {}; state.mistakes = []; state.stageTests = {}; state.completedUnits = []; state.lessonSeen = []; state.startChosen = true;
        state.stage = stage; state.kanaKnown = stage !== 'pre'; state.introSeen = stage !== 'pre'; state.currentUnit = 'm1'; LAST_BULK_MARK = null; saveState(); delete state.today.plan; DAILY_CACHE = null; };
      const listed = () => { const p = dailyPlan(); return new Set(PLAN_LISTS.flatMap(n => p[n].map(x => x.key))); };
      const look = (keys) => { const today = listed();
        Object.values(state.srs).forEach(r => { if (r.last === t) { r.last = addDays(t, -1); r.due = addDays(r.due, -1); } });   // the next day: today's marks were made yesterday
        delete state.today.plan; state.today.date = addDays(t, -1); checkDayRollover(); DAILY_CACHE = null; const next = listed();
        return { n: keys.length, recs: keys.filter(k => state.srs[k]).length, today: keys.filter(k => today.has(k)), next: keys.filter(k => next.has(k)).length }; };
      // a main-course account at week 1 passes p1, missing three grammar items and a word it never met
      start('main'); startSession('stage', { stage: 'p1' }); let g = 3, v = 1;
      const missed = playTest(x => (x.kind === 'g' && g-- > 0) || (x.kind === 'v' && v-- > 0));
      const p1 = missed.filter(k => k.startsWith('g:')), word = missed.find(k => k.startsWith('v:'));
      const fresh = newVocabCandidates(REG.vocab.filter(x => vocabEligibleForDaily(x, n4WordsOpen())), n4WordsOpen());
      const out = { word: [Boolean(word), Boolean(state.srs[word]), fresh.some(x => x.key === word)] };
      out.p1 = Object.assign({ passed: state.stageTests.p1[0].passed, unit: state.currentUnit }, look(p1));
      SESSION = null; document.body.classList.remove('practicing');
      // a learner in 入門 passes its test missing a hiragana and a week-0 item
      start('pre'); startSession('stage', { stage: 'pre' }); let a = 1, w = 1;
      const pre = playTest(x => (x.kind === 'a' && x.script === 'hira' && a-- > 0) || (x.kind === 'g' && w-- > 0));
      out.pre = Object.assign({ stage: state.stage, kinds: pre.map(k => k.split(':')[0]).sort() }, look(pre));
      return JSON.stringify(out); })()"""
    r = json.loads(ev(b, js))
    assert r['word'] == [True, False, True], r   # the missed word stays new: no record, still a new-word candidate
    assert r['p1']['passed'] and r['p1']['unit'] == 'm7' and r['p1']['n'] == 3, r
    assert r['p1']['recs'] == 3 and r['p1']['today'] == [] and r['p1']['next'] == 3, r
    assert r['pre']['stage'] == 'main' and r['pre']['kinds'] == ['a', 'g'] and r['pre']['n'] == 2, r
    assert r['pre']['recs'] == 2 and r['pre']['today'] == [] and r['pre']['next'] == 2, r

# 1.0.20 took 標記到這裡為止 away, so 1.0.19's entry no longer says what it did (the rule above CHANGELOG: a change that
# overturns an earlier entry edits that entry); the sentence before it now ends the item
def test_the_1_0_19_changelog_no_longer_describes_the_mark_dialog(b):
    items = json.loads(ev(b, "JSON.stringify(CHANGELOG.find(x => x.v === '1.0.19').items)"))
    assert len(items) == 4 and not any('標記到這裡為止' in s for s in items), items
    assert items[2].endswith('不算進三次。「我會了」的字直接排進五顆的複習。'), items[2]

# 1.0.20's entry says what a pass does with the test's misses: they are not set to four stars, grammar and kana never met
# come up for review from the next day, and the notebook's are left as they are
# (1.0.21 took the 入門 four questions away, so the item about them and the aside 「入門四題選四顆也一樣」 went, by the same rule)
def test_the_1_0_20_changelog_says_what_a_pass_does_with_the_tests_misses(b):
    items = json.loads(ev(b, "JSON.stringify(CHANGELOG.find(x => x.v === '1.0.20').items)"))
    assert len(items) == 2 and not any('入門四題' in x for x in items) and '這次答錯的和錯題本裡的題目不動' not in items[1], items
    assert all(s in items[1] for s in ['這次答錯的題目不設四顆', '還沒學過的文法和假名從隔天起排進複習', '錯題本裡的題目不動']), items[1]

# 1.0.21's entry: the three points of the rule-cuts spec §10.2, word for word
SPEC_ITEMS = [
    '錯題本不再每天另外抽 10%：答錯的題目照第 1、3、7 天回來，不算在三顆以下每天 50 題裡；手動新增的錯題卡在錯題本頁練。四顆答對不再直接升五顆，照記憶強度算（等了一陣子才答對的大多會升）。複習的目標記憶率固定 90%，不再看複習正確率調整。',
    '入門測驗通過跟其他階段測驗一樣：入門還不到四顆的題目設成四顆（這次答錯的和錯題本裡的不設），進入第 1 週，結果頁有「復原」，不再問四題。通過階段測驗不再改聽力、閱讀，它們照自己的節奏出。舊帳號的「先做一次入門測驗」提示拿掉了，要考可以到課程頁入門卡按「階段測驗」。',
    '單字要五顆、而且假名拼字答對過，才算「已熟練」（按「我會了」或測驗設的也一樣；沒有拼字題的字五顆就算）；四顆以上、還沒拼對過的字，練習時會出拼字。文法、假名、漢字五顆就算已熟練，以前批次標記過的也一樣。'
]
def test_the_1_0_21_changelog_lists_the_cuts(b):
    entry = json.loads(ev(b, "JSON.stringify(CHANGELOG.find(x => x.v === '1.0.21'))"))   # 1.0.22 came after it
    assert entry['items'] == SPEC_ITEMS, entry

# a mark gives a new record the format history `f` only for a word (a word's 假名拼字 counts toward 已熟練, see
# srsLevelLabel): grammar a pass set to four stars reads 已熟練 once a right answer lifts it to five, and a kanji has no `f`
def test_a_marked_grammar_item_reaches_mastered_and_only_a_word_gets_formats(b):
    js = "(() => { " + FRESH + """ state.srs = {}; state.mistakes = []; LAST_BULK_MARK = null; const t = todayStr(); const items = stageItems('p1');
      const [g, v, k] = ['g', 'v', 'k'].map(kind => items.find(x => x.kind === kind));
      markPassedStage('p1', new Set()); const g4 = [state.srs[g.key].b, 'f' in state.srs[g.key]];
      state.srs[g.key].due = t; state.srs[g.key].last = addDays(t, -6); srsAnswer(g.key, true);   // its first review, six days on, right
      return JSON.stringify({ g4, g: [state.srs[g.key].b >= 5, srsLevelLabel(state.srs[g.key], g.key)], v: [state.srs[v.key].b, state.srs[v.key].f], k: 'f' in state.srs[k.key] }); })()"""
    r = json.loads(ev(b, js))
    assert r['g4'] == [4, False] and r['g'] == [True, '已熟練'], r
    assert r['v'] == [4, {}] and r['k'] is False, r

TESTS =[f for n, f in sorted(globals().items()) if n.startswith('test_') and callable(f)]
if __name__ == "__main__":
    srv = subprocess.Popen([sys.executable, "-m", "http.server", str(PORT), "--bind", "127.0.0.1"], cwd=ROOT, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
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
