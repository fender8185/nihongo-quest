'use strict';
// ---------- 旅館「花月」 (2026-11-24; docs/superpowers/specs/2026-11-23-onsen-work-design.md §3.4, §3.5, §5.2) ----------
// Walked into off 湯けむり通り by its gate (YUDORI.door('kagetsu')) and seen at 45° as the town's rooms (ISO):
// - the lobby (#/ryokan): the 玄関 — its 土間 of stone a step down at the door, the 下駄箱, slippers set out along the 上がり框 — the
//   front desk with its bell, the open 予約台帳 and the board of wooden-tagged keys 桜・菊・松・梅・竹 behind it (佐藤 there 7–11 and
//   14–22), low sofas on a rug before the big window onto a small garden (a stone lantern, a pine, the 鹿威し tipping now and then:
//   コーン), 和紙 lamps, an 生け花, the tea table 「ご自由に どうぞ」, the 大浴場's two noren (decoration: 暖簾 only, spec §10), the stairs
//   up 「客室 ↑」; 千代 in it 8–21;
// - 桜の間 (#/washitsu) up the stairs: eight tatami, the 座卓 with its tea things and the welcome まんじゅう (TOWN.GIFTS.kangei, once a
//   day), four 座椅子, the 床の間 (its scroll and flowers), the 押し入れ, the TV, the air conditioner, the 広縁 behind its shoji drawn
//   back — two chairs and a little table, the mountains and the river through its window;
// - washitsuArt(state): 桜の間 front-on, every thing a 仲居 sets out its own group (data-k) — the 仲居 card's art (§5.2).
// The rooms are lit alike day and night (.yard.indoor); what is out of doors — the garden, the view, a lantern's light — goes by
// the clock through --rk-out (css: body's own --day).
const RYOKAN = (() => {
  const f = (n) => n.toFixed(2), r1 = (n) => n.toFixed(1);
  const dn = (c, n) => `class="rk-hc" style="--c:${c};--n:${n}"`, dns = (c, n) => `class="rk-hs" style="--c:${c};--n:${n}"`;   // out of doors: by day, by night
  const poly = (pts, attrs) => `<path d="M${pts.map((q) => iPt(...q)).join(' L')} Z" ${attrs}/>`;
  const at = (u, v, h = 0) => isoPt(u, v, h).map((n) => +n.toFixed(1));
  // a box, a cylinder out of doors: its colours by day and by night ([day, night]), its faces shaded as iBox's
  const nBox = ([c, n], u0, v0, h0, u1, v1, h1) => poly([[u0, v1, h0], [u1, v1, h0], [u1, v1, h1], [u0, v1, h1]], dn(iShade(c, 0.1), iShade(n, 0.1)))
    + poly([[u1, v0, h0], [u1, v1, h0], [u1, v1, h1], [u1, v0, h1]], dn(iShade(c, 0.24), iShade(n, 0.24))) + poly([[u0, v0, h1], [u1, v0, h1], [u1, v1, h1], [u0, v1, h1]], dn(c, n));
  function nCyl(u, v, r, h0, h1, side, top) {
    const [x, y0] = isoPt(u, v, h0), y1 = isoPt(u, v, h1)[1], rx = r * ISO.U * Math.SQRT2, ry = rx / 2;
    return `<path d="M${r1(x - rx)} ${r1(y1)} V${r1(y0)} A${r1(rx)} ${r1(ry)} 0 0 0 ${r1(x + rx)} ${r1(y0)} V${r1(y1)} Z" ${dn(...side)}/><ellipse cx="${r1(x)}" cy="${r1(y1)}" rx="${r1(rx)}" ry="${r1(ry)}" ${dn(...top)}/>`;
  }
  const day = () => dateStr(TOWNEV.today());
  // ===== the lobby (floor units: u along the right wall, v along the left, from the back corner) =====
  const DOMA = [0, 3.6, 9.6, 16], DEEP = 0.36;   // the 玄関's 土間, a step down; in and out at its 上がり框 (EDGE)
  const EDGE = [4.1, 13.2];   // where he steps up out of it (and down into it, leaving)
  const GETA = [0, 0.9, 9.9, 11.7];   // the 下駄箱 against the left wall in the 土間
  const DOOR = [12, 14.8];   // the 玄関's sliding doors in the left wall (ISO's door)
  const STAIRS = [0, 2.6, 1.3, 7.3], STEPS = 12;   // up along the left wall to the back corner: [u0, u1, v at its top, v at its foot]
  const FOOT = [1.3, 8.0];   // the stairs' foot
  const DESK = [3.4, 9.8, 2.6, 3.8], DESK_H = 1.9, BACKC = [3.2, 9.8, 0, 0.7];   // the front desk's counter, the cabinet behind it
  const BELL = [4.3, 3.15], LEDGER = [7.3, 8.9, 2.78, 3.55];   // on the counter: the bell, the open 予約台帳
  const KEYS = [4.3, 8.5, 3.6, 5.2];   // the key board on the wall behind: [u0, u1, h0, h1]
  const WIN = [11.8, 18.2, 0.7, 5.6], GROUND = -0.3;   // the window onto the garden in the right wall [u0, u1, h0, h1]; the garden's ground
  const BATH = [[18.7, 20.0, '男', '#2f4a7a'], [20.4, 21.7, '女', '#b8323a']], BATH_H = 4.0;   // the 大浴場's two doorways in the right wall
  const SOFAS = [[12.2, 15.0], [15.6, 18.4]], SOFA = [12.2, 18.4, 5.4, 6.6];   // facing the window, their backs to us
  const LOWT = [13.0, 17.6, 3.0, 4.4];   // the low table before them
  const IKEBANA = [10.2, 11.2, 0.5, 1.5];
  const ANDON = [[11.2, 6.1], [19.4, 6.1]];   // 和紙 floor lamps
  const TEA = [18.8, 21.4, 9.6, 11.2], TEA_H = 1.5;   // the tea table, ご自由に どうぞ
  const HANG = [[6.6, 3.2, 6.4], [15.3, 4.9, 6.6]];   // paper pendant lamps [u, v, the shade's top]
  // the garden's things (true depth, behind the right wall: v < 0), seen down through the window
  const LANTERN = [11.6, -1.5], PINE = [14.0, -2.6], SHISHI = [15.5, -1.25], BASIN = [16.15, -1.37], STONE = [15.45, -0.78], FENCE = -3.2, PIVOT = 0.8;   // (ground beyond v −1 shows over the sill)
  // the month's colours: the 生け花's branch, the garden's maple
  const season = () => (typeof seasonLeaves === 'function' ? seasonLeaves() : ['#d8653a', '#e8a23a', '#c8452e']);

  // a lamp of 和紙 standing on the floor (行灯): four legs, a square paper box in a wooden frame, lit from within — brighter by night
  function andon(u, v) {
    const a = 0.32, h0 = 0.35, h1 = 2.15, wood = '#4a3020';
    const legs = [[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([p, q]) => iBox(wood, u + p * a - 0.04, v + q * a - 0.04, 0, u + p * a + 0.04, v + q * a + 0.04, h0 + 0.05)).join('');
    const paper = iBox('#fbf1d8', u - a, v - a, h0, u + a, v + a, h1, { top: '#fff6dc', fv: '#fbeecd', fu: '#f2dfb6' });
    const lattice = iOnV(v + a, `<path d="M${f(u - a)} ${f(-h0)} H${f(u + a)} M${f(u - a)} ${f(-h1)} H${f(u + a)} M${f(u - a)} ${f(-(h0 + h1) / 2)} H${f(u + a)} M${f(u)} ${f(-h0)} V${f(-h1)}" stroke="${wood}" stroke-width=".05"/>`)
      + `<path d="M${iPt(u + a, v - a, h0)} L${iPt(u + a, v - a, h1)} M${iPt(u + a, v + a, h0)} L${iPt(u + a, v + a, h1)} M${iPt(u - a, v + a, h0)} L${iPt(u - a, v + a, h1)}" stroke="${wood}" stroke-width="1.4"/>`;
    const [x, y] = at(u, v, (h0 + h1) / 2);
    return legs + paper + lattice + iBox(wood, u - a - 0.04, v - a - 0.04, h1, u + a + 0.04, v + a + 0.04, h1 + 0.08)
      + `<circle cx="${x}" cy="${y}" r="58" fill="url(#glw)" opacity=".35"/><circle class="rk-glow" cx="${x}" cy="${y}" r="80" fill="url(#glw)"/>`;
  }
  // a paper lamp hung from above (its cord up out of sight): a round 提灯-like shade of white paper, lit
  function pendant(u, v, h) {
    const [x, y] = at(u, v, h), w = 14, ht = 19;
    return `<path d="M${x} ${r1(y - 160)} V${y}" stroke="#3a2c22" stroke-width="1.2"/><rect x="${r1(x - 5)}" y="${r1(y - 2)}" width="10" height="4" fill="#3a2c22"/>
      <ellipse cx="${x}" cy="${r1(y + ht / 2 + 1)}" rx="${w}" ry="${ht / 2}" fill="#fbf4e2"/><path d="M${r1(x + 3)} ${r1(y + 1.4)} A${w} ${ht / 2} 0 0 1 ${r1(x + 3)} ${r1(y + ht + 0.6)} A${w * 0.6} ${ht / 2} 0 0 0 ${r1(x + 3)} ${r1(y + 1.4)} Z" fill="#c9a870" fill-opacity=".28"/>
      <path d="${[-0.55, 0, 0.55].map((t) => `M${r1(x - w * Math.sqrt(1 - t * t))} ${r1(y + ht / 2 + 1 + t * ht / 2)} h${r1(2 * w * Math.sqrt(1 - t * t))}`).join(' ')}" stroke="#d9c49a" stroke-width=".7"/>
      <rect x="${r1(x - 5)}" y="${r1(y + ht)}" width="10" height="3" fill="#3a2c22"/><circle cx="${x}" cy="${r1(y + 12)}" r="54" fill="url(#glw)" opacity=".4"/><circle class="rk-glow" cx="${x}" cy="${r1(y + 12)}" r="70" fill="url(#glw)"/>`;
  }
  // ---- the garden out of the window: its ground a step below the floor, the bamboo fence at its back, moss and raked white
  // gravel, stepping stones, the stone lantern (lit by night), the pine, the 鹿威し over its stone basin (the water from a bamboo
  // spout fills it, it tips, it swings back onto its stone: コーン — RYOKAN.mount plays it as it does), drawn true to depth ----
  function garden() {
    const [w0, w1] = WIN, G = GROUND, [c1, c2] = season();
    let g = poly([[w0 - 2, 0, G], [w1 + 2, 0, G], [w1 + 2, -9, G], [w0 - 2, -9, G]], dn('#6f8f52', '#17231f'))
      + iOnF(G, `<path d="${Array.from({ length: 9 }, (_, i) => `M${f(w0 - 2)} ${f(-0.5 - i)} H${f(w1 + 2)}`).join(' ')}" stroke="#5a7a44" stroke-opacity=".35" stroke-width=".05"/>`)
      + poly([[w0 - 1.2, -0.6, G], [14.9, -0.6, G], [14.6, -2.9, G], [w0 - 1.2, -2.9, G]], dn('#e6e2d6', '#3a3e56'))   // raked white gravel
      + iOnF(G, `<path d="${[0.95, 1.25, 1.55, 1.85, 2.15, 2.45, 2.75].map((d) => `M${f(w0 - 1.2)} ${f(-d)} C${f(w0)} ${f(-d + 0.1)} ${f(13.4)} ${f(-d - 0.1)} 14.7 ${f(-d)}`).join(' ')}" fill="none" ${dns('#c8c2b2', '#2c3046')} stroke-width=".05"/>`)
      + [[14.6, -1.9, 0.36], [15.9, -2.3, 0.32], [17.0, -2.0, 0.34]].map(([u, v, r]) => { const [x, y] = at(u, v, G + 0.06), rx = r * ISO.U * Math.SQRT2; return `<ellipse cx="${x}" cy="${y}" rx="${r1(rx)}" ry="${r1(rx / 2)}" ${dn('#8a867c', '#2a2c40')}/><ellipse cx="${r1(x - 2)}" cy="${r1(y - 1)}" rx="${r1(rx * 0.7)}" ry="${r1(rx * 0.32)}" ${dn('#a8a498', '#34364e')}/>`; }).join('');
    // the bamboo fence (竹垣): posts, rails and the canes between, its foot in the moss
    g += poly([[w0 - 2, FENCE, G], [w1 + 2, FENCE, G], [w1 + 2, FENCE, G + 2.6], [w0 - 2, FENCE, G + 2.6]], dn('#c8b07a', '#3a3446'))
      + iOnV(FENCE, `<path d="${Array.from({ length: 34 }, (_, i) => `M${f(w0 - 1.9 + i * 0.25)} ${f(-G)} V${f(-G - 2.6)}`).join(' ')}" ${dns('#a88e58', '#2a2638')} stroke-width=".05"/><path d="M${f(w0 - 2)} ${f(-G - 0.8)} H${f(w1 + 2)} M${f(w0 - 2)} ${f(-G - 1.8)} H${f(w1 + 2)}" ${dns('#5a4630', '#1c1a2a')} stroke-width=".12"/>`);
    // a maple of the month's colour behind, by the fence's left end
    const [mx, my] = at(12.3, -3.2, G + 2.6);
    g += `<path d="M${mx} ${r1(my + 60)} q-4 -30 2 -64" ${dns('#5a3e2a', '#1c1828')} stroke-width="3" fill="none"/>${[[-14, -6, 15], [8, -14, 14], [-4, -24, 13], [14, 2, 11], [-18, 10, 10]].map(([dx, dy, r]) => `<circle cx="${r1(mx + dx)}" cy="${r1(my + dy)}" r="${r}" ${dn(r % 2 ? c1 : c2, '#1e1a2c')}/>`).join('')}`;
    // the pine: a trunk leaning, its cloud-pruned pads of needles
    const [px, py] = at(PINE[0], PINE[1], G);
    g += `<ellipse cx="${px}" cy="${r1(py + 2)}" rx="26" ry="7" fill="#000" fill-opacity=".14"/><path d="M${r1(px - 4)} ${py} C${r1(px - 2)} ${r1(py - 24)} ${r1(px + 12)} ${r1(py - 36)} ${r1(px + 5)} ${r1(py - 62)} C${r1(px)} ${r1(py - 74)} ${r1(px - 13)} ${r1(py - 80)} ${r1(px - 10)} ${r1(py - 98)}" ${dns('#6a4a32', '#221c2a')} stroke-width="6" fill="none" stroke-linecap="round"/>
      <path d="M${r1(px + 5)} ${r1(py - 48)} q20 -5 30 -2 M${r1(px - 2)} ${r1(py - 72)} q-22 -2 -30 5" ${dns('#6a4a32', '#221c2a')} stroke-width="3" fill="none" stroke-linecap="round"/>
      ${[[34, -48, 26, 10], [-32, -68, 25, 9], [-6, -94, 27, 10], [12, -34, 16, 6], [-12, -84, 16, 6]].map(([dx, dy, rx, ry]) => `<ellipse cx="${r1(px + dx)}" cy="${r1(py + dy)}" rx="${rx}" ry="${ry}" ${dn('#2f5a3c', '#0f1c22')}/><ellipse cx="${r1(px + dx - 3)}" cy="${r1(py + dy - 3)}" rx="${rx * 0.8}" ry="${ry * 0.55}" ${dn('#41724c', '#15242a')}/>`).join('')}`;
    // the stone lantern (石灯籠), upright as such things stand (drawn in the screen's own frame at its foot): its base, its post, the
    // middle shelf, the fire box with its window (lit by night), the roof with its corners turned up, the jewel on top
    const [lx, ly] = at(LANTERN[0], LANTERN[1], G), st = dn('#8a8676', '#3e3e58'), sd = dn('#6c695c', '#2e2e46'), sl = dn('#a6a192', '#4a4a66');   // weathered granite
    g += `<ellipse cx="${lx}" cy="${r1(ly + 1)}" rx="22" ry="6" fill="#000" fill-opacity=".16"/><g transform="translate(${lx} ${ly}) scale(1.25)">
      <path d="M-13 0 L-11 -6 H11 L13 0 Z" ${st}/><path d="M-11 -6 H11 L9 -9 H-9 Z" ${sl}/><path d="M3 0 L4 -6 H11 L13 0 Z" ${sd}/>
      <path d="M-4 -9 H4 L3.4 -34 H-3.4 Z" ${st}/><path d="M1.4 -9 H4 L3.4 -34 H1 Z" ${sd}/>
      <path d="M-10 -34 H10 L8 -39 H-8 Z" ${st}/><path d="M-8 -39 H8 L6.4 -41 H-6.4 Z" ${sl}/>
      <path d="M-7.4 -41 H7.4 V-55 H-7.4 Z" ${st}/><path d="M2.6 -41 H7.4 V-55 H2.6 Z" ${sd}/><rect x="-4.6" y="-52" width="6" height="8" ${dn('#4a4440', '#ffd98a')}/><path d="M-1.6 -52 V-44" ${dns('#8e887c', '#c8a050')} stroke-width=".8"/>
      <path d="M-17 -54 Q-10 -55 -6 -62 H6 Q10 -55 17 -54 Q18 -57 15 -57 Q8 -60 6 -66 H-6 Q-8 -60 -15 -57 Q-18 -57 -17 -54 Z" ${st}/><path d="M6 -62 Q10 -55 17 -54 Q18 -57 15 -57 Q8 -60 6 -66 Z" ${sd}/>
      <path d="M-3.6 -66 H3.6 V-69 H-3.6 Z" ${sd}/><path d="M0 -79 Q5 -74 3.6 -69 H-3.6 Q-5 -74 0 -79 Z" ${sl}/></g>
      <circle class="rk-glow" cx="${r1(lx - 2)}" cy="${r1(ly - 60)}" r="36" fill="url(#glw)"/>`;
    // the stone basin (蹲踞) with its water, the bamboo spout (筧) from the fence over the 鹿威し's open end, the 鹿威し on its two posts
    // (its closed end resting on its striking stone; filled, it tips, pours into the basin, swings back: rk-shishi), drawn in that order
    const [bu, bv] = BASIN, [su, sv] = SHISHI, [ax, ay] = at(su, sv, G + PIVOT);
    g += nCyl(bu, bv, 0.5, G, G + 0.55, ['#8e887e', '#262638'], ['#a29c90', '#30304a']) + (() => { const [x, y] = at(bu, bv, G + 0.55); return `<ellipse cx="${x}" cy="${y}" rx="13" ry="6.4" ${dn('#7fb0c0', '#26345a')}/><ellipse cx="${r1(x - 3)}" cy="${r1(y - 1)}" rx="6" ry="2" fill="#fff" fill-opacity=".35"/><ellipse class="rk-pour" cx="${x}" cy="${r1(y - 1)}" rx="8" ry="3" fill="#e6f4fa"/>`; })()
      + nCyl(STONE[0], STONE[1], 0.22, G, G + PIVOT - 0.06, ['#8e887e', '#262638'], ['#a29c90', '#30304a'])
      + nBox(['#6e5a3a', '#221e2c'], su - 0.24, sv - 0.24, G, su - 0.08, sv - 0.08, G + PIVOT + 0.08);
    const tip = [ax + 28, ay - 22], [fx0, fy0] = at(su + 0.9, FENCE + 0.15, G + 1.5);
    g += `<path d="M${fx0} ${fy0} L${r1(tip[0])} ${r1(tip[1])}" ${dns('#7a8a4a', '#2a3030')} stroke-width="4.2"/><path d="M${r1(tip[0] - 0.5)} ${r1(tip[1] + 1.5)} q.4 4 -.6 8" stroke="#d6ecf4" stroke-opacity=".85" stroke-width="1.1" fill="none"/>`
      + `<g transform="translate(${ax} ${ay})"><g class="rk-shishi"><rect x="-36" y="-36" width="72" height="72" fill="none"/><path d="M-24 -4.4 L25 -4.4 L31 4.4 L-24 4.4 Q-27 0 -24 -4.4 Z" ${dn('#c4cc6e', '#4a5038')}/><path d="M-24 1.6 L29 1.6 L31 4.4 L-24 4.4 Z" ${dn('#9aa448', '#383e2a')}/><path d="M25 -4.4 L31 4.4" ${dns('#6e7a32', '#2a3020')} stroke-width="1.4"/><path d="M-8 -4.4 v8.8 M10 -4.4 v8.8" ${dns('#7a8636', '#2e3424')} stroke-width="1.3"/><path d="M-21 -2.4 H23" stroke="#fff" stroke-opacity=".35" stroke-width="1.2"/><circle r="2" fill="#4a3a2a"/></g></g>`
      + nBox(['#6e5a3a', '#221e2c'], su + 0.08, sv + 0.08, G, su + 0.24, sv + 0.24, G + PIVOT + 0.08);
    // the light of the day (or the moon) on it all
    g += poly([[w0 - 2, 0, G], [w1 + 2, 0, G], [w1 + 2, 0, WIN[3] + 0.2], [w0 - 2, 0, WIN[3] + 0.2]], 'class="rk-night" fill="#0c1430" fill-opacity=".25"');
    return g;
  }
  // the window's frame standing out of the wall: its sill, posts, the head, two mullions; the glass catching the light; the
  // 風鈴 hung inside it, swaying (data-fx furin: rung when the garden is looked at)
  function window_() {
    const [w0, w1, h0, h1] = WIN, wood = '#5a3e28', m = [(w0 * 2 + w1) / 3, (w0 + w1 * 2) / 3];
    const [fx, fy] = at(w1 - 0.9, 0.25, h1 - 0.15);
    return wallR(wood, w0 - 0.2, w1 + 0.2, h0 - 0.18, h0, 0.42, { top: '#7a5638' }) + wallR(wood, w0 - 0.2, w1 + 0.2, h1, h1 + 0.2, 0.22)
      + wallR(wood, w0 - 0.2, w0, h0, h1, 0.22) + wallR(wood, w1, w1 + 0.2, h0, h1, 0.22) + m.map((u) => wallR(wood, u - 0.07, u + 0.07, h0, h1, 0.12)).join('')
      + iOnV(0.02, `<path d="${[w0 + 0.4, m[0] + 0.4, m[1] + 0.4].map((u) => `M${f(u)} ${f(-h1 + 0.3)} l1.1 ${f(h1 - h0 - 1.6)}`).join(' ')}" stroke="#fff" stroke-opacity=".22" stroke-width=".16" stroke-linecap="round"/>`)
      + `<g data-fx="furin"><g class="fx-sway" style="animation-duration:2.6s"><path d="M${fx} ${r1(fy - 6)} V${r1(fy + 4)}" stroke="#3a3a44" stroke-width=".8"/><path d="M${r1(fx - 6)} ${r1(fy + 12)} Q${r1(fx - 6)} ${r1(fy + 3)} ${fx} ${r1(fy + 3)} Q${r1(fx + 6)} ${r1(fy + 3)} ${r1(fx + 6)} ${r1(fy + 12)} Z" fill="#d6ecf4" fill-opacity=".9" stroke="#9ac4d4" stroke-width=".6"/><path d="M${r1(fx - 3)} ${r1(fy + 7)} q3 -2 6 0" stroke="#d0453c" stroke-width="1" fill="none"/><path d="M${fx} ${r1(fy + 12)} V${r1(fy + 17)}" stroke="#3a3a44" stroke-width=".6"/><rect x="${r1(fx - 2.6)}" y="${r1(fy + 17)}" width="5.2" height="12" fill="#f4f0e2"/><path d="M${r1(fx - 1.4)} ${r1(fy + 20)} v6" stroke="#3a5a8a" stroke-width=".8"/></g></g>`;
  }
  // the key board on the wall behind the desk: a dark board under a little roof, five hooks, each key hung on its long wooden tag
  // with its room's name down it (桜・菊・松・梅・竹); the 額 over it, 「花月」
  function keyboard() {
    const [k0, k1, h0, h1] = KEYS, names = ['桜', '菊', '松', '梅', '竹'], step = (k1 - k0) / names.length;
    const tags = names.map((n, i) => { const u = k0 + step * (i + 0.5);
      return wallR('#c9a46a', u - 0.2, u + 0.2, h0 + 0.2, h0 + 1.15, 0.16, { top: '#dcb880', fv: '#d2ad74', fu: '#a88454' }) + iOnV(0.16, `<circle cx="${f(u)}" cy="${f(-h0 - 1.32)}" r=".07" fill="#c9a24a"/><path d="M${f(u)} ${f(-h0 - 1.27)} V${f(-h0 - 1.15)}" stroke="#8a6a3a" stroke-width=".04"/>${vText(f(u), -h0 - 1.08, n, 0.3, `font-weight="700" fill="#3b2a1c" ${SERIF}`)}<path d="M${f(u - 0.05)} ${f(-h0 - 0.32)} h.1 v.18 h-.1 Z" fill="#b8bcc2"/>`); }).join('');
    return wallR('#4a3020', k0, k1, h0, h1, 0.1, { fv: '#3e281a' }) + wallR('#3a2418', k0 - 0.12, k1 + 0.12, h1, h1 + 0.12, 0.22) + tags
      + wallR('#3a2418', 4.5, 8.3, 5.7, 6.9, 0.08) + iOnV(0.08, `<rect x="4.6" y="-6.8" width="3.6" height="1" fill="#f6efdc"/><text x="6.4" y="-6.0" text-anchor="middle" font-size=".66" font-weight="800" fill="#2b1c12" ${SERIF}>花　月</text><rect x="7.55" y="-6.18" width=".24" height=".24" fill="#c8322a"/>`);
  }
  // the front desk: the cabinet against the wall behind (drawers, an old black telephone), the counter of polished wood (its
  // front in panels, its top board lighter, overhanging), on it the bell, the 予約台帳 open, a little stand 「フロント」
  function desk() {
    const [b0, b1, , bv1] = BACKC, [d0, d1, dv0, dv1] = DESK;
    const back = iBox('#7a5236', b0, 0, 0, b1, bv1, 1.3, { top: '#a07450', fv: '#6e4a30', fu: '#5e3e28' })
      + iOnV(bv1, Array.from({ length: 4 }, (_, i) => `<rect x="${f(b0 + 0.25 + i * 1.6)}" y="-1.12" width="1.36" height=".45" fill="none" stroke="#4a3020" stroke-width=".04"/><rect x="${f(b0 + 0.8 + i * 1.6)}" y="-.92" width=".26" height=".06" fill="#c9a24a"/>`).join(''))
      + iBox('#2b2b33', 8.6, 0.12, 1.3, 9.3, 0.55, 1.48, { top: '#3a3a44' }) + iBox('#2b2b33', 8.66, 0.2, 1.48, 9.24, 0.47, 1.56, { top: '#1c1c22' });
    const wood = { top: '#c99a62', fv: '#8a5e3c', fu: '#6e4a30' };
    const counter = iBox('#8a5e3c', d0, dv0, 0, d1, dv1, DESK_H - 0.14, wood)
      + iOnV(dv1, `${Array.from({ length: 4 }, (_, i) => `<rect x="${f(d0 + 0.3 + i * 1.55)}" y="${f(-DESK_H + 0.4)}" width="1.3" height="1.2" fill="none" stroke="#5e3e28" stroke-width=".05"/><rect x="${f(d0 + 0.42 + i * 1.55)}" y="${f(-DESK_H + 0.52)}" width="1.06" height=".96" fill="#7a5236" fill-opacity=".5"/>`).join('')}<rect x="${d0}" y="-.16" width="${f(d1 - d0)}" height=".16" fill="#2b1c12" fill-opacity=".3"/>`)
      + iBox('#c99a62', d0 - 0.12, dv0 - 0.1, DESK_H - 0.14, d1 + 0.12, dv1 + 0.14, DESK_H, { top: '#d8ac74', fv: '#b8875a', fu: '#9a6e46' })
      + iOnF(DESK_H, `<path d="M${f(d0 - 0.1)} ${f(dv1 + 0.1)} H${f(d1 + 0.1)}" stroke="#fff" stroke-opacity=".4" stroke-width=".04"/>`);
    // the 予約台帳: two pages open, ruled, names down them
    const [l0, l1, lv0, lv1] = LEDGER, lm = (l0 + l1) / 2;
    const ledger = iBox('#3a2a20', l0, lv0, DESK_H, l1, lv1, DESK_H + 0.06) + iOnF(DESK_H + 0.06, `<path d="M${f(l0 + 0.05)} ${f(lv0 + 0.04)} H${f(lm - 0.02)} V${f(lv1 - 0.04)} H${f(l0 + 0.05)} Z M${f(lm + 0.02)} ${f(lv0 + 0.04)} H${f(l1 - 0.05)} V${f(lv1 - 0.04)} H${f(lm + 0.02)} Z" fill="#fbf6e8"/><path d="${[0.2, 0.36, 0.52, 0.68].map((d) => `M${f(l0 + 0.15)} ${f(lv0 + d)} h.5 M${f(lm + 0.1)} ${f(lv0 + d)} h.5`).join(' ')}" stroke="#4a4a6a" stroke-width=".035"/><path d="M${f(lm)} ${f(lv0)} V${f(lv1)}" stroke="#c9bfa6" stroke-width=".03"/>`);
    // the bell (呼び鈴): a silver dome on a black foot, its button on top (rung: data-fx rkbell)
    const [bu, bv] = BELL, [bx, by] = at(bu, bv, DESK_H);
    const bell = `<g data-fx="rkbell"><ellipse cx="${bx}" cy="${r1(by + 1)}" rx="9" ry="3.6" fill="#2b2b33"/><g class="rk-bellcap"><path d="M${r1(bx - 7.4)} ${by} Q${r1(bx - 7.4)} ${r1(by - 9.4)} ${bx} ${r1(by - 9.4)} Q${r1(bx + 7.4)} ${r1(by - 9.4)} ${r1(bx + 7.4)} ${by} Z" fill="#c9ccd2"/><path d="M${r1(bx - 5)} ${r1(by - 3)} q1 -4 4 -5" stroke="#fff" stroke-opacity=".8" stroke-width="1.2" fill="none"/><rect x="${r1(bx - 1)}" y="${r1(by - 12.4)}" width="2" height="3.2" fill="#8a8e96"/><ellipse cx="${bx}" cy="${r1(by - 12.4)}" rx="2.4" ry="1" fill="#b8bcc2"/></g></g>`;
    const [sx, sy] = at(6.0, 3.3, DESK_H);
    const stand = `<path d="M${r1(sx - 13)} ${sy} L${r1(sx - 11)} ${r1(sy - 11)} H${r1(sx + 11)} L${r1(sx + 13)} ${sy} Z" fill="#3a2418"/><rect x="${r1(sx - 10)}" y="${r1(sy - 10)}" width="20" height="8" fill="#f6efdc"/><text x="${sx}" y="${r1(sy - 3.6)}" text-anchor="middle" font-size="5.6" font-weight="700" fill="#2b1c12">フロント</text>`;
    return { back, counter: counter + ledger + bell + stand };
  }
  // the stairs up to the rooms along the left wall, rising to the back corner: each step a slab of wood back to the top (their
  // risers and treads toward us, their side the stairs' side), a handrail on posts, the way up dark above; 「客室 ↑」 at its foot
  function stairs() {
    const [s0, s1, vt, vf] = STAIRS, d = (vf - vt) / STEPS, rise = 0.42;
    let out = '';
    for (let k = 0; k < STEPS; k++) out += iBox('#9a6e46', s0, vt, k * rise, s1, vf - k * d, (k + 1) * rise, { top: '#c69a68', fv: '#7a5232', fu: '#8a5e3a' })
      + iOnF((k + 1) * rise, `<path d="M${s0} ${f(vf - k * d - 0.04)} H${s1}" stroke="#e8c492" stroke-opacity=".6" stroke-width=".04"/>`);
    const posts = [0, 4, 8, 11].map((k) => { const v = vf - k * d - 0.25, h = (k + 1) * rise; return iBox('#5a3e28', s1 - 0.12, v - 0.12, h, s1 + 0.02, v + 0.02, h + 1.9); }).join('');
    const rail = `<path d="M${iPt(s1 - 0.05, vf - 0.25, rise + 1.9)} L${iPt(s1 - 0.05, vt + 0.4, STEPS * rise + 1.9)}" stroke="#5a3e28" stroke-width="3.4" stroke-linecap="round"/><path d="M${iPt(s1 - 0.05, vf - 0.25, rise + 1.96)} L${iPt(s1 - 0.05, vt + 0.4, STEPS * rise + 1.96)}" stroke="#8a6440" stroke-width="1" stroke-linecap="round"/>`;
    const [x, y] = at(s1 + 0.15, vf + 0.15, 0);
    const sign = `<rect x="${r1(x - 4)}" y="${r1(y - 38)}" width="3" height="38" fill="#3a2418"/><rect x="${r1(x - 20)}" y="${r1(y - 54)}" width="34" height="18" rx="1.5" fill="#f6efdc" stroke="#3a2418" stroke-width="1.6"/><text x="${r1(x - 3)}" y="${r1(y - 41)}" text-anchor="middle" font-size="9" font-weight="800" fill="#2b1c12" ${SERIF}>客室 ↑</text>`;
    return out + posts + rail + sign;
  }
  // the 下駄箱 in the 土間: a cabinet of little doors, a wooden name tag on each, a pair of geta left on the stone before it
  function getabako() {
    const [g0, g1, gv0, gv1] = GETA, top = 2.9;
    const w = (gv1 - gv0) / 3, hb = -DEEP + 0.12, row = (top - 0.12 - hb) / 3;   // three by three little doors on its face toward the room (+u)
    return iBox('#7a5236', g0, gv0, -DEEP, g1, gv1, top, { top: '#9a6e46', fv: '#6e4a30', fu: '#8a5e3c' })
      + iOnL([0, 1, 2].flatMap((c) => [0, 1, 2].map((r) => { const x = -(gv0 + (c + 1) * w) + 0.06, y = -(hb + (r + 1) * row) + 0.05;
        return `<rect x="${f(x)}" y="${f(y)}" width="${f(w - 0.12)}" height="${f(row - 0.1)}" fill="#7e563a" stroke="#4a3020" stroke-width=".04"/><rect x="${f(x + w / 2 - 0.2)}" y="${f(y + 0.12)}" width=".28" height=".2" fill="#f2e6c8"/><circle cx="${f(x + w / 2 - 0.06)}" cy="${f(y + row - 0.3)}" r=".04" fill="#c9a24a"/>`; })).join(''), g1 + 0.01)
      + [[1.6, 10.6], [2.0, 10.7]].map(([u, v]) => { const [x, y] = at(u, v, -DEEP); return `<path d="M${r1(x - 7)} ${y} l10 -5 h3 l-10 5 Z" fill="#a8743f"/><path d="M${r1(x - 5)} ${r1(y - 0.6)} l7 -3.4" stroke="#c8322a" stroke-width="1"/>`; }).join('');
  }
  // the 土間: its stone a step down at the door, the 上がり框's polished beam round its edge, the riser of the floor toward us; the
  // slippers set out along the edge, toes to the room
  function doma() {
    const [, d1, dv0] = DOMA, D = -DEEP;
    let o = poly([[0, dv0, D], [d1, dv0, D], [d1, 16, D], [0, 16, D]], 'fill="#a9a59b"')
      + iOnF(D, `<path d="${Array.from({ length: 4 }, (_, i) => `M0 ${f(dv0 + 1.3 + i * 1.3)} H${d1}`).join(' ')} ${Array.from({ length: 3 }, (_, i) => `M${f(0.9 + i * 0.9)} ${dv0} V16`).join(' ')}" stroke="#8e8a80" stroke-width=".05"/><path d="M.2 ${f(dv0 + 0.3)} l.5 .3 M2.2 ${f(dv0 + 2.9)} l.4 .2 M1.1 ${f(dv0 + 4.6)} l.6 .1" stroke="#c0bcb2" stroke-width=".05"/>`)
      + poly([[0, dv0, D], [0, 16, D], [0, 16, 0], [0, dv0, 0]], 'fill="#6e4f36"')   // the left wall on down to the stone
      + poly([[0, dv0, D], [d1, dv0, D], [d1, dv0, 0], [0, dv0, 0]], 'fill="#6a4a30"')   // the floor's riser toward us
      + poly([[0, dv0 - 0.42, 0], [d1 + 0.42, dv0 - 0.42, 0], [d1 + 0.42, 16, 0], [d1, 16, 0], [d1, dv0, 0], [0, dv0, 0]], 'fill="#5e3c24"')   // the 上がり框
      + `<path d="M${iPt(0, dv0, 0)} L${iPt(d1, dv0, 0)} L${iPt(d1, 16, 0)}" stroke="#a87a4e" stroke-width="1.4" fill="none"/>`;
    o += [10.5, 11.5, 12.5, 13.5, 14.5].map((v, i) => { const u = d1 + 0.74, c = i % 2 ? '#5a6a8e' : '#8a5040';   // a pair each: the sole, the band over the toes
      return [-0.15, 0.15].map((dv) => poly([[u - 0.3, v + dv - 0.11, 0.03], [u + 0.28, v + dv - 0.11, 0.03], [u + 0.34, v + dv + 0.11, 0.03], [u - 0.3, v + dv + 0.11, 0.03]], 'fill="#e9dcc2"')
        + poly([[u - 0.04, v + dv - 0.12, 0.09], [u + 0.3, v + dv - 0.12, 0.09], [u + 0.36, v + dv + 0.12, 0.09], [u - 0.04, v + dv + 0.12, 0.09]], `fill="${c}"`)
        + poly([[u - 0.04, v + dv + 0.12, 0.03], [u + 0.36, v + dv + 0.12, 0.03], [u + 0.36, v + dv + 0.12, 0.09], [u - 0.04, v + dv + 0.12, 0.09]], `fill="${mixHex(c, '#000000', 0.3)}"`)).join(''); }).join('');
    return o;
  }
  // the 玄関's doors: two of lattice and glass in the left wall, the street's light through them (by night its lantern's glow)
  function entrance() {
    const [v0, v1] = DOOR, D = -DEEP, hd = 4.5;
    return iOnL(`<rect x="${-v1}" y="${-hd}" width="${f(v1 - v0)}" height="${f(hd - D)}" ${dn('#e8eef0', '#2a2c50')}/><rect x="${-v1}" y="${f(-hd + 1.4)}" width="${f(v1 - v0)}" height="1" fill="#ffd98a" class="rk-glow"/>
      ${[0, 1].map((k) => { const x = -v1 + 0.06 + k * (v1 - v0) / 2; return `<rect x="${f(x)}" y="${f(-hd + 0.05)}" width="${f((v1 - v0) / 2 - 0.12)}" height="${f(hd - D - 0.1)}" fill="none" stroke="#4a3020" stroke-width=".14"/><path d="${Array.from({ length: 5 }, (_, i) => `M${f(x + 0.22 * (i + 1))} ${f(-hd + 0.1)} V${f(-D - 0.1)}`).join(' ')} M${f(x)} ${f(-hd + 2.2)} H${f(x + (v1 - v0) / 2 - 0.12)}" stroke="#5a3e28" stroke-width=".06"/>`; }).join('')}`, 0.02)
      + wallL('#3a2418', v0 - 0.16, v0, D, hd, 0.2) + wallL('#3a2418', v1, v1 + 0.16, D, hd, 0.2) + wallL('#3a2418', v0 - 0.16, v1 + 0.16, hd, hd + 0.24, 0.22)
      + iOnL(`${[0, 1].map((k) => `<g class="fx-sway" style="animation-duration:3.6s;animation-delay:-${k * 0.8}s"><path d="M${f(-v1 + 0.08 + k * 1.38)} ${f(-hd + 0.06)} h1.32 v1.2 h-1.32 Z" fill="#2f3a5e"/></g>`).join('')}<text x="${f(-(v0 + v1) / 2)}" y="${f(-hd + 0.82)}" text-anchor="middle" font-size=".44" font-weight="700" fill="#f6f3ec" ${SERIF}>花月</text>`, 0.3);
  }
  // the 大浴場's two doorways at the right wall's far end: dark corridor beyond, a noren in each — 男 indigo, 女 red — and the
  // board over them 「大浴場 →」 (only the noren: spec §10)
  function bath() {
    const h = BATH_H;
    return BATH.map(([a, b, ch, c], k) => iOnV(0, `<rect x="${a}" y="${-h}" width="${f(b - a)}" height="${h}" fill="#2a221c"/><path d="M${a} -.02 H${b} L${f(b - 0.2)} -.5 H${f(a + 0.2)} Z" fill="#3e322a"/>`) + frameR(a, b, h, '#3a2418')
      + iOnV(0.3, `<g data-fx="noren">${[0, 1].map((j) => `<g class="fx-sway" style="animation-duration:${(3.4 + k * 0.3).toFixed(1)}s;animation-delay:-${j * 0.7}s"><path d="M${f(a + 0.04 + j * (b - a) / 2)} ${f(-h + 0.04)} h${f((b - a) / 2 - 0.08)} v2 h${f(-((b - a) / 2 - 0.08))} Z" fill="${c}"/><path d="M${f(a + 0.04 + j * (b - a) / 2)} ${f(-h + 0.2)} h${f((b - a) / 2 - 0.08)}" stroke="#000" stroke-opacity=".2" stroke-width=".05"/></g>`).join('')}<text x="${f((a + b) / 2)}" y="${f(-h + 1.32)}" text-anchor="middle" font-size=".62" font-weight="800" fill="#fbf8f0" ${SERIF}>${ch}</text></g>`)).join('')
      + wallR('#3a2418', 18.7, 21.7, h + 0.4, h + 1.15, 0.1, { fv: '#4a3020' }) + iOnV(0.1, `<rect x="18.8" y="${f(-h - 1.08)}" width="2.8" height=".6" fill="#f6efdc"/><text x="20.2" y="${f(-h - 0.62)}" text-anchor="middle" font-size=".42" font-weight="800" fill="#2b1c12" ${SERIF}>大浴場 →</text>`);
  }
  // the sofas: low, of dark wood and cream cushions, their backs to us; the rug under them and the low table
  function sofa(u0, u1) {
    const [v0, v1] = [SOFA[2], SOFA[3]], seat = '#e9dcc2', wood = '#5a3e28';
    return iBox(wood, u0, v0, 0, u1, v1, 0.32, { top: '#6e4a30' }) + iBox(seat, u0 + 0.1, v0 + 0.05, 0.32, u1 - 0.1, v1 - 0.3, 0.72, { top: '#f2e8d2', fv: '#ddd0b4', fu: '#d0c2a4' })
      + iBox(wood, u0, v1 - 0.3, 0.32, u1, v1, 1.5, { top: '#7a5236', fv: '#5e4030', fu: '#4e3424' }) + iBox(wood, u0, v0, 0.32, u0 + 0.28, v1, 1.05, { top: '#7a5236' }) + iBox(wood, u1 - 0.28, v0, 0.32, u1, v1, 1.05, { top: '#7a5236' })
      + iOnV(v1, `<path d="M${f(u0 + 0.3)} -.5 H${f(u1 - 0.3)} M${f(u0 + 0.3)} -1.0 H${f(u1 - 0.3)}" stroke="#3e2a1c" stroke-width=".04"/>`);
  }
  function lowTable() {
    const [t0, t1, tv0, tv1] = LOWT;
    return [[t0 + 0.2, tv0 + 0.2], [t1 - 0.32, tv0 + 0.2], [t0 + 0.2, tv1 - 0.32], [t1 - 0.32, tv1 - 0.32]].map(([u, v]) => iBox('#3a2418', u, v, 0, u + 0.12, v + 0.12, 0.8)).join('')
      + iBox('#5a3a24', t0, tv0, 0.8, t1, tv1, 0.95, { top: '#6e4a30' }) + iOnF(0.95, `<path d="M${t0} ${f(tv1 - 0.03)} H${f(t1 - 0.03)} V${tv0}" fill="none" stroke="#8a6440" stroke-width=".04"/>`)
      + iCyl(15.3, 3.7, 0.22, 0.95, 1.4, '#2f3a5e', '#3f4a6e') + (() => { const [x, y] = at(15.3, 3.7, 1.4); return `<path d="M${x} ${y} q-4 -10 -10 -16 M${x} ${y} q3 -12 9 -15" stroke="#6e5236" stroke-width="1" fill="none"/><circle cx="${r1(x - 10)}" cy="${r1(y - 16)}" r="2.6" fill="#f4f0e4"/><circle cx="${r1(x + 9)}" cy="${r1(y - 15)}" r="2.2" fill="#e8b4c4"/>`; })();
  }
  // the 生け花 on its black lacquered stand: a wide shallow vase, a tall branch of the month's colour leaning out, two flowers low
  function ikebana() {
    const [i0, i1, iv0, iv1] = IKEBANA, cu = (i0 + i1) / 2, cv = (iv0 + iv1) / 2, [c1, c2] = season();
    const [x, y] = at(cu, cv, 1.3);
    return iBox('#1c1c22', i0, iv0, 0, i1, iv1, 0.9, { top: '#2b2b33', fv: '#24242c', fu: '#18181e' }) + iOnF(0.9, `<path d="M${f(i0)} ${f(iv1 - 0.03)} H${f(i1 - 0.03)}" stroke="#fff" stroke-opacity=".2" stroke-width=".03"/>`)
      + iCyl(cu, cv, 0.42, 0.9, 1.3, '#4a6a7a', '#5a7a8a') + iCylSh(cu, cv, 0.42, 0.9, 1.3, 0.16)
      + `<path d="M${x} ${y} C${r1(x - 4)} ${r1(y - 40)} ${r1(x + 18)} ${r1(y - 66)} ${r1(x + 30)} ${r1(y - 92)}" stroke="#4a3426" stroke-width="2.2" fill="none"/><path d="M${r1(x + 4)} ${r1(y - 30)} q-16 -10 -22 -30" stroke="#4a3426" stroke-width="1.6" fill="none"/>`
      + [[30, -92, 7], [22, -78, 6], [12, -60, 6], [-18, -60, 6], [-12, -48, 5], [26, -96, 5]].map(([dx, dy, r], i) => `<circle cx="${r1(x + dx)}" cy="${r1(y + dy)}" r="${r}" fill="${i % 2 ? c1 : c2}"/>`).join('')
      + `<circle cx="${r1(x - 5)}" cy="${r1(y - 8)}" r="4.4" fill="#f6f0f2"/><circle cx="${r1(x + 5)}" cy="${r1(y - 6)}" r="3.8" fill="#d0453c"/><circle cx="${r1(x - 5)}" cy="${r1(y - 8)}" r="1.4" fill="#e6c25a"/>`;
  }
  // the tea table: a low chest of drawers, on it the hot-water pot, the teapot, cups upside down on their tray, the tea caddy and
  // a little card standing 「ご自由に どうぞ」 (steam off the pot)
  function teaTable() {
    const [t0, t1, tv0, tv1] = TEA, H = TEA_H;
    return iBox('#7a5236', t0, tv0, 0, t1, tv1, H, { top: '#a07450', fv: '#6e4a30', fu: '#5e3e28' })
      + iOnV(tv1, `<rect x="${f(t0 + 0.2)}" y="${f(-H + 0.25)}" width="${f(t1 - t0 - 0.4)}" height=".5" fill="none" stroke="#4a3020" stroke-width=".04"/><rect x="${f(t0 + 0.2)}" y="${f(-H + 0.85)}" width="${f(t1 - t0 - 0.4)}" height=".5" fill="none" stroke="#4a3020" stroke-width=".04"/><rect x="${f((t0 + t1) / 2 - 0.13)}" y="${f(-H + 0.46)}" width=".26" height=".06" fill="#c9a24a"/><rect x="${f((t0 + t1) / 2 - 0.13)}" y="${f(-H + 1.06)}" width=".26" height=".06" fill="#c9a24a"/>`)
      + iCyl(19.4, 10.0, 0.3, H, H + 1.0, '#f2f0ea', '#e2e0da') + iCylSh(19.4, 10.0, 0.3, H, H + 1.0, 0.14) + iCyl(19.4, 10.0, 0.16, H + 1.0, H + 1.16, '#8a8e96', '#b8bcc2')
      + iSteam(19.4, 10.0, H + 1.2, 0.6, 4)
      + iBox('#5a3a24', 19.9, 9.85, H, 20.9, 10.55, H + 0.06, { top: '#6e4a30' }) + [[20.15, 10.05], [20.55, 10.05], [20.15, 10.35], [20.55, 10.35]].map(([u, v]) => iCyl(u, v, 0.11, H + 0.06, H + 0.3, '#f4efe2', '#e6dece')).join('')
      + iCyl(20.6, 10.85, 0.24, H, H + 0.42, '#3a3a44', '#4a4a55') + (() => { const [x, y] = at(20.6, 10.85, H + 0.42); return `<path d="M${r1(x + 6)} ${r1(y + 6)} l7 -3" stroke="#3a3a44" stroke-width="2.4" stroke-linecap="round"/><ellipse cx="${x}" cy="${r1(y - 1.4)}" rx="3" ry="1.2" fill="#2b2b33"/>`; })()
      + iCyl(19.2, 10.85, 0.14, H, H + 0.48, '#6e8a5a', '#8aa676')
      + (() => { const [x, y] = at(20.0, 11.05, H); return `<path d="M${r1(x - 15)} ${y} L${r1(x - 14)} ${r1(y - 20)} H${r1(x + 14)} L${r1(x + 15)} ${y} Z" fill="#fbf6e6" stroke="#c9b48a" stroke-width=".6"/><text x="${x}" y="${r1(y - 12.6)}" text-anchor="middle" font-size="5.8" font-weight="700" fill="#2b1c12">ご自由に</text><text x="${x}" y="${r1(y - 4.4)}" text-anchor="middle" font-size="5.8" font-weight="700" fill="#2b1c12">どうぞ</text>`; })();
  }
  // the lobby's rug: deep red with a border, under the sofas and the low table
  const rug = () => iOnF(0.02, `<rect x="11.4" y="2.2" width="7.8" height="5.4" fill="#8a3a32"/><rect x="11.65" y="2.45" width="7.3" height="4.9" fill="none" stroke="#d8b46a" stroke-width=".06"/><rect x="11.9" y="2.7" width="6.8" height="4.4" fill="none" stroke="#6e2a26" stroke-width=".05"/>`);

  function lobbyHtml() {
    isoProps = [];
    const [w0, w1, h0, h1] = WIN;
    const defs = `<defs><clipPath id="rkWin"><path d="M${iPt(w0, 0, h0)} L${iPt(w1, 0, h0)} L${iPt(w1, 0, h1)} L${iPt(w0, 0, h1)} Z"/></clipPath></defs>`;
    const { back, counter } = desk();
    // the way up dark above the stairs: an opening in the left wall at the stairs' top, the corridor's light in it
    const above = iOnL(`<rect x="-3.6" y="-8" width="3.3" height="2.9" fill="#3a2c22"/><rect x="-3.6" y="-5.25" width="3.3" height=".18" fill="#5a3e28"/><rect x="-3.4" y="-7.8" width="1.3" height="2.4" fill="#f2dcae" opacity=".22"/>`, 0.02);
    const land = `<svg class="land indoor-land iso rk-land" viewBox="0 -530 1200 900" preserveAspectRatio="xMidYMax slice" style="height:900px">${GLOW_DEFS}${ISO_DEFS}${defs}
      ${isoShell({ floor: '#a98458', seam: '#8e6c44', wallL: '#efe4cc', wallR: '#f4ead4', wainL: '#6e4f36', wainR: '#7a5a3e', batten: '#56402c', trim: '#3e2c1e', edgeU: '#6e5236', edgeV: '#7a5e40', capU: '#e6dcc6', capV: '#ece2cc', top: '#ddd2bc' })}
      ${rug()}<g clip-path="url(#rkWin)">${garden()}</g>${window_()}${bath()}${keyboard()}${above}${doma()}${entrance()}
    </svg>`;
    const props = isoProp(BACKC, back, 1.6) + isoProp(DESK, counter, 2.4) + isoProp([STAIRS[0], STAIRS[1], STAIRS[2], STAIRS[3]], stairs(), 6.6)
      + isoProp(GETA, getabako(), 3.0) + SOFAS.map(([a, b]) => isoProp([a, b, SOFA[2], SOFA[3]], sofa(a, b), 1.5)).join('') + isoProp(LOWT, lowTable(), 1.4)
      + isoProp(IKEBANA, ikebana(), 3.6) + ANDON.map(([u, v]) => isoProp([u - 0.36, u + 0.36, v - 0.36, v + 0.36], andon(u, v), 2.3)).join('') + isoProp(TEA, teaTable(), 2.4)
      + HANG.map(([u, v, h]) => isoProp([u - 0.4, u + 0.4, v - 0.4, v + 0.4], pendant(u, v, h), h + 1.2)).join('');
    const [ex, ey] = isoXY(0, (DOOR[0] + DOOR[1]) / 2, 4.9), [sx, sy] = isoXY(FOOT[0], FOOT[1], 3.2);
    return `${land}${isoLay(props)}${yHeroHtml()}${TOWNEV.castHtml('ryokan')}
      <button type="button" class="thing way-btn" data-act="go-place" data-to="yudori" aria-label="出去（湯けむり通り）" style="margin-left:${Math.round(ex) - 32}px;bottom:${Math.round(ey)}px"><span class="tag">${ySign('today', '出去')}</span></button>
      <button type="button" class="thing way-btn" data-act="go-place" data-to="washitsu" aria-label="上樓（客室・桜の間）" style="margin-left:${Math.round(sx) - 32}px;bottom:${Math.round(sy)}px"><span class="tag">${ySign('stairs', '客室')}</span></button>
      <div class="ysel"></div>`;
  }

  // the 鹿威し's turn (css: rk-shishi, its iterations): コーン as it strikes, in the lobby only
  function mount(y, place) {
    if (place !== 'ryokan') return;
    y.addEventListener('animationiteration', (e) => { if (e.target.classList && e.target.classList.contains('rk-shishi') && !document.hidden) SND.play('kon', { vol: 0.7 }); });
  }
  // the bell on the front desk rung: チーン; 佐藤 behind the desk answers (はい、ただいま。), else when he is there
  function bell(y) {
    const s = y.querySelector('.npc-sato'), line = (TOWN.ONSEN || {}).bell;
    if (s && line) {
      const [X, Y] = npcXY(s), k = Number(s.dataset.k) || 1;
      setTimeout(() => { if (!y.isConnected) return; yBubble(y, X + 600, 370 - Y - 190 * ISO.k * k, esc(line[0]), 2600); speakAs('sato', line[0]); toast(`佐藤：「${line[0]}」（${line[1]}這裡的「ただいま」是「馬上」的意思，不是「我回來了」。）`, 5200); }, 700);
    } else toast(`呼び鈴：佐藤先生現在不在櫃台（${((TOWN.CAST.sato || {}).hours || []).filter((x) => x[2] === 'ryokan').map(([a, b]) => `${a}:00〜${b}:00`).join('、')}）。`, 4200);   // his hours as CAST has them
  }
  // ===== 桜の間 (up the stairs): the 広縁 along the left wall (u 0–5.6, boards; its window onto the mountains and the river), its shoji
  // drawn back to the room's far end; eight tatami (u 6–22); in the right wall the 床の間 (its scroll and flowers), the 床柱, the TV on
  // its stand, the 押し入れ under the air conditioner, the door from the corridor =====
  const ENGAWA = 5.6, EWIN = [1.0, 15.0, 0.9, 6.6];   // the 広縁's depth; its window [v0, v1, h0, h1] in the left wall
  const SHOJI = [5.4, 5.9, 0, 8.0];   // the shoji, drawn back, stacked at the room's far end
  const TOKO = [6.8, 12.0, 1.4, 6.0], POST = [12.0, 12.4];   // the 床の間: [u0, u1, its depth, its opening's height]; the 床柱
  const TV = [12.8, 15.2, 0.15, 1.2], OSHI = [15.6, 18.8], AC = [15.9, 18.5, 6.5, 7.3], RDOOR = [19.4, 21.8];
  const ZATAKU = [11.6, 16.4, 6.6, 9.4], ZTOP = 1.0;   // the 座卓
  const ZAISU = [[12.7, 5.5, 'kneel turn flip'], [15.3, 5.5, 'kneel turn flip'], [12.7, 10.5, 'kneel back turn'], [15.3, 10.5, 'kneel back turn']];   // its four 座椅子: [u, v, how one sits there]
  const PLATE = [12.7, 8.6];   // the welcome まんじゅう's plate on the 座卓 (TOWN.GIFTS.kangei)
  const LAMP = [14, 8, 4.9];   // the paper lamp hung over the 座卓: [u, v, its shade's foot]
  const YTRAY = [19.2, 21.4, 12.6, 14.2];   // the yukata in their tray
  const ENGAWA_SET = [1.6, 3.6, 6.8, 12.4], ECHAIRS = [[2.6, 7.5, 'bench turn flip'], [2.6, 11.7, 'bench back turn']], ETABLE = [2.6, 9.6];   // the 広縁's two chairs and its little table
  const ROOM_DOOR = [20.6, 0.6];   // where one comes in from the corridor (the lobby's stairs)
  const MATS = [[6, 14, 0, 4, 'u'], [14, 22, 0, 4, 'u'], [6, 10, 4, 12, 'v'], [18, 22, 4, 12, 'v'], [10, 18, 4, 8, 'u'], [10, 18, 8, 12, 'u'], [6, 14, 12, 16, 'u'], [14, 22, 12, 16, 'u']];   // eight tatami (8 × 4), no four corners meeting
  const had = () => ((state.purse || {}).gifts || {}).kangei === day();
  const sig = () => (had() ? 'w' : 'm');   // TOWNEV.sig('washitsu'): the まんじゅう on its plate, or its wrapper
  // the eight tatami, a hair above the floor: their rush in fine lines across, each lit a little differently by its weave's way, the
  // cloth edging (縁) down their long sides (no sheen strokes: they read as stray pills, fix round 1)
  function tatami() {
    return MATS.map(([u0, u1, v0, v1, dir]) => {
      const c = dir === 'u' ? '#cbc58c' : '#c1bb80', h = 0.05;
      const weave = dir === 'u' ? Array.from({ length: Math.floor((u1 - u0) / 0.25) }, (_, k) => `M${f(u0 + 0.125 + k * 0.25)} ${f(v0 + 0.12)} V${f(v1 - 0.12)}`).join(' ') : Array.from({ length: Math.floor((v1 - v0) / 0.25) }, (_, k) => `M${f(u0 + 0.12)} ${f(v0 + 0.125 + k * 0.25)} H${f(u1 - 0.12)}`).join(' ');
      const heri = dir === 'u' ? `M${u0} ${f(v0 + 0.06)} H${u1} M${u0} ${f(v1 - 0.06)} H${u1}` : `M${f(u0 + 0.06)} ${v0} V${v1} M${f(u1 - 0.06)} ${v0} V${v1}`;
      return iPoly([[u0, v0, h], [u1, v0, h], [u1, v1, h], [u0, v1, h]], c) + iOnF(h, `<path d="${weave}" stroke="#a9a46e" stroke-opacity=".45" stroke-width=".03"/><path d="${heri}" stroke="#2e3a2a" stroke-width=".12"/><path d="M${u0} ${v0} H${u1} V${v1} H${u0} Z" fill="none" stroke="#9e9866" stroke-width=".03"/>`);
    }).join('');
  }
  // the 広縁's boards (lighter, along it), the threshold's track (敷居) between it and the tatami
  const engawaFloor = () => iOnF(0, `<rect x="0" y="0" width="${ENGAWA}" height="16" fill="#d2b286"/><path d="${Array.from({ length: 7 }, (_, i) => `M${f(0.8 * (i + 1))} 0 V16`).join(' ')}" stroke="#b8966a" stroke-width=".04"/><path d="M${f(ENGAWA - 0.2)} 0 V16" stroke="#8a6a46" stroke-width=".4"/><path d="M${f(ENGAWA - 0.35)} 0 V16 M${f(ENGAWA - 0.05)} 0 V16" stroke="#6e5236" stroke-width=".04"/>`);
  // the view through the 広縁's window, drawn on the wall's own plane behind its glass: the sky (stars and the moon by night), the far
  // ranges, the near ridge in cedars and the month's trees, the river down the valley with its red bridge
  function view() {
    const [v0, v1, h0, h1] = EWIN, [c1, c2] = season(), X = (v) => f(-v);
    const far = `M${X(v1)} -2.6 L${X(13.6)} -4.4 L${X(12)} -3.9 L${X(10.4)} -4.9 L${X(8.6)} -4.2 L${X(7)} -5.2 L${X(5.2)} -4.3 L${X(3.6)} -4.8 L${X(2.2)} -4.1 L${X(v0)} -4.5 V-2 H${X(v1)} Z`;
    const near = `M${X(v1)} -2.2 Q${X(13.2)} -3.6 ${X(11.4)} -3.1 T${X(8)} -3.4 T${X(4.6)} -2.9 T${X(v0)} -3.3 V-.8 H${X(v1)} Z`;
    const river = `M${X(v1)} -1.45 C${X(12)} -1.8 ${X(9.5)} -1.2 ${X(7)} -1.55 S${X(3)} -1.2 ${X(v0)} -1.6 L${X(v0)} -1.35 C${X(3)} -.95 ${X(6)} -1.3 ${X(7)} -1.3 S${X(12)} -1.55 ${X(v1)} -1.2 Z`;
    const cedars = [13.8, 12.9, 11.6, 6.4, 5.5, 3.1, 2.2, 1.5].map((v, i) => { const x = -v, b = -1.05 - (i % 3) * 0.12, t = b - 1.1 - (i % 2) * 0.3; return `M${f(x - 0.32)} ${f(b)} L${f(x)} ${f(t)} L${f(x + 0.32)} ${f(b)} Z`; }).join(' ');
    const trees = [[10.6, -1.0], [9.4, -1.1], [4.2, -1.05]].map(([v, b], i) => `<circle cx="${X(v)}" cy="${f(b - 0.35)}" r=".42" ${dn(i % 2 ? c1 : c2, '#141a30')}/>`).join('');
    const bridge = `<path d="M${X(8.4)} -1.62 Q${X(7.5)} -2.05 ${X(6.6)} -1.62" fill="none" ${dns('#c8322a', '#3a2436')} stroke-width=".09"/><path d="M${X(8.4)} -1.62 H${X(6.6)}" ${dns('#c8322a', '#3a2436')} stroke-width=".06"/>`;
    return `<defs><clipPath id="rkView"><rect x="${X(v1)}" y="${-h1}" width="${f(v1 - v0)}" height="${f(h1 - h0)}"/></clipPath></defs><g clip-path="url(#rkView)">
      <rect x="${X(v1)}" y="${-h1}" width="${f(v1 - v0)}" height="${f(h1 - h0)}" ${dn('#cfe6f2', '#1b2050')}/><rect x="${X(v1)}" y="${f(-h1 + 2.4)}" width="${f(v1 - v0)}" height="2.6" ${dn('#e8f2f4', '#262a5a')} opacity=".6"/>
      <g class="rk-night">${[[13.6, -6.1], [11.2, -5.8], [9.1, -6.3], [6.4, -5.9], [3.3, -6.2], [2.0, -5.6], [7.7, -5.5]].map(([v, y], i) => `<circle cx="${X(v)}" cy="${y}" r="${i % 3 ? 0.03 : 0.05}" fill="#fff"/>`).join('')}<circle cx="${X(4.2)}" cy="-5.6" r=".3" fill="#fbf3d0"/><circle cx="${X(4.32)}" cy="-5.66" r=".27" fill="#262a5a" fill-opacity=".85"/></g>
      <path d="${far}" ${dn('#9cb4c6', '#232a4e')}/><path d="${near}" ${dn('#5f8a68', '#16223a')}/><path d="${cedars}" ${dn('#3f6a4c', '#101a2c')}/>${trees}
      <path d="${river}" ${dn('#8fc4dc', '#2a3a6a')}/>${bridge}<path d="M${X(v1)} -.8 H${X(v0)} V-.6 H${X(v1)} Z" ${dn('#4f7a5a', '#121c30')}/></g>`;
  }
  // the window's sashes and frame in front of the view: four panes, their frames, the glass catching the light; a low sill
  function engawaWindow() {
    const [v0, v1, h0, h1] = EWIN, wood = '#6e4e32', step = (v1 - v0) / 4;
    return iOnL(view(), -0.02) + wallL(wood, v0 - 0.2, v1 + 0.2, h0 - 0.2, h0, 0.3, { top: '#8a6440' }) + wallL(wood, v0 - 0.2, v1 + 0.2, h1, h1 + 0.24, 0.22)
      + [0, 1, 2, 3, 4].map((k) => wallL(wood, v0 + k * step - 0.08, v0 + k * step + 0.08, h0, h1, 0.14)).join('')
      + iOnL(`<path d="${[0, 1, 2, 3].map((k) => `M${f(-(v0 + k * step + step * 0.7))} ${f(-h1 + 0.4)} l-.9 ${f(h1 - h0 - 1.6)}`).join(' ')}" stroke="#fff" stroke-opacity=".2" stroke-width=".14" stroke-linecap="round"/><path d="M${f(-v1)} ${f(-(h0 + h1) / 2 - 0.4)} H${f(-v0)}" stroke="${wood}" stroke-width=".07"/>`, 0.03);
  }
  // the 床の間, set back into the right wall and drawn true to its depth: its back wall and side, the polished board (床板) on its
  // lacquered front (床框), the scroll hung on its back wall (the room's own: 桜 — a branch in blossom), a celadon vase of blossom on
  // the board; the 落とし掛け over its opening, the 床柱 of natural wood beside it
  function toko() {
    const [t0, t1, d, oh] = TOKO, D = -d, bw = '#e0d0b0';
    const inside = poly([[t0, D, 0], [t1, D, 0], [t1, D, 8], [t0, D, 8]], `fill="${bw}"`) + poly([[t0, D, 0], [t0, 0, 0], [t0, 0, 8], [t0, D, 8]], 'fill="#d2c09c"')
      + iBox('#5a3a24', t0, D, 0, t1, 0, 0.35, { top: '#6e4a2e', fv: '#2b1c12', fu: '#3a2618' }) + iOnF(0.35, `<path d="M${f(t0 + 0.3)} ${f(D + 0.3)} L${f(t1 - 1)} -.2" stroke="#fff" stroke-opacity=".14" stroke-width=".2" stroke-linecap="round"/>`)
      + iOnV(D + 0.02, scroll((t0 + t1) / 2 + 0.3, 'sakura')) + vase(t0 + 1.0, D + 0.55, 'sakura');   // the vase beside the scroll, clear of the 床柱
    const clip = `<clipPath id="rkToko"><path d="M${iPt(t0, 0, 0)} L${iPt(t1, 0, 0)} L${iPt(t1, 0, oh)} L${iPt(t0, 0, oh)} Z"/></clipPath>`;
    return `<defs>${clip}</defs><g clip-path="url(#rkToko)">${inside}</g>` + wallR('#5e4028', t0 - 0.1, t1, oh, oh + 0.26, 0.2, { fv: '#4e3420' })
      + iBox('#a8845a', POST[0], 0, 0, POST[1], 0.36, 8, { fv: '#b8946a', fu: '#8e6c46', top: '#c4a274' }) + iOnV(0.36, `<path d="M${f(POST[0] + 0.12)} -.3 V-7.6 M${f(POST[0] + 0.27)} -1.4 V-6.2" stroke="#7a5a3a" stroke-opacity=".5" stroke-width=".03"/>`);
  }
  // a hanging scroll on a wall's plane (u across, −h up): its mounting of muted silk, the painting — the room's flower or pine in ink
  // and colour — and a red seal; the roller at its foot
  function scroll(u, room) {
    const w = 1.5, top = 5.9, bot = 1.3, pw = 1.1;
    const paint = { sakura: `<path d="M${f(u - 0.4)} -2.4 C${f(u - 0.1)} -3 ${f(u + 0.1)} -3.6 ${f(u + 0.4)} -4.2 M${f(u)} -3.2 q.25 -.1 .4 -.4" stroke="#5a3e2a" stroke-width=".05" fill="none"/>${[[0.4, -4.2], [0.25, -3.8], [-0.05, -3.4], [0.36, -3.45], [-0.25, -2.75], [0.1, -3.0]].map(([dx, y]) => `<circle cx="${f(u + dx)}" cy="${y}" r=".1" fill="#f2b8c6"/>`).join('')}`,
      kiku: `<path d="M${f(u - 0.2)} -2.2 Q${f(u - 0.1)} -3 ${f(u + 0.1)} -3.6 M${f(u + 0.25)} -2.3 Q${f(u + 0.2)} -2.9 ${f(u + 0.3)} -3.2" stroke="#4a6a3a" stroke-width=".05" fill="none"/><circle cx="${f(u + 0.1)}" cy="-3.7" r=".2" fill="#e8c23a"/><circle cx="${f(u + 0.3)}" cy="-3.3" r=".15" fill="#f4f0e2"/><circle cx="${f(u + 0.1)}" cy="-3.7" r=".08" fill="#c89a2a"/>`,
      matsu: `<path d="M${f(u - 0.3)} -2.2 C${f(u - 0.1)} -2.8 ${f(u + 0.3)} -3 ${f(u + 0.1)} -3.8" stroke="#4a3426" stroke-width=".07" fill="none"/>${[[0.1, -3.85, 0.32], [-0.15, -3.2, 0.28], [0.3, -2.95, 0.24]].map(([dx, y, r]) => `<ellipse cx="${f(u + dx)}" cy="${y}" rx="${r}" ry="${f(r * 0.35)}" fill="#3f6a4c"/>`).join('')}` }[room];
    return `<rect x="${f(u - w / 2)}" y="${-top}" width="${w}" height="${f(top - bot)}" fill="#a89a6a"/><rect x="${f(u - w / 2 + 0.08)}" y="${f(-top + 0.5)}" width="${f(w - 0.16)}" height=".14" fill="#7a6a3a"/>
      <rect x="${f(u - pw / 2)}" y="${f(-top + 0.8)}" width="${pw}" height="${f(top - bot - 1.4)}" fill="#f6f1e4"/>${paint}<rect x="${f(u + 0.3)}" y="${f(-bot - 0.95)}" width=".14" height=".14" fill="#c8322a"/>
      <rect x="${f(u - w / 2 - 0.1)}" y="${f(-bot - 0.02)}" width="${f(w + 0.2)}" height=".12" rx=".05" fill="#3a2a1c"/><path d="M${f(u)} ${-top} l-.3 -.4 M${f(u)} ${-top} l.3 -.4" stroke="#3a2a1c" stroke-width=".03"/>`;
  }
  // a vase on a board (its foot at u, v, on the 床板): celadon, its flowers the room's (桜 a branch in blossom; 菊 yellow and white
  // chrysanthemums; 松 a pine sprig with a red camellia)
  function vase(u, v, room) {
    const [x, y] = at(u, v, 0.35);
    const fl = { sakura: `<path d="M${x} ${r1(y - 18)} C${r1(x - 6)} ${r1(y - 34)} ${r1(x + 6)} ${r1(y - 46)} ${r1(x - 4)} ${r1(y - 62)}" stroke="#5a3e2a" stroke-width="1.6" fill="none"/><path d="M${r1(x + 1)} ${r1(y - 36)} q9 -6 12 -16" stroke="#5a3e2a" stroke-width="1.1" fill="none"/>${[[-4, -62, 3.6], [-1, -54, 3.4], [3, -44, 3.4], [13, -52, 3.2], [9, -46, 3], [-6, -40, 3]].map(([dx, dy, r]) => `<circle cx="${r1(x + dx)}" cy="${r1(y + dy)}" r="${r}" fill="#f2b8c6"/><circle cx="${r1(x + dx)}" cy="${r1(y + dy)}" r="${r1(r * 0.35)}" fill="#f8dce4"/>`).join('')}` }[room];
    return `<path d="M${r1(x - 5)} ${y} Q${r1(x - 8)} ${r1(y - 10)} ${r1(x - 3)} ${r1(y - 16)} V${r1(y - 19)} H${r1(x + 3)} V${r1(y - 16)} Q${r1(x + 8)} ${r1(y - 10)} ${r1(x + 5)} ${y} Z" fill="#8ab4a4"/><path d="M${r1(x + 1)} ${r1(y - 1)} Q${r1(x + 6)} ${r1(y - 9)} ${r1(x + 2)} ${r1(y - 15)}" stroke="#6a9484" stroke-width="2" fill="none"/><ellipse cx="${x}" cy="${r1(y - 19)}" rx="3" ry="1" fill="#6a9484"/>${fl || ''}`;
  }
  // the walls' woodwork: posts at the corners and between, the 長押 (a beam round the room over the doors' height)
  const woodwork = () => wallR('#7a5a3c', 0, 22, 5.6, 5.86, 0.12, { fv: '#6e4e32' }) + wallL('#7a5a3c', 0, 16, 5.6, 5.86, 0.12, { fu: '#6e4e32' })
    + [5.6, 6.7].map((u) => wallR('#8a6a46', u - 0.12, u + 0.12, 0, 8, 0.14)).join('') + [15.4, 19.2].map((u) => wallR('#8a6a46', u - 0.1, u + 0.1, 0, 5.6, 0.1)).join('');
  // the 押し入れ in the right wall: two fusuma (a pale mountain range printed along their foot, round pulls) over a dark inside with
  // the futons stacked on its shelf (seen as one slides open: data-fx oshiire); the 天袋's little pair above; the air conditioner over it
  function oshiire() {
    const [o0, o1] = OSHI, H = 5.2, w = (o1 - o0) / 2;
    const inside = `<rect x="${o0}" y="${-H}" width="${f(o1 - o0)}" height="${H}" fill="#3a2c22"/><rect x="${o0}" y="${f(-H / 2 - 0.1)}" width="${f(o1 - o0)}" height=".14" fill="#6e5236"/>${['#f4f0e8', '#e8a8b4', '#f4f0e8', '#8aaad0', '#f4f0e8'].map((c, i) => `<rect x="${f(o0 + 0.15)}" y="${f(-H / 2 - 0.4 - i * 0.42)}" width="${f(o1 - o0 - 0.3)}" height=".38" rx=".12" fill="${c}"/>`).join('')}`;
    const panel = (x, cls) => `<g class="${cls}"><rect x="${f(x)}" y="${-H}" width="${f(w)}" height="${H}" fill="#efe6d2" stroke="#3a2a1c" stroke-width=".08"/><path d="M${f(x + 0.05)} -.8 Q${f(x + w * 0.3)} -1.7 ${f(x + w * 0.5)} -1.2 T${f(x + w - 0.05)} -1.5 V-.05 H${f(x + 0.05)} Z" fill="#b8c4cc" fill-opacity=".55"/><path d="M${f(x + 0.05)} -1.3 Q${f(x + w * 0.4)} -2.2 ${f(x + w * 0.7)} -1.7 T${f(x + w - 0.05)} -2.0" fill="none" stroke="#a0aeb8" stroke-width=".04"/><circle cx="${f(cls === 'rk-fusuma-r' ? x + 0.25 : x + w - 0.25)}" cy="-2.6" r=".1" fill="none" stroke="#3a2a1c" stroke-width=".05"/></g>`;
    const ten = [0, 1].map((k) => `<rect x="${f(o0 + k * w)}" y="-6.7" width="${f(w)}" height=".9" fill="#efe6d2" stroke="#3a2a1c" stroke-width=".07"/><circle cx="${f(o0 + k * w + (k ? 0.2 : w - 0.2))}" cy="-6.25" r=".06" fill="none" stroke="#3a2a1c" stroke-width=".04"/>`).join('');
    const [a0, a1, ah0, ah1] = AC;
    const ac = iBox('#f2f2ee', a0, 0, ah0, a1, 0.55, ah1, { top: '#fbfbf8', fv: '#e8e8e2', fu: '#d6d6d0' }) + iOnV(0.55, `<path d="M${f(a0 + 0.15)} ${f(-ah0 - 0.16)} H${f(a1 - 0.15)}" stroke="#b8bcc0" stroke-width=".06"/><g class="rk-acon"><path d="M${f(a0 + 0.4)} ${f(-ah0 + 0.25)} q.2 .2 0 .4 M${f(a0 + 1.2)} ${f(-ah0 + 0.25)} q.2 .2 0 .4 M${f(a0 + 2)} ${f(-ah0 + 0.25)} q.2 .2 0 .4" stroke="#9ad0ec" stroke-width=".05" fill="none"/></g><circle class="rk-acled" cx="${f(a1 - 0.3)}" cy="${f(-ah1 + 0.25)}" r=".05" fill="#9aa0a8"/>`);
    return iOnV(0.02, `<g data-fx="oshiire">${inside}${panel(o0 + w, 'rk-fusuma-r')}${panel(o0, 'rk-fusuma-l')}</g>${ten}`) + wallR('#3a2a1c', o0 - 0.1, o1 + 0.1, H, H + 0.14, 0.12) + wallR('#3a2a1c', o0 - 0.1, o1 + 0.1, 6.7, 6.84, 0.1)
      + `<g data-fx="rkac">${ac}</g>`;
  }
  // the TV on its low stand by the 床の間: dark, its screen catching the room (on, a moment: a weather map — data-fx rktv)
  function tv() {
    const [t0, t1, v0, v1] = TV, sh = 0.9, cu = (t0 + t1) / 2;
    return iBox('#5a3e28', t0, v0, 0, t1, v1, sh, { top: '#6e4e32', fv: '#4e3422', fu: '#42301e' }) + iOnV(v1, `<path d="M${f(cu)} -.12 V${f(-sh + 0.12)}" stroke="#2b1c12" stroke-width=".04"/><circle cx="${f(cu - 0.15)}" cy="-.5" r=".04" fill="#c9a24a"/><circle cx="${f(cu + 0.15)}" cy="-.5" r=".04" fill="#c9a24a"/>`)
      + iBox('#2b2b33', cu - 0.3, 0.55, sh, cu + 0.3, 0.8, sh + 0.08) + iBox('#2b2b33', cu - 0.08, 0.62, sh + 0.08, cu + 0.08, 0.72, sh + 0.35)
      + iBox('#1c1c22', t0 + 0.05, 0.55, sh + 0.3, t1 - 0.05, 0.68, sh + 1.75, { fv: '#24242c' })
      + iOnV(0.68, `<g data-fx="rktv"><rect x="${f(t0 + 0.14)}" y="${f(-sh - 1.66)}" width="${f(t1 - t0 - 0.28)}" height="1.27" fill="#2a2e38"/><path d="M${f(t0 + 0.3)} ${f(-sh - 1.6)} l.7 1.15" stroke="#fff" stroke-opacity=".12" stroke-width=".18"/><g class="rk-screen"><rect x="${f(t0 + 0.14)}" y="${f(-sh - 1.66)}" width="${f(t1 - t0 - 0.28)}" height="1.27" fill="#7ab8e0"/><path d="M${f(t0 + 0.5)} ${f(-sh - 0.6)} q.3 -.6 .7 -.3 q.4 -.5 .7 0 q.3 .2 .2 .5 Z" fill="#6aa860"/><circle cx="${f(t1 - 0.6)}" cy="${f(-sh - 1.25)}" r=".2" fill="#f6d24a"/><rect x="${f(t0 + 0.2)}" y="${f(-sh - 0.55)}" width="${f(t1 - t0 - 0.4)}" height=".14" fill="#1c3a6a"/></g></g>`);
  }
  // the door from the corridor (a wooden sliding door, its frame and handle) and its 長押
  const roomDoor = () => iOnV(0.01, `<rect x="${RDOOR[0]}" y="-5.2" width="${f(RDOOR[1] - RDOOR[0])}" height="5.2" fill="#b89068"/><path d="${[1, 2, 3, 4].map((k) => `M${f(RDOOR[0] + 0.1)} ${f(-k * 1.04)} H${f(RDOOR[1] - 0.1)}`).join(' ')}" stroke="#9a7450" stroke-width=".04"/><rect x="${f(RDOOR[0] + 0.25)}" y="-2.9" width=".1" height=".6" rx=".05" fill="#3a2a1c"/>`) + frameR(RDOOR[0], RDOOR[1], 5.2, '#5e4028');
  // the 座卓: low, its top dark lacquer catching the light; on it the tray of tea things (the pot, two cups turned down, the caddy) and
  // the welcome まんじゅう's plate (RYOKAN.plate: the まんじゅう wrapped, a little card; once had today, its wrapper folded)
  function zataku() {
    const [z0, z1, zv0, zv1] = ZATAKU, H = ZTOP;
    const legs = [[z0 + 0.25, zv0 + 0.25], [z1 - 0.45, zv0 + 0.25], [z0 + 0.25, zv1 - 0.45], [z1 - 0.45, zv1 - 0.45]].map(([u, v]) => iBox('#2b1c12', u, v, 0, u + 0.2, v + 0.2, H - 0.12)).join('');
    const top = iBox('#4a2a1a', z0, zv0, H - 0.12, z1, zv1, H, { top: '#3e2216', fv: '#2e1a10', fu: '#24140c' }) + iOnF(H, `<path d="M${f(z0 + 0.3)} ${f(zv1 - 0.4)} L${f(z0 + 2.2)} ${f(zv0 + 0.3)}" stroke="#fff" stroke-opacity=".1" stroke-width=".5" stroke-linecap="round"/><path d="M${z0} ${f(zv1 - 0.03)} H${f(z1 - 0.03)} V${zv0}" fill="none" stroke="#7a4a30" stroke-width=".04"/>`);
    const tray = iBox('#2b1c12', 14.4, 7.2, H, 15.9, 8.4, H + 0.06, { top: '#3a2418' }) + iCyl(15.4, 7.6, 0.28, H + 0.06, H + 0.42, '#4a4a55', '#5a5a64') + iCylSh(15.4, 7.6, 0.28, H + 0.06, H + 0.42, 0.16)
      + (() => { const [x, y] = at(15.4, 7.6, H + 0.42); return `<ellipse cx="${x}" cy="${r1(y - 1)}" rx="3.4" ry="1.3" fill="#3a3a44"/><path d="M${r1(x + 8)} ${r1(y + 5)} l6 -2" stroke="#4a4a55" stroke-width="2.2" stroke-linecap="round"/><path d="M${r1(x - 7)} ${r1(y - 1)} q-4 -4 1 -6" stroke="#4a4a55" stroke-width="1.4" fill="none"/>`; })()
      + [[14.8, 7.9], [15.1, 8.15]].map(([u, v]) => iCyl(u, v, 0.15, H + 0.06, H + 0.32, '#f2ece0', '#e2dac8')).join('') + iCyl(14.75, 7.45, 0.14, H + 0.06, H + 0.5, '#7a8a5a', '#9aaa76');
    const [lx, ly] = at(LAMP[0], LAMP[1], H), lr = 1.7 * ISO.U * Math.SQRT2;   // the hanging lamp's light, pooled on it
    const pool = `<defs><radialGradient id="rkPool"><stop offset="0" stop-color="#fff6d2" stop-opacity=".55"/><stop offset=".55" stop-color="#ffe9a8" stop-opacity=".22"/><stop offset="1" stop-color="#ffe9a8" stop-opacity="0"/></radialGradient></defs><ellipse cx="${lx}" cy="${ly}" rx="${r1(lr)}" ry="${r1(lr / 2)}" fill="url(#rkPool)"/><ellipse class="rk-glow" cx="${lx}" cy="${ly}" rx="${r1(lr * 1.2)}" ry="${r1(lr * 0.6)}" fill="url(#rkPool)"/>`;
    return legs + top + pool + tray + `<g class="rk-plate">${plate(had())}</g>`;
  }
  // the plate: a small round dish of white glaze, on it the まんじゅう in its paper (white, a red seal of 花月) and a folded card
  // ようこそ beside — or, once had today, only its paper folded small
  function plate(done) {
    const [x, y] = at(PLATE[0], PLATE[1], ZTOP);
    const dish = `<ellipse cx="${x}" cy="${r1(y + 1)}" rx="15" ry="6.4" fill="#2b1c12" fill-opacity=".25"/><ellipse cx="${x}" cy="${y}" rx="14" ry="6" fill="#fbf8f0"/><ellipse cx="${x}" cy="${r1(y - 0.4)}" rx="10.5" ry="4.2" fill="none" stroke="#d6cfc0" stroke-width=".8"/>`;
    return dish + (done ? `<g class="rk-wrap"><path d="M${r1(x - 6)} ${r1(y - 1)} l5 -3 l7 1 l-4 3.6 Z" fill="#f4efe2" stroke="#d9cfba" stroke-width=".5"/><path d="M${r1(x - 2)} ${r1(y - 2.6)} l3 1" stroke="#c8322a" stroke-width=".8"/></g>`
      : `<g class="rk-manju"><path d="M${r1(x - 8)} ${r1(y - 1)} Q${r1(x - 9)} ${r1(y - 9)} ${x} ${r1(y - 9.4)} Q${r1(x + 9)} ${r1(y - 9)} ${r1(x + 8)} ${r1(y - 1)} Q${x} ${r1(y + 2)} ${r1(x - 8)} ${r1(y - 1)} Z" fill="#fbf6ea" stroke="#e0d6c0" stroke-width=".6"/><path d="M${r1(x - 7)} ${r1(y - 4)} Q${x} ${r1(y - 6.4)} ${r1(x + 7)} ${r1(y - 4)}" stroke="#e8dcc4" stroke-width=".6" fill="none"/><circle cx="${x}" cy="${r1(y - 5)}" r="2" fill="#c8322a"/><path d="M${r1(x + 9)} ${r1(y + 1)} l7 -3.4 v-6 l-7 3.4 Z" fill="#fbf8f0" stroke="#c9b48a" stroke-width=".5"/><path d="M${r1(x + 10.6)} ${r1(y - 2.6)} l4 -2" stroke="#c8322a" stroke-width=".7"/></g>`);
  }
  // a 座椅子: its cushion on the tatami, its back of lacquered wood with a padded front, on the side away from the 座卓
  function zaisu(u, v, far) {
    const w = 0.5, c = '#6e3a4e', back = far ? [u - w, v - w, u + w, v - w + 0.18] : [u - w, v + w - 0.18, u + w, v + w];
    const seat = iBox(c, u - w, v - w, 0.05, u + w, v + w, 0.24, { top: '#8a4a62', fv: '#5e3242', fu: '#52283a' }) + iOnF(0.24, `<rect x="${f(u - w + 0.08)}" y="${f(v - w + 0.08)}" width="${f(2 * w - 0.16)}" height="${f(2 * w - 0.16)}" rx=".1" fill="none" stroke="#a8607a" stroke-width=".04"/>`);
    const bk = iBox('#3a2418', back[0], back[1], 0.24, back[2], back[3], 1.55, { top: '#4a2e1e', fv: far ? '#5e3242' : '#3a2418', fu: '#2e1c12' }) + (far ? iOnV(back[3], `<rect x="${f(u - w + 0.1)}" y="-1.48" width="${f(2 * w - 0.2)}" height="1.1" rx=".12" fill="#7a4058"/>`) : '');
    return far ? bk + seat : seat + bk;
  }
  // the 広縁's two chairs (rattan on wooden frames, cushioned) facing each other over a little round table
  function eChair(u, v, faceMore) {
    const w = 0.55, wood = '#6e4a2e', backV = faceMore ? [v - w, v - w + 0.16] : [v + w - 0.16, v + w];
    const legs = [[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([a, b]) => iBox(wood, u + a * (w - 0.08) - 0.05, v + b * (w - 0.08) - 0.05, 0, u + a * (w - 0.08) + 0.05, v + b * (w - 0.08) + 0.05, 0.7)).join('');
    const seat = iBox('#c8a46a', u - w, v - w, 0.7, u + w, v + w, 0.82, { top: '#dcbc84' }) + iBox('#e9dcc2', u - w + 0.06, v - w + 0.06, 0.82, u + w - 0.06, v + w - 0.06, 0.96, { top: '#f2e8d2' });
    const back = iBox('#c8a46a', u - w, backV[0], 0.82, u + w, backV[1], 2.0, { top: '#b8945a', fv: '#c8a46a', fu: '#a8844e' }) + (faceMore ? iOnV(backV[1], `<path d="${[0.2, 0.45, 0.7, 0.95].map((d) => `M${f(u - w + 0.05)} ${f(-0.85 - d)} H${f(u + w - 0.05)}`).join(' ')}" stroke="#a8844e" stroke-width=".04"/>`) : '');
    const arms = [-1, 1].map((a) => iBox(wood, u + a * w - (a > 0 ? 0.08 : 0), v - w, 0.96, u + a * w + (a > 0 ? 0 : 0.08), v + w, 1.3)).join('');
    return faceMore ? back + legs + seat + arms : legs + seat + arms + back;
  }
  function eTable() {
    const [u, v] = ETABLE;
    return iCyl(u, v, 0.12, 0, 1.1, '#5a3e28', '#6e4e32') + iCyl(u, v, 0.4, 0.02, 0.08, '#5a3e28', '#6e4e32') + iCyl(u, v, 0.62, 1.1, 1.18, '#7a5236', '#8a6040')
      + iCyl(u + 0.15, v - 0.1, 0.13, 1.18, 1.42, '#f2ece0', '#e2dac8') + iSteam(u + 0.15, v - 0.1, 1.42, 1.2, 3.4);
  }
  // the shoji drawn back to the room's far end — two panes over two on their tracks: frames of pale wood, the kumiko lattice, paper
  // lit through from the 広縁 by day; the 鴨居 over the track the whole length (data-fx shoji: the front pair slides a little)
  function shoji() {
    const [s0, s1, v0, v1] = SHOJI, H = 6.0, pw = (v1 - v0) / 2;
    const panel = (va) => `<rect x="${f(-(va + pw))}" y="${-H}" width="${f(pw)}" height="${H}" ${dn('#fbf8ee', '#eadcbc')}/><path d="${[1, 2].map((c) => `M${f(-(va + c * pw / 3))} ${-H} V0`).join(' ')} ${[1, 2, 3, 4, 5, 6, 7].map((r) => `M${f(-(va + pw))} ${f(-r * H / 8)} H${f(-va)}`).join(' ')}" stroke="#c8a87a" stroke-width=".04"/><rect x="${f(-(va + pw))}" y="${-H}" width="${f(pw)}" height="${H}" fill="none" stroke="#b08a5a" stroke-width=".12"/><rect x="${f(-(va + pw) + 0.06)}" y="-.5" width="${f(pw - 0.12)}" height=".44" fill="#c8a87a" fill-opacity=".5"/>`;
    return iOnL(`${panel(v0 + 0.25)}${panel(v0 + pw + 0.25)}`, s0 + 0.12) + iOnL(`<g class="rk-shoji">${panel(v0)}${panel(v0 + pw)}</g>`, s1);
  }
  const kamoi = () => iBox('#7a5a3c', 5.45, 0, 6.0, 5.95, 16, 6.32, { top: '#8a6a46', fv: '#6e4e32', fu: '#5e4028' });
  // a square pendant lamp of paper in a wooden frame over the 座卓, on its cord from far above: its paper lit (the top too — nothing
  // dark to read as a lid), a ring of light under it, its light pooled on the 座卓 (more so by night)
  function squareLamp(u, v, h) {
    const a = 0.6, hh = 0.75, wood = '#4a3020', paper = '#fff3d2';
    const [x, y] = at(u, v, h + hh), [gx, gy] = at(u, v, h + hh / 2), [bx, by] = at(u, v, h);
    const box = iBox(paper, u - a, v - a, h, u + a, v + a, h + hh, { top: '#fbe8bc', fv: '#fff6dc', fu: '#f8e6b8' })
      + `<path d="M${iPt(u - a, v + a, h)} L${iPt(u + a, v + a, h)} L${iPt(u + a, v - a, h)} M${iPt(u - a, v + a, h + hh)} L${iPt(u + a, v + a, h + hh)} L${iPt(u + a, v - a, h + hh)} L${iPt(u - a, v - a, h + hh)} L${iPt(u - a, v + a, h + hh)} M${iPt(u + a, v + a, h)} L${iPt(u + a, v + a, h + hh)} M${iPt(u - a, v + a, h)} L${iPt(u - a, v + a, h + hh)} M${iPt(u + a, v - a, h)} L${iPt(u + a, v - a, h + hh)}" stroke="${wood}" stroke-width="1.6" fill="none"/>`
      + iOnV(v + a, `<path d="M${f(u - a)} ${f(-h - hh / 2)} H${f(u + a)} M${f(u)} ${f(-h)} V${f(-h - hh)}" stroke="${wood}" stroke-width=".035"/>`) + `<path d="M${iPt(u + a, v - a, h + hh / 2)} L${iPt(u + a, v + a, h + hh / 2)}" stroke="${wood}" stroke-width="1"/>`;
    const [cx, cy] = at(u, v, ISO.RH), rr = 0.42 * ISO.U * Math.SQRT2;   // the ceiling rose, up where the walls end
    return `<ellipse cx="${cx}" cy="${cy}" rx="${r1(rr)}" ry="${r1(rr / 2)}" fill="#4a3020"/><ellipse cx="${cx}" cy="${r1(cy - 2.4)}" rx="${r1(rr * 0.62)}" ry="${r1(rr * 0.31)}" fill="#6e4e32"/><path d="M${x} ${cy} V${r1(y - 3)}" stroke="#2b2b33" stroke-width="2.2"/><circle cx="${x}" cy="${r1(y - 3)}" r="2.6" fill="#2b2b33"/>${box}
      <ellipse cx="${bx}" cy="${by}" rx="${r1(a * ISO.U * 1.3)}" ry="${r1(a * ISO.U * 0.62)}" fill="#fff8dc" opacity=".85"/>
      <circle cx="${gx}" cy="${gy}" r="52" fill="url(#glw)" opacity=".42"/><circle class="rk-glow" cx="${gx}" cy="${gy}" r="80" fill="url(#glw)"/>`;
  }
  // the yukata set out in their tray (乱れ箱, black lacquer): folded white with indigo, the dark obi across, a small towel
  function ytray() {
    const [y0, y1, yv0, yv1] = YTRAY;
    return iBox('#1c1c22', y0, yv0, 0.05, y1, yv1, 0.32, { top: '#2b2b33', fv: '#24242c', fu: '#18181e' }) + iBox('#a8241c', y0 + 0.08, yv0 + 0.08, 0.32, y1 - 0.08, yv1 - 0.08, 0.34, { top: '#8a1c16' })
      + iBox('#f4f2ec', y0 + 0.2, yv0 + 0.2, 0.34, y1 - 0.2, yv1 - 0.2, 0.6, { top: '#f8f6f0' }) + iOnF(0.6, `<path d="${[0.25, 0.65, 1.05].map((d) => `M${f(y0 + 0.3)} ${f(yv0 + d)} q.3 .15 .6 0 q.3 -.15 .6 0 q.3 .15 .6 0`).join(' ')}" stroke="#2f4a7a" stroke-width=".06" fill="none"/><rect x="${f(y0 + 0.2)}" y="${f((yv0 + yv1) / 2 - 0.12)}" width="${f(y1 - y0 - 0.4)}" height=".24" fill="#2f3a5e"/><rect x="${f(y1 - 0.75)}" y="${f(yv0 + 0.3)}" width=".4" height=".55" fill="#fbf8f0" stroke="#d9d2c2" stroke-width=".03"/>`);
  }
  function washitsuHtml() {
    isoProps = [];
    const land = `<svg class="land indoor-land iso rk-land" viewBox="0 -530 1200 900" preserveAspectRatio="xMidYMax slice" style="height:900px">${GLOW_DEFS}${ISO_DEFS}
      ${isoShell({ floor: '#c8a77c', seam: '#b08e64', wallL: '#ecdfc2', wallR: '#f1e6cc', wainL: '#ecdfc2', wainR: '#f1e6cc', batten: '#ecdfc2', trim: '#ecdfc2', edgeU: '#8a6e4c', edgeV: '#9a7a56', capU: '#e6dcc6', capV: '#ece2cc', top: '#ddd2bc' })}
      ${engawaFloor()}${tatami()}${engawaWindow()}${woodwork()}${toko()}${oshiire()}${roomDoor()}
    </svg>`;
    const [z0, z1, zv0, zv1] = ZATAKU;
    const props = isoProp(SHOJI, `<g data-fx="shoji">${shoji()}</g>`, 6.4) + isoProp([5.45, 5.95, 0, 16], kamoi(), 6.4) + isoProp(TV, tv(), 2.8)
      + isoProp(ZATAKU, zataku(), 1.6) + ZAISU.map(([u, v], i) => isoProp([u - 0.55, u + 0.55, v - 0.55, v + 0.55], zaisu(u, v, i < 2), 1.6)).join('')
      + ECHAIRS.map(([u, v], i) => isoProp([u - 0.6, u + 0.6, v - 0.6, v + 0.6], eChair(u, v, i === 0), 2.1)).join('') + isoProp([ETABLE[0] - 0.65, ETABLE[0] + 0.65, ETABLE[1] - 0.65, ETABLE[1] + 0.65], eTable(), 1.5)
      + isoProp(YTRAY, ytray(), 0.7) + isoProp([LAMP[0] - 0.6, LAMP[0] + 0.6, LAMP[1] - 0.6, LAMP[1] + 0.6], squareLamp(...LAMP), 6.4);
    const [dx, dy] = isoXY(ROOM_DOOR[0], 0, 5.3);
    return `${land}${isoLay(props)}${yHeroHtml()}${TOWNEV.castHtml('washitsu')}
      <button type="button" class="thing way-btn" data-act="go-place" data-to="ryokan" aria-label="下樓（大廳）" style="margin-left:${Math.round(dx) - 32}px;bottom:${Math.round(dy)}px"><span class="tag">${ySign('door', '大廳')}</span></button>
      <div class="ysel"></div>`;
  }
  // the welcome まんじゅう tapped while not had today: given (YEN.gift — free, stamped, the day kept as purse.gifts.kangei, had on a
  // screen of its own before 桜の間), the plate now its wrapper and its things to tap swapped in place
  function welcome(y) {
    if (!TOWN.GIFTS || !TOWN.GIFTS.kangei || !y || !y.isConnected) return;
    if (had()) {   // had today already (on another device, synced in after the room was drawn): its wrapper now, and he says so
      swap(y); const [x, py] = isoPt(PLATE[0], PLATE[1], ZTOP + 1.2); yPop(y, x, py, 'また あした…'); toast('今天的茶點饅頭已經吃過了，明天會再放一個新的。', 3600); return;
    }
    YEN.gift('kangei'); swap(y);
  }
  function swap(y) {
    const p = y && y.querySelector('.rk-plate'); if (!p) return;
    p.innerHTML = plate(had());
    y.querySelectorAll('.use-btn[data-use="manju"], .use-btn[data-use="wrapper"]').forEach((b) => b.remove());
    const w = y.querySelector('.yworld'); if (w) w.insertAdjacentHTML('beforeend', useBtnsHtml('washitsu', (t) => t.id === 'manju' || t.id === 'wrapper'));
    y.dataset.sig = TOWNEV.sig('washitsu');
  }
  // ===== washitsuArt(state): 桜の間 front-on for the 仲居 card (spec §5.2), the room a 仲居 readies: state { window, shoji, light, ac,
  // tv: on/open or not; futon 0–3 laid; zabuton 0–4 set out (or either as its places, [laid?, …]: the 仲居 lays one where it is tapped);
  // tea, yukata, flower: set out or not; room: 'sakura' | 'kiku' | 'matsu' (its
  // scroll and its flowers); cat: the inn's cat asleep on the first futon (or where it is to be laid) }. Each thing its own group
  // data-k="<key>" (a futon's and a cushion's place each its own, data-i), its tap area (an unseen rect) 40 or more on the card's 360
  // across, laid out so that nothing lies over another but the cat. A string of SVG; by night the view in the window and the shoji
  // goes dark, and with the light off the room dims (css: .rk-art) =====
  // the tap areas, in the art's units: each 50 across or more — 40 px where a card on a 360-px phone draws the art (about 296 px wide
  // inside its gutters and padding; fix round 1) — none over another but the cat on futon slot 0
  const ART = { W: 360, H: 350, flower: [62, 56, 114, 158], ac: [118, 4, 200, 58], light: [204, 0, 256, 54], tv: [118, 64, 200, 160], shoji: [204, 56, 274, 160], window: [276, 20, 356, 160],
    futon: [[22, 166, 118, 228], [132, 166, 228, 228], [242, 166, 338, 228]], tea: [128, 232, 232, 284], zabuton: [[62, 238, 116, 292], [244, 238, 298, 292], [118, 292, 172, 346], [188, 292, 242, 346]],
    yukata: [302, 240, 356, 296], cat: [36, 170, 104, 224] };
  const ROOMS = { sakura: { name: '桜', ink: '#5a3e2a', bloom: ['#f2b8c6', '#f8dce4'] }, kiku: { name: '菊', ink: '#4a6a3a', bloom: ['#e8c23a', '#f4f0e2'] }, matsu: { name: '松', ink: '#4a3426', bloom: ['#3f6a4c', '#c8323a'] } };
  let artN = 0;
  const hit = ([x0, y0, x1, y1]) => `<rect x="${x0}" y="${y0}" width="${x1 - x0}" height="${y1 - y0}" fill="#fff" fill-opacity="0"/>`;
  const grp = (k, box, inner, i) => `<g data-k="${k}"${i === undefined ? '' : ` data-i="${i}"`}>${hit(box)}${inner}</g>`;
  // the scroll in the 床の間: its mounting, the painting of the room's own (a branch in blossom, chrysanthemums, a pine), its name brushed
  function artScroll(room) {
    const r = ROOMS[room] || ROOMS.sakura, x = 30, y = 66, w = 32, h = 76;
    const paint = room === 'kiku' ? `<path d="M44 128 Q45 116 48 106 M52 126 Q52 118 55 112" stroke="${r.ink}" stroke-width="1.2" fill="none"/>${[[48, 104, 4.4, 0], [55, 110, 3.6, 1], [43, 113, 3, 0]].map(([cx, cy, rr, k]) => `<circle cx="${cx}" cy="${cy}" r="${rr}" fill="${r.bloom[k]}"/><circle cx="${cx}" cy="${cy}" r="${rr * 0.35}" fill="#c89a2a"/>`).join('')}`
      : room === 'matsu' ? `<path d="M40 130 C44 120 52 118 48 104" stroke="${r.ink}" stroke-width="1.6" fill="none"/>${[[48, 103, 8], [42, 114, 7], [53, 116, 6]].map(([cx, cy, rr]) => `<ellipse cx="${cx}" cy="${cy}" rx="${rr}" ry="${rr * 0.38}" fill="${r.bloom[0]}"/>`).join('')}`
      : `<path d="M38 130 C42 120 46 112 54 100 M46 114 q5 -2 8 -8" stroke="${r.ink}" stroke-width="1.2" fill="none"/>${[[54, 100], [51, 106], [45, 113], [55, 108], [40, 124], [48, 119]].map(([cx, cy]) => `<circle cx="${cx}" cy="${cy}" r="2.2" fill="${r.bloom[0]}"/>`).join('')}`;
    return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#a89a6a"/><rect x="${x + 4}" y="${y + 8}" width="${w - 8}" height="${h - 16}" fill="#f6f1e4"/>${paint}<text x="${x + 9}" y="${y + 21}" font-size="9" font-weight="700" fill="#2b1c12" font-family="'Hiragino Mincho ProN', 'Noto Serif JP', serif">${r.name}</text><rect x="${x + w - 9}" y="${y + h - 14}" width="3" height="3" fill="#c8322a"/>
      <rect x="${x - 2}" y="${y + h - 1}" width="${w + 4}" height="3" rx="1.5" fill="#3a2a1c"/><path d="M${x + w / 2} ${y} l-6 -6 M${x + w / 2} ${y} l6 -6" stroke="#3a2a1c" stroke-width=".8"/>`;
  }
  // the vase on the 床の間's board, and the flowers in it when set out (the room's own)
  function artFlower(room, on) {
    const r = ROOMS[room] || ROOMS.sakura, x = 88, b = 148;
    const vase = `<path d="M${x - 7} ${b} Q${x - 11} ${b - 12} ${x - 4} ${b - 20} V${b - 24} H${x + 4} V${b - 20} Q${x + 11} ${b - 12} ${x + 7} ${b} Z" fill="#8ab4a4"/><path d="M${x + 2} ${b - 2} Q${x + 8} ${b - 12} ${x + 3} ${b - 19}" stroke="#6a9484" stroke-width="2.4" fill="none"/><ellipse cx="${x}" cy="${b - 24}" rx="4" ry="1.4" fill="#5a8474"/>`;
    if (!on) return vase;
    const fl = room === 'kiku' ? `<path d="M${x} ${b - 24} Q${x - 6} ${b - 44} ${x - 10} ${b - 60} M${x} ${b - 24} Q${x + 5} ${b - 46} ${x + 9} ${b - 70} M${x} ${b - 24} Q${x + 1} ${b - 40} ${x - 1} ${b - 52}" stroke="#4a6a3a" stroke-width="1.4" fill="none"/>${[[-10, -62, 6, 0], [9, -72, 6.4, 0], [-1, -54, 5, 1], [12, -54, 4.4, 1], [-12, -46, 4, 0]].map(([dx, dy, rr, k]) => `<circle cx="${x + dx}" cy="${b + dy}" r="${rr}" fill="${r.bloom[k]}"/><circle cx="${x + dx}" cy="${b + dy}" r="${(rr * 0.35).toFixed(1)}" fill="#c89a2a"/>`).join('')}`
      : room === 'matsu' ? `<path d="M${x} ${b - 24} C${x - 4} ${b - 44} ${x + 8} ${b - 54} ${x + 2} ${b - 76}" stroke="#4a3426" stroke-width="2" fill="none"/>${[[2, -76, 12], [-8, -60, 11], [10, -52, 9]].map(([dx, dy, rr]) => `<ellipse cx="${x + dx}" cy="${b + dy}" rx="${rr}" ry="${(rr * 0.4).toFixed(1)}" fill="${r.bloom[0]}"/>`).join('')}<circle cx="${x - 6}" cy="${b - 36}" r="4.6" fill="${r.bloom[1]}"/><circle cx="${x - 6}" cy="${b - 36}" r="1.6" fill="#e6c25a"/>`
      : `<path d="M${x} ${b - 24} C${x - 8} ${b - 46} ${x + 8} ${b - 62} ${x - 4} ${b - 86} M${x + 1} ${b - 46} q12 -8 16 -22" stroke="${r.ink}" stroke-width="1.6" fill="none"/>${[[-4, -86, 4], [-1, -74, 3.6], [3, -60, 3.6], [16, -68, 3.4], [12, -58, 3.2], [-7, -52, 3.2], [-9, -66, 3]].map(([dx, dy, rr]) => `<circle cx="${x + dx}" cy="${b + dy}" r="${rr}" fill="${r.bloom[0]}"/><circle cx="${x + dx}" cy="${b + dy}" r="${(rr * 0.35).toFixed(1)}" fill="${r.bloom[1]}"/>`).join('')}`;
    return vase + fl;
  }
  // the view outside a window: the sky (stars by night), the ranges, the river (for the big window), or the garden's green
  function artView(x0, y0, x1, y1, river) {
    const w = x1 - x0, h = y1 - y0, hz = y0 + h * 0.52;
    return `<rect x="${x0}" y="${y0}" width="${w}" height="${h}" ${dn('#cfe6f2', '#1b2050')}/><g class="rk-night">${[[0.2, 0.12], [0.6, 0.08], [0.8, 0.22], [0.35, 0.3]].map(([a, b]) => `<circle cx="${(x0 + a * w).toFixed(1)}" cy="${(y0 + b * h).toFixed(1)}" r=".9" fill="#fff"/>`).join('')}</g>
      <path d="M${x0} ${hz} L${x0 + w * 0.25} ${hz - h * 0.2} L${x0 + w * 0.5} ${hz - h * 0.08} L${x0 + w * 0.78} ${hz - h * 0.26} L${x1} ${hz - h * 0.1} V${y1} H${x0} Z" ${dn('#9cb4c6', '#232a4e')}/>
      <path d="M${x0} ${hz + h * 0.12} Q${x0 + w * 0.3} ${hz - h * 0.04} ${x0 + w * 0.55} ${hz + h * 0.08} T${x1} ${hz + h * 0.04} V${y1} H${x0} Z" ${dn('#5f8a68', '#16223a')}/>
      ${river ? `<path d="M${x0} ${y1 - h * 0.16} C${x0 + w * 0.3} ${y1 - h * 0.24} ${x0 + w * 0.6} ${y1 - h * 0.1} ${x1} ${y1 - h * 0.2} V${y1 - h * 0.13} C${x0 + w * 0.6} ${y1 - h * 0.04} ${x0 + w * 0.3} ${y1 - h * 0.17} ${x0} ${y1 - h * 0.1} Z" ${dn('#8fc4dc', '#2a3a6a')}/>` : `<path d="M${x0} ${y1 - h * 0.18} Q${x0 + w * 0.5} ${y1 - h * 0.3} ${x1} ${y1 - h * 0.2} V${y1} H${x0} Z" ${dn('#4f7a4a', '#121c30')}/>`}`;
  }
  // a laid futon in its place: the mattress (敷布団) in a little perspective, its quilt (掛布団) of the place's colour turned back at its
  // head, the pillow
  function artFuton([x0, y0, x1, y1], i) {
    const q = ['#c8545a', '#4f6f9e', '#d9a43a'][i % 3], qd = mixHex(q, '#1c120a', 0.22), l = x0 + 7, r = x1 - 7, t = y0 + 5, b = y1 - 10, ins = 7, cx = (x0 + x1) / 2;
    return `<path d="M${l + ins} ${t} H${r - ins} L${r} ${b} H${l} Z" fill="#fbf8f0"/><path d="M${l} ${b} H${r} V${b + 6} H${l} Z" fill="#e2dbca"/><path d="M${l} ${b + 6} H${r}" stroke="#c9c0ac" stroke-width="1"/>
      <path d="M${l + ins * 0.6} ${t + 15} H${r - ins * 0.6} L${r + 1.5} ${b - 1} Q${r + 2} ${b + 5} ${r - 5} ${b + 5} H${l + 5} Q${l - 2} ${b + 5} ${l - 1.5} ${b - 1} Z" fill="${q}"/>
      <path d="M${l - 1.5} ${b - 1} Q${l - 2} ${b + 5} ${l + 5} ${b + 5} H${r - 5} Q${r + 2} ${b + 5} ${r + 1.5} ${b - 1} Q${cx} ${b + 2.4} ${l - 1.5} ${b - 1} Z" fill="${qd}"/>
      <path d="M${l + ins * 0.6} ${t + 15} H${r - ins * 0.6} L${r - ins * 0.42} ${t + 20} H${l + ins * 0.42} Z" fill="#fbf8f0"/>${[[0.28, 27], [0.62, 31], [0.45, 38]].map(([a, dy]) => `<circle cx="${(l + (r - l) * a).toFixed(1)}" cy="${t + dy}" r="2.4" fill="#fff" fill-opacity=".35"/>`).join('')}
      <rect x="${cx - 15}" y="${t + 1}" width="30" height="9" rx="4.5" fill="#eef2f6"/><rect x="${cx - 15}" y="${t + 6}" width="30" height="4" rx="2" fill="#d6dde6"/><path d="M${cx - 4} ${t + 1} V${t + 10}" stroke="#8aa6c8" stroke-width="2"/>`;
  }
  // a cushion (座布団) set out in its place: square, in perspective, its tassel at a corner
  function artZabuton([x0, y0, x1, y1]) {
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2 + 2, w = 19, h = 9;
    return `<path d="M${cx - w + 4} ${cy - h} H${cx + w - 4} L${cx + w} ${cy + h} H${cx - w} Z" fill="#7a4a8a"/><path d="M${cx - w} ${cy + h} H${cx + w} V${cy + h + 3} H${cx - w} Z" fill="#5a3468"/><path d="M${cx - w + 8} ${cy - h + 4} H${cx + w - 8} L${cx + w - 6} ${cy + h - 4} H${cx - w + 6} Z" fill="none" stroke="#a274b0" stroke-width=".8"/><circle cx="${cx}" cy="${cy}" r="1.4" fill="#e9d6a8"/><path d="M${cx + w - 2} ${cy + h + 1} l3 4" stroke="#e9d6a8" stroke-width="1.4"/>`;
  }
  // the inn's cat, a calico curled up asleep (on the first futon, or on the tatami where it is to be laid), its tail round it, zzz
  function artCat() {
    const [x0, y0, x1, y1] = ART.cat;
    return `<g transform="translate(${(x0 + x1) / 2 - 75} ${(y0 + y1) / 2 - 188})"><ellipse cx="72" cy="198" rx="22" ry="6" fill="#000" fill-opacity=".12"/><path d="M52 194 Q52 178 70 177 Q90 177 92 192 Q92 200 72 201 Q53 201 52 194 Z" fill="#f4ede0"/><path d="M60 180 Q70 174 80 180 Q76 190 64 188 Z" fill="#d88a3a"/><path d="M82 184 Q90 186 90 194 Q84 192 80 188 Z" fill="#3a3030"/>
      <path d="M52 196 Q46 202 56 204 Q70 206 84 202" stroke="#d88a3a" stroke-width="4" fill="none" stroke-linecap="round"/><circle cx="56" cy="188" r="7.4" fill="#f4ede0"/><path d="M50 183 l1 -6 l4 4 M58 181 l3 -5 l2 6" fill="#d88a3a"/><path d="M52 189 q2 1.4 4 0 M57.6 189 q2 1.4 4 0" stroke="#3a3030" stroke-width=".9" fill="none"/><circle cx="56.8" cy="191.4" r=".8" fill="#e8909a"/>
      <text x="92" y="176" font-size="9" font-weight="700" fill="#8a8ab0" font-family="system-ui, sans-serif">z</text><text x="98" y="169" font-size="7" font-weight="700" fill="#8a8ab0" font-family="system-ui, sans-serif">z</text></g>`;
  }
  function art(st0 = {}) {
    const st = Object.assign({ window: false, shoji: false, light: false, ac: false, tv: false, futon: 0, zabuton: 0, tea: false, yukata: false, flower: false, room: 'sakura', cat: false }, st0);
    const room = ROOMS[st.room] ? st.room : 'sakura', uid = `rkA${++artN}`;
    const laid = (v, n) => (Array.isArray(v) ? (i) => Boolean(v[i]) : (i) => i < Math.max(0, Math.min(n, Number(v) || 0)));   // a count (the first ones) or its places
    const fOn = laid(st.futon, 3), zOn = laid(st.zabuton, 4);
    // the room's shell: the ceiling's boards, the side walls going back, the back wall of sand plaster, its 長押 and posts, the tatami
    const shell = `<rect width="${ART.W}" height="${ART.H}" fill="#cbc58c"/><path d="M0 0 H360 V10 H0 Z" fill="#8a6a4a"/><path d="M0 4 H360" stroke="#6e5236" stroke-width=".8"/>
      <path d="M0 0 L16 10 V158 L0 174 Z" fill="#ddcfae"/><path d="M360 0 L344 10 V158 L360 174 Z" fill="#ddcfae"/><rect x="16" y="10" width="328" height="148" fill="#eadcc0"/>
      <rect x="16" y="52" width="328" height="5" fill="#7a5a3c"/><path d="M16 57 H344" stroke="#5e4028" stroke-width=".8"/>${[16, 112, 199, 274, 340].map((x) => `<rect x="${x}" y="10" width="4" height="148" fill="#8a6a46"/>`).join('')}
      <path d="M16 158 H344 L360 174 V350 H0 V174 Z" fill="#cbc58c"/><path d="M16 158 H344" stroke="#9e9866" stroke-width="1.2"/>
      <path d="M8 184 H352 M0 232 H360 M0 292 H360" stroke="#2e3a2a" stroke-width="2.4" stroke-opacity=".85"/><path d="${[60, 130, 200, 270, 330].map((x) => `M${x} 158 L${(x - 180) * 1.7 + 180} 350`).join(' ')}" stroke="#9e9866" stroke-width=".8"/>
      <path d="${Array.from({ length: 18 }, (_, i) => `M0 ${166 + i * 10} H360`).join(' ')}" stroke="#a9a46e" stroke-opacity=".3" stroke-width=".6"/>`;
    // the 床の間: set back (a darker plaster, a shadow at its top and side), its board on its lacquered front, the 床柱 beside it
    const toko = `<rect x="20" y="60" width="88" height="98" fill="#dccaa6"/><path d="M20 60 H108 V64 H24 V158 H20 Z" fill="#000" fill-opacity=".08"/><rect x="20" y="146" width="88" height="8" fill="#6a4228"/><rect x="20" y="153" width="88" height="5" fill="#2b1c12"/>${artScroll(room)}<rect x="106" y="58" width="6" height="100" fill="#a8845a"/><rect x="20" y="57" width="92" height="4" fill="#5e4028"/>`;
    const flower = grp('flower', ART.flower, artFlower(room, st.flower));
    // the air conditioner: on — its louver open, its light green, a breath of cool air
    const ac = grp('ac', ART.ac, `<rect x="120" y="16" width="74" height="20" rx="3" fill="#f6f6f2" stroke="#d6d6d0" stroke-width=".8"/><rect x="120" y="31" width="74" height="5" rx="2" fill="#e2e2dc"/><rect x="124" y="20" width="18" height="3" rx="1" fill="#e2e2dc"/>
      ${st.ac ? `<path d="M124 37 L190 37 L188 41 L126 41 Z" fill="#9aa4ae"/><circle cx="186" cy="21" r="1.6" fill="#5ad07a"/><path d="M134 44 q4 3 0 6 M152 44 q4 3 0 6 M170 44 q4 3 0 6" stroke="#9ad0ec" stroke-width="1.4" fill="none" stroke-linecap="round"/>` : '<path d="M124 36 H190" stroke="#c4c4be" stroke-width="1"/><circle cx="186" cy="21" r="1.6" fill="#b8bcc0"/>'}`);
    // the ceiling light: a square lamp of paper in a wooden frame on its cord — lit, or dark
    const light = grp('light', ART.light, `<path d="M227 0 V14" stroke="#2b2b33" stroke-width="1.4"/><rect x="209" y="14" width="36" height="28" rx="2" fill="${st.light ? '#fff2c4' : '#e2dccb'}" stroke="#3a2a1c" stroke-width="1.6"/><path d="M209 28 H245 M227 14 V42" stroke="#3a2a1c" stroke-width="1"/><rect x="207" y="12" width="40" height="3" fill="#3a2a1c"/>${st.light ? '<rect x="211" y="16" width="32" height="24" fill="#fff8de" fill-opacity=".7"/>' : ''}`);
    // the TV on its low stand: on — a picture (the weather), its glow; off — dark glass
    const tv = grp('tv', ART.tv, `<rect x="122" y="136" width="70" height="22" fill="#5a3e28"/><path d="M157 138 V156" stroke="#3a2618" stroke-width=".8"/><circle cx="153" cy="147" r="1" fill="#c9a24a"/><circle cx="161" cy="147" r="1" fill="#c9a24a"/><rect x="150" y="130" width="14" height="6" fill="#2b2b33"/>
      <rect x="124" y="82" width="66" height="50" rx="2" fill="#1c1c22"/>${st.tv ? '<rect x="128" y="86" width="58" height="40" fill="#7ab8e0"/><path d="M128 116 q12 -10 22 -4 q10 -8 22 0 q8 2 14 -2 V126 H128 Z" fill="#6aa860"/><circle cx="174" cy="96" r="5" fill="#f6d24a"/><rect x="128" y="119" width="58" height="7" fill="#1c3a6a"/><path d="M132 122.5 h30" stroke="#fff" stroke-width="1.4"/>' : '<rect x="128" y="86" width="58" height="40" fill="#2a2e38"/><path d="M134 88 l16 36" stroke="#fff" stroke-opacity=".12" stroke-width="6"/>'}`);
    // the shoji over a little window onto the garden: shut — two panes of paper on their lattice; open — the right one slid behind the left
    const pane = (x) => `<rect x="${x}" y="58" width="32" height="98" fill="#fbf8ee"/><path d="M${x + 10.7} 58 V156 M${x + 21.3} 58 V156 ${[1, 2, 3, 4, 5, 6, 7].map((r) => `M${x} ${58 + r * 12.25} H${x + 32}`).join(' ')}" stroke="#c8a87a" stroke-width=".9"/><rect x="${x}" y="58" width="32" height="98" fill="none" stroke="#b08a5a" stroke-width="2"/><rect x="${x + 1}" y="146" width="30" height="9" fill="#c8a87a" fill-opacity=".5"/>`;
    const shoji = grp('shoji', ART.shoji, `<rect x="204" y="56" width="68" height="102" fill="#6e5236"/>${artView(206, 58, 270, 156, false)}${st.shoji ? pane(209) + pane(206) : pane(206) + pane(238)}`);
    // the big window onto the mountains and the river: shut — two sashes of glass catching the light; open — the right slid over the left
    const sash = (x, glass) => `<rect x="${x}" y="24" width="36" height="132" fill="${glass ? '#fff' : 'none'}" fill-opacity=".1" stroke="#6e4e32" stroke-width="3"/><path d="M${x} 90 H${x + 36}" stroke="#6e4e32" stroke-width="2"/>${glass ? `<path d="M${x + 8} 30 l12 40 M${x + 22} 96 l8 28" stroke="#fff" stroke-opacity=".45" stroke-width="3" stroke-linecap="round"/>` : ''}`;
    const win = grp('window', ART.window, `<rect x="278" y="22" width="76" height="136" fill="#6e4e32"/>${artView(280, 24, 352, 156, true)}${st.window ? `${sash(280, true)}${sash(284, true)}<path d="M330 60 q6 -4 12 0 M326 76 q6 -4 12 0" stroke="#fff" stroke-opacity=".8" stroke-width="1.4" fill="none" stroke-linecap="round"/><circle cx="338" cy="104" r="2.4" fill="${(ROOMS[room].bloom || [])[0]}"/>` : `${sash(280, true)}${sash(316, true)}`}<rect x="276" y="154" width="80" height="5" fill="#5a3e28"/>`);
    // the futons' three places along the floor, the cat on the first
    const futon = ART.futon.map((b, i) => grp('futon', b, fOn(i) ? artFuton(b, i) : '', i)).join('');
    const cat = st.cat ? grp('cat', ART.cat, artCat()) : '';
    // the 座卓 (dark lacquer), the tea things on it when ready, its four cushions' places round it, the yukata's tray
    const table = `<path d="M124 240 H236 L244 264 H116 Z" fill="#3e2216"/><path d="M130 244 L152 244 L144 260 H122 Z" fill="#fff" fill-opacity=".07"/><rect x="116" y="264" width="128" height="7" fill="#2e1a10"/><rect x="122" y="271" width="6" height="10" fill="#2b1c12"/><rect x="232" y="271" width="6" height="10" fill="#2b1c12"/>`;
    const tea = grp('tea', ART.tea, st.tea ? `<path d="M150 248 H210 L214 260 H146 Z" fill="#2b1c12"/><ellipse cx="166" cy="250" rx="9" ry="7" fill="#4a4a55"/><ellipse cx="166" cy="244" rx="5" ry="1.8" fill="#3a3a44"/><path d="M175 248 l6 -3" stroke="#4a4a55" stroke-width="2.4" stroke-linecap="round"/><path d="M158 244 q-4 -6 2 -9" stroke="#4a4a55" stroke-width="1.6" fill="none"/>
      <path d="M184 250 h9 l-1 7 h-7 Z" fill="#f2ece0"/><path d="M196 252 h9 l-1 7 h-7 Z" fill="#f2ece0"/><rect x="200" y="238" width="9" height="13" rx="2" fill="#7a8a5a"/><rect x="200" y="238" width="9" height="3" fill="#5a6a3a"/>` : '');
    const zabuton = ART.zabuton.map((b, i) => grp('zabuton', b, zOn(i) ? artZabuton(b) : '', i)).join('');
    const yukata = grp('yukata', ART.yukata, `<g transform="translate(2 6)"><path d="M304 252 H346 L350 268 H300 Z" fill="#1c1c22"/><path d="M307 254 H343 L346 265 H304 Z" fill="#a8241c"/><path d="M300 268 H350 V272 H300 Z" fill="#2b2b33"/>
      ${st.yukata ? '<path d="M308 250 H342 L345 262 H305 Z" fill="#f4f2ec"/><path d="M309 253 q5 2 10 0 q5 -2 10 0 q5 2 10 0 M308 258 q5 2 10 0 q5 -2 10 0 q5 2 10 0" stroke="#2f4a7a" stroke-width="1" fill="none"/><path d="M306 255.5 H344 L344.6 258 H305.4 Z" fill="#2f3a5e"/><rect x="334" y="246" width="9" height="6" fill="#fbf8f0" stroke="#d9d2c2" stroke-width=".5"/>' : ''}</g>`);
    // the light: lit — a warm glow from the lamp; off — the room dimmer (more so by night)
    const glow = st.light ? `<defs><radialGradient id="${uid}g"><stop offset="0" stop-color="#ffe9b0" stop-opacity=".5"/><stop offset="1" stop-color="#ffe9b0" stop-opacity="0"/></radialGradient></defs><circle cx="227" cy="60" r="150" fill="url(#${uid}g)" pointer-events="none"/>` : '';
    const dim = st.light ? '' : `<rect class="rk-dim" width="${ART.W}" height="${ART.H}" fill="#1c1430" pointer-events="none"/>`;
    return `<svg class="rk-art" viewBox="0 0 ${ART.W} ${ART.H}" role="img" aria-label="${ROOMS[room].name}の間">${shell}${toko}${glow}${flower}${ac}${light}${tv}${shoji}${win}${futon}${cat}${table}${tea}${zabuton}${yukata}${dim}</svg>`;
  }
  return { ART, art, ROOM_DOOR, had, sig, washitsuHtml, welcome, ENGAWA, EWIN, SHOJI, TOKO, POST, TV, OSHI, AC, RDOOR, ZATAKU, ZTOP, ZAISU, PLATE, YTRAY, ENGAWA_SET, ECHAIRS, ETABLE, DOMA, EDGE, GETA, DOOR, STAIRS, FOOT, DESK, BACKC, BELL, LEDGER, KEYS, WIN, BATH, SOFAS, SOFA, LOWT, IKEBANA, ANDON, TEA, TEA_H, HANG, html: lobbyHtml, mount, bell, day, dn, dns, poly, at };
})();
const ryokanHtml = () => RYOKAN.html(), washitsuHtml = () => RYOKAN.washitsuHtml();

// ---- each room's floor walked round its things (2026-11-24, as 湯畑's review found: never into furniture, through a wall nor behind
// the front desk): [u0, u1, v0, v1] on the floor. A spot kept inside one is moved off it on arrival (yFree), one off the floor back onto
// it (isoClamp) ----
WALK_BLOCK.ryokan = [
  [0, 2.8, 1.0, 7.6],   // the stairs
  [2.8, 10.2, 0, 4.0],   // the front desk and all behind it (the cabinet, 佐藤's place)
  [10.0, 11.4, 0.3, 1.7],   // the 生け花
  [12.8, 17.8, 2.8, 4.6],   // the low table
  [12.0, 18.6, 5.2, 6.8],   // the sofas
  [10.8, 11.6, 5.7, 6.5], [19.0, 19.8, 5.7, 6.5],   // the paper lamps
  [18.6, 21.6, 9.4, 11.4],   // the tea table
  [0, 3.6, 9.6, 16]   // the 土間, a step down: in and out at its 上がり框 only (WAYS: RYOKAN.EDGE)
];
WALK_BLOCK.washitsu = [
  [11.0, 17.0, 4.8, 11.2],   // the 座卓 and its 座椅子
  [12.6, 15.4, 0, 1.4],   // the TV on its stand
  [19.0, 21.6, 12.4, 14.4],   // the yukata's tray
  [1.4, 3.8, 6.6, 12.6],   // the 広縁's chairs and table
  [5.2, 6.1, 0, 8.3]   // the shoji drawn back
];
// ---- the things to tap. The lobby: the tea (free), the sofas, the bell (佐藤 answers), the key board, the 予約台帳, the garden (its
// wind chime rung), the 生け花, the 大浴場's noren (decoration), the 下駄箱 and slippers. 桜の間: the 座椅子, the welcome まんじゅう (once a
// day: TOWN.GIFTS.kangei) or its wrapper, the 広縁's chairs (いい ながめ…), its window, the 床の間, the 押し入れ, the TV, the air
// conditioner, the shoji, the yukata ----
PLACE_USE.ryokan = (() => {
  const R = RYOKAN, [d0, d1, dv0, dv1] = R.DESK, [t0, t1, tv0, tv1] = R.TEA, [w0, w1, wh0, wh1] = R.WIN;
  return [
    { id: 'niwa', name: '庭', box: isoBBox(w0, w1, 0, 0.1, wh0, wh1), kind: 'do', go: isoXY(15.2, 2.0), face: 'back turn', pose: 'look', say: 'いい にわ…', fx: 'furin', fxc: 'ring', ms: 2400,
      toast: '庭：石燈籠、松樹、楓樹，還有「鹿威し（ししおどし）」——竹筒裝滿水就倒下，再彈回來敲到石頭「コーン」。窗邊掛著風鈴。' },
    { id: 'keys', name: '鑰匙板', box: isoBBox(R.KEYS[0], R.KEYS[1], 0, 0.3, R.KEYS[2], 6.9), kind: 'do', go: isoXY(6.4, 4.6), face: 'back turn', pose: 'look',
      pick: () => ['さくら、きく、まつ…', '鑰匙板：桜（さくら・櫻）、菊（きく・菊）、松（まつ・松）、梅（うめ・梅）、竹（たけ・竹）——房間都用花和樹命名。'] },
    { id: 'noren', name: '大浴場', box: isoBBox(R.BATH[0][0], R.BATH[1][1], 0, 0.3, 0, 5.2), kind: 'do', go: isoXY(20.2, 2.2), face: 'back turn', pose: 'look', say: 'おふろ…', fx: 'noren', fxc: 'part',
      toast: '大浴場：藍色暖簾「男」是男湯，紅色暖簾「女」是女湯。（只看到暖簾為止。）' },
    { id: 'ikebana', name: '生け花', box: isoBBox(R.IKEBANA[0], R.IKEBANA[1], R.IKEBANA[2], R.IKEBANA[3], 0, 3.6), kind: 'do', go: isoXY(10.7, 2.6), face: 'back turn', pose: 'look', say: 'きれい…' },
    { id: 'getabako', name: '下駄箱', box: isoBBox(R.GETA[0], R.GETA[1], R.GETA[2], R.GETA[3], -0.36, 2.9), kind: 'do', go: isoXY(4.4, 10.4), face: 'back turn flip', pose: 'look', say: 'スリッパ！',
      toast: '玄關：在土間脫鞋，鞋子放進下駄箱（鞋櫃），換上拖鞋再上去。' },
    { id: 'sofa', name: '沙發', box: isoBBox(R.SOFA[0], R.SOFA[1], R.SOFA[2], R.SOFA[3], 0, 1.5), kind: 'seat', say: 'ふかふか…',
      seats: [13.0, 14.2, 16.4, 17.6].map((u) => [u, 6.0, 0, 'bench back turn']) },
    { id: 'daicho', name: '予約台帳', box: isoBBox(R.LEDGER[0] - 0.3, R.LEDGER[1] + 0.3, R.LEDGER[2] - 0.3, R.LEDGER[3] + 0.3, 1.9, 2.6), kind: 'do', go: isoXY(8.1, 4.6), face: 'back turn', pose: 'look',
      pick: () => ['よやく…', '予約台帳：今天訂房客人的名單——名字、人數、房間、晚餐的時間。'] },
    { id: 'bell', name: '呼び鈴', box: isoBBox(R.BELL[0] - 0.5, R.BELL[0] + 0.5, R.BELL[1] - 0.5, R.BELL[1] + 0.5, 1.9, 2.9), kind: 'do', go: isoXY(4.6, 4.6), face: 'back turn', pose: 'reach', say: 'チーン！', fx: 'rkbell', fxc: 'ding', ms: 900, open: (y) => RYOKAN.bell(y) },
    { id: 'tea', name: 'お茶（ご自由に どうぞ）', box: isoBBox(t0, t1, tv0, tv1, 0, 2.8), kind: 'do', go: isoXY((t0 + t1) / 2, tv1 + 0.9), face: 'back turn', pose: 'reach', say: 'ずずっ…', then: 'ほっと します…',
      toast: '大廳的茶：「ご自由に どうぞ」＝請自由取用。免費的，喝多少都可以。' }];
})();
PLACE_USE.washitsu = (() => {
  const R = RYOKAN, [z0, z1, zv0, zv1] = R.ZATAKU, [p0, p1] = R.PLATE, [y0, y1, yv0, yv1] = R.YTRAY, [e0, e1, ev0, ev1] = R.ENGAWA_SET, [t0, t1, tk, oh] = R.TOKO;
  return [
    { id: 'mado', name: '窗戶', box: isoBBox(0, 0.1, 3, 12, 2.4, 6.4), kind: 'do', go: isoXY(1.0, 14.2), face: 'back turn flip', pose: 'look',
      pick: () => (TOWNEV.now() >= 6 && TOWNEV.now() < 18 ? ['いい ながめ…', '窗外是山和河，河上有一座紅色的橋。'] : ['ほしが きれい…', '']) },
    { id: 'toko', name: '床の間', box: isoBBox(t0, t1, -tk, 0, 0, oh), kind: 'do', go: isoXY((t0 + t1) / 2, 1.6), face: 'back turn', pose: 'look',
      pick: () => ['さくら…', '床の間：掛軸上畫著盛開的櫻花，花瓶裡插著櫻花枝——所以這間叫「桜の間」。'] },
    { id: 'oshiire', name: '押し入れ', box: isoBBox(R.OSHI[0], R.OSHI[1], 0, 0.1, 0, 5.2), kind: 'do', go: isoXY(17.4, 1.7), face: 'back turn', pose: 'reach', say: 'ふとん！', fx: 'oshiire', fxc: 'open', ms: 2200,
      toast: '押し入れ（壁櫥）：白天棉被收在這裡，晚上再鋪出來。' },
    { id: 'tv', name: '電視', box: isoBBox(R.TV[0], R.TV[1], R.TV[2], R.TV[3], 0, 2.7), kind: 'do', go: isoXY(14.0, 2.5), face: 'back turn', pose: 'look', say: 'てんきよほう…', fx: 'rktv', fxc: 'on', ms: 3000 },
    { id: 'ac', name: '冷氣', box: isoBBox(R.AC[0], R.AC[1], 0, 0.55, R.AC[2], R.AC[3]), kind: 'do', go: isoXY(16.4, 2.2), face: 'back turn', pose: 'reach', say: 'ピッ', fx: 'rkac', fxc: 'on', ms: 3000 },
    { id: 'shoji', name: '障子', box: isoBBox(R.SHOJI[0], R.SHOJI[1], R.SHOJI[2], R.SHOJI[3], 0, 6), kind: 'do', go: isoXY(6.9, 6.8), face: 'back turn flip', pose: 'reach', say: 'スーッ', fx: 'shoji', fxc: 'slide', ms: 1500 },
    { id: 'engawa', name: '廣緣的椅子', box: isoBBox(e0, e1, ev0, ev1, 0, 2.1), kind: 'seat', say: 'いい ながめ…', seats: R.ECHAIRS.map(([u, v, how]) => [u, v, 0.1, how]) },
    { id: 'zaisu', name: '座椅子', box: isoBBox(z0 - 0.4, z1 + 0.4, zv0 - 1.6, zv1 + 1.6, 0, 1.6), kind: 'seat', say: 'ほっ…', seats: R.ZAISU.map(([u, v, how]) => [u, v, 0.2, how]) },   // kneeling on its cushion
    { id: 'yukata', name: '浴衣', box: isoBBox(y0, y1, yv0, yv1, 0, 0.9), kind: 'do', go: isoXY((y0 + y1) / 2, yv1 + 0.9), face: 'back turn', pose: 'crouch', say: 'ゆかた！',
      toast: '浴衣：旅館準備的浴衣，可以穿著在館內和溫泉街走走。' },
    // the welcome まんじゅう on its plate while not had today (a gift: free, stamped, had before 桜の間), else its wrapper
    { id: 'manju', name: 'お茶菓子', box: isoBBox(p0 - 0.6, p0 + 0.6, p1 - 0.6, p1 + 0.6, 1.0, 2.2), kind: 'do', go: isoXY(p0, zv1 + 1.9), face: 'back turn', pose: 'reach', say: 'おまんじゅう！', when: () => !RYOKAN.had(), open: (y) => RYOKAN.welcome(y) },
    { id: 'wrapper', name: 'お茶菓子（包裝紙）', box: isoBBox(p0 - 0.6, p0 + 0.6, p1 - 0.6, p1 + 0.6, 1.0, 2.2), kind: 'do', go: isoXY(p0, zv1 + 1.9), face: 'back turn', pose: 'look', when: () => RYOKAN.had(),
      pick: () => ['また あした…', '今天的茶點饅頭已經吃過了，明天會再放一個新的。'] }];
})();
const washitsuArt = (st) => RYOKAN.art(st);
