"""2026-10-30 (1.0.19): 今天的清單一早排好當天不變、今天作答過的題目（today.ans）、圓圈只畫百分比、模擬考獨立。"""
import json, os, subprocess, sys, time
sys.path.insert(0, os.path.dirname(__file__))
from cdp import Browser
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
PORT = 8800
URL = f"http://127.0.0.1:{PORT}/"
READY = "typeof state === 'object' && !!state.updatedAt && typeof speakScript === 'function'"

def ev(b, js, pre=()):
    return b.run([("nav", URL), ("wait", READY)] + list(pre) + [("eval", js)])[-1]

# a main-course account at week 1 with nothing learned yet
FRESH = "state.stage = 'main'; state.kanaKnown = true; state.introSeen = true; state.startChosen = true; state.currentUnit = 'm1'; state.settings.sessionSize = 20; saveState(); DAILY_CACHE = null;"
# plays the current session to the end, one in three wrong (preview cards dismissed); returns the distinct keys answered
PLAY = """(() => { let guard = 0, k = 0;
  while (SESSION && SESSION.idx < SESSION.entries.length && guard++ < 500) {
    const e = currentEntry();
    if (e.preview && !e.previewDone) { dismissPreview(); continue; }
    if (!e.q) { prepareEntry(SESSION.idx); continue; }
    if (!e.done) { const q = e.q; answerCurrent((!e.requeued && !e.encore && k % 3 === 1) ? (q.answer + 1) % q.options.length : q.answer); k++; if (!e.done) e.done = true; }
    nextQuestion();
  }
  const keys = SESSION ? [...new Set(SESSION.results.map(r => r.key).filter(Boolean))] : [];
  SESSION = null; document.body.classList.remove('practicing'); DAILY_CACHE = null; return keys; })()"""

# ---- Task 1: 今天作答過的題目 ----
def test_answered_today_counts_each_item_once(b):
    js = "(() => { " + FRESH + " startSession('daily', { size: 12 }); const keys = " + PLAY + """;
      const t = todayStr(); const ans = state.today.ans || [];
      return JSON.stringify({ keys, ans, dup: ans.length - new Set(ans).size, items: (state.dailyLogs[t] || {}).items, presses: dayTotal(state.dailyLogs[t]), done: itemsDoneToday() }); })()"""
    r = json.loads(ev(b, js))
    assert len(r['keys']) >= 10 and r['dup'] == 0, r
    assert sorted(r['ans']) == sorted(r['keys']), r
    assert r['items'] == len(r['ans']) and r['done'] == len(r['ans']), r
    assert r['presses'] > len(r['ans']), r   # 再練一次 and 換個方式再考 are presses, not new items

def test_marks_are_not_answers(b):
    js = "(() => { " + FRESH + " startSession('daily', { size: 12 }); " + PLAY + """;
      const before = (state.today.ans || []).length;
      state.stageTests = { p1: [{ date: todayStr(), correct: 36, total: 40, passed: true }] }; bulkMark('p1', 'learned');
      return JSON.stringify({ before, after: (state.today.ans || []).length, items: state.dailyLogs[todayStr()].items }); })()"""
    r = json.loads(ev(b, js))
    assert r['before'] > 0 and r['after'] == r['before'] and r['items'] == r['before'], r

def test_slip_takes_the_answer_back_out(b):
    js = "(() => { " + FRESH + """ startSession('daily', { size: 12 }); const t = todayStr();
      let e = currentEntry(); if (e.preview && !e.previewDone) dismissPreview(); prepareEntry(SESSION.idx); e = currentEntry();
      const key = e.q.key; const itemsBefore = (state.dailyLogs[t] || {}).items || 0;
      answerCurrent((e.q.answer + 1) % e.q.options.length);
      const mid = answeredToday(key);
      ACTIONS.slip();
      const out = { key, mid, after: answeredToday(key), itemsBefore, itemsAfter: (state.dailyLogs[t] || {}).items || 0, ans: state.today.ans || [] };
      SESSION = null; document.body.classList.remove('practicing'); return JSON.stringify(out); })()"""
    r = json.loads(ev(b, js))
    assert r['mid'] is True and r['after'] is False, r
    assert r['itemsAfter'] == r['itemsBefore'] and r['key'] not in r['ans'], r

