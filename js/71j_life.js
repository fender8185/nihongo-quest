'use strict';
// ---------- the town's people come alive (test, 2026-11-12; docs/superpowers/specs/2026-11-12-town-life-design.md) ----------
// The user: the people stood about like statues. Out of doors those standing now stroll about their spot (data-roam: how far
// either way, from castHtml; 0: stays), fidget while they stand (HERO.idle), stop and turn to the hero when he comes near (a wave
// the first time), hold still when tapped (TOWNEV.talk walks the hero to where they are now). Now and then words pop up over
// someone's head (TOWN.MUTTER), or two who are about together talk (TOWN.PAIRS: one walks over first if they stand far apart).
// When the hour sends someone elsewhere they walk off that way before the place is drawn anew (change), and who comes walks in
// from where they come from. One scene (.yard) at a time: drawn anew, it all begins again from their spots; gone, it stops.
// still: everyone on their spot, no words (e2e: tests/e2e/cdp.py sets NQ_E2E).
const TOWNLIFE = (() => {
  let S = null;   // the scene: { yard, place, indoor, w: Map id → walker, raf, bt: the next words, t: timers, leaving, pairing }
  let coming = null;   // who walks in once the place is drawn anew (change): { place, ids }
  const api = { still: Boolean(window.NQ_E2E), gap: [8000, 15000] };
  const calm = () => window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const alive = () => Boolean(S && S.yard.isConnected);
  const talking = () => typeof TALK !== 'undefined' && TALK.on();
  function stop() {
    if (!S) return;
    cancelAnimationFrame(S.raf); clearTimeout(S.bt); S.t.forEach(clearTimeout); S.w.forEach((w) => { clearTimeout(w.t); clearTimeout(w.ht); });
    S = null;
  }
  // drawn where they are, as castHtml draws them; turned as yHeroWalk turns the hero
  function put(w) {
    const [X, Y] = w.pos;
    w.el.style.transform = `translate(${X.toFixed(1)}px,${(-Y).toFixed(1)}px) scale(${(yScale(Y) * w.k).toFixed(3)})`;
    w.el.style.zIndex = String(300 - Math.round(Y));
  }
  function face(w) { w.el.classList.toggle('back', w.back); w.el.classList.toggle('turn', w.turn); w.el.classList.toggle('flip', w.flip); }
  const turnTo = (w, x) => { if (w.el.matches('.bench, .kneel') || S.indoor) return; const dx = x - w.pos[0]; w.back = false; w.turn = Math.abs(dx) > 20; if (w.turn) w.flip = dx < 0; face(w); };
  function halt(w, cut = true) {   // cut short (tapped, the hero near, away): their next stroll later on
    if (!w.walk) return;
    w.walk = null; w.el.classList.remove('walk', 'run'); w.back = false; face(w);
    if (cut) later(w, rnd(3000, 6000));
  }
  // may they now: stroll, fidget
  const free = (w) => !api.still && !calm() && !document.hidden && !w.held && !w.near && !talking();
  function later(w, ms) { clearTimeout(w.t); w.t = setTimeout(() => stroll(w), ms); }
  function stroll(w) {
    if (!alive()) { stop(); return; }
    if (!w.roam) {   // they stay; stopped on their way in (tapped, the hero near): on to their spot once free
      if (Math.hypot(w.pos[0] - w.home[0], w.pos[1] - w.home[1]) < 2) return;
      if (!free(w) || w.walk) later(w, rnd(2000, 4000)); else walk(w, w.home, null, { within: 3 });
      return;
    }
    if (!free(w) || w.walk || w.el.matches('[class*="idle-"]')) { later(w, rnd(2000, 4000)); return; }
    const [dx, dy] = w.roam, [hx, hy] = w.home, top = Math.max(walkTop(S.place, hx), hy);
    const goal = [hx + rnd(-dx, dx), Math.max(12, Math.min(top, hy + rnd(-dy, dy)))];
    walk(w, goal, () => later(w, rnd(4000, 10000)), { fits: (end) => Math.abs(end[0] - hx) <= dx && Math.abs(end[1] - hy) <= dy });
  }
  // along yRoute (round what stands in the way). o.fits: may they end there (a goal moved off a thing may leave their patch);
  // o.free: off the place's edge (on the way out); o.within: there in that many seconds at most (the way off, the way in, over)
  function walk(w, to, done, o = {}) {
    const pts = yRoute(S.place, w.pos, to, o.free), end = pts[pts.length - 1], seg = []; let len = 0;
    for (let i = 1; i < pts.length; i++) { const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); if (d) { seg.push([pts[i - 1], pts[i], len, d]); len += d; } }
    if (len < 4 || (o.fits && !o.fits(end))) { if (done) done(); return; }
    HERO.still(w.el);
    const v = Math.max(w.run ? 150 : 60, o.within ? len / o.within : 0);
    w.walk = { seg, len, v, t0: performance.now(), on: null, done };
    w.el.classList.add(v > 140 ? 'run' : 'walk');
    if (!S.raf) S.raf = requestAnimationFrame(frame);
  }
  function frame(now) {
    S.raf = 0;
    if (!alive()) { stop(); return; }
    const s = S;
    s.w.forEach((w) => {
      const m = w.walk; if (!m) return;
      const d = Math.min(m.len, (now - m.t0) / 1000 * m.v), q = m.seg.find((x) => d <= x[2] + x[3]) || m.seg[m.seg.length - 1], t = Math.min(1, (d - q[2]) / q[3]);
      if (q !== m.on) { m.on = q; const ddx = q[1][0] - q[0][0], ddy = q[1][1] - q[0][1]; w.back = ddy > 0; if (Math.abs(ddx) > 1) w.flip = ddx < 0; w.turn = Math.abs(ddx) > 0.5 * Math.abs(ddy); face(w); }
      w.pos = [q[0][0] + (q[1][0] - q[0][0]) * t, q[0][1] + (q[1][1] - q[0][1]) * t]; put(w);
      if (d < m.len) return;
      halt(w, false); if (m.done) m.done();
    });
    if (S === s && !s.raf && [...s.w.values()].some((w) => w.walk)) s.raf = requestAnimationFrame(frame);
  }
  // ---- words over their heads ----
  const MARK = /\{([^|}]+)\|([^|}]+)(?:\|([^}]+))?\}/g;   // as TALK writes them, without the glosses
  const ruby = (s) => esc(s).replace(MARK, '<ruby>$1<rt>$2</rt></ruby>');
  // may they say it: the unit reached, its conditions (CHATPICK) where they are now
  const sayable = (id, l, ctx) => { const u = TOWNEV.unitIdx(l[0]); return u >= 0 && u <= TOWNEV.reachedIdx() && CHATPICK.ok(l[3], ctx || TOWNEV.chatCtx(id)); };
  api.say = (id, ja, ms = 2500) => {
    const w = S && S.w.get(id); if (!w || !ja) return;
    const old = S.yard.querySelector(`.ysay[data-who="${id}"]`); if (old) old.remove();
    const el = yBubble(S.yard, w.pos[0] + 600, 370 - w.pos[1] - 196 * yScale(w.pos[1]) * w.k, ruby(ja), ms);
    if (el) el.dataset.who = id;
    if (!w.pairing) later(w, ms + rnd(500, 2000));   // the words stay over them: no stroll while they show
  };
  function chatter() {
    if (!alive()) { stop(); return; }
    S.bt = setTimeout(chatter, rnd(api.gap[0], api.gap[1]));
    if (api.still || document.hidden || talking() || S.leaving || S.pairing) return;
    const idle = [...S.w.values()].filter((w) => !w.walk && !w.held && !w.near);
    if (Math.random() < 1 / 3 && tryPair(idle)) return;
    const m = TOWNEV.chatMem();   // read once a tick
    const can = idle.map((w) => { const x = TOWNEV.chatCtx(w.id, m); return [w, ((TOWN.MUTTER || {})[w.id] || []).filter((l) => sayable(w.id, l, x))]; }).filter(([, ls]) => ls.length);
    if (!can.length) return;
    const [w, ls] = can[Math.floor(Math.random() * can.length)];
    api.say(w.id, ls[Math.floor(Math.random() * ls.length)][1]);
  }
  // two about together, both met: a line each in turn, two seconds apart
  function tryPair(idle) {
    const here = new Set(idle.map((w) => w.id));
    const can = (TOWN.PAIRS || []).filter(([two, u, , c]) => two.every((id) => here.has(id) && TOWNEV.seen(id)) && sayable(two[0], [u, '', '', c]));
    if (!can.length) return false;
    const [two, , lines] = can[Math.floor(Math.random() * can.length)];
    pair(two[0], two[1], lines);
    return true;
  }
  function pair(a, b, lines) {
    const A = S.w.get(a), B = S.w.get(b); if (!A || !B) return;
    const s = S; s.pairing = true; [A, B].forEach((w) => { w.held = true; w.pairing = true; halt(w, false); clearTimeout(w.t); HERO.still(w.el); });
    const end = () => { if (S !== s || !s.pairing) return; s.pairing = false; s.endPair = null; [A, B].forEach((w) => { w.held = false; w.pairing = false; later(w, rnd(2000, 5000)); }); };
    s.endPair = end;   // one of them tapped on the way over: no talk, both free again (hold)
    const talk = () => {
      if (S !== s || !alive() || !s.pairing) return;
      turnTo(A, B.pos[0]); turnTo(B, A.pos[0]);
      lines.forEach(([who, ja], i) => s.t.push(setTimeout(() => { if (S === s && alive() && s.pairing && !talking()) api.say(who, ja, 1900); }, i * 2000)));
      s.t.push(setTimeout(end, lines.length * 2000 + 400));
    };
    const far = Math.hypot(A.pos[0] - B.pos[0], A.pos[1] - B.pos[1]) > 160, mover = far && !calm() && !api.still ? (A.roam ? A : B.roam ? B : null) : null;
    if (!mover) { talk(); return; }
    const other = mover === A ? B : A, side = mover.pos[0] < other.pos[0] ? -1 : 1;   // beside them, on the side they come from
    walk(mover, [other.pos[0] + side * 160 * yScale(other.pos[1]), other.pos[1] + 2], talk, { within: 4 });
  }
  api.pair = (a, b) => { const p = (TOWN.PAIRS || []).find(([two]) => two.includes(a) && two.includes(b)); if (p && S) pair(p[0][0], p[0][1], p[2]); };
  // ---- the hour moves them on ----
  const edge = (pos) => [(pos[0] < 0 ? -1 : 1) * (ycam.YW / 2 + 60), pos[1]];
  function wayOut(id, place, pos) {   // toward where they go next (the way there off this place), else the nearer edge
    const at = TOWNEV.whereIs(id, TOWNEV.now(), TOWNEV.today()), n = at && at.place !== place && TOWNEV.hop(place, at.place), way = n && WAYS[`${place}>${n}`];
    return way ? way.out() : edge(pos);
  }
  function wayIn(id, place, home) {   // from where they were a moment ago (the way in from there), else the nearer edge
    const at = TOWNEV.whereIs(id, (TOWNEV.now() + 23.95) % 24, TOWNEV.today()), n = at && at.place !== place && TOWNEV.hop(place, at.place), way = n && WAYS[`${n}>${place}`];
    return way ? way.in()[0] : edge(home);
  }
  // the hour moved things on (sceneMinute): those leaving walk off first (4 s at most), then done (drawn anew, shop doors and all);
  // who comes walks in then, who only moves to another spot here walks over to it (start). A sleep, the test site's clock: at once
  api.change = (yard, done) => {
    const place = yard.dataset.place;
    if (S && S.yard === yard && S.leaving) return;   // already on their way
    if (!S || S.yard !== yard || S.indoor || api.still || calm()) { done(); return; }
    const now = TOWNEV.here(place), there = new Set(now.map((p) => p.id)), going = [...S.w.keys()].filter((id) => !there.has(id));
    const from = {}; now.forEach(({ id, spot }) => { const w = S.w.get(id); if (w && Math.hypot(spot.X - w.home[0], spot.Y - w.home[1]) > 1) from[id] = w.pos.slice(); });
    coming = { place, ids: [...there].filter((id) => !S.w.has(id)), from, at: Date.now() };
    if (!going.length) { done(); return; }
    const s = S; s.leaving = true; let left = going.length, fin = false;
    const end = () => { if (fin) return; fin = true; if (S === s) s.leaving = false; if (s.yard.isConnected) done(); };   // gone elsewhere meanwhile: nothing to draw
    s.t.push(setTimeout(end, 4000));
    going.forEach((id) => {
      const w = s.w.get(id); w.held = true; w.leaving = true; clearTimeout(w.t); halt(w, false); w.el.classList.remove('bench', 'kneel');   // up off the bench first
      walk(w, wayOut(id, place, w.pos), () => { w.el.classList.add('out'); if (--left === 0) s.t.push(setTimeout(end, 300)); }, { free: true, within: 3.4 });
    });
  };
  api.start = function start(yard, place) {
    stop();
    S = { yard, place, indoor: INDOOR.includes(place), w: new Map(), raf: 0, bt: 0, t: [], leaving: false, pairing: false };
    const c = coming && coming.place === place && Date.now() - coming.at < 8000 && !S.indoor && !api.still && !calm() ? coming : { ids: [], from: {} }, walkIn = c.ids, moved = c.from; coming = null;   // an old one (left meanwhile): none
    yard.querySelectorAll('.npc[data-npc]').forEach((el) => {
      const r = (el.dataset.roam || '0').split(',').map(Number), home = [Number(el.dataset.x), Number(el.dataset.y)];
      const w = { el, id: el.dataset.npc, home, pos: home.slice(), k: Number(el.dataset.k) || 1, roam: r.length === 2 ? r : null, run: el.dataset.run === '1',
        back: el.classList.contains('back'), turn: el.classList.contains('turn'), flip: el.classList.contains('flip'), held: false, near: false, waved: false, walk: null };
      S.w.set(w.id, w);
      const seated = el.matches('.bench, .kneel'), busy = seated || (S.indoor && el.matches('.npc-go, .npc-teppei'));   // they nod, cook (CSS) already
      if (!busy) HERO.idle(el, () => free(w) && !w.walk, true);
      const was = moved[w.id];   // in from the way they come, or over from their last spot here (the seated: there already)
      if ((walkIn.includes(w.id) || was) && !seated) { w.pos = was || wayIn(w.id, place, home); put(w); walk(w, home, () => later(w, rnd(4000, 8000)), { free: !was, within: 3.4 }); }
      else if (w.roam) later(w, rnd(1000, 5000));   // the first strolls soon, not all at once
    });
    S.bt = setTimeout(chatter, rnd(api.gap[0] / 2, api.gap[1] / 2));
  };
  api.at = (id) => { const w = S && S.w.get(id); return w ? w.pos.slice() : null; };
  // tapped: still where they are until the talk is over (TALK.close → release), or a while if it never opens (tapped elsewhere)
  api.hold = (id) => {
    const w = S && S.w.get(id); if (!w) return null;
    if (w.pairing && S.endPair) S.endPair();
    w.held = true; halt(w); HERO.still(w.el);
    clearTimeout(w.ht); w.ht = setTimeout(() => { if (!talking() && !w.pairing && !w.leaving) w.held = false; }, 8000);
    return w.pos.slice();
  };
  api.release = () => { if (S) S.w.forEach((w) => { if (!w.pairing && !w.leaving) w.held = false; }); };
  // the hero has moved: those within 120 px stop and turn to him (a wave the first time this visit); the rest carry on
  api.near = (yard) => {
    if (!S || S.yard !== yard || S.indoor || api.still) return;
    S.w.forEach((w) => {
      if (w.leaving || w.pairing) return;
      const dx = yh.X - w.pos[0], close = Math.hypot(dx, yh.Y - w.pos[1]) < 120;
      if (!close) { w.near = false; return; }
      if (w.el.matches('.bench, .kneel')) return;
      halt(w); turnTo(w, yh.X);
      if (!w.near && !w.waved && !calm()) { w.waved = true; HERO.still(w.el); w.el.classList.add('idle-wave'); setTimeout(() => w.el.classList.remove('idle-wave'), 1500); }
      w.near = true;
    });
  };
  document.addEventListener('visibilitychange', () => { if (document.hidden && S) S.w.forEach((w) => { if (!w.leaving && !w.pairing) halt(w); }); });   // away: they stop (and stroll again on their next turn)
  return api;
})();
