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
test('isEmptyProgress is true only when srs, vocab, dailyLogs and examHistory are all empty', () => {
  assert.equal(C.isEmptyProgress({ v: 3 }), true);
  assert.equal(C.isEmptyProgress({ v: 3, srs: {}, vocab: [], dailyLogs: {}, examHistory: [] }), true);
  assert.equal(C.isEmptyProgress({ v: 3, srs: { a: {} } }), false);
  assert.equal(C.isEmptyProgress({ v: 3, vocab: [{}] }), false);
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
