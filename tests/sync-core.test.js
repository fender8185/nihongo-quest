const test = require('node:test'); const assert = require('node:assert/strict');
const C = require('../sync-core.js');
const base = () => ({ v: 3, updatedAt: '2026-10-24T01:00:00.000Z',
  aiConfig: { provider: 'gemini', geminiKey: 'g1', openaiKey: 'o1' },
  ttsConfig: { deepgramKey: 'd1', openaiKey: 'o2' }, srs: { a: 1 } });

test('stripSecrets removes the device-local AI and TTS configs entirely and does not mutate input', () => {
  const s = base(); s.aiConfig.openaiUrl = 'http://evil.example'; const out = C.stripSecrets(s);
  assert.equal(out.aiConfig, null); assert.equal(out.ttsConfig, null);
  assert.deepEqual(out.srs, { a: 1 }); assert.equal(out.v, 3);
  assert.equal(s.aiConfig.geminiKey, 'g1'); assert.equal(s.aiConfig.openaiUrl, 'http://evil.example');
});
test('stripSecrets tolerates null configs', () => {
  const out = C.stripSecrets({ v: 3, aiConfig: null, ttsConfig: null });
  assert.equal(out.aiConfig, null); assert.equal(out.ttsConfig, null);
});
test('keepLocalSecrets always prefers the local AI/TTS configs over whatever the cloud carries', () => {
  const inc = base(); inc.aiConfig = { provider: 'openai', openaiUrl: 'http://evil.example', openaiKey: '' }; inc.settings = { dailyGoal: 9 };
  const out = C.keepLocalSecrets(inc, base());
  assert.deepEqual(out.aiConfig, base().aiConfig); assert.deepEqual(out.ttsConfig, base().ttsConfig);
  assert.equal(out.settings.dailyGoal, 9, 'non-local fields come from incoming');
  assert.equal(inc.aiConfig.openaiUrl, 'http://evil.example', 'input not mutated');
});
test('keepLocalSecrets with null local keeps incoming; with null incoming configs uses local', () => {
  assert.equal(C.keepLocalSecrets(base(), null).aiConfig.geminiKey, 'g1');
  const out = C.keepLocalSecrets({ v: 3, aiConfig: null, ttsConfig: null }, base());
  assert.equal(out.aiConfig.geminiKey, 'g1'); assert.equal(out.ttsConfig.deepgramKey, 'd1');
  const none = C.keepLocalSecrets({ v: 3 }, { v: 3, aiConfig: null, ttsConfig: null });
  assert.equal(none.aiConfig, undefined);
});
test('buildPushPayload', () => {
  const p = C.buildPushPayload(base(), 'dev-1');
  assert.deepEqual(Object.keys(p).sort(), ['device_id', 'state', 'updated_at']);
  assert.equal(p.updated_at, '2026-10-24T01:00:00.000Z'); assert.equal(p.device_id, 'dev-1');
});
test('normalizeEmail', () => { assert.equal(C.normalizeEmail('  Foo@Example.COM '), 'foo@example.com'); });
test('isEmptyProgress is true only when srs, dailyLogs and examHistory are all empty', () => {
  assert.equal(C.isEmptyProgress({ v: 3 }), true);
  assert.equal(C.isEmptyProgress({ v: 3, srs: {}, vocab: [], dailyLogs: {}, examHistory: [] }), true);
  assert.equal(C.isEmptyProgress({ v: 3, srs: { a: {} } }), false);
  assert.equal(C.isEmptyProgress({ v: 3, vocab: [{}] }), true, 'custom cards are gone (1.0.34): an old copy holding only them has no progress');
  assert.equal(C.isEmptyProgress({ v: 3, dailyLogs: { '2026-10-24': {} } }), false);
  assert.equal(C.isEmptyProgress(null), true);
});

