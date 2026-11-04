#!/usr/bin/env python3
"""Check candidate 聽力／閱讀 items before they go into data.js.
Usage: python3 scripts/check-listen-read.py FILE.json [PORT]
FILE.json: {"listen": [ {t, lv, u, script|line|scene, q?, op, a, zh?, why}, … ], "read": [ {lv, u, kind, passage, q, op, a, zh, why}, … ]}
(no ids: the merge assigns them). Each item must: have the fields its type needs; be of its unit's level (a unit of a curriculum
outline counts before it is merged); keep the answer among distinct options (dialog/read 4, resp/scene 3); get furigana on every
kanji (so only words the app knows); use no word above its level (1.0.33: a warning for N5/N4, a problem from N3 up); not repeat a
text already in the bank or elsewhere in the file. N3 kinds: a listening dialog may be kind 'gist' (概要理解), a reading 'long'
(長文, 500+ characters) or 'info' (情報検索).
Prints one line per problem and a summary; exit code 1 when anything is wrong (warnings alone keep 0)."""
import glob, json, os, subprocess, sys, time
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
sys.path.insert(0, os.path.join(ROOT, "tests", "e2e"))
from cdp import Browser
path = sys.argv[1]; port = int(sys.argv[2]) if len(sys.argv) > 2 else 8812
cands = json.load(open(path, encoding='utf-8'))
OUTLINE = {}   # units of the curriculum outlines (m19… for N3) → their level, so items can be checked before the units are merged
for f in glob.glob(os.path.join(ROOT, 'curriculum', 'n[0-9].json')):
    o = json.load(open(f, encoding='utf-8')); OUTLINE.update({u['id']: o['level'] for u in o.get('units', [])})
