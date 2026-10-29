"""2026-10-29 (1.0.11): 四個階段（STAGES）、課程頁單一「目前」、階段測驗、標記到這裡為止。"""
import json, os, re, subprocess, sys, time
sys.path.insert(0, os.path.dirname(__file__))
from cdp import Browser
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
PORT = 8790
URL = f"http://127.0.0.1:{PORT}/"
READY = "typeof state === 'object' && !!state.updatedAt && typeof speakScript === 'function'"

def ev(b, js, pre=()):
    return b.run([("nav", URL), ("wait", READY)] + list(pre) + [("eval", js)])[-1]

# ---- Task 1: 階段模型 ----
def test_stages_partition_every_item(b):
    js = """(() => { const S = STAGES.map(s => stageItems(s.id)); const keys = S.map(l => l.map(x => x.key));
      const all = new Set(keys.flat()); const dup = keys.flat().length - all.size;
      const expect = REG.kana.length + REG.vocab.filter(v => v.builtin).length + REG.grammar.length + REG.kanji.length + REG.listen.length + REG.read.length + REG.drills.length;
      return JSON.stringify({ ids: STAGES.map(s => s.id), units: STAGES.map(s => s.units.length), dup, total: all.size, expect,
        p2v: S[2].filter(x => x.kind === 'v').length, n4In: S.map(l => l.filter(x => x.kind === 'v' && x.lv === 'N4').length),
        kana: S[0].filter(x => x.kind === 'a').length, next: STAGES.map(s => nextUnitAfterStage(s.id)), of: [stageOfUnit('m7'), stageOfUnit('m18')] }); })()"""
    r = json.loads(ev(b, js))
    assert r['ids'] == ['pre', 'p1', 'p2', 'p3'] and r['units'] == [0, 6, 6, 6], r
    assert r['dup'] == 0 and r['total'] == r['expect'], r
    assert r['p2v'] == 0 and r['n4In'][:3] == [0, 0, 0] and r['n4In'][3] > 0 and r['kana'] == 142, r
    assert r['next'] == ['m1', 'm7', 'm13', 'm18'] and r['of'] == ['p2', 'p3'], r

def test_current_stage_follows_stage_and_unit(b):
    js = """(() => { const keep = [state.stage, state.currentUnit]; const out = [];
      state.stage = 'pre'; out.push(currentStageId()); state.stage = 'main'; state.currentUnit = 'm1'; out.push(currentStageId()); state.currentUnit = 'm13'; out.push(currentStageId());
      [state.stage, state.currentUnit] = keep; return JSON.stringify(out); })()"""
    assert json.loads(ev(b, js)) == ['pre', 'p1', 'p3']

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
