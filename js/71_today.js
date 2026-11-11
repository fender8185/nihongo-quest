'use strict';
/* ==========================================================================
   Today (dashboard)
   ========================================================================== */
function weekdayZh(d) { return '日一二三四五六'[parseDate(d).getDay()]; }

// iOS ignores user-scalable=no inside Safari; the gesture events still stop a pinch from zooming the page
['gesturestart', 'gesturechange', 'gestureend'].forEach(t => document.addEventListener(t, (e) => e.preventDefault(), { passive: false }));

// 書房 and the yard (1.1.0). The app opens in 書房 (renderToday); its door leads out to the yard (renderOutside), whose house
// leads back in. Both follow the clock (sceneTick) and today's list (dayProgress, the ring they replace).
// what 書房 shows of the wares: a change (bought on another device, a sync) draws the room again
// the storage boxes (test, 2026-11-09): things that look the same (the strings of lights, the wall lamps, the windows, or one
// name) lie in one pile, shown once with how many; a pile gives out its first one
const stackKey = (it) => (it.garland ? '串燈' : it.win ? '窗戶' : it.name);
function stacks(items) {
  const out = new Map();
  items.forEach((it) => { const k = stackKey(it), q = out.get(k); if (q) q.n++; else out.set(k, { it, n: 1, name: k }); });
  return [...out.values()];
}
const lampOff = (id) => Boolean(state.lampsOff && state.lampsOff[id]);
function roomSig() { return Object.keys(state.lampsOff || {}).filter(lampOff).sort().join(',') + '#' + Object.keys(state.placed).sort().map((k) => { const p = state.placed[k]; return `${k}:${p.rm || ''}${p.w}${p.x ?? p.u},${p.y ?? p.v},${p.r || 0}`; }).join('|') + '/' + Object.keys(state.owned).length + '/' + Object.values(state.wear).join(',') + '/' + Object.values(HERO.norm(state.look)).join(','); }
function renderToday(view, rm = 'study') {   // 書房, or the bedroom beyond its door (1.3.0: #/bedroom)
  finishPreIfReady();
  sceneTick();
  const pct = ringPct(dayProgress());
  const st = view.querySelector('.study');
  if (st && st.dataset.room === rm && st.dataset.date === todayStr() && st.dataset.sig === roomSig()) { ROOM.level(st, pct); return; }   // a redraw (a sync, a setting): the tags change, the motion carries on
  view.innerHTML = ROOM.html(pct, rm);
  ROOM.mount(view.querySelector('.study'));
}
// ---------- the yard's things (1.2.0): drawn facing us in the hero's units (feet at 0, x round 0), scaled with distance like
// him (yScale) and darker by night like him. box: their drawing's [x, y, width, height]; glow: [x, y, r] of a light by night ----------
const YARD = (() => {
  const SHADE = (rx, ry = 6) => `<ellipse rx="${rx}" ry="${ry}" fill="#2b1c12" fill-opacity=".16"/>`;
  const ART = {
    telescope: { box: [-62, -146, 124, 152], draw: () => `${SHADE(34)}<path d="M0 -84 L4 -3" stroke="#6f4c33" stroke-width="5" stroke-linecap="round"/><path d="M0 -84 L-32 0 M0 -84 L30 0" fill="none" stroke="#8f6444" stroke-width="5.4" stroke-linecap="round"/>
      <circle cy="-87" r="6.4" fill="#3a3d4c"/><g transform="translate(0 -92) rotate(-28)"><rect x="-56" y="-6" width="12" height="12" rx="2.4" fill="#3a3d4c"/><rect x="-46" y="-10" width="80" height="20" rx="4" fill="#f2efe8"/><rect x="32" y="-12" width="14" height="24" rx="3" fill="#5a68d8"/>
      <rect x="-12" y="-11" width="6" height="22" fill="#5a68d8" fill-opacity=".85"/><rect x="-4" y="-18" width="22" height="7" rx="2" fill="#d8d3c8"/><path d="M-40 -5 H28" stroke="#fff" stroke-opacity=".6" stroke-width="2.4" stroke-linecap="round"/></g>` },
    stonelantern: { box: [-42, -146, 84, 152], glow: [0, -93, 34], draw: () => `${SHADE(30, 5.5)}<path d="M-26 0 L-22 -12 H22 L26 0 Z" fill="#9c988e"/><path d="M-8 -12 L-7 -70 H7 L8 -12 Z" fill="#aaa69c"/><rect x="-10" y="-46" width="20" height="5" rx="2" fill="#9c988e"/>
      <path d="M-24 -70 L-18 -80 H18 L24 -70 Z" fill="#9c988e"/><rect x="-17" y="-106" width="34" height="26" rx="2" fill="#aaa69c"/><rect x="-9" y="-101" width="18" height="16" rx="1.5" style="fill:color-mix(in srgb,#4a4842 calc(var(--day,1)*100%),#ffd27a)"/>
      <path d="M-38 -104 Q-20 -110 -12 -120 H12 Q20 -110 38 -104 Q41 -100 36 -100 H-36 Q-41 -100 -38 -104 Z" fill="#8c887e"/><rect x="-6" y="-124" width="12" height="4.4" rx="1.6" fill="#9c988e"/><path d="M0 -137 C-6 -133 -7 -127 -4 -123 H4 C7 -127 6 -133 0 -137 Z" fill="#8c887e"/>
      <g fill="#7f9a5a" fill-opacity=".75"><circle cx="-20" cy="-3" r="2.6"/><circle cx="-15" cy="-2" r="2"/><circle cx="18" cy="-74" r="2.2"/><circle cx="-30" cy="-102" r="2.4"/></g>` },
    engawa: { box: [-104, -72, 208, 78], draw: () => `${SHADE(96, 7)}<rect x="-80" y="-40" width="7" height="34" fill="#7a5638"/><rect x="73" y="-40" width="7" height="34" fill="#7a5638"/>
      <rect x="-92" y="-38" width="8" height="38" rx="1.5" fill="#9c7048"/><rect x="84" y="-38" width="8" height="38" rx="1.5" fill="#9c7048"/>
      <path d="M-100 -46 L-90 -52 H90 L100 -46 Z" fill="#c9996a"/><rect x="-100" y="-46" width="200" height="8" fill="#a77a4c"/><path d="M-60 -51 L-64 -46 M-20 -51 L-21 -46 M20 -51 L21 -46 M60 -51 L64 -46" stroke="#9c7048" stroke-width="1.2"/>
      <path d="M-58 -52 H58 L62 -46 V-31 Q0 -28 -62 -31 V-46 Z" fill="#c8453d"/><path d="M-58 -52 H58 L62 -46 H-62 Z" fill="#d85a50"/>
      <ellipse cx="36" cy="-52.6" rx="9" ry="2.2" fill="#d8cdb6"/><path d="M30 -62 h12 l-1.6 9 h-8.8 Z" fill="#ece5d3"/><path d="M33 -59 h6" stroke="#5f7a3a" stroke-width="1.6"/><path d="M34 -66 q-2 -4 0 -7 M38.4 -66 q2 -4 0 -7" fill="none" stroke="#fff" stroke-opacity=".7" stroke-width="1.4" stroke-linecap="round"/>` },
    tanuki: { box: [-54, -126, 108, 132], draw: () => `${SHADE(34)}<ellipse cx="-14" cy="-4" rx="11" ry="6" fill="#6f5139"/><ellipse cx="18" cy="-4" rx="11" ry="6" fill="#6f5139"/>
      <path d="M-30 -10 C-36 -40 -26 -66 2 -68 C30 -66 40 -40 34 -10 Q2 0 -30 -10 Z" fill="#8a6848"/><ellipse cx="2" cy="-30" rx="22" ry="21" fill="#ead9b8"/>
      <ellipse cx="-26" cy="-44" rx="7" ry="12" transform="rotate(22 -26 -44)" fill="#7d5d40"/><path d="M38 -40 c-6 0 -9 6 -9 12 c0 7 4 11 9 11 c5 0 9 -4 9 -11 c0 -6 -3 -12 -9 -12 Z" fill="#d9c49a"/><rect x="35.4" y="-46" width="5.2" height="7" rx="1.4" fill="#cbb487"/><path d="M33 -30 h10" stroke="#b5532f" stroke-width="2"/><ellipse cx="29" cy="-46" rx="7" ry="12" transform="rotate(-24 29 -46)" fill="#7d5d40"/>
      <circle cx="2" cy="-80" r="22" fill="#8a6848"/><ellipse cx="2" cy="-73" rx="11" ry="8" fill="#ead9b8"/><ellipse cx="-8" cy="-84" rx="6.4" ry="5.4" fill="#5a4030"/><ellipse cx="12" cy="-84" rx="6.4" ry="5.4" fill="#5a4030"/>
      <circle cx="-8" cy="-84" r="2.8" fill="#fff"/><circle cx="12" cy="-84" r="2.8" fill="#fff"/><circle cx="-7.4" cy="-84" r="1.5" fill="#2a2730"/><circle cx="12.6" cy="-84" r="1.5" fill="#2a2730"/><ellipse cx="2" cy="-77" rx="3.4" ry="2.4" fill="#2a2730"/>
      <path d="M-2 -70 Q2 -67 6 -70" fill="none" stroke="#5a4030" stroke-width="1.4" stroke-linecap="round"/><ellipse cx="-12" cy="-72" rx="3.6" ry="2" fill="#f2a3a0" fill-opacity=".6"/><ellipse cx="16" cy="-72" rx="3.6" ry="2" fill="#f2a3a0" fill-opacity=".6"/>
      <path d="M-30 -96 L2 -120 L34 -96 Q2 -90 -30 -96 Z" fill="#d8b366"/><path d="M-16 -104 L2 -118 M18 -104 L2 -118 M2 -94 V-118" stroke="#b9954f" stroke-width="1"/>` },
    pond: { box: [-132, -50, 264, 56], draw: () => `<ellipse cy="-19" rx="124" ry="27" fill="#8c887e"/>${[[-118, -22, 12, 7], [-96, -38, 14, 6], [-62, -45, 13, 5], [-20, -47, 15, 5], [24, -47, 13, 5], [66, -44, 14, 5], [100, -37, 13, 6], [118, -21, 12, 7], [96, -4, 15, 7], [52, 2, 16, 6], [4, 4, 17, 6], [-46, 3, 16, 6], [-92, -5, 15, 7]].map(([x, y, rx, ry], i) => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${i % 2 ? '#a3a097' : '#b4b0a6'}"/>`).join('')}
      <ellipse cy="-20" rx="106" ry="20" fill="#4f8fb8"/><ellipse cx="-24" cy="-26" rx="58" ry="7" fill="#fff" fill-opacity=".14"/>
      <g transform="translate(0 -20) scale(1 .19)"><g class="koi k1"><path d="M66 0 c-6 -6 -18 -6 -24 0 c6 6 18 6 24 0 Z M42 0 l-9 -6 v12 Z" fill="#f08a3c"/><circle cx="58" cy="-2" r="2.6" fill="#fff"/></g><g class="koi k2"><path d="M-36 0 c6 -6 18 -6 24 0 c-6 6 -18 6 -24 0 Z M-12 0 l9 -6 v12 Z" fill="#f6f1e8"/><circle cx="-26" cy="1" r="3.4" fill="#e0574b"/></g></g>
      <path d="M44 -24 a10 4.6 0 1 0 1.6 -1.2 L38 -24 Z" fill="#5f9a4a"/><path d="M-70 -14 a8 3.6 0 1 0 1.4 -1 L-76 -14 Z" fill="#6aa653"/>` }
  };
  // the ware as it stands in the yard: a button the size of its drawing, its feet at (p.x, p.y), drawn in order of distance
  function el(id, p, sel) {
    const a = ART[id], it = WARE.get(id); if (!a || !it) return '';
    const [x0, y0, w, h] = a.box, k = yScale(p.y);
    const glow = a.glow ? `<i class="glow" style="left:${a.glow[0] - x0 - a.glow[2]}px;top:${a.glow[1] - y0 - a.glow[2]}px;width:${2 * a.glow[2]}px;height:${2 * a.glow[2]}px"></i>` : '';
    return `<button type="button" class="yware${sel ? ' sel' : ''}${a.glow && lampOff(id) ? ' off' : ''}" data-act="yard-ware" data-ware="${id}" aria-label="${esc(it.name)}" style="width:${w}px;height:${h}px;margin-left:${x0}px;bottom:${-(y0 + h)}px;transform-origin:${-x0}px ${-y0}px;transform:translate(${p.x}px,${-p.y}px) scale(${k.toFixed(3)});z-index:${300 - Math.round(p.y)}"><svg class="art" viewBox="${a.box.join(' ')}" aria-hidden="true">${a.draw()}</svg>${glow}</button>`;
  }
  const thumb = (id) => (ART[id] ? `<svg class="thumb" viewBox="${ART[id].box.join(' ')}" aria-hidden="true">${ART[id].draw()}</svg>` : '');
  return { ART, el, thumb };
})();
// the yard's world (1.2.0): the ground 1200px wide (wider on a screen wider than that), its middle the house's; the camera: x,
// how far right of the world's middle the screen's middle is (0 on a screen as wide as the world), kept while the app runs
const YARD_HALF = 600;   // where yard wares may stand: within the middle 1200px, the same on every screen
const yardWorldW = () => Math.max(2 * YARD_HALF, document.documentElement.clientWidth || window.innerWidth || 0);
const ycam = { x: 0, W: 0, YW: 2 * YARD_HALF, z: 1 };   // W: how much of the world the screen shows; z: how large it is drawn (yardZoom)
let ypan = null, ycoast = 0;   // a finger looking along the yard; its fling
const yCamMax = () => Math.max(0, (ycam.YW - ycam.W) / 2);
function yCamTo(yard, x, give = 0) {   // the camera there (give: how much of a pull past an end a finger gets)
  const m = yCamMax();
  ycam.x = x < -m ? -m - (-m - x) * give : x > m ? m + (x - m) * give : x;
  const w = yard.querySelector('.yworld'); if (w) w.style.transform = `translate3d(${(-ycam.x * ycam.z).toFixed(1)}px,0,0)${ycam.z !== 1 ? ` scale(${ycam.z})` : ''}`;
  // no CSS variable here: one set on the yard every frame of a long walk began the hero's steps again on an iPhone (his legs
  // stopped, 1.2.1); the zoom into the door reads the camera when it starts (sceneGo)
}
function yardLayout(yard) {   // the world as wide as it should be on this screen, the hill's shop sign with it, the camera inside
  const sky = yard.querySelector('.sky'), w = yard.querySelector('.yworld'); if (!sky || !w) return;
  const sw = sky.clientWidth || window.innerWidth;
  ycam.z = Math.round(yardZoom(yard, sw, sky.clientHeight || window.innerHeight) * 1000) / 1000; yard.style.setProperty('--yz', ycam.z);
  ycam.W = sw / ycam.z; ycam.YW = Math.max(2 * YARD_HALF, ycam.W);
  w.style.width = `${ycam.YW}px`; w.style.marginLeft = `${-ycam.YW / 2}px`;
  const k = ycam.YW / 1200, sb = yard.querySelector('.shop-btn');   // the hill scales up on a very wide screen
  w.querySelectorAll('.land.prop[data-box]').forEach((q) => { const [x0, b0, pw, ph] = q.dataset.box.split(' ').map(Number); Object.assign(q.style, { left: `${x0 * k}px`, bottom: `${b0 * k}px`, width: `${pw * k}px`, height: `${ph * k}px` }); });   // the things' own layers, as the land
  if (sb) { sb.style.left = `calc(50% - ${Math.round(118 * k)}px)`; sb.style.bottom = `${Math.round(346 * k - 6)}px`; }
  yCamTo(yard, ycam.x);
}
// a screen held upright (2026-11-10, the user: less sky and bigger people on a phone): the place drawn larger, its ground along
// the bottom of the screen and the sky left as it is; a room (食堂, 居酒屋) a little smaller instead, more of it in sight
function yardZoom(yard, w, h) {
  if (!w || !h || h < w * 1.2) return 1;
  return yard.classList.contains('indoor') ? 0.75 : Math.max(1, Math.min(1.6, h / 540));
}
// the camera with the hero on the move (2026-11-10, the user: keep him nearer the middle — at the edge of the middle half the
// screen kept sliding along and he walked into its side): it eases after a point a little ahead of him the way he walks, so he is a
// little behind the middle with more in sight where he is going, the point coming back to him as he nears where he goes; when he
// stops it glides over till he is in the middle (yCamSettle). A swipe leaves the camera be till he is sent somewhere again (free)
const YCAM = { t: 0, x: 0, lead: 0, aim: null, free: false };
function yFollow(yard) {
  if (ypan || YCAM.free || !yCamMax()) return;
  cancelAnimationFrame(ycoast);   // a glide to him under way gives way
  const now = performance.now(), dt = YCAM.t && now - YCAM.t < 100 ? (now - YCAM.t) / 1000 : 0, vx = dt ? (yh.X - YCAM.x) / dt : 0;
  YCAM.t = now; YCAM.x = yh.X; if (!dt) { YCAM.aim = null; return; }
  const L = ycam.W * 0.12, near = Math.min(1, (yh.rem === undefined ? 9 : yh.rem / (yh.v || 170)) / 0.7), want = Math.max(-L, Math.min(L, vx * 0.3)) * near * near * (3 - 2 * near);   // the look-ahead fades out over his last 0.7 s, so little is left to make up when he stops (2026-11-10, the user: the swing back was too strong)
  YCAM.lead += (want - YCAM.lead) * (1 - Math.exp(-dt / (Math.abs(want) < Math.abs(YCAM.lead) ? 0.12 : 0.35)));
  const T = yh.X + YCAM.lead, vT = YCAM.aim === null ? vx : (T - YCAM.aim) / dt; YCAM.aim = T;   // where it should be and how fast that moves
  const step = (T + vT * 0.15 - ycam.x) * (1 - Math.exp(-dt / 0.15)), most = 1500 * dt;   // led by as much as the easing falls behind: on the mark, and on it as he stops
  yCamTo(yard, ycam.x + Math.max(-most, Math.min(most, step)));
}
function yCamSettle(yard) {   // a soft glide, slow in and slow out (the way left is short, so it is soon done)
  YCAM.t = 0; YCAM.lead = 0; YCAM.aim = null;
  if (ypan || YCAM.free || !yCamMax()) return;
  cancelAnimationFrame(ycoast);
  const x0 = ycam.x, gap = Math.abs(yh.X - x0); if (gap < 0.5) return;
  const ms = Math.min(900, 420 + gap * 6), t0 = performance.now();
  const step = (now) => {
    if (!yard.isConnected || ypan || YCAM.free) return;
    const k = Math.max(0, Math.min(1, (now - t0) / ms));
    yCamTo(yard, x0 + (yh.X - x0) * (1 - Math.cos(Math.PI * k)) / 2);   // after him if he moves on his seat
    if (k < 1) ycoast = requestAnimationFrame(step);
  };
  ycoast = requestAnimationFrame(step);
}
// where a yard ware may stand: on the lawn (whole within the middle 1200px; y 14–196 px up), off the path from the door (LANE),
// the house front, the mailbox and the way out at the path's end, and clear of the others (their ground:
// width × scale across, depth × scale deep)
// test (2026-11-09): the path from the door winds down the lawn and off the bottom of the screen (LANE), out to the main road
// with the bus stop — a place of its own (#/street; the user: no road by the house, it felt like the town moving in), its own
// path coming down from the yard (STREET_LANE). Each is a strip from Y0 to Y1 px up: at(t) its middle and half width t of the
// way along. The land is drawn 370 high, y down from its top
const LANE = { Y0: 220, Y1: -4, at: (t) => [22 * Math.sin(Math.PI * 1.5 * t) - 6 * t, 10 + 24 * t] };
const STREET_LANE = { Y0: 226, Y1: 128, at: (t) => [-44 + 16 * Math.sin(Math.PI * t), 5 + 13 * t] };
const STREET = { walk: [116, 134], road: [48, 116], near: [32, 48] };   // the far pavement, the road, the near pavement (Y px up)
const stripAt = (k, Y) => k.at(Math.max(0, Math.min(1, (Y - k.Y0) / (k.Y1 - k.Y0))));
function stripD(k, n) {
  const pt = (i, side) => { const t = i / n, [c, w] = k.at(t), Y = k.Y0 + (k.Y1 - k.Y0) * t; return `${(600 + c + side * w).toFixed(1)} ${(370 - Y).toFixed(1)}`; };
  const L = [], R = []; for (let i = 0; i <= n; i++) { L.push(pt(i, -1)); R.unshift(pt(i, 1)); }
  return `M${L.join(' L')} L${R.join(' L')} Z`;
}
function yardFits(id, p) {
  const a = YARD.ART[id], it = WARE.get(id); if (!a || !it || p.y < 14 || p.y > 196) return false;
  const k = yScale(p.y), hw = it.ground[0] * k / 2, hd = it.ground[1] * k;
  if (Math.abs(p.x) + hw > YARD_HALF - 10) return false;
  if ([LANE].some((k) => [p.y, p.y + hd].some((Y) => { const [c, w] = stripAt(k, Y); return Math.abs(p.x - c) < hw + w + 4; }))) return false;   // off the path and the road
  const over = (x0, x1, y0, y1) => p.x + hw > x0 && p.x - hw < x1 && p.y + hd > y0 && p.y - hd < y1;
  if (over(-95, 95, 186, 999) || over(20, 92, 136, 230) || over(-60, 10, -10, 26) || over(-YARD_HALF, -YARD_HALF + 90, 30, 120) || over(YARD_HALF - 90, YARD_HALF, 30, 120)) return false;   // the house, the mailbox, the ways out (the path's end, the edges)
  return yardPlaced().every((o) => { if (o.id === id) return true; const t = yScale(o.p.y); return Math.abs(p.x - o.p.x) >= hw + o.it.ground[0] * t / 2 || Math.abs(p.y - o.p.y) >= hd + o.it.ground[1] * t; });
}
function yardPlaced() { return Object.keys(state.placed).filter((id) => owns(id) && WARE.has(id) && WARE.get(id).kind === 'yard' && state.placed[id].w === 'Y').map((id) => ({ id, it: WARE.get(id), p: state.placed[id] })); }
function yardSpot(id) {   // where a ware taken out of the box goes: the free spot nearest the lower middle of the screen
  const c = [];
  for (let y = 20; y <= 190; y += 10) for (let x = -YARD_HALF; x <= YARD_HALF; x += 10) c.push({ x, y, d: Math.hypot(x - ycam.x, (y - 70) * 1.4) });
  c.sort((a, b) => a.d - b.d);
  const hit = c.find((q) => yardFits(id, q));
  return hit ? { x: hit.x, y: hit.y } : null;
}
const yardWaresHtml = () => yardPlaced().map((o) => YARD.el(o.id, o.p, yed.on && yed.sel === o.id)).join('');
const yardSig = () => yardPlaced().map((o) => `${o.id}:${o.p.x},${o.p.y}`).join('|');
// 擺設 in the yard (1.2.0), as in 書房: pick a ware, drag it or tap the lawn to move it, 收起 puts it in the yard's box
const yed = { on: false, sel: null, drag: null };
function yeditHtml() {
  const box = WARES.filter((it) => it.kind === 'yard' && owns(it.id) && !(state.placed[it.id] && state.placed[it.id].w === 'Y'));
  // the houses (test, 2026-11-09): once one is bought, the cottage and each house bought sit at the front of the box; a tap puts it up
  const houses = WARES.some((it) => it.kind === 'house' && owns(it.id)) ? [{ id: '', name: '小屋' }].concat(WARES.filter((it) => it.kind === 'house' && owns(it.id) && HOUSE_ART[it.id])) : [];
  const now = state.house && owns(state.house) && HOUSE_ART[state.house] ? state.house : '';
  const houseIt = (h) => `<button type="button" class="tray-it tray-house" data-act="yard-house" data-id="${h.id}" aria-pressed="${h.id === now}"><svg class="house-thumb" viewBox="0 0 140 130" aria-hidden="true">${HOUSE_ART[h.id || 'cottage']}</svg><span>${esc(h.name)}</span></button>`;
  return `<div class="edit-top"><span class="edit-hint">${yed.sel ? '拖曳搬動，拖到上面收起來' : houses.length ? '點房子換外觀；其他東西拖出來擺' : '拖曳搬動；收納箱的東西拖出來擺'}</span><button type="button" class="btn btn-primary btn-sm" data-act="yard-edit-done">完成</button></div>
    <div class="edit-tray" aria-label="院子的收納箱">${houses.map(houseIt).join('')}${box.length ? stacks(box).map(({ it, n, name }) => `<button type="button" class="tray-it" data-act="yard-edit-take" data-id="${it.id}">${YARD.thumb(it.id)}<span>${esc(name)}</span>${n > 1 ? `<b class="tray-n">×${n}</b>` : ''}</button>`).join('') : houses.length ? '' : '<div class="tray-empty">收納箱是空的。古道具屋的「戶外」有望遠鏡、石燈籠……</div>'}</div>`;
}
function yselHtml() {   // the picked ware's tools, over it in the world
  const o = yed.sel && yardPlaced().find((q) => q.id === yed.sel), a = o && YARD.ART[o.id];
  return o ? `<div class="edit-sel" style="left:calc(50% + ${o.p.x}px);bottom:${Math.round(o.p.y + -a.box[1] * yScale(o.p.y) + 8)}px"><button type="button" data-act="yard-edit-put">收起</button></div>` : '';
}
function yardDraw(yard) {   // the wares and the 擺設 bar drawn again; the hero and the sky stay as they are
  yard.classList.toggle('edit', yed.on);
  const w = yard.querySelector('.ywares'); w.innerHTML = yardWaresHtml(); w.dataset.sig = yardSig();
  yard.querySelector('.yedit').innerHTML = yed.on ? yeditHtml() : '';
  yard.querySelector('.ysel').innerHTML = yed.on ? yselHtml() : '';
  if (yed.on) fitThumbs(yard.querySelector('.yedit'));
}
function yardEdit(yard, cmd, id) {
  if (!yard) return;
  if (cmd === 'on') { yed.on = true; yed.sel = null; }
  else if (cmd === 'done') { yed.on = false; yed.sel = null; }
  else if (cmd === 'pick') yed.sel = id;
  else if (cmd === 'take') {
    const p = yardSpot(id);
    if (!p) { toast('院子放不下了，先收起別的東西再試試'); return; }
    state.placed[id] = Object.assign({ w: 'Y' }, p); yed.sel = id; saveState();
  } else if (cmd === 'put' && yed.sel) { delete state.placed[yed.sel]; yed.sel = null; saveState(); }
  else if (cmd === 'house') {   // the yard's house in this look (id '' the cottage), at once
    if (id && !(WARE.has(id) && owns(id) && HOUSE_ART[id])) return;
    state.house = id; saveState();
    yard.querySelector('.house > svg').innerHTML = houseArt(); yard.dataset.house = state.house;
  }
  yardDraw(yard);
}
const yardPoint = (yard, e) => { const r = yard.querySelector('.yworld').getBoundingClientRect(); return { x: (e.clientX - (r.left + r.width / 2)) / ycam.z, y: (r.bottom - e.clientY) / ycam.z }; };   // in the world
const snap2 = (v) => Math.round(v / 2) * 2;
function yardMoveTo(yard, id, p) {   // the picked ware to a spot, if it can stand there
  const q = { w: 'Y', x: snap2(p.x), y: snap2(p.y) };
  if (!yardFits(id, q)) { toast('這裡放不下'); return; }
  state.placed[id] = q; saveState(); yardDraw(yard);
}
// a drag in 擺設: a ware on the lawn follows the finger (red where it cannot stand) and stays where it is let go, or goes back; one
// held in the box up top comes out with a downward pull (a sideways swipe scrolls the box); let go over the box, a ware goes in.
// Near a side of the screen the camera goes along.
function yardDragStart(yard, e) {
  if (!yed.on || (e.pointerType === 'mouse' && e.button !== 0)) return;
  const t = e.target.closest('.yedit .tray-it');
  if (t && t.classList.contains('tray-house')) return;   // a house is only tapped
  if (t) { yed.drag = { id: t.dataset.id, b: null, from: null, off: { x: 0, y: 0 }, x0: e.clientX, y0: e.clientY, moved: false, to: null, fromBox: true, box: false }; return; }
  const b = e.target.closest('.yware'); if (!b) return;
  const id = b.dataset.ware, p = state.placed[id], at = yardPoint(yard, e);
  yed.drag = { id, b, from: p, off: { x: at.x - p.x, y: at.y - p.y }, x0: e.clientX, y0: e.clientY, moved: false, to: null, fromBox: false, box: false };
  try { b.setPointerCapture(e.pointerId); } catch (err) { /* not capturable */ }
}
function yardDragMove(yard, e) {
  const d = yed.drag; if (!d) return;
  if (!d.moved) {
    const dx = e.clientX - d.x0, dy = e.clientY - d.y0;
    if (Math.hypot(dx, dy) < 6) return;
    if (d.fromBox && e.pointerType !== 'mouse' && Math.abs(dx) > Math.abs(dy)) { yed.drag = null; return; }   // sideways: the box scrolls
    d.moved = true;
    if (d.fromBox) {   // the ware out of the box, under the finger
      const w = yard.querySelector('.ywares'); w.insertAdjacentHTML('beforeend', YARD.el(d.id, { x: 0, y: 100 })); d.b = w.lastElementChild; d.b.classList.add('new');
      try { yard.setPointerCapture(e.pointerId); } catch (err) { /* not capturable */ }
    } else yed.sel = d.id;
    yard.classList.add('dragging');
  }
  d.cx = e.clientX; d.cy = e.clientY;
  yardDragAt(yard, d);
  yEdgePan(yard);
}
function yardDragAt(yard, d) {   // the dragged ware where the finger is now (also as the camera moves under it)
  const tray = yard.querySelector('.yedit .edit-tray'), tr = tray && tray.getBoundingClientRect(), hint = yard.querySelector('.yedit .edit-hint');
  d.box = Boolean(tr && d.cy <= tr.bottom && d.cx >= tr.left && d.cx <= tr.right);
  if (tray) tray.classList.toggle('drop', d.box && !d.fromBox);
  const say = d.box && !d.fromBox ? '放開就收起來' : '拖到想放的地方放開'; if (hint && hint.textContent !== say) hint.textContent = say;
  d.b.style.visibility = d.box ? 'hidden' : '';
  if (d.box) { d.to = null; return; }
  const at = yardPoint(yard, { clientX: d.cx, clientY: d.cy }), q = { w: 'Y', x: snap2(at.x - d.off.x), y: snap2(at.y - d.off.y) }, ok = yardFits(d.id, q);
  d.to = ok ? q : null;
  d.b.style.transform = `translate(${q.x}px,${-q.y}px) scale(${yScale(q.y).toFixed(3)})`; if (!d.fromBox) d.b.style.zIndex = String(300 - Math.round(q.y));
  d.b.classList.toggle('bad', !ok);
}
let yEdgeT = 0;
function yEdgePan(yard) {   // a ware held near a side of the screen: the camera goes that way, the ware with the finger
  cancelAnimationFrame(yEdgeT);
  const d = yed.drag; if (!d || !d.moved || d.box || !yCamMax()) return;
  const r = yard.getBoundingClientRect(), dir = d.cx < r.left + 44 ? -1 : d.cx > r.right - 44 ? 1 : 0;
  if (!dir) return;
  const step = () => {
    const dd = yed.drag; if (dd !== d || !yard.isConnected) return;
    const x0 = ycam.x; yCamTo(yard, ycam.x + dir * 7); if (ycam.x === x0) return;
    yardDragAt(yard, d); yEdgeT = requestAnimationFrame(step);
  };
  yEdgeT = requestAnimationFrame(step);
}
function yardDragEnd(yard) {
  const d = yed.drag; yed.drag = null; cancelAnimationFrame(yEdgeT); if (!d || !d.moved) return;
  yard.classList.remove('dragging'); yard._noClick = true; setTimeout(() => { yard._noClick = false; }, 0);   // the click that ends a drag is no tap
  if (d.box) { if (!d.fromBox) { delete state.placed[d.id]; if (yed.sel === d.id) yed.sel = null; saveState(); } }
  else if (d.to) { state.placed[d.id] = d.to; yed.sel = d.id; saveState(); }
  else if (d.fromBox) toast('這裡放不下');
  yardDraw(yard);
}
// 觀星 (test, 2026-11-09): the telescope's eyepiece over the sky, one constellation at a time with its Japanese name (its reading,
// its Chinese name), ‹ › to the next, the lines drawn in each time. By day the stars are faint and it says so.
const SCOPE = (() => {
  const SKIES = [
    { ja: '北斗七星', kana: 'ほくとしちせい', zh: '北斗七星（大熊座的一部分）', s: [[40, 70], [62, 66], [80, 76], [98, 88], [104, 116], [136, 124], [148, 100]], l: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 3]] },
    { ja: 'オリオン座', kana: 'オリオンざ', zh: '獵戶座：紅色的參宿四、藍白色的參宿七', s: [[72, 54, 5, '#ffb08a'], [128, 62], [90, 102], [100, 98], [110, 94], [80, 148], [130, 142, 5, '#cfe2ff']], l: [[0, 2], [1, 4], [2, 3], [3, 4], [2, 5], [4, 6], [0, 1]] },
    { ja: 'カシオペア座', kana: 'カシオペアざ', zh: '仙后座：天上的 W', s: [[40, 80], [70, 110], [98, 86], [126, 112], [158, 82]], l: [[0, 1], [1, 2], [2, 3], [3, 4]] },
    { ja: '夏の大三角', kana: 'なつのだいさんかく', zh: '夏季大三角：織女星（ベガ）、天津四（デネブ）、牛郎星（アルタイル）', s: [[78, 56, 5], [148, 74, 4.4], [102, 150, 4.6]], l: [[0, 1], [1, 2], [2, 0]] },
    { ja: 'さそり座', kana: 'さそりざ', zh: '天蠍座：心臟是紅色的心宿二', s: [[150, 44], [158, 62], [150, 80], [128, 84, 5, '#ff9a7a'], [116, 98], [108, 116], [100, 134], [88, 146], [70, 150], [56, 142], [52, 126], [62, 116]], l: [[0, 1], [1, 2], [1, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 8], [8, 9], [9, 10], [10, 11]] },
    { ja: 'はくちょう座', kana: 'はくちょうざ', zh: '天鵝座：張開翅膀的天鵝', s: [[100, 40, 4.6], [100, 86], [100, 124], [100, 162], [54, 72], [76, 80], [124, 92], [148, 100]], l: [[0, 1], [1, 2], [2, 3], [4, 5], [5, 1], [1, 6], [6, 7]] }
  ];
  const rnd = ((n) => () => { n = (n * 9301 + 49297) % 233280; return n / 233280; })(7);
  const DUST = Array.from({ length: 80 }, () => [Math.round(rnd() * 200), Math.round(rnd() * 200), (0.4 + rnd() * 0.9).toFixed(2), (rnd() * 4).toFixed(2)]);
  let i = 0;
  function sky(day) {
    const k = SKIES[i];
    const lines = k.l.map(([a, b]) => { const p = k.s[a], q = k.s[b], len = Math.hypot(q[0] - p[0], q[1] - p[1]).toFixed(1); return `<path class="sc-line" d="M${p[0]} ${p[1]} L${q[0]} ${q[1]}" style="--len:${len}"/>`; }).join('');
    const stars = k.s.map(([x, y, r = 3.4, c = '#fffbe8'], j) => `<circle class="sc-star" cx="${x}" cy="${y}" r="${r}" fill="${c}" style="--w:-${(j * 0.7).toFixed(1)}s"/>`).join('');
    return `<svg class="sc-sky${day ? ' day' : ''}" viewBox="0 0 200 200" aria-hidden="true"><defs><clipPath id="scClip"><circle cx="100" cy="100" r="100"/></clipPath><radialGradient id="scVig"><stop offset=".72" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".7"/></radialGradient></defs>
      <g clip-path="url(#scClip)"><rect width="200" height="200" class="sc-bg"/>${DUST.map(([x, y, r, w]) => `<circle class="sc-dust" cx="${x}" cy="${y}" r="${r}" style="--w:-${w}s"/>`).join('')}
      <path class="sc-meteor" d="M150 20 L120 44"/>${lines}${stars}<rect width="200" height="200" fill="url(#scVig)"/></g></svg>`;
  }
  function draw(el) {
    const day = sceneClock(lightHour()).day >= 0.5, k = SKIES[i];
    el.querySelector('.sc-view').innerHTML = sky(day);
    el.querySelector('.sc-name').innerHTML = `<ruby>${esc(k.ja)}<rt>${esc(k.kana)}</rt></ruby>`;
    el.querySelector('.sc-zh').textContent = k.zh;
    el.querySelector('.sc-note').textContent = day ? '白天太亮，星星很淡；晚上再來看會清楚很多。' : `${i + 1} / ${SKIES.length}`;
  }
  function open(yard) {
    if (!yard || yard.querySelector('.scope')) return;
    const el = document.createElement('div');
    el.className = 'scope'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', '望遠鏡');
    el.innerHTML = `<div class="sc-ring"><div class="sc-view"></div></div><div class="sc-name"></div><div class="sc-zh"></div><div class="sc-note"></div>
      <div class="sc-btns"><button type="button" class="btn btn-sm" data-sc="-1" aria-label="上一個">‹</button><button type="button" class="btn btn-primary btn-sm" data-sc="x">收起望遠鏡</button><button type="button" class="btn btn-sm" data-sc="1" aria-label="下一個">›</button></div>`;
    const close = () => { el.remove(); document.removeEventListener('keydown', key); };
    const step = (d) => { i = (i + d + SKIES.length) % SKIES.length; draw(el); };
    const key = (e) => { if (e.key === 'Escape') close(); else if (e.key === 'ArrowLeft') step(-1); else if (e.key === 'ArrowRight') step(1); };
    el.addEventListener('click', (e) => { const b = e.target.closest('[data-sc]'); if (b) { if (b.dataset.sc === 'x') close(); else step(Number(b.dataset.sc)); } else if (e.target === el) close(); });
    el.addEventListener('pointerdown', (e) => e.stopPropagation());
    document.addEventListener('keydown', key);
    yard.appendChild(el); draw(el);
  }
  return { open, SKIES };
})();
// test (2026-11-09): the gramophone plays a record while 書房 or the bedroom is open and it stands in either (state.record: the one
// on it, '' the first; state.musicOff: stopped by hand). Made up here and played by Web Audio, so there is nothing to fetch: a
// tune (mel: notes in eighths, name:length, - a rest), a chord a bar (its first note an octave down for the bass), a music-box
// arpeggio over it (arp: the chord's notes, a step each), a soft pad and the gramophone's warm filter — clean, no crackle (the user's call).
// RECORDS: the house's own (own); one sold later is had once bought (owns)
const MUSIC = (() => {
  const RECORDS = [
    { id: 'engawa', own: true, file: 'music/engawa-1.m4a', name: '縁側の午後', kana: 'えんがわのごご', zh: '簷廊的午後', style: '電鋼琴・音樂盒', color: '#e3907f', bpm: 76, bar: 8, lead: 'keys', arp: [0, 2, 1, 2, 3, 2, 1, 2],
      chords: ['F3 A3 C4 E4', 'G3 B3 D4 E4', 'E3 G3 B3 D4', 'A3 C4 E4 G4', 'D3 F3 A3 C4', 'G3 B3 D4 F4', 'C3 E3 G3 B3', 'C3 E3 G3 D4'],
      mel: 'A4:2 G4 A4 C5:2 E5:2 | D5:3 C5 D5:2 G4:2 | E5:2 D5 E5 G5:2 E5:2 | D5:3 C5 A4:4 | C5:2 D5 C5 A4:2 G4:2 | A4:2 C5:2 D5:2 G4:2 | E5:4 D5:2 C5:2 | C5:6 -:2 |'
        + 'A4:2 G4 A4 C5:2 E5:2 | D5:3 C5 D5:2 G5:2 | E5:2 G5 A5 G5:2 E5:2 | D5:3 E5 C5:4 | A5:2 G5 E5 D5:2 C5:2 | D5:2 E5:2 G5:2 D5:2 | E5:3 D5 C5:2 A4:2 | C5:8' },
    { id: 'yozakura', own: true, file: 'music/yozakura-1.m4a', name: '夜桜', kana: 'よざくら', zh: '夜裡的櫻花', style: '琴・音樂盒', color: '#8b6aa8', bpm: 66, bar: 6, lead: 'koto', arp: [0, 1, 2, 1, 2, 1],
      chords: ['A3 C4 E4', 'A#3 D4 F4 A4', 'D3 F3 A3', 'E3 A3 D4', 'A3 C4 E4', 'F3 A3 C4 E4', 'D3 F3 A3 C4', 'A3 C4 E4'],
      mel: 'E5:2 D5 E5 A5:2 | F5:3 E5 D5:2 | E5:2 F5 E5 D5:2 | A#4:2 A4:4 | A4:2 D5:2 E5:2 | F5:2 E5 F5 A5:2 | F5:2 E5:2 D5:2 | E5:6 |'
        + 'E5:2 D5 E5 A5:2 | A#5:3 A5 F5:2 | E5:2 F5 E5 D5:2 | A#4:2 A4:4 | A5:2 A#5 A5 F5:2 | E5:4 F5:2 | E5:2 D5:2 A#4:2 | A4:6' }
  ];
  const NOTE = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };
  const hz = (n) => { const m = /^([A-G]#?)(\d)$/.exec(n); return 440 * Math.pow(2, ((+m[2] + 1) * 12 + NOTE[m[1]] - 69) / 12); };
  const have = () => RECORDS.filter((r) => r.own || owns(r.id));
  const current = () => have().find((r) => r.id === state.record) || have()[0];
  // a record as notes to play: [step, instrument, Hz, length in steps, volume], and its length in steps
  function score(rec) {
    const ev = []; let t = 0;
    rec.mel.split(/[\s|]+/).filter(Boolean).forEach((w) => { const [n, l] = w.split(':'), len = +(l || 1); if (n !== '-') ev.push([t, rec.lead, hz(n), len, rec.lead === 'koto' ? 0.45 : 0.16]); t += len; });
    const bars = Math.round(t / rec.bar);
    for (let b = 0; b < bars; b++) {
      const ch = rec.chords[b % rec.chords.length].split(' ').map(hz), s0 = b * rec.bar;
      ev.push([s0, 'bass', ch[0] / 2, rec.bar, 0.13]);
      if (rec.bar === 8) ev.push([s0 + 4, 'bass', ch[0] / 2, 4, 0.08]);
      ev.push([s0, 'pad', ch, rec.bar, 0.018]);
      rec.arp.forEach((k, i) => ev.push([s0 + i, 'box', ch[k % ch.length] * 2, 2, i ? 0.035 : 0.045]));
    }
    return { ev, len: bars * rec.bar };
  }
  // two ways to play (test, 2026-11-09): a record's file (file: the music below rendered once by scripts/render-music.py, served
  // with the site, kept by the service worker like the clips) through a looping <audio> — smooth, and iOS plays it as it plays
  // any media; or, when the file cannot be had (offline before it was ever fetched), the music made here and now (synth)
  let ctx = null, out = null, bus = null, timer = 0, play = null, wake = null, kept = {}, player = null, fadeT = 0;
  const VOL = 0.8, blobs = {};   // blobs: a record's file as a blob: URL, fetched once a session
  function chain(c) {   // the synth's way out: a warm filter, a small room's echo
    ctx = c;
    out = ctx.createGain(); out.connect(ctx.destination);
    const warm = ctx.createBiquadFilter(); warm.type = 'lowpass'; warm.frequency.value = 5200; warm.Q.value = 0.4; warm.connect(out);
    bus = ctx.createGain(); bus.gain.value = 0.9; bus.connect(warm);
    const rv = ctx.createConvolver(), sr = ctx.sampleRate, ir = ctx.createBuffer(2, Math.floor(sr * 2.2), sr);
    for (let c2 = 0; c2 < 2; c2++) { const d = ir.getChannelData(c2); for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 3); }
    rv.buffer = ir; const wet = ctx.createGain(); wet.gain.value = 0.22; bus.connect(rv); rv.connect(wet); wet.connect(warm);
  }
  function build() { const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return false; chain(new AC()); out.gain.value = 0; return true; }
  function koto(f) {   // a plucked string (Karplus–Strong), made once a pitch
    const k = Math.round(f); if (kept[k]) return kept[k];
    const sr = ctx.sampleRate, b = ctx.createBuffer(1, Math.floor(sr * 2.4), sr), d = b.getChannelData(0), N = Math.max(2, Math.round(sr / f));
    for (let i = 0; i < N; i++) d[i] = (Math.random() * 2 - 1) * 0.8;
    for (let i = N; i < d.length; i++) d[i] = 0.4985 * (d[i - N] + (i - N - 1 >= 0 ? d[i - N - 1] : 0));
    return (kept[k] = b);
  }
  function env(at, vol, attack, len) {   // a gain that swells in and dies away
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(vol, at + attack); g.gain.exponentialRampToValueAtTime(0.0001, at + attack + len); g.connect(bus); return g;
  }
  function osc(type, f, at, end, to) { const o = ctx.createOscillator(); o.type = type; o.frequency.value = f; o.connect(to); o.start(at); o.stop(end); return o; }
  function note(at, inst, f, steps, vol, step) {
    const len = steps * step;
    if (inst === 'koto') { const s = ctx.createBufferSource(); s.buffer = koto(f); const g = env(at, vol, 0.004, Math.max(1.6, len + 0.8)); s.connect(g); s.start(at); s.stop(at + 2.4); }
    else if (inst === 'keys') { const g = env(at, vol, 0.006, len + 1.1), g2 = env(at, vol * 0.22, 0.004, 0.35); osc('sine', f, at, at + len + 1.3, g); osc('triangle', f, at, at + len + 1.3, env(at, vol * 0.3, 0.006, len * 0.6 + 0.3)); osc('sine', f * 3, at, at + 0.5, g2); }
    else if (inst === 'box') { osc('sine', f, at, at + 1.6, env(at, vol, 0.003, 1.4)); osc('sine', f * 4.2, at, at + 0.4, env(at, vol * 0.18, 0.002, 0.3)); }
    else if (inst === 'bass') osc('sine', f, at, at + len + 0.4, env(at, vol, 0.02, Math.min(len, 2.2)));
    else if (inst === 'pad') {
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900; lp.connect(env(at, vol, 0.7, len + 0.3));
      f.forEach((h) => { osc('triangle', h * 1.003, at, at + len + 1.1, lp); osc('triangle', h * 0.997, at, at + len + 1.1, lp); });
    }
  }
  function startSynth(rec) {   // from its first bar, a step ahead
    if (!ctx && !build()) return;
    const sc = score(rec), step = 60 / rec.bpm / 2;
    Object.assign(play, { sc, step, i: 0, t: ctx.currentTime + 0.15 });
    clearInterval(timer);
    timer = setInterval(() => {
      if (!play || play.mode !== 'synth' || ctx.state !== 'running') return;
      if (play.t < ctx.currentTime) play.t = ctx.currentTime + 0.05;   // fallen behind (the timer held up, the phone asleep): on from now, never a heap of notes at once
      while (play.t < ctx.currentTime + 0.3) {
        const k = play.i % play.sc.len;
        play.sc.ev.forEach((e) => { if (e[0] === k) note(play.t, e[1], e[2], e[3], e[4], play.step); });
        play.i++; play.t += play.step;
        if (k === play.sc.len - 1) play.t += play.step * 2;   // a breath before it comes round again
      }
    }, 60);
    ctx.resume().catch(() => {}); fade(VOL, 1.2);
  }
  const fade = (v, s) => { const t = ctx.currentTime; out.gain.cancelScheduledValues(t); out.gain.setValueAtTime(out.gain.value, t); out.gain.linearRampToValueAtTime(v, t + s); };
  function fadeFile(v, s) {   // the player's volume to v (an iPhone keeps it at 1: there it only starts and stops)
    clearInterval(fadeT); const from = player.volume, t0 = performance.now();
    fadeT = setInterval(() => { const k = Math.min(1, (performance.now() - t0) / (s * 1000)); try { player.volume = from + (v - from) * k; } catch (e) { /* read-only */ } if (k >= 1) clearInterval(fadeT); }, 50);
  }
  const playFile = () => { const pr = player.play(); if (pr && pr.catch) pr.catch(() => {}); };   // refused before a first tap: wake tries again
  function startFile(rec, p) {
    if (!player) { player = new Audio(); player.loop = true; player.preload = 'auto'; player.setAttribute('playsinline', ''); }
    const go = () => {
      if (play !== p) return;
      if (player.dataset.id !== rec.id) { player.src = blobs[rec.id]; player.dataset.id = rec.id; }   // the same record again: on from where it stopped
      try { player.volume = 0; } catch (e) { /* read-only */ }
      playFile(); fadeFile(VOL, 1.2);
    };
    if (blobs[rec.id]) { go(); return; }
    fetch(rec.file).then((r) => { if (!r.ok) throw new Error(r.status); return r.blob(); }).then((b) => { blobs[rec.id] = URL.createObjectURL(b); go(); })
      .catch(() => { if (play !== p) return; p.mode = 'synth'; startSynth(rec); });   // no file to be had: made here instead
  }
  function start(rec) { play = { id: rec.id, mode: rec.file ? 'file' : 'synth' }; if (play.mode === 'file') startFile(rec, play); else startSynth(rec); }
  function halt() {   // stopped: the file paused where it is, the synth's timer stopped and its sound asleep
    if (!play) return;
    if (play.mode === 'file') { clearInterval(fadeT); player.pause(); } else { clearInterval(timer); timer = 0; if (ctx) ctx.suspend().catch(() => {}); }
    play = null;
  }
  // whether it should play now: in 書房 or the bedroom (#/, #/today, #/bedroom), the gramophone set out, not stopped, the page in sight
  function wanted() {
    const r = currentRoute().name;
    return (r === 'today' || r === 'bedroom') && Boolean(state.placed && state.placed.gramophone && owns('gramophone')) && !state.musicOff && !document.hidden && Boolean(current());
  }
  function sync() { try { tune(); } catch (e) { console.error(e); } }   // music never breaks a page
  function tune() {
    const on = wanted();
    document.querySelectorAll('.study').forEach((st) => st.classList.toggle('music', on));
    if (!on) {
      if (!play) return;
      if (document.hidden) { halt(); return; }
      const p = play; if (p.mode === 'file') fadeFile(0, 0.5); else fade(0, 0.5);
      setTimeout(() => { if (play === p && !wanted()) halt(); }, 600);
      return;
    }
    try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) { /* older Safari */ }
    const rec = current();
    if (!play || play.id !== rec.id) { halt(); start(rec); }
    else if (play.mode === 'file') { if (player.paused) playFile(); fadeFile(VOL, 0.6); }   // back before it had stopped
    else { ctx.resume().catch(() => {}); fade(VOL, 1.2); }
    if (!wake) {   // a browser lets sound start only from a tap or a key: the first one wakes it
      // iOS: Web Audio stays silent (the ring switch) until a media element has played — the user heard the records only after a
      // saved clip: the shared player plays its silence from this tap too, and the page asks for a playback session
      wake = () => {
        if (!play || !wanted()) return;
        if (play.mode === 'file') { if (player.paused && player.src) playFile(); return; }
        if (ctx && ctx.state !== 'running') { try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) { /* older Safari */ } unlockTtsPlayer(); ctx.resume().catch(() => {}); }
      };
      ['pointerdown', 'keydown'].forEach((t) => document.addEventListener(t, wake, true));
    }
  }
  // a record as a file (scripts/render-music.py): the music made here, rendered offline twice round with the second kept — its
  // start carries the first's echoes, so it loops on without a seam — at peak, as 16-bit stereo WAV in base64
  async function render(id, peak = 0.5) {
    const rec = RECORDS.find((r) => r.id === id), sc = score(rec), step = 60 / rec.bpm / 2, L = (sc.len + 2) * step, sr = 44100, n = Math.round(L * sr);
    const was = [ctx, out, bus, kept], oc = new OfflineAudioContext(2, n * 2, sr);
    kept = {}; chain(oc); out.gain.value = 1;
    for (let k = 0; k < 2; k++) sc.ev.forEach((e) => note(k * L + e[0] * step, e[1], e[2], e[3], e[4], step));
    const buf = await oc.startRendering(); [ctx, out, bus, kept] = was;
    const ch = [0, 1].map((c) => buf.getChannelData(c).subarray(n, 2 * n));
    let top = 0; ch.forEach((d) => { for (let i = 0; i < d.length; i++) top = Math.max(top, Math.abs(d[i])); });
    const g = peak / (top || 1), bytes = new Uint8Array(44 + n * 4), v = new DataView(bytes.buffer), str = (o, t) => [...t].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
    str(0, 'RIFF'); v.setUint32(4, 36 + n * 4, true); str(8, 'WAVEfmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 2, true);
    v.setUint32(24, sr, true); v.setUint32(28, sr * 4, true); v.setUint16(32, 4, true); v.setUint16(34, 16, true); str(36, 'data'); v.setUint32(40, n * 4, true);
    for (let i = 0; i < n; i++) for (let c = 0; c < 2; c++) v.setInt16(44 + (i * 2 + c) * 2, Math.max(-32767, Math.min(32767, Math.round(ch[c][i] * g * 32767))), true);
    let b64 = ''; for (let i = 0; i < bytes.length; i += 0x8000) b64 += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return { seconds: L, top, b64: btoa(b64) };
  }
  document.addEventListener('visibilitychange', () => sync());
  saveHooks.push(() => sync());   // set out or put away, stopped or another record (here or from another device)
  // the gramophone tapped: its records, the one playing marked; a tap puts one on, 停下來 lifts the needle
  const disc = (r, on) => `<svg class="rec-disc${on ? ' on' : ''}" viewBox="-24 -24 48 48" aria-hidden="true"><circle r="23" fill="#1f1c22"/><circle r="18" fill="none" stroke="#fff" stroke-opacity=".08" stroke-width="1"/><circle r="13.5" fill="none" stroke="#fff" stroke-opacity=".08" stroke-width="1"/><path d="M-15 -12 A19 19 0 0 1 -4 -18.6" fill="none" stroke="#fff" stroke-opacity=".25" stroke-width="1.6" stroke-linecap="round"/><circle r="8" fill="${r.color}"/><circle r="1.4" fill="#1f1c22"/></svg>`;
  function body() {
    const now = !state.musicOff && current();
    return `<div class="rec-list">${have().map((r) => `<button type="button" class="rec${now && now.id === r.id ? ' on' : ''}" data-act="music-rec" data-id="${r.id}">${disc(r, now && now.id === r.id)}
      <span class="rec-text"><ruby class="rec-name">${esc(r.name)}<rt>${esc(r.kana)}</rt></ruby><span class="muted small">${esc(r.zh)}・${esc(r.style)}</span></span>${now && now.id === r.id ? '<span class="rec-now">播放中</span>' : ''}</button>`).join('')}</div>
      <div class="row-wrap mt-3"><button type="button" class="btn btn-sm" data-act="music-stop">${state.musicOff ? '放下唱針' : '停下來'}</button></div>`;
  }
  function pick() { openModal('留聲機', body(), { width: 420, noFocus: true }); }
  function redo() { saveState(); const b = document.getElementById('modalBody'); if (b) b.innerHTML = body(); }
  const put = (id) => { state.record = id; state.musicOff = false; redo(); };
  const pause = () => { state.musicOff = !state.musicOff; redo(); };
  return { RECORDS, sync, pick, put, pause, render, playing: () => Boolean(play) && wanted(), mode: () => play && play.mode };
})();
// outside 擺設 a tap on a ware sends the hero to stand beside it, facing it; at the telescope they look into it (test: 觀星)
function yardUse(yard, id) {
  const o = yardPlaced().find((q) => q.id === id); if (!yard || !o) return;
  const side = yh.X <= o.p.x ? -1 : 1, gx = o.p.x + side * (o.it.ground[0] * yScale(o.p.y) / 2 + 16);
  yHeroWalk(yard, [gx, Math.max(12, o.p.y - 4)], () => {
    const el = yard.querySelector('.yhero'); if (!el) return;
    yh.flip = side > 0; yh.back = false; yh.turn = true; yHeroPlace(yard);   // turned to it
    if (id === 'telescope') { el.classList.add('look'); setTimeout(() => { el.classList.remove('look'); if (yard.isConnected) SCOPE.open(yard); }, 700); }
    if (id === 'pond') { el.classList.add('crouch'); setTimeout(() => el.classList.remove('crouch'), 1500); pondStir(yard, side); }
    if (YARD.ART[id] && YARD.ART[id].glow) {   // a lamp (test, 2026-11-09): switched on or off
      if (lampOff(id)) delete state.lampsOff[id]; else state.lampsOff[id] = true; saveState();
      const b = yard.querySelector(`.yware[data-ware="${id}"]`); if (b) b.classList.toggle('off', lampOff(id));
    }
  });
}
// the pond (test, 2026-11-09): the hero crouches at its edge and dips a hand in — rings spread from there, and a koi leaps out
// across and splashes back in with rings of its own
function pondStir(yard, side) {
  const svg = yard.querySelector('.yware[data-ware="pond"] svg.art'); if (!svg) return;
  const old = svg.querySelector('.stir'); if (old) old.remove();
  const rings = (x, y, w) => [0, 0.35, 0.7].map((d) => `<ellipse class="rip" cx="${x}" cy="${y}" rx="6" ry="1.6" style="--w:${(w + d).toFixed(2)}s"/>`).join('');
  const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  g.setAttribute('class', 'stir'); g.setAttribute('transform', side > 0 ? 'scale(-1 1)' : '');
  g.innerHTML = `${rings(-74, -18, 0)}${rings(-14, -22, 1.05)}${rings(26, -20, 1.75)}
    <g class="leap"><path d="M10 0 c-5 -5 -15 -5 -20 0 c5 5 15 5 20 0 Z M-10 0 l-8 -5 v10 Z" fill="#f08a3c"/><circle cx="4" cy="-1.6" r="2.2" fill="#fff"/></g>
    ${[[-18, -24, -3, -9], [-12, -24, 2, -11], [22, -22, -2, -10], [28, -22, 4, -8]].map(([x, y, dx, dy], i) => `<circle class="spl" cx="${x}" cy="${y}" r="1.6" style="--dx:${dx}px;--dy:${dy}px;--w:${i < 2 ? 0.95 : 1.7}s"/>`).join('')}`;
  svg.appendChild(g); svg.closest('.yware').classList.add('stirred');
  setTimeout(() => { g.remove(); if (!svg.querySelector('.stir')) svg.closest('.yware').classList.remove('stirred'); }, 3600);
}
function renderOutside(view, place = 'yard') {
  sceneTick();
  const pct = ringPct(dayProgress());
  const yard = view.querySelector('.yard');
  if (yard && (yard.dataset.house !== (state.house || '') || yard.dataset.place !== place || (yard.dataset.sig !== TOWNEV.sig(place) && !TALK.on()))) { yard.remove(); }   // the house changed (another device), the other place, or who is about (TOWNEV): drawn anew
  else if (yard) {   // a redraw: new stars fade in, the motion carries on; the yard's things again only if they moved (sync, another device)
    yardLevel(yard, pct);
    const w = yard.querySelector('.ywares'); if (w && !yed.on && w.dataset.sig !== yardSig()) { w.innerHTML = yardWaresHtml(); w.dataset.sig = yardSig(); }
    if (place === 'yard') yWitch(yard);
    return;
  }
  yed.on = false; yed.sel = null; yed.drag = null; ypan = null; Object.assign(YCAM, { t: 0, lead: 0, free: false });   // a yard drawn anew opens out of 擺設
  cancelAnimationFrame(yh.raf); yh.climb = null; yh.s = 0; yh.z = 0; if (yh.use) { [yh.X, yh.Y] = yh.use.up; yh.use = null; }   // drawn anew: up off whatever he sat on
  if (yPlace !== place) {   // the other place's spot (test: the main road)
    yPlace = place;
    try { const q = (JSON.parse(localStorage.getItem('nq_hero') || '{}') || {})[place]; if (q && Number.isFinite(q.X) && Number.isFinite(q.Y)) { yh.X = q.X; yh.Y = q.Y; } else if (place === 'street') { yh.X = BUS.X - 70; yh.Y = 124; } } catch (e) { /* no storage */ }
  }
  const a = yh.arrive && yh.arrive.to === place ? yh.arrive : null, bus = a && BUS_PLACES.includes(a.from) && BUS_PLACES.includes(place) && BUS_IN[place];
  const way = a && (WAYS[`${a.from}>${place}`] || (bus && { in: bus })), come = way ? way.in() : null; yh.arrive = null; TALK.close();   // by the bus: off at its stop
  if (come) { [yh.X, yh.Y] = come[0]; yh.back = place === 'yard'; }
  if (!come) { if (INDOOR.includes(place)) [yh.X, yh.Y] = isoClamp([yh.X, yh.Y]); else yh.Y = Math.min(yh.Y, walkTop(place)); [yh.X, yh.Y] = yFree(place, [yh.X, yh.Y]); }   // where he was kept: on the ground (a room: its floor), not on a building nor in a thing
  view.innerHTML = yardHtml(pct, place);
  const y = view.querySelector('.yard');
  y.dataset.house = state.house || ''; y.dataset.sig = TOWNEV.sig(place);
  ycam.x = yh.fromDoor ? 0 : yh.X; yardLayout(y);   // the camera on the hero (at the door, coming out)
  if (PLACE_LOOK[place] !== undefined && !yh.fromDoor) { const m = Math.max(0, ycam.W / 2 - 70); yCamTo(y, Math.max(yh.X - m, Math.min(yh.X + m, PLACE_LOOK[place]))); }   // as near its sight as keeps him on the screen
  const ro = new ResizeObserver(() => { if (!y.isConnected) { ro.disconnect(); return; } yardLayout(y); });
  ro.observe(y.querySelector('.sky'));
  if (yh.fromDoor && place === 'yard') { yh.fromDoor = false; yh.X = 0; yh.Y = 214; yh.back = false; yHeroPlace(y); setTimeout(() => yHeroWalk(y, [8, 150]), 260); }   // out of the door, onto the lawn (below the 進屋 tag)
  else if (come && place === 'yard' && a && YARD_FAR[a.from]) {   // home from the beach or the town: up the far path, then in over the lawn
    const h = y.querySelector('.yhero'); h.classList.add('out'); yHeroPlace(y);
    setTimeout(() => yFar(y, a.from, true, () => { [yh.X, yh.Y] = yToward(come[1], come[0], 110); yh.back = false; yHeroPlace(y); h.classList.remove('out'); yHeroWalk(y, come[1]); }), 120);   // in a few steps from where the far path left off
  } else if (come) { yHeroPlace(y); setTimeout(() => yHeroWalk(y, come[1]), 200); }   // in along the path
  else yHeroPlace(y);
  if (place === 'yard') yWitch(y);
  const yel = y.querySelector('.yhero');   // idling now and then while left be
  HERO.idle(yel, () => !yh.climb && !yh.use && !document.hidden && !yel.matches('.walk, .run, .out, .hop, .wave, .spin, .cheer, .reach, .crouch, .look, .bow'), true);
  y.addEventListener('pointerdown', (e) => { y._at = yardPoint(y, e); if (!y.classList.contains('dressing')) { yardDragStart(y, e); yPanStart(y, e); } });   // _at: which seat a tap on a row of them meant
  y.addEventListener('pointermove', (e) => { yardDragMove(y, e); yPanMove(y, e); });
  y.addEventListener('pointerup', (e) => { yardDragEnd(y); yPanEnd(y, e); }); y.addEventListener('pointercancel', (e) => { yardDragEnd(y); yPanEnd(y, e); });
  y.addEventListener('click', (e) => {   // a tap on the lawn: the hero walks there (in 擺設: the picked ware goes there)
    if (yh.far && !e.target.closest('.yard-tools')) { yh.far(); return; }   // on the long way down: there at once
    if (y._noClick || y.classList.contains('dressing') || e.target.closest('button, .hero, a, .dress')) return;
    const at = yardPoint(y, e);
    if (yed.on) { if (yed.sel) yardMoveTo(y, yed.sel, at); return; }
    if (!INDOOR.includes(place) && (at.y < 4 || at.y > 222)) return;
    yHeroWalk(y, [at.x, at.y]);   // in a room: onto its floor
  });
  let swallow = false;   // the buttons up top while they rest: a first tap only brings them back (as in 書房)
  y.addEventListener('pointerdown', (e) => { swallow = y.classList.contains('quiet') && !!e.target.closest('.yard-tools'); }, true);
  y.addEventListener('click', (e) => { if (swallow) { swallow = false; e.stopPropagation(); e.preventDefault(); } }, true);
  let restT = 0;   // the signs: in sight when the yard opens and after a touch, out of sight 4 s later (a tap on a thing still works)
  const wake = () => { y.classList.remove('quiet'); clearTimeout(restT); restT = setTimeout(() => { if (y.isConnected) y.classList.add('quiet'); }, 4000); };
  y._wake = wake;   // the witch's 言靈 keep the 言靈 button up while they fly in
  y.addEventListener('pointerdown', wake); y.addEventListener('pointerup', wake);
  y.addEventListener('pointermove', (e) => { if (e.pointerType === 'mouse' && !e.buttons) wake(); });   // a mouse over the yard
  wake();
}
function kotoButtons(root) {   // the 言靈 button up top (書房, the yard) with the balance now
  root.querySelectorAll('.study-koto').forEach((kb) => { kb.querySelector('span').textContent = kotoBalance(); kb.setAttribute('aria-label', `言靈 ${kotoBalance()}，到古道具屋`); });
}
// a swipe on the yard (1.2.0): one finger anywhere but on a button (a ware outside 擺設 too) looks along the yard; let go
// moving, it coasts on; pulled past an end, it springs back
function yPanStart(yard, e) {
  if (yed.drag || !yCamMax() || (e.pointerType === 'mouse' && e.button !== 0) || e.target.closest('.yard-tools, .yedit, .dress, .yhero, .talk, a') || (e.target.closest('button') && !e.target.closest('.yworld')) || (yed.on && e.target.closest('.yware'))) return;   // a finger on someone or something in the scene may still swipe (2026-11-10, the user: swipes went dead in the rooms)
  cancelAnimationFrame(ycoast); yard.querySelector('.yworld').classList.remove('glide');
  ypan = { id: e.pointerId, x0: e.clientX, y0: e.clientY, c0: ycam.x, on: false, hist: [] };
}
const YSWIPE = 1.8;   // test (2026-11-09; the user: less swiping out of doors): the view goes this much further than the finger, and coasts as much faster
function yPanMove(yard, e) {
  if (!ypan || e.pointerId !== ypan.id) return;
  const dx = e.clientX - ypan.x0, dy = e.clientY - ypan.y0;
  if (!ypan.on) {
    if (Math.abs(dx) < 8 || Math.abs(dx) < Math.abs(dy)) return;
    ypan.on = true; YCAM.free = true; try { yard.setPointerCapture(e.pointerId); } catch (err) { /* a pointer the page did not see go down */ }
  }
  yCamTo(yard, ypan.c0 - dx * YSWIPE, 0.3);
  ypan.hist.push([performance.now(), e.clientX]); if (ypan.hist.length > 8) ypan.hist.shift();
}
function yPanEnd(yard, e) {
  if (!ypan || e.pointerId !== ypan.id) return;
  const p = ypan; ypan = null; if (!p.on) return;
  yard._noClick = true; setTimeout(() => { yard._noClick = false; }, 0);   // the click that ends a swipe is no tap
  const m = yCamMax(), w = yard.querySelector('.yworld');
  if (Math.abs(ycam.x) > m) { w.classList.add('glide'); yCamTo(yard, Math.max(-m, Math.min(m, ycam.x))); setTimeout(() => w.classList.remove('glide'), 380); return; }
  const now = performance.now(), h = p.hist.filter((q) => now - q[0] < 100);
  if (h.length < 2 || (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches)) return;
  let v = YSWIPE * (h[0][1] - h[h.length - 1][1]) / Math.max(16, h[h.length - 1][0] - h[0][0]), t0 = now;   // px a ms
  if (Math.abs(v) < 0.1) return;
  const step = (t) => {
    const dt = Math.min(50, t - t0); t0 = t;
    const x0 = ycam.x; yCamTo(yard, ycam.x + v * dt); v *= Math.pow(0.94, dt / 16);
    if (yard.isConnected && ycam.x !== x0 && Math.abs(v) > 0.02) ycoast = requestAnimationFrame(step);
  };
  ycoast = requestAnimationFrame(step);
}
function yardLevel(yard, pct) {
  kotoButtons(yard);
  const f = pct / 100;
  yard.style.setProperty('--f', f);
  yard.classList.toggle('full', pct >= 100);
  yard.querySelectorAll('.st').forEach(el => el.classList.toggle('on', Number(el.dataset.t) <= f));
  mailboxLevel();
}
// the sky's layout, the same every day (a fixed seed): each star carries the share of the list that lights it — six faint ones
// from the start, the rest by 80%, the seven of the constellation at 100%; fireflies and flowers spread along the yard's whole
// width (1.2.0: 1200px, a phone sees a third of it at a time)
const SKY = (() => {
  let a = 20261106;
  const rnd = () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };   // mulberry32
  const r2 = (x) => Math.round(x * 100) / 100;
  const stars = Array.from({ length: 72 }, (_, i) => ({ x: r2(rnd() * 100), y: r2(rnd() * 100), s: r2(rnd() < 0.12 ? 2.2 + rnd() * 0.6 : 1 + rnd() * 1.1), t: i < 6 ? 0 : r2(0.8 * (i - 5) / 66), d: r2(2 + rnd() * 3.5), w: r2(rnd() * 5) }));
  [[60, 15], [66, 13], [72, 16], [77, 21], [75, 28], [83, 30], [85, 23]].forEach(([x, y], i) => stars.push({ x, y, s: 2.6, t: 1, d: 3, w: i * 0.4, dip: true }));
  const flies = Array.from({ length: 30 }, () => ({ x: r2(4 + rnd() * 92), y: Math.round(rnd() * 160), dx: Math.round(rnd() * 60 - 30), dy: Math.round(rnd() * 30 - 15), d: r2(5 + rnd() * 5), w: r2(rnd() * 6) }));
  const flowers = Array.from({ length: 40 }, () => ({ x: r2(3 + rnd() * 94), y: Math.round(150 + rnd() * 56), c: ['#ff9ec4', '#ffffff', '#ffd166', '#c9a7ff', '#ff8a8a'][Math.floor(rnd() * 5)], d: r2(2.5 + rnd() * 2), w: r2(rnd() * 3) }));
  // faint ones (2026-11-10, the user: night was too dark): there every night, small and dim, a third of them twinkling slowly
  const faint = Array.from({ length: 78 }, (_, i) => `<circle cx="${r2(rnd() * 100)}%" cy="${r2(rnd() * 72)}%" r="${r2(0.5 + rnd() * 0.7)}"${i % 3 ? '' : ' class="tw"'}/>`);
  return { stars, flies, flowers, faint: `<svg class="faint" aria-hidden="true"><g>${faint.filter((c) => !c.includes('tw')).join('')}</g><g class="tw">${faint.filter((c) => c.includes('tw')).join('')}</g></svg>` };
})();
// 古道具屋 on its hill (1.2.0): an old wooden shop, a tiled roof with turned-up eaves, a 古 noren, a paper lantern, a pot and
// a box outside, 福爺 at the door; by night the lantern and the doorway glow, so do the lamps on the path
const HILL = 'M320 600 V356 C370 340 412 304 446 276 C460 264 470 252 482 250 C494 248 506 256 520 268 C552 296 594 326 646 350';
const SHOP_ART = `<circle class="s-glow" cx="0" cy="-18" r="48" fill="url(#shopGlow)"/><path class="s-ground" d="M-36 2 Q0 -4 36 2 L36 5 L-36 5 Z"/>
  <rect class="s-wall" x="-20" y="-25" width="40" height="26"/><path class="s-beam" d="M-20 -25 H20 V-22 H-20 Z M-20 -12 H-13 V-10 H-20 Z M13 -12 H20 V-10 H13 Z"/>
  <rect class="s-open" x="-12" y="-20" width="24" height="21"/><path class="s-noren" d="M-13 -21 H13 V-9 H8.9 V-12 H4.3 V-9 H0.1 V-12 H-4.3 V-9 H-8.6 V-12 H-13 Z"/><text class="s-ko" x="0" y="-13.4" text-anchor="middle">古</text>
  <path class="s-roof" d="M-29 -21 Q-25 -22 -22 -25 L-14 -36 H14 L22 -25 Q25 -22 29 -21 Z"/><path class="s-rim" d="M-29 -21 Q-25 -22 -22 -25 L-14 -36 H14 L22 -25 Q25 -22 29 -21"/><path class="s-tile" d="M-17 -32 H17 M-20 -28 H20"/>
  <rect class="s-sign" x="-9" y="-35" width="18" height="6" rx=".8"/><line class="s-cord" x1="23" y1="-22" x2="23" y2="-18.5"/><ellipse class="s-paper" cx="23" cy="-14" rx="3.3" ry="4.4"/><path class="s-band" d="M19.9 -15.6 H26.1 M19.9 -12.4 H26.1"/>
  <path class="s-pot" d="M-27 1 C-30 -2 -30 -7 -27 -9 H-23 C-20 -7 -20 -2 -23 1 Z"/><rect class="s-pot-rim" x="-27.6" y="-10.4" width="5.2" height="1.6" rx=".6"/><rect class="s-box" x="21" y="-5" width="9" height="6"/><rect class="s-box2" x="22.5" y="-9" width="6" height="4"/>
  <g class="s-owl"><ellipse cx="-16" cy="-3.6" rx="3.2" ry="3.8"/><path d="M-18.6 -6.6 L-18 -8.6 L-16.6 -7 M-13.4 -6.6 L-14 -8.6 L-15.4 -7"/><circle class="s-owl-eye" cx="-17.2" cy="-4.6" r=".9"/><circle class="s-owl-eye" cx="-14.8" cy="-4.6" r=".9"/></g>`;
// the house in the yard: the cottage, or a look bought at 古道具屋 (1.2.0: 蘑菇屋), drawn in the same 140 × 130 box with its
// windows, chimney and door where the cottage has them (the lights by night, the smoke and 進屋 stay where they are)
const hc = (c, n) => `class="hc" style="--c:${c};--n:${n}"`, hs = (c, n) => `class="hs" style="--c:${c};--n:${n}"`;
const hcx = (cls, c, n, more = '') => `class="hc ${cls}" style="--c:${c};--n:${n};${more}"`, hsx = (cls, c, n, more = '') => `class="hs ${cls}" style="--c:${c};--n:${n};${more}"`;   // with a class of its own (a moving part, 2026-11-10)   // a part of a house: its colour by day, by night
const HOUSE_ART = {
  // 2026-11-10 (the user: a box with a triangle on it): a brick chimney, the roof in shingles with its fascia, clapboard walls with
  // corner boards on a stone footing, the shade under the eaves; windows framed, with sills, shutters and boxes of flowers; the door
  // framed and panelled under a little gabled canopy, a lamp beside it lit by night, a mat; bushes at the corners; two stone steps
  // down to the lawn, where the path begins (it ran into the door): each a light tread over a shaded riser, a shadow on the grass
  // under them, so they read as standing out in front of the house (a flat grey shape looked like a lump under the door)
  cottage: `<rect class="chim" x="92" y="30" width="12" height="30"/><path class="brick" d="M92 36 H104 M92 42 H104 M92 48 H104 M92 54 H104 M98 30 V36 M95 36 V42 M101 36 V42 M98 42 V48 M95 48 V54 M101 48 V54 M98 54 V60"/><rect class="roof" x="89" y="27" width="18" height="5" rx="1"/>
    <rect class="wall" x="22" y="66" width="96" height="64"/><path class="siding" d="M22 77 H118 M22 85 H118 M22 93 H118 M22 101 H118 M22 109 H118 M22 117 H118"/><path class="eave" d="M22 66 H118 V72 H22 Z"/>
    <rect class="trim" x="22" y="66" width="4" height="60"/><rect class="trim" x="114" y="66" width="4" height="60"/><rect class="stone" x="20" y="124" width="100" height="6"/><path class="brick" d="M34 124 V130 M52 124 V130 M88 124 V130 M106 124 V130"/>
    <path class="roof" d="M10 72 L70 20 L130 72 Z"/><path class="shingle" d="M24 60 H116 M36 50 H104 M47 40 H93 M58 31 H82 M40 60 v-4 M56 60 v-4 M72 60 v-4 M88 60 v-4 M104 60 v-4 M48 50 v-4 M64 50 v-4 M80 50 v-4 M96 50 v-4 M58 40 v-4 M74 40 v-4 M86 40 v-4 M68 31 v-3"/><path class="fascia" d="M9 73 L70 19.5 L131 73"/><path class="rim" d="M10 72 L70 20 L130 72 M89 27 H107"/>
    <circle class="trim" cx="70" cy="52" r="7.6"/><circle class="pane" cx="70" cy="52" r="6"/><path class="mull" d="M70 46 V58 M64 52 H76"/>
    <rect class="shutter" x="27.5" y="81" width="5.5" height="20" rx="1"/><rect class="shutter" x="53" y="81" width="5.5" height="20" rx="1"/><rect class="shutter" x="81.5" y="81" width="5.5" height="20" rx="1"/><rect class="shutter" x="107" y="81" width="5.5" height="20" rx="1"/><path class="slat" d="M28.5 85 h3.5 M28.5 89 h3.5 M28.5 93 h3.5 M28.5 97 h3.5 M54 85 h3.5 M54 89 h3.5 M54 93 h3.5 M54 97 h3.5 M82.5 85 h3.5 M82.5 89 h3.5 M82.5 93 h3.5 M82.5 97 h3.5 M108 85 h3.5 M108 89 h3.5 M108 93 h3.5 M108 97 h3.5"/>
    <rect class="trim" x="32.5" y="80.5" width="21" height="21" rx="2.5"/><rect class="trim" x="86.5" y="80.5" width="21" height="21" rx="2.5"/>
    <rect class="pane" x="34" y="82" width="18" height="18" rx="2"/><rect class="pane" x="88" y="82" width="18" height="18" rx="2"/>
    <path class="mull" d="M43 82 V100 M34 91 H52 M97 82 V100 M88 91 H106"/>
    <rect class="trim" x="31" y="100.5" width="24" height="2.6" rx="1"/><rect class="trim" x="85" y="100.5" width="24" height="2.6" rx="1"/>
    <rect class="fbox" x="32" y="103" width="22" height="5" rx="1"/><rect class="fbox" x="86" y="103" width="22" height="5" rx="1"/>${[[35, '#e86f5e'], [39, '#f2c94c'], [43, '#e58fa8'], [47, '#ffffff'], [51, '#e86f5e'], [89, '#f2c94c'], [93, '#e58fa8'], [97, '#e86f5e'], [101, '#ffffff'], [105, '#f2c94c']].map(([x, c], k) => `<circle class="leafy" cx="${x + 1}" cy="${102.6 - (k % 2)}" r="2.2"/><circle class="flower" cx="${x}" cy="${101.4 - (k % 2) * 1.2}" r="1.5" style="fill:${c}"/>`).join('')}
    <path class="roof" d="M53 101 L70 91.5 L87 101 Z"/><path class="rim" d="M53 101 L70 91.5 L87 101"/><path class="trim" d="M58.5 130 V108.2 a11.5 11.5 0 0 1 23 0 V130 Z"/>
    <path class="door" d="M61 130 V108 a9 9 0 0 1 18 0 V130 Z"/><path class="panel" d="M64.5 126 V112 h11 V126 Z M64.5 118 h11"/><circle class="knob" cx="75.5" cy="120" r="1.3"/>
    <circle class="lampglow" cx="88.5" cy="111" r="9"/><path class="trim" d="M86 105 h5 v2.4 h-5 Z"/><path class="lamp" d="M86.2 107.4 h4.6 l-.9 5.6 h-2.8 Z"/>
    <circle class="bush" cx="20" cy="125" r="7"/><circle class="bush" cx="28" cy="128" r="5"/><circle class="bush" cx="120" cy="125" r="7"/><circle class="bush" cx="112" cy="128" r="5"/>
    <ellipse class="stepshade" cx="70" cy="139.6" rx="25" ry="2.6"/><path class="tread" d="M57.5 129.6 H82.5 L84.2 131.8 H55.8 Z"/><path class="riser" d="M55.8 131.8 H84.2 V134.2 H55.8 Z"/><path class="tread" d="M53.5 134.2 H86.5 L88.6 136.8 H51.4 Z"/><path class="riser" d="M51.4 136.8 H88.6 V139.4 H51.4 Z"/>
    <path class="sill" d="M59 130 H81"/><rect class="mat" x="63" y="130.2" width="14" height="1.6" rx=".8"/>`,
  mushroomhouse: `<rect class="m-pipe" x="94" y="9" width="7" height="20" rx="1.5"/><rect class="m-pipe" x="92.5" y="7" width="10" height="4" rx="1"/>
    <path class="m-stem" d="M30 130 C20 114 22 90 38 72 H102 C118 90 120 114 110 130 Z"/><path class="m-shade" d="M38 72 H102 C104 75 106 78 108 81 C84 87 56 87 32 81 C34 78 36 75 38 72 Z"/>
    <path class="m-gill" d="M12 72 C40 85 100 85 128 72 C100 80 40 80 12 72 Z"/>
    <path class="m-cap" d="M6 72 C4 34 36 11 70 11 C104 11 136 34 134 72 C110 80 30 80 6 72 Z"/><path class="rim" d="M6 72 C4 34 36 11 70 11 C104 11 136 34 134 72"/>
    <circle class="m-dot" cx="36" cy="38" r="8"/><circle class="m-dot" cx="64" cy="24" r="5.5"/><circle class="m-dot" cx="102" cy="40" r="8.5"/><circle class="m-dot" cx="20" cy="60" r="5"/>
    <circle class="m-dot" cx="120" cy="61" r="5.5"/><circle class="m-dot" cx="88" cy="22" r="4"/><circle class="m-dot" cx="50" cy="60" r="4.2"/><circle class="m-dot" cx="94" cy="62" r="4.6"/>
    <circle class="pane" cx="70" cy="48" r="6"/><path class="mull" d="M70 42 V54 M64 48 H76"/>
    <circle class="pane" cx="45" cy="96" r="8"/><circle class="pane" cx="95" cy="96" r="8"/><path class="mull" d="M45 88 V104 M37 96 H53 M95 88 V104 M87 96 H103"/>
    <path class="door" d="M61 130 V108 a9 9 0 0 1 18 0 V130 Z"/><circle class="knob" cx="75" cy="120" r="1.3"/>
    <path class="m-grass" d="M26 130 q2 -7 4 0 q2 -5 4 0 M106 130 q2 -6 4 0 q2 -7 4 0"/>`,
  // test (2026-11-09): 薑餅屋, 樹墩屋, 茶壺屋 and, sold for Halloween, 南瓜屋 — each part coloured by day and by night (hc／hs)
  gingerhouse: `<rect ${hc('#b8584a', '#1e1424')} x="92" y="30" width="12" height="30"/><rect ${hc('#fffaf2', '#4a4668')} x="90" y="27" width="16" height="5" rx="2.5"/>
    <rect ${hc('#c98a4f', '#20161c')} x="20" y="66" width="100" height="64" rx="2"/>
    <path ${hc('#a8653c', '#1a1220')} d="M8 72 L70 20 L132 72 Z"/><path ${hs('#fffaf2', '#4a4668')} stroke-width="5" d="M8 72 L70 20 L132 72"/>
    <path ${hc('#fffaf2', '#4a4668')} d="M6 69 H134 V74 H6 Z${[14, 26, 38, 50, 62, 74, 86, 98, 110, 122].map((x, i) => ` M${x} 73 v${i % 2 ? 4 : 7} a3 3 0 0 0 6 0 v-${i % 2 ? 4 : 7} Z`).join('')}"/>
    ${[[44, 52, '#f27fa6', '#3a1a34'], [70, 36, '#7cc47a', '#16301e'], [96, 52, '#f4c542', '#3a3016'], [58, 61, '#6fa8e8', '#18244a'], [84, 62, '#f27fa6', '#3a1a34']].map(([x, y, c, n]) => `<path ${hc(c, n)} d="M${x - 4.5} ${y + 2} a4.5 4.5 0 0 1 9 0 Z"/>`).join('')}
    <circle class="pane" cx="70" cy="50" r="6"/><path class="mull" d="M70 44 V56 M64 50 H76"/><circle ${hs('#fffaf2', '#4a4668')} stroke-width="2.4" cx="70" cy="50" r="7.4"/>
    <rect class="pane" x="34" y="82" width="18" height="18" rx="2"/><rect class="pane" x="88" y="82" width="18" height="18" rx="2"/><path class="mull" d="M43 82 V100 M34 91 H52 M97 82 V100 M88 91 H106"/>
    <rect ${hs('#fffaf2', '#4a4668')} stroke-width="2.4" x="32.5" y="80.5" width="21" height="21" rx="3"/><rect ${hs('#fffaf2', '#4a4668')} stroke-width="2.4" x="86.5" y="80.5" width="21" height="21" rx="3"/>
    <path class="door" d="M61 130 V108 a9 9 0 0 1 18 0 V130 Z"/><circle class="knob" cx="75" cy="120" r="1.3"/><path ${hs('#fffaf2', '#4a4668')} stroke-width="2.4" d="M59 130 V108 a11 11 0 0 1 22 0 V130"/>
    <path ${hs('#fffaf2', '#4a4668')} stroke-width="3" d="M88 130 V113 a4 4 0 0 1 8 0"/><path ${hs('#d8463c', '#3a1a2a')} stroke-width="3" stroke-dasharray="2.4 2.4" d="M88 130 V113 a4 4 0 0 1 8 0"/>
    ${[[28, 122, '#7cc47a', '#16301e'], [40, 124, '#f4c542', '#3a3016'], [104, 124, '#f27fa6', '#3a1a34'], [114, 121, '#6fa8e8', '#18244a']].map(([x, y, c, n]) => `<circle ${hc(c, n)} cx="${x}" cy="${y}" r="2.6"/>`).join('')}`,
  stumphouse: `<rect ${hc('#a39d94', '#14152e')} x="92" y="18" width="10" height="26"/><rect ${hc('#8a847b', '#101126')} x="90" y="15" width="14" height="4" rx="1"/>
    <path ${hc('#9a6a42', '#1a1426')} d="M22 130 C18 112 23 84 24 42 H116 C117 84 122 112 118 130 Z M26 118 C18 123 10 128 2 130 H30 Z M114 118 C122 123 130 128 138 130 H110 Z"/>
    <path ${hs('#7a4f30', '#0e0c1e')} stroke-width="1.6" d="M34 58 C32 80 34 100 32 122 M54 62 C53 72 55 82 54 92 M108 56 C110 78 108 100 110 124 M86 104 V126"/>
    <ellipse ${hc('#e8c690', '#2a2238')} cx="70" cy="42" rx="46" ry="10"/><g ${hs('#c99c62', '#1c1730')} stroke-width="1.3"><ellipse cx="70" cy="42" rx="34" ry="7"/><ellipse cx="70" cy="42" rx="22" ry="4.6"/><ellipse cx="70" cy="42" rx="10" ry="2"/></g>
    <g ${hc('#7fb069', '#12241e')}><ellipse cx="30" cy="48" rx="9" ry="4"/><ellipse cx="50" cy="51" rx="7" ry="3.2"/><ellipse cx="110" cy="48" rx="8" ry="4"/><ellipse cx="26" cy="126" rx="7" ry="3.4"/></g>
    <path ${hs('#5f8f4a', '#12241e')} stroke-width="2" d="M58 42 C58 36 58 32 57 28"/><path ${hc('#7fb069', '#12241e')} d="M57 30 C50 22 42 25 44 29 C48 32 53 32 57 30 Z M57 28 C61 19 71 18 71 22 C68 28 62 29 57 28 Z"/>
    <circle class="pane" cx="70" cy="62" r="6"/><path class="mull" d="M70 56 V68 M64 62 H76"/>
    <circle class="pane" cx="45" cy="96" r="8"/><circle class="pane" cx="95" cy="96" r="8"/><path class="mull" d="M45 88 V104 M37 96 H53 M95 88 V104 M87 96 H103"/>
    <circle ${hs('#e8c690', '#2a2238')} stroke-width="2" cx="45" cy="96" r="9.4"/><circle ${hs('#e8c690', '#2a2238')} stroke-width="2" cx="95" cy="96" r="9.4"/>
    <path class="door" d="M61 130 V108 a9 9 0 0 1 18 0 V130 Z"/><circle class="knob" cx="75" cy="120" r="1.3"/><path ${hs('#e8c690', '#2a2238')} stroke-width="2" d="M59.5 130 V108 a10.5 10.5 0 0 1 21 0 V130"/>
    <rect ${hc('#f3e6d0', '#1a1830')} x="124" y="123" width="4" height="7" rx="1.5"/><path ${hc('#d4473a', '#2a1838')} d="M119 124 C119 116 133 116 133 124 Z"/><circle ${hc('#fff8ec', '#4a3c66')} cx="124" cy="120" r="1.2"/>`,
  teapothouse: `<rect ${hc('#5e7f9c', '#141a36')} x="92" y="22" width="8" height="26" rx="2"/><rect ${hc('#4d6a84', '#10142c')} x="90" y="19" width="12" height="4" rx="1.5"/>
    <path ${hs('#6fa3b8', '#151a36')} stroke-width="9" d="M118 72 C142 72 142 118 114 116"/>
    <path ${hc('#9fd0de', '#18203e')} d="M26 98 C14 92 10 80 4 66 L12 62 C17 72 23 80 32 85 Z"/><ellipse ${hc('#6fa3b8', '#151a36')} cx="8" cy="64" rx="5" ry="2.6" transform="rotate(-28 8 64)"/>
    <path ${hc('#9fd0de', '#18203e')} d="M70 50 C110 50 128 70 128 94 C128 112 118 124 108 130 H32 C22 124 12 112 12 94 C12 70 30 50 70 50 Z"/>
    <rect ${hc('#6fa3b8', '#151a36')} x="34" y="126" width="72" height="4" rx="2"/>
    <path ${hs('#fffaf2', '#3a4268')} stroke-width="4" d="M16 80 C40 72 100 72 124 80"/>${[30, 50, 90, 110].map((x) => `<circle ${hc('#f08bb0', '#3a1a34')} cx="${x}" cy="${x === 30 || x === 110 ? 77.5 : 75}" r="1.8"/>`).join('')}
    <path ${hc('#7fb6c8', '#141a38')} d="M34 54 C36 38 104 38 106 54 Z"/><rect ${hc('#6fa3b8', '#151a36')} x="30" y="52" width="80" height="5" rx="2.5"/><circle ${hc('#f2c14e', '#3a3016')} cx="70" cy="36" r="6"/>
    <circle class="pane" cx="70" cy="47" r="5"/><path class="mull" d="M70 42 V52 M65 47 H75"/>
    <circle class="pane" cx="45" cy="98" r="8"/><circle class="pane" cx="95" cy="98" r="8"/><path class="mull" d="M45 90 V106 M37 98 H53 M95 90 V106 M87 98 H103"/>
    <circle ${hs('#fffaf2', '#3a4268')} stroke-width="2" cx="45" cy="98" r="9.4"/><circle ${hs('#fffaf2', '#3a4268')} stroke-width="2" cx="95" cy="98" r="9.4"/>
    <path class="door" d="M61 130 V108 a9 9 0 0 1 18 0 V130 Z"/><circle class="knob" cx="75" cy="120" r="1.3"/>
    ${[[26, 110], [114, 110]].map(([x, y]) => `<g ${hc('#f08bb0', '#3a1a34')}>${[[0, -2.6], [2.5, -0.8], [1.5, 2.1], [-1.5, 2.1], [-2.5, -0.8]].map(([dx, dy]) => `<circle cx="${x + dx}" cy="${y + dy}" r="1.6"/>`).join('')}</g><circle ${hc('#f4c542', '#3a3016')} cx="${x}" cy="${y}" r="1.3"/>`).join('')}`,
  pumpkinhouse: `<rect ${hc('#5b4636', '#120e1e')} x="93" y="22" width="8" height="24" rx="2"/><rect ${hc('#4a382a', '#0e0b18')} x="91" y="19" width="12" height="4" rx="1.5"/>
    <ellipse ${hc('#e8792a', '#2a1626')} cx="38" cy="92" rx="32" ry="38"/><ellipse ${hc('#e8792a', '#2a1626')} cx="102" cy="92" rx="32" ry="38"/>
    <ellipse ${hc('#f5913a', '#33192a')} cx="70" cy="88" rx="36" ry="42"/>
    <path ${hs('#d0661f', '#1a0e1c')} stroke-width="1.6" d="M50 52 C42 72 42 110 52 128 M90 52 C98 72 98 110 88 128 M18 70 C12 88 14 110 22 124 M122 70 C128 88 126 110 118 124"/>
    <path ${hc('#6a8a3c', '#14221a')} d="M66 48 C64 40 66 32 72 28 L76 31 C72 35 71 41 73 48 Z"/><path ${hc('#7fb069', '#12241e')} d="M74 36 C82 28 94 30 96 36 C88 40 80 40 74 36 Z"/>
    <path ${hs('#6a8a3c', '#14221a')} stroke-width="1.4" d="M65 44 C57 40 56 32 62 32 C66 32 66 37 62 37"/>
    <circle class="pane" cx="70" cy="60" r="5"/><path class="mull" d="M70 55 V65 M65 60 H75"/>
    <path class="pane" d="M35 100 L45 84 L55 100 Z"/><path class="pane" d="M85 100 L95 84 L105 100 Z"/>
    <path class="door" d="M61 130 V108 a9 9 0 0 1 18 0 V130 Z"/><circle class="knob" cx="75" cy="120" r="1.3"/>`
};
const houseArt = () => HOUSE_ART[state.house && owns(state.house) && HOUSE_ART[state.house] ? state.house : 'cottage'];
// the hero out in the yard (1.2.0): the same drawing, smaller the further up the lawn (X: px from the middle, Y: px up from the
// bottom, the ground running from the bottom to the house at 218px). Walks where you tap, to the mailbox, the house and the path.
const yh = { X: 0, Y: 186, back: false, flip: false, turn: false, raf: 0, fromDoor: false, climb: null, s: 0, z: 0, use: null, far: null };   // far: on the long way down (yFar): there at once   // z: his layer when set (sat on a thing), use: sat on / riding it ({ up: where he gets off })   // climb, s: on the way up to 古道具屋, and his scale there
try { const h = JSON.parse(localStorage.getItem('nq_hero') || 'null'); if (h && h.yard && Number.isFinite(h.yard.X) && Number.isFinite(h.yard.Y)) Object.assign(yh, { X: h.yard.X, Y: h.yard.Y }); } catch (e) { /* first time out */ }
let yPlace = 'yard';   // the yard or the main road (#/street): where the hero is out, each its own spot in nq_hero
function yHeroSave() { try { const h = JSON.parse(localStorage.getItem('nq_hero') || '{}') || {}; const [X, Y] = yh.use ? yh.use.up : [yh.X, yh.Y]; h[yPlace] = { X: Math.round(X), Y: Math.round(Y) }; localStorage.setItem('nq_hero', JSON.stringify(h)); } catch (e) { /* no storage */ } }
const yScale = (Y) => (INDOOR.includes(yPlace) ? ISO.k : 0.19 + 0.31 * Math.max(0, Math.min(1, (212 - Y) / 198)));   // in a room (seen at 45°) one size anywhere
function yHeroHtml() { return `<div class="hero yhero" data-act="hero-hop" aria-label="主角">${HERO.svg({ wear: state.wear, look: state.look })}</div>`; }
function yHeroRedraw(yard) { const el = yard.querySelector('.yhero'); if (el) el.innerHTML = HERO.svg({ wear: state.wear, look: state.look }); }   // dressed anew
function yHeroHold(yard) {   // the dressing room opens: the hero stops where they are
  cancelAnimationFrame(yh.raf); yh.climb = null; yh.s = 0; yard.classList.remove('climbing');
  const el = yard.querySelector('.yhero'); if (!el) return;
  el.classList.remove('walk', 'run', 'climb'); yClimbLook(el, 0); HERO.still(el); yHeroPlace(yard); yHeroSave();
}
function yHeroPlace(yard) {
  const el = yard.querySelector('.yhero'); if (!el) return;
  el.style.transform = `translate(${yh.X.toFixed(1)}px,${(-yh.Y).toFixed(1)}px) scale(${(yh.s || yScale(yh.Y)).toFixed(3)})`;
  el.classList.toggle('back', yh.back); el.classList.toggle('turn', yh.turn); el.classList.toggle('flip', yh.flip); el.style.zIndex = yh.climb === 'hill' ? '' : String(yh.z || (INDOOR.includes(yPlace) ? isoZ(...isoUV(yh.X, yh.Y)) : 300 - Math.round(yh.Y)));
  if (el.matches('.walk, .run')) yFollow(yard);   // on the move: the camera goes along
}
// up the hill path: outlined about a pixel on the screen however small he gets (s: his scale; none: off the path). Set on his
// drawing, and only when the width changes, never as a CSS variable round him (his legs would begin again each time on an iPhone)
function yClimbLook(h, s) {
  const svg = h && h.querySelector('svg'); if (!svg) return;
  const px = s ? Math.round(1.3 / s * 2) / 2 : 0; if (svg._outline === px) return; svg._outline = px;
  svg.style.filter = px ? `brightness(calc(.8 + .2 * var(--day))) drop-shadow(0 0 ${px}px rgba(255, 255, 255, .95)) drop-shadow(0 0 ${px * 2}px rgba(255, 238, 200, calc(.3 + .45 * (1 - var(--day)))))` : '';
}
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
// the way from p to the goal round what stands between (the corners of the things, a little apart from them, as stepping stones;
// the shortest), the goal moved off a thing to its nearest free side. free: on the way out of the place (no top, the goal kept)
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
// ---------- the neighbours (test, 2026-11-09) ----------
// 小春 (a young hairdresser with a salon in town, #/town along the yard to the right) and ムギ (a shiba who collects old records, on the
// beach, #/beach, along the yard to the left; home: where they are to be found). Both knew the grandmother who left the hero
// the house (STORY).
// Each comes knocking at 書房's front door once (one at a time: the next not before NPC.gap later, and 書房 opened again): 小春 after the first set done, ムギ a few minutes after her (the user's call). The door
// shakes, コンコン; tapped, the hero goes and opens it, they say hello and give a present — 小春 the full-length mirror (the face and
// the hair are changed in front of it), ムギ the gramophone with its two records (one bought before: what was paid comes back).
// state.met: { id: when they came (ms; an older save's day) }. After that they are on the beach, a tap for a word. Lines: [Japanese ({漢字|かな}), 中文]
const KOHARU_LOOK = { face: 'oval', skin: '#f8dcc8', cheeks: 'blush', fringe: 'sidepart', sides: 'wave', hairBack: 'wavy', hairTop: 'none', hairColor: '#8a4a2e', eyes: 'chibi', eyeColor: '#5a3a28', brows: 'soft', mouth: 'grin', beard: 'none', topStyle: 'shirt', top: '#e9e2d0', bottomStyle: 'skirt', bottom: '#e58fa8', shoeStyle: 'loafer', shoe: '#6e4f3a' };
const MUGI_ART = `<ellipse cy="-2" rx="36" ry="6" fill="#2b1c12" fill-opacity=".16"/>
  <g class="mugi-tail"><path d="M24 -30 C44 -34 48 -58 34 -64 C24 -68 18 -58 26 -54 C34 -50 30 -40 20 -40 Z" fill="#d9894a"/><path d="M30 -58 C36 -54 34 -46 28 -44" fill="none" stroke="#fbf1e2" stroke-width="5" stroke-linecap="round"/></g>
  <ellipse cy="-34" rx="29" ry="31" fill="#d9894a"/><ellipse cy="-30" rx="16" ry="23" fill="#fbf1e2"/>
  <rect x="-17" y="-24" width="12" height="24" rx="6" fill="#d9894a"/><rect x="5" y="-24" width="12" height="24" rx="6" fill="#d9894a"/><ellipse cx="-11" cy="-3" rx="7" ry="4.6" fill="#fbf1e2"/><ellipse cx="11" cy="-3" rx="7" ry="4.6" fill="#fbf1e2"/>
  <path d="M-20 -60 Q0 -48 20 -60 L10 -46 Q0 -42 -10 -46 Z" fill="#d0574b"/><circle cy="-50" r="3" fill="#f2c94c"/>
  <path d="M-26 -94 L-30 -126 L-6 -104 Z" fill="#d9894a"/><path d="M-24 -98 L-26 -118 L-11 -104 Z" fill="#f2b38a"/><path d="M26 -94 L30 -126 L6 -104 Z" fill="#d9894a"/><path d="M24 -98 L26 -118 L11 -104 Z" fill="#f2b38a"/>
  <ellipse cy="-84" rx="31" ry="27" fill="#d9894a"/><path d="M-24 -78 C-22 -64 -10 -58 0 -58 C10 -58 22 -64 24 -78 C16 -72 8 -76 0 -76 C-8 -76 -16 -72 -24 -78 Z" fill="#fbf1e2"/>
  <ellipse cx="-11" cy="-97" rx="4" ry="2.6" fill="#fbf1e2"/><ellipse cx="11" cy="-97" rx="4" ry="2.6" fill="#fbf1e2"/>
  <ellipse cx="-11" cy="-86" rx="3.8" ry="4.4" fill="#2a2730"/><ellipse cx="11" cy="-86" rx="3.8" ry="4.4" fill="#2a2730"/><circle cx="-9.8" cy="-87.6" r="1.4" fill="#fff"/><circle cx="12.2" cy="-87.6" r="1.4" fill="#fff"/>
  <ellipse cy="-75" rx="5" ry="3.4" fill="#2a2730"/><path d="M-6 -69 Q-3 -66 0 -69 Q3 -66 6 -69" fill="none" stroke="#5a3a28" stroke-width="1.6" stroke-linecap="round"/>
  <ellipse cx="-20" cy="-74" rx="5" ry="2.8" fill="#f2a3a0" fill-opacity=".55"/><ellipse cx="20" cy="-74" rx="5" ry="2.8" fill="#f2a3a0" fill-opacity=".55"/>`;
const NPCS = {
  koharu: { name: '小春', role: '美容師', gift: 'fullMirror', home: 'town', at: { X: -328, Y: 130 },   // in her salon's doorway
    due: () => kotoSum(state.koto.sets) > 0 || Object.keys(state.koto.daySets).length > 0,
    hello: () => [
      ['こんにちは！{町|まち}で{美容室|びようしつ}をやっている、{小春|こはる}です。', '你好！我是在鎮上開美容院的小春。'],
      ['おばあちゃんの{髪|かみ}は、いつも{私|わたし}が{切|き}っていたんですよ。', '你外婆的頭髮，一直都是我幫她剪的喔。'],
      ['お{孫|まご}さんが{来|き}たって{聞|き}いて……これ、おばあちゃんから{預|あず}かっていたものです。', '聽說她的孫兒搬來了……這是外婆寄放在我這裡的東西。', 'gift'],
      ['{全身鏡|ぜんしんきょう}です。{髪型|かみがた}も{顔|かお}の{雰囲気|ふんいき}も、いつでも{変|か}えられますよ。', '是全身鏡喔。髮型和臉的感覺，隨時都能換。'],
      ['{町|まち}に{来|き}たら、お{店|みせ}に{寄|よ}ってくださいね！', '來鎮上的話，到店裡坐坐喔！']],
    chat: [['{今日|きょう}も{勉強|べんきょう}おつかれさま！', '今天也辛苦了！'], ['{波|なみ}の{音|おと}を{聞|き}くと、{落|お}ち{着|つ}くんだ。', '聽著海浪的聲音，心情就會平靜下來。'],
      ['{鏡|かがみ}、{使|つか}ってる？{新|あたら}しい{髪型|かみがた}も{似合|にあ}うと{思|おも}うよ。', '鏡子有在用嗎？我覺得新髮型也會很適合你。'], ['{今日|きょう}は{風|かぜ}が{気持|きも}ちいいね。', '今天的風好舒服呢。'],
      ['おばあちゃん、いつもお{孫|まご}さんの{話|はなし}ばかりしていましたよ。', '你外婆啊，總是在說孫兒的事呢。'], ['{子|こ}どものころ、おばあちゃんの{髪|かみ}を{切|き}らせてもらったのが、{私|わたし}の{始|はじ}まりなんです。', '小時候外婆讓我幫她剪頭髮，那就是我當美容師的開始。']] },
  mugi: { name: 'ムギ', role: '柴犬', gift: 'gramophone', home: 'beach', at: { X: -170, Y: 58 },
    due: () => met('koharu'),   // after 小春 (and NPC.gap), the user's call
    hello: (paid) => [
      ['わん！はじめまして、ムギだワン。', '汪！初次見面，我是ムギ。'],
      ['おばあちゃんとは、よく{海辺|うみべ}でレコードを{聞|き}いたワン。', '我以前常和你外婆在海邊聽唱片。'],
      ['きみが{耳|みみ}で{日本語|にほんご}を{聞|き}いているって、{風|かぜ}のうわさで{聞|き}いたワン。これ、おばあちゃんの{蓄音機|ちくおんき}だワン！', '聽風說你在用耳朵聽日文。這是你外婆的留聲機！', 'gift'],
      paid ? ['あれ、もう{持|も}ってるワン？じゃあ、お{金|かね}は{返|かえ}すワン。レコードも{二枚|にまい}どうぞ。', `咦，你已經有了？那 ${paid} 言靈還你。兩張唱片也請收下。`]
        : ['{蓄音機|ちくおんき}とレコード{二枚|にまい}だワン。〈{縁側|えんがわ}の{午後|ごご}〉と〈{夜桜|よざくら}〉。', '留聲機和兩張唱片：〈縁側の午後〉和〈夜桜〉。'],
      ['いつも{海辺|うみべ}にいるワン。{新|あたら}しいレコードが{入|はい}ったら{教|おし}えるワン。またね！', '我都在海邊。有新唱片的話告訴你，再見！']],
    chat: [['{今日|きょう}のおすすめは〈{夜桜|よざくら}〉だワン。', '今天推薦〈夜桜〉。'], ['レコードの{音|おと}は、あったかいワン。', '唱片的聲音很溫暖。'],
      ['しっぽが{勝手|かって}に{揺|ゆ}れるワン。', '尾巴自己搖起來了。'], ['{波|なみ}の{音|おと}も、いい{音楽|おんがく}だワン。', '海浪的聲音也是很棒的音樂。'],
      ['おばあちゃんは、{夕方|ゆうがた}になるとここで〈{夜桜|よざくら}〉をかけたワン。', '你外婆每到傍晚，就會在這裡放〈夜桜〉。'], ['おばあちゃん、{手紙|てがみ}を{書|か}く{練習|れんしゅう}をしてたワン。だれに{書|か}いてたのかな。', '你外婆以前在練習寫信喔。不知道是要寫給誰呢。']] }
};
const met = (id) => Boolean(state.met && state.met[id]);   // a neighbour has come by
const NPC = (() => {
  // who is at the door now: the first not met whose time has come, none for a while after someone came (the user: one a day
  // was too slow — ムギ never came the day 小春 did)
  const gap = { ms: 3 * 60 * 1000 };
  const lastCame = () => Math.max(0, ...Object.values(state.met || {}).map((v) => (typeof v === 'number' ? v : Date.parse(v) || 0)));
  function visitor() {
    if (Date.now() - lastCame() < gap.ms) return null;
    return Object.keys(NPCS).find((id) => !met(id) && NPCS[id].due()) || null;
  }
  const art = (id) => (id === 'mugi' ? `<svg viewBox="-60 -200 120 210" aria-hidden="true">${MUGI_ART}</svg>` : HERO.svg({ look: KOHARU_LOOK }));
  const face = (id) => (id === 'mugi' ? `<svg viewBox="-44 -132 88 88" aria-hidden="true">${MUGI_ART}</svg>` : HERO.head(KOHARU_LOOK, 'bust'));
  // the knock (WebAudio, as the answer sounds; off with them): two dull taps on wood
  function knockSound() {
    const c = sfxReady(); if (!c) return;
    try {
      const t0 = c.currentTime + 0.02;
      [0, 0.2].forEach((d) => {
        const o = c.createOscillator(), g = c.createGain(); o.type = 'sine';
        o.frequency.setValueAtTime(190, t0 + d); o.frequency.exponentialRampToValueAtTime(80, t0 + d + 0.1);
        g.gain.setValueAtTime(0.0001, t0 + d); g.gain.exponentialRampToValueAtTime(0.4, t0 + d + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, t0 + d + 0.14);
        o.connect(g); g.connect(c.destination); o.start(t0 + d); o.stop(t0 + d + 0.16);
      });
    } catch (e) { /* no sound */ }
  }
  // 書房 open with someone at the door: コンコン by it (three times, a few seconds apart), its sign kept in sight, a word the first time
  function check() {
    const st = document.querySelector('#view .study[data-room="study"]'), id = st && !STORY.due() && visitor();   // the opening first (STORY)
    if (!st) return;
    ROOM.knock(st, Boolean(id));
    if (!id || st._knock) return;
    st._knock = true; let n = 0;
    const tap = () => {
      if (!st.isConnected || !visitor() || TALK.on()) return;
      knockSound(); const k = st.querySelector('.knock'); if (k) { k.classList.remove('on'); void k.offsetWidth; k.classList.add('on'); }
      if (!n) toast('コンコン……有人在敲門。點大門去開門看看。', 3600);
      if (++n < 3) setTimeout(tap, 7000);
    };
    setTimeout(tap, 900);
  }
  // the door opened: hello, the present, goodbye; then the room again with the present in it
  function visit(st) {
    const id = visitor(); if (!id || !st) return;
    const n = NPCS[id], w = n.gift, paid = (state.owned[w] && Number(state.owned[w].paid)) || 0;
    ROOM.knock(st, false); ROOM.guest(st, art(id));
    TALK.open(st, id, n.hello(paid), () => {
      const p = state.placed[w];
      route(); gotItem(w, p ? (p.rm === 'bed' ? '放在臥房了' : '放在書房了') : '收在收納箱了，到「擺設」拿出來擺');
    }, () => give(id, paid));
  }
  function give(id, paid) {   // the present: theirs at once (what was paid comes back), set out where it belongs if there is room
    const w = NPCS[id].gift;
    state.met = Object.assign({}, state.met, { [id]: Date.now() });
    if (paid) state.owned[w].paid = 0; else if (!state.owned[w]) state.owned[w] = { paid: 0, on: todayStr() };
    if (!state.placed[w]) ROOM.give(w);
    if (w === 'gramophone') state.musicOff = false;
    saveState();
  }
  // a new player stays in (2026-11-10, the user) until ムギ has come by with the gramophone: at the front door the hero says why —
  // first a little practice (小春 comes after the first set), then, 小春 met, a dog heard outside (ムギ, NPC.gap later)
  const housebound = () => !met('mugi');
  function stayIn(st) {
    const lines = met('koharu') ? [['あれ？ そとで いぬの こえが する……。', '咦？外面好像有狗叫聲……'], ['', '（好像有誰要來找我。在家裡再練幾題，等一下吧。）']]
      : [['まずは れんしゅう！', '先來練習！'], ['', '（外面的路還不熟。先坐到書桌前，點筆記本做一點今日練習，熟悉一下題目吧。）']];
    TALK.open(st, 'hero', lines);
  }
  return { visitor, check, visit, face, art, gap, housebound, stayIn };
})();
// the town's events (test, 2026-11-09; docs/superpowers/specs/2026-11-09-town-events-design.md): the people of events.js (TOWN)
// where their hours put them, and the next event of the course. An event opens with the course (2026-11-10: no days between
// them, so a week's learning can be met at the weekend): all of a unit passed, and of the unit being studied (入門: m0 only) the
// first once it is begun (a grammar item of it learned; m0: anything), then one more for each fifth of its grammar learned —
// once the one it follows is done. Only one waits at a time: the first whose person is now where it happens — so one that wants
// the evening lets a daytime one through — or, two study days on from the last one done, the first whatever the hour (one who
// cannot sleep to it, NAP, is not stuck on a daytime event), unless it is meant for the night
const TOWNEV = (() => {
  const T = () => TOWN;
  const units = () => ['m0'].concat(DATA.UNITS.map((u) => u.id));
  const unitIdx = (u) => units().indexOf(u);
  const reachedIdx = () => (inPreStage() ? 0 : Math.max(unitIdx(state.currentUnit), ...(state.completedUnits || []).map(unitIdx)));
  const started = (u) => (u === 'm0' ? Object.keys(state.srs || {}).length > 0 : REG.grammar.some((g) => g.u === u && state.srs['g:' + g.id]));
  const studyDaysSince = (date) => Object.keys(state.dailyLogs || {}).filter((d) => d > (date || '') && d <= todayStr() && dayActive(state.dailyLogs[d])).length;
  const lastDone = () => Object.values(state.town.done).sort().pop() || '';
  const share = (u) => { const gs = REG.grammar.filter((g) => g.u === u); return gs.length ? gs.filter((g) => state.srs['g:' + g.id]).length / gs.length : 0; };
  function opened(e) {   // by the course: its unit passed, or the one studied learned as far as the event's place among its events
    const i = unitIdx(e.u), R = reachedIdx(); if (i < 0 || i > R) return false; if (i < R) return true;
    const list = T().EVENTS.filter((x) => x.u === e.u), k = list.indexOf(e);
    return started(e.u) && (k <= 0 || share(e.u) >= k / list.length);
  }
  const openN = () => T().EVENTS.filter((e) => !state.town.done[e.id] && opened(e)).length;   // open and not done (the front door's count)
  function due() {
    const done = state.town.done;
    const can = (id) => { const c = T().CAST[id]; return Boolean(c) && (c.art !== 'npc' || met(id)); };   // 小春, ムギ: once they have knocked
    const reach = (place) => !BUS_STOPS.some((x) => x[0] === place) || Boolean(state.town.stops[place]);   // out by bus: once its stop is open
    return T().EVENTS.filter((e) => !done[e.id] && (!e.after || done[e.after]) && opened(e) && can(e.who) && reach(e.at));
  }
  const inside = (h, [from, to]) => (from <= to ? h >= from && h < to : h >= from || h < to);
  const isOpen = (shop, h = sceneHour()) => !T().HOURS[shop] || inside(h, T().HOURS[shop]);
  function whereIs(id, h = sceneHour(), day = sceneDate()) {
    const c = T().CAST[id]; if (!c || (c.art === 'npc' && !met(id))) return null;   // 小春, ムギ: once they have come by
    const we = day.getDay() === 0 || day.getDay() === 6;
    const at = c.hours.find(([from, to, , , days]) => (!days || (days === 'we') === we) && inside(h, [from, to]));
    return at ? { place: at[2], spot: at[3] } : null;
  }
  function waiting(h = sceneHour(), day = sceneDate()) {
    const list = due(); if (!list.length) return null;
    for (const e of list) { const w = whereIs(e.who, h, day); if (w && w.place === e.at) return { ev: e, place: w.place, spot: w.spot }; }
    const home = (e) => (T().CAST[e.who].hours.find((x) => x[2] === e.at) || [])[3];
    const e = list.find((x) => x.when !== 'night' && home(x));
    return e && studyDaysSince(lastDone()) >= 2 ? { ev: e, place: e.at, spot: home(e) } : null;
  }
  // the hours a sleep wakes to (TOWN.WAKE) at which an event's person is at its place, on the day one would wake
  const wakeDay = (h) => new Date(today().getTime() + (((h - now()) % 24 + 24) % 24 || 24) * 3600000);
  const slots = (e) => (T().WAKE || []).filter((h) => { const w = whereIs(e.who, h, wakeDay(h)); return Boolean(w) && w.place === e.at; });
  const calls = () => { const list = due(); return (T().WAKE || []).filter((h) => list.some((e) => slots(e).includes(h))); };   // the sleep menu's dots
  const WAKE_WORD = { 8: '早上', 12: '中午', 17: '傍晚', 20: '晚上' };
  const when = (e) => slots(e).map((h) => WAKE_WORD[h]).join('、');
  function finish(id) {   // done: the day, the people in it met, a bus stop it opens, its 10 言靈 (once: koto.found)
    const e = T().EVENTS.find((x) => x.id === id); if (!e) return;
    const t = state.town;
    if (!t.done[id]) t.done[id] = todayStr();
    [e.who].concat((e.lines || []).filter(Array.isArray).map((l) => l[0])).forEach((w) => { if (w !== 'hero') t.seen[w] = 1; });
    if (e.opens) t.stops[e.opens] = 1;
    if (!state.koto.found['ev-' + id]) state.koto.found['ev-' + id] = 10;
    saveState();
  }
  // the hour the town is drawn at: the phone's (TOWNEV.clock holds a fixed one for tests)
  const now = () => (api.clock ? api.clock.h : sceneHour()), today = () => (api.clock ? api.clock.day : sceneDate());
  const seen = (id) => (T().CAST[id].art === 'npc' ? met(id) : Boolean(state.town.seen[id]));
  const ownerOf = (shop) => Object.keys(T().CAST).find((id) => T().CAST[id].shop === shop);
  // a shop: 'prep' until its keeper is met (準備中), then 'open' or 'closed' by its hours
  // (a shop one walks into opens its door the first time an event waits inside)
  const shopState = (shop) => { const o = ownerOf(shop), w = waiting(now(), today());
    if (w && w.place === shop) return 'open';
    return !o || !seen(o) ? 'prep' : isOpen(shop, now()) ? 'open' : 'closed'; };
  // what someone wears where they are: their festival clothes (festa) at the shrine while its 緣日 is on
  const look = (id, place, h = now()) => { const c = T().CAST[id]; return c.festa && place === 'shrine' && isOpen('ennichi', h) ? Object.assign({}, c.look, c.festa) : c.look; };
  const art = (id, place) => { const c = T().CAST[id]; return c.art === 'npc' ? NPC.art(id) : HERO.svg({ look: look(id, place), wear: c.wear || {} }); };
  const face = (id) => { if (id === 'hero') return HERO.head(state.look, 'bust'); const c = T().CAST[id]; return c.art === 'npc' ? NPC.face(id) : HERO.head(c.look, 'bust'); };
  // the people at a place now: those met, where their hours put them, and whoever an event there waits on (marked ！)
  function here(place) {
    const w = waiting(now(), today()), out = [];
    Object.keys(T().CAST).forEach((id) => {
      const host = w && w.ev.who === id && w.place === place, at = host ? { place, spot: w.spot } : whereIs(id, now(), today());
      if (at && at.place === place && (host || seen(id)) && T().SPOTS[place] && T().SPOTS[place][at.spot]) out.push({ id, spot: T().SPOTS[place][at.spot], host });
    });
    return out;
  }
  // what a place shows of the town now (its shops' doors, who stands where, the mark): drawn anew when it changes
  const sig = (place) => (place === 'town' ? TOWN_SHOPS.map((x) => shopState(x[6])).join() : place === 'shrine' ? String(isOpen('ennichi', now())) : '') + '|' + here(place).map((p) => p.id + (p.host ? '!' : '')).join();
  const festival = () => isOpen('ennichi', now());
  function castHtml(place) {
    return here(place).map(({ id, spot, host }) => { const k = yScale(spot.Y) * (T().CAST[id].size || 1);
      return `<button type="button" class="hero npc npc-${id}${host ? ' ev-host' : ''}${spot.sit ? ' bench' : ''}${spot.kneel ? ' kneel' : ''}${spot.pose ? ' ' + spot.pose : ''}" data-act="npc-talk" data-npc="${id}" aria-label="${esc(T().CAST[id].name)}" style="transform:translate(${spot.X.toFixed(1)}px,${(-spot.Y).toFixed(1)}px) scale(${k.toFixed(3)});z-index:${spot.u !== undefined ? isoZ(spot.u, spot.v + (spot.sit || spot.kneel ? 0.45 : 0)) : 300 - spot.Y}">${art(id, place)}${host ? '<i class="ev-mark" aria-hidden="true">！</i>' : ''}</button>`; }).join('');
  }
  // the way to the one waiting (2026-11-10: the map joined up all round — beach | yard | town over harbor | street | park, the two
  // shops off the town, the bus's stops off the street and one another): the next step on a shortest way there, a dot on its sign
  const STOPS = ['station', 'sento', 'shrine', 'castle'];
  const ADJ = { yard: ['beach', 'town', 'street'], beach: ['yard', 'harbor'], town: ['yard', 'park', 'shokudo', 'izakaya'], street: ['yard', 'harbor', 'park'].concat(STOPS),
    harbor: ['beach', 'street'], park: ['town', 'street'], shokudo: ['town'], izakaya: ['town'] };
  STOPS.forEach((p) => { ADJ[p] = ['street'].concat(STOPS.filter((q) => q !== p)); });
  const PLACE_NAME = { yard: '院子', town: '小鎮', beach: '海邊', street: '公車站', harbor: 'みなと漁港', park: 'ひだまり公園', shokudo: 'まんぷく食堂', izakaya: '居酒屋とり吉', station: '駅前', sento: '月の湯', shrine: '稲荷神社', castle: '白鷺城' };
  function hop(from, to) {
    if (from === to || !ADJ[from]) return null;
    const first = { [from]: null }, q = [from];   // breadth first: the first step of the way each place was reached by
    while (q.length) { const at = q.shift(); for (const n of ADJ[at] || []) { if (n in first) continue; first[n] = first[at] || n; if (n === to) return first[n]; q.push(n); } }
    return null;
  }
  // nothing on: a word of what they can say by the unit reached (小春, ムギ: their old words too)
  function chatLine(id) {
    const R = reachedIdx(), own = (T().CHAT[id] || []).filter((l) => unitIdx(l[0]) <= R).map((l) => [l[1], l[2]]);
    const lines = own.concat(NPCS[id] ? NPCS[id].chat : []);
    return lines[Math.floor(Math.random() * lines.length)] || ['……', '……'];
  }
  // a tap on someone: the hero walks over, turns to them, and their event if one waits on them here (done: its 言靈, the mark
  // and the dots gone), else a word
  function talk(el) {
    const id = el.dataset.npc, yard = el.closest('.yard'), p = yard && here(yard.dataset.place).find((x) => x.id === id);
    if (!p) { if (yard) { toast(`${T().CAST[id].name}已經離開了。`); route(); } return; }   // gone home since the place was drawn
    const a = p.spot, side = yh.X <= a.X ? -1 : 1, w = p.host && waiting(now(), today()), e = w && w.ev;
    const ended = () => { finish(e.id); toast(`完成「${e.title}」・言靈 +10`, 3200); route(); };   // drawn anew: its shop open, the mark gone
    const f = a.foot || [a.X, a.Y];   // beside their feet (up on a stool: the floor under it)
    yHeroWalk(yard, [f[0] + side * 76 * yScale(f[1]), f[1] + 2], () => {
      yh.flip = side > 0; yh.back = false; yh.turn = true; yHeroPlace(yard);
      if (e) TALK.open(yard, id, e.lines, ended, null, { ev: true }); else TALK.open(yard, id, [chatLine(id)]);
    });
  }
  function shopTap(el) {   // a shop front: its keeper if they are here, else what the door says
    const shop = el.dataset.shop, st = shopState(shop), o = ownerOf(shop), sign = (TOWN_SHOPS.find((x) => x[6] === shop) || [])[5] || '';
    if (st === 'prep') { toast('這家店還在準備中，之後會開張。'); return; }
    if (st === 'closed') { const [f, t] = T().HOURS[shop]; toast(`${sign}：營業時間 ${f}:00–${t}:00，現在打烊了。`); return; }
    if (INDOOR.includes(shop)) { yGo(el, shop); return; }   // まんぷく食堂, 居酒屋とり吉: in through the door
    const p = el.closest('.yard').querySelector(`.npc-${o}`);
    if (p) talk(p); else toast(`${T().CAST[o].name}現在不在店裡。`);
  }
  const api = { unitIdx, reachedIdx, started, studyDaysSince, due, opened, openN, waiting, whereIs, isOpen, finish, clock: null, shopState, castHtml, here, art, face, talk, shopTap, chatLine, hop, PLACE_NAME, sig, seen, look, festival, slots, calls, when, now, today };
  return api;
})();
// the bed (test, 2026-11-10; the user's call): once the day's practice is done (書桌上的筆記本「今日完成」), a sleep there moves the
// world on — 書房, the yard, the town and its people — to 早上 8 點, 中午 12 點, 傍晚 5 點 or 晚上 8 點 (TOWN.WAKE; a dot where someone
// waits), as often as wanted and always on (晚上 → 早上 is the next morning); the time goes on from there for the rest of the day
// (wakeOff), and the next day is the phone's own again
const NAP = (() => {
  const NAME = { 8: '早上 8 點', 12: '中午 12 點', 17: '傍晚 5 點', 20: '晚上 8 點' };
  const done = () => ringPct(dayProgress()) >= 100;
  function body() {
    return `<p class="muted small">睡醒後，今天都照那個時間走下去；明天回到真實的時間。</p>
      <div class="nap-list">${TOWN.WAKE.map((h) => `<button type="button" class="btn nap-to" data-act="nap-to" data-h="${h}">${NAME[h]}</button>`).join('')}</div>`;
  }
  function offer() {   // lain down: the times to sleep to, or what it takes
    if (!done()) { toast('做完今日練習，就能在床上睡到想要的時間：早上、中午、傍晚或晚上。', 3600); return; }
    openModal('睡到幾點？', body(), { width: 380, noFocus: true });
  }
  function to(h) {
    let d = ((h - sceneHour()) % 24 + 24) % 24; if (d < 1 / 60) d = 24;   // always on: the hour it is now is tomorrow's
    try { localStorage.setItem('nq_wake', JSON.stringify({ day: todayStr(), off: wakeOff() + d })); } catch (e) { toast('這台裝置沒辦法記下時間。'); return; }
    TOWNEV.clock = null; closeModal();   // the test site's hour (町の手帳) gives way to the world's
    const still = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    const fade = document.createElement('div'); fade.className = 'nap-fade'; if (!still) document.body.appendChild(fade);
    setTimeout(() => { sceneTick(); route(); toast(`睡到${NAME[h]}了。`, 2600); }, still ? 0 : 700);
    setTimeout(() => fade.remove(), still ? 0 : 1500);
  }
  return { NAME, done, offer, to };
})();
// the opening (test, 2026-11-09; the user's picks): as a child the hero never understood what their Japanese grandmother said
// ("I'll learn it later"); grown up and busy in the city they never did; then a letter from Japan — she has gone, and left them
// her little house by the sea, in a town of kind people, and a diary all in Japanese they cannot read. To read it, and to
// understand the people who knew her, they move in and learn (DIARY: a page more for each stage passed). Six pictures with a
// line each, the first time 書房 opens (state.storyV: the version seen — V 2 is this one); a tap goes on, 略過 skips. The
// neighbours knock after it (NPC.check)
const GRANNY_LOOK = { face: 'round', skin: '#f3d1b5', cheeks: 'soft', fringe: 'sidepart', sides: 'short', hairBack: 'short', hairTop: 'bun', hairColor: '#a3a3a8', eyes: 'happy', eyeColor: '#5a3a28', brows: 'soft', mouth: 'smile', beard: 'none', topStyle: 'sweater', top: '#b8a27a', bottomStyle: 'skirt', bottom: '#6e4f3a', shoeStyle: 'loafer', shoe: '#6e4f3a' };
const STORY = (() => {
  const V = 2;
  const ruby = (s) => esc(s).replace(/\{([^|}]+)\|([^}]+)\}/g, '<ruby>$1<rt>$2</rt></ruby>');
  const memory = () => `<div class="story-mem"><div class="sm-fig granny">${HERO.svg({ look: GRANNY_LOOK, wear: { face: 'glasses' }, front: true })}<span class="sm-say" lang="ja">{大|おお}きくなったね。</span></div>
    <div class="sm-fig kid">${HERO.svg({ look: state.look, wear: {}, front: true })}<span class="sm-say q">？</span></div></div>`.replace(/\{([^|}]+)\|([^}]+)\}/g, '$1');
  const city = `<svg viewBox="0 0 300 200" aria-hidden="true"><rect width="300" height="200" fill="#1d2142"/>${[[10, 70, 40], [54, 40, 34], [92, 90, 46], [142, 30, 38], [184, 64, 44], [232, 46, 30], [266, 84, 40]].map(([x, t, w]) => `<rect x="${x}" y="${t}" width="${w}" height="${200 - t}" fill="#2c3160"/>${Array.from({ length: Math.floor((200 - t - 14) / 16) * 2 }, (_, k) => `<rect x="${x + 7 + (k % 2) * (w / 2 - 4)}" y="${t + 10 + Math.floor(k / 2) * 16}" width="${w / 2 - 12}" height="7" fill="${(x + k * 7) % 5 ? '#3a3f72' : '#f2d27a'}"/>`).join('')}`).join('')}
    <circle cx="250" cy="24" r="9" fill="#f4ecdc"/><text x="150" y="120" text-anchor="middle" font-size="40" fill="#f4ecdc" fill-opacity=".1" font-family="serif">忙</text></svg>`;
  const envelope = `<svg viewBox="0 0 220 160" aria-hidden="true"><rect x="16" y="26" width="188" height="118" rx="6" fill="#f6efe0" stroke="#d8ccb4" stroke-width="2"/><path d="M16 32 L110 98 L204 32" fill="none" stroke="#d8ccb4" stroke-width="2"/>
    <rect x="150" y="38" width="40" height="46" rx="2" fill="#fff" stroke="#e3907f" stroke-width="2" stroke-dasharray="4 3"/><rect x="155" y="43" width="30" height="36" fill="#bfe0f4"/><path d="M155 79 L170 54 L185 79 Z" fill="#5f88b2"/><path d="M165 62 L170 54 L175 62 L172 60 L170 63 L168 60 Z" fill="#fff"/><circle cx="178" cy="49" r="4" fill="#d0574b"/>
    <circle cx="140" cy="70" r="17" fill="none" stroke="#c8553f" stroke-width="2" stroke-opacity=".7"/><path d="M126 64 H154 M126 76 H154" stroke="#c8553f" stroke-width="1.6" stroke-opacity=".7"/>
    <path d="M40 112 H120 M40 124 H104" stroke="#9a9184" stroke-width="3" stroke-linecap="round"/><text x="40" y="100" font-size="13" fill="#6b5a48" font-family="serif">日本より</text></svg>`;
  const house = () => `<svg viewBox="0 0 300 200" aria-hidden="true"><defs><linearGradient id="stSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9fcdea"/><stop offset="1" stop-color="#f6e7cf"/></linearGradient></defs>
    <rect width="300" height="200" fill="url(#stSky)"/><circle cx="244" cy="44" r="16" fill="#fff6d8"/><rect y="118" width="300" height="34" fill="#5fa6d0"/><path d="M0 120 H300" stroke="#9acbe3" stroke-width="3"/>
    <path d="M0 200 V150 C60 134 120 128 170 134 C220 140 260 150 300 146 V200 Z" fill="#7fb26e"/><path d="M150 200 C152 180 158 166 166 156 H176 C172 168 170 184 172 200 Z" fill="#e8d6a8"/>
    <svg class="house-thumb" x="108" y="62" width="120" height="112" viewBox="0 0 140 130" style="--day:1">${HOUSE_ART.cottage}</svg></svg>`;
  const diary = () => `<div class="story-diary" lang="ja"><div class="sd-page">${DIARY.PAGES[0].ja.split('\n').map((l) => `<p>${esc(l.replace(/\{([^|}]+)\|[^}]+\}/g, '$1'))}</p>`).join('')}</div><div class="sd-page">${DIARY.PAGES[3].ja.split('\n').map((l) => `<p>${esc(l.replace(/\{([^|}]+)\|[^}]+\}/g, '$1'))}</p>`).join('')}</div><span class="sd-q">？？？</span></div>`;
  const PAGES = [
    { art: memory, zh: '小時候，外婆總是笑著跟你說話。可是她說的日文，你一句也聽不懂。' },
    { art: () => city, zh: '「以後再學就好。」長大後，你在城市裡忙得喘不過氣，日文一直沒有學。' },
    { art: () => envelope, zh: '直到某天，一封從日本寄來的信送到了你手上。外婆走了。' },
    { letter: '{大切|たいせつ}な{孫|まご}へ\n{海|うみ}の{見|み}える{小|ちい}さな{家|いえ}を、あなたに{残|のこ}します。\nこの{町|まち}の{人|ひと}たちは、みんなやさしいよ。\n{言葉|ことば}がわかれば、きっと{全部|ぜんぶ}わかるから。\nおばあちゃんより',
      zh: '給親愛的孫兒：我把看得見海的小房子留給你。這個小鎮的人都很溫柔。只要聽得懂他們說的話，你一定就會明白一切。——外婆' },
    { art: house, zh: '你來到海邊的小鎮，住進外婆的小屋。書架上，有一本寫滿日文的日記。' },
    { art: diary, zh: '你一個字也讀不懂。總有一天，要讀懂外婆寫下的每一頁，也要聽懂這個小鎮的人說的話。' }
  ];
  let el = null, i = 0;
  function show() {
    const p = PAGES[i], last = i === PAGES.length - 1;
    el.innerHTML = `<button type="button" class="story-skip" data-story="skip">略過</button>
      <div class="story-page" data-page="${i}">${p.letter ? `<div class="story-letter" lang="ja">${p.letter.split('\n').map((l) => `<p>${ruby(l)}</p>`).join('')}</div>` : `<div class="story-art">${p.art()}</div>`}
        <p class="story-zh">${esc(p.zh)}</p></div>
      <div class="story-foot"><span class="story-dots">${PAGES.map((_, k) => `<i${k === i ? ' class="on"' : ''}></i>`).join('')}</span>${last ? '<button type="button" class="btn btn-primary" data-story="end">開始</button>' : '<span class="story-tap">點一下繼續 ▸</span>'}</div>`;
  }
  function close() {
    if (!el) return;
    el.classList.add('out'); const e = el; el = null; setTimeout(() => e.remove(), 400);
    state.storyV = V; saveState(); NPC.check();
  }
  const due = () => (state.storyV || 0) < V;
  function open() {
    if (el || !due()) return;
    i = 0; el = document.createElement('div'); el.className = 'story'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', '開場');
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      if (e.target.closest('[data-story="skip"], [data-story="end"]')) { close(); return; }
      if (i < PAGES.length - 1) { i++; show(); }
    });
    document.body.appendChild(el); show();
  }
  const drop = () => { if (el && !due()) { el.remove(); el = null; } };   // seen on another device meanwhile (sync)
  return { open, close, drop, due, V, PAGES };
})();
// the grandmother's diary (test, 2026-11-09), on the low bookshelf: a page more can be read for each stage test passed — the
// first from the start, the last when every stage is passed (what she never got to say). A page not yet read is blurred, with
// what it takes; a read one is in Japanese with furigana, its Chinese under 看中文
const DIARY = (() => {
  const PAGES = [
    { ja: '{今日|きょう}は いい {天気|てんき}です。\n{海|うみ}が とても きれいです。\n{孫|まご}に {会|あ}いたいです。', zh: '今天天氣很好。海非常漂亮。好想見孫兒。' },
    { ja: '{近所|きんじょ}の {小春|こはる}ちゃんが、{私|わたし}の {髪|かみ}を {切|き}ってくれました。\n{小|ちい}さいのに、とても {上手|じょうず}です。\n{将来|しょうらい}は {美容師|びようし}になりたいそうです。', zh: '鄰居的小春幫我剪了頭髮。年紀小小的，剪得卻很好。她說將來想當美容師。' },
    { ja: '{夕方|ゆうがた}、{海辺|うみべ}で ムギと レコードを {聞|き}きました。\nムギは〈{夜桜|よざくら}〉が {好|す}きみたい。しっぽを {振|ふ}っていました。', zh: '傍晚和ムギ在海邊聽唱片。ムギ好像喜歡〈夜桜〉，一直搖著尾巴。' },
    { ja: '{孫|まご}から {電話|でんわ}がありました。\nでも、{私|わたし}の {日本語|にほんご}は {通|つう}じません。\n{笑|わら}って「ハロー」と {言|い}うだけでした。', zh: '孫兒打電話來了。可是我說的日語，孩子聽不懂。我們只能笑著說「哈囉」。' },
    { ja: '{最近|さいきん}、{手紙|てがみ}を {書|か}く {練習|れんしゅう}をしています。\nいつか {孫|まご}が {読|よ}んでくれるかもしれないから。\n{難|むずか}しい {言葉|ことば}は {使|つか}わないようにしよう。', zh: '最近在練習寫信。說不定有一天，孫兒會讀到。不要用太難的字吧。' },
    { last: true, ja: '{言葉|ことば}が わからなくても、あなたの {笑顔|えがお}を {見|み}れば {全部|ぜんぶ} わかっていたよ。\nでも {本当|ほんとう}は、いつか あなたと {日本語|にほんご}で お{話|はなし}が したかった。\nこのページが {読|よ}めたなら、その {夢|ゆめ}は もう {叶|かな}ったね。\nありがとう。{大好|だいす}きよ。',
      zh: '就算語言不通，看到你的笑容，我就什麼都懂了。可是其實，我好想有一天能和你用日語聊天。如果你讀得懂這一頁，這個夢想就已經實現了。謝謝你。最喜歡你了。' }
  ];
  const ruby = (s) => esc(s).replace(/\{([^|}]+)\|([^}]+)\}/g, '<ruby>$1<rt>$2</rt></ruby>'), plain = (s) => s.replace(/\{([^|}]+)\|[^}]+\}/g, '$1');
  const passed = () => STAGES.filter((g) => ((state.stageTests || {})[g.id] || []).some((r) => r.passed)).length;
  const need = (k) => (PAGES[k].last ? STAGES.length : k);   // stages passed to read page k
  const open = (k) => k === 0 || passed() >= need(k);
  let el = null, at = 0, tab = 'g';
  const tabs = () => `<div class="diary-tabs"><button type="button" data-diary="tab-g" aria-pressed="${tab === 'g'}">外婆的日記</button><button type="button" data-diary="tab-town" aria-pressed="${tab === 'town'}">町の手帳</button></div>`;
  // 町の手帳 (test, 2026-11-09; a page each since 2026-11-10, the user): a cover — who waits, everyone at a glance (a tap: their
  // page), the test site's tools — then a page a person, turned over (‹ ›, or a swipe): their face, name, who they are (a line more
  // for each event of theirs), and the talks had with them, each to be read through there or played again (no 言靈 the second
  // time). One not met yet has a page too, all of it blurred.
  let tp = 0;   // the page open in 町の手帳: 0 the cover, k the k-th person
  const people = () => Object.keys(TOWN.CAST);
  const rubyEv = (s) => esc(s).replace(/\{([^|}]+)\|([^|}]+)(?:\|[^}]+)?\}/g, '<ruby>$1<rt>$2</rt></ruby>');
  const talksOf = (id) => TOWN.EVENTS.filter((e) => state.town.done[e.id] && (e.who === id || (e.lines || []).some((l) => Array.isArray(l) && l[0] === id)));
  function logOf(e) {   // a talk as it went: each line by who said it, the hero's answers as picked
    const name = (w) => (w === 'hero' ? '我' : (TOWN.CAST[w] || {}).name || w);
    const row = (w, ja, zh) => `<li><b>${esc(name(w))}</b>${ja ? `<span lang="ja">${rubyEv(ja)}</span>` : ''}<small>${esc(zh || '')}</small></li>`;
    return `<ol class="tb-lines">${(e.lines || []).map((l) => { if (Array.isArray(l)) return row(l[0], l[1], l[2]); const o = (l.opts || []).find((x) => x[1]); return o ? row('hero', o[0], o[2]) : ''; }).join('')}</ol>`;
  }
  function townCover() {
    const n = TOWNEV.openN();
    const wait = n ? `<section class="tb-wait"><b>還沒遇到的事件：${n} 件</b><p class="muted small">在鎮上走走，頭上有「！」的人就是在等你的人。做完今日練習，也可以到臥房的床上睡到早上、中午、傍晚或晚上，遇見不同時間出門的人。</p></section>` : '';   // how many, not who, where or when (2026-11-10, the user: let people find them, less pressure)
    const met = people().filter((id) => TOWNEV.seen(id)).length;
    return `${wait}<p class="tb-intro">鎮上的人：認識了 ${met} / ${people().length} 位。點一個人，翻到他的那一頁。</p>
      <div class="tb-index">${people().map((id) => { const k = TOWNEV.seen(id); return `<button type="button" class="tb-who${k ? '' : ' blur'}" data-page-of="${id}"><span class="tb-face">${TOWNEV.face(id)}</span><span>${k ? esc(TOWN.CAST[id].name) : '？？？'}</span></button>`; }).join('')}</div>
      ${onTestSite() ? townTools() : ''}`;
  }
  function townPage(id) {
    const c = TOWN.CAST[id], known = TOWNEV.seen(id), mine = TOWN.EVENTS.filter((e) => e.who === id && state.town.done[e.id]), talks = talksOf(id);
    if (!known) return `<section class="tb-page blur" data-id="${id}"><div class="tb-top"><div class="tb-face big">${TOWNEV.face(id)}</div><div class="tb-name"><b>？？？</b><span>？？？</span></div></div>
      <div class="tb-fog" aria-hidden="true"><p>這個人好像住在這附近，每天都在某個地方忙著。</p><p>聽說他和外婆以前也認識。</p><p>總有一天會在鎮上遇到吧。</p></div>
      <p class="tb-yet">還沒遇到這個人。</p></section>`;
    return `<section class="tb-page" data-id="${id}"><div class="tb-top"><div class="tb-face big">${TOWNEV.face(id)}</div><div class="tb-name"><b>${esc(c.name)}</b><ruby>${esc(c.kana || '')}</ruby><span>${esc(c.role)}</span></div></div>
      ${c.bio.slice(0, 1 + mine.length).map((b) => `<p class="tb-bio">${esc(b)}</p>`).join('')}
      <h4 class="tb-h">對話紀錄</h4>
      ${talks.length ? talks.map((e) => `<details class="tb-talk"><summary>${esc(e.title)}<small>${esc(TOWNEV.PLACE_NAME[e.at] || e.at)}・${esc(state.town.done[e.id])}</small></summary>${logOf(e)}<button type="button" class="tb-ev" data-replay="${esc(e.id)}">再讀一次<small>不再給言靈</small></button></details>`).join('')
        : '<p class="tb-yet">還沒和他好好聊過。</p>'}</section>`;
  }
  function townBook() {
    const all = people(); tp = Math.max(0, Math.min(all.length, tp));
    return `<div class="town-book"><p class="tb-count">${tp + 1} / ${all.length + 1}</p>${tp ? townPage(all[tp - 1]) : townCover()}</div>`;
  }
  // the test site only (the user, 2026-11-10: try every stage's people there): meet everyone and open every stop, see the town at
  // an hour of the day, start over, and play any event (no 言靈, nothing marked done)
  function townTools() {
    const hrs = [['now', '現在'], [7, '7 點'], [12, '12 點'], [17, '17 點'], [20, '20 點'], [23, '23 點']], cur = TOWNEV.clock ? TOWNEV.clock.h : 'now';
    const byUnit = {}; TOWN.EVENTS.forEach((e) => { (byUnit[e.u] = byUnit[e.u] || []).push(e); });
    return `<section class="town-tools"><b>測試用（只在測試站）</b>
      <div class="row-wrap mt-2"><button type="button" class="btn btn-sm" data-tool="meet">認識所有人、開通所有公車站</button><button type="button" class="btn btn-sm" data-tool="reset">小鎮事件從頭開始</button></div>
      <div class="row-wrap mt-2">時間（只改小鎮；「現在」也清掉睡覺跳過的時間）：${hrs.map(([h, n]) => `<button type="button" class="btn btn-sm" data-tool="hour" data-h="${h}" aria-pressed="${String(h) === String(cur)}">${n}</button>`).join('')}</div>
      ${Object.entries(byUnit).map(([u, list]) => `<div class="tt-unit"><span>${esc(u)}</span>${list.map((e) => `<button type="button" class="tb-ev" data-try="${esc(e.id)}">${esc(e.title)}<small>${esc((TOWN.CAST[e.who] || {}).name || e.who)}・${esc(TOWNEV.PLACE_NAME[e.at] || e.at)}${e.when === 'night' ? '・晚上' : ''}</small></button>`).join('')}</div>`).join('')}
    </section>`;
  }
  function tool(b) {
    const t = b.dataset.tool;
    if (t === 'meet') { Object.keys(TOWN.CAST).forEach((id) => { if (TOWN.CAST[id].art !== 'npc') state.town.seen[id] = 1; }); BUS_STOPS.forEach(([id]) => { state.town.stops[id] = 1; }); saveState(); toast('認識所有人、開通所有公車站了'); }
    if (t === 'reset') { state.town = { done: {}, seen: {}, stops: {} }; Object.keys(state.koto.found).filter((k) => k.startsWith('ev-')).forEach((k) => delete state.koto.found[k]); saveState(); toast('小鎮事件從頭開始'); }
    if (t === 'hour') { TOWNEV.clock = b.dataset.h === 'now' ? null : { h: Number(b.dataset.h), day: new Date() }; if (b.dataset.h === 'now') { try { localStorage.removeItem('nq_wake'); } catch (e) { /* none kept */ } sceneTick(); } }   // 現在: a sleep's hours gone too
    show();
  }
  function show() {
    if (tab === 'town') { const n = people().length; el.innerHTML = `<div class="diary-book">${tabs()}${townBook()}<div class="diary-nav"><button type="button" class="btn btn-sm" data-diary="-1"${tp ? '' : ' disabled'}>‹ 上一頁</button><button type="button" class="btn btn-sm" data-diary="x">闔上</button><button type="button" class="btn btn-sm" data-diary="1"${tp < n ? '' : ' disabled'}>下一頁 ›</button></div></div>`; return; }
    const p = PAGES[at], ok = open(at);
    el.innerHTML = `<div class="diary-book">${tabs()}<div class="diary-head"><span>おばあちゃんの{日記|にっき}</span><span>${at + 1} / ${PAGES.length}</span></div>
      <div class="diary-page${ok ? '' : ' locked'}" lang="ja">${p.ja.split('\n').map((l) => `<p>${ok ? ruby(l) : esc(plain(l))}</p>`).join('')}</div>
      ${ok ? `<details class="diary-zh"><summary>看中文</summary><p>${esc(p.zh)}</p></details>` : `<p class="diary-lock">還讀不懂。${p.last ? '通過所有階段測驗' : `通過「${esc(STAGES[need(at) - 1].title)}」的階段測驗`}，就讀得懂這一頁。</p>`}
      <div class="diary-nav"><button type="button" class="btn btn-sm" data-diary="-1"${at ? '' : ' disabled'}>‹ 上一頁</button><button type="button" class="btn btn-sm" data-diary="x">闔上</button><button type="button" class="btn btn-sm" data-diary="1"${at < PAGES.length - 1 ? '' : ' disabled'}>下一頁 ›</button></div></div>`
      .replace('おばあちゃんの{日記|にっき}', 'おばあちゃんの<ruby>日記<rt>にっき</rt></ruby>');
  }
  function close() { if (el) { el.remove(); el = null; } }
  function turn(d) { if (tab === 'town') tp = Math.max(0, Math.min(people().length, tp + d)); else at = Math.max(0, Math.min(PAGES.length - 1, at + d)); show(); }
  function openBook(which = 'g', who) {
    close(); tab = which; if (who) tp = people().indexOf(who) + 1; at = Math.max(0, PAGES.findIndex((_, k) => !open(k)) - 1); if (at < 0 || PAGES.every((_, k) => open(k))) at = PAGES.length - 1;   // at the last page read
    el = document.createElement('div'); el.className = 'diary'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', '外婆的日記');
    let sx = null;   // a swipe turns the page
    el.addEventListener('pointerdown', (e) => { e.stopPropagation(); sx = [e.clientX, e.clientY]; });
    el.addEventListener('pointerup', (e) => { if (!sx) return; const dx = e.clientX - sx[0], dy = e.clientY - sx[1]; sx = null; if (Math.abs(dx) > 60 && Math.abs(dx) > 2 * Math.abs(dy) && e.target.closest('.diary-book')) { el._swiped = true; turn(dx < 0 ? 1 : -1); } });
    el.addEventListener('click', (e) => {
      if (el._swiped) { el._swiped = false; return; }   // the click after a swipe
      e.stopPropagation(); const b = e.target.closest('[data-diary]'), r = e.target.closest('[data-replay]');
      const tr = e.target.closest('[data-try]'), tl = e.target.closest('[data-tool]');
      if (tl) { tool(tl); return; }
      if (r || tr) { const ev = TOWN.EVENTS.find((x) => x.id === (r || tr).dataset[r ? 'replay' : 'try']); close(); if (ev) TALK.open(document.body, ev.who, ev.lines, () => openBook('town'), null, { ev: true }); return; }
      const po = e.target.closest('[data-page-of]'); if (po) { tp = people().indexOf(po.dataset.pageOf) + 1; show(); return; }
      if (b) { const d = b.dataset.diary; if (d === 'x') close(); else if (d.startsWith('tab-')) { tab = d.slice(4); show(); } else turn(Number(d)); }
      else if (e.target === el) close();
    });
    document.body.appendChild(el); show();
  }
  return { PAGES, open: openBook, close, readable: open, passed };
})();
// a few lines with someone (test, 2026-11-09): their face, their name, a line in Japanese (furigana; 🔊 reads it) and in Chinese;
// a tap goes on. A present waits for 收下 (its thumbnail) — take(): it is theirs then — and done() once the last line is read.
// A line with no Japanese is said in Chinese (林, now and then). The town's events (opt.ev, events.js) are several people's lines, the hero's among them ([who, ja, zh]); their Chinese folded
// away under 中文 (open, it stays open for the rest of the talk); a word glossed ({漢字|かな|中文}) has its Chinese under the line;
// at a reply choice ({ ask, opts: [[ja, right, zh | why wrong]] }) the hero picks what to say: a wrong one shakes and says why,
// and can be tried again; the right one is said, and the talk goes on
const TALK = (() => {
  let cur = null;
  const MARK = /\{([^|}]+)\|([^|}]+)(?:\|([^}]+))?\}/g;
  const ruby = (s) => esc(s).replace(MARK, '<ruby>$1<rt>$2</rt></ruby>'), plain = (s) => s.replace(MARK, '$1');
  const glosses = (s) => [...s.matchAll(MARK)].filter((m) => m[3]).map((m) => `${m[1]}（${m[2]}）${m[3]}`);
  const who = (id) => (id === 'hero' ? { name: '我', role: '' } : NPCS[id] || TOWN.CAST[id]);
  // a line as shown: { id, ja, zh, kind } or a reply choice { ask, opts }
  const line = (l) => (!cur.ev ? { id: cur.id, ja: l[0], zh: l[1], kind: l[2] } : Array.isArray(l) ? { id: l[0], ja: l[1], zh: l[2] } : l);
  const say = (ja) => `<button type="button" class="talk-say" data-talk="say" data-ja="${esc(plain(ja))}" aria-label="唸出來">${icon('speaker')}</button>`;
  function show() {
    const L = cur.said || line(cur.lines[cur.i]);
    if (L.ask) {
      cur.el.innerHTML = `<div class="talk-card asking"><div class="talk-face">${TOWNEV.face('hero')}</div><div class="talk-body">
        <div class="talk-name">我<span>${esc(L.ask)}</span></div>
        <div class="talk-opts">${L.opts.map((o, k) => `<div class="talk-opt${cur.wrong.includes(k) ? ' wrong' : ''}" data-pick="${k}"><button type="button" class="talk-pick" lang="ja">${ruby(o[0])}</button>${say(o[0])}</div>`).join('')}</div>
        ${cur.why ? `<p class="talk-why">${esc(cur.why)}</p>` : ''}</div></div>`;
      return;
    }
    const n = who(L.id), w = n.gift, gl = cur.ev ? glosses(L.ja) : [];
    cur.el.innerHTML = `<div class="talk-card"><div class="talk-face">${TOWNEV.face(L.id)}</div><div class="talk-body">
      <div class="talk-name">${esc(n.name)}<span>${esc(n.role)}</span></div>
      ${!L.ja ? `<p class="talk-zh">${esc(L.zh)}</p>` : `<p class="talk-ja" lang="ja">${ruby(L.ja)} ${say(L.ja)}</p>${gl.length ? `<p class="talk-gloss">${gl.map(esc).join('　')}</p>` : ''}
      ${cur.ev ? `<p class="talk-zh${cur.zh ? '' : ' hide'}">${esc(L.zh)}</p>${cur.zh ? '' : '<button type="button" class="talk-zh-btn" data-talk="zh">中文</button>'}` : `<p class="talk-zh">${esc(L.zh)}</p>`}`}
      ${L.kind === 'gift' ? `<div class="talk-gift">${DECOR.thumb(w)}<b>${esc(WARE.get(w).name)}</b><button type="button" class="btn btn-primary btn-sm" data-talk="take">收下</button></div>` : '<span class="talk-next" aria-hidden="true">▼</span>'}</div></div>`;
    if (L.kind === 'gift') fitThumbs(cur.el);
  }
  function pick(k) {
    const L = line(cur.lines[cur.i]), o = L.opts[k]; if (!o || cur.wrong.includes(k)) return;
    if (!o[1]) { cur.wrong.push(k); cur.why = o[2] || ''; show(); const el = cur.el.querySelectorAll('.talk-opt')[k]; if (el) el.classList.add('shake'); playSfx('bad'); return; }
    playSfx('good'); cur.said = { id: 'hero', ja: o[0], zh: o[2] || '' }; show();
  }
  function next() {
    if (!cur) return;
    if (!cur.said && line(cur.lines[cur.i]).ask) return;   // the hero has to pick
    if (cur.said) cur.said = null;
    if (!cur.ev && cur.lines[cur.i][2] === 'gift' && cur.take) { cur.take(); cur.take = null; }
    cur.wrong = []; cur.why = '';
    if (++cur.i < cur.lines.length) { show(); return; }
    const d = cur.done; close(); if (d) d();
  }
  function open(root, id, lines, done, take, opt = {}) {
    close();
    const el = document.createElement('div'); el.className = 'talk'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', who(id).name);
    cur = { el, id, lines, done, take, i: 0, ev: Boolean(opt.ev), zh: false, wrong: [], why: '', said: null };
    el.addEventListener('pointerdown', (e) => e.stopPropagation());
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      const sayBtn = e.target.closest('[data-talk="say"]'); if (sayBtn) { speak(sayBtn.dataset.ja); return; }
      if (e.target.closest('[data-talk="zh"]')) { cur.zh = true; show(); return; }
      const p = e.target.closest('[data-pick]'); if (p) { pick(Number(p.dataset.pick)); return; }
      if (!cur.ev && cur.lines[cur.i][2] === 'gift' && !e.target.closest('[data-talk="take"]')) return;   // the present waits for 收下
      next();
    });
    root.appendChild(el); show();
  }
  function close() { if (cur) { cur.el.remove(); cur = null; } }
  return { open, close, on: () => Boolean(cur && cur.el.isConnected) };
})();
// the beach (test, 2026-11-09), along the yard to the left: the sea to the horizon, an island, glints, waves washing in on wet
// sand, the beach; ムギ's mat under a parasol with his record player, ムギ on it once he has come by
const BEACH_PROP = [-120, -214, 240, 222];
const BEACH_PROP_ART = () => `<ellipse cx="0" cy="-2" rx="112" ry="8" fill="#2b1c12" fill-opacity=".12"/>
  <path d="M-108 4 L84 4 L108 -16 L-84 -16 Z" ${hc('#f2ece0', '#3a3a58')}/><path d="M-70 4 L-46 -16 M-30 4 L-6 -16 M10 4 L34 -16 M50 4 L74 -16" ${hs('#7fb3d8', '#2c3460')} stroke-width="9"/>
  <path d="M56 -6 L24 -196" ${hs('#efe7d8', '#4a4a6a')} stroke-width="5"/>
  <path d="M-62 -150 Q24 -236 112 -150 Q90 -140 68 -150 Q46 -140 24 -152 Q2 -140 -20 -150 Q-42 -140 -62 -150 Z" ${hc('#e86f5e', '#4a2c48')}/>
  <path d="M-20 -150 Q2 -140 24 -152 Q46 -140 68 -150 Q50 -206 24 -212 Q0 -204 -20 -150 Z" ${hc('#fbf3e6', '#4c4a6a')}/>
  <rect x="22" y="-36" width="44" height="22" rx="3" ${hc('#5a8f7b', '#26304e')}/><ellipse cx="44" cy="-37" rx="17" ry="5" ${hc('#2a2730', '#141428')}/><ellipse cx="44" cy="-37" rx="4" ry="1.4" ${hc('#e3907f', '#5a3a4a')}/>
  <path d="M60 -38 L50 -34" ${hs('#c9c4b8', '#4a4a6a')} stroke-width="2"/>`;
function beachHtml() {
  const k = yScale(64), [x0, y0, w, h] = BEACH_PROP;
  // 2026-11-10: taller, gulls over it, a fishing boat far out, the harbour's breakwater and lighthouse far off on the left (the
  // way down there), a beach hut with its flag, driftwood; on the right a grassy bank and a boardwalk up to the yard
  const gull = (x, y, k2) => `<g transform="translate(${x} ${y})"><g class="fx-gull" style="animation-delay:-${k2 * 6}s"><path class="hs fx-wing" d="M-14 0 q7 -9 14 0 q7 -9 14 0" style="--c:#f6f6f2;--n:#9a9ec8;animation-delay:-${k2 * 0.25}s" stroke-width="3"/></g></g>`;
  return `<svg class="land tall beach-land" viewBox="0 -400 1200 770" preserveAspectRatio="xMidYMax slice">${GLOW_DEFS}
      ${gull(260, -140, 0)}${gull(700, -220, 1)}${gull(980, -90, 2)}
      <path d="M940 148 C990 128 1050 108 1110 100 C1150 96 1190 98 1220 102 V148 Z" ${hc('#a6bd96', '#161c38')}/><path d="M1124 92 l5 -6 l12 -5 l12 5 l5 6 Z" ${hc('#c8553f', '#3a2030')}/><rect x="1130" y="92" width="22" height="9" ${hc('#efe4d2', '#1e2042')}/><path d="M1138 104 L1118 112 L1140 120 L1104 130 L1128 138" fill="none" ${hs('#e3cf9e', '#3a3858')} stroke-width="1.6"/>
      <path class="sea" d="M-20 146 H1220 V242 H-20 Z"/><path class="sea-far" d="M-20 146 H1220 V158 H-20 Z"/>
      <path d="M-20 142 H120 V148 H-20 Z" ${hc('#b4ad9e', '#2a2c48')}/><rect x="116" y="114" width="8" height="30" ${hc('#f4f1ea', '#4a4c72')}/><rect x="116" y="122" width="8" height="5" ${hc('#d0453c', '#5a2030')}/><rect x="116" y="132" width="8" height="5" ${hc('#d0453c', '#5a2030')}/><circle class="fx-blink glow" cx="120" cy="112" r="6" fill="#fff3b0"/>
      <g class="fx-sail"><g class="fx-bob" style="animation-duration:4s"><path d="M120 150 h26 l-4 5 h-18 Z" ${hc('#f4f3ee', '#4a4c72')}/><path d="M133 149 V118 L150 146 Z" ${hc('#fbfaf6', '#6a6c92')}/><path d="M131 146 L120 126 V146 Z" ${hc('#e86f5e', '#4a2c48')}/></g></g>
      <g class="fx-bob" style="animation-duration:3.2s"><path d="M640 152 h40 l-5 6 h-30 Z" ${hc('#d0574b', '#2a2c50')}/><rect x="652" y="144" width="10" height="8" ${hc('#f4f3ee', '#4a4c72')}/></g>
      <path class="isle" d="M850 147 C868 132 892 124 918 132 C934 124 962 128 982 147 Z"/><path class="isle" d="M240 147 C252 140 266 138 278 147 Z"/>
      ${[[300, 172, 40], [520, 192, 60], [760, 178, 30], [640, 214, 70], [420, 226, 50], [960, 204, 44]].map(([x, y, l], i) => `<path class="glint" d="M${x} ${y} h${l}" style="--w:-${i * 0.7}s"/>`).join('')}
      ${moonGlitter(330, 160, 236)}
      <path class="wet" d="M-20 236 C200 230 400 242 600 238 S1000 230 1220 238 V258 H-20 Z"/>
      <path class="foam" d="M-20 240 C120 234 240 246 380 240 S640 232 780 240 S1060 246 1220 238"/>
      <path class="sand" d="M-20 252 C300 246 700 256 1220 248 V370 H-20 Z"/>
      ${[[180, 300, '#f0c2b0'], [470, 330, '#f6e3c8'], [860, 296, '#f0c2b0'], [1010, 336, '#f6e3c8']].map(([x, y, c]) => `<path class="shell"${x === 470 ? ' data-fx="shell"' : ''} d="M${x - 6} ${y} Q${x} ${y - 9} ${x + 6} ${y} Z" style="--c:${c}"/>`).join('')}
      <path class="star" data-fx="star" d="M700 318 l2.4 5 5.4 .6 -4 3.6 1.2 5.4 -5 -2.8 -5 2.8 1.2 -5.4 -4 -3.6 5.4 -.6 Z"/>
      <g class="fx-crab" data-fx="crab"><g class="fx-legs"><path d="M554 286 l-8 4 M556 289 l-8 6 M574 286 l8 4 M572 289 l8 6" ${hs('#c8453a', '#4a2030')} stroke-width="2"/></g><ellipse cx="564" cy="284" rx="11" ry="7" ${hc('#e0584a', '#5a2a36')}/><g class="claws"><path d="M553 280 q-8 -6 -4 -12 q4 2 6 6 M575 280 q8 -6 4 -12 q-4 2 -6 6" ${hc('#e0584a', '#5a2a36')}/></g><path d="M560 278 v-5 M568 278 v-5" ${hs('#c8453a', '#4a2030')} stroke-width="1.6"/><circle cx="560" cy="272" r="1.8" fill="#2b2b33"/><circle cx="568" cy="272" r="1.8" fill="#2b2b33"/></g>
      <g data-fx="castle"><path d="M352 318 h64 l-4 -12 h-56 Z" ${hc('#dcc48e', '#4a4466')}/><rect x="360" y="290" width="18" height="18" ${hc('#e6d2a0', '#4a4466')}/><rect x="390" y="284" width="20" height="24" ${hc('#e6d2a0', '#4a4466')}/>${[360, 366, 372, 390, 397, 404].map((x) => `<rect x="${x}" y="${x < 380 ? 286 : 280}" width="4" height="5" ${hc('#e6d2a0', '#4a4466')}/>`).join('')}<rect x="397" y="296" width="6" height="12" rx="3" ${hc('#c9b07c', '#3a3858')}/><path d="M400 280 V264" ${hs('#6e4f3a', '#2c2440')} stroke-width="1.4"/><path d="M400 264 l12 4 l-12 4 Z" class="fx-flag" fill="#d0453c"/></g>
      <rect x="760" y="196" width="130" height="62" ${hc('#c9a06a', '#2a2440')}/><path d="M744 200 L825 168 L906 200 Z" ${hc('#b9a070', '#1e1c38')}/>${[770, 790, 810, 830, 850, 870].map((x) => `<path d="M${x} 186 l-6 14" ${hs('#9a8058', '#1a1832')} stroke-width="1.4"/>`).join('')}<rect x="776" y="214" width="98" height="30" ${hc('#efe6d6', '#ffd98a')}/><path d="M748 202 Q786 210 825 202 Q864 210 902 202" fill="none" ${hs('#6a6a74', '#2a2c50')} stroke-width="1"/>${Array.from({ length: 9 }, (_, k) => { const x = 752 + k * 18.5, yy = 202 + 6 * Math.sin(Math.PI * ((x - 748) % 77) / 77); return `<circle cx="${x}" cy="${yy + 3}" r="2.6" ${hc('#e8e4d8', '#ffe08a')}/><circle class="glow" cx="${x}" cy="${yy + 3}" r="9" fill="url(#glw)"/>`; }).join('')}${lightPool(825, 262, 80)}<text x="825" y="234" text-anchor="middle" font-size="13" font-weight="700" ${hc('#2f5a9a', '#3a3456')} font-family="system-ui, sans-serif">海の家</text>
      <path d="M900 258 V178" ${hs('#6e4f3a', '#2c2440')} stroke-width="3"/><path d="M901 180 h20 v40 h-20 Z" ${hcx('fx-flag', '#fbf7ec', '#4a4c72')}/><text x="911" y="196" text-anchor="middle" font-size="9" font-weight="700" fill="#d0453c" font-family="system-ui, sans-serif">氷</text>
      <path d="M260 340 q30 -8 60 -2 q10 2 18 -4" fill="none" ${hs('#a8875e', '#3a3050')} stroke-width="6"/>
      ${Array.from({ length: 7 }, (_, k) => `<ellipse cx="${740 - k * 26 + (k % 2) * 6}" cy="${300 - k * 7 + (k % 2) * 4}" rx="3.4" ry="2" ${hc('#d8c49a', '#2a2a46')}/>`).join('')}
      <path class="near" d="M1060 370 C1074 320 1094 270 1124 232 C1150 196 1180 168 1220 156 V370 Z"/>${[1100, 1140, 1180].map((x) => `<path d="M${x} ${330 - (x - 1100) * 0.9} q4 -12 8 0 M${x + 6} ${331 - (x - 1100) * 0.9} q5 -10 9 -1" ${hs('#7f9d6c', '#1a2a3a')} stroke-width="2"/>`).join('')}
      <path d="M980 300 L1220 292 V306 L980 314 Z" ${hc('#c9a06a', '#3a2c40')}/>${Array.from({ length: 12 }, (_, k2) => `<path d="M${990 + k2 * 20} ${299.6 - k2 * 0.66} v14" ${hs('#a8804e', '#2a2440')} stroke-width="1.6"/>`).join('')}
      ${[1000, 1060, 1120, 1180].map((x) => `<rect x="${x}" y="276" width="4" height="22" ${hc('#8a6a4a', '#2c2440')}/>`).join('')}<path d="M1000 282 L1184 278" ${hs('#8a6a4a', '#2c2440')} stroke-width="2"/>
    </svg>
    ${yHeroHtml()}
    <div class="busstop beach-prop" aria-hidden="true" style="width:${w}px;height:${h}px;margin-left:${x0}px;bottom:${-(y0 + h)}px;transform-origin:${-x0}px ${-y0}px;transform:translate(-120px,-64px) scale(${k.toFixed(3)});z-index:${300 - 64}"><svg viewBox="${BEACH_PROP.join(' ')}">${BEACH_PROP_ART()}</svg></div>
    ${TOWNEV.castHtml('beach')}
    <button type="button" class="thing way-btn" data-act="go-place" data-to="yard" aria-label="回院子" style="margin-left:${YARD_HALF - 72}px;bottom:70px"><span class="tag">${ySign('today', '回院子')}</span></button>
    <button type="button" class="thing way-btn" data-act="go-place" data-to="harbor" aria-label="往漁港" style="margin-left:-452px;bottom:14px"><span class="tag">${ySign('wave', '往漁港')}</span></button>
    <div class="ysel"></div>`;
}
// the town (test, 2026-11-09), along the yard to the right: a row of little shops on a paved street — 小春's salon first, the
// rest not open yet (a tap: 準備中). 小春 stands in her doorway once she has come by; a tap on her or the salon for a word
const TOWN_SHOPS = [   // [x in the land's 1200, width, height, wall, awning, sign, id] — 2026-11-09: 八百屋 and 本屋 gave way to まんぷく食堂 and 居酒屋とり吉
  [150, 150, 128, '#f6e9e4', '#e58fa8', '美容室 こはる', 'salon'], [320, 120, 112, '#f3e3c4', '#d9a43a', '森のパン', 'bakery'], [460, 132, 140, '#efe6d6', '#3f4a6e', 'まんぷく食堂', 'shokudo'],
  [612, 118, 118, '#efe1d2', '#6e4f3a', '喫茶しずく', 'cafe'], [748, 124, 104, '#e6efe2', '#4f7a4a', 'ひなた花店', 'flowers'], [890, 140, 132, '#e8dccb', '#8a2f2a', '居酒屋とり吉', 'izakaya'], [1050, 120, 116, '#e9e4f1', '#6b4d8a', '雑貨りんりん', 'goods']];
const TOWN_FOOT = 236;   // the shops' fronts stand on this line of the land (y), 134 px up
// what an open shop shows in its window or before it (2026-11-10): x, w its front, t its top, f its foot
const SHOP_SHOW = {
  bakery: (x, w, t, f) => `<path d="M${x + 12} ${f - 28} h${w * 0.42 - 4}" ${hs('#a8743f', '#3a2c40')} stroke-width="2"/>${[0, 1, 2].map((k) => `<ellipse cx="${x + 22 + k * 15}" cy="${f - 33}" rx="7" ry="4.5" ${hc(['#c8823c', '#b8702e', '#d8a050'][k], '#4a3a3a')}/><path d="M${x + 18 + k * 15} ${f - 35} l3 2 M${x + 22 + k * 15} ${f - 35.5} l3 2" stroke="#fff" stroke-opacity=".5" stroke-width="1"/>`).join('')}<path d="M${x + 22} ${f - 44} q8 -8 16 0 q-8 -3 -16 0 Z" ${hc('#d8a050', '#4a3a3a')}/>`,
  shokudo: (x, w, t, f) => `<path d="M${x + 12} ${f - 28} h${w * 0.42 - 4}" ${hs('#7a5230', '#3a2c40')} stroke-width="2"/>${[0, 1, 2].map((k) => `<ellipse cx="${x + 22 + k * 17}" cy="${f - 31}" rx="7.5" ry="2.6" ${hc('#fbf8f0', '#5a5a7a')}/><ellipse cx="${x + 22 + k * 17}" cy="${f - 34}" rx="5" ry="3.4" ${hc(['#e6a23c', '#c84a3a', '#d9b04a'][k], '#4a3a3a')}/>`).join('')}`,
  flowers: (x, w, t, f) => [0, 1, 2].map((k) => { const bx = x + 14 + k * 18; return `${[[-4, '#e86f5e'], [0, '#f2c94c'], [4, '#e58fa8'], [-2, '#ffffff'], [3, '#c9a7ff']].map(([d, c], j) => `<path d="M${bx + d} ${f - 12} v${-8 - (j % 3) * 3}" stroke="#4f7a4a" stroke-width="1.2"/><circle cx="${bx + d}" cy="${f - 21 - (j % 3) * 3}" r="2.6" fill="${c}"/>`).join('')}<path d="M${bx - 7} ${f - 12} h14 l-2 12 h-10 Z" ${hc('#9aa4ae', '#2a2c50')}/>`; }).join(''),
  cafe: (x, w, t, f) => `<path d="M${x + 40} ${f} l5 -30 h16 l5 30" fill="none" ${hs('#6e4f3a', '#2c2440')} stroke-width="2"/><rect x="${x + 43}" y="${f - 30}" width="20" height="22" rx="1" ${hc('#2f3b33', '#1c2a24')}/><path d="M${x + 46} ${f - 24} h12 M${x + 46} ${f - 19} h9 M${x + 46} ${f - 14} h13" stroke="#f3e7cc" stroke-width="1.2" stroke-linecap="round"/><circle cx="${x + 59}" cy="${f - 25}" r="1.6" fill="#e86f5e"/>`,
  goods: (x, w, t, f) => '<g data-fx="chimes">' + [0, 1, 2].map((k) => `<g class="fx-sway" style="animation-delay:-${k * 0.6}s;animation-duration:${1.6 + k * 0.3}s"><path d="M${x + 24 + k * 22} ${t + 58} v6" stroke="#6a6a74" stroke-width="1"/><path d="M${x + 19 + k * 22} ${t + 70} q5 -9 10 0 Z" fill="${['#9fd0f0', '#b8e0c8', '#f6c6d6'][k]}" fill-opacity=".9"/><path d="M${x + 24 + k * 22} ${t + 70} v10" stroke="#6a6a74" stroke-width=".8"/><rect x="${x + 21 + k * 22}" y="${t + 80}" width="6" height="10" fill="#fbf7ec"/></g>`).join('') + '</g>',
  salon: (x, w, t, f) => `<path d="M${x + w - 64} ${f - 14} h16 l-2 14 h-12 Z" ${hc('#c58a54', '#3a2c40')}/>${[[-6, -24], [0, -30], [6, -24], [-3, -18], [4, -19]].map(([dx, dy]) => `<ellipse cx="${x + w - 56 + dx}" cy="${f + dy}" rx="5" ry="3.2" transform="rotate(${dx * 6} ${x + w - 56 + dx} ${f + dy})" ${hc('#5f9a4a', '#16243a')}/>`).join('')}`
};
function townHtml() {
  const shop = ([x, w, h, wall, aw, sign, id]) => {
    const t = TOWN_FOOT - h, dx = x + w / 2;
    const st = TOWNEV.shopState(id), shut = st !== 'open', wx = x + 10, ww = w * 0.42, dx0 = x + w - 44;
    const shutter = (sx, sy, sw, sh) => `<rect x="${sx}" y="${sy}" width="${sw}" height="${sh}" rx="2" ${hc('#b9b6ae', '#2a2b48')}/>${Array.from({ length: Math.floor(sh / 7) }, (_, k) => `<path d="M${sx + 2} ${sy + 5 + k * 7} h${sw - 4}" ${hs('#9a978e', '#1e1f3a')} stroke-width="1.2"/>`).join('')}`;
    const lantern = (lx) => `<path d="M${lx} ${t + 30} v6" ${hs('#2b2b33', '#1c1d3c')} stroke-width="1.5"/><ellipse cx="${lx}" cy="${t + 46}" rx="9" ry="12" ${hc('#d84a3a', '#5a2030')}/><ellipse cx="${lx}" cy="${t + 46}" rx="18" ry="20" fill="#ffb070" style="opacity:calc((1 - var(--day, 1)) * ${st === 'open' ? 0.45 : 0})"/><path d="M${lx - 9} ${t + 46} h18" ${hs('#f6d9a0', '#6a3a40')} stroke-width="1"/>`;
    const up = t - 66;   // the floor they live on above the shop (2026-11-10), its tiled roof
    return `<g class="shop-front${shut ? ' closed' : ''}" data-shop="${id}">
      <rect x="${x + 4}" y="${up}" width="${w - 8}" height="66" ${hc('#efe6d6', '#1e2042')}/><rect class="lit" x="${x + 16}" y="${up + 18}" width="${w * 0.22}" height="22"/><rect class="lit" x="${x + w - 16 - w * 0.22}" y="${up + 18}" width="${w * 0.22}" height="22" style="opacity:calc(.08 + .55 * (1 - var(--day)))"/>
      <path d="M${x - 6} ${up + 4} L${x + 10} ${up - 18} H${x + w - 10} L${x + w + 6} ${up + 4} Z" ${hc(id === 'izakaya' ? '#4a3a3a' : '#5a6470', '#15163a')}/><path d="M${x + 2} ${up - 6} H${x + w - 2}" ${hs('#6f7a88', '#1e2042')} stroke-width="1.4"/>
      <rect x="${x}" y="${t}" width="${w}" height="${h}" ${hc(wall, '#25264a')}/><rect x="${x - 4}" y="${t - 8}" width="${w + 8}" height="10" rx="2" ${hc('#8a6a52', '#1c1d3c')}/>
      <rect x="${dx - w * 0.36}" y="${t + 10}" width="${w * 0.72}" height="20" rx="3" ${hc('#fbf7ec', '#3a3b62')}/><text x="${dx}" y="${t + 25}" text-anchor="middle" font-size="13" font-weight="700" ${hc('#4a3a2c', '#c9c4e8')} font-family="system-ui, sans-serif">${sign}</text>
      <path d="M${x - 2} ${t + 38} H${x + w + 2} L${x + w - 6} ${t + 56} H${x + 6} Z" ${hc(aw, '#3a2c4a')}/>${Array.from({ length: Math.floor(w / 16) }, (_, k) => `<path d="M${x + 6 + k * 16} ${t + 56} q8 8 16 0" ${hc(aw, '#3a2c4a')}/>`).join('')}
      <rect x="${x + 10}" y="${t + 66}" width="${w * 0.42}" height="${h - 92}" rx="3" ${hc('#cfe6ec', '#ffd98a')}/><path d="M${x + 14} ${t + 72} l14 22" ${hs('#ffffff', '#fff3c8')} stroke-width="3" stroke-opacity=".6"/>
      <rect x="${x + w - 44}" y="${t + 70}" width="32" height="${h - 70}" rx="2" ${hc('#8a6a52', '#3a2c40')}/><circle cx="${x + w - 18}" cy="${t + 70 + (h - 70) / 2}" r="2" ${hc('#e3c46a', '#a88a4a')}/>
      ${shut ? '' : SHOP_SHOW[id] ? SHOP_SHOW[id](x, w, t, TOWN_FOOT) : ''}
      ${id === 'salon' ? `<rect x="${x + w + 6}" y="${t + 60}" width="8" height="40" rx="4" fill="#fff"/><path d="M${x + w + 6} ${t + 66} l8 -4 M${x + w + 6} ${t + 76} l8 -4 M${x + w + 6} ${t + 86} l8 -4 M${x + w + 6} ${t + 96} l8 -4" stroke="#e58fa8" stroke-width="3"/>` : ''}
      ${id === 'shokudo' ? `<path d="M${dx0 - 4} ${t + 70} h40 v22 h-40 Z" ${hc('#2f3a5e', '#1c1f3a')}/><path d="M${dx0 + 9} ${t + 70} v22 M${dx0 + 22} ${t + 70} v22" ${hs('#efe6d6', '#3a3d60')} stroke-width="1.2"/><text x="${dx0 + 16}" y="${t + 86}" text-anchor="middle" font-size="11" font-weight="700" fill="#fff" fill-opacity=".9" font-family="serif">めし</text>` : ''}
      ${id === 'izakaya' ? lantern(x + 8) + lantern(x + w - 8) : ''}
      ${shut ? shutter(wx - 2, t + 64, ww + 4, h - 88) + shutter(dx0 - 2, t + 68, 36, h - 68) + `<rect x="${dx0 + 1}" y="${t + 84}" width="30" height="13" rx="2" ${hc('#fbf7ec', '#3a3b62')}/><text x="${dx0 + 16}" y="${t + 94}" text-anchor="middle" font-size="8.5" font-weight="700" ${hc('#8a2f2a', '#c9c4e8')} font-family="system-ui, sans-serif">準備中</text>` : ''}
    </g>`;
  };
  const lamp = (x) => `<rect x="${x - 2}" y="${TOWN_FOOT - 96}" width="4" height="96" ${hc('#4a4a55', '#1c1d3c')}/><circle cx="${x}" cy="${TOWN_FOOT - 100}" r="8" ${hc('#f2efe4', '#ffe2a0')}/><circle cx="${x}" cy="${TOWN_FOOT - 100}" r="16" fill="#ffd98a" style="opacity:calc((1 - var(--day, 1)) * .22)"/>`;
  // 2026-11-10: wires over the street from two tall poles, bunting between the lamps, のぼり by three shops, a cat asleep on the
  // bakery's awning, steam from its chimney; on the left a hedge and the way along from the yard
  const nobori = (x, c, words, k) => `<path d="M${x} ${TOWN_FOOT} V${TOWN_FOOT - 120}" ${hs('#8a8f99', '#3a3d66')} stroke-width="2.4"/><path d="M${x + 1} ${TOWN_FOOT - 118} h18 v78 h-18 Z" ${hcx('fx-flag', c, '#3a3456', `animation-delay:-${k * 0.5}s`)}/>${vText(x + 10, TOWN_FOOT - 113, words, 10, `font-weight="700" fill="#fff" font-family="'Hiragino Mincho ProN', 'Noto Serif JP', serif"`)}`;
  const flags = Array.from({ length: 23 }, (_, k) => { const x = 150 + k * 40, t = (x - 130) / 930, y = -24 + 50 * t * (1 - t) * 2; return `<path class="fx-sway" style="animation-delay:-${(k * 0.37) % 3}s;animation-duration:${2.4 + (k % 3) * 0.5}s" d="M${x} ${y} l12 0 l-6 12 Z" fill="${['#d0574b', '#e6c23a', '#3f7ac8', '#4f7a4a'][k % 4]}" fill-opacity=".9"/>`; }).join('');
  // 2026-11-10 (the user: a hillside shopping street, like the hill outside our house): behind the row the hill climbs to the
  // left, our house small on its top far up on the left. A village up it (the two straight slanting rows looked off): houses of
  // different sizes stepped along the slope at uneven spots, a low stone wall under some, trees between ([x, ground, w, h])
  const village = [[176, -136, 34, 26], [226, -108, 42, 30], [286, -86, 32, 24], [344, -64, 38, 28], [404, -40, 34, 26], [462, -22, 40, 30], [530, 2, 36, 26],
    [198, -84, 40, 28], [258, -60, 34, 26], [318, -32, 44, 32], [386, -8, 32, 24], [446, 18, 40, 28], [172, -30, 38, 28], [238, -6, 32, 24], [300, 12, 40, 30], [364, 30, 34, 26]]
    .sort((p, q) => p[1] - q[1]);
  const roofs = village.map(([x, g, w, h], k) => `${k % 2 ? '' : `<path d="M${x - w / 2 - 5} ${g} H${x + w / 2 + 9} V${g + 8} H${x - w / 2 - 5} Z" ${hc('#b4ad9e', '#262846')}/><path d="M${x - w / 2 - 5} ${g + 4} H${x + w / 2 + 9} M${x - 4} ${g} v4 M${x + 9} ${g + 4} v4" ${hs('#9a9384', '#1c1e3c')} stroke-width="1"/>`}${farHouse(x - w / 2, g, w, h, ['#8a5a44', '#5f6f8a', '#6f5a7a', '#4a5468', '#7a6a50'][(k * 3) % 5], k % 3 ? '#ece2d0' : '#e2d6c2')}`).join('');
  const trees = [[262, -102], [150, -64], [356, -30], [424, -94], [210, -32], [496, -58], [128, -12], [560, -30]].map(([x, y]) => `<rect class="trunk" x="${x - 3}" y="${y - 20}" width="6" height="20"/><g class="crown"><circle cx="${x}" cy="${y - 28}" r="14"/><circle cx="${x - 11}" cy="${y - 19}" r="10"/><circle cx="${x + 11}" cy="${y - 20}" r="11"/></g>`).join('');
  return `<svg class="land tall town-land" viewBox="0 -400 1200 770" preserveAspectRatio="xMidYMax slice">${GLOW_DEFS}
      <path class="far" d="M0 122 C120 100 240 104 360 118 S560 96 700 110 S900 126 1020 104 S1150 100 1200 110 V370 H0 Z"/>
      <path d="M-20 -190 C60 -200 140 -186 220 -150 C400 -70 640 20 900 70 C1020 92 1120 104 1220 108 V370 H-20 Z" ${hc('#a6bd96', '#161c38')}/>
      <path d="M40 -196 L48 -214 L84 -228 L120 -214 L128 -196 Z" ${hc('#c8553f', '#3a2030')}/><rect x="54" y="-198" width="68" height="34" ${hc('#efe4d2', '#1e2042')}/><rect class="lit" x="64" y="-188" width="10" height="9"/><rect class="lit" x="100" y="-188" width="10" height="9"/>
      <path d="M96 -164 L136 -146 L92 -126 L142 -102 L96 -78 L146 -52 L100 -26 L144 2 L104 30 L140 60 L108 92 L128 120 L112 150" fill="none" ${hs('#cfc8b8', '#2a2c50')} stroke-width="5" stroke-linejoin="round"/>
      ${roofs}
      ${trees}
      <rect class="near" x="-20" y="150" width="1240" height="220"/>
      ${[130, 1060].map((x) => `<rect x="${x - 5}" y="-80" width="10" height="${TOWN_FOOT + 80}" ${hc('#8d8a84', '#24254a')}/><rect x="${x - 26}" y="-66" width="52" height="5" ${hc('#6f6c66', '#1c1d3e')}/>`).join('')}
      ${[-62, -46].map((wy) => `<path class="wire" d="M-20 ${wy + 8} Q60 ${wy + 30} 130 ${wy} Q595 ${wy + 80} 1060 ${wy} Q1140 ${wy + 30} 1220 ${wy + 8}"/>`).join('')}
      <g class="fx-peck"><ellipse cx="420" cy="-26" rx="5" ry="4" ${hc('#7a5a3e', '#1a1b36')}/><circle cx="424" cy="-29" r="2.6" ${hc('#7a5a3e', '#1a1b36')}/></g>
      ${TOWN_SHOPS.map(shop).join('')}${[300, 600, 878, 1180].map(lamp).join('')}${[300, 600, 878, 1180].map((x) => lightPool(x, TOWN_FOOT + 6, 70)).join('')}
      <path d="M130 -24 Q595 26 1060 -24" fill="none" ${hs('#6a6a74', '#2a2c50')} stroke-width="1.2"/>${flags}
      ${nobori(446, '#d0574b', '焼きたて', 0)}${nobori(735, '#6e4f3a', '珈琲', 1)}${nobori(1036, '#8a2f2a', '焼き鳥', 2)}
      <rect x="418" y="${TOWN_FOOT - 112 - 66 - 34}" width="12" height="22" ${hc('#8a6a52', '#1c1d3c')}/>${[0, 1, 2].map((k) => `<g transform="translate(424 ${TOWN_FOOT - 112 - 66 - 40})"><ellipse rx="10" ry="7" ${hcx('fx-steam', '#ffffff', '#9a9ec8', `animation-delay:-${k * 1.5}s`)}/></g>`).join('')}
      <g transform="translate(62 0)"><g class="fx-bob" data-fx="awncat" style="animation-duration:3.6s"><path d="M362 ${TOWN_FOOT - 112 + 38} q-2 -15 15 -17 q17 -1 17 13 q0 4 -2 4 Z" ${hc('#e9e2d0', '#5a5a6a')}/><path d="M379 ${TOWN_FOOT - 112 + 22} l3 -7 l4 7 Z M387 ${TOWN_FOOT - 112 + 23} l4 -6 l2 8 Z" ${hc('#e9e2d0', '#5a5a6a')}/><path d="M362 ${TOWN_FOOT - 112 + 38} q-12 4 -16 14" ${hs('#e9e2d0', '#5a5a6a')} stroke-width="4"/></g></g>
      ${[0, 34, 68, 102].map((dx) => `<circle cx="${dx}" cy="${TOWN_FOOT - 26}" r="24" ${hc('#5a9e4d', '#0f1a30')}/>`).join('')}<rect x="-20" y="${TOWN_FOOT - 26}" width="150" height="26" ${hc('#4f8a44', '#0c162a')}/>
      <rect class="pave" x="-20" y="${TOWN_FOOT}" width="1240" height="${370 - TOWN_FOOT}"/><path class="rline" d="M-20 ${TOWN_FOOT + 1} H1220" style="stroke-dasharray:none;opacity:.5"/>
      ${Array.from({ length: 30 }, (_, j) => `<path class="seam" d="M${j * 44 - 20} ${TOWN_FOOT + 40 + (j % 3) * 30} h26"/>`).join('')}
      <path d="M-20 296 C30 294 70 296 110 302 C118 306 118 312 110 316 C70 314 30 312 -20 316 Z" ${hc('#cfc8b8', '#2a2a48')}/>
      <path d="M86 ${TOWN_FOOT} L130 ${TOWN_FOOT} L112 150 L92 150 Z" ${hc('#cfc8b8', '#2a2a48')}/>${Array.from({ length: 7 }, (_, k) => { const t = k / 6, y = TOWN_FOOT - (TOWN_FOOT - 150) * t; return `<path d="M${86 + 6 * t} ${y} H${130 - 18 * t}" ${hs('#a8a49a', '#22244a')} stroke-width="2"/>`; }).join('')}
    </svg>
    ${yHeroHtml()}
    ${TOWNEV.castHtml('town')}
    ${TOWN_SHOPS.map(([x, w, h, , , sign, id]) => `<button type="button" class="town-shop" data-act="town-shop" data-shop="${id}" aria-label="${sign}" style="margin-left:${x - 600}px;width:${w}px;bottom:${370 - TOWN_FOOT}px;height:${h}px"></button>`).join('')}
    <button type="button" class="thing way-btn" data-act="go-place" data-to="yard" aria-label="回院子" style="margin-left:${-YARD_HALF + 40}px;bottom:70px"><span class="tag">${ySign('today', '回院子')}</span></button>
    <button type="button" class="thing way-btn" data-act="go-place" data-to="park" aria-label="往公園" style="margin-left:148px;bottom:14px"><span class="tag">${ySign('spark', '往公園')}</span></button>
    <div class="ysel"></div>`;
}
// みなと漁港 (test, 2026-11-10; the map joined up): below the beach, along the street's left — the harbour's quay, boats bobbing at
// their moorings, a breakwater out to a red lighthouse (its light swinging round by night), the fishermen's hut, crates, floats
// and a net drying, gulls; a sandy path comes down from the beach at the back on the left
function harborHtml() {
  const F = 236, px = 600 + HARBOR_PATH;
  const boat = (x, y, c, k) => `<g class="fx-bob" style="animation-delay:-${k * 0.8}s;animation-duration:${2.6 + k * 0.4}s"><path d="M${x - 60} ${y} h120 l-14 20 h-92 Z" ${hc(c, '#2a2c50')}/><rect x="${x - 14}" y="${y - 26}" width="34" height="26" rx="2" ${hc('#f4f3ee', '#4a4c72')}/><rect x="${x - 8}" y="${y - 20}" width="10" height="9" ${hc('#9fc6d6', '#ffe2a0')}/><path d="M${x + 30} ${y} V${y - 50}" ${hs('#6e4f3a', '#2c2440')} stroke-width="3"/><path d="M${x + 30} ${y - 48} l20 10" ${hs('#d0453c', '#5a2030')} stroke-width="3"/></g>`;
  const crate = (x, y, c) => `<rect x="${x}" y="${y}" width="40" height="22" rx="2" ${hc(c, '#2a2c50')}/><path d="M${x + 4} ${y + 7} h32 M${x + 4} ${y + 14} h32" ${hs('#ffffff', '#5a5e90')} stroke-width="1.4" stroke-opacity=".6"/>`;
  const gull = (x, y, k) => `<g transform="translate(${x} ${y})"><g class="fx-gull" style="animation-delay:-${k * 5}s"><path class="hs fx-wing" d="M-14 0 q7 -9 14 0 q7 -9 14 0" style="--c:#f6f6f2;--n:#9a9ec8;animation-delay:-${k * 0.2}s" stroke-width="3"/></g></g>`;
  return `<svg class="land tall harbor-land" viewBox="0 -400 1200 770" preserveAspectRatio="xMidYMax slice">${GLOW_DEFS}
      <path class="sea-far" d="M-20 110 H1220 V124 H-20 Z"/><path class="isle" d="M760 112 C790 96 830 90 870 104 C890 98 920 100 940 112 Z"/>
      <path class="sea" d="M-20 122 H1220 V${F} H-20 Z"/>
      ${[[200, 160, 50], [420, 190, 40], [640, 150, 60], [900, 200, 44], [1060, 170, 50]].map(([x, y, l], i) => `<path class="glint" d="M${x} ${y} h${l}" style="--w:-${i * 0.7}s"/>`).join('')}
      <path d="M520 150 H1000 V162 H520 Z" ${hc('#b4ad9e', '#2a2c48')}/>${Array.from({ length: 10 }, (_, k) => `<path d="M${590 + k * 38} 150 l12 -12 l12 12 l-6 8 h-12 Z" ${hc(k % 2 ? '#bfb8aa' : '#c9c2b4', '#323456')}/>`).join('')}
      <path d="M534 150 L538 22 H562 L566 150 Z" ${hc('#f4f1ea', '#4a4c72')}/>${[0, 1, 2].map((k) => `<path d="M${535.5 + k * 1.2} ${50 + k * 34} H${564.5 - k * 1.2} V${62 + k * 34} H${535.5 + k * 1.2} Z" ${hc('#d0453c', '#5a2030')}/>`).join('')}<rect x="530" y="16" width="40" height="7" rx="1" ${hc('#3a4254', '#1c2240')}/>
      <rect x="536" y="-4" width="28" height="20" rx="3" ${hc('#3a4254', '#1c2240')}/><rect x="541" y="0" width="18" height="12" rx="2" ${hc('#cfe6ec', '#fff3b0')}/><path d="M532 -4 L550 -20 L568 -4 Z" ${hc('#d0453c', '#5a2030')}/><circle cx="550" cy="-22" r="2.4" ${hc('#3a4254', '#1c2240')}/>
      <defs><linearGradient id="hbBeam"><stop offset="0" stop-color="#fff6cc" stop-opacity=".9"/><stop offset="1" stop-color="#fff6cc" stop-opacity="0"/></linearGradient></defs>
      <path class="glow fx-sweep" d="M550 6 L820 -50 L820 62 Z" fill="url(#hbBeam)" style="transform-origin:550px 6px;opacity:calc((1 - var(--day)) * .6)"/>
      ${moonGlitter(600, 150, 232)}
      ${boat(180, 196, '#3f7ac8', 0)}${boat(470, 208, '#d0574b', 1)}${boat(760, 192, '#4f7a4a', 2)}
      <path d="M-20 ${F} V128 C80 122 200 126 300 140 C330 170 340 210 360 ${F} Z" ${hc('#ecdcb0', '#2c2b46')}/><path d="M${px - 18} 132 L${px + 18} 132 L${px + 44} ${F} H${px - 16} Z" ${hc('#d9c79a', '#24243e')}/>
      ${[40, 90, 150].map((x) => `<path d="M${x} ${F - 18} q4 -14 8 0 M${x + 6} ${F - 16} q5 -12 9 -2" ${hs('#7f9d6c', '#1a2a3a')} stroke-width="2"/>`).join('')}
      <rect x="860" y="${F - 92}" width="220" height="92" ${hc('#c9a06a', '#2a2440')}/><path d="M846 ${F - 92} L970 ${F - 128} L1094 ${F - 92} Z" ${hc('#5a6470', '#15163a')}/>
      <rect x="900" y="${F - 84}" width="140" height="22" rx="2" ${hc('#2f4a6e', '#1c1d3c')}/><text x="970" y="${F - 68}" text-anchor="middle" font-size="13" font-weight="700" fill="#fff" font-family="system-ui, sans-serif">みなと漁協</text>
      <rect x="880" y="${F - 52}" width="54" height="52" ${hc('#5a3b28', '#ffd98a')}/><rect x="960" y="${F - 52}" width="90" height="34" ${hc('#cfe6ec', '#ffd98a')}/>
      <path d="M1074 ${F - 106} V${F - 186}" ${hs('#6e4f3a', '#2c2440')} stroke-width="3"/><g ${hcx('fx-flag', '#f6f3ec', '#4a4c72', 'filter:brightness(calc(.5 + .5 * var(--day)))')}><path d="M1075 ${F - 184} h62 v40 h-62 Z"/><path d="M1075 ${F - 184} h62 v10 h-62 Z" fill="#d0453c"/><path d="M1075 ${F - 154} h62 v10 h-62 Z" fill="#3f7ac8"/><circle cx="1092" cy="${F - 164}" r="7" fill="#e6c23a"/><text x="1120" y="${F - 159}" text-anchor="middle" font-size="12" font-weight="800" fill="#d0453c" font-family="'Hiragino Mincho ProN', 'Noto Serif JP', serif">大漁</text></g>
      <path d="M640 ${F} V${F - 70} M760 ${F} V${F - 70}" ${hs('#6e4f3a', '#2c2440')} stroke-width="4"/><path d="M640 ${F - 66} Q700 ${F - 40} 760 ${F - 66} V${F - 20} Q700 ${F - 2} 640 ${F - 20} Z" fill="none" ${hs('#4f6f6a', '#2a3a4a')} stroke-width="1.4"/>${Array.from({ length: 7 }, (_, k) => `<path d="M${648 + k * 16} ${F - 60 + Math.abs(3 - k) * 3} V${F - 12}" ${hs('#4f6f6a', '#2a3a4a')} stroke-width="1"/>`).join('')}
      ${[380, 520, 700, 860, 1040].map((x, k) => `<g transform="translate(${x} ${F - 3})"><path d="M-12 0 q6 -5 12 0 q6 -5 12 0" fill="none" ${hsx('fx-ripple', '#ffffff', '#5a6aa0', `animation-delay:-${k * 0.8}s`)} stroke-width="1.6"/></g>`).join('')}
      <rect class="pave" x="-20" y="${F}" width="1240" height="134" style="fill:color-mix(in srgb, #cfcac0 calc(var(--day) * 100%), #262848)"/><path d="M-20 ${F + 2} H1220" ${hs('#9a958a', '#1c1d3e')} stroke-width="4"/>
      ${[300, 560, 820].map((x) => `<path d="M${x - 8} ${F + 14} h16 v-10 q-8 -8 -16 0 Z" ${hc('#4a4a55', '#1c1d3c')}/>`).join('')}
      ${streetLamp(150, F + 6, 120)}${streetLamp(1140, F + 6, 120)}
      <path d="M600 ${F + 56} a18 8 0 1 0 1 0 a12 5 0 1 0 1 0" fill="none" ${hs('#c9b48a', '#4a4466')} stroke-width="3"/>
      ${gull(300, -120, 0)}${gull(620, -60, 1)}${gull(860, -180, 2)}
      <g data-fx="gull"><g transform="translate(560 ${F + 4})"><ellipse rx="8" ry="6" ${hc('#f6f6f2', '#7a7ea8')}/><circle cx="7" cy="-6" r="4" ${hc('#f6f6f2', '#7a7ea8')}/><path d="M11 -6 l4 1" ${hs('#e6a23c', '#5a4a3a')} stroke-width="2"/><path d="M-8 -2 l-6 -2" ${hs('#8a8f99', '#4a4c72')} stroke-width="3"/></g></g>
    </svg>
    ${landProp(82, crate(400, F + 10, '#3f7ac8') + '<g data-fx="fish">' + [404, 414, 426].map((fx, k) => `<path d="M${fx} ${F + 10} q6 -6 12 0 q-6 4 -12 0 Z M${fx + 12} ${F + 10} l4 -3 v6 Z" ${hc(['#b9c8d4', '#a8b8c8', '#c8d4dc'][k], '#4a4c72')}/>`).join('') + '</g>' + crate(380, F + 30, '#3f7ac8') + crate(424, F + 30, '#d0574b')
      + `<g data-fx="hcat"><g transform="translate(476 ${F + 52})"><path d="M-10 0 q-2 -18 10 -20 q12 2 10 20 Z" ${hc('#f2ede2', '#5a5a6a')}/><circle cx="0" cy="-24" r="8" ${hc('#f2ede2', '#5a5a6a')}/><path d="M-7 -29 l2 -7 l4 5 M7 -29 l-2 -7 l-4 5" ${hc('#f2ede2', '#5a5a6a')}/><path d="M-8 -26 h-3 M-8 -23 h-3" stroke="#8a8a94" stroke-width=".8"/><circle cx="-3" cy="-25" r="1.2" fill="#2b2b33"/><circle cx="3" cy="-25" r="1.2" fill="#2b2b33"/><path d="M10 -2 q10 0 8 -12" class="fx-sway" fill="none" ${hs('#f2ede2', '#5a5a6a')} stroke-width="3"/><path d="M-6 -16 q6 6 12 0" fill="none" ${hs('#2b2b33', '#5a5a6a')} stroke-width="1"/></g></g>`, null, [372, F + 2, 500, F + 58])}${landProp(78, crate(1090, F + 34, '#e6a23c'), null, [1086, F + 30, 1134, F + 60])}
    ${landProp(76, [[800, F + 40], [822, F + 48], [842, F + 38]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="9" ${hc('#f08a3a', '#5a3a2a')}/><path d="M${x - 8} ${y - 2} q8 4 16 0" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width="1.6"/>`).join(''), null, [788, F + 26, 854, F + 60])}
    ${yHeroHtml()}
    ${TOWNEV.castHtml('harbor')}
    <button type="button" class="thing way-btn" data-act="go-place" data-to="beach" aria-label="往海邊" style="margin-left:${HARBOR_PATH - 32}px;bottom:186px"><span class="tag">${ySign('wave', '往海邊')}</span></button>
    <button type="button" class="thing way-btn" data-act="go-place" data-to="street" aria-label="往大馬路" style="margin-left:${YARD_HALF - 72}px;bottom:70px"><span class="tag">${ySign('bus', '往大馬路')}</span></button>
    <div class="ysel"></div>`;
}
// ひだまり公園 (test, 2026-11-10; the map joined up): below the town, along the street's right — a park on the hillside: houses up
// the slope behind, stone steps down from the town at the back on the right, a slide, swings that swing, a sandbox, the park's
// clock, a jizo in a red bib, ginkgo leaves drifting down, lamps lit by night
function parkHtml() {
  const F = 236, px = 600 + PARK_PATH;
  const house = (x, top, w, roof) => farHouse(x, 134, w, 134 - top, roof, '#efe6d6', 56);
  // round 1 (2026-11-10): a panda on a spring rocking to and fro, a bucket and spade left in the sandbox, pigeons by the benches
  const panda = (x, b) => `<path d="M${x - 2} ${b} l-6 -4 l12 -4 l-12 -4 l12 -4 l-6 -4" fill="none" ${hs('#8a8f99', '#3a3d66')} stroke-width="2.4"/><g class="fx-bob" data-fx="panda" style="animation-duration:1.7s"><ellipse cx="${x}" cy="${b - 34}" rx="20" ry="13" ${hc('#f6f3ec', '#4a4c72')}/><ellipse cx="${x - 12}" cy="${b - 26}" rx="5" ry="7" ${hc('#2b2b33', '#141428')}/><ellipse cx="${x + 12}" cy="${b - 26}" rx="5" ry="7" ${hc('#2b2b33', '#141428')}/><circle cx="${x + 18}" cy="${b - 48}" r="12" ${hc('#f6f3ec', '#4a4c72')}/><circle cx="${x + 10}" cy="${b - 58}" r="4.5" ${hc('#2b2b33', '#141428')}/><circle cx="${x + 26}" cy="${b - 58}" r="4.5" ${hc('#2b2b33', '#141428')}/><ellipse cx="${x + 14}" cy="${b - 49}" rx="3" ry="3.6" ${hc('#2b2b33', '#141428')}/><ellipse cx="${x + 23}" cy="${b - 49}" rx="3" ry="3.6" ${hc('#2b2b33', '#141428')}/><path d="M${x - 6} ${b - 50} v-6 M${x - 10} ${b - 56} h8" ${hs('#d0453c', '#5a2030')} stroke-width="2.4"/></g>`;
  const ginkgo = (x, s) => `<rect class="trunk" x="${x - 5 * s}" y="${F - 90 * s}" width="${10 * s}" height="${90 * s}"/><g ${hc('#e6c23a', '#3a3420')}>${[[0, -120, 44], [-30, -96, 32], [30, -98, 34], [0, -150, 30]].map(([dx, dy, r]) => `<circle cx="${x + dx * s}" cy="${F + dy * s}" r="${r * s}"/>`).join('')}</g>`;
  const leaf = (x, y, k) => `<g transform="translate(${x} ${y})"><path d="M0 0 l-6 -8 q6 -4 12 0 Z" ${hcx('fx-fall', '#e6c23a', '#6a5a3a', `animation-delay:-${k * 1.7}s;animation-duration:${10 + (k % 3) * 2}s`)}/></g>`;
  const swing = (x, k) => `<g class="fx-sway" data-fx="swing${k}" style="animation-delay:-${k * 0.9}s;animation-duration:1.8s;transform-origin:${x}px ${F - 96}px;transform-box:view-box"><path d="M${x - 10} ${F - 96} V${F - 30} M${x + 10} ${F - 96} V${F - 30}" ${hs('#8a8f99', '#3a3d66')} stroke-width="2"/><rect x="${x - 14}" y="${F - 32}" width="28" height="6" rx="2" ${hc('#d0574b', '#4a2c40')}/></g>`;
  return `<svg class="land tall park-land" viewBox="0 -400 1200 770" preserveAspectRatio="xMidYMax slice">${GLOW_DEFS}
      <path class="far" d="M0 40 C200 10 420 0 600 20 S1000 40 1200 0 V370 H0 Z"/>
      ${house(40, 70, 110, '#8a5a44')}${house(190, 50, 96, '#5f6f8a')}${house(330, 80, 120, '#6f5a7a')}${house(520, 60, 100, '#8a5a44')}${house(660, 76, 110, '#5f6f8a')}
      <path class="near" d="M0 150 C300 130 700 140 1200 120 V370 H0 Z"/>
      <path d="M${px - 40} 40 L${px + 40} 40 L${px + 70} ${F} L${px - 10} ${F} Z" ${hc('#c9c4b8', '#2a2c4c')}/>${Array.from({ length: 12 }, (_, k) => { const t = k / 11, y = 40 + (F - 40) * t; return `<path d="M${px - 40 + 30 * t} ${y} H${px + 40 + 30 * t}" ${hs('#a8a49a', '#22244a')} stroke-width="2"/>`; }).join('')}
      <path d="M${px - 46} 40 L${px - 16} ${F} M${px + 46} 40 L${px + 76} ${F}" ${hs('#8a8f99', '#3a3d66')} stroke-width="3"/>
      ${ginkgo(900, 1.2)}${ginkgo(1120, 1)}${ginkgo(80, 1.1)}
      <path d="M-20 ${F - 4} H1220" ${hs('#8a8476', '#2a2a46')} stroke-width="3"/>${Array.from({ length: 30 }, (_, k) => `<path d="M${k * 42} ${F - 18} V${F}" ${hs('#8a8476', '#2a2a46')} stroke-width="3"/>`).join('')}<path d="M-20 ${F - 14} H1220" ${hs('#8a8476', '#2a2a46')} stroke-width="2"/>
      <path d="M327 ${F - 92} C300 ${F - 92} 292 ${F - 62} 274 ${F - 32} C262 ${F - 12} 250 ${F - 6} 228 ${F - 6}" fill="none" ${hs('#3f7ac8', '#2a3460')} stroke-width="13" stroke-linecap="round"/><path d="M327 ${F - 98} C298 ${F - 98} 288 ${F - 68} 270 ${F - 38} C258 ${F - 18} 246 ${F - 12} 226 ${F - 12}" fill="none" ${hs('#7fb0e8', '#3a4a7a')} stroke-width="3" stroke-linecap="round"/><path d="M278 ${F - 30} V${F}" ${hs('#8a8f99', '#3a3d66')} stroke-width="4"/><path d="M330 ${F - 90} V${F} M352 ${F - 90} V${F}" ${hs('#8a8f99', '#3a3d66')} stroke-width="4"/>${[0, 1, 2, 3, 4].map((k) => `<path d="M330 ${F - 18 - k * 18} H352" ${hs('#8a8f99', '#3a3d66')} stroke-width="3"/>`).join('')}<rect x="326" y="${F - 98}" width="30" height="10" rx="2" ${hc('#e6a23c', '#4a3a2a')}/>
      <path d="M470 ${F} L490 ${F - 100} H610 L630 ${F}" fill="none" ${hs('#d0574b', '#4a2c40')} stroke-width="5"/>${swing(520, 0)}${swing(580, 1)}
      <rect x="660" y="${F + 30}" width="110" height="40" rx="4" ${hc('#e6d3a8', '#3a3456')}/><rect x="660" y="${F + 30}" width="110" height="40" rx="4" fill="none" ${hs('#b9a37a', '#2a2a46')} stroke-width="5"/><path d="M690 ${F + 52} q10 -12 20 0 Z" ${hc('#d9c08a', '#3a3456')}/><path d="M728 ${F + 40} h18 l-3 16 h-12 Z" ${hc('#d0453c', '#5a2030')}/><path d="M729 ${F + 40} q8 -10 16 0" fill="none" ${hs('#8a2f2a', '#3a2030')} stroke-width="1.4"/><path d="M752 ${F + 36} l10 18" ${hs('#e6c23a', '#5a5030')} stroke-width="3" stroke-linecap="round"/><path d="M760 ${F + 52} l6 10 l-8 -2 Z" ${hc('#e6c23a', '#5a5030')}/>
      <rect x="800" y="${F - 120}" width="8" height="120" ${hc('#5a5a64', '#1c1d3c')}/><circle cx="804" cy="${F - 132}" r="18" ${hc('#fbf7ec', '#fff0c0')}/><circle cx="804" cy="${F - 132}" r="18" fill="none" ${hs('#3a3a44', '#3a3a44')} stroke-width="3"/>${clockHands(804, F - 132, 16)}<circle class="glow" cx="804" cy="${F - 132}" r="60" fill="url(#glw)"/>${lightPool(804, F + 8, 90)}${streetLamp(1030, F + 2, 116)}
      <rect x="114" y="${F - 12}" width="40" height="12" ${hc('#a9a497', '#2c2e4c')}/><path d="M120 ${F - 12} Q120 ${F - 52} 134 ${F - 54} Q148 ${F - 52} 148 ${F - 12} Z" ${hc('#b4ad9e', '#3a3c5e')}/><path d="M122 ${F - 32} Q134 ${F - 22} 146 ${F - 32} L144 ${F - 24} Q134 ${F - 16} 124 ${F - 24} Z" ${hc('#d0453c', '#5a2030')}/>
      ${[[880, -60], [1000, -20], [1100, -80], [60, -40], [160, -90], [700, 20]].map(([x, y], k) => leaf(x, y, k)).join('')}
      <path d="M700 ${F + 4} Q720 -40 760 -230" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="1"/><g class="fx-sway" style="animation-duration:3s;transform-origin:760px -230px"><path d="M744 -262 h32 v30 h-32 Z" ${hc('#f2c94c', '#5a5030')}/><path d="M744 -262 l32 30 M776 -262 l-32 30" stroke="#d0453c" stroke-width="1.6"/><path d="M760 -232 q-8 16 4 30 q-10 14 2 28" fill="none" stroke="#e58fa8" stroke-width="2"/></g>
      <rect x="-20" y="${F}" width="1240" height="134" ${hc('#d9c7a2', '#2a2846')}/>${Array.from({ length: 22 }, (_, j) => `<path d="M${j * 56} ${F + 30 + (j % 3) * 28} q6 -6 12 0" ${hs('#c2ad84', '#22203e')} stroke-width="2"/>`).join('')}
      <g data-fx="pigeons">${pigeonArt(560, F + 100, 0)}${pigeonArt(596, F + 106, 1)}</g>
      ${Array.from({ length: 9 }, (_, k) => `<path d="M${646 + k * 16} ${F - 2} v-12" stroke="#4f7a4a" stroke-width="1.6"/><path d="M${642 + k * 16} ${F - 20} q4 -6 8 0 v5 h-8 Z" ${hc(['#e86f5e', '#f2c94c', '#e58fa8'][k % 3], '#3a2c48')}/>`).join('')}
    </svg>
    ${benchProps(200, F + 60, 50)}${benchProps(980, F + 60, 50)}${landProp(74, `<rect x="852" y="${F + 26}" width="18" height="34" rx="2" ${hc('#a9a497', '#2c2e4c')}/><rect x="844" y="${F + 20}" width="34" height="8" rx="3" ${hc('#bdb8aa', '#3a3c5e')}/><path d="M861 ${F + 20} v-6 h6" fill="none" ${hs('#8a8f99', '#3a3d66')} stroke-width="2.4"/><path data-fx="fountain" d="M867 ${F + 14} q4 -6 7 2" fill="none" stroke="#9fd0f0" stroke-width="1.6" class="fx-blink"/>`, null, [838, F + 2, 886, F + 62])}${landProp(116, panda(430, F + 18), null, [402, F - 50, 466, F + 22])}
    ${yHeroHtml()}
    ${TOWNEV.castHtml('park')}
    <button type="button" class="thing way-btn" data-act="go-place" data-to="town" aria-label="往小鎮" style="margin-left:${PARK_PATH - 32}px;bottom:186px"><span class="tag">${ySign('shop', '往小鎮')}</span></button>
    <button type="button" class="thing way-btn" data-act="go-place" data-to="street" aria-label="往大馬路" style="margin-left:${-YARD_HALF + 40}px;bottom:70px"><span class="tag">${ySign('bus', '往大馬路')}</span></button>
    <div class="ysel"></div>`;
}
// the two shops one can walk into (2026-11-10: seen at 45° like 書房, ISO): drawn in the 1200 × 900 frame of a room's land.
// In a room: the hero, the people there now, the way out by its door (on the left wall)
const indoorRest = (place) => { const [dx, dy] = isoXY(0, ISO.door[1], 4.9); return `${yHeroHtml()}${TOWNEV.castHtml(place)}
    <button type="button" class="thing way-btn" data-act="go-place" data-to="town" aria-label="出去" style="margin-left:${Math.round(dx) - 32}px;bottom:${Math.round(dy)}px"><span class="tag">${ySign('today', '出去')}</span></button>
    <div class="ysel"></div>`; };
// drawing in the room: a point, a face, a box (its two faces toward us and its top, shaded as 書房's light falls), flat things on
// the left wall (p = −v, q = −h), on a wall or face across at v (p = u, q = −h), on a level at height h (p = u, q = v); a round
// thing standing up (a stool, a barrel)
const iPt = (u, v, h = 0) => isoPt(u, v, h).map((n) => n.toFixed(1)).join(' ');
const iPoly = (pts, fill, more = '') => `<path d="M${pts.map((q) => iPt(...q)).join(' L')} Z" fill="${fill}"${more}/>`;
const iShade = (c, k) => mixHex(c, '#1c120a', k);
const iBox = (c, u0, v0, h0, u1, v1, h1, o = {}) => iPoly([[u0, v1, h0], [u1, v1, h0], [u1, v1, h1], [u0, v1, h1]], o.fv || iShade(c, 0.1))
  + iPoly([[u1, v0, h0], [u1, v1, h0], [u1, v1, h1], [u1, v0, h1]], o.fu || iShade(c, 0.24)) + iPoly([[u0, v0, h1], [u1, v0, h1], [u1, v1, h1], [u0, v1, h1]], o.top || c);
const iOnL = (inner, u0 = 0) => `<g transform="matrix(${ISO.U} ${-ISO.U / 2} 0 ${ISO.U} ${ISO.ox + u0 * ISO.U} ${ISO.oy + u0 * ISO.U / 2})">${inner}</g>`;
const iOnV = (v0, inner) => `<g transform="matrix(${ISO.U} ${ISO.U / 2} 0 ${ISO.U} ${ISO.ox - v0 * ISO.U} ${ISO.oy + v0 * ISO.U / 2})">${inner}</g>`;
const iOnF = (h, inner) => `<g transform="matrix(${ISO.U} ${ISO.U / 2} ${-ISO.U} ${ISO.U / 2} ${ISO.ox} ${ISO.oy - h * ISO.U})">${inner}</g>`;
function iCyl(u, v, r, h0, h1, side, top) {
  const [x, y0] = isoPt(u, v, h0), y1 = isoPt(u, v, h1)[1], rx = r * ISO.U * Math.SQRT2, ry = rx / 2;
  return `<path d="M${(x - rx).toFixed(1)} ${y1.toFixed(1)} V${y0.toFixed(1)} A${rx.toFixed(1)} ${ry.toFixed(1)} 0 0 0 ${(x + rx).toFixed(1)} ${y0.toFixed(1)} V${y1.toFixed(1)} Z" fill="${side}"/><ellipse cx="${x.toFixed(1)}" cy="${y1.toFixed(1)}" rx="${rx.toFixed(1)}" ry="${ry.toFixed(1)}" fill="${top}"/>`;
}
// things standing off a wall (2026-11-10, the user: the walls' things looked like paper): a board or a post on the left wall (u = 0)
// d deep, from v0 to v1 and h0 to h1 — draw on its face with iOnL(…, d); the same on the right wall (v = 0), its face iOnV(d, …)
const wallL = (c, v0, v1, h0, h1, d, o) => iBox(c, 0, v0, h0, d, v1, h1, o);
const wallR = (c, u0, u1, h0, h1, d, o) => iBox(c, u0, 0, h0, u1, d, h1, o);
// a doorway's frame standing out of a wall (its far post, its near post, the lintel over them), the noren on a rod before it
const frameL = (v0, v1, h, c) => wallL(c, v0 - 0.16, v0, 0, h, 0.2) + wallL(c, v1, v1 + 0.16, 0, h, 0.2) + wallL(c, v0 - 0.16, v1 + 0.16, h, h + 0.24, 0.22);
const frameR = (u0, u1, h, c) => wallR(c, u0 - 0.16, u0, 0, h, 0.2) + wallR(c, u1, u1 + 0.16, 0, h, 0.2) + wallR(c, u0 - 0.16, u1 + 0.16, h, h + 0.24, 0.22);
const ISO_DEFS = `<defs><linearGradient id="isoAoV" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity=".2"/><stop offset="1" stop-color="#000" stop-opacity="0"/></linearGradient>
  <linearGradient id="isoAoU" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#000" stop-opacity=".2"/><stop offset="1" stop-color="#000" stop-opacity="0"/></linearGradient></defs>`;
const SERIF = `font-family="'Hiragino Mincho ProN', 'Noto Serif JP', serif"`;
// the room's shell: the floor in planks, the two walls with their wainscot, the shade where they meet the floor, the block's cut
// edges (the floor's front edges, the walls' ends and tops) as 書房's
function isoShell(c) {
  const { RW, RD, RH } = ISO, T = 0.5, W = 2.4;
  let seams = ''; for (let i = 0, q = 0.7; q < RD; q += 0.7, i++) { seams += `M0 ${q.toFixed(2)} H${RW} `; for (let p = (i * 1.9) % 3.4 + 0.6; p < RW; p += 3.4) seams += `M${p.toFixed(2)} ${(q - 0.7).toFixed(2)} v.7 `; }
  const battens = (n) => Array.from({ length: Math.floor(n / 0.8) }, (_, i) => `M${(0.4 + i * 0.8).toFixed(2)} ${-W} V0`).join(' ');
  return iPoly([[0, 0, 0], [RW, 0, 0], [RW, RD, 0], [0, RD, 0]], c.floor) + iOnF(0, `<path d="${seams}" fill="none" stroke="${c.seam}" stroke-width=".035"/>`)
    + iPoly([[0, 0, 0], [0, RD, 0], [0, RD, RH], [0, 0, RH]], c.wallL) + iPoly([[0, 0, 0], [RW, 0, 0], [RW, 0, RH], [0, 0, RH]], c.wallR)
    + iOnL(`<rect x="${-RD}" y="${-W}" width="${RD}" height="${W}" fill="${c.wainL}"/><path d="${battens(RD).replace(/M(\d)/g, 'M-$1')}" stroke="${c.batten}" stroke-width=".07"/><rect x="${-RD}" y="${-W - 0.14}" width="${RD}" height=".16" fill="${c.trim}"/><rect x="${-RD}" y="${-RH}" width="${RD}" height=".22" fill="${c.trim}"/>`)
    + iOnV(0, `<rect x="0" y="${-W}" width="${RW}" height="${W}" fill="${c.wainR}"/><path d="${battens(RW)}" stroke="${c.batten}" stroke-width=".07"/><rect x="0" y="${-W - 0.14}" width="${RW}" height=".16" fill="${c.trim}"/><rect x="0" y="${-RH}" width="${RW}" height=".22" fill="${c.trim}"/>`)
    + iOnF(0, `<rect x="0" y="0" width="${RW}" height=".9" fill="url(#isoAoV)"/><rect x="0" y="0" width=".9" height="${RD}" fill="url(#isoAoU)"/>`)
    + iPoly([[RW, -T, 0], [RW, RD, 0], [RW, RD, -T], [RW, -T, -T]], c.edgeU) + iPoly([[-T, RD, 0], [RW, RD, 0], [RW, RD, -T], [-T, RD, -T]], c.edgeV)
    + iPoly([[0, RD, 0], [-T, RD, 0], [-T, RD, RH], [0, RD, RH]], c.capV) + iPoly([[RW, 0, 0], [RW, -T, 0], [RW, -T, RH], [RW, 0, RH]], c.capU)
    + iPoly([[-T, -T, RH], [RW, -T, RH], [RW, 0, RH], [0, 0, RH], [0, RD, RH], [-T, RD, RH]], c.top);
}
// a chair at a table, its seat at (u, v): its back on the far side (far: whoever sits there faces us) or on the near side
function iChair(u, v, far, c = '#9a6a40') {
  const w = 0.42, back = far ? iBox(iShade(c, 0.12), u - w, v - w, 0.85, u + w, v - w + 0.12, 2.1) : iBox(iShade(c, 0.12), u - w, v + w - 0.12, 0.85, u + w, v + w, 2.1);
  const legs = [[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([a, b]) => iBox(iShade(c, 0.3), u + a * 0.34 - 0.05, v + b * 0.34 - 0.05, 0, u + a * 0.34 + 0.05, v + b * 0.34 + 0.05, 0.75)).join('');
  return far ? back + legs + iBox(c, u - w, v - w, 0.75, u + w, v + w, 0.85) : legs + iBox(c, u - w, v - w, 0.75, u + w, v + w, 0.85) + back;
}
// a hanging paper lantern by a wall (at u, v, its top at h), swaying, with its glow; the char on it
const iLantern = (u, v, h, k, ch) => { const [x, y] = isoPt(u, v, h); return `<circle cx="${x.toFixed(1)}" cy="${(y + 24).toFixed(1)}" r="70" fill="url(#glw)" opacity=".55"/><g class="fx-sway" style="animation-delay:-${(k * 0.7).toFixed(1)}s;animation-duration:${(3 + (k % 3) * 0.4).toFixed(1)}s"><path d="M${x.toFixed(1)} ${(y - 12).toFixed(1)} v10" stroke="#2b2b33" stroke-width="1.6"/><rect x="${(x - 9).toFixed(1)}" y="${(y - 3).toFixed(1)}" width="18" height="5" fill="#2b2b33"/><ellipse cx="${x.toFixed(1)}" cy="${(y + 18).toFixed(1)}" rx="15" ry="19" fill="#d84a3a"/><path d="M${(x - 15).toFixed(1)} ${(y + 12).toFixed(1)} h30 M${(x - 15).toFixed(1)} ${(y + 24).toFixed(1)} h30" stroke="#a8302a" stroke-width="1.4"/><ellipse cx="${(x - 5).toFixed(1)}" cy="${(y + 13).toFixed(1)}" rx="4" ry="8" fill="#ffd0a0" opacity=".35"/><text x="${x.toFixed(1)}" y="${(y + 22).toFixed(1)}" text-anchor="middle" font-size="10" font-weight="700" fill="#2b2b33" ${SERIF}>${ch}</text><rect x="${(x - 9).toFixed(1)}" y="${(y + 35).toFixed(1)}" width="18" height="4" fill="#2b2b33"/></g>`; };
// steam off something at (u, v, h)
const iSteam = (u, v, h, k, r = 6) => { const [x, y] = isoPt(u, v, h); return `<g transform="translate(${x.toFixed(1)} ${(y - 8).toFixed(1)})"><ellipse rx="${r}" ry="${r * 0.75}" class="fx-steam" fill="#fff" style="animation-delay:-${k}s"/></g>`; };
// a bowl on a table or the counter (at its top, h)
const iBowl = (u, v, h, c) => { const [x, y] = isoPt(u, v, h); return `<path d="M${(x - 8).toFixed(1)} ${(y - 4).toFixed(1)} h16 q-1 7 -8 7 q-7 0 -8 -7 Z" fill="#f4efe4"/><ellipse cx="${x.toFixed(1)}" cy="${(y - 4).toFixed(1)}" rx="8" ry="2.8" fill="${c}"/>`; };
// まんぷく食堂 at 45°: the kitchen behind the counter along the right wall (its cook), red stools before it, two tables with their
// chairs on the far side (whoever sits there faces us; 2026-11-10, the user: four chairs a table crowded into each other), the
// menu, the kamidana and the door on the left wall, the kitchen's noren, the TV
function shokudoHtml() {
  isoProps = [];
  const menu = [['カレー', '500円'], ['ラーメン', '600円'], ['うどん', '450円'], ['ぎゅうどん', '550円'], ['さかな定食', '800円'], ['からあげ定食', '750円'], ['おにぎり', '150円'], ['みそしる', '100円']];
  const tanzaku = [['親子丼', '700円'], ['天ぷら', '900円'], ['生姜焼き', '780円'], ['冷やっこ', '250円'], ['お新香', '200円'], ['ビール', '500円']];
  const table = ([u0, u1, v0, v1], k) => { const um = (u0 + u1) / 2, [sx, sy] = isoPt(um, (v0 + v1) / 2, 1.42);
    return [[u0 + 0.2, v0 + 0.2], [u1 - 0.3, v0 + 0.2], [u0 + 0.2, v1 - 0.3], [u1 - 0.3, v1 - 0.3]].map(([a, b]) => iBox('#5e3e24', a, b, 0, a + 0.1, b + 0.1, 1.3)).join('') + iBox('#b07a46', u0, v0, 1.3, u1, v1, 1.42, { top: '#c8925a' })
      + iBowl(u0 + 0.8, v0 + 0.5, 1.42, '#e6a23c') + iBowl(u1 - 0.8, v0 + 0.5, 1.42, '#c84a3a') + iSteam(u0 + 0.8, v0 + 0.5, 1.42, k)
      + `<rect x="${(sx - 3).toFixed(1)}" y="${(sy - 13).toFixed(1)}" width="6" height="11" rx="2" fill="#4a2a1c"/><rect x="${(sx + 5).toFixed(1)}" y="${(sy - 9).toFixed(1)}" width="9" height="7" rx="1" fill="#f3ead6"/>`; };
  const [cx, cy] = isoPt(2.4, 2.0, 1.95);
  const land = `<svg class="land indoor-land iso" viewBox="0 -530 1200 900" preserveAspectRatio="xMidYMax slice" style="height:900px">${GLOW_DEFS}${ISO_DEFS}
    ${isoShell({ floor: '#c9a276', seam: '#9a744c', wallL: '#efe2c6', wallR: '#f6ead2', wainL: '#a87a4c', wainR: '#b88a5c', batten: '#946640', trim: '#6e4a30', edgeU: '#8a6440', edgeV: '#a07850', capU: '#d9c9a8', capV: '#e8d8b8', top: '#cdb995' })}
    ${iOnF(0, `<rect x="0" y="0" width="15" height="1.4" fill="#dcd6ca"/><path d="${Array.from({ length: 30 }, (_, i) => `M${(i * 0.5).toFixed(1)} 0 v1.4`).join(' ')} M0 .7 H15" stroke="#c4bdb0" stroke-width=".03"/>`)}
    ${iOnV(0, `<rect x=".3" y="-4.3" width="14.3" height="2.4" fill="#eef0ea"/><path d="${Array.from({ length: 24 }, (_, i) => `M${(0.3 + i * 0.6).toFixed(1)} -4.3 v2.4`).join(' ')} M.3 -3.7 H14.6 M.3 -3.1 H14.6 M.3 -2.5 H14.6" stroke="#d2d6cc" stroke-width=".03"/>
      ${tanzaku.map((_, i) => `<rect x="${(9.17 + i * 0.92).toFixed(2)}" y="-6.6" width=".74" height="2.2" fill="#000" opacity=".13"/>`).join('')}<rect x="16" y="-4.1" width="2.4" height="4.1" fill="#2a1e16"/>
      <circle cx="15.2" cy="-6" r=".52" fill="#000" opacity=".12"/>`)}
    ${wallR('#6e4a30', 1, 8.2, 4.72, 4.86, 0.6, { top: '#8a5e3c' })}${[1.5, 2.9, 4.3, 5.7, 7.1].map((u) => iCyl(u, 0.32, 0.3, 4.86, 5.03, '#efe9dc', '#fbf8f0') + iCyl(u, 0.32, 0.27, 5.03, 5.2, '#f4efe4', '#fbf8f0')).join('')}
    ${wallR('#7a5230', 8.85, 14.75, 6.68, 6.82, 0.16)}${iOnV(0.07, tanzaku.map(([n, pr], i) => `<rect x="${(9.1 + i * 0.92).toFixed(2)}" y="-6.7" width=".74" height="2.2" fill="#fbf6e9" stroke="#d9c79a" stroke-width=".02"/>${vText((9.47 + i * 0.92).toFixed(2), -6.6, n, 0.34, `font-weight="700" fill="#3b2a1c" ${SERIF}`)}<text x="${(9.47 + i * 0.92).toFixed(2)}" y="-4.64" text-anchor="middle" font-size=".22" fill="#a0402c" font-family="system-ui, sans-serif">${pr}</text>`).join(''))}
    ${iOnV(0, '<circle cx="15.2" cy="-6" r=".5" fill="#5e3e24"/>')}${iOnV(0.15, `<circle cx="15.2" cy="-6" r=".46" fill="#fbf7ec" stroke="#6e4a30" stroke-width=".08"/>${[0, 90, 180, 270].map((d) => `<path d="M15.2 -6.38 v.08" stroke="#6e4a30" stroke-width=".04" transform="rotate(${d} 15.2 -6)"/>`).join('')}<path d="M15.2 -6 v-.24" stroke="#3b2a1c" stroke-width=".07" stroke-linecap="round" style="transform-box:fill-box;transform-origin:50% 100%;transform:rotate(var(--hh, 0deg))"/><path d="M15.2 -6 v-.36" stroke="#3b2a1c" stroke-width=".045" stroke-linecap="round" style="transform-box:fill-box;transform-origin:50% 100%;transform:rotate(var(--mm, 0deg))"/>`)}
    ${frameR(16, 18.4, 4.1, '#5e3e24')}${wallR('#3a2a20', 15.9, 18.5, 4.02, 4.1, 0.34)}${iOnV(0.3, `${[0, 1].map((k) => `<path class="fx-sway" style="animation-duration:3.4s;animation-delay:-${k * 0.8}s" d="M${16.05 + k * 1.17} -4.0 h1.12 v1.45 h-1.12 Z" fill="#c84a3a"/>`).join('')}<text x="17.2" y="-3.15" text-anchor="middle" font-size=".42" font-weight="700" fill="#fff" ${SERIF}>厨房</text>`)}
    ${wallR('#4a4a55', 20.08, 20.32, 6.3, 6.5, 0.5)}${iBox('#3a3a44', 19, 0.45, 5.08, 21.4, 0.72, 6.62)}${iOnV(0.72, `<rect x="19.12" y="-6.5" width="2.16" height="1.28" fill="#7fb3d8"/><g clip-path="url(#isoTv)"><g class="fx-tvpic"><path d="M19.12 -5.7${Array.from({ length: 8 }, () => ' q.27 -.32 .54 0 t.54 0').join('')}" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width=".08"/></g><circle cx="21" cy="-6.2" r=".14" fill="#f2c94c"/></g><defs><clipPath id="isoTv"><rect x="19.12" y="-6.5" width="2.16" height="1.28"/></clipPath></defs>`)}
    ${[3.4, 7.6].map((u) => wallR('#5e3e24', u - 0.05, u + 0.05, 6.15, 6.25, 0.62) + iCyl(u, 0.62, 0.04, 5.85, 6.2, '#3a2a20', '#3a2a20') + iCyl(u, 0.62, 0.3, 5.55, 5.88, '#e8d4a8', '#f4e3b8') + (() => { const [x, y] = isoPt(u, 0.62, 5.5); return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="80" fill="url(#glw)" opacity=".5"/><ellipse cx="${x.toFixed(1)}" cy="${(y + 1).toFixed(1)}" rx="9" ry="3" fill="#fff6d0"/>`; })()).join('')}
    ${wallL('#7a5230', 1.3, 4.2, 6.0, 6.12, 0.9, { top: '#9a6a40' })}${[1.6, 3.9].map((v) => wallL('#6e4a30', v - 0.05, v + 0.05, 5.55, 6.0, 0.72)).join('')}
    ${iBox('#d8b47a', 0.15, 2.3, 6.12, 0.75, 3.2, 6.72)}${iOnL('<rect x="-2.88" y="-6.66" width=".26" height=".5" fill="#8a5a34"/><circle cx="-2.75" cy="-6.42" r=".05" fill="#d9b04a"/>', 0.75)}${iPoly([[0, 3.3, 6.7], [0.9, 3.3, 6.7], [0.45, 3.3, 7.05]], '#6e4a30')}${iPoly([[0.45, 2.2, 7.05], [0.45, 3.3, 7.05], [0.92, 3.3, 6.68], [0.92, 2.2, 6.68]], '#5e3e24')}
    ${[1.75, 3.75].map((v) => iCyl(0.45, v, 0.1, 6.12, 6.36, '#f4efe4', '#e8e2d4') + (() => { const [x, y] = isoPt(0.45, v, 6.36); return [[-5, -8, 5], [4, -10, 5], [0, -15, 4.5]].map(([dx, dy, r]) => `<circle cx="${(x + dx).toFixed(1)}" cy="${(y + dy).toFixed(1)}" r="${r}" fill="#4f7a4a"/>`).join(''); })()).join('')}
    <path d="M${iPt(0.92, 1.35, 6.08)} Q${iPt(0.92, 2.75, 5.85)} ${iPt(0.92, 4.15, 6.08)}" fill="none" stroke="#e8d8a8" stroke-width="3"/>${[2.2, 2.75, 3.3].map((v) => `<path d="M${iPt(0.92, v, 5.98)} l2 4 l-2 4 l2 4" fill="none" stroke="#fff" stroke-width="1.4"/>`).join('')}
    ${wallL('#6e4a30', 4.8, 10.4, 3.4, 6.2, 0.16)}${iOnL(`<rect x="-10.26" y="-6.06" width="5.32" height="2.52" fill="#f6ecd4"/><text x="-7.6" y="-5.6" text-anchor="middle" font-size=".36" font-weight="700" fill="#3b2a1c" ${SERIF}>お品書き</text>
      ${menu.map(([n, pr], i) => { const x = i < 4 ? -10.05 : -7.45, y = -5.15 + (i % 4) * 0.42; return `<text x="${x}" y="${y.toFixed(2)}" font-size=".27" font-weight="700" fill="#3b2a1c" ${SERIF}>${n}</text><text x="${(x + 2.3).toFixed(2)}" y="${y.toFixed(2)}" text-anchor="end" font-size=".23" fill="#a0402c" font-family="system-ui, sans-serif">${pr}</text>`; }).join('')}`, 0.16)}
    ${wallL('#e8dcc4', 10.95, 11.85, 5.2, 6.3, 0.05)}${iOnL('<rect x="-11.85" y="-6.3" width=".9" height=".26" fill="#d0453c"/><text x="-11.4" y="-5.42" text-anchor="middle" font-size=".5" font-weight="800" fill="#3b2a1c">11</text>', 0.05)}
    ${iOnL(`<rect x="-14.8" y="-4.62" width="2.8" height="4.62" fill="#3a2a20"/>${[0, 1].map((k) => `<rect x="${(-14.7 + k * 1.36).toFixed(2)}" y="-4.55" width="1.32" height="4.55" fill="#d6e8ee" opacity=".92"/><path d="M${(-14.7 + k * 1.36).toFixed(2)} -3 h1.32 M${(-14.7 + k * 1.36).toFixed(2)} -1.6 h1.32 M${(-14.04 + k * 1.36).toFixed(2)} -4.55 v4.55" stroke="#8a6a52" stroke-width=".06"/>`).join('')}`, 0.03)}
    ${frameL(12, 14.8, 4.62, '#6e4a30')}${wallL('#3a2a20', 11.9, 14.9, 4.5, 4.58, 0.36)}${iOnL(`${[0, 1, 2].map((k) => `<path class="fx-sway" style="animation-duration:3.6s;animation-delay:-${k * 0.6}s" d="M${(-14.72 + k * 0.9).toFixed(2)} -4.5 h.86 v1.2 h-.86 Z" fill="#2f3a5e"/>`).join('')}<text x="-13.4" y="-3.72" text-anchor="middle" font-size=".44" font-weight="700" fill="#fff" ${SERIF}>めし</text>`, 0.32)}
    ${iBox('#c9cdd2', 0.3, 0.05, 0, 14.6, 0.65, 1.8, { top: '#e2e5e8', fv: '#b8bcc2', fu: '#a4a8ae' })}${iOnF(1.8, `${[2.4, 3.4].map((u) => `<circle cx="${u}" cy=".35" r=".26" fill="none" stroke="#3a3a44" stroke-width=".06"/>`).join('')}<rect x="7.6" y=".12" width="1.6" height=".42" fill="#e8d8b8"/>`)}
    ${iCyl(5.2, 0.35, 0.32, 1.8, 2.35, '#8a8f99', '#a8adb6')}${iSteam(5.2, 0.35, 2.35, 0, 9)}${iCyl(11, 0.35, 0.28, 1.8, 2.3, '#f2efe8', '#e2ddd2')}
    ${iBox('#e6c23a', 0.5, 9.6, 0, 1.9, 11, 0.75)}${iBox('#d9b42e', 0.5, 9.6, 0.75, 1.9, 11, 1.5)}${[[0.85, 9.95], [1.55, 9.95], [0.85, 10.65], [1.55, 10.65]].map(([u, v]) => iCyl(u, v, 0.12, 1.5, 1.85, '#6b3a2a', '#8a5a40')).join('')}
    ${iCyl(21.1, 1.1, 0.36, 0, 0.8, '#a8604a', '#7a4434')}${(() => { const [x, y] = isoPt(21.1, 1.1, 0.8); return [[-10, -18, 12], [8, -22, 13], [0, -34, 12], [-14, -32, 10], [12, -38, 9]].map(([dx, dy, r]) => `<circle cx="${(x + dx).toFixed(1)}" cy="${(y + dy).toFixed(1)}" r="${r}" fill="#5f9a4a"/>`).join(''); })()}
  </svg>`;
  const props = isoProp([1.6, 14.4, 1.4, 2.6], iBox('#9a6538', 1.6, 1.4, 0, 14.4, 2.6, 1.95, { top: '#d8ad7f', fv: '#9a6538', fu: '#7a5030' }) + iOnV(2.6, Array.from({ length: 16 }, (_, i) => `<path d="M${(2.1 + i * 0.8).toFixed(1)} -.05 V-1.85" stroke="#7a5230" stroke-width=".05"/>`).join('') + '<path d="M1.6 -1.86 H14.4" stroke="#c58a54" stroke-width=".1"/>')
      + [4, 6.5, 9, 11.5].map((u, i) => iBowl(u, 2.2, 1.95, ['#e6a23c', '#c84a3a', '#d9b04a', '#7fae5a'][i])).join('') + [5.3, 10.3].map((u) => { const [x, y] = isoPt(u, 2.1, 1.95); return `<rect x="${(x - 3).toFixed(1)}" y="${(y - 12).toFixed(1)}" width="6" height="10" rx="2" fill="#4a2a1c"/><rect x="${(x + 5).toFixed(1)}" y="${(y - 10).toFixed(1)}" width="10" height="8" rx="1" fill="#f3ead6"/>`; }).join('')
      + `<g data-fx="maneki"><g transform="translate(${cx.toFixed(1)} ${(cy - 18).toFixed(1)}) scale(.7)"><ellipse cx="0" cy="26" rx="14" ry="4" fill="#000" opacity=".15"/><path d="M-11 26 Q-13 6 0 4 Q13 6 11 26 Z" fill="#fff"/><circle cy="0" r="10" fill="#fff"/><path d="M-8 -6 L-6 -14 L-2 -8 M8 -6 L6 -14 L2 -8" fill="#fff" stroke="#e58fa8" stroke-width="1"/><path class="paw" d="M11 6 Q20 -6 14 -16" stroke="#fff" stroke-width="5" fill="none" stroke-linecap="round"/><circle cx="-4" cy="0" r="1.3" fill="#333"/><circle cx="4" cy="0" r="1.3" fill="#333"/><circle cy="14" r="4" fill="#e3c46a"/></g></g>`, 3.2)
    + [4, 6.5, 9, 11.5].map((u) => isoProp([u - 0.42, u + 0.42, 2.93, 3.77], iCyl(u, 3.35, 0.3, 0, 0.05, '#4a4a55', '#5a5a64') + iCyl(u, 3.35, 0.07, 0.05, 0.92, '#5a5a64', '#5a5a64') + iCyl(u, 3.35, 0.42, 0.92, 1.05, '#a8302a', '#d0453c'), 1.05)).join('')
    + SHOKUDO_TABLES.flatMap(([u0, u1, v0]) => [u0 + 0.8, u1 - 0.8].map((u) => isoProp([u - 0.42, u + 0.42, v0 - 1.17, v0 - 0.33], iChair(u, v0 - 0.75, true), 2.1))).join('')
    + SHOKUDO_TABLES.map((t, k) => isoProp([t[0], t[1], t[2], t[3]], table(t, k * 1.3), 1.42)).join('');
  return `${land}${isoLay(props)}${indoorRest('shokudo')}`;
}
// 居酒屋とり吉 at 45°: the counter along the right wall with its grill (the master behind it), a cabinet of bottles on the wall
// behind him (2026-11-10, the user: the bottles and their shelves flat on the wall), stools before the counter, red lanterns,
// the chalkboard and the door on the left wall, sake barrels, a tatami 小上がり with its low table where people kneel
function izakayaHtml() {
  isoProps = [];
  const board = [['焼き鳥', '1本 120円'], ['えだまめ', '300円'], ['からあげ', '480円'], ['おにぎり', '200円'], ['ウーロン茶', '250円'], ['ビール', '500円']];
  const taru = (u, v, h) => { const [x, y] = isoPt(u + 0.42, v + 0.42, h + 0.62); return iCyl(u, v, 0.6, h, h + 1.2, '#efe6d0', '#e2d6bc') + iOnF(h + 1.2, `<circle cx="${u}" cy="${v}" r=".45" fill="none" stroke="#c9b48a" stroke-width=".05"/>`) + (() => { const [x0, y0] = isoPt(u, v, h + 0.3), [, y1] = isoPt(u, v, h + 0.9), rx = 0.6 * ISO.U * Math.SQRT2; return `<path d="M${(x0 - rx).toFixed(1)} ${y0.toFixed(1)} A${rx.toFixed(1)} ${(rx / 2).toFixed(1)} 0 0 0 ${(x0 + rx).toFixed(1)} ${y0.toFixed(1)} M${(x0 - rx).toFixed(1)} ${y1.toFixed(1)} A${rx.toFixed(1)} ${(rx / 2).toFixed(1)} 0 0 0 ${(x0 + rx).toFixed(1)} ${y1.toFixed(1)}" fill="none" stroke="#8a6a46" stroke-width="2.4"/>`; })() + `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" text-anchor="middle" font-size="14" font-weight="800" fill="#c8453a" ${SERIF}>酒</text>`; };
  // the cabinet: its back on the wall, its sides, three shelves of bottles standing on them (each a body, a neck and a label), its top
  const cabinet = (() => {
    const u0 = 1.8, u1 = 14.2, d = 0.55, top = 6.05, cols = ['#2f5a3a', '#6b3a2a', '#e9e2d0', '#3a4a6e', '#8a6a2a'];
    let out = iOnV(0, `<rect x="${u0}" y="${-top}" width="${u1 - u0}" height="${(top - 2.7).toFixed(2)}" fill="#3a2418"/>`) + iBox('#4a2f20', u0 - 0.15, 0, 2.7, u0, d, top);
    [2.8, 3.95, 5.0].forEach((h, li) => {
      out += iBox('#6e4a30', u0, 0, h - 0.1, u1, d, h, { top: '#8a5e3c' });
      for (let i = 0; u0 + 0.45 + i * 0.8 < u1 - 0.25; i++) {
        const u = u0 + 0.45 + i * 0.8, c = cols[(i + li * 2) % 5], hb = [0.7, 0.62, 0.55][li] + (i % 3) * 0.07, [lx, ly] = isoPt(u + 0.08, d / 2 + 0.12, h + hb * 0.45);
        out += iCyl(u, d / 2, 0.15, h, h + hb, c, mixHex(c, '#ffffff', 0.18)) + iCyl(u, d / 2, 0.06, h + hb, h + hb + 0.26, c, mixHex(c, '#ffffff', 0.25)) + `<rect x="${(lx - 3.5).toFixed(1)}" y="${(ly - 4).toFixed(1)}" width="7" height="7" rx="1" fill="#f3e7cc" opacity=".92"/>`;
      }
    });
    return out + iBox('#4a2f20', u1, 0, 2.7, u1 + 0.15, d, top) + iBox('#5e3e24', u0 - 0.15, 0, top, u1 + 0.15, d, top + 0.14, { top: '#6e4a30' });
  })();
  const [gx, gy] = isoPt(7.7, 1.85, 2.25);
  const land = `<svg class="land indoor-land iso" viewBox="0 -530 1200 900" preserveAspectRatio="xMidYMax slice" style="height:900px">${GLOW_DEFS}${ISO_DEFS}
    ${isoShell({ floor: '#5c3e2b', seam: '#3a281c', wallL: '#6c4832', wallR: '#78523a', wainL: '#4a2f20', wainR: '#523424', batten: '#3a2418', trim: '#2e1e14', edgeU: '#3a281c', edgeV: '#46301f', capU: '#5a3e2c', capV: '#664632', top: '#4e3424' })}
    ${iOnF(0, '<rect x="0" y="0" width="15.6" height="1.6" fill="#4a3426"/>')}
    ${iOnV(0, '<rect x="16.6" y="-4.1" width="2.4" height="4.1" fill="#21160f"/>')}${frameR(16.6, 19, 4.1, '#3a2418')}${wallR('#2e1e14', 16.5, 19.1, 4.02, 4.1, 0.34)}${iOnV(0.3, [0, 1].map((k) => `<path class="fx-sway" style="animation-duration:3.4s;animation-delay:-${k * 0.8}s" d="M${16.65 + k * 1.17} -4.0 h1.12 v1.2 h-1.12 Z" fill="#2f3a5e"/>`).join(''))}
    ${wallR('#c9a06a', 19.85, 21.55, 4.15, 6.45, 0.07)}${iOnV(0.07, `<rect x="19.95" y="-6.35" width="1.5" height="2.1" fill="#f3e7cc"/><circle cx="20.7" cy="-5.6" r=".42" fill="#f0b43c"/><path d="M20.4 -5.9 h.6 v.62 h-.6 Z" fill="#fbf8f0" opacity=".8"/><text x="20.7" y="-4.45" text-anchor="middle" font-size=".34" font-weight="800" fill="#c8453a" font-family="system-ui, sans-serif">ビール</text>`)}
    ${cabinet}
    ${wallL('#7a5230', 2.9, 8.7, 3.5, 6.5, 0.16)}${iOnL(`<rect x="-8.56" y="-6.36" width="5.52" height="2.72" fill="#2f3b33"/><text x="-5.8" y="-5.86" text-anchor="middle" font-size=".38" font-weight="700" fill="#f3e7cc" ${SERIF}>今日のおすすめ</text>
      ${board.map(([n, pr], i) => { const x = i % 2 ? -5.7 : -8.35, y = -5.3 + Math.floor(i / 2) * 0.48; return `<text x="${x}" y="${y.toFixed(2)}" font-size=".3" fill="#f3e7cc" font-family="system-ui, sans-serif">${n}</text><text x="${(x + 2.5).toFixed(2)}" y="${y.toFixed(2)}" text-anchor="end" font-size=".26" fill="#ffd27a" font-family="system-ui, sans-serif">${pr}</text>`; }).join('')}`, 0.16)}${wallL('#6e4a30', 3.1, 8.5, 3.36, 3.5, 0.3)}${(() => { const [x, y] = isoPt(0.24, 7.6, 3.5); return `<rect x="${(x - 5).toFixed(1)}" y="${(y - 3).toFixed(1)}" width="10" height="3" rx="1" fill="#f3e7cc"/>`; })()}
    ${iOnL('<rect x="-14.8" y="-4.62" width="2.8" height="4.62" fill="#1c2340"/><path d="M-13.4 -4.62 V0" stroke="#2e1e14" stroke-width=".08"/>', 0.03)}${frameL(12, 14.8, 4.62, '#2e1e14')}${wallL('#21160f', 11.9, 14.9, 4.5, 4.58, 0.36)}${iOnL(`${[0, 1, 2].map((k) => `<path class="fx-sway" style="animation-duration:3.6s;animation-delay:-${k * 0.6}s" d="M${(-14.72 + k * 0.9).toFixed(2)} -4.5 h.86 v1.5 h-.86 Z" fill="#8a2f2a"/>`).join('')}<text x="-13.4" y="-3.55" text-anchor="middle" font-size=".42" font-weight="700" fill="#fff" ${SERIF}>とり吉</text>`, 0.32)}
    ${iBox('#4a2f20', 0.3, 0.05, 0, 15, 0.6, 1.7, { top: '#6e4a30' })}${[2.6, 3.4, 9.6, 10.4, 13.2].map((u, i) => iCyl(u, 0.32, 0.14, 1.7, 2.35 - (i % 2) * 0.15, ['#e9e2d0', '#2f5a3a', '#e9e2d0', '#6b3a2a', '#3a4a6e'][i], '#3a2a20')).join('')}
    ${taru(1.1, 9.4, 0)}${taru(1.1, 10.7, 0)}${taru(1.1, 10.05, 1.2)}
    ${iBox('#6e4a30', 14.6, 7.4, 0, 22, 16, 0.6, { top: '#b9c288', fv: '#5e3e24', fu: '#4e3220' })}${iOnF(0.6, `<path d="M14.6 7.4 H22 V16 H14.6 Z M18.3 7.4 V16 M14.6 11.7 H22" fill="none" stroke="#56603a" stroke-width=".09"/>${[[17.6, 9.3], [19.2, 9.3], [17.6, 13.2], [19.2, 13.2]].map(([u, v]) => `<rect x="${u - 0.45}" y="${v - 0.45}" width=".9" height=".9" rx=".14" fill="#7a4a8a"/>`).join('')}`)}${iBox('#a8a49a', 13.8, 10.9, 0, 14.6, 11.9, 0.3, { top: '#bdb8ac' })}
    <path d="M${iPt(3, 0.55, 7.15)} L${iPt(19.5, 0.55, 7.15)} M${iPt(0.55, 1.5, 7.15)} L${iPt(0.55, 11, 7.15)}" stroke="#2b2b33" stroke-width="1.4" fill="none"/>
    ${[3, 7, 11, 15, 19.5].map((u, k) => iLantern(u, 0.55, 7.15, k, '酒鳥吉酒鳥'[k])).join('')}${[1.6, 10.2].map((v, k) => iLantern(0.55, v, 7.15, k + 5, '吉酒'[k])).join('')}
  </svg>`;
  const props = isoProp([1.8, 15.2, 1.6, 2.8], iBox('#3a2418', 1.8, 1.6, 0, 15.2, 2.8, 1.95, { top: '#c58a54', fv: '#3a2418', fu: '#2e1c12' }) + iOnV(2.8, Array.from({ length: 17 }, (_, i) => `<path d="M${(2.2 + i * 0.8).toFixed(1)} -.05 V-1.85" stroke="#2a1810" stroke-width=".06"/>`).join(''))
      + iBox('#2b2b33', 6, 1.65, 1.95, 9.4, 2.05, 2.15) + iOnF(2.15, '<rect x="6.1" y="1.7" width="3.2" height=".3" fill="#e8592e"/><rect x="6.1" y="1.7" width="3.2" height=".3" fill="#ffb24a" class="fx-blink" style="animation-duration:2.2s;opacity:.6"/>')
      + [6.4, 6.9, 7.4, 7.9, 8.4, 8.9].map((u) => { const [x, y] = isoPt(u, 1.85, 2.15); return `<path d="M${(x - 4).toFixed(1)} ${(y + 1).toFixed(1)} l8 -10" stroke="#c9a06a" stroke-width="2" stroke-linecap="round"/><circle cx="${(x + 1).toFixed(1)}" cy="${(y - 5).toFixed(1)}" r="3" fill="#a0502c"/>`; }).join('')
      + [0, 1].map((k) => `<g transform="translate(${(gx - 12 + k * 22).toFixed(1)} ${(gy - 14).toFixed(1)})"><ellipse rx="11" ry="8" class="fx-steam" fill="#e8e2d4" style="animation-delay:-${k * 1.8}s"/></g>`).join('')
      + [[4.1, 2.4], [6.6, 2.45], [11.6, 2.4]].map(([u, v]) => { const [x, y] = isoPt(u, v, 1.95); return `<rect x="${(x - 5).toFixed(1)}" y="${(y - 15).toFixed(1)}" width="10" height="14" rx="1.5" fill="#f0b43c"/><path d="M${(x + 5).toFixed(1)} ${(y - 12).toFixed(1)} h3 v7 h-3" fill="none" stroke="#e9e2d0" stroke-width="1.6"/><path d="M${(x - 6).toFixed(1)} ${(y - 15).toFixed(1)} q3 -4 6 -1 q3 -3 6 1 Z" fill="#fbf8f0"/>`; }).join('')
      + iBowl(5.3, 2.25, 1.95, '#7fae5a') + (() => { const [x, y] = isoPt(12.8, 2.2, 1.95); return `<path d="M${(x - 4).toFixed(1)} ${(y - 1).toFixed(1)} q-4 -8 1 -16 h6 q5 8 1 16 Z" fill="#f3ead6"/><path d="M${(x - 2).toFixed(1)} ${(y - 15).toFixed(1)} h5" stroke="#2f4a6e" stroke-width="1.6"/>`; })(), 2.4)
    + [4, 6.5, 9, 11.5, 14].map((u) => isoProp([u - 0.42, u + 0.42, 3.18, 4.02], iCyl(u, 3.6, 0.3, 0, 0.05, '#21160f', '#2e1e14') + iCyl(u, 3.6, 0.07, 0.05, 0.92, '#2e1e14', '#2e1e14') + iCyl(u, 3.6, 0.42, 0.92, 1.05, '#a8743f', '#c58a54'), 1.05)).join('')
    + isoProp([17, 19.8, 10.1, 12.4], [[17.2, 10.3], [19.5, 10.3], [17.2, 12.1], [19.5, 12.1]].map(([u, v]) => iBox('#4a2f20', u, v, 0.6, u + 0.12, v + 0.12, 1.05)).join('') + iBox('#7a5232', 17, 10.1, 1.05, 19.8, 12.4, 1.17, { top: '#8f6040' })
      + iBowl(17.9, 10.8, 1.17, '#7fae5a') + iCyl(18.6, 11.3, 0.3, 1.17, 1.5, '#5a5a64', '#3a3a44') + iSteam(18.6, 11.3, 1.5, 0.5, 8) + (() => { const [x, y] = isoPt(19.2, 10.9, 1.17); return `<path d="M${(x - 4).toFixed(1)} ${(y - 1).toFixed(1)} q-4 -8 1 -16 h6 q5 8 1 16 Z" fill="#f3ead6"/><rect x="${(x + 6).toFixed(1)}" y="${(y - 6).toFixed(1)}" width="6" height="5" fill="#f3ead6"/>`; })(), 1.6);
  return `${land}${isoLay(props)}${indoorRest('izakaya')}`;
}
// the bus stop (test, 2026-11-09) on the main road's far pavement (#/street) — a shelter with a bench, a timetable and the stop's
// round sign on a pole. Tapped: the hero walks over and sits on the bench, legs swinging (later the bus takes him to other
// places). Drawn like a yard ware (in the hero's units, its feet at BUS, smaller further up); its sign is apart, unscaled
const BUS = { X: 56, Y: 126, seat: 40 };   // seat: the bench's height
// the main road (#/street): the path from the yard comes down from the far fields to its far pavement, the bus stop beside it;
// the road across, a pavement this side, grass below. The same sky as the yard's
// a soft light that fades out (warm: lamps and doors; cool: a drinks machine), shown by night (.glow): one set for whichever
// place is drawn — a flat disc at low opacity read as a grey blot on the dark (2026-11-10)
// words down a sign, a character at a time (2026-11-10: writing-mode set them out of place on an iPhone): the first one's top
// centre at (x, y), fs apart; ー stood upright
const vText = (x, y, words, fs, more = '') => [...words].map((ch, i) => `<text x="${x}" y="${(y + fs * (i + 0.86)).toFixed(2)}" text-anchor="middle" font-size="${fs}" ${more}>${ch === 'ー' ? '｜' : ch}</text>`).join('');
// a house far off (2026-11-10): its wall, the roof with shade under the eaves, two windows in white frames with a cross bar
// (glass by day, lit by night, one later than the other), a door; ext: the wall on down behind what stands in front
const farHouse = (x, b, w, h, roof, wall = '#efe6d6', ext = 0) => {
  const ww = Math.max(7, w * 0.2), wh = Math.max(6, h * 0.3), wy = b - h * 0.72, dw = Math.max(6, w * 0.16), dh = Math.max(9, h * 0.44);
  const win = (wx, late) => `<rect x="${wx - 1.6}" y="${wy - 1.6}" width="${ww + 3.2}" height="${wh + 3.2}" ${hc('#fbf8f0', '#2a2c50')}/><rect x="${wx}" y="${wy}" width="${ww}" height="${wh}" ${hc('#b9d0da', '#1a1c3c')}/><rect class="lit" x="${wx}" y="${wy}" width="${ww}" height="${wh}"${late ? ' style="opacity:calc(.08 + .6 * (1 - var(--day)))"' : ''}/><path d="M${wx + ww / 2} ${wy} v${wh} M${wx} ${wy + wh / 2} h${ww}" ${hs('#fbf8f0', '#2a2c50')} stroke-width="1.2"/>`;
  return `<rect x="${x}" y="${b - h}" width="${w}" height="${h + ext}" ${hc(wall, '#1e2042')}/><rect x="${x}" y="${b - h}" width="${w}" height="4" fill="#000" fill-opacity=".08"/>
    <path d="M${x - 6} ${b - h + 2} L${x + w / 2} ${b - h - w * 0.32} L${x + w + 6} ${b - h + 2} Z" ${hc(roof, '#15163a')}/><path d="M${x - 6} ${b - h + 2} H${x + w + 6}" stroke="#000" stroke-opacity=".14" stroke-width="2"/>
    ${win(x + w * 0.1, false)}${win(x + w * 0.9 - ww, true)}<rect x="${x + w / 2 - dw / 2}" y="${b - dh}" width="${dw}" height="${dh}" ${hc('#8a6a52', '#2a2440')}/>`;
};
// a thing on a place's ground the hero can walk behind (2026-11-10): a layer of its own over the land, in front of whoever stands
// further back than its foot (Y px up), as the yard's wares are; room: drawn in a room's frame (shokudo, izakaya)
const landProp = (Y, art, room, box) => (box ? `${propSvg(box.map(Math.round), 300 - Math.round(Y))}${art}</svg>` : `<svg class="land prop ${room ? 'indoor-land' : 'tall'}" viewBox="${room ? '0 -530 1200 900' : '0 -400 1200 770'}" preserveAspectRatio="xMidYMax slice" aria-hidden="true" style="z-index:${300 - Math.round(Y)}${room ? ';height:900px' : ''}">${art}</svg>`);   // box: its size (propSvg)
// a park bench with a back: its seat from x, w long, at y; legs down to y + 24 (foot: Y px up there). Two layers: its back further
// back than its seat, so someone sitting on it (a spot's sit) shows between them and the hero behind it goes behind both
const benchBack = (x, y, w = 90) => `<path d="M${x + 6} ${y} V${y - 22} M${x + w - 6} ${y} V${y - 22}" ${hs('#6e4f3a', '#2c2440')} stroke-width="4"/><rect x="${x + 2}" y="${y - 22}" width="${w - 4}" height="6" rx="2" ${hc('#c58a54', '#3a2c40')}/><rect x="${x + 2}" y="${y - 13}" width="${w - 4}" height="6" rx="2" ${hc('#b67c48', '#33283c')}/>`;
const benchSeat = (x, y, w = 90) => `${groundShade(x + w / 2, y + 24, w * 0.55)}<rect x="${x}" y="${y}" width="${w}" height="8" rx="2" ${hc('#c58a54', '#3a2c40')}/><rect x="${x + 8}" y="${y + 8}" width="6" height="16" ${hc('#6e4f3a', '#2c2440')}/><rect x="${x + w - 14}" y="${y + 8}" width="6" height="16" ${hc('#6e4f3a', '#2c2440')}/>`;
const benchProps = (x, y, foot, w = 90, more = '') => { const box = [x - w * 0.1 - 2, y - 30, x + w * 1.1 + 2, y + 30]; return landProp(foot + 11, benchBack(x, y, w), null, box) + landProp(foot, benchSeat(x, y, w) + more, null, box); };
// a clock's hands at the scenes' hour (body's --hh, --mm, as 書房's clock): round (x, y), r long
const clockHands = (x, y, r, ink = '#3b2a1c') => `<path d="M${x} ${y} v${-r * 0.55}" stroke="${ink}" stroke-width="${Math.max(2, r * 0.16)}" stroke-linecap="round" style="transform-box:view-box;transform-origin:${x}px ${y}px;transform:rotate(var(--hh, 0deg))"/><path d="M${x} ${y} v${-r * 0.8}" stroke="${ink}" stroke-width="${Math.max(1.4, r * 0.1)}" stroke-linecap="round" style="transform-box:view-box;transform-origin:${x}px ${y}px;transform:rotate(var(--mm, 0deg))"/><circle cx="${x}" cy="${y}" r="${Math.max(1.5, r * 0.1)}" fill="${ink}"/>`;
// by night (round 3, 2026-11-10): lamplight on the ground under a lamp, a street lamp on its post (its head at y − h), the moon's
// glitter on the sea in a column of shimmering strokes (from y0 down to y1), a soft shadow under a thing by day
const lightPool = (x, y, rx, ry = rx * 0.28) => `<ellipse class="glow" cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="url(#glw)"/>`;
const streetLamp = (x, y, h = 120) => `${lightPool(x, y + 4, 90)}<rect x="${x - 2.5}" y="${y - h}" width="5" height="${h}" ${hc('#5a5a64', '#1c1d3c')}/><path d="M${x} ${y - h} q0 -10 12 -10 h8" fill="none" ${hs('#5a5a64', '#1c1d3c')} stroke-width="4"/><path d="M${x + 12} ${y - h - 12} h18 l-3 7 h-12 Z" ${hc('#4a4a55', '#1c1d3c')}/><ellipse cx="${x + 21}" cy="${y - h - 4}" rx="6" ry="2.6" ${hc('#e8e4d8', '#fff0b8')}/><path class="glow" d="M${x + 15} ${y - h - 4} L${x - 30} ${y} H${x + 72} L${x + 27} ${y - h - 4} Z" fill="url(#glw)" style="opacity:calc((1 - var(--day)) * .35)"/>`;
const moonGlitter = (x, y0, y1) => `<g class="glow">${Array.from({ length: 9 }, (_, k) => { const t = k / 8, y = y0 + (y1 - y0) * t, w = 8 + 34 * t; return `<path class="fx-blink" style="animation-delay:-${(k * 0.37).toFixed(2)}s;animation-duration:${(1.6 + (k % 3) * 0.5).toFixed(1)}s" d="M${x - w / 2 + (k % 2) * 6} ${y.toFixed(1)} h${w}" stroke="#fff6d8" stroke-width="${1.6 + t}" stroke-linecap="round"/>`; }).join('')}</g>`;
const groundShade = (x, y, rx, ry = 4) => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="#2b1c12" style="opacity:calc(.12 * var(--day))"/>`;
const pigeonArt = (x, y, k) => `<g class="fx-peck" style="animation-delay:-${k * 0.6}s"><ellipse cx="${x}" cy="${y}" rx="9" ry="6" ${hc('#8d93a8', '#2c2f52')}/><circle cx="${x + 8}" cy="${y - 6}" r="4" ${hc('#7a8098', '#2c2f52')}/><path d="M${x + 12} ${y - 6} l3 1" ${hs('#d0904a', '#3a3d66')} stroke-width="1.6"/><path d="M${x - 9} ${y - 2} l-6 -2" ${hs('#6a7088', '#2c2f52')} stroke-width="3"/></g>`;
const GLOW_DEFS = `<defs><radialGradient id="glw"><stop offset="0" stop-color="#ffd98a" stop-opacity=".7"/><stop offset=".55" stop-color="#ffc870" stop-opacity=".22"/><stop offset="1" stop-color="#ffc870" stop-opacity="0"/></radialGradient>
  <radialGradient id="glc"><stop offset="0" stop-color="#e6f2ff" stop-opacity=".7"/><stop offset=".55" stop-color="#cfe2ff" stop-opacity=".2"/><stop offset="1" stop-color="#cfe2ff" stop-opacity="0"/></radialGradient></defs>`;
function streetHtml() {
  const y = (Y) => 370 - Y, [w0, w1] = STREET.walk, [r0, r1] = STREET.road, [n0, n1] = STREET.near, ground = 'M0 164 C220 150 420 146 600 148 C800 150 1000 146 1200 158';
  const tree = (x, b, r) => `<rect class="trunk" x="${x - r * 0.18}" y="${b - r * 2.1}" width="${r * 0.36}" height="${r * 2.1}"/><g class="crown"><circle cx="${x}" cy="${b - r * 2.4}" r="${r}"/><circle cx="${x - r * 0.75}" cy="${b - r * 1.75}" r="${r * 0.68}"/><circle cx="${x + r * 0.8}" cy="${b - r * 1.8}" r="${r * 0.72}"/></g>`;
  // 2026-11-10: the village up the hill, the poles and their wires over the road (sparrows on them), a drinks machine lit by
  // night, a red postbox, a crossing, and now and then a little truck along the near lane
  const house = (x, b, w, h, roof, wall) => farHouse(x, b, w, h, roof, wall);
  const cyclist = `<g class="fx-car" style="animation-duration:31s;animation-delay:-12s"><g transform="translate(0 ${y(n0 + 8)})"><g ${hs('#4a4a55', '#3a3d66')} stroke-width="2.2" fill="none"><circle cx="-14" cy="-9" r="9"/><circle cx="14" cy="-9" r="9"/><path d="M-14 -9 L-4 -24 L10 -24 L14 -9 M-4 -24 L0 -9 L10 -24 M10 -24 l-2 -6 h6"/></g><rect x="-10" y="-22" width="12" height="3" rx="1.5" fill="#8a6a52"/><path d="M-4 -40 L-2 -24 M-2 -24 l6 10 M-2 -24 l-4 12" ${hs('#2f4a6e', '#2a2c50')} stroke-width="4" stroke-linecap="round"/><path d="M-6 -50 h10 l2 14 h-14 Z" ${hc('#e86f5e', '#4a2c48')}/><path d="M2 -46 l8 8" ${hs('#f8dcc8', '#6a5a6a')} stroke-width="3" stroke-linecap="round"/><circle cx="0" cy="-57" r="7" ${hc('#f8dcc8', '#6a5a6a')}/><path d="M-7 -58 q2 -10 8 -9 q6 1 6 8 q-6 -4 -14 1 Z" ${hc('#3b2f2a', '#1a1828')}/><rect x="8" y="-30" width="10" height="7" rx="1" ${hc('#c58a54', '#3a2c40')}/></g></g>`;
  const POLES = [160, 520, 880], WY = [-82, -66, -50], sag = (t, s) => 2 * t * (1 - t) * s;
  const pole = (x) => `<rect x="${x - 5}" y="-100" width="10" height="${w1 > 0 ? 336 : 0}" ${hc('#8d8a84', '#24254a')}/><rect x="${x - 30}" y="-86" width="60" height="5" rx="1" ${hc('#6f6c66', '#1c1d3e')}/><rect x="${x - 24}" y="-70" width="48" height="4" rx="1" ${hc('#6f6c66', '#1c1d3e')}/>${[-24, -8, 8, 24].map((d) => `<rect x="${x + d - 2}" y="-92" width="4" height="7" rx="1.5" ${hc('#e8e4d8', '#4a4c78')}/>`).join('')}<rect x="${x - 8}" y="-30" width="16" height="22" rx="2" ${hc('#a8a49a', '#2a2c50')}/>`;
  const spans = [-200].concat(POLES, [1240]);
  const wires = WY.map((wy, k) => spans.slice(0, -1).map((x0, i) => { const x1 = spans[i + 1]; return `<path class="wire" d="M${x0} ${wy} Q${(x0 + x1) / 2} ${wy + 2 * (26 + k * 4)} ${x1} ${wy}"/>`; }).join('')).join('');
  const sparrow = (x0, x1, t, wy, s, k) => { const x = x0 + (x1 - x0) * t, yy = wy + sag(t, 2 * s) - 4; return `<g class="fx-peck" style="animation-delay:-${k * 0.7}s"><ellipse cx="${x}" cy="${yy}" rx="5" ry="4" ${hc('#7a5a3e', '#1a1b36')}/><circle cx="${x + 4}" cy="${yy - 3}" r="2.6" ${hc('#7a5a3e', '#1a1b36')}/><path d="M${x - 4} ${yy} l-5 2" ${hs('#5a4030', '#1a1b36')} stroke-width="2"/></g>`; };
  const vend = (x) => `<rect x="${x}" y="160" width="46" height="76" rx="3" ${hc('#e9edf0', '#3a4470')}/><rect x="${x + 4}" y="166" width="38" height="34" rx="2" ${hc('#cfe6ec', '#e6f2ff')}/>${[0, 1, 2].map((r) => [0, 1, 2, 3].map((c) => `<rect x="${x + 7 + c * 9}" y="${169 + r * 11}" width="6" height="8" rx="1.5" fill="${['#d0574b', '#3f7ac8', '#e6a23c', '#4f7a4a'][(r + c) % 4]}"/>`).join('')).join('')}<rect x="${x + 6}" y="206" width="34" height="5" rx="1" ${hc('#2b2b33', '#1c1d3c')}/><rect x="${x + 10}" y="218" width="26" height="10" rx="2" ${hc('#2b2b33', '#141530')}/><ellipse class="glow" cx="${x + 23}" cy="196" rx="70" ry="56" fill="url(#glc)"/>`;
  const post = (x) => `<rect x="${x - 3}" y="206" width="6" height="30" ${hc('#5a5a64', '#1c1d3c')}/><rect x="${x - 13}" y="176" width="26" height="34" rx="6" ${hc('#d0453c', '#5a2030')}/><rect x="${x - 8}" y="184" width="16" height="3" rx="1" ${hc('#2b2b33', '#1c1d3c')}/><path d="M${x - 6} 192 h12 M${x - 6} 196 h12 M${x} 196 v8" ${hs('#fff', '#c9c4e8')} stroke-width="1.6"/>`;   // 〒
  const truck = `<g class="fx-car"><g transform="translate(0 ${y((r0 + r1) / 2 - 22)})"><path d="M-56 -4 V-26 H6 V-4 Z" ${hc('#ecebe6', '#4a4c72')}/><path d="M6 -4 V-34 Q6 -40 12 -40 H30 Q38 -40 42 -30 L50 -16 V-4 Z" ${hc('#f4f3ee', '#555880')}/><path d="M14 -36 H28 Q33 -36 36 -30 L40 -22 H14 Z" ${hc('#9fc6d6', '#ffe2a0')}/><circle cx="-36" cy="-4" r="8" fill="#2b2b33"/><circle cx="34" cy="-4" r="8" fill="#2b2b33"/><circle cx="-36" cy="-4" r="3" fill="#9a9ea8"/><circle cx="34" cy="-4" r="3" fill="#9a9ea8"/><path class="glow" d="M50 -14 L200 -40 L200 22 Z" fill="url(#trBeam)"/><circle cx="49" cy="-14" r="3" fill="#ffd98a"/></g></g>`;
  return `<svg class="land tall street-land" viewBox="0 -400 1200 770" preserveAspectRatio="xMidYMax slice">${GLOW_DEFS}
      <defs><linearGradient id="trBeam"><stop offset="0" stop-color="#fff2c0" stop-opacity=".55"/><stop offset="1" stop-color="#fff2c0" stop-opacity="0"/></linearGradient></defs>
      <path class="far" d="M0 122 C120 100 240 104 360 118 S560 96 700 110 S900 126 1020 104 S1150 100 1200 110 V370 H0 Z"/>
      ${house(110, 126, 54, 34, '#8a5a44', '#efe4d2')}${house(300, 118, 46, 30, '#5f6f8a', '#ece6da')}${house(660, 116, 60, 36, '#8a5a44', '#f1e8d8')}${house(840, 124, 44, 28, '#6f5a7a', '#ede4d6')}${house(1040, 112, 58, 34, '#5f6f8a', '#efe6d4')}
      <path class="near" d="${ground} V370 H0 Z"/><path class="ridge" d="${ground}"/>
      ${tree(250, 214, 15)}${tree(430, 206, 12)}${tree(500, 216, 9)}${tree(760, 196, 13)}${tree(980, 218, 16)}${tree(1110, 196, 10)}
      <path class="lane" d="${stripD(STREET_LANE, 18)}"/>
      ${wires}${POLES.map(pole).join('')}
      ${sparrow(160, 520, 0.32, WY[0], 26, 0)}${sparrow(160, 520, 0.4, WY[0], 26, 1)}${sparrow(520, 880, 0.62, WY[1], 30, 2)}${sparrow(880, 1240, 0.3, WY[2], 34, 3)}
      <g class="fx-fly"><g transform="translate(0 -250)"><path  d="M0 0 q8 -8 16 0 q8 -8 16 0" ${hsx('fx-wing', '#4a4a55', '#5a5e90')} stroke-width="2.4"/></g><g transform="translate(40 -230) scale(.8)"><path  d="M0 0 q8 -8 16 0 q8 -8 16 0" ${hsx('fx-wing', '#4a4a55', '#5a5e90', `animation-delay:-.2s`)} stroke-width="2.4"/></g></g>
      <rect class="pave" x="-20" y="${y(w1)}" width="1240" height="${w1 - w0}"/><rect class="kerb" x="-20" y="${y(w0) - 3}" width="1240" height="4"/>
      <g data-fx="vend">${vend(390)}</g><g data-fx="post">${post(760)}</g>
      <path d="M500 236 V160" ${hs('#e8913a', '#4a3a2a')} stroke-width="4"/><circle cx="500" cy="152" r="14" ${hc('#e8913a', '#4a3a2a')}/><circle cx="500" cy="152" r="10.5" ${hc('#cfe3ea', '#2a3060')}/><path d="M493 148 q7 -6 14 2" fill="none" stroke="#fff" stroke-opacity=".7" stroke-width="2"/>
      ${streetLamp(250, 236, 130)}${streetLamp(1000, 236, 130)}
      <rect class="asphalt" x="-20" y="${y(r1)}" width="1240" height="${r1 - r0}"/>
      <path class="rline" d="M-20 ${y(r1) + 6} H1220 M-20 ${y(r0) - 6} H1220"/><path class="rline dash" d="M-20 ${y((r0 + r1) / 2)} H1220"/>
      <text x="850" y="${y((r0 + r1) / 2) - 8}" text-anchor="middle" font-size="20" font-weight="800" fill="#f4f2ec" fill-opacity=".85" font-family="system-ui, sans-serif" transform="translate(850 ${y((r0 + r1) / 2) - 8}) scale(1 .6) translate(-850 ${-(y((r0 + r1) / 2) - 8)})">止まれ</text>
      ${Array.from({ length: 6 }, (_, i) => `<rect x="${930}" y="${y(r1) + 10 + i * 10}" width="90" height="5" ${hc('#f4f2ec', '#3a3d66')}/>`).join('')}
      ${truck}${cyclist}
      <rect class="kerb" x="-20" y="${y(n1)}" width="1240" height="4"/><rect class="pave" x="-20" y="${y(n1) + 4}" width="1240" height="${n1 - n0 - 4}"/>
    </svg>
    ${yHeroHtml()}
    ${busStopHtml()}
    ${TOWNEV.castHtml('street')}
    <button type="button" class="thing way-btn" data-act="go-place" data-to="yard" aria-label="回家" style="margin-left:${Math.round(STREET_LANE.at(0)[0]) - 32}px;bottom:${STREET_LANE.Y0 - 30}px"><span class="tag">${ySign('today', '回家')}</span></button>
    <button type="button" class="thing way-btn" data-act="go-place" data-to="harbor" aria-label="往漁港" style="margin-left:${-YARD_HALF + 40}px;bottom:58px"><span class="tag">${ySign('wave', '往漁港')}</span></button>
    <button type="button" class="thing way-btn" data-act="go-place" data-to="park" aria-label="往公園" style="margin-left:${YARD_HALF - 72}px;bottom:58px"><span class="tag">${ySign('spark', '往公園')}</span></button>
    <div class="ysel"></div>`;
}
// between the places out of doors (test, 2026-11-09): the yard's path down to the main road, the yard's left edge along to the
// beach. The hero walks to the way out (out), fades, and the other place opens with him coming in (in: where he appears, where
// he walks to; yh.arrive)
const PLACE_ROUTE = { yard: '#/outside', street: '#/street', beach: '#/beach', town: '#/town', harbor: '#/harbor', park: '#/park', shokudo: '#/shokudo', izakaya: '#/izakaya', station: '#/station', sento: '#/sento', shrine: '#/shrine', castle: '#/castle' };
// where a place's sight stands, for the camera to look at on the way in (2026-11-10: 白鷺城 was off the screen of a phone)
const PLACE_LOOK = { castle: 280, shokudo: 130 };
const OUT_PLACES = Object.keys(PLACE_ROUTE).filter((p) => p !== 'yard');   // the places out and about besides the yard, each its own route
const WAYS = {
  'yard>street': { out: () => [LANE.at(1)[0], 4], in: () => [[STREET_LANE.at(0)[0], 214], [STREET_LANE.at(1)[0] + 8, 126]] },
  'street>yard': { out: () => [STREET_LANE.at(0)[0], 222], in: () => [[LANE.at(1)[0], 12], [-11, 56]] },
  // the yard's to the beach and the town go off towards where they are seen far below (YARD_GATE; 2026-11-10, the user)
  'yard>beach': { out: () => YARD_GATE.beach, in: () => [[YARD_HALF, 62], [YARD_HALF - 90, 62]] },
  'beach>yard': { out: () => [YARD_HALF, 62], in: () => [YARD_GATE.beach, [-360, 120]] },
  'yard>town': { out: () => YARD_GATE.town, in: () => [[-YARD_HALF, 64], [-YARD_HALF + 90, 64]] },
  'town>yard': { out: () => [-YARD_HALF, 64], in: () => [YARD_GATE.town, [360, 120]] },
  // through a shop's door in town (its door: TOWN_SHOPS, x + w − 28 − 600) into the room, in by its door on the left
  'town>shokudo': { out: () => [-36, 130], in: () => [isoXY(...ISO.door), isoXY(...ISO.in)] },   // in by the room's door, on its left wall
  'shokudo>town': { out: () => isoXY(...ISO.door), in: () => [[-36, 130], [-36, 98]] },
  'town>izakaya': { out: () => [402, 130], in: () => [isoXY(...ISO.door), isoXY(...ISO.in)] },
  'izakaya>town': { out: () => isoXY(...ISO.door), in: () => [[402, 130], [402, 98]] },
  // 2026-11-10, the map joined up: along the edges in a row (the near pavement or the shore), down to the viewer and in by a path
  // from the back between the rows (the beach down to the harbor, the town down to the park)
  'street>harbor': { out: () => [-YARD_HALF, 40], in: () => [[YARD_HALF, 40], [YARD_HALF - 90, 40]] },
  'harbor>street': { out: () => [YARD_HALF, 40], in: () => [[-YARD_HALF, 40], [-YARD_HALF + 90, 40]] },
  'street>park': { out: () => [YARD_HALF, 40], in: () => [[-YARD_HALF, 40], [-YARD_HALF + 90, 40]] },
  'park>street': { out: () => [-YARD_HALF, 40], in: () => [[YARD_HALF, 40], [YARD_HALF - 90, 40]] },
  'beach>harbor': { out: () => [-420, 4], in: () => [[HARBOR_PATH, 214], [HARBOR_PATH + 20, 104]] },
  'harbor>beach': { out: () => [HARBOR_PATH, 222], in: () => [[-420, 6], [-400, 50]] },
  'town>park': { out: () => [180, 4], in: () => [[PARK_PATH, 214], [PARK_PATH - 20, 104]] },
  'park>town': { out: () => [PARK_PATH, 222], in: () => [[180, 6], [180, 50]] }
};
const HARBOR_PATH = -380, PARK_PATH = 360;
const YARD_GATE = { beach: [-470, 204], town: [480, 214] };   // the yard's edge towards the beach and the town seen far below (X, Y): their signs stand there
function yGo(el, to) {
  yNamed(el);
  const yard = el.closest('.yard'), h = yard && yard.querySelector('.yhero'), way = WAYS[`${yPlace}>${to}`]; if (!way) return;
  const leave = () => { yh.arrive = { from: yPlace, to }; go(PLACE_ROUTE[to]); };
  if (!h || (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches)) { leave(); return; }
  if (yPlace === 'yard' && YARD_FAR[to]) { h.classList.add('fading'); yHeroWalk(yard, yToward([yh.X, yh.Y], way.out(), 110), () => yFar(yard, to, false, leave), true); return; }   // a few steps toward the edge, fading, then the long way down
  yHeroWalk(yard, way.out(), () => { h.classList.add('out'); setTimeout(leave, 260); }, true);
}
// the yard's ways down to the beach and the town (2026-11-10, the user: as far as they are, on the road, like the climb to
// 古道具屋): over the lawn to its edge, out of sight down the hill, then small on the zigzag path seen far below and all the way
// along it (outlined, behind the yard's things); home the other way, then in over the lawn. YARD_FAR: those paths in the yard's
// land, from the hill's foot to their far end. A tap on the way: there at once (yh.far)
// a point at most `most` px from `from` on the way to `to` (2026-11-10, the user: he crossed the whole lawn to its edge first and
// looked to go twice — now a few steps that way, fading out, before the far path; home the same the other way)
const yToward = (from, to, most) => { const dx = to[0] - from[0], dy = to[1] - from[1], d = Math.hypot(dx, dy), k = d > most ? most / d : 1; return [from[0] + dx * k, from[1] + dy * k]; };
const YARD_FAR = { beach: [[74, 214], [40, 202], [118, 190], [64, 178], [150, 168], [120, 158]], town: [[1128, 216], [1166, 200], [1084, 188], [1146, 174], [1066, 164], [1100, 152]] };
function yFar(yard, side, home, done) {
  const h = yard.querySelector('.yhero'); if (!h) { done(); return; }
  const pts = (home ? YARD_FAR[side].slice().reverse() : YARD_FAR[side]).map(([x, y]) => [x - 600, 370 - y]), s = 0.1, seg = []; let len = 0;
  for (let i = 1; i < pts.length; i++) { const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); seg.push([pts[i - 1], pts[i], len, d]); len += d; }
  const v = len / 2;   // the whole way in two seconds (2026-11-10, the user: it was nearly four)
  let fin = false;
  const end = () => { if (fin) return; fin = true; cancelAnimationFrame(yh.raf); yh.far = null; h.classList.add('out'); setTimeout(() => { yh.climb = null; yh.s = 0; yClimbLook(h, 0); h.classList.remove('climb', 'run'); done(); }, 220); };
  yh.far = end; h.classList.add('out'); h.classList.remove('run');   // out of sight over the edge
  setTimeout(() => {
    if (!yard.isConnected || fin) return;
    yh.climb = 'hill'; yh.s = s; [yh.X, yh.Y] = pts[0]; yClimbLook(h, s); h.classList.add('climb', 'run'); yHeroPlace(yard); h.classList.remove('out', 'fading');
    const t0 = performance.now();
    const step = (now) => {
      if (!yard.isConnected || fin) return;
      const d = Math.min(len, (now - t0) / 1000 * v), q = seg.find((x) => d <= x[2] + x[3]) || seg[seg.length - 1], f = (d - q[2]) / q[3], dx = q[1][0] - q[0][0], dy = q[1][1] - q[0][1];
      yh.X = q[0][0] + dx * f; yh.Y = q[0][1] + dy * f; yh.back = dy > 0; if (Math.abs(dx) > 0.5) yh.flip = dx < 0; yh.turn = Math.abs(dx) > 0.5 * Math.abs(dy); yHeroPlace(yard);
      if (d < len) { yh.raf = requestAnimationFrame(step); return; }
      end();
    };
    yh.raf = requestAnimationFrame(step);
  }, 220);
}
const BUS_BOX = [-170, -268, 340, 278];
const SHELTER_ART = () => `<ellipse cy="2" rx="150" ry="9" fill="#2b1c12" fill-opacity=".14"/>
  <path d="M-160 8 L156 8 L146 -10 L-150 -10 Z" ${hc('#c9c4b8', '#3a3c5e')}/><path d="M-160 8 H156 V14 H-160 Z" ${hc('#a9a497', '#2c2e4c')}/>
  <rect x="-118" y="-196" width="8" height="190" rx="2" ${hc('#5f7f6a', '#272c4a')}/><rect x="110" y="-196" width="8" height="190" rx="2" ${hc('#5f7f6a', '#272c4a')}/>
  <rect x="-108" y="-178" width="216" height="128" rx="4" ${hc('#cfe6ec', '#2c3560')} fill-opacity=".72"/><path d="M-96 -166 L-60 -70 M-70 -170 L-40 -96" ${hs('#ffffff', '#5a66a8')} stroke-width="5" stroke-opacity=".5"/>
  <rect x="-108" y="-56" width="216" height="6" ${hc('#5f7f6a', '#272c4a')}/>
  <path d="M-136 -192 Q0 -226 136 -192 L136 -184 Q0 -214 -136 -184 Z" ${hc('#d9604c', '#5a2c40')}/><path d="M-136 -186 Q0 -216 136 -186 L134 -176 Q0 -204 -134 -176 Z" ${hc('#b8483a', '#45223a')}/>
  <defs><radialGradient id="bsg"><stop offset="0" stop-color="#ffd98a" stop-opacity=".55"/><stop offset="1" stop-color="#ffd98a" stop-opacity="0"/></radialGradient></defs><ellipse cy="-90" rx="150" ry="120" fill="url(#bsg)" style="opacity:calc(1 - var(--day, 1))"/><rect x="-56" y="-184" width="112" height="5" rx="2.5" ${hc('#e8e4d8', '#ffe2a0')}/>
  <rect x="-84" y="-44" width="168" height="9" rx="3" ${hc('#c58a54', '#4a3a4c')}/><rect x="-84" y="-40" width="168" height="4" ${hc('#a8703e', '#3a2c40')}/>
  <rect x="-74" y="-36" width="7" height="36" ${hc('#7a5a3a', '#2c2440')}/><rect x="67" y="-36" width="7" height="36" ${hc('#7a5a3a', '#2c2440')}/>
  <rect x="-102" y="-150" width="42" height="56" rx="3" ${hc('#fbf7ec', '#e8dcb4')}/><path d="M-96 -140 H-66 M-96 -130 H-72 M-96 -121 H-68 M-96 -112 H-74 M-96 -103 H-70" ${hs('#9a9184', '#4a4e78')} stroke-width="2.4"/>
  <rect x="146" y="-232" width="6" height="232" rx="2" ${hc('#8d9097', '#3a3c58')}/>
  <circle cx="149" cy="-236" r="26" ${hc('#ffffff', '#9da2c8')}/><circle cx="149" cy="-236" r="26" fill="none" ${hs('#2f7a5a', '#2a4a5a')} stroke-width="5"/>
  <rect x="136" y="-250" width="26" height="20" rx="5" ${hc('#2f7a5a', '#2a4a5a')}/><rect x="140" y="-246" width="18" height="7" rx="1.5" ${hc('#ffffff', '#9da2c8')}/><circle cx="142" cy="-229" r="3" ${hc('#2f7a5a', '#2a4a5a')}/><circle cx="156" cy="-229" r="3" ${hc('#2f7a5a', '#2a4a5a')}/>
  <rect x="128" y="-204" width="42" height="18" rx="3" ${hc('#2f7a5a', '#2a4a5a')}/><text x="149" y="-190.5" text-anchor="middle" font-size="12" font-weight="700" fill="#fff" fill-opacity=".92" font-family="system-ui, sans-serif">バス停</text>`;
function busStopHtml() {
  const [x0, y0, w, h] = BUS_BOX, k = yScale(BUS.Y);
  return `<div class="busstop" aria-hidden="true" style="width:${w}px;height:${h}px;margin-left:${x0}px;bottom:${-(y0 + h)}px;transform-origin:${-x0}px ${-y0}px;transform:translate(${BUS.X}px,${-BUS.Y}px) scale(${k.toFixed(3)});z-index:${300 - BUS.Y}"><svg viewBox="${BUS_BOX.join(' ')}">${SHELTER_ART()}</svg></div>
    <button type="button" class="thing bus-btn" data-act="bus-stop" aria-label="公車站" style="margin-left:${Math.round(BUS.X - 130 * k)}px;bottom:${BUS.Y}px;width:${Math.round(290 * k)}px;height:${Math.round(240 * k)}px"><span class="tag">${ySign('bus', '公車站')}</span></button>`;
}
// 稲荷神社 (test, 2026-11-09), up the bus line on the hill: a red torii, a stone path with lanterns, two stone foxes, the hall
// with its rope and bell, the ema board and the omikuji box. From 18 to 22 its 緣日: a row of stalls under paper lanterns — 金魚すくい,
// やきそば, わたあめ — and the people in yukata (TOWNEV.look)
function shrineHtml() {
  const F = 236, fest = TOWNEV.festival();
  // 2026-11-10: a grove of tall cedars, a tunnel of red torii up the hill, the great torii in front, the sacred tree with its rope,
  // the hall's sweeping copper roof, its bell and rope, foxes in red bibs, leaves drifting down; by night at the 緣日 the lanterns
  // sway over the stalls and fireworks open over the trees
  const cedar = (x, base, h, w, near) => `<g ${hc(near ? '#3f6a48' : '#6f8f6a', near ? '#0c1428' : '#141c34')}>${[0, 1, 2, 3].map((k) => `<path d="M${x} ${base - h + k * h * 0.18} L${x - w * (0.45 + k * 0.18)} ${base - h * 0.42 + k * h * 0.12} H${x + w * (0.45 + k * 0.18)} Z"/>`).join('')}</g><rect class="trunk" x="${x - w * 0.08}" y="${base - h * 0.2}" width="${w * 0.16}" height="${h * 0.2}"/>`;
  const smallTorii = (t) => { const x = 330 + 130 * t, b = F - 6 - 112 * t, k = 1 - 0.68 * t, w = 56 * k, h = 66 * k;
    return `<path d="M${x - w / 2} ${b} V${b - h} M${x + w / 2} ${b} V${b - h}" ${hs('#d0453c', '#5a2030')} stroke-width="${Math.max(2, 6 * k)}"/><path d="M${x - w / 2 - 8 * k} ${b - h - 2 * k} Q${x} ${b - h - 8 * k} ${x + w / 2 + 8 * k} ${b - h - 2 * k}" ${hs('#2b2b33', '#141428')} stroke-width="${Math.max(2, 6 * k)}"/><path d="M${x - w / 2} ${b - h + 10 * k} H${x + w / 2}" ${hs('#d0453c', '#5a2030')} stroke-width="${Math.max(1.5, 4 * k)}"/>`; };
  const lantern = (x) => `<rect x="${x - 6}" y="${F - 52}" width="12" height="52" ${hc('#a9a497', '#2c2e4c')}/><rect x="${x - 12}" y="${F - 70}" width="24" height="20" rx="2" ${hc('#c9c4b8', '#3a3c5e')}/><rect x="${x - 7}" y="${F - 66}" width="14" height="12" ${hc('#efe6d6', '#ffd98a')}/><path d="M${x - 16} ${F - 70} L${x} ${F - 84} L${x + 16} ${F - 70} Z" ${hc('#a9a497', '#2c2e4c')}/><circle class="glow" cx="${x}" cy="${F - 60}" r="34" fill="url(#glw)"/>${lightPool(x, F + 4, 50)}`;
  const fox = (x, flip) => `<g transform="translate(${x} ${F - 30}) scale(${flip ? -1 : 1} 1)"><rect x="-14" y="10" width="28" height="20" ${hc('#a9a497', '#2c2e4c')}/><path d="M-8 10 Q-10 -14 0 -22 L4 -34 L7 -20 Q12 -10 8 10 Z" ${hc('#e9e2d0', '#4a4c6e')}/><path d="M-7 -6 Q0 2 8 -6 L6 2 Q0 6 -6 2 Z" ${hc('#d0453c', '#5a2030')}/><circle cx="3" cy="-16" r="1.4" fill="#2b2b33"/></g>`;
  const leaf = (x, y, k, c) => `<g transform="translate(${x} ${y})"><path  d="M0 -6 C5 -6 7 0 0 7 C-7 0 -5 -6 0 -6 Z" ${hcx('fx-fall', c, '#8a5a5a', `animation-delay:-${k * 1.6}s;animation-duration:${10 + (k % 3) * 2}s`)}/></g>`;
  const stall = (x, w, aw, sign) => `<g><rect x="${x}" y="${F - 70}" width="${w}" height="70" ${hc('#c58a54', '#3a2c40')}/><path d="M${x - 6} ${F - 70} h${w + 12} l-8 -22 h${-w + 4} Z" ${hc(aw, '#5a2030')}/>
    ${Array.from({ length: Math.floor(w / 18) }, (_, k) => `<path d="M${x - 4 + k * 18} ${F - 70} q9 8 18 0" ${hc(aw, '#5a2030')}/>`).join('')}<rect x="${x + 10}" y="${F - 64}" width="${w - 20}" height="18" rx="2" ${hc('#fbf7ec', '#e8dcb4')}/>
    <text x="${x + w / 2}" y="${F - 50}" text-anchor="middle" font-size="12" font-weight="700" ${hc('#8a2f2a', '#8a2f2a')} font-family="system-ui, sans-serif">${sign}</text><rect x="${x + 6}" y="${F - 26}" width="${w - 12}" height="10" ${hc('#efe6d6', '#ffe2a0')}/></g>`;
  const chochin = (x0, x1) => `<path d="M${x0} ${F - 120} Q${(x0 + x1) / 2} ${F - 100} ${x1} ${F - 120}" fill="none" ${hs('#2b2b33', '#2b2b33')} stroke-width="1.5"/>${Array.from({ length: Math.floor((x1 - x0) / 36) }, (_, k) => { const x = x0 + 18 + k * 36, y = F - 120 + 20 * (1 - (((x - x0) / (x1 - x0)) * 2 - 1) ** 2);
    return `<g class="fx-sway" style="animation-delay:-${k * 0.4}s"><ellipse cx="${x}" cy="${y + 12}" rx="10" ry="13" ${hc('#e8592e', '#ff8a4a')}/><path d="M${x - 10} ${y + 12} h20" stroke="#a8302a" stroke-width="1"/></g><circle class="glow" cx="${x}" cy="${y + 12}" r="30" fill="url(#glw)"/>`; }).join('')}`;
  const boom = (x, y, k, c) => `<g transform="translate(${x} ${y})"><g class="fx-boom" style="animation-delay:-${k}s">${Array.from({ length: 14 }, (_, i) => { const a = i / 14 * Math.PI * 2; return `<path d="M${(Math.cos(a) * 12).toFixed(1)} ${(Math.sin(a) * 12).toFixed(1)} L${(Math.cos(a) * 52).toFixed(1)} ${(Math.sin(a) * 52).toFixed(1)}" stroke="${c}" stroke-width="2.6" stroke-linecap="round"/><circle cx="${(Math.cos(a) * 58).toFixed(1)}" cy="${(Math.sin(a) * 58).toFixed(1)}" r="2.6" fill="${c}"/>`; }).join('')}</g></g>`;
  return `<svg class="land tall shrine-land" viewBox="0 -400 1200 770" preserveAspectRatio="xMidYMax slice">${GLOW_DEFS}
      <path class="far" d="M0 122 C120 100 240 104 360 118 S560 96 700 110 S900 126 1020 104 S1150 100 1200 110 V370 H0 Z"/>
      ${[[40, 236, 380, 90], [150, 230, 330, 80], [280, 120, 300, 80], [420, 110, 260, 70], [700, 150, 300, 80], [1000, 236, 400, 96], [1130, 236, 360, 90]].map(([x, b, h, w]) => cedar(x, b, h, w, false)).join('')}
      <path d="M240 ${F} C300 200 380 150 470 116 L520 116 C470 150 420 200 400 ${F} Z" ${hc('#b9b0a0', '#24264a')}/>${Array.from({ length: 9 }, (_, t) => smallTorii((8 - t) / 8)).join('')}
      ${cedar(-10, 236, 460, 110, true)}${cedar(1210, 236, 480, 120, true)}
      <rect class="trunk" x="618" y="40" width="44" height="${F - 40}" rx="10"/><g class="crown">${[[640, -40, 120], [560, 10, 80], [720, 10, 86], [600, -110, 80], [690, -100, 76]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}"/>`).join('')}</g>
      <path d="M612 150 Q640 162 668 150" ${hs('#e8d8a8', '#6a6450')} stroke-width="6"/>${[624, 640, 656].map((x) => `<path d="M${x} 156 l3 6 l-3 6 l3 6" ${hs('#ffffff', '#8a8cae')} stroke-width="2"/>`).join('')}
      <rect x="722" y="222" width="376" height="14" ${hc('#b4ad9e', '#2a2c48')}/>
      ${[772, 850, 970, 1048].map((x) => `<rect x="${x - 7}" y="128" width="14" height="94" ${hc('#d0453c', '#4a2030')}/>`).join('')}
      <rect x="779" y="146" width="64" height="76" ${hc('#efe6d6', '#ffd98a')}/><rect x="977" y="146" width="64" height="76" ${hc('#efe6d6', '#ffd98a')}/><rect x="857" y="138" width="106" height="84" ${hc('#5a3b28', '#2a2440')}/>
      <path d="M700 136 C740 134 770 112 800 86 L840 58 H980 L1020 86 C1050 112 1080 134 1120 136 L1110 144 C1064 142 1034 124 1006 100 H814 C786 124 756 142 710 144 Z" ${hc('#5f8a7a', '#1a2a3a')}/>
      ${[72, 86, 100].map((yy) => `<path d="M${840 - (yy - 58) * 1.2} ${yy} H${980 + (yy - 58) * 1.2}" ${hs('#4f7a6a', '#14223a')} stroke-width="1.4"/>`).join('')}
      <path d="M876 58 L910 30 L944 58 Z" ${hc('#efe6d6', '#3a3c5e')}/><path d="M896 34 l-12 -18 M924 34 l12 -18" ${hs('#3a4254', '#10122a')} stroke-width="4"/><path d="M904 52 l6 6 l6 -6" ${hs('#d9b04a', '#a88a4a')} stroke-width="2.6"/>
      <path d="M776 136 Q910 156 1044 136" ${hs('#e8d8a8', '#6a6450')} stroke-width="9"/>${[800, 840, 880, 940, 980, 1020].map((x, k) => `<path d="M${x} ${144 + (x === 880 || x === 940 ? 6 : 2)} l4 7 l-4 7 l4 7" ${hsx('fx-sway', '#ffffff', '#8a8cae', `animation-delay:-${k * 0.5}s;animation-duration:2.6s`)} stroke-width="2.2"/>`).join('')}
      <g class="fx-sway" data-fx="bell" style="animation-duration:4.2s"><circle cx="910" cy="160" r="9" ${hc('#d9b04a', '#8a7a4a')}/><path d="M907 168 V212 M913 168 V212" stroke="#d0453c" stroke-width="2.4"/><path d="M910 168 V212" stroke="#fff" stroke-width="2"/></g>
      <rect x="880" y="196" width="60" height="26" ${hc('#8a5a30', '#2a2440')}/>${[886, 896, 906, 916, 926].map((x) => `<path d="M${x} 198 v8" ${hs('#5a3b28', '#1c1838')} stroke-width="2"/>`).join('')}<text x="910" y="218" text-anchor="middle" font-size="9" font-weight="700" ${hc('#efe6d6', '#c9c4e8')} font-family="serif">奉納</text>
      <rect x="104" y="${F - 156}" width="14" height="156" ${hc('#d0453c', '#5a2030')}/><rect x="232" y="${F - 156}" width="14" height="156" ${hc('#d0453c', '#5a2030')}/><rect x="100" y="${F - 18}" width="22" height="18" ${hc('#2b2b33', '#141428')}/><rect x="228" y="${F - 18}" width="22" height="18" ${hc('#2b2b33', '#141428')}/>
      <path d="M76 ${F - 166} Q175 ${F - 180} 274 ${F - 166} L270 ${F - 154} Q175 ${F - 166} 80 ${F - 154} Z" ${hc('#2b2b33', '#141428')}/><rect x="90" y="${F - 156}" width="170" height="8" ${hc('#d0453c', '#5a2030')}/><rect x="96" y="${F - 128}" width="158" height="10" ${hc('#d0453c', '#5a2030')}/>
      <rect x="160" y="${F - 156}" width="30" height="30" ${hc('#2b2b33', '#141428')}/>${vText(175, F - 152, '稲荷', 11, 'font-weight="700" fill="#d9b04a" font-family="serif"')}
      ${lantern(320)}${lantern(700)}${fox(360, false)}${fox(560, true)}
      <g data-fx="crow"><g class="fx-peck" style="animation-duration:3.1s"><path d="M226 ${F - 172} q8 -10 20 -6 q8 3 10 0 l-2 6 q-6 6 -20 6 Z" ${hc('#2b2b33', '#0c0c1c')}/><circle cx="252" cy="${F - 180}" r="5" ${hc('#2b2b33', '#0c0c1c')}/><path d="M256 ${F - 181} l6 2 l-6 1" ${hc('#3a3a44', '#1a1a2a')}/><path d="M234 ${F - 166} v6 M240 ${F - 166} v6" ${hs('#3a3a44', '#1a1a2a')} stroke-width="1.4"/></g></g>
      <rect x="1080" y="${F - 70}" width="70" height="40" rx="2" ${hc('#c58a54', '#3a2c40')}/>${[0, 1, 2].map((k) => `<path d="M${1088 + k * 20} ${F - 62} l8 -4 l8 4 v10 h-16 Z" ${hc('#efe6d6', '#e8dcb4')}/>`).join('')}<rect x="1110" y="${F - 30}" width="10" height="30" ${hc('#6e4f3a', '#2c2440')}/>
      <path d="M1160 ${F - 54} h40" ${hs('#6e4f3a', '#2c2440')} stroke-width="2"/>${[1166, 1176, 1186, 1196].map((x, k) => `<path d="M${x} ${F - 54} v7" ${hsx('fx-sway', '#ffffff', '#8a8cae', `animation-delay:-${k * 0.4}s;animation-duration:2.2s`)} stroke-width="3"/>`).join('')}
      <path d="M672 ${F} L700 ${F - 92}" ${hs('#c9a06a', '#3a2c40')} stroke-width="3"/><path d="M664 ${F} q4 -18 10 -26 q4 12 8 26 Z" ${hc('#b9a070', '#2a2440')}/>${[[600, '#d9533a'], [612, '#e8913a'], [624, '#e6c23a'], [606, '#c8453a'], [618, '#d9533a']].map(([x, c], k) => `<ellipse cx="${x}" cy="${F - 3 - (k > 2 ? 5 : 0)}" rx="7" ry="3.4" ${hc(c, '#5a3a3a')}/>`).join('')}
      ${[[180, -120, '#d9533a'], [420, -60, '#e8913a'], [520, -140, '#e6c23a'], [760, -90, '#d9533a'], [880, -150, '#e8913a'], [1040, -60, '#e6c23a'], [300, -20, '#d9533a']].map(([x, y, c], k) => leaf(x, y, k, c)).join('')}
      ${fest ? `<g class="ennichi">${boom(240, -260, 0, '#ff9a5a')}${boom(520, -320, 1.4, '#ffd166')}${boom(860, -280, 2.8, '#7fd1ff')}${chochin(280, 760)}${stall(400, 100, '#3f7ac8', '金魚すくい')}${stall(510, 90, '#d0453c', 'やきそば')}${stall(610, 90, '#e58fa8', 'わたあめ')}</g>` : ''}
      <rect class="pave" x="-20" y="${F}" width="1240" height="90" style="fill:color-mix(in srgb, #d8cfbd calc(var(--day) * 100%), #2a2a48)"/>
      ${Array.from({ length: 24 }, (_, j) => `<rect x="${60 + j * 48}" y="${F + 18 + (j % 2) * 26}" width="34" height="16" rx="3" ${hc('#c9c4b8', '#3a3c5e')}/>`).join('')}
      ${busRoad()}
    </svg>
    ${yHeroHtml()}
    ${busPoleHtml('shrine')}
    <div class="ysel"></div>`;
}
// 白鷺城 (test, 2026-11-09), the end of the bus line: the white keep in tiers on its stone walls, the gate, old pines, the
// guides' booth (案内所) and its board of the castle's story
function castleHtml() {
  const F = 236, cx = 880;
  // 2026-11-10: the white keep in five tiers on its curved stone walls, rising high — gables, gold shachihoko, lit up by night —
  // the moat before it with ripples, the gate and its bridge, sakura shedding petals, a banner flapping by the guides' booth
  const roof = (y, half, d) => `<path d="M${cx - half - 30} ${y + d} Q${cx - half - 8} ${y + d - 2} ${cx - half + 6} ${y + d - 10} L${cx - half + 24} ${y} H${cx + half - 24} L${cx + half - 6} ${y + d - 10} Q${cx + half + 8} ${y + d - 2} ${cx + half + 30} ${y + d} Z" ${hc('#4f5a6e', '#2a3150')}/><path d="M${cx - half - 26} ${y + d} H${cx + half + 26}" ${hs('#f6f3ec', '#cfc8b4')} stroke-width="2"/>${[0.35, 0.65].map((f) => `<path d="M${cx - half + 24 - 18 * f} ${y + d * f} H${cx + half - 24 + 18 * f}" ${hs('#66728a', '#3a4262')} stroke-width="1.2"/>`).join('')}`;
  const tier = (y, half, h, rows) => `<rect x="${cx - half}" y="${y}" width="${half * 2}" height="${h}" ${hc('#f6f3ec', '#e2dac6')}/>${Array.from({ length: rows }, (_, r) => Array.from({ length: Math.floor(half * 2 / 30) }, (_, k) => `<rect ${hc('#3b3b44', '#ffd98a')} x="${cx - half + 10 + k * 30}" y="${y + 10 + r * 18}" width="12" height="9"/>`).join('')).join('')}`;
  const gable = (y, w) => `<path d="M${cx - w} ${y} L${cx} ${y - w * 0.62} L${cx + w} ${y} Z" ${hc('#4f5a6e', '#2a3150')}/><path d="M${cx - w + 10} ${y - 2} L${cx} ${y - w * 0.62 + 8} L${cx + w - 10} ${y - 2} Z" ${hc('#f6f3ec', '#e2dac6')}/>`;
  const sakura = (x, s) => `<path d="M${x} ${F} V${F - 60 * s} M${x} ${F - 40 * s} l${-26 * s} ${-30 * s} M${x} ${F - 50 * s} l${24 * s} ${-28 * s}" ${hs('#6b4a2f', '#1c1428')} stroke-width="${7 * s}"/><g ${hc('#f2b8c6', '#5a3a52')}>${[[0, -96, 46], [-36, -78, 34], [36, -80, 34], [-14, -122, 30], [20, -118, 30]].map(([dx, dy, r]) => `<circle cx="${x + dx * s}" cy="${F + dy * s}" r="${r * s}"/>`).join('')}</g>`;
  const petal = (x, y, k) => `<g transform="translate(${x} ${y})"><ellipse  rx="4" ry="2.6" ${hcx('fx-fall', '#f7c6d2', '#6a4a62', `animation-delay:-${k * 1.3}s;animation-duration:${9 + (k % 3) * 2}s`)}/></g>`;
  const pine = (x, s) => `<path d="M${x} ${F} V${F - 70 * s}" ${hs('#6b4a2f', '#0b0c22')} stroke-width="${8 * s}"/>${[[0, -78, 44], [-24, -60, 34], [26, -58, 32], [0, -100, 28]].map(([dx, dy, r]) => `<ellipse cx="${x + dx * s}" cy="${F + dy * s}" rx="${r * s}" ry="${r * 0.42 * s}" ${hc('#3f6a48', '#0c1428')}/>`).join('')}`;
  return `<svg class="land tall castle-land" viewBox="0 -400 1200 770" preserveAspectRatio="xMidYMax slice">${GLOW_DEFS}
      <defs><clipPath id="cWall"><path d="M600 198 C650 186 690 140 706 64 H1054 C1070 140 1110 186 1160 198 Z"/></clipPath></defs>
      <path class="far" d="M0 122 C120 100 240 104 360 118 S560 96 700 110 S900 126 1020 104 S1150 100 1200 110 V370 H0 Z"/>
      <ellipse class="glow" cx="${cx}" cy="-40" rx="320" ry="260" fill="url(#glw)"/>
      <path d="M600 198 C650 186 690 140 706 64 H1054 C1070 140 1110 186 1160 198 Z" ${hc('#b4ab98', '#3a3a58')}/>
      <g clip-path="url(#cWall)">${Array.from({ length: 10 }, (_, r) => Array.from({ length: 18 }, (_, k) => `<rect x="${600 + k * 34 - (r % 2) * 17}" y="${64 + r * 14}" width="34" height="14" fill="none" ${hs('#958c7a', '#2a2a46')} stroke-width="1.2"/>`).join('')).join('')}</g>
      ${tier(0, 156, 64, 3)}${roof(-14, 170, 22)}<path d="M${cx - 44} 8 C${cx - 24} 8 ${cx - 16} -12 ${cx} -14 C${cx + 16} -12 ${cx + 24} 8 ${cx + 44} 8" ${hs('#4f5a6e', '#2a3150')} stroke-width="8"/>
      ${tier(-70, 128, 56, 2)}${gable(-60, 52)}${roof(-86, 140, 20)}
      ${tier(-128, 96, 44, 2)}${gable(-120, 40)}${roof(-142, 108, 18)}
      ${tier(-176, 66, 36, 1)}${roof(-190, 78, 16)}
      ${tier(-218, 44, 30, 1)}${roof(-236, 56, 20)}<rect x="${cx - 48}" y="-242" width="96" height="8" rx="3" ${hc('#3a4254', '#1c2240')}/>
      ${[-46, 46].map((d) => `<path d="M${cx + d - 6} -242 q${d > 0 ? 10 : -10} -14 ${d > 0 ? 2 : -2} -22 q${d > 0 ? 8 : -8} 4 ${d > 0 ? 8 : -8} 14 Z" fill="#e6c25a"/>`).join('')}
      <rect x="-20" y="198" width="1240" height="38" ${hc('#6a9ab8', '#141a3a')}/><path d="M-20 199 H1220" ${hs('#8a8476', '#2a2a46')} stroke-width="3"/>
      ${[[120, 214], [420, 222], [700, 212], [980, 224], [1140, 214]].map(([x, y], k) => `<g transform="translate(${x} ${y})"><ellipse  rx="18" ry="4" fill="none" ${hsx('fx-ripple', '#ffffff', '#5a6aa0', `animation-delay:-${k * 0.7}s`)} stroke-width="1.6"/></g>`).join('')}
      ${[[640, 0], [690, 1]].map(([x, k]) => `<g class="fx-swim" style="animation-delay:-${k * 1.2}s"><g transform="translate(${x} 222)"><path d="M-14 0 q0 -10 14 -10 q12 0 16 -6 q-4 10 -2 16 Z" ${hc('#fbfaf6', '#9a9ec8')}/><path d="M10 -6 q-2 -14 4 -20" fill="none" ${hs('#fbfaf6', '#9a9ec8')} stroke-width="3.4" stroke-linecap="round"/><path d="M14 -26 l6 2 l-6 2" ${hc('#e6883a', '#5a4a3a')}/><ellipse cx="2" cy="1" rx="18" ry="2" fill="#fff" fill-opacity=".3"/></g></g>`).join('')}
      <rect x="150" y="70" width="220" height="80" ${hc('#f6f3ec', '#e2dac6')}/><path d="M130 76 Q260 52 390 76 L380 86 Q260 64 140 86 Z" ${hc('#4f5a6e', '#2a3150')}/>${[176, 220, 300, 344].map((x) => `<rect ${hc('#3b3b44', '#ffd98a')} x="${x - 6}" y="96" width="12" height="9"/>`).join('')}
      <rect x="150" y="150" width="50" height="48" ${hc('#b4ab98', '#3a3a58')}/><rect x="320" y="150" width="50" height="48" ${hc('#b4ab98', '#3a3a58')}/><rect x="200" y="140" width="120" height="58" ${hc('#5a3b28', '#2a2440')}/><path d="M260 140 V198" ${hs('#3a2418', '#1c1430')} stroke-width="3"/>${[230, 290].map((x) => `<circle cx="${x}" cy="170" r="3" ${hc('#d9b04a', '#a88a4a')}/>`).join('')}
      <path d="M196 198 H324 L332 ${F} H188 Z" ${hc('#a8743f', '#3a2c40')}/>${[204, 224, 244, 264, 284, 304].map((x) => `<path d="M${x} 200 L${x - 2} ${F}" ${hs('#8a5a30', '#2a2440')} stroke-width="1.6"/>`).join('')}
      <g data-fx="sakuraL">${sakura(60, 1.2)}</g><g data-fx="sakuraR">${sakura(1150, 1.1)}</g>${pine(420, 0.8)}
      ${[176, 344].map((x) => `<path d="M${x - 12} ${F} l3 -8 h18 l3 8 Z" ${hc('#a9a497', '#2c2e4c')}/><rect x="${x - 4}" y="${F - 40}" width="8" height="32" ${hc('#b4ad9e', '#34365a')}/><rect x="${x - 10}" y="${F - 58}" width="20" height="18" rx="1" ${hc('#b4ad9e', '#34365a')}/><rect x="${x - 5}" y="${F - 54}" width="10" height="10" ${hc('#5a5a64', '#ffd27a')}/><path d="M${x - 16} ${F - 58} L${x} ${F - 70} L${x + 16} ${F - 58} Z" ${hc('#9a958a', '#2a2c4c')}/><circle class="glow" cx="${x}" cy="${F - 49}" r="26" fill="url(#glw)"/>`).join('')}
      <rect x="430" y="${F - 70}" width="130" height="70" ${hc('#efe6d6', '#25264a')}/><path d="M420 ${F - 70} h150 l-12 -16 h-126 Z" ${hc('#8a6a52', '#1c1d3c')}/><rect x="450" y="${F - 62}" width="90" height="18" rx="2" ${hc('#2f4a6e', '#1c1d3c')}/>
      <text x="495" y="${F - 49}" text-anchor="middle" font-size="12" font-weight="700" fill="#fff" font-family="system-ui, sans-serif">案内所</text><rect x="455" y="${F - 36}" width="80" height="36" ${hc('#cfe6ec', '#ffd98a')}/>
      <rect x="590" y="${F - 64}" width="70" height="46" rx="2" ${hc('#fbf7ec', '#3a3b62')}/><rect x="620" y="${F - 18}" width="8" height="18" ${hc('#6e4f3a', '#2c2440')}/><text x="625" y="${F - 48}" text-anchor="middle" font-size="10" font-weight="700" ${hc('#3b2a1c', '#c9c4e8')} font-family="system-ui, sans-serif">白鷺城</text>
      <path d="M598 ${F - 38} h54 M598 ${F - 30} h44" ${hs('#9a9184', '#4a4e78')} stroke-width="2"/>
      <path d="M576 ${F} V${F - 130}" ${hs('#6e4f3a', '#2c2440')} stroke-width="3"/><path  d="M577 ${F - 128} h22 v80 h-22 Z" ${hcx('fx-flag', '#f6f3ec', '#4a4c72')}/>${vText(588, F - 122, '白鷺城', 12, `font-weight="700" fill="#2f4a6e" font-family="'Hiragino Mincho ProN', 'Noto Serif JP', serif"`)}
      ${[[40, -120], [200, -60], [320, -160], [960, -100], [1080, -40], [1180, -150], [700, -200], [520, -80]].map(([x, y], k) => petal(x, y, k)).join('')}
      <rect class="pave" x="-20" y="${F}" width="1240" height="90" style="fill:color-mix(in srgb, #ddd3bd calc(var(--day) * 100%), #2a2a48)"/>
      ${Array.from({ length: 26 }, (_, j) => `<path class="seam" d="M${j * 48 - 20} ${F + 22 + (j % 3) * 22} h30"/>`).join('')}
      ${busRoad()}
    </svg>
    ${yHeroHtml()}
    ${busPoleHtml('castle')}
    <div class="ysel"></div>`;
}
// the bus (test, 2026-11-09): sat on the bench, the bus comes in and its board shows the stops — 駅前, 月の湯, 稲荷神社, 白鷺城,
// each opened by the event that first takes the hero there (TOWN events' opens); from a stop out there, home to the main road too.
// Picked: the hero gets on, the bus pulls away, and the place opens with him getting off at its stop
const BUS_STOPS = [['station', '駅前'], ['sento', '月の湯'], ['shrine', '稲荷神社'], ['castle', '白鷺城']];
const BUS_AT = { street: BUS, station: { X: 470, Y: 56, seat: 0 }, sento: { X: 470, Y: 56, seat: 0 }, shrine: { X: 470, Y: 56, seat: 0 }, castle: { X: 470, Y: 56, seat: 0 } };   // where each place's stop stands (out there: by the kerb)
const BUS_LANE = { street: 92, station: 16, sento: 16, shrine: 16, castle: 16 };   // where the bus runs (Y): on the road in front of the stop (2026-11-10, the user)
const BUS_PLACES = ['street'].concat(BUS_STOPS.map((x) => x[0]));
const BUS_IN = { street: () => [[BUS.X + 40, 122], [BUS.X - 60, 108]], station: () => [[440, 50], [360, 72]], sento: () => [[440, 50], [360, 72]], shrine: () => [[440, 50], [360, 72]], castle: () => [[440, 50], [360, 72]] };   // getting off: where he steps down, where he walks to
const BUS_ART = `<rect x="-130" y="-104" width="260" height="96" rx="16" fill="#3f9a8c"/><rect x="-130" y="-56" width="260" height="10" fill="#f6f1e4"/>
  ${[-104, -60, -16, 28].map((x) => `<rect x="${x}" y="-94" width="38" height="30" rx="4" fill="#cfe6ec"/>`).join('')}<rect x="72" y="-94" width="34" height="80" rx="4" fill="#2f6f64"/><rect x="76" y="-90" width="26" height="40" rx="3" fill="#cfe6ec"/>
  <rect x="-122" y="-120" width="90" height="18" rx="4" fill="#2b2b33"/><text x="-77" y="-106" text-anchor="middle" font-size="12" font-weight="700" fill="#ffd27a" font-family="system-ui, sans-serif">みなと市バス</text>
  <circle cx="-80" cy="-6" r="16" fill="#2b2b33"/><circle cx="-80" cy="-6" r="6" fill="#8a8f99"/><circle cx="84" cy="-6" r="16" fill="#2b2b33"/><circle cx="84" cy="-6" r="6" fill="#8a8f99"/><circle cx="122" cy="-30" r="5" fill="#ffd98a"/>`;
function busSit(el) {
  yNamed(el);
  const yard = el.closest('.yard'), at = BUS_AT[yPlace] || BUS, k = yScale(at.Y), h = yard && yard.querySelector('.yhero'); if (!h) return;
  if (h.classList.contains('bench')) { busCome(yard); return; }
  yHeroWalk(yard, [at.X + 20 * k, at.Y - 2], () => {
    yh.back = false; yh.turn = false; yh.flip = false; if (yPlace === 'street') h.classList.add('bench'); yHeroPlace(yard);
    busCome(yard);
  });
}
function busCome(yard) {   // the bus in along the road, in front of the stop, its board up
  const at = BUS_AT[yPlace] || BUS, lane = BUS_LANE[yPlace] ?? at.Y, k = yScale(lane) * 2.1;   // a bus: a good deal bigger than the people
  let bus = yard.querySelector('.bus');
  if (!bus) {
    bus = document.createElement('div'); bus.className = 'bus'; bus.setAttribute('aria-hidden', 'true');
    bus.style.cssText = `margin-left:${Math.round(at.X - 40)}px;bottom:${lane}px;z-index:${300 - lane};--k:${k.toFixed(3)}`;
    bus.innerHTML = `<svg viewBox="-140 -126 280 140">${BUS_ART}</svg>`;
    yard.querySelector('.yworld').appendChild(bus); requestAnimationFrame(() => bus.classList.add('in'));
  }
  setTimeout(() => busBoard(yard), 650);
}
function busBoard(yard) {
  yard.querySelectorAll('.bus-board').forEach((b) => b.remove());
  const here = yPlace, list = (here === 'street' ? [] : [['street', '大馬路（回家）']]).concat(BUS_STOPS.filter((x) => x[0] !== here));
  const opened = (id) => id === 'street' || Boolean(state.town.stops[id]), any = list.some((x) => opened(x[0]));
  const el = document.createElement('div'); el.className = 'bus-board'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', '公車路線');
  el.innerHTML = `<div class="bus-card"><b>みなと市バス・路線</b>
    ${list.map(([id, name]) => `<button type="button" class="bus-stop-btn" data-bus="${id}"${opened(id) ? '' : ' disabled'}>${esc(name)}${opened(id) ? '' : '<small>還沒開通</small>'}</button>`).join('')}
    ${any ? '' : '<p class="bus-note">現在還沒有開通的路線。多認識鎮上的人，之後就能搭公車去別的地方。</p>'}
    <button type="button" class="btn btn-sm" data-bus-x>不搭了</button></div>`;
  el.addEventListener('pointerdown', (e) => e.stopPropagation());
  el.addEventListener('click', (e) => {
    e.stopPropagation(); const b = e.target.closest('[data-bus]');
    if (b && !b.disabled) { el.remove(); busRide(yard, b.dataset.bus); return; }
    if (e.target.closest('[data-bus-x]') || e.target === el) { el.remove(); const bus = yard.querySelector('.bus'); if (bus) { bus.classList.add('go'); setTimeout(() => bus.remove(), 900); } }
  });
  yard.appendChild(el);
}
function busRide(yard, to) {   // on, away, and off at the other stop
  const h = yard.querySelector('.yhero'), bus = yard.querySelector('.bus');
  if (h) { h.classList.remove('bench'); h.classList.add('out'); }
  if (bus) bus.classList.add('go');
  setTimeout(() => { yh.arrive = { from: yPlace, to }; go(PLACE_ROUTE[to]); }, 700);
}
// 駅前 (test, 2026-11-09), the bus's first stop: みなと駅 with its clock and ticket machines, the 交番 beside it with its red lamp, a
// square with benches and trees, and the bus stop at the right
function stationHtml() {
  const F = 236;
  // 2026-11-10 (the user: every place looked the same): city-like — buildings behind, a viaduct over the back with a train along it
  // now and then, the station under it with its sign, a clock and a board running the next trains, the taxi stand (鈴木's taxi),
  // bikes, the 交番 with its blinking lamp, pigeons pecking on the square; the road along the front (busRoad)
  const tower = (x, w, h, c) => `<rect x="${x}" y="${F - h}" width="${w}" height="${h}" ${hc(c, '#1a1c3a')}/>${Array.from({ length: Math.floor((h - 20) / 22) }, (_, r) => Array.from({ length: Math.floor((w - 10) / 18) }, (_, k) => `<rect ${((r * 7 + k * 3 + x) % 5) < 2 ? 'class="lit"' : hc('#d9e6ec', '#232548')} x="${x + 8 + k * 18}" y="${F - h + 12 + r * 22}" width="9" height="12"/>`).join('')).join('')}`;
  const car = (x, k) => `<g transform="translate(${x} -2)"><rect x="0" y="0" width="216" height="46" rx="8" ${hc('#e8ebee', '#3a3f66')}/><rect x="0" y="30" width="216" height="6" ${hc('#3f9a8c', '#2a4a5a')}/>${[14, 50, 86, 122, 158].map((wx) => `<rect x="${wx}" y="8" width="26" height="16" rx="3" ${hc('#9fc0d0', '#ffe2a0')}/>`).join('')}<rect x="190" y="6" width="16" height="30" rx="2" ${hc('#c9cdd4', '#2a2c50')}/>${k === 0 ? `<path d="M0 6 Q-16 10 -18 30 V40 H0 Z" ${hc('#e8ebee', '#3a3f66')}/>` : ''}</g>`;
  const bike = (x) => `<g ${hs('#4a4a55', '#3a3d66')} stroke-width="2"><circle cx="${x}" cy="${F + 30}" r="9"/><circle cx="${x + 26}" cy="${F + 30}" r="9"/><path d="M${x} ${F + 30} L${x + 10} ${F + 14} L${x + 22} ${F + 14} L${x + 26} ${F + 30} M${x + 10} ${F + 14} L${x + 14} ${F + 30} L${x + 22} ${F + 14} M${x + 8} ${F + 10} h6 M${x + 22} ${F + 14} l2 -6 h5"/></g>`;
  const pigeon = (x, k) => `<g class="fx-peck" style="animation-delay:-${k * 0.6}s"><ellipse cx="${x}" cy="${F + 70}" rx="9" ry="6" ${hc('#8d93a8', '#2c2f52')}/><circle cx="${x + 8}" cy="${F + 64}" r="4" ${hc('#7a8098', '#2c2f52')}/><path d="M${x + 12} ${F + 64} l3 1" ${hs('#d0904a', '#3a3d66')} stroke-width="1.6"/><path d="M${x - 9} ${F + 68} l-6 -2" ${hs('#6a7088', '#2c2f52')} stroke-width="3"/></g>`;
  const hr = Math.floor(sceneHour()), board = `次の電車　${hr}:30 快速 みなと港　・　${hr}:45 普通 白鷺　・　`;   // the scene's hour (2026-11-10)
  return `<svg class="land tall station-land" viewBox="0 -400 1200 770" preserveAspectRatio="xMidYMax slice">${GLOW_DEFS}
      <defs><clipPath id="stLed"><rect x="452" y="${F - 124}" width="216" height="20" rx="2"/></clipPath></defs>
      ${tower(20, 120, 320, '#b9c3cc')}${tower(150, 90, 250, '#c9ccd2')}${tower(760, 130, 360, '#b4bec8')}${tower(900, 100, 280, '#c4c8ce')}${tower(1020, 150, 330, '#b9c3cc')}
      <path class="far" d="M0 160 C200 150 400 156 600 152 S1000 150 1200 158 V370 H0 Z"/>
      ${[80, 280, 480, 680, 880, 1080].map((x) => `<rect x="${x - 12}" y="40" width="24" height="${F - 40}" ${hc('#c9c6be', '#26284c')}/>`).join('')}
      <rect x="-20" y="36" width="1240" height="26" ${hc('#d6d3cb', '#2c2e54')}/><rect x="-20" y="58" width="1240" height="6" ${hc('#b0ada6', '#1e2042')}/>
      ${[60, 340, 620, 900, 1180].map((x) => `<path d="M${x} 36 V-40 M${x - 14} -30 H${x + 14}" ${hs('#8d8a84', '#3a3d66')} stroke-width="3"/>`).join('')}<path class="wire" d="M-20 -28 H1220"/>
      <g class="fx-train">${[0, 1, 2, 3].map((k) => car(k * 224, k)).join('')}</g>
      <rect x="290" y="${F - 182}" width="540" height="12" ${hc('#8a8f99', '#1c1d3c')}/>
      <rect x="300" y="${F - 170}" width="520" height="170" ${hc('#efe9dd', '#25264a')}/><rect x="300" y="${F - 170}" width="520" height="40" ${hc('#5f7f9a', '#1c2240')}/>
      <rect x="440" y="${F - 166}" width="240" height="30" rx="3" ${hc('#2f4a6e', '#1c1d3c')}/><text x="560" y="${F - 145}" text-anchor="middle" font-size="20" font-weight="700" ${hc('#ffffff', '#ffe9b0')} font-family="system-ui, sans-serif">みなと駅</text>
      <circle cx="360" cy="${F - 150}" r="15" ${hc('#fbf7ec', '#e8dcb4')}/>${clockHands(360, F - 150, 13)}
      <rect x="448" y="${F - 128}" width="224" height="28" rx="3" fill="#1c1c22"/>
      <g clip-path="url(#stLed)"><g class="fx-scroll"><text x="456" y="${F - 109}" font-size="13" font-weight="700" fill="#ffae3a" font-family="system-ui, sans-serif">${board}${board}</text></g></g>
      <rect x="320" y="${F - 120}" width="110" height="60" ${hc('#cfe6ec', '#ffd98a')}/><rect x="690" y="${F - 120}" width="110" height="60" ${hc('#cfe6ec', '#ffd98a')}/>
      <g style="opacity:calc(.5 + .5 * var(--day))"><rect x="336" y="${F - 114}" width="30" height="42" fill="#7fb3d8"/><path d="M338 ${F - 80} L351 ${F - 100} L364 ${F - 80} Z" fill="#fbfaf6"/><path d="M336 ${F - 78} h30 v6 h-30 Z" fill="#4f8a5a"/><rect x="384" y="${F - 114}" width="30" height="42" fill="#f2b8c6"/><circle cx="399" cy="${F - 98}" r="8" fill="#fbfaf6"/><path d="M386 ${F - 80} q13 -8 26 0" fill="none" stroke="#c84a3a" stroke-width="2"/>
      <rect x="708" y="${F - 114}" width="30" height="42" fill="#3f7ac8"/><path d="M710 ${F - 84} q14 -10 26 0" fill="none" stroke="#fbfaf6" stroke-width="2.4"/><circle cx="728" cy="${F - 102}" r="5" fill="#f2c94c"/></g>
      <rect x="480" y="${F - 96}" width="160" height="96" ${hc('#6b7a8a', '#141632')}/>${[484, 524, 564, 604].map((x) => `<rect x="${x}" y="${F - 90}" width="34" height="90" ${hc('#cfe6ec', '#ffd98a')}/>`).join('')}${[500, 540, 580, 620].map((x) => `<rect x="${x - 3}" y="${F - 40}" width="6" height="30" fill="#8a96a8" fill-opacity=".55"/><rect x="${x - 10}" y="${F - 40}" width="20" height="5" rx="2" fill="#5a6a7a" fill-opacity=".5"/>`).join('')}
      <ellipse class="glow" cx="560" cy="${F - 30}" rx="220" ry="80" fill="url(#glw)"/>
      ${[330, 368, 406].map((x) => `<rect x="${x}" y="${F - 52}" width="30" height="52" rx="3" ${hc('#d9604c', '#4a2c40')}/><rect x="${x + 5}" y="${F - 46}" width="20" height="12" rx="2" ${hc('#cfe6ec', '#5a66a8')}/>`).join('')}
      <rect x="40" y="${F - 120}" width="8" height="120" ${hc('#5a5a64', '#1c1d3c')}/><rect x="10" y="${F - 134}" width="76" height="22" rx="3" ${hc('#2f4a6e', '#1c1d3c')}/><text x="48" y="${F - 119}" text-anchor="middle" font-size="10" font-weight="700" fill="#fff" font-family="system-ui, sans-serif">タクシー</text>
      <rect x="880" y="${F - 96}" width="126" height="96" ${hc('#f3efe6', '#25264a')}/><path d="M866 ${F - 96} L943 ${F - 124} L1020 ${F - 96} Z" ${hc('#4a4a55', '#1c1d3c')}/>
      <rect x="906" y="${F - 88}" width="74" height="18" rx="2" ${hc('#2b2b33', '#1c1d3c')}/><text x="943" y="${F - 75}" text-anchor="middle" font-size="12" font-weight="700" fill="#fff" font-family="system-ui, sans-serif">交番</text>
      <g class="fx-blink"><circle cx="943" cy="${F - 132}" r="7" fill="#e0524b"/><circle class="glow" cx="943" cy="${F - 132}" r="30" fill="url(#glw)"/></g>
      <rect x="922" y="${F - 62}" width="40" height="62" ${hc('#8a6a52', '#3a2c40')}/><rect x="968" y="${F - 62}" width="28" height="32" ${hc('#cfe6ec', '#ffd98a')}/>
      ${[1090, 1150].map((x) => `<rect x="${x - 24}" y="${F - 14}" width="48" height="14" rx="2" ${hc('#a8a49a', '#2a2c50')}/><rect class="trunk" x="${x - 3}" y="${F - 70}" width="6" height="58"/><g class="crown"><circle cx="${x}" cy="${F - 84}" r="22"/><circle cx="${x - 16}" cy="${F - 68}" r="15"/><circle cx="${x + 16}" cy="${F - 70}" r="16"/></g>`).join('')}
      <rect class="pave" x="-20" y="${F}" width="1240" height="90"/>${Array.from({ length: 26 }, (_, j) => `<path class="seam" d="M${j * 48 - 20} ${F + 22 + (j % 3) * 22} h30"/>`).join('')}
      <g data-fx="spigeons">${pigeon(590, 0)}${pigeon(626, 1)}${pigeon(660, 2)}</g>${streetLamp(860, F + 4, 124)}
      <g data-fx="svend">${[242, 274].map((x, i) => `<rect x="${x}" y="${F - 72}" width="30" height="72" rx="3" ${hc(i ? '#d0453c' : '#e9edf0', i ? '#4a2030' : '#3a4470')}/><rect x="${x + 3}" y="${F - 66}" width="24" height="26" rx="2" ${hc('#cfe6ec', '#e6f2ff')}/>${[0, 1].map((r) => [0, 1, 2].map((c) => `<rect x="${x + 5 + c * 7}" y="${F - 63 + r * 11}" width="5" height="8" rx="1.5" fill="${['#3f7ac8', '#e6a23c', '#4f7a4a', '#d0574b'][(r + c + i) % 4]}"/>`).join('')).join('')}<rect x="${x + 6}" y="${F - 26}" width="18" height="8" rx="2" ${hc('#2b2b33', '#141530')}/>`).join('')}</g><ellipse class="glow" cx="273" cy="${F - 46}" rx="70" ry="56" fill="url(#glc)"/>
      ${[452, 668].map((x) => `<rect x="${x}" y="${F - 18}" width="40" height="18" rx="2" ${hc('#a8a49a', '#2a2c50')}/>${[6, 16, 26, 34].map((d, k) => `<circle cx="${x + d}" cy="${F - 22 - (k % 2) * 4}" r="5" fill="${['#e86f5e', '#f2c94c', '#e58fa8', '#ffffff'][k]}" fill-opacity=".92"/>`).join('')}<path d="M${x + 2} ${F - 18} q18 -10 36 0" fill="none" ${hs('#5f9a4a', '#16243a')} stroke-width="4"/>`).join('')}
      ${busRoad()}
    </svg>
    ${landProp(112, `<g data-fx="taxi"><g transform="translate(110 ${F + 12})"><ellipse cx="60" cy="10" rx="64" ry="5" fill="#000" fill-opacity=".1"/><path d="M0 0 V-22 Q2 -30 14 -32 L34 -46 H82 L104 -32 Q118 -30 120 -22 V0 Z" ${hc('#f3d24a', '#5a5030')}/><path d="M40 -42 H78 L94 -30 H26 Z" ${hc('#9fc0d0', '#ffe2a0')}/><path d="M60 -42 V-30" ${hs('#f3d24a', '#5a5030')} stroke-width="2.4"/><path d="M2 -14 H118" ${hs('#2b2b33', '#2a2a40')} stroke-width="1.4"/><rect x="48" y="-56" width="24" height="10" rx="2" ${hc('#fbf7ec', '#fff0b0')}/><text x="60" y="-48.5" text-anchor="middle" font-size="7" font-weight="700" fill="#2b2b33" font-family="system-ui, sans-serif">TAXI</text><circle cx="26" cy="0" r="10" fill="#2b2b33"/><circle cx="94" cy="0" r="10" fill="#2b2b33"/><circle cx="26" cy="0" r="4" fill="#9a9ea8"/><circle cx="94" cy="0" r="4" fill="#9a9ea8"/><circle cx="118" cy="-16" r="3" fill="#ffd98a"/></g></g>`, null, [102, F - 50, 240, F + 30])}
    ${benchProps(220, F + 44, 66)}${benchProps(760, F + 44, 66)}${landProp(95, [628, 660, 692].map(bike).join(''), null, [614, F, 732, F + 42])}
    ${yHeroHtml()}
    ${busPoleHtml('station')}
    <div class="ysel"></div>`;
}
// the road along the front of a place out by bus (2026-11-10): the bus runs on it (BUS_LANE), the stop by its kerb
const busRoad = () => `<rect class="asphalt" x="-20" y="326" width="1240" height="44"/><path class="rline dash" d="M-20 350 H1220"/><rect class="kerb" x="-20" y="322" width="1240" height="5"/>`;
// out where the bus goes: the hero, the people there, the stop's pole and its button (the bus home and on)
function busPoleHtml(place) {
  const at = BUS_AT[place], k = yScale(at.Y);
  return `<div class="busstop" aria-hidden="true" style="width:30px;height:120px;margin-left:${at.X + 40}px;bottom:${at.Y}px;transform-origin:0 100%;transform:scale(${(k * 1.6).toFixed(3)});z-index:${300 - at.Y}"><svg viewBox="0 0 30 120"><rect x="13" y="20" width="4" height="100" fill="#8d9097"/><circle cx="15" cy="16" r="13" fill="#fff" stroke="#2f7a5a" stroke-width="3"/><text x="15" y="20" text-anchor="middle" font-size="9" font-weight="700" fill="#2f7a5a" font-family="system-ui, sans-serif">バス</text></svg></div>
    ${TOWNEV.castHtml(place)}
    <button type="button" class="thing bus-btn" data-act="bus-stop" aria-label="公車站" style="margin-left:${at.X - 20}px;bottom:${at.Y}px;width:90px;height:110px"><span class="tag">${ySign('bus', '搭公車')}</span></button>`;
}
// 月の湯 (test, 2026-11-09), an old public bath up the bus line: a wooden front under a tiled roof, its noren split 男 (blue) and
// 女 (red) with ゆ on them, the chimney with its name, a bench outside and the milk machine; lit warm by night
function sentoHtml() {
  const F = 236;
  // 2026-11-10: the bath's tall chimney over the roofs with smoke drifting off it, a tiled roof with a 唐破風 over the door, the
  // noren swaying, steam off the roof, lattice windows, a red lantern, warm light from the door by night, a cat asleep on the bench
  const house = (x, w, top) => `<rect x="${x}" y="${top}" width="${w}" height="${F - top}" ${hc('#e6dccb', '#1e2042')}/><path d="M${x - 8} ${top + 4} L${x + w / 2} ${top - 26} L${x + w + 8} ${top + 4} Z" ${hc('#5a6470', '#15163a')}/><rect class="lit" x="${x + 14}" y="${top + 18}" width="18" height="16"/>`;
  const puff = (k) => `<g transform="translate(900 -306)"><circle  r="16" ${hcx('fx-smoke', '#e8e6e2', '#8a8cae', `animation-delay:-${k * 1.75}s`)}/></g>`;
  const steam = (x, k) => `<g transform="translate(${x} 70)"><ellipse  rx="14" ry="10" ${hcx('fx-steam', '#ffffff', '#9a9ec8', `animation-delay:-${k * 1.5}s`)}/></g>`;
  const noren = (x, c, sign) => `${[0, 1, 2].map((k) => `<path class="fx-sway" style="animation-delay:-${k * 0.5}s" d="M${x + k * 35} 138 h34 v54 h-34 Z" fill="${c}"/>`).join('')}<text x="${x + 52}" y="174" text-anchor="middle" font-size="24" font-weight="700" fill="#fff" font-family="serif">ゆ</text><text x="${x + 52}" y="152" text-anchor="middle" font-size="11" font-weight="700" fill="#fff" fill-opacity=".9" font-family="system-ui, sans-serif">${sign}</text>`;
  const lattice = (x) => `<rect x="${x}" y="140" width="92" height="62" ${hc('#cfe6ec', '#ffd98a')}/>${Array.from({ length: 9 }, (_, k) => `<path d="M${x + 6 + k * 10} 140 v62" ${hs('#6e4a2c', '#3a2c40')} stroke-width="3"/>`).join('')}<rect x="${x - 4}" y="136" width="100" height="6" ${hc('#5a3b28', '#2a2440')}/><rect x="${x - 4}" y="200" width="100" height="6" ${hc('#5a3b28', '#2a2440')}/>`;
  const pot = (x) => `<path d="M${x - 14} ${F - 22} h28 l-4 22 h-20 Z" ${hc('#a8604a', '#3a2c40')}/>${[[-8, -40], [0, -48], [8, -40], [-4, -34], [5, -32]].map(([dx, dy]) => `<ellipse cx="${x + dx}" cy="${F + dy}" rx="8" ry="5" transform="rotate(${dx * 4} ${x + dx} ${F + dy})" ${hc('#5f9a4a', '#16243a')}/>`).join('')}`;
  return `<svg class="land tall sento-land" viewBox="0 -400 1200 770" preserveAspectRatio="xMidYMax slice">${GLOW_DEFS}
      <path class="far" d="M0 122 C120 100 240 104 360 118 S560 96 700 110 S900 126 1020 104 S1150 100 1200 110 V370 H0 Z"/>
      ${house(10, 120, 150)}${house(150, 110, 160)}${house(980, 120, 150)}${house(1110, 100, 162)}
      <rect x="992" y="170" width="96" height="16" rx="2" ${hc('#2f7a9a', '#1c2a44')}/><text x="1040" y="182" text-anchor="middle" font-size="9.5" font-weight="700" fill="#fff" font-family="system-ui, sans-serif">コインランドリー</text>
      <rect x="994" y="190" width="92" height="40" ${hc('#dfe8ec', '#ffe2a0')}/>${[1014, 1040, 1066].map((x, k) => `<rect x="${x - 11}" y="196" width="22" height="30" rx="2" ${hc('#f4f3ee', '#4a4c72')}/><circle cx="${x}" cy="213" r="8" ${hc('#6a8aa8', '#2a3060')}/><g class="fx-spin" style="animation-delay:-${k * 0.4}s;transform-origin:${x}px 213px"><path d="M${x - 5} 213 a5 5 0 0 1 10 0" fill="none" stroke="#fff" stroke-opacity=".8" stroke-width="2"/><circle cx="${x - 2}" cy="216" r="1.6" fill="#e86f5e"/></g>`).join('')}
      ${[0, 1, 2, 3].map(puff).join('')}
      <path d="M876 ${F} L884 -300 H916 L924 ${F} Z" ${hc('#cfc7b8', '#2a2c4c')}/><rect x="880" y="-306" width="40" height="12" ${hc('#6f6a62', '#1c1d3c')}/><rect x="882" y="-270" width="36" height="8" ${hc('#c8453a', '#4a2030')}/><rect x="882" y="-254" width="36" height="8" ${hc('#c8453a', '#4a2030')}/>
      ${vText(900, -236, '月の湯', 20, `font-weight="700" ${hc('#3b2a1c', '#c9c4e8')} font-family="'Hiragino Mincho ProN', 'Noto Serif JP', serif"`)}
      ${[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((k) => `<path d="M${878 + k * 0.6} ${-120 + k * 30} h${44 - k * 1.2}" ${hs('#a8a090', '#1c1d3c')} stroke-width="1.4"/>`).join('')}
      <rect x="330" y="116" width="500" height="${F - 116}" ${hc('#a8743f', '#2a2440')}/>${Array.from({ length: 24 }, (_, k) => `<path d="M${340 + k * 20} 120 V${F}" ${hs('#8a5a30', '#221c38')} stroke-width="1.4"/>`).join('')}
      <path d="M292 126 Q306 120 334 116 L382 70 H778 L826 116 Q854 120 868 126 Z" ${hc('#4a5468', '#141632')}/>${[80, 90, 100, 110].map((yy) => `<path d="M${382 - (yy - 70) * 1.1} ${yy} H${778 + (yy - 70) * 1.1}" ${hs('#5f6a80', '#1e2242')} stroke-width="1.6"/>`).join('')}
      <rect x="372" y="62" width="416" height="10" rx="3" ${hc('#3a4254', '#10122a')}/><path d="M364 72 q-4 -16 10 -18 l4 18 Z M796 72 q4 -16 -10 -18 l-4 18 Z" ${hc('#3a4254', '#10122a')}/>
      ${steam(420, 0)}${steam(740, 1)}${steam(600, 2)}
      ${lattice(350)}${lattice(718)}
      <rect x="470" y="128" width="220" height="${F - 128}" ${hc('#3a2a20', '#ffd98a')}/>
      <ellipse class="glow" cx="580" cy="${F + 10}" rx="260" ry="90" fill="url(#glw)"/>
      ${noren(472, '#2f5a9a', '男')}${noren(582, '#c8453a', '女')}
      <path d="M446 132 C474 130 488 86 580 80 C672 86 686 130 714 132 L714 122 C690 120 674 68 580 62 C486 68 470 120 446 122 Z" ${hc('#4a5468', '#141632')}/>
      <path d="M446 132 C474 130 488 86 580 80 C672 86 686 130 714 132" ${hs('#efe6d6', '#5a5c82')} stroke-width="6"/><path d="M572 80 l8 10 l8 -10" ${hs('#d9b04a', '#a88a4a')} stroke-width="3"/>
      <rect x="532" y="94" width="96" height="28" rx="3" ${hc('#f3e7cc', '#e8dcb4')}/><text x="580" y="114" text-anchor="middle" font-size="18" font-weight="700" fill="#3b2a1c" font-family="'Hiragino Mincho ProN', 'Noto Serif JP', serif">月の湯</text>
      <g class="fx-sway"><path d="M452 130 v8" ${hs('#2b2b33', '#1c1d3c')} stroke-width="1.6"/><ellipse cx="452" cy="152" rx="11" ry="15" ${hc('#d84a3a', '#ff8a5a')}/><text x="452" y="157" text-anchor="middle" font-size="12" font-weight="700" fill="#fff" font-family="serif">ゆ</text></g>
      <circle class="glow" cx="452" cy="152" r="40" fill="url(#glw)"/>
      ${pot(456)}${pot(704)}
      <g data-fx="milk"><rect x="160" y="${F - 92}" width="62" height="92" rx="4" ${hc('#3f7ac8', '#22305e')}/><rect x="168" y="${F - 84}" width="46" height="34" rx="2" ${hc('#fbf7ec', '#cfd6ff')}/>
      <text x="191" y="${F - 62}" text-anchor="middle" font-size="10" font-weight="700" ${hc('#3f7ac8', '#22305e')} font-family="system-ui, sans-serif">牛乳</text>${[172, 186, 200].map((x) => `<rect x="${x}" y="${F - 42}" width="10" height="14" rx="2" ${hc('#f6f3ec', '#cfd6ff')}/>`).join('')}</g><ellipse class="glow" cx="191" cy="${F - 50}" rx="70" ry="60" fill="url(#glc)"/>
      ${[972, 1004].map((x) => `<g ${hs('#4a4a55', '#3a3d66')} stroke-width="2"><circle cx="${x}" cy="${F - 10}" r="10"/><circle cx="${x + 28}" cy="${F - 10}" r="10"/><path d="M${x} ${F - 10} L${x + 11} ${F - 28} L${x + 24} ${F - 28} L${x + 28} ${F - 10} M${x + 11} ${F - 28} L${x + 15} ${F - 10} L${x + 24} ${F - 28}"/></g>`).join('')}
      <rect class="pave" x="-20" y="${F}" width="1240" height="90"/>${Array.from({ length: 26 }, (_, j) => `<path class="seam" d="M${j * 48 - 20} ${F + 22 + (j % 3) * 22} h30"/>`).join('')}
      ${[[806, 0], [834, 0], [862, 0], [820, 1], [848, 1], [834, 2]].map(([x, r]) => `<path d="M${x - 12} ${F - 14 - r * 14} h24 l-3 14 h-18 Z" ${hc('#f2c94c', '#5a5030')}/><path d="M${x - 12} ${F - 14 - r * 14} h24" ${hs('#d9a43a', '#3a3420')} stroke-width="2"/><text x="${x}" y="${F - 4 - r * 14}" text-anchor="middle" font-size="5.5" font-weight="700" fill="#d0453c" font-family="system-ui, sans-serif">ケロリン</text>`).join('')}
      <path d="M262 ${F} L272 ${F - 58} H306 L316 ${F}" fill="none" ${hs('#6e4f3a', '#2c2440')} stroke-width="3"/><rect x="268" y="${F - 56}" width="42" height="40" rx="2" ${hc('#fbf7ec', '#3a3b62')}/>${vText(289, F - 51, '営業中', 10, `font-weight="700" ${hc('#c8453a', '#ff9a7a')} font-family="'Hiragino Mincho ProN', 'Noto Serif JP', serif"`)}
      ${busRoad()}
    </svg>
    ${benchProps(250, F + 47, 63, 110, `<g class="fx-bob" data-fx="scat" style="animation-duration:3.4s"><path d="M318 ${F + 47} q-2 -16 16 -18 q18 -1 18 14 q0 4 -2 4 Z" ${hc('#e6a65a', '#5a4a3a')}/><path d="M336 ${F + 30} l3 -7 l4 7 Z M344 ${F + 31} l4 -6 l2 8 Z" ${hc('#e6a65a', '#5a4a3a')}/><path d="M318 ${F + 47} q-14 -2 -12 -10" ${hs('#e6a65a', '#5a4a3a')} stroke-width="4"/><path d="M338 ${F + 37} q3 2 6 0" ${hs('#5a3a28', '#2c2440')} stroke-width="1.2"/></g>`)}
    ${yHeroHtml()}
    ${busPoleHtml('sento')}
    <div class="ysel"></div>`;
}
// the yard's signs (1.2.0), like 書房's: a round sign each, its words in it for a moment when tapped; they rest out of sight 4 s
// after the last touch (renderOutside), the mailbox's not while letters wait
const ySign = (name, words) => `${icon(name)}<span class="tag-name">${words}</span>`;
const mailWords = (n) => (n ? `信箱・${n} 封信` : '信箱');
let yNamedT = 0;
function yNamed(el) {
  const yard = el.closest('.yard'); if (!yard) return;
  yard.querySelectorAll('.thing.named').forEach((t) => t.classList.remove('named'));
  el.classList.add('named'); clearTimeout(yNamedT); yNamedT = setTimeout(() => el.classList.remove('named'), 1800);
}
// a thing in the yard tapped: the hero walks over, turns to it, then the thing does its bit
function yUse(el, to, fn) {
  yNamed(el);
  const yard = el.closest('.yard');
  if (!yard || !yard.querySelector('.yhero')) { fn(); return; }
  yHeroWalk(yard, to, () => { yh.back = true; yh.turn = false; yHeroPlace(yard); setTimeout(fn, 120); });
}
// the Halloween witch (1.2.2): far off in the yard's night sky, about 20 px across, over and back while Halloween is on by
// the server's day (SALES.halloween, as the limited sale; the test site's 限時預覽 too) until she is caught — by night only (the
// CSS: 永夜 always, 永晝 never). A tap drops her off her broom for 100 言靈, once a Halloween (koto.found, by the year)
const WITCH_GIFT = 100;
const witchId = (day) => `witch-${day.slice(0, 4)}`;
const WITCH_ART = {   // facing right in a 28 × 20 box: the broom, the witch, her hat (each falls its own way)
  broom: '<path d="M7.5 16.2 L27.2 12.6" fill="none" stroke-width="1.25"/><path d="M9 15.2 C6 14.6 3 13.4 .6 12.8 C1.4 14.6 1.2 16.8 .4 18.8 C3.4 18.4 6.4 17.6 9.2 17.2 Z"/>',
  rider: '<path d="M13.4 8.4 C10.8 8.6 8 8.2 5.6 7 C6.8 9 8.6 10.8 11.6 11.6 Z"/><path d="M12.4 9.6 C11.2 11.6 10.2 13.6 9.4 15.4 C11.8 15.6 14.6 15.4 17.2 14.6 C16.4 12.8 15.8 11 15.4 9.4 Z"/>'
    + '<path d="M12.8 10.4 C12.6 8.8 13.2 7.8 14.4 7.6 C15.6 7.8 16 9 15.6 10.6 Z"/><circle cx="15.3" cy="6.5" r="1.7"/>'
    + '<path d="M14.6 5.3 C12.8 5.3 11 5.9 9.6 6.8 C10.6 6.9 11.2 7.2 11.6 7.6 C10.8 8 10.2 8.6 9.8 9.2 C11.6 9 13.4 8.4 14.8 7.4 Z"/>'
    + '<path d="M15.6 9 L19.6 13.4" fill="none" stroke-width="1"/><path d="M16.4 14.6 L18.4 17.2 L20.7 16.7" fill="none" stroke-width="1.05" stroke-linejoin="round"/>',
  hat: '<path d="M11.8 5.3 Q15 4.1 18.8 4.9 Q15.2 6.1 11.8 5.3 Z"/><path d="M13.4 5 L16.9 4.8 L14.9 1.8 Q14.3 .9 12.4 .8 Q13.6 1.6 13.4 5 Z"/>'
};
function witchHtml(id) {   // somewhere along her minute when the yard opens
  return `<div class="witch" data-witch="${id}" style="animation-delay:-${(Math.random() * 60).toFixed(1)}s"><div class="w-bob"><i class="w-spark"></i><i class="w-spark"></i><i class="w-spark"></i>
    <div class="w-fig">${['broom', 'rider', 'hat'].map((p) => `<svg class="w-${p}" viewBox="0 0 28 20">${WITCH_ART[p]}</svg>`).join('')}</div>
    <button type="button" class="w-hit" data-act="witch" aria-label="巫婆"></button></div></div>`;
}
function yWitch(yard) {   // she joins the sky, or leaves it (caught on another device, Halloween over); the server's day asked if not known
  const put = (day) => {
    if (!yard.isConnected) return;
    const d = day || (salePreview() ? todayStr() : null), had = yard.querySelector('.witch');
    const id = d && (salePreview() || saleOn('halloween', d)) && !state.koto.found[witchId(d)] ? witchId(d) : null;
    if (had && !had.classList.contains('fall') && had.dataset.witch !== id) had.remove();
    if (id && !yard.querySelector('.witch')) yard.querySelector('.sky .night').insertAdjacentHTML('beforeend', witchHtml(id));
  };
  const day = saleNow();
  if (day || salePreview()) put(day); else saleClock().then(put);
}
function witchCatch(el) {
  const w = el.closest('.witch'), yard = el.closest('.yard'), id = w && w.dataset.witch;
  if (!w || !id || w.classList.contains('fall')) return;
  [w, w.querySelector('.w-bob')].forEach((x) => { const t = getComputedStyle(x).transform; x.style.animation = 'none'; x.style.transform = t === 'none' ? '' : t; });   // held where the tap found her
  w.classList.add('fall');
  setTimeout(() => w.remove(), 2900);
  if (state.koto.found[id] || !yard) return;   // already caught on another device: she only falls
  state.koto.found[id] = WITCH_GIFT; saveState(); sfxReady();   // the sound woken inside the tap, so the coins' 叮 can play later (iOS)
  const r = w.querySelector('.w-fig').getBoundingClientRect();
  witchCoins(yard, [r.left + r.width / 2, r.top + r.height / 2], WITCH_GIFT);
}
// her 言靈 seen (1.2.2): while she falls, a ring of light and ten あ burst out where she slipped; once she is behind the
// hills they fly one by one into the 言靈 button up top, which bounces and counts up a tenth each (a rising 叮 with 答題音效 on),
// glows at the last, and +n rises beside it; the buttons are kept up meanwhile. The button put away (擺設, the dressing room):
// the pop up top says it; motion reduced: no flight, the new count at once
function witchCoins(yard, at, n) {
  const kb = yard.querySelector('.yard-tools .study-koto'), num = kb && kb.querySelector('span'), wake = () => { if (yard._wake) yard._wake(); };
  if (!num || !kb.getBoundingClientRect().width || getComputedStyle(kb).visibility !== 'visible') { setTimeout(() => kotoPop(n), 450); return; }
  const from = kotoBalance() - n;
  const end = () => {
    if (!kb.isConnected) return;
    kotoButtons(yard); kb.classList.add('glow'); setTimeout(() => kb.classList.remove('glow'), 900);
    const r = kb.getBoundingClientRect(), p = document.createElement('div');
    p.className = 'koto-plus'; p.textContent = `+${n}`; p.style.left = `${r.left - 8}px`; p.style.top = `${r.top + r.height / 2}px`;
    document.body.appendChild(p); setTimeout(() => p.remove(), 1700); wake();
  };
  num.textContent = from; wake();
  if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) { end(); return; }
  const go = ([x, y], s) => `translate(${x.toFixed(1)}px,${y.toFixed(1)}px) scale(${s.toFixed(2)})`;
  setTimeout(() => {   // the ring stands where she was (its own animation scales it)
    const b = document.createElement('i'); b.className = 'koto-burst'; b.style.left = `${at[0]}px`; b.style.top = `${at[1]}px`;
    document.body.appendChild(b); setTimeout(() => b.remove(), 600);
  }, 350);
  let got = 0;
  for (let i = 0; i < 10; i++) {
    const a = i / 10 * 2 * Math.PI + (i % 3) * 0.25, d = 20 + (i * 7) % 22, spot = [at[0] + Math.cos(a) * d, at[1] + Math.sin(a) * d * 0.8];
    const c = document.createElement('i'); c.className = 'koto-coin'; c.innerHTML = kotoIcon(); c.style.opacity = '0'; c.style.transform = go(at, 0.3); document.body.appendChild(c);
    c.animate([{ transform: go(at, 0.3), opacity: 0 }, { transform: go(spot, 1), opacity: 1 }], { duration: 450, delay: 350 + i * 12, easing: 'cubic-bezier(.2, .8, .3, 1)', fill: 'forwards' });
    setTimeout(() => {   // up and over into the button, along a curve (its points sampled), faster as it goes
      if (!kb.isConnected) { c.remove(); return; }   // the yard was left meanwhile
      const t = kb.querySelector('.koto-i').getBoundingClientRect(), to = [t.left + t.width / 2, t.top + t.height / 2], via = [spot[0] + (i - 4.5) * 5, Math.min(spot[1], to[1]) - 36];
      const path = Array.from({ length: 13 }, (_, j) => { const s = j / 12, u = 1 - s;
        return { transform: go([u * u * spot[0] + 2 * u * s * via[0] + s * s * to[0], u * u * spot[1] + 2 * u * s * via[1] + s * s * to[1]], 1 - 0.35 * s), opacity: 1 }; });
      c.getAnimations().forEach((x) => x.cancel());
      c.animate(path, { duration: 650, easing: 'cubic-bezier(.45, 0, .8, .6)', fill: 'forwards' }).onfinish = () => {
        c.remove(); if (!kb.isConnected) return;
        got++; num.textContent = from + Math.round(n * got / 10);
        kb.classList.remove('bump'); void kb.offsetWidth; kb.classList.add('bump');
        playSfx('coin', got - 1); wake();
        if (got === 10) end();
      };
    }, 1500 + i * 80);
  }
}
// a place's own sky by day (2026-11-10, the user: every place had the same sky): its clouds (heights, sizes, pace), where the
// plane is, and birds of its own — gulls over the sea, crows by the shrine and the castle — worked out from its name
const SKY_LOCAL = { beach: 'gull', harbor: 'gull', shrine: 'crow', castle: 'crow' };
function placeSky(place) {
  if (place === 'yard') return { clouds: [[10, 1, 110, 20], [24, 0.7, 140, 80], [5, 0.85, 125, 55], [34, 0.6, 160, 120]], plane: [7, 20], fliers: [] };
  let a = [...place].reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 7);
  const rnd = () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };   // mulberry32
  const n = (lo, hi) => Math.round(lo + rnd() * (hi - lo));
  return {
    clouds: Array.from({ length: n(3, 5) }, () => [n(3, 36), n(50, 110) / 100, n(100, 180), n(0, 170)]),
    plane: [n(4, 16), n(0, 75)],
    fliers: [[n(12, 20), n(26, 34), n(0, 30)], [n(20, 28), n(36, 46), n(0, 40)], [n(14, 24), n(30, 40), n(10, 40)]]
  };
}
function yardHtml(pct, place = 'yard') {
  const f = pct / 100, mail = mailCount(), yw = yardWorldW(), street = place !== 'yard', balloon = Math.random() < 0.16;   // the hot-air balloon now and then (the user): about one place drawn in six
  const star = (s) => `<i class="st${s.dip ? ' dip' : ''}${s.t <= f ? ' on' : ''}" data-t="${s.t}" style="left:${s.x}%;top:${s.y}%;--s:${s.s}px;--d:${s.d}s;--w:-${s.w}s;--in:${f ? Math.round(s.t / f * 120) / 100 : 0}s"></i>`;
  const dip = SKY.stars.filter(s => s.dip).map(s => `${s.x} ${s.y}`);
  const sky = placeSky(place);
  const ground = 'M0 222 C60 204 120 180 210 164 C300 150 380 144 450 147 C520 149 560 150 600 150 C640 150 690 149 760 146 C840 143 920 150 1000 166 C1080 182 1150 204 1200 222';   // a hilltop: it falls away at both sides (2026-11-10)
  return `<div class="yard${street ? ' away ' + place : ''}${INDOOR.includes(place) ? ' indoor' : ''}${pct >= 100 ? ' full' : ''}" data-anim data-place="${place}" style="--f:${f}">
    <div class="sky" aria-hidden="true">
      <i class="tint t-grey"></i><i class="tint t-blue"></i><i class="tint t-warm"></i>
      <i class="sun"></i>
      <div class="night">
        <i class="moon"></i>
        <i class="nebula n1"></i><i class="nebula n2"></i>
        <div class="aurora"><i></i><i></i></div>
        <svg class="dipper" viewBox="0 0 100 100" preserveAspectRatio="none"><path d="M${dip.join(' L')} L${dip[3]}"/></svg>
        ${SKY.faint}${SKY.stars.map(star).join('')}
        <i class="nplane" aria-hidden="true"></i>
        <div class="meteors"><i class="meteor" style="left:6%;top:10%;--d:9s;--w:-3s"></i><i class="meteor" style="left:36%;top:3%;--d:13s;--w:-9s"></i></div>
      </div>
      <div class="dayset">
        <i class="rainbow"></i>
        <div class="clouds">${sky.clouds.map(([y, k, d, w]) => `<i class="cloud" style="top:${y}%;--k:${k};--d:${d}s;--w:-${w}s"></i>`).join('')}</div>
        ${SKY_LOCAL[place] ? `<div class="fliers ${SKY_LOCAL[place]}">${sky.fliers.map(([y, d, w], i) => `<div class="flier${i === 1 ? ' back' : ''}" style="top:${y}%;--d:${d}s;--w:-${w}s"><i></i></div>`).join('')}</div>` : ''}
        <div class="plane" aria-hidden="true" style="top:${sky.plane[0]}%;animation-delay:-${sky.plane[1]}s"><i class="trail"></i><svg viewBox="0 0 40 14"><path d="M2 7 Q6 4 30 5 Q38 5.4 39 7 Q38 8.6 30 9 Q6 10 2 7 Z" fill="#f4f6f8"/><path d="M16 6 L24 0 H27 L22 6.4 Z M16 8 L24 14 H27 L22 7.6 Z M3 7 L1 2 H4 L8 6.4 Z" fill="#dfe4ea"/><path d="M30 6 h5" stroke="#9fb0c8" stroke-width="1.2"/></svg></div>
        ${balloon ? '' : '<!--'}<div class="balloon" aria-hidden="true"><svg viewBox="0 0 40 60"><path d="M20 2 C8 2 2 11 2 20 C2 31 12 38 16 44 H24 C28 38 38 31 38 20 C38 11 32 2 20 2 Z" fill="#e8913a"/><path d="M20 2 C14 6 12 14 12 22 C12 32 15 39 16 44 H24 C25 39 28 32 28 22 C28 14 26 6 20 2 Z" fill="#f2c94c"/><path d="M20 2 C18 10 17 20 17.5 30 C18 37 18.6 41 19 44 H21 C21.4 41 22 37 22.5 30 C23 20 22 10 20 2 Z" fill="#d0574b"/><path d="M16 44 L17 50 M24 44 L23 50" stroke="#8a6a46" stroke-width=".8"/><rect x="16.5" y="50" width="7" height="6" rx="1" fill="#a8743f"/></svg></div>${balloon ? '' : '-->'}
        <div class="birds"><div class="flock">${[[52, 14], [38, 6], [38, 22], [24, 0], [24, 28]].map(([x, y]) => `<i style="left:${x}px;top:${y}px"></i>`).join('')}</div></div>
      </div>
      <div class="yworld" style="width:${yw}px;margin-left:${-yw / 2}px">
      ${place === 'beach' ? beachHtml() : place === 'town' ? townHtml() : place === 'harbor' ? harborHtml() : place === 'park' ? parkHtml() : place === 'shokudo' ? shokudoHtml() : place === 'izakaya' ? izakayaHtml() : place === 'station' ? stationHtml() : place === 'sento' ? sentoHtml() : place === 'shrine' ? shrineHtml() : place === 'castle' ? castleHtml() : street ? streetHtml() : `<svg class="mtn" viewBox="0 0 1200 600" preserveAspectRatio="xMidYMax slice">
        <defs><radialGradient id="shopGlow"><stop offset="0" stop-color="rgba(255,196,110,.55)"/><stop offset=".5" stop-color="rgba(255,196,110,.16)"/><stop offset="1" stop-color="rgba(255,196,110,0)"/></radialGradient></defs>
        <path class="m-far" d="M520 600 V340 C560 330 600 314 640 304 C670 296 700 294 730 298 C770 306 810 328 860 342 V600 Z"/>
        <path class="m-main" d="${HILL} V600 Z"/><path class="m-shade" d="M482 250 C494 248 506 256 520 268 C552 296 594 326 646 350 V372 C590 340 548 306 516 280 C502 268 492 258 482 250 Z"/><path class="m-rim" d="${HILL}"/>
        <path class="m-path" d="M540 342 L514 326 L546 306 L506 290 L526 272 L490 260"/>
        ${[[514, 326], [546, 306], [506, 290], [526, 272]].map(([x, y]) => `<circle class="p-lamp" cx="${x}" cy="${y}" r="1.4"/>`).join('')}
        <g transform="translate(482 254) scale(.8)">${SHOP_ART}</g>
      </svg>
      <svg class="land yard-land" viewBox="0 0 1200 370" preserveAspectRatio="xMidYMax slice">${GLOW_DEFS}
        <g class="yard-shore">
          <path class="sea-far" d="M-20 110 H320 V118 H-20 Z"/><path class="sea" d="M-20 117 H310 V152 H-20 Z"/>
          ${[[20, 126, 26], [90, 132, 34], [170, 124, 22], [240, 136, 28]].map(([x, y, l], i) => `<path class="glint" d="M${x} ${y} h${l}" style="--w:-${i * 0.7}s"/>`).join('')}
          <path class="foam" d="M-20 150 C70 147 170 145 300 149"/><path class="sand" d="M-20 150 C70 147 170 145 300 149 L300 160 C170 156 70 158 -20 160 Z"/>
          ${[[70, 148], [128, 146]].map(([x, y]) => `<path d="M${x - 5} ${y} l5 -5 l5 5 Z" ${hc('#e86f5e', '#4a2c48')}/>`).join('')}
        </g>
        <path class="far" d="M190 154 C230 144 262 128 300 116 C340 106 390 98 440 106 S540 90 640 104 S860 124 960 108 C1000 100 1040 98 1080 104 V370 H190 Z"/>
        <g class="yard-market">
          <path d="M940 160 C1010 128 1100 102 1220 92 V370 H940 Z" ${hc('#9dbb8e', '#141a36')}/>
          ${[[1004, 146, 14], [1028, 138, 17], [1046, 147, 13], [1062, 128, 15], [1080, 140, 18], [1098, 121, 14], [1104, 134, 16], [1122, 147, 13], [1132, 115, 17], [1146, 128, 14], [1160, 109, 15], [1168, 140, 16], [1182, 120, 14], [1196, 104, 17], [1200, 133, 13], [1150, 152, 15]].sort((p, q) => p[1] - q[1]).map(([x, g, w], k) => { const h = Math.round(w * 0.7); return `<rect x="${x - w / 2}" y="${g - h}" width="${w}" height="${h}" ${hc(k % 3 ? '#efe4d2' : '#e6dccb', '#1e2042')}/><path d="M${x - w / 2 - 2} ${g - h + 1} L${x} ${g - h - w * 0.4} L${x + w / 2 + 2} ${g - h + 1} Z" ${hc(['#8a5a44', '#5f6f8a', '#6f5a7a', '#8a2f2a'][(k * 3) % 4], '#15163a')}/>${k % 4 === 1 ? `<rect class="lit" x="${x - 3}" y="${g - h + 3}" width="5" height="4"/>` : ''}`; }).join('')}
          <path d="M1060 112 Q1110 100 1170 92" fill="none" ${hs('#6a6a74', '#2a2c50')} stroke-width=".8"/>${[1072, 1094, 1116, 1138, 1160].map((x, k) => `<path d="M${x} ${108 - k * 3} l3 0 l-1.5 3 Z" fill="${['#d0574b', '#e6c23a', '#3f7ac8'][k % 3]}"/>`).join('')}
        </g>
        <path d="M-20 158 C60 156 150 154 230 164 C270 170 300 186 318 214 V370 H-20 Z" ${hc('#a6bd96', '#161c38')}/>
        <path d="M1220 120 C1150 124 1060 140 990 162 C950 176 920 196 900 222 V370 H1220 Z" ${hc('#a6bd96', '#161c38')}/>
        <path d="M74 214 L40 202 L118 190 L64 178 L150 168 L120 158" fill="none" ${hs('#e3cf9e', '#3a3858')} stroke-width="3.4" stroke-linejoin="round"/>
        <path d="M1128 216 L1166 200 L1084 188 L1146 174 L1066 164 L1100 152" fill="none" ${hs('#cfc8b8', '#3a3858')} stroke-width="3.4" stroke-linejoin="round"/>
        <path class="near" d="${ground} V370 H0 Z"/><path class="ridge" d="${ground}"/>
        <path class="lane" d="${stripD(LANE, 24)}"/>${lightPool(600, 156, 70, 14)}
        ${[[240, 250, 1], [330, 300, 1.3], [420, 214, .9], [470, 340, 1.4], [520, 262, 1], [690, 236, 1], [740, 318, 1.3], [800, 200, .8], [880, 280, 1.2], [960, 236, 1], [1020, 330, 1.4], [300, 196, .8], [1080, 268, 1.1], [150, 300, 1.3]].map(([x, y, k], i) => `<path d="M${x - 6 * k} ${y} q${2 * k} ${-8 * k} ${1 * k} ${-14 * k} q${3 * k} ${6 * k} ${4 * k} ${12 * k} q${2 * k} ${-9 * k} ${6 * k} ${-12 * k} q${-1 * k} ${8 * k} ${1 * k} ${14 * k} Z" ${hcx('fx-tuft', '#6e9a5c', '#0e1630', `animation-delay:-${(i * 0.7) % 3}s`)}/>`).join('')}
        <g data-fx="ytree"><rect class="trunk" x="465" y="104" width="8" height="46"/><g class="crown"><circle cx="469" cy="96" r="22"/><circle cx="452" cy="110" r="15"/><circle cx="487" cy="108" r="16"/></g></g>
        ${[700, 722, 744, 766].map(x => `<rect class="post" x="${x}" y="131" width="4" height="19" rx="1"/>`).join('')}<path class="rail" d="M698 138 H772 M698 145 H772"/>
      </svg>
      <div class="flowers">${SKY.flowers.map(q => `<i class="fl" style="left:${q.x}%;bottom:${q.y}px;--c:${q.c};--d:${q.d}s;--w:-${q.w}s"></i>`).join('')}</div>
      <div class="house">
        <i class="spill"></i>
        <svg viewBox="0 0 140 130">${houseArt()}</svg>
        <i class="win w1"></i><i class="win w2"></i><i class="win w3"></i>
        <i class="smoke"></i><i class="smoke"></i><i class="smoke"></i>
        <button type="button" class="thing enter" data-act="enter-house" aria-label="進屋"><span class="tag">${ySign('door', '進屋')}</span></button>
      </div>
      ${yHeroHtml()}
      <div class="ywares" data-sig="${yardSig()}">${yardWaresHtml()}</div>
      <button type="button" class="thing way-btn" data-act="go-place" data-to="beach" aria-label="海邊" style="margin-left:${YARD_GATE.beach[0] - 22}px;bottom:${YARD_GATE.beach[1] - 8}px"><span class="tag">${ySign('wave', '海邊')}</span></button>
      <button type="button" class="thing way-btn" data-act="go-place" data-to="town" aria-label="商店街" style="margin-left:${YARD_GATE.town[0] - 22}px;bottom:${YARD_GATE.town[1] - 8}px"><span class="tag">${ySign('shop', '商店街')}</span></button>
      <button type="button" class="thing way-btn" data-act="go-place" data-to="street" aria-label="公車站" style="margin-left:${Math.round(LANE.at(1)[0]) - 32}px;bottom:4px"><span class="tag">${ySign('bus', '公車站')}</span></button>
      <div class="mailbox${mail ? ' has' : ''}">
        <svg viewBox="0 0 52 66" aria-hidden="true">
          <ellipse class="mb-shadow" cx="26" cy="64.5" rx="15" ry="2.4"/>
          <rect class="mb-post" x="23" y="33" width="6" height="32" rx="1"/>
          <rect class="mb-body" x="6" y="14" width="40" height="20" rx="6"/><path class="mb-rim" d="M12 14.6 H40"/>
          <rect class="mb-env" x="-4" y="18.5" width="12" height="6.5" rx=".8" transform="rotate(-14 2 21.7)"/>
          <rect class="mb-lid" x="3.5" y="13" width="5.5" height="22" rx="2.2"/>
          <g class="mb-flag"><rect x="16" y="26.6" width="23" height="2.6" rx="1.3"/><rect x="16" y="20" width="8" height="7.5" rx="1"/></g>
          <circle class="mb-pin" cx="38" cy="27.9" r="1.6"/>
        </svg>
        <button type="button" class="thing mbox${mail ? ' mail' : ''}" data-act="mailbox" aria-label="${mailWords(mail)}"><span class="tag">${ySign('mail', mailWords(mail))}</span></button>
      </div>
      <button type="button" class="thing shop-btn" data-act="yard-shop" aria-label="古道具屋" style="left:calc(50% - 118px);bottom:340px"><span class="tag">${ySign('shop', '古道具屋')}</span></button>`}
      ${useBtnsHtml(place)}
      <i class="cloudshade" aria-hidden="true"></i><i class="cloudshade c2" aria-hidden="true"></i>
      <div class="flies">${SKY.flies.map(q => `<i style="left:${q.x}%;top:${q.y}px;--dx:${q.dx}px;--dy:${q.dy}px;--d:${q.d}s;--w:-${q.w}s"></i>`).join('')}</div>
      <div class="butterflies">${[[18, 52, 34, 16, 7.5, 1, '#c9a7ff'], [41, 40, 40, 18, 7, 2, '#ffb3d1'], [55, 66, -36, 14, 8.5, 5, '#ffe08a'], [70, 48, -30, 16, 7.8, 3, '#ffffff'], [86, 60, 32, 12, 8.2, 4, '#ffb3d1']].map(([x, t, dx, dy, d, w, c]) => `<i class="bf" style="left:${x}%;top:${t}px;--dx:${dx}px;--dy:${dy}px;--d:${d}s;--w:-${w}s;--c:${c}"></i>`).join('')}</div>
      <div class="ysel"></div>
      </div>
    </div>
    <div class="yard-tools">${sceneTools('yard-edit')}</div>
    <div class="yedit"></div>
  </div>`;
}
// the buttons up top in 書房 and the yard (1.2.0): 言靈 (to 古道具屋), 衣櫃, 擺設 (each place its own), 設定
function sceneTools(editAct) {
  return `<button type="button" class="study-koto" data-act="koto-shop" aria-label="言靈 ${kotoBalance()}，到古道具屋" title="古道具屋">${kotoIcon()}<span>${kotoBalance()}</span></button><button type="button" class="study-wear" data-act="wardrobe" aria-label="衣櫃" title="衣櫃">${icon('hanger')}</button><button type="button" class="study-edit${editAct === 'yard-edit' ? ' yard-edit' : ''}" data-act="${editAct}" aria-label="擺設" title="擺設">${icon('arrange')}</button><button type="button" class="study-gear" data-act="settings" aria-label="設定" title="設定">${icon('settings')}</button>`;
}
// 書房 (1.1.0): an isometric room drawn much bigger than the screen, with the things you tap; on a phone the camera shows a part
// of it round the hero and goes along with him as he walks (1.2.0: a drag on him leads him, a swipe looks round freely, two
// fingers or the wheel zoom). ROOM.html draws it, ROOM.mount sets the camera and the gestures once it is on the page, ROOM.level
// follows today's progress in place, and ROOM.enter／pull／door play a thing's way into its page.
// The course books, one per stage (入門, 第一…第五階段; N2/N1 will add stages): their colours and spine labels, on 書房's shelf
// and on 課程 (its shelf, the stage cards as their covers)
const BOOK_COLORS = ['#e3907f', '#c8553f', '#79a46c', '#4f805c', '#5f88b2', '#3e5f8e', '#8b6aa8', '#6b4d8a', '#c79a3a', '#9b7424'];
const BOOK_LABELS = ['入門', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
const bookColor = (i) => BOOK_COLORS[i % BOOK_COLORS.length];
const jMonth = (m) => (m < 10 ? '一二三四五六七八九十'[m] : m === 10 ? '十一' : '十二') + '月';   // 日めくり's month (m: 0 for January), in 書房 and on 模擬考
// the books on the shelf: one for every stage begun or passed (n), and the stage being studied (cur)
function shelfBooks() {
  const cur = stageIndex(currentStageId());
  return { n: STAGES.reduce((m, g, i) => (((state.stageTests || {})[g.id] || []).some((r) => r.passed) ? Math.max(m, i + 1) : m), cur + 1), cur, skip: -1 };   // an old save may have no stageTests
}
// ---------- 古道具屋's wares (1.2.0) ----------
// kind: 'floor' stands on 書房's floor (fp: its footprint w × d in room units, turned by r; h: about how tall), 'rug' lies flat (other things may stand
// on it), 'wall' hangs on the left (L, x = 0) or right (R, y = 0) wall (size: w × h, u along the wall, v the height of its middle),
// 'wear' is worn by the hero (slot), 'clothes' a style of top or trousers they put on in their own colours (slot: top, bottom). A
// ware bought goes into the storage box (a wear or clothes into the wardrobe); at: where one of 書房's own (starter) is laid out
// at first.
const WARES = [
  // test (2026-11-09): presents from the neighbours (gift: who brings it; home: where it is set out when there is room), not sold
  { id: 'gramophone', kind: 'floor', h: 2.7, name: '留聲機', price: 100, fp: [1, 1], desc: '老唱機，放著黑膠唱片會一直播輕音樂。點它換唱片或停下來。', act: 'music', gift: 'mugi', home: { w: 'F', x: 19.6, y: 0.6, r: 0 } },
  { id: 'goldfish', kind: 'floor', h: 2.5, name: '金魚缸', price: 28, fp: [0.8, 0.8], desc: '兩隻金魚在裡面慢慢游。' },
  { id: 'bonsai', kind: 'floor', h: 1.4, name: '盆栽', price: 12, fp: [0.8, 0.8], desc: '小小一棵松，修得很用心。', act: 'water' },
  { id: 'monstera', kind: 'floor', h: 2.7, name: '龜背芋', price: 24, fp: [0.9, 0.9], desc: '葉子大大的，房間一下就有精神。' },
  { id: 'cactus', kind: 'floor', h: 1.8, name: '仙人掌', price: 6, fp: [0.6, 0.6], desc: '很好養，忘了澆水也沒關係。', act: 'water' },
  { id: 'bamboo', kind: 'floor', h: 3.4, name: '竹子', price: 14, fp: [0.7, 0.7], desc: '一盆細竹，長得直直的。', act: 'water' },
  { id: 'floorlamp', kind: 'floor', h: 4.1, name: '落地燈', price: 30, fp: [0.7, 0.7], desc: '晚上會亮的暖黃色立燈。', light: { z: 3.7, r: 5 } },
  { id: 'andon', kind: 'floor', h: 1.5, name: '行燈', price: 30, fp: [0.8, 0.8], desc: '和紙糊的燈，晚上透出柔柔的光。', light: { z: 0.9, r: 3.4 } },
  { id: 'chabudai', kind: 'floor', h: 1.0, name: '矮桌', price: 20, fp: [1.6, 1.6], desc: '圓圓的矮桌，放杯茶剛好。點它在旁邊跪坐。', act: 'kneel' },
  { id: 'zabuton', kind: 'floor', h: 0.35, name: '座布團', price: 6, fp: [1, 1], desc: '坐墊，累了就坐一下。點它在上面跪坐。', act: 'kneel' },
  { id: 'daruma', kind: 'floor', h: 1.25, name: '大達摩', price: 15, fp: [0.8, 0.8], desc: '過了一個階段測驗，就畫上另一隻眼睛。' },
  { id: 'manekineko', kind: 'floor', h: 1.25, name: '招き猫', price: 18, fp: [0.6, 0.6], desc: '舉著手招來好運。' },
  { id: 'guitar', kind: 'floor', h: 2.8, name: '吉他', price: 35, fp: [0.7, 0.6], desc: '放在架上，偶爾彈一下。' },
  { id: 'rushmat', kind: 'rug', name: '圓草蓆', price: 10, fp: [2, 2], desc: '藺草編的圓蓆，有草的香味。' },
  { id: 'rug', kind: 'rug', name: '和風地毯', price: 16, fp: [2.6, 1.8], desc: '藍底白紋的和風地毯。' },
  { id: 'tatami', kind: 'rug', name: '榻榻米', price: 20, fp: [1.8, 1.8], desc: '兩張榻榻米，鋪在哪裡都可以。' },
  { id: 'clock', kind: 'wall', name: '掛鐘', price: 20, size: [1.3, 1.3], desc: '一座老掛鐘，跟著手機的時間走。', hands: { r: 0.62, dv: 0 } },
  { id: 'cuckoo', kind: 'wall', name: '鳩時計', price: 30, size: [1, 1.6], desc: '木頭做的鳩時計，指針也會走。', hands: { r: 0.3, dv: 0.05 } },
  { id: 'kitsune', kind: 'wall', name: '狐狸面具', price: 10, size: [0.5, 0.7], desc: '祭典買的狐狸面具。' },
  { id: 'chalkboard', kind: 'wall', name: '小黑板', price: 12, size: [1.2, 1.1], desc: '寫著今天想記住的字。' },
  { id: 'scroll', kind: 'wall', name: '掛軸', price: 20, size: [0.9, 2.6], desc: '寫著「継続は力なり」：持續就是力量。' },
  { id: 'japanmap', kind: 'wall', name: '日本地圖', price: 18, size: [1.4, 1], desc: '標著幾個想去的地方。' },
  { id: 'furin', kind: 'wall', name: '風鈴', price: 9, size: [0.5, 1.2], desc: '玻璃風鈴，叮鈴叮鈴。' },
  { id: 'ukiyoe', kind: 'wall', name: '浮世繪', price: 22, size: [1.6, 1.4], desc: '大浪和富士山的版畫。' },
  { id: 'uchiwa', kind: 'wall', name: '團扇', price: 8, size: [1.1, 1.2], desc: '夏天祭典的團扇。' },
  { id: 'wallshelf', kind: 'wall', name: '壁掛層架', price: 16, size: [1.4, 0.9], desc: '放幾個小東西的木架。' },
  { id: 'mirror', kind: 'wall', name: '圓鏡', price: 14, size: [1, 1], desc: '出門前照一下。點它照鏡子，換臉型、髮型。', act: 'mirror' },
  // the yard's (1.2.0): set out on the lawn in the yard's own 擺設; ground: [width, depth] where it stands, in the hero's units
  { id: 'telescope', kind: 'yard', name: '望遠鏡', price: 45, ground: [76, 12], desc: '架在院子裡，晚上可以看星星。' },
  { id: 'stonelantern', kind: 'yard', name: '石燈籠', price: 26, ground: [64, 12], desc: '院子裡的石燈籠，天黑了會亮起來。' },
  { id: 'engawa', kind: 'yard', name: '緣台', price: 20, ground: [196, 22], desc: '木頭長椅，鋪著紅布，放了一杯茶。' },
  { id: 'tanuki', kind: 'yard', name: '狸貓擺飾', price: 18, ground: [72, 12], desc: '戴斗笠、提著酒壺的信楽燒狸貓。' },
  { id: 'pond', kind: 'yard', name: '小池塘', price: 40, ground: [244, 34], desc: '石頭圍起來的小池塘，兩條錦鯉慢慢游。' },
  // the house's look (1.2.0): bought, the yard's house becomes it at once; its card puts it on or back to the cottage (state.house)
  { id: 'mushroomhouse', kind: 'house', name: '蘑菇屋', price: 2000, desc: '紅色大蘑菇蓋成的房子，白點點、圓窗戶，屋頂冒著煙。買了院子的房子就換成它。' },
  { id: 'gingerhouse', kind: 'house', name: '薑餅屋', price: 2000, desc: '餅乾牆、巧克力屋頂，屋簷滴著糖霜，屋頂黏著軟糖，門邊插一根拐杖糖。' },
  { id: 'stumphouse', kind: 'house', name: '樹墩屋', price: 2000, desc: '老樹墩挖成的家，頂上有年輪和一株小芽，青苔、樹根，門口長了一朵小蘑菇。' },
  { id: 'teapothouse', kind: 'house', name: '茶壺屋', price: 2000, desc: '圓滾滾的水藍色茶壺，壺蓋上開一扇小窗，壺嘴、把手都在，身上畫著小花。' },
  { id: 'beanie', kind: 'wear', slot: 'head', name: '毛帽', price: 30, desc: '軟軟的毛線帽。' },
  { id: 'strawhat', kind: 'wear', slot: 'head', name: '草帽', price: 42, desc: '夏天出門戴的草帽。' },
  { id: 'catears', kind: 'wear', slot: 'head', name: '貓耳髮箍', price: 48, desc: '戴上就變成貓。' },
  { id: 'hachimaki', kind: 'wear', slot: 'head', name: '必勝頭巾', price: 24, desc: '考試前綁上，寫著「必勝」。' },
  { id: 'beret', kind: 'wear', slot: 'head', name: '貝雷帽', price: 36, desc: '有點文青的貝雷帽。' },
  { id: 'gradcap', kind: 'wear', slot: 'head', name: '學士帽', price: 150, desc: '學成的證明。' },
  { id: 'glasses', kind: 'wear', slot: 'face', name: '圓框眼鏡', price: 30, desc: '圓圓的眼鏡，看起來很會讀書。' },
  { id: 'scarf', kind: 'wear', slot: 'neck', name: '圍巾', price: 36, desc: '紅色的長圍巾。' },
  { id: 'bowtie', kind: 'wear', slot: 'neck', name: '領結', price: 27, desc: '正式場合用的小領結。' },
  { id: 'backpack', kind: 'wear', slot: 'back', name: '背包', price: 54, desc: '出門用的小背包。' },
  { id: 'cathead', kind: 'wear', slot: 'head', name: '貓咪頭套', price: 90, desc: '整顆貓咪頭，毛色跟著上衣的顏色。配貓咪上衣和貓咪褲，就變成一隻貓。' },
  { id: 'cathood', kind: 'wear', slot: 'head', name: '貓耳兜帽', price: 60, desc: '有貓耳朵的兜帽，臉旁一圈毛毛，顏色跟著上衣。配貓咪上衣和貓咪褲，就是一整件貓咪布偶裝。' },
  // clothes (1.2.0): a style of top or trousers, dyed in the hero's own colours (look.top, look.bottom) and chosen in the
  // dressing room's 衣服 — 帽T and 長褲 are everyone's, these are sold
  { id: 'tee', kind: 'clothes', slot: 'top', name: 'T恤', price: 24, desc: '短袖 T 恤，顏色在衣櫃自己配。' },
  { id: 'sweater', kind: 'clothes', slot: 'top', name: '毛衣', price: 48, desc: '有麻花紋的針織毛衣。' },
  { id: 'shirt', kind: 'clothes', slot: 'top', name: '襯衫', price: 42, desc: '有領子的襯衫，看起來很認真。' },
  { id: 'jinbei', kind: 'clothes', slot: 'top', name: '甚平', price: 66, desc: '夏天在家穿的和風上衣。' },
  { id: 'cattop', kind: 'clothes', slot: 'top', name: '貓咪上衣', price: 72, desc: '毛茸茸的貓咪裝，白肚子、貓掌手，還有鈴鐺。' },
  { id: 'shorts', kind: 'clothes', slot: 'bottom', name: '短褲', price: 24, desc: '及膝短褲。' },
  { id: 'wide', kind: 'clothes', slot: 'bottom', name: '寬褲', price: 42, desc: '寬鬆的寬褲，走起路來很舒服。' },
  { id: 'skirt', kind: 'clothes', slot: 'bottom', name: '裙子', price: 36, desc: '及膝的 A 字裙。' },
  { id: 'catpants', kind: 'clothes', slot: 'bottom', name: '貓咪褲', price: 60, desc: '有尾巴的貓咪褲，腳是肉球。' },
  // limited (1.2.0): sold under 限時 only while their sale is on (SALES); once bought, theirs like any other
  { id: 'witchhat', kind: 'wear', slot: 'head', limited: 'halloween', name: '魔法師帽', price: 66, desc: '尖尖的魔法師帽，帽尖彎彎的，顏色跟著上衣，有金色的星星和月亮。' },
  { id: 'wizrobe', kind: 'clothes', slot: 'top', limited: 'halloween', name: '魔法師長袍', price: 90, desc: '長到腳踝的長袍，滿是金色星星，腰上掛著一本小魔法書。顏色在衣櫃自己配。' },
  { id: 'pumpkinhouse', kind: 'house', limited: 'halloween', name: '南瓜屋', price: 2000, desc: '胖胖的大南瓜，頂上一根藤蔓和葉子，三角形的窗戶晚上從裡面亮起來。' },
  { id: 'pumpkin', kind: 'floor', limited: 'halloween', h: 1, name: '南瓜燈', price: 20, fp: [0.8, 0.8], desc: '刻了笑臉的南瓜，晚上會從裡面亮起來。', light: { z: 0.5, r: 2.8 } },
  // 書房's own (starter: had from the start, not sold): laid out where they always stood, then moved or put away like the rest
  { id: 'bed', kind: 'floor', starter: true, fixed: true, turn: false, h: 3, name: '床', fp: [2.9, 5.25], at: { w: 'F', x: 9.45, y: 2.625, r: 0, rm: 'bed' }, desc: '', act: 'bed' },
  { id: 'nightTable', kind: 'floor', starter: true, turn: false, h: 3.2, name: '床頭櫃', fp: [1, 1], at: { w: 'F', x: 7.25, y: 0.55, r: 0, rm: 'bed' }, desc: '' },
  { id: 'bigPlant', kind: 'floor', starter: true, turn: false, h: 3.7, name: '觀葉植物', fp: [0.84, 0.84], at: { w: 'F', x: 16.2, y: 1, r: 0 }, desc: '', act: 'water' },
  { id: 'sageRug', kind: 'rug', starter: true, turn: false, name: '圓地毯', fp: [2.5, 2.5], at: { w: 'F', x: 5.4, y: 6.2, r: 0 }, desc: '' },
  { id: 'bedRug', kind: 'rug', starter: true, turn: false, name: '床邊地毯', fp: [2.6, 2.64], at: { w: 'F', x: 5.9, y: 2.92, r: 0, rm: 'bed' }, desc: '' },
  { id: 'fujiPrint', kind: 'wall', starter: true, name: '富士山版畫', size: [1.4, 1.25], at: { w: 'L', u: 3.45, v: 7.925 }, desc: '' },
  { id: 'kanaChart', kind: 'wall', starter: true, name: '平假名表', size: [1.55, 2.15], at: { w: 'R', u: 18.6, v: 5.6 }, desc: '' },
  { id: 'nightPicture', kind: 'wall', starter: true, name: '夜空畫', size: [1.3, 1.1], at: { w: 'R', u: 9.45, v: 4.4, rm: 'bed' }, desc: '' },
  { id: 'pegRail', kind: 'wall', starter: true, name: '掛勾架', size: [1.6, 1.5], at: { w: 'L', u: 7.7, v: 5.05 }, desc: '' },
  // the window (1.2.0): moved along either wall, or put away (the wall is whole then); its curtains and sill go with it
  { id: 'window', kind: 'wall', starter: true, win: true, name: '窗戶', size: [4.7, 5.4], at: { w: 'R', u: 5.5, v: 6.6 }, desc: '' },
  // 1.3.0 (since: 7, set out once where there is room): more of the house's own, so 書房 is no longer all round the desk — a
  // kotatsu in the middle, a reading corner (a sofa, a side table with a lamp, a rug) and a low shelf by the left wall; in the bedroom a window, a
  // wardrobe (it opens 衣櫃, as the button does), a dresser and a plant
  { id: 'sofa', kind: 'floor', starter: true, since: 7, turn: false, h: 2.3, name: '沙發', fp: [3.4, 1.5], at: { w: 'F', x: 22.2, y: 0.75, r: 0 }, desc: '', act: 'sofa' },
  { id: 'sideTable', kind: 'floor', starter: true, since: 7, turn: false, h: 2.6, name: '小邊桌', fp: [0.9, 0.9], at: { w: 'F', x: 24.55, y: 0.5, r: 0 }, desc: '', light: { z: 2.5, r: 4.2 } },
  { id: 'kotatsu', kind: 'floor', starter: true, since: 7, turn: false, h: 1.1, name: '暖桌', fp: [2.8, 2.8], at: { w: 'F', x: 4.6, y: 12.6, r: 0 }, desc: '', act: 'kotatsu' },
  { id: 'loungeRug', kind: 'rug', starter: true, since: 7, turn: false, name: '長地毯', fp: [4.4, 2.8], at: { w: 'F', x: 22.4, y: 3.3, r: 0 }, desc: '' },
  { id: 'lowShelf', kind: 'floor', starter: true, since: 7, turn: false, h: 2.4, name: '矮書架', fp: [1.1, 3.4], at: { w: 'F', x: 0.55, y: 12.6, r: 0 }, desc: '', act: 'diary' },
  { id: 'bedWindow', kind: 'wall', starter: true, since: 7, win: true, name: '臥房的窗', size: [4.7, 5.4], at: { w: 'R', u: 15.6, v: 6.6, rm: 'bed' }, desc: '' },
  { id: 'wardrobe', kind: 'floor', starter: true, since: 7, turn: false, h: 6.2, name: '衣櫃', fp: [1.3, 2.6], at: { w: 'F', x: 0.65, y: 8.3, r: 0, rm: 'bed' }, desc: '', act: 'wardrobe' },
  { id: 'dresser', kind: 'floor', starter: true, since: 7, turn: false, h: 2.6, name: '矮櫃', fp: [2.4, 1.2], at: { w: 'F', x: 15.6, y: 0.6, r: 0, rm: 'bed' }, desc: '', act: 'mirror' },
  { id: 'bedPlant', kind: 'floor', starter: true, since: 7, turn: false, h: 3.7, name: '盆栽植物', fp: [0.84, 0.84], at: { w: 'F', x: 18.9, y: 0.8, r: 0, rm: 'bed' }, desc: '', act: 'water' },
  // test (since: 8): more windows (書房 one behind the sofa and one over the low shelf, the bedroom one by the corner) and wall
  // lamps (their light: lit by night like the lamps, light.dz above their middle)
  { id: 'sofaWindow', kind: 'wall', starter: true, since: 8, win: true, bare: true, name: '沙發旁的窗', size: [4.7, 5.4], at: { w: 'R', u: 22.2, v: 6.6 }, desc: '' },
  { id: 'shelfWindow', kind: 'wall', starter: true, since: 8, win: true, bare: true, name: '矮書架上的窗', size: [4.7, 5.4], at: { w: 'L', u: 12.6, v: 6.6 }, desc: '' },
  { id: 'bedWindow2', kind: 'wall', starter: true, since: 8, win: true, bare: true, name: '臥房角落的窗', size: [4.7, 5.4], at: { w: 'R', u: 3.5, v: 6.6, rm: 'bed' }, desc: '' },
  { id: 'sconce1', kind: 'wall', starter: true, since: 8, name: '壁燈', size: [0.8, 1.1], at: { w: 'R', u: 9.4, v: 5.4 }, desc: '', light: { dz: 0.35, r: 4.4 } },
  { id: 'sconce2', kind: 'wall', starter: true, since: 8, name: '壁燈', size: [0.8, 1.1], at: { w: 'R', u: 27.2, v: 5.4 }, desc: '', light: { dz: 0.35, r: 4.4 } },
  { id: 'sconce3', kind: 'wall', starter: true, since: 8, name: '壁燈', size: [0.8, 1.1], at: { w: 'L', u: 16.6, v: 5.4 }, desc: '', light: { dz: 0.35, r: 4.4 } },
  // test: a full-length mirror — the face, the hair and the features are changed in front of it; 小春's present (by 書房's front door, the user's call)
  { id: 'fullMirror', kind: 'floor', gift: 'koharu', turn: false, h: 5, name: '全身鏡', fp: [0.6, 1.3], home: { w: 'F', x: 0.3, y: 3.25, r: 0 }, desc: '', act: 'mirror' },
  { id: 'sconce4', kind: 'wall', starter: true, since: 8, name: '壁燈', size: [0.8, 1.1], at: { w: 'R', u: 11.8, v: 5.4, rm: 'bed' }, desc: '', light: { dz: 0.35, r: 4.4 } },
  // the string of lights along the tops of the walls, as four strings (1.2.0): hung end to end where it ran, three on the
  // right wall and one on the left, each moved or put away on its own; their bulbs light up one by one as the day's list fills.
  // test (roomV 8): they start in the storage box (at: where they hung, and where a string still hanging there is taken down from)
  { id: 'garland1', kind: 'wall', starter: true, garland: true, name: '串燈', size: [7.5, 0.5], at: { w: 'R', u: 4.05, v: 10.85 }, desc: '' },
  { id: 'garland2', kind: 'wall', starter: true, garland: true, name: '串燈', size: [7.5, 0.5], at: { w: 'R', u: 11.55, v: 10.85 }, desc: '' },
  { id: 'garland3', kind: 'wall', starter: true, garland: true, name: '串燈', size: [7.5, 0.5], at: { w: 'R', u: 19.05, v: 10.85 }, desc: '' },
  { id: 'garland4', kind: 'wall', starter: true, garland: true, name: '串燈', size: [7.5, 0.5], at: { w: 'L', u: 4.05, v: 10.85 }, desc: '' },
  // 書房's working things (fixed: moved, never put away; the door is the house's own and stays). drawn: where the
  // desk's drawing stands, which is no longer its first place (the desk and the window moved right, off the bookcase; roomV 3,
  // and further in roomV 8)
  { id: 'bookcase', kind: 'floor', starter: true, fixed: true, turn: false, h: 7.9, name: '書櫃', fp: [1.3, 2.25], at: { w: 'F', x: 0.65, y: 1.275, r: 0 }, desc: '' },
  { id: 'desk', kind: 'floor', starter: true, fixed: true, turn: false, h: 3.2, name: '書桌和椅子', fp: [3.8, 3.7], at: { w: 'F', x: 5.5, y: 1.85, r: 0 }, drawn: { w: 'F', x: 3.3, y: 1.85, r: 0 }, desc: '' },
  { id: 'chest', kind: 'floor', starter: true, fixed: true, turn: false, h: 4.3, name: '抽屜櫃', fp: [2.4, 1.7], at: { w: 'F', x: 12.5, y: 0.85, r: 0 }, drawn: { w: 'F', x: 8.45, y: 0.85, r: 0 }, desc: '' },
  { id: 'board', kind: 'wall', starter: true, fixed: true, name: '軟木板', size: [2.4, 2.3], at: { w: 'R', u: 12.5, v: 5.5 }, drawn: { w: 'R', u: 8.45, v: 5.5 }, desc: '' },
  { id: 'calendar', kind: 'wall', starter: true, fixed: true, name: '日曆', size: [1.6, 2.7], at: { w: 'R', u: 14.7, v: 5.75 }, drawn: { w: 'R', u: 10.65, v: 5.75 }, desc: '' }
];
const WARE = new Map(WARES.map((w) => [w.id, w]));
const WEAR_SLOTS = [['head', '頭'], ['face', '臉'], ['neck', '脖子'], ['back', '背'], ['body', '外衣']];
const owns = (id) => Boolean(state.owned[id]) || Boolean(WARE.has(id) && WARE.get(id).starter);   // bought, or 書房's own
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
    st.classList.add('drawer-pull');
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
    st.classList.add('fx-door');
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
      state.placed[id] = p; ed.sel = id; saveState();
    } else if (cmd === 'turn' && o) {
      const p = Object.assign({}, o.p, { r: o.p.r ? 0 : 1 });
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
      heroPlace(st); follow(st, sx, hero.lead ? 9 : rem / w.v);
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
    heroPlace(st); heroSave();
    if (el && !SEATED.includes(sp.act)) { el.classList.add(sp.act); if (sp.act !== 'out') setTimeout(() => el.classList.remove(sp.act), 900); }
  }
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
    // a wall's (the round mirror): stood before it, facing the wall
    const f = o.it.kind === 'wall' ? null : wareFootprint(o.it, o.p);
    const [x, y, look] = f ? [[o.p.x, f[3] + 0.5, 'R'], [f[2] + 0.5, o.p.y, 'L']].find(ok) || [o.p.x, f[3] + 0.5, 'R']
      : [1.2, 1.7, 2.4].map((d) => (o.p.w === 'L' ? [d, o.p.u, 'L'] : [o.p.u, d, 'R'])).find(ok) || (o.p.w === 'L' ? [1.2, o.p.u, 'L'] : [o.p.u, 1.2, 'R']);
    use(el, () => { if (o.it.act === 'music') MUSIC.pick(el.closest('.study')); else if (o.it.act === 'wardrobe') DRESS.open(el.closest('.study')); else if (o.it.act === 'mirror') DRESS.open(el.closest('.study'), 'mirror', o.it.name === '矮櫃' ? '梳妝鏡' : o.it.name); else if (o.it.act === 'diary') DIARY.open(); else if (o.it.act === 'water') water(el.closest('.study'), o, look); }, { x, y, look, act: 'reach' });
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
      } else if (d.to) { state.placed[d.o.id] = d.to; ed.sel = d.o.id; saveState(); }
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
        if (fits(o.it, p)) { state.placed[o.id] = p; saveState(); redraw(st); } else toast('那裡放不下');
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
  return { html, level, mount, enter, pull, door, mark, out, kit, fits, moveOff, give, knock, guest, settle, settle8, settleNew, SPOTS, room: () => ROOMID, use, useWare, heroRedraw, heroIn, tapHero, hold, edit: (el, cmd, id) => editCmd(el.closest('.study'), cmd, id) };
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
  // a shelf that stands out from its wall (drawn in the room, not in the wall's plane)
  function wallShelf(p) {
    const d = 0.32, z0 = p.v - 0.3, z1 = p.v - 0.22, a = p.u - 0.66, b = p.u + 0.66;
    const at = (t, dd = d / 2) => (p.w === 'L' ? [dd, p.u + t, z1] : [p.u + t, dd, z1]);
    const plank = p.w === 'L' ? box(C.oak, 0, a, z0, d, b, z1, { t: C.oakTop, x: C.oakDk, hlv: true }) : box(C.oak, a, 0, z0, b, d, z1, { t: C.oakTop, x: C.oakDk, hlv: true });
    const brace = (t) => (p.w === 'L' ? `<path ${F(C.oakDk, 'y', [0.1, p.u + t, z0 - 0.2])} d="${poly([[0, p.u + t, z0], [d - 0.04, p.u + t, z0], [0, p.u + t, z0 - 0.32]])}"/>` : `<path ${F(C.oakDk, 'x', [p.u + t, 0.1, z0 - 0.2])} d="${poly([[p.u + t, 0, z0], [p.u + t, d - 0.04, z0], [p.u + t, 0, z0 - 0.32]])}"/>`);
    const on = (t, inner) => bb(...at(t), inner);
    return brace(-0.48) + brace(0.48) + plank
      + on(-0.4, `<ellipse rx="6" ry="2.4" fill="#2b1c12" fill-opacity=".14"/><path ${F(C.pot, 'y', at(-0.4))} d="M-5 -1 L-4 -9 H4 L5 -1 Z"/><g ${F(C.leaf, 'y', at(-0.4))}><circle cx="-3" cy="-12" r="3.6"/><circle cx="2.6" cy="-13.4" r="3.8"/><circle cy="-16" r="3.2"/></g>`)
      + on(-0.05, `<rect x="-4.6" y="-13" width="9.2" height="13" rx="2" fill="#cfe6ee" fill-opacity=".7" stroke="#e8f4f8" stroke-width=".8"/><g fill="#f08bb0"><circle cx="-1.6" cy="-3" r="1.6"/><circle cx="1.8" cy="-4.6" r="1.6" fill="#f4d06a"/><circle cx="-.6" cy="-6.6" r="1.6" fill="#8fd0a8"/></g><rect x="-5" y="-15" width="10" height="2.6" rx="1" fill="#c8553f"/>`)
      + on(0.36, `<path d="M-6 0 L-5 -13 H5 L6 0 Z" ${F(C.walnut, 'y', at(0.36))}/><rect x="-3.6" y="-11" width="7.2" height="8.6" fill="#f2e9d6"/><path d="M-3.6 -4 L-1 -7 L1.2 -5 L3.6 -8 V-2.4 H-3.6 Z" fill="#8fbf8a"/>`);
  }
  // the peg rail (a tote bag, a scarf): the rail on the wall, the pegs and what hangs on them stood out from it
  function pegRail(p) {
    const face = p.w === 'L' ? 'L' : 'y', pt3 = (lx, lz, d = 0.2) => (p.w === 'L' ? [d, p.u - lx, p.v + lz] : [p.u + lx, d, p.v + lz]), z = 0.55;
    const rail = onWall(p, (k) => `<rect x="-.8" y="-.65" width="1.6" height=".16" rx=".03" ${k.F(C.walnut)}/>`, 0.03);
    let s = rail;
    [0.5, 0, -0.5].forEach((lx) => { s += bb(...pt3(lx, z - 0.02, 0.1), `<circle r="2.6" ${F(C.oakDk, face, pt3(lx, z, 0.1))}/>`); });
    s += bb(...pt3(0.5, z - 0.02), `<path d="M-7 18 C-7 6 -3 0 0 0 C3 0 7 6 7 18" fill="none" stroke-width="2" ${FS('#b8925a', face, pt3(0.5, z - 0.5))}/><rect x="-13" y="16" width="26" height="30" rx="3" ${F('#e8d3a8', face, pt3(0.5, z - 1))}/><rect x="-13" y="33" width="26" height="5" ${F('#c95f4c', face, pt3(0.5, z - 1.2))}/><path d="M-13 19 V43" class="hl"/>`);
    s += bb(...pt3(-0.5, z - 0.02), `<path d="M-6 0 Q0 4 6 0 L5 44 L-1 44 L0 7 L-4 40 L-9 40 Z" ${F('#d0675a', face, pt3(-0.5, z - 1))}/><path d="M-1 44 V48 M1.5 44 V48 M4 44 V48 M-9 40 V44 M-6.5 40 V44 M-4 40 V44" stroke-width="1.2" ${FS('#d0675a', face, pt3(-0.5, z - 1.5))}/>`);
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
  const WALL = {
    fujiPrint: (k) => `<rect x="-.64" y="-.545" width="1.4" height="1.25" fill="#2b1c12" fill-opacity=".14"/><rect x="-.7" y="-.625" width="1.4" height="1.25" ${k.F(C.walnut)}/><rect x="-.6" y="-.525" width="1.2" height="1.05" ${k.F('#f4ead8')}/>
      <circle cx=".33" cy="-.205" r=".15" ${k.F('#e0614f')}/><path d="M-.6 .525 L-.05 -.125 L.05 -.125 L.6 .525 Z" ${k.F('#6f8fb8')}/>
      <path d="M-.05 -.125 L-.26 .155 Q-.12 .095 -.04 .175 Q.06 .075 .12 .155 Q.2 .095 .26 .155 L.05 -.125 Z" fill="#fff"/><path d="M-.6 .365 Q0 .205 .6 .385 V.525 H-.6 Z" ${k.F('#9fbf93')}/>`,
    kanaChart: (k) => {
      let cells = '';
      for (let r = 0; r < 4; r++) for (let c = 0; c < 5; c++) cells += `<rect x="${q2(-0.635 + c * 0.26)}" y="${q2(-0.455 + r * 0.36)}" width=".2" height=".26" rx=".03" ${k.F(['#efb3aa', '#f4d28e', '#b2d3ad', '#b3c9e6', '#d3bde3'][c])}/>`;
      return `<rect x="-.715" y="-.995" width="1.55" height="2.15" fill="#2b1c12" fill-opacity=".12"/><rect x="-.775" y="-1.075" width="1.55" height="2.15" ${k.F('#fbf6ea')}/><rect x="-.775" y="-1.075" width="1.55" height=".44" ${k.F(C.red)}/>
        <text x="0" y="-.765" font-size=".23" font-weight="700" text-anchor="middle" fill="#fff">あいうえお</text>${cells}<circle cx="0" cy="-1.015" r=".05" fill="#5a68d8"/>`;
    },
    nightPicture: (k) => `<rect x="-.59" y="-.47" width="1.3" height="1.1" fill="#2b1c12" fill-opacity=".13"/><rect x="-.65" y="-.55" width="1.3" height="1.1" ${k.F(C.walnut)}/><rect x="-.56" y="-.46" width="1.12" height=".92" ${k.F('#34437a')}/>
      <circle cx=".26" cy="-.19" r=".16" fill="#f6e7a8"/><circle cx=".33" cy="-.24" r=".14" ${k.F('#34437a')}/>
      ${[[-0.38, 0.3], [-0.12, 0.5], [-0.46, 0.62], [0.02, 0.26], [0.4, 0.66]].map(([dx, dz]) => `<circle cx="${dx}" cy="${q2(-0.55 + dz)}" r=".028" fill="#fff"/>`).join('')}
      <path d="M-.56 .23 Q-.25 .07 .05 .22 T.56 .19 V.46 H-.56 Z" ${k.F('#26335f')}/>`,
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
    kitsune: () => `<path d="M0 .32 C-.17 .3 -.23 .12 -.23 -.04 L-.23 -.32 L-.12 -.19 C-.05 -.22 .05 -.22 .12 -.19 L.23 -.32 L.23 -.04 C.23 .12 .17 .3 0 .32 Z" fill="#2b1c12" fill-opacity=".12" transform="translate(.03 .04)"/>
      <path d="M0 .32 C-.17 .3 -.23 .12 -.23 -.04 L-.23 -.32 L-.12 -.19 C-.05 -.22 .05 -.22 .12 -.19 L.23 -.32 L.23 -.04 C.23 .12 .17 .3 0 .32 Z" style="fill:color-mix(in srgb,#fbf7ef calc(var(--day)*100%),#a8a9cc)"/>
      <path d="M-.21 -.27 L-.14 -.19 L-.21 -.11 Z M.21 -.27 L.14 -.19 L.21 -.11 Z" fill="#d0453c"/>
      <path d="M-.16 0 Q-.1 -.07 -.03 -.01 M.03 -.01 Q.1 -.07 .16 0" fill="none" stroke="#d0453c" stroke-width=".04" stroke-linecap="round"/>
      <path d="M0 -.17 L-.035 -.11 L0 -.06 L.035 -.11 Z" fill="#d0453c"/><path d="M-.12 .1 Q-.06 .13 -.03 .1 M.03 .1 Q.06 .13 .12 .1" fill="none" stroke="#e6c25a" stroke-width=".02"/>
      <circle cy=".19" r=".022" fill="#2a2730"/><path d="M-.05 .24 Q0 .27 .05 .24" fill="none" stroke="#2a2730" stroke-width=".015"/>
      <path d="M-.23 -.04 Q-.3 -.2 -.12 -.4 M.23 -.04 Q.3 -.2 .12 -.4" fill="none" stroke="#c8553f" stroke-width=".015"/>`,
    chalkboard: (k) => `<rect x="-.56" y="-.46" width="1.2" height="1" rx=".04" fill="#2b1c12" fill-opacity=".14"/>
      <rect x="-.6" y="-.5" width="1.2" height="1" rx=".04" ${k.F(C.walnut)}/><rect x="-.52" y="-.42" width="1.04" height=".82" ${k.F('#3d5a4a')}/>
      <text x="-.44" y="-.2" font-size=".13" fill="#fff" fill-opacity=".7" ${MARU}>きょうの ことば</text>
      <text x="0" y=".13" font-size=".24" font-weight="700" text-anchor="middle" fill="#fff" fill-opacity=".9" ${MARU}>がんばろう</text>
      <path d="M-.36 .22 Q0 .28 .36 .2" fill="none" stroke="#f2d27a" stroke-opacity=".8" stroke-width=".02"/>
      <rect x="-.58" y=".4" width="1.16" height=".09" ${k.F(C.oakDk)}/><rect x=".18" y=".365" width=".16" height=".04" rx=".015" fill="#fff"/><rect x="-.3" y=".37" width=".12" height=".035" rx=".015" fill="#f4b6b0"/>`,
    scroll: (k) => `<path d="M-.26 -1.28 L0 -1.44 L.26 -1.28" fill="none" stroke="#6e4a33" stroke-width=".02"/><circle cy="-1.45" r=".03" fill="#8a6a4a"/>
      <rect x="-.38" y="-1.22" width=".84" height="2.44" fill="#2b1c12" fill-opacity=".12"/>
      <rect x="-.42" y="-1.26" width=".84" height="2.44" ${k.F('#8aa0b4')}/><rect x="-.42" y="-1.26" width=".84" height=".2" ${k.F('#6f879c')}/><rect x="-.42" y=".98" width=".84" height=".2" ${k.F('#6f879c')}/>
      <rect x="-.3" y="-1.02" width=".6" height="1.96" ${k.F('#f6efdf')}/>
      ${[...'継続は力なり'].map((ch, i) => `<text x="0" y="${q2(-0.72 + i * 0.31)}" font-size=".26" text-anchor="middle" fill="#26232c" ${MINCHO}>${ch}</text>`).join('')}
      <rect x=".1" y=".8" width=".09" height=".09" fill="#d0453c"/>
      <rect x="-.46" y="-1.3" width=".92" height=".06" rx=".03" ${k.F(C.walnut)}/><rect x="-.5" y="1.18" width="1" height=".09" rx=".045" ${k.F(C.walnut)}/><circle cx="-.5" cy="1.225" r=".06" ${k.F('#3a2a1f')}/><circle cx=".5" cy="1.225" r=".06" ${k.F('#3a2a1f')}/>`,
    japanmap: (k) => `<rect x="-.66" y="-.46" width="1.4" height="1" fill="#2b1c12" fill-opacity=".12"/>
      <rect x="-.7" y="-.5" width="1.4" height="1" ${k.F('#f3ead6')}/><rect x="-.64" y="-.44" width="1.28" height=".88" ${k.F('#cfe3ea')}/>
      <g ${k.F('#bfd49a')}><path d="M.3 -.34 C.36 -.4 .48 -.38 .5 -.3 C.5 -.22 .42 -.2 .36 -.22 C.3 -.24 .26 -.28 .3 -.34 Z"/>
        <path d="M.31 -.14 C.36 -.06 .33 .03 .24 .07 C.14 .11 .03 .13 -.08 .15 C-.18 .17 -.27 .21 -.33 .2 C-.36 .16 -.31 .12 -.24 .1 C-.14 .07 -.04 .05 .06 .01 C.15 -.03 .21 -.09 .25 -.17 Z"/>
        <path d="M-.24 .23 C-.19 .21 -.13 .22 -.12 .26 C-.15 .29 -.22 .29 -.24 .23 Z"/><path d="M-.42 .21 C-.36 .2 -.31 .24 -.32 .3 C-.34 .35 -.4 .35 -.43 .3 C-.45 .26 -.45 .23 -.42 .21 Z"/>
        <circle cx="-.52" cy=".39" r=".018"/><circle cx="-.56" cy=".42" r=".014"/></g>
      <circle cx=".2" cy=".05" r=".035" fill="#e0574c"/><circle cx="-.05" cy=".12" r=".028" fill="#5262e8"/><circle cx=".4" cy="-.3" r=".028" fill="#3f8a46"/>
      <path d="M.2 .05 L.32 .2 M-.05 .12 L-.02 .3" stroke="#3a3328" stroke-width=".01" stroke-dasharray=".03 .02"/>
      <text x=".2" y=".29" font-size=".08" fill="#3a3328" ${MARU}>とうきょう</text><text x="-.16" y=".38" font-size=".08" fill="#3a3328" ${MARU}>きょうと</text>`,
    furin: (k) => `<path d="M0 -.6 V-.22" stroke="#6e4a33" stroke-width=".015"/><circle cy="-.6" r=".025" fill="#8a6a4a"/>
      <path d="M-.17 -.02 C-.17 -.27 .17 -.27 .17 -.02 Z" fill="#d7edf6" fill-opacity=".85" stroke="#eef8fb" stroke-width=".02"/>
      <path d="M-.12 -.12 q.04 -.05 .08 0 q-.04 .05 -.08 0 Z M.04 -.08 l.04 -.03 v.06 Z" fill="#e0574c"/><path d="M-.17 -.02 H.17" stroke="#e0574c" stroke-width=".02"/>
      <path d="M-.12 -.18 Q-.08 -.24 0 -.25" fill="none" stroke="#fff" stroke-opacity=".8" stroke-width=".025" stroke-linecap="round"/>
      <path d="M0 -.02 V.18" stroke="#6e4a33" stroke-width=".012"/><rect x="-.06" y=".18" width=".12" height=".42" rx=".01" ${k.F('#cfd8f0')}/><rect x="-.06" y=".18" width=".12" height=".05" fill="#e0574c"/>`,
    ukiyoe: (k) => `<rect x="-.76" y="-.66" width="1.6" height="1.4" fill="#2b1c12" fill-opacity=".13"/>
      <rect x="-.8" y="-.7" width="1.6" height="1.4" ${k.F(C.walnut)}/><rect x="-.72" y="-.62" width="1.44" height="1.24" ${k.F('#f1e6cc')}/>
      <path d="M.12 .26 L.34 .02 L.56 .26 Z" ${k.F('#6f84a3')}/><path d="M.27 .1 L.34 .02 L.41 .1 L.37 .12 L.34 .09 L.31 .12 Z" fill="#fff"/>
      <path d="M-.72 .62 V.06 C-.62 -.24 -.44 -.46 -.16 -.5 C.08 -.53 .2 -.4 .12 -.3 C.04 -.22 -.1 -.27 -.1 -.18 C-.06 -.05 .2 .06 .72 .14 V.62 Z" ${k.F('#2f4f86')}/>
      <path d="M-.6 .62 V.18 C-.5 -.08 -.34 -.3 -.14 -.34 C-.04 -.35 .02 -.32 .02 -.28 C-.06 -.24 -.22 -.26 -.24 -.12 C-.24 .06 .1 .22 .72 .3 V.62 Z" ${k.F('#6f9cc7')}/>
      <path d="M-.4 -.36 q.04 -.06 .08 0 q.04 -.06 .08 0 q.04 -.06 .08 0 q.04 -.06 .08 0 M-.52 -.2 q.04 -.05 .07 0 q.04 -.05 .07 0" fill="none" stroke="#fff" stroke-width=".035" stroke-linecap="round"/>
      <path d="M-.72 .44 Q-.4 .36 -.1 .46 T.72 .42" fill="none" stroke="#fff" stroke-opacity=".7" stroke-width=".03"/>
      <rect x="-.64" y="-.56" width=".08" height=".2" fill="#d0453c"/>`,
    uchiwa: (k) => `<g transform="rotate(-20 -.1 .4)"><rect x="-.13" y=".02" width=".06" height=".5" rx=".02" ${k.F('#c9a46a')}/><circle cx="-.1" cy="-.2" r=".3" ${k.F('#fbf6ec')}/><path d="M-.4 -.2 A.3 .3 0 0 1 .2 -.2 Z" fill="#d0453c"/><path d="M-.18 -.06 q.06 -.04 .12 0 q-.06 .04 -.12 0 Z M-.06 -.06 l.05 -.04 v.08 Z" fill="#e88a3a"/></g>
      <g transform="rotate(22 .1 .4)"><rect x=".07" y=".02" width=".06" height=".5" rx=".02" ${k.F('#c9a46a')}/><circle cx=".1" cy="-.22" r=".3" ${k.F('#3f5f94')}/><path d="M-.14 -.14 q.06 -.06 .12 0 q.06 -.06 .12 0 q.06 -.06 .12 0 M-.12 -.28 q.06 -.06 .12 0 q.06 -.06 .12 0 q.06 -.06 .12 0" fill="none" stroke="#fff" stroke-opacity=".8" stroke-width=".025"/></g>`,
    mirror: (k) => `<circle cx=".04" cy=".06" r=".5" fill="#2b1c12" fill-opacity=".13"/><circle r=".5" ${k.F(C.walnut)}/><circle r=".42" ${k.F('#cfdde4')}/>
      <path d="M-.28 -.06 L-.06 -.3 M-.22 .08 L.08 -.24" stroke="#fff" stroke-opacity=".7" stroke-width=".05" stroke-linecap="round"/>
      <path d="M.06 .42 A.42 .42 0 0 1 .42 .06" fill="none" stroke="#9fb3bf" stroke-opacity=".5" stroke-width=".06"/>`,
    clock: (k) => {
      const r = 0.62;
      let ticks = '';
      for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6, l = i % 3 ? 0.08 : 0.15; ticks += `M${(Math.sin(a) * (r - 0.12)).toFixed(3)} ${(-Math.cos(a) * (r - 0.12)).toFixed(3)} L${(Math.sin(a) * (r - 0.12 - l)).toFixed(3)} ${(-Math.cos(a) * (r - 0.12 - l)).toFixed(3)} `; }
      return `<circle cx=".05" cy=".07" r="${r + 0.02}" fill="#2b1c12" fill-opacity=".14"/><circle r="${r}" ${k.F(C.walnut)}/><circle r="${q2(r - 0.08)}" ${k.F(C.paper)}/><path class="ln" stroke-width="1.1" ${k.FS(C.ink)} d="${ticks}"/>`;
    }
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
    loungeRug: (x, y) => {   // a kilim in front of the sofa: a border, a row of diamonds
      const w = 2.2, d = 1.4, a = [x, y, 0];
      return `<g transform="${onZ(0.015)}"><rect x="${q2(x - w + 0.05)}" y="${q2(y - d + 0.06)}" width="${2 * w}" height="${2 * d}" rx=".18" fill="#2b1c12" fill-opacity=".08"/>
        <rect x="${q2(x - w)}" y="${q2(y - d)}" width="${2 * w}" height="${2 * d}" rx=".18" ${F('#dccab0', 't', a)}/>
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
    fullMirror: (x, y) => {   // a full-length mirror leaning on the left wall: a walnut frame on two little feet, the glass catching the light
      const x0 = x - 0.3, x1 = x + 0.3, y0 = y - 0.65, y1 = y + 0.65, h = 5, a = [x1, y, 2.5];
      let s = shadow(x0, y0 - 0.1, x1 + 0.35, y1 + 0.3, 0.75);
      s += box(C.oakDk, x0 + 0.1, y0 + 0.05, 0, x1, y0 + 0.25, 0.18, { hl: false }) + box(C.oakDk, x0 + 0.1, y1 - 0.25, 0, x1, y1 - 0.05, 0.18, { hl: false });
      s += box(C.walnut, x0 + 0.12, y0, 0.18, x0 + 0.34, y1, h, { t: C.oak, y: '#7a5438', x: C.walnut, hlv: true });
      s += `<g transform="${onX(x0 + 0.345)}"><defs><linearGradient id="fmGlass" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#e9f3f6"/><stop offset=".55" stop-color="#bcd6e0"/><stop offset="1" stop-color="#9fc0cf"/></linearGradient></defs>
        <rect x="${q2(-y1 + 0.13)}" y="${q2(-h + 0.14)}" width="${q2(y1 - y0 - 0.26)}" height="${q2(h - 0.46)}" rx=".5" fill="url(#fmGlass)" style="opacity:calc(.55 + .45 * var(--day))"/>
        <path d="M${q2(-y1 + 0.35)} ${q2(-h + 1.4)} L${q2(-y1 + 0.75)} ${q2(-h + 0.6)} M${q2(-y1 + 0.35)} ${q2(-h + 2.1)} L${q2(-y1 + 1.05)} ${q2(-h + 0.75)}" stroke="#fff" stroke-opacity=".7" stroke-width=".08" stroke-linecap="round"/>
        <rect x="${q2(-y1 + 0.13)}" y="${q2(-h + 0.14)}" width="${q2(y1 - y0 - 0.26)}" height="${q2(h - 0.46)}" rx=".5" fill="none" stroke-width=".05" ${FS(C.oak, 'x', a)}/></g>`;
      return s;
    },
    wardrobe: (x, y) => {   // a tall wardrobe against the left wall: a plinth, two doors with panels and knobs, a cornice, a hat box on top (tapped: 衣櫃)
      const x0 = x - 0.65, x1 = x + 0.65, y0 = y - 1.3, y1 = y + 1.3, h = 6.2, a = (z) => [x1, y, z];
      let s = shadow(x0, y0 - 0.1, x1 + 0.4, y1 + 0.35, 0.9);
      s += box(C.oakDk, x0 + 0.05, y0 + 0.05, 0, x1 - 0.05, y1 - 0.05, 0.25, { hl: false });
      s += box(C.oak, x0, y0, 0.25, x1, y1, h, { t: C.oakTop, y: C.oakDk, hlv: true });
      s += `<g transform="${onX(x1 + 0.004)}"><path d="M${q2(-y)} ${q2(-h + 0.1)} V-.35" stroke="#5a3d28" stroke-opacity=".55" stroke-width=".035"/>
        ${[[y0 + 0.18, y - 0.12], [y + 0.12, y1 - 0.18]].map(([p, q]) => `<rect x="${q2(-q)}" y="${q2(-h + 0.35)}" width="${q2(q - p)}" height="2.5" rx=".06" ${F(C.oakTop, 'x', a(4.6))}/><rect x="${q2(-q)}" y="-3.05" width="${q2(q - p)}" height="2.5" rx=".06" ${F(C.oakTop, 'x', a(1.8))}/>`).join('')}</g>`;
      s += bb(x1 + 0.02, y - 0.16, 3.25, '<circle r="3" fill="#e6c36a"/>') + bb(x1 + 0.02, y + 0.16, 3.25, '<circle r="3" fill="#e6c36a"/>');
      s += box(C.walnut, x0 - 0.05, y0 - 0.05, h, x1 + 0.08, y1 + 0.08, h + 0.22, { t: C.oak, hlv: true });
      return s + box('#d98463', x0 + 0.2, y0 + 0.3, h + 0.22, x1 - 0.15, y0 + 1.2, h + 0.72, { t: '#e9a07e', hlv: true });
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
    gramophone: (x, y, r) => {
      const h = 1.1, L = lit(x, y + 0.3);
      let s = shadow(x - 0.5, y - 0.5, x + 0.62, y + 0.62, 0.75);
      s += box(C.walnut, x - 0.42, y - 0.42, 0, x + 0.42, y + 0.42, h, { t: '#a87a52', x: '#74503a', hlv: true });
      s += qY('#6e4a33', y + 0.425, x - 0.3, x + 0.3, 0.22, 0.86, 'y') + qX('#6a4630', x + 0.425, y - 0.3, y + 0.3, 0.22, 0.86, 'x');
      s += `<g transform="${onZ(h + 0.006)}"><circle cx="${q2(x - 0.06)}" cy="${q2(y + 0.06)}" r=".31" fill="#2a2730"/><circle cx="${q2(x - 0.06)}" cy="${q2(y + 0.06)}" r=".22" fill="none" stroke="#fff" stroke-opacity=".14" stroke-width=".02"/><circle cx="${q2(x - 0.06)}" cy="${q2(y + 0.06)}" r=".07" fill="#d0574a"/></g>`;
      s += upright(x + 0.2, y - 0.2, h, r, `<path d="M0 0 V-9 Q0 -15 -5 -19" fill="none" stroke-width="3" stroke-linecap="round" ${FS('#b88a3e', 'y', [x, y, h + 0.3])}/>
        <path ${L('#e2b252', h + 1.2)} d="M-5 -19 C-11 -26 -18 -41 -21 -58 C-5 -67 15 -61 25 -47 C9 -43 -2 -33 -5 -19 Z"/>
        <ellipse cx="2" cy="-53" rx="23" ry="9.5" transform="rotate(-24 2 -53)" ${L('#a3742c', h + 1.4)}/><ellipse cx="2" cy="-53" rx="15" ry="5.6" transform="rotate(-24 2 -53)" fill="#3a2a1a" fill-opacity=".4"/>
        <path d="M-17 -38 C-15 -48 -8 -56 4 -59" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width="1.6" stroke-linecap="round"/>
        <path d="M-2 -2 L-16 4" stroke="#5c5d68" stroke-width="2.2" stroke-linecap="round"/>`);
      return s;
    },
    goldfish: (x, y, r) => {
      const h = 1.5, L = lit(x, y + 0.3);
      let s = shadow(x - 0.42, y - 0.42, x + 0.5, y + 0.5, 0.7);
      [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => { s += box(C.oakDk, x + a * 0.26 - 0.04, y + b * 0.26 - 0.04, 0, x + a * 0.26 + 0.04, y + b * 0.26 + 0.04, h - 0.1, { hl: false }); });
      s += box(C.oak, x - 0.34, y - 0.34, h - 0.12, x + 0.34, y + 0.34, h, { t: C.oakTop, hlv: true });
      s += upright(x, y, h, r, `<ellipse rx="15" ry="5" fill="#2b1c12" fill-opacity=".15"/>
        <circle cy="-15" r="16" fill="#cfe9f3" fill-opacity=".45" stroke="#e8f6fb" stroke-width="1.2"/>
        <path d="M-15 -12 Q0 -6 15 -12 A16 16 0 0 1 -15 -12 Z" style="fill:color-mix(in srgb,#8fcbe0 calc(var(--day)*100%),#3b5c8a)" fill-opacity=".85"/>
        <path d="M-15 -14 Q0 -8 15 -14" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width="1"/>
        <g class="fish"><path d="M-6 -9 q4 -3 8 0 q-4 3 -8 0 Z M2 -9 l3 -2.4 v4.8 Z" fill="#f07a3a"/><path d="M4 -4 q-4 -2.6 -7 0 q3 2.6 7 0 Z M-3 -4 l-2.6 -2 v4 Z" fill="#f4a03c"/></g>
        <ellipse cy="-29" rx="9.5" ry="2.6" fill="none" stroke="#e8f6fb" stroke-width="1.4"/>
        <path d="M-10 -24 A13 13 0 0 1 -4 -29" fill="none" stroke="#fff" stroke-opacity=".75" stroke-width="2" stroke-linecap="round"/>`);
      return s;
    },
    bonsai: (x, y, r) => {
      const L = lit(x, y);
      let s = shadow(x - 0.42, y - 0.36, x + 0.5, y + 0.46, 0.7);
      s += box('#4f5f78', x - 0.36, y - 0.26, 0, x + 0.36, y + 0.26, 0.28, { t: '#6b5440', x: '#43516a', hlv: true });
      s += upright(x, y, 0.28, r, `<path d="M0 0 C-2 -6 3 -10 1 -16 C-1 -21 -8 -22 -11 -27 M1 -16 C5 -19 11 -20 14 -25" fill="none" stroke-width="3.4" stroke-linecap="round" ${FS('#6d4c35', 'y', [x, y, 0.8])}/>
        <g ${L('#4f8a4c', 1)}><ellipse cx="-13" cy="-30" rx="11" ry="5"/><ellipse cx="14" cy="-28" rx="10" ry="4.6"/><ellipse cx="1" cy="-38" rx="12" ry="5.4"/></g>
        <g fill="#7fb36d" fill-opacity=".7"><ellipse cx="-14" cy="-32" rx="7" ry="2.4"/><ellipse cx="13" cy="-30" rx="6" ry="2.2"/><ellipse cx="0" cy="-40.5" rx="7.5" ry="2.6"/></g>`);
      return s;
    },
    monstera: (x, y, r) => {
      const L = lit(x, y);
      let s = shadow(x - 0.5, y - 0.5, x + 0.62, y + 0.62, 0.7);
      s += box('#eee6da', x - 0.32, y - 0.32, 0, x + 0.32, y + 0.32, 0.72, { t: '#5a3d28', x: '#ddd2c2', hlv: true });
      const leaf = (tx, ty, rot, k, c) => `<g transform="translate(${tx} ${ty}) rotate(${rot}) scale(${k})"><path ${L(c, 1.6)} d="M0 0 C-14 -2 -22 -14 -18 -26 C-14 -36 -2 -38 0 -30 C2 -38 14 -36 18 -26 C22 -14 14 -2 0 0 Z"/><path d="M0 -2 V-28 M0 -10 L-12 -18 M0 -16 L-10 -26 M0 -10 L12 -18 M0 -16 L10 -26" stroke="#fff" stroke-opacity=".35" stroke-width="1"/><path d="M-17 -20 L-9 -17 M-15 -28 L-7 -22 M17 -20 L9 -17 M15 -28 L7 -22" stroke="#3c6e3f" stroke-width="1.6"/></g>`;
      s += upright(x, y, 0.72, r, `<path d="M0 0 C-4 -20 -16 -30 -24 -40 M0 0 C2 -24 6 -40 8 -58 M0 0 C6 -16 18 -24 26 -30" fill="none" stroke="#3f7a42" stroke-width="2.2" stroke-linecap="round"/>
        ${leaf(-26, -36, -38, 1.05, C.leafDk)}${leaf(26, -26, 42, 1, C.leaf)}${leaf(8, -54, 6, 1.15, C.leaf)}${leaf(-6, -22, -10, 0.8, '#6aa864')}`);
      return s;
    },
    cactus: (x, y, r) => {
      const L = lit(x, y);
      let s = shadow(x - 0.32, y - 0.32, x + 0.4, y + 0.4, 0.7);
      s += box(C.pot, x - 0.24, y - 0.24, 0, x + 0.24, y + 0.24, 0.42, { t: '#7a5236', x: '#c2714f', hlv: true });
      s += upright(x, y, 0.42, r, `<rect x="-5.5" y="-46" width="11" height="46" rx="5.5" ${L('#7fae79', 1.2)}/>
        <path d="M5 -22 H10 Q13 -22 13 -26 V-34 Q13 -38 16 -38 Q19 -38 19 -34 V-24 Q19 -16 11 -16 H5 Z" ${L('#77a671', 1, 'x')}/>
        <path d="M-5 -28 H-9 Q-12 -28 -12 -32 V-38 Q-12 -42 -14.5 -42 Q-17 -42 -17 -38 V-30 Q-17 -22 -10 -22 H-5 Z" ${L('#86b47f', 1)}/>
        <path d="M-1.5 -42 V-4 M2 -42 V-4" stroke="#5d8c58" stroke-width=".8" stroke-opacity=".7"/>
        <circle cx="0" cy="-47" r="2.6" fill="#f08bb0"/>`);
      return s;
    },
    bamboo: (x, y, r) => {
      const L = lit(x, y);
      let s = shadow(x - 0.36, y - 0.36, x + 0.46, y + 0.46, 0.7);
      s += box('#3b3f4f', x - 0.28, y - 0.28, 0, x + 0.28, y + 0.28, 0.55, { t: '#6b5440', x: '#32354a', hlv: true });
      const stalk = (dx, top, c) => { let t = `<path d="M${dx} 0 L${dx * 1.6} ${top}" stroke-width="2.6" stroke-linecap="round" ${FS(c, 'y', [x, y, 1.6])}/>`; for (let z = -12; z > top; z -= 13) t += `<path d="M${dx + (dx * 0.6) * (z / top) - 2} ${z} h4" stroke="#55703f" stroke-width="1.4"/>`; return t; };
      const leaves = (lx, ly, dir) => `<path d="M${lx} ${ly} q${dir * 9} -5 ${dir * 16} -2 q${-dir * 9} 4 ${-dir * 16} 2 Z M${lx} ${ly + 5} q${dir * 8} 1 ${dir * 14} 6 q${-dir * 9} -1 ${-dir * 14} -6 Z" ${L('#6fa55c', 2.2)}/>`;
      s += upright(x, y, 0.55, r, stalk(-4, -96, '#8fb36a') + stalk(1, -112, '#9cc077') + stalk(5, -84, '#86ab62') + leaves(-6, -90, -1) + leaves(2, -104, 1) + leaves(8, -76, 1) + leaves(-5, -62, -1) + leaves(3, -50, 1));
      return s;
    },
    floorlamp: (x, y, r) => {
      const L = lit(x, y);
      let s = shadow(x - 0.34, y - 0.34, x + 0.44, y + 0.44, 0.7);
      s += `<g transform="${onZ(0.02)}"><circle cx="${x}" cy="${y}" r=".26" ${F('#3a3d4c', 't', [x, y, 0])}/></g>`;
      s += upright(x, y, 0, r, `<rect x="-1.4" y="-128" width="2.8" height="128" ${L('#4a4e60', 1.6)}/>
        <ellipse cy="-150" rx="32" ry="40" fill="url(#halo)" class="night-only" style="opacity:calc(.55 + .45 * var(--f))"/>
        <path d="M-16 -128 L-11 -156 H11 L16 -128 Z" style="fill:color-mix(in srgb,#f4ead2 calc(var(--day)*100%),#ffd27a)"/>
        <path d="M-16 -128 L-11 -156 H11 L16 -128 Z" fill="#000" fill-opacity=".05" class="day-only"/>
        <ellipse cy="-128" rx="16" ry="4" style="fill:color-mix(in srgb,#e7dcc2 calc(var(--day)*100%),#fff1c4)"/>
        <path d="M-13 -134 L-9.5 -152" stroke="#fff" stroke-opacity=".5" stroke-width="1.4"/>`);
      return s;
    },
    andon: (x, y, r) => {
      const h = 1.3, paper = 'style="fill:color-mix(in srgb,#f6eedb calc(var(--day)*100%),#ffd98a)"';
      let s = shadow(x - 0.4, y - 0.4, x + 0.5, y + 0.5, 0.7);
      s += `<g class="night-only" style="opacity:calc(.5 + .5 * var(--f))"><g transform="${onZ(0.01)}"><ellipse cx="${x}" cy="${y}" rx="1.2" ry="1.2" fill="url(#pool)"/></g></g>`;
      s += box(C.walnut, x - 0.3, y - 0.3, 0, x + 0.3, y + 0.3, 0.12, { t: C.oak });
      s += `<path ${paper} d="${poly([[x - 0.27, y + 0.27, 0.12], [x + 0.27, y + 0.27, 0.12], [x + 0.27, y + 0.27, h], [x - 0.27, y + 0.27, h]])}"/><path ${paper} d="${poly([[x + 0.27, y - 0.27, 0.12], [x + 0.27, y + 0.27, 0.12], [x + 0.27, y + 0.27, h], [x + 0.27, y - 0.27, h]])}"/>`;
      s += `<path d="${poly([[x + 0.27, y - 0.27, 0.12], [x + 0.27, y + 0.27, 0.12], [x + 0.27, y + 0.27, h], [x + 0.27, y - 0.27, h]])}" fill="#000" fill-opacity=".08"/>`;
      s += `<path class="ln" stroke-width="1.6" ${FS(C.walnut, 'y', [x, y, 0.7])} d="${line([[x - 0.3, y + 0.3, 0.12], [x - 0.3, y + 0.3, h + 0.04]])} ${line([[x + 0.3, y + 0.3, 0.12], [x + 0.3, y + 0.3, h + 0.04]])} ${line([[x + 0.3, y - 0.3, 0.12], [x + 0.3, y - 0.3, h + 0.04]])} ${line([[x - 0.3, y + 0.3, 0.7], [x + 0.3, y + 0.3, 0.7], [x + 0.3, y - 0.3, 0.7]])}"/>`;
      s += box(C.walnut, x - 0.32, y - 0.32, h, x + 0.32, y + 0.32, h + 0.08, { t: C.oak });
      return s;
    },
    chabudai: (x, y, r) => {
      const h = 0.62, top = `<g transform="${onZ(h)}"><circle cx="${x}" cy="${y}" r=".76" ${F(C.oakTop, 't', [x, y, h])}/><circle cx="${x}" cy="${y}" r=".62" fill="none" stroke="#fff" stroke-opacity=".18" stroke-width=".03"/></g>`;
      let s = shadow(x - 0.8, y - 0.8, x + 0.9, y + 0.9, 0.75);
      [[-1, 0], [0, -1], [1, 0], [0, 1]].forEach(([a, b]) => { s += box(C.oakDk, x + a * 0.5 - 0.05, y + b * 0.5 - 0.05, 0, x + a * 0.5 + 0.05, y + b * 0.5 + 0.05, h - 0.06, { hl: false }); });
      s += `<path ${F(C.oak, 'y', [x, y + 0.7, h - 0.05])} d="M${pt(x - 0.76 * Math.SQRT1_2, y + 0.76 * Math.SQRT1_2, h)} A${(0.76 * S * Math.SQRT2).toFixed(1)} ${(0.76 * S * Math.SQRT1_2).toFixed(1)} 0 0 0 ${pt(x + 0.76 * Math.SQRT1_2, y - 0.76 * Math.SQRT1_2, h)} L${pt(x + 0.76 * Math.SQRT1_2, y - 0.76 * Math.SQRT1_2, h - 0.08)} A${(0.76 * S * Math.SQRT2).toFixed(1)} ${(0.76 * S * Math.SQRT1_2).toFixed(1)} 0 0 1 ${pt(x - 0.76 * Math.SQRT1_2, y + 0.76 * Math.SQRT1_2, h - 0.08)} Z"/>`;
      s += top;
      s += upright(x - 0.15, y + 0.1, h, r, `<ellipse rx="9" ry="3" fill="#2b1c12" fill-opacity=".15"/><path ${F('#6f8a9c', 'y', [x, y, h + 0.3])} d="M-8 -1 C-10 -8 -8 -14 0 -15 C8 -14 10 -8 8 -1 Z"/><path d="M8 -9 Q14 -10 14 -15" fill="none" stroke="#5c7585" stroke-width="2"/><ellipse cy="-15" rx="5" ry="1.6" fill="#55707f"/><circle cy="-17" r="1.6" fill="#55707f"/>`);
      s += upright(x + 0.3, y - 0.12, h, r, `<path ${F('#e9e1d2', 'y', [x, y, h + 0.2])} d="M-4 0 L-4.6 -7 H4.6 L4 0 Z"/><ellipse cy="-7" rx="4.6" ry="1.5" fill="#9bbf7a"/>`);
      return s;
    },
    zabuton: (x, y, r) => {
      const h = 0.2, c = r ? '#c8553f' : '#4f6aa8';
      let s = shadow(x - 0.52, y - 0.52, x + 0.62, y + 0.62, 0.6);
      s += box(c, x - 0.46, y - 0.46, 0, x + 0.46, y + 0.46, h, { t: c, hlv: true });
      s += `<g transform="${onZ(h + 0.004)}"><rect x="${q2(x - 0.4)}" y="${q2(y - 0.4)}" width=".8" height=".8" rx=".14" fill="#fff" fill-opacity=".08"/><circle cx="${x}" cy="${y}" r=".06" fill="#f2d27a"/><path d="M${q2(x - 0.1)} ${y} h.2 M${x} ${q2(y - 0.1)} v.2" stroke="#f2d27a" stroke-width=".03"/></g>`;
      return s;
    },
    daruma: (x, y, r) => {
      const L = lit(x, y), both = Object.values(state.stageTests || {}).some((a) => Array.isArray(a) && a.some((t) => t && t.passed));
      const eye = (cx, on) => `<circle cx="${cx}" cy="-37" r="4.4" fill="#fff"/>${on ? `<circle cx="${cx}" cy="-37" r="2.8" fill="#1f1d24"/>` : ''}`;
      let s = shadow(x - 0.42, y - 0.42, x + 0.5, y + 0.5, 0.7);
      s += upright(x, y, 0, r, `<g transform="scale(.78)"><ellipse rx="17" ry="5" fill="#2b1c12" fill-opacity=".14"/>
        <path ${L('#d4443a', 0.7)} d="M0 -58 C16 -58 24 -44 24 -28 C24 -10 14 0 0 0 C-14 0 -24 -10 -24 -28 C-24 -44 -16 -58 0 -58 Z"/>
        <path d="M-9 -54 C-16 -48 -20 -38 -19 -26" fill="none" stroke="#fff" stroke-opacity=".3" stroke-width="2.4" stroke-linecap="round"/>
        <path d="M0 -50 C10 -50 14 -42 14 -34 C14 -26 8 -22 0 -22 C-8 -22 -14 -26 -14 -34 C-14 -42 -10 -50 0 -50 Z" fill="#fbf3e2"/>
        ${eye(-6, true)}${eye(6, both)}
        <path d="M-7 -28 Q0 -24 7 -28 M-11 -44 q3 -2 6 0 M5 -44 q3 -2 6 0" fill="none" stroke="#1f1d24" stroke-width="1.4" stroke-linecap="round"/>
        <path d="M-12 -14 Q0 -18 12 -14" fill="none" stroke="#e6c25a" stroke-width="2"/><text y="-6" font-size="7" font-weight="700" text-anchor="middle" fill="#f6dc8a" font-family="'Hiragino Mincho ProN', serif">合格</text></g>`);
      return s;
    },
    manekineko: (x, y, r) => {
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
        <circle cx="-9" cy="-35" r="2.2" fill="#e88a3a" fill-opacity=".85"/><circle cx="7" cy="-38" r="1.6" fill="#3a3640" fill-opacity=".75"/>`);
      return s;
    },
    guitar: (x, y, r) => {
      const L = lit(x, y);
      let s = shadow(x - 0.36, y - 0.32, x + 0.46, y + 0.4, 0.7);
      s += upright(x, y, 0, r, `<path d="M-10 0 L-3 -24 M10 0 L3 -24 M-8 -8 H8" fill="none" stroke="#3a3640" stroke-width="2" stroke-linecap="round"/>
        <g transform="rotate(-8)"><rect x="-2.6" y="-92" width="5.2" height="52" rx="1.2" ${L('#6e4a33', 1.8)}/><path d="M-4 -104 H4 L3 -91 H-3 Z" ${L('#4f3627', 2.4)}/>
        <path ${L('#d79a5a', 1)} d="M0 -48 C10 -48 13 -40 10 -33 C16 -29 18 -20 14 -12 C10 -4 4 -2 0 -2 C-4 -2 -10 -4 -14 -12 C-18 -20 -16 -29 -10 -33 C-13 -40 -10 -48 0 -48 Z"/>
        <circle cy="-26" r="4.6" fill="#3a2a1f"/><rect x="-6" y="-12" width="12" height="2.6" rx="1" fill="#4f3627"/>
        <path d="M-1.2 -100 V-11 M1.2 -100 V-11" stroke="#f3eee2" stroke-width=".5" stroke-opacity=".8"/>
        <path d="M-9 -40 C-12 -33 -12 -26 -9 -20" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="1.6" stroke-linecap="round"/></g>`);
      return s;
    },
    pumpkin: (x, y, r) => {   // 南瓜燈 (Halloween): a carved pumpkin, lit from inside by night
      const L = lit(x, y), carve = 'style="fill:color-mix(in srgb,#5a2e12 calc(var(--day)*100%),#ffd36a)"';
      let s = shadow(x - 0.36, y - 0.36, x + 0.44, y + 0.44, 0.7);
      s += `<g class="night-only" style="opacity:calc(.5 + .5 * var(--f))"><g transform="${onZ(0.01)}"><ellipse cx="${x}" cy="${y}" rx="1" ry="1" fill="url(#pool)"/></g></g>`;
      s += upright(x, y, 0, r, `<ellipse rx="15" ry="4" fill="#2b1c12" fill-opacity=".14"/><path ${L('#e8873a', 0.5)} d="M0 -1 C-11 -1 -18 -7 -18 -16 C-18 -25 -11 -31 0 -31 C11 -31 18 -25 18 -16 C18 -7 11 -1 0 -1 Z"/>
        <path d="M-7 -30 C-11 -23 -11 -9 -7 -2 M7 -30 C11 -23 11 -9 7 -2" fill="none" stroke="#c4621f" stroke-width="1.3" stroke-opacity=".7"/><path ${L('#5f7a3a', 1.1)} d="M-1.8 -30 Q-2.2 -36 1.4 -38.4 L3.4 -36.6 Q1.2 -34 1.8 -30 Z"/>
        <path ${carve} d="M-9 -20 L-4.6 -20 L-6.8 -24.4 Z M4.6 -20 L9 -20 L6.8 -24.4 Z M-10 -12 Q0 -6 10 -12 L7.6 -12.4 L6 -10.2 L4 -12 L2 -10 L0 -12 L-2 -10 L-4 -12 L-6 -10.2 L-7.6 -12.4 Z"/>`);
      return s;
    },
    rushmat: (x, y) => {
      let rings = ''; for (let k = 0.86; k > 0.1; k -= 0.14) rings += `<circle cx="${x}" cy="${y}" r="${q2(k)}" fill="none" stroke="#9c7a4a" stroke-opacity=".35" stroke-width=".025"/>`;
      return `<g transform="${onZ(0.012)}"><circle cx="${q2(x + 0.06)}" cy="${q2(y + 0.06)}" r="1.02" fill="#2b1c12" fill-opacity=".1"/><circle cx="${x}" cy="${y}" r="1" ${F('#d8bf8c', 't', [x, y, 0])}/>${rings}<circle cx="${x}" cy="${y}" r=".98" fill="none" stroke="#a9875a" stroke-width=".05"/></g>`;
    },
    rug: (x, y, r, it) => {
      const [w, d] = r ? [it.fp[1], it.fp[0]] : it.fp, x0 = q2(x - w / 2), y0 = q2(y - d / 2);
      let waves = '';
      for (let i = 0; i < Math.floor((w - 0.5) / 0.32); i++) for (const yy of [y0 + 0.22, q2(y0 + d - 0.22)]) waves += `<path d="M${q2(x0 + 0.25 + i * 0.32)} ${q2(yy + 0.08)} a.16 .16 0 0 1 .32 0" fill="none" stroke="#fff" stroke-opacity=".6" stroke-width=".03"/>`;
      return `<g transform="${onZ(0.012)}"><rect x="${q2(x0 + 0.06)}" y="${q2(y0 + 0.06)}" width="${w}" height="${d}" rx=".08" fill="#2b1c12" fill-opacity=".1"/><rect x="${x0}" y="${y0}" width="${w}" height="${d}" rx=".08" ${F('#3f5f94', 't', [x, y, 0])}/>
        <rect x="${q2(x0 + 0.12)}" y="${q2(y0 + 0.12)}" width="${q2(w - 0.24)}" height="${q2(d - 0.24)}" rx=".05" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width=".035"/>${waves}
        <rect x="${q2(x0 + 0.5)}" y="${q2(y0 + 0.5)}" width="${q2(w - 1)}" height="${q2(d - 1)}" rx=".04" fill="#fff" fill-opacity=".07"/></g>`;
    },
    tatami: (x, y, r, it) => {
      const [w, d] = r ? [it.fp[1], it.fp[0]] : it.fp, x0 = q2(x - w / 2), y0 = q2(y - d / 2), half = q2(w / 2);
      const mat = (mx) => `<rect x="${mx}" y="${y0}" width="${half}" height="${d}" ${F('#cdbf86', 't', [x, y, 0])}/><path d="${Array.from({ length: Math.floor(d / 0.1) }, (_, i) => `M${q2(mx + 0.08)} ${q2(y0 + 0.05 + i * 0.1)} H${q2(mx + half - 0.08)}`).join(' ')}" stroke="#9c8f52" stroke-opacity=".28" stroke-width=".015"/><rect x="${mx}" y="${y0}" width=".07" height="${d}" fill="#3f4a3a"/><rect x="${q2(mx + half - 0.07)}" y="${y0}" width=".07" height="${d}" fill="#3f4a3a"/>`;
      return `<g transform="${onZ(0.014)}"><rect x="${q2(x0 + 0.06)}" y="${q2(y0 + 0.06)}" width="${w}" height="${d}" fill="#2b1c12" fill-opacity=".12"/>${mat(x0)}${mat(q2(x0 + half))}</g>`;
    }
  };
  const crate = (x, y, it, r) => { const [w, d] = r ? [it.fp[1], it.fp[0]] : it.fp; return shadow(x - w / 2 - 0.05, y - d / 2 - 0.05, x + w / 2 + 0.15, y + d / 2 + 0.15, 0.7) + box(C.oak, x - w / 2, y - d / 2, 0, x + w / 2, y + d / 2, 0.6, { t: C.oakTop, x: C.oakDk, hlv: true }); };
  const FLAT = { fujiPrint: 0.08, kanaChart: 0.05, nightPicture: 0.05 };   // 書房's own pictures: as close to the wall as they always hung
  // a string of lights on its own (dragged in 擺設, or in the storage box): the wire and its bulbs, unlit (in 書房 the bulbs are an overlay)
  const garland = (len, p) => wireArt(len, p) + bulbsAt(len, p).map((q) => bb(...q, '<ellipse cy="1.6" rx="2.2" ry="2.8" fill="#fffaf0" stroke="#8a7a60" stroke-width=".6"/>')).join('');
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
// ---------- the hero (1.2.0): the learner, in 書房 and out in the yard ----------
// HERO.svg(o) draws them, feet at (0, 0), about 150 units tall (Q版 since test 2026-11-09), facing us and from behind (the page shows
// one, .back), as they chose to look (o.look: state.look, see OPTS) and with what they wear by part (o.wear); o.L(colour, z) lights
// a colour at a height (書房's light), else daylight colours. The figure stands round x = 2; the head is drawn in its own units
// (its middle at (2, -128)) and set on the body bigger (HEAD).
// Poses and motions are classes on the .hero box and move the parts in CSS: walk, run, sit, reach, crouch, look; idle-… (HERO.idle);
// hop, wave, spin, cheer (a tap).
const HERO = (() => {
  const INK = '#2a2730', LIP = '#7a4a3a';
  // the clothes' colours (test, 2026-11-09): one palette of 16 for the top, the trousers and the shoes — the 8 tops' and the 8
  // trousers' colours before it, so a look saved then keeps its colours
  const CLOTH = [['#ecebe6', '白'], ['#e9e2d0', '米白'], ['#b8a27a', '卡其'], ['#d9a43a', '芥末黃'], ['#6e4f3a', '咖啡'], ['#d0574b', '紅'], ['#e58fa8', '粉紅'], ['#6b7a45', '橄欖綠'],
    ['#4f7a4a', '森林綠'], ['#3f9a8c', '青綠'], ['#4f6f9e', '牛仔藍'], ['#5a68d8', '靛藍'], ['#3f4660', '深藍'], ['#8a8f99', '灰'], ['#4a4a55', '炭灰'], ['#2b2b33', '黑']];
  // what they can choose, no part anyone's by gender: [id, name] (a colour's id is the colour); LOOK0 is a new hero's look
  const OPTS = {
    face: [['mochi', '麻糬臉'], ['round', '圓臉'], ['chubby', '包子臉'], ['oval', '鵝蛋臉'], ['pointed', '尖下巴']],
    skin: [['#f8dcc8', '白皙'], ['#f3d1b5', '淺膚'], ['#e8bd98', '自然'], ['#d39f78', '小麥'], ['#a9714d', '古銅'], ['#76492f', '深褐']],
    cheeks: [['blush', '腮紅'], ['soft', '柔腮紅'], ['shy', '害羞'], ['freckles', '雀斑'], ['none', '無']],
    hairColor: [['#2a2524', '黑'], ['#3b2f2a', '深棕'], ['#6b4a32', '棕'], ['#8a4a2e', '紅棕'], ['#c9a25a', '金'], ['#a3a3a8', '灰'], ['#3d5a99', '藍'], ['#d98aa6', '粉紅']],
    eyes: [['kira', '水汪汪'], ['chibi', 'Q版眼'], ['normal', '普通'], ['sharp', '吊眼'], ['droopy', '垂眼'], ['happy', '笑眼'], ['big', '大眼'], ['sleepy', '睏眼']],
    eyeColor: [['#2a2730', '黑'], ['#5a3a28', '棕'], ['#8a3a2a', '紅'], ['#3a5f9a', '藍'], ['#3f7a52', '綠'], ['#5a3a9a', '紫'], ['#6b6f7a', '灰']],
    brows: [['soft', '自然'], ['straight', '平眉'], ['thick', '粗眉'], ['worried', '八字眉'], ['raised', '挑眉']],
    mouth: [['smile', '微笑'], ['grin', '開心'], ['cat', '貓嘴'], ['flat', '一字'], ['o', '圓嘴'], ['tongue', '吐舌']],
    beard: [['none', '無'], ['stubble', '鬍渣'], ['mustache', '八字鬍'], ['goatee', '山羊鬍'], ['full', '落腮鬍']],
    top: CLOTH,
    topStyle: [['hoodie', '帽T'], ['tee', 'T恤'], ['sweater', '毛衣'], ['shirt', '襯衫'], ['jinbei', '甚平'], ['cattop', '貓咪上衣'], ['wizrobe', '魔法師長袍'], ['yukata', '浴衣']],
    bottomStyle: [['pants', '長褲'], ['shorts', '短褲'], ['wide', '寬褲'], ['skirt', '裙子'], ['catpants', '貓咪褲']],
    bottom: CLOTH,
    shoeStyle: [['sneaker', '球鞋'], ['boots', '短靴'], ['loafer', '皮鞋']],   // everyone's, none sold
    shoe: CLOTH
  };
  const ROLE_STYLES = { topStyle: ['hakui', 'samue', 'kappogi', 'chef', 'jacket', 'happi', 'vest'], bottomStyle: ['hakama'], shoeStyle: ['zori'] };   // the town's own, never sold
  const LOOK0 = { face: 'chubby', skin: '#f3d1b5', cheeks: 'blush', fringe: 'blunt', sides: 'wisps', hairBack: 'crop', hairTop: 'bun', hairColor: '#6b4a32', eyes: 'normal', eyeColor: '#2a2730', brows: 'soft', mouth: 'smile', beard: 'none', topStyle: 'hoodie', top: '#d0574b', bottomStyle: 'pants', bottom: '#2b2b33', shoeStyle: 'sneaker', shoe: '#2b2b33' };   // 2026-11-10, the user's pick: 包子臉, 齊瀏海, 觸角, 清爽, 丸子, 棕髮; a red hoodie, black trousers and sneakers — neither boy nor girl
  // the 16 hairstyles before the hair came in parts (1.2.1): each as its nearest 瀏海, 兩側, 後面, 造型
  const OLD_HAIR = { crop: ['round', 'short', 'short', 'none'], neat: ['swept', 'short', 'short', 'none'], curtain: ['center', 'chin', 'short', 'none'], ahoge: ['round', 'short', 'short', 'ahoge'],
    spiky: ['choppy', 'short', 'short', 'none'], slick: ['none', 'short', 'short', 'none'], curly: ['fluffy', 'curls', 'short', 'none'], afro: ['fluffy', 'curls', 'bob', 'none'], bob: ['blunt', 'incurl', 'bob', 'none'],
    wolf: ['choppy', 'layered', 'shoulder', 'none'], shoulder: ['center', 'chin', 'shoulder', 'none'], long: ['round', 'long', 'long', 'none'], wavy: ['sidepart', 'wave', 'wavy', 'none'],
    ponytail: ['swept', 'short', 'short', 'ponytail'], twintails: ['round', 'short', 'short', 'twintails'], bun: ['short', 'short', 'short', 'bun'] };
  // a saved look as drawn: anything this build does not know (or is missing) is the new hero's; a look from before the hair came in
  // parts (hair: one of the 16, no fringe) gets the parts nearest it
  const norm = (look) => {
    const old = look && !look.fringe && OLD_HAIR[look.hair], lk = old ? Object.assign({}, look, { fringe: old[0], sides: old[1], hairBack: old[2], hairTop: old[3] }) : look;
    return Object.fromEntries(Object.keys(LOOK0).map((k) => [k, lk && (OPTS[k].some(([v]) => v === lk[k]) || (ROLE_STYLES[k] || []).includes(lk[k])) ? lk[k] : LOOK0[k]]));
  };
  const dk = (h, k) => '#' + [1, 3, 5].map((i) => Math.round(parseInt(h.slice(i, i + 2), 16) * k).toString(16).padStart(2, '0')).join('');
  const lt = (h, k) => '#' + [1, 3, 5].map((i) => { const v = parseInt(h.slice(i, i + 2), 16); return Math.round(v + (255 - v) * k).toString(16).padStart(2, '0'); }).join('');
  // the head, drawn the Q版 way (1.2.0): no ears — side locks hang where they would be — big eyes low on the face, a small
  // mouth under them. The face keeps one dome on top (so hair and hats fit every face); the jaw goes by its shape.
  const q = (v) => Math.round(v * 100) / 100;
  const DOME = 'M-32 -128 C-32 -145.7 -16.8 -160 2 -160 C20.8 -160 36 -145.7 36 -128';
  const FACE = {
    mochi: `${DOME} C36.6 -116 36.4 -104.6 31 -99 C25.6 -94.6 15 -93.6 2 -93.6 C-11 -93.6 -21.6 -94.6 -27 -99 C-32.4 -104.6 -32.6 -116 -32 -128 Z`,   // 麻糬: wide, a soft square jaw (the user's 日系 sheet)
    round: `${DOME} C36 -110 21 -94 2 -94 C-17 -94 -32 -110 -32 -128 Z`,
    chubby: `${DOME} C37 -112 31 -95.6 2 -95 C-27 -95.6 -33 -112 -32 -128 Z`,
    oval: `${DOME} C35.5 -106 17 -91 2 -91 C-13 -91 -31.5 -106 -32 -128 Z`,
    pointed: `${DOME} C36 -113 24 -100 2 -90.5 C-20 -100 -32 -113 -32 -128 Z`
  };
  const both = (s) => `${s}<g transform="matrix(-1 0 0 1 4 0)">${s}</g>`;   // a left half and its mirror round the figure's middle (x = 2)
  const star = (x, y, r, fill = '#e6c25a') => `<path fill="${fill}" d="M${Array.from({ length: 10 }, (_, i) => { const a = -Math.PI / 2 + i * Math.PI / 5, k = i % 2 ? r * 0.45 : r; return `${q(x + k * Math.cos(a))} ${q(y + k * Math.sin(a))}`; }).join(' L')} Z"/>`;   // five points
  const EY = -117, EX = [-10.5, 14.5];   // the eyes' height and middles
  let ex = EX;   // the middles as drawn: a head turned a little (svg) has the far eye nearer
  const ink = (d, w = 2.4) => `<path d="${d}" fill="none" stroke="${INK}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
  // an eye: its colour, darker under the lid, the pupil, a big and a small highlight (both lit from the upper right)
  const iris = (x, c, rx = 5, ry = 6.6, dy = 0) => { const y = EY + dy; return `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${c}"/><path d="M${q(x - rx)} ${y} a${rx} ${ry} 0 0 1 ${q(2 * rx)} 0 Z" fill="#000" fill-opacity=".3"/><ellipse cx="${x}" cy="${q(y + 0.8)}" rx="${q(rx * 0.48)}" ry="${q(ry * 0.5)}" fill="#1b1820"/><ellipse cx="${q(x + rx * 0.36)}" cy="${q(y - ry * 0.42)}" rx="${q(rx * 0.4)}" ry="${q(ry * 0.34)}" fill="#fff"/><circle cx="${q(x - rx * 0.42)}" cy="${q(y + ry * 0.48)}" r="${q(rx * 0.22)}" fill="#fff" fill-opacity=".85"/>`; };
  // the upper lash line over an eye, inner corner to outer (o: -1 the left eye, 1 the right), its outer end lifted by up
  const lid = (x, o, up = 0, h = 6.2) => ink(`M${q(x - 6 * o)} ${q(EY - 3.2)} Q${x} ${q(EY - h - 2.6)} ${q(x + 6.6 * o)} ${q(EY - 3.6 - up)}`);
  // the Q版 eyes are drawn in the body's units (the head is drawn bigger, HS) round their middle, the left one mirrored; each eye
  // colour has its own dark, light and glow (an unknown colour gets them by darkening and lightening)
  const bigEye = (x, i, s) => `<g transform="translate(${x} ${EY + 2.5}) scale(${q((i ? 1 : -1) / HS)} ${q(1 / HS)})">${s}</g>`;
  const TONES = { '#2a2730': ['#14121a', '#5a5272', '#a99fd0'], '#5a3a28': ['#2a1410', '#c8743a', '#f6bf78'], '#8a3a2a': ['#2e1010', '#d06a4a', '#ffb89a'],
    '#3a5f9a': ['#0f1f4a', '#5fa8e8', '#b4ecff'], '#3f7a52': ['#0f2a1c', '#5fbf7a', '#d2f7a8'], '#5a3a9a': ['#1e1236', '#9a7ad8', '#e2ccff'], '#6b6f7a': ['#24262c', '#9aa0ac', '#e0e4ec'] };
  const tones = (c) => { const t = TONES[c] || [dk(c, 0.45), lt(c, 0.35), lt(c, 0.7)]; return [t[0], c, t[1], t[2]]; };
  const EYES = {
    normal: (c) => ex.map((x, i) => iris(x, c) + lid(x, i ? 1 : -1)).join(''),
    sharp: (c) => ex.map((x, i) => iris(x, c, 4.8, 5.8, 0.8) + lid(x, i ? 1 : -1, 2.8, 5)).join(''),   // 吊眼: the outer corners up
    droopy: (c) => ex.map((x, i) => iris(x, c, 5, 6.2, 0.4) + lid(x, i ? 1 : -1, -3.4, 6.6)).join(''),   // 垂眼: down
    happy: () => ex.map((x) => ink(`M${q(x - 5.6)} ${EY + 1} Q${x} ${EY - 6} ${q(x + 5.6)} ${EY + 1}`, 2.3)).join(''),   // ^ ^
    big: (c) => ex.map((x, i) => iris(x, c, 6, 7.8, -0.4) + `<circle cx="${q(x + 2.6)}" cy="${q(EY + 2.6)}" r=".9" fill="#fff"/>` + lid(x, i ? 1 : -1, 0, 8.2)).join(''),
    sleepy: (c) => ex.map((x) => `<path d="M${q(x - 5)} ${EY - 1} h10 a5 5.4 0 0 1 -10 0 Z" fill="${c}"/><circle cx="${q(x + 1.6)}" cy="${EY + 1.2}" r="1.1" fill="#fff" fill-opacity=".8"/>` + ink(`M${q(x - 6.2)} ${EY - 1} H${q(x + 6.2)}`, 2.2)).join(''),
    // Q版眼 (test, 2026-11-09): big and round, the lower half of the iris lighter, two highlights, a lash with a flick
    chibi: (c) => ex.map((x, i) => bigEye(x, i, `<ellipse rx="8.6" ry="10.5" fill="#fff"/><ellipse cy="1" rx="7.4" ry="9.45" fill="${c}"/><ellipse cy="4.6" rx="5.3" ry="4.4" fill="${tones(c)[2]}" fill-opacity=".75"/><ellipse rx="3.6" ry="5.25" fill="${INK}"/>
      <circle cx="2.8" cy="-3.8" r="2.7" fill="#fff"/><circle cx="-3" cy="4.4" r="1.2" fill="#fff"/><path d="M-10.2 -4.6 Q-1.7 -14.1 10 -6.6 L12.2 -8.6 L9.8 -3.6 Q-.9 -11.1 -9.2 -2.2 Z" fill="${INK}"/>`)).join(''),
    // 水汪汪 (test, 2026-11-09): the iris darkest under the lid and glowing at the bottom, three highlights, a heavy lash
    kira: (c) => {
      const t = tones(c), n = ++uid, W = 'M-9.8 -1.5 C-9.8 -8.6 -5 -12.2 .6 -12.2 C6.4 -12.2 10.2 -8.2 10.2 -1.2 C10.2 6.4 5.8 11.6 .2 11.6 C-5.6 11.6 -9.8 5.8 -9.8 -1.5 Z';
      const defs = `<defs><linearGradient id="ki${n}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${t[0]}"/><stop offset=".42" stop-color="${c}"/><stop offset=".78" stop-color="${t[2]}"/><stop offset="1" stop-color="${t[3]}"/></linearGradient><clipPath id="kc${n}"><path d="${W}"/></clipPath></defs>`;
      return defs + ex.map((x, i) => bigEye(x, i, `<path d="${W}" fill="#fff"/><g clip-path="url(#kc${n})"><ellipse cx=".4" cy="1.6" rx="8.8" ry="11.4" fill="url(#ki${n})"/><path d="M-9 -4.4 Q.6 -9.4 10 -4.2 V-12 H-9 Z" fill="${t[0]}" fill-opacity=".85"/>
        <ellipse cx=".5" cy="1" rx="3.4" ry="5.4" fill="${t[0]}"/><path d="M-6.4 5 Q.4 12.4 7.4 4.8 Q.4 8.8 -6.4 5 Z" fill="${t[3]}" fill-opacity=".95"/><ellipse cx=".4" cy="1.6" rx="8.8" ry="11.4" fill="none" stroke="${t[0]}" stroke-width=".8"/>
        <path d="M-9.8 -12 H10.4 V-6.4 Q.6 -11 -9.8 -5.6 Z" fill="${t[0]}" fill-opacity=".35"/><ellipse cx="3.6" cy="-4.4" rx="2.9" ry="3.7" fill="#fff" transform="rotate(-20 3.6 -4.4)"/><circle cx="-3.6" cy="4.8" r="1.4" fill="#fff"/><circle cx="5.2" cy="3.4" r=".8" fill="#fff"/>
        <path d="M-6.6 -1 Q-7.4 3 -5.6 6" stroke="${t[3]}" stroke-width="1.1" fill="none" stroke-linecap="round" stroke-opacity=".6"/></g>
        <path d="M-11.4 -2.4 C-10.8 -11 -4.8 -15 1 -14.8 C6.8 -14.6 11.2 -11 13 -6.6 L16 -8.4 L13.8 -5 L16.4 -3.6 L12.6 -3 L11 -4 C9.6 -8.2 5.6 -11.2 .8 -11.4 C-4.4 -11.6 -8.8 -8.4 -9.8 -1.6 Z" fill="${INK}"/>
        <path d="M4 11.4 Q8.4 10.2 10 5.4" stroke="${INK}" stroke-width=".85" fill="none" stroke-linecap="round" stroke-opacity=".75"/><path d="M-6 -16.6 Q1.6 -18.8 9.4 -14.6" stroke="#c99a80" stroke-width=".75" fill="none" stroke-linecap="round"/>`)).join('');
    }
  };
  // the brows (the left one; the right mirrors it): [path, width], in a shade of the hair
  const BROWS = { soft: ['M-15 -128 Q-10.5 -130.8 -6 -128.8', 1.8], straight: ['M-15 -129 H-6', 2], thick: ['M-15.4 -127.8 Q-10.5 -131.6 -5.6 -129', 3.2], worried: ['M-15 -128 Q-10 -128.4 -6 -131.2', 1.8], raised: ['M-15.2 -130.8 Q-10.5 -131.6 -6 -128.4', 1.7] };
  const MOUTH = {   // c: the line's colour (darker on the darkest skin, so the mouth still reads)
    smile: (c) => `<path d="M-1.6 -104.6 Q2 -101.4 5.6 -104.6" fill="none" stroke="${c}" stroke-width="1.6" stroke-linecap="round"/>`,
    grin: () => '<path d="M-2.6 -105.4 Q2 -104.6 6.6 -105.4 Q6 -99.4 2 -99.4 Q-2 -99.4 -2.6 -105.4 Z" fill="#6b2c2c"/><path d="M-.6 -101.2 Q2 -102.8 4.6 -101.2 Q3.8 -99.6 2 -99.6 Q.2 -99.6 -.6 -101.2 Z" fill="#e8838a"/>',
    cat: (c) => `<path d="M-2.6 -105.2 Q-.3 -102.2 2 -104.6 Q4.3 -102.2 6.6 -105.2" fill="none" stroke="${c}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>`,
    flat: (c) => `<path d="M-.8 -103.6 H4.8" stroke="${c}" stroke-width="1.6" stroke-linecap="round"/>`,
    o: () => '<ellipse cx="2" cy="-103" rx="2" ry="2.5" fill="#6b2c2c"/>',
    tongue: (c) => `<path d="M-2.2 -105 Q2 -101.8 6.2 -105" fill="none" stroke="${c}" stroke-width="1.6" stroke-linecap="round"/><path d="M2.4 -103.4 q1.9 4.4 3.8 0 Z" fill="#e8838a"/>`
  };
  const BLUSH = '<ellipse cx="-16.5" cy="-107.6" rx="5.4" ry="3.2" fill="#f5a3a3" fill-opacity=".55"/><ellipse cx="20.5" cy="-107.6" rx="5.4" ry="3.2" fill="#f5a3a3" fill-opacity=".55"/>';
  const CHEEKS = {
    blush: BLUSH,
    soft: [-16.5, 20.5].map((x) => `<ellipse cx="${x}" cy="-107" rx="6" ry="3.4" fill="#f4a9b4" fill-opacity=".3"/><ellipse cx="${x}" cy="-107" rx="4.2" ry="2.3" fill="#f4a9b4" fill-opacity=".4"/><path d="M${x - 2.6} -106.2 l1.2 -2 M${x} -106.2 l1.2 -2 M${x + 2.6} -106.2 l1.2 -2" stroke="#e98b98" stroke-width=".7" stroke-linecap="round" stroke-opacity=".75"/>`).join(''),
    shy: BLUSH + '<path d="M-19.6 -105.8 l2 -3.6 M-16.6 -105.8 l2 -3.6 M-13.6 -105.8 l2 -3.6 M17.4 -105.8 l2 -3.6 M20.4 -105.8 l2 -3.6 M23.4 -105.8 l2 -3.6" stroke="#e0787a" stroke-width="1" stroke-linecap="round" stroke-opacity=".8"/>',
    freckles: [[-20, -110], [-16.6, -108.4], [-20, -106.8], [-13.6, -110.6], [24, -110], [20.6, -108.4], [24, -106.8], [17.6, -110.6]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r=".85" fill="#a8643f" fill-opacity=".55"/>`).join(''),
    none: ''
  };
  // beards in the hair's colour, drawn bigger than any jaw and clipped to the face (f: the fill), under the mouth's new place
  const MUSTACHE = 'M2 -107.6 C-1 -111 -8 -110.8 -10.5 -106.6 C-7.4 -108 -3.6 -106.6 2 -105.4 C7.6 -106.6 11.4 -108 14.5 -106.6 C12 -110.8 5 -111 2 -107.6 Z';
  const BEARD = {
    none: () => '',
    stubble: (f) => `<path ${f} fill-opacity=".13" d="M-34 -112 C-30 -98 -14 -80 2 -80 C18 -80 34 -98 38 -112 C30 -104 20 -99.4 12 -99.8 Q2 -97.4 -8 -99.8 C-16 -99.4 -26 -104 -34 -112 Z M-6 -108.4 Q2 -110.9 10 -108.4 Q8 -106.4 2 -106.4 Q-4 -106.4 -6 -108.4 Z"/>${[[-24, -100], [-18, -96.4], [-11, -93.4], [-4, -95.4], [8, -95.4], [15, -93.4], [22, -96.4], [28, -100], [-14, -90.4], [2, -91.4], [18, -90.4], [-2, -108.4], [6, -108.4]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r=".7" ${f} fill-opacity=".45"/>`).join('')}`,
    mustache: (f) => `<path ${f} d="${MUSTACHE}"/>`,
    goatee: (f) => `<path ${f} d="M-2.5 -98.6 Q2 -97 6.5 -98.6 Q7.2 -91.4 2 -86.9 Q-3.2 -91.4 -2.5 -98.6 Z"/><path ${f} transform="translate(2 -106.4) scale(.75) translate(-2 106.4)" d="${MUSTACHE}"/>`,
    full: (f) => `<path ${f} d="M-34 -122 C-34 -94 -14 -78 2 -78 C18 -78 38 -94 38 -122 L33 -122 C32 -110 24 -100.4 12 -100 Q2 -97.8 -8 -100 C-20 -100.4 -28 -110 -29 -122 Z"/><path ${f} d="${MUSTACHE}"/>`
  };
  // ===== the hair (1.2.1), 日系 anime after the user's sheet of 48 chibi hairstyles and their brief (2026-11-07). Since the Q版
  // body (test, 2026-11-09) it is drawn flat — no gradient, no outline, a soft shine for the ring (HERO.svg) — the shapes as below:
  // every lock ends in a sharp, tapering tip (a ぱっつん or 公主切 line is cut straight); three layers — the back hair, the side
  // locks, the fringe with a stray wisp or two; a gradient from the roots (lighter) to the ends (darker), a fine outline a shade
  // darker than the hair, and a jagged angel ring of light on the crown. The outline goes round the whole of the hair, never where
  // its parts meet (the user found the parts looked pasted together): each layer is drawn twice, its outline under its fills, so
  // the parts are drawn plain (f, k) and HERO.svg gives the outline. Put together from four parts (瀏海, 兩側, 後面, 造型);
  // STYLES are whole hairstyles made of them. Head space: centre x = 2, forehead top y -160, brows ≈ -129, eyes -117, chin ≈ -94.
  // f: the hair (gradient and outline), k: the back hair (darker), s: a strand stroke, w: the hair's fill alone (wisps), skin: the
  // ear's fill. Layers: back (behind the head and body), front (over the face), deco, rear (from behind).
  const HAIRP = (() => {
  const r = (v) => Math.round(v * 10) / 10;
  const both = (s) => `${s}<g transform="matrix(-1 0 0 1 4 0)">${s}</g>`;
  const P = (f, d) => `<path ${f} d="${d}"/>`;
  const strands = (s, d, o = 0.42) => `<path d="${d}" fill="none" ${s} stroke-width="1.1" stroke-opacity="${r(Math.min(0.9, o * 1.8))}" stroke-linecap="round"/>`;   // stronger since the outline went (test)
  const shine = (d, o = 0.3) => `<path d="${d}" fill="#fff" fill-opacity="${o}"/>`;
  // a run of locks: from the first notch down to each tip and up to the next (ns: n + 1 notches, ts: n tips). Each lock keeps its
  // width and tapers late to a sharp tip; a: how far it sweeps sideways from its root, t: how wide the tip (of the lock's width)
  function locks(ns, ts, a = 0.15, t = 0.16) {
    let d = '';
    ts.forEach(([tx, ty], i) => {
      const [nx, ny] = ns[i], [mx, my] = ns[i + 1], w = Math.abs(mx - nx);
      d += ` C${r(nx + (tx - nx) * a - w * 0.06)} ${r(ny + (ty - ny) * 0.55)} ${r(tx - w * t)} ${r(ty - (ty - ny) * 0.32)} ${tx} ${ty}`;
      d += ` C${r(tx + w * t)} ${r(ty - (ty - my) * 0.32)} ${r(mx + (tx - mx) * a + w * 0.06)} ${r(my + (ty - my) * 0.55)} ${mx} ${my}`;
    });
    return d;
  }
  // a lock on its own: from x0…x1 at y0 down to a sharp tip (tx, ty)
  const leaf = (f, x0, x1, y0, tx, ty) => P(f, `M${x0} ${y0}${locks([[x0, y0], [x1, y0]], [[tx, ty]], 0.2, 0.2)} Z`);
  // a stray wisp: a sliver wd wide at its root (x0, y0), bending through (cx, cy) to a sharp end at (x1, y1)
  const wisp = (w, x0, y0, cx, cy, x1, y1, wd = 1.8) => P(w, `M${r(x0 - wd / 2)} ${y0} Q${r(cx - wd / 3)} ${cy} ${x1} ${y1} Q${r(cx + wd / 3)} ${cy} ${r(x0 + wd / 2)} ${y0} Z`);
  // the shine on the crown (test, 2026-11-09, after the user's pick of the flat Q版 look): one soft streak of light up to the left
  const RING = '<ellipse cx="-10" cy="-163" rx="11" ry="3" transform="rotate(-14 -10 -163)" fill="#fff" fill-opacity=".2"/>';
  // ===== the crown, with the fringe as its lower edge from the left temple (-33 -138) to the right (37 -138); at the sides it comes
  // down to just over the ear in a sharp sideburn, so the side locks hang from inside it
  const OUT = ' C37.4 -133 38.4 -126.4 39.6 -121.2 C40.8 -123.6 42.8 -125.4 45 -126.6 C48.8 -129 50.4 -134 50.2 -141 C49.6 -159 32 -174.4 2 -174.4 C-28 -174.4 -45.6 -159 -46.2 -141 C-46.4 -134 -44.8 -129 -41 -126.6 C-38.8 -125.4 -36.8 -123.6 -35.6 -121.2 C-34.4 -126.4 -33.4 -133 -33 -138 Z';
  const crown = (f, e, out = OUT) => P(f, `M-33 -138${e}${out}`);
  // a crown kept close over the ears (推高, test 2026-11-09: the sides and back clipped short so the top stands up, for the cuts men
  // like): no sideburn, a little higher on top
  const SLIM = ' C38.6 -143 40.4 -149 40.6 -154 C40.4 -168 24 -177 2 -177 C-20 -177 -36.4 -168 -36.6 -154 C-36.4 -149 -34.6 -143 -33 -138 Z';
  const L0 = [-33, -138], R0 = [37, -138];
  // a fringe: its edge; b: a darker tier behind it (k); u: hanging from under the crown (f); x: on it (f); its strands and wisps
  const F = (name, e, o = {}) => ({ name, e, b: o.b || (() => ''), u: o.u || (() => ''), x: o.x || (() => ''), deco: o.deco || (() => '') });
  const fl = (name, ns, ts, a, t, o) => F(name, locks([L0, ...ns, R0], ts, a, t), o);
  // a ぱっつん line at y, crisp corners at the temples, slits cut up into it at xs
  function cut(y, xs, dy = 5) {
    let d = ` C-32.8 ${r(y - 3)} -32.4 ${r(y - 0.8)} -30.4 ${y}`;
    xs.forEach((x) => { d += ` L${r(x - 1.3)} ${r(y + 0.6)} L${x} ${r(y - dy)} L${r(x + 1.3)} ${r(y + 0.6)}`; });
    return `${d} L34.4 ${y} C36.4 ${r(y - 0.8)} 36.8 ${r(y - 3)} 37 -138`;
  }
  // spikes standing out round the crown, part of it (deg: where, from the right; len: how far out; s: which way the tip turns)
  const spikes = (k) => [[168, 10, -1], [136, 11, 1], [104, 10.4, -1], [72, 11, 1], [40, 10, -1], [10, 9, 1]].map(([deg, len, s]) => {
    const a = (deg * Math.PI) / 180, p = (b, q) => `${r(2 + q * 44 * Math.cos(b))} ${r(-136 - q * 37 * Math.sin(b))}`;
    return P(k, `M${p(a - 0.24, 0.86)} Q${p(a - 0.08 + s * 0.05, 1.06)} ${p(a + s * 0.14, 1 + len / 40)} Q${p(a + 0.1 + s * 0.05, 1.04)} ${p(a + 0.24, 0.86)} Z`);
  }).join('');
  // a curl: a round lock that ends in a sharp tail (x, y its middle, rr its size, s: 1 tail to the right, -1 to the left)
  const curl = (f, x, y, rr, s = 1) => P(f, `M${r(x - rr * s)} ${r(y + rr * 0.1)} C${r(x - rr * s)} ${r(y - rr * 1.3)} ${r(x + rr * 1.2 * s)} ${r(y - rr * 1.2)} ${r(x + rr * s)} ${r(y + rr * 0.2)} C${r(x + rr * 0.9 * s)} ${r(y + rr * 0.9)} ${r(x + rr * 0.4 * s)} ${r(y + rr * 1.3)} ${r(x - rr * 0.2 * s)} ${r(y + rr * 1.9)} C${r(x - rr * 0.1 * s)} ${r(y + rr * 1.2)} ${r(x - rr * 0.9 * s)} ${r(y + rr * 1.1)} ${r(x - rr * s)} ${r(y + rr * 0.1)} Z`);
  const swirl = (s, pts) => strands(s, pts.map(([x, y, rr]) => `M${r(x - rr * 0.5)} ${r(y + rr * 0.3)} a${r(rr * 0.5)} ${r(rr * 0.5)} 0 1 1 ${r(rr * 0.5)} ${r(rr * 0.5)}`).join(' '), 0.5);
  const FRINGE = {
    round: fl('自然', [[-20, -150], [-6, -153], [9, -152.4], [24, -148.6]], [[-29.4, -127.6], [-14, -126.2], [1, -124.2], [16.6, -126.2], [31.6, -128.2]], 0.25, 0.15,
      { deco: (s, w) => strands(s, 'M-13 -150 C-13.6 -144 -13.8 -138 -13.8 -132 M2 -152 C1.8 -145 1.6 -138 1.2 -130') + wisp(w, -4, -152, -8, -140, -11.4, -124.6, 1.6) }),
    short: fl('短瀏海', [[-20, -151.4], [-6, -154], [9, -153.6], [24, -150.6]], [[-29.2, -133.4], [-14, -137.4], [1, -135.4], [16.4, -137.6], [31.4, -133.8]], 0.2, 0.15,
      { deco: (s) => strands(s, 'M-13 -151 C-13.4 -147 -13.6 -143 -13.8 -140 M2 -153 C1.8 -148 1.6 -142 1.2 -138') }),
    spiky: fl('刺刺', [[-24, -148.6], [-14, -151.4], [-4, -149.4], [6, -152.4], [16, -149.4], [26, -148.6]], [[-30.6, -128], [-19.4, -133.4], [-9.4, -124.8], [1.6, -132.6], [11.4, -124.4], [21.4, -131.8], [32.6, -127]], 0.1, 0.13,
      { x: (f) => spikes(f), deco: (s) => strands(s, 'M-9 -149 C-9.4 -142 -9.6 -135 -9.4 -129 M11 -150 C11.4 -143 11.4 -135 11.4 -128') }),
    blunt: F('齊瀏海', cut(-129.6, [-14.6, .4, 16.4]), { deco: (s) => strands(s, 'M-14.6 -150 V-135.4 M.4 -152 V-135 M16.4 -150 V-135.4 M-24 -146 C-24.4 -141 -24.4 -137 -24.2 -133 M26 -146 C26.4 -141 26.4 -137 26.2 -133', 0.36) }),
    shortblunt: F('短齊', cut(-140.4, [-12, 4, 19], 3.6), { deco: (s) => strands(s, 'M-12 -152 V-144.6 M4 -154 V-144.6 M19 -152 V-144.6', 0.36) }),
    airy: F('空氣', ' C-32 -145 -18 -149.6 2 -149.6 C22 -149.6 36 -145 37 -138', {
      u: (f) => [[-33, -24, -28.6, -128.6], [-23, -13.6, -16.4, -126], [-11.6, -5, -7.4, -129.6], [-3.6, 6.6, 1.6, -124.6], [8.4, 14.6, 12.6, -128.8], [16, 25.6, 21.2, -125.8], [27, 37, 32.4, -128.4]].map(([x0, x1, tx, ty]) => leaf(f, x0, x1, -153, tx, ty)).join(''),
      deco: (s, w) => wisp(w, -6, -150, -9, -138, -12.6, -123.6, 1.4) + wisp(w, 15, -149, 15.6, -138, 17.6, -122.6, 1.4) }),
    swept: fl('斜瀏海', [[-21, -153.4], [-5, -150.4], [11, -147.4], [26, -143]], [[-29.6, -130.6], [-1.6, -130.6], [15.2, -127.6], [30.6, -125.8], [36.2, -129.4]], 0.5, 0.14,
      { deco: (s, w) => strands(s, 'M-17 -152 C-11 -147 -6 -140 -3.4 -134 M-2 -149 C3 -144 8 -137 12.4 -131') + wisp(w, -18, -153, -8, -146.6, 3.6, -141.4) }),
    longswept: fl('大斜', [[-17, -155], [13, -142.6]], [[-29.6, -131.4], [22, -121.4], [34, -125.6]], 0.55, 0.12,
      { deco: (s) => strands(s, 'M-13 -154 C-4 -148 6 -139 15 -127 M0 -152 C8 -147 15 -140 21 -131') }),
    sidepart: fl('旁分', [[-8, -154.4], [29, -140.6]], [[-25.4, -126.6], [25, -124.2], [35.4, -130]], 0.5, 0.12,
      { deco: (s, w) => strands(s, 'M-8 -168 V-157 M-11 -151 C-16 -145 -20 -138 -23 -131 M-3 -151 C5 -146 13 -139 20 -130') + wisp(w, -9, -154, -3, -147, 2.4, -142, 1.6) }),
    center: F('中分', ' C-32.4 -132 -29.6 -126.4 -25 -123.2 C-22 -132 -10 -149 2 -157.4 C14 -149 26 -132 29 -123.2 C33.6 -126.4 36.4 -132 37 -138',
      { deco: (s) => strands(s, 'M2 -172 V-158 M-3 -153 C-10 -147 -17 -138 -21.6 -129 M7 -153 C14 -147 21 -138 25.6 -129') }),
    curtain: F('八字', ' C-32.8 -131 -31.8 -125.4 -29.6 -121 C-27.6 -134 -15 -151 2 -153.6 C19 -151 31.6 -134 33.6 -121 C35.8 -125.4 36.8 -131 37 -138',
      { deco: (s, w) => strands(s, 'M2 -170 V-155 M-4 -151 C-14 -145 -22 -135 -26.6 -126 M8 -151 C18 -145 26 -135 30.6 -126') + wisp(w, -2, -153, -9, -145, -15, -134, 1.4) }),
    mshape: fl('M字', [[-12, -149.4], [16, -149.4]], [[-28.4, -122.8], [2, -137.6], [32.4, -122.8]], 0.3, 0.14,
      { deco: (s) => strands(s, 'M2 -166 V-151 M-9 -147 C-16 -141 -21 -134 -25 -126 M13 -147 C20 -141 25 -134 29 -126') }),
    fluffy: fl('蓬鬆', [[-23, -150], [-11, -153], [1, -152], [13, -151], [24, -148]], [[-30.6, -129], [-17.4, -131.4], [-5.2, -126.4], [7.6, -127.8], [19, -126], [32.4, -128.4]], 0.35, 0.13,
      { deco: (s, w) => strands(s, 'M-10 -151 C-9 -145 -7.6 -138 -6.4 -131 M7 -151 C8 -145 8.6 -138 8.4 -132') + wisp(w, -21, -150, -26, -144, -35, -141) + wisp(w, 22, -149, 26, -140, 26.4, -122.6, 1.5) }),
    choppy: fl('碎束', [[-25, -148], [-16, -150.6], [-7, -149], [2, -151.6], [11, -149.6], [20, -151], [28, -147.6]], [[-30.4, -131], [-20.6, -136.8], [-11.6, -128.4], [-2.4, -136], [6.4, -127.4], [15.4, -134.8], [24.6, -129.2], [33, -134]], 0.12, 0.14,
      { deco: (s) => strands(s, 'M-11 -148 C-11.4 -142 -11.6 -136 -11.6 -131 M6 -149 C6.4 -142 6.4 -136 6.4 -130') }),
    none: F('露額', ' C-31.6 -146 -16 -152 2 -152 C20 -152 35.6 -146 37 -138', { deco: (s, w) => strands(s, 'M-22 -151 C-17 -159 -9 -164 0 -166 M-8 -155 C-4 -161 2 -164 9 -165 M24 -151 C19 -159 12 -163 5 -165') + wisp(w, -8, -155, -14, -148, -18.6, -140.6, 1.4) }),
    longbangs: fl('長瀏海', [[-20, -149], [-3, -151.4], [9, -151.4], [24, -149]], [[-27.4, -118.6], [-11.6, -125.4], [2.4, -117.2], [16, -125.4], [31.4, -118.6]], 0.1, 0.13,
      { deco: (s) => strands(s, 'M-22 -150 C-23.4 -142 -24.6 -134 -25.6 -125 M2.4 -152 C2.4 -144 2.4 -134 2.4 -124 M26 -150 C27.4 -142 28.6 -134 29.6 -125') }),
    incurl: fl('圓瀏海', [[-12, -137.4], [16, -137.4]], [[-25.6, -129.8], [2, -128.4], [29.6, -129.8]], 0.05, 0.22,
      { deco: (s) => strands(s, 'M-12 -148 C-12.6 -145 -12.6 -142 -12 -139.4 M16 -148 C16.6 -145 16.6 -142 16 -139.4', 0.36) }),
    flip: fl('外翹', [[-16, -149.4], [2, -152], [20, -149.4]], [[-37.6, -129.8], [-6, -128], [10, -128], [41.6, -129.8]], 0.45, 0.14,
      { deco: (s) => strands(s, 'M-13 -148 C-20 -144 -27 -139 -33 -133 M17 -148 C24 -144 31 -139 37 -133') }),
    asym: fl('不對稱', [[-19, -148.6], [-4, -151], [11, -151], [25, -148]], [[-28.8, -121.4], [-12.6, -124.2], [3.6, -130.6], [17.6, -136.4], [31.6, -136.8]], 0.2, 0.14,
      { deco: (s) => strands(s, 'M-12 -149 C-12.6 -142 -12.8 -135 -12.6 -128') }),
    layered: fl('層次', [[-20, -150], [-6, -153], [9, -152.6], [24, -149]], [[-29.8, -135], [-14, -137.4], [1, -135], [16.4, -137.6], [31.8, -135.4]], 0.15, 0.15,
      { b: (k) => [[-32, -19, -26.6, -127], [-19, -6, -13, -126], [-6, 9, 2, -124.6], [9, 22, 16.6, -126], [22, 36, 30.4, -127.2]].map(([x0, x1, tx, ty]) => leaf(k, x0, x1, -146, tx, ty)).join(''),
        deco: (s) => strands(s, 'M-13 -151 C-13.4 -147 -13.6 -143 -13.8 -140 M2 -153 C1.8 -148 1.6 -142 1.2 -138') })
  };
  // ===== 兩側 sides (the left one; both drawn). The crown already comes down to over the ear; a lock hangs from inside it, its
  // outer edge carrying on from the crown's. ear: the ear shows; b: drawn behind the head (k)
  const SIDES = {
    short: { name: '短', d: (f) => both(P(f, 'M-44 -151 C-47.6 -141 -48.6 -124 -42.8 -108.4 C-41.6 -112.6 -39.8 -116.8 -37.8 -119.6 C-36.8 -116.4 -35.2 -113.8 -33 -112 C-32.2 -122 -31.2 -132 -29.4 -141 Z')), deco: (s) => both(strands(s, 'M-40 -134 C-40.6 -128 -39.8 -122 -38.4 -117')) },
    chin: { name: '到下巴', d: (f) => both(P(f, 'M-44 -151 C-48 -140 -49.4 -116 -43.6 -95.6 C-42.4 -100 -40.6 -104.6 -38.4 -107.6 C-37.2 -103.6 -35.4 -100.6 -32.6 -98.6 C-31.6 -110 -31 -126 -29.4 -141 Z')), deco: (s) => both(strands(s, 'M-40.4 -134 C-41.2 -125 -40.4 -116 -38.8 -108')) },
    long: { name: '長', d: (f) => both(P(f, 'M-44 -151 C-48.6 -138 -49.6 -100 -45.4 -66 C-43.8 -72 -42 -78 -40 -82.4 C-38.8 -78 -37 -74.6 -34.6 -72.6 C-33.6 -92 -32.2 -122 -29.4 -141 Z')), deco: (s) => both(strands(s, 'M-40.6 -132 C-41.8 -116 -41.4 -98 -40 -86') + shine('M-44.6 -122 C-45.4 -112 -45.2 -102 -44 -94 C-43.4 -102 -43.2 -112 -43.6 -122 Z', 0.22)) },
    incurl: { name: '內彎', d: (f) => both(P(f, 'M-44 -151 C-48.6 -140 -49.4 -112 -44.6 -98 C-41.6 -91.4 -34.6 -90 -28.4 -94.4 C-32.8 -95.4 -35.4 -98.8 -36 -103.6 C-36.4 -116 -33.4 -131 -29.4 -141 Z')), deco: (s) => both(strands(s, 'M-41 -132 C-42.2 -123 -41.8 -112 -39.6 -103')) },
    wave: { name: '波浪', d: (f) => both(P(f, 'M-44 -151 C-48 -144 -46 -128 -48 -118 C-51 -108 -45.4 -101 -47 -92 C-47.6 -88.6 -46.6 -85.6 -44.6 -83.6 C-42 -88 -38.6 -91 -37.4 -95.6 C-36 -102 -40.4 -109 -36.6 -117.6 C-33.4 -126 -32 -134 -29.4 -141 Z')), deco: (s) => both(strands(s, 'M-40.6 -132 C-43 -126 -40.4 -121 -42.4 -113 C-44.2 -105 -41 -99 -41.8 -93')) },
    layered: { name: '層次', b: (k) => both(P(k, 'M-46.4 -140 C-49 -124 -48.4 -108 -44.4 -96 C-42.8 -100.4 -41 -103.4 -39 -105 C-38 -116 -36.8 -128 -33.4 -140 Z')), d: (f) => both(P(f, 'M-44 -151 C-47.6 -141 -47.6 -126 -43.4 -113.6 C-41.6 -117 -39.6 -119.6 -37.4 -121 C-36.4 -118 -34.6 -116 -32.4 -114.6 C-31.6 -124 -30.8 -133 -29.4 -141 Z')), deco: (s) => both(strands(s, 'M-40 -134 C-40.6 -129 -40.2 -125 -39.2 -121')) },
    hime: { name: '公主切', d: (f) => both(P(f, 'M-44 -151 C-47 -142 -46.8 -118 -46.2 -102.6 L-30.8 -102.6 C-30.8 -118 -30.2 -132 -29.4 -141 Z')), deco: (s) => both(strands(s, 'M-41.6 -134 V-105 M-36 -134 V-105', 0.34)) },
    wisps: { name: '觸角', ear: true, d: (f) => both(P(f, 'M-36.8 -134 C-37.4 -122 -36.2 -110 -33.8 -98 C-32.8 -103.6 -31.8 -110 -31 -116 C-30.6 -124 -30.6 -130 -31 -136 Z') + P(f, 'M-31.8 -138 C-31.6 -130 -31 -121 -29.2 -110.6 C-28.4 -115 -27.8 -120 -27.4 -125 C-27.2 -131 -27.6 -136 -28.8 -140 Z')), deco: () => '' },
    flip: { name: '外翹', d: (f) => both(P(f, 'M-44 -151 C-47.8 -140 -47.4 -116 -44.6 -103.4 C-47.4 -101.4 -50.6 -100.6 -53.6 -101.4 C-50 -96.4 -43 -95 -38 -97.4 C-35.6 -98.8 -34 -101.6 -33.4 -104.6 C-32.4 -116 -31.4 -130 -29.4 -141 Z')), deco: (s) => both(strands(s, 'M-40.4 -134 C-41 -125 -40.6 -114 -39.4 -105')) },
    curls: { name: '捲曲', d: (f) => both(P(f, 'M-44 -151 C-47.4 -144 -47.6 -133 -44.6 -125 C-41 -127 -37 -127.6 -33 -127 C-31.6 -132 -30.6 -137 -29.4 -141 Z') + curl(f, -39.6, -120, 6.2, -1) + curl(f, -41, -108, 6, 1) + curl(f, -39.4, -97, 5.6, -1)), deco: (s) => both(swirl(s, [[-39.6, -120, 6.2], [-41, -108, 6], [-39.4, -97, 5.6]])) },
    braid: { name: '辮子', d: (f) => both(P(f, 'M-44 -151 C-47.6 -142 -47 -126 -42.4 -116.6 C-40 -119 -37 -120 -33.4 -119.6 C-32.2 -127 -31.2 -134 -29.4 -141 Z') + plait(f, -38, -114, 4) + P(f, 'M-40.4 -87 C-41.2 -83 -40.4 -79.6 -38.2 -76.6 C-35.8 -79.6 -34.8 -83 -35.6 -87 Z')), t: () => both(tie(-38, -88, 2.4)), deco: (s) => both(plaitLines(s, -38, -114, 4)) },
    longlayer: { name: '長層次', d: (f) => both(P(f, 'M-44 -151 C-48.6 -138 -49.6 -100 -45.6 -70 C-43.8 -75 -41.8 -80 -39.6 -83.6 C-38.4 -80 -36.8 -77.4 -34.8 -76 C-34 -94 -33 -112 -32 -124 Z') + P(f, 'M-44 -151 C-47.6 -141 -47.8 -124 -43.6 -110.6 C-41.6 -114 -39.6 -116.6 -37.4 -118 C-36.4 -115 -34.8 -113 -32.6 -111.6 C-31.6 -122 -30.8 -132 -29.4 -141 Z')), deco: (s) => both(strands(s, 'M-43.6 -110.6 C-41.6 -114 -39.6 -116.6 -37.4 -118 C-36.4 -115 -34.8 -113 -32.6 -111.6', 0.5) + strands(s, 'M-41 -106 C-41.6 -99 -41.2 -92 -40 -87')) },
    tucked: { name: '耳後', ear: true, b: (k) => both(P(k, 'M-46.4 -140 C-48.6 -122 -47.4 -104 -43.6 -94 C-42 -97 -40.4 -99.4 -38.4 -100.6 C-37.6 -110 -36.6 -124 -34 -140 Z')), d: () => '', deco: () => '' },
    above: { name: '耳上短', ear: true, d: () => '', deco: () => '' },
    sideburn: { name: '鬢角', ear: true, d: (f) => both(P(f, 'M-36.8 -136 C-37.4 -126 -36.2 -116 -33.4 -106.6 C-32.4 -111 -31.4 -116 -30.6 -121 C-30.4 -127 -30.6 -133 -31 -138 Z')), deco: () => '' },
    undercut: { name: '推高', ear: true, out: SLIM, earRear: (skin) => both(`<path ${skin} d="M-31.4 -124.6 C-36.4 -125.4 -38.6 -119 -37.4 -114 C-36.6 -110.8 -34 -110 -31.8 -111.2 Z"/>`), d: (f) => `<g opacity=".38">${both(P(f, 'M-34.4 -152 C-36 -142 -35.4 -130 -32.4 -119 C-31 -121 -29.6 -122 -28.4 -122.4 C-29 -132 -29.4 -142 -28.6 -151 Z'))}</g>`, deco: () => '' }
  };
  // the ear (only with the sides that leave it showing): small and round, at the side of the face by the eyes
  const EAR = (skin) => both(`<path ${skin} d="M-31.4 -124.6 C-35.8 -126.4 -39.4 -122.6 -39 -117 C-38.6 -112 -35.6 -108.8 -31.6 -110.2 Z"/><path d="M-33 -121.4 C-35.8 -121.2 -36.4 -116.6 -34.6 -113.4" fill="none" stroke="#c98a6e" stroke-opacity=".6" stroke-width="1.2" stroke-linecap="round"/>`);
  const EAR_REAR = (skin) => both(`<path ${skin} d="M-40.4 -124.6 C-45.4 -125.4 -47.6 -119 -46.4 -114 C-45.6 -110.8 -43 -110 -40.8 -111.2 Z"/>`);
  // ===== 後面 back: behind the head facing us (the left half, k), and all of it from behind (r, f; rd: its strands), its hem in
  // sharp tips
  const hemTips = (y, x0, x1, n, dy = 6) => { const w = (x1 - x0) / n, ns = [], ts = []; for (let i = 0; i <= n; i++) ns.push([r(x1 - w * i), i === 0 || i === n ? y - 3 : y - dy]); for (let i = 0; i < n; i++) ts.push([r(x1 - w * i - w * 0.55), r(y + (i % 2 ? -1 : 1))]); return locks(ns, ts, 0.1, 0.16); };
  const rear = (f, y, x = 46, n = 6) => P(f, `M-${r(x - 2)} -136 C-${r(x - 2)} -162 -22 -174.4 2 -174.4 C26 -174.4 ${r(x + 2)} -162 ${r(x + 2)} -136 C${r(x + 2.6)} -120 ${r(x + 2.4)} ${r(y + 18)} ${r(x + 0.4)} ${r(y - 3)}${hemTips(y, -(x - 3.6), x + 0.4, n)} C-${r(x - 1.6)} ${r(y + 18)} -${r(x - 1.4)} -120 -${r(x - 2)} -136 Z`);
  const BACKS = {
    short: { name: '短', b: (k) => both(P(k, 'M2 -174.4 C-30 -174.4 -46.4 -156 -46.4 -138 C-46.4 -128 -44 -120 -39 -116 L2 -116 Z')), r: (f) => rear(f, -101, 45, 6), rd: (s) => strands(s, 'M-20 -150 C-22 -132 -20 -116 -18 -106 M2 -156 V-106 M24 -150 C26 -132 24 -116 22 -106') },
    // 清爽 (test, 2026-11-09, the user's ask: 短 still read long for a man): a plain short cut, narrowing down the back of the
    // head to a short, finely tipped hem at the nape
    crop: { name: '清爽', b: (k) => both(P(k, 'M2 -174.4 C-30 -174.4 -45.6 -157 -45.6 -141 C-45.6 -133 -44 -127 -40.4 -123 L2 -123 Z')), r: (f) => P(f, `M-44 -136 C-44 -162 -22 -174.4 2 -174.4 C26 -174.4 48 -162 48 -136 C48.4 -124 45 -115 35 -108.6${hemTips(-105, -31, 35, 6, 3.4)} C-41 -115 -44.4 -124 -44 -136 Z`),
      rd: (s) => strands(s, 'M-18 -152 C-20 -138 -18 -124 -15 -112 M2 -158 V-110 M22 -152 C24 -138 22 -124 19 -112') },
    bob: { name: '鮑伯', b: (k) => both(P(k, 'M2 -174.4 C-30 -174.4 -49 -150 -49 -126 C-49 -110 -48.4 -98 -45.6 -91.4 C-43.6 -94 -41.6 -95.4 -39.6 -96 C-38.4 -93 -36.4 -91.4 -34 -90.6 L2 -90.6 Z')), r: (f) => rear(f, -91, 47.4, 7), rd: (s) => strands(s, 'M-22 -150 C-25 -130 -23 -110 -21 -97 M2 -156 V-96 M26 -150 C29 -130 27 -110 25 -97') },
    shoulder: { name: '及肩', b: (k) => both(P(k, 'M2 -174.4 C-30 -174.4 -49.6 -150 -49.6 -124 C-49.6 -104 -51 -90 -50 -79.6 C-47.8 -83 -45.4 -85 -43 -85.6 C-41.6 -82 -39 -79.6 -36 -78.6 L2 -78.6 Z')), r: (f) => rear(f, -79, 48.4, 7), rd: (s) => strands(s, 'M-24 -150 C-27 -126 -25 -102 -23 -86 M2 -156 V-85 M28 -150 C31 -126 29 -102 27 -86') },
    long: { name: '長直', b: (k) => both(P(k, 'M2 -174.4 C-30 -174.4 -50 -150 -50 -122 C-50 -96 -51.4 -72 -50.4 -55.6 C-48.4 -59.6 -46 -62 -43.4 -62.8 C-42 -58.6 -39.4 -56 -36 -54.8 L2 -54.8 Z')), r: (f) => rear(f, -56, 49, 8), rd: (s) => strands(s, 'M-26 -150 C-29 -120 -28 -88 -26 -64 M2 -156 V-62 M30 -150 C33 -120 32 -88 30 -64') + shine('M-30 -118 C-31 -100 -30.4 -84 -29 -72 C-28.2 -84 -28.4 -100 -27.6 -118 Z', 0.18) },
    wavy: { name: '長捲', b: (k) => both(P(k, 'M2 -174.4 C-30 -174.4 -50 -150 -50 -128 C-54 -116 -46 -106 -51 -94 C-55.6 -82 -47.4 -72 -50.4 -61 C-51 -58 -50.4 -55.4 -48.6 -53.6 C-46 -57.6 -42.4 -60 -39.4 -60.4 C-37.6 -57 -35 -55 -32 -54.6 L2 -54.6 Z')),
      r: (f) => P(f, `M-44 -136 C-44 -162 -20 -174.4 2 -174.4 C24 -174.4 48 -162 48 -136 C52 -124 46 -116 50 -104 C54 -92 46 -84 48 -74 C49 -66 46 -62 41 -60${hemTips(-57, -36, 41, 7)} C-42 -60 -45 -66 -44 -74 C-42 -84 -50 -92 -46 -104 C-42 -116 -48 -124 -44 -136 Z`), rd: (s) => strands(s, 'M-24 -128 C-30 -116 -20 -104 -26 -92 C-30 -82 -24 -74 -26 -66 M2 -132 C-4 -118 8 -106 2 -94 C-2 -84 4 -76 2 -64 M28 -128 C34 -116 24 -104 30 -92 C34 -82 28 -74 30 -66') },
    curly: { name: '蓬捲', b: (k) => both(P(k, 'M2 -176 C-30 -176 -48 -152 -48 -124 C-48 -106 -40 -92 -28 -88 L2 -88 Z') + [[-46, -146, 8, -1], [-51, -130, 8.4, 1], [-52, -114, 8.4, -1], [-49, -99, 8, 1], [-40, -90, 7.6, -1]].map(([x, y, rr, s]) => curl(k, x, y, rr, s)).join('')),
      r: (f) => P(f, 'M-46 -136 C-46 -164 -22 -176 2 -176 C26 -176 50 -164 50 -136 C52 -116 46 -96 2 -90 C-42 -96 -48 -116 -46 -136 Z') + [[-44, -150, 8, -1], [-50, -132, 8.4, 1], [-50, -114, 8.4, -1], [-42, -100, 8, 1], [-26, -94, 8, -1], [-10, -92, 8, 1], [6, -92, 8, -1], [22, -93, 8, 1], [38, -98, 8, -1], [50, -112, 8.4, 1], [54, -130, 8.4, -1], [48, -148, 8, 1]].map(([x, y, rr, q]) => curl(f, x, y, rr, q)).join(''),
      rd: (s) => swirl(s, [[-24, -150, 7], [6, -156, 7], [30, -146, 7], [-14, -122, 7], [18, -120, 7], [-42, -100, 7], [-10, -92, 7], [22, -93, 7], [50, -112, 7]]) },
    undercut: { name: '推高', b: (k) => both(P(k, 'M2 -177 C-22 -177 -38 -166 -39.6 -152 L2 -152 Z')),
      r: (f) => P(f, 'M-37.6 -146 C-39 -166 -20 -177 2 -177 C24 -177 43 -166 41.6 -146 C30 -139 -26 -139 -37.6 -146 Z') + `<g opacity=".24">${P(f, 'M-33.6 -144 C-24 -138.6 28 -138.6 37.6 -144 C38.4 -126 35.4 -110 26 -101.4 C14 -97 -10 -97 -22 -101.4 C-31.4 -110 -34.4 -126 -33.6 -144 Z')}</g>`,
      rd: (s) => strands(s, 'M-18 -172 C-21 -162 -22 -152 -20 -143 M2 -177 V-141 M22 -172 C25 -162 26 -152 24 -143') }
  };
  // ===== 造型 on top or hanging from it, part of the hair's one shape facing us (f) and from behind (r); t, rt: the ties over it;
  // d, rd: its strands. under: tucked under a hat (it sits on top of the head)
  const TIE = '#d0574b';
  const tie = (x, y, rr = 3.2) => `<circle cx="${x}" cy="${y}" r="${rr}" fill="${TIE}"/>`;
  const band = (d) => `<path d="${d}" fill="none" stroke="${TIE}" stroke-width="2.6" stroke-linecap="round"/>`;
  const bun = (f, x, y, rr) => `<circle cx="${x}" cy="${y}" r="${rr}" ${f}/>`;
  // a tail from a rounded root at (x0, y0) hanging to a sharp end (tx, ty), w wide at its root, bowing out by o
  const tail = (f, x0, y0, tx, ty, w, o = 0) => P(f, `M${r(x0 - w / 2)} ${y0} C${r(x0 - w / 2 + o - w * 0.3)} ${r(y0 + (ty - y0) * 0.35)} ${r(tx - w * 0.5 + o * 0.6)} ${r(ty - (ty - y0) * 0.3)} ${tx} ${ty} C${r(tx + w * 0.42 + o * 0.6)} ${r(ty - (ty - y0) * 0.34)} ${r(x0 + w / 2 + o + w * 0.2)} ${r(y0 + (ty - y0) * 0.35)} ${r(x0 + w / 2)} ${y0} Q${x0} ${r(y0 - w * 0.62)} ${r(x0 - w / 2)} ${y0} Z`);
  // a plait: n crossed strands, each a lobe pointing down and to one side in turn, from (x, y0) down, drifting dx a strand;
  // plaitLines: their edges again over the one shape, so the plait still reads
  const lobe = (x, y0, i, dx) => { const cx = x + dx * i, y = y0 + i * 6.4, o = i % 2 ? 1 : -1; return `M${r(cx - 5 * o)} ${r(y - 3.6)} C${r(cx - 5.8 * o)} ${r(y + 1)} ${r(cx - 2 * o)} ${r(y + 4.6)} ${r(cx + 3.4 * o)} ${r(y + 5.6)} C${r(cx + 5.6 * o)} ${r(y + 2)} ${r(cx + 4 * o)} ${r(y - 2.6)} ${r(cx - 5 * o)} ${r(y - 3.6)} Z`; };
  const tailLine = (s, ...a) => strands(s, tail('d=""', ...a).match(/ d="([^"]+)"/)[1], 0.8);
  const plait = (f, x, y0, n, dx = 0) => Array.from({ length: n }, (_, i) => P(f, lobe(x, y0, i, dx))).join('');
  const plaitLines = (s, x, y0, n, dx = 0) => strands(s, Array.from({ length: n }, (_, i) => lobe(x, y0, i, dx)).join(' '), 0.75);
  const N = () => '';
  const T = (name, o) => Object.assign({ name, f: N, t: N, d: N, r: N, rt: N, rd: N }, o);
  const TOPS = {
    none: T('無', {}),
    ahoge: T('呆毛', { under: true, f: (f) => P(f, 'M-1.4 -173 C-4.6 -186 4.4 -196.6 16.6 -193.4 C8 -190.6 3.6 -184 4.4 -173.4 Z'), r: (f) => P(f, 'M-1.4 -173 C-4.6 -186 4.4 -196.6 16.6 -193.4 C8 -190.6 3.6 -184 4.4 -173.4 Z') }),
    bun: T('丸子', { under: true, f: (f) => bun(f, 2, -183, 12.4), t: () => band('M-8.4 -172.4 Q2 -168.8 12.4 -172.4'), d: (s) => swirl(s, [[2, -184, 12]]), r: (f) => bun(f, 2, -181, 12.4), rt: () => band('M-9 -170 Q2 -166.4 13 -170'), rd: (s) => swirl(s, [[2, -182, 12]]) }),
    twinbuns: T('雙丸子', { under: true, f: (f) => both(bun(f, -26, -168, 10.4)), t: () => both(tie(-20.6, -161.6, 2.6)), d: (s) => both(swirl(s, [[-26, -169, 10]])), r: (f) => both(bun(f, -26, -168, 10.4)), rt: () => both(tie(-20.6, -161.6, 2.6)) }),
    lowbuns: T('低丸子', { f: (f) => both(bun(f, -40, -104, 8.4)), t: () => both(tie(-35, -107, 2.4)), d: (s) => both(swirl(s, [[-40, -104, 8]])), r: (f) => both(bun(f, -34, -102, 8.4)), rt: () => both(tie(-29, -105, 2.4)) }),
    ponytail: T('高馬尾', { f: (f) => tail(f, 28, -170, 52, -96, 17, 16), t: () => tie(27, -170.6, 3.6), d: (s) => strands(s, 'M36 -160 C46 -148 50 -128 50 -104'), r: (f) => tail(f, 2, -168, 2.6, -92, 16, 0), rt: () => tie(2, -167, 4), rd: (s) => tailLine(s, 2, -168, 2.6, -92, 16, 0) + strands(s, 'M0 -156 C-2 -134 -1 -114 1 -100') }),
    sidetail: T('側馬尾', { f: (f) => tail(f, 46, -158, 58, -104, 14, 9), t: () => tie(45.4, -158, 3.6), r: (f) => tail(f, -42, -158, -54, -104, 14, -9), rt: () => tie(-41.4, -158, 3.6) }),
    sidelow: T('低側馬尾', { f: (f) => tail(f, -36, -108, -28, -72, 15, -8), t: () => tie(-35.4, -106, 3.4), d: (s) => strands(s, 'M-38 -100 C-40 -92 -38 -82 -31 -76'), r: (f) => tail(f, 22, -106, 32, -80, 14, 6), rt: () => tie(21, -104, 3.4) }),
    twintails: T('雙馬尾', { f: (f) => both(tail(f, -41, -157, -54, -86, 15, -10)), t: () => both(tie(-40, -157, 3.6)), d: (s) => both(strands(s, 'M-46 -148 C-52 -134 -53 -114 -52 -96')), r: (f) => both(tail(f, -41, -157, -54, -86, 15, -10)), rt: () => both(tie(-40, -157, 3.6)) }),
    lowtails: T('低雙馬尾', { f: (f) => both(P(f, 'M-40 -110 C-49 -106 -54 -96 -53.4 -84.6 C-50.6 -88 -48.4 -89.4 -46.4 -89.6 C-46 -86 -44.6 -83.6 -42.4 -82 C-41.4 -86 -39.6 -88.6 -37.6 -89.6 C-36.4 -86.6 -34.6 -84.6 -32.4 -83.6 C-32 -94 -34 -104 -34.4 -110 Z')), t: () => both(tie(-37.4, -109, 3.2)),
      r: (f) => both(P(f, 'M-32 -108 C-42 -104 -48 -94 -47.6 -84.6 C-45 -88 -42.6 -89.4 -40.6 -89.6 C-40 -86 -38.6 -83.6 -36.4 -82 C-35.4 -86 -33.6 -88.6 -31.6 -89.6 C-30.4 -86.6 -28.6 -84.6 -26.4 -83.6 C-26 -94 -26 -104 -26.4 -108 Z')), rt: () => both(tie(-29.4, -107, 3.2)) }),
    braids: T('雙辮子', { f: (f) => both(plait(f, -37, -102, 5) + P(f, 'M-39.4 -70 C-40.2 -66 -39.4 -62.6 -37.2 -59.6 C-34.8 -62.6 -33.8 -66 -34.6 -70 Z')), t: () => both(tie(-37, -71.4, 2.6)), d: (s) => both(plaitLines(s, -37, -102, 5)), r: (f) => both(plait(f, -22, -104, 3, -3.4)), rt: () => both(tie(-30, -86, 2.6)), rd: (s) => both(plaitLines(s, -22, -104, 3, -3.4)) }),
    sidebraid: T('側辮', { f: (f) => plait(f, -35, -104, 6, 1) + P(f, 'M-32.4 -67 C-33.2 -63 -32.4 -59.6 -30.2 -56.6 C-27.8 -59.6 -26.8 -63 -27.6 -67 Z'), t: () => tie(-30, -68.6, 2.8), d: (s) => plaitLines(s, -35, -104, 6, 1), r: (f) => plait(f, 24, -104, 3, 3.4), rt: () => tie(32, -86, 2.6), rd: (s) => plaitLines(s, 24, -104, 3, 3.4) }),
    lowtail: T('低馬尾', { r: (f) => tail(f, 2, -104, 2.4, -58, 13, 0), rt: () => tie(2, -104, 4), rd: (s) => tailLine(s, 2, -104, 2.4, -58, 13, 0) + strands(s, 'M1 -96 C0 -84 1 -72 2 -64') })
  };
  // a look's hair, layer by layer (hat: what sits on top of the head is tucked under it). back, front, rear: the shapes of a layer,
  // drawn plain (f, k) — HERO.svg draws each twice, the outline under the fills; over, rearOver: the ties on top
  function assemble(lk, hat) {
    const fr = FRINGE[lk.fringe] || FRINGE.round, sd = SIDES[lk.sides] || SIDES.short, bk = BACKS[lk.hairBack] || BACKS.short, tp0 = TOPS[lk.hairTop] || TOPS.none, tp = hat && tp0.under ? TOPS.none : tp0;
    return {
      ear: (skin) => (sd.ear ? EAR(skin) : ''),
      back: (f, k) => (sd.b ? sd.b(k || f) : '') + bk.b(k || f),
      front: (f, k) => sd.d(f) + fr.b(k || f) + fr.u(f) + crown(f, fr.e, sd.out) + fr.x(f) + tp.f(f),
      over: () => (sd.t ? sd.t() : '') + tp.t(),
      deco: (s, w) => fr.deco(s, w || s) + sd.deco(s) + tp.d(s) + RING,
      rear: (f) => bk.r(f) + tp.r(f),
      rearOver: (s, skin) => tp.rt() + bk.rd(s) + tp.rd(s) + (sd.ear && skin ? (sd.earRear || EAR_REAR)(skin) : '') + RING
    };
  }
  // the user's sheet of 48 hairstyles (in its order) as parts: [name, 瀏海, 兩側, 後面, 造型]; 隨機 rolls one of them, so its parts
  // go together (the 整套 row that offered them was dropped before 1.2.1)
  const STYLES = [
    ['短髮', 'round', 'above', 'short', 'none'], ['刺蝟頭', 'spiky', 'above', 'short', 'none'], ['中分', 'center', 'chin', 'bob', 'none'], ['旁分呆毛', 'sidepart', 'above', 'short', 'ahoge'],
    ['齊瀏海長髮', 'blunt', 'tucked', 'long', 'none'], ['斜瀏海長髮', 'swept', 'long', 'long', 'none'], ['呆毛長髮', 'fluffy', 'long', 'long', 'ahoge'], ['觸角長髮', 'swept', 'wisps', 'long', 'none'],
    ['短鮑伯', 'round', 'incurl', 'bob', 'none'], ['空氣鮑伯', 'airy', 'chin', 'bob', 'none'], ['香菇頭', 'blunt', 'incurl', 'bob', 'ahoge'], ['大斜鮑伯', 'longswept', 'flip', 'bob', 'none'],
    ['蓬鬆中長', 'fluffy', 'wave', 'shoulder', 'none'], ['斜瀏海波浪', 'swept', 'wave', 'wavy', 'none'], ['齊瀏海波浪', 'blunt', 'wave', 'wavy', 'none'], ['M字波浪', 'mshape', 'wave', 'wavy', 'none'],
    ['斜分及肩', 'longswept', 'tucked', 'shoulder', 'none'], ['露額長髮', 'none', 'tucked', 'long', 'none'], ['妹妹頭', 'shortblunt', 'incurl', 'bob', 'none'], ['捲鮑伯', 'swept', 'wave', 'bob', 'none'],
    ['旁分大波浪', 'sidepart', 'wave', 'wavy', 'none'], ['空氣長直', 'airy', 'long', 'long', 'none'], ['長捲髮', 'fluffy', 'curls', 'wavy', 'none'], ['爆炸頭', 'fluffy', 'curls', 'curly', 'none'],
    ['丸子頭', 'none', 'above', 'short', 'bun'], ['雙丸子', 'blunt', 'above', 'short', 'twinbuns'], ['丸子長髮', 'shortblunt', 'tucked', 'long', 'twinbuns'], ['露額鮑伯', 'none', 'tucked', 'bob', 'none'],
    ['側馬尾', 'airy', 'chin', 'short', 'sidetail'], ['低側馬尾', 'sidepart', 'tucked', 'short', 'sidelow'], ['低丸子', 'round', 'above', 'short', 'lowbuns'], ['高馬尾', 'airy', 'wisps', 'short', 'ponytail'],
    ['旁分丸子', 'longswept', 'tucked', 'short', 'bun'], ['八字低丸子', 'curtain', 'tucked', 'short', 'lowbuns'], ['斜瀏海丸子', 'swept', 'above', 'short', 'bun'], ['八字丸子', 'curtain', 'wisps', 'short', 'bun'],
    ['雙馬尾', 'blunt', 'above', 'short', 'twintails'], ['小雙丸子', 'shortblunt', 'above', 'short', 'twinbuns'], ['低雙馬尾', 'blunt', 'chin', 'short', 'lowtails'], ['斜瀏海低雙馬尾', 'swept', 'chin', 'short', 'lowtails'],
    ['中分觸角', 'center', 'wisps', 'long', 'none'], ['公主切', 'blunt', 'hime', 'long', 'none'], ['空氣丸子', 'airy', 'wisps', 'short', 'bun'], ['斜瀏海丸子長髮', 'swept', 'long', 'long', 'bun'],
    ['雙辮子', 'blunt', 'tucked', 'short', 'braids'], ['側辮', 'swept', 'tucked', 'short', 'sidebraid'], ['旁分雙辮', 'sidepart', 'chin', 'short', 'braids'], ['圓瀏海', 'incurl', 'incurl', 'shoulder', 'none']
  ];
  return { FRINGE, SIDES, BACKS, TOPS, STYLES, assemble };
  })();
  [['fringe', HAIRP.FRINGE], ['sides', HAIRP.SIDES], ['hairBack', HAIRP.BACKS], ['hairTop', HAIRP.TOPS]].forEach(([k, m]) => { OPTS[k] = Object.entries(m).map(([v, p]) => [v, p.name]); });
  // ===== the body (test, 2026-11-09): Q版 after the user's pick — a big head on a small body: an A-line top, short arms held a
  // little off it, stubby legs, round shoes; flat colours, no outline. The head (face, hair, what is worn on it) is drawn as before in
  // its own units and set on the body HS times bigger (HEAD): HX, HY put a point of the head's units in the body's. Body space:
  // centre x = 2, shoulders y -66, the top's hem -30, hips -28, feet 0.
  const HS = 1.1, HX = (x) => q(2 + (x - 2) * HS), HY = (y) => q(-63 + (y + 93.6) * HS);
  const HEAD = `translate(2 -63) scale(${HS}) translate(-2 93.6)`;
  const CHEEK = 'translate(2 5.8) scale(1.18 1) translate(-2 0)';   // the cheeks lower and further out, under the outer corners of the eyes (the user's pick)
  // tops (F: the light, c: the hero's top colour, d: a shade of it): the torso from the front and from behind (over: drawn over a
  // body wear, the hood), the collar round the neck (over the arms, under the chin), the sleeves (long, short, wide, robe; cuff; paws)
  const TORSO = 'M-13 -66 Q2 -67.6 17 -66 L26 -30 Q2 -25 -22 -30 Z', HEM = 'M-22 -30 Q2 -25 26 -30 L25.2 -34 Q2 -29 -21.2 -34 Z';
  const ROBE = 'M-13 -66 Q2 -67.6 17 -66 L30 -5 Q2 0 -26 -5 Z';   // a long robe's body, from the shoulders to the ankles
  const BELLY = '<ellipse cx="2" cy="-45" rx="10" ry="12" fill="#fbf6ee" fill-opacity=".92"/>';
  const TOPS = {
    hoodie: { sleeve: 'long',
      front: (F, c, d) => `<path ${F(c, 1.2)} d="${TORSO}"/><path ${F(d, 0.8)} d="${HEM}"/><path ${F(d, 1)} d="M-10 -47 H14 L12 -38 H-8 Z"/><path d="M-1.4 -62 V-53 M5.4 -62 V-53" stroke="#e8ecff" stroke-width="1.3" stroke-linecap="round"/>`,
      collar: (F, c, d) => `<path ${F(d, 1.6)} d="M-13 -67 Q2 -57 17 -67 L15 -70 Q2 -61 -11 -70 Z"/>`,
      back: (F, c, d) => `<path ${F(c, 1.2)} d="${TORSO}"/><path ${F(d, 0.8)} d="${HEM}"/>`, over: (F, c, d) => `<path ${F(d, 1.5)} d="M-12 -67 Q2 -46 16 -67 Q2 -61 -12 -67 Z"/>` },
    tee: { sleeve: 'short',
      front: (F, c, d) => `<path ${F(c, 1.2)} d="${TORSO}"/><path ${F(d, 0.8)} d="${HEM}"/><path d="M-6 -66.4 Q2 -59 10 -66.4" fill="none" stroke="${d}" stroke-width="2"/>`,
      back: (F, c, d) => `<path ${F(c, 1.2)} d="${TORSO}"/><path ${F(d, 0.8)} d="${HEM}"/><path d="M-5 -66.6 Q2 -64 9 -66.6" fill="none" stroke="${d}" stroke-width="1.8"/>` },
    sweater: { sleeve: 'long', cuff: true,
      front: (F, c, d) => `<path ${F(c, 1.2)} d="${TORSO}"/><path d="M-21.6 -31 Q2 -26 25.6 -31" fill="none" stroke="${d}" stroke-width="3.4" stroke-linecap="round"/><path d="M-4 -61 l2.2 3 l-2.2 3 l2.2 3 l-2.2 3 l2.2 3 l-2.2 3 l2.2 3 l-2.2 3 M8 -61 l2.2 3 l-2.2 3 l2.2 3 l-2.2 3 l2.2 3 l-2.2 3 l2.2 3 l-2.2 3" fill="none" stroke="${d}" stroke-opacity=".6" stroke-width="1"/>`,
      collar: (F, c, d) => `<path ${F(d, 1.6)} d="M-9 -68 Q2 -64.6 13 -68 L13.6 -63 Q2 -59.4 -9.6 -63 Z"/>`,
      back: (F, c, d) => `<path ${F(c, 1.2)} d="${TORSO}"/><path d="M-21.6 -31 Q2 -26 25.6 -31" fill="none" stroke="${d}" stroke-width="3.4" stroke-linecap="round"/>` },
    shirt: { sleeve: 'long', cuff: true, light: true,
      front: (F, c, d) => `<path ${F(c, 1.2)} d="${TORSO}"/><path d="M2 -62 V-28" stroke="${d}" stroke-opacity=".6" stroke-width=".9"/>${[-56, -48, -40].map((y) => `<circle cx="3.6" cy="${y}" r="1" fill="${lt(c, 0.65)}"/>`).join('')}<path d="M-10 -55 h6 v6 h-6 Z" fill="none" stroke="${d}" stroke-opacity=".5" stroke-width=".9"/>`,
      collar: (F, c) => `<path ${F(lt(c, 0.55), 1.6)} d="M-9 -67.4 L-1 -59 L2 -65 Z M13 -67.4 L5 -59 L2 -65 Z"/>`,
      back: (F, c, d) => `<path ${F(c, 1.2)} d="${TORSO}"/><path d="M-13 -58 Q2 -55.6 17 -58" fill="none" stroke="${d}" stroke-opacity=".45" stroke-width="1"/>` },
    jinbei: { sleeve: 'wide',
      front: (F, c, d) => `<path ${F(c, 1.2)} d="M-13 -66 Q2 -67.6 17 -66 L22 -28 H-18 Z"/><path ${F(d, 1.3)} d="M15 -66 L-1 -42 L3 -41 L18 -63 Z"/><path d="M-6 -66 L2 -52 M-14 -42 l5 1.6 M-14 -40 l4 4" fill="none" stroke="${d}" stroke-width="1.2"/>${[[-8, -56], [-4, -46], [12, -50], [15, -38], [-12, -34]].map(([x, y]) => `<path d="M${x - 1.6} ${y} h3.2 M${x} ${y - 1.6} v3.2" stroke="${lt(c, 0.5)}" stroke-opacity=".7" stroke-width=".9"/>`).join('')}`,
      collar: (F, c, d) => `<path ${F(d, 1.6)} d="M-7 -67 L2 -58 L11 -67 L8.4 -67 L2 -61 L-4.4 -67 Z"/>`,
      back: (F, c, d) => `<path ${F(c, 1.2)} d="M-13 -66 Q2 -67.6 17 -66 L22 -28 H-18 Z"/><path d="M2 -66 V-28" stroke="${d}" stroke-opacity=".4" stroke-width="1"/>` },
    cattop: { sleeve: 'long', paw: true,   // fur in the top's colour, a white belly, a red collar and a bell
      front: (F, c) => `<path ${F(c, 1.2)} d="M-14 -66 Q2 -67.6 18 -66 L27 -29 Q2 -23 -23 -29 Z"/>${BELLY}`,
      collar: () => '<path fill="#d0453c" d="M-12 -67 Q2 -61 16 -67 L15.6 -63.6 Q2 -57.6 -11.6 -63.6 Z"/><circle cx="2" cy="-59.4" r="2.6" fill="#e6c25a"/><path d="M.6 -59 h2.8" stroke="#9a7a2a" stroke-width=".7"/>',
      back: (F, c, d) => `<path ${F(c, 1.2)} d="M-14 -66 Q2 -67.6 18 -66 L27 -29 Q2 -23 -23 -29 Z"/><path d="M-8 -58 q10 3.5 20 0 M-10 -49 q12 3.5 24 0 M-12 -40 q14 3.5 28 0" fill="none" stroke="${d}" stroke-width="1.8" stroke-linecap="round"/>`,
      over: () => '<path fill="#d0453c" d="M-11 -67 Q2 -63 15 -67 L14.6 -64 Q2 -60 -10.6 -64 Z"/>' },
    wizrobe: { sleeve: 'robe',   // 魔法師長袍 (Halloween): to the ankles, gold stars and hem, a belt with a little spell book at the hip
      front: (F, c, d) => `<path ${F(c, 1.2)} d="${ROBE}"/><path d="M-26 -5 Q2 0 30 -5" fill="none" stroke="#e6c25a" stroke-width="2"/>${[[-6, -56, 1.8], [10, -58, 1.4], [8, -48, 1.6], [-4, -44, 1.4], [-12, -24, 2], [4, -16, 1.7], [20, -12, 1.5], [-18, -12, 1.5], [-4, -8, 1.3]].map((a) => star(...a)).join('')}
        <path ${F(d, 1.3)} d="M-19 -40 Q2 -36 23 -40 V-35.6 Q2 -31.6 -19 -35.6 Z"/><rect x="0" y="-40.4" width="4.4" height="5.4" rx="1" fill="#e6c25a"/>
        <g transform="rotate(-8 19 -28)"><rect x="14" y="-34" width="10" height="12" rx="1.2" fill="#6b3f2a"/><rect x="15" y="-33" width="8" height="10" rx=".8" fill="none" stroke="#e6c25a" stroke-width=".7"/>${star(19, -28, 2.4)}</g>`,
      collar: (F, c, d) => `<path ${F(d, 1.6)} d="M-8 -67 L2 -59 L12 -67 L10.6 -63.6 L2 -56 L-6.6 -63.6 Z"/><circle cx="2" cy="-57.6" r="1.8" fill="#e6c25a"/>`,
      back: (F, c) => `<path ${F(c, 1.2)} d="${ROBE}"/><path d="M-26 -5 Q2 0 30 -5" fill="none" stroke="#e6c25a" stroke-width="2"/>${star(8, -40, 6)}<path d="M-6 -60 a7 7 0 1 0 6.4 10 a5.6 5.6 0 1 1 -6.4 -10 Z" fill="#e6c25a"/>` },
    yukata: { sleeve: 'robe',   // 浴衣 (test, 2026-11-09: the town's 緣日; not sold, the festival's people wear it): to the ankles, a crossed collar, a wide light obi, little flowers
      front: (F, c, d) => `<path ${F(c, 1.2)} d="${ROBE}"/><path d="M-9 -66 L12 -40" fill="none" stroke="${d}" stroke-width="1.4"/>${[[-6, -58], [12, -52], [-12, -24], [10, -16], [18, -30], [-2, -12]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2.8" fill="${lt(c, 0.75)}"/><circle cx="${x}" cy="${y}" r="1" fill="${d}"/>`).join('')}
        <path ${F(lt(c, 0.7), 1.3)} d="M-18 -43 Q2 -39 22 -43 V-34 Q2 -30 -18 -34 Z"/><path d="M-18 -38.6 Q2 -34.6 22 -38.6" fill="none" stroke="${d}" stroke-opacity=".5" stroke-width=".9"/>`,
      collar: (F, c) => `<path ${F(lt(c, 0.85), 1.6)} d="M-8 -67 L5 -53 L12 -67 L9 -67 L5 -59 L-5 -67 Z"/>`,
      back: (F, c) => `<path ${F(c, 1.2)} d="${ROBE}"/><path ${F(lt(c, 0.7), 1.3)} d="M-18 -43 Q2 -39 22 -43 V-34 Q2 -30 -18 -34 Z"/><path ${F(lt(c, 0.7), 1.3)} d="M-7 -46 L2 -39 L11 -46 L11 -30 L2 -36 L-7 -30 Z"/>` },
    // the town's work clothes (test, 2026-11-10, the user: who they are at a glance) — ROLE_STYLES, worn by the town's people only
    hakui: { sleeve: 'kimono',   // 巫女の白衣: white, a crossed collar edged in red, wide sleeves; tucked into the 緋袴
      front: (F, c, d) => `<path ${F(c, 1.2)} d="M-13 -66 Q2 -67.6 17 -66 L22 -34 Q2 -30 -18 -34 Z"/><path d="M-8 -66 L9 -40 M12 -66 L3 -52" fill="none" stroke="${d}" stroke-opacity=".55" stroke-width="1"/>`,
      collar: (F, c) => `<path ${F('#c8323a', 1.6)} d="M-9.4 -67 L4 -50.4 L13.4 -67 L11.6 -67 L4 -54.6 L-7.4 -67 Z"/><path ${F(lt(c, 0.5), 1.65)} d="M-7.4 -67 L4 -54.6 L11.6 -67 L9.4 -67 L4 -58.4 L-5 -67 Z"/>`,
      back: (F, c, d) => `<path ${F(c, 1.2)} d="M-13 -66 Q2 -67.6 17 -66 L22 -34 Q2 -30 -18 -34 Z"/><path d="M2 -66 V-34" stroke="${d}" stroke-opacity=".35" stroke-width="1"/>` },
    samue: { sleeve: 'long', cuff: true,   // 作務衣 (居酒屋の大将): a crossed collar in a darker band, a tie at the side
      front: (F, c, d) => `<path ${F(c, 1.2)} d="${TORSO}"/><path ${F(d, 0.8)} d="${HEM}"/><path ${F(dk(c, 0.7), 1.3)} d="M-9 -66 L11 -38 L15 -39.4 L-5 -66 Z"/><path d="M13 -66 L3 -53" fill="none" stroke="${dk(c, 0.7)}" stroke-width="1.6"/><path d="M14 -40 l5 3 M14 -40 l3 6" fill="none" stroke="${dk(c, 0.6)}" stroke-width="1.2" stroke-linecap="round"/>`,
      collar: (F, c) => `<path ${F(dk(c, 0.7), 1.6)} d="M-7 -67 L2 -58 L11 -67 L8.4 -67 L2 -61 L-4.4 -67 Z"/>`,
      back: (F, c, d) => `<path ${F(c, 1.2)} d="${TORSO}"/><path ${F(d, 0.8)} d="${HEM}"/><path d="M2 -66 V-29" stroke="${d}" stroke-opacity=".4" stroke-width="1"/>` },
    kappogi: { sleeve: 'long', cuff: true, light: true,   // 割烹着 (食堂のおかみ): a white smock past the hips, a round neck, two pockets
      front: (F, c, d) => `<path ${F(c, 1.2)} d="M-13 -66 Q2 -67.6 17 -66 L27 -22 Q2 -17 -23 -22 Z"/><path d="M-23 -22 Q2 -17 27 -22" fill="none" stroke="${d}" stroke-width="1.6"/><path ${F(lt(c, 0.4), 1.25)} d="M-17 -38 h11 v8 q-5.5 2 -11 0 Z M10 -38 h11 v8 q-5.5 2 -11 0 Z"/>`,
      collar: (F, c, d) => `<path ${F(lt(c, 0.6), 1.6)} d="M-9 -67.6 Q2 -58 13 -67.6 L12 -65 Q2 -56 -8 -65 Z"/><path d="M-8 -65 Q2 -56 12 -65" fill="none" stroke="${d}" stroke-opacity=".5" stroke-width=".8"/>`,
      back: (F, c, d) => `<path ${F(c, 1.2)} d="M-13 -66 Q2 -67.6 17 -66 L27 -22 Q2 -17 -23 -22 Z"/><path d="M-2 -40 l-6 -3 v6 Z M6 -40 l6 -3 v6 Z" fill="${d}"/>` },
    chef: { sleeve: 'long', cuff: true, light: true,   // 調理白衣 (食堂の料理人): white, a standing collar, buttoned down the side
      front: (F, c, d) => `<path ${F(c, 1.2)} d="${TORSO}"/><path d="M9 -64 V-27" stroke="${d}" stroke-width="1"/>${[-58, -50, -42, -34].map((y) => `<circle cx="12" cy="${y}" r="1.2" fill="${d}"/>`).join('')}`,
      collar: (F, c, d) => `<path ${F(lt(c, 0.5), 1.6)} d="M-9 -68.4 Q2 -65 13 -68.4 L13 -63.6 Q2 -60.2 -9 -63.6 Z"/><path d="M-9 -63.6 Q2 -60.2 13 -63.6" fill="none" stroke="${d}" stroke-width=".8"/>`,
      back: (F, c, d) => `<path ${F(c, 1.2)} d="${TORSO}"/><path d="M2 -64 V-28" stroke="${d}" stroke-opacity=".35" stroke-width="1"/>` },
    jacket: { sleeve: 'long', cuff: true,   // 制服・スーツ (駅員, 巡査, 会社員): lapels over a white shirt, buttons down the front
      front: (F, c, d) => `<path ${F(c, 1.2)} d="${TORSO}"/><path fill="#f4f1ea" d="M-5 -66.6 L2 -50 L9 -66.6 Z"/><path ${F(dk(c, 0.78), 1.25)} d="M-9 -66 L2 -49 L-0.6 -41 L-12.6 -61 Z M13 -66 L2 -49 L4.6 -41 L16.6 -61 Z"/>${[-44, -36].map((y) => `<circle cx="4.4" cy="${y}" r="1.4" fill="#c9a24a"/>`).join('')}<path d="M-14 -40 h7 M11 -40 h7" stroke="${d}" stroke-width="1.2"/>`,
      collar: () => '<path fill="#fbf8f0" d="M-5 -67.2 L-0.6 -61 L2 -64.6 Z M9 -67.2 L4.6 -61 L2 -64.6 Z"/>',
      back: (F, c, d) => `<path ${F(c, 1.2)} d="${TORSO}"/><path d="M2 -60 V-28" stroke="${d}" stroke-opacity=".5" stroke-width="1"/>` },
    happi: { sleeve: 'wide',   // 法被 (屋台, ガイド): open at the front, a dark collar band down it with 祭, a belt, white stripes at the hem; 祭 on the back
      front: (F, c, d) => `<path ${F(c, 1.2)} d="M-13 -66 Q2 -67.6 17 -66 L23 -28 H-19 Z"/><path d="M-19 -31 H23 M-19 -33.4 H23" stroke="#fff" stroke-opacity=".75" stroke-width="1"/><path fill="${dk(c, 0.42)}" d="M-7 -67 L-2 -28 H2.4 L-2.6 -61 Z M11 -67 L6.4 -28 H2 L6.6 -61 Z"/><text x="-1.6" y="-44" font-size="5.6" font-weight="700" fill="#fff" text-anchor="middle" font-family="'Hiragino Mincho ProN', 'Noto Serif JP', serif">祭</text><rect x="-17" y="-40" width="38" height="3.6" rx="1" fill="${dk(c, 0.5)}"/>`,
      back: (F, c, d) => `<path ${F(c, 1.2)} d="M-13 -66 Q2 -67.6 17 -66 L23 -28 H-19 Z"/><path d="M-19 -31 H23 M-19 -33.4 H23" stroke="#fff" stroke-opacity=".75" stroke-width="1"/><circle cx="2" cy="-50" r="8.6" fill="none" stroke="#fff" stroke-width="1.5"/><text x="2" y="-46.6" font-size="10" font-weight="700" fill="#fff" text-anchor="middle" font-family="'Hiragino Mincho ProN', 'Noto Serif JP', serif">祭</text>` },
    vest: { sleeve: 'long', cuff: true, light: true, sleeveColor: '#f4f1ea',   // ベスト (喫茶店のマスター): over a white shirt, its sleeves white
      front: (F, c, d) => `<path ${F('#f4f1ea', 1.2)} d="${TORSO}"/><path ${F(c, 1.22)} d="M-13 -66 L-3 -50 L-1 -29.6 Q-11 -29 -22 -30 Z M17 -66 L7 -50 L5 -29.6 Q15 -29 26 -30 Z"/>${[-46, -40, -34].map((y) => `<circle cx="5.6" cy="${y}" r="1.1" fill="${lt(c, 0.5)}"/>`).join('')}`,
      collar: () => '<path fill="#fbf8f0" d="M-9 -67.4 L-1 -59 L2 -65 Z M13 -67.4 L5 -59 L2 -65 Z"/>',
      back: (F, c) => `<path ${F(c, 1.2)} d="${TORSO}"/>` }
  };
  // an arm (s: -1 the left, 1 the right) hangs from the shoulder a little off the body; drawn hanging straight down from (0, 0) and
  // turned out, so a pose turns it round the shoulder (the .arm group, in CSS)
  const SHOULDER = [13.5, -63.5];
  function arm(L, tp, top, topDk, skin, cls, s, dx = 0) {
    const hand = tp.paw ? `<circle cy="27" r="4.8" ${L(top, 0.9)}/><circle cy="28.4" r="1.6" fill="#f2a8b8"/>` : `<circle cy="27" r="4.3" ${L(skin, 0.9)}/>`;
    const bare = `<rect x="-3.2" y="2" width="6.4" height="23" rx="3.2" ${L(skin, 1.2)}/>`;
    const sc = tp.sleeveColor || top, cuff = tp.cuff ? (tp.light ? lt(sc, 0.55) : dk(topDk, 0.85)) : topDk;
    const art = tp.sleeve === 'kimono' ? `<path class="kosode" ${L(sc, 1.3)} d="M-4.6 -2 Q0 -5 4.6 -2 L9.4 23 Q0 25.6 -9.4 23 Z"/><path d="M-9.4 23 Q0 25.6 9.4 23" fill="none" stroke="${dk(sc, 0.8)}" stroke-width="1"/>`
      : tp.sleeve === 'robe' ? `<path ${L(topDk, 1.3)} d="M-4.6 -2 Q0 -5 4.6 -2 L8.6 22 Q0 24 -8.6 22 Z"/><path d="M-8.6 22 Q0 24 8.6 22" fill="none" stroke="#e6c25a" stroke-width="1.4"/>`
      : tp.sleeve === 'short' ? bare + `<path ${L(top, 1.4)} d="M-4.6 -2 Q0 -5 4.6 -2 L5 9 Q0 10.6 -5 9 Z"/>`
      : tp.sleeve === 'wide' ? bare + `<path ${L(topDk, 1.3)} d="M-4.6 -2 Q0 -5 4.6 -2 L7.4 15 Q0 16.6 -7.4 15 Z"/>`
      : `<path ${L(sc, 1.3)} d="M-4 -2 Q0 -4.5 4 -2 L4.4 21 Q0 22.6 -4.4 21 Z"/><path ${L(cuff, 1)} d="M-4.4 18.4 Q0 20 4.4 18.4 L4.5 21.6 Q0 23.2 -4.5 21.6 Z"/>`;
    return `<g class="arm ${cls}"><g transform="translate(${q(2 + s * SHOULDER[0] + dx)} ${SHOULDER[1]}) rotate(${-s * 26})">${art}${hand}</g></g>`;
  }
  // bottoms (c: the trousers' colour): a leg round x, the hips over both legs, the foot, and what goes with them — a skirt over
  // both legs, a tail behind; the shoe is everyone's but the cat's paws
  // shoes (test, 2026-11-09), each round x in its colour c: a sneaker on a white sole (a darker one under a light shoe), a short boot
  // over the trouser's hem, a low leather shoe with a shine
  const light = (c) => [1, 3, 5].reduce((a, i) => a + parseInt(c.slice(i, i + 2), 16), 0) > 560;
  const SHOES = {
    sneaker: (F, c, x) => `<path ${F(c, 0.1)} d="M${q(x - 6.5)} -9 h13 v4.6 q0 4.4 -4.2 4.4 h-5 q-3.8 0 -3.8 -4.4 Z"/><path ${F(light(c) ? dk(c, 0.8) : '#f4f1ea', 0.05)} d="M${q(x - 6.5)} -3.4 h13 q-.2 3.4 -4.2 3.4 h-5 q-3.6 0 -3.8 -3.4 Z"/><path d="M${q(x - 2.6)} -7 h5.2" stroke="${light(c) ? dk(c, 0.75) : lt(c, 0.45)}" stroke-width="1" stroke-linecap="round"/>`,
    boots: (F, c, x) => `<path ${F(c, 0.15)} d="M${q(x - 6)} -15 h12 v10.6 q0 4.4 -4.2 4.4 h-4.6 q-3.2 0 -3.2 -4.4 Z"/><path ${F(dk(c, 0.82), 0.3)} d="M${q(x - 6.4)} -16 h12.8 v3 h-12.8 Z"/><path d="M${q(x - 6)} -2 h12" stroke="#000" stroke-opacity=".18" stroke-width="1.4"/>`,
    loafer: (F, c, x) => `<path ${F(c, 0.1)} d="M${q(x - 6.5)} -7 h13 v2.6 q0 4.4 -4.2 4.4 h-5 q-3.8 0 -3.8 -4.4 Z"/><path d="M${q(x - 3)} -5.6 h6" stroke="${dk(c, 0.7)}" stroke-width="1.1" stroke-linecap="round"/><ellipse cx="${q(x + 2.6)}" cy="-3.4" rx="2" ry=".9" fill="#fff" fill-opacity=".35"/>`
  };
  SHOES.zori = (F, c, x) => `<path ${F('#f6f3ec', 0.1)} d="M${q(x - 5.6)} -10 h11.2 v5.6 q0 3.6 -4 3.6 h-3.6 q-3.6 0 -3.6 -3.6 Z"/><rect x="${q(x - 7)}" y="-2.2" width="14" height="2.6" rx="1.2" ${F(c, 0.05)}/><path d="M${x} -5.4 l-3.4 3.2 M${x} -5.4 l3.4 3.2" stroke="#8a2f2a" stroke-width="1.1" stroke-linecap="round"/>`;   // 草履: white tabi on a sandal (c)
  const HIPS = (F, c) => `<path ${F(c, 0.7)} d="M-17 -33 H21 L21.6 -22 H-17.6 Z"/>`;
  const BOTTOMS = {
    pants: { hips: HIPS, leg: (F, c, x) => `<rect x="${q(x - 5.5)}" y="-28" width="11" height="23" rx="4" ${F(c, 0.4)}/>` },
    shorts: { hips: HIPS, leg: (F, c, x, skin) => `<rect x="${q(x - 4.8)}" y="-24" width="9.6" height="19" rx="4" ${F(skin, 0.3)}/><rect x="${q(x - 6)}" y="-28" width="12" height="10" rx="3" ${F(c, 0.5)}/>` },
    wide: { hips: HIPS, leg: (F, c, x) => `<path ${F(c, 0.4)} d="M${q(x - 6)} -28 H${q(x + 6)} L${q(x + 7.6)} -5 Q${x} -3.6 ${q(x - 7.6)} -5 Z"/>` },
    skirt: { leg: (F, c, x, skin) => `<rect x="${q(x - 4.8)}" y="-24" width="9.6" height="19" rx="4" ${F(skin, 0.3)}/>`,
      over: (F, c, d) => `<path ${F(c, 0.7)} d="M-16 -36 H20 L26 -16 Q2 -12 -22 -16 Z"/><path d="M-8 -34 L-11 -15 M2 -34 V-13.4 M12 -34 L15 -15" stroke="${d}" stroke-opacity=".35" stroke-width="1"/>` },
    hakama: { leg: () => '',   // 緋袴 (the miko): wide and pleated over both legs to the ankles, tied in front; only the 草履 show
      over: (F, c, d) => `<path class="hakama" ${F(c, 0.7)} d="M-17 -38 Q2 -40 21 -38 L27 -6 Q2 -2 -23 -6 Z"/><path d="M-6 -36 L-10 -6 M2 -37 V-3.6 M10 -36 L14 -6" fill="none" stroke="${d}" stroke-opacity=".55" stroke-width="1"/><path d="M-16.6 -36 Q2 -33 20.6 -36" fill="none" stroke="${d}" stroke-width="2"/><path ${F(c, 0.72)} d="M2 -34.4 l-6.4 -3 v6 Z M2 -34.4 l6.4 -3 v6 Z"/><path d="M2 -34.4 l-3 7 M2 -34.4 l3 7" stroke="${c}" stroke-width="1.6" stroke-linecap="round"/>` },
    catpants: { hips: HIPS, leg: (F, c, x) => `<rect x="${q(x - 5.5)}" y="-28" width="11" height="22" rx="4" ${F(c, 0.4)}/>`,
      foot: (F, c, x, d) => `<ellipse cx="${x}" cy="-4.4" rx="7" ry="4.4" ${F(c, 0.1)}/><path d="M${q(x - 2.8)} -5.6 v2.4 M${x} -6 v2.4 M${q(x + 2.8)} -5.6 v2.4" stroke="${d}" stroke-width=".9" stroke-linecap="round"/>`,
      tail: (F, c, d, side) => (side ? `<path d="M2 -30 C2 -14 22 -16 25 -32 C26 -40 22 -46 18 -44" fill="none" stroke="${c}" stroke-width="5.4" stroke-linecap="round"/><path d="M20 -45.4 C19.4 -45.6 18.4 -44.8 18 -44" stroke="${d}" stroke-width="5.4" stroke-linecap="round"/>`
        : `<path d="M18 -31 C32 -32 38 -46 33 -58" fill="none" stroke="${c}" stroke-width="5.4" stroke-linecap="round"/><path d="M34 -56.4 C33.8 -57.4 33.4 -58 33 -58" stroke="${d}" stroke-width="5.4" stroke-linecap="round"/>`) }
  };
  // a head worn whole (猫の頭): it takes the place of the hero's own head, hair and face, in the fur of their top
  const CAT_EYES = '<g class="eyes"><ellipse cx="-11" cy="-126" rx="5.4" ry="7" fill="#2a2730"/><ellipse cx="15" cy="-126" rx="5.4" ry="7" fill="#2a2730"/><circle cx="-9.4" cy="-128.6" r="1.9" fill="#fff"/><circle cx="16.6" cy="-128.6" r="1.9" fill="#fff"/></g>';
  const FULL = {
    cathead: (F, c, d) => {
      const ear = (s) => `<path ${F(c, 4.3)} d="M${2 - 32 * s} -146 L${2 - 32 * s} -177 L${2 - 10 * s} -161 Z"/>`, pink = (s) => `<path fill="#f2a8b8" d="M${2 - 28 * s} -152 L${2 - 28 * s} -170 L${2 - 15 * s} -160.5 Z"/>`;
      const headPath = 'M-34 -128 C-36 -151 -21 -168 2 -168 C25 -168 40 -151 38 -128 C38 -108 24 -94 2 -94 C-20 -94 -34 -108 -34 -128 Z';
      const stripes = `<path d="M-5 -166 l2 8 M2 -168 v9 M9 -166 l-2 8" fill="none" stroke="${d}" stroke-width="2.4" stroke-linecap="round"/>`;
      return [ear(1) + ear(-1) + pink(1) + pink(-1) + `<path ${F(c, 4)} d="${headPath}"/>${stripes}<ellipse cx="2" cy="-110" rx="15" ry="10" fill="#fbf6ee"/>${CAT_EYES}
        <path d="M-1 -115.5 h6 l-3 3.6 Z" fill="#e8869a"/><path d="M2 -112 v2.2 M-3 -107.2 Q-.5 -104.6 2 -107.4 Q4.5 -104.6 7 -107.2" fill="none" stroke="#5a3a3a" stroke-width="1.3" stroke-linecap="round"/>
        <path d="M-12 -110 L-31 -113 M-12 -107 L-31 -105.5 M16 -110 L35 -113 M16 -107 L35 -105.5" stroke="#5a4a4a" stroke-opacity=".45" stroke-width="1"/><ellipse cx="-20" cy="-113" rx="4.4" ry="2.6" fill="#f2a0a0" fill-opacity=".55"/><ellipse cx="24" cy="-113" rx="4.4" ry="2.6" fill="#f2a0a0" fill-opacity=".55"/>`,
        ear(1) + ear(-1) + `<path ${F(c, 4)} d="${headPath}"/><path d="M-14 -160 q16 6 32 0 M-18 -146 q20 6 40 0 M-16 -132 q18 6 36 0" fill="none" stroke="${d}" stroke-width="2.4" stroke-linecap="round"/>`];
    }
  };
  // what is worn on the head comes in three kinds, and none of them ever cuts the hair:
  // - on top (貓耳髮箍, 必勝頭巾; 眼鏡 on the face): drawn over any hair as it is, front and back
  // - a hat (HATS): drawn big enough to cover the crown, so the fringe, the sides, the back and any tail stay as they are; what sits
  //   on top of the head (呆毛, 丸子, 雙丸子) is tucked under it while it is on (1.2.1: hats no longer swap the whole hairstyle)
  // - a whole head (FULL): takes the place of the head, hair and face; nothing is worn on the face
  const HATS = new Set(['beanie', 'strawhat', 'beret', 'gradcap', 'cathood', 'witchhat', 'sankakukin', 'chefcap', 'bakerhat', 'cap']);
  const HEAD_TOP = { witchhat: -232, bakerhat: -214 };   // how high a thing on the head reaches, where it stands above a hat's usual -196 (head units)
  const ON_BODY = new Set(['scarf', 'bowtie', 'backpack']);   // drawn in the body's units, not on the head
  const tucked = (lk, id) => (HATS.has(id) && HAIRP.TOPS[lk.hairTop].under ? HAIRP.TOPS[lk.hairTop].name : '');   // what a hat tucks away
  // the things worn: [front, back] drawings by part, in the figure's own units; c and d are their top's colour and a shade of it
  const WEAR = {
    witchhat: (L, c, d) => {   // 魔法師帽 (Halloween): a wide brim, a tall crown bent over at the tip, a gold band, a star and a moon
      const h = `<ellipse cx="2" cy="-150" rx="58" ry="11.5" ${L(d, 4.2)}/><path ${L(c, 4.4)} d="M-36 -152 C-30 -180 -14 -206 4 -222 C10 -228 20 -230 28 -222 C18 -220 13 -212 14 -200 C17 -184 32 -168 40 -152 Q2 -144 -36 -152 Z"/>
        <path d="M-36 -152 Q2 -144 40 -152 L39 -160 Q2 -152 -35 -160 Z" fill="#e6c25a"/>${star(-2, -180, 5.6)}<path d="M15 -197 a6 6 0 1 0 4 10 a4.6 4.6 0 1 1 -4 -10 Z" fill="#e6c25a"/>`;
      return [h, h];
    },
    cathood: (L, c, d) => {   // 貓耳兜帽: a hood up round the face, a fluffy edge, ears on top; with 貓咪上衣 and 貓咪褲 a whole cat suit
      const ears = both(`<path ${L(c, 4.4)} d="M-36 -164 L-30 -200 L-8 -183 Z"/>`), outer = 'M-48 -98 C-54 -128 -46 -166 -22 -180 C-10 -186 14 -186 26 -180 C50 -166 58 -128 52 -98';
      return [ears + both('<path fill="#f2a8b8" d="M-30.4 -171 L-27.6 -192 L-14 -182.6 Z"/>') + `<path ${L(c, 4.3)} d="${outer} L40 -98 C43 -124 34 -158 2 -162 C-30 -158 -39 -124 -36 -98 Z"/>
        <path ${L('#fbf6ee', 4.35)} d="M42.8 -98 C46 -126 36.6 -161 2 -165 C-32.6 -161 -42 -126 -38.8 -98 L-33.2 -98 C-36 -122 -27.4 -155 2 -159 C31.4 -155 40 -122 37.2 -98 Z"/>`,
        ears + `<path ${L(c, 4.3)} d="${outer} Q2 -88 -48 -98 Z"/><path d="M2 -184 V-100" stroke="${d}" stroke-width="1.4" stroke-opacity=".6"/>`];
    },
    beanie: (L) => {   // pulled down over the crown to the fringe, a turned-up rib cuff, a pompom
      const ribs = [-38, -28, -18, -8, 2, 12, 22, 32, 42].map((x) => { const u = (x - 2) / 48.5, w = 3 * (1 - u * u); return `M${x} ${q(-147.4 - w)} V${q(-138.6 + w)}`; }).join(' ');
      const cap = `<path ${L('#d9534a', 4.2)} d="M-44 -141 C-46 -171 -23 -185 2 -185 C27 -185 50 -171 48 -141 Z"/>${both('<path d="M-24 -151 C-23 -164 -16 -175 -5 -182 M-9 -152 C-8 -165 -5 -175 -1 -183" fill="none" stroke="#fff" stroke-opacity=".16" stroke-width="2.2" stroke-linecap="round"/>')}
        <path ${L('#c2433b', 4.1)} d="M-46.5 -149 Q2 -155 50.5 -149 Q52.6 -143 50.5 -137 Q2 -131 -46.5 -137 Q-48.6 -143 -46.5 -149 Z"/><path d="${ribs}" stroke="#000" stroke-opacity=".12" stroke-width="1.6" stroke-linecap="round"/>
        <circle cx="2" cy="-187" r="8.6" ${L('#f4efe6', 4.4)}/>`;
      return [cap, cap];
    },
    strawhat: (L) => {   // a wide brim at the top of the fringe, a crown that holds the hair, a red band
      const h = `<ellipse cx="2" cy="-150" rx="60" ry="12.5" ${L('#e3c27a', 4.2)}/><ellipse cx="2" cy="-150" rx="60" ry="12.5" fill="none" stroke="#b9954f" stroke-width="1.2"/><ellipse cx="2" cy="-150" rx="49" ry="9" fill="none" stroke="#b9954f" stroke-opacity=".35" stroke-width="1"/>
        <path ${L('#d8b366', 4.3)} d="M-31 -153.4 C-33 -190 37 -190 35 -153.4 Q2 -146.4 -31 -153.4 Z"/><path d="M-31 -160 Q2 -153 35 -160 V-153.4 Q2 -146.4 -31 -153.4 Z" fill="#d0453c"/>`;
      return [h, h];
    },
    catears: (L) => { const e = (x, s) => `<path ${L('#3d3a44', 4.3)} d="M${x - 11 * s} -152 L${x - 2 * s} -176 L${x + 10 * s} -154 Z"/>`; const band = `<path d="M-30 -146 C-24 -168 28 -168 34 -146" fill="none" stroke="#3d3a44" stroke-width="4"/>`; return [band + e(-12, 1) + e(16, -1) + `<path d="M-17 -156 L-13 -169 L-8 -157 Z M21 -156 L17 -169 L12 -157 Z" fill="#f2a8b8"/>`, band + e(-12, 1) + e(16, -1)]; },
    hachimaki: (L) => { const band = `<path ${L('#f8f6f0', 4)} d="M-33 -142 Q2 -134 37 -142 V-132 Q2 -124 -33 -132 Z"/>`; return [band + `<circle cx="18" cy="-134" r="4.4" fill="#d0453c"/><text x="-12" y="-131.5" font-size="7.5" font-weight="700" fill="#d0453c" font-family="'Hiragino Mincho ProN', serif">必勝</text>`, band + `<path d="M2 -134 L-10 -112 L-2 -114 L4 -134 L14 -110 L20 -114 Z" ${L('#f2efe6', 3.8)}/>`]; },
    beret: (L) => {   // perched on the crown, tipped down to the left, with a stalk
      const b = `<g transform="translate(-1 -167) rotate(-8)"><ellipse rx="40" ry="12.5" ${L('#2f3b63', 4.3)}/><path d="M-35 5 Q0 15 35 5" fill="none" stroke="#24304f" stroke-width="3" stroke-linecap="round"/><path d="M-19 -7 Q-3 -12 15 -9" fill="none" stroke="#fff" stroke-opacity=".14" stroke-width="2.4" stroke-linecap="round"/><path d="M0 -12.4 q-.6 -4.6 2.6 -6.6" fill="none" stroke="#24304f" stroke-width="2.6" stroke-linecap="round"/></g>`;
      return [b, b];
    },
    gradcap: (L) => {   // a skull cap over the crown, the board on top, the tassel to the right
      const c = `<path ${L('#26262e', 4.3)} d="M-42 -146 Q2 -136 46 -146 L42 -166 Q2 -173 -38 -166 Z"/><path ${L('#1d1d24', 4.4)} d="M-52 -175 L2 -160 L56 -175 V-172 L2 -157 L-52 -172 Z"/><path ${L('#33333d', 4.5)} d="M2 -190 L56 -175 L2 -160 L-52 -175 Z"/>
        <circle cx="2" cy="-175" r="2.8" fill="#e6c25a"/><path d="M2 -175 L46 -170 V-150" fill="none" stroke="#e6c25a" stroke-width="1.8"/><path d="M43 -150 h6 l-1 9 h-4 Z" fill="#e6c25a"/>`;
      return [c, c];
    },
    glasses: () => [`<g fill="none" stroke="#3a3328" stroke-width="2"><circle cx="-10.5" cy="-117" r="8.6"/><circle cx="14.5" cy="-117" r="8.6"/><path d="M-1.9 -118 Q2 -120.6 5.9 -118 M-19.1 -118.6 L-33 -121.6 M23.1 -118.6 L37 -121.6"/></g><path d="M-15 -121.4 l4 -3 M10 -121.4 l4 -3" stroke="#fff" stroke-opacity=".7" stroke-width="1.4"/>`, `<path d="M-33 -122 L-26 -120 M37 -122 L30 -120" stroke="#3a3328" stroke-width="2"/>`],
    // the town's work (test, 2026-11-10): w is all that is worn, for a colour or a mark (w.cap, w.apron, w.mark, w.tie)
    nejiri: () => { const b = `<path class="nejiri" fill="#f6f3ec" d="M-34 -142 Q2 -134 38 -142 V-134.6 Q2 -126.6 -34 -134.6 Z"/><path d="${[-28, -19, -10, -1, 8, 17, 26].map((x) => `M${x} -140.4 l4 6.4`).join(' ')}" stroke="#3f4660" stroke-width="2" stroke-linecap="round"/>`;
      return [b + '<ellipse cx="34" cy="-138" rx="5.4" ry="4.4" fill="#f6f3ec"/><path d="M33 -139 l4 3 M38 -136 l9 5 M38 -139 l10 -2" stroke="#3f4660" stroke-width="1.8" stroke-linecap="round"/>', b]; },   // ねじり鉢巻: twisted, knotted at the side
    sankakukin: () => { const s = '<path fill="#f8f6f0" d="M-36 -134 C-37 -166 -14 -182 2 -182 C18 -182 41 -166 40 -134 Q2 -146 -36 -134 Z"/><path d="M-30 -146 Q2 -156 34 -146" fill="none" stroke="#d9d2c2" stroke-width="1.2"/>';
      return [s, s + '<path fill="#f8f6f0" d="M-8 -140 L2 -112 L12 -140 Z"/><circle cx="2" cy="-136" r="4" fill="#efe9dc"/>']; },   // 三角巾 over the hair, knotted at the back
    chefcap: () => { const c = '<path fill="#fbfaf6" d="M-31 -146 C-33 -178 37 -178 35 -146 Q2 -138 -31 -146 Z"/><path d="M-31 -151 Q2 -143 35 -151" fill="none" stroke="#dcd6c8" stroke-width="1.4"/>'; return [c, c]; },   // 和帽子
    bakerhat: () => { const h = '<path fill="#fbfaf6" d="M-28 -146 V-164 Q2 -170 32 -164 V-146 Q2 -140 -28 -146 Z"/><ellipse cx="-12" cy="-182" rx="20" ry="17" fill="#fbfaf6"/><ellipse cx="16" cy="-182" rx="20" ry="17" fill="#fbfaf6"/><ellipse cx="2" cy="-194" rx="22" ry="17" fill="#fbfaf6"/><path d="M-28 -164 Q2 -170 32 -164" fill="none" stroke="#dcd6c8" stroke-width="1.4"/>'; return [h, h]; },   // パン屋のコック帽
    cap: (L, c, d, w = {}) => {   // a peaked cap (制帽 with a gold badge; the delivery man's plain): w.cap its colour
      const k = w.cap || '#2b3350', h = `<path ${L(k, 4.3)} d="M-34 -147 C-36 -180 40 -180 38 -147 Q2 -139 -34 -147 Z"/><path ${L(dk(k, 0.7), 4.32)} d="M-34 -151 Q2 -143 38 -151 V-145 Q2 -137 -34 -145 Z"/>`;
      return [h + `<path fill="#1c1c22" d="M-28 -145 Q2 -128 32 -145 Q2 -136 -28 -145 Z"/>${w.badge === false ? '' : '<circle cx="2" cy="-160" r="4.4" fill="#d9b04a"/><path d="M-2 -160 h8" stroke="#a8862e" stroke-width="1"/>'}`, h]; },
    mikoribbon: () => ['', '<rect x="-7" y="-106" width="18" height="11" rx="2" fill="#f8f6f0"/><path d="M-7 -102 h18 M-7 -99 h18" stroke="#c8323a" stroke-width="1"/>'],   // 丈長: the long hair tied low behind
    apron: (L, c, d, w = {}) => {   // 前掛け: w.apron its colour, w.mark a name on it
      const k = w.apron || '#2f3b5a', m = w.mark ? `<text x="2" y="-18" text-anchor="middle" font-size="${w.mark.length > 2 ? 6.4 : 8}" font-weight="700" fill="#fff" fill-opacity=".92" font-family="'Hiragino Mincho ProN', 'Noto Serif JP', serif">${esc(w.mark)}</text>` : '';
      return [`<path class="apron" ${L(k, 1.3)} d="M-17 -38 H21 L23 -8 Q2 -5 -19 -8 Z"/><path d="M-18 -38 H22" stroke="${dk(k, 0.7)}" stroke-width="2.2"/>${m}`, `<path d="M-18 -38 H22" stroke="${k}" stroke-width="2.2"/><path d="M2 -38 l-6 -3.4 v6.8 Z M2 -38 l6 -3.4 v6.8 Z" fill="${k}"/>`]; },
    necktie: (L, c, d, w = {}) => [`<path fill="${w.tie || '#3f4660'}" d="M0.4 -63.4 h3.2 l1 2.4 -1.4 1.4 1.6 12 -2.8 3 -2.8 -3 1.6 -12 -1.4 -1.4 Z"/>`, ''],
    camera: () => ['<path d="M-9 -66 L-7 -50 M13 -66 L11 -50" stroke="#2b2b33" stroke-width="1.2"/><rect x="-7" y="-52" width="18" height="12" rx="2" fill="#2b2b33"/><rect x="-5" y="-55" width="6" height="3" rx="1" fill="#2b2b33"/><circle cx="2" cy="-46" r="4" fill="#5a606e" stroke="#a6acb8" stroke-width="1"/>', ''],   // the reporter's
    towel: () => { const t = '<path fill="#f8f6f0" d="M-12 -68.4 Q2 -62 16 -68.4 L17 -63 Q2 -56.6 -13 -63 Z"/>'; return [t + '<path fill="#f8f6f0" d="M-12 -64 L-13 -45 H-6 L-5.4 -62 Z M16 -64 L17 -45 H10 L9.4 -62 Z"/><path d="M-13 -48 h7 M10 -48 h7" stroke="#5a8ac8" stroke-width="1.4"/>', t]; },   // 銭湯の常連: a towel round the neck
    lanyard: (L, c, d, w = {}) => [`<path d="M-6 -66 L2 -53 L10 -66" fill="none" stroke="${w.strap || '#3f7ac8'}" stroke-width="1.4"/><rect x="-3" y="-54" width="10" height="13" rx="1.4" fill="#fbfaf6" stroke="#8a8f99" stroke-width=".8"/><rect x="-1.2" y="-51.6" width="6.4" height="3" fill="${w.strap || '#3f7ac8'}"/>`, ''],   // a name card (ガイド, 看護師)
    // on the body (test, 2026-11-09: the Q版 body), in the body's units
    scarf: (L) => { const w = `<path ${L('#d0453c', 1.6)} d="M-12 -68 Q2 -61 16 -68 L16.4 -62 Q2 -55 -12.4 -62 Z"/>`; return [w + `<path ${L('#b93a33', 1.4)} d="M7 -61 L13 -61.6 L14.6 -46 L8.6 -45 Z"/><path d="M9 -46 v3.4 M11.6 -46.4 v3.4 M14 -46.6 v3.4" stroke="#b93a33" stroke-width="1.2"/>`, w + `<path ${L('#b93a33', 1.4)} d="M-6 -61 L0 -61 L-1 -46 L-7 -46.6 Z"/>`]; },
    bowtie: () => [`<path d="M2 -61 L-5 -64.6 L-5 -57.4 Z M2 -61 L9 -64.6 L9 -57.4 Z" fill="#c8453d"/><circle cx="2" cy="-61" r="2" fill="#a63831"/>`, ''],
    backpack: (L) => [`<path ${L('#e6a23c', 1.3)} d="M-15 -62 Q-21 -52 -18 -36 H-13 V-62 Z"/><path d="M-6 -66 Q-9 -55 -8 -42 M10 -66 Q13 -55 12 -42" fill="none" stroke="#b8792a" stroke-width="2.6" stroke-linecap="round"/>`, `<rect x="-12" y="-64" width="28" height="30" rx="7" ${L('#e6a23c', 1.3)}/><rect x="-7" y="-50" width="18" height="13" rx="3.6" ${L('#d48f2c', 1.1)}/><path d="M-5 -45 H9" stroke="#b8792a" stroke-width="1.2"/><path d="M-8 -64 Q2 -69 12 -64" fill="none" stroke="#b8792a" stroke-width="2.2"/>`],
  };
  const day = (h) => `fill="${h}"`;
  const paint = (a) => (a.match(/fill[:=]"?([^";]+)/) || [])[1] || '#000';   // the colour a lit fill attribute paints
  let uid = 0;   // each drawing's own clip ids
  // the figure, both views: o.look, o.wear, o.L as above
  function svg(o = {}) {
    const lk = norm(o.look), L = o.L || day, wear = o.wear || {}, W = (slot, side) => { const id = wear[slot]; const f = id && WEAR[id]; return f ? f(L, lk.top, dk(lk.top, 0.84), wear)[side] || '' : ''; };
    const cat = lk.topStyle === 'cattop' && lk.bottomStyle === 'catpants' && (wear.head === 'cathood' || wear.head === 'cathead');   // the whole cat suit
    // the hair (test, 2026-11-09, after the user's pick of the flat Q版 look): flat colours lit as the room lights them, the back
    // hair darker, no outline; each part drawn with a thin stroke of its own colour, which softens the tips and joins
    const n = ++uid, hairOf = HAIRP.assemble(lk, HATS.has(wear.head)), hc = lk.hairColor, C = (h) => paint(L(h, 3));
    const flat = (h) => `style="fill:${C(h)};stroke:${C(h)};stroke-width:1.6px;stroke-linejoin:round"`;
    const hw = flat(hc), hs = `style="stroke:${C(dk(hc, 0.7))}"`, hair = (draw) => draw(hw, flat(dk(hc, 0.8)));
    const top = lk.top, topDk = dk(lk.top, 0.84), pants = lk.bottom, skin = lk.skin, tp = TOPS[lk.topStyle], bt = BOTTOMS[lk.bottomStyle], full = FULL[wear.head];
    const defs = `<defs><clipPath id="fc${n}" clipPathUnits="userSpaceOnUse"><path d="${FACE[lk.face]}"/></clipPath></defs>`;
    const pd = dk(pants, 0.78), leg = (cls, x) => `<g class="leg ${cls}">${bt.leg(L, pants, x, skin)}${bt.foot ? bt.foot(L, pants, x, pd) : (SHOES[lk.shoeStyle] || SHOES.sneaker)(L, lk.shoe, x)}</g>`;
    const legs = (t) => `<g class="legs">${bt.hips ? bt.hips(L, pants) : ''}${leg('l', -7 + t * 0.2)}${leg('r', 11 - t * 0.4)}</g>${bt.over ? bt.over(L, pants, pd) : ''}`;   // a skirt hangs over both legs, not with them
    const arms = (t) => arm(L, tp, top, topDk, skin, 'l', -1, t * 0.3) + arm(L, tp, top, topDk, skin, 'r', 1, -t * 0.5);
    const fd = dk(top, 0.74), whole = full && full(L, top, fd), collar = tp.collar ? tp.collar(L, top, topDk) : '';   // a whole head: the hero's own, hair and face things give way
    const onHead = (s) => `<g class="head"><g transform="${HEAD}">${s}</g></g>`;   // the head's things in the head's units, set on the body
    // a little turned (test, 2026-11-09: 微微側身), to the viewer's right — the other way is it mirrored (.flip): the head's layers
    // slide apart (the face's things most, the fringe less, the back hair the other way, so more of it shows behind), the far eye
    // comes nearer, the body narrows a little and the far arm and leg tuck in. t: how far, in the head's units (0: straight on)
    const by = (x, s) => (x ? `<g transform="translate(${q(x)} 0)">${s}</g>` : s);
    const narrow = (t, s) => (t ? `<g transform="translate(${q(2 + t * 0.15)} 0) scale(.94 1) translate(-2 0)">${s}</g>` : s);
    const face = (t) => {
      ex = t ? [EX[0], EX[1] - t * 0.5] : EX;
      const s = by(t * 0.3, `<path ${L(skin, 2.4)} d="${FACE[lk.face]}"/><g clip-path="url(#fc${n})">${BEARD[lk.beard](L(lk.hairColor, 2.2))}</g>`)
        + by(t, `<g transform="${CHEEK}">${CHEEKS[lk.cheeks]}</g>${MOUTH[lk.mouth](['#a9714d', '#76492f'].includes(skin) ? '#3a1d14' : LIP)}<g class="eyes">${EYES[lk.eyes](lk.eyeColor)}</g>${both(`<path d="${BROWS[lk.brows][0]}" fill="none" stroke="${dk(lk.hairColor, 0.8)}" stroke-width="${BROWS[lk.brows][1]}" stroke-linecap="round"/>`)}${W('face', 0)}`);
      ex = EX; return s;
    };
    const shade = (t) => by(t * 0.45, `<g opacity=".13" transform="translate(0 2.4)" clip-path="url(#fc${n})">${hairOf.front('fill="#3a2016"')}</g>`);   // the fringe's shadow on the forehead
    const front = (t) => `${onHead(whole ? '' : by(-t * 0.5, hair(hairOf.back)))}${bt.tail ? `<g class="tail t0">${bt.tail(L, pants, pd, 0)}</g>` : ''}${W('back', 0)}${legs(t)}${narrow(t, tp.front(L, top, topDk) + W('body', 0) + W('neck', 0))}${arms(t)}${narrow(t, collar)}
      ${onHead(whole ? by(t * 0.4, whole[0]) : `${face(t)}${shade(t)}${by(t * 0.3, hairOf.ear(L(skin, 2.4)))}${by(t * 0.45, hair(hairOf.front) + hairOf.over() + hairOf.deco(hs, hw) + W('head', 0))}`)}`;   // the arms under the head: a raised hand never covers the face (the user), it goes out to the side
    // from behind, turned the same way: the hair slides left over the head, so a sliver of cheek shows on the right
    const back = (t) => `${legs(-t)}${arms(-t)}${narrow(-t, tp.back(L, top, topDk) + W('body', 1) + (tp.over ? tp.over(L, top, topDk) : ''))}${bt.tail ? `<g class="tail t1">${bt.tail(L, pants, pd, 1)}</g>` : ''}${narrow(-t, W('neck', 1) + W('back', 1))}
      ${onHead(whole ? by(-t * 0.4, whole[1]) : `<ellipse cx="2" cy="-128" rx="34" ry="32" ${L(skin, 2.4)}/>${by(-t * 0.6, hair(hairOf.rear) + hairOf.rearOver(hs, L(skin, 2.4)) + W('face', 1) + W('head', 1))}`)}`;
    const T = 6;   // the turn
    const views = o.back ? `<g class="f-back" style="display:inline">${back(0)}</g>` : o.front ? `<g class="f-front">${front(0)}</g>`
      : `<g class="f-front">${front(0)}</g><g class="f-front3">${front(T)}</g><g class="f-back">${back(0)}</g><g class="f-back3">${back(T)}</g>`;
    return `<svg viewBox="${o.box || '-60 -200 120 210'}"${o.box ? ' style="overflow:hidden"' : ''}${cat ? ' data-set="cat"' : ''} aria-hidden="true">${defs}<ellipse class="h-shadow" rx="24" ry="7" fill="#2b1c12" fill-opacity=".2"/><g class="fig"><g class="bob">${views}</g></g></svg>`;   // front: the front view only; back: from behind only
  }
  // the head alone, in daylight, for the choices in the dressing room: 'head' frames the hair, 'face' the eyes, brows and mouth
  // a choice drawn on them: the face, the head, the head and shoulders (sides that reach them), from behind (the back, 造型). The
  // frames are the head's (in its units), set where the head now sits on the body
  const onBody = (b) => { const [x, y, w, h] = b.split(' ').map(Number); return [HX(x), HY(y), q(w * HS), q(h * HS)].join(' '); };
  const head = (look, crop) => (crop === 'back' ? svg({ look, back: true, box: onBody('-62 -200 128 132') }) : svg({ look, front: true, box: onBody(crop === 'face' ? '-27 -138 58 52' : crop === 'bust' ? '-62 -200 128 132' : '-58 -198 120 120') }));
  const isTop = (id) => TOPS[id] !== undefined;
  const clothes = (id, look) => (SHOES[id] ? svg({ look: Object.assign({}, look, { shoeStyle: id, bottomStyle: 'shorts' }), front: true, box: '-17 -19 38 23' })   // a shoe on bare legs
    : svg({ look: Object.assign({}, look, isTop(id) ? { topStyle: id } : { bottomStyle: id }), front: true, box: isTop(id) ? '-34 -76 72 56' : '-30 -40 64 44' }));
  // a thing worn, on its own (古道具屋, the wardrobe): drawn on a faint head and shoulders so it reads (what goes on the body, on a
  // faint body, the backpack from behind); a whole head on its own
  function thumb(id, look) {
    if (FULL[id]) { const lk = norm(look); return `<svg class="thumb" viewBox="-46 -186 96 100" aria-hidden="true">${FULL[id](day, lk.top, dk(lk.top, 0.74))[0]}</svg>`; }
    const f = WEAR[id]; if (!f) return '';
    const lk = norm(look), art = f(day, lk.top, dk(lk.top, 0.84));
    if (ON_BODY.has(id)) return `<svg class="thumb" viewBox="-34 -84 72 60" aria-hidden="true"><g class="base" opacity=".28"><path d="${TORSO}" fill="#c9bfae"/><ellipse cx="2" cy="-82" rx="24" ry="14" fill="#c9bfae"/></g><g>${art[id === 'backpack' ? 1 : 0]}</g></svg>`;
    const hat = HATS.has(id), t = Math.min(-203, (HEAD_TOP[id] || -196) - 7);   // a hat is drawn round a crown of hair: a bigger frame (taller for a tall hat), the faint head with its hair
    return `<svg class="thumb" viewBox="${hat ? `-68 ${t} 136 ${-45 - t}` : '-60 -185 120 140'}" aria-hidden="true"><g class="base" opacity=".28"><ellipse cx="2" cy="-128" rx="34" ry="32" fill="#c9bfae"/>${hat ? '<path d="M-44 -128 C-45 -160 -20 -172 2 -172 C24 -172 49 -160 48 -128 Q2 -150 -44 -128 Z" fill="#a3957d"/>' : ''}<path d="M-24 -88 Q-25 -98 -12 -99 H16 Q29 -98 28 -88 L30 -50 H-26 Z" fill="#c9bfae"/></g><g>${art[0]}</g></svg>`;
  }
  // idling (1.2.0): standing still they now and then look round, stretch, wave (facing us), sway or bounce — one at a time,
  // 6–12 s apart (the first after 4), never the same twice running; sitting they nod over the notebook. ok(): may they now?
  const IDLES = { look: 1800, stretch: 1600, wave: 1500, sway: 2200, bounce: 900, maneki: 1800 }, IDLE_CLS = ['nod', ...Object.keys(IDLES)].map((k) => 'idle-' + k);
  const PEOPLE = ['look', 'stretch', 'wave', 'sway', 'bounce'], CATS = ['look', 'stretch', 'maneki', 'sway'];   // in the cat suit: a 招き猫's paw for a wave
  const inCat = (el) => !!el.querySelector('svg[data-set="cat"]');
  const calm = () => window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  function idle(el, ok, first) {
    if (!el) return;
    clearTimeout(el._idle);
    if (calm()) return;
    el._idle = setTimeout(() => {
      if (!el.isConnected) return;
      if (!ok()) { idle(el, ok); return; }
      if (el.classList.contains('sleep')) { idle(el, ok); return; }   // asleep: no fidgeting
      const sit = el.matches('.sit, .sofa, .kneel'), names = sit ? ['nod'] : (inCat(el) ? CATS : PEOPLE).filter((k) => k !== el._idleLast && !((k === 'wave' || k === 'maneki') && el.classList.contains('back')));
      const k = names[Math.floor(Math.random() * names.length)]; el._idleLast = k;
      el.classList.add('idle-' + k);
      setTimeout(() => { el.classList.remove('idle-' + k); idle(el, ok); }, sit ? 1600 : IDLES[k]);
    }, first ? 4000 : 6000 + Math.random() * 6000);
  }
  const still = (el) => { if (el) el.classList.remove(...IDLE_CLS); };   // off on a walk: whatever they were doing stops
  // a tap on them: a hop, a wave, a spin or a cheer, in turn at random (sitting: a wave)
  const TAPS = { hop: 520, wave: 1200, spin: 700, cheer: 900 };
  function react(el) {
    if (calm()) return;
    if (el.classList.contains('sleep')) return;   // asleep
    const names = el.matches('.sit, .sofa, .kneel') ? ['wave'] : Object.keys(TAPS).filter((k) => k !== el._tapLast && !(k === 'wave' && el.classList.contains('back')));
    const k = names[Math.floor(Math.random() * names.length)]; el._tapLast = k;
    el.classList.remove(...Object.keys(TAPS)); still(el); void el.offsetWidth; el.classList.add(k);
    clearTimeout(el._tap); el._tap = setTimeout(() => el.classList.remove(k), TAPS[k]);
    if (k === 'spin') turnRound(el);
    if (inCat(el)) nya(el);
  }
  // spin (test, 2026-11-09): a turn right round through the views, a frame each — facing us, turned, from behind turned, from behind,
  // the other way back round — then as they were, unless they were sent walking meanwhile (their view is then the walk's)
  const ROUND = [[0, 1, 0], [1, 1, 0], [1, 0, 0], [1, 1, 1], [0, 1, 1]];   // back, turn, flip
  function turnRound(el) {
    const was = ['back', 'turn', 'flip'].map((c) => el.classList.contains(c)), set = (v) => ['back', 'turn', 'flip'].forEach((c, i) => el.classList.toggle(c, !!v[i]));
    let i = 0;
    clearInterval(el._round);
    el._round = setInterval(() => {
      const now = ['back', 'turn', 'flip'].map((c) => el.classList.contains(c)), last = i ? ROUND[i - 1].map(Boolean) : was;
      if (now.some((v, j) => v !== last[j])) { clearInterval(el._round); return; }   // something else turned them
      if (i === ROUND.length) { set(was); clearInterval(el._round); return; }
      set(ROUND[i++]);
    }, 115);
  }
  // the cat suit answers a tap with a にゃ over their head, a different one each time
  const NYA = ['にゃ', 'にゃーん', 'にゃ？', 'にゃっ'];
  function nya(el) {
    el.querySelectorAll('.nya').forEach((b) => b.remove());
    const b = document.createElement('i'); b.className = 'nya'; b.lang = 'ja';
    el._nya = ((el._nya || 0) + 1) % NYA.length; b.textContent = NYA[el._nya];
    el.appendChild(b); setTimeout(() => b.remove(), 1400);
  }
  return { svg, head, thumb, clothes, idle, still, react, norm, OPTS, LOOK0, STYLES: HAIRP.STYLES, slots: Object.keys(WEAR).concat(Object.keys(FULL)),
    tucked: (look, id) => tucked(norm(look), id), whole: (id) => !!FULL[id], headTop: (id) => HY(!id ? -184 : HEAD_TOP[id] || -196) };   // in the body's units
})();

// ---------- 古道具屋 (1.2.0): the old shop up the hill, kept by 福爺 the owl, who takes 言靈 and nothing else ----------
const onTestSite = () => /nihongo-quest-test|^localhost$|^127\.0\.0\.1$/.test(location.hostname);
// 福爺 says a line in Japanese with its meaning: when you come in, after a sale, when 言靈 is short, and whatever when tapped
const FUKU = {
  hello: [['いらっしゃい', '歡迎光臨'], ['ようこそ', '歡迎'], ['ゆっくり見ていってね', '慢慢看喔']],
  night: [['こんばんは', '晚安'], ['夜も勉強、えらいね', '晚上還在讀書，了不起']],
  thanks: [['まいどあり', '謝謝惠顧'], ['大事にしてね', '要好好珍惜喔']],
  short: [['言靈がまだ足りないね', '言靈還不夠喔'], ['もう少しがんばろう', '再加油一點']],
  idle: [['今日も一歩ずつ', '今天也一步一步來'], ['継続は力なり', '持續就是力量'], ['言葉には力があるよ', '話語裡住著力量喔'], ['ホー', '（貓頭鷹的叫聲）']]
};
let fukuTurn = 0;
function fukuLine(kind) { const list = FUKU[kind] || FUKU.idle, l = list[fukuTurn++ % list.length]; return `<b class="jp" lang="ja">${l[0]}</b><small>${l[1]}</small>`; }
function fukuSay(kind) { const b = document.querySelector('#view .fuku-say'); if (!b) return; b.innerHTML = fukuLine(kind); b.classList.remove('pop'); void b.offsetWidth; b.classList.add('pop'); }
function fukuSvg() {
  return `<svg viewBox="0 0 90 96" aria-hidden="true"><path d="M32 27 L27 9 L42 22 Z M58 27 L63 9 L48 22 Z" fill="#7d5536"/>
    <ellipse cx="45" cy="58" rx="31" ry="36" fill="#9a6b45"/><ellipse cx="22" cy="66" rx="9" ry="22" fill="#7d5536" transform="rotate(12 22 66)"/><ellipse cx="68" cy="66" rx="9" ry="22" fill="#7d5536" transform="rotate(-12 68 66)"/>
    <ellipse cx="45" cy="72" rx="19" ry="21" fill="#ecd7b0"/><path d="M37 66 l3 3 l3 -3 M47 66 l3 3 l3 -3 M42 75 l3 3 l3 -3 M36 82 l3 3 l3 -3 M48 82 l3 3 l3 -3" fill="none" stroke="#b98d5c" stroke-width="1.2"/>
    <circle cx="34" cy="44" r="12" fill="#f6ead2"/><circle cx="56" cy="44" r="12" fill="#f6ead2"/>
    <g class="eyes"><circle cx="34" cy="44" r="6" fill="#2a2730"/><circle cx="56" cy="44" r="6" fill="#2a2730"/><circle cx="36" cy="42" r="2" fill="#fff"/><circle cx="58" cy="42" r="2" fill="#fff"/></g>
    <circle cx="34" cy="44" r="12.5" fill="none" stroke="#c9a24c" stroke-width="2"/><circle cx="56" cy="44" r="12.5" fill="none" stroke="#c9a24c" stroke-width="2"/><path d="M42.5 43 Q45 41 47.5 43" fill="none" stroke="#c9a24c" stroke-width="2"/>
    <path d="M41 53 L45 60 L49 53 Z" fill="#e0a23a"/>
    <path d="M30 60 Q45 68 60 60 L56 70 Q45 74 34 70 Z" fill="#3f4479"/><text x="45" y="69" font-size="7" font-weight="700" text-anchor="middle" fill="#fff" font-family="'Hiragino Mincho ProN', serif">古</text></svg>`;
}
// the shop's tabs (1.2.0): for 書房, for the yard, to wear, and what is sold for a while only. The last one used comes back.
const SHOP_TABS = [['in', '室內', [['floor', '家具擺飾'], ['rug', '地墊'], ['wall', '牆上']]], ['out', '戶外', [['yard', '戶外擺設'], ['house', '房子外觀']]], ['wear', '穿搭', [['clothes', '衣服褲子'], ['wear', '主角穿戴']]], ['sale', '限時']];
let shopTab = (() => { try { const t = localStorage.getItem('nq_shop_tab'); return SHOP_TABS.some(([k]) => k === t) ? t : 'in'; } catch (e) { return 'in'; } })();
// limited sales (1.2.0): month-day, both ends in, every year. A ware joins one with limited: its key; it is shown under 限時
// only, and only while the sale is on; once bought it is theirs like any other.
const SALES = { halloween: { name: '萬聖節', from: '10-21', to: '11-10' } };
const saleOn = (key, day) => { const s = SALES[key], md = day && day.slice(5); return !!(s && md && md >= s.from && md <= s.to); };
const salePreview = () => { try { return onTestSite() && localStorage.getItem('nq_sale_preview') === '1'; } catch (e) { return false; } };   // test site: every sale as if on
// the day a sale goes by is the server's, never the phone's (its clock and time zone are anyone's to change): the site's own
// answer carries a Date header, and that moment in Taipei (UTC+8, where the learners are) is the day. Kept 10 minutes; failed:
// no answer (offline), asked again when 限時 is opened
let saleDay = { day: null, at: 0, ask: null, failed: false };
function saleClock() {
  if (saleDay.day && Date.now() - saleDay.at < 600000) return Promise.resolve(saleDay.day);
  if (!saleDay.ask) saleDay.ask = fetch(`./?clock=${Date.now()}`, { method: 'HEAD', cache: 'no-store' }).then((r) => {
    const t = Date.parse(r.headers.get('Date')); if (!Number.isFinite(t)) throw new Error('no Date header');
    const d = new Date(t + 8 * 3600000);
    saleDay = { day: `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`, at: Date.now(), ask: null, failed: false };
    return saleDay.day;
  }).catch(() => { saleDay = { day: null, at: 0, ask: null, failed: true }; return null; });
  return saleDay.ask;
}
const saleNow = () => (saleDay.day && Date.now() - saleDay.at < 600000 ? saleDay.day : null);
// a ware's picture on its card and when it is got (GOT): clothes in the hero's own colours
const wareArt = (it) => (it.kind === 'wear' ? HERO.thumb(it.id, state.look) : it.kind === 'clothes' ? HERO.clothes(it.id, HERO.norm(state.look)) : it.kind === 'yard' ? YARD.thumb(it.id) : it.kind === 'house' ? `<svg class="house-thumb" viewBox="0 0 140 130" aria-hidden="true">${HOUSE_ART[it.id]}</svg>` : DECOR.thumb(it.id));
// something new got (test, 2026-11-09: the user wanted a close-up and effects): the screen dims, the thing comes up big in the
// middle on a turning burst of light with sparkles, 「獲得」 and its name and where it went; a tap (or 3.2 s) and it is gone
function gotItem(id, where, then) {
  const it = WARE.get(id); if (!it) { if (then) then(); return; }
  document.querySelectorAll('.got').forEach((g) => g.remove());
  const el = document.createElement('div'); el.className = 'got'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', `獲得${it.name}`);
  el.innerHTML = `<div class="got-burst" aria-hidden="true"></div><div class="got-art">${wareArt(it)}</div>
    ${[[-120, -90, 0], [130, -70, 0.3], [-90, 80, 0.6], [110, 100, 0.15], [0, -150, 0.45], [-160, 10, 0.75], [160, 20, 0.9]].map(([x, y, d]) => `<i class="got-spark" style="--x:${x}px;--y:${y}px;--w:${d}s"></i>`).join('')}
    <div class="got-text"><span>獲得</span><b>${esc(it.name)}</b>${where ? `<small>${esc(where)}</small>` : ''}</div>`;
  document.body.appendChild(el); fitThumbs(el);
  playSfx('up');
  let gone = false; const close = () => { if (gone) return; gone = true; el.classList.add('out'); setTimeout(() => el.remove(), 260); if (then) then(); };
  el.addEventListener('click', close); setTimeout(close, 3200);
}
const forSale = (it) => !it.limited || salePreview() || saleOn(it.limited, saleNow());   // in the shop now (a limited one: by the server's day, when known)
// a limited ware is bought only on a day the server says its sale is on (asked again when the answer is old)
function saleCheck(it, go) {
  if (!it.limited || salePreview()) { go(); return; }
  saleClock().then((day) => { if (saleOn(it.limited, day)) go(); else { toast(day ? '這個限時商品已經下架了' : '限時商品要連上網路才買得到'); route(); } });
}
const mdText = (md) => md.split('-').map(Number).join('/');
function saleHtml(day, live, grid) {   // 限時: the sales on now with their wares, or when the next one is
  if (!live.length) {
    if (!day) return `<p class="shop-note">${saleDay.failed ? '限時商品要連上網路才看得到。' : '查看中…'}</p>`;
    return `<p class="shop-note">現在沒有限時商品。下一檔：${Object.values(SALES).map((x) => `${x.name} ${mdText(x.from)}–${mdText(x.to)}`).join('、')}</p>`;
  }
  return live.map((k) => {
    const x = SALES[k], left = day ? Math.round((Date.parse(`${day.slice(0, 4)}-${x.to}`) - Date.parse(day)) / 86400000) : null;
    const when = left === null || !saleOn(k, day) ? '測試預覽' : left > 0 ? `還有 ${left} 天` : '今天最後一天';
    return `<section class="shop-sec"><h2 class="shop-h">${x.name}限定 · 賣到 ${mdText(x.to)}（${when}）</h2>${grid(WARES.filter((it) => it.limited === k))}</section>`;
  }).join('');
}
const styleKey = (it) => (it.slot === 'top' ? 'topStyle' : 'bottomStyle'), styleOn = (it) => HERO.norm(state.look)[styleKey(it)] === it.id;
// a hat over what sits on top of their head (呆毛, 丸子, 雙丸子): it is tucked away while the hat is on (1.2.1)
function hatSwapNote(id, look) {
  const t = HERO.tucked(look, id);
  return t ? `戴著時${t}會收進帽子裡。` : '';
}
function shopCardHtml(it, bal) {
  const owned = owns(it.id), short = it.price - bal, swap = it.kind === 'wear' ? hatSwapNote(it.id, state.look) : '';
  let act;
  if (owned && it.kind === 'wear') act = `<button type="button" class="btn btn-sm" data-act="ware-wear" data-id="${it.id}">${state.wear[it.slot] === it.id ? '脫下' : '穿上'}</button>`;
  else if (owned && it.kind === 'clothes') act = `<button type="button" class="btn btn-sm" data-act="clothes-wear" data-id="${it.id}">${styleOn(it) ? '脫下' : '換上'}</button>`;
  else if (owned && it.kind === 'house') act = `<button type="button" class="btn btn-sm" data-act="house-wear" data-id="${it.id}">${state.house === it.id ? '換回小屋' : '換上'}</button>`;
  else if (owned) act = `<span class="chip">${state.placed[it.id] ? (it.kind === 'yard' ? '在院子' : '在書房') : '在收納箱'}</span>`;
  else if (short > 0) act = `<button type="button" class="btn btn-sm btn-muted" data-act="ware-short" aria-disabled="true">還差 ${short}</button>`;
  else act = `<button type="button" class="btn btn-sm btn-primary" data-act="ware-buy" data-id="${it.id}">買下</button>`;
  const art = wareArt(it);
  // 2026-11-10 (the user: by the pictures, less to scroll): a small tile — the picture (a tap: the ware big, ware-peek), the
  // name, the price and its button; its words show in the big view
  return `<div class="card shop-item${owned ? ' owned' : ''}" data-ware="${it.id}"><button type="button" class="art" data-act="ware-peek" data-id="${it.id}" aria-label="${esc(it.name)}：看看">${art}</button><div class="nm">${esc(it.name)}</div><div class="ds">${esc(it.desc)}</div>${swap ? `<div class="ds swap">${swap}</div>` : ''}
    <div class="buy">${owned ? '<span class="price owned">已擁有</span>' : `<span class="price">${kotoIcon()}${it.price}</span>`}${act}</div></div>`;
}
function warePeek(id) {   // a ware big: its picture, its words, the tile's own buttons
  const it = WARE.get(id); if (!it) return;
  openModal(it.name, `<div class="ware-peek">${shopCardHtml(it, kotoBalance()).replace('class="card shop-item', 'class="shop-item big')}</div>`, { width: 380, noFocus: true });
  fitThumbs(document.getElementById('modalBody'));
}
const SOON = '<div class="card shop-item soon"><div class="art"><svg viewBox="0 0 80 80"><g fill="none" stroke="currentColor" stroke-opacity=".45" stroke-width="2" stroke-linejoin="round"><path d="M16 34 L40 24 L64 34 L40 44 Z"/><path d="M16 34 V56 L40 66 V44 M64 34 V56 L40 66"/></g></svg></div><div class="nm">福爺還在找</div><div class="ds">之後會有更多老東西。</div></div>';   // the last card under 主角穿戴
function renderShop(view) {
  const bal = kotoBalance(), night = sceneClock(lightHour()).day < 0.5;
  const day = saleNow(), live = Object.keys(SALES).filter((k) => salePreview() || saleOn(k, day));
  const grid = (list, extra = '') => `<div class="shop-grid">${list.map((it) => shopCardHtml(it, bal)).join('')}${extra}</div>`;
  if (!day && !saleDay.ask && !saleDay.failed) saleClock().then(() => { if (location.hash === '#/shop') route(); });   // the server's day: the 限時 dot, its wares
  document.getElementById('topTitle').textContent = '古道具屋';
  view.innerHTML = `<div class="shop-front"><i class="beam"></i><div class="noren"><i><b>古</b></i><i><b>道</b></i><i><b>具</b></i></div><i class="lantern"><i></i><i></i></i>
      <button type="button" class="fuku" data-act="fuku-talk" aria-label="福爺">${fukuSvg()}</button><div class="fuku-say" aria-live="polite">${fukuLine(night ? 'night' : 'hello')}</div>
      <div class="counter"></div><div class="purse">${kotoIcon()}言靈 <b>${bal}</b></div></div>
    <div class="page-head shop-head"><div><div class="page-title">古道具屋</div><div class="page-sub">山上的老店，老闆福爺不收錢，只收言靈。</div></div></div>
    <div class="shop-tabs" role="tablist">${SHOP_TABS.map(([k, name]) => `<button type="button" role="tab" data-act="shop-tab" data-tab="${k}" aria-selected="${shopTab === k}">${name}${k === 'sale' && live.length ? '<i class="dot" aria-label="特賣中"></i>' : ''}</button>`).join('')}</div>
    ${shopTab === 'sale' ? saleHtml(day, live, grid) : SHOP_TABS.find(([k]) => k === shopTab)[2].map(([k, name]) => `<section class="shop-sec"><h2 class="shop-h">${name}</h2>${grid(WARES.filter((it) => it.kind === k && !it.starter && !it.limited && !it.gift), k === 'wear' ? SOON : '')}</section>`).join('')}
    ${onTestSite() && shopTab === 'sale' ? `<div class="row-wrap mt-4"><button type="button" class="btn btn-sm" data-act="sale-preview">測試用：${salePreview() ? '關掉限時預覽，照日期來' : '不看日期，顯示限時商品'}</button></div>` : ''}
    ${onTestSite() ? '<div class="row-wrap mt-4"><button type="button" class="btn btn-sm" data-act="koto-gift">測試用：+100 言靈</button><button type="button" class="btn btn-sm" data-act="koto-gift" data-n="1000">測試用：+1000 言靈</button><button type="button" class="btn btn-sm" data-act="witch-again">測試用：巫婆再飛一次</button></div>' : ''}
    <svg class="defs-only" width="0" height="0" aria-hidden="true">${DECOR.DEFS}</svg>`;
  fitThumbs(view);
}
// the dressing room (1.2.0): 書房's 衣櫃 button zooms in on the hero to choose how they look (HERO.OPTS) and what they wear.
// A copy of them flies from where they stand to the stage — their head for the face's tabs, all of them for clothes — while the
// room grows round them and dims; a choice is tried on at once. 完成 keeps it all (state.look, state.wear), 取消 or Esc puts it
// back; either way the copy flies back to its place and the room zooms out.
const DRESS = (() => {
  // test (2026-11-09): two of them — the wardrobe (the button up top, the wardrobe in the bedroom) for what is worn, the full-length
  // mirror for the face, the hair and the features (the beard among them)
  const MODES = { wear: { title: '衣櫃', tabs: [['clothes', '衣服', 'body'], ['wear', '穿戴', 'body']] }, mirror: { title: '全身鏡', tabs: [['face', '臉型', 'head'], ['hair', '髮型', 'head'], ['features', '五官', 'head']] } };
  let d = null;   // open: { st, mode, look, wear, tab, back, from }
  const TABS_OF = () => MODES[d.mode].tabs;
  const box = () => (d && d.st.isConnected ? d.st.querySelector('.dress') : null);
  const kind = () => TABS_OF().find((t) => t[0] === d.tab)[2];
  const put = (cp, f) => { cp.style.transform = `translate(${f.x.toFixed(1)}px, ${f.y.toFixed(1)}px) scale(${f.s.toFixed(4)})`; };
  // where the copy's 120 × 210 box goes: the part asked for, framed in the stage (over the panel, or beside it on a wide screen)
  function frame(dr, part) {
    const p = dr.querySelector('.dress-panel'), side = p.offsetLeft > 0, W = dr.clientWidth, H = dr.clientHeight;
    const x0 = 0, y0 = 58, x1 = side ? p.offsetLeft : W, y1 = side ? H - 12 : p.offsetTop - 8;
    const top = HERO.headTop(d && d.wear.head);   // what is on the head can stand above the hair (a hat's top, a pompom, a wizard's tip)
    const [a0, b0, a1, b1] = part === 'head' ? [-54, top, 58, -56] : [-48, top + 2, 52, 8];
    const s = Math.min((x1 - x0) * (part === 'head' ? 0.78 : 0.86) / (a1 - a0), (y1 - y0) * 0.9 / (b1 - b0)), cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    dr.style.setProperty('--spx', `${cx}px`); dr.style.setProperty('--spy', `${cy}px`);
    return { s, x: cx - ((a0 + a1) / 2 + 60) * s, y: cy - ((b0 + b1) / 2 + 200) * s };
  }
  const tabs = () => TABS_OF().map(([id, name]) => `<button type="button" role="tab" data-act="dress-tab" data-tab="${id}" aria-pressed="${d.tab === id}">${name}</button>`).join('');
  // a part's styles, each drawn on the hero as they look now; a part's colours
  const opts = (key, crop) => `<div class="dress-opts">${HERO.OPTS[key].map(([v, name]) => `<button type="button" class="dress-opt" data-act="dress-pick" data-key="${key}" data-val="${v}" aria-pressed="${d.look[key] === v}">${HERO.head(Object.assign({}, d.look, { [key]: v }), crop)}<span>${name}</span></button>`).join('')}</div>`;
  const sws = (key) => `<div class="dress-sws">${HERO.OPTS[key].map(([v, name]) => `<button type="button" class="dress-sw" data-act="dress-pick" data-key="${key}" data-val="${v}" style="--c:${v}" aria-pressed="${d.look[key] === v}" aria-label="${name}" title="${name}"></button>`).join('')}</div>`;
  const sec = (title, inner) => `<section class="dress-sec"><h3>${title}</h3>${inner}</section>`;
  const HAIR4 = ['fringe', 'sides', 'hairBack', 'hairTop'];
  // what the copy does not show because of what is on the head: a whole head hides the face and hair (the face's tabs); a hat that
  // cannot sit on their hairstyle wears its own (髮型, 穿戴)
  function note() {
    const it = d.wear.head && WARE.get(d.wear.head); if (!it) return '';
    const swap = hatSwapNote(it.id, d.look);
    const say = HERO.whole(it.id) ? (kind() === 'head' ? `戴著${it.name}，看不到臉和頭髮。` : '') : swap && (d.tab === 'hair' || d.tab === 'wear') ? it.name + swap : '';
    return say ? `<p class="dress-note">${esc(say)}</p>` : '';
  }
  // the styles of tops, trousers and shoes they have (帽T and 長褲 and what was bought; every shoe), each on the hero in their colours
  const have = (key, v) => key === 'shoeStyle' || v === HERO.LOOK0[key] || owns(v);
  const styles = (key) => `<div class="dress-opts">${HERO.OPTS[key].filter(([v]) => have(key, v)).map(([v, name]) => `<button type="button" class="dress-opt" data-act="dress-pick" data-key="${key}" data-val="${v}" aria-pressed="${d.look[key] === v}">${HERO.clothes(v, d.look)}<span>${name}</span></button>`).join('')}</div>`;
  function body() { return note() + parts(); }
  function parts() {
    if (d.tab === 'face') return sec('臉型', opts('face', 'head')) + sec('膚色', sws('skin')) + sec('臉頰', opts('cheeks', 'face'));
    if (d.tab === 'hair') return sec('瀏海', opts('fringe', 'head')) + sec('兩側', opts('sides', 'bust')) + sec('後面', opts('hairBack', 'back')) + sec('造型', opts('hairTop', 'back')) + sec('髮色', sws('hairColor'));   // 1.2.1: hair in parts
    if (d.tab === 'features') return sec('眼睛', opts('eyes', 'face')) + sec('眼睛顏色', sws('eyeColor')) + sec('眉毛', opts('brows', 'face')) + sec('嘴巴', opts('mouth', 'face')) + sec('鬍子', opts('beard', 'face'));
    if (d.tab === 'clothes') {
      const more = WARES.filter((it) => it.kind === 'clothes' && !owns(it.id) && forSale(it)).length;   // a limited one only while its sale is on
      return sec('上衣', styles('topStyle')) + sec('上衣顏色', sws('top')) + sec('褲子', styles('bottomStyle')) + sec('褲子顏色', sws('bottom')) + sec('鞋子', styles('shoeStyle')) + sec('鞋子顏色', sws('shoe'))
        + (more ? `<p class="dress-more">古道具屋還有 ${more} 件衣服褲子<button type="button" class="btn btn-sm" data-act="dress-shop">去看看</button></p>` : '');
    }
    // what was bought at 古道具屋, by part: a tap puts it on or takes it off
    const got = WARES.filter((it) => it.kind === 'wear' && owns(it.id));
    const rows = WEAR_SLOTS.map(([slot, name]) => { const list = got.filter((it) => it.slot === slot); return list.length ? `<div class="dress-wear"><div class="slot">${name}</div><div class="list">${list.map((it) => `<button type="button" class="wr-it${d.wear[slot] === it.id ? ' on' : ''}" data-act="dress-wear" data-id="${it.id}" aria-pressed="${d.wear[slot] === it.id}">${HERO.thumb(it.id, d.look)}<span>${esc(it.name)}</span></button>`).join('')}</div></div>` : ''; }).join('');
    return rows || '<p class="muted mt-3">還沒有可以穿戴的東西。古道具屋的「主角穿戴」有帽子、眼鏡、圍巾、背包……</p><div class="row-wrap mt-3"><button type="button" class="btn btn-sm" data-act="dress-shop">去古道具屋</button></div>';
  }
  const copy = () => HERO.svg({ look: d.look, wear: d.wear });
  function open(st, mode = 'wear', title = '') {   // title: the thing it opened from (a mirror's own name)
    if (!st || (d && box())) return;
    st.querySelectorAll('.dress').forEach((x) => x.remove()); st.classList.remove('undressing');   // one still flying back
    const yard = st.classList.contains('yard');   // 1.2.0: out in the yard too, the sky and the lawn grow round the hero there
    if (yard) yHeroHold(st); else ROOM.hold();
    const hel = st.querySelector(yard ? '.yhero' : '.room .hero'), sr = st.getBoundingClientRect(), hr = hel && hel.getBoundingClientRect();
    const from = hr && hr.width ? { x: hr.left - sr.left, y: hr.top - sr.top, s: hr.width / 120 } : { x: sr.width / 2 - 30, y: sr.height / 2 - 52, s: 0.5 };
    d = { st, mode: MODES[mode] ? mode : 'wear', look: HERO.norm(state.look), wear: Object.assign({}, state.wear), back: false, from, title: title || MODES[mode in MODES ? mode : 'wear'].title }; d.tab = TABS_OF()[0][0];
    const zr = yard ? st.querySelector('.sky').getBoundingClientRect() : sr;   // what grows: 書房's room, the yard's sky (on the whole screen)
    st.style.setProperty('--zx', `${(from.x + 60 * from.s + sr.left - zr.left).toFixed(1)}px`); st.style.setProperty('--zy', `${(from.y + 150 * from.s + sr.top - zr.top).toFixed(1)}px`);
    st.insertAdjacentHTML('beforeend', `<div class="dress" role="dialog" aria-modal="true" aria-label="打扮">
      <i class="dress-dim"></i>
      <div class="hero dress-hero" data-act="dress-turn" aria-label="主角（點一下轉身）">${copy()}</div>
      <div class="dress-bar"><button type="button" data-act="dress-cancel">取消</button><span class="t">${esc(d.title)}</span><button type="button" class="ok" data-act="dress-done">完成</button></div>
      <div class="dress-tools"><button type="button" data-act="dress-random" aria-label="隨機" title="隨機">${icon('dice')}</button><button type="button" data-act="dress-turn" aria-label="轉身" title="轉身">${icon('turn')}</button></div>
      <div class="dress-panel"><div class="dress-tabs" role="tablist">${tabs()}</div><div class="dress-body">${body()}</div></div>
    </div>`);
    const dr = box(), cp = dr.querySelector('.dress-hero');
    put(cp, from); void dr.offsetWidth;   // the copy starts where they stand
    st.classList.add('dressing'); dr.classList.add('on'); cp.classList.add('fly'); put(cp, frame(dr, kind()));
    window.addEventListener('resize', reframe);
  }
  function reframe() { const dr = box(); if (dr) put(dr.querySelector('.dress-hero'), frame(dr, kind())); }
  function redraw(hop) {   // the copy and the panel (the list keeps its place)
    const dr = box(); if (!dr) return;
    const cp = dr.querySelector('.dress-hero'), b = dr.querySelector('.dress-body'), top = b.scrollTop;
    cp.innerHTML = copy(); b.innerHTML = body(); b.scrollTop = top;
    if (hop && !(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches)) { cp.classList.remove('hop'); void cp.offsetWidth; cp.classList.add('hop'); clearTimeout(cp._hop); cp._hop = setTimeout(() => cp.classList.remove('hop'), 520); }
  }
  function tab(id) {
    if (!box() || !TABS_OF().some((t) => t[0] === id)) return;
    d.tab = id;
    const dr = box(); dr.querySelectorAll('.dress-tabs button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.tab === id)));
    const b = dr.querySelector('.dress-body'); b.innerHTML = body(); b.scrollTop = 0;
    reframe();
  }
  function pick(key, val) {
    if (!box() || !HERO.OPTS[key] || !HERO.OPTS[key].some(([v]) => v === val) || ((key === 'topStyle' || key === 'bottomStyle') && !have(key, val))) return;
    d.look[key] = val; redraw(true);
  }
  function wear(id) { const it = WARE.get(id); if (!box() || !it || it.kind !== 'wear' || !owns(id)) return; d.wear[it.slot] = d.wear[it.slot] === id ? null : id; redraw(true); reframe(); }
  // the mirror: a whole new face and hair — one of the whole hairstyles, so the parts go together (most rolls without a beard);
  // the wardrobe: clothes they have, in any colours (what they wear on the head and so on stays)
  function random() {
    if (!box()) return;
    const any = (k) => { const o = HERO.OPTS[k]; return o[Math.floor(Math.random() * o.length)][0]; };
    if (d.mode === 'wear') {
      ['topStyle', 'bottomStyle', 'shoeStyle'].forEach((k) => { const o = HERO.OPTS[k].filter(([v]) => have(k, v)); d.look[k] = o[Math.floor(Math.random() * o.length)][0]; });
      ['top', 'bottom', 'shoe'].forEach((k) => { d.look[k] = any(k); });
      redraw(true); return;
    }
    ['face', 'skin', 'cheeks', 'hairColor', 'eyes', 'eyeColor', 'brows', 'mouth'].forEach((k) => { d.look[k] = any(k); });
    const st = HERO.STYLES[Math.floor(Math.random() * HERO.STYLES.length)]; HAIR4.forEach((k, j) => { d.look[k] = st[j + 1]; });
    d.look.beard = Math.random() < 0.65 ? 'none' : any('beard');
    redraw(true);
  }
  function turn() { const dr = box(); if (!dr) return; d.view = ((d.view || 0) + 1) % 4; const h = dr.querySelector('.dress-hero'); h.classList.toggle('turn', d.view % 2 === 1); h.classList.toggle('back', d.view >= 2); }   // facing us, turned, from behind, turned from behind
  function close(save) {
    const dr = box(); if (!d) return;
    const { st, from } = d;
    if (save) { state.look = Object.assign({}, d.look); state.wear = Object.assign({}, d.wear); saveState(); if (st.classList.contains('yard')) yHeroRedraw(st); else ROOM.heroRedraw(st); }
    d = null; window.removeEventListener('resize', reframe);
    if (!dr) return;
    const cp = dr.querySelector('.dress-hero'); cp.classList.remove('back');
    st.classList.add('undressing'); st.classList.remove('dressing'); dr.classList.remove('on'); put(cp, from);   // back to where they stand
    setTimeout(() => { dr.remove(); st.classList.remove('undressing'); }, 520);
  }
  function shop() { if (!d) return; if (!shopOpen()) { shopShut(); return; } state.look = Object.assign({}, d.look); state.wear = Object.assign({}, d.wear); saveState(); d = null; window.removeEventListener('resize', reframe); go('#/shop'); }   // off to buy something: what was chosen is kept
  return { open, close, tab, pick, wear, random, turn, shop };
})();
// a purchase: paid once, then put away (1.2.0): a thing into the storage box, to be set out in 擺設; a wear into the wardrobe
function buyWare(it) {
  state.owned[it.id] = { paid: it.price, on: todayStr() };
  if (it.kind === 'house') state.house = it.id;   // the yard's house becomes it at once
  saveState();
  return it.kind === 'house' ? '，院子的房子換好了' : it.kind === 'wear' ? '收進衣櫃了，按書房右上角的衣櫃就能穿上' : it.kind === 'clothes' ? '收進衣櫃了，按書房右上角的衣櫃，在「衣服」換上' : it.kind === 'yard' ? '收在院子的收納箱，到院子按「擺設」拿出來擺' : '收在收納箱，到書房按「擺設」拿出來擺';
}
Object.assign(ACTIONS, {
  'room-edit': (el) => ROOM.edit(el, 'on'),
  'ware-use': (el) => ROOM.useWare(el),
  'nap-to': (el) => NAP.to(Number(el.dataset.h)),
  'music-rec': (el) => MUSIC.put(el.dataset.id),
  'music-stop': () => MUSIC.pause(),
  'lamp-toggle': (el) => { const id = el.dataset.lamp; if (lampOff(id)) delete state.lampsOff[id]; else state.lampsOff[id] = true; saveState(); route(); },
  'room-edit-done': (el) => ROOM.edit(el, 'done'),
  'room-edit-take': (el) => ROOM.edit(el, 'take', el.dataset.id),
  'room-edit-turn': (el) => ROOM.edit(el, 'turn'),
  'room-edit-put': (el) => ROOM.edit(el, 'put'),
  'fuku-talk': () => fukuSay('idle'),
  'ware-short': () => fukuSay('short'),
  'ware-peek': (el) => { if (!el.closest('.ware-peek')) warePeek(el.dataset.id); },
  'ware-buy': (el) => {
    const it = WARE.get(el.dataset.id);
    if (!it || owns(it.id) || it.gift) return;
    if (kotoBalance() < it.price) { fukuSay('short'); return; }
    saleCheck(it, () => openModal(`買下${it.name}？`, `<p>用 <b>${it.price}</b> 言靈買下「${esc(it.name)}」。${it.kind === 'wear' ? '買了之後按書房右上角的衣櫃就能穿上或脫下。' : it.kind === 'clothes' ? '買了之後按書房右上角的衣櫃，在「衣服」換上，顏色照你配的。' : it.kind === 'house' ? '買了院子的房子馬上換成它；想換回原本的小屋，在這張卡片上切換。' : it.kind === 'yard' ? '買了會先收在院子的收納箱，到院子按「擺設」拿出來擺。' : '買了會先收在收納箱，到書房按「擺設」拿出來擺。'}</p>
      <div class="row-wrap mt-3"><button type="button" class="btn btn-primary" data-act="ware-buy-ok" data-id="${it.id}">買下</button><button type="button" class="btn" data-act="close-modal">再想想</button></div>`, { width: 380 }));
  },
  'ware-buy-ok': (el) => {
    const it = WARE.get(el.dataset.id);
    closeModal();
    if (!it || owns(it.id) || kotoBalance() < it.price) return;
    saleCheck(it, () => { const where = buyWare(it); route(); fukuSay('thanks'); gotItem(it.id, where.replace(/^，/, '')); });   // a close-up of it (test)
  },
  'ware-wear': (el) => {
    const it = WARE.get(el.dataset.id);
    if (!it || !owns(it.id) || it.kind !== 'wear') return;
    state.wear[it.slot] = state.wear[it.slot] === it.id ? null : it.id;
    saveState(); route();
  },
  'house-wear': (el) => {   // 古道具屋's card: the yard's house in this look, or back to the cottage
    const it = WARE.get(el.dataset.id);
    if (!it || !owns(it.id) || it.kind !== 'house') return;
    state.house = state.house === it.id ? '' : it.id; saveState(); route();
  },
  'clothes-wear': (el) => {   // 古道具屋's card: on, or back to everyone's 帽T／長褲
    const it = WARE.get(el.dataset.id);
    if (!it || !owns(it.id) || it.kind !== 'clothes') return;
    state.look = Object.assign({}, state.look, { [styleKey(it)]: styleOn(it) ? HERO.LOOK0[styleKey(it)] : it.id });
    saveState(); route();
  },
  wardrobe: (el) => DRESS.open(el.closest('.study, .yard')),   // the dressing room (1.2.0), in 書房 or out in the yard
  'dress-tab': (el) => DRESS.tab(el.dataset.tab),
  'dress-pick': (el) => DRESS.pick(el.dataset.key, el.dataset.val),
  'dress-wear': (el) => DRESS.wear(el.dataset.id),
  'dress-random': () => DRESS.random(),
  'dress-turn': () => DRESS.turn(),
  'dress-done': () => DRESS.close(true),
  'dress-cancel': () => DRESS.close(false),
  'dress-shop': () => DRESS.shop(),
  'hero-hop': (el) => ROOM.tapHero(el),
  'shop-tab': (el) => {
    shopTab = el.dataset.tab; try { localStorage.setItem('nq_shop_tab', shopTab); } catch (e) { /* no storage */ }
    if (shopTab === 'sale' && saleDay.failed) saleDay.failed = false;   // asked again: perhaps back online
    route();
  },
  'sale-preview': () => { try { localStorage.setItem('nq_sale_preview', salePreview() ? '0' : '1'); } catch (e) { /* no storage */ } route(); },
  'yard-edit': (el) => yardEdit(el.closest('.yard'), 'on'),
  'yard-edit-done': (el) => yardEdit(el.closest('.yard'), 'done'),
  'yard-edit-take': (el) => yardEdit(el.closest('.yard'), 'take', el.dataset.id),
  'yard-house': (el) => yardEdit(el.closest('.yard'), 'house', el.dataset.id),
  'yard-edit-put': (el) => yardEdit(el.closest('.yard'), 'put'),
  'yard-ware': (el) => { const y = el.closest('.yard'); if (y && y._noClick) return; if (yed.on) yardEdit(y, 'pick', el.dataset.ware); else yardUse(y, el.dataset.ware); },
  'koto-gift': (el) => { const n = Number(el && el.dataset.n) || 100; state.koto.gift = (Number(state.koto.gift) || 0) + n; saveState(); route(); toast(`測試用：多了 ${n} 言靈`); },
  'witch-again': () => {   // test site (1.2.2): the Halloween witch flies again, her 100 言靈 with her
    Object.keys(state.koto.found).filter((k) => k.startsWith('witch-')).forEach((k) => { delete state.koto.found[k]; });
    saveState(); route(); toast('測試用：巫婆會再飛出來（晚上的院子）');
  }
});

// walking in or out of the house: a short zoom, then the other scene (straight there with motion reduced)
function sceneGo(hash, cls) {
  const box = document.querySelector('#view .yard, #view .study');
  if (!box || (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches)) { go(hash); return; }
  if (box.classList.contains('yard')) { cancelAnimationFrame(ycoast); box.style.setProperty('--ycx', `${(-ycam.x * ycam.z).toFixed(1)}px`); }   // the door where the camera has it (a glide stopped there)
  box.classList.add(cls); setTimeout(() => go(hash), 380);
}
// the dive: the notebook flares, its light spreads over the screen, and the questions come up as it fades. A brand-new learner
// picks a start first; nothing to do, or motion reduced: straight in.
let diveBusy = false;
function diveInto(el) {
  if (diveBusy) return;
  if (!state.startChosen && Object.keys(state.srs).length === 0) {
    openModal('要從哪裡開始？', `<div class="row-wrap">${startButtonsHtml(false)}</div><p class="small muted mt-2">我是新手：從假名開始。我學過一些：做個小測驗，找到你的起點。</p>`, { width: 420 });
    return;
  }
  const n = (dailyPlan().remaining === 0 ? extraQueue() : dailyQueue()).items.length;
  if (!n || !el || (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches)) { startSession('daily'); return; }
  diveBusy = true; ROOM.mark('notebook');
  const st = el.closest('.study'); if (st) st.classList.add('diving');
  const r = el.getBoundingClientRect(); const x = r.left + r.width / 2, y = r.top + r.height / 2;
  const d = 2 * Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y)) / 0.62;   // its opaque part reaches the farthest corner
  const veil = document.createElement('div'); veil.className = 'dive-veil';
  veil.style.cssText = `left:${x - d / 2}px;top:${y - d / 2}px;width:${d}px;height:${d}px`;
  document.body.appendChild(veil);
  setTimeout(() => veil.classList.add('cover'), 140);
  setTimeout(() => { startSession('daily'); veil.classList.add('out'); }, 520);
  setTimeout(() => { veil.remove(); diveBusy = false; }, 900);
}

// The topics the next daily set touches: vocabulary themes (the active pair when new words are in, otherwise the themes most of
// the review words belong to) and the grammar points of its grammar questions, new ones first.
function sessionTopicsHtml(q) {
  const words = q.items.filter(it => it.kind === 'v');
  const present = new Set(words.map(vocabTheme));
  const all = [...present].sort((a, b) => themeRank(a) - themeRank(b));
  const themes = all.slice(0, 3); if (all.length > 3) themes.push(`等 ${all.length} 個`);
  const vocabText = themes.length ? themes.join('・') : '今天的單字已完成';   // the line is always there: a finished day just says so
  const gItems = q.items.filter(it => it.kind === 'g');
  const pts = [];
  gItems.filter(it => !state.srs[it.key]).concat(gItems.filter(it => state.srs[it.key])).forEach(g => { if (g.pt && !pts.includes(g.pt)) pts.push(g.pt); });
  const shown = pts.slice(0, 5); if (pts.length > 5) shown.push(`等 ${pts.length} 個考點`);
  return `<div class="plan-topics">
      <span><b>單字主題</b>${esc(vocabText)}</span>
      ${shown.length ? `<span><b>文法</b>${esc(shown.join('・'))}</span>` : ''}
    </div>`;
}
function planNoteHtml(plan) { return plan.note ? `<div class="plan-note">${esc(plan.note)}</div>` : ''; }
// 學習分析's head (1.1.0): a strip of 書房's cork board with the papers pinned on it there (a chart, a sticky note, a photo)
function corkStripHtml() {
  return `<div class="cork-strip" aria-hidden="true">
    <span class="pinned chart"><svg viewBox="0 0 54 38"><path d="M6 34V20M17 34V12M28 34V24M39 34V8" stroke="#4a5fcf" stroke-width="6"/><path d="M3 22L17 10L30 18L50 4" stroke="#d9534f" stroke-width="2" fill="none"/></svg></span>
    <span class="pinned sticky"><i></i><i></i><i></i></span>
    <span class="pinned photo"><i></i></span>
  </div>`;
}
// 學習分析's first card (1.1.0; it was the 今日 card's date line and its 說明 and 範圍 folds): the date and the streak, what is
// left of today's list — the next set's themes and grammar points, then the counts — the day's note, and 說明 (folded)
function todayCardHtml() {
  const t = todayStr(), d = parseDate(t), st = streakStats(), plan = dailyPlan();
  let body;
  if (plan.remaining === 0) body = `<p class="small muted">今天的題目做完了${itemsDoneToday() ? `，共 ${itemsDoneToday()} 題` : ''}。${extraQueue().items.length ? '想再練，點書桌上的筆記本「多學」。' : ''}</p>`;
  else {
    const reviewN = plan.dueV.length + plan.dueG.length + (plan.dueC || []).length + plan.q4.length + plan.q5.length;
    const newN = plan.newV.length + plan.newG.length + (plan.newC || []).length;
    const exA = (plan.dueA || []).length + (plan.newA || []).length, exK = plan.dueK.length + plan.newK.length;
    const exL = Math.min(plan.dueL.length + plan.newL.length, LISTEN_PER_DAY), exR = Math.min(1, plan.dueR.length + plan.newR.length);
    const extraN = exA + exK + exL + exR;
    const extraText = [exA && `假名 ${exA}`, exK && `漢字 ${exK}`, exL && `聽力 ${exL}`, exR && `閱讀 ${exR}`].filter(Boolean).join('・');
    body = `${sessionTopicsHtml(dailyQueue(SESSION_SIZE))}
      <div class="plan-line">
        <span>待複習 <b>${reviewN}</b>（單字 ${plan.dueV.length}・文法 ${plan.dueG.length}${plan.dueC && plan.dueC.length ? `・變化 ${plan.dueC.length}` : ''}${[['四顆', plan.q4], ['五顆', plan.q5]].map(([name, l]) => (l.length ? `・${name} ${l.length}` : '')).join('')}${plan.relearnN ? `・其中錯題 ${plan.relearnN}` : ''}）</span>
        <span>新內容 <b>${newN}</b>（單字 ${plan.newV.length}・文法 ${plan.newG.length}${plan.newC && plan.newC.length ? `・變化 ${plan.newC.length}` : ''}）</span>
        ${extraN ? `<span>另有 <b>${extraN}</b>（${extraText}）</span>` : ''}
        <span>共 <b>${plan.remaining}</b> 題</span>
      </div>`;
  }
  return `<div class="card day-card">
    <div class="card-head"><div><div class="card-title">今天</div><div class="card-sub">${d.getMonth() + 1} 月 ${d.getDate()} 日（${weekdayZh(t)}）・連續 ${st.current} 天</div></div></div>
    ${body}
    ${planNoteHtml(plan)}
    <details class="day-help"><summary>說明</summary><p class="small muted">每天練一點就好。這裡用的是 SRS（間隔重複）的改良版：在你快忘記的時候再考一次，記得會更久。答對越多，每天的新題目就會越多；想學快一點，做完後按「多學」就好。</p></details>
  </div>`;
}

// 學習紀錄 (學習分析): the calendar, streak tiles and the recent days
function historyCardHtml() {
  const st = streakStats();
  return `
    <div class="card">
      <div class="card-head">
        <div class="card-title">學習紀錄</div>
        <div class="legend">少 <i style="background:var(--heat-0)"></i><i style="background:var(--heat-1)"></i><i style="background:var(--heat-2)"></i><i style="background:var(--heat-3)"></i><i style="background:var(--heat-4)"></i> 多</div>
      </div>
      <div class="heat-row">
        <div style="min-width:0;max-width:100%">
          ${heatmapHtml()}
          <div class="small muted mt-2" id="heatInfo">點一下方格可以看那天的數據。</div>
        </div>
        <div class="grid grid-2 heat-stats">
          <div class="stat"><span class="stat-v">${st.current}</span><span class="stat-l">目前連續天數</span></div>
          <div class="stat"><span class="stat-v">${st.best}</span><span class="stat-l">最長連續</span></div>
          <div class="stat"><span class="stat-v">${st.days}</span><span class="stat-l">學習天數</span></div>
          <div class="stat"><span class="stat-v">${st.total}</span><span class="stat-l">累計作答</span></div>
        </div>
      </div>
      <details class="disclose mt-4"><summary>最近的每日紀錄</summary>${recentLogsHtml()}</details>
    </div>`;
}

function heatLevel(n) { return n <= 0 ? 0 : n < 6 ? 1 : n < 15 ? 2 : n < 26 ? 3 : 4; }
// The grid runs from the week the learner started (first day with a record, or the day the profile was created) to
// this week, so a wide screen does not show months of blank cells before the first green one. At least 4 weeks so
// a brand-new profile still reads as a calendar; at most 26, as before.
function heatmapWeeks() {
  const t = todayStr();
  const monday = (ds) => { const d = parseDate(ds); d.setDate(d.getDate() - (d.getDay() + 6) % 7); return d; };
  let first = state.createdAt && state.createdAt < t ? state.createdAt : t;
  for (const ds of Object.keys(state.dailyLogs)) if (dayActive(state.dailyLogs[ds]) && ds < first) first = ds;
  const span = Math.round((monday(t) - monday(first)) / 864e5 / 7) + 1;
  return clamp(span, 4, 26);
}
function heatmapHtml() {
  const weeks = heatmapWeeks();
  const today = parseDate(todayStr());
  const dow = (today.getDay() + 6) % 7; // Monday = 0
  const start = new Date(today); start.setDate(start.getDate() - dow - (weeks - 1) * 7);
  const cells = []; const months = [];
  let lastMonth = -1; let lastLabel = -9;
  for (let w = 0; w < weeks; w++) {
    const first = new Date(start); first.setDate(first.getDate() + w * 7);
    // label a column when its month starts, but never two labels closer than three columns
    const isNew = first.getMonth() !== lastMonth;
    const nextMonthSoon = w === 0 && new Date(first.getFullYear(), first.getMonth(), first.getDate() + 14).getMonth() !== first.getMonth();
    months.push(isNew && w - lastLabel >= 3 && !nextMonthSoon ? `${first.getMonth() + 1}月` : '');
    if (months[w]) lastLabel = w;
    lastMonth = first.getMonth();
    for (let d = 0; d < 7; d++) {
      const day = new Date(start); day.setDate(day.getDate() + w * 7 + d);
      const ds = dateStr(day);
      if (day > today) { cells.push('<i class="future"></i>'); continue; }
      const e = state.dailyLogs[ds]; const n = dayTotal(e) || (e && (e.items || e.ex)) || 0;   // a test-only day still shows
      cells.push(`<i class="l${heatLevel(n)}${ds === todayStr() ? ' today' : ''}" data-act="heat-day" data-date="${ds}" title="${ds}：${n} 題"></i>`);
    }
  }
  return `<div class="heat-wrap"><div class="heat-months">${months.map(m => `<span>${m}</span>`).join('')}</div><div class="heat">${cells.join('')}</div></div>`;
}
function recentLogsHtml() {
  const days = Object.keys(state.dailyLogs).filter(d => dayActive(state.dailyLogs[d])).sort().reverse().slice(0, 14);
  if (!days.length) return '<div class="empty">還沒有紀錄，完成第一組練習後就會出現。</div>';
  const tally = tallySrsByDay();
  return `<div class="list mt-2">${days.map(d => {
    const e = state.dailyLogs[d];
    return `<div class="list-item"><div class="grow">
      <div class="row-wrap"><b class="num">${d}</b><span class="small muted">${dayStatsText(d, tally)}</span></div>
    </div><span class="chip num">${typeof e.items === 'number' ? `${e.items} 題` : dayTotal(e) ? `作答 ${dayTotal(e)} 次` : `測驗 ${e.ex || 0} 題`}</span>
    <button type="button" class="btn btn-sm btn-ghost" data-act="del-log" data-date="${d}" title="刪除這天的紀錄">刪除</button></div>`;
  }).join('')}</div>`;
}

Object.assign(ACTIONS, {
  'heat-day': (el) => {
    const d = el.dataset.date; const e = state.dailyLogs[d]; const n = dayActive(e);
    const box = document.getElementById('heatInfo');
    if (!box) return;
    box.innerHTML = n ? `<b class="num">${d}</b>：${dayStatsText(d)}` : `<b class="num">${d}</b>：沒有練習。`;
  },
  'del-log': (el) => {
    const d = el.dataset.date;
    if (!confirm(`刪除 ${d} 的學習紀錄？`)) return;
    delete state.dailyLogs[d]; saveState(); route();
  },
  'advance-unit': () => {
    const i = unitOrder(state.currentUnit);
    if (!state.completedUnits.includes(state.currentUnit)) state.completedUnits.push(state.currentUnit);
    noteUnitDone(state.currentUnit);
    if (i < DATA.UNITS.length - 1) state.currentUnit = DATA.UNITS[i + 1].id;
    saveState();
    toast(`目前單元：${unitById(state.currentUnit).weeks}・${unitById(state.currentUnit).short}`);
    route();
  }
});

// ---- 階段（四個）與階段項目 ----
/* 入門 + DATA.PHASES 的各個階段。文法與變化練習照單元歸屬；單字、漢字、聽力、閱讀照等級歸到該等級的最後一個階段
   (PRE_N5 → 入門, N5 → 第一階段, N4 → 第三階段, N3 → 第五階段)；入門另含全部假名。階段測驗與通過時的標記都以這個劃分為準。 */
const STAGES = [{ id: 'pre', title: '入門', sub: '假名、入門單字和第 0 週的句型', units: ['m0'], lv: 'PRE_N5' }].concat(
  DATA.PHASES.map((ph, i) => ({ id: 'p' + (i + 1), title: ph.title, sub: ph.span, units: DATA.UNITS.filter(u => u.ph === ph.id).map(u => u.id), lv: phaseEndLevel(i) })));
// the level a phase finishes (its units' level when the next phase moves on to another level; a middle phase has none)
function phaseEndLevel(i) { const lvOf = (ph) => { const us = ph ? DATA.UNITS.filter(u => u.ph === ph.id) : []; return us.length ? courseLevel(us[us.length - 1].lv) : null; };
  const L = lvOf(DATA.PHASES[i]); return L && L !== lvOf(DATA.PHASES[i + 1]) ? L : null; }
function stageById(id) { return STAGES.find(s => s.id === id); }
function stageIndex(id) { return Math.max(0, STAGES.findIndex(s => s.id === id)); }
function stagesUpTo(id) { return STAGES.slice(0, stageIndex(id) + 1); }
function stageItems(id) {
  const s = stageById(id); if (!s) return [];
  const inUnits = (x) => s.units.includes(x.u);
  const out = REG.grammar.filter(inUnits).concat(REG.drills.filter(inUnits));
  if (s.lv) {
    REG.vocab.forEach(v => { if (v.lv === s.lv) out.push(v); });
    [REG.kanji, REG.listen, REG.read].forEach(list => list.forEach(x => { if (x.lv === s.lv) out.push(x); }));
  }
  if (id === 'pre') out.push(...REG.kana);
  return out;
}
function stageOfUnit(uid) { const s = STAGES.find(x => x.units.includes(uid)); return s ? s.id : 'p1'; }
function currentStageId() { return inPreStage() ? 'pre' : stageOfUnit(state.currentUnit); }
function nextUnitAfterStage(id) { const n = STAGES[stageIndex(id) + 1]; return n ? n.units[0] : DATA.UNITS[DATA.UNITS.length - 1].id; }   // after the last stage: the last unit

// ---- 階段測驗 ----
/* 40 questions drawn from the stage's own items (unseen ones included — the test asks "do I know this stage"), options only, untimed,
   and answering writes nothing to the schedule. 80% passes; the result goes to state.stageTests. A pass marks the stage and
   those before it (markPassedStage), 入門 as well as every phase. */
const STAGE_TEST_SIZE = 40;
// 入門 has its own mix; a stage that ends a level tests its words, kanji, listening and reading with the grammar, one in the middle
// of a level its grammar and the conjugation drills (1.0.33: N3's p4 and p5 follow p2 and p3; a thin bank is topped up from the others)
const STAGE_TEST_QUOTA = { pre: [['a', 14], ['v', 18], ['g', 8]] };
const STAGE_QUOTA_END = [['g', 20], ['v', 10], ['k', 4], ['l', 3], ['r', 3]], STAGE_QUOTA_MID = [['g', 32], ['c', 8]];
function stageTestQuota(id) { const st = stageById(id); return STAGE_TEST_QUOTA[id] || (st && st.lv ? STAGE_QUOTA_END : STAGE_QUOTA_MID); }
function stageTestNeed(total) { return Math.ceil(total * 0.8); }
function buildStageTest(id) {
  const st = stageById(id); if (!st) return [];
  const items = stageItems(id);
  const pools = {};
  items.forEach(x => { if (x.kind === 'g' && x.t === 'order') return; (pools[x.kind] = pools[x.kind] || []).push(x); });   // 排序題 has no options
  const picked = []; const used = new Set();
  const take = (list, n) => { let k = 0; for (const x of shuffle(list.slice())) { if (k >= n) break; if (used.has(x.key)) continue; used.add(x.key); picked.push(x); k++; } return k; };
  // grammar spread evenly over the stage's units, the remainder to random units
  const takeGrammar = (n) => {
    const byUnit = st.units.map(u => (pools.g || []).filter(g => g.u === u)).filter(l => l.length);
    if (!byUnit.length) return 0;
    const each = Math.floor(n / byUnit.length); let got = 0;
    byUnit.forEach(l => { got += take(l, each); });
    shuffle(byUnit.slice()).forEach(l => { if (got < n) got += take(l, 1); });
    if (got < n) got += take(pools.g || [], n - got);
    return got;
  };
  const quota = stageTestQuota(id);
  let short = 0;
  quota.forEach(([kind, n]) => { const got = kind === 'g' ? takeGrammar(n) : take(pools[kind] || [], n); short += n - got; });
  if (short) quota.forEach(([kind]) => { if (short > 0) short -= kind === 'g' ? takeGrammar(short) : take(pools[kind] || [], short); });   // a thin bank is topped up from the others
  return shuffle(picked).slice(0, STAGE_TEST_SIZE);
}
function finishStageTest() {
  const T = SESSION && SESSION.test; if (!T || T.result) return;
  const total = SESSION.entries.length; const correct = SESSION.stats.correct;
  const passed = correct >= stageTestNeed(total);
  T.result = { date: todayStr(), correct, total, passed };
  recordStageTest(T);
  { const e = logEntry(); e.ex = (e.ex || 0) + SESSION.results.length; }   // a test day keeps the streak; tests are not questions done
  if (passed) T.marked = markPassedStage(T.stage, passSkipKeys(SESSION.results));   // marked at once
  saveState();
}
// the test's line in state.stageTests (T.result), newest first, ten kept
function recordStageTest(T) {
  if (!state.stageTests || typeof state.stageTests !== 'object') state.stageTests = {};
  state.stageTests[T.stage] = [Object.assign({}, T.result)].concat(state.stageTests[T.stage] || []).slice(0, 10);
}
// what four stars from a test leave alone: the items it missed and the ones in the notebook, so their relearning goes on;
// grammar or kana missed and never met is recorded as met once and missed (bulkMeetMissed)
function passSkipKeys(results) { return new Set(results.filter(x => !x.ok).map(x => x.key).concat(notebookKeys())); }
function renderStageSummary(view) {
  const s = SESSION; const T = s.test; const st = stageById(T.stage);
  const total = s.entries.length; const need = stageTestNeed(total); const r = T.result;
  const byKind = {}; s.results.forEach(x => { const k = x.q.kind === 'c' ? 'g' : x.q.kind; const b = byKind[k] || (byKind[k] = { ok: 0, n: 0 }); b.n++; if (x.ok) b.ok++; });
  const kinds = LOG_KINDS.filter(([k]) => byKind[k]).map(([k, name]) => `<span class="chip num">${name} ${byKind[k].ok}／${byKind[k].n}</span>`).join('');
  const wrong = s.results.filter(x => !x.ok);
  const wrongList = wrong.map(x => `<div class="list-item"><div class="grow"><div class="jp">${furi(tidyPrompt(x.q.mistakePrompt || ''))}</div><div class="small muted">正確：<span class="jp">${esc(jaPlain(x.q.options[x.q.answer].text))}</span>・你選：<span class="jp">${esc(jaPlain(x.q.options[x.chosen].text))}</span></div></div></div>`).join('');
  const title = !r ? '未完成，不計紀錄' : r.passed ? `${r.correct}／${r.total}・通過` : `${r.correct}／${r.total}・未通過（需 ${need} 題）`;
  const buttons = r && r.passed ? '<button type="button" class="btn btn-primary" data-act="close-summary">完成</button>'
    : `<button type="button" class="btn btn-primary" data-act="stage-again">再考一次</button><button type="button" class="btn" data-act="stage-practice">去練這個階段</button><button type="button" class="btn btn-ghost" data-act="close-summary">回課程頁</button>`;
  // passed: what was marked and where the course is now (the pass moved it on), with 復原 while the mark can still be undone
  const cu = unitById(state.currentUnit);
  const range = T.stage === 'pre' ? '入門' : `${esc(st ? st.title.split('：')[0] : '')}以前、`;   // 入門 has no stage before it
  const marked = !r || !r.passed ? ''
    : T.undone ? '<div class="banner mt-4">通過了。已復原，題目的星星照舊。</div>'
    : `<div class="banner mt-4"><div class="grow">通過了。已把${range}還不到四顆的 ${T.marked} 題設成四顆。目前單元：${esc(cu.weeks)}・${esc(cu.short)}</div>${LAST_BULK_MARK ? '<button type="button" class="btn btn-sm" data-act="bulk-mark-undo">復原</button>' : ''}</div>`;
  view.innerHTML = `
    <div class="pr-top"><button type="button" class="btn btn-ghost btn-icon" data-act="close-summary" aria-label="關閉">${icon('close')}</button><div class="grow"></div></div>
    <div class="card">
      <div class="small muted">${total} 題、不計時、作答不影響排程；答對 ${need} 題算通過。</div>
      <div class="page-title mt-2">${title}</div>
      <div class="page-sub">${esc(st ? st.title : '')}・階段測驗・作答 ${s.results.length} 題</div>
      <div class="row-wrap mt-3">${kinds}</div>
      ${marked}
      <div class="row-wrap mt-4">${buttons}</div>
    </div>
    ${wrong.length ? `<div class="card"><div class="card-head"><div class="card-title">這次答錯的題目</div><span class="chip">${wrong.length}</span></div><div class="list">${wrongList}</div></div>` : ''}`;
}
Object.assign(ACTIONS, {
  'stage-test': (el) => startSession('stage', { stage: el.dataset.stage }),
  'stage-again': () => { const id = SESSION && SESSION.test ? SESSION.test.stage : null; if (!id) return; SESSION = null; startSession('stage', { stage: id }); },
  'stage-practice': () => {
    const id = SESSION && SESSION.test ? SESSION.test.stage : null; if (!id) return;
    SESSION = null; document.body.classList.remove('practicing');
    if (id === 'pre') { startSession('kana'); return; }
    const st = stageById(id); const u = st.units.find(x => !state.completedUnits.includes(x)) || st.units[0];
    startSession('unit', { unit: u, title: `${unitById(u).short}・單元練習` });
  }
});

// ---- 通過階段測驗的標記（批次標記） ----
/* Passing a stage test marks that stage and every stage before it in one go (markPassedStage): items below four
   stars become four stars, so they wait in the four-star queue instead of filling the 50 daily reviews for weeks;
   listening and reading keep their own rule (3 a day, 30／90／180 days) and are not marked. The test's misses and the
   items in the notebook are left to their relearning; grammar or kana missed and never met before is met once and
   missed, so the reviews teach it from the next day (bulkMeetMissed). Only upgrades: an item already at four stars or
   more is left alone. A marked item is due where FSRS puts four stars (about ten days); the four-star queue does not
   read that date, so it is not spread. One undo is kept in memory (LAST_BULK_MARK) until the page reloads. */
let LAST_BULK_MARK = null;
function isLR(x) { return x.kind === 'l' || x.kind === 'r'; }   // listening and reading: outside the tiers, not marked
// what a pass marks: the items of the stage and every stage before it that are below four stars (no record, or b < 4),
// not listening or reading, none in `skip`
function passMarkTargets(stageId, skip) {
  const out = []; const seen = new Set();
  stagesUpTo(stageId).forEach(s => stageItems(s.id).forEach(x => {
    if (seen.has(x.key)) return; seen.add(x.key);
    const r = state.srs[x.key];
    if (!isLR(x) && (!r || r.b < 4) && !skip.has(x.key)) out.push(x);
  }));
  return out;
}
// what a bulk mark (a stage pass) must remember to undo itself
function bulkSnapshot(extra) {
  return Object.assign({ srs: {}, mistakes: JSON.parse(JSON.stringify(state.mistakes)), completedUnits: state.completedUnits.slice(), lessonSeen: (state.lessonSeen || []).slice(),
    currentUnit: state.currentUnit, stage: state.stage, introSeen: state.introSeen, kanaKnown: state.kanaKnown }, extra);
}
// set the targets to four stars; the previous records go into snap.srs
function bulkApply(targets, snap) {
  const t = todayStr();
  targets.forEach(x => {
    const key = x.key;
    snap.srs[key] = state.srs[key] ? JSON.parse(JSON.stringify(state.srs[key])) : null;
    let r = state.srs[key];
    if (!r) {   // a word's record starts its format history (only a word's formats count toward 已熟練, see recordFormat)
      r = state.srs[key] = { b: 0, due: t, n: 0, ok: 0, ng: 0, st: 0, last: null, lapse: 0, intro: t };
      if (key.startsWith('v:')) r.f = {};
    }
    ensureFsrs(r);
    r.s = Math.max(r.s || 0, LEVEL_FROM_S[3]);
    r.b = levelFromS(r.s);
    if (!r.lrn) r.lrn = t;
    r.last = t;   // so the first real review measures elapsed time from today (null would freeze FSRS growth)
    r.due = addDays(t, fsrsDays(r.s, key));
  });
}
// keys a four-star mark left alone (passSkipKeys): one with no record that is not in the notebook was missed in the test
// and never met. Grammar and kana of that kind are met once and missed: the record srsAnswer writes for a first wrong
// answer (back tomorrow), without the relearning ladder, the notebook or an answer's counts. snap.srs keeps null for it,
// so 復原 takes it away.
function bulkMeetMissed(keys, snap) {
  const t = todayStr(); const noted = new Set(notebookKeys());
  keys.forEach(key => {
    // grammar and kana only: no new-item list offers them again (units done, no kana in the main course); other kinds stay new
    if (!/^[ga]:/.test(key) || state.srs[key] || noted.has(key)) return;
    snap.srs[key] = null;
    state.srs[key] = { b: 0, due: addDays(t, 1), n: 1, ok: 0, ng: 1, st: 0, last: t, lapse: 0, intro: t, s: FSRS_W[0], d: fsrsD0(1) };
  });
}
// a passed stage test: the stage and every one before it go to four stars, none in `skip` (grammar missed and never met
// is met once and missed); their units count as done with their lesson cards seen, and the course moves past the stage.
// Returns how many items were set to four stars.
function markPassedStage(stageId, skip) {
  const targets = passMarkTargets(stageId, skip);
  const snap = bulkSnapshot({ stageId, changed: targets.length });
  bulkApply(targets, snap);
  bulkMeetMissed(skip, snap);
  const units = stagesUpTo(stageId).flatMap(s => s.units);
  units.forEach(u => { if (!state.completedUnits.includes(u)) state.completedUnits.push(u); });
  const lessons = new Set(state.lessonSeen || []);
  REG.grammar.forEach(g => { if (units.includes(g.u)) { const k = lessonSecKey(g); if (k) lessons.add(k); } });
  state.lessonSeen = [...lessons];
  state.introSeen = true; state.kanaKnown = true; state.stage = 'main';
  const nu = nextUnitAfterStage(stageId);
  if (unitOrder(nu) > unitOrder(state.currentUnit)) state.currentUnit = nu;
  LAST_BULK_MARK = snap;
  DAILY_CACHE = null; saveState();
  return targets.length;
}
function bulkUndo() {
  const S = LAST_BULK_MARK; if (!S) return false;
  Object.entries(S.srs).forEach(([k, r]) => { if (r) state.srs[k] = r; else delete state.srs[k]; });
  state.mistakes = S.mistakes; state.completedUnits = S.completedUnits; state.lessonSeen = S.lessonSeen;
  state.currentUnit = S.currentUnit; state.stage = S.stage; state.introSeen = S.introSeen; state.kanaKnown = S.kanaKnown;
  LAST_BULK_MARK = null; DAILY_CACHE = null; saveState();
  return true;
}
Object.assign(ACTIONS, {
  // 復原 on the course page, or on the result page of the test that marked (which then says so)
  'bulk-mark-undo': () => { if (bulkUndo()) { toast('已復原'); if (SESSION && SESSION.test) SESSION.test.undone = true; } route(); }
});
