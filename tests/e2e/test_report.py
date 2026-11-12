"""Error reports (js/30_report.js, 2026-11-12): what goes up to public.app_errors, what is left out, and what waits for later."""
import json, os, subprocess, sys, time
sys.path.insert(0, os.path.dirname(__file__))
from cdp import Browser

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
PORT = 8816
URL = f"http://127.0.0.1:{PORT}/"
READY = "typeof state === 'object' && !!state.updatedAt && typeof ErrorReport === 'object'"

# reports on (the app keeps them off under tests and on plain http); the table's address answered here, as sessionStorage's
# fake_report says: ok, offline (the request fails), expired (a request with a login is refused with 401)
STUB = """window.NQ_REPORT_ON = 1; window.__posts = [];
(function () {
  const real = window.fetch;
  window.fetch = function (url, opts) {
    if (String(url).indexOf('/rest/v1/app_errors') < 0) return real.apply(this, arguments);
    const mode = sessionStorage.getItem('fake_report') || 'ok';
    window.__posts.push({ url: String(url), headers: opts.headers, rows: JSON.parse(opts.body) });
    if (mode === 'offline') return Promise.reject(new TypeError('Failed to fetch'));
    return Promise.resolve(new Response(null, { status: mode === 'expired' && opts.headers.Authorization ? 401 : 201 }));
  };
})();"""

def sleep_js(ms): return ("eval", f"new Promise(r => setTimeout(r, {ms}))")
ROWS = "JSON.stringify(__posts.map(p => p.rows.map(r => r.message)))"

def test_reports_are_off_under_tests_and_on_plain_http(b):
    out = b.run([("nav", URL), ("wait", READY), ("eval", "JSON.stringify({ off: ErrorReport.off })")])
    assert out[-1] == '{"off":true}', out

def test_an_error_goes_up_once_with_its_version_page_and_device_and_repeats_are_counted(b):
    out = b.run([("inject", STUB), ("nav", URL), ("wait", READY),
        ("eval", "window.boom = () => { throw new Error('boom') }; ErrorReport.wait = 300; for (let i = 0; i < 3; i++) setTimeout(boom, 0); true"),
        ("wait", "__posts.length === 1"), sleep_js(600),
        ("eval", "const p = __posts[0], r = p.rows[0]; JSON.stringify({ posts: __posts.length, rows: p.rows.length, kind: r.kind, msg: /boom/.test(r.message), times: r.times, "
                 "v: r.version === APP_VERSION, site: r.site === location.host, place: r.place.startsWith('#/'), dev: !!r.device_id && r.device_id === Sync.meta.deviceId, "
                 "stack: /30_report|boom|\\.js/.test(r.stack), key: p.headers.apikey === NQ_CONFIG.supabaseAnonKey, auth: 'Authorization' in p.headers, "
                 "url: p.url === NQ_CONFIG.supabaseUrl + '/rest/v1/app_errors', left: JSON.parse(localStorage.getItem('nq_err_queue')).length })"),
        # the same error (the same place) again later on this page is not sent again
        ("eval", "setTimeout(boom, 0); true"), sleep_js(800), ("eval", "__posts.length")])
    assert out[-4] == '{"posts":1,"rows":1,"kind":"error","msg":true,"times":3,"v":true,"site":true,"place":true,"dev":true,"stack":true,"key":true,"auth":false,"url":true,"left":0}', out
    assert out[-1] == 1, out

def test_rejections_go_up_but_blocked_sounds_extensions_and_noise_do_not(b):
    out = b.run([("inject", STUB), ("nav", URL), ("wait", READY),
        ("eval", "ErrorReport.wait = 300; Promise.reject(new Error('nope')); Promise.reject(new DOMException('x', 'NotAllowedError')); Promise.reject(new DOMException('y', 'AbortError'));"
                 "window.dispatchEvent(new ErrorEvent('error', { message: 'from an extension', filename: 'chrome-extension://abc/x.js' }));"
                 "window.dispatchEvent(new ErrorEvent('error', { message: 'Script error.' }));"
                 "window.dispatchEvent(new ErrorEvent('error', { message: 'ResizeObserver loop completed with undelivered notifications.' })); true"),
        ("wait", "__posts.length === 1"), sleep_js(600),
        ("eval", "JSON.stringify(__posts.map(p => p.rows.map(r => [r.kind, r.message])))")])
    assert out[-1] == '[[["rejection","nope"]]]', out

