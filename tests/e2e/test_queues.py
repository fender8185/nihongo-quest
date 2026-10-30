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
FRESH = "state.stage = 'main'; state.kanaKnown = true; state.introSeen = true; state.startChosen = true; state.currentUnit = 'm1'; state.settings.sessionSize = 20; saveState(); DAILY_CACHE = null;"
# rec(b, extra): a record at level b, last answered ten days ago, due in three days
REC = """const t = todayStr(); const rec = (b, extra) => Object.assign({ b, s: LEVEL_FROM_S[b - 1] || 0.5, d: 5, due: addDays(t, 3), n: 3, ok: 3, ng: 0, st: 3, last: addDays(t, -10), lapse: 0, intro: addDays(t, -30) }, extra || {});
  const words = REG.vocab.filter(v => v.builtin && v.lv === 'N5');"""

# ---- Task 1: 分層與升級 ----
def test_tier_follows_stars_ladder_and_out(b):
    js = "(() => { " + FRESH + REC + """ const k = words.slice(0, 7).map(v => v.key);
      state.srs[k[0]] = rec(2); state.srs[k[1]] = rec(3); state.srs[k[2]] = rec(4); state.srs[k[3]] = rec(6);
      state.srs[k[4]] = rec(4, { rl: 0 }); state.srs[k[5]] = rec(6, { out: 1 }); delete state.srs[k[6]];
      return JSON.stringify([...k.map(tierOf), tierOf(REG.listen[0].key), tierOf(REG.read[0].key)]); })()"""
    r = json.loads(ev(b, js))
    assert r == ['srs', 'srs', 'q4', 'q5', 'srs', 'out', 'new', None, None], r

def test_four_star_right_anywhere_becomes_five(b):
    js = "(() => { " + FRESH + REC + """ const k = words[0].key; state.srs[k] = rec(4); srsAnswer(k, true);
      return JSON.stringify({ b: state.srs[k].b, tier: tierOf(k) }); })()"""
    r = json.loads(ev(b, js))
    assert r['b'] >= 5 and r['tier'] == 'q5', r

