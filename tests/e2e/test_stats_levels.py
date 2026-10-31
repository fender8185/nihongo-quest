"""1.0.26: 學習分析的總進度分四種範圍、過去 7 天、最近 100 題正確率、課程進度推估與考試目標級別。"""
import json, os, subprocess, sys, time
sys.path.insert(0, os.path.dirname(__file__))
from cdp import Browser
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
PORT = 8802
URL = f"http://127.0.0.1:{PORT}/"
READY = "typeof state === 'object' && !!state.updatedAt && typeof speakScript === 'function'"

def ev(b, js, pre=()):
    return b.run([("nav", URL), ("wait", READY)] + list(pre) + [("eval", js)])[-1]

# a main-course account at week 1 with nothing learned yet
FRESH = "state.stage = 'main'; state.kanaKnown = true; state.introSeen = true; state.startChosen = true; state.currentUnit = 'm1'; saveState(); DAILY_CACHE = null;"

# ---- 總進度: 總進度／入門／N5／N4 ----
def test_each_scope_shows_its_banks_and_totals(b):
    js = "(() => { " + FRESH + """ location.hash = '#/stats'; route();
      const pick = (s) => { document.querySelector(`[data-act=stats-scope][data-scope=${s}]`).click();
        return [...document.querySelectorAll('#progressCard .gauge')].map(g => [g.dataset.kind, +g.dataset.total, !!g.querySelector('.tick'), g.querySelector('strong').textContent]); };
      const n5u = new Set(DATA.UNITS.filter(u => u.lv === 'N5').map(u => u.id)), n4u = new Set(DATA.UNITS.filter(u => u.lv === 'N4').map(u => u.id));
      const V = REG.vocab.filter(v => v.builtin), LR = REG.listen.concat(REG.read), G = REG.grammar;
      const want = {
        all: [['v', V.length, true, '單字'], ['g', G.length, true, '文法'], ['lr', LR.length, true, '聽力＋閱讀'], ['k', REG.kanji.length, true, '漢字']],
        pre: [['a', REG.kana.length, false, '假名'], ['v', V.filter(v => v.lv === 'PRE_N5').length, false, '入門單字'], ['g', G.filter(g => g.u === 'm0').length, false, '入門文法']],
        n5: [['v', V.filter(v => v.lv === 'N5').length, false, '單字'], ['g', G.filter(g => n5u.has(g.u)).length, false, '文法'], ['lr', LR.filter(x => x.lv === 'N5').length, false, '聽力＋閱讀'], ['k', REG.kanji.filter(k => k.lv === 'N5').length, false, '漢字']],
        n4: [['v', V.filter(v => v.lv === 'N4').length, false, '單字'], ['g', G.filter(g => n4u.has(g.u)).length, false, '文法'], ['lr', LR.filter(x => x.lv === 'N4').length, false, '聽力＋閱讀'], ['k', REG.kanji.filter(k => k.lv === 'N4').length, false, '漢字']] };
      const got = {}; ['pre', 'n5', 'n4', 'all'].forEach(s => { got[s] = pick(s); });
      const part = (i, j) => want.n5[i][1] + want.n4[i][1] + (j === null ? 0 : want.pre[j][1]) === want.all[i][1];   // every item is in one level view
      return JSON.stringify({ got, want, part: [part(0, 1), part(1, 2), part(2, null), part(3, null)] }); })()"""
    r = json.loads(ev(b, js))
    assert r['got'] == r['want'], r
    assert r['part'] == [True, True, True, True], r['part']

def test_the_scope_is_kept_while_the_app_is_open(b):
    js = "(() => { " + FRESH + """ location.hash = '#/stats'; route(); document.querySelector('[data-act=stats-scope][data-scope=n5]').click();
      location.hash = '#/today'; route(); location.hash = '#/stats'; route();
      return document.querySelector('[data-act=stats-scope][aria-pressed=true]').dataset.scope; })()"""
    assert ev(b, js) == 'n5'

def test_listening_and_reading_steps_follow_right_answers(b):
    js = "(() => { " + FRESH + """ state.srs = {}; const t = todayStr(); const [a, c, d] = REG.listen.slice(0, 3); const e = REG.read[0];
      const rec = (ok, n) => ({ b: 1, due: addDays(t, 7), n, ok, ng: n - ok, s: 2, d: 5, last: addDays(t, -1) });
      state.srs[a.key] = rec(0, 1); state.srs[c.key] = rec(1, 1); state.srs[d.key] = rec(2, 2); state.srs[e.key] = rec(1, 2);
      const x = progressTotals('lr'); return JSON.stringify([x.seen, x.learned, x.mastered]); })()"""
    assert json.loads(ev(b, js)) == [1, 2, 1]

def test_ai_made_grammar_counts_in_its_units_level(b):   # Review Focus 5
    js = "(() => { " + FRESH + """ const n = (s) => progressTotals('g', s).total; const before = ['all', 'n5', 'n4', 'pre'].map(n);
      state.customGrammar = [{ id: 'ai-n5', u: 'm3' }, { id: 'ai-x', u: 'zz' }]; buildRegistry();
      return JSON.stringify(['all', 'n5', 'n4', 'pre'].map((s, i) => n(s) - before[i])); })()"""
    assert json.loads(ev(b, js)) == [2, 1, 0, 0]

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
