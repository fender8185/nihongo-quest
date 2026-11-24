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
test('a cruise stop is gone to by bus, train or on foot, a meal at a table or out of doors; a trip is from the harbour back to it', () => {
  const trip = (...stops) => check(town([ev()], { PLACES: ['town', 'beach', 'harbor', 'platform', 'izakaya'], CRUISE: { PEOPLE: {}, OFF: {}, SAY: {}, TRIPS: [{ id: 't1', u: 'm1', title: 't',
    stops: stops.map((o, i) => Object.assign({ id: 's' + i, at: 'harbor', title: 't', hero: [0, 50], crowd: [40, 40], lines: [] }, o)) }] } }), DATA).filter((p) => !/reply choices/.test(p));   // (20 a trip: not this test's)
  const bye = { bye: true };
  assert.deepEqual(trip({}, { at: 'platform', eat: true }, { go: 'train' }, { at: 'izakaya', go: 'bus', room: true, seat: true, hero: [4, 11], crowd: [7, 12] }, { go: 'walk', ...bye }), []);
  assert.deepEqual(kinds(trip({}, { go: 'boat' }, bye)), ['cruise']);
  assert.deepEqual(kinds(trip({}, { at: 'izakaya', room: true, eat: true, hero: [4, 11], crowd: [7, 12] }, bye)), ['cruise']);   // in a room: its seats (seat)
  assert.deepEqual(kinds(trip({}, { at: 'platform', eat: 1 }, bye)), ['cruise']);
  assert.deepEqual(kinds(trip({ at: 'platform' }, { go: 'train', ...bye })), ['cruise']);   // begun at the harbour
  assert.deepEqual(kinds(trip({}, { at: 'platform', go: 'train', ...bye })), ['cruise']);   // seen off there
});
test('a passenger may join on a trip still to be written (after the last, t and its number), and speaks on none before it', () => {
  const cr = (people, lines = []) => kinds(check(town([ev()], { PLACES: ['town', 'beach', 'harbor'], CRUISE: { PEOPLE: people, SAY: {},
    OFF: Object.fromEntries(Object.keys(people).map((id) => [id, [['m1', 'はい。', '是。']]])),
    TRIPS: [{ id: 't1', u: 'm1', title: 't', stops: [{ id: 's0', at: 'harbor', title: 't', hero: [0, 50], crowd: [40, 40], lines, bye: true }] }] } }), DATA).filter((p) => !/reply choices/.test(p)));
  assert.deepEqual(cr({ a: { from: 't1', name: 'A' }, b: { from: 't2', name: 'B' }, c: { from: 't5', name: 'C' } }), []);   // t2, t5: to come
  assert.deepEqual(cr({ b: { from: 'x2', name: 'B' } }), ['cruise']);   // no trip, nor one to come
  assert.deepEqual(cr({ b: { from: 't1x', name: 'B' } }), ['cruise']);
  assert.deepEqual(cr({ b: { from: 't2', name: 'B' } }, [['b', 'はい。', '是。']]), ['cruise']);   // on t1 before joining
});
test('a cruise line sounds with a sound there is: a file, or one made in 82_sound.js — its name quoted when it has a dash', () => {
  const said = (snd) => kinds(check(town([ev()], { PLACES: ['town', 'beach', 'harbor'], CRUISE: { PEOPLE: {}, OFF: {}, SAY: {}, TRIPS: [{ id: 't1', u: 'm1', title: 't',
    stops: [{ id: 's0', at: 'harbor', title: 't', hero: [0, 50], crowd: [40, 40], lines: [['hero', 'はい。', '是。', { snd }]], bye: true }] }] } }), DATA).filter((p) => !/reply choices/.test(p)));
  assert.deepEqual(said('shutter'), []);   // made: shutter: (c, to, v)
  assert.deepEqual(said('door-chime'), []);   // made: 'door-chime': (c, to, v)
  assert.deepEqual(said('bus'), []);   // a file: sounds/bus-1.m4a
  assert.deepEqual(said('door-bell'), ['ref']);
});
test('a word at a meal about what is eaten there is said there only: an EAT line\'s fourth is { at: a place or places }', () => {
  const cr = (eat) => kinds(check(town([ev()], { PLACES: ['town', 'beach', 'harbor', 'izakaya'], CRUISE: { PEOPLE: { a: { from: 't1', name: 'A' } }, SAY: {}, OFF: { a: [['m1', 'はい。', '是。']] }, EAT: { a: eat },
    TRIPS: [{ id: 't1', u: 'm1', title: 't', stops: [{ id: 's0', at: 'harbor', title: 't', hero: [0, 50], crowd: [40, 40], lines: [], bye: true }] }] } }), DATA).filter((p) => !/reply choices/.test(p)));
  assert.deepEqual(cr([['m1', 'おいしい！', '好吃！'], ['m1', 'やきとり！', '烤雞肉串！', { at: 'izakaya' }], ['m1', 'ねえ。', '欸。', { at: ['izakaya', 'beach'] }]]), []);
  assert.deepEqual(cr([['m1', 'やきとり！', '烤雞肉串！', { at: 'moon' }]]), ['cruise']);   // no such place
  assert.deepEqual(cr([['m1', 'やきとり！', '烤雞肉串！', 'izakaya']]), ['cruise']);   // not { at }
  assert.deepEqual(cr([['m1', 'やきとり！', '烤雞肉串！', { at: 'izakaya', h: 'am' }]]), ['cruise']);   // nothing but where
});
test('a stall keeper (YATAI) speaks on a trip only at a stop where their stall stands — the 朝市\'s at a stop flagged market', () => {
  const said = (who, YATAI, stop = {}) => kinds(check(town([ev()], { PLACES: ['town', 'beach', 'harbor', 'oku'], YATAI, CRUISE: { PEOPLE: {}, OFF: {}, SAY: {}, TRIPS: [{ id: 't1', u: 'm1', title: 't',
    stops: [{ id: 's0', at: 'harbor', title: 't', hero: [0, 50], crowd: [40, 40], lines: [] }, Object.assign({ id: 's1', at: 'harbor', title: 't', hero: [0, 50], crowd: [40, 40], lines: [[who, 'はい。', '是。']], after: [[who, 'ええ。']] }, stop),
      { id: 's2', at: 'harbor', title: 't', hero: [0, 50], crowd: [40, 40], lines: [], bye: true }] }] } }), DATA).filter((p) => !/reply choices/.test(p)));   // the harbour, the stop, the harbour
  const look = { face: 'round' }, market = { sakanaya: { at: 'harbor', market: true, name: '魚屋のおじさん', look } }, chaya = { chaya: { at: 'oku', name: '茶屋のおかみ', look } };
  assert.deepEqual(said('sakanaya', market, { market: true }), []);   // the 朝市's fish man at a stop it stands for
  assert.deepEqual(said('sakanaya', market), ['cruise']);   // the harbour, but no market there then
  assert.deepEqual(said('chaya', chaya, { at: 'oku' }), []);   // 奥社's おかみ at 奥社
  assert.deepEqual(said('chaya', chaya), ['cruise']);   // not at the harbour
  assert.deepEqual(said('sakanaya', { sakanaya: { name: '魚屋のおじさん', look } }, { market: true }), ['cruise']);   // a keeper who says no place
  assert.deepEqual(said('miku', market), []);   // someone of the town (brought out)
  assert.deepEqual(said('sakanaya', undefined, { market: true }), ['ref']);   // no such keeper
  assert.deepEqual(said('nobody', market, { market: true }), ['ref']);
  assert.deepEqual(said('miku', { x: { at: 'moon', name: 'X', look } }), ['ref']);   // a stall at no place there is
  assert.deepEqual(said('miku', { x: { at: 'oku', market: true, name: 'X', look } }), ['menu']);   // the 朝市 is at the harbour
});
test('away after an event that exists; helps at a shop someone keeps', () => {
  const cast = (o) => ({ CAST: { miku: Object.assign({ name: '美玖', hours: [[7, 20, 'town', 'bakeryIn']] }, o), kenta: { name: '健太', shop: 'bakery', hours: [[5, 21, 'town', 'bakery']] } } });
  assert.deepEqual(check(town([ev()], cast({ away: 'e1', helps: 'bakery' })), DATA), []);
  assert.deepEqual(kinds(check(town([ev()], cast({ away: 'zz' })), DATA)), ['ref']);
  assert.deepEqual(kinds(check(town([ev()], cast({ helps: 'moon' })), DATA)), ['ref']);
});
test('湯の花温泉\'s lines (TOWN.ONSEN) are checked: the 観光案内所\'s at m7 — a bare kanji, an above-level word, a tourist no one is, a line with no Chinese, a kind it does not practise (2026-11-24)', () => {
  const annai = (o) => ({ ONSEN: { welcome: ['ようこそ！', '歡迎！'], bell: ['はい。', '是。'], annai: Object.assign({ spots: { a: ['{花|はな}', '{花|はな}', '花', ''] },
    ask: { q1: ['kenta', 'time', '{花|はな}は {食|た}べられますか。', '花可以吃嗎？'] }, reply: { r: [['はい、{食|た}べられます。', '可以。'], ['はい、{食|た}べたいです。', '「想吃」不是「可以吃」。']] },
    fun: { f: { who: 'miku', q: ['ねえ。', '欸。'], right: ['はい。', '是。'], wrong: [['いいえ。', '不對。']], after: ['わあ！', '哇！'] } },
    say: { who: 'miku', ok: [['いいね！', '不錯！']], end: ['おつかれ！', '辛苦了！'] }, hi: ['こんにちは。', '你好。'] }, o) } });
  assert.deepEqual(check(town([ev()], annai({})), DATA), []);
  assert.deepEqual(kinds(check(town([ev()], annai({ ask: { q1: ['kenta', 'time', '花は {食|た}べられますか。', '花可以吃嗎？'] } })), DATA)), ['bare-kanji']);
  assert.deepEqual(kinds(check(town([ev()], annai({ reply: { r: [['{経済|けいざい}です。', '經濟。']] } })), DATA)), ['level']);   // N3 in a reply at m7: gloss it
  assert.deepEqual(check(town([ev()], annai({ reply: { r: [['{経済|けいざい|經濟}です。', '經濟。']] } })), DATA), []);
  assert.deepEqual(kinds(check(town([ev()], annai({ ask: { q1: ['nobody', 'time', 'はい。', '是。'] } })), DATA)), ['ref']);
  assert.deepEqual(kinds(check(town([ev()], annai({ say: { who: 'miku', end: ['おつかれ！', ''] } })), DATA)), ['onsen']);
  assert.deepEqual(kinds(check(town([ev()], annai({ ask: { q1: ['kenta', 'sing', 'はい。', '是。'] } })), DATA)), ['onsen']);
  assert.deepEqual(kinds(check(town([ev()], annai({ fun: { f: { who: 'miku', ask: 'q9', q: ['ねえ。', '欸。'], after: ['わあ！', '哇！'] } } })), DATA)), ['ref']);
  assert.deepEqual(kinds(check(town([ev()], { ONSEN: { welcome: ['{経済|けいざい}へ！', '歡迎！'] } }), DATA)), ['level']);   // the welcome: from the first unit
});
test('仲居\'s lines (TOWN.ONSEN.nakai) are checked at m8: a bare kanji, an above-level word, a thing the room does not draw, a guest no one is, a wrong reply with no reason, a check with no why; a shift spot is one drawn (2026-11-24)', () => {
  const D8 = Object.assign({}, DATA, { UNITS: DATA.UNITS.concat([{ id: 'm8', lv: 'N4' }]) });
  const nk = (o) => ({ ONSEN: { nakai: Object.assign({ do: { a: ['tea', true, '{花|はな}を {食|た}べて おいて ください。', '先把花吃了。'] },
    check: { tea: { want: true, q: ['{花|はな}は ありますか。', '有花嗎？'], yes: ['はい、あります。', '有。'], no: ['いいえ、ありません。', '沒有。'], fact: ['有花。', '沒有花。'], then: ['じゃあ、おねがいします。', '那就拜託了。'],
      form: [['はい、ある。', 'いいえ、ない。'], '要說「あります」。'] } },
    guest: { tea: ['kenta', ['{花|はな}ですね。', '是花呢。'], ['はい。', '是的。'], [['いいえ。', '是花。', 'fact']], ['わあ。', '哇。']] },
    self: { tea: ['あら、もう ありますね。', '哎呀，已經有了。'] }, say: { who: 'miku', miss: ['ちがいます。', '不對。'], ok: [['はい。', '好。']] } }, o) } });
  assert.deepEqual(check(town([ev()], nk({})), D8), []);
  assert.deepEqual(kinds(check(town([ev()], nk({ do: { a: ['tea', true, '花を {食|た}べて おいて ください。', '先把花吃了。'] } })), D8)), ['bare-kanji']);
  assert.deepEqual(kinds(check(town([ev()], nk({ self: { tea: ['{経済|けいざい}ですね。', '經濟呢。'] } })), D8)), ['level']);   // N3 at m8: gloss it
  assert.deepEqual(kinds(check(town([ev()], nk({ do: { a: ['moon', true, 'はい。', '好。'] } })), D8)), ['onsen']);
  assert.deepEqual(kinds(check(town([ev()], nk({ guest: { tea: ['nobody', ['はい。', '是。'], ['はい。', '是。'], [], ['わあ。', '哇。']] } })), D8)), ['ref']);
  assert.deepEqual(kinds(check(town([ev()], nk({ guest: { tea: ['kenta', ['はい。', '是。'], ['はい。', '是。'], [['いいえ。', '', 'fact']], ['わあ。', '哇。']] } })), D8)), ['onsen']);
  assert.deepEqual(kinds(check(town([ev()], nk({ check: { tea: { want: true, q: ['はい？', '是？'], yes: ['はい。', '是。'], no: ['いいえ。', '不。'], then: ['じゃあ。', '那。'] } } })), D8)), ['onsen']);
  const shifted = (spot, job = 'nakai') => Object.assign(nk({}), { CAST: Object.assign({}, CAST, { miku: Object.assign({}, CAST.miku, { shift: [job, 'town', spot] }) }) });
  assert.deepEqual(check(town([ev()], shifted('bakery')), D8), []);
  assert.deepEqual(kinds(check(town([ev()], shifted('moon')), D8)), ['host']);
  // fix round 1 (M-7): a shift's job is one of WORK's; an instruction's value fits its thing (a futon 1–3, a cushion 1–4, on/off a
  // boolean); a check says what she wants (a boolean) and its wrong form both ways; she finds seen to only what she can; every line its 中文
  assert.deepEqual(kinds(check(town([ev()], shifted('bakery', 'moon')), D8)), ['host']);
  assert.deepEqual(check(town([ev()], nk({ do: { a: ['futon', 3, 'はい。', '好。'], b: ['zabuton', 4, 'はい。', '好。'], c: ['window', false, 'はい。', '好。'] } })), D8), []);
  for (const v of [4, 0, 1.5]) assert.deepEqual(kinds(check(town([ev()], nk({ do: { a: ['futon', v, 'はい。', '好。'] } })), D8)), ['onsen'], `futon ${v}`);
  assert.deepEqual(kinds(check(town([ev()], nk({ do: { a: ['zabuton', 5, 'はい。', '好。'] } })), D8)), ['onsen']);
  assert.deepEqual(kinds(check(town([ev()], nk({ do: { a: ['window', 'yes', 'はい。', '好。'] } })), D8)), ['onsen']);
  const ck = (o) => nk({ check: { tea: Object.assign({ want: true, q: ['はい？', '是？'], yes: ['はい。', '是。'], no: ['いいえ。', '不。'], fact: ['有。', '沒有。'], then: ['じゃあ。', '那。'] }, o) } });
  assert.deepEqual(check(town([ev()], ck({})), D8), []);
  assert.deepEqual(kinds(check(town([ev()], ck({ want: undefined })), D8)), ['onsen']);
  assert.deepEqual(kinds(check(town([ev()], ck({ want: 'yes' })), D8)), ['onsen']);
  assert.deepEqual(kinds(check(town([ev()], ck({ form: [['はい、ある。'], '要說「あります」。'] })), D8)), ['onsen']);
  assert.deepEqual(kinds(check(town([ev()], nk({ self: { tv: ['あら、もう けして ありますね。', '哎呀，已經關了。'] } })), D8)), ['onsen']);   // the TV: not one she finds seen to
  assert.deepEqual(kinds(check(town([ev()], nk({ do: { a: ['tea', true, 'はい。', ''] } })), D8)), ['onsen']);   // no 中文
  assert.deepEqual(kinds(check(town([ev()], nk({ guest: { tea: ['kenta', ['{花|はな}ですね。', ''], ['はい。', '是的。'], [['いいえ。', '是花。', 'fact']], ['わあ。', '哇。']] } })), D8)), ['onsen']);
});
test('おみやげ屋\'s lines (TOWN.ONSEN.miyage) are checked at m11: a bare kanji, an above-level word, a customer no one is, a kind it does not practise, a good wanted that is not on the shelves, a wrong reply with no reason, a two-step customer with no replies, a line with no Chinese, a price that is no number (2026-11-24)', () => {
  const D11 = Object.assign({}, DATA, { UNITS: DATA.UNITS.concat([{ id: 'm11', lv: 'N4' }]) });
  const A = { who: 'kenta', kind: 'got', line: ['{花|はな}を ください。', '請給我花。'], want: ['flower'] };
  const B = { who: 'miku', kind: 'reply', line: ['はこを ください。', '請給我盒子。'], want: ['box'], then: ['つつんで もらえますか。', '可以幫我包嗎？'], reply: 'wrap' };
  const my = (o, cust = {}) => ({ ONSEN: { miyage: Object.assign({ goods: [['flower', '{花|はな}', 300, 0, '花', '花'], ['box', 'はこ', 600, 6, 'はこ', '盒子']],
    cust: Object.assign({ a: A, b: B }, cust), reply: { wrap: [['はい、つつみますね。', '好的，我幫您包。'], [['はい、つつんで もらいます。', '是請別人包。']]] },
    why: { other: '不是這個。' }, say: { who: 'miku', start: ['さあ！', '好！'], pick: ['あれ？', '咦？'] }, hi: ['いらっしゃいませ。', '歡迎光臨。'] }, o) } });
  assert.deepEqual(check(town([ev()], my({})), D11), []);
  assert.deepEqual(kinds(check(town([ev()], my({}, { a: Object.assign({}, A, { line: ['花を ください。', '請給我花。'] }) })), D11)), ['bare-kanji']);
  assert.deepEqual(kinds(check(town([ev()], my({}, { a: Object.assign({}, A, { line: ['{経済|けいざい}を ください。', '經濟。'] }) })), D11)), ['level']);   // N3 at m11: gloss it
  assert.deepEqual(kinds(check(town([ev()], my({}, { a: Object.assign({}, A, { who: 'nobody' }) })), D11)), ['ref']);
  assert.deepEqual(kinds(check(town([ev()], my({}, { a: Object.assign({}, A, { kind: 'sing' }) })), D11)), ['onsen']);
  assert.deepEqual(kinds(check(town([ev()], my({}, { a: Object.assign({}, A, { want: ['moon'] }) })), D11)), ['onsen']);   // not on the shelves
  assert.deepEqual(kinds(check(town([ev()], my({ reply: { wrap: [['はい、つつみますね。', '好。'], [['はい、つつんで もらいます。', '']]] } })), D11)), ['onsen']);   // a wrong reply's reason
  assert.deepEqual(kinds(check(town([ev()], my({}, { b: Object.assign({}, B, { reply: undefined }) })), D11)), ['onsen']);   // a favour asked, no replies to it
  assert.deepEqual(kinds(check(town([ev()], my({}, { b: Object.assign({}, B, { then: ['つつんで もらえますか。', ''] }) })), D11)), ['onsen']);   // no 中文
  assert.deepEqual(kinds(check(town([ev()], my({ goods: [['flower', '{花|はな}', 'three', 0, '花', '花'], ['box', 'はこ', 600, 6, 'はこ', '盒子']] })), D11)), ['onsen']);
});
