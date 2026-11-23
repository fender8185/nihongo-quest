'use strict';
// ---------- the cruise ship (test, 2026-11-12; docs/superpowers/specs/2026-11-12-cruise-tour-design.md) ----------
// The user: a big, grand liner far out at sea off みなと漁港; tapped (a long one: asked first), it races in and its passengers come
// down one by one, crowding together and all talking at once (七嘴八舌), and the hero helps 高橋 show them round. Once a unit
// (TOWN.CRUISE.TRIPS: t1 = m1 round the whole town, t2 = m2 白鷺城 and the 居酒屋 …); the passengers a fixed group that only
// grows, one more each trip. Pay comes later (the user: the loop first). TOWN.CRUISE (events.js) holds who they are and what is
// said; this draws the ship, moves them about and runs the stops.
// When: the trips in turn; one comes once the course is half through its unit (or past it), the one before is done — not the same
// day (the test site: any day) — and t1's town event (meeting 高橋) is done; any hour (by night the ship is lit).
// Kept with the progress (state.cruise, synced): done { trip: day }, on: the trip under way { trip, step: its next stop, place:
// where the passengers are } — left halfway, the ship stays in and they wait there. On this device: nq_cruise_told (the day the
// ship far out was told of), nq_cruise_force (the test site's 町の手帳 called that trip).
const CRUISE = (() => {
  const C = () => (typeof TOWN !== 'undefined' && TOWN.CRUISE) || null;
  const TOLD = 'nq_cruise_told', FORCE = 'nq_cruise_force';
  try { localStorage.removeItem('nq_cruise'); } catch (e) { /* the first test build's: no longer used */ }
  const calm = () => window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const MARK = /\{([^|}]+)\|([^|}]+)(?:\|([^}]+))?\}/g;
  const ruby = (s) => esc(s).replace(MARK, '<ruby>$1<rt>$2</rt></ruby>');
  const local = (k) => { try { return localStorage.getItem(k) || ''; } catch (e) { return ''; } };
  const setLocal = (k, v) => { try { if (v) localStorage.setItem(k, v); else localStorage.removeItem(k); } catch (e) { /* no storage: this visit only */ } };
  const day = () => dateStr(TOWNEV.today());
  const cs = () => state.cruise;

  // ---- the trips ----
  const trips = () => C().TRIPS;
  const tripIdx = (id) => trips().findIndex((t) => t.id === id);
  const trip = (id) => trips()[tripIdx(id)] || null;
  const unitI = (u) => TOWNEV.unitIdx(u);
  const reached = (t) => { const i = unitI(t.u), R = TOWNEV.reachedIdx(); return R > i || (R === i && TOWNEV.share(t.u) >= 0.5); };   // half its unit learned, or past it
  function waiting() {   // the trip whose ship lies off the harbour now (none under way)
    if (!C() || cs().on) return null;
    const t = trips().find((x) => !cs().done[x.id]); if (!t) return null;
    if (local(FORCE) === t.id) return t;
    if (t.needs && !state.town.done[t.needs]) return null;
    if (!reached(t)) return null;
    const k = tripIdx(t.id), prev = k > 0 ? trips()[k - 1] : null;
    if (prev && cs().done[prev.id] === day() && !onTestSite()) return null;   // the next one comes another day
    return t;
  }
  const current = () => (C() && cs().on ? trip(cs().on.trip) : null);
  const out = () => Boolean(current() || waiting());
  const docked = () => Boolean(current());
  const people = () => C().PEOPLE;
  // the group on a trip: all who joined by then, in the order they come down (the newest last); one whose trip is not written yet
  // (2026-11-23: the passengers written before their trips) is on none
  const party = (t) => { const k = tripIdx(t.id), P = people(), on = (id) => tripIdx(P[id].from); return Object.keys(P).filter((id) => on(id) >= 0 && on(id) <= k).sort((a, b) => on(a) - on(b)); };
  const fits = (t) => (l) => unitI(l[0]) <= unitI(t.u);   // said by the trip's unit
  const offLine = (t, id) => (C().OFF[id] || []).filter(fits(t)).pop();
  const sayLines = (t, id) => (C().SAY[id] || []).filter(fits(t));
  // tapped at a meal: one about a dish (its fourth: { at }, 2026-11-23 — t2's やきとり, a 駅弁's lid) only where it is eaten
  const eatLines = (t, id, place) => ((C().EAT || {})[id] || []).filter(fits(t)).filter((l) => !l[3] || [].concat(l[3].at).includes(place));
  const person = (id) => (id === 'takahashi' ? TOWN.CAST.takahashi : (C() && people()[id]) || null);
  const needOk = (s) => !s.need || TOWNEV.seen(s.need);   // ムギ: once he has come by
  function nextStop(t, from) { const ss = t.stops; for (let i = Math.max(0, from); i < ss.length; i++) if (needOk(ss[i])) return i; return ss.length - 1; }
  // the trip under way, kept by its stops' ids (2026-11-13): stop, the next one's id (step, its place in the list, for an id no
  // longer there and for sync-core); a reply's score under 'stop id.its number among the stop's replies' — a trip rewritten later
  // (a stop added, a line moved) carries on from the same stop, each reply counted once all the same
  const stepOf = (t, on) => { const k = on.stop ? t.stops.findIndex((s) => s.id === on.stop) : -1; return k >= 0 ? k : on.step; };
  const askNo = (s, li) => s.lines.slice(0, li).filter((l) => !Array.isArray(l)).length;
  function fix(t, on) {   // a trip begun on a test build before the ids: its step and scores by number, put by id
    if (!on.stop && t.stops[on.step]) on.stop = t.stops[on.step].id;
    const sc = on.score || {}, old = Object.keys(sc).filter((k) => /^\d+\.\d+$/.test(k)); if (!old.length) return;
    old.forEach((k) => { const [i, li] = k.split('.').map(Number), s = t.stops[i], n = s && `${s.id}.${askNo(s, li)}`; if (n && !(n in sc)) sc[n] = sc[k]; delete sc[k]; });
  }
  const placeName = (p) => TOWNEV.PLACE_NAME[p] || p;

  // ---- the ship (in the harbour's land, its units: y down) ----
  // docked along the quay behind the boats and 漁協, its stern clear of the lighthouse, its bow to the right; far out it is the same
  // drawing a twelfth the size on the horizon on the left (FAR), and it comes in from there
  const ANCHOR = [885, 226], FAR = { x: 215, y: 119, s: 0.085 }, HINGE = [842, 184], FOOT = [890, 248];   // the gangway down to the right, clear of the boats
  const DOOR_W = [HINGE[0] - 600, 370 - HINGE[1] + 2], FOOT_W = [FOOT[0] - 600, 370 - FOOT[1]];   // the same in the hero's units
  const xf = (ax, ay, s) => `translate(${(ax - s * ANCHOR[0]).toFixed(1)} ${(ay - s * ANCHOR[1]).toFixed(1)}) scale(${s.toFixed(4)})`;
  const rampT = (u) => `translate(${HINGE[0]} ${HINGE[1]}) scale(${Math.max(0.001, u).toFixed(3)}) translate(${-HINGE[0]} ${-HINGE[1]})`;
  let ART = '';
  function shipArt() {
    if (ART) return ART;
    const W = hc('#f7f5ef', '#4c4e78'), Wd = hc('#e4e1d8', '#3c3e66'), glass = hc('#36557a', '#ffd98a'), pane = hc('#8fb4c8', '#ffe6a8');
    const gold = hs('#d9b25a', '#8a7a4a'), navy = hc('#22355c', '#141a38'), red = hc('#c8453a', '#5a2030'), ink = hs('#22355c', '#141a38');
    const dk = 'fill="#2b1c12" fill-opacity=".1"';
    // a deck: its front (the bow's side) swept forward and rounded; its glass along it — the promenade's long windows, the cabins' balconies
    const deck = ([y0, y1, x0, x1], kind) => {
      const body = `<path d="M${x0} ${y1} V${y0 + 5} Q${x0} ${y0} ${x0 + 5} ${y0} H${x1 - 10} Q${x1 + 2} ${y0} ${x1 + 8} ${y1} Z" ${W}/><path d="M${x0} ${y1 - 3} H${x1 + 6}" stroke="#2b1c12" stroke-opacity=".12" stroke-width="2"/>`;
      if (kind === 'prom') return body + `<rect x="${x0 + 8}" y="${y0 + 7}" width="${x1 - x0 - 22}" height="${y1 - y0 - 13}" rx="2" ${glass}/>`
        + `<path d="${Array.from({ length: Math.floor((x1 - x0 - 26) / 18) }, (_, i) => `M${x0 + 26 + i * 18} ${y0 + 7} v${y1 - y0 - 13}`).join(' ')}" ${hs('#f7f5ef', '#4c4e78')} stroke-width="1.6"/>`;
      const n = Math.floor((x1 - x0 - 24) / 11);
      return body + `<rect x="${x0 + 8}" y="${y0 + 5}" width="${x1 - x0 - 22}" height="${y1 - y0 - 11}" rx="1.4" ${kind === 'top' ? glass : pane}/>`
        + `<path d="${Array.from({ length: n }, (_, i) => `M${x0 + 18 + i * 11} ${y0 + 5} v${y1 - y0 - 11}`).join(' ')}" ${hs('#f7f5ef', '#4c4e78')} stroke-width="1.4"/>`
        + `<path d="M${x0 + 6} ${y1 - 6.5} H${x1 - 12}" ${hs('#ffffff', '#6a6c98')} stroke-width="1.2"/>`;
    };
    const decks = [[[122, 148, 600, 1126], 'prom'], [[98, 122, 616, 1102], 'cabin'], [[74, 98, 634, 1080], 'cabin'], [[50, 74, 656, 1058], 'cabin'], [[28, 50, 700, 1036], 'top']];
    const boats = [668, 742, 816, 890, 964, 1038].map((x) => `<path d="M${x + 4} 113 v-6 h3 M${x + 33} 113 v-6 h-3" ${hs('#6a6a74', '#2a2c50')} stroke-width="1.4" fill="none"/><rect x="${x}" y="111" width="38" height="10" rx="5" ${hc('#f08a3c', '#6a3a2a')}/><path d="M${x + 3} 114 h32" stroke="#fff" stroke-opacity=".5" stroke-width="1.2"/>`).join('');
    const ports = Array.from({ length: 38 }, (_, i) => `<circle cx="${612 + i * 14}" cy="190" r="2.3" ${glass}/>`).join('') + Array.from({ length: 32 }, (_, i) => `<rect x="${616 + i * 16}" y="166" width="8" height="5" rx="1.2" ${glass}/>`).join('');
    const parasol = (x, y, c) => `<path d="M${x} ${y} v-12" ${hs('#6a6a74', '#2a2c50')} stroke-width="1.2"/><path d="M${x - 9} ${y - 11} Q${x} ${y - 20} ${x + 9} ${y - 11} Z" ${hc(c, '#3a2c48')}/><path d="M${x - 3} ${y - 11} Q${x} ${y - 19} ${x + 3} ${y - 11}" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="1.6"/>`;
    // the flags dressed overall: bow to the mast to the stern, little pennants in turn
    const line = (a, b, n) => Array.from({ length: n }, (_, i) => { const t = (i + 0.5) / n, x = a[0] + (b[0] - a[0]) * t, y = a[1] + (b[1] - a[1]) * t + Math.sin(t * Math.PI) * 6;
      return `<path d="M${x.toFixed(1)} ${y.toFixed(1)} l3 7 l3 -7 Z" fill="${['#d0453c', '#e6c23a', '#3f7ac8', '#4f9a6a'][i % 4]}"/>`; }).join('');
    const lights = `<path class="glow" d="${decks.map(([[, y1, x0, x1]]) => `M${x0 + 6} ${y1 - 1} H${x1}`).join(' ')}" fill="none" stroke="#ffe9b0" stroke-width="1.6" stroke-dasharray="1 5" stroke-linecap="round" style="opacity:calc((1 - var(--day)) * .9)"/>`;
    ART = `<g class="cs-wake"><path d="M572 222 Q520 216 440 226 M576 228 Q520 232 452 238 M590 226 Q560 226 520 232" fill="none" stroke="#fff" stroke-opacity=".85" stroke-width="3" stroke-linecap="round"/><path d="M1200 220 q-10 8 -26 10" fill="none" stroke="#fff" stroke-opacity=".8" stroke-width="3" stroke-linecap="round"/></g>
      <path d="M966 8 V-38 M954 -26 h24" ${hs('#6a6a74', '#2a2c50')} stroke-width="2.4"/><ellipse cx="966" cy="-40" rx="9" ry="2.6" ${hc('#f7f5ef', '#4c4e78')}/>
      <path d="M1198 128 L966 -36 L760 -40 M966 -36 L586 136" fill="none" ${hs('#4a4a55', '#2a2c50')} stroke-width=".8"/>${line([1198, 128], [966, -36], 14)}${line([966, -36], [586, 136], 18)}
      <path d="M740 30 L756 -54 H800 L794 30 Z" ${red}/><path d="M756 -54 H800 L798 -42 H754 Z" ${hc('#2b2b33', '#121226')}/><path d="M783 -54 L790 30 H794 L800 -54 Z" ${dk}/>
      <path d="M766 -8 q5 -6 10 0 q5 -6 10 0" fill="none" ${gold} stroke-width="2.6" stroke-linecap="round"/><path d="M752 4 H792" ${gold} stroke-width="1.6"/>
      <g class="cs-smoke">${[[776, -66, 6], [770, -80, 8], [778, -96, 10], [768, -114, 12]].map(([x, y, r], i) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#fff" fill-opacity="${(0.5 - i * 0.1).toFixed(2)}"/>`).join('')}</g>
      ${decks.map(([d, k]) => deck(d, k)).join('')}
      <path d="M898 28 V12 Q898 6 904 6 H1022 Q1040 8 1046 28 Z" ${W}/><path d="M906 11 H1030 L1036 20 H906 Z" ${hc('#22355c', '#ffd98a')}/><path d="M1046 28 L1062 18 V24 Z" ${Wd}/>
      ${parasol(609, 122, '#d0453c')}${parasol(626, 98, '#3f7ac8')}${parasol(646, 74, '#e6c23a')}${parasol(718, 28, '#d0453c')}
      <path d="M686 50 C660 44 662 28 684 28 C706 28 706 12 686 10" fill="none" ${hs('#e6c23a', '#5a4a3a')} stroke-width="5" stroke-linecap="round"/><path d="M688 10 V50" ${hs('#6a6a74', '#2a2c50')} stroke-width="2"/>
      ${boats}
      <path d="M580 148 L1150 146 L1198 128 Q1186 176 1158 226 L604 226 Q588 214 584 190 Z" ${W}/>
      <path d="M580 148 L1150 146 L1198 128 L1196 136 L1150 152 L581 154 Z" ${dk}/><path d="M582 150.6 L1150 148.6 L1196 131" fill="none" ${gold} stroke-width="1.6"/>
      ${ports}
      <path d="M594 205 L1168 205 Q1164 216 1158 226 L604 226 Q597 218 594 205 Z" ${navy}/><path d="M594 205 L1168 205" ${hs('#c8453a', '#5a2030')} stroke-width="2.6"/>
      <text x="1150" y="183" text-anchor="end" font-size="11" font-weight="800" letter-spacing="1.5" ${hc('#22355c', '#c9c2e8')} font-family="system-ui, sans-serif">ROYAL KAMOME</text>
      <text x="1150" y="198" text-anchor="end" font-size="9" font-weight="700" ${hc('#22355c', '#c9c2e8')} font-family="'Hiragino Mincho ProN', 'Noto Serif JP', serif">ロイヤル・かもめ号</text>
      <circle cx="1176" cy="160" r="3.4" fill="none" ${ink} stroke-width="1.6"/><path d="M1176 163 v7 m-4 -3 q4 6 8 0" fill="none" ${ink} stroke-width="1.4"/>
      <rect x="834" y="160" width="16" height="24" rx="2" ${hc('#5a4030', '#ffd98a')}/>${lights}`;
    return ART;
  }
  // the gangway, from the door in the hull down to the quay: its handrail, posts and treads (drawn in front of the quay's things)
  const RAMP = () => { const [hx, hy] = HINGE, [fx, fy] = FOOT, n = 6;
    return `<path d="M${hx} ${hy} L${fx} ${fy} L${fx - 8} ${fy - 3} L${hx - 6} ${hy - 2} Z" ${hc('#c9c2b4', '#3a3c62')}/>`
      + `<path d="${Array.from({ length: n }, (_, i) => { const t = (i + 0.5) / n, x = hx + (fx - hx) * t, y = hy + (fy - hy) * t; return `M${(x - 6).toFixed(1)} ${(y - 2).toFixed(1)} l6 2`; }).join(' ')}" stroke="#2b1c12" stroke-opacity=".25" stroke-width="1.2"/>`
      + `<path d="M${hx - 2} ${hy - 16} L${fx - 2} ${fy - 16}" ${hs('#f7f5ef', '#6a6c98')} stroke-width="2"/>${[0, 0.33, 0.66, 1].map((t) => { const x = hx + (fx - hx) * t - 2, y = hy + (fy - hy) * t; return `<path d="M${x.toFixed(1)} ${y.toFixed(1)} v-16" ${hs('#f7f5ef', '#6a6c98')} stroke-width="1.6"/>`; }).join('')}`; };
  const LINES = `<path d="M612 200 Q588 226 562 240" fill="none" ${'stroke="#6e5a40" stroke-width="1.6"'}/><path d="M846 196 Q834 226 822 240" fill="none" stroke="#6e5a40" stroke-width="1.6"/>`;
  function shipSvg() {   // harborHtml: behind the boats, 漁協, the net
    if (!out()) return '';
    const far = !docked();
    // far out it cruises slowly along the horizon, turning at either end (2026-11-22, the user), its sign along with it (CSS: csDrift)
    return `<g class="cruise-ship${far ? ' far' : ''}"${far ? ` transform="${xf(FAR.x, FAR.y, FAR.s)}"` : ''}>${far ? '<g class="cs-drift">' : ''}<g class="cs-bob">${shipArt()}</g>${far ? '</g>' : ''}</g>`;
  }
  function rampSvg() {   // harborHtml: in front of the quay (its lines to the bollards, the gangway)
    if (!out()) return '';
    const on = docked();
    return `<g class="cruise-front"${on ? '' : ' style="opacity:0"'}>${LINES}<g class="cruise-ramp" transform="${rampT(on ? 1 : 0)}">${RAMP()}</g></g>`;
  }
  function callHtml() {   // harborHtml: the ship far out, to be tapped
    if (!waiting()) return '';
    return `<button type="button" class="thing way-btn cruise-call" data-act="cruise-call" aria-label="豪華郵輪" style="margin-left:${FAR.x - 600 - 32}px;bottom:${370 - FAR.y + 2}px"><span class="tag">${ySign('ship', '豪華郵輪')}</span></button>`;
  }

  // ---- the people about (高橋 with his flag, the passengers, townsfolk a stop brings out): drawn as the town's, moved here ----
  let S = null;   // { yard, place, indoor, ppl: Map id → { el, id, pos, k, walk, z, seat, s }, extra: [els], raf, t: timers, busy, ct, jt, eat }
  let lastPlace = '', pend = '', carry = '';   // the place drawn before; the place they were led to (its stop begins); taken there by travel() — how: bus, train, walk
  const alive = () => Boolean(S && S.yard.isConnected);
  const fresh = (yard, place) => ({ yard, place, indoor: INDOOR.includes(place), ppl: new Map(), extra: [], raf: 0, t: [], busy: false });
  const FLAG = `<g class="cr-flag"><path d="M34 -40 V-252" stroke="#6e4f3a" stroke-width="3.4" stroke-linecap="round"/><path d="M35.5 -252 h58 v38 h-58 Z" fill="#f08a3c"/><path d="M35.5 -252 h58 v6 h-58 Z" fill="#fff" fill-opacity=".3"/>`
    + `<text x="64.5" y="-227" text-anchor="middle" font-size="17" font-weight="800" fill="#fff" font-family="system-ui, sans-serif">みなと</text><circle cx="34" cy="-255" r="3.4" fill="#e6c23a"/></g>`;
  function el(id, [X, Y]) {
    const c = person(id), b = document.createElement('button');
    b.type = 'button'; b.className = `hero npc tourist cr-${id}`; b.dataset.act = 'cruise-who'; b.dataset.who = id; b.setAttribute('aria-label', c.name);
    let svg = HERO.svg({ look: c.look, wear: TOWNEV.wearOf(c.wear) });   // a Santa hat at Christmas too
    if (id === 'takahashi') svg = svg.replace(/<\/g><\/g><\/svg>$/, FLAG + '</g></g></svg>');
    b.innerHTML = svg;
    const p = { el: b, id, pos: [X, Y], k: c.size || 1, walk: null, back: false, flip: false, turn: false, z: 0, seat: null };
    S.yard.querySelector('.yworld').appendChild(b); put(p); S.ppl.set(id, p);
    HERO.idle(b, () => alive() && !p.walk && !TALK.on(), true);
    return p;
  }
  function put(p) {
    const [X, Y] = p.pos;
    p.el.style.transform = `translate(${X.toFixed(1)}px,${(-Y).toFixed(1)}px) scale(${((p.s || yScale(Y)) * p.k).toFixed(3)})`;   // s: on a seat out of doors, the size where it stands
    p.el.style.zIndex = String(p.z || (S.indoor ? isoZ(...isoUV(X, Y)) : 300 - Math.round(Y)));   // in a room: by where they stand on its floor
  }
  const face = (p) => { p.el.classList.toggle('back', p.back); p.el.classList.toggle('turn', p.turn); p.el.classList.toggle('flip', p.flip); };
  const turnTo = (p, x) => { if (p.seat) return; const dx = x - p.pos[0]; p.back = false; p.turn = Math.abs(dx) > 16; if (p.turn) p.flip = dx < 0; face(p); };
  // sat down in a room's seat [u, v, h, how] (as the town's people sit: on a chair or a stool, kneeling on a cushion) — or out of
  // doors on one of the place's, { t: its PLACE_USE (kind 'sit'), X }, as the hero sits there (ySit: on its top, the size where it
  // stands, drawn behind what stands before it), facing us; up again where one steps up to it (foot)
  function sit(p, q) {
    if (!Array.isArray(q)) { const k = yScale(q.t.dep); p.seat = q; p.s = k; p.pos = [q.X, q.t.top - 40 * k * p.k]; p.z = q.t.z || 300 - q.t.dep - 1; p.back = p.turn = p.flip = false; p.el.classList.add('bench'); face(p); put(p); return; }
    const [u, v, h, how] = q, f = how.split(' ');
    p.seat = q; p.pos = isoXY(u, v, h); p.z = isoZ(u, v + 0.45); p.back = f.includes('back'); p.turn = f.includes('turn'); p.flip = f.includes('flip');
    p.el.classList.add(f.includes('kneel') ? 'kneel' : 'bench'); face(p); put(p);
  }
  const foot = (q) => (Array.isArray(q) ? isoXY(q[0], q[1]) : [q.X, Math.max(14, q.t.dep - 16)]);
  function stand(p) { if (!p.seat) return; p.pos = foot(p.seat); p.seat = null; p.s = 0; p.z = 0; p.el.classList.remove('bench', 'kneel'); put(p); }
  // along the ground round what stands in the way (o.path: these points as they are — the gangway; o.free: off the ground's top);
  // o.v: px a second, o.delay: ms before setting off, o.done
  function walkTo(p, goal, o = {}) {
    if (!p) return;
    clearTimeout(p.wt);
    const go = () => {
      if (!alive()) return;
      stand(p);
      const pts = o.path || yRoute(S.place, p.pos, goal, o.free), seg = []; let len = 0;
      for (let i = 1; i < pts.length; i++) { const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); if (d) { seg.push([pts[i - 1], pts[i], len, d]); len += d; } }
      if (len < 3 || calm()) { p.pos = pts[pts.length - 1].slice(); put(p); if (o.done) o.done(); return; }
      HERO.still(p.el);
      const v = o.v || 95;
      p.walk = { seg, len, v, t0: performance.now(), on: null, done: o.done };
      p.el.classList.remove('walk', 'run'); p.el.classList.add(v > 140 ? 'run' : 'walk');
      if (!S.raf) S.raf = requestAnimationFrame(frame);
    };
    if (o.delay) p.wt = setTimeout(go, o.delay); else go();
  }
  function frame(now) {
    if (!S) return;
    S.raf = 0;
    if (!alive()) { stop(); return; }
    S.ppl.forEach((p) => {
      const m = p.walk; if (!m) return;
      const d = Math.min(m.len, (now - m.t0) / 1000 * m.v), q = m.seg.find((x) => d <= x[2] + x[3]) || m.seg[m.seg.length - 1], t = Math.min(1, (d - q[2]) / q[3]);
      if (q !== m.on) { m.on = q; const dx = q[1][0] - q[0][0], dy = q[1][1] - q[0][1]; p.back = dy > 0; if (Math.abs(dx) > 1) p.flip = dx < 0; p.turn = Math.abs(dx) > 0.5 * Math.abs(dy); face(p); }
      p.pos = [q[0][0] + (q[1][0] - q[0][0]) * t, q[0][1] + (q[1][1] - q[0][1]) * t]; put(p);
      if (d < m.len) return;
      p.walk = null; p.el.classList.remove('walk', 'run'); p.back = false; face(p);
      if (m.done) m.done();
    });
    if (S && !S.raf && [...S.ppl.values()].some((p) => p.walk)) S.raf = requestAnimationFrame(frame);
  }
  // words over a head (a passenger's, 高橋's), kept on the screen and raised over any other bubble they would cover; o.wait: a stop's lines after it, held back while as many as
  // room() are up (2026-11-13, the user: on a phone four at once piled into one unreadable heap); o.all: everyone the same at once
  const room = () => (S.yard.clientWidth < 560 ? 2 : 3);
  function say(id, ja, ms = 2300, o = {}) {
    const p = alive() && S.ppl.get(id); if (!p || !ja) return;
    const old = S.yard.querySelector(`.ysay[data-who="cr-${id}"]`); if (old) old.remove();
    if (o.wait !== undefined) S.hold = Date.now() + ms;   // the idle chatter keeps out of their way meanwhile
    if (o.wait !== undefined && S.yard.querySelectorAll('.ysay.cr-say').length >= room()) { if (o.wait < 8) S.t.push(setTimeout(() => { if (!TALK.on()) say(id, ja, ms, { wait: o.wait + 1 }); }, 700)); return; }
    const b = yBubble(S.yard, p.pos[0] + 600, 370 - p.pos[1] - 196 * (p.s || yScale(p.pos[1])) * p.k, ruby(ja), ms);
    if (b) { b.dataset.who = 'cr-' + id; b.classList.add('cr-say'); if (!o.all) clear(b); }
  }
  function clear(b) {   // in from the screen's edge (its tail still to the speaker), then up over the bubble it overlaps
    const z = (typeof ycam === 'object' && ycam.z) || 1, r = b.getBoundingClientRect(), Y = S.yard.getBoundingClientRect(), cx = (r.left + r.right) / 2, half = b.offsetWidth * z / 2;   // its middle: the same at any point of its pop
    const dx = cx - half < Y.left + 6 ? (Y.left + 6 - cx + half) / z : cx + half > Y.right - 6 ? (Y.right - 6 - cx - half) / z : 0;
    if (dx) { b.style.marginLeft = `${dx.toFixed(0)}px`; b.style.setProperty('--dx', `${dx.toFixed(0)}px`); }
    const box = (e) => { const w = e.offsetWidth, l = e.offsetLeft - w / 2; return [l, e.offsetTop, l + w, e.offsetTop + e.offsetHeight]; };
    for (let n = 0; n < 4; n++) {
      const [l, t, r, btm] = box(b), hit = [...S.yard.querySelectorAll('.ysay')].filter((e) => e !== b).map(box).find(([L, T, R, B]) => L < r && l < R && T < btm && t < B);
      if (!hit) return;
      b.style.bottom = `${(parseFloat(b.style.bottom) + btm - hit[1] + 6).toFixed(0)}px`;
    }
  }
  function hop(id, k = 'hop') { const p = alive() && S.ppl.get(id); if (!p || p.walk || calm()) return; p.el.classList.remove('hop', 'cheer'); void p.el.offsetWidth; p.el.classList.add(k); setTimeout(() => p.el.classList.remove(k), k === 'cheer' ? 900 : 520); }
  // all talking at once: someone says something every second or so (three bubbles at most, two on a phone), never over a talk
  function chatter() {
    if (!alive()) return;
    S.ct = setTimeout(chatter, rnd(800, 1600));
    const t = current();
    if (!t || TALK.on() || document.hidden || S.quiet || Date.now() < (S.hold || 0) || S.yard.querySelectorAll('.ysay.cr-say').length >= room()) return;
    const ids = [...S.ppl.keys()].filter((id) => id !== 'takahashi' || Math.random() < 0.3); if (!ids.length) return;
    const id = pick(ids), ls = sayLines(t, id); if (ls.length) say(id, pick(ls)[1]);
  }
  // crowded together: now and then someone shuffles a step, then looks back at the hero (not those sitting down)
  // Out of doors between stops (2026-11-13, the user: always one clump looked odd) now and then one wanders off a little instead —
  // over to something of the place to look at, or just about — and one who has wandered comes back on a later turn
  function jostle() {
    if (!alive()) return;
    S.jt = setTimeout(jostle, rnd(1400, 2800));
    if (TALK.on() || S.busy || calm()) return;
    const idle = [...S.ppl.values()].filter((p) => !p.walk && !p.seat && p.id !== 'takahashi' && !p.away); if (!idle.length) return;
    const p = pick(idle), [X, Y] = p.pos, mid = S.eat;   // at a meal out of doors: no wandering off from the ring, its middle looked at
    if (!S.indoor && S.home && !mid) {
      const [hx, hy] = S.home, off = Math.abs(X - hx) > 70 || Math.abs(Y - hy) > 20;
      if (off && Math.random() < 0.45) { walkTo(p, [hx + rnd(-45, 45), hy + rnd(-6, 6)], { v: rnd(60, 85), done: () => turnTo(p, yh.X) }); return; }
      const out = [...S.ppl.values()].filter((q) => q.id !== 'takahashi' && (Math.abs(q.pos[0] - hx) > 70 || Math.abs(q.pos[1] - hy) > 20)).length;
      if (!off && out < 3 && Math.random() < 0.45) { const w = roam(hx, hy); if (w) { walkTo(p, w.to, { v: rnd(55, 75), done: () => { if (w.at !== undefined) turnTo(p, w.at); } }); return; } }
    }
    const to = S.indoor ? isoClamp([X + rnd(-14, 14), Y + rnd(-5, 5)], 1) : [X + rnd(-14, 14), Math.max(14, Math.min(walkTop(S.place, X), Y + rnd(-5, 5)))];
    walkTo(p, to, { path: [p.pos, to], v: 45, done: () => turnTo(p, mid ? mid[0] : yh.X) });
  }
  // somewhere to wander to from the crowd at hx, hy: a thing of the place close by (its spot: PLACE_USE's go; at: where to look),
  // else open ground — not the road, nothing standing there, within a phone's view
  function roam(hx, hy) {
    const things = (PLACE_USE[S.place] || []).filter((t) => Array.isArray(t.go) && Math.abs(t.go[0] - hx) < 140 && Math.abs(t.go[1] - hy) < 40);
    const ok = (q) => q[1] >= 14 && q[1] <= walkTop(S.place, q[0]) && yGroundAt(S.place, q[0], q[1]) !== 'road' && !walkBlocks(S.place).some((b) => yIn(b, q));
    if (things.length && Math.random() < 0.6) { const t = pick(things), q = [t.go[0] + rnd(-14, 14), t.go[1] + rnd(-4, 0)]; if (ok(q)) return { to: q, at: (t.box[0] + t.box[2]) / 2 - 600 }; }
    for (let k = 0; k < 6; k++) { const q = [hx + rnd(-130, 130), hy + rnd(-22, 22)]; if (ok(q)) return { to: q }; }
    return null;
  }
  // where a stop puts them: its points in the hero's units (a room's floor [u, v] turned into them), 高橋 beside the hero on the side
  // away from the crowd (or where the stop says: guide), the crowd within a phone's view of him; two rows close together (three when
  // many, or on a narrow pavement: rows), the newly-weds side by side, a different order each stop
  const heroAt = (s) => (s.room ? isoXY(...s.hero) : s.hero);
  const guideAt = (s) => (s.guide ? (s.room ? isoXY(...s.guide) : s.guide) : s.room ? isoXY(s.hero[0] + 1.7, s.hero[1] - 0.5) : [s.hero[0] - Math.sign(s.crowd[0] - s.hero[0] || -1) * 64, s.hero[1] + 6]);
  const crowdAt = (s) => { if (s.room) return isoXY(...s.crowd); const dx = s.crowd[0] - s.hero[0]; return [s.hero[0] + Math.sign(dx) * Math.min(112, Math.abs(dx)), s.crowd[1]]; };
  function grid(n, tight) {
    const rows = tight || n > 10 ? 3 : 2, dy = tight ? 6 : 13, per = Math.ceil(n / rows), out = [];
    for (let i = 0; i < n; i++) { const r = Math.floor(i / per), c = i % per, cnt = Math.min(per, n - r * per); out.push([(c - (cnt - 1) / 2) * 32 + (r % 2 ? 12 : 0), (rows - 1 - r) * dy - (rows - 1) * dy / 2]); }
    return out;
  }
  function slots(s, i, ids) {
    const units = [];
    ids.forEach((id) => { if (id === 'ai' && ids.includes('ken')) return; units.push(id === 'ken' && ids.includes('ai') ? ['ken', 'ai'] : [id]); });
    const r = units.length ? (i * 3) % units.length : 0, order = units.slice(r).concat(units.slice(0, r)).flat();
    const [cx, cy] = crowdAt(s), f = S.indoor ? 1 : yScale(cy) / yScale(60), g = grid(order.length, s.rows === 3), out = {};
    order.forEach((id, k) => { const q = [cx + g[k][0] * f + rnd(-4, 4), cy + g[k][1] * (S.indoor ? 0.8 : 1) + rnd(-2, 2)]; out[id] = S.indoor ? isoClamp(q, 1) : q; });
    return out;
  }
  // a room's seats free of its own people and of the passengers already sat down: [u, v, h, how] (PLACE_USE: chairs, stools, cushions)
  function seats() {
    const all = []; (PLACE_USE[S.place] || []).filter((t) => t.kind === 'seat').forEach((t) => t.seats.forEach((q) => { if (!all.some((x) => Math.hypot(x[0] - q[0], x[1] - q[1]) < 0.3)) all.push(q); }));
    const taken = [...S.yard.querySelectorAll('.npc[data-npc], .cr-extra')].map(npcXY), sat = [...S.ppl.values()].filter((p) => p.seat).map((p) => p.seat);
    return all.filter((q) => { const [X, Y] = isoXY(q[0], q[1], q[2]); return !sat.includes(q) && taken.every(([nx, ny]) => Math.hypot(nx - X, ny - Y) > 14); });
  }
  // out of doors the place's seats (PLACE_USE kind 'sit': a bench, a bollard, the 茶屋's 縁台; seats: their X), one person each —
  // { t, X } that no one of the town sits on (as the hero finds them taken: useThing) nor a passenger
  function benches() {
    const taken = [...S.yard.querySelectorAll('.npc.bench:not(.tourist)')].map(npcAt).concat([...S.ppl.values()].map((p) => p.seat && p.seat.X).filter(Number.isFinite));
    return (PLACE_USE[S.place] || []).filter((t) => t.kind === 'sit').flatMap((t) => t.seats.map((X) => ({ t, X }))).filter((q) => taken.every((x) => Math.abs(x - q.X) >= 30));
  }
  // those with no seat at a meal out of doors stand round in a loose ring about the crowd's spot (2026-11-23, spec §1.2): an
  // ellipse as the ground is seen, wider the more they are (by its depth) but clear of the hero, on the ground; turned by the
  // stop's place in the trip, so the ring a place is drawn with is the one its stop then has them in (a step or two apart)
  function ring(s, i, ids) {
    const [cx, cy] = crowdAt(s), n = ids.length, rx = Math.max(36, Math.min(n * 12 * yScale(cy) / yScale(60), Math.abs(cx - heroAt(s)[0]) - 36)), out = {};
    ids.forEach((id, k) => {
      const a = i * 1.9 + (k / n) * 2 * Math.PI + rnd(-0.15, 0.15), X = cx + Math.cos(a) * rx + rnd(-4, 4), Y = cy + Math.sin(a) * rx * 0.26 + rnd(-2, 2);
      out[id] = yFree(S.place, [X, Math.max(14, Math.min(walkTop(S.place, X), Y))]);
    });
    return out;
  }
  const meal = (s) => (s.seat ? S.indoor : Boolean(s.eat) && !S.indoor);   // they sit down to eat: a room's seats, or out of doors (eat) the place's
  // where each goes at a stop: their place in the crowd round its spot (slots) — at a meal a seat each in turn while there are any
  // (not the one lost elsewhere, nor one sat down already), out of doors the rest round in a ring (ring: its middle; S.eat). The trip's
  // newcomer sits first, on the seat nearest the crowd's spot (2026-11-23, the review: 水野 stood at his own lunch, the newest last of
  // all) — in the middle of the meal, where the camera looks
  const seatAt = (q) => (Array.isArray(q) ? isoXY(q[0], q[1]) : [q.X, q.t.dep]);
  function spots(s, i, ids) {
    const m = meal(s), free = !m ? [] : S.indoor ? seats() : benches(), seat = {}, at = slots(s, i, ids);
    const sat = (id) => Boolean((S.ppl.get(id) || {}).seat), lost = (id) => Boolean(s.lost) && s.lost[0] === id, out = m && !S.indoor;
    const j = (current() || {}).join, [cx, cy] = crowdAt(s), far = (q) => { const [X, Y] = seatAt(q); return Math.hypot(X - cx, Y - cy); };
    if (m && ids.includes(j) && !sat(j) && !lost(j) && free.length) seat[j] = free.splice(free.reduce((b, q, k) => (far(q) < far(free[b]) ? k : b), 0), 1)[0];
    if (m) ids.forEach((id) => { if (!seat[id] && !sat(id) && !lost(id) && free.length) seat[id] = free.shift(); });
    if (out) Object.assign(at, ring(s, i, ids.filter((id) => !seat[id] && !sat(id) && !lost(id))));
    return { meal: m, seat, at, ring: out ? crowdAt(s) : null };
  }
  const round = () => { if (S.eat) S.ppl.forEach((p) => { if (p.id !== 'takahashi' && !p.walk) turnTo(p, S.eat[0]); }); };   // the ring at a meal turned to its middle (not those sat down: turnTo)
  const facing = (s) => { const h = heroAt(s)[0], c = crowdAt(s)[0]; S.ppl.forEach((p) => { if (!p.walk) turnTo(p, p.id === 'takahashi' ? c : h); }); };
  // the camera over them all: between the crowd's far side and 高橋 (a phone shows some 250 of the land's px), gliding there
  function frameAll(s) {
    if (!alive() || !yCamMax()) return;
    const [cx] = crowdAt(s), g = guideAt(s)[0], w = S.yard.querySelector('.yworld');
    YCAM.free = true; w.classList.add('glide'); yCamTo(S.yard, s.cam !== undefined ? s.cam : (cx + Math.sign(cx - g) * 50 + g) / 2); setTimeout(() => w.classList.remove('glide'), 400);   // cam: where a stop wants it
  }
  // the townsfolk a stop has: about already (held where they are) or brought out for it, gone again at the next stop
  function bringOut(s) {
    S.extra.forEach((b) => b.remove()); S.extra = [];
    Object.entries(s.cast || {}).forEach(([id, q]) => {
      const c = TOWN.CAST[id]; if (!c) return;
      const [X, Y] = s.room ? isoXY(...q) : q, here = S.yard.querySelector(`.npc[data-npc="${id}"]`);
      if (here && !S.indoor) { TOWNLIFE.bring(id, [X, Y]); return; }   // out of doors: over to their spot for it (a keeper in front of their shop)
      if (here) { here.style.transform = `translate(${X.toFixed(1)}px,${(-Y).toFixed(1)}px) scale(${(yScale(Y) * (c.size || 1)).toFixed(3)})`; here.style.zIndex = String(isoZ(...isoUV(X, Y))); here.classList.remove('bench', 'kneel', 'back'); return; }   // in a room: over to them (トメ from her counter)
      const b = document.createElement('div');
      b.className = `hero npc npc-${id} cr-extra`; b.innerHTML = TOWNEV.art(id, S.place);
      b.style.transform = `translate(${X.toFixed(1)}px,${(-Y).toFixed(1)}px) scale(${(yScale(Y) * (c.size || 1)).toFixed(3)})`;
      b.style.zIndex = String(S.indoor ? isoZ(...isoUV(X, Y)) : 300 - Math.round(Y));
      S.yard.querySelector('.yworld').appendChild(b); S.extra.push(b);
    });
  }

  // ---- the bar along the foot of the scene: which stop is next and where it is; on by 高橋's 「！」 (2026-11-13, the user: as the
  // story's events go on, no button) ----
  function bar() {
    if (!alive()) return;
    let b = S.yard.querySelector('.cruise-bar');
    const t = current(), g = S.ppl.get('takahashi');
    if (!t) { if (b) b.remove(); if (g) mark(g, false); return; }
    if (!b) { b = document.createElement('div'); b.className = 'cruise-bar'; b.setAttribute('role', 'status'); S.yard.appendChild(b); }
    const on = cs().on, i = nextStop(t, stepOf(t, on)), s = t.stops[i], n = t.stops.length, here = on.place === S.place;
    const near = Boolean(WAYS[`${S.place}>${s.at}`]), ready = here && !S.busy && !S.quiet && !eating(), by = !near && { bus: '搭公車去', train: '搭電車去' }[s.go];
    const go = s.at === S.place ? (s.bye ? '送客人上船' : '') : `${by || '一起去'}${placeName(s.at)}`;
    b.innerHTML = !here ? `<span class="cb-t">遊客在${esc(placeName(on.place))}等你</span>`
      : `<span class="cb-n">${i + 1}/${n}</span><span class="cb-t">${esc(s.title)}</span>${go ? `<span class="cb-go">${esc(go)}</span>` : ''}<span class="cb-busy">${S.busy ? '導覽中…' : eating() ? '大家正在用餐…點遊客聊聊' : ready ? '點高橋頭上的「！」' : ''}</span>`;
    if (g) mark(g, ready);
  }
  // 高橋's 「！」 (TOWNEV's event mark): tapped, on to the next stop (who)
  function mark(g, on) {
    const m = g.el.querySelector('.ev-mark');
    if (on && !m) g.el.insertAdjacentHTML('beforeend', '<i class="ev-mark" aria-hidden="true">！</i>');
    else if (!on && m) m.remove();
    g.el.classList.toggle('ev-host', on);
  }

  // ---- a stop: the hero and 高橋 to their places, the passengers crowding round (or sitting down to eat, out of doors those with
  // no seat round in a ring; one lost elsewhere), the talk ----
  function run(i) {
    if (!alive() || S.busy) return;
    const t = current(), s = t.stops[i], ids = [...S.ppl.keys()].filter((id) => id !== 'takahashi'), sc = S;
    S.busy = true; bar(); bringOut(s); busIn(s); S.home = S.indoor ? null : crowdAt(s);
    const board = S.place === 'platform' && ride(t, i + 1); if (board) PLATFORM.berth(S.yard, board);   // the stop before a ride on: its train in, doors open
    let left = 1, fin = false;
    const there = () => { if (--left > 0 || fin) return; fin = true; setTimeout(begin, 250); };
    const begin = () => {
      if (S !== sc || !alive()) return;
      yh.flip = crowdAt(s)[0] < yh.X; yh.turn = true; yh.back = false; yHeroPlace(S.yard); facing(s); frameAll(s);
      S.yard.querySelectorAll('.ysay.cr-say').forEach((b) => b.remove());   // the chatter stops for the talk
      if (s.need) TOWNLIFE.hold(s.need);   // ムギ stays put for his talk (let go as it closes)
      TALK.open(S.yard, 'takahashi', s.lines, () => end(i), null, { ev: true, onLine, onAnswer: (li, misses) => tally(i, li, misses) });
    };
    left++; yHeroWalk(S.yard, heroAt(s), there);
    left++; walkTo(S.ppl.get('takahashi'), guideAt(s), { v: 120, done: there });
    const m = spots(s, i, ids); S.eat = m.ring;   // after bringOut: a seat the stop's townsfolk stand at is taken
    ids.forEach((id, k) => {
      const p = S.ppl.get(id); if (!p) return;
      const lost = s.lost && s.lost[0] === id, q = m.seat[id]; p.away = lost;
      if (m.meal && p.seat) return;   // sat down already
      left++; walkTo(p, lost ? s.lost[1] : q ? foot(q) : m.at[id], { delay: k * 80 + rnd(0, 220), v: id === 'umeko' ? 160 : id === 'michiyama' ? 75 : rnd(88, 115), done: () => { if (q) sit(p, q); there(); } });
    });
    there();
    const late = (n) => { if (fin || S !== sc) return; if (n < 12 && [...sc.ppl.values()].some((p) => p.walk && !p.away)) { sc.t.push(setTimeout(() => late(n + 1), 400)); return; } left = 1; there(); };
    S.t.push(setTimeout(() => late(0), 5200));   // a walk cut short (the hero sent elsewhere): on after 5 s all the same — those still on their way (a long way over) waited for a few seconds more
  }
  // a ride on by train from みなと駅's platform next (t3's 電車 stop, 2026-11-23, the review: the words said the みなと港 train was in
  // at 二番線, the picture had the timetable's 白鷺 train): its train stands in at its track, doors open, from the stop before the ride
  // till they have gone (PLATFORM.berth); boarding(): which line's, while they wait on the platform to board (the page drawn anew)
  const LINE_END = { harbor: 'minatoko', castle: 'shirasagi' };   // the station a ride from the platform ends at, by the place it is in
  const ride = (t, k) => { const nx = t.stops[nextStop(t, k)]; return (nx && nx.go === 'train' && LINE_END[nx.at]) || ''; };
  const boarding = () => { const t = current(); return t && alive() && S.place === 'platform' && cs().on.place === 'platform' ? ride(t, stepOf(t, cs().on)) : ''; };
  // a stop's bus (bus: the X it stops at): in along the road as the stop begins, away as it ends — someone behind it is aboard
  function busIn(s) {
    if (s.bus === undefined || S.yard.querySelector('.bus')) return;
    const lane = BUS_LANE[S.place] ?? 92, k = yScale(lane) * 2.1, b = document.createElement('div');
    b.className = 'bus cr-bus'; b.setAttribute('aria-hidden', 'true');
    b.style.cssText = `margin-left:${Math.round(s.bus)}px;bottom:${lane}px;z-index:${300 - lane};--k:${k.toFixed(3)}`;
    b.innerHTML = `<svg viewBox="-140 -126 280 140">${BUS_ART}</svg>`;
    S.yard.querySelector('.yworld').appendChild(b); requestAnimationFrame(() => b.classList.add('in')); SND.play('bus');
  }
  function busOut() { const b = alive() && S.yard.querySelector('.cr-bus'); if (!b) return; b.classList.add('go'); SND.play('bus', { vol: 0.6 }); setTimeout(() => b.remove(), 900); }
  function onLine(L) {
    if (!alive() || !L) return;
    if (L.move) { const p = S.ppl.get(L.move[0]); if (p) walkTo(p, L.move[1], { v: 90, done: () => turnTo(p, yh.X) }); }   // over somewhere as they say it (道山 onto the bus)
    if (L.id === 'all') [...S.ppl.keys()].filter((id) => id !== 'takahashi').forEach((id, k) => setTimeout(() => hop(id, 'cheer'), k * 60));
    else if (S.ppl.has(L.id)) hop(L.id);
  }
  function end(i) {
    if (!alive()) return;
    const t = current(), s = t.stops[i], on = cs().on;
    on.step = i + 1; on.stop = (t.stops[i + 1] || {}).id || ''; on.place = S.place; saveState();
    if (s.bus !== undefined) busOut();
    if (s.lost) { const p = S.ppl.get(s.lost[0]); if (p) { p.away = false; walkTo(p, [crowdAt(s)[0] + rnd(-40, 40), s.room ? crowdAt(s)[1] : s.crowd[1] + rnd(-8, 8)], { v: 160, done: () => turnTo(p, yh.X) }); } }
    if (s.bye) { farewell(t, s); return; }
    const ids = [...S.ppl.keys()].filter((id) => id !== 'takahashi');
    (s.after || []).forEach(([id, ja], k) => S.t.push(setTimeout(() => { if (TALK.on()) return; if (id === 'all') ids.forEach((q) => say(q, ja, 1800, { all: true })); else say(id, ja, undefined, { wait: 0 }); }, 300 + k * 650)));   // not over the next talk
    if (meal(s)) { S.meal = Date.now() + 5000; S.t.push(setTimeout(() => { if (alive()) bar(); }, 5050)); round(); }   // they eat a while (at a table, or out of doors): tapped, each has a word for it
    S.busy = false; bar();
  }
  const eating = () => Boolean(S && S.meal && Date.now() < S.meal);
  // on to the next stop: here, or next door all walking over together (the hero leading as yGo does), or further — by bus or on foot
  // (travel: the screen fades, a line says how, and they are all there)
  function next() {
    if (!alive() || S.busy || TALK.on() || eating()) return;
    const t = current(), on = cs().on; if (!t || on.place !== S.place) return;
    const i = nextStop(t, stepOf(t, on)), s = t.stops[i];
    if (s.at === S.place) { run(i); return; }
    const way = WAYS[`${S.place}>${s.at}`];
    if (!way) { travel(s); return; }
    pend = s.at; S.busy = true; bar();
    const o = way.out(), top = (x) => (S.indoor ? x : Math.min(walkTop(S.place, x[0]), x[1]));
    S.ppl.forEach((p) => walkTo(p, S.indoor ? o : [o[0] + rnd(-36, 36), top([o[0], o[1] + rnd(-6, 6)])], { delay: rnd(100, 700), v: rnd(95, 125), free: true }));
    const btn = S.yard.querySelector(`[data-act="go-place"][data-to="${s.at}"]`);
    if (btn) { yGo(btn, s.at); return; }
    const h = S.yard.querySelector('.yhero');   // a shop's door (食堂, 居酒屋), in or out
    yHeroWalk(S.yard, o, () => { if (h) h.classList.add('out'); setTimeout(() => { yh.arrive = { from: yPlace, to: s.at }; go(PLACE_ROUTE[s.at]); }, 260); }, true);
  }
  const HOW = { bus: '🚌 大家一起搭公車去', train: '🚃 大家一起搭電車去' };   // how they go (a stop's go), else on foot
  function travel(s) {
    const words = (HOW[s.go] || '🚶 大家一起走去') + placeName(s.at);
    const v = document.createElement('div'); v.className = 'cruise-travel'; v.innerHTML = `<span>${esc(words)}</span>`; document.body.appendChild(v);
    pend = s.at; carry = HOW[s.go] ? s.go : 'walk'; S.busy = true; bar();
    requestAnimationFrame(() => v.classList.add('on'));
    const bus = s.go === 'bus' && BUS_AT[s.at], start = bus ? [bus.X - 60, Math.max(14, bus.Y + 20)] : heroAt(s);
    setTimeout(() => {
      try { const h = JSON.parse(localStorage.getItem('nq_hero') || '{}') || {}; h[s.at] = { X: Math.round(start[0]), Y: Math.round(start[1]) }; localStorage.setItem('nq_hero', JSON.stringify(h)); } catch (e) { /* no storage */ }
      yh.arrive = s.go === 'train' && WAYS[`train>${s.at}`] ? { from: 'train', to: s.at } : null; yPlace = '';   // drawn anew there, where the bus or the walk brings him — off a train in from the station's side (みなと漁港: its sign to みなと駅), they behind him
      go(PLACE_ROUTE[s.at]);
      setTimeout(() => { v.classList.remove('on'); setTimeout(() => v.remove(), 600); }, 500);
    }, calm() ? 200 : 1500);
  }

  // ---- in: the ship tapped far out (asked first: a long one), in it comes ----
  function tween(ms, step, done, ease = (u) => 1 - Math.pow(1 - u, 3)) {
    const sc = S, t0 = performance.now();
    if (calm()) { step(1); if (done) done(); return; }
    const f = (now) => { if (S !== sc || !alive()) return; const u = Math.min(1, (now - t0) / ms); step(ease(u)); if (u < 1) requestAnimationFrame(f); else if (done) done(); };
    requestAnimationFrame(f);
  }
  function call() {
    const t = waiting(); if (!t || !alive() || S.busy) return;
    const n = t.stops.length, k = tripIdx(t.id) + 1, asks = t.stops.reduce((a, s) => a + s.lines.filter((l) => !Array.isArray(l)).length, 0);
    const join = t.join && people()[t.join];
    openModal('豪華郵輪靠港了！', `<p>第 ${k} 趟導覽「${esc(t.title)}」：約 ${n} 站、${asks} 個回答，大約要 20–30 分鐘。</p>
      ${join ? `<p>這一趟多了一位新團員：${esc(join.name)}（${esc(join.role)}）。</p>` : ''}
      <p class="muted">中途可以離開，郵輪會一直停在港口，遊客在原地等你，下次從同一站繼續。</p>
      ${Object.keys(cs().done).length ? `<p class="muted small">你的導遊證：${esc(rankOf(Object.keys(cs().done).length))}（帶過 ${Object.keys(cs().done).length} 趟）</p>` : ''}
      <div class="row-wrap mt-3"><button type="button" class="btn btn-primary" data-act="cruise-start">開始導覽</button></div>`, { width: 420 });
  }
  function start() {
    closeModal();
    const t = waiting(); if (!t || !alive() || S.busy || S.place !== 'harbor') return;
    cs().on = { trip: t.id, step: 0, stop: t.stops[0].id, place: 'harbor', score: {} }; setLocal(FORCE, ''); saveState();   // in from now on, should the scene be drawn anew halfway
    S.busy = true;
    const y = S.yard, btn = y.querySelector('.cruise-call'), ship = y.querySelector('.cruise-ship'), front = y.querySelector('.cruise-front'), ramp = y.querySelector('.cruise-ramp');
    // where its cruising had got to (the drift's x, in the ship's own units): in from there, facing the quay
    const drift = y.querySelector('.cs-drift'), dx = drift ? (() => { try { return new DOMMatrix(getComputedStyle(drift).transform).e * FAR.s; } catch (e) { return 0; } })() : 0, x0 = FAR.x + dx;
    if (drift) { drift.style.animation = 'none'; drift.style.transform = 'none'; }
    if (btn) btn.remove();
    S.ct = setTimeout(chatter, 6000); S.jt = setTimeout(jostle, 8000);
    yHeroWalk(y, [FOOT_W[0] - 70, 108], () => { yh.back = true; yh.turn = false; yHeroPlace(y); });
    yPop(y, x0, FAR.y - 34, 'ボーッ！'); SND.play('shiphorn', { vol: 0.45 });
    if (ship) ship.classList.add('sailing');
    tween(3800, (u) => {   // nearer and nearer: larger as it comes (the scale grows by a ratio, the place moves on evenly)
      if (!ship) return;
      const s = FAR.s * Math.pow(1 / FAR.s, u), ax = x0 + (ANCHOR[0] - x0) * u, ay = FAR.y + (ANCHOR[1] - FAR.y) * u;
      ship.setAttribute('transform', xf(ax, ay, s));
    }, () => {
      if (ship) { ship.classList.remove('sailing', 'far'); ship.removeAttribute('transform'); }
      yPop(y, 770, -70, 'ボーーッ！'); SND.play('shiphorn', { vol: 0.8 });
      if (front) front.style.opacity = '';
      tween(800, (u) => { if (ramp) ramp.setAttribute('transform', rampT(u)); }, () => comeOff(t));
    }, (u) => (u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2) * 0.35 + (1 - Math.pow(1 - u, 3)) * 0.65);
  }
  // three steps on the gangway's boards, someone going down or up it
  const treads = () => [0, 1, 2].forEach((i) => setTimeout(() => SND.play('steps-wood', { vol: 0.6, rate: 0.95 + Math.random() * 0.1, slice: [((i + Math.floor(Math.random() * 4)) % 4) * 0.5, 0.45] }), i * 330));
  // 高橋 hurries in with his flag; they come down the gangway one at a time, saying who they are (the newest last), and crowd round
  function comeOff(t) {
    if (!alive()) return;
    const s0 = t.stops[0], ids = party(t), at = slots(s0, 0, ids), g = el('takahashi', [ycam.YW / 2 + 40, 52]);
    walkTo(g, guideAt(s0), { v: 150, free: true, done: () => { turnTo(g, FOOT_W[0]); say('takahashi', 'みなさん、こちらです〜！'); } });
    ids.forEach((id, k) => S.t.push(setTimeout(() => {
      if (!alive()) return;
      const p = el(id, DOOR_W.slice()); p.el.classList.add('cr-in'); treads();
      walkTo(p, FOOT_W, { path: [DOOR_W, FOOT_W], v: 70, done: () => {
        const off = offLine(t, id); if (off) say(id, off[1], 2600);
        const lost = s0.lost && s0.lost[0] === id; p.away = lost;
        walkTo(p, lost ? s0.lost[1] : at[id], { delay: 500, v: id === 'umeko' ? 160 : 100, done: () => turnTo(p, g.pos[0]) });
      } });
    }, 900 + k * 850)));
    S.t.push(setTimeout(() => { if (!alive()) return; S.busy = false; run(nextStop(t, 0)); }, 900 + ids.length * 850 + 2600));
  }
  // seen off: up the gangway one at a time with a last word, the gangway in, a blast, the ship away to the right; 高橋 waves it off
  function farewell(t, s) {
    const y = S.yard, bye = Object.fromEntries((s.after || []).map(([id, ja]) => [id, ja])), ids = [...S.ppl.keys()].filter((id) => id !== 'takahashi');
    S.quiet = true; bar();
    ids.forEach((id, k) => S.t.push(setTimeout(() => {
      const p = S.ppl.get(id); if (!p) return;
      walkTo(p, FOOT_W, { v: 120, done: () => { say(id, bye[id] || 'さようなら〜！', 2400); treads(); walkTo(p, DOOR_W, { path: [FOOT_W, DOOR_W], v: 60, delay: 300, done: () => { p.el.classList.add('cr-gone'); S.t.push(setTimeout(() => { p.el.remove(); S.ppl.delete(id); }, 450)); } }); } });
    }, k * 700)));
    const after = ids.length * 700 + 4200, g = S.ppl.get('takahashi');
    S.t.push(setTimeout(() => {
      if (!alive()) return;
      const ship = y.querySelector('.cruise-ship'), front = y.querySelector('.cruise-front'), ramp = y.querySelector('.cruise-ramp');
      tween(700, (u) => { if (ramp) ramp.setAttribute('transform', rampT(1 - u)); }, () => {
        if (front) front.style.opacity = '0';
        yPop(y, 770, -70, 'ボーーッ！'); SND.play('shiphorn', { vol: 0.8 });
        if (g) { turnTo(g, 400); g.el.classList.add('wave'); setTimeout(() => g.el.classList.remove('wave'), 1200); say('takahashi', 'さようなら〜！', 2400); }
        if (ship) ship.classList.add('sailing');
        tween(4600, (u) => { if (ship) { ship.setAttribute('transform', `translate(${(900 * u).toFixed(1)} 0)`); ship.style.opacity = String(Math.min(1, (1 - u) * 4)); } }, () => {
          const r = result(t, (cs().on || {}).score), before = yenBalance(), first = !Object.values(cs().res || {}).some((x) => x && x.yen > 0);   // first: no pay before this (not a wallet spent down to 0)
          (cs().res = cs().res || {})[t.id] = { first: r.first, asks: r.asks, koto: r.koto, yen: r.yen, grade: r.grade, day: r.day }; state.koto.found['cruise-' + t.id] = r.koto;
          cs().done[t.id] = day(); cs().on = null; setLocal(FORCE, ''); saveState();
          if (ship) ship.remove();
          results(t, r, before, { first });
          if (g) S.t.push(setTimeout(() => { if (alive()) walkTo(g, [ycam.YW / 2 + 60, 50], { v: 120, free: true, done: () => { g.el.remove(); S.ppl.delete('takahashi'); } }); }, 1600));
          S.busy = false; S.quiet = false; bar();
        }, (u) => u * u);
      });
    }, after));
  }

  // ---- the guide's pay (2026-11-13, the user): each reply right at once 2 言靈, after one wrong 1, the last left 0; the trip's
  // grade by the share right at once (E … S); its pay fixed by the course's level (N5 5,000 円, N4 7,000, N3 on 10,000) and 200 more
  // a grade up from E. A reply counts once (on.score: 'stop.line' → misses), however often its stop is begun ----
  const GRADES = [['E', 0], ['D', 0.3], ['C', 0.5], ['B', 0.7], ['A', 0.85], ['S', 0.95]];
  const PAY = { N5: 5000, N4: 7000 };
  const RANKS = [[15, '主任ガイド'], [8, 'ベテランガイド'], [3, 'ガイド'], [1, '見習いガイド']];   // the guide's licence by trips done
  const rankOf = (n) => (RANKS.find(([k]) => n >= k) || [0, ''])[1];
  // the guide's licence in the notebook, on 打工證's page beside the jobs' (2026-11-20, the user: the cruise and the jobs on one
  // page?): its rank, the trips to the next, and each trip done with its grade and pay; none before the first trip
  const guided = () => trips().some((t) => (cs().done || {})[t.id]);   // by the trips done, as the results count them (one with no pay kept still counts)
  function card() {
    const res = cs().res || {}, done = trips().filter((t) => (cs().done || {})[t.id]), n = done.length; if (!n) return '';
    const next = RANKS.slice().reverse().find(([k]) => k > n);
    return `<div class="wk-card"><span class="wk-title">郵輪導覽ガイド證</span><b class="wk-rank" lang="ja">${esc(rankOf(n))}</b><span>${next ? `再帶 ${next[0] - n} 趟升「${esc(next[1])}」` : '已經是最高級了'}</span></div>
      <table class="wk-tbl"><thead><tr><th>趟</th><th>路線</th><th>評級</th><th>收入</th></tr></thead><tbody>${done.map((t) => { const r = res[t.id], g = r ? (GRADES[r.grade] || ['—'])[0] : '—';
        return `<tr><td>${trips().indexOf(t) + 1}</td><td>${esc(t.title)}</td><td${g === 'S' ? ' class="wk-s"' : ''}>${g}</td><td>${r ? `${yenStr(r.yen || 0)} 円` : '—'}</td></tr>`; }).join('')}</tbody></table>`;
  }
  function tally(i, li, misses) { const on = cs().on, s = on && (current() || { stops: [] }).stops[i]; if (!s) return; const k = `${s.id}.${askNo(s, li)}`; on.score = on.score || {}; if (!(k in on.score)) { on.score[k] = misses; saveLocal(); } }
  function result(t, score) {
    const v = Object.values(score || {}), asks = v.length, first = v.filter((m) => m === 0).length, koto = v.reduce((a, m) => a + (m === 0 ? 2 : m === 1 ? 1 : 0), 0);
    const share = asks ? first / asks : 0, grade = GRADES.reduce((g, [, min], k) => (share >= min ? k : g), 0);
    const lv = ((DATA.UNITS || []).find((u) => u.id === t.u) || {}).lv, base = PAY[lv] || 10000;
    return { first, asks, koto, base, bonus: grade * 200, yen: base + grade * 200, grade, day: day() };
  }
  // the results, as the ship sails off: the replies, the 言靈 and the pay counting up, the grade stamped on; then (o.first: the
  // first pay ever) 高橋 hands over the wallet's first 円 and says what it is for. Watched to the end (the user): no going elsewhere
  // while it is up (route: data-at). o.demo: the test site's look at it
  function results(t, r, before, o = {}) {
    const done = Math.max(1, Object.keys(cs().done).length), rank = rankOf(done), up = rank !== rankOf(done - 1), g = GRADES[r.grade][0], el = document.createElement('div');
    el.className = 'cr-result'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', '導覽結算'); el.dataset.at = location.hash;
    el.innerHTML = `<div class="crr-card"><div class="crr-head"><b>導覽結算</b><span>第 ${tripIdx(t.id) + 1} 趟「${esc(t.title)}」</span></div>
      <div class="crr-row"><span>一次就答對</span><b><i data-n="${r.first}">0</i> / ${r.asks}</b></div>
      <div class="crr-row"><span>${kotoIcon()}言靈</span><b>+<i data-n="${r.koto}">0</i></b></div>
      <div class="crr-row"><span>${yenIcon()}導遊費</span><b><i data-n="${r.base}" data-yen>0</i> 円</b></div>
      ${r.bonus ? `<div class="crr-row"><span>評級加給（${g} 級）</span><b>+<i data-n="${r.bonus}" data-yen>0</i> 円</b></div>` : ''}
      <div class="crr-row crr-sum"><span>錢包</span><b><i data-n="${before + r.yen}" data-from="${before}" data-yen>${yenStr(before)}</i> 円</b></div>
      <div class="crr-stamp g${g}" aria-label="${g} 級導遊"><b>${g}</b><span>級ガイド</span></div>
      <p class="crr-rank">導遊證：${esc(rank)}${up ? `　<em>${rankOf(done - 1) ? '升級！' : '拿到導遊證！'}</em>` : ''}</p>
      <button type="button" class="btn btn-primary crr-ok">收下</button></div>`;
    document.body.appendChild(el);
    const nums = [...el.querySelectorAll('i[data-n]')], stamp = el.querySelector('.crr-stamp'), calmNow = calm();
    const put = (x, n) => { x.textContent = x.dataset.yen !== undefined ? yenStr(n) : String(Math.round(n)); };
    const thud = () => { stamp.classList.add('on'); el.querySelector('.crr-card').classList.add('thud'); playSfx('stamp'); setTimeout(() => playSfx('fanfare'), 380); };
    if (calmNow) { nums.forEach((x) => put(x, Number(x.dataset.n))); stamp.classList.add('on', 'still'); }
    else nums.forEach((x, k) => setTimeout(() => {   // one after another, ticking up
      const to = Number(x.dataset.n), from = Number(x.dataset.from || 0), t0 = performance.now(), ms = 700; let ticks = 0;
      const f = (now) => { const u = Math.min(1, (now - t0) / ms); put(x, from + (to - from) * (1 - Math.pow(1 - u, 3))); if (Math.floor(u * 6) > ticks) { ticks = Math.floor(u * 6); playSfx('coin', ticks); } if (u < 1) requestAnimationFrame(f); else if (k === nums.length - 1) setTimeout(thud, 250); };
      requestAnimationFrame(f);
    }, 350 + k * 800));
    el.querySelector('.crr-ok').addEventListener('click', () => {
      el.remove(); if (typeof kotoButtons === 'function') kotoButtons(document);
      if (o.first && !o.demo && alive()) TALK.open(S.yard, 'takahashi', [   // the wallet's first 円: what it is
        ['takahashi', '{今日|きょう}は ありがとう。これは ガイドの お{礼|れい|謝禮}です。', '今天謝謝你。這是導遊的謝禮。'],
        ['hero', '', '（拿到了円！點畫面上方的言靈數字，就能切換看錢包裡有多少円。鎮上的販賣機、麵包店、食堂都有菜單，學會菜單上的單字就能用円買來吃、喝，也能去泡湯、抽籤。）']], null, null, { ev: true });
    });
  }

  // the test site (町の手帳): the results as a trip would show them — a sample of replies, nothing kept
  function preview() {
    const t = trips()[0], sc = Object.fromEntries(Array.from({ length: 24 }, (_, k) => [`1.${k}`, k < 20 ? 0 : k < 23 ? 1 : 2]));
    results(t, result(t, sc), yenBalance(), { demo: true });
  }

  // ---- a place drawn anew ----
  function stop() {
    if (!S) return;
    cancelAnimationFrame(S.raf); clearTimeout(S.ct); clearTimeout(S.jt); S.t.forEach(clearTimeout);
    S.ppl.forEach((p) => clearTimeout(p.wt));
    S = null;
  }
  // where they stand when a place is drawn and they are there already: the last stop done here, else the next one here, else the first
  function rest(t, step, place) {
    const ts = t.stops;
    for (let k = Math.min(step, ts.length) - 1; k >= 0; k--) if (ts[k].at === place) return [ts[k], k];
    const k = ts.findIndex((x, j) => j >= step && x.at === place);
    return k >= 0 ? [ts[k], k] : [ts[0], 0];
  }
  function mount(yard, place) {
    const from = lastPlace; lastPlace = place;
    stop();
    const was = { pend, carry }; pend = ''; carry = '';
    if (!C()) return;
    if (waiting()) {   // far out at sea: said once a day out and about, seen from the harbour
      if (local(TOLD) !== day()) { setLocal(TOLD, day()); toast(place === 'harbor' ? '海上有一艘好大的郵輪！點它看看。' : '漁港外的海上，好像來了一艘好大的郵輪！', 3600); }
      if (place === 'harbor') S = fresh(yard, place);
      return;
    }
    const t = current(); if (!t) return;
    const on = cs().on; fix(t, on);
    S = fresh(yard, place);
    const way = from && from !== place ? WAYS[`${from}>${place}`] : null;
    const follow = (was.carry && was.pend === place) || (from === on.place && Boolean(way));   // taken there, or come along next door
    if (follow) { on.place = place; saveLocal(); MUSIC.sync(); }   // the tour's music along with them (route synced it before they were here)
    // taken there by bus to a stop the story has not opened yet (稲荷神社 before m8-1, 月の湯 before m4-1): open from now on, said
    // once (2026-11-23, spec §1.3) — the story's own opening still plays later, as m10-1's does with 白鷺城 open since m1-6
    if (follow && was.carry === 'bus' && BUS_PLACES.includes(place) && !busOpen(place)) { state.town.stops[place] = 1; saveState(); toast(`跟著導覽認識了${placeName(place)}，之後可以自己搭公車來`, 3600); }
    if (on.place === place) {
      const [s, k] = rest(t, stepOf(t, on), place), ids = party(t), m = spots(s, k, ids), at = m.at; S.home = S.indoor ? null : crowdAt(s); S.eat = m.ring;
      if (follow && !calm()) {   // in behind him: by the way he came, or round him where the bus, the train or the walk brought him
        const in0 = was.carry ? [yh.X, yh.Y] : way.in()[0], near = (d) => (S.indoor ? isoClamp([in0[0] + rnd(-d, d), in0[1] + rnd(-d / 4, d / 4)], 1) : [in0[0] + rnd(-d, d), Math.min(walkTop(place, in0[0]), in0[1] + rnd(-4, 4))]);
        walkTo(el('takahashi', near(20)), guideAt(s), { delay: 300, v: 130, free: true });
        ids.forEach((id, j) => { const p = el(id, near(30)), q = m.seat[id]; p.el.classList.add('cr-in'); walkTo(p, q ? foot(q) : at[id], { delay: 400 + j * 160, v: rnd(100, 130), free: true, done: q && (() => sit(p, q)) }); });
      } else {   // there already: at a meal sat down (out of doors the rest round in their ring)
        el('takahashi', guideAt(s));
        ids.forEach((id) => { const p = el(id, at[id]), q = m.seat[id]; if (q) sit(p, q); });
        facing(s); round(); setTimeout(() => frameAll(s), 60);
      }
      if (follow && was.pend === place) {   // led here for the next stop: on to it once they are in
        S.busy = true; S.t.push(setTimeout(() => { if (!alive()) return; S.busy = false; const i = nextStop(t, stepOf(t, cs().on)); if (t.stops[i].at === place) run(i); else bar(); }, calm() ? 300 : 400 + ids.length * 160 + 1600));
      }
    }
    bar();
    S.ct = setTimeout(chatter, 1200); S.jt = setTimeout(jostle, 2000);
  }
  // a tap on one of them: a hop and a word (高橋, when the next stop waits: on to it)
  function who(b) {
    const id = b.dataset.who, p = alive() && S.ppl.get(id), t = current(); if (!p || !t) return;
    if (id === 'takahashi' && !S.busy && !TALK.on() && cs().on.place === S.place) { next(); return; }
    HERO.react(b);
    const eat = p.seat || S.eat ? eatLines(t, id, S.place) : [], ls = eat.length ? eat : sayLines(t, id); if (!ls.length) return;   // at a meal (out of doors standing round too): a word for it
    const l = pick(ls); say(id, l[1], 2600); if (!TALK.on()) speakAs(id, l[1]);
  }
  // the talk card's face for one of them, or the passengers together ('all': three of them)
  function talkFace(id) {
    if (id === 'all') return `<span class="cr-crowd">${['umeko', 'rina', 'yoshimoto'].map((k) => HERO.head(people()[k].look, 'bust')).join('')}</span>`;
    const c = person(id); return c ? HERO.head(c.look, 'bust') : '';
  }
  const tag = (id) => (id === 'all' ? { name: 'みんな', role: '遊客們' } : C() && people()[id] ? people()[id] : null);   // TALK's name and role
  // a shop of the trip under way is open for them (its keeper brought out) while they are where its stop is, or on their way into
  // it next (the 食堂's door from the town) — not all the days a trip is left halfway, nor at night when they are elsewhere
  const opens = (shop) => {
    const t = current(); if (!t) return false;
    const on = cs().on, next = t.stops[nextStop(t, stepOf(t, on))];
    return t.stops.some((s) => (s.shop === shop || s.at === shop) && s.at === on.place) || Boolean(next && next.at === shop);
  };
  // 高橋 is with the passengers, not at his desk — but an event of his waiting there comes first (2026-11-13: a trip left halfway
  // kept his story from going on), unless they are there with him
  const away = (id, place, host) => id === 'takahashi' && docked() && (!host || cs().on.place === place);
  // every line said aloud on the cruise, and whose (the generator makes each a clip in their voice): みんな's by each of the chorus
  // (speakChorus says it with them all at once; 2026-11-13, the user: one voice for a crowd was awkward) — a laugh is a laugh and a
  // line with a cry is not read (VOICE_FX), so neither is made
  const chorus = ['kaneda', 'umeko', 'rina', 'yoshimoto', 'ken'];
  function lines(add) {
    const c = C(); if (!c) return;
    const sayIt = (id, ja, o) => {
      if (o && o.cry) return;
      if (id !== 'all') { add(id, ja); return; }
      if (!LAUGH.test(castLine(ja).replace(CAST_MARK, '$1'))) chorus.forEach((w) => add(w, ja));
    };
    Object.entries(c.OFF).forEach(([id, ls]) => ls.forEach((l) => sayIt(id, l[1])));
    Object.entries(c.SAY).forEach(([id, ls]) => ls.forEach((l) => sayIt(id, l[1])));
    Object.entries(c.EAT || {}).forEach(([id, ls]) => ls.forEach((l) => sayIt(id, l[1])));
    c.TRIPS.forEach((t) => t.stops.forEach((s) => s.lines.forEach((l) => (Array.isArray(l) ? sayIt(l[0], l[1], l[3]) : (l.opts || []).forEach((o) => sayIt('hero', o[0]))))));
  }
  // the record that plays where the passengers are while a trip is under way (MUSIC: みなと案内), the 居酒屋 keeping its own
  const tune = (place) => { const on = C() && cs().on; return on && on.place === place && place !== 'izakaya' ? 'minato' : ''; };
  // the test site (町の手帳): the next trip's ship out there now, whatever the day, hour or course; all begun again; on to a trip
  function force() { const t = trips().find((x) => !cs().done[x.id]); if (!t) return null; cs().on = null; saveState(); setLocal(FORCE, t.id); setLocal(TOLD, ''); return t; }
  function reset() { state.cruise = { done: {}, on: null, res: {} }; saveState(); setLocal(FORCE, ''); setLocal(TOLD, ''); }
  function skipTo(id) { const k = tripIdx(id); if (k < 0) return; state.cruise = { done: Object.fromEntries(trips().slice(0, k).map((t) => [t.id, '2000-01-01'])), on: null, res: {} }; saveState(); setLocal(FORCE, id); setLocal(TOLD, ''); }
  return { out, docked, waiting, current, shipSvg, rampSvg, callHtml, mount, call: () => call(), start: () => start(), next: () => next(), who, face: talkFace, tag, opens, away, lines, chorus, tune, result, rankOf, card, guided, preview, force, reset, skipTo, person, party, boarding, trips: () => trips() };
})();
