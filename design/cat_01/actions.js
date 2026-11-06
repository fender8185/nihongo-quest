/* Cat_01 actions: every move the cat knows (built with neon_cat/builder.js, played by neon_cat/player.js).
 * Positions are in cat units: the sitting cat's feet are on y = 866, a ball turn covers 2π·183 ≈ 1150.
 * Parts: move (whole cat on the stage), flip (mirror), cat (squash and stretch at the feet), head, eyes, mouth, tail,
 * ball, pawL/pawR, pawR_up, pawR_lick, armL, armR, legFN/legFF/legBN/legBF, glow.
 * Head drawings (shown with show/earsTo/twitch): head, headFlat, headFlatHalf, headTwL, headTwR, headPerk.
 */
(function () {
  'use strict';
  const K = window.NeonCatActions(window.CAT01_DATA.consts, {rest: 'sit'});
  const {act, group, TURN, DEG, BALL_R} = K;
  // Head positions per pose (for placing effects): centre of the face and top of the head.
  const HEAD = {sit: [475, 400, 160], loaf: [475, 560, 320], stand: [475, 322, 82], side: [643, 412, 206], belly: [330, 610, 420], ball: [520, 600, 440]};

  const H = HEAD.sit;

  // ======================= 基本模組 =======================
  group('base', '基本模組');
  act('sit', '坐著', 4200, (b) => b.blink(3600).wag(0, 4200, 1050, 5).breathe('cat', 0, 4200, 2100, .012), {loop: true});
  act('loaf', '趴著', 5600, (b) => {
    b.pose(0, 'loaf').breathe('cat', 0, 5600, 2800, .015).wag(0, 5600, 1400, 5);
    b.blink(1400).blink(4700).twitch(800, 'L').twitch(4000, 'R');
    // kneading: the front paws press down in turn, eyes shut with contentment
    b.face(2000, {eyes: 'closed'}).face(3500, {eyes: 'normal'});
    for (const [paw, t0] of [['pawL', 2100], ['pawR', 2420]]) {
      b.k(paw, 0, {});
      for (let t = t0; t < 3400; t += 640) b.k(paw, t, {}).k(paw, t + 90, {y: -16, sy: .9}).k(paw, t + 220, {});
      b.k(paw, 5600, {});
    }
    b.hold('head', 2000, 3500, {y: 5});
  }, {loop: true});
  act('side', '側面', 5000, (b) => {
    b.pose(0, 'side').breathe('cat', 0, 5000, 2500, .012).wag(0, 5000, 700, 8);
    b.blink(2700).twitch(1000, 'L').twitch(3800, 'R');
    // lifts a front paw, curious
    b.k('legFN', 0, {}).k('legFN', 1700, {}).k('legFN', 1950, {r: -34, y: -6}).k('legFN', 2400, {r: -34, y: -6}).k('legFN', 2650, {}).k('legFN', 5000, {});
    b.hold('head', 1700, 2700, {r: 5}).hold('eyes', 1700, 2700, {x: 10, y: -4});
    b.face(1750, {mouth: 'o'}).face(2650, {mouth: 'w'});
  }, {loop: true});
  act('back', '背面', 5200, (b) => {
    b.pose(0, 'back').breathe('cat', 0, 5200, 2600, .012);
    b.osc('tail', 0, 5200, 1300, {r: -4}, {r: 3});
    b.k('head', 0, {}).k('head', 1300, {r: -5}).k('head', 2600, {}).k('head', 3900, {r: 5}).k('head', 5200, {});
    b.twitch(700, 'R').twitch(2000, 'L').twitch(3400, 'R');   // listening to something behind it
  }, {loop: true});
  act('belly', '翻肚', 4800, (b) => {
    b.pose(0, 'belly').face(0, {eyes: 'happy', mouth: 'w'}).blink(3300).twitch(2000, 'R');
    b.osc('legFN', 0, 4800, 600, {r: -12}, {r: 8}).osc('legBN', 0, 4800, 600, {r: 10}, {r: -10});
    b.osc('legFF', 0, 4800, 600, {r: 8}, {r: -8}).osc('legBF', 0, 4800, 600, {r: -8}, {r: 8});
    b.osc('cat', 0, 4800, 1200, {r: -2}, {r: 2}).osc('head', 0, 4800, 1200, {r: 5}, {r: -5}).wag(0, 4800, 600, 8);
  }, {loop: true});
  act('stand', '站起來', 5200, (b) => {
    b.pose(0, 'stand').breathe('cat', 0, 5200, 2600, .01).wag(0, 5200, 1300, 5).blink(4300).twitch(600, 'L');
    // both paws up to show the beans, wiggle, and down again
    for (const [arm, a] of [['armL', 128], ['armR', -128]]) {
      b.k(arm, 0, {}).k(arm, 1000, {}).k(arm, 1300, {r: a}, 'ease-out');
      b.osc(arm, 1300, 2900, 260, {r: a + 10 * Math.sign(a)}, {r: a - 6 * Math.sign(a)}, undefined, {r: a});
      b.k(arm, 3200, {}).k(arm, 5200, {});
    }
    b.palms(1150, 3050).face(1150, {eyes: 'happy', mouth: 'open'}).face(3050, {eyes: 'normal', mouth: 'w'});
    b.k('cat', 1300, {}).k('cat', 1420, {sy: 1.04, sx: .97}).k('cat', 1560, {});
  }, {loop: true});
  act('ball', '縮成球', 4800, (b) => {
    b.pose(0, 'ball').ballFace(0, 'sleep').breathe('ball', 0, 4800, 2400, .02);
    b.ballTwitch(1500, 'L').ballTwitch(3500, 'R');
    b.fx(400, 'z', {x: 640, y: 470, s: .6, anim: 'float', dur: 1600, dx: 60, rise: 160}).fx(2700, 'z', {x: 640, y: 470, s: .45, anim: 'float', dur: 1500, dx: 50, rise: 140});
  }, {loop: true});
  act('flat', '飛機耳', 5200, (b) => {
    b.earsTo(500, 'headFlatHalf').earsTo(640, 'headFlat');
    b.face(500, {eyes: 'half', mouth: 'flat'}).face(4300, {eyes: 'normal', mouth: 'w'});
    for (const t of [1800, 3000]) b.earsTo(t, 'headFlatHalf').earsTo(t + 80, 'headFlat').earsTo(t + 160, 'headFlatHalf').earsTo(t + 240, 'headFlat');
    b.earsTo(4200, 'headFlatHalf').earsTo(4340, 'head');
    b.k('tail', 0, {}).k('tail', 1100, {});
    for (const t of [1200, 2500, 3500]) b.k('tail', t, {r: -12}, 'ease-out').k('tail', t + 120, {r: 6}).k('tail', t + 260, {});
    b.k('tail', 5200, {}).blink(2600);
  }, {loop: true});
  act('pawUp', '舉手', 4600, (b) => {
    b.show(300, {pawR: 0, pawR_up: 1}).show(3900, {pawR: 1, pawR_up: 0});
    b.k('pawR_up', 300, {r: 30, sy: .55}).k('pawR_up', 600, {}, 'ease-out');
    b.osc('pawR_up', 600, 3600, 600, {r: -8}, {r: 6}).k('pawR_up', 3900, {r: 30, sy: .55});
    b.face(300, {eyes: 'happy', mouth: 'w'}).face(3900, {eyes: 'normal'});
    b.twitch(1600, 'R').wag(0, 4600, 1150, 5);
  }, {loop: true});
  act('turn', '轉一圈', 4400, (b) => {
    b.turnTo(600, 'side', false).turnTo(1300, 'back', false).twitch(1700, 'R');
    b.turnTo(2200, 'side', true).turnTo(2900, 'sit', false);
    b.hop(3150, 70, 520).face(3150, {eyes: 'happy'}).face(4000, {eyes: 'normal'}).blink(4200);
  });

  // ======================= 無聊（輪播） =======================
  group('bored', '無聊');
  act('yawn', '打哈欠', 3200, (b) => {
    b.face(400, {eyes: 'squeeze', mouth: 'O'}).face(1800, {eyes: 'half', mouth: 'smile'}).face(2500, {eyes: 'normal', mouth: 'w'});
    b.k('head', 0, {}).k('head', 300, {}).k('head', 700, {r: -6, y: -10}).k('head', 1600, {r: -6, y: -10}).k('head', 2100, {});
    b.k('cat', 0, {}).k('cat', 700, {sx: .97, sy: 1.04}).k('cat', 1600, {sx: .97, sy: 1.04}).k('cat', 2100, {});
    b.fx(1500, 'drop', {x: 360, y: 430, s: .32, anim: 'fall', fall: 60, dur: 900});
    b.blink(2800).wag(0, 3200, 800, 4);
  });
  act('lickPaw', '舔腳掌', 4200, (b) => {
    b.show(300, {pawR: 0, pawR_lick: 1}).show(3700, {pawR: 1, pawR_lick: 0});
    b.face(650, {eyes: 'closed', tongue: 'lick'}).face(2700, {eyes: 'happy', tongue: null}).face(3500, {eyes: 'normal'});
    b.k('pawR_lick', 300, {r: 30, sy: .5}).k('pawR_lick', 600, {});
    for (const t of [900, 1400, 1900, 2400]) {
      b.k('pawR_lick', t, {y: -8}).k('pawR_lick', t + 250, {});
      b.k('head', t - 1, {}).k('head', t, {y: 6, r: -2}).k('head', t + 250, {});
    }
    b.k('pawR_lick', 3300, {}).k('pawR_lick', 3650, {r: 30, sy: .5});
    b.wag(0, 4200, 1050, 4);
  });
  act('lickLips', '舔舌頭', 2800, (b) => {
    b.face(250, {eyes: 'happy', tongue: 'small'}).face(450, {tongue: 'lick'}).face(650, {tongue: 'small'}).face(800, {tongue: null});
    b.face(1250, {tongue: 'small'}).face(1450, {tongue: 'lick'}).face(1650, {tongue: 'small'}).face(1800, {tongue: null});
    b.face(2100, {eyes: 'closed', mouth: 'w'}).face(2500, {eyes: 'normal'});
    b.hold('head', 200, 2000, {r: -4}).wag(0, 2800, 700, 4);
  });
  act('rollAcross', '滾過去再滾回來', 7000, (b) => {
    let t = b.tuck(300);
    t = b.roll(t, TURN, 1400);
    b.untuck(t + 60);
    b.face(t + 60, {eyes: 'happy'}).face(t + 700, {eyes: 'normal'}).blink(t + 900);
    t = b.tuck(t + 1200);
    t = b.roll(t, -TURN, 1400);
    b.untuck(t + 60);
    b.face(t + 60, {eyes: 'happy'}).face(6700, {eyes: 'normal'});
  });
  act('rollRock', '原地滾來滾去', 4600, (b) => {
    const t = b.tuck(300), d = 50 / DEG * BALL_R;
    b.k('ball', t, {}); b.at(t);
    let s = t;
    for (const sign of [1, -1, 1, -1]) { b.k('ball', s + 420, {r: sign * 50}); b.k('move', s + 420, {x: sign * d, y: 0}); s += 420; }
    b.k('ball', s + 420, {}); b.k('move', s + 420, {x: 0, y: 0});
    b.untuck(s + 500);
    b.face(s + 500, {eyes: 'happy'}).face(4400, {eyes: 'normal'});
  });
  act('bellyWiggle', '翻肚扭扭', 4800, (b) => {
    b.swap(400, 'belly', 'drop').swap(4300, 'sit', 'drop');
    b.face(400, {eyes: 'happy', mouth: 'w'}).face(4300, {eyes: 'normal'});
    for (const [leg, a] of [['legFN', 14], ['legFF', -14], ['legBN', -14], ['legBF', 14]]) b.osc(leg, 600, 4000, 300, {r: a}, {r: -a});
    b.osc('head', 600, 4000, 600, {r: -6}, {r: 6}).wag(600, 4000, 300, 10);
  });
  act('rollDizzy', '滾到頭暈', 5600, (b) => {
    let t = b.tuck(300);
    t = b.roll(t, TURN, 850, 'ease-in-out');
    t = b.roll(t, -TURN, 850, 'ease-in-out');
    b.untuck(t + 40);
    b.face(t + 40, {eyes: 'dizzy', mouth: 'wavy'}).face(5000, {eyes: 'normal', mouth: 'w'});
    b.osc('head', t + 300, 4900, 500, {r: -7}, {r: 7});
    b.fx(t + 300, 'star', {x: 475, y: 150, s: .5, anim: 'orbit', rx: 170, ry: 34, dur: 2000, turns: 2});
    b.fx(t + 300, 'star', {x: 475, y: 150, s: .4, anim: 'orbit', rx: 170, ry: 34, a0: Math.PI, dur: 2000, turns: 2});
  });
  act('stretch', '伸懶腰', 4600, (b) => {
    b.turnTo(400, 'side', false).turnTo(4100, 'sit', false);
    b.k('legFN', 800, {}).k('legFN', 1300, {r: -50}).k('legFN', 2800, {r: -50}).k('legFN', 3300, {});
    b.k('legFF', 800, {}).k('legFF', 1300, {r: -44}).k('legFF', 2800, {r: -44}).k('legFF', 3300, {});
    b.k('legBN', 800, {}).k('legBN', 1300, {r: 10}).k('legBN', 2800, {r: 10}).k('legBN', 3300, {});
    b.k('legBF', 800, {}).k('legBF', 1300, {r: 8}).k('legBF', 2800, {r: 8}).k('legBF', 3300, {});
    b.k('head', 800, {}).k('head', 1300, {y: 70, r: 8}).k('head', 2800, {y: 70, r: 8}).k('head', 3300, {});
    b.k('tail', 800, {}).k('tail', 1300, {r: 20}).k('tail', 2800, {r: 26}).k('tail', 3300, {});
    b.face(1200, {eyes: 'squeeze', mouth: 'O'}).face(2700, {eyes: 'half', mouth: 'w'}).face(3500, {eyes: 'normal'});
  });
  act('loafSigh', '趴著發呆', 5200, (b) => {
    b.swap(300, 'loaf', 'squash').swap(4800, 'sit', 'stretch');
    b.face(600, {eyes: 'half', mouth: 'flat'}).face(4700, {eyes: 'normal', mouth: 'w'});
    b.hold('head', 1300, 2600, {y: 10});
    b.fx(1500, 'puff', {x: 540, y: 640, s: .5, anim: 'rise', dx: 80, rise: 90, dur: 1200, tone: 'grey'});
    b.fx(2700, 'dots', {x: 600, y: 280, s: .9, anim: 'hold', dur: 1700});
    b.k('eyes', 3200, {}).k('eyes', 3350, {sy: .1}).k('eyes', 3700, {sy: .1}).k('eyes', 3850, {});
    b.wag(400, 4600, 1400, 6);
  });
  act('groom', '洗臉', 5000, (b) => {
    b.show(300, {pawR: 0, pawR_lick: 1}).show(1500, {pawR_lick: 0, pawR_up: 1}).show(4300, {pawR_up: 0, pawR: 1});
    b.face(600, {eyes: 'closed', tongue: 'lick'}).face(1500, {tongue: null}).face(4300, {eyes: 'happy'}).face(4800, {eyes: 'normal'});
    b.k('pawR_lick', 300, {r: 30, sy: .5}).k('pawR_lick', 600, {}).k('pawR_lick', 900, {y: -8}).k('pawR_lick', 1150, {});
    b.k('pawR_up', 1500, {});
    for (let t = 1700; t < 3900; t += 550) b.k('pawR_up', t, {r: -26, sy: 1.15}).k('pawR_up', t + 275, {r: 4, sy: 1.05});
    b.k('pawR_up', 4000, {}).k('pawR_up', 4300, {r: 24, sy: .6});
    b.k('head', 1500, {}).k('head', 1800, {r: -7}).k('head', 3800, {r: -7}).k('head', 4100, {});
    b.wag(0, 5000, 1250, 4);
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
    b.hop(300, 100, 600).fx(560, 'sparkle', {x: 760, y: 260, s: .55, anim: 'pop', dur: 700}).wag(0, 2000, 250, 9);
  });
  act('5', '5 揮手', 3200, (b) => {
    b.show(300, {pawR: 0, pawR_up: 1}).show(2800, {pawR: 1, pawR_up: 0});
    b.face(300, {eyes: 'happy', mouth: 'grin', cheeks: 'blush'}).face(2800, {eyes: 'normal', mouth: 'w', cheeks: null});
    b.k('pawR_up', 300, {r: 28, sy: .6}).k('pawR_up', 550, {});
    b.osc('pawR_up', 550, 2550, 240, {r: -14}, {r: 12}).k('pawR_up', 2800, {r: 28, sy: .6});
    b.hold('head', 300, 2800, {r: -4}).wag(0, 3200, 400, 7);
  });
  act('6', '6 空中轉圈', 2800, (b) => {
    b.face(200, {eyes: 'happy', mouth: 'open'}).face(2500, {eyes: 'normal', mouth: 'w'});
    b.moveTo(300, null, null, 'ease-out'); b.k('move', 700, {x: 0, y: -170}, 'ease-in'); b.k('move', 1100, {x: 0, y: 0});
    b.k('glow', 300, {}).k('glow', 700, {s: .5}).k('glow', 1100, {});
    b.turnTo(480, 'side', false, 140).turnTo(640, 'back', false, 140).turnTo(800, 'side', true, 140).turnTo(960, 'sit', false, 140);
    b.k('cat', 1100, {}).k('cat', 1180, {sx: 1.1, sy: .88}).k('cat', 1330, {});
    b.fx(1150, 'sparkle', {x: 250, y: 600, s: .45, anim: 'burst', dx: -120, dy: -160, dur: 800});
    b.fx(1150, 'sparkle', {x: 720, y: 600, s: .45, anim: 'burst', dx: 120, dy: -160, dur: 800});
  });
  act('7', '7 連跳加愛心', 3000, (b) => {
    b.face(200, {eyes: 'happy', mouth: 'open', cheeks: 'blush'}).face(2700, {eyes: 'normal', mouth: 'w', cheeks: null});
    b.hop(300, 110, 560).hop(950, 140, 600);
    b.fx(450, 'heart', {x: 760, y: 250, s: .5, anim: 'float', dur: 1300, dx: 30});
    b.fx(1100, 'heart', {x: 220, y: 280, s: .45, anim: 'float', dur: 1300, dx: -30});
    b.fx(1600, 'heart', {x: 650, y: 140, s: .4, anim: 'float', dur: 1200, dx: 20});
    b.wag(0, 3000, 200, 10);
  });
  act('8', '8 站起來歡呼', 3600, (b) => {
    b.swap(300, 'stand', 'stretch').swap(3300, 'sit', 'squash').palms(500, 3100);
    b.face(300, {eyes: 'happy', mouth: 'open'}).face(3300, {eyes: 'normal', mouth: 'w'});
    for (const [arm, a] of [['armL', 120], ['armR', -120]]) {
      b.k(arm, 300, {}).k(arm, 650, {r: a});
      b.osc(arm, 650, 2800, 260, {r: a + 14 * Math.sign(a)}, {r: a - 8 * Math.sign(a)}, undefined, {r: a});
      b.k(arm, 2800, {r: a}).k(arm, 3200, {});
    }
    b.hop(800, 70, 480).hop(1500, 90, 520);
    b.fx(900, 'sparkle', {x: 160, y: 260, s: .5, anim: 'pop', dur: 800}).fx(1600, 'sparkle', {x: 800, y: 200, s: .55, anim: 'pop', dur: 800});
    b.fx(2200, 'star', {x: 260, y: 120, s: .4, anim: 'pop', dur: 700}).wag(0, 3600, 220, 10);
  });
  act('9', '9 翻跟斗', 3400, (b) => {
    const t = b.tuck(300);
    b.k('ball', t, {}, 'ease-in-out').k('ball', t + 700, {r: 360});
    b.moveTo(t, null, null, 'ease-out'); b.k('move', t + 350, {x: 0, y: -300}, 'ease-in'); b.k('move', t + 700, {x: 0, y: 0});
    b.k('glow', t, {}).k('glow', t + 350, {s: .4}).k('glow', t + 700, {});
    b.untuck(t + 760);
    b.face(t + 760, {eyes: 'happy', mouth: 'open'}).face(3100, {eyes: 'normal', mouth: 'w'});
    b.fx(t + 760, 'star', {x: 220, y: 760, s: .45, anim: 'burst', dx: -160, dy: -140, dur: 800, spin: 180});
    b.fx(t + 760, 'star', {x: 800, y: 760, s: .45, anim: 'burst', dx: 160, dy: -140, dur: 800, spin: -180});
    b.fx(t + 800, 'sparkle', {x: 520, y: 80, s: .55, anim: 'pop', dur: 800});
  });
  act('10', '10 超開心', 5200, (b) => {
    b.face(200, {eyes: 'star', mouth: 'grin', cheeks: 'blush'}).face(4900, {eyes: 'normal', mouth: 'w', cheeks: null});
    b.moveTo(300, null, null, 'ease-out'); b.k('move', 750, {x: 0, y: -240}, 'ease-in'); b.k('move', 1200, {x: 0, y: 0});
    b.k('glow', 300, {}).k('glow', 750, {s: .4}).k('glow', 1200, {});
    b.turnTo(480, 'side', false, 160).turnTo(660, 'back', false, 160).turnTo(840, 'side', true, 160).turnTo(1020, 'sit', false, 160);
    b.swap(1500, 'stand', 'stretch').swap(4800, 'sit', 'squash').palms(1650, 4600);
    for (const [arm, a] of [['armL', 120], ['armR', -120]]) {
      b.k(arm, 1500, {}).k(arm, 1800, {r: a});
      b.osc(arm, 1800, 4300, 200, {r: a + 16 * Math.sign(a)}, {r: a - 10 * Math.sign(a)}, undefined, {r: a});
      b.k(arm, 4300, {r: a}).k(arm, 4700, {});
    }
    b.hop(1900, 80, 460).hop(2500, 100, 480).hop(3150, 80, 460);
    const conf = ['gold', 'pink', 'accent', 'green', 'blue', 'gold', 'pink', 'accent', 'green', 'blue', 'gold', 'pink'];
    conf.forEach((tone, i) => {
      const a = (i / conf.length) * Math.PI * 2;
      b.fx(1250 + (i % 3) * 120, 'confetti', {x: 475, y: 300, s: .6, anim: 'burst', dx: Math.cos(a) * 420, dy: Math.sin(a) * 300 - 120, dur: 1300, spin: 360, tone});
    });
    b.fx(2000, 'heart', {x: 200, y: 260, s: .5, anim: 'float', dur: 1300}).fx(2600, 'heart', {x: 800, y: 220, s: .5, anim: 'float', dur: 1300});
    b.wag(0, 5200, 180, 12);
  });

  // ======================= 沮喪（1 → 5 越來越沮喪） =======================
  group('sad', '沮喪');
  act('1', '1 嘆氣', 3200, (b) => {
    b.face(300, {eyes: 'half', mouth: 'flat'}).face(2800, {eyes: 'normal', mouth: 'w'});
    b.hold('head', 600, 2600, {y: 10});
    b.fx(1100, 'puff', {x: 540, y: 490, s: .5, anim: 'rise', dx: 90, rise: 80, dur: 1100, tone: 'grey'});
    b.hold('tail', 400, 2800, {r: 8});
  });
  act('2', '2 失落', 3800, (b) => {
    b.ears(300, true).ears(3400, false);
    b.face(300, {eyes: 'sad', mouth: 'frown', brows: 'sad'}).face(3400, {eyes: 'normal', mouth: 'w', brows: null});
    b.hold('head', 400, 3400, {y: 16, r: 4}, 500).hold('cat', 400, 3400, {sy: .97}, 500).hold('tail', 400, 3400, {r: 14}, 500);
  });
  act('3', '3 垂頭喪氣', 4600, (b) => {
    b.swap(400, 'loaf', 'squash').swap(4200, 'sit', 'stretch');
    b.ears(400, true).ears(4200, false);
    b.face(400, {eyes: 'sad', mouth: 'frown', brows: 'sad'}).face(4200, {eyes: 'normal', mouth: 'w', brows: null});
    b.hold('head', 700, 4000, {y: 14}, 600);
    b.fx(1400, 'dots', {x: 600, y: 270, s: .9, anim: 'hold', dur: 1900});
    b.fx(2600, 'puff', {x: 540, y: 650, s: .5, anim: 'rise', dx: 90, rise: 80, dur: 1100, tone: 'grey'});
  });
  act('4', '4 掉眼淚', 4800, (b) => {
    b.ears(300, true).ears(4400, false);
    b.face(300, {eyes: 'teary', mouth: 'wavy', brows: 'sad', cheeks: 'tears'}).face(4400, {eyes: 'normal', mouth: 'w', brows: null, cheeks: null});
    for (const t of [700, 1500, 2300, 3100]) {
      b.fx(t, 'drop', {x: 380, y: 470, s: .32, anim: 'fall', fall: 260, dur: 900});
      b.fx(t + 300, 'drop', {x: 566, y: 470, s: .32, anim: 'fall', fall: 260, dur: 900});
    }
    for (const t of [1200, 2600]) b.k('head', t - 1, {y: 10}).k('head', t, {y: 10}).k('head', t + 90, {y: 2}).k('head', t + 220, {y: 10});
    b.k('head', 300, {}).k('head', 700, {y: 10}).k('head', 4000, {y: 10}).k('head', 4400, {});
    b.shake('cat', 1200, 1500, 4, 50).shake('cat', 2600, 2900, 4, 50);
  });
  act('5', '5 烏雲罩頂', 5600, (b) => {
    b.swap(400, 'loaf', 'drop').swap(5200, 'sit', 'stretch');
    b.ears(400, true).ears(5200, false);
    b.face(400, {eyes: 'sad', mouth: 'wavy', brows: 'sad', cheeks: 'gloom'}).face(5200, {eyes: 'normal', mouth: 'w', brows: null, cheeks: null});
    b.hold('cat', 600, 5000, {sy: .93, sx: 1.03}, 500);
    b.fx(700, 'cloud', {x: 475, y: 190, s: 1.5, anim: 'hold', dur: 4200});
    for (let t = 1100; t < 4600; t += 450) b.fx(t, 'rain', {x: 475 + ((t / 450) % 2 ? -40 : 40), y: 250, s: .8, anim: 'fall', fall: 110, dur: 600});
  });

  // ======================= 生氣（1 → 3） =======================
  group('angry', '生氣');
  act('1', '1 不爽', 3000, (b) => {
    b.face(200, {mouth: 'pout', brows: 'angry'}).face(2700, {mouth: 'w', brows: null});
    b.hold('head', 200, 2700, {r: -7});
    b.osc('tail', 300, 2600, 140, {r: -14}, {r: 10});
    b.fx(600, 'vein', {x: 690, y: 220, s: .5, anim: 'pulse', dur: 1600});
  });
  act('2', '2 生氣', 3400, (b) => {
    b.ears(200, true).ears(3100, false);
    b.face(200, {eyes: 'angry', mouth: 'hiss', brows: 'angry'}).face(3100, {eyes: 'normal', mouth: 'w', brows: null});
    b.hold('cat', 200, 3100, {sx: 1.06, sy: 1.04}, 200).hold('tail', 200, 3100, {s: 1.25, r: -10}, 200);
    b.shake('move', 500, 900, 8, 60).shake('move', 1700, 2100, 8, 60);
    b.fx(400, 'vein', {x: 700, y: 210, s: .55, anim: 'pulse', dur: 1300}).fx(1500, 'vein', {x: 250, y: 250, s: .45, anim: 'pulse', dur: 1300});
    b.fx(800, 'lines', {x: 475, y: 110, s: .9, anim: 'pop', dur: 700, tone: 'red'});
  });
  act('3', '3 暴怒', 4400, (b) => {
    b.swap(300, 'stand', 'stretch').swap(4100, 'sit', 'squash');
    b.ears(300, true).ears(4100, false);
    b.face(300, {eyes: 'angry', mouth: 'hiss', brows: 'angry'}).face(4100, {eyes: 'normal', mouth: 'w', brows: null});
    b.osc('armL', 500, 3800, 180, {r: 100}, {r: 40}).osc('armR', 500, 3800, 180, {r: -40}, {r: -100});
    for (const t of [600, 1150, 1700, 2250, 2800]) b.hop(t, 40, 440);
    for (let t = 600; t < 3600; t += 500) {
      b.fx(t, 'puff', {x: 300, y: 70, s: .55, anim: 'rise', dx: -80, rise: 160, dur: 900, tone: 'grey'});
      b.fx(t + 250, 'puff', {x: 650, y: 70, s: .55, anim: 'rise', dx: 80, rise: 160, dur: 900, tone: 'grey'});
    }
    b.fx(700, 'vein', {x: 690, y: 140, s: .6, anim: 'pulse', dur: 1500}).fx(2000, 'vein', {x: 260, y: 170, s: .5, anim: 'pulse', dur: 1500});
    b.k('glow', 400, {}).k('glow', 800, {s: 1.3}).k('glow', 3600, {s: 1.3}).k('glow', 4000, {});
  });

  // ======================= 其他：反應 =======================
  group('react', '反應');
  act('surprised', '嚇一跳', 2600, (b) => {
    b.face(150, {eyes: 'wide', mouth: 'o', brows: 'up'}).face(2100, {eyes: 'normal', mouth: 'w', brows: null});
    b.moveTo(150, null, null, 'ease-out'); b.k('move', 400, {x: -60, y: -90}, 'ease-in'); b.k('move', 650, {x: -80, y: 0}, 'ease-out'); b.k('move', 1900, {x: -80, y: 0}); b.k('move', 2400, {x: 0, y: 0});
    b.k('cat', 150, {}).k('cat', 400, {sx: .92, sy: 1.1}).k('cat', 650, {sx: 1.08, sy: .9}).k('cat', 800, {});
    b.fx(300, 'excl', {x: 720, y: 160, s: .7, anim: 'pop', dur: 1200}).fx(300, 'lines', {x: 400, y: 110, s: .9, anim: 'pop', dur: 800});
    b.hold('tail', 150, 1900, {s: 1.2, r: -8}, 150);
  });
  act('shy', '害羞', 3400, (b) => {
    b.show(400, {pawR: 0, pawR_lick: 1}).show(2900, {pawR: 1, pawR_lick: 0});
    b.face(300, {eyes: 'normal', mouth: 'wavy', cheeks: 'shy'}).face(3000, {mouth: 'w', cheeks: null});
    b.k('pawR_lick', 400, {r: 30, sy: .5}).k('pawR_lick', 700, {}).k('pawR_lick', 2600, {}).k('pawR_lick', 2900, {r: 30, sy: .5});
    b.hold('eyes', 300, 3000, {x: -14, y: 6}).hold('head', 300, 3000, {r: -6});
    b.osc('tail', 300, 3000, 600, {r: 10}, {r: 4});
  });
  act('love', '愛心眼', 3400, (b) => {
    b.face(200, {eyes: 'heart', cheeks: 'blush'}).face(3100, {eyes: 'normal', cheeks: null});
    b.osc('head', 200, 3100, 700, {r: -5}, {r: 5}).wag(0, 3400, 300, 8);
    [[400, 760, 260], [900, 200, 300], [1400, 700, 160], [1900, 280, 180], [2400, 760, 300]].forEach(([t, x, y]) => b.fx(t, 'heart', {x, y, s: .45, anim: 'float', dur: 1200}));
  });
  act('think', '想一想', 3600, (b) => {
    b.face(300, {mouth: 'flat'}).face(1500, {mouth: 'pout'}).face(3300, {mouth: 'w'});
    b.hold('head', 200, 3300, {r: -7}, 400).hold('eyes', 300, 3200, {x: -10, y: -8}, 300);
    b.fx(700, 'question', {x: 720, y: 180, s: .65, anim: 'pop', dur: 2300});
    b.wag(0, 3600, 900, 5);
  });
  act('idea', '想到了', 2800, (b) => {
    b.face(200, {mouth: 'pout'}).face(900, {eyes: 'star', mouth: 'open'}).face(2500, {eyes: 'normal', mouth: 'w'});
    b.hold('eyes', 200, 900, {x: -8, y: -10}, 200).hold('head', 200, 900, {r: -5}, 200);
    b.fx(850, 'bulb', {x: 475, y: 70, s: .9, anim: 'pop', dur: 1500});
    b.hop(1000, 70, 520);
  });
  act('wink', '眨眼', 2000, (b) => {
    b.face(200, {eyes: 'wink', mouth: 'smile'}).face(1700, {eyes: 'normal', mouth: 'w'});
    b.hold('head', 150, 1800, {r: 5}).fx(300, 'sparkle', {x: 620, y: 360, s: .4, anim: 'pop', dur: 800});
  });
  act('sneeze', '打噴嚏', 2800, (b) => {
    b.face(200, {eyes: 'squeeze', mouth: 'o'}).face(1050, {eyes: 'shut', mouth: 'open'}).face(1500, {eyes: 'half', mouth: 'w'}).face(2400, {eyes: 'normal'});
    b.k('head', 0, {}).k('head', 900, {r: -7, y: -14}, 'ease-in').k('head', 1050, {r: 5, y: 10}).k('head', 1400, {});
    b.k('cat', 900, {}).k('cat', 1050, {sx: 1.06, sy: .94}).k('cat', 1300, {});
    b.fx(1050, 'puff', {x: 560, y: 500, s: .6, anim: 'burst', dx: 160, dy: 10, dur: 700});
    b.fx(1080, 'puff', {x: 420, y: 520, s: .45, anim: 'burst', dx: -140, dy: 20, dur: 650});
  });
  act('curious', '歪頭', 3200, (b) => {
    b.face(200, {eyes: 'wide'}).face(2900, {eyes: 'normal'});
    b.k('head', 200, {}).k('head', 600, {r: -10}).k('head', 1400, {r: -10}).k('head', 1900, {r: 9}).k('head', 2600, {r: 9}).k('head', 3000, {});
    b.fx(500, 'question', {x: 260, y: 160, s: .5, anim: 'pop', dur: 1000}).fx(1800, 'question', {x: 720, y: 160, s: .5, anim: 'pop', dur: 1000});
  });
  act('scared', '害怕', 3200, (b) => {
    b.ears(200, true).ears(2900, false);
    b.face(200, {eyes: 'wide', mouth: 'wavy', brows: 'sad'}).face(2900, {eyes: 'normal', mouth: 'w', brows: null});
    b.shake('cat', 300, 2700, 4, 50).hold('tail', 200, 2900, {s: 1.2, r: 16});
    b.fx(500, 'drop', {x: 690, y: 280, s: .45, anim: 'fall', fall: 90, dur: 1800, tone: 'blue'});
  });
  act('awkward', '尷尬', 3000, (b) => {
    b.show(300, {pawR: 0, pawR_up: 1}).show(2600, {pawR: 1, pawR_up: 0});
    b.face(200, {mouth: 'wavy', cheeks: 'shy'}).face(2700, {mouth: 'w', cheeks: null});
    b.k('pawR_up', 300, {r: 28, sy: .6}).k('pawR_up', 600, {r: 18, sy: 1.25});
    b.osc('pawR_up', 600, 2300, 200, {r: 14, sy: 1.25}, {r: 24, sy: 1.22}, undefined, {r: 18, sy: 1.25}).k('pawR_up', 2600, {r: 28, sy: .6});
    b.hold('eyes', 200, 2700, {x: 12}).fx(400, 'drop', {x: 700, y: 250, s: .5, anim: 'hold', dur: 2000, tone: 'blue'});
  });
  act('dizzy', '頭暈', 3400, (b) => {
    b.face(100, {eyes: 'dizzy', mouth: 'wavy'}).face(3100, {eyes: 'normal', mouth: 'w'});
    b.osc('head', 100, 3200, 500, {r: -7}, {r: 7}).osc('cat', 100, 3200, 700, {r: -3}, {r: 3});
    b.fx(100, 'star', {x: 475, y: 150, s: .5, anim: 'orbit', rx: 170, ry: 34, dur: 3000, turns: 3});
    b.fx(100, 'star', {x: 475, y: 150, s: .4, anim: 'orbit', rx: 170, ry: 34, a0: Math.PI, dur: 3000, turns: 3});
  });
  act('sleepy', '打瞌睡', 4600, (b) => {
    b.face(200, {eyes: 'half', mouth: 'w'}).face(1300, {eyes: 'shut'}).face(2000, {eyes: 'wide'}).face(2500, {eyes: 'half'}).face(3500, {eyes: 'shut'}).face(4400, {eyes: 'normal'});
    b.k('head', 200, {}).k('head', 1900, {y: 22, r: 4}, 'ease-in').k('head', 2050, {y: -4}).k('head', 2300, {}).k('head', 4000, {y: 22, r: 4}, 'ease-in').k('head', 4400, {});
    b.fx(1200, 'z', {x: 650, y: 300, s: .5, anim: 'float', dur: 900, dx: 50}).fx(3300, 'z', {x: 650, y: 300, s: .5, anim: 'float', dur: 900, dx: 50});
  });
  act('sleep', '睡著', 4200, (b) => {
    const t = b.tuck(200);
    b.ballFace(t, 'sleep').breathe('ball', t, 3500, 1600, .025);
    b.fx(t + 300, 'z', {x: 640, y: 470, s: .6, anim: 'float', dur: 1400, dx: 60, rise: 160}).fx(t + 1700, 'z', {x: 640, y: 470, s: .45, anim: 'float', dur: 1300, dx: 50});
    b.untuck(3700);
    b.face(3700, {eyes: 'half'}).face(4100, {eyes: 'normal'});
  });
  act('wakeUp', '睡醒伸懶腰', 5400, (b) => {
    b.pose(0, 'loaf').face(0, {eyes: 'closed'}).face(900, {eyes: 'half'});
    b.fx(100, 'z', {x: 640, y: 420, s: .5, anim: 'float', dur: 800, dx: 40});
    b.swap(1300, 'stand', 'stretch').face(1300, {eyes: 'squeeze', mouth: 'O'});
    for (const [arm, a] of [['armL', 128], ['armR', -128]]) b.k(arm, 1300, {}).k(arm, 1800, {r: a}).k(arm, 3000, {r: a}).k(arm, 3400, {});
    b.palms(1600, 3250);
    b.k('cat', 1450, {}).k('cat', 1800, {sy: 1.06, sx: .96}).k('cat', 3000, {sy: 1.06, sx: .96}).k('cat', 3400, {});
    b.face(3100, {eyes: 'happy', mouth: 'w'}).swap(3900, 'sit', 'squash').face(4800, {eyes: 'normal'});
  });
  act('shakeOff', '甩甩頭', 2400, (b) => {
    b.face(400, {eyes: 'squeeze'}).face(1500, {eyes: 'shut'}).face(1900, {eyes: 'normal'});
    b.osc('head', 400, 1400, 70, {r: -11}, {r: 11});
    [[300, -1], [620, 1], [260, 1], [680, -1]].forEach(([x, d], i) => b.fx(500 + i * 120, 'drop', {x, y: 300, s: .3, anim: 'burst', dx: d * 160, dy: -60, dur: 700}));
    b.blink(2000);
  });
  act('maneki', '招財貓', 3600, (b) => {
    b.show(0, {pawR: 0, pawR_up: 1}).face(0, {eyes: 'happy', mouth: 'w', cheeks: 'blush'});
    b.k('pawR_up', 0, {});
    for (let t = 300; t < 3300; t += 600) b.k('pawR_up', t, {r: -16, sy: .9}, 'ease-in').k('pawR_up', t + 300, {r: 4});
    b.k('pawR_up', 3600, {});
    b.fx(600, 'sparkle', {x: 760, y: 360, s: .4, anim: 'pop', dur: 800, tone: 'gold'}).fx(2400, 'sparkle', {x: 200, y: 420, s: .35, anim: 'pop', dur: 800});
    b.wag(0, 3600, 900, 5);
  }, {loop: true});
  act('bow', '鞠躬', 3000, (b) => {
    b.face(300, {eyes: 'closed', mouth: 'w'}).face(2500, {eyes: 'happy'}).face(2900, {eyes: 'normal'});
    b.k('head', 300, {}).k('head', 900, {y: 46, sy: .92}).k('head', 1700, {y: 46, sy: .92}).k('head', 2300, {});
    b.k('cat', 300, {}).k('cat', 900, {sy: .95}).k('cat', 1700, {sy: .95}).k('cat', 2300, {});
  });
  act('cheerOn', '加油', 3000, (b) => {
    b.show(200, {pawR: 0, pawR_up: 1}).show(2700, {pawR: 1, pawR_up: 0});
    b.face(200, {eyes: 'squeeze', mouth: 'open'}).face(2700, {eyes: 'normal', mouth: 'w'});
    b.k('pawR_up', 200, {r: 28, sy: .6}).k('pawR_up', 450, {});
    for (const t of [600, 1150, 1700]) b.k('pawR_up', t, {sy: 1.18, r: -8}, 'ease-out').k('pawR_up', t + 280, {});
    b.k('pawR_up', 2450, {}).k('pawR_up', 2700, {r: 28, sy: .6});
    for (const t of [600, 1150, 1700]) b.k('cat', t, {}).k('cat', t + 120, {sy: 1.04}).k('cat', t + 280, {});
    b.fx(650, 'excl', {x: 740, y: 230, s: .6, anim: 'pop', dur: 1600, tone: 'gold'});
  });
  act('hello', '打招呼', 3200, (b) => {
    b.k('cat', 0, {s: 0}).k('cat', 320, {s: 1.12}, 'ease-out').k('cat', 480, {});
    b.k('glow', 0, {s: 0}).k('glow', 320, {});
    b.fx(120, 'sparkle', {x: 520, y: 760, s: .5, anim: 'pop', dur: 600});
    b.show(600, {pawR: 0, pawR_up: 1}).show(2900, {pawR: 1, pawR_up: 0});
    b.face(300, {eyes: 'happy', mouth: 'grin'}).face(2900, {eyes: 'normal', mouth: 'w'});
    b.k('pawR_up', 600, {r: 28, sy: .6}).k('pawR_up', 800, {}).osc('pawR_up', 800, 2650, 240, {r: -14}, {r: 12}).k('pawR_up', 2900, {r: 28, sy: .6});
  });
  act('bye', '掰掰', 4400, (b) => {
    b.show(200, {pawR: 0, pawR_up: 1}).show(1700, {pawR: 1, pawR_up: 0});
    b.face(200, {eyes: 'happy', mouth: 'smile'});
    b.k('pawR_up', 200, {r: 28, sy: .6}).k('pawR_up', 400, {}).osc('pawR_up', 400, 1500, 240, {r: -14}, {r: 12}).k('pawR_up', 1700, {r: 28, sy: .6});
    b.turnTo(2000, 'side', false).walk(2200, 3600, 700, {step: 400});
    b.k('cat', 3600, {}).k('cat', 3900, {s: 0}, 'ease-in');
    b.fx(3850, 'puff', {x: 520, y: 760, s: .7, anim: 'pop', dur: 500});
    b.k('glow', 3600, {}).k('glow', 3900, {s: 0});
    b.at(4399);
  });
  act('fish', '吃魚', 3800, (b) => {
    b.fx(200, 'fish', {x: 472, y: 560, s: 1.1, anim: 'hold', dur: 2400});
    b.face(300, {eyes: 'star', mouth: 'open'});
    for (let t = 900; t < 2500; t += 300) b.face(t, {mouth: 'w'}).face(t + 150, {mouth: 'open'});
    b.face(2600, {eyes: 'happy', mouth: 'w', tongue: 'lick'}).face(3200, {tongue: null}).face(3500, {eyes: 'normal'});
    for (let t = 900; t < 2500; t += 300) b.k('head', t, {}).k('head', t + 150, {y: 6});
    b.k('head', 2600, {}).fx(2600, 'sparkle', {x: 640, y: 520, s: .4, anim: 'pop', dur: 700}).wag(0, 3800, 260, 9);
  });
  act('yarn', '玩毛線', 4600, (b) => {
    b.fx(200, 'yarn', {x: 1100, y: 830, s: .8, anim: 'slide', dx: -1300, dy: 0, dur: 2400, spin: -720});
    b.k('eyes', 200, {}).k('eyes', 900, {x: 14}).k('eyes', 1700, {x: 0}).k('eyes', 2500, {x: -14}).k('eyes', 3000, {});
    b.show(1300, {pawR: 0, pawR_up: 1}).show(2400, {pawR: 1, pawR_up: 0});
    b.k('pawR_up', 1300, {r: 28, sy: .6}).k('pawR_up', 1500, {r: 44, sy: .9}, 'ease-in').k('pawR_up', 1750, {r: -10}).k('pawR_up', 2100, {}).k('pawR_up', 2400, {r: 28, sy: .6});
    b.face(300, {eyes: 'wide'}).face(1500, {eyes: 'squeeze', mouth: 'open'}).face(2400, {eyes: 'happy', mouth: 'w'}).face(4300, {eyes: 'normal'});
    b.hop(2800, 80, 520).wag(0, 4600, 240, 10);
  });
  act('batBug', '撥光點', 4400, (b) => {
    b.fx(200, 'sparkle', {x: 650, y: 330, s: .3, anim: 'orbit', rx: 110, ry: 60, dur: 3200, turns: 2});
    b.osc('eyes', 300, 3300, 400, {x: 12, y: -6}, {x: -10, y: 4});
    b.show(1300, {pawR: 0, pawR_up: 1}).show(3200, {pawR: 1, pawR_up: 0});
    b.k('pawR_up', 1300, {r: 28, sy: .6}).k('pawR_up', 1500, {});
    for (const t of [1700, 2500]) b.k('pawR_up', t, {r: -22, sy: 1.2}, 'ease-out').k('pawR_up', t + 300, {});
    b.k('pawR_up', 3000, {}).k('pawR_up', 3200, {r: 28, sy: .6});
    b.face(300, {eyes: 'wide'}).face(3400, {eyes: 'star', mouth: 'open'}).face(4100, {eyes: 'normal', mouth: 'w'});
    b.fx(3400, 'sparkle', {x: 650, y: 330, s: .4, anim: 'burst', dx: 0, dy: -120, dur: 700});
  });
  act('purr', '呼嚕呼嚕', 3600, (b) => {
    b.face(200, {eyes: 'closed', mouth: 'w', cheeks: 'blush'}).face(3300, {eyes: 'normal', cheeks: null});
    b.shake('cat', 300, 3200, 1.5, 60).hold('head', 200, 3300, {r: 5});
    b.fx(500, 'note', {x: 720, y: 330, s: .5, anim: 'float', dur: 1300, dx: 40}).fx(1600, 'note', {x: 250, y: 300, s: .45, anim: 'float', dur: 1300, dx: -40});
    b.wag(0, 3600, 900, 4);
  });
  act('flop', '躺下翻滾', 4400, (b) => {
    b.k('cat', 200, {}).k('cat', 500, {r: -14}, 'ease-in');
    b.swap(600, 'belly', 'drop');
    b.face(600, {eyes: 'happy', mouth: 'w'}).blink(2200);
    b.osc('legFN', 800, 3400, 500, {r: -12}, {r: 6}).osc('legBN', 800, 3400, 500, {r: 12}, {r: -6}).wag(800, 3400, 400, 10);
    b.swap(3800, 'sit', 'drop').face(3800, {eyes: 'normal'});
  });
  act('peekaboo', '躲貓貓', 3800, (b) => {
    b.k('cat', 200, {}).k('cat', 500, {sx: 1.2, sy: .1}, 'ease-in').k('cat', 2100, {sx: 1.2, sy: .1}).k('cat', 2300, {sx: .9, sy: 1.15}, 'ease-out').k('cat', 2500, {});
    b.k('glow', 200, {}).k('glow', 500, {s: .6}).k('glow', 2100, {s: .6}).k('glow', 2300, {});
    b.fx(450, 'puff', {x: 520, y: 840, s: .7, anim: 'pop', dur: 500});
    b.face(2100, {eyes: 'wide', mouth: 'open'}).face(2900, {eyes: 'happy', mouth: 'w'}).face(3500, {eyes: 'normal'});
    b.fx(2300, 'excl', {x: 740, y: 180, s: .6, anim: 'pop', dur: 900});
  });

  // ======================= 其他：移動 =======================
  group('move', '移動');
  act('walk', '走過去再走回來', 6600, (b) => {
    b.turnTo(300, 'side', false).walk(600, 2800, 700, {step: 440});
    b.turnTo(3100, 'side', true).walk(3400, 5600, -700, {step: 440});
    b.turnTo(6000, 'sit', false).blink(2000).blink(4500);
    b.wag(600, 2800, 440, 8).wag(3400, 5600, 440, 8);
  });
  act('run', '跑過去再跑回來', 4400, (b) => {
    b.turnTo(300, 'side', false).walk(500, 1600, 900, {step: 240, amp: 30, bob: 18});
    b.turnTo(1850, 'side', true).walk(2050, 3150, -900, {step: 240, amp: 30, bob: 18});
    b.turnTo(3500, 'sit', false);
    b.face(400, {eyes: 'wide', mouth: 'open'}).face(3500, {eyes: 'happy', mouth: 'w'}).face(4100, {eyes: 'normal'});
    b.fx(700, 'speed', {x: 240, y: 680, s: 1, anim: 'hold', dur: 800}).fx(2250, 'speed', {x: 800, y: 680, s: 1, r: 180, anim: 'hold', dur: 800});
    b.fx(1500, 'ring', {x: 300, y: 860, s: .8, anim: 'rise', dx: -40, rise: 30, dur: 500, tone: 'grey'});
  });
  act('rollIn', '滾進來', 3400, (b) => {
    b.pose(0, 'ball'); b.k('move', 0, {x: -2 * TURN, y: 0}); b.mx = -2 * TURN; b.br = -720;
    const t = b.roll(100, 2 * TURN, 1700);
    b.untuck(t + 60);
    b.face(t + 60, {eyes: 'happy', mouth: 'open'}).face(3100, {eyes: 'normal', mouth: 'w'});
    b.fx(t + 100, 'sparkle', {x: 760, y: 300, s: .5, anim: 'pop', dur: 700});
  });
  act('zoomies', '暴衝', 5600, (b) => {
    b.face(200, {eyes: 'wide', mouth: 'open'});
    b.turnTo(300, 'side', false).walk(450, 1150, 900, {step: 200, amp: 32, bob: 20});
    b.turnTo(1300, 'side', true).walk(1450, 2850, -1800, {step: 200, amp: 32, bob: 20});
    b.turnTo(3000, 'side', false).walk(3150, 3850, 900, {step: 200, amp: 32, bob: 20});
    b.turnTo(4100, 'sit', false).face(4100, {eyes: 'dizzy', mouth: 'w'}).face(5200, {eyes: 'normal'});
    b.osc('head', 4300, 5300, 400, {r: -6}, {r: 6});
  });
  act('tiptoe', '躡手躡腳', 5600, (b) => {
    b.turnTo(300, 'side', false);
    b.hold('head', 500, 5000, {y: 26}, 300);
    b.face(500, {eyes: 'half', mouth: 'flat'}).face(5100, {eyes: 'normal', mouth: 'w'});
    b.walk(700, 2700, 400, {step: 800, amp: 26, bob: 0});
    b.osc('eyes', 2700, 3300, 300, {x: -10}, {x: 10});
    b.fx(2800, 'dots', {x: 900, y: 300, s: .8, anim: 'hold', dur: 900});
    b.turnTo(3300, 'side', true).walk(3500, 4800, -400, {step: 650, amp: 26, bob: 0});
    b.turnTo(5200, 'sit', false);
  });

  // ======================= 其他：學習情境 =======================
  group('study', '學習情境');
  act('read', '讀書', 4400, (b) => {
    b.fx(0, 'book', {x: 472, y: 640, s: 1.7, anim: 'hold', dur: 4400});
    b.face(0, {eyes: 'normal', mouth: 'w'});
    b.k('eyes', 0, {x: -12, y: 10}).k('eyes', 1200, {x: 12, y: 10}).k('eyes', 1300, {x: -12, y: 14}).k('eyes', 2500, {x: 12, y: 14}).k('eyes', 2700, {x: -12, y: 10}).k('eyes', 3900, {x: 12, y: 10}).k('eyes', 4400, {x: -12, y: 10});
    b.k('head', 0, {y: 8}).k('head', 2200, {y: 12, r: 2}).k('head', 4400, {y: 8});
    b.fx(2500, 'sparkle', {x: 620, y: 600, s: .25, anim: 'pop', dur: 500});
  }, {loop: true});
  act('correct', '答對了', 2200, (b) => {
    b.face(150, {eyes: 'happy', mouth: 'open'}).face(1900, {eyes: 'normal', mouth: 'w'});
    b.fx(200, 'check', {x: 740, y: 210, s: .9, anim: 'pop', dur: 1300}).hop(300, 90, 560).wag(0, 2200, 220, 9);
  });
  act('wrong', '答錯了', 3000, (b) => {
    b.face(150, {mouth: 'wavy', brows: 'sad'}).face(1800, {eyes: 'happy', mouth: 'smile', brows: null}).face(2700, {eyes: 'normal', mouth: 'w'});
    b.hold('head', 150, 1700, {r: 6}).hold('eyes', 150, 1600, {x: -10, y: 8});
    b.fx(300, 'drop', {x: 700, y: 250, s: .45, anim: 'hold', dur: 1300, tone: 'blue'});
    b.nod(1900, 10, 420);
  });
  act('streak', '連對', 2800, (b) => {
    b.face(150, {eyes: 'happy', mouth: 'open'}).face(1400, {eyes: 'star'}).face(2500, {eyes: 'normal', mouth: 'w'});
    [[200, 60], [750, 90], [1300, 130]].forEach(([t, h], i) => {
      b.hop(t, h, 500);
      b.fx(t + 200, 'sparkle', {x: [300, 650, 475][i], y: [300, 250, 80][i], s: .35 + i * .12, anim: 'pop', dur: 700});
    });
    b.wag(0, 2800, 200, 10);
  });
  act('levelUp', '升級', 3600, (b) => {
    b.swap(300, 'stand', 'stretch').swap(3300, 'sit', 'squash');
    b.face(300, {eyes: 'star', mouth: 'open'}).face(3300, {eyes: 'normal', mouth: 'w'}).palms(500, 3100);
    for (const [arm, a] of [['armL', 120], ['armR', -120]]) b.k(arm, 300, {}).k(arm, 650, {r: a}).k(arm, 2900, {r: a}).k(arm, 3200, {});
    b.k('glow', 500, {}).k('glow', 900, {s: 1.6}).k('glow', 2600, {s: 1.6}).k('glow', 3100, {});
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      b.fx(800, 'star', {x: 475, y: 330, s: .4, anim: 'burst', dx: Math.cos(a) * 380, dy: Math.sin(a) * 300, dur: 1100, spin: 180});
    }
    b.hop(1200, 70, 500);
  });
  act('done', '完成今天', 5000, (b) => {
    b.swap(300, 'stand', 'stretch').swap(4600, 'sit', 'squash');
    b.face(300, {eyes: 'happy', mouth: 'grin', cheeks: 'blush'}).face(4600, {eyes: 'normal', mouth: 'w', cheeks: null}).palms(500, 4300);
    for (const [arm, a] of [['armL', 120], ['armR', -120]]) {
      b.k(arm, 300, {}).k(arm, 650, {r: a}).osc(arm, 650, 4000, 300, {r: a + 12 * Math.sign(a)}, {r: a - 8 * Math.sign(a)}, undefined, {r: a}).k(arm, 4400, {});
    }
    b.hop(900, 80, 500).hop(1600, 100, 520).hop(2350, 80, 500);
    const conf = ['gold', 'pink', 'accent', 'green', 'blue', 'gold', 'pink', 'accent', 'green', 'blue'];
    conf.forEach((tone, i) => b.fx(500 + i * 220, 'confetti', {x: 100 + (i * 97) % 760, y: -60, s: .6, anim: 'fall', fall: 900, dur: 1700, spin: 540, tone}));
    b.fx(1800, 'heart', {x: 780, y: 260, s: .5, anim: 'float', dur: 1300}).fx(2600, 'heart', {x: 180, y: 260, s: .5, anim: 'float', dur: 1300});
  });
  act('loading', '載入中', 1600, (b) => {
    b.pose(0, 'ball').k('ball', 0, {}, 'linear').k('ball', 1600, {r: 360});
    b.fx(0, 'dots', {x: 520, y: 400, s: .9, anim: 'blink', dur: 1600});
  }, {loop: true});
  act('lost', '迷路（離線）', 4400, (b) => {
    b.face(200, {eyes: 'wide', mouth: 'wavy'}).face(4100, {eyes: 'normal', mouth: 'w'});
    b.k('head', 200, {}).k('head', 600, {r: -9}).k('head', 1500, {r: -9}).k('head', 2000, {r: 9}).k('head', 2900, {r: 9}).k('head', 3400, {});
    b.k('eyes', 200, {}).k('eyes', 600, {x: -14}).k('eyes', 1500, {x: -14}).k('eyes', 2000, {x: 14}).k('eyes', 2900, {x: 14}).k('eyes', 3400, {});
    b.fx(500, 'question', {x: 200, y: 200, s: .5, anim: 'pop', dur: 1100}).fx(1900, 'question', {x: 760, y: 180, s: .55, anim: 'pop', dur: 1100});
    b.fx(3200, 'question', {x: 475, y: 60, s: .7, anim: 'pop', dur: 1100}).fx(3300, 'drop', {x: 700, y: 270, s: .4, anim: 'hold', dur: 900, tone: 'blue'});
  });
  act('welcome', '歡迎回來', 3600, (b) => {
    b.k('cat', 0, {s: 0}).k('cat', 320, {s: 1.12}, 'ease-out').k('cat', 480, {});
    b.k('glow', 0, {s: 0}).k('glow', 320, {});
    b.face(200, {eyes: 'happy', mouth: 'grin', cheeks: 'blush'}).face(3300, {eyes: 'normal', mouth: 'w', cheeks: null});
    b.show(700, {pawR: 0, pawR_up: 1}).show(2600, {pawR: 1, pawR_up: 0});
    b.k('pawR_up', 700, {r: 28, sy: .6}).k('pawR_up', 900, {}).osc('pawR_up', 900, 2400, 240, {r: -14}, {r: 12}).k('pawR_up', 2600, {r: 28, sy: .6});
    b.fx(800, 'heart', {x: 760, y: 280, s: .5, anim: 'float', dur: 1300}).fx(1500, 'heart', {x: 200, y: 280, s: .45, anim: 'float', dur: 1300});
    b.hop(2800, 70, 520);
  });
  act('remind', '提醒練習', 3600, (b) => {
    b.show(200, {pawR: 0, pawR_up: 1}).show(2600, {pawR: 1, pawR_up: 0});
    b.face(200, {mouth: 'o', brows: 'up'}).face(2600, {eyes: 'happy', mouth: 'smile', brows: null}).face(3300, {eyes: 'normal', mouth: 'w'});
    b.k('pawR_up', 200, {r: 28, sy: .6}).k('pawR_up', 450, {});
    for (let t = 600; t < 2300; t += 280) b.k('pawR_up', t, {r: 10, sy: .92}, 'ease-in').k('pawR_up', t + 140, {});
    b.k('pawR_up', 2350, {}).k('pawR_up', 2600, {r: 28, sy: .6});
    b.fx(500, 'excl', {x: 740, y: 220, s: .6, anim: 'pulse', dur: 1900}).hold('head', 2600, 3400, {r: -5}, 200, 200);
  });
  act('kana', '學會新字', 3600, (b) => {
    b.fx(300, 'kana', {x: 475, y: 70, s: 1.4, anim: 'pop', dur: 2600});
    b.face(300, {eyes: 'wide', mouth: 'o'}).face(1200, {eyes: 'star', mouth: 'open'}).face(3200, {eyes: 'normal', mouth: 'w'});
    b.hold('eyes', 300, 1200, {y: -10}, 150, 150).nod(1500).nod(2050);
    b.fx(1300, 'sparkle', {x: 680, y: 120, s: .4, anim: 'pop', dur: 700}).fx(1700, 'sparkle', {x: 270, y: 150, s: .35, anim: 'pop', dur: 700});
  });

  window.CAT01_ACTIONS = K.actions;
  window.CAT01_GROUPS = K.groups;
})();
