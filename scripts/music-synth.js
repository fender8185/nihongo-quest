/* The gramophone's records as music: the scores and the Web Audio synth that plays them. Not part of the app (2026-11-11):
   the app plays each record's file (music/<id>-<n>.m4a), and scripts/render-music.py loads this into the app's page in headless
   Chrome to render a record to that file again (MUSIC_SYNTH.render), when its music changes or a new record is added.

   A record: a tune (mel: notes in eighths, name:length, - a rest), a chord a bar (its first note an octave down for the bass), a
   music-box arpeggio over it (arp: the chord's notes, a step each), a soft pad and the gramophone's warm filter — clean, no
   crackle (the user's call, 2026-11-09). A record whose music changes gets a new file name (engawa-2.m4a): the app keeps a file
   forever once fetched.

   The records since 2026-11-12 may also have (the first two use none of it, so their sound stays as it was): more voices (parts,
   gate: the share of each note sounded; A3+C4 plays two at once), the chords played in a rhythm (comp: [step, length] hits a
   bar, roll: steps between the notes), a walking bass made from the chords (walk), drums (a pattern a bar, a character a
   sixteenth: x a hit, o louder, g softer, . none), swing, other arps (arps: one a bar, -1 a rest; arpInst, arpOct, arpVol,
   arpLen), the bass's range (low), its volume (bassVol), the pad's (pad: 0 none), more or less echo (wet), the filter (warm),
   no gap before it starts again (tail: 0 — the first two breathe two eighths), and its loudest sample in the file (peak, not
   0.5: so a record with soft peaks isn't louder than the others). */
