#!/usr/bin/env python3
"""Check curated mock-exam items (DATA.EXAM) before they go into data.js (1.0.33).
Usage: python3 scripts/check-exam.py FILE.json [PORT]
FILE.json: a JSON array of items {id, lv, m, …, why}. Each item's 大題 m must be one of its level's paper (MONDAI_LV) and of a kind
written by hand: context (jp with one （　）, 4 op, a), paraphrase (jp with the part to restate between two ＿＿, 4 op, a),
usage (word, 4 op sentences, a), textgrammar (passage with blanks （１）…, qs [{op, a}] one a blank) or passage (passage, qs
[{q, op, a}]). Listening comes from the practice items (check-listen-read.py), so a curated listening item is refused.
Checks, with the app's own code: id new and unique; the unit builds (examUnit) with 4 distinct options and the answer among them;
every kanji has furigana; why is there and has no banned words. Prints one line per problem; exit code 1 when anything fails."""
import json, os, subprocess, sys, time
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
sys.path.insert(0, os.path.join(ROOT, "tests", "e2e"))
from cdp import Browser
path = sys.argv[1]; port = int(sys.argv[2]) if len(sys.argv) > 2 else 8813
cands = json.load(open(path, encoding='utf-8'))
srv = subprocess.Popen([sys.executable, "-m", "http.server", str(port), "--bind", "127.0.0.1"], cwd=ROOT, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(0.8)
JS = r"""((cands) => { const bad = []; const seen = new Set(); const have = new Set(DATA.EXAM.map(x => x.id));
  const bare = (t) => (furi(String(t || '')).replace(/<ruby[^>]*>.*?<\/ruby>/g, '').match(/[一-鿿々〆ヶ]+/g) || []);
  const FW = '１２３４５６７８９';
  cands.forEach((x, i) => {
    const id = x.id || ('#' + i); const P = (m) => bad.push([id, m]);
    if (!x.id) P('missing id'); else if (seen.has(x.id)) P('id used twice'); else if (have.has(x.id)) P('id already in the bank'); seen.add(x.id);
    if (!examLevels().includes(x.lv)) { P('lv must be one of ' + examLevels().join('/')); return; }
    const md = mondai(x.lv, x.m); if (!md) { P('no 大題 ' + x.m + ' in the ' + x.lv + ' paper'); return; }
    const k = md.k;
    if (['task', 'gist', 'scene', 'resp'].includes(k)) { P('curated listening: ' + x.lv + ' 聴解 comes from the practice items'); return; }
    if (['reading', 'kanji', 'grammar', 'order'].includes(k)) { P(x.m + ' is made from the word and grammar banks'); return; }
    if (!String(x.why || '').trim()) P('missing why'); else if (BANNED_WORDS.test(x.why)) P('banned word in why');
    const ja = [];
    if (k === 'context') { if ((String(x.jp || '').match(/（　）/g) || []).length !== 1) P('context needs exactly one （　） blank'); ja.push(x.jp); }
    if (k === 'paraphrase') { if ((String(x.jp || '').match(/＿＿/g) || []).length !== 2) P('paraphrase marks the part to restate with two ＿＿'); ja.push(String(x.jp || '').replace(/＿＿/g, '')); }
    if (k === 'usage') { if (!String(x.word || '').trim()) P('usage needs the word'); else if ((x.op || []).filter(o => String(o).includes(jaPlain(x.word).slice(0, 1))).length < 4) P('every usage option should use the word: ' + x.word); ja.push(x.word); }
    if (k === 'context' || k === 'paraphrase' || k === 'usage') {
      const op = x.op || []; if (op.length !== 4 || new Set(op).size !== 4 || !op.includes(x.a)) P('needs 4 distinct options with the answer among them'); ja.push(...op);
    }
    if (k === 'textgrammar' || k === 'passage') {
      if (!String(x.passage || '').trim() || !Array.isArray(x.qs) || !x.qs.length) { P('needs a passage and qs'); return; }
      x.qs.forEach((q, j) => { const op = q.op || []; if (op.length !== 4 || new Set(op).size !== 4 || !op.includes(q.a)) P('q' + (j + 1) + ' needs 4 distinct options with the answer among them');
        if (k === 'passage') { if (!String(q.q || '').trim()) P('q' + (j + 1) + ' needs its question'); ja.push(q.q); } ja.push(...op); });
      if (k === 'textgrammar') { const n = x.qs.length; const marks = [...String(x.passage).matchAll(/（([１-９])）/g)].map(m => m[1]).join('');
        if (marks !== FW.slice(0, n)) P('the passage needs the blanks （１）…（' + FW[n - 1] + '） in order, one a question (has ' + (marks || 'none') + ')'); }
      ja.push(x.passage);
    }
    let u = null; try { u = examUnit(x, k); } catch (e) { P('builder error ' + e.message); }
    if (!u || !u.qs.length || u.qs.some(q => !q.options || q.options.length !== 4)) P('the exam unit did not build');
    const b = new Set(); ja.filter(Boolean).forEach(t => bare(t).forEach(w => b.add(w))); if (b.size) P('kanji without furigana: ' + [...b].join(' '));
  });
  return JSON.stringify({ bad, n: cands.length }); })(%s)""" % json.dumps(cands, ensure_ascii=False)
try:
    with Browser() as b:
        r = json.loads(b.run([("nav", f"http://127.0.0.1:{port}/"), ("wait", "typeof REG === 'object' && typeof examUnit === 'function'"), ("eval", JS)], timeout=240)[-1])
finally:
    srv.terminate()
for id_, msg in r["bad"]: print("FAIL", id_, msg)
print(f"{r['n']} items, {len(r['bad'])} problems")
sys.exit(1 if r["bad"] else 0)
