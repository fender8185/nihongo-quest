'use strict';
// ---------- みなと寿司 and the 朝市 (2026-11-23; docs/superpowers/specs/2026-11-23-cruise-t3-t6-design.md §1.5, §1.6) ----------
// みなと寿司: a small sushi shop on みなと漁港 beside the 漁協 — its blue noren 「すし」, its wooden sign — walked into off the
// harbour (#/sushi) and seen at 45° as the 食堂 (ISO): the L of white wood counter with its stools, the glass case of the morning's
// fish on it, the wooden tags of the menu on the wall, two small tables in the corner, 源さん (TOWN.CAST.gen) behind the counter
// 10–14 and 17–21, his hands at work over it — two round chibi hands on their own, no arms (2026-11-14, the user: a stretched or
// bent arm on the chibi looked wrong). In the break and by night its door says when it opens, its noren taken in (準備中); found
// inside then, 源さん is away and its tags say when it opens — never an empty menu. Open all the same to the cruise's group on its
// way in for lunch (CRUISE.opens; t6).
// The 朝市: three stalls along the back of the quay every morning 6:00–10:00 — fish in polystyrene boxes on ice with hand-written
// prices, dried fish in rows and a hanging net, the grill's scallops smoking (焼きホタテ: MENU ichiba) — their keepers behind them
// (TOWN.YATAI), a few shoppers, more gulls; for a trip under way whose stops at the harbour are flagged market (t6), whatever the
// hour while its group is at the harbour, set up as the ship comes in (sync: on a save, in place).
const SUSHI = (() => {
  const f = (n) => n.toFixed(2), r1 = (n) => n.toFixed(1);
  // the room (floor units, ISO): the chef's work counter along the right wall; the L — its long leg along it, its short leg down the
  // floor's right edge — its stools before it (whoever sits there faces it); two small tables, their chairs on the far side (facing
  // us); the fridge at the right wall's end; the kitchen's door between
  const BACK = [1.8, 17.2, 0, 0.85], LONG = [3.2, 21.8, 2.9, 3.9], SHORT = [20.8, 21.8, 3.9, 9.6], TOP = 1.95;
  const CASES = [[3.8, 10.8], [13.0, 20.2]];   // the glass cases on the counter, a gap below 源さん (on the screen) for his hands
  const STOOLS = [4.4, 6.0, 7.6, 9.2, 10.8, 12.4, 14.0, 15.6, 17.2].map((u) => [u, 4.7, 'bench back turn']).concat([5.6, 7.1, 8.6].map((v) => [19.95, v, 'bench turn']));
  const TABLES = [[16.2, 18.2, 12.6, 14.0], [19.4, 21.4, 12.6, 14.0]];
  const FRIDGE = [20.0, 21.8, 0, 0.9], KITCHEN = [17.7, 19.7];
  // the wooden tags on the wall: what can be had (its price), and the morning's fish (時価: the day's price, ask)
  const TAGS = [['並にぎり', '1200'], ['てっかまき', '600'], ['たまご', '200'], ['あがり', '150'], ['まぐろ', '時価'], ['サーモン', '時価'], ['えび', '時価'], ['いか', '時価']];
  // 源さん: in his shop by his hours (TOWN.CAST.gen); the shop open then, or to the cruise's group on its way in (t6)
  const genHere = (h = TOWNEV.now()) => (TOWNEV.whereIs('gen', h, TOWNEV.today()) || {}).place === 'sushi';
  const open = () => genHere() || CRUISE.opens('sushi');
  // when it opens next, from 源さん's hours: today at the next one, else tomorrow at the first
  function shutSay(h = TOWNEV.now()) {
    const hours = ((TOWN.CAST.gen || {}).hours || []).filter((x) => x[2] === 'sushi').map((x) => [x[0], x[1]]), all = hours.map(([a, b]) => `${a}:00–${b}:00`).join('、');
    const next = hours.find(([a]) => a > h), first = hours[0] || [10];
    return next ? `みなと寿司 準備中，${next[0]}:00 開店（營業時間 ${all}）。` : `みなと寿司 今天的營業結束了，明天 ${first[0]}:00 開店（營業時間 ${all}）。`;
  }
  const spot = () => { const s = (TOWN.SPOTS.sushi || {}).counter || { u: 10.6, v: 1.75 }; return [s.u, s.v]; };

  // ---- the room ----
  // 源さん's hands over the counter before him, a nigiri being made between them: the left cupped under it, the right pressing it
  // down (CSS: su-hands) — round mittens in his skin's colour, nothing joining them to him; on the counter's top straight below him
  // on the screen (as far along u as along v from where he stands), clear of his face (the chibi's head fills all above the counter)
  function hands(u, v) {
    const [x, y] = isoPt(u + 1.3, v + 1.25, TOP + 0.1), skin = ((TOWN.CAST.gen || {}).look || {}).skin || '#e8bd98', sh = mixHex(skin, '#5a3a28', 0.28);
    const mitt = (cx, cy, r) => `<circle cx="${r1(cx)}" cy="${r1(cy)}" r="${r}" fill="${skin}" stroke="${mixHex(skin, '#5a3a28', 0.45)}" stroke-width=".8"/><path d="M${r1(cx - r * 0.7)} ${r1(cy + r * 0.45)} A${r} ${r} 0 0 0 ${r1(cx + r * 0.85)} ${r1(cy + r * 0.2)}" fill="none" stroke="${sh}" stroke-width="1.3" stroke-linecap="round"/><circle cx="${r1(cx - r * 0.35)}" cy="${r1(cy - r * 0.4)}" r="${r1(r * 0.3)}" fill="#fff" fill-opacity=".35"/>`;
    return `<g class="su-hands" aria-hidden="true"><g class="su-hand su-l">${mitt(x - 5, y + 4, 6.2)}</g><g class="su-neta"><ellipse cx="${r1(x)}" cy="${r1(y + 0.4)}" rx="7" ry="3.8" fill="#fbf7ef"/><path d="M${r1(x - 7.4)} ${r1(y - 0.8)} q7.4 -5.4 14.8 -.6 q-7.4 2.4 -14.8 .6 Z" fill="#d23e36"/><path d="M${r1(x - 3.2)} ${r1(y - 2.6)} l1.8 2 M${r1(x + 1.4)} ${r1(y - 3)} l1.8 2" stroke="#e8776a" stroke-width=".9" stroke-linecap="round"/></g>
      <g class="su-hand su-r">${mitt(x + 6, y - 7.4, 5.8)}</g></g>`;
  }
  // the glass case of the morning's fish on the counter (u0–u1): its steel base and frame, the fish laid on ice inside (salmon's
  // stripes, tuna's red, prawns, squid, roe), the glass over them catching the light
  function neta(u0, u1) {
    const v0 = LONG[2] + 0.05, v1 = v0 + 0.5, h0 = TOP, h1 = TOP + 0.62, fish = [['#f08a5a', 'salmon'], ['#d23e36', 'tuna'], ['#f26a4e', 'ebi'], ['#f4efe4', 'ika'], ['#f08a3a', 'ikura'], ['#c9302a', 'tuna']];
    let lay = '', n = Math.floor((u1 - u0 - 0.3) / 0.95);
    for (let i = 0; i < n; i++) {
      const [c, k] = fish[i % fish.length], a = u0 + 0.25 + i * 0.95;
      lay += k === 'ikura' ? [0.15, 0.35, 0.55, 0.25, 0.45].map((d, j) => `<circle cx="${f(a + d)}" cy="${f(v0 + 0.18 + (j % 2) * 0.12)}" r=".07" fill="${c}"/>`).join('')
        : `<rect x="${f(a)}" y="${f(v0 + 0.1)}" width=".75" height=".3" rx=".06" fill="${c}"/>${k === 'salmon' ? `<path d="M${f(a + 0.12)} ${f(v0 + 0.12)} l.12 .26 M${f(a + 0.34)} ${f(v0 + 0.12)} l.12 .26 M${f(a + 0.56)} ${f(v0 + 0.12)} l.12 .26" stroke="#fde2cf" stroke-width=".04"/>` : k === 'ebi' ? `<path d="M${f(a + 0.1)} ${f(v0 + 0.25)} h.55" stroke="#fbf3ea" stroke-width=".06"/>` : ''}`;
    }
    return iBox('#b9bec6', u0, v0, h0, u1, v1, h0 + 0.1, { top: '#dfe3e8' }) + iOnF(h0 + 0.1, `<rect x="${f(u0 + 0.05)}" y="${f(v0 + 0.05)}" width="${f(u1 - u0 - 0.1)}" height=".4" fill="#eaf4f6"/>${lay}`)
      + iPoly([[u0, v1, h0 + 0.1], [u1, v1, h0 + 0.1], [u1, v1, h1], [u0, v1, h1]], '#d8eef4', ' fill-opacity=".28"') + iPoly([[u1, v0, h0 + 0.1], [u1, v1, h0 + 0.1], [u1, v1, h1], [u1, v0, h1]], '#c4dee6', ' fill-opacity=".35"')
      + iPoly([[u0, v0, h1], [u1, v0, h1], [u1, v1, h1], [u0, v1, h1]], '#e6f4f8', ' fill-opacity=".4"')
      + `<path d="M${iPt(u0, v1, h1)} L${iPt(u1, v1, h1)} L${iPt(u1, v0, h1)} M${iPt(u1, v1, h0 + 0.1)} V${isoPt(u1, v1, h1)[1].toFixed(1)}" stroke="#9aa0a8" stroke-width="1" fill="none"/>`
      + `<path d="M${iPt(u0 + 0.3, v1, h1 - 0.12)} L${iPt(u0 + 1.4, v1, h0 + 0.2)}" stroke="#fff" stroke-opacity=".5" stroke-width="1.4" stroke-linecap="round"/>`;
  }
  // a customer's place on the counter: a teacup, a soy dish, chopsticks on their rest
  const place = (u) => { const v = LONG[3] - 0.32, [x, y] = isoPt(u, v, TOP + 0.05);
    return iCyl(u - 0.2, v, 0.13, TOP + 0.05, TOP + 0.4, '#e9e0cc', '#cfe0a0') + `<ellipse cx="${r1(x + 9)}" cy="${r1(y + 1)}" rx="4.4" ry="1.8" fill="#f6f4ee"/><ellipse cx="${r1(x + 9)}" cy="${r1(y + 1)}" rx="3" ry="1.1" fill="#5a2e1e"/><path d="M${r1(x - 4)} ${r1(y + 6)} l12 -4.4 M${r1(x - 3)} ${r1(y + 7)} l12 -4.4" stroke="#c9a06a" stroke-width="1.2" stroke-linecap="round"/>`; };
  // a pendant lamp over the counter: its cord, its shade, its warm light on the counter
  const lamp = (u, v) => { const [x, y] = isoPt(u, v, 6.4);
    return `<path d="M${r1(x)} ${r1(y - 90)} V${r1(y - 9)}" stroke="#2b2b33" stroke-width="1.2"/><path d="M${r1(x - 13)} ${r1(y)} Q${r1(x)} ${r1(y - 17)} ${r1(x + 13)} ${r1(y)} Z" fill="#2f3a4a"/><path d="M${r1(x - 9)} ${r1(y - 4)} q4 -6 9 -7" stroke="#fff" stroke-opacity=".25" stroke-width="1.2" fill="none"/><ellipse cx="${r1(x)}" cy="${r1(y)}" rx="13" ry="3.6" fill="#fff2c8"/><circle cx="${r1(x)}" cy="${r1(y + 10)}" r="46" fill="url(#glw)" opacity=".45"/>`; };
  function sushiHtml() {
    isoProps = [];
    const [cu, cv] = spot(), on = open();
    // the wall behind the counter: the tags hung from a rail, each a board standing off the wall, its name down it, its price at its foot
    const tags = wallR('#6e5236', 2.2, 2.2 + TAGS.length * 1.62, 6.5, 6.66, 0.16) + TAGS.map(([n, p], i) => { const u = 2.5 + i * 1.62, fs = [...n].length > 4 ? 0.34 : 0.4;
      return wallR('#d9bd8a', u, u + 0.96, 3.95, 6.45, 0.07, { top: '#e8d2a4', fv: '#e9d3a6', fu: '#bfa070' }) + iOnV(0.07, `<rect x="${f(u + 0.06)}" y="-6.38" width=".84" height="2.36" fill="none" stroke="#b08a56" stroke-width=".03"/>${vText(f(u + 0.48), -6.3, n, fs, `font-weight="700" fill="#2b1c12" ${SERIF}`)}<text x="${f(u + 0.48)}" y="-4.12" text-anchor="middle" font-size="${p === '時価' ? 0.26 : 0.22}" font-weight="700" fill="#a8241c" ${SERIF}>${p === '時価' ? p : p + '円'}</text>`); }).join('');
    // the kitchen's door at the back: dark inside, a short white noren with an indigo fish on it
    const kitchen = iOnV(0, `<rect x="${KITCHEN[0]}" y="-4.1" width="${f(KITCHEN[1] - KITCHEN[0])}" height="4.1" fill="#2a221c"/>`) + frameR(KITCHEN[0], KITCHEN[1], 4.1, '#4a3424')
      + iOnV(0.3, [0, 1].map((k) => { const x = KITCHEN[0] + 0.06 + k * 1.0; return `<g class="fx-sway" style="animation-duration:3.6s;animation-delay:-${k * 0.7}s"><path d="M${f(x)} -4.02 h.96 v1.3 h-.96 Z" fill="#f3efe6"/><path d="M${f(x + 0.2)} -3.4 q.28 -.2 .56 0 q-.28 .2 -.56 0 Z M${f(x + 0.76)} -3.4 l.14 -.12 v.24 Z" fill="#2f4a7a"/></g>`; }).join(''));
    // the left wall: a 魚拓 (a fish printed in ink) in its frame, a latticed window, the door with the noren seen from inside
    const gyotaku = wallL('#3a2c22', 1.6, 5.4, 3.5, 6.3, 0.08) + iOnL(`<rect x="-5.28" y="-6.18" width="3.56" height="2.56" fill="#f6f1e4"/><path d="M-4.9 -4.9 C-4.5 -5.5 -3.5 -5.7 -2.7 -5.2 L-2.2 -5.6 L-2.15 -4.3 L-2.7 -4.6 C-3.5 -4.1 -4.5 -4.3 -4.9 -4.9 Z" fill="#2b2b33"/><path d="M-3.8 -5.5 l.25 -.3 l.3 .3 M-3.5 -4.3 l.2 .25" stroke="#2b2b33" stroke-width=".05"/><circle cx="-4.6" cy="-4.95" r=".06" fill="#f6f1e4"/>${vText('-1.98', -6.08, '鯛', 0.26, `fill="#2b2b33" ${SERIF}`)}<rect x="-2.12" y="-3.98" width=".22" height=".22" fill="#c8322a"/>`, 0.08);
    const win = iOnL(`<rect x="-10.4" y="-5.6" width="3.4" height="2.8" fill="#dfe8e6"/><path d="${[0.42, 0.84, 1.26, 1.68, 2.1, 2.52, 2.94].map((d) => `M${f(-10.4 + d)} -5.6 v2.8`).join(' ')}" stroke="#6e5236" stroke-width=".06"/><rect x="-10.4" y="-5.6" width="3.4" height="2.8" fill="none" stroke="#4a3424" stroke-width=".14"/><path d="M-10.3 -5.5 l.8 1.2" stroke="#fff" stroke-opacity=".5" stroke-width=".08"/>`, 0.02);
    const clock = (() => { const [x, y] = isoPt(0.06, 10.8, 6.1); return `<g transform="translate(${r1(x)} ${r1(y)}) matrix(1 -.5 0 1 0 0)"><circle r="11" fill="#4a3424"/><circle r="9" fill="#fbf8f0"/><path d="M0 0 V-5.4" stroke="#2b2b33" stroke-width="1.6" stroke-linecap="round" style="transform-box:fill-box;transform-origin:50% 100%;transform:rotate(var(--hh, 0deg))"/><path d="M0 0 V-7.4" stroke="#2b2b33" stroke-width="1" stroke-linecap="round" style="transform-box:fill-box;transform-origin:50% 100%;transform:rotate(var(--mm, 0deg))"/><circle r="1.2" fill="#2b2b33"/></g>`; })();
    const door = iOnL('<rect x="-14.8" y="-4.62" width="2.8" height="4.62" fill="#2a2a3a"/><rect x="-14.66" y="-4.5" width="1.28" height="4.38" fill="#cfdce0" opacity=".8"/><rect x="-13.3" y="-4.5" width="1.28" height="4.38" fill="#cfdce0" opacity=".8"/><path d="M-14.66 -2.3 h2.64 M-14.02 -4.5 v4.38 M-12.66 -4.5 v4.38" stroke="#4a3424" stroke-width=".06"/>', 0.03) + frameL(12, 14.8, 4.62, '#4a3424')
      + iOnL([0, 1].map((k) => `<g class="fx-sway" style="animation-duration:3.4s;animation-delay:-${k * 0.8}s"><path d="M${f(-14.72 + k * 1.36)} -4.5 h1.3 v1.5 h-1.3 Z" fill="#26407a"/></g>`).join(''), 0.36);
    const land = `<svg class="land indoor-land iso" viewBox="0 -530 1200 900" preserveAspectRatio="xMidYMax slice" style="height:900px">${GLOW_DEFS}${ISO_DEFS}
      ${isoShell({ floor: '#9c968b', seam: '#857f74', wallL: '#efe7d4', wallR: '#f4ecda', wainL: '#7a5a3c', wainR: '#836244', batten: '#5e4430', trim: '#4a3424', edgeU: '#6e665a', edgeV: '#7a7266', capU: '#e6dcc6', capV: '#ece2cc', top: '#ddd2bc' })}
      ${iOnF(0, `<rect x="${BACK[0]}" y="0" width="${f(ISO.RW - BACK[0])}" height="${LONG[3]}" fill="#7a6a58"/><path d="${Array.from({ length: Math.floor((ISO.RW - BACK[0]) / 0.5) }, (_, i) => `M${f(BACK[0] + 0.25 + i * 0.5)} 0 V${LONG[3]}`).join(' ')}" stroke="#5e5042" stroke-width=".06"/>`)}
      ${kitchen}${tags}${gyotaku}${win}${clock}${door}${[6.4, 11.6, 16.8].map((u) => lamp(u, 3.4)).join('')}
    </svg>`;
    // the counters and what is on them, the fridge, the stools, the tables with their chairs
    const [b0, b1, , bv1] = BACK, [l0, l1, lv0, lv1] = LONG, [s0, s1, sv0, sv1] = SHORT;
    const back = iBox('#b98a5a', b0, 0, 0, b1, bv1, 1.75, { top: '#e6d2a8', fv: '#a87a4c', fu: '#8e6640' })
      + iOnV(bv1, Array.from({ length: Math.floor((b1 - b0) / 1.6) }, (_, i) => `<rect x="${f(b0 + 0.2 + i * 1.6)}" y="-1.5" width="1.3" height=".55" fill="none" stroke="#7a5432" stroke-width=".04"/><rect x="${f(b0 + 0.75 + i * 1.6)}" y="-1.3" width=".2" height=".06" fill="#e8d2a8"/>`).join(''))
      + iCyl(3.0, 0.42, 0.14, 1.75, 2.85, '#2f5a3a', '#3f6a48') + iCyl(3.0, 0.42, 0.06, 2.85, 3.15, '#2f5a3a', '#3f6a48') + iCyl(3.45, 0.42, 0.14, 1.75, 2.75, '#e9e2d0', '#f6f0e2') + iCyl(3.45, 0.42, 0.06, 2.75, 3.05, '#6b3a2a', '#7a4a3a')
      + iCyl(5.4, 0.42, 0.45, 1.75, 1.98, '#c98a4a', '#e8c088') + iCylSh(5.4, 0.42, 0.45, 1.75, 1.98, 0.14) + (() => { const [x, y] = isoPt(5.4, 0.42, 1.98), rx = 0.45 * ISO.U * Math.SQRT2; return `<ellipse cx="${r1(x)}" cy="${r1(y)}" rx="${r1(rx * 0.86)}" ry="${r1(rx * 0.43)}" fill="#fbf7ef"/><path d="M${r1(x - rx)} ${r1(y + 3)} A${r1(rx)} ${r1(rx / 2)} 0 0 0 ${r1(x + rx)} ${r1(y + 3)}" fill="none" stroke="#a8743f" stroke-width="1.2"/>`; })()
      + [0, 1, 2].map((k) => iBox('#c9a06a', 7.0, 0.15, 1.75 + k * 0.16, 8.4, 0.7, 1.87 + k * 0.16, { top: '#ddb87e' })).join('')
      + iBox('#3a3a44', 10.2, 0.1, 1.75, 12.4, 0.75, 1.82, { top: '#e9e4d8' }) + iCyl(15.4, 0.45, 0.3, 1.75, 2.75, '#c9ccd2', '#e2e5ea') + iCylSh(15.4, 0.45, 0.3, 1.75, 2.75, 0.16) + iBox('#9aa0a8', 15.62, 0.4, 2.0, 15.85, 0.5, 2.12)
      + iSteam(5.4, 0.42, 1.98, 1.2, 5);
    const fridge = iBox('#c9ccd2', FRIDGE[0], FRIDGE[2], 0, FRIDGE[1], FRIDGE[3], 3.4, { top: '#dfe2e6', fv: '#c4c8ce', fu: '#a9aeb6' })
      + iOnV(FRIDGE[3], `<path d="M${FRIDGE[0] + 0.9} -3.3 V-.1 M${FRIDGE[0]} -1.9 H${FRIDGE[1]}" stroke="#9aa0a8" stroke-width=".04"/><rect x="${FRIDGE[0] + 0.7}" y="-3" width=".1" height=".8" fill="#7a808a"/><rect x="${FRIDGE[0] + 1.0}" y="-1.6" width=".1" height=".8" fill="#7a808a"/>`);
    const white = { top: '#f6ead0', fv: '#ead6ae', fu: '#d6bf92' };   // 白木: the counter's plank, its edge and end in the light
    const counter = iBox('#d9b98a', l0, lv0, 0, l1, lv1, TOP - 0.15, { top: '#e8cfa0', fv: '#cfae7c', fu: '#b8955f' })
      + iOnV(lv1, `<rect x="${l0}" y="-.18" width="${f(l1 - l0)}" height=".18" fill="#2b1c12" fill-opacity=".25"/>${Array.from({ length: Math.floor((l1 - l0) / 1.55) }, (_, i) => `<path d="M${f(l0 + 0.78 + i * 1.55)} -.2 V${f(-TOP + 0.2)}" stroke="#b8955f" stroke-width=".04"/>`).join('')}`)
      + iBox('#f2e2bf', l0 - 0.1, lv0 - 0.05, TOP - 0.15, l1, lv1 + 0.12, TOP, white) + iOnF(TOP, `<path d="M${l0} ${f(lv1 - 0.04)} H${l1}" stroke="#fff" stroke-opacity=".6" stroke-width=".05"/><path d="${[0.2, 0.55, 0.85].map((d) => `M${l0} ${f(lv0 + d)} C${f(l0 + 5)} ${f(lv0 + d + 0.06)} ${f(l1 - 5)} ${f(lv0 + d - 0.06)} ${l1} ${f(lv0 + d)}`).join(' ')}" fill="none" stroke="#e2c99a" stroke-width=".03"/>`)
      + [6.4, 11.6, 16.8].map((u) => { const [x, y] = isoPt(u, 3.4, TOP); return `<ellipse cx="${r1(x)}" cy="${r1(y)}" rx="40" ry="12" fill="#fff3c8" opacity=".3"/>`; }).join('')
      + CASES.map(([a, b]) => neta(a, b)).join('') + [4.4, 7.6, 15.6, 18.8].map(place).join('') + (on ? hands(cu, cv) : '');
    const short = iBox('#d9b98a', s0, sv0, 0, s1, sv1, TOP - 0.15, { top: '#e8cfa0', fv: '#cfae7c', fu: '#b8955f' }) + iOnV(sv1, `<rect x="${s0}" y="-.18" width="${f(s1 - s0)}" height=".18" fill="#2b1c12" fill-opacity=".25"/>`)
      + iBox('#f2e2bf', s0 - 0.12, sv0, TOP - 0.15, s1, sv1 + 0.1, TOP, white) + iCyl(21.3, 8.9, 0.16, TOP, TOP + 0.62, '#3f5f9e', '#5a7ab8') + (() => { const [x, y] = isoPt(21.3, 8.9, TOP + 0.62); return `<path d="M${r1(x)} ${r1(y)} q-3 -14 -10 -22 M${r1(x)} ${r1(y)} q4 -12 12 -18" stroke="#6e5236" stroke-width="1.2" fill="none"/><circle cx="${r1(x - 9)}" cy="${r1(y - 20)}" r="2.4" fill="#f2b8c6"/><circle cx="${r1(x + 11)}" cy="${r1(y - 16)}" r="2.2" fill="#f2b8c6"/><circle cx="${r1(x + 4)}" cy="${r1(y - 9)}" r="2" fill="#f7d2da"/>`; })()
      + [6.0, 7.5].map((v) => { const [x, y] = isoPt(21.25, v, TOP); return `<ellipse cx="${r1(x)}" cy="${r1(y)}" rx="4.4" ry="1.8" fill="#f6f4ee"/><ellipse cx="${r1(x)}" cy="${r1(y)}" rx="3" ry="1.1" fill="#5a2e1e"/>`; }).join('');
    const stool = { foot: '#2b2b33', footTop: '#3a3a44', post: '#3a3a44', side: '#2f3f63', top: '#3f527a' };
    const table = ([u0, u1, v0, v1]) => [[u0 + 0.15, v0 + 0.15], [u1 - 0.27, v0 + 0.15], [u0 + 0.15, v1 - 0.27], [u1 - 0.27, v1 - 0.27]].map(([u, v]) => iBox('#4a3424', u, v, 0, u + 0.12, v + 0.12, 1.36)).join('')
      + iBox('#6e4a30', u0, v0, 1.36, u1, v1, 1.5, { top: '#8a5e3c' }) + iOnF(1.5, `<path d="M${u0} ${f(v1 - 0.03)} H${f(u1 - 0.03)} V${v0}" fill="none" stroke="#a8784e" stroke-width=".04"/>`)
      + iCyl(u0 + 0.5, v0 + 0.6, 0.12, 1.5, 1.85, '#e9e0cc', '#cfe0a0') + iCyl(u1 - 0.6, v0 + 0.5, 0.1, 1.5, 1.95, '#4a2a1c', '#c84a3a');
    const props = isoProp([b0, b1, 0, bv1], back, 3.2) + isoProp([FRIDGE[0], FRIDGE[1], FRIDGE[2], FRIDGE[3]], fridge, 3.4)
      + isoProp([l0 - 0.1, l1, lv0 - 0.05, lv1 + 0.12], counter, 2.6) + isoProp([s0 - 0.12, s1, sv0, sv1 + 0.1], short, 2.6)
      + STOOLS.map(([u, v]) => isoProp([u - 0.42, u + 0.42, v - 0.42, v + 0.42], iStool(u, v, stool), 1.05)).join('')
      + TABLES.map((t) => isoProp(t, table(t), 1.9)).join('')
      + TABLES.flatMap(([u0, u1, v0]) => [u0 + 0.5, u1 - 0.5].map((u) => isoProp([u - 0.45, u + 0.45, v0 - 1.2, v0 - 0.3], iChair(u, v0 - 0.75, true, '#7a5232'), 2.1))).join('');
    return `${land}${isoLay(props)}${indoorRest('sushi', 'harbor')}`;
  }

  // ---- the shop's front on the harbour (harborHtml's land, F its quay's edge): its wall, its roof of tiles, its sign, a latticed
  // window, the sliding door; the noren 「すし」 out while open, else a 準備中 plate on the door; lit by night while open ----
  const X0 = 664, X1 = 796;
  const DOOR = [736, 792];
  function front(F) {
    const T = F - 78, on = open(), glass = on ? hc('#cfdce0', '#ffd98a') : hc('#cfdce0', '#2c2e52');
    const boards = Array.from({ length: Math.floor((X1 - X0) / 6) }, (_, i) => `M${X0 + 3 + i * 6} ${F - 29} V${F - 4}`).join(' ');
    const tiles = [8, 15, 22].map((d) => `M${X0 - 12 + d * 0.62} ${T - d + 2} H${X1 + 14 - d * 0.5}`).join(' ') + ' ' + Array.from({ length: 22 }, (_, i) => { const x = X0 - 6 + i * 7; return `M${x} ${T + 1} l3 -6`; }).join(' ');
    const sign = `<path d="M${X0 + 22} ${T + 2} h${X1 - X0 - 40} l3 -3 h${-(X1 - X0 - 40)} Z" ${hc('#c9a070', '#3a3048')}/><rect x="${X0 + 22}" y="${T + 2}" width="${X1 - X0 - 40}" height="14" rx="1" ${hc('#e8cf9a', '#5a4a52')}/><rect x="${X0 + 22}" y="${T + 14}" width="${X1 - X0 - 40}" height="2.4" fill="#2b1c12" fill-opacity=".22"/><rect x="${X0 + 24}" y="${T + 4}" width="${X1 - X0 - 44}" height="10" rx="1" fill="none" ${hs('#a8743f', '#3a3048')} stroke-width=".8"/>
      <text x="${(X0 + X1) / 2 - 2}" y="${T + 12.6}" text-anchor="middle" font-size="10" font-weight="800" ${hc('#3b2a1c', '#e8d8b0')} ${SERIF}>みなと寿司</text>`;
    const win = `<rect x="${X0 + 6}" y="${F - 56}" width="46" height="25" ${hc('#4a3424', '#1e1a30')}/><rect x="${X0 + 9}" y="${F - 53}" width="40" height="19" ${glass}/><rect x="${X0 + 9}" y="${F - 53}" width="40" height="3" fill="#2b1c12" fill-opacity=".18"/><path d="${Array.from({ length: 7 }, (_, i) => `M${X0 + 13.6 + i * 5.2} ${F - 53} V${F - 34}`).join(' ')}" ${hs('#6e5236', '#2a2440')} stroke-width="1.6"/><path d="M${X0 + 9} ${F - 43.5} H${X0 + 49}" ${hs('#6e5236', '#2a2440')} stroke-width="1.2"/><rect x="${X0 + 4}" y="${F - 32}" width="50" height="3" ${hc('#6e5236', '#2a2440')}/>`;
    const [d0, d1] = DOOR, dm = (d0 + d1) / 2;
    const door = `<rect x="${d0}" y="${F - 60}" width="${d1 - d0}" height="60" ${hc('#4a3424', '#1e1a30')}/><rect x="${d0 + 3}" y="${F - 57}" width="${(d1 - d0) / 2 - 3}" height="54" ${hc('#8a6a48', '#2a2440')}/><rect x="${dm}" y="${F - 57}" width="${(d1 - d0) / 2 - 3}" height="54" ${hc('#8a6a48', '#2a2440')}/>
      ${[[d0 + 5, F - 54], [dm + 2, F - 54], [d0 + 5, F - 30], [dm + 2, F - 30]].map(([x, y]) => `<rect x="${x}" y="${y}" width="${(d1 - d0) / 2 - 7}" height="21" ${glass}/>`).join('')}<rect x="${d0 + 3}" y="${F - 57}" width="${d1 - d0 - 6}" height="3" fill="#2b1c12" fill-opacity=".25"/><rect x="${d0 + 3}" y="${F - 57}" width="2.4" height="54" fill="#2b1c12" fill-opacity=".18"/>
      <path d="M${d0 + 8} ${F - 52} l6 9 M${dm + 5} ${F - 52} l5 7" stroke="#fff" stroke-opacity=".4" stroke-width="1.6" stroke-linecap="round"/><rect x="${dm - 3.4}" y="${F - 32}" width="1.4" height="7" rx=".6" ${hc('#c9a050', '#5a4a3a')}/>`;
    // the noren: two indigo panels on a rod, す and し in white, their shadow on the glass behind; 準備中 instead when shut
    const noren = on ? `<g class="su-noren"><rect x="${d0 + 1}" y="${F - 34}" width="${d1 - d0 - 2}" height="5" fill="#2b1c12" fill-opacity=".14"/><path d="M${d0 - 3} ${F - 60} H${d1 + 3}" ${hs('#6e5236', '#2a2440')} stroke-width="2.4"/>
      ${[[d0, 'す'], [dm + 1, 'し']].map(([x, ch], k) => `<g class="fx-sway" style="animation-duration:3.8s;animation-delay:-${k * 0.9}s"><path d="M${x} ${F - 59} h${(d1 - d0) / 2 - 1} v26 h${-((d1 - d0) / 2 - 1)} Z" ${hc('#26407a', '#1c2a5a')}/><path d="M${x} ${F - 59} h${(d1 - d0) / 2 - 1} v3 h${-((d1 - d0) / 2 - 1)} Z" fill="#fff" fill-opacity=".12"/><text x="${x + (d1 - d0) / 4 - 0.5}" y="${F - 41}" text-anchor="middle" font-size="13" font-weight="800" fill="#f6f3ec" ${SERIF}>${ch}</text></g>`).join('')}</g>`
      : `<g class="su-junbi"><path d="M${dm + 1} ${F - 56} l-5 6 M${dm + 1} ${F - 56} l5 6" ${hs('#4a3424', '#1e1a30')} stroke-width=".8"/><rect x="${dm - 6}" y="${F - 50}" width="14" height="24" rx="1.2" ${hc('#e8cf9a', '#6a5a52')}/>${vText(dm + 1, F - 48.4, '準備中', 6.2, `font-weight="800" ${hc('#3b2a1c', '#2b2230')} ${SERIF}`)}</g>`;
    // a white paper lantern on a bracket by the door (寿 on it), lit while open; the stone step; a pine in a pot at the corner
    const lx = X0 + 62, lantern = `<path d="M${lx} ${F - 63} v3" fill="none" ${hs('#3a2c22', '#1c1830')} stroke-width="1.4"/><g class="fx-sway" style="animation-duration:4s"><rect x="${lx - 3.6}" y="${F - 60}" width="7.2" height="2.4" fill="#2b2b33"/><ellipse cx="${lx}" cy="${F - 49.6}" rx="7" ry="9.4" ${on ? hc('#f6efe2', '#ffe9b0') : hc('#f6efe2', '#5a5a72')}/><path d="M${lx - 6.6} ${F - 53} q6.6 2 13.2 0 M${lx - 7} ${F - 49.6} q7 2 14 0 M${lx - 6.6} ${F - 46} q6.6 2 13.2 0" fill="none" stroke="#c9b48a" stroke-width=".6"/><text x="${lx}" y="${F - 46.6}" text-anchor="middle" font-size="8" font-weight="800" fill="#a8241c" ${SERIF}>寿</text><rect x="${lx - 3.6}" y="${F - 41}" width="7.2" height="2.4" fill="#2b2b33"/></g>${on ? `<circle class="glow" cx="${lx}" cy="${F - 49.6}" r="26" fill="url(#glw)"/>` : ''}`;
    const step = `<path d="M${d0 - 4} ${F} h${d1 - d0 + 8} l-2 4 h${-(d1 - d0 + 4)} Z" ${hc('#c9c2b4', '#2e2e4e')}/><path d="M${d0 - 2} ${F + 4} h${d1 - d0 + 4} v3 h${-(d1 - d0 + 4)} Z" ${hc('#9a958a', '#1c1d3e')}/>`;
    const pine = `<path d="M${X0 - 4} ${F + 6} h16 l-2 -14 h-12 Z" ${hc('#8a5a36', '#2a2034')}/><path d="M${X0 - 5} ${F - 8} h18" ${hs('#6e4628', '#1e1828')} stroke-width="2"/><path d="M${X0 + 4} ${F - 8} q-3 -10 2 -18" fill="none" ${hs('#5a4030', '#1e1828')} stroke-width="2.2"/>${[[X0 - 2, F - 20, 7], [X0 + 10, F - 26, 6], [X0 + 4, F - 31, 5]].map(([x, y, r]) => `<ellipse cx="${x}" cy="${y}" rx="${r}" ry="${r * 0.55}" ${hc('#3f6a48', '#18283a')}/>`).join('')}`;
    return `<g class="su-front" data-open="${on ? 1 : ''}">
      <path d="M${X1} ${F} L${X1 + 9} ${F - 5} V${T - 6} L${X1} ${T} Z" ${hc('#d6ccb8', '#262848')}/><path d="M${X1} ${F} L${X1 + 9} ${F - 5} V${F - 33} L${X1} ${F - 30} Z" ${hc('#5e4530', '#1e1a34')}/>
      <rect x="${X0}" y="${T}" width="${X1 - X0}" height="${F - T}" ${hc('#f3ede0', '#3a3c62')}/><rect x="${X0}" y="${F - 30}" width="${X1 - X0}" height="30" ${hc('#7a5a3c', '#2a2440')}/><path d="${boards}" ${hs('#5e4430', '#1e1a30')} stroke-width=".8"/><rect x="${X0}" y="${F - 31}" width="${X1 - X0}" height="2" ${hc('#5e4430', '#1e1a30')}/>
      <rect x="${X0 - 2}" y="${F - 4}" width="${X1 - X0 + 4}" height="4" ${hc('#a39d92', '#1c1d3e')}/><rect x="${X0}" y="${T}" width="${X1 - X0}" height="12" fill="#2b1c12" fill-opacity=".14"/>
      <path d="M${X0 - 12} ${T + 2} L${X0 + 4} ${T - 26} H${X1 + 4} L${X1 + 18} ${T - 5} L${X1 + 14} ${T + 2} Z" ${hc('#4a5468', '#181a36')}/><path d="${tiles}" ${hs('#3a4254', '#101128')} stroke-width="1"/><path d="M${X1 + 4} ${T - 26} L${X1 + 18} ${T - 5}" ${hs('#5e6a80', '#1e2244')} stroke-width="1.6"/>
      <rect x="${X0 + 2}" y="${T - 30}" width="${X1 - X0 + 4}" height="5" rx="2" ${hc('#3a4254', '#141530')}/><circle cx="${X0 + 3}" cy="${T - 28}" r="3.6" ${hc('#3a4254', '#141530')}/><circle cx="${X1 + 5}" cy="${T - 28}" r="3.6" ${hc('#3a4254', '#141530')}/>
      <path d="M${X0 - 12} ${T + 2} H${X1 + 14}" ${hs('#2e3444', '#101128')} stroke-width="3.6"/>${Array.from({ length: 21 }, (_, i) => `<circle cx="${X0 - 9 + i * 7.1}" cy="${T + 3}" r="1.6" ${hc('#3a4254', '#141530')}/>`).join('')}
      ${sign}${win}<g class="su-door">${door}${step}${noren}</g>${lantern}${pine}
      ${on ? `${lightPool(dm, F + 12, 64)}${lightPool(X0 + 34, F + 8, 40)}` : ''}</g>`;
  }
  return { BACK, LONG, SHORT, TOP, STOOLS, TABLES, CASES, FRIDGE, TAGS, X0, X1, DOOR, genHere, open, shutSay, spot, html: sushiHtml, front };
})();
const sushiHtml = () => SUSHI.html();

