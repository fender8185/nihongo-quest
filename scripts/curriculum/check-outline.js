// Checks the curated outline files (curriculum/n3.json, n2.json, n1.json, gaps-n5n4.json) against the candidate lists
// (docs/superpowers/plans/2026-10-31-curriculum-outline.md, Task 4; the file format is in the plan's Global Constraints).
// usage: node scripts/curriculum/check-outline.js   — prints a summary per level and every problem; exit 1 when there are problems
const fs = require('fs'); const path = require('path');
const { buildAppIndex, matchWord } = require('./match.js');
const { loadSources, loadData, buildCandidates } = require('./build-candidates.js');

const LEVELS = ['N3', 'N2', 'N1'];
const len = (s) => [...String(s || '')].length;
const tally = (list) => { const m = new Map(); list.forEach(x => m.set(x, (m.get(x) || 0) + 1)); return m; };

// the level's kanji in teaching order: the ones its words use most first, ties in list order
function kanjiOrder(words, kanji) {
  const uses = (k) => words.filter(([w]) => String(w).includes(k)).length;
  return kanji.map((k, i) => [k, uses(k), i]).sort((a, b) => b[1] - a[1] || a[2] - b[2]).map(([k]) => k);
}

function checkOutline({ outlines = {}, gaps = null, cands, DATA }) {
  const problems = []; const P = (s) => problems.push(s);
  const index = buildAppIndex(DATA.VOCAB.map(v => ({ id: v.id, w: v.w, r: v.r, lv: v.lv })));
  const owner = new Map();   // word → the level that holds it
  const claim = (w, L) => { if (owner.has(w) && owner.get(w) !== L) P(`word in two levels: ${w}`); else owner.set(w, L); };
  const wanted = (L) => cands[L].words.filter(x => x.status === 'new' || x.status === 'variant').map(x => x.w);
  const placed = (L, want, listed, extra = new Set(), noun = 'word') => {
    const n = tally(listed);
    want.forEach(w => { if (!n.has(w)) P(`${L} ${noun} missing: ${w}`); });
    n.forEach((k, w) => { if (k > 1) P(`${L} ${noun} twice: ${w}`); if (!want.includes(w) && !extra.has(w)) P(`${L} ${noun} not a candidate: ${w}`); });
  };
  const meaning = (L, w, m) => { if (!m || len(m) > 12) P(`${L} word without meaning: ${w}`); };

  if (gaps) for (const L of ['N5', 'N4']) {
    const g = gaps[L] || { words: [], dropped: [] };
    const themes = new Set(((DATA.THEMES || {})[L] || []).map(t => t.c));
    placed(L, wanted(L), g.words.map(x => x.w).concat(g.dropped.map(x => x.w)), new Set(), 'gap word');
    // gap words go to a theme of their own level
    g.words.forEach(x => { if (!themes.has(x.c)) P(`${L} gap theme unknown: ${x.c}`); meaning(L, x.w, x.m); claim(x.w, L); });
    g.dropped.forEach(x => { if (!x.why) P(`${L} dropped without reason: ${x.w}`); });
    // a word the list misspells or garbles comes back corrected as an added word, with its own theme
    (g.added || []).forEach(x => {
      if (!themes.has(x.c)) P(`${L} gap theme unknown: ${x.c}`); meaning(L, x.w, x.m); claim(x.w, L);
      if (matchWord(index, x.w, x.r).status === 'in-app') P(`word already in app: ${x.w}`);
      if (!x.why) P(`${L} added without reason: ${x.w}`);
    });
  }

  const summary = {}; const units = new Set(DATA.UNITS.map(u => u.id));
  let next = 19;   // course units m1–m18 exist; the N3 outline starts at m19 and the levels run on
  for (const L of LEVELS) {
    const o = outlines[L]; if (!o) continue;
    const c = cands[L];
    const words = o.themes.flatMap(t => t.words.map(([w, r, m]) => ({ w, r, m, c: t.c })));
    const added = new Map((o.added || []).map(x => [x.w, x]));
    placed(L, wanted(L), words.map(x => x.w).concat((o.dropped || []).map(x => x.w)), new Set(added.keys()));
    words.forEach(x => { meaning(L, x.w, x.m); claim(x.w, L); });
    added.forEach(x => {
      if (matchWord(index, x.w, x.r).status === 'in-app') P(`word already in app: ${x.w}`);
      if (!words.some(y => y.w === x.w)) P(`${L} added word not in a theme: ${x.w}`);
      if (!x.why) P(`${L} added without reason: ${x.w}`);
    });
    (o.dropped || []).forEach(x => { if (!x.why) P(`${L} dropped without reason: ${x.w}`); });
    if (o.themes.length < 15 || o.themes.length > 20) P(`${L} themes: ${o.themes.length} (need 15–20)`);
    o.themes.forEach(t => { if (t.words.length < 20) P(`${L} theme too small: ${t.c}`); if (!t.c || !t.desc) P(`${L} theme without name or desc: ${t.c || '?'}`); });

    const fresh = c.kanji.filter(x => x.status === 'new').map(x => x.k);
    if (fresh.length !== o.kanji.length || !fresh.every(k => o.kanji.includes(k))) P(`${L} kanji set differs`);
    else if (kanjiOrder(words.map(x => [x.w, x.r, x.m]), fresh).join('') !== o.kanji.join('')) P(`${L} kanji order differs`);

    for (const u of o.units) {
      if (u.id !== `m${next}`) { P(`unit ids not consecutive at ${u.id}`); next = Number(String(u.id).slice(1)) || next; }
      next++;
      if (u.points.length < 6 || u.points.length > 10) P(`${L} unit ${u.id} has ${u.points.length} points (need 6–10)`);
      if (!u.short || !u.title) P(`${L} unit ${u.id} without title`);
      u.points.forEach(p => { if (!p.p || !p.m || len(p.m) > 20) P(`${L} point without meaning: ${p.p}`); });
    }
    // every new grammar key of the level sits in exactly one place: a unit's point, covered (the app teaches it) or moved
    const want = new Set(c.grammar.filter(x => x.status === 'new').map(x => x.key));
    const movedIn = new Set(LEVELS.filter(x => x !== L && outlines[x]).flatMap(x => (outlines[x].moved || []).filter(m => m.to === L).flatMap(m => m.keys)));
    const n = tally([...o.units.flatMap(u => u.points.flatMap(p => p.keys || [])), ...(o.covered || []).flatMap(x => x.keys), ...(o.moved || []).flatMap(x => x.keys)]);
    want.forEach(k => { if (!n.has(k)) P(`${L} grammar missing: ${k}`); });
    n.forEach((k, key) => { if (k > 1) P(`${L} grammar twice: ${key}`); if (!want.has(key) && !movedIn.has(key)) P(`${L} grammar not a candidate: ${key}`); });
    (o.covered || []).forEach(x => { if (!units.has(x.by)) P(`${L} covered by unknown unit: ${x.by}`); if (!x.why) P(`${L} covered without reason: ${x.p}`); });
    (o.moved || []).forEach(x => { if (!LEVELS.includes(x.to) || x.to === L) P(`${L} moved to an unknown level: ${x.p}`); if (!x.why) P(`${L} moved without reason: ${x.p}`); });

    const phases = o.phases || []; const most = L === 'N1' ? 3 : 2;
    if (phases.length < 2 || phases.length > most) P(`${L} phases: ${phases.length} (need ${most === 2 ? '2' : '2–3'})`);
    if (phases.some(p => !p.title || !p.units.length)) P(`${L} phases: a phase without title or units`);
    if (phases.flatMap(p => p.units).join() !== o.units.map(u => u.id).join()) P(`${L} phases: units out of order or missing`);

    summary[L] = { themes: o.themes.length, words: words.length, dropped: (o.dropped || []).length, added: added.size, kanji: o.kanji.length,
      units: o.units.length, points: o.units.reduce((s, u) => s + u.points.length, 0), covered: (o.covered || []).length, moved: (o.moved || []).length };
  }
  // a moved key has to land in its level's units (checked once that level's outline exists)
  for (const L of LEVELS) for (const m of ((outlines[L] || {}).moved || [])) {
    const to = outlines[m.to]; if (!to) continue;
    const there = new Set(to.units.flatMap(u => u.points.flatMap(p => p.keys || [])));
    m.keys.forEach(k => { if (!there.has(k)) P(`${L} moved key not in ${m.to}: ${k}`); });
  }
  return { problems, summary };
}

if (require.main === module) {
  const root = path.join(__dirname, '..', '..');
  const read = (rel) => { const p = path.join(root, 'curriculum', rel); return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : null; };
  const outlines = {}; LEVELS.forEach(L => { const o = read(`${L.toLowerCase()}.json`); if (o) outlines[L] = o; });
  const DATA = loadData(root);
  const { problems, summary } = checkOutline({ outlines, gaps: read('gaps-n5n4.json'), cands: buildCandidates(loadSources(path.join(root, 'curriculum', 'sources')), DATA), DATA });
  Object.entries(summary).forEach(([L, s]) => console.log(L, JSON.stringify(s)));
  problems.forEach(p => console.log('PROBLEM ' + p));
  console.log(`${problems.length} problems`);
  process.exit(problems.length ? 1 : 0);
}

module.exports = { kanjiOrder, checkOutline };
