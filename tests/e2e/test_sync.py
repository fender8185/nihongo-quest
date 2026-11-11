"""Task 8: Sync module — off mode, first-sync-takes-cloud, debounced push w/o secrets, logout race, bad cloud state, deferral."""
import json, os, subprocess, sys, time
sys.path.insert(0, os.path.dirname(__file__))
from cdp import Browser

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
PORT = 8794
URL = f"http://127.0.0.1:{PORT}/"
READY = "typeof state === 'object' && !!state.updatedAt && typeof Sync === 'object'"

FAKE = """
window.__fake = (function () {
  let session = null, row = null; const listeners = [], calls = [];
  const client = {
    auth: {
      onAuthStateChange(cb) { listeners.push(cb); return { data: { subscription: { unsubscribe() {} } } }; },
      async getSession() { return { data: { session } } },
      async signInWithOtp({ email }) { calls.push(['otp', email]); return { error: null }; },
      async signOut() { session = null; listeners.forEach(cb => cb('SIGNED_OUT', null)); return { error: null }; },
      async verifyOtp({ email, token, type }) { calls.push(['verify', email, token, type]); return { error: null }; }
    },
    from() { return {
      // only the columns asked for (1.0.38: a pull asks for updated_at first and downloads the state only when it moved)
      select(cols) { calls.push(['select', cols]); return { eq() { return { async maybeSingle() {
        if (!row) return { data: null, error: null };
        const d = {}; String(cols).split(',').map(c => c.trim()).forEach(c => { d[c] = row[c]; }); return { data: d, error: null }; } }; } }; },
      async upsert(p) { calls.push(['upsert', p]); row = p; return { error: null }; },
      // conditional write: UPDATE ... WHERE user_id = ? AND updated_at = ? RETURNING updated_at (same instant, any spelling)
      update(p) { return { eq(k1, v1) { return { eq(k2, v2) { return { async select() {
        const hit = row && row[k1] === v1 && new Date(row[k2]).getTime() === new Date(v2).getTime();
        calls.push([hit ? 'update' : 'update-miss', p]);
        if (hit) { row = Object.assign({}, row, p); return { data: [{ updated_at: row.updated_at }], error: null }; }
        return { data: [], error: null }; } }; } }; } }; },
      delete() { return { async eq() { row = null; calls.push(['delete']); return { error: null }; } }; }
    }; }
  };
  return { client, calls, setRow(r) { row = r; }, getRow() { return row; },
    login(email, id) { session = { user: { id: id || 'u1', email } }; listeners.forEach(cb => cb('SIGNED_IN', session)); } };
})(); true"""

def boot(b, extra=()):
    return b.run([("nav", URL), ("wait", READY), ("eval", FAKE),
                  ("eval", "state.ttsConfig = { engine: 'cloud', googleKey: 'LOCALKEY' }; saveState(); true"),
                  ("eval", "new Promise(r => setTimeout(r, 50)).then(() => Sync.init({ client: __fake.client })).then(() => Sync.status)")] + list(extra))

def sleep_js(ms): return ("eval", f"new Promise(r => setTimeout(r, {ms}))")

def test_without_config_sync_is_off(b):
    v = b.run([("nav", URL), ("wait", READY), ("eval", "Sync.status")])[0]
    assert v == "off", v

def test_first_sync_on_fresh_device_takes_cloud_even_if_local_newer(b):
    out = boot(b, [
        ("eval", "__fake.setRow({ user_id: 'u1', state: { v: 3, updatedAt: '2000-01-01T00:00:00.000Z', settings: { loadCap: 55 }, ttsConfig: { engine: 'cloud', googleKey: '' } }, updated_at: '2000-01-01T00:00:00.000Z' }); __fake.login('a@b.c'); true"),
        ("wait", "Sync.status === 'idle'"),
        ("eval", "JSON.stringify({ goal: state.settings.loadCap, key: state.ttsConfig.googleKey, ever: Sync.meta.everSynced })"),
    ])
    assert out[-1] == '{"goal":55,"key":"LOCALKEY","ever":true}', out[-1]

