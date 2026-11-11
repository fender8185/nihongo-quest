'use strict';
// 食堂 and 居酒屋 at 45°, and the things in the places the hero can use (out of 71_today.js, 2026-11-11)
// ---------- 食堂 and 居酒屋 seen at 45° like 書房 (2026-11-10, the user: their seats looked odd side on) ----------
// Each is a room block: its floor u along the right wall and v along the left wall from the back corner (RW × RD units, U px a
// unit), the walls RH high, the back corner at (ox, oy) in the land's 1200 × 900 frame. The hero and the people stand in it at X,
// Y like everywhere out (from the world's middle, up from the bottom), all one size (k) anywhere in it; they walk the floor round
// the furniture (WALK_BLOCK in floor units), and who is drawn over whom goes by the furniture they stand before or behind (isoZ)
const INDOOR = ['shokudo', 'izakaya'];
const ISO = { U: 31, RW: 22, RD: 16, RH: 8, ox: 507, oy: -259, k: 0.64, door: [0.25, 13.4], in: [2.6, 13] };
const isoPt = (u, v, h = 0) => [ISO.ox + (u - v) * ISO.U, ISO.oy + (u + v) * ISO.U / 2 - h * ISO.U];   // in the land's svg
const isoXY = (u, v, h = 0) => { const [x, y] = isoPt(u, v, h); return [x - 600, 370 - y]; };   // in the hero's units
const isoUV = (X, Y) => { const a = (X + 600 - ISO.ox) / ISO.U, b = (370 - Y - ISO.oy) * 2 / ISO.U; return [(a + b) / 2, (b - a) / 2]; };
const isoClamp = (q, m = 0.7) => isoXY(...(([u, v]) => [Math.max(m, Math.min(ISO.RW - m, u)), Math.max(m, Math.min(ISO.RD - m, v))])(isoUV(q[0], q[1])));   // onto the floor
const isoBBox = (u0, u1, v0, v1, h0, h1) => { const ps = [u0, u1].flatMap((u) => [v0, v1].flatMap((v) => [h0, h1].map((h) => isoPt(u, v, h)))), xs = ps.map((q) => q[0]), ys = ps.map((q) => q[1]); return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)].map(Math.round); };   // a thing's box on the screen (PLACE_USE)
// the furniture of the room shown now, each piece a layer of its own just its size ({ box: [u0, u1, v0, v1] on the floor, h: how
// high it stands, z }): written as a mark first (isoProp), laid in order once all are known (isoLay) — the one standing before
// another (past its +u or +v face, the two across each other on the screen) over it (2026-11-10: a long counter laid by its front
// corner went over the stools before it)
const SHOKUDO_TABLES = [[6.5, 9.5, 8, 9.8], [13, 16, 8, 9.8]];   // the shokudo's tables [u0, u1, v0, v1]; their chairs at u0 + 0.8 and u1 − 0.8, 0.75 short of v0
let isoProps = [];
const isoProp = (box, art, h = 2) => { isoProps.push({ box, h, z: 0 }); return `@@ISO${isoProps.length - 1}@@${art}@@/ISO@@`; };
function isoLay(html) {
  const sx = (b) => [isoPt(b[0], b[3])[0], isoPt(b[1], b[2])[0]], before = (a, b) => a.box[0] >= b.box[1] - 1e-6 || a.box[2] >= b.box[3] - 1e-6;
  const over = (a, b) => { const [a0, a1] = sx(a.box), [b0, b1] = sx(b.box); return a0 < b1 && b0 < a1; };
  const next = isoProps.map(() => []), deg = isoProps.map(() => 0);
  isoProps.forEach((a, i) => isoProps.forEach((b, j) => { if (i !== j && over(a, b) && before(a, b) && !before(b, a)) { next[j].push(i); deg[i] += 1; } }));
  const order = [], q = isoProps.map((_, i) => i).filter((i) => !deg[i]);
  while (q.length) { q.sort((i, j) => (isoProps[i].box[1] + isoProps[i].box[3]) - (isoProps[j].box[1] + isoProps[j].box[3])); const i = q.shift(); order.push(i); next[i].forEach((j) => { deg[j] -= 1; if (!deg[j]) q.push(j); }); }
  isoProps.forEach((_, i) => { if (!order.includes(i)) order.push(i); });   // a loop, none expected: as they came
  order.forEach((i, r) => { isoProps[i].z = 1000 + r * 20; });
  return html.replace(/@@ISO(\d+)@@/g, (m, k) => { const { box: [u0, u1, v0, v1], h, z } = isoProps[k], [x0, y0, x1, y1] = isoBBox(u0 - 0.4, u1 + 0.4, v0 - 0.4, v1 + 0.4, 0, h + 1.4); return propSvg([x0, y0, x1, y1], z); }).replace(/@@\/ISO@@/g, '</svg>');
}
// a thing's layer just its size (box: [x0, y0, x1, y1] in the land's units), at the land's scale on a screen wider than its 1200
// (yardLayout): an iPhone kept a whole-screen layer for every bench and table and went slow (2026-11-10)
const propSvg = ([x0, y0, x1, y1], z) => { const w = x1 - x0, h = y1 - y0; return `<svg class="land prop" viewBox="${x0} ${y0} ${w} ${h}" data-box="${x0} ${370 - y1} ${w} ${h}" aria-hidden="true" style="left:${x0}px;bottom:${370 - y1}px;width:${w}px;height:${h}px;overflow:visible;z-index:${z}">`; };
// someone at floor point (u, v) — sat or kneeling: the front of their seat — over what they stand in front of (past its +u or +v
// face), under what they stand behind
function isoZ(u, v) {
  const x = isoPt(u, v)[0], d = Math.round(Math.max(0, Math.min(38, u + v)) / 38 * 8);
  let z = 990 + d, cap = Infinity;
  isoProps.forEach(({ box: [u0, u1, v0, v1], z: pz }) => {
    if (x < isoPt(u0, v1)[0] - 36 || x > isoPt(u1, v0)[0] + 36) return;   // not across it on the screen
    if (u >= u1 || v >= v1) z = Math.max(z, pz + 1 + d); else cap = Math.min(cap, pz - 1);
  });
  return Math.min(z, cap);
}
// the people's spots in the two rooms are floor points (u, v, h: up on a stool or the tatami): where they are drawn, their feet
INDOOR.forEach((pl) => Object.values(TOWN.SPOTS[pl] || {}).forEach((sp) => { if (sp.u !== undefined) { [sp.X, sp.Y] = isoXY(sp.u, sp.v, sp.h || 0); sp.foot = isoXY(sp.u, sp.v); } }));
// how far up each place the hero walks (Y px up): the ground in front of its buildings, never up onto them (2026-11-10, the user);
// the yard up to its house, the main road to its far pavement, a room to its floor
const WALK_TOP = { yard: 214, street: 134, beach: 118, town: 126, harbor: 120, park: 126, shokudo: 128, izakaya: 128, station: 128, sento: 128, shrine: 128, castle: 128 };
const walkTop = (place, X) => (place === 'yard' && X !== undefined ? Math.round(214 - Math.max(0, Math.abs(X) - 300) * 0.22) : WALK_TOP[place] || 214);   // the yard: a hilltop, lower towards its sides — not out over the edge
// what stands in the way in each place (2026-11-10, the user: he walked about as if every place were flat ground): the ground the
// things there stand on, [X0, X1, Y0, Y1] in his units — benches, crates, tables and stools, the sandbox, the beach's grassy bank
// either side of the boardwalk — and in the yard its wares and the mailbox. He goes round them (yRoute); a tap on one sends him to
// its nearest free side. Those he can stand behind are drawn over him then (landProp)
const WALK_BLOCK = {
  beach: [[-130, -110, 58, 70], [150, 302, 106, 130], [478, 640, -10, 54], [496, 640, 80, 140]],
  park: [[-404, -306, 44, 62], [376, 474, 44, 62], [58, 172, 62, 106], [-192, -148, 108, 126], [242, 280, 70, 84]],
  harbor: [[-222, -134, 78, 106], [488, 532, 76, 94], [188, 252, 74, 98]],
  station: [[-382, -288, 62, 80], [158, 252, 62, 80], [26, 120, 90, 106], [-492, -368, 106, 140]],
  sento: [[-352, -238, 60, 78]],
  // the two rooms (seen at 45°): [u0, u1, v0, v1] on the floor — the kitchen and the counter, the stools, the tables with their
  // chairs, the crates and the barrels, the tatami
  shokudo: [[0, 15, 0, 2.8], [3.4, 12.1, 2.8, 3.9], [5.9, 10.1, 6.6, 10], [12.4, 16.6, 6.6, 10], [0.4, 2.2, 9.4, 11.2]],
  izakaya: [[0, 15.6, 0, 3.0], [3.4, 14.6, 3.0, 4.2], [14.4, 22, 7.2, 16], [0.3, 1.9, 8.6, 11.5], [13.7, 14.6, 10.8, 12.0]]
};
function walkBlocks(place) {
  const b = (WALK_BLOCK[place] || []).slice();
  if (place === 'yard') {
    b.push([44, 68, 148, 160]);   // the mailbox's post
    yardPlaced().forEach((o) => { const k = yScale(o.p.y), hw = o.it.ground[0] * k / 2; b.push([o.p.x - hw, o.p.x + hw, o.p.y - 4, o.p.y + o.it.ground[1] * k + 4]); });
  }
  return b;
}
const yIn = (b, p) => p[0] > b[0] && p[0] < b[1] && p[1] > b[2] && p[1] < b[3];
function yCross(b, p, q) {   // does the way from p to q go through the inside of b (Liang–Barsky; along its edges is fine)
  const e = 0.5, dx = q[0] - p[0], dy = q[1] - p[1]; let t0 = 0, t1 = 1;
  for (const [a, c] of [[-dx, p[0] - b[0] - e], [dx, b[1] - e - p[0]], [-dy, p[1] - b[2] - e], [dy, b[3] - e - p[1]]]) {
    if (a === 0) { if (c <= 0) return false; continue; }
    const r = c / a; if (a < 0) { if (r > t1) return false; t0 = Math.max(t0, r); } else { if (r < t0) return false; t1 = Math.min(t1, r); }
  }
  return t1 - t0 > 1e-6;
}
// the ground underfoot out of doors (2026-11-11, the user: he walked straight at everything and never knew where the paths
// were): what a px of it costs him — a path, the pavement or the crossing 1, the lawn or the sand more (off), the road a lot (he
// goes over at the crossing), past the place's own ground (up beyond its top, out past its sides: only on his way in or out)
// more again. He takes the cheapest way: a short hop still cuts over the lawn, a long one keeps to the path. ways: strips like
// LANE ({Y0, Y1, at}) or [X0, X1, Y0, Y1]; roads and crossings [X0, X1, Y0, Y1]. The town is all pavement: as before
const WALK_ROAD = 25, WALK_OUT = 6;
const BUS_ROAD = { off: 1, roads: [[-1e4, 1e4, -1e4, 46]] };   // the bus stops' places: the road along the front (busRoad)
const WALK_GROUND = {
  yard: { off: 2.2, ways: [LANE] },
  street: { off: 1, ways: [STREET_LANE], roads: [[-1e4, 1e4, ...STREET.road]], cross: [[330, 420, ...STREET.road]] },
  beach: { off: 1.8, ways: [[380, 620, 56, 78]] },   // the boardwalk along to the yard
  harbor: { off: 1, ways: [{ Y0: 238, Y1: 116, at: (t) => [HARBOR_PATH + 16 * t, 18 + 14 * t] }] },   // the sandy path down from the beach (on to the quay)
  park: { off: 1, ways: [{ Y0: 330, Y1: 120, at: (t) => [PARK_PATH + 32 * t, 40] }] },   // the stone steps up to the town (on to the square)
  station: BUS_ROAD, sento: BUS_ROAD, shrine: BUS_ROAD, castle: BUS_ROAD
};
// the cheapest way over that ground (A* on a 12 × 6 px grid, then pulled straight wherever a straight line costs no more); null:
// no way found
function yGroundRoute(place, gr, p, goal, bs, lim) {
  const inR = (r, X, Y) => X >= r[0] && X <= r[1] && Y >= r[2] && Y <= r[3];
  const onWay = (X, Y) => (gr.ways || []).some((w) => { if (Array.isArray(w)) return inR(w, X, Y); if (Y < Math.min(w.Y0, w.Y1) || Y > Math.max(w.Y0, w.Y1)) return false; const [c, hw] = stripAt(w, Y); return Math.abs(X - c) <= hw; });
  const cost = (X, Y) => {
    if (bs.some((b) => yIn(b, [X, Y]))) return Infinity;
    if ((gr.cross || []).some((r) => inR(r, X, Y)) || onWay(X, Y)) return 1;
    if ((gr.roads || []).some((r) => inR(r, X, Y))) return WALK_ROAD;
    return Math.abs(X) <= lim && Y >= 12 && Y <= walkTop(place, X) ? gr.off : WALK_OUT;
  };
  const seg = (a, b) => {   // a straight line's cost, a sample every 4 px
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(1, Math.ceil(L / 4)); let c = 0;
    for (let i = 0; i < n; i++) { const t = (i + 0.5) / n, k = cost(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t); if (k === Infinity) return Infinity; c += k; }
    return c * L / n;
  };
  if (seg(p, goal) <= Math.hypot(goal[0] - p[0], goal[1] - p[1]) + 0.01) return [p, goal];   // all path or pavement, nothing in the way
  const G = 12, H = 6, top = Math.max(WALK_TOP[place] || 214, ...(gr.ways || []).map((w) => (Array.isArray(w) ? w[3] : Math.max(w.Y0, w.Y1))));
  const x0 = Math.floor((Math.min(-lim, p[0], goal[0]) - G) / G) * G, y0 = Math.floor((Math.min(0, p[1], goal[1]) - H) / H) * H;
  const nx = Math.ceil((Math.max(lim, p[0], goal[0]) + G - x0) / G) + 1, ny = Math.ceil((Math.max(top, p[1], goal[1]) + H - y0) / H) + 1, N = nx * ny;
  const C = new Float32Array(N); for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) C[j * nx + i] = cost(x0 + i * G, y0 + j * H);
  const cell = (q) => Math.min(ny - 1, Math.max(0, Math.round((q[1] - y0) / H))) * nx + Math.min(nx - 1, Math.max(0, Math.round((q[0] - x0) / G)));
  const at = (k) => [x0 + (k % nx) * G, y0 + Math.floor(k / nx) * H];
  const fin = (c) => (c === Infinity ? WALK_OUT : c), s = cell(p), e = cell(goal); C[s] = fin(cost(...p)); C[e] = fin(cost(...goal));   // where he stands and where he goes are never in the way
  const g = new Float64Array(N).fill(Infinity), from = new Int32Array(N).fill(-1), shut = new Uint8Array(N), heap = [];
  const h = (k) => { const q = at(k); return Math.hypot(q[0] - goal[0], q[1] - goal[1]); };
  const push = (f, k) => { heap.push([f, k]); for (let i = heap.length - 1; i > 0;) { const u = (i - 1) >> 1; if (heap[u][0] <= heap[i][0]) break; [heap[u], heap[i]] = [heap[i], heap[u]]; i = u; } };
  const pop = () => { const top0 = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; for (let i = 0; ;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === i) break; [heap[m], heap[i]] = [heap[i], heap[m]]; i = m; } } return top0; };
  const D = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]].map(([a, b]) => [a, b, Math.hypot(a * G, b * H)]);
  g[s] = 0; push(h(s), s);
  while (heap.length) {
    const [, k] = pop(); if (shut[k]) continue; shut[k] = 1; if (k === e) break;
    const i = k % nx, j = (k - i) / nx;
    for (const [a, b, d] of D) {
      const ii = i + a, jj = j + b; if (ii < 0 || jj < 0 || ii >= nx || jj >= ny) continue;
      const kk = jj * nx + ii; if (shut[kk] || C[kk] === Infinity) continue;
      const v = g[k] + d * (C[k] + C[kk]) / 2; if (v < g[kk]) { g[kk] = v; from[kk] = k; push(v + h(kk), kk); }
    }
  }
  if (g[e] === Infinity) return null;
  const cells = []; for (let k = e; k !== -1; k = from[k]) cells.unshift(k);
  const P = [p].concat(cells.slice(1, -1).map(at), [goal]), cum = [0];   // the cost so far along the grid's way (a step cutting a corner of a thing: as the grid had it)
  for (let i = 1; i < P.length; i++) { const c = seg(P[i - 1], P[i]); cum.push(cum[i - 1] + (c < Infinity ? c : g[cells[Math.min(i, cells.length - 1)]] - g[cells[i - 1]])); }
  const short = (i, j) => { const c = seg(P[i], P[j]); return c < Infinity && c <= (cum[j] - cum[i]) * 1.05 + 1; };   // a straight line costing next to nothing more: taken
  const out = [p]; for (let i = 0; i < P.length - 1;) { let j = i + 1; while (j + 1 < P.length && short(i, j + 1)) j++; out.push(P[j]); i = j; }
  return out;
}
// the way from p to the goal round what stands between (the corners of the things, a little apart from them, as stepping stones;
// the shortest), the goal moved off a thing to its nearest free side; out of doors over the ground's cheapest way (WALK_GROUND).
// free: on the way out of the place (no top, the goal kept)
function yRoute(place, p0, goal0, free) {
  const iso = INDOOR.includes(place), cv = iso ? (q) => isoUV(q[0], q[1]) : (q) => q, back = iso ? (q) => isoXY(q[0], q[1]) : (q) => q;   // a room: on its floor
  const [mx, my] = iso ? [0.45, 0.45] : [12, 5], lim = ycam.YW / 2 - 20, p = cv(p0);
  let goal = cv(goal0);
  const bs = walkBlocks(place).map(([a, b, c, d]) => [a - mx, b + mx, c - my, d + my]).filter((b) => !yIn(b, p));   // one he stands in he may leave
  const ok = (q) => (iso ? free || (q[0] >= 0.6 && q[0] <= ISO.RW - 0.6 && q[1] >= 0.6 && q[1] <= ISO.RD - 0.6) : Math.abs(q[0]) <= lim && q[1] >= 12 && (free || q[1] <= walkTop(place, q[0]))) && !bs.some((b) => yIn(b, q));
  if (!free && bs.some((b) => yIn(b, goal))) {
    const c = []; bs.filter((b) => yIn(b, goal)).forEach((b) => c.push([goal[0], b[2]], [goal[0], b[3]], [b[0], goal[1]], [b[1], goal[1]]));
    const best = c.filter(ok).sort((u, v) => Math.hypot(u[0] - goal[0], u[1] - goal[1]) - Math.hypot(v[0] - goal[0], v[1] - goal[1]))[0];
    goal = best || p;
  }
  const gr = !iso && p[1] > -900 && WALK_GROUND[place];   // (yFree asks from far below, for the goal alone)
  const ground = gr && yGroundRoute(place, gr, p, goal, bs, lim); if (ground) return [p0].concat(ground.slice(1));
  const clear = (u, v) => !bs.some((b) => yCross(b, u, v));
  if (clear(p, goal)) return [p0, back(goal)];
  const n = [p, goal].concat(bs.flatMap((b) => [[b[0], b[2]], [b[1], b[2]], [b[0], b[3]], [b[1], b[3]]]).filter(ok));
  const dist = n.map(() => Infinity), prev = n.map(() => -1), done = n.map(() => false); dist[0] = 0;
  for (;;) {
    let i = -1; n.forEach((_, j) => { if (!done[j] && dist[j] < Infinity && (i < 0 || dist[j] < dist[i])) i = j; });
    if (i < 0 || i === 1) break;
    done[i] = true;
    n.forEach((q, j) => { if (done[j]) return; const d = dist[i] + Math.hypot(q[0] - n[i][0], q[1] - n[i][1]); if (d < dist[j] && clear(n[i], q)) { dist[j] = d; prev[j] = i; } });
  }
  if (prev[1] < 0) return [p0, back(goal)];   // no way round: straight on, as before
  const way = []; for (let i = 1; i >= 0; i = prev[i]) way.unshift(n[i]);
  return [p0].concat(way.slice(1).map(back));
}
// ---------- things in the places the hero can use (round 4, 2026-11-10, the user: more things to do something with) ----------
// box: where to tap, in the land's units [x0, y0, x1, y1] (y down); go: where he walks to first [X, Y] (a seat: in front of it).
// kind 'sit': on the free seat (seats: X) nearest the tap — one someone sits on is taken — the seat's top at top (Y px up), his
// depth there dep (his scale; drawn just behind the layer in front, or at z); 'ride': sat on it and swung or rocked with it (fx: the
// land part moving with him, both turning round the same point, piv Y up); 'slide': up the ladder and down the chute; 'do': turned
// to it (back: it stands behind him), a pose for a moment, words popping up over it (say, then), its part (fx) doing fxc for ms,
// a fortune, a toast (or what it says now), a burst of petals or leaves; out: he goes in and comes back ms later (then: words as he
// does); when: there only then (an open shop, the festival); go may follow the tap ((tap) => [X, Y]: the words over him); mirror:
// then into the look in front of a mirror (DRESS, as the full-length mirror)
const KUJI = [['大吉', '一切都會很順利！'], ['中吉', '努力會有好結果。'], ['小吉', '小小的好事在等你。'], ['吉', '平平穩穩就是福。'], ['末吉', '慢慢來，會越來越好。']];
const PLACE_USE = {
  yard: [{ id: 'tree', name: '樹', box: [440, 70, 500, 150], kind: 'do', go: [-110, 208], back: 1, pose: 'reach', fx: 'ytree', fxc: 'shake', burst: ['#6f9a5a', '#8ab86e', '#5a8a4a'] },
    { id: 'fence', name: '柵欄', box: [694, 124, 778, 152], kind: 'do', go: [136, 210], back: 1, pose: 'look', say: 'いい眺め〜' }],
  park: [
    { id: 'swing0', name: '鞦韆', box: [500, 136, 540, 236], kind: 'ride', ride: 'swing', fx: 'swing0', seats: [-80], top: 166, dep: 134, piv: 230, go: [-80, 124] },
    { id: 'swing1', name: '鞦韆', box: [560, 136, 600, 236], kind: 'ride', ride: 'swing', fx: 'swing1', seats: [-20], top: 166, dep: 134, piv: 230, go: [-20, 124] },
    { id: 'slide', name: '溜滑梯', box: [222, 130, 358, 236], kind: 'slide', go: [-259, 126] },
    { id: 'panda', name: '熊貓搖搖馬', box: [404, 186, 462, 256], kind: 'ride', ride: 'rock', fx: 'panda', seats: [-166], top: 163, dep: 116, piv: 135, z: 185, go: [-170, 98] },
    { id: 'benchL', name: '長椅', box: [200, 268, 290, 320], kind: 'sit', seats: [-370, -330], top: 74, dep: 50 },
    { id: 'benchR', name: '長椅', box: [980, 268, 1070, 320], kind: 'sit', seats: [405, 445], top: 74, dep: 50 },
    { id: 'fountain', name: '飲水台', box: [842, 246, 880, 298], kind: 'do', go: [261, 62], back: 1, pose: 'reach', say: 'ゴクゴク', fx: 'fountain', fxc: 'spout' },
    { id: 'pigeons', name: '鴿子', box: [540, 322, 624, 346], kind: 'do', go: [-80, 40], pose: 'wave', fx: 'pigeons', fxc: 'flown', ms: 6000 },
    { id: 'jizo', name: '地藏', box: [108, 176, 160, 236], kind: 'do', go: [-466, 122], back: 1, pose: 'bow', say: 'ペコリ' },
    { id: 'clock', name: '時鐘', box: [784, 92, 824, 210], kind: 'do', go: [204, 124], back: 1, pose: 'look', toast: () => { const h = sceneHour(); return `公園的時鐘：${Math.floor(h)} 點 ${String(Math.floor((h % 1) * 60)).padStart(2, '0')} 分`; } },
    { id: 'tulips', name: '鬱金香', box: [638, 210, 782, 236], kind: 'do', go: [70, 124], back: 1, pose: 'look', say: 'いい香り' }],
  street: [
    { id: 'vend', name: '自動販賣機', box: [388, 158, 438, 236], kind: 'do', go: [-187, 126], back: 1, pose: 'reach', say: 'ガコン！', fx: 'vend', fxc: 'buy' },
    { id: 'post', name: '郵筒', box: [745, 174, 775, 236], kind: 'do', go: [160, 126], back: 1, pose: 'reach', say: 'ポトン', fx: 'post', fxc: 'buy' },
    { id: 'mirror', name: 'カーブミラー', box: [484, 136, 516, 236], kind: 'do', go: [-100, 126], back: 1, pose: 'look', say: 'あ、映ってる！', mirror: 1 }],
  beach: [
    { id: 'crab', name: '螃蟹', box: [540, 262, 650, 298], kind: 'do', go: [-20, 72], pose: 'crouch', say: 'チョキチョキ', fx: 'crab', fxc: 'pinch', ms: 2600 },
    { id: 'castle', name: '沙堡', box: [350, 262, 420, 320], kind: 'do', go: [-214, 46], pose: 'crouch', say: '✨', fx: 'castle', fxc: 'cheer' },
    { id: 'ice', name: '海之家', box: [776, 196, 876, 258], kind: 'do', go: [225, 98], back: 1, pose: 'reach', say: 'かき氷！' },
    { id: 'star', name: '海星', box: [686, 304, 714, 332], kind: 'do', go: [100, 42], pose: 'crouch', say: 'ヒトデ！', fx: 'star', fxc: 'gone', ms: 9000 },
    { id: 'shell', name: '貝殼', box: [456, 316, 484, 338], kind: 'do', go: [-130, 34], pose: 'crouch', say: 'きれいな貝！', fx: 'shell', fxc: 'gone', ms: 9000 },
    { id: 'sea', name: '海', box: [0, 222, 1060, 248], kind: 'do', go: (tap) => [Math.max(-560, Math.min(440, tap.x)), 116], back: 1, pose: 'crouch', say: 'パシャパシャ' }],
  town: [{ id: 'cat', name: '貓', box: [400, 128, 470, 180], kind: 'do', go: [-168, 122], back: 1, pose: 'wave', say: 'ニャー', fx: 'awncat', fxc: 'wake', ms: 2600 },
    { id: 'bread', name: '麵包', box: [328, 188, 384, 212], kind: 'do', go: [-246, 122], back: 1, pose: 'look', say: 'おいしそう…', when: () => TOWNEV.shopState('bakery') === 'open' },
    { id: 'board', name: '咖啡黑板', box: [648, 204, 682, 236], kind: 'do', go: [65, 122], back: 1, pose: 'look', toast: '喫茶しずく：本日の珈琲 400円・ケーキセット 700円', when: () => TOWNEV.shopState('cafe') === 'open' },
    { id: 'flowers', name: '花桶', box: [752, 206, 808, 236], kind: 'do', go: [176, 122], back: 1, pose: 'look', say: 'いい香り', when: () => TOWNEV.shopState('flowers') === 'open' },
    { id: 'chimes', name: '風鈴', box: [1064, 176, 1130, 212], kind: 'do', go: [496, 122], back: 1, pose: 'reach', say: 'チリンチリン', fx: 'chimes', fxc: 'jingle', ms: 2200, when: () => TOWNEV.shopState('goods') === 'open' }],
  harbor: [
    { id: 'cat', name: '貓', box: [460, 252, 496, 290], kind: 'do', go: [-98, 60], pose: 'crouch', say: '♡ ニャー', fx: 'hcat', fxc: 'purr', ms: 2600 },
    { id: 'gull', name: '海鷗', box: [540, 222, 582, 246], kind: 'do', go: [-40, 112], pose: 'wave', fx: 'gull', fxc: 'flown', ms: 6000 },
    { id: 'bollardL', name: '繫船柱', box: [286, 226, 314, 252], kind: 'sit', seats: [-300], top: 134, dep: 120 },
    { id: 'bollardR', name: '繫船柱', box: [806, 226, 834, 252], kind: 'sit', seats: [220], top: 134, dep: 120 },
    { id: 'fish', name: '魚箱', box: [378, 240, 458, 268], kind: 'do', go: [-180, 70], pose: 'look', say: 'ピチピチ！', fx: 'fish', fxc: 'flop', ms: 1800 }],
  station: [
    { id: 'vend', name: '自動販賣機', box: [242, 164, 304, 236], kind: 'do', go: [-327, 122], back: 1, pose: 'reach', say: 'ガコン！', fx: 'svend', fxc: 'buy' },
    { id: 'benchL', name: '長椅', box: [220, 252, 310, 304], kind: 'sit', seats: [-355, -310], top: 90, dep: 66 },
    { id: 'benchR', name: '長椅', box: [760, 252, 850, 304], kind: 'sit', seats: [185, 225], top: 90, dep: 66 },
    { id: 'pigeons', name: '鴿子', box: [576, 292, 676, 316], kind: 'do', go: [30, 42], pose: 'wave', fx: 'spigeons', fxc: 'flown', ms: 6000 },
    { id: 'taxi', name: '計程車', box: [110, 188, 232, 258], kind: 'do', go: [-400, 94], pose: 'wave', say: 'プップー', fx: 'taxi', fxc: 'honk' },
    { id: 'gate', name: '剪票口', box: [480, 150, 640, 236], kind: 'do', go: [-20, 126], back: 1, pose: 'reach', say: 'ピッ' },
    { id: 'board', name: '電子看板', box: [448, 104, 672, 138], kind: 'do', go: [60, 126], back: 1, pose: 'look', toast: () => { const h = Math.floor(sceneHour()); return `下一班電車：${h}:30 快速 みなと港・${h}:45 普通 白鷺`; } },
    { id: 'koban', name: '交番', box: [880, 140, 1006, 236], kind: 'do', go: [384, 126], back: 1, pose: 'wave', say: 'こんにちは！' }],
  sento: [
    { id: 'milk', name: '牛奶販賣機', box: [158, 142, 224, 236], kind: 'do', go: [-409, 122], back: 1, pose: 'reach', say: 'ぷはー！', fx: 'milk', fxc: 'buy' },
    { id: 'cat', name: '貓', box: [304, 254, 358, 288], kind: 'do', go: [-270, 50], pose: 'crouch', say: '♡', fx: 'scat', fxc: 'purr', ms: 2600 },
    { id: 'bath', name: '泡澡', box: [474, 130, 688, 236], kind: 'do', go: [20, 126], back: 1, out: 2600, then: '♨ いい湯だった〜' },
    { id: 'laundry', name: '投幣洗衣店', box: [992, 168, 1088, 232], kind: 'do', go: [440, 126], back: 1, pose: 'look', say: 'ぐるぐる…' }],
  shrine: [
    { id: 'bell', name: '鈴', box: [870, 140, 950, 236], kind: 'do', go: [310, 126], back: 1, pose: 'reach', say: 'カランカラン', then: 'パンパン 🙏', fx: 'bell', fxc: 'ring', ms: 2100 },
    { id: 'kuji', name: '籤', box: [1076, 160, 1156, 236], kind: 'do', go: [515, 122], back: 1, pose: 'reach', fortune: 1 },
    { id: 'crow', name: '烏鴉', box: [220, 42, 266, 80], kind: 'do', go: [-350, 112], pose: 'look', say: 'カァー', fx: 'crow', fxc: 'flown', ms: 7000 },
    { id: 'fox', name: '狐狸', box: [338, 166, 382, 236], kind: 'do', go: [-240, 120], back: 1, pose: 'bow', say: 'ペコリ' },
    { id: 'kingyo', name: '金魚撈', box: [400, 144, 500, 236], kind: 'do', go: [-130, 126], back: 1, pose: 'crouch', say: 'とれた！🐟', when: () => TOWNEV.festival() },
    { id: 'yakisoba', name: '炒麵攤', box: [510, 144, 600, 236], kind: 'do', go: [-45, 126], back: 1, pose: 'reach', say: 'やきそば、おいしい！', when: () => TOWNEV.festival() },
    { id: 'wataame', name: '棉花糖攤', box: [610, 144, 700, 236], kind: 'do', go: [55, 126], back: 1, pose: 'reach', say: 'ふわふわ〜', when: () => TOWNEV.festival() }],
  castle: [
    { id: 'sakuraL', name: '櫻花', box: [0, 60, 130, 236], kind: 'do', go: [-520, 112], pose: 'reach', fx: 'sakuraL', fxc: 'shake', burst: ['#f7c6d2', '#f2b8c6', '#fbdde4'] },
    { id: 'sakuraR', name: '櫻花', box: [1080, 60, 1210, 236], kind: 'do', go: [520, 112], pose: 'reach', fx: 'sakuraR', fxc: 'shake', burst: ['#f7c6d2', '#f2b8c6', '#fbdde4'] },
    { id: 'board', name: '告示牌', box: [586, 166, 664, 236], kind: 'do', go: [25, 122], back: 1, pose: 'look', toast: '白鷺城：大約四百年前建的白色天守，遠看像白鷺展開翅膀，所以叫白鷺城。' },
    { id: 'gate', name: '城門', box: [200, 140, 320, 198], kind: 'do', go: [-300, 126], back: 1, pose: 'reach', say: 'コンコン' },
    { id: 'moat', name: '護城河', box: [600, 200, 1060, 234], kind: 'do', go: (tap) => [Math.max(0, Math.min(440, tap.x)), 126], back: 1, pose: 'look', say: 'クワッ' }],
  // the two rooms (seen at 45°): seats as [u, v, h, how he sits there] (bench: on a chair or a stool; kneel: on the tatami; back,
  // turn, flip: which way he faces), things as everywhere (face: which way he turns to them)
  shokudo: [
    ...SHOKUDO_TABLES.map(([u0, u1, v0, v1], i) => ({ id: 'table' + i, name: '桌子', box: isoBBox(u0, u1, v0, v1, 1.3, 1.5), kind: 'seat', say: 'いただきます！', seats: [[u0 + 0.8, v0 - 0.75, 0, 'bench turn flip'], [u1 - 0.8, v0 - 0.75, 0, 'bench turn flip']] })),
    ...SHOKUDO_TABLES.flatMap(([u0, u1, v0], i) => [u0 + 0.8, u1 - 0.8].map((u, j) => ({ id: `chair${i}${j}`, name: '椅子', box: isoBBox(u - 0.45, u + 0.45, v0 - 1.2, v0 - 0.3, 0, 2.1), kind: 'seat', say: 'いただきます！', seats: [[u, v0 - 0.75, 0, 'bench turn flip']] }))),
    ...[4, 6.5, 9, 11.5].map((u, i) => ({ id: 'stool' + i, name: '吧台座位', box: isoBBox(u - 0.48, u + 0.48, 2.9, 3.8, 0, 1.2), kind: 'seat', say: 'いただきます！', seats: [[u, 3.35, 0.2, 'bench back turn']] })),
    { id: 'maneki', name: '招財貓', box: isoBBox(2.1, 2.7, 1.7, 2.3, 1.95, 3.1), kind: 'do', go: isoXY(2.4, 3.4), face: 'back turn', pose: 'wave', say: '招福！', fx: 'maneki', fxc: 'beckon' },
    { id: 'tv', name: '電視', box: isoBBox(19, 21.4, 0, 0.1, 5.1, 6.7), kind: 'do', go: isoXY(20.2, 1.6), face: 'back turn', pose: 'look', say: 'あはは！' },
    { id: 'kitchen', name: '廚房', box: isoBBox(16, 18.4, 0, 0.1, 0, 4.1), kind: 'do', go: isoXY(17.2, 1.4), face: 'back turn', pose: 'wave', say: 'ごちそうさまでした！' },
    { id: 'menu', name: '菜單', box: isoBBox(0, 0.1, 4.8, 10.4, 3.4, 6.2), kind: 'do', go: isoXY(1.5, 7.6), face: 'back turn flip', pose: 'look', toast: 'お品書き：カレー 500円・ラーメン 600円・からあげ定食 750円……' },
    { id: 'kamidana', name: '神棚', box: isoBBox(0, 0.1, 1.4, 4.1, 6, 7.3), kind: 'do', go: isoXY(1.5, 2.7), face: 'back turn flip', pose: 'bow', say: 'パンパン 🙏' },
    { id: 'crates', name: '啤酒箱', box: isoBBox(0.5, 1.9, 9.6, 11, 0, 1.9), kind: 'do', go: isoXY(2.7, 10.3), face: 'back turn flip', pose: 'reach', say: 'おもい…！' }],
  izakaya: [
    ...[4, 6.5, 9, 11.5, 14].map((u, i) => ({ id: 'stool' + i, name: '吧台座位', box: isoBBox(u - 0.48, u + 0.48, 3.15, 4.05, 0, 1.2), kind: 'seat', say: 'とりあえずビール！', seats: [[u, 3.6, 0.2, 'bench back turn']] })),
    { id: 'chabudai', name: '矮桌', box: isoBBox(17, 19.8, 10.1, 12.4, 1.05, 1.3), kind: 'seat', say: 'かんぱい！', seats: [[17.6, 9.3, 0.6, 'kneel turn flip'], [19.2, 9.3, 0.6, 'kneel turn flip'], [17.6, 13.2, 0.6, 'kneel back turn'], [19.2, 13.2, 0.6, 'kneel back turn']] },
    ...[[17.6, 9.3, 'kneel turn flip'], [19.2, 9.3, 'kneel turn flip'], [17.6, 13.2, 'kneel back turn'], [19.2, 13.2, 'kneel back turn']].map(([u, v, how], i) => ({ id: 'zabuton' + i, name: '坐墊', box: isoBBox(u - 0.5, u + 0.5, v - 0.5, v + 0.5, 0.6, 1.3), kind: 'seat', say: 'かんぱい！', seats: [[u, v, 0.6, how]] })),
    { id: 'grill', name: '烤爐', box: isoBBox(6, 9.4, 1.6, 2.1, 1.95, 3), kind: 'do', go: isoXY(7.7, 4.8), face: 'back turn', pose: 'look', say: 'いい匂い！' },
    { id: 'taru', name: '酒樽', box: isoBBox(0.5, 1.7, 8.8, 11.3, 0, 2.4), kind: 'do', go: isoXY(2.6, 10.1), face: 'back turn flip', pose: 'reach', say: 'おもい…！' },
    { id: 'menu', name: '黑板', box: isoBBox(0, 0.1, 2.9, 8.7, 3.5, 6.5), kind: 'do', go: isoXY(1.4, 5.8), face: 'back turn flip', pose: 'look', toast: 'きょうのおすすめ：焼き鳥 1本 120円・からあげ 480円' }]
};
// the things tried once (2026-11-10, the user: calmer hints): their dot goes for good, on this device (localStorage nq_used)
const USED = (() => {
  let seen = null;
  const all = () => { if (!seen) { try { seen = JSON.parse(localStorage.getItem('nq_used') || '{}') || {}; } catch (e) { seen = {}; } } return seen; };
  return {
    has: (place, id) => Boolean(all()[`${place}.${id}`]),
    mark(place, id) { const s = all(), k = `${place}.${id}`; if (s[k]) return; s[k] = 1; try { localStorage.setItem('nq_used', JSON.stringify(s)); } catch (e) { /* no storage: this visit only */ } }
  };
})();
const useBtnsHtml = (place) => (PLACE_USE[place] || []).filter((t) => !t.when || t.when()).map((t) => { const [x0, y0, x1, y1] = t.box; return `<button type="button" class="use-btn${USED.has(place, t.id) ? ' tried' : ''}" data-act="scene-use" data-use="${t.id}" aria-label="${t.name}" style="margin-left:${x0 - 600}px;bottom:${370 - y1}px;width:${x1 - x0}px;height:${y1 - y0}px;z-index:${INDOOR.includes(place) ? 1 : Math.round(150 - (370 - y1) / 4)}"></button>`; }).join('');
// words popping up over a thing (x, y in the land's units), a burst of petals or leaves off a tree
function yPop(yard, x, y, text) {
  const w = yard && yard.querySelector('.yworld'); if (!w) return;
  const el = document.createElement('i'); el.className = 'ypop'; el.textContent = text; el.style.cssText = `left:calc(50% + ${x - 600}px);bottom:${370 - y}px`;
  w.appendChild(el); setTimeout(() => el.remove(), 1800);
}
function yBurst(yard, [x0, y0, x1], colours) {
  const w = yard && yard.querySelector('.yworld'); if (!w) return;
  for (let i = 0; i < 12; i++) {
    const el = document.createElement('i'); el.className = 'yleaf';
    el.style.cssText = `left:calc(50% + ${(x0 + (x1 - x0) * Math.random() - 600).toFixed(0)}px);bottom:${(370 - y0 - 30 - 60 * Math.random()).toFixed(0)}px;--c:${colours[i % colours.length]};--dx:${(Math.random() * 80 - 40).toFixed(0)}px;--d:${(1.8 + Math.random() * 1.4).toFixed(2)}s;--w:${(Math.random() * 0.5).toFixed(2)}s`;
    w.appendChild(el); setTimeout(() => el.remove(), 3800);
  }
}
const npcAt = (el) => { const m = /translate\((-?[\d.]+)px/.exec(el.style.transform || ''); return m ? Number(m[1]) : NaN; };
const npcXY = (el) => { const m = /translate\((-?[\d.]+)px,\s*(-?[\d.]+)px/.exec(el.style.transform || ''); return m ? [Number(m[1]), -Number(m[2])] : [NaN, NaN]; };
function ySeat(yard, t, [u, v, h, how]) {
  const el = yard.querySelector('.yhero'); if (!el) return;
  const f = how.split(' ');
  yh.use = { up: [yh.X, yh.Y] }; [yh.X, yh.Y] = isoXY(u, v, h); yh.z = isoZ(u, v + 0.45);   // over his seat, under the table before it
  yh.back = f.includes('back'); yh.turn = f.includes('turn'); yh.flip = f.includes('flip'); el.classList.add(f.includes('kneel') ? 'kneel' : 'bench'); yHeroPlace(yard);
  if (t.say) yPop(yard, yh.X + 600, 370 - yh.Y - 190 * ISO.k, t.say);
}
function sceneUse(el) {
  const yard = el.closest('.yard'); if (!yard || yed.on || yard.classList.contains('dressing')) return;
  const t = (PLACE_USE[yard.dataset.place] || []).find((q) => q.id === el.dataset.use), [x0, y0, x1] = t ? t.box : [];
  if (!t || !yard.querySelector('.yhero')) return;
  USED.mark(yard.dataset.place, t.id); el.classList.add('tried');   // its dot goes
  if (t.kind === 'sit' || t.kind === 'ride') {
    const taken = [...yard.querySelectorAll('.npc.bench')].map(npcAt), tap = yard._at ? yard._at.x : (x0 + x1) / 2 - 600;
    const seat = t.seats.filter((x) => taken.every((n) => !(Math.abs(n - x) < 30))).sort((a, b) => Math.abs(a - tap) - Math.abs(b - tap))[0];
    if (seat === undefined) { yPop(yard, (x0 + x1) / 2, y0 - 4, '坐滿了'); return; }
    yHeroWalk(yard, t.go || [seat, Math.max(14, t.dep - 16)], () => ySit(yard, t, seat));
  } else if (t.kind === 'seat') {   // in a room: [u, v, h, how he sits] — a free one nearest the tap
    const taken = [...yard.querySelectorAll('.npc')].map(npcXY), tap = yard._at ? [yard._at.x, yard._at.y] : null;
    const free = t.seats.filter(([u, v, h]) => { const [X, Y] = isoXY(u, v, h); return taken.every(([nx, ny]) => Math.hypot(nx - X, ny - Y) > 14); });
    const seat = free.sort((a, b) => (tap ? Math.hypot(...isoXY(a[0], a[1], a[2]).map((c, i) => c - tap[i])) - Math.hypot(...isoXY(b[0], b[1], b[2]).map((c, i) => c - tap[i])) : 0))[0];
    if (!seat) { yPop(yard, (x0 + x1) / 2, y0 - 4, '有人坐了'); return; }
    if (yh.use && Math.hypot(...isoXY(seat[0], seat[1], seat[2]).map((c, i) => c - [yh.X, yh.Y][i])) < 2) return;   // sat there already
    yHeroWalk(yard, isoXY(seat[0], seat[1]), () => ySeat(yard, t, seat));
  } else if (t.kind === 'slide') yHeroWalk(yard, t.go, () => ySlide(yard));
  else yHeroWalk(yard, typeof t.go === 'function' ? t.go(yard._at || { x: (x0 + x1) / 2 - 600, y: 0 }) : t.go, () => yDo(yard, t));
}
function ySit(yard, t, X) {
  const h = yard.querySelector('.yhero'); if (!h) return;
  const s = yScale(t.dep);
  yh.use = { up: [yh.X, yh.Y] }; yh.X = X; yh.s = s; yh.Y = t.top - 40 * s; yh.z = t.z || 300 - t.dep - 1;
  yh.back = false; yh.flip = false; yh.turn = false; h.classList.add('bench'); yHeroPlace(yard);
  if (t.say) yPop(yard, X + 600, 370 - yh.Y - 185 * s, t.say);   // over his head
  if (t.kind !== 'ride') return;
  const part = yard.querySelector(`.land [data-fx="${t.fx}"]`), svg = h.querySelector('svg');
  if (svg) svg.style.transformOrigin = `60px ${(200 - (t.piv - yh.Y) / s).toFixed(1)}px`;   // the point they turn round, in his drawing's px
  if (part) part.classList.add('ride-' + t.ride); h.classList.add('ride-' + t.ride); yh.use.part = part;   // in the same frame: in step
}
function yUseEnd(yard) {   // up off a seat, a ride, the slide (a walk, the place drawn anew)
  const u = yh.use; if (!u) return; yh.use = null; yh.s = 0; yh.z = 0;
  if (u.part) u.part.classList.remove('ride-swing', 'ride-rock');
  const h = yard && yard.querySelector('.yhero');
  if (h) { h.classList.remove('bench', 'kneel', 'ride-swing', 'ride-rock', 'sliding', 'walk'); const svg = h.querySelector('svg'); if (svg) svg.style.transformOrigin = ''; }
  [yh.X, yh.Y] = u.up;
}
// the park's slide: up the ladder (seen from behind), sat down the chute, off at its foot
function ySlide(yard) {
  const h = yard.querySelector('.yhero'); if (!h) return;
  const F = 236, s = yScale(134), sit = 40 * s, chute = [[327, F - 92], [308, F - 88], [294, F - 68], [282, F - 46], [268, F - 24], [250, F - 11], [228, F - 6]].map(([x, y]) => [x - 600, 370 - y + 6 - sit]);
  yh.use = { up: [-385, 120] }; yh.s = s; yh.z = 166;
  const legs = [[[[yh.X, yh.Y], [-259, 134], [-259, 232]], 80, 'walk', { back: true }], [[[-266, 232 - sit], ...chute], 230, 'bench', { flip: true, turn: true }]];
  let i = -1;
  const next = () => {
    i += 1;
    if (!yard.isConnected || yh.use === null) return;
    if (i >= legs.length) { yUseEnd(yard); yHeroPlace(yard); yHeroWalk(yard, [-385, 112]); yPop(yard, 215, 200, 'わーい！'); return; }
    const [pts, v, cls, face] = legs[i], seg = []; let len = 0;
    for (let k = 1; k < pts.length; k++) { const d = Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]); if (d) { seg.push([pts[k - 1], pts[k], len, d]); len += d; } }
    h.classList.remove('walk', 'bench', 'run'); h.classList.add(cls, 'sliding'); Object.assign(yh, { back: false, flip: false, turn: false }, face);
    const t0 = performance.now();
    const step = (now) => {
      if (!yard.isConnected || !yh.use) return;
      const d = Math.min(len, (now - t0) / 1000 * v), q = seg.find((x) => d <= x[2] + x[3]) || seg[seg.length - 1], f = Math.min(1, (d - q[2]) / q[3]);
      yh.X = q[0][0] + (q[1][0] - q[0][0]) * f; yh.Y = q[0][1] + (q[1][1] - q[0][1]) * f; yHeroPlace(yard);
      if (d < len) { yh.raf = requestAnimationFrame(step); return; }
      next();
    };
    yh.raf = requestAnimationFrame(step);
  };
  next();
}
function yDo(yard, t) {
  const h = yard.querySelector('.yhero'); if (!h) return;
  const [x0, y0, x1] = t.box, cx = typeof t.go === 'function' ? yh.X + 600 : (x0 + x1) / 2;
  if (t.face) { const f = t.face.split(' '); yh.back = f.includes('back'); yh.turn = f.includes('turn'); yh.flip = f.includes('flip'); } else { yh.back = !!t.back; yh.flip = cx - 600 < yh.X; yh.turn = !t.back; }   // face: which way, in a room
  yHeroPlace(yard);
  if (t.out) { h.classList.add('out'); setTimeout(() => { if (!yard.isConnected) return; h.classList.remove('out'); yh.back = false; yHeroPlace(yard); if (t.then) yPop(yard, yh.X + 600, 370 - yh.Y - 200 * yScale(yh.Y), t.then); }, t.out); return; }   // in and out again
  if (t.pose) { h.classList.remove(t.pose); void h.offsetWidth; h.classList.add(t.pose); setTimeout(() => h.classList.remove(t.pose), 1500); }
  const part = t.fx && yard.querySelector(`.land [data-fx="${t.fx}"]`);
  if (part) { part.classList.remove(t.fxc); void part.getBoundingClientRect(); part.classList.add(t.fxc); clearTimeout(part._fxT); part._fxT = setTimeout(() => part.classList.remove(t.fxc), t.ms || 1800); }
  let say = t.say;
  if (t.fortune) { const [a, b] = KUJI[Math.floor(Math.random() * KUJI.length)]; say = a; toast(`おみくじ：${a}・${b}`, 3600); }
  if (say) yPop(yard, cx, y0 - 4, say);
  if (t.then) setTimeout(() => yPop(yard, cx, y0 - 4, t.then), 1200);
  if (t.toast) toast(typeof t.toast === 'function' ? t.toast() : t.toast, 4600);
  if (t.mirror) setTimeout(() => { if (yard.isConnected && !yard.classList.contains('dressing')) DRESS.open(yard, 'mirror', t.name); }, 1300);
  if (t.burst) yBurst(yard, t.box, t.burst);
}
// a spot off the things (where he was kept, a thing put down where he stands): the nearest free side
const yFree = (place, q) => { const g = yRoute(place, [q[0], -999], q).pop(); return g[1] < -900 ? q : g; };
function yHeroWalk(yard, to, done, free) {   // free: on the way out of the place (up the path home), past its top
  cancelAnimationFrame(yh.raf);
  yUseEnd(yard); yh.far = null;   // up off a seat or a ride first; off the long way down
  YCAM.free = false; YCAM.t = 0;   // sent somewhere: the camera goes with him again
  const el = yard.querySelector('.yhero'), lim = ycam.YW / 2 - 20;
  yh.climb = null; yh.s = 0; yard.classList.remove('climbing'); if (el) { el.classList.remove('climb'); yClimbLook(el, 0); }   // off the hill path, if he was on it
  HERO.still(el); if (el) el.classList.remove('bench');   // up off the bus stop's bench
  const from = [yh.X, yh.Y], aim = INDOOR.includes(yPlace) ? (free ? to : isoClamp(to)) : [Math.max(-lim, Math.min(lim, to[0])), Math.max(12, Math.min(free ? 222 : walkTop(yPlace, Math.max(-lim, Math.min(lim, to[0]))), to[1]))];
  const pts = yRoute(yPlace, from, aim, free), goal = pts[pts.length - 1], seg = []; let len = 0;   // round what stands in the way
  for (let i = 1; i < pts.length; i++) { const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); if (d) { seg.push([pts[i - 1], pts[i], len, d]); len += d; } }
  if (!el || len < 2 || (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches)) { yh.X = goal[0]; yh.Y = goal[1]; if (el) yHeroPlace(yard); yHeroSave(); if (done) done(); return; }
  const v = Math.max(170, len / 1.1); yh.v = v;   // px a second: a long way hurries, about a second at most
  const face = ([a, b]) => { const dx = b[0] - a[0], dy = b[1] - a[1]; yh.back = dy > 0; if (Math.abs(dx) > 1) yh.flip = dx < 0; yh.turn = Math.abs(dx) > 0.5 * Math.abs(dy); };   // across the lawn: a little turned
  let on = seg[0]; face(on);
  el.classList.remove('out'); el.classList.toggle('run', v > 260); el.classList.toggle('walk', v <= 260);
  const t0 = performance.now();
  const step = (now) => {
    if (!yard.isConnected) return;
    const d = Math.min(len, (now - t0) / 1000 * v), q = seg.find((x) => d <= x[2] + x[3]) || seg[seg.length - 1], t = Math.min(1, (d - q[2]) / q[3]);
    if (q !== on) { on = q; face(q); }   // round a corner: turned the new way
    yh.X = q[0][0] + (q[1][0] - q[0][0]) * t; yh.Y = q[0][1] + (q[1][1] - q[0][1]) * t; yh.rem = len - d; yHeroPlace(yard);
    if (d < len) { yh.raf = requestAnimationFrame(step); return; }
    el.classList.remove('walk', 'run'); yh.rem = undefined; yCamSettle(yard); yHeroSave(); if (done) done();
  };
  yh.raf = requestAnimationFrame(step);
}
// 古道具屋 tapped (1.2.0): the hero runs over the lawn to the foot of the hill path and up its zigzag to the shop's door — small
// with the distance, outlined so he stands out, behind the house — then in. Tapped again on the way: straight in. Next time out he
// stands at the foot of the path.
const SHOP_PATH = [[540, 342], [514, 326], [546, 306], [506, 290], [526, 272], [490, 260], [482, 255]];   // in the hill's own units (.mtn), the last at the door
function yClimb(el) {
  yNamed(el);
  if (!shopOpen()) { shopShut(); return; }   // not open yet
  const yard = el.closest('.yard'), h = yard && yard.querySelector('.yhero');
  const k = ycam.YW / 1200, at = ([x, y]) => [(x - 600) * k, (600 - y) * k], foot = [Math.round(at(SHOP_PATH[0])[0]), 214];
  const keep = () => { yh.climb = null; yh.s = 0; yh.X = foot[0]; yh.Y = foot[1]; yh.back = false; yHeroSave(); };
  if (!h || yh.climb || (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches)) { cancelAnimationFrame(yh.raf); keep(); go('#/shop'); return; }
  yHeroWalk(yard, foot, () => {
    const pts = [foot].concat(SHOP_PATH.map(at)), seg = []; let len = 0;
    for (let i = 1; i < pts.length; i++) { const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); seg.push([pts[i - 1], pts[i], len, d]); len += d; }
    const s0 = yScale(214), s1 = 0.09 * k, v = 120 * k, t0 = performance.now();   // up the path at 120 px a second, from his size at the lawn's end to the door's
    yh.climb = 'hill'; yard.classList.add('climbing'); h.classList.add('climb', 'run'); h.classList.remove('walk');
    const step = (now) => {
      if (!yard.isConnected || yh.climb !== 'hill') return;
      const d = Math.min(len, (now - t0) / 1000 * v), q = seg.find((x) => d <= x[2] + x[3]) || seg[seg.length - 1], t = (d - q[2]) / q[3];
      const dx = q[1][0] - q[0][0], dy = q[1][1] - q[0][1];
      yh.X = q[0][0] + dx * t; yh.Y = q[0][1] + dy * t; yh.back = dy > 0; if (Math.abs(dx) > 0.5) yh.flip = dx < 0; yh.turn = Math.abs(dx) > 0.5 * Math.abs(dy);
      yh.s = s0 + (s1 - s0) * d / len; yClimbLook(h, yh.s); yHeroPlace(yard);
      if (d < len) { yh.raf = requestAnimationFrame(step); return; }
      h.classList.add('out'); keep(); setTimeout(() => go('#/shop'), 280);   // in at the door
    };
    yh.raf = requestAnimationFrame(step);
  });
  yh.climb = yh.climb || 'lawn';   // on the way over the lawn: a second tap goes straight in
}
