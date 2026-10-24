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
test('pickNewer', () => {
  const a = { updatedAt: '2026-10-24T01:00:00.000Z' }, b = { updatedAt: '2026-10-24T02:00:00.000Z' };
  assert.equal(C.pickNewer(a, b), 'cloud'); assert.equal(C.pickNewer(b, a), 'local');
  assert.equal(C.pickNewer(a, { ...a }), 'same');
  assert.equal(C.pickNewer({ updatedAt: null }, a), 'cloud');
  assert.equal(C.pickNewer(a, {}), 'local');
  assert.equal(C.pickNewer({ updatedAt: 12345 }, a), 'cloud');
  assert.equal(C.pickNewer({}, { updatedAt: undefined }), 'same');
});
test('buildPushPayload', () => {
  const p = C.buildPushPayload(base(), 'dev-1');
  assert.deepEqual(Object.keys(p).sort(), ['device_id', 'state', 'updated_at']);
  assert.equal(p.updated_at, '2026-10-24T01:00:00.000Z'); assert.equal(p.device_id, 'dev-1');
});
test('normalizeEmail', () => { assert.equal(C.normalizeEmail('  Foo@Example.COM '), 'foo@example.com'); });
