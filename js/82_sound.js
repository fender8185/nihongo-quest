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
  const madeOnce = {};   // a loop made here → its AudioBuffer, kept for the session (bufs lets a layer's go when it stops: making it again would cost more)
  const vol = () => Math.min(1, Math.max(0, Number(state.settings.ambientVol) || 0));   // 設定 › 環境音 (0: none)
  const gain = () => vol() * TOP * (ducks ? DUCK : 1);   // the whole of it: its setting, under Japanese read aloud
  function ctx() { if (!vol()) return null; const c = audioCtx(); if (c && c !== C) { C = c; bus = amb = null; } return c; }
  function out(c) {   // the way out: everything through bus (ducked), the backgrounds through amb on it
    if (!bus) { bus = c.createGain(); bus.gain.value = gain(); bus.connect(c.destination); amb = c.createGain(); amb.gain.value = AMB_VOL; amb.connect(bus); }
    return bus;
  }
  // a loop's or a footstep file's length as made (s): a decoder that leaves the encoder's 2112 samples of lead-in at the start
  // (Chrome and Safari take them off) gives a longer buffer, and the sound then begins that much later (lead)
  const MADE = { 'amb-harbor': 37.5, 'amb-station': 31.4, 'amb-clock': 20, 'amb-river': 11, 'amb-steam': 9, 'amb-falls': 11, 'amb-garden': 9 };
  const made = (name) => MADE[name] || (name.startsWith('amb-') ? 38 : name.startsWith('steps-') ? 2 : 0);
  const lead = (name, b) => { const n = made(name), x = n ? b.duration - n : 0; return x > 0.03 && x < 0.2 ? 2112 / 44100 : 0; };
  function load(c, name) {
    if (!bufs[name] && MADE_LOOPS[name]) bufs[name] = Promise.resolve().then(() => madeOnce[name] || (madeOnce[name] = MADE_LOOPS[name](c))).catch(() => null);   // made here (湯の花's river): once a session
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
    chomp: (c, to, v) => { noise(c, to, 0, 0.07, 0.6 * v, 1400, 600, 1.2); noise(c, to, 0.09, 0.05, 0.35 * v, 2200, 900, 1.5); tone(c, to, 140, 0, 0.09, 0.2 * v, 'sine', 90); },   // a bite (YEN's もぐもぐ)
    ding: (c, to, v) => { tone(c, to, 1760, 0, 1.3, 0.14 * v); tone(c, to, 4858, 0, 0.45, 0.025 * v); },   // the bell on らいらいけん's pass: a dish up (外場 2.0)
    ring: (c, to, v) => { for (let i = 0; i < 18; i++) tone(c, to, i % 2 ? 1320 : 1580, i * 0.045, 0.045, 0.045 * v, 'square'); },   // the shop's phone, a trill (外場 2.0)
    // みなと駅のホーム (2026-11-20): a train coming in — the rumble growing, the brakes' long squeal at the end; going out — the
    // motor winding up, the rumble fading; the doors' ピンポン (twice); the platform's bell, a little tune of our own
    'train-in': (c, to, v) => { noise(c, to, 0, 5.6, 0.5 * v, 160, 90, 0.7); for (let k = 0; k < 10; k++) noise(c, to, 0.4 + k * (0.55 - k * 0.03), 0.07, 0.35 * v, 900, 0, 2); tone(c, to, 2900, 4.4, 1.3, 0.025 * v, 'sine', 2600); tone(c, to, 3480, 4.6, 1.1, 0.015 * v, 'sine', 3200); },
    'train-out': (c, to, v) => { noise(c, to, 0, 5.6, 0.5 * v, 90, 220, 0.7); tone(c, to, 180, 0.2, 3.4, 0.03 * v, 'sawtooth', 620); for (let k = 0; k < 10; k++) noise(c, to, 0.6 + k * (0.32 + k * 0.02), 0.06, 0.3 * v, 900, 0, 2); },
    'door-chime': (c, to, v) => [0, 0.5].forEach((at) => { tone(c, to, 1046, at, 0.36, 0.1 * v); tone(c, to, 784, at + 0.18, 0.5, 0.1 * v); }),
    'dep-bell': (c, to, v) => [[784, 0], [988, 0.18], [1175, 0.36], [988, 0.54], [1319, 0.72], [1175, 0.9], [988, 1.08], [1175, 1.26], [1568, 1.5]].forEach(([f, at]) => { tone(c, to, f, at, 0.42, 0.08 * v, 'triangle'); tone(c, to, f * 2, at, 0.2, 0.015 * v); }),
    // やまなみ線's diesel (2026-11-23): away — the engine's low growl winding up, its putter quickening; in — the growl dying down,
    // the brakes' sigh; its horn ポーッ (two notes held, a third apart); over the bridge the wheels' clatter, quick and hollow
    // over the river; into a tunnel the roar closing round (muffled, low)
    'diesel-out': (c, to, v) => { noise(c, to, 0, 4.6, 0.45 * v, 70, 150, 0.8); tone(c, to, 40, 0, 4.4, 0.07 * v, 'sawtooth', 76); for (let k = 0; k < 12; k++) noise(c, to, 0.3 + k * (0.42 - k * 0.022), 0.08, 0.32 * v, 260, 0, 1.4); },
    'diesel-in': (c, to, v) => { noise(c, to, 0, 4.4, 0.42 * v, 150, 80, 0.8); tone(c, to, 70, 0, 3.8, 0.06 * v, 'sawtooth', 38); for (let k = 0; k < 8; k++) noise(c, to, 0.3 + k * (0.3 + k * 0.04), 0.07, 0.28 * v, 260, 0, 1.4); noise(c, to, 3.6, 0.8, 0.18 * v, 3000, 2600, 3); },
    'diesel-horn': (c, to, v) => [[440, 0.13], [554, 0.1], [220, 0.04]].forEach(([f, a], k) => held(c, to, f, 0, 1.15, a * v, k === 2 ? 'square' : 'triangle')),
    bridge: (c, to, v) => { noise(c, to, 0, 2.6, 0.32 * v, 120, 200, 0.9); for (let k = 0; k < 10; k++) [0, 0.09].forEach((d) => { noise(c, to, k * 0.26 + d, 0.05, 0.4 * v, 1800, 0, 2.4); tone(c, to, 330, k * 0.26 + d, 0.12, 0.03 * v, 'sine', 300); }); },
    tunnel: (c, to, v) => { noise(c, to, 0, 2, 0.6 * v, 180, 320, 0.6); noise(c, to, 0.3, 1.5, 0.3 * v, 90, 140, 0.7); tone(c, to, 58, 0, 1.9, 0.06 * v, 'sine', 64); },
    // 湯の花温泉 (2026-11-23): geta on the stones — カラン, コロン: a hollow wooden knock under its clack, the one foot's a little higher
    // than the other's — a step of the hero's (GROUND: 湯けむり通り, the 湯畑), a visitor going by in them now and then (five steps,
    // fading away); the 射的's cork gun, ポン: a pop and its hollow note falling
    'steps-geta': (c, to, v) => { const hi = Math.random() < 0.5; noise(c, to, 0, 0.045, 0.32 * v, hi ? 2700 : 2000, 0, 3); tone(c, to, hi ? 860 : 660, 0, 0.1, 0.12 * v, 'triangle', hi ? 720 : 560); },
    geta: (c, to, v) => [0, 0.34, 0.68, 1.02, 1.36].forEach((at, k) => { const g = v * (1 - k * 0.16), hi = k % 2; noise(c, to, at, 0.045, 0.3 * g, hi ? 2700 : 2000, 0, 3); tone(c, to, hi ? 860 : 660, at, 0.1, 0.11 * g, 'triangle', hi ? 720 : 560); }),
    pon: (c, to, v) => { noise(c, to, 0, 0.06, 0.6 * v, 1500, 600, 1.4); tone(c, to, 440, 0.005, 0.18, 0.26 * v, 'sine', 170); },
    // 旅館「花月」 (2026-11-24): the 鹿威し's コーン — a hollow knock of bamboo on stone, its tube ringing a moment, the water after it; the
    // front desk's bell, チーン — its strike, then its bright partials dying away; a fusuma or shoji slid — the paper's swish on its
    // track, a soft トン at its end; a step on tatami, soft and dull
    kon: (c, to, v) => { noise(c, to, 0, 0.025, 0.45 * v, 2600, 0, 2); tone(c, to, 960, 0, 0.3, 0.3 * v, 'triangle', 860); tone(c, to, 1910, 0, 0.12, 0.07 * v, 'sine', 1760); tone(c, to, 430, 0, 0.46, 0.12 * v, 'sine', 410); noise(c, to, 0.16, 0.7, 0.04 * v, 3200, 2200, 3); },
    'desk-bell': (c, to, v) => { noise(c, to, 0, 0.02, 0.35 * v, 5200, 0, 2); [[1975, 0.13, 1.9], [2964, 0.045, 1.3], [4872, 0.035, 0.9], [6350, 0.015, 0.5]].forEach(([f, a, len]) => tone(c, to, f, 0, len, a * v)); },
    fusuma: (c, to, v) => { noise(c, to, 0, 0.46, 0.2 * v, 650, 1250, 1.4); noise(c, to, 0.04, 0.4, 0.08 * v, 2100, 2600, 2); tone(c, to, 150, 0.45, 0.1, 0.2 * v, 'sine', 100); noise(c, to, 0.45, 0.05, 0.16 * v, 420, 0, 1.2); },
    'steps-tatami': (c, to, v) => { noise(c, to, 0, 0.07, 0.22 * v, 760, 380, 1.1); tone(c, to, 110, 0, 0.06, 0.05 * v, 'sine', 80); }
  };
  // a note held (a horn's): in, held, out — tone's own is a pluck
  function held(c, to, f, at, len, vol, type) {
    const o = c.createOscillator(), g = c.createGain(), t = c.currentTime + 0.02 + at;
    o.type = type; o.frequency.setValueAtTime(f, t);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.06); g.gain.setValueAtTime(vol, t + len - 0.2); g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    o.connect(g); g.connect(to); o.start(t); o.stop(t + len + 0.03);
  }
  // ---- loops made here, no file (2026-11-23): 湯の花's river under the station square — a mountain stream's rush (noise, softened,
  // swelling slowly) with water burbling over stones now and then; 12 s made, the last second faded into the first, looped over 11 ----
  const MADE_LOOPS = { 'amb-river': (c) => {
    const sr = c.sampleRate, n = Math.floor(sr * 12), xf = sr, b = c.createBuffer(1, n, sr), d = b.getChannelData(0);
    let lo = 0, hi = 0;
    for (let i = 0; i < n; i++) { const w = Math.random() * 2 - 1, t = i / sr; lo += 0.05 * (w - lo); hi += 0.45 * (w - hi); d[i] = (lo * 1.8 + (w - hi) * 0.08) * (0.78 + 0.22 * Math.sin(t * Math.PI / 3) * Math.sin(t * 2.7 + 1)); }
    for (let k = 0; k < 110; k++) { const at = Math.floor(Math.random() * (n - sr * 0.2)), f = 280 + Math.random() * 620, len = Math.floor(sr * (0.03 + Math.random() * 0.07)), a = 0.03 + Math.random() * 0.04; for (let j = 0; j < len; j++) d[at + j] += a * Math.sin(2 * Math.PI * f * (1 + 0.4 * j / len) * j / sr) * Math.exp(-3 * j / len); }
    return seam(b, xf, 0.05);
  },
  // 湯の花温泉 (2026-11-23): steam's hiss — high, soft, swelling and easing as the puffs come (10 s made, looped over 9) — and the 湯畑's
  // water running down its troughs and over the fall into the pool: a fuller rush than the river's, low, with splashes on top (12 s, 11)
  'amb-steam': (c) => {
    const sr = c.sampleRate, n = Math.floor(sr * 10), b = c.createBuffer(1, n, sr), d = b.getChannelData(0);
    let lo = 0, mid = 0;
    for (let i = 0; i < n; i++) { const w = Math.random() * 2 - 1, t = i / sr; lo += 0.06 * (w - lo); mid += 0.45 * (w - mid); const s = Math.sin(t * Math.PI / 2.5 + 0.8 * Math.sin(t * 0.9)); d[i] = ((w - mid) * 0.7 + (mid - lo) * 0.25) * (0.5 + 0.5 * s * s); }
    return seam(b, sr, 0.035);
  },
  'amb-falls': (c) => {
    const sr = c.sampleRate, n = Math.floor(sr * 12), b = c.createBuffer(1, n, sr), d = b.getChannelData(0);
    let lo = 0, lo2 = 0, hi = 0;
    for (let i = 0; i < n; i++) { const w = Math.random() * 2 - 1, t = i / sr; lo += 0.03 * (w - lo); lo2 += 0.12 * (w - lo2); hi += 0.6 * (w - hi); d[i] = (lo * 2.4 + (lo2 - lo) * 0.9 + (w - hi) * 0.05) * (0.86 + 0.14 * Math.sin(t * 1.7) * Math.sin(t * 0.43 + 2)); }
    for (let k = 0; k < 160; k++) { const at = Math.floor(Math.random() * (n - sr * 0.2)), len = Math.floor(sr * (0.02 + Math.random() * 0.05)), a = 0.04 + Math.random() * 0.05; for (let j = 0; j < len; j++) d[at + j] += a * (Math.random() * 2 - 1) * Math.exp(-4 * j / len); }   // splashes
    return seam(b, sr, 0.06);
  },
  // 旅館「花月」's garden (2026-11-24): the thin stream off its bamboo spout into the stone basin — a soft trickle, now and then a drop
  // (10 s made, looped over 9)
  'amb-garden': (c) => {
    const sr = c.sampleRate, n = Math.floor(sr * 10), b = c.createBuffer(1, n, sr), d = b.getChannelData(0);
    let lo = 0, hi = 0;
    for (let i = 0; i < n; i++) { const w = Math.random() * 2 - 1, t = i / sr; lo += 0.3 * (w - lo); hi += 0.85 * (w - hi); d[i] = (lo - hi * 0.6) * 0.35 * (0.7 + 0.3 * Math.sin(t * 7.3) * Math.sin(t * 2.1 + 0.6)); }
    for (let k = 0; k < 60; k++) { const at = Math.floor(Math.random() * (n - sr * 0.1)), f = 700 + Math.random() * 900, len = Math.floor(sr * (0.03 + Math.random() * 0.04)), a = 0.04 + Math.random() * 0.05; for (let j = 0; j < len; j++) d[at + j] += a * Math.sin(2 * Math.PI * f * (1 + 0.5 * j / len) * j / sr) * Math.exp(-4 * j / len); }   // drops
    return seam(b, sr, 0.03);
  } };
  // a loop made here: its last xf samples faded into its first (seamless over [0, n − xf)), brought to an rms of `to` (about −26 dBFS, as the files: 0.05)
  function seam(b, xf, to) {
    const d = b.getChannelData(0), n = d.length;
    for (let j = 0; j < xf; j++) { const g = j / xf; d[j] = d[j] * g + d[n - xf + j] * (1 - g); }
    let sum = 0; for (let i = 0; i < n - xf; i++) sum += d[i] * d[i];
    const k = to / Math.sqrt(sum / (n - xf) || 1); for (let i = 0; i < n; i++) d[i] = Math.max(-0.5, Math.min(0.5, d[i] * k));
    return b;
  }
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
    shrine: { off: 'gravel' }, oku: { off: 'gravel' }, castle: { off: 'gravel' }, shokudo: { off: 'concrete' }, izakaya: { off: 'wood' }, room: { off: 'wood' }, kominkan: { off: 'concrete' }, kyoshitsu: { off: 'wood' }, rairai: { off: 'concrete' }, sushi: { off: 'concrete' }, chinatown: { off: 'concrete' }, platform: { off: 'concrete' }, chinadori: { off: 'concrete' }, onsen: { off: 'concrete' },
    yudori: { off: 'geta' }, yubatake: { off: 'geta' },   // 湯の花温泉 (2026-11-23): geta on the stones, カランコロン (SYNTH steps-geta)
    ryokan: { off: 'wood' }, washitsu: { off: 'tatami' }   // 旅館「花月」 (2026-11-24): the lobby's boards in slippers; 桜の間's tatami (SYNTH steps-tatami)
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
    platform: [['station', 0.45, 0.3], ['wind', 0.3, 0.25]],   // みなと駅のホーム (2026-11-20): up on the viaduct, the wind off the sea
    sento: [['town', 0.35, 0.15], ['insects', 0, 0.16]],
    shrine: [['wind', 0.5, 0.4], ['birds', 0.45, 0], ['insects', 0, 0.22]],
    oku: [['wind', 0.6, 0.45], ['birds', 0.5, 0], ['insects', 0, 0.26]],   // the top of the hill: more wind, the birds of the wood
    castle: [['wind', 0.5, 0.4], ['birds', 0.5, 0], ['insects', 0, 0.2]],
    shokudo: [['restaurant', 0.6, 0.6]],
    kominkan: [['town', 0.35, 0.15], ['birds', 0.3, 0], ['insects', 0, 0.16]],
    kyoshitsu: [['clock', 0.45, 0.45]],   // 日本語教室 (2026-11-14): its wall clock ticking
    chinatown: [['town', 0.6, 0.35], ['restaurant', 0.25, 0.25]],   // 中華街: a busy street, kitchens open onto it
    chinadori: [['town', 0.5, 0.3], ['restaurant', 0.3, 0.25]],   // 大通り (2026-11-14): its shops and kitchens either side
    rairai: [['restaurant', 0.55, 0.45]],   // らいらいけん (2026-11-15): its kitchen and its tables
    sushi: [['restaurant', 0.35, 0.3], ['harbor', 0.14, 0.12]],   // みなと寿司 (2026-11-23): a quiet counter, the harbour outside its door
    onsen: [['river', 0.55, 0.5], ['birds', 0.55, 0], ['wind', 0.25, 0.2], ['insects', 0, 0.2]],   // 湯の花駅前 (2026-11-23): the river below, the mountain's birds
    yudori: [['town', 0.42, 0.24], ['river', 0.16, 0.14], ['steam', 0.22, 0.24], ['insects', 0, 0.12]],   // 湯けむり通り (2026-11-23): people about, the gutter's hot water, steam
    yubatake: [['falls', 0.62, 0.56], ['steam', 0.4, 0.4], ['town', 0.22, 0.14], ['birds', 0.22, 0], ['insects', 0, 0.14]],   // 湯畑 (2026-11-23): its water down the troughs and over the fall, the steam
    ryokan: [['garden', 0.5, 0.45], ['birds', 0.16, 0], ['insects', 0, 0.1]],   // 旅館「花月」's lobby (2026-11-24): quiet, the garden's water through the window (its 鹿威し: RYOKAN.mount)
    washitsu: [['river', 0.14, 0.12], ['birds', 0.28, 0], ['garden', 0.1, 0.08], ['insects', 0, 0.14]],   // 桜の間: the river far below the 広縁's window, the mountain's birds
    izakaya: [['izakaya', 0.6, 0.6]],
    shop: [['clock', 0.5, 0.5]],
    room: [['birds', 0.18, 0], ['insects', 0, 0.07]]
  };
  // now and then: [sound, seconds apart (least, most), how loud, 'day' | 'night' | '' (any time)]
  const NOW_AND_THEN = {
    shrine: [['crow', 45, 100, 0.3, 'day']], oku: [['crow', 60, 140, 0.25, 'day']], park: [['crow', 90, 180, 0.15, 'day']], castle: [['crow', 80, 160, 0.2, 'day']],
    beach: [['gull', 35, 80, 0.25, 'day']], harbor: [['gull', 30, 70, 0.25, 'day']],
    town: [['bike', 40, 90, 0.5, 'day']], street: [['piyo', 50, 110, 0.6, '']], station: [['chime', 70, 140, 0.5, '']],
    onsen: [['diesel-horn', 70, 150, 0.12, ''], ['crow', 90, 180, 0.15, 'day']],   // 湯の花 (2026-11-23): the diesel's horn far off down the valley
    yudori: [['geta', 9, 22, 0.55, '']], yubatake: [['geta', 16, 36, 0.4, ''], ['crow', 90, 180, 0.12, 'day']],   // visitors in geta going by (2026-11-23)
    ryokan: [['furin', 14, 34, 0.3, '']], washitsu: [['furin', 18, 40, 0.2, ''], ['kon', 24, 48, 0.14, '']]   // 旅館「花月」: its wind chime; up in 桜の間 the 鹿威し heard faint from the garden below
  };
  // more while something stands there (2026-11-23): the 朝市 at the harbour — people about it, gulls after the fish (ICHIBA)
  const MARKET = () => typeof ICHIBA === 'object' && ICHIBA.now();
  const AMB_MORE = { harbor: () => (MARKET() ? [['town', 0.4, 0.3], ['gulls', 0.35, 0.15]] : []) };
  // 旅館「花月」's 鹿威し sounds as its own animation turns (RYOKAN.mount); with motion reduced it stands still, so a faint コーン now and then
  const STILL = () => Boolean(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  const NOW_MORE = { harbor: () => (MARKET() ? [['gull', 10, 26, 0.3, '']] : []), ryokan: () => (STILL() ? [['kon', 16, 30, 0.22, '']] : []) };
  const later = (place) => (NOW_AND_THEN[place] || []).concat(NOW_MORE[place] ? NOW_MORE[place]() : []);   // what a place sounds now and then
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
    (AMB[sc] || []).concat(AMB_MORE[sc] ? AMB_MORE[sc]() : []).forEach(([n, d, nt]) => { const v = Math.min(1, (want[n] || 0) + d * day + nt * (1 - day)); if (v > 0.02) want[n] = v; });
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
    later(scene).forEach(([name, lo, hi, v, when], k) => {
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
  return { play, use, step, groundOf, sync, duck, volume, SYNTH, later, scene: () => scene, layers: () => Object.keys(live).sort(), ducked: () => ducks, level: () => (bus ? bus.gain.value : null) };
})();
// what a thing in a place sounds like as it is used, by place.id (a number at the id's end left off: the diner's tables): one
// sound, or two (the second as the words after pop up); else by what it is (a bench, a ride), else nothing
const USE_SND = {
  'yard.tree': 'rustle', 'park.fountain': 'gulp', 'park.pigeons': 'wings', 'park.clock': 'tick',
  'street.vend': 'can-drop', 'street.post': 'letter', 'street.mirror': 'sparkle',
  'beach.crab': 'pinch', 'beach.castle': 'sparkle', 'beach.star': 'splash', 'beach.shell': 'sparkle', 'beach.sea': 'splash',
  'town.cat': 'meow', 'town.chimes': 'furin', 'harbor.cat': 'purr', 'harbor.gull': 'gull', 'harbor.fish': 'flop',
  'station.vend': 'can-drop', 'station.jobs': 'paper', 'platform.vend': 'can-drop', 'platform.bins': 'drawer', 'platform.wait': 'slide-door', 'platform.stall': 'paper', 'station.pigeons': 'wings', 'station.taxi': 'horn', 'station.gate': 'ic',
  'sento.milk': 'bottle', 'sento.cat': 'purr', 'sento.bath': 'bath', 'sento.laundry': 'washer',
  'chinatown.post': 'paper', 'chinatown.notice': 'paper', 'chinatown.shirt': 'cloth', 'chinatown.seiro': 'pour', 'chinatown.panda': 'cushion', 'chinatown.rmenu': 'paper', 'chinatown.yuka': 'place', 'chinatown.shishi': 'clap', 'chinatown.uranai': 'sparkle',
  'yudori.yunohanado': 'paper', 'yudori.junbi': 'knock', 'yudori.shateki': 'pon', 'yudori.shatekishut': 'knock', 'yudori.sakaya': 'barrel', 'yudori.kagetsu': 'furin', 'yudori.yukataya': 'cloth', 'yudori.yukatayashut': 'knock', 'yudori.kanmi': 'dishes', 'yudori.neko': 'meow',   // 湯けむり通り (2026-11-23; a shut shop knocks, 2026-11-24)
  'yubatake.tamago': 'plop', 'yubatake.yubatake': 'pour', 'yubatake.taki': 'splash', 'yubatake.yumomi': 'splash',   // 湯畑 (2026-11-23)
  'ryokan.niwa': 'furin', 'ryokan.keys': 'kuji', 'ryokan.noren': 'cloth', 'ryokan.ikebana': 'rustle', 'ryokan.getabako': 'drawer', 'ryokan.sofa': 'cushion', 'ryokan.daicho': 'page', 'ryokan.bell': 'desk-bell', 'ryokan.tea': 'pour',   // 旅館「花月」 (2026-11-24)
  'washitsu.mado': 'slide-door', 'washitsu.toko': 'rustle', 'washitsu.oshiire': 'fusuma', 'washitsu.tv': 'switch', 'washitsu.ac': 'ic', 'washitsu.shoji': 'fusuma', 'washitsu.engawa': 'sit', 'washitsu.zaisu': 'cushion', 'washitsu.yukata': 'cloth', 'washitsu.manju': 'paper', 'washitsu.wrapper': 'paper',
  'onsen.gate': 'tick', 'onsen.clock': 'tick', 'onsen.post': 'letter', 'onsen.ashiyu': 'plop', 'onsen.annai': 'slide-door', 'onsen.jobs': 'paper', 'onsen.map': 'paper', 'onsen.rick': 'cushion',   // 湯の花駅前 (2026-11-23)
  'harbor.sushi': 'slide-door', 'harbor.sakana': 'flop', 'harbor.himono': 'rustle', 'harbor.yaki': 'sizzle',
  'sushi.stool': 'sit', 'sushi.table': 'dishes', 'sushi.menu': 'paper', 'sushi.fuda': 'paper', 'sushi.case': 'sparkle', 'sushi.gyotaku': 'paper',
  'rairai.pass': 'sizzle', 'rairai.register': 'suzu', 'rairai.table': 'dishes', 'rairai.menu': 'paper', 'rairai.poster': 'paper', 'rairai.tank': 'splash', 'rairai.toilet': 'door-close',
  'chinadori.ranran': 'suzu', 'chinadori.fuku': 'rustle', 'chinadori.toka': 'pour', 'chinadori.rairai': 'dishes', 'chinadori.kuriya': 'sizzle', 'chinadori.kohaku': 'furin', 'chinadori.board': 'paper',
  'kominkan.keiji': 'paper', 'kominkan.neko': 'meow', 'kominkan.hana': 'rustle', 'kominkan.nobori': 'cloth', 'kominkan.tokei': 'tick', 'kominkan.jitensha': 'bike',
  'kyoshitsu.board': 'paper', 'kyoshitsu.karuta': 'paper', 'kyoshitsu.radio': 'switch', 'kyoshitsu.books': 'page', 'kyoshitsu.clock': 'tick', 'kyoshitsu.cranes': 'paper', 'kyoshitsu.window': 'rustle', 'kyoshitsu.table0': 'sit', 'kyoshitsu.table1': 'sit',
  'oku.okusha': 'clap', 'oku.okuema': 'kuji', 'oku.omokaru': 'place', 'oku.chaya': 'dishes', 'oku.view': 'rustle',
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
