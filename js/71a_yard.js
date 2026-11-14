'use strict';
// 院子: the yard's things, the yard and the scenes outside (renderOutside) (out of 71_today.js, 2026-11-11)
// ---------- the yard's things (1.2.0): drawn facing us in the hero's units (feet at 0, x round 0), scaled with distance like
// him (yScale) and darker by night like him. box: their drawing's [x, y, width, height]; glow: [x, y, r] of a light by night ----------
// the Christmas yard wares' bulbs (2026-11-14): the big tree's lights along its strings, the light-up reindeer's along its wire
const q1 = (v) => Math.round(v * 10) / 10;
const YARD_TREE_BULBS = [[-50.0, -26.3, '#ffd36a'], [-38.0, -30.7, '#ff7a6a'], [-26.0, -34.8, '#8fd0ff'], [-14.0, -38.6, '#9fe6a0'], [-2.0, -42.0, '#ffd36a'], [10.0, -44.9, '#ff7a6a'], [22.0, -47.3, '#8fd0ff'], [34.0, -49.3, '#9fe6a0'], [46.0, -51.1, '#ffd36a'], [-38.6, -90.2, '#ff7a6a'], [-27.9, -94.3, '#8fd0ff'], [-17.1, -98.2, '#9fe6a0'], [-6.4, -101.5, '#ffd36a'], [4.4, -104.3, '#ff7a6a'], [15.1, -106.5, '#8fd0ff'], [25.9, -108.1, '#9fe6a0'], [36.6, -109.4, '#ffd36a'], [-27.6, -144.2, '#ff7a6a'], [-18.7, -148.4, '#8fd0ff'], [-9.9, -152.0, '#9fe6a0'], [-1.0, -155.0, '#ffd36a'], [7.9, -157.2, '#ff7a6a'], [16.7, -158.6, '#8fd0ff'], [25.6, -159.6, '#9fe6a0'], [-13.8, -192.8, '#ffd36a'], [-5.2, -197.4, '#ff7a6a'], [3.2, -199.9, '#8fd0ff'], [11.8, -200.3, '#9fe6a0']];
const YARD_DEER = 'M-30 -50 Q-28 -74 -2 -72 Q24 -74 30 -56 Q30 -48 22 -46 L22 0 M22 -46 L28 -2 M-24 -48 L-26 0 M-24 -48 L-18 -2 M-28 -64 Q-34 -80 -36 -92 M-36 -92 Q-48 -96 -52 -88 Q-50 -82 -40 -84 Q-36 -86 -36 -92 M-38 -96 L-32 -112 M-34 -106 L-26 -114 M-40 -96 L-46 -114 M-44 -108 L-52 -116 M30 -60 Q36 -66 34 -70 M-2 -72 Q-14 -50 -30 -50';
const YARD_DEER_BULBS = [[-30, -50], [-26, -64], [-16, -71], [-4, -72], [8, -73], [20, -70], [28, -60], [26, -48], [22, -34], [22, -18], [22, -2], [25, -24], [27, -10], [-25, -34], [-26, -14], [-25, -2], [-21, -30], [-19, -12], [-31, -74], [-34, -84], [-36, -92], [-46, -94], [-51, -88], [-44, -83], [-33, -108], [-28, -113], [-44, -108], [-50, -115], [33, -67], [-14, -58], [-22, -52]];
const YARD = (() => {
  const SHADE = (rx, ry = 6) => `<ellipse rx="${rx}" ry="${ry}" fill="#2b1c12" fill-opacity=".16"/>`;
  // 2026-11-11 (the user: finer): each thing in its own pencils, a few more shapes inside the same outline — the telescope's
  // tube shaded underneath with a ring at its end, the lens at the front, the finder on its two brackets, a focus knob, a bolt
  // and a lock on the mount, the legs lit along one side with rubber feet and a spreader; the stone lantern's stones shaded on
  // the right and lit on the left, specks in them, lotus petals round its platform, the firebox framed with a sun and a moon cut
  // through its sides (lit by night with the window), its roof ridged with curled tips and shaded under the eaves, more moss;
  // the bench's wood grained, its legs shaded, the red cloth hemmed with folds, the tea in its cup; the tanuki's ears under the
  // hat, his tail, a glaze on him, shines in his eyes, toes, the hat woven and the bottle labelled; the pond's stones lit on
  // top, the water shaded under the far bank and deeper in the middle, veins on the lily pads
  const ART = {
    telescope: { box: [-62, -146, 124, 152], draw: () => `${SHADE(34)}<path d="M0 -84 L4 -3" stroke="#6f4c33" stroke-width="5" stroke-linecap="round"/><path d="M4 -3 L3.9 -6" stroke="#3a3328" stroke-width="5.4" stroke-linecap="round"/>
      <path d="M-17.4 -37 H16.4" stroke="#7a5638" stroke-width="2.2" stroke-linecap="round"/><path d="M0 -84 L-32 0 M0 -84 L30 0" fill="none" stroke="#8f6444" stroke-width="5.4" stroke-linecap="round"/>
      <path d="M-2.4 -81.5 L-31.6 -4.9 M-.3 -80.5 L27 -4.1" stroke="#b58a60" stroke-width="1.4" stroke-linecap="round"/><path d="M-32 0 L-30.9 -3 M30 0 L29 -3" stroke="#3a3328" stroke-width="5.8" stroke-linecap="round"/>
      <rect x="-18.1" y="-45" width="5" height="4" rx="1" fill="#3a3d4c" transform="rotate(21 -15.6 -43)"/><rect x="12.1" y="-45" width="5" height="4" rx="1" fill="#3a3d4c" transform="rotate(-20 14.6 -43)"/>
      <circle cy="-87" r="6.4" fill="#3a3d4c"/><circle cy="-87" r="2.4" fill="#6a6e80"/><path d="M5 -84 L10.4 -81" stroke="#3a3d4c" stroke-width="2.2" stroke-linecap="round"/><circle cx="11.2" cy="-80.6" r="2.4" fill="#4a4e60"/>
      <g transform="translate(0 -92) rotate(-28)"><rect x="-56" y="-6" width="12" height="12" rx="2.4" fill="#3a3d4c"/><path d="M-55 -4.6 H-46" stroke="#fff" stroke-opacity=".22" stroke-width="1.2" stroke-linecap="round"/><rect x="-52" y="6" width="4.4" height="5" rx="1.2" fill="#2a2c38"/>
        <rect x="-46" y="-10" width="80" height="20" rx="4" fill="#f2efe8"/><path d="M-46 3 H34 V6 a4 4 0 0 1 -4 4 H-42 a4 4 0 0 1 -4 -4 Z" fill="#2b1c12" fill-opacity=".12"/><rect x="-44" y="-10" width="3" height="20" fill="#d8d3c8"/><rect x="22" y="-10" width="2" height="20" fill="#d8d3c8"/>
        <rect x="32" y="-12" width="14" height="24" rx="3" fill="#5a68d8"/><path d="M32 5 H46 V9 a3 3 0 0 1 -3 3 H35 a3 3 0 0 1 -3 -3 Z" fill="#2b1c12" fill-opacity=".16"/><path d="M34.6 -9.8 H43.4" stroke="#fff" stroke-opacity=".38" stroke-width="1.4" stroke-linecap="round"/>
        <ellipse cx="46" rx="2.4" ry="10" fill="#26325e"/><ellipse cx="46.4" cy="-3.6" rx=".9" ry="3.4" fill="#bfe0ff" fill-opacity=".85"/>
        <rect x="-12" y="-11" width="6" height="22" fill="#5a68d8" fill-opacity=".85"/><rect x="0" y="-12" width="3" height="2.6" fill="#8a8578"/><rect x="13" y="-12" width="3" height="2.6" fill="#8a8578"/>
        <rect x="-4" y="-18" width="22" height="7" rx="2" fill="#d8d3c8"/><path d="M-3 -13.4 H17 V-12.6 a1.6 1.6 0 0 1 -1.6 1.6 H-1.4 a1.6 1.6 0 0 1 -1.6 -1.6 Z" fill="#2b1c12" fill-opacity=".12"/><rect x="-7" y="-16.4" width="3.4" height="3.8" rx="1" fill="#3a3d4c"/><ellipse cx="18" cy="-14.5" rx="1.1" ry="3.1" fill="#26325e"/>
        <path d="M-40 -5 H28" stroke="#fff" stroke-opacity=".6" stroke-width="2.4" stroke-linecap="round"/></g>` },
    stonelantern: { box: [-42, -146, 84, 152], glow: [0, -93, 34], draw: () => `${SHADE(30, 5.5)}<path d="M-26 0 L-22 -12 H22 L26 0 Z" fill="#9c988e"/><path d="M-22 -12 H22 L23.2 -8.6 H-23.2 Z" fill="#b0aca2"/><path d="M9 -8.6 H23.2 L26 0 H11 Z" fill="#2b1c12" fill-opacity=".1"/>
      <path d="M-8 -12 L-7 -70 H7 L8 -12 Z" fill="#aaa69c"/><path d="M2.6 -70 H7 L8 -12 H3 Z" fill="#2b1c12" fill-opacity=".11"/><path d="M-5.6 -66 L-6.4 -16" stroke="#fff" stroke-opacity=".2" stroke-width="1.4" stroke-linecap="round"/><path d="M-7 -70 H7 V-66.4 H-7 Z" fill="#2b1c12" fill-opacity=".14"/>
      <rect x="-10" y="-46" width="20" height="5" rx="2" fill="#9c988e"/><path d="M-9 -45.2 H9" stroke="#fff" stroke-opacity=".22" stroke-width="1"/><path d="M4 -46 H8 a2 2 0 0 1 2 2 V-43 a2 2 0 0 1 -2 2 H4 Z" fill="#2b1c12" fill-opacity=".1"/>
      <path d="M-24 -70 L-18 -80 H18 L24 -70 Z" fill="#9c988e"/><path d="M-18 -80 H18 L19.4 -77.6 H-19.4 Z" fill="#b0aca2"/><path d="M-21.4 -70.6 q2.7 -4.6 5.4 0 q2.7 -4.6 5.4 0 q2.7 -4.6 5.4 0 q2.7 -4.6 5.4 0 q2.7 -4.6 5.4 0 q2.7 -4.6 5.4 0 q2.7 -4.6 5.4 0 q2.7 -4.6 5.4 0" fill="none" stroke="#857f75" stroke-width="1"/><path d="M10 -80 H18 L24 -70 H14 Z" fill="#2b1c12" fill-opacity=".08"/>
      <rect x="-17" y="-106" width="34" height="26" rx="2" fill="#aaa69c"/><path d="M8 -106 H15 a2 2 0 0 1 2 2 V-82 a2 2 0 0 1 -2 2 H8 Z" fill="#2b1c12" fill-opacity=".1"/><path d="M-17 -106 H17 V-101.6 H-17 Z" fill="#2b1c12" fill-opacity=".16"/>
      <rect x="-10.6" y="-102.6" width="21.2" height="19.2" rx="2" fill="#8f8b81"/><rect x="-9" y="-101" width="18" height="16" rx="1.5" style="fill:color-mix(in srgb,#4a4842 calc(var(--day,1)*100%),#ffd27a)"/>
      <circle cx="-13.6" cy="-93" r="1.7" style="fill:color-mix(in srgb,#4a4842 calc(var(--day,1)*100%),#ffd27a)"/><path d="M14.6 -95 a2 2 0 1 0 0 4 a2.6 2.6 0 0 1 0 -4 Z" style="fill:color-mix(in srgb,#4a4842 calc(var(--day,1)*100%),#ffd27a)"/>
      <path d="M-38 -104 Q-20 -110 -12 -120 H12 Q20 -110 38 -104 Q41 -100 36 -100 H-36 Q-41 -100 -38 -104 Z" fill="#8c887e"/><path d="M-36 -100 H36 Q38.4 -100 38.6 -102 H-38.6 Q-38.4 -100 -36 -100 Z" fill="#2b1c12" fill-opacity=".16"/>
      <path d="M-11 -119.4 Q-19.6 -108.6 -35 -103 M11 -119.4 Q19.6 -108.6 35 -103" fill="none" stroke="#a6a298" stroke-width="1.3" stroke-linecap="round"/><path d="M-10 -118.6 H10" stroke="#fff" stroke-opacity=".18" stroke-width="1"/><path d="M12 -120 Q20 -110 38 -104 Q41 -100 36 -100 H28 Q30 -104 22 -108 Q16 -112 12 -120 Z" fill="#2b1c12" fill-opacity=".09"/>
      <path d="M-37.6 -101.6 q-3.4 -.8 -3 -4.4 q.4 -1.6 1.8 -1.2 M37.6 -101.6 q3.4 -.8 3 -4.4 q-.4 -1.6 -1.8 -1.2" fill="none" stroke="#8c887e" stroke-width="2" stroke-linecap="round"/>
      <rect x="-6" y="-124" width="12" height="4.4" rx="1.6" fill="#9c988e"/><path d="M-5 -122.6 H5" stroke="#857f75" stroke-width=".8"/><path d="M0 -137 C-6 -133 -7 -127 -4 -123 H4 C7 -127 6 -133 0 -137 Z" fill="#8c887e"/><path d="M-2.2 -131.6 C-3.8 -129.6 -4.2 -127 -3 -124.8" fill="none" stroke="#fff" stroke-opacity=".25" stroke-width="1.2" stroke-linecap="round"/>
      <g fill="#6f6b62" fill-opacity=".35"><circle cx="-14" cy="-6" r=".8"/><circle cx="6" cy="-4" r=".7"/><circle cx="16" cy="-6.6" r=".6"/><circle cx="-3" cy="-30" r=".7"/><circle cx="3" cy="-56" r=".6"/><circle cx="-12" cy="-74" r=".7"/><circle cx="-14" cy="-88" r=".6"/><circle cx="12" cy="-100" r=".6"/><circle cx="-24" cy="-104" r=".7"/><circle cx="20" cy="-106" r=".6"/></g>
      <g fill="#7f9a5a" fill-opacity=".75"><circle cx="-20" cy="-3" r="2.6"/><circle cx="-15" cy="-2" r="2"/><circle cx="18" cy="-74" r="2.2"/><circle cx="-30" cy="-102" r="2.4"/><ellipse cx="-26" cy="-103.6" rx="3.4" ry="1.4"/><circle cx="-6" cy="-121" r="1.4"/><circle cx="22" cy="-10" r="1.6"/></g>
      <g fill="#a4bd78" fill-opacity=".8"><circle cx="-21" cy="-4.4" r="1.1"/><circle cx="-14.6" cy="-2.8" r=".8"/><circle cx="17.4" cy="-75" r=".9"/><circle cx="-31" cy="-103" r="1"/><circle cx="-25" cy="-104.4" r=".7"/></g>` },
    engawa: { box: [-104, -72, 208, 78], draw: () => `${SHADE(96, 7)}<rect x="-80" y="-40" width="7" height="34" fill="#7a5638"/><rect x="73" y="-40" width="7" height="34" fill="#7a5638"/>
      <rect x="-92" y="-38" width="8" height="38" rx="1.5" fill="#9c7048"/><rect x="84" y="-38" width="8" height="38" rx="1.5" fill="#9c7048"/><path d="M-87 -38 H-84 V-1.5 a1.5 1.5 0 0 1 -1.5 1.5 H-87 Z M89 -38 H92 V-1.5 a1.5 1.5 0 0 1 -1.5 1.5 H89 Z" fill="#2b1c12" fill-opacity=".14"/>
      <path d="M-91 -36 V-2 M85 -36 V-2" stroke="#b88c60" stroke-width="1" stroke-linecap="round"/><path d="M-92 -38 H-84 V-34.6 H-92 Z M84 -38 H92 V-34.6 H84 Z M-80 -40 H-73 V-36 H-80 Z M73 -40 H80 V-36 H73 Z" fill="#2b1c12" fill-opacity=".2"/>
      <path d="M-100 -46 L-90 -52 H90 L100 -46 Z" fill="#c9996a"/><path d="M-80 -49.6 C-50 -50.4 -30 -48.8 -6 -49.6 M8 -48.6 C34 -49.4 60 -48.4 84 -49.2" fill="none" stroke="#b8885a" stroke-width=".8"/>
      <rect x="-100" y="-46" width="200" height="8" fill="#a77a4c"/><path d="M-100 -45.6 H100" stroke="#d9ac7c" stroke-width=".9"/><path d="M-96 -42.4 C-70 -41.6 -40 -43.4 -12 -42.2 M14 -41.8 C40 -43 70 -41.2 96 -42.4" fill="none" stroke="#936741" stroke-width=".8"/><path d="M-100 -39.4 H100 V-38 H-100 Z" fill="#2b1c12" fill-opacity=".12"/>
      <path d="M-60 -51 L-64 -46 M-20 -51 L-21 -46 M20 -51 L21 -46 M60 -51 L64 -46" stroke="#9c7048" stroke-width="1.2"/>
      <path d="M-58 -52 H58 L62 -46 V-31 Q0 -28 -62 -31 V-46 Z" fill="#c8453d"/><path d="M-62 -46 V-31 Q-58 -30.8 -55 -30.6 C-56 -36 -56.4 -41 -55.6 -46 Z M62 -46 V-31 Q58 -30.8 55 -30.6 C56 -36 56.4 -41 55.6 -46 Z" fill="#2b1c12" fill-opacity=".12"/>
      <path d="M-30 -45 Q-31.4 -38 -29.4 -30.4 M26 -45 Q24.8 -38 26.6 -30" fill="none" stroke="#a8362f" stroke-opacity=".6" stroke-width="1"/><path d="M-61 -32.8 Q0 -29.8 61 -32.8" fill="none" stroke="#a8362f" stroke-width=".9" stroke-dasharray="2 1.6"/>
      <path d="M-58 -52 H58 L62 -46 H-62 Z" fill="#d85a50"/><path d="M-61 -46.3 H61" stroke="#ec8378" stroke-width="1"/>
      <ellipse cx="37" cy="-51.6" rx="9.4" ry="2.4" fill="#2b1c12" fill-opacity=".14"/><ellipse cx="36" cy="-52.6" rx="9" ry="2.2" fill="#d8cdb6"/><path d="M27.6 -53 Q36 -55.2 44.4 -53" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width=".7"/>
      <path d="M30 -62 h12 l-1.6 9 h-8.8 Z" fill="#ece5d3"/><path d="M38.6 -62 H42 L40.4 -53 H37.6 Z" fill="#2b1c12" fill-opacity=".1"/><ellipse cx="36" cy="-62" rx="6" ry="1.2" fill="#d8cdb6"/><ellipse cx="36" cy="-61.8" rx="4.8" ry=".8" fill="#9db35a"/>
      <path d="M33 -59 h6" stroke="#5f7a3a" stroke-width="1.6"/><path d="M34 -66 q-2 -4 0 -7 M38.4 -66 q2 -4 0 -7" fill="none" stroke="#fff" stroke-opacity=".7" stroke-width="1.4" stroke-linecap="round"/>` },
    tanuki: { box: [-54, -126, 108, 132], draw: () => `${SHADE(34)}<path d="M-26 -16 C-40 -18 -46 -6 -40 -1 C-35 3 -29 -2 -25 -7 Z" fill="#7d5d40"/><path d="M-39.6 -9.6 L-35.6 -7 M-36.4 -14.4 L-33 -10.6" stroke="#5a4030" stroke-width="2" stroke-linecap="round"/>
      <ellipse cx="-14" cy="-4" rx="11" ry="6" fill="#6f5139"/><ellipse cx="18" cy="-4" rx="11" ry="6" fill="#6f5139"/><path d="M-19 -1.6 V-4.6 M-14 -.6 V-3.6 M-9 -1.6 V-4.6 M13 -1.6 V-4.6 M18 -.6 V-3.6 M23 -1.6 V-4.6" stroke="#4e3826" stroke-width="1.1" stroke-linecap="round"/>
      <path d="M-30 -10 C-36 -40 -26 -66 2 -68 C30 -66 40 -40 34 -10 Q2 0 -30 -10 Z" fill="#8a6848"/><path d="M34 -10 C40 -40 30 -66 2 -68 C22 -60 29 -40 25 -8 Q30 -9 34 -10 Z" fill="#2b1c12" fill-opacity=".12"/><path d="M-26.4 -14 C-27.8 -20 -28.4 -26 -28.2 -31" fill="none" stroke="#fff" stroke-opacity=".18" stroke-width="2.2" stroke-linecap="round"/>
      <ellipse cx="2" cy="-30" rx="22" ry="21" fill="#ead9b8"/><path d="M24 -30 a22 21 0 0 1 -30 19.6 a24 24 0 0 0 26 -22 Z" fill="#2b1c12" fill-opacity=".08"/><path d="M-14 -42 C-10 -47.4 -4 -50 3 -50.4" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width="2" stroke-linecap="round"/><path d="M0 -26 q2 1.6 4 0" fill="none" stroke="#c9b38a" stroke-width="1.2" stroke-linecap="round"/>
      <ellipse cx="-26" cy="-44" rx="7" ry="12" transform="rotate(22 -26 -44)" fill="#7d5d40"/><path d="M38 -40 c-6 0 -9 6 -9 12 c0 7 4 11 9 11 c5 0 9 -4 9 -11 c0 -6 -3 -12 -9 -12 Z" fill="#d9c49a"/><path d="M46.6 -30 c0 7 -3.8 12 -8.6 12.6 c3.4 -2 5.6 -6.4 5.4 -12.6 Z" fill="#2b1c12" fill-opacity=".1"/>
      <rect x="34.6" y="-27" width="7.4" height="8" rx="1" fill="#f6efdf"/><path d="M37 -24.6 h2.6 M36.6 -22.4 h3.6" stroke="#5a4030" stroke-width=".8" stroke-linecap="round"/><path d="M32.4 -35 C31 -31 31 -27 32.4 -23" fill="none" stroke="#fff" stroke-opacity=".45" stroke-width="1.4" stroke-linecap="round"/>
      <rect x="35.4" y="-46" width="5.2" height="7" rx="1.4" fill="#cbb487"/><path d="M33 -30 h10" stroke="#b5532f" stroke-width="2"/><ellipse cx="29" cy="-46" rx="7" ry="12" transform="rotate(-24 29 -46)" fill="#7d5d40"/>
      <circle cx="-15" cy="-94" r="5" fill="#7d5d40"/><circle cx="-15" cy="-93.4" r="2.4" fill="#5a4030"/><circle cx="19" cy="-94" r="5" fill="#7d5d40"/><circle cx="19" cy="-93.4" r="2.4" fill="#5a4030"/>
      <circle cx="2" cy="-80" r="22" fill="#8a6848"/><path d="M24 -80 a22 22 0 0 1 -12 19.6 a20 20 0 0 0 8.6 -21 Z" fill="#2b1c12" fill-opacity=".1"/><ellipse cx="2" cy="-73" rx="11" ry="8" fill="#ead9b8"/><ellipse cx="-8" cy="-84" rx="6.4" ry="5.4" fill="#5a4030"/><ellipse cx="12" cy="-84" rx="6.4" ry="5.4" fill="#5a4030"/>
      <circle cx="-8" cy="-84" r="2.8" fill="#fff"/><circle cx="12" cy="-84" r="2.8" fill="#fff"/><circle cx="-7.4" cy="-84" r="1.5" fill="#2a2730"/><circle cx="12.6" cy="-84" r="1.5" fill="#2a2730"/><circle cx="-6.8" cy="-84.7" r=".55" fill="#fff"/><circle cx="13.2" cy="-84.7" r=".55" fill="#fff"/>
      <ellipse cx="2" cy="-77" rx="3.4" ry="2.4" fill="#2a2730"/><ellipse cx="1" cy="-77.9" rx="1.2" ry=".6" fill="#fff" fill-opacity=".5"/>
      <path d="M-2 -70 Q2 -67 6 -70" fill="none" stroke="#5a4030" stroke-width="1.4" stroke-linecap="round"/><ellipse cx="-12" cy="-72" rx="3.6" ry="2" fill="#f2a3a0" fill-opacity=".6"/><ellipse cx="16" cy="-72" rx="3.6" ry="2" fill="#f2a3a0" fill-opacity=".6"/>
      <path d="M-30 -96 L2 -120 L34 -96 Q2 -90 -30 -96 Z" fill="#d8b366"/><path d="M34 -96 L2 -120 L10 -94.6 Q24 -95 34 -96 Z" fill="#2b1c12" fill-opacity=".08"/>
      <path d="M-16 -104 L2 -118 M18 -104 L2 -118 M2 -94 V-118 M-25 -98 L2 -119 M29 -98 L2 -119 M-8 -93.8 L2 -118 M12 -93.8 L2 -118" stroke="#b9954f" stroke-width="1"/><path d="M-19 -101.4 Q2 -96.6 23 -101.4 M-9 -109 Q2 -106.4 13 -109" fill="none" stroke="#c4a058" stroke-width=".8"/><path d="M-29 -95.6 Q2 -89.6 33 -95.6" fill="none" stroke="#b9954f" stroke-width="1.2"/>` },
    pond: { box: [-132, -50, 264, 56], draw: () => `<ellipse cy="-19" rx="124" ry="27" fill="#8c887e"/>${[[-118, -22, 12, 7], [-96, -38, 14, 6], [-62, -45, 13, 5], [-20, -47, 15, 5], [24, -47, 13, 5], [66, -44, 14, 5], [100, -37, 13, 6], [118, -21, 12, 7], [96, -4, 15, 7], [52, 2, 16, 6], [4, 4, 17, 6], [-46, 3, 16, 6], [-92, -5, 15, 7]].map(([x, y, rx, ry], i) => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${i % 2 ? '#a3a097' : '#b4b0a6'}"/><ellipse cx="${x - rx * 0.18}" cy="${y - ry * 0.4}" rx="${(rx * 0.56).toFixed(1)}" ry="${(ry * 0.36).toFixed(1)}" fill="#fff" fill-opacity=".2"/>`).join('')}
      <g fill="#6f6b62" fill-opacity=".35"><circle cx="-112" cy="-20" r=".9"/><circle cx="-60" cy="-44" r=".8"/><circle cx="28" cy="-46" r=".8"/><circle cx="102" cy="-35" r=".9"/><circle cx="92" cy="-2" r="1"/><circle cx="8" cy="6" r="1"/><circle cx="-50" cy="5" r=".9"/></g>
      <ellipse cy="-20" rx="106" ry="20" fill="#4f8fb8"/><ellipse cy="-17" rx="74" ry="11" fill="#3f7aa6" fill-opacity=".55"/><path d="M-106 -20 A106 20 0 0 1 106 -20 A106 16 0 0 0 -106 -20 Z" fill="#2b1c12" fill-opacity=".14"/><ellipse cx="-24" cy="-26" rx="58" ry="7" fill="#fff" fill-opacity=".14"/>
      <g transform="translate(0 -20) scale(1 .19)"><g class="koi k1"><path d="M66 0 c-6 -6 -18 -6 -24 0 c6 6 18 6 24 0 Z M42 0 l-9 -6 v12 Z" fill="#f08a3c"/><circle cx="58" cy="-2" r="2.6" fill="#fff"/></g><g class="koi k2"><path d="M-36 0 c6 -6 18 -6 24 0 c-6 6 -18 6 -24 0 Z M-12 0 l9 -6 v12 Z" fill="#f6f1e8"/><circle cx="-26" cy="1" r="3.4" fill="#e0574b"/></g></g>
      <ellipse cx="-34" cy="-10" rx="10" ry="2.2" fill="none" stroke="#fff" stroke-opacity=".22" stroke-width=".8"/><ellipse cx="74" cy="-15" rx="7" ry="1.6" fill="none" stroke="#fff" stroke-opacity=".18" stroke-width=".8"/>
      <g class="lily l1"><path d="M44 -24 a10 4.6 0 1 0 1.6 -1.2 L38 -24 Z" fill="#5f9a4a"/><path d="M53.2 -22.2 H61.7 M53.2 -22.2 L57.5 -18.8 M53.2 -22.2 L48.9 -18.8 M53.2 -22.2 L48.9 -25.6 M53.2 -22.2 L57.5 -25.6" stroke="#4a8238" stroke-width=".6"/><path d="M46.4 -24.8 Q52 -26.8 58 -26.2" fill="none" stroke="#fff" stroke-opacity=".25" stroke-width=".8"/></g>
      <g class="lily l2"><path d="M-70 -14 a8 3.6 0 1 0 1.4 -1 L-76 -14 Z" fill="#6aa653"/><path d="M-62.6 -12.6 H-55.8 M-62.6 -12.6 L-59.2 -9.95 M-62.6 -12.6 L-66 -9.95 M-62.6 -12.6 L-66 -15.25 M-62.6 -12.6 L-59.2 -15.25" stroke="#4f8a3e" stroke-width=".55"/></g>` },
    // ---- Christmas (2026-11-14, the user) ---- lights: bulbs over the drawing that the night does not dim (lit by night, glass by
    // day), switched off with the glow
    // 聖誕樹 (the room's tree came out here, 2026-11-14, the user): a tall fir on a little trunk, four tiers with snow along their hems, a string of lights round and round it, baubles,
    // a gold star on top
    bigtree: { box: [-68, -262, 136, 268], glow: [0, -130, 120], draw: () => {
      const tier = (b, t, w, n) => `<path fill="#3f7a3a" d="M${-w} ${b} ${Array.from({ length: n }, (_, i) => `Q${q1(-w + (2 * i + 1) * w / n)} ${b + 7} ${q1(-w + (2 * i + 2) * w / n)} ${b}`).join(' ')} L5 ${t} H-5 Z"/><path fill="#2b1c12" fill-opacity=".14" d="M4 ${t + 2} L${w} ${b} Q${q1(w * 0.75)} ${b + 6} ${q1(w * 0.5)} ${b + 1} Q${q1(w * 0.25)} ${b + 6} 2 ${b + 2} Z"/><path d="M${q1(-w * 0.45)} ${b - 5} L-4 ${t + 8}" stroke="#fff" stroke-opacity=".14" stroke-width="2.4" stroke-linecap="round"/>
        <path fill="#f4f7fb" d="M${-w - 1} ${b - 1} ${Array.from({ length: n }, (_, i) => `Q${q1(-w + (2 * i + 1) * w / n)} ${b + 7} ${q1(-w + (2 * i + 2) * w / n)} ${b}`).join(' ')} L${q1(w * 0.82)} ${b - 6} ${Array.from({ length: n }, (_, i) => `Q${q1(w * 0.82 - (2 * i + 1) * w * 0.82 / n)} ${b - 2} ${q1(w * 0.82 - (2 * i + 2) * w * 0.82 / n)} ${b - 6}`).join(' ')} Z"/>`;
      const ball = (x, y, c, r = 4.4) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${c}"/><circle cx="${q1(x - r * 0.35)}" cy="${q1(y - r * 0.35)}" r="${q1(r * 0.32)}" fill="#fff" fill-opacity=".6"/>`;
      return `${SHADE(56, 9)}<rect x="-7" y="-20" width="14" height="20" fill="#6e4a33"/><rect x="1" y="-20" width="6" height="20" fill="#2b1c12" fill-opacity=".14"/>
        ${tier(-14, -112, 64, 8)}${tier(-78, -162, 52, 7)}${tier(-132, -208, 40, 6)}${tier(-180, -240, 26, 4)}
        <path d="M-56 -24 Q0 -40 52 -52 M-44 -88 Q-2 -100 42 -110 M-32 -142 Q0 -152 30 -160 M-18 -190 Q0 -196 16 -200" fill="none" stroke="#2b2420" stroke-opacity=".4" stroke-width=".9"/>
        ${YARD_TREE_BULBS.map(([x, y, c]) => `<circle cx="${x}" cy="${y}" r="2.8" fill="${c}" fill-opacity=".75"/>`).join('')}
        ${ball(-30, -40, '#d0453c')}${ball(26, -60, '#e6c25a')}${ball(-4, -66, '#5a7fc8', 3.8)}${ball(-22, -104, '#e6c25a', 4)}${ball(18, -120, '#d0453c', 4)}${ball(-10, -150, '#5a7fc8', 3.6)}${ball(12, -170, '#d0453c', 3.4)}${ball(-4, -214, '#e6c25a', 3.2)}
        <g class="st-star"><path d="M0 -262 L4.4 -252 L15 -251.4 L6.8 -244.4 L9.4 -234 L0 -240 L-9.4 -234 L-6.8 -244.4 L-15 -251.4 L-4.4 -252 Z" style="fill:color-mix(in srgb,#e6c25a calc(var(--day,1)*100%),#ffe680)"/><path d="M0 -262 L4.4 -252 L0 -247 Z M-15 -251.4 L-4.4 -252 L0 -247 Z" fill="#fff" fill-opacity=".35"/></g>`; },
      lights: () => `${YARD_TREE_BULBS.map(([x, y, c], i) => `<circle cx="${x}" cy="${y}" r="7" fill="${c}" fill-opacity=".35" class="${i % 3 ? '' : 'tw'}"/><circle cx="${x}" cy="${y}" r="2.8" fill="#fff8dc"/>`).join('')}<circle cx="0" cy="-248" r="18" fill="#ffe680" fill-opacity=".35"/><path d="M0 -262 L4.4 -252 L15 -251.4 L6.8 -244.4 L9.4 -234 L0 -240 L-9.4 -234 L-6.8 -244.4 L-15 -251.4 L-4.4 -252 Z" fill="#ffe680"/>` },
    // 雪人: a chubby snowman (2026-11-14, the user: 肥肥胖胖) — a big round belly, a plump middle and a round head, shaded blue
    // round the right, rosy cheeks, coal eyes with a glint and a smile, a carrot nose, a red scarf with its tails, twig arms, a tin
    // bucket for a hat (its own group: it hops when he is patted), a little snow round his foot
    snowman: { box: [-62, -176, 124, 182], draw: () => `${SHADE(44, 7)}<ellipse cx="0" cy="-2" rx="44" ry="7" fill="#f4f7fb"/>
      <g class="sm-all"><g class="sm-body"><ellipse cx="0" cy="-36" rx="42" ry="35" fill="#f4f7fb"/><path d="M16 -68.6 C40 -62 50 -38 38 -16 C30 -4 18 -1 6 -1 C26 -8 36 -24 34 -40 C32 -54 26 -64 16 -68.6 Z" fill="#9fb4d0" fill-opacity=".35"/><path d="M-30 -50 C-26 -60 -16 -66 -6 -68" fill="none" stroke="#fff" stroke-width="3.4" stroke-linecap="round"/>
      <ellipse cx="0" cy="-88" rx="31" ry="25" fill="#f4f7fb"/><path d="M12 -111.6 C30 -106 38 -92 32 -76 C28 -68 20 -64 12 -63.4 C24 -70 28 -82 26 -92 C24 -102 18 -108 12 -111.6 Z" fill="#9fb4d0" fill-opacity=".35"/>
      <ellipse cx="0" cy="-128" rx="23" ry="20.5" fill="#f4f7fb"/><path d="M8 -147.6 C22 -144 28 -132 25 -120 C22 -112 16 -108.6 9 -108.2 C17 -114 20 -122 19 -130 C18 -138 14 -144 8 -147.6 Z" fill="#9fb4d0" fill-opacity=".35"/><path d="M-15 -138 C-12 -144 -6 -147 0 -148" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round"/>
      <ellipse cx="-12.6" cy="-122" rx="4.4" ry="2.8" fill="#f2a0a0" fill-opacity=".7"/><ellipse cx="12.6" cy="-122" rx="4.4" ry="2.8" fill="#f2a0a0" fill-opacity=".7"/>
      <g fill="#2b2b33"><ellipse cx="-7.6" cy="-132" rx="2.8" ry="3.2"/><ellipse cx="7.6" cy="-132" rx="2.8" ry="3.2"/><circle cx="-8" cy="-116.4" r="1.4"/><circle cx="-4.2" cy="-114" r="1.4"/><circle cx="0" cy="-113.2" r="1.4"/><circle cx="4.2" cy="-114" r="1.4"/><circle cx="8" cy="-116.4" r="1.4"/><circle cx="0" cy="-90" r="2.8"/><circle cx="0" cy="-77" r="2.8"/><circle cx="0" cy="-44" r="3"/><circle cx="0" cy="-28" r="3"/></g>
      <circle cx="-6.8" cy="-133.2" r="1" fill="#fff"/><circle cx="8.4" cy="-133.2" r="1" fill="#fff"/>
      <path d="M0 -126.4 L17 -123.2 L0 -121 Z" fill="#e8792a"/><path d="M4 -124.8 L6 -123.8 M9 -124 L10 -123.2" stroke="#b8561a" stroke-width=".6"/>
      <path d="M-28 -92 L-50 -112 M-43 -106 L-50 -104 M-43 -106 L-46 -117 M28 -92 L48 -114 M41 -107 L50 -108 M41 -107 L41 -118" stroke="#6e4a33" stroke-width="2.8" stroke-linecap="round" fill="none"/>
      <path d="M-21 -110 Q0 -100 21 -110 L21 -103 Q0 -93 -21 -103 Z" fill="#d0453c"/><path d="M8 -103 L13 -78 L20 -80 L16 -104 Z" fill="#b8382f"/><path d="M9 -84 h9 M10 -80 h8" stroke="#f4efe6" stroke-width="1.3"/><path d="M-19 -109 Q0 -100 19 -109" fill="none" stroke="#fff" stroke-opacity=".25" stroke-width="1"/></g>
      <g class="sm-hat"><path d="M-17 -144 L-14 -166 H14 L17 -144 Z" fill="#8f98a6"/><path d="M6 -166 H14 L17 -144 H9 Z" fill="#2b1c12" fill-opacity=".14"/><rect x="-19" y="-147" width="40" height="4.4" rx="1.8" fill="#7a8290"/><path d="M-12 -162 L-14.6 -147" stroke="#fff" stroke-opacity=".4" stroke-width="1.4"/><path d="M-13 -165 Q1 -175 14 -165" fill="none" stroke="#5f6672" stroke-width="1"/></g></g>` },
    // 燈飾麋鹿: a reindeer of white wire, standing and looking back over its shoulder, bulbs all along it — clear glass by day,
    // twinkling gold by night
    lightdeer: { box: [-58, -132, 116, 138], glow: [0, -66, 80], draw: () => `${SHADE(40, 6)}<path d="${YARD_DEER}" fill="none" stroke="#e9ecf2" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/><path d="${YARD_DEER}" fill="none" stroke="#9aa3b2" stroke-opacity=".5" stroke-width=".7" stroke-linecap="round" stroke-linejoin="round" transform="translate(.8 .8)"/>${YARD_DEER_BULBS.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2.1" fill="#fbf3d6"/>`).join('')}`,
      lights: () => YARD_DEER_BULBS.map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="4.4" fill="#ffd27a" fill-opacity=".3" class="${i % 2 ? 'tw' : 'tw2'}"/><circle cx="${x}" cy="${y}" r="2.1" fill="#fff4c8"/>`).join('') }
  };
  // the ware as it stands in the yard: a button the size of its drawing, its feet at (p.x, p.y), drawn in order of distance
  function el(id, p, sel) {
    const a = ART[id], it = WARE.get(id); if (!a || !it) return '';
    const [x0, y0, w, h] = a.box, k = yScale(p.y);
    const glow = a.glow ? `<i class="glow" style="left:${a.glow[0] - x0 - a.glow[2]}px;top:${a.glow[1] - y0 - a.glow[2]}px;width:${2 * a.glow[2]}px;height:${2 * a.glow[2]}px"></i>` : '';
    return `<button type="button" class="yware${sel ? ' sel' : ''}${a.glow && lampOff(id) ? ' off' : ''}" data-act="yard-ware" data-ware="${id}" aria-label="${esc(it.name)}" style="width:${w}px;height:${h}px;margin-left:${x0}px;bottom:${-(y0 + h)}px;transform-origin:${-x0}px ${-y0}px;transform:translate(${p.x}px,${-p.y}px) scale(${k.toFixed(3)});z-index:${300 - Math.round(p.y)}"><svg class="art" viewBox="${a.box.join(' ')}" aria-hidden="true">${a.draw()}</svg>${a.lights ? `<svg class="lights" viewBox="${a.box.join(' ')}" aria-hidden="true">${a.lights()}</svg>` : ''}${glow}</button>`;
  }
  const thumb = (id) => (ART[id] ? `<svg class="thumb" viewBox="${ART[id].box.join(' ')}" aria-hidden="true">${ART[id].draw()}</svg>` : '');
  return { ART, el, thumb };
})();
// the yard's world (1.2.0): the ground 1200px wide (wider on a screen wider than that), its middle the house's; the camera: x,
// how far right of the world's middle the screen's middle is (0 on a screen as wide as the world), kept while the app runs
const YARD_HALF = 600;   // where yard wares may stand: within the middle 1200px, the same on every screen
const yardWorldW = () => Math.max(2 * YARD_HALF, document.documentElement.clientWidth || window.innerWidth || 0);
const ycam = { x: 0, W: 0, YW: 2 * YARD_HALF, z: 1 };   // W: how much of the world the screen shows; z: how large it is drawn (yardZoom)
let ypan = null, ycoast = 0;   // a finger looking along the yard; its fling
const yCamMax = () => Math.max(0, (ycam.YW - ycam.W) / 2);
function yCamTo(yard, x, give = 0) {   // the camera there (give: how much of a pull past an end a finger gets)
  const m = yCamMax();
  ycam.x = x < -m ? -m - (-m - x) * give : x > m ? m + (x - m) * give : x;
  if (YWIDE.on && YWIDE.yard !== yard && YWIDE.back) YWIDE.back();   // gone elsewhere while drawn back: that ends it
  const w = yard.querySelector('.yworld'); if (w && !YWIDE.on) w.style.transform = `translate3d(${(-ycam.x * ycam.z).toFixed(1)}px,0,0)${ycam.z !== 1 ? ` scale(${ycam.z})` : ''}`;   // drawn back (yWide): held till it ends
  // no CSS variable here: one set on the yard every frame of a long walk began the hero's steps again on an iPhone (his legs
  // stopped, 1.2.1); the zoom into the door reads the camera when it starts (sceneGo)
}
function yardLayout(yard) {   // the world as wide as it should be on this screen, the hill's shop sign with it, the camera inside
  const sky = yard.querySelector('.sky'), w = yard.querySelector('.yworld'); if (!sky || !w) return;
  const sw = sky.clientWidth || window.innerWidth;
  ycam.z = Math.round(yardZoom(yard, sw, sky.clientHeight || window.innerHeight) * 1000) / 1000; yard.style.setProperty('--yz', ycam.z);
  ycam.W = sw / ycam.z; ycam.YW = Math.max(2 * YARD_HALF, ycam.W);
  w.style.width = `${ycam.YW}px`; w.style.marginLeft = `${-ycam.YW / 2}px`;
  const k = ycam.YW / 1200, sb = yard.querySelector('.shop-btn');   // the hill scales up on a very wide screen
  w.querySelectorAll('.land.prop[data-box]').forEach((q) => { const [x0, b0, pw, ph] = q.dataset.box.split(' ').map(Number); Object.assign(q.style, { left: `${x0 * k}px`, bottom: `${b0 * k}px`, width: `${pw * k}px`, height: `${ph * k}px` }); });   // the things' own layers, as the land
  if (sb) { sb.style.left = `calc(50% - ${Math.round(118 * k)}px)`; sb.style.bottom = `${Math.round(346 * k - 6)}px`; }
  yCamTo(yard, ycam.x);
}
// a place's sight seen whole (2026-11-14, the user: 白鷺城 could not be seen whole on a phone): the camera drawn back till the
// frame [x0, x1, top] (in the land's own units: 0–1200 across, its ground's foot at 370) fits the screen, held ms, then back to
// the camera's own place (the hero, who may have walked on meanwhile); a tap brings it back sooner. Nothing where it fits already
const YWIDE = { on: false, t: 0, back: null, yard: null };
function yWide(yard, [x0, x1, top], ms = 3600) {
  const sky = yard.querySelector('.sky'), w = yard.querySelector('.yworld'); if (!sky || !w || YWIDE.on) return false;
  const k = ycam.YW / 1200, z = Math.min(sky.clientWidth / ((x1 - x0) * k + 32), (sky.clientHeight - 76) / ((370 - top) * k));   // the land is as wide as the world
  if (!(z < ycam.z * 0.97)) return false;
  const cx = ((x0 + x1) / 2 - 600) * k, half = sky.clientWidth / 2 / z, lim = Math.max(0, ycam.YW / 2 - half), x = Math.max(-lim, Math.min(lim, cx));   // no edge of the world in sight
  YWIDE.on = true; YWIDE.yard = yard; w.style.transition = 'transform .9s cubic-bezier(.4, 0, .2, 1)'; yard.classList.add('wide');
  w.style.transform = `translate3d(${(-x * z).toFixed(1)}px,0,0) scale(${z.toFixed(3)})`;
  // a tap on the scene only brings it back (not a walk there nor a thing used); the buttons up top work as ever
  const swallow = (e) => { e.stopPropagation(); e.preventDefault(); };
  const tap = (e) => { if (e.target.closest('button, a, .yard-tools')) { back(); return; } swallow(e); back(); yard.addEventListener('click', swallow, { capture: true, once: true }); setTimeout(() => yard.removeEventListener('click', swallow, true), 600); };
  const back = () => {
    if (YWIDE.back !== back) return; YWIDE.on = false; YWIDE.back = null; clearTimeout(YWIDE.t); yard.removeEventListener('pointerdown', tap, true); yard.classList.remove('wide');
    if (!yard.isConnected) return; yCamTo(yard, ycam.x); setTimeout(() => { if (!YWIDE.on) w.style.transition = ''; }, 950);
  };
  YWIDE.back = back; YWIDE.t = setTimeout(back, ms); yard.addEventListener('pointerdown', tap, true);
  return true;
}
// a screen held upright (2026-11-10, the user: less sky and bigger people on a phone): the place drawn larger, its ground along
// the bottom of the screen and the sky left as it is; a room (食堂, 居酒屋) a little smaller instead, more of it in sight
function yardZoom(yard, w, h) {
  if (!w || !h || h < w * 1.2) return 1;
  return yard.classList.contains('indoor') ? 0.75 : Math.max(1, Math.min(1.6, h / 540));
}
// the camera with the hero on the move (2026-11-10, the user: keep him nearer the middle — at the edge of the middle half the
// screen kept sliding along and he walked into its side): it eases after a point a little ahead of him the way he walks, so he is a
// little behind the middle with more in sight where he is going, the point coming back to him as he nears where he goes; when he
// stops it glides over till he is in the middle (yCamSettle). A swipe leaves the camera be till he is sent somewhere again (free)
const YCAM = { t: 0, x: 0, lead: 0, aim: null, free: false };
function yFollow(yard) {
  if (ypan || YCAM.free || !yCamMax()) return;
  cancelAnimationFrame(ycoast);   // a glide to him under way gives way
  const now = performance.now(), dt = YCAM.t && now - YCAM.t < 100 ? (now - YCAM.t) / 1000 : 0, vx = dt ? (yh.X - YCAM.x) / dt : 0;
  YCAM.t = now; YCAM.x = yh.X; if (!dt) { YCAM.aim = null; return; }
  const L = ycam.W * 0.12, near = Math.min(1, (yh.rem === undefined ? 9 : yh.rem / (yh.v || 170)) / 0.7), want = Math.max(-L, Math.min(L, vx * 0.3)) * near * near * (3 - 2 * near);   // the look-ahead fades out over his last 0.7 s, so little is left to make up when he stops (2026-11-10, the user: the swing back was too strong)
  YCAM.lead += (want - YCAM.lead) * (1 - Math.exp(-dt / (Math.abs(want) < Math.abs(YCAM.lead) ? 0.12 : 0.35)));
  const T = yh.X + YCAM.lead, vT = YCAM.aim === null ? vx : (T - YCAM.aim) / dt; YCAM.aim = T;   // where it should be and how fast that moves
  const step = (T + vT * 0.15 - ycam.x) * (1 - Math.exp(-dt / 0.15)), most = 1500 * dt;   // led by as much as the easing falls behind: on the mark, and on it as he stops
  yCamTo(yard, ycam.x + Math.max(-most, Math.min(most, step)));
}
function yCamSettle(yard) {   // a soft glide, slow in and slow out (the way left is short, so it is soon done)
  YCAM.t = 0; YCAM.lead = 0; YCAM.aim = null;
  if (ypan || YCAM.free || !yCamMax()) return;
  cancelAnimationFrame(ycoast);
  const x0 = ycam.x, gap = Math.abs(yh.X - x0); if (gap < 0.5) return;
  const ms = Math.min(900, 420 + gap * 6), t0 = performance.now();
  const step = (now) => {
    if (!yard.isConnected || ypan || YCAM.free) return;
    const k = Math.max(0, Math.min(1, (now - t0) / ms));
    yCamTo(yard, x0 + (yh.X - x0) * (1 - Math.cos(Math.PI * k)) / 2);   // after him if he moves on his seat
    if (k < 1) ycoast = requestAnimationFrame(step);
  };
  ycoast = requestAnimationFrame(step);
}
// where a yard ware may stand: on the lawn (whole within the middle 1200px; y 14–196 px up), off the path from the door (LANE),
// the house front, the mailbox and the way out at the path's end, and clear of the others (their ground:
// width × scale across, depth × scale deep)
// test (2026-11-09): the path from the door winds down the lawn and off the bottom of the screen (LANE), out to the main road
// with the bus stop — a place of its own (#/street; the user: no road by the house, it felt like the town moving in), its own
// path coming down from the yard (STREET_LANE). Each is a strip from Y0 to Y1 px up: at(t) its middle and half width t of the
// way along. The land is drawn 370 high, y down from its top
const LANE = { Y0: 220, Y1: -4, at: (t) => [22 * Math.sin(Math.PI * 1.5 * t) - 6 * t, 10 + 24 * t] };
const STREET_LANE = { Y0: 226, Y1: 128, at: (t) => [-44 + 16 * Math.sin(Math.PI * t), 5 + 13 * t] };
const STREET = { walk: [116, 134], road: [48, 116], near: [32, 48] };   // the far pavement, the road, the near pavement (Y px up)
const stripAt = (k, Y) => k.at(Math.max(0, Math.min(1, (Y - k.Y0) / (k.Y1 - k.Y0))));
function stripD(k, n) {
  const pt = (i, side) => { const t = i / n, [c, w] = k.at(t), Y = k.Y0 + (k.Y1 - k.Y0) * t; return `${(600 + c + side * w).toFixed(1)} ${(370 - Y).toFixed(1)}`; };
  const L = [], R = []; for (let i = 0; i <= n; i++) { L.push(pt(i, -1)); R.unshift(pt(i, 1)); }
  return `M${L.join(' L')} L${R.join(' L')} Z`;
}
function yardFits(id, p) {
  const a = YARD.ART[id], it = WARE.get(id); if (!a || !it || p.y < 14 || p.y > 196) return false;
  const k = yScale(p.y), hw = it.ground[0] * k / 2, hd = it.ground[1] * k;
  if (Math.abs(p.x) + hw > YARD_HALF - 10) return false;
  if ([LANE].some((k) => [p.y, p.y + hd].some((Y) => { const [c, w] = stripAt(k, Y); return Math.abs(p.x - c) < hw + w + 4; }))) return false;   // off the path and the road
  const over = (x0, x1, y0, y1) => p.x + hw > x0 && p.x - hw < x1 && p.y + hd > y0 && p.y - hd < y1;
  if (over(-95, 95, 186, 999) || over(20, 92, 136, 230) || over(-60, 10, -10, 26) || over(-YARD_HALF, -YARD_HALF + 90, 30, 120) || over(YARD_HALF - 90, YARD_HALF, 30, 120)) return false;   // the house, the mailbox, the ways out (the path's end, the edges)
  return yardPlaced().every((o) => { if (o.id === id) return true; const t = yScale(o.p.y); return Math.abs(p.x - o.p.x) >= hw + o.it.ground[0] * t / 2 || Math.abs(p.y - o.p.y) >= hd + o.it.ground[1] * t; });
}
function yardPlaced() { return Object.keys(state.placed).filter((id) => owns(id) && WARE.has(id) && WARE.get(id).kind === 'yard' && state.placed[id].w === 'Y').map((id) => ({ id, it: WARE.get(id), p: state.placed[id] })); }
function yardSpot(id) {   // where a ware taken out of the box goes: the free spot nearest the lower middle of the screen
  const c = [];
  for (let y = 20; y <= 190; y += 10) for (let x = -YARD_HALF; x <= YARD_HALF; x += 10) c.push({ x, y, d: Math.hypot(x - ycam.x, (y - 70) * 1.4) });
  c.sort((a, b) => a.d - b.d);
  const hit = c.find((q) => yardFits(id, q));
  return hit ? { x: hit.x, y: hit.y } : null;
}
const yardWaresHtml = () => yardPlaced().map((o) => YARD.el(o.id, o.p, yed.on && yed.sel === o.id)).join('');
const yardSig = () => yardPlaced().map((o) => `${o.id}:${o.p.x},${o.p.y}`).join('|');
// 擺設 in the yard (1.2.0), as in 書房: pick a ware, drag it or tap the lawn to move it, 收起 puts it in the yard's box
const yed = { on: false, sel: null, drag: null, tab: 'yard' };
// a storage box's tabs (2026-11-14, the room's and the yard's): [key, name, how many it holds], the one open, its action
const trayTabs = (tabs, open, act) => `<div class="tray-tabs" role="tablist">${tabs.map(([k, name, n]) => `<button type="button" class="tray-tab" role="tab" data-act="${act}" data-tab="${k}" aria-selected="${k === open}">${name}${n ? `<b>${n}</b>` : ''}</button>`).join('')}</div>`;
function yeditHtml() {
  const box = WARES.filter((it) => it.kind === 'yard' && owns(it.id) && !(state.placed[it.id] && state.placed[it.id].w === 'Y'));
  // the houses (test, 2026-11-09): once one is bought, the cottage and each house bought sit at the front of the box; a tap puts it up
  const houses = WARES.some((it) => it.kind === 'house' && owns(it.id)) ? [{ id: '', name: '小屋' }].concat(WARES.filter((it) => it.kind === 'house' && owns(it.id) && HOUSE_ART[it.id])) : [];
  const now = state.house && owns(state.house) && HOUSE_ART[state.house] ? state.house : '';
  // the grounds (2026-11-14): once one is bought, the grass and each ground bought, after the houses; a tap lays it
  const grounds = WARES.some((it) => it.kind === 'ground' && owns(it.id)) ? [{ id: '', name: '草地' }].concat(WARES.filter((it) => it.kind === 'ground' && owns(it.id))) : [];
  const groundIt = (g) => `<button type="button" class="tray-it tray-house" data-act="yard-ground" data-id="${g.id}" aria-pressed="${(g.id || 'grass') === yardGround()}">${groundThumb(g.id || 'grass')}<span>${esc(g.name)}</span></button>`;
  const houseIt = (h) => `<button type="button" class="tray-it tray-house" data-act="yard-house" data-id="${h.id}" aria-pressed="${h.id === now}"><svg class="house-thumb" viewBox="0 0 140 130" aria-hidden="true">${HOUSE_ART[h.id || 'cottage']}</svg><span>${esc(h.name)}</span></button>`;
  // in tabs (2026-11-14, the user: not everything at once): 擺設, and 房子／地面 once one is bought
  const tabs = [['yard', '擺設', stacks(box).length]].concat(houses.length ? [['house', '房子', houses.length]] : [], grounds.length ? [['ground', '地面', grounds.length]] : []);
  if (!tabs.some(([k]) => k === yed.tab)) yed.tab = 'yard';
  const row = yed.tab === 'house' ? houses.map(houseIt).join('') : yed.tab === 'ground' ? grounds.map(groundIt).join('')
    : box.length ? stacks(box).map(({ it, n, name }) => `<button type="button" class="tray-it" data-act="yard-edit-take" data-id="${it.id}">${YARD.thumb(it.id)}<span>${esc(name)}</span>${n > 1 ? `<b class="tray-n">×${n}</b>` : ''}</button>`).join('')
    : `<div class="tray-empty">${tabs.length > 1 ? '「擺設」沒有收著的東西。' : '收納箱是空的。古道具屋的「戶外」有望遠鏡、石燈籠……'}</div>`;
  const hint = yed.sel ? '拖曳搬動，拖到上面收起來' : yed.tab === 'house' ? '點房子換外觀' : yed.tab === 'ground' ? '點一下換地面' : '拖曳搬動；收納箱的東西拖出來擺';
  return `<div class="edit-top"><span class="edit-hint">${hint}</span><button type="button" class="btn btn-primary btn-sm" data-act="yard-edit-done">完成</button></div>
    <div class="edit-tray" aria-label="院子的收納箱">${tabs.length > 1 ? trayTabs(tabs, yed.tab, 'yard-tray-tab') : ''}<div class="tray-row">${row}</div></div>`;
}
function yselHtml() {   // the picked ware's tools, over it in the world
  const o = yed.sel && yardPlaced().find((q) => q.id === yed.sel), a = o && YARD.ART[o.id];
  return o ? `<div class="edit-sel" style="left:calc(50% + ${o.p.x}px);bottom:${Math.round(o.p.y + -a.box[1] * yScale(o.p.y) + 8)}px"><button type="button" data-act="yard-edit-put">收起</button></div>` : '';
}
function yardDraw(yard) {   // the wares and the 擺設 bar drawn again; the hero and the sky stay as they are
  yard.classList.toggle('edit', yed.on);
  const w = yard.querySelector('.ywares'); w.innerHTML = yardWaresHtml(); w.dataset.sig = yardSig();
  yard.querySelector('.yedit').innerHTML = yed.on ? yeditHtml() : '';
  yard.querySelector('.ysel').innerHTML = yed.on ? yselHtml() : '';
  if (yed.on) fitThumbs(yard.querySelector('.yedit'));
}
function yardEdit(yard, cmd, id) {
  if (!yard) return;
  if (cmd === 'on') { yed.on = true; yed.sel = null; }
  else if (cmd === 'done') { yed.on = false; yed.sel = null; }
  else if (cmd === 'pick') yed.sel = id;
  else if (cmd === 'tray') yed.tab = id;   // a tab of the box
  else if (cmd === 'take') {
    const p = yardSpot(id);
    if (!p) { toast('院子放不下了，先收起別的東西再試試'); return; }
    state.placed[id] = Object.assign({ w: 'Y' }, p); yed.sel = id; saveState(); SND.play('place');
  } else if (cmd === 'put' && yed.sel) { delete state.placed[yed.sel]; yed.sel = null; yed.tab = 'yard'; saveState(); }   // the box open where it went
  else if (cmd === 'ground') {   // the yard's ground (id '' the grass): the yard drawn anew in it (2026-11-14)
    if (id && !(WARE.has(id) && owns(id) && WARE.get(id).kind === 'ground')) return;
    state.ground = id; saveState(); ['grass'].concat(WARES.filter((it) => it.kind === 'ground').map((it) => it.id)).forEach((g) => yard.classList.toggle('ground-' + g, g === yardGround()));
  } else if (cmd === 'house') {   // the yard's house in this look (id '' the cottage), at once
    if (id && !(WARE.has(id) && owns(id) && HOUSE_ART[id])) return;
    state.house = id; saveState();
    yard.querySelector('.house > svg').innerHTML = houseArt(); yard.dataset.house = state.house;
  }
  yardDraw(yard);
}
const yardPoint = (yard, e) => { const r = yard.querySelector('.yworld').getBoundingClientRect(); return { x: (e.clientX - (r.left + r.width / 2)) / ycam.z, y: (r.bottom - e.clientY) / ycam.z }; };   // in the world
const snap2 = (v) => Math.round(v / 2) * 2;
function yardMoveTo(yard, id, p) {   // the picked ware to a spot, if it can stand there
  const q = { w: 'Y', x: snap2(p.x), y: snap2(p.y) };
  if (!yardFits(id, q)) { toast('這裡放不下'); return; }
  state.placed[id] = q; saveState(); yardDraw(yard);
}
// a drag in 擺設: a ware on the lawn follows the finger (red where it cannot stand) and stays where it is let go, or goes back; one
// held in the box up top comes out with a downward pull (a sideways swipe scrolls the box); let go over the box, a ware goes in.
// Near a side of the screen the camera goes along.
function yardDragStart(yard, e) {
  if (!yed.on || (e.pointerType === 'mouse' && e.button !== 0)) return;
  const t = e.target.closest('.yedit .tray-it');
  if (t && t.classList.contains('tray-house')) return;   // a house is only tapped
  if (t) { yed.drag = { id: t.dataset.id, b: null, from: null, off: { x: 0, y: 0 }, x0: e.clientX, y0: e.clientY, moved: false, to: null, fromBox: true, box: false }; return; }
  const b = e.target.closest('.yware'); if (!b) return;
  const id = b.dataset.ware, p = state.placed[id], at = yardPoint(yard, e);
  yed.drag = { id, b, from: p, off: { x: at.x - p.x, y: at.y - p.y }, x0: e.clientX, y0: e.clientY, moved: false, to: null, fromBox: false, box: false };
  try { b.setPointerCapture(e.pointerId); } catch (err) { /* not capturable */ }
}
function yardDragMove(yard, e) {
  const d = yed.drag; if (!d) return;
  if (!d.moved) {
    const dx = e.clientX - d.x0, dy = e.clientY - d.y0;
    if (Math.hypot(dx, dy) < 6) return;
    if (d.fromBox && e.pointerType !== 'mouse' && Math.abs(dx) > Math.abs(dy)) { yed.drag = null; return; }   // sideways: the box scrolls
    d.moved = true;
    if (d.fromBox) {   // the ware out of the box, under the finger
      const w = yard.querySelector('.ywares'); w.insertAdjacentHTML('beforeend', YARD.el(d.id, { x: 0, y: 100 })); d.b = w.lastElementChild; d.b.classList.add('new');
      try { yard.setPointerCapture(e.pointerId); } catch (err) { /* not capturable */ }
    } else yed.sel = d.id;
    yard.classList.add('dragging');
  }
  d.cx = e.clientX; d.cy = e.clientY;
  yardDragAt(yard, d);
  yEdgePan(yard);
}
function yardDragAt(yard, d) {   // the dragged ware where the finger is now (also as the camera moves under it)
  const tray = yard.querySelector('.yedit .edit-tray'), tr = tray && tray.getBoundingClientRect(), hint = yard.querySelector('.yedit .edit-hint');
  d.box = Boolean(tr && d.cy <= tr.bottom && d.cx >= tr.left && d.cx <= tr.right);
  if (tray) tray.classList.toggle('drop', d.box && !d.fromBox);
  const say = d.box && !d.fromBox ? '放開就收起來' : '拖到想放的地方放開'; if (hint && hint.textContent !== say) hint.textContent = say;
  d.b.style.visibility = d.box ? 'hidden' : '';
  if (d.box) { d.to = null; return; }
  const at = yardPoint(yard, { clientX: d.cx, clientY: d.cy }), q = { w: 'Y', x: snap2(at.x - d.off.x), y: snap2(at.y - d.off.y) }, ok = yardFits(d.id, q);
  d.to = ok ? q : null;
  d.b.style.transform = `translate(${q.x}px,${-q.y}px) scale(${yScale(q.y).toFixed(3)})`; if (!d.fromBox) d.b.style.zIndex = String(300 - Math.round(q.y));
  d.b.classList.toggle('bad', !ok);
}
let yEdgeT = 0;
function yEdgePan(yard) {   // a ware held near a side of the screen: the camera goes that way, the ware with the finger
  cancelAnimationFrame(yEdgeT);
  const d = yed.drag; if (!d || !d.moved || d.box || !yCamMax()) return;
  const r = yard.getBoundingClientRect(), dir = d.cx < r.left + 44 ? -1 : d.cx > r.right - 44 ? 1 : 0;
  if (!dir) return;
  const step = () => {
    const dd = yed.drag; if (dd !== d || !yard.isConnected) return;
    const x0 = ycam.x; yCamTo(yard, ycam.x + dir * 7); if (ycam.x === x0) return;
    yardDragAt(yard, d); yEdgeT = requestAnimationFrame(step);
  };
  yEdgeT = requestAnimationFrame(step);
}
function yardDragEnd(yard) {
  const d = yed.drag; yed.drag = null; cancelAnimationFrame(yEdgeT); if (!d || !d.moved) return;
  yard.classList.remove('dragging'); yard._noClick = true; setTimeout(() => { yard._noClick = false; }, 0);   // the click that ends a drag is no tap
  if (d.box) { if (!d.fromBox) { delete state.placed[d.id]; if (yed.sel === d.id) yed.sel = null; yed.tab = 'yard'; saveState(); } }
  else if (d.to) { state.placed[d.id] = d.to; yed.sel = d.id; saveState(); SND.play('place'); }
  else if (d.fromBox) toast('這裡放不下');
  yardDraw(yard);
}
// 觀星 (test, 2026-11-09): the telescope's eyepiece over the sky, one constellation at a time with its Japanese name (its reading,
// its Chinese name), ‹ › to the next, the lines drawn in each time. By day the stars are faint and it says so.
const SCOPE = (() => {
  const SKIES = [
    { ja: '北斗七星', kana: 'ほくとしちせい', zh: '北斗七星（大熊座的一部分）', s: [[40, 70], [62, 66], [80, 76], [98, 88], [104, 116], [136, 124], [148, 100]], l: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 3]] },
    { ja: 'オリオン座', kana: 'オリオンざ', zh: '獵戶座：紅色的參宿四、藍白色的參宿七', s: [[72, 54, 5, '#ffb08a'], [128, 62], [90, 102], [100, 98], [110, 94], [80, 148], [130, 142, 5, '#cfe2ff']], l: [[0, 2], [1, 4], [2, 3], [3, 4], [2, 5], [4, 6], [0, 1]] },
    { ja: 'カシオペア座', kana: 'カシオペアざ', zh: '仙后座：天上的 W', s: [[40, 80], [70, 110], [98, 86], [126, 112], [158, 82]], l: [[0, 1], [1, 2], [2, 3], [3, 4]] },
    { ja: '夏の大三角', kana: 'なつのだいさんかく', zh: '夏季大三角：織女星（ベガ）、天津四（デネブ）、牛郎星（アルタイル）', s: [[78, 56, 5], [148, 74, 4.4], [102, 150, 4.6]], l: [[0, 1], [1, 2], [2, 0]] },
    { ja: 'さそり座', kana: 'さそりざ', zh: '天蠍座：心臟是紅色的心宿二', s: [[150, 44], [158, 62], [150, 80], [128, 84, 5, '#ff9a7a'], [116, 98], [108, 116], [100, 134], [88, 146], [70, 150], [56, 142], [52, 126], [62, 116]], l: [[0, 1], [1, 2], [1, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 8], [8, 9], [9, 10], [10, 11]] },
    { ja: 'はくちょう座', kana: 'はくちょうざ', zh: '天鵝座：張開翅膀的天鵝', s: [[100, 40, 4.6], [100, 86], [100, 124], [100, 162], [54, 72], [76, 80], [124, 92], [148, 100]], l: [[0, 1], [1, 2], [2, 3], [4, 5], [5, 1], [1, 6], [6, 7]] }
  ];
  const rnd = ((n) => () => { n = (n * 9301 + 49297) % 233280; return n / 233280; })(7);
  const DUST = Array.from({ length: 80 }, () => [Math.round(rnd() * 200), Math.round(rnd() * 200), (0.4 + rnd() * 0.9).toFixed(2), (rnd() * 4).toFixed(2)]);
  let i = 0;
  function sky(day) {
    const k = SKIES[i];
    const lines = k.l.map(([a, b]) => { const p = k.s[a], q = k.s[b], len = Math.hypot(q[0] - p[0], q[1] - p[1]).toFixed(1); return `<path class="sc-line" d="M${p[0]} ${p[1]} L${q[0]} ${q[1]}" style="--len:${len}"/>`; }).join('');
    const stars = k.s.map(([x, y, r = 3.4, c = '#fffbe8'], j) => `<circle class="sc-star" cx="${x}" cy="${y}" r="${r}" fill="${c}" style="--w:-${(j * 0.7).toFixed(1)}s"/>`).join('');
    return `<svg class="sc-sky${day ? ' day' : ''}" viewBox="0 0 200 200" aria-hidden="true"><defs><clipPath id="scClip"><circle cx="100" cy="100" r="100"/></clipPath><radialGradient id="scVig"><stop offset=".72" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".7"/></radialGradient></defs>
      <g clip-path="url(#scClip)"><rect width="200" height="200" class="sc-bg"/>${DUST.map(([x, y, r, w]) => `<circle class="sc-dust" cx="${x}" cy="${y}" r="${r}" style="--w:-${w}s"/>`).join('')}
      <path class="sc-meteor" d="M150 20 L120 44"/>${lines}${stars}<rect width="200" height="200" fill="url(#scVig)"/></g></svg>`;
  }
  function draw(el) {
    const day = sceneClock(lightHour()).day >= 0.5, k = SKIES[i];
    el.querySelector('.sc-view').innerHTML = sky(day);
    el.querySelector('.sc-name').innerHTML = `<ruby>${esc(k.ja)}<rt>${esc(k.kana)}</rt></ruby>`;
    el.querySelector('.sc-zh').textContent = k.zh;
    el.querySelector('.sc-note').textContent = day ? '白天太亮，星星很淡；晚上再來看會清楚很多。' : `${i + 1} / ${SKIES.length}`;
  }
  function open(yard) {
    if (!yard || yard.querySelector('.scope')) return;
    const el = document.createElement('div');
    el.className = 'scope'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', '望遠鏡');
    el.innerHTML = `<div class="sc-ring"><div class="sc-view"></div></div><div class="sc-name"></div><div class="sc-zh"></div><div class="sc-note"></div>
      <div class="sc-btns"><button type="button" class="btn btn-sm" data-sc="-1" aria-label="上一個">‹</button><button type="button" class="btn btn-primary btn-sm" data-sc="x">收起望遠鏡</button><button type="button" class="btn btn-sm" data-sc="1" aria-label="下一個">›</button></div>`;
    const close = () => { el.remove(); document.removeEventListener('keydown', key); };
    const step = (d) => { i = (i + d + SKIES.length) % SKIES.length; draw(el); };
    const key = (e) => { if (e.key === 'Escape') close(); else if (e.key === 'ArrowLeft') step(-1); else if (e.key === 'ArrowRight') step(1); };
    el.addEventListener('click', (e) => { const b = e.target.closest('[data-sc]'); if (b) { if (b.dataset.sc === 'x') close(); else step(Number(b.dataset.sc)); } else if (e.target === el) close(); });
    el.addEventListener('pointerdown', (e) => e.stopPropagation());
    document.addEventListener('keydown', key);
    yard.appendChild(el); draw(el);
  }
  return { open, SKIES };
})();
// the gramophone plays a record while 書房 or the bedroom is open and it stands in either (state.record: the one on it, '' the
// first; state.musicOff: stopped by hand). A record is a file (music/<id>-<n>.m4a), fetched once and kept by the service worker
// like the clips, played by a looping <audio>; its music is written in scripts/music-synth.js, which renders the file again
// (scripts/render-music.py) when it changes. No file to be had (offline before it was ever fetched): quiet, tried again later.
// RECORDS: the house's own (own); one sold in 古道具屋 (2026-11-12: a ware of kind 'record', the same id) is had once bought; a
// place's own (place) plays by itself there (PLACE_REC), at its vol. 設定 › 音樂: how loud (0: none plays anywhere)
const MUSIC = (() => {
  const RECORDS = [
    { id: 'engawa', own: true, file: 'music/engawa-1.m4a', name: '縁側の午後', kana: 'えんがわのごご', zh: '簷廊的午後', style: '電鋼琴・音樂盒', color: '#e3907f' },
    { id: 'yozakura', own: true, file: 'music/yozakura-1.m4a', name: '夜桜', kana: 'よざくら', zh: '夜裡的櫻花', style: '琴・音樂盒', color: '#8b6aa8' },
    { id: 'harukaze', file: 'music/harukaze-1.m4a', name: '春風', kana: 'はるかぜ', zh: '春天的風', style: '音樂盒・笛', color: '#f2a7bb' },
    { id: 'matsuri', file: 'music/matsuri-1.m4a', name: '夏祭り', kana: 'なつまつり', zh: '夏日祭典', style: '笛・太鼓', color: '#e0703a', vol: 0.6 },
    { id: 'tsukimi', file: 'music/tsukimi-1.m4a', name: '月見', kana: 'つきみ', zh: '賞月', style: '琴・笛', color: '#d9b45a' },
    { id: 'yukiasa', file: 'music/yukiasa-1.m4a', name: '雪の朝', kana: 'ゆきのあさ', zh: '下雪的早晨', style: '鋼琴・音樂盒', color: '#8fb4d8' },
    { id: 'kissa', file: 'music/kissa-1.m4a', name: '喫茶しずく', kana: 'きっさしずく', zh: 'しずく咖啡館', style: '爵士鋼琴・低音提琴', color: '#8a5a3a', vol: 0.35 },
    { id: 'obake', file: 'music/obake-1.m4a', name: 'おばけの夜', kana: 'おばけのよる', zh: '妖怪之夜', style: '音樂盒・撥弦', color: '#7a4ab0' },
    { id: 'jingle', file: 'music/jingle-1.m4a', name: 'ジングルベル', kana: 'じんぐるべる', zh: '鈴兒響叮噹', style: '音樂盒・雪橇鈴・撥弦', color: '#c8453d', vol: 0.6 },   // out in six places at Christmas: under their sounds
    { id: 'chochin', place: 'izakaya', file: 'music/chochin-1.m4a', name: '赤ちょうちん', kana: 'あかちょうちん', zh: '紅燈籠', style: '三味線・笛', color: '#c8463a', vol: 0.45 },
    { id: 'minato', place: 'cruise', file: 'music/minato-1.m4a', name: 'みなと案内', kana: 'みなとあんない', zh: '港町導覽', style: '笛・撥弦・低音提琴', color: '#3f7ac8', vol: 0.55 }
  ];
  // the record a place plays by itself: the izakaya's own, the café's jazz out of its door while it is open, the festival's at the shrine;
  // and where the cruise's passengers are while a trip is under way, its own (CRUISE.tune, 2026-11-13: the user missed music on the tour)
  // Christmas (2026-11-14, the user): the six places of the ring (the yard, the beach, the town, the bus stop, the harbor, the park)
  // play ジングルベル while it is on, over their own; in the house only once it is bought, on the gramophone
  const XMAS_PLACES = ['outside', 'beach', 'town', 'street', 'harbor', 'park'];
  const PLACE_REC = { izakaya: () => 'chochin', town: () => (TOWNEV.shopState('cafe') === 'open' ? 'kissa' : ''), shrine: () => (TOWNEV.festival() ? 'matsuri' : '') };
  const have = () => RECORDS.filter((r) => !r.place && (r.own || owns(r.id)));
  // a record sold in 古道具屋, as its card shows it: half out of its sleeve, its name on the sleeve
  const sleeve = (r) => `<svg class="rec-sleeve" viewBox="0 0 120 120" aria-hidden="true">
    <circle cx="80" cy="60" r="38" fill="#1f1c22"/><circle cx="80" cy="60" r="30" fill="none" stroke="#fff" stroke-opacity=".1"/><circle cx="80" cy="60" r="22" fill="none" stroke="#fff" stroke-opacity=".1"/><circle cx="80" cy="60" r="12" fill="${r.color}"/><circle cx="80" cy="60" r="2" fill="#1f1c22"/>
    <rect x="6" y="10" width="62" height="100" rx="4" fill="${r.color}"/><rect x="64" y="10" width="4" height="100" fill="#000" fill-opacity=".12"/><text x="37" y="66" text-anchor="middle" font-size="${r.name.length > 4 ? 11 : 15}" fill="#fff" font-weight="700" lang="ja">${esc(r.name)}</text></svg>`;
  const current = () => have().find((r) => r.id === state.record) || have()[0];
  let play = null, wake = null, player = null, fadeT = 0, B = null;
  const VOL = 0.8, blobs = {}, bufs = {}, stopped = {};   // blobs: a record's file as a blob: URL, fetched once a session; bufs, stopped: below
  const mvol = () => Math.min(1, Math.max(0, Number(state.settings.musicVol) || 0));   // 設定 › 音樂
  const level = (rec) => VOL * (rec.vol || 1) * mvol();
  let ducked = false;   // Japanese being read aloud (duck)
  // an iPhone keeps an <audio>'s volume at 1, a Web Audio gain put after the <audio> did nothing there, and telling an iPhone by
  // its <audio> failed too (2026-11-12, the user: 音樂 would not go down). So a record is decoded and played through Web Audio,
  // like 環境音, wherever there is Web Audio (B: its source and gain; bufs: the decoded one in use, ~30 MB for a minute and a
  // half, so one at a time; stopped: where each stopped, to go on from there): 設定 › 音樂 and the dip under spoken Japanese
  // work everywhere alike. No Web Audio: the <audio> and its own volume
  const mkPlayer = () => { if (!player) { player = new Audio(); player.loop = true; player.preload = 'auto'; player.setAttribute('playsinline', ''); } };
  const buffered = () => { mkPlayer(); return Boolean(window.AudioContext || window.webkitAudioContext); };
  function fadeFile(v, s) {   // the volume to v over s seconds
    clearInterval(fadeT);
    if (play && play.mode === 'buffer') {
      if (!B) return;
      const g = B.gain.gain; if (B.c.state === 'running') g.setTargetAtTime(v, B.c.currentTime, Math.max(0.02, s / 3)); else { g.cancelScheduledValues(0); g.value = v; }   // asleep (before a tap): set as it is
      return;
    }
    if (!player) return;
    const from = player.volume, t0 = performance.now();
    fadeT = setInterval(() => { const k = Math.min(1, (performance.now() - t0) / (s * 1000)); try { player.volume = from + (v - from) * k; } catch (e) { /* read-only */ } if (k >= 1) clearInterval(fadeT); }, 50);
  }
  const playFile = () => { const pr = player.play(); if (pr && pr.catch) pr.catch(() => {}); };   // refused before a first tap: wake tries again
  function startBuf(rec, p) {
    const c = audioCtx(); if (!c) { play = null; return; }   // no Web Audio at all: quiet
    if (!bufs[rec.id]) {
      bufs[rec.id] = fetch(rec.file).then((r) => { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); })
        .then((a) => new Promise((ok, no) => c.decodeAudioData(a, ok, no)))   // the callback form: older Safari has no promise
        .catch(() => { delete bufs[rec.id]; return null; });
    }
    bufs[rec.id].then((buf) => {
      if (play !== p) return;
      if (!buf) { play = null; return; }   // no file to be had: quiet; the next look tries again
      Object.keys(bufs).forEach((k) => { if (k !== rec.id) delete bufs[k]; });
      const g = c.createGain(); g.gain.value = 0; g.connect(c.destination);
      const src = c.createBufferSource(); src.buffer = buf; src.loop = true; src.connect(g);
      const off = (stopped[rec.id] || 0) % buf.duration; src.start(0, off);
      B = { id: rec.id, c, src, gain: g, t0: c.currentTime - off, dur: buf.duration };
      fadeFile(level(rec) * (ducked ? 0.3 : 1), 1.2);
    });
  }
  function start(rec) {
    const p = play = { id: rec.id, mode: 'file' };
    if (buffered()) { p.mode = 'buffer'; startBuf(rec, p); return; }
    const go = () => {
      if (play !== p) return;
      if (player.dataset.id !== rec.id) { player.src = blobs[rec.id]; player.dataset.id = rec.id; }   // the same record again: on from where it stopped
      try { player.volume = 0; } catch (e) { /* read-only */ }
      playFile(); fadeFile(level(rec) * (ducked ? 0.3 : 1), 1.2);
    };
    if (blobs[rec.id]) { go(); return; }
    fetch(rec.file).then((r) => { if (!r.ok) throw new Error(r.status); return r.blob(); }).then((b) => { blobs[rec.id] = URL.createObjectURL(b); go(); })
      .catch(() => { if (play === p) play = null; });   // no file to be had: quiet; the next look at the room tries again
  }
  function halt() {   // stopped: the file paused where it is
    if (!play) return;
    clearInterval(fadeT); if (player) player.pause();
    if (B) { stopped[B.id] = (B.c.currentTime - B.t0) % B.dur; try { B.src.stop(); } catch (e) { /* not started */ } B.src.disconnect(); B.gain.disconnect(); B = null; }
    play = null;
  }
  // the record to play now, if any: in 書房 or the bedroom (#/, #/today, #/bedroom) the one on the gramophone — set out, not
  // stopped — else a place's own (PLACE_REC); the page in sight, 音樂 on
  const inRoom = () => ['today', 'bedroom'].includes(currentRoute().name);
  function wanted() {
    if (!mvol() || document.hidden) return null;
    const r = currentRoute().name;
    if (inRoom()) return state.placed && state.placed.gramophone && owns('gramophone') && !state.musicOff ? current() || null : null;
    const id = (typeof CRUISE !== 'undefined' && CRUISE.tune(r === 'outside' ? 'yard' : r)) || (XMAS_PLACES.includes(r) && festOn('christmas') ? 'jingle' : '') || (PLACE_REC[r] && PLACE_REC[r]());
    return (id && RECORDS.find((x) => x.id === id)) || null;
  }
  function sync() { try { tune(); } catch (e) { console.error(e); } }   // music never breaks a page
  function tune() {
    const rec = wanted();
    document.querySelectorAll('.study').forEach((st) => st.classList.toggle('music', Boolean(rec) && inRoom()));
    if (!rec) {
      if (!play) return;
      if (document.hidden) { halt(); return; }
      const p = play; fadeFile(0, 0.5);
      setTimeout(() => { if (play === p && !wanted()) halt(); }, 600);
      return;
    }
    try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) { /* older Safari */ }
    if (!play || play.id !== rec.id) { halt(); start(rec); }
    else if (!ducked) { if (play.mode === 'file' && player.paused) playFile(); fadeFile(level(rec), 0.6); }   // back before it had stopped
    if (!wake) {   // a browser lets sound start only from a tap or a key: the first one wakes it
      wake = () => { if (play && play.mode === 'buffer') { audioCtx(); return; } if (play && wanted() && !ducked && player && player.paused && player.src) playFile(); };   // through Web Audio: its context woken (iOS)
      ['pointerdown', 'keydown'].forEach((t) => document.addEventListener(t, wake, true));
    }
  }
  document.addEventListener('visibilitychange', () => sync());
  saveHooks.push(() => sync());   // set out or put away, stopped or another record (here or from another device)
  // the gramophone tapped: its records, the one playing marked; a tap puts one on, 停下來 lifts the needle
  const disc = (r, on) => `<svg class="rec-disc${on ? ' on' : ''}" viewBox="-24 -24 48 48" aria-hidden="true"><circle r="23" fill="#1f1c22"/><circle r="18" fill="none" stroke="#fff" stroke-opacity=".08" stroke-width="1"/><circle r="13.5" fill="none" stroke="#fff" stroke-opacity=".08" stroke-width="1"/><path d="M-15 -12 A19 19 0 0 1 -4 -18.6" fill="none" stroke="#fff" stroke-opacity=".25" stroke-width="1.6" stroke-linecap="round"/><circle r="8" fill="${r.color}"/><circle r="1.4" fill="#1f1c22"/></svg>`;
  function body() {
    const now = !state.musicOff && current();
    return `<div class="rec-list">${have().map((r) => `<button type="button" class="rec${now && now.id === r.id ? ' on' : ''}" data-act="music-rec" data-id="${r.id}">${disc(r, now && now.id === r.id)}
      <span class="rec-text"><ruby class="rec-name">${esc(r.name)}<rt>${esc(r.kana)}</rt></ruby><span class="muted small">${esc(r.zh)}・${esc(r.style)}</span></span>${now && now.id === r.id ? '<span class="rec-now">播放中</span>' : ''}</button>`).join('')}</div>
      <div class="row-wrap mt-3"><button type="button" class="btn btn-sm" data-act="music-stop">${state.musicOff ? '放下唱針' : '停下來'}</button></div>`;
  }
  function pick() { openModal('留聲機', body(), { width: 420, noFocus: true }); }
  function redo() { saveState(); const b = document.getElementById('modalBody'); if (b) b.innerHTML = body(); }
  const put = (id) => { const was = !state.musicOff && current(); state.record = id; state.musicOff = false; redo(); if (!was || was.id !== id) SND.play('needle'); };
  const pause = () => { state.musicOff = !state.musicOff; redo(); if (!state.musicOff) SND.play('needle'); };
  // while Japanese is read aloud (SND.duck): down to a third, back after; an iPhone keeps the volume at 1, so there it pauses
  const fixedVol = () => { try { const v = player.volume; player.volume = v > 0.5 ? v - 0.1 : v + 0.1; const moved = Math.abs(player.volume - v) > 0.05; player.volume = v; return !moved; } catch (e) { return true; } };
  function duck(on) {
    if (on === ducked) return; ducked = on;
    if (!play || !player) return;
    if (play.mode === 'file' && fixedVol()) { if (on) player.pause(); else if (wanted()) playFile(); return; }   // no way to make it softer: a pause
    const rec = RECORDS.find((x) => x.id === play.id);
    fadeFile(level(rec) * (on ? 0.3 : 1), on ? 0.15 : 0.6);
  }
  // 設定 › 音樂 dragged: louder or softer at once (to none: it stops; back from none: it plays again)
  function volume() { const rec = play && RECORDS.find((x) => x.id === play.id); if (rec && player && mvol()) fadeFile(level(rec) * (ducked ? 0.3 : 1), 0.1); sync(); }
  return { RECORDS, sync, pick, put, pause, duck, volume, sleeve, playing: () => Boolean(play) && Boolean(wanted()), wants: () => (wanted() || {}).id || '', mode: () => play && play.mode, level: () => (B ? B.gain.gain.value : player ? player.volume : null), how: () => (B ? `Web Audio・${B.c.state}` : play ? (play.mode === 'buffer' ? '解碼中' : '<audio>') : '沒在播') };   // how: for the test site's 設定
})();
// outside 擺設 a tap on a ware sends the hero to stand beside it, facing it; at the telescope they look into it (test: 觀星)
function yardUse(yard, id) {
  const o = yardPlaced().find((q) => q.id === id); if (!yard || !o) return;
  const side = yh.X <= o.p.x ? -1 : 1, gx = o.p.x + side * (o.it.ground[0] * yScale(o.p.y) / 2 + 16);
  yHeroWalk(yard, [gx, Math.max(12, o.p.y - 4)], () => {
    const el = yard.querySelector('.yhero'); if (!el) return;
    yh.flip = side > 0; yh.back = false; yh.turn = true; yHeroPlace(yard);   // turned to it
    if (id === 'telescope') { el.classList.add('look'); setTimeout(() => { el.classList.remove('look'); if (yard.isConnected) SCOPE.open(yard); }, 700); }
    if (id === 'pond') { el.classList.add('crouch'); setTimeout(() => el.classList.remove('crouch'), 1500); pondStir(yard, side); SND.play('splash', { vol: 0.6 }); SND.play('plop', { delay: 1.1 }); }
    // Christmas (2026-11-14, the user: something to do with them): the snowman patted — he squashes and bounces, his bucket hops,
    // a puff of snow, 「つめたい！」; the tree looked up at — its lights twinkle fast and show by day too, the star shines, gold
    // sparkles drift down, 「きれい！」 (switched back on if off: it is not switched by a tap)
    if (id === 'snowman' || id === 'bigtree') {
      const b = yard.querySelector(`.yware[data-ware="${id}"]`), k = yScale(o.p.y), top = o.p.y - YARD.ART[id].box[1] * k, man = id === 'snowman';
      el.classList.add(man ? 'reach' : 'look'); setTimeout(() => el.classList.remove('reach', 'look'), 1400);
      if (!man && lampOff(id)) { delete state.lampsOff[id]; saveState(); }
      if (b) { b.classList.remove('poke', 'off'); void b.offsetWidth; b.classList.add('poke'); setTimeout(() => b.classList.remove('poke'), 1700); }
      yPuff(yard, [o.p.x, man ? top - 30 * k : top - 20 * k], man ? ['#ffffff', '#eef4fb', '#dfe8f4'] : ['#ffe680', '#ffd36a', '#fff6c8', '#ff9a8a'], man ? 12 : 16);
      yBubble(yard, 600 + yh.X, 370 - (yh.Y + 210 * yScale(yh.Y)), man ? 'つめたい！' : 'きれい！', 1800);
      SND.play(man ? 'cushion' : 'sparkle');
      return;
    }
    if (YARD.ART[id] && YARD.ART[id].glow) {   // a lamp (test, 2026-11-09): switched on or off
      if (lampOff(id)) delete state.lampsOff[id]; else state.lampsOff[id] = true; saveState(); SND.play('switch');
      const b = yard.querySelector(`.yware[data-ware="${id}"]`); if (b) b.classList.toggle('off', lampOff(id));
    }
  });
}
// little round bits flung up from a point (x from the middle, y up from the bottom) and drifting down: snow off the snowman,
// sparkles off the Christmas tree (2026-11-14)
function yPuff(yard, [x, y], colours, n) {
  const w = yard && yard.querySelector('.yworld'); if (!w) return;
  for (let i = 0; i < n; i++) {
    const el = document.createElement('i'); el.className = 'ypuff';
    el.style.cssText = `left:calc(50% + ${x.toFixed(0)}px);bottom:${y.toFixed(0)}px;--c:${colours[i % colours.length]};--dx:${(Math.random() * 100 - 50).toFixed(0)}px;--dy:${(18 + Math.random() * 34).toFixed(0)}px;--w:${(i * 0.03).toFixed(2)}s`;
    w.appendChild(el); setTimeout(() => el.remove(), 2000);
  }
}
// the pond (test, 2026-11-09): the hero crouches at its edge and dips a hand in — rings spread from there, and a koi leaps out
// across and splashes back in with rings of its own
function pondStir(yard, side) {
  const svg = yard.querySelector('.yware[data-ware="pond"] svg.art'); if (!svg) return;
  const old = svg.querySelector('.stir'); if (old) old.remove();
  const rings = (x, y, w) => [0, 0.35, 0.7].map((d) => `<ellipse class="rip" cx="${x}" cy="${y}" rx="6" ry="1.6" style="--w:${(w + d).toFixed(2)}s"/>`).join('');
  const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  g.setAttribute('class', 'stir'); g.setAttribute('transform', side > 0 ? 'scale(-1 1)' : '');
  g.innerHTML = `${rings(-74, -18, 0)}${rings(-14, -22, 1.05)}${rings(26, -20, 1.75)}
    <g class="leap"><path d="M10 0 c-5 -5 -15 -5 -20 0 c5 5 15 5 20 0 Z M-10 0 l-8 -5 v10 Z" fill="#f08a3c"/><circle cx="4" cy="-1.6" r="2.2" fill="#fff"/></g>
    ${[[-18, -24, -3, -9], [-12, -24, 2, -11], [22, -22, -2, -10], [28, -22, 4, -8]].map(([x, y, dx, dy], i) => `<circle class="spl" cx="${x}" cy="${y}" r="1.6" style="--dx:${dx}px;--dy:${dy}px;--w:${i < 2 ? 0.95 : 1.7}s"/>`).join('')}`;
  svg.appendChild(g); svg.closest('.yware').classList.add('stirred');
  setTimeout(() => { g.remove(); if (!svg.querySelector('.stir')) svg.closest('.yware').classList.remove('stirred'); }, 3600);
}
// Christmas (2026-11-14, the user: every place should feel like it): snow falls over every place outside while it is on — not in
// a room. Flakes of a few sizes drifting down at their own speeds; motion reduced, they hang where they are
function ySnow(yard, place) {
  const on = festOn('christmas') && !INDOOR.includes(place), had = yard.querySelector('.sky > .snow');
  if (!on) { if (had) had.remove(); return; }
  if (had) return;
  let r = 11; const rnd = () => ((r = (r * 9301 + 49297) % 233280) / 233280);
  const flakes = Array.from({ length: 52 }, () => `<i style="left:${(rnd() * 100).toFixed(1)}%;--y:${(rnd() * 100).toFixed(1)}%;--s:${(1.6 + rnd() * 3.6).toFixed(1)}px;--d:${(7 + rnd() * 9).toFixed(1)}s;--w:-${(rnd() * 16).toFixed(1)}s;--x:${Math.round(rnd() * 50 - 25)}px"></i>`).join('');
  yard.querySelector('.sky').insertAdjacentHTML('beforeend', `<div class="snow" aria-hidden="true">${flakes}</div>`);
}
function renderOutside(view, place = 'yard') {
  sceneTick();
  const pct = ringPct(dayProgress());
  const yard = view.querySelector('.yard');
  if (yard && (yard.dataset.house !== (state.house || '') || (place === 'yard' && !yard.classList.contains('ground-' + yardGround())) || yard.dataset.place !== place || (yard.dataset.sig !== TOWNEV.sig(place) && !TALK.on()))) { yard.remove(); }   // the house changed (another device), the other place, or who is about (TOWNEV): drawn anew
  else if (yard) {   // a redraw: new stars fade in, the motion carries on; the yard's things again only if they moved (sync, another device)
    yardLevel(yard, pct);
    const w = yard.querySelector('.ywares'); if (w && !yed.on && w.dataset.sig !== yardSig()) { w.innerHTML = yardWaresHtml(); w.dataset.sig = yardSig(); }
    if (place === 'yard') yWitch(yard);
    ySnow(yard, place);
    return;
  }
  yed.on = false; yed.sel = null; yed.drag = null; ypan = null; Object.assign(YCAM, { t: 0, lead: 0, free: false });   // a yard drawn anew opens out of 擺設
  cancelAnimationFrame(yh.raf); yh.climb = null; yh.s = 0; yh.z = 0; if (yh.use) { [yh.X, yh.Y] = yh.use.up; yh.use = null; }   // drawn anew: up off whatever he sat on
  if (yPlace !== place) {   // the other place's spot (test: the main road)
    yPlace = place;
    try { const q = (JSON.parse(localStorage.getItem('nq_hero') || '{}') || {})[place]; if (q && Number.isFinite(q.X) && Number.isFinite(q.Y)) { yh.X = q.X; yh.Y = q.Y; } else if (place === 'street') { yh.X = BUS.X - 70; yh.Y = 124; } } catch (e) { /* no storage */ }
  }
  const a = yh.arrive && yh.arrive.to === place ? yh.arrive : null, bus = a && BUS_PLACES.includes(a.from) && BUS_PLACES.includes(place) && BUS_IN[place];
  const way = a && (WAYS[`${a.from}>${place}`] || (bus && { in: bus })), come = way ? way.in() : null; yh.arrive = null; TALK.close();   // by the bus: off at its stop
  if (come) { [yh.X, yh.Y] = come[0]; yh.back = place === 'yard'; }
  if (!come) { if (INDOOR.includes(place)) [yh.X, yh.Y] = isoClamp([yh.X, yh.Y]); else yh.Y = Math.min(yh.Y, walkTop(place)); [yh.X, yh.Y] = yFree(place, [yh.X, yh.Y]); }   // where he was kept: on the ground (a room: its floor), not on a building nor in a thing
  view.innerHTML = yardHtml(pct, place);
  const y = view.querySelector('.yard');
  y.dataset.house = state.house || ''; y.dataset.sig = TOWNEV.sig(place);
  ycam.x = yh.fromDoor ? 0 : yh.X; yardLayout(y);   // the camera on the hero (at the door, coming out)
  if (PLACE_LOOK[place] !== undefined && !yh.fromDoor) { const m = Math.max(0, ycam.W / 2 - 70); yCamTo(y, Math.max(yh.X - m, Math.min(yh.X + m, PLACE_LOOK[place]))); }   // as near its sight as keeps him on the screen
  const ro = new ResizeObserver(() => { if (!y.isConnected) { ro.disconnect(); return; } yardLayout(y); });
  ro.observe(y.querySelector('.sky'));
  if (yh.fromDoor && place === 'yard') { yh.fromDoor = false; yh.X = 0; yh.Y = 214; yh.back = false; yHeroPlace(y); setTimeout(() => yHeroWalk(y, [8, 150]), 260); }   // out of the door, onto the lawn (below the 進屋 tag)
  else if (come && place === 'yard' && a && YARD_FAR[a.from]) {   // home from the beach or the town: up the far path, then in over the lawn
    const h = y.querySelector('.yhero'); h.classList.add('out'); yHeroPlace(y);
    setTimeout(() => yFar(y, a.from, true, () => { [yh.X, yh.Y] = yToward(come[1], come[0], 110); yh.back = false; yHeroPlace(y); h.classList.remove('out'); yHeroWalk(y, come[1]); }), 120);   // in a few steps from where the far path left off
  } else if (come) { yHeroPlace(y); setTimeout(() => yHeroWalk(y, come[1]), 200); if (PLACE_WIDE[place] && bus) yWide(y, PLACE_WIDE[place], 2400); }   // in along the path; off the bus at a sight too big for the screen: it whole first (not walking back down from 奥社)
  else yHeroPlace(y);
  if (place === 'yard') yWitch(y);
  ySnow(y, place);
  TOWNLIFE.start(y, place);   // the people about: strolling, fidgeting
  CRUISE.mount(y, place);   // the cruise ship's passengers and 高橋, the ship far out (CRUISE)
  const yel = y.querySelector('.yhero');   // idling now and then while left be
  HERO.idle(yel, () => !yh.climb && !yh.use && !document.hidden && !yel.matches('.walk, .run, .out, .hop, .wave, .spin, .cheer, .reach, .crouch, .look, .bow'), true);
  y.addEventListener('pointerdown', (e) => { y._at = yardPoint(y, e); if (!y.classList.contains('dressing')) { yardDragStart(y, e); yPanStart(y, e); } });   // _at: which seat a tap on a row of them meant
  y.addEventListener('pointermove', (e) => { yardDragMove(y, e); yPanMove(y, e); });
  y.addEventListener('pointerup', (e) => { yardDragEnd(y); yPanEnd(y, e); }); y.addEventListener('pointercancel', (e) => { yardDragEnd(y); yPanEnd(y, e); });
  y.addEventListener('click', (e) => {   // a tap on the lawn: the hero walks there (in 擺設: the picked ware goes there)
    if (yh.far && !e.target.closest('.yard-tools')) { yh.far(); return; }   // on the long way down: there at once
    if (y._noClick || y.classList.contains('dressing') || e.target.closest('button, .hero, a, .dress')) return;
    const at = yardPoint(y, e);
    if (yed.on) { if (yed.sel) yardMoveTo(y, yed.sel, at); return; }
    if (!INDOOR.includes(place) && (at.y < 4 || at.y > 222)) return;
    yHeroWalk(y, [at.x, at.y]);   // in a room: onto its floor
  });
  let swallow = false;   // the buttons up top while they rest: a first tap only brings them back (as in 書房)
  y.addEventListener('pointerdown', (e) => { swallow = y.classList.contains('quiet') && !!e.target.closest('.yard-tools'); }, true);
  y.addEventListener('click', (e) => { if (swallow) { swallow = false; e.stopPropagation(); e.preventDefault(); } }, true);
  let restT = 0;   // the signs: in sight when the yard opens and after a touch, out of sight 4 s later (a tap on a thing still works)
  const wake = () => { y.classList.remove('quiet'); clearTimeout(restT); restT = setTimeout(() => { if (y.isConnected) y.classList.add('quiet'); }, 4000); };
  y._wake = wake;   // the witch's 言靈 keep the 言靈 button up while they fly in
  y.addEventListener('pointerdown', wake); y.addEventListener('pointerup', wake);
  y.addEventListener('pointermove', (e) => { if (e.pointerType === 'mouse' && !e.buttons) wake(); });   // a mouse over the yard
  wake();
}
// the button up top (書房, the yard, the town's places): 言靈 — or, tapped once the wallet has 円 in it, how many 円 (2026-11-13,
// the user: no longer the way to 古道具屋, which is up the hill); which of the two it shows is kept on this device
const PURSE = 'nq_purse';
const purseYen = () => { try { return yenEarned() > 0 && localStorage.getItem(PURSE) === 'yen'; } catch (e) { return false; } };
function purseParts(yen = purseYen()) {
  return { cls: yen ? ' yen' : '', html: `${yen ? yenIcon() : kotoIcon()}<span>${yen ? yenStr(yenBalance()) : kotoBalance()}</span>`,
    label: yen ? `${yenStr(yenBalance())} 円，點一下看言靈` : `言靈 ${kotoBalance()}${yenEarned() > 0 ? '，點一下看円' : ''}` };
}
function purseFill(kb, yen = purseYen()) { const p = purseParts(yen); kb.classList.toggle('yen', yen); kb.innerHTML = p.html; kb.setAttribute('aria-label', p.label); }
function kotoButtons(root) { root.querySelectorAll('.study-koto').forEach((kb) => purseFill(kb)); }   // with the balance now
function purseToggle() {
  const yen = yenEarned() > 0 && !purseYen();
  if (yenEarned() > 0) { try { localStorage.setItem(PURSE, yen ? 'yen' : 'koto'); } catch (e) { /* no storage: this visit only */ } }
  document.querySelectorAll('.study-koto').forEach((kb) => { purseFill(kb, yen); kb.classList.remove('bump'); void kb.offsetWidth; kb.classList.add('bump'); });
}
// a swipe on the yard (1.2.0): one finger anywhere but on a button (a ware outside 擺設 too) looks along the yard; let go
// moving, it coasts on; pulled past an end, it springs back
function yPanStart(yard, e) {
  if (yed.drag || !yCamMax() || (e.pointerType === 'mouse' && e.button !== 0) || e.target.closest('.yard-tools, .yedit, .dress, .yhero, .talk, a') || (e.target.closest('button') && !e.target.closest('.yworld')) || (yed.on && e.target.closest('.yware'))) return;   // a finger on someone or something in the scene may still swipe (2026-11-10, the user: swipes went dead in the rooms)
  cancelAnimationFrame(ycoast); yard.querySelector('.yworld').classList.remove('glide');
  ypan = { id: e.pointerId, x0: e.clientX, y0: e.clientY, c0: ycam.x, on: false, hist: [] };
}
const YSWIPE = 1.8;   // test (2026-11-09; the user: less swiping out of doors): the view goes this much further than the finger, and coasts as much faster
function yPanMove(yard, e) {
  if (!ypan || e.pointerId !== ypan.id) return;
  const dx = e.clientX - ypan.x0, dy = e.clientY - ypan.y0;
  if (!ypan.on) {
    if (Math.abs(dx) < 8 || Math.abs(dx) < Math.abs(dy)) return;
    ypan.on = true; YCAM.free = true; try { yard.setPointerCapture(e.pointerId); } catch (err) { /* a pointer the page did not see go down */ }
  }
  yCamTo(yard, ypan.c0 - dx * YSWIPE, 0.3);
  ypan.hist.push([performance.now(), e.clientX]); if (ypan.hist.length > 8) ypan.hist.shift();
}
function yPanEnd(yard, e) {
  if (!ypan || e.pointerId !== ypan.id) return;
  const p = ypan; ypan = null; if (!p.on) return;
  yard._noClick = true; setTimeout(() => { yard._noClick = false; }, 0);   // the click that ends a swipe is no tap
  const m = yCamMax(), w = yard.querySelector('.yworld');
  if (Math.abs(ycam.x) > m) { w.classList.add('glide'); yCamTo(yard, Math.max(-m, Math.min(m, ycam.x))); setTimeout(() => w.classList.remove('glide'), 380); return; }
  const now = performance.now(), h = p.hist.filter((q) => now - q[0] < 100);
  if (h.length < 2 || (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches)) return;
  let v = YSWIPE * (h[0][1] - h[h.length - 1][1]) / Math.max(16, h[h.length - 1][0] - h[0][0]), t0 = now;   // px a ms
  if (Math.abs(v) < 0.1) return;
  const step = (t) => {
    const dt = Math.min(50, t - t0); t0 = t;
    const x0 = ycam.x; yCamTo(yard, ycam.x + v * dt); v *= Math.pow(0.94, dt / 16);
    if (yard.isConnected && ycam.x !== x0 && Math.abs(v) > 0.02) ycoast = requestAnimationFrame(step);
  };
  ycoast = requestAnimationFrame(step);
}
function yardLevel(yard, pct) {
  kotoButtons(yard);
  const f = pct / 100;
  yard.style.setProperty('--f', f);
  yard.classList.toggle('full', pct >= 100);
  yard.querySelectorAll('.st').forEach(el => el.classList.toggle('on', Number(el.dataset.t) <= f));
  mailboxLevel();
}
// the sky's layout, the same every day (a fixed seed): each star carries the share of the list that lights it — six faint ones
// from the start, the rest by 80%, the seven of the constellation at 100%; fireflies and flowers spread along the yard's whole
// width (1.2.0: 1200px, a phone sees a third of it at a time)
const SKY = (() => {
  let a = 20261106;
  const rnd = () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };   // mulberry32
  const r2 = (x) => Math.round(x * 100) / 100;
  const stars = Array.from({ length: 72 }, (_, i) => ({ x: r2(rnd() * 100), y: r2(rnd() * 100), s: r2(rnd() < 0.12 ? 2.2 + rnd() * 0.6 : 1 + rnd() * 1.1), t: i < 6 ? 0 : r2(0.8 * (i - 5) / 66), d: r2(2 + rnd() * 3.5), w: r2(rnd() * 5) }));
  [[60, 15], [66, 13], [72, 16], [77, 21], [75, 28], [83, 30], [85, 23]].forEach(([x, y], i) => stars.push({ x, y, s: 2.6, t: 1, d: 3, w: i * 0.4, dip: true }));
  const flies = Array.from({ length: 30 }, () => ({ x: r2(4 + rnd() * 92), y: Math.round(rnd() * 160), dx: Math.round(rnd() * 60 - 30), dy: Math.round(rnd() * 30 - 15), d: r2(5 + rnd() * 5), w: r2(rnd() * 6) }));
  const flowers = Array.from({ length: 40 }, () => ({ x: r2(3 + rnd() * 94), y: Math.round(150 + rnd() * 56), c: ['#ff9ec4', '#ffffff', '#ffd166', '#c9a7ff', '#ff8a8a'][Math.floor(rnd() * 5)], d: r2(2.5 + rnd() * 2), w: r2(rnd() * 3) }));
  // faint ones (2026-11-10, the user: night was too dark): there every night, small and dim, a third of them twinkling slowly
  const faint = Array.from({ length: 78 }, (_, i) => `<circle cx="${r2(rnd() * 100)}%" cy="${r2(rnd() * 72)}%" r="${r2(0.5 + rnd() * 0.7)}"${i % 3 ? '' : ' class="tw"'}/>`);
  return { stars, flies, flowers, faint: `<svg class="faint" aria-hidden="true"><g>${faint.filter((c) => !c.includes('tw')).join('')}</g><g class="tw">${faint.filter((c) => c.includes('tw')).join('')}</g></svg>` };
})();
// 古道具屋 on its hill (1.2.0): an old wooden shop, a tiled roof with turned-up eaves, a 古 noren, a paper lantern, a pot and
// a box outside, 福爺 at the door; by night the lantern and the doorway glow, so do the lamps on the path
const HILL = 'M320 600 V356 C370 340 412 304 446 276 C460 264 470 252 482 250 C494 248 506 256 520 268 C552 296 594 326 646 350';
const SHOP_ART = `<circle class="s-glow" cx="0" cy="-18" r="48" fill="url(#shopGlow)"/><path class="s-ground" d="M-36 2 Q0 -4 36 2 L36 5 L-36 5 Z"/>
  <rect class="s-wall" x="-20" y="-25" width="40" height="26"/><path class="s-beam" d="M-20 -25 H20 V-22 H-20 Z M-20 -12 H-13 V-10 H-20 Z M13 -12 H20 V-10 H13 Z"/>
  <rect class="s-open" x="-12" y="-20" width="24" height="21"/><path class="s-noren" d="M-13 -21 H13 V-9 H8.9 V-12 H4.3 V-9 H0.1 V-12 H-4.3 V-9 H-8.6 V-12 H-13 Z"/><text class="s-ko" x="0" y="-13.4" text-anchor="middle">古</text>
  <path class="s-roof" d="M-29 -21 Q-25 -22 -22 -25 L-14 -36 H14 L22 -25 Q25 -22 29 -21 Z"/><path class="s-rim" d="M-29 -21 Q-25 -22 -22 -25 L-14 -36 H14 L22 -25 Q25 -22 29 -21"/><path class="s-tile" d="M-17 -32 H17 M-20 -28 H20"/>
  <rect class="s-sign" x="-9" y="-35" width="18" height="6" rx=".8"/><line class="s-cord" x1="23" y1="-22" x2="23" y2="-18.5"/><ellipse class="s-paper" cx="23" cy="-14" rx="3.3" ry="4.4"/><path class="s-band" d="M19.9 -15.6 H26.1 M19.9 -12.4 H26.1"/>
  <path class="s-pot" d="M-27 1 C-30 -2 -30 -7 -27 -9 H-23 C-20 -7 -20 -2 -23 1 Z"/><rect class="s-pot-rim" x="-27.6" y="-10.4" width="5.2" height="1.6" rx=".6"/><rect class="s-box" x="21" y="-5" width="9" height="6"/><rect class="s-box2" x="22.5" y="-9" width="6" height="4"/>
  <g class="s-owl"><ellipse cx="-16" cy="-3.6" rx="3.2" ry="3.8"/><path d="M-18.6 -6.6 L-18 -8.6 L-16.6 -7 M-13.4 -6.6 L-14 -8.6 L-15.4 -7"/><circle class="s-owl-eye" cx="-17.2" cy="-4.6" r=".9"/><circle class="s-owl-eye" cx="-14.8" cy="-4.6" r=".9"/></g>`;
