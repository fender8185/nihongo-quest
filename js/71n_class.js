'use strict';
// ---------- 公民館 and its 日本語教室 (2026-11-14, 新手第一週 stage 3; docs/superpowers/specs/2026-11-14-beginner-week-design.md §5) ----------
// A tester new to Japanese found the first week dull: kana only, nothing to do in the town or the room. The bus goes from the
// first day to みなと市立公民館, where 林 teaches a free class every evening and 陳 (from Taiwan), マリア (from Brazil) and 堀先生
// (an old calligrapher) study. In the classroom, any time it is open: the blackboard (the kana learned, in chalk), かるた on the
// tatami, the radio cassette player (the class sings a row of kana), picture books, the clock that tells the time in Japanese.

// ---- 公民館: a white two-storey hall up the bus line — its clock, its name, nobori and a banner for the class, the notice board
// (the lost cat on its poster sits right under it), flower beds, the bike shelter; the stop at the right ----
function kominkanHtml() {
  const F = 236, open = TOWNEV.isOpen('kominkan', TOWNEV.now());
  const winD = '#bcd8e4', f = (n) => n.toFixed(1);
  // a window of the hall: its frame, the glass (lit warm by night where someone is in), a sill, the glint
  const win = (x, y, w, h, lit) => `<rect x="${x - 3}" y="${y - 3}" width="${w + 6}" height="${h + 6}" ${hc('#d8d0c0', '#1e2040')}/><rect x="${x}" y="${y}" width="${w}" height="${h}" ${hc(winD, lit ? '#ffd98a' : '#2e3260')}/>`
    + `<path d="M${x + w / 2} ${y} V${y + h}" ${hs('#d8d0c0', '#1e2040')} stroke-width="2.4"/><path d="M${x + 4} ${y + h - 6} L${x + w * 0.38} ${y + 5}" stroke="#fff" stroke-opacity=".35" stroke-width="2"/>`
    + `<rect x="${x - 5}" y="${y + h + 2}" width="${w + 10}" height="4" ${hc('#cfc6b4', '#1a1c38')}/>`;
  // the classroom's windows on the ground floor, left wing: kana sheets taped up inside
  const classWin = (x, k) => win(x, 150, 58, 56, true) + `<rect x="${x + 6}" y="156" width="14" height="16" ${hc('#fbf8f0', '#fff2cc')}/><text x="${x + 13}" y="168" text-anchor="middle" font-size="10" ${hc('#3b2a1c', '#5a4020')} font-family="system-ui, sans-serif">${'あいう'[k]}</text>`;
  // a nobori on its pole, swaying: its words down it
  const nobori = (x, words, c, k) => `<path d="M${x} ${F} V${F - 150}" ${hs('#8d9097', '#3a3c58')} stroke-width="2.6"/><g class="fx-sway" style="animation-delay:-${k}s;animation-duration:3.8s;transform-origin:${x}px ${F - 150}px">
    <path d="M${x + 1} ${F - 146} h22 v104 h-22 Z" ${hc(c[0], c[1])}/><path d="M${x + 1} ${F - 146} h22 v6 h-22 Z" fill="#2b1c12" fill-opacity=".15"/>${vText(x + 12, F - 138, words, 11.5, `font-weight="700" ${hc('#fff', '#e8e4ff')} font-family="'Hiragino Mincho ProN', 'Noto Serif JP', serif"`)}</g>`;
  // the notice board: a little roof on two posts, its cork, four posters (the class, bon dance practice, radio exercises, a lost cat)
  const poster = (x, y, w, h, bg, title, tc, art) => `<g transform="rotate(${((x * 7) % 5) - 2} ${x + w / 2} ${y})"><rect x="${x}" y="${y}" width="${w}" height="${h}" ${hc(bg, '#3a3c60')}/><circle cx="${x + w / 2}" cy="${y + 2.4}" r="1.6" fill="#d0453c"/>
    <text x="${x + w / 2}" y="${y + 11}" text-anchor="middle" font-size="7" font-weight="700" ${hc(tc, '#c9c4e8')} font-family="system-ui, sans-serif">${title}</text>${art}</g>`;
  const board = `<g data-fx="keiji"><path d="M140 ${F} V${F - 104} M282 ${F} V${F - 104}" ${hs('#6e4f3a', '#2c2440')} stroke-width="5"/><path d="M128 ${F - 110} L211 ${F - 128} L294 ${F - 110} Z" ${hc('#4f6f5a', '#1c2a34')}/>
    <rect x="136" y="${F - 110}" width="150" height="80" rx="2" ${hc('#c8a274', '#3a2c40')}/><rect x="141" y="${F - 105}" width="140" height="70" ${hc('#d9b98c', '#40324a')}/>${Array.from({ length: 30 }, (_, i) => `<circle cx="${144 + (i * 37) % 136}" cy="${F - 101 + (i * 23) % 64}" r=".7" fill="#8a6a48" fill-opacity=".5"/>`).join('')}
    ${poster(146, F - 101, 40, 50, '#e6f0fa', '日本語教室', '#2f5a8a', `<text x="166" y="${F - 79}" text-anchor="middle" font-size="9" fill="#2f5a8a" font-family="system-ui, sans-serif">あいう</text><path d="M152 ${F - 70} h28 M152 ${F - 65} h22 M152 ${F - 60} h26" stroke="#2f5a8a" stroke-opacity=".4" stroke-width="1.4"/>`)}
    ${poster(191, F - 103, 38, 46, '#fbe4dc', '盆踊り', '#b8442c', `<path d="M210 ${F - 86} q-6 0 -6 8 q0 8 6 8 q6 0 6 -8 q0 -8 -6 -8 Z" fill="#e8592e"/><path d="M204 ${F - 78} h12" stroke="#fff" stroke-opacity=".7"/><path d="M210 ${F - 89} v3" stroke="#2b2b33"/>`)}
    ${poster(234, F - 100, 44, 48, '#e2f2e0', 'ラジオ体操', '#3f7a52', `<circle cx="256" cy="${F - 82}" r="3" fill="#3f7a52"/><path d="M256 ${F - 79} v9 M248 ${F - 81} l8 4 l8 -4 M256 ${F - 70} l-5 8 M256 ${F - 70} l5 8" fill="none" stroke="#3f7a52" stroke-width="1.6" stroke-linecap="round"/>`)}
    ${poster(196, F - 56, 46, 22, '#fffdf6', 'さがしています', '#c8453a', `<path d="M207 ${F - 40} l2 -5 l2 3 h4 l2 -3 l2 5 q0 5 -6 5 q-6 0 -6 -5 Z" fill="#e6a65a"/><text x="230" y="${F - 37}" text-anchor="middle" font-size="6" fill="#3b2a1c" font-family="system-ui, sans-serif">ねこ</text>`)}</g>`;
  // the lost cat itself, under the board: a ginger tabby sitting up, tail curled round its feet, looking out — its tail flicks
  const cat = `<g data-fx="kcat"><g transform="translate(270 ${F})"><ellipse cx="0" cy="0" rx="13" ry="2" fill="#2b1c12" fill-opacity=".15"/>
    <g class="ctail fx-flick"><path d="M8 -2 C16 -2 18 -9 13 -12" fill="none" ${hs('#e6a65a', '#5a4a3a')} stroke-width="3.4" stroke-linecap="round"/></g>
    <path d="M-9 0 C-11 -10 -7 -20 0 -20 C7 -20 11 -10 9 0 Z" ${hc('#e6a65a', '#5a4a3a')}/><path d="M-5 -14 q2 3 1 6 M0 -16 q2 3 1 7 M5 -14 q-1 3 0 6" fill="none" ${hs('#c27c3a', '#4a3a2e')} stroke-width="1.2"/><ellipse cx="0" cy="-6" rx="4" ry="6" ${hc('#f6e6cc', '#6a5e54')}/>
    <g class="chead"><path d="M-8 -26 L-7 -35 L-2 -29 Z M8 -26 L7 -35 L2 -29 Z" ${hc('#e6a65a', '#5a4a3a')}/><path d="M-6.6 -28 L-6 -32.6 L-3.4 -29.4 Z M6.6 -28 L6 -32.6 L3.4 -29.4 Z" ${hc('#ecaaa4', '#6a5a70')}/>
    <circle cx="0" cy="-24" r="9" ${hc('#e6a65a', '#5a4a3a')}/><ellipse cx="0" cy="-20.6" rx="4.6" ry="3.2" ${hc('#f6e6cc', '#6a5e54')}/><circle cx="-3.4" cy="-25" r="1.4" ${hc('#2a2730', '#e8e4c0')}/><circle cx="3.4" cy="-25" r="1.4" ${hc('#2a2730', '#e8e4c0')}/>
    <path d="M-1 -21.6 h2 l-1 1 Z" fill="#d07a7a"/><path d="M-2.4 -19.8 q1.2 1 2.4 0 q1.2 1 2.4 0" fill="none" stroke="#4a3a2c" stroke-width=".7"/><path d="M-4 -20.6 l-6 -.8 M-4 -19.6 l-6 .6 M4 -20.6 l6 -.8 M4 -19.6 l6 .6" stroke="#fff" stroke-opacity=".55" stroke-width=".5"/>
    <path d="M-3 -31 q1 -2 0 -3 M0 -32 v-3 M3 -31 q-1 -2 0 -3" fill="none" ${hs('#c27c3a', '#4a3a2e')} stroke-width="1"/></g></g></g>`;
  // a flower bed: its brick edge, leaves, tulips and marigolds
  const bed = (x0, x1, k) => `<rect x="${x0}" y="${F - 14}" width="${x1 - x0}" height="14" ${hc('#b4664a', '#3a2430')}/><path d="${Array.from({ length: Math.floor((x1 - x0) / 14) }, (_, i) => `M${x0 + 14 * (i + 1)} ${F - 14} v14`).join(' ')} M${x0} ${F - 7} H${x1}" ${hs('#9a5038', '#2c1c28')} stroke-width=".8"/>
    <path d="M${x0} ${F - 14} C${x0 + 30} ${F - 26} ${x1 - 30} ${F - 26} ${x1} ${F - 14} Z" ${hc('#6a9a58', '#18243a')}/>
    ${Array.from({ length: Math.floor((x1 - x0) / 16) }, (_, i) => { const x = x0 + 9 + i * 16, h = 14 + ((i * 7 + k) % 3) * 4, c = ['#e85a6a', '#f2c94c', '#f08a3c', '#ffffff', '#c86ad0'][(i + k) % 5];
      return `<path d="M${x} ${F - 16} V${F - 16 - h}" ${hs('#4f7a40', '#14202e')} stroke-width="1.4"/><path d="M${x - 4} ${F - 18 - h} q0 -7 4 -7 q4 0 4 7 q-4 3 -8 0 Z" ${hc(c, '#3a3458')}/>`; }).join('')}`;
  return `<svg class="land tall kominkan-land" viewBox="0 -400 1200 770" preserveAspectRatio="xMidYMax slice">${GLOW_DEFS}
      <path class="far" d="M0 120 C140 96 260 108 380 116 S600 92 760 104 S980 122 1100 100 S1180 98 1200 104 V370 H0 Z"/>
      ${farHouse(30, 150, 70, 46, '#7a5a8a')}${farHouse(1010, 152, 64, 40, '#5f7aa0')}${farHouse(1090, 156, 90, 52, '#8a6a4a')}
      <g transform="translate(60 ${F})">${[[-34, -118, 34], [0, -138, 42], [34, -116, 32], [-12, -96, 30], [20, -92, 28]].map(([x, y, r]) => `<circle cx="${x + 2}" cy="${y + 3}" r="${r}" ${hc('#4f7a48', '#101a30')}/>`).join('')}
        <path d="M-6 0 L-4 -84 H4 L6 0 Z" ${hc('#6e4f3a', '#1a1426')}/>${[[-34, -118, 34], [0, -138, 42], [34, -116, 32], [-12, -96, 30], [20, -92, 28]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r * 0.92}" ${hc('#6c9a5c', '#152038')}/><circle cx="${x - r * 0.25}" cy="${y - r * 0.3}" r="${r * 0.45}" fill="#fff" fill-opacity=".1"/>`).join('')}</g>
      <rect x="330" y="-6" width="560" height="${F + 6}" ${hc('#efe9dc', '#262848')}/><rect x="324" y="-14" width="572" height="10" ${hc('#d8cfbe', '#1f2140')}/><path d="M326 -14 h568" stroke="#fff" stroke-opacity=".4" stroke-width="1.4"/>
      <rect x="330" y="112" width="560" height="8" ${hc('#d8cfbe', '#1f2140')}/><rect x="862" y="-6" width="28" height="${F + 6}" fill="#2b1c12" fill-opacity=".06"/>
      ${[350, 432, 514, 696, 778].map((x) => win(x, 26, 64, 54, false)).join('')}
      <g transform="translate(610 40)"><circle r="24" ${hc('#fbf8f0', '#d8dcff')}/><circle r="24" fill="none" ${hs('#4a4a55', '#2a2c50')} stroke-width="3"/>${Array.from({ length: 12 }, (_, i) => { const a = i * Math.PI / 6; return `<path d="M${f(19 * Math.sin(a))} ${f(-19 * Math.cos(a))} L${f(21.5 * Math.sin(a))} ${f(-21.5 * Math.cos(a))}" stroke="#4a4a55" stroke-width="${i % 3 ? 1 : 2}"/>`; }).join('')}</g>
      ${clockHands(610, 40, 20, '#3b2a1c')}
      <path d="M362 86 V106 M494 86 V106" ${hs('#8d9097', '#3a3c58')} stroke-width="1.2"/><g class="fx-sway" style="animation-duration:5s"><rect x="364" y="86" width="128" height="22" ${hc('#fffdf6', '#d8d4f0')}/><text x="428" y="102" text-anchor="middle" font-size="13" font-weight="700" ${hc('#c8453a', '#7a4a6a')} font-family="system-ui, sans-serif">にほんご きょうしつ</text></g>
      ${[352, 420, 488].map((x, k) => classWin(x, k)).join('')}${[680, 748, 816].map((x) => win(x, 150, 56, 56, false) + `<path d="${Array.from({ length: 7 }, (_, k) => `M${x} ${156 + k * 7} h56`).join(' ')}" ${hs('#cfd6dc', '#2a2e58')} stroke-width="1.6"/>`).join('')}
      <circle class="glow" cx="440" cy="180" r="90" fill="url(#glw)"/>
      <rect x="520" y="122" width="180" height="22" ${hc('#4a4038', '#1c1a2c')}/><text x="610" y="138" text-anchor="middle" font-size="13" font-weight="700" ${hc('#e8d39a', '#e8d39a')} ${SERIF}>みなと市立 公民館</text>
      <rect x="560" y="150" width="100" height="${F - 150}" ${hc('#d4ccbc', '#1a1c34')}/><path d="M548 150 h124 v-8 h-124 Z" ${hc('#c4bcab', '#22243e')}/><path d="M552 150 V${F} M668 150 V${F}" ${hs('#b8b0a0', '#1a1c34')} stroke-width="5"/>
      <g data-fx="kdoor"><rect x="574" y="164" width="72" height="${F - 164}" ${hc('#5a6470', '#141628')}/><rect x="578" y="168" width="31" height="${F - 168}" ${hc('#cfe6ec', open ? '#ffe2a0' : '#1c2040')}/><rect x="611" y="168" width="31" height="${F - 168}" ${hc('#cfe6ec', open ? '#ffe2a0' : '#1c2040')}/>
        <path d="M604 190 v26 M615 190 v26" stroke="#8d9097" stroke-width="2.4" stroke-linecap="round"/><path d="M582 ${F - 8} L600 172" stroke="#fff" stroke-opacity=".3" stroke-width="2.4"/><text x="610" y="182" text-anchor="middle" font-size="6.4" ${hc('#3b4a5a', '#c9c4e8')} font-family="system-ui, sans-serif">じどうドア</text>
        ${open ? '' : `<rect x="590" y="194" width="40" height="18" rx="2" fill="#fffdf6"/><text x="610" y="207" text-anchor="middle" font-size="10" font-weight="700" fill="#c8453a" font-family="system-ui, sans-serif">閉館</text>`}</g>
      ${open ? '<ellipse class="glow" cx="610" cy="200" rx="60" ry="50" fill="url(#glw)"/>' : ''}
      <g data-fx="nobori">${nobori(512, '日本語教室', ['#2f6fa8', '#1c2a4a'], 0)}${nobori(690, 'だれでもどうぞ', ['#d0574b', '#4a2030'], 1.3)}</g>
      <g data-fx="flowers">${bed(342, 506, 0)}${bed(714, 878, 2)}</g>
      ${board}${cat}
      <g data-fx="kbikes"><path d="M904 ${F} V${F - 64} M1000 ${F} V${F - 64}" ${hs('#8d9097', '#3a3c58')} stroke-width="3"/><path d="M896 ${F - 64} L1008 ${F - 72} V${F - 64} L896 ${F - 56} Z" ${hc('#8fb4c8', '#22304e')}/>
        ${[914, 944].map((x, i) => cityBike(x, F - 10, 10, [['#d0574b', '#4a2030'], ['#3f9a8c', '#1c3a3a']][i])).join('')}</g>
      <rect class="pave" x="-20" y="${F}" width="1240" height="90"/>${Array.from({ length: 26 }, (_, j) => `<path class="seam" d="M${j * 48 - 20} ${F + 22 + (j % 3) * 22} h30"/>`).join('')}
      ${busRoad()}
    </svg>
    ${yHeroHtml()}
    ${busPoleHtml('kominkan')}
    <button type="button" class="thing way-btn" data-act="go-place" data-to="kyoshitsu" aria-label="進日本語教室" style="margin-left:-22px;bottom:150px"><span class="tag">${ySign('door', '日本語教室')}</span></button>
    <div class="ysel"></div>`;
}

// ---- 日本語教室 at 45°, as the 食堂: the blackboard along the right wall (the hiragana learned in chalk, the duty roster's joke),
// the teacher's desk with the radio cassette player, two long tables with their chairs on the far side (whoever sits there
// faces us), the tatami corner with かるた laid out, windows and a picture-book shelf on the left wall, the door with its slipper
// rack, the clock, the class's motto and a string of paper cranes ----
// (its tables, chairs and tatami: KYO_TABLES, KYO_CHAIRS, KYO_TATAMI in 71b_places.js, beside the 食堂's)
function kanaSeenSet() { return new Set(Object.keys(state.srs || {}).filter((k) => k.startsWith('a:')).map((k) => k.slice(2))); }
function kyoshitsuHtml() {
  isoProps = [];
  const seen = kanaSeenSet(), f = (n) => n.toFixed(2);
  // the chalk: the hiragana chart in columns from the right (あ行 first), each kana learned written in, the rest a faint dot;
  // ひらがな over it, the date at its right, and the duty roster at the bottom: チン crossed out, チェン after it
  const chart = KANA_ROWS.map((row, c) => row.map((ch, r) => { if (!ch) return ''; const u = 14.55 - c * 0.86, y = -5.05 + r * 0.48;
    return seen.has(ch) ? `<text x="${f(u)}" y="${f(y)}" text-anchor="middle" font-size=".38" fill="#f4f1e6" fill-opacity=".92" font-family="system-ui, sans-serif">${ch}</text>` : `<circle cx="${f(u)}" cy="${f(y - 0.12)}" r=".04" fill="#f4f1e6" fill-opacity=".3"/>`; }).join('')).join('');
  const d = new Date();
  const chalk = `<rect x="3.66" y="-5.94" width="11.68" height="3.28" fill="#2e5343"/><path d="M4 -5.6 q3 .3 6 -.1 M6 -3.1 q4 .2 8 -.1 M4.4 -4.2 q2 .2 3 0" stroke="#f4f1e6" stroke-opacity=".07" stroke-width=".18" fill="none"/>
    <text x="3.95" y="-5.48" font-size=".32" font-weight="700" fill="#f4f1e6" fill-opacity=".9" font-family="system-ui, sans-serif">ひらがな</text><text x="15.1" y="-5.48" text-anchor="end" font-size=".26" fill="#f6e08a" fill-opacity=".85" font-family="system-ui, sans-serif">${d.getMonth() + 1}/${d.getDate()}</text>
    ${chart}<text x="15.05" y="-2.78" text-anchor="end" font-size=".22" fill="#f4f1e6" fill-opacity=".8" font-family="system-ui, sans-serif">にっちょく：チン　チェン</text><path d="M13.55 -2.86 h.5" stroke="#f08a8a" stroke-width=".05"/>
    <path d="M4.1 -3.05 q.3 -.4 .6 0 q.3 .4 .6 0" stroke="#f4f1e6" stroke-opacity=".5" stroke-width=".04" fill="none"/><circle cx="4.2" cy="-3.35" r=".12" fill="none" stroke="#f4f1e6" stroke-opacity=".5" stroke-width=".035"/>`;
  // a table: grey steel legs, a pale top with its edge; notebooks, a pencil case, 陳's cup noodles, マリア's maracas
  const table = ([u0, u1, v0, v1], k) => [[u0 + 0.25, v0 + 0.2], [u1 - 0.35, v0 + 0.2], [u0 + 0.25, v1 - 0.3], [u1 - 0.35, v1 - 0.3]].map(([a, b]) => iBox('#8d9097', a, b, 0, a + 0.1, b + 0.1, 1.33)).join('')
    + iBox('#e9e6dd', u0, v0, 1.33, u1, v1, 1.45, { top: '#f4f2ec', fv: '#d4d0c6', fu: '#c4c0b6' })
    + iOnF(1.45, `<rect x="${f(u0 + 0.6)}" y="${f(v0 + 0.35)}" width=".9" height=".65" fill="#5f88b2"/><rect x="${f(u0 + 0.62)}" y="${f(v0 + 0.38)}" width=".86" height=".59" fill="#fbf8f0"/><path d="M${f(u0 + 1.05)} ${f(v0 + 0.38)} v.59" stroke="#c4bdb0" stroke-width=".03"/>
      <rect x="${f(u0 + 2.4)}" y="${f(v0 + 0.5)}" width="1" height=".7" fill="${k ? '#e58fa8' : '#e6a23c'}" transform="rotate(-8 ${f(u0 + 2.9)} ${f(v0 + 0.85)})"/><rect x="${f(u1 - 2)}" y="${f(v0 + 0.3)}" width=".9" height=".3" rx=".1" fill="${k ? '#7fae5a' : '#3f4660'}"/>`)
    + (k === 0 ? (() => { const [x, y] = isoPt(u1 - 0.8, v0 + 0.9, 1.45); return iCyl(u1 - 0.8, v0 + 0.9, 0.24, 1.45, 1.85, '#fbf8f0', '#d9b04a') + `<path d="M${f(x - 6)} ${f(y - 8)} h12" stroke="#d0453c" stroke-width="2"/><path d="M${f(x)} ${f(y - 15)} q3 -5 0 -9" stroke="#fff" stroke-opacity=".6" stroke-width="1.2" fill="none"/>`; })()
      : (() => { const [x, y] = isoPt(u1 - 0.9, v0 + 0.8, 1.45); return `<g data-fx="maracas"><path d="M${f(x - 4)} ${f(y)} l-5 -9 M${f(x + 6)} ${f(y + 1)} l2 -10" stroke="#8a5a34" stroke-width="1.6" stroke-linecap="round"/><ellipse cx="${f(x - 10)}" cy="${f(y - 12)}" rx="4.2" ry="5" fill="#e6c23a"/><ellipse cx="${f(x + 8.6)}" cy="${f(y - 13)}" rx="4.2" ry="5" fill="#3f9a8c"/><path d="M${f(x - 13)} ${f(y - 13)} q3 -2 6 0 M${f(x + 5.6)} ${f(y - 14)} q3 -2 6 0" stroke="#fff" stroke-opacity=".6" stroke-width=".8" fill="none"/></g>`; })());
  // かるた on the tatami: the cards laid out, each a kana learned (or the first few when none are yet)
  const cards = (() => { const have = KANA_ROWS.flat().filter((c) => c && seen.has(c)), pool = (have.length >= 6 ? have : ['あ', 'い', 'う', 'え', 'お', 'か']).slice(0, 12);
    return pool.slice(0, 10).map((ch, i) => { const u = 16.6 + (i % 5) * 1.0 + (i > 4 ? 0.4 : 0), v = 12.1 + Math.floor(i / 5) * 1.25, a = ((i * 37) % 21) - 10;
      return `<g transform="rotate(${a} ${f(u + 0.3)} ${f(v + 0.4)})"><rect x="${f(u)}" y="${f(v)}" width=".62" height=".82" fill="#2b1c12" fill-opacity=".14" transform="translate(.05 .06)"/><rect x="${f(u)}" y="${f(v)}" width=".62" height=".82" fill="#fbf8f0" stroke="#d0453c" stroke-width=".03"/><text x="${f(u + 0.31)}" y="${f(v + 0.56)}" text-anchor="middle" font-size=".42" fill="#2b2b33" font-family="system-ui, sans-serif">${ch}</text></g>`; }).join(''); })();
  // paper cranes on strings from the top of the right wall
  const cranes = [19.7, 20.2, 20.7].map((u, j) => `<path d="M${u} -7.7 V${-4.6 - j * 0.25}" stroke="#c4bdb0" stroke-width=".02"/>` + Array.from({ length: 8 }, (_, i) => { const y = -7.4 + i * 0.36, c = ['#d0574b', '#f2c94c', '#3f9a8c', '#e58fa8', '#5f88b2', '#f08a3c', '#7fae5a', '#c86ad0'][(i + j * 3) % 8];
    return `<path d="M${f(u - 0.14)} ${f(y)} l.14 .1 l.14 -.1 l-.14 .2 Z" fill="${c}"/>`; }).join('')).join('');
  const land = `<svg class="land indoor-land iso" viewBox="0 -530 1200 900" preserveAspectRatio="xMidYMax slice" style="height:900px">${GLOW_DEFS}${ISO_DEFS}
    ${isoShell({ floor: '#d9c09a', seam: '#b89e78', wallL: '#f3eee2', wallR: '#f8f4ea', wainL: '#c7d3c0', wainR: '#cfdac8', batten: '#aab8a2', trim: '#8e9c86', edgeU: '#a88a62', edgeV: '#bfa07a', capU: '#e4dccb', capV: '#efe8d8', top: '#d9cfba' })}
    ${wallR('#d8d0bc', 0.7, 2.9, 3.3, 5.7, 0.04)}${iOnV(0.04, `<rect x=".8" y="-5.6" width="2" height="2.2" fill="#fffdf6"/><rect x=".8" y="-5.6" width="2" height=".42" fill="#3f9a8c"/><text x="1.8" y="-5.3" text-anchor="middle" font-size=".22" font-weight="700" fill="#fff" font-family="system-ui, sans-serif">日本語教室</text>
      <text x="1.8" y="-4.8" text-anchor="middle" font-size=".2" fill="#3b2a1c" font-family="system-ui, sans-serif">まいにち</text><text x="1.8" y="-4.45" text-anchor="middle" font-size=".24" font-weight="700" fill="#3b2a1c" font-family="system-ui, sans-serif">19:00〜21:00</text><text x="1.8" y="-3.9" text-anchor="middle" font-size=".2" fill="#3b2a1c" font-family="system-ui, sans-serif">せんせい：リン</text>`)}
    ${wallR('#7a5a3a', 3.5, 15.5, 2.5, 6.1, 0.14, { top: '#8a6a48' })}<g data-fx="board">${iOnV(0.14, chalk)}</g>
    ${wallR('#8a6a48', 3.5, 15.5, 2.36, 2.5, 0.46, { top: '#a0805c' })}${[[5.2, '#f4f1e6'], [5.7, '#f2c94c'], [6.1, '#e58fa8'], [12.6, '#f4f1e6']].map(([u, c]) => iBox(c, u, 0.2, 2.5, u + 0.36, 0.3, 2.56)).join('')}${iBox('#3a3a44', 13.6, 0.12, 2.5, 14.4, 0.38, 2.64, { top: '#e8e2d4' })}
    ${wallR('#e4dccb', 16.2, 18.9, 3.4, 5.5, 0.03)}${iOnV(0.03, '<rect x="16.3" y="-5.4" width="2.5" height="1.9" fill="#fffdf6"/><text x="17.55" y="-5.05" text-anchor="middle" font-size=".2" font-weight="700" fill="#c8453a" font-family="system-ui, sans-serif">クラスの もくひょう</text><text x="17.55" y="-4.45" text-anchor="middle" font-size=".3" font-weight="700" fill="#3b2a1c" font-family="system-ui, sans-serif">まいにち</text><text x="17.55" y="-3.95" text-anchor="middle" font-size=".3" font-weight="700" fill="#3b2a1c" font-family="system-ui, sans-serif">すこしずつ</text>')}
    ${(() => { const [x, y] = isoPt(17.2, 0.06, 6.6); return `<g data-fx="kclock"><ellipse cx="${x.toFixed(1)}" cy="${(y + 0.6).toFixed(1)}" rx="17" ry="19" fill="#2b1c12" fill-opacity=".12"/><circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="16" fill="#fbf8f0" stroke="#4a4a55" stroke-width="2.4"/>${Array.from({ length: 12 }, (_, i) => { const a = i * Math.PI / 6; return `<path d="M${(x + 12.4 * Math.sin(a)).toFixed(1)} ${(y - 12.4 * Math.cos(a)).toFixed(1)} L${(x + 14 * Math.sin(a)).toFixed(1)} ${(y - 14 * Math.cos(a)).toFixed(1)}" stroke="#4a4a55" stroke-width="${i % 3 ? 0.8 : 1.6}"/>`; }).join('')}${clockHands(+x.toFixed(1), +y.toFixed(1), 12)}</g>`; })()}
    <g data-fx="cranes" class="fx-sway" style="animation-duration:4.4s">${iOnV(0.3, cranes)}</g>
    ${iOnL(`${[[1.4, 5.0], [6.2, 9.8]].map(([a, b]) => `<rect x="${-b}" y="-6.1" width="${b - a}" height="3.4" class="hc" style="--c:#bfe0f0;--n:#1c2448"/><path d="M${-b} -3.6 q${(b - a) * 0.3} -.5 ${(b - a) * 0.55} -.2 q${(b - a) * 0.25} .2 ${(b - a) * 0.45} -.1 V-2.7 H${-b} Z" class="hc" style="--c:#9cc08a;--n:#16203a"/>
      <circle cx="${-(a + b) / 2 + 0.6}" cy="-5.4" r=".05" fill="#fff" class="night-only"/><circle cx="${-(a + b) / 2 - 0.8}" cy="-5.1" r=".04" fill="#fff" class="night-only"/>
      <path d="M${-b} -6.1 h${b - a} v3.4 h${-(b - a)} Z M${-(a + b) / 2} -6.1 v3.4 M${-b} -4.4 h${b - a}" fill="none" stroke="#e8e2d4" stroke-width=".12"/>
      <path d="M${-b - 0.1} -6.25 q.5 1.6 .1 3.6 h.55 q-.2 -2 .2 -3.6 Z M${-a + 0.1} -6.25 q-.5 1.6 -.1 3.6 h-.55 q.2 -2 -.2 -3.6 Z" fill="#f2e6c8"/>`).join('')}`, 0.02)}
    ${wallL('#a87a4a', 1.6, 5.8, 0, 1.7, 0.9, { top: '#c8955f' })}${iOnL(`${Array.from({ length: 14 }, (_, i) => `<rect x="${f(-5.65 + i * 0.29)}" y="${f(-1.55 + (i % 3) * 0.06)}" width=".24" height="${f(1.3 - (i % 3) * 0.06)}" fill="${['#d0574b', '#3f7ac8', '#f2c94c', '#3f9a8c', '#e58fa8', '#8a6ad0', '#f08a3c'][i % 7]}"/>`).join('')}<path d="M-5.8 -.08 h4.2" stroke="#8a6440" stroke-width=".1"/>`, 0.9)}
    ${(() => { const [x, y] = isoPt(0.45, 4.9, 1.7); return `<g data-fx="globe"><path d="M${x.toFixed(1)} ${y.toFixed(1)} v-6" stroke="#8a6440" stroke-width="2"/><ellipse cx="${x.toFixed(1)}" cy="${(y - 1).toFixed(1)}" rx="7" ry="2.4" fill="#8a6440"/><circle cx="${x.toFixed(1)}" cy="${(y - 16).toFixed(1)}" r="10" fill="#5f9ad0"/><path d="M${(x - 6).toFixed(1)} ${(y - 20).toFixed(1)} q4 -2 6 2 q2 4 -2 6 Z M${(x + 2).toFixed(1)} ${(y - 12).toFixed(1)} q4 -2 5 1 l-3 3 Z" fill="#7fae5a"/><path d="M${(x - 11).toFixed(1)} ${(y - 16).toFixed(1)} a11 11 0 0 1 22 0" fill="none" stroke="#c9a25a" stroke-width="1.2"/></g>`; })()}
    ${wallL('#e4dccb', 10.4, 11.8, 3.6, 5.6, 0.03)}${iOnL('<rect x="-11.75" y="-5.5" width="1.3" height="1.8" fill="#fffdf6"/><text x="-11.1" y="-5.2" text-anchor="middle" font-size=".16" fill="#c8453a" font-family="system-ui, sans-serif">きょうの ことば</text><text x="-11.1" y="-4.5" text-anchor="middle" font-size=".26" font-weight="700" fill="#3b2a1c" font-family="system-ui, sans-serif">こんにちは</text><path d="M-11.6 -4.1 h1" stroke="#e6a23c" stroke-width=".05"/>', 0.03)}
    ${iOnL(`<rect x="-14.8" y="-4.62" width="2.8" height="4.62" fill="#8a6a48"/>${[0, 1].map((k) => `<rect x="${(-14.7 + k * 1.36).toFixed(2)}" y="-4.5" width="1.3" height="4.45" fill="#a07a52"/><rect x="${(-14.5 + k * 1.36).toFixed(2)}" y="-4.2" width=".9" height="1.6" fill="#d6e8ee" opacity=".85"/>`).join('')}<path d="M-13.5 -2.3 v.5" stroke="#d9b04a" stroke-width=".08" stroke-linecap="round"/>`, 0.03)}
    ${frameL(12, 14.8, 4.62, '#6e4a30')}
    ${wallL('#a87a4a', 10.3, 11.7, 0, 1.3, 0.7, { top: '#c8955f' })}${iOnL(`<path d="M-11.7 -.65 h1.4" stroke="#8a6440" stroke-width=".06"/>${[[-11.5, '#5f88b2'], [-11.15, '#e58fa8'], [-10.8, '#3f9a8c']].map(([x, c]) => `<rect x="${x}" y="-1.18" width=".3" height=".42" rx=".12" fill="${c}"/><rect x="${x}" y="-.55" width=".3" height=".42" rx=".12" fill="${c}"/>`).join('')}`, 0.7)}
  </svg>`;
  // the tatami's platform as a box (u0..u2 along u, v1..v3): its rush top, its black-edged mats, the かるた and two cushions
  const [t0, t2, t1, t3] = KYO_TATAMI;   // u t0..t2, v t1..t3
  const tatami = iBox('#8a6a48', t0, t1, 0, t2, t3, 0.5, { top: '#c9c98e', fv: '#7a5a3a', fu: '#6a4a30' })
    + iOnF(0.5, `<path d="${Array.from({ length: 22 }, (_, i) => `M${f(t0 + 0.15)} ${f(t1 + 0.12 + i * 0.26)} H${f(t2 - 0.15)}`).join(' ')}" stroke="#b4b47a" stroke-width=".03"/><rect x="${t0}" y="${t1}" width="${t2 - t0}" height="${t3 - t1}" fill="none" stroke="#2b2b33" stroke-width=".12"/><path d="M${f((t0 + t2) / 2)} ${t1} V${t3}" stroke="#2b2b33" stroke-width=".12"/>
      <g data-fx="karuta">${cards}</g><rect x="${f(t0 + 0.6)}" y="${f(t1 + 0.8)}" width="1.2" height="1.2" rx=".2" fill="#8a4a7a"/><rect x="${f(t2 - 1.6)}" y="${f(t3 - 1.6)}" width="1.2" height="1.2" rx=".2" fill="#8a4a7a"/>`);
  const radio = (() => { const u0 = 9.3, u1 = 10.6, v0 = 1.6, v1 = 2.2, h0 = 2.2, h1 = 2.78;
    return `<g data-fx="radio"><g class="rbody">${iBox('#c9cdd2', u0, v0, h0, u1, v1, h1, { top: '#dfe2e6', fv: '#b8bcc2', fu: '#a4a8ae' })}${iOnV(v1, `<circle cx="${u0 + 0.28}" cy="${-(h0 + 0.29)}" r=".2" fill="#3a3a44"/><circle cx="${u1 - 0.28}" cy="${-(h0 + 0.29)}" r=".2" fill="#3a3a44"/><circle cx="${u0 + 0.28}" cy="${-(h0 + 0.29)}" r=".08" fill="#6a6a74"/><circle cx="${u1 - 0.28}" cy="${-(h0 + 0.29)}" r=".08" fill="#6a6a74"/><rect x="${u0 + 0.5}" y="${-(h0 + 0.42)}" width=".3" height=".24" fill="#2b2b33"/><rect x="${u0 + 0.54}" y="${-(h0 + 0.38)}" width=".22" height=".16" fill="#c9a25a"/>`)}
      ${iOnF(h1, `<path d="M${u0 + 0.3} ${v0 + 0.3} q.35 -.5 .7 0" fill="none" stroke="#6a6a74" stroke-width=".06"/>`)}</g><g class="rnotes">${[0, 1, 2].map((k) => { const [x, y] = isoPt(u0 + 0.3 + k * 0.4, v0, h1 + 0.4); return `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" font-size="11" fill="#e8592e" class="rnote" style="animation-delay:${k * 0.3}s">♪</text>`; }).join('')}</g></g>`; })();
  const desk = iBox('#a87a4a', 7.6, 1.2, 0, 10.8, 2.6, 2.2, { top: '#c8955f', fv: '#9a6c3e', fu: '#8a5e34' }) + iOnV(2.6, '<rect x="7.9" y="-1.95" width="2.6" height="1.5" fill="none" stroke="#7a5230" stroke-width=".05"/>')
    + iBox('#5f88b2', 7.9, 1.5, 2.2, 8.9, 2.2, 2.32) + iBox('#e6a23c', 7.95, 1.55, 2.32, 8.8, 2.15, 2.42) + iCyl(8.9 + 0.3, 1.9, 0.14, 2.2, 2.6, '#cfe6ec', '#e8f4f8')
    + (() => { const [x, y] = isoPt(9.2, 1.9, 2.6); return `<path d="M${x.toFixed(1)} ${y.toFixed(1)} q-3 -8 -6 -10 M${x.toFixed(1)} ${y.toFixed(1)} q2 -9 5 -11" stroke="#4f7a40" stroke-width="1.1" fill="none"/><circle cx="${(x - 6).toFixed(1)}" cy="${(y - 11).toFixed(1)}" r="2.6" fill="#f2c94c"/><circle cx="${(x + 5).toFixed(1)}" cy="${(y - 12).toFixed(1)}" r="2.6" fill="#e85a6a"/>`; })() + radio;
  const plant = iCyl(1.1, 0.9, 0.4, 0, 0.9, '#b4664a', '#8a4a34') + (() => { const [x, y] = isoPt(1.1, 0.9, 0.9); return [[-12, -26, 12], [8, -30, 13], [-2, -44, 12], [12, -18, 9], [-14, -12, 8]].map(([dx, dy, r]) => `<ellipse cx="${(x + dx).toFixed(1)}" cy="${(y + dy).toFixed(1)}" rx="${r}" ry="${r * 0.62}" fill="#5a8a4a" transform="rotate(${dx * 2} ${(x + dx).toFixed(1)} ${(y + dy).toFixed(1)})"/>`).join('') + `<path d="M${x.toFixed(1)} ${y.toFixed(1)} V${(y - 40).toFixed(1)}" stroke="#4a6a38" stroke-width="1.4"/>`; })();
  const props = isoProp([7.6, 10.8, 1.2, 2.6], desk, 2.8)
    + isoProp([0.6, 1.6, 0.4, 1.4], plant, 2)
    + KYO_CHAIRS.map((u) => isoProp([u - 0.42, u + 0.42, 5.43, 6.27], iChair(u, 5.85, true, '#6f8aa4'), 2.1)).join('')
    + KYO_TABLES.map((t, k) => isoProp(t, table(t, k), 1.45)).join('')
    + isoProp([t0, t2, t1, t3], tatami, 0.5);
  return `${land}${isoLay(props)}${indoorRest('kyoshitsu', 'kominkan')}`;
}

// ---- what there is to do in the classroom (CLASS): each its own card over the scene, closed with ✕ or a tap outside ----
const CLASS = (() => {
  const HOURS = ['じゅうにじ', 'いちじ', 'にじ', 'さんじ', 'よじ', 'ごじ', 'ろくじ', 'しちじ', 'はちじ', 'くじ', 'じゅうじ', 'じゅういちじ'];
  const still = () => window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  let el = null, timers = [], token = 0;
  const later = (fn, ms) => { const t = token; timers.push(setTimeout(() => { if (t === token && el) fn(); }, ms)); };
  const radio = (on) => { const r = document.querySelector('#view .land [data-fx="radio"]'); if (r) r.classList.toggle('playing', on); };   // the scene's radio plays while the class sings
  function close() { token++; timers.forEach(clearTimeout); timers = []; stopSpeaking(); radio(false); if (el) { el.remove(); el = null; } }
  function open(cls, label, html, onClick) {
    close();
    el = document.createElement('div'); el.className = 'cls ' + cls; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', label);
    el.innerHTML = `<div class="cls-card">${html}</div>`;
    el.addEventListener('pointerdown', (e) => e.stopPropagation());
    el.addEventListener('click', (e) => { e.stopPropagation(); primeTtsPlayer(); if (e.target === el || e.target.closest('[data-cls="x"]')) { close(); return; } onClick(e); });
    document.body.appendChild(el);
  }
  const xBtn = '<button type="button" class="cls-x" data-cls="x" aria-label="關閉">✕</button>';
  // 言靈 from the classroom: at most 10 a day all told (koto.found 'play-<day>': the day's count, the larger kept when devices meet)
  const PLAY_CAP = 10;
  function playKoto(n, words) {
    const k = state.koto, key = 'play-' + todayStr(), had = Number(k.found[key]) || 0, give = Math.max(0, Math.min(n, PLAY_CAP - had));
    if (give) { k.found[key] = had + give; saveState(); kotoPop(give, words); } else if (n) kotoPop(0, '今天在教室拿的言靈滿了');
    return give;
  }
  // once a day each (this device): the board looked at, a song sung
  function firstToday(what) {
    try { const m = JSON.parse(localStorage.getItem('nq_class') || 'null') || {}, t = todayStr(); if (m[what] === t) return false; m[what] = t; localStorage.setItem('nq_class', JSON.stringify(m)); return true; } catch (e) { return false; }
  }
  // the kana seen, as the 五十音 table's rows: [row of hiragana, script] → chars seen
  const seen = () => kanaSeenSet();
  const char = (h, script) => (script === 'kata' ? KATA[h] : h);

  // the time, said: いま、ごご さんじ ごろ です。 — and in Chinese
  function clockSay() {
    const h = Math.floor(TOWNEV.now()), half = h < 12 ? 'ごぜん' : 'ごご', n = h % 12;
    return [`いま、${half} ${HOURS[n]} ごろ です。`, `現在大約${h < 12 ? '上午' : '下午'} ${n || 12} 點（${half} ${HOURS[n]}）。`];
  }

  // ---- the blackboard: the 五十音 table in chalk, the kana seen written in (a tap says it), the rest a faint ？ ----
  function boardHtml(script) {
    const s = seen(), n = KANA_ROWS.flat().filter((h) => h && s.has(char(h, script))).length;
    const cols = KANA_ROWS.map((row) => `<div class="cb-col">${row.map((h) => { if (!h) return '<span class="cb-k empty"></span>'; const c = char(h, script);
      return s.has(c) ? `<button type="button" class="cb-k" data-say="${c}" lang="ja">${c}<small>${KANA_ROMAJI[h]}</small></button>` : '<span class="cb-k off">？</span>'; }).join('')}</div>`).join('');
    return `${xBtn}<div class="cb-head"><b>${script === 'kata' ? 'カタカナ' : 'ひらがな'}</b><span>學過 ${n}／46</span></div>
      <div class="cb-tabs"><button type="button" class="cb-tab${script === 'hira' ? ' on' : ''}" data-script="hira">平假名</button><button type="button" class="cb-tab${script === 'kata' ? ' on' : ''}" data-script="kata">片假名</button></div>
      <div class="cb-board">${cols}</div><p class="cb-note">${n ? '點一個字，聽它怎麼念。' : '學會一個假名，它就會寫上來。'}</p>`;
  }
  function board() {
    let script = 'hira';
    open('cls-board', '黑板', boardHtml(script), (e) => {
      const k = e.target.closest('[data-say]'), t = e.target.closest('[data-script]');
      if (k) { speak(k.dataset.say); k.classList.remove('pop'); void k.offsetWidth; k.classList.add('pop'); }
      else if (t && t.dataset.script !== script) { script = t.dataset.script; el.querySelector('.cls-card').innerHTML = boardHtml(script); }
    });
    if (firstToday('board')) playKoto(1, '看了黑板');
  }

  // ---- かるた: eight cards of the kana seen on the tatami; one is read out (its romaji shows after a moment), and the hero, 陳
  // and マリア go for it. 陳 is quick and often slaps the wrong one (おてつき: out of that round); マリア is slow and sure. A
  // wrong tap is the hero's おてつき. Most cards wins: +3 言靈 ----
  const KR_END = { win: ['chen', 'まけた…！ かるた おう が…', '輸了……！かるた王居然……'], tie: ['chen', 'ひきわけ！ つぎは まけない！', '平手！下次不會輸！'],
    chen: ['chen', 'かるた おう！ イェー！', 'かるた王！耶！'], maria: ['maria', 'やった！ マリアの かち！', '耶！瑪莉亞贏了！'] };
  const RIVALS = { chen: { name: '陳', fast: [900, 1700], miss: 0.3, slap: 'はい！' }, maria: { name: 'マリア', fast: [1700, 2700], miss: 0.08, slap: 'これ！' } };
  let K = null;
  function karuta() {
    const pool = [...seen()].filter((c) => KANA_ROMAJI[c] || KANA_ROMAJI[Object.keys(KATA).find((h) => KATA[h] === c)]);
    if (pool.length < 5) { openNote('かるた', '先學幾個假名再來玩吧！（至少 5 個）', 'chen', 'かるた、まだ はやい！'); return; }
    const slow = pool.length < 12 ? 1.5 : 1;   // a beginner's first cards: the others take their time
    const cards = shuffle(pool).slice(0, 8);
    K = { cards: cards.map((c) => ({ c, by: '' })), left: shuffle(cards.slice()), cur: '', score: { hero: 0, chen: 0, maria: 0 }, out: new Set(), slow, round: 0, busy: false };
    open('cls-karuta', 'かるた', karutaHtml(), (e) => {
      if (e.target.closest('[data-cls="again"]')) { karuta(); return; }
      const c = e.target.closest('[data-card]'); if (c) take('hero', c.dataset.card);
    });
    later(next, 900);
  }
  const roma = (c) => KANA_ROMAJI[c] || KANA_ROMAJI[Object.keys(KATA).find((h) => KATA[h] === c)] || '';
  function karutaHtml(end) {
    const s = K.score, who = (id) => `<div class="kr-who${K.out.has(id) ? ' out' : ''}" data-who="${id}"><span class="kr-face">${TOWNEV.face(id)}</span><b>${id === 'hero' ? '你' : RIVALS[id].name}</b><i>${s[id]}</i><em class="kr-say"></em></div>`;
    return `${xBtn}<div class="kr-top"><div class="kr-reader"><span class="kr-radio">📻</span><span class="kr-call">${end ? '' : K.cur ? '？' : '準備……'}</span></div></div>
      <div class="kr-mat">${K.cards.map((k) => `<button type="button" class="kr-card${k.by ? ' got by-' + k.by : ''}" data-card="${k.c}" ${k.by ? 'disabled' : ''} lang="ja">${k.c}</button>`).join('')}</div>
      <div class="kr-people">${who('hero')}${who('chen')}${who('maria')}</div>
      ${end ? `<div class="kr-end">${end}<div class="kr-btns"><button type="button" class="btn btn-primary" data-cls="again">再玩一次</button><button type="button" class="btn" data-cls="x">不玩了</button></div></div>` : '<p class="kr-note">聽念出來的假名，搶那張牌！</p>'}`;
  }
  const say = (id, words) => { const w = el && el.querySelector(`.kr-who[data-who="${id}"] .kr-say`); if (!w) return; w.textContent = words; w.classList.remove('on'); void w.offsetWidth; w.classList.add('on'); };
  function next() {
    if (!K.left.length) { finish(); return; }
    K.cur = K.left.shift(); K.out = new Set(); K.busy = false; K.round++;
    el.querySelectorAll('.kr-who').forEach((w) => w.classList.remove('out'));
    const call = el.querySelector('.kr-call'); call.textContent = '♪'; call.classList.remove('hint');
    speak(K.cur); const round = K.round;
    later(() => { if (K.round === round && !K.busy) { call.textContent = `${roma(K.cur)}`; call.classList.add('hint'); } }, 2600);   // the romaji, should the sound not be enough
    Object.entries(RIVALS).forEach(([id, r]) => later(() => { if (K.round !== round || K.busy || K.out.has(id)) return;
      const wrong = Math.random() < r.miss && K.cards.some((k) => !k.by && k.c !== K.cur);
      take(id, wrong ? shuffle(K.cards.filter((k) => !k.by && k.c !== K.cur))[0].c : K.cur); }, (r.fast[0] + Math.random() * (r.fast[1] - r.fast[0])) * K.slow));
  }
  function take(id, c) {
    if (!K || K.busy || K.out.has(id) || !K.cur) return;
    const card = el.querySelector(`.kr-card[data-card="${c}"]`); if (!card || card.disabled) return;
    if (c !== K.cur) {   // おてつき: out of this round
      K.out.add(id); el.querySelector(`.kr-who[data-who="${id}"]`).classList.add('out');
      card.classList.remove('shake'); void card.offsetWidth; card.classList.add('shake');
      say(id, id === 'hero' ? 'おてつき！' : `${RIVALS[id].slap}…あれ？`); if (id === 'hero') playSfx('bad'); else SND.play('place');
      if (K.out.size === 3) { K.busy = true; later(() => reveal(''), 600); }
      return;
    }
    K.busy = true; K.score[id]++; SND.play('place');
    if (id === 'hero') playSfx('good'); else say(id, RIVALS[id].slap);
    reveal(id);
  }
  function reveal(id) {
    const k = K.cards.find((x) => x.c === K.cur); if (id) k.by = id;
    const card = el.querySelector(`.kr-card[data-card="${K.cur}"]`); if (card && id) { card.classList.add('got', 'by-' + id); card.disabled = true; }
    const call = el.querySelector('.kr-call'); call.textContent = `${K.cur}・${roma(K.cur)}`; call.classList.add('hint');
    el.querySelectorAll('.kr-who i').forEach((i) => { i.textContent = K.score[i.closest('.kr-who').dataset.who]; });
    if (!id) k.by = 'none';   // no one got it (all slapped wrong): it goes out of play
    later(next, still() ? 900 : 1500);
  }
  function finish() {
    const s = K.score, best = Math.max(s.hero, s.chen, s.maria), win = s.hero === best;
    const line = KR_END[win ? (s.chen === best || s.maria === best ? 'tie' : 'win') : s.chen === best ? 'chen' : 'maria'];
    el.querySelector('.cls-card').innerHTML = karutaHtml(`<p class="kr-result">${win ? '你贏了！' : '下次加油！'}　你 ${s.hero}・陳 ${s.chen}・瑪莉亞 ${s.maria}</p><p class="kr-line"><b lang="ja">${esc(line[1])}</b><span>${esc(line[2])}</span></p>`);
    speakAs(line[0], line[1]);
    if (win) playKoto(3, 'かるた贏了');
    K.cur = '';
  }

  // ---- the radio: the class sings a row of the kana learned, one by one, each lit as it is sung; every time someone gets it
  // wrong and is told so ----
  const SINGERS = ['lin', 'chen', 'maria', 'hori'];
  const GOOFS = [
    { who: 'maria', at: 'end', ja: 'サンバ！', zh: '森巴！', back: ['chen', 'マリアさん、それ ちがう！', '瑪莉亞小姐，不是這樣啦！'] },
    { who: 'hori', at: 'end', ja: 'うむ。', zh: '嗯。（堀老師最後一個音拖了十秒）', back: ['maria', 'ほりせんせい、ながい！', '堀老師，太長了啦！'] },
    { who: 'chen', at: 'end', ja: 'イェー！', zh: '耶！（陳在最後加了一段饒舌）', back: ['lin', 'チェンさん、ラップは いりません。', '陳同學，不需要饒舌。'] }
  ];
  function song(row) {
    const s = seen(), rows = KANA_ROWS.map((r, i) => [i, r.filter(Boolean)]).filter(([, r]) => r.every((h) => s.has(h)));
    const pickRow = row !== undefined ? row : rows.length ? rows[Math.floor(Math.random() * rows.length)][0] : 0;
    const kana = KANA_ROWS[pickRow].filter(Boolean), goof = GOOFS[Math.floor(Math.random() * GOOFS.length)];
    open('cls-song', '一起唱', `${xBtn}<div class="sg-head"><span class="sg-radio">📻</span><b>あいうえおの うた</b></div>
      <div class="sg-row" lang="ja">${kana.map((h, i) => `<span class="sg-k" data-i="${i}">${h}<small>${KANA_ROMAJI[h]}</small></span>`).join('')}</div>
      <div class="sg-people">${SINGERS.map((id) => `<div class="sg-who" data-who="${id}"><span class="kr-face">${TOWNEV.face(id)}</span><em class="kr-say"></em></div>`).join('')}</div>
      <div class="sg-btns"><button type="button" class="btn btn-sm" data-cls="again">再唱一次</button><button type="button" class="btn btn-sm" data-cls="other">換一行</button></div>`, (e) => {
      if (e.target.closest('[data-cls="again"]')) song(pickRow);
      else if (e.target.closest('[data-cls="other"]')) song((rows.length ? rows[(rows.findIndex(([i]) => i === pickRow) + 1) % rows.length][0] : (pickRow + 1) % KANA_ROWS.length));
    });
    SND.play('switch'); radio(true);
    const sing = (i) => {
      if (i >= kana.length) { endSong(goof); return; }
      el.querySelectorAll('.sg-k').forEach((k) => k.classList.toggle('on', Number(k.dataset.i) === i));
      el.querySelectorAll('.sg-who').forEach((w, k) => w.classList.toggle('bob', (k + i) % 2 === 0));
      const t = token; Promise.race([speak(kana[i]), new Promise((ok) => setTimeout(ok, 1400))]).then(() => { if (t === token) later(() => sing(i + 1), 160); });
    };
    later(() => sing(0), 600);
    if (firstToday('song')) playKoto(1, '一起唱了五十音');
  }
  function endSong(goof) {
    el.querySelectorAll('.sg-k').forEach((k) => k.classList.add('on'));
    const bubble = (id, words) => { const w = el.querySelector(`.sg-who[data-who="${id}"] .kr-say`); if (w) { w.textContent = words; w.classList.remove('on'); void w.offsetWidth; w.classList.add('on'); } };
    bubble(goof.who, goof.ja); speakAs(goof.who, goof.ja);
    later(() => { bubble(goof.back[0], goof.back[1]); speakAs(goof.back[0], goof.back[1]); toast(`${goof.zh}　→　${goof.back[2]}`, 3600); }, 1500);
  }

  // ---- the picture books: a picture and its word in kana — one the hero can read now when there is one ----
  function book() {
    const s = seen(), pool = kanaWordPool(), can = pool.filter((v) => { const t = kanaWordText(v, 'hira'); return t && [...t].every((c) => s.has(c)); });
    const pick = () => { const list = can.length ? can : pool.filter((v) => kanaWordText(v, 'hira')); return list[Math.floor(Math.random() * list.length)]; };
    const page = (v) => { const t = kanaWordText(v, 'hira') || v.r; return `${xBtn}<div class="bk-page">${picSvg(picKey(v))}<div class="bk-word" lang="ja">${esc(t)}</div><div class="bk-zh">${esc(v.m)}</div>
      <p class="bk-note">${can.length ? '這本你讀得懂！' : '這本還有你沒學過的假名，先聽聽看。'}</p><div class="bk-btns"><button type="button" class="btn btn-sm" data-say="${esc(t)}">${icon('speaker')}<span>念出來</span></button><button type="button" class="btn btn-sm btn-primary" data-cls="next">下一頁</button></div></div>`; };
    let v = pick(); if (!v) return;
    open('cls-book', '繪本', page(v), (e) => {
      const sb = e.target.closest('[data-say]'); if (sb) { speak(sb.dataset.say); return; }
      if (e.target.closest('[data-cls="next"]')) { v = pick(); el.querySelector('.cls-card').innerHTML = page(v); SND.play('page'); speak(kanaWordText(v, 'hira') || v.r); }
    });
    speak(kanaWordText(v, 'hira') || v.r);
  }
  // a short word from someone instead (かるた before five kana)
  function openNote(label, zh, who, ja) {
    open('cls-note', label, `${xBtn}<div class="cn-who"><span class="kr-face">${TOWNEV.face(who)}</span><p><b lang="ja">${esc(ja)}</b><span>${esc(zh)}</span></p></div>`, () => {});
    speakAs(who, ja);
  }
  // what is said aloud here, for the generator (talkLines): each in its speaker's voice
  function lines(add) {
    Object.values(KR_END).forEach((l) => add(l[0], l[1]));
    GOOFS.forEach((g) => { add(g.who, g.ja); add(g.back[0], g.back[1]); });
    add('chen', 'かるた、まだ はやい！');
  }
  return { board, karuta, song, book, clockSay, close, playKoto, lines, on: () => Boolean(el) };
})();
