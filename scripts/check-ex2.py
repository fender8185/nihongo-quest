#!/usr/bin/env python3
"""Check candidate second examples for built-in words before they go into data.js.
Usage: python3 scripts/check-ex2.py FILE.json [PORT]
FILE.json: {"<vocab id>": {"ex2": "…{marked}…", "exZh2": "…"}, …}
Each entry must: carry exactly one {…} marker; use a form the app recognises (verbs / い形容詞 conjugations, or the word itself);
differ from the first example; have a translation; get furigana on every kanji (only words the app knows); build a 例句填空 question.
Prints one line per problem and a summary; exit code 1 when anything is wrong."""
import json, os, subprocess, sys, time
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
sys.path.insert(0, os.path.join(ROOT, "tests", "e2e"))
from cdp import Browser
path = sys.argv[1]; port = int(sys.argv[2]) if len(sys.argv) > 2 else 8811
cands = json.load(open(path))
srv = subprocess.Popen([sys.executable, "-m", "http.server", str(port), "--bind", "127.0.0.1"], cwd=ROOT, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(0.8)
JS = """((cands) => { const out = []; const plainOf = (t) => t.replace(/[{}]/g, '');
  Object.entries(cands).forEach(([id, c]) => {
    const v = REG.vocab.find(x => x.builtin && x.id === id); if (!v) { out.push([id, 'unknown id']); return; }
    const ex2 = String(c.ex2 || ''), zh = String(c.exZh2 || '');
    const marks = (ex2.match(/\\{[^}]*\\}/g) || []);
    if (marks.length !== 1) { out.push([id, 'needs exactly one {marker}: ' + ex2]); return; }
    if (!zh.trim()) out.push([id, 'missing exZh2']);
    if (plainOf(ex2) === plainOf(v.ex)) out.push([id, 'same as the first example']);
    if (!/[。！？]$/.test(ex2)) out.push([id, 'should end with 。: ' + ex2]);
    const info = vSurfaceInfo({ ...v, ex: ex2 });
    if (!info || info.form === 'raw') out.push([id, 'marked form not recognised: {' + marks[0].slice(1, -1) + '} for ' + v.w + ' (' + v.p + ')']);
    else if (info.form === 'as-is' && info.surface !== v.w && info.surface !== jaPlain(v.w)) out.push([id, 'marker must be the word itself or a conjugation: {' + info.surface + '} vs ' + v.w]);
    const bare = furi(plainOf(ex2)).replace(/<ruby>.*?<[/]ruby>/g, '').match(/[一-龯々]+/g);
    if (bare) out.push([id, 'kanji without furigana (use words the app knows): ' + bare.join(' ')]);
    if (!v.ex2) { const vv = Object.assign({}, v, { ex2, exZh2: zh }); state.srs[v.key] = { b: 2, due: todayStr(), n: 3, ok: 3, ng: 0, s: 4, d: 5, last: todayStr(), f: {} };
      try { const q = makeVocabQuestion(vv, { forceFmt: 'v-cloze', exIndex: 1 }); if (!q || q.fmt !== 'v-cloze') out.push([id, 'cannot build 例句填空 from it']); } catch (e) { out.push([id, 'builder error ' + e.message]); }
      delete state.srs[v.key]; }
  });
  return JSON.stringify({ problems: out, n: Object.keys(cands).length }); })(%s)""" % json.dumps(cands, ensure_ascii=False)
try:
    with Browser() as b:
        r = json.loads(b.run([("nav", f"http://127.0.0.1:{port}/"), ("wait", "typeof REG === 'object' && REG.vocab && REG.vocab.length > 0 && typeof makeVocabQuestion === 'function'"), ("eval", JS)], timeout=240)[-1])
finally:
    srv.terminate()
for id_, msg in r["problems"]:
    print(f"{id_}\t{msg}")
print(f"{r['n']} candidates, {len(r['problems'])} problems")
sys.exit(1 if r["problems"] else 0)