def test_save_pushes_after_debounce_without_secrets(b):
    out = boot(b, [
        ("eval", "__fake.login('a@b.c'); true"), ("wait", "Sync.status === 'idle'"),
        ("eval", "state.settings.loadCap = 66; saveState(); Sync.status"),
        ("wait", "__fake.getRow() && __fake.getRow().state.settings.loadCap === 66"),
        ("eval", "JSON.stringify({ ai: 'aiConfig' in __fake.getRow().state, tts: __fake.getRow().state.ttsConfig, uid: __fake.getRow().user_id, up: __fake.getRow().updated_at === state.updatedAt, st: Sync.status })"),
    ])
    assert out[-2] == "pending", out[-2]
    assert out[-1] == '{"ai":false,"tts":null,"uid":"u1","up":true,"st":"idle"}', out[-1]

def test_logout_during_debounce_cancels_push(b):
    out = boot(b, [
        ("eval", "__fake.login('a@b.c'); true"), ("wait", "Sync.status === 'idle'"),
        ("eval", "const n0 = __fake.calls.filter(c => c[0] === 'upsert').length; state.settings.loadCap = 99; saveState(); Sync.signOut().then(() => n0)"),
        sleep_js(2600),
        ("eval", "JSON.stringify({ upserts: __fake.calls.filter(c => c[0] === 'upsert').length, st: Sync.status })"),
    ])
    n0 = out[-3]
    assert out[-1] == '{"upserts":%d,"st":"off"}' % n0, (out[-1], n0)

def test_unreadable_or_bare_cloud_state_does_not_break_app(b):
    out = boot(b, [
        ("eval", "__fake.setRow({ user_id: 'u1', state: { v: 3, updatedAt: '2099-01-01T00:00:00.000Z' }, updated_at: '2099-01-01T00:00:00.000Z' }); __fake.login('a@b.c'); true"),
        ("wait", "Sync.status === 'idle' || Sync.status === 'error'"),
        ("eval", "JSON.stringify({ st: Sync.status, srs: JSON.stringify(state.srs), key: state.ttsConfig.googleKey, nav: document.querySelectorAll('#sideNav .nav-item').length })"),
    ])
    assert out[-1] == '{"st":"idle","srs":"{}","key":"LOCALKEY","nav":7}', out[-1]

def test_pull_is_deferred_while_practicing(b):
    out = boot(b, [
        ("eval", "__fake.login('a@b.c'); true"), ("wait", "Sync.status === 'idle'"),
        ("eval", "SESSION = { fake: true }; __fake.setRow({ user_id: 'u1', state: Object.assign(JSON.parse(JSON.stringify(state)), { updatedAt: '2099-01-01T00:00:00.000Z', settings: Object.assign({}, state.settings, { loadCap: 123 }) }), updated_at: '2099-01-01T00:00:00.000Z' }); Sync.pull().then(() => state.settings.loadCap)"),
        ("eval", "SESSION = null; Sync.flushDeferred(); true"),
        ("wait", "state.settings.loadCap === 123"),
        ("eval", "state.settings.loadCap"),
    ])
    assert out[-3] != 123, "pull applied cloud state during a session"
    assert out[-1] == 123