test('sameStamp compares timestamps by instant, not by spelling', () => {
  assert.equal(C.sameStamp('2026-10-26T03:00:00.123Z', '2026-10-26T03:00:00.123+00:00'), true);
  assert.equal(C.sameStamp('2026-10-26T03:00:00.123Z', '2026-10-26T03:00:00.124Z'), false);
  assert.equal(C.sameStamp(null, '2026-10-26T03:00:00.123Z'), false);
  assert.equal(C.sameStamp(null, null), false);
});
test('pullDecision: no cloud row → push', () => {
  assert.equal(C.pullDecision({ everSynced: true, pendingSync: false, lastPulledUpdatedAt: 'x' }, { updatedAt: '2026' }, null), 'push');
  assert.equal(C.pullDecision({ everSynced: false }, { updatedAt: '2026' }, null), 'push');
});
test('pullDecision: a device that never synced adopts the cloud unless the cloud is empty and local has progress', () => {
  const meta = { everSynced: false, pendingSync: true, lastPulledUpdatedAt: null };
  assert.equal(C.pullDecision(meta, { srs: { a: 1 } }, { state: { v: 3 }, updated_at: '2000-01-01T00:00:00Z' }), 'push');
  assert.equal(C.pullDecision(meta, { srs: { a: 1 } }, { state: { srs: { b: 1 } }, updated_at: '2000-01-01T00:00:00Z' }), 'adopt');
  assert.equal(C.pullDecision(meta, { v: 3 }, { state: { v: 3 }, updated_at: '2000-01-01T00:00:00Z' }), 'adopt');
});
test('pullDecision: cloud unchanged since our base → push when pending, otherwise idle', () => {
  const cloud = { state: { srs: {} }, updated_at: '2026-10-26T03:00:00.123+00:00' };
  const base = '2026-10-26T03:00:00.123Z';
  assert.equal(C.pullDecision({ everSynced: true, pendingSync: true, lastPulledUpdatedAt: base }, { updatedAt: '2026-10-26T04:00:00Z' }, cloud), 'push');
  assert.equal(C.pullDecision({ everSynced: true, pendingSync: false, lastPulledUpdatedAt: base }, { updatedAt: '2026-10-26T04:00:00Z' }, cloud), 'idle');
});
test('pullDecision: cloud moved since our base → adopt it, or conflict when local changes are pending; local clock is irrelevant', () => {
  const cloud = { state: { srs: {} }, updated_at: '2000-01-01T00:00:00Z' };   // "older" than local by its clock
  const base = '2026-10-26T03:00:00.123Z';
  assert.equal(C.pullDecision({ everSynced: true, pendingSync: false, lastPulledUpdatedAt: base }, { updatedAt: '2099-01-01T00:00:00Z' }, cloud), 'adopt');
  assert.equal(C.pullDecision({ everSynced: true, pendingSync: true, lastPulledUpdatedAt: base }, { updatedAt: '2099-01-01T00:00:00Z' }, cloud), 'conflict');
  assert.equal(C.pullDecision({ everSynced: true, pendingSync: false, lastPulledUpdatedAt: null }, { updatedAt: '2099-01-01T00:00:00Z' }, cloud), 'adopt');
});

