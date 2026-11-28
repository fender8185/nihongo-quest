"""sweep-question-fit.py (test.5's Task 4, kept in the repo by the round's final fix): the full sweep — every practice question the app can build (every
format of every built-in item, 37,000-odd) at every size of the matrix, in every state (sweep-question-fit.js says what it measures). tests/e2e/test_question_fit.py
samples it for scripts/test.sh; this is all of it, 12–14 minutes. Not a test: nothing in scripts/test.sh runs it, and its name is not test_*.

  .venv/bin/python3 -I scripts/sweep-question-fit.py OUT_DIR [--root TREE] [--label NAME] [--modes new,leech,...] [--sizes 375x553,...] [--limit N] [--jobs 3]
      OUT_DIR  where the results go (made if it is not there): sweep-NAME-<WxH>.json, one a size
      --root   the tree served (default: this repo; a `git archive` of another commit to compare two builds)
      --label  names the results (default: head)
      --modes  a comma list of new, leech, prog, note, ans, ansleech, ansnote (default: all but ansleech)
      --sizes  a comma list of WxH (default: the 8 sizes of the matrix)
      --limit  about N questions a mode instead of every one: every n-th of the questions built, whatever its format — to see that the sweep still runs
               (--sizes 375x553 --limit 300: a couple of minutes, most of it building the questions)
      --jobs   sizes at a time (default 3)
  Each size in a headless Chrome and a server of its own, on ports the system gives; about 4 minutes a size with every mode, three sizes at a time. Touch
  emulated up to 1024 px wide (the phones, an iPad either way up), a keyboard at 1280. Prints, per size and state, the questions failing (an option not whole,
  covered, or the stem not begun; answered: 下一題 not in sight, or something moved), the ones whose stem or its Chinese scrolls in place, and the ones whose card
  scrolls. A clean full sweep of the shipped build has 0 failing at every size in every state."""
import argparse, asyncio, collections, json, math, os, subprocess, sys, time
from concurrent.futures import ThreadPoolExecutor
H = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(H, ".."))
sys.path.insert(0, os.path.join(REPO, "tests", "e2e"))
import websockets
from cdp import _Chrome, free_port
READY = "typeof state === 'object' && !!state.updatedAt && typeof speakScript === 'function'"
SIZES = ["360x640", "375x553", "390x664", "412x780", "430x740", "768x1024", "1024x768", "1280x800"]
MODES = ["new", "leech", "prog", "note", "ans", "ansleech", "ansnote"]

class Page:
    def __init__(self, chrome):
        self.ws_url = [t for t in chrome.tabs if t["type"] == "page"][0]["webSocketDebuggerUrl"]; self.ws = None; self.seq = 0
    async def open(self):
        self.ws = await websockets.connect(self.ws_url, max_size=None)
        await self.call("Page.enable"); await self.call("Runtime.enable")
        await self.call("Page.addScriptToEvaluateOnNewDocument", {"source": "window.NQ_E2E = 1"})
    async def call(self, m, params=None):
        self.seq += 1; i = self.seq
        await self.ws.send(json.dumps({"id": i, "method": m, "params": params or {}}))
        while True:
            r = json.loads(await self.ws.recv())
            if r.get("id") == i:
                if "error" in r: raise RuntimeError(f"{m}: {r['error']}")
                return r.get("result", {})
    async def ev(self, js, timeout=120):
        r = await asyncio.wait_for(self.call("Runtime.evaluate", {"expression": js, "returnByValue": True, "awaitPromise": True}), timeout)
        if "exceptionDetails" in r: raise RuntimeError(r["exceptionDetails"].get("exception", {}).get("description", "eval error")[:900])
        return r["result"].get("value")

