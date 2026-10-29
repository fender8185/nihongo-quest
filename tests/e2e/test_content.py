"""2026-10-29: 聽力、閱讀答對後久久才再出；N5 聽力／閱讀題庫擴充。"""
import json, os, subprocess, sys, time
sys.path.insert(0, os.path.dirname(__file__))
from cdp import Browser
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
PORT = 8793
URL = f"http://127.0.0.1:{PORT}/"
READY = "typeof state === 'object' && !!state.updatedAt && typeof speakScript === 'function'"

def ev(b, js, pre=()):
    return b.run([("nav", URL), ("wait", READY)] + list(pre) + [("eval", js)])[-1]

def test_listening_and_reading_wait_a_month_then_a_season_then_half_a_year(b):
    js = """(() => { const t = todayStr(); const keep = JSON.stringify(state.srs); const out = {};
      ['l', 'r'].forEach(k => { const it = (k === 'l' ? REG.listen : REG.read)[0]; delete state.srs[it.key];
        const days = []; for (let i = 0; i < 4; i++) { const r = srsAnswer(it.key, true).rec; days.push(daysBetween(t, r.due)); r.last = addDays(t, -1); }
        const miss = srsAnswer(it.key, false).rec; days.push(daysBetween(t, miss.due));
        out[k] = days; });
      state.srs = JSON.parse(keep); saveState(); return JSON.stringify(out); })()"""
    r = json.loads(ev(b, js))
    assert r == {'l': [30, 90, 180, 180, 7], 'r': [30, 90, 180, 180, 7]}, r   # 1.0.15: a miss waits a week, not a day

def test_every_n5_listening_and_reading_item_has_furigana_on_every_kanji(b):
    js = """(() => { const bad = []; const bare = (t) => furi(String(t || '')).replace(/<ruby>.*?<\\/ruby>/g, '').match(/[一-鿿々〆ヶ]+/g) || [];
      REG.listen.filter(x => x.lv === 'N5').forEach(x => { const b = bare([x.script, x.q, x.line].concat(x.op).filter(Boolean).join('\\n')); if (b.length) bad.push(x.id + ':' + b.join(' ')); });
      REG.read.filter(x => x.lv === 'N5').forEach(x => { const b = bare([x.passage, x.q].concat(x.op).join('\\n')); if (b.length) bad.push(x.id + ':' + b.join(' ')); });
      return JSON.stringify(bad); })()"""
    r = json.loads(ev(b, js))
    assert r == [], r

def test_the_n5_bank_has_the_added_listening_and_reading_items(b):
    js = """JSON.stringify({ l: REG.listen.filter(x => x.lv === 'N5').length, r: REG.read.filter(x => x.lv === 'N5').length,
      lt: ['dialog', 'resp', 'scene'].map(t => REG.listen.filter(x => x.lv === 'N5' && x.t === t).length),
      units: ['m1', 'm2', 'm3', 'm4', 'm5', 'm6'].map(u => [REG.listen.filter(x => x.u === u).length, REG.read.filter(x => x.u === u).length]),
      ok: REG.listen.concat(REG.read).every(x => x.op.includes(x.a) && new Set(x.op).size === x.op.length && x.why),
      ids: new Set(REG.listen.concat(REG.read).map(x => x.id)).size === REG.listen.length + REG.read.length })"""
    r = json.loads(ev(b, js))
    assert r['l'] >= 270 and r['r'] >= 125, r          # 70 + ~200 listening, 25 + ~100 reading at N5
    assert all(l >= 40 and rd >= 18 for l, rd in r['units']), r   # spread over 第 1–12 週
    assert r['ok'] and r['ids'], r

# ---- 1.0.16: 第 0 週 (m0) — 20 kana-only items on five points ----
WEEK0_PTS = {'AはBです・ではありません': 1, '〜ですか・はい／いいえ': 1, 'こそあど': 2, 'も（也）': 2, 'は・へ・を 的唸法': 3}

def test_week0_items_are_kana_only_and_cover_five_points(b):
    js = """(() => { const G = REG.grammar.filter(g => g.u === 'm0'); const ja = (g) => (g.t === 'meaning' ? [g.jp] : [g.jp, g.a].concat(g.op)).filter(Boolean).join(' ');   // a meaning item's answer and options are Chinese
      const words = new Set(REG.vocab.map(v => v.w)); const gen = new Set(cloudAudioTexts().map(x => x.text)); const full = (g) => g.t === 'choice' ? g.jp.replace(/（[^）]*）/, g.a) : g.t === 'correct' ? g.a : g.jp;
      return JSON.stringify({ n: G.length, pts: G.reduce((m, g) => (m[g.pt] = (m[g.pt] || 0) + 1, m), {}), secs: G.map(g => [g.pt, g.sec]),
        kanji: G.filter(g => /[一-龯々]/.test(ja(g))).map(g => g.id), kata: [...new Set(G.flatMap(g => ja(g).match(/[ァ-ヶー]{2,}/g) || []))].filter(w => !words.has(w)),
        dupFull: G.length - new Set(G.map(full)).size, built: G.filter(g => { const q = makeQuestion(g, {}); return q && q.options.length === 4; }).length,
        fmts: G.filter(g => g.t === 'choice').every(g => ['g-choice', 'g-correct', 'g-meaning'].every(f => makeGrammarQuestion(g, { forceFmt: f }))),
        inGen: G.filter(g => !gen.has(ttsText(full(g)))).map(g => g.id) }); })()"""
    r = json.loads(ev(b, js))
    assert r['n'] == 20 and r['pts'] == {k: 4 for k in WEEK0_PTS}, r
    assert all(sec == WEEK0_PTS[pt] for pt, sec in r['secs']), r
    assert r['kanji'] == [] and r['kata'] == [] and r['dupFull'] == 0, r
    assert r['built'] == 20 and r['fmts'] and r['inGen'] == [], r


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
