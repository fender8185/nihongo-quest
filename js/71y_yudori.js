'use strict';
// ---------- 湯けむり通り (2026-11-23, 湯の花温泉; docs/superpowers/specs/2026-11-23-onsen-work-design.md §3.2, §6) ----------
// The street from 湯の花駅前's square up to the 湯畑, seen down its length as 中華街大通り is (DORI: the same ground — the hero walks in
// up its middle and shrinks, the street's half width and his size as far from the horizon as he is; DOWN). Two-storey wooden houses
// either side, each its own — tiled roofs seen from above, a pent roof over each shop front, lattice and paper windows upstairs (lit
// warm by night), a railing with towels drying on it, lanterns, a wooden sign hung out over the pavement with its kanji and their
// readings. On the left ゆのはな堂 (温泉まんじゅう out of the steamers before its door, 9–21: TOWN.HOURS.yunohanado — 竹内's hours
// too; shut, its shutters drawn and a tap says when it opens), the 射的 (its prizes on red tiers under a red-and-white curtain: a go
// once a day, 300 円, state.oneADay.shateki) and a sake shop (its cedar ball); on the right 旅館「花月」's gate (stone lantern, long
// noren, a pine in a pot: through it into the inn, RYOKAN), a ゆかた屋's window and a 甘味処 (its red parasol, its bench). A gutter of hot water
// steaming along the left, stone lanterns, a cat asleep on a step, visitors in yukata and geta (PASSERS); at the far end the 湯畑's
// steam over its railing — lit in slowly changing colours by night — and the way on to it.
const YUDORI = (() => {
  const H = 430, Y0 = 12, FAR = 300, HALF0 = 110, K = H - Y0, END = 116;   // as 大通り's (DORI); END: where the houses end and the 湯畑's square opens (p, H − Y)
  const scale = (Y) => 0.5 * (H - Y) / K;
  const half = (Y) => HALF0 * (H - Y) / K;
  const top = (X) => Math.min(FAR, H - Math.abs(X) * K / HALF0);
  const clamp = ([X, Y]) => { const y = Math.max(Y0, Math.min(FAR, Y)), h = half(y); return [Math.max(-h, Math.min(h, X)), y]; };
  // the houses, three a side near to far, each over an equal stretch of the street in 1/(H − Y) (DORI's way): side, the stretch (Y),
  // L where the front stands, how tall (to its eaves), its sign — groups of [kanji or kana, their reading] — and what it is
  const SHOPS = [
    { id: 'yunohanado', side: -1, y0: 12, y1: 172, L: 136, tall: 250, sign: [['ゆのはな'], ['堂', 'どう']], name: 'ゆのはな堂（伴手禮店）' },
    { id: 'shateki', side: -1, y0: 172, y1: 244, L: 130, tall: 236, sign: [['射', 'しゃ'], ['的', 'てき']], name: '射的' },
    { id: 'sakaya', side: -1, y0: 244, y1: 284, L: 138, tall: 246, sign: [['酒', 'さけ']], name: '酒屋' },
    { id: 'kagetsu', side: 1, y0: 12, y1: 172, L: 146, tall: 262, sign: [['花', 'か'], ['月', 'げつ']], name: '旅館「花月」' },
    { id: 'yukataya', side: 1, y0: 172, y1: 244, L: 132, tall: 238, sign: [['浴衣', 'ゆかた']], name: 'ゆかた屋' },
    { id: 'kanmi', side: 1, y0: 244, y1: 280, L: 136, tall: 230, sign: [['甘', 'かん'], ['味', 'み']], name: '甘味処' }];
  const shop = (id) => SHOPS.find((s) => s.id === id);
  const pAt = (s, t) => 1 / (1 / (H - s.y0) + t * (1 / (H - s.y1) - 1 / (H - s.y0)));
  const door = (id) => { const s = shop(id), Y = H - pAt(s, 0.5); return [s.side * (half(Y) - 8), Y]; };
  // what stands out on the pavement, reaching in past the street's walkable edge (L 110): walked round, never through (2026-11-24,
  // the review; WALK_BLOCK.yudori) — [id, the shop it stands before, t along it, from L0 to L1 out from the middle, how deep (Y)], as
  // FORE draws them: ゆのはな堂's steamers and price board; 花月's 行灯, stone lantern and pine; 甘味処's bench under its parasol
  const PAVE = [['seiro', 'yunohanado', 0.32, 84, 128, 6], ['board', 'yunohanado', 0.16, 100, 124, 4], ['andon', 'kagetsu', 0.28, 97, 119, 5],
    ['ishidoro', 'kagetsu', 0.18, 102, 122, 5], ['matsu', 'kagetsu', 0.88, 105, 127, 4], ['kanmi', 'kanmi', 0.3, 92, 136, 4]];
  const BLOCKS = PAVE.map(([id, s, t, l0, l1, dy]) => { const S = shop(s), p = pAt(S, t), k = p / K, a = S.side * l0 * k, b = S.side * l1 * k;
    return { id, box: [Math.min(a, b), Math.max(a, b), H - p - dy, H - p + dy] }; });
  // the passers (PASSERS): up the street into the 湯畑's steam, or out of it toward the station; lost in the steam at the far end
  const passWay = (rnd) => { const x = rnd(-36, 36), up = [[x, -40], [rnd(-22, 22), FAR + 30]]; return Math.random() < 0.55 ? up : up.reverse(); };
  const passFade = (X, Y) => Math.max(0, Math.min(1, (FAR + 30 - Y) / 26));
  // ゆのはな堂 by its hours (TOWN.HOURS.yunohanado, 竹内's too) — and its 射的 and ゆかた屋 by theirs (2026-11-24, rulings 21, 26: the
  // 観光案内所's boards say the same): open, or when it opens next
  const isOpen = (id, h = TOWNEV.now()) => TOWNEV.isOpen(id, h), open = (h = TOWNEV.now()) => isOpen('yunohanado', h);
  const SHUT_NAME = { yunohanado: 'ゆのはな堂', shateki: '射的', yukataya: 'ゆかた屋' };
  function shutSay(id = 'yunohanado', h = TOWNEV.now()) {
    const [a, b] = (TOWN.HOURS || {})[id] || [9, 21], all = `${a}:00–${b}:00`, n = SHUT_NAME[id] || id;
    return h < a ? `${n} 準備中，${a}:00 開店（營業時間 ${all}）。` : `${n} 今天的營業結束了，明天 ${a}:00 開店（營業時間 ${all}）。`;
  }
  const hoursSay = (id) => { const [a, b] = (TOWN.HOURS || {})[id] || [9, 18]; return `${a}:00–${b}:00`; };
  const sig = () => ['yunohanado', 'shateki', 'yukataya'].map((id) => (isOpen(id) ? 'o' : '-')).join('');   // TOWNEV.sig: the street drawn anew as a shop opens or shuts

  // ---- the street, drawn: a point of it is P(side, p, L, V) as on 大通り — p how far from the horizon (H − Y), L how far out from the
  // middle and V how high, both as they measure at the front (Y0); the eye above the roofs, the sun from the left ----
  const f = (n) => n.toFixed(1);
  const P = (side, p, L, V) => [600 + side * L * p / K, -60 + p * (1 - V / K)];
  const poly = (pts, attrs) => `<path d="M${pts.map((q) => q.map(f).join(' ')).join(' L')} Z" ${attrs}/>`;
  const line = (a, b, attrs) => `<path d="M${a.map(f).join(' ')} L${b.map(f).join(' ')}" ${attrs}/>`;
  const along = (sd, a, b, L, v0, v1, attrs) => poly([P(sd, a, L, v0), P(sd, b, L, v0), P(sd, b, L, v1), P(sd, a, L, v1)], attrs);
  const facing = (sd, p, L0, L1, v0, v1, attrs) => poly([P(sd, p, L0, v0), P(sd, p, L1, v0), P(sd, p, L1, v1), P(sd, p, L0, v1)], attrs);
  const level = (sd, a, b, L0, L1, V, attrs) => poly([P(sd, a, L0, V), P(sd, b, L0, V), P(sd, b, L1, V), P(sd, a, L1, V)], attrs);
  const SHADE = (o) => `fill="#1a1030" fill-opacity="${o}"`;
  // [boards, posts and beams, plaster, roof tiles, noren]
  const LOOK = { yunohanado: ['#6e5236', '#4a3424', '#f1e8d6', '#4f5868', '#26407a'], shateki: ['#7a5a3a', '#4e3626', '#ece2cc', '#55606e', '#c8322a'],
    sakaya: ['#5a4232', '#3a2a1e', '#efe6d4', '#4a5262', '#2a3a6a'], kagetsu: ['#5e4430', '#3b2a1c', '#f3ebda', '#3f4858', '#26386a'],
    yukataya: ['#7a5a3c', '#523a28', '#efe4cf', '#5a6474', '#c8506a'], kanmi: ['#6e4e34', '#4a3424', '#f0e6d2', '#4c5666', '#4f7a4a'],
    near: ['#664a32', '#46321f', '#ece2cf', '#4c5666', '#2f4a7a'], far: ['#6a5040', '#4a3828', '#e8dcc6', '#56606e', '#2f4a7a'] };
  const D = 58;   // how deep a house is, front to back (its end wall, its gable)
  // a paper lantern hung at (x, y) on the screen, r its size: red with ribs, black caps, warm by night (lit: false, out — a shop shut)
  const lantern = (x, y, r, c = '#d0302a', k = 0, lit = true) => `<g class="fx-sway" style="animation-delay:-${(k * 0.53 % 3).toFixed(2)}s;animation-duration:${(3.4 + (k % 3) * 0.4).toFixed(1)}s">${lit ? `<circle class="glow" cx="${f(x)}" cy="${f(y + r * 1.3)}" r="${f(r * 3)}" fill="url(#glw)"/>` : ''}<path d="M${f(x)} ${f(y)} v${f(r * 0.3)}" stroke="#2b1c12" stroke-width="${f(Math.max(0.5, r * 0.12))}"/><ellipse cx="${f(x)}" cy="${f(y + r * 1.3)}" rx="${f(r)}" ry="${f(r * 1.05)}" ${hc(c, lit ? '#ff9a5a' : '#4a2a34')}/><path d="M${f(x - r)} ${f(y + r * 1.0)} q${f(r)} ${f(r * 0.25)} ${f(2 * r)} 0 M${f(x - r * 0.98)} ${f(y + r * 1.55)} q${f(r)} ${f(r * 0.25)} ${f(2 * r)} 0" fill="none" stroke="#5a1010" stroke-opacity=".4" stroke-width="${f(Math.max(0.4, r * 0.08))}"/><rect x="${f(x - r * 0.55)}" y="${f(y + r * 0.2)}" width="${f(r * 1.1)}" height="${f(r * 0.28)}" fill="#2b2b33"/><rect x="${f(x - r * 0.55)}" y="${f(y + r * 2.3)}" width="${f(r * 1.1)}" height="${f(r * 0.26)}" fill="#2b2b33"/></g>`;
  // a stone lantern (石灯籠) standing at (x, y) on the screen, its height h: foot, post, the fire box (lit by night), the roof, the jewel
  const stoneLantern = (x, y, h) => { const u = h / 60;
    return `<g>${groundShade(x, y + 1, 16 * u, 3 * u)}<path d="M${f(x - 9 * u)} ${f(y)} h${f(18 * u)} l-2 ${f(-5 * u)} h${f(-14 * u)} Z" ${hc('#a8a296', '#2c2c48')}/><rect x="${f(x - 3.6 * u)}" y="${f(y - 30 * u)}" width="${f(7.2 * u)}" height="${f(25 * u)}" ${hc('#b4aea2', '#30304c')}/><rect x="${f(x + 1.6 * u)}" y="${f(y - 30 * u)}" width="${f(2 * u)}" height="${f(25 * u)}" fill="#2b1c12" fill-opacity=".14"/>
      <path d="M${f(x - 8 * u)} ${f(y - 30 * u)} h${f(16 * u)} l-1.4 ${f(-3 * u)} h${f(-13.2 * u)} Z" ${hc('#a8a296', '#2c2c48')}/><rect x="${f(x - 6 * u)}" y="${f(y - 43 * u)}" width="${f(12 * u)}" height="${f(10 * u)}" ${hc('#b9b3a6', '#34345a')}/><rect x="${f(x - 3 * u)}" y="${f(y - 41 * u)}" width="${f(6 * u)}" height="${f(6 * u)}" ${hc('#5a5248', '#ffd98a')}/><circle class="glow" cx="${f(x)}" cy="${f(y - 38 * u)}" r="${f(16 * u)}" fill="url(#glw)"/>
      <path d="M${f(x - 12 * u)} ${f(y - 43 * u)} Q${f(x)} ${f(y - 52 * u)} ${f(x + 12 * u)} ${f(y - 43 * u)} Z" ${hc('#9a9488', '#28284a')}/><path d="M${f(x - 12 * u)} ${f(y - 43 * u)} q-1.5 0 -2 -2" fill="none" ${hs('#9a9488', '#28284a')} stroke-width="${f(1.4 * u)}"/><path d="M${f(x + 12 * u)} ${f(y - 43 * u)} q1.5 0 2 -2" fill="none" ${hs('#9a9488', '#28284a')} stroke-width="${f(1.4 * u)}"/><circle cx="${f(x)}" cy="${f(y - 52 * u)}" r="${f(2.6 * u)}" ${hc('#a8a296', '#2c2c48')}/></g>`; };

  // one house: its near end (plaster over a board skirt, a corner post, the beam between its floors, the gable under the roof's end),
  // its front (boards, posts, the beam), the shop's own ground floor (FRONT), the tiled pent roof over it with its shadow, upstairs
  // (UP: lattice windows lit by night, or a railing with towels on it), the roof from its eave up to the ridge (tile rows, courses, the
  // ridge's end tile), the left row in shade and the right in the sun, paler further off; its sign hung out over the pavement
  function block(b) {
    const sd = b.side, L = b.L, tall = b.tall, a = pAt(b, 0), z = pAt(b, 1), at = (t) => pAt(b, t);
    const [wood, post, plaster, roof] = LOOK[b.id] || LOOK[b.look];
    const fr = (t0, t1, v0, v1, attrs, l = L) => along(sd, at(t0), at(t1), l, v0, v1, attrs);
    const ridge = tall + 40, R = L + D / 2;
    let g = facing(sd, a, L, L + D, 0, tall, hc(plaster, '#24264a')) + facing(sd, a, L, L + D, 0, 94, hc(wood, '#1e1a30'))
      + `<path d="${[0.2, 0.4, 0.6, 0.8].map((u) => { const l = L + D * u; return `M${P(sd, a, l, 2).map(f).join(' ')} L${P(sd, a, l, 92).map(f).join(' ')}`; }).join(' ')}" ${hs(post, '#16122a')} stroke-width="${f(0.9 * a / K)}"/>`
      + facing(sd, a, L, L + D, 118, 128, hc(post, '#16122a')) + facing(sd, a, L, L + 6, 0, tall, hc(post, '#16122a'))
      + poly([P(sd, a, L - 18, tall), P(sd, a, R, ridge), P(sd, a, L + D + 18, tall)], hc(plaster, '#202244'))
      + poly([P(sd, a, L - 18, tall), P(sd, a, R, ridge), P(sd, a, R, ridge - 6), P(sd, a, L - 12, tall - 3)], hc(post, '#16122a'))
      + facing(sd, a, L, L + D, 0, tall, SHADE(0.2)) + facing(sd, a, L, L + D, 0, tall, 'fill="url(#ydEnd)"');
    g += fr(0, 1, 0, tall, hc(wood, '#2a2c48')) + fr(0, 1, 128, tall, hc(plaster, '#2a2c4c')) + fr(0, 1, 0, 7, hc('#a8a296', '#22243e'));   // boards below, plaster upstairs, a stone plinth
    g += [0, 0.5, 1].map((t) => fr(Math.max(0, t - 0.015), Math.min(1, t + 0.015), 0, tall, hc(post, '#16122a'))).join('') + fr(0, 1, 118, 128, hc(post, '#16122a'));   // posts, the beam
    g += (FRONT[b.id] || FRONT.house)(b, fr, at);
    // the pent roof: tiles from the wall out over the pavement, their rows, its edge, its shadow on the wall
    const pent = (t0, t1) => poly([P(sd, at(t0), L, 130), P(sd, at(t1), L, 130), P(sd, at(t1), L - 24, 112), P(sd, at(t0), L - 24, 112)], hc(roof, '#1c1e38'))
      + Array.from({ length: 12 }, (_, i) => { const p = at(t0 + (t1 - t0) * (i + 0.5) / 12); return line(P(sd, p, L, 130), P(sd, p, L - 24, 112), 'stroke="#000" stroke-opacity=".2" stroke-width=".7"'); }).join('')
      + line(P(sd, at(t0), L - 12, 121), P(sd, at(t1), L - 12, 121), 'stroke="#fff" stroke-opacity=".1" stroke-width=".8"')
      + along(sd, at(t0), at(t1), L - 24, 108, 112, hc('#2e3444', '#101128')) + fr(t0, t1, 96, 112, SHADE(0.22), L - 1);
    g += b.id === 'kagetsu' ? '' : pent(0, 1);
    g += (UP[b.id] || UP.house)(b, fr, at);
    g += fr(0, 1, 0, tall, 'fill="url(#ydFront)"') + (sd < 0 ? fr(0, 1, 0, tall, 'fill="#1a2040" fill-opacity=".2"') : fr(0, 1, 0, tall, 'fill="#ffcf80" fill-opacity=".07"'));
    // the roof: its tiles' rows down to the eave, the courses across, the eave's edge with some thickness, the ridge, its end tile
    const Rf = [P(sd, a, L - 18, tall), P(sd, z, L - 18, tall), P(sd, z, R, ridge), P(sd, a, R, ridge)];
    g += poly(Rf, hc(roof, '#1a2236'))
      + Array.from({ length: 14 }, (_, i) => { const p = at((i + 0.5) / 14); return line(P(sd, p, L - 18, tall), P(sd, p, R, ridge), 'stroke="#000" stroke-opacity=".2" stroke-width=".8"'); }).join('')
      + [0.33, 0.66].map((u) => line(P(sd, a, L - 18 + (R - L + 18) * u, tall + 40 * u), P(sd, z, L - 18 + (R - L + 18) * u, tall + 40 * u), 'stroke="#fff" stroke-opacity=".12" stroke-width=".8"')).join('')
      + along(sd, a, z, L - 18, tall - 5, tall, hc('#2e3444', '#101128')) + facing(sd, a, L - 18, L - 10, tall - 5, tall, hc('#262c3a', '#0e0f24'))
      + line(P(sd, a, R, ridge), P(sd, z, R, ridge), `stroke="#262c3a" stroke-width="${f(4 * a / K)}" stroke-linecap="round"`)
      + line(P(sd, a, R, ridge + 2), P(sd, z, R, ridge + 2), `stroke="#fff" stroke-opacity=".18" stroke-width="${f(1.2 * a / K)}"`)
      + (() => { const [x, y] = P(sd, a, R, ridge), r = 7 * a / K; return `<path d="M${f(x - r)} ${f(y + r * 0.4)} Q${f(x)} ${f(y - r * 1.6)} ${f(x + r)} ${f(y + r * 0.4)} Z" fill="#262c3a"/>`; })();
    g += FORE[b.id] ? FORE[b.id](b, at) : '';   // what stands out on the pavement before it
    // further off, paler: the air between (the steam's haze up the street)
    const o = Math.max(0, 0.46 * (1 - a / 330)) * (b.y0 < 0 ? 0 : 1);
    if (o > 0.01) { const h = hc('#eef0f2', '#1c1e3a') + ` fill-opacity="${o.toFixed(3)}"`;
      g += facing(sd, a, L, L + D, 0, tall, h) + fr(0, 1, 0, tall, h) + poly(Rf, h) + poly([P(sd, a, L - 18, tall), P(sd, a, R, ridge), P(sd, a, L + D + 18, tall)], h); }
    return g + (b.sign ? sign(b) : '');
  }
  // its sign hung out from the wall over the pavement, flat to the eye: a dark board, a lighter rim, the characters down it and their
  // readings small beside each (ruby, read down) — the further shops' higher up so that none hides another
  function sign(b) {
    const sd = b.side, L = b.L, ps = pAt(b, 0.78), k = ps / K, n = b.sign.reduce((m, [t]) => m + [...t].length, 0);
    const fs = Math.min(21, 108 / (n + 0.7)), rs = fs * 0.4, top = b.tall - 14 + 18 * (b.y0 > 150) + 26 * (b.y0 > 220), len = fs * (n + 0.7);
    const w = fs + rs + 9, x0 = 600 + sd * (L - 3) * k, x1 = 600 + sd * (L - 3 - w) * k, xl = Math.min(x0, x1), y0 = -60 + ps * (1 - top / K), bw = Math.abs(x1 - x0), bh = len * k;
    let txt = '', i = 0;
    b.sign.forEach(([t, r]) => { const cs = [...t], y = y0 + (0.35 * fs + i * fs) * k;
      cs.forEach((c, j) => { txt += `<text x="${f(xl + (4 + fs / 2) * k)}" y="${f(y + (j + 0.86) * fs * k)}" text-anchor="middle" font-size="${f(fs * k)}" font-weight="700" ${hc('#f6ead0', '#ffe9b0')} ${SERIF}>${c}</text>`; });
      if (r) { const rk = [...r], span = cs.length * fs, step = Math.min(rs * 1.05, span / rk.length);
        rk.forEach((c, j) => { txt += `<text x="${f(xl + (6 + fs + rs / 2) * k)}" y="${f(y + ((span - step * rk.length) / 2 + (j + 0.86) * step) * k)}" text-anchor="middle" font-size="${f(rs * k)}" ${hc('#e8d8b0', '#e8d8b0')} font-family="system-ui, sans-serif">${c}</text>`; }); }
      i += cs.length; });
    return `<path d="M${f(600 + sd * L * k)} ${f(y0 + 4 * k)} H${f(x0)}" stroke="#2b1c12" stroke-width="${f(2 * k)}"/><g class="yd-sign" data-sign="${b.id}">`
      + `<rect x="${f(xl + sd * 2.2 * k)}" y="${f(y0 + 2.2 * k)}" width="${f(bw)}" height="${f(bh)}" rx="${f(1.6 * k)}" fill="#1e140c" fill-opacity=".55"/>`
      + `<rect x="${f(xl)}" y="${f(y0)}" width="${f(bw)}" height="${f(bh)}" rx="${f(1.6 * k)}" ${hc('#4a3424', '#241a26')} stroke="#a8804e" stroke-width="${f(1.2 * k)}"/>`
      + `<path d="M${f(xl + 2 * k)} ${f(y0 + 3 * k)} V${f(y0 + bh - 3 * k)}" stroke="#fff" stroke-opacity=".12" stroke-width="${f(1 * k)}"/>${txt}</g>`
      + (b.id === 'shateki' && !isOpen('shateki') ? shutCard(xl, y0, bw, bh, k) : '');
  }
  // 射的 shut (ruling 21; 2026-11-24, fix round 2: plain from the street at a glance, by day and by night — its stall is under its eave):
  // a paper card hung under its sign on two strings, 準備中 down it in red
  function shutCard(xl, y0, bw, bh, k) {
    const fc = Math.round(17 * k * 100) / 100, cw = fc + 8 * k, ch = fc * 3 + 7 * k, cx = xl + bw / 2, cy = y0 + bh + 5 * k;
    return `<g data-shut="shateki-card"><path d="M${f(cx - cw * 0.3)} ${f(y0 + bh)} V${f(cy)} M${f(cx + cw * 0.3)} ${f(y0 + bh)} V${f(cy)}" stroke="#2b1c12" stroke-width="${f(0.8 * k)}"/>`
      + `<rect x="${f(cx - cw / 2)}" y="${f(cy)}" width="${f(cw)}" height="${f(ch)}" rx="${f(1.2 * k)}" ${hc('#f6eedb', '#d8caa8')} stroke="#9a3a2c" stroke-width="${f(1.1 * k)}"/>`
      + `${vText(f(cx), cy + 2.4 * k, '準備中', fc, `font-weight="800" ${hc('#a8281e', '#7a2418')} ${SERIF}`)}</g>`;
  }
  // ---- the shops' fronts, the ground floor (V 0–112, under the pent roof): FRONT, on the wall; FORE, what stands out on the pavement
  // before it (drawn over the pent roof and the wall's light and shade) ----
  const goods = (fr, t0, t1, v, cs, l) => Array.from({ length: 6 }, (_, i) => fr(t0 + (t1 - t0) * (i + 0.15) / 6, t0 + (t1 - t0) * (i + 0.8) / 6, v, v + 9 + (i % 2) * 3, hc(cs[i % cs.length], '#3a2a3a'), l)).join('');   // boxes on a shelf, l in from the street
  const sway = (i, body) => `<g class="fx-sway" style="animation-duration:${(3.6 + (i % 3) * 0.35).toFixed(2)}s;animation-delay:-${(i * 0.7).toFixed(1)}s">${body}</g>`;
  // a lantern hung from the pent roof's edge at t along a block
  const hung = (b, at, t, c, i, on = true, off = '#9a5a50') => { const [x, y] = P(b.side, at(t), b.L - 22, 108); return lantern(x, y, 8 * at(t) / K, on ? c : off, i, on); };   // off: its paper unlit
  const FRONT = {
    // a plain house: its lattice front, a sliding door
    house: (b, fr) => fr(0.08, 0.92, 7, 100, hc('#4a3424', '#16122a')) + fr(0.1, 0.9, 9, 98, hc('#d8c8a6', '#2a2440'))
      + Array.from({ length: 22 }, (_, i) => fr(0.1 + 0.8 * i / 22, 0.1 + 0.8 * i / 22 + 0.012, 9, 98, hc('#5a3e2a', '#1e1830'))).join(''),
    // ゆのはな堂: open — its boxes of まんじゅう on shelves inside, the indigo noren with ♨ on it; shut — its shutters drawn, 準備中
    yunohanado: (b, fr, at) => {
      const sd = b.side, on = open();
      let g = fr(0.06, 0.94, 7, 104, hc('#3e2c22', '#14142a')) + fr(0.06, 0.94, 40, 100, 'fill="#ffb060" fill-opacity=".1"');
      if (on) {
        g += [26, 52, 78].map((v) => fr(0.1, 0.9, v, v + 2.4, hc('#a8743f', '#2a2234'), b.L + 14)).join('') + goods(fr, 0.1, 0.9, 28.4, ['#f2e2c0', '#d0574b', '#e8c070'], b.L + 13)
          + goods(fr, 0.12, 0.88, 54.4, ['#5a78c8', '#f4efe4', '#c8322a'], b.L + 13) + goods(fr, 0.1, 0.9, 80.4, ['#e8c070', '#3f9a8c', '#f2e2c0'], b.L + 13);
        g += [0, 1, 2, 3].map((i) => { const t0 = 0.08 + i * 0.21, t1 = t0 + 0.19; return sway(i, `${fr(t0, t1, 70, 104, hc('#26407a', '#1c2a5a'), b.L - 1)}${fr(t0, t1, 101, 104, 'fill="#fff" fill-opacity=".14"', b.L - 1)}`); }).join('')
          + (() => { const [cx, cy] = P(sd, at(0.5), b.L - 1.5, 86), r = 6 * at(0.5) / K; return `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r)}" fill="none" stroke="#f4efe4" stroke-width="${f(r * 0.3)}"/><path d="M${f(cx - r * 0.45)} ${f(cy - r * 0.1)} q${f(-r * 0.2)} ${f(-r * 0.3)} 0 ${f(-r * 0.6)} M${f(cx)} ${f(cy - r * 0.1)} q${f(-r * 0.2)} ${f(-r * 0.3)} 0 ${f(-r * 0.6)} M${f(cx + r * 0.45)} ${f(cy - r * 0.1)} q${f(-r * 0.2)} ${f(-r * 0.3)} 0 ${f(-r * 0.6)}" fill="none" stroke="#f4efe4" stroke-width="${f(r * 0.22)}"/>`; })();
      } else {
        g += fr(0.06, 0.94, 7, 104, hc('#8a6a48', '#2a2238')) + Array.from({ length: 16 }, (_, i) => fr(0.06 + 0.88 * i / 16, 0.06 + 0.88 * i / 16 + 0.008, 7, 104, hc('#6e5236', '#1e1830'))).join('')
          + (() => { const [cx, cy] = P(sd, at(0.5), b.L - 1, 66), q = at(0.5) / K; return `<rect x="${f(cx - 7 * q)}" y="${f(cy)}" width="${f(14 * q)}" height="${f(22 * q)}" rx="${f(q)}" ${hc('#e8cf9a', '#6a5a52')}/>${vText(f(cx), cy + 1.6 * q, '準備中', 5.6 * q, `font-weight="800" fill="#3b2a1c" ${SERIF}`)}`; })();
      }
      return g;
    },
    // 射的: open — red tiers of prizes inside under a lamp (caramel boxes, little kokeshi, daruma, the big bear on top), the red-and-white
    // curtain along the opening, the counter with its cork guns; shut (TOWN.HOURS.shateki, 2026-11-24, ruling 21) — a canvas sheet let
    // down over the stall from the curtain to the counter, hiding the prize shelf, a rope across it; a 準備中 plate hung on the counter's
    // front (seen from above the street, the stall is under its eave: what shows is the counter and the lanterns); no guns
    shateki: (b, fr, at) => {
      const sd = b.side, k = at(0.5) / K, back = b.L + 22, on = isOpen('shateki');
      let g = fr(0.05, 0.95, 7, 104, hc('#2e1e18', '#120e22')) + (on ? fr(0.05, 0.95, 20, 96, 'fill="#ffd08a" fill-opacity=".16"') : '');
      if (on) {
        [[26, 36], [44, 54], [62, 72]].forEach(([v0, v1], r) => { g += fr(0.12, 0.9, v0, v1, hc('#b8262e', '#3a1a28'), back - r * 4) + fr(0.12, 0.9, v1 - 1.2, v1, 'fill="#fff" fill-opacity=".2"', back - r * 4);
          g += Array.from({ length: 6 }, (_, i) => { const t = 0.15 + i * 0.125; return fr(t, t + 0.05, v1, v1 + 6 + ((i + r) % 3) * 2, hc(['#f6e08a', '#e86a8a', '#5a8ac8', '#f2f0ea', '#e8a060', '#8ab86e'][(i + r * 2) % 6], '#4a3a4a'), back - r * 4 - 1); }).join(''); });
        g += (() => { const [x, y] = P(sd, at(0.52), back - 10, 80), r = 7 * k; return `<circle cx="${f(x)}" cy="${f(y - r * 1.1)}" r="${f(r * 1.25)}" ${hc('#c8955f', '#4a3a40')}/><circle cx="${f(x - r * 0.95)}" cy="${f(y - r * 2.1)}" r="${f(r * 0.45)}" ${hc('#c8955f', '#4a3a40')}/><circle cx="${f(x + r * 0.95)}" cy="${f(y - r * 2.1)}" r="${f(r * 0.45)}" ${hc('#c8955f', '#4a3a40')}/><circle cx="${f(x)}" cy="${f(y - r * 1.2)}" r="${f(r * 0.38)}" fill="#f0d6b0"/>`; })();
      } else {
        g += `<g data-shut="shateki">${fr(0.06, 0.94, 26, 88, hc('#e2d6ba', '#3a3650'), b.L - 0.5)}${Array.from({ length: 9 }, (_, i) => fr(0.06 + 0.88 * (i + 0.5) / 9, 0.06 + 0.88 * (i + 0.5) / 9 + 0.008, 26, 88, hc('#c4b593', '#2c2942'), b.L - 0.5)).join('')}${fr(0.06, 0.94, 56, 58.4, hc('#8a5a34', '#2a2030'), b.L - 0.6)}`
          + '</g>';
      }
      g += Array.from({ length: 14 }, (_, i) => fr(0.05 + 0.9 * i / 14, 0.05 + 0.9 * (i + 1) / 14, 88, 104, i % 2 ? hc('#f6f2ea', '#4a4a6a') : hc('#c8322a', '#4a1e2a'), b.L - 1)).join('')
        + fr(0.05, 0.95, 86, 88, 'fill="#2b1c12" fill-opacity=".3"', b.L - 1);
      return g + fr(0.08, 0.92, 7, 26, hc('#8a5a34', '#2a2030'), b.L - 10) + level(sd, at(0.08), at(0.92), b.L - 10, b.L + 2, 26, hc('#b07a48', '#3a2a3a'))
        + (on ? '' : (() => { const [cx, cy] = P(sd, at(0.5), b.L - 10.6, 24.5), q = at(0.5) / K; return `<g data-shut="shateki-plate"><rect x="${f(cx - 5.5 * q)}" y="${f(cy)}" width="${f(11 * q)}" height="${f(17 * q)}" rx="${f(q)}" ${hc('#e8cf9a', '#6a5a52')} stroke="#5a3e2a" stroke-width="${f(0.7 * q)}"/>${vText(f(cx), cy + 1.3 * q, '準備中', 4.6 * q, `font-weight="800" fill="#3b2a1c" ${SERIF}`)}</g>`; })())
        + (on ? [0.3, 0.62].map((t) => { const [x, y] = P(sd, at(t), b.L - 6, 26.5), r = at(t) / K; return `<path d="M${f(x - 10 * r)} ${f(y)} l${f(16 * r)} ${f(-3 * r)}" stroke="#3b2a1c" stroke-width="${f(2.2 * r)}" stroke-linecap="round"/><path d="M${f(x + 5 * r)} ${f(y - 2 * r)} l${f(3 * r)} ${f(-0.6 * r)}" stroke="#8a8a92" stroke-width="${f(2.6 * r)}"/>`; }).join('') : '');
    },
    // the sake shop: its lattice, the indigo noren with 酒 on it
    sakaya: (b, fr, at) => {
      const k = at(0.5) / K, [nx, ny] = P(b.side, at(0.51), b.L - 1.5, 82);
      return FRONT.house(b, fr, at) + fr(0.36, 0.66, 7, 100, hc('#2e2018', '#120e22')) + [0, 1].map((i) => sway(i, fr(0.36 + i * 0.15, 0.5 + i * 0.15, 52, 100, hc('#2a3a6a', '#16203e'), b.L - 1))).join('')
        + `<text x="${f(nx)}" y="${f(ny)}" text-anchor="middle" font-size="${f(16 * k)}" font-weight="700" ${hc('#f4efe4', '#d8d0e8')} ${SERIF}>酒</text>`;
    },
    // 旅館「花月」: the inn's own front behind its gate, latticed, lit inside
    kagetsu: (b, fr) => fr(0, 1, 7, 118, hc('#e9dfc8', '#2a2c4c')) + fr(0.08, 0.92, 10, 112, hc('#ead9b8', '#ffd98a')) + fr(0.08, 0.92, 10, 112, 'class="lit" style="opacity:calc(.06 + .5 * (1 - var(--day)))"')
      + Array.from({ length: 10 }, (_, i) => fr(0.08 + 0.84 * i / 10, 0.08 + 0.84 * i / 10 + 0.008, 10, 112, hc('#6e5236', '#24203a'))).join('') + fr(0.08, 0.92, 60, 62, hc('#6e5236', '#24203a')),
    // ゆかた屋: open — its window of yukata on their stands, a pink noren at the door; shut (TOWN.HOURS.yukataya, 2026-11-24, ruling 26)
    // — its window dark, the noren taken in, the door's lattice drawn to
    yukataya: (b, fr, at) => {
      const sd = b.side, on = isOpen('yukataya');
      let g = fr(0.06, 0.62, 18, 104, hc('#4a3424', '#1e1830')) + fr(0.08, 0.6, 20, 102, hc('#e6eef0', '#ffd98a')) + (on ? fr(0.08, 0.6, 20, 102, 'class="lit" style="opacity:calc(.05 + .5 * (1 - var(--day)))"') : '');
      g += [['#26407a', 0.14], ['#e58fa8', 0.29], ['#f2f0ea', 0.44]].map(([c, t]) => { const p = at(t), q = p / K, [x, y] = P(sd, p, b.L + 4, 36);
        return `<path d="M${f(x - 7 * q)} ${f(y)} l${f(1.4 * q)} ${f(-44 * q)} l${f(-6 * q)} ${f(4 * q)} l${f(-1 * q)} ${f(-6 * q)} l${f(8 * q)} ${f(-6 * q)} h${f(11 * q)} l${f(8 * q)} ${f(6 * q)} l${f(-1 * q)} ${f(6 * q)} l${f(-6 * q)} ${f(-4 * q)} l${f(1.4 * q)} ${f(44 * q)} Z" ${hc(c, '#4a4a6a')}/><path d="M${f(x - 5 * q)} ${f(y - 26 * q)} h${f(14 * q)}" stroke="#d9b04a" stroke-width="${f(3 * q)}"/><path d="M${f(x - 2 * q)} ${f(y - 50 * q)} l${f(4 * q)} ${f(8 * q)} l${f(4 * q)} ${f(-8 * q)}" fill="none" stroke="#fff" stroke-opacity=".6" stroke-width="${f(1 * q)}"/>${[[-2, -38], [4, -30], [-1, -14], [5, -8]].map(([dx, dy]) => `<circle cx="${f(x + dx * q)}" cy="${f(y + dy * q)}" r="${f(1.3 * q)}" fill="#fff" fill-opacity=".55"/>`).join('')}`; }).join('');
      g += fr(0.08, 0.6, 20, 102, 'fill="#fff" fill-opacity=".1"') + fr(0.66, 0.92, 7, 100, hc('#2e2018', '#120e22'));
      if (!on) return g + `<g data-shut="yukataya">${fr(0.08, 0.6, 20, 102, 'fill="#14142a" fill-opacity=".78"')}${fr(0.66, 0.92, 7, 100, hc('#8a6a48', '#2a2238'))}`
        + Array.from({ length: 9 }, (_, k) => fr(0.67 + 0.24 * k / 9, 0.67 + 0.24 * k / 9 + 0.006, 7, 100, hc('#5a3e2a', '#1e1830'))).join('') + fr(0.66, 0.92, 52, 54, hc('#5a3e2a', '#1e1830')) + '</g>';
      return g + [0, 1].map((i) => sway(i, fr(0.67 + i * 0.125, 0.79 + i * 0.125, 66, 100, hc('#c8506a', '#4a2a40'), b.L - 1))).join('');
    },
    // 甘味処: its lattice, a green noren at the door
    kanmi: (b, fr, at) => FRONT.house(b, fr, at) + fr(0.5, 0.86, 7, 100, hc('#2e2018', '#120e22')) + [0, 1].map((i) => sway(i, fr(0.5 + i * 0.18, 0.67 + i * 0.18, 66, 100, hc('#4f7a4a', '#1e3030'), b.L - 1))).join('')
  };
  const FORE = {
    // ゆのはな堂: its two red lanterns; the steamers on their table, steaming (covered when shut); a little board with the price
    // standing on the pavement (to be read: まんじゅう 120円)
    yunohanado: (b, at) => {
      const sd = b.side, on = open(), [x, y] = P(sd, at(0.32), b.L - 30, 30), k = at(0.32) / K;
      const tier = (by, c) => `<path d="M${f(x - 17 * k)} ${f(by)} V${f(by - 8 * k)} Q${f(x)} ${f(by - 11 * k)} ${f(x + 17 * k)} ${f(by - 8 * k)} V${f(by)} Q${f(x)} ${f(by + 3.4 * k)} ${f(x - 17 * k)} ${f(by)} Z" ${hc(c, '#3a3048')}/>`
        + `<path d="M${f(x - 17 * k)} ${f(by - 4 * k)} Q${f(x)} ${f(by - 1 * k)} ${f(x + 17 * k)} ${f(by - 4 * k)}" fill="none" ${hs('#a8804e', '#2a2238')} stroke-width="${f(1.1 * k)}"/><path d="M${f(x + 9 * k)} ${f(by - 9.6 * k)} V${f(by + 1.6 * k)}" stroke="#fff" stroke-opacity=".25" stroke-width="${f(2 * k)}"/>`;
      const st = `<g data-fx="seiro">${groundShade(x, y + 30 * k, 26 * k, 4 * k)}<rect x="${f(x - 22 * k)}" y="${f(y)}" width="${f(44 * k)}" height="${f(4 * k)}" ${hc('#8a6a48', '#2a2238')}/><path d="M${f(x - 19 * k)} ${f(y + 4 * k)} v${f(26 * k)} M${f(x + 19 * k)} ${f(y + 4 * k)} v${f(26 * k)}" ${hs('#5a3e2a', '#1e1830')} stroke-width="${f(2.6 * k)}"/>
        ${[0, 1, 2].map((i) => tier(y - i * 9 * k, i % 2 ? '#d9b98a' : '#cfae7c')).join('')}
        <path d="M${f(x - 17.6 * k)} ${f(y - 26 * k)} Q${f(x)} ${f(y - 40 * k)} ${f(x + 17.6 * k)} ${f(y - 26 * k)} Q${f(x)} ${f(y - 22 * k)} ${f(x - 17.6 * k)} ${f(y - 26 * k)} Z" ${hc('#c9a06a', '#3a3048')}/><path d="M${f(x - 8 * k)} ${f(y - 33 * k)} q${f(8 * k)} ${f(-3 * k)} ${f(16 * k)} 0" fill="none" stroke="#fff" stroke-opacity=".3" stroke-width="${f(1.2 * k)}"/><rect x="${f(x - 3 * k)}" y="${f(y - 37 * k)}" width="${f(6 * k)}" height="${f(3.4 * k)}" rx="${f(k)}" ${hc('#8a6a48', '#2a2238')}/>
        ${on ? ONSEN.steam([[x - 8 * k, y - 42 * k, 13 * k, 0], [x + 6 * k, y - 46 * k, 15 * k, 1.7], [x - 2 * k, y - 54 * k, 17 * k, 3.5]], 'yd-small') : `<path d="M${f(x - 18 * k)} ${f(y - 26 * k)} q${f(18 * k)} ${f(-12 * k)} ${f(36 * k)} 0 v${f(8 * k)} h${f(-36 * k)} Z" ${hc('#e9e2d0', '#4a4c6a')}/>`}</g>`;
      const [bx, by] = P(sd, at(0.16), b.L - 24, 0), q = at(0.16) / K;
      const board = on ? `<g>${groundShade(bx, by + 1, 14 * q, 2.4 * q)}<path d="M${f(bx - 10 * q)} ${f(by)} L${f(bx - 7 * q)} ${f(by - 44 * q)} M${f(bx + 10 * q)} ${f(by)} L${f(bx + 7 * q)} ${f(by - 44 * q)}" ${hs('#5a3e2a', '#1e1830')} stroke-width="${f(2 * q)}"/><rect x="${f(bx - 12 * q)}" y="${f(by - 50 * q)}" width="${f(24 * q)}" height="${f(36 * q)}" rx="${f(1.4 * q)}" ${hc('#2f4a3a', '#1a2a2a')} stroke="#8a6a48" stroke-width="${f(1.6 * q)}"/>
        ${vText(f(bx + 4 * q), by - 48 * q, 'まんじゅう', 5.4 * q, `font-weight="700" ${hc('#f6f2ea', '#e8e4d8')} font-family="'Hiragino Maru Gothic ProN', 'Zen Maru Gothic', sans-serif"`)}${vText(f(bx - 4.6 * q), by - 47 * q, '120円', 5 * q, `font-weight="800" ${hc('#f6e08a', '#f6e08a')} font-family="system-ui, sans-serif"`)}</g>` : '';
      return hung(b, at, 0.1, '#d0302a', 0, on) + hung(b, at, 0.9, '#d0302a', 1, on) + board + st;
    },
    // 射的: a red lantern either end; its ポン seen from the street (the shot's moment)
    shateki: (b, at) => { const [px, py] = P(b.side, at(0.5), b.L - 16, 70), k = at(0.5) / K, on = isOpen('shateki');
      return hung(b, at, 0.08, '#d0302a', 2, on) + hung(b, at, 0.92, '#f2e2c0', 3, on, '#b5a78c') + `<g data-fx="shateki"><text class="yd-pon" x="${f(px)}" y="${f(py)}" text-anchor="middle" font-size="${f(15 * k)}" font-weight="800" fill="#c8322a" stroke="#fff6e8" stroke-width="${f(2.6 * k)}" paint-order="stroke" font-family="'Hiragino Maru Gothic ProN', 'Zen Maru Gothic', sans-serif">ポン！</text></g>`; },
    // the sake shop: the cedar ball under the eaves, two barrels by the door
    sakaya: (b, at) => {
      const sd = b.side, k = at(0.2) / K, [sx, sy] = P(sd, at(0.2), b.L - 18, 108), r = 9 * k;
      return `<path d="M${f(sx)} ${f(sy - r * 1.4)} v${f(r * 0.6)}" stroke="#2b1c12" stroke-width="${f(0.8 * k)}"/><circle cx="${f(sx)}" cy="${f(sy)}" r="${f(r)}" ${hc('#7a8a4a', '#2a3434')}/><circle cx="${f(sx - r * 0.3)}" cy="${f(sy - r * 0.3)}" r="${f(r * 0.5)}" fill="#a8b870" fill-opacity=".5"/>`
        + [0.76, 0.88].map((t) => { const [bx, by] = P(sd, at(t), b.L - 12, 0), q = at(t) / K; return `<path d="M${f(bx - 9 * q)} ${f(by)} v${f(-18 * q)} q${f(9 * q)} ${f(-4 * q)} ${f(18 * q)} 0 v${f(18 * q)} Z" ${hc('#d9b98a', '#3a3048')}/><path d="M${f(bx - 9 * q)} ${f(by - 5 * q)} h${f(18 * q)} M${f(bx - 9 * q)} ${f(by - 13 * q)} h${f(18 * q)}" ${hs('#3b2a1c', '#14122a')} stroke-width="${f(1.4 * q)}"/><ellipse cx="${f(bx)}" cy="${f(by - 18 * q)}" rx="${f(9 * q)}" ry="${f(2.4 * q)}" ${hc('#c9a06a', '#3a3048')}/>`; }).join('');
    },
    // 旅館「花月」: its gate out at the pavement — two posts under a small tiled roof, the long indigo noren with 花月 on it, the
    // stepping stones in — a stone lantern, a pine in a pot, its 行灯 sign standing out, flat to the eye (旅館 small, 花月 big, lit inside
    // by night)
    kagetsu: (b, at) => {
      const sd = b.side, L = b.L, k = at(0.5) / K, g0 = 0.36, g1 = 0.72, gl = L - 22;
      let g = [0.42, 0.52, 0.62].map((t) => level(sd, at(t), at(t + 0.06), gl - 8, gl + 14, 0.5, hc('#b8b0a0', '#2c2c48'))).join('');
      g += [g0, g1].map((t) => along(sd, at(t), at(t + 0.03), gl, 0, 140, hc('#4a3424', '#1e1830'))).join('') + along(sd, at(g0), at(g1 + 0.03), gl, 128, 140, hc('#4a3424', '#1e1830'))
        + poly([P(sd, at(g0 - 0.06), gl - 12, 142), P(sd, at(g1 + 0.09), gl - 12, 142), P(sd, at(g1 + 0.09), gl + 16, 160), P(sd, at(g0 - 0.06), gl + 16, 160)], hc('#3f4858', '#1a2236'))
        + Array.from({ length: 8 }, (_, i) => { const p = at(g0 - 0.06 + (g1 + 0.15 - g0) * (i + 0.5) / 8); return line(P(sd, p, gl - 12, 142), P(sd, p, gl + 16, 160), 'stroke="#000" stroke-opacity=".2" stroke-width=".8"'); }).join('')
        + along(sd, at(g0 - 0.06), at(g1 + 0.09), gl - 12, 138, 142, hc('#262c3a', '#0e0f24'));
      g += [0, 1, 2].map((i) => { const t0 = g0 + 0.035 + i * 0.115, t1 = t0 + 0.108; return sway(i, `${along(sd, at(t0), at(t1), gl - 0.5, 36, 127, hc('#26386a', '#141e40'))}${along(sd, at(t0), at(t1), gl - 0.5, 124, 127, 'fill="#fff" fill-opacity=".12"')}`); }).join('');
      const [nx, ny] = P(sd, at(0.54), gl - 1, 100), q = at(0.54) / K;
      g += `<text x="${f(nx)}" y="${f(ny)}" text-anchor="middle" font-size="${f(17 * q)}" font-weight="700" ${hc('#f4efe4', '#d8d0e8')} ${SERIF}>花</text><text x="${f(nx)}" y="${f(ny + 19 * q)}" text-anchor="middle" font-size="${f(17 * q)}" font-weight="700" ${hc('#f4efe4', '#d8d0e8')} ${SERIF}>月</text>`;
      const [lx, ly] = P(sd, at(0.18), L - 34, 0); g += stoneLantern(lx, ly, 64 * at(0.18) / K);
      const [px, py] = P(sd, at(0.88), L - 30, 0), r = at(0.88) / K;
      g += `${groundShade(px, py + 1, 16 * r, 3 * r)}<path d="M${f(px - 11 * r)} ${f(py)} l${f(2 * r)} ${f(-12 * r)} h${f(18 * r)} l${f(2 * r)} ${f(12 * r)} Z" ${hc('#5a4a5a', '#24203a')}/><path d="M${f(px)} ${f(py - 12 * r)} q${f(-6 * r)} ${f(-14 * r)} ${f(4 * r)} ${f(-26 * r)}" fill="none" ${hs('#5a4030', '#1e1828')} stroke-width="${f(3 * r)}"/>`
        + [[-12, -26, 12], [8, -34, 11], [-4, -44, 9], [14, -22, 8]].map(([dx, dy, w]) => `<ellipse cx="${f(px + dx * r)}" cy="${f(py + dy * r)}" rx="${f(w * r)}" ry="${f(w * 0.45 * r)}" ${hc('#3f6a48', '#18283a')}/><ellipse cx="${f(px + dx * r - 2 * r)}" cy="${f(py + dy * r - 1.4 * r)}" rx="${f(w * 0.6 * r)}" ry="${f(w * 0.25 * r)}" fill="#8ab86e" fill-opacity=".35"/>`).join('');
      const [ax, ay] = P(sd, at(0.28), gl - 16, 0), u = at(0.28) / K;
      g += `<g data-fx="kagetsu">${groundShade(ax, ay + 1, 16 * u, 3 * u)}<path d="M${f(ax - 9 * u)} ${f(ay)} V${f(ay - 10 * u)} M${f(ax + 9 * u)} ${f(ay)} V${f(ay - 10 * u)}" ${hs('#3b2a1c', '#14122a')} stroke-width="${f(2.4 * u)}"/>
        <rect x="${f(ax - 11 * u)}" y="${f(ay - 62 * u)}" width="${f(22 * u)}" height="${f(52 * u)}" ${hc('#f2e8d2', '#ffe2a0')}/><rect x="${f(ax - 11 * u)}" y="${f(ay - 62 * u)}" width="${f(22 * u)}" height="${f(52 * u)}" fill="none" stroke="#3b2a1c" stroke-width="${f(2.2 * u)}"/>
        <circle class="glow" cx="${f(ax)}" cy="${f(ay - 36 * u)}" r="${f(40 * u)}" fill="url(#glw)"/><path d="M${f(ax - 13 * u)} ${f(ay - 64 * u)} h${f(26 * u)} l${f(-2 * u)} ${f(-4 * u)} h${f(-22 * u)} Z" fill="#3b2a1c"/>
        ${vText(f(ax + 6 * u), ay - 58 * u, '旅館', 5.6 * u, `fill="#3b2a1c" ${SERIF}`)}${vText(f(ax - 2.4 * u), ay - 57 * u, '花月', 15 * u, `font-weight="800" fill="#26386a" ${SERIF}`)}</g>`;
      return g + lightPool(...P(sd, at(0.54), gl - 10, 0), 30 * k);
    },
    // ゆかた屋: a lantern by its door
    yukataya: (b, at) => hung(b, at, 0.94, '#f2e2c0', 4, isOpen('yukataya'), '#b5a78c'),   // out when shut (ruling 26)
    // 甘味処: a red parasol over a bench under red cloth, out front
    kanmi: (b, at) => {
      const sd = b.side, k = at(0.3) / K, [bx, by] = P(sd, at(0.3), b.L - 22, 0);
      return `${groundShade(bx, by + 1, 26 * k, 4 * k)}<rect x="${f(bx - 22 * k)}" y="${f(by - 16 * k)}" width="${f(44 * k)}" height="${f(5 * k)}" ${hc('#c8322a', '#4a1e2a')}/><path d="M${f(bx - 18 * k)} ${f(by - 11 * k)} v${f(11 * k)} M${f(bx + 18 * k)} ${f(by - 11 * k)} v${f(11 * k)}" ${hs('#6e5236', '#24203a')} stroke-width="${f(2.4 * k)}"/>`
        + `<path d="M${f(bx + 2 * k)} ${f(by)} V${f(by - 70 * k)}" ${hs('#8a6a48', '#2a2238')} stroke-width="${f(1.6 * k)}"/><path d="M${f(bx - 34 * k)} ${f(by - 62 * k)} Q${f(bx + 2 * k)} ${f(by - 86 * k)} ${f(bx + 38 * k)} ${f(by - 62 * k)} Z" ${hc('#d0302a', '#4a1e2a')}/><path d="M${f(bx - 34 * k)} ${f(by - 62 * k)} Q${f(bx + 2 * k)} ${f(by - 70 * k)} ${f(bx + 38 * k)} ${f(by - 62 * k)}" fill="none" stroke="#8a1a1a" stroke-opacity=".4" stroke-width="${f(1.2 * k)}"/>${[-24, -12, 0, 12, 24].map((d) => `<path d="M${f(bx + 2 * k)} ${f(by - 80 * k)} L${f(bx + (2 + d * 1.4) * k)} ${f(by - 63 * k)}" stroke="#fff" stroke-opacity=".25" stroke-width="${f(0.8 * k)}"/>`).join('')}`
        + hung(b, at, 0.92, '#d0302a', 5);
    }
  };
  // upstairs: two lattice windows (lit by night), or a wooden railing out over the pent roof with towels hung on it
  const lattice = (fr, at, sd, L, t0, t1) => fr(t0 - 0.02, t1 + 0.02, 150, 222, hc('#5a3e2a', '#1e1830')) + fr(t0, t1, 156, 216, hc('#ead9b8', '#ffd98a')) + fr(t0, t1, 156, 216, 'class="lit" style="opacity:calc(.06 + .6 * (1 - var(--day)))"')
    + Array.from({ length: 9 }, (_, i) => { const p = at(t0 + (t1 - t0) * (i + 1) / 10); return line(P(sd, p, L, 156), P(sd, p, L, 216), 'stroke="#6a4a2a" stroke-width=".9"'); }).join('')
    + line(P(sd, at(t0), L, 186), P(sd, at(t1), L, 186), 'stroke="#6a4a2a" stroke-width=".8"') + fr(t0, t1, 156, 162, SHADE(0.2));
  const TOWEL = ['#f6f2ea', '#3f7ac8', '#d0574b', '#f6f2ea', '#8ab86e', '#e6a23c'];
  const railing = (fr, at, sd, L, t0, t1, n = 3) => fr(t0, t1, 150, 222, hc('#ead9b8', '#ffd98a')) + fr(t0, t1, 150, 222, 'class="lit" style="opacity:calc(.05 + .55 * (1 - var(--day)))"')
    + Array.from({ length: 6 }, (_, i) => fr(t0 + (t1 - t0) * i / 6, t0 + (t1 - t0) * i / 6 + 0.01, 150, 222, hc('#6e5236', '#24203a'))).join('')
    + level(sd, at(t0), at(t1), L, L - 12, 136, hc('#8a6a48', '#2a2238')) + Array.from({ length: 15 }, (_, i) => { const p = at(t0 + (t1 - t0) * i / 14); return line(P(sd, p, L - 12, 136), P(sd, p, L - 12, 160), `stroke="#5a3e2a" stroke-width="${f(1.4 * p / K)}"`); }).join('')
    + line(P(sd, at(t0), L - 12, 160), P(sd, at(t1), L - 12, 160), `stroke="#4a3424" stroke-width="${f(2.4 * at(t0) / K)}"`)
    + Array.from({ length: n }, (_, i) => { const t = t0 + (t1 - t0) * (i + 0.6) / (n + 0.4); return `<g class="fx-sway" style="animation-duration:${(3.2 + i * 0.5).toFixed(1)}s;animation-delay:-${(i * 1.1).toFixed(1)}s">${along(sd, at(t), at(t + (t1 - t0) * 0.16), L - 12.5, 140, 162, hc(TOWEL[i % TOWEL.length], '#4a4a6a'))}${along(sd, at(t), at(t + (t1 - t0) * 0.16), L - 12.5, 144, 146, `fill="${['#c8322a', '#f6f2ea', '#f6f2ea'][i % 3]}" fill-opacity=".7"`)}</g>`; }).join('');
  const UP = {
    house: (b, fr, at) => lattice(fr, at, b.side, b.L, 0.12, 0.42) + lattice(fr, at, b.side, b.L, 0.58, 0.88),
    yunohanado: (b, fr, at) => lattice(fr, at, b.side, b.L, 0.1, 0.4) + lattice(fr, at, b.side, b.L, 0.6, 0.9),
    shateki: (b, fr, at) => railing(fr, at, b.side, b.L, 0.08, 0.92, 4),
    sakaya: (b, fr, at) => lattice(fr, at, b.side, b.L, 0.16, 0.84),
    kagetsu: (b, fr, at) => railing(fr, at, b.side, b.L, 0.06, 0.94, 5) + fr(0.06, 0.94, 226, 236, hc('#5a3e2a', '#1e1830')),
    yukataya: (b, fr, at) => lattice(fr, at, b.side, b.L, 0.1, 0.9),
    kanmi: (b, fr, at) => railing(fr, at, b.side, b.L, 0.1, 0.9, 2)
  };
  // ---- behind, over the roofs: the far range (snow on its peaks in winter), the near
  // hills under cedars of all heights with the season's trees among them, mist along their foot (as 湯の花駅前's hills) ----
  const ridge = (pts, base) => { let d = `M${pts[0][0]} ${base} L${pts[0][0]} ${pts[0][1]}`; for (let i = 1; i < pts.length - 1; i++) { const [x, y] = pts[i], [nx, ny] = pts[i + 1]; d += ` Q${x} ${y} ${f((x + nx) / 2)} ${f((y + ny) / 2)}`; } const [lx, ly] = pts[pts.length - 1]; return `${d} L${lx} ${ly} L${lx} ${base} Z`; };
  const RANGE = [[-20, -52], [90, -80], [200, -64], [300, -102], [400, -74], [490, -92], [590, -116], [690, -86], [780, -106], [880, -72], [980, -94], [1090, -66], [1220, -78]];
  const HILL = [[-20, -26], [100, -46], [220, -36], [330, -58], [450, -42], [560, -64], [660, -50], [760, -62], [880, -40], [1000, -54], [1110, -36], [1220, -44]];
  function hills() {
    const m = (typeof sceneDate === 'function' ? sceneDate() : new Date()).getMonth() + 1, [c1, c2, c3] = typeof seasonLeaves === 'function' ? seasonLeaves(m) : ['#7fa86a', '#6f9a5c', '#8ab86e'], winter = m === 12 || m <= 2;
    const snow = winter ? RANGE.filter(([, y]) => y < -98).map(([x, y]) => `<path d="M${x - 22} ${y + 15} Q${x - 7} ${y - 1} ${x} ${y + 1} Q${x + 7} ${y - 1} ${x + 22} ${y + 15} q-8 -4 -11 2 q-6 -6 -10 0 q-6 -5 -9 -2 Z" ${hc('#f6f8fc', '#5a6090')}/>`).join('') : '';
    const lerp = (x) => { const i = Math.max(0, HILL.findIndex((q) => q[0] > x) - 1), [x0, y0] = HILL[i], [x1, y1] = HILL[i + 1] || HILL[i]; return y0 + (y1 - y0) * ((x - x0) / ((x1 - x0) || 1)); };
    let trees = '';
    for (let x = -10; x < 1215; x += 12) { const k = Math.floor(x / 12);
      [0, 1].forEach((r) => { const y = lerp(x) + 10 + r * 16 + ((k * 7 + r * 3) % 7), h = 18 + ((k * 5 + r * 11) % 14);
        trees += (k + r) % 6 === 3 ? `<circle cx="${x + 2}" cy="${y - 7}" r="5.6" ${ONSEN.leafLit([c1, c2, c3][(k + r) % 3], 0.3, 0.7)}/><circle cx="${x - 3}" cy="${y - 4}" r="4.2" ${ONSEN.leafLit([c2, c3, c1][(k + r) % 3], 0.28, 0.66)}/>`
          : `<path d="M${x} ${f(y - h)} L${f(x + h * 0.28)} ${f(y)} H${f(x - h * 0.28)} Z" ${(k + r) % 2 ? hc('#3f6a4c', '#0e1828') : hc('#4f7a58', '#121e34')}/><path d="M${x} ${f(y - h)} L${f(x + h * 0.28)} ${f(y)} H${x} Z" fill="#0e1a12" style="opacity:calc(.04 + .12 * var(--day))"/>`; }); }
    return `<path d="${ridge(RANGE, 150)}" ${hc('#a9b9cb', '#1d2346')}/>${snow}<rect x="-20" y="-60" width="1240" height="50" fill="#fff" style="opacity:calc(.14 * var(--day))"/>
      <path d="${ridge(HILL, 150)}" ${hc('#6f9478', '#16223c')}/>${trees}<rect x="-20" y="-14" width="1240" height="164" fill="#fff" style="opacity:calc(.14 * var(--day))"/>`;
  }
  // ---- the far end: the street opens onto the 湯畑's square — its stone railing across, the 湯畑 sunk beyond it (its wooden troughs
  // running away from us, crusted yellow-white with 湯の花, the green water glinting between), steam rising thick off it (lit by night
  // in colours slowly changing: YUBATAKE's light-up), the inns across it with their windows (lit by night), the way on (WAYS) ----
  const OPEN = 82;   // the far side of the 湯畑's square (p), where the inns stand
  function yubatakeEnd() {
    const R = (L, V, p) => P(1, p, L, V), E = END;
    const inns = [[-330, -170, 40], [-160, -50, 32], [-40, 70, 38], [80, 200, 30], [210, 340, 42]].map(([l0, l1, h], i) => { const p = OPEN - 12, [x0, y0] = R(l0, 0, p), [x1] = R(l1, 0, p), [, yt] = R(l0, h * 2.8, p), w = x1 - x0, ht = y0 - yt;
      return `<rect x="${f(x0)}" y="${f(yt)}" width="${f(w)}" height="${f(ht)}" ${hc(i % 2 ? '#e4d8c0' : '#ece2cc', '#262848')}/>${[0.18, 0.56].map((u) => `<rect x="${f(x0 + 2)}" y="${f(yt + ht * u)}" width="${f(w - 4)}" height="${f(ht * 0.26)}" ${hc('#c9b896', '#ffd98a')}/><rect x="${f(x0 + 2)}" y="${f(yt + ht * u)}" width="${f(w - 4)}" height="${f(ht * 0.26)}" class="lit" style="opacity:calc(.05 + .6 * (1 - var(--day)))"/>`).join('')}
        <path d="M${f(x0 - 3)} ${f(yt + 1)} L${f(x0 + 2)} ${f(yt - 6)} H${f(x1 - 2)} L${f(x1 + 3)} ${f(yt + 1)} Z" ${hc('#56606e', '#1a1c36')}/>`; }).join('');
    const sq = poly([P(-1, E, 300, 0), P(1, E, 300, 0), P(1, OPEN, 300, 0), P(-1, OPEN, 300, 0)], hc('#cfc6b4', '#282a46'));
    // the 湯畑: sunk below the square between the railing (p 100) and the inns' side (p OPEN + 4); troughs running away from us
    const p0 = 99, p1 = OPEN + 4, bed = poly([P(-1, p0, 220, 0), P(1, p0, 220, 0), P(1, p1, 220, 0), P(-1, p1, 220, 0)], hc('#6e6a5e', '#22223c'))
      + poly([P(-1, p0, 200, 0), P(1, p0, 200, 0), P(1, p1, 200, 0), P(-1, p1, 200, 0)], hc('#5fb0a2', '#1e4050') + ' fill-opacity=".55"');
    const troughs = Array.from({ length: 11 }, (_, i) => { const L = -200 + i * 40, sd = L < 0 ? -1 : 1, l = Math.abs(L);
      return poly([P(sd, p0, l - 5, 4), P(sd, p0, l + 5, 4), P(sd, p1, l + 5, 4), P(sd, p1, l - 5, 4)], hc('#8a6844', '#2a2238')) + line(P(sd, p0, l - 5, 4.4), P(sd, p1, l - 5, 4.4), hs('#efe4a6', '#6a6a52') + ' stroke-width=".9"'); }).join('');
    // the railing across the square's near side, and the posts' lamps
    const [rx0, ry] = R(-220, 0, 100), [rx1] = R(220, 0, 100), rk = 100 / K;
    const rail = Array.from({ length: 15 }, (_, i) => { const x = rx0 + (rx1 - rx0) * i / 14; return `<rect x="${f(x - 1.1)}" y="${f(ry - 20 * rk)}" width="2.2" height="${f(20 * rk)}" ${hc('#b9b3a6', '#34345a')}/>${i % 7 === 3 ? `<circle class="glow" cx="${f(x)}" cy="${f(ry - 24 * rk)}" r="10" fill="url(#glw)"/><rect x="${f(x - 1.4)}" y="${f(ry - 25 * rk)}" width="2.8" height="3" ${hc('#efe4c8', '#ffe2a0')}/>` : ''}`; }).join('')
      + `<rect x="${f(rx0)}" y="${f(ry - 15 * rk)}" width="${f(rx1 - rx0)}" height="${f(2.6 * rk)}" ${hc('#c9c2b4', '#3a3a58')}/><rect x="${f(rx0)}" y="${f(ry - 7 * rk)}" width="${f(rx1 - rx0)}" height="${f(2.4 * rk)}" ${hc('#c9c2b4', '#3a3a58')}/>`;
    const steam = YUBATAKE.steam([[572, 30, 18, 0], [600, 26, 22, 1.8], [628, 30, 18, 3.6], [588, 12, 24, 5.4], [616, 8, 26, 7.2], [560, 18, 18, 0.9], [642, 16, 20, 2.7], [600, -4, 28, 4.5], [580, -12, 24, 6.3], [622, -16, 26, 8.1]]);
    return `${inns}${sq}${bed}${troughs}${steam}${YUBATAKE.lights(600, 0, 90, 62)}${rail}`;
  }
  // the gutter along the left, hot water in a stone channel steaming (a puff now and then along it), flowing down toward the eye
  function gutter(near) {
    const sd = -1, lo = 113, hi = 125;
    let g = poly([P(sd, near, lo - 2, 0), P(sd, END + 30, lo - 2, 0), P(sd, END + 30, hi + 2, 0), P(sd, near, hi + 2, 0)], hc('#9a948a', '#24243e'))
      + poly([P(sd, near, lo, -3), P(sd, END + 30, lo, -3), P(sd, END + 30, hi, -3), P(sd, near, hi, -3)], hc('#7cc4bc', '#2a4a6e'))
      + `<path class="yd-flow" d="M${P(sd, near, (lo + hi) / 2, -3).map(f).join(' ')} L${P(sd, END + 30, (lo + hi) / 2, -3).map(f).join(' ')}" stroke="#fff" stroke-opacity=".55" stroke-width="1.6" stroke-dasharray="6 14"/>`;
    g += ONSEN.steam([400, 340, 280, 220, 170].map((p, i) => { const [x, y] = P(sd, p, (lo + hi) / 2, 0); return [x, y - 14 * p / K, 20 * p / K, i * 1.9]; }), 'yd-small');
    return `<g>${g}</g>`;
  }
  // a cat asleep on the step of ゆかた屋, curled, its tail round it; tapped: its ear and tail stir
  function cat() {
    const s = shop('yukataya'), p = pAt(s, 0.74), k = p / K, [x, y] = P(1, p, s.L - 10, 6);
    return `<g data-fx="neko"><rect x="${f(x - 20 * k)}" y="${f(y)}" width="${f(40 * k)}" height="${f(6 * k)}" ${hc('#a8a296', '#2c2c48')}/>${groundShade(x, y + 6 * k, 18 * k, 2 * k)}
      <ellipse cx="${f(x)}" cy="${f(y - 5 * k)}" rx="${f(12 * k)}" ry="${f(6 * k)}" ${hc('#e8a050', '#4a3a3a')}/><path class="yd-tail" d="M${f(x + 10 * k)} ${f(y - 2 * k)} q${f(6 * k)} ${f(4 * k)} ${f(-4 * k)} ${f(5 * k)}" fill="none" ${hs('#c8803a', '#3a2a30')} stroke-width="${f(2.6 * k)}"/>
      <circle cx="${f(x - 9 * k)}" cy="${f(y - 7 * k)}" r="${f(5 * k)}" ${hc('#e8a050', '#4a3a3a')}/><path class="yd-ear" d="M${f(x - 13 * k)} ${f(y - 10 * k)} l${f(1 * k)} ${f(-4.6 * k)} l${f(3 * k)} ${f(3.4 * k)} Z M${f(x - 7 * k)} ${f(y - 11 * k)} l${f(2 * k)} ${f(-4 * k)} l${f(2 * k)} ${f(4.4 * k)} Z" ${hc('#c8803a', '#3a2a30')}/>
      <path d="M${f(x - 11.4 * k)} ${f(y - 7 * k)} q${f(1.2 * k)} ${f(0.8 * k)} ${f(2.4 * k)} 0 M${f(x - 7.6 * k)} ${f(y - 7 * k)} q${f(1.2 * k)} ${f(0.8 * k)} ${f(2.4 * k)} 0" fill="none" stroke="#2b1c12" stroke-width="${f(0.7 * k)}"/><path d="M${f(x - 4 * k)} ${f(y - 8 * k)} q${f(3 * k)} ${f(-3 * k)} ${f(8 * k)} ${f(-1 * k)}" fill="none" stroke="#c8803a" stroke-width="${f(1.2 * k)}"/></g>`;
  }
  // the sign at the street's far end: 湯畑 and an arrow up, on a wooden post on the left
  function endSign() {
    const p = 132, k = p / K, [x, y] = P(-1, p, 122, 0), [, t] = P(-1, p, 122, 96);
    return `<path d="M${f(x)} ${f(y)} V${f(t)}" ${hs('#5a3e2a', '#1e1830')} stroke-width="${f(5 * k)}"/><rect x="${f(x - 14 * k)}" y="${f(t)}" width="${f(28 * k)}" height="${f(56 * k)}" rx="${f(1.4 * k)}" ${hc('#efe2c4', '#4a3c50')} stroke="#5a3e2a" stroke-width="${f(1.4 * k)}"/>
      ${vText(f(x - 2.4 * k), t + 3 * k, '湯畑', 15 * k, `font-weight="700" ${hc('#3b2a1c', '#e8dcb4')} ${SERIF}`)}${vText(f(x + 8.6 * k), t + 5 * k, 'ゆばたけ', 5 * k, `${hc('#6e5236', '#c9b896')} font-family="system-ui, sans-serif"`)}<path d="M${f(x)} ${f(t + 52 * k)} v${f(-14 * k)} M${f(x - 5 * k)} ${f(t + 43 * k)} l${f(5 * k)} ${f(-5 * k)} l${f(5 * k)} ${f(5 * k)}" fill="none" ${hs('#c8322a', '#ff9a8a')} stroke-width="${f(2 * k)}"/>`;
  }
  function html() {
    const near = 480, WALK = 110;
    // the ground: stone slabs, each row's joints staggered, paler toward the end; the pavements a kerb high, the left row's shadow
    const rows = [480, 430, 372, 324, 284, 250, 222, 198, 178, 160, 146, 134, 124, END];
    let ground = poly([P(-1, near, WALK, 0), P(1, near, WALK, 0), P(1, END, WALK, 0), P(-1, END, WALK, 0)], hc('#cfc6b4', '#282a46'));
    ground += rows.slice(0, -1).map((p0, i) => { const p1 = rows[i + 1], n = 4 + (i % 2), off = (i % 2) * 0.5;
      return Array.from({ length: n + 1 }, (_, j) => { const L = -WALK + (2 * WALK) * Math.min(1, Math.max(0, (j + off) / n)); return j + off > 0 && j + off < n ? line(P(1, p0, L, 0), P(1, p1, L, 0), 'class="seam"') : ''; }).join('')
        + ((i + n) % 3 === 0 ? poly([P(1, p0, -WALK * 0.3, 0), P(1, p0, WALK * 0.2, 0), P(1, p1, WALK * 0.2, 0), P(1, p1, -WALK * 0.3, 0)], 'fill="#5a4a3a" fill-opacity=".05"') : ''); }).join('')
      + rows.map((p) => line(P(-1, p, WALK, 0), P(1, p, WALK, 0), 'class="seam"')).join('');
    [-1, 1].forEach((sd) => { ground += along(sd, near, END, WALK, 0, 5, hc('#a89c8a', '#20223c')) + level(sd, near, END, WALK, 160, 5, hc('#c4b8a2', '#24264a')); });
    ground += poly([P(-1, near, WALK, 0), P(-1, END, WALK, 0), P(-1, END, WALK - 34, 0), P(-1, near, WALK - 34, 0)], SHADE(0.14))
      + poly([P(-1, near, 160, 0), P(1, near, 160, 0), P(1, END, 160, 0), P(-1, END, 160, 0)], 'fill="url(#ydGround)"');
    // stone lanterns on the right's pavement
    const lanterns = [[250, 0], [168, 1]].map(([p]) => { const [x, y] = P(1, p, WALK + 14, 5); return stoneLantern(x, y, 64 * p / K); }).join('');
    // the houses, furthest first: the six; one more a side up to the end; the nearest either side running toward the eye off the screen
    const blocks = SHOPS.map((s) => Object.assign({}, s))
      .concat([{ id: 'farL', look: 'far', side: -1, y0: 284, y1: H - END, L: 134, tall: 244, sign: null }, { id: 'farR', look: 'far', side: 1, y0: 280, y1: H - END, L: 140, tall: 236, sign: null }])
      .concat([-1, 1].flatMap((sd) => [{ id: 'n1', look: 'near', side: sd, y0: -260, y1: 12, L: 140, tall: 264 }, { id: 'n2', look: 'near', side: sd, y0: -1500, y1: -260, L: 142, tall: 270 }]))
      .sort((x, y) => y.y0 - x.y0);
    const art = blocks.map((b) => (SHOPS.some((s) => s.id === b.id) ? `<g class="yd-shop" data-shop="${b.id}">${block(b)}</g>` : block(b))).join('');
    const defs = `<defs><linearGradient id="ydFront" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".1"/><stop offset=".45" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#1a1030" stop-opacity=".22"/></linearGradient>
      <linearGradient id="ydEnd" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".14"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#1a1030" stop-opacity=".26"/></linearGradient>
      <linearGradient id="ydGround" gradientUnits="userSpaceOnUse" x1="0" y1="${f(-60 + END)}" x2="0" y2="${f(-60 + near)}"><stop offset="0" stop-color="#eef2f6" stop-opacity=".55"/><stop offset=".35" stop-color="#eef2f6" stop-opacity="0"/><stop offset=".7" stop-color="#2b1c12" stop-opacity="0"/><stop offset="1" stop-color="#2b1c12" stop-opacity=".16"/></linearGradient></defs>`;
    return `<svg class="land tall yudori-land" viewBox="0 -400 1200 770" preserveAspectRatio="xMidYMax slice">${GLOW_DEFS}${ONSEN.steamDefs()}${YUBATAKE.puffDefs()}${YUBATAKE.lightDefs()}
        ${defs}${hills()}${yubatakeEnd()}${ground}${gutter(near)}${endSign()}${art}${lanterns}${cat()}
      </svg>
      ${yHeroHtml()}
      ${TOWNEV.castHtml('yudori')}
      <button type="button" class="thing way-btn" data-act="go-place" data-to="onsen" aria-label="回湯の花駅前" style="margin-left:-32px;bottom:2px"><span class="tag">${ySign('back', '回駅前')}</span></button>
      <button type="button" class="thing way-btn way-edge" data-act="go-place" data-to="yubatake" aria-label="往湯畑" style="margin-left:-32px;bottom:${FAR + 4}px"><span class="tag">${ySign('onsen', '湯畑')}</span></button>
      ${(([x, y]) => `<button type="button" class="thing way-btn way-edge" data-act="go-place" data-to="ryokan" aria-label="進旅館「花月」" style="margin-left:${Math.round(x) - 32}px;bottom:${Math.round(y) + 70}px"><span class="tag">${ySign('door', '花月')}</span></button>`)(door('kagetsu'))}
      <div class="ysel"></div>`;
  }

  // ---- 射的 (spec §3.2): 300 円 a go, once a day — the stall seen close, its prizes on their tiers; a go: three corks (ポン) and a prize
  // at random: mostly はずれ, now and then キャラメル or 小こけし, once in a long while 大当たり — the big bear off the top tier. Nothing is
  // kept. The day of the last go: state.oneADay.shateki (normalizeState keeps it, mergeStates keeps the later day) ----
  const PRICE = 300;
  // [id, how likely, what it is (Japanese, shown), the toast]
  const PRIZES = [['hazure', 0.62, 'はずれ…', '射的：はずれ……三發都沒打中。明天再來！'], ['caramel', 0.2, 'キャラメル、ゲット！', '射的：打中了「キャラメル」（一盒牛奶糖）！'],
    ['kokeshi', 0.14, 'こけし、ゲット！', '射的：打中了「小こけし」（小小的木頭娃娃）！'], ['bear', 0.04, '{大当|おおあ}たり！', '射的：大当たり！打倒了最上面的大熊玩偶！']];
  const prize = () => { let r = Math.random(); for (const [id, w] of PRIZES) { r -= w; if (r < 0) return id; } return 'hazure'; };
  const day = () => dateStr(TOWNEV.today());
  const played = () => Boolean(state.oneADay && state.oneADay.shateki === day());
  const RUBY = /\{([^|}]+)\|([^|}]+)(?:\|[^}]+)?\}/g, ruby = (s) => esc(s).replace(RUBY, '<ruby>$1<rt>$2</rt></ruby>');
  // the stall's tiers seen straight on: where each prize stands (x, y its foot), what it is
  const SHELF = [[64, 128, 'caramel'], [112, 128, 'daruma'], [160, 128, 'kokeshi'], [208, 128, 'caramel'], [256, 128, 'car'], [300, 128, 'kokeshi'],
    [80, 176, 'kokeshi'], [128, 176, 'caramel'], [180, 176, 'can'], [232, 176, 'kokeshi'], [284, 176, 'caramel'], [180, 84, 'bear']];
  const TIERS = [[84, 122, 238, 40], [128, 40, 320, 22], [176, 52, 308, 20]];   // [the top a prize stands on, x0, x1, its skirt down]
  const ART = {
    caramel: '<rect x="-9" y="-16" width="18" height="16" rx="1.4" fill="#f6e08a"/><rect x="-9" y="-16" width="18" height="5" fill="#c8322a"/><rect x="-6" y="-8" width="12" height="5" rx="1" fill="#fff" fill-opacity=".8"/>',
    kokeshi: '<path d="M-5 0 C-6 -8 -6 -14 -4 -16 H4 C6 -14 6 -8 5 0 Z" fill="#d0574b"/><path d="M-5.4 -7 H5.4" stroke="#e6b23c" stroke-width="1.6"/><circle cy="-21" r="6" fill="#f6e6d0"/><path d="M-6 -22 Q0 -30 6 -22 Q4 -26 0 -26.4 Q-4 -26 -6 -22 Z" fill="#2b2b33"/><circle cx="-2" cy="-20.6" r=".8" fill="#2b2b33"/><circle cx="2" cy="-20.6" r=".8" fill="#2b2b33"/>',
    daruma: '<ellipse cy="-9" rx="9" ry="10" fill="#c8322a"/><ellipse cy="-11" rx="5.6" ry="5" fill="#f6e6d0"/><circle cx="-2" cy="-11.6" r="1.2" fill="#2b2b33"/><circle cx="2" cy="-11.6" r="1.2" fill="#2b2b33"/><path d="M-6 -3 Q0 -1 6 -3" stroke="#e6b23c" stroke-width="1.2" fill="none"/>',
    car: '<rect x="-11" y="-9" width="22" height="7" rx="2" fill="#3f7ac8"/><path d="M-6 -9 l2 -5 h8 l2 5 Z" fill="#5a9ae0"/><circle cx="-6" cy="-1.6" r="2.4" fill="#2b2b33"/><circle cx="6" cy="-1.6" r="2.4" fill="#2b2b33"/>',
    can: '<rect x="-6" y="-15" width="12" height="15" rx="1.4" fill="#8ab86e"/><rect x="-6" y="-11" width="12" height="5" fill="#f6f2ea"/>',
    bear: '<ellipse cy="-14" rx="17" ry="15" fill="#c8955f"/><circle cy="-36" r="13" fill="#c8955f"/><circle cx="-11" cy="-46" r="5" fill="#c8955f"/><circle cx="11" cy="-46" r="5" fill="#c8955f"/><circle cx="-11" cy="-46" r="2.4" fill="#e8b88a"/><circle cx="11" cy="-46" r="2.4" fill="#e8b88a"/><ellipse cy="-32" rx="5.6" ry="4.4" fill="#f0d6b0"/><circle cx="-5" cy="-38" r="1.6" fill="#2b2b33"/><circle cx="5" cy="-38" r="1.6" fill="#2b2b33"/><circle cy="-33" r="1.6" fill="#2b2b33"/><path d="M-7 -24 Q0 -20 7 -24" stroke="#c8322a" stroke-width="3" fill="none"/><ellipse cy="-12" rx="9" ry="8" fill="#e8c09a"/>'
  };
  function stallSvg() {
    const tiers = TIERS.map(([y, x0, x1, d]) => `<rect x="${x0}" y="${y}" width="${x1 - x0}" height="${d}" fill="#8a1a24"/><rect x="${x0}" y="${y}" width="${x1 - x0}" height="7" fill="#b8262e"/><rect x="${x0}" y="${y}" width="${x1 - x0}" height="2" fill="#fff" fill-opacity=".25"/><rect x="${x0}" y="${y + d - 3}" width="${x1 - x0}" height="3" fill="#2b1c12" fill-opacity=".3"/>`).join('');
    const prizes = SHELF.map(([x, y, kind], i) => `<g class="yd-prize" data-i="${i}" data-kind="${kind}" transform="translate(${x} ${y})"><g class="yd-wob">${ART[kind]}</g></g>`).join('');
    const curtain = Array.from({ length: 18 }, (_, i) => `<path d="M${i * 20} 0 h20 v24 q-10 5 -20 0 Z" fill="${i % 2 ? '#f6f2ea' : '#c8322a'}"/>`).join('');
    return `<svg class="yd-stall" viewBox="0 0 360 250" aria-hidden="true"><rect width="360" height="250" fill="#3a2418"/><rect width="360" height="250" fill="#ffd08a" opacity=".14"/>
      <circle cx="96" cy="30" r="56" fill="#ffe2a0" opacity=".2"/><circle cx="264" cy="30" r="56" fill="#ffe2a0" opacity=".2"/>${[96, 264].map((x) => `<path d="M${x} 22 v8" stroke="#2b2b33" stroke-width="1.4"/><circle cx="${x}" cy="34" r="5" fill="#fff6d0"/>`).join('')}${tiers}${prizes}${curtain}
      <rect y="196" width="360" height="54" fill="#8a5a34"/><rect y="196" width="360" height="6" fill="#b07a48"/><path d="M0 214 H360 M0 232 H360" stroke="#6e4628" stroke-width="1"/>
      <g class="yd-gun"><path d="M150 250 L176 206 L186 209 L164 250 Z" fill="#5a3e2a"/><path d="M176 206 L188 186 L196 189 L186 209 Z" fill="#3a3a44"/><circle cx="192" cy="186" r="3.4" fill="#c9a06a"/></g>
      <circle class="yd-cork" cx="192" cy="186" r="4" fill="#c9a06a"/><text class="yd-ponw" x="214" y="184" font-size="20" font-weight="800" fill="#c8322a" stroke="#fff6e8" stroke-width="4" paint-order="stroke" font-family="'Hiragino Maru Gothic ProN', 'Zen Maru Gothic', sans-serif">ポン！</text></svg>`;
  }
  function card() {
    const none = yenEarned() <= 0, short = yenBalance() < PRICE, done = played();
    const foot = done ? `<p class="yd-done" lang="ja">${ruby('{今日|きょう}は もう あそびました。また あした！')}</p><p class="yd-note">射的一天玩一次。</p>`
      : `<button type="button" class="btn btn-primary yd-go" lang="ja"${none || short ? ' disabled' : ''}><span>${ruby('{一回|いっかい} やる')}</span><small>${YEN.reading(PRICE)} ${PRICE}円</small></button>${none ? '<p class="yd-note">錢包裡還沒有円。帶一趟郵輪導覽，就能拿到導遊費。</p>' : short ? `<p class="yd-note">錢包不夠：要 ${PRICE} 円。</p>` : ''}`;
    return `<button type="button" class="cls-x" data-cls="x" aria-label="關閉">✕</button><p class="yd-board" lang="ja">${ruby('{射的|しゃてき}　{一回|いっかい} 300{円|えん}・たま {三|みっ}つ')}</p>
      <div class="yd-closeup">${stallSvg()}</div><p class="yd-said" lang="ja" aria-live="polite"></p><div class="yd-foot">${foot}</div>`;
  }
  let shooting = 0;
  function shateki(yard) {
    CLASS.card('yd-shateki', '射的', card(), (e) => { if (e.target.closest('.yd-go:not(:disabled)')) go(yard); });
  }
  // a go: paid (this device's 円 spent, the day kept), three corks — the prize's at the last if one is won — and what came of it
  function go(yard) {
    const c = document.querySelector('.yd-shateki'); if (!c || played() || yenEarned() <= 0 || yenBalance() < PRICE) return;
    if (!isOpen('shateki')) { CLASS.close(); toast(shutSay('shateki'), 3600); return; }   // shut meanwhile (ruling 21): nothing paid, no day kept
    state.oneADay = Object.assign({}, state.oneADay, { shateki: day() }); yenSpend(PRICE); SND.play('coins');   // the day kept, saved with the 円 spent
    const won = prize(), [, , ja, zh] = PRIZES.find((x) => x[0] === won), me = ++shooting, foot = c.querySelector('.yd-foot'); foot.innerHTML = '';
    const target = { caramel: [0, 3, 7, 10], kokeshi: [2, 5, 6, 9], bear: [11] }[won], aims = [1, 4, 8];
    if (target) aims[2] = target[Math.floor(Math.random() * target.length)];
    // what came of it: in the card if it is still up, and always its toast (shut halfway, the 300 円 is not lost without a word)
    const end = () => { if (me !== shooting) return; shooting += 1; toast(zh, 4200); if (won === 'bear') SND.play('suzu'); else if (won !== 'hazure') SND.play('sparkle');
      if (c.isConnected) { const s2 = c.querySelector('.yd-said'), f2 = c.querySelector('.yd-foot'); if (s2) s2.innerHTML = ruby(ja); if (f2) f2.innerHTML = `<button type="button" class="btn yd-ok" data-cls="x" lang="ja"><span>また あした！</span></button>`; }
      if (yard && yard.isConnected) { const el = yard.querySelector('.land [data-fx="shateki"]'); if (el) { el.classList.remove('pon'); void el.getBoundingClientRect(); el.classList.add('pon'); setTimeout(() => el.classList.remove('pon'), 1400); } } };
    if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) { if (target) knock(c, aims[2], true); end(); return; }
    aims.forEach((i, n) => setTimeout(() => { if (me === shooting && c.isConnected) shot(c, i, n === 2 && Boolean(target)); }, 300 + n * 1100));
    setTimeout(end, 300 + 2 * 1100 + 900);
  }
  // one cork: the gun's ポン, the cork across to a prize, it wobbles (missed) or falls over (hit)
  function shot(c, i, hit) {
    const svg = c.querySelector('.yd-stall'), cork = svg && svg.querySelector('.yd-cork'), [x, y] = SHELF[i]; if (!svg || !cork) return;
    SND.play('pon'); svg.classList.remove('fire'); void svg.getBoundingClientRect(); svg.classList.add('fire');
    cork.style.setProperty('--tx', `${x - 192 + (hit ? 0 : (i % 2 ? 9 : -9))}px`); cork.style.setProperty('--ty', `${y - 12 - 186}px`); cork.classList.remove('fly'); void cork.getBoundingClientRect(); cork.classList.add('fly');
    setTimeout(() => knock(c, i, hit), 340);
  }
  function knock(c, i, hit) { const g = c.querySelector(`.yd-prize[data-i="${i}"]`); if (!g) return; g.classList.remove('wob', 'down'); void g.getBoundingClientRect(); g.classList.add(hit ? 'down' : 'wob'); }
  return { H, Y0, FAR, HALF0, K, END, scale, half, top, clamp, SHOPS, shop, pAt, door, BLOCKS, passWay, passFade, open, isOpen, shutSay, hoursSay, sig, html, shateki, prize, PRIZES, PRICE, played };
})();
DOWN.yudori = YUDORI;   // seen down its length (71a_yard.js)
// the pavement's things reaching into the street (YUDORI.BLOCKS) — ゆのはな堂's price board only while it stands out there, the shop open
// (2026-11-25, parked from Task 2's review: shut, nothing is drawn there to walk round)
Object.defineProperty(WALK_BLOCK, 'yudori', { enumerable: true, configurable: true, get: () => YUDORI.BLOCKS.filter((x) => x.id !== 'board' || YUDORI.open()).map((x) => x.box) });
function yudoriHtml() { return YUDORI.html(); }

