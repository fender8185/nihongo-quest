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
      select() { return { eq() { return { async maybeSingle() { return { data: row ? { state: row.state, updated_at: row.updated_at } : null, error: null }; } }; } }; },
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
                  ("eval", "state.aiConfig = { provider: 'gemini', geminiKey: 'LOCALKEY' }; saveState(); true"),
                  ("eval", "new Promise(r => setTimeout(r, 50)).then(() => Sync.init({ client: __fake.client })).then(() => Sync.status)")] + list(extra))

def sleep_js(ms): return ("eval", f"new Promise(r => setTimeout(r, {ms}))")

def test_without_config_sync_is_off(b):
    v = b.run([("nav", URL), ("wait", READY), ("eval", "Sync.status")])[0]
    assert v == "off", v

def test_first_sync_on_fresh_device_takes_cloud_even_if_local_newer(b):
    out = boot(b, [
        ("eval", "__fake.setRow({ user_id: 'u1', state: { v: 3, updatedAt: '2000-01-01T00:00:00.000Z', settings: { loadCap: 55 }, aiConfig: { provider: 'gemini', geminiKey: '' } }, updated_at: '2000-01-01T00:00:00.000Z' }); __fake.login('a@b.c'); true"),
        ("wait", "Sync.status === 'idle'"),
        ("eval", "JSON.stringify({ goal: state.settings.loadCap, key: state.aiConfig.geminiKey, ever: Sync.meta.everSynced })"),
    ])
    assert out[-1] == '{"goal":55,"key":"LOCALKEY","ever":true}', out[-1]

def test_save_pushes_after_debounce_without_secrets(b):
    out = boot(b, [
        ("eval", "__fake.login('a@b.c'); true"), ("wait", "Sync.status === 'idle'"),
        ("eval", "state.settings.loadCap = 66; saveState(); Sync.status"),
        ("wait", "__fake.getRow() && __fake.getRow().state.settings.loadCap === 66"),
        ("eval", "JSON.stringify({ ai: __fake.getRow().state.aiConfig, tts: __fake.getRow().state.ttsConfig, uid: __fake.getRow().user_id, up: __fake.getRow().updated_at === state.updatedAt, st: Sync.status })"),
    ])
    assert out[-2] == "pending", out[-2]
    assert out[-1] == '{"ai":null,"tts":null,"uid":"u1","up":true,"st":"idle"}', out[-1]

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
        ("eval", "JSON.stringify({ st: Sync.status, srs: JSON.stringify(state.srs), key: state.aiConfig.geminiKey, nav: document.querySelectorAll('#sideNav .nav-item').length })"),
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
        ("eval", "JSON.stringify({ goal: state.settings.loadCap, uid: Sync.meta.userId, ever: Sync.meta.everSynced, key: state.aiConfig.geminiKey })"),
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
        ("eval", "state.vocab.push({ id: 'v1', jp: '猫', zh: '貓' }); saveState(); true"),
        ("eval", "__fake.setRow({ user_id: 'u1', state: { v: 3, updatedAt: '2000-01-01T00:00:00.000Z' }, updated_at: '2000-01-01T00:00:00.000Z' }); __fake.login('a@b.c'); true"),
        ("wait", "Sync.status === 'idle' && Sync.meta.everSynced"),
        ("eval", "JSON.stringify({ local: state.vocab.length, cloud: (__fake.getRow().state.vocab || []).length })"),
    ])
    assert out[-1] == '{"local":1,"cloud":1}', out[-1]

def test_first_sync_adopting_cloud_snapshots_local_first(b):
    out = boot(b, [
        ("eval", "state.vocab.push({ id: 'v1', jp: '猫', zh: '貓' }); saveState(); true"),
        ("eval", "__fake.setRow({ user_id: 'u1', state: { v: 3, updatedAt: '2000-01-01T00:00:00.000Z', vocab: [{ id: 'c1', jp: '犬', zh: '狗' }] }, updated_at: '2000-01-01T00:00:00.000Z' }); __fake.login('a@b.c'); true"),
        ("wait", "Sync.status === 'idle' && Sync.meta.everSynced"),
        ("eval", "Snapshots.get('pre-cloud-' + todayStr()).then(j => JSON.stringify({ now: state.vocab[0].id, snap: j ? JSON.parse(j).vocab[0].id : null }))"),
    ])
    assert out[-1] == '{"now":"c1","snap":"v1"}', out[-1]

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
        ("eval", "JSON.stringify(__fake.calls.filter(c => c[0] !== 'otp').map(c => c[0]))"),
    ])
    assert out[-1] == '["upsert","update"]', out[-1]