// the house in the yard: the cottage, or a look bought at 古道具屋 (1.2.0: 蘑菇屋), drawn in the same 140 × 130 box with its
// windows, chimney and door where the cottage has them (the lights by night, the smoke and 進屋 stay where they are)
const hc = (c, n) => `class="hc" style="--c:${c};--n:${n}"`, hs = (c, n) => `class="hs" style="--c:${c};--n:${n}"`;
const hcx = (cls, c, n, more = '') => `class="hc ${cls}" style="--c:${c};--n:${n};${more}"`, hsx = (cls, c, n, more = '') => `class="hs ${cls}" style="--c:${c};--n:${n};${more}"`;   // with a class of its own (a moving part, 2026-11-10)   // a part of a house: its colour by day, by night
const HOUSE_ART = {
  // 2026-11-10 (the user: a box with a triangle on it): a brick chimney, the roof in shingles with its fascia, clapboard walls with
  // corner boards on a stone footing, the shade under the eaves; windows framed, with sills, shutters and boxes of flowers; the door
  // framed and panelled under a little gabled canopy, a lamp beside it lit by night, a mat; bushes at the corners; two stone steps
  // down to the lawn, where the path begins (it ran into the door): each a light tread over a shaded riser, a shadow on the grass
  // under them, so they read as standing out in front of the house (a flat grey shape looked like a lump under the door)
  cottage: `<rect class="chim" x="92" y="30" width="12" height="30"/><path class="brick" d="M92 36 H104 M92 42 H104 M92 48 H104 M92 54 H104 M98 30 V36 M95 36 V42 M101 36 V42 M98 42 V48 M95 48 V54 M101 48 V54 M98 54 V60"/><rect class="roof" x="89" y="27" width="18" height="5" rx="1"/>
    <rect class="wall" x="22" y="66" width="96" height="64"/><path class="siding" d="M22 77 H118 M22 85 H118 M22 93 H118 M22 101 H118 M22 109 H118 M22 117 H118"/><path class="eave" d="M22 66 H118 V72 H22 Z"/>
    <rect class="trim" x="22" y="66" width="4" height="60"/><rect class="trim" x="114" y="66" width="4" height="60"/><rect class="stone" x="20" y="124" width="100" height="6"/><path class="brick" d="M34 124 V130 M52 124 V130 M88 124 V130 M106 124 V130"/>
    <path class="roof" d="M10 72 L70 20 L130 72 Z"/><path class="shingle" d="M24 60 H116 M36 50 H104 M47 40 H93 M58 31 H82 M40 60 v-4 M56 60 v-4 M72 60 v-4 M88 60 v-4 M104 60 v-4 M48 50 v-4 M64 50 v-4 M80 50 v-4 M96 50 v-4 M58 40 v-4 M74 40 v-4 M86 40 v-4 M68 31 v-3"/><path class="fascia" d="M9 73 L70 19.5 L131 73"/><path class="rim" d="M10 72 L70 20 L130 72 M89 27 H107"/>
    <circle class="trim" cx="70" cy="52" r="7.6"/><circle class="pane" cx="70" cy="52" r="6"/><path class="mull" d="M70 46 V58 M64 52 H76"/>
    <rect class="shutter" x="27.5" y="81" width="5.5" height="20" rx="1"/><rect class="shutter" x="53" y="81" width="5.5" height="20" rx="1"/><rect class="shutter" x="81.5" y="81" width="5.5" height="20" rx="1"/><rect class="shutter" x="107" y="81" width="5.5" height="20" rx="1"/><path class="slat" d="M28.5 85 h3.5 M28.5 89 h3.5 M28.5 93 h3.5 M28.5 97 h3.5 M54 85 h3.5 M54 89 h3.5 M54 93 h3.5 M54 97 h3.5 M82.5 85 h3.5 M82.5 89 h3.5 M82.5 93 h3.5 M82.5 97 h3.5 M108 85 h3.5 M108 89 h3.5 M108 93 h3.5 M108 97 h3.5"/>
    <rect class="trim" x="32.5" y="80.5" width="21" height="21" rx="2.5"/><rect class="trim" x="86.5" y="80.5" width="21" height="21" rx="2.5"/>
    <rect class="pane" x="34" y="82" width="18" height="18" rx="2"/><rect class="pane" x="88" y="82" width="18" height="18" rx="2"/>
    <path class="mull" d="M43 82 V100 M34 91 H52 M97 82 V100 M88 91 H106"/>
    <rect class="trim" x="31" y="100.5" width="24" height="2.6" rx="1"/><rect class="trim" x="85" y="100.5" width="24" height="2.6" rx="1"/>
    <rect class="fbox" x="32" y="103" width="22" height="5" rx="1"/><rect class="fbox" x="86" y="103" width="22" height="5" rx="1"/>${[[35, '#e86f5e'], [39, '#f2c94c'], [43, '#e58fa8'], [47, '#ffffff'], [51, '#e86f5e'], [89, '#f2c94c'], [93, '#e58fa8'], [97, '#e86f5e'], [101, '#ffffff'], [105, '#f2c94c']].map(([x, c], k) => `<circle class="leafy" cx="${x + 1}" cy="${102.6 - (k % 2)}" r="2.2"/><circle class="flower" cx="${x}" cy="${101.4 - (k % 2) * 1.2}" r="1.5" style="fill:${c}"/>`).join('')}
    <path class="roof" d="M53 101 L70 91.5 L87 101 Z"/><path class="rim" d="M53 101 L70 91.5 L87 101"/><path class="trim" d="M58.5 130 V108.2 a11.5 11.5 0 0 1 23 0 V130 Z"/>
    <path class="door" d="M61 130 V108 a9 9 0 0 1 18 0 V130 Z"/><path class="panel" d="M64.5 126 V112 h11 V126 Z M64.5 118 h11"/><circle class="knob" cx="75.5" cy="120" r="1.3"/>
    <circle class="lampglow" cx="88.5" cy="111" r="9"/><path class="trim" d="M86 105 h5 v2.4 h-5 Z"/><path class="lamp" d="M86.2 107.4 h4.6 l-.9 5.6 h-2.8 Z"/>
    <circle class="bush" cx="20" cy="125" r="7"/><circle class="bush" cx="28" cy="128" r="5"/><circle class="bush" cx="120" cy="125" r="7"/><circle class="bush" cx="112" cy="128" r="5"/>
    <ellipse class="stepshade" cx="70" cy="139.6" rx="25" ry="2.6"/><path class="tread" d="M57.5 129.6 H82.5 L84.2 131.8 H55.8 Z"/><path class="riser" d="M55.8 131.8 H84.2 V134.2 H55.8 Z"/><path class="tread" d="M53.5 134.2 H86.5 L88.6 136.8 H51.4 Z"/><path class="riser" d="M51.4 136.8 H88.6 V139.4 H51.4 Z"/>
    <path class="sill" d="M59 130 H81"/><rect class="mat" x="63" y="130.2" width="14" height="1.6" rx=".8"/>`,
  // 2026-11-11 (the user: finer): the pipe banded, the stem with a shaded side and fibres, gills under the cap's edge, the cap
  // shaded round its right and under its rim with a sheen on the left, its spots raised over a soft shadow and specks between
  // them; the windows framed in wood with sills, the door framed and planked with hinges, a shade on the grass under it all
  mushroomhouse: `<ellipse fill="#2b1c12" fill-opacity=".12" cx="70" cy="130" rx="44" ry="2.6"/>
    <rect class="m-pipe" x="94" y="9" width="7" height="20" rx="1.5"/><path ${hs('#5e4e42', '#07081c')} stroke-width="1" d="M94 16 H101 M94 23 H101"/><path d="M95.8 12 V28" stroke="#fff" stroke-opacity=".2" stroke-width="1.2"/><rect class="m-pipe" x="92.5" y="7" width="10" height="4" rx="1"/>
    <path class="m-stem" d="M30 130 C20 114 22 90 38 72 H102 C118 90 120 114 110 130 Z"/><path fill="#2b1c12" fill-opacity=".08" d="M102 72 C118 90 120 114 110 130 H99 C107 112 108 92 96 76 Z"/>
    <path ${hs('#dcc8a6', '#0a0b24')} stroke-width=".8" d="M34 92 C33 104 33 116 35 126 M106 92 C107 104 107 116 105 126 M58 80 C57.5 86 57.5 92 58 97 M82 80 C82.5 86 82.5 92 82 97"/>
    <path class="m-shade" d="M38 72 H102 C104 75 106 78 108 81 C84 87 56 87 32 81 C34 78 36 75 38 72 Z"/>
    <path class="m-gill" d="M12 72 C40 85 100 85 128 72 C100 80 40 80 12 72 Z"/><path ${hs('#c9ae86', '#0e0f30')} stroke-width=".7" d="${Array.from({ length: 27 }, (_, i) => { const x = 18 + i * 4, b = 72 + 9.6 * (1 - ((x - 70) / 58) ** 2); return `M${x} ${(b - 4.5).toFixed(1)} L${(x + (70 - x) * 0.05).toFixed(1)} ${(b - 0.5).toFixed(1)}`; }).join(' ')}"/>
    <path class="m-cap" d="M6 72 C4 34 36 11 70 11 C104 11 136 34 134 72 C110 80 30 80 6 72 Z"/>
    <path fill="#2b1c12" fill-opacity=".1" d="M134 72 C135 50 124 32 104 19 C119 33 125 52 119 76 C125 75 130 74 134 72 Z"/><path fill="#2b1c12" fill-opacity=".09" d="M6 72 C30 80 110 80 134 72 L133.4 65 C110 73 30 73 6.6 65 Z"/>
    <path fill="#fff" fill-opacity=".14" d="M15 54 C18 34 38 18 62 14.5 C44 22 28 34 21 56 Z"/><path class="rim" d="M6 72 C4 34 36 11 70 11 C104 11 136 34 134 72"/>
    <g fill="#2b1c12" fill-opacity=".13">${[[36, 38, 8], [64, 24, 5.5], [102, 40, 8.5], [20, 60, 5], [120, 61, 5.5], [88, 22, 4], [50, 60, 4.2], [94, 62, 4.6]].map(([x, y, r]) => `<circle cx="${x + 0.8}" cy="${y + 1.1}" r="${r}"/>`).join('')}</g>
    <circle class="m-dot" cx="36" cy="38" r="8"/><circle class="m-dot" cx="64" cy="24" r="5.5"/><circle class="m-dot" cx="102" cy="40" r="8.5"/><circle class="m-dot" cx="20" cy="60" r="5"/>
    <circle class="m-dot" cx="120" cy="61" r="5.5"/><circle class="m-dot" cx="88" cy="22" r="4"/><circle class="m-dot" cx="50" cy="60" r="4.2"/><circle class="m-dot" cx="94" cy="62" r="4.6"/>
    <g fill="#2b1c12" fill-opacity=".1">${[[36, 38, 8], [102, 40, 8.5], [20, 60, 5], [120, 61, 5.5]].map(([x, y, r]) => `<path d="M${x + r} ${y} a${r} ${r} 0 0 1 ${(-1.5 * r).toFixed(2)} ${(0.866 * r).toFixed(2)} a${1.3 * r} ${1.3 * r} 0 0 0 ${(1.5 * r).toFixed(2)} ${(-0.866 * r).toFixed(2)} Z"/>`).join('')}</g>
    <g class="m-dot">${[[52, 38, 1.4], [80, 34, 1.1], [27, 47, 1.2], [112, 50, 1.3], [74, 16, 1], [46, 21, 1.1], [108, 27, 1], [36, 66, 1]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}"/>`).join('')}</g>
    <circle class="pane" cx="70" cy="48" r="6"/><path class="mull" d="M70 42 V54 M64 48 H76"/><circle ${hs('#8a5a3a', '#1c1838')} stroke-width="2" cx="70" cy="48" r="7"/>
    <circle class="pane" cx="45" cy="96" r="8"/><circle class="pane" cx="95" cy="96" r="8"/><path fill="#2b1c12" fill-opacity=".12" d="M37 96 a8 8 0 0 1 8 -8 v2.2 a5.8 5.8 0 0 0 -5.8 5.8 Z M87 96 a8 8 0 0 1 8 -8 v2.2 a5.8 5.8 0 0 0 -5.8 5.8 Z"/><path class="mull" d="M45 88 V104 M37 96 H53 M95 88 V104 M87 96 H103"/>
    <circle ${hs('#8a5a3a', '#1c1838')} stroke-width="2.4" cx="45" cy="96" r="9.2"/><circle ${hs('#8a5a3a', '#1c1838')} stroke-width="2.4" cx="95" cy="96" r="9.2"/>
    <rect ${hc('#9a6a44', '#1c1838')} x="34" y="105.4" width="22" height="2.6" rx="1.3"/><rect ${hc('#9a6a44', '#1c1838')} x="84" y="105.4" width="22" height="2.6" rx="1.3"/><path d="M35.5 105.9 H54.5 M85.5 105.9 H104.5" stroke="#fff" stroke-opacity=".22" stroke-width=".6"/>
    <path class="door" d="M61 130 V108 a9 9 0 0 1 18 0 V130 Z"/><path class="panel" d="M67 129 V100.4 M73 129 V100.4"/><path ${hs('#3a2a22', '#08091c')} stroke-width="1.6" d="M61.4 112 h4.4 M61.4 124 h4.4"/><circle class="knob" cx="75" cy="120" r="1.3"/>
    <path ${hs('#8a5a3a', '#1c1838')} stroke-width="2.2" d="M59.9 130 V108 a10.1 10.1 0 0 1 20.2 0 V130"/>
    <path class="m-grass" d="M26 130 q2 -7 4 0 q2 -5 4 0 M106 130 q2 -6 4 0 q2 -7 4 0"/>`,
  // test (2026-11-09): 薑餅屋, 樹墩屋, 茶壺屋 and, sold for Halloween, 南瓜屋 — each part coloured by day and by night (hc／hs)
  // 2026-11-11 (the user: finer): 薑餅屋's chimney bricked in icing with drips off its cap, the biscuit walls baked darker at
  // their edges and pricked, a shade under the eaves and a row of piped beads along the foot; the chocolate roof scored into
  // squares, the gumdrops sugared and shiny; beads of icing under the windows, the door planked with icing hinges, a shine on
  // the candy cane and a swirl on each sweet
  gingerhouse: `<rect ${hc('#b8584a', '#1e1424')} x="92" y="30" width="12" height="30"/><path ${hs('#efc4b2', '#30223a')} stroke-width=".8" d="M92 36 H104 M92 42 H104 M98 32 V36 M95 36 V42 M101 36 V42 M98 42 V48"/>
    <rect ${hc('#fffaf2', '#4a4668')} x="90" y="27" width="16" height="5" rx="2.5"/><path ${hc('#fffaf2', '#4a4668')} d="M93.4 31 v2.4 a1.2 1.2 0 0 0 2.4 0 V31 Z M100.6 31 v3.6 a1.2 1.2 0 0 0 2.4 0 V31 Z"/>
    <rect ${hc('#c98a4f', '#20161c')} x="20" y="66" width="100" height="64" rx="2"/><rect ${hs('#b47440', '#1a1118')} stroke-width="1.6" x="21" y="67" width="98" height="62" rx="1.5"/><path fill="#2b1c12" fill-opacity=".12" d="M20 73 H120 V81 H20 Z"/>
    <g ${hc('#a5693a', '#160e14')}>${[[26, 84], [26, 94], [26, 104], [27, 113], [57, 85], [57, 93], [83, 85], [83, 93], [114, 84], [114, 94], [114, 104], [113, 112], [35, 110], [45, 111], [52, 118], [34, 117], [102, 111], [108, 117], [70, 84], [64, 90], [76, 90]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r=".9"/>`).join('')}</g>
    <path ${hc('#fffaf2', '#4a4668')} d="${[22, 25.4, 28.8, 32.2, 35.6, 39, 42.4, 45.8, 49.2, 52.6, 84.6, 98.2, 101.6, 105, 108.4, 111.8, 115.2].map((x) => `M${x} 130 a1.7 1.7 0 0 1 3.4 0 Z`).join(' ')}"/>
    <path ${hc('#a8653c', '#1a1220')} d="M8 72 L70 20 L132 72 Z"/>
    <path ${hs('#8c4f2a', '#120b16')} stroke-width="1.1" d="${[34, 46, 58].map((y) => { const w = (y - 20) * 62 / 52 - 4.5; return `M${(70 - w).toFixed(1)} ${y} H${(70 + w).toFixed(1)}`; }).join(' ')} ${[[24, 34, [70]], [34, 46, [60, 80]], [46, 58, [46, 94]], [58, 68, [30, 52, 70, 88, 110]]].map(([a, b, xs]) => xs.map((x) => `M${x} ${a} V${b}`).join(' ')).join(' ')}"/>
    <path stroke="#fff" stroke-opacity=".12" stroke-width=".8" d="${[34, 46, 58].map((y) => { const w = (y - 20) * 62 / 52 - 5; return `M${(70 - w).toFixed(1)} ${y + 1.1} H${(70 + w).toFixed(1)}`; }).join(' ')}"/>
    <path ${hs('#fffaf2', '#4a4668')} stroke-width="5" d="M8 72 L70 20 L132 72"/>
    <path ${hc('#fffaf2', '#4a4668')} d="M6 69 H134 V74 H6 Z${[14, 26, 38, 50, 62, 74, 86, 98, 110, 122].map((x, i) => ` M${x} 73 v${i % 2 ? 4 : 7} a3 3 0 0 0 6 0 v-${i % 2 ? 4 : 7} Z`).join('')}"/>
    ${[[44, 52, '#f27fa6', '#3a1a34'], [70, 36, '#7cc47a', '#16301e'], [96, 52, '#f4c542', '#3a3016'], [58, 61, '#6fa8e8', '#18244a'], [84, 62, '#f27fa6', '#3a1a34']].map(([x, y, c, n]) => `<path ${hc(c, n)} d="M${x - 4.5} ${y + 2} a4.5 4.5 0 0 1 9 0 Z"/><path d="M${x - 2.9} ${y + 0.9} a3 3 0 0 1 2.3 -2.5" fill="none" stroke="#fff" stroke-opacity=".45" stroke-width="1" stroke-linecap="round"/><g fill="#fff" fill-opacity=".55"><circle cx="${x + 1.7}" cy="${y - 0.3}" r=".5"/><circle cx="${x - 0.4}" cy="${y + 1}" r=".45"/><circle cx="${x + 2.8}" cy="${y + 1.3}" r=".4"/></g>`).join('')}
    <circle class="pane" cx="70" cy="50" r="6"/><path class="mull" d="M70 44 V56 M64 50 H76"/><circle ${hs('#fffaf2', '#4a4668')} stroke-width="2.4" cx="70" cy="50" r="7.4"/>
    <rect class="pane" x="34" y="82" width="18" height="18" rx="2"/><rect class="pane" x="88" y="82" width="18" height="18" rx="2"/><path fill="#2b1c12" fill-opacity=".12" d="M34 100 V84 a2 2 0 0 1 2 -2 H52 V84.2 H36.2 V100 Z M88 100 V84 a2 2 0 0 1 2 -2 H106 V84.2 H90.2 V100 Z"/><path class="mull" d="M43 82 V100 M34 91 H52 M97 82 V100 M88 91 H106"/>
    <rect ${hs('#fffaf2', '#4a4668')} stroke-width="2.4" x="32.5" y="80.5" width="21" height="21" rx="3"/><rect ${hs('#fffaf2', '#4a4668')} stroke-width="2.4" x="86.5" y="80.5" width="21" height="21" rx="3"/>
    <g ${hc('#fffaf2', '#4a4668')}>${[34, 37.3, 40.6, 43.9, 47.2, 50.5, 88, 91.3, 94.6, 97.9, 101.2, 104.5].map((x) => `<circle cx="${(x + 0.75).toFixed(2)}" cy="103.6" r="1.35"/>`).join('')}</g>
    <path class="door" d="M61 130 V108 a9 9 0 0 1 18 0 V130 Z"/><path class="panel" d="M67 129 V100.4 M73 129 V100.4"/><path ${hs('#fffaf2', '#4a4668')} stroke-width="1.3" d="M61.8 111 h4 M61.8 123 h4"/><circle class="knob" cx="75" cy="120" r="1.3"/><path ${hs('#fffaf2', '#4a4668')} stroke-width="2.4" d="M59 130 V108 a11 11 0 0 1 22 0 V130"/>
    <path ${hs('#fffaf2', '#4a4668')} stroke-width="3" d="M88 130 V113 a4 4 0 0 1 8 0"/><path ${hs('#d8463c', '#3a1a2a')} stroke-width="3" stroke-dasharray="2.4 2.4" d="M88 130 V113 a4 4 0 0 1 8 0"/><path d="M87.4 129 V113.4" stroke="#fff" stroke-opacity=".35" stroke-width=".8" stroke-linecap="round"/>
    ${[[28, 122, '#7cc47a', '#16301e'], [40, 124, '#f4c542', '#3a3016'], [104, 124, '#f27fa6', '#3a1a34'], [114, 121, '#6fa8e8', '#18244a']].map(([x, y, c, n]) => `<circle ${hc(c, n)} cx="${x}" cy="${y}" r="2.6"/><path d="M${x - 1.5} ${y - 0.3} a1.5 1.5 0 0 1 2.4 -1 M${x + 1.4} ${y + 0.6} a1.4 1.4 0 0 1 -2 .9" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width=".7" stroke-linecap="round"/>`).join('')}`,
  // 2026-11-11 (the user: finer): 樹墩屋's chimney laid in stones, the trunk shaded round its right with a lit left edge, finer
  // bark between the deep cracks and a knot, the roots creased; the cut top ringed in bark with a crack and its heart, moss
  // flecked lighter with a tuft hanging over the edge, veins on the sprout's leaves; the windows framed with branch sills, the
  // door planked on iron hinges, the toadstool spotted and shaded under its cap, a shade on the grass
  stumphouse: `<ellipse fill="#2b1c12" fill-opacity=".12" cx="70" cy="130" rx="62" ry="2.6"/>
    <rect ${hc('#a39d94', '#14152e')} x="92" y="18" width="10" height="26"/><path ${hs('#857f76', '#0c0d22')} stroke-width=".8" d="M92 25 H102 M92 32 H102 M92 39 H102 M97 19 V25 M95 25 V32 M99.5 32 V39 M96 39 V44"/><path d="M93.4 20 V43" stroke="#fff" stroke-opacity=".2" stroke-width="1"/><rect ${hc('#8a847b', '#101126')} x="90" y="15" width="14" height="4" rx="1"/>
    <path ${hc('#9a6a42', '#1a1426')} d="M22 130 C18 112 23 84 24 42 H116 C117 84 122 112 118 130 Z M26 118 C18 123 10 128 2 130 H30 Z M114 118 C122 123 130 128 138 130 H110 Z"/>
    <path fill="#2b1c12" fill-opacity=".12" d="M116 42 C117 84 122 112 118 130 H108 C111 110 112 80 109 42 Z M114 118 C122 123 130 128 138 130 H124 C120 127 116 124 113 121 Z"/><path fill="#fff" fill-opacity=".07" d="M24 42 C23 84 18 112 22 130 H28 C25 110 28 80 30 42 Z"/>
    <path ${hs('#86593a', '#120f22')} stroke-width=".9" d="M28 64 C27 74 28 84 27 94 M44 48 C43 56 44 62 43 68 M100 48 C101 54 100 60 101 66 M116 90 C117 98 117 106 118 114 M62 74 C61.5 80 62 86 61.6 92 M78 74 C78.5 80 78 86 78.4 92 M38 110 C37 116 38 121 37 127 M102 110 C103 116 102 121 103 127 M24 121.6 C17 125 10 128 4 129.6 M116 121.6 C123 125 130 128 136 129.6"/>
    <path ${hs('#7a4f30', '#0e0c1e')} stroke-width="1.6" d="M34 58 C32 80 34 100 32 122 M54 62 C53 72 55 82 54 92 M108 56 C110 78 108 100 110 124 M86 104 V126"/>
    <ellipse ${hc('#7f5434', '#140f20')} cx="42" cy="73" rx="2" ry="2.8"/><ellipse ${hs('#6a4429', '#0e0c1e')} stroke-width=".8" cx="42" cy="73" rx="3.6" ry="4.6"/>
    <ellipse ${hc('#e8c690', '#2a2238')} cx="70" cy="42" rx="46" ry="10"/><ellipse ${hs('#86593a', '#1a1426')} stroke-width="2" cx="70" cy="42" rx="45" ry="9.1"/><g ${hs('#c99c62', '#1c1730')} stroke-width="1.3"><ellipse cx="70" cy="42" rx="34" ry="7"/><ellipse cx="70" cy="42" rx="22" ry="4.6"/><ellipse cx="70" cy="42" rx="10" ry="2"/></g>
    <path ${hs('#bf9058', '#1c1730')} stroke-width=".9" d="M70 42 L83 46 L91 48.4 M40 38.6 L50 40"/><ellipse ${hc('#c99c62', '#1c1730')} cx="70" cy="42" rx="2.2" ry=".9"/>
    <g ${hc('#7fb069', '#12241e')}><ellipse cx="30" cy="48" rx="9" ry="4"/><ellipse cx="50" cy="51" rx="7" ry="3.2"/><ellipse cx="110" cy="48" rx="8" ry="4"/><ellipse cx="26" cy="126" rx="7" ry="3.4"/><path d="M24 49 C24 53 27 56 29 55 C30 53 31 51 32 49 Z"/></g>
    <g ${hc('#a6d088', '#1c3428')}><circle cx="27" cy="46.6" r="1.4"/><circle cx="33" cy="47.6" r="1"/><circle cx="48" cy="50" r="1.1"/><circle cx="52.6" cy="51.4" r=".8"/><circle cx="107" cy="46.6" r="1.3"/><circle cx="113" cy="47.8" r=".9"/><circle cx="24" cy="124.8" r="1.2"/><circle cx="28.4" cy="126.4" r=".8"/></g>
    <path ${hs('#5f8f4a', '#12241e')} stroke-width="2" d="M58 42 C58 36 58 32 57 28"/><path ${hc('#7fb069', '#12241e')} d="M57 30 C50 22 42 25 44 29 C48 32 53 32 57 30 Z M57 28 C61 19 71 18 71 22 C68 28 62 29 57 28 Z"/><path ${hs('#5f8f4a', '#0e1c18')} stroke-width=".6" d="M56 29.6 C52 27.4 48 27 45.4 28.4 M58 27.6 C61 23.6 65.6 21.4 69.6 21.6"/>
    <circle class="pane" cx="70" cy="62" r="6"/><path class="mull" d="M70 56 V68 M64 62 H76"/><circle ${hs('#e8c690', '#2a2238')} stroke-width="1.8" cx="70" cy="62" r="7"/>
    <circle class="pane" cx="45" cy="96" r="8"/><circle class="pane" cx="95" cy="96" r="8"/><path fill="#2b1c12" fill-opacity=".12" d="M37 96 a8 8 0 0 1 8 -8 v2.2 a5.8 5.8 0 0 0 -5.8 5.8 Z M87 96 a8 8 0 0 1 8 -8 v2.2 a5.8 5.8 0 0 0 -5.8 5.8 Z"/><path class="mull" d="M45 88 V104 M37 96 H53 M95 88 V104 M87 96 H103"/>
    <circle ${hs('#e8c690', '#2a2238')} stroke-width="2" cx="45" cy="96" r="9.4"/><circle ${hs('#e8c690', '#2a2238')} stroke-width="2" cx="95" cy="96" r="9.4"/>
    <path ${hc('#7a4f30', '#0e0c1e')} d="M34 106 H56 a1.3 1.3 0 0 1 0 2.6 H34 a1.3 1.3 0 0 1 0 -2.6 Z M84 106 H106 a1.3 1.3 0 0 1 0 2.6 H84 a1.3 1.3 0 0 1 0 -2.6 Z"/><path d="M35 106.6 H55 M85 106.6 H105" stroke="#fff" stroke-opacity=".18" stroke-width=".6"/>
    <path class="door" d="M61 130 V108 a9 9 0 0 1 18 0 V130 Z"/><path class="panel" d="M67 129 V100.4 M73 129 V100.4"/><path ${hs('#3a2a22', '#08091c')} stroke-width="1.6" d="M61.4 112 h4.4 M61.4 124 h4.4"/><circle class="knob" cx="75" cy="120" r="1.3"/><path ${hs('#e8c690', '#2a2238')} stroke-width="2" d="M59.5 130 V108 a10.5 10.5 0 0 1 21 0 V130"/>
    <rect ${hc('#f3e6d0', '#1a1830')} x="124" y="123" width="4" height="7" rx="1.5"/><path fill="#2b1c12" fill-opacity=".18" d="M124 123.6 H128 V125.2 H124 Z"/><path ${hc('#d4473a', '#2a1838')} d="M119 124 C119 116 133 116 133 124 Z"/><path fill="#2b1c12" fill-opacity=".12" d="M133 124 C133 120 131 118 128 117.4 C130.6 119 131.4 121.4 131 124 Z"/>
    <g ${hc('#fff8ec', '#4a3c66')}><circle cx="124" cy="120" r="1.2"/><circle cx="129.4" cy="121.2" r=".9"/><circle cx="127.2" cy="118.2" r=".6"/><circle cx="121.2" cy="122.6" r=".55"/></g>`,
  // 2026-11-11 (the user: finer): 茶壺屋 glazed — a sheen and a glint on the upper left of the pot, its lid and knob, a shade
  // round the lower right, the handle and spout lit along their tops, the spout's mouth dark; a seam under the lid, leaves by
  // the painted flowers and dots, the windows and door framed like painted rims, the door planked; a band on the pipe
  teapothouse: `<ellipse fill="#2b1c12" fill-opacity=".12" cx="70" cy="130" rx="46" ry="2.6"/>
    <rect ${hc('#5e7f9c', '#141a36')} x="92" y="22" width="8" height="26" rx="2"/><path ${hs('#4d6a84', '#10142c')} stroke-width="1.4" d="M92 30 H100"/><path ${hs('#7f9cb6', '#1c2446')} stroke-width="1" d="M93.6 25 V46"/><rect ${hc('#4d6a84', '#10142c')} x="90" y="19" width="12" height="4" rx="1.5"/>
    <path ${hs('#6fa3b8', '#151a36')} stroke-width="9" d="M118 72 C142 72 142 118 114 116"/><path ${hs('#a6d0de', '#222c54')} stroke-width="1.6" d="M121 69.6 C136 69.8 140.6 86 138.4 99"/><path d="M120 76.4 C132 78 134 104 116 111.6" fill="none" stroke="#2b1c12" stroke-opacity=".14" stroke-width="2"/>
    <path ${hc('#9fd0de', '#18203e')} d="M26 98 C14 92 10 80 4 66 L12 62 C17 72 23 80 32 85 Z"/><path ${hs('#c8e8f0', '#26305a')} stroke-width="1.1" d="M12.6 66 C17 73.6 22 79.6 29 84"/><path fill="#2b1c12" fill-opacity=".1" d="M26 98 C14 92 10 80 4 66 L6.4 64.8 C12 78 17 88 28 94.6 Z"/>
    <ellipse ${hc('#6fa3b8', '#151a36')} cx="8" cy="64" rx="5" ry="2.6" transform="rotate(-28 8 64)"/><ellipse fill="#2b1c12" fill-opacity=".3" cx="8.3" cy="63.6" rx="3" ry="1.3" transform="rotate(-28 8 64)"/>
    <path ${hc('#9fd0de', '#18203e')} d="M70 50 C110 50 128 70 128 94 C128 112 118 124 108 130 H32 C22 124 12 112 12 94 C12 70 30 50 70 50 Z"/>
    <path fill="#2b1c12" fill-opacity=".1" d="M128 94 C128 112 118 124 108 130 H86 C104 122 116 110 121 92 C122.6 86 123 80 122.4 74 C126.4 80 128 87 128 94 Z"/><path ${hc('#c4e5ee', '#252e58')} d="M19 84 C23 70 36 60 52 56.6 C38 63 29 72 25 86 Z"/><circle cx="31" cy="70" r="1.7" fill="#fff" fill-opacity=".5"/>
    <rect ${hc('#6fa3b8', '#151a36')} x="34" y="126" width="72" height="4" rx="2"/><path ${hs('#9cc8d8', '#1e284e')} stroke-width=".7" d="M38 126.8 H102"/>
    <path ${hs('#fffaf2', '#3a4268')} stroke-width="4" d="M16 80 C40 72 100 72 124 80"/><g ${hc('#7fb069', '#12241e')}>${[30, 50, 90, 110].map((x) => { const y = x === 30 || x === 110 ? 77.5 : 75; return `<path d="M${x - 1.9} ${y} q-1.7 -1.5 -3.6 0 q1.7 1.4 3.6 0 Z M${x + 1.9} ${y} q1.7 -1.5 3.6 0 q-1.7 1.4 -3.6 0 Z"/>`; }).join('')}</g>${[30, 50, 90, 110].map((x) => `<circle ${hc('#f08bb0', '#3a1a34')} cx="${x}" cy="${x === 30 || x === 110 ? 77.5 : 75}" r="1.8"/>`).join('')}
    <path ${hc('#7fb6c8', '#141a38')} d="M34 54 C36 38 104 38 106 54 Z"/><path ${hs('#b0d8e4', '#222c54')} stroke-width="1.4" d="M42 50.6 C44.6 45 54 41.6 64 40.8"/>
    <rect ${hc('#6fa3b8', '#151a36')} x="30" y="52" width="80" height="5" rx="2.5"/><path ${hs('#9cc8d8', '#1e284e')} stroke-width=".7" d="M33 53 H107"/><path fill="#2b1c12" fill-opacity=".13" d="M32 57 H108 C100 60.4 40 60.4 32 57 Z"/>
    <ellipse ${hc('#5e8fa4', '#121832')} cx="70" cy="41.4" rx="5" ry="1.6"/><circle ${hc('#f2c14e', '#3a3016')} cx="70" cy="36" r="6"/><path fill="#2b1c12" fill-opacity=".12" d="M76 36 a6 6 0 0 1 -9.6 4.8 a5 5 0 0 0 7.6 -4.8 Z"/><circle cx="67.6" cy="33.4" r="1.6" fill="#fff" fill-opacity=".55"/>
    <circle class="pane" cx="70" cy="47" r="5"/><path class="mull" d="M70 42 V52 M65 47 H75"/><circle ${hs('#fffaf2', '#3a4268')} stroke-width="1.5" cx="70" cy="47" r="5.9"/>
    <circle class="pane" cx="45" cy="98" r="8"/><circle class="pane" cx="95" cy="98" r="8"/><path fill="#2b1c12" fill-opacity=".12" d="M37 98 a8 8 0 0 1 8 -8 v2.2 a5.8 5.8 0 0 0 -5.8 5.8 Z M87 98 a8 8 0 0 1 8 -8 v2.2 a5.8 5.8 0 0 0 -5.8 5.8 Z"/><path class="mull" d="M45 90 V106 M37 98 H53 M95 90 V106 M87 98 H103"/>
    <circle ${hs('#fffaf2', '#3a4268')} stroke-width="2" cx="45" cy="98" r="9.4"/><circle ${hs('#fffaf2', '#3a4268')} stroke-width="2" cx="95" cy="98" r="9.4"/>
    <path class="door" d="M61 130 V108 a9 9 0 0 1 18 0 V130 Z"/><path class="panel" d="M67 129 V100.4 M73 129 V100.4"/><path ${hs('#3a4a5a', '#0a0c22')} stroke-width="1.6" d="M61.4 112 h4.4 M61.4 124 h4.4"/><circle class="knob" cx="75" cy="120" r="1.3"/><path ${hs('#fffaf2', '#3a4268')} stroke-width="2" d="M59.6 130 V108 a10.4 10.4 0 0 1 20.8 0 V130"/>
    ${[[26, 110], [114, 110]].map(([x, y]) => `<path ${hc('#7fb069', '#12241e')} d="M${x - 1} ${y + 3} q-4.6 -.2 -6 3.6 q4 .6 6 -3.6 Z M${x + 1} ${y + 3} q4.6 -.2 6 3.6 q-4 .6 -6 -3.6 Z"/><g ${hc('#f08bb0', '#3a1a34')}>${[[0, -2.6], [2.5, -0.8], [1.5, 2.1], [-1.5, 2.1], [-2.5, -0.8]].map(([dx, dy]) => `<circle cx="${x + dx}" cy="${y + dy}" r="1.6"/>`).join('')}</g><circle ${hc('#f4c542', '#3a3016')} cx="${x}" cy="${y}" r="1.3"/>`).join('')}`,
  // 2026-11-11 (the user: finer): 南瓜屋 shaded where its lobes meet and round its right, a sheen on each lobe, two more ribs on
  // the middle one, the stem ridged with a cut top, veins on the leaf; the windows and door carved with a pale rim of flesh, the
  // door planked on hinges, a band on the pipe, a shade on the grass
  pumpkinhouse: `<ellipse fill="#2b1c12" fill-opacity=".14" cx="70" cy="129.6" rx="64" ry="2.8"/>
    <rect ${hc('#5b4636', '#120e1e')} x="93" y="22" width="8" height="24" rx="2"/><path ${hs('#3e2f24', '#0a0814')} stroke-width="1.4" d="M93 31 H101"/><path d="M94.6 25 V44" stroke="#fff" stroke-opacity=".18" stroke-width="1"/><rect ${hc('#4a382a', '#0e0b18')} x="91" y="19" width="12" height="4" rx="1.5"/>
    <ellipse ${hc('#e8792a', '#2a1626')} cx="38" cy="92" rx="32" ry="38"/><ellipse ${hc('#e8792a', '#2a1626')} cx="102" cy="92" rx="32" ry="38"/>
    <path fill="#fff" fill-opacity=".16" d="M11 86 C12 72 19 62 28 57 C22 65 18 74 16.6 88 Z M108 57.4 C115 59 121 63 125 69 C119 65.6 113 63 107 62 Z"/><path fill="#2b1c12" fill-opacity=".1" d="M134 92 C134 112 122 128 106 130 C118 122 126 108 127 92 C128 80 126 70 122 62 C130 70 134 80 134 92 Z"/>
    <g fill="#2b1c12" fill-opacity=".16"><ellipse cx="40" cy="92" rx="9" ry="33"/><ellipse cx="100" cy="92" rx="9" ry="33"/></g>
    <ellipse ${hc('#f5913a', '#33192a')} cx="70" cy="88" rx="36" ry="42"/>
    <path fill="#fff" fill-opacity=".18" d="M41 74 C43 61 51 52 62 48.4 C55 55 50 63 46.6 76 Z"/><path fill="#2b1c12" fill-opacity=".09" d="M106 88 C106 110 96 124 82 130 C93 119 99.6 104 99.6 88 C99.6 72 96 61 90 53 C100 61 106 73 106 88 Z"/>
    <path ${hs('#d0661f', '#1a0e1c')} stroke-width="1.6" d="M50 52 C42 72 42 110 52 128 M90 52 C98 72 98 110 88 128 M18 70 C12 88 14 110 22 124 M122 70 C128 88 126 110 118 124"/><path ${hs('#e27d2c', '#26121f')} stroke-width="1.1" d="M62 47 C58.6 60 58 76 59.6 96 M78 47 C81.4 60 82 76 80.4 96"/>
    <path ${hc('#6a8a3c', '#14221a')} d="M66 48 C64 40 66 32 72 28 L76 31 C72 35 71 41 73 48 Z"/><path ${hs('#51702c', '#0c1812')} stroke-width=".7" d="M68.2 47 C67 40 68.4 34 72.6 30.2 M70.8 47.4 C70 41 71.4 35.4 74.6 31.8"/><ellipse ${hc('#a8b878', '#1c2a20')} cx="74" cy="29.5" rx="2.5" ry="1.1" transform="rotate(37 74 29.5)"/>
    <path ${hc('#7fb069', '#12241e')} d="M74 36 C82 28 94 30 96 36 C88 40 80 40 74 36 Z"/><path ${hs('#5f8f4a', '#0e1c18')} stroke-width=".6" d="M75.4 36 C82 33.6 89 33.4 95 35.6 M80.6 35 L83.4 32.4 M86.6 34.4 L89.6 32.2 M83.4 35.6 L86 37.6"/>
    <path ${hs('#6a8a3c', '#14221a')} stroke-width="1.4" d="M65 44 C57 40 56 32 62 32 C66 32 66 37 62 37"/>
    <circle class="pane" cx="70" cy="60" r="5"/><path class="mull" d="M70 55 V65 M65 60 H75"/><circle ${hs('#fbcf96', '#5a2e2a')} stroke-width="1.4" cx="70" cy="60" r="5.7"/>
    <path class="pane" d="M35 100 L45 84 L55 100 Z"/><path class="pane" d="M85 100 L95 84 L105 100 Z"/><path ${hs('#fbcf96', '#5a2e2a')} stroke-width="1.5" d="M35 100 L45 84 L55 100 Z M85 100 L95 84 L105 100 Z"/>
    <path class="door" d="M61 130 V108 a9 9 0 0 1 18 0 V130 Z"/><path class="panel" d="M67 129 V100.4 M73 129 V100.4"/><path ${hs('#3a2a22', '#08091c')} stroke-width="1.6" d="M61.4 112 h4.4 M61.4 124 h4.4"/><circle class="knob" cx="75" cy="120" r="1.3"/><path ${hs('#fbcf96', '#5a2e2a')} stroke-width="1.8" d="M59.9 130 V108 a10.1 10.1 0 0 1 20.2 0 V130"/>`,
  // ---- Christmas (2026-11-14, the user: two houses) ----
  // 雪屋: a かまくら, a dome of packed snow (its blocks faint, shaded blue round its right, moonlit by night), the doorway warm with
  // candlelight by night under a straw rope with paper streamers, two little round ice windows, a stove pipe where the chimney is,
  // snow heaped against its foot (within it: past its sides a heap would hang over the hill) and a snow lantern by the door
  kamakura: `<ellipse fill="#2b1c12" fill-opacity=".1" cx="70" cy="130.4" rx="62" ry="2.6"/>
    <rect ${hc('#7a7f88', '#14162c')} x="93" y="28" width="7" height="26" rx="1.4"/><rect ${hc('#646a74', '#101226')} x="91.6" y="26" width="9.8" height="4" rx="1.2"/><path d="M94.6 31 V52" stroke="#fff" stroke-opacity=".25" stroke-width="1"/>
    <path ${hc('#f4f7fb', '#4a5384')} d="M10 130 C8 86 34 40 70 40 C106 40 132 86 130 130 Z"/><path ${hc('#dfe6f1', '#3a4270')} d="M130 130 C132 86 106 40 70 40 C96 46 116 82 114 130 Z"/>
    <path ${hs('#c9d4e4', '#343c66')} stroke-width=".9" d="M14 112 C40 106 100 106 126 112 M18 94 C44 87 96 87 122 94 M28 76 C50 69 90 69 112 76 M42 59 C58 54 82 54 98 59 M40 112 V94 M70 106 V88 M100 112 V94 M52 92 V74 M88 92 V74 M64 72 V56 M80 72 V56"/>
    <path fill="#fff" fill-opacity=".35" d="M22 100 C24 76 40 54 60 46 C44 58 32 76 28 100 Z"/>
    <circle ${hc('#dfe6f1', '#3a4270')} cx="43" cy="91" r="8.4"/><circle class="pane" cx="43" cy="91" r="6.4"/><path class="mull" d="M43 84.6 V97.4"/>
    <circle ${hc('#dfe6f1', '#3a4270')} cx="97" cy="91" r="8.4"/><circle class="pane" cx="97" cy="91" r="6.4"/><path class="mull" d="M97 84.6 V97.4"/>
    <path ${hc('#e4ebf4', '#3e477a')} d="M54 130 V112 C54 100 61 94 70 94 C79 94 86 100 86 112 V130 Z"/>
    <path class="pane" d="M58 130 V113 C58 104 63 99 70 99 C77 99 82 104 82 113 V130 Z"/><path fill="#2b1c12" fill-opacity=".18" d="M58 113 C58 104 63 99 70 99 C77 99 82 104 82 113 C78 107 74 105 70 105 C66 105 62 107 58 113 Z"/>
    <path ${hc('#8a5a3a', '#2a1c26')} d="M65 130 V122 H75 V130 Z"/><ellipse cx="70" cy="121.6" rx="2.2" ry="1" fill="#f2c94c"/><path d="M70 121 Q68.6 118 70 116 Q71.4 118 70 121 Z" style="fill:color-mix(in srgb,#e8a33a calc(var(--day,1)*100%),#fff2a8)"/>
    <path ${hs('#c9a25a', '#3a2a24')} stroke-width="2.2" d="M53 99 Q70 92 87 99"/><path ${hs('#a8843e', '#2c2020')} stroke-width=".7" d="M56 97.4 l1.4 2 M60 96 l1.4 2 M64 95 l1.4 2 M68 94.6 l1.4 2 M72 94.6 l1.4 2 M76 95 l1.4 2 M80 96 l1.4 2 M84 97.4 l1.4 2"/>
    <path ${hc('#f8f6f0', '#5a6090')} d="M60.6 96.6 l1.6 3 l-1.6 1.6 l1.6 3 L59 101 l1.6 -1.6 Z M70 95 l1.6 3 l-1.6 1.6 l1.6 3 L68.4 99.4 l1.6 -1.6 Z M79.4 96.6 l1.6 3 l-1.6 1.6 l1.6 3 L77.8 101 l1.6 -1.6 Z"/>
    <path ${hc('#ffffff', '#5c66a0')} d="M11 130.6 C16 121 26 122 32 127.6 C38 124 46 126 50 130.6 Z M90 130.6 C96 125 106 124 112 127.6 C120 121 126 122 129 130.6 Z"/>
    <path ${hc('#f4f7fb', '#4a5384')} d="M100 130 C99 122 104 118 108 118 C112 118 117 122 116 130 Z"/><path class="pane" d="M105 125 H111 V129 H105 Z"/><path ${hc('#e4ebf4', '#3e477a')} d="M101 119 C103 114 113 114 115 119 Z"/>`,
  // 雪中小木屋: a cabin of round logs (their ends at the corners, shaded along each underside) on a stone footing, a roof deep in
  // snow with icicles along its eaves and a string of coloured lights glowing by night, windows framed with snow on their sills,
  // a wreath on the door, a stone chimney capped with snow (no heaps at its corners: past the walls the hill falls away and they
  // floated, 2026-11-14 the user)
  logcabin: `<ellipse fill="#2b1c12" fill-opacity=".12" cx="70" cy="130.4" rx="58" ry="2.6"/>
    <rect ${hc('#8a8478', '#181a30')} x="91" y="26" width="14" height="34"/><path ${hs('#6f6a60', '#101226')} stroke-width=".9" d="M91 33 H105 M91 40 H105 M91 47 H105 M91 54 H105 M98 26 V33 M95 33 V40 M101 33 V40 M98 40 V47 M95 47 V54 M101 47 V54"/><path ${hc('#f8fafd', '#4e5788')} d="M89 27 C89 21 107 21 107 27 L106 29 H90 Z"/>
    <rect ${hc('#9c6a42', '#1e1a36')} x="22" y="64" width="96" height="62"/>
    <path ${hs('#7a4e2e', '#120f26')} stroke-width="1.4" d="M22 71 H118 M22 78 H118 M22 85 H118 M22 92 H118 M22 99 H118 M22 106 H118 M22 113 H118 M22 120 H118"/><path ${hs('#b8875c', '#2a2440')} stroke-width=".8" d="M22 66 H118 M22 73 H118 M22 80 H118 M22 87 H118 M22 94 H118 M22 101 H118 M22 108 H118 M22 115 H118 M22 122 H118"/>
    ${[67.5, 74.5, 81.5, 88.5, 95.5, 102.5, 109.5, 116.5, 123].map((y) => `<circle ${hc('#c8955f', '#2a2238')} cx="20.4" cy="${y}" r="3.4"/><circle ${hc('#c8955f', '#2a2238')} cx="119.6" cy="${y}" r="3.4"/><circle ${hs('#8a5a32', '#16122a')} stroke-width=".6" cx="20.4" cy="${y}" r="1.6"/><circle ${hs('#8a5a32', '#16122a')} stroke-width=".6" cx="119.6" cy="${y}" r="1.6"/>`).join('')}
    <rect ${hc('#8f8b81', '#181a30')} x="18" y="124" width="104" height="6" rx="1"/>
    <path ${hc('#6e4a33', '#16132c')} d="M8 74 L70 20 L132 74 L126 76 L70 28 L14 76 Z"/>
    <path ${hc('#f8fafd', '#4e5788')} d="M6 73 C4 70 6 67 9 67 L70 14 L131 67 C134 67 136 70 134 73 C128 75 124 72 120 73 C114 75 110 72 104 74 L70 44 L36 74 C30 72 26 75 20 73 C16 72 12 75 6 73 Z"/><path ${hc('#e1e8f2', '#3e477a')} d="M70 14 L131 67 C134 67 136 70 134 73 C128 75 124 72 120 73 L70 28 Z"/>
    <path fill="#fff" fill-opacity=".5" d="M14 66 L70 18 L66 23 L18 66 Z"/>
    <path ${hc('#dceaf6', '#465080')} d="M20 74 l1.4 6 l1.4 -6 Z M34 74.6 l1.2 5 l1.2 -5 Z M50 74 l1.4 7 l1.4 -7 Z M88 74 l1.4 6.6 l1.4 -6.6 Z M104 74.4 l1.2 5 l1.2 -5 Z M117 74 l1.4 6 l1.4 -6 Z"/>
    <circle cx="16.8" cy="71.4" r="4.2" fill="#ff6a5a" style="opacity:calc(.5 * (1 - var(--day, 1)))"/><circle cx="16.8" cy="71.4" r="1.7" style="fill:color-mix(in srgb,#ff6a5a calc(var(--md, var(--day, 1)) * 70%),#fff6d0)"/><circle cx="21.7" cy="67.3" r="4.2" fill="#ffd36a" style="opacity:calc(.5 * (1 - var(--day, 1)))"/><circle cx="21.7" cy="67.3" r="1.7" style="fill:color-mix(in srgb,#ffd36a calc(var(--md, var(--day, 1)) * 70%),#fff6d0)"/><circle cx="26.5" cy="63.1" r="4.2" fill="#7fc8ff" style="opacity:calc(.5 * (1 - var(--day, 1)))"/><circle cx="26.5" cy="63.1" r="1.7" style="fill:color-mix(in srgb,#7fc8ff calc(var(--md, var(--day, 1)) * 70%),#fff6d0)"/><circle cx="31.3" cy="58.9" r="4.2" fill="#8fe08a" style="opacity:calc(.5 * (1 - var(--day, 1)))"/><circle cx="31.3" cy="58.9" r="1.7" style="fill:color-mix(in srgb,#8fe08a calc(var(--md, var(--day, 1)) * 70%),#fff6d0)"/><circle cx="36.2" cy="54.8" r="4.2" fill="#ff6a5a" style="opacity:calc(.5 * (1 - var(--day, 1)))"/><circle cx="36.2" cy="54.8" r="1.7" style="fill:color-mix(in srgb,#ff6a5a calc(var(--md, var(--day, 1)) * 70%),#fff6d0)"/><circle cx="41.0" cy="50.6" r="4.2" fill="#ffd36a" style="opacity:calc(.5 * (1 - var(--day, 1)))"/><circle cx="41.0" cy="50.6" r="1.7" style="fill:color-mix(in srgb,#ffd36a calc(var(--md, var(--day, 1)) * 70%),#fff6d0)"/><circle cx="45.8" cy="46.4" r="4.2" fill="#7fc8ff" style="opacity:calc(.5 * (1 - var(--day, 1)))"/><circle cx="45.8" cy="46.4" r="1.7" style="fill:color-mix(in srgb,#7fc8ff calc(var(--md, var(--day, 1)) * 70%),#fff6d0)"/><circle cx="50.7" cy="42.3" r="4.2" fill="#8fe08a" style="opacity:calc(.5 * (1 - var(--day, 1)))"/><circle cx="50.7" cy="42.3" r="1.7" style="fill:color-mix(in srgb,#8fe08a calc(var(--md, var(--day, 1)) * 70%),#fff6d0)"/><circle cx="55.5" cy="38.1" r="4.2" fill="#ff6a5a" style="opacity:calc(.5 * (1 - var(--day, 1)))"/><circle cx="55.5" cy="38.1" r="1.7" style="fill:color-mix(in srgb,#ff6a5a calc(var(--md, var(--day, 1)) * 70%),#fff6d0)"/><circle cx="60.3" cy="33.9" r="4.2" fill="#ffd36a" style="opacity:calc(.5 * (1 - var(--day, 1)))"/><circle cx="60.3" cy="33.9" r="1.7" style="fill:color-mix(in srgb,#ffd36a calc(var(--md, var(--day, 1)) * 70%),#fff6d0)"/><circle cx="65.2" cy="29.8" r="4.2" fill="#7fc8ff" style="opacity:calc(.5 * (1 - var(--day, 1)))"/><circle cx="65.2" cy="29.8" r="1.7" style="fill:color-mix(in srgb,#7fc8ff calc(var(--md, var(--day, 1)) * 70%),#fff6d0)"/><circle cx="70.0" cy="25.6" r="4.2" fill="#8fe08a" style="opacity:calc(.5 * (1 - var(--day, 1)))"/><circle cx="70.0" cy="25.6" r="1.7" style="fill:color-mix(in srgb,#8fe08a calc(var(--md, var(--day, 1)) * 70%),#fff6d0)"/><circle cx="74.8" cy="29.8" r="4.2" fill="#ff6a5a" style="opacity:calc(.5 * (1 - var(--day, 1)))"/><circle cx="74.8" cy="29.8" r="1.7" style="fill:color-mix(in srgb,#ff6a5a calc(var(--md, var(--day, 1)) * 70%),#fff6d0)"/><circle cx="79.7" cy="33.9" r="4.2" fill="#ffd36a" style="opacity:calc(.5 * (1 - var(--day, 1)))"/><circle cx="79.7" cy="33.9" r="1.7" style="fill:color-mix(in srgb,#ffd36a calc(var(--md, var(--day, 1)) * 70%),#fff6d0)"/><circle cx="84.5" cy="38.1" r="4.2" fill="#7fc8ff" style="opacity:calc(.5 * (1 - var(--day, 1)))"/><circle cx="84.5" cy="38.1" r="1.7" style="fill:color-mix(in srgb,#7fc8ff calc(var(--md, var(--day, 1)) * 70%),#fff6d0)"/><circle cx="89.3" cy="42.3" r="4.2" fill="#8fe08a" style="opacity:calc(.5 * (1 - var(--day, 1)))"/><circle cx="89.3" cy="42.3" r="1.7" style="fill:color-mix(in srgb,#8fe08a calc(var(--md, var(--day, 1)) * 70%),#fff6d0)"/><circle cx="94.2" cy="46.4" r="4.2" fill="#ff6a5a" style="opacity:calc(.5 * (1 - var(--day, 1)))"/><circle cx="94.2" cy="46.4" r="1.7" style="fill:color-mix(in srgb,#ff6a5a calc(var(--md, var(--day, 1)) * 70%),#fff6d0)"/><circle cx="99.0" cy="50.6" r="4.2" fill="#ffd36a" style="opacity:calc(.5 * (1 - var(--day, 1)))"/><circle cx="99.0" cy="50.6" r="1.7" style="fill:color-mix(in srgb,#ffd36a calc(var(--md, var(--day, 1)) * 70%),#fff6d0)"/><circle cx="103.8" cy="54.8" r="4.2" fill="#7fc8ff" style="opacity:calc(.5 * (1 - var(--day, 1)))"/><circle cx="103.8" cy="54.8" r="1.7" style="fill:color-mix(in srgb,#7fc8ff calc(var(--md, var(--day, 1)) * 70%),#fff6d0)"/><circle cx="108.7" cy="58.9" r="4.2" fill="#8fe08a" style="opacity:calc(.5 * (1 - var(--day, 1)))"/><circle cx="108.7" cy="58.9" r="1.7" style="fill:color-mix(in srgb,#8fe08a calc(var(--md, var(--day, 1)) * 70%),#fff6d0)"/><circle cx="113.5" cy="63.1" r="4.2" fill="#ff6a5a" style="opacity:calc(.5 * (1 - var(--day, 1)))"/><circle cx="113.5" cy="63.1" r="1.7" style="fill:color-mix(in srgb,#ff6a5a calc(var(--md, var(--day, 1)) * 70%),#fff6d0)"/><circle cx="118.3" cy="67.3" r="4.2" fill="#ffd36a" style="opacity:calc(.5 * (1 - var(--day, 1)))"/><circle cx="118.3" cy="67.3" r="1.7" style="fill:color-mix(in srgb,#ffd36a calc(var(--md, var(--day, 1)) * 70%),#fff6d0)"/><circle cx="123.2" cy="71.4" r="4.2" fill="#7fc8ff" style="opacity:calc(.5 * (1 - var(--day, 1)))"/><circle cx="123.2" cy="71.4" r="1.7" style="fill:color-mix(in srgb,#7fc8ff calc(var(--md, var(--day, 1)) * 70%),#fff6d0)"/>
    <rect ${hc('#6e4a33', '#16132c')} x="32" y="80" width="22" height="22" rx="1.5"/><rect class="pane" x="34.5" y="82.5" width="17" height="17" rx="1"/><path class="mull" d="M43 82.5 V99.5 M34.5 91 H51.5"/><path ${hc('#f8fafd', '#4e5788')} d="M31 101 C31 99 55 99 55 101 V104 H31 Z"/>
    <rect ${hc('#6e4a33', '#16132c')} x="86" y="80" width="22" height="22" rx="1.5"/><rect class="pane" x="88.5" y="82.5" width="17" height="17" rx="1"/><path class="mull" d="M97 82.5 V99.5 M88.5 91 H105.5"/><path ${hc('#f8fafd', '#4e5788')} d="M85 101 C85 99 109 99 109 101 V104 H85 Z"/>
    <circle ${hc('#6e4a33', '#16132c')} cx="70" cy="52" r="7.6"/><circle class="pane" cx="70" cy="52" r="5.8"/><path class="mull" d="M70 46.2 V57.8 M64.2 52 H75.8"/>
    <path ${hc('#5a3a24', '#120f22')} d="M58.5 130 V106 H81.5 V130 Z"/><path class="door" d="M61 130 V108.4 H79 V130 Z"/><path ${hs('#5a3a24', '#120f22')} stroke-width=".8" d="M65.5 108.4 V130 M70 108.4 V130 M74.5 108.4 V130"/><circle class="knob" cx="76.4" cy="120" r="1.3"/>
    <circle ${hs('#3f7a3a', '#162a26')} stroke-width="3.2" fill="none" cx="70" cy="115" r="4.6"/><path ${hc('#d0453c', '#5a2030')} d="M70 120 l-3 2.4 l.6 -3 Z M70 120 l3 2.4 l-.6 -3 Z"/><circle ${hc('#d0453c', '#5a2030')} cx="70" cy="119.6" r="1.1"/>
`
};
const houseArt = () => HOUSE_ART[state.house && owns(state.house) && HOUSE_ART[state.house] ? state.house : 'cottage'];
// a ground's picture (古道具屋's card, the yard's box): a slope of it with the path up to a little house (2026-11-14)
const GROUND_LOOK = { grass: ['#8fc486', '#5a9e4d', '#e8d6a8', '#6e9a5c'], snowfield: ['#e9eff7', '#f6f9fc', '#cfd9e8', '#dfe8f2'] };
const groundThumb = (id) => { const [far, near, lane, tuft] = GROUND_LOOK[id] || GROUND_LOOK.grass;
  return `<svg class="house-thumb ground-thumb" viewBox="0 0 140 130" aria-hidden="true"><rect width="140" height="130" fill="#cfe3f2"/><path d="M0 66 C30 52 60 50 90 56 C110 60 126 58 140 52 V130 H0 Z" fill="${far}"/><path d="M0 84 C40 74 100 72 140 82 V130 H0 Z" fill="${near}"/><path d="M62 130 C64 112 70 96 72 80 L78 80 C78 96 84 112 92 130 Z" fill="${lane}"/>${[[22, 104], [40, 118], [108, 102], [122, 120], [30, 92]].map(([x, y]) => `<path d="M${x - 5} ${y} q2 -6 1 -10 q3 4 4 9 q2 -6 5 -9 q-1 6 1 10 Z" fill="${tuft}"/>`).join('')}<rect x="60" y="62" width="30" height="20" fill="#f1e3c6"/><path d="M56 64 L75 50 L94 64 Z" fill="${id === 'snowfield' ? '#f6f9fc' : '#b4543c'}"/><rect x="71" y="70" width="8" height="12" fill="#7a4b2e"/></svg>`; };
const yardGround = () => (state.ground && owns(state.ground) && WARE.has(state.ground) ? state.ground : 'grass');   // the yard's ground: a ground ware worn, else the grass (2026-11-14)
// the hero out in the yard (1.2.0): the same drawing, smaller the further up the lawn (X: px from the middle, Y: px up from the
// bottom, the ground running from the bottom to the house at 218px). Walks where you tap, to the mailbox, the house and the path.
const yh = { X: 0, Y: 186, back: false, flip: false, turn: false, raf: 0, fromDoor: false, climb: null, s: 0, z: 0, use: null, far: null };   // far: on the long way down (yFar): there at once   // z: his layer when set (sat on a thing), use: sat on / riding it ({ up: where he gets off })   // climb, s: on the way up to 古道具屋, and his scale there
try { const h = JSON.parse(localStorage.getItem('nq_hero') || 'null'); if (h && h.yard && Number.isFinite(h.yard.X) && Number.isFinite(h.yard.Y)) Object.assign(yh, { X: h.yard.X, Y: h.yard.Y }); } catch (e) { /* first time out */ }
let yPlace = 'yard';   // the yard or the main road (#/street): where the hero is out, each its own spot in nq_hero
function yHeroSave() { try { const h = JSON.parse(localStorage.getItem('nq_hero') || '{}') || {}; const [X, Y] = yh.use ? yh.use.up : [yh.X, yh.Y]; h[yPlace] = { X: Math.round(X), Y: Math.round(Y) }; localStorage.setItem('nq_hero', JSON.stringify(h)); } catch (e) { /* no storage */ } }
const yScale = (Y) => (INDOOR.includes(yPlace) ? ISO.k : 0.19 + 0.31 * Math.max(0, Math.min(1, (212 - Y) / 198)));   // in a room (seen at 45°) one size anywhere
function yHeroHtml() { return `<div class="hero yhero" data-act="hero-hop" aria-label="主角">${HERO.svg({ wear: state.wear, look: state.look })}</div>`; }
function yHeroRedraw(yard) { const el = yard.querySelector('.yhero'); if (el) el.innerHTML = HERO.svg({ wear: state.wear, look: state.look }); }   // dressed anew
function yHeroHold(yard) {   // the dressing room opens: the hero stops where they are
  cancelAnimationFrame(yh.raf); yh.climb = null; yh.s = 0; yard.classList.remove('climbing');
  const el = yard.querySelector('.yhero'); if (!el) return;
  el.classList.remove('walk', 'run', 'climb'); yClimbLook(el, 0); HERO.still(el); yHeroPlace(yard); yHeroSave();
}
function yHeroPlace(yard) {
  const el = yard.querySelector('.yhero'); if (!el) return;
  el.style.transform = `translate(${yh.X.toFixed(1)}px,${(-yh.Y).toFixed(1)}px) scale(${(yh.s || yScale(yh.Y)).toFixed(3)})`;
  el.classList.toggle('back', yh.back); el.classList.toggle('turn', yh.turn); el.classList.toggle('flip', yh.flip); el.style.zIndex = yh.climb === 'hill' ? '' : String(yh.z || (INDOOR.includes(yPlace) ? isoZ(...isoUV(yh.X, yh.Y)) : 300 - Math.round(yh.Y)));
  if (el.matches('.walk, .run')) { yFollow(yard); TOWNLIFE.near(yard); }   // on the move: the camera goes along; those he comes near stop for him
}
// up the hill path: outlined about a pixel on the screen however small he gets (s: his scale; none: off the path). Set on his
// drawing, and only when the width changes, never as a CSS variable round him (his legs would begin again each time on an iPhone)
function yClimbLook(h, s) {
  const svg = h && h.querySelector('svg'); if (!svg) return;
  const px = s ? Math.round(1.3 / s * 2) / 2 : 0; if (svg._outline === px) return; svg._outline = px;
  svg.style.filter = px ? `brightness(calc(.8 + .2 * var(--day))) drop-shadow(0 0 ${px}px rgba(255, 255, 255, .95)) drop-shadow(0 0 ${px * 2}px rgba(255, 238, 200, calc(.3 + .45 * (1 - var(--day)))))` : '';
}
