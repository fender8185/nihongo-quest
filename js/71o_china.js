'use strict';
// ---------- みなと中華街 (2026-11-14, 新手第一週 stage 4; docs/superpowers/specs/2026-11-14-beginner-week-design.md §6) ----------
// Up the bus line from the first day: the great gate (牌樓) with the street going on through it, red lanterns strung over
// everything, 王's 豚まん stand (陳 helps at lunch; a free taste a day), 龍鳳飯店, a panda mascot handing out flyers, the lion's
// head that bites for luck, a fortune teller's booth — and 漢字陷阱: words a Taiwanese reads at sight that mean something else in
// Japanese (手紙 is a letter, not toilet paper), on the signs, the menu, the T-shirts, the posters about the street.

// ---- the street ----
function chinatownHtml() {
  const F = 236, f = (n) => n.toFixed(1);
  // a string of red lanterns across, sagging, swaying; lit by night
  const lanterns = (y0, sag, n, k0) => { const at = (t) => [-20 + t * 1240, y0 + sag * 4 * t * (1 - t)];
    return `<path d="M${Array.from({ length: 21 }, (_, i) => at(i / 20).map(f).join(' ')).join(' L')}" fill="none" ${hs('#3b2a1c', '#14142a')} stroke-width="1.2"/>`
      + Array.from({ length: n }, (_, i) => { const [x, y] = at((i + 0.5) / n); return `<g class="fx-sway" style="animation-delay:-${((i + k0) * 0.37 % 3).toFixed(2)}s;animation-duration:${(3 + (i % 3) * 0.5).toFixed(1)}s"><circle class="glow" cx="${f(x)}" cy="${f(y + 16)}" r="26" fill="url(#glw)"/>
        <path d="M${f(x)} ${f(y)} v5" stroke="#3b2a1c" stroke-width="1"/><rect x="${f(x - 5)}" y="${f(y + 4)}" width="10" height="3" ${hc('#d9b04a', '#6a5a30')}/><ellipse cx="${f(x)}" cy="${f(y + 16)}" rx="11" ry="10" ${hc('#d0302a', '#ff8a5a')}/>
        <path d="M${f(x - 10)} ${f(y + 13)} q10 2 20 0 M${f(x - 10)} ${f(y + 19)} q10 2 20 0" fill="none" stroke="#8a1a1a" stroke-opacity=".45" stroke-width=".8"/><rect x="${f(x - 5)}" y="${f(y + 25)}" width="10" height="3" ${hc('#d9b04a', '#6a5a30')}/><path d="M${f(x)} ${f(y + 28)} v6" stroke="#d9b04a" stroke-width="1.6"/></g>`; }).join(''); };
  // the gate: two red pillars on stone feet, the painted beams, the plaque, a green tiled roof with its ends curled up, gold on the ridge
  const pillar = (x) => `<rect x="${x - 15}" y="${F - 20}" width="30" height="20" ${hc('#b8b0a0', '#2a2c48')}/><rect x="${x - 12}" y="${F - 24}" width="24" height="5" ${hc('#cfc7b8', '#30324e')}/>
    <rect x="${x - 9}" y="30" width="18" height="${F - 54}" ${hc('#c8322a', '#4a1e2a')}/><rect x="${x + 3}" y="30" width="6" height="${F - 54}" fill="#2b1c12" fill-opacity=".14"/><path d="M${x - 6} 40 V${F - 30}" stroke="#fff" stroke-opacity=".2" stroke-width="2"/>`;
  // through it: the street going on, smaller and paler, shopfronts either side with their signs, a lantern string far off
  const far = (() => { const vx = 240, vy = 152; let s = `<path d="M118 ${F} L${vx - 26} ${vy + 18} H${vx + 26} L362 ${F} Z" ${hc('#d8d0c0', '#2a2c48')}/>`;
    [[-1, ['#d0574b', '#e6b23c', '#3f9a8c']], [1, ['#e6b23c', '#d0574b', '#c8453a']]].forEach(([side, cs]) => { [0, 1, 2].forEach((k) => { const t0 = k / 3, t1 = (k + 1) / 3, x0 = side < 0 ? 118 + (vx - 30 - 118) * t0 : 362 - (362 - vx - 30) * t0, x1 = side < 0 ? 118 + (vx - 30 - 118) * t1 : 362 - (362 - vx - 30) * t1;
      const top = (x) => 96 + (vy - 50 - 96) * ((side < 0 ? x - 118 : 362 - x) / (vx - 30 - 118)) * 0.9, bot = (x) => F + (vy + 18 - F) * ((side < 0 ? x - 118 : 362 - x) / (vx - 30 - 118));
      s += `<path d="M${f(x0)} ${f(top(x0))} L${f(x1)} ${f(top(x1))} L${f(x1)} ${f(bot(x1))} L${f(x0)} ${f(bot(x0))} Z" ${hc(['#efe2c8', '#e6d6b8', '#f2e8d4'][k], '#262848')} opacity="${1 - k * 0.18}"/>`
        + `<path d="M${f(x0)} ${f(top(x0) + 12 * (1 - t0))} L${f(x1)} ${f(top(x1) + 12 * (1 - t1))} L${f(x1)} ${f(top(x1) + 26 * (1 - t1))} L${f(x0)} ${f(top(x0) + 26 * (1 - t0))} Z" ${hc(cs[k], '#5a2a3a')}/>`
        + `<path d="M${f(x0)} ${f(bot(x0) - 26 * (1 - t0))} L${f(x1)} ${f(bot(x1) - 26 * (1 - t1))} L${f(x1)} ${f(bot(x1))} L${f(x0)} ${f(bot(x0))} Z" ${hc('#8a5a34', '#ffd98a')} opacity=".7"/>`; }); });
      return s + `<path d="M126 108 Q240 140 354 108" fill="none" stroke="#3b2a1c" stroke-width=".8"/>${[150, 185, 220, 260, 295, 330].map((x) => `<ellipse cx="${x}" cy="${f(108 + 32 * 4 * ((x - 126) / 228) * (1 - (x - 126) / 228) * 0.25 + 6)}" rx="5" ry="4.6" ${hc('#d0302a', '#ff8a5a')}/>`).join('')}`; })();
  const gate = `<g data-fx="gate">${far}${pillar(110)}${pillar(370)}
    <rect x="92" y="84" width="296" height="12" ${hc('#c8322a', '#4a1e2a')}/><rect x="98" y="66" width="284" height="18" ${hc('#2f7a6a', '#1a3040')}/><path d="${Array.from({ length: 14 }, (_, i) => `M${108 + i * 20} 70 l5 5 l-5 5 l-5 -5 Z`).join(' ')}" ${hc('#e6c23a', '#8a7a40')}/>
    <rect x="194" y="36" width="92" height="40" ${hc('#d9b04a', '#7a6a3a')}/><rect x="199" y="41" width="82" height="30" ${hc('#a8262e', '#3a1424')}/><text x="240" y="50" text-anchor="middle" font-size="8" ${hc('#f6e08a', '#e8d08a')} ${SERIF}>みなと</text>
    <text x="240" y="67" text-anchor="middle" font-size="17" font-weight="700" ${hc('#f6e08a', '#f6e08a')} ${SERIF}>中華街</text>
    <rect x="86" y="24" width="308" height="12" ${hc('#c8322a', '#4a1e2a')}/><path d="${Array.from({ length: 30 }, (_, i) => `M${90 + i * 10} 36 v5`).join(' ')}" ${hs('#d9b04a', '#6a5a30')} stroke-width="4"/>
    <path d="M60 24 C82 23 94 18 104 10 L376 10 C386 18 398 23 420 24 L412 30 H68 Z" ${hc('#2f7a5a', '#163030')}/><path d="M104 10 L130 -16 H350 L376 10 Z" ${hc('#3f8a68', '#1a3838')}/>
    <path d="${Array.from({ length: 24 }, (_, i) => { const x = 112 + i * 11; return `M${x} 10 L${f(130 + (x - 104) * (220 / 272))} -16`; }).join(' ')}" ${hs('#2f6a50', '#122828')} stroke-width="1.4"/>
    <rect x="124" y="-22" width="232" height="7" rx="2" ${hc('#2a5a44', '#0e2020')}/><path d="M124 -18 q-12 -4 -10 -16 q6 6 14 4 Z M356 -18 q12 -4 10 -16 q-6 6 -14 4 Z" ${hc('#d9b04a', '#7a6a3a')}/><circle cx="240" cy="-28" r="6" ${hc('#d9b04a', '#7a6a3a')}/>
    <path d="M60 24 q-8 -2 -12 -10 M420 24 q8 -2 12 -10" fill="none" ${hs('#2f7a5a', '#163030')} stroke-width="3" stroke-linecap="round"/></g>`;
  // a red pillar-box with a sticker on it (手紙), a notice board, a rack of souvenir T-shirts (大丈夫)
  const post = `<g data-fx="post"><rect x="26" y="${F - 70}" width="34" height="70" rx="3" ${hc('#d0302a', '#4a1e2a')}/><path d="M24 ${F - 70} q19 -14 38 0 Z" ${hc('#b8262a', '#3a1424')}/><rect x="32" y="${F - 60}" width="22" height="4" rx="1" fill="#2b1c12"/><rect x="31" y="${F - 50}" width="24" height="16" ${hc('#fffdf6', '#c9c4e8')}/>
    <text x="43" y="${F - 38.6}" text-anchor="middle" font-size="9" font-weight="700" ${hc('#c8453a', '#7a4a6a')} ${SERIF}>手紙</text><path d="M28 ${F - 20} h30" stroke="#2b1c12" stroke-opacity=".2"/><rect x="${52}" y="${F - 68}" width="5" height="66" fill="#2b1c12" fill-opacity=".1"/></g>`;
  const notice = `<g data-fx="notice"><path d="M404 ${F} V${F - 40} M438 ${F} V${F - 40}" ${hs('#6e4f3a', '#2c2440')} stroke-width="3"/><rect x="398" y="${F - 92}" width="46" height="56" ${hc('#c8322a', '#4a1e2a')}/><rect x="402" y="${F - 88}" width="38" height="48" ${hc('#fffdf6', '#d8d4f0')}/>
    <text x="421" y="${F - 77}" text-anchor="middle" font-size="7" font-weight="700" ${hc('#c8453a', '#7a4a6a')} font-family="system-ui, sans-serif">お知らせ</text><text x="421" y="${F - 64}" text-anchor="middle" font-size="9.5" font-weight="700" ${hc('#3b2a1c', '#4a4060')} ${SERIF}>本日 無料</text><path d="M406 ${F - 56} h30 M406 ${F - 50} h26 M406 ${F - 44} h28" stroke="#3b2a1c" stroke-opacity=".3" stroke-width="1.4"/></g>`;
  const shirt = (x, c, ink, word) => `<g class="fx-sway" style="transform-origin:${x}px ${F - 96}px;animation-duration:3.6s"><path d="M${x} ${F - 96} v4" stroke="#8d9097" stroke-width="1.4"/><path d="M${x - 14} ${F - 90} l-7 6 l5 6 l3 -3 v24 h26 v-24 l3 3 l5 -6 l-7 -6 q-7 4 -14 0 q-7 4 -14 0 Z" ${hc(c, '#3a3c60')}/>${word ? `<text x="${x}" y="${F - 64}" text-anchor="middle" font-size="7.4" font-weight="700" fill="${ink}" ${SERIF}>${word}</text>` : ''}</g>`;
  const rack = `<g data-fx="shirt"><path d="M448 ${F} l4 -4 M492 ${F} l-4 -4 M452 ${F - 4} V${F - 98} M488 ${F - 4} V${F - 98} M448 ${F - 98} H492" ${hs('#8d9097', '#3a3c58')} stroke-width="2.4"/>${shirt(462, '#d0302a', '#fff', '')}${shirt(478, '#fbf8f0', '#2b2b33', '大丈夫')}</g>`;
  // 王's 豚まん stand: a red front with 福明 in gold, a giant 豚まん on the roof, a green awning with its ends curled up, the
  // counter with its steamers piled up and steaming, the menu hung under the awning
  const steamer = (x, y, w) => `<rect x="${x}" y="${y}" width="${w}" height="11" rx="2" ${hc('#d6b06a', '#5a4a3a')}/><path d="M${x} ${y + 3} h${w} M${x} ${y + 8} h${w}" stroke="#b08a4a" stroke-width=".8"/>`;
  const stand = `<rect x="452" y="64" width="250" height="${F - 64}" ${hc('#efe2c8', '#24264a')}/>
    <rect x="452" y="64" width="250" height="78" ${hc('#b8322a', '#4a1e2a')}/><rect x="458" y="70" width="238" height="66" fill="none" ${hs('#d9b04a', '#7a6a3a')} stroke-width="2"/>
    <text x="540" y="116" text-anchor="middle" font-size="34" font-weight="700" ${hc('#f6e08a', '#f6e08a')} ${SERIF}>福明</text><rect x="604" y="84" width="80" height="40" rx="3" ${hc('#fffdf6', '#e8e4ff')}/><text x="644" y="110" text-anchor="middle" font-size="17" font-weight="700" ${hc('#b8322a', '#7a3a4a')} ${SERIF}>豚まん</text>
    <g data-fx="bigbun"><ellipse cx="577" cy="64" rx="34" ry="5" fill="#2b1c12" fill-opacity=".12"/><path d="M545 63 C545 42 560 30 577 30 C594 30 609 42 609 63 Z" ${hc('#fbf6ec', '#c9c4e8')}/><path d="M592 33 C603 40 609 50 609 63 H596 C600 52 598 42 592 33 Z" fill="#2b1c12" fill-opacity=".08"/><path d="M577 31 C574 35 574 38 577 40 C580 38 580 35 577 31 Z M577 40 C570 38 564 41 561 45 M577 40 C584 38 590 41 593 45 M577 40 C574 44 572 48 571 52 M577 40 C580 44 582 48 583 52" fill="none" stroke="#e0d2b8" stroke-width="1.6" stroke-linecap="round"/></g>
    <path d="M440 158 C452 157 456 152 460 146 H694 C698 152 702 157 714 158 L708 164 H446 Z" ${hc('#2f7a5a', '#163030')}/><path d="M460 146 L468 138 H686 L694 146 Z" ${hc('#3f8a68', '#1a3838')}/><path d="${Array.from({ length: 22 }, (_, i) => `M${466 + i * 10.4} 146 l2 -8`).join(' ')}" ${hs('#2f6a50', '#122828')} stroke-width="1"/>
    <rect x="460" y="164" width="234" height="${F - 164}" ${hc('#5a3a2a', '#1a1428')}/><circle class="glow" cx="577" cy="190" r="70" fill="url(#glw)"/>
    <rect x="500" y="200" width="194" height="${F - 200}" ${hc('#8a5a34', '#2a2030')}/><rect x="500" y="200" width="194" height="6" ${hc('#a87a4a', '#3a2c40')}/><rect x="510" y="210" width="174" height="${F - 216}" ${hc('#b8322a', '#3a1424')}/><text x="597" y="228" text-anchor="middle" font-size="11" font-weight="700" ${hc('#f6e08a', '#e8d08a')} ${SERIF}>福明　本店</text>
    <g data-fx="seiro">${[0, 1, 2, 3].map((k) => steamer(512 - k * 0.6, 189 - k * 11, 52 + k * 1.2)).join('')}<path d="M510 145 q26 -9 56 0 Z" ${hc('#c49a52', '#4a3a30')}/>${[0, 1, 2].map((k) => `<g transform="translate(${526 + k * 12} 138)"><ellipse rx="9" ry="7" ${hcx('fx-steam', '#ffffff', '#9a9ec8', `animation-delay:-${k * 1.1}s`)}/></g>`).join('')}</g>
    <g data-fx="bmenu"><path d="M604 164 v6 M684 164 v6" stroke="#3b2a1c" stroke-width="1.2"/><rect x="598" y="168" width="92" height="30" rx="2" ${hc('#2b2b33', '#141428')}/>${[['ぶたまん', '250'], ['しょうろんぽう', '500'], ['ごまだんご', '200'], ['タピオカ', '450']].map(([n, p], i) => `<text x="${602 + (i % 2) * 46}" y="${179 + Math.floor(i / 2) * 11}" font-size="6.4" fill="#fbf8f0" font-family="system-ui, sans-serif">${n}</text><text x="${642 + (i % 2) * 46}" y="${179 + Math.floor(i / 2) * 11}" text-anchor="end" font-size="6.4" fill="#f6e08a" font-family="system-ui, sans-serif">${p}</text>`).join('')}</g>`;
  // the panda: someone in a panda suit with flyers, bobbing — a hug when tapped
  const panda = `<g data-fx="panda"><g transform="translate(733 ${F}) scale(.72) translate(-733 ${-F})"><g class="pbody fx-bob" style="transform-origin:733px ${F}px"><ellipse cx="733" cy="${F}" rx="22" ry="3.4" fill="#2b1c12" fill-opacity=".16"/>
    <rect x="718" y="${F - 26}" width="12" height="26" rx="5" fill="#2b2b33"/><rect x="736" y="${F - 26}" width="12" height="26" rx="5" fill="#2b2b33"/><path d="M712 ${F - 22} C710 ${F - 64} 720 ${F - 74} 733 ${F - 74} C746 ${F - 74} 756 ${F - 64} 754 ${F - 22} Z" fill="#fbfbf6"/>
    <path d="M714 ${F - 64} C704 ${F - 58} 704 ${F - 44} 710 ${F - 40}" stroke="#2b2b33" stroke-width="9" stroke-linecap="round" fill="none"/><path d="M752 ${F - 64} C762 ${F - 60} 764 ${F - 50} 760 ${F - 44}" stroke="#2b2b33" stroke-width="9" stroke-linecap="round" fill="none"/>
    <rect x="754" y="${F - 52}" width="14" height="18" rx="1" fill="#fffdf6" transform="rotate(12 761 ${F - 43})"/><path d="M757 ${F - 46} h8 M757 ${F - 42} h6" stroke="#d0453c" stroke-width="1" transform="rotate(12 761 ${F - 43})"/>
    <circle cx="733" cy="${F - 88}" r="22" fill="#fbfbf6"/><circle cx="715" cy="${F - 106}" r="8" fill="#2b2b33"/><circle cx="751" cy="${F - 106}" r="8" fill="#2b2b33"/>
    <ellipse cx="724" cy="${F - 90}" rx="6" ry="7.6" fill="#2b2b33" transform="rotate(-18 724 ${F - 90})"/><ellipse cx="742" cy="${F - 90}" rx="6" ry="7.6" fill="#2b2b33" transform="rotate(18 742 ${F - 90})"/><circle cx="725" cy="${F - 91}" r="2.2" fill="#fff"/><circle cx="741" cy="${F - 91}" r="2.2" fill="#fff"/>
    <ellipse cx="733" cy="${F - 80}" rx="3.4" ry="2.4" fill="#2b2b33"/><path d="M729 ${F - 75} q4 3 8 0" fill="none" stroke="#2b2b33" stroke-width="1.4" stroke-linecap="round"/><ellipse cx="719" cy="${F - 79}" rx="4" ry="2.4" fill="#f4a0a8" opacity=".6"/><ellipse cx="747" cy="${F - 79}" rx="4" ry="2.4" fill="#f4a0a8" opacity=".6"/></g></g></g>`;
  // 龍鳳飯店: two storeys of red under green tiled eaves, round lattice windows, its name in gold on black, a golden dragon
  // over the door, lanterns, the window of plastic food, a menu easel out front, a wet-floor sign (床), the lion's head
  const ryuho = `<rect x="766" y="14" width="236" height="${F - 14}" ${hc('#c03a30', '#3a1828')}/><rect x="980" y="14" width="22" height="${F - 14}" fill="#2b1c12" fill-opacity=".1"/>
    <path d="M752 16 C766 15 770 10 774 4 H994 C998 10 1002 15 1016 16 L1010 22 H758 Z" ${hc('#2f7a5a', '#163030')}/><path d="M774 4 L784 -6 H984 L994 4 Z" ${hc('#3f8a68', '#1a3838')}/>
    ${[810, 884, 958].map((x) => `<circle cx="${x}" cy="52" r="20" ${hc('#d9b04a', '#6a5a30')}/><circle cx="${x}" cy="52" r="17" ${hc('#cfe6ec', '#ffd98a')}/><path d="M${x - 17} 52 h34 M${x} 35 v34 M${x - 12} 40 l24 24 M${x + 12} 40 l-24 24" ${hs('#a8262e', '#5a2a30')} stroke-width="2"/>`).join('')}
    <path d="M760 92 C772 91 776 86 780 80 H988 C992 86 996 91 1008 92 L1002 98 H766 Z" ${hc('#2f7a5a', '#163030')}/>
    <rect x="796" y="100" width="176" height="28" ${hc('#1c1c24', '#0c0c18')}/><rect x="799" y="103" width="170" height="22" fill="none" ${hs('#d9b04a', '#7a6a3a')} stroke-width="1.4"/><text x="884" y="120.6" text-anchor="middle" font-size="17" font-weight="700" letter-spacing="6" ${hc('#f6e08a', '#f6e08a')} ${SERIF}>龍鳳飯店</text>
    <rect x="776" y="140" width="66" height="54" ${hc('#5a3a2a', '#1a1428')}/><rect x="780" y="144" width="58" height="46" ${hc('#e8f2f6', '#ffe2a0')}/><path d="M780 170 h58" stroke="#8d9097" stroke-width="1.4"/>
    <path d="M786 166 a9 4 0 0 0 18 0 l-2 -5 h-14 Z" fill="#c8433a"/><ellipse cx="795" cy="161" rx="9" ry="2.6" fill="#f2d98a"/><path d="M812 166 h22 l-2 4 h-18 Z" fill="#f8f9fb"/>${[0, 1, 2].map((k) => `<path d="M${815 + k * 6} 165 q3 -5 6 0 Z" fill="#e8c070"/>`).join('')}<path d="M788 186 h44" stroke="#c4bdb0" stroke-width="3"/>
    <rect x="846" y="136" width="10" height="${F - 136}" ${hc('#a8262e', '#3a1424')}/><rect x="928" y="136" width="10" height="${F - 136}" ${hc('#a8262e', '#3a1424')}/><rect x="856" y="146" width="72" height="${F - 146}" ${hc('#6e2a24', '#1c1020')}/>
    ${[0, 1].map((k) => `<rect x="${859 + k * 34}" y="150" width="32" height="${F - 152}" ${hc('#a8483a', '#2a1828')}/><path d="${[0, 1, 2, 3, 4].map((r) => `M${862 + k * 34} ${158 + r * 15} h26`).join(' ')} ${[0, 1, 2].map((c) => `M${866 + k * 34 + c * 9} 154 V${F - 6}`).join(' ')}" ${hs('#d9b04a', '#5a4a30')} stroke-width="1"/>`).join('')}
    <g transform="translate(892 136)"><circle r="12" ${hc('#d9b04a', '#7a6a3a')}/><path d="M-7 4 C-9 -3 -3 -8 2 -6 C6 -4 7 0 4 3 C1 6 -4 5 -4 2 C-4 -1 0 -2 1 0" fill="none" stroke="#a8262e" stroke-width="1.6" stroke-linecap="round"/><circle cx="-1" cy="-5" r="1" fill="#a8262e"/></g>
    ${[836, 948].map((x, k) => `<g class="fx-sway" style="animation-delay:-${k * 1.2}s"><circle class="glow" cx="${x}" cy="160" r="30" fill="url(#glw)"/><path d="M${x} 138 v6" stroke="#3b2a1c"/><rect x="${x - 6}" y="143" width="12" height="3" fill="#d9b04a"/><ellipse cx="${x}" cy="157" rx="12" ry="12" ${hc('#d0302a', '#ff8a5a')}/><text x="${x}" y="161" text-anchor="middle" font-size="9" font-weight="700" fill="#2b1c12" ${SERIF}>${k ? '鳳' : '龍'}</text><rect x="${x - 6}" y="168" width="12" height="3" fill="#d9b04a"/></g>`).join('')}
    <g data-fx="rmenu"><path d="M780 ${F} L790 ${F - 48} M812 ${F} L802 ${F - 48}" ${hs('#6e4f3a', '#2c2440')} stroke-width="2.4"/><rect x="776" y="${F - 70}" width="40" height="44" rx="2" ${hc('#2b2b33', '#141428')}/><rect x="776" y="${F - 70}" width="40" height="44" rx="2" fill="none" ${hs('#d9b04a', '#6a5a30')} stroke-width="1.4"/>
      <text x="796" y="${F - 58}" text-anchor="middle" font-size="6.4" fill="#f6e08a" font-family="system-ui, sans-serif">本日のおすすめ</text><text x="796" y="${F - 44}" text-anchor="middle" font-size="9" font-weight="700" fill="#fbf8f0" ${SERIF}>湯</text><text x="796" y="${F - 33}" text-anchor="middle" font-size="6" fill="#fbf8f0" opacity=".8" font-family="system-ui, sans-serif">人参・大根</text></g>
    <g data-fx="yuka"><path d="M940 ${F} L950 ${F - 40} L960 ${F} M942 ${F - 8} h16" fill="none" ${hs('#e6c23a', '#6a5a30')} stroke-width="3"/><path d="M944 ${F - 32} L950 ${F - 40} L956 ${F - 32} L960 ${F - 4} H940 Z" ${hc('#f2c94c', '#5a5030')}/><text x="950" y="${F - 18}" text-anchor="middle" font-size="9" font-weight="700" fill="#2b2b33" ${SERIF}>床</text><text x="950" y="${F - 9}" text-anchor="middle" font-size="5" fill="#2b2b33" font-family="system-ui, sans-serif">ちゅうい</text></g>
    <g data-fx="shishi"><g class="shead"><path d="M984 120 C982 110 990 104 996 108 C1004 104 1010 112 1006 120 C1010 128 1004 136 996 134 C988 138 980 130 984 120 Z" fill="#d0302a"/><path d="M986 112 q4 -6 8 0 q4 -6 8 0" fill="none" stroke="#f6e08a" stroke-width="2"/><circle cx="991" cy="118" r="2.6" fill="#fff"/><circle cx="1001" cy="118" r="2.6" fill="#fff"/><circle cx="991" cy="118" r="1.2" fill="#2b2b33"/><circle cx="1001" cy="118" r="1.2" fill="#2b2b33"/><path d="M988 127 h16 v4 h-16 Z" fill="#fff"/><path d="M990 127 v4 M994 127 v4 M998 127 v4 M1002 127 v4" stroke="#d0302a" stroke-width=".8"/></g></g>`;
  // the fortune teller's booth: a little red roof, 占 on a paper hung down, a cloth over the table, the crystal ball
  const booth = `<g data-fx="uranai"><path d="M1010 ${F} V${F - 96} M1062 ${F} V${F - 96}" ${hs('#6e4f3a', '#2c2440')} stroke-width="3"/><path d="M1002 ${F - 96} L1036 ${F - 116} L1070 ${F - 96} Z" ${hc('#c8322a', '#4a1e2a')}/>
    <rect x="1020" y="${F - 92}" width="14" height="34" ${hc('#fffdf6', '#d8d4f0')}/><text x="1027" y="${F - 70}" text-anchor="middle" font-size="12" font-weight="700" ${hc('#c8453a', '#7a4a6a')} ${SERIF}>占</text><rect x="1038" y="${F - 92}" width="20" height="26" ${hc('#fbe4dc', '#3a3c60')}/><text x="1048" y="${F - 82}" text-anchor="middle" font-size="5.6" ${hc('#b8442c', '#7a4a6a')} font-family="system-ui, sans-serif">恋愛運</text><path d="M1042 ${F - 77} h12 M1042 ${F - 72} h10" stroke="#b8442c" stroke-opacity=".5"/>
    <path d="M1008 ${F - 38} H1064 L1068 ${F} H1004 Z" ${hc('#6b4d8a', '#241c3a')}/><path d="M1008 ${F - 38} H1064" stroke="#d9b04a" stroke-width="1.6"/><circle class="glow" cx="1036" cy="${F - 48}" r="20" fill="url(#glw)"/><circle cx="1036" cy="${F - 48}" r="10" ${hc('#cfe6f6', '#a8d0ff')}/><circle cx="1032" cy="${F - 52}" r="3" fill="#fff" opacity=".7"/><path d="M1029 ${F - 38} h14 l-2 -3 h-10 Z" fill="#d9b04a"/></g>`;
  return `<svg class="land tall china-land" viewBox="0 -400 1200 770" preserveAspectRatio="xMidYMax slice">${GLOW_DEFS}
      <path class="far" d="M0 118 C150 98 300 110 420 116 S640 96 780 106 S1000 124 1120 104 S1180 100 1200 106 V370 H0 Z"/>
      <path d="M1100 140 V60 L1110 52 H1150 L1160 60 V140 Z M1104 60 h52 M1100 84 h60 M1100 108 h60" ${hc('#c4b6a8', '#1c1e3a')} opacity=".7"/><path d="M1094 62 L1130 40 L1166 62 Z M1096 86 L1130 68 L1164 86 Z M1098 110 L1130 94 L1162 110 Z" ${hc('#7a9a88', '#141c30')} opacity=".7"/>
      ${lanterns(-118, 30, 18, 0)}${lanterns(-80, 36, 16, 7)}
      ${gate}${post}${notice}${stand}${rack}${panda}${ryuho}${booth}
      <rect class="pave" x="-20" y="${F}" width="1240" height="90"/>${Array.from({ length: 26 }, (_, j) => `<path class="seam" d="M${j * 48 - 20} ${F + 22 + (j % 3) * 22} h30"/>`).join('')}
      ${busRoad()}
    </svg>
    ${yHeroHtml()}
    ${busPoleHtml('chinatown')}
    <div class="ysel"></div>`;
}

