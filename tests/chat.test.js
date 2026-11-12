const test = require('node:test'); const assert = require('node:assert/strict');
const fs = require('fs'); const path = require('path');
// what someone says when tapped with nothing on (js/71i_chat.js, 2026-11-12): the conditions, news first and once, no repeats
const CHATPICK = new Function(fs.readFileSync(path.join(__dirname, '..', 'js', '71i_chat.js'), 'utf8') + '\n;return CHATPICK;')();
const UNITS = ['m0', 'm1', 'm2', 'm3'];
const ctx = (o) => Object.assign({ R: 2, unitIdx: (u) => UNITS.indexOf(u), at: 'town', h: 10, we: false, done: {}, day: '2026-11-12', seen: () => true,
  talks: 0, lookSig: 'L1', lookChanged: false, hairChanged: false, wear: [], fest: [] }, o);
const mem = (o) => Object.assign({ said: [], news: {} }, o);
const ok = (when, o) => CHATPICK.ok(when, ctx(o));
const only = (lines, o, m) => { const p = CHATPICK.pick('kenta', lines, ctx(o), mem(m)); return p && p.line[1]; };

test('a line from a later unit is not said yet', () => {
  assert.equal(only([['m3', 'あと', '']], {}), null);
  assert.equal(only([['m3', 'あと', '']], { R: 3 }), 'あと');
});
test('where and when: the place, the time of day, weekday or weekend', () => {
  assert.ok(ok({ h: 'am' }, { h: 9 })); assert.ok(!ok({ h: 'am' }, { h: 12 }));
  assert.ok(ok({ h: 'night' }, { h: 23 })); assert.ok(ok({ h: 'night' }, { h: 2 })); assert.ok(!ok({ h: 'night' }, { h: 18 }));
  assert.ok(ok({ h: ['noon', 'pm'] }, { h: 16 }));
  assert.ok(ok({ at: ['beach', 'harbor'] }, { at: 'harbor' })); assert.ok(!ok({ at: 'beach' }, { at: 'town' }));
  assert.ok(ok({ days: 'we' }, { we: true })); assert.ok(!ok({ days: 'we' }, { we: false })); assert.ok(ok({ days: 'wd' }, { we: false }));
});
test('the story: after, before, and fresh for three days', () => {
  assert.ok(!ok({ after: 'm1-1' }, {})); assert.ok(ok({ after: 'm1-1' }, { done: { 'm1-1': '2026-11-01' } }));
  assert.ok(ok({ before: 'm1-1' }, {})); assert.ok(!ok({ before: 'm1-1' }, { done: { 'm1-1': '2026-11-01' } }));
  ['2026-11-12', '2026-11-09'].forEach((d) => assert.ok(ok({ fresh: 'm1-1' }, { done: { 'm1-1': d } }), d));
  assert.ok(!ok({ fresh: 'm1-1' }, { done: { 'm1-1': '2026-11-08' } })); assert.ok(!ok({ fresh: 'm1-1' }, {}));
});
test('talks: chatted with that often', () => {
  assert.ok(!ok({ talks: 8 }, { talks: 7 })); assert.ok(ok({ talks: 8 }, { talks: 8 }));
});
test('about someone: only once the hero has met them', () => {
  assert.ok(!ok({ about: 'tome' }, { seen: (id) => id !== 'tome' })); assert.ok(ok({ about: 'tome' }, { seen: () => true }));
});
test('news first, and once', () => {
  const lines = [['m0', 'ふつう', ''], ['m1', 'ニュース', '', { fresh: 'm1-1' }]], o = { done: { 'm1-1': '2026-11-12' } };
  const p = CHATPICK.pick('kenta', lines, ctx(o), mem());
  assert.equal(p.line[1], 'ニュース'); assert.equal(p.news, true);
  assert.equal(only(lines, o, { news: { [p.key]: 1 } }), 'ふつう');
  assert.equal(only(lines, { done: { 'm1-1': '2026-11-01' } }), 'ふつう');   // no longer fresh: not said at all
});
test('the hero\'s look: a new look is news, again after the next change; a thing worn', () => {
  const lines = [['m0', 'ふつう', ''], ['m0', 'あたらしい！', '', { look: 'any' }]];
  assert.equal(only(lines, { lookChanged: true }), 'あたらしい！');
  assert.equal(only(lines, { lookChanged: false }), 'ふつう');
  const k1 = CHATPICK.key('kenta', lines[1], ctx({ lookSig: 'L1' })), k2 = CHATPICK.key('kenta', lines[1], ctx({ lookSig: 'L2' }));
  assert.notEqual(k1, k2);
  assert.equal(only(lines, { lookChanged: true, lookSig: 'L2' }, { news: { [k1]: 1 } }), 'あたらしい！');
  const cat = [['m0', 'ふつう', ''], ['m0', 'ねこ！', '', { look: 'catears' }]];
  assert.equal(only(cat, { wear: ['catears'] }), 'ねこ！'); assert.equal(only(cat, { wear: [] }), 'ふつう');
  assert.equal(only([['m0', 'ふつう', ''], ['m0', 'かみ！', '', { look: 'hair' }]], { lookChanged: true, hairChanged: true }), 'かみ！');
});
test('a festival line is news once a year', () => {
  const lines = [['m0', 'ふつう', ''], ['m0', 'おばけ！', '', { fest: 'halloween' }]];
  assert.equal(only(lines, { fest: ['halloween'] }), 'おばけ！'); assert.equal(only(lines, { fest: [] }), 'ふつう');
  const k = CHATPICK.key('kenta', lines[1], ctx({})); assert.ok(k.endsWith('@2026'));
});
test('none of the last five said again, unless that is all there is', () => {
  const lines = ['あ', 'い', 'う', 'え', 'お', 'か'].map((j) => ['m0', j, '']);
  const said = lines.slice(0, 5).map((l) => CHATPICK.key('kenta', l, ctx({})));
  for (let i = 0; i < 20; i++) assert.equal(only(lines, {}, { said }), 'か');
  assert.ok(['あ', 'い', 'う', 'え', 'お'].includes(only(lines.slice(0, 5), {}, { said })));
});
test('a line for here and now is twice as likely', () => {
  const lines = [['m0', 'いつも', ''], ['m0', 'あさ', '', { h: 'am' }]];
  const at = (r) => CHATPICK.pick('kenta', lines, ctx({ h: 9 }), mem(), () => r).line[1];
  assert.equal(at(0.3), 'いつも'); assert.equal(at(0.34), 'あさ'); assert.equal(at(0.99), 'あさ');   // weights 1 and 2 of 3
});
test('nothing to say: null', () => {
  assert.equal(only([['m0', 'あさ', '', { h: 'am' }]], { h: 20 }), null);
  assert.equal(only([], {}), null);
});