srv = subprocess.Popen([sys.executable, "-m", "http.server", str(port), "--bind", "127.0.0.1"], cwd=ROOT, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(0.8)
JS = r"""((c, OUTLINE) => { const problems = [], warnings = [];
  const idx = (L) => ALL_LEVELS.indexOf(L); const LV = new Map();   // a word's lowest level
  REG.vocab.filter(v => v.builtin).forEach(v => { const L = courseLevel(v.lv); [v.w, jaPlain(v.w)].forEach(w => { if (!LV.has(w) || idx(L) < idx(LV.get(w))) LV.set(w, L); }); });
  const upTo = {}; courseLevels().forEach(L => { upTo[L] = [...LV].filter(([, x]) => idx(x) <= idx(L)).map(([w]) => w); });
  const unitLv = (u) => { const x = DATA.UNITS.find(z => z.id === u); return x ? courseLevel(x.lv) : (OUTLINE[u] || null); };
  const KANJI = /[一-鿿々〆ヶ]+/g;
  const bare = (text) => (furi(String(text || '')).replace(/<ruby>.*?<\/ruby>/g, '').match(KANJI) || []);
  const bases = (text) => { const out = []; const re = /<ruby>([^<]+)<rt>/g; let m; const h = furi(String(text || '')); while ((m = re.exec(h))) out.push(m[1]); return out; };
  const seen = new Map();
  (DATA.LISTEN || []).forEach(x => seen.set(jaPlain(x.script || x.line || x.scene || ''), x.id));
  (DATA.READ || []).forEach(x => seen.set(jaPlain(x.passage || ''), x.id));
  const check = (label, it, texts, nOpt) => {
    const p = (m) => problems.push([label, m]);
    if (!courseLevels().includes(it.lv)) p('lv must be one of ' + courseLevels().join('/'));
    if (!unitLv(it.u)) p('unknown unit ' + it.u); else if (unitLv(it.u) !== it.lv) p('unit ' + it.u + ' is ' + unitLv(it.u));
    if (!Array.isArray(it.op) || it.op.length !== nOpt) p('needs exactly ' + nOpt + ' options');
    else { if (new Set(it.op.map(jaPlain)).size !== it.op.length) p('options repeat'); if (!it.op.includes(it.a)) p('answer is not one of the options'); }
    if (!String(it.why || '').trim()) p('missing why');
    texts.forEach(([f, t]) => { if (!String(t || '').trim()) p('missing ' + f); });
    const all = texts.filter(x => x[0] !== 'zh' && x[0] !== 'scene').map(x => x[1]).concat(it.op || []).join('\n');   // Japanese fields only
    const b = bare(all); if (b.length) p('kanji without furigana (use words the app knows): ' + [...new Set(b)].join(' '));
    // a word above the item's level; a ruby base that is part of a word at or below it (会 of 会う, 楽 of 楽しい) is not one
    const low = upTo[it.lv] || [];
    const above = [...new Set(bases(all).filter(w => LV.has(w) && idx(LV.get(w)) > idx(it.lv) && !low.some(x => x.includes(w))))];
    if (above.length) (idx(it.lv) >= idx('N3') ? problems : warnings).push([label, 'word above ' + it.lv + ': ' + above.join(' ')]);
    const main = jaPlain(it.script || it.line || it.scene || it.passage || '');
    if (seen.has(main)) p('same text as ' + seen.get(main)); else seen.set(main, label);
  };
  (c.listen || []).forEach((it, i) => { const label = 'listen#' + i + ' ' + it.u;
    if (it.t === 'dialog') check(label, it, [['script', it.script], ['q', it.q], ['zh', it.zh]], 4);
    else if (it.t === 'resp') check(label, it, [['line', it.line], ['zh', it.zh]], 3);
    else if (it.t === 'scene') { check(label, it, [['scene', it.scene]], 3); if (/[ぁ-ゖァ-ヶ]/.test(it.scene || '')) problems.push([label, 'scene must be Chinese']); }
    else problems.push([label, 'unknown t ' + it.t]);
    if (it.kind !== undefined && !(it.kind === 'gist' && it.t === 'dialog')) problems.push([label, it.kind === 'gist' ? 'kind gist is a dialog (t: dialog)' : 'unknown kind ' + it.kind]);
    if (it.t === 'dialog' && !/^(男|女)：/m.test(it.script || '')) problems.push([label, 'script lines must start with 男： or 女：']);
    if (it.q && !/か。$/.test(it.q)) problems.push([label, 'q should end with か。']);
  });
  (c.read || []).forEach((it, i) => { const label = 'read#' + i + ' ' + it.u;
    if (!['memo', 'email', 'notice', 'diary', 'message', 'schedule', 'essay', 'article', 'long', 'info'].includes(it.kind)) problems.push([label, 'unknown kind ' + it.kind]);
    const len = jaPlain(it.passage || '').length;
    if (it.kind === 'long' && len < 500) problems.push([label, 'long passage needs 500+ characters (has ' + len + ')']);
    else if (it.lv === 'N3' && ['essay', 'article'].includes(it.kind) && len < 300) warnings.push([label, 'an N3 essay or article is usually 300+ characters (has ' + len + ')']);
    check(label, it, [['passage', it.passage], ['q', it.q], ['zh', it.zh]], 4);
  });
  return JSON.stringify({ problems, warnings, nL: (c.listen || []).length, nR: (c.read || []).length }); })(%s, %s)""" % (json.dumps(cands, ensure_ascii=False), json.dumps(OUTLINE))
try:
    with Browser() as b:
        r = json.loads(b.run([("nav", f"http://127.0.0.1:{port}/"), ("wait", "typeof REG === 'object' && REG.vocab && REG.vocab.length > 0 && typeof furi === 'function'"), ("eval", JS)], timeout=240)[-1])
finally:
    srv.terminate()
for label, msg in r["warnings"]: print("WARN", label, msg)
for label, msg in r["problems"]: print("BAD ", label, msg)
print(f"{r['nL']} listen, {r['nR']} read; {len(r['problems'])} problems, {len(r['warnings'])} warnings")
sys.exit(1 if r["problems"] else 0)