def test_handmade_mistake_answers_count(b):
    # a hand-made card needs three other answers of its category for its options
    js = "(() => { " + FRESH + """ state.mistakes = ['測試', '學習', '日本', '語言'].map((a, i) => ({ id: 'mk_t' + i, key: '', cat: '自訂', prompt: 'テスト' + i, answer: a, wrong: '', why: '', count: 1, streak: 0, mastered: false, note: '', date: todayStr() }));
      saveState(); startSession('mistakes'); prepareEntry(SESSION.idx); const q = currentEntry().q; answerCurrent(q.answer);
      const out = { kind: q.kind, id: q.mistakeId, counted: answeredToday('m:' + q.mistakeId), items: (state.dailyLogs[todayStr()] || {}).items };
      SESSION = null; document.body.classList.remove('practicing'); return JSON.stringify(out); })()"""
    r = json.loads(ev(b, js))
    assert r['kind'] == 'm' and r['id'].startswith('mk_t'), r
    assert r['counted'] is True and r['items'] == 1, r

# ---- Task 2: 今天的清單排好後當天不重算 ----
# an account at week 3 with weeks 1–2 learned (reviews spread over the coming days) and a perfect recent record
HIST = """const t = todayStr(); let i = 0; state.currentUnit = 'm3';
  REG.grammar.filter(g => g.u === 'm1' || g.u === 'm2').forEach(g => { state.srs[g.key] = { b: 3, s: 6, d: 5, due: addDays(t, (i++ % 6) - 1), n: 3, ok: 3, ng: 0, st: 3, last: addDays(t, -5), lapse: 0, intro: addDays(t, -20) }; });
  REG.vocab.filter(v => v.builtin && v.lv === 'N5').slice(0, 120).forEach(v => { state.srs[v.key] = { b: 3, s: 6, d: 5, due: addDays(t, (i++ % 6) - 1), n: 3, ok: 3, ng: 0, st: 3, last: addDays(t, -5), lapse: 0, intro: addDays(t, -20) }; });
  state.recent = Array(40).fill(1); saveState(); DAILY_CACHE = null;"""
RING = "(() => { const p = dayProgress(); const pl = state.today.plan; return { done: p.done, total: p.total, listen: pl ? pl.lists.dueL.length + pl.lists.newL.length : -1, read: pl ? pl.lists.dueR.length + pl.lists.newR.length : -1 }; })()"
# the 入門 test of an account past 入門 (1.0.17 marks it by score when it ends)
PRE_TEST = """(() => { startSession('stage', { stage: 'pre' }); const n = SESSION.entries.length;
  for (let i = 0; i < n; i++) { const q = currentEntry().q; answerCurrent(i % 5 ? q.answer : (q.answer + 1) % q.options.length); if (i < n - 1) nextQuestion(); }
  SESSION = null; document.body.classList.remove('practicing'); DAILY_CACHE = null; return n; })()"""

def test_bulk_mark_leaves_the_plan_alone(b):
    js = "(() => { " + FRESH + " startSession('daily', { size: 12 }); " + PLAY + "; const r1 = " + RING + """;
      state.stageTests = { p1: [{ date: todayStr(), correct: 36, total: 40, passed: true }] }; bulkMark('p1', 'learned'); DAILY_CACHE = null;
      return JSON.stringify({ r1, r2: """ + RING + " }); })()"
    r = json.loads(ev(b, js))
    assert r['r1']['listen'] >= 0 and r['r1'] == r['r2'], r
    assert r['r1']['total'] < 60 and r['r1']['done'] > 0, r

def test_old_account_pre_test_leaves_the_plan_alone(b):
    js = "(() => { " + FRESH + HIST + " startSession('daily', { size: 12 }); " + PLAY + "; const r1 = " + RING + "; const auto = needsPreTest(); " + PRE_TEST + """;
      return JSON.stringify({ auto, marked: Object.keys(state.srs).filter(k => k.startsWith('a:')).length, r1, r2: """ + RING + " }); })()"
    r = json.loads(ev(b, js))
    assert r['auto'] is True and r['marked'] > 100, r   # the 1.0.17 auto marks did happen
    assert r['r1']['listen'] >= 0 and r['r1'] == r['r2'], r

def test_total_stays_the_same_all_day(b):
    js = "(() => { " + FRESH + HIST + " const totals = [" + RING + ".total]; for (let s = 0; s < 4; s++) { startSession('daily'); " + PLAY + "; totals.push(" + RING + """.total); }
      return JSON.stringify({ totals, stored: Boolean(state.today.plan), done: dayProgress().done }); })()"""
    r = json.loads(ev(b, js))
    assert r['stored'] and len(set(r['totals'])) == 1 and r['done'] > 40, r

def test_choosing_a_start_rebuilds_the_plan(b):
    # a list made before the start is chosen may be empty or 正課; choosing 從零開始 redoes it as 入門
    js = """(() => { state.srs = {}; state.startChosen = false; state.stage = 'main'; state.kanaKnown = false;
      state.today = { date: todayStr(), newV: 0, newG: 0, newK: 0, newL: 0, newR: 0, newC: 0, newA: 0 }; saveState(); DAILY_CACHE = null;
      dailyPlan(); const before = state.today.plan && state.today.plan.start;
      chooseStart('zero'); dailyPlan(); const p = state.today.plan;
      return JSON.stringify({ before, start: p.start, stage: p.stage, newA: p.lists.newA.length }); })()"""
    r = json.loads(ev(b, js))
    assert r['before'] is False and r['start'] is True and r['stage'] == 'pre' and r['newA'] > 0, r