def test_stale_device_does_not_overwrite_progress_made_elsewhere(b):
    out = boot(b, [
        ("eval", "__fake.login('a@b.c'); true"), ("wait", "Sync.status === 'idle'"),
        ("eval", f"__fake.setRow({{ user_id: 'u1', state: {OTHER}, updated_at: '2099-01-01T00:00:00.000Z' }}); state.settings.loadCap = 5; saveState(); true"),
        ("wait", "Sync.status === 'idle' && state.settings.loadCap === 123"),
        ("eval", "Snapshots.get('conflict-' + todayStr()).then(j => JSON.stringify({ cloud: __fake.getRow().state.settings.loadCap, local: state.settings.loadCap, snap: j ? JSON.parse(j).settings.loadCap : null, pend: Sync.meta.pendingSync, miss: __fake.calls.filter(c => c[0] === 'update-miss').length }))"),
    ])
    assert out[-1] == '{"cloud":123,"local":123,"snap":5,"pend":false,"miss":1}', out[-1]

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
        ("eval", "Snapshots.get('conflict-' + todayStr()).then(j => JSON.stringify({ snap: j ? JSON.parse(j).settings.loadCap : null, cloud: __fake.getRow().state.settings.loadCap }))"),
    ])
    assert out[-3] == '{"local":7,"cloud":123,"st":"pending","net":1}', out[-3]
    assert out[-1] == '{"snap":7,"cloud":123}', out[-1]

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
        ("eval", """(() => { state.stage = 'main'; state.kanaKnown = true; state.introSeen = true; state.startChosen = true; state.currentUnit = 'm1';
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

def test_snapshots_prune_by_date_and_format_conflict_labels(b):
    js = """(async () => {
      for (const k of (await Snapshots.keys()) || []) await Snapshots.del(k);
      const putAll = ['conflict-2026-01-01', 'pre-cloud-2026-01-02', '2026-04-01', '2026-04-02', '2026-04-03', '2026-04-04', '2026-04-05', '2026-04-06', 'conflict-2026-04-06'];
      for (const k of putAll) await Snapshots.put(k, '{}');
      await Snapshots.prune();
      openSettings('data');
      await fillSnapshotList();
      const keys = await Snapshots.keys();
      const labels = [...document.querySelectorAll('#snapList [data-act=snapshot-restore]')].map(el => el.textContent);
      return JSON.stringify({ keys, labels });
    })()"""
    out = b.run([("nav", URL), ("wait", READY), ("eval", js)])
    r = __import__('json').loads(out[-1])
    assert 'conflict-2026-01-01' not in r['keys'] and 'pre-cloud-2026-01-02' not in r['keys'], r
    assert '2026-04-01' in r['keys'] and 'conflict-2026-04-06' in r['keys'], r
    assert r['labels'][0] == '2026/04/06（衝突備份）' and r['labels'][1] == '2026/04/06', r

if __name__ == "__main__":
    srv = subprocess.Popen([sys.executable, "-m", "http.server", str(PORT), "--bind", "127.0.0.1"], cwd=ROOT, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(0.8)
    tests = [test_without_config_sync_is_off, test_first_sync_on_fresh_device_takes_cloud_even_if_local_newer,
             test_save_pushes_after_debounce_without_secrets, test_logout_during_debounce_cancels_push,
             test_unreadable_or_bare_cloud_state_does_not_break_app, test_pull_is_deferred_while_practicing,
             test_switching_account_resets_device_binding_and_adopts_new_cloud,
             test_pull_runs_after_exam_is_finished_but_still_on_result_screen, test_first_sync_keeps_real_local_progress_over_empty_cloud,
             test_first_sync_adopting_cloud_snapshots_local_first, test_token_refresh_does_not_mask_error_status,
             test_manual_push_with_null_updated_at_still_sends_a_timestamp,
             test_push_uses_a_conditional_update_once_the_device_has_synced, test_stale_device_does_not_overwrite_progress_made_elsewhere, test_cloud_changed_elsewhere_is_adopted_even_when_its_clock_is_behind,
             test_row_deleted_elsewhere_is_recreated_without_looping, test_conflict_during_a_session_waits_and_never_overwrites_the_cloud, test_conflict_merges_both_sides_record_by_record_and_uploads_the_merge, test_conflict_merge_redoes_todays_list_from_the_merged_progress,
             test_snapshots_prune_by_date_and_format_conflict_labels]
    failed = 0
    try:
        for t in tests:
            with Browser() as b:
                try: t(b); print("PASS", t.__name__)
                except Exception as e: failed += 1; print("FAIL", t.__name__, "-", str(e)[:300])
    finally:
        srv.terminate()
    print(f"# {len(tests) - failed}/{len(tests)} passed"); sys.exit(1 if failed else 0)
