/* sync-core: pure helpers shared by the app (window.SyncCore) and Node tests (module.exports). No DOM, no network. */
(function (root) {
  const AI_KEYS = ['geminiKey', 'openaiKey'];
  const TTS_KEYS = ['deepgramKey', 'openaiKey'];

  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  // Deep-copies state and blanks the API keys so they never leave the device.
  function stripSecrets(state) {
    const out = clone(state);
    if (out.aiConfig) AI_KEYS.forEach(k => { if (out.aiConfig[k]) out.aiConfig[k] = ''; });
    if (out.ttsConfig) TTS_KEYS.forEach(k => { if (out.ttsConfig[k]) out.ttsConfig[k] = ''; });
    return out;
  }

  // Returns a copy of `incoming` whose blank/missing API keys are filled from `local`.
  function keepLocalSecrets(incoming, local) {
    const out = clone(incoming);
    const fill = (field, keys) => {
      const loc = local && local[field];
      if (!loc) return;
      if (!out[field]) out[field] = {};
      keys.forEach(k => { if (!out[field][k] && loc[k]) out[field][k] = loc[k]; });
    };
    fill('aiConfig', AI_KEYS);
    fill('ttsConfig', TTS_KEYS);
    return out;
  }

  function stamp(s) { return (s && typeof s.updatedAt === 'string') ? s.updatedAt : ''; }

  // Last-write-wins on ISO timestamps; anything that is not a string counts as oldest.
  function pickNewer(local, cloud) {
    const a = stamp(local), b = stamp(cloud);
    if (a === b) return 'same';
    return a > b ? 'local' : 'cloud';
  }

  function buildPushPayload(state, deviceId) {
    return { state: state, updated_at: state.updatedAt, device_id: deviceId };
  }

  function normalizeEmail(s) { return String(s || '').trim().toLowerCase(); }

  const SyncCore = { stripSecrets, keepLocalSecrets, pickNewer, buildPushPayload, normalizeEmail };
  if (typeof module !== 'undefined' && module.exports) module.exports = SyncCore; else root.SyncCore = SyncCore;
})(typeof window !== 'undefined' ? window : globalThis);
