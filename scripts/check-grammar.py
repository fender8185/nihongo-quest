#!/usr/bin/env python3
"""Check candidate grammar items before they go into data.js (DATA.GRAMMAR).
Usage: python3 scripts/check-grammar.py FILE.json [PORT]
FILE.json is either
  - a JSON array of items in the data.js shape {id, u, t, lv, d, pt, sec, …}, for units data.js has, or
  - a unit file (1.0.33): {"unit": {id, desc}, "lesson": {formula, overview, sections}, "items": [...]}, for a unit of a curriculum
    outline (curriculum/n3.json …) that data.js does not have yet. Its unit and phase come from the outline and go into the app with
    the lesson before the items are checked, the way the merge will add them.
Checks, with the app's own code: id unused; unit, section and point exist (pt must be one the unit's section already uses; in a unit
file, one of the outline's points, each point in one section; week 0 (u: 'm0') has five fixed points instead, is kana only, and its
katakana nouns must be words of the bank); lv is the unit's level; d 1–3; no banned words; stems are new (not an existing item's
sentence). By type:
  choice, meaning: 4 distinct options with the answer among them; choice items have exactly one blank the app can split, no ending
    duplicated after the blank, and build as 填空 / 句意 (選正確句 is no longer a type, 1.0.23); meaning options are Chinese
  order: 4 distinct parts in the right order, star 0–3 (the index of the ★ part); builds as 排序 and as the exam's ★ question
  conj: one {V}; v a verb of the bank, g 5/1/k/s, f a form the app conjugates, a its conjugation; builds with three distractors
Kanji without furigana are warnings, problems from N3 up. A unit file also needs 3+ choice items a point, 5+ meaning and 5+ order
items, and 3–5 lesson sections, each with h, rule, points, two examples (every kanji with furigana) and items of its own.
Prints one line per problem and a summary; exit code 1 when anything fails."""
import glob, json, os, subprocess, sys, time
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
sys.path.insert(0, os.path.join(ROOT, "tests", "e2e"))
from cdp import Browser
path = sys.argv[1]; port = int(sys.argv[2]) if len(sys.argv) > 2 else 8812
raw = json.load(open(path, encoding='utf-8'))
unit_file = None
if isinstance(raw, dict):   # a unit file: find its unit in the outlines
    uid = raw['unit']['id']
    for f in sorted(glob.glob(os.path.join(ROOT, 'curriculum', 'n[0-9].json'))):
        o = json.load(open(f, encoding='utf-8')); u = next((x for x in o.get('units', []) if x['id'] == uid), None)
        if not u: continue
        pi = next(i for i, p in enumerate(o['phases']) if uid in p['units'])
        unit_file = {'unit': dict(raw['unit'], id=uid, lv=o['level'], short=u['short'], title=u['title']), 'phase': pi,
                     'phaseTitle': o['phases'][pi]['title'], 'lesson': raw.get('lesson') or {}, 'points': [p['p'] for p in u['points']]}
        break
    if not unit_file: sys.exit(f'unit {uid} is in no curriculum outline')
    cands = raw.get('items') or []
else:
    cands = raw
