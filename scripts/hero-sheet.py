"""A contact sheet of the hero (test build): every hairstyle (or top) in rows, every head ware (or other wares) in columns, front
and back, so a new ware or hairstyle can be checked against all the others before it ships (docs/superpowers/specs/
2026-11-07-hero-wear-rules.md).

usage: .venv/bin/python3 -I scripts/hero-sheet.py out.png [--rows hair|topStyle] [--only a,b] [--cols none,beanie,…] [--cell 92]
  writes out.png (facing us) and out-back.png (from behind). --cols: ware ids, 'none' for nothing worn; by default every ware worn
  on the head or face with hair rows, every neck, back and body ware with top rows."""
import argparse, asyncio, base64, json, os, subprocess, sys, time
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, os.path.join(ROOT, "tests", "e2e"))
from cdp import Browser
import websockets

PORT = 8833
READY = "typeof state === 'object' && !!state.updatedAt && typeof HERO === 'object'"
SHEET = r"""((rowKey, only, cols, back, cell) => {
  const slots = rowKey === 'hair' ? ['head', 'face'] : ['neck', 'back', 'body'];
  const wares = cols || [null, ...WARES.filter(w => w.kind === 'wear' && slots.includes(w.slot)).map(w => w.id)];
  const rows = only || HERO.OPTS[rowKey].map(o => o[0]), box = rowKey === 'hair' ? '-62 -238 128 165' : '-62 -200 128 210';
  const draw = (v, id) => { let s = HERO.svg({ look: { hairColor: '#6b4a32', [rowKey]: v }, wear: id ? { [WARE.get(id).slot]: id } : {}, front: !back, box });
    if (back) s = s.replace('<g class="f-front">', '<g class="f-front" style="display:none">');
    return `<div class="c">${s}</div>`; };
  document.head.insertAdjacentHTML('beforeend', `<style>body{margin:0;background:#fff}
    .sheet{display:grid;grid-template-columns:70px repeat(${wares.length}, ${cell}px);gap:2px;padding:6px;background:#fff;position:absolute;left:0;top:0;z-index:99999}
    .c{width:${cell}px;height:${Math.round(cell * 1.03)}px;background:#efeae0} .c svg{width:100%;height:100%}
    .h{font:12px sans-serif;display:flex;align-items:center;justify-content:center;text-align:center}</style>`);
  document.body.innerHTML = '<div class="sheet"><div class="h"></div>' + wares.map(id => `<div class="h">${id || '(none)'}</div>`).join('')
    + rows.map(v => `<div class="h">${v}</div>` + wares.map(id => draw(v, id)).join('')).join('') + '</div>';
  const r = document.querySelector('.sheet').getBoundingClientRect(); return [Math.ceil(r.width) + 12, Math.ceil(r.height) + 12];
})(ARGS)"""

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("out"); ap.add_argument("--rows", default="hair", choices=["hair", "topStyle"])
    ap.add_argument("--only"); ap.add_argument("--cols"); ap.add_argument("--cell", type=int, default=92)
    a = ap.parse_args()
    only = a.only.split(",") if a.only else None
    cols = [None if c == "none" else c for c in a.cols.split(",")] if a.cols else None
    srv = subprocess.Popen(["/usr/bin/python3", "-m", "http.server", str(PORT), "--bind", "127.0.0.1"], cwd=ROOT, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(0.8)
    try:
        for back in (False, True):
            with Browser() as b:
                async def go():
                    async with websockets.connect(b.ws_url, max_size=None) as ws:
                        n = 0
                        async def call(m, p=None):
                            nonlocal n; n += 1
                            await ws.send(json.dumps({"id": n, "method": m, "params": p or {}}))
                            while True:
                                r = json.loads(await ws.recv())
                                if r.get("id") == n: return r
                        async def ev(js):
                            r = (await call("Runtime.evaluate", {"expression": js, "returnByValue": True, "awaitPromise": True}))["result"]
                            if "exceptionDetails" in r: raise RuntimeError(r["exceptionDetails"])
                            return r["result"].get("value")
                        await call("Page.navigate", {"url": f"http://127.0.0.1:{PORT}/"})
                        for _ in range(300):
                            try:
                                if await ev(READY): break
                            except Exception: pass
                            await asyncio.sleep(0.1)
                        w, h = await ev(SHEET.replace("ARGS", ", ".join(json.dumps(v) for v in (a.rows, only, cols, back, a.cell))))
                        await call("Emulation.setDeviceMetricsOverride", {"width": w, "height": h, "deviceScaleFactor": 1.5, "mobile": False})
                        await asyncio.sleep(0.4)
                        shot = await call("Page.captureScreenshot", {"format": "png", "clip": {"x": 0, "y": 0, "width": w, "height": h, "scale": 1}})
                        path = a.out[:-4] + "-back.png" if back else a.out
                        with open(path, "wb") as f: f.write(base64.b64decode(shot["result"]["data"]))
                        print(path)
                asyncio.run(go())
    finally:
        srv.terminate()

if __name__ == "__main__":
    main()