window.MUSIC_SYNTH = (() => {
  const rep = (n, x) => Array(n).fill(x);
  // a tune or a list of bars put together from its sections: form('A A B A', { A: ..., B: ... })
  const form = (order, s) => { const a = order.split(' ').map((k) => s[k]); return typeof a[0] === 'string' ? a.join(' | ') : a.flat(); };
  const SCORES = {
    engawa: { bpm: 76, bar: 8, lead: 'keys', arp: [0, 2, 1, 2, 3, 2, 1, 2],
      chords: ['F3 A3 C4 E4', 'G3 B3 D4 E4', 'E3 G3 B3 D4', 'A3 C4 E4 G4', 'D3 F3 A3 C4', 'G3 B3 D4 F4', 'C3 E3 G3 B3', 'C3 E3 G3 D4'],
      mel: 'A4:2 G4 A4 C5:2 E5:2 | D5:3 C5 D5:2 G4:2 | E5:2 D5 E5 G5:2 E5:2 | D5:3 C5 A4:4 | C5:2 D5 C5 A4:2 G4:2 | A4:2 C5:2 D5:2 G4:2 | E5:4 D5:2 C5:2 | C5:6 -:2 |'
        + 'A4:2 G4 A4 C5:2 E5:2 | D5:3 C5 D5:2 G5:2 | E5:2 G5 A5 G5:2 E5:2 | D5:3 E5 C5:4 | A5:2 G5 E5 D5:2 C5:2 | D5:2 E5:2 G5:2 D5:2 | E5:3 D5 C5:2 A4:2 | C5:8' },
    yozakura: { bpm: 66, bar: 6, lead: 'koto', arp: [0, 1, 2, 1, 2, 1],
      chords: ['A3 C4 E4', 'A#3 D4 F4 A4', 'D3 F3 A3', 'E3 A3 D4', 'A3 C4 E4', 'F3 A3 C4 E4', 'D3 F3 A3 C4', 'A3 C4 E4'],
      mel: 'E5:2 D5 E5 A5:2 | F5:3 E5 D5:2 | E5:2 F5 E5 D5:2 | A#4:2 A4:4 | A4:2 D5:2 E5:2 | F5:2 E5 F5 A5:2 | F5:2 E5:2 D5:2 | E5:6 |'
        + 'E5:2 D5 E5 A5:2 | A#5:3 A5 F5:2 | E5:2 F5 E5 D5:2 | A#4:2 A4:4 | A5:2 A#5 A5 F5:2 | E5:4 F5:2 | E5:2 D5:2 A#4:2 | A4:6' },
    // 春風: a bamboo flute over the music box, D major pentatonic, a lilt of dotted notes; A A' B A', the box answering in B
    harukaze: { bpm: 92, peak: 0.33, bar: 8, tail: 0, lead: 'flute', leadVol: 0.11, low: 'D2', arp: [0, 2, 3, 1, 2, 3, 2, 3],
      chords: form('A A2 B A2', { A: ['D3 F#3 A3 E4', 'B2 F#3 A3 D4', 'G3 B3 D4 F#4', 'A3 C#4 E4 A4', 'B2 F#3 A3 D4', 'G3 B3 D4 F#4', 'E3 G3 B3 D4', 'A3 C#4 E4 A4'],
        A2: ['D3 F#3 A3 E4', 'B2 F#3 A3 D4', 'G3 B3 D4 F#4', 'A3 C#4 E4 A4', 'B2 F#3 A3 D4', 'G3 B3 D4 F#4', 'A3 C#4 E4 A4', 'D3 F#3 A3 E4'],
        B: ['G3 B3 D4 F#4', 'A3 C#4 E4 A4', 'F#3 A3 C#4 E4', 'B2 F#3 A3 D4', 'G3 B3 D4 F#4', 'A3 C#4 E4 A4', 'B2 F#3 A3 D4', 'A3 C#4 E4 G4'] }),
      mel: form('A A2 B A2', {
        A: 'A4:2 B4 D5 E5:2 D5:2 | F#5:3 E5 D5:2 B4:2 | A4:2 B4:1.5 A4:0.5 F#4:2 A4:2 | B4 D5 E5:6 | A4:2 B4 D5 E5:2 F#5:2 | A5:3 F#5 E5:2 D5:2 | E5:2 D5:1.5 B4:0.5 A4:2 B4:2 | A4:6 -:2',
        A2: 'A4:2 B4 D5 E5:2 D5:2 | F#5:3 E5 D5:2 B4:2 | A4:2 B4:1.5 A4:0.5 F#4:2 A4:2 | B4 D5 E5:6 | A4:2 B4 D5 E5:2 A5:2 | B5:3 A5 F#5:2 E5:2 | F#5:2 E5:1.5 D5:0.5 B4:2 E5:2 | D5:6 -:2',
        B: 'B4:3 A4 B4:2 D5:2 | E5:6 D5 E5 | F#5:3 E5 C#5:2 A4:2 | B4:6 A4 B4 | D5:2 E5:2 F#5:2 A5:2 | B5:4 A5:2 E5:2 | A5:3 F#5 E5:2 D5:2 | E5:6 -:2' }),
      parts: [{ inst: 'box', vol: 0.08, mel: '-:128 | -:8 | -:2 C#6 B5 A5:2 -:2 | -:8 | -:2 F#5 E5 D5:2 -:2 | -:8 | -:8 | -:8 | -:2 G5 E5 C#5:2 -:2' }] },
    // 夏祭り: 祭り囃子 — a shinobue in the yo scale over the big drum's don and its rim's ka, the small drum's ten-tsuku and the
    // hand gong; A: high calls, B: lower and off the beat over a 3-3-2 drum; the last bar runs up into the first
    matsuri: { bpm: 112, peak: 0.58, bar: 8, tail: 0, lead: 'fue', leadVol: 0.1, bass: false, pad: 0.012, wet: 0.18,
      chords: form('A B', { A: rep(8, 'D3 A3 D4'), B: rep(8, 'G3 D4 G4') }),
      mel: form('A B A B2', {
        A: 'D6:3 B5 A5:2 B5:2 | A5 G5 E5:2 G5:4 | A5:2 B5 A5 G5 E5 D5:2 | E5:6 -:2 | D6:3 B5 A5:2 B5:2 | D6:2 E6:2 D6:2 B5:2 | A5 B5 A5 G5 E5:2 G5 E5 | D5:6 -:2',
        B: '-:1 G5 A5 G5 -:1 E5 G5:2 | A5:3 B5 A5 G5 E5:2 | -:1 D5 E5 G5 -:1 E5 D5:2 | E5:2 D5 B4 D5:4 | -:1 G5 A5 B5 -:1 B5 D6:2 | E6:3 D6 B5 A5 G5:2 | A5 B5 A5 G5 E5 G5 A5:2 | B5:4 -:4',
        B2: '-:1 G5 A5 G5 -:1 E5 G5:2 | A5:3 B5 A5 G5 E5:2 | -:1 D5 E5 G5 -:1 E5 D5:2 | E5:2 D5 B4 D5:4 | -:1 G5 A5 B5 -:1 B5 D6:2 | E6:3 D6 B5 A5 G5:2 | A5 B5 A5 G5 E5:2 D5:2 | E5:2 G5:2 A5:2 B5:2' }),
      drums: [
        { inst: 'taiko', f: 95, vol: 0.13, pats: form('A B', { A: ['x.......x.......', 'x.......x.....x.', 'x.......x.......', 'x...x...x.x.x.x.', 'x.......x.......', 'x.......x.....x.', 'x.......x.......', 'x...x...x.x.x.x.'],
          B: ['x.....x.....x...', 'x.....x.....x...', 'x.....x.....x...', 'x...x...x.x.x.x.', 'x.....x.....x...', 'x.....x.....x...', 'x.....x.....x...', 'x.x.x.x.x.x.o.o.'] }) },
        { inst: 'ka', f: 950, vol: 0.16, pats: form('A A B B', { A: ['....x.x.....x.x.', '....x.x.....x.x.', '....x.x.....x.x.', '....x.x.........'], B: ['....x.....x...x.', '....x.....x...x.', '....x.....x...x.', '................'] }) },
        { inst: 'shime', f: 330, vol: 0.09, pats: form('A B', { A: rep(8, 'x...x.gxx...x.gx'), B: rep(8, 'x.g.x.gxx.g.x.gx') }) },
        { inst: 'kane', f: 760, vol: 0.05, pats: form('A B', { A: rep(8, 'x.......x.g.....'), B: rep(8, 'x...x...x...x...') }) }] },
    // 月見: a breathy flute over the koto, slow, in the miyako-bushi (in) scale on E; A, B (higher, the koto answering), and four
    // bars of the koto alone that settle back onto E, the flute stepping back in
    tsukimi: { bpm: 60, bar: 8, tail: 0, lead: 'flute', leadVol: 0.12, low: 'E2', bassVol: 0.6, pad: 0.012, wet: 0.3, arpInst: 'koto', arpOct: 1, arpVol: 6,
      arps: form('A B C', { A: rep(8, [0, -1, 2, -1, 1, -1, 3, -1]), B: rep(8, [0, -1, 2, -1, 1, -1, 3, -1]), C: rep(4, [0, -1, -1, -1, -1, -1, -1, -1]) }),
      chords: form('A B C', { A: ['E3 B3 E4 F4', 'A2 E3 A3 C4', 'F3 C4 E4 A4', 'E3 B3 E4 F4', 'A2 E3 A3 C4', 'F3 C4 E4 A4', 'A2 E3 A3 C4', 'E3 B3 E4 F4'],
        B: ['A2 E3 A3 C4', 'A2 E3 A3 C4', 'F3 C4 E4 A4', 'F3 C4 E4 A4', 'A2 E3 A3 C4', 'E3 B3 E4 F4', 'F3 C4 E4 A4', 'E3 B3 E4 F4'], C: ['A2 E3 A3 C4', 'F3 C4 E4 A4', 'E3 B3 E4 F4', 'E3 B3 E4 F4'] }),
      mel: form('A B C', {
        A: 'B4:2 C5 B4 A4:4 | B4:2 E5:2 C5:2 B4:2 | A4:3 B4 A4:2 F4:2 | E4:6 -:2 | A4:2 B4:2 C5:3 B4 | E5:4 F5:2 E5:2 | C5:3 B4 A4:2 B4:2 | B4:6 -:2',
        B: 'E5:3 F5 E5:2 C5:2 | B4:4 -:4 | A5:4 F5:2 E5:2 | F5:3 E5 C5:4 | B4:2 C5:2 E5:2 F5:2 | E5:6 -:2 | C5:3 B4 A4:2 F4:2 | E4:6 -:2', C: '-:24 | -:6 A4:2' }),
      parts: [{ inst: 'koto', vol: 0.45, mel: '-:72 | -:4 E5 C5 B4 A4 | -:48 | A4 B4 C5 E5 F5:2 E5:2 | C5:2 B4 A4 F4:2 A4:2 | B4:2 C5 B4 A4 F4 E4:2 | E4:2 B3:2 E3:4' }] },
    // 雪の朝: a soft piano, its left hand in slow broken chords, the music box now and then like falling snow; F major with a
    // minor iv (B♭m6) for the sigh; A B A, the last bar back home on F
    yukiasa: { bpm: 70, peak: 0.44, bar: 8, tail: 0, lead: 'piano', leadVol: 0.1, bass: false, pad: 0.01, arpInst: 'piano', arpOct: 1, arpVol: 1.1, arpLen: 6,
      arps: [[0, 1, 3, -1, 2, -1, 1, -1], [0, 2, 3, -1, 1, -1, -1, -1]],
      chords: form('A B A2', { A: ['F2 C3 E3 A3', 'A2 E3 G3 C4', 'A#2 F3 A3 D4', 'C3 F3 A3 C4', 'D3 A3 C4 F4', 'G2 D3 F3 A#3', 'A#2 F3 G3 C#4', 'C3 G3 A#3 F4'],
        B: ['D3 A3 C4 F4', 'A#2 F3 A3 D4', 'G2 D3 F3 A#3', 'C3 G3 A#3 E4', 'A2 E3 G3 C4', 'D3 A3 C4 F4', 'A#2 F3 A3 D4', 'C3 G3 A#3 F4'],
        A2: ['F2 C3 E3 A3', 'A2 E3 G3 C4', 'A#2 F3 A3 D4', 'C3 F3 A3 C4', 'D3 A3 C4 F4', 'G2 D3 F3 A#3', 'A#2 F3 G3 C#4', 'F2 C3 E3 A3'] }),
      mel: form('A B A', {
        A: 'E5:3 F5 A5:2 C6:2 | G5:4 E5:2 C5:2 | D5:3 F5 A5:4 | G5:2 F5:2 C5:4 | F5:3 E5 D5:2 A5:2 | A#5:3 A5 G5:2 D5:2 | F5:2 G5:2 C#5:4 | C5:6 -:2',
        B: 'A5:4 G5:2 F5:2 | F5:3 D5 C5:2 D5:2 | D5:2 F5:2 A#5:4 | A5:2 G5:2 E5:4 | C6:3 A5 G5:2 E5:2 | F5:3 E5 D5:2 F5:2 | A5:4 F5:2 D5:2 | G5:6 -:2' }),
      parts: [{ inst: 'box', vol: 0.04, mel: form('A B A2', {
        A: '-:8 | -:6 E6 C6 | -:8 | -:5 A5 C6 F6 | -:8 | -:6 D6 A#5 | -:8 | -:5 F5 A#5 C6',
        B: '-:8 | -:6 F6 D6 | -:8 | -:5 E6 C6 G5 | -:8 | -:6 A5 F5 | -:8 | -:5 F5 G5 C6',
        A2: '-:8 | -:6 E6 C6 | -:8 | -:5 A5 C6 F6 | -:8 | -:6 D6 A#5 | -:8 | -:5 C6 A5 F5' }) }] },
    // 喫茶しずく: café jazz in F, swung — a piano tune over an electric piano's comping, a walking bass, brushes and a soft ride;
    // 32 bars, A A B A, of ii–V–I turns; the last bar's C7 turns back to the top
    kissa: { bpm: 100, peak: 0.41, bar: 8, tail: 0, swing: 0.3, lead: 'piano', leadVol: 0.09, bass: false, pad: 0, walk: 0.075,
      chords: form('A1 A2 B A3', {
        A1: ['F2 A3 C4 E4 G4', 'D3 F#3 B3 C4 E4', 'G2 A#3 D4 F4 A4', 'C3 A#3 D4 E4 A4', 'A2 G3 B3 C4 E4', 'D3 F#3 B3 C4 E4', 'G2 A#3 D4 F4 A4', 'C3 A#3 D4 E4 A4'],
        A2: ['F2 A3 C4 E4 G4', 'D3 F#3 B3 C4 E4', 'G2 A#3 D4 F4 A4', 'C3 A#3 D4 E4 A4', 'G2 A#3 D4 F4 A4', 'C3 A#3 D4 E4 A4', 'F2 A3 C4 E4 G4', 'F2 A3 D4 D#4 G4'],
        B: ['A#2 A3 C4 D4 F4', 'A#2 C#4 F4 G4 C5', 'A2 G3 B3 C4 E4', 'D3 F#3 B3 C4 E4', 'G2 B3 E4 F4 A4', 'G2 B3 E4 F4 A4', 'G2 A#3 D4 F4 A4', 'C3 A#3 D4 E4 A4'],
        A3: ['F2 A3 C4 E4 G4', 'D3 F#3 B3 C4 E4', 'G2 A#3 D4 F4 A4', 'C3 A#3 D4 E4 A4', 'G2 A#3 D4 F4 A4', 'C3 A#3 D4 E4 A4', 'F2 A3 C4 E4 G4', 'C3 A#3 D4 E4 A4'] }),
      mel: form('A1 A2 B A3', {
        A1: '-:1 C5 E5 F5 A5:3 G5 | F#5:4 -:2 E5 D5 | D5 F5 A5 G5:3 F5:2 | E5:3 D5 C5 A#4 A4 G4 | C5:2 E5 G5 -:1 E5:3 | F#5:3 E5 D5:2 C5:2 | A#4:2 D5 F5 A5:3 G5 | E5:4 -:4',
        A2: '-:1 C5 E5 F5 A5:3 G5 | F#5:4 -:2 E5 D5 | D5 F5 A5 G5:3 F5:2 | E5:3 D5 C5 A#4 A4 G4 | A#4 D5 F5 A5 -:1 G5 F5 D5 | E5:2 G5 A#5 A5:2 G5 E5 | F5:6 -:2 | -:2 A4 C5 D#5 F5 A5:2',
        B: 'A5:4 F5 D5 C5 A#4 | C#5:3 F5 G5:4 | E5:3 C5 A4:2 G4:2 | F#4 A4 C5 E5 D5:4 | B4:2 D5 F5 A5:3 G5 | F5:3 E5 D5:2 B4:2 | A#4:2 D5 F5 A5:2 G5:2 | E5:3 D5 C5:2 -:2',
        A3: '-:1 C5 E5 F5 A5:3 G5 | F#5:4 -:2 E5 D5 | D5 F5 A5 G5:3 F5:2 | E5:3 D5 C5 A#4 A4 G4 | A#4 D5 F5 A5 -:1 G5 F5 D5 | E5:2 G5 A#5 A5:2 G5 E5 | F5:6 -:2 | -:8' }),
      comp: { inst: 'rhodes', vol: 0.025, pats: [[[0, 3], [3, 2]], [[1, 1], [4, 3]], [[0, 6]], [[2, 2], [5, 2]], [[0, 3], [3, 2]], [[3, 2], [7, 1]], [[0, 6]], [[1, 1], [4, 3]]] },
      drums: [{ inst: 'ride', f: 2400, vol: 0.04, pats: ['x...x.x.x...x.x.'] }, { inst: 'brush', vol: 0.06, pats: ['....x.......x...'] }, { inst: 'swish', vol: 0.02, pats: ['x...x...x...x...'] }] },
    // おばけの夜: spooky but cute — E minor, the music box tiptoeing with chromatic steps over a creeping plucked bass and
    // pizzicato offbeats; B moves to G major, the pizzicato takes the tune and the box rings above; A A' B A'
    obake: { bpm: 96, peak: 0.73, bar: 8, tail: 0, lead: 'box', leadVol: 0.08, bass: false, pad: 0.008,
      chords: form('A A2 B A2', { A: ['E3 G3 B3 E4', 'E3 G3 B3 E4', 'A3 C4 E4', 'B3 D#4 F#4 A4', 'E3 G3 B3 E4', 'C4 E4 G4', 'A3 C4 E4', 'B3 D#4 F#4 A4'],
        A2: ['E3 G3 B3 E4', 'E3 G3 B3 E4', 'A3 C4 E4', 'B3 D#4 F#4 A4', 'E3 G3 B3 E4', 'C4 E4 G4', 'B3 D#4 F#4 A4', 'E3 G3 B3 E4'],
        B: ['G3 B3 D4', 'D4 F#4 A4 C5', 'G3 B3 D4', 'E3 G#3 B3 D4', 'A3 C4 E4', 'B3 D#4 F#4 A4', 'C4 E4 G4', 'B3 D#4 F#4 A4'] }),
      mel: form('A A2 B A2', {
        A: 'E5 -:1 G5 -:1 B5:2 A#5 B5 | C6:2 B5 A5 G5:2 E5:2 | A5 -:1 C6 -:1 E6:2 D#6 E6 | D#6:2 B5 A5 F#5:2 D#5:2 | E5 -:1 G5 -:1 B5:2 A#5 B5 | E6:2 D6 C6 B5:2 G5:2 | A5:2 C6 B5 A5:2 E5:2 | D#5:2 F#5 A5 B5:2 -:2',
        A2: 'E5 -:1 G5 -:1 B5:2 A#5 B5 | C6:2 B5 A5 G5:2 E5:2 | A5 -:1 C6 -:1 E6:2 D#6 E6 | D#6:2 B5 A5 F#5:2 D#5:2 | E5 -:1 G5 -:1 B5:2 A#5 B5 | E6:2 D6 C6 B5:2 G5:2 | B5 A5 G5 F#5 D#5:2 -:2 | E5:2 -:2 E6 -:3',
        B: 'B5:4 D6:4 | C6:4 A5:4 | B5:4 G5:4 | G#5:4 B5:4 | C6:4 A5:4 | B5:4 D#6:4 | C6:4 E6:4 | D#6:2 -:6' }),
      comp: { inst: 'pizz', vol: 0.07, pats: form('A A B A', { A: rep(8, [[2, 1], [6, 1]]), B: rep(8, []) }) },
      parts: [{ inst: 'walk', vol: 0.07, gate: 0.45, mel: form('A A2 B A2', {
          A: 'E2:2 G2:2 B2:2 G2:2 | E2:2 F#2:2 G2:2 G#2:2 | A2:2 C3:2 A2:2 A#2:2 | B2:2 A2:2 G2:2 F#2:2 | E2:2 G2:2 B2:2 G2:2 | C3:2 G2:2 E2:2 G2:2 | A2:2 C3:2 A2:2 A#2:2 | B2:2 F#2:2 G2:2 D#2:2',
          A2: 'E2:2 G2:2 B2:2 G2:2 | E2:2 F#2:2 G2:2 G#2:2 | A2:2 C3:2 A2:2 A#2:2 | B2:2 A2:2 G2:2 F#2:2 | E2:2 G2:2 B2:2 G2:2 | C3:2 G2:2 E2:2 G2:2 | B2:2 A2:2 G2:2 F#2:2 | E2:2 -:2 E2:2 -:2',
          B: 'G2:2 D2:2 G2:2 D2:2 | D2:2 A2:2 F#2:2 A2:2 | G2:2 D2:2 G2:2 B2:2 | E2:2 G#2:2 B2:2 G#2:2 | A2:2 E2:2 A2:2 C3:2 | B2:2 F#2:2 B2:2 A2:2 | C3:2 G2:2 E2:2 G2:2 | B2:2 A2:2 G2:2 F#2:2' }) },
        { inst: 'pizz', vol: 0.3, mel: '-:128 | D5 B4 G4 B4 D5:2 B4:2 | C5 A4 F#4 A4 C5:2 A4:2 | B4 D5 G5 F#5 G5:2 D5:2 | G#4 B4 D5 E5 D5:2 B4:2 | C5 E5 A5 G5 E5:2 C5:2 | D#5 F#5 A5 G5 F#5:2 D#5:2 | C5 E5 G5 E5 C5:2 G4:2 | F#4 A4 B4 D#5 F#5:2 -:2' }] },
    // 赤ちょうちん: the izakaya's record, enka and min'yō — a shamisen in the yonanuki minor on A, a breathy flute answering
    // its phrases, a soft pad; B: the flute sings and the shamisen keeps the zun-chan; A B A
    chochin: { bpm: 76, peak: 0.65, bar: 8, tail: 0, lead: 'shamisen', leadVol: 0.26, low: 'D2', bassVol: 0.8, pad: 0.016,
      chords: form('A B A', { A: ['A3 C4 E4', 'D4 F4 A4', 'A3 C4 E4', 'E4 G#4 B4 D5', 'F4 A4 C5', 'D4 F4 A4', 'E4 G#4 B4 D5', 'A3 C4 E4'],
        B: ['F4 A4 C5', 'A3 C4 E4', 'D4 F4 A4', 'A3 C4 E4', 'F4 A4 C5', 'D4 F4 A4', 'E4 G#4 B4 D5', 'E4 G#4 B4 D5'] }),
      mel: form('A B A', { A: 'E5:1.5 F5:0.5 E5:2 C5:2 B4 C5 | A4:4 -:4 | C5:1.5 E5:0.5 F5:2 E5:2 C5:2 | B4:4 -:4 | A4:1.5 C5:0.5 E5:2 F5:2 E5 C5 | F5:1.5 E5:0.5 C5:2 A4:4 | B4:1.5 C5:0.5 E5:2 B4:2 C5 B4 | A4:4 -:4', B: '-:64' }),
      comp: { inst: 'shamisen', vol: 0.08, roll: 0.05, pats: form('A B A', { A: rep(8, []), B: rep(8, [[2, 1], [6, 1]]) }) },
      parts: [{ inst: 'flute', vol: 0.055, mel: form('A B A', {
        A: '-:8 | -:4 F5:2 E5:2 | -:8 | -:4 B4 C5 B4:2 | -:8 | -:6 E5 F5 | -:8 | -:4 C5 B4 A4:2',
        B: 'A5:4 F5:2 E5:2 | E5:6 C5:2 | F5:3 E5 C5:2 A4:2 | E5:6 -:2 | C5:2 E5:2 F5:2 A5:2 | A5:3 F5 E5:4 | F5:3 E5 C5:2 B4:2 | B4:6 -:2' }) }] },
    // みなと案内: the cruise tour's own (2026-11-13, the user: the tour wanted music) — a sightseeing stroll in F, lightly swung: a
    // bright flute over pizzicato on the off beats, a walking bass, brushes and a soft ride; A A' B A'', the music box answering
    // the flute in A', the last bar settling home and back into the first
    minato: { bpm: 120, peak: 0.42, bar: 8, tail: 0, swing: 0.15, lead: 'flute', leadVol: 0.1, bass: false, pad: 0.008, walk: 0.06,
      chords: form('A A2 B A3', {
        A: ['F3 A3 C4 E4', 'D3 F3 A3 C4', 'G3 A#3 D4 F4', 'C3 E3 G3 A#3', 'F3 A3 C4 E4', 'A3 C4 E4 G4', 'A#3 D4 F4 A4', 'C3 E3 G3 A#3'],
        A2: ['F3 A3 C4 E4', 'D3 F3 A3 C4', 'G3 A#3 D4 F4', 'C3 E3 G3 A#3', 'F3 A3 C4 E4', 'A3 C4 E4 G4', 'G3 A#3 D4 F4', 'F3 A3 C4 E4'],
        B: ['A#3 D4 F4 A4', 'C3 E3 G3 C4', 'A3 C4 E4 G4', 'D3 F3 A3 C4', 'G3 A#3 D4 F4', 'C3 E3 G3 A#3', 'D3 F#3 A3 C4', 'C3 E3 G3 A#3'],
        A3: ['F3 A3 C4 E4', 'D3 F3 A3 C4', 'G3 A#3 D4 F4', 'C3 E3 G3 A#3', 'F3 A3 C4 E4', 'A3 C4 E4 G4', 'C3 E3 G3 A#3', 'F3 A3 C4 E4'] }),
      mel: form('A A2 B A3', {
        A: 'C5 F5 A5:2 G5 F5 A5:2 | D6:3 C6 A5:4 | A#5 A5 G5 F5 G5:2 A#5:2 | A5:2 G5 F5 E5:2 C5:2 | C5 F5 A5:2 G5 F5 A5:2 | C6:3 A5 E5:2 G5:2 | F5 G5 A5 A#5 D6:2 C6 A#5 | A5:2 G5:2 -:2 C5 E5',
        A2: 'C5 F5 A5:2 G5 F5 A5:2 | D6:3 C6 A5:4 | A#5 A5 G5 F5 G5:2 A#5:2 | A5:2 G5 F5 E5:2 C5:2 | C5 F5 A5:2 G5 F5 A5:2 | C6:3 A5 E5:2 G5:2 | A#5 A5 G5 A#5 E5:2 G5:2 | F5:2 A5 C6 F6:2 -:2',
        B: 'D6:2 C6 A#5 F5:4 | E5 G5 C6 E6 D6:2 C6:2 | C6:2 A5 E5 A5:4 | F5 A5 D6 F6 E6:2 D6:2 | D6:2 A#5 G5 A#5:2 D6:2 | C6:2 A#5 G5 E5:4 | A5 C6 D6 C6 A5:2 F#5:2 | G5:2 A#5:2 C6 A#5 G5 E5',
        A3: 'C5 F5 A5:2 G5 F5 A5:2 | D6:3 C6 A5:4 | A#5 A5 G5 F5 G5:2 A#5:2 | A5:2 G5 F5 E5:2 C5:2 | C5 F5 A5:2 G5 F5 A5:2 | C6:3 A5 E5:2 G5:2 | A#5 A5 G5 A#5 E5:2 G5:2 | F5:2 C5 A4 F4:2 -:2' }),
      comp: { inst: 'pizz', vol: 0.06, pats: rep(8, [[2, 1], [6, 1]]) },
      drums: [{ inst: 'brush', vol: 0.05, pats: ['....x.......x...'] }, { inst: 'ride', f: 2400, vol: 0.02, pats: ['x.x.x.x.x.x.x.x.'] }],
      parts: [{ inst: 'box', vol: 0.05, mel: '-:64 | -:8 | -:4 F6 E6 C6 A5 | -:8 | -:6 C6 E6 | -:8 | -:4 E6 C6 A5 G5 | -:8 | -:8' }] }
  };
  const NOTE = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };
  const hz = (n) => { const m = /^([A-G]#?)(\d)$/.exec(n); return 440 * Math.pow(2, ((+m[2] + 1) * 12 + NOTE[m[1]] - 69) / 12); };
  const midi = (f) => Math.round(69 + 12 * Math.log2(f / 440)), mhz = (m) => 440 * Math.pow(2, (m - 69) / 12);
  const fold = (f, lo) => { while (f > lo * 1.99) f /= 2; while (f < lo * 0.995) f *= 2; return f; };   // f, by octaves, into [lo, 2·lo)
  // a voice's notes into ev; its length in steps
  function line(ev, mel, inst, vol, gate = 1) {
    let t = 0;
    mel.split(/[\s|]+/).filter(Boolean).forEach((w) => { const [n, l] = w.split(':'), len = +(l || 1); if (n !== '-') n.split('+').forEach((m) => ev.push([t, inst, hz(m), len * gate, vol])); t += len; });
    return t;
  }
  // a bar of walking bass from its chord: the root, then chord tones or a step up, then a half step into the next bar's root
  function walking(ev, ch, next, s0, b, vol) {
    const low = (m) => { while (m >= 52) m -= 12; while (m < 40) m += 12; return m; }, r = low(midi(ch[0])), n = low(midi(hz(next.split(' ')[0])));
    const third = ch.slice(1).some((f) => (((midi(f) - r) % 12) + 12) % 12 === 4) ? 4 : 3, way = [[r, r + third, r + 7], [r, r + 7, r + 9], [r, r + 2, r + third]][b % 3];
    const into = Math.abs(n - 1 - way[2]) <= Math.abs(n + 1 - way[2]) ? n - 1 : n + 1;
    [...way, into].forEach((m, i) => ev.push([s0 + i * 2, 'walk', mhz(m), 1.8, vol * [1, 0.85, 0.92, 0.85][i]]));
  }
  // a bar of a drum: a character a sixteenth; each hit lasts to the next, a little louder or softer by a fixed hash
  function hits(ev, d, pat, s0, b) {
    const p = pat.replace(/\s/g, ''), at = [...p].map((c, i) => [c, i]).filter(([c]) => c !== '.');
    at.forEach(([c, i], k) => { const nx = k + 1 < at.length ? at[k + 1][1] : p.length, wob = Math.abs(Math.sin(b * 12.9898 + i * 78.233) * 43758.5453) % 1;
      ev.push([s0 + i / 2, d.inst, d.f || 0, (nx - i) / 2, d.vol * { x: 1, o: 1.35, g: 0.45 }[c] * (0.92 + 0.16 * wob)]); });
  }
  const swing = (s, k) => { const b = Math.floor(s / 2) * 2, p = s - b; return b + (p < 1 ? p * (1 + k) : 1 + k + (p - 1) * (1 - k)); };   // a beat's second eighth, late
  // a record as notes to play: [step, instrument, Hz, length in steps, volume], and its length in steps
  function score(rec) {
    const ev = [], bars = Math.round(line(ev, rec.mel, rec.lead, rec.leadVol || (rec.lead === 'koto' ? 0.45 : 0.16)) / rec.bar), bv = rec.bassVol || 1;
    for (let b = 0; b < bars; b++) {
      const ch = rec.chords[b % rec.chords.length].split(' ').map(hz), s0 = b * rec.bar, root = rec.low ? fold(ch[0], hz(rec.low)) : ch[0] / 2, arp = rec.arps ? rec.arps[b % rec.arps.length] : rec.arp;
      if (rec.bass !== false) {
        ev.push([s0, 'bass', root, rec.bar, 0.13 * bv]);
        if (rec.bar === 8) ev.push([s0 + 4, 'bass', root, 4, 0.08 * bv]);
      }
      if (rec.pad !== 0) ev.push([s0, 'pad', ch, rec.bar, rec.pad || 0.018]);
      if (arp) arp.forEach((k, i) => k >= 0 && ev.push([s0 + i, rec.arpInst || 'box', ch[k % ch.length] * (rec.arpOct || 2), rec.arpLen || 2, (i ? 0.035 : 0.045) * (rec.arpVol || 1)]));
      if (rec.comp) rec.comp.pats[b % rec.comp.pats.length].forEach(([s, l]) => ch.slice(1).forEach((f, i) => ev.push([s0 + s + i * (rec.comp.roll || 0), rec.comp.inst, f, l, rec.comp.vol])));
      if (rec.walk) walking(ev, ch, rec.chords[(b + 1) % rec.chords.length], s0, b, rec.walk);
      (rec.drums || []).forEach((d) => hits(ev, d, d.pats[b % d.pats.length], s0, b));
    }
    (rec.parts || []).forEach((p) => line(ev, p.mel, p.inst, p.vol, p.gate));
    if (rec.swing) ev.forEach((e) => { const end = swing(e[0] + e[3], rec.swing); e[0] = swing(e[0], rec.swing); e[3] = end - e[0]; });
    return { ev, len: bars * rec.bar };
  }
  let ctx = null, bus = null, kept = {};
  function chain(c, rec = {}) {   // the way out: a warm filter, a small room's echo
    ctx = c;
    const out = ctx.createGain(); out.connect(ctx.destination);
    const warm = ctx.createBiquadFilter(); warm.type = 'lowpass'; warm.frequency.value = rec.warm || 5200; warm.Q.value = 0.4; warm.connect(out);
    bus = ctx.createGain(); bus.gain.value = 0.9; bus.connect(warm);
    const rv = ctx.createConvolver(), sr = ctx.sampleRate, ir = ctx.createBuffer(2, Math.floor(sr * 2.2), sr);
    for (let c2 = 0; c2 < 2; c2++) { const d = ir.getChannelData(c2); for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 3); }
    rv.buffer = ir; const wet = ctx.createGain(); wet.gain.value = rec.wet || 0.22; bus.connect(rv); rv.connect(wet); wet.connect(warm);
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
    else if (INST[inst]) INST[inst](at, f, len, vol);
  }
  // the instruments added 2026-11-12, for the records since (the five above stay as they were: their files are kept for good)
  const out = (p) => { if (!p) return bus; const k = 'pan' + p; if (!kept[k]) { kept[k] = ctx.createStereoPanner(); kept[k].pan.value = p; kept[k].connect(bus); } return kept[k]; };   // a place left (-1) to right (1)
  const filter = (type, f, q, to) => { const x = ctx.createBiquadFilter(); x.type = type; x.frequency.value = f; x.Q.value = q; x.connect(to); return x; };
  const wave = (h) => kept['w' + h] || (kept['w' + h] = ctx.createPeriodicWave(new Float32Array(h.length + 1), Float32Array.from([0, ...h])));   // a tone of these harmonics
  function hiss(at, end, to) {   // white noise, from one buffer made once a render
    if (!kept.noise) { const sr = ctx.sampleRate, b = ctx.createBuffer(1, sr * 2, sr), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; kept.noise = b; }
    const s = ctx.createBufferSource(); s.buffer = kept.noise; s.loop = true; s.connect(to); s.start(at, Math.random()); s.stop(end);
  }
  // the gains below start silent: a gain is 1 until its first event, and a buffer (noise, a string) can start a frame before
  // it — one frame of noise at full gain, a click
  const quiet = (to) => { const g = ctx.createGain(); g.gain.value = 0; g.connect(to); return g; };
  function fade(at, vol, attack, len, to) {   // env's swell and fade, into to
    const g = quiet(to); g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(vol, at + attack); g.gain.exponentialRampToValueAtTime(0.0001, at + attack + len); return g;
  }
  function hold(at, vol, attack, len, rel, to) {   // a gain that swells in, sags a little while held, and lets go
    const g = quiet(to), off = at + Math.max(len, attack + 0.02);
    g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(vol, at + attack); g.gain.exponentialRampToValueAtTime(vol * 0.75, off); g.gain.exponentialRampToValueAtTime(0.0001, off + rel); return g;
  }
  function strike(at, vol, tau, len, rel, to) {   // a gain struck: it dies away while held (tau), faster once let go (rel)
    const g = quiet(to); g.gain.setValueAtTime(0, at); g.gain.linearRampToValueAtTime(vol, at + 0.005); g.gain.setTargetAtTime(0, at + 0.005, tau); g.gain.setTargetAtTime(0, at + Math.max(len, 0.01), rel); return g;
  }
  // a plucked string (Karplus–Strong) that rings about tau s (a: brightness 0.5–1, dark: a softer pluck 0–1), made once a length,
  // with the playback rate that tunes it to f exactly
  function pluck(f, tau, a, dark) {
    const sr = ctx.sampleRate, N = Math.max(2, Math.floor(sr / f - (1 - a))), k = ['p', N, tau, a, dark].join();
    if (!kept[k]) {
      const b = ctx.createBuffer(1, Math.floor(sr * 1.6), sr), d = b.getChannelData(0), rho = Math.exp(-(N + 1 - a) / (sr * tau));
      let lp = 0, mean = 0;
      for (let i = 0; i < N; i++) { lp += (1 - dark) * (Math.random() * 2 - 1 - lp); d[i] = lp; mean += lp / N; }
      let e = 0; for (let i = 0; i < N; i++) { d[i] -= mean; e += d[i] * d[i] / N; }   // no offset (no thump), and as strong however soft
      for (let i = 0; i < N; i++) d[i] *= 0.5 / (Math.sqrt(e) || 1);
      for (let i = N; i < d.length; i++) d[i] = rho * (a * d[i - N] + (1 - a) * (i > N ? d[i - N - 1] : 0));
      kept[k] = b;
    }
    return { b: kept[k], rate: (N + 1 - a) * f / sr };
  }
  // a bamboo flute: a breathy tone that scoops up onto its note and wavers once held (flute: soft, shakuhachi-like; fue: shinobue)
  const WIND = { flute: { harm: [1, 0.22, 0.07, 0.03], att: 0.07, rel: 0.2, vib: 5, dep: 0.0045, air: 0.35, scoop: 0.985, pan: -0.15 },
    fue: { harm: [1, 0.32, 0.12, 0.05], att: 0.03, rel: 0.12, vib: 6, dep: 0.006, air: 0.2, scoop: 0.98, pan: -0.1 } };
  function blow(at, f, len, vol, w) {
    const o = out(w.pan), off = at + Math.max(len, 0.14), end = at + Math.max(len, w.att + 0.02) + w.rel + 0.05, t = ctx.createOscillator(), lfo = ctx.createOscillator(), d = quiet(t.frequency), b = quiet(o);
    t.setPeriodicWave(wave(w.harm)); t.frequency.setValueAtTime(f * w.scoop, at); t.frequency.exponentialRampToValueAtTime(f, at + 0.06);
    lfo.frequency.value = w.vib; d.gain.setValueAtTime(0, at); d.gain.setValueAtTime(0, at + 0.3); d.gain.linearRampToValueAtTime(f * w.dep, at + 0.9); lfo.connect(d);
    t.connect(hold(at, vol, w.att, len, w.rel, o)); [t, lfo].forEach((x) => { x.start(at); x.stop(end); });
    b.gain.setValueAtTime(0.0001, at); b.gain.exponentialRampToValueAtTime(vol * w.air * 2.5, at + 0.02); b.gain.exponentialRampToValueAtTime(vol * w.air, at + 0.12); b.gain.setValueAtTime(vol * w.air, off); b.gain.exponentialRampToValueAtTime(0.0001, off + w.rel);
    hiss(at, end, filter('bandpass', f * 1.5, 0.8, filter('lowpass', 4000, 0, b)));   // the breath, round the note
  }
  const INST = {
    flute: (at, f, len, vol) => blow(at, f, len, vol, WIND.flute),
    fue: (at, f, len, vol) => blow(at, f, len, vol, WIND.fue),
    taiko(at, f, len, vol) {   // the big drum's "don": a skin that drops in pitch and rings, the stick's thud on top
      const o = out(0), s = osc('sine', f, at, at + 1, fade(at, vol, 0.003, 0.7, o)), b = osc('sine', f * 2.3, at, at + 0.6, fade(at, vol * 0.8, 0.003, 0.35, o));
      s.frequency.setValueAtTime(f * 1.5, at); s.frequency.exponentialRampToValueAtTime(f, at + 0.12); b.frequency.setValueAtTime(f * 2.8, at); b.frequency.exponentialRampToValueAtTime(f * 2.3, at + 0.08);
      osc('sine', f * 3.7, at, at + 0.3, fade(at, vol * 0.35, 0.002, 0.15, o));
      hiss(at, at + 0.15, filter('lowpass', 1400, 0, fade(at, vol * 3, 0.002, 0.06, o)));
    },
    shime(at, f, len, vol) {   // the small tight drum's "ten": a high skin, quick, and the stick
      const o = out(0.25), s = osc('sine', f, at, at + 0.3, fade(at, vol, 0.002, 0.15, o));
      s.frequency.setValueAtTime(f * 1.3, at); s.frequency.exponentialRampToValueAtTime(f, at + 0.025);
      hiss(at, at + 0.06, filter('bandpass', 2000, 1.2, fade(at, vol * 1.5, 0.001, 0.03, o)));
    },
    ka(at, f, len, vol) {   // a stick on the big drum's wooden rim: a dry click
      const o = out(-0.25); osc('triangle', f, at, at + 0.15, fade(at, vol, 0.001, 0.07, o)); osc('sine', f * 0.52, at, at + 0.15, fade(at, vol * 0.6, 0.001, 0.08, o));
      hiss(at, at + 0.05, filter('bandpass', f * 2, 3, fade(at, vol * 1.2, 0.001, 0.025, o)));
    },
    kane(at, f, len, vol) {   // the small hand gong (atarigane): a bright clang (FM, inharmonic), damped by the next hit
      const o = out(0.35), d = Math.min(0.45, Math.max(0.08, len)), c = osc('sine', f, at, at + d + 0.1, fade(at, vol, 0.002, d, o)), m = quiet(c.frequency);
      m.gain.setValueAtTime(f * 2, at); m.gain.exponentialRampToValueAtTime(f * 0.2, at + d); osc('sine', f * 1.41, at, at + d + 0.1, m);
    },
    shamisen(at, f, len, vol) {   // a shamisen: the bachi's bright pluck that bends down onto the note, a quick decay, the skin's tap
      const o = out(0.15), p = pluck(f, 0.35, 0.6, 0.7), s = ctx.createBufferSource(); s.buffer = p.b;
      s.playbackRate.setValueAtTime(p.rate * 1.012, at); s.playbackRate.exponentialRampToValueAtTime(p.rate, at + 0.08);
      s.connect(fade(at, vol, 0.002, Math.min(1.3, len + 0.5), filter('lowpass', 2600, 0, o))); s.start(at); s.stop(at + 1.6);
      hiss(at, at + 0.05, filter('bandpass', 1100, 1.4, fade(at, vol * 0.6, 0.001, 0.03, o)));
    },
    pizz(at, f, len, vol) {   // a plucked violin string: soft, round and short
      const p = pluck(f, 0.22, 0.5, 0.8), s = ctx.createBufferSource(); s.buffer = p.b; s.playbackRate.value = p.rate;
      s.connect(fade(at, vol, 0.003, 0.5, filter('lowpass', 1800, 0, out(0.2)))); s.start(at); s.stop(at + 0.7);
    },
    piano(at, f, len, vol) {   // a soft piano: the higher partials fade first, two strings a little apart, damped when let go
      const o = out(-0.1), tau = Math.min(3, Math.max(0.7, 2.2 * Math.sqrt(262 / f))), end = at + len + 1.2;
      [[1, 0.6, 1], [1.0016, 0.3, 1], [2, 0.3, 1.8], [3, 0.1, 2.8], [4.01, 0.04, 4]].forEach(([r, a, k]) => osc('sine', f * r, at, end, strike(at, vol * a, tau / k, len, 0.15, o)));
    },
    rhodes(at, f, len, vol) {   // an electric piano (FM): a bell-like bite that softens into a round tone, and the tine's ping;
      // its 1:1 FM has a sideband at 0 Hz, so it goes out through a high-pass (made once a render), or it would shift off centre
      const o = kept.rhodes || (kept.rhodes = filter('highpass', 30, 0, out(0.15))), end = at + len + 1, c = osc('sine', f, at, end, strike(at, vol, 1.8, len, 0.2, o)), m = quiet(c.frequency);
      m.gain.setValueAtTime(f * 1.2, at); m.gain.setTargetAtTime(f * 0.2, at, 0.3); osc('sine', f, at, end, m);
      osc('sine', f * 7, at, at + 0.3, fade(at, vol * 0.03, 0.002, 0.15, o));
    },
    walk(at, f, len, vol) {   // an upright bass, plucked: a round note with the finger's thump, darkening as it rings
      const o = out(0), lp = filter('lowpass', 1200, 1, strike(at, vol * 0.7, 0.7, len, 0.06, o));
      lp.frequency.setValueAtTime(1200, at); lp.frequency.exponentialRampToValueAtTime(350, at + 0.3);
      osc('sawtooth', f, at, at + len + 0.5, lp); osc('sine', f, at, at + len + 0.5, strike(at, vol * 0.4, 0.7, len, 0.06, o)); osc('sine', f * 2, at, at + 0.5, strike(at, vol * 0.45, 0.15, len, 0.05, o));
    },
    brush(at, f, len, vol) {   // brushes slapping the snare: a soft, short hiss
      hiss(at, at + 0.25, filter('bandpass', 2500, 0.7, fade(at, vol, 0.004, 0.15, out(-0.3))));
    },
    swish(at, f, len, vol) {   // a brush stirred round the snare: a hiss that swells and fades over its length
      const g = quiet(out(-0.3)); g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(vol, at + len * 0.6); g.gain.exponentialRampToValueAtTime(0.0001, at + len * 1.1);
      hiss(at, at + len * 1.15, filter('bandpass', 3000, 0.6, g));
    },
    ride(at, f, len, vol) {   // a ride cymbal played softly: an inharmonic ping and a little wash
      const o = out(0.35); [[1, 0.5], [1.47, 0.3], [2.09, 0.2]].forEach(([r, a]) => osc('sine', f * r, at, at + 0.7, fade(at, vol * a, 0.001, 0.5, o)));
      hiss(at, at + 0.9, filter('highpass', 3500, 0, fade(at, vol, 0.002, 0.6, o)));
    }
  };
  // a record as a file: rendered offline twice round with the second kept — its start carries the first's echoes, so it loops
  // on without a seam — at peak (the record's own, or 0.5), as 16-bit stereo WAV in base64
  async function render(id, peak) {
    const rec = SCORES[id], sc = score(rec), step = 60 / rec.bpm / 2, L = (sc.len + (rec.tail ?? 2)) * step, sr = 44100, n = Math.round(L * sr);
    const oc = new OfflineAudioContext(2, n * 2, sr);
    kept = {}; chain(oc, rec);
    for (let k = 0; k < 2; k++) sc.ev.forEach((e) => note(k * L + e[0] * step, e[1], e[2], e[3], e[4], step));
    const buf = await oc.startRendering();
    const ch = [0, 1].map((c) => buf.getChannelData(c).subarray(n, 2 * n));
    let top = 0; ch.forEach((d) => { for (let i = 0; i < d.length; i++) top = Math.max(top, Math.abs(d[i])); });
    const g = (peak || rec.peak || 0.5) / (top || 1), bytes = new Uint8Array(44 + n * 4), v = new DataView(bytes.buffer), str = (o, t) => [...t].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
    str(0, 'RIFF'); v.setUint32(4, 36 + n * 4, true); str(8, 'WAVEfmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 2, true);
    v.setUint32(24, sr, true); v.setUint32(28, sr * 4, true); v.setUint16(32, 4, true); v.setUint16(34, 16, true); str(36, 'data'); v.setUint32(40, n * 4, true);
    for (let i = 0; i < n; i++) for (let c = 0; c < 2; c++) v.setInt16(44 + (i * 2 + c) * 2, Math.max(-32767, Math.min(32767, Math.round(ch[c][i] * g * 32767))), true);
    let b64 = ''; for (let i = 0; i < bytes.length; i += 0x8000) b64 += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return { seconds: L, top, b64: btoa(b64) };
  }
  return { SCORES, render };
})();
