'use strict';
// ---------- the eating close-up (2026-11-14, the user: the preview's 「七種吃法」 for every food and drink) ----------
// One scene for what is had (YEN.eat): the hero's own head and shoulders behind a table (no arms: the user found a swung or bent
// arm odd), the thing on the table, and only the spoon, the chopsticks, the fork, the pick, the skewer — or the thing itself, or the drink —
// coming up to the mouth. Its faces are the old eating screen's: star eyes and a drool waiting, あーん, ^ ^ chewing (もぐもぐ),
// ずるずる for noodles, ごくごく／ちゅー and ぷはー for drinks, heart eyes and hearts at the end. Three mouthfuls (or sips), and what
// is on the table goes down with each: scooped, a piece gone, bitten, the level falling.
const EATSCENE = (() => {
  const f1 = (v) => (Math.round(v * 10) / 10).toString(), R = (d) => d * Math.PI / 180;
  const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
  const N = 3, BITE = 2400, START = 350;
  // ---- the hero: HERO.head's head and shoulders, set at x 40, 280 wide; arms, eyes and mouth taken out (the faces below draw them) ----
  const BX = 40, BW = 280;
  let MX = 180, MY = 211;
  function heroArt(look) {
    const host = document.createElement('div'); host.innerHTML = HERO.head(look, 'bust');
    const svg = host.querySelector('svg'); if (!svg) return '';
    const vb = svg.getAttribute('viewBox').split(' ').map(Number), s = BW / vb[2];
    MX = BX + (1.95 - vb[0]) * s; MY = (-74.2 - vb[1]) * s;   // the mouth's middle (in the body's units: (1.95, -74.2) for every look)
    svg.querySelectorAll('.arm, .eyes, .mouth').forEach((a) => a.remove());
    return svg.outerHTML.replace('<svg ', `<svg x="${BX}" y="0" width="${BW}" height="${f1(vb[3] * s)}" `);
  }
  // ---- the faces (the old eating screen's, in its 111.5 × 100 face box; its mouth (55.75, 65) set on the hero's, 1.154 times) ----
  const EYE = { star: (x, t) => `<g transform="translate(${x} 40) rotate(${f1(Math.sin(t / 180) * 10)}) scale(${(1 + 0.08 * Math.sin(t / 120)).toFixed(3)})"><path d="M0 -12 L3.2 -3.2 L12 0 L3.2 3.2 L0 12 L-3.2 3.2 L-12 0 L-3.2 -3.2 Z" fill="#ffd34a" stroke="#f0a020" stroke-width="1.4" stroke-linejoin="round"/><circle cx="-2.6" cy="-2.6" r="1.8" fill="#fff"/></g>`,
    happy: (x) => `<path d="M${x - 8} 43 Q${x} 33 ${x + 8} 43" fill="none" stroke="#2a2730" stroke-width="3.2" stroke-linecap="round"/>`,
    heart: (x, t) => `<g transform="translate(${x} 41) scale(${(0.62 * (1 + 0.1 * Math.sin(t / 110))).toFixed(3)})"><path d="M0 14 C-9 7 -16 2 -16 -5 C-16 -10 -12 -13 -8 -13 C-4.6 -13 -2 -11 0 -8 C2 -11 4.6 -13 8 -13 C12 -13 16 -10 16 -5 C16 2 9 7 0 14 Z" fill="#f2557a"/><ellipse cx="-7" cy="-6" rx="3" ry="2" fill="#fff" fill-opacity=".7"/></g>` };
  const blush = (k) => `<ellipse cx="20" cy="70" rx="${f1(10 * k)}" ry="${f1(5 * k)}" fill="#f58aa0" fill-opacity=".5"/><ellipse cx="91.5" cy="70" rx="${f1(10 * k)}" ry="${f1(5 * k)}" fill="#f58aa0" fill-opacity=".5"/>`;
  function face(m, t, dy) {   // the mood m's eyes, cheeks and mouth at time t; bob: how far chewing nods the head
    const j = (Math.sin(t / 1000 * Math.PI * 2 * 3.2) + 1) / 2, drip = 3 + (t % 1400) / 1400 * 5;
    const art = {
      drool: EYE.star(31.8, t) + EYE.star(79.2, t) + blush(1) + `<path d="M48 62 Q55.75 73 63.5 62 Z" fill="#7a2e22"/><path d="M51 67 Q55.75 72 60.5 67 Q55.75 64.5 51 67 Z" fill="#f08a96"/><path d="M62.5 65 q2.6 ${f1(drip)} 0 ${f1(drip + 3)} q-2.6 -3.2 0 -${f1(drip + 3)} Z" fill="#a9dcf2"/>`,
      aah: EYE.star(31.8, t) + EYE.star(79.2, t) + blush(1) + '<ellipse cx="55.75" cy="66" rx="8.4" ry="8.8" fill="#7a2e22"/><path d="M50.4 70.6 Q55.75 66 61.1 70.6 Q55.75 74 50.4 70.6 Z" fill="#f08a96"/>',
      hold: EYE.happy(31.8) + EYE.happy(79.2) + blush(1.1) + '<ellipse cx="55.75" cy="66" rx="5.4" ry="4.2" fill="#e07a78"/><ellipse cx="54.4" cy="64.8" rx="1.8" ry=".9" fill="#fff" fill-opacity=".55"/>',
      chew: EYE.happy(31.8) + EYE.happy(79.2) + blush(1.15 + 0.12 * j) + `<path d="M48 ${(64 - j).toFixed(2)} q3.9 ${(1.6 + 3.4 * j).toFixed(2)} 7.75 0 q3.9 ${(1.6 + 3.4 * j).toFixed(2)} 7.75 0" fill="none" stroke="#7a2e22" stroke-width="2.4" stroke-linecap="round"/>`
        + (j > 0.55 ? '<path d="M6 60 l-5 -2 M5 66 l-6 0 M105.5 60 l5 -2 M106.5 66 l6 0" stroke="#c8642c" stroke-width="1.6" stroke-linecap="round" opacity=".8"/>' : ''),
      gulp: EYE.happy(31.8) + EYE.happy(79.2) + blush(1.1) + '<path d="M50 64 Q55.75 69 61.5 64" fill="none" stroke="#7a2e22" stroke-width="2.4" stroke-linecap="round"/>',
      sip: EYE.happy(31.8) + EYE.happy(79.2) + blush(1.15 + 0.08 * j) + '<ellipse cx="55.75" cy="66" rx="3.6" ry="3" fill="#e07a78"/>',
      puha: EYE.happy(31.8) + EYE.happy(79.2) + blush(1.1) + '<path d="M46 61 Q55.75 75 65.5 61 Z" fill="#7a2e22"/><path d="M50 66.5 Q55.75 72 61.5 66.5 Q55.75 64 50 66.5 Z" fill="#f08a96"/>',
      bliss: EYE.heart(31.8, t) + EYE.heart(79.2, t) + blush(1.1) + '<path d="M45 61 Q55.75 77 66.5 61 Z" fill="#7a2e22"/><path d="M49.5 67.5 Q55.75 73.5 62 67.5 Q55.75 64.5 49.5 67.5 Z" fill="#f08a96"/>'
    }[m] || '';
    return { art: `<g transform="translate(${f1(MX)} ${f1(MY + dy)}) scale(1.154) translate(-55.75 -65)">${art}</g>`, bob: m === 'chew' ? 1.6 * j : 0 };
  }
  const HEART = 'M10 17 C4 12 0 9 0 5 C0 2 2.4 0 5 0 C7 0 8.6 1.2 10 3 C11.4 1.2 13 0 15 0 C17.6 0 20 2 20 5 C20 9 16 12 10 17 Z';
  const hearts = (list, ms) => list.map(([w, x, y0]) => { const u = (ms - w) / 1600; if (u < 0 || u > 1) return '';
    return `<path d="${HEART}" fill="#f2708a" opacity="${(u < 0.15 ? u / 0.15 : 1 - (u - 0.15) / 0.85).toFixed(2)}" transform="translate(${f1(x + Math.sin(u * 6) * 6)} ${f1(y0 - 70 * u)}) scale(${(0.7 + 0.4 * u).toFixed(2)})"/>`; }).join('');
  const steam = (ms, spots) => `<g fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round">${spots.map(([x, y], i) => { const u = ((ms + i * 800) % 2400) / 2400;
    return `<path d="M${x} ${y} q-5 -9 0 -17 q5 -9 0 -17" opacity="${(0.55 * (u < 0.4 ? u / 0.4 : 1 - (u - 0.4) / 0.6)).toFixed(2)}" transform="translate(0 ${f1(5 - 18 * u)})"/>`; }).join('')}</g>`;
  const at = (dx = 0, dy = 0, r = 0, a = 0, b = 0) => [MX + dx, MY + dy + LEAN, r, a, b];   // at the mouth, the head leaning in (a, b: the tool's own point)
  const LEAN = 4;
  const lerp = (K, ms) => { for (let i = 1; i < K.length; i++) if (ms <= K[i][0]) { const [t0, a] = K[i - 1], [t1, b] = K[i], u = ease((ms - t0) / (t1 - t0)); return a.map((v, k) => v + ((b[k] ?? v) - v) * u); } return K[K.length - 1][1].slice(); };
  const P5 = (p) => [p[0], p[1], p[2] || 0, p[3] || 0, p[4] || 0];
  // one mouthful's times (ms): to the dish, it is taken, up, at the mouth, lips round it, out, back; chewing till CHEW
  const T = { dip: 390, take: 650, up: 920, at: 1150, hold: 1310, out: 1570, rest: 2120, chew: 2220 };

  // ======== the utensils (their own point at (0, 0), turned by the pose; what they carry drawn there) ========
  const SPOON = (load, bowl = true) => `<path d="M8 0 H56" stroke="#c9ccd4" stroke-width="5" stroke-linecap="round"/><path d="M8 -1.4 H56" stroke="#eef0f4" stroke-width="1.6" stroke-linecap="round"/>${bowl ? '<ellipse rx="13" ry="8.4" fill="#c9ccd4"/><ellipse cx="-1.6" cy="-1.2" rx="10.4" ry="5.8" fill="#e6e8ee"/>' : ''}${bowl ? load || '' : ''}`;
  const CHOPS = (load) => `${load || ''}<path d="M0 -1 L66 -37 L68 -33 L1.4 1.4 Z" fill="#d9b27c"/><path d="M3 3 L69 -27 L70 -23 L4 5 Z" fill="#c9a06a"/>`;
  const FORK = (load) => `${load || ''}<path d="M-4 -3 L12 -1 L12 3 L-4 3 Z" fill="#d6d9e0"/><path d="M-8 -2.4 H0 M-8 0 H0 M-8 2.4 H0" stroke="#c9ccd4" stroke-width="1.4" stroke-linecap="round"/><path d="M10 0 L60 -26" stroke="#c9ccd4" stroke-width="4.6" stroke-linecap="round"/><path d="M10 -1.2 L60 -27" stroke="#eef0f4" stroke-width="1.4" stroke-linecap="round"/>`;
  const PICK = (load) => `<path d="M-2 0 L44 -22" stroke="#e3c48e" stroke-width="2" stroke-linecap="round"/>${load || ''}`;
  // what a spoon or chopsticks carry: a mound in its colours, a few noodles hanging (h: how long), a piece
  const mound = (base, top, bit) => `<path d="M-12 -2 C-10.8 -13 -2 -16.8 5.2 -14 C10.8 -11.2 12.8 -5.6 10.8 -.8 Z" fill="${base}"/>${top ? `<path d="M-2 -7.6 C5.2 -15.2 12.8 -9.6 10.8 -.8 C5.2 2 -2 0 -2 -7.6 Z" fill="${top}"/>` : ''}${bit ? `<rect x="1.6" y="-10.4" width="5.6" height="4.4" rx="2" fill="${bit}"/>` : ''}`;
  const noodles = (c, h, w = 2.4) => [-3, 0, 3, 6].map((x, i) => `<path d="M${x} 1 q${i % 2 ? 3 : -3} ${f1(h * 0.3)} 0 ${f1(h * 0.55)} t0 ${f1(h * 0.45)}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round"/>`).join('');
  const PIECE = {
    chashu: '<ellipse cx="2" cy="6" rx="10" ry="6.4" fill="#c98a6a"/><ellipse cx="2" cy="6" rx="6.4" ry="3.8" fill="none" stroke="#efc2a8" stroke-width="1.6"/>',
    kamaboko: '<path d="M-7 9 Q2 -2 11 9 Z" fill="#fbf6f8"/><path d="M-7 9 Q2 -2 11 9" fill="none" stroke="#e86a8a" stroke-width="2.4"/>',
    beef: '<path d="M-8 3 Q2 -2 12 4 Q10 12 0 12 Q-8 10 -8 3 Z" fill="#fffaf0"/><path d="M-8 3 Q2 -3 12 3 Q8 7 0 6 Q-6 6 -8 3 Z" fill="#8a4a2a"/>',
    fish: '<path d="M-7 2 H11 V10 H-7 Z" fill="#f6efe2"/><path d="M-7 2 H11 V5 H-7 Z" fill="#8f98a6"/>',
    rice: '<ellipse cx="2" cy="6" rx="9" ry="6" fill="#fffaf0"/><ellipse cx="0" cy="4" rx="2" ry="1" fill="#ece4d2"/><ellipse cx="5" cy="7" rx="2" ry="1" fill="#ece4d2"/>',
    karaage: '<path d="M-7 6 C-8 -1 0 -3 4 -1 C10 -3 13 4 10 9 C7 14 -4 13 -7 6 Z" fill="#c47a2e"/><path d="M-3 2 q2 -2 4 0 M4 6 q2 -2 4 0" stroke="#e8a85a" stroke-width="1.4" fill="none"/>',
    pod: '<path d="M-8 6 C-6 0 6 -2 12 2 C10 8 -2 10 -8 6 Z" fill="#7fbf4a"/><circle cx="-2" cy="4.6" r="2.4" fill="#9fd468"/><circle cx="4" cy="3.6" r="2.4" fill="#9fd468"/>',
    takoyaki: '<circle cx="0" cy="0" r="9" fill="#d9944a"/><path d="M-8 -2 Q0 -9 8 -2 Q4 -6 0 -6 Q-4 -6 -8 -2 Z" fill="#5a2e18"/><path d="M-5 -4 l3 2 l3 -2 l3 2" stroke="#fff8e8" stroke-width="1.2" fill="none"/>',
    cake: '<rect x="-6" y="-14" width="11" height="10" rx="1.4" fill="#fffaf2"/><rect x="-6" y="-10" width="11" height="3" fill="#f4d27a"/><rect x="-6" y="-6" width="11" height="2" fill="#f4d27a"/>',
    berry: '<path d="M-1 -4 C-8 -6 -8 -16 -1 -18 C6 -16 6 -6 -1 -4 Z" fill="#e0303a"/><path d="M-4 -17 l3 -3 l3 3" stroke="#4f8a3e" stroke-width="1.6" fill="none"/>'
  };

  // ======== the dishes: table(k, ms, uid) — k mouthfuls gone; dips — where the utensil goes for each; the utensil and what it carries ========
  const g = (x, y, s, inner) => `<g transform="translate(${x} ${y}) scale(${s})">${inner}</g>`;
  const masked = (uid, holes, inner) => `<defs><mask id="em${uid}"><rect x="-400" y="-400" width="1200" height="1200" fill="#fff"/>${holes.map(([x, y, rx, ry]) => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="#000"/>`).join('')}</mask></defs><g mask="url(#em${uid})">${inner}</g>`;
  const SHADOW = (x, y, rx, ry) => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="#5a3a1e" opacity=".22"/>`;
  const PLATE = (x, y, rx, ry) => `${SHADOW(x + 4, y + 9, rx + 2, ry - 3)}<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="#f8f9fb"/><ellipse cx="${x}" cy="${y + 2}" rx="${f1(rx * 0.79)}" ry="${f1(ry * 0.71)}" fill="#eef0f4"/>`;
  const BOWL = (body, rim, inner, front) => ({ back: `<ellipse cx="190" cy="294" rx="96" ry="26" fill="${rim}"/><ellipse cx="190" cy="296" rx="86" ry="21" fill="${inner}"/>`,
    front: `${SHADOW(194, 350, 70, 12)}<path d="M94 294 A96 26 0 0 0 286 294 L276 322 C260 346 230 356 190 356 C150 356 120 346 104 322 Z" fill="${body}"/><path d="M94 294 A96 26 0 0 0 286 294" fill="none" stroke="${rim}" stroke-width="4"/>${front || ''}<path d="M110 302 C112 318 120 330 132 340" fill="none" stroke="#fff" stroke-opacity=".3" stroke-width="3" stroke-linecap="round"/>` });
  const strands = (n, c, w, x0 = 136, y0 = 300) => Array.from({ length: n }, (_, i) => `<path d="M${x0 + i * 9} ${y0 - (i % 2) * 3} q6 -5 12 0 t12 0 t12 0" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round"/>`).join('');
  const BOAT = '<path d="M112 296 L268 296 L258 332 L122 332 Z" fill="#e9dcc0"/><path d="M112 296 L268 296 L264 304 L116 304 Z" fill="#f4ead2"/><path d="M130 312 H252 M134 322 H248" stroke="#cdbb92" stroke-width="1" opacity=".7"/>';
  const TRAY = `${SHADOW(194, 344, 104, 10)}<path d="M96 286 H284 L294 340 H86 Z" fill="#c99a5e"/><path d="M96 286 H284 L286 294 H94 Z" fill="#d9ad72"/>`;
  const RICEBOWL = (x, y, k) => `<path d="M${x - 24} ${y} A24 8 0 0 0 ${x + 24} ${y} L${x + 18} ${y + 18} Q${x} ${y + 24} ${x - 18} ${y + 18} Z" fill="#f2efe6"/><path d="M${x - 24} ${y} A24 8 0 0 0 ${x + 24} ${y}" fill="none" stroke="#4f6f9e" stroke-width="2"/>${k ? '' : `<path d="M${x - 22} ${y} C${x - 18} ${y - 14} ${x + 18} ${y - 14} ${x + 22} ${y} Z" fill="#fffaf0"/>`}`;
  const SOUPBOWL = (x, y) => `<path d="M${x - 22} ${y} A22 7 0 0 0 ${x + 22} ${y} L${x + 16} ${y + 16} Q${x} ${y + 21} ${x - 16} ${y + 16} Z" fill="#4a1e1a"/><ellipse cx="${x}" cy="${y}" rx="22" ry="7" fill="#9a2e24"/><ellipse cx="${x}" cy="${y + 0.6}" rx="18" ry="5.4" fill="#c98a4a"/><rect x="${x - 6}" y="${y - 2}" width="5" height="3" fill="#fbf8f0"/><path d="M${x + 4} ${y} q3 -2 6 0" stroke="#3f6a3a" stroke-width="2" fill="none"/>`;
  const STEAM_BOWL = [[170, 276], [200, 272], [228, 276]], STEAM_PLATE = [[212, 286], [235, 288], [256, 292]];
  const DISH = {};
  // ---- スプーン ----
  (() => {
    const G = 'translate(35.2 6.7) scale(.86)', gp = (x, y) => [35.2 + x * 0.86, 6.7 + y * 0.86];
    const HOLES = [[238, 362, 50, 30], [184, 366, 50, 30], [124, 354, 58, 34]];
    const food = `<ellipse cx="150" cy="354" rx="62" ry="27" fill="#fbf7ee"/><path d="M96 352 C100 330 128 318 152 318 C178 318 204 332 208 352 Z" fill="#fffaf0"/>${[[118, 336], [134, 328], [150, 324], [168, 328], [184, 336], [126, 346], [146, 340], [166, 344], [192, 346], [110, 348], [140, 352], [176, 352]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="3.2" ry="1.7" fill="#e9e1cf"/>`).join('')}
      <path d="M150 356 C176 342 214 338 246 344 C274 350 290 362 278 374 C262 388 210 390 174 380 C152 374 140 366 150 356 Z" fill="#b8661e"/><path d="M160 360 C186 348 222 346 250 352 C268 356 276 364 268 372" fill="none" stroke="#d98a3a" stroke-width="4" stroke-linecap="round" opacity=".7"/>
      <rect x="200" y="352" width="16" height="11" rx="4" fill="#ef8a2e"/><rect x="236" y="360" width="14" height="10" rx="4" fill="#ef8a2e"/><path d="M222 366 l12 -2 l3 9 l-12 2 Z" fill="#f2d48a"/><path d="M174 366 l13 -1 l2 9 l-13 1 Z" fill="#f2d48a"/><path d="M252 350 q8 -4 13 2 q-4 7 -12 5 Z" fill="#6b3a22"/><path d="M190 372 q8 -4 13 2 q-4 7 -12 5 Z" fill="#6b3a22"/><path d="M90 360 q6 -6 14 -2 q6 3 2 8 q-8 4 -16 -6 Z" fill="#c8323a"/>`;
    const stains = (k) => HOLES.slice(0, k).map(([x, y, rx, ry]) => `<ellipse cx="${x}" cy="${y}" rx="${rx * 0.6}" ry="${ry * 0.45}" fill="#ecd3a8" opacity=".38"/>`).join('') + (k ? '<path d="M206 368 q22 -6 44 0" stroke="#d9a46a" stroke-width="4" stroke-linecap="round" fill="none" opacity=".5"/>' : '');
    DISH.curry = { way: 'spoon', steam: STEAM_PLATE, load: mound('#fffaf0', '#b8661e', '#ef8a2e'), dips: HOLES.map(([x, y]) => gp(x, y)),
      table: (k, ms, uid) => `${PLATE(190, 318, 114, 38)}<g transform="${G}">${stains(k)}${k < N ? masked(uid, HOLES.slice(0, k), food) : ''}</g>` };
    const ice = (syrup, uid, k) => { const holes = [[196, 246, 34, 20], [174, 268, 38, 22], [190, 290, 60, 26]];
      const dome = `<path d="M138 300 C140 250 170 232 190 232 C210 232 240 250 242 300 Z" fill="#f6f9fc"/><path d="M146 272 C156 246 176 236 190 236 C206 236 226 248 236 274 C220 264 200 268 190 264 C178 268 160 264 146 272 Z" fill="${syrup}" opacity=".88"/><path d="M160 262 l2 10 M214 260 l-2 12 M190 264 l0 9" stroke="${syrup}" stroke-width="3" stroke-linecap="round" opacity=".8"/>${[[152, 286], [172, 280], [204, 286], [226, 284], [188, 292]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.4" fill="#e2ebf4"/>`).join('')}<path d="M164 254 q14 -10 30 -6" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round" opacity=".8"/>`;
      return `${SHADOW(194, 348, 40, 7)}<ellipse cx="190" cy="346" rx="30" ry="7" fill="#d9eef7"/><rect x="185" y="328" width="10" height="18" fill="#cfe8f4"/><ellipse cx="190" cy="304" rx="${k < N ? 46 : 44}" ry="6" fill="${syrup}" opacity="${k ? 0.45 : 0}"/>${k < N ? masked(uid, holes.slice(0, k), dome) : ''}<path d="M136 300 Q140 328 190 330 Q240 328 244 300 Z" fill="#d9eef7" fill-opacity=".7" stroke="#bfe0ee" stroke-width="1.4"/><path d="M146 306 q4 14 18 18" stroke="#fff" stroke-width="2" fill="none" opacity=".7" stroke-linecap="round"/>`; };
    const kori = (syrup) => ({ way: 'spoon', load: mound('#f6f9fc', syrup), dips: [[196, 246], [174, 268], [190, 290]], table: (k, ms, uid) => ice(syrup, uid, k) });
    DISH.kakigori = kori('#e8475a'); DISH.lemonkori = kori('#f2d23a');
    DISH.jagabata = { way: 'spoon', steam: [[176, 278], [204, 274]], load: mound('#f4d27a', '#fff1a8'), dips: [[214, 300], [172, 302], [190, 300]],
      table: (k, ms, uid) => `${SHADOW(194, 336, 80, 8)}${BOAT}${k < N ? masked(uid, [[214, 300, 26, 18], [172, 302, 28, 20], [190, 300, 56, 28]].slice(0, k), '<ellipse cx="190" cy="304" rx="46" ry="22" fill="#d9a64a"/><ellipse cx="190" cy="300" rx="42" ry="18" fill="#f4d27a"/><path d="M160 300 L220 300 M190 286 L190 314" stroke="#d9a64a" stroke-width="2"/><path d="M180 290 h20 l-2 14 h-16 Z" fill="#fff1a8"/><path d="M178 304 q12 6 24 0" fill="#fff1a8" opacity=".7"/>' + [[170, 296], [210, 306], [196, 312]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1" fill="#fff"/>`).join('')) : ''}` };
  })();
  // ---- はし (noodles slurped: ずるずる; pieces) ----
  (() => {
    const ramen = BOWL('#c8433a', '#f6f2ea', '#d99a52', '<path d="M104 314 C140 334 240 334 276 314" fill="none" stroke="#fff" stroke-width="2.4" stroke-dasharray="7 5" opacity=".85"/>');
    DISH.ramen = { way: 'chop', steam: STEAM_BOWL, carry: ['noodles', 'chashu', 'noodles'], noodle: ['#f2d98a', 2.4], dips: [[180, 300], [226, 300], [176, 298]],
      table: (k) => `${ramen.back}<path d="M240 298 L243 262 L266 266 L261 300 Z" fill="#2f3d2a"/>${strands(k < 1 ? 8 : k < 3 ? 4 : 0, '#f2d98a', 2.6)}${k < 2 ? '<ellipse cx="222" cy="302" rx="17" ry="9" fill="#c98a6a"/><ellipse cx="222" cy="302" rx="11" ry="5.6" fill="none" stroke="#efc2a8" stroke-width="1.8"/>' : ''}${k < 3 ? '<ellipse cx="196" cy="290" rx="11" ry="7" fill="#fbf8f0"/><ellipse cx="196.6" cy="289.4" rx="5.6" ry="3.6" fill="#f2a63a"/>' : ''}<ellipse cx="154" cy="292" rx="10" ry="5.4" fill="#fbf6f8"/><path d="M150 292 q4 -3 7 0 q-3 3 -5 1" fill="none" stroke="#e86a8a" stroke-width="1.4"/>${[[170, 286], [184, 298], [206, 304], [146, 302], [230, 288]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2.2" fill="#7fbf5a"/>`).join('')}${ramen.front}` };
    const udon = BOWL('#2f4a7a', '#f2efe6', '#e8c070', '<path d="M104 314 C140 334 240 334 276 314" fill="none" stroke="#f2efe6" stroke-width="2" opacity=".7"/>');
    DISH.udon = { way: 'chop', steam: STEAM_BOWL, carry: ['noodles', 'kamaboko', 'noodles'], noodle: ['#f8f3e3', 4], dips: [[180, 300], [224, 296], [176, 298]],
      table: (k) => `${udon.back}${strands(k < 1 ? 6 : k < 3 ? 3 : 0, '#f8f3e3', 4.4, 140, 302)}${k < 2 ? '<path d="M210 300 Q222 286 234 300 Z" fill="#fbf6f8"/><path d="M210 300 Q222 286 234 300" fill="none" stroke="#e86a8a" stroke-width="2.6"/>' : ''}${[[166, 288], [190, 296], [212, 288], [150, 300]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2.4" fill="#7fbf5a"/>`).join('')}${[[178, 292], [200, 304], [158, 296], [226, 304]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.8" fill="#f2d27a"/>`).join('')}${udon.front}` };
    DISH.yakisoba = { way: 'chop', steam: [[176, 280], [204, 276], [230, 282]], carry: ['noodles', 'noodles', 'noodles'], noodle: ['#b8763a', 2.6], dips: [[176, 308], [214, 310], [192, 312]],
      table: (k) => `${SHADOW(194, 336, 80, 8)}${BOAT}${strands([9, 6, 3, 0][k], '#b8763a', 3, 128, 312)}${k < N ? [[150, 304], [206, 300], [236, 312]].map(([x, y]) => `<path d="M${x} ${y} q6 -4 12 0" stroke="#a6d47a" stroke-width="3" fill="none" stroke-linecap="round"/>`).join('') + [[172, 300], [196, 316], [222, 306]].map(([x, y]) => `<rect x="${x}" y="${y}" width="4" height="2" fill="#e04a5a"/>`).join('') + [[160, 312], [184, 298], [214, 318], [240, 302]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.2" fill="#3f8a3a"/>`).join('') : ''}` };
    const don = (k, uid) => `${SHADOW(194, 350, 64, 10)}<ellipse cx="190" cy="292" rx="82" ry="22" fill="#2a1a18"/><ellipse cx="190" cy="294" rx="74" ry="18" fill="#fffaf0"/>${k < N ? masked(uid, [[214, 292, 34, 16], [174, 294, 34, 16], [190, 292, 84, 24]].slice(0, k), '<path d="M126 294 C140 280 240 280 254 294 C240 302 140 302 126 294 Z" fill="#8a4a2a"/><path d="M140 290 q10 -6 20 0 M170 286 q10 -6 22 0 M206 288 q10 -6 22 0 M232 292 q6 -4 12 0" stroke="#b8763a" stroke-width="2" fill="none"/><path d="M150 296 q8 -3 16 0 M196 296 q8 -3 16 0" stroke="#f2e6c2" stroke-width="2" fill="none"/><path d="M236 286 q6 -4 10 2 q-6 3 -10 -2 Z" fill="#e04a5a"/>') : ''}<path d="M108 292 A82 22 0 0 0 272 292 L262 330 C250 348 224 356 190 356 C156 356 130 348 118 330 Z" fill="#3a2220"/><path d="M108 292 A82 22 0 0 0 272 292" fill="none" stroke="#c9a24a" stroke-width="2"/><path d="M124 312 C150 330 230 330 256 312" fill="none" stroke="#c9a24a" stroke-width="1.4" opacity=".7"/>`;
    DISH.gyudon = { way: 'chop', steam: STEAM_BOWL, carry: ['beef', 'beef', 'beef'], dips: [[214, 290], [174, 292], [194, 292]], table: (k, ms, uid) => don(k, uid) };
    DISH.sakana = { way: 'chop', steam: [[214, 278], [238, 282]], carry: ['fish', 'rice', 'fish'], dips: [[216, 298], [132, 306], [244, 296]],
      table: (k, ms, uid) => `${TRAY}<path d="M188 290 H286 L280 312 H184 Z" fill="#f2efe6"/>${k < N ? masked(uid, [[214, 298, 18, 12], [0, 0, 0, 0], [250, 298, 60, 20]].slice(0, k), '<path d="M196 300 C206 290 252 288 262 296 L276 290 L274 306 L262 302 C250 310 206 310 196 300 Z" fill="#9aa4b2"/><path d="M204 298 C214 294 244 293 256 297" stroke="#5a6070" stroke-width="2" fill="none"/><path d="M214 296 l6 6 M230 295 l6 6 M246 296 l6 6" stroke="#3a3328" stroke-width="2" opacity=".5"/>') : ''}<path d="M196 312 q8 -6 16 0 Z" fill="#fbf8f0"/><path d="M262 308 l10 -4 l2 6 Z" fill="#f2d23a"/>${RICEBOWL(132, 304, k >= 2)}${SOUPBOWL(176, 318)}` };
    const kara = (n, x0, y0) => [[0, 0], [22, -4], [42, 2], [12, 12], [32, 14]].slice(0, n).map(([x, y]) => `<g transform="translate(${x0 + x} ${y0 + y})"><path d="M-12 4 C-14 -6 -2 -10 4 -7 C14 -10 18 2 14 9 C9 16 -8 15 -12 4 Z" fill="#c47a2e"/><path d="M-6 -2 q3 -3 6 0 M4 4 q3 -3 6 0" stroke="#e8a85a" stroke-width="1.6" fill="none"/></g>`).join('');
    DISH.karaage = { way: 'chop', steam: [[214, 278], [238, 282]], carry: ['karaage', 'rice', 'karaage'], dips: [[236, 296], [132, 306], [214, 300]],
      table: (k) => `${TRAY}<ellipse cx="232" cy="300" rx="56" ry="16" fill="#f8f9fb"/><path d="M196 300 q10 -10 22 -2 q8 -8 16 2" stroke="#a6d47a" stroke-width="3" fill="none"/>${kara([5, 3, 3, 0][k], 214, 292)}<path d="M266 296 l10 -6 l4 8 Z" fill="#f2d23a"/>${RICEBOWL(132, 304, k >= 2)}${SOUPBOWL(176, 320)}` };
    DISH.karaage2 = { way: 'chop', steam: STEAM_PLATE, carry: ['karaage', 'karaage', 'karaage'], dips: [[176, 312], [210, 310], [194, 316]],
      table: (k) => `${PLATE(190, 318, 100, 32)}${kara([5, 3, 1, 0][k], 168, 306)}<path d="M240 312 l12 -8 l4 10 Z" fill="#f2d23a"/><circle cx="148" cy="320" r="4" fill="#5fae4a"/>` };
    DISH.edamame = { way: 'chop', carry: ['pod', 'pod', 'pod'], dips: [[176, 300], [204, 298], [190, 304]],
      table: (k) => `${SHADOW(194, 344, 60, 8)}<ellipse cx="190" cy="298" rx="66" ry="18" fill="#f2efe6"/><ellipse cx="190" cy="300" rx="58" ry="14" fill="#e2ddd0"/>${[[150, 296, -10], [168, 290, 14], [190, 294, -4], [212, 290, 20], [228, 298, -14], [160, 304, 8], [182, 304, -18], [204, 304, 10], [222, 306, -6], [190, 286, 0]].slice(0, [10, 7, 4, 0][k]).map(([x, y, r]) => `<g transform="translate(${x} ${y}) rotate(${r})"><path d="M-12 2 C-9 -6 9 -7 13 0 C10 7 -6 8 -12 2 Z" fill="#7fbf4a"/><circle cx="-4" cy="0" r="3.4" fill="#9fd468"/><circle cx="4" cy="-1" r="3.4" fill="#9fd468"/></g>`).join('')}<path d="M124 298 A66 18 0 0 0 256 298 L248 322 Q190 340 132 322 Z" fill="#f2efe6"/><path d="M134 314 Q190 330 246 314" fill="none" stroke="#4f6f9e" stroke-width="2"/>` };
  })();
  // ---- フォーク・つまようじ ----
  DISH.cake = { way: 'fork', carry: ['cake', 'cake', 'berry'], dips: [[159, 288], [185, 288], [198, 262]],
    table: (k) => { const L = [150, 176, 202][k], RX = 226;
      const slab = k < N ? `<path d="M${RX} 280 L${RX + 14} 270 L${RX + 14} 306 L${RX} 316 Z" fill="#e2be62"/><path d="M${L} 280 H${RX} L${RX + 14} 270 H${L + 14} Z" fill="#fffdf8"/><rect x="${L}" y="280" width="${RX - L}" height="8" fill="#fffaf2"/><rect x="${L}" y="288" width="${RX - L}" height="10" fill="#f4d27a"/><rect x="${L}" y="298" width="${RX - L}" height="6" fill="#fff4ea"/>${[L + 6, L + 18, L + 30, L + 42, L + 54, L + 66].filter((x) => x < RX - 4).map((x) => `<ellipse cx="${x}" cy="301" rx="3" ry="1.8" fill="#e85a6a"/>`).join('')}<rect x="${L}" y="304" width="${RX - L}" height="12" fill="#f0c86a"/><path d="M${L} 316 H${RX}" stroke="#d9a845" stroke-width="1.6"/>
        ${k < 2 ? '<ellipse cx="203" cy="272" rx="10" ry="4" fill="#fffaf2"/><path d="M203 271 C195 270 194 258 203 255 C212 258 211 270 203 271 Z" fill="#e0303a"/><path d="M199 256 l4 -4 l4 4" stroke="#4f8a3e" stroke-width="1.8" fill="none"/>' : ''}` : '<path d="M196 312 q10 -3 20 0" stroke="#fffaf2" stroke-width="3" stroke-linecap="round" opacity=".8"/><g fill="#f0c86a" opacity=".7"><circle cx="200" cy="314" r="1.6"/><circle cx="214" cy="318" r="1.2"/></g>';
      return `${SHADOW(196, 324, 78, 18)}<ellipse cx="192" cy="314" rx="76" ry="23" fill="#fbfbfd"/><ellipse cx="192" cy="314" rx="66" ry="18" fill="none" stroke="#e6c35a" stroke-width="1.4" opacity=".7"/>${slab}`; } };
  DISH.takoyaki = { way: 'pick', steam: [[176, 280], [204, 276], [230, 282]], carry: ['takoyaki', 'takoyaki', 'takoyaki'], dips: [[160, 304], [204, 302], [226, 312]],
    table: (k) => `${SHADOW(194, 336, 80, 8)}${BOAT}${[[150, 306], [176, 302], [202, 304], [228, 306], [164, 318], [214, 318]].slice([0, 2, 4, 6][k]).map(([x, y]) => `<g transform="translate(${x} ${y})"><circle r="12" fill="#d9944a"/><path d="M-11 -2 Q0 -12 11 -2 Q6 -8 0 -8 Q-6 -8 -11 -2 Z" fill="#5a2e18"/><path d="M-7 -6 l3 3 l3 -3 l3 3 l3 -3" stroke="#fff8e8" stroke-width="1.4" fill="none"/><circle cx="-3" cy="-9" r="1" fill="#3f8a3a"/></g>`).join('')}` };
  // ---- くし: the skewer itself comes up, the piece at its tip pulled off at each bite, the bare stick left ----
  const KUSHI = { yakitori: ['chicken', 'negi', 'chicken'], gyukushi: ['beef', 'beef', 'beef'], ichigoame: ['ichigo', 'ichigo', 'ichigo'], budouame: ['grape', 'grape', 'grape'] };
  const KX = [10, 31, 52];
  const KPIECE = {
    chicken: (x) => `<rect x="${x - 8.5}" y="-8" width="17" height="16" rx="5" fill="#a9612f"/><path d="M${x - 6} -4 q3 -2 6 0 M${x - 2} 3 q3 -2 6 0" stroke="#6b3a1a" stroke-width="1.4" fill="none" opacity=".7"/><path d="M${x - 6} -6 h7" stroke="#e8a060" stroke-width="1.6" stroke-linecap="round" opacity=".8"/>`,
    negi: (x) => `<rect x="${x - 7}" y="-6.5" width="14" height="13" rx="4" fill="#ecefdc"/><rect x="${x - 7}" y="-6.5" width="3.6" height="13" rx="1.6" fill="#8fbf5a"/><rect x="${x + 3.4}" y="-6.5" width="3.6" height="13" rx="1.6" fill="#8fbf5a"/>`,
    beef: (x) => `<rect x="${x - 9.5}" y="-9" width="19" height="18" rx="4" fill="#7a3a22"/><path d="M${x - 7} -5 l5 9 M${x - 1} -6 l5 9" stroke="#4a1e10" stroke-width="1.8" opacity=".8"/><path d="M${x - 6} -7 h8" stroke="#c87a4a" stroke-width="1.6" stroke-linecap="round" opacity=".8"/><circle cx="${x + 5}" cy="4" r=".9" fill="#fff"/><circle cx="${x - 4}" cy="5" r=".9" fill="#2a1a10"/>`,
    ichigo: (x) => `<path d="M${x + 9} 0 C${x + 7} -9 ${x - 5} -10 ${x - 8} -3 C${x - 10} 3 ${x - 4} 8 ${x + 9} 0 Z" fill="#e0303a"/><path d="M${x - 8} -3 l-3 -2 M${x - 8} -3 l-3 2" stroke="#4f8a3e" stroke-width="1.6" stroke-linecap="round"/>${[[-2, -3], [3, -4], [1, 2]].map(([a, b]) => `<circle cx="${x + a}" cy="${b}" r=".8" fill="#ffd34a"/>`).join('')}<ellipse cx="${x - 1}" cy="-5" rx="4" ry="1.6" fill="#fff" opacity=".6"/>`,
    grape: (x) => `<circle cx="${x}" cy="0" r="8" fill="#6a3a8a"/><circle cx="${x}" cy="0" r="8" fill="none" stroke="#c9a6e0" stroke-width="1" opacity=".6"/><ellipse cx="${x - 3}" cy="-3.4" rx="3" ry="1.8" fill="#fff" opacity=".65"/>`
  };
  const skewer = (kinds, gone) => `<path d="M-8 0 L-2 -1.6 H70 V1.6 H-2 Z" fill="#e3c48e"/>${KX.map((x, i) => (i >= gone ? KPIECE[kinds[i]](x) : '')).join('')}`;
  const KDISH = (tare) => `<path d="M112 300 Q110 292 120 292 H262 Q272 292 270 300 L276 326 Q278 334 268 334 H116 Q106 334 106 326 Z" fill="#eef2f6"/><path d="M120 300 H262 L266 324 H116 Z" fill="#dfe7ef"/><path d="M118 296 H264" stroke="#4f6f9e" stroke-width="1.4" stroke-dasharray="4 3"/>${tare ? '<path d="M150 318 q20 -6 44 -2" stroke="#8a4a22" stroke-width="3" stroke-linecap="round" fill="none" opacity=".45"/>' : ''}`;
  // ---- かぶりつき: the thing itself (its picture) comes up and is bitten, teeth marks round each bite; sticks too ----
  const BITES = [[30, 34, 13], [50, 28, 14], [70, 34, 13]];   // in its picture's 100 × 100, round the top
  const bitten = (pic, k, uid) => (k >= N ? '' : `<defs><mask id="eb${uid}"><rect width="100" height="100" fill="#fff"/>${BITES.slice(0, k).map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#000"/>${[-1, 0, 1].map((s) => `<circle cx="${f1(x + s * 5)}" cy="${f1(y + r - 1)}" r="2.6" fill="#000"/>`).join('')}`).join('')}</mask></defs><g mask="url(#eb${uid})">${pic}</g>`);
  // ======== the drinks: a vessel in its own units (its base at (0, 0)), its level shown where it can be seen ========
  const surf = (level, rot, top) => -top * level * Math.cos(R(rot));   // a level surface through the upright one's middle
  const liquid = (uid, shape, level, rot, top, c, o = 0.95) => `<defs><clipPath id="ec${uid}"><path d="${shape}"/></clipPath></defs><g clip-path="url(#ec${uid})"><g transform="rotate(${f1(-rot)})"><rect x="-200" y="${f1(surf(level, rot, top))}" width="400" height="300" fill="${c}" opacity="${o}"/><rect x="-200" y="${f1(surf(level, rot, top))}" width="400" height="2.4" fill="#fff" opacity=".7"/></g></g>`;
  const VESSEL = {
    can: (o) => ({ anchor: [-8, -66], tilt: [-50, -66, -82], draw: () => `<rect x="-16" y="-64" width="32" height="64" rx="4" fill="${o.c}"/><path d="M-16 -40 C-6 -46 6 -34 16 -40 V-30 C6 -24 -6 -36 -16 -30 Z" fill="${o.band}"/><text x="0" y="-12" font-size="8" text-anchor="middle" fill="${o.ink}" font-family="Zen Maru Gothic, sans-serif" font-weight="700">${o.word}</text><ellipse cx="0" cy="-64" rx="16" ry="4" fill="#c9ccd4"/><ellipse cx="2" cy="-64" rx="5" ry="1.6" fill="#9aa0aa"/><path d="M-12 -58 V-6" stroke="#fff" stroke-opacity=".35" stroke-width="3" stroke-linecap="round"/>` }),
    pet: () => { const sh = 'M-13 0 Q-14 0 -14 -4 V-60 Q-14 -72 -6 -78 V-90 H6 V-78 Q14 -72 14 -60 V-4 Q14 0 13 0 Z';
      return { anchor: [0, -98], tilt: [-56, -70, -86], draw: (lv, rot, uid) => `<path d="${sh}" fill="#e6f4fb" fill-opacity=".4"/>${liquid(uid, sh, lv, rot, 80, '#cfeaf7', 0.9)}<path d="${sh}" fill="none" stroke="#a9d2e6" stroke-width="1.4"/><rect x="-7" y="-98" width="14" height="9" rx="2" fill="#3f7ac8"/><rect x="-14" y="-46" width="28" height="16" fill="#3f9a8c" opacity=".85"/><text x="0" y="-35" font-size="8" text-anchor="middle" fill="#fff" font-family="Zen Maru Gothic, sans-serif" font-weight="700">みず</text><path d="M-9 -66 V-52" stroke="#fff" stroke-width="2.4" stroke-linecap="round" opacity=".7"/>` }; },
    milk: (o) => { const sh = 'M-14 0 Q-16 0 -16 -4 V-38 Q-16 -46 -10 -52 V-62 H10 V-52 Q16 -46 16 -38 V-4 Q16 0 14 0 Z';
      return { anchor: [0, -66], tilt: [-60, -76, -92], draw: (lv, rot, uid) => `<path d="${sh}" fill="#eef6fa" fill-opacity=".45"/>${liquid(uid, sh, lv, rot, 58, o.c, 0.97)}<path d="${sh}" fill="none" stroke="#c9dde8" stroke-width="1.6"/><rect x="-11" y="-68" width="22" height="6" rx="2" fill="#fbf8f0"/><rect x="-11" y="-68" width="22" height="2" fill="${o.cap}"/><rect x="-16" y="-30" width="32" height="12" fill="${o.cap}" opacity=".85"/><text x="0" y="-21" font-size="7" text-anchor="middle" fill="#fff" font-family="Zen Maru Gothic, sans-serif" font-weight="700">${o.word}</text><path d="M-11 -44 V-8" stroke="#fff" stroke-width="2.4" stroke-linecap="round" opacity=".7"/>` }; },
    ramune: () => { const sh = 'M-15 0 Q-17 0 -17 -4 V-44 Q-17 -52 -10 -58 L-8 -64 Q-12 -68 -12 -74 Q-12 -80 -7 -84 V-96 H7 V-84 Q12 -80 12 -74 Q12 -68 8 -64 L10 -58 Q17 -52 17 -44 V-4 Q17 0 15 0 Z';
      return { anchor: [0, -98], tilt: [-52, -66, -84], draw: (lv, rot, uid) => `<path d="${sh}" fill="#bfe3f2" fill-opacity=".35"/>${liquid(uid, sh, lv, rot, 80, '#d8f0fa')}<circle cx="0" cy="-73" r="6.4" fill="#e3f4fb" stroke="#9fd2e8" stroke-width="1"/><circle cx="-2" cy="-75" r="2" fill="#fff"/><path d="${sh}" fill="none" stroke="#8fc7e0" stroke-width="1.6"/><rect x="-8" y="-100" width="16" height="7" rx="2" fill="#3f7ac8"/><rect x="-15" y="-40" width="30" height="16" rx="2" fill="#3f7ac8" opacity=".85"/><text x="0" y="-28.6" font-size="9" text-anchor="middle" fill="#fff" font-family="Zen Maru Gothic, sans-serif" font-weight="700">ラムネ</text><path d="M-12 -30 V-8" stroke="#fff" stroke-opacity=".7" stroke-width="2.4" stroke-linecap="round"/>` }; },
    glass: (o) => { const sh = 'M-16 0 L-20 -64 H20 L16 0 Z';
      return { anchor: [-17, -66], tilt: [-30, -44, -60], draw: (lv, rot, uid) => `<path d="${sh}" fill="#fff" fill-opacity=".28"/>${liquid(uid, sh, lv, rot, 56, o.c, 0.9)}${lv > 0.2 ? `<rect x="-10" y="${f1(surf(lv, 0, 56) + 4)}" width="9" height="8" rx="2" fill="#f2fbff" opacity=".75"/><rect x="2" y="${f1(surf(lv, 0, 56) + 8)}" width="9" height="8" rx="2" fill="#f2fbff" opacity=".75"/>` : ''}<path d="${sh}" fill="none" stroke="#cfe6f2" stroke-width="1.8"/><path d="M-15 -8 L-18 -56" stroke="#fff" stroke-opacity=".6" stroke-width="2" stroke-linecap="round"/>` }; },
    straw: (o) => { const sh = 'M-20.5 -2 L-25 -82 H25 L20.5 -2 Z';
      return { anchor: [-16, -114], tilt: [0, 0, 0], straw: true, draw: (lv, rot, uid, t) => { const ys = -2 - 76 * lv, ic = Math.max(ys, -16);
        const bubbles = lv > 0.02 ? [[-12, 0], [4, 0.33], [12, 0.66], [-4, 0.5]].map(([x, s]) => { const u = (t / 1400 + s) % 1, y = -4 + (ys + 6 + 4) * u; return y > ys + 3 ? `<circle cx="${x}" cy="${f1(y)}" r="1.4" fill="#fff" opacity=".8"/>` : ''; }).join('') : '';
        return `<path d="M-22 0 L-27 -84 H27 L22 0 Z" fill="#fff" fill-opacity=".28"/><defs><clipPath id="ec${uid}"><path d="${sh}"/></clipPath></defs><g clip-path="url(#ec${uid})"><rect x="-30" y="${f1(ys)}" width="60" height="90" fill="${o.c}"/><rect x="-30" y="${f1(ys)}" width="60" height="3" fill="#fff" opacity=".35"/>${lv > 0.15 ? `<rect x="-16" y="${f1(ys + 4)}" width="11" height="10" rx="2" fill="#f2fbff" opacity=".7"/><rect x="6" y="${f1(ys + 8)}" width="10" height="9" rx="2" fill="#f2fbff" opacity=".7"/>` : ''}${bubbles}</g>
          <path d="M8 -20 L-16 -114" stroke="#fff" stroke-width="5" stroke-linecap="round"/><path d="M8 -20 L-16 -114" stroke="${o.straw}" stroke-width="5" stroke-dasharray="6 6"/>
          ${o.ice ? `<circle cx="0" cy="${f1(ic - 8)}" r="15" fill="#fffdf5"/><path d="M-13 ${f1(ic - 4)} q4 6 7 0 q4 7 8 0 q4 6 8 0" fill="#fffdf5"/><circle cx="7" cy="${f1(ic - 22)}" r="4.4" fill="#d8303a"/><path d="M7 ${f1(ic - 26)} q2 -6 7 -8" stroke="#6b3a1a" stroke-width="1.2" fill="none"/>` : '<path d="M14 -84 a12 12 0 0 1 22 4 Z" fill="#f5a030"/><path d="M17 -82 a9 9 0 0 1 16 3" fill="none" stroke="#ffd27a" stroke-width="1.6"/>'}
          <path d="M-22 0 L-27 -84 H27 L22 0 Z" fill="none" stroke="#cfe6f2" stroke-width="1.8"/><path d="M-21 -10 L-24.6 -76" stroke="#fff" stroke-opacity=".6" stroke-width="2" stroke-linecap="round"/>`; } }; },
    cup: (o) => ({ anchor: [-17, -30], tilt: [-24, -34, -46], s: 1.4, draw: (lv) => `${o.handle ? '<path d="M17 -24 C30 -24 30 -8 16 -8" fill="none" stroke="#f6f4ee" stroke-width="5"/>' : ''}<path d="M-19 -30 L-15 -2 Q0 4 15 -2 L19 -30 Z" fill="${o.body}"/><ellipse cx="0" cy="-30" rx="19" ry="5" fill="${o.rim}"/><ellipse cx="0" cy="-29" rx="15.6" ry="3.6" fill="${o.inner}"/>${lv > 0.04 ? `<ellipse cx="0" cy="${f1(-29 + 3 * (1 - lv))}" rx="${f1(15.6 - 2.4 * (1 - lv))}" ry="${f1(3.6 - 1.4 * (1 - lv))}" fill="${o.c}"/>${lv > 0.4 ? o.bits || '' : ''}` : ''}<path d="M-14 -24 L-11 -6" stroke="#fff" stroke-opacity=".4" stroke-width="2.4" stroke-linecap="round"/>` })
  };
  const DRINK = {
    cola: ['tip', VESSEL.can({ c: '#d8303a', band: '#fff', ink: '#fff', word: 'コーラ' })], coffee: ['tip', VESSEL.can({ c: '#f2e6cf', band: '#7a4a2a', ink: '#7a4a2a', word: 'コーヒー' })],
    water: ['tip', VESSEL.pet()], ramune: ['tip', VESSEL.ramune()],
    milk: ['tip', VESSEL.milk({ c: '#fbfbf6', cap: '#3f7ac8', word: '牛乳' })], coffeemilk: ['tip', VESSEL.milk({ c: '#d6a77a', cap: '#8a4a2a', word: 'コーヒー' })], fruitmilk: ['tip', VESSEL.milk({ c: '#f7e3a8', cap: '#e8792a', word: 'フルーツ' })],
    oolong: ['tip', VESSEL.glass({ c: '#b8743a' })],
    soda: ['straw', VESSEL.straw({ c: '#5fd08a', straw: '#e0464a', ice: true })], juice: ['straw', VESSEL.straw({ c: '#f5a030', straw: '#3f9a8c' })],
    kohi: ['cup', VESSEL.cup({ body: '#f6f4ee', rim: '#fbfaf6', inner: '#e4ded2', c: '#5a3418', handle: true })], ocha: ['cup', VESSEL.cup({ body: '#a9845e', rim: '#c9a47a', inner: '#8a6a48', c: '#9cc46a' })],
    miso: ['cup', VESSEL.cup({ body: '#4a1e1a', rim: '#9a2e24', inner: '#6a2a22', c: '#c98a4a', bits: '<rect x="-7" y="-31" width="5" height="3" fill="#fbf8f0"/><path d="M3 -30 q3 -2 6 0" stroke="#3f6a3a" stroke-width="2" fill="none"/>' })]
  };

  // ======== a mouthful (or a sip) at ms into it: the pose, what is carried, the mood and the word ========
  function plan(it, pic, bg) {
    const id = it[0], d = DISH[id], dr = DRINK[id];
    if (dr) {   // a drink: up to the mouth and tipped (more each sip), or slid in to its straw
      const [way, v] = dr, REST = way === 'straw' ? [214, 330, 0] : [MX + 50, 330, 0];
      const AT = (n) => (v.straw ? [MX - v.anchor[0], MY - v.anchor[1] + LEAN + 2, 0] : (() => { const r = v.tilt[n], [ax, ay] = v.anchor.map((a) => a * (v.s || 1));
        return [MX - (ax * Math.cos(R(r)) - ay * Math.sin(R(r))), MY + LEAN + 1 - (ax * Math.sin(R(r)) + ay * Math.cos(R(r))), r]; })());
      return { kind: 'drink', word: way === 'straw' ? 'ちゅー' : 'ごくごく', table: () => (way === 'cup' && id === 'kohi' ? `${SHADOW(MX + 54, 337, 44, 6)}<ellipse cx="${f1(MX + 50)}" cy="331" rx="44" ry="10" fill="#f6f4ee"/><ellipse cx="${f1(MX + 50)}" cy="330" rx="30" ry="6" fill="#e8e4da"/>` : way === 'straw' ? '<ellipse cx="200" cy="332" rx="34" ry="7" fill="#c9a06a"/>' : SHADOW(MX + 52, 332, 24, 5)),
        poses: (n) => [[0, REST], [560, AT(n)], [1760, AT(n)], [2220, REST]],
        tool: (p, st, uid) => `<g transform="translate(${f1(p[0])} ${f1(p[1])}) rotate(${f1(p[2])})${v.s ? ` scale(${v.s})` : ''}">${v.draw(st.level, p[2], uid, st.t)}</g>` };
    }
    if (d) {   // on the table, the utensil going to and fro
      const util = { spoon: SPOON, chop: CHOPS, fork: FORK, pick: PICK }[d.way];
      const REST = { spoon: [258, 332, -38], chop: [270, 284, 8], fork: [246, 310, 4], pick: [256, 304, -20] }[d.way];
      const slurp = (n) => d.way === 'chop' && d.carry[n] === 'noodles';
      const poses = (n) => { const [x, y] = d.dips[n], hold = slurp(n) ? 1650 : T.hold, tip = { spoon: [30, 1, 2], chop: [-8, 2, 4], fork: [-14, 1, 3], pick: [-24, 0, 4] }[d.way];
        return [[0, REST], [T.dip, [x, y - 2, d.way === 'spoon' ? -46 : d.way === 'chop' ? 14 : d.way === 'fork' ? 26 : 10]], [T.take, [x, y - 6, d.way === 'spoon' ? -40 : 10]], [T.up, [MX + 34, MY + 46, 4]],
          [T.at, at(tip[1], tip[2], tip[0])], [hold, at(tip[1], tip[2], tip[0])], [hold + 260, [MX + 30, MY + 34, 6]], [hold + 810, REST]]; };
      const carried = (n, st) => {
        if (d.way === 'spoon') return d.load;
        const c = d.carry[n];
        if (c === 'noodles') return noodles(d.noodle[0], 34 * (1 - (st.slurp || 0)), d.noodle[1]);
        return d.way === 'pick' ? `<g transform="translate(-6 3)">${PIECE[c]}</g>` : PIECE[c];
      };
      return { kind: 'eat', slurp, table: d.table, steam: d.steam, poses,
        tool: (p, st) => `<g transform="translate(${f1(p[0])} ${f1(p[1])}) rotate(${f1(p[2])})">${util(st.load ? carried(st.n, st) : '', st.bowl)}</g>` };
    }
    // the thing itself, bitten
    if (KUSHI[id]) {   // a skewer: a piece pulled off at each bite
      const REST = [194, 310, -6, 31, 0];
      return { kind: 'bite', table: () => KDISH(id === 'yakitori' || id === 'gyukushi'),
        poses: (n) => [[0, REST], [500, [212, 262, 6, KX[n], 0]], [T.at, at(-1, 2, 16, KX[n])], [T.hold, at(-1, 2, 16, KX[n])], [1650, [MX + 18, MY + 30, 14, KX[n], 0]], [2200, REST]],
        tool: (p, st) => `<g transform="translate(${f1(p[0])} ${f1(p[1])}) rotate(${f1(p[2])}) scale(1.4) translate(${f1(-p[3])} 0)">${skewer(KUSHI[id], st.taken)}</g>` };
    }
    const REST = [MX - 50 + 60, 300, 0, 50, 70];
    return { kind: 'bite', table: () => (OUTDOOR.includes(bg) ? `${SHADOW(196, 330, 62, 12)}<path d="M128 314 L240 300 L262 328 L146 344 Z" fill="#f4ead2"/><path d="M128 314 L262 328 M240 300 L146 344" stroke="#e2d4b4" stroke-width="1.2"/>`   // outdoors: on its paper
        : `${SHADOW(194, 326, 66, 18)}<ellipse cx="190" cy="318" rx="64" ry="20" fill="#fbf7ee"/><ellipse cx="190" cy="318" rx="54" ry="15" fill="none" stroke="#e8dcc4" stroke-width="1.4"/>`),
      poses: (n) => { const [bx, by] = BITES[n]; return [[0, REST], [600, [MX + 40, MY + 56, -6, 50, 60]], [T.at, at(0, 2, -8, bx, by + 6)], [T.hold, at(0, 2, -8, bx, by + 6)], [1650, [MX + 34, MY + 50, -4, 50, 60]], [2200, REST]]; },
      tool: (p, st, uid) => `<g transform="translate(${f1(p[0])} ${f1(p[1])}) rotate(${f1(p[2])}) scale(1.05) translate(${f1(-p[3])} ${f1(-p[4])})">${bitten(pic, st.taken, uid)}</g>` };
  }
  function stateAt(pl, ms) {   // the meal's state ms after いただきます
    if (ms < START) return { t: ms, n: 0, taken: 0, level: 1, pose: P5(pl.poses(0)[0][1]), mood: 'drool', lean: 0 };
    const t = ms - START, n = Math.floor(t / BITE), b = t % BITE;
    if (n >= N) return { t: ms, n: N, taken: N, level: 0, pose: P5(pl.poses(N - 1)[0][1]), mood: 'bliss', lean: 0, done: true };
    const st = { t: ms, n, b, pose: P5(lerp(pl.poses(n).map(([w, p]) => [w, P5(p)]), b)) };
    if (pl.kind === 'drink') {
      const u = Math.max(0, Math.min(1, (b - 560) / 1200));
      return Object.assign(st, { taken: n, level: 1 - (n + u) / N, mood: b < 560 ? 'drool' : b < 1760 ? 'sip' : 'puha', lean: b < 380 ? 0 : b < 560 ? LEAN * (b - 380) / 180 : b < 1760 ? LEAN : b < 1960 ? LEAN * (1960 - b) / 200 : 0,
        word: b >= 560 && b < 1760 ? pl.word : b >= 1800 && b < 2300 ? 'ぷはー' : '' });
    }
    const bite = pl.kind === 'bite', slurp = pl.slurp && pl.slurp(n), hold = slurp ? 1650 : T.hold;
    st.taken = n + (b >= (bite ? T.hold : T.take) ? 1 : 0);
    st.load = !bite && b >= T.take && b < hold;
    st.bowl = !(b >= hold && b < hold + 80);
    if (slurp) st.slurp = Math.max(0, Math.min(1, (b - T.hold) / (hold - T.hold)));
    st.lean = b < 880 ? 0 : b < T.at ? LEAN * (b - 880) / (T.at - 880) : b < hold + 120 ? LEAN : b < hold + 400 ? LEAN * (hold + 400 - b) / 280 : 0;
    st.mood = b < 880 ? 'drool' : b < T.hold ? 'aah' : (!bite && b < hold) ? 'hold' : b < T.chew + (slurp ? 200 : 0) ? 'chew' : 'gulp';
    st.word = b >= 940 && b < T.hold ? 'あーん' : slurp && b >= T.hold && b < hold ? 'ずるずる' : b >= (bite ? T.hold : hold) && b < T.chew ? (bite && b < T.hold + 200 ? 'ぱくっ' : 'もぐもぐ') : '';
    return st;
  }
  const heartsOf = (pl) => { const h = []; for (let n = 0; n < N; n++) { const w = START + n * BITE + (pl.kind === 'drink' ? 1900 : 2150); h.push([w, MX + 58, MY - 40], [w + 260, MX - 74, MY - 30]); } const e = START + N * BITE; h.push([e + 150, MX + 66, MY - 50], [e + 400, MX - 80, MY - 40], [e + 650, MX + 20, MY - 90]); return h; };

  // ======== the scene: drawn into an <svg> (360 × 420), its moving parts redrawn each frame ========
  // ======== where it is had (2026-11-14, the user: the 食堂's wall and table looked odd at a vending machine): a backdrop behind the
  // hero (0–268; mostly seen at the sides and over the head) and what the thing is set on (268–420). Outdoors goes by the time of
  // day (body --day: 1 by day, 0 by night); indoors is lamp-lit alike ========
  const dn = (a, b) => `style="fill:color-mix(in srgb,${a} calc(var(--day)*100%),${b})"`, NIGHT = 'style="opacity:calc(1 - var(--day))"';
  const slats = (top, edge, line, ys) => `<path d="M0 268 H360 V420 H0 Z" fill="${top}"/><path d="M0 268 H360" stroke="${edge}" stroke-width="4"/><path d="${ys.map((y) => `M0 ${y} H360`).join(' ')}" stroke="${line}" stroke-width="2" opacity=".6"/>`;
  const stars = `<g fill="#fff" ${NIGHT}>${[[30, 30], [92, 14], [300, 24], [338, 60], [262, 10], [16, 84], [348, 120]].map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="${i % 3 ? 1.2 : 1.8}"/>`).join('')}</g>`;
  const lantern = (x, y, r, c) => `<g transform="translate(${x} ${y})"><circle r="${r * 1.9}" fill="#ffb24a" opacity=".22"/><ellipse rx="${r}" ry="${r * 1.2}" fill="${c}"/><path d="M${-r * 0.92} -${r * 0.4} Q0 -${r * 0.5} ${r * 0.92} -${r * 0.4} M-${r} 0 Q0 ${r * 0.1} ${r} 0 M${-r * 0.92} ${r * 0.4} Q0 ${r * 0.5} ${r * 0.92} ${r * 0.4}" stroke="#000" stroke-opacity=".25" fill="none"/><rect x="${-r * 0.5}" y="${-r * 1.32}" width="${r}" height="${r * 0.24}" fill="#2a2420"/><rect x="${-r * 0.5}" y="${r * 1.08}" width="${r}" height="${r * 0.24}" fill="#2a2420"/><ellipse cx="${-r * 0.35}" cy="${-r * 0.4}" rx="${r * 0.22}" ry="${r * 0.4}" fill="#fff" opacity=".3"/></g>`;
  const BG = {
    shokudo: { back: (uid) => `<defs><linearGradient id="ew${uid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f6e7cf"/><stop offset="1" stop-color="#ead2ae"/></linearGradient></defs>
        <rect width="360" height="420" fill="url(#ew${uid})"/><rect width="360" height="40" fill="#2f3a64" opacity=".9"/>${[40, 160, 280].map((x) => `<path d="M${x} 40 v-40" stroke="#fff" stroke-opacity=".25"/>`).join('')}`,
      front: '<path d="M0 268 H360 V420 H0 Z" fill="#b98955"/><path d="M0 268 H360" stroke="#d4a874" stroke-width="3"/><path d="M0 300 H360 M0 346 H360 M0 392 H360" stroke="#a87a48" stroke-width="1" opacity=".5"/>' },
    // 居酒屋: dark boards, menu tags (短冊) on the wall, 赤提灯 glowing, a dark counter
    izakaya: { back: () => `<rect width="360" height="268" fill="#5a3a26"/><path d="${[30, 60, 90, 270, 300, 330].map((x) => `M${x} 0 V268`).join(' ')}" stroke="#432a1a" stroke-width="2"/><rect width="360" height="268" fill="#ffb060" opacity=".07"/>
        <path d="M0 92 H360" stroke="#3a2416" stroke-width="5"/>${[6, 28, 50, 288, 310, 332].map((x, i) => `<rect x="${x}" y="98" width="18" height="${62 + (i % 2) * 10}" fill="#f6efe0"/><path d="M${x + 9} 106 v9 M${x + 9} 121 v13 M${x + 9} 140 v${8 + (i % 2) * 8}" stroke="#2a2420" stroke-width="2.4" stroke-linecap="round"/><rect x="${x + 4}" y="${150 + (i % 2) * 10}" width="10" height="4" fill="#c8323a"/>`).join('')}
        ${lantern(34, 46, 17, '#d8303a')}${lantern(326, 46, 17, '#d8303a')}`,
      front: '<path d="M0 268 H360 V420 H0 Z" fill="#7a4a2a"/><path d="M0 268 H360" stroke="#a8703f" stroke-width="4"/><path d="M0 314 C90 308 270 320 360 312 M0 366 C120 372 240 360 360 368" stroke="#5e3820" stroke-width="1.6" fill="none" opacity=".6"/>' },
    // 喫茶しずく: green striped paper, a framed picture, a pendant lamp, a walnut table
    cafe: { back: () => `<rect width="360" height="268" fill="#46604e"/><path d="${Array.from({ length: 20 }, (_, i) => `M${i * 18 + 9} 0 V268`).join(' ')}" stroke="#527060" stroke-width="3"/>
        <rect x="12" y="78" width="56" height="68" fill="#c9a06a"/><rect x="18" y="84" width="44" height="56" fill="#bfe0f4"/><path d="M18 122 Q34 108 48 118 T62 114 V140 H18 Z" fill="#7fae6a"/><circle cx="50" cy="98" r="6" fill="#f6d27a"/>
        <path d="M312 0 V34" stroke="#2a2420" stroke-width="2"/><circle cx="312" cy="62" r="34" fill="#ffd27a" opacity=".2"/><path d="M294 52 Q312 30 330 52 Z" fill="#e8b04a"/><path d="M294 52 H330" stroke="#c88a2a" stroke-width="2"/><ellipse cx="312" cy="56" rx="7" ry="5" fill="#fff6d0"/>`,
      front: '<path d="M0 268 H360 V420 H0 Z" fill="#6e4a32"/><path d="M0 268 H360" stroke="#8e6446" stroke-width="4"/><path d="M0 320 C100 314 260 326 360 318 M0 380 C140 386 240 374 360 382" stroke="#5a3a26" stroke-width="1.6" fill="none" opacity=".6"/>' },
    // 銭湯's 脱衣所 (the milk): numbered wooden lockers either side, a hinoki bench
    sento: { back: () => `<rect width="360" height="268" fill="#f2ead8"/><path d="M0 34 H360" stroke="#c9a670" stroke-width="5"/>
        ${[[0, 0], [276, 4]].map(([x0, n0]) => `<rect x="${x0}" y="48" width="84" height="220" fill="#b88a5c"/>${[0, 1].flatMap((c) => [0, 1, 2, 3].map((r) => { const x = x0 + 5 + c * 39, y = 54 + r * 53;
          return `<rect x="${x}" y="${y}" width="35" height="48" rx="2" fill="#dcb682" stroke="#a87a4c" stroke-width="1.4"/><rect x="${x + 9}" y="${y + 6}" width="17" height="9" rx="1.4" fill="#fbf6ea"/><text x="${x + 17.5}" y="${y + 13.4}" font-size="7.4" text-anchor="middle" fill="#3a2c24" font-family="sans-serif">${n0 + r * 2 + c + 1}</text><circle cx="${x + 17.5}" cy="${y + 32}" r="3" fill="#c9a24a"/>`; })).join('')}`).join('')}`,
      front: slats('#e6cc98', '#f2dcae', '#c9a670', [312, 358, 400]) },
    // in the street by a vending machine (also the station's): the sky, roofs far off, a pole and its wires; the machine lit by night
    street: { back: () => `<rect width="360" height="268" ${dn('#bfe0f4', '#1b2050')}/>${stars}
        <path d="M0 268 V200 L30 186 L60 200 V180 H100 V268 Z M262 268 V196 L296 178 L330 196 V186 H360 V268 Z" ${dn('#9fb6c8', '#2a2f58')}/>
        <rect x="334" y="0" width="10" height="268" ${dn('#8a8f98', '#3a3e58')}/><path d="M0 40 Q180 64 360 36 M0 52 Q180 78 360 48" stroke="#3a3e48" stroke-opacity=".45" stroke-width="1.4" fill="none"/>
        <rect x="-10" y="88" width="88" height="186" rx="12" fill="#fff2b0" opacity=".18" ${NIGHT}/><rect x="-4" y="96" width="74" height="172" rx="4" fill="#d8303a"/><rect x="4" y="106" width="58" height="76" rx="2" ${dn('#eef6fa', '#fff6d0')}/>${[0, 1, 2].map((r) => [0, 1, 2, 3].map((c) => `<rect x="${9 + c * 13}" y="${112 + r * 24}" width="8" height="14" rx="2" fill="${['#e0464a', '#3f7ac8', '#f5a030', '#5fae6a'][(r + c) % 4]}"/><rect x="${10 + c * 13}" y="${128 + r * 24}" width="6" height="3" fill="#e0464a"/>`).join('')).join('')}
        <rect x="46" y="190" width="14" height="22" rx="2" fill="#2a2420"/><rect x="8" y="228" width="50" height="18" rx="3" fill="#2a2420"/><g ${NIGHT}><rect x="4" y="106" width="58" height="76" fill="#fff6c0" opacity=".22"/></g>`,
      front: slats('#a87a50', '#c49568', '#7e5634', [306, 350, 394]) },
    // in front of 森のパン: its striped awning, the windows full of bread, a bench out front
    bakery: { back: () => `<rect width="360" height="268" fill="#f3e6cc"/><path d="M0 0 H360 V40 ${Array.from({ length: 12 }, (_, i) => `Q${345 - i * 30} 56 ${330 - i * 30} 40`).join(' ')} Z" fill="#fbf6ea"/>${Array.from({ length: 6 }, (_, i) => `<path d="M${i * 60} 0 H${i * 60 + 30} V40 Q${i * 60 + 15} 56 ${i * 60} 40 Z" fill="#4f8a5a"/>`).join('')}
        ${[6, 276].map((x) => `<rect x="${x}" y="88" width="78" height="164" rx="3" fill="#8a5a36"/><rect x="${x + 6}" y="94" width="66" height="152" fill="#fdf2dc"/>${[136, 192].map((y) => `<path d="M${x + 6} ${y} H${x + 72}" stroke="#c9a06a" stroke-width="3"/>`).join('')}
          ${[[14, 128, 'm'], [36, 128, 'c'], [56, 128, 'm'], [16, 184, 'c'], [38, 184, 'l'], [24, 238, 'l'], [52, 238, 'm']].map(([dx, y, k]) => (k === 'm' ? `<ellipse cx="${x + dx}" cy="${y - 8}" rx="9" ry="7" fill="#f2c86a"/>` : k === 'c' ? `<path d="M${x + dx - 10} ${y - 4} Q${x + dx} ${y - 22} ${x + dx + 10} ${y - 4} Q${x + dx} ${y - 10} ${x + dx - 10} ${y - 4} Z" fill="#d99a4a"/>` : `<rect x="${x + dx - 11}" y="${y - 16}" width="22" height="14" rx="6" fill="#c98a4a"/>`)).join('')}<path d="M${x + 10} 100 L${x + 26} 240" stroke="#fff" stroke-opacity=".45" stroke-width="3"/>`).join('')}`,
      front: slats('#b98a5a', '#d4a874', '#8e6440', [306, 350, 394]) },
    // the 緣日: a string of lanterns over the stalls (red-and-white, indigo-and-white), a 縁台 under red felt
    fair: { back: () => `<rect width="360" height="268" ${dn('#f6d2a0', '#22204a')}/>${stars}
        ${[[0, '#d0453c'], [276, '#3f5aa8']].map(([x, c]) => `<rect x="${x}" y="170" width="84" height="98" fill="#6b4428"/><path d="M${x} 128 H${x + 84} V166 ${Array.from({ length: 6 }, (_, i) => `Q${x + 84 - i * 14 - 7} 178 ${x + 84 - (i + 1) * 14} 166`).join(' ')} Z" fill="#fbf6ea"/>${[0, 2, 4].map((i) => `<path d="M${x + i * 14} 128 H${x + i * 14 + 14} V166 Q${x + i * 14 + 7} 178 ${x + i * 14} 166 Z" fill="${c}"/>`).join('')}`).join('')}
        <path d="M-4 30 Q180 80 364 30" stroke="#2a2420" stroke-width="1.4" fill="none"/>${[14, 60, 104, 256, 300, 346].map((x, i) => { const u = x / 360, y = 30 + 50 * 4 * u * (1 - u) * 0.5 + 12; return lantern(x, y, 9, i % 2 ? '#fff4e0' : '#e04a4a'); }).join('')}`,
      front: '<path d="M0 268 H360 V420 H0 Z" fill="#c8323a"/><path d="M0 268 H360" stroke="#e0484e" stroke-width="4"/><g fill="#a8262e" opacity=".5">' + Array.from({ length: 40 }, (_, i) => `<circle cx="${(i * 97) % 360}" cy="${280 + (i * 53) % 136}" r="1.2"/>`).join('') + '</g>' }
  };
  const OUTDOOR = ['street', 'bakery'];
  let uidN = 0;
  function mount(svg, it, picSvg, still, where) {   // still: motion reduced — drawn once, then once more at the end; where: a BG key
    const uid = `e${++uidN}`, bust = heroArt(state.look), pic = (/<svg[^>]*>(?:<circle class="pd"[^>]*\/>)?([\s\S]*)<\/svg>$/.exec(picSvg || '') || [])[1] || '';
    const bg = BG[where] ? where : 'shokudo', B = BG[bg], pl = plan(it, pic, bg), HEARTS = heartsOf(pl), more = [];
    svg.innerHTML = `${B.back(uid)}<g class="es-bust">${bust}</g>${B.front}
      <g class="es-table"></g><g class="es-steam"></g><g class="es-tool"></g><g class="es-mood"></g><g class="es-fx"></g>`;
    const $ = (c) => svg.querySelector(c), box = svg.closest('.es-face');
    if (box) box.dataset.bg = bg;
    let raf = 0, t0 = 0, phase = 'look', lastTaken = -1, onDone = null, heard = '';
    const idle0 = performance.now();
    function paint(st, ms) {
      const lean = (st.lean || 0) + face(st.mood, st.t, 0).bob;
      $('.es-bust').setAttribute('transform', `translate(0 ${f1(lean)})`);
      if (st.taken !== lastTaken) { lastTaken = st.taken; $('.es-table').innerHTML = pl.table(st.taken, st.t, uid, st); }
      $('.es-steam').innerHTML = pl.steam && st.taken < N && !still ? steam(st.t, pl.steam) : '';
      $('.es-tool').innerHTML = pl.tool(st.pose, st, uid);
      $('.es-mood').innerHTML = face(st.mood, st.t, lean).art;
      $('.es-fx').innerHTML = `${st.word ? `<text x="${f1(MX - 86)}" y="${f1(MY - 46 - 3 * Math.abs(Math.sin(st.t / 160)))}" font-family="'Hiragino Maru Gothic ProN', 'Zen Maru Gothic', sans-serif" font-weight="800" font-size="20" fill="#c8642c" stroke="#fff6e8" stroke-width="4" paint-order="stroke" transform="rotate(-8 ${f1(MX - 86)} ${f1(MY - 46)})">${st.word}</text>` : ''}${phase === 'look' ? '' : hearts(HEARTS.concat(more), ms)}`;
      if (box) { box.dataset.mood = st.mood; box.dataset.taken = String(st.taken); }
    }
    function sound(st) {   // a bite's crunch as a piece goes, a sip's gulps, the noodles' slurp
      const s = pl.kind === 'drink' ? (st.mood === 'sip' ? 'gulp' : '') : st.word === 'ずるずる' ? 'slurp' : st.word === 'もぐもぐ' || st.word === 'ぱくっ' ? 'chomp' : '';
      if (s && s + st.n !== heard) { heard = s + st.n; SND.play(s, s === 'gulp' ? { vol: 0.8 } : undefined); }
    }
    function frame(now) {
      if (!svg.isConnected) { raf = 0; return; }
      if (phase === 'look') paint(Object.assign(stateAt(pl, 0), { t: now - idle0 }), 0);
      else {
        const ms = now - t0, st = stateAt(pl, ms);
        if (phase === 'eat') sound(st);
        paint(st, ms);
        if (st.done && phase === 'eat') { phase = 'done'; if (onDone) onDone(); }
      }
      raf = requestAnimationFrame(frame);
    }
    paint(stateAt(pl, 0), 0);
    if (!still) raf = requestAnimationFrame(frame);
    const END = START + N * BITE + 700;
    return {
      kind: pl.kind,
      eat(done) { phase = 'eat'; onDone = done; t0 = performance.now(); },
      finish() { phase = 'done'; paint(stateAt(pl, END), END); },   // motion reduced: straight to the end
      at(ms) { paint(stateAt(pl, ms), ms); },   // drawn as it is ms after いただきます (tests)
      hearts() { if (!still && raf) { const ms = performance.now() - t0; more.push([ms, MX + 62, MY - 44], [ms + 220, MX - 78, MY - 34], [ms + 440, MX + 18, MY - 92]); } },
      stop() { cancelAnimationFrame(raf); raf = 0; }
    };
  }
  const way = (it) => (DRINK[it[0]] ? DRINK[it[0]][0] : DISH[it[0]] ? DISH[it[0]].way : KUSHI[it[0]] ? 'kushi' : 'bite');   // how a thing is had
  return { mount, way, N, MEAL: START + N * BITE, BG: Object.keys(BG) };
})();
