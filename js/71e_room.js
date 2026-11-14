'use strict';
// 書房 and the bedroom (ROOM), and the wares drawn in them (out of 71_today.js, 2026-11-11)
// what stands, lies or hangs in 書房 now: owned, known to this build, and placed (an unknown id is kept in the save, just not drawn)
const forRoom = (it) => it.kind === 'floor' || it.kind === 'rug' || it.kind === 'wall';
let roomNow = 'study';   // the room 書房's drawing shows now (1.3.0: 書房 or the bedroom; ROOM sets it)
function placedWares(rm = roomNow) { return Object.keys(state.placed).filter((id) => owns(id) && WARE.has(id) && forRoom(WARE.get(id)) && (state.placed[id].rm || 'study') === rm).map((id) => ({ id, it: WARE.get(id), p: state.placed[id] })); }
function wareFootprint(it, p) { const [w, d] = p.r ? [it.fp[1], it.fp[0]] : it.fp; return [p.x - w / 2, p.y - d / 2, p.x + w / 2, p.y + d / 2]; }
function wareRect(it, p) { return [p.u - it.size[0] / 2, p.v - it.size[1] / 2, p.u + it.size[0] / 2, p.v + it.size[1] / 2]; }
const ROOM = (() => {
  const S = 40, RH = 12, WAIN = 3.2;   // RW, RD: the room shown now (ROOMS)   // RH: the walls were 19 high, to fill a wide screen's top corners, till the room became a block in the sky (1.2.0)
  const P = (x, y, z = 0) => [(x - y) * S, (x + y) * S / 2 - z * S];
  const r1 = (v) => Math.round(v * 10) / 10;
  const pt = (x, y, z = 0) => P(x, y, z).map(r1).join(' ');
  const poly = (a) => 'M' + a.map((p) => pt(p[0], p[1], p[2])).join(' L') + ' Z';
  const line = (a) => 'M' + a.map((p) => pt(p[0], p[1], p[2])).join(' L');
  // flat details drawn in a plane: u, v are the plane's own axes (v points down)
  const onX = (x0) => `matrix(${S} ${-S / 2} 0 ${S} ${x0 * S} ${x0 * S / 2})`;   // a face looking along +x (the left wall): u = -y, v = -z
  const onY = (y0) => `matrix(${S} ${S / 2} 0 ${S} ${-y0 * S} ${y0 * S / 2})`;   // a face looking along +y (the right wall): u = x, v = -z
  const onZ = (z0) => `matrix(${S} ${S / 2} ${-S} ${S / 2} 0 ${-z0 * S})`;        // a level surface: u = x, v = y
  // the rooms (1.3.0): 書房 (study, 30 × 24) and the bedroom (bed, 20 × 16) beyond a door in 書房's left wall, drawn one at a time
  // by the same code. Per room: its size; where the camera looks, [x0, y0, x1, y1] in the room's screen units (P / S) — the places
  // a phone frames round the hero when the room first opens, the line through their middles how high the camera looks as it
  // follows him; BOUND, as far as the camera looks (the whole block and a little sky round it: where a wide screen starts, and
  // as far out as two fingers go); its doors on the left wall (y0…y1 along it; to: where it leads; in: the doorway shows a room,
  // not the yard); where the hero stands the first time. FRAME, the widest and the tallest of the old stops, sets a phone's zoom
  // to start with.
  const ROOMS = {
    study: { RW: 30, RD: 24, BOUND: [-25.5, -13.5, 31.5, 28.9], hero: { x: 4.2, y: 4.7 },
      VIEWS: [[-23.5, -0.5, -15.5, 13], [-15.5, -4, -7.5, 9.5], [-8.9, -8.6, -1.3, 4.6], [-2.05, -9.9, 5.95, 4.3], [7.6, -7.2, 15.6, 6.6], [17.5, -5, 25.5, 8.5], [24, -2.5, 32, 11]],
      doors: [{ id: 'door', y0: 4.2, y1: 6.0, to: '#/outside', label: '出門' }, { id: 'bdoor', y0: 18.6, y1: 20.4, to: '#/bedroom', label: '臥房', in: true }] },
    bed: { RW: 20, RD: 16, BOUND: [-17.5, -13.5, 21.5, 19.9], hero: { x: 5.5, y: 6.5 },
      VIEWS: [[-12, -6, -4, 7], [-5.2, -8.6, 2.8, 4.6], [3, -7, 11, 6.5], [11.5, -5, 19.5, 8.5]],
      doors: [{ id: 'sdoor', y0: 2.3, y1: 4.1, to: '#/today', label: '書房', in: true }] }
  };
  const FRAME = [8, 16.8], DOOR_VIEW = 2;   // DOOR_VIEW: 書房's stop by the door to the yard (the hero walks out from there)
  const PHONE_K = 0.5;   // a phone starts this far out from the old stops' zoom (2026-11-10, the user: the hero half as big, more of the room in sight); two fingers still go back in
  let ROOMID = '', RW = 0, RD = 0, VB = null, VIEWS = null, BOUND = null, DOORS = null;
  const roomOf = (p) => p.rm || 'study';   // a ware's room: none said is 書房 (every save from before the bedroom)
  const here = (p) => (ROOMID === 'study' ? p : Object.assign(p, { rm: ROOMID }));   // a spot in the room shown now
  const vbPct = (sx, sy) => `left:${((sx - VB[0]) / VB[2] * 100).toFixed(3)}%;top:${((sy - VB[1]) / VB[3] * 100).toFixed(3)}%`;
  const vbSize = (w, h) => `width:${(w / VB[2] * 100).toFixed(3)}%;height:${(h / VB[3] * 100).toFixed(3)}%`;

  // ===== light: every colour below is its daylight colour; by night it is lit by the moon plus the desk lamp, the lamp on the
  // chest of drawers and the one by the bed, worked out per face from where the face is and which way it looks, once dim (nothing
  // done today) and once bright (today's list done) — CSS mixes them by --day and --f =====
  const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const hex = (c) => '#' + c.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
  const FACE = { t: [0, 0, 1, 1], y: [0, 1, 0, 0.9], x: [1, 0, 0, 0.79], L: [1, 0, 0, 0.94], R: [0, 1, 0, 1] };   // the normal and its share of daylight
  const MOON = [0.42, 0.41, 0.54];   // by night (1.2.0: raised from 0.25 0.27 0.48, the room was too dark; 2026-11-10: warmer, from 0.35 0.37 0.57)
  // the hero by night (1.2.0): lit as if a soft light followed him, so he reads clearly in a dark corner (the lamps add to it)
  const HERO_AMB = [0.66, 0.66, 0.8];
  const LIGHTS = [
    { p: [2.6, 0.98, 4.66], c: [1, 0.8, 0.52], r: 8.5, lo: 0.75, hi: 1.35 },   // the desk lamp, over the notebook (2026-11-10: reaching further, brighter before the list is done)
    { p: [9.1, 0.45, 4.05], c: [1, 0.72, 0.5], r: 5.4, lo: 0.7, hi: 0.95 },   // the little lamp on the chest of drawers
    { p: [16.05, 0.5, 2.6], c: [1, 0.76, 0.52], r: 5.6, lo: 0.7, hi: 0.9 }    // the reading lamp on the night table by the bed
  ];
  // the lamps lighting the room now: the desk's and the chest's stand still; the night table's goes where the table is, and so do
  // the lamps bought (roomLights, worked out each time the room is drawn)
  let LIT = LIGHTS;
  let SH = [0, 0, 0];   // a thing drawn at its old place and moved there whole (shifted, inPlace): lit where it is now
  function tone(h, face, at0, moon = MOON) {
    const at = SH[0] || SH[1] || SH[2] ? [at0[0] + SH[0], at0[1] + SH[1], at0[2] + SH[2]] : at0;
    const [nx, ny, nz, k] = FACE[face], b = rgb(h), amb = moon.map((v) => v * (0.72 + 0.28 * k));
    const lit = (lvl) => {
      const s = [0, 0, 0];
      for (const L of LIT) {
        const dx = L.p[0] - at[0], dy = L.p[1] - at[1], dz = L.p[2] - at[2], d = Math.hypot(dx, dy, dz) || 1;
        const w = (Math.max(0, (nx * dx + ny * dy + nz * dz) / d) * 0.7 + 0.3) * Math.max(0, 1 - d / L.r) ** 2 * L[lvl];
        for (let i = 0; i < 3; i++) s[i] += L.c[i] * w;
      }
      return s;
    };
    const lo = lit('lo'), hi = lit('hi');
    return `color-mix(in srgb,${hex(b.map((v) => v * k))} calc(var(--day)*100%),color-mix(in srgb,${hex(b.map((v, i) => v * (amb[i] + hi[i])))} calc(var(--f)*100%),${hex(b.map((v, i) => v * (amb[i] + lo[i])))}))`;
  }
  const F = (h, face, at) => `style="fill:${tone(h, face, at)}"`;
  const FS = (h, face, at) => `style="stroke:${tone(h, face, at)}"`;
  const C = {
    wall: '#f3e9d9', wain: '#aebfa2', batten: '#bdcdb1', rail: '#f7f2e8', skirt: '#f2ece1',
    floor: '#d2a97c', oak: '#c99a6c', oakTop: '#d8ad7f', oakDk: '#b08159', walnut: '#8f6444', shelfIn: '#6e4a31',
    cream: '#f8f2e7', paper: '#fdfaf3', line: '#b9c4e6', ink: '#3b3653',
    mustard: '#e0b252', accent: '#5a68d8', accentDk: '#4552b8',
    red: '#d05a4b', steel: '#5b6279', leaf: '#5f9a5b', leafDk: '#4a7f47', pot: '#d98463'
  };

  // ===== building blocks =====
  function box(h, x0, y0, z0, x1, y1, z1, o = {}) {   // the three faces a box shows (top, the +y face, the +x face) and its lit edges
    const mx = (x0 + x1) / 2, my = (y0 + y1) / 2, mz = (z0 + z1) / 2;
    let s = '';
    if (o.t !== false) s += `<path ${F(o.t || h, 't', [mx, my, z1])} d="${poly([[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]])}"/>`;
    if (o.y !== false) s += `<path ${F(o.y || h, 'y', [mx, y1, mz])} d="${poly([[x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]])}"/>`;
    if (o.x !== false) s += `<path ${F(o.x || h, 'x', [x1, my, mz])} d="${poly([[x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [x1, y0, z1]])}"/>`;
    if (o.hl !== false) s += `<path class="hl" d="${line([[x0, y1, z1], [x1, y1, z1], [x1, y0, z1]])}${o.hlv ? ' ' + line([[x1, y1, z1], [x1, y1, z0]]) : ''}"/>`;
    return s;
  }
  const qX = (h, x, y0, y1, z0, z1, f = 'x') => `<path ${F(h, f, [x, (y0 + y1) / 2, (z0 + z1) / 2])} d="${poly([[x, y0, z0], [x, y1, z0], [x, y1, z1], [x, y0, z1]])}"/>`;
  const qY = (h, y, x0, x1, z0, z1, f = 'y') => `<path ${F(h, f, [(x0 + x1) / 2, y, (z0 + z1) / 2])} d="${poly([[x0, y, z0], [x1, y, z0], [x1, y, z1], [x0, y, z1]])}"/>`;
  const qZ = (h, z, x0, x1, y0, y1) => `<path ${F(h, 't', [(x0 + x1) / 2, (y0 + y1) / 2, z])} d="${poly([[x0, y0, z], [x1, y0, z], [x1, y1, z], [x0, y1, z]])}"/>`;
  const shadow = (x0, y0, x1, y1, o = 1, z = 0.004) => `<g transform="${onZ(z)}"><rect x="${x0}" y="${y0}" width="${x1 - x0}" height="${y1 - y0}" rx="${(Math.min(x1 - x0, y1 - y0) * 0.35).toFixed(2)}" fill="url(#cs)" opacity="${o}"/></g>`;
  // a billboard: drawn upright facing the camera (for round things), its own units = drawing units, origin at a room point
  const bb = (x, y, z, inner) => `<g transform="translate(${pt(x, y, z)})">${inner}</g>`;

  const DEFS = `<defs>
    <linearGradient id="aoUp" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#2b1c12" stop-opacity=".22"/><stop offset="1" stop-color="#2b1c12" stop-opacity="0"/></linearGradient>
    <linearGradient id="aoDn" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2b1c12" stop-opacity=".2"/><stop offset="1" stop-color="#2b1c12" stop-opacity="0"/></linearGradient>
    <linearGradient id="aoLR" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#2b1c12" stop-opacity=".16"/><stop offset="1" stop-color="#2b1c12" stop-opacity="0"/></linearGradient>
    <linearGradient id="aoRL" x1="1" y1="0" x2="0" y2="0"><stop offset="0" stop-color="#2b1c12" stop-opacity=".16"/><stop offset="1" stop-color="#2b1c12" stop-opacity="0"/></linearGradient>
    <radialGradient id="cs"><stop offset="0" stop-color="#2b1c12" stop-opacity=".34"/><stop offset=".6" stop-color="#2b1c12" stop-opacity=".16"/><stop offset="1" stop-color="#2b1c12" stop-opacity="0"/></radialGradient>
    <radialGradient id="pool"><stop offset="0" stop-color="#ffe0a6" stop-opacity=".7"/><stop offset=".45" stop-color="#ffcb84" stop-opacity=".28"/><stop offset="1" stop-color="#ffc47a" stop-opacity="0"/></radialGradient>
    <radialGradient id="halo"><stop offset="0" style="stop-color:color-mix(in srgb,#fffdf2 calc(var(--day)*100%),#ffd9a0)" stop-opacity=".75"/><stop offset=".55" style="stop-color:color-mix(in srgb,#fff6dc calc(var(--day)*100%),#ffc98a)" stop-opacity=".3"/><stop offset="1" stop-color="#fff6dc" stop-opacity="0"/></radialGradient>
    <linearGradient id="fold" x1="0" y1="0" x2="1" y2="0" spreadMethod="repeat" gradientTransform="scale(.25 1)"><stop offset="0" stop-color="#fff" stop-opacity=".22"/><stop offset=".5" stop-color="#000" stop-opacity=".1"/><stop offset="1" stop-color="#fff" stop-opacity=".22"/></linearGradient>
    <linearGradient id="glass" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".42" stop-color="#fff" stop-opacity="0"/><stop offset=".43" stop-color="#fff" stop-opacity=".28"/><stop offset=".52" stop-color="#fff" stop-opacity=".28"/><stop offset=".53" stop-color="#fff" stop-opacity="0"/><stop offset=".6" stop-color="#fff" stop-opacity="0"/><stop offset=".61" stop-color="#fff" stop-opacity=".18"/><stop offset=".64" stop-color="#fff" stop-opacity=".18"/><stop offset=".65" stop-color="#fff" stop-opacity="0"/></linearGradient>
    <pattern id="stripes" width=".6" height="1" patternUnits="userSpaceOnUse"><rect width=".05" height="1" fill="#fff" fill-opacity=".34"/><rect x=".3" width=".02" height="1" fill="#8a6a4a" fill-opacity=".05"/></pattern>
    <pattern id="cork" width=".3" height=".3" patternUnits="userSpaceOnUse"><circle cx=".05" cy=".07" r=".018" fill="#5a3a1c" fill-opacity=".28"/><circle cx=".2" cy=".19" r=".014" fill="#5a3a1c" fill-opacity=".22"/><circle cx=".13" cy=".26" r=".02" fill="#fff" fill-opacity=".2"/><circle cx=".26" cy=".05" r=".012" fill="#fff" fill-opacity=".18"/></pattern>
  </defs>`;

  // ===== the room =====
  const q2 = (v) => Math.round(v * 100) / 100;
  // the windows (wares, 1.2.0; 1.3.0: the bedroom has its own, and either may hang in either room): where they hang in the room
  // shown, and the opening there — u along its wall, z the height; X0…X1 the opening in its wall's own flat drawing (onY: u;
  // onX: -u), which runs left to right on the screen on both walls
  const winsHere = () => placedWares().filter((o) => o.it.win && (o.p.w === 'L' || o.p.w === 'R'));
  function winHole(p) {
    const u0 = q2(p.u - 1.4), u1 = q2(p.u + 1.4), z0 = q2(p.v - 1.9), z1 = q2(p.v + 1.9), R = p.w === 'R';
    return { R, u0, u1, z0, z1, X0: R ? u0 : -u1, X1: R ? u1 : -u0, at: (X, d, z) => (R ? [X, d, z] : [d, -X, z]), plane: R ? onY : onX, face: R ? 'y' : 'x' };
  }
  const holeD = (h, w) => (h && h.R === (w === 'R') ? ' ' + poly([h.at(h.X0, 0, h.z0), h.at(h.X1, 0, h.z0), h.at(h.X1, 0, h.z1), h.at(h.X0, 0, h.z1)]) : '');
  const holeFlat = (h, w) => (h && h.R === (w === 'R') ? ` M${h.X0} ${-h.z1} H${h.X1} V${-h.z0} H${h.X0} Z` : '');
  function shellArt() {
    const ws = winsHere().map((o) => ({ o, h: winHole(o.p) })), holes = (f, w) => ws.map((q) => f(q.h, w)).join('');
    let s = '';
    s += `<path fill-rule="evenodd" ${F(C.wall, 'L', [0, 3, 7])} d="${poly([[0, 0, 0], [0, RD, 0], [0, RD, RH], [0, 0, RH]])}${holes(holeD, 'L')}"/>`;
    s += `<path fill-rule="evenodd" ${F(C.wall, 'R', [3, 0, 7])} d="${poly([[0, 0, 0], [RW, 0, 0], [RW, 0, RH], [0, 0, RH]])}${holes(holeD, 'R')}"/>`;
    s += `<g transform="${onY(0)}" class="wp"><path fill="url(#stripes)" fill-rule="evenodd" d="M0 ${-RH} H${RW} V${-WAIN} H0 Z${holes(holeFlat, 'R')}"/></g>`;
    s += `<g transform="${onX(0)}" class="wp"><path fill="url(#stripes)" fill-rule="evenodd" d="M${-RD} ${-RH} H0 V${-WAIN} H${-RD} Z${holes(holeFlat, 'L')}"/></g>`;
    // the wall where an opening is, shown only while its window is dragged in 擺設 (the room keeps its drawing meanwhile)
    ws.forEach(({ o, h }) => { s += `<g class="win-patch" data-w="${o.id}"><path ${F(C.wall, h.R ? 'R' : 'L', h.at((h.X0 + h.X1) / 2, 0, 7))} d="${holeD(h, o.p.w).slice(1)}"/><g transform="${h.plane(0)}"><path fill="url(#stripes)" d="${holeFlat(h, o.p.w).slice(1)}"/></g></g>`; });
    // wainscot: panels, battens, the rail on top and the skirting
    s += qX(C.wain, 0, 0, RD, 0, WAIN, 'L') + qY(C.wain, 0, 0, RW, 0, WAIN, 'R');
    for (let i = 0.7; i < RW; i += 0.72) s += qY(C.batten, 0.01, i, i + 0.07, 0.3, WAIN, 'R');
    for (let i = 0.7; i < RD; i += 0.72) s += qX(C.batten, 0.01, i, i + 0.07, 0.3, WAIN, 'L');
    s += box(C.rail, 0, 0, WAIN, RW, 0.1, WAIN + 0.14, { x: false }) + box(C.rail, 0, 0.1, WAIN, 0.1, RD, WAIN + 0.14, { y: false });
    s += box(C.skirt, 0, 0, 0, RW, 0.06, 0.32, { x: false }) + box(C.skirt, 0, 0.06, 0, 0.06, RD, 0.32, { y: false });
    // the room as a block cut open (1.2.0): the floor's edge along the two open sides, the walls' ends standing on it and
    // their tops, all as thick as the walls — round the block, the sky at this hour (.study's background)
    const T = 0.45, D = 0.9;
    s += qY('#b98c60', RD, -T, RW, -D, 0) + qX('#a77a52', RW, -T, RD, -D, 0) + qY('#e2d5bf', RD, -T, 0, 0, RH) + qX('#ddd0b8', RW, -T, 0, 0, RH);
    s += `<path ${F('#cdbb9e', 't', [RW / 2, -T / 2, RH])} d="${poly([[-T, -T, RH], [RW, -T, RH], [RW, 0, RH], [0, 0, RH], [0, RD, RH], [-T, RD, RH]])}"/>`;
    s += `<path class="hl" d="${line([[RW, -T, RH], [RW, 0, RH], [0, 0, RH], [0, RD, RH], [-T, RD, RH]])} ${line([[-T, RD, 0], [RW, RD, 0], [RW, -T, 0]])}"/>`;
    return s;
  }
  function windowArt(p, alone, bare) {   // bare: nothing on the sill (the windows put up in roomV 8)
    const h = winHole(p), { X0, X1, z0, z1, at, plane, face } = h, d = 0.34, Xm = q2((X0 + X1) / 2), zm = q2((z0 + z1) / 2), v = p.v;
    let s = '';
    if (alone) s += `<g transform="${plane(-d)}"><rect x="${X0}" y="${-z1}" width="${q2(X1 - X0)}" height="${q2(z1 - z0)}" style="fill:color-mix(in srgb,#9fd0f0 calc(var(--day,1)*100%),#232056)"/></g>`;
    // the opening's depth: the side the room sees (the left one on the right wall, the right one on the left wall) and its bottom
    s += h.R ? qX(C.wall, X0, -d, 0, z0, z1, 'x') + qZ(C.wall, z0, X0, X1, -d, 0) : qY(C.wall, -X1, -d, 0, z0, z1, 'y') + qZ(C.wall, z0, -d, 0, -X1, -X0);
    // the sashes in the glass plane, the glare on the glass by day
    s += `<g transform="${plane(-d + 0.05)}">
      <rect x="${X0}" y="${q2(-z1 + 0.3)}" width="${q2(X1 - X0 - 0.3)}" height="${q2(z1 - z0 - 0.3)}" fill="url(#glass)" class="day-only"/>
      <path ${F(C.cream, face, at(Xm, -d, zm))} fill-rule="evenodd" d="M${X0} ${-z1} H${X1} V${-z0} H${X0} Z M${q2(X0 + 0.13)} ${q2(-z1 + 0.13)} V${q2(-z0 - 0.13)} H${q2(Xm - 0.04)} V${q2(-z1 + 0.13)} Z M${q2(Xm + 0.04)} ${q2(-z1 + 0.13)} V${q2(-z0 - 0.13)} H${q2(X1 - 0.13)} V${q2(-z1 + 0.13)} Z"/>
      <rect x="${q2(X0 + 0.13)}" y="${q2(-zm - 0.03)}" width="${q2(X1 - X0 - 0.26)}" height=".07" ${F(C.cream, face, at(Xm, -d, zm))}/>
    </g>`;
    // the casing round the opening, and the sill
    s += `<g transform="${plane(0.012)}"><path ${F(C.cream, face, at(Xm, 0, zm))} fill-rule="evenodd" d="M${q2(X0 - 0.16)} ${q2(-z1 - 0.16)} H${q2(X1 + 0.16)} V${-z0} H${q2(X0 - 0.16)} Z M${X0} ${-z1} H${X1} V${-z0} H${X0} Z"/></g>`;
    s += h.R ? box(C.cream, X0 - 0.3, 0, z0 - 0.16, X1 + 0.3, 0.42, z0, { hlv: true }) : box(C.cream, 0, -X1 - 0.3, z0 - 0.16, 0.42, -X0 + 0.3, z0, { hlv: true });
    // a little plant and a cactus on the sill
    const pl = at(q2(X0 + 0.5), 0.22, z0), ca = at(q2(X1 - 0.5), 0.2, z0), lit = (q, dd, z) => at(h.R ? q[0] : -q[1], dd, z);
    if (!bare) s += bb(...pl, `<path ${F(C.pot, face, lit(pl, 0.3, z0))} d="M-7 -1 L-5.5 -11 H5.5 L7 -1 Z"/><path d="M-6 -11 H6" class="hl"/><g ${F(C.leaf, 't', lit(pl, 0.2, z0 + 0.6))}><path d="M0 -11 C-9 -16 -12 -26 -8 -31 C-3 -24 -1 -17 0 -11 Z"/><path d="M0 -11 C7 -18 13 -22 17 -21 C13 -14 7 -12 0 -11 Z"/><path d="M0 -11 C0 -22 3 -30 6 -34 C8 -26 5 -17 0 -11 Z"/></g>`);
    if (!bare) s += bb(...ca, `<path ${F('#e8d9c4', face, lit(ca, 0.3, z0))} d="M-6 0 L-5 -8 H5 L6 0 Z"/><rect x="-3.2" y="-21" width="6.4" height="14" rx="3.2" ${F('#7fae79', face, lit(ca, 0.2, z0 + 0.4))}/><rect x="2" y="-16" width="5" height="3.2" rx="1.6" ${F('#7fae79', face, lit(ca, 0.2, z0 + 0.4))}/><rect x="5" y="-19" width="2.6" height="5" rx="1.3" ${F('#7fae79', face, lit(ca, 0.2, z0 + 0.4))}/>`);
    // curtains on a rod, folds drawn as a soft repeating shade
    const rod = q2(z1 + 0.55), ra = q2(X0 - 0.85), rb = q2(X1 + 0.85);
    s += `<path class="ln" ${FS(C.walnut, face, at(Xm, 0.2, rod))} stroke-width="3.2" d="${line([at(ra, 0.2, rod), at(rb, 0.2, rod)])}"/>`;
    s += bb(...at(ra, 0.2, rod), `<circle r="4" ${F(C.walnut, 't', at(ra, 0.2, rod))}/>`) + bb(...at(rb, 0.2, rod), `<circle r="4" ${F(C.walnut, 't', at(rb, 0.2, rod))}/>`);
    const curtain = (a, b, flip) => {
      const c = flip ? b : a, o = flip ? a : b, e = flip ? -1 : 1;   // c: the side by the wall end, o: the side by the glass, e: the way to the glass
      // along the rod from the wall end to the glass, down the glass side, along the hem, back up the wall side
      const dd = `M${c} ${q2(-rod + 0.05)} H${o} C${q2(o - e * 0.05)} ${q2(-v - 0.6)} ${q2(o + e * 0.18)} ${q2(-v + 1)} ${q2(o + e * 0.05)} ${q2(-v + 2.45)} Q${q2((a + b) / 2)} ${q2(-v + 2.6)} ${c} ${q2(-v + 2.48)} C${c} ${q2(-v + 1)} ${c} ${q2(-v - 0.8)} ${c} ${q2(-rod + 0.05)} Z`;
      return `<g transform="${plane(0.16)}"><g class="cur" style="--w:-${(Math.abs(a) * 1.7) % 6}s"><path ${F('#a9bfd3', face, at((a + b) / 2, 0.2, v))} d="${dd}"/><path fill="url(#fold)" d="${dd}"/></g></g>`;   // a breath of air in them (2026-11-10)
    };
    s += curtain(q2(X0 - 0.7), q2(X0 + 0.3), false) + curtain(q2(X1 - 0.3), q2(X1 + 0.7), true);
    return s;
  }
  // the calendar (模擬考) on the right wall past the chest of drawers, a Japanese day-by-day one (日めくり): the month in kanji,
  // the day — blue on a Saturday, red on a Sunday — with its weekday, and the days left to the exam
  const CAL = { x0: 9.95, x1: 11.35, z0: 4.5, z1: 6.65 };
  // the page of the day (also the one that drops away when the calendar is tapped): the month, the date, the weekday, the streak
  // as a red stamp (none before a first day), the days to the exam
  function calendarSheet(d, left) {
    const { x0, x1, z0, z1 } = CAL, xm = (x0 + x1) / 2, zm = (z0 + z1) / 2, wd = d.getDay(), dc = wd === 6 ? '#3f6fc6' : wd === 0 ? C.red : C.ink;
    const n = streakStats().current, sv = q2(-z1 + 1.58), sw = q2(0.16 * (3 + String(n).length * 0.55) + 0.2), at = [xm, 0.07, z1 - 1.58];
    return `${box(C.paper, x0, 0, z0, x1, 0.07, z1, { t: false })}
      <g transform="${onY(0.072)}">
        <rect x="${x0}" y="${-z1}" width="${q2(x1 - x0)}" height=".44" ${F(C.red, 'y', [xm, 0.07, z1])}/>
        <text x="${xm}" y="${q2(-z1 + 0.32)}" font-size=".26" font-weight="700" text-anchor="middle" fill="#fff">${jMonth(d.getMonth())}</text>
        <text x="${xm}" y="${q2(-z1 + 1.08)}" font-size=".66" font-weight="800" text-anchor="middle" ${F(dc, 'y', [xm, 0.07, zm])}>${d.getDate()}</text>
        <text x="${xm}" y="${q2(-z1 + 1.33)}" font-size=".2" font-weight="700" text-anchor="middle" ${F(dc, 'y', [xm, 0.07, zm])}>${'日月火水木金土'[wd]}曜日</text>
        ${n ? `<g class="cal-stamp" opacity=".9" transform="rotate(-5 ${xm} ${sv})"><rect x="${q2(xm - sw / 2)}" y="${q2(sv - 0.13)}" width="${sw}" height=".26" rx=".05" fill="none" stroke-width=".03" ${FS(C.red, 'y', at)}/>
          <text x="${xm}" y="${q2(sv + 0.06)}" font-size=".16" font-weight="700" text-anchor="middle" font-family="'Hiragino Mincho ProN', 'Noto Serif JP', 'Noto Serif CJK JP', serif" ${F(C.red, 'y', at)}>${n}日連続</text></g>` : ''}
        <path d="M${q2(x0 + 0.12)} ${q2(-z0 - 0.32)} H${q2(x1 - 0.12)}" stroke="#000" stroke-opacity=".08" stroke-width=".02"/>
        <text x="${xm}" y="${q2(-z0 - 0.11)}" font-size=".17" font-weight="700" text-anchor="middle" ${F(C.red, 'y', [xm, 0.07, z0 + 0.1])}>${left > 0 ? `試験まで${left}日` : '試験の日'}</text>
      </g>`;
  }
  function calendarArt(d, left) {
    const { x0, x1, z1 } = CAL, xm = (x0 + x1) / 2;
    return `<path class="ln" ${FS(C.walnut, 'y', [xm, 0, z1])} stroke-width="1.2" d="${line([[xm - 0.28, 0.03, z1 - 0.02], [xm, 0.03, z1 + 0.3], [xm + 0.28, 0.03, z1 - 0.02]])}"/>${calendarSheet(d, left)}`;
  }
  // the 富士山 print between the bookcase and the door (the wall clock is no longer the room's own: bought at 古道具屋, it is a ware
  // like the others — DECOR draws it, its hands are an overlay, handsHtml)
  function printArt() {
    const y0 = 2.75, y1 = 4.15, z0 = 7.3, z1 = 8.55, ym = (y0 + y1) / 2, zm = (z0 + z1) / 2;
    return `<g transform="${onX(0.05)}"><rect x="${-y1 + 0.06}" y="${-z1 + 0.08}" width="${y1 - y0}" height="${z1 - z0}" fill="#2b1c12" fill-opacity=".14"/></g>
      <g transform="${onX(0.08)}"><rect x="${-y1}" y="${-z1}" width="${y1 - y0}" height="${z1 - z0}" ${F(C.walnut, 'L', [0.1, ym, zm])}/>
      <rect x="${-y1 + 0.1}" y="${-z1 + 0.1}" width="${y1 - y0 - 0.2}" height="${z1 - z0 - 0.2}" ${F('#f4ead8', 'L', [0.1, ym, zm])}/>
      <circle cx="${-ym + 0.33}" cy="${-z1 + 0.42}" r=".15" ${F('#e0614f', 'L', [0.1, ym, zm])}/>
      <path d="M${-y1 + 0.1} ${-z0 - 0.1} L${-ym - 0.05} ${-z1 + 0.5} L${-ym + 0.05} ${-z1 + 0.5} L${-y0 - 0.1} ${-z0 - 0.1} Z" ${F('#6f8fb8', 'L', [0.1, ym, zm])}/>
      <path d="M${-ym - 0.05} ${-z1 + 0.5} L${-ym - 0.26} ${-z1 + 0.78} Q${-ym - 0.12} ${-z1 + 0.72} ${-ym - 0.04} ${-z1 + 0.8} Q${-ym + 0.06} ${-z1 + 0.7} ${-ym + 0.12} ${-z1 + 0.78} Q${-ym + 0.2} ${-z1 + 0.72} ${-ym + 0.26} ${-z1 + 0.78} L${-ym + 0.05} ${-z1 + 0.5} Z" fill="#fff"/>
      <path d="M${-y1 + 0.1} ${-z0 - 0.26} Q${-ym} ${-z0 - 0.42} ${-y0 - 0.1} ${-z0 - 0.24} V${-z0 - 0.1} H${-y1 + 0.1} Z" ${F('#9fbf93', 'L', [0.1, ym, zm])}/></g>`;
  }
  // the doors on the left wall (ROOMS: 出門 past the bookcase; 1.3.0: the bedroom's, and back)
  const DOOR = { z1: 6.5 };   // how high the doors are
  // a door's leaf, flat in its plane from x0 for w (the hinge at x0, the handle at the far end), z up as -y; L(colour, z) lights it.
  // test (roomV 8): 出門 is the house's front door, painted deep blue, frosted glass in four panes above, a raised panel below, a
  // brass lever, a keyhole and a kick plate; the doors between the rooms stay plain oak with two panels and a round knob
  function leafArt(dd, x0, w, L) {
    const z1 = DOOR.z1, X = (v) => q2(x0 + v), W = (v) => q2(w - v);
    if (dd.in) return `<rect x="${X(0)}" y="${-z1}" width="${w}" height="${z1}" ${L(C.oak, 3)}/>
      <rect x="${X(0.22)}" y="${-z1 + 0.3}" width="${W(0.44)}" height="2.5" rx=".06" ${L(C.oakDk, 5)}/><rect x="${X(0.22)}" y="-3.3" width="${W(0.44)}" height="2.9" rx=".06" ${L(C.oakDk, 2)}/>
      <rect x="${X(0.3)}" y="${-z1 + 0.38}" width="${W(0.6)}" height="2.34" rx=".05" ${L(C.oak, 5)}/><rect x="${X(0.3)}" y="-3.22" width="${W(0.6)}" height="2.74" rx=".05" ${L(C.oak, 2)}/>
      <circle cx="${X(w - 0.22)}" cy="-3.3" r=".1" fill="#e9c46a"/><circle cx="${X(w - 0.24)}" cy="-3.33" r=".035" fill="#fff8d8"/>`;
    const blue = '#45607f', dk = '#364d68', lt = '#516f92', gz = -z1 + 0.42, gh = 2.2, gm = q2(gz + gh / 2);
    return `<rect x="${X(0)}" y="${-z1}" width="${w}" height="${z1}" ${L(blue, 3)}/>
      <rect x="${X(0.24)}" y="${q2(gz - 0.1)}" width="${W(0.48)}" height="${q2(gh + 0.2)}" rx=".05" ${L(dk, 5)}/>
      <rect x="${X(0.32)}" y="${gz}" width="${W(0.64)}" height="${gh}" rx=".03" style="fill:color-mix(in srgb,#dce8ee calc(var(--day)*100%),#4a5878)"/>
      <path d="M${X(0.36)} ${q2(gz + 0.1)} L${X(0.9)} ${q2(gz + gh - 0.15)}" stroke="#fff" stroke-opacity=".45" stroke-width=".06" class="day-only"/>
      <rect x="${X(w / 2 - 0.035)}" y="${gz}" width=".07" height="${gh}" ${L(dk, 5)}/><rect x="${X(0.32)}" y="${q2(gm - 0.035)}" width="${W(0.64)}" height=".07" ${L(dk, 5)}/>
      <rect x="${X(0.24)}" y="-3.3" width="${W(0.48)}" height="2.6" rx=".05" ${L(dk, 2)}/><rect x="${X(0.32)}" y="-3.22" width="${W(0.64)}" height="2.44" rx=".04" ${L(lt, 2)}/>
      <rect x="${X(0.06)}" y="-.42" width="${W(0.12)}" height=".32" rx=".03" ${L('#c9a24e', 0.3)}/>
      <circle cx="${X(w - 0.24)}" cy="-3.55" r=".1" fill="#e9c46a"/><rect x="${X(w - 0.62)}" y="-3.6" width=".4" height=".1" rx=".05" fill="#e9c46a"/><circle cx="${X(w - 0.24)}" cy="-3.2" r=".045" fill="#7a5a2a"/>`;
  }
  function doorArt(d) {
    const { y0, y1 } = d, z1 = DOOR.z1, ym = (y0 + y1) / 2;
    let s = '';
    s += `<g transform="${onX(0.012)}"><path ${F(C.cream, 'L', [0, ym, 3])} fill-rule="evenodd" d="M${-y1 - 0.18} 0 V${-z1 - 0.18} H${-y0 + 0.18} V0 Z M${-y1} 0 V${-z1} H${-y0} V0 Z"/></g>`;
    return s + `<g transform="${onX(0.02)}">${leafArt(d, -y1, q2(y1 - y0), (h, z) => F(h, 'L', [0, ym, z]))}</g>`;
  }
  // by the door: a peg rail with a tote bag and a scarf
  function pegsArt() {
    const y0 = 6.9, y1 = 8.5, z = 5.6;
    let s = `<g transform="${onX(0.03)}"><rect x="${-y1}" y="${q2(-z - 0.1)}" width="${q2(y1 - y0)}" height=".16" rx=".03" ${F(C.walnut, 'L', [0.05, 7.7, z])}/></g>`;
    [7.2, 7.7, 8.2].forEach((y) => { s += bb(0.1, y, z - 0.02, `<circle r="2.6" ${F(C.oakDk, 'L', [0.1, y, z])}/>`); });
    s += bb(0.2, 7.2, z - 0.02, `<path d="M-7 18 C-7 6 -3 0 0 0 C3 0 7 6 7 18" fill="none" stroke-width="2" ${FS('#b8925a', 'L', [0.2, 7.2, z - 0.5])}/><rect x="-13" y="16" width="26" height="30" rx="3" ${F('#e8d3a8', 'L', [0.2, 7.2, z - 1])}/><rect x="-13" y="33" width="26" height="5" ${F('#c95f4c', 'L', [0.2, 7.2, z - 1.2])}/><path d="M-13 19 V43" class="hl"/>`);
    s += bb(0.2, 8.2, z - 0.02, `<path d="M-6 0 Q0 4 6 0 L5 44 L-1 44 L0 7 L-4 40 L-9 40 Z" ${F('#d0675a', 'L', [0.2, 8.2, z - 1])}/><path d="M-1 44 V48 M1.5 44 V48 M4 44 V48 M-9 40 V44 M-6.5 40 V44 M-4 40 V44" stroke-width="1.2" ${FS('#d0675a', 'L', [0.2, 8.2, z - 1.5])}/>`);
    return s;
  }
  // the floor: oak planks and the shadows along the walls
  function floorArt() {
    let s = `<path ${F(C.floor, 't', [4, 4, 0])} d="${poly([[0, 0], [RW, 0], [RW, RD], [0, RD]])}"/>`;
    let planks = '', seams = '';
    for (let i = 0, y = 0; y < RD; y += 0.62, i++) {
      if (i % 2) planks += `<rect x="0" y="${y.toFixed(2)}" width="${RW}" height=".62" fill="#fff" fill-opacity=".05"/>`;
      if (i % 3 === 1) planks += `<rect x="0" y="${y.toFixed(2)}" width="${RW}" height=".62" fill="#5a3518" fill-opacity=".045"/>`;
      seams += `M0 ${y.toFixed(2)} H${RW} `;
      for (let x = (i * 1.37) % 2.6 + 0.4; x < RW; x += 2.6) seams += `M${x.toFixed(2)} ${y.toFixed(2)} v.62 `;
    }
    s += `<g transform="${onZ(0)}">${planks}<path d="${seams}" fill="none" stroke="#6b4426" stroke-opacity=".2" stroke-width=".018"/></g>`;
    // walls meet floor: soft shadows both ways
    s += `<g transform="${onZ(0.002)}"><rect x="0" y="0" width="${RW}" height=".9" fill="url(#aoDn)"/><rect x="0" y="0" width=".9" height="${RD}" fill="url(#aoLR)"/></g>`;
    return s;
  }
  // the light through the windows on the floor (2026-11-10): its panes warm by day, a faint blue of the moon by night, motes of dust
  // drifting down the beam by day
  function sunArt() {
    const sx = 0.32, sy = 0.62;
    return winsHere().map((o) => {
      const h = winHole(o.p), { X0, X1, z0, z1 } = h, Xm = (X0 + X1) / 2, zm = (z0 + z1) / 2, g = 0.07;
      const fl = (X, z) => h.at(X + z * sx, z * sy, 0);
      const pane = (xa, xb, za, zb) => `<path class="sun" d="${poly([fl(xa, za), fl(xb, za), fl(xb, zb), fl(xa, zb)])}"/>`;
      const motes = [[0.3, 0.25, 0], [0.62, 0.4, 1], [0.45, 0.6, 2], [0.75, 0.3, 3], [0.2, 0.55, 4]].map(([u, t, k]) => {
        const X = X0 + (X1 - X0) * u, z = zm + (z1 - z0) * (0.3 - u * 0.4);
        return bb(...h.at(X + t * z * sx, t * z * sy, z * (1 - t)), `<circle r="1.3" class="mote" style="--d:${5 + k * 1.3}s;--w:-${k * 1.7}s"/>`);
      }).join('');
      return pane(X0 + 0.13, Xm - g, zm + g, z1 - 0.13) + pane(Xm + g, X1 - 0.13, zm + g, z1 - 0.13) + pane(X0 + 0.13, Xm - g, z0 + 0.13, zm - g) + pane(Xm + g, X1 - 0.13, z0 + 0.13, zm - g) + motes;
    }).join('');
  }
  function wallShadeArt() {
    return `<g transform="${onY(0)}"><rect x="0" y="-1.4" width="${RW}" height="1.4" fill="url(#aoUp)"/><rect x="0" y="${-RH}" width=".8" height="${RH}" fill="url(#aoLR)"/></g>
      <g transform="${onX(0)}"><rect x="${-RD}" y="-1.4" width="${RD}" height="1.4" fill="url(#aoUp)"/><rect x="-.8" y="${-RH}" width=".8" height="${RH}" fill="url(#aoRL)"/></g>`;
  }
  // a string of lights (1.2.0: four of them, wares): a wire just off its wall, sagging between hooks 0.2 above the middle of
  // where it hangs, a sag every 1.875 along it, four bulbs to a sag. In 書房 the bulbs are an overlay that lights bulb by bulb with
  // today's progress (by night: bulbsHtml); on its own (the storage box, a drag) they are drawn with the wire (DECOR)
  const SAG = 0.32;
  function onString(len, p, t) {   // the point t (0…1) of the way along a string len long hung at p
    const n = Math.round(len / 1.875), s = p.u - len / 2 + t * len, z = p.v + 0.2 - SAG * Math.sin(Math.PI * ((t * n) % 1));
    return p.w === 'L' ? [0.08, s, z] : [s, 0.08, z];
  }
  const wireArt = (len, p) => { const k = Math.round(len / 1.875) * 12; return `<path class="ln" stroke="#3a2a22" stroke-opacity=".55" stroke-width="1" d="${line(Array.from({ length: k + 1 }, (_, i) => onString(len, p, i / k)))}"/>`; };
  const bulbsAt = (len, p) => { const m = Math.round(len / 1.875) * 4; return Array.from({ length: m }, (_, i) => onString(len, p, (i + 0.5) / m)); };
  // ===== furniture =====
  // the bookcase (課程) against the left wall, beside the desk. Its fourth shelf holds the course books, one for every stage begun
  // (入門, then 第一…第五階段), so it fills as the course goes on; the rest never changes: the card box (單字) and word books on the
  // top shelf, a daruma and a stack lying flat (the gap between them waits for N2 and N1), file boxes, storage boxes
  const BC = { x1: 1.3, y0: 0.15, y1: 2.4, z1: 7.3, t: 0.12, levels: [0.34, 1.78, 3.22, 4.66, 6.1, 7.1] };
  const SHELF_Y = [BC.y0 + BC.t + 0.04, BC.y1 - BC.t - 0.04];   // what a shelf holds, from its far end to its near end
  const shelfZ = (k) => [BC.levels[k] + 0.09, BC.levels[k + 1]];   // an opening's floor and top
  const BOOKS = ['#b65d50', '#d8a748', '#5e7f9c', '#86a17a', '#e7dbc6', '#8b6e94', '#40516d', '#c98f6d', '#a9b9ca', '#70594a', '#d3c1a1', '#9d4f4a'];
  // the course books: their shelf, a book's width and its slot (the first at the near end), at most six for now; a colour per level
  // (入門, N5, N4 twice, N3 twice, then N2 and N1 to come) and the stage on a label on the spine
  const SB = { k: 3, w: 0.29, slot: 0.31, max: 6 };
  const bookSlot = (i) => { const y1 = SHELF_Y[1] - i * SB.slot; return [q2(y1 - SB.w), q2(y1)]; };
  function courseBook(i, z0, cur) {   // the stage being studied sticks out a little
    const [y0, y1] = bookSlot(i), x1 = cur ? 1.28 : 1.16, hh = [1.1, 1.2, 1.15, 1.22, 1.13, 1.18][i % 6], ym = q2((y0 + y1) / 2);
    const lab = BOOK_LABELS[i] || '', top = q2(-z0 - hh + 0.14), at = [x1, ym, z0 + hh - 0.3];
    return box(bookColor(i), 0.2, y0, z0, x1, y1, z0 + hh, { t: '#efe6d2' }) + `<g transform="${onX(x1 + 0.002)}">
      <rect x="${q2(-y1 + 0.045)}" y="${top}" width="${q2(SB.w - 0.09)}" height="${lab.length > 1 ? 0.5 : 0.3}" rx=".02" ${F('#f6efdf', 'x', at)}/>
      ${[...lab].map((ch, j) => `<text x="${-ym}" y="${q2(top + 0.225 + j * 0.22)}" font-size=".18" font-weight="700" text-anchor="middle" ${F(C.ink, 'x', at)}>${ch}</text>`).join('')}
      <path d="M${q2(-y1 + 0.04)} ${q2(-z0 - 0.2)} H${q2(-y0 - 0.04)} M${q2(-y1 + 0.04)} ${q2(-z0 - 0.27)} H${q2(-y0 - 0.04)}" stroke="#ecc66a" stroke-opacity=".85" stroke-width=".022"/></g>`;
  }
  function bookcaseArt(bk) {
    const { x1, y0, y1, z1, t, levels } = BC;
    let s = shadow(-0.1, y0 - 0.15, x1 + 0.35, y1 + 0.35, 0.9);
    for (let k = 0; k < levels.length - 1; k++) s += shelfBack(k) + shelfRow(k, bk);   // inside each opening, then what stands in it
    // the frame: the side we see, the top, the front with its openings
    s += qY(C.oak, y1, 0, x1, 0, z1, 'y') + qZ(C.oakTop, z1, 0, x1, y0, y1);
    let holes = '';
    for (let k = 0; k < levels.length - 1; k++) holes += ' ' + poly([[x1, y0 + t, levels[k] + 0.09], [x1, y1 - t, levels[k] + 0.09], [x1, y1 - t, levels[k + 1]], [x1, y0 + t, levels[k + 1]]]);
    s += `<path fill-rule="evenodd" ${F(C.oak, 'x', [x1, (y0 + y1) / 2, 3.6])} d="${poly([[x1, y0, 0], [x1, y1, 0], [x1, y1, z1], [x1, y0, z1]])}${holes}"/>`;
    s += `<path class="hl" d="${line([[0, y1, z1], [x1, y1, z1], [x1, y0, z1]])} ${line([[x1, y1, z1], [x1, y1, 0]])}"/>`;
    levels.slice(1, -1).forEach((z) => { s += `<path class="hl" d="${line([[x1, y0 + t, z + 0.09], [x1, y1 - t, z + 0.09]])}"/>`; });
    return s;
  }
  function shelfBack(k) {   // inside an opening: the back, the right-hand side, the shelf
    const [za, zb] = shelfZ(k), { x1, y0, y1, t } = BC;
    return qX(C.shelfIn, 0.1, y0 + t, y1 - t, za, zb, 'x') + qY(C.shelfIn, y0 + t, 0.1, x1, za, zb, 'y') + qZ(C.oakTop, za, 0.1, x1, y0 + t, y1 - t);
  }
  // what stands on shelf k, far end first; bk: how many course books, the one being studied, and one left out (it is sliding out)
  function shelfRow(k, bk) {
    const [z0, zb] = shelfZ(k), h = zb - z0, [ya, yb] = SHELF_Y;
    let s = '';
    if (k === 4) return cardBoxArt() + plainBooks(CB.y1 + 0.06, yb, z0, h, 21);   // (cardFx draws these books again)
    if (k === SB.k) { for (let i = Math.min(bk.n, SB.max) - 1; i >= 0; i--) if (i !== bk.skip) s += courseBook(i, z0, i === bk.cur); return s; }
    if (k === 2) {
      s += bb(0.98, ya + 0.24, z0, `<ellipse cy="-12" rx="11" ry="12.5" ${F(C.red, 'y', [0.98, ya + 0.5, z0 + 0.3])}/><ellipse cx="-2" cy="-14" rx="6.5" ry="5.5" ${F('#fbe9d5', 'y', [0.98, ya + 0.5, z0 + 0.3])}/><circle cx="-4.2" cy="-14.5" r="1.3" fill="#2a2030"/><circle cx="0.4" cy="-14.5" r="1.3" fill="#2a2030"/><path d="M-8 -21 Q-2 -25 5 -21" class="hl"/><path d="M-6 -4 Q0 -1 6 -4" fill="none" stroke="#f3c64f" stroke-width="1.4"/>`);
      [[0.18, '#e7dbc6'], [0.14, '#5e7f9c'], [0.17, '#b65d50']].reduce((zz, [th, c]) => { s += box(c, 0.25, yb - 0.72, zz, 1.15, yb - 0.02, zz + th, { t: '#efe6d2' }); return zz + th; }, z0);
      return s;
    }
    if (k === 1) return plainBooks(ya, ya + 0.86, z0, h, 6) + fileBox(ya + 0.95, z0, '#c9ab84') + fileBox(ya + 1.33, z0, '#9fb5c9');
    return storeBox(ya, ya + 0.9, z0, h) + storeBox(ya + 0.98, yb, z0, h);
  }
  function plainBooks(y, stop, z0, h, i) {   // a row of books standing from y to stop
    let s = '';
    while (y < stop) {
      const w = [0.15, 0.2, 0.13, 0.17, 0.23, 0.16][i % 6], hh = Math.min(h - 0.1, [1.02, 1.18, 0.9, 1.1, 0.84, 1.14][(i * 5) % 6]);
      if (y + w > stop) break;
      const c = BOOKS[(i * 7) % BOOKS.length];
      s += box(c, 0.22 + (i % 3) * 0.03, y, z0, 1.16, y + w, z0 + hh, { t: '#ece3d0' });
      s += `<path class="ln" stroke="#fff" stroke-opacity=".35" stroke-width="1" d="${line([[1.161, y + 0.02, z0 + hh - 0.16], [1.161, y + w - 0.02, z0 + hh - 0.16]])} ${line([[1.161, y + 0.02, z0 + 0.14], [1.161, y + w - 0.02, z0 + 0.14]])}"/>`;
      y += w + 0.012; i++;
    }
    return s;
  }
  function fileBox(y, z0, c) {   // a magazine file, its label near the top
    return box(c, 0.25, y, z0, 1.12, y + 0.32, z0 + 1.0, { hlv: true }) + `<g transform="${onX(1.122)}"><rect x="${q2(-y - 0.26)}" y="${q2(-z0 - 0.86)}" width=".2" height=".2" rx=".02" ${F(C.paper, 'x', [1.12, y + 0.16, z0 + 0.75])}/></g>`;
  }
  function storeBox(y0, y1, z0, h) {   // a kraft storage box: its lid, a hand hole
    const top = z0 + Math.min(0.92, h - 0.14), ym = q2((y0 + y1) / 2);
    return box('#cfae84', 0.22, y0, z0, 1.2, y1, top, { t: '#dcc09a', hlv: true }) + qX('#bf9b6e', 1.201, y0, y1, top - 0.16, top, 'x')
      + `<g transform="${onX(1.202)}"><rect x="${q2(-ym - 0.16)}" y="${q2(-top + 0.3)}" width=".32" height=".1" rx=".05" fill="#3e2a1c" fill-opacity=".5"/></g>`;
  }
  // the card box (單字) at the far end of the top shelf: index cards standing in it, two with tabs, its walls in front of them
  const CB = (() => { const y0 = q2(SHELF_Y[0] + 0.02); return { x0: 0.4, x1: 1.24, y0, y1: q2(y0 + 0.9), z: shelfZ(4)[0], h: 0.3 }; })();
  function indexCard(y, z0, top, col, tab) {   // tab: its colour and where along the card, or none
    let s = box(col, CB.x0 + 0.08, y, z0, CB.x1 - 0.08, y + 0.035, top, { x: false, hl: false });
    s += `<path class="ln" stroke="#8a6a4a" stroke-opacity=".35" stroke-width=".8" d="${line([[CB.x0 + 0.08, y + 0.035, top], [CB.x1 - 0.08, y + 0.035, top]])}"/>`;
    return tab ? s + qY(tab[0], y + 0.035, tab[1], tab[1] + 0.2, top, top + 0.12, 'y') : s;
  }
  function cardBoxWalls() {
    const { x0, x1, y0, y1, z, h } = CB;
    return box(C.oakDk, x0, y0, z, x1, y1, z + h, { t: false }) + `<g transform="${onX(x1 + 0.002)}"><rect x="${(-y1 + 0.28).toFixed(2)}" y="${(-z - 0.27).toFixed(2)}" width=".3" height=".19" rx=".02" ${F(C.paper, 'x', [x1, (y0 + y1) / 2, z + 0.2])}/><text x="${(-y1 + 0.43).toFixed(2)}" y="${(-z - 0.13).toFixed(2)}" font-size=".14" font-weight="700" text-anchor="middle" fill="#6e4a31">あ</text></g>`;
  }
  function cardBoxArt() {
    const { x0, x1, y0, y1, z, h } = CB;
    let s = qZ(C.shelfIn, z + h, x0, x1, y0, y1);
    for (let i = 0; i < 5; i++) s += indexCard(y0 + 0.12 + i * 0.15, z + 0.06, z + 0.5 + [0, 0.04, 0.02, 0.06, 0][i], i % 2 ? '#f6f1e6' : C.paper, i === 1 ? ['#f2a65a', 0.58] : i === 3 ? ['#7fb2d9', 0.84] : null);
    return s + cardBoxWalls();
  }
  // ===== furniture in the middle stop =====
  // the desk under the window: nothing on it to tap but the notebook (今日練習) and the headphones (聽一輪); the lamp leans over
  // the notebook, with a pencil cup and a mug around them
  const DESK = { x0: 1.4, x1: 5.2, y1: 2.4, z0: 2.85, z1: 3.05 };
  const NB = { x0: 2.3, x1: 3.94, y0: 1.0, y1: 2.24 };   // the notebook, open on the desk
  const HP = { x: 4.66, y: 0.98, a: 62 };   // the headphones on the desk: their middle and how far they are turned (degrees)
  const MUG = [4.74, 2.0];
  function deskArt() {
    const { x0, x1, y1, z0, z1 } = DESK, g = 0.17;
    let s = shadow(x0 - 0.15, -0.1, x1 + 0.3, y1 + 0.45, 0.85);
    // legs and aprons, back to front, then the top
    s += box(C.oakDk, x0 + 0.1, 0.06, 0, x0 + 0.1 + g, 0.06 + g, z0, { hl: false }) + box(C.oakDk, x1 - 0.1 - g, 0.06, 0, x1 - 0.1, 0.06 + g, z0, { hl: false });
    s += box(C.oak, x0 + 0.1 + g, 0.08, z0 - 0.34, x1 - 0.1 - g, 0.15, z0, { t: false, hl: false });
    s += box(C.oakDk, x1 - 0.12 - g, 0.06 + g, z0 - 0.34, x1 - 0.12, y1 - 0.1 - g, z0, { t: false, y: false, hl: false });
    s += box(C.oakDk, x0 + 0.1, y1 - 0.1 - g, 0, x0 + 0.1 + g, y1 - 0.1, z0, { hlv: true }) + box(C.oakDk, x1 - 0.1 - g, y1 - 0.1 - g, 0, x1 - 0.1, y1 - 0.1, z0, { hlv: true });
    s += box(C.oak, x0 + 0.1 + g, y1 - 0.2, z0 - 0.34, x1 - 0.1 - g, y1 - 0.12, z0, { t: false });
    s += box(C.oakTop, x0, 0, z0, x1, y1, z1, { y: C.oak, x: C.oakDk, hlv: true });
    // the lamp: a weighted base at the back left, an elbow arm, the shade over the notebook
    s += bb(1.86, 0.5, z1, `<ellipse cy="1" rx="11" ry="4.8" ${F('#474d63', 't', [1.86, 0.55, 3.1])}/><ellipse cy="-1" rx="11" ry="4.8" ${F(C.steel, 't', [1.86, 0.5, 3.1])}/><path d="M-9 -2.5 Q0 -6 9 -2.5" class="hl"/>`);
    s += `<path class="ln" stroke-width="3" ${FS(C.steel, 'y', [1.8, 0.5, 4])} d="M${pt(1.86, 0.5, z1 + 0.04)} L${pt(1.7, 0.4, 4.72)} L${pt(2.5, 0.9, 5.0)}"/>`;
    s += bb(1.7, 0.4, 4.72, `<circle r="2.8" ${F('#6b7390', 'y', [1.7, 0.45, 4.7])}/>`);
    s += bb(2.52, 0.92, 5.0, `<g transform="rotate(-6)"><rect x="-4.5" y="-6" width="9" height="5" rx="1.5" ${F('#4a5068', 'y', [2.5, 0.95, 5])}/><path ${F(C.mustard, 'y', [2.5, 0.95, 4.85])} d="M-5 -2 L5 -2 L14 15 L-14 15 Z"/><path d="M-5 -2 L-14 15" class="hl"/><ellipse cy="15" rx="14" ry="4.2" fill="#fff4d2"/><circle cy="14" r="4" fill="#fffbea"/></g>`);
    // the pencil cup
    s += bb(2.3, 0.45, z1, `<rect x="-6" y="-15" width="12" height="15" rx="2" ${F('#7d97b8', 'y', [2.3, 0.5, 3.3])}/><ellipse cy="-15" rx="6" ry="2.4" fill="#2b2f3f" fill-opacity=".5"/><path class="ln" stroke-width="2" stroke="#e8b04a" d="M-2 -15 L-4 -26"/><path class="ln" stroke-width="2" stroke="#d05a4b" d="M1 -15 L2 -28"/><path class="ln" stroke-width="2" stroke="#5a68d8" d="M3 -15 L6 -24"/><path d="M-6 -12 V-2" class="hl"/>`);
    // the notebook, open, a pencil and a ribbon
    const { x0: nx0, x1: nx1, y0: ny0, y1: ny1 } = NB, nm = (nx0 + nx1) / 2, zb = z1;
    s += shadow(nx0 - 0.06, ny0 - 0.02, nx1 + 0.14, ny1 + 0.16, 0.55, zb + 0.002);
    s += box(C.accent, nx0, ny0, zb, nx1, ny1, zb + 0.05, { t: C.accent, y: C.accentDk, x: C.accentDk });
    s += `<g transform="${onZ(zb + 0.051)}">
      <path ${F(C.paper, 't', [nm - 0.35, 1.6, zb])} d="M${nx0 + 0.07} ${ny0 + 0.06} Q${nm - 0.35} ${ny0 + 0.02} ${nm - 0.02} ${ny0 + 0.1} V${ny1 - 0.06} Q${nm - 0.35} ${ny1 - 0.1} ${nx0 + 0.07} ${ny1 - 0.06} Z"/>
      <path ${F(C.paper, 't', [nm + 0.35, 1.6, zb])} d="M${nx1 - 0.07} ${ny0 + 0.06} Q${nm + 0.35} ${ny0 + 0.02} ${nm + 0.02} ${ny0 + 0.1} V${ny1 - 0.06} Q${nm + 0.35} ${ny1 - 0.1} ${nx1 - 0.07} ${ny1 - 0.06} Z"/>
      <path d="M${nm} ${ny0 + 0.1} V${ny1 - 0.06}" stroke="#2b1c12" stroke-opacity=".18" stroke-width=".04"/>
      <path d="${[0.3, 0.46, 0.62, 0.78, 0.94, 1.1].map((v) => `M${(nx0 + 0.18).toFixed(2)} ${(ny0 + v).toFixed(2)} H${(nm - 0.12).toFixed(2)} M${(nm + 0.12).toFixed(2)} ${(ny0 + v).toFixed(2)} H${(nx1 - 0.18).toFixed(2)}`).join(' ')}" stroke="${C.line}" stroke-width=".022"/>
      <path d="M${nx0 + 0.2} ${ny0 + 0.26} h.32 M${nx0 + 0.2} ${ny0 + 0.42} h.52 M${nm + 0.14} ${ny0 + 0.26} h.4" stroke="#3b3653" stroke-opacity=".55" stroke-width=".035" stroke-linecap="round"/>
      <path d="M${nm + 0.25} ${ny1 - 0.06} v.34 l.06 -.07 l.06 .07 v-.34" fill="#e2574c"/>
    </g>`;
    s += `<path class="ln" stroke-width="3.2" stroke="#f2c14e" d="M${pt(nm + 0.2, ny1 - 0.28, zb + 0.08)} L${pt(nx1 - 0.15, ny0 + 0.32, zb + 0.08)}"/><path class="ln" stroke-width="3.2" stroke="#f6d9b0" d="M${pt(nm + 0.12, ny1 - 0.22, zb + 0.08)} L${pt(nm + 0.2, ny1 - 0.28, zb + 0.08)}"/><path class="ln" stroke-width="3.2" stroke="#e98a8a" d="M${pt(nx1 - 0.15, ny0 + 0.32, zb + 0.08)} L${pt(nx1 - 0.08, ny0 + 0.27, zb + 0.08)}"/>`;
    // the mug
    s += bb(MUG[0], MUG[1], zb, `<ellipse cy="0" rx="9" ry="3.6" fill="#2b1c12" fill-opacity=".14"/><path ${F('#f3efe6', 'y', [MUG[0], MUG[1] + 0.1, 3.3])} d="M-7.5 -16 V-2 Q-7.5 1 0 1 Q7.5 1 7.5 -2 V-16 Z"/><path d="M7.5 -12 q6 0 6 4.5 q0 4.5 -6 4.5" fill="none" stroke-width="2.2" ${FS('#e5dfd3', 'x', [MUG[0], MUG[1], 3.3])}/><ellipse cy="-16" rx="7.5" ry="2.8" fill="#9a6a3a"/><ellipse cy="-16" rx="7.5" ry="2.8" fill="none" stroke="#fff" stroke-opacity=".6" stroke-width=".8"/><path d="M-7.5 -12 V-3" class="hl"/><path d="M-3 -8 h6" stroke="#5a68d8" stroke-width="1.6" stroke-linecap="round" stroke-opacity=".7"/>`);
    return s;
  }
  // the headphones lying on the desk (1.3.0, no stand): two ear cups on their backs, the band lying between them, turned a little;
  // drawn on a layer of their own (phonesFx), to be picked up
  function phonesArt() {
    const { x: hx, y: hy, a } = HP, z = DESK.z1, w = 0.34, at = (dz) => [hx, hy, z + dz];
    const plane = (dz, inner) => `<g transform="${onZ(z + dz)}"><g transform="rotate(${a} ${hx} ${hy})">${inner}</g></g>`;
    const cups = (dz, c, face, rx = 0.17, ry = 0.21) => plane(dz, [-w, w].map((d) => `<ellipse cx="${q2(hx + d)}" cy="${hy}" rx="${rx}" ry="${ry}" ${F(c, face, at(dz))}/>`).join(''));
    const band = `M${q2(hx - w)} ${q2(hy - 0.12)} C${q2(hx - w)} ${q2(hy - 0.66)} ${q2(hx + w)} ${q2(hy - 0.66)} ${q2(hx + w)} ${q2(hy - 0.12)}`;
    let s = plane(0.003, [-w, w].map((d) => `<ellipse cx="${q2(hx + d + 0.04)}" cy="${q2(hy + 0.05)}" rx=".24" ry=".27" fill="#2b1c12" fill-opacity=".16"/>`).join(''));
    s += plane(0.05, `<path d="${band}" fill="none" stroke-width=".11" stroke-linecap="round" ${FS(C.accentDk, 'y', at(0.05))}/>`);
    s += plane(0.09, `<path d="${band}" fill="none" stroke-width=".1" stroke-linecap="round" ${FS(C.accent, 't', at(0.09))}/><path d="${band}" fill="none" stroke-width=".035" stroke-linecap="round" ${FS('#ece5d8', 't', at(0.1))} transform="translate(0 .03)"/>`);
    for (let dz = 0.02; dz < 0.15; dz += 0.03) s += cups(dz, '#2f3552', 'y');
    s += cups(0.16, C.accent, 't') + cups(0.165, '#2f3552', 't', 0.1, 0.13);
    s += plane(0.17, `<path d="M${q2(hx - w - 0.12)} ${q2(hy - 0.1)} A.17 .21 0 0 1 ${q2(hx - w + 0.05)} ${q2(hy - 0.19)}" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width=".025"/>`);
    return s;
  }
  // the chair, pulled out from the desk a little, its back to the room (test, roomV 8: drawn again — a seat board on an apron,
  // stretchers low between the legs, a thick cushion with piping and a button, a back of two posts, two spindles and a curved crest)
  function chairArt() {
    const x0 = 2.85, x1 = 3.95, y0 = 2.62, y1 = 3.7, zs = 1.72, g = 0.12, xm = (x0 + x1) / 2, ym = (y0 + y1) / 2;
    const leg = (x, y) => box(C.oakDk, x, y, 0, x + g, y + g, zs, { hl: false });
    let s = shadow(x0 - 0.05, y0 - 0.05, x1 + 0.2, y1 + 0.2, 0.7);
    s += leg(x0 + 0.05, y0 + 0.05) + leg(x1 - 0.05 - g, y0 + 0.05) + leg(x0 + 0.05, y1 - 0.05 - g);
    s += box(C.oakDk, x0 + 0.12, y1 - 0.14, 0.48, x1 - 0.12, y1 - 0.08, 0.56, { hl: false }) + box(C.oakDk, x1 - 0.14, y0 + 0.12, 0.48, x1 - 0.08, y1 - 0.12, 0.56, { hl: false });
    s += box(C.oak, x0 + 0.06, y0 + 0.06, zs - 0.22, x1 - 0.06, y1 - 0.06, zs, { t: false, hl: false }) + leg(x1 - 0.05 - g, y1 - 0.05 - g);
    s += box(C.oak, x0, y0, zs, x1, y1, zs + 0.1, { t: C.oakTop });
    s += box('#c99a3e', x0 + 0.08, y0 + 0.08, zs + 0.1, x1 - 0.08, y1 - 0.2, zs + 0.24, { t: false, hl: false });
    s += `<g transform="${onZ(zs + 0.24)}"><rect x="${x0 + 0.06}" y="${y0 + 0.06}" width="${q2(x1 - x0 - 0.12)}" height="${q2(y1 - y0 - 0.24)}" rx=".18" ${F(C.mustard, 't', [xm, ym, 2])}/>
      <rect x="${x0 + 0.16}" y="${y0 + 0.16}" width="${q2(x1 - x0 - 0.32)}" height="${q2(y1 - y0 - 0.44)}" rx=".12" fill="none" stroke="#a87c2e" stroke-opacity=".35" stroke-width=".03" stroke-dasharray=".07 .05"/>
      <circle cx="${q2(xm)}" cy="${q2(ym - 0.06)}" r=".05" ${F('#b8862e', 't', [xm, ym, 2])}/></g>`;
    return s;
  }
  function chairBackArt() {   // the back: two posts from the back corners, a rail low down, two spindles up to a curved crest
    const x0 = 2.85, x1 = 3.95, y1 = 3.7, zs = 1.72, g = 0.12, xm = (x0 + x1) / 2;
    const crest = (y, h) => `<g transform="${onY(y)}"><path ${F(h, 'y', [xm, y, 3.75])} d="M${x0 + 0.01} -3.4 V-3.8 Q${q2(xm)} -4.16 ${x1 - 0.01} -3.8 V-3.4 Q${q2(xm)} -3.58 ${x0 + 0.01} -3.4 Z"/></g>`;
    let s = box(C.oakDk, x0 + 0.05, y1 - 0.14, zs + 0.1, x0 + 0.05 + g, y1 - 0.02, 3.6, { hl: false }) + box(C.oakDk, x1 - 0.05 - g, y1 - 0.14, zs + 0.1, x1 - 0.05, y1 - 0.02, 3.6, { hl: false });
    s += box(C.oak, x0 + 0.17, y1 - 0.11, 2.5, x1 - 0.17, y1 - 0.05, 2.62, {});
    [-0.17, 0.17].forEach((d) => { s += box(C.oak, xm + d - 0.035, y1 - 0.1, 2.62, xm + d + 0.035, y1 - 0.06, 3.5, { hl: false }); });
    return s + crest(y1 - 0.13, C.oakDk) + crest(y1 - 0.02, C.oak);
  }
  // a round rug on the floor
  function rugArt(cx, cy, r, body, ring) {
    return `<g transform="${onZ(0.015)}"><circle cx="${cx}" cy="${cy}" r="${r + 0.08}" fill="#2b1c12" fill-opacity=".1"/><circle cx="${cx}" cy="${cy}" r="${r}" ${F(body, 't', [cx, cy, 0])}/>
      <circle cx="${cx}" cy="${cy}" r="${r - 0.22}" fill="none" stroke-width=".14" ${FS(ring, 't', [cx, cy, 0])}/><circle cx="${cx}" cy="${cy}" r="${r - 0.48}" fill="none" stroke-width=".04" ${FS(ring, 't', [cx, cy, 0])}/>
      <circle cx="${cx}" cy="${cy}" r="${(r * 0.38).toFixed(2)}" fill="none" stroke-width=".07" stroke-dasharray=".14 .1" ${FS(ring, 't', [cx, cy, 0])}/></g>`;
  }

  // ===== the right-hand stop: the chest of drawers (錯題本 in its top drawer), the cork board (學習分析), the calendar =====
  const DR = { x0: 7.25, x1: 9.65, y1: 1.7, h: 3.3 };
  const DRW = { x0: DR.x0 + 0.12, x1: DR.x1 - 0.12, z0: 2.52, z1: 3.14, out: 0.62, depth: 1.3 };   // the top drawer, and how far it comes out
  const knob = (x, z, y) => bb(x, y + 0.02, z, `<circle r="3.2" ${F('#e6c36a', 'y', [x, y, z])}/><circle cx="-1" cy="-1" r="1.1" fill="#fff8d8" fill-opacity=".8"/>`);
  function chestArt() {
    const { x0, x1, y1, h } = DR, xm = (x0 + x1) / 2;
    let s = shadow(x0 - 0.12, -0.1, x1 + 0.3, y1 + 0.85, 0.85);
    s += box(C.oakDk, x0 + 0.1, 0.06, 0, x1 - 0.1, y1 - 0.06, 0.22, { hl: false });
    s += box(C.oak, x0, 0, 0.22, x1, y1, h, { t: C.oakTop, x: C.oakDk, hlv: true });
    [[0.36, 1.34], [1.44, 2.42], [DRW.z0, DRW.z1]].forEach(([a, b]) => {
      s += qY(C.oakTop, y1 + 0.004, x0 + 0.12, x1 - 0.12, a, b, 'y') + `<path class="hl" d="${line([[x0 + 0.12, y1 + 0.005, b], [x1 - 0.12, y1 + 0.005, b]])}"/>`;
      s += knob(xm - 0.55, (a + b) / 2, y1) + knob(xm + 0.55, (a + b) / 2, y1);
    });
    // on top: a photo, a little mushroom lamp, a small plant
    s += bb(7.85, 0.45, h, `<path ${F(C.walnut, 'y', [7.85, 0.5, 3.7])} d="M-11 0 L-9 -22 H9 L11 0 Z"/><path ${F('#cfe0e8', 'y', [7.85, 0.5, 3.7])} d="M-7.5 -3 L-6.3 -19 H6.3 L7.5 -3 Z"/><path d="M-7.2 -7 Q-2 -14 2 -9 Q5 -6 7.3 -9 L7.5 -3 H-7.5 Z" fill="#8fbf86"/><circle cx="3" cy="-14.5" r="2.2" fill="#fff6c8"/>`);
    s += bb(9.1, 0.45, h, `<ellipse rx="8" ry="3.2" fill="#2b1c12" fill-opacity=".14"/><rect x="-2" y="-14" width="4" height="14" ${F('#efe6d6', 'y', [9.1, 0.5, 3.6])}/><path ${F('#f2d9b8', 'y', [9.1, 0.5, 4.1])} d="M-13 -13 C-13 -28 13 -28 13 -13 Q0 -10 -13 -13 Z"/><path d="M-11 -17 C-9 -24 -3 -26 2 -26" fill="none" stroke="#fff" stroke-opacity=".6" stroke-width="1.2"/><ellipse cy="-13" rx="12" ry="2.6" fill="#fff6dc" fill-opacity=".9"/>`);
    s += bb(8.55, 1.05, h, `<ellipse rx="8" ry="3.2" fill="#2b1c12" fill-opacity=".14"/><path ${F('#e9dccb', 'y', [8.55, 1.1, 3.5])} d="M-6.5 -1 L-5.5 -10 H5.5 L6.5 -1 Z"/><g ${F(C.leaf, 'y', [8.55, 1.05, 3.9])}><circle cx="-4" cy="-14" r="4.5"/><circle cx="3" cy="-16" r="5"/><circle cx="0" cy="-21" r="4.2"/><circle cx="5.5" cy="-11.5" r="3.4"/></g>`);
    return s;
  }
  // the top drawer sliding out (ROOM.pull), on a small layer of its own over the chest: the dark slot it leaves, then the drawer on
  // its way out, clipped to the opening and the space in front of it so the part still inside the chest never shows
  const DRW_HULL = (() => { const { x0, x1, z0, z1, out } = DRW, y = DR.y1, f = y + out + 0.1; return [[x0 - 0.06, y, z1 + 0.05], [x1 + 0.06, y, z1 + 0.05], [x1 + 0.06, y, z0 - 0.08], [x1 + 0.06, f, z0 - 0.08], [x0 - 0.06, f, z0 - 0.08], [x0 - 0.06, f, z1 + 0.05]]; })();
  const DRW_BOX = (() => { const p = DRW_HULL.map((q) => P(...q)), xs = p.map((q) => q[0]), ys = p.map((q) => q[1]); return [Math.min(...xs) - 8, Math.min(...ys) - 8, Math.max(...xs) - Math.min(...xs) + 16, Math.max(...ys) - Math.min(...ys) + 16]; })();
  function drawerFx() {
    const { x0, x1, z0, z1, out, depth } = DRW, y1 = DR.y1, f = y1 + out, xm = (DR.x0 + DR.x1) / 2;
    const parts = qZ(C.shelfIn, z0 + 0.05, x0 + 0.06, x1 - 0.06, f - depth, f - 0.07) + qX(C.oakDk, x0 + 0.06, f - depth, f - 0.07, z0 + 0.05, z1, 'x')
      + box(C.red, x0 + 0.25, f - 1.0, z0 + 0.05, x0 + 1.05, f - 0.12, z0 + 0.18, { t: '#d86a5a', y: '#b84a3e', x: '#a8443a' })
      + box('#c94c40', x0 + 1.15, f - 0.9, z0 + 0.05, x0 + 1.95, f - 0.12, z0 + 0.14, { t: '#d65f52', y: '#b0443a', x: '#9e3e35' })
      + `<g transform="${onZ(z0 + 0.181)}"><rect x="${(x0 + 0.42).toFixed(2)}" y="${(f - 0.72).toFixed(2)}" width=".46" height=".18" rx=".02" fill="#fff" fill-opacity=".88"/></g>`
      + box(C.oak, x1 - 0.06, f - depth, z0, x1, f, z1, { y: false }) + box(C.oakTop, x0, f - 0.07, z0, x1, f, z1, { hlv: true })
      + knob(xm - 0.55, (z0 + z1) / 2, f) + knob(xm + 0.55, (z0 + z1) / 2, f);
    const [ddx, ddy] = mover('chest').d;
    return `<svg class="drawer-fx" viewBox="${DRW_BOX.map((v) => v.toFixed(1)).join(' ')}" style="${vbPct(DRW_BOX[0] + ddx, DRW_BOX[1] + ddy)};${vbSize(DRW_BOX[2], DRW_BOX[3])}" aria-hidden="true">
      <defs><clipPath id="drawerClip" clipPathUnits="userSpaceOnUse"><path d="${poly(DRW_HULL)}"/></clipPath></defs>
      ${qY(C.shelfIn, y1 + 0.006, x0, x1, z0, z1, 'y')}
      <g clip-path="url(#drawerClip)"><g class="dw-slide" style="--dwx:${(out * S).toFixed(1)}px;--dwy:${(-out * S / 2).toFixed(1)}px">${parts}</g></g>
    </svg>`;
  }
  // the cork board above it: a pinned chart and two notes
  const BD = { x0: 7.35, x1: 9.55, z0: 4.45, z1: 6.55 };
  function boardArt() {
    const { x0, x1, z0, z1 } = BD, xm = (x0 + x1) / 2, zm = (z0 + z1) / 2;
    const pin = (x, z, c) => `<circle cx="${x}" cy="${-z}" r=".06" fill="${c}"/><circle cx="${x - 0.02}" cy="${-z - 0.02}" r=".02" fill="#fff" fill-opacity=".8"/>`;
    return `<g transform="${onY(0.03)}"><rect x="${x0 + 0.06}" y="${-z1 + 0.08}" width="${x1 - x0}" height="${z1 - z0}" fill="#2b1c12" fill-opacity=".13"/></g>
      ${box(C.walnut, x0, 0, z0, x1, 0.07, z1, { t: false })}
      <g transform="${onY(0.071)}">
        <rect x="${x0 + 0.1}" y="${-z1 + 0.1}" width="${x1 - x0 - 0.2}" height="${z1 - z0 - 0.2}" ${F('#cfa679', 'y', [xm, 0.07, zm])}/>
        <rect x="${x0 + 0.1}" y="${-z1 + 0.1}" width="${x1 - x0 - 0.2}" height="${z1 - z0 - 0.2}" fill="url(#cork)"/>
        <g transform="rotate(-3 ${x0 + 0.62} ${-zm})">
          <rect x="${x0 + 0.22}" y="${-z1 + 0.3}" width="1.0" height="1.45" ${F(C.paper, 'y', [xm, 0.07, zm])}/>
          <path d="M${x0 + 0.34} ${-z1 + 0.48} h.5" stroke="#3b3653" stroke-opacity=".5" stroke-width=".05" stroke-linecap="round"/>
          ${[[0.36, 0.34], [0.54, 0.52], [0.72, 0.46], [0.9, 0.72]].map(([dx, hh]) => `<rect x="${(x0 + dx).toFixed(2)}" y="${(-z0 - 0.42 - hh).toFixed(2)}" width=".12" height="${hh}" ${F(C.accent, 'y', [xm, 0.07, zm])}/>`).join('')}
          <path d="M${x0 + 0.3} ${-z0 - 0.4} h.82" stroke="#3b3653" stroke-opacity=".35" stroke-width=".02"/>
          <path d="M${x0 + 0.36} ${-z0 - 1.0} L${x0 + 0.6} ${-z0 - 1.12} L${x0 + 0.78} ${-z0 - 1.06} L${x0 + 1.02} ${-z0 - 1.32}" fill="none" stroke="#e2574c" stroke-width=".035" stroke-linejoin="round"/>
          ${pin(x0 + 0.72, z1 - 0.38, '#e2574c')}
        </g>
        <g transform="rotate(4 ${x1 - 0.55} ${-z1 + 0.62})"><rect x="${x1 - 0.86}" y="${-z1 + 0.28}" width=".64" height=".64" ${F('#f6dd73', 'y', [xm, 0.07, zm])}/>
          <path d="M${x1 - 0.76} ${-z1 + 0.5} h.42 M${x1 - 0.76} ${-z1 + 0.64} h.34 M${x1 - 0.76} ${-z1 + 0.78} h.4" stroke="#6b5a2a" stroke-opacity=".5" stroke-width=".035" stroke-linecap="round"/>${pin(x1 - 0.54, z1 - 0.34, '#5a68d8')}</g>
        <g transform="rotate(-5 ${x1 - 0.55} ${-z0 - 0.6})"><rect x="${x1 - 0.84}" y="${-z0 - 0.92}" width=".6" height=".6" ${F('#f4b8b0', 'y', [xm, 0.07, zm])}/>
          <path d="M${x1 - 0.54} ${-z0 - 0.4} c-.13 0 -.2 -.1 -.2 -.2 c0 -.12 .1 -.16 .12 -.28 c.06 .06 .08 .1 .08 .16 c.05 -.04 .07 -.1 .07 -.16 c.08 .08 .13 .17 .13 .28 c0 .1 -.08 .2 -.2 .2 Z" fill="#e8743a"/>${pin(x1 - 0.54, z0 + 0.88, '#4f9a52')}</g>
      </g>`;
  }
  // a tall plant in the corner past the calendar
  function plantArt(x, y) {
    let leaves = '';
    [[-40, -62, -14], [34, -70, 12], [-14, -92, -4], [16, -96, 6], [-48, -30, -24], [46, -36, 22], [2, -66, 0]].forEach(([lx, ly, rot], i) => {
      leaves += `<g transform="translate(${lx} ${ly}) rotate(${rot})"><path ${F(i % 2 ? C.leafDk : C.leaf, 'y', [x, y + 0.2, 2.6])} d="M0 16 C-16 12 -20 -6 -12 -16 C-6 -22 6 -22 12 -16 C20 -6 16 12 0 16 Z"/><path d="M0 14 V-16" stroke="#2f5a32" stroke-opacity=".45" stroke-width="1.2"/><path d="M-12 -4 l6 2 M12 -4 l-6 2 M-13 6 l7 1 M13 6 l-7 1" stroke="#fff" stroke-opacity=".28" stroke-width="1.6"/></g>`;
    });
    const stems = [[-40, -62], [34, -70], [-14, -92], [16, -96], [-48, -30], [46, -36], [2, -66]].map(([lx, ly]) => `M0 -40 Q${lx * 0.3} ${ly * 0.6} ${lx} ${ly + 14}`).join(' ');
    return shadow(x - 0.6, y - 0.6, x + 0.75, y + 0.75, 0.7) + box('#ece4d6', x - 0.42, y - 0.42, 0, x + 0.42, y + 0.42, 1.05, { t: '#5a3d28', hlv: true })
      + bb(x, y, 1.05, `<path d="${stems}" fill="none" stroke="#3f7a42" stroke-width="2.2" stroke-linecap="round"/>${leaves}`);
  }

  // ===== the bed (nothing to tap, in the bedroom since 1.3.0) against the right wall, the night table beside it with a reading
  // lamp and an alarm clock, a night-sky picture over it, a rug and slippers; a hiragana chart (書房) =====
  const BED = { x0: 17.0, x1: 19.9, y1: 5.25 };
  const NT = { x0: 15.75, x1: 16.75, y0: 0.05, y1: 1.05, h: 1.75 };
  function bedArt() {
    const { x0, x1, y1 } = BED, xm = (x0 + x1) / 2, hb = 0.24;
    let s = shadow(x0 - 0.2, 0, x1 + 0.4, y1 + 0.4, 0.85);
    // the headboard, two soft panels on the side facing the pillow
    s += box(C.walnut, x0, 0.02, 0, x1, 0.02 + hb, 2.95, { t: C.oak, hlv: true });
    s += `<g transform="${onY(0.02 + hb + 0.003)}">${[[x0 + 0.18, xm - 0.06], [xm + 0.06, x1 - 0.18]].map(([a, b]) => `<rect x="${q2(a)}" y="-2.74" width="${q2(b - a)}" height="1.3" rx=".14" ${F('#c49b74', 'y', [(a + b) / 2, 0.3, 2.1])}/>`).join('')}</g>`;
    // the frame on short legs, the mattress, the pillow puffed up
    s += box(C.oakDk, x0 + 0.06, y1 - 0.22, 0, x0 + 0.22, y1 - 0.06, 0.26, { hl: false }) + box(C.oakDk, x1 - 0.22, y1 - 0.22, 0, x1 - 0.06, y1 - 0.06, 0.26, { hl: false });
    s += box(C.oak, x0, 0.26, 0.26, x1, y1, 0.66, { t: false, hlv: true });
    s += box('#f5f0e6', x0 + 0.05, 0.28, 0.66, x1 - 0.05, y1 - 0.05, 1.16, { hlv: true });
    s += box('#e6dfd2', x0 + 0.32, 0.42, 1.16, x1 - 0.32, 1.38, 1.4, { t: false, hl: false });
    s += `<g transform="${onZ(1.4)}"><rect x="${q2(x0 + 0.3)}" y=".4" width="${q2(x1 - x0 - 0.6)}" height="1" rx=".22" ${F('#fdfbf6', 't', [xm, 0.9, 1.4])}/><path d="M${q2(x0 + 0.55)} .9 H${q2(x1 - 0.55)}" stroke="#d9d0bf" stroke-width=".03" stroke-linecap="round"/></g>`;
    // the duvet from below the pillow to past the foot, hanging over the side and the foot, the sheet turned back over its top
    const dx = q2(x1 + 0.1), dy = q2(y1 + 0.08), dt = 1.34, d0 = 1.62;
    s += qY('#8eaacb', dy, x0 - 0.02, dx, 0.74, dt) + qX('#86a2c4', dx, d0, dy, 0.7, dt) + qZ('#9db7d6', dt, x0 - 0.02, dx, d0, dy);
    s += `<g transform="${onZ(dt + 0.002)}"><path d="${[2.7, 3.55].map((y) => `M${q2(x0 + 0.06)} ${y} H${q2(dx - 0.06)}`).join(' ')}" stroke="#6f8db2" stroke-opacity=".45" stroke-width=".03"/>
      <rect x="${q2(x0 - 0.02)}" y="${d0}" width="${q2(dx - x0 + 0.02)}" height=".42" ${F('#f8f5ee', 't', [xm, 1.8, dt])}/></g>`;
    s += qX('#f1ede4', dx + 0.003, d0, d0 + 0.42, 1.0, dt + 0.002, 'x');
    s += `<path class="hl" d="${line([[x0 - 0.02, dy, dt], [dx, dy, dt], [dx, d0, dt]])}"/>`;
    // a mustard throw across the foot
    const t0 = q2(y1 - 1.2), t1 = q2(y1 - 0.52);
    s += qZ(C.mustard, dt + 0.03, x0 - 0.04, dx + 0.04, t0, t1) + qX('#d3a443', dx + 0.042, t0, t1, 0.5, dt + 0.03) + qY('#c99a3e', t1, x0 - 0.04, dx + 0.04, dt - 0.02, dt + 0.03);
    s += `<path class="hl" d="${line([[x0 - 0.04, t1, dt + 0.03], [dx + 0.04, t1, dt + 0.03], [dx + 0.04, t0, dt + 0.03]])}"/>`;
    return s;
  }
  // the duvet pulled up over the hero asleep (test, 2026-11-09): drawn over him, soft — puffed up over his body, its sides
  // hanging in a wavy hem, the sheet turned back under his chin in a round roll, the mustard throw across the foot again
  function blanketArt() {
    const { x0, x1, y1 } = BED, xa = x0 - 0.06, xb = x1 + 0.16, ya = 2.35, yb = y1 + 0.12, xm = (x0 + x1) / 2;
    const zt = (x) => 1.4 + 0.24 * Math.exp(-(((x - xm) / 0.8) ** 2)), N = 12;   // the hump over his body
    const xs = Array.from({ length: N + 1 }, (_, i) => xa + (xb - xa) * i / N), ys = (y0, y9) => Array.from({ length: N + 1 }, (_, i) => y0 + (y9 - y0) * i / N);
    const wave = (i) => 0.05 * Math.sin(i * 1.9);
    const curve = (pts, move = true) => {   // a smooth line through room points
      const q = pts.map((p) => P(...p).map(r1)), mid = (a, b) => [r1((a[0] + b[0]) / 2), r1((a[1] + b[1]) / 2)];
      let d = `${move ? 'M' : 'L'}${q[0].join(' ')}`;
      for (let i = 1; i < q.length - 1; i++) d += ` Q${q[i].join(' ')} ${mid(q[i], q[i + 1]).join(' ')}`;
      return d + ` L${q[q.length - 1].join(' ')}`;
    };
    const top = (y) => xs.map((x) => [x, y, zt(x)]);
    let s = '';
    // the side and the front hanging down, a wavy hem
    s += `<path ${F('#86a2c4', 'x', [xb, (ya + yb) / 2, 1])} d="${curve(ys(ya, yb).map((y) => [xb, y, zt(xb)]))}${curve(ys(yb, ya).map((y, i) => (i ? [xb + 0.05, y, 0.56 + wave(i)] : [xb + 0.05, yb + 0.05, 0.56])), false)} Z"/>`;
    s += `<path ${F('#8eaacb', 'y', [xm, yb, 1])} d="${curve(top(yb))}${curve(xs.slice().reverse().map((x, i) => (i ? [x, yb + 0.05, 0.56 + wave(i + 3)] : [xb + 0.05, yb + 0.05, 0.56])), false)} Z"/>`;
    // the top, puffed up, a soft light along the hump and two soft folds across it
    s += `<path ${F('#9db7d6', 't', [xm, (ya + yb) / 2, 1.6])} d="${curve(top(ya))}${curve(top(yb).reverse(), false)} Z"/>`;
    s += `<path d="${curve(ys(ya + 0.3, yb - 0.1).map((y) => [xm - 0.15, y, zt(xm) + 0.01]))}" fill="none" stroke="#fff" stroke-opacity=".22" stroke-width="9" stroke-linecap="round"/>`;
    [3.05, 4.05].forEach((y) => { s += `<path d="${curve(top(y))}" fill="none" stroke="#6f8db2" stroke-opacity=".35" stroke-width="1.6" stroke-linecap="round"/>`; });
    // the throw across the foot, following the hump and over the side
    const t0 = y1 - 1.2, t1 = y1 - 0.52, up = (x) => [x, 0, zt(x) + 0.02];
    s += `<path ${F(C.mustard, 't', [xm, (t0 + t1) / 2, 1.7])} d="${curve(xs.map((x) => [x, t0, up(x)[2]]))}${curve(xs.slice().reverse().map((x) => [x, t1, up(x)[2]]), false)} Z"/>`;
    s += `<path ${F('#d3a443', 'x', [xb, (t0 + t1) / 2, 1.2])} d="${curve([[xb + 0.01, t0, zt(xb) + 0.02], [xb + 0.01, t1, zt(xb) + 0.02]])}${curve([[xb + 0.06, t1, 0.95], [xb + 0.06, (t0 + t1) / 2, 0.9], [xb + 0.06, t0, 0.95]], false)} Z"/>`;
    // the sheet turned back: a round roll under his chin
    s += `<path d="${curve(top(ya + 0.12).map(([x, y, z]) => [x, y, z + 0.02]))}" fill="none" stroke="#2b1c12" stroke-opacity=".12" stroke-width="15" stroke-linecap="round"/>`;
    s += `<path d="${curve(top(ya + 0.08).map(([x, y, z]) => [x, y, z + 0.06]))}" fill="none" stroke-width="12" stroke-linecap="round" ${FS('#f8f5ee', 't', [xm, ya, 1.6])}/>`;
    return s;
  }
  function nightTableArt() {
    const { x0, x1, y0, y1, h } = NT, xm = (x0 + x1) / 2;
    let s = shadow(x0 - 0.1, y0 - 0.05, x1 + 0.25, y1 + 0.3, 0.7);
    s += box(C.oakDk, x0 + 0.06, y1 - 0.16, 0, x0 + 0.16, y1 - 0.06, 0.22, { hl: false }) + box(C.oakDk, x1 - 0.16, y1 - 0.16, 0, x1 - 0.06, y1 - 0.06, 0.22, { hl: false });
    s += box(C.oak, x0, y0, 0.22, x1, y1, h, { t: C.oakTop, x: C.oakDk, hlv: true });
    s += qY(C.oakTop, y1 + 0.004, x0 + 0.1, x1 - 0.1, h - 0.62, h - 0.12, 'y') + `<path class="hl" d="${line([[x0 + 0.1, y1 + 0.005, h - 0.12], [x1 - 0.1, y1 + 0.005, h - 0.12]])}"/>` + knob(xm, h - 0.37, y1);
    // on it: the reading lamp (its light by night is LIGHTS[2] and a glow), an alarm clock, a book
    const lx = x0 + 0.3, ly = y0 + 0.42, cx = x1 - 0.26, cy = y0 + 0.32;
    s += bb(lx, ly, h, `<ellipse rx="7" ry="2.8" ${F('#d9ccb6', 't', [lx, ly, h])}/><rect x="-1.3" y="-25" width="2.6" height="25" ${F('#cdbfa6', 'y', [lx, ly, h + 0.5])}/><path ${F('#f3e3c4', 'y', [lx, ly + 0.2, h + 0.9])} d="M-12 -23 L12 -23 L8 -40 L-8 -40 Z"/><path d="M-8 -40 L-12 -23" class="hl"/><ellipse cy="-23" rx="12" ry="3" fill="#fff4d8"/>`);
    s += bb(cx, cy, h, `<path d="M-5 0 L-3.5 -4 M5 0 L3.5 -4" stroke="#7a3a32" stroke-width="1.6" stroke-linecap="round"/><circle cx="-5" cy="-15" r="2.8" ${F('#d8b04f', 'y', [cx, cy, h + 0.4])}/><circle cx="5" cy="-15" r="2.8" ${F('#d8b04f', 'y', [cx, cy, h + 0.4])}/><circle cy="-9" r="7.2" ${F(C.red, 'y', [cx, cy, h + 0.25])}/><circle cy="-9" r="5.4" ${F(C.paper, 'y', [cx, cy, h + 0.25])}/><path d="M0 -9 V-13 M0 -9 L3 -8" stroke="#3b3653" stroke-width="1.1" stroke-linecap="round"/>`);
    s += box('#5e7f9c', x0 + 0.42, y0 + 0.55, h, x1 - 0.1, y1 - 0.08, h + 0.09, { t: '#e9e0cc' }) + box('#c8553f', x0 + 0.45, y0 + 0.58, h + 0.09, x1 - 0.14, y1 - 0.12, h + 0.16, { t: '#eee6d4' });
    return s;
  }
  function bedPictureArt() {   // over the bed: a crescent moon and stars over the sea
    const x0 = 17.8, x1 = 19.1, z0 = 3.85, z1 = 4.95, xm = (x0 + x1) / 2, at = [xm, 0.05, (z0 + z1) / 2];
    return `<g transform="${onY(0.03)}"><rect x="${q2(x0 + 0.06)}" y="${q2(-z1 + 0.08)}" width="${q2(x1 - x0)}" height="${q2(z1 - z0)}" fill="#2b1c12" fill-opacity=".13"/></g>
      <g transform="${onY(0.05)}"><rect x="${x0}" y="${-z1}" width="${q2(x1 - x0)}" height="${q2(z1 - z0)}" ${F(C.walnut, 'R', at)}/>
        <rect x="${q2(x0 + 0.09)}" y="${q2(-z1 + 0.09)}" width="${q2(x1 - x0 - 0.18)}" height="${q2(z1 - z0 - 0.18)}" ${F('#34437a', 'R', at)}/>
        <circle cx="${q2(xm + 0.26)}" cy="${q2(-z1 + 0.36)}" r=".16" fill="#f6e7a8"/><circle cx="${q2(xm + 0.33)}" cy="${q2(-z1 + 0.31)}" r=".14" ${F('#34437a', 'R', at)}/>
        ${[[-0.38, 0.3], [-0.12, 0.5], [-0.46, 0.62], [0.02, 0.26], [0.4, 0.66]].map(([dx, dz]) => `<circle cx="${q2(xm + dx)}" cy="${q2(-z1 + dz)}" r=".028" fill="#fff"/>`).join('')}
        <path d="M${q2(x0 + 0.09)} ${q2(-z0 - 0.32)} Q${q2(xm - 0.25)} ${q2(-z0 - 0.48)} ${q2(xm + 0.05)} ${q2(-z0 - 0.33)} T${q2(x1 - 0.09)} ${q2(-z0 - 0.36)} V${q2(-z0 - 0.09)} H${q2(x0 + 0.09)} Z" ${F('#26335f', 'R', at)}/></g>`;
  }
  function chartArt() {   // a hiragana chart (あいうえお) on the wall past the plant
    const x0 = 13.3, x1 = 14.85, z0 = 4.3, z1 = 6.45, xm = (x0 + x1) / 2, at = [xm, 0.05, (z0 + z1) / 2];
    let cells = '';
    for (let r = 0; r < 4; r++) for (let c = 0; c < 5; c++) cells += `<rect x="${q2(x0 + 0.14 + c * 0.26)}" y="${q2(-z1 + 0.62 + r * 0.36)}" width=".2" height=".26" rx=".03" ${F(['#efb3aa', '#f4d28e', '#b2d3ad', '#b3c9e6', '#d3bde3'][c], 'R', at)}/>`;
    return `<g transform="${onY(0.03)}"><rect x="${q2(x0 + 0.06)}" y="${q2(-z1 + 0.08)}" width="${q2(x1 - x0)}" height="${q2(z1 - z0)}" fill="#2b1c12" fill-opacity=".12"/></g>
      <g transform="${onY(0.05)}"><rect x="${x0}" y="${-z1}" width="${q2(x1 - x0)}" height="${q2(z1 - z0)}" ${F('#fbf6ea', 'R', at)}/>
        <rect x="${x0}" y="${-z1}" width="${q2(x1 - x0)}" height=".44" ${F(C.red, 'R', at)}/>
        <text x="${q2(xm)}" y="${q2(-z1 + 0.31)}" font-size=".23" font-weight="700" text-anchor="middle" fill="#fff">あいうえお</text>${cells}
        <circle cx="${q2(xm)}" cy="${q2(-z1 + 0.06)}" r=".05" fill="#5a68d8"/></g>`;
  }
  function bedRugArt() {   // a rug beside the bed (test, roomV 8: the slippers on it gone, the user's call)
    return `<g transform="${onZ(0.015)}"><rect x="13.65" y="1.66" width="2.65" height="2.7" rx=".25" fill="#2b1c12" fill-opacity=".08"/><rect x="13.6" y="1.6" width="2.6" height="2.64" rx=".25" ${F('#eadcc6', 't', [14.9, 2.9, 0])}/>
      <rect x="13.78" y="1.78" width="2.24" height="2.28" rx=".16" fill="none" stroke-width=".07" ${FS('#c98f6d', 't', [14.9, 2.9, 0])}/><path d="M13.78 2.54 H16.02 M13.78 3.3 H16.02" stroke-width=".04" ${FS('#d9b48e', 't', [14.9, 2.9, 0])}/></g>`;
  }

  // ===== a thing's way into its page: a small motion of its own, on a layer of its own over the room (shown only then), then
  // the room zooms into it as it fades; walk() times it, back is the thing to zoom out of when 書房 comes back =====
  function hullPath(pts) {   // the outline round some room points on screen (their convex hull)
    const p = pts.map((q) => P(...q)).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
    const half = (list) => { const h = []; list.forEach((q) => { while (h.length > 1 && cross(h[h.length - 2], h[h.length - 1], q) <= 0) h.pop(); h.push(q); }); h.pop(); return h; };
    return 'M' + half(p).concat(half(p.slice().reverse())).map((q) => q.map(r1).join(' ')).join(' L') + ' Z';
  }
  function fxSvg(cls, pts, inner, own, attrs = '') {   // a layer over the room, round these room points (moved with its working thing `own`)
    const m = own && mover(own), pp = (m ? pts.map(m.map) : pts).map((q) => P(...q)), xs = pp.map((q) => q[0]), ys = pp.map((q) => q[1]);
    const b = [Math.min(...xs) - 12, Math.min(...ys) - 12, Math.max(...xs) - Math.min(...xs) + 24, Math.max(...ys) - Math.min(...ys) + 24];
    return `<svg class="fx ${cls}"${attrs} viewBox="${b.map((v) => v.toFixed(1)).join(' ')}" style="${vbPct(b[0], b[1])};${vbSize(b[2], b[3])}" aria-hidden="true">${m && m.tf ? `<g transform="${m.tf}">${inner}</g>` : inner}</svg>`;
  }
  function fxLit(own, draw) { const m = mover(own); SH = m.sh; const s = draw(); SH = [0, 0, 0]; return s; }   // drawn lit where its thing is
  const opening = (k) => { const [za, zb] = shelfZ(k), ya = BC.y0 + BC.t, yb = BC.y1 - BC.t, x = BC.x1; return [[x, ya, za], [x, yb, za], [x, yb, zb], [x, ya, zb]]; };   // a shelf's front opening
  const ahead = (q, dx, dz) => q.map(([x, y, z]) => [x + dx, y, z + dz]);   // those points moved out from the wall and up
  const css = (v) => `${v.toFixed(1)}px`;
  // 課程: the newest course book slides out (the shelf is drawn again without it, under it), clipped to its opening and the space in front
  function bookFx(bk) {
    const n = Math.min(bk.n, SB.max);
    if (!n) return '';
    const i = n - 1, out = 0.62, q = opening(SB.k), pts = q.concat(ahead(q, out, 0)), [ex, ey] = P(out, 0, 0);
    return fxSvg('fx-book', pts, fxLit('bookcase', () => `<defs><clipPath id="bookClip" clipPathUnits="userSpaceOnUse"><path d="${hullPath(pts)}"/></clipPath></defs>
      <g clip-path="url(#bookClip)">${shelfBack(SB.k)}${shelfRow(SB.k, { ...bk, skip: i })}
        <g class="mv" style="--fx:${css(-ex)};--fy:${css(-ey)}"><g transform="translate(${r1(ex)} ${r1(ey)})">${courseBook(i, shelfZ(SB.k)[0], i === bk.cur)}</g></g></g>`), 'bookcase');
  }
  // 單字: a card hops up out of the box and out of the shelf (the box's walls and the books beside it are drawn again over it, so
  // it starts inside the box)
  function cardFx() {
    const { y0, y1, z } = CB, [z0, zb] = shelfZ(4), yc = q2((y0 + y1) / 2), up = 0.42, out = 0.75, lift = up + out / 2 + 0.1, q = opening(4), pts = q.concat(ahead(q, out, lift));
    const [ex, ey] = P(out, 0, lift), [ux, uy] = P(0, 0, up);
    return fxSvg('fx-card', pts, fxLit('bookcase', () => `<defs><clipPath id="cardClip" clipPathUnits="userSpaceOnUse"><path d="${hullPath(pts)}"/></clipPath></defs>
      <g clip-path="url(#cardClip)"><g class="mv" style="--fx:${css(-ex)};--fy:${css(-ey)};--ux:${css(ux - ex)};--uy:${css(uy - ey)}"><g transform="translate(${r1(ex)} ${r1(ey)})">${indexCard(yc, z + 0.06, z + 0.56, C.paper, [C.accent, 0.7])}</g></g>${cardBoxWalls()}${plainBooks(CB.y1 + 0.06, SHELF_Y[1], z0, zb - z0, 21)}</g>`), 'bookcase');
  }
  // 聽一輪: the headphones lie on the desk on this layer all the time, and are picked up
  const PH_PTS = [[HP.x - 0.7, HP.y - 0.7, DESK.z1], [HP.x + 0.7, HP.y - 0.7, DESK.z1], [HP.x + 0.7, HP.y + 0.7, DESK.z1], [HP.x - 0.7, HP.y + 0.7, DESK.z1 + 0.3]];
  function phonesFx() { return fxSvg('fx-phones', PH_PTS, `<g class="mv">${fxLit('desk', phonesArt)}</g>`, 'desk'); }
  // 模擬考: today's page drops off the calendar (the same day stays under it)
  function pageFx(d, left) {
    const { x0, x1, z0, z1 } = CAL, [ex, ey] = P(0, 0.4, -1.0);
    return fxSvg('fx-page', [[x0, 0, z0 - 1.2], [x1, 0.5, z1]], fxLit('calendar', () => `<g class="mv" style="--fx:${css(ex)};--fy:${css(ey)}">${calendarSheet(d, left)}</g>`), 'calendar');
  }
  // a door opening: the doorway shows the yard by the clock (出門) or the room beyond, its wall and floor (in), and the door
  // (turned by ROOM.door) swings into the room on its hinge at y1
  function doorFx(dd) {
    const { y0, y1 } = dd, z1 = DOOR.z1, w = q2(y1 - y0), ym = (y0 + y1) / 2, [ox, oy] = P(0.025, y1, 0);
    const sky = dd.in ? 'style="fill:color-mix(in srgb,#efe3cf calc(var(--day)*100%),#3a3350)"' : 'style="fill:color-mix(in srgb,#bfe0f4 calc(var(--day)*100%),#1b2050)"';
    const grass = dd.in ? 'style="fill:color-mix(in srgb,#c79b6e calc(var(--day)*100%),#2e2533)"' : 'style="fill:color-mix(in srgb,#8cc47e calc(var(--day)*100%),#141640)"';
    const leaf = leafArt(dd, 0, w, (h, z) => F(h, 'L', [0.5, ym, z]));
    const hz = dd.in ? 0.8 : 1.6;   // where the floor beyond meets its wall, or the grass the sky
    return fxSvg('fx-door', [[0, y0, 0], [0, y1, z1], [0, y0, z1], [w, y1, 0], [w, y1, z1]], `<path ${sky} d="${poly([[0.012, y0, hz], [0.012, y1, hz], [0.012, y1, z1], [0.012, y0, z1]])}"/><path ${grass} d="${poly([[0.012, y0, 0], [0.012, y1, 0], [0.012, y1, hz], [0.012, y0, hz]])}"/>
      <g class="leaf" data-o="${r1(ox)} ${r1(oy)}" transform="matrix(${S} ${-S / 2} 0 ${S} ${r1(ox)} ${r1(oy)})">${leaf}</g>`, null, ` data-door="${dd.id}"`);
  }
  let busy = false, back = null;
  const reduced = () => window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const FX_AT = { shelf: 200, cards: 300, phones: 180, calendar: 220, board: 60 };   // when the zoom starts, after the thing's own motion
  function originAt(st, el) {   // the room zooms round the middle of the thing
    const r = el.getBoundingClientRect(), b = st.getBoundingClientRect();
    st.querySelector('.room-wrap').style.transformOrigin = `${Math.round(r.left + r.width / 2 - b.left)}px ${Math.round(r.top + r.height / 2 - b.top)}px`;
  }
  function walk(st, el, hash, at) {   // the zoom at `at` ms, the page 300 ms later, easing in (the yard fades in by itself)
    busy = true; back = el.dataset.thing; el.classList.add('picked');
    setTimeout(() => { originAt(st, el); st.classList.add('zoom'); }, at);
    setTimeout(() => {
      busy = false; go(hash);
      const v = document.getElementById('view');
      if (hash === '#/outside' || hash === '#/bedroom' || hash === '#/today' || !v) return;   // the yard fades in by itself; a room zooms out of its door
      v.classList.remove('page-in'); void v.offsetWidth; v.classList.add('page-in');
      setTimeout(() => v.classList.remove('page-in'), 400);
    }, at + 300);
  }
  function enter(el) {   // a thing with a page: its motion, the zoom, the page (straight there with motion reduced)
    const st = el.closest('.study');
    if (busy) return;
    if (!st || reduced()) { go(el.dataset.route); return; }
    st.classList.add('fx-' + el.dataset.thing);
    walk(st, el, el.dataset.route, FX_AT[el.dataset.thing] || 0);
  }
  function pull(el) {   // 錯題本: the top drawer slides out, then its page opens
    const st = el.closest('.study');
    if (busy) return;
    if (!st || reduced()) { go('#/mistakes'); return; }
    st.classList.add('drawer-pull'); SND.play('drawer');
    walk(st, el, '#/mistakes', 340);
  }
  // a door: it swings open, then where it leads — the yard (出門), or the other room (1.3.0), where the hero comes in by its door
  // and the room zooms out of it, as out of a thing's page
  const PAIR = { bdoor: ['bed', 'sdoor'], sdoor: ['study', 'bdoor'] };
  function door(el) {
    const st = el.closest('.study'), d = DOORS.find((q) => q.id === el.dataset.thing), pair = PAIR[d.id];
    if (busy) return;
    if (d.to === '#/outside' && NPC.housebound() && st) { NPC.stayIn(st); return; }   // a new player: not out yet (the hero says why at the door)
    if (d.to === '#/outside') yh.fromDoor = true;
    if (pair) { const sp = SPOTS[pair[1]]; heroPos[pair[0]] = { x: sp.x + 0.3, y: sp.y, back: false, flip: false, pose: '' }; heroSave(); }   // he comes in just inside the other room's door
    if (!st || reduced()) { go(d.to); return; }
    st.classList.add('fx-door'); SND.play('door-open');
    const fx = st.querySelector(`.fx-door[data-door="${d.id}"]`), g = fx.querySelector('.leaf'), [ox, oy] = g.dataset.o.split(' ').map(Number), t0 = performance.now();
    fx.classList.add('on');
    const turn = (now) => {
      const p = Math.min(1, (now - t0) / 420), a = 1.25 * (1 - (1 - p) ** 3);
      g.setAttribute('transform', `matrix(${r1((Math.sin(a) + Math.cos(a)) * S)} ${r1((Math.sin(a) - Math.cos(a)) * S / 2)} 0 ${S} ${ox} ${oy})`);
      if (p < 1 && st.isConnected) requestAnimationFrame(turn);
    };
    requestAnimationFrame(turn);
    walk(st, el, d.to, 300);
    if (pair) back = pair[1];   // the other room opens zooming out of its door
  }
  function mark(id) { back = id; }   // today's practice dives in by itself (diveInto); 書房 still comes back out of the notebook
  function out(st) {   // the mail hint: the camera to the door, the hero walks over and out, to the mailbox
    if (busy) return;
    const d = st.querySelector('.thing[data-thing="door"]');
    st.querySelector('.mail-hint').classList.remove('on');
    if (reduced()) { door(d); return; }
    cam.c = inBound(RIDE[DOOR_VIEW].slice()); glide(st);
    use(d, () => door(d));
  }

  // 書房's desk lamp and the lamp on the chest of drawers first (in 書房), then the lamps of the wares, each with its id; test
  // (2026-11-09): every lamp switches on and off with a tap — LAMPS all of them (where to tap), the lights only those on
  let LAMPS = [];
  function roomLights() {
    const out = ROOMID === 'study' ? [Object.assign({ id: 'desk' }, LIGHTS[0], { p: mover('desk').map(LIGHTS[0].p) }), Object.assign({ id: 'chest' }, LIGHTS[1], { p: mover('chest').map(LIGHTS[1].p) })] : [];
    placedWares().forEach((o) => {
      if (o.id === 'nightTable') out.push(Object.assign({ id: o.id }, LIGHTS[2], { p: [LIGHTS[2].p[0] + o.p.x - 16.25, LIGHTS[2].p[1] + o.p.y - 0.55, LIGHTS[2].p[2]] }));
      else if (o.it.light && o.it.kind === 'wall') { const z = o.p.v + o.it.light.dz; out.push({ id: o.id, p: o.p.w === 'L' ? [0.45, o.p.u, z] : [o.p.u, 0.45, z], c: [1, 0.76, 0.5], r: o.it.light.r, lo: 0.7, hi: 0.95 }); }
      else if (o.it.light) out.push({ id: o.id, p: [o.p.x, o.p.y, o.it.light.z], c: [1, 0.76, 0.5], r: o.it.light.r, lo: 0.7, hi: 0.95 });
    });
    LAMPS = out;
    return out.filter((L) => !lampOff(L.id));
  }
  // one of 書房's own things drawn where it always stood, the whole of it moved by (dx, dy) on the floor, lit where it ends up
  function shifted(dx, dy, draw) {
    const [sx, sy] = P(dx, dy, 0);
    SH = [dx, dy, 0]; const s = draw(); SH = [0, 0, 0];
    return dx || dy ? `<g transform="translate(${r1(sx)} ${r1(sy)})">${s}</g>` : s;
  }
  // ===== 書房's working things (the bookcase, the desk with its chair, the chest of drawers on the floor; the cork board and the
  // calendar on a wall) can be moved, never put away. Each is drawn where it stood at first and moved there by its mover: on the
  // floor moved whole; on a wall along it, or onto the other wall by the shear between the two walls. Its tap box, its way into
  // its page, the hero's spot, its lamp and glows go through the same mover. =====
  const WORK = {   // their parts, each a footprint at the first place and a drawing
    bookcase: [['w:bookcase', [0, BC.y0, BC.x1, BC.y1], (bk) => bookcaseArt(bk)]],
    desk: [['w:desk', [DESK.x0, 0, DESK.x1, DESK.y1], () => deskArt() + `<g transform="${onZ(DESK.z1 + 0.003)}" class="night-only"><ellipse cx="3.3" cy="1.5" rx="1.7" ry="1.25" fill="url(#pool)" style="opacity:calc(.35 + .65 * var(--f))"/></g>`],
      ['w:desk:chair', [2.85, 2.62, 3.95, 3.58], () => chairArt()], ['w:desk:back', [2.85, 3.58, 3.95, 3.7], () => chairBackArt()]],
    chest: [['w:chest', [DR.x0, 0, DR.x1, DR.y1], () => chestArt()]]
  };
  const OWNER = { shelf: 'bookcase', cards: 'bookcase', notebook: 'desk', phones: 'desk', drawer: 'chest', board: 'board', calendar: 'calendar' };
  function mover(id, p0) {   // tf: the drawing's transform, sh: the lighting's shift, map: a room point there, d: a move's screen shift (none for a shear)
    const it = WARE.get(id), a = it.drawn || it.at, p = p0 || state.placed[id] || it.at;
    if (it.kind !== 'wall') {
      const dx = p.x - a.x, dy = p.y - a.y, d = P(dx, dy, 0);
      return { tf: dx || dy ? `translate(${r1(d[0])} ${r1(d[1])})` : '', sh: [dx, dy, 0], d, map: (q) => [q[0] + dx, q[1] + dy, q[2]] };
    }
    const du = p.u - a.u, dv = p.v - a.v;
    if (p.w === a.w) {
      const d3 = p.w === 'R' ? [du, 0, dv] : [0, du, dv], d = P(...d3);
      return { tf: du || dv ? `translate(${r1(d[0])} ${r1(d[1])})` : '', sh: d3, d, map: (q) => [q[0] + d3[0], q[1] + d3[1], q[2] + d3[2]] };
    }
    const k = r1((p.u + a.u) * S), f = r1((p.u + a.u) * S / 2 + (a.v - p.v) * S);
    if (a.w === 'R') return { tf: `matrix(1 -1 0 1 ${-k} ${f})`, sh: [-a.u, p.u, p.v - a.v], d: null, map: (q) => [q[1], p.u - (q[0] - a.u), p.v + (q[2] - a.v)] };
    return { tf: `matrix(1 1 0 1 ${k} ${f})`, sh: [p.u, -a.u, p.v - a.v], d: null, map: (q) => [p.u + (a.u - q[1]), q[0], p.v + (q[2] - a.v)] };
  }
  function inPlace(id, draw, p) {   // a working thing's drawing where it is (or would be, at p)
    const m = mover(id, p); SH = m.sh; const s = draw(); SH = [0, 0, 0];
    return m.tf ? `<g transform="${m.tf}">${s}</g>` : s;
  }
  function footprints(o, p) {   // a floor ware's footprints (a working thing's parts where it is)
    const at = p || o.p;
    if (!WORK[o.id]) return [wareFootprint(o.it, at)];
    const [dx, dy] = mover(o.id, at).sh;
    return WORK[o.id].map(([, f]) => [f[0] + dx, f[1] + dy, f[2] + dx, f[3] + dy]);
  }
  // a thing's spot for the hero: a working thing's moves with it; at a wall thing, the first clear place in front of it
  function spotOf(id, p) {
    const sp = SPOTS[id], own = OWNER[id];
    if (!own) return sp;
    const it = WARE.get(own), at = p || state.placed[own] || it.at;
    if (it.kind === 'wall') {
      const g = walkGrid(), free = (x, y) => { const i = Math.floor(x / CELL), j = Math.floor(y / CELL); return i >= 0 && j >= 0 && i < GW && j < GH && !g[j * GW + i]; };
      for (let d = 1.4; d < 6; d += 0.25) { const [x, y] = at.w === 'R' ? [at.u, d] : [d, at.u]; if (free(x, y)) return { x, y, look: at.w, act: sp.act }; }
      return { x: at.w === 'R' ? at.u : 2, y: at.w === 'R' ? 2 : at.u, look: at.w, act: sp.act };
    }
    const q = mover(own, at).map([sp.x, sp.y, 0]);
    return Object.assign({}, sp, { x: q[0], y: q[1] });
  }
  // painter's order: of two things whose screen spans overlap, the one wholly behind the other along x or y goes first; footprints
  // that overlap (a hero on a chair) go by their bottom, then by depth. Ties keep the list's own order.
  function depthSort(objs) {
    const n = objs.length, next = objs.map(() => []), deg = new Array(n).fill(0), e = 1e-6;
    const span = (o) => [o.fp[0] - o.fp[3], o.fp[2] - o.fp[1]];
    const behind = (a, b) => a.fp[2] <= b.fp[0] + e || a.fp[3] <= b.fp[1] + e;
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
      const a = objs[i], b = objs[j], sa = span(a), sb = span(b);
      if (sa[1] <= sb[0] + e || sb[1] <= sa[0] + e) continue;   // side by side on screen: either order
      let ab = behind(a, b);
      if (ab === behind(b, a)) ab = (a.z0 || 0) !== (b.z0 || 0) ? (a.z0 || 0) < (b.z0 || 0) : a.fp[0] + a.fp[1] + a.fp[2] + a.fp[3] <= b.fp[0] + b.fp[1] + b.fp[2] + b.fp[3];
      if (ab) { next[i].push(j); deg[j]++; } else { next[j].push(i); deg[i]++; }
    }
    const out = [], done = new Array(n).fill(false);
    for (let k = 0; k < n; k++) {
      let i = deg.findIndex((g, q) => !done[q] && g === 0);
      if (i < 0) i = done.indexOf(false);   // a cycle (three things in a ring): the list's order breaks it
      done[i] = true; out.push(objs[i]); next[i].forEach((j) => { deg[j]--; });
    }
    return out;
  }
  // where the hero stands to use a thing (look: toward the right wall R or the left wall L; act: what it does there), kept clear of wares
  const SPOTS = {
    notebook: { x: 3.4, y: 3.15, look: 'R', act: 'sit' }, phones: { x: 4.6, y: 2.95, look: 'R', act: 'reach' },
    shelf: { x: 1.95, y: 2.95, look: 'L', act: 'reach' }, cards: { x: 1.95, y: 2.95, look: 'L', act: 'reach' },
    drawer: { x: 8.45, y: 2.45, look: 'R', act: 'crouch' }, board: { x: 8.45, y: 2.45, look: 'R', act: 'look' },
    calendar: { x: 10.65, y: 1.6, look: 'R', act: 'reach' }
  };
  const doorSpot = (d) => ({ x: 1.25, y: (d.y0 + d.y1) / 2, look: 'L', act: 'out' });   // just inside a door, facing it
  ROOMS.study.doors.concat(ROOMS.bed.doors).forEach((d) => { SPOTS[d.id] = doorSpot(d); });
  const box2 = (x, y, r) => [x - r, y - r, x + r, y + r];
  // kept clear on the floor: the doors' swing and the spot inside them, where the hero stands at 書房's working things (but those
  // of `own`, being moved; with `pl`, the working things where it lays them out)
  function keepF(own, pl) {
    const out = DOORS.flatMap((d) => [[0, d.y0 - 0.3, 2.4, d.y1 + 0.3], box2(1.25, (d.y0 + d.y1) / 2, 0.35)]);
    if (ROOMID === 'study') Object.keys(OWNER).forEach((t) => { const o = OWNER[t]; if (WARE.get(o).kind === 'wall' || o === own) return; const sp = spotOf(t, pl && (pl[o] || WARE.get(o).at)); out.push(box2(sp.x, sp.y, 0.35)); });
    return out;
  }
  const keepW = (w) => (w === 'L' ? DOORS.map((d) => [d.y0 - 0.2, 0, d.y1 + 0.2, 6.7]) : []);   // [u0, v0, u1, v1]: the doors (the window is a ware, 1.2.0)
  const WIN_STRIP = [1.8, 3.9, 6.45, 9.3];   // where the window and its curtains came to hang in roomV 3
  // a floor thing standing against a wall covers that wall up to its height: [[wall, [u0, v0, u1, v1]], …]
  function wallCover(it, p) {
    if (it.kind !== 'floor') return [];
    const f = wareFootprint(it, p), out = [];
    if (f[0] < 0.4) out.push(['L', [f[1], 0, f[3], it.h || 1]]);
    if (f[1] < 0.4) out.push(['R', [f[0], 0, f[2], it.h || 1]]);
    return out;
  }
  const over = (a, b) => a[0] < b[2] - 1e-6 && b[0] < a[2] - 1e-6 && a[1] < b[3] - 1e-6 && b[1] < a[3] - 1e-6;
  // can this ware go there (other wares as they stand now, or as `pl` lays them out; itself left out)?
  const waresIn = (pl) => Object.keys(pl).filter((id) => WARE.has(id) && forRoom(WARE.get(id)) && roomOf(pl[id]) === ROOMID).map((id) => ({ id, it: WARE.get(id), p: pl[id] }));
  function fits(it, p, pl) {
    const others = (pl ? waresIn(pl) : placedWares()).filter((o) => o.id !== it.id);
    if (it.kind === 'wall') {
      const r = wareRect(it, p), len = p.w === 'L' ? RD : RW;
      if (r[0] < 0.1 || r[2] > len - 0.1 || r[1] < WAIN + 0.2 || r[3] > 11.1) return false;   // up to the strings of lights along the tops
      return !keepW(p.w).some((k) => over(r, k)) && !others.some((o) => (o.it.kind === 'wall' && o.p.w === p.w && over(r, wareRect(o.it, o.p))) || wallCover(o.it, o.p).some(([w, c]) => w === p.w && over(r, c)));
    }
    const f = wareFootprint(it, p), fs = footprints({ id: it.id, it }, p), inRoom = (r) => r[0] >= -1e-6 && r[1] >= -1e-6 && r[2] <= RW + 1e-6 && r[3] <= RD + 1e-6;   // flush with a wall is fine
    if (!inRoom(f) || !fs.every(inRoom)) return false;
    if (it.kind === 'rug') return !others.some((o) => o.it.kind === 'rug' && over(f, wareFootprint(o.it, o.p)));
    const theirs = others.filter((o) => o.it.kind === 'floor').flatMap((o) => footprints(o)), keep = keepF(it.id, pl);
    const mine = Object.keys(OWNER).filter((t) => OWNER[t] === it.id && t !== 'notebook').map((t) => { const sp = spotOf(t, p); return box2(sp.x, sp.y, 0.3); });   // its own spots must stay clear
    return !fs.some((r) => keep.some((k) => over(r, k)) || theirs.some((t) => over(r, t))) && mine.every((r) => inRoom(r) && !theirs.some((t) => over(r, t)))
      && !wallCover(it, p).some(([w, c]) => others.some((o) => o.it.kind === 'wall' && o.p.w === w && over(c, wareRect(o.it, o.p))));
  }
  // roomV 3 (1.2.0): the desk and the window moved right, off the bookcase. A desk still where it stood goes along, unless a
  // floor ware stands there now; a ware on the right wall where the window and its curtains now are goes to the storage box (the
  // board and the calendar, never put away, back to their own places)
  function moveOff(placed) {
    const d = placed.desk, desk = WARE.get('desk');
    if (d && d.w === 'F' && d.x === 3.3 && d.y === 1.85 && !d.r) {
      const fs = footprints({ id: 'desk', it: desk }, desk.at);
      const taken = Object.keys(placed).some((id) => id !== 'desk' && WARE.has(id) && WARE.get(id).kind === 'floor' && !placed[id].rm && footprints({ id, it: WARE.get(id) }, placed[id]).some((r) => fs.some((f) => over(f, r))));
      if (!taken) placed.desk = Object.assign({}, desk.at);
    }
    Object.keys(placed).forEach((id) => {
      const it = WARE.get(id), p = placed[id];
      if (!it || id === 'window' || it.kind !== 'wall' || p.w !== 'R' || p.rm || !over(wareRect(it, p), WIN_STRIP)) return;
      if (it.fixed) placed[id] = Object.assign({}, it.at); else delete placed[id];
    });
  }
  // roomV 7 (1.3.0): 書房 grew to 30 × 24, the bedroom became a room of its own beyond a door in 書房's left wall, and 書房's own
  // things were laid out again across the bigger room. Those still where they first stood (in 1.2, or in the test build's
  // bedroom corner, roomV 6) go to their new places, the bed and its things into the bedroom, when the new place is clear; the
  // new things of the house's own (the sofa, the wardrobe…) are set out where there is room, or wait in the storage box
  const OLD7 = {
    bed: [{ x: 18.45, y: 2.625 }, { x: 1.6, y: 14.775 }], nightTable: [{ x: 16.25, y: 0.55 }, { x: 3.65, y: 12.7 }], bedRug: [{ x: 14.9, y: 2.92 }, { x: 4.6, y: 15.6 }],
    nightPicture: [{ w: 'R', u: 18.45, v: 4.4 }, { w: 'L', u: 14.8, v: 5.2 }], sageRug: [{ x: 9.2, y: 3.55 }, { x: 7.6, y: 6.4 }],
    chest: [{ x: 8.45, y: 0.85 }], board: [{ w: 'R', u: 8.45, v: 5.5 }], calendar: [{ w: 'R', u: 10.65, v: 5.75 }], bigPlant: [{ x: 11.95, y: 1 }], kanaChart: [{ w: 'R', u: 14.075, v: 5.375 }]
  };
  function inRoomOf(rm, fn) { const was = ROOMID; setRoom(rm); try { return fn(); } finally { setRoom(was); } }
  function settle(placed) {
    const fresh = (id) => Object.assign({}, WARE.get(id).at), fitsAt = (id, p) => inRoomOf(roomOf(p), () => fits(WARE.get(id), p, placed));
    Object.keys(OLD7).forEach((id) => {
      const p = placed[id];
      if (p && !p.r && !p.rm && OLD7[id].some((o) => Object.keys(o).every((k) => p[k] === o[k])) && fitsAt(id, fresh(id))) placed[id] = fresh(id);
    });
    WARES.filter((w) => w.starter && w.since === 7 && !placed[w.id]).forEach((w) => { if (fitsAt(w.id, fresh(w.id))) placed[w.id] = fresh(w.id); });
  }
  // roomV 8 (test): the strings of lights still hanging where they first hung go to the storage box; the desk (and the window over
  // it), the kotatsu, the round rug and the kana chart still where roomV 7 put them go to their new places when those are clear;
  // the new windows and wall lamps are put up where there is room
  const OLD8 = { kanaChart: { w: 'R', u: 22.2, v: 5.6 }, desk: { x: 4.1, y: 1.85 }, window: { w: 'R', u: 4.1, v: 6.6 }, kotatsu: { x: 11.5, y: 9 }, sageRug: { x: 3.4, y: 12.6 } };
  function settle8(placed) {
    const fresh = (id) => Object.assign({}, WARE.get(id).at), fitsAt = (id, p) => inRoomOf(roomOf(p), () => fits(WARE.get(id), p, placed));
    const at = (p, o) => p && !p.r && !p.rm && Object.keys(o).every((k) => p[k] === o[k]);
    WARES.filter((w) => w.garland).forEach((w) => { if (at(placed[w.id], w.at)) delete placed[w.id]; });
    Object.keys(OLD8).forEach((id) => { if (at(placed[id], OLD8[id]) && fitsAt(id, fresh(id))) placed[id] = fresh(id); });
    settleNew(placed, 8);
  }
  function settleNew(placed, since) {   // the house's own things new in this roomV, set out where there is room
    const fresh = (id) => Object.assign({}, WARE.get(id).at), fitsAt = (id, p) => inRoomOf(roomOf(p), () => fits(WARE.get(id), p, placed));
    WARES.filter((w) => w.starter && w.since === since && !placed[w.id]).forEach((w) => { if (fitsAt(w.id, fresh(w.id))) placed[w.id] = fresh(w.id); });
  }
  // roomV 10 (2026-11-14, the user: tapped by mistake going out): the full-length mirror still where it was set out by 書房's front
  // door goes to its new home along the same wall, when that is clear
  function settle10(placed) {
    const p = placed.fullMirror, it = WARE.get('fullMirror');
    if (p && p.w === 'F' && !p.r && !p.rm && p.x === 0.3 && p.y === 3.25 && inRoomOf('study', () => fits(it, it.home, placed))) placed.fullMirror = Object.assign({}, it.home);
  }
  function standingList() {   // the floor wares (a working thing in its parts), unsorted
    return placedWares().filter((o) => o.it.kind === 'floor').flatMap((o) => {
      if (!WORK[o.id]) return [{ id: 'w:' + o.id, fp: wareFootprint(o.it, o.p), ware: o }];
      const fs = footprints(o);
      return WORK[o.id].map(([pid, , art], i) => ({ id: pid, fp: fs[i], work: [o.id, art] }));
    });
  }
  const offArt = (id, art) => (lampOff(id) ? `<g class="lamp-off">${art}</g>` : art);   // a lamp switched off
  function standing(bk) { return depthSort(standingList()).map((q) => ({ id: q.id, fp: q.fp, art: offArt(q.id.replace(/^w:/, ''), q.work ? inPlace(q.work[0], () => q.work[1](bk)) : DECOR.floor(q.ware.id, q.ware.p)) })); }
  function studyArt(d, left, bk) {
    const wares = placedWares();
    return `<svg class="art" viewBox="${VB.join(' ')}" aria-hidden="true">${DEFS}
      ${shellArt()}${DOORS.map(doorArt).join('')}${wallShadeArt()}
      ${wares.filter((o) => o.it.kind === 'wall').map((o) => `<g data-o="w:${o.id}">${o.it.garland ? wireArt(o.it.size[0], o.p) : o.it.win ? windowArt(o.p, false, o.it.bare) : offArt(o.id, DECOR.wall(o.id, o.p))}</g>`).join('')}
      ${floorArt()}
      ${wares.filter((o) => o.it.kind === 'rug').map((o) => `<g data-o="w:${o.id}">${DECOR.floor(o.id, o.p)}</g>`).join('')}
      ${sunArt()}
      ${(shown = standing(bk)).map((o) => `<g data-o="${o.id}">${o.art}</g>`).join('')}
    </svg>`;
  }
  // ===== 擺設: moving the wares about. A mode of 書房's own, so a swipe on empty space still moves along the room. A ware is picked
  // by a tap (its tools come up over it), dragged on its floor or wall (drawn on a layer of its own while it moves, so the big
  // drawing stays still), sent to a tapped spot, turned a quarter or put away; the storage box below holds what is not out =====
  const ed = { on: false, sel: null };
  const snap = (v) => Math.round(v * 4) / 4;
  const wallPt = (p, u, v) => (p.w === 'L' ? [0.1, u, v] : [u, 0.1, v]);   // a point of a wall ware's plane in the room
  function wareBox(o) {   // the screen box (drawing units) round a placed ware, to tap or drag it by
    let pts;
    if (o.it.kind === 'wall') { const r = wareRect(o.it, o.p); pts = [[r[0], r[1]], [r[2], r[3]], [r[0], r[3]], [r[2], r[1]]].map(([u, v]) => wallPt(o.p, u, v)); }
    else { const f = wareFootprint(o.it, o.p), h = o.it.h || 0.05; pts = [0, h].flatMap((z) => [[f[0], f[1], z], [f[2], f[1], z], [f[2], f[3], z], [f[0], f[3], z]]); }
    const sp = pts.map((q) => P(...q)), xs = sp.map((q) => q[0]), ys = sp.map((q) => q[1]);
    return [Math.min(...xs) - 4, Math.min(...ys) - 4, Math.max(...xs) + 4, Math.max(...ys) + 4];
  }
  // a wall ware's own shape in its box, slanted with its wall (4 units round it), as a clip: a long string of lights then takes no
  // taps meant for the pictures under it or for the wall round it
  function wallClip(o, b) {
    const r = wareRect(o.it, o.p), [cx] = P(...wallPt(o.p, o.p.u, o.p.v));
    const pc = ([u, v]) => { const [x, y] = P(...wallPt(o.p, u, v)); return `${((x + Math.sign(x - cx) * 4 - b[0]) / (b[2] - b[0]) * 100).toFixed(1)}% ${((y + (v > o.p.v ? -4 : 4) - b[1]) / (b[3] - b[1]) * 100).toFixed(1)}%`; };
    return `clip-path:polygon(${[[r[0], r[3]], [r[2], r[3]], [r[2], r[1]], [r[0], r[1]]].map(pc).join(',')})`;
  }
  function decosHtml() {   // a clear button over each ware (only in 擺設): rugs under the walls' under the floor's, front ones on top
    const all = placedWares(), floor = new Map(depthSort(standingList()).map((o, i) => [o.id, i]));
    const rank = (o) => (o.it.kind === 'rug' ? -2000 : o.it.kind === 'wall' ? -1000 : floor.get('w:' + o.id) || 0);
    return all.sort((a, b) => rank(a) - rank(b)).map((o) => { const b = wareBox(o); return `<button type="button" class="deco${o.it.kind === 'wall' ? ' wall' : ''}${ed.sel === o.id ? ' sel' : ''}" data-ware="${o.id}" style="${vbPct(b[0], b[1])};${vbSize(b[2] - b[0], b[3] - b[1])}${o.it.kind === 'wall' ? ';' + wallClip(o, b) : ''}" aria-label="${esc(o.it.name)}"></button>`; }).join('');
  }
  function selHtml() {   // the tools over the picked ware (a wall ware's over its top edge; under one hung up high, to stay in view)
    const o = placedWares().find((q) => q.id === ed.sel); if (!o) return '';
    const b = wareBox(o), r = o.it.kind === 'wall' && wareRect(o.it, o.p), under = r && r[3] > 10;
    const [x, y] = r ? P(...wallPt(o.p, o.p.u, under ? r[1] : r[3])) : [(b[0] + b[2]) / 2, b[1]];
    return `<div class="edit-sel${under ? ' under' : ''}" style="${vbPct(x, y)}">${o.it.kind !== 'wall' && o.it.turn !== false ? '<button type="button" data-act="room-edit-turn">轉向</button>' : ''}${o.it.fixed ? '<span class="sel-note">只能搬，不能收</span>' : '<button type="button" data-act="room-edit-put">收起</button>'}</div>`;
  }
  function editHtml() {   // the 擺設 bar and the storage box (shown by .study.edit)
    const box = stacks(WARES.filter((it) => forRoom(it) && !it.fixed && owns(it.id) && !state.placed[it.id]));
    return `<div class="edit-top"><span class="edit-hint">${ed.sel ? '拖曳搬動，拖到下面收起來' : '拖曳搬動；收納箱的東西拖出來擺'}</span><button type="button" class="btn btn-primary btn-sm" data-act="room-edit-done">完成</button></div>
      <div class="edit-tray" aria-label="收納箱">${box.length ? box.map(({ it, n, name }) => `<button type="button" class="tray-it" data-act="room-edit-take" data-id="${it.id}">${DECOR.thumb(it.id)}<span>${esc(name)}</span>${n > 1 ? `<b class="tray-n">×${n}</b>` : ''}</button>`).join('') : '<div class="tray-empty">收納箱是空的。到古道具屋買東西，或把書房裡的東西拖到這裡收起來。</div>'}</div>`;
  }
  // a free spot for a ware taken out of the box: in view, nearest the middle (a wall ware) or the lower middle (a floor one)
  // a neighbour's present (NPC): where it belongs (home) when there is room, else somewhere in sight in that room, else the box
  function give(id) {
    const it = WARE.get(id), at = it.home && Object.assign({}, it.home);
    if (at && inRoomOf(roomOf(at), () => fits(it, at))) { state.placed[id] = at; return; }
    if (!at || roomOf(at) === ROOMID) { const p = freeSpot(it); if (p) state.placed[id] = p; }
  }
  // someone at the front door (NPC): コンコン by it (.on replays it), its sign kept in sight
  function knock(st, on) {
    if (!st || ROOMID !== 'study') return;
    const t = st.querySelector('[data-thing="door"]'); if (t) t.classList.toggle('knocking', on);
    let k = st.querySelector('.knock'); if (!on) { if (k) k.remove(); return; } if (k) return;
    const d = DOORS.find((q) => q.id === 'door'), [x, y] = P(0.15, (d.y0 + d.y1) / 2, DOOR.z1 * 0.7);
    k = document.createElement('div'); k.className = 'knock'; k.setAttribute('aria-hidden', 'true'); k.style.cssText = `${vbPct(x - 36, y - 40)};${vbSize(72, 40)}`; k.innerHTML = '<i>コン</i><i>コン</i>';
    st.querySelector('.room').appendChild(k);
  }
  // the neighbour at the open front door while they talk (NPC), turned to the hero; '' sends them off
  function guest(st, html) {
    const old = st && st.querySelector('.guest'); if (old) old.remove();
    if (!st || !html || ROOMID !== 'study') return;
    const d = DOORS.find((q) => q.id === 'door'), [px, py] = P(0.6, d.y0 + 0.6, 0), el = document.createElement('div');
    el.className = 'hero guest turn'; el.setAttribute('aria-hidden', 'true'); el.style.cssText = `${vbPct(px - 60, py - 200)};${vbSize(120, 210)}`; el.innerHTML = html;
    const h = st.querySelector('.hero'); h.parentNode.insertBefore(el, h);
    if (!reduced()) { cam.c = inBound(RIDE[DOOR_VIEW].slice()); glide(st); }   // the camera to the door
  }
  function freeSpot(it) {
    const [hw, hh] = halfView(), [vx0, vy0, vx1, vy1] = [Math.max(BOUND[0], (cam.c[0] - hw) / S), Math.max(BOUND[1], (cam.c[1] - hh) / S), Math.min(BOUND[2], (cam.c[0] + hw) / S), Math.min(BOUND[3], (cam.c[1] + hh) / S)], tx = (vx0 + vx1) / 2, ty = vy0 + (vy1 - vy0) * (it.kind === 'wall' ? 0.32 : 0.78), cands = [];
    if (it.kind === 'wall') {
      for (const w of ['L', 'R']) for (let u = 0.5; u < (w === 'L' ? RD : RW); u += 0.25) for (let v = 3.6; v < 10.5; v += 0.25) {
        const [sx, sy] = (w === 'L' ? P(0, u, v) : P(u, 0, v)).map((q) => q / S);
        if (sx > vx0 + 1 && sx < vx1 - 1 && sy > vy0 + 0.6 && sy < vy1 - 1.3) cands.push({ p: here({ w, u, v }), d: Math.hypot(sx - tx, sy - ty) });
      }
    } else {
      for (let x = 0.5; x < RW; x += 0.25) for (let y = 0.5; y < RD; y += 0.25) {
        const [sx, sy] = P(x, y, 0).map((q) => q / S);
        if (sx > vx0 + 1.2 && sx < vx1 - 1.2 && sy > vy0 && sy < vy1 - 1.3) cands.push({ p: here({ w: 'F', x, y, r: 0 }), d: Math.hypot(sx - tx, sy - ty) });   // clear of the sides and the storage box
      }
    }
    cands.sort((a, b) => a.d - b.d);
    const hit = cands.find((c) => fits(it, c.p));
    return hit ? hit.p : null;
  }
  // the pointer in the drawing's units, and that point on the floor or on a wall
  function roomPoint(st, e) { const r = st.querySelector('.room').getBoundingClientRect(); return [VB[0] + (e.clientX - r.left) / r.width * VB[2], VB[1] + (e.clientY - r.top) / r.height * VB[3]]; }
  const floorAt = ([sx, sy]) => { const a = sx / S, b = 2 * sy / S; return [(a + b) / 2, (b - a) / 2]; };
  const wallAt = ([sx, sy]) => (sx < 0 ? { w: 'L', u: -sx / S, v: -sx / S / 2 - sy / S } : { w: 'R', u: sx / S, v: sx / S / 2 - sy / S });
  function spotUnder(it, pt0, off, cur) {   // where the ware goes with the pointer at pt0 (off: from the pointer to its middle)
    if (it.kind === 'wall') { const q = wallAt(pt0); return here({ w: q.w, u: snap(q.u + off[0]), v: snap(q.v + off[1]) }); }
    const [x, y] = floorAt(pt0); return here({ w: 'F', x: snap(x + off[0]), y: snap(y + off[1]), r: cur.r || 0 });
  }
  function redraw(st) {   // the room drawn again (擺設 changed something); the camera and the mode stay
    const v = st.parentNode; if (!v) return;
    v.innerHTML = html(ringPct(dayProgress())); mount(v.querySelector('.study'));
  }
  function editCmd(st, cmd, id) {
    const o = ed.sel && placedWares().find((q) => q.id === ed.sel);
    if (cmd === 'on') { ed.on = true; ed.sel = null; }
    else if (cmd === 'done') { ed.on = false; ed.sel = null; }
    else if (cmd === 'take') {
      const it = WARE.get(id), p = it && freeSpot(it);
      if (!p) { toast('這附近放不下了，換個地方再試試'); return; }
      state.placed[id] = p; ed.sel = id; saveState(); SND.play('place');
    } else if (cmd === 'turn' && o) {
      const p = Object.assign({}, o.p, { r: o.p.r ? 0 : 1 });
      // turned about its middle, a thing against a wall would stand into it (the wardrobe, the full-length mirror): pushed back in
      const f = wareFootprint(o.it, p), q2r = (v) => Math.round(v * 100) / 100;
      p.x = q2r(p.x - Math.min(0, f[0]) - Math.max(0, f[2] - RW)); p.y = q2r(p.y - Math.min(0, f[1]) - Math.max(0, f[3] - RD));
      if (!fits(o.it, p)) { toast('旁邊太擠了，轉不過來'); return; }
      state.placed[o.id] = p; saveState();
    } else if (cmd === 'put' && o && !o.it.fixed) { delete state.placed[o.id]; ed.sel = null; saveState(); }
    redraw(st);
  }
  // ===== the hero: stands in the room in a box of its own over the drawing (walking never repaints the room), walks round the
  // furniture and the wares to where it is sent, and uses the things: sits at the desk for today's practice, reaches for the books,
  // crouches at the drawer… Whatever stands in front of it is copied onto a layer over it (heroFront). Where it stands is this
  // device's own (localStorage nq_hero). =====
  let shown = [];   // the standing things as last drawn (id, footprint, art)
  const hero = { x: 4.2, y: 4.7, back: false, flip: false, turn: false, pose: '', raf: 0, t: 0, walk: null, lead: null, going: null, frontKey: '' };
  // where the hero stands in each room (1.3.0): the one shown is `hero`, the other waits here; saved as nq_hero's room (書房, as
  // before) and bed
  const HKEY = { study: 'room', bed: 'bed' }, heroPos = {};
  const heroOf = () => (hero.pose && hero.pose !== 'sit' ? { x: hero.x + (hero.out || [0, 1])[0], y: hero.y + (hero.out || [0, 1])[1], back: hero.back, flip: hero.flip, turn: hero.turn, pose: '' } : { x: hero.x, y: hero.y, back: hero.back, flip: hero.flip, turn: hero.turn, pose: hero.pose });   // on the sofa or the kotatsu: kept standing up
  try { const h = JSON.parse(localStorage.getItem('nq_hero') || 'null') || {}; Object.keys(HKEY).forEach((rm) => { const q = h[HKEY[rm]]; if (q && Number.isFinite(q.x) && Number.isFinite(q.y)) heroPos[rm] = { x: q.x, y: q.y, back: !!q.back, flip: !!q.flip, turn: !!q.turn, pose: q.pose === 'sit' && rm === 'study' ? 'sit' : '' }; }); } catch (e) { /* first time here */ }
  function heroSave() {
    try {
      if (ROOMID) heroPos[ROOMID] = heroOf();
      const h = JSON.parse(localStorage.getItem('nq_hero') || '{}') || {};
      Object.keys(heroPos).forEach((rm) => { h[HKEY[rm]] = heroPos[rm]; });
      localStorage.setItem('nq_hero', JSON.stringify(h));
    } catch (e) { /* no storage: it starts by the desk */ }
  }
  const heroArt = () => HERO.svg({ L: (h, z) => `style="fill:${tone(h, 'y', [hero.x, hero.y + 0.3, z || 1], HERO_AMB)}"`, wear: state.wear, look: state.look });
  function heroHtml() {
    const [px, py] = P(hero.x, hero.y, 0);
    return `<div class="hero${hero.back ? ' back' : ''}${hero.turn ? ' turn' : ''}${hero.flip ? ' flip' : ''}${hero.pose ? ' ' + hero.pose : ''}" style="${vbPct(px - 60, py - 200)};${vbSize(120, 210)}" data-act="hero-hop" aria-label="主角（按住拖曳，帶他走）">${heroArt()}</div><svg class="front" viewBox="${VB.join(' ')}" aria-hidden="true"></svg>`;
  }
  function heroPlace(st) {
    const el = st.querySelector('.hero'); if (!el) return;
    const [px, py] = P(hero.x, hero.y, 0);
    el.style.left = `${((px - 60 - VB[0]) / VB[2] * 100).toFixed(3)}%`; el.style.top = `${((py - 200 - VB[1]) / VB[3] * 100).toFixed(3)}%`;
    el.classList.toggle('back', hero.back); el.classList.toggle('turn', !!hero.turn); el.classList.toggle('flip', hero.flip); ['sit', 'sofa', 'kneel', 'sleep'].forEach((k) => el.classList.toggle(k, hero.pose === k));
    heroFront(st);
  }
  // the things standing in front of the hero where they overlap it on screen, copied over it
  function heroFront(st) {
    const f = [hero.x - 0.25, hero.y - 0.25, hero.x + 0.25, hero.y + 0.25], z0 = hero.pose === 'sit' ? 1.72 : 0, a = hero.x - hero.y;
    const ids = shown.filter((o) => {
      if (o.id === hero.seat) return false;   // on the sofa (legs over its edge), the bed or a cushion: over it
      if (o.fp[2] - o.fp[1] <= a - 1.4 || a + 1.4 <= o.fp[0] - o.fp[3]) return false;   // apart on screen
      const heroBehind = f[2] <= o.fp[0] + 1e-6 || f[3] <= o.fp[1] + 1e-6, itBehind = o.fp[2] <= f[0] + 1e-6 || o.fp[3] <= f[1] + 1e-6;
      if (heroBehind !== itBehind) return heroBehind;
      return z0 !== (o.z0 || 0) ? z0 < (o.z0 || 0) : f[0] + f[1] + f[2] + f[3] < o.fp[0] + o.fp[1] + o.fp[2] + o.fp[3];
    }).map((o) => o.id), bed = hero.pose === 'sleep' && placedWares().find((q) => q.id === 'bed'), key = ids.join(',') + (bed ? `+bed${bed.p.x},${bed.p.y}` : '');
    if (key === hero.frontKey) return;
    hero.frontKey = key;
    const over = bed ? shifted(bed.p.x - 18.45, bed.p.y - 2.625, blanketArt) : '';   // asleep: tucked in under the duvet
    const layer = st.querySelector('svg.front'); if (layer) layer.innerHTML = shown.filter((o) => ids.includes(o.id)).map((o) => o.art).join('') + over;
  }
  // the floor in half-unit cells: furniture, wares and the walls' edges are in the way, and so is floor the camera never shows
  // (BOUND); A* finds the way, then pulls it straight
  const CELL = 0.5; let GW = 0, GH = 0;   // (per room: setRoom)
  let grid = null;   // kept while the hero is led (nothing moves meanwhile)
  function walkGrid() {
    if (grid) return grid;
    const g = new Uint8Array(GW * GH), pad = 0.3;
    const rects = placedWares().filter((o) => o.it.kind === 'floor').flatMap((o) => footprints(o));
    for (let j = 0; j < GH; j++) for (let i = 0; i < GW; i++) {
      const cx = (i + 0.5) * CELL, cy = (j + 0.5) * CELL, sx = cx - cy, sy = (cx + cy) / 2;   // sx, sy: the cell on the screen (P / S)
      if (cx < 0.4 || cy < 0.4 || cx > RW - 0.4 || cy > RD - 0.4 || sx < BOUND[0] + 0.6 || sx > BOUND[2] - 0.6 || sy > BOUND[3] - 0.4 || rects.some((r) => cx > r[0] - pad && cx < r[2] + pad && cy > r[1] - pad && cy < r[3] + pad)) g[j * GW + i] = 1;
    }
    return g;
  }
  function pathTo(from, to) {
    const g = walkGrid(), cellOf = (p) => [Math.max(0, Math.min(GW - 1, Math.floor(p[0] / CELL))), Math.max(0, Math.min(GH - 1, Math.floor(p[1] / CELL)))];
    const free = (i, j) => i >= 0 && j >= 0 && i < GW && j < GH && !g[j * GW + i], id = (i, j) => j * GW + i;
    const near = ([i, j]) => { if (free(i, j)) return [i, j]; for (let r = 1; r < 14; r++) for (let a = -r; a <= r; a++) for (const [di, dj] of [[a, -r], [a, r], [-r, a], [r, a]]) if (free(i + di, j + dj)) return [i + di, j + dj]; return null; };
    const s = near(cellOf(from)), t = near(cellOf(to));
    if (!s || !t) return null;
    const sid = id(...s), tid = id(...t), gs = new Float32Array(GW * GH).fill(Infinity), came = new Int32Array(GW * GH).fill(-1), done = new Uint8Array(GW * GH), open = [];
    const hh = (i, j) => { const dx = Math.abs(i - t[0]), dy = Math.abs(j - t[1]); return Math.max(dx, dy) + 0.414 * Math.min(dx, dy); };
    gs[sid] = 0; open.push([hh(...s), sid]);
    while (open.length) {
      let b = 0; for (let k = 1; k < open.length; k++) if (open[k][0] < open[b][0]) b = k;
      const cur = open.splice(b, 1)[0][1];
      if (done[cur]) continue; done[cur] = 1;
      if (cur === tid) break;
      const ci = cur % GW, cj = (cur - ci) / GW;
      for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
        const ni = ci + di, nj = cj + dj;
        if (!free(ni, nj) || (di && dj && (!free(ci + di, cj) || !free(ci, cj + dj)))) continue;   // no cutting corners
        const nid = id(ni, nj), ng = gs[cur] + (di && dj ? 1.414 : 1);
        if (ng < gs[nid]) { gs[nid] = ng; came[nid] = cur; open.push([ng + hh(ni, nj), nid]); }
      }
    }
    if (tid !== sid && came[tid] < 0) return null;
    const cells = [tid]; while (cells[0] !== sid) cells.unshift(came[cells[0]]);
    const pts = cells.map((c) => [(c % GW + 0.5) * CELL, (Math.floor(c / GW) + 0.5) * CELL]);
    pts[0] = from.slice();
    if (free(...cellOf(to))) pts.push(to.slice());   // the very spot it was sent to, when that is clear
    const clear = (a, b) => { const n = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 0.2); for (let k = 1; k < n; k++) if (!free(...cellOf([a[0] + (b[0] - a[0]) * k / n, a[1] + (b[1] - a[1]) * k / n]))) return false; return true; };
    const out = [pts[0]]; let k = 0;
    while (k < pts.length - 1) { let m = pts.length - 1; while (m > k + 1 && !clear(pts[k], pts[m])) m--; out.push(pts[m]); k = m; }
    return out;
  }
  // the hero walks a frame at a time along hero.walk.pts, .v room units a second; led by a finger (hero.lead) he gets a new way to
  // where it is every tenth of a second or so, and stands waiting once he is there. The camera goes along with him (follow).
  const pathLength = (p) => p.reduce((n, q, i) => (i ? n + Math.hypot(q[0] - p[i - 1][0], q[1] - p[i - 1][1]) : 0), 0);
  function heroHalt() { cancelAnimationFrame(hero.raf); hero.raf = 0; hero.walk = null; grid = null; }
  function heroSteps(st) { cancelAnimationFrame(hero.raf); hero.t = performance.now(); hero.raf = requestAnimationFrame((t) => heroStep(st, t)); }
  function heroWalk(st, pts, done) {
    const el = st.querySelector('.hero'), len = pathLength(pts);
    if (!el || len < 1e-3) { heroHalt(); if (done) done(); return; }
    hero.pose = ''; hero.lead = null; el.classList.remove('sit', 'sofa', 'kneel', 'sleep', 'reach', 'crouch', 'look', 'out'); HERO.still(el);
    hero.walk = { pts: pts.slice(1), v: Math.max(5.5, len / 1.1), done };   // a long way hurries, about a second at most
    heroSteps(st);
  }
  function heroLead(st, off) {   // a finger on the hero leads him (off: from the finger to his feet, on the screen)
    if (standUp()) heroPlace(st);   // up from the chair (out behind it), the sofa or the kotatsu
    st.querySelector('.hero').classList.remove('sit', 'sofa', 'kneel', 'sleep', 'reach', 'crouch', 'look', 'out'); HERO.still(st.querySelector('.hero'));
    hero.going = null; hero.lead = { x: 0, y: 0, off, t: 0, to: null };
    grid = null; grid = walkGrid(); hero.walk = { pts: [], v: 5.5, done: null }; heroSteps(st);
  }
  function leadTarget(st) {   // the floor under the finger (his feet as they were under it), pushed on near the screen's sides
    const L = hero.lead, r = st.getBoundingClientRect(), edge = r.width * 0.12;
    const x = L.x + L.off[0] + (L.x < r.left + edge ? -0.3 : L.x > r.right - edge ? 0.3 : 0) * r.width;
    return floorAt(roomPoint(st, { clientX: x, clientY: L.y + L.off[1] }));
  }
  function heroStep(st, now) {
    hero.raf = 0;
    const w = hero.walk, el = st.querySelector('.hero');
    if (!st.isConnected || !w || !el) { hero.walk = null; grid = null; return; }
    const dt = Math.min(0.25, (now - hero.t) / 1000); hero.t = now;
    if (hero.lead && now - hero.lead.t > 90) {
      hero.lead.t = now;
      const to = leadTarget(st), was = hero.lead.to;
      if (!was || Math.hypot(to[0] - was[0], to[1] - was[1]) > 0.2) {
        hero.lead.to = to;
        const p = pathTo([hero.x, hero.y], to);
        if (p) { w.pts = p.slice(1); w.v = pathLength(p) > 2.5 ? 8.5 : 5.5; }
      }
    }
    const x0 = hero.x, y0 = hero.y; let go = dt * w.v;
    while (go > 1e-6 && w.pts.length) {
      const [tx, ty] = w.pts[0], d = Math.hypot(tx - hero.x, ty - hero.y);
      if (d <= go) { hero.x = tx; hero.y = ty; go -= d; w.pts.shift(); } else { hero.x += (tx - hero.x) / d * go; hero.y += (ty - hero.y) / d * go; go = 0; }
    }
    const dx = hero.x - x0, dy = hero.y - y0, moving = Math.abs(dx) + Math.abs(dy) > 1e-6;
    // led, he catches up with the finger between two aims (one every 90 ms) and would stand a frame: he keeps his step through
    // such a moment, or his walk would begin again from its first step each time and he would seem to slide (1.2.1)
    w.still = moving ? 0 : (w.still || 0) + dt;
    const stepping = moving || (hero.lead && w.still < 0.25);
    el.classList.toggle('run', stepping && w.v > 8); el.classList.toggle('walk', stepping && w.v <= 8);
    if (moving) {
      // which way he faces, by his step on the screen (sx across, sy up or down): from behind or facing us only when it clearly goes
      // up or down, mirrored only when it clearly goes left or right. Going nearly across, his step points a hair up or down by
      // turns: he turned round with it, and each turn began the legs' step again (1.2.1)
      const sx = dx - dy, sy = (dx + dy) / 2;
      if (Math.abs(sy) > 0.2 * Math.abs(sx)) hero.back = sy < 0;
      if (Math.abs(sx) > 0.2 * Math.abs(sy)) hero.flip = sx < 0;
      if (Math.abs(sx) > 0.6 * Math.abs(sy)) hero.turn = true; else if (Math.abs(sx) < 0.3 * Math.abs(sy)) hero.turn = false;   // across (the room's own lines run so): a little turned; straight up or down: square on (a gap between, so no flicker)
      let rem = 0, at = [hero.x, hero.y]; for (const q of w.pts) { rem += Math.hypot(q[0] - at[0], q[1] - at[1]); at = q; }   // how far he still goes
      heroPlace(st); follow(st, sx, hero.lead ? 9 : rem / w.v); SND.step(SND.groundOf('room', 'off'), w.v > 8);   // his footsteps on the floorboards
    }
    if (w.pts.length || hero.lead) { hero.raf = requestAnimationFrame((t) => heroStep(st, t)); return; }
    hero.walk = null; grid = null; el.classList.remove('walk', 'run'); el.innerHTML = heroArt(); heroSave();   // lit where it stopped
    if (w.done) w.done(); else centerOn(st);   // to a thing: in the middle near enough as he gets there, its page or its seat next
  }
  function goHero(st, to, done) {
    standUp();
    const pts = pathTo([hero.x, hero.y], to);
    if (!pts) { heroPlace(st); if (done) done(); return; }
    heroWalk(st, pts, done);
  }
  // seated (test, 2026-11-09: the sofa and the kotatsu besides the chair): getting up steps out — behind the chair, off the
  // sofa or the cushion the way the hero came (hero.out)
  const SEATED = ['sit', 'sofa', 'kneel', 'sleep'];
  function standUp() {
    if (!hero.pose) return false;
    const o = hero.pose === 'sit' ? [0, 1.0] : hero.out || [0, 1];
    hero.x += o[0]; hero.y += o[1]; hero.pose = ''; hero.out = null; hero.seat = null;
    return true;
  }
  function heroLook(look) {
    if (look === 'F' || look === 'X') { hero.back = false; hero.flip = false; hero.turn = look === 'X'; return; }   // facing us; turned along +x
    if (look === 'Y') { hero.back = false; hero.flip = true; hero.turn = true; return; }   // turned along +y
    if (look === 'R') { hero.back = true; hero.flip = false; hero.turn = true; } else if (look === 'L') { hero.back = true; hero.flip = true; hero.turn = true; } }   // a wall runs at a slant: turned to it
  function heroAt(st, sp) {   // at a thing's spot, facing it, doing its bit (sit stays; the rest pass)
    const el = st.querySelector('.hero');
    hero.x = sp.x; hero.y = sp.y; heroLook(sp.look); hero.pose = SEATED.includes(sp.act) ? sp.act : ''; hero.out = sp.out || null; hero.seat = sp.seat || null;
    heroPlace(st); heroSave(); SND.play(ACT_SND[sp.act]);
    if (el && !SEATED.includes(sp.act)) { el.classList.add(sp.act); if (sp.act !== 'out') setTimeout(() => el.classList.remove(sp.act), 900); }
  }
  const ACT_SND = { sit: 'sit', sofa: 'cushion', kneel: 'cushion', sleep: 'cloth' };   // sat down, lain down (環境音)
  const POSE_MS = { sit: 300, sofa: 300, kneel: 300, sleep: 300, reach: 340, crouch: 340, look: 300, out: 60 };
  // a thing tapped: the hero walks to it and does its bit, then the thing's own way into its page; tapped again on the way: straight in
  let namedT = 0;
  function named(st, el) {   // a tapped thing shows its words for a moment (they wait in its badge)
    const off = (t) => { t.classList.remove('named'); delete t.dataset.w; };
    st.querySelectorAll('.thing.named').forEach(off);
    el.classList.add('named'); delete el.dataset.w; if (cam.c) place(st);
    clearTimeout(namedT); namedT = setTimeout(() => { if (el.isConnected) { off(el); place(st); } }, 1800);
  }
  function use(el, fn, spot) {
    const st = el.closest('.study'), id = el.dataset.thing || 'w:' + el.dataset.ware, sp = spot || (el.dataset.thing ? spotOf(el.dataset.thing) : null);
    if (st && el.dataset.thing) named(st, el);
    if (!st || !sp || !st.querySelector('.hero') || ed.on) { fn(); return; }
    if (reduced() || hero.going === id) { heroHalt(); hero.going = null; heroAt(st, sp); fn(); return; }
    hero.going = id;
    goHero(st, sp.from || (sp.act === 'sit' ? [sp.x, sp.y + 1.0] : [sp.x, sp.y]), () => {
      if (hero.going !== id) return;
      heroAt(st, sp);
      setTimeout(() => { if (hero.going !== id) return; hero.going = null; fn(); }, POSE_MS[sp.act] || 300);
    });
  }
  // a ware that does something (the gramophone plays 聽一輪): the hero goes to the clear side of it first
  function useWare(el) {
    const o = placedWares().find((q) => q.id === el.dataset.ware); if (!o) return;
    // test (2026-11-09): the sofa, sat on (the nearer of its two seats, facing us); the kotatsu, knelt at (its left cushion, facing along it)
    if (o.it.act === 'sofa') {
      const sx = o.p.x + (hero.x < o.p.x ? -0.75 : 0.75), sy = o.p.y + 0.45;
      use(el, () => {}, { x: sx, y: sy, look: 'F', act: 'sofa', from: [sx, o.p.y + 1.4], out: [0, 0.95], seat: 'w:' + o.id }); return;
    }
    // the bed (test, 2026-11-09): lain on, the head on the pillow, getting off by its open side
    if (o.it.act === 'bed') { use(el, () => NAP.offer(), { x: o.p.x, y: o.p.y + 1.22, look: 'F', act: 'sleep', from: [o.p.x + 1.95, o.p.y + 1], out: [1.95, -0.2], seat: 'w:' + o.id }); return; }
    if (o.it.act === 'kotatsu') { use(el, () => {}, { x: o.p.x - 1.18, y: o.p.y, look: 'X', act: 'kneel', from: [o.p.x - 1.9, o.p.y], out: [-0.72, 0] }); return; }
    const g = walkGrid(), ok = ([x, y]) => { const i = Math.floor(x / CELL), j = Math.floor(y / CELL); return i >= 0 && j >= 0 && i < GW && j < GH && !g[j * GW + i]; };
    if (o.it.act === 'kneel') { use(el, () => {}, kneelSpot(o, ok)); return; }
    // a wall's (the round mirror): stood before it, facing the wall. A floor one: on its +y side, else its +x side — the other
    // way round for one whose front looks along +x (faces, unturned: the wardrobe, the full-length mirror), so it is stood before
    const f = o.it.kind === 'wall' ? null : wareFootprint(o.it, o.p), sides = f && [[o.p.x, f[3] + 0.5, 'R'], [f[2] + 0.5, o.p.y, 'L']];
    if (sides && o.it.faces === 'x' && !o.p.r) sides.reverse();
    const [x, y, look] = f ? sides.find(ok) || sides[0]
      : [1.2, 1.7, 2.4].map((d) => (o.p.w === 'L' ? [d, o.p.u, 'L'] : [o.p.u, d, 'R'])).find(ok) || (o.p.w === 'L' ? [1.2, o.p.u, 'L'] : [o.p.u, 1.2, 'R']);
    use(el, () => { SND.play({ diary: 'page', wardrobe: 'cloth' }[o.it.act]); if (o.it.act === 'music') MUSIC.pick(el.closest('.study')); else if (o.it.act === 'wardrobe') DRESS.open(el.closest('.study')); else if (o.it.act === 'mirror') DRESS.open(el.closest('.study'), 'mirror', o.it.name === '矮櫃' ? '梳妝鏡' : o.it.name); else if (o.it.act === 'diary') DIARY.open(); else if (o.it.act === 'water') water(el.closest('.study'), o, look); }, { x, y, look, act: 'reach' });
  }
  // the gramophone playing (test, 2026-11-09): notes rise from its horn (shown while .study.music)
  function gramoTune() {
    const o = placedWares().find((q) => q.id === 'gramophone'); if (!o) return '';
    const [gx, gy] = P(o.p.x + 0.2, o.p.y - 0.2, 1.1);
    return `<div class="tune gramo" aria-hidden="true" style="${vbPct(gx - 20, gy - 104)};${vbSize(40, 60)}"><i style="--w:0s;--dx:-12px">♪</i><i style="--w:-1.2s;--dx:14px">♫</i><i style="--w:-2.4s;--dx:2px">♪</i></div>`;
  }
  // knelt (test, 2026-11-09), as at the kotatsu: on a floor cushion — facing a low table beside it, else us; at a low table on a
  // cushion beside it, else at its first open side (left, back, right, front), facing it. from: where the hero walks to, out: back there
  function kneelSpot(o, ok) {
    const face = (dx, dy) => (Math.abs(dx) >= Math.abs(dy) ? (dx > 0 ? 'X' : 'L') : dy > 0 ? 'Y' : 'R');
    const near = (id, q) => placedWares().find((w) => w.id === id && Math.hypot(w.p.x - q.x, w.p.y - q.y) < 2.4);
    const at = (x, y, look, sides) => { const fr = sides.map(([dx, dy]) => [x + dx, y + dy]).find(ok) || [x + sides[0][0], y + sides[0][1]]; return { x, y, look, act: 'kneel', from: fr, out: [fr[0] - x, fr[1] - y], seat: cushion ? 'w:' + cushion.id : null }; };
    const round = [[0, 0.95], [0.95, 0], [-0.95, 0], [0, -0.95]];
    const cushion = o.id === 'zabuton' ? o : near('zabuton', o.p), table = o.id === 'chabudai' ? o : near('chabudai', o.p);
    if (cushion) return at(cushion.p.x, cushion.p.y, table ? face(table.p.x - cushion.p.x, table.p.y - cushion.p.y) : 'F', table ? round.slice().sort((a, b) => (a[0] * (table.p.x - cushion.p.x) + a[1] * (table.p.y - cushion.p.y)) - (b[0] * (table.p.x - cushion.p.x) + b[1] * (table.p.y - cushion.p.y))) : round);
    const r = o.it.fp[0] / 2 + 0.15, x = o.p.x, y = o.p.y;
    const side = [[-1, 0], [0, -1], [1, 0], [0, 1]].find(([a, b]) => ok([x + a * (r + 0.75), y + b * (r + 0.75)])) || [-1, 0];
    return at(x + side[0] * r, y + side[1] * r, face(-side[0], -side[1]), [[side[0] * 0.75, side[1] * 0.75]]);
  }
  // watering a plant (test, 2026-11-09): a can over it from the hero's side tips, drops fall on it, it sways, a few sparkles
  function water(st, o, look) {
    if (!st) return;
    SND.play('pour');
    const [x, y] = P(o.p.x, o.p.y, (o.it.h || 2) * 0.8), flip = look === 'L';   // the hero to its right (L): the can comes from there
    const el = document.createElement('div');
    el.className = 'watering'; el.style.cssText = `${vbPct(x - 70, y - 64)};${vbSize(140, 100)}`;
    el.innerHTML = `<svg viewBox="0 0 140 100" aria-hidden="true"><g${flip ? ' transform="translate(140 0) scale(-1 1)"' : ''}>
      <g class="can"><path d="M22 30 Q22 22 30 22 H52 Q60 22 60 30 V52 Q60 58 54 58 H28 Q22 58 22 52 Z" fill="#5aa0b8"/><path d="M28 22 Q41 6 54 22" fill="none" stroke="#3f7f96" stroke-width="4" stroke-linecap="round"/>
        <path d="M58 46 L84 30" stroke="#5aa0b8" stroke-width="6" stroke-linecap="round"/><ellipse cx="86" cy="29" rx="4" ry="6" transform="rotate(-30 86 29)" fill="#3f7f96"/><path d="M26 34 H56" stroke="#8fc6d8" stroke-width="3" stroke-linecap="round"/></g>
      <g class="drops">${[[86, 40, 0], [92, 44, -0.17], [80, 46, -0.33], [96, 38, -0.25], [88, 50, -0.08]].map(([dx, dy, w]) => `<ellipse class="drop" cx="${dx}" cy="${dy}" rx="1.8" ry="3" fill="#7cc4ea" style="--w:${w}s"/>`).join('')}</g>
      <g fill="#ffe27a">${[[74, 52], [104, 58], [90, 40]].map(([sx, sy]) => `<path class="spark" d="M${sx} ${sy - 5} L${sx + 1.6} ${sy - 1.6} L${sx + 5} ${sy} L${sx + 1.6} ${sy + 1.6} L${sx} ${sy + 5} L${sx - 1.6} ${sy + 1.6} L${sx - 5} ${sy} L${sx - 1.6} ${sy - 1.6} Z"/>`).join('')}</g></g></svg>`;
    st.querySelector('.room').appendChild(el);
    const g = st.querySelector(`svg.art [data-o="w:${o.id}"]`);
    if (g) { g.classList.remove('joy'); void g.getBoundingClientRect(); g.classList.add('joy'); setTimeout(() => g.classList.remove('joy'), 3200); }
    setTimeout(() => el.remove(), 3000);
  }
  function heroSettle(st) {   // back in the room: out of anything just put where it stood (off a chair moved away)
    if (hero.pose === 'sit') { const c = spotOf('notebook'); if (Math.hypot(hero.x - c.x, hero.y - c.y) < 0.05) { heroPlace(st); return; } } standUp();
    const g = walkGrid(), i = Math.floor(hero.x / CELL), j = Math.floor(hero.y / CELL);
    if (i < 0 || j < 0 || i >= GW || j >= GH || g[j * GW + i]) { const p = pathTo([hero.x, hero.y], [hero.x, hero.y]); if (p) { const q = p[p.length - 1]; hero.x = q[0]; hero.y = q[1]; } }
    heroPlace(st);
  }
  function heroRedraw(st) { const el = st && st.querySelector('.hero'); if (el) el.innerHTML = heroArt(); if (st) st.dataset.sig = roomSig(); }
  function heroIn() { const p = { x: SPOTS.door.x + 0.3, y: SPOTS.door.y, back: false, flip: false, turn: false, pose: '' }; if (ROOMID === 'study') Object.assign(hero, p); heroPos.study = p; heroSave(); }   // in from the yard: just inside 書房's door
  // the clocks on the walls tell the time: their hands are overlays (sceneTick's --hh／--mm), skewed onto the wall they hang on
  function handsHtml() {
    return placedWares().filter((o) => o.it.hands).map(({ it, p }) => {
      const { r, dv } = it.hands, v = p.v + (dv || 0), [cx, cy] = p.w === 'L' ? P(0.1, p.u + r, v + r) : P(p.u - r, 0.1, v + r);
      return `<div class="clock-hands${p.w === 'R' ? ' on-r' : ''}" aria-hidden="true" style="${vbPct(cx, cy)};${vbSize(2 * r * S, 2 * r * S)};--ssd:-${new Date().getSeconds()}s"><i class="hh"></i><i class="mm"></i><i class="ss"></i></div>`;
    }).join('');
  }

  // ===== the things you can tap; route or act: where it leads =====
  // pts: the room points the button covers (its box is their bounding box on screen, plus pad), or one point and a box around it
  // on screen (sb); tag: where the name tag sits
  const doorThing = (d) => ({ id: d.id, act: 'study-door', label: d.label, icon: 'door', minor: true, pts: [[0, d.y0, 0], [0, d.y1, 0], [0, d.y1, DOOR.z1], [0, d.y0, DOOR.z1]], tag: [0.25, d.y0 + 0.45, 3.3] });
  let THINGS = [];   // the room's: its doors, and in 書房 its working things (setRoom)
  const STUDY_THINGS = [
    // the bookcase from the desk's height up (lower down the desk and the chair stand in front of it)
    { id: 'shelf', route: '#/course', label: '課程', icon: 'course', pts: [[0, BC.y1, 3.1], [BC.x1, BC.y1, 3.1], [BC.x1, BC.y0, 3.1], [BC.x1, BC.y1, BC.z1], [0, BC.y0, BC.z1]], tag: [BC.x1, 1.9, 4.42] },
    { id: 'cards', route: '#/vocab', label: '單字', icon: 'vocab', pts: [[CB.x0, CB.y0, CB.z], [CB.x1, CB.y0, CB.z], [CB.x1, CB.y1, CB.z], [CB.x0, CB.y1, CB.z], [CB.x0 + 0.08, CB.y0 + 0.12, CB.z + 0.61], [CB.x1 - 0.08, CB.y1 - 0.13, CB.z + 0.61]], tag: [BC.x1, (CB.y0 + CB.y1) / 2, BC.z1 + 0.18], pad: 8 },
    { id: 'notebook', act: 'study-practice', label: '今日練習', icon: 'practice', primary: true, pts: [[NB.x0, NB.y0, DESK.z1], [NB.x1, NB.y0, DESK.z1], [NB.x1, NB.y1, DESK.z1], [NB.x0, NB.y1, DESK.z1]], tag: [(NB.x0 + NB.x1) / 2 + 2.0 - (NB.y0 + NB.y1) / 2, DESK.y1, 2.62], pad: 14 },
    { id: 'phones', route: '#/listen', label: '聽一輪', icon: 'listen', primary: true, pts: PH_PTS, tag: [DESK.x1 + 0.2, HP.y + 0.62, 2.55], pad: 10 },
    { id: 'drawer', act: 'study-drawer', label: '錯題本', icon: 'mistakes', pts: [[DR.x0, DR.y1, 0.2], [DR.x1, DR.y1, 0.2], [DR.x1, 0, 0.2], [DR.x0, DR.y1, DR.h], [DR.x0, 0, DR.h], [DR.x1, 0, DR.h]], tag: [8.45, DR.y1, 1.9], pad: 6 },
    { id: 'board', route: '#/stats', label: '學習分析', icon: 'chart', pts: [[BD.x0, 0, BD.z0], [BD.x1, 0, BD.z1]], tag: [(BD.x0 + BD.x1) / 2, 0, BD.z1 + 0.32], pad: 6 },
    { id: 'calendar', route: '#/exam', label: '模擬考', icon: 'exam', pts: [[CAL.x0, 0, CAL.z0], [CAL.x1, 0, CAL.z1]], tag: [(CAL.x0 + CAL.x1) / 2, 0, CAL.z0 - 0.32], pad: 6 }
  ];

  // the things' name tags: today's practice shows the day's progress, the drawer how many are in the notebook, the door the
  // letters waiting in the mailbox outside
  function tagOf(id, pct) {
    if (id === 'notebook') return pct < 100 ? `今日練習 ${pct}%` : extraQueue().items.length ? '今日完成・多學' : '今日完成';   // nothing new left anywhere: no 多學
    if (id === 'phones') { const ms = listenHeardToday(); return ms < KOTO_LISTEN_MS ? `聽一輪 ${Math.floor(ms / 60000)}/5 分鐘` : '聽一輪・今天聽夠了'; }
    if (id === 'door') { const n = mailCount(); return `出門${n ? `・${n} 封信` : ''}`; }   // and the letters (how many events are open: 町の手帳 only, 2026-11-10)
    return THINGS.find((t) => t.id === id).label;
  }
  // a thing's badge (1.2.0): its sign, and what its words said — today's practice a ring that fills with the day, the door's
  // letters its red dot (錯題本 stays plain: nothing to ask for a tap there); the words show for a moment when it is tapped
  // blue (primary) while the day's part is undone: 今日練習 till done, 聽一輪 till 5 minutes heard (2026-11-10, the user); then white
  const blue = (t, pct) => t.primary && !(t.id === 'notebook' && pct >= 100) && !(t.id === 'phones' && heardPct() >= 100);
  function tagInner(id, pct) {
    const p = id === 'notebook' ? pct : id === 'phones' ? heardPct() : null;
    const ring = p !== null ? `<svg class="ring" viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="18" pathLength="100"/><circle class="fill" cx="20" cy="20" r="18" pathLength="100" stroke-dasharray="${Math.min(100, p)} 100"/></svg>` : '';
    return `${ring}${icon(THINGS.find((t) => t.id === id).icon)}<span class="tag-name">${tagOf(id, pct)}</span>`;
  }
  const chev = (d) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="${d}"/></svg>`;
  // the bulbs of the strings hung now, as one row (each with its string's id, so it hides while the string is dragged): each lights
  // at its share of the day's list, the shares spread along the row
  function bulbsHtml(f) {
    const all = placedWares().filter((o) => o.it.garland).sort((a, b) => (a.id < b.id ? -1 : 1)).flatMap((o) => bulbsAt(o.it.size[0], o.p).map((q) => [o.id, q]));
    return all.map(([id, q], i) => {
      const t = Math.round(((i * 11) % all.length) / all.length * 100) / 100, [x, y] = P(...q);
      return `<i class="bulb${t <= f ? ' on' : ''}" data-t="${t}" data-w="${id}" aria-hidden="true" style="${vbPct(x, y)}"></i>`;
    }).join('');
  }
  function html(pct, rm = ROOMID) {
    show(rm);
    LIT = roomLights();
    const study = ROOMID === 'study';
    const f = pct / 100, d = parseDate(todayStr()), left = examPace().daysLeft, bk = shelfBooks(), mail = mailCount();
    const thing = (t0) => {
      const m = OWNER[t0.id] ? mover(OWNER[t0.id]).map : (q) => q, t = Object.assign({}, t0, { pts: t0.pts.map(m), tag: m(t0.tag) });
      const a = P(...t.pts[0]), sp = t.sb ? [[a[0] + t.sb[0], a[1] + t.sb[1]], [a[0] + t.sb[2], a[1] + t.sb[3]]] : t.pts.map((p) => P(...p)), pad = t.pad || 4;
      const x0 = Math.min(...sp.map((p) => p[0])) - pad, x1 = Math.max(...sp.map((p) => p[0])) + pad, y0 = Math.min(...sp.map((p) => p[1])) - pad, y1 = Math.max(...sp.map((p) => p[1])) + pad;
      const [tx, ty] = P(...t.tag), label = tagOf(t.id, pct);
      return `<button type="button" class="thing${blue(t, pct) ? ' primary' : t.minor ? ' minor' : ''}${t.id === 'door' && mail ? ' mail' : ''}" data-thing="${t.id}" data-tag="${r1(tx)} ${r1(ty)}" ${t.route ? `data-act="study-go" data-route="${t.route}"` : `data-act="${t.act}"`} style="${vbPct(x0, y0)};${vbSize(x1 - x0, y1 - y0)};--tx:${((tx - x0) / (x1 - x0) * 100).toFixed(1)}%;--ty:${((ty - y0) / (y1 - y0) * 100).toFixed(1)}%" aria-label="${label}"><span class="tag">${tagInner(t.id, pct)}</span></button>`;
    };
    const dm = mover('desk').map, glow = (L, w, h, c) => { const [gx, gy] = P(...L.p); return `<i class="glow lamp-glow${c}" aria-hidden="true" style="${vbPct(gx - w / 2, gy - h / 2)};${vbSize(w, h)}"></i>`; };
    const [nx, ny] = P(...dm([(NB.x0 + NB.x1) / 2, (NB.y0 + NB.y1) / 2, DESK.z1])), [mx, my] = P(...dm([MUG[0], MUG[1], DESK.z1]));
    const sky = (o) => { const wh = winHole(o.p), [wx, wy] = P(...wh.at(wh.X0, -0.34, wh.z1)); return `<div class="w-sky${wh.R ? '' : ' l'}" data-w="${o.id}" aria-hidden="true" style="${vbPct(wx, wy)};${vbSize((wh.u1 - wh.u0) * S, (wh.z1 - wh.z0) * S)}">`; };   // the sky behind a window, where it hangs
    return `<div class="study${pct >= 100 ? ' full' : ''}${ed.on ? ' edit' : ''}" data-room="${ROOMID}" data-anim data-date="${todayStr()}" data-sig="${roomSig()}" style="--f:${f}">
      <div class="room-sky" aria-hidden="true">${[[12, 0.9, 120, 10], [34, 0.6, 160, 70], [58, 0.75, 140, 40], [76, 0.5, 190, 120]].map(([y, k, d, w]) => `<i class="rcloud" style="top:${y}%;--k:${k};--d:${d}s;--w:-${w}s"></i>`).join('')}</div>
      <div class="room-wrap"><div class="room">
        ${winsHere().map((o) => `${sky(o)}
          <i class="wt-day"></i><i class="wt-warm"></i>
          <div class="w-night"><i class="w-moon"></i>${[[12, 20, 2.6, 0.4], [30, 44, 3.4, 1.6], [78, 52, 2.2, 0.9], [44, 14, 3, 2.2], [88, 22, 2.8, 1.2], [20, 64, 3.6, 0.2]].map(([x, y, dd, w]) => `<i class="w-star" style="left:${x}%;top:${y}%;--o:${(0.45 + w / 4.4).toFixed(2)}"></i>`).join('')}</div>
          <div class="w-day"><i class="w-cloud" style="top:18%;--d:40s;--w:-8s"></i><i class="w-cloud" style="top:42%;--d:56s;--w:-31s;width:34%"></i></div>
          <i class="w-hills"></i><i class="w-hills2"></i>
        </div>`).join('')}
        ${studyArt(d, left, bk)}
        ${bulbsHtml(f)}
        ${handsHtml()}
        ${study ? `${fxLit('chest', drawerFx)}${bookFx(bk)}${cardFx()}${pageFx(d, left)}${phonesFx()}` : ''}${DOORS.map(doorFx).join('')}
        ${heroHtml()}
        ${LIT.map((L) => (L.id === 'desk' ? glow(L, 300, 220, '') : glow(L, 220, 160, ' lamp2'))).join('')}
        ${study ? `<i class="note-glow" aria-hidden="true" style="${vbPct(nx - 100, ny - 54)};${vbSize(200, 108)}"></i>
        <div class="steam" aria-hidden="true" style="${vbPct(mx - 8, my - 40)};${vbSize(16, 24)}"><i style="--w:0s"></i><i style="--w:-1.1s;left:50%"></i><i style="--w:-2.3s;left:20%"></i></div>` : ''}
        ${gramoTune()}
        ${THINGS.map(thing).join('')}
        ${ed.on ? '' : LAMPS.map((L) => { const [lx, ly] = P(...L.p); return `<button type="button" class="lamp-tap${lampOff(L.id) ? ' off' : ''}" data-act="lamp-toggle" data-lamp="${L.id}" style="${vbPct(lx - 24, ly - 24)};${vbSize(48, 48)}" aria-label="${lampOff(L.id) ? '開燈' : '關燈'}"></button>`; }).join('')}
        ${ed.on ? '' : placedWares().filter((o) => o.it.act).map((o) => { const b = wareBox(o); return `<button type="button" class="ware-use" data-act="ware-use" data-ware="${o.id}" style="${vbPct(b[0], b[1])};${vbSize(b[2] - b[0], b[3] - b[1])}" aria-label="${esc(o.it.name)}：${{ music: '換唱片', sofa: '坐下', kotatsu: '坐下', kneel: '跪坐', diary: '外婆的日記', wardrobe: '衣櫃', bed: '睡覺', water: '澆水', mirror: '照鏡子' }[o.it.act] || ''}"></button>`; }).join('')}
        ${ed.on ? `${decosHtml()}${selHtml()}<svg class="ghost" viewBox="${VB.join(' ')}" aria-hidden="true"><g></g></svg>` : ''}
      </div></div>
      ${ed.on ? editHtml() : ''}
      <i class="warm-wash" aria-hidden="true"></i>
      <div class="study-tools">${sceneTools('room-edit')}</div>
      <div class="room-hint">按住主角拖曳，帶他在房間走走</div>
      ${study ? `<button type="button" class="mail-hint" data-act="mail-hint">${icon('mail')}<span>外面信箱有新信</span>${chev('M9 6l6 6-6 6')}</button>` : ''}
    </div>`;
  }
  // a redraw on the same day (a sync, a setting): the tags, the bulbs and the lamps follow, the motion carries on
  function level(st, pct) {
    st.style.setProperty('--f', pct / 100);
    st.classList.toggle('full', pct >= 100);
    const mail = mailCount() > 0;
    st.querySelectorAll('[data-thing="notebook"], [data-thing="door"], [data-thing="phones"]').forEach((b) => { b.querySelector('.tag').innerHTML = tagInner(b.dataset.thing, pct); b.setAttribute('aria-label', tagOf(b.dataset.thing, pct)); delete b.dataset.w; });
    st.querySelectorAll('[data-thing="notebook"], [data-thing="phones"]').forEach((b) => b.classList.toggle('primary', blue(THINGS.find((t) => t.id === b.dataset.thing), pct)));
    const yd = st.querySelector('[data-thing="door"]'); if (yd) yd.classList.toggle('mail', mail);
    st.querySelectorAll('.bulb').forEach((e) => e.classList.toggle('on', Number(e.dataset.t) <= pct / 100));
    st.querySelectorAll('.cal-stamp text').forEach((e) => { e.textContent = `${streakStats().current}日連続`; });   // another device's answers today
    kotoButtons(st);
    if (cam.c) place(st);   // the tags whose words changed, kept whole at a side
  }

  // the camera (1.2.0): on a phone a part of the room the size of the old stops, round the hero, going along with him as he
  // walks; a swipe looks round freely and stays where it is let go (a fling coasts on); two fingers, the wheel or + − zoom from
  // the whole room to twice as close. The zoom is this device's own (localStorage nq_room_zoom, a share of the zoom it starts
  // at); where it looks is kept while the app runs, so a page opened at the bed comes back to the bed.
  const cam = { W: 0, H: 0, k: 1, kc: 1, k0: 1, kMin: 1, kMax: 2, c: null };   // k: the zoom shown, kc: the one the room is laid out at (they differ mid-pinch), c: the middle of the screen in the drawing's units
  let zoomShare = 1; try { zoomShare = Number(localStorage.getItem('nq_room_zoom')) || 1; } catch (e) { /* no storage: the zoom it starts at */ }
  let held = false, glideTill = 0;   // held: a finger has the camera (the hero's walk leaves it be); glideTill: a glide under way
  let wakeRoom = null;   // brings the things' signs back (書房 on the page now)
  function measure(st) {
    cam.W = st.clientWidth; cam.H = st.clientHeight;
    if (!cam.W || !cam.H) return;
    const fit = (w, h) => Math.min(cam.W / (w * S), cam.H / (h * S)), wide = cam.W >= 700 && cam.W >= cam.H;   // a tablet held upright starts like a phone
    cam.kMin = fit(BOUND[2] - BOUND[0], BOUND[3] - BOUND[1]); cam.kMax = 2 * fit(...FRAME); cam.k0 = wide ? cam.kMin : Math.max(cam.kMin, PHONE_K * fit(...FRAME));
    cam.k = Math.max(cam.kMin, Math.min(cam.kMax, cam.k0 * zoomShare));
    layout(st);
  }
  function layout(st) {   // the room laid out at the zoom it is shown at (sharp again after a pinch); well out, the big tags go small
    const room = st.querySelector('.room');
    cam.kc = cam.k; room.style.width = `${(VB[2] * cam.k).toFixed(1)}px`; room.style.height = `${(VB[3] * cam.k).toFixed(1)}px`;
    const k1 = PHONE_K * Math.min(cam.W / (FRAME[0] * S), cam.H / (FRAME[1] * S));   // a phone's zoom to start with
    st.classList.toggle('far', cam.k < 0.8 * k1);
    st.querySelectorAll('.thing').forEach((t) => { delete t.dataset.w; });   // the tags' widths, measured again
  }
  const halfView = () => [cam.W / 2 / cam.k, cam.H / 2 / cam.k];   // half the screen in the drawing's units
  // the middle of the screen, kept where the screen stays on the room (give: how much of a pull past an edge a finger gets)
  function inBound([x, y], give = 0) {
    const [hw, hh] = halfView(), b = BOUND.map((v) => v * S);
    const one = (v, lo, hi) => (lo > hi ? (lo + hi) / 2 : v < lo ? lo - (lo - v) * give : v > hi ? hi + (v - hi) * give : v);
    return [one(x, b[0] + hw, b[2] - hw), one(y, b[1] + hh, b[3] - hh)];
  }
  function place(st, glide = false, soft = false) {
    const room = st.querySelector('.room'); if (!room || !cam.W) return;
    const s = cam.k / cam.kc;
    room.classList.toggle('glide', glide); room.classList.toggle('soft', soft);
    room.style.transform = `translate3d(${(cam.W / 2 - (cam.c[0] - VB[0]) * cam.k).toFixed(1)}px,${(cam.H / 2 - (cam.c[1] - VB[1]) * cam.k).toFixed(1)}px,0)${Math.abs(s - 1) > 1e-4 ? ` scale(${s.toFixed(4)})` : ''}`;
    st.querySelectorAll('.thing').forEach((t) => {   // a thing off the screen: its tag waits; one at a side: its tag slides in to stay whole
      const [x, y] = t.dataset.tag.split(' ').map(Number), dx = (x - cam.c[0]) * cam.k, dy = (y - cam.c[1]) * cam.k;
      const away = Math.abs(dx) > cam.W / 2 - 20 || Math.abs(dy) > cam.H / 2 - 20;
      if (t.classList.contains('away') !== away) t.classList.toggle('away', away);
      const w = Number(t.dataset.w || (t.dataset.w = t.querySelector('.tag').offsetWidth)), nx = away ? 0 : Math.round(Math.max(0, Math.abs(dx) + w / 2 + 6 - cam.W / 2) * -Math.sign(dx));
      if (Number(t.dataset.nx || 0) !== nx) { t.dataset.nx = nx; t.style.setProperty('--nx', `${(nx * cam.kc / cam.k).toFixed(1)}px`); }
    });
  }
  function glide(st) { glideTill = performance.now() + 460; place(st, true); }
  function zoomed(st) {   // a zoom done: the room laid out sharp at it, kept for next time
    layout(st); cam.c = inBound(cam.c); place(st);
    zoomShare = cam.k / cam.k0;
    try { localStorage.setItem('nq_room_zoom', zoomShare.toFixed(4)); } catch (e) { /* ignore */ }
  }
  const HERO_H = 180;   // from the hero's feet to the top of his head, in the drawing's units
  function keepHero([cx, cy], px, py) {   // up or down so the hero is whole on the screen (under the buttons at the top)
    const [, hh] = halfView(), top = 64 / cam.k, bottom = 30 / cam.k;
    if (py > cy + hh - bottom) cy = py - hh + bottom;
    else if (py - HERO_H < cy - hh + top) cy = py - HERO_H + hh - top;
    return inBound([cx, cy]);
  }
  let RIDE = [];   // the old stops' middles, per room (setRoom)
  function rideY(x) {   // the old stops' middles joined up: how high the camera looks at each place along the room
    if (x <= RIDE[0][0]) return RIDE[0][1];
    const i = RIDE.findIndex((q) => q[0] >= x); if (i < 0) return RIDE[RIDE.length - 1][1];
    const [a, b] = [RIDE[i - 1], RIDE[i]]; return a[1] + (b[1] - a[1]) * (x - a[0]) / (b[0] - a[0]);
  }
  function homeView() {   // a room first opened: the hero in the middle, as high as the old stops look there, up or down to keep him whole
    const [px, py] = P(hero.x, hero.y, 0);
    return keepHero([px, rideY(px)], px, py);
  }
  // the hero took a step (mx: which way on the screen; rem: how far he still goes). Sent somewhere (2026-11-10, the user: keep him
  // nearer the middle — at the edge of the middle half the screen kept sliding and he walked into its side): the camera eases after a
  // point a little ahead of him the way he walks, coming back to him as he nears where he goes, so he is a little behind the middle
  // with more in sight ahead; a walk over the bare floor or a lead ends with a glide that puts him in the middle (centerOn). Led by a
  // finger: once he is out of the middle half of the screen the camera goes along, only the way he walks (one walking in from off the
  // screen is left to come in) — eased after him, the floor under a finger held still would keep moving away. All of it rides the line
  // of the old stops; a finger that moved the camera (held) leaves it be till the next touch
  const fol = { t: 0, x: 0, lead: 0, aim: null };
  function follow(st, mx, rem = 9) {
    if (!cam.c || held || performance.now() < glideTill) return;
    const [px, py] = P(hero.x, hero.y, 0), [hw, hh] = halfView(), [cx, cy] = cam.c;
    let nx = cx;
    if (hero.lead) {
      if (Math.abs(px - cx) > hw || py < cy - hh || py - HERO_H > cy + hh) return;
      const z = hw / 2; nx = px > cx + z && mx > 0 ? px - z : px < cx - z && mx < 0 ? px + z : cx;
    } else {
      const now = performance.now(), dt = fol.t && now - fol.t < 100 ? (now - fol.t) / 1000 : 0, vx = dt ? (px - fol.x) / dt : 0;
      fol.t = now; fol.x = px; if (!dt) { fol.aim = null; return; }
      const L = hw * 0.24, near = Math.min(1, rem / 0.7), want = Math.max(-L, Math.min(L, vx * 0.3)) * near * near * (3 - 2 * near);   // rem: the seconds he still walks — the look-ahead gone as he gets there
      fol.lead += (want - fol.lead) * (1 - Math.exp(-dt / (Math.abs(want) < Math.abs(fol.lead) ? 0.12 : 0.35)));
      const T = px + fol.lead, vT = fol.aim === null ? vx : (T - fol.aim) / dt; fol.aim = T;
      nx = cx + (T + vT * 0.15 - cx) * (1 - Math.exp(-dt / 0.15));   // led by as much as the easing falls behind: on the mark, and on it as he stops
    }
    const c = keepHero([nx, cy + rideY(nx) - rideY(cx)], px, py);
    if (Math.abs(c[0] - cx) + Math.abs(c[1] - cy) < 0.05) return;
    cam.c = c; place(st);
  }
  function centerOn(st) {
    fol.t = 0; fol.lead = 0; fol.aim = null;
    if (!cam.c || held) return;
    const [px, py] = P(hero.x, hero.y, 0), [cx, cy] = cam.c, c = keepHero([px, cy + rideY(px) - rideY(cx)], px, py);
    if (Math.abs(c[0] - cx) + Math.abs(c[1] - cy) < 0.5) return;
    cam.c = c; glideTill = performance.now() + 720; place(st, true, true);   // slow in and slow out
  }
  // how to lead the hero: shown when 書房 opens and on a tap on him, till he has been led once (localStorage nq_hero_led)
  let ledOnce = false, hintT = 0;
  function ledBefore() { if (ledOnce) return true; try { return Boolean(localStorage.getItem('nq_hero_led')); } catch (e) { return false; } }
  function led(st) {
    ledOnce = true; st.querySelector('.room-hint').classList.remove('on');
    try { localStorage.setItem('nq_hero_led', '1'); } catch (e) { /* ignore */ }
  }
  function roomHint(st, ms) { const h = st.querySelector('.room-hint'); h.classList.add('on'); clearTimeout(hintT); hintT = setTimeout(() => h.classList.remove('on'), ms); }
  function tapHero(el) {   // a tap on the hero (in 書房 or the yard): a hop, a wave, a spin or a cheer
    HERO.react(el);
    const st = el.closest('.study');
    if (st && !ledBefore()) roomHint(st, 3000);
  }
  // after the room is in the page: the camera where it was (round the hero the first time), the gestures
  function mount(st) {
    measure(st);
    cam.c = inBound(cam.c || homeView()); place(st);
    hero.frontKey = ''; hero.going = null; hero.lead = null; heroSettle(st);
    const hel = st.querySelector('.room .hero');   // idling now and then while left be
    HERO.idle(hel, () => !hero.walk && !hero.lead && !ed.on && !document.hidden && !st.classList.contains('dressing') && !hel.matches('.reach, .crouch, .look, .out, .walk, .run, .hop, .wave, .spin, .cheer'), true);
    if (ed.on) {
      fitThumbs(st);
      const es = st.querySelector('.edit-sel');   // the picked ware's tools stay on the screen
      if (es) { const r = es.getBoundingClientRect(), b = st.getBoundingClientRect(), dx = r.left < b.left + 8 ? b.left + 8 - r.left : r.right > b.right - 8 ? b.right - 8 - r.right : 0; if (dx) es.style.marginLeft = `${Math.round(dx)}px`; }
    }
    if (back) {   // back from a thing's page: the room zooms out of it (playAnims runs the zoom when the page opens)
      const t = st.querySelector(`.thing[data-thing="${back}"]`);
      if (t) { originAt(st, t); st.classList.add('back'); }
      back = null;
    }
    const ro = new ResizeObserver(() => { if (!st.isConnected) { ro.disconnect(); return; } measure(st); cam.c = inBound(cam.c); place(st); });
    ro.observe(st);
    // the things' signs: in sight when 書房 opens and after a touch, out of sight 4 s later and while a finger moves the room
    let restT = 0;
    const wake = () => { st.classList.remove('quiet'); clearTimeout(restT); restT = setTimeout(() => { if (st.isConnected) st.classList.add('quiet'); }, 4000); };
    const hush = () => { clearTimeout(restT); st.classList.add('quiet'); };
    wakeRoom = wake; wake();
    // one finger on the hero leads him, anywhere else looks round (or drags a ware in 擺設); a second finger zooms
    const fingers = new Map();
    let grab = null, pan = null, pinch = null, swallow = false, afterPinch = false, coast = 0;
    const onHero = (e) => { const f = !ed.on && st.querySelector('.hero .fig'); if (!f) return false; const r = f.getBoundingClientRect(); return e.clientX > r.left - 10 && e.clientX < r.right + 10 && e.clientY > r.top - 10 && e.clientY < r.bottom + 6; };
    const mid = () => { const [a, b] = [...fingers.values()], r = st.getBoundingClientRect(); return [(a[0] + b[0]) / 2 - r.left, (a[1] + b[1]) / 2 - r.top, Math.hypot(a[0] - b[0], a[1] - b[1])]; };
    st.addEventListener('pointerdown', (e) => {
      if (e.target.closest('.dress')) return;   // the dressing room's own
      swallow = st.classList.contains('quiet') && !!e.target.closest('.study-tools'); wake();   // a tap on the buttons up top while they rest only brings them back
      if (grab) { grab = null; hero.lead = null; }   // a finger that never said it let go
      pan = null; held = false;
      if (e.pointerType !== 'mouse') fingers.set(e.pointerId, [e.clientX, e.clientY]);
      if (fingers.size === 2 && !wd) {   // zoom round the point between the fingers (a lead or a look under way stops where it is)
        cancelAnimationFrame(coast); grab = null; pan = null; hero.lead = null; held = true; hush();
        const [mx, my, d] = mid();
        pinch = { d0: Math.max(1, d), k0: cam.k, q: [cam.c[0] + (mx - cam.W / 2) / cam.k, cam.c[1] + (my - cam.H / 2) / cam.k] };
        st.querySelector('.room').classList.remove('glide');
        return;
      }
      if (fingers.size > 1 || afterPinch) return;
      cancelAnimationFrame(coast);
      if (ed.on && e.target.closest('.deco')) { startWareDrag(st, e); return; }
      if (ed.on && e.target.closest('.tray-it') && !(e.pointerType === 'mouse' && e.button !== 0)) { startBoxDrag(st, e); return; }   // pulled out of the box (a tap still takes it out)
      if ((e.pointerType === 'mouse' && e.button !== 0) || e.target.closest('.study-tools, .mail-hint, .edit-top, .edit-tray, .edit-sel')) return;
      if (onHero(e)) grab = { id: e.pointerId, x: e.clientX, y: e.clientY, on: false };
      else pan = { id: e.pointerId, x: e.clientX, y: e.clientY, c0: cam.c.slice(), on: false, hist: [] };
    });
    st.addEventListener('pointermove', (e) => {
      if (fingers.has(e.pointerId)) fingers.set(e.pointerId, [e.clientX, e.clientY]);
      else if (e.pointerType === 'mouse' && !e.buttons) { wake(); return; }   // a mouse over the room
      if (pinch) {
        if (fingers.size < 2) return;
        const [mx, my, d] = mid();
        cam.k = Math.max(cam.kMin, Math.min(cam.kMax, pinch.k0 * d / pinch.d0));
        cam.c = inBound([pinch.q[0] - (mx - cam.W / 2) / cam.k, pinch.q[1] - (my - cam.H / 2) / cam.k]); place(st);
        return;
      }
      if (wd && e.pointerId === wd.id) { moveWare(st, e); return; }
      if (grab && e.pointerId === grab.id) {
        if (!grab.on) {
          if (Math.hypot(e.clientX - grab.x, e.clientY - grab.y) < 6) return;
          grab.on = true; hush(); try { st.setPointerCapture(e.pointerId); } catch (err) { /* a pointer the page did not see go down */ }
          const r = st.querySelector('.room').getBoundingClientRect(), [px, py] = P(hero.x, hero.y, 0);   // his feet follow the finger as it was put on him
          heroLead(st, [r.left + (px - VB[0]) / VB[2] * r.width - grab.x, r.top + (py - VB[1]) / VB[3] * r.height - grab.y]); led(st);
        }
        hero.lead.x = e.clientX; hero.lead.y = e.clientY;
        return;
      }
      if (!pan || e.pointerId !== pan.id) return;
      const dx = e.clientX - pan.x, dy = e.clientY - pan.y;
      if (!pan.on) {
        if (Math.hypot(dx, dy) < 8) return;
        pan.on = true; held = true; hush(); st.querySelector('.room').classList.remove('glide');
        try { st.setPointerCapture(e.pointerId); } catch (err) { /* a pointer the page did not see go down */ }
      }
      cam.c = inBound([pan.c0[0] - dx / cam.k, pan.c0[1] - dy / cam.k], 0.3); place(st);
      pan.hist.push([performance.now(), e.clientX, e.clientY]); if (pan.hist.length > 8) pan.hist.shift();
    });
    let wd = null;   // a ware being dragged in 擺設 (fromBox: pulled out of the storage box; box: over the box now)
    function startBoxDrag(st, e) {   // a ware in the box held: pulled up into the room it goes where it is let go (a sideways swipe scrolls the box)
      const id = e.target.closest('.tray-it').dataset.id, it = WARE.get(id); if (!it) return;
      wd = { id: e.pointerId, o: { id, it, p: null }, off: it.kind === 'wall' ? [0, it.size[1] / 2 + 0.2] : [0, 0], x: e.clientX, y: e.clientY, on: false, to: null, fromBox: true, box: false };
    }
    function startWareDrag(st, e) {
      const id = e.target.closest('.deco').dataset.ware, o = placedWares().find((q) => q.id === id); if (!o) return;
      const p0 = roomPoint(st, e), at = o.it.kind === 'wall' ? wallAt(p0) : floorAt(p0);
      const off = o.it.kind === 'wall' ? [o.p.u - at.u, o.p.v - at.v] : [o.p.x - at[0], o.p.y - at[1]];
      wd = { id: e.pointerId, o, off, x: e.clientX, y: e.clientY, on: false, to: null };
      if (ed.sel !== id) { ed.sel = id; st.querySelectorAll('.deco').forEach((d) => d.classList.toggle('sel', d.dataset.ware === id)); }
    }
    function moveWare(st, e) {
      if (!wd.on) {
        const dx = e.clientX - wd.x, dy = e.clientY - wd.y;
        if (Math.hypot(dx, dy) < 6) return;
        if (wd.fromBox && e.pointerType !== 'mouse' && Math.abs(dx) > Math.abs(dy)) { wd = null; return; }   // sideways: the box scrolls
        wd.on = true; try { st.setPointerCapture(e.pointerId); } catch (err) { /* a pointer the page did not see go down */ } st.classList.add('dragging');
        st.querySelectorAll(`svg.art [data-o="w:${wd.o.id}"], svg.art [data-o^="w:${wd.o.id}:"], .bulb[data-w="${wd.o.id}"], .w-sky[data-w="${wd.o.id}"]`).forEach((g) => { g.style.visibility = 'hidden'; });
        st.querySelectorAll(`.win-patch[data-w="${wd.o.id}"]`).forEach((g) => { g.style.display = 'inline'; });   // a window's wall whole while it moves
        st.classList.add('drag-' + wd.o.id);   // the desk's headphones live on a layer of their own: hidden with it
      }
      // over the storage box: let go, a ware goes in (a working thing cannot; one pulled out goes back)
      const tray = st.querySelector('.edit-tray'), tr = tray && tray.getBoundingClientRect(), gh = st.querySelector('.ghost');
      wd.box = Boolean(tr && e.clientY >= tr.top && e.clientX >= tr.left && e.clientX <= tr.right);
      if (tray) { tray.classList.toggle('drop', wd.box && !wd.fromBox && !wd.o.it.fixed); tray.classList.toggle('no-drop', wd.box && !wd.fromBox && !!wd.o.it.fixed); }
      const hint = st.querySelector('.edit-hint'), say = wd.box && !wd.fromBox ? (wd.o.it.fixed ? '只能搬，不能收' : '放開就收起來') : '拖到想放的地方放開';
      if (hint && hint.textContent !== say) hint.textContent = say;
      if (wd.box) { gh.querySelector('g').innerHTML = ''; return; }
      const p = spotUnder(wd.o.it, roomPoint(st, e), wd.off, wd.o.p || { r: 0 }), ok = fits(wd.o.it, p);
      if (ok) wd.to = p;
      gh.querySelector('g').innerHTML = wd.o.it.kind === 'wall' ? DECOR.wall(wd.o.id, p) : DECOR.floor(wd.o.id, p);
      gh.classList.toggle('bad', !ok);
    }
    function endWare(st) {
      const d = wd; wd = null;
      if (!d.on) { if (!d.fromBox) redraw(st); return; }   // a tap: picked, its tools come up (one in the box: its click takes it out)
      swallow = true;
      if (d.box) {
        if (d.o.it.fixed) toast('只能搬，不能收');
        else if (!d.fromBox) { delete state.placed[d.o.id]; if (ed.sel === d.o.id) ed.sel = null; saveState(); }
      } else if (d.to) { state.placed[d.o.id] = d.to; ed.sel = d.o.id; saveState(); SND.play('place'); }
      else if (d.fromBox) toast('那裡放不下');
      redraw(st);
    }
    const end = (e) => {
      fingers.delete(e.pointerId); wake();
      if (pinch) { if (fingers.size < 2) { pinch = null; held = false; afterPinch = fingers.size > 0; swallow = true; zoomed(st); } return; }
      if (!fingers.size) afterPinch = false;
      if (wd && e.pointerId === wd.id) { endWare(st); return; }
      if (grab && e.pointerId === grab.id) { const g = grab; grab = null; if (g.on) { swallow = true; hero.lead = null; } return; }   // let go: he walks on to where the finger was
      if (!pan || e.pointerId !== pan.id) return;
      const p = pan; pan = null;
      if (!p.on) return;
      swallow = true; held = false;   // the click that follows a drag is not a tap
      const c = inBound(cam.c);
      if (Math.abs(c[0] - cam.c[0]) + Math.abs(c[1] - cam.c[1]) > 0.5) { cam.c = c; glide(st); return; }   // pulled past an edge: back
      const now = performance.now(), h = p.hist.filter((q) => now - q[0] < 100);   // let go moving: it coasts on, slowing
      if (h.length < 2 || reduced()) return;
      const dt = Math.max(16, h[h.length - 1][0] - h[0][0]);
      let vx = (h[0][1] - h[h.length - 1][1]) / dt / cam.k, vy = (h[0][2] - h[h.length - 1][2]) / dt / cam.k, t0 = now;   // drawing units a ms
      if (Math.hypot(vx, vy) * cam.k < 0.1) return;
      held = true; hush();
      const step = (t) => {
        const d = Math.min(50, t - t0), want = [cam.c[0] + vx * d, cam.c[1] + vy * d], c1 = inBound(want), f = Math.pow(0.94, d / 16);
        t0 = t;
        if (c1[0] !== want[0]) vx = 0;   // at an edge: that way stops
        if (c1[1] !== want[1]) vy = 0;
        cam.c = c1; place(st); vx *= f; vy *= f;
        if (st.isConnected && Math.hypot(vx, vy) * cam.k > 0.02) coast = requestAnimationFrame(step); else { held = false; wake(); }
      };
      coast = requestAnimationFrame(step);
    };
    st.addEventListener('pointerup', end); st.addEventListener('pointercancel', end);
    st.addEventListener('click', (e) => {   // capture: before the app's own click handling
      if (swallow) { swallow = false; e.stopPropagation(); e.preventDefault(); return; }
      if (!ed.on && !busy && e.target.closest('.room') && !e.target.closest('.thing, .hero, .deco, .ware-use')) {   // a tap on the floor: the hero walks there
        const [x, y] = floorAt(roomPoint(st, e));
        if (x > 0.2 && y > 0.2 && x < RW - 0.2 && y < RD - 0.2) { hero.going = null; goHero(st, [x, y]); }
        return;
      }
      if (ed.on && ed.sel && e.target.closest('.room') && !e.target.closest('.deco, .edit-sel')) {   // 擺設: the picked ware goes to the tapped spot
        e.stopPropagation(); e.preventDefault();
        const o = placedWares().find((q) => q.id === ed.sel); if (!o) return;
        const p = spotUnder(o.it, roomPoint(st, e), [0, 0], o.p);
        if (fits(o.it, p)) { state.placed[o.id] = p; saveState(); SND.play('place'); redraw(st); } else toast('那裡放不下');
        return;
      }
    }, true);
    let wheelT = 0;
    st.addEventListener('wheel', (e) => {   // the wheel (a trackpad's pinch too) zooms round the pointer
      if (st.classList.contains('dressing')) return;   // the dressing room's lists scroll
      e.preventDefault(); hush();
      const r = st.getBoundingClientRect(), mx = e.clientX - r.left, my = e.clientY - r.top, q = [cam.c[0] + (mx - cam.W / 2) / cam.k, cam.c[1] + (my - cam.H / 2) / cam.k];
      cam.k = Math.max(cam.kMin, Math.min(cam.kMax, cam.k * Math.exp(-e.deltaY * (e.deltaMode === 1 ? 0.05 : 0.002))));
      cam.c = inBound([q[0] - (mx - cam.W / 2) / cam.k, q[1] - (my - cam.H / 2) / cam.k]); st.querySelector('.room').classList.remove('glide'); place(st);
      clearTimeout(wheelT); wheelT = setTimeout(() => { if (st.isConnected) { zoomed(st); wake(); } }, 160);
    }, { passive: false });
    if (!ledBefore()) setTimeout(() => { if (st.isConnected && !ledOnce) roomHint(st, 4600); }, 600);
    const fresh = ROOMID === 'study' && !NPC.housebound() ? newMail() : [];   // staying in (a new player): the letters wait   // a letter this device has not been told about: the hint once (in 書房), a tap walks out to the mailbox
    if (fresh.length) { const m = st.querySelector('.mail-hint'); markMailSeen(fresh); setTimeout(() => { if (st.isConnected) m.classList.add('on'); }, 900); setTimeout(() => m.classList.remove('on'), 8000); }
  }
  // ← → look along the room, + − zoom, on 書房 (not while typing or with a dialog open)
  document.addEventListener('keydown', (e) => {
    const st = document.querySelector('#view .study');
    if (!st || !cam.c || modalOpen() || (e.target && e.target.closest && e.target.closest('input, textarea, select'))) return;
    if (st.classList.contains('dressing')) { if (e.key === 'Escape') DRESS.close(false); return; }
    if (wakeRoom) wakeRoom();
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { cam.c = inBound([cam.c[0] + (e.key === 'ArrowLeft' ? -0.8 : 0.8) * halfView()[0], cam.c[1]]); glide(st); }
    else if (e.key === '+' || e.key === '=' || e.key === '-') { cam.k = Math.max(cam.kMin, Math.min(cam.kMax, cam.k * (e.key === '-' ? 0.8 : 1.25))); zoomed(st); }
  });
  const own = {   // 書房's own things for DECOR: drawn where they always stood, then shifted (the working ones, all their parts, where p puts them)
    bookcase: (x, y) => inPlace('bookcase', () => bookcaseArt(shelfBooks()), { w: 'F', x, y, r: 0 }),
    desk: (x, y) => inPlace('desk', () => WORK.desk.map(([, , art]) => art()).join('') + phonesArt(), { w: 'F', x, y, r: 0 }),
    chest: (x, y) => inPlace('chest', chestArt, { w: 'F', x, y, r: 0 }),
    board: (p) => inPlace('board', boardArt, p), calendar: (p) => inPlace('calendar', () => calendarArt(parseDate(todayStr()), examPace().daysLeft), p),
    window: (p, bare) => windowArt(p, true, bare),   // on its own (the box, a drag): the sky in it
    bed: (x, y) => shifted(x - 18.45, y - 2.625, bedArt), nightTable: (x, y) => shifted(x - 16.25, y - 0.55, nightTableArt), bigPlant: (x, y) => plantArt(x, y), bedPlant: (x, y) => plantArt(x, y),
    sageRug: (x, y) => rugArt(x, y, 1.25, '#dfe6d6', '#93ad8c'),
    bedRug: (x, y) => shifted(x - 14.9, y - 2.92, bedRugArt)
  };
  // the room the drawing works in (its size, camera, doors, things); show also swaps the hero and the camera for the other room's
  function setRoom(id) {
    const R = ROOMS[id] || ROOMS.study;
    ROOMID = roomNow = R === ROOMS.study ? 'study' : id; ({ RW, RD, VIEWS, BOUND } = R); DOORS = R.doors;
    VB = [-(RD + 0.5) * S, -(RH + 0.5) * S, (RW + RD + 1) * S, (RH + (RW + RD) / 2 + 1.5) * S + 30];   // the block, its cut edges too
    GW = RW / CELL; GH = RD / CELL; grid = null;
    RIDE = VIEWS.map((v) => [(v[0] + v[2]) / 2 * S, (v[1] + v[3]) / 2 * S]);
    THINGS = DOORS.map(doorThing).concat(ROOMID === 'study' ? STUDY_THINGS : []);
  }
  const camAt = {};   // where the camera looked in each room, while the app runs
  function show(id) {
    if (id === ROOMID) return;
    heroHalt(); hero.going = null; hero.lead = null;
    camAt[ROOMID] = cam.c; heroPos[ROOMID] = heroOf();
    setRoom(id);
    cam.c = camAt[ROOMID] || null; Object.assign(hero, heroPos[ROOMID] || Object.assign({ back: false, flip: false, pose: '' }, ROOMS[ROOMID].hero));
  }
  setRoom('study'); Object.assign(hero, heroPos.study || {});
  const kit = { S, P, pt, poly, line, onX, onY, onZ, F, FS, tone, box, qX, qY, qZ, shadow, bb, C, q2, r1, DEFS, VB, own, wireArt, bulbsAt };
  function hold() { heroHalt(); hero.going = null; hero.lead = null; }   // the dressing room opens: the hero stops where they are
  return { html, level, mount, enter, pull, door, mark, out, kit, fits, moveOff, give, knock, guest, settle, settle8, settle10, settleNew, SPOTS, room: () => ROOMID, use, useWare, heroRedraw, heroIn, tapHero, hold, edit: (el, cmd, id) => editCmd(el.closest('.study'), cmd, id) };
})();
// ---------- 古道具屋's wares in 書房 (1.2.0): each one drawn with 書房's own pencils and light (ROOM.kit) ----------
// DECOR.wall(id, p) draws a wall ware where it hangs, DECOR.floor(id, p) one standing or lying on the floor (p.r turns it a
// quarter: a box swaps its sides, a round thing is mirrored), DECOR.thumb(id) one on its own for 古道具屋's shelf and the storage box
const DECOR = (() => {
  const { S, P, pt, poly, line, onX, onY, onZ, F, FS, box, qX, qY, qZ, shadow, bb, C, q2, r1, DEFS, own, wireArt, bulbsAt } = ROOM.kit;
  // a wall ware is drawn flat in its wall's plane round its middle (x to the right, y down, room units); k.F／k.FS light a point of it
  function onWall(p, draw, depth = 0.1, flat = false) {   // flat: lit as the wall itself (書房's own pictures), not as a thing on it
    const face = p.w === 'L' ? 'L' : flat ? 'R' : 'y', at = (dx = 0, dy = 0) => (p.w === 'L' ? [depth, p.u - dx, p.v - dy] : [p.u + dx, depth, p.v - dy]);
    const k = { F: (h, dx, dy) => F(h, face, at(dx, dy)), FS: (h, dx, dy) => FS(h, face, at(dx, dy)) };
    const tf = p.w === 'L' ? `${onX(depth)} translate(${q2(-p.u)} ${q2(-p.v)})` : `${onY(depth)} translate(${q2(p.u)} ${q2(-p.v)})`;
    return `<g transform="${tf}">${draw(k)}</g>`;
  }
  // a round thing seen the same from every side, mirrored when turned (bb draws it upright facing the camera)
  const upright = (x, y, z, r, inner) => bb(x, y, z, r ? `<g transform="scale(-1 1)">${inner}</g>` : inner);
  const MINCHO = `font-family="'Hiragino Mincho ProN', 'Noto Serif JP', 'Noto Serif CJK JP', serif"`, MARU = `font-family="'Hiragino Maru Gothic ProN', 'Hiragino Sans', 'Noto Sans JP', sans-serif"`;
  // a shelf that stands out from its wall (drawn in the room, not in the wall's plane); 2026-11-11 (the user: finer): a grain
  // line along the plank, the pot rimmed and shaded, the leaves lit, the jar's lid knobbed and its glass glinting, the frame's
  // picture with a sun and a glint
  function wallShelf(p) {
    const d = 0.32, z0 = p.v - 0.3, z1 = p.v - 0.22, a = p.u - 0.66, b = p.u + 0.66;
    const at = (t, dd = d / 2) => (p.w === 'L' ? [dd, p.u + t, z1] : [p.u + t, dd, z1]);
    const plank = p.w === 'L' ? box(C.oak, 0, a, z0, d, b, z1, { t: C.oakTop, x: C.oakDk, hlv: true }) : box(C.oak, a, 0, z0, b, d, z1, { t: C.oakTop, x: C.oakDk, hlv: true });
    const brace = (t) => (p.w === 'L' ? `<path ${F(C.oakDk, 'y', [0.1, p.u + t, z0 - 0.2])} d="${poly([[0, p.u + t, z0], [d - 0.04, p.u + t, z0], [0, p.u + t, z0 - 0.32]])}"/>` : `<path ${F(C.oakDk, 'x', [p.u + t, 0.1, z0 - 0.2])} d="${poly([[p.u + t, 0, z0], [p.u + t, d - 0.04, z0], [p.u + t, 0, z0 - 0.32]])}"/>`);
    const on = (t, inner) => bb(...at(t), inner);
    const zm = (z0 + z1) / 2, grain = `<path class="ln" stroke="#a87a50" stroke-opacity=".55" stroke-width=".8" d="${line(p.w === 'L' ? [[d, a + 0.1, zm], [d, b - 0.1, zm]] : [[a + 0.1, d, zm], [b - 0.1, d, zm]])}"/>`;
    return brace(-0.48) + brace(0.48) + plank + grain
      + on(-0.4, `<ellipse rx="6" ry="2.4" fill="#2b1c12" fill-opacity=".14"/><path ${F(C.pot, 'y', at(-0.4))} d="M-5 -1 L-4 -9 H4 L5 -1 Z"/><path d="M1.6 -9 H4 L5 -1 H2.4 Z" fill="#2b1c12" fill-opacity=".1"/><g ${F(C.leaf, 'y', at(-0.4))}><circle cx="-3" cy="-12" r="3.6"/><circle cx="2.6" cy="-13.4" r="3.8"/><circle cy="-16" r="3.2"/></g><g fill="#fff" fill-opacity=".18"><circle cx="-4.2" cy="-13.2" r="1.3"/><circle cx="1.4" cy="-15" r="1.4"/><circle cx="-1" cy="-17.4" r="1.1"/></g><rect x="-5.3" y="-9.8" width="10.6" height="2.2" rx=".7" ${F('#c4704f', 'y', at(-0.4))}/>`)
      + on(-0.05, `<rect x="-4.6" y="-13" width="9.2" height="13" rx="2" fill="#cfe6ee" fill-opacity=".7" stroke="#e8f4f8" stroke-width=".8"/><g fill="#f08bb0"><circle cx="-1.6" cy="-3" r="1.6"/><circle cx="1.8" cy="-4.6" r="1.6" fill="#f4d06a"/><circle cx="-.6" cy="-6.6" r="1.6" fill="#8fd0a8"/></g><path d="M-3.1 -11.4 V-2.6" stroke="#fff" stroke-opacity=".75" stroke-width=".8" stroke-linecap="round"/><rect x="-5" y="-15" width="10" height="2.6" rx="1" fill="#c8553f"/><rect x="-1.5" y="-16.8" width="3" height="2" rx=".7" fill="#a8402f"/>`)
      + on(0.36, `<path d="M-6 0 L-5 -13 H5 L6 0 Z" ${F(C.walnut, 'y', at(0.36))}/><rect x="-3.6" y="-11" width="7.2" height="8.6" fill="#f2e9d6"/><circle cx="1.8" cy="-8.6" r="1" fill="#f2c94c"/><path d="M-3.6 -4 L-1 -7 L1.2 -5 L3.6 -8 V-2.4 H-3.6 Z" fill="#8fbf8a"/><path d="M-3 -10.4 L-1.2 -8.4" stroke="#fff" stroke-opacity=".6" stroke-width=".6" stroke-linecap="round"/>`);
  }
  // the peg rail (a tote bag, a scarf): the rail on the wall, the pegs and what hangs on them stood out from it; 2026-11-11 (the
  // user: finer): the rail lit along its top and screwed on, the pegs lit, the bag shaded on its right with stitched hems and
  // tabs where the handles join, the scarf's knit in ridges with its back tail in shade
  function pegRail(p) {
    const face = p.w === 'L' ? 'L' : 'y', pt3 = (lx, lz, d = 0.2) => (p.w === 'L' ? [d, p.u - lx, p.v + lz] : [p.u + lx, d, p.v + lz]), z = 0.55;
    const rail = onWall(p, (k) => `<rect x="-.8" y="-.65" width="1.6" height=".16" rx=".03" ${k.F(C.walnut)}/><path d="M-.78 -.635 H.78" stroke="#fff" stroke-opacity=".22" stroke-width=".015"/><circle cx="-.72" cy="-.57" r=".02" ${k.F('#5e3f2a')}/><circle cx=".72" cy="-.57" r=".02" ${k.F('#5e3f2a')}/>`, 0.03);
    let s = rail;
    [0.5, 0, -0.5].forEach((lx) => { s += bb(...pt3(lx, z - 0.02, 0.1), `<circle r="2.6" ${F(C.oakDk, face, pt3(lx, z, 0.1))}/><circle cx="-.8" cy="-.8" r=".9" fill="#fff" fill-opacity=".3"/>`); });
    s += bb(...pt3(0.5, z - 0.02), `<path d="M-7 18 C-7 6 -3 0 0 0 C3 0 7 6 7 18" fill="none" stroke-width="2" ${FS('#b8925a', face, pt3(0.5, z - 0.5))}/><rect x="-13" y="16" width="26" height="30" rx="3" ${F('#e8d3a8', face, pt3(0.5, z - 1))}/><rect x="-13" y="33" width="26" height="5" ${F('#c95f4c', face, pt3(0.5, z - 1.2))}/><path d="M-12.6 33.6 H12.6" stroke="#fff" stroke-opacity=".25" stroke-width=".7"/>
      <path d="M5 16 H10 a3 3 0 0 1 3 3 V43 a3 3 0 0 1 -3 3 H5 Z" fill="#2b1c12" fill-opacity=".08"/><path d="M-11.6 20.2 H11.6 M-11.6 43.6 H11.6" fill="none" stroke-width=".7" stroke-dasharray="1.6 1.2" ${FS('#a88a5c', face, pt3(0.5, z - 1))}/><g ${F('#b8925a', face, pt3(0.5, z - 0.6))}><rect x="-8.6" y="14.4" width="3.2" height="4.2" rx=".6"/><rect x="5.4" y="14.4" width="3.2" height="4.2" rx=".6"/></g><path d="M-13 19 V43" class="hl"/>`);
    s += bb(...pt3(-0.5, z - 0.02), `<path d="M-6 0 Q0 4 6 0 L5 44 L-1 44 L0 7 L-4 40 L-9 40 Z" ${F('#d0675a', face, pt3(-0.5, z - 1))}/><path d="M-6 0 Q-3 3 0 7 L-4 40 L-9 40 Z" fill="#2b1c12" fill-opacity=".1"/><path d="M0 12 H5.6 M-.1 18 H5.5 M-.3 24 H5.4 M-.4 30 H5.3 M-.6 36 H5.2 M-.7 42 H5.1 M-6.9 12 H-.6 M-7.35 18 H-1.3 M-7.8 24 H-2.1 M-8.25 30 H-2.8 M-8.7 36 H-3.5" stroke="#a84a40" stroke-opacity=".45" stroke-width=".8"/><path d="M-1 44 V48 M1.5 44 V48 M4 44 V48 M-9 40 V44 M-6.5 40 V44 M-4 40 V44" stroke-width="1.2" ${FS('#d0675a', face, pt3(-0.5, z - 1.5))}/>`);
    return s;
  }
  // a wall lamp (test, roomV 8): a round brass plate on the wall, an arm out from it and up, a cloth shade lit from inside by
  // night, a wash of light on the wall round it
  function sconce(p) {
    const face = p.w === 'L' ? 'L' : 'y', pt3 = (lx, lz, d) => (p.w === 'L' ? [d, p.u - lx, p.v + lz] : [p.u + lx, d, p.v + lz]), brass = '#b8925a';
    let s = `<g class="night-only" style="opacity:calc(.55 + .45 * var(--f))">${onWall(p, () => '<ellipse cy="-.3" rx=".95" ry="1.25" fill="url(#pool)"/>', 0.006)}</g>`;
    s += onWall(p, (k) => `<ellipse cx=".04" cy=".24" rx=".22" ry=".32" fill="#2b1c12" fill-opacity=".14"/><ellipse cy=".18" rx=".21" ry=".31" ${k.F(brass)}/><ellipse cy=".18" rx=".12" ry=".19" ${k.F('#d2ad6e')}/>`, 0.02);
    s += `<path class="ln" stroke-width="3.4" ${FS(brass, face, pt3(0, 0, 0.3))} d="${line([pt3(0, -0.2, 0.03), pt3(0, -0.2, 0.5), pt3(0, -0.02, 0.55)])}"/>`;
    return s + bb(...pt3(0, -0.02, 0.55), `<circle r="3" ${F(brass, face, pt3(0, 0, 0.55))}/><ellipse cy="-2" rx="6" ry="3" fill="#fff4d8" class="night-only"/>
      <path d="M-16 0 L16 0 L10 -22 L-10 -22 Z" style="fill:color-mix(in srgb,#e9d4ad calc(var(--day)*100%),#ffd27a)"/><path d="M-16 0 Q0 4 16 0" fill="none" stroke="#b8925a" stroke-width="1.6"/><path d="M-10 -22 H10" stroke="#b8925a" stroke-width="1.4"/><path d="M-10 -22 L-16 0" class="hl"/>`);
  }
  // 2026-11-11 (the user: finer): every wall ware got the small parts it has — frames mitred at the corners with a lit top edge
  // and a dark lip, prints shaded and clouded, the kana chart's cells written in and its corner curling, the masks, fans and
  // glass lit by the room by night, the clock's minute marks, the mirror's bevel and sheen, the scroll's hanging strips
  const WALL = {
    fujiPrint: (k) => `<rect x="-.64" y="-.545" width="1.4" height="1.25" fill="#2b1c12" fill-opacity=".14"/><rect x="-.7" y="-.625" width="1.4" height="1.25" ${k.F(C.walnut)}/><path d="M-.69 -.613 H.69" stroke="#fff" stroke-opacity=".2" stroke-width=".02"/>
      <path d="M-.7 -.625 L-.6 -.525 M.7 -.625 L.6 -.525 M-.7 .625 L-.6 .525 M.7 .625 L.6 .525" stroke-width=".012" ${k.FS('#6e4a31')}/><rect x="-.6" y="-.525" width="1.2" height="1.05" ${k.F('#f4ead8')}/>
      <circle cx=".33" cy="-.205" r=".15" ${k.F('#e0614f')}/><path d="M-.6 .525 L-.05 -.125 L.05 -.125 L.6 .525 Z" ${k.F('#6f8fb8')}/><path d="M.05 -.125 L.6 .525 H.24 Z" fill="#2b1c12" fill-opacity=".12"/>
      <path d="M-.05 -.125 L-.26 .155 Q-.12 .095 -.04 .175 Q.06 .075 .12 .155 Q.2 .095 .26 .155 L.05 -.125 Z" fill="#fff"/><path d="M.05 -.125 L.26 .155 Q.2 .095 .12 .155 Q.08 .1 .06 .04 Z" fill="#2b1c12" fill-opacity=".08"/>
      <path d="M-.38 .25 q.1 -.05 .2 0 t.2 0 M.16 .05 q.06 -.03 .12 0 t.12 0" fill="none" stroke="#fff" stroke-opacity=".7" stroke-width=".028" stroke-linecap="round"/>
      <path d="M-.6 .365 Q0 .205 .6 .385 V.525 H-.6 Z" ${k.F('#9fbf93')}/><path d="M-.6 .45 Q-.2 .37 .2 .45 T.6 .44 V.525 H-.6 Z" ${k.F('#87aa7c')}/><rect x="-.54" y="-.47" width=".06" height=".1" ${k.F('#d0453c')}/>
      <rect x="-.6" y="-.525" width="1.2" height="1.05" fill="none" stroke-width=".02" ${k.FS('#6e4a31')}/>`,
    kanaChart: (k) => {
      let cells = '', ink = '';
      for (let r = 0; r < 4; r++) for (let c = 0; c < 5; c++) {
        const x = -0.635 + c * 0.26, y = -0.455 + r * 0.36;
        cells += `<rect x="${q2(x)}" y="${q2(y)}" width=".2" height=".26" rx=".03" ${k.F(['#efb3aa', '#f4d28e', '#b2d3ad', '#b3c9e6', '#d3bde3'][c])}/>`;
        ink += (r + c) % 2 ? `M${q2(x + 0.05)} ${q2(y + 0.08)} h.1 M${q2(x + 0.1)} ${q2(y + 0.04)} q-.03 .12 .03 .18 M${q2(x + 0.05)} ${q2(y + 0.18)} q.06 -.08 .1 .02 ` : `M${q2(x + 0.06)} ${q2(y + 0.05)} q.02 .12 -.01 .17 M${q2(x + 0.1)} ${q2(y + 0.09)} q.05 -.02 .05 .06 q0 .08 -.07 .08 `;
      }
      return `<rect x="-.715" y="-.995" width="1.55" height="2.15" fill="#2b1c12" fill-opacity=".12"/><rect x="-.775" y="-1.075" width="1.55" height="2.15" ${k.F('#fbf6ea')}/><rect x="-.775" y="-1.075" width="1.55" height=".44" ${k.F(C.red)}/>
        <path d="M-.7 -.668 H.7" stroke="#fff" stroke-opacity=".45" stroke-width=".012"/><path d="M-.775 .27 H.775 M0 -.635 V1.075" stroke="#2b1c12" stroke-opacity=".05" stroke-width=".012"/>
        <text x="0" y="-.765" font-size=".23" font-weight="700" text-anchor="middle" fill="#fff">あいうえお</text>${cells}<path d="${ink}" fill="none" stroke-opacity=".5" stroke-width=".018" stroke-linecap="round" ${k.FS(C.ink)}/>
        <path d="M.775 .9 V1.075 H.6 Z" ${k.F(C.wall)}/><path d="M.775 .9 V1.075 H.6 Z" fill="#2b1c12" fill-opacity=".12"/><path d="M.775 .9 L.6 1.075 Q.65 .95 .775 .9 Z" ${k.F('#e6dcc6')}/>
        <ellipse cx=".02" cy="-.995" rx=".055" ry=".03" fill="#2b1c12" fill-opacity=".2"/><circle cx="0" cy="-1.015" r=".05" fill="#5a68d8"/><circle cx="-.016" cy="-1.032" r=".016" fill="#fff" fill-opacity=".6"/>`;
    },
    nightPicture: (k) => `<rect x="-.59" y="-.47" width="1.3" height="1.1" fill="#2b1c12" fill-opacity=".13"/><rect x="-.65" y="-.55" width="1.3" height="1.1" ${k.F(C.walnut)}/><path d="M-.64 -.538 H.64" stroke="#fff" stroke-opacity=".2" stroke-width=".02"/>
      <path d="M-.65 -.55 L-.56 -.46 M.65 -.55 L.56 -.46 M-.65 .55 L-.56 .46 M.65 .55 L.56 .46" stroke-width=".012" ${k.FS('#6e4a31')}/><rect x="-.56" y="-.46" width="1.12" height=".92" ${k.F('#34437a')}/>
      <circle cx=".26" cy="-.19" r=".2" fill="#f6e7a8" fill-opacity=".12"/><circle cx=".26" cy="-.19" r=".16" fill="#f6e7a8"/><circle cx=".33" cy="-.24" r=".14" ${k.F('#34437a')}/>
      ${[[-0.38, 0.3], [-0.12, 0.5], [-0.46, 0.62], [0.02, 0.26], [0.4, 0.66]].map(([dx, dz]) => `<circle cx="${dx}" cy="${q2(-0.55 + dz)}" r=".028" fill="#fff"/>`).join('')}
      <g fill="#fff" fill-opacity=".6">${[[-0.26, -0.3], [0.08, -0.36], [-0.04, 0.02], [0.48, -0.06], [-0.3, -0.04]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r=".014"/>`).join('')}</g><path d="M-.2 -.28 v.08 M-.24 -.24 h.08" stroke="#fff" stroke-width=".012" stroke-linecap="round"/>
      <path d="M-.56 .23 Q-.25 .07 .05 .22 T.56 .19 V.46 H-.56 Z" ${k.F('#26335f')}/><path d="M-.56 .34 Q-.1 .24 .3 .34 T.56 .33 V.46 H-.56 Z" ${k.F('#1f2b52')}/>
      <rect x="-.56" y="-.46" width="1.12" height=".92" fill="none" stroke-width=".02" ${k.FS('#5e3f2a')}/>`,
    cuckoo: (k) => {
      let ticks = '';
      for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6, l = i % 3 ? 0.035 : 0.07; ticks += `M${(Math.sin(a) * 0.25).toFixed(3)} ${(-0.05 - Math.cos(a) * 0.25).toFixed(3)} L${(Math.sin(a) * (0.25 - l)).toFixed(3)} ${(-0.05 - Math.cos(a) * (0.25 - l)).toFixed(3)} `; }
      return `<path d="M-.4 .4 V-.4 L0 -.72 L.4 -.4 V.4 Z" fill="#2b1c12" fill-opacity=".14" transform="translate(.05 .07)"/>
        <path d="M-.38 .4 V-.38 L0 -.7 L.38 -.38 V.4 Z" ${k.F(C.walnut)}/>
        <path d="M-.52 -.3 L0 -.8 L.52 -.3 L.44 -.24 L0 -.68 L-.44 -.24 Z" ${k.F('#5e3f2a')}/>
        <path d="M-.16 -.8 Q-.1 -.92 0 -.86 Q.1 -.92 .16 -.8 Q.08 -.84 0 -.78 Q-.08 -.84 -.16 -.8 Z" ${k.F(C.leafDk)}/>
        <rect x="-.08" y="-.52" width=".16" height=".14" rx=".02" fill="#3a2a1f"/><path d="M-.03 -.47 l.05 -.03 l.02 .04 Z" fill="#f2d27a"/>
        <circle cy="-.05" r=".3" ${k.F('#7a5236')}/><circle cy="-.05" r=".26" ${k.F(C.paper)}/><path class="ln" stroke-width=".9" ${k.FS(C.ink)} d="${ticks}"/>
        <path d="M-.38 .3 H.38" stroke="#5e3f2a" stroke-width=".04"/><path d="M-.3 .38 Q-.2 .3 -.1 .38 Q0 .3 .1 .38 Q.2 .3 .3 .38" fill="none" stroke="#5e3f2a" stroke-width=".025"/>
        <path d="M0 .4 V.78 M-.16 .4 V.92 M.16 .4 V.7" stroke="#8a6a3a" stroke-width=".02"/>
        <circle cy=".82" r=".07" ${k.F('#d9b04a')}/><ellipse cx="-.16" cy=".98" rx=".055" ry=".11" ${k.F('#6e4a33')}/><ellipse cx=".16" cy=".76" rx=".055" ry=".11" ${k.F('#6e4a33')}/>`;
    },
    kitsune: (k) => `<path d="M0 .32 C-.17 .3 -.23 .12 -.23 -.04 L-.23 -.32 L-.12 -.19 C-.05 -.22 .05 -.22 .12 -.19 L.23 -.32 L.23 -.04 C.23 .12 .17 .3 0 .32 Z" fill="#2b1c12" fill-opacity=".12" transform="translate(.03 .04)"/>
      <path d="M0 .32 C-.17 .3 -.23 .12 -.23 -.04 L-.23 -.32 L-.12 -.19 C-.05 -.22 .05 -.22 .12 -.19 L.23 -.32 L.23 -.04 C.23 .12 .17 .3 0 .32 Z" style="fill:color-mix(in srgb,#fbf7ef calc(var(--day)*100%),#a8a9cc)" stroke="#2b1c12" stroke-opacity=".18" stroke-width=".008"/>
      <path d="M0 .32 C.17 .3 .23 .12 .23 -.04 L.23 -.32 L.17 -.25 L.17 -.04 C.17 .12 .12 .26 0 .32 Z" fill="#2b1c12" fill-opacity=".07"/><path d="M-.18 -.1 C-.19 0 -.17 .1 -.12 .18" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width=".02" stroke-linecap="round"/>
      <path d="M-.21 -.27 L-.14 -.19 L-.21 -.11 Z M.21 -.27 L.14 -.19 L.21 -.11 Z" ${k.F('#d0453c')}/><path d="M-.205 -.235 L-.165 -.19 L-.205 -.145 Z M.205 -.235 L.165 -.19 L.205 -.145 Z" ${k.F('#f08a8a')}/>
      <path d="M-.16 0 Q-.1 -.07 -.03 -.01 M.03 -.01 Q.1 -.07 .16 0" fill="none" stroke-width=".04" stroke-linecap="round" ${k.FS('#d0453c')}/><path d="M-.15 .016 Q-.1 -.03 -.04 .01 M.04 .01 Q.1 -.03 .15 .016" fill="none" stroke="#2a2730" stroke-opacity=".6" stroke-width=".012" stroke-linecap="round"/>
      <path d="M0 -.17 L-.035 -.11 L0 -.06 L.035 -.11 Z" ${k.F('#d0453c')}/><path d="M-.12 .1 Q-.06 .13 -.03 .1 M.03 .1 Q.06 .13 .12 .1" fill="none" stroke="#e6c25a" stroke-width=".02"/>
      <ellipse cx="-.13" cy=".05" rx=".04" ry=".022" fill="#f08a8a" fill-opacity=".4"/><ellipse cx=".13" cy=".05" rx=".04" ry=".022" fill="#f08a8a" fill-opacity=".4"/>
      <path d="M-.12 .17 l-.07 -.015 M-.12 .2 l-.07 .012 M.12 .17 l.07 -.015 M.12 .2 l.07 .012" stroke="#2a2730" stroke-opacity=".45" stroke-width=".008" stroke-linecap="round"/>
      <circle cy=".19" r=".022" fill="#2a2730"/><path d="M-.05 .24 Q0 .27 .05 .24" fill="none" stroke="#2a2730" stroke-width=".015"/>
      <path d="M-.23 -.04 Q-.3 -.2 -.12 -.4 M.23 -.04 Q.3 -.2 .12 -.4" fill="none" stroke="#c8553f" stroke-width=".015"/><path d="M-.12 -.4 L-.08 -.44 M.12 -.4 L.08 -.44" stroke="#c8553f" stroke-width=".02" stroke-linecap="round"/>`,
    chalkboard: (k) => `<rect x="-.56" y="-.46" width="1.2" height="1" rx=".04" fill="#2b1c12" fill-opacity=".14"/>
      <rect x="-.6" y="-.5" width="1.2" height="1" rx=".04" ${k.F(C.walnut)}/><path d="M-.58 -.488 H.58" stroke="#fff" stroke-opacity=".2" stroke-width=".02"/><path d="M-.6 -.5 L-.52 -.42 M.6 -.5 L.52 -.42" stroke-width=".012" ${k.FS('#6e4a31')}/><rect x="-.52" y="-.42" width="1.04" height=".82" ${k.F('#3d5a4a')}/>
      <path d="M.06 -.33 Q.26 -.39 .44 -.3" fill="none" stroke="#fff" stroke-opacity=".07" stroke-width=".09" stroke-linecap="round"/><ellipse cx="-.3" cy=".3" rx=".16" ry=".05" fill="#fff" fill-opacity=".05"/>
      <text x="-.44" y="-.2" font-size=".13" fill="#fff" fill-opacity=".7" ${MARU}>きょうの ことば</text>
      <text x="0" y=".13" font-size=".24" font-weight="700" text-anchor="middle" fill="#fff" fill-opacity=".9" ${MARU}>がんばろう</text>
      <path d="M-.36 .22 Q0 .28 .36 .2" fill="none" stroke="#f2d27a" stroke-opacity=".8" stroke-width=".02"/>
      <rect x="-.52" y="-.42" width="1.04" height=".82" fill="none" stroke-width=".02" ${k.FS('#2f4639')}/>
      <rect x="-.58" y=".4" width="1.16" height=".09" ${k.F(C.oakDk)}/><path d="M-.56 .405 H.56" stroke="#fff" stroke-opacity=".22" stroke-width=".012" stroke-dasharray=".02 .035"/><rect x=".18" y=".365" width=".16" height=".04" rx=".015" fill="#fff"/><rect x="-.3" y=".37" width=".12" height=".035" rx=".015" fill="#f4b6b0"/>`,
    scroll: (k) => `<path d="M-.26 -1.28 L0 -1.44 L.26 -1.28" fill="none" stroke="#6e4a33" stroke-width=".02"/><circle cy="-1.45" r=".03" fill="#8a6a4a"/>
      <rect x="-.38" y="-1.22" width=".84" height="2.44" fill="#2b1c12" fill-opacity=".12"/>
      <rect x="-.42" y="-1.26" width=".84" height="2.44" ${k.F('#8aa0b4')}/><rect x="-.42" y="-1.26" width=".84" height=".2" ${k.F('#6f879c')}/><rect x="-.42" y=".98" width=".84" height=".2" ${k.F('#6f879c')}/>
      <rect x="-.3" y="-1.02" width=".6" height="1.96" ${k.F('#f6efdf')}/><rect x="-.3" y="-1.02" width=".6" height=".035" ${k.F('#c9a46a')}/><rect x="-.3" y=".905" width=".6" height=".035" ${k.F('#c9a46a')}/>
      ${[...'継続は力なり'].map((ch, i) => `<text x="0" y="${q2(-0.72 + i * 0.31)}" font-size=".26" text-anchor="middle" fill="#26232c" ${MINCHO}>${ch}</text>`).join('')}
      <rect x=".1" y=".8" width=".09" height=".09" fill="#d0453c"/>
      <rect x="-.25" y="-1.25" width=".065" height=".5" ${k.F('#6f879c')}/><rect x=".185" y="-1.25" width=".065" height=".5" ${k.F('#6f879c')}/><path d="M-.25 -.765 H-.185 M.185 -.765 H.25" stroke-width=".014" ${k.FS('#e3d29c')}/>
      <rect x="-.46" y="-1.3" width=".92" height=".06" rx=".03" ${k.F(C.walnut)}/><rect x="-.5" y="1.18" width="1" height=".09" rx=".045" ${k.F(C.walnut)}/><path d="M-.44 1.2 H.44" stroke="#fff" stroke-opacity=".22" stroke-width=".015" stroke-linecap="round"/><circle cx="-.5" cy="1.225" r=".06" ${k.F('#3a2a1f')}/><circle cx=".5" cy="1.225" r=".06" ${k.F('#3a2a1f')}/>`,
    japanmap: (k) => `<rect x="-.66" y="-.46" width="1.4" height="1" fill="#2b1c12" fill-opacity=".12"/>
      <rect x="-.7" y="-.5" width="1.4" height="1" ${k.F('#f3ead6')}/><rect x="-.64" y="-.44" width="1.28" height=".88" ${k.F('#cfe3ea')}/>
      <path d="M-.64 -.14 H.64 M-.64 .16 H.64 M-.32 -.44 V.44 M0 -.44 V.44 M.32 -.44 V.44" stroke="#fff" stroke-opacity=".2" stroke-width=".006"/><rect x="-.64" y="-.44" width="1.28" height=".88" fill="none" stroke-width=".012" ${k.FS('#9bbac6')}/>
      <g ${k.F('#bfd49a')}><path d="M.3 -.34 C.36 -.4 .48 -.38 .5 -.3 C.5 -.22 .42 -.2 .36 -.22 C.3 -.24 .26 -.28 .3 -.34 Z"/>
        <path d="M.31 -.14 C.36 -.06 .33 .03 .24 .07 C.14 .11 .03 .13 -.08 .15 C-.18 .17 -.27 .21 -.33 .2 C-.36 .16 -.31 .12 -.24 .1 C-.14 .07 -.04 .05 .06 .01 C.15 -.03 .21 -.09 .25 -.17 Z"/>
        <path d="M-.24 .23 C-.19 .21 -.13 .22 -.12 .26 C-.15 .29 -.22 .29 -.24 .23 Z"/><path d="M-.42 .21 C-.36 .2 -.31 .24 -.32 .3 C-.34 .35 -.4 .35 -.43 .3 C-.45 .26 -.45 .23 -.42 .21 Z"/>
        <circle cx="-.52" cy=".39" r=".018"/><circle cx="-.56" cy=".42" r=".014"/></g>
      <path d="M.27 -.12 C.3 -.06 .28 .01 .21 .05 M.06 .03 C-.04 .07 -.16 .1 -.28 .15" fill="none" stroke-width=".012" stroke-linecap="round" ${k.FS('#a3bb7c')}/>
      <circle cx=".2" cy=".05" r=".035" fill="#e0574c"/><circle cx="-.05" cy=".12" r=".028" fill="#5262e8"/><circle cx=".4" cy="-.3" r=".028" fill="#3f8a46"/>
      <path d="M.2 .05 L.32 .2 M-.05 .12 L-.02 .3" stroke="#3a3328" stroke-width=".01" stroke-dasharray=".03 .02"/>
      <text x=".2" y=".29" font-size=".08" fill="#3a3328" ${MARU}>とうきょう</text><text x="-.16" y=".38" font-size=".08" fill="#3a3328" ${MARU}>きょうと</text>
      <circle cx="-.6" cy="-.46" r=".03" ${k.F('#e0574c')}/><circle cx=".6" cy="-.46" r=".03" ${k.F('#e0574c')}/><circle cx="-.61" cy="-.47" r=".01" fill="#fff" fill-opacity=".6"/><circle cx=".59" cy="-.47" r=".01" fill="#fff" fill-opacity=".6"/>`,
    furin: (k) => `<path d="M0 -.6 V-.22" stroke="#6e4a33" stroke-width=".015"/><circle cy="-.6" r=".025" fill="#8a6a4a"/><ellipse cy="-.245" rx=".035" ry=".018" ${k.F('#9fb7c3')}/>
      <path d="M-.17 -.02 C-.17 -.27 .17 -.27 .17 -.02 Z" ${k.F('#d7edf6')} fill-opacity=".85" stroke="#eef8fb" stroke-width=".02"/>
      <rect x="-.025" y="-.075" width=".05" height=".06" rx=".015" ${k.F('#9cbfd0')}/><path d="M-.14 -.05 q.035 -.02 .07 0 t.07 0 t.07 0 t.07 0" fill="none" stroke-width=".012" ${k.FS('#7fb2d2')}/>
      <path d="M-.12 -.12 q.04 -.05 .08 0 q-.04 .05 -.08 0 Z M.04 -.08 l.04 -.03 v.06 Z" ${k.F('#e0574c')}/><circle cx="-.1" cy="-.125" r=".008" fill="#2a2730"/>
      <ellipse cy="-.02" rx=".17" ry=".026" ${k.F('#bcd8e4')}/><path d="M-.17 -.02 H.17" stroke-width=".02" ${k.FS('#e0574c')}/>
      <path d="M-.12 -.18 Q-.08 -.24 0 -.25" fill="none" stroke="#fff" stroke-opacity=".8" stroke-width=".025" stroke-linecap="round"/>
      <path d="M0 -.02 V.18" stroke="#6e4a33" stroke-width=".012"/><rect x="-.06" y=".18" width=".12" height=".42" rx=".01" ${k.F('#cfd8f0')}/><rect x=".01" y=".18" width=".05" height=".42" fill="#2b1c12" fill-opacity=".07"/><rect x="-.06" y=".18" width=".12" height=".05" ${k.F('#e0574c')}/>
      <path d="M-.012 .3 q.012 .03 0 .07 M.008 .42 l-.02 .05 M-.01 .52 h.02" fill="none" stroke-opacity=".45" stroke-width=".012" stroke-linecap="round" ${k.FS(C.ink)}/>`,
    ukiyoe: (k) => `<rect x="-.76" y="-.66" width="1.6" height="1.4" fill="#2b1c12" fill-opacity=".13"/>
      <rect x="-.8" y="-.7" width="1.6" height="1.4" ${k.F(C.walnut)}/><path d="M-.79 -.688 H.79" stroke="#fff" stroke-opacity=".2" stroke-width=".02"/><path d="M-.8 -.7 L-.72 -.62 M.8 -.7 L.72 -.62 M-.8 .7 L-.72 .62 M.8 .7 L.72 .62" stroke-width=".012" ${k.FS('#6e4a31')}/><rect x="-.72" y="-.62" width="1.44" height="1.24" ${k.F('#f1e6cc')}/>
      <path d="M.12 .26 L.34 .02 L.56 .26 Z" ${k.F('#6f84a3')}/><path d="M.34 .02 L.56 .26 H.42 Z" fill="#2b1c12" fill-opacity=".1"/><path d="M.27 .1 L.34 .02 L.41 .1 L.37 .12 L.34 .09 L.31 .12 Z" fill="#fff"/>
      <path d="M-.72 .62 V.06 C-.62 -.24 -.44 -.46 -.16 -.5 C.08 -.53 .2 -.4 .12 -.3 C.04 -.22 -.1 -.27 -.1 -.18 C-.06 -.05 .2 .06 .72 .14 V.62 Z" ${k.F('#2f4f86')}/>
      <path d="M-.6 .62 V.18 C-.5 -.08 -.34 -.3 -.14 -.34 C-.04 -.35 .02 -.32 .02 -.28 C-.06 -.24 -.22 -.26 -.24 -.12 C-.24 .06 .1 .22 .72 .3 V.62 Z" ${k.F('#6f9cc7')}/>
      <path d="M-.66 .5 C-.56 .2 -.44 0 -.3 -.16 M-.5 .56 C-.4 .3 -.3 .14 -.2 .02" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width=".018" stroke-linecap="round"/>
      <path d="M-.4 -.36 q.04 -.06 .08 0 q.04 -.06 .08 0 q.04 -.06 .08 0 q.04 -.06 .08 0 M-.52 -.2 q.04 -.05 .07 0 q.04 -.05 .07 0" fill="none" stroke="#fff" stroke-width=".035" stroke-linecap="round"/>
      <g fill="#fff">${[[0.04, -0.46, 0.022], [0.1, -0.4, 0.016], [0.16, -0.44, 0.014], [0.0, -0.52, 0.016], [0.13, -0.33, 0.012], [-0.06, -0.55, 0.012]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}"/>`).join('')}</g>
      <path d="M-.72 .44 Q-.4 .36 -.1 .46 T.72 .42" fill="none" stroke="#fff" stroke-opacity=".7" stroke-width=".03"/>
      <rect x="-.64" y="-.56" width=".08" height=".2" fill="#d0453c"/><path d="M-.62 -.53 V-.39" stroke="#fff" stroke-opacity=".6" stroke-width=".01"/>
      <rect x="-.72" y="-.62" width="1.44" height="1.24" fill="none" stroke-width=".02" ${k.FS('#6e4a31')}/>`,
    uchiwa: (k) => {
      const ribs = (cx, cy) => Array.from({ length: 9 }, (_, i) => { const a = Math.PI * (1.1 + i * 0.1); return `M${cx} ${q2(cy + 0.24)} L${(cx + Math.cos(a) * 0.285).toFixed(3)} ${(cy + Math.sin(a) * 0.285).toFixed(3)}`; }).join(' ');
      return `<g transform="rotate(-20 -.1 .4)"><rect x="-.13" y=".02" width=".06" height=".5" rx=".02" ${k.F('#c9a46a')}/><path d="M-.13 .22 H-.07 M-.13 .38 H-.07" stroke-width=".012" ${k.FS('#a07f4c')}/><path d="M-.118 .1 V.5" stroke="#fff" stroke-opacity=".3" stroke-width=".012"/><rect x="-.135" y=".48" width=".07" height=".045" rx=".015" ${k.F('#3a2a1f')}/>
          <circle cx="-.1" cy="-.2" r=".3" ${k.F('#fbf6ec')}/><path d="M-.4 -.2 A.3 .3 0 0 1 .2 -.2 Z" ${k.F('#d0453c')}/><path d="${ribs(-0.1, -0.2)}" stroke="#2b1c12" stroke-opacity=".1" stroke-width=".008"/>
          <path d="M-.24 .0 q.04 -.02 .08 0 t.08 0 M-.06 .06 q.03 -.015 .06 0" fill="none" stroke-width=".012" ${k.FS('#8fc3e4')}/>
          <path d="M-.18 -.06 q.06 -.04 .12 0 q-.06 .04 -.12 0 Z M-.06 -.06 l.05 -.04 v.08 Z" ${k.F('#e88a3a')}/><circle cx="-.155" cy="-.065" r=".008" fill="#2a2730"/>
          <circle cx="-.1" cy="-.2" r=".295" fill="none" stroke-width=".016" ${k.FS('#c9a46a')}/><path d="M-.15 .1 L-.1 .03 L-.05 .1 Z" ${k.F('#b08a54')}/></g>
        <g transform="rotate(22 .1 .4)"><rect x=".07" y=".02" width=".06" height=".5" rx=".02" ${k.F('#c9a46a')}/><path d="M.07 .22 H.13 M.07 .38 H.13" stroke-width=".012" ${k.FS('#a07f4c')}/><path d="M.082 .1 V.5" stroke="#fff" stroke-opacity=".3" stroke-width=".012"/><rect x=".065" y=".48" width=".07" height=".045" rx=".015" ${k.F('#3a2a1f')}/>
          <circle cx=".1" cy="-.22" r=".3" ${k.F('#3f5f94')}/><path d="${ribs(0.1, -0.22)}" stroke="#fff" stroke-opacity=".12" stroke-width=".008"/>
          <path d="M-.14 -.14 q.06 -.06 .12 0 q.06 -.06 .12 0 q.06 -.06 .12 0 M-.12 -.28 q.06 -.06 .12 0 q.06 -.06 .12 0 q.06 -.06 .12 0" fill="none" stroke="#fff" stroke-opacity=".8" stroke-width=".025"/><path d="M-.06 -.06 q.06 -.05 .12 0 q.06 -.05 .12 0" fill="none" stroke="#fff" stroke-opacity=".45" stroke-width=".018"/>
          <circle cx=".1" cy="-.22" r=".295" fill="none" stroke-width=".016" ${k.FS('#2c4774')}/><path d="M.05 .1 L.1 .03 L.15 .1 Z" ${k.F('#b08a54')}/></g>`;
    },
    mirror: (k) => `<circle cx=".04" cy=".06" r=".5" fill="#2b1c12" fill-opacity=".13"/><circle r=".5" ${k.F(C.walnut)}/>
      <path d="M-.33 .33 A.47 .47 0 0 1 -.42 -.21 M.12 -.455 A.47 .47 0 0 1 .43 .19" fill="none" stroke-width=".012" ${k.FS('#76503a')}/><path d="M-.47 -.12 A.485 .485 0 0 1 .12 -.47" fill="none" stroke="#fff" stroke-opacity=".25" stroke-width=".022" stroke-linecap="round"/>
      <circle r=".445" ${k.F('#6c4930')}/><circle r=".42" ${k.F('#cfdde4')}/><path d="M-.4 .12 A.42 .42 0 0 1 .12 -.4 A.52 .52 0 0 0 -.4 .12 Z" fill="#fff" fill-opacity=".2"/>
      <path d="M-.28 -.06 L-.06 -.3 M-.22 .08 L.08 -.24" stroke="#fff" stroke-opacity=".7" stroke-width=".05" stroke-linecap="round"/><path d="M.2 .14 L.27 .07" stroke="#fff" stroke-opacity=".45" stroke-width=".03" stroke-linecap="round"/>
      <path d="M.06 .42 A.42 .42 0 0 1 .42 .06" fill="none" stroke="#9fb3bf" stroke-opacity=".5" stroke-width=".06"/>`,
    clock: (k) => {
      const r = 0.62;
      let ticks = '';
      for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6, l = i % 3 ? 0.08 : 0.15; ticks += `M${(Math.sin(a) * (r - 0.12)).toFixed(3)} ${(-Math.cos(a) * (r - 0.12)).toFixed(3)} L${(Math.sin(a) * (r - 0.12 - l)).toFixed(3)} ${(-Math.cos(a) * (r - 0.12 - l)).toFixed(3)} `; }
      return `<circle cx=".05" cy=".07" r="${r + 0.02}" fill="#2b1c12" fill-opacity=".14"/><circle r="${r}" ${k.F(C.walnut)}/><circle r="${q2(r - 0.035)}" fill="none" stroke-width=".012" ${k.FS('#a87a52')}/>
        <path d="M-.58 -.155 A.6 .6 0 0 1 .155 -.58" fill="none" stroke="#fff" stroke-opacity=".24" stroke-width=".022" stroke-linecap="round"/><circle r="${q2(r - 0.07)}" ${k.F('#6c4930')}/>
        <circle r="${q2(r - 0.08)}" ${k.F(C.paper)}/><path d="M-.54 .04 A.54 .54 0 0 1 .04 -.54 A.6 .6 0 0 0 -.54 .04 Z" fill="#2b1c12" fill-opacity=".1"/>
        <circle r=".51" fill="none" stroke-width=".022" stroke-dasharray=".006 .0474" stroke-opacity=".5" ${k.FS(C.ink)}/><path class="ln" stroke-width="1.1" ${k.FS(C.ink)} d="${ticks}"/>
        <rect x="-.08" y=".17" width=".16" height=".04" rx=".012" ${k.F('#b8925a')}/>`;
    },
    // Christmas (2026-11-14): 聖誕花圈, holly and fir woven in a ring, red berries and pine cones in it, a red bow at its foot
    wreath: (k) => {
      let g = '';
      for (let i = 0; i < 26; i++) { const a = i * 360 / 26, rr = i % 2 ? 0.34 : 0.4, c = i % 3 ? '#3f7a3a' : '#2f5f2e'; g += `<ellipse cx="${q2(rr * Math.cos(a * Math.PI / 180))}" cy="${q2(rr * Math.sin(a * Math.PI / 180))}" rx=".11" ry=".05" transform="rotate(${q2(a + 70)} ${q2(rr * Math.cos(a * Math.PI / 180))} ${q2(rr * Math.sin(a * Math.PI / 180))})" ${k.F(c)}/>`; }
      const berry = (a) => { const cx = q2(0.37 * Math.cos(a * Math.PI / 180)), cy = q2(0.37 * Math.sin(a * Math.PI / 180)); return `<circle cx="${cx}" cy="${cy}" r=".035" ${k.F('#d0303a')}/><circle cx="${q2(cx + 0.045)}" cy="${q2(cy + 0.02)}" r=".03" ${k.F('#d0303a')}/>`; };
      const cone = (a) => `<ellipse cx="${q2(0.38 * Math.cos(a * Math.PI / 180))}" cy="${q2(0.38 * Math.sin(a * Math.PI / 180))}" rx=".05" ry=".07" ${k.F('#8a5a3a')}/>`;
      return `<circle cx=".03" cy=".04" r=".46" fill="none" stroke="#2b1c12" stroke-opacity=".12" stroke-width=".14"/>${g}${[-150, -60, 20, 110].map(berry).join('')}${[-100, 60, 160].map(cone).join('')}
        <path d="M0 .36 C-.2 .22 -.3 .4 -.2 .46 C-.12 .5 -.06 .44 0 .4 C.06 .44 .12 .5 .2 .46 C.3 .4 .2 .22 0 .36 Z" ${k.F('#d0453c')}/><path d="M-.03 .4 L-.12 .62 L-.06 .6 L-.03 .66 Z M.03 .4 L.12 .62 L.06 .6 L.03 .66 Z" ${k.F('#b8382f')}/><circle cy=".38" r=".045" ${k.F('#a8302a')}/><path d="M-.2 -.3 Q-.08 -.4 .08 -.4" fill="none" stroke="#fff" stroke-opacity=".25" stroke-width=".02" stroke-linecap="round"/>`;
    },
    // 聖誕襪: three stockings on a garland of fir — red, green, white with red stripes — each with a white fur cuff, its foot out
    // to the right, hung on a little loop
    stockings: (k) => {
      const sock = (cx, c, stripes) => `<g transform="translate(${cx} 0)"><path d="M0 -.48 V-.36" stroke="#6e4a33" stroke-width=".015"/><path d="M-.13 -.32 H.13 V.12 Q.13 .22 .24 .25 Q.36 .28 .36 .37 Q.36 .47 .2 .47 H.02 Q-.13 .47 -.13 .3 Z" ${k.F(c)}/>${stripes ? `<path d="M-.13 -.14 H.13 M-.13 .04 H.13 M-.06 .22 Q.06 .3 .2 .28" stroke-width=".06" ${k.FS('#d0453c')}/>` : ''}<path d="M.06 -.32 H.13 V.12 Q.13 .2 .2 .24 L.1 .3 Q.06 .1 .06 -.32 Z" fill="#2b1c12" fill-opacity=".1"/>
        <rect x="-.17" y="-.4" width=".34" height=".13" rx=".05" ${k.F('#f7f3ec')}/><path d="M-.16 -.27 H.16" stroke="#2b1c12" stroke-opacity=".1" stroke-width=".015"/></g>`;
      let g = ''; for (let i = 0; i < 15; i++) { const u = -0.82 + i * 0.117; g += `<ellipse cx="${q2(u)}" cy="${q2(-0.5 + 0.03 * Math.sin(i))}" rx=".09" ry=".04" transform="rotate(${i % 2 ? 20 : -20} ${q2(u)} -.5)" ${k.F(i % 2 ? '#3f7a3a' : '#2f5f2e')}/>`; }
      return `<path d="M-.82 -.5 Q0 -.44 .82 -.5" fill="none" stroke="#2b1c12" stroke-opacity=".12" stroke-width=".05"/>${sock(-0.56, '#d0453c', false)}${sock(0, '#3f8a52', false)}${sock(0.56, '#f4efe6', true)}${g}<g ${k.F('#d0303a')}><circle cx="-.3" cy="-.47" r=".03"/><circle cx=".3" cy="-.49" r=".03"/></g>`;
    },
  };
  // the floor wares: (x, y) the middle of the footprint, r turned a quarter; L lights a point of it (by default its middle, 0.6 up)
  const lit = (x, y) => (h, z = 0.6, f = 'y') => F(h, f, [x, y, z]);
  let CLIPN = 0;   // clip ids, new each drawing (a ware may be drawn twice at once: in the room and on the drag layer)
  const FLOOR = {
    // ---- the house's own since 1.3.0: 書房's reading corner and low shelf, the bedroom's wardrobe and dresser ----
    sofa: (x, y) => {   // a two-seater, its back to the right wall: a base on short legs, the back, two arms, two seat cushions, two throw pillows
      const x0 = x - 1.7, x1 = x + 1.7, y0 = y - 0.75, y1 = y + 0.75, cl = '#7d9bb0', dk = '#6a879c', lt = '#8fadc1';
      let s = shadow(x0 - 0.1, y0, x1 + 0.3, y1 + 0.35, 0.85);
      [[x0 + 0.15, y1 - 0.25], [x1 - 0.25, y1 - 0.25]].forEach(([a, b]) => { s += box(C.walnut, a, b, 0, a + 0.1, b + 0.1, 0.22, { hl: false }); });
      s += box(cl, x0, y0, 0.22, x1, y1, 0.9, { t: false, y: dk, x: dk, hlv: true });
      s += box(cl, x0 + 0.05, y0, 0.9, x1 - 0.05, y0 + 0.5, 2.3, { t: lt, x: dk, hlv: true });
      s += box(cl, x0, y0 + 0.02, 0.9, x0 + 0.38, y1, 1.6, { t: lt, hlv: true });
      s += box(lt, x0 + 0.4, y0 + 0.5, 0.9, x - 0.02, y1 - 0.02, 1.22, { y: cl, x: cl, hlv: true }) + box(lt, x + 0.02, y0 + 0.5, 0.9, x1 - 0.4, y1 - 0.02, 1.22, { y: cl, x: cl, hlv: true });
      s += bb(x0 + 0.85, y0 + 0.62, 1.22, `<g transform="rotate(-8)"><rect x="-11" y="-22" width="22" height="20" rx="5" ${F(C.mustard, 'y', [x0 + 0.85, y0 + 0.7, 1.6])}/></g>`);
      s += bb(x1 - 0.85, y0 + 0.62, 1.22, `<g transform="rotate(7)"><rect x="-11" y="-22" width="22" height="20" rx="5" ${F('#ece2d0', 'y', [x1 - 0.85, y0 + 0.7, 1.6])}/><path d="M-6 -16 h12 M-6 -11 h12 M-6 -6 h12" stroke="#c98f6d" stroke-width="1.2"/></g>`);
      return s + box(cl, x1 - 0.38, y0 + 0.02, 0.9, x1, y1, 1.6, { t: lt, hlv: true });
    },
    sideTable: (x, y) => {   // a small table with a shelf, a book on it, a reading lamp on top (its light: the ware's light)
      const h = 1.5, L = lit(x, y);
      let s = shadow(x - 0.45, y - 0.45, x + 0.55, y + 0.55, 0.7);
      [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => { s += box(C.oakDk, x + a * 0.34 - 0.04, y + b * 0.34 - 0.04, 0, x + a * 0.34 + 0.04, y + b * 0.34 + 0.04, h - 0.08, { hl: false }); });
      s += box(C.oak, x - 0.4, y - 0.4, 0.45, x + 0.4, y + 0.4, 0.52, { t: C.oakTop }) + box('#5e7f9c', x - 0.25, y - 0.2, 0.52, x + 0.2, y + 0.25, 0.62, { t: '#e9e0cc' });
      s += box(C.oak, x - 0.45, y - 0.45, h - 0.08, x + 0.45, y + 0.45, h, { t: C.oakTop, hlv: true });
      s += `<g class="night-only" style="opacity:calc(.5 + .5 * var(--f))"><g transform="${onZ(h + 0.004)}"><circle cx="${x}" cy="${y}" r=".5" fill="url(#pool)"/></g></g>`;
      return s + bb(x - 0.05, y, h, `<ellipse rx="7" ry="2.8" ${F('#d9ccb6', 't', [x, y, h])}/><rect x="-1.2" y="-22" width="2.4" height="22" ${L('#b8925a', h + 0.5)}/><path d="M-12 -20 L12 -20 L8 -38 L-8 -38 Z" style="fill:color-mix(in srgb,#f3e3c4 calc(var(--day)*100%),#ffd27a)"/><path d="M-8 -38 L-12 -20" class="hl"/><ellipse cy="-20" rx="12" ry="3" fill="#fff4d8"/>`);
    },
    kotatsu: (x, y) => {   // a kotatsu in the middle of 書房: the quilt, the table top, a basket of mikan, a cushion on three sides
      const q = 0.95, t = 0.82, L = lit(x, y), cushion = (x0, y0, x1, y1, c, ct) => box(c, x0, y0, 0, x1, y1, 0.18, { t: ct, hlv: true });
      let s = shadow(x - 1.3, y - 1.3, x + 1.45, y + 1.45, 0.7) + cushion(x - 1.4, y - 0.45, x - 0.97, y + 0.45, '#c8553f', '#d36a55');
      s += box('#e6d9c3', x - q, y - q, 0, x + q, y + q, 0.7, { t: '#ede3d1', y: '#dccdb4', x: '#d2c2a6', hlv: true });
      s += `<g transform="${onZ(0.004)}"><path d="M${q2(x - q)} ${q2(y + q)} H${q2(x + q)} V${q2(y - q)}" fill="none" stroke="#b9a684" stroke-opacity=".5" stroke-width=".05"/></g>`;
      s += qY('#c98f6d', y + q + 0.003, x - q, x + q, 0.12, 0.2, 'y') + qX('#bf8664', x + q + 0.003, y - q, y + q, 0.12, 0.2, 'x');   // a band near the hem
      s += box(C.oak, x - t, y - t, 0.7, x + t, y + t, 0.8, { t: C.oakTop, hlv: true });
      s += bb(x - 0.15, y + 0.05, 0.8, `<ellipse rx="10" ry="3.6" ${L('#a9824f', 0.9)}/><path ${L('#b88f5a', 0.9)} d="M-10 0 Q-9 -6 0 -6 Q9 -6 10 0 Q0 4 -10 0 Z"/><g fill="#f0923a"><circle cx="-4" cy="-7" r="3.4"/><circle cx="3" cy="-7.5" r="3.4"/><circle cx="-.5" cy="-11" r="3.4"/></g><path d="M-.5 -14 l1.2 -1.6" stroke="#4f8a4c" stroke-width="1.2"/>`);
      s += bb(x + 0.45, y - 0.3, 0.8, `<ellipse rx="5" ry="1.8" fill="#2b1c12" fill-opacity=".12"/><path ${L('#f3efe6', 1)} d="M-4 -1 L-4.5 -9 H4.5 L4 -1 Z"/><ellipse cy="-9" rx="4.5" ry="1.5" fill="#7a9a5a"/>`);
      return s + cushion(x - 0.45, y + 0.97, x + 0.45, y + 1.4, '#4f6aa8', '#6079b4') + cushion(x + 0.97, y - 0.45, x + 1.4, y + 0.45, '#4f6aa8', '#6079b4');
    },
    loungeRug: (x, y) => {   // a kilim in front of the sofa: a border, a row of diamonds (2026-11-11, the user: finer: fringe on its ends, inside its footprint, and a zigzag woven along each long side)
      const w = 2.12, d = 1.4, a = [x, y, 0];
      let fr = ''; for (let v = y - d + 0.1; v < y + d - 0.06; v += 0.07) fr += `M${q2(x - 2.2)} ${q2(v)} H${q2(x - w + 0.04)} M${q2(x + w - 0.04)} ${q2(v)} H${q2(x + 2.2)} `;
      const zig = (zy) => `M${q2(x - w + 0.36)} ${q2(zy)}` + Array.from({ length: Math.floor((2 * w - 0.72) / 0.08) }, (_, i) => ` l.08 ${i % 2 ? 0.06 : -0.06}`).join('');
      return `<g transform="${onZ(0.015)}"><rect x="${q2(x - w + 0.05)}" y="${q2(y - d + 0.06)}" width="${2 * w}" height="${2 * d}" rx=".18" fill="#2b1c12" fill-opacity=".08"/>
        <path d="${fr}" stroke-width=".025" stroke-linecap="round" ${FS('#e9dcc4', 't', a)}/><rect x="${q2(x - w)}" y="${q2(y - d)}" width="${2 * w}" height="${2 * d}" rx=".18" ${F('#dccab0', 't', a)}/>
        <path d="${zig(y - d + 0.33)} ${zig(y + d - 0.33)}" fill="none" stroke-width=".03" stroke-linejoin="round" ${FS('#b0574a', 't', a)}/>
        <rect x="${q2(x - w + 0.2)}" y="${q2(y - d + 0.2)}" width="${q2(2 * w - 0.4)}" height="${q2(2 * d - 0.4)}" rx=".1" fill="none" stroke-width=".08" ${FS('#9a6f4c', 't', a)}/>
        <path d="M${q2(x - w + 0.4)} ${q2(y - d + 0.45)} H${q2(x + w - 0.4)} M${q2(x - w + 0.4)} ${q2(y + d - 0.45)} H${q2(x + w - 0.4)}" stroke-width=".04" ${FS('#9a6f4c', 't', a)}/>
        ${[-1.2, -0.4, 0.4, 1.2].map((dx, i) => `<path d="M${q2(x + dx - 0.25)} ${y} l.25 -.35 l.25 .35 l-.25 .35 Z" ${F(i % 2 ? '#5f88b2' : '#b0574a', 't', a)}/>`).join('')}</g>`;
    },
    lowShelf: (x, y) => {   // a low open shelf against the left wall: books above, two baskets below, a plant, a radio and a photo on top
      // (test, roomV 8: each cell drawn as a hollow — its back, its floor, its left side — and what stands in it seen only through
      // its opening, so no book stands out over the frame)
      const x0 = x - 0.55, x1 = x + 0.55, y0 = y - 1.7, y1 = y + 1.7, h = 2.4, L = lit(x1, y);
      const cells = [[y0 + 0.12, y - 0.05, 0.2, 1.12], [y + 0.05, y1 - 0.12, 0.2, 1.12], [y0 + 0.12, y - 0.05, 1.24, 2.26], [y + 0.05, y1 - 0.12, 1.24, 2.26]];
      const PAL = ['#b65d50', '#d8a748', '#5e7f9c', '#86a17a', '#8b6e94', '#e7dbc6', '#40516d'];
      let s = shadow(x0, y0 - 0.1, x1 + 0.35, y1 + 0.3, 0.85) + box(C.oak, x0, y0, 0, x1, y1, h, { t: C.oakTop, x: C.oakDk, hlv: true }), i = 0;
      cells.forEach(([a, b, za, zb], k) => {
        const id = `lsc${++CLIPN}`, xb = x0 + 0.08;
        s += `<clipPath id="${id}"><path d="${poly([[x1, a, za], [x1, b, za], [x1, b, zb], [x1, a, zb]])}"/></clipPath><g clip-path="url(#${id})">`;
        s += qX('#5a3b26', xb, a, b, za, zb, 'x') + qY('#7a5538', a, xb, x1, za, zb, 'y') + qZ('#8d6644', za, xb, x1, a, b);
        s += `<path d="${poly([[xb, a, za], [x1, a, za], [x1, b, za]])}" fill="#2b1c12" fill-opacity=".12"/>`;
        if (k < 2) s += box('#c9a06a', x1 - 0.8, a + 0.08, za, x1 - 0.1, b - 0.08, za + 0.7, { t: '#8a6a48', hlv: true }) + `<path class="ln" stroke="#9c7346" stroke-opacity=".6" stroke-width="1" d="${[0.2, 0.38, 0.56].map((dz) => line([[x1 - 0.095, a + 0.1, za + dz], [x1 - 0.095, b - 0.1, za + dz]])).join(' ')}"/>`;
        else for (let yy = a + 0.06; ; i++) {
          const w = [0.14, 0.18, 0.12, 0.16, 0.2][i % 5], hh = [0.8, 0.9, 0.7, 0.86, 0.76][(i * 3) % 5];
          if (yy + w > b - 0.05) break;
          s += box(PAL[(i * 3) % PAL.length], x0 + 0.22, yy, za, x1 - 0.12, yy + w, za + hh, { t: '#ece3d0', hl: false }); yy += w + 0.015;
        }
        s += '</g>';
      });
      s += bb(x, y0 + 0.55, h, `<ellipse rx="7" ry="2.6" fill="#2b1c12" fill-opacity=".14"/><path ${L(C.pot, h + 0.2)} d="M-5.5 -1 L-4.5 -10 H4.5 L5.5 -1 Z"/><g ${L(C.leaf, h + 0.6)}><path d="M0 -10 C-10 -14 -13 -24 -9 -30 C-4 -23 -1 -16 0 -10 Z"/><path d="M0 -10 C8 -16 14 -20 18 -19 C14 -12 8 -10 0 -10 Z"/><path d="M0 -10 C0 -21 3 -29 6 -33 C8 -25 5 -16 0 -10 Z"/></g>`);
      s += box('#c95f4c', x0 + 0.25, y - 0.45, h, x1 - 0.15, y + 0.35, h + 0.45, { t: '#d8735f', hlv: true }) + bb(x1 - 0.14, y - 0.05, h + 0.22, `<circle r="4.4" fill="#3b3653" fill-opacity=".75"/><circle r="1.6" fill="#e6c36a"/>`);
      return s + bb(x, y1 - 0.5, h, `<path ${L(C.walnut, h + 0.3)} d="M-7 0 L-6 -15 H6 L7 0 Z"/><rect x="-4.4" y="-12.5" width="8.8" height="10" fill="#f2e9d6"/><circle cx="1.5" cy="-9" r="1.8" fill="#e8743a"/><path d="M-4.4 -5 L-1 -8 L2 -6 L4.4 -8.5 V-2.5 H-4.4 Z" fill="#8fbf8a"/>`);
    },
    // the full-length mirror and the wardrobe turn (2026-11-14, the user): turned, they stand with their backs to the right wall,
    // their fronts looking along +y (the glass and the doors drawn on that face, u = x, instead of u = -y)
    fullMirror: (x, y, r) => {   // a full-length mirror leaning on the left wall: a walnut frame on two little feet, the glass catching the light
      const h = 5, [x0, x1, y0, y1] = r ? [x - 0.65, x + 0.65, y - 0.3, y + 0.3] : [x - 0.3, x + 0.3, y - 0.65, y + 0.65];
      const [u0, u1] = r ? [x0, x1] : [-y1, -y0], a = r ? [x, y1, 2.5] : [x1, y, 2.5], f = r ? 'y' : 'x';
      let s = r ? shadow(x0 - 0.1, y0, x1 + 0.3, y1 + 0.35, 0.75) : shadow(x0, y0 - 0.1, x1 + 0.35, y1 + 0.3, 0.75);
      s += r ? box(C.oakDk, x0 + 0.05, y0 + 0.1, 0, x0 + 0.25, y1, 0.18, { hl: false }) + box(C.oakDk, x1 - 0.25, y0 + 0.1, 0, x1 - 0.05, y1, 0.18, { hl: false })
        : box(C.oakDk, x0 + 0.1, y0 + 0.05, 0, x1, y0 + 0.25, 0.18, { hl: false }) + box(C.oakDk, x0 + 0.1, y1 - 0.25, 0, x1, y1 - 0.05, 0.18, { hl: false });
      s += r ? box(C.walnut, x0, y0 + 0.12, 0.18, x1, y0 + 0.34, h, { t: C.oak, x: '#7a5438', y: C.walnut, hlv: true })
        : box(C.walnut, x0 + 0.12, y0, 0.18, x0 + 0.34, y1, h, { t: C.oak, y: '#7a5438', x: C.walnut, hlv: true });
      s += `<g transform="${r ? onY(y0 + 0.345) : onX(x0 + 0.345)}"><defs><linearGradient id="fmGlass" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#e9f3f6"/><stop offset=".55" stop-color="#bcd6e0"/><stop offset="1" stop-color="#9fc0cf"/></linearGradient></defs>
        <rect x="${q2(u0 + 0.13)}" y="${q2(-h + 0.14)}" width="${q2(u1 - u0 - 0.26)}" height="${q2(h - 0.46)}" rx=".5" fill="url(#fmGlass)" style="opacity:calc(.55 + .45 * var(--day))"/>
        <path d="M${q2(u0 + 0.35)} ${q2(-h + 1.4)} L${q2(u0 + 0.75)} ${q2(-h + 0.6)} M${q2(u0 + 0.35)} ${q2(-h + 2.1)} L${q2(u0 + 1.05)} ${q2(-h + 0.75)}" stroke="#fff" stroke-opacity=".7" stroke-width=".08" stroke-linecap="round"/>
        <rect x="${q2(u0 + 0.13)}" y="${q2(-h + 0.14)}" width="${q2(u1 - u0 - 0.26)}" height="${q2(h - 0.46)}" rx=".5" fill="none" stroke-width=".05" ${FS(C.oak, f, a)}/></g>`;
      return s;
    },
    wardrobe: (x, y, r) => {   // a tall wardrobe against the left wall: a plinth, two doors with panels and knobs, a cornice, a hat box on top (tapped: 衣櫃)
      const h = 6.2, [x0, x1, y0, y1] = r ? [x - 1.3, x + 1.3, y - 0.65, y + 0.65] : [x - 0.65, x + 0.65, y - 1.3, y + 1.3];
      const c = r ? x : -y, [p0, p1] = r ? [x0, x1] : [-y1, -y0], a = (z) => (r ? [x, y1, z] : [x1, y, z]), f = r ? 'y' : 'x';   // c, p0, p1: the doors' middle and ends along the face (u)
      let s = r ? shadow(x0 - 0.1, y0, x1 + 0.35, y1 + 0.4, 0.9) : shadow(x0, y0 - 0.1, x1 + 0.4, y1 + 0.35, 0.9);
      s += box(C.oakDk, x0 + 0.05, y0 + 0.05, 0, x1 - 0.05, y1 - 0.05, 0.25, { hl: false });
      s += box(C.oak, x0, y0, 0.25, x1, y1, h, r ? { t: C.oakTop, x: C.oakDk, hlv: true } : { t: C.oakTop, y: C.oakDk, hlv: true });
      s += `<g transform="${r ? onY(y1 + 0.004) : onX(x1 + 0.004)}"><path d="M${q2(c)} ${q2(-h + 0.1)} V-.35" stroke="#5a3d28" stroke-opacity=".55" stroke-width=".035"/>
        ${[[p0 + 0.18, c - 0.12], [c + 0.12, p1 - 0.18]].map(([p, q]) => `<rect x="${q2(p)}" y="${q2(-h + 0.35)}" width="${q2(q - p)}" height="2.5" rx=".06" ${F(C.oakTop, f, a(4.6))}/><rect x="${q2(p)}" y="-3.05" width="${q2(q - p)}" height="2.5" rx=".06" ${F(C.oakTop, f, a(1.8))}/>`).join('')}</g>`;
      s += [-0.16, 0.16].map((d) => (r ? bb(x + d, y1 + 0.02, 3.25, '<circle r="3" fill="#e6c36a"/>') : bb(x1 + 0.02, y + d, 3.25, '<circle r="3" fill="#e6c36a"/>'))).join('');
      s += box(C.walnut, x0 - 0.05, y0 - 0.05, h, x1 + 0.08, y1 + 0.08, h + 0.22, { t: C.oak, hlv: true });
      return s + (r ? box('#d98463', x0 + 0.3, y0 + 0.2, h + 0.22, x0 + 1.2, y1 - 0.15, h + 0.72, { t: '#e9a07e', hlv: true }) : box('#d98463', x0 + 0.2, y0 + 0.3, h + 0.22, x1 - 0.15, y0 + 1.2, h + 0.72, { t: '#e9a07e', hlv: true }));
    },
    dresser: (x, y) => {   // a low cream chest of drawers against the right wall: a round mirror on a stand, a vase, a little box on top
      const x0 = x - 1.2, x1 = x + 1.2, y0 = y - 0.6, y1 = y + 0.6, h = 2.6, L = lit(x, y);
      const knob = (kx, kz) => bb(kx, y1 + 0.02, kz, '<circle r="2.6" fill="#c9a24e"/>');
      let s = shadow(x0 - 0.1, y0, x1 + 0.3, y1 + 0.4, 0.85);
      s += box(C.oakDk, x0 + 0.1, y0 + 0.05, 0, x1 - 0.1, y1 - 0.05, 0.2, { hl: false }) + box('#e9dfcd', x0, y0, 0.2, x1, y1, h, { t: C.oakTop, x: '#d8ccb6', hlv: true });
      [[0.35, 1.05], [1.15, 1.85]].forEach(([a, b]) => { s += qY('#f3ecdf', y1 + 0.004, x0 + 0.12, x1 - 0.12, a, b, 'y') + `<path class="hl" d="${line([[x0 + 0.12, y1 + 0.005, b], [x1 - 0.12, y1 + 0.005, b]])}"/>` + knob(x - 0.5, (a + b) / 2) + knob(x + 0.5, (a + b) / 2); });
      [[x0 + 0.12, x - 0.04], [x + 0.04, x1 - 0.12]].forEach(([a, b]) => { s += qY('#f3ecdf', y1 + 0.004, a, b, 1.95, 2.48, 'y') + knob((a + b) / 2, 2.21); });
      s += bb(x - 0.45, y - 0.15, h, `<rect x="-1.4" y="-10" width="2.8" height="10" ${L(C.walnut, h + 0.3)}/><ellipse cy="-26" rx="15" ry="17" ${L(C.walnut, h + 0.7)}/><ellipse cy="-26" rx="12.5" ry="14.5" fill="#cfe0ea"/><path d="M-6 -36 L4 -20" stroke="#fff" stroke-opacity=".7" stroke-width="2.2"/>`);
      s += bb(x + 0.6, y + 0.05, h, `<path ${L('#5f88b2', h + 0.2)} d="M-3.5 0 C-6 -4 -5 -9 -2 -11 V-14 H2 V-11 C5 -9 6 -4 3.5 0 Z"/><path d="M0 -14 C-1 -20 1 -24 0 -28" stroke="#4f8a4c" stroke-width="1.2" fill="none"/><circle cy="-29" r="2.8" fill="#f08bb0"/>`);
      return s + box('#c8553f', x + 0.05, y + 0.1, h, x + 0.35, y + 0.35, h + 0.15, { t: '#d86a5a' });
    },
    gramophone: (x, y, r) => {   // 2026-11-11 (the user: finer): the lid's seam, the panels sunk in (shade above, light below), a brass crank; grooves on the record and its spindle; the horn's seams and the bell's lit rim; the tone arm's pivot and sound box
      const h = 1.1, L = lit(x, y + 0.3), rc = [q2(x - 0.06), q2(y + 0.06)];
      let s = shadow(x - 0.5, y - 0.5, x + 0.62, y + 0.62, 0.75);
      s += box(C.walnut, x - 0.42, y - 0.42, 0, x + 0.42, y + 0.42, h, { t: '#a87a52', x: '#74503a', hlv: true });
      s += qY('#6e4a33', y + 0.425, x - 0.3, x + 0.3, 0.22, 0.86, 'y') + qX('#6a4630', x + 0.425, y - 0.3, y + 0.3, 0.22, 0.86, 'x');
      s += `<path class="ln" stroke="#2b1c12" stroke-opacity=".3" stroke-width="1.2" d="${line([[x - 0.3, y + 0.427, 0.86], [x + 0.3, y + 0.427, 0.86]])} ${line([[x + 0.427, y + 0.3, 0.86], [x + 0.427, y - 0.3, 0.86]])} ${line([[x - 0.42, y + 0.427, h - 0.12], [x + 0.427, y + 0.427, h - 0.12], [x + 0.427, y - 0.42, h - 0.12]])}"/>`;
      s += `<path class="ln" stroke="#fff" stroke-opacity=".16" stroke-width="1" d="${line([[x - 0.3, y + 0.427, 0.22], [x + 0.3, y + 0.427, 0.22]])} ${line([[x + 0.427, y + 0.3, 0.22], [x + 0.427, y - 0.3, 0.22]])}"/>`;
      s += bb(x + 0.425, y + 0.04, 0.58, `<ellipse rx="1.7" ry="2.2" transform="skewY(-26.6)" ${F('#b88a3e', 'x', [x + 0.43, y, 0.58])}/><path d="M0 0 l2.8 1.4 V-5.6" fill="none" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" ${FS('#c99a48', 'x', [x + 0.5, y, 0.6])}/><path d="M2.8 -5.6 l2.6 1.3" stroke-width="2.3" stroke-linecap="round" ${FS('#4f3627', 'x', [x + 0.5, y, 0.75])}/>`);
      s += `<g transform="${onZ(h + 0.006)}"><circle cx="${rc[0]}" cy="${rc[1]}" r=".31" fill="#2a2730"/><circle cx="${rc[0]}" cy="${rc[1]}" r=".22" fill="none" stroke="#fff" stroke-opacity=".14" stroke-width=".02"/><g fill="none" stroke="#fff" stroke-opacity=".08" stroke-width=".012"><circle cx="${rc[0]}" cy="${rc[1]}" r=".27"/><circle cx="${rc[0]}" cy="${rc[1]}" r=".17"/><circle cx="${rc[0]}" cy="${rc[1]}" r=".12"/></g><path d="M${q2(rc[0] - 0.2)} ${q2(rc[1] - 0.12)} A.24 .24 0 0 1 ${q2(rc[0] + 0.04)} ${q2(rc[1] - 0.23)}" fill="none" stroke="#fff" stroke-opacity=".22" stroke-width=".03" stroke-linecap="round"/><circle cx="${rc[0]}" cy="${rc[1]}" r=".07" fill="#d0574a"/><circle cx="${rc[0]}" cy="${rc[1]}" r=".015" fill="#e8e4dc"/></g>`;
      s += upright(x + 0.2, y - 0.2, h, r, `<path d="M0 0 V-9 Q0 -15 -5 -19" fill="none" stroke-width="3" stroke-linecap="round" ${FS('#b88a3e', 'y', [x, y, h + 0.3])}/><circle r="2.4" ${F('#8a6a3a', 't', [x, y, h])}/>
        <path ${L('#e2b252', h + 1.2)} d="M-5 -19 C-11 -26 -18 -41 -21 -58 C-5 -67 15 -61 25 -47 C9 -43 -2 -33 -5 -19 Z"/>
        <path d="M-5.6 -20 C-9 -28 -11 -35 -10.4 -41 M-4.4 -20 C-2 -30 2 -38 5.6 -44.6" fill="none" stroke="#8a5f20" stroke-opacity=".38" stroke-width=".8"/>
        <ellipse cx="2" cy="-53" rx="23" ry="9.5" transform="rotate(-24 2 -53)" ${L('#a3742c', h + 1.4)}/><ellipse cx="2" cy="-53" rx="15" ry="5.6" transform="rotate(-24 2 -53)" fill="#3a2a1a" fill-opacity=".4"/>
        <ellipse cx="2" cy="-53" rx="22.4" ry="9" transform="rotate(-24 2 -53)" fill="none" stroke="#f6d488" stroke-opacity=".55" stroke-width=".9"/>
        <path d="M-17 -38 C-15 -48 -8 -56 4 -59" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width="1.6" stroke-linecap="round"/>
        <path d="M-2 -2 L-16 4" stroke="#5c5d68" stroke-width="2.2" stroke-linecap="round"/><circle cx="-2" cy="-2" r="2.1" fill="#4a4b55"/><circle cx="-16.4" cy="4.2" r="2.6" fill="#8d8f99"/><circle cx="-16.4" cy="4.2" r="1" fill="#4a4b55"/><path d="M-17.8 2.6 a2 2 0 0 1 2.4 -.4" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width=".5"/>`);
      return s;
    },
    goldfish: (x, y, r) => {   // 2026-11-11 (the user: finer): gravel and a sprig of weed on the bowl's floor, two bubbles, the fish with eyes
      const h = 1.5, L = lit(x, y + 0.3);
      let s = shadow(x - 0.42, y - 0.42, x + 0.5, y + 0.5, 0.7);
      [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => { s += box(C.oakDk, x + a * 0.26 - 0.04, y + b * 0.26 - 0.04, 0, x + a * 0.26 + 0.04, y + b * 0.26 + 0.04, h - 0.1, { hl: false }); });
      s += box(C.oak, x - 0.34, y - 0.34, h - 0.12, x + 0.34, y + 0.34, h, { t: C.oakTop, hlv: true });
      s += upright(x, y, h, r, `<ellipse rx="15" ry="5" fill="#2b1c12" fill-opacity=".15"/>
        <circle cy="-15" r="16" fill="#cfe9f3" fill-opacity=".45" stroke="#e8f6fb" stroke-width="1.2"/>
        <path d="M-15 -12 Q0 -6 15 -12 A16 16 0 0 1 -15 -12 Z" style="fill:color-mix(in srgb,#8fcbe0 calc(var(--day)*100%),#3b5c8a)" fill-opacity=".85"/>
        <path d="M-15 -14 Q0 -8 15 -14" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width="1"/>
        <path d="M-6.4 -1.2 C-7.6 -4 -5.4 -6 -7 -9.4 M-6.6 -4.4 C-8.6 -5 -9.4 -6.6 -9.2 -7.6 M-6.2 -6.6 C-4.6 -7.6 -4.2 -9 -4.4 -10" fill="none" stroke="#4f8a4c" stroke-opacity=".85" stroke-width="1.1" stroke-linecap="round"/>
        <g fill-opacity=".9"><ellipse cx="-3.4" cy="-.6" rx="1.4" ry=".8" fill="#e8dcc4"/><ellipse cx="-.6" cy="-.2" rx="1.2" ry=".7" fill="#c98f6d"/><ellipse cx="1.8" cy="-.7" rx="1.3" ry=".8" fill="#9fb0a8"/><ellipse cx="4.4" cy="-.4" rx="1.1" ry=".7" fill="#e8dcc4"/><ellipse cx="-5.6" cy="-.2" rx="1" ry=".6" fill="#b7a27e"/></g>
        <g class="fish"><path d="M-6 -9 q4 -3 8 0 q-4 3 -8 0 Z M2 -9 l3 -2.4 v4.8 Z" fill="#f07a3a"/><path d="M4 -4 q-4 -2.6 -7 0 q3 2.6 7 0 Z M-3 -4 l-2.6 -2 v4 Z" fill="#f4a03c"/><path d="M-1.6 -10.6 q1.4 -1.6 2.6 -.6 M1 -5.4 q-1.2 -1.4 -2.4 -.4" fill="none" stroke="#e05f28" stroke-width=".7"/><circle cx="-4.4" cy="-9.4" r=".55" fill="#2a2730"/><circle cx="2.7" cy="-4.4" r=".5" fill="#2a2730"/></g>
        <g fill="none" stroke="#fff" stroke-opacity=".7" stroke-width=".5"><circle cx="-7.6" cy="-11.4" r=".8"/><circle cx="-8.4" cy="-14" r=".55"/></g>
        <ellipse cy="-29" rx="9.5" ry="2.6" fill="none" stroke="#e8f6fb" stroke-width="1.4"/>
        <path d="M-10 -24 A13 13 0 0 1 -4 -29" fill="none" stroke="#fff" stroke-opacity=".75" stroke-width="2" stroke-linecap="round"/>`);
      return s;
    },
    bonsai: (x, y, r) => {   // 2026-11-11 (the user: finer): a glazed tray with a lip, moss and a pebble on the soil; a trunk that flares at its roots and tapers, a branch up to each pad; the pads cloud-edged, shaded beneath, lit along their tops
      const L = lit(x, y), z = 0.28;
      let s = shadow(x - 0.42, y - 0.36, x + 0.5, y + 0.46, 0.7);
      s += box('#4f5f78', x - 0.34, y - 0.24, 0, x + 0.34, y + 0.24, z - 0.06, { t: false, x: '#43516a', hlv: true });
      s += `<path class="ln" stroke="#2b1c12" stroke-opacity=".22" stroke-width="1.4" d="${line([[x - 0.34, y + 0.243, z - 0.07], [x + 0.343, y + 0.243, z - 0.07], [x + 0.343, y - 0.24, z - 0.07]])}"/>`;
      s += box('#56688a', x - 0.36, y - 0.26, z - 0.07, x + 0.36, y + 0.26, z, { t: '#62749a', x: '#4a5a78', hlv: true }) + qZ('#6b5440', z + 0.002, x - 0.31, x + 0.31, y - 0.21, y + 0.21);
      s += `<g transform="${onZ(z + 0.004)}"><g ${F('#5b8547', 't', [x, y, z])}><ellipse cx="${q2(x - 0.05)}" cy="${q2(y + 0.02)}" rx=".14" ry=".1"/><ellipse cx="${q2(x - 0.18)}" cy="${q2(y + 0.1)}" rx=".07" ry=".05"/><ellipse cx="${q2(x + 0.12)}" cy="${q2(y - 0.09)}" rx=".06" ry=".04"/></g><path d="M${q2(x - 0.12)} ${q2(y)} h.01 M${q2(x - 0.02)} ${q2(y + 0.06)} h.01 M${q2(x + 0.03)} ${q2(y - 0.03)} h.01" stroke="#a6c77a" stroke-opacity=".7" stroke-width=".03" stroke-linecap="round"/><ellipse cx="${q2(x + 0.2)}" cy="${q2(y + 0.1)}" rx=".05" ry=".04" ${F('#b9b3a6', 't', [x, y, z])}/></g>`;
      // a pad of needles: a cloud edge of n bumps over a flatter underside
      const pad = (cx, cy, rx, ry, n) => { let d = `M${cx - rx} ${cy}`; for (let k = 1; k <= n; k++) { const t = Math.PI * (1 - k / n); d += ` A${q2(rx / n * 1.25)} ${q2(rx / n * 1.05)} 0 0 1 ${q2(cx + rx * Math.cos(t))} ${q2(cy - ry * 0.78 * Math.sin(t))}`; } return d + ` A${rx} ${q2(ry * 0.8)} 0 0 1 ${cx - rx} ${cy} Z`; };
      const pads = [[-13, -30, 11, 5, 4], [14, -28, 10, 4.6, 4], [1, -38, 12, 5.4, 5]];
      s += upright(x, y, z, r, `<g class="leafy"><path ${L('#6d4c35', 0.6)} d="M-5.5 0.6 C-3 -.6 -2.4 -2.4 -2.2 -5 L2.6 -5 C2.6 -2.4 3.6 -.6 6 0.6 Z"/>
        <path d="M0 0 C-2 -6 3 -10 1 -16" fill="none" stroke-width="4.6" stroke-linecap="round" ${FS('#6d4c35', 'y', [x, y, 0.6])}/>
        <path d="M1 -16 C-1 -21 -8 -22 -11 -27 M1 -16 C5 -19 11 -20 14 -25 M1 -16 C2 -22 0 -28 1 -33" fill="none" stroke-width="2.6" stroke-linecap="round" ${FS('#6d4c35', 'y', [x, y, 0.9])}/>
        <path d="M-1.2 -1 C-2.8 -6 1.8 -10 -0.2 -15 M-1 -20 C-4 -22 -7 -23 -9 -26" fill="none" stroke="#fff" stroke-opacity=".22" stroke-width=".9" stroke-linecap="round"/><path d="M1.6 -4 l-1.6 1.4 M0.6 -9 l1.8 -1" stroke="#2b1c12" stroke-opacity=".3" stroke-width=".7" stroke-linecap="round"/>
        ${pads.map(([cx, cy, rx, ry]) => `<ellipse cx="${cx}" cy="${q2(cy + ry * 0.3)}" rx="${q2(rx * 0.9)}" ry="${q2(ry * 0.72)}" ${L('#3d6e3c', 0.9)}/>`).join('')}
        <g ${L('#4f8a4c', 1)}>${pads.map(([cx, cy, rx, ry, n]) => `<path d="${pad(cx, cy, rx, ry, n)}"/>`).join('')}</g>
        <g fill="#7fb36d" fill-opacity=".75">${pads.map(([cx, cy, rx, ry, n]) => `<path d="${pad(cx, q2(cy - ry * 0.32), q2(rx * 0.66), q2(ry * 0.55), n - 1)}"/>`).join('')}</g>
        <path d="${pads.map(([cx, cy, rx, ry]) => [-0.6, -0.2, 0.2, 0.6].map((f) => `M${q2(cx + rx * f)} ${q2(cy + ry * 0.35)} l.8 -1.4`).join(' ')).join(' ')}" stroke="#2f5a32" stroke-opacity=".45" stroke-width=".8" stroke-linecap="round"/></g>`);
      return s;
    },
    monstera: (x, y, r) => {
      const L = lit(x, y);
      let s = shadow(x - 0.5, y - 0.5, x + 0.62, y + 0.62, 0.7);
      // 2026-11-11 (the user: finer): a cream pot with a lip and two faint rings; each leaf a real monstera's: heart-shaped from its
      // stalk, cut in from the edge in three slits a side (the floor shows through), a vein down each piece between the cuts
      const z = 0.72;
      s += box('#eee6da', x - 0.3, y - 0.3, 0, x + 0.3, y + 0.3, z - 0.1, { t: false, x: '#ddd2c2', hlv: true });
      s += `<path class="ln" stroke="#2b1c12" stroke-opacity=".09" stroke-width="1" d="${[0.2, 0.4].map((zz) => line([[x - 0.3, y + 0.303, zz], [x + 0.303, y + 0.303, zz], [x + 0.303, y - 0.3, zz]])).join(' ')}"/><path class="ln" stroke="#2b1c12" stroke-opacity=".2" stroke-width="1.4" d="${line([[x - 0.3, y + 0.303, z - 0.11], [x + 0.303, y + 0.303, z - 0.11], [x + 0.303, y - 0.3, z - 0.11]])}"/>`;
      s += box('#eee6da', x - 0.33, y - 0.33, z - 0.11, x + 0.33, y + 0.33, z, { t: '#f5efe5', x: '#ddd2c2', hlv: true }) + qZ('#5a3d28', z + 0.002, x - 0.28, x + 0.28, y - 0.28, y + 0.28);
      // one half of a leaf (x ≥ 0; the stalk at 0 0, the tip at 0 -38), mirrored for the other
      const half = 'M-.6 -3 C2 0 6 1.4 10 .2 C13 -.8 15 -3 16 -5.4 L5.4 -4.6 L17 -8 C18.6 -10.6 19.6 -13 19.6 -15 L6 -10.8 L19.6 -17.6 C19.3 -20.6 18.4 -23.2 17 -25.2 L5.6 -18.6 L15.6 -27.6 C12.4 -32.6 6.4 -37 0 -38 L-.6 -38 Z';
      const veins = 'M0 -2 V-36 M0 -3 Q6 -2.6 11 -2 M0 -6.5 L16 -11 M0 -14.5 L15 -20.2 M0 -23 L11 -30';
      const leaf = (tx, ty, rot, k, c) => `<g transform="translate(${tx} ${ty}) rotate(${rot}) scale(${k})"><g ${L(c, 1.6)}><path d="${half}"/><path d="${half}" transform="scale(-1 1)"/></g>
        <g fill="none" stroke="#fff" stroke-opacity=".26" stroke-width=".9" stroke-linecap="round"><path d="${veins}"/><path d="${veins}" transform="scale(-1 1)"/></g>
        <path d="M-.6 -36 C-6 -35 -12 -31 -15 -27" fill="none" stroke="#fff" stroke-opacity=".22" stroke-width="1.2" stroke-linecap="round"/></g>`;
      s += upright(x, y, z, r, `<path d="M0 0 C-4 -20 -16 -30 -24 -40 M0 0 C2 -24 6 -40 8 -58 M0 0 C6 -16 18 -24 26 -30" fill="none" stroke="#3f7a42" stroke-width="2.2" stroke-linecap="round"/>
        <path d="M-.8 -2 C-4.6 -20 -15.6 -29.6 -23 -38.6 M-.6 -4 C1.2 -24 5 -40 7 -56" fill="none" stroke="#fff" stroke-opacity=".2" stroke-width=".7"/>
        ${leaf(-26, -36, -38, 1.05, C.leafDk)}${leaf(26, -26, 42, 1, C.leaf)}${leaf(8, -54, 6, 1.15, C.leaf)}${leaf(-6, -22, -10, 0.8, '#6aa864')}`);
      return s;
    },
    cactus: (x, y, r) => {
      const L = lit(x, y);
      let s = shadow(x - 0.32, y - 0.32, x + 0.4, y + 0.4, 0.7);
      // 2026-11-11 (the user: finer): a terracotta pot with a rolled rim, pebbles on the soil; ribs down the stem and arms, rows of
      // little white spines, the shaded side, a five-petal flower on top
      const z = 0.42;
      s += box(C.pot, x - 0.22, y - 0.22, 0, x + 0.22, y + 0.22, z - 0.09, { t: false, x: '#c2714f', hlv: true });
      s += `<path class="ln" stroke="#2b1c12" stroke-opacity=".22" stroke-width="1.4" d="${line([[x - 0.22, y + 0.223, z - 0.1], [x + 0.223, y + 0.223, z - 0.1], [x + 0.223, y - 0.22, z - 0.1]])}"/>`;
      s += box(C.pot, x - 0.25, y - 0.25, z - 0.1, x + 0.25, y + 0.25, z, { t: '#e2977a', x: '#c97a58', hlv: true }) + qZ('#7a5236', z + 0.002, x - 0.2, x + 0.2, y - 0.2, y + 0.2);
      s += `<g transform="${onZ(z + 0.004)}" ${F('#e8e0d0', 't', [x, y, z])}><ellipse cx="${q2(x - 0.12)}" cy="${q2(y + 0.1)}" rx=".05" ry=".035"/><ellipse cx="${q2(x + 0.13)}" cy="${q2(y - 0.06)}" rx=".04" ry=".03"/><ellipse cx="${q2(x + 0.06)}" cy="${q2(y + 0.14)}" rx=".035" ry=".03"/></g>`;
      const spine = FS('#f6f1de', 'y', [x, y, 1.2]), spines = (pts) => `<path d="${pts.map(([px, py]) => `M${px} ${py} h.01`).join(' ')}" stroke-opacity=".85" stroke-width="1.1" stroke-linecap="round" ${spine}/><path d="${pts.map(([px, py]) => `M${q2(px - 0.9)} ${q2(py - 0.5)} L${px} ${py} L${q2(px + 0.9)} ${q2(py - 0.5)}`).join(' ')}" fill="none" stroke-opacity=".55" stroke-width=".35" ${spine}/>`;
      const rows = []; [-3.6, -0.6, 2.4].forEach((sx, k) => { for (let sy = -41 + k * 2.4; sy < -3; sy += 7) rows.push([sx, sy]); });
      s += upright(x, y, z, r, `<g class="leafy"><rect x="-5.5" y="-46" width="11" height="46" rx="5.5" ${L('#7fae79', 1.2)}/>
        <path d="M5 -22 H10 Q13 -22 13 -26 V-34 Q13 -38 16 -38 Q19 -38 19 -34 V-24 Q19 -16 11 -16 H5 Z" ${L('#77a671', 1, 'x')}/>
        <path d="M-5 -28 H-9 Q-12 -28 -12 -32 V-38 Q-12 -42 -14.5 -42 Q-17 -42 -17 -38 V-30 Q-17 -22 -10 -22 H-5 Z" ${L('#86b47f', 1)}/>
        <path d="M2.4 -45.45 A5.5 5.5 0 0 1 5.5 -40.5 V-5.5 A5.5 5.5 0 0 1 2.4 -.55 Z M17 -37.6 Q19 -37 19 -34 V-24 Q19 -16 11 -16 H8 Q15 -18 16.2 -24 V-34 Q16.2 -36.6 17 -37.6 Z" fill="#2b1c12" fill-opacity=".09"/>
        <path d="M-2.1 -44 V-2 M0.9 -44.5 V-2 M3.9 -43 V-2 M16 -36.5 V-23 M-14.5 -40.5 V-29" stroke="#4f7d4b" stroke-width=".7" stroke-opacity=".55"/>
        <path d="M-4 -40 V-6 M-15.8 -39 V-31" stroke="#fff" stroke-opacity=".28" stroke-width="1" stroke-linecap="round"/>
        ${spines(rows.concat([[17.6, -33], [17.6, -27], [14.6, -30], [-13.2, -37], [-16, -33]]))}
        <g transform="translate(0 -47)">${[0, 72, 144, 216, 288].map((d) => `<ellipse cy="-1.7" rx="1.25" ry="1.9" transform="rotate(${d})" fill="#f08bb0"/>`).join('')}<path d="M-.9 -1.4 L0 -2.6 L.9 -1.4" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width=".4"/><circle r=".95" fill="#f6d36a"/></g></g>`);
      return s;
    },
    bamboo: (x, y, r) => {
      const L = lit(x, y);
      let s = shadow(x - 0.36, y - 0.36, x + 0.46, y + 0.46, 0.7);
      // 2026-11-11 (the user: finer): a glazed pot with a lip and a sheen, pale pebbles on the soil; each cane lit down one side,
      // its joints a dark ring under a pale one; each leaf with a midrib, the lower of a pair a shade darker
      const z = 0.55;
      s += box('#3b3f4f', x - 0.26, y - 0.26, 0, x + 0.26, y + 0.26, z - 0.1, { t: false, x: '#32354a', hlv: true });
      s += `<path class="ln" stroke="#fff" stroke-opacity=".16" stroke-width="2" d="${line([[x - 0.17, y + 0.263, 0.06], [x - 0.17, y + 0.263, z - 0.16]])}"/><path class="ln" stroke="#2b1c12" stroke-opacity=".25" stroke-width="1.4" d="${line([[x - 0.26, y + 0.263, z - 0.11], [x + 0.263, y + 0.263, z - 0.11], [x + 0.263, y - 0.26, z - 0.11]])}"/>`;
      s += box('#444a5c', x - 0.29, y - 0.29, z - 0.11, x + 0.29, y + 0.29, z, { t: '#525a70', x: '#383c4e', hlv: true }) + qZ('#6b5440', z + 0.002, x - 0.24, x + 0.24, y - 0.24, y + 0.24);
      s += `<g transform="${onZ(z + 0.004)}" ${F('#ece6d8', 't', [x, y, z])}>${[[-0.14, 0.08, 0.055], [0.1, 0.13, 0.05], [0.15, -0.1, 0.045], [-0.05, -0.15, 0.04], [0.02, 0.02, 0.035]].map(([dx, dy, rr]) => `<ellipse cx="${q2(x + dx)}" cy="${q2(y + dy)}" rx="${rr}" ry="${q2(rr * 0.75)}"/>`).join('')}</g>`;
      const stalk = (dx, top, c) => {
        let t = `<path d="M${dx} 0 L${dx * 1.6} ${top}" stroke-width="2.6" stroke-linecap="round" ${FS(c, 'y', [x, y, 1.6])}/><path d="M${dx - 0.6} -2 L${q2(dx * 1.6 - 0.6)} ${top + 2}" stroke="#fff" stroke-opacity=".3" stroke-width=".7"/>`;
        for (let zz = -12; zz > top; zz -= 13) { const nx = q2(dx + (dx * 0.6) * (zz / top)); t += `<path d="M${q2(nx - 1.9)} ${zz} h3.8" stroke="#55703f" stroke-width="1.5" stroke-linecap="round"/><path d="M${q2(nx - 1.4)} ${zz - 1.3} h2.8" stroke-opacity=".6" stroke-width=".6" ${FS('#e4f0c8', 'y', [x, y, 1.6])}/>`; }
        return t;
      };
      const leaves = (lx, ly, dir) => `<path d="M${lx} ${ly} q${dir * 9} -5 ${dir * 16} -2 q${-dir * 9} 4 ${-dir * 16} 2 Z" ${L('#6fa55c', 2.2)}/><path d="M${lx} ${ly + 5} q${dir * 8} 1 ${dir * 14} 6 q${-dir * 9} -1 ${-dir * 14} -6 Z" ${L('#5f954f', 2.1)}/>
        <path d="M${lx} ${ly} q${dir * 8} -2.6 ${dir * 15} -2 M${lx} ${ly + 5} q${dir * 7} 2 ${dir * 13} 5.6" fill="none" stroke="#e4f0c8" stroke-opacity=".45" stroke-width=".5"/>`;
      s += upright(x, y, z, r, `<g class="leafy">${stalk(-4, -96, '#8fb36a') + stalk(1, -112, '#9cc077') + stalk(5, -84, '#86ab62') + leaves(-6, -90, -1) + leaves(2, -104, 1) + leaves(8, -76, 1) + leaves(-5, -62, -1) + leaves(3, -50, 1)}</g>`);
      return s;
    },
    floorlamp: (x, y, r) => {
      const L = lit(x, y);
      let s = shadow(x - 0.34, y - 0.34, x + 0.44, y + 0.44, 0.7);
      // 2026-11-11 (the user: finer): a weighted base with a rim and a dome, the pole lit down one side with a collar halfway, a
      // pleated shade with a trim at top and bottom and its top open (warm inside by night), a pull chain with a bead; by day its
      // halo as faint as the room's own lamps'
      s += upright(x, y, 0, r, `<path d="M-14.7 -.8 A14.7 7.35 0 0 0 14.7 -.8 V-2.6 A14.7 7.35 0 0 1 -14.7 -2.6 Z" ${L('#30323f', 0.03)}/><ellipse cy="-2.6" rx="14.7" ry="7.35" ${F('#3a3d4c', 't', [x, y, 0.06])}/>
        <path d="M-5.6 -3.4 Q-5 -7.6 0 -7.8 Q5 -7.6 5.6 -3.4 A5.6 2.4 0 0 1 -5.6 -3.4 Z" ${L('#4a4e60', 0.15)}/><path d="M-11 -4.4 A11.6 5.4 0 0 1 4 -9" fill="none" stroke="#fff" stroke-opacity=".14" stroke-width="1"/><path d="M-3.6 -5.4 Q-2.6 -7 0 -7.2" fill="none" stroke="#fff" stroke-opacity=".3" stroke-width=".8" stroke-linecap="round"/>
        <rect x="-1.4" y="-128" width="2.8" height="121" ${L('#4a4e60', 1.6)}/><path d="M-.6 -126 V-9" stroke="#fff" stroke-opacity=".22" stroke-width=".7"/>
        <rect x="-2.2" y="-66" width="4.4" height="3.6" rx="1" ${L('#5b6074', 1.65)}/><path d="M-1.6 -65.2 h2.4" stroke="#fff" stroke-opacity=".3" stroke-width=".6"/>
        <ellipse cy="-150" rx="32" ry="40" fill="url(#halo)" class="night-only" style="opacity:calc((.55 + .45 * var(--f)) * (1 - .7 * var(--day)))"/>
        <path d="M-16 -128 L-11 -156 H11 L16 -128 Z" style="fill:color-mix(in srgb,#f4ead2 calc(var(--day)*100%),#ffd27a)"/>
        <path d="M-16 -128 L-11 -156 H11 L16 -128 Z" fill="#000" fill-opacity=".05" class="day-only"/>
        <path d="${[1, 2, 3, 4, 5].map((k) => `M${q2(-11 + 22 * k / 6)} -155 L${q2(-16 + 32 * k / 6)} -129`).join(' ')}" stroke="#2b1c12" stroke-opacity=".06" stroke-width=".8"/><path d="M16 -128 L11 -156 H5 L8.6 -128 Z" fill="#2b1c12" fill-opacity=".05"/>
        <ellipse cy="-156" rx="11" ry="2.6" style="fill:color-mix(in srgb,#ddd0b2 calc(var(--day)*100%),#fff1c4)"/><path d="M-11 -156 A11 2.6 0 0 0 11 -156" fill="none" stroke="#c9b48a" stroke-width="1"/>
        <ellipse cy="-128" rx="16" ry="4" style="fill:color-mix(in srgb,#e7dcc2 calc(var(--day)*100%),#fff1c4)"/><path d="M-16 -128 A16 4 0 0 0 16 -128" fill="none" stroke="#c9b48a" stroke-width="1.3"/>
        <path d="M-13 -134 L-9.5 -152" stroke="#fff" stroke-opacity=".5" stroke-width="1.4"/>
        <path d="M6.4 -125 V-113.6" stroke="#a89464" stroke-width=".7" stroke-dasharray="1.1 .5"/><circle cx="6.4" cy="-112.4" r="1.3" ${L('#c9a24e', 2.8)}/>`);
      return s;
    },
    andon: (x, y, r) => {   // 2026-11-11 (the user: finer): the base cut away between its feet, a lattice of thin bars over the paper; by day its pool as faint as the room's own lamps'
      const h = 1.3, paper = 'style="fill:color-mix(in srgb,#f6eedb calc(var(--day)*100%),#ffd98a)"';
      let s = shadow(x - 0.4, y - 0.4, x + 0.5, y + 0.5, 0.7);
      s += `<g class="night-only" style="opacity:calc((.5 + .5 * var(--f)) * (1 - .7 * var(--day)))"><g transform="${onZ(0.01)}"><ellipse cx="${x}" cy="${y}" rx="1.2" ry="1.2" fill="url(#pool)"/></g></g>`;
      s += box(C.walnut, x - 0.3, y - 0.3, 0, x + 0.3, y + 0.3, 0.12, { t: C.oak });
      s += `<path d="${poly([[x - 0.22, y + 0.301, 0], [x + 0.22, y + 0.301, 0], [x + 0.22, y + 0.301, 0.05], [x - 0.22, y + 0.301, 0.05]])} ${poly([[x + 0.301, y - 0.22, 0], [x + 0.301, y + 0.22, 0], [x + 0.301, y + 0.22, 0.05], [x + 0.301, y - 0.22, 0.05]])}" fill="#2b1c12" fill-opacity=".38"/>`;
      s += `<path ${paper} d="${poly([[x - 0.27, y + 0.27, 0.12], [x + 0.27, y + 0.27, 0.12], [x + 0.27, y + 0.27, h], [x - 0.27, y + 0.27, h]])}"/><path ${paper} d="${poly([[x + 0.27, y - 0.27, 0.12], [x + 0.27, y + 0.27, 0.12], [x + 0.27, y + 0.27, h], [x + 0.27, y - 0.27, h]])}"/>`;
      s += `<path d="${poly([[x + 0.27, y - 0.27, 0.12], [x + 0.27, y + 0.27, 0.12], [x + 0.27, y + 0.27, h], [x + 0.27, y - 0.27, h]])}" fill="#000" fill-opacity=".08"/>`;
      s += `<path class="ln" stroke-width="1.6" ${FS(C.walnut, 'y', [x, y, 0.7])} d="${line([[x - 0.3, y + 0.3, 0.12], [x - 0.3, y + 0.3, h + 0.04]])} ${line([[x + 0.3, y + 0.3, 0.12], [x + 0.3, y + 0.3, h + 0.04]])} ${line([[x + 0.3, y - 0.3, 0.12], [x + 0.3, y - 0.3, h + 0.04]])} ${line([[x - 0.3, y + 0.3, 0.7], [x + 0.3, y + 0.3, 0.7], [x + 0.3, y - 0.3, 0.7]])}"/>`;
      s += `<path class="ln" stroke-width=".8" stroke-opacity=".85" ${FS(C.walnut, 'y', [x, y, 0.7])} d="${line([[x, y + 0.272, 0.12], [x, y + 0.272, h]])} ${line([[x + 0.272, y, 0.12], [x + 0.272, y, h]])} ${[0.41, 0.99].map((zz) => line([[x - 0.27, y + 0.272, zz], [x + 0.272, y + 0.272, zz], [x + 0.272, y - 0.27, zz]])).join(' ')}"/>`;
      s += box(C.walnut, x - 0.32, y - 0.32, h, x + 0.32, y + 0.32, h + 0.08, { t: C.oak });
      return s;
    },
    chabudai: (x, y, r) => {   // 2026-11-11 (the user: finer): grain on the top; the teapot's lid seam and sheen, tea in the cup and a glint on it
      const m = (dx, dy) => `${q2(x + dx)} ${q2(y + dy)}`;
      const h = 0.62, top = `<g transform="${onZ(h)}"><circle cx="${x}" cy="${y}" r=".76" ${F(C.oakTop, 't', [x, y, h])}/><circle cx="${x}" cy="${y}" r=".62" fill="none" stroke="#fff" stroke-opacity=".18" stroke-width=".03"/><path d="M${m(-0.56, 0.26)} Q${m(-0.12, -0.12)} ${m(0.5, 0.08)} M${m(-0.42, 0.48)} Q${m(0.02, 0.22)} ${m(0.44, 0.42)} M${m(-0.48, -0.3)} Q${m(-0.04, -0.52)} ${m(0.36, -0.42)}" fill="none" stroke="#8a6a4a" stroke-opacity=".14" stroke-width=".02"/></g>`;
      let s = shadow(x - 0.8, y - 0.8, x + 0.9, y + 0.9, 0.75);
      [[-1, 0], [0, -1], [1, 0], [0, 1]].forEach(([a, b]) => { s += box(C.oakDk, x + a * 0.5 - 0.05, y + b * 0.5 - 0.05, 0, x + a * 0.5 + 0.05, y + b * 0.5 + 0.05, h - 0.06, { hl: false }); });
      s += `<path ${F(C.oak, 'y', [x, y + 0.7, h - 0.05])} d="M${pt(x - 0.76 * Math.SQRT1_2, y + 0.76 * Math.SQRT1_2, h)} A${(0.76 * S * Math.SQRT2).toFixed(1)} ${(0.76 * S * Math.SQRT1_2).toFixed(1)} 0 0 0 ${pt(x + 0.76 * Math.SQRT1_2, y - 0.76 * Math.SQRT1_2, h)} L${pt(x + 0.76 * Math.SQRT1_2, y - 0.76 * Math.SQRT1_2, h - 0.08)} A${(0.76 * S * Math.SQRT2).toFixed(1)} ${(0.76 * S * Math.SQRT1_2).toFixed(1)} 0 0 1 ${pt(x - 0.76 * Math.SQRT1_2, y + 0.76 * Math.SQRT1_2, h - 0.08)} Z"/>`;
      s += top;
      s += upright(x - 0.15, y + 0.1, h, r, `<ellipse rx="9" ry="3" fill="#2b1c12" fill-opacity=".15"/><path ${F('#6f8a9c', 'y', [x, y, h + 0.3])} d="M-8 -1 C-10 -8 -8 -14 0 -15 C8 -14 10 -8 8 -1 Z"/><path d="M8 -9 Q14 -10 14 -15" fill="none" stroke="#5c7585" stroke-width="2"/><ellipse cy="-15" rx="5" ry="1.6" fill="#55707f"/><circle cy="-17" r="1.6" fill="#55707f"/><path d="M-6 -12.6 Q0 -10.6 6 -12.6" fill="none" stroke="#2b1c12" stroke-opacity=".2" stroke-width=".7"/><path d="M-6.4 -3 C-7.4 -7 -5.6 -10.6 -2 -11.6" fill="none" stroke="#fff" stroke-opacity=".3" stroke-width="1.2" stroke-linecap="round"/>`);
      s += upright(x + 0.3, y - 0.12, h, r, `<path ${F('#e9e1d2', 'y', [x, y, h + 0.2])} d="M-4 0 L-4.6 -7 H4.6 L4 0 Z"/><ellipse cy="-7" rx="4.6" ry="1.5" ${F('#e9e1d2', 't', [x, y, h + 0.2])}/><ellipse cy="-6.8" rx="3.8" ry="1.1" fill="#9bbf7a"/><path d="M-3 -1.4 L-3.4 -5.6" stroke="#fff" stroke-opacity=".45" stroke-width=".8" stroke-linecap="round"/>`);
      return s;
    },
    zabuton: (x, y, r) => {   // 2026-11-11 (the user: finer): a plump cushion: the seam round its sides, the top rolling over at the edges and pulled in to the tuft in the middle, a tassel there and at the corners
      const h = 0.2, c = r ? '#c8553f' : '#4f6aa8', i = 0.46, a = [x, y, h], gold = (z) => F('#e6c36a', 'y', [x, y + i, z]);
      let s = shadow(x - 0.52, y - 0.52, x + 0.62, y + 0.62, 0.6);
      s += box(c, x - i, y - i, 0, x + i, y + i, h, { t: c, hlv: true });
      s += `<path class="ln" stroke="#2b1c12" stroke-opacity=".2" stroke-width="1" d="${line([[x - i + 0.04, y + i + 0.004, h * 0.48], [x + i + 0.004, y + i + 0.004, h * 0.48], [x + i + 0.004, y - i + 0.04, h * 0.48]])}"/>`;
      const m = (dx, dy) => `${q2(x + dx)} ${q2(y + dy)}`;
      s += `<g transform="${onZ(h + 0.004)}"><rect x="${q2(x - 0.43)}" y="${q2(y - 0.43)}" width=".86" height=".86" rx=".12" fill="none" stroke="#2b1c12" stroke-opacity=".1" stroke-width=".05"/>
        <rect x="${q2(x - 0.36)}" y="${q2(y - 0.36)}" width=".72" height=".72" rx=".24" fill="#fff" fill-opacity=".09"/><path d="M${q2(x - 0.4)} ${q2(y + 0.3)} Q${m(-0.4, -0.4)} ${m(0.3, -0.4)}" fill="none" stroke="#fff" stroke-opacity=".14" stroke-width=".04" stroke-linecap="round"/>
        <path d="M${m(-0.34, -0.34)} L${m(-0.06, -0.06)} M${m(0.34, -0.34)} L${m(0.06, -0.06)} M${m(-0.34, 0.34)} L${m(-0.06, 0.06)} M${m(0.34, 0.34)} L${m(0.06, 0.06)}" stroke="#2b1c12" stroke-opacity=".1" stroke-width=".035" stroke-linecap="round"/>
        <circle cx="${x}" cy="${y}" r=".09" fill="#2b1c12" fill-opacity=".14"/><path d="M${m(-0.08, -0.05)} L${m(0.08, 0.05)} M${m(-0.08, 0.05)} L${m(0.08, -0.05)} M${m(0, -0.09)} V${q2(y + 0.09)}" stroke-width=".03" stroke-linecap="round" ${FS('#e6c36a', 't', a)}/><circle cx="${x}" cy="${y}" r=".035" ${F('#f2d27a', 't', a)}/></g>`;
      s += [[x - i, y + i], [x + i, y + i], [x + i, y - i]].map(([cx, cy]) => bb(cx, cy, h * 0.6, `<path d="M-.9 0 Q0 -1.6 .9 0 L1.3 4.2 H-1.3 Z" ${gold(h * 0.4)}/><path d="M-.6 1.6 V4 M.6 1.6 V4" stroke="#2b1c12" stroke-opacity=".2" stroke-width=".4"/>`)).join('');
      return s;
    },
    daruma: (x, y, r) => {   // 2026-11-11 (the user: finer): the shaded side, a nose, a moustache and the beard down the cheeks
      const L = lit(x, y), both = Object.values(state.stageTests || {}).some((a) => Array.isArray(a) && a.some((t) => t && t.passed));
      const eye = (cx, on) => `<circle cx="${cx}" cy="-37" r="4.4" fill="#fff"/>${on ? `<circle cx="${cx}" cy="-37" r="2.8" fill="#1f1d24"/>` : ''}`;
      let s = shadow(x - 0.42, y - 0.42, x + 0.5, y + 0.5, 0.7);
      s += upright(x, y, 0, r, `<g transform="scale(.78)"><ellipse rx="17" ry="5" fill="#2b1c12" fill-opacity=".14"/>
        <path ${L('#d4443a', 0.7)} d="M0 -58 C16 -58 24 -44 24 -28 C24 -10 14 0 0 0 C-14 0 -24 -10 -24 -28 C-24 -44 -16 -58 0 -58 Z"/>
        <path d="M11 -55 C19 -51 24 -42 24 -28 C24 -10 14 0 0 0 C10 -3 18 -13 18.6 -28 C19 -40 16 -50 11 -55 Z" fill="#2b1c12" fill-opacity=".1"/>
        <path d="M-9 -54 C-16 -48 -20 -38 -19 -26" fill="none" stroke="#fff" stroke-opacity=".3" stroke-width="2.4" stroke-linecap="round"/>
        <path d="M0 -50 C10 -50 14 -42 14 -34 C14 -26 8 -22 0 -22 C-8 -22 -14 -26 -14 -34 C-14 -42 -10 -50 0 -50 Z" fill="#fbf3e2"/>
        ${eye(-6, true)}${eye(6, both)}
        <path d="M-7 -28 Q0 -24 7 -28 M-11 -44 q3 -2 6 0 M5 -44 q3 -2 6 0" fill="none" stroke="#1f1d24" stroke-width="1.4" stroke-linecap="round"/>
        <path d="M-12.4 -34 q-.6 5 2.6 9 M12.4 -34 q.6 5 -2.6 9 M-5.6 -31 q2.8 1.2 5.6 -.4 q2.8 1.6 5.6 .4" fill="none" stroke="#1f1d24" stroke-width="1.1" stroke-linecap="round"/><path d="M-1.2 -33.4 q1.2 1 2.4 0" fill="none" stroke="#1f1d24" stroke-opacity=".6" stroke-width=".9" stroke-linecap="round"/>
        <path d="M-12 -14 Q0 -18 12 -14" fill="none" stroke="#e6c25a" stroke-width="2"/><text y="-6" font-size="7" font-weight="700" text-anchor="middle" fill="#f6dc8a" font-family="'Hiragino Mincho ProN', serif">合格</text></g>`);
      return s;
    },
    manekineko: (x, y, r) => {   // 2026-11-11 (the user: finer): the shaded side, whiskers, the bell's slot, a glint on the koban
      const L = lit(x, y);
      let s = shadow(x - 0.32, y - 0.32, x + 0.4, y + 0.4, 0.7);
      s += upright(x, y, 0, r, `<ellipse rx="13" ry="4" fill="#2b1c12" fill-opacity=".14"/>
        <path ${L('#fbf7ef', 0.6)} d="M-12 0 C-14 -10 -12 -22 -8 -27 H8 C12 -22 14 -10 12 0 Z"/>
        <path d="M-12 -32 L-10 -44 L-4 -38 Z M12 -32 L10 -44 L4 -38 Z" ${L('#fbf7ef', 1)}/><path d="M-10.5 -40 L-9.8 -42 L-7 -39 Z M10.5 -40 L9.8 -42 L7 -39 Z" fill="#f2a3a0"/>
        <ellipse cy="-31" rx="13" ry="10" ${L('#fbf7ef', 1)}/>
        <path d="M11 -27 Q16 -32 15 -41 Q14 -45 11 -44 Q9 -42 10 -38 Q10 -33 7 -28 Z" ${L('#fbf7ef', 1.1, 'x')}/><circle cx="12.4" cy="-44" r="2.6" fill="#f2a3a0"/>
        <path d="M-6 -32 q2 -1.6 4 0 M2 -32 q2 -1.6 4 0" fill="none" stroke="#2a2730" stroke-width="1.2" stroke-linecap="round"/><path d="M-1 -28 l1 1 l1 -1" fill="none" stroke="#2a2730" stroke-width=".9"/>
        <path d="M-7 -24 Q0 -21 7 -24" fill="none" stroke="#d0453c" stroke-width="2.4"/><circle cy="-21" r="2.4" fill="#e6c25a"/>
        <ellipse cx="-3" cy="-11" rx="6" ry="7.5" fill="#e6c25a" stroke="#b98a28" stroke-width=".8"/><path d="M-6 -15 H0 M-6.4 -12 H0.4 M-6.4 -9 H0.4 M-6 -6 H0" stroke="#b98a28" stroke-width=".6"/>
        <circle cx="-9" cy="-35" r="2.2" fill="#e88a3a" fill-opacity=".85"/><circle cx="7" cy="-38" r="1.6" fill="#3a3640" fill-opacity=".75"/>
        <path d="M8 -26 C11.4 -21 13 -11 12 0 H7.6 C9 -9 9.2 -19 6.4 -25.4 Z" fill="#2b1c12" fill-opacity=".07"/>
        <path d="M-7 -29.4 L-12.4 -30.6 M-7 -28 L-12.4 -27.6 M7 -29.4 L12 -30.4 M7 -28 L12 -27.6" stroke="#2a2730" stroke-opacity=".35" stroke-width=".5" stroke-linecap="round"/>
        <path d="M-1.4 -20.6 H1.4 M0 -20.6 V-19" stroke="#8a6420" stroke-width=".6" stroke-linecap="round"/><path d="M-7 -14 Q-6.8 -16.6 -4.6 -17.4" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width=".9" stroke-linecap="round"/>`);
      return s;
    },
    guitar: (x, y, r) => {
      const L = lit(x, y);
      let s = shadow(x - 0.36, y - 0.32, x + 0.46, y + 0.4, 0.7);
      // 2026-11-11 (the user: finer): rubber feet on the stand; frets and a nut on the neck, tuning pegs on the head, a cream
      // binding round the body, a rosette round the sound hole, a pickguard, the bridge's saddle
      const body = 'M0 -48 C10 -48 13 -40 10 -33 C16 -29 18 -20 14 -12 C10 -4 4 -2 0 -2 C-4 -2 -10 -4 -14 -12 C-18 -20 -16 -29 -10 -33 C-13 -40 -10 -48 0 -48 Z';
      const frets = [-88.5, -83.5, -79, -75, -71.4, -68, -65, -62.2, -59.6, -57.2, -55, -53, -51, -49.2];
      s += upright(x, y, 0, r, `<path d="M-10 0 L-3 -24 M10 0 L3 -24 M-8 -8 H8" fill="none" stroke="#3a3640" stroke-width="2" stroke-linecap="round"/><path d="M-11.2 .2 h2.6 M8.6 .2 h2.6" stroke="#2a2730" stroke-width="1.6" stroke-linecap="round"/>
        <g transform="rotate(-8)"><rect x="-2.6" y="-92" width="5.2" height="52" rx="1.2" ${L('#6e4a33', 1.8)}/><path d="M-4 -104 H4 L3 -91 H-3 Z" ${L('#4f3627', 2.4)}/>
        <path d="${frets.map((f) => `M-2.4 ${f} H2.4`).join(' ')}" stroke="#d9c9a8" stroke-opacity=".7" stroke-width=".45"/><rect x="-2.8" y="-92.4" width="5.6" height="1.1" rx=".4" ${L('#efe6d2', 2.3)}/>
        <g ${L('#d8d2c4', 2.6)}>${[-101.4, -97.8, -94.2].map((py) => `<circle cx="-5.2" cy="${py}" r="1"/><circle cx="5.1" cy="${py}" r="1"/>`).join('')}</g><path d="M-1.6 -102.6 V-93 M1.6 -102.6 V-93" stroke="#2b1c12" stroke-opacity=".3" stroke-width=".5"/>
        <path ${L('#d79a5a', 1)} d="${body}"/><path d="M8 -34 C14 -29 16 -20 12.6 -13 C9.6 -6.6 4.4 -3.6 0 -3.6" fill="none" stroke="#2b1c12" stroke-opacity=".12" stroke-width="2.6" stroke-linecap="round"/>
        <path d="${body}" fill="none" stroke-width=".8" ${FS('#f3e3c4', 'y', [x, y, 0.8])}/>
        <path d="M3.6 -22.6 C7.6 -23 9.6 -19.6 8.6 -16.4 C7.4 -13.6 4.2 -14.4 3 -17.4 Z" fill="#4f3627" fill-opacity=".55"/>
        <circle cy="-26" r="6.2" fill="none" stroke="#4f3627" stroke-opacity=".55" stroke-width=".8"/><circle cy="-26" r="5.4" fill="none" stroke-width=".5" ${FS('#f3e3c4', 'y', [x, y, 0.8])}/><circle cy="-26" r="4.6" fill="#3a2a1f"/>
        <rect x="-6" y="-12" width="12" height="2.6" rx="1" fill="#4f3627"/><path d="M-4 -11.2 H4" stroke-width=".6" ${FS('#efe6d2', 'y', [x, y, 0.4])}/>
        <path d="M-1.2 -100 V-11 M1.2 -100 V-11" stroke="#f3eee2" stroke-width=".5" stroke-opacity=".8"/>
        <path d="M-9 -40 C-12 -33 -12 -26 -9 -20" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="1.6" stroke-linecap="round"/><path d="M-1.6 -90 V-44" stroke="#fff" stroke-opacity=".14" stroke-width=".6"/></g>`);
      return s;
    },
    // ---- Christmas (2026-11-14, the user) ----
    // 聖誕樹: a little fir in a red tub with a gold band, four tiers with scalloped hems lit on the left and shaded on the right, a
    // string of lights looping round it (glass by day, glowing by night), baubles, a gold star on top (its halo by night)
    xmastree: (x, y, r) => {
      const L = lit(x, y), G = '#3f7a3a';
      const tier = (b, t, w) => `<path ${L(G, (-b + 20) / 40)} d="M${-w} ${b} Q${q2(-w * 0.62)} ${b + 4} ${q2(-w * 0.45)} ${b} Q${q2(-w * 0.22)} ${b + 4} 0 ${b} Q${q2(w * 0.22)} ${b + 4} ${q2(w * 0.45)} ${b} Q${q2(w * 0.62)} ${b + 4} ${w} ${b} L3 ${t} H-3 Z"/><path d="M${q2(w * 0.12)} ${t + 2} L${q2(w * 0.86)} ${b - 1} Q${q2(w * 0.62)} ${b + 3.4} ${q2(w * 0.45)} ${b} Q${q2(w * 0.3)} ${b + 3} ${q2(w * 0.15)} ${b + 1} Z" fill="#2b1c12" fill-opacity=".13"/><path d="M${q2(-w * 0.3)} ${b - 3} L-2 ${t + 4}" stroke="#fff" stroke-opacity=".14" stroke-width="1.4" stroke-linecap="round"/>`;
      const bulb = (bx, by, c) => `<circle cx="${bx}" cy="${by}" r="5" fill="url(#halo)" class="night-only" style="opacity:calc(.5 + .5 * var(--f))"/><circle cx="${bx}" cy="${by}" r="1.8" style="fill:color-mix(in srgb,${c} calc(var(--day)*60%),#fff7d6)"/>`;
      const ball = (bx, by, c, rr = 3) => `<circle cx="${bx}" cy="${by}" r="${rr}" ${L(c, (-by) / 40)}/><circle cx="${q2(bx - rr * 0.35)}" cy="${q2(by - rr * 0.35)}" r="${q2(rr * 0.32)}" fill="#fff" fill-opacity=".6"/>`;
      const lights = [[-22, -24, '#ffd36a'], [-8, -27, '#ff7a6a'], [8, -30, '#8fd0ff'], [21, -34, '#ffd36a'], [-17, -56, '#8fd0ff'], [-3, -59, '#ffd36a'], [11, -62, '#ff7a6a'], [-12, -86, '#ff7a6a'], [1, -89, '#8fd0ff'], [10, -93, '#ffd36a'], [-6, -114, '#ffd36a'], [4, -117, '#ff7a6a']];
      let s = shadow(x - 0.62, y - 0.62, x + 0.74, y + 0.74, 0.75);
      s += `<g class="night-only" style="opacity:calc((.5 + .5 * var(--f)) * (1 - .7 * var(--day)))"><g transform="${onZ(0.01)}"><ellipse cx="${x}" cy="${y}" rx="1.3" ry="1.3" fill="url(#pool)"/></g></g>`;
      s += upright(x, y, 0, r, `<ellipse rx="16" ry="5" fill="#2b1c12" fill-opacity=".16"/><path ${L('#c8453d', 0.2)} d="M-11 0 L-13 -15 H13 L11 0 Z"/><path d="M5 -15 H13 L11 0 H5.6 Z" fill="#2b1c12" fill-opacity=".14"/><rect x="-13.4" y="-11" width="26.8" height="3.4" ${L('#e6c25a', 0.25)}/><rect x="-14" y="-17" width="28" height="3" rx="1" ${L('#a8352e', 0.4)}/>
        <rect x="-2.6" y="-22" width="5.2" height="6" ${L('#6e4a33', 0.5)}/>
        ${tier(-18, -64, 30)}${tier(-50, -96, 25)}${tier(-82, -122, 19)}${tier(-110, -142, 12)}
        <path d="M-24 -23 Q0 -32 24 -36 M-19 -55 Q-2 -61 15 -64 M-14 -85 Q0 -90 12 -95 M-8 -113 Q0 -117 6 -119" fill="none" stroke="#2b2420" stroke-opacity=".45" stroke-width=".6"/>
        ${lights.map(([bx, by, c]) => bulb(bx, by, c)).join('')}
        ${ball(-14, -30, '#d0453c')}${ball(14, -42, '#e6c25a')}${ball(-2, -40, '#5a7fc8', 2.6)}${ball(-10, -64, '#e6c25a', 2.8)}${ball(10, -74, '#d0453c', 2.8)}${ball(-6, -98, '#5a7fc8', 2.4)}${ball(7, -104, '#d0453c', 2.4)}${ball(-2, -126, '#e6c25a', 2.2)}
        <circle cx="0" cy="-147" r="11" fill="url(#halo)" class="night-only" style="opacity:calc(.6 + .4 * var(--f))"/><path d="M0 -156 L2.6 -150 L9 -149.6 L4 -145.4 L5.6 -139 L0 -142.6 L-5.6 -139 L-4 -145.4 L-9 -149.6 L-2.6 -150 Z" style="fill:color-mix(in srgb,#e6c25a calc(var(--day)*100%),#ffe680)"/><path d="M0 -156 L2.6 -150 L0 -147 Z M-9 -149.6 L-2.6 -150 L0 -147 Z" fill="#fff" fill-opacity=".35"/>`);
      return s;
    },
    // 禮物堆: four presents (in the room, seen at its angle): a big red one with a gold ribbon round it, a green one on top of it, a
    // blue one and a small gold one in front, a bow on each; turned, the pile the other way round
    giftpile: (x, y, r) => {
      const P = (dx, dy) => (r ? [x + dy, y + dx] : [x + dx, y + dy]);
      const gift = (c, rb, dx0, dy0, z0, dx1, dy1, z1) => {
        const [ax, ay] = P(dx0, dy0), [bx, by] = P(dx1, dy1), x0 = Math.min(ax, bx), x1 = Math.max(ax, bx), y0 = Math.min(ay, by), y1 = Math.max(ay, by), mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
        return box(c, x0, y0, z0, x1, y1, z1, { hlv: true }) + box(rb, mx - 0.035, y0 - 0.004, z0, mx + 0.035, y1 + 0.004, z1 + 0.004, { x: false, hl: false })
          + box(rb, x0 - 0.004, my - 0.035, z0, x1 + 0.004, my + 0.035, z1 + 0.004, { y: false, hl: false })
          + bb(mx, my, z1, `<path d="M0 0 C-7 -6 -9 -1 -6 1 C-4 2 -2 1 0 0 C2 1 4 2 6 1 C9 -1 7 -6 0 0 Z" ${F(rb, 't', [mx, my, z1 + 0.1])}/><circle r="1.6" ${F(rb, 't', [mx, my, z1 + 0.1])}/>`);
      };
      let s = shadow(x - 0.6, y - 0.6, x + 0.7, y + 0.7, 0.7);
      return s + gift('#c8453d', '#e6c25a', -0.52, -0.5, 0, 0.14, 0.16, 0.52) + gift('#3f8a52', '#f4efe6', -0.4, -0.38, 0.52, -0.04, -0.02, 0.84)
        + gift('#e6c25a', '#c8453d', -0.52, 0.22, 0, -0.18, 0.52, 0.24) + gift('#5a7fc8', '#f4efe6', 0.12, -0.1, 0, 0.52, 0.46, 0.36);
    },
    // 聖誕紅: a pot wrapped in gold foil (its folds), dark leaves round the rim, red bracts spread like a star in two rings with
    // yellow buds in the middle, lit on the left
    poinsettia: (x, y, r) => {
      const L = lit(x, y), bract = (a, len, c, z) => `<path transform="translate(0 -36) rotate(${a}) scale(1 ${0.62})" ${L(c, z)} d="M0 0 C-4.6 -5 -4.6 -${len - 5} 0 -${len} C4.6 -${len - 5} 4.6 -5 0 0 Z"/>`;
      let s = shadow(x - 0.34, y - 0.34, x + 0.44, y + 0.44, 0.7);
      s += upright(x, y, 0, r, `<ellipse rx="12" ry="4" fill="#2b1c12" fill-opacity=".15"/><path ${L('#d9a43a', 0.25)} d="M-9 0 L-12 -19 Q-6 -22 0 -19 Q6 -22 12 -19 L9 0 Z"/><path d="M-6 -20 L-5 -1 M2 -20 L1.6 -1 M7 -20 L5.6 -1" stroke="#8a6420" stroke-opacity=".35" stroke-width=".8"/><path d="M4 -19.6 Q8 -21.4 12 -19 L9 0 H5 Z" fill="#2b1c12" fill-opacity=".12"/><path d="M-10.6 -16 L-8.6 -2" stroke="#fff" stroke-opacity=".4" stroke-width="1.2" stroke-linecap="round"/>
        ${[-160, -120, -60, -20, 30, 150].map((a) => `<path transform="translate(0 -24) rotate(${a})" ${L('#2f5f2e', 0.7)} d="M0 0 C-4 -4 -4 -12 0 -15 C4 -12 4 -4 0 0 Z"/>`).join('')}
        ${[-90, -18, 54, 126, 198].map((a) => bract(a, 20, '#c8302f', 0.9)).join('')}${[-54, 18, 90, 162, 234].map((a) => bract(a, 15, '#e0453c', 1)).join('')}
        <g fill="#e6c25a"><circle cx="-1.6" cy="-36.6" r="1.4"/><circle cx="1.8" cy="-36" r="1.4"/><circle cx="0" cy="-34.4" r="1.4"/></g><path d="M-10 -40 Q-6 -44 -2 -45" fill="none" stroke="#fff" stroke-opacity=".3" stroke-width="1" stroke-linecap="round"/>`);
      return s;
    },
    pumpkin: (x, y, r) => {   // 南瓜燈 (Halloween): a carved pumpkin, lit from inside by night (2026-11-11, the user: finer: a sheen down its left, the stem's cut end; by day its pool as faint as the room's own lamps')
      const L = lit(x, y), carve = 'style="fill:color-mix(in srgb,#5a2e12 calc(var(--day)*100%),#ffd36a)"';
      let s = shadow(x - 0.36, y - 0.36, x + 0.44, y + 0.44, 0.7);
      s += `<g class="night-only" style="opacity:calc((.5 + .5 * var(--f)) * (1 - .7 * var(--day)))"><g transform="${onZ(0.01)}"><ellipse cx="${x}" cy="${y}" rx="1" ry="1" fill="url(#pool)"/></g></g>`;
      s += upright(x, y, 0, r, `<ellipse rx="15" ry="4" fill="#2b1c12" fill-opacity=".14"/><path ${L('#e8873a', 0.5)} d="M0 -1 C-11 -1 -18 -7 -18 -16 C-18 -25 -11 -31 0 -31 C11 -31 18 -25 18 -16 C18 -7 11 -1 0 -1 Z"/>
        <path d="M-7 -30 C-11 -23 -11 -9 -7 -2 M7 -30 C11 -23 11 -9 7 -2" fill="none" stroke="#c4621f" stroke-width="1.3" stroke-opacity=".7"/><path ${L('#5f7a3a', 1.1)} d="M-1.8 -30 Q-2.2 -36 1.4 -38.4 L3.4 -36.6 Q1.2 -34 1.8 -30 Z"/>
        <path d="M-14 -23 C-16 -18 -16 -12 -13 -7" fill="none" stroke="#fff" stroke-opacity=".28" stroke-width="1.6" stroke-linecap="round"/><path d="M12 -27 C17 -22 17 -10 11 -4.4 C15 -9 15.4 -21 12 -27 Z" fill="#2b1c12" fill-opacity=".1"/><ellipse cx="2.4" cy="-37.6" rx="1.1" ry=".6" transform="rotate(-40 2.4 -37.6)" fill="#b9c48a"/>
        <path ${carve} d="M-9 -20 L-4.6 -20 L-6.8 -24.4 Z M4.6 -20 L9 -20 L6.8 -24.4 Z M-10 -12 Q0 -6 10 -12 L7.6 -12.4 L6 -10.2 L4 -12 L2 -10 L0 -12 L-2 -10 L-4 -12 L-6 -10.2 L-7.6 -12.4 Z"/>`);
      return s;
    },
    rushmat: (x, y) => {   // 2026-11-11 (the user: finer): a coil of rush: its rings, a darker woven band, the stitches binding ring to ring (staggered), a bound rim with a pale lip, a knot in the middle
      let rings = '', st = '';
      for (let k = 0.86, n = 0; k > 0.1; k -= 0.12, n++) {
        rings += `<circle cx="${x}" cy="${y}" r="${q2(k)}" fill="none" stroke="#9c7a4a" stroke-opacity=".32" stroke-width=".022"/>`;
        const m = Math.round(k * 16);
        for (let i = 0; i < m; i++) { const t = (i + (n % 2) * 0.5) / m * 2 * Math.PI, c = Math.cos(t), s2 = Math.sin(t); st += `M${q2(x + c * (k - 0.1))} ${q2(y + s2 * (k - 0.1))} L${q2(x + c * (k - 0.02))} ${q2(y + s2 * (k - 0.02))}`; }
      }
      return `<g transform="${onZ(0.012)}"><circle cx="${q2(x + 0.06)}" cy="${q2(y + 0.06)}" r="1.02" fill="#2b1c12" fill-opacity=".1"/><circle cx="${x}" cy="${y}" r="1" ${F('#d8bf8c', 't', [x, y, 0])}/>
        <circle cx="${x}" cy="${y}" r=".68" fill="none" stroke="#8a6a3a" stroke-opacity=".16" stroke-width=".1"/><circle cx="${x}" cy="${y}" r=".32" fill="none" stroke="#8a6a3a" stroke-opacity=".12" stroke-width=".08"/>${rings}
        <path d="${st}" stroke="#8c6a3c" stroke-opacity=".3" stroke-width=".022" stroke-linecap="round"/>
        <circle cx="${x}" cy="${y}" r=".97" fill="none" stroke-width=".06" ${FS('#a9875a', 't', [x, y, 0])}/><circle cx="${x}" cy="${y}" r=".93" fill="none" stroke="#fff" stroke-opacity=".22" stroke-width=".015"/>
        <circle cx="${x}" cy="${y}" r=".06" ${F('#b8945e', 't', [x, y, 0])}/><circle cx="${q2(x - 0.015)}" cy="${q2(y - 0.015)}" r=".025" fill="#fff" fill-opacity=".3"/></g>`;
    },
    rug: (x, y, r, it) => {
      // 2026-11-11 (the user: finer): white fringe on its short ends (inside its footprint), double-ringed waves, a dark bound edge,
      // a plum-blossom crest in the middle
      const [W, D] = r ? [it.fp[1], it.fp[0]] : it.fp, fx = W >= D ? 0.08 : 0, fy = W >= D ? 0 : 0.08, w = q2(W - 2 * fx), d = q2(D - 2 * fy), x0 = q2(x - w / 2), y0 = q2(y - d / 2);
      let waves = '', fr = '';
      for (let i = 0; i < Math.floor((w - 0.5) / 0.32); i++) for (const yy of [y0 + 0.22, q2(y0 + d - 0.22)]) waves += `M${q2(x0 + 0.25 + i * 0.32)} ${q2(yy + 0.08)} a.16 .16 0 0 1 .32 0 M${q2(x0 + 0.32 + i * 0.32)} ${q2(yy + 0.08)} a.09 .09 0 0 1 .18 0 `;
      if (fx) for (let v = y0 + 0.06; v < y0 + d - 0.04; v += 0.06) fr += `M${q2(x0 - fx)} ${q2(v)} H${x0} M${q2(x0 + w)} ${q2(v)} H${q2(x0 + w + fx)} `;
      else for (let u = x0 + 0.06; u < x0 + w - 0.04; u += 0.06) fr += `M${q2(u)} ${q2(y0 - fy)} V${y0} M${q2(u)} ${q2(y0 + d)} V${q2(y0 + d + fy)} `;
      const crest = [0, 72, 144, 216, 288].map((a) => `<circle cx="${q2(x + 0.11 * Math.sin(a * Math.PI / 180))}" cy="${q2(y - 0.11 * Math.cos(a * Math.PI / 180))}" r=".065"/>`).join('');
      return `<g transform="${onZ(0.012)}"><rect x="${q2(x0 + 0.06)}" y="${q2(y0 + 0.06)}" width="${w}" height="${d}" rx=".08" fill="#2b1c12" fill-opacity=".1"/>
        <path d="${fr}" stroke-width=".022" stroke-linecap="round" ${FS('#efe9dc', 't', [x, y, 0])}/><rect x="${x0}" y="${y0}" width="${w}" height="${d}" rx=".08" ${F('#3f5f94', 't', [x, y, 0])}/>
        <rect x="${q2(x0 + 0.015)}" y="${q2(y0 + 0.015)}" width="${q2(w - 0.03)}" height="${q2(d - 0.03)}" rx=".07" fill="none" stroke="#2b1c12" stroke-opacity=".2" stroke-width=".03"/>
        <rect x="${q2(x0 + 0.12)}" y="${q2(y0 + 0.12)}" width="${q2(w - 0.24)}" height="${q2(d - 0.24)}" rx=".05" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width=".035"/><path d="${waves}" fill="none" stroke="#fff" stroke-opacity=".6" stroke-width=".03"/>
        <rect x="${q2(x0 + 0.5)}" y="${q2(y0 + 0.5)}" width="${q2(w - 1)}" height="${q2(d - 1)}" rx=".04" fill="#fff" fill-opacity=".07"/>
        <g fill="#fff" fill-opacity=".42">${crest}<circle cx="${x}" cy="${y}" r=".035"/></g><circle cx="${x}" cy="${y}" r=".2" fill="none" stroke="#fff" stroke-opacity=".3" stroke-width=".022"/></g>`;
    },
    tatami: (x, y, r, it) => {   // 2026-11-11 (the user: finer): a pattern woven along each border, the rush's two-tone rows, the second mat catching the light differently, its edge rolled
      const [w, d] = r ? [it.fp[1], it.fp[0]] : it.fp, x0 = q2(x - w / 2), y0 = q2(y - d / 2), half = q2(w / 2);
      const heri = (hx) => `<rect x="${hx}" y="${y0}" width=".07" height="${d}" fill="#3f4a3a"/><path d="M${q2(hx + 0.035)} ${q2(y0 + 0.04)} V${q2(y0 + d - 0.04)}" stroke="#e8e2c8" stroke-opacity=".3" stroke-width=".022" stroke-dasharray=".03 .05"/>`;
      const mat = (mx, k) => `<rect x="${mx}" y="${y0}" width="${half}" height="${d}" ${F('#cdbf86', 't', [x, y, 0])}/><path d="${Array.from({ length: Math.floor(d / 0.1) }, (_, i) => `M${q2(mx + 0.08)} ${q2(y0 + 0.05 + i * 0.1)} H${q2(mx + half - 0.08)}`).join(' ')}" stroke="#9c8f52" stroke-opacity=".28" stroke-width=".015"/>
        <path d="${Array.from({ length: Math.floor(d / 0.2) }, (_, i) => `M${q2(mx + 0.08)} ${q2(y0 + 0.1 + i * 0.2)} H${q2(mx + half - 0.08)}`).join(' ')}" stroke="#fff" stroke-opacity=".1" stroke-width=".02"/>${k ? `<rect x="${mx}" y="${y0}" width="${half}" height="${d}" fill="#fff" fill-opacity=".07"/>` : ''}
        <path d="M${q2(mx + 0.07)} ${q2(y0 + d - 0.012)} H${q2(mx + half - 0.07)}" stroke="#2b1c12" stroke-opacity=".12" stroke-width=".025"/>${heri(mx)}${heri(q2(mx + half - 0.07))}`;
      return `<g transform="${onZ(0.014)}"><rect x="${q2(x0 + 0.06)}" y="${q2(y0 + 0.06)}" width="${w}" height="${d}" fill="#2b1c12" fill-opacity=".12"/>${mat(x0, 0)}${mat(q2(x0 + half), 1)}</g>`;
    }
  };
  const crate = (x, y, it, r) => { const [w, d] = r ? [it.fp[1], it.fp[0]] : it.fp; return shadow(x - w / 2 - 0.05, y - d / 2 - 0.05, x + w / 2 + 0.15, y + d / 2 + 0.15, 0.7) + box(C.oak, x - w / 2, y - d / 2, 0, x + w / 2, y + d / 2, 0.6, { t: C.oakTop, x: C.oakDk, hlv: true }); };
  const FLAT = { fujiPrint: 0.08, kanaChart: 0.05, nightPicture: 0.05 };   // 書房's own pictures: as close to the wall as they always hung
  // a string of lights on its own (dragged in 擺設, or in the storage box): the wire and its bulbs, unlit (in 書房 the bulbs are an overlay)
  // 2026-11-11 (the user: finer): each bulb in its socket, its filament inside, shaded on one side
  const garland = (len, p) => wireArt(len, p) + bulbsAt(len, p).map((q) => bb(...q, '<ellipse cy="1.6" rx="2.2" ry="2.8" fill="#fffaf0" stroke="#8a7a60" stroke-width=".6"/><path d="M.9 -.8 A2.2 2.8 0 0 1 0 4.4 A2.6 3.2 0 0 0 .9 -.8 Z" fill="#2b1c12" fill-opacity=".08"/><path d="M-.6 2.8 V1.4 l.6 -.7 l.6 .7 V2.8" fill="none" stroke="#b4a284" stroke-width=".35"/><rect x="-1.3" y="-1.9" width="2.6" height="1.6" rx=".5" fill="#4a4038"/>')).join('');
  function wall(id, p) { const it = WARE.get(id); if (it && it.garland) return garland(it.size[0], p); if (id === 'board' || id === 'calendar') return own[id](p); if (it && it.win) return own.window(p, it.bare); if (id === 'wallshelf') return wallShelf(p); if (id === 'pegRail') return pegRail(p); if (it && it.light) return sconce(p); const f = WALL[id]; return !f ? '' : FLAT[id] ? onWall(p, f, FLAT[id], true) : onWall(p, f); }
  function floor(id, p) { const it = WARE.get(id), f = FLOOR[id]; return f ? f(p.x, p.y, p.r || 0, it) : own[id] ? own[id](p.x, p.y) : crate(p.x, p.y, it, p.r); }
  // on its own (the page sets the view box round it once it is drawn, fitThumbs): a wall ware on the right wall, one on the floor
  // at a spot of its own, in daylight
  function thumb(id) {
    const it = WARE.get(id);
    const art = it.garland ? garland(3.75, { w: 'R', u: 3, v: 3 }) : it.kind === 'wall' ? wall(id, { w: 'R', u: 3, v: 3 }) : floor(id, { w: 'F', x: 3, y: 3, r: 0 });   // a string: two sags of it
    return `<svg class="thumb" viewBox="0 0 10 10" aria-hidden="true"><g class="t">${art}</g></svg>`;
  }
  return { wall, floor, thumb, DEFS };
})();
// fits each thumbnail's view box round what it shows (needs the drawing on the page)
function fitThumbs(root) {
  root.querySelectorAll('svg.thumb').forEach((svg) => {
    const g = svg.querySelector('g.t'); if (!g) return;
    const night = [...g.querySelectorAll('.night-only')]; night.forEach((n) => { n.style.display = 'none'; });   // a light's pool by night is no part of the thing
    let b; try { b = g.getBBox(); } catch (e) { return; } finally { night.forEach((n) => { n.style.display = ''; }); }
    if (!b.width || !b.height) return;
    const pad = Math.max(b.width, b.height) * 0.08, side = Math.max(b.width, b.height) + pad * 2;
    svg.setAttribute('viewBox', [b.x + b.width / 2 - side / 2, b.y + b.height / 2 - side / 2, side, side].map((v) => v.toFixed(1)).join(' '));
  });
}
