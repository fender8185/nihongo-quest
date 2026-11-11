#!/usr/bin/env python3
"""Renders the gramophone's records (MUSIC.RECORDS in js/71a_yard.js, those with a `file`) to the AAC files the app plays.

The music is written in scripts/music-synth.js (since 2026-11-11 the app only plays the files): MUSIC_SYNTH.render() plays it
in an OfflineAudioContext in headless Chrome, twice round with the second kept (so it loops without a seam), as WAV; macOS
afconvert makes the .m4a.
A record whose music changes gets a new file name (engawa-2.m4a): the service worker keeps a file forever.

    .venv/bin/python3 -I scripts/render-music.py            # every record whose file is missing
    .venv/bin/python3 -I scripts/render-music.py engawa     # that one again
"""
import base64, json, os, socket, subprocess, sys, tempfile, time
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "tests", "e2e"))
from cdp import Browser

def free_port():
    with socket.socket() as s:
        s.bind(("127.0.0.1", 0)); return s.getsockname()[1]

port = free_port()
srv = subprocess.Popen([sys.executable, os.path.join(ROOT, "tests", "e2e", "serve.py"), str(port), "--bind", "127.0.0.1"], cwd=ROOT, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
try:
    time.sleep(0.8)
    with Browser() as b:
        recs = b.run([("nav", f"http://127.0.0.1:{port}/"), ("wait", "typeof MUSIC === 'object'"), ("eval", "JSON.stringify(MUSIC.RECORDS.filter(r => r.file).map(r => [r.id, r.file]))")])[0]
        b.run([("eval", open(os.path.join(ROOT, "scripts", "music-synth.js"), encoding="utf-8").read() + "\n;1")])   # the scores and the synth, into the page
        for rid, path in json.loads(recs):
            dest = os.path.join(ROOT, path)
            if (sys.argv[1:] and rid not in sys.argv[1:]) or (not sys.argv[1:] and os.path.exists(dest)): continue
            r = b.run([("eval", f"MUSIC_SYNTH.render({json.dumps(rid)})")], timeout=300)[0]
            with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as f:
                f.write(base64.b64decode(r["b64"])); wav = f.name
            os.makedirs(os.path.dirname(dest), exist_ok=True)
            subprocess.run(["afconvert", "-f", "m4af", "-d", "aac", "-b", "128000", wav, dest], check=True)
            os.unlink(wav)
            print(f"{rid}: {r['seconds']:.1f} s, peak {r['top']:.3f} → {path} ({os.path.getsize(dest) // 1024} KB)")
finally:
    srv.terminate()
