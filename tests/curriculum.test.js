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
test('match: a kana word equal to an app reading (わかる / 分かる)', () => assert.equal(M().matchWord(fakeApp(), 'わかる', 'わかる').status, 'in-app'));
test('match: a kanji word the app writes in kana (煙草 / たばこ)', () => assert.equal(M().matchWord(fakeApp(), '煙草', 'たばこ').status, 'in-app'));
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
