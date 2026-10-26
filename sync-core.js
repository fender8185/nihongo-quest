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

  // Two timestamps for the same instant, however they are spelled ('…Z' from JS, '…+00:00' from Postgres).
  function sameStamp(a, b) {
    if (!a || !b) return false;
    const x = new Date(a).getTime(), y = new Date(b).getTime();
    return Number.isFinite(x) && x === y;
  }

  // What pull should do with the cloud row (`cloud` is null when the user has no row yet).
  //   push     – nothing in the cloud, or it is still the version this device last saw and local changes wait
  //   idle     – cloud unchanged and nothing to upload
  //   adopt    – another device moved the cloud and this one has no unsynced changes (or never synced)
  //   conflict – another device moved the cloud AND this device has unsynced changes; the caller keeps the
  //              cloud and snapshots the local copy. Device clocks play no part in this.
  function pullDecision(meta, local, cloud) {
    meta = meta || {};
    if (!cloud) return 'push';
    if (!meta.everSynced) return (isEmptyProgress(cloud.state) && !isEmptyProgress(local)) ? 'push' : 'adopt';
    const moved = !sameStamp(cloud.updated_at, meta.lastPulledUpdatedAt);
    if (!moved) return meta.pendingSync ? 'push' : 'idle';
    return meta.pendingSync ? 'conflict' : 'adopt';
  }

  function buildPushPayload(state, deviceId) {
    return { state: state, updated_at: state.updatedAt, device_id: deviceId };
  }

  function normalizeEmail(s) { return String(s || '').trim().toLowerCase(); }

  // True when a state holds no learning progress worth protecting (fresh install or wiped account).
  function isEmptyProgress(s) {
    if (!s) return true;
    const n = (x) => (Array.isArray(x) ? x.length : (x && typeof x === 'object') ? Object.keys(x).length : 0);
    return !(n(s.srs) || n(s.vocab) || n(s.dailyLogs) || n(s.examHistory));
  }

  const SyncCore = { stripSecrets, keepLocalSecrets, sameStamp, pullDecision, buildPushPayload, normalizeEmail, isEmptyProgress };
  if (typeof module !== 'undefined' && module.exports) module.exports = SyncCore; else root.SyncCore = SyncCore;
})(typeof window !== 'undefined' ? window : globalThis);