// ---- the 朝市 ----
const ICHIBA = (() => {
  // [id: its thing in the harbour (PLACE_USE), x of its left edge, its sign, its canopy's colour, who keeps it (TOWN.YATAI)]; 80 wide
  const STALLS = [['sakana', 364, 'さかな', '#3f7ac8', 'sakanaya'], ['himono', 452, 'ひもの', '#c98a2e', 'himonoya'], ['yaki', 540, 'はま焼き', '#d0453c', 'hamayaki']], W = 80;
  // open: 6:00 to 10:00 (10:00 sharp: packed away), or a trip's group here at the harbour on one of its market stops (t6)
  const open = (h, here) => (h >= 6 && h < 10) || Boolean(here);
  const here = () => { const t = CRUISE.current(), on = state.cruise && state.cruise.on; return Boolean(t && on && on.place === 'harbor' && t.stops.some((s) => s.at === 'harbor' && s.market)); };
  const now = () => open(TOWNEV.now(), here());
  const sig = () => `${now() ? 'm' : ''}${SUSHI.open() ? 's' : ''}`;   // TOWNEV.sig: what the harbour shows of them
  // what each sells, on its table (its top at y): fish on ice in polystyrene boxes, prices on sticks; dried fish laid in rows and a
  // net hung with more; the grill's coals and scallops bubbling on their shells, smoke off them
  const fishy = (x, y, c, k) => `<path d="M${x} ${y} q5 -3.4 10 0 q-5 3.4 -10 0 Z M${x + 10} ${y} l3 -2 v4 Z" ${hc(c, '#4a4c72')} transform="rotate(${k} ${x + 5} ${y})"/><circle cx="${x + 2.2}" cy="${y - 0.4}" r=".7" fill="#2b2b33"/>`;
  const GOODS = {
    sakana: (x, y) => [0, 1, 2].map((k) => { const bx = x + 5 + k * 24;
      return `<path d="M${bx} ${y - 9} h21 v9 h-21 Z" ${hc('#f4f6f6', '#6a6c8a')}/><path d="M${bx} ${y - 9} h21 l-1.4 -2.4 h-18.2 Z" ${hc('#e2e6e8', '#5a5c7a')}/><path d="M${bx + 1.6} ${y - 9} q4 -1.6 9 0 q5 -1.6 9 0" ${hc('#e8f4f8', '#8a8cb0')}/>`
        + (k === 1 ? `<path d="M${bx + 2} ${y - 11} q8 -6 16 -1 q-8 4 -16 1 Z M${bx + 18} ${y - 11} l3.4 -3 v5.6 Z" ${hc('#e0534a', '#6a3a4a')}/><circle cx="${bx + 4.6}" cy="${y - 11.4}" r=".8" fill="#2b2b33"/>`
          : [0, 1, 2].map((j) => fishy(bx + 1.4 + j * 5.6, y - 10.6 - (j % 2) * 1.6, k ? '#4f6a8a' : '#b9c8d4', -20 + j * 18)).join(''))
        + `<path d="M${bx + 17} ${y - 9} v-9" ${hs('#c9a06a', '#4a3a40')} stroke-width=".9"/><rect x="${bx + 12}" y="${y - 24}" width="11" height="7" ${hc('#fbf7ec', '#a8a0a0')}/><text x="${bx + 17.5}" y="${y - 18.8}" text-anchor="middle" font-size="5" font-weight="700" fill="#c8322a" font-family="'Hiragino Maru Gothic ProN', sans-serif">${['300', '980', '500'][k]}</text>`; }).join(''),
    himono: (x, y) => `<path d="M${x + 5} ${y - 4} h${W - 30} v4 h${-(W - 30)} Z" ${hc('#5a7a5a', '#2a3a3a')}/>${Array.from({ length: 8 }, (_, i) => { const fx = x + 8 + (i % 4) * 11.6, fy = y - 6 - Math.floor(i / 4) * 5.2;
      return `<ellipse cx="${fx}" cy="${fy}" rx="5.2" ry="2.2" ${hc(i % 3 ? '#c98a4a' : '#b8743a', '#5a4040')}/><path d="M${fx - 4.4} ${fy} h8.8" ${hs('#8a5a2a', '#3a2a30')} stroke-width=".7"/><path d="M${fx + 4.6} ${fy} l2 -1.6 v3.2 Z" ${hc('#a86a34', '#4a3a3a')}/>`; }).join('')}
      <g class="fx-sway" style="animation-duration:5s"><path d="M${x + W - 18} ${y - 64} v6" ${hs('#4a4a55', '#1c1d3c')} stroke-width=".8"/><rect x="${x + W - 25}" y="${y - 58}" width="14" height="28" rx="2" fill="none" ${hs('#4a6a5a', '#2a3a4a')} stroke-width="1"/><path d="M${x + W - 25} ${y - 51} h14 M${x + W - 25} ${y - 44} h14 M${x + W - 25} ${y - 37} h14" ${hs('#4a6a5a', '#2a3a4a')} stroke-width=".7"/>${[[-21, -54], [-15, -54], [-21, -47], [-15, -47], [-21, -40], [-15, -40]].map(([dx, dy]) => `<ellipse cx="${x + W + dx}" cy="${y + dy}" rx="2.4" ry="1.4" ${hc('#c98a4a', '#5a4040')}/>`).join('')}</g>`,
    yaki: (x, y) => `<rect x="${x + 7}" y="${y - 9}" width="${W - 14}" height="9" rx="1" ${hc('#2b2b33', '#141428')}/><rect x="${x + 9}" y="${y - 9}" width="${W - 18}" height="2.6" fill="#e8592e"/><rect x="${x + 9}" y="${y - 9}" width="${W - 18}" height="2.6" fill="#ffb24a" class="fx-blink" style="animation-duration:1.8s"/><path d="M${x + 8} ${y - 9.4} h${W - 16}" ${hs('#6a6a74', '#2a2c50')} stroke-width="1"/>
      ${[0, 1, 2, 3].map((k) => { const cx = x + 17 + k * 15.4; return `<path d="M${cx - 7} ${y - 9.6} C${cx - 7} ${y - 15} ${cx + 7} ${y - 15} ${cx + 7} ${y - 9.6} Z" ${hc('#e4935c', '#6a4a4a')}/><path d="M${cx - 4.4} ${y - 13.6} l-1.4 3.6 M${cx} ${y - 14.4} v4 M${cx + 4.4} ${y - 13.6} l1.4 3.6" ${hs('#c06a38', '#4a3a40')} stroke-width=".6"/><ellipse cx="${cx}" cy="${y - 11.6}" rx="4" ry="2" ${hc('#f4d8a8', '#8a7a6a')}/><ellipse cx="${cx - 0.6}" cy="${y - 12}" rx="1.6" ry=".7" fill="#fff" fill-opacity=".45"/>`; }).join('')}
      ${[0, 1, 2].map((k) => `<g transform="translate(${x + 22 + k * 18} ${y - 16})"><circle r="${5 + k}" class="fx-smoke" fill="#e8e6e0" style="animation-delay:-${(k * 2.3).toFixed(1)}s;animation-duration:6.5s"/></g>`).join('')}`
  };
  // a market stall: its back poles, its keeper, its pitched canopy and the skirt round it with the sign, its front poles to the
  // ground, its folding table under a cloth, its goods; the shade under it; lit by night under bare bulbs
  function stall([id, x, sign, c, who], k, F) {
    const top = F - 104, val = F - 90, tbl = F - 22;
    const scallops = Array.from({ length: 8 }, (_, i) => `M${x - 4 + i * 11} ${val + 12} q5.5 5 11 0`).join(' ');
    return `<g class="ic-stall" data-stall="${id}"><ellipse cx="${x + W / 2}" cy="${F + 7}" rx="${W / 2 + 6}" ry="4" fill="#2b1c12" fill-opacity=".14"/>
      <path d="M${x + 4} ${val} V${F - 2} M${x + W - 4} ${val} V${F - 2}" ${hs('#9aa0a8', '#2a2c50')} stroke-width="2"/>
      ${stallKeeper(who, x + W / 2, F - 14, k)}
      <path d="M${x - 4} ${val} L${x + 8} ${top} H${x + W - 8} L${x + W + 4} ${val} Z" ${hc(c, '#3a2c48')}/><path d="M${x + 8} ${top} H${x + W - 8} L${x + W - 4} ${top + 4} H${x + 4} Z" fill="#fff" fill-opacity=".22"/><path d="M${x - 4} ${val} L${x + 8} ${top}" stroke="#2b1c12" stroke-opacity=".15" stroke-width="1"/>
      <rect x="${x - 4}" y="${val}" width="${W + 8}" height="12" ${hc(c, '#3a2c48')}/><path d="${scallops}" ${hc(c, '#3a2c48')}/><rect x="${x - 4}" y="${val}" width="${W + 8}" height="2" fill="#fff" fill-opacity=".35"/><rect x="${x + 10}" y="${val + 2}" width="${W - 20}" height="9" rx="1.4" ${hc('#fbf7ec', '#d8ccb0')}/>
      <text x="${x + W / 2}" y="${val + 9}" text-anchor="middle" font-size="${[...sign].length > 3 ? 6.6 : 7.4}" font-weight="800" fill="#2b2b33" font-family="'Hiragino Maru Gothic ProN', 'Zen Maru Gothic', sans-serif">${sign}</text>
      <path d="M${x + 10} ${val + 14} v3 M${x + W - 10} ${val + 14} v3" ${hs('#4a4a55', '#1c1d3c')} stroke-width=".7"/><circle cx="${x + 10}" cy="${val + 19.4}" r="2.4" ${hc('#f6f3ea', '#ffe9a8')}/><circle cx="${x + W - 10}" cy="${val + 19.4}" r="2.4" ${hc('#f6f3ea', '#ffe9a8')}/><circle class="glow" cx="${x + W / 2}" cy="${val + 22}" r="44" fill="url(#glw)"/>
      <rect x="${x + 2}" y="${tbl}" width="${W - 4}" height="3" ${hc('#d9dcdf', '#4a4c6a')}/><path d="M${x + 3} ${tbl + 3} h${W - 6} v15 h${-(W - 6)} Z" ${hc(id === 'yaki' ? '#e9e2d0' : '#5f8ab0', '#2a3050')}/><path d="M${x + 3} ${tbl + 3} h${W - 6} v2 h${-(W - 6)} Z" fill="#2b1c12" fill-opacity=".12"/>
      ${GOODS[id](x, tbl)}
      <path d="M${x - 2} ${val + 10} V${F + 6} M${x + W + 2} ${val + 10} V${F + 6}" ${hs('#b8bec6', '#3a3c62')} stroke-width="2.6"/><path d="M${x - 2.6} ${F + 6} h5 M${x + W - 0.4} ${F + 6} h5" ${hs('#4a4a55', '#1c1d3c')} stroke-width="1.6"/></g>`;
  }
  // gulls over the market — circling lower than the harbour's, two down on the canopies — and the shoppers before the stalls,
  // looking at what is on them (each a look made anew: PASSERS), none before the shop's door, the gangway or the way along the quay
  const gull = (x, y, k) => `<g class="ic-gull" transform="translate(${x} ${y})"><g class="fx-gull" style="animation-delay:-${(k * 4.2).toFixed(1)}s;animation-duration:${(12 + k * 2.5).toFixed(1)}s"><g class="fx-wing gullwing" style="animation-delay:-${(k * 0.17).toFixed(2)}s"><path d="M-12 0 q6 -8 12 0 q6 -8 12 0" ${hs('#f6f6f2', '#9a9ec8')} stroke-width="2.6"/></g><path d="M-5 .6 Q0 -1.4 5 .4 Q0 2.6 -5 .6 Z" ${hc('#f6f6f2', '#9a9ec8')}/><path d="M5 .2 l2 .5 l-2 .6 Z" ${hc('#e6a23c', '#5a4a3a')}/></g></g>`;
  const perched = (x, y) => `<g class="ic-gull" transform="translate(${x} ${y})"><path d="M-6 0 Q-3 -6 3 -5 Q7 -3 6 1 Q3 3 -2 2.4 Z" ${hc('#f6f6f2', '#7a7ea8')}/><path d="M-4 -1 Q0 -4 4 -2 Q1 1 -4 -1 Z" ${hc('#b4bac4', '#5a5e88')}/><circle cx="4.6" cy="-4.6" r="2.6" ${hc('#f6f6f2', '#7a7ea8')}/><circle cx="5.4" cy="-5.2" r=".6" fill="#2b2420"/><path d="M7 -4.6 l3 .6 l-3 .8 Z" ${hc('#e6c23a', '#5a4a3a')}/><path d="M-1 2.4 v2 M2 2.4 v2" stroke="#e6a23c" stroke-width=".8"/></g>`;
  const SHOPPERS = [[-232, 106, 'back turn'], [-66, 110, 'back turn'], [26, 104, 'back turn flip']];   // [X, Y, which way]: at the fish's end, between the dried fish and the grill, past the grill — looking in, not over the goods
  function shoppers() {
    if (typeof PASSERS !== 'object') return '';
    return SHOPPERS.map(([X, Y, how]) => { const { look, wear } = PASSERS.look(), k = yScale(Y);
      return `<div class="hero npc ic-shopper ${how}" aria-hidden="true" style="transform:translate(${X}px,${-Y}px) scale(${k.toFixed(3)});z-index:${300 - Y}">${HERO.svg({ look, wear })}</div>`; }).join('');
  }
  // the market drawn (harborHtml): its stalls each a layer of their own before the quay's back, the gulls, the shoppers; empty when
  // it is not standing (sync puts it up or away in place)
  function layer(F) {
    return STALLS.map((s, k) => landProp(126, stall(s, k, F), null, [s[1] - 10, F - 110, s[1] + W + 10, F + 12])).join('')
      + landProp(40, [[410, F - 128, 0], [520, F - 150, 1], [600, F - 120, 2], [470, F - 176, 3]].map(([x, y, k]) => gull(x, y, k)).join('') + perched(STALLS[0][1] + 22, F - 103) + perched(STALLS[2][1] + 58, F - 103), null, [380, F - 200, 680, F - 90])
      + shoppers();
  }
  let quay;   // the quay's edge the harbour was drawn on (harborHtml's F, given to html): sync draws on it again
  const html = (F) => { quay = F; return `<div class="ic-market" data-on="${now() ? 1 : ''}">${now() ? layer(F) : ''}</div>`; };
  // put up or taken away in place (on any save: the ship called in for t6, a stop done): the stalls and their things to tap, the shop's
  // noren with them — the harbour not drawn anew under the cruise's arrival; the market's part of its sig kept in step, who stands
  // where left to the minute's tick (sceneMinute: at 10:00 健二 comes as the market packs up)
  function sync() {
    const y = document.querySelector('#view .yard[data-place="harbor"]'); if (!y) return;
    const m = y.querySelector('.ic-market'), fr = y.querySelector('.su-front'), on = now(), so = SUSHI.open(); if (!m) return;
    let changed = false;
    if ((m.dataset.on === '1') !== on) {
      m.dataset.on = on ? '1' : ''; m.innerHTML = on ? layer(quay) : '';
      y.querySelectorAll(STALLS.map(([id]) => `.use-btn[data-use="${id}"]`).join(',')).forEach((b) => b.remove());
      if (on) y.querySelector('.yworld').insertAdjacentHTML('beforeend', useBtnsHtml('harbor', (t) => STALLS.some(([id]) => id === t.id)));
      yFitProps(m);
      changed = true;
    }
    if (fr && (fr.dataset.open === '1') !== so) { const g = document.createElementNS('http://www.w3.org/2000/svg', 'g'); g.innerHTML = SUSHI.front(quay); fr.replaceWith(g.firstElementChild); changed = true; }
    if (changed) y.dataset.sig = y.dataset.sig.replace(/^[^|]*/, sig());
  }
  saveHooks.push(() => sync());
  return { STALLS, W, open, here, now, sig, html, sync, SHOPPERS };
})();

