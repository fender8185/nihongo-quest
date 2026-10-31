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
