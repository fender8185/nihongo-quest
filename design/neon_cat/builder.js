/* Neon cat actions: the timeline builder every cat's actions.js uses.
 *   const K = NeonCatActions(CAT02_DATA.consts, {rest: 'stand'});
 *   K.group('happy', '開心');
 *   K.act('wave', '揮手', 2400, (b) => b.face(200, {eyes: 'happy'}).k('armR', 300, {r: -10}) ...);
 *   window.CAT02_ACTIONS = K.actions; window.CAT02_GROUPS = K.groups;
 * An action is a timeline in ms; positions are in cat units (the 1024 drawing space). Every part track key is a full
 * transform (translate, rotate, scale), so keys interpolate cleanly. Each action starts and ends at rest.
 */
(function () {
  'use strict';
  window.NeonCatActions = function (consts, {rest = 'sit'} = {}) {
    const BALL_R = consts.ballR;
    const TURN = 2 * Math.PI * BALL_R;           // distance the ball covers in one full turn
    const DEG = 180 / Math.PI;
    const ROLL_EASE = 'cubic-bezier(.3,0,.3,1)';
    const X = (p = {}) => {
      const sx = p.sx != null ? p.sx : (p.s != null ? p.s : 1), sy = p.sy != null ? p.sy : (p.s != null ? p.s : 1);
      return `translate(${+(p.x || 0).toFixed(1)}px,${+(p.y || 0).toFixed(1)}px) rotate(${+(p.r || 0).toFixed(1)}deg) scale(${sx},${sy})`;
    };

    class B {
      constructor(dur) {
        this.dur = dur; this.tracks = {}; this.poses = []; this.faces = []; this.shows = []; this.fxs = []; this.balls = [];
        this.mx = 0; this.my = 0; this.br = 0; this.left = false; this.rest = rest;
      }
      k(part, t, p, ease) { (this.tracks[part] = this.tracks[part] || []).push([Math.round(t), X(p), ease]); return this; }
      pose(t, name) { this.poses.push([t, name]); return this; }
      face(t, f) { this.faces.push([t, f]); return this; }
      show(t, m) { this.shows.push([t, m]); return this; }
      fx(t, type, p) { this.fxs.push([t, type, p || {}]); return this; }
      ballFace(t, k) { this.balls.push([t, k]); return this; }
      ears(t, flat) { return this.show(t, {head: flat ? 0 : 1, headFlat: flat ? 1 : 0}); }
      // head drawn with the ears another way: head, headFlat, headFlatHalf, headTwL, headTwR, headPerk
      earsTo(t, v) {
        const m = {}; for (const k of ['head', 'headFlat', 'headFlatHalf', 'headTwL', 'headTwR', 'headPerk']) m[k] = k === v ? 1 : 0;
        return this.show(t, m);
      }
      // ear twitch: two quick flicks between the resting head and one with that ear turned out
      twitch(t, side = 'L', from = 'head') {
        const to = 'headTw' + side;
        for (const [dt, on] of [[0, 1], [70, 0], [150, 1], [230, 0]]) this.show(t + dt, {[from]: on ? 0 : 1, [to]: on});
        return this;
      }
      ballTwitch(t, side = 'L') {
        const to = 'ballTw' + side;
        for (const [dt, on] of [[0, 1], [70, 0], [150, 1], [230, 0]]) this.show(t + dt, {ball: on ? 0 : 1, [to]: on});
        return this;
      }
      palms(t0, t1) { return this.show(t0, {armL_palm: 1, armR_palm: 1}).show(t1, {armL_palm: 0, armR_palm: 0}); }   // stand: beans show while the arms are up

      // ---- small motions ----
      blink(t) { return this.k('eyes', t, {}).k('eyes', t + 70, {sy: .1}).k('eyes', t + 150, {}); }
      osc(part, t0, t1, half, a, b, ease, base = {}) {   // base -> a -> b -> a ... -> base
        this.k(part, t0, base, ease);
        let t = t0 + half / 2, i = 0;
        while (t < t1 - half / 2) { this.k(part, t, i++ % 2 ? b : a, ease); t += half; }
        return this.k(part, t1, base, ease);
      }
      wag(t0, t1, half = 520, amp = 6) { return this.osc('tail', t0, t1, half, {r: -amp}, {r: amp}); }
      shake(part, t0, t1, amp = 8, half = 70) { return this.osc(part, t0, t1, half, {x: -amp}, {x: amp}, 'linear'); }
      breathe(part, t0, t1, period = 2400, amt = .02) { return this.osc(part, t0, t1, period / 2, {sy: 1 + amt}, {sy: 1 - amt / 2}); }
      hold(part, t0, t1, p, inn = 250, out = 250) {   // ease into p, hold, ease back to rest
        return this.k(part, t0, {}).k(part, t0 + inn, p).k(part, t1 - out, p).k(part, t1, {});
      }
      nod(t, depth = 10, len = 420) { return this.k('head', t, {}).k('head', t + len * .45, {y: depth, r: 0}).k('head', t + len, {}); }

      // ---- whole-cat motions ----
      moveTo(t, x, y, ease) { this.k('move', t, {x: this.mx, y: this.my}, ease); this.mx = x == null ? this.mx : x; this.my = y == null ? this.my : y; return this; }
      at(t) { return this.k('move', t, {x: this.mx, y: this.my}); }   // pin the current spot
      hop(t, h = 90, len = 560) {   // squash, jump (move), stretch in the air, land, squash
        this.k('cat', t, {}).k('cat', t + len * .16, {sx: 1.08, sy: .9}).k('cat', t + len * .3, {sx: .96, sy: 1.06})
          .k('cat', t + len * .72, {sx: .98, sy: 1.03}).k('cat', t + len * .82, {sx: 1.08, sy: .92}).k('cat', t + len, {});
        this.k('move', t + len * .16, {x: this.mx, y: this.my}, 'ease-out').k('move', t + len * .48, {x: this.mx, y: this.my - h}, 'ease-in')
          .k('move', t + len * .8, {x: this.mx, y: this.my});
        return this.k('glow', t + len * .16, {}).k('glow', t + len * .48, {s: .6}).k('glow', t + len * .8, {});
      }
      // pose switch hidden inside a quick squash (kind: squash | stretch | turn | drop)
      swap(t, pose, kind = 'squash', len = 300) {
        const mid = {squash: {sx: 1.14, sy: .8}, stretch: {sx: .88, sy: 1.12}, turn: {sx: .12}, drop: {sx: 1.2, sy: .7}}[kind];
        this.k('cat', t - len / 2, {}).k('cat', t, mid, 'ease-out').k('cat', t + len / 2, {});
        return this.pose(t, pose);
      }
      // turn swap that also mirrors (the flip happens while the cat is squeezed thin)
      turnTo(t, pose, facingLeft, len = 300) {
        this.swap(t, pose, 'turn', len);
        this.k('flip', t - 1, this.left ? {sx: -1} : {}).k('flip', t, facingLeft ? {sx: -1} : {});
        this.left = facingLeft;
        return this;
      }
      tuck(t) {   // sit -> ball: crouch, squeeze to ball size, swap in one frame
        this.k('cat', t, {}).k('cat', t + 240, {sx: 1.1, sy: .82}, 'ease-in').k('cat', t + 330, {sx: .62, sy: .55}).k('cat', t + 331, {});
        this.pose(t + 331, 'ball');
        return t + 331;
      }
      untuck(t, to = this.rest) {   // ball -> pose: swap, then pop up past full size
        this.pose(t, to);
        return this.k('cat', t - 1, {}).k('cat', t, {sx: .62, sy: .55}, 'cubic-bezier(.2,.9,.3,1.25)')
          .k('cat', t + 150, {sx: 1.06, sy: 1.1}).k('cat', t + 330, {});
      }
      roll(t, dist, len, ease = ROLL_EASE) {   // ball turns exactly with the distance: no sliding
        const dir = Math.sign(dist);
        this.k('ball', t, {r: this.br}, ease); this.moveTo(t, null, null, ease);
        this.br += dist / BALL_R * DEG; this.mx += dist;
        this.k('ball', t + len, {r: this.br}, 'ease-in-out'); this.at(t + len);
        // rock back a little and settle
        this.k('ball', t + len + 90, {r: this.br - dir * 8}, 'ease-in-out'); this.k('move', t + len + 90, {x: this.mx - dir * 8 / DEG * BALL_R, y: this.my}, 'ease-in-out');
        this.k('ball', t + len + 180, {r: this.br}); this.at(t + len + 180);
        return t + len + 180;
      }
      walk(t0, t1, dx, {step = 420, amp = 20, bob = 10, legs = ['legFN', 'legBF', 'legFF', 'legBN']} = {}) {
        const [a1, a2, b1, b2] = legs;
        for (const leg of [a1, a2]) this.osc(leg, t0, t1, step / 2, {r: -amp}, {r: amp}, 'ease-in-out');
        for (const leg of [b1, b2]) this.osc(leg, t0, t1, step / 2, {r: amp}, {r: -amp}, 'ease-in-out');
        this.k('cat', t0, {});
        for (let t = t0 + step / 4; t < t1 - step / 4; t += step / 2) this.k('cat', t, {y: -bob}).k('cat', t + step / 4, {});
        this.k('cat', t1, {});
        this.moveTo(t0, null, null, 'linear'); this.mx += dx; return this.at(t1);
      }
      out(id, group, name, extra) {
        const o = {id, group, name, dur: this.dur, tracks: this.tracks};
        if (this.poses.length) o.pose = this.poses;
        if (this.faces.length) o.face = this.faces;
        if (this.shows.length) o.show = this.shows;
        if (this.fxs.length) o.fx = this.fxs;
        if (this.balls.length) o.ballFace = this.balls;
        return Object.assign(o, extra);
      }
    }

    const A = {};
    const GROUPS = [];
    function group(id, name) { GROUPS.push({id, name, actions: []}); }
    function act(id, name, dur, fn, extra) {
      const b = new B(dur); fn(b);
      const g = GROUPS[GROUPS.length - 1];
      A[g.id + '.' + id] = b.out(g.id + '.' + id, g.id, name, extra);
      g.actions.push(g.id + '.' + id);
    }

    return {B, X, act, group, actions: A, groups: GROUPS, TURN, DEG, BALL_R, ROLL_EASE};
  };
})();
