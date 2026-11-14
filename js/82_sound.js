'use strict';
/* ==========================================================================
   The world's sounds (環境音, 2026-11-12): a thing tapped, the hero's footsteps (by what is underfoot), each place's
   background (by day and by night, easing between with the light) and now and then something in it (a crow at the shrine).
   The files are in sounds/ (CC0: sounds/SOURCES.md; scripts/make-sounds.py makes them), named by version like the records
   and kept by the service worker; a few are made here (SYNTH), and a file not to be had falls back to its SYNTH or stays quiet.
   One Web Audio context with the answer sounds (audioCtx); as loud as 設定 › 環境音 (0: none). While Japanese is read aloud (speakLine)
   these and the gramophone (MUSIC.duck) go down, and come back after.
   ========================================================================== */
const SND = (() => {
  const FILE = (n) => `sounds/${n}-1.m4a`;
  const FX_VOL = 0.32, STEP_VOL = 0.22, AMB_VOL = 0.9, DUCK = 0.3;
  const TOP = 0.2;   // 環境音 at 100%: a fifth of what it was (2026-11-14, the user: the default was frightening)
  let C = null, bus = null, amb = null, ducks = 0, unduckT = 0;
  const bufs = {};   // a file's name → the promise of its AudioBuffer (null: not to be had; asked again a minute later)
  const vol = () => Math.min(1, Math.max(0, Number(state.settings.ambientVol) || 0));   // 設定 › 環境音 (0: none)
  const gain = () => vol() * TOP * (ducks ? DUCK : 1);   // the whole of it: its setting, under Japanese read aloud
  function ctx() { if (!vol()) return null; const c = audioCtx(); if (c && c !== C) { C = c; bus = amb = null; } return c; }
  function out(c) {   // the way out: everything through bus (ducked), the backgrounds through amb on it
    if (!bus) { bus = c.createGain(); bus.gain.value = gain(); bus.connect(c.destination); amb = c.createGain(); amb.gain.value = AMB_VOL; amb.connect(bus); }
    return bus;
  }
  // a loop's or a footstep file's length as made (s): a decoder that leaves the encoder's 2112 samples of lead-in at the start
  // (Chrome and Safari take them off) gives a longer buffer, and the sound then begins that much later (lead)
  const MADE = { 'amb-harbor': 37.5, 'amb-station': 31.4, 'amb-clock': 20 };
  const made = (name) => MADE[name] || (name.startsWith('amb-') ? 38 : name.startsWith('steps-') ? 2 : 0);
  const lead = (name, b) => { const n = made(name), x = n ? b.duration - n : 0; return x > 0.03 && x < 0.2 ? 2112 / 44100 : 0; };
  function load(c, name) {
    if (!bufs[name]) {
      bufs[name] = fetch(FILE(name)).then((r) => { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); })
        .then((a) => new Promise((ok, no) => c.decodeAudioData(a, ok, no)))   // the callback form: older Safari has no promise
        .catch(() => { setTimeout(() => { delete bufs[name]; }, 60000); return null; });
    }
    return bufs[name];
  }
  // ---- made here: short sounds no file is needed for, and the knock should its file be missing ----
  const tone = (c, to, f, at, len, vol, type = 'sine', slide = 0) => {
    const o = c.createOscillator(), g = c.createGain(), t = c.currentTime + 0.02 + at;
    o.type = type; o.frequency.setValueAtTime(f, t); if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + len);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    o.connect(g); g.connect(to); o.start(t); o.stop(t + len + 0.03);
  };
  const noise = (c, to, at, len, vol, f0, f1, q = 1.2) => {
    const n = Math.ceil(c.sampleRate * (len + 0.05)), b = c.createBuffer(1, n, c.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    const s = c.createBufferSource(), bp = c.createBiquadFilter(), g = c.createGain(), t = c.currentTime + 0.02 + at;
    s.buffer = b; bp.type = 'bandpass'; bp.Q.value = q; bp.frequency.setValueAtTime(f0, t); bp.frequency.exponentialRampToValueAtTime(f1 || f0, t + len);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + Math.min(0.03, len / 3)); g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    s.connect(bp); bp.connect(g); g.connect(to); s.start(t); s.stop(t + len + 0.05);
  };
  const SYNTH = {
    ic: (c, to, v) => tone(c, to, 2400, 0, 0.13, 0.35 * v),   // ピッ: the ticket gate
    horn: (c, to, v) => [[0, 0.12], [0.2, 0.42]].forEach(([at, len]) => [415, 523].forEach((f) => tone(c, to, f, at, len, 0.12 * v, 'square'))),   // プップー
    pinch: (c, to, v) => [0, 0.13, 0.36, 0.49].forEach((at) => noise(c, to, at, 0.04, 0.5 * v, 3200, 0, 4)),   // チョキチョキ
    sparkle: (c, to, v) => [1568, 2093, 2637, 3136].forEach((f, i) => tone(c, to, f, i * 0.07, 0.5, 0.1 * v)),   // ✨
    whoosh: (c, to, v) => noise(c, to, 0, 0.9, 0.45 * v, 380, 2200, 1.6),   // down the slide
    spring: (c, to, v) => tone(c, to, 180, 0, 0.5, 0.3 * v, 'sine', 420),   // the panda's spring, should its file be missing
    piyo: (c, to, v) => [0, 0.32, 0.64].forEach((at) => { tone(c, to, 3000, at, 0.07, 0.12 * v, 'sine', 2300); tone(c, to, 3000, at + 0.12, 0.07, 0.12 * v, 'sine', 2300); }),   // the crossing's ピヨピヨ
    chime: (c, to, v) => [[784, 0], [988, 0.32], [1175, 0.64], [1568, 0.96]].forEach(([f, at]) => { tone(c, to, f, at, 1.1, 0.12 * v); tone(c, to, f * 2.76, at, 0.4, 0.02 * v); }),   // ピンポンパンポーン
    bike: (c, to, v) => [0, 0.16].forEach((at) => [2900, 4150].forEach((f, k) => tone(c, to, f, at, 0.5, (k ? 0.04 : 0.09) * v))),   // a bicycle's bell
    needle: (c, to, v) => { noise(c, to, 0, 0.05, 0.6 * v, 900, 0, 0.8); [0.12, 0.3, 0.41, 0.6].forEach((at) => noise(c, to, at, 0.015, 0.25 * v, 2600, 0, 2)); },   // the needle set down
    knock: (c, to, v) => [0, 0.2].forEach((at) => tone(c, to, 190, at, 0.14, 0.9 * v, 'sine', 80)),   // two dull taps on wood (the knock before its file, 1.4.0)
    // the cruise (2026-11-13): a cold gust after 吉本's pun (ヒュ〜, under みんな's さむっ！), the newly-weds' ポワン, a camera's カシャ
    brr: (c, to, v) => { noise(c, to, 0, 1.5, 0.55 * v, 1700, 420, 4); noise(c, to, 0.1, 1.2, 0.25 * v, 900, 300, 2); tone(c, to, 1500, 0.05, 1.3, 0.035 * v, 'sine', 640); },
    heart: (c, to, v) => { tone(c, to, 660, 0, 0.32, 0.12 * v, 'sine', 990); tone(c, to, 880, 0.16, 0.5, 0.1 * v, 'sine', 1320); SYNTH.sparkle(c, to, 0.6 * v); },
    shutter: (c, to, v) => { noise(c, to, 0, 0.035, 0.7 * v, 3200, 0, 1.5); noise(c, to, 0.09, 0.05, 0.5 * v, 2200, 0, 1.5); },
    slurp: (c, to, v) => { noise(c, to, 0, 0.28, 0.3 * v, 600, 1900, 3); tone(c, to, 620, 0.04, 0.3, 0.06 * v, 'sine', 300); },   // じゅるり (YEN's star-eyed face)
    chomp: (c, to, v) => { noise(c, to, 0, 0.07, 0.6 * v, 1400, 600, 1.2); noise(c, to, 0.09, 0.05, 0.35 * v, 2200, 900, 1.5); tone(c, to, 140, 0, 0.09, 0.2 * v, 'sine', 90); }   // a bite (YEN's もぐもぐ)
  };
  // one sound now (or after delay s): its file, else its SYNTH; vol, rate, a slice [offset, length] of the file
  function play(name, o = {}) {
    const c = ctx(); if (!c || !name) return;
    const to = out(c), v = (o.vol == null ? 1 : o.vol) * FX_VOL, syn = SYNTH[name];
    const go = (b) => {
      if (!b) { if (syn) syn(c, to, v / FX_VOL); return; }
      const s = c.createBufferSource(), g = c.createGain(); s.buffer = b; s.playbackRate.value = o.rate || 1; g.gain.value = v;
      s.connect(g); g.connect(to);
      const t = c.currentTime + 0.01 + (o.delay || 0);
      if (o.slice) s.start(t, o.slice[0] + lead(name, b), o.slice[1]); else s.start(t);
    };
    if (syn && !FILED.has(name)) { setTimeout(() => go(null), (o.delay || 0) * 1000); return; }
    load(c, name).then(go);
  }
  const FILED = new Set(['knock', 'spring']);   // files, made here only should the file be missing
  // ---- footsteps: a step each time the legs swing (.42 s walking, .28 s running, as the css), from the ground's file of four ----
  let lastStep = 0, stepK = 0;
  function step(ground, run) {
    if (!ground || !vol()) return;
    const now = performance.now(), gap = run ? 280 : 420;
    if (now - lastStep > 900) { lastStep = now - gap / 2; return; }   // a walk begins: the first step half a swing in, as the leg comes down
    if (now - lastStep < gap) return;
    lastStep = now;
    stepK = (stepK + 1 + Math.floor(Math.random() * 3)) % 4;
    play('steps-' + ground, { vol: (run ? 1.25 : 1) * STEP_VOL / FX_VOL * (0.85 + Math.random() * 0.3), rate: 0.92 + Math.random() * 0.16, slice: [stepK * 0.5, 0.45] });
  }
  // what is underfoot by place: its path or pavement, its road, the rest (WALK_GROUND's 'way', 'road', 'off'; rooms: wood)
  const GROUND = {
    yard: { way: 'gravel', off: 'grass' }, park: { way: 'concrete', off: 'gravel' }, beach: { way: 'wood', off: 'sand' }, harbor: { way: 'sand', off: 'concrete' },
    street: { off: 'concrete' }, town: { off: 'concrete' }, station: { off: 'concrete' }, sento: { off: 'concrete' },
    shrine: { off: 'gravel' }, castle: { off: 'gravel' }, shokudo: { off: 'concrete' }, izakaya: { off: 'wood' }, room: { off: 'wood' }
  };
  const groundOf = (place, kind) => { const g = GROUND[place]; return g ? g[kind] || g.off : ''; };
  // ---- each place's background: [layer, how loud by day, by night] (sounds/amb-<layer>-1.m4a, looping); room: through the window,
  // only while the gramophone is quiet. The insects at 4/10 of what they were (2026-11-13, the user: louder than everything else at
  // night): their loop is the loudest to the ear of them all, high and unbroken ----
  const AMB = {
    yard: [['wind', 0.5, 0.35], ['birds', 0.7, 0], ['insects', 0, 0.28]],
    park: [['birds', 0.75, 0], ['wind', 0.25, 0.2], ['insects', 0, 0.24]],
    street: [['traffic', 0.55, 0.3], ['birds', 0.2, 0], ['insects', 0, 0.12]],
    beach: [['waves', 0.85, 0.75], ['gulls', 0.45, 0]],
    harbor: [['harbor', 0.8, 0.7], ['gulls', 0.4, 0]],
    town: [['town', 0.6, 0.25], ['insects', 0, 0.12]],
    station: [['station', 0.6, 0.35]],
    sento: [['town', 0.35, 0.15], ['insects', 0, 0.16]],
    shrine: [['wind', 0.5, 0.4], ['birds', 0.45, 0], ['insects', 0, 0.22]],
    castle: [['wind', 0.5, 0.4], ['birds', 0.5, 0], ['insects', 0, 0.2]],
    shokudo: [['restaurant', 0.6, 0.6]],
    izakaya: [['izakaya', 0.6, 0.6]],
    shop: [['clock', 0.5, 0.5]],
    room: [['birds', 0.18, 0], ['insects', 0, 0.07]]
  };
  // now and then: [sound, seconds apart (least, most), how loud, 'day' | 'night' | '' (any time)]
  const NOW_AND_THEN = {
    shrine: [['crow', 45, 100, 0.3, 'day']], park: [['crow', 90, 180, 0.15, 'day']], castle: [['crow', 80, 160, 0.2, 'day']],
    beach: [['gull', 35, 80, 0.25, 'day']], harbor: [['gull', 30, 70, 0.25, 'day']],
    town: [['bike', 40, 90, 0.5, 'day']], street: [['piyo', 50, 110, 0.6, '']], station: [['chime', 70, 140, 0.5, '']]
  };
  const live = {};   // a layer playing → { g, s }
  let scene = '', tick = 0, nextAt = {};
  function sceneNow() {
    if (document.hidden) return '';
    const r = currentRoute().name;
    if (r === 'outside') return 'yard';
    if (typeof OUT_PLACES !== 'undefined' && OUT_PLACES.includes(r)) return r;
    if (r === 'shop') return 'shop';
    if ((r === 'today' || r === 'bedroom') && !MUSIC.playing()) return 'room';
    return '';
  }
  const daylight = () => sceneClock(lightHour(sceneHour())).day;
  function layerOn(c, n, v) {
    const L = live[n];
    if (L) { L.g.gain.setTargetAtTime(v, c.currentTime, 0.5); return; }
    const g = c.createGain(); g.gain.value = 0.0001; g.connect(amb);
    const me = live[n] = { g, s: null };
    load(c, 'amb-' + n).then((b) => {
      if (!b || live[n] !== me) return;
      const s = c.createBufferSource(), a = lead('amb-' + n, b), len = made('amb-' + n) || b.duration;
      s.buffer = b; s.loop = true; s.loopStart = a; s.loopEnd = a + len; s.connect(g);
      s.start(c.currentTime + 0.02, a + Math.random() * len); me.s = s;   // from somewhere in it: two places' same layer never in step
      g.gain.setTargetAtTime(v, c.currentTime, 0.6);
    });
  }
  function layerOff(n) {
    const L = live[n]; if (!L || !C) return; delete live[n];
    L.g.gain.setTargetAtTime(0.0001, C.currentTime, 0.35);
    setTimeout(() => { try { if (L.s) L.s.stop(); L.g.disconnect(); } catch (e) { /* stopped */ } if (!live[n]) delete bufs['amb-' + n]; }, 2500);   // its sound let go of
  }
  function tune() {
    const c = ctx(), sc = c ? sceneNow() : '';
    if (c) out(c);
    const day = daylight(), want = {};
    (AMB[sc] || []).forEach(([n, d, nt]) => { const v = d * day + nt * (1 - day); if (v > 0.02) want[n] = v; });
    Object.keys(live).forEach((n) => { if (!(n in want)) layerOff(n); });
    Object.keys(want).forEach((n) => layerOn(c, n, want[n]));
    if (sc !== scene) { scene = sc; nextAt = {}; if (sc) prime(sc); }
    if (sc && !tick) tick = setInterval(tickOn, 5000); else if (!sc && tick) { clearInterval(tick); tick = 0; }   // kept going across saves
  }
  let tuned = 0;
  function tickOn() {   // every 5 s: now and then a sound, and once a minute the light's mix again
    const c = ctx(); if (!c || !scene) return;
    const now = Date.now(), day = daylight();
    if (now - tuned > 60000) { tuned = now; tune(); return; }
    (NOW_AND_THEN[scene] || []).forEach(([name, lo, hi, v, when], k) => {
      if ((when === 'day' && day < 0.5) || (when === 'night' && day >= 0.5)) return;
      const key = scene + k;
      if (!nextAt[key]) { nextAt[key] = now + (lo + Math.random() * (hi - lo)) * 500; return; }   // the first one sooner
      if (now < nextAt[key]) return;
      nextAt[key] = now + (lo + Math.random() * (hi - lo)) * 1000;
      play(name, { vol: v * (0.8 + Math.random() * 0.4) });
    });
  }
  function sync() { try { tune(); } catch (e) { console.error(e); } }   // sound never breaks a page
  // a thing used in a place (PLACE_USE): its sound as he gets to it, a second one as the words that follow pop up (then)
  function use(place, t) { const [a, b] = useSound(place, t); play(a, { delay: t.out ? 0.5 : 0 }); if (b) play(b, { delay: 1.2 }); }
  // a place's sounds fetched as it opens, so the first tap is heard at once
  function prime(place) {
    const c = ctx(); if (!c) return;
    const names = new Set((PLACE_USE[place] || []).flatMap((t) => useSound(place, t)).filter((n) => n && (!SYNTH[n] || FILED.has(n))));
    ['way', 'road', 'off'].forEach((k) => { const g = groundOf(place, k); if (g) names.add('steps-' + g); });
    names.forEach((n) => load(c, n));
  }
  // ---- while Japanese is read aloud (speakLine): the world and the gramophone down, back up a moment after the last line ----
  function duck(on) {
    ducks = Math.max(0, ducks + (on ? 1 : -1));
    clearTimeout(unduckT);
    const set = () => {
      if (bus && C) bus.gain.setTargetAtTime(gain(), C.currentTime, ducks ? 0.08 : 0.4);
      MUSIC.duck(Boolean(ducks));
    };
    if (ducks) set(); else unduckT = setTimeout(set, 500);
  }
  document.addEventListener('visibilitychange', () => sync());
  saveHooks.push(() => sync());   // 環境音 switched, the gramophone stopped or started
  ['pointerdown', 'keydown'].forEach((t) => document.addEventListener(t, () => { if (vol() && scene) ctx(); }, true));   // woken by the first tap (iOS)
  // 設定 › 環境音 dragged: louder or softer at once; to none or back from none, the place's sounds stop or start
  function volume() {
    const v = gain();
    if (bus && C) { if (C.state === 'running') bus.gain.setTargetAtTime(v, C.currentTime, 0.05); else { bus.gain.cancelScheduledValues(0); bus.gain.value = v; } }   // asleep (iOS before a tap): set as it is
    sync();
  }
  return { play, use, step, groundOf, sync, duck, volume, SYNTH, scene: () => scene, layers: () => Object.keys(live).sort(), ducked: () => ducks, level: () => (bus ? bus.gain.value : null) };
})();
// what a thing in a place sounds like as it is used, by place.id (a number at the id's end left off: the diner's tables): one
// sound, or two (the second as the words after pop up); else by what it is (a bench, a ride), else nothing
const USE_SND = {
  'yard.tree': 'rustle', 'park.fountain': 'gulp', 'park.pigeons': 'wings', 'park.clock': 'tick',
  'street.vend': 'can-drop', 'street.post': 'letter', 'street.mirror': 'sparkle',
  'beach.crab': 'pinch', 'beach.castle': 'sparkle', 'beach.star': 'splash', 'beach.shell': 'sparkle', 'beach.sea': 'splash',
  'town.cat': 'meow', 'town.chimes': 'furin', 'harbor.cat': 'purr', 'harbor.gull': 'gull', 'harbor.fish': 'flop',
  'station.vend': 'can-drop', 'station.pigeons': 'wings', 'station.taxi': 'horn', 'station.gate': 'ic',
  'sento.milk': 'bottle', 'sento.cat': 'purr', 'sento.bath': 'bath', 'sento.laundry': 'washer',
  'shrine.bell': ['suzu', 'clap'], 'shrine.kuji': 'kuji', 'shrine.crow': 'crow', 'shrine.fox': 'sparkle', 'shrine.kingyo': 'splash', 'shrine.yakisoba': 'sizzle', 'shrine.takoyaki': 'sizzle',
  'castle.sakuraL': 'rustle', 'castle.sakuraR': 'rustle', 'castle.gate': 'knock', 'castle.moat': 'duck',
  'shokudo.table': 'dishes', 'shokudo.chair': 'dishes', 'shokudo.stool': 'dishes', 'shokudo.maneki': 'sparkle', 'shokudo.tv': 'switch',
  'shokudo.kitchen': 'cloth', 'shokudo.kamidana': 'clap', 'shokudo.crates': 'bottles',
  'izakaya.stool': 'cheers', 'izakaya.chabudai': 'cheers', 'izakaya.zabuton': 'cushion', 'izakaya.grill': 'sizzle', 'izakaya.taru': 'barrel'
};
function useSound(place, t) {
  const s = USE_SND[`${place}.${t.id.replace(/\d+$/, '')}`];
  if (s) return [].concat(s);
  if (t.kind === 'sit') return ['sit'];
  if (t.kind === 'seat') return [/kneel/.test(String((t.seats[0] || [])[3])) ? 'cushion' : 'sit'];
  if (t.kind === 'slide') return ['whoosh'];
  return [t.ride === 'swing' ? 'creak' : t.ride === 'rock' ? 'spring' : ''];
}