// ---- 漢字陷阱: [word, reading, what it means in Japanese, what a Taiwanese reads it as, a silly third, what happens when read the
// Chinese way, the note] — on the street's signs, each sign its own words ----
const TRAPS = [
  ['手紙', 'てがみ', '信', '衛生紙', '手套', '（你拿著一捲衛生紙去郵局，說要寄給朋友……）', '「手紙」是信。衛生紙是「トイレットペーパー」。'],
  ['切手', 'きって', '郵票', '把手切掉', '剪刀', '（陳嚇得把手藏到背後）', '「切手」是郵票，寄信要貼。'],
  ['新聞', 'しんぶん', '報紙', '電視上的新聞', '新的聞香杯', '（你打開電視等「しんぶん」，老闆遞給你一份報紙）', '「新聞」是報紙；電視上的新聞是「ニュース」。'],
  ['留守', 'るす', '不在家', '留下來看家', '留學生守則', '（你在門口乖乖等著看家，等了一小時——老闆根本不在）', '「留守」是不在家。門上掛「留守」就是「現在沒人」。'],
  ['湯', 'ゆ', '熱水', '湯（料理）', '溫泉蛋', '（你點了一碗「ゆ」，老闆端來一杯白開水）', '「湯」是熱水，錢湯的暖簾上也寫「ゆ」。湯是「スープ」。'],
  ['人参', 'にんじん', '紅蘿蔔', '人蔘', '參加的人', '（你以為要喝補湯，結果來了一盤炒紅蘿蔔）', '「人参」是紅蘿蔔。人蔘是「高麗人参」。'],
  ['大根', 'だいこん', '白蘿蔔', '很粗的樹根', '大跟班', '（你在找樹根，老闆遞給你一根白蘿蔔）', '「大根」是白蘿蔔，關東煮裡的那個。'],
  ['油断', 'ゆだん', '大意、疏忽', '沒油了', '油炸斷掉', '（你跑去加油站問有沒有油……）', '「油断大敵」是「大意是最大的敵人」。'],
  ['大丈夫', 'だいじょうぶ', '沒問題、不要緊', '男子漢大丈夫', '很大的老公', '（你對著T恤擺出男子漢的姿勢）', '日本人最常說的「大丈夫？」是「還好嗎？」。'],
  ['丈夫', 'じょうぶ', '結實、耐用', '老公', '一丈長的人', '（老闆：這個包包很「丈夫」喔——你：它是我老公？）', '「丈夫」是東西耐用、身體健康。老公是「夫」或「主人」。'],
  ['我慢', 'がまん', '忍耐', '我很慢', '自我感覺良好', '（你：我很慢……老闆：不是啦，是叫你忍住）', '「我慢して」是「忍一下」。'],
  ['真面目', 'まじめ', '認真', '真正的面目', '真的有臉', '（你等著看誰露出真面目，結果大家只是很認真）', '「真面目な人」是認真的人。'],
  ['勉強', 'べんきょう', '讀書、學習', '勉強、不情願', '免費加強', '（你：我不想勉強學日文……陳：你現在就在「勉強」啊！）', '「勉強します」是「我要念書」。'],
  ['床', 'ゆか', '地板', '床（睡覺的）', '床邊故事', '（你準備躺下來睡，地上濕濕的……）', '「床」是地板，立牌是說地板很滑。床是「ベッド」。'],
  ['階段', 'かいだん', '樓梯', '階段、時期', '鬼故事', '（你在找「下一個階段」，前面是一道樓梯）', '「階段」是樓梯。（鬼故事「怪談」也念かいだん！）'],
  ['邪魔', 'じゃま', '打擾、礙事', '邪惡的魔鬼', '斑馬', '（你擺出驅魔的姿勢）', '「お邪魔します」是「打擾了」，進別人家時說。'],
  ['迷惑', 'めいわく', '麻煩、困擾', '困惑、不解', '迷路的星球', '（「ご迷惑を おかけします」不是說你很困惑，是「造成您的不便」）', '「迷惑」是給人添麻煩。'],
  ['走る', 'はしる', '跑', '走路', '走廊', '（「はしらないで」——你以為不准走路，就站著不動）', '「走る」是跑。走路是「歩く（あるく）」。'],
  ['勝手', 'かって', '擅自、隨便', '勝利的手', '自己買', '（你舉起勝利的手——立牌寫的是「請勿擅自進入」）', '「勝手に」是擅自、隨便。'],
  ['愛人', 'あいじん', '外遇對象', '愛人、伴侶', '愛吃的人', '（你介紹另一半：「わたしの 愛人です」——全場安靜）', '在日本「愛人」是外遇對象！伴侶是「恋人」或「パートナー」。'],
  ['皮肉', 'ひにく', '諷刺、挖苦', '皮和肉', '皮蛋肉粥', '（你點了一份「ひにく」，老闆：我們不賣諷刺）', '「皮肉を言う」是說風涼話。'],
  ['怪我', 'けが', '受傷', '怪我（都是我的錯）', '奇怪的我', '（你跌倒了大喊「怪我！」——大家衝過來問你有沒有受傷）', '「怪我」是受傷。「けがを しました」是「我受傷了」。'],
  ['放心', 'ほうしん', '發呆、魂不守舍', '放心', '放假的心情', '（你說「我很放心」，大家以為你靈魂出竅了）', '「放心状態」是發呆。放心是「安心」。'],
  ['娘', 'むすめ', '女兒', '媽媽', '新娘', '（老闆介紹「うちの娘です」，你對著小女孩喊「阿姨好」）', '「娘」是女兒。媽媽是「母（はは）」。'],
  ['先生', 'せんせい', '老師、醫生', '先生、丈夫', '先出生的人', '（你以為「林先生」是林老師的老公，其實就是林老師本人）', '「先生」是老師、醫生。'],
  ['無料', 'むりょう', '免費', '沒有材料', '無聊', '（你以為店裡沒料了，轉身就走——錯過免費試吃！）', '「無料」是免費。'],
  ['告訴', 'こくそ', '控告', '告訴、跟別人說', '告白訴苦', '（你說「我要告訴林老師」，大家以為你要告她）', '「告訴」是提告。跟別人說是「言う」或「伝える」。'],
  ['検討', 'けんとう', '研究考慮', '檢討、反省', '肩膀很痛', '（老闆說「検討します」，你以為他在反省——其實是委婉的拒絕）', '「検討します」常常是「我們再考慮看看」＝委婉的不要。'],
  ['作業', 'さぎょう', '工作、施工', '學校的功課', '昨夜', '（你看到「作業中」，以為裡面在寫功課）', '「作業中」是施工中、工作中。功課是「宿題（しゅくだい）」。'],
  ['工夫', 'くふう', '下工夫、想辦法', '功夫（武術）', '工人和農夫', '（你擺出功夫的架式）', '「工夫する」是動腦想辦法。武術是「カンフー」。'],
  ['大家', 'おおや', '房東', '大家、所有人', '很大的家', '（你對全場喊「大家好」——房東阿伯回頭了）', '「大家」念おおや是房東。大家是「みなさん」。'],
  ['結束', 'けっそく', '團結', '結束', '結帳很快', '（「チームの結束」——你以為球隊解散了）', '「結束」是團結。結束是「終わり」。'],
  ['汽車', 'きしゃ', '火車（蒸汽火車）', '汽車', '氣死了的車', '（你在找停車場，結果走到了火車站）', '「汽車」是火車。汽車是「車（くるま）」。']
];
// where each is written on the street (sign → its words) and how it is put
const TRAP_SIGNS = {
  post: ['郵筒上貼著：', ['手紙', '切手', '新聞', '留守']],
  menu: ['飯店的看板寫著：', ['湯', '人参', '大根', '油断']],
  shirt: ['T恤上印著：', ['大丈夫', '丈夫', '我慢', '真面目', '勉強']],
  yuka: ['店門口的立牌寫著：', ['床', '階段', '邪魔', '迷惑', '走る', '勝手']],
  uranai: ['占卜攤的海報寫著：', ['愛人', '皮肉', '怪我', '放心', '娘', '先生']],
  notice: ['公告上寫著：', ['無料', '告訴', '検討', '作業', '工夫', '大家', '結束', '汽車']]
};