def test_stage_switch_rebuilds_the_plan_and_keeps_answered_items(b):
    js = """(() => { state.srs = {}; state.startChosen = false; state.today = { date: todayStr(), newV: 0, newG: 0, newK: 0, newL: 0, newR: 0, newC: 0, newA: 0 }; saveState();
      chooseStart('zero'); startSession('daily', { size: 10 }); const keys = """ + PLAY + """; const before = dayProgress().done;
      state.stage = 'main'; state.kanaKnown = true; state.currentUnit = 'm1'; saveState(); DAILY_CACHE = null; dailyPlan(); const p = state.today.plan;
      return JSON.stringify({ keys, before, after: dayProgress().done, stage: p.stage, kept: p.lists.kept, newG: p.lists.newG.length }); })()"""
    r = json.loads(ev(b, js))
    assert r['before'] > 0 and r['after'] == r['before'], r
    assert r['stage'] == 'main' and r['newG'] > 0 and sorted(r['kept']) == sorted(r['keys']), r

def test_items_answered_before_the_plan_count_but_stay_out_of_it(b):
    js = "(() => { " + FRESH + """ delete state.today.plan; const v = REG.vocab.find(x => x.builtin && x.lv === 'N5' && !state.srs[x.key]);
      srsAnswer(v.key, true); dailyPlan(); return JSON.stringify({ inPlan: todayPlanKeys().includes(v.key), done: itemsDoneToday(), stored: Boolean(state.today.plan) }); })()"""
    r = json.loads(ev(b, js))
    assert r['stored'] and r['inPlan'] is False and r['done'] == 1, r

def test_missing_keys_are_skipped(b):
    js = "(() => { " + FRESH + """ dailyPlan(); const n = todayPlanKeys().length; state.today.plan.lists.dueV.push('v:no-such-word'); DAILY_CACHE = null;
      const p = dailyPlan(); return JSON.stringify({ n, after: todayPlanKeys().length, has: todayPlanKeys().includes('v:no-such-word'), remaining: p.remaining }); })()"""
    r = json.loads(ev(b, js))
    assert r['after'] == r['n'] and r['has'] is False and r['remaining'] == r['n'], r

# ---- Task 3: 今日頁的圓圈、按鈕與數字 ----
# replaces today's list with the first n unseen built-in N5 words
ONLY_WORDS = """const onlyWords = (n) => { dailyPlan(); const ws = REG.vocab.filter(v => v.builtin && v.lv === 'N5' && !state.srs[v.key]).slice(0, n).map(v => v.key);
  PLAN_LISTS.forEach(k => { state.today.plan.lists[k] = []; }); state.today.plan.lists.kept = []; state.today.plan.lists.newV = ws; saveState(); DAILY_CACHE = null; return ws; };"""

def test_ring_shows_a_percentage_only(b):
    js = "(() => { " + FRESH + """ location.hash = '#/today'; route(); const ring = document.querySelector('.today-card .ring-txt');
      startSession('daily', { size: 5 }); """ + PLAY + """; location.hash = '#/today'; route(); const ring2 = document.querySelector('.today-card .ring-txt'); const p = dayProgress();
      return JSON.stringify({ t1: ring.textContent.replace(/\\s+/g, ''), t2: ring2.textContent.replace(/\\s+/g, ''), pct: Math.round(p.done / p.total * 100) }); })()"""
    r = json.loads(ev(b, js))
    assert r['t1'] == '0%' and r['t2'] == f"{r['pct']}%" and 0 < r['pct'] < 100, r

def test_small_tail_joins_the_set(b):
    js = "(() => { " + FRESH + ONLY_WORDS + """ onlyWords(21); const n21 = dailyQueue(20).items.length;
      onlyWords(26); const n26 = dailyQueue(20).items.length; location.hash = '#/today'; route();
      const btn = document.querySelector('[data-act=start-daily]').textContent.replace(/\\s+/g, ' '); const hero = document.querySelector('.hero').textContent.replace(/\\s+/g, ' ');
      return JSON.stringify({ n21, n26, btn, rest: hero.includes('今天還有 26 題') }); })()"""
    r = json.loads(ev(b, js))
    assert r['n21'] == 21 and r['n26'] == 20, r
    assert '開始練習・這組 20 題' in r['btn'] and r['rest'], r

