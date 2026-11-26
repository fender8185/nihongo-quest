'use strict';
// ---------- らいらいけん: 大通り's 中華料理店, walked into (2026-11-15; docs/superpowers/specs/2026-11-15-work-redesign-design.md §5) ----------
// The user: the 外場 job wants a shop to walk into, a Chinese restaurant, customers sitting down and talking, the hero running
// between the tables and the register. Seen at 45° as the 食堂 (ISO): the kitchen's pass along the right wall with 黄 behind it
// (the wok's fire through the hatch, the shop's name over it), red paper menu strips beside, the goldfish tank, the toilet door at
// the far end (おてあらい); three round tables with red cloths and lazy susans, their stools; the register by the door with its
// 招き猫; the にんき poster (the おすすめ is the board in the hero's hand, 外場) and a latticed window on the left wall; lanterns. Open 10–20 (TOWN.HOURS.rairai).
const RAIRAI = {
  TABLES: [[8.6, 7.4], [15.2, 5.6], [14.6, 11.8]],   // the round tables' middles (u, v)
  R: 1.35,   // their cloths' radius
  PASS: [3.4, 10.4, 1.5, 2.3], REG: [1.2, 3.6, 8.8, 10.2], TANK: [11.2, 13.6, 0.3, 1.3], WC: [19.2, 21.0],
  // where the hero stands for each (u, v), and where a customer is: at a table (behind it, facing us), at the door, before the register
  at: { pass: [6.9, 3.3], register: [2.4, 7.8], entry: [3.4, 12.4], table: (i) => [RAIRAI.TABLES[i][0] + 2.0, RAIRAI.TABLES[i][1] + 1.0] },
  seat: (i) => [RAIRAI.TABLES[i][0] - 1.15, RAIRAI.TABLES[i][1] - 1.15], door: [1.0, 13.4], wait: [1.8, 12.9], pay: [2.4, 11.2],
  MENU: [['ぎょうざ', 400], ['ラーメン', 700], ['チャーハン', 650], ['しゅうまい', 450], ['はるまき', 350], ['マーボーどうふ', 750]],
  PIC: { ぎょうざ: '餃子', ラーメン: 'ラーメン', チャーハン: 'チャーハン', しゅうまい: 'しゅうまい', はるまき: 'はるまき', マーボーどうふ: 'マーボーどうふ' },   // each dish's drawing (PICS, PICS_TOWN)
  ZH: { ぎょうざ: '煎餃', ラーメン: '拉麵', チャーハン: '炒飯', しゅうまい: '燒賣', はるまき: '春捲', マーボーどうふ: '麻婆豆腐' },   // each dish's Chinese (the wall menu's card)
  dish: (name, cls = '', disc = false) => { const k = RAIRAI.PIC[name], d = k && ((typeof PICS === 'object' && PICS[k]) || (typeof PICS_TOWN === 'object' && PICS_TOWN[k])); return d ? `<svg class="pic${cls ? ' ' + cls : ''}" viewBox="0 0 100 100" aria-hidden="true">${disc ? '<circle class="pd" cx="50" cy="50" r="47"/>' : ''}${d}</svg>` : ''; },   // disc: on its round backdrop, as a menu's
  // the wall's menu read on a card of its own (2026-11-26, test.4; the user's pick 「改成菜單卡」 — it was a toast of 67 characters gone
  // in 3.6 s): the town's menu card (YEN), each dish's drawing, its name and price, its Chinese on 中文 — to read only (nothing is
  // bought here: the 外場 serves these), shut by the player
  card: () => {
    const row = ([n, p]) => `<div class="mc-item"><span class="mc-pic">${RAIRAI.dish(n, '', true)}</span><span class="mc-name">${esc(n)}</span><span class="mc-price"><small>${esc(YEN.reading(p))}</small><b>${yenStr(p)}円</b></span><span class="mc-zh" lang="zh-Hant">${esc(RAIRAI.ZH[n] || '')}</span></div>`;
    openModal('らいらいけん', `<div class="menu-card rr-menu" lang="ja"><div class="mc-list">${RAIRAI.MENU.map(row).join('')}</div></div>`, { width: 380, noFocus: true,
      head: '<div class="mc-top"><button type="button" class="zh-btn" data-act="rairai-zh" aria-pressed="false">中文</button></div>' });
  },
  zh: (btn) => { const c = document.querySelector('#modalRoot .rr-menu'); if (!c) return; const on = c.classList.toggle('zh'); btn.textContent = on ? '收起中文' : '中文'; btn.setAttribute('aria-pressed', String(on)); },
};
RAIRAI.STOOLS = RAIRAI.TABLES.flatMap(([u, v]) => [[u - 1.15, v - 1.15], [u - 1.75, v + 0.35], [u + 0.35, v - 1.75]]);