const CHINA = (() => {
  const solved = () => (state.town.traps = state.town.traps || {});
  const of = (w) => TRAPS.find((t) => t[0] === w);
  // a sign tapped: its next word not yet seen through (all done: any of them again), three meanings to pick from
  function trap(yard, sign, word) {
    const [lead, words] = TRAP_SIGNS[sign] || []; if (!words) return;
    const s = solved(), w = word || words.find((x) => !s[x]) || words[Math.floor(Math.random() * words.length)], t = of(w); if (!t) return;
    const [ja, rd, right, wrong, silly, oops, note] = t, opts = shuffle([[right, 'r'], [wrong, 't'], [silly, 's']]);
    const n = () => TRAPS.filter((x) => s[x[0]]).length;
    const html = `<button type="button" class="cls-x" data-cls="x" aria-label="關閉">✕</button><div class="tp-head"><b>漢字陷阱</b><span>已破解 ${n()}／${TRAPS.length}</span></div>
      <p class="tp-lead">${esc(lead)}</p><div class="tp-word" lang="ja"><ruby>${esc(ja)}<rt>${esc(rd)}</rt></ruby><button type="button" class="tp-say" data-say="${esc(rd)}" aria-label="念出來">${icon('speaker')}</button></div>
      <p class="tp-q">在日文裡，這是什麼意思？</p><div class="tp-opts">${opts.map(([o, k]) => `<button type="button" class="tp-opt" data-k="${k}">${esc(o)}</button>`).join('')}</div>
      <p class="tp-react" hidden></p><div class="tp-done" hidden><p class="tp-note">${esc(note)}</p><div class="kr-btns">${words.length > 1 ? '<button type="button" class="btn btn-primary" data-cls="next">下一個</button>' : ''}<button type="button" class="btn" data-cls="x">好</button></div></div>`;
    CLASS.card('cls-trap', '漢字陷阱', html, (e) => {
      const sb = e.target.closest('[data-say]'); if (sb) { speak(sb.dataset.say); return; }
      if (e.target.closest('[data-cls="next"]')) { const i = words.indexOf(w), nx = words.find((x, k) => k > i && !s[x]) || words[(i + 1) % words.length]; trap(yard, sign, nx); return; }
      const b = e.target.closest('.tp-opt'); if (!b || b.disabled) return;
      const card = b.closest('.cls-card'), react = card.querySelector('.tp-react');
      if (b.dataset.k !== 'r') {   // read the Chinese way (or something sillier): what happens, and try again
        b.disabled = true; b.classList.add('bad'); b.classList.remove('shake'); void b.offsetWidth; b.classList.add('shake'); playSfx('bad');
        react.hidden = false; react.textContent = b.dataset.k === 't' ? oops : '差太遠了啦！再想想看。'; return;
      }
      b.classList.add('ok'); card.querySelectorAll('.tp-opt').forEach((x) => { x.disabled = true; }); playSfx('good'); speak(rd);
      react.hidden = true; card.querySelector('.tp-done').hidden = false;
      if (!s[w]) { s[w] = todayStr(); saveState(); CLASS.playKoto(1, '識破漢字陷阱'); card.querySelector('.tp-head span').textContent = `已破解 ${n()}／${TRAPS.length}`; }
    });
  }
  // 王's free taste: a 豚まん a day while he is at his stand (had as bought, no 円)
  const TASTED = 'nq_taste';
  function taste(yard, t) {
    if (!TOWNEV.here('chinatown').some((p) => p.id === 'wang')) { toast('蒸籠是空的。福明的老闆不在。', 3000); return; }
    let had = ''; try { had = localStorage.getItem(TASTED) || ''; } catch (e) { /* none kept */ }
    if (had === todayStr()) { TALK.open(yard, 'wang', [['wang', 'ししょくは いちにち ひとつ！ また あした！', '試吃一天一個喔！明天再來！']], null, null, { ev: true }); return; }
    TALK.open(yard, 'wang', [['wang', 'ししょく、どうぞ！ ハオチー！', '試吃，請用！好吃喔！'], ['hero', 'ありがとうございます！', '謝謝！']], () => {
      try { localStorage.setItem(TASTED, todayStr()); } catch (e) { /* once more tomorrow anyway */ }
      YEN.treat(yard, t, 'butaman', 'butaman');
    }, null, { ev: true });
  }
  const lines = (add) => { add('wang', 'ししょくは いちにち ひとつ！ また あした！'); add('wang', 'ししょく、どうぞ！ ハオチー！'); };
  return { trap, taste, lines, TRAPS };
})();
