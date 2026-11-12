'use strict';
// ---------- the town's people come alive (test, 2026-11-12; docs/superpowers/specs/2026-11-12-town-life-design.md) ----------
// The user: the people stood about like statues. Out of doors those standing now stroll about their spot (data-roam: how far
// either way, from castHtml; 0: stays), fidget while they stand (HERO.idle), stop and turn to the hero when he comes near (a wave
// the first time), hold still when tapped (TOWNEV.talk walks the hero to where they are now). One scene (.yard) at a time: drawn
// anew, it all begins again from their spots; gone, it stops. still: everyone on their spot (e2e: tests/e2e/cdp.py sets NQ_E2E).
const TOWNLIFE = (() => {
  let S = null;   // the scene: { yard, place, indoor, w: Map id → walker, raf }
  const api = { still: Boolean(window.NQ_E2E || navigator.webdriver) };
  const calm = () => window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const alive = () => Boolean(S && S.yard.isConnected);
  function stop() {
    if (!S) return;
    cancelAnimationFrame(S.raf); S.w.forEach((w) => { clearTimeout(w.t); clearTimeout(w.ht); });
    S = null;
  }
  // drawn where they are, as castHtml draws them; turned as yHeroWalk turns the hero
  function put(w) {
    const [X, Y] = w.pos;
    w.el.style.transform = `translate(${X.toFixed(1)}px,${(-Y).toFixed(1)}px) scale(${(yScale(Y) * w.k).toFixed(3)})`;
    w.el.style.zIndex = String(300 - Math.round(Y));
  }
  function face(w) { w.el.classList.toggle('back', w.back); w.el.classList.toggle('turn', w.turn); w.el.classList.toggle('flip', w.flip); }
  function halt(w, cut = true) {   // cut short (tapped, the hero near, away): their next stroll later on
    if (!w.walk) return;
    w.walk = null; w.el.classList.remove('walk', 'run'); w.back = false; face(w);
    if (cut) later(w, rnd(3000, 6000));
  }
  // may they now: stroll, fidget
  const free = (w) => !api.still && !calm() && !document.hidden && !w.held && !w.near && !(typeof TALK !== 'undefined' && TALK.on());
  function later(w, ms) { clearTimeout(w.t); w.t = setTimeout(() => stroll(w), ms); }
  function stroll(w) {
    if (!alive()) { stop(); return; }
    if (!w.roam) return;   // they stay (walked somewhere once: on arriving, for a talk)
    if (!free(w) || w.walk || w.el.matches('[class*="idle-"]')) { later(w, rnd(2000, 4000)); return; }
    const [dx, dy] = w.roam, [hx, hy] = w.home, top = Math.max(walkTop(S.place, hx), hy);
    const goal = [hx + rnd(-dx, dx), Math.max(12, Math.min(top, hy + rnd(-dy, dy)))];
    walk(w, goal, () => later(w, rnd(4000, 10000)), (end) => Math.abs(end[0] - hx) <= dx && Math.abs(end[1] - hy) <= dy);
  }
  // along yRoute (round what stands in the way); fits: may they end there (a goal moved off a thing may leave their patch)
  function walk(w, to, done, fits) {
    const pts = yRoute(S.place, w.pos, to), end = pts[pts.length - 1], seg = []; let len = 0;
    for (let i = 1; i < pts.length; i++) { const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); if (d) { seg.push([pts[i - 1], pts[i], len, d]); len += d; } }
    if (len < 4 || (fits && !fits(end))) { if (done) done(); return; }
    HERO.still(w.el);
    w.walk = { seg, len, v: w.run ? 150 : 60, t0: performance.now(), on: null, done };
    w.el.classList.add(w.run ? 'run' : 'walk');
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
  api.start = function start(yard, place) {
    stop();
    S = { yard, place, indoor: INDOOR.includes(place), w: new Map(), raf: 0 };
    yard.querySelectorAll('.npc[data-npc]').forEach((el) => {
      const r = (el.dataset.roam || '0').split(',').map(Number), home = [Number(el.dataset.x), Number(el.dataset.y)];
      const w = { el, id: el.dataset.npc, home, pos: home.slice(), k: Number(el.dataset.k) || 1, roam: r.length === 2 ? r : null, run: el.dataset.run === '1',
        back: el.classList.contains('back'), turn: el.classList.contains('turn'), flip: el.classList.contains('flip'), held: false, near: false, waved: false, walk: null };
      S.w.set(w.id, w);
      const seated = el.matches('.bench, .kneel') || (S.indoor && el.matches('.npc-go, .npc-teppei'));   // they nod, cook (CSS) already
      if (!seated) HERO.idle(el, () => free(w) && !w.walk, true);
      if (w.roam) later(w, rnd(1000, 5000));   // the first strolls soon, not all at once
    });
  };
  api.at = (id) => { const w = S && S.w.get(id); return w ? w.pos.slice() : null; };
  // tapped: still where they are until the talk is over (TALK.close → release), or a while if it never opens (tapped elsewhere)
  api.hold = (id) => {
    const w = S && S.w.get(id); if (!w) return null;
    w.held = true; halt(w); HERO.still(w.el);
    clearTimeout(w.ht); w.ht = setTimeout(() => { if (!TALK.on()) w.held = false; }, 8000);
    return w.pos.slice();
  };
  api.release = () => { if (S) S.w.forEach((w) => { w.held = false; }); };
  // the hero has moved: those within 120 px stop and turn to him (a wave the first time this visit); the rest carry on
  api.near = (yard) => {
    if (!S || S.yard !== yard || S.indoor || api.still) return;
    S.w.forEach((w) => {
      const dx = yh.X - w.pos[0], close = Math.hypot(dx, yh.Y - w.pos[1]) < 120;
      if (!close) { w.near = false; return; }
      if (w.el.matches('.bench, .kneel')) return;
      halt(w); w.back = false; w.turn = Math.abs(dx) > 20; if (w.turn) w.flip = dx < 0; face(w);
      if (!w.near && !w.waved && !calm()) { w.waved = true; HERO.still(w.el); w.el.classList.add('idle-wave'); setTimeout(() => w.el.classList.remove('idle-wave'), 1500); }
      w.near = true;
    });
  };
  document.addEventListener('visibilitychange', () => { if (document.hidden && S) S.w.forEach(halt); });   // away: they stop (they stroll again on their next turn)
  return api;
})();
