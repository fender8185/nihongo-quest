const test = require('node:test'); const assert = require('node:assert/strict');
const fs = require('node:fs'); const path = require('node:path'); const crypto = require('node:crypto');
const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'curriculum', 'sources');

// ---- source snapshots (Task 1) ----
const lines = (rel) => fs.readFileSync(path.join(SRC, rel), 'utf8').split(/\r?\n/).filter(Boolean);
// data rows per level of a per-level file, `{L}` standing for the level number; the first line is the header
const rows = (pattern, levels = [5, 4, 3, 2, 1]) => Object.fromEntries(levels.map(L => [L, lines(pattern.replace('{L}', L)).length - 1]));
const tsv = (rel) => { const [head, ...body] = lines(rel); const keys = head.split('\t'); return body.map(l => Object.fromEntries(l.split('\t').map((v, i) => [keys[i], v]))); };

test('sources: Waller row counts', () => {
  assert.deepEqual(rows('waller/n{L}_vocab.csv'), { 5: 700, 4: 649, 3: 1835, 2: 1846, 1: 3475 });
  assert.deepEqual(rows('waller/n{L}_kanji.csv'), { 5: 79, 4: 166, 3: 367, 2: 367, 1: 1232 });
});
test('sources: grammar lists', () => {
  assert.deepEqual(rows('openjlpt/grammar-n{L}.tsv', [3, 2, 1]), { 3: 101, 2: 123, 1: 123 });
  for (const L of [3, 2, 1]) {
    const g = tsv(`waller/grammar-n${L}.tsv`);
    assert.ok(g.length >= 50, `N${L}: ${g.length} Waller grammar points`);
    assert.equal(new Set(g.map(x => x.id)).size, g.length);
    assert.ok(g.every(x => x.pattern.trim()));
  }
});
test('sources: files match MANIFEST.sha256', () => {
  const entries = lines('MANIFEST.sha256').map(l => l.split(/\s+\*?/));
  assert.ok(entries.length >= 16);
  for (const [sum, file] of entries) assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(SRC, file))).digest('hex'), sum, file);
});

// ---- word matching and grammar keys (Task 2) ----
const M = () => require('../scripts/curriculum/match.js');
const fakeApp = () => M().buildAppIndex([{ id: 'a', w: '終わる', r: 'おわる', lv: 'N5' }, { id: 'b', w: '結婚する', r: 'けっこんする', lv: 'N4' },
  { id: 'c', w: '上手', r: 'じょうず', lv: 'N5' }, { id: 'd', w: 'ご飯', r: 'ごはん', lv: 'PRE_N5' },
  { id: 'e', w: '金持ち', r: 'かねもち', lv: 'N4' }, { id: 'f', w: '分かる', r: 'わかる', lv: 'N5' }, { id: 'g', w: 'たばこ', r: 'たばこ', lv: 'N5' }]);

