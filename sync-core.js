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

  // Record-level merge of two diverged copies (a conflict: both changed since the last common version).
  //   srs           per item: the record answered later (`last`), then the one with more answers
  //   dailyLogs     per day: the larger count of each kind
  //   statsFmt      per format: the larger ok / ng
  //   lists by id   (mistakes, custom cards, custom grammar/exam, exam history): union, the later copy's version
  //   id sets       (completedUnits, hidden): union
  //   everything else (settings, currentUnit, today, …): from the copy saved later
  function stampOf(s) { return (s && typeof s.updatedAt === 'string') ? s.updatedAt : ''; }
  function pickRec(x, y) {
    const lx = x.last || '', ly = y.last || '';
    if (lx !== ly) return lx > ly ? x : y;
    return (x.n || 0) >= (y.n || 0) ? x : y;
  }
  function mergeStates(a, b) {
    const [newer, older] = (stampOf(a) >= stampOf(b) ? [a, b] : [b, a]).map(clone);
    const out = Object.assign({}, older, newer);
    out.srs = {};
    new Set([...Object.keys(older.srs || {}), ...Object.keys(newer.srs || {})]).forEach(k => {
      const x = (newer.srs || {})[k], y = (older.srs || {})[k];
      out.srs[k] = !y ? x : !x ? y : pickRec(x, y);
    });
    out.dailyLogs = {};
    new Set([...Object.keys(older.dailyLogs || {}), ...Object.keys(newer.dailyLogs || {})]).forEach(d => {
      const x = (newer.dailyLogs || {})[d] || {}, y = (older.dailyLogs || {})[d] || {}; const e = {};
      new Set([...Object.keys(x), ...Object.keys(y)]).forEach(f => { e[f] = typeof x[f] === 'number' || typeof y[f] === 'number' ? Math.max(x[f] || 0, y[f] || 0) : (x[f] !== undefined ? x[f] : y[f]); });
      out.dailyLogs[d] = e;
    });
    out.statsFmt = {};
    new Set([...Object.keys(older.statsFmt || {}), ...Object.keys(newer.statsFmt || {})]).forEach(f => {
      const x = (newer.statsFmt || {})[f] || {}, y = (older.statsFmt || {})[f] || {};
      out.statsFmt[f] = { ok: Math.max(x.ok || 0, y.ok || 0), ng: Math.max(x.ng || 0, y.ng || 0) };
    });
    ['mistakes', 'vocab', 'customGrammar', 'customExam', 'examHistory'].forEach(f => {
      const by = new Map();
      (older[f] || []).forEach(x => by.set(x && x.id !== undefined ? x.id : JSON.stringify(x), x));
      (newer[f] || []).forEach(x => by.set(x && x.id !== undefined ? x.id : JSON.stringify(x), x));
      out[f] = [...by.values()];
    });
    ['completedUnits', 'hidden'].forEach(f => { out[f] = [...new Set([...(older[f] || []), ...(newer[f] || [])])]; });
    out.updatedAt = new Date().toISOString();
    return out;
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

  const SyncCore = { stripSecrets, keepLocalSecrets, sameStamp, pullDecision, mergeStates, buildPushPayload, normalizeEmail, isEmptyProgress };
  if (typeof module !== 'undefined' && module.exports) module.exports = SyncCore; else root.SyncCore = SyncCore;
})(typeof window !== 'undefined' ? window : globalThis);