def test_switching_account_resets_device_binding_and_adopts_new_cloud(b):
    out = boot(b, [
        ("eval", "__fake.login('a@b.c'); true"), ("wait", "Sync.status === 'idle' && Sync.meta.everSynced"),
        ("eval", "JSON.stringify({ uid: Sync.meta.userId, ever: Sync.meta.everSynced })"),
        ("eval", "Sync.signOut().then(() => JSON.stringify({ st: Sync.status, pend: Sync.meta.pendingSync }))"),
        ("eval", "__fake.setRow({ user_id: 'u2', state: { v: 3, updatedAt: '2000-01-01T00:00:00.000Z', settings: { loadCap: 77 } }, updated_at: '2000-01-01T00:00:00.000Z' }); __fake.login('b@c.d', 'u2'); true"),
        ("wait", "Sync.status === 'idle' && Sync.meta.userId === 'u2'"),
        ("eval", "JSON.stringify({ goal: state.settings.loadCap, uid: Sync.meta.userId, ever: Sync.meta.everSynced, key: state.ttsConfig.googleKey })"),
    ])
    assert out[-4] == '{"uid":"u1","ever":true}', out[-4]
    assert out[-3] == '{"st":"off","pend":false}', out[-3]
    assert out[-1] == '{"goal":77,"uid":"u2","ever":true,"key":"LOCALKEY"}', out[-1]

def test_pull_runs_after_exam_is_finished_but_still_on_result_screen(b):
    out = boot(b, [
        ("eval", "__fake.login('a@b.c'); true"), ("wait", "Sync.status === 'idle'"),
        ("eval", "EXAM = { finished: true }; __fake.setRow({ user_id: 'u1', state: Object.assign(JSON.parse(JSON.stringify(state)), { updatedAt: '2099-01-01T00:00:00.000Z', settings: Object.assign({}, state.settings, { loadCap: 321 }) }), updated_at: '2099-01-01T00:00:00.000Z' }); Sync.pull().then(() => state.settings.loadCap)"),
    ])
    assert out[-1] == 321, out[-1]

def test_first_sync_keeps_real_local_progress_over_empty_cloud(b):
    out = boot(b, [
        ("eval", "state.srs['v:n5a-001'] = { b: 1, due: todayStr(), n: 1, ok: 1, ng: 0, last: todayStr() }; saveState(); true"),
        ("eval", "__fake.setRow({ user_id: 'u1', state: { v: 3, updatedAt: '2000-01-01T00:00:00.000Z' }, updated_at: '2000-01-01T00:00:00.000Z' }); __fake.login('a@b.c'); true"),
        ("wait", "Sync.status === 'idle' && Sync.meta.everSynced"),
        ("eval", "JSON.stringify({ local: Object.keys(state.srs).length, cloud: Object.keys(__fake.getRow().state.srs || {}).length })"),
    ])
    assert out[-1] == '{"local":1,"cloud":1}', out[-1]

# 1.0.47: no pre-cloud snapshot any more; a first sync takes a cloud that has progress as it is
def test_first_sync_adopts_a_cloud_with_progress_over_local(b):
    out = boot(b, [
        ("eval", "state.srs['v:n5a-001'] = { b: 1, due: todayStr(), n: 1, ok: 1, ng: 0, last: todayStr() }; saveState(); true"),
        ("eval", "__fake.setRow({ user_id: 'u1', state: { v: 3, updatedAt: '2000-01-01T00:00:00.000Z', srs: { 'v:n5a-002': { b: 1, due: '2000-01-02', n: 1, ok: 1, ng: 0, last: '2000-01-01' } } }, updated_at: '2000-01-01T00:00:00.000Z' }); __fake.login('a@b.c'); true"),
        ("wait", "Sync.status === 'idle' && Sync.meta.everSynced"),
        ("eval", "JSON.stringify({ now: Object.keys(state.srs), cloud: Object.keys(__fake.getRow().state.srs) })"),
    ])
    assert out[-1] == '{"now":["v:n5a-002"],"cloud":["v:n5a-002"]}', out[-1]

def test_token_refresh_does_not_mask_error_status(b):
    out = boot(b, [
        ("eval", "__fake.login('a@b.c'); true"), ("wait", "Sync.status === 'idle'"),
        ("eval", "Sync.setStatus('error'); __fake.login('a@b.c'); Sync.status"),
    ])
    assert out[-1] == "error", out[-1]

