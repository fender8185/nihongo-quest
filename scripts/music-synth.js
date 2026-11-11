/* The gramophone's records as music: the scores and the Web Audio synth that plays them. Not part of the app (2026-11-11):
   the app plays each record's file (music/<id>-<n>.m4a), and scripts/render-music.py loads this into the app's page in headless
   Chrome to render a record to that file again (MUSIC_SYNTH.render), when its music changes or a new record is added.

   A record: a tune (mel: notes in eighths, name:length, - a rest), a chord a bar (its first note an octave down for the bass), a
   music-box arpeggio over it (arp: the chord's notes, a step each), a soft pad and the gramophone's warm filter — clean, no
   crackle (the user's call, 2026-11-09). A record whose music changes gets a new file name (engawa-2.m4a): the app keeps a file
   forever once fetched. */
window.MUSIC_SYNTH = (() => {
  const SCORES = {
    engawa: { bpm: 76, bar: 8, lead: 'keys', arp: [0, 2, 1, 2, 3, 2, 1, 2],
      chords: ['F3 A3 C4 E4', 'G3 B3 D4 E4', 'E3 G3 B3 D4', 'A3 C4 E4 G4', 'D3 F3 A3 C4', 'G3 B3 D4 F4', 'C3 E3 G3 B3', 'C3 E3 G3 D4'],
      mel: 'A4:2 G4 A4 C5:2 E5:2 | D5:3 C5 D5:2 G4:2 | E5:2 D5 E5 G5:2 E5:2 | D5:3 C5 A4:4 | C5:2 D5 C5 A4:2 G4:2 | A4:2 C5:2 D5:2 G4:2 | E5:4 D5:2 C5:2 | C5:6 -:2 |'
        + 'A4:2 G4 A4 C5:2 E5:2 | D5:3 C5 D5:2 G5:2 | E5:2 G5 A5 G5:2 E5:2 | D5:3 E5 C5:4 | A5:2 G5 E5 D5:2 C5:2 | D5:2 E5:2 G5:2 D5:2 | E5:3 D5 C5:2 A4:2 | C5:8' },
    yozakura: { bpm: 66, bar: 6, lead: 'koto', arp: [0, 1, 2, 1, 2, 1],
      chords: ['A3 C4 E4', 'A#3 D4 F4 A4', 'D3 F3 A3', 'E3 A3 D4', 'A3 C4 E4', 'F3 A3 C4 E4', 'D3 F3 A3 C4', 'A3 C4 E4'],
      mel: 'E5:2 D5 E5 A5:2 | F5:3 E5 D5:2 | E5:2 F5 E5 D5:2 | A#4:2 A4:4 | A4:2 D5:2 E5:2 | F5:2 E5 F5 A5:2 | F5:2 E5:2 D5:2 | E5:6 |'
        + 'E5:2 D5 E5 A5:2 | A#5:3 A5 F5:2 | E5:2 F5 E5 D5:2 | A#4:2 A4:4 | A5:2 A#5 A5 F5:2 | E5:4 F5:2 | E5:2 D5:2 A#4:2 | A4:6' }
  };
  const NOTE = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };
  const hz = (n) => { const m = /^([A-G]#?)(\d)$/.exec(n); return 440 * Math.pow(2, ((+m[2] + 1) * 12 + NOTE[m[1]] - 69) / 12); };
  // a record as notes to play: [step, instrument, Hz, length in steps, volume], and its length in steps
  function score(rec) {
    const ev = []; let t = 0;
    rec.mel.split(/[\s|]+/).filter(Boolean).forEach((w) => { const [n, l] = w.split(':'), len = +(l || 1); if (n !== '-') ev.push([t, rec.lead, hz(n), len, rec.lead === 'koto' ? 0.45 : 0.16]); t += len; });
    const bars = Math.round(t / rec.bar);
    for (let b = 0; b < bars; b++) {
      const ch = rec.chords[b % rec.chords.length].split(' ').map(hz), s0 = b * rec.bar;
      ev.push([s0, 'bass', ch[0] / 2, rec.bar, 0.13]);
      if (rec.bar === 8) ev.push([s0 + 4, 'bass', ch[0] / 2, 4, 0.08]);
      ev.push([s0, 'pad', ch, rec.bar, 0.018]);
      rec.arp.forEach((k, i) => ev.push([s0 + i, 'box', ch[k % ch.length] * 2, 2, i ? 0.035 : 0.045]));
    }
    return { ev, len: bars * rec.bar };
  }
  let ctx = null, bus = null, kept = {};
  function chain(c) {   // the way out: a warm filter, a small room's echo
    ctx = c;
    const out = ctx.createGain(); out.connect(ctx.destination);
    const warm = ctx.createBiquadFilter(); warm.type = 'lowpass'; warm.frequency.value = 5200; warm.Q.value = 0.4; warm.connect(out);
    bus = ctx.createGain(); bus.gain.value = 0.9; bus.connect(warm);
    const rv = ctx.createConvolver(), sr = ctx.sampleRate, ir = ctx.createBuffer(2, Math.floor(sr * 2.2), sr);
    for (let c2 = 0; c2 < 2; c2++) { const d = ir.getChannelData(c2); for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 3); }
    rv.buffer = ir; const wet = ctx.createGain(); wet.gain.value = 0.22; bus.connect(rv); rv.connect(wet); wet.connect(warm);
  }
  function koto(f) {   // a plucked string (Karplus–Strong), made once a pitch
    const k = Math.round(f); if (kept[k]) return kept[k];
    const sr = ctx.sampleRate, b = ctx.createBuffer(1, Math.floor(sr * 2.4), sr), d = b.getChannelData(0), N = Math.max(2, Math.round(sr / f));
    for (let i = 0; i < N; i++) d[i] = (Math.random() * 2 - 1) * 0.8;
    for (let i = N; i < d.length; i++) d[i] = 0.4985 * (d[i - N] + (i - N - 1 >= 0 ? d[i - N - 1] : 0));
    return (kept[k] = b);
  }
  function env(at, vol, attack, len) {   // a gain that swells in and dies away
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(vol, at + attack); g.gain.exponentialRampToValueAtTime(0.0001, at + attack + len); g.connect(bus); return g;
  }
  function osc(type, f, at, end, to) { const o = ctx.createOscillator(); o.type = type; o.frequency.value = f; o.connect(to); o.start(at); o.stop(end); return o; }
  function note(at, inst, f, steps, vol, step) {
    const len = steps * step;
    if (inst === 'koto') { const s = ctx.createBufferSource(); s.buffer = koto(f); const g = env(at, vol, 0.004, Math.max(1.6, len + 0.8)); s.connect(g); s.start(at); s.stop(at + 2.4); }
    else if (inst === 'keys') { const g = env(at, vol, 0.006, len + 1.1), g2 = env(at, vol * 0.22, 0.004, 0.35); osc('sine', f, at, at + len + 1.3, g); osc('triangle', f, at, at + len + 1.3, env(at, vol * 0.3, 0.006, len * 0.6 + 0.3)); osc('sine', f * 3, at, at + 0.5, g2); }
    else if (inst === 'box') { osc('sine', f, at, at + 1.6, env(at, vol, 0.003, 1.4)); osc('sine', f * 4.2, at, at + 0.4, env(at, vol * 0.18, 0.002, 0.3)); }
    else if (inst === 'bass') osc('sine', f, at, at + len + 0.4, env(at, vol, 0.02, Math.min(len, 2.2)));
    else if (inst === 'pad') {
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900; lp.connect(env(at, vol, 0.7, len + 0.3));
      f.forEach((h) => { osc('triangle', h * 1.003, at, at + len + 1.1, lp); osc('triangle', h * 0.997, at, at + len + 1.1, lp); });
    }
  }
  // a record as a file: rendered offline twice round with the second kept — its start carries the first's echoes, so it loops
  // on without a seam — at peak, as 16-bit stereo WAV in base64
  async function render(id, peak = 0.5) {
    const rec = SCORES[id], sc = score(rec), step = 60 / rec.bpm / 2, L = (sc.len + 2) * step, sr = 44100, n = Math.round(L * sr);
    const oc = new OfflineAudioContext(2, n * 2, sr);
    kept = {}; chain(oc);
    for (let k = 0; k < 2; k++) sc.ev.forEach((e) => note(k * L + e[0] * step, e[1], e[2], e[3], e[4], step));
    const buf = await oc.startRendering();
    const ch = [0, 1].map((c) => buf.getChannelData(c).subarray(n, 2 * n));
    let top = 0; ch.forEach((d) => { for (let i = 0; i < d.length; i++) top = Math.max(top, Math.abs(d[i])); });
    const g = peak / (top || 1), bytes = new Uint8Array(44 + n * 4), v = new DataView(bytes.buffer), str = (o, t) => [...t].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
    str(0, 'RIFF'); v.setUint32(4, 36 + n * 4, true); str(8, 'WAVEfmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 2, true);
    v.setUint32(24, sr, true); v.setUint32(28, sr * 4, true); v.setUint16(32, 4, true); v.setUint16(34, 16, true); str(36, 'data'); v.setUint32(40, n * 4, true);
    for (let i = 0; i < n; i++) for (let c = 0; c < 2; c++) v.setInt16(44 + (i * 2 + c) * 2, Math.max(-32767, Math.min(32767, Math.round(ch[c][i] * g * 32767))), true);
    let b64 = ''; for (let i = 0; i < bytes.length; i += 0x8000) b64 += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return { seconds: L, top, b64: btoa(b64) };
  }
  return { SCORES, render };
})();
