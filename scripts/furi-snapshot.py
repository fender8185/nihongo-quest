#!/usr/bin/env python3
"""Snapshot the furigana of every built-in text, and compare two snapshots.
Usage: python3 -I scripts/furi-snapshot.py OUT.json [PORT]       writes {path: furi(text)} for every DATA string with kana in it
       python3 -I scripts/furi-snapshot.py --diff A.json B.json   prints the paths whose furigana changed between A and B
New words join the furigana index, so a content batch can change how old sentences are read (longest match, reading priority;
docs/superpowers/specs/2026-10-31-n3-level-design.md §4.5): take a snapshot before merging a batch and one after, and compare.
Paths only in B are texts the batch added and are not compared. Word fields (w, r, m) and Chinese (…Zh) are skipped."""
import json, os, subprocess, sys, time
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)

if sys.argv[1:2] == ["--diff"]:
    a, b = (json.load(open(p, encoding="utf-8")) for p in sys.argv[2:4])
    changed = [k for k in sorted(a) if k in b and a[k] != b[k]]
    for k in changed: print(k, "\n  before:", a[k], "\n  after: ", b[k])
    print(f"{len(changed)} changed")
    sys.exit(0)

sys.path.insert(0, os.path.join(ROOT, "tests", "e2e"))
from cdp import Browser
out = sys.argv[1]; port = int(sys.argv[2]) if len(sys.argv) > 2 else 8811
JS = r"""(() => { const out = {}; const KANA = /[ぁ-ゖァ-ヺ]/;
  const walk = (x, path) => {
    if (typeof x === 'string') { const last = path.split('.').pop(); if (KANA.test(x) && !/^(w|r|m)$|Zh\d*$/.test(last)) out[path] = furi(x.replace(/[{}]/g, '')); return; }
    if (Array.isArray(x)) x.forEach((y, i) => walk(y, path + '.' + i));
    else if (x && typeof x === 'object') Object.keys(x).forEach(k => walk(x[k], path ? path + '.' + k : k));
  };
  walk(DATA, ''); return JSON.stringify(out); })()"""
srv = subprocess.Popen([sys.executable, "-m", "http.server", str(port), "--bind", "127.0.0.1"], cwd=ROOT, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(0.8)
try:
    with Browser() as b:
        snap = json.loads(b.run([("nav", f"http://127.0.0.1:{port}/"), ("wait", "typeof REG === 'object' && REG.vocab && REG.vocab.length > 0 && typeof furi === 'function'"), ("eval", JS)], timeout=240)[-1])
finally:
    srv.terminate()
json.dump(snap, open(out, "w", encoding="utf-8"), ensure_ascii=False, indent=0, sort_keys=True)
print(f"{len(snap)} texts written to {out}")
