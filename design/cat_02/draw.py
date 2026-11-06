"""Cat_02 drawings: the standing cat traced from its three drawings (standing, standing and waving, sitting and waving),
its back view, and the lying poses shared with Cat_01, built with the shared toolkit (neon_cat/neon.py). It walks
facing us (a waddle: one foot up, then the other), so it has no side view.

Coordinates: the same head space as Cat_01 (head 208..742 wide, eyes on y 421). Cat_02's head is a little flatter, so
its neck is at (476, 594). Its feet are on y = 1012, its middle is x = 481, and its body is symmetric about x = 475.
"""
import json, math, os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', 'neon_cat'))
from neon import *   # noqa: F401,F403 (geometry helpers, part, Kit, shared poses, faces, effects)

G = {k: [[tuple(p) for p in s] for s in v] for k, v in json.load(open(os.path.join(HERE, 'geometry.json'))).items()}
FLOOR, MID, AXIS = 1012, 481, 475
TAIL_BASE = (638, 840)
KIT = Kit(head=G['head'], tail=G['tail'], tail_base=TAIL_BASE, floor=FLOOR, mid=MID, neck=(476, 594), axis=AXIS,
          ears={'L': ((378.2, 223.1), (243.7, 320.9)), 'R': ((574.9, 222.0), (708.4, 321.9))})

SHOULDER_R = (600, 642)
SHOULDER_L = (2 * AXIS - SHOULDER_R[0], SHOULDER_R[1])
LEFT_HIP = G['legs'][0][0]   # where the left side meets the legs

def bend_end(stroke, target):
    """Moves the end of a stroke onto target, fading the shift in along the stroke so its start stays put."""
    dx, dy = target[0] - stroke[-1][0], target[1] - stroke[-1][1]; n = len(stroke) - 1
    return [(p[0] + dx * i / n, p[1] + dy * i / n) for i, p in enumerate(stroke)]

# the left arm raised is the right one mirrored; its lower side line is bent to meet the left hip
_m = mirror(AXIS)
ARM_L_UP = xf(G['armR_up'], _m)
SIDE_L_LOW = xf(G['sideR_low'], _m)
SIDE_L_LOW[-1] = bend_end(SIDE_L_LOW[-1], LEFT_HIP)

def foot_up(strokes, side, lift=40, out=10):
    """The legs with one foot lifted (and turned out a little); the crotch and the other foot stay put."""
    sgn = -1 if side == 'L' else 1
    res = []
    for s in strokes:
        q = []
        for (x, y) in s:
            w = max(0, min(1, (y - 900) / 90)) * max(0, min(1, sgn * (x - MID) / 40))
            q.append((x + sgn * out * w, y - lift * w))
        res.append(q)
    return res

def body(sitting=False):
    """Standing or sitting: the same upper body; the legs differ. Arm drawings switch with show (sideL/sideL_up, ...)."""
    return [
        part('tail', G['tail'], pivot=TAIL_BASE),
        part('legs', G['legs'], pivot=(MID, FLOOR), hidden=sitting),
        part('legsL', foot_up(G['legs'], 'L'), rig='legs', pivot=(MID, FLOOR), hidden=True),
        part('legsR', foot_up(G['legs'], 'R'), rig='legs', pivot=(MID, FLOOR), hidden=True),
        part('hipL', G['hipL'], hidden=sitting),
        part('legsSit', G['legsSit'], rig='legs', pivot=(MID, FLOOR), hidden=not sitting),
        part('sideL', G['sideL']),
        part('sideR', G['sideR']),
        part('sideR_up', G['sideR_low'], hidden=True),
        part('sideR_up', G['armR_up'], rig='armR', pivot=SHOULDER_R, hidden=True, layer=1),
        part('sideL_up', SIDE_L_LOW, hidden=True),
        part('sideL_up', ARM_L_UP, rig='armL', pivot=SHOULDER_L, hidden=True, layer=1),
        *KIT.head_parts(),
    ]

def pose_stand(): return {'parts': body(), 'face': ''}
def pose_sit(): return {'parts': body(sitting=True), 'face': ''}

def pose_back():
    """Seen from behind: the standing body mirrored, no face, the tail coming out low on the back."""
    m = mirror(AXIS)
    return {'parts': [
        part('body', xf(G['sideL'] + G['sideR'] + G['hipL'], m)),
        part('legs', xf(G['legs'], m), pivot=(MID, FLOOR)),
        part('tail', KIT.tail_at((AXIS + 40, 930), 6, .95), pivot=(AXIS + 40, 930), layer=1),
        *KIT.head_parts(None, mirrored=True),
    ], 'face': None, 'faceless': True}

DY = FLOOR - 866   # poses shared with Cat_01 are drawn on its floor
POSES = {
    'stand': pose_stand, 'sit': pose_sit, 'back': pose_back,
    'loaf': lambda: shift(pose_loaf(KIT), DY), 'belly': lambda: shift(pose_belly(KIT), DY), 'ball': lambda: shift(pose_ball(KIT), DY),
}