def test_pre_items_leave_after_a_five_star_right_answer(b):
    js = "(() => { " + FRESH + REC + """ const a = 'a:あ', w = words[0].key, p = REG.vocab.find(v => v.builtin && v.lv === 'PRE_N5').key;
      state.srs[a] = rec(6); srsAnswer(a, true); const out1 = state.srs[a].out, tier1 = tierOf(a);
      srsAnswer(a, false); const out2 = state.srs[a].out, tier2 = tierOf(a);
      state.srs[w] = rec(6); srsAnswer(w, true); state.srs[p] = rec(5); srsAnswer(p, true);
      return JSON.stringify({ out1, tier1, out2: out2 === undefined, tier2, word: state.srs[w].out === undefined, pre: state.srs[p].out, pre4: isPreItem(p), n5: isPreItem(w) }); })()"""
    r = json.loads(ev(b, js))
    assert r['out1'] == 1 and r['tier1'] == 'out', r
    assert r['out2'] is True and r['tier2'] == 'srs', r
    assert r['word'] is True and r['pre'] == 1 and r['pre4'] is True and r['n5'] is False, r

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
      state.srs = {}; state.mistakes = Array.from({ length: 25 }, (_, i) => ({ id: 'mk' + i, key: '', cat: '自訂', prompt: 'テスト' + i, answer: '答' + i, wrong: '', why: '', count: 1, streak: 0, mastered: false, note: '', date: addDays(t, -(i + 1)) }));
      const mk = computeDailyPlan().mk; out.mk = mk.length; out.mkOld = mk.map(x => x.key).join() === ['mk24', 'mk23', 'mk22'].map(id => 'm:' + id).join();
      return JSON.stringify(out); })()"""
    r = json.loads(ev(b, js))
    assert r == {'q40': 2, 'oldest': True, 'q700': 30, 'q1': 1, 'q5': 3, 'mk': 3, 'mkOld': True}, r

def test_srs_dues_are_capped_at_fifty_oldest_first(b):
    js = "(() => { " + FRESH + REC + """ state.srs = {}; const ws = words.slice(0, 80);
      ws.forEach((v, i) => { state.srs[v.key] = rec(2, { due: addDays(t, -(i + 1)), last: addDays(t, -(i + 4)) }); });   // due 1…80 days ago
      const p = computeDailyPlan(); const due = [].concat(p.dueV, p.dueG, p.dueK, p.dueA, p.dueC).map(x => x.key).sort();
      return JSON.stringify({ n: due.length, oldest: due.join() === ws.slice(30).map(v => v.key).sort().join() }); })()"""
    r = json.loads(ev(b, js))
    assert r == {'n': 50, 'oldest': True}, r

def test_new_items_and_drills_follow_the_rule(b):
    js = "(() => { " + FRESH + """ state.recent = Array.from({ length: 100 }, (_, i) => (i < 95 ? 1 : 0)); state.mistakes = [];
      const p = computeDailyPlan(); const fresh = p.newV.length + p.newG.length + p.newK.length + p.newA.length;
      state.currentUnit = 'm18'; const p18 = computeDailyPlan();
      return JSON.stringify({ fresh, n: p.n, split: p.split, drills: p18.newC.length }); })()"""
    r = json.loads(ev(b, js))
    assert r['fresh'] == 20 and r['n'] == 20 and sum(r['split'].values()) == 20 and r['drills'] == 1, r

# four hand-made notebook cards of one category (a card needs three other answers for its options); mk_t3 waited longest
HANDMADE = """state.mistakes = ['測試', '學習', '日本', '語言'].map((a, i) => ({ id: 'mk_t' + i, key: '', cat: '自訂', prompt: 'テスト' + i, answer: a, wrong: '', why: '', count: 1, streak: 0, mastered: false, note: '', date: addDays(todayStr(), -(i + 1)) }));"""
# answers the notebook card of today's daily set; returns what the list and the ring say
ANSWER_CARD = """delete state.today.plan; DAILY_CACHE = null; dailyPlan(); const mk = state.today.plan.lists.mk.slice(); const before = dayProgress();
      startSession('daily', { size: 60 }); const i = SESSION.entries.findIndex(e => e.mistake); SESSION.idx = Math.max(0, i); prepareEntry(SESSION.idx);
      const q = currentEntry().q; answerCurrent(q.answer); const out = { mk, card: i >= 0, kind: q.kind, answered: answeredToday(mk[0]), done: dayProgress().done - before.done };
      SESSION = null; document.body.classList.remove('practicing'); return JSON.stringify(out);"""

def test_handmade_mistakes_come_as_cards_in_the_daily_set(b):
    js = "(() => { " + FRESH + HANDMADE + ANSWER_CARD + " })()"
    r = json.loads(ev(b, js))
    assert r['mk'] == ['m:mk_t3'] and r['card'] and r['kind'] == 'm', r
    assert r['answered'] is True and r['done'] == 1, r

def test_a_notebook_card_whose_item_is_gone_still_counts(b):
    js = "(() => { " + FRESH + HANDMADE + " state.mistakes[3].key = 'v:no-such-word'; " + ANSWER_CARD + " })()"
    r = json.loads(ev(b, js))
    assert r['mk'] == ['m:mk_t3'] and r['card'] and r['answered'] is True and r['done'] == 1, r

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
      const a = paceAdvice(); const want = addDays(t, Math.ceil(left / 12));
      location.hash = '#/exam'; route(); const hint = (document.querySelector('.hero-advice') || {}).textContent || '';
      state.settings.examDate = addDays(t, 100); saveState(); const a2 = paceAdvice(); route(); const hint2 = (document.querySelector('.hero-advice') || {}).textContent || '';
      return JSON.stringify({ perDay: a.perDay, finish: a.finish === want, late: a.late, hint: hint.includes('預計') && hint.includes(want), late2: a2.late, hint2: hint2.includes('加練'), apply: !!document.querySelector('[data-act=apply-advice]') }); })()"""
    r = json.loads(ev(b, js))
    assert r['perDay'] == 12 and r['finish'] and r['late'] <= 0 and r['hint'], r
    assert r['late2'] > 0 and r['hint2'] and not r['apply'], r

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
    assert all(s in text for s in ['每天最多 50 題', '四顆每天出 5%', '五顆每天出 3%', '錯題本每天出 10%', '最近 100 題']), text

