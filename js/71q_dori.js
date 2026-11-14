'use strict';
// ---------- 中華街大通り (2026-11-14; docs/superpowers/specs/2026-11-14-chinatown-work-design.md §3) ----------
// The user: 中華街's 牌樓 should not shake but be walked through, into a street seen down its length — the two rows of shops
// facing it, narrowing away (B of the two pictures, not the 食堂's 45°), the jobs a beginner earns a little 円 at along it. One
// screen wide, a phone's too: no swipe. The ground is a trapezoid in one-point perspective: the hero's Y is up the screen as
// anywhere out of doors, the horizon at H; at Y the street's half width and his size are as far from H as Y is (HALF0 and 0.5
// at the front, Y0), so he walks in up the middle and shrinks, and can't step past the shops' fronts. Then (the user, on the
// first drawing: shops like sheets of paper, a second 牌樓 at the end cut off from the rest — no 牌樓, a long street that turns
// a corner instead of going on for ever): four buildings a side, each a block with its roof, its end wall and its depth, and at
// the end a restaurant across the way, the street turning right in front of it.
const DORI = (() => {
  const H = 430, Y0 = 12, FAR = 300, HALF0 = 110, K = H - Y0, END = 104;   // END: the restaurant across the end (p, H − Y)
  const scale = (Y) => 0.5 * (H - Y) / K;
  const half = (Y) => HALF0 * (H - Y) / K;
  const top = (X) => Math.min(FAR, H - Math.abs(X) * K / HALF0);
  // a spot sent to, onto the street: no deeper than its end, no nearer than its front, inside its edge at that depth
  const clamp = ([X, Y]) => { const y = Math.max(Y0, Math.min(FAR, Y)), h = half(y); return [Math.max(-h, Math.min(h, X)), y]; };
  // the shops, three a side near to far, each over an equal stretch of the street (equal in 1/(H − Y), so nearer ones are longer
  // on the screen): their kana on a sign hung out over the street facing the way one looks (a 30-kana learner reads ふく, とうか
  // and こはく; らんらん and くりや later), what they are, and the job there (WORK); L where the front stands (a little in or out,
  // so each block's end shows), how tall
  const SHOPS = [
    { id: 'ranran', side: -1, y0: 12, y1: 172, L: 140, tall: 330, sign: 'らんらん', name: 'おみやげ屋', job: 'counter' },
    { id: 'fuku', side: -1, y0: 172, y1: 244, L: 130, tall: 290, sign: 'ふく', name: '中華食材店', job: 'shelf' },
    { id: 'toka', side: -1, y0: 244, y1: 284, L: 138, tall: 350, sign: 'とうか', name: '茶館' },
    { id: 'rairai', side: 1, y0: 12, y1: 172, L: 136, tall: 340, sign: 'らいらいけん', name: '出前的中華料理店', job: 'deliver' },
    { id: 'kuriya', side: 1, y0: 172, y1: 244, L: 142, tall: 280, sign: 'くりや', name: '天津甘栗' },
    { id: 'kohaku', side: 1, y0: 244, y1: 280, L: 132, tall: 320, sign: 'こはく', name: '雜貨攤' }];
  const shop = (id) => SHOPS.find((s) => s.id === id);
  // a point t of the way along a block's front (0 its near end, 1 its far end), as far from the horizon as that is
  const pAt = (s, t) => 1 / (1 / (H - s.y0) + t * (1 / (H - s.y1) - 1 / (H - s.y0)));
  // where the hero stands to deal with a shop: halfway along it, at the street's edge
  const door = (id) => { const s = shop(id), Y = H - pAt(s, 0.5); return [s.side * (half(Y) - 8), Y]; };
  return { H, Y0, FAR, HALF0, K, END, scale, half, top, clamp, SHOPS, shop, pAt, door };
})();

