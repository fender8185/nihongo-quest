#!/usr/bin/env python3
"""Check candidate built-in words before they go into data.js.
Usage: python3 -I scripts/check-vocab.py FILE.json [PORT]
FILE.json: {"words": [ {w, r, m, p, lv, c, ex, exZh, ex2?, exZh2?}, … ]}  (no ids: the merge assigns them)
Each word must: have every field; lv in PRE_N5/N5/N4 and c in DATA.THEMES[lv]; a known part of speech; a kana-only reading that
matches the app's furigana of w; not already be in the bank or repeated in the file; an example with exactly one {marker}
in a form the app recognises, ending with 。, every kanji with furigana; ex2 (when present) distinct from ex.
PRE_N5 words: the example may only use PRE_N5 words (pre-example-vocab) and must not carry ex2.
N5 words: a WARN names any word in the examples that the bank teaches only at N4 (n4-word-in-n5-example).
Prints BAD/WARN lines and a summary; exit code 1 when anything is BAD."""
import json, os, subprocess, sys, time
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
sys.path.insert(0, os.path.join(ROOT, "tests", "e2e"))
from cdp import Browser
path = sys.argv[1]; port = int(sys.argv[2]) if len(sys.argv) > 2 else 8812
cands = json.load(open(path))
srv = subprocess.Popen([sys.executable, "-m", "http.server", str(port), "--bind", "127.0.0.1"], cwd=ROOT, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(0.8)
JS = r"""((c) => { const problems = [], warnings = [];
  const POS = ['n', 'v5', 'v1', 'vs', 'vk', 'i', 'na', 'adv', 'conj', 'pron', 'q', 'cnt', 'exp'];
  const KANJI = /[一-鿿々〆ヶ]+/g;
  const bank = new Map(); REG.vocab.filter(v => v.builtin).forEach(v => bank.set(jaPlain(v.w), v.id));
  const preWords = REG.vocab.filter(v => v.builtin && v.lv === 'PRE_N5');
  const hira = (s) => String(s || '').replace(/[ァ-ヶ]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0x60));
  // levels per spelling+reading: the 楽 of 楽しい（たの） is not the N4 word 楽（らく）
  const bankLv = new Map(); REG.vocab.filter(v => v.builtin).forEach(v => { const k = jaPlain(v.w) + '|' + hira(v.r); if (!bankLv.has(k)) bankLv.set(k, new Set()); bankLv.get(k).add(v.lv); });
  const rubies = (t) => { const out = []; const re = /<ruby>([^<]+)<rt>([^<]*)<\/rt><\/ruby>/g; let m; const h = furi(String(t || '')); while ((m = re.exec(h))) out.push(m[1] + '|' + hira(m[2])); return out; };
  const bare = (t) => (furi(String(t || '')).replace(/<ruby>.*?<\/ruby>/g, '').match(KANJI) || []);
  const bases = (t) => { const out = []; const re = /<ruby>([^<]+)<rt>/g; let m; const h = furi(String(t || '')); while ((m = re.exec(h))) out.push(m[1]); return out; };
  const seen = new Set();
  (c.words || []).forEach((v, i) => {
    const label = 'word#' + i + ' ' + (v.w || '?'); const p = (m) => problems.push([label, m]); const warn = (m) => warnings.push([label, m]);
    ['w', 'r', 'm', 'p', 'lv', 'c', 'ex', 'exZh'].forEach(f => { if (!String(v[f] || '').trim()) p('missing ' + f); });
    if (!['PRE_N5', 'N5', 'N4'].includes(v.lv)) p('lv must be PRE_N5, N5 or N4');
    else if (!((DATA.THEMES || {})[v.lv] || []).some(t => t.c === v.c)) p('unknown theme for ' + v.lv + ': ' + v.c);
    if (!POS.includes(v.p)) p('unknown part of speech ' + v.p);
    if (!/^[ぁ-ゖァ-ヶー]+$/.test(v.r || '')) p('reading must be kana: ' + v.r);
    const plain = jaPlain(v.w || '');
    if (bank.has(plain)) p('already in the bank as ' + bank.get(plain)); else if (seen.has(plain)) p('repeated in this file'); seen.add(plain);
    if (/[一-鿿]/.test(plain)) {
      const b = bare(v.w); if (b.length) warn('reading unverified: the app does not know this kanji word yet (it will once merged)');   // a new word adds itself to the furigana index
      else { const map = readingMapFrom(v.w); const read = plain.replace(/[一-鿿々〆ヶ]+/g, k => map[k] || k).replace(/[ァ-ヶ]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0x60));
        if (read !== (v.r || '').replace(/[ァ-ヶ]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0x60))) p('reading-mismatch: app reads ' + read + ', candidate says ' + v.r); }
    }
    const checkEx = (ex, which) => {
      const marks = (ex.match(/\{[^}]*\}/g) || []);
      if (marks.length !== 1) { p(which + ' needs exactly one {marker}: ' + ex); return; }
      if (!/[。！？]$/.test(ex)) p(which + ' should end with 。: ' + ex);
      const info = vSurfaceInfo(Object.assign({}, v, { ex }));
      if (!info || info.form === 'raw') p(which + ' marked form not recognised: ' + marks[0] + ' for ' + v.w + ' (' + v.p + ')');
      else if (info.form === 'as-is' && info.surface !== v.w && info.surface !== plain) p(which + ' marker must be the word itself or a conjugation: ' + marks[0]);
      const bb = bare(ex.replace(/[{}]/g, '')).filter(k => !plain.includes(k)); if (bb.length) p(which + ' kanji without furigana (use words the app knows): ' + bb.join(' '));   // the word itself is new and resolves after the merge
      if (v.lv === 'PRE_N5') {
        const outside = [...new Set(bases(ex.replace(/[{}]/g, '')).filter(k => k !== plain && !plain.includes(k) && !preWords.some(x => jaPlain(x.w) === k || jaPlain(x.w).includes(k))))];
        if (outside.length) p('pre-example-vocab: ' + which + ' uses non-PRE_N5 words: ' + outside.join(' '));
      }
      if (v.lv === 'N5') {   // an N5 learner has not met N4 words yet
        const n4 = [...new Set(rubies(ex.replace(/[{}]/g, '')).filter(k => !plain.includes(k.split('|')[0]) && bankLv.has(k) && [...bankLv.get(k)].every(l => l === 'N4')).map(k => k.split('|')[0]))];
        if (n4.length) warn('n4-word-in-n5-example: ' + which + ' uses ' + n4.join(' '));
      }
    };
    checkEx(String(v.ex || ''), 'ex');
    if (v.ex2 !== undefined) {
      if (v.lv === 'PRE_N5') p('PRE_N5 words carry no ex2');
      else { checkEx(String(v.ex2 || ''), 'ex2'); if (!String(v.exZh2 || '').trim()) p('missing exZh2'); if (String(v.ex2).replace(/[{}]/g, '') === String(v.ex).replace(/[{}]/g, '')) p('ex2 is the same as the first example'); }
    } else if (v.lv !== 'PRE_N5') warn('no ex2 (N5/N4 words usually have two examples)');
  });
  return JSON.stringify({ problems, warnings, n: (c.words || []).length }); })(%s)""" % json.dumps(cands, ensure_ascii=False)
try:
    with Browser() as b:
        r = json.loads(b.run([("nav", f"http://127.0.0.1:{port}/"), ("wait", "typeof REG === 'object' && REG.vocab && REG.vocab.length > 0 && typeof vSurfaceInfo === 'function'"), ("eval", JS)], timeout=240)[-1])
finally:
    srv.terminate()
for label, msg in r["warnings"]: print("WARN", label, msg)
for label, msg in r["problems"]: print("BAD ", label, msg)
print(f"{r['n']} words; {len(r['problems'])} problems, {len(r['warnings'])} warnings")
sys.exit(1 if r["problems"] else 0)