# ---- 1.0.19 審查修正（Tasks 1–4） ----
# I1: a missed dialogue or passage stays in the notebook but its queue never draws it (it keeps its own week-later date)
def test_the_notebook_queue_skips_listening_and_reading(b):
    js = "(() => { " + FRESH + HANDMADE + """ const t = todayStr();
      const entry = (id, key, days) => ({ id, key, cat: '聽力', prompt: 'p' + id, answer: 'a', wrong: '', why: '', count: 1, streak: 0, mastered: false, note: '', date: addDays(t, -days) });
      state.mistakes.push(entry('mk_l', REG.listen[0].key, 31), entry('mk_r', REG.read[0].key, 30));   // waited longest: drawn first if allowed
      return JSON.stringify(computeDailyPlan().mk.map(x => x.key)); })()"""
    r = json.loads(ev(b, js))
    assert r == ['m:mk_t3'], r

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
      return paceAdvice().perDay; })()"""
    r = ev(b, js)
    assert abs(r - 48 / 7) < 1e-9, r

# I4: the 單字 and 單元 pages and the flashcards follow the tiers: a queue item (or an 入門 item that left) with a past date is not due
def test_four_and_five_stars_are_not_counted_or_dealt_as_due(b):
    js = "(() => { " + FRESH + REC + """ const y = addDays(t, -1); const [w4, w5, w2] = words.slice(0, 3);
      state.srs[w4.key] = rec(4, { due: y }); state.srs[w5.key] = rec(6, { due: y }); state.srs[w2.key] = rec(2, { due: y });
      const p = REG.vocab.find(v => v.builtin && v.lv === 'PRE_N5'); state.srs[p.key] = rec(6, { due: y, out: 1 });
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
      const p = REG.vocab.find(v => v.builtin && v.lv === 'PRE_N5'); state.srs[p.key] = rec(6, { out: 1 });
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

# I6: so a ladder item drawn before its day (most notebook-queue draws) says it is extra practice, not a ladder step
def test_an_early_ladder_item_is_labelled_extra_practice(b):
    js = "(() => { " + FRESH + REC + """ state.srs = {}; const [early, onDay] = words.slice(0, 2);
      state.srs[early.key] = rec(1, { rl: 1, due: addDays(t, 2), last: addDays(t, -1) }); state.srs[onDay.key] = rec(1, { rl: 1, due: t, last: addDays(t, -2) });
      state.mistakes = [early, onDay].map((v, i) => ({ id: 'mk_' + i, key: v.key, cat: '單字', prompt: 'p' + i, answer: 'a', wrong: '', why: '', count: 1, streak: 0, mastered: false, note: '', date: addDays(t, -3) }));
      delete state.today.plan; DAILY_CACHE = null; const p = dailyPlan();
      startSession('daily', { size: 60 });
      const label = (v) => { const i = SESSION.entries.findIndex(e => e.item && e.item.key === v.key); if (i < 0) return null; SESSION.idx = i; prepareEntry(i); renderPractice(); return document.querySelector('.q-label').textContent; };
      const out = { inMk: p.mk.map(x => x.key).includes(early.key), early: label(early), onDay: label(onDay) };
      SESSION = null; document.body.classList.remove('practicing'); return JSON.stringify(out); })()"""
    r = json.loads(ev(b, js))
    assert r['inMk'] and '額外練習' in r['early'] and '錯題複習' not in r['early'] and '錯題複習 2/3' in r['onDay'], r

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

