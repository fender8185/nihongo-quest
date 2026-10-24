"""Boot robustness: no self-reload on first install; app renders even when auth hangs or client creation throws."""
import os, subprocess, sys, time
sys.path.insert(0, os.path.dirname(__file__))
from cdp import Browser
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
PORT = 8796
URL = f"http://127.0.0.1:{PORT}/"
READY = "typeof state === 'object' && !!state.updatedAt && document.querySelectorAll('#sideNav .nav-item').length === 7"

def override(config_js, supabase_js):
    return f"""Object.defineProperty(window, 'NQ_CONFIG', {{ get() {{ return {config_js}; }}, set() {{}} }});
Object.defineProperty(window, 'supabase', {{ get() {{ return {supabase_js}; }}, set() {{}} }});"""

HANGING = "{ createClient() { return { auth: { onAuthStateChange() { return { data: { subscription: { unsubscribe() {} } } }; }, getSession() { return new Promise(() => {}); } }, from() { throw new Error('unused'); } }; } }"
THROWING = "{ createClient() { throw new Error('Invalid URL'); } }"

def test_first_visit_does_not_reload_itself(b):
    out = b.run([("nav", URL), ("wait", READY),
        ("wait", "!!navigator.serviceWorker.controller"),
        ("eval", "new Promise(r => setTimeout(r, 1500)).then(() => JSON.stringify({ nav: performance.getEntriesByType('navigation')[0].type, ctrl: !!navigator.serviceWorker.controller }))")])
    assert out[-1] == '{"nav":"navigate","ctrl":true}', out[-1]

def test_app_renders_while_auth_session_restore_hangs(b):
    t0 = time.time()
    out = b.run([("inject", override("{ supabaseUrl: 'https://x.supabase.co', supabaseAnonKey: 'k' }", HANGING)), ("nav", URL), ("wait", READY),
        ("eval", "JSON.stringify({ nav: document.querySelectorAll('#sideNav .nav-item').length, main: !!document.querySelector('main').innerHTML })")], timeout=6)
    assert out[-1] == '{"nav":7,"main":true}', out[-1]
    assert time.time() - t0 < 8, "rendering waited on auth"

def test_app_renders_and_sync_is_off_when_client_creation_throws(b):
    out = b.run([("inject", override("{ supabaseUrl: 'not a url', supabaseAnonKey: 'k' }", THROWING)), ("nav", URL), ("wait", READY),
        ("eval", "new Promise(r => setTimeout(r, 300)).then(() => JSON.stringify({ st: Sync.status, chip: document.querySelector('#sideSync .sync-chip').textContent.trim() }))")], timeout=6)
    assert out[-1] == '{"st":"off","chip":"未登入"}', out[-1]

if __name__ == "__main__":
    srv = subprocess.Popen([sys.executable, "-m", "http.server", str(PORT), "--bind", "127.0.0.1"], cwd=ROOT, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(0.8)
    tests = [test_first_visit_does_not_reload_itself, test_app_renders_while_auth_session_restore_hangs, test_app_renders_and_sync_is_off_when_client_creation_throws]
    failed = 0
    try:
        for t in tests:
            with Browser() as b:
                try: t(b); print("PASS", t.__name__)
                except Exception as e: failed += 1; print("FAIL", t.__name__, "-", str(e)[:300])
    finally:
        srv.terminate()
    print(f"# {len(tests) - failed}/{len(tests)} passed"); sys.exit(1 if failed else 0)
