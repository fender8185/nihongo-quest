#!/usr/bin/env python3
"""Check candidate grammar items before they go into data.js (DATA.GRAMMAR).
Usage: python3 scripts/check-grammar.py FILE.json [PORT]
FILE.json: a JSON array of items in the data.js shape: {id, u, t: choice|meaning, lv, d, pt, sec, jp, op, a, zh, why}.
Checks, with the app's own code: id unused; unit, section and point exist (pt must be one the unit's section already uses;
week 0 (u: 'm0') has five fixed points instead, is kana only, and its katakana nouns must be words of the bank);
4 distinct options with the answer among them; choice items have exactly one blank the app can split, no ending duplicated
after the blank, and build as 填空 / 句意 (選正確句 is no longer a type, 1.0.23); stems are new (not an existing item's sentence); no banned words;
kanji without furigana are reported as warnings. Prints one line per problem and a summary; exit code 1 when anything fails."""
import json, os, subprocess, sys, time
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
sys.path.insert(0, os.path.join(ROOT, "tests", "e2e"))
from cdp import Browser
path = sys.argv[1]; port = int(sys.argv[2]) if len(sys.argv) > 2 else 8812
cands = json.load(open(path))
srv = subprocess.Popen([sys.executable, "-m", "http.server", str(port), "--bind", "127.0.0.1"], cwd=ROOT, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(0.8)
JS = """((cands) => { const bad = [], warn = []; const norm = (s) => String(s || '').replace(/[\\s　]/g, '');
  const existing = new Map(); REG.grammar.forEach(g => { existing.set(g.id, g); });
  const stems = new Set(REG.grammar.map(g => norm(g.jp || g.a || ''))); const seenIds = new Set(), seenStems = new Set();
  const ptsOf = (u, sec) => new Set(REG.grammar.filter(g => g.builtin && g.u === u && g.sec === sec).map(g => g.pt));
  const bareOf = (t) => (furi(String(t || '')).replace(/<ruby>.*?<[/]ruby>/g, '').match(/[一-龯々]+/g) || []);
  const WEEK0 = { 'AはBです・ではありません': 1, '〜ですか・はい／いいえ': 1, 'こそあど': 2, 'も（也）': 2, 'は・へ・を 的唸法': 3 };   // 第 0 週: point → lesson section
  const words = new Set(DATA.VOCAB.map(v => v.w));
  cands.forEach((x, i) => {
    const id = x.id || ('#' + i); const P = (m) => bad.push([id, m]); const W = (m) => warn.push([id, m]);
    if (!x.id) P('missing id'); else if (existing.has(x.id) || seenIds.has(x.id)) P('id already used'); seenIds.add(x.id);
    const week0 = x.u === 'm0';
    const u = week0 ? unitById('m0') : DATA.UNITS.find(z => z.id === x.u); if (!u) { P('unknown unit ' + x.u); return; }
    const L = DATA.LESSONS[x.u]; if (!Number.isInteger(x.sec) || x.sec < 0 || x.sec >= L.sections.length) P('bad sec ' + x.sec);
    else if (week0 ? WEEK0[x.pt] !== x.sec : !ptsOf(x.u, x.sec).has(x.pt)) P(week0 ? 'week 0 point/section must be one of ' + Object.entries(WEEK0).map(([k, v]) => k + '@' + v).join('、') : 'pt not among this section\\'s points: ' + x.pt + ' (have: ' + [...ptsOf(x.u, x.sec)].join('、') + ')');
    if (week0) {
      const ja = [x.jp, x.t === 'meaning' ? '' : x.a].concat(x.t === 'meaning' ? [] : (x.op || [])).filter(Boolean).join(' ');
      if (/[一-龯々]/.test(ja)) P('week 0 is kana only');
      const loan = [...new Set(ja.match(/[ァ-ヶー]{2,}/g) || [])].filter(w => !words.has(w)); if (loan.length) P('loanword not in the word bank: ' + loan.join(' '));
    }
    if (!['choice', 'meaning'].includes(x.t)) P('type must be choice/meaning');
    if (x.lv !== (/N4/.test(u.lv) ? 'N4' : 'N5')) P('lv should be ' + u.lv);
    if (![1, 2, 3].includes(x.d)) P('d must be 1..3');
    ['zh', 'why', 'pt'].forEach(k => { if (!String(x[k] || '').trim()) P('missing ' + k); else if (BANNED_WORDS.test(x[k])) P('banned word in ' + k); });
    if (/\\*\\*[^*]*$/.test(x.why || '') && ((x.why.match(/\\*\\*/g) || []).length & 1)) P('unbalanced ** in why');
    const op = Array.isArray(x.op) ? x.op.map(s => String(s).trim()) : [];
    if (op.length !== 4 || new Set(op).size !== 4) P('needs 4 distinct options'); if (!op.includes(String(x.a || '').trim())) P('answer not among options');
    const stem = norm(x.jp); if (stems.has(stem) || seenStems.has(stem)) P('sentence already exists in the bank'); seenStems.add(stem);
    if (x.t === 'choice') {
      const jp = String(x.jp || ''); if ((jp.match(/（[^（）]*）/g) || []).length !== 1) P('needs exactly one （　） blank');
      const b = splitBlank(jp); if (!b) P('app cannot split the blank: ' + jp);
      else {
        if (/^(です|ます|でした|ました|だ|である)/.test(b.post) && op.some(o => /(です|ます|でした|ました|だ)$/.test(o))) P('ending after the blank is also in the options');
        if (op.some(o => b.post && b.post.length >= 2 && o.endsWith(b.post.slice(0, 2)))) W('an option seems to repeat the text after the blank: ' + b.post.slice(0, 6));
        if (!/[。！？]$/.test(jp)) W('stem should end with 。');
      }
      const g = Object.assign({ key: 'g:' + id, kind: 'g', builtin: true }, x);
      try { const q = makeGrammarQuestion(g, { forceFmt: 'g-choice' }); if (!q || q.options.length !== 4) P('填空 question did not build'); else if (jaPlain(q.options[q.answer].text || q.options[q.answer]) !== jaPlain(x.a) && String(q.options[q.answer].text || q.options[q.answer]).indexOf(jaPlain(x.a)) < 0) W('answer option text differs: ' + JSON.stringify(q.options[q.answer]).slice(0, 60)); } catch (e) { P('builder error (choice) ' + e.message); }
      try { makeGrammarQuestion(g, { forceFmt: 'g-meaning' }); } catch (e) { P('builder error (meaning) ' + e.message); }
    } else if (x.t === 'meaning') {
      if (!/[぀-ヿ一-鿿]/.test(x.jp || '') || /（[^（）]*）/.test(x.jp || '')) P('meaning item needs a Japanese sentence without a blank');
      if (op.some(o => /[぀-ヿ]/.test(o))) P('meaning options must be Chinese');
    }
    const texts = [x.jp, x.a].concat(x.t === 'meaning' ? [] : op).filter(Boolean); const bare = new Set(); texts.forEach(t => bareOf(t).forEach(w => bare.add(w)));
    if (bare.size) W('kanji without furigana: ' + [...bare].join(' '));
  });
  return JSON.stringify({ bad, warn, n: cands.length }); })(%s)""" % json.dumps(cands, ensure_ascii=False)
try:
    with Browser() as b:
        r = json.loads(b.run([("nav", f"http://127.0.0.1:{port}/"), ("wait", "typeof REG === 'object' && REG.grammar && REG.grammar.length > 0 && typeof makeGrammarQuestion === 'function'"), ("eval", JS)], timeout=300)[-1])
finally:
    srv.terminate()
for id_, msg in r["warn"]: print("warn", id_, msg)
for id_, msg in r["bad"]: print("FAIL", id_, msg)
print(f"{r['n']} items, {len(r['bad'])} problems, {len(r['warn'])} warnings")
sys.exit(1 if r["bad"] else 0)
