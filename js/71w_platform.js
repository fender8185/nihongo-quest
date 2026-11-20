'use strict';
// ---------- みなと駅のホーム (2026-11-20, 駅前の打工; docs/superpowers/specs/2026-11-20-ekimae-work-design.md §3) ----------
// Up from 駅前's 改札 (the hero's IC card: ピッ): the platform of the station on its viaduct, seen across its two tracks — 1番線
// right behind the yellow line (trains to 白鷺 come in from the right and leave to the left), 2番線 beyond it by the far platform
// (to みなと港, from the left) — and past them the town's roofs going down to the sea, the hills behind. On it: ハル's bento stall
// (みなと弁当), a vending machine, two benches, the bins, the station's name board, a glass waiting room, the stairs down; under
// the canopy the departure board (EKI), a clock, the track sign. A train now and then (PLATFORM): in, doors open, its bell, gone.
const PF = { E: 226, F: 240 };   // the platform's back edge (the yellow line in front of it); where the things on it stand
// a car of みなと線's train side on, its left bottom at (0, 0), len long and h high: cream with a teal band and an orange line, three
// pairs of doors that slide into the wall (pf-dl, pf-dr: apart while the train's g has .open), windows between with people in
// them, the destination's LED over the middle door; cab 'l'／'r': the driver's end (its window, a headlight, by night lit), tail: the
// other end's red lamp; under: its bogies (the far track: nothing stands in front of them)
function pfCar(len, h, dest, cab, tail, under, k) {
  const f = (n) => +n.toFixed(1), doors = [0.17, 0.5, 0.83].map((t) => f(len * t)), DW = 23, top = -h;
  const body = (x0, w) => `<rect x="${f(x0)}" y="${top + 8}" width="${f(w)}" height="${h - 18}" ${hc('#f1ece0', '#3a3f66')}/><rect x="${f(x0)}" y="-58" width="${f(w)}" height="12" ${hc('#3f9a8c', '#24485a')}/><rect x="${f(x0)}" y="-44" width="${f(w)}" height="3" ${hc('#e6a23c', '#5a4a3a')}/><rect x="${f(x0)}" y="-10" width="${f(w)}" height="10" ${hc('#d9d3c6', '#2c3056')}/>`;
  // the windows between the doors: a dark frame of two panes; inside, the far side's windows, the straps, the seats' backs and a
  // head or two (k: which), by night lit; a gleam over the glass
  const win = (x0, x1, n) => { const w = x1 - x0; if (w < 30) return ''; let s = `<rect x="${f(x0)}" y="-120" width="${f(w)}" height="48" rx="3" ${hc('#3a3f4a', '#1a1c34')}/><rect x="${f(x0 + 2.5)}" y="-117.5" width="${f(w - 5)}" height="43" rx="2" ${hc('#e6e1d4', '#3a3c5c')}/>
      <rect x="${f(x0 + 2.5)}" y="-114" width="${f(w - 5)}" height="15" ${hc('#b9d4e0', '#232848')}/><rect class="lit" x="${f(x0 + 2.5)}" y="-117.5" width="${f(w - 5)}" height="43" rx="2" style="opacity:calc(.04 + .5 * (1 - var(--day)))"/>
      <path d="M${f(x0 + 2.5)} -98 H${f(x1 - 2.5)}" ${hs('#b0aca2', '#4a4c6a')} stroke-width="1.4"/>${Array.from({ length: Math.floor((w - 8) / 12) }, (_, i) => `<path d="M${f(x0 + 9 + i * 12)} -98 v5" stroke="#8a8f99" stroke-width=".8"/><circle cx="${f(x0 + 9 + i * 12)}" cy="-91.6" r="1.8" fill="none" ${hs('#e8e4da', '#8a8cae')} stroke-width="1"/>`).join('')}
      <rect x="${f(x0 + 2.5)}" y="-84" width="${f(w - 5)}" height="10" ${hc('#5a7aa8', '#2a3460')}/>`;
    for (let i = 0; i < Math.floor(w / 34); i++) { if ((k * 7 + n * 3 + i * 5) % 3 === 0) continue; const hx = x0 + 14 + i * 34 + ((k + i) % 2) * 6, c = ['#3b2f2a', '#6b4a32', '#2a2524', '#a3a3a8'][(k + n + i) % 4];
      s += `<path d="M${f(hx - 10)} -74.5 q0 -11 10 -12 q10 1 10 12 Z" fill="${['#5f7a9a', '#c8655a', '#7aa86a', '#e0b84a', '#8a6aa8'][(k + n * 2 + i) % 5]}"/><circle cx="${f(hx)}" cy="-93" r="6.4" fill="#f0cdb0"/><path d="M${f(hx - 6.6)} -93 q0 -8 6.6 -8 q6.6 0 6.6 8 q-3 -4 -6.6 -4 q-3.6 0 -6.6 4 Z" fill="${c}"/>`; }
    return s + `<rect x="${f(x0 + 2.5)}" y="-117.5" width="${f(w - 5)}" height="43" rx="2" ${hc('#a9c8d6', '#2a3050')} opacity=".28"/><path d="M${f(x0 + w / 2)} -120 v48" ${hs('#3a3f4a', '#1a1c34')} stroke-width="2.4"/><path d="M${f(x0 + 8)} -76 L${f(x0 + 30)} -116 M${f(x0 + 20)} -76 L${f(x0 + 38)} -110 M${f(x0 + w / 2 + 8)} -76 L${f(x0 + w / 2 + 26)} -112" stroke="#fff" stroke-width="2.4" style="stroke-opacity:calc(.06 + .3 * var(--day, 1))"/>`; };
  let s = '';
  // the doorways: dark inside, then the two leaves (sliding apart under the wall either side)
  doors.forEach((dc) => { s += `<rect x="${f(dc - DW)}" y="-127" width="${2 * DW}" height="127" ${hc('#d4cfc2', '#2c2e4c')}/><rect x="${f(dc - DW + 6)}" y="-118" width="${2 * DW - 12}" height="34" rx="2" ${hc('#b9d4e0', '#232848')}/><path d="M${f(dc)} -127 V0" ${hs('#9a958a', '#3a3c5a')} stroke-width="1.4"/><rect x="${f(dc - DW)}" y="-8" width="${2 * DW}" height="8" ${hc('#8a857a', '#202238')}/><path d="M${f(dc - DW + 4)} -127 V-8" ${hs('#e6c23a', '#6a5a30')} stroke-width="2.4"/><rect class="lit" x="${f(dc - DW)}" y="-127" width="${2 * DW}" height="127" style="opacity:calc(.04 + .5 * (1 - var(--day)))"/>
    <g class="pf-dl"><rect x="${f(dc - DW)}" y="-127" width="${DW}" height="125" ${hc('#e3ddd0', '#343a60')}/><rect x="${f(dc - DW + 4)}" y="-118" width="${DW - 8}" height="38" rx="2" ${hc('#9fc0d0', '#2a3050')}/><rect class="lit" x="${f(dc - DW + 4)}" y="-118" width="${DW - 8}" height="38" rx="2"/><path d="M${f(dc - 1)} -127 V-2" stroke="#2b1c12" stroke-opacity=".3" stroke-width="1.2"/></g>
    <g class="pf-dr"><rect x="${f(dc)}" y="-127" width="${DW}" height="125" ${hc('#e3ddd0', '#343a60')}/><rect x="${f(dc + 4)}" y="-118" width="${DW - 8}" height="38" rx="2" ${hc('#9fc0d0', '#2a3050')}/><rect class="lit" x="${f(dc + 4)}" y="-118" width="${DW - 8}" height="38" rx="2"/><path d="M${f(dc + 1)} -127 V-2" stroke="#fff" stroke-opacity=".25" stroke-width="1"/></g>`; });
  // the walls: from end to end with the doorways left open (the leaves go in under them)
  const edges = [0, ...doors.flatMap((dc) => [dc - DW, dc + DW]), len];
  for (let i = 0; i < edges.length; i += 2) s += body(edges[i], edges[i + 1] - edges[i]) + win(edges[i] + 12, edges[i + 1] - 12, i);
  s += `<path d="M0 ${top + 12} Q0 ${top} 12 ${top} H${len - 12} Q${len} ${top} ${len} ${top + 12} V${top + 9} H0 Z" ${hc('#c9cdd4', '#2a2c50')}/>`;   // the roof's edge
  [0.24, 0.66].forEach((t) => { s += `<rect x="${f(len * t)}" y="${top - 9}" width="74" height="10" rx="2" ${hc('#b9bec7', '#262848')}/><path d="M${f(len * t + 6)} ${top - 6} h62 M${f(len * t + 6)} ${top - 3} h62" stroke="#2b1c12" stroke-opacity=".18" stroke-width="1"/>`; });
  if (k === 0) s += `<path d="M${f(len * 0.5 - 20)} ${top} l10 -22 l-18 -12 h56 l-18 12 l10 22" fill="none" ${hs('#5a5f6a', '#2a2c4a')} stroke-width="1.8"/><path d="M${f(len * 0.5 - 32)} ${top - 34} h64" ${hs('#3a3f4a', '#2a2c4a')} stroke-width="2.4"/>`;   // the pantograph
  // the destination's LED over the middle door, and the car's number
  s += `<rect x="${f(len * 0.5 - 26)}" y="-145" width="52" height="13" rx="1.5" fill="#1c1c22"/><text x="${f(len * 0.5)}" y="-135.4" text-anchor="middle" font-size="8.4" font-weight="700" fill="${dest[0] === '快速' ? '#ff7a5a' : '#ffae3a'}" font-family="system-ui, sans-serif">${dest.join(' ')}</text>
    <text x="${f(len * 0.06)}" y="-24" font-size="6" fill="#2b1c12" fill-opacity=".45" font-family="system-ui, sans-serif">${k ? 'クモハ 7002' : 'クハ 7001'}</text>`;
  // the ends: the driver's (a smaller window high up, the headlight), the other's red lamp
  const end = (x, side, lead) => `<path d="M${x} ${top + 14} V-8" stroke="#2b1c12" stroke-opacity=".14" stroke-width="5"/>${lead ? `<rect x="${side < 0 ? x + 6 : x - 34}" y="-122" width="28" height="30" rx="3" ${hc('#2f3a4a', '#1a1c34')}/><path d="M${side < 0 ? x + 9 : x - 31} -96 l10 -22" stroke="#fff" stroke-opacity=".25" stroke-width="2"/>` : ''}
    <circle cx="${side < 0 ? x + 6 : x - 6}" cy="-22" r="3.6" fill="${lead ? '#fff6d8' : '#d0453c'}"/>${lead ? `<circle class="glow" cx="${side < 0 ? x - 2 : x + 2}" cy="-22" r="22" fill="url(#glw)"/>` : ''}`;
  if (cab) s += end(cab === 'l' ? 0 : len, cab === 'l' ? -1 : 1, true);
  if (tail) s += end(tail === 'l' ? 0 : len, tail === 'l' ? -1 : 1, false);
  if (under) [0.16, 0.84].forEach((t) => { const c = len * t; s += `<rect x="${f(c - 30)}" y="-2" width="60" height="9" rx="2" ${hc('#3a3d44', '#141428')}/>${[-18, 18].map((d) => `<circle cx="${f(c + d)}" cy="9" r="7.4" ${hc('#2b2b33', '#101022')}/><circle cx="${f(c + d)}" cy="9" r="2.4" ${hc('#8a8f99', '#2a2c48')}/>`).join('')}`; });
  return s;
}
// a train of two cars, len each, joined by the gangway; to: where it is bound (its cab at the leading end: going left, 'l')
function pfTrain(len, h, x = { kind: '普通', to: 'shirasagi' }, under = false) {
  const dest = [x.kind, EKI.name(x.to)], left = x.to === 'shirasagi';   // 白鷺: away to the left (かわぐち's side)
  return `<g>${pfCar(len, h, dest, left ? 'l' : '', left ? '' : 'l', under, 0)}<rect x="${len}" y="-${h - 30}" width="6" height="${h - 44}" ${hc('#3a3d44', '#141428')}/><g transform="translate(${len + 6} 0)">${pfCar(len, h, dest, left ? '' : 'r', left ? 'r' : '', under, 1)}</g></g>`;
}
const PF_NEAR = { len: 380, h: 158, at: 180 }, PF_FAR = { len: 380, h: 158, at: 330, k: 0.62, y: 208 };   // where each stands when stopped (its left end)

