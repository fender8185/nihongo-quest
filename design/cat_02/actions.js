/* Cat_02 actions: 100 moves for the standing cat (built with neon_cat/builder.js, played by neon_cat/player.js).
 * Positions are in cat units: its feet are on y = 1012, its middle is x = 481, the face is around (475, 420), the
 * top of the head around y = 180. Parts: move, flip, cat (squash/lean at the feet), head, eyes, mouth, tail, legs,
 * armR / armL (a raised arm, turning at the shoulder), ball, glow; the lying poses also have pawL/pawR and the legs of
 * the belly pose (legFN, legFF, legBN, legBF).
 * Drawings switched with show: sideR <-> sideR_up and sideL + hipL <-> sideL_up (arm down / up), legs, legsL, legsR
 * (a foot lifted), legsSit, and the head drawings (head, headFlat, headFlatHalf, headTwL, headTwR, headPerk).
 * Turning a raised right arm: +31 points it straight right, -40 up high, -62 salutes, -85 brings the paw to the mouth.
 */
(function () {
  'use strict';
  const K = window.NeonCatActions(window.CAT02_DATA.consts, {rest: 'stand'});
  const {act, group, TURN, DEG, BALL_R} = K;
  const DY = 146;   // the lying poses shared with Cat_01 sit this much lower

  // ---- Cat_02 moves ----
  const ARM = {R: {up: 'sideR_up', down: ['sideR'], rig: 'armR', sgn: 1}, L: {up: 'sideL_up', down: ['sideL', 'hipL'], rig: 'armL', sgn: -1}};
  const mir = (p, sgn) => Object.assign({}, p, p.r != null ? {r: p.r * sgn} : {});
  // arm swings up out of the side (the drawings switch while it is small and turned down)
  function raise(b, t, side = 'R', to = {}) {
    const a = ARM[side], m = {[a.up]: 1};
    for (const d of a.down) m[d] = 0;
    b.show(t, m).k(a.rig, t, mir({r: 70, s: .6}, a.sgn), 'ease-out').k(a.rig, t + 180, mir(to, a.sgn));
    return b;
  }
  function lower(b, t, side = 'R', from = {}) {
    const a = ARM[side], m = {[a.up]: 0};
    for (const d of a.down) m[d] = 1;
    b.k(a.rig, t - 180, mir(from, a.sgn), 'ease-in').k(a.rig, t, mir({r: 70, s: .6}, a.sgn)).show(t, m);
    return b;
  }
  const arm = (b, side, t, p, ease) => b.k(ARM[side].rig, t, mir(p, ARM[side].sgn), ease);   // r is mirrored for the left arm
  function wave(b, t0, t1, side = 'R', half = 240, base = {}) {
    const s = ARM[side].sgn;
    return b.osc(ARM[side].rig, t0, t1, half, mir(Object.assign({}, base, {r: (base.r || 0) - 12}), s), mir(Object.assign({}, base, {r: (base.r || 0) + 10}), s), undefined, mir(base, s));
  }
  // both arms up for a while
  function banzai(b, t0, t1, wiggle = 0) {
    raise(b, t0, 'R'); raise(b, t0, 'L');
    if (wiggle) { wave(b, t0 + 180, t1 - 180, 'R', wiggle); wave(b, t0 + 180, t1 - 180, 'L', wiggle); }
    lower(b, t1, 'R'); lower(b, t1, 'L');
    return b;
  }
  // feet take turns lifting, the body leans onto the other foot; dx moves it across the stage
  function waddle(b, t0, t1, dx = 0, {step = 440, sway = 4, bob = 8, look = true} = {}) {
    const half = step / 2; let t = t0, i = 0;
    b.k('cat', t0, {});
    while (t < t1 - 1) {
      const left = i++ % 2 === 0;
      b.show(t, {legs: 0, legsL: left ? 1 : 0, legsR: left ? 0 : 1});
      b.k('cat', Math.min(t + half / 2, t1), {r: left ? sway : -sway, y: -bob});
      t += half;
    }
    b.show(t1, {legs: 1, legsL: 0, legsR: 0}).k('cat', t1, {});
    if (dx) { b.moveTo(t0, null, null, 'linear'); b.mx += dx; b.at(t1); }
    if (look && dx) b.hold('eyes', t0, t1, {x: 10 * Math.sign(dx)}, 150, 150);
    return b;
  }
  function stomp(b, t0, t1, step = 320) {   // feet slam down in turn
    let t = t0, i = 0;
    while (t < t1 - 1) {
      const left = i++ % 2 === 0;
      b.show(t, {legs: 0, legsL: left ? 1 : 0, legsR: left ? 0 : 1}).show(t + step * .55, {legs: 1, legsL: 0, legsR: 0});
      b.k('cat', t + step * .5, {}).k('cat', t + step * .62, {sx: 1.05, sy: .94}).k('cat', t + step * .9, {});
      b.fx(t + step * .58, 'ring', {x: left ? 380 : 580, y: 1006, s: .7, anim: 'rise', dx: left ? -40 : 40, rise: 20, dur: 400, tone: 'grey'});
      t += step;
    }
    return b.show(t1, {legs: 1, legsL: 0, legsR: 0});
  }
  // one hop that lands at x1 (whole-cat squash and stretch on the way)
  function hopTo(b, t, x0, x1, h = 80, len = 460) {
    b.k('cat', t, {}).k('cat', t + len * .16, {sx: 1.08, sy: .9}).k('cat', t + len * .3, {sx: .96, sy: 1.06})
      .k('cat', t + len * .72, {sx: .98, sy: 1.03}).k('cat', t + len * .82, {sx: 1.08, sy: .92}).k('cat', t + len, {});
    b.k('move', t + len * .16, {x: x0, y: 0}, 'ease-out').k('move', t + len * .48, {x: (x0 + x1) / 2, y: -h}, 'ease-in').k('move', t + len * .8, {x: x1, y: 0});
    b.k('glow', t + len * .16, {}).k('glow', t + len * .48, {s: .6}).k('glow', t + len * .8, {});
    b.mx = x1;
    return b;
  }
  const fall = (b, t, dir = -1) => b.k('cat', t, {}).k('cat', t + 380, {r: dir * 88}, 'ease-in').k('cat', t + 470, {r: dir * 80}).k('cat', t + 560, {r: dir * 88});
  const getUp = (b, t, dir = -1) => b.k('cat', t, {r: dir * 88}).k('cat', t + 420, {r: -dir * 6}, 'ease-out').k('cat', t + 560, {});

  // ======================= 基本模組 =======================
  group('base', '基本模組');
  act('stand', '站著', 4400, (b) => b.blink(3700).twitch(1500, 'R').wag(0, 4400, 1100, 5).breathe('cat', 0, 4400, 2200, .01), {loop: true});
  act('wave', '揮手', 3600, (b) => {
    b.show(0, {sideR: 0, sideR_up: 1}).face(0, {eyes: 'happy', mouth: 'w'});
    wave(b, 0, 3600, 'R', 300); b.twitch(1800, 'L').wag(0, 3600, 900, 6);
  }, {loop: true});
  act('sit', '坐著', 4400, (b) => b.pose(0, 'sit').blink(3600).twitch(1400, 'L').wag(0, 4400, 1100, 5).breathe('cat', 0, 4400, 2200, .01), {loop: true});
  act('sitWave', '坐著揮手', 3600, (b) => {
    b.pose(0, 'sit').show(0, {sideR: 0, sideR_up: 1}).face(0, {eyes: 'happy', mouth: 'w'});
    wave(b, 0, 3600, 'R', 300); b.wag(0, 3600, 900, 6);
  }, {loop: true});
  act('banzai', '雙手舉高', 3200, (b) => {
    b.show(0, {sideR: 0, sideR_up: 1, sideL: 0, hipL: 0, sideL_up: 1}).face(0, {eyes: 'happy', mouth: 'open'});
    b.osc('armR', 0, 3200, 800, {r: -8}, {r: 4}).osc('armL', 0, 3200, 800, {r: 8}, {r: -4}).osc('cat', 0, 3200, 800, {r: 3}, {r: -3});
  }, {loop: true});
  act('back', '背面', 4400, (b) => {
    b.pose(0, 'back').osc('tail', 0, 4400, 1100, {r: -6}, {r: 5}).breathe('cat', 0, 4400, 2200, .01);
    b.k('head', 0, {}).k('head', 1100, {r: -5}).k('head', 2200, {}).k('head', 3300, {r: 5}).k('head', 4400, {});
    b.twitch(700, 'R').twitch(2600, 'L');
  }, {loop: true});
  act('ball', '縮成球', 4800, (b) => {
    b.pose(0, 'ball').ballFace(0, 'sleep').breathe('ball', 0, 4800, 2400, .02).ballTwitch(1500, 'L').ballTwitch(3500, 'R');
    b.fx(400, 'z', {x: 640, y: 470 + DY, s: .6, anim: 'float', dur: 1600, dx: 60, rise: 160}).fx(2700, 'z', {x: 640, y: 470 + DY, s: .45, anim: 'float', dur: 1500, dx: 50, rise: 140});
  }, {loop: true});
  act('loaf', '趴著', 5200, (b) => {
    b.pose(0, 'loaf').breathe('cat', 0, 5200, 2600, .015).wag(0, 5200, 1300, 5).blink(1300).twitch(800, 'L').twitch(3900, 'R');
    b.face(2000, {eyes: 'closed'}).face(3400, {eyes: 'normal'});
    for (const [paw, t0] of [['pawL', 2100], ['pawR', 2420]]) {
      b.k(paw, 0, {});
      for (let t = t0; t < 3300; t += 640) b.k(paw, t, {}).k(paw, t + 90, {y: -16, sy: .9}).k(paw, t + 220, {});
      b.k(paw, 5200, {});
    }
  }, {loop: true});
  act('belly', '翻肚', 4800, (b) => {
    b.pose(0, 'belly').face(0, {eyes: 'happy', mouth: 'w'}).blink(3300).twitch(2000, 'R');
    b.osc('legFN', 0, 4800, 600, {r: -12}, {r: 8}).osc('legBN', 0, 4800, 600, {r: 10}, {r: -10});
    b.osc('legFF', 0, 4800, 600, {r: 8}, {r: -8}).osc('legBF', 0, 4800, 600, {r: -8}, {r: 8});
    b.osc('cat', 0, 4800, 1200, {r: -2}, {r: 2}).osc('head', 0, 4800, 1200, {r: 5}, {r: -5}).wag(0, 4800, 600, 8);
  }, {loop: true});
  act('turn', '轉一圈', 3600, (b) => {
    b.swap(700, 'back', 'turn').twitch(1100, 'L').swap(1900, 'stand', 'turn');
    b.hop(2300, 70, 520).face(2300, {eyes: 'happy'}).face(3200, {eyes: 'normal'});
  });

  // ======================= 無聊（輪播） =======================
  group('bored', '無聊');
  act('yawn', '打哈欠', 3600, (b) => {
    banzai(b, 300, 2500);
    b.face(400, {eyes: 'squeeze', mouth: 'O'}).face(2400, {eyes: 'half', mouth: 'smile'}).face(3100, {eyes: 'normal', mouth: 'w'});
    b.k('cat', 300, {}).k('cat', 800, {sy: 1.05, sx: .97}).k('cat', 2200, {sy: 1.05, sx: .97}).k('cat', 2600, {});
    b.hold('head', 400, 2400, {r: -5, y: -8});
    b.fx(2000, 'drop', {x: 360, y: 430, s: .3, anim: 'fall', fall: 60, dur: 900}).blink(3300);
  });
  act('stretch', '伸懶腰', 4000, (b) => {
    banzai(b, 300, 3300);
    b.k('cat', 300, {}).k('cat', 700, {sy: 1.07, sx: .96}).k('cat', 1500, {sy: 1.07, sx: .96, r: -6}).k('cat', 2400, {sy: 1.07, sx: .96, r: 6}).k('cat', 3100, {sy: 1.05, sx: .97}).k('cat', 3500, {});
    b.face(600, {eyes: 'squeeze', mouth: 'w'}).face(3300, {eyes: 'happy'}).face(3800, {eyes: 'normal'});
  });
  act('sway', '左右晃', 4200, (b) => {
    b.face(200, {eyes: 'half', mouth: 'smile'}).face(4000, {eyes: 'normal', mouth: 'w'});
    b.osc('cat', 0, 4200, 1050, {r: 5}, {r: -5}).osc('head', 0, 4200, 1050, {r: -4}, {r: 4}).wag(0, 4200, 525, 7);
    b.fx(600, 'note', {x: 760, y: 260, s: .45, anim: 'float', dur: 1300, dx: 40}).fx(2300, 'note', {x: 200, y: 280, s: .4, anim: 'float', dur: 1300, dx: -40});
  });
  act('stepInPlace', '原地踏步', 3600, (b) => {
    b.face(200, {eyes: 'half', mouth: 'flat'}).face(3300, {eyes: 'normal', mouth: 'w'});
    waddle(b, 300, 3300, 0, {step: 520, sway: 3, bob: 6});
    b.fx(1500, 'dots', {x: 620, y: 140, s: .8, anim: 'hold', dur: 1400});
  });
  act('sitIdle', '坐下發呆', 5200, (b) => {
    b.swap(300, 'sit', 'squash').swap(4800, 'stand', 'stretch');
    b.face(600, {eyes: 'half', mouth: 'flat'}).face(4700, {eyes: 'normal', mouth: 'w'});
    b.hold('head', 900, 4400, {y: 8, r: 3}, 400);
    b.fx(1500, 'dots', {x: 620, y: 130, s: .9, anim: 'hold', dur: 1800}).fx(3400, 'puff', {x: 540, y: 480, s: .5, anim: 'rise', dx: 80, rise: 80, dur: 1000, tone: 'grey'});
    b.k('eyes', 2900, {}).k('eyes', 3050, {sy: .1}).k('eyes', 3400, {sy: .1}).k('eyes', 3550, {});
  });
  act('kick', '坐著踢腳', 4000, (b) => {
    b.swap(300, 'sit', 'squash').swap(3700, 'stand', 'stretch');
    b.face(500, {eyes: 'happy', mouth: 'w'}).face(3600, {eyes: 'normal'});
    for (let t = 700; t < 3200; t += 360) b.k('legs', t, {}).k('legs', t + 120, {y: -18, sy: .94, r: (t / 360) % 2 < 1 ? -3 : 3}).k('legs', t + 260, {});
    b.osc('head', 700, 3300, 720, {r: -4}, {r: 4}).wag(500, 3500, 360, 9);
  });
  act('rollAcross', '滾過去再滾回來', 7000, (b) => {
    let t = b.tuck(300);
    t = b.roll(t, TURN, 1400);
    b.untuck(t + 60).face(t + 60, {eyes: 'happy'}).face(t + 700, {eyes: 'normal'}).blink(t + 900);
    t = b.tuck(t + 1200);
    t = b.roll(t, -TURN, 1400);
    b.untuck(t + 60).face(t + 60, {eyes: 'happy'}).face(6700, {eyes: 'normal'});
  });
  act('lookAround', '東張西望', 4000, (b) => {
    b.k('eyes', 200, {}).k('eyes', 600, {x: -14}).k('eyes', 1400, {x: -14}).k('eyes', 1800, {x: 14}).k('eyes', 2600, {x: 14}).k('eyes', 3000, {});
    b.k('head', 200, {}).k('head', 600, {r: -7}).k('head', 1400, {r: -7}).k('head', 1800, {r: 7}).k('head', 2600, {r: 7}).k('head', 3000, {});
    b.twitch(900, 'L').twitch(2100, 'R').earsTo(3100, 'headPerk').earsTo(3700, 'head');
    b.face(3100, {eyes: 'wide'}).face(3700, {eyes: 'normal'});
  });
  act('lickPaw', '舔手', 4200, (b) => {
    raise(b, 300, 'R', {r: -85});
    b.face(600, {eyes: 'closed', tongue: 'lick'}).face(3200, {eyes: 'happy', tongue: null}).face(3900, {eyes: 'normal'});
    for (const t of [800, 1300, 1800, 2300, 2800]) arm(b, 'R', t, {r: -85}).k('armR', t + 120, {r: -92, y: -6}).k('armR', t + 250, {r: -85});
    for (const t of [800, 1300, 1800, 2300, 2800]) b.k('head', t, {}).k('head', t + 120, {y: 5, r: 3}).k('head', t + 250, {});
    lower(b, 3500, 'R', {r: -85});
    b.wag(0, 4200, 1050, 4);
  });
  act('bellyWiggle', '翻肚扭扭', 4800, (b) => {
    b.swap(400, 'belly', 'drop').swap(4300, 'stand', 'drop');
    b.face(400, {eyes: 'happy', mouth: 'w'}).face(4300, {eyes: 'normal'});
    for (const [leg, a] of [['legFN', 14], ['legFF', -14], ['legBN', -14], ['legBF', 14]]) b.osc(leg, 600, 4000, 300, {r: a}, {r: -a});
    b.osc('head', 600, 4000, 600, {r: -6}, {r: 6}).wag(600, 4000, 300, 10);
  });

  // ======================= 開心（1 → 10 越來越開心） =======================
  group('happy', '開心');
  act('1', '1 微笑', 2200, (b) => b.face(200, {eyes: 'happy', mouth: 'smile'}).face(1800, {eyes: 'normal', mouth: 'w'}).hold('head', 200, 1800, {r: -3}).wag(0, 2200, 550, 6));
  act('2', '2 點點頭', 2400, (b) => b.face(200, {eyes: 'happy'}).face(2100, {eyes: 'normal'}).nod(400).nod(950).wag(0, 2400, 400, 7));
  act('3', '3 尾巴搖不停', 2600, (b) => {
    b.face(200, {eyes: 'happy', cheeks: 'blush'}).face(2300, {eyes: 'normal', cheeks: null});
    b.wag(0, 2600, 180, 11).osc('cat', 200, 2400, 300, {sy: .97, sx: 1.02}, {});
  });
  act('4', '4 跳一下', 2000, (b) => {
    b.face(200, {eyes: 'happy', mouth: 'open'}).face(1700, {eyes: 'normal', mouth: 'w'});
    b.hop(300, 110, 600).fx(560, 'sparkle', {x: 780, y: 200, s: .55, anim: 'pop', dur: 700}).wag(0, 2000, 250, 9);
  });
  act('5', '5 揮手', 3000, (b) => {
    raise(b, 300, 'R'); wave(b, 480, 2500, 'R'); lower(b, 2700, 'R');
    b.face(300, {eyes: 'happy', mouth: 'grin', cheeks: 'blush'}).face(2700, {eyes: 'normal', mouth: 'w', cheeks: null});
    b.hold('head', 300, 2700, {r: -4}).wag(0, 3000, 400, 7);
  });
  act('6', '6 雙手萬歲', 3000, (b) => {
    banzai(b, 300, 2600, 220);
    b.face(300, {eyes: 'happy', mouth: 'open'}).face(2600, {eyes: 'normal', mouth: 'w'});
    b.hop(700, 80, 500).hop(1400, 80, 500);
    b.fx(800, 'sparkle', {x: 150, y: 300, s: .5, anim: 'pop', dur: 700}).fx(1500, 'sparkle', {x: 800, y: 260, s: .5, anim: 'pop', dur: 700});
  });
  act('7', '7 連跳加愛心', 3000, (b) => {
    b.face(200, {eyes: 'happy', mouth: 'open', cheeks: 'blush'}).face(2700, {eyes: 'normal', mouth: 'w', cheeks: null});
    raise(b, 250, 'R'); b.hop(300, 120, 560).hop(950, 150, 600); lower(b, 1800, 'R');
    b.fx(450, 'heart', {x: 780, y: 250, s: .5, anim: 'float', dur: 1300, dx: 30}).fx(1100, 'heart', {x: 200, y: 280, s: .45, anim: 'float', dur: 1300, dx: -30});
    b.fx(1600, 'heart', {x: 650, y: 120, s: .4, anim: 'float', dur: 1200, dx: 20}).wag(0, 3000, 200, 10);
  });
  act('8', '8 空中轉圈', 2800, (b) => {
    b.face(200, {eyes: 'happy', mouth: 'open'}).face(2500, {eyes: 'normal', mouth: 'w'});
    b.moveTo(300, null, null, 'ease-out'); b.k('move', 700, {x: 0, y: -190}, 'ease-in'); b.k('move', 1100, {x: 0, y: 0});
    b.k('glow', 300, {}).k('glow', 700, {s: .5}).k('glow', 1100, {});
    b.swap(560, 'back', 'turn', 160).swap(840, 'stand', 'turn', 160);
    b.k('cat', 1100, {}).k('cat', 1180, {sx: 1.1, sy: .88}).k('cat', 1330, {});
    b.fx(1150, 'sparkle', {x: 250, y: 760, s: .45, anim: 'burst', dx: -120, dy: -160, dur: 800});
    b.fx(1150, 'sparkle', {x: 720, y: 760, s: .45, anim: 'burst', dx: 120, dy: -160, dur: 800});
  });
  act('9', '9 翻跟斗', 3400, (b) => {
    const t = b.tuck(300);
    b.k('ball', t, {}, 'ease-in-out').k('ball', t + 700, {r: 360});
    b.moveTo(t, null, null, 'ease-out'); b.k('move', t + 350, {x: 0, y: -320}, 'ease-in'); b.k('move', t + 700, {x: 0, y: 0});
    b.k('glow', t, {}).k('glow', t + 350, {s: .4}).k('glow', t + 700, {});
    b.untuck(t + 760);
    raise(b, t + 800, 'R'); raise(b, t + 800, 'L'); lower(b, 3100, 'R'); lower(b, 3100, 'L');
    b.face(t + 760, {eyes: 'happy', mouth: 'open'}).face(3100, {eyes: 'normal', mouth: 'w'});
    b.fx(t + 760, 'star', {x: 200, y: 900, s: .45, anim: 'burst', dx: -160, dy: -140, dur: 800, spin: 180});
    b.fx(t + 760, 'star', {x: 780, y: 900, s: .45, anim: 'burst', dx: 160, dy: -140, dur: 800, spin: -180});
  });
  act('10', '10 超開心', 5200, (b) => {
    b.face(200, {eyes: 'star', mouth: 'grin', cheeks: 'blush'}).face(4900, {eyes: 'normal', mouth: 'w', cheeks: null});
    banzai(b, 250, 4700, 200);
    b.moveTo(400, null, null, 'ease-out'); b.k('move', 850, {x: 0, y: -260}, 'ease-in'); b.k('move', 1300, {x: 0, y: 0});
    b.k('glow', 400, {}).k('glow', 850, {s: .4}).k('glow', 1300, {});
    b.swap(700, 'back', 'turn', 180).swap(1000, 'stand', 'turn', 180);
    b.hop(1900, 90, 460).hop(2500, 110, 480).hop(3150, 90, 460);
    const conf = ['gold', 'pink', 'accent', 'green', 'blue', 'gold', 'pink', 'accent', 'green', 'blue', 'gold', 'pink'];
    conf.forEach((tone, i) => {
      const a = (i / conf.length) * Math.PI * 2;
      b.fx(1350 + (i % 3) * 120, 'confetti', {x: 475, y: 300, s: .6, anim: 'burst', dx: Math.cos(a) * 440, dy: Math.sin(a) * 320 - 120, dur: 1300, spin: 360, tone});
    });
    b.fx(2000, 'heart', {x: 150, y: 260, s: .5, anim: 'float', dur: 1300}).fx(2600, 'heart', {x: 820, y: 220, s: .5, anim: 'float', dur: 1300}).wag(0, 5200, 180, 12);
  });

  // ======================= 沮喪（1 → 5 越來越沮喪） =======================
  group('sad', '沮喪');
  act('1', '1 嘆氣', 3200, (b) => {
    b.face(300, {eyes: 'half', mouth: 'flat'}).face(2800, {eyes: 'normal', mouth: 'w'});
    b.hold('head', 600, 2600, {y: 10}).hold('cat', 600, 2600, {sy: .98});
    b.fx(1100, 'puff', {x: 540, y: 490, s: .5, anim: 'rise', dx: 90, rise: 80, dur: 1100, tone: 'grey'}).hold('tail', 400, 2800, {r: 10});
  });
  act('2', '2 失落', 3800, (b) => {
    b.ears(300, true).ears(3400, false);
    b.face(300, {eyes: 'sad', mouth: 'frown', brows: 'sad'}).face(3400, {eyes: 'normal', mouth: 'w', brows: null});
    b.hold('head', 400, 3400, {y: 18, r: 4}, 500).hold('cat', 400, 3400, {sy: .96, sx: 1.01}, 500).hold('tail', 400, 3400, {r: 16}, 500);
  });
  act('3', '3 坐下低頭', 4800, (b) => {
    b.swap(400, 'sit', 'drop').swap(4400, 'stand', 'stretch').ears(400, true).ears(4400, false);
    b.face(400, {eyes: 'sad', mouth: 'frown', brows: 'sad'}).face(4400, {eyes: 'normal', mouth: 'w', brows: null});
    b.hold('head', 700, 4200, {y: 20, r: -3}, 600);
    b.fx(1400, 'dots', {x: 620, y: 150, s: .9, anim: 'hold', dur: 1900}).fx(2800, 'puff', {x: 540, y: 500, s: .5, anim: 'rise', dx: 90, rise: 80, dur: 1100, tone: 'grey'});
  });
  act('4', '4 掉眼淚', 4800, (b) => {
    b.ears(300, true).ears(4400, false);
    b.face(300, {eyes: 'teary', mouth: 'wavy', brows: 'sad', cheeks: 'tears'}).face(4400, {eyes: 'normal', mouth: 'w', brows: null, cheeks: null});
    for (const t of [700, 1500, 2300, 3100]) {
      b.fx(t, 'drop', {x: 380, y: 470, s: .32, anim: 'fall', fall: 300, dur: 900});
      b.fx(t + 300, 'drop', {x: 566, y: 470, s: .32, anim: 'fall', fall: 300, dur: 900});
    }
    raise(b, 1200, 'R', {r: -85}); lower(b, 2400, 'R', {r: -85});   // wipes the tears
    b.k('head', 300, {}).k('head', 700, {y: 10}).k('head', 4000, {y: 10}).k('head', 4400, {});
    b.shake('cat', 2600, 2900, 4, 50).shake('cat', 3400, 3700, 4, 50);
  });
  act('5', '5 烏雲罩頂', 5600, (b) => {
    b.swap(400, 'sit', 'drop').swap(5200, 'stand', 'stretch').ears(400, true).ears(5200, false);
    b.face(400, {eyes: 'sad', mouth: 'wavy', brows: 'sad', cheeks: 'gloom'}).face(5200, {eyes: 'normal', mouth: 'w', brows: null, cheeks: null});
    b.hold('head', 600, 5000, {y: 16}, 500).hold('cat', 600, 5000, {sy: .95, sx: 1.02}, 500);
    b.fx(700, 'cloud', {x: 475, y: 70, s: 1.5, anim: 'hold', dur: 4200});
    for (let t = 1100; t < 4600; t += 450) b.fx(t, 'rain', {x: 475 + ((t / 450) % 2 ? -40 : 40), y: 130, s: .8, anim: 'fall', fall: 110, dur: 600});
  });

  // ======================= 生氣（1 → 3） =======================
  group('angry', '生氣');
  act('1', '1 不爽', 3000, (b) => {
    b.face(200, {mouth: 'pout', brows: 'angry'}).face(2700, {mouth: 'w', brows: null});
    b.hold('head', 200, 2700, {r: -7}).osc('tail', 300, 2600, 140, {r: -14}, {r: 10});
    b.fx(600, 'vein', {x: 690, y: 230, s: .5, anim: 'pulse', dur: 1600});
  });
  act('2', '2 跺腳', 3400, (b) => {
    b.ears(200, true).ears(3100, false);
    b.face(200, {eyes: 'angry', mouth: 'hiss', brows: 'angry'}).face(3100, {eyes: 'normal', mouth: 'w', brows: null});
    stomp(b, 400, 2800, 340);
    b.hold('tail', 200, 3100, {s: 1.2, r: -10}, 200);
    b.fx(500, 'vein', {x: 700, y: 210, s: .55, anim: 'pulse', dur: 1300}).fx(1500, 'vein', {x: 250, y: 250, s: .45, anim: 'pulse', dur: 1300});
  });
  act('3', '3 暴怒', 4400, (b) => {
    b.ears(200, true).ears(4100, false);
    b.face(200, {eyes: 'angry', mouth: 'hiss', brows: 'angry'}).face(4100, {eyes: 'normal', mouth: 'w', brows: null});
    raise(b, 300, 'R'); raise(b, 300, 'L');
    b.osc('armR', 480, 3700, 160, {r: -30}, {r: 30}).osc('armL', 480, 3700, 160, {r: -30}, {r: 30});
    lower(b, 3900, 'R'); lower(b, 3900, 'L');
    stomp(b, 500, 3600, 300);
    for (let t = 600; t < 3600; t += 500) {
      b.fx(t, 'puff', {x: 300, y: 120, s: .55, anim: 'rise', dx: -80, rise: 160, dur: 900, tone: 'grey'});
      b.fx(t + 250, 'puff', {x: 650, y: 120, s: .55, anim: 'rise', dx: 80, rise: 160, dur: 900, tone: 'grey'});
    }
    b.fx(700, 'vein', {x: 690, y: 190, s: .6, anim: 'pulse', dur: 1500}).fx(2000, 'vein', {x: 260, y: 220, s: .5, anim: 'pulse', dur: 1500});
    b.k('glow', 400, {}).k('glow', 800, {s: 1.3}).k('glow', 3600, {s: 1.3}).k('glow', 4000, {});
  });

  // ======================= 其他：反應 =======================
  group('react', '反應');
  act('surprised', '嚇一跳', 2600, (b) => {
    b.face(150, {eyes: 'wide', mouth: 'o', brows: 'up'}).face(2100, {eyes: 'normal', mouth: 'w', brows: null});
    raise(b, 150, 'R', {r: -20}); raise(b, 150, 'L', {r: -20}); lower(b, 1700, 'R', {r: -20}); lower(b, 1700, 'L', {r: -20});
    b.moveTo(150, null, null, 'ease-out'); b.k('move', 400, {x: -60, y: -110}, 'ease-in'); b.k('move', 650, {x: -80, y: 0}, 'ease-out'); b.k('move', 1900, {x: -80, y: 0}); b.k('move', 2400, {x: 0, y: 0});
    b.fx(300, 'excl', {x: 740, y: 150, s: .7, anim: 'pop', dur: 1200}).fx(300, 'lines', {x: 475, y: 110, s: .9, anim: 'pop', dur: 800});
    b.hold('tail', 150, 1900, {s: 1.2, r: -8}, 150).earsTo(150, 'headPerk').earsTo(1900, 'head');
  });
  act('shy', '害羞', 3400, (b) => {
    raise(b, 300, 'R', {r: -86}); raise(b, 300, 'L', {r: -86}); lower(b, 2900, 'R', {r: -86}); lower(b, 2900, 'L', {r: -86});
    b.face(300, {eyes: 'closed', mouth: 'w', cheeks: 'shy'}).face(3000, {eyes: 'normal', cheeks: null});
    b.osc('cat', 500, 2700, 500, {r: 3}, {r: -3}).hold('head', 300, 3000, {r: -5});
  });
  act('love', '愛心眼', 3400, (b) => {
    b.face(200, {eyes: 'heart', cheeks: 'blush'}).face(3100, {eyes: 'normal', cheeks: null});
    b.osc('head', 200, 3100, 700, {r: -5}, {r: 5}).wag(0, 3400, 300, 8);
    [[400, 760, 260], [900, 200, 300], [1400, 700, 160], [1900, 280, 180], [2400, 760, 300]].forEach(([t, x, y]) => b.fx(t, 'heart', {x, y, s: .45, anim: 'float', dur: 1200}));
  });
  act('think', '想一想', 3800, (b) => {
    raise(b, 300, 'R', {r: -86}); lower(b, 3400, 'R', {r: -86});
    b.face(300, {mouth: 'flat'}).face(1500, {mouth: 'pout'}).face(3400, {mouth: 'w'});
    b.hold('head', 300, 3400, {r: -7}, 400).hold('eyes', 400, 3300, {x: -10, y: -8}, 300);
    b.fx(800, 'question', {x: 740, y: 160, s: .65, anim: 'pop', dur: 2300}).wag(0, 3800, 950, 5);
  });
  act('idea', '想到了', 3000, (b) => {
    raise(b, 200, 'R', {r: -86}); arm(b, 'R', 900, {r: -86}); arm(b, 'R', 1050, {r: -45}, 'ease-out'); lower(b, 2700, 'R', {r: -45});
    b.face(200, {mouth: 'pout'}).face(950, {eyes: 'star', mouth: 'open'}).face(2700, {eyes: 'normal', mouth: 'w'});
    b.hold('eyes', 200, 950, {x: -8, y: -10}, 200);
    b.fx(950, 'bulb', {x: 475, y: 70, s: .9, anim: 'pop', dur: 1500}).hop(1100, 70, 520);
  });
  act('wink', '眨眼', 2200, (b) => {
    raise(b, 200, 'R', {r: 20}); lower(b, 1900, 'R', {r: 20});
    b.face(200, {eyes: 'wink', mouth: 'smile'}).face(1800, {eyes: 'normal', mouth: 'w'});
    b.hold('head', 150, 1900, {r: 5}).fx(350, 'sparkle', {x: 620, y: 360, s: .4, anim: 'pop', dur: 800});
  });
  act('sneeze', '打噴嚏', 2800, (b) => {
    b.face(200, {eyes: 'squeeze', mouth: 'o'}).face(1050, {eyes: 'shut', mouth: 'open'}).face(1500, {eyes: 'half', mouth: 'w'}).face(2400, {eyes: 'normal'});
    b.k('head', 0, {}).k('head', 900, {r: -7, y: -14}, 'ease-in').k('head', 1050, {r: 5, y: 10}).k('head', 1400, {});
    b.k('cat', 900, {}).k('cat', 1050, {sx: 1.06, sy: .94}).k('cat', 1300, {});
    b.fx(1050, 'puff', {x: 560, y: 500, s: .6, anim: 'burst', dx: 160, dy: 10, dur: 700}).fx(1080, 'puff', {x: 420, y: 520, s: .45, anim: 'burst', dx: -140, dy: 20, dur: 650});
  });
  act('curious', '歪頭', 3200, (b) => {
    b.face(200, {eyes: 'wide'}).face(2900, {eyes: 'normal'}).earsTo(200, 'headPerk').earsTo(2900, 'head');
    b.k('head', 200, {}).k('head', 600, {r: -10}).k('head', 1400, {r: -10}).k('head', 1900, {r: 9}).k('head', 2600, {r: 9}).k('head', 3000, {});
    b.fx(500, 'question', {x: 230, y: 160, s: .5, anim: 'pop', dur: 1000}).fx(1800, 'question', {x: 740, y: 160, s: .5, anim: 'pop', dur: 1000});
  });
  act('scared', '害怕發抖', 3200, (b) => {
    b.ears(200, true).ears(2900, false);
    b.face(200, {eyes: 'wide', mouth: 'wavy', brows: 'sad'}).face(2900, {eyes: 'normal', mouth: 'w', brows: null});
    raise(b, 200, 'R', {r: -86}); raise(b, 200, 'L', {r: -86}); lower(b, 2800, 'R', {r: -86}); lower(b, 2800, 'L', {r: -86});
    b.shake('cat', 400, 2700, 4, 50).hold('tail', 200, 2900, {s: 1.2, r: 16});
    b.fx(500, 'drop', {x: 700, y: 280, s: .45, anim: 'fall', fall: 90, dur: 1800, tone: 'blue'});
  });
  act('awkward', '尷尬抓頭', 3200, (b) => {
    raise(b, 300, 'R', {r: -62}); b.osc('armR', 480, 2600, 200, {r: -70}, {r: -56}, undefined, {r: -62}); lower(b, 2900, 'R', {r: -62});
    b.face(200, {mouth: 'wavy', cheeks: 'shy'}).face(2900, {mouth: 'w', cheeks: null});
    b.hold('eyes', 200, 2900, {x: 12}).fx(400, 'drop', {x: 700, y: 250, s: .5, anim: 'hold', dur: 2200, tone: 'blue'});
  });
  act('dizzy', '頭暈', 3400, (b) => {
    b.face(100, {eyes: 'dizzy', mouth: 'wavy'}).face(3100, {eyes: 'normal', mouth: 'w'});
    b.osc('head', 100, 3200, 500, {r: -7}, {r: 7}).osc('cat', 100, 3200, 700, {r: -4}, {r: 4});
    b.fx(100, 'star', {x: 475, y: 150, s: .5, anim: 'orbit', rx: 170, ry: 34, dur: 3000, turns: 3});
    b.fx(100, 'star', {x: 475, y: 150, s: .4, anim: 'orbit', rx: 170, ry: 34, a0: Math.PI, dur: 3000, turns: 3});
  });
  act('sleepy', '打瞌睡', 4600, (b) => {
    b.face(200, {eyes: 'half', mouth: 'w'}).face(1300, {eyes: 'shut'}).face(2000, {eyes: 'wide'}).face(2500, {eyes: 'half'}).face(3500, {eyes: 'shut'}).face(4400, {eyes: 'normal'});
    b.k('head', 200, {}).k('head', 1900, {y: 24, r: 4}, 'ease-in').k('head', 2050, {y: -4}).k('head', 2300, {}).k('head', 4000, {y: 24, r: 4}, 'ease-in').k('head', 4400, {});
    b.k('cat', 200, {}).k('cat', 1900, {r: 3}).k('cat', 2050, {}).k('cat', 4000, {r: -3}).k('cat', 4400, {});
    b.fx(1200, 'z', {x: 650, y: 280, s: .5, anim: 'float', dur: 900, dx: 50}).fx(3300, 'z', {x: 650, y: 280, s: .5, anim: 'float', dur: 900, dx: 50});
  });
  act('sleep', '睡著', 4200, (b) => {
    const t = b.tuck(200);
    b.ballFace(t, 'sleep').breathe('ball', t, 3500, 1600, .025).ballTwitch(t + 1400, 'L');
    b.fx(t + 300, 'z', {x: 640, y: 470 + DY, s: .6, anim: 'float', dur: 1400, dx: 60, rise: 160}).fx(t + 1700, 'z', {x: 640, y: 470 + DY, s: .45, anim: 'float', dur: 1300, dx: 50});
    b.untuck(3700).face(3700, {eyes: 'half'}).face(4100, {eyes: 'normal'});
  });
  act('wakeUp', '睡醒伸懶腰', 5400, (b) => {
    b.pose(0, 'loaf').face(0, {eyes: 'closed'}).face(900, {eyes: 'half'});
    b.fx(100, 'z', {x: 640, y: 420 + DY, s: .5, anim: 'float', dur: 800, dx: 40});
    b.swap(1300, 'stand', 'stretch').face(1300, {eyes: 'squeeze', mouth: 'O'});
    banzai(b, 1400, 3300);
    b.k('cat', 1450, {}).k('cat', 1800, {sy: 1.07, sx: .96}).k('cat', 3000, {sy: 1.07, sx: .96}).k('cat', 3400, {});
    b.face(3100, {eyes: 'happy', mouth: 'w'}).twitch(3800, 'L').face(4800, {eyes: 'normal'});
  });
  act('shakeOff', '甩甩頭', 2400, (b) => {
    b.face(400, {eyes: 'squeeze'}).face(1500, {eyes: 'shut'}).face(1900, {eyes: 'normal'});
    b.osc('head', 400, 1400, 70, {r: -11}, {r: 11});
    [[300, -1], [640, 1], [260, 1], [700, -1]].forEach(([x, d], i) => b.fx(500 + i * 120, 'drop', {x, y: 300, s: .3, anim: 'burst', dx: d * 160, dy: -60, dur: 700}));
    b.blink(2000);
  });
  act('maneki', '招財貓', 3600, (b) => {
    b.show(0, {sideR: 0, sideR_up: 1}).face(0, {eyes: 'happy', mouth: 'w', cheeks: 'blush'});
    b.k('armR', 0, {r: -30});
    for (let t = 300; t < 3300; t += 600) b.k('armR', t, {r: -52, sy: .92}, 'ease-in').k('armR', t + 300, {r: -26});
    b.k('armR', 3600, {r: -30});
    b.fx(600, 'sparkle', {x: 800, y: 400, s: .4, anim: 'pop', dur: 800}).fx(2400, 'sparkle', {x: 180, y: 420, s: .35, anim: 'pop', dur: 800}).wag(0, 3600, 900, 5);
  }, {loop: true});
  act('bow', '鞠躬', 3000, (b) => {
    b.face(300, {eyes: 'closed', mouth: 'w'}).face(2500, {eyes: 'happy'}).face(2900, {eyes: 'normal'});
    b.k('head', 300, {}).k('head', 900, {y: 60, sy: .9}).k('head', 1700, {y: 60, sy: .9}).k('head', 2300, {});
    b.k('cat', 300, {}).k('cat', 900, {sy: .93}).k('cat', 1700, {sy: .93}).k('cat', 2300, {});
  });
  act('cheerOn', '加油', 3000, (b) => {
    raise(b, 200, 'R', {r: -30}); lower(b, 2700, 'R', {r: -30});
    b.face(200, {eyes: 'squeeze', mouth: 'open'}).face(2700, {eyes: 'normal', mouth: 'w'});
    for (const t of [600, 1150, 1700]) b.k('armR', t, {r: -30}).k('armR', t + 140, {r: -48, y: -20}, 'ease-out').k('armR', t + 300, {r: -30});
    for (const t of [600, 1150, 1700]) b.k('cat', t, {}).k('cat', t + 140, {sy: 1.04}).k('cat', t + 300, {});
    b.fx(650, 'excl', {x: 760, y: 200, s: .6, anim: 'pop', dur: 1600, tone: 'gold'});
  });
  act('hello', '打招呼', 3200, (b) => {
    b.k('cat', 0, {s: 0}).k('cat', 320, {s: 1.12}, 'ease-out').k('cat', 480, {});
    b.k('glow', 0, {s: 0}).k('glow', 320, {}).fx(120, 'sparkle', {x: 481, y: 900, s: .5, anim: 'pop', dur: 600});
    raise(b, 600, 'R'); wave(b, 780, 2700, 'R'); lower(b, 2950, 'R');
    b.face(300, {eyes: 'happy', mouth: 'grin'}).face(2950, {eyes: 'normal', mouth: 'w'});
  });
  act('bye', '掰掰', 4600, (b) => {
    raise(b, 200, 'R'); wave(b, 380, 1600, 'R'); lower(b, 1800, 'R');
    b.face(200, {eyes: 'happy', mouth: 'smile'});
    b.swap(2000, 'back', 'turn').at(2150);
    waddle(b, 2300, 3800, 0, {step: 440});
    b.k('cat', 3800, {}).k('cat', 4100, {s: 0}, 'ease-in').k('glow', 3800, {}).k('glow', 4100, {s: 0});
    b.fx(4050, 'puff', {x: 481, y: 860, s: .7, anim: 'pop', dur: 500});
  });
  act('fish', '吃魚', 3800, (b) => {
    raise(b, 200, 'R', {r: -86}); lower(b, 2600, 'R', {r: -86});
    b.fx(300, 'fish', {x: 500, y: 520, s: 1.1, anim: 'hold', dur: 2200});
    b.face(300, {eyes: 'star', mouth: 'open'});
    for (let t = 900; t < 2500; t += 300) b.face(t, {mouth: 'w'}).face(t + 150, {mouth: 'open'});
    b.face(2600, {eyes: 'happy', mouth: 'w', tongue: 'lick'}).face(3200, {tongue: null}).face(3500, {eyes: 'normal'});
    b.fx(2600, 'sparkle', {x: 640, y: 520, s: .4, anim: 'pop', dur: 700}).wag(0, 3800, 260, 9);
  });
  act('yarn', '玩毛線', 4600, (b) => {
    b.fx(200, 'yarn', {x: 1100, y: 990, s: .8, anim: 'slide', dx: -1300, dy: 0, dur: 2400, spin: -720});
    b.k('eyes', 200, {}).k('eyes', 900, {x: 14, y: 12}).k('eyes', 1700, {y: 12}).k('eyes', 2500, {x: -14, y: 12}).k('eyes', 3000, {});
    raise(b, 1200, 'R', {r: 30}); arm(b, 'R', 1450, {r: 70}, 'ease-in'); arm(b, 'R', 1700, {r: 20}); lower(b, 2300, 'R', {r: 20});
    b.face(300, {eyes: 'wide'}).face(1450, {eyes: 'squeeze', mouth: 'open'}).face(2400, {eyes: 'happy', mouth: 'w'}).face(4300, {eyes: 'normal'});
    b.hop(2800, 90, 520).wag(0, 4600, 240, 10);
  });
  act('batBug', '撥光點', 4400, (b) => {
    b.fx(200, 'sparkle', {x: 680, y: 300, s: .3, anim: 'orbit', rx: 110, ry: 60, dur: 3200, turns: 2});
    b.osc('eyes', 300, 3300, 400, {x: 12, y: -6}, {x: -10, y: 4});
    raise(b, 1300, 'R');
    for (const t of [1700, 2500]) arm(b, 'R', t, {}).k('armR', t + 150, {r: -28}, 'ease-out').k('armR', t + 320, {});
    lower(b, 3200, 'R');
    b.face(300, {eyes: 'wide'}).face(3400, {eyes: 'star', mouth: 'open'}).face(4100, {eyes: 'normal', mouth: 'w'});
    b.fx(3400, 'sparkle', {x: 680, y: 300, s: .4, anim: 'burst', dx: 0, dy: -120, dur: 700});
  });
  act('purr', '呼嚕呼嚕', 3600, (b) => {
    b.face(200, {eyes: 'closed', mouth: 'w', cheeks: 'blush'}).face(3300, {eyes: 'normal', cheeks: null});
    b.shake('cat', 300, 3200, 1.5, 60).hold('head', 200, 3300, {r: 5});
    b.fx(500, 'note', {x: 740, y: 330, s: .5, anim: 'float', dur: 1300, dx: 40}).fx(1600, 'note', {x: 220, y: 300, s: .45, anim: 'float', dur: 1300, dx: -40}).wag(0, 3600, 900, 4);
  });
  act('fallDown', '跌倒', 4400, (b) => {
    b.face(200, {eyes: 'wide', mouth: 'o'});
    fall(b, 300);
    b.face(700, {eyes: 'cross', mouth: 'wavy'}).fx(760, 'star', {x: 150, y: 860, s: .5, anim: 'burst', dx: -60, dy: -120, dur: 700});
    b.fx(800, 'puff', {x: 200, y: 990, s: .7, anim: 'pop', dur: 500});
    b.face(2400, {eyes: 'dizzy'});
    getUp(b, 2900).face(3300, {eyes: 'happy', mouth: 'w'}).face(4100, {eyes: 'normal'});
    b.k('cat', 3460, {}).osc('head', 3500, 4200, 160, {r: -8}, {r: 8});
  });
  act('peekaboo', '躲貓貓', 3800, (b) => {
    b.k('cat', 200, {}).k('cat', 500, {sx: 1.2, sy: .1}, 'ease-in').k('cat', 2100, {sx: 1.2, sy: .1}).k('cat', 2300, {sx: .9, sy: 1.15}, 'ease-out').k('cat', 2500, {});
    b.k('glow', 200, {}).k('glow', 500, {s: .6}).k('glow', 2100, {s: .6}).k('glow', 2300, {});
    b.fx(450, 'puff', {x: 481, y: 990, s: .7, anim: 'pop', dur: 500});
    raise(b, 2100, 'R'); raise(b, 2100, 'L'); lower(b, 3000, 'R'); lower(b, 3000, 'L');
    b.face(2100, {eyes: 'wide', mouth: 'open'}).face(2900, {eyes: 'happy', mouth: 'w'}).face(3500, {eyes: 'normal'});
    b.fx(2300, 'excl', {x: 760, y: 170, s: .6, anim: 'pop', dur: 900});
  });
  act('salute', '敬禮', 2800, (b) => {
    raise(b, 300, 'R', {r: -62}); lower(b, 2400, 'R', {r: -62});
    b.face(300, {eyes: 'normal', mouth: 'smile', brows: 'flat'}).face(2400, {mouth: 'w', brows: null});
    b.k('cat', 300, {}).k('cat', 480, {sy: 1.04}).k('cat', 2200, {sy: 1.04}).k('cat', 2400, {});
    b.fx(500, 'sparkle', {x: 760, y: 300, s: .35, anim: 'pop', dur: 700});
  });
  act('point', '指向前方', 3000, (b) => {
    raise(b, 300, 'R', {r: 31}); arm(b, 'R', 900, {r: 31}); arm(b, 'R', 1000, {r: 26}); arm(b, 'R', 1100, {r: 31}); lower(b, 2600, 'R', {r: 31});
    b.face(300, {eyes: 'normal', mouth: 'open', brows: 'up'}).face(2600, {mouth: 'w', brows: null});
    b.hold('eyes', 300, 2600, {x: 14}).hold('head', 300, 2600, {r: 4});
    b.fx(1000, 'lines', {x: 900, y: 560, s: .7, r: 90, anim: 'pop', dur: 800});
  });
  act('heartArms', '比愛心', 3400, (b) => {
    raise(b, 300, 'R', {r: -46}); raise(b, 300, 'L', {r: -46}); lower(b, 3000, 'R', {r: -46}); lower(b, 3000, 'L', {r: -46});
    b.face(400, {eyes: 'happy', mouth: 'w', cheeks: 'blush'}).face(3000, {eyes: 'normal', cheeks: null});
    b.fx(700, 'heart', {x: 475, y: 80, s: .8, anim: 'pulse', dur: 2000});
  });
  act('clap', '拍手', 3200, (b) => {
    banzai(b, 300, 2800);
    for (let t = 600; t < 2500; t += 260) { arm(b, 'R', t, {r: 0}).k('armR', t + 110, {r: -34}); arm(b, 'L', t, {r: 0}).k('armL', t + 110, {r: 34}); }
    arm(b, 'R', 2600, {}); arm(b, 'L', 2600, {});
    b.face(300, {eyes: 'happy', mouth: 'open'}).face(2900, {eyes: 'normal', mouth: 'w'});
    for (const t of [710, 1230, 1750, 2270]) b.fx(t, 'sparkle', {x: 475, y: 300, s: .3, anim: 'pop', dur: 400});
  });

  // ======================= 其他：移動 =======================
  group('move', '移動');
  act('walk', '走過去再走回來', 6400, (b) => {
    waddle(b, 300, 2900, 700, {step: 460});
    b.face(3000, {eyes: 'happy'}).face(3300, {eyes: 'normal'}).twitch(3050, 'R');
    waddle(b, 3400, 6000, -700, {step: 460});
    b.wag(300, 6000, 460, 7);
  });
  act('run', '跑過去再跑回來', 4000, (b) => {
    b.face(200, {eyes: 'wide', mouth: 'open'}).face(3700, {eyes: 'happy', mouth: 'w'});
    raise(b, 250, 'R', {r: 20}); raise(b, 250, 'L', {r: 20}); lower(b, 3500, 'R', {r: 20}); lower(b, 3500, 'L', {r: 20});
    waddle(b, 400, 1700, 900, {step: 220, sway: 6, bob: 14});
    waddle(b, 1900, 3200, -900, {step: 220, sway: 6, bob: 14});
    b.fx(700, 'speed', {x: 200, y: 820, s: 1, anim: 'hold', dur: 800}).fx(2200, 'speed', {x: 760, y: 820, s: 1, r: 180, anim: 'hold', dur: 800});
  });
  act('rollIn', '滾進來', 3400, (b) => {
    b.pose(0, 'ball'); b.k('move', 0, {x: -2 * TURN, y: 0}); b.mx = -2 * TURN; b.br = -720;
    const t = b.roll(100, 2 * TURN, 1700);
    b.untuck(t + 60).face(t + 60, {eyes: 'happy', mouth: 'open'}).face(3100, {eyes: 'normal', mouth: 'w'});
    raise(b, t + 120, 'R'); raise(b, t + 120, 'L'); lower(b, 3100, 'R'); lower(b, 3100, 'L');
    b.fx(t + 100, 'sparkle', {x: 780, y: 300, s: .5, anim: 'pop', dur: 700});
  });
  act('zoomies', '暴衝', 5200, (b) => {
    b.face(200, {eyes: 'wide', mouth: 'open'});
    waddle(b, 300, 1000, 900, {step: 180, sway: 7, bob: 16});
    waddle(b, 1100, 2500, -1800, {step: 180, sway: 7, bob: 16});
    waddle(b, 2600, 3300, 900, {step: 180, sway: 7, bob: 16});
    b.face(3400, {eyes: 'dizzy', mouth: 'w'}).face(4900, {eyes: 'normal'}).osc('head', 3500, 4800, 400, {r: -6}, {r: 6});
  });
  act('tiptoe', '躡手躡腳', 5600, (b) => {
    b.face(300, {eyes: 'half', mouth: 'flat'}).face(5300, {eyes: 'normal', mouth: 'w'});
    raise(b, 300, 'R', {r: 40}); raise(b, 300, 'L', {r: 40}); lower(b, 5100, 'R', {r: 40}); lower(b, 5100, 'L', {r: 40});
    b.hold('head', 400, 5100, {y: 18}, 300);
    waddle(b, 600, 2600, 400, {step: 800, sway: 2, bob: 2});
    b.osc('eyes', 2700, 3300, 300, {x: -10}, {x: 10}).fx(2800, 'dots', {x: 760, y: 160, s: .8, anim: 'hold', dur: 900});
    waddle(b, 3400, 5000, -400, {step: 800, sway: 2, bob: 2});
  });
  act('hopAcross', '跳過去', 4400, (b) => {
    b.face(200, {eyes: 'happy', mouth: 'open'}).face(4100, {eyes: 'normal', mouth: 'w'});
    for (let i = 0; i < 4; i++) hopTo(b, 300 + i * 480, i * 200, (i + 1) * 200, 80, 460);
    for (let i = 0; i < 4; i++) hopTo(b, 2400 + i * 440, 800 - i * 200, 800 - (i + 1) * 200, 60, 420);
  });
  act('slide', '滑步', 4200, (b) => {
    b.face(200, {eyes: 'happy', mouth: 'smile'}).face(3900, {eyes: 'normal', mouth: 'w'});
    for (let i = 0; i < 6; i++) b.show(400 + i * 300, {legs: 0, legsL: i % 2 ? 0 : 1, legsR: i % 2 ? 1 : 0});
    b.show(2200, {legs: 1, legsL: 0, legsR: 0});
    b.moveTo(400, null, null, 'linear'); b.mx = -600; b.at(2200);
    b.moveTo(2600, null, null, 'ease-in-out'); b.mx = 0; b.at(3600);
    b.osc('cat', 400, 2200, 300, {r: -3}, {r: 3}).hold('eyes', 400, 2200, {x: 12});
    b.fx(800, 'speed', {x: 760, y: 900, s: .9, r: 180, anim: 'hold', dur: 1200});
  });
  act('march', '踏步前進', 4800, (b) => {
    b.face(200, {eyes: 'normal', mouth: 'open'}).face(4500, {mouth: 'w'});
    raise(b, 300, 'R', {r: 40});
    for (let t = 500; t < 4100; t += 450) arm(b, 'R', t, {r: 40}).k('armR', t + 225, {r: 0});
    waddle(b, 500, 2300, 500, {step: 450, sway: 2, bob: 10});
    waddle(b, 2300, 4100, -500, {step: 450, sway: 2, bob: 10});
    lower(b, 4400, 'R', {r: 40});
    b.fx(800, 'note', {x: 780, y: 250, s: .45, anim: 'float', dur: 1200}).fx(2600, 'note', {x: 200, y: 250, s: .45, anim: 'float', dur: 1200});
  });

  // ======================= 其他：學習情境 =======================
  group('study', '學習情境');
  act('read', '讀書', 4400, (b) => {
    b.pose(0, 'sit').fx(0, 'book', {x: 475, y: 700, s: 1.8, anim: 'hold', dur: 4400});
    b.k('eyes', 0, {x: -12, y: 10}).k('eyes', 1200, {x: 12, y: 10}).k('eyes', 1300, {x: -12, y: 14}).k('eyes', 2500, {x: 12, y: 14}).k('eyes', 2700, {x: -12, y: 10}).k('eyes', 3900, {x: 12, y: 10}).k('eyes', 4400, {x: -12, y: 10});
    b.k('head', 0, {y: 8}).k('head', 2200, {y: 12, r: 2}).k('head', 4400, {y: 8});
    b.fx(2500, 'sparkle', {x: 620, y: 660, s: .25, anim: 'pop', dur: 500});
  }, {loop: true});
  act('correct', '答對了', 2200, (b) => {
    raise(b, 150, 'R', {r: -30}); lower(b, 1900, 'R', {r: -30});
    b.face(150, {eyes: 'happy', mouth: 'open'}).face(1900, {eyes: 'normal', mouth: 'w'});
    b.fx(200, 'check', {x: 760, y: 180, s: .9, anim: 'pop', dur: 1300}).hop(300, 100, 560).wag(0, 2200, 220, 9);
  });
  act('wrong', '答錯了', 3000, (b) => {
    raise(b, 150, 'R', {r: -62}); lower(b, 1700, 'R', {r: -62});
    b.face(150, {mouth: 'wavy', brows: 'sad'}).face(1800, {eyes: 'happy', mouth: 'smile', brows: null}).face(2700, {eyes: 'normal', mouth: 'w'});
    b.hold('head', 150, 1700, {r: 6}).hold('eyes', 150, 1600, {x: -10, y: 8});
    b.fx(300, 'drop', {x: 720, y: 250, s: .45, anim: 'hold', dur: 1300, tone: 'blue'}).nod(1900, 10, 420);
  });
  act('streak', '連對', 2800, (b) => {
    b.face(150, {eyes: 'happy', mouth: 'open'}).face(1400, {eyes: 'star'}).face(2500, {eyes: 'normal', mouth: 'w'});
    raise(b, 1250, 'R'); raise(b, 1250, 'L'); lower(b, 2300, 'R'); lower(b, 2300, 'L');
    [[200, 60], [750, 90], [1300, 140]].forEach(([t, h], i) => {
      b.hop(t, h, 500);
      b.fx(t + 200, 'sparkle', {x: [300, 650, 475][i], y: [300, 250, 80][i], s: .35 + i * .12, anim: 'pop', dur: 700});
    });
    b.wag(0, 2800, 200, 10);
  });
  act('levelUp', '升級', 3600, (b) => {
    banzai(b, 300, 3200, 260);
    b.face(300, {eyes: 'star', mouth: 'open'}).face(3300, {eyes: 'normal', mouth: 'w'});
    b.k('glow', 500, {}).k('glow', 900, {s: 1.6}).k('glow', 2600, {s: 1.6}).k('glow', 3100, {});
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      b.fx(800, 'star', {x: 475, y: 400, s: .4, anim: 'burst', dx: Math.cos(a) * 400, dy: Math.sin(a) * 320, dur: 1100, spin: 180});
    }
    b.hop(1200, 80, 500);
  });
  act('done', '完成今天', 5000, (b) => {
    banzai(b, 300, 4400, 300);
    b.face(300, {eyes: 'happy', mouth: 'grin', cheeks: 'blush'}).face(4600, {eyes: 'normal', mouth: 'w', cheeks: null});
    b.hop(900, 90, 500).hop(1600, 110, 520).hop(2350, 90, 500);
    const conf = ['gold', 'pink', 'accent', 'green', 'blue', 'gold', 'pink', 'accent', 'green', 'blue'];
    conf.forEach((tone, i) => b.fx(500 + i * 220, 'confetti', {x: 100 + (i * 97) % 760, y: -60, s: .6, anim: 'fall', fall: 1000, dur: 1700, spin: 540, tone}));
    b.fx(1800, 'heart', {x: 800, y: 260, s: .5, anim: 'float', dur: 1300}).fx(2600, 'heart', {x: 160, y: 260, s: .5, anim: 'float', dur: 1300});
  });
  act('loading', '載入中', 1600, (b) => {
    b.pose(0, 'ball').k('ball', 0, {}, 'linear').k('ball', 1600, {r: 360});
    b.fx(0, 'dots', {x: 520, y: 400 + DY, s: .9, anim: 'blink', dur: 1600});
  }, {loop: true});
  act('lost', '迷路（離線）', 4400, (b) => {
    raise(b, 200, 'R', {r: -62}); lower(b, 4000, 'R', {r: -62});
    b.face(200, {eyes: 'wide', mouth: 'wavy'}).face(4100, {eyes: 'normal', mouth: 'w'});
    b.k('head', 200, {}).k('head', 600, {r: -9}).k('head', 1500, {r: -9}).k('head', 2000, {r: 9}).k('head', 2900, {r: 9}).k('head', 3400, {});
    b.k('eyes', 200, {}).k('eyes', 600, {x: -14}).k('eyes', 1500, {x: -14}).k('eyes', 2000, {x: 14}).k('eyes', 2900, {x: 14}).k('eyes', 3400, {});
    b.fx(500, 'question', {x: 190, y: 200, s: .5, anim: 'pop', dur: 1100}).fx(1900, 'question', {x: 770, y: 180, s: .55, anim: 'pop', dur: 1100});
    b.fx(3200, 'question', {x: 475, y: 70, s: .7, anim: 'pop', dur: 1100}).fx(3300, 'drop', {x: 720, y: 270, s: .4, anim: 'hold', dur: 900, tone: 'blue'});
  });
  act('welcome', '歡迎回來', 3600, (b) => {
    b.k('cat', 0, {s: 0}).k('cat', 320, {s: 1.12}, 'ease-out').k('cat', 480, {});
    b.k('glow', 0, {s: 0}).k('glow', 320, {});
    b.face(200, {eyes: 'happy', mouth: 'grin', cheeks: 'blush'}).face(3300, {eyes: 'normal', mouth: 'w', cheeks: null});
    banzai(b, 600, 2600, 240);
    b.fx(800, 'heart', {x: 790, y: 280, s: .5, anim: 'float', dur: 1300}).fx(1500, 'heart', {x: 170, y: 280, s: .45, anim: 'float', dur: 1300}).hop(2800, 70, 520);
  });
  act('remind', '提醒練習', 3600, (b) => {
    raise(b, 200, 'R', {r: 20}); lower(b, 2600, 'R', {r: 20});
    b.face(200, {mouth: 'o', brows: 'up'}).face(2600, {eyes: 'happy', mouth: 'smile', brows: null}).face(3300, {eyes: 'normal', mouth: 'w'});
    for (let t = 600; t < 2300; t += 280) b.k('armR', t, {r: 20}).k('armR', t + 140, {r: 34, sy: .92}, 'ease-in');
    b.fx(500, 'excl', {x: 760, y: 200, s: .6, anim: 'pulse', dur: 1900}).hold('head', 2600, 3400, {r: -5}, 200, 200);
  });
  act('kana', '學會新字', 3600, (b) => {
    raise(b, 200, 'R', {r: -40}); lower(b, 3200, 'R', {r: -40});
    b.fx(300, 'kana', {x: 475, y: 60, s: 1.4, anim: 'pop', dur: 2600});
    b.face(300, {eyes: 'wide', mouth: 'o'}).face(1200, {eyes: 'star', mouth: 'open'}).face(3200, {eyes: 'normal', mouth: 'w'});
    b.hold('eyes', 300, 1200, {y: -10}, 150, 150).nod(1500).nod(2050);
    b.fx(1300, 'sparkle', {x: 700, y: 120, s: .4, anim: 'pop', dur: 700}).fx(1700, 'sparkle', {x: 250, y: 150, s: .35, anim: 'pop', dur: 700});
  });
  act('cheerYou', '為你加油', 3600, (b) => {
    banzai(b, 300, 3200);
    for (let t = 520; t < 3000; t += 400) { arm(b, 'R', t, {}).k('armR', t + 200, {r: -24, y: -10}); arm(b, 'L', t, {}).k('armL', t + 200, {r: 24, y: -10}); }
    b.face(300, {eyes: 'squeeze', mouth: 'open'}).face(3300, {eyes: 'normal', mouth: 'w'});
    for (let t = 520; t < 3000; t += 800) b.hop(t, 50, 380);
    b.fx(600, 'excl', {x: 160, y: 220, s: .6, anim: 'pop', dur: 900, tone: 'gold'}).fx(1400, 'excl', {x: 790, y: 220, s: .6, anim: 'pop', dur: 900, tone: 'gold'});
    b.fx(2200, 'heart', {x: 475, y: 70, s: .6, anim: 'pop', dur: 900});
  });

  // ======================= 其他：跳舞 =======================
  group('dance', '跳舞');
  act('swayArms', '左右搖擺', 4800, (b) => {
    banzai(b, 200, 4400);
    b.osc('cat', 400, 4200, 600, {r: 6}, {r: -6}).osc('armR', 400, 4200, 600, {r: 12}, {r: -10}).osc('armL', 400, 4200, 600, {r: 12}, {r: -10});
    b.face(200, {eyes: 'happy', mouth: 'w'}).face(4500, {eyes: 'normal'});
    b.fx(600, 'note', {x: 780, y: 250, s: .45, anim: 'float', dur: 1300}).fx(2400, 'note', {x: 180, y: 250, s: .45, anim: 'float', dur: 1300});
  });
  act('waveDance', '輪流揮手', 4800, (b) => {
    for (let i = 0; i < 4; i++) {
      const side = i % 2 ? 'L' : 'R', t = 300 + i * 1000;
      raise(b, t, side); wave(b, t + 180, t + 700, side, 160); lower(b, t + 900, side);
      b.k('cat', t, {}).k('cat', t + 450, {r: side === 'R' ? 5 : -5}).k('cat', t + 900, {});
    }
    b.face(200, {eyes: 'happy', mouth: 'open'}).face(4500, {eyes: 'normal', mouth: 'w'});
  });
  act('banzaiDance', '萬歲舞', 4400, (b) => {
    b.face(200, {eyes: 'squeeze', mouth: 'open'}).face(4100, {eyes: 'normal', mouth: 'w'});
    for (let i = 0; i < 4; i++) { const t = 300 + i * 900; raise(b, t, 'R'); raise(b, t, 'L'); b.hop(t, 70, 500); lower(b, t + 700, 'R'); lower(b, t + 700, 'L'); }
    b.fx(1300, 'sparkle', {x: 160, y: 300, s: .4, anim: 'pop', dur: 600}).fx(2200, 'sparkle', {x: 800, y: 300, s: .4, anim: 'pop', dur: 600});
  });
  act('stepDance', '踏步舞', 4400, (b) => {
    b.face(200, {eyes: 'happy', mouth: 'w'}).face(4100, {eyes: 'normal'});
    waddle(b, 300, 3900, 0, {step: 400, sway: 6, bob: 10});
    raise(b, 300, 'R', {r: 40}); raise(b, 300, 'L', {r: 40});
    for (let t = 300; t < 3800; t += 400) { arm(b, 'R', t + 180, {r: 40}); arm(b, 'R', t + 380, {r: 10}); arm(b, 'L', t + 180, {r: 10}); arm(b, 'L', t + 380, {r: 40}); }
    lower(b, 4100, 'R', {r: 40}); lower(b, 4100, 'L', {r: 40});
  });
  act('spinDance', '轉圈舞', 4000, (b) => {
    b.face(200, {eyes: 'happy', mouth: 'open'}).face(3700, {eyes: 'normal', mouth: 'w'});
    banzai(b, 200, 3500);
    for (const t of [800, 1800]) b.swap(t, 'back', 'turn', 200).swap(t + 350, 'stand', 'turn', 200);
    b.fx(1200, 'sparkle', {x: 180, y: 400, s: .4, anim: 'pop', dur: 600}).fx(2200, 'sparkle', {x: 780, y: 400, s: .4, anim: 'pop', dur: 600});
  });
  act('bounce', '彈跳舞', 4000, (b) => {
    b.face(200, {eyes: 'happy', mouth: 'open'}).face(3700, {eyes: 'normal', mouth: 'w'});
    for (let i = 0; i < 6; i++) b.hop(300 + i * 540, 50 + (i % 3) * 30, 500);
    raise(b, 1300, 'R'); lower(b, 2000, 'R'); raise(b, 2400, 'L'); lower(b, 3100, 'L');
  });
  act('wiggle', '扭扭舞', 3600, (b) => {
    b.face(200, {eyes: 'happy', mouth: 'w', cheeks: 'blush'}).face(3300, {eyes: 'normal', cheeks: null});
    b.osc('cat', 300, 3300, 160, {r: 4, x: -6}, {r: -4, x: 6}).osc('legs', 300, 3300, 160, {r: -3}, {r: 3}).wag(300, 3300, 160, 12);
    b.fx(500, 'note', {x: 760, y: 280, s: .4, anim: 'float', dur: 1100}).fx(1700, 'note', {x: 200, y: 280, s: .4, anim: 'float', dur: 1100});
  });
  act('pointUp', '指天舞', 4400, (b) => {
    b.face(200, {eyes: 'normal', mouth: 'open'}).face(4100, {mouth: 'w'});
    for (let i = 0; i < 3; i++) {
      const t = 300 + i * 1200;
      raise(b, t, 'R', {r: -50}); b.k('cat', t, {}).k('cat', t + 300, {r: 6}); lower(b, t + 900, 'R', {r: 32}); b.k('cat', t + 900, {r: -4}).k('cat', t + 1100, {});
      arm(b, 'R', t + 600, {r: -50}); arm(b, 'R', t + 720, {r: 32}, 'ease-in');
    }
    b.fx(600, 'sparkle', {x: 760, y: 140, s: .4, anim: 'pop', dur: 500}).fx(1800, 'sparkle', {x: 760, y: 140, s: .4, anim: 'pop', dur: 500});
  });
  act('robot', '機器人舞', 4400, (b) => {
    b.face(200, {eyes: 'dot', mouth: 'flat'}).face(4100, {eyes: 'normal', mouth: 'w'});
    raise(b, 300, 'R', {r: 31}); raise(b, 300, 'L', {r: 31});
    const steps = [[700, 31, 31, 0], [1100, -40, 31, 6], [1500, -40, -40, 0], [1900, 31, -40, -6], [2300, 31, 31, 0], [2700, 70, 31, 4], [3100, 31, 70, -4], [3500, 31, 31, 0]];
    for (const [t, r, l, lean] of steps) { arm(b, 'R', t, {r}, 'step-end'); arm(b, 'L', t, {r: l}, 'step-end'); b.k('cat', t, {r: lean}, 'step-end'); b.k('head', t, {r: -lean}, 'step-end'); }
    lower(b, 4000, 'R', {r: 31}); lower(b, 4000, 'L', {r: 31}); b.k('cat', 3900, {}).k('head', 3900, {});
  });
  act('moonwalk', '太空步', 4800, (b) => {
    b.face(200, {eyes: 'happy', mouth: 'smile'}).face(4500, {eyes: 'normal', mouth: 'w'});
    for (let i = 0; i < 8; i++) b.show(400 + i * 260, {legs: 0, legsL: i % 2 ? 0 : 1, legsR: i % 2 ? 1 : 0});
    b.show(2480, {legs: 1, legsL: 0, legsR: 0});
    b.moveTo(400, null, null, 'linear'); b.mx = -500; b.at(2480);
    b.swap(2700, 'back', 'turn', 200).swap(3000, 'stand', 'turn', 200);
    b.moveTo(3200, null, null, 'ease-in-out'); b.mx = 0; b.at(4300);
    raise(b, 2600, 'R', {r: -40}); lower(b, 3300, 'R', {r: -40});
  });
  act('headBob', '搖頭晃腦', 4000, (b) => {
    b.face(200, {eyes: 'closed', mouth: 'w'}).face(3700, {eyes: 'normal'});
    for (let t = 300; t < 3700; t += 400) b.k('head', t, {}).k('head', t + 200, {y: 10, r: (t / 400) % 2 < 1 ? -6 : 6}).k('head', t + 400, {});
    for (let t = 300; t < 3700; t += 400) b.k('cat', t, {}).k('cat', t + 200, {sy: .98}).k('cat', t + 400, {});
    b.fx(500, 'note', {x: 780, y: 240, s: .45, anim: 'float', dur: 1200}).fx(2100, 'note', {x: 180, y: 240, s: .45, anim: 'float', dur: 1200});
  });
  act('finale', '謝幕', 4600, (b) => {
    b.face(200, {eyes: 'star', mouth: 'grin'}).face(2400, {eyes: 'closed', mouth: 'w'}).face(4300, {eyes: 'normal'});
    banzai(b, 200, 2000);
    b.hop(300, 160, 640);
    b.fx(800, 'star', {x: 150, y: 300, s: .5, anim: 'pop', dur: 900}).fx(900, 'star', {x: 800, y: 300, s: .5, anim: 'pop', dur: 900});
    b.k('head', 2200, {}).k('head', 2700, {y: 60, sy: .9}).k('head', 3500, {y: 60, sy: .9}).k('head', 4000, {});
    b.k('cat', 2200, {}).k('cat', 2700, {sy: .93}).k('cat', 3500, {sy: .93}).k('cat', 4000, {});
    const conf = ['gold', 'pink', 'accent', 'green', 'blue', 'gold'];
    conf.forEach((tone, i) => b.fx(2700 + i * 150, 'confetti', {x: 150 + i * 130, y: -40, s: .6, anim: 'fall', fall: 900, dur: 1500, spin: 540, tone}));
  });

  window.CAT02_ACTIONS = K.actions;
  window.CAT02_GROUPS = K.groups;
  // the builder and Cat_02's own moves, for actions made on the spot (the app's mascot walks to wherever there is room)
  window.CAT02_MOVES = {K, waddle, raise, lower, arm, wave, banzai, hopTo};
})();
