"""2026-10-29: PRE_N5 入門等級——假名辨識（kind a）、入門階段（state.stage）、起點選擇、PRE_N5 單字與漢字。"""
import json, os, re, subprocess, sys, time
sys.path.insert(0, os.path.dirname(__file__))
from cdp import Browser
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
PORT = 8792
URL = f"http://127.0.0.1:{PORT}/"
READY = "typeof state === 'object' && !!state.updatedAt && typeof speakScript === 'function'"

def ev(b, js, pre=()):
    return b.run([("nav", URL), ("wait", READY)] + list(pre) + [("eval", js)])[-1]

def test_kana_registry_has_142_items_in_row_order(b):
    js = """(() => { const k = REG.kana; return JSON.stringify({ n: k.length, first: k.slice(0, 12).map(x => x.ch), seion: k.filter(x => x.seion).length,
      last: k[k.length - 1].ch, pair: k.find(x => x.ch === 'か').pair, roma: k.find(x => x.ch === 'ジ').roma, byKey: REG.byKey.get('a:ぱ').kind,
      look: kanaLookalikes(REG.byKey.get('a:あ')).length, lookScript: kanaLookalikes(REG.byKey.get('a:シ')).every(c => /[ァ-ヶ]/.test(c)) }); })()"""
    r = json.loads(ev(b, js))
    assert r['n'] == 142 and r['seion'] == 92 and r['last'] == 'ポ', r
    assert r['first'] == ['あ', 'い', 'う', 'え', 'お', 'ア', 'イ', 'ウ', 'エ', 'オ', 'か', 'き'], r
    assert r['pair'] == 'カ' and r['roma'] == 'ji' and r['byKey'] == 'a', r
    assert r['look'] >= 3 and r['lookScript'], r

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