function rairaiHtml() {
  isoProps = [];
  const f = (n) => n.toFixed(2), { TABLES, R } = RAIRAI;
  // the kitchen through its hatch: dark tiles, the hood, the wok on its fire (the flames flicker), ladles hung, steam
  const hatch = `<rect x="3.6" y="-4.9" width="6.6" height="2.4" fill="#3a2a24"/><path d="${Array.from({ length: 10 }, (_, i) => `M${f(3.6 + i * 0.66)} -4.9 v2.4`).join(' ')} M3.6 -3.7 H10.2" stroke="#4a3a32" stroke-width=".03"/>
    <path d="M4.4 -4.9 h3 l-.4 .55 h-2.2 Z" fill="#8d9097"/><ellipse cx="6" cy="-2.75" rx=".95" ry=".2" fill="#2b2b33"/><path d="M5.05 -2.8 q.95 .5 1.9 0" fill="#1c1c22"/>
    <g class="fx-flame"><ellipse cx="5.7" cy="-2.62" rx=".22" ry=".14" fill="#f08a3c"/><ellipse cx="6.2" cy="-2.6" rx=".2" ry=".13" fill="#f2c94c"/><ellipse cx="6" cy="-2.58" rx=".3" ry=".1" fill="#e8592e"/></g>
    <path d="M8.2 -4.8 v.9 M8.6 -4.8 v1.1 M9 -4.8 v.8" stroke="#b8bcc2" stroke-width=".05"/><circle cx="8.2" cy="-3.85" r=".12" fill="#b8bcc2"/><ellipse cx="8.6" cy="-3.65" rx=".16" ry=".08" fill="#b8bcc2"/><path d="M8.9 -4 h.22 v.18 h-.22 Z" fill="#b8bcc2"/>
    <rect x="3.5" y="-5" width="6.8" height=".12" fill="#5a1a14"/><rect x="3.5" y="-2.52" width="6.8" height=".1" fill="#5a1a14"/>`;
  const sign = `<rect x="4.2" y="-6.15" width="5.4" height=".95" rx=".08" fill="#a8241c" stroke="#d9b04a" stroke-width=".06"/><text x="6.9" y="-5.48" text-anchor="middle" font-size=".56" font-weight="700" fill="#f6d47a" ${SERIF}>らいらいけん</text>`;
  // the menu strips: red paper, each dish in kana down it, its price at the foot (the lanterns by them hang clear: the last 福 at
  // u 18.6, between them and the toilet door — at 17.4 it hid マーボーどうふ's strip; 2026-11-26, test.4)
  const strips = RAIRAI.MENU.map(([n, p], i) => { const x = 11.3 + i * 1.02, fs = n.length > 5 ? 0.3 : 0.36;
    return `<rect x="${f(x)}" y="-6.3" width=".86" height="2.9" fill="#c8322a" stroke="#8a1a14" stroke-width=".03"/>${vText(f(x + 0.43), -6.18, n, fs, `font-weight="700" fill="#fbf3e2" ${SERIF}`)}<text x="${f(x + 0.43)}" y="-3.52" text-anchor="middle" font-size=".2" fill="#f6d47a">${p}円</text>`; }).join('');
  // the toilet door at the far end: its plate (おてあらい, the two little figures)
  const wc = `<rect x="19.3" y="-4.1" width="1.6" height="4.1" fill="#8a4a34"/><rect x="19.45" y="-3.95" width="1.3" height="1.7" fill="none" stroke="#6e3a28" stroke-width=".04"/><rect x="19.45" y="-2.05" width="1.3" height="1.8" fill="none" stroke="#6e3a28" stroke-width=".04"/>
    <circle cx="20.65" cy="-2.1" r=".07" fill="#d9b04a"/><rect x="19.55" y="-4.75" width="1.1" height=".5" rx=".06" fill="#fbf8f0" stroke="#6e3a28" stroke-width=".03"/><text x="20.1" y="-4.42" text-anchor="middle" font-size=".19" font-weight="700" fill="#3b2a1c">おてあらい</text>`;
  const land = `<svg class="land indoor-land iso rairai-land" viewBox="0 -530 1200 900" preserveAspectRatio="xMidYMax slice" style="height:900px">${GLOW_DEFS}${ISO_DEFS}
    ${isoShell({ floor: '#b8664c', seam: '#96503a', wallL: '#f4e6cc', wallR: '#f8ecd4', wainL: '#8e2a22', wainR: '#9a3026', batten: '#6e1e18', trim: '#5a1a14', edgeU: '#7a3a28', edgeV: '#8a4a34', capU: '#e8d4b0', capV: '#f0dcbc', top: '#d8c4a0' })}
    ${iOnF(0, `<path d="${Array.from({ length: 10 }, (_, i) => `M0 ${f(1.6 * i + 0.8)} H22`).join(' ')}" stroke="#d27a5c" stroke-opacity=".25" stroke-width=".04"/>`)}
    ${iOnV(0.02, hatch + sign + strips + wc)}
    ${frameR(19.3, 20.9, 4.1, '#5a1a14')}
    ${iOnL(`<rect x="-10.6" y="-5.8" width="3.6" height="2.8" fill="#bfe0f0" class="hc" style="--c:#bfe0f0;--n:#1c2448"/><path d="${[0.6, 1.2, 1.8, 2.4, 3.0].map((d) => `M${f(-10.6 + d)} -5.8 v2.8`).join(' ')} M-10.6 -4.4 h3.6" stroke="#a8241c" stroke-width=".08"/><rect x="-10.6" y="-5.8" width="3.6" height="2.8" fill="none" stroke="#5a1a14" stroke-width=".14"/>
      <rect x="-6.4" y="-6.2" width="2.8" height="3.4" fill="#fbf3e2" stroke="#a8241c" stroke-width=".08"/><text x="-5" y="-5.78" text-anchor="middle" font-size=".34" font-weight="700" fill="#c8322a" ${SERIF}>にんき！</text>
      <ellipse cx="-5" cy="-4.15" rx="1" ry=".55" fill="#fbf8f0" stroke="#d9d0bf" stroke-width=".04"/><ellipse cx="-5" cy="-4.25" rx=".75" ry=".36" fill="#c8452a"/><rect x="-5.35" y="-4.42" width=".22" height=".18" fill="#f4ead8"/><rect x="-4.85" y="-4.32" width=".2" height=".16" fill="#f4ead8"/><circle cx="-4.75" cy="-4.45" r=".05" fill="#5a8a4a"/>
      <text x="-5" y="-3.12" text-anchor="middle" font-size=".26" font-weight="700" fill="#3b2a1c">マーボーどうふ</text>
      <g transform="rotate(45 -11.2 -5)"><rect x="-11.55" y="-5.35" width=".7" height=".7" fill="#c8322a"/></g><text x="-11.2" y="-4.86" text-anchor="middle" font-size=".42" font-weight="700" fill="#f6d47a" transform="rotate(180 -11.2 -5)" ${SERIF}>福</text>`, 0.02)}
    ${iOnL(`<rect x="-14.8" y="-4.62" width="2.8" height="4.62" fill="#5a1a14"/>${[0, 1].map((k) => `<rect x="${(-14.7 + k * 1.36).toFixed(2)}" y="-4.5" width="1.3" height="4.45" fill="#8e2a22"/><rect x="${(-14.5 + k * 1.36).toFixed(2)}" y="-4.2" width=".9" height="1.8" fill="#d6e8ee" opacity=".85"/>`).join('')}
      <rect x="-13.95" y="-2.6" width=".1" height=".5" fill="#d9b04a"/><rect x="-13.75" y="-2.6" width=".1" height=".5" fill="#d9b04a"/>`)}
    ${frameL(12, 14.8, 4.62, '#3a1a14')}
    ${[[2.2, 0.6, '福'], [11, 0.6, '来'], [18.6, 0.6, '福']].map(([u, v, ch], k) => iLantern(u, v, 7.2, k, ch)).join('')}
    ${[[0.6, 4.8, '来'], [0.6, 11, '福']].map(([u, v, ch], k) => iLantern(u, v, 7.2, k + 3, ch)).join('')}
  </svg>`;
  // the pass: steel on a red lacquer front, a bell on it; the register with its till, its 招き猫 beckoning; the tank and its fish
  const [p0, p1, q0, q1] = RAIRAI.PASS, [r0, r1, s0, s1] = RAIRAI.REG, [k0, k1, m0, m1] = RAIRAI.TANK;
  const pass = iBox('#a8302a', p0, q0, 0, p1, q1, 2.0, { top: '#c9cdd2', fv: '#a8302a', fu: '#8a2620' }) + iBox('#d9dce0', p0 - 0.05, q0 - 0.05, 2.0, p1 + 0.05, q1 + 0.05, 2.1, { top: '#eef0f2' })
    + iOnV(q1, `<path d="M${p0 + 0.3} -1.7 H${p1 - 0.3}" stroke="#d9b04a" stroke-width=".05"/>${[0, 1, 2, 3, 4, 5].map((i) => `<circle cx="${f(p0 + 0.9 + i * 1.05)}" cy="-1" r=".22" fill="none" stroke="#d9b04a" stroke-width=".04"/>`).join('')}`)
    + (() => { const [x, y] = isoPt(p1 - 0.6, (q0 + q1) / 2, 2.1); return `<ellipse cx="${x.toFixed(1)}" cy="${(y - 2).toFixed(1)}" rx="5" ry="3.2" fill="#d9b04a"/><circle cx="${x.toFixed(1)}" cy="${(y - 5).toFixed(1)}" r="1.2" fill="#b8902a"/>`; })();
  const reg = iBox('#7a2a20', r0, s0, 0, r1, s1, 1.9, { top: '#c8955f', fv: '#8a2a20', fu: '#6a2018' }) + iOnV(s1, `<rect x="${r0 + 0.25}" y="-1.6" width="${r1 - r0 - 0.5}" height=".9" fill="none" stroke="#d9b04a" stroke-width=".05"/>`)
    + iBox('#4a4a55', r0 + 0.3, s0 + 0.2, 1.9, r0 + 1.3, s0 + 1.0, 2.45, { top: '#6a6a74' }) + iBox('#2b2b33', r0 + 0.35, s0 + 0.15, 2.45, r0 + 1.25, s0 + 0.35, 2.75, { top: '#3a3a44' })
    + `<g data-fx="maneki">${(() => { const [x, y] = isoPt(r1 - 0.45, (s0 + s1) / 2, 1.9); return `<g transform="translate(${x.toFixed(1)} ${(y - 14).toFixed(1)}) scale(.45)"><path d="M-11 26 Q-13 6 0 4 Q13 6 11 26 Z" fill="#fff" stroke="#2b1c12" stroke-opacity=".25"/><circle cx="0" cy="0" r="10" fill="#fff" stroke="#2b1c12" stroke-opacity=".25"/><path d="M-9 -6 l2 -8 l5 6 M9 -6 l-2 -8 l-5 6" fill="#fff" stroke="#2b1c12" stroke-opacity=".25"/><path d="M-5 0 q1.5 -1.5 3 0 M2 0 q1.5 -1.5 3 0" stroke="#2b1c12" fill="none"/><path d="M-2 4 q2 2 4 0" stroke="#2b1c12" fill="none"/><rect x="-6" y="9" width="12" height="2.4" fill="#c8322a"/><circle cx="0" cy="12" r="1.8" fill="#d9b04a"/><g class="paw"><ellipse cx="10" cy="-2" rx="3.4" ry="5" fill="#fff" stroke="#2b1c12" stroke-opacity=".25"/></g></g>`; })()}</g>`;
  const tank = iBox('#5a1a14', k0, m0, 0, k1, m1, 1.3, { top: '#7a2a20' }) + iBox('#7fb8d8', k0 + 0.1, m0 + 0.1, 1.3, k1 - 0.1, m1 - 0.1, 2.5, { top: '#a8d4ec', fv: '#8cc4e0', fu: '#6aa8c8' })
    + `<g data-fx="fish">${[[k0 + 0.6, 1.8, '#f08a3c'], [k0 + 1.5, 2.1, '#e8592e'], [k0 + 1.0, 1.6, '#fbf3e2']].map(([u, h, c]) => { const [x, y] = isoPt(u, m1 - 0.1, h); return `<g class="fx-fish"><ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="4" ry="2.2" fill="${c}"/><path d="M${(x + 3.6).toFixed(1)} ${y.toFixed(1)} l3 -2 v4 Z" fill="${c}"/></g>`; }).join('')}</g>`;
  const plant = iCyl(1.3, 1.1, 0.45, 0, 0.9, '#a8302a', '#7a2a20') + (() => { const [x, y] = isoPt(1.3, 1.1, 0.9); return [[-12, -26, 12], [8, -30, 13], [-2, -44, 12], [12, -18, 9], [-14, -12, 8]].map(([dx, dy, r]) => `<ellipse cx="${(x + dx).toFixed(1)}" cy="${(y + dy).toFixed(1)}" rx="${r}" ry="${r * 0.62}" fill="#4f8a4a" transform="rotate(${dx * 2} ${(x + dx).toFixed(1)} ${(y + dy).toFixed(1)})"/>`).join(''); })();
  // a round table: its foot and post, the red cloth hanging round, the lazy susan with a teapot and cups
  const table = ([u, v], k) => iCyl(u, v, 0.55, 0, 0.06, '#3a2a20', '#4a3a30') + iCyl(u, v, 0.12, 0.06, 1.25, '#3a2a20', '#4a3a30') + iCyl(u, v, R, 1.0, 1.4, '#b8322a', '#d0453c') + iCylSh(u, v, R, 1.0, 1.4, 0.16)
    + iCyl(u, v, 0.72, 1.4, 1.47, '#e4ddd0', '#fbf8f0') + iCyl(u + 0.2, v - 0.1, 0.2, 1.47, 1.75, '#f4f1e6', '#e8e2d4') + iCyl(u - 0.35, v + 0.25, 0.1, 1.47, 1.6, '#f4f1e6', '#e8e2d4') + iCyl(u + 0.3, v + 0.4, 0.1, 1.47, 1.6, '#f4f1e6', '#e8e2d4')
    + (() => { const [x, y] = isoPt(u, v, 1.0), rx = R * ISO.U * Math.SQRT2; return `<path d="${Array.from({ length: 9 }, (_, i) => { const t = -0.9 + i * 0.225; return `M${(x + rx * t).toFixed(1)} ${(y + rx / 2 * Math.sqrt(1 - t * t)).toFixed(1)} v-6`; }).join(' ')}" stroke="#8a1a14" stroke-opacity=".35" stroke-width=".8"/>`; })()
    + iSteam(u + 0.2, v - 0.1, 1.75, k * 0.8, 4);
  const stool = { foot: '#3a2a20', footTop: '#4a3a30', post: '#5a4a40', side: '#8a2a22', top: '#b8382e' };
  const props = isoProp([p0, p1, q0, q1], pass, 2.2) + isoProp([r0, r1, s0, s1], reg, 2.8) + isoProp([k0, k1, m0, m1], tank, 2.6) + isoProp([0.85, 1.75, 0.65, 1.55], plant, 2)
    + RAIRAI.STOOLS.map(([u, v]) => isoProp([u - 0.42, u + 0.42, v - 0.42, v + 0.42], iStool(u, v, stool), 1.05)).join('')
    + TABLES.map((t, k) => isoProp([t[0] - R, t[0] + R, t[1] - R, t[1] + R], table(t, k), 1.5)).join('');
  return `${land}${isoLay(props)}${indoorRest('rairai', 'chinadori')}`;
}

