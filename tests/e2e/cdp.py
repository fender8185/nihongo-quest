"""Tiny Chrome DevTools Protocol driver for e2e checks (headless Chrome, no extra deps beyond `websockets`).

One headless Chrome per test process: the first Browser() starts it and it stops when the process exits. Every Browser() is a
fresh browser context in it (its own localStorage, IndexedDB, service workers and caches, like an incognito window), closed on
exit, so a test file pays one Chrome start-up instead of one per test (about 350 a full run) and its tests still share nothing.
Browser(profile=dir) keeps a Chrome of its own on that profile, for a test that needs data kept across Browsers."""
import asyncio, atexit, json, shutil, socket, subprocess, tempfile, time, urllib.request
import websockets
from websockets.sync.client import connect as ws_connect

CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
PORT = 9333  # default; each Chrome picks a free port so test files can run in parallel

def free_port():
    with socket.socket() as sk:
        sk.bind(('127.0.0.1', 0)); return sk.getsockname()[1]

class _Chrome:
    """A headless Chrome on its own profile and debugging port."""
    def __init__(self, profile=None):
        self.profile = profile or tempfile.mkdtemp(prefix="nq-e2e-")
        self._own_profile = profile is None
        self.port = free_port()
        self.proc = subprocess.Popen([CHROME, "--headless=new", "--disable-gpu", "--no-first-run",
            f"--user-data-dir={self.profile}", f"--remote-debugging-port={self.port}", "about:blank"],
            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        self.tabs = None
        for _ in range(300):   # up to 30 s: a loaded machine can be slow to bring Chrome up
            try:
                self.tabs = json.load(urllib.request.urlopen(f"http://127.0.0.1:{self.port}/json")); break
            except Exception: time.sleep(0.1)
        if self.tabs is None:   # never leave a Chrome behind
            self.stop(); raise RuntimeError(f"headless Chrome did not open its debugging port {self.port} within 30 s")
        self.browser_ws = json.load(urllib.request.urlopen(f"http://127.0.0.1:{self.port}/json/version"))["webSocketDebuggerUrl"]
    def alive(self):
        return self.proc.poll() is None
    def call(self, method, params=None):   # one browser-level command
        with ws_connect(self.browser_ws, max_size=None, open_timeout=30) as ws:
            ws.send(json.dumps({"id": 1, "method": method, "params": params or {}}))
            while True:
                r = json.loads(ws.recv(timeout=30))
                if r.get("id") == 1:
                    if "error" in r: raise RuntimeError(f"{method}: {r['error']}")
                    return r["result"]
    def stop(self):
        if self.proc.poll() is None:
            self.proc.terminate()
            try: self.proc.wait(timeout=10)
            except subprocess.TimeoutExpired: self.proc.kill(); self.proc.wait()
        if self._own_profile: shutil.rmtree(self.profile, ignore_errors=True)

_shared = None   # this process's Chrome
def _shared_chrome():
    global _shared
    if _shared is None or not _shared.alive():   # first use, or it died: start one
        if _shared is not None: _shared.stop()
        _shared = _Chrome()
    return _shared
atexit.register(lambda: _shared is not None and _shared.stop())

class Browser:
    def __init__(self, profile=None):
        self.profile = profile
        self.proc = None
        self._ctx = None
    def __enter__(self):
        if self.profile:   # data kept on that profile: a Chrome of its own
            self._chrome = _Chrome(self.profile)
            self.ws_url = [t for t in self._chrome.tabs if t["type"] == "page"][0]["webSocketDebuggerUrl"]
        else:
            for attempt in (1, 2):   # a Chrome that stopped answering is replaced once
                self._chrome = _shared_chrome()
                try:
                    self._ctx = self._chrome.call("Target.createBrowserContext")["browserContextId"]
                    page = self._chrome.call("Target.createTarget", {"url": "about:blank", "browserContextId": self._ctx})["targetId"]
                    break
                except Exception:
                    self._chrome.stop()
                    if attempt == 2: raise
            self.ws_url = f"ws://127.0.0.1:{self._chrome.port}/devtools/page/{page}"
        self.port, self.proc = self._chrome.port, self._chrome.proc
        return self
    def __exit__(self, *a):
        if self._ctx is None: self._chrome.stop(); return
        try: self._chrome.call("Target.disposeBrowserContext", {"browserContextId": self._ctx})
        except Exception: self._chrome.stop()   # a Chrome that cannot close a context is not reused
    def run(self, steps, timeout=45):   # three files run in parallel; page loads can take a while under that load
        """steps: list of ('inject', js_before_page_scripts) | ('nav', url) | ('eval', js) | ('wait', js_predicate) | ('metrics', (w, h)) | ('shot', path). Returns list of eval values."""
        async def go():
            out = []
            async with websockets.connect(self.ws_url, max_size=None) as ws:
                i = 0
                async def call(m, params=None):
                    nonlocal i; i += 1
                    await ws.send(json.dumps({"id": i, "method": m, "params": params or {}}))
                    while True:
                        r = json.loads(await ws.recv())
                        if r.get("id") == i: return r
                async def ev(js):
                    r = await call("Runtime.evaluate", {"expression": js, "returnByValue": True, "awaitPromise": True})
                    if "exceptionDetails" in r.get("result", {}):
                        raise RuntimeError(r["result"]["exceptionDetails"].get("exception", {}).get("description", "eval error"))
                    return r["result"]["result"].get("value")
                await call("Page.enable")
                for kind, arg in steps:
                    if kind == "inject":
                        await call("Page.addScriptToEvaluateOnNewDocument", {"source": arg})
                    elif kind == "nav":
                        await call("Page.navigate", {"url": arg}); await asyncio.sleep(0.3)
                        for _ in range(100):
                            if await ev("document.readyState") == "complete": break
                            await asyncio.sleep(0.1)
                    elif kind == "eval":
                        out.append(await ev(arg))
                    elif kind == "shot":   # ('shot', 'path.png'): full-page PNG at a 1000px-wide viewport
                        await call("Emulation.setDeviceMetricsOverride", {"width": 1000, "height": 1400, "deviceScaleFactor": 1, "mobile": False})
                        r = await call("Page.captureScreenshot", {"format": "png", "captureBeyondViewport": True})
                        import base64; open(arg, "wb").write(base64.b64decode(r["result"]["data"]))
                    elif kind == "metrics":   # ('metrics', (width, height[, mobile=True])): emulate that viewport from here on (it sticks for the Browser)
                        mobile = arg[2] if len(arg) > 2 else True
                        await call("Emulation.setDeviceMetricsOverride", {"width": arg[0], "height": arg[1], "deviceScaleFactor": 2 if mobile else 1, "mobile": mobile})
                    elif kind == "wait":
                        deadline = time.time() + timeout
                        while True:
                            if await ev(arg): break
                            if time.time() > deadline: raise TimeoutError(f"wait timed out: {arg}")
                            await asyncio.sleep(0.2)
            return out
        return asyncio.run(go())

IDB_GET = """new Promise(res => { const r = indexedDB.open('nihongo_quest_db'); r.onupgradeneeded = () => { r.transaction.abort(); res(null); };
  r.onerror = () => res(null); r.onsuccess = e => { const db = e.target.result; if (!db.objectStoreNames.contains('kv')) { db.close(); res(null); return; }
  const g = db.transaction('kv').objectStore('kv').get(%s); g.onsuccess = () => { db.close(); res(g.result === undefined ? null : g.result); }; g.onerror = () => { db.close(); res(null); }; }; })"""

def idb_get(key):
    return IDB_GET % json.dumps(key)
