/* sync-core: pure helpers shared by the app (window.SyncCore) and Node tests (module.exports). No DOM, no network. */
(function (root) {
  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  // AI and TTS configs are device-local: they hold API keys and endpoints (e.g. a localhost Ollama URL),
  // so they never go to the cloud and a pulled copy never replaces the local ones.
  const LOCAL_ONLY = ['aiConfig', 'ttsConfig'];

  function stripSecrets(state) {
    const out = clone(state);
    LOCAL_ONLY.forEach(f => { if (f in out) out[f] = null; });
    return out;
  }

  // Returns a copy of `incoming` whose device-local configs are taken from `local` when `local` has them.
  function keepLocalSecrets(incoming, local) {
    const out = clone(incoming);
    LOCAL_ONLY.forEach(f => {
      if (local && local[f]) out[f] = clone(local[f]);
      else if (out[f] === null) delete out[f];   // let normalizeState fill the default instead of an explicit null
    });
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
