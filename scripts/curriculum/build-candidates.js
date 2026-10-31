// Candidate lists for the N3–N1 curriculum outline: every Waller row and grammar point per level, marked against the app's
// own words and kanji and against lower levels (docs/superpowers/plans/2026-10-31-curriculum-outline.md, Task 3).
// usage: node scripts/curriculum/build-candidates.js   — writes curriculum/candidates/
const fs = require('fs'); const path = require('path');
const { spellings, cleanReading, isKana, buildAppIndex, matchWord, grammarKey } = require('./match.js');

const LV = ['N5', 'N4', 'N3', 'N2', 'N1'];   // lowest first: a word or point listed twice belongs to the first level that lists it
const num = (L) => Number(L.slice(1));

function loadSources(dir) {
  const read = (rel) => fs.readFileSync(path.join(dir, rel), 'utf8').split(/\r?\n/).filter(Boolean).slice(1);
  const tsv = (rel, keys) => read(rel).map(l => Object.fromEntries(l.split('\t').map((v, i) => [keys[i], v])));
  const out = { vocab: {}, kanji: {}, wallerGrammar: {}, openGrammar: {} };
  for (const L of [5, 4, 3, 2, 1]) {
    out.vocab[L] = read(`waller/n${L}_vocab.csv`).map(l => { const i = l.indexOf(','); return [l.slice(0, i), l.slice(i + 1)]; });
    out.kanji[L] = read(`waller/n${L}_kanji.csv`).map(l => l.trim()).filter(Boolean);
  }
  for (const L of [3, 2, 1]) {
    out.wallerGrammar[L] = tsv(`waller/grammar-n${L}.tsv`, ['id', 'pattern']);
    out.openGrammar[L] = tsv(`openjlpt/grammar-n${L}.tsv`, ['id', 'pattern', 'level']);
  }
  return out;
}
function loadData(repoDir) { return new Function(fs.readFileSync(path.join(repoDir, 'data.js'), 'utf8') + ';return DATA;')(); }

function buildCandidates(sources, DATA) {
  const index = buildAppIndex(DATA.VOCAB.map(v => ({ id: v.id, w: v.w, r: v.r, lv: v.lv })));
  const appWord = new Map(DATA.VOCAB.map(v => [v.id, v]));
  const appKanji = new Map(DATA.KANJI.map(k => [k.k, k.lv]));
  const out = {}; const seenWord = new Map(); const seenKanji = new Map(); const seenPoint = new Map();
  for (const L of LV) {
    const words = (sources.vocab[num(L)] || []).map(([w0, r0]) => {
      const w = spellings(w0)[0] || w0; const r = cleanReading(r0) || (isKana(w) ? w : '');
      const key = w.replace(/する$/, '');
      const m = matchWord(index, w0, r0);
      const app = m.app && { id: m.app.id, lv: m.app.lv, w: appWord.get(m.app.id).w, r: appWord.get(m.app.id).r };
      let x;
      if (m.status === 'in-app') x = { w, r, status: 'in-app', app };
      else if (seenWord.has(key)) x = { w, r, status: 'dup', dupOf: seenWord.get(key) };
      else if (m.status === 'variant') x = { w, r, status: 'variant', app };
      else x = { w, r, status: 'new' };
      if (!seenWord.has(key)) seenWord.set(key, L);
      return x;
    });
    const kanji = (sources.kanji[num(L)] || []).map(k => {
      const x = appKanji.has(k) ? { k, status: 'in-app', appLv: appKanji.get(k) } : seenKanji.has(k) ? { k, status: 'dup', dupOf: seenKanji.get(k) } : { k, status: 'new' };
      if (!seenKanji.has(k)) seenKanji.set(k, L);
      return x;
    });
    out[L] = { level: L, words, kanji };
    if (!sources.wallerGrammar[num(L)]) continue;
    // one entry per key and level, in list order (Waller's first, then OpenJLPT's), with every source that lists it
    const points = new Map();
    const add = (src, p) => { const key = grammarKey(p.pattern); if (!key) return;
      const e = points.get(key) || points.set(key, { p: p.pattern, key, src: [], ids: {} }).get(key);
      if (!e.src.includes(src)) e.src.push(src); e.ids[src] = e.ids[src] || p.id; };
    sources.wallerGrammar[num(L)].forEach(p => add('waller', p));
    (sources.openGrammar[num(L)] || []).forEach(p => add('openjlpt', p));
    out[L].grammar = [...points.values()].map(e => {
      const x = seenPoint.has(e.key) ? Object.assign(e, { status: 'dup', dupOf: seenPoint.get(e.key) }) : Object.assign(e, { status: 'new' });
      if (!seenPoint.has(e.key)) seenPoint.set(e.key, L);
      return x;
    });
  }
  return out;
}

