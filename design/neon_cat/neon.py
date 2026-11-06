"""Shared toolkit for the neon cats (Cat_01, Cat_02, ...): geometry, the glow, faces, effects, poses any cat can use,
and the data file the player reads.

Every cat is drawn in the same 1024 "head space": its head is traced so it lines up with Cat_01's head (neck at
(472, 618), eyes at y 421), which is why one set of faces and ear drawings fits them all. A cat's own floor (where its
feet are) can differ; poses shared from Cat_01 (floor 866) are moved with shift().
"""
import json, math

# ---------- geometry ----------
def f1(v): return ('%.1f' % v).rstrip('0').rstrip('.')
def smooth(pts, closed=False):
    """Catmull-Rom through the points, as cubic Béziers."""
    n = len(pts)
    if n == 2: return f'M{f1(pts[0][0])} {f1(pts[0][1])}L{f1(pts[1][0])} {f1(pts[1][1])}'
    d = f'M{f1(pts[0][0])} {f1(pts[0][1])}'
    for i in range(n if closed else n - 1):
        a = pts[i - 1] if (i or closed) else pts[i]; b = pts[i]
        c = pts[(i + 1) % n]; e = pts[(i + 2) % n] if (closed or i + 2 < n) else pts[i + 1]
        d += (f'C{f1(b[0] + (c[0] - a[0]) / 6)} {f1(b[1] + (c[1] - a[1]) / 6)} '
              f'{f1(c[0] - (e[0] - b[0]) / 6)} {f1(c[1] - (e[1] - b[1]) / 6)} {f1(c[0])} {f1(c[1])}')
    return d + ('Z' if closed else '')
def strokes_d(strokes): return ''.join(smooth(s) for s in strokes)
def xf(strokes, fn): return [[fn(p) for p in s] for s in strokes]
def rot(p, c, deg):
    t = math.radians(deg); x, y = p[0] - c[0], p[1] - c[1]
    return (c[0] + x * math.cos(t) - y * math.sin(t), c[1] + x * math.sin(t) + y * math.cos(t))
def mirror(cx): return lambda p: (2 * cx - p[0], p[1])
def move(dx, dy): return lambda p: (p[0] + dx, p[1] + dy)
def chain(*fns):
    def f(p):
        for g in fns: p = g(p)
        return p
    return f
def arc(c, r, a0, a1, n=12, ry=None):
    ry = ry or r
    return [(c[0] + r * math.cos(math.radians(a0 + (a1 - a0) * i / n)), c[1] + ry * math.sin(math.radians(a0 + (a1 - a0) * i / n)))
            for i in range(n + 1)]
def bez(p0, p1, p2, p3, n=10):
    out = []
    for i in range(n + 1):
        t = i / n; m = 1 - t
        out.append((m ** 3 * p0[0] + 3 * m * m * t * p1[0] + 3 * m * t * t * p2[0] + t ** 3 * p3[0],
                    m ** 3 * p0[1] + 3 * m * m * t * p1[1] + 3 * m * t * t * p2[1] + t ** 3 * p3[1]))
    return out