test('match: okurigana variant (終る / 終わる) is a variant, not the same word', () => assert.equal(M().matchWord(fakeApp(), '終る', 'おわる').status, 'variant'));
test('match: a noun matches the app\'s する verb (結婚 / 結婚する)', () => assert.equal(M().matchWord(fakeApp(), '結婚', 'けっこん').status, 'in-app'));
test('match: same spelling with another reading (上手 うわて / じょうず) is a variant', () => assert.equal(M().matchWord(fakeApp(), '上手', 'うわて').status, 'variant'));
test('match: a leading 御 matches ご (御飯 / ご飯)', () => assert.equal(M().matchWord(fakeApp(), '御飯', 'ごはん').status, 'in-app'));
test('match: an optional お prefix (お・金持ち おかねもち / 金持ち)', () => assert.equal(M().matchWord(fakeApp(), 'お・金持ち', 'おかねもち').status, 'in-app'));
test('match: a kana word equal to an app reading (わかる / 分かる) needs a person: it may be another word', () => assert.equal(M().matchWord(fakeApp(), 'わかる', 'わかる').status, 'variant'));
test('match: a kanji word the app writes in kana (煙草 / たばこ) needs a person: it may be another word', () => assert.equal(M().matchWord(fakeApp(), '煙草', 'たばこ').status, 'variant'));
test('match: a homophone of an app kana word is not taken for it (底 そこ / そこ, 灰 はい / はい)', () => {
  const ix = M().buildAppIndex([{ id: 'x', w: 'そこ', r: 'そこ', lv: 'N5' }, { id: 'y', w: 'はい', r: 'はい', lv: 'N5' }]);
  assert.notEqual(M().matchWord(ix, '底', 'そこ').status, 'in-app'); assert.notEqual(M().matchWord(ix, '灰', 'はい').status, 'in-app');
});
test('match: a word the app lacks has no match, and its app id is reported when it has one', () => {
  assert.equal(M().matchWord(fakeApp(), 'おいでになる', 'おいでになる').status, null);
  assert.deepEqual(M().matchWord(fakeApp(), '結婚', 'けっこん').app, { id: 'b', lv: 'N4' });
});
test('spellings: a leading お is dropped only when marked with ・', () => {
  assert.ok(M().spellings('おいでになる').includes('おいでになる') && !M().spellings('おいでになる').includes('いでになる'));
  assert.deepEqual(M().spellings('お・金持ち'), ['お金持ち', '金持ち']);
  assert.deepEqual(M().spellings('あたたか(い)'), ['あたたかい', 'あたたか']);
});
test('cleanReading: keeps optional okurigana, drops Waller\'s full-width notes', () => {
  assert.equal(M().cleanReading('あたたか(い)'), 'あたたかい');
  assert.equal(M().cleanReading('（感）'), '');
  assert.equal(M().cleanReading('（可能。出現。'), '');
});
test('grammarKey: tildes, spaces and bracketed notes do not matter', () => {
  assert.equal(M().grammarKey('～ば～ほど'), M().grammarKey('〜ば〜ほど'));
  assert.equal(M().grammarKey('～ば～ほど'), 'ばほど');
  assert.equal(M().grammarKey('すぎない（過ぎない）'), 'すぎない');
  assert.equal(M().grammarKey('～からなる(成る)'), 'からなる');
  assert.equal(M().grammarKey('N+ばかり'), 'ばかり');
});

// ---- candidates (Task 3) ----
const B = () => require('../scripts/curriculum/build-candidates.js');
const LEVELS = ['N5', 'N4', 'N3', 'N2', 'N1'];
let REAL = null;
const real = () => REAL || (REAL = B().buildCandidates(B().loadSources(SRC), B().loadData(ROOT)));
const count = (C, L, kind, st) => C[L][kind].filter(x => x.status === st).length;
const emptyData = () => ({ VOCAB: [], KANJI: [], GRAMMAR: [], UNITS: [], LESSONS: {} });
const fakeSources = (over) => Object.assign({ vocab: { 5: [], 4: [], 3: [], 2: [], 1: [] }, kanji: { 5: [], 4: [], 3: [], 2: [], 1: [] },
  wallerGrammar: { 3: [], 2: [], 1: [] }, openGrammar: { 3: [], 2: [], 1: [] } }, over);