function platformHtml() {
  const { E, F } = PF, f = (n) => +n.toFixed(1);
  // far off: the hills, the sea, the town's roofs going down to it (lit windows by night)
  const roofs = Array.from({ length: 34 }, (_, i) => { const x = (i * 97) % 1240 - 20, y = 150 + ((i * 37) % 30), w = 26 + (i * 13) % 22, hh = 10 + (i * 7) % 9, c = ['#a65a44', '#5f6f8a', '#6f5a7a', '#8a6a52', '#7a8a6a'][i % 5];
    return `<rect x="${x}" y="${y}" width="${w}" height="${hh + 12}" ${hc(['#efe4d2', '#e6dccb', '#f2ead8'][i % 3], '#1c1e3e')}/><path d="M${x - 3} ${y + 1} L${f(x + w / 2)} ${f(y - hh * 0.6)} L${x + w + 3} ${y + 1} Z" ${hc(c, '#15163a')}/>${i % 3 ? `<rect class="lit" x="${x + 5}" y="${y + 6}" width="5" height="4"/>` : ''}`; }).sort().join('');
  const far = `<path d="M-20 118 C120 70 240 92 360 84 C470 78 560 46 700 60 C820 72 900 96 1020 80 C1100 70 1160 76 1220 88 V140 H-20 Z" ${hc('#a9c2b4', '#1a2242')}/>
    <path d="M-20 102 C160 88 300 104 420 100 C560 96 640 112 760 108 C900 102 1040 110 1220 104 V140 H-20 Z" ${hc('#94b3a2', '#161e3a')}/>
    <rect x="-20" y="122" width="1240" height="40" ${hc('#8fbcd4', '#1a2448')}/>${[[60, 128, 40], [240, 134, 26], [480, 130, 34], [700, 136, 30], [930, 129, 38], [1110, 133, 24]].map(([x, y, l], i) => `<path class="glint" d="M${x} ${y} h${l}" style="--w:-${i * 0.7}s"/>`).join('')}${moonGlitter(820, 124, 150)}
    ${roofs}`;
  // the far platform (2番線): its edge and floor, the yellow line, a fence behind, its canopy on posts, a bench, a sign; its track
  const farPf = `<rect x="-20" y="172" width="1240" height="10" ${hc('#c9c3b6', '#262848')}/><path d="M-20 172 H1220" stroke="#2b1c12" stroke-opacity=".15"/>
    ${Array.from({ length: 62 }, (_, i) => `<path d="M${-20 + i * 20} 172 v-9" ${hs('#8a8f99', '#2a2c48')} stroke-width="1.2"/>`).join('')}<path d="M-20 163 H1220" ${hs('#8a8f99', '#2a2c48')} stroke-width="1.4"/>
    <rect x="-20" y="182" width="1240" height="13" ${hc('#ddd7ca', '#2c2e50')}/><rect x="-20" y="191" width="1240" height="3" ${hc('#e8c43a', '#6a5a30')}/><rect x="-20" y="195" width="1240" height="7" ${hc('#b8b2a4', '#1e2044')}/>
    <rect x="240" y="104" width="720" height="6" ${hc('#7a8692', '#1e2142')}/><rect x="240" y="110" width="720" height="3" ${hc('#9aa4ae', '#262a4c')}/>${[260, 470, 680, 930].map((x) => `<rect x="${x}" y="113" width="5" height="70" ${hc('#8a96a2', '#2a2e52')}/>`).join('')}
    ${[300, 520, 760].map((x) => `<rect class="glow" x="${x - 40}" y="112" width="80" height="2" fill="#fffbe0"/>`).join('')}
    <g transform="translate(640 166)">${benchSeat(0, 0, 50)}</g>
    <rect x="370" y="150" width="20" height="32" rx="2" ${hc('#d0453c', '#4a2030')}/><rect x="372.5" y="153" width="15" height="11" ${hc('#cfe6ec', '#e6f2ff')}/>
    <rect x="440" y="124" width="54" height="15" rx="2" ${hc('#fbfaf6', '#3a3c60')}/><circle cx="449" cy="131.5" r="5" ${hc('#2f6a8a', '#24485a')}/><text x="449" y="134.3" text-anchor="middle" font-size="7.6" font-weight="700" fill="#fff" font-family="system-ui, sans-serif">2</text><text x="473" y="134" text-anchor="middle" font-size="6" ${hc('#2b2b33', '#d8d4f0')} font-family="system-ui, sans-serif">みなと港方面</text><path d="M457 124 v-14 M489 124 v-14" ${hs('#5a5f6a', '#2a2c4a')} stroke-width="1"/>
    <rect x="-20" y="202" width="1240" height="10" ${hc('#9a948a', '#1c1e3a')}/>${Array.from({ length: 70 }, (_, i) => `<rect x="${-18 + i * 18}" y="204" width="9" height="4" ${hc('#7a6a5a', '#1a1a30')}/>`).join('')}<path d="M-20 205.5 H1220 M-20 209.5 H1220" ${hs('#6a6e78', '#2a2c48')} stroke-width="1.4"/>`;
  // the near track (1番線) just below the edge: gravel, sleepers, the rails catching the light
  const nearTrack = `<rect x="-20" y="212" width="1240" height="16" ${hc('#a8a196', '#202240')}/>${Array.from({ length: 52 }, (_, i) => `<rect x="${-20 + i * 24}" y="216" width="14" height="6" ${hc('#7a6a5a', '#1a1a30')}/>`).join('')}<path d="M-20 217 H1220 M-20 223 H1220" ${hs('#7a7e88', '#2e3050')} stroke-width="2"/><path d="M-20 216.2 H1220 M-20 222.2 H1220" stroke="#fff" stroke-width=".7" style="stroke-opacity:calc(.1 + .3 * var(--day, 1))"/>`;
  // the trains: a g each, moved along by PLATFORM (off the screen till one comes)
  const near = `<g class="pf-train pf-near" data-track="1" style="transform:translateX(1400px)"><g transform="translate(${PF_NEAR.at} ${E - 2})">${pfTrain(PF_NEAR.len, PF_NEAR.h)}</g></g>`;
  const farT = `<g class="pf-train pf-far" data-track="2" style="transform:translateX(-1400px)"><g transform="translate(${PF_FAR.at} ${PF_FAR.y}) scale(${PF_FAR.k})">${pfTrain(PF_FAR.len, PF_FAR.h, { kind: '普通', to: 'minatoko' }, true)}</g></g>`;
  // our platform: its floor from the edge to us, the white line and the yellow studded strip, the boarding marks, the seams
  const floor = `<rect x="-20" y="${E}" width="1240" height="${370 - E}" ${hc('#d9d3c6', '#2a2a48')}/><rect x="-20" y="${E}" width="1240" height="2.4" ${hc('#f4f1ea', '#5a5c80')}/>
    <rect x="-20" y="${E + 4}" width="1240" height="7" ${hc('#e8c43a', '#6a5a30')}/><path d="${Array.from({ length: 124 }, (_, i) => `M${-18 + i * 10} ${E + 7.5} h3`).join(' ')}" stroke="#2b1c12" stroke-opacity=".18" stroke-width="2.6" stroke-linecap="round"/>
    ${[0.17, 0.5, 0.83, 1.17, 1.5, 1.83].map((t) => { const x = f(PF_NEAR.at + PF_NEAR.len * t + (t > 1 ? 6 : 0)); return `<path d="M${x - 22} ${E + 15} h44 M${x - 22} ${E + 15} v6 M${x + 22} ${E + 15} v6" fill="none" ${hs('#f4f1ea', '#6a6c90')} stroke-width="1.6"/><path d="M${x - 5} ${E + 17} h10 l-5 6 Z" ${hc('#3f9a8c', '#3a5a6a')}/>`; }).join('')}
    <rect x="110" y="${E + 11}" width="900" height="64" fill="#2b1c12" style="opacity:calc(.07 * var(--day, 1))"/>${Array.from({ length: 21 }, (_, i) => `<path class="seam" d="M${-20 + i * 62} ${E + 26} V370"/>`).join('')}<path class="seam" d="M-20 ${E + 62} H1220 M-20 ${E + 104} H1220"/>`;
  // the canopy: its roof's edge, the underside with its lamps, the posts down to the floor; the clock, the departure board and
  // the track sign hung from it
  const lamps = [170, 290, 410, 530, 650, 770, 890].map((x) => `<rect x="${x}" y="22" width="56" height="3" rx="1.5" ${hc('#f4f6f8', '#fffbe0')}/><rect class="glow" x="${x - 6}" y="24" width="68" height="5" rx="2.5" fill="#fffbe0" opacity=".6"/>${lightPool(x + 28, E + 40, 46, 10)}`).join('');
  const canopy = `<rect x="110" y="-4" width="900" height="18" ${hc('#6c7884', '#1e2142')}/><rect x="110" y="-4" width="900" height="3" ${hc('#8a96a2', '#2a2e52')}/><rect x="110" y="14" width="900" height="9" ${hc('#98a2ac', '#262a4c')}/><path d="M110 14 H1010" stroke="#2b1c12" stroke-opacity=".25" stroke-width="1.4"/>${lamps}
    ${[205, 465, 725, 985].map((x) => `<rect x="${x - 5}" y="23" width="10" height="${F - 23}" ${hc('#8a96a2', '#2a2e52')}/><rect x="${x + 2}" y="23" width="3" height="${F - 23}" fill="#2b1c12" fill-opacity=".16"/><rect x="${x - 9}" y="${F - 4}" width="18" height="4" rx="1" ${hc('#6c7884', '#1e2142')}/>${groundShade(x, F + 1, 12, 2)}`).join('')}`;
  const clock = `<path d="M330 23 v12" ${hs('#5a5f6a', '#2a2c4a')} stroke-width="2"/><circle cx="330" cy="48" r="14" ${hc('#fbf7ec', '#e8dcb4')}/><circle cx="330" cy="48" r="13.2" fill="none" ${hs('#3b3b44', '#1c1d3c')} stroke-width="1.8"/>
    <path d="${Array.from({ length: 12 }, (_, i) => { const a = i * Math.PI / 6, r0 = i % 3 ? 10 : 8.8; return `M${f(330 + r0 * Math.sin(a))} ${f(48 - r0 * Math.cos(a))} L${f(330 + 11.4 * Math.sin(a))} ${f(48 - 11.4 * Math.cos(a))}`; }).join(' ')}" stroke="#3b2a1c" stroke-opacity=".7" stroke-width="1"/>${clockHands(330, 48, 12)}`;
  const board = `<path d="M536 23 v8 M684 23 v8" ${hs('#5a5f6a', '#2a2c4a')} stroke-width="2"/><rect x="520" y="30" width="180" height="38" rx="3" ${hc('#3a3d44', '#1c1d3c')}/><rect x="523" y="33" width="174" height="32" rx="2" fill="#141418"/>
    <g class="pf-dep">${pfBoardRows()}</g><path d="M523 49 h174" stroke="#2b2b33" stroke-width="1"/>`;
  const track = `<path d="M810 23 v9 M876 23 v9" ${hs('#5a5f6a', '#2a2c4a')} stroke-width="1.6"/><rect x="800" y="31" width="86" height="24" rx="2" ${hc('#fbfaf6', '#3a3c60')}/><circle cx="814" cy="43" r="8.4" ${hc('#3f9a8c', '#24485a')}/><text x="814" y="47.4" text-anchor="middle" font-size="12" font-weight="700" fill="#fff" font-family="system-ui, sans-serif">1</text>
    <text x="852" y="40" text-anchor="middle" font-size="5.6" ${hc('#6a6a74', '#a8a8c8')} font-family="system-ui, sans-serif">しらさぎ</text><text x="852" y="50" text-anchor="middle" font-size="10" font-weight="700" ${hc('#2b2b33', '#e8e4f8')} font-family="system-ui, sans-serif">白鷺方面</text><path d="M875 52 h7 l-3 -2.4 M882 52 l-3 2.4" fill="none" ${hs('#2b2b33', '#e8e4f8')} stroke-width="1"/>`;
  // the station's name board on its two legs: みなと big, its romaji, a teal bar, the stations either side
  const sign = `<g data-fx="pfsign"><rect x="645" y="182" width="5" height="${F - 182}" ${hc('#6c7884', '#1e2142')}/><rect x="770" y="182" width="5" height="${F - 182}" ${hc('#6c7884', '#1e2142')}/>${groundShade(710, F + 1, 70, 2.4)}
    <rect x="628" y="130" width="164" height="56" rx="4" ${hc('#5a5f6a', '#1c1d3c')}/><rect x="631" y="133" width="158" height="50" rx="3" ${hc('#fbfaf6', '#e9e6d8')}/>
    <text x="710" y="158" text-anchor="middle" font-size="21" font-weight="700" fill="#2b2b33" font-family="system-ui, sans-serif" letter-spacing="3">みなと</text><text x="710" y="167" text-anchor="middle" font-size="6.4" fill="#6a6a74" font-family="system-ui, sans-serif" letter-spacing="1">Minato</text>
    <rect x="631" y="170" width="158" height="5" fill="#3f9a8c"/><text x="636" y="181" font-size="6.8" fill="#2b2b33" font-family="system-ui, sans-serif">◀ かわぐち</text><text x="784" y="181" text-anchor="end" font-size="6.8" fill="#2b2b33" font-family="system-ui, sans-serif">みなとこう ▶</text></g>`;
  // the bins: burnable, cans and bottles, PET bottles — a hole each, their words on the front
  const bins = `<g data-fx="pfbins">${[['#4f7a4a', 'もえる'], ['#3f6aa8', 'かん'], ['#e0a83a', 'PET']].map(([c, w], i) => { const x = 590 + i * 14; return `<rect x="${x}" y="${F - 30}" width="13" height="30" rx="1.5" ${hc('#c9cdd4', '#2a2c50')}/><rect x="${x}" y="${F - 32}" width="13" height="5" rx="1.5" ${hc(c, '#2a2c48')}/><ellipse cx="${x + 6.5}" cy="${F - 29.4}" rx="3.4" ry="1.4" fill="#2b2b33"/><text x="${x + 6.5}" y="${F - 16}" text-anchor="middle" font-size="3.6" font-weight="700" ${hc(c, '#a8a8c8')} font-family="system-ui, sans-serif">${w}</text>`; }).join('')}${groundShade(611, F + 1, 24, 2)}</g>`;
  // the vending machine (as 駅前's)
  const vend = `<g data-fx="pvend"><rect x="330" y="${F - 72}" width="36" height="72" rx="3" ${hc('#e9edf0', '#3a4470')}/><rect x="333" y="${F - 66}" width="30" height="28" rx="2" ${hc('#cfe6ec', '#e6f2ff')}/>${[0, 1].map((r) => [0, 1, 2, 3].map((c) => `<rect x="${335 + c * 7}" y="${F - 63 + r * 12}" width="5" height="9" rx="1.5" fill="${['#3f7ac8', '#e6a23c', '#4f7a4a', '#d0574b'][(r + c) % 4]}"/>`).join('')).join('')}<rect x="337" y="${F - 26}" width="22" height="9" rx="2" ${hc('#2b2b33', '#141530')}/><rect x="356" y="${F - 36}" width="5" height="6" rx="1" ${hc('#8a8f99', '#2a2c48')}/>${groundShade(348, F + 1, 22, 2)}</g><ellipse class="glow" cx="348" cy="${F - 46}" rx="60" ry="50" fill="url(#glc)"/>`;
  // the waiting room: a glass box — inside a bench and a stove glowing, the glass over it with its gleams, a sliding door, its name
  const wait = `<g data-fx="pfwait"><rect x="817" y="${F - 92}" width="146" height="92" ${hc('#efe9dd', '#2a2a48')}/><rect class="lit" x="817" y="${F - 92}" width="146" height="92" style="opacity:calc(.1 + .55 * (1 - var(--day)))"/>
    <rect x="828" y="${F - 30}" width="74" height="6" rx="2" ${hc('#c58a54', '#3e3044')}/><path d="M834 ${F - 24} v18 M896 ${F - 24} v18" ${hs('#4c4f56', '#1e1f3c')} stroke-width="2.4"/><rect x="826" y="${F - 50}" width="78" height="20" rx="2" ${hc('#c58a54', '#3e3044')}/>
    <rect x="920" y="${F - 40}" width="22" height="38" rx="3" ${hc('#8a8f99', '#2a2c48')}/><rect x="924" y="${F - 30}" width="14" height="10" rx="2" fill="#ff8a3a" fill-opacity=".85"/><circle class="glow" cx="931" cy="${F - 25}" r="24" fill="url(#glw)"/>
    <rect x="815" y="${F - 94}" width="150" height="94" fill="none" ${hs('#c9cdd4', '#4a4c6a')} stroke-width="4"/><path d="M864 ${F - 92} V${F} M915 ${F - 92} V${F} M817 ${F - 60} H963" ${hs('#c9cdd4', '#4a4c6a')} stroke-width="2.4"/>
    <rect x="817" y="${F - 92}" width="146" height="92" ${hc('#cfe6ec', '#3a4470')} opacity=".32"/><path d="M826 ${F - 6} L850 ${F - 86} M838 ${F - 6} L858 ${F - 70} M878 ${F - 10} L904 ${F - 88} M930 ${F - 8} L952 ${F - 80}" stroke="#fff" stroke-width="3" style="stroke-opacity:calc(.08 + .3 * var(--day, 1))"/>
    <rect x="886" y="${F - 52}" width="3" height="12" rx="1" ${hc('#8a8f99', '#4a4c6a')}/><rect x="855" y="${F - 112}" width="70" height="17" rx="2" ${hc('#2f4a6e', '#1c1d3c')}/><text x="890" y="${F - 99.6}" text-anchor="middle" font-size="10" font-weight="700" fill="#fff" font-family="system-ui, sans-serif">待合室</text><text x="890" y="${F - 114}" text-anchor="middle" font-size="5.4" ${hc('#6a6a74', '#a8a8c8')} font-family="system-ui, sans-serif">まちあいしつ</text>${groundShade(890, F + 1, 78, 2.4)}</g>`;
  // the stairs down to the 改札: a tiled housing, steps going down into the dark, the handrails, its sign with the arrow
  const stairs = `<g data-fx="pfstairs"><rect x="1018" y="${F - 104}" width="150" height="104" ${hc('#d8d2c4', '#262848')}/><path d="${Array.from({ length: 8 }, (_, i) => `M1018 ${F - 92 + i * 12} H1168`).join(' ')}" stroke="#2b1c12" stroke-opacity=".08"/>
    <rect x="1036" y="${F - 84}" width="114" height="84" ${hc('#5a5f6a', '#101024')}/>${Array.from({ length: 7 }, (_, i) => `<rect x="${1036 + i * 3}" y="${F - 84 + i * 12}" width="${114 - i * 6}" height="6" ${hc(['#c9c3b6', '#b8b2a4', '#a8a296', '#968f84', '#837c72', '#6e6860', '#5a554e'][i], '#1a1a30')}/>`).join('')}
    <path d="M1040 ${F - 70} L1060 ${F} M1146 ${F - 70} L1126 ${F}" ${hs('#9aa4ae', '#4a4c6a')} stroke-width="2.6"/><rect x="1018" y="${F - 104}" width="150" height="6" ${hc('#6c7884', '#1e2142')}/>
    <rect x="1040" y="${F - 128}" width="106" height="22" rx="3" ${hc('#2b2b33', '#1c1d3c')}/><path d="M1052 ${F - 124} v12 m-4 -4 l4 4 l4 -4" fill="none" stroke="#f2c94c" stroke-width="2"/><text x="1100" y="${F - 112.4}" text-anchor="middle" font-size="10" font-weight="700" fill="#fff" font-family="system-ui, sans-serif">改札・駅前</text>${groundShade(1093, F + 1, 80, 2.4)}</g>`;
  // ハル's stall, its back half (behind her): the shelves with bentos stacked in their wrappings, the kettle on the burner, the eave
  // with the shop's name, the noren; its front (the counter, the glass case, the bottles) is a layer over her (pfStallFront)
  const stallBack = `<g data-fx="pfstall"><rect x="124" y="${F - 120}" width="172" height="120" ${hc('#b9875a', '#3a2c40')}/><path d="${Array.from({ length: 10 }, (_, i) => `M${130 + i * 17} ${F - 120} V${F}`).join(' ')}" stroke="#2b1c12" stroke-opacity=".12"/>
    <rect x="132" y="${F - 92}" width="156" height="4" ${hc('#8a5e3a', '#2a2030')}/><rect x="132" y="${F - 64}" width="156" height="4" ${hc('#8a5e3a', '#2a2030')}/>
    ${Array.from({ length: 9 }, (_, i) => { const x = 136 + i * 17, y = F - 104 + (i % 2) * 0; return `<rect x="${x}" y="${y}" width="14" height="12" rx="1.5" fill="${['#d0453c', '#2f5a8a', '#e6a23c', '#3f7a52', '#8a4a6a'][i % 5]}"/><path d="M${x + 7} ${y} v12 M${x} ${y + 6} h14" stroke="#fff" stroke-opacity=".5" stroke-width="1"/>`; }).join('')}
    ${Array.from({ length: 7 }, (_, i) => `<rect x="${140 + i * 20}" y="${F - 78}" width="16" height="14" rx="2" ${hc('#f4efe4', '#3a3c5a')}/><rect x="${140 + i * 20}" y="${F - 78}" width="16" height="4" fill="${['#2f5a8a', '#d0453c'][i % 2]}"/>`).join('')}
    <g transform="translate(268 ${F - 72})"><rect x="-14" y="14" width="28" height="8" rx="2" ${hc('#5a5f6a', '#1e2042')}/><path d="M-10 14 Q-12 0 0 -2 Q12 0 10 14 Z" ${hc('#c9cdd4', '#3a3c60')}/><path d="M10 6 q8 -2 9 -8" fill="none" ${hs('#c9cdd4', '#3a3c60')} stroke-width="2.4"/><path d="M-4 -4 q4 -4 8 0" fill="none" ${hs('#2b2b33', '#141428')} stroke-width="1.6"/>
      <g class="fx-steam"><path d="M18 -12 q-4 -6 0 -12 q4 -6 0 -12" fill="none" stroke="#fff" stroke-opacity=".7" stroke-width="2.4" stroke-linecap="round"/></g></g>
    <path d="M114 ${F - 120} L130 ${F - 140} H290 L306 ${F - 120} Z" ${hc('#4a4f5a', '#1c1d3c')}/><path d="${Array.from({ length: 12 }, (_, i) => `M${132 + i * 14} ${F - 138} L${120 + i * 16} ${F - 121}`).join(' ')}" stroke="#2b2b33" stroke-opacity=".35"/>
    <rect x="160" y="${F - 156}" width="100" height="22" rx="2" ${hc('#e9d8b4', '#4a3c50')}/><rect x="162" y="${F - 154}" width="96" height="18" rx="1.5" fill="none" ${hs('#8a5e3a', '#2a2030')} stroke-width="1.2"/><text x="210" y="${F - 140.6}" text-anchor="middle" font-size="12.4" font-weight="700" ${hc('#3b2a1c', '#2a2030')} ${SERIF}>みなと弁当</text>
    ${[0, 1, 2].map((i) => `<g class="fx-sway" style="animation-delay:-${i * 0.6}s;animation-duration:${3.4 + i * 0.4}s"><rect x="${132 + i * 54}" y="${F - 120}" width="50" height="24" ${hc('#2f4a7a', '#1c2240')}/><path d="M${132 + i * 54} ${F - 98} h50" stroke="#fff" stroke-opacity=".25"/><text x="${157 + i * 54}" y="${F - 104}" text-anchor="middle" font-size="11" font-weight="700" fill="#fff" ${SERIF}>${['お', '弁', '当'][i]}</text></g>`).join('')}
    <g class="fx-sway" style="animation-duration:3s"><path d="M302 ${F - 120} v6" stroke="#3b2a1c" stroke-width="1"/><ellipse cx="302" cy="${F - 104}" rx="8" ry="10" ${hc('#d0302a', '#ff8a5a')}/><path d="M294 ${F - 106} q8 2 16 0 M294 ${F - 101} q8 2 16 0" fill="none" stroke="#8a1a1a" stroke-opacity=".45" stroke-width=".8"/><circle class="glow" cx="302" cy="${F - 104}" r="22" fill="url(#glw)"/></g></g>`;
  return `<svg class="land tall platform-land" viewBox="0 -400 1200 770" preserveAspectRatio="xMidYMax slice">${GLOW_DEFS}
      ${far}${farPf}${farT}${nearTrack}${near}${floor}${canopy}${clock}${board}${track}${sign}${bins}${vend}${wait}${stairs}${stallBack}
    </svg>
    ${landProp(116, pfStallFront(), null, [110, F - 76, 310, F + 18])}
    ${benchProps(380, F + 40, 66)}${benchProps(490, F + 40, 66)}
    ${yHeroHtml()}
    ${TOWNEV.castHtml('platform')}
    <button type="button" class="thing way-btn" data-act="go-place" data-to="station" aria-label="往改札" style="margin-left:${1093 - 600 - 32}px;bottom:${370 - F + 24}px"><span class="tag">${ySign('door', '往改札')}</span></button>
    <div class="ysel"></div>`;
}
// the stall's front, over ハル: the counter (its planks, a red banner), on it the glass case of bentos and the tea bottles — orange
// caps hot, blue cold (the custom 駅弁 teaches) — and the hand-written price cards
function pfStallFront() {
  const F = PF.F, box = (x, y, c) => `<rect x="${x}" y="${y}" width="17" height="11" rx="1.5" ${hc('#2b2b33', '#141428')}/><rect x="${x + 1.2}" y="${y + 1.2}" width="14.6" height="8.6" rx="1" fill="${c}"/><circle cx="${x + 5}" cy="${y + 5.5}" r="2.2" fill="#fbf7ec"/><rect x="${x + 9}" y="${y + 3}" width="5" height="3" rx="1" fill="#e8c43a"/><path d="M${x + 9} ${y + 7.6} h5" stroke="#5a8a4a" stroke-width="1.4"/>`;
  return `<rect x="118" y="${F - 10}" width="184" height="${10 + 14}" ${hc('#a8774a', '#33263a')}/><path d="${Array.from({ length: 11 }, (_, i) => `M${124 + i * 17} ${F - 10} V${F + 14}`).join(' ')}" stroke="#2b1c12" stroke-opacity=".14"/>
    <rect x="114" y="${F - 16}" width="192" height="7" rx="1.5" ${hc('#d9b48a', '#4a3c50')}/><rect x="114" y="${F - 10}" width="192" height="2" fill="#2b1c12" fill-opacity=".2"/>
    <rect x="150" y="${F - 5}" width="120" height="14" rx="1" ${hc('#c8322a', '#5a2a3a')}/><text x="210" y="${F + 5.2}" text-anchor="middle" font-size="9" font-weight="700" fill="#fff8e8" ${SERIF}>名物 さかな弁当</text>
    <rect x="122" y="${F - 40}" width="80" height="25" rx="2" ${hc('#cfe6ec', '#3a4470')} opacity=".5"/>${[0, 1, 2, 3].map((i) => box(126 + i * 19, F - 46, ['#d0453c', '#2f5a8a', '#e6a23c', '#3f7a52'][i])).join('')}${[0, 1, 2, 3].map((i) => box(126 + i * 19, F - 35, ['#2f5a8a', '#8a4a6a', '#d0453c', '#e6a23c'][i])).join('')}
    <rect x="122" y="${F - 40}" width="80" height="25" rx="2" fill="none" ${hs('#8a8f99', '#4a4c6a')} stroke-width="1.6"/><path d="M128 ${F - 17} L140 ${F - 38} M144 ${F - 17} L152 ${F - 32}" stroke="#fff" stroke-width="1.6" style="stroke-opacity:calc(.1 + .4 * var(--day, 1))"/>
    ${[0, 1, 2, 3, 4, 5].map((i) => { const x = 252 + i * 8, hot = i < 3; return `<rect x="${x}" y="${F - 34}" width="6.4" height="19" rx="2" ${hc('#c8a24a', '#4a3c30')} fill-opacity=".85"/><rect x="${x + 0.8}" y="${F - 28}" width="4.8" height="7" fill="#fbf7ec" fill-opacity=".8"/><rect x="${x + 1}" y="${F - 38}" width="4.4" height="4.4" rx="1" fill="${hot ? '#e8742a' : '#3f7ac8'}"/>`; }).join('')}
    <rect x="256" y="${F - 50}" width="38" height="10" rx="1" fill="#fbf7ec" transform="rotate(-5 275 ${F - 45})"/><text x="275" y="${F - 42.8}" text-anchor="middle" font-size="5.6" fill="#3b2a1c" transform="rotate(-5 275 ${F - 45})" font-family="system-ui, sans-serif">お茶 150円</text>
    <rect x="124" y="${F - 54}" width="44" height="11" rx="1" fill="#fbf7ec" transform="rotate(4 146 ${F - 48})"/><text x="146" y="${F - 46}" text-anchor="middle" font-size="5.6" fill="#3b2a1c" transform="rotate(4 146 ${F - 48})" font-family="system-ui, sans-serif">お弁当 800円</text>
    ${groundShade(210, F + 15, 96, 3)}`;
}
// the departure board's rows: the next two trains out of みなと by the scene's clock — 先発 / 次発, the time, 普通 (green) or 快速
// (orange-red), where to, the track
function pfBoardRows() {
  const now = sceneHour(), rows = EKI.next(Math.floor(now), Math.floor((now % 1) * 60), 2);
  return rows.map((x, i) => { const y = 45 + i * 16; return `<text x="527" y="${y}" font-size="7" fill="#ffae3a" font-family="system-ui, sans-serif">${i ? '次発' : '先発'}</text><text x="551" y="${y}" font-size="9" font-weight="700" fill="#ffae3a" font-family="system-ui, sans-serif">${x.t}</text>
    <text x="582" y="${y}" font-size="8" font-weight="700" fill="${x.kind === '快速' ? '#ff6a4a' : '#5fd07a'}" font-family="system-ui, sans-serif">${x.kind}</text><text x="608" y="${y}" font-size="8.6" font-weight="700" fill="#ffae3a" font-family="system-ui, sans-serif">${EKI.name(x.to)}</text><text x="692" y="${y}" text-anchor="end" font-size="8.6" font-weight="700" fill="#ffae3a" font-family="system-ui, sans-serif">${x.track}</text>`; }).join('');
}