test('mergeStates keeps the record answered later for each item, and takes the rest of a record-level union', () => {
  const local = { v: 3, updatedAt: '2026-10-26T10:00:00.000Z', settings: { dailyGoal: 5 }, srs: { 'v:a': { b: 2, last: '2026-10-26', n: 3, due: '2026-10-29' }, 'v:c': { b: 1, last: '2026-10-25', n: 1, due: '2026-10-26' } },
    dailyLogs: { '2026-10-26': { vocabCount: 10, grammarCount: 2 } }, mistakes: [{ id: 'm1', key: 'v:a' }], completedUnits: ['m1'], hidden: ['x1'], lessonSeen: ['m1:0', 'm3:2'], customGrammar: [{ id: 'c1' }], statsFmt: { 'v-meaning': { ok: 5, ng: 1 } } };
  const cloud = { v: 3, updatedAt: '2026-10-26T11:00:00.000Z', settings: { dailyGoal: 9 }, srs: { 'v:b': { b: 3, last: '2026-10-26', n: 4, due: '2026-11-01' }, 'v:c': { b: 2, last: '2026-10-26', n: 2, due: '2026-10-28' } },
    dailyLogs: { '2026-10-26': { vocabCount: 4, grammarCount: 8 }, '2026-10-25': { vocabCount: 3 } }, mistakes: [{ id: 'm2', key: 'v:b' }], completedUnits: ['m2'], hidden: ['x1', 'x2'], lessonSeen: ['m1:0', 'm2:1'], customGrammar: [{ id: 'c2' }], statsFmt: { 'v-meaning': { ok: 2, ng: 3 }, 'v-cloze': { ok: 1, ng: 0 } } };
  const m = C.mergeStates(local, cloud);
  assert.deepEqual(Object.keys(m.srs).sort(), ['v:a', 'v:b', 'v:c']);
  assert.equal(m.srs['v:c'].n, 2, 'the record answered later wins');
  assert.deepEqual(m.dailyLogs, { '2026-10-26': { vocabCount: 10, grammarCount: 8 }, '2026-10-25': { vocabCount: 3 } });
  assert.deepEqual(m.mistakes.map(x => x.id).sort(), ['m1', 'm2']);
  assert.deepEqual(m.completedUnits.sort(), ['m1', 'm2']); assert.deepEqual(m.hidden.sort(), ['x1', 'x2']);
  assert.deepEqual(m.lessonSeen.sort(), ['m1:0', 'm2:1', 'm3:2'], 'lesson sections already shown are a set: union');
  assert.deepEqual(m.customGrammar.map(x => x.id).sort(), ['c1', 'c2']);
  assert.deepEqual(m.statsFmt, { 'v-meaning': { ok: 5, ng: 3 }, 'v-cloze': { ok: 1, ng: 0 } });
  assert.equal(m.settings.dailyGoal, 9, 'scalar fields come from the side saved later');
  assert.ok(m.updatedAt > cloud.updatedAt, 'merged state carries a fresh stamp');
  assert.equal(local.srs['v:b'], undefined, 'inputs untouched');
});
test('mergeStates: a record with no `last` loses to one that has it; equal `last` → more answers wins', () => {
  const a = { updatedAt: '2026-10-26T10:00:00.000Z', srs: { k: { n: 5 }, j: { n: 2, last: '2026-10-26' } } };
  const b = { updatedAt: '2026-10-26T09:00:00.000Z', srs: { k: { n: 1, last: '2026-10-20' }, j: { n: 3, last: '2026-10-26' } } };
  const m = C.mergeStates(a, b);
  assert.equal(m.srs.k.n, 1); assert.equal(m.srs.j.n, 3);
});
test('mergeStates merges stageTests, unitAiNotes, same-day today quotas, deduplicates mistakes by key/prompt, and isEmptyProgress checks stageTests', () => {
  const a = {
    updatedAt: '2026-05-01T10:00:00.000Z',
    srs: { 'v-1': { b: 4, due: '2026-05-10', n: 5, ok: 4, ng: 1, s: 10, d: 5, last: '2026-05-01' } },
    stageTests: { pre: [{ date: '2026-04-29', correct: 16, total: 20, passed: true }], p1: [{ date: '2026-04-30', correct: 20, total: 30, passed: false }] },
    unitAiNotes: { m1: '筆記 A', m2: '舊 M2' },
    today: { date: '2026-05-01', newV: 8, newG: 1, newK: 3, newL: 0, newR: 0, newC: 2, newA: 5 },
    mistakes: [{ id: 'mk_device_a', key: 'v-1', kind: 'v', prompt: '食べる', chosen: '喝', answer: '吃', exp: '', ts: 100, count: 2, mastered: false }],
  };
  const b = {
    updatedAt: '2026-05-01T12:00:00.000Z',
    srs: { 'v-1': { b: 5, due: '2026-05-20', n: 6, ok: 5, ng: 1, s: 20, d: 4, last: '2026-05-01' } },
    stageTests: { pre: [{ date: '2026-05-01', correct: 19, total: 20, passed: true }, { date: '2026-04-29', correct: 16, total: 20, passed: true }] },
    unitAiNotes: { m2: '新 M2', m3: '筆記 B' },
    today: { date: '2026-05-01', newV: 3, newG: 2, newK: 1, newL: 1, newR: 0, newC: 0, newA: 2 },
    mistakes: [{ id: 'mk_device_b', key: 'v-1', kind: 'v', prompt: '食べる', chosen: '走', answer: '吃', exp: '', ts: 200, count: 1, mastered: false }],
  };
  const m = C.mergeStates(a, b);
  assert.equal(m.stageTests.pre.length, 2, 'deduplicates identical stageTest entries');
  assert.equal(m.stageTests.pre[0].date, '2026-05-01', 'newest stageTest stays first');
  assert.equal(m.stageTests.p1.length, 1, 'preserves stageTest from older side');
  assert.deepEqual(m.unitAiNotes, { m1: '筆記 A', m2: '新 M2', m3: '筆記 B' });
  assert.deepEqual(m.today, { date: '2026-05-01', newV: 8, newG: 2, newK: 3, newL: 1, newR: 0, newC: 2, newA: 5 });
  assert.equal(m.mistakes.length, 1, 'deduplicates mistakes across devices by key/prompt');
  assert.equal(m.mistakes[0].count, 2, 'keeps max mistake count');
  assert.equal(m.mistakes[0].mastered, true, 'marks mistake mastered when merged srs has no rl');
  assert.equal(C.isEmptyProgress({ stageTests: { pre: [{ date: '2026-05-01', correct: 18, total: 20, passed: true }] } }), false);
});
test('mergeStates unions same-day answered keys', () => {
  const a = { updatedAt: '2026-10-30T01:00:00.000Z', srs: {}, today: { date: '2026-10-30', newV: 1, ans: ['v:a', 'v:b'] } };
  const b = { updatedAt: '2026-10-30T02:00:00.000Z', srs: {}, today: { date: '2026-10-30', newV: 2, ans: ['v:b', 'g:c'] } };
  assert.deepEqual(C.mergeStates(a, b).today.ans, ['v:b', 'g:c', 'v:a']);
  assert.equal(C.mergeStates(a, b).today.newV, 2);
});

