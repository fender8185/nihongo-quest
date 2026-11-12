'use strict';
// ---------- the cruise ship (test, 2026-11-12; docs/superpowers/specs/2026-11-12-cruise-tour-design.md) ----------
// The user: a big, grand liner far out at sea off みなと漁港; tapped, it races in and its passengers come down one by one — eight of
// them, crowding together and all talking at once (七嘴八舌) — and the hero helps 高橋 show them round, a dozen stops or so, for
// laughs; the first round written for the end of m2 (N5 第 3–4 週). Pay comes later (the user: the loop first).
// TOWN.CRUISE (events.js) holds who they are and what is said; this draws the ship, moves them about and runs the stops.
// When it comes: a ship day (Tuesday, Saturday) from 9 to 17 once the course is past the tour's unit (the very first any day); the
// test site any day and hour, and its 町の手帳 calls it. Kept on this device only (nothing synced yet): nq_cruise
// { day, step: the next stop (-1 out at sea), place: where the passengers are, done, ever: one has come in before, told, force }.
const CRUISE = (() => {
  const C = () => (typeof TOWN !== 'undefined' && TOWN.CRUISE) || null;
  const KEY = 'nq_cruise', PLACES = ['harbor', 'beach'];
  const calm = () => window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const MARK = /\{([^|}]+)\|([^|}]+)(?:\|([^}]+))?\}/g;
  const ruby = (s) => esc(s).replace(MARK, '<ruby>$1<rt>$2</rt></ruby>');

  // ---- today's ship ----
  const mem = () => { try { const m = JSON.parse(localStorage.getItem(KEY) || 'null'); return m && typeof m === 'object' ? m : {}; } catch (e) { return {}; } };
  const keep = (m) => { try { localStorage.setItem(KEY, JSON.stringify(m)); } catch (e) { /* no storage: this visit only */ } };
  const today = () => dateStr(TOWNEV.today());
  function tour() {
    const m = mem(), d = today();
    return m.day === d ? m : { day: d, step: -1, place: 'harbor', done: false, ever: Boolean(m.ever), told: '', force: '' };
  }
  const save = (t) => keep(Object.assign({}, t, { ever: Boolean(t.ever || t.step >= 0) }));
  const past = () => TOWNEV.reachedIdx() > TOWNEV.unitIdx(C().u) || (state.completedUnits || []).includes(C().u);
  function out() {   // out at sea or in, today
    const t = tour(); if (!C() || t.done) return false;
    if (t.step >= 0 || t.force === t.day) return true;
    if (!past()) return false;
    if (onTestSite()) return true;
    const h = TOWNEV.now(), d = TOWNEV.today().getDay();
    return h >= 9 && h < 17 && (!t.ever || d === 2 || d === 6);
  }
  const docked = () => out() && tour().step >= 0;
  const stops = () => C().TOUR;
  const needOk = (s) => { if (!s.need) return true; const w = TOWNEV.whereIs(s.need, TOWNEV.now(), TOWNEV.today()); return Boolean(w) && w.place === s.at; };   // ムギ on the beach
  function nextStop(t) { const ts = stops(); for (let i = Math.max(0, t.step); i < ts.length; i++) if (needOk(ts[i])) return i; return ts.length - 1; }
  const order = () => Object.keys(C().OFF);   // the passengers, in the order they come down
  const person = (id) => (id === 'takahashi' ? TOWN.CAST.takahashi : (C() && C().PEOPLE[id]) || null);

  // ---- the ship (in the harbour's land, its units: y down) ----
  // docked along the quay behind the boats and 漁協, its stern clear of the lighthouse, its bow to the right; far out it is the same
  // drawing a twelfth the size on the horizon on the left (FAR), and it comes in from there
  const ANCHOR = [885, 226], FAR = { x: 215, y: 119, s: 0.085 }, HINGE = [842, 184], FOOT = [792, 248];
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
      ${parasol(612, 98, '#d0453c')}${parasol(632, 74, '#3f7ac8')}${parasol(652, 50, '#e6c23a')}${parasol(680, 28, '#d0453c')}
      <path d="M686 28 C660 22 662 6 684 6 C706 6 706 -10 686 -12" fill="none" ${hs('#e6c23a', '#5a4a3a')} stroke-width="5" stroke-linecap="round"/><path d="M688 -12 V28" ${hs('#6a6a74', '#2a2c50')} stroke-width="2"/>
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
    return `<g class="cruise-ship${far ? ' far' : ''}"${far ? ` transform="${xf(FAR.x, FAR.y, FAR.s)}"` : ''}><g class="cs-bob">${shipArt()}</g></g>`;
  }
  function rampSvg() {   // harborHtml: in front of the quay (its lines to the bollards, the gangway)
    if (!out()) return '';
    const on = docked();
    return `<g class="cruise-front"${on ? '' : ' style="opacity:0"'}>${LINES}<g class="cruise-ramp" transform="${rampT(on ? 1 : 0)}">${RAMP()}</g></g>`;
  }
  function callHtml() {   // harborHtml: the ship far out, to be tapped
    if (!out() || docked()) return '';
    return `<button type="button" class="thing way-btn cruise-call" data-act="cruise-call" aria-label="豪華郵輪" style="margin-left:${FAR.x - 600 - 32}px;bottom:${370 - FAR.y + 2}px"><span class="tag">${ySign('wave', '豪華郵輪')}</span></button>`;
  }

  // ---- the people about (高橋 with his flag, the passengers): drawn as the town's, moved here ----
  let S = null;   // { yard, place, ppl: Map id → { el, id, pos, k, walk }, raf, t: timers, busy, ct, jt }
  let lastPlace = '', pend = '';   // the place drawn before (they come along from there); the place they were led to (its stop begins)
  const alive = () => Boolean(S && S.yard.isConnected);
  const FLAG = `<g class="cr-flag"><path d="M34 -40 V-252" stroke="#6e4f3a" stroke-width="3.4" stroke-linecap="round"/><path d="M35.5 -252 h58 v38 h-58 Z" fill="#f08a3c"/><path d="M35.5 -252 h58 v6 h-58 Z" fill="#fff" fill-opacity=".3"/>`
    + `<text x="64.5" y="-227" text-anchor="middle" font-size="17" font-weight="800" fill="#fff" font-family="system-ui, sans-serif">みなと</text><circle cx="34" cy="-255" r="3.4" fill="#e6c23a"/></g>`;
  function el(id, [X, Y]) {
    const c = person(id), b = document.createElement('button');
    b.type = 'button'; b.className = `hero npc tourist cr-${id}`; b.dataset.act = 'cruise-who'; b.dataset.who = id; b.setAttribute('aria-label', c.name);
    let svg = HERO.svg({ look: c.look, wear: c.wear || {} });
    if (id === 'takahashi') svg = svg.replace(/<\/g><\/g><\/svg>$/, FLAG + '</g></g></svg>');
    b.innerHTML = svg;
    const p = { el: b, id, pos: [X, Y], k: c.size || 1, walk: null, back: false, flip: false, turn: false };
    S.yard.querySelector('.yworld').appendChild(b); put(p); S.ppl.set(id, p);
    HERO.idle(b, () => alive() && !p.walk && !TALK.on(), true);
    return p;
  }
  function put(p) {
    const [X, Y] = p.pos;
    p.el.style.transform = `translate(${X.toFixed(1)}px,${(-Y).toFixed(1)}px) scale(${(yScale(Y) * p.k).toFixed(3)})`;
    p.el.style.zIndex = String(300 - Math.round(Y));
  }
  const face = (p) => { p.el.classList.toggle('back', p.back); p.el.classList.toggle('turn', p.turn); p.el.classList.toggle('flip', p.flip); };
  const turnTo = (p, x) => { const dx = x - p.pos[0]; p.back = false; p.turn = Math.abs(dx) > 16; if (p.turn) p.flip = dx < 0; face(p); };
  // along the ground round what stands in the way (o.path: these points as they are — the gangway; o.free: off the ground's top);
  // o.v: px a second, o.delay: ms before setting off, o.done
  function walkTo(p, goal, o = {}) {
    if (!p) return;
    clearTimeout(p.wt);
    const go = () => {
      if (!alive()) return;
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
  // words over a head (a passenger's, 高橋's)
  function say(id, ja, ms = 2300) {
    const p = alive() && S.ppl.get(id); if (!p || !ja) return;
    const old = S.yard.querySelector(`.ysay[data-who="cr-${id}"]`); if (old) old.remove();
    const b = yBubble(S.yard, p.pos[0] + 600, 370 - p.pos[1] - 196 * yScale(p.pos[1]) * p.k, ruby(ja), ms);
    if (b) { b.dataset.who = 'cr-' + id; b.classList.add('cr-say'); }
  }
  function hop(id, k = 'hop') { const p = alive() && S.ppl.get(id); if (!p || p.walk || calm()) return; p.el.classList.remove('hop', 'cheer'); void p.el.offsetWidth; p.el.classList.add(k); setTimeout(() => p.el.classList.remove(k), k === 'cheer' ? 900 : 520); }
  // all talking at once: someone says something every second or so (three bubbles at most), never over a talk
  function chatter() {
    if (!alive()) return;
    S.ct = setTimeout(chatter, rnd(800, 1600));
    if (TALK.on() || document.hidden || S.quiet || S.yard.querySelectorAll('.ysay.cr-say').length >= 3) return;
    const ids = [...S.ppl.keys()].filter((id) => id !== 'takahashi' || Math.random() < 0.3); if (!ids.length) return;
    const id = pick(ids), ls = C().SAY[id] || []; if (ls.length) say(id, pick(ls)[0]);
  }
  // crowded together: now and then someone shuffles a step, then looks back at the hero
  function jostle() {
    if (!alive()) return;
    S.jt = setTimeout(jostle, rnd(1400, 2800));
    if (TALK.on() || S.busy || calm()) return;
    const idle = [...S.ppl.values()].filter((p) => !p.walk && p.id !== 'takahashi' && !p.away); if (!idle.length) return;
    const p = pick(idle), [X, Y] = p.pos;
    walkTo(p, [X + rnd(-14, 14), Math.max(14, Math.min(118, Y + rnd(-5, 5)))], { path: [p.pos, [X + rnd(-14, 14), Math.max(14, Math.min(118, Y + rnd(-5, 5)))]], v: 45, done: () => turnTo(p, yh.X) });
  }
  // where they crowd at a stop: two rows close together, the two newly-weds side by side, a different order each stop
  const SLOTS = [[-48, 12], [-17, 15], [13, 13], [44, 10], [-60, -7], [-30, -5], [-1, -9], [29, -7]];
  function slots(s, i) {
    const units = [['umeko'], ['kaneda'], ['yoshimoto'], ['michiyama'], ['rina'], ['ken', 'ai'], ['yuta']], r = (i * 3) % units.length;
    const ids = units.slice(r).concat(units.slice(0, r)).flat(), [cx, cy] = crowdAt(s), f = yScale(cy) / yScale(60), out = {};
    ids.forEach((id, k) => { out[id] = [cx + SLOTS[k][0] * f + rnd(-4, 4), cy + SLOTS[k][1] + rnd(-2, 2)]; });
    return out;
  }
  const guideAt = (s) => [s.hero[0] + 64, s.hero[1] + 6];
  const crowdAt = (s) => { const dx = s.crowd[0] - s.hero[0]; return [s.hero[0] + Math.sign(dx) * Math.min(112, Math.abs(dx)), s.crowd[1]]; };   // within a phone's view of him
  // the camera over them all: between the crowd's far side and 高橋 (a phone shows some 250 of the land's px), gliding there
  function frameAll(s) {
    if (!alive() || !yCamMax()) return;
    const [cx] = crowdAt(s), g = guideAt(s)[0], w = S.yard.querySelector('.yworld');
    YCAM.free = true; w.classList.add('glide'); yCamTo(S.yard, (cx + Math.sign(cx - g) * 50 + g) / 2); setTimeout(() => w.classList.remove('glide'), 400);
  }
  const facing = (s) => { S.ppl.forEach((p) => { if (!p.walk) turnTo(p, p.id === 'takahashi' ? crowdAt(s)[0] : s.hero[0]); }); };

  // ---- the bar along the foot of the scene: which stop is next, and on ----
  function bar() {
    if (!alive()) return;
    let b = S.yard.querySelector('.cruise-bar');
    const t = tour();
    if (t.step < 0 || t.done) { if (b) b.remove(); return; }
    if (!b) { b = document.createElement('div'); b.className = 'cruise-bar'; b.setAttribute('role', 'status'); S.yard.appendChild(b); }
    const ts = stops(), i = nextStop(t), s = ts[i], n = ts.length;
    const go = s.at !== S.place ? (s.at === 'beach' ? '一起去海邊' : '回漁港') : i === n - 1 ? '送客人上船' : '下一站';
    b.innerHTML = t.place !== S.place ? `<span class="cb-t">遊客在${esc(TOWNEV.PLACE_NAME[t.place] || t.place)}等你</span>`
      : `<span class="cb-n">${i + 1}/${n}</span><span class="cb-t">${esc(s.title)}</span>${S.busy ? '<span class="cb-busy">導覽中…</span>' : `<button type="button" class="btn btn-primary btn-sm" data-act="cruise-next">${go} ▶</button>`}`;
  }

  // ---- a stop: the hero and 高橋 to their places, the passengers crowding round (one lost elsewhere), the talk, the chatter ----
  function run(i) {
    if (!alive() || S.busy) return;
    const s = stops()[i], at = slots(s, i), sc = S;
    S.busy = true; bar();
    let left = 1, fin = false;
    const there = () => { if (--left > 0 || fin) return; fin = true; setTimeout(begin, 250); };
    const begin = () => {
      if (S !== sc || !alive()) return;
      yh.flip = crowdAt(s)[0] < yh.X; yh.turn = true; yh.back = false; yHeroPlace(S.yard); facing(s); frameAll(s);
      S.yard.querySelectorAll('.ysay.cr-say').forEach((b) => b.remove());   // the chatter stops for the talk
      if (s.need) TOWNLIFE.hold(s.need);   // ムギ stays put for his talk (let go as it closes)
      TALK.open(S.yard, 'takahashi', s.lines, () => end(i), null, { ev: true, onLine });
    };
    left++; yHeroWalk(S.yard, s.hero, there);
    left++; walkTo(S.ppl.get('takahashi'), guideAt(s), { v: 120, done: there });
    order().forEach((id, k) => {
      const p = S.ppl.get(id); if (!p) return;
      const lost = s.lost && s.lost[0] === id; p.away = lost;
      left++; walkTo(p, lost ? s.lost[1] : at[id], { delay: k * 80 + rnd(0, 220), v: id === 'umeko' ? 160 : id === 'michiyama' ? 75 : rnd(88, 115), done: there });
    });
    there();
    S.t.push(setTimeout(() => { if (!fin) { left = 1; there(); } }, 5200));   // a walk cut short (the hero sent elsewhere): on after 5 s all the same
  }
  function onLine(L) {
    if (!alive() || !L) return;
    if (L.id === 'all') order().forEach((id, k) => setTimeout(() => hop(id, 'cheer'), k * 60));
    else if (S.ppl.has(L.id)) hop(L.id);
  }
  function end(i) {
    if (!alive()) return;
    const s = stops()[i], t = tour();
    t.step = i + 1; t.place = S.place; save(t);
    if (s.lost) { const p = S.ppl.get(s.lost[0]); if (p) { p.away = false; walkTo(p, [crowdAt(s)[0] + rnd(-40, 40), s.crowd[1] + rnd(-8, 8)], { v: 160, done: () => turnTo(p, yh.X) }); } }
    if (s.bye) { farewell(s); return; }
    (s.after || []).forEach(([id, ja], k) => S.t.push(setTimeout(() => { if (id === 'all') order().forEach((q) => say(q, ja, 1800)); else say(id, ja); }, 300 + k * 650)));
    S.busy = false; bar();
  }
  // on to the next place, all together: everyone toward the way off, the hero leading (yGo); they come in behind him there
  function next() {
    if (!alive() || S.busy || TALK.on()) return;
    const t = tour(); if (t.step < 0 || t.done || t.place !== S.place) return;
    const i = nextStop(t), s = stops()[i];
    if (s.at === S.place) { run(i); return; }
    const way = WAYS[`${S.place}>${s.at}`], btn = S.yard.querySelector(`[data-act="go-place"][data-to="${s.at}"]`);
    if (!way || !btn) return;
    pend = s.at; S.busy = true; bar();
    const o = way.out();
    S.ppl.forEach((p) => walkTo(p, [o[0] + rnd(-36, 36), Math.min(118, o[1] + rnd(-6, 6))], { delay: rnd(100, 700), v: rnd(95, 125) }));
    yGo(btn, s.at);
  }

  // ---- in: the ship tapped far out ----
  function tween(ms, step, done, ease = (u) => 1 - Math.pow(1 - u, 3)) {
    const sc = S, t0 = performance.now();
    if (calm()) { step(1); if (done) done(); return; }
    const f = (now) => { if (S !== sc || !alive()) return; const u = Math.min(1, (now - t0) / ms); step(ease(u)); if (u < 1) requestAnimationFrame(f); else if (done) done(); };
    requestAnimationFrame(f);
  }
  function call(btn) {
    if (!alive() || S.busy || S.place !== 'harbor') return;
    const t = tour(); if (t.step >= 0 || !out()) return;
    S.busy = true; btn.remove();
    S.ct = setTimeout(chatter, 6000); S.jt = setTimeout(jostle, 8000);
    t.step = 0; t.place = 'harbor'; save(t);   // in from now on, should the scene be drawn anew halfway
    const y = S.yard, ship = y.querySelector('.cruise-ship'), front = y.querySelector('.cruise-front'), ramp = y.querySelector('.cruise-ramp');
    yHeroWalk(y, [FOOT_W[0] - 70, 108], () => { yh.back = true; yh.turn = false; yHeroPlace(y); });
    yPop(y, FAR.x, FAR.y - 34, 'ボーッ！');
    if (ship) ship.classList.add('sailing');
    tween(3800, (u) => {   // nearer and nearer: larger as it comes (the scale grows by a ratio, the place moves on evenly)
      if (!ship) return;
      const s = FAR.s * Math.pow(1 / FAR.s, u), ax = FAR.x + (ANCHOR[0] - FAR.x) * u, ay = FAR.y + (ANCHOR[1] - FAR.y) * u;
      ship.setAttribute('transform', xf(ax, ay, s));
    }, () => {
      if (ship) { ship.classList.remove('sailing', 'far'); ship.removeAttribute('transform'); }
      yPop(y, 770, -70, 'ボーーッ！');
      if (front) front.style.opacity = '';
      tween(800, (u) => { if (ramp) ramp.setAttribute('transform', rampT(u)); }, comeOff);
    }, (u) => (u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2) * 0.35 + (1 - Math.pow(1 - u, 3)) * 0.65);
  }
  // 高橋 hurries in with his flag; they come down the gangway one at a time, saying who they are, and crowd round him
  function comeOff() {
    if (!alive()) return;
    const s0 = stops()[0], at = slots(s0, 0), g = el('takahashi', [ycam.YW / 2 + 40, 52]);
    walkTo(g, guideAt(s0), { v: 150, free: true, done: () => { turnTo(g, FOOT_W[0]); say('takahashi', 'みなさん、こちらです〜！'); } });
    order().forEach((id, k) => S.t.push(setTimeout(() => {
      if (!alive()) return;
      const p = el(id, DOOR_W.slice()); p.el.classList.add('cr-in');
      walkTo(p, FOOT_W, { path: [DOOR_W, FOOT_W], v: 70, done: () => {
        const off = C().OFF[id]; if (off) say(id, off[0], 2600);
        const lost = s0.lost && s0.lost[0] === id; p.away = lost;
        walkTo(p, lost ? s0.lost[1] : at[id], { delay: 500, v: id === 'umeko' ? 160 : 100, done: () => turnTo(p, g.pos[0]) });
      } });
    }, 900 + k * 850)));
    S.t.push(setTimeout(() => { if (!alive()) return; S.busy = false; run(0); }, 900 + order().length * 850 + 2600));
  }
  // seen off: up the gangway one at a time with a last word, the gangway in, a blast, the ship away to the right; 高橋 waves it off
  function farewell(s) {
    const y = S.yard, bye = Object.fromEntries((s.after || []).map(([id, ja]) => [id, ja]));
    S.quiet = true; bar();
    order().forEach((id, k) => S.t.push(setTimeout(() => {
      const p = S.ppl.get(id); if (!p) return;
      walkTo(p, FOOT_W, { v: 120, done: () => { say(id, bye[id] || 'さようなら〜！', 2400); walkTo(p, DOOR_W, { path: [FOOT_W, DOOR_W], v: 60, delay: 300, done: () => { p.el.classList.add('cr-gone'); S.t.push(setTimeout(() => { p.el.remove(); S.ppl.delete(id); }, 450)); } }); } });
    }, k * 700)));
    const after = order().length * 700 + 4200, g = S.ppl.get('takahashi');
    S.t.push(setTimeout(() => {
      if (!alive()) return;
      const ship = y.querySelector('.cruise-ship'), front = y.querySelector('.cruise-front'), ramp = y.querySelector('.cruise-ramp');
      tween(700, (u) => { if (ramp) ramp.setAttribute('transform', rampT(1 - u)); }, () => {
        if (front) front.style.opacity = '0';
        yPop(y, 770, -70, 'ボーーッ！');
        if (g) { turnTo(g, 400); g.el.classList.add('wave'); setTimeout(() => g.el.classList.remove('wave'), 1200); say('takahashi', 'さようなら〜！', 2400); }
        if (ship) ship.classList.add('sailing');
        tween(4600, (u) => { if (ship) { ship.setAttribute('transform', `translate(${(900 * u).toFixed(1)} 0)`); ship.style.opacity = String(Math.min(1, (1 - u) * 4)); } }, () => {
          const t = tour(); t.done = true; save(t);
          if (ship) ship.remove();
          toast('郵輪開走了。導覽完成！謝謝你幫忙 🚢', 3600);
          if (g) S.t.push(setTimeout(() => { if (alive()) walkTo(g, [ycam.YW / 2 + 60, 50], { v: 120, free: true, done: () => { g.el.remove(); S.ppl.delete('takahashi'); } }); }, 1600));
          S.busy = false; S.quiet = false; bar();
        }, (u) => u * u);
      });
    }, after));
  }

  // ---- a place drawn anew ----
  function stop() {
    if (!S) return;
    cancelAnimationFrame(S.raf); clearTimeout(S.ct); clearTimeout(S.jt); S.t.forEach(clearTimeout);
    S.ppl.forEach((p) => clearTimeout(p.wt));
    S = null;
  }
  // where they stand when a place is drawn and they are there already: the last stop done here, else the first one here
  function rest(t, place) {
    const ts = stops(); let i = -1;
    for (let k = Math.min(t.step, ts.length) - 1; k >= 0; k--) if (ts[k].at === place) { i = k; break; }
    if (i < 0) i = ts.findIndex((x) => x.at === place);
    return i < 0 ? null : [ts[i], i];
  }
  function mount(yard, place) {
    const from = lastPlace; lastPlace = place;
    stop();
    if (!C() || INDOOR.includes(place) || !out()) { pend = ''; return; }
    const t = tour();
    if (t.step < 0) {   // far out at sea: said once a day out and about, seen from the harbour
      if (t.told !== t.day) { t.told = t.day; save(t); toast(place === 'harbor' ? '海上有一艘好大的郵輪！點它看看。' : '漁港外的海上，好像來了一艘好大的郵輪！', 3600); }
      if (place === 'harbor') S = { yard, place, ppl: new Map(), raf: 0, t: [], busy: false };
      return;
    }
    if (!PLACES.includes(place)) { pend = ''; return; }
    S = { yard, place, ppl: new Map(), raf: 0, t: [], busy: false };
    const follow = from && from !== place && from === t.place && PLACES.includes(from);   // come along with the hero
    if (follow) { t.place = place; save(t); }
    if (t.place === place) {
      const r = rest(t, place), s = r ? r[0] : stops()[0], at = slots(s, r ? r[1] : 0);
      if (follow) {   // in behind him by the way he came, then round him
        const way = WAYS[`${from}>${place}`], in0 = way ? way.in()[0] : [0, 60];
        const g = el('takahashi', [in0[0] + rnd(-20, 20), Math.min(118, in0[1])]);
        walkTo(g, guideAt(s), { delay: 300, v: 130, free: true });
        order().forEach((id, k) => { const p = el(id, [in0[0] + rnd(-30, 30), Math.min(118, in0[1] + rnd(-4, 4))]); p.el.classList.add('cr-in'); walkTo(p, at[id], { delay: 400 + k * 160, v: rnd(100, 130), free: true }); });
        if (pend === place) { S.busy = true; S.t.push(setTimeout(() => { if (!alive()) return; S.busy = false; const i = nextStop(tour()); if (stops()[i].at === place) run(i); else bar(); }, 400 + order().length * 160 + 1600)); }
      } else {
        el('takahashi', guideAt(s));
        order().forEach((id) => el(id, at[id]));
        facing(s); setTimeout(() => frameAll(s), 60);
      }
    }
    pend = '';
    bar();
    S.ct = setTimeout(chatter, 1200); S.jt = setTimeout(jostle, 2000);
  }
  // a tap on one of them: a hop and a word (高橋, when the next stop waits: on to it)
  function who(b) {
    const id = b.dataset.who, p = alive() && S.ppl.get(id); if (!p) return;
    if (id === 'takahashi' && !S.busy && !TALK.on() && tour().place === S.place) { next(); return; }
    HERO.react(b);
    const ls = C().SAY[id] || []; if (!ls.length) return;
    const l = pick(ls); say(id, l[0], 2600); if (!TALK.on()) speakAs(id, l[0]);
  }
  // the talk card's face for one of them, or the passengers together ('all': three of them)
  function talkFace(id) {
    if (id === 'all') return `<span class="cr-crowd">${['umeko', 'rina', 'yoshimoto'].map((k) => HERO.head(C().PEOPLE[k].look, 'bust')).join('')}</span>`;
    const c = person(id); return c ? HERO.head(c.look, 'bust') : '';
  }
  const tag = (id) => (id === 'all' ? { name: 'みんな', role: '遊客們' } : C() && C().PEOPLE[id] ? C().PEOPLE[id] : null);   // TALK's name and role
  // every line said aloud on the cruise, and whose (the generator makes each a clip in their voice)
  function lines(add) {   // ('all', the passengers together: no voice of its own, read as any line)
    const c = C(); if (!c) return; const say = (id, ja) => { if (id !== 'all') add(id, ja); };
    Object.entries(c.OFF).forEach(([id, l]) => say(id, l[0]));
    Object.entries(c.SAY).forEach(([id, ls]) => ls.forEach((l) => say(id, l[0])));
    c.TOUR.forEach((s) => s.lines.forEach((l) => (Array.isArray(l) ? say(l[0], l[1]) : (l.opts || []).forEach((o) => say('hero', o[0])))));
  }
  // the test site (町の手帳): the ship out there now, whatever the day, hour or course; today's begun again
  function force() { const t = tour(); keep({ day: t.day, step: -1, place: 'harbor', done: false, ever: t.ever, told: '', force: t.day }); }
  function reset() { const t = tour(); keep({ day: t.day, step: -1, place: 'harbor', done: false, ever: t.ever, told: '', force: '' }); }
  return { out, docked, shipSvg, rampSvg, callHtml, mount, call: (b) => call(b), next: () => next(), who, face: talkFace, tag, lines, force, reset, tour, person };
})();
