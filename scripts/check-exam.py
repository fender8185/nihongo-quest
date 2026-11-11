#!/usr/bin/env python3
"""Check curated mock-exam items (DATA.EXAM) before they go into data.js (1.0.33).
Usage: python3 scripts/check-exam.py FILE.json [PORT]
FILE.json: a JSON array of items {id, lv, m, …, why}. Each item's 大題 m must be one of its level's paper (MONDAI_LV) and of a kind
written by hand: context (jp with one （　）, 4 op, a), paraphrase (jp with the part to restate between two ＿＿, 4 op, a),
usage (word, 4 op sentences, a), textgrammar (passage with blanks （１）…, qs [{op, a}] one a blank) or passage (passage, qs
[{q, op, a}]); listening task/gist (script, q, 4 op), scene (scene, 3 op) or resp (line, 3 op), refused where that level's 大題 takes
its practice items instead (N3's: check-listen-read.py). No word above the item's level (a problem from N3 up, a warning below; a name the app lists before さん is not one).
Checks, with the app's own code: id new and unique; the unit builds (examUnit) with 4 distinct options and the answer among them;
every kanji has furigana; why is there and has no banned words. Prints one line per problem; exit code 1 when anything fails."""
import json, os, subprocess, sys, time
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
sys.path.insert(0, os.path.join(ROOT, "tests", "e2e"))
from cdp import Browser
path = sys.argv[1]; port = int(sys.argv[2]) if len(sys.argv) > 2 else 8813
cands = json.load(open(path, encoding='utf-8'))
srv = subprocess.Popen([sys.executable, os.path.join(ROOT, "tests", "e2e", "serve.py"), str(port), "--bind", "127.0.0.1"], cwd=ROOT, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(0.8)
JS = r"""((cands) => { const bad = [], warn = []; const seen = new Set(); const have = new Set(DATA.EXAM.map(x => x.id));
  const idx = (L) => ALL_LEVELS.indexOf(L); const LV = new Map();   // a word's lowest level, as check-listen-read.py
  REG.vocab.filter(v => v.builtin).forEach(v => { const L = courseLevel(v.lv); [v.w, jaPlain(v.w)].forEach(w => { if (!LV.has(w) || idx(L) < idx(LV.get(w))) LV.set(w, L); }); });
  // a listed name right before さん／くん／様／先生 is a surname (林さん), not the word 林 (1.0.34, as check-listen-read.py)
  const NAME_AFTER = /^(?:さん|くん|君|ちゃん|さま|様|先生|氏)/; const NAMES = new Set((DATA.FURI_EXTRA || []).map(x => x[0]));   // the names the app lists (林, 森, 田中 …); 店員さん is still 店員
  const bases = (t) => { const out = []; const re = /<ruby[^>]*>([^<]+)<rt>[^<]*<\/rt><\/ruby>/g; let m; const h = furi(String(t || '')); while ((m = re.exec(h))) { if (!(NAMES.has(m[1]) && NAME_AFTER.test(h.slice(re.lastIndex, re.lastIndex + 60).replace(/<[^>]+>/g, '')))) out.push(m[1]); } return out; };
  const bare = (t) => (furi(String(t || '')).replace(/<ruby[^>]*>.*?<\/ruby>/g, '').match(/[一-鿿々〆ヶ]+/g) || []);
  const FW = '１２３４５６７８９';
  cands.forEach((x, i) => {
    const id = x.id || ('#' + i); const P = (m) => bad.push([id, m]);
    if (!x.id) P('missing id'); else if (seen.has(x.id)) P('id used twice'); else if (have.has(x.id)) P('id already in the bank'); seen.add(x.id);
    if (!examLevels().includes(x.lv)) { P('lv must be one of ' + examLevels().join('/')); return; }
    const md = mondai(x.lv, x.m); if (!md) { P('no 大題 ' + x.m + ' in the ' + x.lv + ' paper'); return; }
    const k = md.k;
    if (['task', 'gist', 'scene', 'resp'].includes(k) && md.listen) { P('curated listening: ' + x.lv + ' 聴解 comes from the practice items'); return; }
    if (['reading', 'kanji', 'grammar', 'order'].includes(k)) { P(x.m + ' is made from the word and grammar banks'); return; }
    if (!String(x.why || '').trim()) P('missing why'); else if (BANNED_WORDS.test(x.why)) P('banned word in why');
    const ja = [];
    if (k === 'context') { if ((String(x.jp || '').match(/（　）/g) || []).length !== 1) P('context needs exactly one （　） blank'); ja.push(x.jp); }
    if (k === 'paraphrase') { if ((String(x.jp || '').match(/＿＿/g) || []).length !== 2) P('paraphrase marks the part to restate with two ＿＿'); ja.push(String(x.jp || '').replace(/＿＿/g, '')); }
    if (k === 'usage') { if (!String(x.word || '').trim()) P('usage needs the word'); else if ((x.op || []).filter(o => String(o).includes(jaPlain(x.word).slice(0, 1))).length < 4) P('every usage option should use the word: ' + x.word); ja.push(x.word); }
    if (['context', 'paraphrase', 'usage', 'task', 'gist', 'scene', 'resp'].includes(k)) {
      const n = ['scene', 'resp'].includes(k) ? 3 : 4; const op = x.op || [];
      if (op.length !== n || new Set(op).size !== n || !op.includes(x.a)) P('needs ' + n + ' distinct options with the answer among them'); ja.push(...op);
    }
    if (k === 'task' || k === 'gist') { if (!String(x.script || '').trim() || !String(x.q || '').trim()) P('listening needs script and q'); ja.push(x.script, x.q); }
    if (k === 'scene' && !String(x.scene || '').trim()) P('scene needs the situation (Chinese)');
    if (k === 'resp') { if (!String(x.line || '').trim()) P('resp needs the line'); ja.push(x.line); }
    if (k === 'textgrammar' || k === 'passage') {
      if (!String(x.passage || '').trim() || !Array.isArray(x.qs) || !x.qs.length) { P('needs a passage and qs'); return; }
      x.qs.forEach((q, j) => { const op = q.op || []; if (op.length !== 4 || new Set(op).size !== 4 || !op.includes(q.a)) P('q' + (j + 1) + ' needs 4 distinct options with the answer among them');
        if (k === 'passage') { if (!String(q.q || '').trim()) P('q' + (j + 1) + ' needs its question'); ja.push(q.q); } ja.push(...op); });
      if (k === 'textgrammar') { const n = x.qs.length; const marks = [...String(x.passage).matchAll(/（([１-９])）/g)].map(m => m[1]).join('');
        if (marks !== FW.slice(0, n)) P('the passage needs the blanks （１）…（' + FW[n - 1] + '） in order, one a question (has ' + (marks || 'none') + ')'); }
      ja.push(x.passage);
    }
    let u = null; try { u = examUnit(x, k); } catch (e) { P('builder error ' + e.message); }
    if (!u || !u.qs.length || u.qs.some(q => !q.options || q.options.length !== (['scene', 'resp'].includes(k) ? 3 : 4))) P('the exam unit did not build');
    const low = [...LV].filter(([, L]) => idx(L) <= idx(x.lv)).map(([w]) => w);
    const above = [...new Set(ja.filter(Boolean).flatMap(bases).filter(w => LV.has(w) && idx(LV.get(w)) > idx(x.lv) && !low.some(y => y.includes(w))))];
    if (above.length) (idx(x.lv) >= idx('N3') ? bad : warn).push([id, 'word above ' + x.lv + ': ' + above.join(' ')]);
    const b = new Set(); ja.filter(Boolean).forEach(t => bare(t).forEach(w => b.add(w))); if (b.size) P('kanji without furigana: ' + [...b].join(' '));
  });
  return JSON.stringify({ bad, warn, n: cands.length }); })(%s)""" % json.dumps(cands, ensure_ascii=False)
try:
    with Browser() as b:
        r = json.loads(b.run([("nav", f"http://127.0.0.1:{port}/"), ("wait", "typeof REG === 'object' && typeof examUnit === 'function'"), ("eval", JS)], timeout=240)[-1])
finally:
    srv.terminate()
for id_, msg in r["warn"]: print("warn", id_, msg)
for id_, msg in r["bad"]: print("FAIL", id_, msg)
print(f"{r['n']} items, {len(r['bad'])} problems, {len(r['warn'])} warnings")
sys.exit(1 if r["bad"] else 0)
