#!/usr/bin/env python3
"""Traces a neon line drawing (white lines on black, PNG) into centre-line strokes.

  python3 -I design/neon_cat/trace.py drawing.png out.json [threshold]

out.json: {"size": [w, h], "strokes": [[[x, y], ...], ...]} (pixel coordinates, longest first), and out.html next to it
showing every stroke numbered in its own colour over the dimmed drawing, so you can tell which numbers make the head,
the body, the tail. Convert a JPEG first: sips -s format png -Z 1024 in.jpg --out drawing.png
"""
import json, math, os, struct, sys, zlib

def load_png(path):
    """8-bit grey / RGB / grey+alpha / RGBA PNG -> (w, h, brightness rows as lists of 0..255)."""
    d = open(path, 'rb').read()
    assert d[:8] == b'\x89PNG\r\n\x1a\n', 'not a PNG'
    i, idat = 8, b''
    while i < len(d):
        n, = struct.unpack('>I', d[i:i + 4]); t = d[i + 4:i + 8]; c = d[i + 8:i + 8 + n]; i += 12 + n
        if t == b'IHDR': w, h, depth, ctype = struct.unpack('>IIBB', c[:10])
        elif t == b'IDAT': idat += c
    assert depth == 8 and ctype in (0, 2, 4, 6), f'unsupported PNG (depth {depth}, colour type {ctype})'
    bpp = {0: 1, 2: 3, 4: 2, 6: 4}[ctype]
    raw = zlib.decompress(idat); stride = w * bpp; prev = bytearray(stride); p = 0; rows = []
    for _ in range(h):
        f = raw[p]; p += 1; line = bytearray(raw[p:p + stride]); p += stride
        if f == 1:
            for x in range(bpp, stride): line[x] = (line[x] + line[x - bpp]) & 255
        elif f == 2:
            for x in range(stride): line[x] = (line[x] + prev[x]) & 255
        elif f == 3:
            for x in range(stride): line[x] = (line[x] + (((line[x - bpp] if x >= bpp else 0) + prev[x]) >> 1)) & 255
        elif f == 4:
            for x in range(stride):
                a = line[x - bpp] if x >= bpp else 0; b = prev[x]; c = prev[x - bpp] if x >= bpp else 0
                pa, pb, pc = abs(b - c), abs(a - c), abs(a + b - 2 * c)
                line[x] = (line[x] + (a if pa <= pb and pa <= pc else (b if pb <= pc else c))) & 255
        prev = line
        if ctype in (0, 4): rows.append(list(line[0::bpp]))
        else: rows.append([min(line[x], line[x + 1], line[x + 2]) for x in range(0, stride, bpp)])   # white = all channels high
    return w, h, rows

RING = [(0, -1), (1, -1), (1, 0), (1, 1), (0, 1), (-1, 1), (-1, 0), (-1, -1)]

def thin(mask):
    """Zhang-Suen thinning of a set of (x, y) pixels."""
    M = set(mask)
    changed = True
    while changed:
        changed = False
        for step in (0, 1):
            rem = []
            for (x, y) in M:
                n = [((x + dx, y + dy) in M) for dx, dy in RING]
                B = sum(n)
                if B < 2 or B > 6: continue
                if sum(1 for k in range(8) if not n[k] and n[(k + 1) % 8]) != 1: continue
                P2, P3, P4, P5, P6, P7, P8, P9 = n
                if step == 0 and ((P2 and P4 and P6) or (P4 and P6 and P8)): continue
                if step == 1 and ((P2 and P4 and P8) or (P2 and P6 and P8)): continue
                rem.append((x, y))
            if rem:
                changed = True
                M.difference_update(rem)
    return M

def walk_strokes(S):
    """Splits a one-pixel skeleton into strokes between end points and junctions."""
    nb = lambda p: [(p[0] + dx, p[1] + dy) for dx, dy in RING if (p[0] + dx, p[1] + dy) in S]
    def crossings(p):
        r = [((p[0] + dx, p[1] + dy) in S) for dx, dy in RING]
        return sum(1 for k in range(8) if not r[k] and r[(k + 1) % 8])
    nodes = {p for p in S if crossings(p) != 2}
    visited = set(nodes); strokes = []
    def walk(start, first):
        path = [start, first]; visited.add(first); prev, cur = start, first
        while cur not in nodes:
            c = [q for q in nb(cur) if q != prev and q not in visited]
            if not c:
                c2 = [q for q in nb(cur) if q != prev and q in nodes and q != start]
                if c2: path.append(c2[0])
                break
            c.sort(key=lambda q: (q not in nodes, abs(q[0] - cur[0]) + abs(q[1] - cur[1])))
            prev, cur = cur, c[0]; path.append(cur); visited.add(cur)
        return path
    for n in sorted(nodes):
        for b in nb(n):
            if b not in visited: strokes.append(walk(n, b))
    for p in sorted(S):   # closed loops without any node
        if p not in visited:
            visited.add(p); q = [x for x in nb(p) if x not in visited]
            strokes.append(walk(p, q[0]) if q else [p])
    return strokes

def rdp(pts, eps):
    if len(pts) < 3: return pts
    a, b = pts[0], pts[-1]; dx, dy = b[0] - a[0], b[1] - a[1]; L = math.hypot(dx, dy) or 1
    dm, im = 0, 0
    for i in range(1, len(pts) - 1):
        d = abs(dy * (pts[i][0] - a[0]) - dx * (pts[i][1] - a[1])) / L
        if d > dm: dm, im = d, i
    if dm > eps: return rdp(pts[:im + 1], eps)[:-1] + rdp(pts[im:], eps)
    return [a, b]

def trace(path, threshold=200, min_len=10, eps=1.6):
    w, h, rows = load_png(path)
    mask = [(x, y) for y in range(h) for x in range(w) if rows[y][x] > threshold]
    strokes = [s for s in walk_strokes(thin(mask)) if len(s) >= min_len]
    strokes.sort(key=lambda s: -len(s))
    return w, h, [[list(p) for p in rdp(s, eps)] for s in strokes]

COLOURS = ['#e6194b', '#3cb44b', '#4363d8', '#f58231', '#911eb4', '#42d4f4', '#f032e6', '#bfef45', '#fabed4', '#469990',
           '#dcbeff', '#9A6324', '#fffac8', '#800000', '#aaffc3', '#808000', '#ffd8b1', '#a9a9a9']

def debug_html(img, w, h, strokes, out):
    s = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" height="{h}" style="background:#111">',
         f'<image href="{os.path.relpath(img, os.path.dirname(out))}" width="{w}" height="{h}" opacity="0.25"/>']
    for i, st in enumerate(strokes):
        c = COLOURS[i % len(COLOURS)]
        s.append(f'<polyline points="{" ".join(f"{x},{y}" for x, y in st)}" fill="none" stroke="{c}" stroke-width="3"/>')
        mx, my = st[len(st) // 2]
        s.append(f'<text x="{mx + 5}" y="{my - 5}" fill="{c}" font-size="16" font-family="sans-serif" font-weight="bold">{i}</text>')
    s.append('</svg>')
    open(out, 'w').write('<!doctype html><body style="margin:0;background:#111">' + '\n'.join(s) + '</body>')

if __name__ == '__main__':
    img, out = sys.argv[1], sys.argv[2]
    th = int(sys.argv[3]) if len(sys.argv) > 3 else 200
    w, h, strokes = trace(img, th)
    json.dump({'size': [w, h], 'strokes': strokes}, open(out, 'w'))
    debug_html(img, w, h, strokes, os.path.splitext(out)[0] + '.html')
    print(f'{len(strokes)} strokes')
