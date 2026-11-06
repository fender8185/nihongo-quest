/* Neon cat player (shared by Cat_01, Cat_02, ...).
 * Draws a cat from its data file (cat_0N-data.js, made by that cat's build.py) into an <svg> and plays its actions.
 *   const cat = new NeonCat(svg, {data: CAT01_DATA, actions: CAT01_ACTIONS, x: 1000, floor: 660, scale: .5});
 *   cat.play('bored.yawn').then(...)        // once; resolves when it ends, back on the resting pose
 *   cat.play('base.sit', {loop: true})
 *   cat.play(K.B-built action)               // or an action object made on the spot (b.out(...))
 * Every change is a Web Animation on the action's own clock (poses switch through opacity, parts and face pieces
 * through `visibility`, both with step-end), so record.py can stop any action at any moment and photograph it.
 */
(function () {
  'use strict';
  const NS = 'http://www.w3.org/2000/svg';
  const SLOTS = ['eyes', 'mouth', 'tongue', 'brows', 'cheeks'];
  let uid = 0;

  function mk(tag, attrs, parent) {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) if (attrs[k] != null) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  const origin = (p) => `transform-box:view-box;transform-origin:${p[0]}px ${p[1]}px`;
  // a piece of line art: drawn once per glow step of its tone, widest and darkest first
  function tube(tones, parent, pieces) {
    for (const {tone, d} of pieces)
      for (const [w, c, o] of tones[tone]) mk('path', {d, stroke: c, 'stroke-width': w, opacity: o}, parent);
  }

  // effect motions, as keyframes between the effect's start (0) and end (1); x/y in cat units
  const FX_MOTION = {
    float: (p) => [[0, 0, 0, .6, 0], [.15, (p.dx || 0) * .15, -(p.rise || 140) * .15, 1, 1], [.75, (p.dx || 0) * .75, -(p.rise || 140) * .75, 1, 1], [1, p.dx || 0, -(p.rise || 140), 1, 0]],
    pop: () => [[0, 0, 0, 0, 0], [.22, 0, 0, 1.25, 1], [.36, 0, 0, 1, 1], [.84, 0, 0, 1, 1], [1, 0, 0, 1, 0]],
    fall: (p) => [[0, 0, 0, 1, 0], [.1, 0, 0, 1, 1], [1, p.dx || 0, p.fall || 160, 1, 0]],
    rise: (p) => [[0, 0, 0, .5, .9], [1, p.dx || 0, -(p.rise || 120), 1.5, 0]],
    burst: (p) => [[0, 0, 0, .4, 1], [.7, (p.dx || 0) * .9, (p.dy || -120) * .9, 1, 1], [1, p.dx || 0, (p.dy || -120) + 40, 1, 0]],
    hold: () => [[0, 0, 0, .8, 0], [.12, 0, 0, 1, 1], [.5, 0, -6, 1, 1], [.88, 0, 0, 1, 1], [1, 0, 0, 1, 0]],
    blink: () => [[0, 0, 0, 1, 0], [.1, 0, 0, 1, 1], [.3, 0, 0, 1, .2], [.5, 0, 0, 1, 1], [.7, 0, 0, 1, .2], [.9, 0, 0, 1, 1], [1, 0, 0, 1, 0]],
    orbit: (p) => {
      const out = [], n = 16, rx = p.rx || 120, ry = p.ry || 30, a0 = p.a0 || 0;
      for (let i = 0; i <= n; i++) {
        const a = a0 + (i / n) * Math.PI * 2 * (p.turns || 1.5);
        out.push([i / n, rx * Math.cos(a), ry * Math.sin(a), 1, i === 0 || i === n ? 0 : 1]);
      }
      return out;
    },
    slide: (p) => [[0, 0, 0, 1, 0], [.1, (p.dx || 0) * .1, (p.dy || 0) * .1, 1, 1], [.9, (p.dx || 0) * .9, (p.dy || 0) * .9, 1, 1], [1, p.dx || 0, p.dy || 0, 1, 0]],
    pulse: () => [[0, 0, 0, .6, 0], [.15, 0, 0, 1.1, 1], [.3, 0, 0, .95, 1], [.45, 0, 0, 1.08, 1], [.6, 0, 0, 1, 1], [.9, 0, 0, 1, 1], [1, 0, 0, 1, 0]],
    shake: () => [[0, 0, 0, 1, 0], [.1, -6, 0, 1, 1], [.25, 6, 0, 1, 1], [.4, -6, 0, 1, 1], [.55, 6, 0, 1, 1], [.7, -4, 0, 1, 1], [.9, 0, 0, 1, 1], [1, 0, 0, 1, 0]],
  };

  class NeonCat {
    constructor(svg, opts = {}) {
      this.svg = svg;
      this.D = opts.data; this.A = opts.actions || {};
      this.o = Object.assign({x: 1000, floor: 660, scale: 0.5, pose: Object.keys(this.D.poses)[0]}, opts);
      this.anims = [];
      this.fxEls = [];
      this._build();
      this.setPose(this.o.pose);
    }

    _build() {
      const D = this.D, o = this.o, C = D.consts, gid = 'neoncat-glow-' + (++uid);
      const defs = mk('defs', {}, this.svg);
      const grad = mk('radialGradient', {id: gid}, defs);
      mk('stop', {offset: 0, 'stop-color': '#fff', 'stop-opacity': .16}, grad);
      mk('stop', {offset: 1, 'stop-color': '#fff', 'stop-opacity': 0}, grad);
      // root: home spot on the stage; everything below is in cat units (the 1024 drawing space)
      this.root = mk('g', {class: 'neoncat', fill: 'none', 'stroke-linecap': 'round', 'stroke-linejoin': 'round',
        transform: `translate(${o.x} ${o.floor}) scale(${o.scale})`}, this.svg);
      const move = mk('g', {'data-part': 'move'}, this.root);
      mk('ellipse', {cx: 0, cy: 10, rx: 380, ry: 44, fill: `url(#${gid})`, 'data-part': 'glow', style: origin([0, 10])}, move);
      const toCat = `translate(${-C.mid} ${-C.floor})`;
      const flip = mk('g', {'data-part': 'flip', style: origin([0, 0])}, move);
      const cat = mk('g', {'data-part': 'cat', style: origin([C.mid, C.floor])}, mk('g', {transform: toCat}, flip));
      this.fx = mk('g', {transform: toCat}, move);   // effects are not mirrored with the cat
      this.poses = {};
      for (const [name, P] of Object.entries(D.poses)) {
        // poses hide with opacity: a hidden parent's `visibility` can be overridden by a visible child, opacity cannot
        const pg = this.poses[name] = mk('g', {'data-var': 'pose:' + name, opacity: 0}, cat);
        // Parts are drawn layer by layer (behind the body, the body, in front, toe beans), and within a layer one glow
        // step at a time across all its parts of one tone, so lines that meet join like one neon sign while a part in a
        // later layer covers the lines behind it with its dark halo.
        const groups = new Map();
        for (const p of P.parts) {
          const key = (p.layer || 0) + '|' + (p.tone || 'white');
          if (!groups.has(key)) groups.set(key, []);
          groups.get(key).push(p);
        }
        const order = [...groups.keys()].sort((a, b) => parseFloat(a) - parseFloat(b));
        for (const key of order) {
          const tone = key.split('|')[1];
          for (const [w, c, op] of D.tones[tone]) {
            const g = mk('g', {stroke: c, 'stroke-width': w, opacity: op}, pg);
            for (const p of groups.get(key)) {
              const host = p.place ? mk('g', {transform: p.place}, g) : g;
              const e = mk('g', {'data-part': p.rig || p.id, 'data-var': p.id, visibility: p.hidden ? 'hidden' : null,
                style: p.pivot ? origin(p.pivot) : null}, host);
              mk('path', {d: p.d != null ? p.d : D.shapes[p.shape]}, e);
            }
          }
        }
        if (P.face != null) this._face(pg, P.face);
        if (P.ballFace != null) this._ballFace(pg, P.ballFace);
      }
    }

    _face(pg, place) {
      const D = this.D;
      const host = place ? mk('g', {transform: place}, pg) : pg;
      const head = mk('g', {'data-part': 'head', style: origin(D.pivots.head)}, host);
      for (const slot of SLOTS) {
        const sg = mk('g', {'data-part': slot, style: origin(D.pivots[slot] || D.pivots.head)}, head);
        for (const [k, pieces] of Object.entries(D.face[slot] || {})) {
          const e = mk('g', {'data-var': slot + ':' + k, visibility: D.faceDefault[slot] === k ? null : 'hidden'}, sg);
          tube(D.tones, e, pieces);
        }
      }
    }

    _ballFace(pg, place) {
      const D = this.D;
      const ball = mk('g', {'data-part': 'ball', style: origin([0, 0])}, mk('g', {transform: place}, pg));
      for (const [k, pieces] of Object.entries(D.ballFace)) {
        tube(D.tones, mk('g', {'data-var': 'ballFace:' + k, visibility: k === 'squeeze' ? null : 'hidden'}, ball), pieces);
      }
    }

    setPose(name) {
      for (const [k, g] of Object.entries(this.poses)) g.setAttribute('opacity', k === name ? 1 : 0);
      this.rest = name;
    }

    stop() {
      for (const a of this.anims) a.cancel();
      for (const e of this.fxEls) e.remove();
      this.anims = []; this.fxEls = [];
    }

    // visibility switches over the action's clock: Map of data-var -> [[t, on], ...]
    _switches(A) {
      const D = this.D, sw = new Map();
      const put = (v, t, on) => { if (!sw.has(v)) sw.set(v, []); sw.get(v).push([t, on]); };
      let poses = typeof A.pose === 'string' ? [[0, A.pose]] : (A.pose || [[0, this.rest]]);
      if (poses[0][0] > 0) poses = [[0, this.rest], ...poses];
      for (const name of Object.keys(this.poses)) for (const [t, p] of poses) put('pose:' + name, t, p === name);
      if (A.face) {
        const cur = Object.assign({}, D.faceDefault);
        const all = (t) => { for (const slot of SLOTS) for (const k of Object.keys(D.face[slot] || {})) put(slot + ':' + k, t, cur[slot] === k); };
        all(0);
        for (const [t, f] of A.face) { Object.assign(cur, f); all(t); }
      }
      if (A.ballFace) {
        put('ballFace:squeeze', 0, true);
        for (const [t, k] of A.ballFace) for (const name of Object.keys(D.ballFace)) put('ballFace:' + name, t, name === k);
      }
      for (const [t, m] of A.show || []) for (const v in m) {
        if (!sw.has(v) && t > 0) {   // starts from how the piece is drawn at rest
          const el = this.root.querySelector(`[data-var="${v}"]`);
          put(v, 0, !(el && el.getAttribute('visibility') === 'hidden'));
        }
        put(v, t, !!m[v]);
      }
      return sw;
    }

    play(id, {loop = false, rate = 1} = {}) {
      const A = typeof id === 'string' ? this.A[id] : id;
      if (!A) return Promise.reject(new Error('NeonCat: no action ' + id));
      this.stop();
      const dur = A.dur, opt = {duration: dur, iterations: loop || A.loop ? Infinity : 1, fill: 'none'};
      const off = (t) => Math.min(1, Math.max(0, t / dur));
      const add = (el, kf) => {
        if (kf[0].offset > 0) kf.unshift(Object.assign({}, kf[0], {offset: 0}));
        if (kf[kf.length - 1].offset < 1) kf.push(Object.assign({}, kf[kf.length - 1], {offset: 1}));
        const a = el.animate(kf, opt); a.playbackRate = rate; this.anims.push(a);
      };
      for (const [v, steps] of this._switches(A)) {
        steps.sort((a, b) => a[0] - b[0]);
        const kf = steps.map(([t, on]) => v.startsWith('pose:') ? {offset: off(t), opacity: on ? 1 : 0, easing: 'step-end'}
          : {offset: off(t), visibility: on ? 'visible' : 'hidden', easing: 'step-end'});
        for (const e of this.root.querySelectorAll(`[data-var="${v}"]`)) add(e, kf.map((k) => Object.assign({}, k)));
      }
      for (const [part, keys] of Object.entries(A.tracks || {})) {
        const kf = keys.slice().sort((a, b) => a[0] - b[0])
          .map(([t, tr, ease]) => ({offset: off(t), transform: tr, easing: ease || 'ease-in-out'}));
        for (const e of this.root.querySelectorAll(`[data-part="${part}"]`)) add(e, kf.map((k) => Object.assign({}, k)));
      }
      for (const [t, type, p] of A.fx || []) this._fx(t, type, p || {}, off, add);
      this.current = A.id;
      if (opt.iterations === Infinity) return Promise.resolve();
      return Promise.all(this.anims.map((a) => a.finished)).then(() => { this.stop(); }, () => {});
    }

    _fx(t, type, p, off, add) {
      const D = this.D, T = D.fx[type];
      if (!T) return;
      const size = (p.s || 1) * (D.fxSize[type] || D.fxSize.default);
      const outer = mk('g', {transform: `translate(${p.x || 0} ${p.y || 0}) rotate(${p.r || 0}) scale(${size})`}, this.fx);
      const inner = mk('g', {style: origin([0, 0]) + ';opacity:0'}, outer);
      tube(D.tones, inner, T.map((piece) => (p.tone ? {tone: p.tone, d: piece.d} : piece)));
      this.fxEls.push(outer);
      const a = off(t), b = off(t + (p.dur || 900)), spin = p.spin || 0;
      const kf = (FX_MOTION[p.anim || 'float'] || FX_MOTION.float)(p).map(([k, x, y, s, op]) => ({
        offset: a + (b - a) * k, opacity: op,
        transform: `translate(${x}px,${y}px) rotate(${spin * k}deg) scale(${s})`, easing: 'ease-out'}));
      kf.unshift(Object.assign({}, kf[0], {offset: 0, opacity: 0}));
      kf.push(Object.assign({}, kf[kf.length - 1], {offset: 1, opacity: 0}));
      add(inner, kf);
    }
  }

  window.NeonCat = NeonCat;
})();