def test_manual_push_with_null_updated_at_still_sends_a_timestamp(b):
    out = boot(b, [
        ("eval", "__fake.login('a@b.c'); true"), ("wait", "Sync.status === 'idle'"),
        ("eval", "state.updatedAt = null; Sync.push().then(() => JSON.stringify({ up: typeof __fake.getRow().updated_at, st: Sync.status }))"),
    ])
    assert out[-1] == '{"up":"string","st":"idle"}', out[-1]

# ---- 2026-10-26: a push only lands when the cloud row is still the one we last saw ----
OTHER = "Object.assign(JSON.parse(JSON.stringify(state)), { updatedAt: '2099-01-01T00:00:00.000Z', settings: Object.assign({}, state.settings, { loadCap: 123 }) })"
def test_push_uses_a_conditional_update_once_the_device_has_synced(b):
    out = boot(b, [
        ("eval", "__fake.login('a@b.c'); true"), ("wait", "Sync.status === 'idle'"),
        ("eval", "state.settings.loadCap = 66; saveState(); true"),
        ("wait", "__fake.getRow() && __fake.getRow().state.settings.loadCap === 66"),
        ("eval", "JSON.stringify(__fake.calls.filter(c => c[0] !== 'otp' && c[0] !== 'select').map(c => c[0]))"),
    ])
    assert out[-1] == '["upsert","update"]', out[-1]

# 1.8.2 (2026-11-11): a device whose progress went empty (it could not read its own and started over) once sent the empty
# progress up over the cloud's, and every device then took it. An empty progress never goes over a cloud that has some: the device
# takes the cloud's. Only 重設所有進度 sends an empty one on purpose.
def test_an_empty_progress_never_replaces_the_clouds_and_only_a_reset_does(b):
    rec = "{ 'v:n5a-001': { b: 3, due: '2026-12-01', n: 4, ok: 4, ng: 0, last: '2026-11-01' } }"
    out = boot(b, [
        ("eval", f"__fake.setRow({{ user_id: 'u1', state: {{ v: 3, updatedAt: '2026-11-10T00:00:00.000Z', srs: {rec} }}, updated_at: '2026-11-10T00:00:00.000Z' }}); __fake.login('a@b.c'); true"),
        ("wait", "Sync.status === 'idle' && !!state.srs['v:n5a-001']"),
        ("eval", "__fake.calls.length = 0; state = normalizeState(defaultState()); saveState(); Sync.push(); true"),   # this device lost its progress
        ("wait", "Sync.status === 'idle' && __fake.calls.some(c => c[0] === 'select')"),
        ("eval", "JSON.stringify({ writes: __fake.calls.filter(c => c[0] === 'update' || c[0] === 'upsert').length, cloud: Object.keys(__fake.getRow().state.srs || {}).length, back: !!state.srs['v:n5a-001'] })"),
        ("eval", "__fake.calls.length = 0; Sync.allowEmpty = true; state = normalizeState(defaultState()); saveState(); Sync.push(); true"),   # 重設所有進度
        ("wait", "__fake.calls.some(c => c[0] === 'update' || c[0] === 'upsert')"),
        ("eval", "JSON.stringify({ cloud: Object.keys(__fake.getRow().state.srs || {}).length, allow: !!Sync.allowEmpty })"),
    ])
    assert out[-3] == '{"writes":0,"cloud":1,"back":true}', out   # nothing written; this device took the cloud's progress back
    assert out[-1] == '{"cloud":0,"allow":false}', out   # a reset does go up, once

