#!/usr/bin/env python3
"""Check candidate 換句話說 (言い換え) items before they go into data.js (2026-11-22).
Usage: python3 -I scripts/check-paraphrase.py FILE.json [PORT]
FILE.json: {"items": [ {"id": "<a built-in word's id>", "ip": {"x": 1|2, "a": "…", "d": ["…", "…", "…"], "z": ["…", "…", "…", "…"]}}, … ]}
The question is the word's own example sentence (x 1 = ex, 2 = ex2) with its {marked} part underlined; `a` says the same thing in
other words and fits the sentence in the marked part's place, `d` are three that fit it too but mean something else, `z` the
Chinese of a and of each d as they read there. Each item must: name a built-in word with that example and one {marker} in it;
have four distinct options, none of them the marked part itself or holding it (one sharing a kanji with the word is a warning);
furigana on every kanji (so only words the app
knows); four Chinese glosses with no kana; no word above the word's level (a warning for N5/N4, a problem from N3 up); not
repeat a word of the file. Each level's batch also reports how often the answer is the longest and the shortest option (a WARN when
it is the longest in more than one item in four: a learner who picks the longest should do no better than chance).
Prints one line per problem and a summary; exit code 1 when anything is wrong (warnings alone keep 0)."""
import json, os, subprocess, sys, time
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
sys.path.insert(0, os.path.join(ROOT, "tests", "e2e"))
from cdp import Browser
path = sys.argv[1]; port = int(sys.argv[2]) if len(sys.argv) > 2 else 8813
cands = json.load(open(path, encoding='utf-8'))
srv = subprocess.Popen([sys.executable, os.path.join(ROOT, "tests", "e2e", "serve.py"), str(port), "--bind", "127.0.0.1"], cwd=ROOT, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(0.8)
JS = r"""((c) => { const problems = [], warnings = [];
  const idx = (L) => ALL_LEVELS.indexOf(L); const LV = new Map();   // a word's lowest level
  REG.vocab.filter(v => v.builtin).forEach(v => { const L = courseLevel(v.lv); [v.w, jaPlain(v.w)].forEach(w => { if (!LV.has(w) || idx(L) < idx(LV.get(w))) LV.set(w, L); }); });
  const upTo = {}; courseLevels().forEach(L => { upTo[L] = [...LV].filter(([, x]) => idx(x) <= idx(L)).map(([w]) => w); });
  const KANJI = /[一-鿿々〆ヶ]+/g;
  const bare = (text) => (furi(String(text || '')).replace(/<ruby>.*?<\/ruby>/g, '').match(KANJI) || []);
  const bases = (text) => { const out = []; const re = /<ruby[^>]*>([^<]+)<rt>[^<]*<\/rt><\/ruby>/g; let m; const h = furi(String(text || '')); while ((m = re.exec(h))) out.push(m[1]); return out; };
  const L = (o) => jaPlain(String(o)).length; const tally = {}; const seen = new Set();
  (c.items || []).forEach((it, i) => {
    const label = 'item#' + i + ' ' + it.id; const p = (m) => problems.push([label, m]);
    const v = REG.byKey.get('v:' + it.id) || REG.vocab.find(x => x.builtin && x.id === it.id);
    if (!v) { p('no built-in word with this id'); return; }
    if (seen.has(it.id)) p('this word is in the file twice'); seen.add(it.id);
    const ip = it.ip || {};
    const ex = ip.x === 2 ? v.ex2 : ip.x === 1 ? v.ex : null;
    if (!ex) { p('x must be 1 (ex) or 2 (ex2) and that example must exist'); return; }
    const marks = String(ex).match(/\{[^}]*\}/g) || [];
    if (marks.length !== 1) { p('the example needs exactly one {marker}'); return; }
    const surface = jaPlain(marks[0].slice(1, -1));
    const opts = [ip.a].concat(ip.d || []);
    if (typeof ip.a !== 'string' || !ip.a.trim()) p('missing a');
    if (!Array.isArray(ip.d) || ip.d.length !== 3 || ip.d.some(x => typeof x !== 'string' || !x.trim())) p('d must be three options');
    else {
      if (new Set(opts.map(o => jaPlain(o))).size !== 4) p('options repeat');
      opts.forEach(o => { if (jaPlain(o) === surface || jaPlain(o).includes(surface)) p('an option is or holds the marked part itself: ' + o); });
      const own = [...jaPlain(v.w)].filter(c => /[一-鿿]/.test(c));   // 確認する → 確かめる gives itself away by the 確
      opts.forEach(o => { if (own.some(c => jaPlain(o).includes(c))) warnings.push([label, 'an option shares a kanji with the word: ' + o]); });
    }
    if (!Array.isArray(ip.z) || ip.z.length !== 4 || ip.z.some(x => typeof x !== 'string' || !x.trim())) p('z must be four Chinese glosses (a, then each d)');
    else if (ip.z.some(x => /[ぁ-ゖァ-ヺ]/.test(x))) p('z must be Chinese (no kana)');
    const all = opts.join('\n');
    const b = bare(all); if (b.length) p('kanji without furigana (use words the app knows): ' + [...new Set(b)].join(' '));
    const lv = courseLevel(v.lv); const low = upTo[lv] || [];
    const above = [...new Set(bases(all).filter(w => LV.has(w) && idx(LV.get(w)) > idx(lv) && !low.some(x => x.includes(w))))];
    if (above.length) (idx(lv) >= idx('N3') ? problems : warnings).push([label, 'word above ' + lv + ': ' + above.join(' ')]);
    if (opts.every(o => typeof o === 'string')) {
      const t = tally[lv] = tally[lv] || { n: 0, long: 0, short: 0 }; const mx = Math.max(...opts.map(L)), mn = Math.min(...opts.map(L)); t.n++;
      if (L(ip.a) === mx && opts.filter(o => L(o) === mx).length === 1) t.long++;
      if (L(ip.a) === mn && opts.filter(o => L(o) === mn).length === 1) t.short++;
    }
  });
  Object.entries(tally).forEach(([lv, t]) => { const line = `${lv}: the answer is the longest option in ${t.long} of ${t.n}, the shortest in ${t.short}`;
    warnings.push(['lengths', (t.n >= 4 && t.long / t.n > 0.25 ? 'too often the longest — ' : '') + line]); });
  return JSON.stringify({ problems, warnings, n: (c.items || []).length }); })(%s)""" % json.dumps(cands, ensure_ascii=False)
try:
    with Browser() as b:
        r = json.loads(b.run([("nav", f"http://127.0.0.1:{port}/"), ("wait", "typeof REG === 'object' && REG.vocab && REG.vocab.length > 0 && typeof furi === 'function'"), ("eval", JS)], timeout=240)[-1])
finally:
    srv.terminate()
for label, msg in r["warnings"]: print("WARN", label, msg)
for label, msg in r["problems"]: print("BAD ", label, msg)
print(f"{r['n']} items; {len(r['problems'])} problems, {len(r['warnings'])} warnings")
sys.exit(1 if r["problems"] else 0)
