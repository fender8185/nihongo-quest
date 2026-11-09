const test = require('node:test'); const assert = require('node:assert/strict');
const { check, loadTown } = require('../scripts/check-events');

// a tiny course: three N5 units, a word at each level, one grammar item in m3
const DATA = {
  UNITS: [{ id: 'm1', lv: 'N5' }, { id: 'm2', lv: 'N5' }, { id: 'm3', lv: 'N5' }, { id: 'm7', lv: 'N4' }],
  VOCAB: [{ w: '花', r: 'はな', lv: 'N5' }, { w: '食べる', r: 'たべる', lv: 'N5' }, { w: '経済', r: 'けいざい', lv: 'N3' }, { w: 'これ', r: 'これ', lv: 'PRE_N5' }, { w: 'お風呂', r: 'おふろ', lv: 'N5' }],
  GRAMMAR: [{ id: 'g1', u: 'm3' }]
};
const CAST = { miku: { name: '美玖', hours: [[7, 20, 'town', 'bakeryIn']] }, kenta: { name: '健太', hours: [[5, 21, 'town', 'bakery']] } };
const SPOTS = { town: { bakery: {}, bakeryIn: {} } };
const ev = (o) => Object.assign({ id: 'e1', u: 'm1', who: 'miku', at: 'town', title: 't', lines: [['miku', 'これ、なに？', '這是什麼？']] }, o);
const town = (events, extra) => Object.assign({ CAST, SPOTS, PLACES: ['town', 'beach'], NAMES: ['美玖'], EVENTS: events }, extra);
const kinds = (probs) => [...new Set(probs.map(p => p.split(':')[0]))].sort();

test('a clean event passes', () => {
  const e = ev({ lines: [['miku', '{花|はな}を{食|た}べる？', '吃花？'], ['kenta', '{美玖|みく}、だめ！', '美玖，不行！'],
    { ask: '回答', opts: [['はい。', 1], ['いいえ。', 0, '不對']], pt: 'm1' }] });
  assert.deepEqual(check(town([e]), DATA), []);
});
test('kanji outside the ruby marks is caught', () => {
  assert.deepEqual(kinds(check(town([ev({ lines: [['miku', '花です。', '是花。']] })]), DATA)), ['bare-kanji']);
});
test('a word above the event level needs a gloss', () => {
  assert.deepEqual(kinds(check(town([ev({ lines: [['miku', '{経済|けいざい}。', '經濟。']] })]), DATA)), ['level']);
  assert.deepEqual(check(town([ev({ lines: [['miku', '{経済|けいざい|經濟}。', '經濟。']] })]), DATA), []);
});
test('an unknown word needs a gloss unless it is a name', () => {
  assert.deepEqual(kinds(check(town([ev({ lines: [['miku', '{麺麭|ぱん}。', '麵包。']] })]), DATA)), ['unknown']);
  assert.deepEqual(check(town([ev({ lines: [['miku', '{美玖|みく}です。', '我是美玖。']] })]), DATA), []);
});
test('grammar from a later unit is caught', () => {
  const ask = (pt) => ev({ lines: [{ ask: 'q', opts: [['はい。', 1], ['いいえ。', 0, 'x']], pt }] });
  assert.deepEqual(kinds(check(town([ask('g1')]), DATA)), ['grammar']);   // g1 is m3's
  assert.deepEqual(kinds(check(town([ask('m2')]), DATA)), ['grammar']);
  assert.deepEqual(check(town([ask('m1')]), DATA), []);
});
test('a reply choice needs a right and a wrong answer, and the wrong one a reason', () => {
  const ask = (opts) => ev({ lines: [{ ask: 'q', opts, pt: 'm1' }] });
  assert.deepEqual(kinds(check(town([ask([['はい。', 1], ['うん。', 1]])]), DATA)), ['choice']);
  assert.deepEqual(kinds(check(town([ask([['はい。', 0, 'x'], ['うん。', 0, 'y']])]), DATA)), ['choice']);
  assert.deepEqual(kinds(check(town([ask([['はい。', 1], ['うん。', 0]])]), DATA)), ['choice']);
});
test('people, places and earlier events must exist', () => {
  assert.deepEqual(kinds(check(town([ev({ who: 'nobody' })]), DATA)), ['ref']);
  assert.deepEqual(kinds(check(town([ev({ at: 'moon' })]), DATA)), ['ref']);
  assert.deepEqual(kinds(check(town([ev({ after: 'e0' })]), DATA)), ['ref']);
  assert.deepEqual(kinds(check(town([ev({ lines: [['ghost', 'はい。', '是。']] })]), DATA)), ['ref']);
  assert.deepEqual(kinds(check(town([ev(), ev()]), DATA)), ['ref']);   // the same id twice
});
test('every unit up to the last written has events', () => {
  assert.deepEqual(kinds(check(town([ev(), ev({ id: 'e3', u: 'm3' })]), DATA)), ['gap']);   // m2 missing
});
test('chat lines are checked like event lines', () => {
  assert.deepEqual(kinds(check(town([ev()], { CHAT: { miku: [['m1', '花！', '花！']] } }), DATA)), ['bare-kanji']);
  assert.deepEqual(kinds(check(town([ev()], { CHAT: { ghost: [['m1', 'はい。', '是。']] } }), DATA)), ['ref']);
});
test('a line in Chinese only (empty Japanese) is fine', () => {
  assert.deepEqual(check(town([ev({ lines: [['miku', '', '（用中文）你好']] })]), DATA), []);
  assert.deepEqual(check(town([ev()], { CHAT: { miku: [['m1', '', '（用中文）你好']] } }), DATA), []);
});
test('an event must be hostable: its person is there by their hours, the place draws people, the spot exists', () => {
  assert.deepEqual(kinds(check(town([ev({ at: 'beach' })]), DATA)), ['host']);   // 美玖 is never on the beach
  assert.deepEqual(kinds(check(town([ev({ who: 'hero' })]), DATA)), ['ref']);   // the hero hosts nothing
  assert.deepEqual(kinds(check(town([ev()], { SPOTS: { town: { bakery: {} } } }), DATA)), ['host']);   // 美玖's spot is missing
  assert.deepEqual(kinds(check(town([ev({ at: 'station' })]), DATA)), ['ref']);   // a place not drawn yet
});
test('a word written after お／ご is found as the course has it (お風呂)', () => {
  assert.deepEqual(check(town([ev({ lines: [['miku', 'お{風呂|ふろ}です。', '是浴室。']] })]), DATA), []);
});
test('no event waits on one that only happens at night (a daytime player would never get past it)', () => {
  assert.deepEqual(kinds(check(town([ev({ when: 'night' }), ev({ id: 'e2', after: 'e1' })]), DATA)), ['night-chain']);
});
test('events.js itself passes against data.js', () => {
  const D = require('../scripts/data-file').load();
  assert.deepEqual(check(loadTown(), D), []);
});
