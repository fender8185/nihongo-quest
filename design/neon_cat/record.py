#!/usr/bin/env python3
"""Records a gallery page frame by frame in headless Chrome (needs websockets: use the test .venv).
  stills:  .venv/bin/python -I design/neon_cat/record.py "design/cat_01/gallery.html#play=bored.yawn" 1000 410 stills OUTDIR 500 1500 ...
  animated WebP:  .venv/bin/python -I design/neon_cat/record.py "design/cat_02/gallery.html#play=happy.10" 1000 410 anim 25 5200 out.webp
The page path is relative to the current folder; OUTDIR and the WebP are written there too.
Times are ms on the page's animation clock; every animation is paused and set to that time before each shot."""
import asyncio, base64, json, struct, subprocess, sys, tempfile, time, urllib.request, socket, os
import websockets
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
HERE = os.getcwd()
page, W, H, mode = sys.argv[1], int(sys.argv[2]), int(sys.argv[3]), sys.argv[4]

def riff_chunks(b):
    i = 12; out = []
    while i < len(b):
        t = b[i:i+4]; n, = struct.unpack('<I', b[i+4:i+8]); out.append((t, b[i+8:i+8+n])); i += 8 + n + (n & 1)
    return out
def rchunk(t, d): return t + struct.pack('<I', len(d)) + d + (b'\0' if len(d) & 1 else b'')
u24 = lambda v: struct.pack('<I', v)[:3]
def awebp(frames, delay):
    body = b''
    for f in frames:
        img = b''.join(rchunk(t, d) for t, d in riff_chunks(f) if t in (b'VP8 ', b'VP8L', b'ALPH'))
        body += rchunk(b'ANMF', u24(0) + u24(0) + u24(W-1) + u24(H-1) + u24(delay) + b'\x02' + img)
    payload = (b'WEBP' + rchunk(b'VP8X', bytes([2, 0, 0, 0]) + u24(W-1) + u24(H-1))
               + rchunk(b'ANIM', bytes([0x13, 0x0f, 0x0e, 0xff]) + struct.pack('<H', 0)) + body)
    return b'RIFF' + struct.pack('<I', len(payload)) + payload

async def main():
    with socket.socket() as sk:
        sk.bind(('127.0.0.1', 0)); port = sk.getsockname()[1]
    prof = tempfile.mkdtemp(prefix='nq-cap-')
    proc = subprocess.Popen([CHROME, '--headless=new', '--disable-gpu', '--no-first-run', f'--user-data-dir={prof}',
                             f'--remote-debugging-port={port}', 'about:blank'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    try:
        for _ in range(200):
            try:
                tabs = json.load(urllib.request.urlopen(f'http://127.0.0.1:{port}/json')); break
            except Exception:
                time.sleep(.1)
        url = [t for t in tabs if t['type'] == 'page'][0]['webSocketDebuggerUrl']
        async with websockets.connect(url, max_size=None) as ws:
            n = 0
            async def call(m, p=None):
                nonlocal n; n += 1; my = n
                await ws.send(json.dumps({'id': my, 'method': m, 'params': p or {}}))
                while True:
                    r = json.loads(await ws.recv())
                    if r.get('id') == my:
                        if 'error' in r: raise RuntimeError(r['error'])
                        return r['result']
            await call('Emulation.setDeviceMetricsOverride', {'width': W, 'height': H, 'deviceScaleFactor': 1, 'mobile': False})
            path, _, frag = page.partition('#')
            await call('Page.navigate', {'url': 'file://' + os.path.join(HERE, path) + ('#' + frag if frag else '')}); await asyncio.sleep(1.2)
            async def at(t, fmt):
                await call('Runtime.evaluate', {'expression': f'document.getAnimations().forEach(a=>{{a.pause();a.currentTime={t}}});'
                           'new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))', 'awaitPromise': True})
                p = {'format': fmt}
                if fmt == 'webp': p['quality'] = 90
                return base64.b64decode((await call('Page.captureScreenshot', p))['data'])
            if mode == 'stills':
                outdir = os.path.join(HERE, sys.argv[5]); os.makedirs(outdir, exist_ok=True)
                for t in sys.argv[6:]:
                    open(os.path.join(outdir, f'{t}.png'), 'wb').write(await at(float(t), 'png'))
            else:
                fps = int(sys.argv[5]); total = float(sys.argv[6]); out = sys.argv[7]
                frames = [await at(i * 1000 / fps, 'webp') for i in range(round(total * fps / 1000))]
                data = awebp(frames, round(1000 / fps)); open(os.path.join(HERE, out), 'wb').write(data)
                print(out, len(frames), 'frames', len(data) // 1024, 'KB')
    finally:
        proc.terminate(); proc.wait()
asyncio.run(main())