// ---- what can be tapped along the street: each shop (its sign and front), ゆのはな堂's steamers (its menu, or when it opens), the
// 射的, the inn's gate, the gutter, the cat. Kept here, as 大通り's are, their boxes worked out from the street's own geometry ----
PLACE_USE.yudori = (() => {
  const { K } = YUDORI, S = (id) => YUDORI.shop(id), box = (s) => { const a = YUDORI.pAt(s, 0.04), b = YUDORI.pAt(s, 0.96), x = (p, L) => 600 + s.side * L * p / K, y = (p, V) => -60 + p * (1 - V / K);
    const xs = [x(a, s.L), x(b, s.L), x(YUDORI.pAt(s, 0.78), s.L - 32)], ys = [y(a, 0), y(b, 0), y(YUDORI.pAt(s, 0.78), s.tall + 10)];
    return [Math.round(Math.min(...xs)), Math.round(Math.min(...ys)), Math.round(Math.max(...xs)), Math.round(Math.max(...ys))]; };
  const thing = (id, s, more) => Object.assign({ id, box: box(S(s)), kind: 'do', go: YUDORI.door(s), back: 1, pose: 'look' }, more);   // a thing of shop s's front
  const p = YUDORI.pAt(S('yukataya'), 0.74), cx = 600 + (S('yukataya').L - 10) * p / K, cy = -60 + p * (1 - 6 / K), k = p / K;   // the cat on ゆかた屋's step
  return [
    thing('yunohanado', 'yunohanado', { name: 'ゆのはな堂（溫泉饅頭）', when: () => YUDORI.open(), buy: 'yunohanado', say: 'いい におい…！' }),
    thing('junbi', 'yunohanado', { name: 'ゆのはな堂（準備中）', when: () => !YUDORI.open(), pick: () => ['しまってる…', YUDORI.shutSay()] }),
    thing('shateki', 'shateki', { name: '射的', when: () => YUDORI.isOpen('shateki'), open: (y) => YUDORI.shateki(y), say: 'わくわく…！' }),
    thing('shatekishut', 'shateki', { name: '射的（準備中）', when: () => !YUDORI.isOpen('shateki'), pick: () => ['しまってる…', YUDORI.shutSay('shateki')] }),   // its hours (ruling 21)
    thing('sakaya', 'sakaya', { name: '酒屋', say: 'おさけの におい…', toast: '酒屋（賣酒的店）：屋簷下掛著用杉樹葉做的「杉玉」，表示今年的新酒釀好了。' }),
    thing('kagetsu', 'kagetsu', { name: '旅館「花月」', open: (y) => yGo(y.querySelector('.use-btn[data-use="kagetsu"]') || y, 'ryokan') }),   // in through its gate (2026-11-24: RYOKAN)
    thing('yukataya', 'yukataya', { name: 'ゆかた屋', when: () => YUDORI.isOpen('yukataya'), pick: () => ['きれい…！', `ゆかた屋：櫥窗裡掛著各種顏色的浴衣，可以租來穿著逛街（營業時間 ${YUDORI.hoursSay('yukataya')}）。`] }),   // its hours (ruling 26)
    thing('yukatayashut', 'yukataya', { name: 'ゆかた屋（準備中）', when: () => !YUDORI.isOpen('yukataya'), pick: () => ['しまってる…', YUDORI.shutSay('yukataya')] }),   // shut: when it opens, and a knock (fix round 2)
    thing('kanmi', 'kanmi', { name: '甘味処', say: 'あまい におい…', toast: '甘味処（日式甜點店）：紅色大傘下的長椅，坐著吃糰子、喝茶。' }),
    { id: 'neko', name: '貓', box: [Math.round(cx - 30 * k), Math.round(cy - 22 * k), Math.round(cx + 30 * k), Math.round(cy + 10 * k)], over: 1, kind: 'do', go: [Math.round(YUDORI.half(YUDORI.H - p) - 14), Math.round(YUDORI.H - p)], back: 1, pose: 'crouch', say: 'ニャ…', fx: 'neko', fxc: 'stir', ms: 2200 }];
})();