// ---- the street, drawn: a point of it is P(side, p, L, V) — p how far from the horizon (H − Y), L how far out from the middle
// and V how high, both as they measure at the front (Y0), so everything shrinks toward the vanishing point (land x 600, y −60).
// The eye is above the roofs (V = K): their tiles are seen from above, the blocks' near ends face it. The sun from the left: the
// left row's fronts in shade, their shadow on the street's left side ----
function chinadoriHtml() {
  const { K, END } = DORI, f = (n) => n.toFixed(1), open = TOWNEV.isOpen('dori', TOWNEV.now());
  const P = (side, p, L, V) => [600 + side * L * p / K, -60 + p * (1 - V / K)];
  const poly = (pts, attrs) => `<path d="M${pts.map((q) => q.map(f).join(' ')).join(' L')} Z" ${attrs}/>`;
  const line = (a, b, attrs) => `<path d="M${a.map(f).join(' ')} L${b.map(f).join(' ')}" ${attrs}/>`;
  const WALK = 110;   // the street's edge; the pavement from it to the fronts, a kerb high
  // the three kinds of face: along the street (a front, L fixed), across it facing the eye (p fixed), level (V fixed)
  const along = (sd, a, b, L, v0, v1, attrs) => poly([P(sd, a, L, v0), P(sd, b, L, v0), P(sd, b, L, v1), P(sd, a, L, v1)], attrs);
  const facing = (sd, p, L0, L1, v0, v1, attrs) => poly([P(sd, p, L0, v0), P(sd, p, L1, v0), P(sd, p, L1, v1), P(sd, p, L0, v1)], attrs);
  const level = (sd, a, b, L0, L1, V, attrs) => poly([P(sd, a, L0, V), P(sd, b, L0, V), P(sd, b, L1, V), P(sd, a, L1, V)], attrs);
  const LOOK = { ranran: ['#f2e2c4', '#d0302a', '#4a6a5a'], fuku: ['#e8d8b8', '#2f7a6a', '#5a5048'], toka: ['#efe4cc', '#7a4a8a', '#3f6058'],
    rairai: ['#f0dcc0', '#c8322a', '#4a5a6a'], kuriya: ['#e6d2b0', '#b8642a', '#5a4a40'], kohaku: ['#ece0c8', '#3f6aa0', '#4a6a5a'],
    near: ['#e4d2b2', '#8a2a2a', '#4a5a58'], far: ['#e8dcc4', '#3f8a7a', '#55605a'] };
  const SHADE = 'fill="#1a1030" fill-opacity=".16"';
  // one block: its near end wall and gable, its front (a recessed shop front with its counter and goods, the awning sloping out
  // with a fringe, the upstairs windows with lattice, a balcony on some), the left row's in shade, its tiled roof seen from above
  // with a gold ridge curled up at the near end; shut: the shutter down; its sign hung out over the pavement
  function block(b) {
    const sd = b.side, [wall, cloth, roof] = LOOK[b.id] || LOOK[b.look], L = b.L, tall = b.tall, a = DORI.pAt(b, 0), z = DORI.pAt(b, 1), at = (t) => DORI.pAt(b, t);
    const fr = (t0, t1, v0, v1, attrs, l = L) => along(sd, at(t0), at(t1), l, v0, v1, attrs);
    let g = facing(sd, a, L, L + 70, 0, tall, hc(wall, '#24264a')) + facing(sd, a, L, L + 70, 0, tall, 'fill="#1a1030" fill-opacity=".22"')   // its near end
      + poly([P(sd, a, L - 16, tall), P(sd, a, L + 30, tall + 46), P(sd, a, L + 76, tall)], hc('#d8c8a8', '#202244'))   // the gable under the roof's end
      + fr(0, 1, 0, tall, hc(wall, '#2a2c48')) + fr(0, 1, 0, 8, hc('#a89a88', '#22243e'));   // the front, its plinth
    // the shop front, set back into the wall: dark inside, the far jamb catching the light, the counter standing out with goods on it
    g += fr(0.06, 0.94, 0, 112, hc('#3e2c22', '#14142a')) + facing(sd, at(0.94), L, L + 12, 0, 112, hc('#c8b898', '#2a2a46'))
      + fr(0.1, 0.9, 0, 40, hc('#8a5a34', '#2a2030'), L - 8) + level(sd, at(0.1), at(0.9), L - 8, L + 2, 40, hc('#b07a48', '#3a2a3a'))
      + [0.16, 0.34, 0.52, 0.7].map((t, i) => fr(t, t + 0.1, 40, 56 + (i % 2) * 8, hc(['#d0574b', '#e6b23c', '#3f9a8c', '#f2e8d4'][(i + (b.y0 | 0)) % 4], '#3a2a3a'), L - 5)).join('');
    if (!open && b.sign !== undefined) g += `<g class="dr-shut">${fr(0.06, 0.94, 0, 112, hc('#8f8f96', '#3a3c56'))}${[22, 44, 66, 88].map((v) => fr(0.06, 0.94, v, v + 2, hc('#6f6f78', '#2a2c48'))).join('')}</g>`;
    // upstairs: two windows, framed and latticed, the far side of each frame catching the light; lit by night
    [[0.14, 0.4], [0.58, 0.84]].forEach(([t0, t1]) => {
      g += fr(t0 - 0.02, t1 + 0.02, 164, 246, hc('#7a5a3a', '#2a2030')) + fr(t0, t1, 170, 240, hc('#8fb4c8', '#ffd98a')) + facing(sd, at(t1), L, L + 6, 170, 240, hc('#b8a888', '#2a2a46'))
        + [0.33, 0.66].map((u) => { const p = at(t0 + (t1 - t0) * u); return line(P(sd, p, L, 170), P(sd, p, L, 240), 'stroke="#6a4a2a" stroke-width=".8"'); }).join('') + line(P(sd, at(t0), L, 205), P(sd, at(t1), L, 205), 'stroke="#6a4a2a" stroke-width=".8"');
    });
    if (b.balcony) g += level(sd, at(0.08), at(0.92), L, L - 14, 150, hc('#c8b898', '#2a2a46')) + fr(0.08, 0.92, 144, 150, hc('#8a6a4a', '#2a2030'), L - 14)
      + Array.from({ length: 13 }, (_, i) => { const p = at(0.08 + 0.84 * i / 12); return line(P(sd, p, L - 14, 150), P(sd, p, L - 14, 166), 'stroke="#7a2a2a" stroke-width="1.1"'); }).join('') + line(P(sd, at(0.08), L - 14, 166), P(sd, at(0.92), L - 14, 166), 'stroke="#7a2a2a" stroke-width="1.6"');
    if (sd < 0) g += fr(0, 1, 0, tall, SHADE);   // the left row: its fronts in shade
    // the awning sloping out over the pavement in stripes, its fringe hanging from the edge
    g += Array.from({ length: 8 }, (_, i) => poly([P(sd, at(0.03 + 0.94 * i / 8), L, 126), P(sd, at(0.03 + 0.94 * (i + 1) / 8), L, 126), P(sd, at(0.03 + 0.94 * (i + 1) / 8), L - 28, 104), P(sd, at(0.03 + 0.94 * i / 8), L - 28, 104)], i % 2 ? hc('#f4ead8', '#3a3448') : hc(cloth, '#3a1e2a'))).join('')
      + fr(0.03, 0.97, 96, 104, hc(cloth, '#3a1e2a'), L - 28) + fr(0.03, 0.97, 96, 98, 'fill="#000" fill-opacity=".18"', L - 28);
    // the roof from its eave up to the ridge, tiles running up it, the ridge gold and curled up at the near end
    g += poly([P(sd, a, L - 16, tall), P(sd, z, L - 16, tall), P(sd, z, L + 30, tall + 46), P(sd, a, L + 30, tall + 46)], hc(roof, '#1a2a36'))
      + Array.from({ length: 9 }, (_, i) => { const p = at((i + 0.5) / 9); return line(P(sd, p, L - 16, tall), P(sd, p, L + 30, tall + 46), 'stroke="#000" stroke-opacity=".18" stroke-width=".9"'); }).join('')
      + line(P(sd, a, L - 16, tall), P(sd, z, L - 16, tall), `stroke="#2a2a2a" stroke-opacity=".35" stroke-width="${f(2.4 * a / K)}"`)
      + line(P(sd, a, L + 30, tall + 46), P(sd, z, L + 30, tall + 46), `stroke="#d9b04a" stroke-width="${f(3 * a / K)}" stroke-linecap="round"`)
      + `<path d="M${P(sd, a, L + 30, tall + 46).map(f).join(' ')} q${f(-sd * 6 * a / K)} ${f(-4 * a / K)} ${f(-sd * 4 * a / K)} ${f(-12 * a / K)}" fill="none" stroke="#d9b04a" stroke-width="${f(2.6 * a / K)}" stroke-linecap="round"/>`
      + `<path d="M${P(sd, a, L - 16, tall).map(f).join(' ')} q${f(-sd * 8 * a / K)} ${f(-2 * a / K)} ${f(-sd * 10 * a / K)} ${f(-12 * a / K)}" fill="none" stroke="${roof}" stroke-width="${f(3 * a / K)}" stroke-linecap="round"/>`;
    if (!b.sign) return g;
    // the sign hung out from the wall over the pavement, flat to the eye, a board with some thickness: red, a gold rim, its kana down
    // it — the further shops' higher up, so the three a side don't cover one another
    const ps = at(0.8), k = ps / K, n = [...b.sign].length, top = 300 + 32 * (b.y0 > 150) + 44 * (b.y0 > 220), fs = Math.min(22, 150 / (n + 0.6));
    const x0 = 600 + sd * (L - 2) * k, x1 = 600 + sd * (L - 32) * k, y0 = -60 + ps * (1 - top / K), y1 = -60 + ps * (1 - (top - fs * (n + 0.6)) / K), xl = Math.min(x0, x1), w = Math.abs(x1 - x0);
    g += `<path d="M${f(600 + sd * L * k)} ${f(y0 + 6 * k)} H${f(x0)}" stroke="#3b2a1c" stroke-width="${f(2 * k)}"/><g class="dr-sign" data-sign="${b.id}">`
      + `<rect x="${f(xl + sd * 2.4 * k)}" y="${f(y0 + 2.4 * k)}" width="${f(w)}" height="${f(y1 - y0)}" rx="${f(2 * k)}" fill="#5a1414"/>`
      + `<rect x="${f(xl)}" y="${f(y0)}" width="${f(w)}" height="${f(y1 - y0)}" rx="${f(2 * k)}" ${hc('#b82828', '#6a1e24')} stroke="#d9b04a" stroke-width="${f(1.6 * k)}"/>`
      + [...b.sign].map((c, i) => `<text x="${f(xl + w / 2)}" y="${f(y0 + (i + 0.95) * fs * k + 2 * k)}" text-anchor="middle" font-size="${f(fs * k)}" font-weight="700" ${hc('#f6e08a', '#ffe9a0')} ${SERIF}>${c}</text>`).join('') + '</g>';
    if (b.id === 'kuriya') { const p = at(0.5), [x, y] = P(sd, p, WALK + 12, 40), r = 16 * p / K;   // the chestnut pan out front, steaming
      g += `<g data-fx="kuri"><rect x="${f(x - r * 0.9)}" y="${f(y)}" width="${f(r * 1.8)}" height="${f(r * 1.4)}" ${hc('#5a4a40', '#1a1a2e')}/><ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(r * 1.3)}" ry="${f(r * 0.45)}" ${hc('#2a2420', '#14142a')}/><ellipse cx="${f(x)}" cy="${f(y - r * 0.12)}" rx="${f(r * 1.1)}" ry="${f(r * 0.3)}" fill="#5a3a22"/>${[-0.5, 0, 0.5].map((d, i) => `<path class="dr-steam" style="animation-delay:${i * 0.6}s" d="M${f(x + d * r)} ${f(y - r * 0.4)} q${f(r * 0.3)} ${f(-r * 0.6)} 0 ${f(-r * 1.2)} t0 ${f(-r * 1.1)}" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="${f(r * 0.18)}" stroke-linecap="round"/>`).join('')}</g>`; }
    return g;
  }
  // the ground: the street, its slabs' joints running to the vanishing point and across; the pavements a kerb high either side;
  // the left row's shadow over the street's left; at the end the side street going off to the right in front of the restaurant
  const near = 480, end = END, CROSS = 150;   // the right row stops at CROSS: the corner
  let ground = poly([P(-1, near, WALK, 0), P(1, near, WALK, 0), P(1, end, WALK, 0), P(-1, end, WALK, 0)], hc('#d8d0c0', '#2a2c48'))
    + poly([P(-1, CROSS, WALK, 0), P(1, CROSS, 520, 0), P(1, end, 520, 0), P(-1, end, WALK, 0)], hc('#9e9a92', '#22243a'))   // the road the street turns into, off to the right
    + line(P(-1, (CROSS + end) / 2, WALK, 0), P(1, (CROSS + end) / 2, 520, 0), `stroke="#f4f0e6" stroke-width="${f(2 * CROSS / K)}" stroke-dasharray="${f(14 * CROSS / K)} ${f(10 * CROSS / K)}"`)   // its centre line
    + Array.from({ length: 9 }, (_, i) => { const l0 = -100 + i * 24, p0 = CROSS + 14, p1 = CROSS + 2; return poly([P(1, p0, l0, 0), P(1, p0, l0 + 13, 0), P(1, p1, l0 + 13, 0), P(1, p1, l0, 0)], hc('#f4f0e6', '#4a4c66')); }).join('')   // a crossing at the corner
    + [-55, 0, 55].map((L) => line(P(1, near, L, 0), P(1, end, L, 0), 'class="seam"')).join('')
    + [430, 372, 324, 284, 250, 222, 198, 178, 162].map((p) => line(P(-1, p, WALK, 0), P(1, p, WALK, 0), 'class="seam"')).join('');
  [-1, 1].forEach((sd) => { const p1 = sd > 0 ? CROSS : end;   // the pavements, their kerbs
    ground += along(sd, near, p1, WALK, 0, 5, hc('#a89c8a', '#20223c')) + level(sd, near, p1, WALK, 150, 5, hc('#c8bca8', '#24264a')); });
  ground += poly([P(-1, near, WALK, 0), P(-1, end, WALK, 0), P(-1, end, WALK - 36, 0), P(-1, near, WALK - 36, 0)], SHADE);
  // a street lamp on the corner, where the right row stops and the side street goes off
  const [lx, ly] = P(1, CROSS - 4, WALK + 10, 5), [, lt] = P(1, CROSS - 4, WALK + 10, 230), lr = (CROSS - 4) / K;
  ground += `<path d="M${f(lx)} ${f(ly)} V${f(lt)}" stroke="#3a3a42" stroke-width="${f(5 * lr)}"/><path d="M${f(lx)} ${f(lt)} h${f(-14 * lr)}" stroke="#3a3a42" stroke-width="${f(3 * lr)}"/><circle class="glow" cx="${f(lx - 14 * lr)}" cy="${f(lt + 8 * lr)}" r="${f(30 * lr)}" fill="url(#glw)"/><ellipse cx="${f(lx - 14 * lr)}" cy="${f(lt + 8 * lr)}" rx="${f(8 * lr)}" ry="${f(9 * lr)}" ${hc('#f4ead8', '#ffd98a')}/>`;
  // the restaurant across the end, facing up the street: red pillars at its door, its name on a long board, round windows upstairs,
  // a row of lanterns under its eave, the roof's ends curled up; it runs on to the right along the side street
  const R = (L, V) => P(1, end, L, V), rk = end / K, L0 = -160, L1 = 520;
  const across = poly([R(L0, 0), R(L1, 0), R(L1, 330), R(L0, 330)], hc('#efe2c8', '#2a2c48'))
    + poly([R(L0, 0), R(L1, 0), R(L1, 10), R(L0, 10)], hc('#a89a88', '#22243e'))
    + poly([R(-46, 0), R(46, 0), R(46, 118), R(-46, 118)], hc('#3e2c22', '#14142a'))
    + [-62, 62].map((L) => poly([R(L - 10, 0), R(L + 10, 0), R(L + 10, 130), R(L - 10, 130)], hc('#c8322a', '#4a1e2a'))).join('')
    + [[-140, -84], [84, 140], [200, 280], [320, 400], [440, 500]].map(([l0, l1]) => poly([R(l0, 30), R(l1, 30), R(l1, 104), R(l0, 104)], hc('#8fb4c8', '#ffd98a'))).join('')
    + poly([R(-110, 146), R(110, 146), R(110, 196), R(-110, 196)], hc('#a8262e', '#3a1424')) + poly([R(-110, 146), R(110, 146), R(110, 150), R(-110, 150)], 'fill="#d9b04a"')
    + `<text x="${f(R(0, 0)[0])}" y="${f(R(0, 160)[1])}" text-anchor="middle" font-size="${f(34 * rk)}" font-weight="700" letter-spacing="${f(8 * rk)}" ${hc('#f6e08a', '#ffe9a0')} ${SERIF}>ほうらい</text>`
    + [-80, 0, 80, 240, 360, 470].map((L) => `<circle cx="${f(R(L, 0)[0])}" cy="${f(R(0, 254)[1])}" r="${f(24 * rk)}" ${hc('#8fb4c8', '#ffd98a')} stroke="#7a5a3a" stroke-width="${f(3 * rk)}"/>`).join('')
    + poly([R(L0 - 16, 330), R(L1 + 16, 330), P(1, end - 18, L1 + 16, 372), P(1, end - 18, L0 - 16, 372)], hc('#3f6058', '#1a2a36'))
    + line(P(1, end - 18, L0 - 16, 372), P(1, end - 18, L1 + 16, 372), `stroke="#d9b04a" stroke-width="${f(3 * rk)}"`)
    + Array.from({ length: 12 }, (_, i) => { const L = L0 + 30 + i * 56, [x, y] = R(L, 300), r = 9 * rk; return `<circle class="glow" cx="${f(x)}" cy="${f(y)}" r="${f(r * 2.6)}" fill="url(#glw)"/><ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(r)}" ry="${f(r * 0.9)}" ${hc('#d0302a', '#ff8a5a')}/>`; }).join('');
  // the blocks, furthest first so the nearer cover them: the six shops; a seventh on the left up to the corner; the nearest either
  // side running toward the eye off the screen
  const blocks = DORI.SHOPS.map((s) => Object.assign({ balcony: s.id === 'ranran' || s.id === 'rairai' || s.id === 'kuriya' }, s))
    .concat([{ id: 'far', look: 'far', side: -1, y0: 284, y1: 430 - end, L: 134, tall: 310 }])
    .concat([-1, 1].flatMap((sd) => [{ id: 'n1', look: 'near', side: sd, y0: -260, y1: 12, L: 138, tall: 370, balcony: true }, { id: 'n2', look: 'near', side: sd, y0: -1500, y1: -260, L: 140, tall: 390 }]))
    .sort((x, y) => y.y0 - x.y0);
  const art = blocks.map((b) => (b.sign ? `<g class="dr-shop" data-shop="${b.id}">${block(b)}</g>` : block(b))).join('');
  // red lantern strings across the street at five depths, sagging, swaying, lit by night — the lanterns over the street's middle,
  // clear of the signs hung out at its sides
  const strings = [400, 318, 258, 212, 176].map((p, j) => { const k = p / K, [xa, ya] = P(-1, p, 132, 262), [xb] = P(1, p, 132, 262), sag = 22 * k, n = 6;
    const at = (t) => [xa + (xb - xa) * t, ya + sag * 4 * t * (1 - t)];
    return `<path d="M${Array.from({ length: 13 }, (_, i) => at(i / 12).map(f).join(' ')).join(' L')}" fill="none" ${hs('#3b2a1c', '#14142a')} stroke-width="${f(1.2 * k)}"/>`
      + Array.from({ length: n }, (_, i) => { const [x, y] = at(0.18 + 0.64 * (i + 0.5) / n), r = 9 * k;
        return `<g class="fx-sway" style="animation-delay:-${((i + j * 3) * 0.37 % 3).toFixed(2)}s;animation-duration:${(3 + (i % 3) * 0.5).toFixed(1)}s"><circle class="glow" cx="${f(x)}" cy="${f(y + r * 1.4)}" r="${f(r * 2.6)}" fill="url(#glw)"/><path d="M${f(x)} ${f(y)} v${f(r * 0.5)}" stroke="#3b2a1c" stroke-width="${f(k)}"/><ellipse cx="${f(x)}" cy="${f(y + r * 1.4)}" rx="${f(r)}" ry="${f(r * 0.9)}" ${hc('#d0302a', '#ff8a5a')}/><rect x="${f(x - r * 0.5)}" y="${f(y + r * 0.4)}" width="${f(r)}" height="${f(r * 0.28)}" ${hc('#d9b04a', '#6a5a30')}/><rect x="${f(x - r * 0.5)}" y="${f(y + r * 2.2)}" width="${f(r)}" height="${f(r * 0.28)}" ${hc('#d9b04a', '#6a5a30')}/></g>`; }).join(''); }).join('');
  // the 求人看板 by the way in: a standing board on the left of the street
  const bp = 392, [bx0, by1] = P(-1, bp, 104, 0), [bx1] = P(-1, bp, 80, 0), by0 = P(-1, bp, 0, 62)[1];
  const board = `<g class="dr-board"><path d="M${f(bx0 + 2)} ${f(by1)} L${f(bx0 + 4)} ${f(by0 + 6)} M${f(bx1 - 2)} ${f(by1)} L${f(bx1 - 4)} ${f(by0 + 6)}" stroke="#6a4a2a" stroke-width="2"/><rect x="${f(bx0)}" y="${f(by0)}" width="${f(bx1 - bx0)}" height="${f((by1 - by0) * 0.62)}" rx="1.5" ${hc('#f4ead8', '#3a3a52')} stroke="#8a2a2a" stroke-width="1.4"/>`
    + `<text x="${f((bx0 + bx1) / 2)}" y="${f(by0 + (by1 - by0) * 0.22)}" text-anchor="middle" font-size="${f((bx1 - bx0) * 0.2)}" font-weight="700" fill="#a82828" ${SERIF}>求人</text>${[0.34, 0.44, 0.54].map((u) => `<path d="M${f(bx0 + 4)} ${f(by0 + (by1 - by0) * u)} H${f(bx1 - 4)}" stroke="#8a7a6a" stroke-width=".8"/>`).join('')}</g>`;
  return `<svg class="land tall dori-land" viewBox="0 -400 1200 770" preserveAspectRatio="xMidYMax slice">${GLOW_DEFS}
      ${ground}${across}${art}${strings}${board}
    </svg>
    ${yHeroHtml()}
    ${TOWNEV.castHtml('chinadori')}
    <button type="button" class="thing way-btn" data-act="go-place" data-to="chinatown" aria-label="回中華街" style="margin-left:-32px;bottom:2px"><span class="tag">${ySign('back', '回中華街')}</span></button>
    <div class="ysel"></div>`;
}