def test_finished_day_and_sidebar_show_answered_items(b):
    js = "(() => { " + FRESH + ONLY_WORDS + """ const ws = onlyWords(3); ws.forEach(k => srsAnswer(k, true));
      srsAnswer(REG.vocab.find(v => v.builtin && v.lv === 'N5' && !state.srs[v.key]).key, true); saveState(); location.hash = '#/today'; route();
      const hero = document.querySelector('.hero').textContent.replace(/\\s+/g, ' ');
      const side = [...document.querySelectorAll('#sideFoot .row')].find(r => r.textContent.includes('今日')).querySelector('b').textContent.trim();
      return JSON.stringify({ did: (hero.match(/今天做了 (\\d+) 題/) || [])[1] || null, side, done: /今天完成了/.test(hero) }); })()"""
    r = json.loads(ev(b, js))
    assert r['done'] and r['did'] == '4', r
    assert r['side'] == '4 題', r

# ---- Task 4: 模擬考獨立、測驗日算連續天數、學習紀錄的字樣 ----
def test_mock_exam_only_writes_its_own_records(b):
    js = "(() => { " + FRESH + HIST + """ const day = todayStr();
      const before = { srs: JSON.stringify(state.srs), mistakes: state.mistakes.length, recent: state.recent.length, presses: dayTotal(state.dailyLogs[day]) };
      startExam({ level: 'N5', size: 'std', subjects: ['S1', 'S2'], formal: false }); const P = EXAM.paper;
      P.forEach((q, i) => { EXAM.answers[i] = i % 3 ? q.answer : (q.answer + 1) % q.options.length; }); finishExam(); route();
      const view = document.getElementById('view').textContent;
      return JSON.stringify({ n: P.length, same: { srs: JSON.stringify(state.srs) === before.srs, mistakes: state.mistakes.length === before.mistakes, recent: state.recent.length === before.recent, presses: dayTotal(state.dailyLogs[day]) === before.presses },
        history: Object.keys(state.questionHistory).length, ex: (state.dailyLogs[day] || {}).ex, says: view.includes('已加入錯題本'), result: location.hash }); })()"""
    r = json.loads(ev(b, js))
    assert r['n'] >= 20 and r['result'] == '#/exam/result', r
    assert r['same'] == {'srs': True, 'mistakes': True, 'recent': True, 'presses': True}, r
    assert r['history'] > 0 and r['ex'] == r['n'] and r['says'] is False, r

def test_stage_test_counts_as_a_test_not_as_questions(b):
    js = "(() => { " + FRESH + """ const t = todayStr(); startSession('stage', { stage: 'p1' }); const n = SESSION.entries.length;
      for (let i = 0; i < n; i++) { const q = currentEntry().q; answerCurrent(q.answer); if (i < n - 1) nextQuestion(); }
      const out = { n, passed: state.stageTests.p1[0].passed, presses: dayTotal(state.dailyLogs[t]), ex: (state.dailyLogs[t] || {}).ex };
      SESSION = null; document.body.classList.remove('practicing'); return JSON.stringify(out); })()"""
    r = json.loads(ev(b, js))
    assert r['passed'] and r['presses'] == 0 and r['ex'] == r['n'] == 40, r

def test_a_test_only_day_keeps_the_streak(b):
    js = """(() => { const t = todayStr(); state.dailyLogs = { [addDays(t, -1)]: { date: addDays(t, -1), vocabCount: 5 }, [t]: { date: t, ex: 10 } }; saveState();
      return JSON.stringify(streakStats()); })()"""
    r = json.loads(ev(b, js))
    assert r['current'] == 2 and r['days'] == 2, r

def test_history_labels_items_and_presses(b):
    js = """(() => { const t = todayStr(); const d1 = addDays(t, -1), d2 = addDays(t, -2), d3 = addDays(t, -3);
      state.dailyLogs = { [d3]: { date: d3, vocabCount: 12 }, [d2]: { date: d2, vocabCount: 15, items: 9 }, [d1]: { date: d1, ex: 20 } }; saveState();
      const box = document.createElement('div'); box.innerHTML = recentLogsHtml();
      const rows = [...box.querySelectorAll('.list-item')].map(x => ({ text: x.querySelector('.small').textContent, chip: x.querySelector('.chip').textContent }));
      return JSON.stringify(rows); })()"""
    rows = json.loads(ev(b, js))
    assert len(rows) == 3, rows
    exOnly, new, old = rows   # newest first
    assert old['chip'] == '作答 12 次' and old['text'].startswith('作答 12 次'), rows
    assert new['chip'] == '9 題' and new['text'].startswith('9 題・作答 15 次'), rows
    assert exOnly['chip'] == '測驗 20 題' and '模擬考與測驗 20 題' in exOnly['text'], rows

TESTS = [f for n, f in sorted(globals().items()) if n.startswith('test_') and callable(f)]
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
