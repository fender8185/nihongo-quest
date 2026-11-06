/* Mascot, test build: Cat_02 lives on a strip above the 今日 card and stands on the card's top edge.
 * The cat is drawn and played by the files in design/ (neon_cat/ player and action builder, cat_02/ data and 100
 * actions), loaded the first time 今日 is drawn. renderToday() leaves an empty #mascotSlot and calls Mascot.mount();
 * the same strip moves into each new slot, so a move in progress carries on through a redraw.
 * It rolls in when the app opens, stands about, every few seconds does one of its bored moves or wanders to another
 * spot, and curls up asleep after a couple of quiet minutes. Tap it and it reacts (three quick taps make it dizzy);
 * tap the floor and it goes there. A finished day gets 完成今天 once; a day not started gets 提醒練習 now and then.
 * Reduced motion: it only stands there.
 */
(function () {
  'use strict';
  const FILES = ['./design/cat_02/cat_02-data.js', './design/neon_cat/player.js', './design/neon_cat/builder.js', './design/cat_02/actions.js'];
  const TOP = 180, FLOOR = 1012;   // Cat_02's head top and feet, in cat units
  const FILL = .72;                // share of the strip's height the standing cat takes; the rest is room for hops
  const REACH = 330;               // cat units from its middle to its farthest arm or effect: kept inside the strip
  const BODY = 250;                // half its body: a tap closer than this is a tap on the cat
  const SLEEP_AFTER = 12;          // moves of its own without a tap before it dozes off
  const BORED = ['bored.yawn', 'bored.stretch', 'bored.sway', 'bored.stepInPlace', 'bored.sitIdle', 'bored.kick', 'bored.rollAcross', 'bored.lookAround', 'bored.lickPaw', 'bored.bellyWiggle'];
  const HAPPY = ['happy.4', 'happy.5', 'happy.6', 'happy.7', 'happy.8', 'happy.9', 'react.shy', 'react.love', 'react.purr', 'react.heartArms', 'react.wink', 'react.clap', 'dance.wiggle', 'dance.spinDance'];
  // moves that keep the standing pose in place: a tap cuts them short (anything else finishes first, then the tap counts)
  const CUTTABLE = new Set(['base.stand', 'bored.yawn', 'bored.stretch', 'bored.sway', 'bored.stepInPlace', 'bored.lookAround', 'bored.lickPaw', 'study.remind']);
  const DONE_KEY = 'nq_mascot_done';   // the day 完成今天 was last played
  // the strip reaches out over the page's side padding, so the cat can roll in from the edge of the screen
  const CSS = `
.mascot { position: relative; z-index: 1; height: 150px; margin: -8px -32px -1px; overflow-x: clip; cursor: pointer;
  -webkit-user-select: none; user-select: none; -webkit-touch-callout: none; }
.mascot-stage { display: block; width: 100%; height: 100%; overflow: visible; }
@media (max-width: 900px) { .mascot { height: clamp(78px, 14svh, 128px); margin: -4px -16px -1px; } }
[data-theme="light"] .mascot-stage { filter: invert(1) hue-rotate(180deg); }   /* the neon is drawn for a dark ground */
`;

  let el = null, svg = null, cat = null, K = null, M = null, loading = null;
  let W = 0, H = 0, S = .1, x = -1;   // the strip (px), the cat's scale, its spot (px from the strip's left edge)
  let side = 0;                       // the strip's overhang past the card on each side (px)
  let gen = 0, timer = 0, watch = 0, parked = true, entered = false, asleep = false, moves = 0, current = '', pending = null;
  let today = {}, taps = [];
  const bags = {};

  const rand = (a, b) => a + Math.random() * (b - a);
  const reduced = () => !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  // where it may stand: its body over the card, its arms and effects inside the strip
  const lo = () => Math.max(REACH * S, side + BODY * S);
  const hi = () => Math.max(lo(), W - lo());
  // a shuffled round of a list: every item comes up once before any comes up again
  function draw(name, list) {
    if (!bags[name] || !bags[name].length) bags[name] = list.slice().sort(() => Math.random() - .5);
    return bags[name].pop();
  }

  function load() {
    if (!loading) loading = FILES.reduce((p, src) => p.then(() => new Promise((ok, fail) => {
      const s = document.createElement('script');
      s.src = src; s.onload = ok; s.onerror = () => fail(new Error('mascot: cannot load ' + src));
      document.head.appendChild(s);
    })), Promise.resolve());
    return loading;
  }

  function fit() {
    if (!el || !cat) return;
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) return;
    W = r.width; H = r.height; S = FILL * H / (FLOOR - TOP);
    side = Math.max(0, -parseFloat(getComputedStyle(el).marginLeft) || 0);
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    if (x < 0) x = W * .62;
    x = Math.min(hi(), Math.max(lo(), x));
    place();
  }
  function place() { cat.root.setAttribute('transform', `translate(${x.toFixed(1)} ${(H - 2).toFixed(1)}) scale(${S.toFixed(4)})`); }

  // ---- moves made on the spot: each starts where the cat stands and ends on its new spot ----
  // (the strip's spot moves first and the action starts the same distance back, so nothing jumps)
  function start(b, dx) { b.k('move', 0, {x: -dx}); b.mx = -dx; return b; }
  function walkBy(dx, fast) {
    const step = fast ? 260 : 460, speed = fast ? .6 : .26;   // cat units per ms
    const len = Math.max(2, Math.round(Math.abs(dx) / speed / step)) * step;
    const b = start(new K.B(len + 700), dx);
    M.waddle(b, 300, 300 + len, dx, {step, sway: fast ? 6 : 4, bob: fast ? 12 : 8});
    b.wag(300, 300 + len, step, fast ? 9 : 7);
    if (fast) b.face(150, {eyes: 'happy', mouth: 'open'}).face(len + 450, {eyes: 'normal', mouth: 'w'});
    else b.twitch(len + 380, dx > 0 ? 'R' : 'L');
    return b.out('app.walk', 'app', '走過去');
  }
  // the ball turns a whole number of times, so it opens up the right way round (it slips a little to make up)
  function rollKeys(b, t, dist, len) {
    const turns = Math.max(1, Math.round(Math.abs(dist) / K.TURN)) * Math.sign(dist);
    b.k('ball', t, {r: b.br}, K.ROLL_EASE); b.moveTo(t, null, null, K.ROLL_EASE);
    b.br += 360 * turns; b.mx += dist;
    b.k('ball', t + len, {r: b.br}); b.at(t + len);
    return t + len;
  }
  function rollBy(dx) {
    const b = start(new K.B(0), dx);
    const t = rollKeys(b, b.tuck(250), dx, Math.max(900, Math.abs(dx) / .8));
    b.untuck(t + 80).face(t + 80, {eyes: 'happy'}).face(t + 800, {eyes: 'normal'});
    b.dur = t + 1000;
    return b.out('app.roll', 'app', '滾過去');
  }
  function hopBy(dx) {
    const n = Math.max(1, Math.ceil(Math.abs(dx) / 220)), each = dx / n;
    const b = start(new K.B(300 + n * 470 + 600), dx);
    for (let i = 0; i < n; i++) M.hopTo(b, 300 + i * 470, -dx + i * each, -dx + (i + 1) * each, 70, 460);
    b.face(150, {eyes: 'happy', mouth: 'open'}).face(300 + n * 470 + 250, {eyes: 'normal', mouth: 'w'});
    return b.out('app.hop', 'app', '跳過去');
  }
  // to a spot (px), or anywhere at least a quarter of the floor away; null when it is already there
  function roam(to, fast) {
    if (to == null) {
      const span = hi() - lo();
      for (let i = 0; i < 6; i++) { to = rand(lo(), hi()); if (Math.abs(to - x) > span * .25) break; }
    }
    to = Math.min(hi(), Math.max(lo(), to));
    const dx = (to - x) / S;
    if (Math.abs(dx) < 120) return null;
    const r = Math.random();
    const a = Math.abs(dx) > K.TURN * .8 && r < (fast ? .5 : .45) ? rollBy(dx) : !fast && r > .8 ? hopBy(dx) : walkBy(dx, fast);
    return {a, to};
  }
  function rollIn() {   // from just past the strip's left edge
    const dx = x / S + K.BALL_R + 40;
    const b = start(new K.B(0), dx).pose(0, 'ball');
    const t = rollKeys(b, 200, dx, Math.max(1100, dx / .9));
    b.untuck(t + 60).face(t + 60, {eyes: 'happy', mouth: 'open'}).face(t + 1500, {eyes: 'normal', mouth: 'w'});
    M.raise(b, t + 120, 'R'); M.raise(b, t + 120, 'L'); M.lower(b, t + 1400, 'R'); M.lower(b, t + 1400, 'L');
    b.fx(t + 100, 'sparkle', {x: 780, y: 300, s: .5, anim: 'pop', dur: 700});
    b.dur = t + 1700;
    return {a: b.out('app.rollIn', 'app', '滾進來')};
  }
  function curlUp() {   // tucks into a sleeping ball; the 縮成球 loop takes over from there
    const b = new K.B(1600);
    const t = b.tuck(200);
    b.ballFace(t, 'sleep').fx(t + 300, 'z', {x: 640, y: 616, s: .6, anim: 'float', dur: 1100, dx: 60, rise: 160});
    return {a: b.out('app.curlUp', 'app', '睡著')};
  }
  function wakeUp() {
    const b = new K.B(3800);
    b.pose(0, 'ball').ballFace(0, 'sleep').ballTwitch(100, 'L').untuck(450);
    b.face(450, {eyes: 'squeeze', mouth: 'O'}).face(2500, {eyes: 'happy', mouth: 'w'}).face(3400, {eyes: 'normal'});
    M.banzai(b, 900, 2600);
    b.k('cat', 900, {}).k('cat', 1250, {sy: 1.07, sx: .96}).k('cat', 2300, {sy: 1.07, sx: .96}).k('cat', 2700, {});
    b.twitch(3000, 'L');
    return {a: b.out('app.wakeUp', 'app', '醒來')};
  }

  // ---- what it does ----
  // one step: an action id, or {a: action, to: px} — a move to another spot
  function run(step, g) {
    if (g !== gen) return Promise.resolve(false);
    if (step.to != null) { x = step.to; place(); }
    current = step.a ? step.a.id : step;
    return cat.play(step.a || step).then(() => g === gen);
  }
  function idle(g, wait = rand(6000, 12000), then = null) {
    if (g !== gen) return;
    if (pending) { const p = pending; pending = null; react(p); return; }
    current = 'base.stand'; cat.play('base.stand', {loop: true});
    clearTimeout(timer); timer = setTimeout(() => next(g, then), wait);
  }
  async function next(g, then) {
    if (g !== gen) return;
    if (!el.isConnected || document.hidden) { park(); return; }
    if (++moves > SLEEP_AFTER) { doze(g); return; }
    if (await run(then || choose(), g)) idle(g);
  }
  function choose() {
    const r = Math.random();
    if (!today.started && !today.done && r < .15) return 'study.remind';
    if (r < .5) { const m = roam(); if (m) return m; }
    for (let i = 0; i <= BORED.length; i++) {
      const id = draw('bored', BORED);
      if (id !== 'bored.rollAcross' || x + (K.TURN + REACH) * S <= W) return id;   // it rolls one turn to the right and back
    }
    return 'bored.sway';
  }
  async function doze(g) {
    if (!await run('react.sleepy', g)) return;
    if (pending) { idle(g); return; }   // tapped while nodding off: stays awake
    if (!await run(curlUp(), g)) return;
    asleep = true; current = 'base.ball';
    cat.play('base.ball', {loop: true});
  }
  async function go(step) {
    const g = ++gen; clearTimeout(timer);
    if (await run(step, g)) idle(g);
  }
  function react(p) {
    if (p.cat) go(taps.length >= 3 ? 'react.dizzy' : draw('happy', HAPPY));
    else go(roam(p.px, true) || draw('happy', HAPPY));
  }
  function tap(e) {
    if (!cat || parked || reduced()) return;
    const now = Date.now(); taps = taps.filter((t) => now - t < 1600).concat(now);
    moves = 0;
    if (asleep) { asleep = false; go(wakeUp()); return; }
    const px = e.clientX - el.getBoundingClientRect().left;
    const p = {cat: Math.abs(px - x) < BODY * S, px};
    if (CUTTABLE.has(current)) react(p);
    else pending = p;   // after the move it is in
  }

  // ---- on the page ----
  async function begin(greet) {
    parked = false;
    const g = ++gen;
    try { await load(); } catch (e) { console.warn(e); el.remove(); return; }
    if (g !== gen) return;
    if (!cat) {
      cat = new window.NeonCat(svg, {data: window.CAT02_DATA, actions: window.CAT02_ACTIONS, x: 0, floor: 0, scale: 1, pose: 'stand'});
      K = window.CAT02_MOVES.K; M = window.CAT02_MOVES;
    }
    fit();
    clearInterval(watch); watch = setInterval(() => { if (!el.isConnected) park(); }, 1000);
    if (reduced()) { cat.stop(); return; }
    if (asleep) { current = 'base.ball'; cat.play('base.ball', {loop: true}); return; }
    const first = !entered; entered = true;
    if (first && !await run(rollIn(), g)) return;
    if (!first && greet && !await run('react.hello', g)) return;
    let shown = '';
    try { shown = localStorage.getItem(DONE_KEY) || ''; } catch (e) { /* private mode */ }
    if (today.done && today.day && shown !== today.day) {
      try { localStorage.setItem(DONE_KEY, today.day); } catch (e) { /* private mode */ }
      if (!await run('study.done', g)) return;
      idle(g);
    } else if (first && !today.started && !today.done) idle(g, 2500, 'study.remind');
    else idle(g);
  }
  function park() {
    gen++; clearTimeout(timer); clearInterval(watch);
    parked = true; pending = null;
    if (cat) cat.stop();
  }
  function mount(slot, info) {
    if (!slot) return;
    today = info || {};
    if (!el) {
      const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
      el = document.createElement('div'); el.className = 'mascot'; el.setAttribute('aria-hidden', 'true');
      svg = el.appendChild(document.createElementNS('http://www.w3.org/2000/svg', 'svg'));
      svg.setAttribute('class', 'mascot-stage');
      el.addEventListener('click', tap);
      if (window.ResizeObserver) new ResizeObserver(fit).observe(el);
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) park(); else if (el.isConnected && parked) begin(false);
      });
    }
    slot.appendChild(el);
    if (parked) begin(true);
  }

  // peek(): what it is up to, for checks from the console
  window.Mascot = {mount, peek: () => ({current, x: Math.round(x), lo: Math.round(lo()), hi: Math.round(hi()), W: Math.round(W), asleep, parked, moves})};
})();
