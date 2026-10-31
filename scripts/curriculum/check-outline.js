// Checks the curated outline files (curriculum/n3.json, n2.json, n1.json, gaps-n5n4.json) against the candidate lists
// (docs/superpowers/plans/2026-10-31-curriculum-outline.md, Task 4; the file format is in the plan's Global Constraints).
// usage: node scripts/curriculum/check-outline.js   — prints a summary per level and every problem; exit 1 when there are problems
const fs = require('fs'); const path = require('path');
const { buildAppIndex, matchWord, cleanReading } = require('./match.js');
const { loadSources, loadData, preOutline, buildCandidates, homographs } = require('./build-candidates.js');

const LEVELS = ['N3', 'N2', 'N1'];
const len = (s) => [...String(s || '')].length;
const tally = (list) => { const m = new Map(); list.forEach(x => m.set(x, (m.get(x) || 0) + 1)); return m; };

// the level's kanji in teaching order: the ones its words use most first, ties in list order
function kanjiOrder(words, kanji) {
  const uses = (k) => words.filter(([w]) => String(w).includes(k)).length;
  return kanji.map((k, i) => [k, uses(k), i]).sort((a, b) => b[1] - a[1] || a[2] - b[2]).map(([k]) => k);
}

function checkOutline({ outlines = {}, gaps = null, cands, DATA }) {
  DATA = preOutline(DATA);
  const problems = []; const P = (s) => problems.push(s);
  const index = buildAppIndex(DATA.VOCAB.map(v => ({ id: v.id, w: v.w, r: v.r, lv: v.lv })));
  // a word is a spelling with a reading: another reading of a spelling is a word of its own (user, 2026-10-31: 同形異讀都收)
  const wr = (w, r) => `${w}（${r}）`;
  const owner = new Map();   // word → the level that holds it
  const claim = (w, r, L) => { const k = wr(w, r); if (owner.has(k) && owner.get(k) !== L) P(`word in two levels: ${k}`); else owner.set(k, L); };
  const wanted = (L) => cands[L].words.filter(x => x.status === 'new' || x.status === 'variant');
  const homo = homographs(cands);
  // words kept per level (themes, added, gap words), and the app's own: another reading kept by the app or a lower level is placed
  const kept = { N5: [], N4: [], N3: [], N2: [], N1: [] };
  if (gaps) ['N5', 'N4'].forEach(L => { const g = gaps[L] || {}; kept[L] = (g.words || []).concat(g.added || []).map(x => wr(x.w, x.r)); });
  LEVELS.forEach(L => { const o = outlines[L]; if (o) kept[L] = o.themes.flatMap(t => t.words.map(([w, r]) => wr(w, r))).concat((o.added || []).map(x => wr(x.w, x.r))); });
  const keptUpTo = (L) => { const order = ['N5', 'N4', 'N3', 'N2', 'N1']; const out = new Set(DATA.VOCAB.map(v => wr(v.w, v.r)));
    order.slice(0, order.indexOf(L) + 1).forEach(x => kept[x].forEach(p => out.add(p))); return out; };
  // every candidate spelling and every other reading of one (a homograph) sits in a theme or is dropped, each word once
  const placed = (L, want, listed, extra = new Set(), noun = 'word') => {
    const wantW = new Set(want.map(x => x.w)); const pairs = new Set(listed.map(x => wr(x.w, x.r)).concat([...keptUpTo(L)]));
    const others = homo.filter(h => h.L === L); const otherPairs = new Set(others.map(h => wr(h.w, h.r)));
    want.forEach(x => { if (!pairs.has(wr(x.w, x.r))) P(`${L} ${noun} missing: ${wr(x.w, x.r)}`); });
    others.forEach(h => { if (!pairs.has(wr(h.w, h.r))) P(`${L} ${noun === 'word' ? 'homograph' : 'gap homograph'} missing: ${wr(h.w, h.r)}`); });
    tally(listed.map(x => wr(x.w, x.r))).forEach((k, p) => { if (k > 1) P(`${L} ${noun} twice: ${p}`); });
    new Set(listed.filter(x => !wantW.has(x.w) && !extra.has(x.w) && !otherPairs.has(wr(x.w, x.r))).map(x => x.w)).forEach(w => P(`${L} ${noun} not a candidate: ${w}`));
  };
  const meaning = (L, w, m) => { if (!m || len(m) > 12) P(`${L} word without meaning: ${w}`); };
  // a row dropped as the app's cites app words by id; one of the same spelling that reads otherwise is another word (rule 6)
  const byId = new Map(DATA.VOCAB.map(v => [v.id, v]));
  const hira = (r) => cleanReading(r).replace(/[ァ-ヶ]/g, c => String.fromCharCode(c.charCodeAt(0) - 0x60)).replace(/する$/, '');
  const dropped = (L, x, noun) => {
    if (!x.why) return P(`${L} dropped without reason: ${x.w}`);
    if (x.why.includes('app 已有')) (x.why.match(/[A-Za-z0-9]+-[A-Za-z0-9]+/g) || []).map(id => byId.get(id)).filter(Boolean).forEach(v => {
      if (v.w.replace(/する$/, '') === x.w.replace(/する$/, '') && hira(v.r) !== hira(x.r)) P(`${L} ${noun} dropped as in app, but ${v.id} reads ${v.r}: ${wr(x.w, x.r)}`);
    });
  };

  if (gaps) for (const L of ['N5', 'N4']) {
    const g = gaps[L] || { words: [], dropped: [] };
    const themes = new Set(((DATA.THEMES || {})[L] || []).map(t => t.c));
    placed(L, wanted(L), g.words.concat(g.dropped), new Set(), 'gap word');
    // gap words go to a theme of their own level
    g.words.forEach(x => { if (!themes.has(x.c)) P(`${L} gap theme unknown: ${x.c}`); meaning(L, x.w, x.m); claim(x.w, x.r, L); });
    g.dropped.forEach(x => dropped(L, x, 'gap word'));
    // a word the list misspells or garbles comes back corrected as an added word, with its own theme
    (g.added || []).forEach(x => {
      if (!themes.has(x.c)) P(`${L} gap theme unknown: ${x.c}`); meaning(L, x.w, x.m); claim(x.w, x.r, L);
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
    placed(L, wanted(L), words.concat(o.dropped || []), new Set(added.keys()));
    words.forEach(x => { meaning(L, x.w, x.m); claim(x.w, x.r, L); });
    added.forEach(x => {
      if (matchWord(index, x.w, x.r).status === 'in-app') P(`word already in app: ${x.w}`);
      if (!words.some(y => y.w === x.w)) P(`${L} added word not in a theme: ${x.w}`);
      if (!x.why) P(`${L} added without reason: ${x.w}`);
    });
    (o.dropped || []).forEach(x => dropped(L, x, 'word'));
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