test('mergeStates keeps the older copy\'s answered list items on the merged list', () => {
  const older = { updatedAt: '2026-10-30T01:00:00.000Z', srs: {}, today: { date: '2026-10-30', ans: ['v:3', 'x:elsewhere'], plan: { lists: { newV: ['v:3', 'v:4'], kept: ['v:9'] } } } };
  const newer = { updatedAt: '2026-10-30T02:00:00.000Z', srs: {}, today: { date: '2026-10-30', ans: ['v:1'], plan: { lists: { newV: ['v:1', 'v:2'], kept: [] } } } };
  const plan = C.mergeStates(older, newer).today.plan;
  assert.deepEqual(plan.lists.newV, ['v:1', 'v:2']);   // the newer list itself
  assert.deepEqual(plan.lists.kept, ['v:3']);          // answered on the older list; v:4 was not answered, v:9 not today
  assert.deepEqual(newer.today.plan.lists.kept, []);   // inputs untouched
  const solo = { updatedAt: '2026-10-30T03:00:00.000Z', srs: {}, today: { date: '2026-10-30', ans: ['v:5'] } };
  assert.deepEqual(C.mergeStates(older, solo).today.plan.lists, older.today.plan.lists);   // only one copy has a list: kept as it is
});

test('mergeStates adds up 言靈 per device, gives a day bonus once and charges a purchase once', () => {
  const a = { updatedAt: '2026-11-07T01:00:00.000Z', srs: {}, koto: { sets: { phone: 3, pc: 1 }, days: ['2026-11-06'], gift: 0 }, owned: { clock: { paid: 1, on: '2026-11-06' } } };
  const b = { updatedAt: '2026-11-07T02:00:00.000Z', srs: {}, koto: { sets: { phone: 2, pc: 4 }, days: ['2026-11-06', '2026-11-07'], gift: 100 }, owned: { clock: { paid: 1, on: '2026-11-07' }, cactus: { paid: 6, on: '2026-11-07' } } };
  const m = C.mergeStates(a, b);
  assert.deepEqual(m.koto.sets, { phone: 3, pc: 4 });   // each device only ever adds to its own count
  assert.deepEqual(m.koto.days.slice().sort(), ['2026-11-06', '2026-11-07']);
  assert.equal(m.koto.gift, 100);
  assert.deepEqual(Object.keys(m.owned).sort(), ['cactus', 'clock']);
  assert.equal(m.owned.clock.paid, 1);
  assert.deepEqual(a.koto.sets, { phone: 3, pc: 1 }, 'inputs untouched');
});
test('mergeStates keeps the larger count of each day and device for answering and listening, and each letter once', () => {
  const a = { updatedAt: '2026-11-08T01:00:00.000Z', srs: {}, koto: { daySets: { '2026-11-08': { phone: 5, pc: 1 } }, days: [], listen: { '2026-11-08': { phone: 3 } }, mail: { opening: 10 }, sets: {}, gift: 0 } };
  const b = { updatedAt: '2026-11-08T02:00:00.000Z', srs: {}, koto: { daySets: { '2026-11-08': { phone: 4, pc: 6 }, '2026-11-07': { pc: 2 } }, days: ['2026-11-08'], listen: { '2026-11-07': { pc: 9 } }, mail: {}, sets: { pc: 3 }, gift: 0 } };
  const m = C.mergeStates(a, b);
  assert.deepEqual(m.koto.daySets, { '2026-11-08': { phone: 5, pc: 6 }, '2026-11-07': { pc: 2 } });
  assert.deepEqual(m.koto.listen, { '2026-11-08': { phone: 3 }, '2026-11-07': { pc: 9 } });
  assert.deepEqual(m.koto.mail, { opening: 10 });   // a letter's 言靈 once, whichever device took it
  assert.deepEqual(m.koto.sets, { pc: 3 });
  assert.deepEqual(m.koto.days, ['2026-11-08']);
  assert.deepEqual(a.koto.daySets, { '2026-11-08': { phone: 5, pc: 1 } }, 'inputs untouched');
});
test('mergeStates keeps what each one-time find brought once, whichever device found it', () => {
  const k = { daySets: {}, days: [], listen: {}, mail: {}, sets: {}, gift: 0 };
  const a = { updatedAt: '2026-11-07T01:00:00.000Z', srs: {}, koto: Object.assign({}, k, { found: { 'witch-2026': 100 } }) };
  const b = { updatedAt: '2026-11-07T02:00:00.000Z', srs: {}, koto: Object.assign({}, k) };
  assert.deepEqual(C.mergeStates(a, b).koto.found, { 'witch-2026': 100 });   // the newer copy never had it (an older build)
  const c = { updatedAt: '2026-11-07T03:00:00.000Z', srs: {}, koto: Object.assign({}, k, { found: { 'witch-2026': 100 } }) };
  assert.deepEqual(C.mergeStates(a, c).koto.found, { 'witch-2026': 100 });   // both devices caught the witch: 100, not 200
});
test('mergeStates keeps 言靈 and purchases that only one copy has', () => {
  const a = { updatedAt: '2026-11-07T01:00:00.000Z', srs: {}, koto: { sets: { phone: 2 }, days: [] }, owned: { fan: { paid: 8, on: '2026-11-07' } } };
  const b = { updatedAt: '2026-11-07T02:00:00.000Z', srs: {} };
  const m = C.mergeStates(a, b);
  assert.deepEqual(m.koto.sets, { phone: 2 });
  assert.deepEqual(m.owned, { fan: { paid: 8, on: '2026-11-07' } });
  const n = C.mergeStates({ updatedAt: '2026-11-07T01:00:00.000Z', srs: {} }, { updatedAt: '2026-11-07T02:00:00.000Z', srs: {} });
  assert.equal(n.koto, undefined); assert.equal(n.owned, undefined);   // neither copy had any: nothing invented
});
test('mergeStates: the town events done, people met and bus stops opened on either device are all kept', () => {
  const a = { updatedAt: '2026-11-10T10:00:00.000Z', town: { done: { 'm0-1': '2026-11-09' }, seen: { miku: 1 }, stops: {} } };
  const b = { updatedAt: '2026-11-10T09:00:00.000Z', town: { done: { 'm0-2': '2026-11-10' }, seen: { kenta: 1 }, stops: { station: 1 } } };
  const m = C.mergeStates(a, b);
  assert.deepEqual(m.town.done, { 'm0-1': '2026-11-09', 'm0-2': '2026-11-10' });
  assert.deepEqual(m.town.seen, { miku: 1, kenta: 1 });
  assert.deepEqual(m.town.stops, { station: 1 });
  assert.deepEqual(C.mergeStates({ updatedAt: '2026-11-10T10:00:00.000Z' }, b).town.done, { 'm0-2': '2026-11-10' }, 'an old save without town keeps the other side');
});
test('mergeStates: how often the hero chatted with each person keeps the larger count (2026-11-12)', () => {
  const a = { updatedAt: '2026-11-12T10:00:00.000Z', town: { done: {}, seen: {}, stops: {}, talks: { kenta: 3, miku: 1 } } };
  const b = { updatedAt: '2026-11-12T09:00:00.000Z', town: { done: {}, seen: {}, stops: {}, talks: { kenta: 5, tome: 2 } } };
  assert.deepEqual(C.mergeStates(a, b).town.talks, { kenta: 5, miku: 1, tome: 2 });
  assert.deepEqual(C.mergeStates(b, a).town.talks, { kenta: 5, miku: 1, tome: 2 });
  assert.deepEqual(C.mergeStates({ updatedAt: '2026-11-12T10:00:00.000Z', town: { done: {} } }, b).town.talks, { kenta: 5, tome: 2 });
});