function reportMarkdown(cands, DATA) {
  const c = (arr, st) => arr.filter(x => x.status === st).length;
  const out = ['# 課程大綱候選清單報表', '', '由 `node scripts/curriculum/build-candidates.js` 產生；來源見 `curriculum/sources/SOURCES.md`。', '',
    '| 級 | Waller 單字 | app 已有 | 清單內重複 | 新的字 | 待確認 | Waller 漢字 | app 已有 | 新的漢字 |', '|---|---|---|---|---|---|---|---|---|'];
  for (const L of LV) { const x = cands[L]; out.push(`| ${L} | ${x.words.length} | ${c(x.words, 'in-app')} | ${c(x.words, 'dup')} | ${c(x.words, 'new')} | ${c(x.words, 'variant')} | ${x.kanji.length} | ${c(x.kanji, 'in-app')} | ${c(x.kanji, 'new')} |`); }
  out.push('', '## 待確認：寫法或讀音跟 app 的字不同', '', '同一個字只是寫法不同，大綱裡就放進 dropped；是不同的字，就照新字分主題。', '');
  for (const L of LV) {
    const v = cands[L].words.filter(x => x.status === 'variant');
    if (v.length) out.push(`**${L}**（${v.length}）：` + v.map(x => `${x.w}（${x.r}）↔ ${x.app.w}（${x.app.r}，${x.app.id}）`).join('、'), '');
  }
  // kanji the app's own words use that its kanji table lacks, by Waller level
  const levelOf = {}; for (const L of LV) cands[L].kanji.forEach(x => { if (!(x.k in levelOf)) levelOf[x.k] = L; });
  const table = new Set(DATA.KANJI.map(k => k.k)); const used = new Set();
  DATA.VOCAB.forEach(v => { for (const ch of v.w) if (/[一-鿿]/.test(ch) && !table.has(ch)) used.add(ch); });
  const by = {}; used.forEach(ch => { const l = levelOf[ch] || '清單外'; by[l] = (by[l] || 0) + 1; });
  out.push('## app 的字用到、漢字表沒有的漢字', '', `共 ${used.size} 個：` + ['N5', 'N4', 'N3', 'N2', 'N1', '清單外'].filter(l => by[l]).map(l => `${l} ${by[l]}`).join('、'), '');
  out.push('## 文法點', '', '| 級 | Waller | OpenJLPT | 兩邊都有 | 只有 Waller | 只有 OpenJLPT | 更低一級已經有 |', '|---|---|---|---|---|---|---|');
  for (const L of ['N3', 'N2', 'N1']) {
    const g = cands[L].grammar; const has = (s) => g.filter(x => x.src.includes(s)).length;
    out.push(`| ${L} | ${has('waller')} | ${has('openjlpt')} | ${g.filter(x => x.src.length === 2).length} | ${g.filter(x => x.src.length === 1 && x.src[0] === 'waller').length} | ${g.filter(x => x.src.length === 1 && x.src[0] === 'openjlpt').length} | ${c(g, 'dup')} |`);
  }
  const moved = ['N3', 'N2', 'N1'].flatMap(L => cands[L].grammar.filter(x => x.status === 'dup').map(x => `${x.p}（${L} → 算 ${x.dupOf}）`));
  out.push('', `兩個來源等級不同、照低的那一級算的（${moved.length}）：` + (moved.join('、') || '無'), '');
  return out.join('\n');
}

function appGrammarMarkdown(DATA) {
  const out = ['# app 現有的文法（m1–m18）', '', '判斷 N3–N1 的文法點「app 已經教了」時對照這份。由 `node scripts/curriculum/build-candidates.js` 產生。', ''];
  for (const u of DATA.UNITS) {
    out.push(`## ${u.id} ${u.short}（${u.lv}）`, '', u.title, '');
    for (const s of ((DATA.LESSONS[u.id] || {}).sections || [])) out.push(`- ${s.h}${s.rule ? `｜${s.rule}` : ''}`);
    const pts = [...new Set(DATA.GRAMMAR.filter(g => g.u === u.id).map(g => g.pt).filter(Boolean))];
    out.push('', `題目的考點：${pts.join('、')}`, '');
  }
  return out.join('\n');
}

// one entry per line, so diffs show which words changed
function toJson(c) {
  const list = (arr) => '[\n' + arr.map(x => '  ' + JSON.stringify(x)).join(',\n') + '\n]';
  return `{"level": ${JSON.stringify(c.level)},\n"words": ${list(c.words)},\n"kanji": ${list(c.kanji)}` + (c.grammar ? `,\n"grammar": ${list(c.grammar)}` : '') + '\n}\n';
}

if (require.main === module) {
  const root = path.join(__dirname, '..', '..'); const dir = path.join(root, 'curriculum', 'candidates');
  const DATA = loadData(root); const cands = buildCandidates(loadSources(path.join(root, 'curriculum', 'sources')), DATA);
  fs.mkdirSync(dir, { recursive: true });
  for (const L of LV) fs.writeFileSync(path.join(dir, `${L.toLowerCase()}.json`), toJson(cands[L]));
  fs.writeFileSync(path.join(dir, 'REPORT.md'), reportMarkdown(cands, DATA));
  fs.writeFileSync(path.join(dir, 'app-grammar.md'), appGrammarMarkdown(DATA));
  console.log(LV.map(L => `${L}: ${cands[L].words.filter(x => x.status === 'new').length} new words, ${cands[L].kanji.filter(x => x.status === 'new').length} new kanji` + (cands[L].grammar ? `, ${cands[L].grammar.filter(x => x.status === 'new').length} grammar points` : '')).join('\n'));
}

module.exports = { loadSources, loadData, buildCandidates, reportMarkdown, appGrammarMarkdown };
