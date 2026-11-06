#!/usr/bin/env python3
"""Cat_02: turns the drawings in draw.py into the files the player and the app use.

Writes, next to itself:
  cat_02-data.js    every pose, face piece and effect, plus the neon "tones", for the player (neon_cat/player.js)
  cat_02.svg        the standing cat on its own (face and blink), no player needed
Run: python3 -I design/cat_02/build.py
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import draw
from draw import KIT, TONES, FACE, pose_stand, path, passes, svg_file, data, data_js

STATES_CSS = '''
.nq-cat2 .eyes{transform-origin:473px 421px}
.nq-cat2 .tail{transform-origin:638px 840px}
@media (prefers-reduced-motion: no-preference){
.nq-cat2 .eyes{animation:nq2-blink 4.2s infinite}
.nq-cat2 .tail{animation:nq2-wag 2.4s ease-in-out infinite}
}
@keyframes nq2-blink{0%,90%,100%{transform:scaleY(1)}94%{transform:scaleY(.1)}}
@keyframes nq2-wag{0%,100%{transform:rotate(-4deg)}50%{transform:rotate(5deg)}}
'''.strip()

def static_stand():
    shown = [p for p in pose_stand()['parts'] if not p.get('hidden')]
    body = ''.join(f'<g class="{"tail" if p["id"] == "tail" else "body"}">{path(p.get("d") or KIT.shapes[p["shape"]])}</g>' for p in shown)
    piece = lambda cls, tone, slot, key: f'<g class="{cls}">{passes(TONES[tone], path(FACE[slot][key][1]))}</g>'
    s = passes(TONES['white'], body) + piece('eyes', 'eye', 'eyes', 'normal') + piece('mouth', 'thin', 'mouth', 'w')
    return f'<g fill="none" stroke-linecap="round" stroke-linejoin="round">{s}</g>'

if __name__ == '__main__':
    poses = {name: fn() for name, fn in draw.POSES.items()}
    out = {
        'cat_02-data.js': data_js('CAT02_DATA', data(KIT, poses), 'build.py from draw.py'),
        'cat_02.svg': svg_file(static_stand(), '150 140 760 900', 'Cat_02', 'nq-cat2', STATES_CSS),
    }
    for name, text in out.items():
        open(os.path.join(draw.HERE, name), 'w').write(text)
        print(f'{name}: {len(text.encode()) // 1024} KB')
