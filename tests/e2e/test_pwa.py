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

def test_data_lives_in_its_own_versioned_file_and_is_precached(b):
    js = """navigator.serviceWorker.ready.then(() => caches.keys()).then(ks => caches.open(ks.find(k => k.startsWith('nq-v'))).then(c => c.keys()))
      .then(reqs => { const tagEl = document.querySelector('script[src*="data.js"]'); const tag = tagEl ? tagEl.getAttribute('src') : null;
        return JSON.stringify({ urls: reqs.map(r => { const u = new URL(r.url); return u.pathname + u.search; }), data: typeof DATA === 'object' && Array.isArray(DATA.VOCAB), tag,
          inline: !document.documentElement.outerHTML.includes('const DATA = {"PHASES"') }); })"""
    out = b.run([("nav", URL), ("wait", READY), ("wait", "!!navigator.serviceWorker.controller"), ("eval", js)])
    r = __import__('json').loads(out[-1])
    assert r['data'] and r['tag'] and r['tag'].startswith('./data.js?v=') and r['inline'], r
    assert any(u.endswith(r['tag'][1:]) for u in r['urls']), r

def test_a_clip_cached_under_the_supabase_address_answers_for_its_r2_address(b):
    # 1.0.29 fetches clips from R2; a device keeps what it cached before under the Supabase address. No server has this
    # clip name, so only the cached copy can answer.
    name = "v1/zh/" + "0" * 32 + ".mp3"
    js = """(async () => { const cache = await caches.open('nq-audio');
      await cache.put('https://pwudaariihdshiwqbkfx.supabase.co/storage/v1/object/public/JPY_audio/%s', new Response(new Uint8Array([5, 5, 5]), { headers: { 'Content-Type': 'audio/mpeg' } }));
      try { const r = await fetch('https://audio.nihongoquest.app/%s'); return JSON.stringify({ status: r.status, body: [...new Uint8Array(await r.arrayBuffer())] }); }
      catch (e) { return JSON.stringify({ error: String(e) }); } })()""" % (name, name)
    out = b.run([("nav", URL), ("wait", READY), ("wait", "!!navigator.serviceWorker.controller"), ("eval", js)])
    r = __import__('json').loads(out[-1])
    assert r == {'status': 200, 'body': [5, 5, 5]}, r

def test_a_cached_clip_is_found_by_its_address_whatever_it_varies_on(b):
    # R2 answers "Vary: Origin", and browsers differ in the headers a stored request and a later one carry; a clip never
    # changes, so its address alone must find it. A made-up header stands in for Origin, which a page cannot set.
    name = "v1/zh/" + "1" * 32 + ".mp3"
    js = """(async () => { const url = 'https://audio.nihongoquest.app/%s'; const cache = await caches.open('nq-audio');
      await cache.put(new Request(url, { headers: { 'X-Probe': '1' } }), new Response(new Uint8Array([6]), { headers: { 'Content-Type': 'audio/mpeg', 'Vary': 'X-Probe' } }));
      try { const r = await fetch(url); return JSON.stringify({ status: r.status, body: [...new Uint8Array(await r.arrayBuffer())] }); }
      catch (e) { return JSON.stringify({ error: String(e) }); } })()""" % name
    out = b.run([("nav", URL), ("wait", READY), ("wait", "!!navigator.serviceWorker.controller"), ("eval", js)])
    r = __import__('json').loads(out[-1])
    assert r == {'status': 200, 'body': [6]}, r

if __name__ == "__main__":
    srv = subprocess.Popen([sys.executable, "-m", "http.server", str(PORT), "--bind", "127.0.0.1"], cwd=ROOT, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(0.8)
    tests = [test_first_visit_does_not_reload_itself, test_app_renders_while_auth_session_restore_hangs, test_app_renders_and_sync_is_off_when_client_creation_throws, test_data_lives_in_its_own_versioned_file_and_is_precached,
             test_a_clip_cached_under_the_supabase_address_answers_for_its_r2_address, test_a_cached_clip_is_found_by_its_address_whatever_it_varies_on]
    failed = 0
    try:
        for t in tests:
            with Browser() as b:
                try: t(b); print("PASS", t.__name__)
                except Exception as e: failed += 1; print("FAIL", t.__name__, "-", str(e)[:300])
    finally:
        srv.terminate()
    print(f"# {len(tests) - failed}/{len(tests)} passed"); sys.exit(1 if failed else 0)