# a p1 pass marks 入門 and 第一階段 at once: items below four stars get four, listening and reading three (back in 90–270
# days); the test's misses and the notebook are left as they were; today's list stays as it was and the four-star queue
# draws them from the next day; 復原 on the result page puts everything back
def test_passing_a_stage_marks_four_stars_and_leaves_today_alone(b):
    js = "(() => { " + FRESH + REC + PLAY_TEST + """ state.srs = {}; state.mistakes = []; state.stageTests = {}; LAST_BULK_MARK = null;
      const isLR = (x) => x.kind === 'l' || x.kind === 'r'; const items = stagesUpTo('p1').flatMap(s => stageItems(s.id));
      const [three, noted] = words; state.srs[three.key] = rec(3); state.srs[noted.key] = rec(1, { rl: 0, due: addDays(t, 1) });
      state.mistakes = [{ id: 'mk_x', key: noted.key, cat: '單字', prompt: 'p', answer: 'a', wrong: '', why: '', count: 1, streak: 0, mastered: false, note: '', date: t }];
      saveState(); delete state.today.plan; DAILY_CACHE = null; dailyPlan(); const before = JSON.stringify(dayProgress()); const snap0 = """ + SNAP + """;
      const notedRec = JSON.stringify(state.srs[noted.key]);
      startSession('stage', { stage: 'p1' });
      const want = { lr: 1, core: 2 };   // three wrong: a listening or reading question and two others, none with a record
      const wrong = playTest(x => { const k = isLR(x) ? 'lr' : 'core'; if (state.srs[x.key] || !want[k]) return false; want[k]--; return true; });
      const view = document.getElementById('view'); const txt = view.textContent; const skip = new Set(wrong.concat(noted.key));
      const core = items.filter(x => !isLR(x) && !skip.has(x.key)), lr = items.filter(x => isLR(x) && !skip.has(x.key)); const lrDays = lr.map(x => daysBetween(t, state.srs[x.key] ? state.srs[x.key].due : t));
      const out = { passed: state.stageTests.p1[0].passed, wrong: wrong.length, four: core.every(x => state.srs[x.key] && state.srs[x.key].b === 4), three: state.srs[three.key].b,
        lrB: [...new Set(lr.map(x => state.srs[x.key] ? state.srs[x.key].b : 0))], lrMin: Math.min(...lrDays), lrMax: Math.max(...lrDays),
        missedLeft: wrong.every(k => !state.srs[k]), noted: JSON.stringify(state.srs[noted.key]) === notedRec, notebook: state.mistakes.length === 1 && !state.mistakes[0].mastered,
        today: JSON.stringify(dayProgress()) === before, says: txt.includes(`已把第一階段以前、還不到四顆的 ${core.length} 題設成四顆。`),   // listening and reading are not counted: three stars
        undo: Boolean(view.querySelector('[data-act="bulk-mark-undo"]')), old: txt.includes('標記到這裡為止') || Boolean(view.querySelector('[data-act="stage-mark"]')) };
      delete state.today.plan; state.today.date = addDays(t, -1); checkDayRollover(); DAILY_CACHE = null; out.q4 = dailyPlan().q4.length;   // the next day
      const ub = view.querySelector('[data-act="bulk-mark-undo"]'); if (ub) ub.click();
      out.restored = """ + SNAP + """ === snap0; out.undone = document.getElementById('view').textContent.includes('已復原');
      return JSON.stringify(out); })()"""
    r = json.loads(ev(b, js))
    assert r['passed'] and r['wrong'] == 3, r
    assert r['four'] and r['three'] == 4 and r['lrB'] == [3] and r['lrMin'] >= 90 and r['lrMax'] <= 270, r
    assert r['missedLeft'] and r['noted'] and r['notebook'], r
    assert r['today'] and r['says'] and r['undo'] and not r['old'], r
    assert r['q4'] == 30, r
    assert r['restored'] and r['undone'], r

