"""Cat_01 drawings: its poses, built from the traced lines in geometry.json and the shared toolkit (neon_cat/neon.py).

The sitting pose is the traced original. Every other pose reuses the same front-facing head, so one set of faces works
everywhere. Coordinates: the sitting cat's feet rest on y = 866, its middle is x = 520, the head turns around the neck
at (472, 618).
"""
import json, os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', 'neon_cat'))
from neon import *   # noqa: F401,F403 (geometry helpers, part, Kit, shared poses, faces, effects)

TRACED = {k: [[tuple(p) for p in s] for s in v] for k, v in json.load(open(os.path.join(HERE, 'geometry.json'))).items()}
FLOOR = 866

# ---------- traced sitting cat, split into movable parts ----------
paw_l = TRACED['pawL'][0]; cut = paw_l.index((422, 837))
SIT = {
    'tail': TRACED['tail'],
    'body': TRACED['body'],
    'pawL': [paw_l[:cut + 1]],
    'pawMid': [paw_l[cut:], TRACED['pawL'][1]],   # the line the two front paws share
    'pawR': TRACED['pawR'],
    'head': TRACED['head'],
}
TAIL_BASE = (668, 800)
KIT = Kit(head=SIT['head'], tail=TRACED['tail'], tail_base=TAIL_BASE,
          ears={'L': ((375, 202), (244, 304)), 'R': ((586, 207), (715, 321))}, floor=FLOOR)

# ---------- poses ----------
def pose_sit():
    # raised paws grow out of the body's side (the line there is hidden behind them) and come up beside the face
    up_r, up_end = limb([(646, 712), (634, 640), (604, 574)], 88, 46)
    up_l, up_l_end = limb([(324, 712), (334, 640), (362, 574)], 88, 46)
    lick, _ = limb([(648, 716), (618, 628), (548, 538)], 86, 44, toes='end')
    return {'parts': [
        part('tail', SIT['tail'], pivot=TAIL_BASE),
        part('body', SIT['body']),
        part('pawL', SIT['pawL'], pivot=(380, 800)),
        part('pawMid', SIT['pawMid'], pivot=(430, 800)),
        part('pawR', SIT['pawR'], pivot=(470, 800)),
        *paw_parts('pawR_up', up_r, up_end, (646, 712), hidden=True),
        part('pawR_lick', lick, pivot=(648, 716), hidden=True, layer=1),
        *paw_parts('pawL_up', up_l, up_l_end, (324, 712), hidden=True),
        *KIT.head_parts(),
    ], 'face': ''}

SIDE_A = (650, 590); SIDE_S = .84
def pose_side():
    """Walking to the right: chunky body, short fat legs; the far legs are dimmer, behind the body."""
    place = head_place(SIDE_A, 0, SIDE_S); hp = lambda q: placed(q, SIDE_A, 0, SIDE_S)
    # the back comes out from behind the lower back of the head; the belly sags a little between the legs
    body = [hp((266, 566)), (398, 556), (310, 564), (238, 590), (192, 636), (174, 700), (186, 758), (228, 796),
            (312, 808), (440, 822), (566, 816), (680, 798), (728, 764), (754, 702), (768, 638), hp((614, 611))]
    parts = [part('tail', KIT.tail_at((214, 618), -52, .92), pivot=(214, 618), layer=-1)]
    for k, top, tip, w, r in (('legBF', (236, 790), (240, 826), 84, 40), ('legFF', (602, 794), (606, 826), 84, 40)):
        st, _ = limb([top, tip], w, r)
        parts.append(part(k, st, pivot=top, tone='dim', layer=-1))
    parts.append(part('body', [body]))
    for k, top, tip in (('legBN', (296, 776), (300, 822)), ('legFN', (668, 772), (672, 822))):
        st, _ = limb([top, tip], 92, 45, toes=1)
        parts.append(part(k, st, pivot=top, layer=1))
    parts += KIT.head_parts(place)
    return {'parts': parts, 'face': place}

def pose_back():
    """Seen from behind: no face, a round back closed at the bottom, the haunches, the tail curled up one side."""
    body = [(329, 611), (310, 680), (298, 760), (312, 826), (360, 862), (430, 872), (500, 872), (566, 862), (614, 826),
            (628, 760), (616, 680), (595, 615)]
    haunches = [[(336, 742), (346, 800), (390, 850)], [(590, 742), (580, 800), (536, 850)]]
    return {'parts': [
        part('body', [body] + haunches),
        part('tail', KIT.tail_at((600, 842), 4, 1.0), pivot=(600, 842), layer=1),
        *KIT.head_parts(None, mirrored=True),
    ], 'face': None, 'faceless': True}

STAND_A = (472, 540)
def pose_stand():
    """Up on the hind legs; short arms hang from the shoulders (raising them shows the beans: armL_palm/armR_palm)."""
    place = head_place(STAND_A); hp = lambda q: placed(q, STAND_A)
    left = [hp((349, 615)), (334, 582), (318, 660), (318, 742), (344, 800)]
    right = [hp((615, 611)), (632, 582), (650, 660), (648, 742), (622, 800)]
    crotch = [(424, 838), (452, 812), (482, 806), (512, 812), (540, 838)]
    foot_l, _ = limb([(378, 790), (376, 824)], 94, 46, toes='end')
    foot_r, _ = limb([(588, 790), (590, 824)], 94, 46, toes='end')
    arm_l, end_l = limb([(346, 612), (322, 664), (306, 716)], 80, 40, toes='end')
    arm_r, end_r = limb([(620, 608), (644, 660), (660, 712)], 80, 40, toes='end')
    pad_l, toes_l = beans(end_l); pad_r, toes_r = beans(end_r)
    return {'parts': [
        part('tail', KIT.tail_at((652, 784), -6, .9), pivot=(652, 784)),
        part('body', [left, right, crotch]),
        part('feet', foot_l + foot_r, layer=1),
        part('armL', arm_l, pivot=(346, 612), layer=1),
        part('armR', arm_r, pivot=(620, 608), layer=1),
        part('armL_palm', pad_l, rig='armL', pivot=(346, 612), layer=2, tone='padS', hidden=True),
        part('armL_palm', toes_l, rig='armL', pivot=(346, 612), layer=2, tone='toeS', hidden=True),
        part('armR_palm', pad_r, rig='armR', pivot=(620, 608), layer=2, tone='padS', hidden=True),
        part('armR_palm', toes_r, rig='armR', pivot=(620, 608), layer=2, tone='toeS', hidden=True),
        *KIT.head_parts(place),
    ], 'face': place}

POSES = {'sit': pose_sit, 'loaf': lambda: pose_loaf(KIT), 'side': pose_side, 'back': pose_back,
         'belly': lambda: pose_belly(KIT), 'stand': pose_stand, 'ball': lambda: pose_ball(KIT)}