srv = subprocess.Popen([sys.executable, os.path.join(ROOT, "tests", "e2e", "serve.py"), str(port), "--bind", "127.0.0.1"], cwd=ROOT, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(0.8)
JS = """((cands, X) => { const bad = [], warn = []; const norm = (s) => String(s || '').replace(/[\\s　]/g, '');
  if (X && !DATA.UNITS.some(u => u.id === X.unit.id)) {   // the unit file's unit and phase, numbered on from data.js's as the merge does
    const ph = Math.max(...DATA.PHASES.map(p => p.id)) + X.phase + 1;
    if (!DATA.PHASES.some(p => p.id === ph)) DATA.PHASES.push({ id: ph, title: X.phaseTitle, span: '' });
    DATA.UNITS.push(Object.assign({ ph, weeks: '' }, X.unit));
  }
  if (X) { DATA.LESSONS[X.unit.id] = X.lesson; buildRegistry(); }
  const existing = new Map(); REG.grammar.forEach(g => { existing.set(g.id, g); });
  const stemOf = (x) => norm(x.t === 'order' ? (x.pre || '') + (x.parts || []).join('') + (x.post || '') : (x.jp || x.a || ''));
  const stems = new Set(REG.grammar.map(stemOf)); stems.delete(''); const seenIds = new Set(), seenStems = new Set();
  const ptsOf = (u, sec) => new Set(REG.grammar.filter(g => g.builtin && g.u === u && g.sec === sec).map(g => g.pt));
  const bareOf = (t) => (furi(String(t || '')).replace(/<ruby[^>]*>.*?<[/]ruby>/g, '').match(/[一-鿿々]+/g) || []);
  const WEEK0 = { 'AはBです・ではありません': 1, '〜ですか・はい／いいえ': 1, 'こそあど': 2, 'も（也）': 2, 'は・へ・を 的唸法': 3 };   // 第 0 週: point → lesson section
  const words = new Set(DATA.VOCAB.map(v => v.w)); const secOf = new Map();
  const strict = (lv) => ALL_LEVELS.indexOf(courseLevel(lv)) >= ALL_LEVELS.indexOf('N3');   // N3 up: every kanji needs furigana
  cands.forEach((x, i) => {
    const id = x.id || ('#' + i); const P = (m) => bad.push([id, m]); const W = (m) => warn.push([id, m]);
    if (!x.id) P('missing id'); else if (existing.has(x.id) || seenIds.has(x.id)) P('id already used'); seenIds.add(x.id);
    const week0 = x.u === 'm0';
    const u = week0 ? unitById('m0') : DATA.UNITS.find(z => z.id === x.u); if (!u) { P('unknown unit ' + x.u); return; }
    const own = X && x.u === X.unit.id;
    const L = DATA.LESSONS[x.u]; if (!L || !Number.isInteger(x.sec) || x.sec < 0 || x.sec >= L.sections.length) P('bad sec ' + x.sec);
    else if (own) {
      if (!X.points.includes(x.pt)) P('pt not among the outline points: ' + x.pt);
      else if (secOf.has(x.pt) && secOf.get(x.pt) !== x.sec) P('one point, one section: ' + x.pt + ' is in section ' + secOf.get(x.pt));
      else secOf.set(x.pt, x.sec);
    }
    else if (week0 ? WEEK0[x.pt] !== x.sec : !ptsOf(x.u, x.sec).has(x.pt)) P(week0 ? 'week 0 point/section must be one of ' + Object.entries(WEEK0).map(([k, v]) => k + '@' + v).join('、') : 'pt not among this section\\'s points: ' + x.pt + ' (have: ' + [...ptsOf(x.u, x.sec)].join('、') + ')');
    if (week0) {
      const ja = [x.jp, x.t === 'meaning' ? '' : x.a].concat(x.t === 'meaning' ? [] : (x.op || [])).filter(Boolean).join(' ');
      if (/[一-龯々]/.test(ja)) P('week 0 is kana only');
      const loan = [...new Set(ja.match(/[ァ-ヶー]{2,}/g) || [])].filter(w => !words.has(w)); if (loan.length) P('loanword not in the word bank: ' + loan.join(' '));
    }
    if (!['choice', 'meaning', 'order', 'conj'].includes(x.t)) P('type must be choice/meaning/order/conj');
    if (x.lv !== courseLevel(u.lv)) P('lv should be ' + courseLevel(u.lv));
    if (![1, 2, 3].includes(x.d)) P('d must be 1..3');
    ['zh', 'why', 'pt'].forEach(k => { if (!String(x[k] || '').trim()) { if (!(k === 'zh' && x.t === 'meaning')) P('missing ' + k); } else if (BANNED_WORDS.test(x[k])) P('banned word in ' + k); });   // a meaning item's options are the translation
    if (/\\*\\*[^*]*$/.test(x.why || '') && ((x.why.match(/\\*\\*/g) || []).length & 1)) P('unbalanced ** in why');
    const stem = stemOf(x); if (!stem) P('empty sentence'); else if (stems.has(stem) || seenStems.has(stem)) P('sentence already exists in the bank'); seenStems.add(stem);
    const g = Object.assign({ key: 'g:' + id, kind: 'g', builtin: true }, x);
    let texts = [];
    if (x.t === 'choice' || x.t === 'meaning') {
      const op = Array.isArray(x.op) ? x.op.map(s => String(s).trim()) : [];
      if (op.length !== 4 || new Set(op).size !== 4) P('needs 4 distinct options'); if (!op.includes(String(x.a || '').trim())) P('answer not among options');
      if (x.t === 'choice') {
        const jp = String(x.jp || ''); if ((jp.match(/（[^（）]*）/g) || []).length !== 1) P('needs exactly one （　） blank');
        const b = splitBlank(jp); if (!b) P('app cannot split the blank: ' + jp);
        else {
          if (/^(です|ます|でした|ました|だ|である)/.test(b.post) && op.some(o => /(です|ます|でした|ました|だ)$/.test(o))) P('ending after the blank is also in the options');
          if (op.some(o => b.post && b.post.length >= 2 && o.endsWith(b.post.slice(0, 2)))) W('an option seems to repeat the text after the blank: ' + b.post.slice(0, 6));
          if (!/[。！？]$/.test(jp)) W('stem should end with 。');
        }
        try { const q = makeGrammarQuestion(g, { forceFmt: 'g-choice' }); if (!q || q.options.length !== 4) P('填空 question did not build'); else if (jaPlain(q.options[q.answer].text || q.options[q.answer]) !== jaPlain(x.a) && String(q.options[q.answer].text || q.options[q.answer]).indexOf(jaPlain(x.a)) < 0) W('answer option text differs: ' + JSON.stringify(q.options[q.answer])); } catch (e) { P('builder error (choice) ' + e.message); }
        try { makeGrammarQuestion(g, { forceFmt: 'g-meaning' }); } catch (e) { P('builder error (meaning) ' + e.message); }
        texts = [jp, x.a].concat(op);
      } else {
        if (!/[぀-ヿ一-鿿]/.test(x.jp || '') || /（[^（）]*）/.test(x.jp || '')) P('meaning item needs a Japanese sentence without a blank');
        if (op.some(o => /[぀-ヿ]/.test(o))) P('meaning options must be Chinese');
        texts = [x.jp];   // the options are Chinese
      }
    } else if (x.t === 'order') {
      const parts = Array.isArray(x.parts) ? x.parts.map(s => String(s).trim()) : [];
      if (parts.length !== 4 || new Set(parts).size !== 4 || parts.some(p => !p)) P('order needs 4 distinct parts');
      if (!Number.isInteger(x.star) || x.star < 0 || x.star > 3) P('star must be 0–3 (the index of the ★ part)');
      if (typeof x.pre !== 'string' || typeof x.post !== 'string') P('order needs pre and post (either may be empty)');
      else if (!/[。！？]$/.test(x.post || parts[3] || '')) W('sentence should end with 。');
      try { const q = makeGrammarQuestion(g); if (!q || q.custom !== 'g-order') P('排序 question did not build');
        const q2 = makeGrammarQuestion(g, { forceFmt: 'g-choice' }); if (!q2 || !q2.options || q2.options.length !== 4) P('★ question did not build'); } catch (e) { P('builder error (order) ' + e.message); }
      texts = [(x.pre || '') + parts.join('') + (x.post || '')];
    } else if (x.t === 'conj') {
      const jp = String(x.jp || ''); if ((jp.match(/\\{V\\}/g) || []).length !== 1) P('conj needs exactly one {V}');
      if (!DATA.VOCAB.some(v => jaPlain(v.w) === x.v)) P('verb not in the word bank: ' + x.v);
      if (!['5', '1', 'k', 's'].includes(x.g)) P('g must be 5, 1, k or s');
      const ans = JConj.conjVerb(x.v, x.g, x.f);   // an unknown form conjugates to nothing
      if (!ans || JConj.normJa(ans) !== JConj.normJa(x.a || '')) P(`${x.v} (${x.f}) conjugates to ${ans || '(nothing: unknown form?)'}, not ${x.a}`);
      try { if (!makeGrammarQuestion(g)) P('變化 question did not build (it needs three distractors)'); } catch (e) { P('builder error (conj) ' + e.message); }
      texts = [jp.replace('{V}', x.a || '')];
    }
    const bare = new Set(); texts.filter(Boolean).forEach(t => bareOf(t).forEach(w => bare.add(w)));
    if (bare.size) (strict(u.lv) ? P : W)('kanji without furigana: ' + [...bare].join(' '));
  });
  if (X) {   // the unit file as a whole
    const P = (m) => bad.push([X.unit.id, m]); const mine = cands.filter(x => x.u === X.unit.id); const n = (t) => mine.filter(x => x.t === t).length;
    if (mine.length !== cands.length) P('items of another unit in the file');
    X.points.forEach(p => { const k = mine.filter(x => x.t === 'choice' && x.pt === p).length; if (k < 3) P(`${k} choice items for ${p} (needs 3)`); });
    if (n('meaning') < 5) P(`${n('meaning')} meaning items (needs 5)`); if (n('order') < 5) P(`${n('order')} order items (needs 5)`);
    if (!String(X.unit.desc || '').trim()) P('unit needs desc');
    if (!X.lesson.formula || !X.lesson.overview) P('lesson needs formula and overview');
    const S = X.lesson.sections || []; if (S.length < 3 || S.length > 5) P(`${S.length} lesson sections (needs 3–5)`);
    S.forEach((s, i) => {
      if (!s.h || !s.rule || !(s.points || []).length) P(`section ${i} needs h, rule and points`);
      const ex = s.ex || []; if (ex.length < 2 || ex.some(e => !e.jp || !e.zh)) P(`section ${i} needs two examples with jp and zh`);
      const bb = new Set(); ex.forEach(e => bareOf(e.jp).forEach(w => bb.add(w))); if (bb.size) P(`section ${i} example kanji without furigana: ${[...bb].join(' ')}`);
      if (!mine.some(x => x.sec === i)) P(`section ${i} has no items`);
    });
  }
  return JSON.stringify({ bad, warn, n: cands.length }); })(%s, %s)""" % (json.dumps(cands, ensure_ascii=False), json.dumps(unit_file, ensure_ascii=False))
try:
    with Browser() as b:
        r = json.loads(b.run([("nav", f"http://127.0.0.1:{port}/"), ("wait", "typeof REG === 'object' && REG.grammar && REG.grammar.length > 0 && typeof makeGrammarQuestion === 'function'"), ("eval", JS)], timeout=300)[-1])
finally:
    srv.terminate()
for id_, msg in r["warn"]: print("warn", id_, msg)
for id_, msg in r["bad"]: print("FAIL", id_, msg)
print(f"{r['n']} items, {len(r['bad'])} problems, {len(r['warn'])} warnings")
sys.exit(1 if r["bad"] else 0)