def test_stale_device_does_not_overwrite_progress_made_elsewhere(b):
    out = boot(b, [
        ("eval", "__fake.login('a@b.c'); true"), ("wait", "Sync.status === 'idle'"),
        ("eval", f"__fake.setRow({{ user_id: 'u1', state: {OTHER}, updated_at: '2099-01-01T00:00:00.000Z' }}); state.settings.loadCap = 5; saveState(); true"),
        ("wait", "Sync.status === 'idle' && state.settings.loadCap === 123"),
        ("eval", "JSON.stringify({ cloud: __fake.getRow().state.settings.loadCap, local: state.settings.loadCap, pend: Sync.meta.pendingSync, miss: __fake.calls.filter(c => c[0] === 'update-miss').length })"),
    ])
    assert out[-1] == '{"cloud":123,"local":123,"pend":false,"miss":1}', out[-1]

def test_cloud_changed_elsewhere_is_adopted_even_when_its_clock_is_behind(b):
    out = boot(b, [
        ("eval", "__fake.login('a@b.c'); true"), ("wait", "Sync.status === 'idle'"),
        ("eval", "__fake.setRow({ user_id: 'u1', state: Object.assign(JSON.parse(JSON.stringify(state)), { updatedAt: '2000-01-01T00:00:00.000Z', settings: Object.assign({}, state.settings, { loadCap: 123 }) }), updated_at: '2000-01-01T00:00:00.000Z' }); Sync.pull().then(() => JSON.stringify({ goal: state.settings.loadCap, st: Sync.status }))"),
    ])
    assert out[-1] == '{"goal":123,"st":"idle"}', out[-1]

def test_row_deleted_elsewhere_is_recreated_without_looping(b):
    out = boot(b, [
        ("eval", "__fake.login('a@b.c'); true"), ("wait", "Sync.status === 'idle'"),
        ("eval", "__fake.setRow(null); state.settings.loadCap = 42; saveState(); true"),
        ("wait", "Sync.status === 'idle' && __fake.getRow() && __fake.getRow().state.settings.loadCap === 42"),
        ("eval", "JSON.stringify({ miss: __fake.calls.filter(c => c[0] === 'update-miss').length, st: Sync.status })"),
    ])
    assert out[-1] == '{"miss":1,"st":"idle"}', out[-1]

def test_conflict_during_a_session_waits_and_never_overwrites_the_cloud(b):
    out = boot(b, [
        ("eval", "__fake.login('a@b.c'); true"), ("wait", "Sync.status === 'idle'"),
        ("eval", f"SESSION = {{ fake: true }}; __fake.setRow({{ user_id: 'u1', state: {OTHER}, updated_at: '2099-01-01T00:00:00.000Z' }}); state.settings.loadCap = 5; saveState(); state.settings.loadCap = 6; saveState(); true"),
        sleep_js(2600),
        ("eval", "state.settings.loadCap = 7; saveState(); true"),
        sleep_js(2600),
        ("eval", "JSON.stringify({ local: state.settings.loadCap, cloud: __fake.getRow().state.settings.loadCap, st: Sync.status, net: __fake.calls.filter(c => c[0] === 'update-miss').length })"),
        ("eval", "SESSION = null; Sync.flushDeferred(); true"),
        ("wait", "Sync.status === 'idle' && state.settings.loadCap === 123"),
        ("eval", "JSON.stringify({ cloud: __fake.getRow().state.settings.loadCap })"),
    ])
    assert out[-3] == '{"local":7,"cloud":123,"st":"pending","net":0}', out[-3]   # 1.0.38: nothing goes up during a set
    assert out[-1] == '{"cloud":123}', out[-1]

