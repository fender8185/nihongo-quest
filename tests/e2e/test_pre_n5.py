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

def test_kana_question_formats_build_and_first_look_is_read(b):
    js = """(() => { const it = REG.byKey.get('a:あ'); delete state.srs[it.key];
      const q0 = makeQuestion(it, {}); const fmts = {}; for (let i = 0; i < 60; i++) { const q = makeQuestion(it, {}); fmts[q.fmt] = 1; }
      state.srs[it.key] = { b: 2, due: todayStr(), n: 2, ok: 2, ng: 0, s: 3, d: 5, last: addDays(todayStr(), -3) };
      const seen = {}; for (let i = 0; i < 80; i++) { const q = makeQuestion(it, {}); seen[q.fmt] = (seen[q.fmt] || 0) + 1; }
      const s = makeQuestion(it, { forceFmt: 'a-sound' }), p = makeQuestion(it, { forceFmt: 'a-pair' }), r = makeQuestion(it, { forceFmt: 'a-read' });
      delete state.srs[it.key];
      return JSON.stringify({ first: q0.fmt, newFmts: Object.keys(fmts), seen: Object.keys(seen).sort(),
        sound: { n: s.options.length, ans: s.options[s.answer].text, audio: s.audio, allHira: s.options.every(o => /^[ぁ-ゖ]$/.test(o.text)) },
        pair: { ans: p.options[p.answer].text, allKata: p.options.every(o => /^[ァ-ヶ]$/.test(o.text)) },
        read: { ans: r.options[r.answer].text, distinct: new Set(r.options.map(o => o.text)).size, kind: r.kind, prompt: r.mistakePrompt } }); })()"""
    r = json.loads(ev(b, js))
    assert r['first'] == 'a-read' and r['newFmts'] == ['a-read'], r
    assert r['seen'] == ['a-pair', 'a-read', 'a-sound'], r
    assert r['sound'] == {'n': 4, 'ans': 'あ', 'audio': 'あ', 'allHira': True}, r
    assert r['pair']['ans'] == 'ア' and r['pair']['allKata'], r
    assert r['read'] == {'ans': 'a', 'distinct': 4, 'kind': 'a', 'prompt': '假名「あ」'}, r

def test_kana_mistake_card_and_undo(b):
    js = """(() => { const it = REG.byKey.get('a:か'); const keep = JSON.stringify(state.srs); const mk = state.mistakes.length; const t = todayStr();
      delete state.srs[it.key]; state.today.newA = 0; startSession('items', { items: [it] }); const e = currentEntry(); e.q = makeQuestion(it, { forceFmt: 'a-read' }); renderPractice();
      answerCurrent((e.q.answer + 1) % 4);
      const after = { due: daysBetween(t, state.srs[it.key].due), rl: state.srs[it.key].rl, mistakes: state.mistakes.length - mk, newA: state.today.newA };
      const m = state.mistakes.find(x => x.key === it.key); const faces = mistakeCardFaces(m); const speak = mloopSpeakText(m);
      const undoBtn = document.querySelector('[data-act="slip"]'); if (undoBtn) undoBtn.click();
      const undone = { rec: Boolean(state.srs[it.key]), mistakes: state.mistakes.length - mk, btn: Boolean(undoBtn) };
      state.srs = JSON.parse(keep); saveState();
      return JSON.stringify({ after, front: faces.front.includes('か'), back: faces.back.includes('ka') && faces.back.includes('カ'), speak, undone }); })()"""
    r = json.loads(ev(b, js))
    assert r['after'] == {'due': 1, 'rl': 0, 'mistakes': 1, 'newA': 1}, r
    assert r['front'] and r['back'] and r['speak'] == 'か', r
    assert r['undone'] == {'rec': False, 'mistakes': 0, 'btn': True}, r

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