test('a packed state opens to the same state, a tenth of the size or less; a plain one passes through', async () => {
  const big = { v: 3, updatedAt: '2026-11-11T01:00:00.000Z', srs: {} };
  for (let i = 0; i < 3000; i++) big.srs['v:n5a-' + i] = { b: 3, due: '2026-12-02', n: 7, ok: 6, ng: 1, st: 1, last: '2026-11-20', lapse: 0, intro: '2026-10-30', s: 21.4, d: 5.12, f: { 'v-meaning': [2, 0], 'v-cloze': [2, 0] } };
  const packed = await C.packState(big);
  assert.equal(C.isPacked(packed), true); assert.equal(C.isPacked(big), false); assert.equal(C.isPacked(null), false);
  assert.ok(JSON.stringify(packed).length * 10 <= JSON.stringify(big).length, `packed ${JSON.stringify(packed).length} of ${JSON.stringify(big).length}`);
  assert.deepEqual(await C.unpackState(packed), big);
  const plain = { v: 3, srs: { a: 1 } };
  assert.equal(await C.unpackState(plain), plain); assert.equal(await C.unpackState(null), null);
});

test('a pack shows n, resetAt, day and owned outside the gzip, and never packs an older pack inside', async () => {
  const s = { v: 3, srs: { a: {}, b: {} }, dailyLogs: { '2026-11-02': {}, '2026-11-10': {}, '2026-11-09': {} }, owned: { obake: { paid: 30 } }, resetAt: '2026-11-01T00:00:00.000Z' };
  const p = await C.packState(s);
  assert.deepEqual([p.n, p.resetAt, p.day, p.owned], [2, '2026-11-01T00:00:00.000Z', '2026-11-10', { obake: { paid: 30 } }]);
  const empty = await C.packState({ v: 3 });
  assert.deepEqual([empty.n, empty.resetAt, empty.day, empty.owned], [0, '', '', {}]);
  // an app before 1.9.0 kept a pulled pack's fields in its own progress: they are left out, the rest goes in
  const kept = Object.assign({}, p, { v: 3, srs: { c: {} } });
  const again = await C.packState(kept);
  assert.deepEqual(await C.unpackState(again), { v: 3, srs: { c: {} }, resetAt: s.resetAt, owned: s.owned });
  assert.deepEqual(C.withoutPack(kept), { v: 3, srs: { c: {} }, resetAt: s.resetAt, owned: s.owned });
});

test('mergeStates keeps a letter come or read on either device (the mailbox lives with the progress since 2026-11-11)', () => {
  const a = { v: 3, updatedAt: '2026-11-11T01:00:00.000Z', mail: { got: { room: '2026-11-01' }, read: { room: '2026-11-02' } } };
  const b = { v: 3, updatedAt: '2026-11-11T02:00:00.000Z', mail: { got: { room: '2026-11-01', opening: '2026-11-10' }, read: {} } };
  const m = C.mergeStates(a, b);
  assert.deepEqual(m.mail, { got: { room: '2026-11-01', opening: '2026-11-10' }, read: { room: '2026-11-02' } });
  assert.equal(C.mergeStates({ v: 3 }, { v: 3 }).mail, undefined);
});
