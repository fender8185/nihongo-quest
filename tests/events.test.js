const test = require('node:test'); const assert = require('node:assert/strict');
const { check, loadTown, loadWares } = require('../scripts/check-events');

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
  assert.deepEqual(check(loadTown(), D, { chatMin: 10, wares: loadWares() }), []);
});
// ---- 2026-11-12: the town comes alive (docs/superpowers/specs/2026-11-12-town-life-design.md) ----
const said = (n, dots) => Array.from({ length: n }, (_, i) => ['miku', i < dots ? '……はい。' : 'はい。', '是。']);
test('「……」 in at most 12% of the event lines people say, 10% of their chat', () => {
  assert.deepEqual(kinds(check(town([ev({ lines: said(10, 2) })]), DATA)), ['ellipsis']);
  assert.deepEqual(check(town([ev({ lines: said(10, 1) })]), DATA), []);
  assert.deepEqual(check(town([ev({ lines: said(10, 1).concat([['hero', '……はい。', '是。'], ['hero', '……うん。', '嗯。']]) })]), DATA), []);   // the hero's own don't count
  const chat = (dots) => ({ CHAT: { miku: Array.from({ length: 10 }, (_, i) => ['m1', i < dots ? '……うん。' : 'うん。', '嗯。']) } });
  assert.deepEqual(kinds(check(town([ev()], chat(2)), DATA)), ['ellipsis']);
  assert.deepEqual(check(town([ev()], chat(1)), DATA), []);
});
test('a line\'s conditions are known and name what is there', () => {
  const w = (c) => kinds(check(town([ev()], { CHAT: { miku: [['m1', 'はい。', '是。', c]] } }), DATA, { wares: new Set(['catsuit']) }));
  [{ at: 'moon' }, { h: 'dawn' }, { days: 'sun' }, { after: 'zz' }, { fresh: 'zz' }, { talks: 0 }, { about: 'nobody' }, { look: 'nothing' }, { fest: 'xmas' }, { mood: 1 }, 'x']
    .forEach((c) => assert.deepEqual(w(c), ['when'], JSON.stringify(c)));
  assert.deepEqual(w({ at: ['town', 'beach'], h: ['am', 'night'], days: 'we', after: 'e1', talks: 3, look: 'catsuit', fest: 'halloween', about: 'kenta' }), []);
  assert.deepEqual(w({ look: 'any' }), []); assert.deepEqual(w({ look: 'hair' }), []);
});
test('everyone has ten things to say, two with no condition by their first event', () => {
  const lines = (n, more) => Array.from({ length: n }, () => ['m1', 'うん。', '嗯。']).concat(more || []);
  const plain = { CHAT: { miku: lines(10), kenta: lines(10) } }, o = { chatMin: 10 };
  assert.deepEqual(check(town([ev()], plain), DATA, o), []);
  assert.deepEqual(kinds(check(town([ev()], { CHAT: { miku: lines(9), kenta: lines(10) } }), DATA, o)), ['chat-min']);
  const late = Array.from({ length: 10 }, () => ['m2', 'うん。', '嗯。']);   // 美玖 is met in m1: nothing she can say then
  assert.deepEqual(kinds(check(town([ev()], { CHAT: { miku: late, kenta: lines(10) } }), DATA, o)), ['chat-min']);
  const ruled = Array.from({ length: 10 }, () => ['m1', 'うん。', '嗯。', { h: 'am' }]);
  assert.deepEqual(kinds(check(town([ev()], { CHAT: { miku: ruled, kenta: lines(10) } }), DATA, o)), ['chat-min']);
  assert.deepEqual(kinds(check(town([ev()]), DATA)), []);   // asked for only with chatMin
});
test('two who talk to each other are somewhere together; their lines are checked', () => {
  const pair = (p) => kinds(check(town([ev()], { PAIRS: [p] }), DATA));
  assert.deepEqual(pair([['miku', 'kenta'], 'm1', [['miku', 'パパ！', '爸爸！'], ['kenta', 'おう！', '喔！']]]), []);
  const apart = { miku: { name: '美玖', hours: [[7, 9, 'town', 'bakeryIn']] }, kenta: { name: '健太', hours: [[9, 21, 'town', 'bakery']] } };
  assert.deepEqual(kinds(check(town([ev()], { CAST: apart, PAIRS: [[['miku', 'kenta'], 'm1', [['miku', 'パパ！', '爸爸！']]]] }), DATA)), ['pair']);
  assert.deepEqual(pair([['miku', 'nobody'], 'm1', []]), ['pair']);
  assert.deepEqual(pair([['miku', 'kenta'], 'm1', [['tome', 'はい。', '是。']]]), ['pair']);
  assert.deepEqual(pair([['miku', 'kenta'], 'm1', [['miku', '花！', '花！']]]), ['bare-kanji']);
});
test('mutters are checked like chat', () => {
  assert.deepEqual(kinds(check(town([ev()], { MUTTER: { miku: [['m1', '{経済|けいざい}。', '經濟。']] } }), DATA)), ['level']);
  assert.deepEqual(kinds(check(town([ev()], { MUTTER: { ghost: [['m1', 'うん。', '嗯。']] } }), DATA)), ['ref']);
});
test('how far people stroll is 0 or [X, Y]', () => {
  const sp = (roam) => kinds(check(town([ev()], { SPOTS: { town: { bakery: {}, bakeryIn: { roam } } } }), DATA));
  assert.deepEqual(sp(0), []); assert.deepEqual(sp([30, 8]), []);
  assert.deepEqual(sp([1]), ['roam']); assert.deepEqual(sp('x'), ['roam']);
});
test('the things to wear are read from 古道具屋', () => {
  const w = loadWares(); assert.ok(w.has('catears') && w.has('wings') && w.has('geta') && !w.has('gramophone'));
});
test('every event can be met at one of the times the bed wakes to', () => {
  const late = { miku: { name: '美玖', hours: [[21, 23, 'town', 'bakeryIn']] }, kenta: CAST.kenta };
  assert.deepEqual(kinds(check(town([ev()], { CAST: late, WAKE: [8, 12, 17, 20] }), DATA)), ['wake']);
  assert.deepEqual(check(town([ev()], { WAKE: [8, 12, 17, 20] }), DATA), []);
});
test('away after an event that exists; helps at a shop someone keeps', () => {
  const cast = (o) => ({ CAST: { miku: Object.assign({ name: '美玖', hours: [[7, 20, 'town', 'bakeryIn']] }, o), kenta: { name: '健太', shop: 'bakery', hours: [[5, 21, 'town', 'bakery']] } } });
  assert.deepEqual(check(town([ev()], cast({ away: 'e1', helps: 'bakery' })), DATA), []);
  assert.deepEqual(kinds(check(town([ev()], cast({ away: 'zz' })), DATA)), ['ref']);
  assert.deepEqual(kinds(check(town([ev()], cast({ helps: 'moon' })), DATA)), ['ref']);
});