// ---- the trains: now and then one in on 1番線 (to 白鷺, from the right), then one on 2番線 (to みなと港, from the left); each slows to
// its stop, opens its doors (ピンポン), waits, plays its bell, shuts and goes. PLATFORM.speed: the tests run it fast ----
const PLATFORM = (() => {
  let run = 0, cur = null;   // cur: the train in now { track, to, kind, phase }
  const api = { speed: 1, now: () => cur, mount };
  // ---- the people on it (not under e2e; still for one who'd rather): a few waiting at 1番線's boarding marks, their backs to us;
  // in when the doors open — and one or two off it, away down the stairs; new ones up the stairs to wait while it is gone ----
  const MARKS = [0.5, 0.83, 1.17, 1.5, 1.83].map((t) => Math.round(PF_NEAR.at + PF_NEAR.len * t + (t > 1 ? 6 : 0) - 600));   // the doors' X (the stall stands at the first)
  const STAIRS = [493, 118], WAIT_Y = 118, people = [];
  const quiet = () => Boolean(window.NQ_E2E) || still();
  function person(y, at, op = 1) {
    const box = y.querySelector('.yworld'); if (!box) return null;
    const { look, wear } = PASSERS.look(), el = document.createElement('div');
    el.className = 'hero npc passer pf-person'; el.setAttribute('aria-hidden', 'true'); el.innerHTML = HERO.svg({ look, wear }); el.style.opacity = String(op);
    box.appendChild(el); const p = { el, pos: at.slice(), to: null, done: null, v: 40 + Math.random() * 14, mark: null }; people.push(p); put(p); return p;
  }
  function put(p, dx = 0, dy = 0) {
    const [X, Y] = p.pos; p.el.style.transform = `translate(${X.toFixed(1)}px,${(-Y).toFixed(1)}px) scale(${yScale(Y).toFixed(3)})`; p.el.style.zIndex = String(300 - Math.round(Y));
    if (dx || dy) { p.el.classList.toggle('back', dy > 0 && Math.abs(dy) > Math.abs(dx)); p.el.classList.toggle('turn', Math.abs(dx) >= Math.abs(dy)); p.el.classList.toggle('flip', dx < 0); }
  }
  const walk = (p, to, done) => { p.to = to; p.done = done; p.el.classList.add('walk'); };
  const gone = (p) => { p.el.style.transition = 'opacity .5s'; p.el.style.opacity = '0'; setTimeout(() => { p.el.remove(); }, 600); people.splice(people.indexOf(p), 1); };
  let raf = 0, at = 0;
  function frame(now) {
    const dt = at ? Math.min(0.1, (now - at) / 1000) : 0; at = now;
    people.slice().forEach((p) => { if (!p.to) return; const dx = p.to[0] - p.pos[0], dy = p.to[1] - p.pos[1], d = Math.hypot(dx, dy), m = p.v * dt;
      if (d <= m) { p.pos = p.to.slice(); p.to = null; put(p, dx, dy); p.el.classList.remove('walk'); const f = p.done; p.done = null; if (f) f(); return; }
      p.pos[0] += dx / d * m; p.pos[1] += dy / d * m; put(p, dx, dy); });
    raf = people.length ? requestAnimationFrame(frame) : 0; if (!raf) at = 0;
  }
  const go = () => { if (!raf) raf = requestAnimationFrame(frame); };
  const free = () => MARKS.filter((x) => !people.some((p) => p.mark === x));
  function comeToWait(y) {   // up the stairs to a free mark, there to stand looking at the track
    const m = free()[Math.floor(Math.random() * free().length)]; if (m === undefined || people.length >= 4) return;
    const p = person(y, STAIRS, 0); if (!p) return; p.mark = m; requestAnimationFrame(() => { p.el.style.transition = 'opacity .5s'; p.el.style.opacity = '1'; });
    walk(p, [m + (Math.random() - 0.5) * 16, WAIT_Y], () => { p.el.classList.add('back'); p.el.classList.remove('turn', 'flip'); }); go();
  }
  function board(y) {   // the doors open: those waiting in, one or two off and away
    people.filter((p) => p.mark !== null).forEach((p, i) => setTimeout(() => { if (!people.includes(p)) return; walk(p, [p.mark, 128], () => gone(p)); go(); }, 400 + i * 500));
    const off = Math.floor(Math.random() * 3);
    for (let i = 0; i < off; i++) setTimeout(() => { if (!y.isConnected) return; const m = MARKS[Math.floor(Math.random() * MARKS.length)], p = person(y, [m, 126], 0); if (!p) return;
      requestAnimationFrame(() => { p.el.style.transition = 'opacity .4s'; p.el.style.opacity = '1'; }); walk(p, STAIRS, () => gone(p)); go(); }, 900 + i * 700);
  }
  function clear() { people.splice(0).forEach((p) => p.el.remove()); cancelAnimationFrame(raf); raf = 0; at = 0; }
  const ms = (s) => (s * 1000) / api.speed;
  const still = () => window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  // a train standing with its doors open: a button over it to get on (PLACE_USE.platform board1 / board2: RIDE.board)
  function boardBtn(y, track, on) {
    y.querySelectorAll(`.pf-board[data-use="board${track}"]`).forEach((b) => b.remove()); if (!on) return;
    const t = PLACE_USE.platform.find((x) => x.id === 'board' + track), w = y.querySelector('.yworld'); if (!t || !w) return; const [x0, y0, x1, y1] = t.box, b = document.createElement('button');
    b.type = 'button'; b.className = 'use-btn thing signed pf-board'; b.dataset.act = 'scene-use'; b.dataset.use = 'board' + track; b.setAttribute('aria-label', '搭車');
    b.style.cssText = `margin-left:${x0 - 600}px;bottom:${370 - y1}px;width:${x1 - x0}px;height:${y1 - y0}px;z-index:${Math.round(150 - (370 - y1) / 4)};--tx:50%;--ty:40%`;
    b.innerHTML = `<span class="tag">${ySign('bus', track === 1 ? '搭車（往白鷺）' : '搭車（往みなと港）')}</span>`; w.appendChild(b);
  }
  // one train's call: in (slowing), stopped with its doors open, its bell, doors shut, away
  async function call(y, mine, track, x) {
    const g = y.querySelector(`.pf-train[data-track="${track}"]`), alive = () => run === mine && y.isConnected; if (!g || !alive()) return;
    const from = track === 1 ? 1400 : -1400, wait = (s) => new Promise((ok) => setTimeout(ok, ms(s)));
    const svg = g.querySelector('g'); if (svg) svg.innerHTML = pfTrain(PF_NEAR.len, PF_NEAR.h, x, track === 2);   // its LED says where to
    cur = { track, to: x.to, kind: x.kind, phase: 'in' };
    g.style.transition = 'none'; g.style.transform = `translateX(${from}px)`; void g.getBoundingClientRect();
    g.style.transition = still() ? 'none' : `transform ${ms(6) / 1000}s cubic-bezier(.12, .62, .3, 1)`; g.style.transform = 'translateX(0px)';
    if (track === 1) SND.play('train-in'); else SND.play('train-in', { vol: 0.5 });
    await wait(6.2); if (!alive()) return;
    cur.phase = 'stop'; SND.play('door-chime', { vol: track === 1 ? 1 : 0.5 }); g.classList.add('open'); boardBtn(y, track, true); if (track === 1 && !quiet()) board(y);
    await wait(9); if (!alive()) return;
    SND.play('dep-bell', { vol: track === 1 ? 0.8 : 0.4 });
    await wait(4); if (!alive()) return;
    SND.play('door-chime', { vol: track === 1 ? 1 : 0.5 }); g.classList.remove('open'); boardBtn(y, track, false);
    await wait(1.4); if (!alive()) return;
    cur.phase = 'out'; g.style.transition = still() ? 'none' : `transform ${ms(6) / 1000}s cubic-bezier(.6, 0, .9, .6)`; g.style.transform = `translateX(${-from}px)`;
    SND.play('train-out', { vol: track === 1 ? 1 : 0.5 });
    await wait(6.2); cur = null;
  }
  // the departure board again each minute
  function boardRows(y) { const b = y.querySelector('.pf-dep'); if (b) b.innerHTML = pfBoardRows(); }
  async function mount(y, place) {
    const mine = ++run; cur = null; clear(); if (place !== 'platform') return;
    const wait = (s) => new Promise((ok) => setTimeout(ok, ms(s))), alive = () => run === mine && y.isConnected;
    const tick = setInterval(() => { if (!alive()) { clearInterval(tick); return; } boardRows(y); }, 30000);
    if (!quiet()) { for (let i = 0; i < 2; i++) { const m = free()[i * 2], p = person(y, [m, WAIT_Y]); if (p) { p.mark = m; p.el.classList.add('back'); } } const more = setInterval(() => { if (!alive()) { clearInterval(more); return; } if (!cur || cur.phase !== 'stop') comeToWait(y); }, 9000); }
    await wait(2);
    for (let k = 0; alive(); k++) {
      const now = sceneHour(), next = EKI.next(Math.floor(now), Math.floor((now % 1) * 60), 8), track = k % 2 ? 2 : 1;
      const x = next.find((t) => t.track === track) || { kind: '普通', to: track === 1 ? 'shirasagi' : 'minatoko' };
      await call(y, mine, track, x); if (!alive()) return;
      await wait(k % 2 ? 9 : 6);
    }
  }
  return api;
})();
