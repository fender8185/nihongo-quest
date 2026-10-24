"""Task 8: Sync module — off mode, first-sync-takes-cloud, debounced push w/o secrets, logout race, bad cloud state, deferral."""
import os, subprocess, sys, time
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
      async signOut() { session = null; listeners.forEach(cb => cb('SIGNED_OUT', null)); return { error: null }; }
    },
    from() { return {
      select() { return { eq() { return { async maybeSingle() { return { data: row ? { state: row.state, updated_at: row.updated_at } : null, error: null }; } }; } }; },
      async upsert(p) { calls.push(['upsert', p]); row = p; return { error: null }; },
      delete() { return { async eq() { row = null; calls.push(['delete']); return { error: null }; } }; }
    }; }
  };
  return { client, calls, setRow(r) { row = r; }, getRow() { return row; },
    login(email) { session = { user: { id: 'u1', email } }; listeners.forEach(cb => cb('SIGNED_IN', session)); } };
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
        ("eval", "__fake.setRow({ user_id: 'u1', state: { v: 3, updatedAt: '2000-01-01T00:00:00.000Z', settings: { dailyGoal: 55 }, aiConfig: { provider: 'gemini', geminiKey: '' } }, updated_at: '2000-01-01T00:00:00.000Z' }); __fake.login('a@b.c'); true"),
        ("wait", "Sync.status === 'idle'"),
        ("eval", "JSON.stringify({ goal: state.settings.dailyGoal, key: state.aiConfig.geminiKey, ever: Sync.meta.everSynced })"),
    ])
    assert out[-1] == '{"goal":55,"key":"LOCALKEY","ever":true}', out[-1]

def test_save_pushes_after_debounce_without_secrets(b):
    out = boot(b, [
        ("eval", "__fake.login('a@b.c'); true"), ("wait", "Sync.status === 'idle'"),
        ("eval", "state.settings.dailyGoal = 66; saveState(); Sync.status"),
        ("wait", "__fake.getRow() && __fake.getRow().state.settings.dailyGoal === 66"),
        ("eval", "JSON.stringify({ key: __fake.getRow().state.aiConfig.geminiKey, uid: __fake.getRow().user_id, up: __fake.getRow().updated_at === state.updatedAt, st: Sync.status })"),
    ])
    assert out[-2] == "pending", out[-2]
    assert out[-1] == '{"key":"","uid":"u1","up":true,"st":"idle"}', out[-1]

def test_logout_during_debounce_cancels_push(b):
    out = boot(b, [
        ("eval", "__fake.login('a@b.c'); true"), ("wait", "Sync.status === 'idle'"),
        ("eval", "const n0 = __fake.calls.filter(c => c[0] === 'upsert').length; state.settings.dailyGoal = 99; saveState(); Sync.signOut().then(() => n0)"),
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
        ("eval", "SESSION = { fake: true }; __fake.setRow({ user_id: 'u1', state: Object.assign(JSON.parse(JSON.stringify(state)), { updatedAt: '2099-01-01T00:00:00.000Z', settings: Object.assign({}, state.settings, { dailyGoal: 123 }) }), updated_at: '2099-01-01T00:00:00.000Z' }); Sync.pull().then(() => state.settings.dailyGoal)"),
        ("eval", "SESSION = null; Sync.flushDeferred(); true"),
        ("wait", "state.settings.dailyGoal === 123"),
        ("eval", "state.settings.dailyGoal"),
    ])
    assert out[-3] != 123, "pull applied cloud state during a session"
    assert out[-1] == 123

if __name__ == "__main__":
    srv = subprocess.Popen([sys.executable, "-m", "http.server", str(PORT), "--bind", "127.0.0.1"], cwd=ROOT, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(0.8)
    tests = [test_without_config_sync_is_off, test_first_sync_on_fresh_device_takes_cloud_even_if_local_newer,
             test_save_pushes_after_debounce_without_secrets, test_logout_during_debounce_cancels_push,
             test_unreadable_or_bare_cloud_state_does_not_break_app, test_pull_is_deferred_while_practicing]
    failed = 0
    try:
        for t in tests:
            with Browser() as b:
                try: t(b); print("PASS", t.__name__)
                except Exception as e: failed += 1; print("FAIL", t.__name__, "-", str(e)[:300])
    finally:
        srv.terminate()
    print(f"# {len(tests) - failed}/{len(tests)} passed"); sys.exit(1 if failed else 0)
