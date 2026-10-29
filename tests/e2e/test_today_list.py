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