def test_at_most_ten_different_errors_a_page(b):
    out = b.run([("inject", STUB), ("nav", URL), ("wait", READY),
        ("eval", "ErrorReport.wait = 300; for (let i = 0; i < 12; i++) setTimeout(() => { throw new Error('e' + i) }, 0); true"),
        ("wait", "__posts.length >= 1"), sleep_js(800),
        ("eval", "__posts.reduce((n, p) => n + p.rows.length, 0)")])
    assert out[-1] == 10, out

# offline: the report waits in localStorage and goes up at the next start
def test_a_report_made_offline_goes_up_at_the_next_start(b):
    out = b.run([("inject", STUB), ("nav", URL), ("wait", READY),
        ("eval", "sessionStorage.setItem('fake_report', 'offline'); ErrorReport.wait = 300; setTimeout(() => { throw new Error('while offline') }, 0); true"),
        ("wait", "__posts.length === 1"), sleep_js(300),
        ("eval", "JSON.parse(localStorage.getItem('nq_err_queue')).map(r => /while offline/.test(r.message))"),
        ("eval", "sessionStorage.setItem('fake_report', 'ok'); true"), ("nav", URL), ("wait", READY),
        ("wait", "__posts.length === 1"), sleep_js(300),
        ("eval", "JSON.stringify({ sent: __posts[0].rows.map(r => /while offline/.test(r.message)), left: JSON.parse(localStorage.getItem('nq_err_queue')).length })")], timeout=20)
    assert out[-4] == [True], out
    assert out[-1] == '{"sent":[true],"left":0}', out

# the 現在沒辦法開始 screen goes up at once (it comes before the Supabase client exists)
def test_the_stop_screen_is_reported_at_once(b):
    out = b.run([("inject", STUB), ("nav", URL), ("wait", READY),
        ("eval", "stopApp('測試：停下來'); true"), ("wait", "__posts.length === 1"),
        ("eval", "JSON.stringify(__posts[0].rows.map(r => [r.kind, r.message]))")], timeout=5)
    assert out[-1] == '[["stop","測試：停下來"]]', out

# logged in, the report carries the login (the row gets the learner's id); a login that expired is dropped and it goes up anyway
def test_a_report_carries_the_login_and_goes_without_an_expired_one(b):
    out = b.run([("inject", STUB), ("nav", URL), ("wait", READY),
        ("eval", "Sync.session = { access_token: 'TOK', user: { id: 'u1', email: 'a@b.c' } }; ErrorReport.wait = 300; setTimeout(() => { throw new Error('logged in') }, 0); true"),
        ("wait", "__posts.length === 1"),
        ("eval", "__posts[0].headers.Authorization"),
        ("eval", "sessionStorage.setItem('fake_report', 'expired'); setTimeout(() => { throw new Error('expired login') }, 0); true"),
        ("wait", "__posts.length === 3"), sleep_js(300),
        ("eval", "JSON.stringify({ auth: __posts.slice(1).map(p => 'Authorization' in p.headers), left: JSON.parse(localStorage.getItem('nq_err_queue')).length })")])
    assert out[-4] == "Bearer TOK", out
    assert out[-1] == '{"auth":[true,false],"left":0}', out

if __name__ == "__main__":
    srv = subprocess.Popen([sys.executable, os.path.join(ROOT, "tests", "e2e", "serve.py"), str(PORT), "--bind", "127.0.0.1"], cwd=ROOT, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(0.8)
    tests = [test_reports_are_off_under_tests_and_on_plain_http, test_an_error_goes_up_once_with_its_version_page_and_device_and_repeats_are_counted,
             test_rejections_go_up_but_blocked_sounds_extensions_and_noise_do_not, test_at_most_ten_different_errors_a_page,
             test_a_report_made_offline_goes_up_at_the_next_start, test_the_stop_screen_is_reported_at_once,
             test_a_report_carries_the_login_and_goes_without_an_expired_one]
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