test('candidates: new kanji per level leave out the app\'s kanji table', () => {
  const C = real();
  assert.deepEqual([count(C, 'N3', 'kanji', 'new'), count(C, 'N2', 'kanji', 'new'), count(C, 'N1', 'kanji', 'new')], [295, 350, 1227]);
  assert.equal(count(C, 'N3', 'kanji', 'in-app'), 72);
});
test('candidates: every Waller row is kept, and the new-word counts are in the measured range', () => {
  const C = real(); const ROWS = { N5: 700, N4: 649, N3: 1835, N2: 1846, N1: 3475 };
  for (const L of LEVELS) assert.equal(C[L].words.length, ROWS[L], L);
  const n3 = count(C, 'N3', 'words', 'new'), n2 = count(C, 'N2', 'words', 'new'), n1 = count(C, 'N1', 'words', 'new');
  assert.ok(n3 >= 1350 && n3 <= 1500, `N3 ${n3}`); assert.ok(n2 >= 1600 && n2 <= 1750, `N2 ${n2}`); assert.ok(n1 >= 3000 && n1 <= 3200, `N1 ${n1}`);
});
test('candidates: a spelling is new in one level only', () => {
  const all = LEVELS.flatMap(L => real()[L].words.filter(x => x.status === 'new').map(x => x.w));
  assert.equal(new Set(all).size, all.length);
});
test('candidates: a word listed again higher up, or twice in one level, is a dup of the first', () => {
  const C = B().buildCandidates(fakeSources({ vocab: { 5: [], 4: [['重箱', 'じゅうばこ']], 3: [['重箱', 'じゅうばこ'], ['重複', 'ちょうふく'], ['重複', 'ちょうふく']], 2: [], 1: [] } }), emptyData());
  assert.deepEqual(C.N3.words.map(x => [x.w, x.status, x.dupOf]), [['重箱', 'dup', 'N4'], ['重複', 'new', undefined], ['重複', 'dup', 'N3']]);
});
test('candidates: the same grammar point from both lists is one entry; one-sided points stay with their source', () => {
  const C = B().buildCandidates(fakeSources({ wallerGrammar: { 3: [{ id: '1', pattern: '～ば～ほど' }, { id: '2', pattern: '～とたん' }], 2: [], 1: [] },
    openGrammar: { 3: [{ id: 'ba-hodo', pattern: '〜ば〜ほど', level: 'N3' }, { id: 'ppoi', pattern: '〜っぽい', level: 'N3' }], 2: [], 1: [] } }), emptyData());
  assert.deepEqual(C.N3.grammar.map(x => [x.key, x.src, x.status]), [['ばほど', ['waller', 'openjlpt'], 'new'], ['とたん', ['waller'], 'new'], ['っぽい', ['openjlpt'], 'new']]);
  assert.equal(C.N5.grammar, undefined);
});
test('candidates: a grammar point listed at two levels belongs to the lower one', () => {
  const C = B().buildCandidates(fakeSources({ wallerGrammar: { 3: [], 2: [{ id: '9', pattern: '～にかけて' }], 1: [] },
    openGrammar: { 3: [{ id: 'nikakete', pattern: '〜にかけて', level: 'N3' }], 2: [], 1: [] } }), emptyData());
  assert.deepEqual(C.N3.grammar.map(x => [x.key, x.status]), [['にかけて', 'new']]);
  assert.deepEqual(C.N2.grammar.map(x => [x.key, x.status, x.dupOf]), [['にかけて', 'dup', 'N3']]);
});
test('report: per-level table, variants with their app word, the kanji the app\'s words use outside its table', () => {
  const md = B().reportMarkdown(real(), B().loadData(ROOT));
  assert.match(md, /\| N3 \| 1835 \|/);
  assert.match(md, /待確認/);
  assert.match(md, /漢字表沒有/);
});
test('app grammar: every course unit with its lesson headings', () => {
  const md = B().appGrammarMarkdown(B().loadData(ROOT));
  assert.match(md, /^## m7 /m); assert.match(md, /可能形的變法/); assert.match(md, /^## m18 /m);
});

// ---- outline checker (Task 4) ----
const CK = () => require('../scripts/curriculum/check-outline.js');
const clone = (x) => JSON.parse(JSON.stringify(x));
// a minimal outline that passes: N3 has 300 new words (15 themes × 20), kanji 乙 and 甲 (甲 used more, so it comes first),
// 12 grammar keys in two units of six; N5 and N4 have one gap candidate each
function okSet() {
  const words = Array.from({ length: 300 }, (_, i) => ({ w: `語${i}`, r: `ご${i}`, status: 'new' }));
  words[0].w = '甲乙'; words[1].w = '甲';
  const keys = Array.from({ length: 12 }, (_, i) => `g${i}`);
  const cands = {
    N5: { level: 'N5', words: [{ w: '朝寝', r: 'あさね', status: 'new' }], kanji: [] },
    N4: { level: 'N4', words: [{ w: '夜更', r: 'よふけ', status: 'variant', app: { id: 'v9', lv: 'N4', w: '夜更け', r: 'よふけ' } }], kanji: [] },
    N3: { level: 'N3', words, kanji: [{ k: '乙', status: 'new' }, { k: '甲', status: 'new' }, { k: '丙', status: 'in-app', appLv: 'N4' }],
      grammar: keys.map(k => ({ p: `〜${k}`, key: k, src: ['waller'], status: 'new' })).concat([{ p: '〜old', key: 'old', src: ['waller'], status: 'dup', dupOf: 'N4' }]) },
    N2: { level: 'N2', words: [{ w: '乙種', r: 'おつしゅ', status: 'new' }], kanji: [], grammar: [] },
    N1: { level: 'N1', words: [], kanji: [], grammar: [] }
  };
  const DATA = { VOCAB: [{ id: 'v1', w: '既存', r: 'きそん', lv: 'N4' }], KANJI: [{ k: '丙', lv: 'N4' }],
    THEMES: { N5: [{ c: '時間' }], N4: [{ c: '居家生活' }] }, UNITS: Array.from({ length: 18 }, (_, i) => ({ id: `m${i + 1}` })) };
  const point = (k) => ({ p: `〜${k}`, m: '意思', keys: [k], src: ['waller'] });
  const N3 = { level: 'N3',
    themes: Array.from({ length: 15 }, (_, t) => ({ c: `主題${t}`, desc: '說明', words: words.slice(t * 20, t * 20 + 20).map(x => [x.w, x.r, '意思']) })),
    added: [], dropped: [], kanji: ['甲', '乙'],
    phases: [{ title: '第四階段：N3 文法', units: ['m19'] }, { title: '第五階段：N3 進階與總複習', units: ['m20'] }],
    units: [{ id: 'm19', short: '一', title: '一：〜g0', points: keys.slice(0, 6).map(point) }, { id: 'm20', short: '二', title: '二：〜g6', points: keys.slice(6).map(point) }],
    covered: [], moved: [] };
  const gaps = { N5: { words: [{ w: '朝寝', r: 'あさね', m: '睡懶覺', c: '時間' }], dropped: [] }, N4: { words: [], dropped: [{ w: '夜更', r: 'よふけ', why: 'app 已有：v9' }] } };
  return { outlines: { N3 }, gaps, cands, DATA };
}
const problemsOf = (set) => CK().checkOutline(set).problems;
const has = (set, prefix) => assert.ok(problemsOf(set).some(p => p.startsWith(prefix)), `no "${prefix}" in ${JSON.stringify(problemsOf(set).slice(0, 5))}`);

test('outline: the minimal outline has no problems and a summary per level', () => {
  const r = CK().checkOutline(okSet());
  assert.deepEqual(r.problems, []);
  assert.deepEqual(r.summary.N3, { themes: 15, words: 300, dropped: 0, added: 0, kanji: 2, units: 2, points: 12, covered: 0, moved: 0 });
});
test('outline: kanjiOrder puts the kanji used most first, ties in list order', () => {
  assert.deepEqual(CK().kanjiOrder([['甲乙', 'x', 'm'], ['甲', 'x', 'm'], ['丁', 'x', 'm']], ['乙', '丁', '甲']), ['甲', '乙', '丁']);
});
test('outline 1: a candidate word in no theme and not dropped', () => { const s = okSet(); s.outlines.N3.themes[0].words.splice(5, 1); has(s, 'N3 word missing: 語5'); });
test('outline 2: a word placed twice', () => { const s = okSet(); s.outlines.N3.themes[1].words.push(['語5', 'ご5', '意思']); has(s, 'N3 word twice: 語5'); });
test('outline 3: a word that is neither a candidate nor added', () => { const s = okSet(); s.outlines.N3.themes[0].words.push(['外来', 'がいらい', '外來']); has(s, 'N3 word not a candidate: 外来'); });
test('outline 4: one word in two levels', () => {
  const s = okSet(); s.outlines.N2 = { level: 'N2', themes: [{ c: '甲', desc: '說明', words: [['語7', 'ご7', '意思'], ['乙種', 'おつしゅ', '乙種']] }], added: [{ w: '語7', r: 'ご7', m: '意思', c: '甲', why: '測試' }], dropped: [], kanji: [], phases: [], units: [], covered: [], moved: [] };
  has(s, 'word in two levels: 語7');
});
test('outline 5: an added word the app already has', () => {
  const s = okSet(); s.outlines.N3.added.push({ w: '既存', r: 'きそん', m: '既有', c: '主題0', why: '測試' }); s.outlines.N3.themes[0].words.push(['既存', 'きそん', '既有']);
  has(s, 'word already in app: 既存');
});
test('outline 6: theme count and theme size', () => {
  const s = okSet(); s.outlines.N3.themes[1].words.push(...s.outlines.N3.themes.pop().words); has(s, 'N3 themes: 14 (need 15–20)');
  const t = okSet(); t.outlines.N3.themes[1].words.push(...t.outlines.N3.themes[0].words.splice(0, 5)); has(t, 'N3 theme too small: 主題0');
});
test('outline 7: a word without a meaning, or one longer than 12 characters', () => {
  const s = okSet(); s.outlines.N3.themes[0].words[3][2] = ''; has(s, 'N3 word without meaning: 語3');
  const t = okSet(); t.outlines.N3.themes[0].words[4][2] = '一二三四五六七八九十一二三'; has(t, 'N3 word without meaning: 語4');
});
test('outline 8: the kanji are exactly the new ones, in kanjiOrder', () => {
  const s = okSet(); s.outlines.N3.kanji = ['甲']; has(s, 'N3 kanji set differs');
  const t = okSet(); t.outlines.N3.kanji = ['乙', '甲']; has(t, 'N3 kanji order differs');
});
test('outline 9: unit ids run on from m19', () => { const s = okSet(); s.outlines.N3.units[0].id = 'm21'; s.outlines.N3.phases[0].units = ['m21']; has(s, 'unit ids not consecutive at m21'); });
test('outline 10: six to ten points a unit', () => { const s = okSet(); s.outlines.N3.units[1].points.push(...s.outlines.N3.units[0].points.splice(0, 1)); has(s, 'N3 unit m19 has 5 points (need 6–10)'); });
test('outline 11: every new grammar key placed once; a moved key lands in its level', () => {
  const s = okSet(); s.outlines.N3.units[1].points.pop(); has(s, 'N3 grammar missing: g11');
  const t = okSet(); t.outlines.N3.units[1].points.pop(); t.outlines.N3.moved.push({ p: '〜g11', keys: ['g11'], to: 'N2', why: '測試' });
  t.outlines.N2 = { level: 'N2', themes: [], added: [], dropped: [], kanji: [], phases: [], units: [], covered: [], moved: [] };
  has(t, 'N3 moved key not in N2: g11');
  assert.ok(!problemsOf(t).some(p => p.startsWith('N3 grammar missing: g11')));
});
test('outline 12: covered points name a course unit m1–m18', () => {
  const s = okSet(); s.outlines.N3.units[1].points.pop(); s.outlines.N3.covered.push({ p: '〜g11', keys: ['g11'], by: 'm99', why: '測試' });
  has(s, 'N3 covered by unknown unit: m99');
});
test('outline 13: phases cover the units in order, two a level', () => {
  const s = okSet(); s.outlines.N3.phases = [{ title: '全部', units: ['m19', 'm20'] }]; has(s, 'N3 phases: ');
  const t = okSet(); t.outlines.N3.phases[1].units = []; has(t, 'N3 phases: ');
});
test('outline 14: gap words use their level\'s themes and every gap candidate is placed', () => {
  const s = okSet(); s.gaps.N5.words[0].c = '不存在'; has(s, 'N5 gap theme unknown: 不存在');
  const t = okSet(); t.gaps.N5.words = []; has(t, 'N5 gap word missing: 朝寝');
});
test('outline: a grammar point needs a meaning of at most 20 characters', () => { const s = okSet(); s.outlines.N3.units[0].points[0].m = ''; has(s, 'N3 point without meaning: 〜g0'); });

// ---- review page (Task 9) ----
test('review page: the four tabs, a word with its reading, a unit title, a dropped word\'s reason, the estimate', () => {
  const s = okSet(); s.outlines.N3.dropped.push({ w: '旧字', r: 'きゅうじ', why: '過時，改用新字' });
  const html = require('../scripts/curriculum/render-review.js').renderReview({ outlines: s.outlines, gaps: s.gaps, cands: s.cands });
  const text = html.replace(/<[^>]+>/g, '');
  for (const tab of ['N5／N4 缺口', 'N3', 'N2', 'N1']) assert.ok(text.includes(tab), tab);
  assert.ok(text.includes('甲乙（ご0）'));
  assert.ok(text.includes('一：〜g0'));
  assert.ok(text.includes('過時，改用新字'));
  assert.ok(text.includes('朝寝（あさね）') && text.includes('睡懶覺'));
  assert.ok(text.includes('約 25 天'));   // (300 words + 2 kanji + 12 points × 6) ÷ 15 = 24.9, rounded up
});
test('review page: text from the outline is escaped', () => {
  const s = okSet(); s.outlines.N3.themes[0].desc = '<b>x</b>';
  const html = require('../scripts/curriculum/render-review.js').renderReview({ outlines: s.outlines, gaps: s.gaps, cands: s.cands });
  assert.ok(html.includes('&lt;b&gt;x&lt;/b&gt;') && !html.includes('<b>x</b>'));
});

// ---- gap words may add a corrected word (Task 5: the list misspells 楽しむ as 楽む) ----
const gapAdd = () => { const s = okSet(); s.cands.N4.words.push({ w: '楽む', r: 'たのしむ', status: 'new' });
  s.gaps.N4.dropped.push({ w: '楽む', r: 'たのしむ', why: '清單拼錯，應為楽しむ' });
  s.gaps.N4.added = [{ w: '楽しむ', r: 'たのしむ', m: '享受、以…為樂', c: '居家生活', why: '取代清單拼錯的楽む' }]; return s; };
test('gaps: an added word with theme, meaning and reason passes', () => assert.deepEqual(problemsOf(gapAdd()), []));
test('gaps: an added word must not be in the app and needs a reason', () => {
  const s = gapAdd(); s.gaps.N4.added.push({ w: '既存', r: 'きそん', m: '既有', c: '居家生活', why: '測試' }); has(s, 'word already in app: 既存');
  const t = gapAdd(); t.gaps.N4.added[0].why = ''; has(t, 'N4 added without reason: 楽しむ');
});
test('review page: gap tab lists added words, marked as added', () => {
  const s = gapAdd(); const text = require('../scripts/curriculum/render-review.js').renderReview({ outlines: s.outlines, gaps: s.gaps, cands: s.cands }).replace(/<[^>]+>/g, '');
  assert.ok(text.includes('楽しむ（たのしむ）') && text.includes('取代清單拼錯的楽む'));
});

// ---- same spelling, another reading (left out of the outline; listed for the user) ----
test('homographs: a later row with the same spelling and another reading is listed with the first one', () => {
  const C = B().buildCandidates(fakeSources({ vocab: { 5: [['上', 'うえ']], 4: [], 3: [['上', 'かみ'], ['上', 'うえ'], ['柄', 'え'], ['柄', 'がら']], 2: [], 1: [] } }), emptyData());
  assert.deepEqual(B().homographs(C), [{ L: 'N3', w: '上', r: 'かみ', firstL: 'N5', firstR: 'うえ' }, { L: 'N3', w: '柄', r: 'がら', firstL: 'N3', firstR: 'え' }]);
});
test('review page: the homographs left out of the outline are listed', () => {
  const s = okSet(); s.cands.N3.words.push({ w: '語5', r: 'ごれい', status: 'dup', dupOf: 'N3' });
  const text = require('../scripts/curriculum/render-review.js').renderReview({ outlines: s.outlines, gaps: s.gaps, cands: s.cands }).replace(/<[^>]+>/g, '');
  assert.ok(text.includes('同形異讀') && text.includes('ごれい'));
});