# the 入門 test: a pass (and any result of an account past 入門, 1.0.17's case) leads to four questions of 三顆／四顆／五顆,
# each pre-selected (建議) by its group's score; nothing is marked before they are answered; Enter takes the suggestion
def test_pre_test_asks_three_to_five_stars_with_a_suggestion(b):
    js = "(() => { " + PLAY_TEST + """ const groups = { hira: REG.kana.filter(k => k.script === 'hira'), kata: REG.kana.filter(k => k.script === 'kata'), v: REG.vocab.filter(v => v.builtin && v.lv === 'PRE_N5'), g: unitItems('m0') };
      const stars = () => Object.fromEntries(Object.entries(groups).map(([g, l]) => [g, [...new Set(l.map(x => (state.srs[x.key] ? state.srs[x.key].b : 0)))]]));
      const step = () => { const v = document.getElementById('view'); const os = [...v.querySelectorAll('[data-act="pre-mark-pick"]')];
        return { q: (v.textContent.match(/第 (\\d)／4 題/) || [])[1] || null, opts: os.map(o => (o.querySelector('b') || {}).textContent), tip: os.filter(o => o.textContent.includes('建議')).map(o => o.dataset.level) }; };
      const run = (old, pick) => {
        state.srs = {}; state.mistakes = []; state.stageTests = {}; state.completedUnits = []; state.lessonSeen = []; state.introPending = false; state.startChosen = true; LAST_BULK_MARK = null;
        if (old) { state.stage = 'main'; state.currentUnit = 'm3'; state.kanaKnown = true; state.introSeen = true; const g3 = REG.grammar.find(x => x.u === 'm3'); state.srs[g3.key] = { b: 2, due: addDays(todayStr(), 3), n: 2, ok: 2, ng: 0, s: 4, d: 5, last: todayStr() }; }   // 1.0.17: past 入門, never took its test
        else { state.stage = 'pre'; state.currentUnit = 'm1'; state.kanaKnown = false; state.introSeen = false; }
        saveState(); DAILY_CACHE = null; const auto = needsPreTest(); const n0 = Object.keys(state.srs).length;
        startSession('stage', { stage: 'pre' }); playTest(() => false);
        const out = { auto, passed: state.stageTests.pre[0].passed, marked: Object.keys(state.srs).length - n0, s1: step() };
        pick();
        return Object.assign(out, { stars: stars(), stage: state.stage, unit: state.currentUnit, session: SESSION === null }); };
      const click = (lv) => { const el = document.querySelector(`[data-act="pre-mark-pick"][data-level="${lv}"]`); if (el) el.click(); };
      const enter = () => document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      const fresh = run(false, () => ['5', '4', '3', '4'].forEach(click));
      const old = run(true, () => { for (let i = 0; i < 4; i++) enter(); });
      return JSON.stringify({ fresh, old }); })()"""
    r = json.loads(ev(b, js))
    for k in ('fresh', 'old'):
        x = r[k]
        assert x['passed'] and x['marked'] == 0 and x['s1'] == {'q': '1', 'opts': ['三顆', '四顆', '五顆'], 'tip': ['5']}, (k, x)
    assert r['fresh']['auto'] is False and r['old']['auto'] is True, r
    assert r['fresh']['stars'] == {'hira': [6], 'kata': [4], 'v': [3], 'g': [4]}, r['fresh']   # 五顆 = 我會了 (b 6), 四顆, 三顆
    assert r['fresh']['stage'] == 'main' and r['fresh']['unit'] == 'm1' and r['fresh']['session'], r['fresh']
    assert r['old']['stars'] == {'hira': [6], 'kata': [6], 'v': [6], 'g': [6]}, r['old']   # all right: every suggestion is 五顆
    assert r['old']['stage'] == 'main' and r['old']['unit'] == 'm3' and r['old']['session'], r['old']   # an account past 入門 keeps its week

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