def resample(center, n=16):
    """Smooth curve (Catmull-Rom) through a centreline, as about n+1 points."""
    if len(center) == 2: center = [center[0], ((center[0][0] + center[1][0]) / 2, (center[0][1] + center[1][1]) / 2), center[1]]
    segs = len(center) - 1; out = []
    for s in range(segs):
        a = center[s - 1] if s else center[s]; b = center[s]; c = center[s + 1]; e = center[s + 2] if s + 2 < len(center) else center[s + 1]
        seg = bez(b, (b[0] + (c[0] - a[0]) / 6, b[1] + (c[1] - a[1]) / 6), (c[0] - (e[0] - b[0]) / 6, c[1] - (e[1] - b[1]) / 6), c, max(3, n // segs))
        out += seg if s == 0 else seg[1:]
    return out
def nearest(stroke, p):
    """Index of the stroke point closest to p."""
    return min(range(len(stroke)), key=lambda i: math.dist(stroke[i], p))

def limb(center, w_base, r_tip, toes=None):
    """A leg, arm, paw or tail along a centreline from its base (left open) to a round tip.
    toes: None, 'end' (two marks across the round end), or +1 / -1 (two marks on one side of the end, for feet seen
    side-on: +1 = the side the tip turns toward when going clockwise). Returns (strokes, (tip, direction, radius))."""
    pts = resample(center)
    L = [0.0]
    for i in range(1, len(pts)): L.append(L[-1] + math.dist(pts[i - 1], pts[i]))
    left, right = [], []
    for i, p in enumerate(pts):
        hw = w_base / 2 + (r_tip - w_base / 2) * (L[i] / L[-1])
        a = pts[max(i - 1, 0)]; b = pts[min(i + 1, len(pts) - 1)]
        dx, dy = b[0] - a[0], b[1] - a[1]; d = math.hypot(dx, dy); nx, ny = -dy / d, dx / d
        left.append((p[0] + nx * hw, p[1] + ny * hw)); right.append((p[0] - nx * hw, p[1] - ny * hw))
    tip = pts[-1]; a = pts[-2]; d = math.dist(a, tip); u = ((tip[0] - a[0]) / d, (tip[1] - a[1]) / d)
    ang = math.degrees(math.atan2(u[1], u[0]))
    strokes = [left + arc(tip, r_tip, ang + 90, ang - 90, 12)[1:-1] + right[::-1]]
    nx, ny = -u[1], u[0]
    if toes == 'end':
        for off in (-.36, .36):
            sx, sy = tip[0] + nx * r_tip * off, tip[1] + ny * r_tip * off
            strokes.append([(sx + u[0] * r_tip * .5, sy + u[1] * r_tip * .5), (sx + u[0] * r_tip * .92, sy + u[1] * r_tip * .92)])
    elif toes in (1, -1):
        for da in (34, 62):
            t = math.radians(ang - toes * da)
            strokes.append([(tip[0] + math.cos(t) * r_tip * .5, tip[1] + math.sin(t) * r_tip * .5),
                            (tip[0] + math.cos(t) * r_tip * .92, tip[1] + math.sin(t) * r_tip * .92)])
    return strokes, (tip, u, r_tip)

def beans(end):
    """Toe beans on a paw whose sole faces us: one fat main pad toward the wrist, three toes toward the tip."""
    (cx, cy), (ux, uy), r = end; nx, ny = -uy, ux
    P = lambda a, b: (cx + ux * a * r + nx * b * r, cy + uy * a * r + ny * b * r)
    pad = [[P(-.02, -.3), P(-.3, -.14), P(-.34, .14), P(-.02, .3)]]
    toes = [[P(.36, -.46), P(.361, -.46)], [P(.52, 0), P(.521, 0)], [P(.36, .46), P(.361, .46)]]
    return pad, toes

def fluffy(center, w, r_tip, notches=3, side=1):
    """A tail drawn as a band with a round tip and a few fur notches on one edge."""
    strokes, end = limb(center, w, r_tip)
    pts = resample(center, 30); n = len(pts)
    for k in range(notches):
        i = int(n * (.3 + .5 * k / max(1, notches - 1)))
        a, b = pts[max(i - 1, 0)], pts[min(i + 1, n - 1)]
        dx, dy = b[0] - a[0], b[1] - a[1]; d = math.hypot(dx, dy); nx, ny = -dy / d * side, dx / d * side
        hw = w / 2 + (r_tip - w / 2) * (i / (n - 1))
        p = pts[i]
        e = (p[0] + nx * hw, p[1] + ny * hw)
        strokes.append([(e[0] - dx / d * 4 - nx * 2, e[1] - dy / d * 4 - ny * 2), (e[0] + dx / d * 10 - nx * 16, e[1] + dy / d * 10 - ny * 16)])
    return strokes

# ---------- pose pieces ----------
def part(id, strokes=None, d=None, pivot=None, rig=None, place=None, hidden=False, tone=None, layer=0, shape=None):
    """One drawn piece of a pose. id: what show/hide switches (pieces can share one); rig: what moves it (default id);
    tone: glow style (default white); layer: drawing order (-1 behind the body, 1 in front, 2 toe beans)."""
    p = {'id': id}
    if shape: p['shape'] = shape
    else: p['d'] = d if d is not None else strokes_d(strokes)
    if pivot: p['pivot'] = [round(pivot[0], 1), round(pivot[1], 1)]
    if rig: p['rig'] = rig
    if place: p['place'] = place
    if hidden: p['hidden'] = 1
    if tone: p['tone'] = tone
    if layer: p['layer'] = layer
    return p

def paw_parts(id, strokes, end, pivot, hidden=False, layer=1, palm=True, rig=None, tone=None, small=False):
    """A paw/limb in front of the body, plus its toe beans when the sole faces us."""
    out = [part(id, strokes, pivot=pivot, hidden=hidden, layer=layer, rig=rig, tone=tone)]
    if palm:
        pad, toes = beans(end)
        sz = 'S' if small else ''
        out += [part(id, pad, pivot=pivot, hidden=hidden, layer=layer + 1, rig=rig or id, tone='pad' + sz),
                part(id, toes, pivot=pivot, hidden=hidden, layer=layer + 1, rig=rig or id, tone='toe' + sz)]
    return out

def shift(pose, dy):
    """Moves a pose down by dy (for poses drawn on Cat_01's floor, used by a cat whose floor is lower)."""
    if not dy: return pose
    t = f'translate(0 {f1(dy)})'
    for p in pose['parts']: p['place'] = t + (' ' + p['place'] if p.get('place') else '')
    for k in ('face', 'ballFace'):
        if pose.get(k) is not None: pose[k] = t + (' ' + pose[k] if pose[k] else '')
    return pose

NECK = (472, 618)
HEAD_VARIANTS = {   # id -> how the ears sit; every pose with a face gets all of them (only `head` shows at rest)
    'head': None,
    'headFlat': {'L': -52, 'R': 52, 'shrink': .22},     # folded out and down: sad, scared, angry
    'headFlatHalf': {'L': -26, 'R': 26, 'shrink': .11},
    'headTwL': {'L': -36, 'shrink': .06},               # ear twitch, one drawing each side
    'headTwR': {'R': 36, 'shrink': .06},
    'headPerk': {'L': 9, 'R': -9},                      # ears pointed a little inward: alert, curious
}

def head_place(anchor, deg=0, scale=1.0):
    """SVG transform that puts the head's neck at `anchor`."""
    return f'translate({f1(anchor[0])} {f1(anchor[1])}) rotate({f1(deg)}) scale({scale}) translate({-NECK[0]} {-NECK[1]})'
def placed(p, anchor, deg=0, scale=1.0):
    q = ((p[0] - NECK[0]) * scale, (p[1] - NECK[1]) * scale); q = rot(q, (0, 0), deg)
    return (q[0] + anchor[0], q[1] + anchor[1])

class Kit:
    """One cat's traced pieces that every pose is built from: head outline, tail, where the ears and tail attach,
    the neck the head turns around, the middle line its back view mirrors around, and its floor."""
    def __init__(self, head, tail, tail_base, ears, floor, mid=520, neck=NECK, axis=472):
        self.head, self.tail, self.tail_base, self.ears = head, tail, tail_base, ears
        self.floor, self.mid, self.neck, self.axis = floor, mid, neck, axis
        self.shapes = {}   # pieces several poses use, stored once in the data (the head and its ear drawings)

    def place(self, anchor, deg=0, scale=1.0):
        """SVG transform that puts this cat's neck at `anchor`."""
        n = self.neck
        return f'translate({f1(anchor[0])} {f1(anchor[1])}) rotate({f1(deg)}) scale({scale}) translate({f1(-n[0])} {f1(-n[1])})'
    def placed(self, p, anchor, deg=0, scale=1.0):
        n = self.neck; q = ((p[0] - n[0]) * scale, (p[1] - n[1]) * scale); q = rot(q, (0, 0), deg)
        return (q[0] + anchor[0], q[1] + anchor[1])
    def on_head(self, q):
        """The point of this cat's head outline at q (poses drawn for Cat_01's head attach lines at its points)."""
        best = min((p for s in self.head for p in s), key=lambda p: math.dist(p, q))
        return q if math.dist(best, q) <= 4 else best

    def ears_bent(self, turns, shrink=0.0):
        """Head with ears turned around their bases, most at the tip; turns = {'L': degrees, 'R': degrees}.
        Negative turns the left ear outward, positive the right one; shrink makes them lie lower."""
        out = []
        for s in self.head:
            pts = list(s)
            for side, deg in turns.items():
                inner, outer = self.ears[side]
                ia, oa = nearest(pts, inner), nearest(pts, outer)
                if math.dist(pts[ia], inner) > 4 or math.dist(pts[oa], outer) > 4: continue
                lo, hi = sorted((ia, oa)); piv = ((inner[0] + outer[0]) / 2, (inner[1] + outer[1]) / 2)
                for i in range(lo + 1, hi):
                    w = math.sin(math.pi * (i - lo) / (hi - lo)) ** .8
                    p = rot(pts[i], piv, deg * w)
                    pts[i] = (piv[0] + (p[0] - piv[0]) * (1 - shrink * w), piv[1] + (p[1] - piv[1]) * (1 - shrink * w))
            out.append(pts)
        return out

    def shape(self, name, strokes):
        self.shapes[name] = strokes_d(strokes)
        return name

    def head_shape(self, vid, mirrored=False):
        v = HEAD_VARIANTS[vid]
        strokes = self.head if v is None else self.ears_bent({k: v[k] for k in ('L', 'R') if k in v}, v.get('shrink', 0))
        if mirrored: strokes = xf(strokes, mirror(self.axis))
        return self.shape(vid + ('Back' if mirrored else ''), strokes)

    def head_parts(self, place=None, mirrored=False):
        return [part(vid, shape=self.head_shape(vid, mirrored), pivot=self.neck, rig='head', place=place, hidden=vid != 'head')
                for vid in HEAD_VARIANTS]

    def tail_at(self, base, deg, scale=1.0, flip=False):
        """The traced fluffy tail moved so its base sits at `base`, turned by deg."""
        f = [move(-self.tail_base[0], -self.tail_base[1])]
        if flip: f.append(lambda p: (-p[0], p[1]))
        f += [lambda p: (p[0] * scale, p[1] * scale), lambda p: rot(p, (0, 0), deg), move(*base)]
        return xf(self.tail, chain(*f))

# ---------- poses any cat can use (drawn on Cat_01's floor, y = 866) ----------
LOAF_A = (472, 778)
def pose_loaf(kit):
    """Lying down, front paws tucked under the chin."""
    place = kit.place(LOAF_A); hp = lambda q: kit.placed(kit.on_head(q), LOAF_A)
    left = [hp((225, 511)), (176, 700), (146, 760), (148, 826), (184, 860), (262, 868), (348, 866)]
    right = [hp((727, 508)), (784, 700), (814, 760), (812, 826), (780, 860), (700, 868), (600, 866)]
    paw_l, _ = limb([(406, 786), (404, 824)], 90, 44, toes='end')
    paw_r, _ = limb([(540, 786), (542, 824)], 90, 44, toes='end')
    return {'parts': [
        part('body', [left, right]),
        part('pawL', paw_l, pivot=(406, 786), layer=1),
        part('pawR', paw_r, pivot=(540, 786), layer=1),
        part('tail', kit.tail_at((806, 832), 16, .92), pivot=(806, 832)),
        *kit.head_parts(place),
    ], 'face': place}

BELLY_A = (452, 744); BELLY_DEG = -38; BELLY_S = .88
def pose_belly(kit):
    """On its back, head tipped back on the left, all four paws up: near ones in front with their beans showing,
    far ones dimmer behind the body."""
    place = kit.place(BELLY_A, BELLY_DEG, BELLY_S); hp = lambda q: kit.placed(kit.on_head(q), BELLY_A, BELLY_DEG, BELLY_S)
    body = [hp((614, 611)), (622, 640), (720, 630), (800, 648), (852, 700), (866, 770), (840, 836), (772, 866), (640, 870), (520, 862), hp((349, 615))]
    parts = [part('tail', kit.tail_at((858, 804), 36, .8), pivot=(858, 804))]
    # each far leg sits just behind its near partner and peeks out beside it
    for k, c, w, r in (('legFF', [(666, 644), (668, 590), (682, 548)], 80, 40), ('legBF', [(772, 652), (790, 592), (816, 552)], 82, 41)):
        st, _ = limb(c, w, r, toes='end')
        parts.append(part(k, st, pivot=c[0], tone='dim', layer=-1))
    parts.append(part('body', [body]))
    for k, c in (('legFN', [(626, 648), (606, 590), (614, 540)]), ('legBN', [(812, 660), (838, 598), (868, 556)])):
        st, end = limb(c, 86, 44)
        parts += paw_parts(k, st, end, c[0])
    parts += kit.head_parts(place)
    return {'parts': parts, 'face': place}

BALL_R = 183
BALL_C = (520, 866 - BALL_R)
def ball_outline(ears=(-118, -62)):
    pts = []
    for i in range(0, 360, 3):
        a = i - 180; r = BALL_R
        for ear in ears:
            dd = abs(((a - ear + 180) % 360) - 180)
            if dd < 15: r += 62 * (1 - dd / 15) ** .85
        pts.append((r * math.cos(math.radians(a)), r * math.sin(math.radians(a))))
    return smooth(pts, closed=True)
def pose_ball(kit=None):
    """Curled up, the tail rolled inside (ear twitch: ballTwL / ballTwR)."""
    swirl = [((BALL_R - 48 - i * 1.45) * math.cos(math.radians(40 + i * 4.2)),
              (BALL_R - 48 - i * 1.45) * math.sin(math.radians(40 + i * 4.2)) + 22) for i in range(61)]
    place = f'translate({BALL_C[0]} {BALL_C[1]})'
    return {'parts': [
        part('ball', d=ball_outline(), pivot=(0, 0), place=place),
        part('ballTwL', d=ball_outline((-134, -62)), pivot=(0, 0), place=place, rig='ball', hidden=True),
        part('ballTwR', d=ball_outline((-118, -46)), pivot=(0, 0), place=place, rig='ball', hidden=True),
        part('ballTail', [swirl], pivot=(0, 0), place=place, rig='ball'),
    ], 'ballFace': place, 'face': None}

# ---------- faces (head space) ----------
EL, ER, EY = 394, 552, 421
def both(fn): return fn(EL) + fn(ER)
def eye_circle(cx, r=13): return f'M{cx - r} {EY}a{r} {r} 0 1 0 {2 * r} 0a{r} {r} 0 1 0 {-2 * r} 0'
def swirl(cx):
    pts = [(cx + (4 + i * .62) * math.cos(i * .3), EY + (4 + i * .62) * math.sin(i * .3)) for i in range(38)]
    return smooth(pts)
def heart(cx, cy, s):
    return (f'M{f1(cx)} {f1(cy + 26 * s)}C{f1(cx - 34 * s)} {f1(cy)} {f1(cx - 38 * s)} {f1(cy - 26 * s)} {f1(cx - 18 * s)} {f1(cy - 34 * s)}'
            f'C{f1(cx - 6 * s)} {f1(cy - 39 * s)} {f1(cx)} {f1(cy - 30 * s)} {f1(cx)} {f1(cy - 21 * s)}'
            f'C{f1(cx)} {f1(cy - 30 * s)} {f1(cx + 6 * s)} {f1(cy - 39 * s)} {f1(cx + 18 * s)} {f1(cy - 34 * s)}'
            f'C{f1(cx + 38 * s)} {f1(cy - 26 * s)} {f1(cx + 34 * s)} {f1(cy)} {f1(cx)} {f1(cy + 26 * s)}Z')
def sparkle(cx, cy, r):
    return (f'M{f1(cx)} {f1(cy - r)}Q{f1(cx + r * .12)} {f1(cy - r * .12)} {f1(cx + r)} {f1(cy)}Q{f1(cx + r * .12)} {f1(cy + r * .12)} '
            f'{f1(cx)} {f1(cy + r)}Q{f1(cx - r * .12)} {f1(cy + r * .12)} {f1(cx - r)} {f1(cy)}Q{f1(cx - r * .12)} {f1(cy - r * .12)} {f1(cx)} {f1(cy - r)}Z')

FACE = {
    'eyes': {
        'normal': ('eye', both(lambda x: f'M{x} 410L{x} 432')),
        'happy': ('thin', both(lambda x: f'M{x - 16} 430Q{x} 406 {x + 16} 430')),
        'closed': ('thin', both(lambda x: f'M{x - 16} 418Q{x} 436 {x + 16} 418')),
        'shut': ('thin', both(lambda x: f'M{x - 15} 424L{x + 15} 424')),
        'half': ('thin', both(lambda x: f'M{x - 16} 420L{x + 16} 420M{x} 426L{x} 432')),
        'squeeze': ('thin', f'M{EL - 16} 410L{EL + 12} 422L{EL - 16} 434M{ER + 16} 410L{ER - 12} 422L{ER + 16} 434'),
        'wide': ('thin', eye_circle(EL) + eye_circle(ER)),
        'dot': ('eye', both(lambda x: f'M{x} 424L{x} 424.1')),
        'sad': ('thin', both(lambda x: f'M{x - 15} 428Q{x} 416 {x + 15} 428')),
        'teary': ('thin', both(lambda x: f'M{x - 16} 416Q{x} 430 {x + 16} 416M{x - 10} 434L{x - 10} 434.1')),
        'cross': ('thin', both(lambda x: f'M{x - 13} 409L{x + 13} 435M{x + 13} 409L{x - 13} 435')),
        'dizzy': ('fine', swirl(EL) + swirl(ER)),
        'heart': ('pink', heart(EL, EY + 2, .62) + heart(ER, EY + 2, .62)),
        'star': ('gold', sparkle(EL, EY, 22) + sparkle(ER, EY, 22)),
        'wink': [('thin', f'M{EL - 16} 430Q{EL} 406 {EL + 16} 430'), ('eye', f'M{ER} 410L{ER} 432')],
        'angry': ('thin', f'M{EL - 16} 414L{EL + 14} 426M{ER + 16} 414L{ER - 14} 426M{EL} 426L{EL} 434M{ER} 426L{ER} 434'),
    },
    'mouth': {
        'w': ('thin', 'M440 466q16 22 32 0q16 22 32 0'),
        'smile': ('thin', 'M448 462Q472 486 496 462'),
        'grin': ('thin', 'M436 458Q472 498 508 458'),
        'open': ('thin', 'M446 460Q472 504 498 460Z'),
        'o': ('thin', 'M462 474a10 10 0 1 0 20 0a10 10 0 1 0-20 0'),
        'O': ('thin', 'M452 484a20 26 0 1 0 40 0a20 26 0 1 0-40 0'),
        'flat': ('thin', 'M454 472L490 472'),
        'wavy': ('thin', 'M440 474Q448 464 456 474Q464 484 472 474Q480 464 488 474Q496 484 504 474'),
        'frown': ('thin', 'M450 482Q472 460 494 482'),
        'pout': ('thin', 'M462 462Q478 468 466 474Q478 480 462 486'),
        'hiss': ('thin', 'M438 458Q472 508 506 458ZM450 460L456 474L462 460M482 460L488 474L494 460'),
    },
    'tongue': {
        'small': ('pink', 'M466 474Q472 492 478 474'),
        'lick': ('pink', 'M474 472Q478 498 496 496Q508 492 502 478'),
        'out': ('pink', 'M462 478Q472 512 482 478'),
    },
    'brows': {
        'sad': ('thin', f'M{EL - 24} 392L{EL + 18} 378M{ER + 24} 392L{ER - 18} 378'),
        'angry': ('thin', f'M{EL - 24} 376L{EL + 18} 394M{ER + 24} 376L{ER - 18} 394'),
        'up': ('thin', f'M{EL - 20} 384Q{EL} 368 {EL + 20} 384M{ER - 20} 384Q{ER} 368 {ER + 20} 384'),
        'flat': ('thin', f'M{EL - 18} 388L{EL + 18} 388M{ER - 18} 388L{ER + 18} 388'),
    },
    'cheeks': {
        'blush': ('blush', 'M314 468l30 0M602 468l30 0'),
        'shy': ('pinkthin', 'M304 476L316 456M322 480L334 460M340 484L352 464M592 476L604 456M610 480L622 460M628 484L640 464'),
        'tears': ('blue', f'M{EL - 6} 440Q{EL - 12} 470 {EL - 4} 500M{ER + 6} 440Q{ER + 12} 470 {ER + 4} 500'),
        'gloom': ('grey', 'M300 300L300 360M340 290L340 380M600 290L600 380M640 300L640 360'),
    },
}
FACE_DEFAULT = {'eyes': 'normal', 'mouth': 'w'}

BALL_FACE = {   # faces drawn on the ball (ball space, centre 0,0)
    'squeeze': ('thin', 'M-70 -96l30 14l-30 14M62 -96l-30 14l30 14M-30 -48q15 20 30 0q15 20 30 0'),
    'sleep': ('thin', 'M-72 -84Q-56 -70 -40 -84M40 -84Q56 -70 72 -84M-14 -46q14 12 28 0'),
    'dizzy': ('thin', 'M-68 -98L-44 -74M-44 -98L-68 -74M44 -98L68 -74M68 -98L44 -74M-30 -44Q-22 -54 -15 -44Q-8 -34 0 -44Q8 -54 15 -44Q22 -34 30 -44'),
}

# ---------- effects (each centred on 0,0) ----------
def star5(r1=34, r2=14):
    pts = [((r1 if i % 2 == 0 else r2) * math.cos(math.radians(-90 + i * 36)), (r1 if i % 2 == 0 else r2) * math.sin(math.radians(-90 + i * 36))) for i in range(10)]
    return 'M' + 'L'.join(f'{f1(x)} {f1(y)}' for x, y in pts) + 'Z'
FX = {
    'heart': ('pink', heart(0, 0, 1.1)),
    'sparkle': ('gold', sparkle(0, 0, 40)),
    'star': ('gold', star5()),
    'note': ('accent', 'M-14 26a13 10 -20 1 0 26 -4a13 10 -20 1 0 -26 4M11 22L11 -34Q24 -28 30 -12'),
    'z': ('accent', 'M-18 -18L18 -18L-18 18L18 18'),
    'excl': ('gold', 'M0 -40L0 8M0 30L0 30.1'),
    'question': ('white', 'M-20 -22C-20 -48 22 -48 22 -22C22 -4 0 -4 0 12M0 32L0 32.1'),
    'vein': ('red', 'M-34 -10Q-12 -12 -10 -34M10 -34Q12 -12 34 -10M34 10Q12 12 10 34M-10 34Q-12 12 -34 10'),
    'drop': ('blue', 'M0 -30C14 -10 22 2 22 12C22 26 12 34 0 34C-12 34 -22 26 -22 12C-22 2 -14 -10 0 -30Z'),
    'puff': ('white', 'M-30 10C-44 10 -44 -10 -28 -8C-26 -26 -2 -28 2 -12C8 -26 30 -22 28 -4C42 -4 42 14 28 14Z'),
    'cloud': ('grey', 'M-60 20C-88 20 -88 -20 -56 -16C-52 -52 -4 -56 4 -24C16 -52 60 -44 56 -8C84 -8 84 28 56 28Z'),
    'rain': ('blue', 'M-36 0L-44 22M-6 0L-14 22M24 0L16 22'),
    'bulb': ('gold', 'M-16 8C-34 -6 -30 -46 0 -46C30 -46 34 -6 16 8L14 22L-14 22ZM-10 32L10 32M-46 -40L-58 -50M46 -40L58 -50M0 -62L0 -76'),
    'dots': ('white', 'M-28 0L-28 .1M0 0L0 .1M28 0L28 .1'),
    'confetti': ('gold', 'M-14 0Q-7 -12 0 0Q7 12 14 0'),
    'speed': ('white', 'M-46 -18L18 -18M-30 4L34 4M-46 26L6 26'),
    'book': ('accent', 'M0 -18C-20 -30 -44 -28 -56 -22L-56 28C-44 22 -20 20 0 32C20 20 44 22 56 28L56 -22C44 -28 20 -30 0 -18ZM0 -18L0 32M-44 -8L-14 -2M-44 8L-14 14M14 -2L44 -8M14 14L44 8'),
    'lines': ('white', 'M-30 -22L-44 -38M0 -30L0 -50M30 -22L44 -38'),
    'fish': ('accent', 'M-42 0C-22 -24 18 -24 30 0C18 24 -22 24 -42 0ZM30 0L48 -16L48 16ZM-24 -4L-24 -3.9'),
    'yarn': ('pink', 'M-30 0A30 30 0 1 0 30 0A30 30 0 1 0 -30 0M-26 -14Q0 -4 26 -16M-24 12Q0 0 28 8M24 22Q44 42 66 34'),
    'ring': ('white', 'M-12 0A12 12 0 1 0 12 0A12 12 0 1 0 -12 0'),
    'kana': ('accent', 'M-22 -22L20 -24M-2 -40Q-6 0 6 34M18 -6Q-20 -14 -26 14Q-28 30 -10 26Q18 18 24 -2Q30 22 12 32'),
    'flower': ('pink', ''.join(f'M{f1(14 * math.cos(math.radians(a)))} {f1(14 * math.sin(math.radians(a)))}a12 12 0 1 0 .1 0' for a in range(-90, 270, 72))),
    'check': ('gold', 'M-30 0L-8 22L32 -24'),
    'mag': ('white', 'M-10 -10m-24 0a24 24 0 1 0 48 0a24 24 0 1 0 -48 0M8 8L34 34'),
}
# effects are drawn small; this is how much bigger each one shows (default FX_SIZE_DEFAULT)
FX_SIZE_DEFAULT = 1.7
FX_SIZE = {'book': 1.0, 'cloud': 1.0, 'kana': 1.0, 'fish': 1.4, 'dots': 1.4, 'speed': 1.2, 'yarn': 1.3, 'bulb': 1.25}

# ---------- the glow ----------
# Measured across one line of Cat_01's drawing: (distance from the line's centre, grey level).
# Each step becomes one stroke, widest first, then the bright core on top.
PROFILE = [(30, 26), (26, 29), (22, 36), (19, 44), (16, 57), (13, 76), (10, 97), (7.5, 112)]
SHORT = [PROFILE[i] for i in (0, 2, 4, 6, 7)]   # small pieces (faces, effects) get fewer steps

def table(r, g, b):
    """Channel maps like an SVG feComponentTransfer table: grey level -> colour."""
    def f(tab, v):
        x = v / 255 * (len(tab) - 1); i = min(int(x), len(tab) - 2)
        return 255 * (tab[i] + (tab[i + 1] - tab[i]) * (x - i))
    return lambda v: (f(r, v), f(g, v), f(b, v))
GREY = lambda v: (v, v, v)
def tint(r, g, b): return lambda v: (v * r, v * g, v * b)

def tube(core_w, core, tone=GREY, profile=PROFILE, halo=1.0):
    out = []
    for d, v in profile:
        r, g, b = (max(0, min(255, round(c))) for c in tone(v))
        out.append([round(core_w + 2 * (d - 6) * halo), '#%02x%02x%02x' % (r, g, b)])
    return out + [[core_w, core]]

TONES = {
    'white': tube(12, '#ffffff'),
    'eye': tube(20, '#ffffff', profile=SHORT),
    'thin': tube(9, '#ffffff', profile=SHORT),
    'fine': tube(6, '#ffffff', profile=SHORT, halo=.5),
    'pink': tube(8, '#ffd3e3', tint(1.6, .6, .9), SHORT, .8),
    'pinkthin': tube(6, '#ff9cbf', tint(1.6, .6, .9), SHORT, .6),
    'gold': tube(8, '#fff0c4', tint(1.55, 1.15, .4), SHORT, .8),
    'red': tube(9, '#ff8a7e', tint(1.7, .5, .45), SHORT, .8),
    'blue': tube(8, '#d6efff', tint(.6, 1.1, 1.7), SHORT, .8),
    'accent': tube(8, '#e6e9ff', table([0, .30, .93], [0, .33, .94], [0, .62, 1]), SHORT, .8),
    'grey': tube(8, '#c3c8d6', GREY, SHORT, .7),
    'green': tube(8, '#d8ffd9', tint(.6, 1.6, .7), SHORT, .8),
    'blush': [[32, '#ff6fa3', .16], [22, '#ff6fa3', .32], [14, '#ff9cbf']],
    'dim': tube(11, '#9fa3ae', tint(.62, .63, .68), PROFILE, .8),   # far-side legs, behind the body
    'pad': tube(19, '#ffb8cf', tint(1.6, .6, .9), SHORT, .45),      # toe beans: main pad and toes
    'toe': tube(14, '#ffb8cf', tint(1.6, .6, .9), SHORT, .4),
    'padS': tube(16, '#ffb8cf', tint(1.6, .6, .9), SHORT, .4),
    'toeS': tube(11, '#ffb8cf', tint(1.6, .6, .9), SHORT, .35),
}

# ---------- the data file the player reads ----------
def data(kit, poses, ball_r=BALL_R):
    """poses: {name: pose dict}. Returns the object the player expects."""
    out = {}
    for name, p in poses.items():
        q = {'parts': p['parts']}
        if 'ballFace' in p: q['ballFace'] = p['ballFace']
        elif not p.get('faceless'): q['face'] = p['face'] or ''
        out[name] = q
    pieces = lambda v: [{'tone': t, 'd': d} for t, d in (v if isinstance(v, list) else [v])]
    return {
        'tones': TONES,
        'shapes': kit.shapes,
        'poses': out,
        'face': {slot: {k: pieces(v) for k, v in items.items()} for slot, items in FACE.items()},
        'faceDefault': FACE_DEFAULT,
        'ballFace': {k: pieces(v) for k, v in BALL_FACE.items()},
        'fx': {k: pieces(v) for k, v in FX.items()},
        'fxSize': dict(FX_SIZE, default=FX_SIZE_DEFAULT),
        'pivots': {'head': list(kit.neck), 'eyes': [473, 421], 'mouth': [472, 472], 'cat': [kit.mid, kit.floor]},
        'consts': {'floor': kit.floor, 'mid': kit.mid, 'ballR': ball_r},
    }

def data_js(var, obj, source):
    return (f'// Generated by {source}: do not edit by hand.\nwindow.{var} = '
            + json.dumps(obj, ensure_ascii=False, separators=(',', ':')) + ';\n')

# ---------- static SVG helpers ----------
def path(d): return f'<path d="{d}"/>'
def passes(spec, inner):
    out = ''
    for s in spec:
        op = f' opacity="{s[2]}"' if len(s) > 2 else ''
        out += f'<g stroke="{s[1]}" stroke-width="{s[0]}"{op}>{inner}</g>'
    return out
def svg_file(inner, view_box, label, cls='', css=''):
    style = f'<style>{css}</style>\n' if css else ''
    c = f' class="{cls}"' if cls else ''
    return (f'<svg xmlns="http://www.w3.org/2000/svg"{c} viewBox="{view_box}" role="img" aria-label="{label}">\n'
            f'{style}{inner}\n</svg>\n')
