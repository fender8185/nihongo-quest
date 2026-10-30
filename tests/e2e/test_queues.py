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
      state.stageTests = { p1: [{ date: t, correct: 33, total: 40, passed: true }] }; bulkMark('p1', 'learned');
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