# 1.0.38: a return to the app asks only for the cloud's stamp; the progress (up to ~1 MB at the end of N3) comes down when it moved
def test_a_pull_downloads_the_progress_only_when_the_cloud_changed(b):
    out = boot(b, [
        ("eval", "__fake.login('a@b.c'); true"), ("wait", "Sync.status === 'idle' && Sync.meta.everSynced"),
        ("eval", "__fake.calls.length = 0; Sync.pull().then(() => JSON.stringify({ sel: __fake.calls.filter(c => c[0] === 'select').map(c => c[1]), st: Sync.status }))"),
        ("eval", f"__fake.calls.length = 0; __fake.setRow({{ user_id: 'u1', state: {OTHER}, updated_at: '2099-01-01T00:00:00.000Z' }}); Sync.pull().then(() => JSON.stringify({{ sel: __fake.calls.filter(c => c[0] === 'select').map(c => c[1]), goal: state.settings.loadCap, st: Sync.status }}))"),
    ])
    assert out[-2] == '{"sel":["updated_at"],"st":"idle"}', out[-2]
    assert out[-1] == '{"sel":["updated_at","state, updated_at"],"goal":123,"st":"idle"}', out[-1]

# 1.0.38: answers during a practice set or exam go up once, when it ends (or when the app goes to the background), not 2 s after each
def test_a_practice_set_goes_up_once_at_its_end_or_when_the_app_is_hidden(b):
    out = boot(b, [
        ("eval", "__fake.login('a@b.c'); true"), ("wait", "Sync.status === 'idle' && Sync.meta.everSynced"),
        ("eval", "__fake.calls.length = 0; SESSION = { fake: true }; state.settings.loadCap = 11; saveState(); state.settings.loadCap = 12; saveState(); true"),
        sleep_js(2600),
        ("eval", "JSON.stringify({ sent: __fake.calls.filter(c => c[0] !== 'select').length, st: Sync.status, pend: Sync.meta.pendingSync })"),
        ("eval", "SESSION = null; Sync.flushDeferred(); true"),
        ("wait", "Sync.status === 'idle' && __fake.getRow().state.settings.loadCap === 12"),
        ("eval", "JSON.stringify(__fake.calls.map(c => c[0] === 'select' ? c[1] : c[0]))"),
        ("eval", "__fake.calls.length = 0; SESSION = { fake: true }; state.settings.loadCap = 13; saveState(); Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); document.dispatchEvent(new Event('visibilitychange')); true"),
        ("wait", "__fake.getRow().state.settings.loadCap === 13"),
        ("eval", "delete document.hidden; SESSION = null; JSON.stringify(__fake.calls.map(c => c[0]))"),
    ])
    assert out[-5] == '{"sent":0,"st":"pending","pend":true}', out[-5]
    assert out[-3] == '["updated_at","update"]', out[-3]   # the set's end: a stamp check, then one upload
    assert out[-1] == '["update"]', out[-1]

def test_conflict_merges_both_sides_record_by_record_and_uploads_the_merge(b):
    out = boot(b, [
        ("eval", "__fake.login('a@b.c'); true"), ("wait", "Sync.status === 'idle'"),
        ("eval", "const A = REG.grammar[0].key, B = REG.grammar[1].key; srsAnswer(A, true); const cloudState = JSON.parse(JSON.stringify(state)); delete cloudState.srs[A]; cloudState.srs[B] = { b: 1, due: '2099-01-01', n: 1, ok: 1, ng: 0, s: 3, d: 5, last: todayStr() }; cloudState.updatedAt = '2099-01-01T00:00:00.000Z'; __fake.setRow({ user_id: 'u1', state: cloudState, updated_at: '2099-01-01T00:00:00.000Z' }); saveState(); window.__AB = [A, B]; true"),
        ("wait", "Sync.status === 'idle' && !!state.srs[__AB[1]] && __fake.getRow().state.srs[__AB[0]] && __fake.getRow().state.srs[__AB[1]]"),
        ("eval", "JSON.stringify({ local: [!!state.srs[__AB[0]], !!state.srs[__AB[1]]], cloud: [!!__fake.getRow().state.srs[__AB[0]], !!__fake.getRow().state.srs[__AB[1]]], pend: Sync.meta.pendingSync })"),
    ])
    assert out[-1] == '{"local":[true,true],"cloud":[true,true],"pend":false}', out[-1]

