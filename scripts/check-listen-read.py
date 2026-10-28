#!/usr/bin/env python3
"""Check candidate 聽力／閱讀 items before they go into data.js.
Usage: python3 scripts/check-listen-read.py FILE.json [PORT]
FILE.json: {"listen": [ {t, lv, u, script|line|scene, q?, op, a, zh?, why}, … ], "read": [ {lv, u, kind, passage, q, op, a, zh, why}, … ]}
(no ids: the merge assigns them). Each item must: have the fields its type needs; keep the answer among distinct options
(dialog/read 4, resp/scene 3); get furigana on every kanji (so only words the app knows); use no N4-only word
(a warning names the word); not repeat a text already in the bank or elsewhere in the file.
Prints one line per problem and a summary; exit code 1 when anything is wrong (warnings alone keep 0)."""
import json, os, subprocess, sys, time
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
sys.path.insert(0, os.path.join(ROOT, "tests", "e2e"))
from cdp import Browser
path = sys.argv[1]; port = int(sys.argv[2]) if len(sys.argv) > 2 else 8812
cands = json.load(open(path))
srv = subprocess.Popen([sys.executable, "-m", "http.server", str(port), "--bind", "127.0.0.1"], cwd=ROOT, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(0.8)
JS = r"""((c) => { const problems = [], warnings = [];
  const N5 = new Set(), N4 = new Set();
  REG.vocab.filter(v => v.builtin).forEach(v => { const set = v.lv === 'N5' ? N5 : N4; set.add(v.w); set.add(jaPlain(v.w)); });
  const KANJI = /[一-鿿々〆ヶ]+/g;
  const bare = (text) => (furi(String(text || '')).replace(/<ruby>.*?<\/ruby>/g, '').match(KANJI) || []);
  const bases = (text) => { const out = []; const re = /<ruby>([^<]+)<rt>/g; let m; const h = furi(String(text || '')); while ((m = re.exec(h))) out.push(m[1]); return out; };
  const seen = new Map();
  (DATA.LISTEN || []).forEach(x => seen.set(jaPlain(x.script || x.line || x.scene || ''), x.id));
  (DATA.READ || []).forEach(x => seen.set(jaPlain(x.passage || ''), x.id));
  const UNITS = new Set(DATA.UNITS.map(u => u.id));
  const check = (label, it, texts, nOpt) => {
    const p = (m) => problems.push([label, m]);
    if (!UNITS.has(it.u)) p('unknown unit ' + it.u);
    if (it.lv !== 'N5' && it.lv !== 'N4') p('lv must be N5 or N4');
    if (!Array.isArray(it.op) || it.op.length !== nOpt) p('needs exactly ' + nOpt + ' options');
    else { if (new Set(it.op.map(jaPlain)).size !== it.op.length) p('options repeat'); if (!it.op.includes(it.a)) p('answer is not one of the options'); }
    if (!String(it.why || '').trim()) p('missing why');
    texts.forEach(([f, t]) => { if (!String(t || '').trim()) p('missing ' + f); });
    const all = texts.filter(x => x[0] !== 'zh' && x[0] !== 'scene').map(x => x[1]).concat(it.op || []).join('\n');   // Japanese fields only
    const b = bare(all); if (b.length) p('kanji without furigana (use words the app knows): ' + [...new Set(b)].join(' '));
    const n4 = [...new Set(bases(all).filter(w => N4.has(w) && !N5.has(w)))]; if (n4.length) warnings.push([label, 'N4 word: ' + n4.join(' ')]);
    const main = jaPlain(it.script || it.line || it.scene || it.passage || '');
    if (seen.has(main)) p('same text as ' + seen.get(main)); else seen.set(main, label);
  };
  (c.listen || []).forEach((it, i) => { const label = 'listen#' + i + ' ' + it.u;
    if (it.t === 'dialog') check(label, it, [['script', it.script], ['q', it.q], ['zh', it.zh]], 4);
    else if (it.t === 'resp') check(label, it, [['line', it.line], ['zh', it.zh]], 3);
    else if (it.t === 'scene') { check(label, it, [['scene', it.scene]], 3); if (/[ぁ-ゖァ-ヶ]/.test(it.scene || '')) problems.push([label, 'scene must be Chinese']); }
    else problems.push([label, 'unknown t ' + it.t]);
    if (it.t === 'dialog' && !/^(男|女)：/m.test(it.script || '')) problems.push([label, 'script lines must start with 男： or 女：']);
    if (it.q && !/か。$/.test(it.q)) problems.push([label, 'q should end with か。']);
  });
  (c.read || []).forEach((it, i) => { const label = 'read#' + i + ' ' + it.u;
    if (!['memo', 'email', 'notice', 'diary', 'message', 'schedule', 'essay', 'article'].includes(it.kind)) problems.push([label, 'unknown kind ' + it.kind]);
    check(label, it, [['passage', it.passage], ['q', it.q], ['zh', it.zh]], 4);
  });
  return JSON.stringify({ problems, warnings, nL: (c.listen || []).length, nR: (c.read || []).length }); })(%s)""" % json.dumps(cands, ensure_ascii=False)
try:
    with Browser() as b:
        r = json.loads(b.run([("nav", f"http://127.0.0.1:{port}/"), ("wait", "typeof REG === 'object' && REG.vocab && REG.vocab.length > 0 && typeof furi === 'function'"), ("eval", JS)], timeout=240)[-1])
finally:
    srv.terminate()
for label, msg in r["warnings"]: print("WARN", label, msg)
for label, msg in r["problems"]: print("BAD ", label, msg)
print(f"{r['nL']} listen, {r['nR']} read; {len(r['problems'])} problems, {len(r['warnings'])} warnings")
sys.exit(1 if r["problems"] else 0)