// ---- what can be tapped in the room: the pass (黄's dishes), the register, the tables, the menu, the poster, the toilet door, the
// tank. On a 外場 shift (HALL) the pass, the register and the tables are where the hero is wanted; off it, a word each ----
PLACE_USE.rairai = (() => {
  const on = () => typeof HALL === 'object' && HALL.on();
  const at = (k) => isoXY(...(k.startsWith('table') ? RAIRAI.at.table(Number(k.slice(5))) : RAIRAI.at[k]));
  const work = (k, say) => ({ go: at(k), pick: () => [on() ? '' : say], open: (y) => { if (on()) HALL.at(y, k); } });
  const [p0, p1, q0, q1] = RAIRAI.PASS, [r0, r1, s0, s1] = RAIRAI.REG, [k0, k1, m0, m1] = RAIRAI.TANK;
  return [
    Object.assign({ id: 'pass', name: '出菜口', box: isoBBox(p0, p1, 0, q1, 0, 4.9), kind: 'do', face: 'back turn', pose: 'look' }, work('pass', 'いい におい…！')),
    Object.assign({ id: 'register', name: '收銀台', box: isoBBox(r0, r1, s0, s1, 0, 2.8), kind: 'do', pose: 'look' }, work('register', 'まねきねこ！')),
    ...RAIRAI.TABLES.map(([u, v], i) => Object.assign({ id: 'table' + i, name: '圓桌', box: isoBBox(u - RAIRAI.R, u + RAIRAI.R, v - RAIRAI.R, v + RAIRAI.R, 0, 1.5), kind: 'do', face: 'back turn flip', pose: 'look' }, work('table' + i, 'まるい テーブル！'))),
    { id: 'menu', name: '菜單', box: isoBBox(11.3, 17.4, 0, 0.1, 3.4, 6.3), kind: 'do', go: isoXY(14.2, 2.4), face: 'back turn', pose: 'look', say: 'ぎょうざ、ラーメン…', open: () => RAIRAI.card() },   // read on a card (test.4)
    { id: 'poster', name: 'にんき', box: isoBBox(0, 0.1, 3.6, 6.4, 2.8, 6.2), kind: 'do', go: isoXY(2.4, 5.0), face: 'back turn flip', pose: 'look', pick: () => ['マーボーどうふ！', '「にんき」是人氣：店裡最受歡迎的麻婆豆腐。'] },
    { id: 'toilet', name: 'おてあらい', box: isoBBox(19.3, 20.9, 0, 0.2, 0, 4.8), kind: 'do', go: isoXY(20.1, 2.0), face: 'back turn', pose: 'look', pick: () => ['おてあらい…', '「おてあらい」是洗手間。'] },
    { id: 'tank', name: '魚缸', box: isoBBox(k0, k1, m0, m1, 0, 2.5), kind: 'do', go: isoXY(12.4, 2.6), face: 'back turn', pose: 'look', say: 'きんぎょ！', fx: 'fish', fxc: 'flutter' },
    // each table's three stools (RAIRAI.STOOLS: behind it facing us, at its −u side facing right, at its −v side facing left): sat on
    // at the tour's lunch (CRUISE: seat; 2026-11-23, spec §3) — not the hero's to tap (the tables are the 外場's): never a button
    ...RAIRAI.TABLES.map(([u, v], i) => ({ id: 'stools' + i, name: '圓凳', box: isoBBox(u - 2.2, u + 0.8, v - 2.2, v + 0.8, 0, 1.1), kind: 'seat', when: () => false,
      seats: RAIRAI.STOOLS.slice(i * 3, i * 3 + 3).map(([a, b], k) => [a, b, 0, ['bench', 'bench turn', 'bench turn flip'][k]]) }))];
})();