def test_conflict_merge_redoes_todays_list_from_the_merged_progress(b):
    # this device made today's list before the pull; the other device learned X last night
    out = boot(b, [
        ("eval", "__fake.login('a@b.c'); true"), ("wait", "Sync.status === 'idle'"),
        ("eval", """(() => { state.stage = 'main'; state.kanaKnown = true; state.introSeen = true; state.storyV = 9; state.startChosen = true; state.currentUnit = 'm1';
          delete state.today.plan; dailyPlan(); const X = state.today.plan.lists.newV[0], Y = state.today.plan.lists.newV[1];
          srsAnswer(Y, true);
          const cloud = JSON.parse(JSON.stringify(state)); const y = addDays(todayStr(), -1);
          cloud.srs[X] = { b: 2, s: 2.5, d: 5, due: addDays(todayStr(), 2), n: 1, ok: 1, ng: 0, last: y, intro: y }; delete cloud.srs[Y];
          cloud.today = { date: todayStr(), newV: 0, newG: 0, newK: 0, newL: 0, newR: 0, newC: 0, newA: 0 };
          cloud.updatedAt = new Date(Date.now() - 60000).toISOString();   // older than this copy: the merge keeps this device's today
          __fake.setRow({ user_id: 'u1', state: cloud, updated_at: cloud.updatedAt }); saveState(); window.__XY = [X, Y]; return true; })()"""),
        ("wait", "Sync.status === 'idle' && !!state.srs[__XY[0]] && !Sync.meta.pendingSync"),
        ("eval", """JSON.stringify({ planned: planListKeys(state.today.plan).includes(__XY[0]), cloudPlanned: planListKeys(__fake.getRow().state.today.plan).includes(__XY[0]),
          kept: todayPlanKeys().includes(__XY[1]), done: dayProgress().done })"""),
    ])
    r = json.loads(out[-1])
    assert r['planned'] is False and r['cloudPlanned'] is False, r   # learned elsewhere: no longer one of today's new words, here or in the upload
    assert r['kept'] is True and r['done'] >= 1, r   # what this device answered stays on the list, done

# 1.0.47: snapshots are gone; the database an earlier copy left behind is deleted on the next launch
def test_old_snapshots_are_deleted_and_no_new_ones_are_taken(b):
    seed = """new Promise(res => { const r = indexedDB.open('nihongo_quest_snapshots', 1);
      r.onupgradeneeded = (e) => e.target.result.createObjectStore('snaps');
      r.onsuccess = (e) => { const db = e.target.result; const t = db.transaction('snaps', 'readwrite'); t.objectStore('snaps').put('{}', '2026-11-04'); t.oncomplete = () => { db.close(); res(true); }; }; })"""
    check = """(async () => {
      let dbs = [];
      for (let i = 0; i < 20; i++) { dbs = (await indexedDB.databases()).map(d => d.name); if (!dbs.includes('nihongo_quest_snapshots')) break; await new Promise(r => setTimeout(r, 100)); }
      openSettings('data'); const list = !!document.getElementById('snapList'); const body = document.querySelector('.modal').textContent; closeModal(true);
      return JSON.stringify({ db: dbs.includes('nihongo_quest_snapshots'), list, word: body.includes('快照'), gone: [typeof Snapshots, typeof dailySnapshot], field: 'lastSnapshot' in normalizeState({ lastSnapshot: '2026-11-04' }) });
    })()"""
    out = b.run([("nav", URL), ("wait", READY), ("eval", seed), ("nav", URL), ("wait", READY), ("eval", check)])
    r = __import__('json').loads(out[-1])
    assert r == {'db': False, 'list': False, 'word': False, 'gone': ['undefined', 'undefined'], 'field': False}, r