async def sweep(root, size, out, modes, limit):
    w, h = map(int, size.split("x"))
    touch, mobile = w <= 1024, w <= 600
    port = free_port(); url = f"http://127.0.0.1:{port}/"
    srv = subprocess.Popen([sys.executable, "-I", os.path.join(REPO, "tests", "e2e", "serve.py"), str(port), "--bind", "127.0.0.1"], cwd=root, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(0.8)
    chrome = _Chrome(); p = Page(chrome); res = {"size": size, "touch": touch}; t0 = time.time()
    try:
        await p.open()
        await p.call("Emulation.setDeviceMetricsOverride", {"width": w, "height": h, "deviceScaleFactor": 2 if mobile else 1, "mobile": mobile})
        await p.call("Emulation.setTouchEmulationEnabled", {"enabled": True, "maxTouchPoints": 5} if touch else {"enabled": False})
        await p.call("Emulation.setEmulatedMedia", {"features": [{"name": "prefers-reduced-motion", "value": "reduce"}]})   # answers are real (a click) and the result panel rises: nothing in flight when it is measured
        await p.call("Storage.clearDataForOrigin", {"origin": url.rstrip("/"), "storageTypes": "all"})
        await p.call("Page.navigate", {"url": url})
        for _ in range(600):
            try:
                if await p.ev(READY, 10): break
            except Exception: pass
            await asyncio.sleep(0.1)
        await p.ev(open(os.path.join(H, "sweep-question-fit.js"), encoding="utf-8").read())
        res["build"] = json.loads(await p.ev("__sweep.build()", 900)); n = res["build"]["n"]
        step = max(1, math.ceil(n / limit)) if limit else 1   # --limit: every step-th question of the n built
        res["step"] = step
        await p.ev(f"__sweep.warm({step})", 1200)
        for mode in modes:
            rows, cut, card, ns = [], {}, {}, {}
            for a in range(0, n, 2000):
                r = json.loads(await p.ev(f"__sweep.run({a}, {a + 2000}, {json.dumps(mode)}, false, {step})", 900))
                rows += r["fails"]
                for k, v in r["cut"].items(): cut[k] = cut.get(k, 0) + v
                for k, v in r["card"].items(): card[k] = card.get(k, 0) + v
                for k, v in r["n"].items(): ns[k] = ns.get(k, 0) + v
            res[mode] = {"fails": rows, "cut": cut, "card": card, "n": ns}
        await p.ev("__sweep.done()")
    finally:
        try: await p.ws.close()
        except Exception: pass
        chrome.stop(); srv.terminate(); srv.wait(5)
    res["seconds"] = round(time.time() - t0)
    json.dump(res, open(out, "w"), ensure_ascii=False)
    return res

def main():
    ap = argparse.ArgumentParser(description="the full sweep of the practice questions at every size (see the file's docstring)")
    ap.add_argument("out_dir", help="where the results go: sweep-LABEL-<WxH>.json, one a size (made if it is not there)")
    ap.add_argument("--root", default=REPO, help="the tree served (default: this repo)")
    ap.add_argument("--label", default="head", help="names the results (default: head)")
    ap.add_argument("--modes", default="new,leech,prog,note,ans,ansnote", help="a comma list of " + ", ".join(MODES))
    ap.add_argument("--sizes", default=",".join(SIZES), help="a comma list of WxH (default: the 8 sizes of the matrix)")
    ap.add_argument("--limit", type=int, default=0, help="about this many questions a mode: every n-th of the questions built (default: all)")
    ap.add_argument("--jobs", type=int, default=3, help="sizes at a time")
    a = ap.parse_args()
    root, modes, sizes = os.path.abspath(a.root), a.modes.split(","), a.sizes.split(",")
    bad = [m for m in modes if m not in MODES] + [s for s in sizes if not (len(s.split("x")) == 2 and all(v.isdigit() for v in s.split("x")))]
    if bad: ap.error(f"not a mode or a size: {bad}")
    os.makedirs(a.out_dir, exist_ok=True)
    t0 = time.time()
    jobs = [(root, s, os.path.join(a.out_dir, f"sweep-{a.label}-{s}.json"), modes, a.limit) for s in sizes]
    with ThreadPoolExecutor(max(1, a.jobs)) as ex:
        results = list(ex.map(lambda j: asyncio.run(sweep(*j)), jobs))
    print(f"{a.label}: {root}  ({round(time.time() - t0)} s)" + (f"  — every {results[0]['step']}th question (--limit {a.limit})" if a.limit else ""))
    print("size       built   " + "".join(f"{m:>16}" for m in modes) + "   (failing / stem scrolls / card scrolls)")
    for r in results:
        print(f"{r['size']:10} {r['build']['n']:6}   " + "".join(f"{len(r[m]['fails']):>6}/{sum(r[m]['cut'].values()):>4}/{sum(r[m]['card'].values()):>4}" for m in modes) + f"   {r['seconds']} s")
    for r in results:
        for m in modes:
            c = collections.Counter(x[2] for x in r[m]["fails"])
            if c: print(" ", r["size"], m, "failing by format:", dict(c.most_common()))

if __name__ == "__main__":
    main()
