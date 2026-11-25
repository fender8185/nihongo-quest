'use strict';
// ---------- 湯畑 (2026-11-23, 湯の花温泉; docs/superpowers/specs/2026-11-23-onsen-work-design.md §3.3, §6) ----------
// The square at the top of 湯けむり通り, seen side on as the other places out of doors are (F: the line its railing stands on), lit by
// night through hc(). In its middle the 湯畑: the spring's water led down rows of wooden troughs (湯樋), their sides crusted yellow-white
// with 湯の花, cooling as it goes, over a fall into a jade-green pool; steam rising off all of it (ONSEN.steam: soft puffs, moved by
// transform only) and, by night, lit in colours slowly changing (the light-up); a stone railing round it. Behind it the inns, their
// windows lit by night, and the hills. On the square: benches along the railing (visitors in yukata sat on some), the wooden stage
// where the water was once stirred to cool it (湯もみ), stone lanterns, and on the left — where the street comes out — the egg stand
// nobody keeps (無人販売所): eggs in a basket in the hot water, a hand-written sign — ひとつ 100円。お金は この 箱へ — and the box. Its
// eggs are bought by reading that sign: the right coin into the box (YEN.pay), one egg taken (MENU tamago, opened by たまご).
const YUBATAKE = (() => {
  const F = 236, f = (n) => n.toFixed(1);
  const RUBY = /\{([^|}]+)\|([^|}]+)(?:\|[^}]+)?\}/g, ruby = (s) => esc(s).replace(RUBY, '<ruby>$1<rt>$2</rt></ruby>');
  const calm = () => window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  // ---- the light-up (by night): three soft lights of their own colours over the steam, each brightening and fading in turn, so the
  // steam's colour drifts slowly from violet to blue to pink; nothing by day. lightDefs: their gradients, once in a land's <svg>
  // (湯けむり通り's too, the 湯畑 at its far end) ----
  const LIGHTS = [['ybL1', '#a07ae8'], ['ybL2', '#4ac8f0'], ['ybL3', '#f07ab8']];
  const puffDefs = () => '<defs><radialGradient id="ybPuff"><stop offset="0" style="stop-color:var(--os-puff)" stop-opacity=".95"/><stop offset=".45" style="stop-color:var(--os-puff)" stop-opacity=".72"/><stop offset=".75" style="stop-color:var(--yb-edge)" stop-opacity=".34"/><stop offset="1" style="stop-color:var(--yb-edge)" stop-opacity="0"/></radialGradient></defs>';
  const ybSteam = (puffs, cls) => ONSEN.steam(puffs, cls).replace(/url\(#osPuff\)/g, 'url(#ybPuff)');   // the 湯畑's (puffDefs): an edge of its own
  const lightDefs = () => `<defs>${LIGHTS.map(([id, c]) => `<radialGradient id="${id}"><stop offset="0" stop-color="${c}" stop-opacity=".75"/><stop offset=".55" stop-color="${c}" stop-opacity=".3"/><stop offset="1" stop-color="${c}" stop-opacity="0"/></radialGradient>`).join('')}</defs>`;
  const lights = (cx, cy, rx, ry) => `<g class="yb-light" aria-hidden="true">${LIGHTS.map(([id], i) => `<ellipse class="yb-hue" cx="${f(cx + (i - 1) * rx * 0.3)}" cy="${f(cy)}" rx="${f(rx)}" ry="${f(ry)}" fill="url(#${id})" style="animation-delay:-${i * 7}s"/>`).join('')}</g>`;
  // ---- behind: the far range (snow on its peaks in winter), the near hills under cedars with the season's trees, mist along their
  // foot; the inns round the 湯畑 — wooden, two and three storeys, their side walls going back, eaves with their shadow, balconies
  // with railings out over the street below, windows lit by night ----
  const ridge = (pts, base) => { let d = `M${pts[0][0]} ${base} L${pts[0][0]} ${pts[0][1]}`; for (let i = 1; i < pts.length - 1; i++) { const [x, y] = pts[i], [nx, ny] = pts[i + 1]; d += ` Q${x} ${y} ${f((x + nx) / 2)} ${f((y + ny) / 2)}`; } const [lx, ly] = pts[pts.length - 1]; return `${d} L${lx} ${ly} L${lx} ${base} Z`; };
  const FARR = [[-20, -96], [110, -150], [230, -118], [340, -196], [450, -140], [560, -176], [660, -226], [770, -168], [880, -204], [990, -132], [1100, -170], [1220, -120]];
  const NEARH = [[-20, -10], [90, -46], [200, -24], [320, -70], [440, -40], [560, -84], [680, -52], [800, -76], [920, -36], [1040, -62], [1140, -30], [1220, -44]];
  function back() {
    const m = (typeof sceneDate === 'function' ? sceneDate() : new Date()).getMonth() + 1, [c1, c2, c3] = typeof seasonLeaves === 'function' ? seasonLeaves(m) : ['#7fa86a', '#6f9a5c', '#8ab86e'], winter = m === 12 || m <= 2;
    const lerp = (P, x) => { const i = Math.max(0, P.findIndex((q) => q[0] > x) - 1), [x0, y0] = P[i], [x1, y1] = P[i + 1] || P[i]; return y0 + (y1 - y0) * ((x - x0) / ((x1 - x0) || 1)); };
    const snow = winter ? FARR.filter(([, y]) => y < -170).map(([x, y]) => `<path d="M${x - 26} ${y + 18} Q${x - 8} ${y - 1} ${x} ${y + 1} Q${x + 8} ${y - 1} ${x + 26} ${y + 18} q-9 -4 -13 2 q-6 -6 -11 0 q-6 -5 -10 -2 Z" ${hc('#f6f8fc', '#5a6090')}/>`).join('') : '';
    let trees = '';
    for (let x = -10; x < 1215; x += 13) { const k = Math.floor(x / 13);
      [0, 1, 2].forEach((r) => { const y = lerp(NEARH, x) + 14 + r * 22 + ((k * 7 + r * 3) % 9), h = 22 + ((k * 5 + r * 11) % 16); if (y > 120) return;
        trees += (k + r) % 5 === 2 ? `<circle cx="${x + 2}" cy="${y - 9}" r="7" ${ONSEN.leafLit([c1, c2, c3][(k + r) % 3], 0.3, 0.7)}/><circle cx="${x - 4}" cy="${y - 5}" r="5" ${ONSEN.leafLit([c2, c3, c1][(k + r) % 3], 0.28, 0.66)}/>`
          : `<path d="M${x} ${f(y - h)} L${f(x + h * 0.28)} ${f(y)} H${f(x - h * 0.28)} Z" ${(k + r) % 2 ? hc('#3f6a4c', '#0e1828') : hc('#4f7a58', '#121e34')}/><path d="M${x} ${f(y - h)} L${f(x + h * 0.28)} ${f(y)} H${x} Z" fill="#0e1a12" style="opacity:calc(.04 + .12 * var(--day))"/>`; }); }
    const hills = `<path d="${ridge(FARR, 160)}" ${hc('#a9b9cb', '#1d2346')}/>${snow}<rect x="-20" y="-90" width="1240" height="70" fill="#fff" style="opacity:calc(.13 * var(--day))"/>
      <path d="${ridge(NEARH, 160)}" ${hc('#6f9478', '#16223c')}/>${trees}<rect x="-20" y="40" width="1240" height="120" fill="#fff" style="opacity:calc(.16 * var(--day))"/>`;
    // an inn: its front (plaster upstairs between dark posts, its floors' windows — paper, lit by night — and balconies with railings
    // standing out), its side wall going back on the right in shade, the eaves over each floor with their shadow, the tiled roof (its
    // far slope, the ridge), the street's level hidden behind the 湯畑
    const inn = (x, w, floors, roof, sign) => { const fh = 30, b = 156, t = b - floors * fh - 6, side = 18;
      let g = `<path d="M${x + w} ${b} L${x + w + side} ${b - 10} V${t - 10} L${x + w} ${t} Z" ${hc('#6e5236', '#1c1a34')}/><path d="M${x + w} ${b} L${x + w + side} ${b - 10} V${t - 10} L${x + w} ${t} Z" fill="#1a1030" fill-opacity=".22"/>
        <rect x="${x}" y="${t}" width="${w}" height="${b - t}" ${hc('#7a5a3c', '#221c34')}/><path d="${Array.from({ length: Math.floor(w / 6) }, (_, k) => `M${x + 3 + k * 6} ${t} V${b}`).join(' ')}" ${hs('#6a4c32', '#1a1630')} stroke-width=".8"/>`;
      for (let i = 0; i < floors; i++) { const fy = t + 6 + i * fh, wy = fy + 6, wh = fh - 14;
        g += `<rect x="${x + 6}" y="${wy}" width="${w - 12}" height="${wh}" ${hc('#efe6d2', '#ffd98a')}/><rect x="${x + 6}" y="${wy}" width="${w - 12}" height="${wh}" class="lit" style="opacity:calc(${(0.04 + i * 0.05).toFixed(2)} + .6 * (1 - var(--day)))"/>`
          + `<path d="${Array.from({ length: Math.floor((w - 12) / 10) }, (_, k) => `M${x + 11 + k * 10} ${wy} v${wh}`).join(' ')}" ${hs('#6e5236', '#24203a')} stroke-width="1"/><rect x="${x + 6}" y="${wy}" width="${w - 12}" height="3" fill="#2b1c12" fill-opacity=".2"/>`
          + `<path d="M${x - 6} ${fy} H${x + w + 6} L${x + w + 6 + side * 0.6} ${fy - 6} H${x - 6 + side * 0.6} Z" ${hc('#5a6272', '#1c1e38')}/><rect x="${x - 6}" y="${fy}" width="${w + 12}" height="2.4" ${hc('#3a404e', '#101024')}/><rect x="${x}" y="${fy + 2.4}" width="${w}" height="4" fill="#1a1030" fill-opacity=".18"/>`;
        if (i < floors - 1 || floors === 1) g += `<rect x="${x + 2}" y="${fy + fh - 9}" width="${w - 4}" height="2.6" ${hc('#8a6a48', '#2a2238')}/><path d="${Array.from({ length: Math.floor((w - 4) / 5) + 1 }, (_, k) => `M${x + 3 + k * 5} ${fy + fh - 9} v-7`).join(' ')}" ${hs('#5a3e2a', '#1e1830')} stroke-width="1"/><path d="M${x + 2} ${fy + fh - 16} H${x + w - 2}" ${hs('#5a3e2a', '#1e1830')} stroke-width="1.8"/><rect x="${x + 2}" y="${fy + fh - 6.4}" width="${w - 4}" height="3" fill="#1a1030" fill-opacity=".16"/>`;
      }
      g += [x, x + w - 4].map((px) => `<rect x="${px}" y="${t}" width="4" height="${b - t}" ${hc('#5a3e2a', '#1e1830')}/>`).join('');
      g += `<path d="M${x - 14} ${t + 2} L${x + 10} ${t - 22} H${x + w - 10} L${x + w + 14 + side} ${t - 10} L${x + w + 14} ${t + 2} Z" ${hc(roof, '#1a1c36')}/><path d="${Array.from({ length: Math.floor((w + 20) / 7) }, (_, k) => `M${x - 8 + k * 7} ${t + 1} l5 -22`).join(' ')}" stroke="#000" stroke-opacity=".16" stroke-width=".8"/>
        <path d="M${x + 10} ${t - 22} H${x + w - 10} L${x + w + side - 4} ${t - 28}" fill="none" ${hs('#2e3444', '#101128')} stroke-width="3"/><path d="M${x - 14} ${t + 2} H${x + w + 14}" ${hs('#2e3444', '#101128')} stroke-width="2.6"/><rect x="${x - 10}" y="${t + 3}" width="${w + 20}" height="5" fill="#1a1030" fill-opacity=".16"/>`;
      if (sign) g += `<rect x="${x + w / 2 - 9}" y="${t + 4}" width="18" height="${sign.length * 12 + 6}" ${hc('#4a3424', '#18142a')}/>${vText(x + w / 2, t + 6, sign, 11, `font-weight="700" ${hc('#f4e6c4', '#ffe9b0')} ${SERIF}`)}`;
      return g; };
    return `${hills}${inn(96, 168, 3, '#4f5868', '')}${inn(300, 132, 2, '#56606e', '')}${inn(470, 210, 3, '#3f4858', '湯の宿')}${inn(728, 150, 2, '#4f5868', '')}${inn(920, 176, 3, '#56606e', '')}`;
  }
  // ---- the 湯畑: the bed sunk below the square (rock streaked with the water's colours), the source's box at the back left, the
  // troughs in rows from the back to the front — wooden boxes on short legs, the water running in them, 湯の花 crusted on their sides in
  // yellow-white patches, dripping — sloping a little down to the right, where they pour into the channel and over the fall into the
  // jade-green pool; the steam rising thick off it all, and by night the lights over it ----
  const BED = { x0: 300, x1: 900, back: 152 };
  function yubatake() {
    const { x0, x1, back: bk } = BED, fx = x1 - 132;
    let g = `<path d="M${x0} ${F} L${x0 + 30} ${bk} H${x1 - 30} L${x1} ${F} Z" ${hc('#6a665a', '#20203a')}/><path d="M${x0 + 30} ${bk} H${x1 - 30} L${x1 - 26} ${bk + 6} H${x0 + 26} Z" ${hc('#4e4a40', '#16162e')}/>
      ${[0.3, 0.55, 0.8].map((u) => `<path d="M${f(x0 + 30 - 30 * u)} ${f(bk + (F - bk) * u)} H${f(x1 - 30 + 30 * u)}" ${hs('#8fc8b8', '#2a4a5a')} stroke-width="5" opacity=".4"/>`).join('')}
      <path d="M${x0 + 40} ${F - 10} q60 -8 120 0 t120 0 t120 0 t120 0" fill="none" ${hs('#e8dca0', '#4a4a50')} stroke-width="4" opacity=".45"/>`;
    // the source's box at the back left, its water spilling into the first trough
    g += `<rect x="${x0 + 34}" y="${bk - 8}" width="44" height="28" ${hc('#7a5a3a', '#2a2238')}/><rect x="${x0 + 34}" y="${bk - 12}" width="44" height="5" ${hc('#a8845a', '#3a3048')}/><rect x="${x0 + 38}" y="${bk - 9}" width="36" height="4" ${hc('#8fd8cc', '#2a5a6e')}/><path d="M${x0 + 34} ${bk + 12} h44" ${hs('#efe4a6', '#6a6a52')} stroke-width="3"/>`;
    const rows = 5;
    for (let i = 0; i < rows; i++) {
      const u = i / (rows - 1), y = bk + 18 + u * 58, a = x0 + 60 - u * 30, b = fx - 4 + u * 6, h = 6 + u * 5, d = 2.6 + u * 2.4, slope = 8 + u * 2, leg = 6 + u * 5;
      const yAt = (x) => y + slope * (x - a) / (b - a);
      // its legs, its shadow on the bed, the box (front face, top edge), the water running in it, the crust in patches with drips
      g += Array.from({ length: Math.floor((b - a) / 46) + 1 }, (_, k) => { const lx = a + 10 + k * 46; return lx > b - 6 ? '' : `<rect x="${f(lx)}" y="${f(yAt(lx) + h)}" width="${f(2.4 + u * 1.6)}" height="${f(leg)}" ${hc('#5a3e2a', '#1e1830')}/>`; }).join('')
        + `<path d="M${f(a)} ${f(y + h + leg)} L${f(b)} ${f(y + slope + h + leg)}" ${hs('#2b241c', '#0e0e22')} stroke-width="${f(2 + u * 2)}" opacity=".35"/>`
        + `<path d="M${f(a)} ${f(y)} L${f(b)} ${f(y + slope)} V${f(y + slope + h)} L${f(a)} ${f(y + h)} Z" ${hc('#7a5a3a', '#2a2238')}/>`
        + `<path d="M${f(a)} ${f(y - d)} L${f(b)} ${f(y + slope - d)} L${f(b)} ${f(y + slope)} L${f(a)} ${f(y)} Z" ${hc('#a8845a', '#3a3048')}/>`
        + `<path d="M${f(a + 3)} ${f(y - d * 0.55)} L${f(b - 2)} ${f(y + slope - d * 0.55)}" class="yb-flow" ${hs('#9ae4d8', '#3a6a8a')} stroke-width="${f(d * 0.6)}" style="animation-delay:-${(i * 0.37).toFixed(2)}s"/>`
        + Array.from({ length: 7 }, (_, k) => { const x = a + (b - a) * (k + 0.3 + ((i * 3 + k) % 4) * 0.08) / 7, w = 14 + ((i + k) % 3) * 8, yy = yAt(x);
          return `<path d="M${f(x)} ${f(yy + h * 0.3)} q${f(w * 0.25)} ${f(-h * 0.25)} ${f(w * 0.5)} 0 q${f(w * 0.25)} ${f(h * 0.2)} ${f(w * 0.5)} ${f(h * 0.1)} v${f(h * 0.7)} q${f(-w * 0.2)} ${f(3 + (k % 3) * 2)} ${f(-w * 0.35)} 0 q${f(-w * 0.15)} ${f(2)} ${f(-w * 0.3)} ${f(-1)} q${f(-w * 0.2)} ${f(4 + (k % 2) * 3)} ${f(-w * 0.35)} ${f(-1)} Z" ${hc('#efe4a6', '#6a6a52')} fill-opacity=".92"/>`; }).join('');
    }
    // the channel down at the right, the fall into the pool (its streaks running), the pool in its rim of stones, ripples
    g += `<rect x="${fx - 2}" y="${bk + 14}" width="18" height="${F - bk - 52}" ${hc('#7a5a3a', '#2a2238')}/><rect x="${fx + 1}" y="${bk + 14}" width="12" height="${F - bk - 52}" ${hc('#9ae4d8', '#3a6a8a')}/><rect x="${fx - 2}" y="${bk + 14}" width="18" height="4" ${hc('#a8845a', '#3a3048')}/>
      <path d="M${fx + 16} ${F - 46} h84 l14 20 h-112 Z" ${hc('#8a8478', '#24243e')}/><path d="M${fx + 16} ${F - 46} h84" ${hs('#efe4a6', '#6a6a52')} stroke-width="3"/>
      <rect x="${fx + 20}" y="${F - 44}" width="78" height="22" ${hc('#cfeef0', '#4a6a8a')} opacity=".8"/>
      <g class="yb-fall">${[0, 1, 2, 3, 4, 5].map((k) => `<path d="M${fx + 24 + k * 14} ${F - 44} q2 11 0 22" fill="none" stroke="#fff" stroke-opacity=".85" stroke-width="3" stroke-dasharray="6 8" style="animation-delay:-${(k * 0.17).toFixed(2)}s"/>`).join('')}</g>
      <ellipse cx="${fx + 62}" cy="${F - 11}" rx="100" ry="14" ${hc('#a8a296', '#2c2c48')}/><ellipse cx="${fx + 62}" cy="${F - 12}" rx="92" ry="10.4" ${hc('#3fb8a2', '#1a4a5a')}/><ellipse cx="${fx + 62}" cy="${F - 12}" rx="92" ry="10.4" fill="#7fe0cc" style="opacity:calc(.08 + .1 * var(--day))"/><ellipse cx="${fx + 50}" cy="${F - 15}" rx="56" ry="3.6" fill="#fff" style="opacity:calc(.12 + .26 * var(--day))"/>
      ${[0, 1, 2].map((k) => `<ellipse class="fx-ripple" cx="${fx + 34 + k * 30}" cy="${F - 11}" rx="10" ry="2" fill="none" stroke="#fff" stroke-opacity=".75" stroke-width="1" style="animation-delay:-${(k * 1.1).toFixed(1)}s"/>`).join('')}`;
    // the steam: off every row of troughs and thick over the fall and the pool (16 puffs), big slow clouds of it rising over all (8),
    // and the lights over it by night
    const puffs = ybSteam([[x0 + 70, bk + 4, 26, 0], [x0 + 170, bk + 10, 30, 2.4], [x0 + 280, bk + 4, 28, 4.8], [x0 + 390, bk + 12, 32, 7.2],
      [x0 + 110, bk + 34, 32, 1.2], [x0 + 230, bk + 40, 36, 3.6], [x0 + 340, bk + 30, 30, 6.0], [x0 + 440, bk + 44, 34, 8.4],
      [x0 + 60, bk + 64, 30, 2.0], [x0 + 190, bk + 70, 34, 5.2], [x0 + 310, bk + 66, 32, 0.6], [x0 + 420, bk + 72, 30, 3.0],
      [fx + 30, F - 40, 34, 1.6], [fx + 80, F - 34, 40, 4.4], [fx + 120, F - 30, 32, 7.0], [fx + 60, F - 70, 44, 5.8]]);
    const clouds = ybSteam([[x0 + 90, bk + 26, 58, 0], [x0 + 230, bk + 34, 64, 4.6], [x0 + 370, bk + 22, 60, 9.2], [x0 + 160, bk + 62, 62, 2.3], [x0 + 300, bk + 66, 66, 6.9], [x0 + 440, bk + 58, 58, 11.5], [fx + 50, F - 44, 66, 3.4], [fx + 110, F - 52, 56, 8.0]], 'yb-cloud');
    // and the haze that always hangs low over it, still (whatever the moment, the 湯畑 is steaming)
    const haze = [[x0 + 150, bk + 40, 150, 34], [x0 + 380, bk + 46, 150, 34], [fx + 60, F - 30, 110, 30]].map(([cx, cy, rx, ry]) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="url(#ybPuff)" opacity=".55"/>`).join('');
    return g + haze + clouds + puffs + lights((x0 + x1) / 2, bk + 30, 280, 120);
  }
  // the stone railing round its front: posts on the line F, two rails, a lamp on every other post (lit by night)
  function railing() {
    const { x0, x1 } = BED, n = 16, xs = Array.from({ length: n + 1 }, (_, i) => x0 - 6 + (x1 - x0 + 12) * i / n);
    return `<g>${xs.map((x, i) => `<rect x="${f(x - 3.4)}" y="${F - 30}" width="6.8" height="32" ${hc('#b4aea2', '#30304c')}/><rect x="${f(x + 1.4)}" y="${F - 30}" width="2" height="32" fill="#2b1c12" fill-opacity=".14"/><path d="M${f(x - 4.4)} ${F - 30} h8.8 l-1.4 -3 h-6 Z" ${hc('#9a9488', '#28284a')}/>${i % 4 === 2 ? `<circle class="glow" cx="${f(x)}" cy="${F - 38}" r="22" fill="url(#glw)"/><rect x="${f(x - 2.6)}" y="${F - 41}" width="5.2" height="6" rx="1" ${hc('#efe4c8', '#ffe2a0')}/>` : ''}`).join('')}
      <rect x="${x0 - 10}" y="${F - 24}" width="${x1 - x0 + 20}" height="4" ${hc('#c4beb2', '#3a3a58')}/><rect x="${x0 - 10}" y="${F - 12}" width="${x1 - x0 + 20}" height="4" ${hc('#c4beb2', '#3a3a58')}/>
      <rect x="${x0 - 10}" y="${F}" width="${x1 - x0 + 20}" height="5" ${hc('#a8a296', '#2a2a46')}/></g>`;
  }
  // the 湯もみ stage on the right: an open wooden stage under a tiled roof, its board, long paddles leant on it
  function stage() {
    const x = 952, w = 200, t = F - 118;
    return `<g data-fx="yumomi">${groundShade(x + w / 2, F + 2, w * 0.55, 5)}<rect x="${x}" y="${t + 30}" width="${w}" height="${F - t - 30}" ${hc('#5a3e2a', '#1e1830')}/><rect x="${x + 8}" y="${t + 40}" width="${w - 16}" height="${F - t - 76}" ${hc('#3a2a20', '#121024')}/>
      <rect x="${x + 8}" y="${t + 40}" width="${w - 16}" height="${F - t - 76}" class="lit" style="opacity:calc(.05 + .4 * (1 - var(--day)))"/>
      <ellipse cx="${x + w / 2}" cy="${F - 44}" rx="${w / 2 - 22}" ry="7" ${hc('#5ab8a8', '#1e4a5a')}/>${ONSEN.steam([[x + w / 2 - 30, F - 56, 20, 1.4], [x + w / 2 + 26, F - 60, 22, 4.8]])}
      <rect x="${x - 4}" y="${F - 38}" width="${w + 8}" height="8" ${hc('#8a6a48', '#2a2238')}/><rect x="${x - 4}" y="${F - 38}" width="${w + 8}" height="2" fill="#fff" fill-opacity=".2"/><rect x="${x}" y="${F - 30}" width="${w}" height="30" ${hc('#6e5236', '#24203a')}/>
      <path d="${Array.from({ length: Math.floor(w / 10) }, (_, k) => `M${x + 5 + k * 10} ${F - 30} v30`).join(' ')}" ${hs('#5a3e2a', '#1e1830')} stroke-width="1"/>
      ${[x, x + w - 8].map((px) => `<rect x="${px}" y="${t + 26}" width="8" height="${F - t - 26}" ${hc('#4a3424', '#18142a')}/>`).join('')}
      <path d="M${x - 18} ${t + 30} L${x + 14} ${t - 4} H${x + w - 14} L${x + w + 18} ${t + 30} Z" ${hc('#4f5868', '#1c1e38')}/><path d="${Array.from({ length: 30 }, (_, k) => `M${x - 14 + k * 8} ${t + 29} l3 -30`).join(' ')}" stroke="#000" stroke-opacity=".16" stroke-width=".8"/><path d="M${x - 18} ${t + 30} H${x + w + 18}" ${hs('#2e3444', '#101128')} stroke-width="3"/>
      <rect x="${x + w / 2 - 34}" y="${t + 8}" width="68" height="18" rx="1" ${hc('#4a3424', '#18142a')}/><text x="${x + w / 2}" y="${t + 21.6}" text-anchor="middle" font-size="12" font-weight="700" letter-spacing="2" ${hc('#f4e6c4', '#ffe9b0')} ${SERIF}>湯もみ</text>
      ${[[x + w + 4, -12], [x + w + 12, -6]].map(([px, r]) => `<path d="M${px} ${F} l${f(r * 0.3)} -64" ${hs('#c9a06a', '#3a3048')} stroke-width="3"/><rect x="${f(px + r * 0.3 - 4)}" y="${F - 70}" width="8" height="10" rx="1" ${hc('#d9b98a', '#3a3048')} transform="rotate(${r} ${px} ${F})"/>`).join('')}
      ${lightPool(x + w / 2, F + 6, 70)}</g>`;
  }
  // ---- the 無人販売所 (left, where the street comes out): a wooden stand under its little roof, a stone basin of hot water with the
  // basket of eggs in it, steaming, the sign and the wooden box. STAND: its place on the land ----
  const STAND = { x: 196, w: 84 };
  function standArt() {
    const { x, w } = STAND, t = F - 96;
    return `<g data-fx="tamago">${groundShade(x + w / 2, F + 2, w * 0.6, 4)}<rect x="${x + 4}" y="${t + 10}" width="5" height="${F - t - 10}" ${hc('#5a3e2a', '#1e1830')}/><rect x="${x + w - 9}" y="${t + 10}" width="5" height="${F - t - 10}" ${hc('#5a3e2a', '#1e1830')}/>
      <path d="M${x - 8} ${t + 12} L${x + 6} ${t} H${x + w - 6} L${x + w + 8} ${t + 12} Z" ${hc('#6e5236', '#24203a')}/><path d="M${x - 8} ${t + 12} H${x + w + 8}" ${hs('#4a3424', '#18142a')} stroke-width="2"/>
      <rect x="${x + 10}" y="${t + 16}" width="${w - 20}" height="26" ${hc('#e8d2a8', '#5a5070')}/><text x="${x + w / 2}" y="${t + 28}" text-anchor="middle" font-size="7.4" font-weight="800" fill="#2b2b33" font-family="'Hiragino Maru Gothic ProN', 'Zen Maru Gothic', sans-serif">温泉たまご</text><text x="${x + w / 2}" y="${t + 37}" text-anchor="middle" font-size="6" fill="#c8322a" font-family="'Hiragino Maru Gothic ProN', 'Zen Maru Gothic', sans-serif">ひとつ 100円</text>
      <rect x="${x - 2}" y="${F - 40}" width="${w + 4}" height="6" ${hc('#8a6a48', '#2a2238')}/><rect x="${x + 2}" y="${F - 34}" width="${w - 4}" height="34" ${hc('#a8a296', '#2c2c48')}/><path d="M${x + 2} ${F - 22} H${x + w - 2} M${x + 30} ${F - 34} v12 M${x + 60} ${F - 22} v22" ${hs('#8a8478', '#1e1e38')} stroke-width="1"/>
      <ellipse cx="${x + 30}" cy="${F - 41}" rx="22" ry="5" ${hc('#7cc4bc', '#2a4a6e')}/><path d="M${x + 12} ${F - 43} q18 -9 36 0" ${hc('#c9a06a', '#3a3048')}/><path d="M${x + 14} ${F - 44} q16 -7 32 0" fill="none" ${hs('#a8804e', '#2a2238')} stroke-width=".8"/>
      ${[[x + 22, F - 46], [x + 30, F - 48], [x + 38, F - 46], [x + 26, F - 44], [x + 34, F - 44]].map(([ex, ey]) => `<ellipse cx="${ex}" cy="${ey}" rx="3.4" ry="2.6" ${hc('#f4e6d0', '#8a86a8')}/>`).join('')}
      <rect x="${x + 56}" y="${F - 56}" width="20" height="16" rx="1" ${hc('#8a5a34', '#2a2030')}/><rect x="${x + 61}" y="${F - 55}" width="10" height="2" fill="#1e140c"/><rect x="${x + 56}" y="${F - 56}" width="20" height="3" fill="#fff" fill-opacity=".18"/>
      ${ONSEN.steam([[x + 26, F - 58, 16, 0.8], [x + 36, F - 70, 18, 3.4]], 'yd-small')}</g>`;
  }
  // ---- the street's mouth on the left: the corner of its last house, its noren and lantern, the signpost back down it ----
  function mouth() {
    const lan = `<g class="fx-sway" style="animation-duration:3.6s"><path d="M150 152 v6" stroke="#3b2a1c" stroke-width=".8"/><circle class="glow" cx="150" cy="168" r="26" fill="url(#glw)"/><ellipse cx="150" cy="168" rx="7" ry="9" ${hc('#d0302a', '#ff8a5a')}/><rect x="146" y="158" width="8" height="2" fill="#2b2b33"/><rect x="146" y="176" width="8" height="2" fill="#2b2b33"/></g>`;
    return `<path d="M-30 ${F} V96 L18 70 H120 V${F} Z" ${hc('#8a6a48', '#2a2238')}/><path d="M-36 98 L18 66 H126" fill="none" ${hs('#4a5262', '#14152c')} stroke-width="7"/>
      <rect x="-30" y="150" width="150" height="5" ${hc('#5a3e2a', '#1e1830')}/><path d="M-36 152 H126" ${hs('#4a5262', '#14152c')} stroke-width="5"/>
      <rect x="10" y="98" width="70" height="34" ${hc('#5a3e2a', '#1e1830')}/><rect x="13" y="101" width="64" height="28" ${hc('#efe2c8', '#ffd98a')}/><path d="${Array.from({ length: 13 }, (_, i) => `M${17 + i * 4.8} 101 v28`).join(' ')}" ${hs('#6e5236', '#24203a')} stroke-width="1.1"/>
      <rect x="20" y="166" width="70" height="70" ${hc('#3b2a1c', '#141428')}/><rect x="20" y="166" width="70" height="70" class="lit" style="opacity:calc(.05 + .5 * (1 - var(--day)))"/>
      <g class="fx-sway" style="animation-duration:4.2s"><path d="M18 166 h74 v26 h-74 Z" ${hc('#26407a', '#1c2240')}/><path d="M42 166 v26 M66 166 v26" stroke="#fff" stroke-opacity=".25"/></g>${lan}
      <path d="M176 ${F} V140" ${hs('#6e5236', '#24203a')} stroke-width="6"/><rect x="166" y="138" width="20" height="70" ${hc('#e8d8b4', '#4a3c50')}/><rect x="166" y="138" width="20" height="70" fill="none" ${hs('#6e5236', '#24203a')} stroke-width="1.2"/>
      ${vText(176, 141, '湯けむり通り', 10.4, `font-weight="700" ${hc('#3b2a1c', '#e8dcb4')} ${SERIF}`)}`;
  }
  // the square: stone slabs set in rows, their joints, a darker edge along the railing's foot
  function square() {
    let joints = '';
    for (let r = 0; r < 7; r++) { const y = F + 6 + r * (10 + r * 2.4), h = 10 + r * 2.4, w = 34 + r * 9; joints += `M-20 ${f(y + h)} H1220 `; for (let x = -20 + (r % 2) * w / 2; x < 1220; x += w) joints += `M${f(x)} ${f(y)} v${f(h)} `; }
    return `<rect x="-20" y="${F}" width="1240" height="140" style="fill:color-mix(in srgb, #d2c9b8 calc(var(--day) * 100%), #2a2a48)"/><path d="${joints}" fill="none" ${hs('#b8ae9c', '#1e1e3a')} stroke-width="1.2"/>
      <rect x="-20" y="${F}" width="1240" height="5" fill="#2b1c12" style="opacity:calc(.05 + .08 * var(--day))"/>`;
  }
  // the benches along the railing: [x of the bench, which seat is taken] — visitors in yukata on some (PASSERS' looks)
  const BENCH = { y: F + 46, foot: 64, xs: [380, 600] };
  const LAMPS = [300, 900], LAMP_FOOT = 370 - (F + 50);   // the stone lamps by the railing's ends (land x), standing on Y 84
  const SITTERS = [[0, 0], [1, 1]];   // [bench, seat]: a seat 30 or 70 in from its end
  function sitters() {
    if (typeof PASSERS !== 'object') return '';
    const k = yScale(BENCH.foot), Y = 370 - BENCH.y - 40 * k;
    return SITTERS.map(([b, s]) => { const X = BENCH.xs[b] + (s ? 70 : 30) - 600, { look, wear } = PASSERS.yukata(Math.random() < 0.3);
      return `<div class="hero npc bench passer yb-sitter" aria-hidden="true" style="transform:translate(${X}px,${(-Y).toFixed(1)}px) scale(${k.toFixed(3)});z-index:${300 - BENCH.foot - 1}">${HERO.svg({ look, wear })}</div>`; }).join('');
  }
  function html() {
    const stoneLamp = (x) => `${groundShade(x, F + 50, 14, 3)}<rect x="${x - 7}" y="${F + 44}" width="14" height="6" ${hc('#a8a296', '#2c2c48')}/><rect x="${x - 3}" y="${F + 14}" width="6" height="30" ${hc('#b4aea2', '#30304c')}/><rect x="${x - 6}" y="${F + 2}" width="12" height="12" ${hc('#b9b3a6', '#34345a')}/><rect x="${x - 3}" y="${F + 5}" width="6" height="6" ${hc('#5a5248', '#ffd98a')}/><circle class="glow" cx="${x}" cy="${F + 8}" r="20" fill="url(#glw)"/><path d="M${x - 11} ${F + 2} Q${x} ${F - 8} ${x + 11} ${F + 2} Z" ${hc('#9a9488', '#28284a')}/>`;
    return `<svg class="land tall yubatake-land" viewBox="0 -400 1200 770" preserveAspectRatio="xMidYMax slice">${GLOW_DEFS}${ONSEN.steamDefs()}${puffDefs()}${lightDefs()}
      ${back()}${yubatake()}${railing()}${stage()}${standArt()}${mouth()}${square()}
    </svg>
    ${BENCH.xs.map((x) => benchProps(x, BENCH.y, BENCH.foot)).join('')}
    ${LAMPS.map((x) => landProp(LAMP_FOOT, stoneLamp(x), null, [x - 22, F, x + 22, F + 56])).join('')}
    ${sitters()}
    ${yHeroHtml()}
    ${TOWNEV.castHtml('yubatake')}
    <button type="button" class="thing way-btn way-edge" data-act="go-place" data-to="yudori" aria-label="回湯けむり通り" style="margin-left:${-560 - 32}px;bottom:96px"><span class="tag">${ySign('back', '湯けむり通り')}</span></button>
    <div class="ysel"></div>`;
  }

  // ---- the 無人販売所 seen close: its hand-written sign (to be read: the price, where the money goes), the eggs in their basket in
  // the steaming water, the box; three coins to hand — 50, 100 and 500 円 — and the right one dropped in buys an egg (YEN.pay: 円 spent,
  // a food of the day, its stamp, had by the steam). 50: too little; 500: nobody here to give the change. Not learned たまご yet: the
  // sign can be read all the same, the coins wait ----
  // the coins as they are minted, their faces in kanji (2026-11-24, the review: no digits — the sign's 100円 is to be read as 百円)
  const COINS = [[50, '五十円'], [100, '百円'], [500, '五百円']];
  // a wrong coin: what he thinks (Japanese), and a hint under it (Chinese)
  const SAID = { 50: ['たりない…', '不夠喔，再看一次牌子。'], 500: ['おつりが ない…', '這裡沒有人找零。'] };
  function closeup() {
    const eggs = [[74, 188], [94, 184], [114, 188], [84, 194], [104, 194], [124, 192], [64, 194]];
    return `<svg class="yb-standsvg" viewBox="0 0 360 250" aria-hidden="true"><rect width="360" height="250" fill="#cfe0e8"/><rect width="360" height="250" fill="#1b2050" style="opacity:calc(.85 * (1 - var(--day)))"/>
      <path d="M0 214 H360 V250 H0 Z" fill="#a8a296"/><path d="M0 214 H360" stroke="#8a8478" stroke-width="2"/>
      <path d="M14 28 L38 6 H322 L346 28 Z" fill="#6e5236"/><path d="M14 28 H346" stroke="#4a3424" stroke-width="3"/><rect x="24" y="28" width="8" height="186" fill="#5a3e2a"/><rect x="328" y="28" width="8" height="186" fill="#5a3e2a"/>
      <rect x="18" y="204" width="324" height="10" fill="#8a6a48"/><rect x="18" y="204" width="324" height="2" fill="#fff" fill-opacity=".2"/>
      <rect x="36" y="174" width="120" height="30" rx="6" fill="#9a948a"/><ellipse cx="96" cy="176" rx="58" ry="8.6" fill="#6fc0b4"/><ellipse cx="90" cy="174" rx="36" ry="3" fill="#fff" opacity=".35"/>
      <path d="M52 182 q44 -26 88 0" fill="#c9a06a"/><path d="M56 180 q40 -21 80 0 M60 176 q36 -17 72 0" fill="none" stroke="#a8804e" stroke-width="1.2"/>
      ${eggs.map(([x, y], i) => `<g class="yb-egg${i === 2 ? ' yb-take' : ''}"><ellipse cx="${x}" cy="${y - 6}" rx="8.4" ry="6.6" fill="#f6ead6"/><ellipse cx="${x - 3}" cy="${y - 8.8}" rx="2.6" ry="1.8" fill="#fff" opacity=".7"/></g>`).join('')}
      ${[0, 1, 2].map((k) => `<circle class="os-steam yd-small" cx="${70 + k * 26}" cy="${164 - k * 5}" r="${12 + k * 3}" fill="url(#ybPuffC)" style="animation-delay:-${(k * 1.7).toFixed(1)}s"/>`).join('')}
      <defs><radialGradient id="ybPuffC"><stop offset="0" stop-color="#fff" stop-opacity=".9"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs>
      <rect x="250" y="158" width="62" height="46" rx="3" fill="#8a5a34"/><rect x="250" y="158" width="62" height="6" fill="#a8743f"/><rect x="267" y="161" width="28" height="4" rx="1.6" fill="#1e140c"/><text x="281" y="189" text-anchor="middle" font-size="11" font-weight="700" fill="#f4e6c4" font-family="'Hiragino Mincho ProN', serif">料金箱</text>
      <path d="M262 118 Q276 132 280 150" fill="none" stroke="#c8322a" stroke-width="2.4" stroke-linecap="round" stroke-dasharray="1 5"/><path d="M273 144 l7 9 l5 -10" fill="none" stroke="#c8322a" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
      <circle class="yb-drop" cx="281" cy="132" r="9" fill="#d8dce0" stroke="#9aa0a8" stroke-width="1.6"/></svg>`;
  }
  function cardHtml(it, lock, note) {
    return `<button type="button" class="cls-x" data-cls="x" aria-label="關閉">✕</button>
      <div class="yb-closeup">${closeup()}<div class="yb-sign" lang="ja"><b>${ruby('{温泉|おんせん}たまご')}</b><span>${ruby('ひとつ　100{円|えん}。')}</span><span>${ruby('お{金|かね}は　この　{箱|はこ}へ')} <i aria-hidden="true">→</i></span></div></div>
      <p class="yb-said" lang="ja" aria-live="polite"></p><p class="yb-hint" lang="zh-Hant"></p>
      ${lock ? `<p class="yb-lock">學會「${esc(lock)}」這個字，就能買</p>` : ''}
      <div class="yb-coins">${COINS.map(([n, face]) => `<button type="button" class="yb-coin yb-c${n}" data-coin="${n}" lang="ja"${lock || note ? ' disabled' : ''} aria-label="${face}玉"><b>${face}</b></button>`).join('')}</div>
      ${note ? `<p class="yb-note">${note}</p>` : ''}`;
  }
  function stand(yard, t) {
    const m = TOWN.MENU.tamago, it = m && m.items[0]; if (!it) return;
    const v = REG.vocab.find((x) => jaPlain(x.w) === (it[4] || {}).w), lock = YEN.known(it) ? '' : (v ? v.r || jaPlain(v.w) : 'たまご');
    const note = yenEarned() <= 0 ? '錢包裡還沒有円。帶一趟郵輪導覽，就能拿到導遊費。' : yenBalance() < it[3] ? `錢包不夠：要 ${it[3]} 円。` : '';
    let busy = false;
    CLASS.card('yb-stand', '無人販売所', cardHtml(it, lock, note), (e) => {
      const c = e.target.closest('.yb-coin:not(:disabled)'), el = document.querySelector('.yb-stand'); if (!c || !el || busy) return;
      const n = Number(c.dataset.coin), said = el.querySelector('.yb-said'), hint = el.querySelector('.yb-hint');
      if (n !== it[3]) { const [ja, zh] = SAID[n] || ['', '']; said.innerHTML = ruby(ja); hint.textContent = zh; el.querySelector('.yb-sign').classList.remove('look'); void el.offsetWidth; el.querySelector('.yb-sign').classList.add('look'); return; }   // the wrong coin: back in his hand, the sign read again
      busy = true; const pay = () => YEN.pay(document.querySelector('#view .yard') || yard, Object.assign({}, t, { open: null }), 'tamago', it[0]);   // the square as drawn now (the card shut may have drawn it anew: the final review's I-1)
      if (YEN.left('f') <= 0 || calm()) { CLASS.close(); pay(); return; }   // full today: he says so, nothing paid
      el.querySelector('.yb-closeup').classList.add('paid');   // the coin into the box (paid as it drops in: YEN's coins), an egg up out of the basket
      setTimeout(() => { if (document.querySelector('.yb-stand') === el) pay(); }, 420); setTimeout(() => { if (document.querySelector('.yb-stand') === el) CLASS.close(); }, 1100);
    });
  }
  return { F, BED, STAND, BENCH, LAMPS, LAMP_FOOT, html, stand, lightDefs, lights, puffDefs, steam: ybSteam };
})();
function yubatakeHtml() { return YUBATAKE.html(); }
// what stands in the way on the square (2026-11-24, the review): the two benches (as the park's: their foot to a little behind
// them) and the two stone lamps — walked round; the railing itself is the walk's top (WALK_TOP.yubatake)
WALK_BLOCK.yubatake = YUBATAKE.BENCH.xs.map((x) => [x - 604, x - 506, YUBATAKE.BENCH.foot - 6, YUBATAKE.BENCH.foot + 12])
  .concat(YUBATAKE.LAMPS.map((x) => [x - 610, x - 590, YUBATAKE.LAMP_FOOT - 4, YUBATAKE.LAMP_FOOT + 8]));

// ---- what can be tapped on the 湯畑's square: the 無人販売所 (its card), the 湯畑 over its railing, the fall and the pool, the 湯もみ
// stage, the benches to sit on ----
PLACE_USE.yubatake = (() => {
  const { F, STAND, BENCH } = YUBATAKE;
  return [
    { id: 'tamago', name: '無人販売所', box: [STAND.x - 10, F - 100, STAND.x + STAND.w + 10, F + 4], kind: 'do', go: [STAND.x + STAND.w / 2 - 600, 118], back: 1, pose: 'look', open: (y) => YUBATAKE.stand(y, PLACE_USE.yubatake.find((q) => q.id === 'tamago')) },
    { id: 'yubatake', name: '湯畑', box: [330, 150, 760, 236], kind: 'do', go: [-60, 120], back: 1, pose: 'look', say: 'すごい ゆげ…！', toast: '湯畑：源泉的熱水流過一排排木頭水道（湯樋），一邊流一邊降溫，再落進下面的池子。水道邊上黃白色的是「湯の花」（溫泉的結晶）。' },
    { id: 'taki', name: '湯滝', box: [770, 180, 900, 236], kind: 'do', go: [236, 120], back: 1, pose: 'look', say: 'ザーッ…', toast: '湯畑的池子：溫泉水從木頭水道落下來，池水是透著光的翡翠綠。' },
    { id: 'yumomi', name: '湯もみ', box: [944, 118, 1160, 236], kind: 'do', go: [452, 118], back: 1, pose: 'look', say: 'よいしょ、よいしょ…', fx: 'yumomi', fxc: 'stir', ms: 2400, toast: '湯もみ：以前的人用長木板攪動熱水，讓太燙的溫泉降溫。現在是表演給遊客看的。' },
    ...BENCH.xs.map((x, i) => ({ id: 'bench' + i, name: '長椅', box: [x, BENCH.y - 28, x + 90, BENCH.y + 24], kind: 'sit', seats: [x + 30 - 600, x + 70 - 600], top: 370 - BENCH.y, dep: BENCH.foot }))];
})();
