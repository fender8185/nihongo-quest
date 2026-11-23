'use strict';
// ---------- 湯の花駅前 (2026-11-23, 湯の花温泉; docs/superpowers/specs/2026-11-23-onsen-work-design.md §3.1, §4) ----------
// The hot-spring town's station square, reached only by train (やまなみ線 from 白鷺: RIDE). Seen as the other places out of doors
// are, side on in their coordinates (F: the line the buildings stand on), lit by night through hc(): the mountains behind — far
// ridges, a cedar slope in the season's colours, a gorge spanned by the line's red bridge (now and then the one-car diesel over
// it), the town's steam rising on the right — and on the square: the wooden station (its tiled roof, the porch with its name
// board and clock, the 改札 with the train waiting at the platform beyond — the way home: its ticket machine — the departure
// board, the waiting room, a red post box), the 足湯 (a roofed pool of stone; sat on, his feet in it), the 観光案内所 (あかり at
// its window 9–18), the 求人看板, the area's map board, a 人力車 to sit in for a photo, and the mouth of 湯けむり通り.
// The first time the hero is here while あかり is: her ようこそ, once (state.town.arrived.onsen, synced).
const ONSEN = (() => {
  const F = 236, f = (n) => n.toFixed(1);
  const MARK = /\{([^|}]+)\|([^|}]+)(?:\|[^}]+)?\}/g, ruby = (s) => esc(s).replace(MARK, '<ruby>$1<rt>$2</rt></ruby>');
  const W = () => TOWN.ONSEN || {};
  const akariHere = (h = TOWNEV.now()) => (TOWNEV.whereIs('akari', h, TOWNEV.today()) || {}).place === 'onsen';
  const month = () => (typeof sceneDate === 'function' ? sceneDate() : new Date()).getMonth() + 1;
  // the season's trees on the slope: spring's blossom, summer's green, autumn's reds and golds, winter's bare boughs (and snow)
  const leaves = () => seasonLeaves(month());   // the season's trees (71w_ride.js: the diesel's windows have the same)
  // a leaf's colour dimmed by night as brightness(a + b × day) would dim it, without a filter (2026-11-24, the review: a filtered
  // circle under the steam repaints with it): by day c × (a + b), by night (hc's --md: a fifth of the day's) c × (a − b / 4)
  const leafLit = (c, a, b) => hc(mixHex(c, '#000000', 1 - (a + b)), mixHex(c, '#000000', 1 - (a - b / 4)));
  // a ridge through points, smoothed (each corner a curve to the next midpoint), down to y = base
  const ridge = (pts, base) => { let d = `M${pts[0][0]} ${base} L${pts[0][0]} ${pts[0][1]}`; for (let i = 1; i < pts.length - 1; i++) { const [x, y] = pts[i], [nx, ny] = pts[i + 1]; d += ` Q${x} ${y} ${f((x + nx) / 2)} ${f((y + ny) / 2)}`; } const [lx, ly] = pts[pts.length - 1]; return `${d} L${lx} ${ly} L${lx} ${base} Z`; };
  const cedar = (x, y, h, k) => `<path d="M${f(x)} ${f(y - h)} L${f(x + h * 0.2)} ${f(y - h * 0.45)} L${f(x + h * 0.14)} ${f(y - h * 0.45)} L${f(x + h * 0.27)} ${f(y)} L${f(x - h * 0.27)} ${f(y)} L${f(x - h * 0.14)} ${f(y - h * 0.45)} L${f(x - h * 0.2)} ${f(y - h * 0.45)} Z" ${k ? hc('#3f6a4c', '#0e1828') : hc('#4f7a58', '#121e34')}/><path d="M${f(x)} ${f(y - h)} L${f(x + h * 0.27)} ${f(y)} H${f(x)} Z" fill="#000" fill-opacity=".12"/>`;
  // ---- behind: the far range (lit from the left, its right flanks in shade; snow on its peaks in winter), a hazier range nearer
  // with a fringe of cedars, then the near hill under its cedars and the season's trees; a gorge cut in it and the line's red truss
  // bridge across (the diesel over it now and then, in and out of the trees), a fall of water under it; mist along the valley; the
  // town's steam rising on the right ----
  // ---- steam (湯の花駅前's, and 湯けむり通り's and 湯畑's to come): soft puffs — a radial gradient, its colour at the heart fading out to
  // nothing, no filter — rising and swelling by transform only (.os-steam), cheap on a phone. steamDefs(): the gradient, once in a
  // land's <svg> (its colour --os-puff: white by day, a dim lilac by night); steam(puffs): [x, y, r, delay s] each ----
  const steamDefs = () => `<defs><radialGradient id="osPuff"><stop offset="0" style="stop-color:var(--os-puff)" stop-opacity=".95"/><stop offset=".5" style="stop-color:var(--os-puff)" stop-opacity=".5"/><stop offset="1" style="stop-color:var(--os-puff)" stop-opacity="0"/></radialGradient></defs>`;
  const steam = (puffs, cls = '') => puffs.map(([x, y, r, d]) => `<circle class="os-steam${cls ? ' ' + cls : ''}" cx="${x}" cy="${y}" r="${r}" fill="url(#osPuff)" style="animation-delay:-${d}s"/>`).join('');   // cls: yd-small, a short rise (a steamer's, a gutter's: 湯けむり通り)
  const lerpY = (P, x) => { const i = Math.max(0, P.findIndex((p) => p[0] > x) - 1), [x0, y0] = P[i], [x1, y1] = P[i + 1] || P[i]; return y0 + (y1 - y0) * ((x - x0) / ((x1 - x0) || 1)); };
  const FAR = [[-20, -40], [80, -96], [170, -70], [260, -128], [360, -84], [450, -110], [540, -150], [640, -104], [730, -138], [820, -92], [920, -120], [1020, -80], [1110, -112], [1220, -70]];
  const MID = [[-20, 30], [100, -20], [200, 10], [300, -40], [420, 0], [520, -30], [600, -56], [690, -20], [780, -44], [880, -4], [980, -30], [1080, 6], [1220, -16]];
  const NEAR = [[-20, 112], [80, 82], [180, 96], [280, 62], [380, 84], [470, 52], [560, 34], [610, 44], [660, 40], [740, 64], [830, 54], [920, 80], [1020, 70], [1120, 96], [1220, 84]];
  function hills() {
    const [c1, c2, c3] = leaves(), winter = month() === 12 || month() <= 2;
    // the far range's shade: from each peak down its right flank to the next dip
    const shade = FAR.slice(1, -1).map(([x, y], i) => { const [nx, ny] = FAR[i + 2]; return ny > y ? `<path d="M${x} ${y + 3} Q${f(x + (nx - x) * 0.5)} ${f(y + (ny - y) * 0.45)} ${nx} ${ny + 4} L${f(nx - 4)} 60 Q${f(x + (nx - x) * 0.3)} 20 ${x} ${y + 3} Z" fill="#2b3a5a" style="opacity:calc(.03 + .05 * var(--day))"/>` : ''; }).join('');
    const snow = winter ? FAR.filter(([, y]) => y < -100).map(([x, y]) => `<path d="M${x - 24} ${y + 16} Q${x - 8} ${y - 1} ${x} ${y + 1} Q${x + 8} ${y - 1} ${x + 24} ${y + 16} q-8 -4 -12 2 q-6 -6 -10 0 q-6 -5 -10 -2 Z" ${hc('#f6f8fc', '#5a6090')}/>`).join('') : '';
    let fringe = '';   // the nearer range's crest: small cedars, hazy
    for (let x = -10; x < 1215; x += 11) { const y = lerpY(MID, x) + 6 + (x * 7 % 5); fringe += `<path d="M${x} ${f(y - 12 - (x * 13 % 7))} l4.4 ${f(12 + (x * 13 % 7))} h-8.8 Z" ${hc('#6a8a8e', '#182038')}/>`; }
    let trees = '';
    for (let x = -10; x < 1215; x += 16) {   // cedars over the near hill, from its crest down; where the buildings stand in front, none
      if (x > 556 && x < 668) continue;   // the gorge
      const top = lerpY(NEAR, x), k = Math.floor(x / 16);
      [0, 1, 2, 3].forEach((r) => { const y = top + 18 + r * 24 + ((k * 7 + r * 3) % 9), h = 30 + ((k * 5 + r * 11) % 18); if (y > 160) return;
        trees += (k + r) % 5 === 2 && r ? `<circle cx="${x + 4}" cy="${y - 10}" r="11" ${leafLit([c1, c2, c3][(k + r) % 3], 0.35, 0.65)} ${winter ? 'opacity=".7"' : ''}/><circle cx="${x - 3}" cy="${y - 5}" r="7" ${leafLit([c2, c3, c1][(k + r) % 3], 0.3, 0.6)}/>` : cedar(x + (r % 2) * 8, y, h, (k + r) % 2); });
    }
    // the gorge: its rock walls and the water falling down it; the bridge — its deck on stone piers at either side, the red truss
    // over it (the far side's behind the train, the near side's before it); the train out of the trees and in again
    const truss = (op) => `<path d="M556 61 H666 M564 47 H658 ${Array.from({ length: 8 }, (_, i) => `M${564 + i * 13.4} 47 L${f(570.7 + i * 13.4)} 61 L${f(577.4 + i * 13.4)} 47`).join(' ')} M564 47 L556 61 M658 47 L666 61" fill="none" ${hs('#c8322a', '#5a2030')} stroke-width="${op ? 2.4 : 1.6}" ${op ? '' : 'opacity=".55"'}/>`;
    const gorge = `<path d="M552 40 Q566 92 592 150 L622 150 Q648 96 670 44 Z" ${hc('#9a8e7a', '#22233c')}/><path d="M552 40 Q566 92 592 150 L600 150 Q578 96 566 46 Z" fill="#2b1c12" style="opacity:calc(.06 + .14 * var(--day))"/>
      <path d="M562 64 q8 4 14 2 M570 88 q8 6 16 2 M578 112 q6 4 12 2 M652 70 q-8 4 -14 2 M644 96 q-8 6 -14 2 M636 118 q-6 4 -12 2" fill="none" ${hs('#7a6e5c', '#1a1a30')} stroke-width="1.4"/>
      ${[[560, 70, 12], [574, 98, 10], [648, 78, 12], [640, 104, 10]].map(([x, y, h], k) => cedar(x, y, h, k % 2)).join('')}
      <path d="M604 66 q3 20 -1 40 q3 14 1 30" fill="none" ${hs('#d8eef6', '#4a5a8a')} stroke-width="4.4"/><path d="M606 70 q2 16 -1 34" fill="none" stroke="#fff" style="stroke-opacity:calc(.2 + .6 * var(--day))" stroke-width="1.2"/>
      <path d="M546 60 h14 l-3 30 h-8 Z M662 60 h14 l-2 32 h-9 Z" ${hc('#9a9284', '#2a2a44')}/>${truss(false)}
      <g class="os-far-train"><g><rect x="0" y="51" width="24" height="9" rx="2" ${hc('#f3ead2', '#3a3f66')}/><rect x="0" y="56.4" width="24" height="2.2" ${hc('#2f5a3a', '#163028')}/><rect x="3" y="52.6" width="4.4" height="2.8" ${hc('#9fc0d0', '#ffe2a0')}/><rect x="10" y="52.6" width="4.4" height="2.8" ${hc('#9fc0d0', '#ffe2a0')}/><rect x="17" y="52.6" width="4.4" height="2.8" ${hc('#9fc0d0', '#ffe2a0')}/></g></g>
      ${truss(true)}<path d="M550 62 H672" ${hs('#6a2a26', '#3a1a24')} stroke-width="3"/>${cedar(546, 74, 40, 1)}${cedar(538, 86, 34, 0)}${cedar(676, 76, 42, 0)}${cedar(686, 88, 32, 1)}`;
    // the river along the valley floor (the review, 2026-11-23: only its fall was drawn): out of the gorge's foot and away either way
    // under the trees (seen past the station's end and through the 足湯's open sides), foam where the fall meets it, glints
    const river = `<path d="M420 155 Q480 149 548 153 Q590 157 608 152 Q650 147 712 153 Q760 157 800 152 L800 161 Q760 165 712 161 Q650 157 608 161 Q590 165 548 161 Q480 157 420 163 Z" ${hc('#8fc4dc', '#2a3a6a')}/>
      <path d="M420 155 Q480 149 548 153 Q590 157 608 152 Q650 147 712 153 Q760 157 800 152" fill="none" ${hs('#4f7a58', '#121e34')} stroke-width="1.6"/>
      <path d="M598 151 q5 -3 10 0 q5 3 10 0" fill="none" stroke="#fff" stroke-width="2.4" style="stroke-opacity:calc(.3 + .5 * var(--day))"/>
      <path d="M452 157 h16 M500 156 h12 M560 157 h14 M650 155 h16 M700 157 h12 M748 158 h14" stroke="#fff" stroke-width="1" style="stroke-opacity:calc(.12 + .5 * var(--day))"/>`;
    const puffs = steam([[996, 130, 28, 0], [1004, 118, 22, 4.5], [1040, 116, 34, 2.3], [1052, 104, 26, 6.8], [1092, 128, 30, 4.6], [1100, 112, 24, 0.9], [1140, 108, 38, 1.2], [1148, 96, 28, 5.6], [1188, 122, 30, 6.1], [1196, 104, 26, 2.9], [1066, 96, 26, 7.4], [1164, 88, 32, 3.4]]);
    return `<path d="${ridge(FAR, F)}" ${hc('#a9b9cb', '#1d2346')}/>${shade}${snow}
      <path d="${ridge(MID, F)}" ${hc('#86a2a8', '#1a2240')}/>${fringe}<rect x="-20" y="20" width="1240" height="40" fill="#fff" style="opacity:calc(.12 * var(--day))"/>
      <path d="${ridge(NEAR, F)}" ${hc('#5f8a66', '#15213a')}/>${gorge}${trees}${river}
      <rect x="-20" y="128" width="1240" height="26" fill="#fff" style="opacity:calc(.16 * var(--day))"/>${puffs}`;
  }
  // ---- the station: a long wooden building under a hipped roof of grey tiles (their rows and courses, the ridge with its end
  // tiles, the eaves' underside and their shadow on the wall), white walls between dark posts over a stone base, its side wall
  // going back at the right end. Its porch out in front: a gable of its own (the bargeboards, the clock in it) and the name board
  // under it; through the entrance the ticket window and the departure board (やまなみ線's times from here). On the left the 改札:
  // through it the platform and the one-car diesel at it; on the right the waiting room (lit by night), a bench, the post box ----
  function station() {
    const tiles = (x0, x1, y0, y1, xt0, xt1) => { let d = ''; for (let y = y0 + 6; y < y1; y += 6) { const t = (y - y0) / (y1 - y0), a = xt0 + (x0 - xt0) * t, b = xt1 + (x1 - xt1) * t; d += `M${f(a)} ${y} H${f(b)} `; } for (let x = xt0 + 6; x < xt1; x += 9) { const a = x, b = x0 + (x - xt0) * ((x1 - x0) / (xt1 - xt0)); d += `M${f(a)} ${y0} L${f(b)} ${y1} `; } return d; };
    const roof = `<path d="M14 132 L120 90 H352 L458 132 Z" ${hc('#5f6878', '#1c1e38')}/><path d="${tiles(14, 458, 90, 132, 120, 352)}" ${hs('#4a5262', '#14152c')} stroke-width=".9" fill="none"/>
      <path d="M352 90 L458 132 L470 128 L364 88 Z" ${hc('#4a5262', '#14152c')}/><path d="M14 132 H458 L470 128" fill="none" ${hs('#3a404e', '#101024')} stroke-width="2.4"/>
      <rect x="114" y="83" width="244" height="8" rx="2" ${hc('#4a5262', '#14152c')}/><path d="M114 83 h244" stroke="#fff" stroke-opacity=".22" stroke-width="1"/><path d="M108 91 q0 -14 10 -16 l2 8 Z M364 91 q0 -14 -10 -16 l-2 8 Z" ${hc('#3a404e', '#101024')}/>
      <rect x="14" y="132" width="456" height="7" ${hc('#6e5236', '#24203a')}/><path d="${Array.from({ length: 38 }, (_, i) => `M${20 + i * 12} 133 v5`).join(' ')}" ${hs('#4a3424', '#18142a')} stroke-width="1.4"/>`;
    const wall = `<rect x="40" y="139" width="392" height="89" ${hc('#f3ede0', '#2a2c50')}/><rect x="40" y="139" width="392" height="12" fill="#2b1c12" style="opacity:calc(.04 + .1 * var(--day))"/>
      <path d="M432 139 L446 133 V230 L432 236 Z" ${hc('#ddd4c2', '#22244a')}/><path d="M432 139 L446 133" ${hs('#5a3e2a', '#1e1830')} stroke-width="2"/>
      ${[40, 110, 170, 306, 368, 426].map((x) => `<rect x="${x}" y="139" width="7" height="89" ${hc('#5a3e2a', '#1e1830')}/><rect x="${x + 5}" y="139" width="2" height="89" fill="#000" fill-opacity=".18"/>`).join('')}
      <rect x="40" y="150" width="392" height="4" ${hc('#6e5236', '#24203a')}/>
      ${[[47, 110], [117, 170], [313, 368], [375, 426]].map(([a, b]) => `<rect x="${a}" y="204" width="${b - a}" height="24" ${hc('#7a5a3c', '#2a2234')}/><path d="${Array.from({ length: Math.floor((b - a) / 7) }, (_, i) => `M${a + 4 + i * 7} 205 v22`).join(' ')}" ${hs('#5a3e2a', '#1e1830')} stroke-width="1"/>`).join('')}
      <rect x="36" y="228" width="414" height="8" ${hc('#a8a296', '#2a2a46')}/><path d="${Array.from({ length: 14 }, (_, i) => `M${66 + i * 28} 228 v8`).join(' ')} M36 232 H450" ${hs('#8a8478', '#1e1e38')} stroke-width="1"/>`;
    // the 改札 and the platform through it: the diesel's side (cream, its green band, lit windows by night), the platform's edge, the
    // wooden box where tickets are taken, a rail either side of it
    const gate = `<defs><clipPath id="osGate"><rect x="56" y="156" width="104" height="80"/></clipPath></defs>
      <g clip-path="url(#osGate)"><rect x="56" y="156" width="104" height="80" ${hc('#cfe0e8', '#1a1d3a')}/><rect x="56" y="156" width="104" height="10" ${hc('#8a8f99', '#14152c')}/>
        <rect x="40" y="170" width="150" height="40" rx="4" ${hc('#f3ead2', '#3a3f66')}/><rect x="40" y="196" width="150" height="6" ${hc('#2f5a3a', '#163028')}/><rect x="40" y="203" width="150" height="1.6" fill="#e6a23c"/>
        ${[62, 96, 130].map((x) => `<rect x="${x}" y="176" width="22" height="15" rx="2" ${hc('#9fc0d0', '#ffe2a0')}/>`).join('')}<rect x="112" y="174" width="12" height="30" ${hc('#d8ceb4', '#2c3056')}/>
        <rect x="56" y="210" width="104" height="14" ${hc('#c9c2b4', '#34365a')}/><rect x="56" y="210" width="104" height="2.4" ${hc('#e6c23a', '#5a5a3a')}/><rect x="56" y="224" width="104" height="12" ${hc('#b8b0a0', '#2a2c4c')}/>
        <path d="M58 226 H96 M120 226 H158" ${hs('#6e5236', '#24203a')} stroke-width="2.4"/><path d="${[62, 70, 78, 86, 94, 124, 132, 140, 148, 156].map((x) => `M${x} 226 v10`).join(' ')}" ${hs('#6e5236', '#24203a')} stroke-width="1.4"/>
        <rect x="98" y="206" width="20" height="30" ${hc('#8a6a48', '#2a2238')}/><rect x="96" y="204" width="24" height="4" rx="1" ${hc('#6e5236', '#1e1830')}/><rect x="101" y="212" width="14" height="8" ${hc('#efe4cc', '#ffd98a')}/></g>
      <rect x="54" y="154" width="108" height="4" ${hc('#5a3e2a', '#1e1830')}/><rect x="76" y="140" width="62" height="12" rx="1" ${hc('#2b2b33', '#141428')}/><text x="107" y="149.4" text-anchor="middle" font-size="8.4" font-weight="700" ${hc('#fbf8f0', '#ffe9b0')} ${SERIF}>改札口</text>`;
    // the porch: its posts on stone feet, its gable (bargeboards, the clock), the name board, the entrance with the ticket window and
    // the departure board inside; its shadow on the wall to its right
    const times = (() => { const n = sceneHour(); return EKI.next(Math.floor(n), Math.floor((n % 1) * 60), 2, 'yunohana'); })();
    const porch = `<path d="M300 142 L318 136 V236 L300 236 Z" fill="#2b1c12" style="opacity:calc(.05 + .12 * var(--day))"/>
      <rect x="190" y="160" width="96" height="76" ${hc('#5a4a3a', '#1c1a30')}/><rect x="190" y="160" width="96" height="76" class="lit" style="opacity:calc(.04 + .5 * (1 - var(--day)))"/>
      <rect x="206" y="166" width="64" height="16" rx="1" fill="#141418"/>${times.map((x, i) => `<text x="210" y="${173.4 + i * 6.4}" font-size="5.2" font-weight="700" fill="#ffae3a" font-family="system-ui, sans-serif">${x.t}</text><text x="230" y="${173.4 + i * 6.4}" font-size="5.2" font-weight="700" fill="#5fd07a" font-family="system-ui, sans-serif">普通</text><text x="248" y="${173.4 + i * 6.4}" font-size="5.2" font-weight="700" fill="#ffae3a" font-family="system-ui, sans-serif">白鷺</text>`).join('')}
      <rect x="244" y="190" width="30" height="20" ${hc('#efe4cc', '#ffd98a')}/><path d="M244 200 h30 M259 190 v20" ${hs('#6e5236', '#24203a')} stroke-width="1"/><rect x="246" y="184" width="26" height="5" ${hc('#2f5a3a', '#163028')}/><text x="259" y="188.2" text-anchor="middle" font-size="3.8" fill="#fff" font-family="system-ui, sans-serif">きっぷ</text>
      <rect x="198" y="192" width="30" height="44" ${hc('#8a6a48', '#2a2238')}/><rect x="201" y="195" width="11" height="38" ${hc('#cfdce0', '#ffd98a')} opacity=".75"/><rect x="214" y="195" width="11" height="38" ${hc('#cfdce0', '#ffd98a')} opacity=".75"/>
      ${[176, 296].map((x) => `<rect x="${x}" y="142" width="9" height="94" ${hc('#5a3e2a', '#1e1830')}/><rect x="${x + 7}" y="142" width="2" height="94" fill="#000" fill-opacity=".2"/><rect x="${x - 3}" y="228" width="15" height="8" ${hc('#a8a296', '#2a2a46')}/>`).join('')}
      <rect x="184" y="142" width="112" height="5" ${hc('#6e5236', '#24203a')}/>
      <path d="M160 144 L238 100 L316 144 L310 146 L238 106 L166 146 Z" ${hc('#5f6878', '#1c1e38')}/><path d="M172 142 L238 106 L304 142 Z" ${hc('#efe6d4', '#262848')}/>
      <path d="M168 145 L238 104 L308 145" fill="none" ${hs('#4a3424', '#18142a')} stroke-width="3.4"/><path d="M233 104 h10 l-2 6 h-6 Z" ${hc('#4a3424', '#18142a')}/>
      <circle cx="238" cy="126" r="11" ${hc('#fbf7ec', '#e8dcb4')}/><circle cx="238" cy="126" r="10.2" fill="none" ${hs('#3b3b44', '#1c1d3c')} stroke-width="1.6"/>${clockHands(238, 126, 9)}
      <rect x="196" y="146" width="84" height="14" rx="1" ${hc('#4a3424', '#18142a')}/><rect x="198" y="147.6" width="80" height="10.8" rx="1" fill="none" ${hs('#c9a070', '#5a4a3a')} stroke-width=".8"/>
      <text x="238" y="156.6" text-anchor="middle" font-size="10" font-weight="700" letter-spacing="2" ${hc('#f4e6c4', '#ffe9b0')} ${SERIF}>湯の花駅</text>`;
    const waiting = `${[318, 374].map((x) => `<rect x="${x - 2}" y="160" width="48" height="38" ${hc('#5a3e2a', '#1e1830')}/><rect x="${x}" y="162" width="44" height="34" ${hc('#cfe0e8', '#ffd98a')}/>${x === 374 ? `<rect x="${x}" y="162" width="44" height="34" class="lit" style="opacity:calc(.06 + .7 * (1 - var(--day)))"/>` : ''}
      <path d="M${x + 11} 162 v34 M${x + 22} 162 v34 M${x + 33} 162 v34 M${x} 179 h44" ${hs('#6e5236', '#24203a')} stroke-width="1.2"/><path d="M${x + 4} 192 l10 -26" stroke="#fff" style="stroke-opacity:calc(.3 * var(--day))" stroke-width="2"/><rect x="${x - 3}" y="197" width="50" height="3" ${hc('#6e5236', '#24203a')}/>`).join('')}
      <rect x="330" y="212" width="84" height="5" rx="1" ${hc('#a8743f', '#3a2c30')}/><rect x="330" y="216" width="84" height="2" fill="#2b1c12" fill-opacity=".25"/>${[336, 408].map((x) => `<rect x="${x}" y="217" width="4" height="11" ${hc('#6e5236', '#24203a')}/>`).join('')}`;
    const post = `<g data-fx="post"><ellipse cx="457" cy="236" rx="13" ry="2.4" fill="#2b1c12" fill-opacity=".18"/><rect x="449" y="196" width="16" height="40" rx="2" ${hc('#d0302a', '#4a1e2a')}/><path d="M448 197 q9 -10 18 0 Z" ${hc('#b8262a', '#3a1424')}/><rect x="452" y="203" width="10" height="2.4" rx="1" fill="#2b1c12"/>
      <rect x="452" y="209" width="10" height="9" ${hc('#fffdf6', '#c9c4e8')}/><text x="457" y="216.4" text-anchor="middle" font-size="6.4" font-weight="700" fill="#c8453a" font-family="system-ui, sans-serif">〒</text><rect x="461" y="197" width="3" height="38" fill="#2b1c12" fill-opacity=".12"/></g>`;
    return `${wall}${gate}${waiting}${roof}${porch}${post}`;
  }
  // ---- the 足湯「えきまえ足湯」: four wooden posts under a shingled gable roof (its far end showing), the board with its name; the
  // long stone pool steaming, a bench along its back to sit on, the front rim's stones; a bucket and a towel by a post ----
  const BATH = { x0: 488, x1: 680, seat: 226, water: [230, 252] };
  function bathBack() {
    const { x0, x1 } = BATH;
    return `<path d="M${x0 - 10} 142 L${x0 + 12} 116 H${x1 - 12} L${x1 + 10} 142 Z" ${hc('#8a6a4a', '#2a2234')}/><path d="${Array.from({ length: 5 }, (_, i) => { const y = 120 + i * 5, t = (y - 116) / 26; return `M${f(x0 + 12 - 22 * t)} ${y} H${f(x1 - 12 + 22 * t)}`; }).join(' ')}" ${hs('#6e5236', '#1e1830')} stroke-width="1"/>
      <path d="M${x1 - 12} 116 L${x1 + 10} 142 L${x1 + 18} 138 L${x1 - 4} 114 Z" ${hc('#6e5236', '#1e1830')}/><rect x="${x0 + 8}" y="111" width="${x1 - x0 - 16}" height="6" rx="2" ${hc('#6e5236', '#1e1830')}/>
      <rect x="${x0 - 10}" y="142" width="${x1 - x0 + 28}" height="5" ${hc('#5a3e2a', '#1e1830')}/>
      ${[x0 + 8, x1 - 14].map((x) => `<rect x="${x}" y="147" width="6" height="${BATH.seat - 147}" ${hc('#6e5236', '#24203a')}/>`).join('')}
      <rect x="${x0 + 2}" y="${BATH.seat - 22}" width="${x1 - x0 - 4}" height="3" ${hc('#8a6a48', '#2a2238')}/>
      <rect x="${x0}" y="${BATH.seat}" width="${x1 - x0}" height="5" rx="1" ${hc('#b8895a', '#3a2c34')}/><rect x="${x0}" y="${BATH.seat + 4}" width="${x1 - x0}" height="2" fill="#2b1c12" fill-opacity=".3"/>
      <ellipse class="glow" cx="${(x0 + x1) / 2}" cy="${BATH.water[0] + 6}" rx="120" ry="18" fill="url(#glw)"/>`;
  }
  // in front of whoever sits on it: the water (over their feet — a little of them shows through), the front rim of stones with the
  // near bench's plank along it, the front posts, the board, the steam, the lantern under the roof; the ripples round a seat sat on
  function bathFront() {
    const { x0, x1, water: [w0, w1] } = BATH;
    return `<g data-fx="ashiyu"><rect x="${x0}" y="${w0}" width="${x1 - x0}" height="${w1 - w0}" ${hc('#7cc4c0', '#2a4a6e')} opacity=".78"/><rect x="${x0}" y="${w0}" width="${x1 - x0}" height="3" fill="#fff" style="opacity:calc(.12 + .3 * var(--day))"/>
      ${[0, 1, 2, 3, 4].map((k) => `<ellipse class="fx-ripple" cx="${x0 + 24 + k * 40}" cy="${w0 + 10 + (k % 2) * 6}" rx="10" ry="2.4" fill="none" stroke="#fff" stroke-opacity=".7" stroke-width="1" style="animation-delay:-${(k * 0.9).toFixed(1)}s"/>`).join('')}
      <g class="os-soakrings"></g>
      <rect x="${x0 - 6}" y="${w1 - 2}" width="${x1 - x0 + 12}" height="12" ${hc('#a8a296', '#2c2c48')}/><path d="${Array.from({ length: 9 }, (_, i) => `M${x0 + 18 + i * 24} ${w1 - 2} v12`).join(' ')} M${x0 - 6} ${w1 + 4} H${x1 + 6}" ${hs('#8a8478', '#1e1e38')} stroke-width="1"/><rect x="${x0 - 6}" y="${w1 - 2}" width="${x1 - x0 + 12}" height="2.4" ${hc('#c9c2b4', '#3a3a58')}/>
      <rect x="${x0 + 10}" y="${w1 - 6}" width="${x1 - x0 - 20}" height="4.4" rx="1" ${hc('#b8895a', '#3a2c34')}/><rect x="${x0 + 10}" y="${w1 - 2}" width="${x1 - x0 - 20}" height="1.6" fill="#2b1c12" fill-opacity=".3"/><path d="M${x0 + 12} ${w1 - 5} H${x1 - 12}" stroke="#fff" style="stroke-opacity:calc(.05 + .2 * var(--day))" stroke-width=".8"/>
      ${[x0 - 2, x1 - 6].map((x) => `<rect x="${x}" y="147" width="8" height="${w1 + 10 - 147}" ${hc('#5a3e2a', '#1e1830')}/><rect x="${x + 6}" y="147" width="2" height="${w1 + 10 - 147}" fill="#000" fill-opacity=".2"/>`).join('')}
      <rect x="${x0 - 2}" y="145" width="${x1 - x0 + 6}" height="5" ${hc('#6e5236', '#24203a')}/>
      <path d="M556 150 v4 M612 150 v4" ${hs('#3b2a1c', '#14142a')} stroke-width="1"/><rect x="548" y="153" width="72" height="13" rx="1" ${hc('#4a3424', '#18142a')}/><text x="584" y="162.6" text-anchor="middle" font-size="8.2" font-weight="700" ${hc('#f4e6c4', '#ffe9b0')} ${SERIF}>えきまえ足湯</text>
      <g class="fx-sway" style="animation-duration:3.8s"><path d="M${x1 - 30} 150 v4" stroke="#3b2a1c" stroke-width="1"/><rect x="${x1 - 34.6}" y="153.6" width="9.2" height="2" ${hc('#2b2b33', '#141428')}/><ellipse cx="${x1 - 30}" cy="161" rx="5.6" ry="7" ${hc('#f6efe2', '#ffe9b0')}/><text x="${x1 - 30}" y="163.6" text-anchor="middle" font-size="6" font-weight="800" fill="#a8241c" ${SERIF}>湯</text><rect x="${x1 - 34.6}" y="167.6" width="9.2" height="2" ${hc('#2b2b33', '#141428')}/></g>
      <circle class="glow" cx="${x1 - 30}" cy="161" r="28" fill="url(#glw)"/>
      ${[[x0 + 30, 0], [x0 + 82, 1.6], [x0 + 134, 3.1], [x0 + 182, 0.8]].map(([x, d]) => `<g class="fx-steam" style="animation-delay:-${d}s;animation-duration:5.2s"><path d="M${x} ${w0 + 2} q-5 -7 0 -13 q5 -7 0 -14" fill="none" stroke="#fff" stroke-opacity=".75" stroke-width="2.6" stroke-linecap="round"/></g>`).join('')}
      <g transform="translate(${x0 + 18} ${w1 + 10})"><path d="M-8 0 L-9.6 -11 H9.6 L8 0 Z" ${hc('#c9a070', '#3a3048')}/><path d="M-9 -8 H9 M-8.4 -3 H8.4" ${hs('#6e5236', '#24203a')} stroke-width="1.4"/><path d="M-9.6 -11 H9.6" ${hs('#a8743f', '#2a2238')} stroke-width="1.6"/><path d="M-6 -11 V-17 H6 V-11" fill="none" ${hs('#8a6a48', '#2a2238')} stroke-width="1.6"/><path d="M-2 -6 h4" stroke="#fff" stroke-opacity=".3" stroke-width="1"/></g>
      <rect x="${x1 - 8}" y="196" width="4" height="${w1 + 10 - 196}" ${hc('#6e5236', '#24203a')}/><path d="M${x1 - 6} 198 h14" ${hs('#6e5236', '#24203a')} stroke-width="2"/><path d="M${x1 + 4} 198 v14 q0 3 -3 3 h-4 q-3 0 -3 -3 v-14 Z" ${hc('#f4efe4', '#8a86b0')}/><path d="M${x1 - 6} 204 h14" stroke="#3f7ac8" stroke-opacity=".5" stroke-width="1.6"/></g>`;
  }
  // ---- 観光案内所: a small gable-fronted house (the roof's far slope going back, its side wall), the green board with its name,
  // the round i sign out on a bracket, the counter window — inside, the racks of leaflets and あかり (9–18; lit while she is there)
  // — its sliding door with a hanging sign; the counter's front and the wall under it before her ----
  const ANNAI = { x0: 712, x1: 868, win: [724, 816], sill: 217, bars: [742, 776, 796] };   // bars: the window's mullions — あかり's face in the wide pane between the first two (SPOTS.onsen.window)
  function annaiBack(open) {
    const { x0, x1, win: [w0, w1], sill } = ANNAI, cx = (x0 + x1) / 2;
    const racks = [180, 192, 204].map((y, r) => Array.from({ length: 11 }, (_, k) => `<rect x="${w0 + 6 + k * 9.6}" y="${y - (k % 3)}" width="7" height="${9 + (k % 3)}" fill="${['#e6a23c', '#3f9a8c', '#d0574b', '#5a78c8', '#f2e8c8', '#8ab86e'][(k + r * 2) % 6]}"/>`).join('')).join('');
    return `<path d="M${x1} 150 L${x1 + 16} 144 V230 L${x1} 236 Z" ${hc('#ddd4c2', '#22244a')}/>
      <rect x="${x0}" y="150" width="${x1 - x0}" height="78" ${hc('#f3ede0', '#2a2c50')}/>${[x0, x1 - 6].map((x) => `<rect x="${x}" y="150" width="6" height="78" ${hc('#5a3e2a', '#1e1830')}/>`).join('')}
      <path d="M${cx} 104 L${x1 + 10} 150 L${x1 + 28} 144 L${cx + 18} 99 Z" ${hc('#6a7282', '#22244a')}/><path d="${Array.from({ length: 6 }, (_, i) => { const t = (i + 1) / 7; return `M${f(cx + (x1 + 10 - cx) * t)} ${f(104 + 46 * t)} l18 -6`; }).join(' ')}" ${hs('#4a5262', '#14152c')} stroke-width=".9"/>
      <path d="M${x0 - 10} 152 L${cx} 102 L${x1 + 10} 152 L${x1 + 4} 154 L${cx} 108 L${x0 - 4} 154 Z" ${hc('#5f6878', '#1c1e38')}/><path d="M${x0 - 4} 152 L${cx} 108 L${x1 + 4} 152 Z" ${hc('#efe6d4', '#262848')}/>
      <path d="${Array.from({ length: 7 }, (_, i) => `M${cx - 18 + i * 6} 128 v14`).join(' ')}" ${hs('#8a6a48', '#2a2238')} stroke-width="1.6"/><rect x="${cx - 21}" y="126" width="42" height="18" fill="none" ${hs('#6e5236', '#24203a')} stroke-width="1.4"/>
      <path d="M${x0 - 8} 153 L${cx} 104 L${x1 + 8} 153" fill="none" ${hs('#4a3424', '#18142a')} stroke-width="3.2"/>
      <rect x="${x0 + 18}" y="154" width="${x1 - x0 - 36}" height="15" rx="1" ${hc('#2f5a3a', '#163028')}/><text x="${cx + 8}" y="165" text-anchor="middle" font-size="10" font-weight="700" letter-spacing="1.4" ${hc('#fbf8f0', '#e8f0e0')} ${SERIF}>観光案内所</text>
      <circle cx="${x0 + 30}" cy="161.5" r="6" ${hc('#fbf8f0', '#e8f0e0')}/><text x="${x0 + 30}" y="164.8" text-anchor="middle" font-size="9" font-weight="800" ${hc('#2f5a3a', '#163028')} font-family="Georgia, serif">i</text>
      <rect x="${w0 - 3}" y="171" width="${w1 - w0 + 6}" height="${sill - 171 + 2}" ${hc('#5a3e2a', '#1e1830')}/><rect x="${w0}" y="174" width="${w1 - w0}" height="${sill - 174}" ${hc('#e8dcc4', '#24203a')}/>
      ${open ? `<rect x="${w0}" y="174" width="${w1 - w0}" height="${sill - 174}" class="lit" style="opacity:calc(.1 + .6 * (1 - var(--day)))"/>` : ''}${racks}${open ? '' : `<rect x="${w0}" y="174" width="${w1 - w0}" height="${sill - 174}" fill="#141428" style="opacity:calc(.25 + .55 * (1 - var(--day)))"/>`}<rect x="${w0}" y="174" width="${w1 - w0}" height="3" fill="#2b1c12" fill-opacity=".2"/>
      <rect x="${w1 - 22}" y="176" width="18" height="24" ${hc('#fbf8f0', '#3a3c5a')}/><path d="M${w1 - 16} 186 q-2 -4 0 -7 M${w1 - 13} 186 q-2 -4 0 -7 M${w1 - 10} 186 q-2 -4 0 -7" fill="none" stroke="#d0574b" stroke-width="1"/><path d="M${w1 - 18} 190 q5 4 10 0" fill="none" stroke="#d0574b" stroke-width="1.2"/>
      <rect x="${x1 - 40}" y="176" width="30" height="60" ${hc('#8a6a48', '#2a2238')}/><rect x="${x1 - 37}" y="179" width="11" height="54" ${hc('#cfdce0', '#2c2e52')} opacity=".8"/><rect x="${x1 - 24}" y="179" width="11" height="54" ${hc('#cfdce0', '#2c2e52')} opacity=".8"/>
      <g class="fx-sway" style="animation-duration:4.4s"><path d="M${x1 - 25} 180 v4" stroke="#3b2a1c" stroke-width=".8"/><rect x="${x1 - 33}" y="184" width="16" height="7" rx="1" ${hc(open ? '#2f5a3a' : '#a8241c', '#3a2c40')}/><text x="${x1 - 25}" y="189.4" text-anchor="middle" font-size="4.2" fill="#fff" font-family="system-ui, sans-serif">${open ? '営業中' : '本日終了'}</text></g>
      <rect x="${x0 - 2}" y="228" width="${x1 - x0 + 18}" height="8" ${hc('#a8a296', '#2a2a46')}/>
      <g transform="translate(${x0 - 12} 150)"><path d="M10 2 h12" ${hs('#3b3b44', '#1c1d3c')} stroke-width="2"/><circle cx="8" cy="12" r="9" ${hc('#2f8a5a', '#1a4030')}/><circle cx="8" cy="12" r="7.4" fill="none" stroke="#fff" stroke-width="1"/><text x="8" y="16.4" text-anchor="middle" font-size="12" font-weight="800" fill="#fff" font-family="Georgia, serif">i</text><path d="M8 2 v1" stroke="#3b3b44" stroke-width="2"/></g>`;
  }
  // the counter in front of あかり: its ledge, the wooden front under it, a pane of glass over her with its light on it, the mullions
  // either side of her face (ANNAI.bars), a card on the counter under the right-hand pane
  function annaiFront() {
    const { win: [w0, w1], sill } = ANNAI;
    return `<rect x="${w0}" y="174" width="${w1 - w0}" height="${sill - 174}" fill="#cfe6ec" opacity=".12"/><path d="M${w0 + 8} ${sill - 4} l16 -32 M${w0 + 18} ${sill - 4} l8 -16 M${w1 - 30} ${sill - 4} l14 -28" stroke="#fff" stroke-opacity=".35" stroke-width="2.4"/>
      <path d="${ANNAI.bars.map((x) => `M${x} 174 V${sill}`).join(' ')}" ${hs('#5a3e2a', '#1e1830')} stroke-width="2"/>
      <rect x="${w0 - 6}" y="${sill}" width="${w1 - w0 + 12}" height="5" rx="1" ${hc('#a8743f', '#3a2c30')}/><rect x="${w0 - 6}" y="${sill + 4}" width="${w1 - w0 + 12}" height="2" fill="#2b1c12" fill-opacity=".3"/>
      <rect x="${w0 - 3}" y="${sill + 6}" width="${w1 - w0 + 6}" height="${228 - sill - 6}" ${hc('#7a5a3c', '#2a2234')}/><path d="${Array.from({ length: 16 }, (_, i) => `M${w0 + 2 + i * 7} ${sill + 7} V227`).join(' ')}" ${hs('#5a3e2a', '#1e1830')} stroke-width="1"/>
      <rect x="${w0 - 6}" y="228" width="${w1 - w0 + 12}" height="8" ${hc('#a8a296', '#2a2a46')}/><rect x="${w0 + 72}" y="${sill - 10}" width="18" height="10" rx="1" ${hc('#fbf8f0', '#3a3c5a')}/><path d="M${w0 + 75} ${sill - 7} h12 M${w0 + 75} ${sill - 4} h9" stroke="#3f9a8c" stroke-width="1"/>`;
  }
  // ---- 求人看板 (湯の花温泉's): a cork board on two posts under a little shingled roof, アルバイト募集 on its red band and four
  // flyers — the info desk's i, a futon, a gift box, a key on its wooden tag (the town's jobs: Task 4 puts them up) ----
  function jobBoard() {
    const x = 902, pin = (px, py) => `<circle cx="${px}" cy="${py}" r="1.4" fill="#d0453c"/>`;
    const flyer = (fx, fy, r, paper, art) => `<g transform="rotate(${r} ${fx + 9} ${fy})"><rect x="${fx + 0.8}" y="${fy + 1}" width="18" height="22" fill="#2b1c12" fill-opacity=".18"/><rect x="${fx}" y="${fy}" width="18" height="22" ${hc(paper, '#8a86a8')}/>${art}${pin(fx + 9, fy + 2)}<path d="M${fx + 3} ${fy + 17} h12 M${fx + 3} ${fy + 19.6} h9" stroke="#2b1c12" stroke-opacity=".3" stroke-width=".8"/></g>`;
    return `<g data-fx="osjobs"><rect x="${x + 4}" y="164" width="5" height="72" ${hc('#5a3e2a', '#1e1830')}/><rect x="${x + 51}" y="164" width="5" height="72" ${hc('#5a3e2a', '#1e1830')}/>
      <path d="M${x - 4} 166 L${x + 8} 156 H${x + 52} L${x + 64} 166 Z" ${hc('#6e5236', '#24203a')}/><path d="M${x - 4} 166 H${x + 64}" ${hs('#4a3424', '#18142a')} stroke-width="1.6"/>
      <rect x="${x}" y="166" width="60" height="46" rx="1" ${hc('#8a6a46', '#3a2c40')}/><rect x="${x + 3}" y="169" width="54" height="40" ${hc('#c9a06a', '#4a3c50')}/><rect x="${x + 3}" y="169" width="54" height="8" ${hc('#c8322a', '#5a2a3a')}/>
      <text x="${x + 30}" y="175.4" text-anchor="middle" font-size="5.6" font-weight="700" ${hc('#ffffff', '#f2e6d8')} font-family="system-ui, sans-serif">アルバイト募集</text>
      ${flyer(x + 5, 179, -4, '#fbf7ec', `<circle cx="${x + 14}" cy="${186}" r="4" fill="#2f8a5a"/><text x="${x + 14}" y="188.4" text-anchor="middle" font-size="6" font-weight="800" fill="#fff" font-family="Georgia, serif">i</text>`)}
      ${flyer(x + 18, 180, 3, '#f8d8de', `<rect x="${x + 21}" y="184" width="12" height="6" rx="1" fill="#f4efe4" stroke="#8a6a48" stroke-width=".6"/><rect x="${x + 21}" y="183" width="5" height="3" rx="1" fill="#e8a8bc"/>`)}
      ${flyer(x + 31, 179, -2, '#f6e9a8', `<rect x="${x + 35}" y="184" width="10" height="8" fill="#d0574b"/><path d="M${x + 40} 184 v8 M${x + 35} 188 h10" stroke="#f6e08a" stroke-width="1.2"/>`)}
      ${flyer(x + 43, 181, 5, '#dbe8f4', `<circle cx="${x + 49}" cy="187" r="2.4" fill="none" stroke="#6a6a74" stroke-width="1"/><path d="M${x + 51} 187 h4 v3" stroke="#6a6a74" stroke-width="1" fill="none"/><rect x="${x + 46}" y="${189}" width="6" height="4" fill="#a8743f"/>`)}</g>`;
  }
  // ---- the map board: a big wooden frame on two posts under its own little roof, a lamp over it by night; the town drawn by hand —
  // the hills, the river, the station (現在地), the street on to the steaming 湯畑, the ryokan by the street, the foot bath ----
  function mapBoard() {
    const x = 984, y = 130, w = 100, h = 66;
    return `<g data-fx="osmap"><rect x="${x + 8}" y="${y - 2}" width="7" height="${F - y + 2}" ${hc('#5a3e2a', '#1e1830')}/><rect x="${x + w - 15}" y="${y - 2}" width="7" height="${F - y + 2}" ${hc('#5a3e2a', '#1e1830')}/><rect x="${x + 13}" y="${y}" width="2" height="${F - y}" fill="#000" fill-opacity=".2"/>
      <path d="M${x - 8} ${y - 6} L${x + w / 2} ${y - 22} L${x + w + 8} ${y - 6} Z" ${hc('#5f6878', '#1c1e38')}/><path d="M${x - 8} ${y - 6} H${x + w + 8}" ${hs('#3a404e', '#101024')} stroke-width="2.4"/>
      <rect x="${x - 4}" y="${y - 4}" width="${w + 8}" height="${h + 8}" rx="2" ${hc('#6e5236', '#24203a')}/><rect x="${x}" y="${y}" width="${w}" height="${h}" ${hc('#f4ead2', '#5a5470')}/>
      <rect x="${x}" y="${y}" width="${w}" height="9" ${hc('#2f5a3a', '#163028')}/><text x="${x + w / 2}" y="${y + 6.8}" text-anchor="middle" font-size="5.8" font-weight="700" fill="#fff" ${SERIF}>湯の花温泉 観光マップ</text>
      <path d="M${x} ${y + 26} q14 -14 28 -4 q14 -12 30 -2 q16 -12 30 -2 q12 -8 20 -2 V${y + 9} H${x} Z" ${hc('#9ac48a', '#4a5a50')}/>
      <path d="M${x + 4} ${y + h} C${x + 20} ${y + 48} ${x + 30} ${y + 40} ${x + 46} ${y + 30} S${x + 72} ${y + 16} ${x + 80} ${y + 10}" fill="none" ${hs('#6ab0d8', '#4a5a8a')} stroke-width="3"/>
      <path d="M${x + 22} ${y + 54} H${x + 70} Q${x + 84} ${y + 54} ${x + 86} ${y + 40} L${x + 90} ${y + 26}" fill="none" ${hs('#b08a5a', '#5a4a3a')} stroke-width="2.6" stroke-dasharray="3 2"/>
      <rect x="${x + 12}" y="${y + 50}" width="12" height="9" ${hc('#f4efe4', '#8a86a8')}/><path d="M${x + 10} ${y + 51} l8 -6 l8 6 Z" fill="#c8453a"/><circle cx="${x + 18}" cy="${y + 62}" r="2.4" fill="#d0302a"/><text x="${x + 26}" y="${y + 64}" font-size="4" font-weight="700" fill="#d0302a" font-family="system-ui, sans-serif">現在地</text>
      <rect x="${x + 64}" y="${y + 42}" width="14" height="9" ${hc('#f4efe4', '#8a86a8')}/><path d="M${x + 62} ${y + 43} l9 -6 l9 6 Z" fill="#5f6878"/><text x="${x + 71}" y="${y + 49.4}" text-anchor="middle" font-size="4.2" font-weight="700" fill="#2b2b33" ${SERIF}>花月</text>
      <circle cx="${x + 92}" cy="${y + 20}" r="7" ${hc('#8fd0c8', '#4a6a8a')}/><path d="M${x + 89} ${y + 16} q-2 -3 0 -6 M${x + 92} ${y + 16} q-2 -3 0 -6 M${x + 95} ${y + 16} q-2 -3 0 -6" fill="none" stroke="#d0574b" stroke-width="1"/><text x="${x + 92}" y="${y + 33}" text-anchor="middle" font-size="4.2" font-weight="700" fill="#2b2b33" ${SERIF}>湯畑</text>
      <ellipse cx="${x + 34}" cy="${y + 47}" rx="5" ry="2.4" ${hc('#8fd0c8', '#4a6a8a')}/><path d="M${x + 32} ${y + 44} q-1 -2 0 -4 M${x + 35} ${y + 44} q-1 -2 0 -4" fill="none" stroke="#d0574b" stroke-width=".8"/>
      <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" stroke="#2b1c12" stroke-opacity=".2"/>
      <path d="M${x + w / 2} ${y - 6} v6" ${hs('#3b3b44', '#1c1d3c')} stroke-width="1.4"/><path d="M${x + w / 2 - 7} ${y} h14 l-3 4 h-8 Z" ${hc('#3b3b44', '#1c1d3c')}/><path class="glow" d="M${x + w / 2 - 4} ${y + 4} L${x - 4} ${y + h + 4} H${x + w + 4} L${x + w / 2 + 4} ${y + 4} Z" fill="url(#glw)" style="opacity:calc((1 - var(--day)) * .6)"/></g>`;
  }
  // ---- the mouth of 湯けむり通り on the right: the corner of a two-storey wooden house (latticed windows, a noren, a lantern), the
  // signpost with the street's name, a string of lanterns across, warm light by night; its way in (WAYS onsen>yudori, 2026-11-23) ----
  function street() {
    const lan = (x, y, k) => `<g class="fx-sway" style="animation-delay:-${(k * 0.7).toFixed(1)}s;animation-duration:${(3.2 + k * 0.3).toFixed(1)}s"><path d="M${x} ${y - 5} v5" stroke="#3b2a1c" stroke-width=".8"/><ellipse cx="${x}" cy="${y + 7}" rx="5.4" ry="7" ${hc('#d0302a', '#ff8a5a')}/><path d="M${x - 5} ${y + 5} q5 1.4 10 0 M${x - 5} ${y + 9} q5 1.4 10 0" fill="none" stroke="#8a1a1a" stroke-opacity=".45" stroke-width=".6"/><circle class="glow" cx="${x}" cy="${y + 7}" r="18" fill="url(#glw)"/></g>`;
    return `<path d="M1124 236 V118 L1160 98 L1226 98 V236 Z" ${hc('#8a6a48', '#2a2238')}/><path d="M1118 120 L1160 94 L1230 94" fill="none" ${hs('#4a5262', '#14152c')} stroke-width="7"/>
      <rect x="1124" y="156" width="102" height="5" ${hc('#5a3e2a', '#1e1830')}/><path d="M1118 158 L1230 158" ${hs('#4a5262', '#14152c')} stroke-width="5"/>
      <rect x="1138" y="118" width="40" height="28" ${hc('#5a3e2a', '#1e1830')}/><rect x="1140" y="120" width="36" height="24" ${hc('#efe2c8', '#ffd98a')}/><path d="${Array.from({ length: 8 }, (_, i) => `M${1144 + i * 4.4} 120 v24`).join(' ')}" ${hs('#6e5236', '#24203a')} stroke-width="1.2"/>
      <rect x="1138" y="172" width="44" height="64" ${hc('#3b2a1c', '#141428')}/><rect x="1138" y="172" width="44" height="64" class="lit" style="opacity:calc(.05 + .5 * (1 - var(--day)))"/>
      <g class="fx-sway" style="animation-duration:4.2s"><path d="M1136 172 h48 v24 h-48 Z" ${hc('#2f4a7a', '#1c2240')}/><path d="M1152 172 v24 M1168 172 v24" stroke="#fff" stroke-opacity=".25"/><text x="1160" y="188" text-anchor="middle" font-size="8" font-weight="700" fill="#f4efe4" ${SERIF}>ゆ</text></g>
      <path d="M1104 236 V150" ${hs('#6e5236', '#24203a')} stroke-width="6"/><rect x="1096" y="150" width="16" height="62" ${hc('#e8d8b4', '#4a3c50')}/><rect x="1096" y="150" width="16" height="62" fill="none" ${hs('#6e5236', '#24203a')} stroke-width="1.2"/>
      ${vText(1104, 152, '湯けむり通り', 9, `font-weight="700" ${hc('#3b2a1c', '#e8dcb4')} ${SERIF}`)}
      <path d="M1090 134 Q1160 152 1230 134" fill="none" ${hs('#3b2a1c', '#14142a')} stroke-width="1"/>${[1124, 1150, 1176, 1202].map((x, k) => lan(x, 138 + 4 * Math.sin((x - 1090) / 140 * Math.PI), k)).join('')}`;
  }
  // ---- the 人力車 standing on the square, its shafts to the right resting on the ground: the hood folded back in black pleats,
  // the back rest and the red cushion; before whoever sits in it the lacquered body with its gold line, the near wheel (red rim,
  // twelve spokes), the footboard and the shafts with their crossbar — two layers ----
  const RICK = { x: 1040, g: 304 };
  function rickBack() {
    const { x, g } = RICK;
    return `${groundShade(x + 30, g + 1, 92, 5)}<path d="M${x + 22} ${g - 50} L${x + 132} ${g - 8}" ${hs('#3b3b44', '#1c1d3c')} stroke-width="2.6"/>
      <path d="M${x - 26} ${g - 64} C${x - 36} ${g - 96} ${x - 70} ${g - 92} ${x - 70} ${g - 58} L${x - 54} ${g - 54} C${x - 56} ${g - 74} ${x - 42} ${g - 80} ${x - 32} ${g - 58} Z" ${hc('#2b2b33', '#141428')}/><path d="M${x - 33} ${g - 70} C${x - 42} ${g - 88} ${x - 62} ${g - 84} ${x - 64} ${g - 58} M${x - 30} ${g - 78} C${x - 40} ${g - 92} ${x - 60} ${g - 90} ${x - 67} ${g - 70}" fill="none" stroke="#5a5a66" stroke-width="1.2"/><path d="M${x - 70} ${g - 58} L${x - 54} ${g - 54}" ${hs('#1f1f26', '#101020')} stroke-width="2"/>
      <path d="M${x - 34} ${g - 62} L${x - 28} ${g - 98} H${x - 12} L${x - 16} ${g - 62} Z" ${hc('#1f1f26', '#101020')}/><path d="M${x - 30} ${g - 66} L${x - 25.6} ${g - 92} H${x - 16} L${x - 19} ${g - 66} Z" ${hc('#c8322a', '#4a1e2a')}/>
      <rect x="${x - 32}" y="${g - 72}" width="50" height="10" rx="3" ${hc('#d0453c', '#5a2030')}/><path d="M${x - 30} ${g - 70} h46" stroke="#fff" stroke-opacity=".25" stroke-width="1.2"/>`;
  }
  function rickFront() {
    const { x, g } = RICK, cy = g - 30, spokes = Array.from({ length: 12 }, (_, i) => { const a = i * Math.PI / 6; return `M${x} ${cy} l${f(27 * Math.cos(a))} ${f(27 * Math.sin(a))}`; }).join(' ');
    return `<path d="M${x - 34} ${g - 62} H${x + 18} L${x + 26} ${g - 44} H${x - 28} Z" ${hc('#1f1f26', '#101020')}/><path d="M${x - 30} ${g - 56} H${x + 20}" ${hs('#d9b04a', '#6a5a30')} stroke-width="1.2"/><path d="M${x - 34} ${g - 62} H${x + 18}" stroke="#fff" stroke-opacity=".22" stroke-width="1.4"/>
      <path d="M${x + 22} ${g - 46} L${x + 50} ${g - 34} L${x + 49} ${g - 30} L${x + 20} ${g - 41} Z" ${hc('#8a6a48', '#2a2238')}/>
      <path d="M${x + 20} ${g - 48} L${x + 128} ${g - 4}" ${hs('#2b2b33', '#141428')} stroke-width="3.4"/><path d="M${x + 126} ${g - 9} v9 M${x + 118} ${g} h16" ${hs('#2b2b33', '#141428')} stroke-width="2.4"/>
      <circle cx="${x}" cy="${cy}" r="30" fill="none" ${hs('#2b2b33', '#141428')} stroke-width="2.6"/><circle cx="${x}" cy="${cy}" r="28" fill="none" ${hs('#c8322a', '#5a2030')} stroke-width="3.2"/><path d="${spokes}" ${hs('#3b3b44', '#1c1d3c')} stroke-width="1.2"/>
      <circle cx="${x}" cy="${cy}" r="5" ${hc('#c8322a', '#5a2030')}/><circle cx="${x}" cy="${cy}" r="2" fill="#2b2b33"/><path d="M${x - 20} ${cy - 20} a28 28 0 0 1 16 -7" fill="none" stroke="#fff" stroke-opacity=".3" stroke-width="1.4"/>`;
  }
  // the square: stone slabs set in rows, the joints, a drain with a wisp of steam; a darker edge along the buildings' feet
  function square() {
    let joints = '';
    for (let r = 0; r < 7; r++) { const y = F + 6 + r * (10 + r * 2.4), h = 10 + r * 2.4, w = 34 + r * 9; joints += `M-20 ${f(y + h)} H1220 `; for (let x = -20 + (r % 2) * w / 2; x < 1220; x += w) joints += `M${f(x)} ${f(y)} v${f(h)} `; }
    return `<rect x="-20" y="${F}" width="1240" height="140" style="fill:color-mix(in srgb, #d8d0c0 calc(var(--day) * 100%), #2a2a48)"/><path d="${joints}" fill="none" ${hs('#bdb4a2', '#1e1e3a')} stroke-width="1.2"/>
      <rect x="-20" y="${F}" width="1240" height="5" fill="#2b1c12" style="opacity:calc(.05 + .08 * var(--day))"/>
      <rect x="760" y="322" width="26" height="7" rx="1" ${hc('#8a8478', '#1e1e38')}/><path d="M763 322 v7 M768 322 v7 M773 322 v7 M778 322 v7 M783 322 v7" ${hs('#5a554a', '#141428')} stroke-width="1"/><g class="fx-steam" style="animation-duration:6s"><path d="M773 320 q-4 -6 0 -11 q4 -6 0 -12" fill="none" stroke="#fff" stroke-opacity=".6" stroke-width="2.2" stroke-linecap="round"/></g>`;
  }
  function html() {
    const open = akariHere();
    return `<svg class="land tall onsen-land" viewBox="0 -400 1200 770" preserveAspectRatio="xMidYMax slice">${GLOW_DEFS}${steamDefs()}
      ${hills()}${station()}${bathBack()}${annaiBack(open)}${jobBoard()}${mapBoard()}${street()}${square()}
    </svg>
    ${landProp(110, bathFront(), null, [BATH.x0 - 12, 140, BATH.x1 + 24, BATH.water[1] + 14])}
    ${landProp(130, annaiFront(), null, [ANNAI.win[0] - 8, 170, ANNAI.win[1] + 8, 238])}
    ${landProp(74, rickBack(), null, [RICK.x - 70, RICK.g - 104, RICK.x + 140, RICK.g + 8])}${landProp(60, rickFront(), null, [RICK.x - 40, RICK.g - 66, RICK.x + 140, RICK.g + 6])}
    ${yHeroHtml()}
    ${TOWNEV.castHtml('onsen')}
    <button type="button" class="thing way-btn way-edge" data-act="go-place" data-to="yudori" aria-label="往湯けむり通り" style="margin-left:${560 - 32}px;bottom:150px"><span class="tag">${ySign('shop', '湯けむり通り')}</span></button>
    <div class="ysel"></div>`;
  }
  // ---- the 足湯 sat on (ySit → its sat; up again → its up): the hero's legs down in the water, his shoes left on the rim beside
  // him, rings round his feet; up again, his shoes back on ----
  function soak(yard, X, on) {
    const h = yard && yard.querySelector('.yhero'), g = yard && yard.querySelector('.land [data-fx="ashiyu"] .os-soakrings'); if (!h) return;
    h.classList.toggle('os-soak', on);
    if (!g) return;
    const x = X + 600, shoe = (state.look && state.look.shoe) || '#2b2b33';
    g.innerHTML = on ? `${[0, 1].map((k) => `<ellipse class="fx-ripple" cx="${x + 2}" cy="${BATH.water[0] + 3}" rx="9" ry="2.2" fill="none" stroke="#fff" stroke-opacity=".9" stroke-width="1.2" style="animation-delay:-${k * 1.6}s;animation-duration:3.2s"/>`).join('')}
      <g transform="translate(${x + 15} ${BATH.water[1] - 3})"><path d="M-4.4 0 h3.6 v-2 q0 -1.4 -1.4 -1.4 h-1 q-1.6 0 -1.6 1.4 Z M.6 0 h3.6 v-2 q0 -1.4 -1.4 -1.4 h-1 q-1.6 0 -1.6 1.4 Z" fill="${shoe}"/></g>` : '';
  }
  // ---- the first time here while あかり is at her window: her ようこそ over her head, in her voice, and what this place is ----
  function mount(y, place) {
    if (place !== 'onsen') return;
    const arrived = () => Boolean((state.town.arrived || {}).onsen);
    if (arrived()) return;
    setTimeout(() => {
      const a = y.querySelector('.npc-akari'), w = W().welcome;
      if (!y.isConnected || arrived() || !a || !w || !akariHere()) return;
      state.town.arrived = Object.assign({}, state.town.arrived, { onsen: 1 }); saveState();
      const [X, Y] = npcXY(a), k = yScale(Y) * ((TOWN.CAST.akari || {}).size || 1);
      yBubble(y, X + 600, 370 - Y - 200 * k, ruby(w[0]), 3600); speakAs('akari', w[0]); toast(w[2] || w[1], 6000);
      look(y, X);
    }, 900);
  }
  // the camera over to her window while she calls (on a phone she is far off on the right as he comes out of the station), held
  // a moment, then back to him; a walk meanwhile takes it back at once (yHeroWalk frees it)
  function look(y, X) {
    if (Math.abs(X - ycam.x) < ycam.W * 0.3 || (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches)) return;
    const glide = (to, ms, done) => { const x0 = ycam.x, t0 = performance.now(); const step = (now) => { if (!y.isConnected || !YCAM.free) return; const k = Math.min(1, (now - t0) / ms); yCamTo(y, x0 + (to - x0) * (1 - Math.cos(Math.PI * k)) / 2); if (k < 1) requestAnimationFrame(step); else if (done) done(); }; requestAnimationFrame(step); };
    YCAM.free = true; glide(X, 800, () => setTimeout(() => { if (y.isConnected && YCAM.free) glide(yh.X, 800, () => { YCAM.free = false; }); }, 2600));
  }
  // the station's departure board: the next two out of 湯の花 (やまなみ線, to 白鷺)
  const boardSay = () => { const n = sceneHour(); return `湯の花駅 下一班電車：${EKI.next(Math.floor(n), Math.floor((n % 1) * 60), 2, 'yunohana').map((x) => `${x.t} ${x.kind} ${EKI.name(x.to)}（${x.track}番線）`).join('・')}；到白鷺換みなと線。`; };
  // the 観光案内所's window: あかり there — a word with her (as tapping her); shut — when it opens
  function window_(yard) {
    const a = yard.querySelector('.npc-akari');
    if (a && akariHere()) { TOWNEV.talk(a); return; }
    const hrs = ((TOWN.CAST.akari || {}).hours || []).find((x) => x[2] === 'onsen') || [9, 18];
    yPop(yard, yh.X + 600, 370 - yh.Y - 200 * yScale(yh.Y), 'しまってる…'); toast(`観光案内所：${hrs[0]}:00〜${hrs[1]}:00 開。`, 3000);
  }
  // the 人力車 sat in: a photo — the flash, the shutter
  function photo(yard) {
    setTimeout(() => { if (!yard.isConnected || !yh.use) return; SND.play('shutter', { vol: 0.7 }); const fl = document.createElement('i'); fl.className = 'os-flash'; yard.appendChild(fl); setTimeout(() => fl.remove(), 700); }, 1100);
  }
  return { html, mount, soak, boardSay, window: window_, photo, steam, steamDefs, leafLit };   // steam, steamDefs, leafLit: 湯けむり通り's and 湯畑's too
})();
function onsenHtml() { return ONSEN.html(); }
// the things on 湯の花駅前 to use (spec §3.1): the 改札 (the way home: its ticket machine), the departure board, the bench and the post
// box, the 足湯 (sat on, his feet in it), the 観光案内所's window, the 求人看板, the map board, the 人力車 (a photo)
PLACE_USE.onsen = [
  { id: 'gate', name: '剪票口', box: [56, 140, 164, 236], kind: 'do', go: [-490, 126], back: 1, pose: 'reach', open: (y) => RIDE.machine(y, 'yunohana') },
  { id: 'board', name: '發車標', box: [190, 160, 286, 184], kind: 'do', go: [-362, 126], back: 1, pose: 'look', toast: () => ONSEN.boardSay() },
  { id: 'clock', name: '時鐘', box: [226, 114, 250, 138], kind: 'do', go: [-362, 126], back: 1, pose: 'look', toast: () => { const h = sceneHour(); return `湯の花駅的時鐘：${Math.floor(h)} 點 ${String(Math.floor((h % 1) * 60)).padStart(2, '0')} 分`; } },
  { id: 'bench', name: '長椅', box: [328, 206, 416, 230], kind: 'sit', seats: [-250, -212], top: 158, dep: 138 },
  { id: 'post', name: '郵筒', box: [444, 188, 466, 236], kind: 'do', go: [-145, 126], back: 1, pose: 'reach', say: 'ポトン' },
  // the 足湯: sat on its back bench over the water (walked up to its front first), his feet in it; up again, his shoes back on
  { id: 'ashiyu', name: '足湯', box: [488, 196, 680, 262], kind: 'sit', seats: [-80, -40, 0, 40, 72], top: 144, dep: 138, front: 102, z: 160, say: 'あったか〜い', sat: (y, X) => ONSEN.soak(y, X, true), up: (y) => ONSEN.soak(y, 0, false) },
  { id: 'annai', name: '観光案内所', box: [722, 150, 818, 212], kind: 'do', go: [196, 126], back: 1, pose: 'look', open: (y) => ONSEN.window(y) },   // beside the window, not before her face
  { id: 'jobs', name: '求人看板', box: [898, 156, 966, 212], kind: 'do', go: [332, 126], back: 1, pose: 'look', say: 'アルバイト…？', toast: '湯の花温泉的打工：要打工證「ベテラン」，還要學到 N4（第 7 單元起）。' },
  { id: 'map', name: '觀光地圖', box: [978, 108, 1088, 200], kind: 'do', go: [434, 126], back: 1, pose: 'look', toast: '湯の花温泉 觀光地圖：從車站往右是「湯けむり通り」，伴手禮店和旅館「花月」都在路邊；一直走到底，冒著白煙的是「湯畑」。' },
  { id: 'rick', name: '人力車', box: [984, 206, 1090, 306], kind: 'sit', seats: [432], top: 132, dep: 66, z: 234, say: 'はい、チーズ！', sat: (y) => ONSEN.photo(y) }
];