# 1.0.34 review: a device still on the old copy (every device on its first launch after a release) merges a cloud that holds a
# record of a word it does not know (a later release's, from another device): the record and its notebook entry stay
def test_a_word_this_copy_does_not_know_survives_a_conflict_merge(b):
    out = boot(b, [
        ("eval", "__fake.login('a@b.c'); true"), ("wait", "Sync.status === 'idle'"),
        ("eval", """(() => { const cloud = JSON.parse(JSON.stringify(state)); const t = todayStr();
          cloud.srs['v:n2a-001'] = { b: 2, due: addDays(t, 3), n: 3, ok: 3, ng: 0, s: 3, d: 5, last: t };
          cloud.mistakes = (cloud.mistakes || []).concat([{ id: 'mk_future', key: 'v:n2a-001', cat: '單字', prompt: '未來的字', answer: 'x', count: 1 }]);
          cloud.updatedAt = '2099-01-01T00:00:00.000Z'; __fake.setRow({ user_id: 'u1', state: cloud, updated_at: cloud.updatedAt });
          state.settings.loadCap = 77; saveState(); return true; })()"""),
        ("wait", "Sync.status === 'idle' && !Sync.meta.pendingSync && __fake.getRow().updated_at !== '2099-01-01T00:00:00.000Z'"),
        ("eval", "JSON.stringify({ cloud: Boolean(__fake.getRow().state.srs['v:n2a-001']), note: (__fake.getRow().state.mistakes || []).some(m => m.id === 'mk_future'), local: Boolean(state.srs['v:n2a-001']) })"),
    ])
    assert out[-1] == '{"cloud":true,"note":true,"local":true}', out[-1]

if __name__ == "__main__":
    srv = subprocess.Popen([sys.executable, "-m", "http.server", str(PORT), "--bind", "127.0.0.1"], cwd=ROOT, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(0.8)
    tests = [test_without_config_sync_is_off, test_first_sync_on_fresh_device_takes_cloud_even_if_local_newer,
             test_save_pushes_after_debounce_without_secrets, test_logout_during_debounce_cancels_push,
             test_unreadable_or_bare_cloud_state_does_not_break_app, test_pull_is_deferred_while_practicing,
             test_switching_account_resets_device_binding_and_adopts_new_cloud,
             test_pull_runs_after_exam_is_finished_but_still_on_result_screen, test_first_sync_keeps_real_local_progress_over_empty_cloud,
             test_first_sync_adopts_a_cloud_with_progress_over_local, test_token_refresh_does_not_mask_error_status, test_a_word_this_copy_does_not_know_survives_a_conflict_merge,
             test_manual_push_with_null_updated_at_still_sends_a_timestamp,
             test_push_uses_a_conditional_update_once_the_device_has_synced, test_stale_device_does_not_overwrite_progress_made_elsewhere, test_cloud_changed_elsewhere_is_adopted_even_when_its_clock_is_behind,
             test_row_deleted_elsewhere_is_recreated_without_looping, test_conflict_during_a_session_waits_and_never_overwrites_the_cloud, test_a_pull_downloads_the_progress_only_when_the_cloud_changed, test_a_practice_set_goes_up_once_at_its_end_or_when_the_app_is_hidden, test_conflict_merges_both_sides_record_by_record_and_uploads_the_merge, test_conflict_merge_redoes_todays_list_from_the_merged_progress,
             test_old_snapshots_are_deleted_and_no_new_ones_are_taken, test_an_empty_progress_never_replaces_the_clouds_and_only_a_reset_does]
    failed = 0
    try:
        for t in tests:
            err = None
            for attempt in (1, 2):   # a second try with a fresh browser absorbs load-related flakiness (as the other e2e files do)
                with Browser() as b:
                    try: t(b); print("PASS", t.__name__ + (" (retry)" if attempt == 2 else "")); err = None; break
                    except Exception as e: err = e
            if err is not None: failed += 1; print("FAIL", t.__name__, "-", str(err)[:300])
    finally:
        srv.terminate()
    print(f"# {len(tests) - failed}/{len(tests)} passed"); sys.exit(1 if failed else 0)
