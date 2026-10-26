"""Tiny Chrome DevTools Protocol driver for e2e checks (headless Chrome, no extra deps beyond `websockets`)."""
import asyncio, json, shutil, socket, subprocess, tempfile, time, urllib.request
import websockets

CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
PORT = 9333  # default; each Browser picks a free port so test files can run in parallel

def free_port():
    with socket.socket() as sk:
        sk.bind(('127.0.0.1', 0)); return sk.getsockname()[1]

class Browser:
    def __init__(self, profile=None):
        self.profile = profile or tempfile.mkdtemp(prefix="nq-e2e-")
        self._own_profile = profile is None
        self.proc = None
        self.port = free_port()
    def __enter__(self):
        self.proc = subprocess.Popen([CHROME, "--headless=new", "--disable-gpu", "--no-first-run",
            f"--user-data-dir={self.profile}", f"--remote-debugging-port={self.port}", "about:blank"],
            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        for _ in range(100):
            try:
                tabs = json.load(urllib.request.urlopen(f"http://127.0.0.1:{self.port}/json")); break
            except Exception: time.sleep(0.1)
        self.ws_url = [t for t in tabs if t["type"] == "page"][0]["webSocketDebuggerUrl"]
        return self
    def __exit__(self, *a):
        self.proc.terminate(); self.proc.wait(timeout=10)
        if self._own_profile: shutil.rmtree(self.profile, ignore_errors=True)
    def run(self, steps, timeout=20):
        """steps: list of ('inject', js_before_page_scripts) | ('nav', url) | ('eval', js) | ('wait', js_predicate). Returns list of eval values."""
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
