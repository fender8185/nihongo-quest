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
          inline: !document.documentElement.outerHTML.includes('const DATA = {') }); })"""
    out = b.run([("nav", URL), ("wait", READY), ("wait", "!!navigator.serviceWorker.controller"), ("eval", js)])
    r = __import__('json').loads(out[-1])
    assert r['data'] and r['tag'] and r['tag'].startswith('./data.js?v=') and r['inline'], r
    assert any(u.endswith(r['tag'][1:]) for u in r['urls']), r

def test_the_page_is_precached_as_the_folder_only(b):
    # 1.0.39: Cloudflare answers /index.html with a redirect, and a redirected response cannot answer a navigation offline
    js = """navigator.serviceWorker.ready.then(() => caches.keys()).then(ks => caches.open(ks.find(k => k.startsWith('nq-v'))).then(c => c.keys()))
      .then(reqs => JSON.stringify(reqs.map(r => new URL(r.url).pathname).filter(p => p === '/' || p.endsWith('.html'))))"""
    out = b.run([("nav", URL), ("wait", READY), ("wait", "!!navigator.serviceWorker.controller"), ("eval", js)])
    assert out[-1] == '["/"]', out[-1]

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
def test_a_new_version_puts_itself_on_untouched_at_once_else_at_a_calm_page_change(b):
    """1.4.1 (the user: 直接換上): sw.js skips waiting; a page that had a controller reloads itself — at once when nothing was
    touched yet, else on the next page change with nothing under way (never under a dialog)."""
    import shutil, tempfile
    site = tempfile.mkdtemp(prefix="nq-update-")
    shutil.copytree(ROOT, site, dirs_exist_ok=True, ignore=shutil.ignore_patterns(".git", ".venv", "tests", "curriculum", "docs", "scripts", "supabase", "music", "*.md"))
    port = PORT + 7
    srv = subprocess.Popen([sys.executable, "-m", "http.server", str(port), "--bind", "127.0.0.1"], cwd=site, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    try:
        time.sleep(0.8)
        url = f"http://127.0.0.1:{port}/"
        bump = lambda v: open(os.path.join(site, "sw.js"), "w").write(open(os.path.join(ROOT, "sw.js")).read().replace("const CACHE = 'nq-v", f"const CACHE = 'nq-v{v}-"))
        out = b.run([("nav", url), ("wait", READY), ("wait", "!!navigator.serviceWorker.controller"),
            ("nav", url), ("wait", READY),   # opened again: a page under the installed version (the first install is no update)
            ("eval", "window.__old = 1; new Promise(r => setTimeout(r, 300)).then(() => 1)")])
        bump("8")   # a new version, nothing touched: it reloads by itself
        out = b.run([("eval", "navigator.serviceWorker.getRegistration().then(r => r.update()).then(() => 1)"),
            ("wait", "!window.__old && typeof state === 'object' && !!state.updatedAt"),
            ("wait", "!!document.querySelector('#toast') && document.querySelector('#toast').textContent.includes('已更新到新版本')"),
            ("eval", "caches.keys().then(ks => JSON.stringify({ nav: performance.getEntriesByType('navigation')[0].type, caches: ks.filter(k => k.startsWith('nq-v')) }))")], timeout=60)
        r = __import__("json").loads(out[-1])
        assert r["nav"] == "reload" and len(r["caches"]) == 1 and r["caches"][0].startswith("nq-v8-"), r
        # touched, then a dialog open: it waits; the dialog closed and another page: on
        bump("9")
        out = b.run([("eval", """(async () => { const wait = (ms) => new Promise(q => setTimeout(q, ms)); state.storyV = 9; STORY.drop(); document.dispatchEvent(new PointerEvent('pointerdown')); window.__mid = 1;   /* the opening seen (it would hold the update too) */
            openModal('x', '<p>y</p>'); await (await navigator.serviceWorker.getRegistration()).update(); for (let i = 0; i < 60 && !swUpdated; i++) await wait(100);
            const waited = swUpdated && window.__mid === 1; updateIfCalm(); await wait(300); const stillHere = window.__mid === 1; closeModal(); location.hash = '#/stats'; return JSON.stringify({ waited, stillHere }); })()"""),
            ("wait", "!window.__mid && typeof state === 'object' && !!state.updatedAt"),
            ("eval", "caches.keys().then(ks => JSON.stringify({ hash: location.hash, caches: ks.filter(k => k.startsWith('nq-v')) }))")], timeout=60)
        a, c = __import__("json").loads(out[0]), __import__("json").loads(out[-1])
        assert a == {"waited": True, "stillHere": True}, a   # under a dialog: not yet
        assert c["hash"] == "#/stats" and c["caches"][0].startswith("nq-v9-"), c   # the next calm page: on
    finally:
        srv.terminate(); shutil.rmtree(site, ignore_errors=True)


if __name__ == "__main__":
    srv = subprocess.Popen([sys.executable, "-m", "http.server", str(PORT), "--bind", "127.0.0.1"], cwd=ROOT, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(0.8)
    tests = [test_first_visit_does_not_reload_itself, test_app_renders_while_auth_session_restore_hangs, test_app_renders_and_sync_is_off_when_client_creation_throws, test_data_lives_in_its_own_versioned_file_and_is_precached, test_the_page_is_precached_as_the_folder_only,
             test_a_clip_cached_under_the_supabase_address_answers_for_its_r2_address, test_a_cached_clip_is_found_by_its_address_whatever_it_varies_on,
             test_a_new_version_puts_itself_on_untouched_at_once_else_at_a_calm_page_change]
    failed = 0
    try:
        for t in tests:
            with Browser() as b:
                try: t(b); print("PASS", t.__name__)
                except Exception as e: failed += 1; print("FAIL", t.__name__, "-", str(e)[:300])
    finally:
        srv.terminate()
    print(f"# {len(tests) - failed}/{len(tests)} passed"); sys.exit(1 if failed else 0)