// ---- the things to tap: in the shop (its stools and tables to sit at, the tags to order from — shut while 源さん is away, saying
// when it opens — the glass case, the 魚拓) and on the harbour (the shop's door; the market's stalls while they stand) ----
WALK_BLOCK.sushi = [[1.8, 22, 0, 3.95], [3.9, 17.7, 3.95, 5.15], [19.5, 22, 3.95, 9.7], ...SUSHI.TABLES.map(([u0, u1, v0, v1]) => [u0 - 0.1, u1 + 0.1, v0 - 1.25, v1 + 0.1])];
PLACE_USE.sushi = (() => {
  const [l0, l1] = SUSHI.LONG, shut = () => !SUSHI.open();
  return [
    // the stools, the one before 源さん first (where one sits down to what was ordered: YEN; the tour fills them out from him), each its own
    ...SUSHI.STOOLS.map(([u, v, how], i) => ({ id: 'stool' + i, name: '吧台座位', box: isoBBox(u - 0.48, u + 0.48, v - 0.45, v + 0.45, 0, 1.2), kind: 'seat', say: 'わくわく…！', seats: [[u, v, 0.2, how]] }))
      .sort((a, b) => Math.hypot(a.seats[0][0] - SUSHI.spot()[0] - 1.6, a.seats[0][1] - SUSHI.spot()[1]) - Math.hypot(b.seats[0][0] - SUSHI.spot()[0] - 1.6, b.seats[0][1] - SUSHI.spot()[1])),
    ...SUSHI.TABLES.map(([u0, u1, v0, v1], i) => ({ id: 'table' + i, name: '小桌', box: isoBBox(u0, u1, v0, v1, 1.3, 1.5), kind: 'seat', say: 'いただきます！', seats: [[u0 + 0.5, v0 - 0.75, 0, 'bench turn flip'], [u1 - 0.5, v0 - 0.75, 0, 'bench turn flip']] })),
    { id: 'menu', name: '木牌菜單', box: isoBBox(2.2, 15.4, 0, 0.1, 3.9, 6.7), kind: 'do', go: isoXY(7.6, 5.7), face: 'back turn', pose: 'look', buy: 'sushi', when: () => !shut() },
    { id: 'fuda', name: '木牌菜單', box: isoBBox(2.2, 15.4, 0, 0.1, 3.9, 6.7), kind: 'do', go: isoXY(7.6, 5.7), face: 'back turn', pose: 'look', when: shut, pick: () => ['じゅんびちゅう…', SUSHI.shutSay()] },
    // the glass cases, each its own: the one by 源さん's hands (its tap stopping short of him: he is tapped, not the case), the far one
    ...SUSHI.CASES.map(([u0, u1], i) => ({ id: 'case' + i, name: '冷藏櫃', box: isoBBox(u0, i ? u1 : u1 - 1.2, 2.95, 3.45, 1.95, 2.6), kind: 'do', go: isoXY([6.8, 14.8][i], 5.7), face: 'back turn', pose: 'look',
      pick: () => [['つやつや…！', 'ネタケース（冷藏玻璃櫃）：源先生手邊這一櫃，是他正在捏的料：まぐろ（鮪魚）、サーモン（鮭魚）、えび（蝦）、いか（花枝）。'],
        ['ぴかぴか！', 'ネタケース（冷藏玻璃櫃）：今天早上的まぐろ（鮪魚）、サーモン（鮭魚）、えび（蝦）、いか（花枝）、いくら（鮭魚卵）。']][i] })),
    { id: 'gyotaku', name: '魚拓', box: isoBBox(0, 0.1, 1.6, 5.4, 3.5, 6.3), kind: 'do', go: isoXY(1.0, 4.4), face: 'back turn flip', pose: 'look', pick: () => ['おおきい タイ…！', '魚拓：用墨把真的魚拓印在紙上。這條鯛魚是源先生年輕時釣到的。'] }];
})();
PLACE_USE.harbor.push(
  { id: 'sushi', name: 'みなと寿司', box: [SUSHI.DOOR[0] - 2, 172, SUSHI.DOOR[1] + 2, 240], kind: 'do', go: [(SUSHI.DOOR[0] + SUSHI.DOOR[1]) / 2 - 600, 122], back: 1, pose: 'reach', open: (y) => yGo(y.querySelector('.use-btn[data-use="sushi"]') || y, 'sushi') },
  // the 朝市's stalls (ICHIBA): the fish and the dried fish, their keepers calling out; the grill, its menu (YEN) — each tapped above
  // the quay's edge (the gull on its bollard before the grill keeps its own)
  ...ICHIBA.STALLS.map(([id, x, , , who]) => Object.assign({ id, name: { sakana: '魚攤', himono: '魚乾攤', yaki: '燒烤攤' }[id], box: [x - 4, 132, x + ICHIBA.W + 4, 222], kind: 'do', go: [x + ICHIBA.W / 2 - 600, 116], back: 1, pose: 'look', when: () => ICHIBA.now() },
    id === 'yaki' ? { buy: 'ichiba' } : { keeper: who, say: id === 'sakana' ? 'ピチピチ！' : 'いい におい…' })));
