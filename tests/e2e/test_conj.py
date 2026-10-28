"""2026-10-28: 活用題輸入模式（假名磁貼／鍵盤）與生成式變化練習。"""
import json, os, subprocess, sys, time
sys.path.insert(0, os.path.dirname(__file__))
from cdp import Browser
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
PORT = 8797
URL = f"http://127.0.0.1:{PORT}/"
READY = "typeof state === 'object' && !!state.updatedAt && typeof speakScript === 'function'"

def ev(b, js, pre=()):
    return b.run([("nav", URL), ("wait", READY)] + list(pre) + [("eval", js)])[-1]

def test_conj_match_accepts_kana_kanji_katakana_and_spaces(b):
    js = """JSON.stringify({
      a: conjMatch('いって', '行って'), b: conjMatch('行って', '行って'), c: conjMatch('　イッテ ', '行って'),
      d: conjMatch('いきて', '行って'), e: conjMatch('こない', '来[こ]ない'), f: conjMatch('来ない', '来[こ]ない'),
      g: conjMatch('', '行って'), h: conjMatch('べんきょうして', '勉強して'),
      k: answerKana('勉強して'), d1: firstDiff('行いて', '行って'), d2: firstDiff('行って', '行って') })"""
    r = json.loads(ev(b, js))
    assert r['a'] and r['b'] and r['c'] and not r['d'] and r['e'] and r['f'] and not r['g'] and r['h'], r
    assert r['k'] == 'べんきょうして' and r['d1'] == 1 and r['d2'] == -1, r

def test_conj_tiles_keep_kanji_runs_whole_and_add_wrong_kana(b):
    js = """(() => { const t1 = conjTokens('来[こ]ない'), t2 = conjTokens('勉強して');
      const tiles = conjTiles('行って', JConj.verbDistractors('行く', '5', 'te', '行って'));
      return JSON.stringify({ t1, t2, n: tiles.length, has: ['行', 'っ', 'て'].every(x => tiles.includes(x)), extra: tiles.filter(x => !['行', 'っ', 'て'].includes(x)) }); })()"""
    r = json.loads(ev(b, js))
    assert r['t1'] == ['来[こ]', 'な', 'い'] and r['t2'] == ['勉強', 'し', 'て'], r
    assert r['has'] and 3 <= len(r['extra']) <= 4 and r['n'] == 3 + len(r['extra']), r

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