// ---- what can be tapped along the street: each shop (its sign and front), the 求人看板 by the way in, the restaurant at the end ----
// Kept here, not with the other places' (71b_places.js), as their boxes are worked out from the street's own geometry
PLACE_USE.chinadori = (() => {
  const { K } = DORI, box = (s) => { const a = DORI.pAt(s, 0.04), b = DORI.pAt(s, 0.96), x = (p, L) => 600 + s.side * L * p / K, y = (p, V) => -60 + p * (1 - V / K);
    const xs = [x(a, s.L), x(b, s.L), x(DORI.pAt(s, 0.8), s.L - 32)], ys = [y(a, 0), y(b, 0), y(DORI.pAt(s, 0.8), 300)];
    return [Math.round(Math.min(...xs)), Math.round(Math.min(...ys)), Math.round(Math.max(...xs)), Math.round(Math.max(...ys))]; };
  const SAY = { ranran: 'パンダが いっぱい！', fuku: 'いろいろ ある…！', toka: 'おちゃの におい…', rairai: 'ラーメンの におい…！', kuriya: 'あまい におい…！', kohaku: 'きらきら…！' };
  const bp = 392, bx = (L) => Math.round(600 - L * bp / K), by = (V) => Math.round(-60 + bp * (1 - V / K));
  // while a 外送 round is under way (JOBS.deliver) a shop tapped is a delivery (or the way back): no word of its own then
  return DORI.SHOPS.map((s) => Object.assign({ id: s.id, name: `${s.sign}（${s.name}）`, box: box(s), kind: 'do', go: DORI.door(s.id), pick: () => [JOBS.deliver.on() ? '' : SAY[s.id]], open: (y) => JOBS.deliver.at(y, s.id) }, s.id === 'kuriya' ? { fx: 'kuri', fxc: 'puff', ms: 2400 } : {}))
    .concat([{ id: 'board', name: '求人看板', box: [bx(106), by(64), bx(78), by(0)], kind: 'do', go: [-70, 34], back: 1, pose: 'look', say: 'アルバイト…？', open: () => WORK.board() },
      { id: 'hourai', name: 'ほうらい（中華料理店）', box: [Math.round(600 - 110 * DORI.END / K), Math.round(-60 + DORI.END * (1 - 200 / K)), Math.round(600 + 110 * DORI.END / K), Math.round(-60 + DORI.END)], kind: 'do', go: [0, DORI.FAR], back: 1, pose: 'look', say: 'おおきい おみせ…！' }]);
})();
