#!/usr/bin/env python3
"""Cat_01: turns the drawings in draw.py into the files the player and the app use.

Writes, next to itself:
  cat_01-data.js    every pose, face piece and effect, plus the neon "tones", for the player (neon_cat/player.js)
  cat_01.svg        sitting pose on its own; parts are classes, the state (idle / happy / think) is a class on the <svg>
  cat_01-ball.svg   the curled-up ball
Run: python3 -I design/cat_01/build.py
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import draw
from draw import KIT, TONES, FACE, BALL_FACE, pose_sit, pose_ball, path, passes, svg_file, data, data_js

STATES_CSS = '''
.nq-cat .eyes-happy{display:none}
.nq-cat.happy .eyes{display:none}
.nq-cat.happy .eyes-happy{display:inline}
.nq-cat .tail{transform-origin:668px 800px}
.nq-cat .head{transform-origin:472px 618px}
.nq-cat .eyes{transform-origin:473px 421px}
.nq-cat .cat{transform-origin:520px 866px}
@media (prefers-reduced-motion: no-preference){
.nq-cat.idle .tail{animation:nq-wag 2.1s ease-in-out infinite}
.nq-cat.idle .eyes{animation:nq-blink 4.2s infinite}
.nq-cat.happy .cat{animation:nq-hop 1.1s ease-in-out infinite}
.nq-cat.happy .tail{animation:nq-wag-fast .55s ease-in-out infinite}
.nq-cat.think .head{animation:nq-tilt 3.2s ease-in-out infinite}
.nq-cat.think .eyes{animation:nq-look 3.2s ease-in-out infinite}
.nq-cat.think .tail{animation:nq-wag 3.2s ease-in-out infinite}
}
@keyframes nq-wag{0%,100%{transform:rotate(-4deg)}50%{transform:rotate(5deg)}}
@keyframes nq-wag-fast{0%,100%{transform:rotate(-9deg)}50%{transform:rotate(9deg)}}
@keyframes nq-blink{0%,90%,100%{transform:scaleY(1)}94%{transform:scaleY(.1)}}
@keyframes nq-hop{0%,100%{transform:translateY(0) scale(1,1)}12%{transform:translateY(0) scale(1.03,.96)}38%{transform:translateY(-34px) scale(.98,1.03)}62%{transform:translateY(0) scale(1,1)}70%{transform:translateY(0) scale(1.02,.98)}}
@keyframes nq-tilt{0%,100%{transform:rotate(0)}25%,75%{transform:rotate(-4deg)}}
@keyframes nq-look{0%,100%{transform:translateX(0)}25%,75%{transform:translateX(-10px) translateY(-6px)}}
'''.strip()

def static_sit():
    parts = {p['id']: p.get('d') or KIT.shapes[p['shape']] for p in pose_sit()['parts']}
    body = ''.join(f'<g class="{c}">{path(parts[k])}</g>' for k, c in
                   (('tail', 'tail'), ('body', 'body'), ('pawL', 'paws'), ('pawMid', 'paws'), ('pawR', 'paws'), ('head', 'head')))
    piece = lambda cls, tone, slot, key: f'<g class="{cls}">{passes(TONES[tone], path(FACE[slot][key][1]))}</g>'
    s = passes(TONES['white'], body)
    s += '<g class="head"><g class="face">'
    s += piece('eyes', 'eye', 'eyes', 'normal') + piece('eyes-happy', 'thin', 'eyes', 'happy') + piece('mouth', 'thin', 'mouth', 'w')
    s += '</g></g>'
    return f'<g class="cat" fill="none" stroke-linecap="round" stroke-linejoin="round">{s}</g>'

def static_ball():
    p = pose_ball()['parts'][0]
    s = passes(TONES['white'], path(p['d'])) + passes(TONES['thin'], path(BALL_FACE['squeeze'][1]))
    return f'<g fill="none" stroke-linecap="round" stroke-linejoin="round">{s}</g>'

if __name__ == '__main__':
    poses = {name: fn() for name, fn in draw.POSES.items()}
    out = {
        'cat_01-data.js': data_js('CAT01_DATA', data(KIT, poses), 'build.py from draw.py'),
        'cat_01.svg': svg_file(static_sit(), '110 55 850 850', 'Cat_01', 'nq-cat idle', STATES_CSS),
        'cat_01-ball.svg': svg_file(static_ball(), '-280 -280 560 560', 'Cat_01 縮成球'),
    }
    for name, text in out.items():
        open(os.path.join(draw.HERE, name), 'w').write(text)
        print(f'{name}: {len(text.encode()) // 1024} KB')
