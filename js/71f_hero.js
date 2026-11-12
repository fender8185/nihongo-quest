'use strict';
// the hero (HERO): looks, clothes, walking (out of 71_today.js, 2026-11-11)
// ---------- the hero (1.2.0): the learner, in 書房 and out in the yard ----------
// HERO.svg(o) draws them, feet at (0, 0), about 150 units tall (Q版 since test 2026-11-09), facing us and from behind (the page shows
// one, .back), as they chose to look (o.look: state.look, see OPTS) and with what they wear by part (o.wear); o.L(colour, z) lights
// a colour at a height (書房's light), else daylight colours. The figure stands round x = 2; the head is drawn in its own units
// (its middle at (2, -128)) and set on the body bigger (HEAD).
// Poses and motions are classes on the .hero box and move the parts in CSS: walk, run, sit, reach, crouch, look; idle-… (HERO.idle);
// hop, wave, spin, cheer (a tap).
const HERO = (() => {
  const INK = '#2a2730', LIP = '#7a4a3a';
  // the clothes' colours (test, 2026-11-09): one palette of 16 for the top, the trousers and the shoes — the 8 tops' and the 8
  // trousers' colours before it, so a look saved then keeps its colours
  const CLOTH = [['#ecebe6', '白'], ['#e9e2d0', '米白'], ['#b8a27a', '卡其'], ['#d9a43a', '芥末黃'], ['#6e4f3a', '咖啡'], ['#d0574b', '紅'], ['#e58fa8', '粉紅'], ['#6b7a45', '橄欖綠'],
    ['#4f7a4a', '森林綠'], ['#3f9a8c', '青綠'], ['#4f6f9e', '牛仔藍'], ['#5a68d8', '靛藍'], ['#3f4660', '深藍'], ['#8a8f99', '灰'], ['#4a4a55', '炭灰'], ['#2b2b33', '黑']];
  // what they can choose, no part anyone's by gender: [id, name] (a colour's id is the colour); LOOK0 is a new hero's look
  const OPTS = {
    face: [['mochi', '麻糬臉'], ['round', '圓臉'], ['chubby', '包子臉'], ['oval', '鵝蛋臉'], ['pointed', '尖下巴']],
    skin: [['#f8dcc8', '白皙'], ['#f3d1b5', '淺膚'], ['#e8bd98', '自然'], ['#d39f78', '小麥'], ['#a9714d', '古銅'], ['#76492f', '深褐']],
    cheeks: [['blush', '腮紅'], ['soft', '柔腮紅'], ['shy', '害羞'], ['freckles', '雀斑'], ['none', '無']],
    hairColor: [['#2a2524', '黑'], ['#3b2f2a', '深棕'], ['#6b4a32', '棕'], ['#8a4a2e', '紅棕'], ['#c9a25a', '金'], ['#a3a3a8', '灰'], ['#3d5a99', '藍'], ['#d98aa6', '粉紅']],
    eyes: [['kira', '水汪汪'], ['chibi', 'Q版眼'], ['normal', '普通'], ['sharp', '吊眼'], ['droopy', '垂眼'], ['happy', '笑眼'], ['big', '大眼'], ['sleepy', '睏眼']],
    eyeColor: [['#2a2730', '黑'], ['#5a3a28', '棕'], ['#8a3a2a', '紅'], ['#3a5f9a', '藍'], ['#3f7a52', '綠'], ['#5a3a9a', '紫'], ['#6b6f7a', '灰']],
    brows: [['soft', '自然'], ['straight', '平眉'], ['thick', '粗眉'], ['worried', '八字眉'], ['raised', '挑眉']],
    mouth: [['smile', '微笑'], ['grin', '開心'], ['cat', '貓嘴'], ['flat', '一字'], ['o', '圓嘴'], ['tongue', '吐舌']],
    beard: [['none', '無'], ['stubble', '鬍渣'], ['mustache', '八字鬍'], ['goatee', '山羊鬍'], ['full', '落腮鬍']],
    top: CLOTH,
    topStyle: [['hoodie', '帽T'], ['tee', 'T恤'], ['sweater', '毛衣'], ['shirt', '襯衫'], ['jinbei', '甚平'], ['cattop', '貓咪上衣'], ['wizrobe', '魔法師長袍'], ['yukata', '浴衣']],
    bottomStyle: [['pants', '長褲'], ['shorts', '短褲'], ['wide', '寬褲'], ['skirt', '裙子'], ['catpants', '貓咪褲']],
    bottom: CLOTH,
    shoeStyle: [['sneaker', '球鞋'], ['boots', '短靴'], ['loafer', '皮鞋'], ['geta', '木屐'], ['rainboots', '雨靴'], ['bunnyslippers', '兔子拖鞋']],   // the first three everyone's; the rest sold (2026-11-12, the user)
    shoe: CLOTH
  };
  const ROLE_STYLES = { topStyle: ['hakui', 'samue', 'kappogi', 'chef', 'jacket', 'happi', 'vest'], bottomStyle: ['hakama'], shoeStyle: ['zori'] };   // the town's own, never sold
  const LOOK0 = { face: 'chubby', skin: '#f3d1b5', cheeks: 'blush', fringe: 'blunt', sides: 'wisps', hairBack: 'crop', hairTop: 'bun', hairColor: '#6b4a32', eyes: 'normal', eyeColor: '#2a2730', brows: 'soft', mouth: 'smile', beard: 'none', topStyle: 'hoodie', top: '#d0574b', bottomStyle: 'pants', bottom: '#2b2b33', shoeStyle: 'sneaker', shoe: '#2b2b33' };   // 2026-11-10, the user's pick: 包子臉, 齊瀏海, 觸角, 清爽, 丸子, 棕髮; a red hoodie, black trousers and sneakers — neither boy nor girl
  // the 16 hairstyles before the hair came in parts (1.2.1): each as its nearest 瀏海, 兩側, 後面, 造型
  const OLD_HAIR = { crop: ['round', 'short', 'short', 'none'], neat: ['swept', 'short', 'short', 'none'], curtain: ['center', 'chin', 'short', 'none'], ahoge: ['round', 'short', 'short', 'ahoge'],
    spiky: ['choppy', 'short', 'short', 'none'], slick: ['none', 'short', 'short', 'none'], curly: ['fluffy', 'curls', 'short', 'none'], afro: ['fluffy', 'curls', 'bob', 'none'], bob: ['blunt', 'incurl', 'bob', 'none'],
    wolf: ['choppy', 'layered', 'shoulder', 'none'], shoulder: ['center', 'chin', 'shoulder', 'none'], long: ['round', 'long', 'long', 'none'], wavy: ['sidepart', 'wave', 'wavy', 'none'],
    ponytail: ['swept', 'short', 'short', 'ponytail'], twintails: ['round', 'short', 'short', 'twintails'], bun: ['short', 'short', 'short', 'bun'] };
  // a saved look as drawn: anything this build does not know (or is missing) is the new hero's; a look from before the hair came in
  // parts (hair: one of the 16, no fringe) gets the parts nearest it
  const norm = (look) => {
    const old = look && !look.fringe && OLD_HAIR[look.hair], lk = old ? Object.assign({}, look, { fringe: old[0], sides: old[1], hairBack: old[2], hairTop: old[3] }) : look;
    return Object.fromEntries(Object.keys(LOOK0).map((k) => [k, lk && (OPTS[k].some(([v]) => v === lk[k]) || (ROLE_STYLES[k] || []).includes(lk[k])) ? lk[k] : LOOK0[k]]));
  };
  const dk = (h, k) => '#' + [1, 3, 5].map((i) => Math.round(parseInt(h.slice(i, i + 2), 16) * k).toString(16).padStart(2, '0')).join('');
  const lt = (h, k) => '#' + [1, 3, 5].map((i) => { const v = parseInt(h.slice(i, i + 2), 16); return Math.round(v + (255 - v) * k).toString(16).padStart(2, '0'); }).join('');
  // the head, drawn the Q版 way (1.2.0): no ears — side locks hang where they would be — big eyes low on the face, a small
  // mouth under them. The face keeps one dome on top (so hair and hats fit every face); the jaw goes by its shape.
  const q = (v) => Math.round(v * 100) / 100;
  const DOME = 'M-32 -128 C-32 -145.7 -16.8 -160 2 -160 C20.8 -160 36 -145.7 36 -128';
  const FACE = {
    mochi: `${DOME} C36.6 -116 36.4 -104.6 31 -99 C25.6 -94.6 15 -93.6 2 -93.6 C-11 -93.6 -21.6 -94.6 -27 -99 C-32.4 -104.6 -32.6 -116 -32 -128 Z`,   // 麻糬: wide, a soft square jaw (the user's 日系 sheet)
    round: `${DOME} C36 -110 21 -94 2 -94 C-17 -94 -32 -110 -32 -128 Z`,
    chubby: `${DOME} C37 -112 31 -95.6 2 -95 C-27 -95.6 -33 -112 -32 -128 Z`,
    oval: `${DOME} C35.5 -106 17 -91 2 -91 C-13 -91 -31.5 -106 -32 -128 Z`,
    pointed: `${DOME} C36 -113 24 -100 2 -90.5 C-20 -100 -32 -113 -32 -128 Z`
  };
  const both = (s) => `${s}<g transform="matrix(-1 0 0 1 4 0)">${s}</g>`;   // a left half and its mirror round the figure's middle (x = 2)
  const star = (x, y, r, fill = '#e6c25a') => `<path fill="${fill}" d="M${Array.from({ length: 10 }, (_, i) => { const a = -Math.PI / 2 + i * Math.PI / 5, k = i % 2 ? r * 0.45 : r; return `${q(x + k * Math.cos(a))} ${q(y + k * Math.sin(a))}`; }).join(' L')} Z"/>`;   // five points
  const EY = -117, EX = [-10.5, 14.5];   // the eyes' height and middles
  let ex = EX;   // the middles as drawn: a head turned a little (svg) has the far eye nearer
  const ink = (d, w = 2.4) => `<path d="${d}" fill="none" stroke="${INK}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
  // an eye: its colour, darker under the lid, the pupil, a big and a small highlight (both lit from the upper right)
  const iris = (x, c, rx = 5, ry = 6.6, dy = 0) => { const y = EY + dy; return `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${c}"/><path d="M${q(x - rx)} ${y} a${rx} ${ry} 0 0 1 ${q(2 * rx)} 0 Z" fill="#000" fill-opacity=".3"/><ellipse cx="${x}" cy="${q(y + 0.8)}" rx="${q(rx * 0.48)}" ry="${q(ry * 0.5)}" fill="#1b1820"/><ellipse cx="${q(x + rx * 0.36)}" cy="${q(y - ry * 0.42)}" rx="${q(rx * 0.4)}" ry="${q(ry * 0.34)}" fill="#fff"/><circle cx="${q(x - rx * 0.42)}" cy="${q(y + ry * 0.48)}" r="${q(rx * 0.22)}" fill="#fff" fill-opacity=".85"/>`; };
  // the upper lash line over an eye, inner corner to outer (o: -1 the left eye, 1 the right), its outer end lifted by up
  const lid = (x, o, up = 0, h = 6.2) => ink(`M${q(x - 6 * o)} ${q(EY - 3.2)} Q${x} ${q(EY - h - 2.6)} ${q(x + 6.6 * o)} ${q(EY - 3.6 - up)}`);
  // the Q版 eyes are drawn in the body's units (the head is drawn bigger, HS) round their middle, the left one mirrored; each eye
  // colour has its own dark, light and glow (an unknown colour gets them by darkening and lightening)
  const bigEye = (x, i, s) => `<g transform="translate(${x} ${EY + 2.5}) scale(${q((i ? 1 : -1) / HS)} ${q(1 / HS)})">${s}</g>`;
  const TONES = { '#2a2730': ['#14121a', '#5a5272', '#a99fd0'], '#5a3a28': ['#2a1410', '#c8743a', '#f6bf78'], '#8a3a2a': ['#2e1010', '#d06a4a', '#ffb89a'],
    '#3a5f9a': ['#0f1f4a', '#5fa8e8', '#b4ecff'], '#3f7a52': ['#0f2a1c', '#5fbf7a', '#d2f7a8'], '#5a3a9a': ['#1e1236', '#9a7ad8', '#e2ccff'], '#6b6f7a': ['#24262c', '#9aa0ac', '#e0e4ec'] };
  const tones = (c) => { const t = TONES[c] || [dk(c, 0.45), lt(c, 0.35), lt(c, 0.7)]; return [t[0], c, t[1], t[2]]; };
  const EYES = {
    normal: (c) => ex.map((x, i) => iris(x, c) + lid(x, i ? 1 : -1)).join(''),
    sharp: (c) => ex.map((x, i) => iris(x, c, 4.8, 5.8, 0.8) + lid(x, i ? 1 : -1, 2.8, 5)).join(''),   // 吊眼: the outer corners up
    droopy: (c) => ex.map((x, i) => iris(x, c, 5, 6.2, 0.4) + lid(x, i ? 1 : -1, -3.4, 6.6)).join(''),   // 垂眼: down
    happy: () => ex.map((x) => ink(`M${q(x - 5.6)} ${EY + 1} Q${x} ${EY - 6} ${q(x + 5.6)} ${EY + 1}`, 2.3)).join(''),   // ^ ^
    big: (c) => ex.map((x, i) => iris(x, c, 6, 7.8, -0.4) + `<circle cx="${q(x + 2.6)}" cy="${q(EY + 2.6)}" r=".9" fill="#fff"/>` + lid(x, i ? 1 : -1, 0, 8.2)).join(''),
    sleepy: (c) => ex.map((x) => `<path d="M${q(x - 5)} ${EY - 1} h10 a5 5.4 0 0 1 -10 0 Z" fill="${c}"/><circle cx="${q(x + 1.6)}" cy="${EY + 1.2}" r="1.1" fill="#fff" fill-opacity=".8"/>` + ink(`M${q(x - 6.2)} ${EY - 1} H${q(x + 6.2)}`, 2.2)).join(''),
    // Q版眼 (test, 2026-11-09): big and round, the lower half of the iris lighter, two highlights, a lash with a flick
    chibi: (c) => ex.map((x, i) => bigEye(x, i, `<ellipse rx="8.6" ry="10.5" fill="#fff"/><ellipse cy="1" rx="7.4" ry="9.45" fill="${c}"/><ellipse cy="4.6" rx="5.3" ry="4.4" fill="${tones(c)[2]}" fill-opacity=".75"/><ellipse rx="3.6" ry="5.25" fill="${INK}"/>
      <circle cx="2.8" cy="-3.8" r="2.7" fill="#fff"/><circle cx="-3" cy="4.4" r="1.2" fill="#fff"/><path d="M-10.2 -4.6 Q-1.7 -14.1 10 -6.6 L12.2 -8.6 L9.8 -3.6 Q-.9 -11.1 -9.2 -2.2 Z" fill="${INK}"/>`)).join(''),
    // 水汪汪 (test, 2026-11-09): the iris darkest under the lid and glowing at the bottom, three highlights, a heavy lash
    kira: (c) => {
      const t = tones(c), n = ++uid, W = 'M-9.8 -1.5 C-9.8 -8.6 -5 -12.2 .6 -12.2 C6.4 -12.2 10.2 -8.2 10.2 -1.2 C10.2 6.4 5.8 11.6 .2 11.6 C-5.6 11.6 -9.8 5.8 -9.8 -1.5 Z';
      const defs = `<defs><linearGradient id="ki${n}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${t[0]}"/><stop offset=".42" stop-color="${c}"/><stop offset=".78" stop-color="${t[2]}"/><stop offset="1" stop-color="${t[3]}"/></linearGradient><clipPath id="kc${n}"><path d="${W}"/></clipPath></defs>`;
      return defs + ex.map((x, i) => bigEye(x, i, `<path d="${W}" fill="#fff"/><g clip-path="url(#kc${n})"><ellipse cx=".4" cy="1.6" rx="8.8" ry="11.4" fill="url(#ki${n})"/><path d="M-9 -4.4 Q.6 -9.4 10 -4.2 V-12 H-9 Z" fill="${t[0]}" fill-opacity=".85"/>
        <ellipse cx=".5" cy="1" rx="3.4" ry="5.4" fill="${t[0]}"/><path d="M-6.4 5 Q.4 12.4 7.4 4.8 Q.4 8.8 -6.4 5 Z" fill="${t[3]}" fill-opacity=".95"/><ellipse cx=".4" cy="1.6" rx="8.8" ry="11.4" fill="none" stroke="${t[0]}" stroke-width=".8"/>
        <path d="M-9.8 -12 H10.4 V-6.4 Q.6 -11 -9.8 -5.6 Z" fill="${t[0]}" fill-opacity=".35"/><ellipse cx="3.6" cy="-4.4" rx="2.9" ry="3.7" fill="#fff" transform="rotate(-20 3.6 -4.4)"/><circle cx="-3.6" cy="4.8" r="1.4" fill="#fff"/><circle cx="5.2" cy="3.4" r=".8" fill="#fff"/>
        <path d="M-6.6 -1 Q-7.4 3 -5.6 6" stroke="${t[3]}" stroke-width="1.1" fill="none" stroke-linecap="round" stroke-opacity=".6"/></g>
        <path d="M-11.4 -2.4 C-10.8 -11 -4.8 -15 1 -14.8 C6.8 -14.6 11.2 -11 13 -6.6 L16 -8.4 L13.8 -5 L16.4 -3.6 L12.6 -3 L11 -4 C9.6 -8.2 5.6 -11.2 .8 -11.4 C-4.4 -11.6 -8.8 -8.4 -9.8 -1.6 Z" fill="${INK}"/>
        <path d="M4 11.4 Q8.4 10.2 10 5.4" stroke="${INK}" stroke-width=".85" fill="none" stroke-linecap="round" stroke-opacity=".75"/><path d="M-6 -16.6 Q1.6 -18.8 9.4 -14.6" stroke="#c99a80" stroke-width=".75" fill="none" stroke-linecap="round"/>`)).join('');
    }
  };
  // the brows (the left one; the right mirrors it): [path, width], in a shade of the hair
  const BROWS = { soft: ['M-15 -128 Q-10.5 -130.8 -6 -128.8', 1.8], straight: ['M-15 -129 H-6', 2], thick: ['M-15.4 -127.8 Q-10.5 -131.6 -5.6 -129', 3.2], worried: ['M-15 -128 Q-10 -128.4 -6 -131.2', 1.8], raised: ['M-15.2 -130.8 Q-10.5 -131.6 -6 -128.4', 1.7] };
  const MOUTH = {   // c: the line's colour (darker on the darkest skin, so the mouth still reads)
    smile: (c) => `<path d="M-1.6 -104.6 Q2 -101.4 5.6 -104.6" fill="none" stroke="${c}" stroke-width="1.6" stroke-linecap="round"/>`,
    grin: () => '<path d="M-2.6 -105.4 Q2 -104.6 6.6 -105.4 Q6 -99.4 2 -99.4 Q-2 -99.4 -2.6 -105.4 Z" fill="#6b2c2c"/><path d="M-.6 -101.2 Q2 -102.8 4.6 -101.2 Q3.8 -99.6 2 -99.6 Q.2 -99.6 -.6 -101.2 Z" fill="#e8838a"/>',
    cat: (c) => `<path d="M-2.6 -105.2 Q-.3 -102.2 2 -104.6 Q4.3 -102.2 6.6 -105.2" fill="none" stroke="${c}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>`,
    flat: (c) => `<path d="M-.8 -103.6 H4.8" stroke="${c}" stroke-width="1.6" stroke-linecap="round"/>`,
    o: () => '<ellipse cx="2" cy="-103" rx="2" ry="2.5" fill="#6b2c2c"/>',
    tongue: (c) => `<path d="M-2.2 -105 Q2 -101.8 6.2 -105" fill="none" stroke="${c}" stroke-width="1.6" stroke-linecap="round"/><path d="M2.4 -103.4 q1.9 4.4 3.8 0 Z" fill="#e8838a"/>`
  };
  const BLUSH = '<ellipse cx="-16.5" cy="-107.6" rx="5.4" ry="3.2" fill="#f5a3a3" fill-opacity=".55"/><ellipse cx="20.5" cy="-107.6" rx="5.4" ry="3.2" fill="#f5a3a3" fill-opacity=".55"/>';
  const CHEEKS = {
    blush: BLUSH,
    soft: [-16.5, 20.5].map((x) => `<ellipse cx="${x}" cy="-107" rx="6" ry="3.4" fill="#f4a9b4" fill-opacity=".3"/><ellipse cx="${x}" cy="-107" rx="4.2" ry="2.3" fill="#f4a9b4" fill-opacity=".4"/><path d="M${x - 2.6} -106.2 l1.2 -2 M${x} -106.2 l1.2 -2 M${x + 2.6} -106.2 l1.2 -2" stroke="#e98b98" stroke-width=".7" stroke-linecap="round" stroke-opacity=".75"/>`).join(''),
    shy: BLUSH + '<path d="M-19.6 -105.8 l2 -3.6 M-16.6 -105.8 l2 -3.6 M-13.6 -105.8 l2 -3.6 M17.4 -105.8 l2 -3.6 M20.4 -105.8 l2 -3.6 M23.4 -105.8 l2 -3.6" stroke="#e0787a" stroke-width="1" stroke-linecap="round" stroke-opacity=".8"/>',
    freckles: [[-20, -110], [-16.6, -108.4], [-20, -106.8], [-13.6, -110.6], [24, -110], [20.6, -108.4], [24, -106.8], [17.6, -110.6]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r=".85" fill="#a8643f" fill-opacity=".55"/>`).join(''),
    none: ''
  };
  // beards in the hair's colour, drawn bigger than any jaw and clipped to the face (f: the fill), under the mouth's new place
  const MUSTACHE = 'M2 -107.6 C-1 -111 -8 -110.8 -10.5 -106.6 C-7.4 -108 -3.6 -106.6 2 -105.4 C7.6 -106.6 11.4 -108 14.5 -106.6 C12 -110.8 5 -111 2 -107.6 Z';
  const BEARD = {
    none: () => '',
    stubble: (f) => `<path ${f} fill-opacity=".13" d="M-34 -112 C-30 -98 -14 -80 2 -80 C18 -80 34 -98 38 -112 C30 -104 20 -99.4 12 -99.8 Q2 -97.4 -8 -99.8 C-16 -99.4 -26 -104 -34 -112 Z M-6 -108.4 Q2 -110.9 10 -108.4 Q8 -106.4 2 -106.4 Q-4 -106.4 -6 -108.4 Z"/>${[[-24, -100], [-18, -96.4], [-11, -93.4], [-4, -95.4], [8, -95.4], [15, -93.4], [22, -96.4], [28, -100], [-14, -90.4], [2, -91.4], [18, -90.4], [-2, -108.4], [6, -108.4]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r=".7" ${f} fill-opacity=".45"/>`).join('')}`,
    mustache: (f) => `<path ${f} d="${MUSTACHE}"/>`,
    goatee: (f) => `<path ${f} d="M-2.5 -98.6 Q2 -97 6.5 -98.6 Q7.2 -91.4 2 -86.9 Q-3.2 -91.4 -2.5 -98.6 Z"/><path ${f} transform="translate(2 -106.4) scale(.75) translate(-2 106.4)" d="${MUSTACHE}"/>`,
    full: (f) => `<path ${f} d="M-34 -122 C-34 -94 -14 -78 2 -78 C18 -78 38 -94 38 -122 L33 -122 C32 -110 24 -100.4 12 -100 Q2 -97.8 -8 -100 C-20 -100.4 -28 -110 -29 -122 Z"/><path ${f} d="${MUSTACHE}"/>`
  };
  // ===== the hair (1.2.1), 日系 anime after the user's sheet of 48 chibi hairstyles and their brief (2026-11-07). Since the Q版
  // body (test, 2026-11-09) it is drawn flat — no gradient, no outline, a soft shine for the ring (HERO.svg) — the shapes as below:
  // every lock ends in a sharp, tapering tip (a ぱっつん or 公主切 line is cut straight); three layers — the back hair, the side
  // locks, the fringe with a stray wisp or two; a gradient from the roots (lighter) to the ends (darker), a fine outline a shade
  // darker than the hair, and a jagged angel ring of light on the crown. The outline goes round the whole of the hair, never where
  // its parts meet (the user found the parts looked pasted together): each layer is drawn twice, its outline under its fills, so
  // the parts are drawn plain (f, k) and HERO.svg gives the outline. Put together from four parts (瀏海, 兩側, 後面, 造型);
  // STYLES are whole hairstyles made of them. Head space: centre x = 2, forehead top y -160, brows ≈ -129, eyes -117, chin ≈ -94.
  // f: the hair (gradient and outline), k: the back hair (darker), s: a strand stroke, w: the hair's fill alone (wisps), skin: the
  // ear's fill. Layers: back (behind the head and body), front (over the face), deco, rear (from behind).
  const HAIRP = (() => {
  const r = (v) => Math.round(v * 10) / 10;
  const both = (s) => `${s}<g transform="matrix(-1 0 0 1 4 0)">${s}</g>`;
  const P = (f, d) => `<path ${f} d="${d}"/>`;
  const strands = (s, d, o = 0.42) => `<path d="${d}" fill="none" ${s} stroke-width="1.1" stroke-opacity="${r(Math.min(0.9, o * 1.8))}" stroke-linecap="round"/>`;   // stronger since the outline went (test)
  const shine = (d, o = 0.3) => `<path d="${d}" fill="#fff" fill-opacity="${o}"/>`;
  // a run of locks: from the first notch down to each tip and up to the next (ns: n + 1 notches, ts: n tips). Each lock keeps its
  // width and tapers late to a sharp tip; a: how far it sweeps sideways from its root, t: how wide the tip (of the lock's width)
  function locks(ns, ts, a = 0.15, t = 0.16) {
    let d = '';
    ts.forEach(([tx, ty], i) => {
      const [nx, ny] = ns[i], [mx, my] = ns[i + 1], w = Math.abs(mx - nx);
      d += ` C${r(nx + (tx - nx) * a - w * 0.06)} ${r(ny + (ty - ny) * 0.55)} ${r(tx - w * t)} ${r(ty - (ty - ny) * 0.32)} ${tx} ${ty}`;
      d += ` C${r(tx + w * t)} ${r(ty - (ty - my) * 0.32)} ${r(mx + (tx - mx) * a + w * 0.06)} ${r(my + (ty - my) * 0.55)} ${mx} ${my}`;
    });
    return d;
  }
  // a lock on its own: from x0…x1 at y0 down to a sharp tip (tx, ty)
  const leaf = (f, x0, x1, y0, tx, ty) => P(f, `M${x0} ${y0}${locks([[x0, y0], [x1, y0]], [[tx, ty]], 0.2, 0.2)} Z`);
  // a stray wisp: a sliver wd wide at its root (x0, y0), bending through (cx, cy) to a sharp end at (x1, y1)
  const wisp = (w, x0, y0, cx, cy, x1, y1, wd = 1.8) => P(w, `M${r(x0 - wd / 2)} ${y0} Q${r(cx - wd / 3)} ${cy} ${x1} ${y1} Q${r(cx + wd / 3)} ${cy} ${r(x0 + wd / 2)} ${y0} Z`);
  // the shine on the crown (test, 2026-11-09, after the user's pick of the flat Q版 look): one soft streak of light up to the left
  const RING = '<ellipse cx="-10" cy="-163" rx="11" ry="3" transform="rotate(-14 -10 -163)" fill="#fff" fill-opacity=".2"/>';
  // ===== the crown, with the fringe as its lower edge from the left temple (-33 -138) to the right (37 -138); at the sides it comes
  // down to just over the ear in a sharp sideburn, so the side locks hang from inside it
  const OUT = ' C37.4 -133 38.4 -126.4 39.6 -121.2 C40.8 -123.6 42.8 -125.4 45 -126.6 C48.8 -129 50.4 -134 50.2 -141 C49.6 -159 32 -174.4 2 -174.4 C-28 -174.4 -45.6 -159 -46.2 -141 C-46.4 -134 -44.8 -129 -41 -126.6 C-38.8 -125.4 -36.8 -123.6 -35.6 -121.2 C-34.4 -126.4 -33.4 -133 -33 -138 Z';
  const crown = (f, e, out = OUT) => P(f, `M-33 -138${e}${out}`);
  // a crown kept close over the ears (推高, test 2026-11-09: the sides and back clipped short so the top stands up, for the cuts men
  // like): no sideburn, a little higher on top
  const SLIM = ' C38.6 -143 40.4 -149 40.6 -154 C40.4 -168 24 -177 2 -177 C-20 -177 -36.4 -168 -36.6 -154 C-36.4 -149 -34.6 -143 -33 -138 Z';
  const L0 = [-33, -138], R0 = [37, -138];
  // a fringe: its edge; b: a darker tier behind it (k); u: hanging from under the crown (f); x: on it (f); its strands and wisps
  const F = (name, e, o = {}) => ({ name, e, b: o.b || (() => ''), u: o.u || (() => ''), x: o.x || (() => ''), deco: o.deco || (() => '') });
  const fl = (name, ns, ts, a, t, o) => F(name, locks([L0, ...ns, R0], ts, a, t), o);
  // a ぱっつん line at y, crisp corners at the temples, slits cut up into it at xs
  function cut(y, xs, dy = 5) {
    let d = ` C-32.8 ${r(y - 3)} -32.4 ${r(y - 0.8)} -30.4 ${y}`;
    xs.forEach((x) => { d += ` L${r(x - 1.3)} ${r(y + 0.6)} L${x} ${r(y - dy)} L${r(x + 1.3)} ${r(y + 0.6)}`; });
    return `${d} L34.4 ${y} C36.4 ${r(y - 0.8)} 36.8 ${r(y - 3)} 37 -138`;
  }
  // spikes standing out round the crown, part of it (deg: where, from the right; len: how far out; s: which way the tip turns)
  const spikes = (k) => [[168, 10, -1], [136, 11, 1], [104, 10.4, -1], [72, 11, 1], [40, 10, -1], [10, 9, 1]].map(([deg, len, s]) => {
    const a = (deg * Math.PI) / 180, p = (b, q) => `${r(2 + q * 44 * Math.cos(b))} ${r(-136 - q * 37 * Math.sin(b))}`;
    return P(k, `M${p(a - 0.24, 0.86)} Q${p(a - 0.08 + s * 0.05, 1.06)} ${p(a + s * 0.14, 1 + len / 40)} Q${p(a + 0.1 + s * 0.05, 1.04)} ${p(a + 0.24, 0.86)} Z`);
  }).join('');
  // a curl: a round lock that ends in a sharp tail (x, y its middle, rr its size, s: 1 tail to the right, -1 to the left)
  const curl = (f, x, y, rr, s = 1) => P(f, `M${r(x - rr * s)} ${r(y + rr * 0.1)} C${r(x - rr * s)} ${r(y - rr * 1.3)} ${r(x + rr * 1.2 * s)} ${r(y - rr * 1.2)} ${r(x + rr * s)} ${r(y + rr * 0.2)} C${r(x + rr * 0.9 * s)} ${r(y + rr * 0.9)} ${r(x + rr * 0.4 * s)} ${r(y + rr * 1.3)} ${r(x - rr * 0.2 * s)} ${r(y + rr * 1.9)} C${r(x - rr * 0.1 * s)} ${r(y + rr * 1.2)} ${r(x - rr * 0.9 * s)} ${r(y + rr * 1.1)} ${r(x - rr * s)} ${r(y + rr * 0.1)} Z`);
  const swirl = (s, pts) => strands(s, pts.map(([x, y, rr]) => `M${r(x - rr * 0.5)} ${r(y + rr * 0.3)} a${r(rr * 0.5)} ${r(rr * 0.5)} 0 1 1 ${r(rr * 0.5)} ${r(rr * 0.5)}`).join(' '), 0.5);
  const FRINGE = {
    round: fl('自然', [[-20, -150], [-6, -153], [9, -152.4], [24, -148.6]], [[-29.4, -127.6], [-14, -126.2], [1, -124.2], [16.6, -126.2], [31.6, -128.2]], 0.25, 0.15,
      { deco: (s, w) => strands(s, 'M-13 -150 C-13.6 -144 -13.8 -138 -13.8 -132 M2 -152 C1.8 -145 1.6 -138 1.2 -130') + wisp(w, -4, -152, -8, -140, -11.4, -124.6, 1.6) }),
    short: fl('短瀏海', [[-20, -151.4], [-6, -154], [9, -153.6], [24, -150.6]], [[-29.2, -133.4], [-14, -137.4], [1, -135.4], [16.4, -137.6], [31.4, -133.8]], 0.2, 0.15,
      { deco: (s) => strands(s, 'M-13 -151 C-13.4 -147 -13.6 -143 -13.8 -140 M2 -153 C1.8 -148 1.6 -142 1.2 -138') }),
    spiky: fl('刺刺', [[-24, -148.6], [-14, -151.4], [-4, -149.4], [6, -152.4], [16, -149.4], [26, -148.6]], [[-30.6, -128], [-19.4, -133.4], [-9.4, -124.8], [1.6, -132.6], [11.4, -124.4], [21.4, -131.8], [32.6, -127]], 0.1, 0.13,
      { x: (f) => spikes(f), deco: (s) => strands(s, 'M-9 -149 C-9.4 -142 -9.6 -135 -9.4 -129 M11 -150 C11.4 -143 11.4 -135 11.4 -128') }),
    blunt: F('齊瀏海', cut(-129.6, [-14.6, .4, 16.4]), { deco: (s) => strands(s, 'M-14.6 -150 V-135.4 M.4 -152 V-135 M16.4 -150 V-135.4 M-24 -146 C-24.4 -141 -24.4 -137 -24.2 -133 M26 -146 C26.4 -141 26.4 -137 26.2 -133', 0.36) }),
    shortblunt: F('短齊', cut(-140.4, [-12, 4, 19], 3.6), { deco: (s) => strands(s, 'M-12 -152 V-144.6 M4 -154 V-144.6 M19 -152 V-144.6', 0.36) }),
    airy: F('空氣', ' C-32 -145 -18 -149.6 2 -149.6 C22 -149.6 36 -145 37 -138', {
      u: (f) => [[-33, -24, -28.6, -128.6], [-23, -13.6, -16.4, -126], [-11.6, -5, -7.4, -129.6], [-3.6, 6.6, 1.6, -124.6], [8.4, 14.6, 12.6, -128.8], [16, 25.6, 21.2, -125.8], [27, 37, 32.4, -128.4]].map(([x0, x1, tx, ty]) => leaf(f, x0, x1, -153, tx, ty)).join(''),
      deco: (s, w) => wisp(w, -6, -150, -9, -138, -12.6, -123.6, 1.4) + wisp(w, 15, -149, 15.6, -138, 17.6, -122.6, 1.4) }),
    swept: fl('斜瀏海', [[-21, -153.4], [-5, -150.4], [11, -147.4], [26, -143]], [[-29.6, -130.6], [-1.6, -130.6], [15.2, -127.6], [30.6, -125.8], [36.2, -129.4]], 0.5, 0.14,
      { deco: (s, w) => strands(s, 'M-17 -152 C-11 -147 -6 -140 -3.4 -134 M-2 -149 C3 -144 8 -137 12.4 -131') + wisp(w, -18, -153, -8, -146.6, 3.6, -141.4) }),
    longswept: fl('大斜', [[-17, -155], [13, -142.6]], [[-29.6, -131.4], [22, -121.4], [34, -125.6]], 0.55, 0.12,
      { deco: (s) => strands(s, 'M-13 -154 C-4 -148 6 -139 15 -127 M0 -152 C8 -147 15 -140 21 -131') }),
    sidepart: fl('旁分', [[-8, -154.4], [29, -140.6]], [[-25.4, -126.6], [25, -124.2], [35.4, -130]], 0.5, 0.12,
      { deco: (s, w) => strands(s, 'M-8 -168 V-157 M-11 -151 C-16 -145 -20 -138 -23 -131 M-3 -151 C5 -146 13 -139 20 -130') + wisp(w, -9, -154, -3, -147, 2.4, -142, 1.6) }),
    center: F('中分', ' C-32.4 -132 -29.6 -126.4 -25 -123.2 C-22 -132 -10 -149 2 -157.4 C14 -149 26 -132 29 -123.2 C33.6 -126.4 36.4 -132 37 -138',
      { deco: (s) => strands(s, 'M2 -172 V-158 M-3 -153 C-10 -147 -17 -138 -21.6 -129 M7 -153 C14 -147 21 -138 25.6 -129') }),
    curtain: F('八字', ' C-32.8 -131 -31.8 -125.4 -29.6 -121 C-27.6 -134 -15 -151 2 -153.6 C19 -151 31.6 -134 33.6 -121 C35.8 -125.4 36.8 -131 37 -138',
      { deco: (s, w) => strands(s, 'M2 -170 V-155 M-4 -151 C-14 -145 -22 -135 -26.6 -126 M8 -151 C18 -145 26 -135 30.6 -126') + wisp(w, -2, -153, -9, -145, -15, -134, 1.4) }),
    mshape: fl('M字', [[-12, -149.4], [16, -149.4]], [[-28.4, -122.8], [2, -137.6], [32.4, -122.8]], 0.3, 0.14,
      { deco: (s) => strands(s, 'M2 -166 V-151 M-9 -147 C-16 -141 -21 -134 -25 -126 M13 -147 C20 -141 25 -134 29 -126') }),
    fluffy: fl('蓬鬆', [[-23, -150], [-11, -153], [1, -152], [13, -151], [24, -148]], [[-30.6, -129], [-17.4, -131.4], [-5.2, -126.4], [7.6, -127.8], [19, -126], [32.4, -128.4]], 0.35, 0.13,
      { deco: (s, w) => strands(s, 'M-10 -151 C-9 -145 -7.6 -138 -6.4 -131 M7 -151 C8 -145 8.6 -138 8.4 -132') + wisp(w, -21, -150, -26, -144, -35, -141) + wisp(w, 22, -149, 26, -140, 26.4, -122.6, 1.5) }),
    choppy: fl('碎束', [[-25, -148], [-16, -150.6], [-7, -149], [2, -151.6], [11, -149.6], [20, -151], [28, -147.6]], [[-30.4, -131], [-20.6, -136.8], [-11.6, -128.4], [-2.4, -136], [6.4, -127.4], [15.4, -134.8], [24.6, -129.2], [33, -134]], 0.12, 0.14,
      { deco: (s) => strands(s, 'M-11 -148 C-11.4 -142 -11.6 -136 -11.6 -131 M6 -149 C6.4 -142 6.4 -136 6.4 -130') }),
    none: F('露額', ' C-31.6 -146 -16 -152 2 -152 C20 -152 35.6 -146 37 -138', { deco: (s, w) => strands(s, 'M-22 -151 C-17 -159 -9 -164 0 -166 M-8 -155 C-4 -161 2 -164 9 -165 M24 -151 C19 -159 12 -163 5 -165') + wisp(w, -8, -155, -14, -148, -18.6, -140.6, 1.4) }),
    longbangs: fl('長瀏海', [[-20, -149], [-3, -151.4], [9, -151.4], [24, -149]], [[-27.4, -118.6], [-11.6, -125.4], [2.4, -117.2], [16, -125.4], [31.4, -118.6]], 0.1, 0.13,
      { deco: (s) => strands(s, 'M-22 -150 C-23.4 -142 -24.6 -134 -25.6 -125 M2.4 -152 C2.4 -144 2.4 -134 2.4 -124 M26 -150 C27.4 -142 28.6 -134 29.6 -125') }),
    incurl: fl('圓瀏海', [[-12, -137.4], [16, -137.4]], [[-25.6, -129.8], [2, -128.4], [29.6, -129.8]], 0.05, 0.22,
      { deco: (s) => strands(s, 'M-12 -148 C-12.6 -145 -12.6 -142 -12 -139.4 M16 -148 C16.6 -145 16.6 -142 16 -139.4', 0.36) }),
    flip: fl('外翹', [[-16, -149.4], [2, -152], [20, -149.4]], [[-37.6, -129.8], [-6, -128], [10, -128], [41.6, -129.8]], 0.45, 0.14,
      { deco: (s) => strands(s, 'M-13 -148 C-20 -144 -27 -139 -33 -133 M17 -148 C24 -144 31 -139 37 -133') }),
    asym: fl('不對稱', [[-19, -148.6], [-4, -151], [11, -151], [25, -148]], [[-28.8, -121.4], [-12.6, -124.2], [3.6, -130.6], [17.6, -136.4], [31.6, -136.8]], 0.2, 0.14,
      { deco: (s) => strands(s, 'M-12 -149 C-12.6 -142 -12.8 -135 -12.6 -128') }),
    layered: fl('層次', [[-20, -150], [-6, -153], [9, -152.6], [24, -149]], [[-29.8, -135], [-14, -137.4], [1, -135], [16.4, -137.6], [31.8, -135.4]], 0.15, 0.15,
      { b: (k) => [[-32, -19, -26.6, -127], [-19, -6, -13, -126], [-6, 9, 2, -124.6], [9, 22, 16.6, -126], [22, 36, 30.4, -127.2]].map(([x0, x1, tx, ty]) => leaf(k, x0, x1, -146, tx, ty)).join(''),
        deco: (s) => strands(s, 'M-13 -151 C-13.4 -147 -13.6 -143 -13.8 -140 M2 -153 C1.8 -148 1.6 -142 1.2 -138') })
  };
  // ===== 兩側 sides (the left one; both drawn). The crown already comes down to over the ear; a lock hangs from inside it, its
  // outer edge carrying on from the crown's. ear: the ear shows; b: drawn behind the head (k)
  const SIDES = {
    short: { name: '短', d: (f) => both(P(f, 'M-44 -151 C-47.6 -141 -48.6 -124 -42.8 -108.4 C-41.6 -112.6 -39.8 -116.8 -37.8 -119.6 C-36.8 -116.4 -35.2 -113.8 -33 -112 C-32.2 -122 -31.2 -132 -29.4 -141 Z')), deco: (s) => both(strands(s, 'M-40 -134 C-40.6 -128 -39.8 -122 -38.4 -117')) },
    chin: { name: '到下巴', d: (f) => both(P(f, 'M-44 -151 C-48 -140 -49.4 -116 -43.6 -95.6 C-42.4 -100 -40.6 -104.6 -38.4 -107.6 C-37.2 -103.6 -35.4 -100.6 -32.6 -98.6 C-31.6 -110 -31 -126 -29.4 -141 Z')), deco: (s) => both(strands(s, 'M-40.4 -134 C-41.2 -125 -40.4 -116 -38.8 -108')) },
    long: { name: '長', d: (f) => both(P(f, 'M-44 -151 C-48.6 -138 -49.6 -100 -45.4 -66 C-43.8 -72 -42 -78 -40 -82.4 C-38.8 -78 -37 -74.6 -34.6 -72.6 C-33.6 -92 -32.2 -122 -29.4 -141 Z')), deco: (s) => both(strands(s, 'M-40.6 -132 C-41.8 -116 -41.4 -98 -40 -86') + shine('M-44.6 -122 C-45.4 -112 -45.2 -102 -44 -94 C-43.4 -102 -43.2 -112 -43.6 -122 Z', 0.22)) },
    incurl: { name: '內彎', d: (f) => both(P(f, 'M-44 -151 C-48.6 -140 -49.4 -112 -44.6 -98 C-41.6 -91.4 -34.6 -90 -28.4 -94.4 C-32.8 -95.4 -35.4 -98.8 -36 -103.6 C-36.4 -116 -33.4 -131 -29.4 -141 Z')), deco: (s) => both(strands(s, 'M-41 -132 C-42.2 -123 -41.8 -112 -39.6 -103')) },
    wave: { name: '波浪', d: (f) => both(P(f, 'M-44 -151 C-48 -144 -46 -128 -48 -118 C-51 -108 -45.4 -101 -47 -92 C-47.6 -88.6 -46.6 -85.6 -44.6 -83.6 C-42 -88 -38.6 -91 -37.4 -95.6 C-36 -102 -40.4 -109 -36.6 -117.6 C-33.4 -126 -32 -134 -29.4 -141 Z')), deco: (s) => both(strands(s, 'M-40.6 -132 C-43 -126 -40.4 -121 -42.4 -113 C-44.2 -105 -41 -99 -41.8 -93')) },
    layered: { name: '層次', b: (k) => both(P(k, 'M-46.4 -140 C-49 -124 -48.4 -108 -44.4 -96 C-42.8 -100.4 -41 -103.4 -39 -105 C-38 -116 -36.8 -128 -33.4 -140 Z')), d: (f) => both(P(f, 'M-44 -151 C-47.6 -141 -47.6 -126 -43.4 -113.6 C-41.6 -117 -39.6 -119.6 -37.4 -121 C-36.4 -118 -34.6 -116 -32.4 -114.6 C-31.6 -124 -30.8 -133 -29.4 -141 Z')), deco: (s) => both(strands(s, 'M-40 -134 C-40.6 -129 -40.2 -125 -39.2 -121')) },
    hime: { name: '公主切', d: (f) => both(P(f, 'M-44 -151 C-47 -142 -46.8 -118 -46.2 -102.6 L-30.8 -102.6 C-30.8 -118 -30.2 -132 -29.4 -141 Z')), deco: (s) => both(strands(s, 'M-41.6 -134 V-105 M-36 -134 V-105', 0.34)) },
    wisps: { name: '觸角', ear: true, d: (f) => both(P(f, 'M-36.8 -134 C-37.4 -122 -36.2 -110 -33.8 -98 C-32.8 -103.6 -31.8 -110 -31 -116 C-30.6 -124 -30.6 -130 -31 -136 Z') + P(f, 'M-31.8 -138 C-31.6 -130 -31 -121 -29.2 -110.6 C-28.4 -115 -27.8 -120 -27.4 -125 C-27.2 -131 -27.6 -136 -28.8 -140 Z')), deco: () => '' },
    flip: { name: '外翹', d: (f) => both(P(f, 'M-44 -151 C-47.8 -140 -47.4 -116 -44.6 -103.4 C-47.4 -101.4 -50.6 -100.6 -53.6 -101.4 C-50 -96.4 -43 -95 -38 -97.4 C-35.6 -98.8 -34 -101.6 -33.4 -104.6 C-32.4 -116 -31.4 -130 -29.4 -141 Z')), deco: (s) => both(strands(s, 'M-40.4 -134 C-41 -125 -40.6 -114 -39.4 -105')) },
    curls: { name: '捲曲', d: (f) => both(P(f, 'M-44 -151 C-47.4 -144 -47.6 -133 -44.6 -125 C-41 -127 -37 -127.6 -33 -127 C-31.6 -132 -30.6 -137 -29.4 -141 Z') + curl(f, -39.6, -120, 6.2, -1) + curl(f, -41, -108, 6, 1) + curl(f, -39.4, -97, 5.6, -1)), deco: (s) => both(swirl(s, [[-39.6, -120, 6.2], [-41, -108, 6], [-39.4, -97, 5.6]])) },
    braid: { name: '辮子', d: (f) => both(P(f, 'M-44 -151 C-47.6 -142 -47 -126 -42.4 -116.6 C-40 -119 -37 -120 -33.4 -119.6 C-32.2 -127 -31.2 -134 -29.4 -141 Z') + plait(f, -38, -114, 4) + P(f, 'M-40.4 -87 C-41.2 -83 -40.4 -79.6 -38.2 -76.6 C-35.8 -79.6 -34.8 -83 -35.6 -87 Z')), t: () => both(tie(-38, -88, 2.4)), deco: (s) => both(plaitLines(s, -38, -114, 4)) },
    longlayer: { name: '長層次', d: (f) => both(P(f, 'M-44 -151 C-48.6 -138 -49.6 -100 -45.6 -70 C-43.8 -75 -41.8 -80 -39.6 -83.6 C-38.4 -80 -36.8 -77.4 -34.8 -76 C-34 -94 -33 -112 -32 -124 Z') + P(f, 'M-44 -151 C-47.6 -141 -47.8 -124 -43.6 -110.6 C-41.6 -114 -39.6 -116.6 -37.4 -118 C-36.4 -115 -34.8 -113 -32.6 -111.6 C-31.6 -122 -30.8 -132 -29.4 -141 Z')), deco: (s) => both(strands(s, 'M-43.6 -110.6 C-41.6 -114 -39.6 -116.6 -37.4 -118 C-36.4 -115 -34.8 -113 -32.6 -111.6', 0.5) + strands(s, 'M-41 -106 C-41.6 -99 -41.2 -92 -40 -87')) },
    tucked: { name: '耳後', ear: true, b: (k) => both(P(k, 'M-46.4 -140 C-48.6 -122 -47.4 -104 -43.6 -94 C-42 -97 -40.4 -99.4 -38.4 -100.6 C-37.6 -110 -36.6 -124 -34 -140 Z')), d: () => '', deco: () => '' },
    above: { name: '耳上短', ear: true, d: () => '', deco: () => '' },
    sideburn: { name: '鬢角', ear: true, d: (f) => both(P(f, 'M-36.8 -136 C-37.4 -126 -36.2 -116 -33.4 -106.6 C-32.4 -111 -31.4 -116 -30.6 -121 C-30.4 -127 -30.6 -133 -31 -138 Z')), deco: () => '' },
    undercut: { name: '推高', ear: true, out: SLIM, earRear: (skin) => both(`<path ${skin} d="M-31.4 -124.6 C-36.4 -125.4 -38.6 -119 -37.4 -114 C-36.6 -110.8 -34 -110 -31.8 -111.2 Z"/>`), d: (f) => `<g opacity=".38">${both(P(f, 'M-34.4 -152 C-36 -142 -35.4 -130 -32.4 -119 C-31 -121 -29.6 -122 -28.4 -122.4 C-29 -132 -29.4 -142 -28.6 -151 Z'))}</g>`, deco: () => '' }
  };
  // the ear (only with the sides that leave it showing): small and round, at the side of the face by the eyes
  const EAR = (skin) => both(`<path ${skin} d="M-31.4 -124.6 C-35.8 -126.4 -39.4 -122.6 -39 -117 C-38.6 -112 -35.6 -108.8 -31.6 -110.2 Z"/><path d="M-33 -121.4 C-35.8 -121.2 -36.4 -116.6 -34.6 -113.4" fill="none" stroke="#c98a6e" stroke-opacity=".6" stroke-width="1.2" stroke-linecap="round"/>`);
  const EAR_REAR = (skin) => both(`<path ${skin} d="M-40.4 -124.6 C-45.4 -125.4 -47.6 -119 -46.4 -114 C-45.6 -110.8 -43 -110 -40.8 -111.2 Z"/>`);
  // ===== 後面 back: behind the head facing us (the left half, k), and all of it from behind (r, f; rd: its strands), its hem in
  // sharp tips
  const hemTips = (y, x0, x1, n, dy = 6) => { const w = (x1 - x0) / n, ns = [], ts = []; for (let i = 0; i <= n; i++) ns.push([r(x1 - w * i), i === 0 || i === n ? y - 3 : y - dy]); for (let i = 0; i < n; i++) ts.push([r(x1 - w * i - w * 0.55), r(y + (i % 2 ? -1 : 1))]); return locks(ns, ts, 0.1, 0.16); };
  const rear = (f, y, x = 46, n = 6) => P(f, `M-${r(x - 2)} -136 C-${r(x - 2)} -162 -22 -174.4 2 -174.4 C26 -174.4 ${r(x + 2)} -162 ${r(x + 2)} -136 C${r(x + 2.6)} -120 ${r(x + 2.4)} ${r(y + 18)} ${r(x + 0.4)} ${r(y - 3)}${hemTips(y, -(x - 3.6), x + 0.4, n)} C-${r(x - 1.6)} ${r(y + 18)} -${r(x - 1.4)} -120 -${r(x - 2)} -136 Z`);
  const BACKS = {
    short: { name: '短', b: (k) => both(P(k, 'M2 -174.4 C-30 -174.4 -46.4 -156 -46.4 -138 C-46.4 -128 -44 -120 -39 -116 L2 -116 Z')), r: (f) => rear(f, -101, 45, 6), rd: (s) => strands(s, 'M-20 -150 C-22 -132 -20 -116 -18 -106 M2 -156 V-106 M24 -150 C26 -132 24 -116 22 -106') },
    // 清爽 (test, 2026-11-09, the user's ask: 短 still read long for a man): a plain short cut, narrowing down the back of the
    // head to a short, finely tipped hem at the nape
    crop: { name: '清爽', b: (k) => both(P(k, 'M2 -174.4 C-30 -174.4 -45.6 -157 -45.6 -141 C-45.6 -133 -44 -127 -40.4 -123 L2 -123 Z')), r: (f) => P(f, `M-44 -136 C-44 -162 -22 -174.4 2 -174.4 C26 -174.4 48 -162 48 -136 C48.4 -124 45 -115 35 -108.6${hemTips(-105, -31, 35, 6, 3.4)} C-41 -115 -44.4 -124 -44 -136 Z`),
      rd: (s) => strands(s, 'M-18 -152 C-20 -138 -18 -124 -15 -112 M2 -158 V-110 M22 -152 C24 -138 22 -124 19 -112') },
    bob: { name: '鮑伯', b: (k) => both(P(k, 'M2 -174.4 C-30 -174.4 -49 -150 -49 -126 C-49 -110 -48.4 -98 -45.6 -91.4 C-43.6 -94 -41.6 -95.4 -39.6 -96 C-38.4 -93 -36.4 -91.4 -34 -90.6 L2 -90.6 Z')), r: (f) => rear(f, -91, 47.4, 7), rd: (s) => strands(s, 'M-22 -150 C-25 -130 -23 -110 -21 -97 M2 -156 V-96 M26 -150 C29 -130 27 -110 25 -97') },
    shoulder: { name: '及肩', b: (k) => both(P(k, 'M2 -174.4 C-30 -174.4 -49.6 -150 -49.6 -124 C-49.6 -104 -51 -90 -50 -79.6 C-47.8 -83 -45.4 -85 -43 -85.6 C-41.6 -82 -39 -79.6 -36 -78.6 L2 -78.6 Z')), r: (f) => rear(f, -79, 48.4, 7), rd: (s) => strands(s, 'M-24 -150 C-27 -126 -25 -102 -23 -86 M2 -156 V-85 M28 -150 C31 -126 29 -102 27 -86') },
    long: { name: '長直', b: (k) => both(P(k, 'M2 -174.4 C-30 -174.4 -50 -150 -50 -122 C-50 -96 -51.4 -72 -50.4 -55.6 C-48.4 -59.6 -46 -62 -43.4 -62.8 C-42 -58.6 -39.4 -56 -36 -54.8 L2 -54.8 Z')), r: (f) => rear(f, -56, 49, 8), rd: (s) => strands(s, 'M-26 -150 C-29 -120 -28 -88 -26 -64 M2 -156 V-62 M30 -150 C33 -120 32 -88 30 -64') + shine('M-30 -118 C-31 -100 -30.4 -84 -29 -72 C-28.2 -84 -28.4 -100 -27.6 -118 Z', 0.18) },
    wavy: { name: '長捲', b: (k) => both(P(k, 'M2 -174.4 C-30 -174.4 -50 -150 -50 -128 C-54 -116 -46 -106 -51 -94 C-55.6 -82 -47.4 -72 -50.4 -61 C-51 -58 -50.4 -55.4 -48.6 -53.6 C-46 -57.6 -42.4 -60 -39.4 -60.4 C-37.6 -57 -35 -55 -32 -54.6 L2 -54.6 Z')),
      r: (f) => P(f, `M-44 -136 C-44 -162 -20 -174.4 2 -174.4 C24 -174.4 48 -162 48 -136 C52 -124 46 -116 50 -104 C54 -92 46 -84 48 -74 C49 -66 46 -62 41 -60${hemTips(-57, -36, 41, 7)} C-42 -60 -45 -66 -44 -74 C-42 -84 -50 -92 -46 -104 C-42 -116 -48 -124 -44 -136 Z`), rd: (s) => strands(s, 'M-24 -128 C-30 -116 -20 -104 -26 -92 C-30 -82 -24 -74 -26 -66 M2 -132 C-4 -118 8 -106 2 -94 C-2 -84 4 -76 2 -64 M28 -128 C34 -116 24 -104 30 -92 C34 -82 28 -74 30 -66') },
    curly: { name: '蓬捲', b: (k) => both(P(k, 'M2 -176 C-30 -176 -48 -152 -48 -124 C-48 -106 -40 -92 -28 -88 L2 -88 Z') + [[-46, -146, 8, -1], [-51, -130, 8.4, 1], [-52, -114, 8.4, -1], [-49, -99, 8, 1], [-40, -90, 7.6, -1]].map(([x, y, rr, s]) => curl(k, x, y, rr, s)).join('')),
      r: (f) => P(f, 'M-46 -136 C-46 -164 -22 -176 2 -176 C26 -176 50 -164 50 -136 C52 -116 46 -96 2 -90 C-42 -96 -48 -116 -46 -136 Z') + [[-44, -150, 8, -1], [-50, -132, 8.4, 1], [-50, -114, 8.4, -1], [-42, -100, 8, 1], [-26, -94, 8, -1], [-10, -92, 8, 1], [6, -92, 8, -1], [22, -93, 8, 1], [38, -98, 8, -1], [50, -112, 8.4, 1], [54, -130, 8.4, -1], [48, -148, 8, 1]].map(([x, y, rr, q]) => curl(f, x, y, rr, q)).join(''),
      rd: (s) => swirl(s, [[-24, -150, 7], [6, -156, 7], [30, -146, 7], [-14, -122, 7], [18, -120, 7], [-42, -100, 7], [-10, -92, 7], [22, -93, 7], [50, -112, 7]]) },
    undercut: { name: '推高', b: (k) => both(P(k, 'M2 -177 C-22 -177 -38 -166 -39.6 -152 L2 -152 Z')),
      r: (f) => P(f, 'M-37.6 -146 C-39 -166 -20 -177 2 -177 C24 -177 43 -166 41.6 -146 C30 -139 -26 -139 -37.6 -146 Z') + `<g opacity=".24">${P(f, 'M-33.6 -144 C-24 -138.6 28 -138.6 37.6 -144 C38.4 -126 35.4 -110 26 -101.4 C14 -97 -10 -97 -22 -101.4 C-31.4 -110 -34.4 -126 -33.6 -144 Z')}</g>`,
      rd: (s) => strands(s, 'M-18 -172 C-21 -162 -22 -152 -20 -143 M2 -177 V-141 M22 -172 C25 -162 26 -152 24 -143') }
  };
  // ===== 造型 on top or hanging from it, part of the hair's one shape facing us (f) and from behind (r); t, rt: the ties over it;
  // d, rd: its strands. under: tucked under a hat (it sits on top of the head)
  const TIE = '#d0574b';
  const tie = (x, y, rr = 3.2) => `<circle cx="${x}" cy="${y}" r="${rr}" fill="${TIE}"/>`;
  const band = (d) => `<path d="${d}" fill="none" stroke="${TIE}" stroke-width="2.6" stroke-linecap="round"/>`;
  const bun = (f, x, y, rr) => `<circle cx="${x}" cy="${y}" r="${rr}" ${f}/>`;
  // a tail from a rounded root at (x0, y0) hanging to a sharp end (tx, ty), w wide at its root, bowing out by o
  const tail = (f, x0, y0, tx, ty, w, o = 0) => P(f, `M${r(x0 - w / 2)} ${y0} C${r(x0 - w / 2 + o - w * 0.3)} ${r(y0 + (ty - y0) * 0.35)} ${r(tx - w * 0.5 + o * 0.6)} ${r(ty - (ty - y0) * 0.3)} ${tx} ${ty} C${r(tx + w * 0.42 + o * 0.6)} ${r(ty - (ty - y0) * 0.34)} ${r(x0 + w / 2 + o + w * 0.2)} ${r(y0 + (ty - y0) * 0.35)} ${r(x0 + w / 2)} ${y0} Q${x0} ${r(y0 - w * 0.62)} ${r(x0 - w / 2)} ${y0} Z`);
  // a plait: n crossed strands, each a lobe pointing down and to one side in turn, from (x, y0) down, drifting dx a strand;
  // plaitLines: their edges again over the one shape, so the plait still reads
  const lobe = (x, y0, i, dx) => { const cx = x + dx * i, y = y0 + i * 6.4, o = i % 2 ? 1 : -1; return `M${r(cx - 5 * o)} ${r(y - 3.6)} C${r(cx - 5.8 * o)} ${r(y + 1)} ${r(cx - 2 * o)} ${r(y + 4.6)} ${r(cx + 3.4 * o)} ${r(y + 5.6)} C${r(cx + 5.6 * o)} ${r(y + 2)} ${r(cx + 4 * o)} ${r(y - 2.6)} ${r(cx - 5 * o)} ${r(y - 3.6)} Z`; };
  const tailLine = (s, ...a) => strands(s, tail('d=""', ...a).match(/ d="([^"]+)"/)[1], 0.8);
  const plait = (f, x, y0, n, dx = 0) => Array.from({ length: n }, (_, i) => P(f, lobe(x, y0, i, dx))).join('');
  const plaitLines = (s, x, y0, n, dx = 0) => strands(s, Array.from({ length: n }, (_, i) => lobe(x, y0, i, dx)).join(' '), 0.75);
  const N = () => '';
  const T = (name, o) => Object.assign({ name, f: N, t: N, d: N, r: N, rt: N, rd: N }, o);
  const TOPS = {
    none: T('無', {}),
    ahoge: T('呆毛', { under: true, f: (f) => P(f, 'M-1.4 -173 C-4.6 -186 4.4 -196.6 16.6 -193.4 C8 -190.6 3.6 -184 4.4 -173.4 Z'), r: (f) => P(f, 'M-1.4 -173 C-4.6 -186 4.4 -196.6 16.6 -193.4 C8 -190.6 3.6 -184 4.4 -173.4 Z') }),
    bun: T('丸子', { under: true, f: (f) => bun(f, 2, -183, 12.4), t: () => band('M-8.4 -172.4 Q2 -168.8 12.4 -172.4'), d: (s) => swirl(s, [[2, -184, 12]]), r: (f) => bun(f, 2, -181, 12.4), rt: () => band('M-9 -170 Q2 -166.4 13 -170'), rd: (s) => swirl(s, [[2, -182, 12]]) }),
    twinbuns: T('雙丸子', { under: true, f: (f) => both(bun(f, -26, -168, 10.4)), t: () => both(tie(-20.6, -161.6, 2.6)), d: (s) => both(swirl(s, [[-26, -169, 10]])), r: (f) => both(bun(f, -26, -168, 10.4)), rt: () => both(tie(-20.6, -161.6, 2.6)) }),
    lowbuns: T('低丸子', { f: (f) => both(bun(f, -40, -104, 8.4)), t: () => both(tie(-35, -107, 2.4)), d: (s) => both(swirl(s, [[-40, -104, 8]])), r: (f) => both(bun(f, -34, -102, 8.4)), rt: () => both(tie(-29, -105, 2.4)) }),
    ponytail: T('高馬尾', { f: (f) => tail(f, 28, -170, 52, -96, 17, 16), t: () => tie(27, -170.6, 3.6), d: (s) => strands(s, 'M36 -160 C46 -148 50 -128 50 -104'), r: (f) => tail(f, 2, -168, 2.6, -92, 16, 0), rt: () => tie(2, -167, 4), rd: (s) => tailLine(s, 2, -168, 2.6, -92, 16, 0) + strands(s, 'M0 -156 C-2 -134 -1 -114 1 -100') }),
    sidetail: T('側馬尾', { f: (f) => tail(f, 46, -158, 58, -104, 14, 9), t: () => tie(45.4, -158, 3.6), r: (f) => tail(f, -42, -158, -54, -104, 14, -9), rt: () => tie(-41.4, -158, 3.6) }),
    sidelow: T('低側馬尾', { f: (f) => tail(f, -36, -108, -28, -72, 15, -8), t: () => tie(-35.4, -106, 3.4), d: (s) => strands(s, 'M-38 -100 C-40 -92 -38 -82 -31 -76'), r: (f) => tail(f, 22, -106, 32, -80, 14, 6), rt: () => tie(21, -104, 3.4) }),
    twintails: T('雙馬尾', { f: (f) => both(tail(f, -41, -157, -54, -86, 15, -10)), t: () => both(tie(-40, -157, 3.6)), d: (s) => both(strands(s, 'M-46 -148 C-52 -134 -53 -114 -52 -96')), r: (f) => both(tail(f, -41, -157, -54, -86, 15, -10)), rt: () => both(tie(-40, -157, 3.6)) }),
    lowtails: T('低雙馬尾', { f: (f) => both(P(f, 'M-40 -110 C-49 -106 -54 -96 -53.4 -84.6 C-50.6 -88 -48.4 -89.4 -46.4 -89.6 C-46 -86 -44.6 -83.6 -42.4 -82 C-41.4 -86 -39.6 -88.6 -37.6 -89.6 C-36.4 -86.6 -34.6 -84.6 -32.4 -83.6 C-32 -94 -34 -104 -34.4 -110 Z')), t: () => both(tie(-37.4, -109, 3.2)),
      r: (f) => both(P(f, 'M-32 -108 C-42 -104 -48 -94 -47.6 -84.6 C-45 -88 -42.6 -89.4 -40.6 -89.6 C-40 -86 -38.6 -83.6 -36.4 -82 C-35.4 -86 -33.6 -88.6 -31.6 -89.6 C-30.4 -86.6 -28.6 -84.6 -26.4 -83.6 C-26 -94 -26 -104 -26.4 -108 Z')), rt: () => both(tie(-29.4, -107, 3.2)) }),
    braids: T('雙辮子', { f: (f) => both(plait(f, -37, -102, 5) + P(f, 'M-39.4 -70 C-40.2 -66 -39.4 -62.6 -37.2 -59.6 C-34.8 -62.6 -33.8 -66 -34.6 -70 Z')), t: () => both(tie(-37, -71.4, 2.6)), d: (s) => both(plaitLines(s, -37, -102, 5)), r: (f) => both(plait(f, -22, -104, 3, -3.4)), rt: () => both(tie(-30, -86, 2.6)), rd: (s) => both(plaitLines(s, -22, -104, 3, -3.4)) }),
    sidebraid: T('側辮', { f: (f) => plait(f, -35, -104, 6, 1) + P(f, 'M-32.4 -67 C-33.2 -63 -32.4 -59.6 -30.2 -56.6 C-27.8 -59.6 -26.8 -63 -27.6 -67 Z'), t: () => tie(-30, -68.6, 2.8), d: (s) => plaitLines(s, -35, -104, 6, 1), r: (f) => plait(f, 24, -104, 3, 3.4), rt: () => tie(32, -86, 2.6), rd: (s) => plaitLines(s, 24, -104, 3, 3.4) }),
    lowtail: T('低馬尾', { r: (f) => tail(f, 2, -104, 2.4, -58, 13, 0), rt: () => tie(2, -104, 4), rd: (s) => tailLine(s, 2, -104, 2.4, -58, 13, 0) + strands(s, 'M1 -96 C0 -84 1 -72 2 -64') })
  };
  // a look's hair, layer by layer (hat: what sits on top of the head is tucked under it). back, front, rear: the shapes of a layer,
  // drawn plain (f, k) — HERO.svg draws each twice, the outline under the fills; over, rearOver: the ties on top
  function assemble(lk, hat) {
    const fr = FRINGE[lk.fringe] || FRINGE.round, sd = SIDES[lk.sides] || SIDES.short, bk = BACKS[lk.hairBack] || BACKS.short, tp0 = TOPS[lk.hairTop] || TOPS.none, tp = hat && tp0.under ? TOPS.none : tp0;
    return {
      ear: (skin) => (sd.ear ? EAR(skin) : ''),
      back: (f, k) => (sd.b ? sd.b(k || f) : '') + bk.b(k || f),
      front: (f, k) => sd.d(f) + fr.b(k || f) + fr.u(f) + crown(f, fr.e, sd.out) + fr.x(f) + tp.f(f),
      over: () => (sd.t ? sd.t() : '') + tp.t(),
      deco: (s, w) => fr.deco(s, w || s) + sd.deco(s) + tp.d(s) + RING,
      rear: (f) => bk.r(f) + tp.r(f),
      rearOver: (s, skin) => tp.rt() + bk.rd(s) + tp.rd(s) + (sd.ear && skin ? (sd.earRear || EAR_REAR)(skin) : '') + RING
    };
  }
  // the user's sheet of 48 hairstyles (in its order) as parts: [name, 瀏海, 兩側, 後面, 造型]; 隨機 rolls one of them, so its parts
  // go together (the 整套 row that offered them was dropped before 1.2.1)
  const STYLES = [
    ['短髮', 'round', 'above', 'short', 'none'], ['刺蝟頭', 'spiky', 'above', 'short', 'none'], ['中分', 'center', 'chin', 'bob', 'none'], ['旁分呆毛', 'sidepart', 'above', 'short', 'ahoge'],
    ['齊瀏海長髮', 'blunt', 'tucked', 'long', 'none'], ['斜瀏海長髮', 'swept', 'long', 'long', 'none'], ['呆毛長髮', 'fluffy', 'long', 'long', 'ahoge'], ['觸角長髮', 'swept', 'wisps', 'long', 'none'],
    ['短鮑伯', 'round', 'incurl', 'bob', 'none'], ['空氣鮑伯', 'airy', 'chin', 'bob', 'none'], ['香菇頭', 'blunt', 'incurl', 'bob', 'ahoge'], ['大斜鮑伯', 'longswept', 'flip', 'bob', 'none'],
    ['蓬鬆中長', 'fluffy', 'wave', 'shoulder', 'none'], ['斜瀏海波浪', 'swept', 'wave', 'wavy', 'none'], ['齊瀏海波浪', 'blunt', 'wave', 'wavy', 'none'], ['M字波浪', 'mshape', 'wave', 'wavy', 'none'],
    ['斜分及肩', 'longswept', 'tucked', 'shoulder', 'none'], ['露額長髮', 'none', 'tucked', 'long', 'none'], ['妹妹頭', 'shortblunt', 'incurl', 'bob', 'none'], ['捲鮑伯', 'swept', 'wave', 'bob', 'none'],
    ['旁分大波浪', 'sidepart', 'wave', 'wavy', 'none'], ['空氣長直', 'airy', 'long', 'long', 'none'], ['長捲髮', 'fluffy', 'curls', 'wavy', 'none'], ['爆炸頭', 'fluffy', 'curls', 'curly', 'none'],
    ['丸子頭', 'none', 'above', 'short', 'bun'], ['雙丸子', 'blunt', 'above', 'short', 'twinbuns'], ['丸子長髮', 'shortblunt', 'tucked', 'long', 'twinbuns'], ['露額鮑伯', 'none', 'tucked', 'bob', 'none'],
    ['側馬尾', 'airy', 'chin', 'short', 'sidetail'], ['低側馬尾', 'sidepart', 'tucked', 'short', 'sidelow'], ['低丸子', 'round', 'above', 'short', 'lowbuns'], ['高馬尾', 'airy', 'wisps', 'short', 'ponytail'],
    ['旁分丸子', 'longswept', 'tucked', 'short', 'bun'], ['八字低丸子', 'curtain', 'tucked', 'short', 'lowbuns'], ['斜瀏海丸子', 'swept', 'above', 'short', 'bun'], ['八字丸子', 'curtain', 'wisps', 'short', 'bun'],
    ['雙馬尾', 'blunt', 'above', 'short', 'twintails'], ['小雙丸子', 'shortblunt', 'above', 'short', 'twinbuns'], ['低雙馬尾', 'blunt', 'chin', 'short', 'lowtails'], ['斜瀏海低雙馬尾', 'swept', 'chin', 'short', 'lowtails'],
    ['中分觸角', 'center', 'wisps', 'long', 'none'], ['公主切', 'blunt', 'hime', 'long', 'none'], ['空氣丸子', 'airy', 'wisps', 'short', 'bun'], ['斜瀏海丸子長髮', 'swept', 'long', 'long', 'bun'],
    ['雙辮子', 'blunt', 'tucked', 'short', 'braids'], ['側辮', 'swept', 'tucked', 'short', 'sidebraid'], ['旁分雙辮', 'sidepart', 'chin', 'short', 'braids'], ['圓瀏海', 'incurl', 'incurl', 'shoulder', 'none']
  ];
  return { FRINGE, SIDES, BACKS, TOPS, STYLES, assemble };
  })();
  [['fringe', HAIRP.FRINGE], ['sides', HAIRP.SIDES], ['hairBack', HAIRP.BACKS], ['hairTop', HAIRP.TOPS]].forEach(([k, m]) => { OPTS[k] = Object.entries(m).map(([v, p]) => [v, p.name]); });
  // ===== the body (test, 2026-11-09): Q版 after the user's pick — a big head on a small body: an A-line top, short arms held a
  // little off it, stubby legs, round shoes; flat colours, no outline. The head (face, hair, what is worn on it) is drawn as before in
  // its own units and set on the body HS times bigger (HEAD): HX, HY put a point of the head's units in the body's. Body space:
  // centre x = 2, shoulders y -66, the top's hem -30, hips -28, feet 0.
  const HS = 1.1, HX = (x) => q(2 + (x - 2) * HS), HY = (y) => q(-63 + (y + 93.6) * HS);
  const HEAD = `translate(2 -63) scale(${HS}) translate(-2 93.6)`;
  const CHEEK = 'translate(2 5.8) scale(1.18 1) translate(-2 0)';   // the cheeks lower and further out, under the outer corners of the eyes (the user's pick)
  // tops (F: the light, c: the hero's top colour, d: a shade of it): the torso from the front and from behind (over: drawn over a
  // body wear, the hood), the collar round the neck (over the arms, under the chin), the sleeves (long, short, wide, robe; cuff; paws)
  const TORSO = 'M-13 -66 Q2 -67.6 17 -66 L26 -30 Q2 -25 -22 -30 Z', HEM = 'M-22 -30 Q2 -25 26 -30 L25.2 -34 Q2 -29 -21.2 -34 Z';
  const ROBE = 'M-13 -66 Q2 -67.6 17 -66 L30 -5 Q2 0 -26 -5 Z';   // a long robe's body, from the shoulders to the ankles
  const BELLY = '<ellipse cx="2" cy="-45" rx="10" ry="12" fill="#fbf6ee" fill-opacity=".92"/>';
  // 2026-11-11 (the user: 古道具屋's wares finer too): the wares' fine detail inside their shapes — wSh a soft shade (dark and
  // see-through, so it reads by day and by night alike), wHi a line of light, wLn a seam or rib in a colour lit as its fill (F/L at z)
  const wSh = (d, o = 0.1) => `<path d="${d}" fill="#000" fill-opacity="${o}"/>`;
  const wHi = (d, o = 0.25, w = 1.2) => `<path d="${d}" fill="none" stroke="#fff" stroke-opacity="${o}" stroke-width="${w}" stroke-linecap="round"/>`;
  const sk = (F, c, z) => `style="stroke:${paint(F(c, z))}"`;   // a stroke lit as a fill is (the room's light is a style, never an attribute)
  const wLn = (F, c, z, d, w = 1, o = 1, x = '') => `<path d="${d}" fill="none" ${sk(F, c, z)} stroke-width="${w}"${o < 1 ? ` stroke-opacity="${o}"` : ''} stroke-linecap="round"${x}/>`;
  const stitch = (F, c, z, d, o = 0.6) => wLn(F, c, z, d, 0.55, o, ' stroke-dasharray="1.2 1.4"');   // a row of stitches in colour c
  const knit = (xs, y0, y1, o = 0.16) => `<path d="${xs.map((x) => `M${q(x)} ${q(y0(x))} V${q(y1(x))}`).join(' ')}" stroke="#000" stroke-opacity="${o}" stroke-width=".6"/>`;   // knit ribs between two edges
  const SWEATER_RIB = knit(Array.from({ length: 17 }, (_, i) => -19.4 + i * 2.8), (x) => -32.4 + 10 * ((x + 21.6) / 47.2) * (1 - (x + 21.6) / 47.2), (x) => -29.6 + 10 * ((x + 21.6) / 47.2) * (1 - (x + 21.6) / 47.2), 0.18);   // the sweater's ribbed hem
  const TOPS = {
    hoodie: { sleeve: 'long',
      front: (F, c, d) => `<path ${F(c, 1.2)} d="${TORSO}"/><path ${F(d, 0.8)} d="${HEM}"/><path ${F(d, 1)} d="M-10 -47 H14 L12 -38 H-8 Z"/><path d="M-1.4 -62 V-53 M5.4 -62 V-53" stroke="#e8ecff" stroke-width="1.3" stroke-linecap="round"/>`,
      collar: (F, c, d) => `<path ${F(d, 1.6)} d="M-13 -67 Q2 -57 17 -67 L15 -70 Q2 -61 -11 -70 Z"/>`,
      back: (F, c, d) => `<path ${F(c, 1.2)} d="${TORSO}"/><path ${F(d, 0.8)} d="${HEM}"/>`, over: (F, c, d) => `<path ${F(d, 1.5)} d="M-12 -67 Q2 -46 16 -67 Q2 -61 -12 -67 Z"/>` },
    tee: { sleeve: 'short',   // 2026-11-11 (finer): a stitched hem (the sleeves' too, in arm), the neck band lit
      front: (F, c, d) => `<path ${F(c, 1.2)} d="${TORSO}"/><path ${F(d, 0.8)} d="${HEM}"/>${stitch(F, d, 0.8, 'M-21.3 -32.9 Q2 -27.9 25.3 -32.9')}${wLn(F, d, 1.6, 'M-6 -66.4 Q2 -59 10 -66.4', 2)}`,
      back: (F, c, d) => `<path ${F(c, 1.2)} d="${TORSO}"/><path ${F(d, 0.8)} d="${HEM}"/>${stitch(F, d, 0.8, 'M-21.3 -32.9 Q2 -27.9 25.3 -32.9')}${wLn(F, d, 1.6, 'M-5 -66.6 Q2 -64 9 -66.6', 1.8)}` },
    sweater: { sleeve: 'long', cuff: true,   // 2026-11-11 (finer): the cables twist (a second strand crossing the first), ribs on the hem and the collar
      front: (F, c, d) => `<path ${F(c, 1.2)} d="${TORSO}"/>${wLn(F, d, 0.8, 'M-21.6 -31 Q2 -26 25.6 -31', 3.4)}${SWEATER_RIB}<path d="M-4 -61 l2.2 3 l-2.2 3 l2.2 3 l-2.2 3 l2.2 3 l-2.2 3 l2.2 3 l-2.2 3 M8 -61 l2.2 3 l-2.2 3 l2.2 3 l-2.2 3 l2.2 3 l-2.2 3 l2.2 3 l-2.2 3" fill="none" ${sk(F, d, 1.2)} stroke-opacity=".6" stroke-width="1"/><path d="M-1.8 -61 l-2.2 3 l2.2 3 l-2.2 3 l2.2 3 l-2.2 3 l2.2 3 l-2.2 3 l2.2 3 M10.2 -61 l-2.2 3 l2.2 3 l-2.2 3 l2.2 3 l-2.2 3 l2.2 3 l-2.2 3 l2.2 3" fill="none" ${sk(F, d, 1.2)} stroke-opacity=".3" stroke-width=".9"/>`,
      collar: (F, c, d) => `<path ${F(d, 1.6)} d="M-9 -68 Q2 -64.6 13 -68 L13.6 -63 Q2 -59.4 -9.6 -63 Z"/>${knit([-7, -4.6, -2.2, 0.2, 2.6, 5, 7.4, 9.8, 12.2], (x) => -68 + 6.8 * ((x + 9) / 22) * (1 - (x + 9) / 22) + 0.6, (x) => -63 + 7.2 * ((x + 9.6) / 23.2) * (1 - (x + 9.6) / 23.2) - 0.6, 0.2)}`,
      back: (F, c, d) => `<path ${F(c, 1.2)} d="${TORSO}"/>${wLn(F, d, 0.8, 'M-21.6 -31 Q2 -26 25.6 -31', 3.4)}${SWEATER_RIB}` },
    shirt: { sleeve: 'long', cuff: true, light: true,   // 2026-11-11 (finer): a placket band, buttons with a rim, the pocket's hem, the collar's shadow, a stitched hem; a pleat at the back
      front: (F, c, d) => `<path ${F(c, 1.2)} d="${TORSO}"/><path d="M2 -62 V-28" ${sk(F, d, 1.2)} stroke-opacity=".6" stroke-width=".9"/><path d="M5.2 -62 V-28" ${sk(F, d, 1.2)} stroke-opacity=".35" stroke-width=".7"/>${[-56, -48, -40].map((y) => `<circle cx="3.6" cy="${y}" r="1" fill="${lt(c, 0.65)}" ${sk(F, d, 1.2)} stroke-opacity=".5" stroke-width=".35"/>`).join('')}<path d="M-10 -55 h6 v6 h-6 Z" fill="none" ${sk(F, d, 1.2)} stroke-opacity=".5" stroke-width=".9"/><path d="M-10 -53.4 h6" ${sk(F, d, 1.2)} stroke-opacity=".35" stroke-width=".6"/>${stitch(F, d, 1.2, 'M-21.4 -31.6 Q2 -26.6 25.4 -31.6', 0.5)}`,
      collar: (F, c) => `${wSh('M-9 -67.4 L-1 -59 L-.3 -57.4 L-8.8 -65.6 Z M13 -67.4 L5 -59 L4.3 -57.4 L12.8 -65.6 Z', 0.12)}<path ${F(lt(c, 0.55), 1.6)} d="M-9 -67.4 L-1 -59 L2 -65 Z M13 -67.4 L5 -59 L2 -65 Z"/>`,
      back: (F, c, d) => `<path ${F(c, 1.2)} d="${TORSO}"/><path d="M-13 -58 Q2 -55.6 17 -58" fill="none" ${sk(F, d, 1.2)} stroke-opacity=".45" stroke-width="1"/><path d="M2 -55.8 V-46" ${sk(F, d, 1.2)} stroke-opacity=".3" stroke-width=".7"/>${stitch(F, d, 1.2, 'M-21.4 -31.6 Q2 -26.6 25.4 -31.6', 0.5)}` },
    jinbei: { sleeve: 'wide',
      front: (F, c, d) => `<path ${F(c, 1.2)} d="M-13 -66 Q2 -67.6 17 -66 L22 -28 H-18 Z"/><path d="M-18 -30.6 H22 M-16.4 -28.2 L-16.8 -32.4 M20.4 -28.2 L20.8 -32.4" stroke="#000" stroke-opacity=".12" stroke-width=".8"/><path ${F(d, 1.3)} d="M15 -66 L-1 -42 L3 -41 L18 -63 Z"/>${stitch(F, lt(c, 0.5), 1.3, 'M15.8 -64.4 L.6 -41.8', 0.55)}<path d="M-6 -66 L2 -52 M-14 -42 l5 1.6 M-14 -40 l4 4" fill="none" ${sk(F, d, 1.2)} stroke-width="1.2"/>${[[-8, -56], [-4, -46], [12, -50], [15, -38], [-12, -34]].map(([x, y]) => `<path d="M${x - 1.6} ${y} h3.2 M${x} ${y - 1.6} v3.2" ${sk(F, lt(c, 0.5), 1.2)} stroke-opacity=".7" stroke-width=".9"/>`).join('')}`,   // 2026-11-11 (finer): a hem fold, side slits, the front panel's edge stitched
      collar: (F, c, d) => `<path ${F(d, 1.6)} d="M-7 -67 L2 -58 L11 -67 L8.4 -67 L2 -61 L-4.4 -67 Z"/>`,
      back: (F, c, d) => `<path ${F(c, 1.2)} d="M-13 -66 Q2 -67.6 17 -66 L22 -28 H-18 Z"/><path d="M2 -66 V-28" ${sk(F, d, 1.2)} stroke-opacity=".4" stroke-width="1"/><path d="M-18 -30.6 H22 M-16.4 -28.2 L-16.8 -32.4 M20.4 -28.2 L20.8 -32.4" stroke="#000" stroke-opacity=".12" stroke-width=".8"/>` },
    cattop: { sleeve: 'long', paw: true,   // fur in the top's colour, a white belly, a red collar and a bell
      // 2026-11-11 (finer): the belly shaded underneath, toe beans on the paws (in arm); the collar and bell lit by the room, the collar
      // stitched, the bell's slit and shine; the back's stripes lit
      front: (F, c, d) => `<path ${F(c, 1.2)} d="M-14 -66 Q2 -67.6 18 -66 L27 -29 Q2 -23 -23 -29 Z"/>${BELLY}${wSh('M-4.4 -35.8 A10 12 0 0 0 8.4 -35.8 Q2 -33.8 -4.4 -35.8 Z', 0.07)}`,
      collar: (F) => `<path ${F('#d0453c', 1.6)} d="M-12 -67 Q2 -61 16 -67 L15.6 -63.6 Q2 -57.6 -11.6 -63.6 Z"/>${stitch(F, '#f2b0a8', 1.6, 'M-11.6 -65.1 Q2 -59.4 15.6 -65.1', 0.7)}<circle cx="2" cy="-59.4" r="2.6" ${F('#e6c25a', 1.7)}/><path d="M.6 -59 h2.8 M2 -59 V-57.2" stroke="#9a7a2a" stroke-width=".7"/><circle cx="1" cy="-60.6" r=".8" fill="#fff" fill-opacity=".7"/>`,
      back: (F, c, d) => `<path ${F(c, 1.2)} d="M-14 -66 Q2 -67.6 18 -66 L27 -29 Q2 -23 -23 -29 Z"/>${wLn(F, d, 1.2, 'M-8 -58 q10 3.5 20 0 M-10 -49 q12 3.5 24 0 M-12 -40 q14 3.5 28 0', 1.8)}`,
      over: (F) => `<path ${F('#d0453c', 1.6)} d="M-11 -67 Q2 -63 15 -67 L14.6 -64 Q2 -60 -10.6 -64 Z"/>` },
    wizrobe: { sleeve: 'robe',   // 魔法師長袍 (Halloween): to the ankles, gold stars and hem, a belt with a little spell book at the hip
      // 2026-11-11 (finer): the robe falls in soft folds (front and back), the belt's top edge catches the light, the buckle has its
      // hole, the book its spine
      front: (F, c, d) => `<path ${F(c, 1.2)} d="${ROBE}"/><path d="M-12 -33 Q-14.4 -20 -17 -6 M8.4 -31.6 Q9.4 -18 10.4 -3 M19 -33 Q22.4 -20 25 -6" fill="none" stroke="#000" stroke-opacity=".1" stroke-width="1.1" stroke-linecap="round"/><path d="M-3.4 -58 Q-5 -50 -6.4 -41.4 M10.4 -56 Q11.6 -48 12.4 -41.4" fill="none" stroke="#000" stroke-opacity=".07" stroke-width="1" stroke-linecap="round"/><path d="M-26 -5 Q2 0 30 -5" fill="none" stroke="#e6c25a" stroke-width="2"/>${[[-6, -56, 1.8], [10, -58, 1.4], [8, -48, 1.6], [-4, -44, 1.4], [-12, -24, 2], [4, -16, 1.7], [20, -12, 1.5], [-18, -12, 1.5], [-4, -8, 1.3]].map((a) => star(...a)).join('')}
        <path ${F(d, 1.3)} d="M-19 -40 Q2 -36 23 -40 V-35.6 Q2 -31.6 -19 -35.6 Z"/>${wHi('M-18.4 -39.3 Q2 -35.3 22.4 -39.3', 0.16, 0.7)}<rect x="0" y="-40.4" width="4.4" height="5.4" rx="1" fill="#e6c25a"/><rect x="1.3" y="-39.2" width="1.8" height="3" rx=".4" fill="#000" fill-opacity=".28"/>
        <g transform="rotate(-8 19 -28)"><rect x="14" y="-34" width="10" height="12" rx="1.2" fill="#6b3f2a"/>${wSh('M15.2 -34 H16.6 V-22 H15.2 Q14 -22 14 -23.2 V-32.8 Q14 -34 15.2 -34 Z', 0.28)}<rect x="15" y="-33" width="8" height="10" rx=".8" fill="none" stroke="#e6c25a" stroke-width=".7"/>${star(19, -28, 2.4)}</g>`,
      collar: (F, c, d) => `<path ${F(d, 1.6)} d="M-8 -67 L2 -59 L12 -67 L10.6 -63.6 L2 -56 L-6.6 -63.6 Z"/><circle cx="2" cy="-57.6" r="1.8" fill="#e6c25a"/>`,
      back: (F, c) => `<path ${F(c, 1.2)} d="${ROBE}"/><path d="M-11 -30 Q-13.6 -18 -16 -6 M14.6 -30 Q18 -18 21 -6 M3 -24 Q3.4 -14 3.8 -2" fill="none" stroke="#000" stroke-opacity=".08" stroke-width="1.1" stroke-linecap="round"/><path d="M-26 -5 Q2 0 30 -5" fill="none" stroke="#e6c25a" stroke-width="2"/>${star(8, -40, 6)}<path d="M-6 -60 a7 7 0 1 0 6.4 10 a5.6 5.6 0 1 1 -6.4 -10 Z" fill="#e6c25a"/>` },
    yukata: { sleeve: 'robe',   // 浴衣 (test, 2026-11-09: the town's 緣日; not sold, the festival's people wear it): to the ankles, a crossed collar, a wide light obi, little flowers
      front: (F, c, d) => `<path ${F(c, 1.2)} d="${ROBE}"/><path d="M-9 -66 L12 -40" fill="none" stroke="${d}" stroke-width="1.4"/>${[[-6, -58], [12, -52], [-12, -24], [10, -16], [18, -30], [-2, -12]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2.8" fill="${lt(c, 0.75)}"/><circle cx="${x}" cy="${y}" r="1" fill="${d}"/>`).join('')}
        <path ${F(lt(c, 0.7), 1.3)} d="M-18 -43 Q2 -39 22 -43 V-34 Q2 -30 -18 -34 Z"/><path d="M-18 -38.6 Q2 -34.6 22 -38.6" fill="none" stroke="${d}" stroke-opacity=".5" stroke-width=".9"/>`,
      collar: (F, c) => `<path ${F(lt(c, 0.85), 1.6)} d="M-8 -67 L5 -53 L12 -67 L9 -67 L5 -59 L-5 -67 Z"/>`,
      back: (F, c) => `<path ${F(c, 1.2)} d="${ROBE}"/><path ${F(lt(c, 0.7), 1.3)} d="M-18 -43 Q2 -39 22 -43 V-34 Q2 -30 -18 -34 Z"/><path ${F(lt(c, 0.7), 1.3)} d="M-7 -46 L2 -39 L11 -46 L11 -30 L2 -36 L-7 -30 Z"/>` },
    // the town's work clothes (test, 2026-11-10, the user: who they are at a glance) — ROLE_STYLES, worn by the town's people only
    hakui: { sleeve: 'kimono',   // 巫女の白衣: white, a crossed collar edged in red, wide sleeves; tucked into the 緋袴
      front: (F, c, d) => `<path ${F(c, 1.2)} d="M-13 -66 Q2 -67.6 17 -66 L22 -34 Q2 -30 -18 -34 Z"/><path d="M-8 -66 L9 -40 M12 -66 L3 -52" fill="none" stroke="${d}" stroke-opacity=".55" stroke-width="1"/>`,
      collar: (F, c) => `<path ${F('#c8323a', 1.6)} d="M-9.4 -67 L4 -50.4 L13.4 -67 L11.6 -67 L4 -54.6 L-7.4 -67 Z"/><path ${F(lt(c, 0.5), 1.65)} d="M-7.4 -67 L4 -54.6 L11.6 -67 L9.4 -67 L4 -58.4 L-5 -67 Z"/>`,
      back: (F, c, d) => `<path ${F(c, 1.2)} d="M-13 -66 Q2 -67.6 17 -66 L22 -34 Q2 -30 -18 -34 Z"/><path d="M2 -66 V-34" stroke="${d}" stroke-opacity=".35" stroke-width="1"/>` },
    samue: { sleeve: 'long', cuff: true,   // 作務衣 (居酒屋の大将): a crossed collar in a darker band, a tie at the side
      front: (F, c, d) => `<path ${F(c, 1.2)} d="${TORSO}"/><path ${F(d, 0.8)} d="${HEM}"/><path ${F(dk(c, 0.7), 1.3)} d="M-9 -66 L11 -38 L15 -39.4 L-5 -66 Z"/><path d="M13 -66 L3 -53" fill="none" stroke="${dk(c, 0.7)}" stroke-width="1.6"/><path d="M14 -40 l5 3 M14 -40 l3 6" fill="none" stroke="${dk(c, 0.6)}" stroke-width="1.2" stroke-linecap="round"/>`,
      collar: (F, c) => `<path ${F(dk(c, 0.7), 1.6)} d="M-7 -67 L2 -58 L11 -67 L8.4 -67 L2 -61 L-4.4 -67 Z"/>`,
      back: (F, c, d) => `<path ${F(c, 1.2)} d="${TORSO}"/><path ${F(d, 0.8)} d="${HEM}"/><path d="M2 -66 V-29" stroke="${d}" stroke-opacity=".4" stroke-width="1"/>` },
    kappogi: { sleeve: 'long', cuff: true, light: true,   // 割烹着 (食堂のおかみ): a white smock past the hips, a round neck, two pockets
      front: (F, c, d) => `<path ${F(c, 1.2)} d="M-13 -66 Q2 -67.6 17 -66 L27 -22 Q2 -17 -23 -22 Z"/><path d="M-23 -22 Q2 -17 27 -22" fill="none" stroke="${d}" stroke-width="1.6"/><path ${F(lt(c, 0.4), 1.25)} d="M-17 -38 h11 v8 q-5.5 2 -11 0 Z M10 -38 h11 v8 q-5.5 2 -11 0 Z"/>`,
      collar: (F, c, d) => `<path ${F(lt(c, 0.6), 1.6)} d="M-9 -67.6 Q2 -58 13 -67.6 L12 -65 Q2 -56 -8 -65 Z"/><path d="M-8 -65 Q2 -56 12 -65" fill="none" stroke="${d}" stroke-opacity=".5" stroke-width=".8"/>`,
      back: (F, c, d) => `<path ${F(c, 1.2)} d="M-13 -66 Q2 -67.6 17 -66 L27 -22 Q2 -17 -23 -22 Z"/><path d="M-2 -40 l-6 -3 v6 Z M6 -40 l6 -3 v6 Z" fill="${d}"/>` },
    chef: { sleeve: 'long', cuff: true, light: true,   // 調理白衣 (食堂の料理人): white, a standing collar, buttoned down the side
      front: (F, c, d) => `<path ${F(c, 1.2)} d="${TORSO}"/><path d="M9 -64 V-27" stroke="${d}" stroke-width="1"/>${[-58, -50, -42, -34].map((y) => `<circle cx="12" cy="${y}" r="1.2" fill="${d}"/>`).join('')}`,
      collar: (F, c, d) => `<path ${F(lt(c, 0.5), 1.6)} d="M-9 -68.4 Q2 -65 13 -68.4 L13 -63.6 Q2 -60.2 -9 -63.6 Z"/><path d="M-9 -63.6 Q2 -60.2 13 -63.6" fill="none" stroke="${d}" stroke-width=".8"/>`,
      back: (F, c, d) => `<path ${F(c, 1.2)} d="${TORSO}"/><path d="M2 -64 V-28" stroke="${d}" stroke-opacity=".35" stroke-width="1"/>` },
    jacket: { sleeve: 'long', cuff: true,   // 制服・スーツ (駅員, 巡査, 会社員): lapels over a white shirt, buttons down the front
      front: (F, c, d) => `<path ${F(c, 1.2)} d="${TORSO}"/><path fill="#f4f1ea" d="M-5 -66.6 L2 -50 L9 -66.6 Z"/><path ${F(dk(c, 0.78), 1.25)} d="M-9 -66 L2 -49 L-0.6 -41 L-12.6 -61 Z M13 -66 L2 -49 L4.6 -41 L16.6 -61 Z"/>${[-44, -36].map((y) => `<circle cx="4.4" cy="${y}" r="1.4" fill="#c9a24a"/>`).join('')}<path d="M-14 -40 h7 M11 -40 h7" stroke="${d}" stroke-width="1.2"/>`,
      collar: () => '<path fill="#fbf8f0" d="M-5 -67.2 L-0.6 -61 L2 -64.6 Z M9 -67.2 L4.6 -61 L2 -64.6 Z"/>',
      back: (F, c, d) => `<path ${F(c, 1.2)} d="${TORSO}"/><path d="M2 -60 V-28" stroke="${d}" stroke-opacity=".5" stroke-width="1"/>` },
    happi: { sleeve: 'wide',   // 法被 (屋台, ガイド): open at the front, a dark collar band down it with 祭, a belt, white stripes at the hem; 祭 on the back
      front: (F, c, d) => `<path ${F(c, 1.2)} d="M-13 -66 Q2 -67.6 17 -66 L23 -28 H-19 Z"/><path d="M-19 -31 H23 M-19 -33.4 H23" stroke="#fff" stroke-opacity=".75" stroke-width="1"/><path fill="${dk(c, 0.42)}" d="M-7 -67 L-2 -28 H2.4 L-2.6 -61 Z M11 -67 L6.4 -28 H2 L6.6 -61 Z"/><text x="-1.6" y="-44" font-size="5.6" font-weight="700" fill="#fff" text-anchor="middle" font-family="'Hiragino Mincho ProN', 'Noto Serif JP', serif">祭</text><rect x="-17" y="-40" width="38" height="3.6" rx="1" fill="${dk(c, 0.5)}"/>`,
      back: (F, c, d) => `<path ${F(c, 1.2)} d="M-13 -66 Q2 -67.6 17 -66 L23 -28 H-19 Z"/><path d="M-19 -31 H23 M-19 -33.4 H23" stroke="#fff" stroke-opacity=".75" stroke-width="1"/><circle cx="2" cy="-50" r="8.6" fill="none" stroke="#fff" stroke-width="1.5"/><text x="2" y="-46.6" font-size="10" font-weight="700" fill="#fff" text-anchor="middle" font-family="'Hiragino Mincho ProN', 'Noto Serif JP', serif">祭</text>` },
    vest: { sleeve: 'long', cuff: true, light: true, sleeveColor: '#f4f1ea',   // ベスト (喫茶店のマスター): over a white shirt, its sleeves white
      front: (F, c, d) => `<path ${F('#f4f1ea', 1.2)} d="${TORSO}"/><path ${F(c, 1.22)} d="M-13 -66 L-3 -50 L-1 -29.6 Q-11 -29 -22 -30 Z M17 -66 L7 -50 L5 -29.6 Q15 -29 26 -30 Z"/>${[-46, -40, -34].map((y) => `<circle cx="5.6" cy="${y}" r="1.1" fill="${lt(c, 0.5)}"/>`).join('')}`,
      collar: () => '<path fill="#fbf8f0" d="M-9 -67.4 L-1 -59 L2 -65 Z M13 -67.4 L5 -59 L2 -65 Z"/>',
      back: (F, c) => `<path ${F(c, 1.2)} d="${TORSO}"/>` }
  };
  // an arm (s: -1 the left, 1 the right) hangs from the shoulder a little off the body; drawn hanging straight down from (0, 0) and
  // turned out, so a pose turns it round the shoulder (the .arm group, in CSS)
  const SHOULDER = [13.5, -63.5];
  function arm(L, tp, top, topDk, skin, cls, s, dx = 0) {
    const hand = tp.paw ? `<circle cy="27" r="4.8" ${L(top, 0.9)}/><circle cy="28.4" r="1.6" fill="#f2a8b8"/><path d="M-2.1 25.6 h.01 M0 24.9 h.01 M2.1 25.6 h.01" stroke="#f2a8b8" stroke-width="1.3" stroke-linecap="round"/>` : `<circle cy="27" r="4.3" ${L(skin, 0.9)}/>`;   // 2026-11-11 (finer): the cat's paw has its toe beans
    const bare = `<rect x="-3.2" y="2" width="6.4" height="23" rx="3.2" ${L(skin, 1.2)}/>`;
    const sc = tp.sleeveColor || top, cuff = tp.cuff ? (tp.light ? lt(sc, 0.55) : dk(topDk, 0.85)) : topDk;
    const art = tp.sleeve === 'kimono' ? `<path class="kosode" ${L(sc, 1.3)} d="M-4.6 -2 Q0 -5 4.6 -2 L9.4 23 Q0 25.6 -9.4 23 Z"/><path d="M-9.4 23 Q0 25.6 9.4 23" fill="none" stroke="${dk(sc, 0.8)}" stroke-width="1"/>`
      : tp.sleeve === 'robe' ? `<path ${L(topDk, 1.3)} d="M-4.6 -2 Q0 -5 4.6 -2 L8.6 22 Q0 24 -8.6 22 Z"/><path d="M-8.6 22 Q0 24 8.6 22" fill="none" stroke="#e6c25a" stroke-width="1.4"/>`
      : tp.sleeve === 'short' ? bare + `<path ${L(top, 1.4)} d="M-4.6 -2 Q0 -5 4.6 -2 L5 9 Q0 10.6 -5 9 Z"/>${stitch(L, topDk, 1.4, 'M-4.8 7.4 Q0 9 4.8 7.4')}`   // the tee's (its stitched hem)
      : tp.sleeve === 'wide' ? bare + `<path ${L(topDk, 1.3)} d="M-4.6 -2 Q0 -5 4.6 -2 L7.4 15 Q0 16.6 -7.4 15 Z"/>`
      : `<path ${L(sc, 1.3)} d="M-4 -2 Q0 -4.5 4 -2 L4.4 21 Q0 22.6 -4.4 21 Z"/><path ${L(cuff, 1)} d="M-4.4 18.4 Q0 20 4.4 18.4 L4.5 21.6 Q0 23.2 -4.5 21.6 Z"/>`;
    return `<g class="arm ${cls}"><g transform="translate(${q(2 + s * SHOULDER[0] + dx)} ${SHOULDER[1]}) rotate(${-s * 26})">${art}${hand}</g></g>`;
  }
  // bottoms (c: the trousers' colour): a leg round x, the hips over both legs, the foot, and what goes with them — a skirt over
  // both legs, a tail behind; the shoe is everyone's but the cat's paws
  // shoes (test, 2026-11-09), each round x in its colour c: a sneaker on a white sole (a darker one under a light shoe), a short boot
  // over the trouser's hem, a low leather shoe with a shine. 2026-11-12 (the user: three to buy): 木屐, 雨靴, 兔子拖鞋, each drawn
  // facing us and from behind (b), on the skin s where a bare foot shows
  const light = (c) => [1, 3, 5].reduce((a, i) => a + parseInt(c.slice(i, i + 2), 16), 0) > 560;
  const SHOES = {
    sneaker: (F, c, x) => `<path ${F(c, 0.1)} d="M${q(x - 6.5)} -9 h13 v4.6 q0 4.4 -4.2 4.4 h-5 q-3.8 0 -3.8 -4.4 Z"/><path ${F(light(c) ? dk(c, 0.8) : '#f4f1ea', 0.05)} d="M${q(x - 6.5)} -3.4 h13 q-.2 3.4 -4.2 3.4 h-5 q-3.6 0 -3.8 -3.4 Z"/><path d="M${q(x - 2.6)} -7 h5.2" stroke="${light(c) ? dk(c, 0.75) : lt(c, 0.45)}" stroke-width="1" stroke-linecap="round"/>`,
    boots: (F, c, x) => `<path ${F(c, 0.15)} d="M${q(x - 6)} -15 h12 v10.6 q0 4.4 -4.2 4.4 h-4.6 q-3.2 0 -3.2 -4.4 Z"/><path ${F(dk(c, 0.82), 0.3)} d="M${q(x - 6.4)} -16 h12.8 v3 h-12.8 Z"/><path d="M${q(x - 6)} -2 h12" stroke="#000" stroke-opacity=".18" stroke-width="1.4"/>`,
    loafer: (F, c, x) => `<path ${F(c, 0.1)} d="M${q(x - 6.5)} -7 h13 v2.6 q0 4.4 -4.2 4.4 h-5 q-3.8 0 -3.8 -4.4 Z"/><path d="M${q(x - 3)} -5.6 h6" stroke="${dk(c, 0.7)}" stroke-width="1.1" stroke-linecap="round"/><ellipse cx="${q(x + 2.6)}" cy="-3.4" rx="2" ry=".9" fill="#fff" fill-opacity=".35"/>`,
    // 木屐: a bare foot on a wooden board with two teeth, the grain on its edge; the strap (鼻緒) in the shoe's colour from the toe
    // post out to both sides, its knot shining (from behind only its ends by the heel)
    geta: (F, c, x, s, b) => {
      const w = '#c9965f', k = sk(F, c, 0.12);
      return `<path ${F(dk(w, 0.7), 0.02)} d="M${q(x - 5.6)} -2.4 h3 v2.4 h-3 Z M${q(x + 2.6)} -2.4 h3 v2.4 h-3 Z"/>${wSh(`M${q(x - 5.6)} -2.4 h3 v.7 h-3 Z M${q(x + 2.6)} -2.4 h3 v.7 h-3 Z`, 0.18)}
        <rect x="${q(x - 7)}" y="-4.8" width="14" height="2.6" rx=".7" ${F(w, 0.05)}/>${wHi(`M${q(x - 6.3)} -4.45 H${q(x + 6.3)}`, 0.35, 0.6)}<path d="M${q(x - 4.6)} -3.3 H${q(x + 0.6)} M${q(x + 2.2)} -3.6 H${q(x + 5.4)}" stroke="#000" stroke-opacity=".13" stroke-width=".45" stroke-linecap="round"/>
        <path ${F(s, 0.15)} d="M${q(x - 5.4)} -4.6 V-7.2 Q${q(x - 5.4)} -10 ${q(x - 2.6)} -10 H${q(x + 2.6)} Q${q(x + 5.4)} -10 ${q(x + 5.4)} -7.2 V-4.6 Z"/>${wSh(`M${q(x - 5.4)} -5.8 H${q(x + 5.4)} V-4.6 H${q(x - 5.4)} Z`, 0.1)}
        ${b ? `<path d="M${q(x - 5.4)} -5.4 l1.6 -.5 M${q(x + 5.4)} -5.4 l-1.6 -.5" fill="none" ${k} stroke-width="1.7" stroke-linecap="round"/>`
        : `<path d="M${q(x - 2.6)} -9.4 v1.2 M${q(x + 0.2)} -9.8 v1.2 M${q(x + 2.8)} -9.4 v1.2" stroke="#000" stroke-opacity=".08" stroke-width=".5" stroke-linecap="round"/><path d="M${q(x - 5.4)} -5.4 Q${q(x - 2)} -6 ${x} -7.8 Q${q(x + 2)} -6 ${q(x + 5.4)} -5.4" fill="none" ${k} stroke-width="1.8" stroke-linecap="round"/><circle cx="${x}" cy="-7.9" r="1.15" ${F(dk(c, 0.82), 0.14)}/><circle cx="${q(x - 0.4)}" cy="-8.3" r=".4" fill="#fff" fill-opacity=".5"/>`}`;
    },
    // 雨靴: tall and glossy over the trousers, a turned-down rim, a darker sole, a long shine up the near side and one on the toe;
    // from behind a pull tab at the top
    rainboots: (F, c, x, s, b) => {
      const d = dk(c, 0.8);
      return `${b ? `<rect x="${q(x - 1.4)}" y="-22" width="2.8" height="3.6" rx="1.1" ${F(d, 0.32)}/>` : ''}<path ${F(c, 0.15)} d="M${q(x - 6.2)} -18.8 h12.4 v14.2 q0 4.6 -4.4 4.6 h-4.8 q-3.2 0 -3.2 -4.6 Z"/>${wSh(`M${q(x + 3.6)} -18.8 H${q(x + 6.2)} V-4.6 Q${q(x + 6.2)} -1.2 ${q(x + 4.2)} -.5 Q${q(x + 4.4)} -10 ${q(x + 3.6)} -18.8 Z`, 0.12)}
        <path ${F(dk(c, 0.6), 0.02)} d="M${q(x - 5.9)} -2.2 H${q(x + 5.8)} Q${q(x + 5.2)} 0 ${q(x + 1.8)} 0 H${q(x - 3)} Q${q(x - 5.4)} 0 ${q(x - 5.9)} -2.2 Z"/><rect x="${q(x - 6.8)}" y="-20" width="13.6" height="2.8" rx="1.2" ${F(d, 0.3)}/>${wHi(`M${q(x - 5.8)} -19.6 H${q(x + 5.8)}`, 0.3, 0.6)}
        ${wHi(`M${q(x - 3.8)} -16.4 V-6.6`, 0.55, 1.5)}${wHi(`M${q(x - 1.6)} -16 V-12.6`, 0.3, 0.8)}${b ? '' : `<ellipse cx="${q(x + 2.2)}" cy="-3.7" rx="1.7" ry=".75" fill="#fff" fill-opacity=".4"/>`}`;
    },
    // 兔子拖鞋: a round fluffy slipper (its fur in soft tufts along the top), a pale sole, two long ears pink inside; facing us a little
    // face — eyes with a glint, a pale muzzle, a pink nose, blush — and from behind a white cotton tail
    bunnyslippers: (F, c, x, s, b) => {
      const ear = (o) => `<ellipse cx="${q(x + 3 * o)}" cy="-11.6" rx="1.9" ry="4.6" transform="rotate(${16 * o} ${q(x + 3 * o)} -11.6)" ${F(c, 0.22)}/>${b ? wSh(`M${q(x + 3 * o - 1.2)} -9.6 a1.3 3 ${16 * o} 0 0 2.4 0 Z`, 0.12)
        : `<ellipse cx="${q(x + 3 * o)}" cy="-11.4" rx=".85" ry="3.2" transform="rotate(${16 * o} ${q(x + 3 * o)} -11.4)" ${F('#f2a8b8', 0.22)}/>`}`;
      const fur = light(c) ? (d) => wSh(d, 0.1) : (d) => wHi(d, 0.28, 0.7);
      return `${ear(-1)}${ear(1)}<path ${F(c, 0.1)} d="M${q(x - 7.1)} -1.4 C${q(x - 7.7)} -6.8 ${q(x - 4.4)} -9.7 ${x} -9.7 C${q(x + 4.4)} -9.7 ${q(x + 7.7)} -6.8 ${q(x + 7.1)} -1.4 Q${q(x + 6.8)} 0 ${q(x + 5)} 0 H${q(x - 5)} Q${q(x - 6.8)} 0 ${q(x - 7.1)} -1.4 Z"/>
        ${wSh(`M${q(x - 7.1)} -2.6 Q${x} -1 ${q(x + 7.1)} -2.6 Q${q(x + 7.1)} -1.4 ${q(x + 6.8)} -.6 Q${x} .6 ${q(x - 6.8)} -.6 Q${q(x - 7.1)} -1.4 ${q(x - 7.1)} -2.6 Z`, 0.12)}<path ${F(light(c) ? dk(c, 0.82) : '#e9e2d6', 0.02)} d="M${q(x - 6.9)} -1.2 H${q(x + 6.9)} Q${q(x + 6.6)} 0 ${q(x + 5)} 0 H${q(x - 5)} Q${q(x - 6.6)} 0 ${q(x - 6.9)} -1.2 Z"/>
        ${fur(`M${q(x - 5.8)} -6.4 q.6 -1.4 1.8 -1.1 M${q(x - 2.4)} -8.4 q.8 -1 2 -.6 M${q(x + 1.6)} -8.6 q.9 -.8 2 -.2 M${q(x + 4.6)} -6.8 q.8 -.6 1.6 .3`)}
        ${b ? `<circle cx="${x}" cy="-4.6" r="2.6" ${F('#f7f3ec', 0.08)}/>${wSh(`M${q(x - 2.5)} -4 A2.6 2.6 0 0 0 ${q(x + 2.5)} -4 Q${x} -2.9 ${q(x - 2.5)} -4 Z`, 0.12)}<path d="M${q(x - 1)} -6 q.6 -.6 1.4 -.2" stroke="#fff" stroke-opacity=".7" stroke-width=".5" fill="none" stroke-linecap="round"/>`
        : `<ellipse cx="${x}" cy="-3.7" rx="2.7" ry="1.75" ${F(light(c) ? '#fbf7f0' : lt(c, 0.78), 0.08)}/><circle cx="${q(x - 2.6)}" cy="-5.8" r=".9" fill="${INK}"/><circle cx="${q(x + 2.6)}" cy="-5.8" r=".9" fill="${INK}"/><circle cx="${q(x - 2.3)}" cy="-6.1" r=".32" fill="#fff"/><circle cx="${q(x + 2.9)}" cy="-6.1" r=".32" fill="#fff"/>
          <ellipse cx="${x}" cy="-4.4" rx=".8" ry=".55" ${F('#e8869a', 0.08)}/><path d="M${x} -3.9 v.7" stroke="#b46a74" stroke-width=".35" stroke-linecap="round"/><ellipse cx="${q(x - 4.3)}" cy="-4.2" rx="1.1" ry=".6" fill="#f4a0a8" fill-opacity=".55"/><ellipse cx="${q(x + 4.3)}" cy="-4.2" rx="1.1" ry=".6" fill="#f4a0a8" fill-opacity=".55"/>`}`;
    }
  };
  SHOES.zori = (F, c, x) => `<path ${F('#f6f3ec', 0.1)} d="M${q(x - 5.6)} -10 h11.2 v5.6 q0 3.6 -4 3.6 h-3.6 q-3.6 0 -3.6 -3.6 Z"/><rect x="${q(x - 7)}" y="-2.2" width="14" height="2.6" rx="1.2" ${F(c, 0.05)}/><path d="M${x} -5.4 l-3.4 3.2 M${x} -5.4 l3.4 3.2" stroke="#8a2f2a" stroke-width="1.1" stroke-linecap="round"/>`;   // 草履: white tabi on a sandal (c)
  const HIPS = (F, c) => `<path ${F(c, 0.7)} d="M-17 -33 H21 L21.6 -22 H-17.6 Z"/>`;
  const BOTTOMS = {
    pants: { hips: HIPS, leg: (F, c, x) => `<rect x="${q(x - 5.5)}" y="-28" width="11" height="23" rx="4" ${F(c, 0.4)}/>` },
    // 2026-11-11 (finer): the shorts' legs turned up at the hem, the wide trousers pressed with a crease, their hem shaded, the skirt's
    // pleats in light and shade with a stitched hem
    shorts: { hips: HIPS, leg: (F, c, x, skin) => `<rect x="${q(x - 4.8)}" y="-24" width="9.6" height="19" rx="4" ${F(skin, 0.3)}/><rect x="${q(x - 6)}" y="-28" width="12" height="10" rx="3" ${F(c, 0.5)}/><path d="M${q(x - 6)} -20.8 H${q(x + 6)}" stroke="#000" stroke-opacity=".2" stroke-width=".9"/>` },
    wide: { hips: HIPS, leg: (F, c, x) => `<path ${F(c, 0.4)} d="M${q(x - 6)} -28 H${q(x + 6)} L${q(x + 7.6)} -5 Q${x} -3.6 ${q(x - 7.6)} -5 Z"/><path d="M${q(x + 0.6)} -26 L${q(x + 1)} -9" stroke="#000" stroke-opacity=".1" stroke-width=".8" stroke-linecap="round"/>${wSh(`M${q(x - 7.3)} -7.2 H${q(x + 7.3)} L${q(x + 7.6)} -5 Q${x} -3.6 ${q(x - 7.6)} -5 Z`, 0.12)}` },
    skirt: { leg: (F, c, x, skin) => `<rect x="${q(x - 4.8)}" y="-24" width="9.6" height="19" rx="4" ${F(skin, 0.3)}/>`,
      over: (F, c, d) => `<path ${F(c, 0.7)} d="M-16 -36 H20 L26 -16 Q2 -12 -22 -16 Z"/>${wSh('M2 -34 H12 L15 -14.8 Q8.6 -14.1 2 -14 Z M-16 -36 H-8 V-34 L-11 -14.8 Q-16.6 -15.4 -22 -16 Z', 0.07)}<path d="M-8 -34 L-11 -15 M2 -34 V-13.4 M12 -34 L15 -15" ${sk(F, d, 0.7)} stroke-opacity=".35" stroke-width="1"/>${wHi('M-6.8 -33 L-9.6 -16.2 M3.2 -33 V-15.2 M13.2 -33 L15.8 -16.2', 0.14, 0.7)}${stitch(F, d, 0.7, 'M-21.4 -17.6 Q2 -13.6 25.4 -17.6', 0.5)}` },
    hakama: { leg: () => '',   // 緋袴 (the miko): wide and pleated over both legs to the ankles, tied in front; only the 草履 show
      over: (F, c, d) => `<path class="hakama" ${F(c, 0.7)} d="M-17 -38 Q2 -40 21 -38 L27 -6 Q2 -2 -23 -6 Z"/><path d="M-6 -36 L-10 -6 M2 -37 V-3.6 M10 -36 L14 -6" fill="none" stroke="${d}" stroke-opacity=".55" stroke-width="1"/><path d="M-16.6 -36 Q2 -33 20.6 -36" fill="none" stroke="${d}" stroke-width="2"/><path ${F(c, 0.72)} d="M2 -34.4 l-6.4 -3 v6 Z M2 -34.4 l6.4 -3 v6 Z"/><path d="M2 -34.4 l-3 7 M2 -34.4 l3 7" stroke="${c}" stroke-width="1.6" stroke-linecap="round"/>` },
    catpants: { hips: HIPS, leg: (F, c, x) => `<rect x="${q(x - 5.5)}" y="-28" width="11" height="22" rx="4" ${F(c, 0.4)}/>`,
      // 2026-11-11 (finer): a shine on the paws; the tail lit by the room like the rest of them, with two tabby rings
      foot: (F, c, x, d) => `<ellipse cx="${x}" cy="-4.4" rx="7" ry="4.4" ${F(c, 0.1)}/><ellipse cx="${q(x - 1.8)}" cy="-6.6" rx="3" ry="1.2" fill="#fff" fill-opacity=".12"/><path d="M${q(x - 2.8)} -5.6 v2.4 M${x} -6 v2.4 M${q(x + 2.8)} -5.6 v2.4" ${sk(F, d, 0.1)} stroke-width=".9" stroke-linecap="round"/>`,
      tail: (F, c, d, side) => { const k = sk(F, c, 0.8), kd = sk(F, d, 0.8);
        return side ? `<path d="M2 -30 C2 -14 22 -16 25 -32 C26 -40 22 -46 18 -44" fill="none" ${k} stroke-width="5.4" stroke-linecap="round"/><path d="M19.7 -25.6 L23.3 -22.6 M21.9 -39.3 L26.3 -41.1" ${kd} stroke-width="2.2"/><path d="M20 -45.4 C19.4 -45.6 18.4 -44.8 18 -44" ${kd} stroke-width="5.4" stroke-linecap="round"/>`
          : `<path d="M18 -31 C32 -32 38 -46 33 -58" fill="none" ${k} stroke-width="5.4" stroke-linecap="round"/><path d="M27.9 -37.9 L31.4 -34.5 M31.6 -44.3 L36.2 -42.9" ${kd} stroke-width="2.2"/><path d="M34 -56.4 C33.8 -57.4 33.4 -58 33 -58" ${kd} stroke-width="5.4" stroke-linecap="round"/>`; } }
  };
  // a head worn whole (猫の頭): it takes the place of the hero's own head, hair and face, in the fur of their top
  const CAT_EYES = '<g class="eyes"><ellipse cx="-11" cy="-126" rx="5.4" ry="7" fill="#2a2730"/><ellipse cx="15" cy="-126" rx="5.4" ry="7" fill="#2a2730"/><circle cx="-9.4" cy="-128.6" r="1.9" fill="#fff"/><circle cx="16.6" cy="-128.6" r="1.9" fill="#fff"/><circle cx="-12.6" cy="-123" r=".9" fill="#fff" fill-opacity=".7"/><circle cx="13.4" cy="-123" r=".9" fill="#fff" fill-opacity=".7"/></g>';
  const FULL = {
    // 2026-11-11 (finer): a line of light up each ear and tufts in the pink, a shine on the brow, the chin rounding off into shade
    // (under the nape from behind), a second catch-light in each eye
    cathead: (F, c, d) => {
      const ear = (s) => `<path ${F(c, 4.3)} d="M${2 - 32 * s} -146 L${2 - 32 * s} -177 L${2 - 10 * s} -161 Z"/>${wHi(`M${2 - 30.4 * s} -152 V-172`, 0.18, 1.1)}`, pink = (s) => `<path fill="#f2a8b8" d="M${2 - 28 * s} -152 L${2 - 28 * s} -170 L${2 - 15 * s} -160.5 Z"/><path d="M${2 - 26 * s} -156 l${2.6 * s} -5 M${2 - 23 * s} -155.6 l${1.2 * s} -4" stroke="#fff" stroke-opacity=".75" stroke-width=".9" stroke-linecap="round"/>`;
      const headPath = 'M-34 -128 C-36 -151 -21 -168 2 -168 C25 -168 40 -151 38 -128 C38 -108 24 -94 2 -94 C-20 -94 -34 -108 -34 -128 Z';
      const stripes = `<path d="M-5 -166 l2 8 M2 -168 v9 M9 -166 l-2 8" fill="none" ${sk(F, d, 4)} stroke-width="2.4" stroke-linecap="round"/>`;
      return [ear(1) + ear(-1) + pink(1) + pink(-1) + `<path ${F(c, 4)} d="${headPath}"/>${wSh('M-31 -116 C-27 -103 -14 -95.6 2 -95.6 C18 -95.6 31 -103 35 -116 C27 -106 16 -101 2 -101 C-12 -101 -23 -106 -31 -116 Z', 0.08)}<ellipse cx="-12" cy="-151" rx="7" ry="2.8" transform="rotate(-24 -12 -151)" fill="#fff" fill-opacity=".1"/>${stripes}<ellipse cx="2" cy="-110" rx="15" ry="10" fill="#fbf6ee"/>${CAT_EYES}
        <path d="M-1 -115.5 h6 l-3 3.6 Z" fill="#e8869a"/><path d="M2 -112 v2.2 M-3 -107.2 Q-.5 -104.6 2 -107.4 Q4.5 -104.6 7 -107.2" fill="none" stroke="#5a3a3a" stroke-width="1.3" stroke-linecap="round"/>
        <path d="M-12 -110 L-31 -113 M-12 -107 L-31 -105.5 M16 -110 L35 -113 M16 -107 L35 -105.5" stroke="#5a4a4a" stroke-opacity=".45" stroke-width="1"/><ellipse cx="-20" cy="-113" rx="4.4" ry="2.6" fill="#f2a0a0" fill-opacity=".55"/><ellipse cx="24" cy="-113" rx="4.4" ry="2.6" fill="#f2a0a0" fill-opacity=".55"/>`,
        ear(1) + ear(-1) + `<path ${F(c, 4)} d="${headPath}"/>${wSh('M-32 -117 C-29 -103 -16 -95.6 2 -95.6 C20 -95.6 33 -103 36 -117 C29 -106 17 -100.4 2 -100.4 C-13 -100.4 -25 -106 -32 -117 Z', 0.1)}<ellipse cx="-12" cy="-151" rx="7" ry="2.8" transform="rotate(-24 -12 -151)" fill="#fff" fill-opacity=".1"/><path d="M-14 -160 q16 6 32 0 M-18 -146 q20 6 40 0 M-16 -132 q18 6 36 0" fill="none" ${sk(F, d, 4)} stroke-width="2.4" stroke-linecap="round"/>`];
    }
  };
  // what is worn on the head comes in three kinds, and none of them ever cuts the hair:
  // - on top (貓耳髮箍, 必勝頭巾; 眼鏡 on the face): drawn over any hair as it is, front and back
  // - a hat (HATS): drawn big enough to cover the crown, so the fringe, the sides, the back and any tail stay as they are; what sits
  //   on top of the head (呆毛, 丸子, 雙丸子) is tucked under it while it is on (1.2.1: hats no longer swap the whole hairstyle)
  // - a whole head (FULL): takes the place of the head, hair and face; nothing is worn on the face
  const HATS = new Set(['beanie', 'strawhat', 'beret', 'gradcap', 'cathood', 'witchhat', 'sankakukin', 'chefcap', 'bakerhat', 'cap']);
  const HEAD_TOP = { witchhat: -232, bakerhat: -214 };   // how high a thing on the head reaches, where it stands above a hat's usual -196 (head units)
  const ON_BODY = new Set(['scarf', 'bowtie', 'backpack', 'necktie', 'randoseru', 'wings']);   // drawn in the body's units, not on the head
  const ON_HAIR = new Set(['foxmask']);   // worn on the face's part but over the hair and any hat (the fox mask, tilted on the side of the head): [front, back] go there, [2, 3] where the face's things go
  const SHADES = new Set(['sunglasses']);   // dark lenses: the eyes behind them are not drawn (a big eye's lashes would show round them)
  const BACKS = new Set(['backpack', 'randoseru', 'wings']);   // shown from behind on their own (古道具屋, the wardrobe)
  const THUMB_BOX = { wings: '-40 -82 84 56', foxmask: '2 -187 70 70', necktie: '-22 -76 48 42' };   // their own frames: what the usual would cut, or leave too small (the faint body or head cut at the frame)
  const tucked = (lk, id) => (HATS.has(id) && HAIRP.TOPS[lk.hairTop].under ? HAIRP.TOPS[lk.hairTop].name : '');   // what a hat tucks away
  // the things worn: [front, back] drawings by part, in the figure's own units; c and d are their top's colour and a shade of it
  // the cat hood's fluffy edge (2026-11-11, finer): little arches of fur along the middle of its cream edge, bulging outward, both
  // halves (made once)
  const HOOD_FLUFF = (() => {
    const P = [[40, -98], [43, -124], [34, -158], [2, -162]], at = (t) => [0, 1].map((k) => (1 - t) ** 3 * P[0][k] + 3 * (1 - t) ** 2 * t * P[1][k] + 3 * (1 - t) * t * t * P[2][k] + t ** 3 * P[3][k]);
    let d = '';
    for (let i = 0; i < 12; i++) {
      const t = (i + 0.5) / 12, [x, y] = at(t), [x1, y1] = at(t + 0.02), [x0, y0] = at(t - 0.02), l = Math.hypot(x1 - x0, y1 - y0), ux = (x1 - x0) / l, uy = (y1 - y0) / l;
      d += `M${q(x - ux * 1.5)} ${q(y - uy * 1.5)} Q${q(x - uy * 1.6)} ${q(y + ux * 1.6)} ${q(x + ux * 1.5)} ${q(y + uy * 1.5)} `;
      d += `M${q(4 - x + ux * 1.5)} ${q(y - uy * 1.5)} Q${q(4 - x + uy * 1.6)} ${q(y + ux * 1.6)} ${q(4 - x - ux * 1.5)} ${q(y + uy * 1.5)} `;
    }
    return d.trim();
  })();
  const WEAR = {
    witchhat: (L, c, d) => {   // 魔法師帽 (Halloween): a wide brim, a tall crown bent over at the tip, a gold band, a star and a moon
      // 2026-11-11 (finer): the brim's front edge in the light, the crown standing in its own shadow on the brim, its far side shaded,
      // a shine up its near side, creases where the tip bends over, the band's lower edge
      const h = `<ellipse cx="2" cy="-150" rx="58" ry="11.5" ${L(d, 4.2)}/>${wHi('M-46 -144.6 Q2 -135 50 -144.6', 0.16, 1.2)}${wSh('M-38 -152.4 Q2 -140 42 -152.4 Z', 0.14)}<path ${L(c, 4.4)} d="M-36 -152 C-30 -180 -14 -206 4 -222 C10 -228 20 -230 28 -222 C18 -220 13 -212 14 -200 C17 -184 32 -168 40 -152 Q2 -144 -36 -152 Z"/>
        ${wSh('M14 -200 C17 -184 32 -168 40 -152 Q36 -151 31.6 -150.4 C25 -168 15.6 -184 14 -200 Z', 0.1)}${wHi('M-25 -168 C-18 -184 -9 -198 1 -209', 0.16, 1.8)}<path d="M8.6 -213 Q4.6 -205 -3.4 -200.4 M7 -218.4 Q13 -223.4 21 -224.6" fill="none" stroke="#000" stroke-opacity=".13" stroke-width="1.1" stroke-linecap="round"/>
        <path d="M-36 -152 Q2 -144 40 -152 L39 -160 Q2 -152 -35 -160 Z" fill="#e6c25a"/>${wSh('M-36 -152 Q2 -144 40 -152 L39.7 -154.2 Q2 -146.2 -35.7 -154.2 Z', 0.16)}${star(-2, -180, 5.6)}<path d="M15 -197 a6 6 0 1 0 4 10 a4.6 4.6 0 1 1 -4 -10 Z" fill="#e6c25a"/>`;
      return [h, h];
    },
    cathood: (L, c, d) => {   // 貓耳兜帽: a hood up round the face, a fluffy edge, ears on top; with 貓咪上衣 and 貓咪褲 a whole cat suit
      // 2026-11-11 (finer): a line of light up each ear and tufts in the pink, the hood shaded on its far side and lit on its near
      // crown, the fluffy edge's fur picked out (HOOD_FLUFF); from behind its seam stitched
      const ears = both(`<path ${L(c, 4.4)} d="M-36 -164 L-30 -200 L-8 -183 Z"/>${wHi('M-33.6 -167.6 L-29.8 -194.4', 0.2, 1.2)}`), outer = 'M-48 -98 C-54 -128 -46 -166 -22 -180 C-10 -186 14 -186 26 -180 C50 -166 58 -128 52 -98';
      const fluff = `<path d="${HOOD_FLUFF}" fill="none" ${sk(L, '#d8cab2', 4.35)} stroke-width=".9" stroke-linecap="round"/>`;
      return [ears + both('<path fill="#f2a8b8" d="M-30.4 -171 L-27.6 -192 L-14 -182.6 Z"/><path d="M-26 -175 l1 -5 M-22.6 -177.6 l.2 -3.8" stroke="#fff" stroke-opacity=".75" stroke-width=".9" stroke-linecap="round"/>') + `<path ${L(c, 4.3)} d="${outer} L40 -98 C43 -124 34 -158 2 -162 C-30 -158 -39 -124 -36 -98 Z"/>${wSh('M52 -98 C58 -128 50 -166 26 -180 C40 -164 46.4 -130 44 -98 Z', 0.08)}${wHi('M-40 -146 C-34 -162 -22 -174 -8 -179', 0.18, 1.6)}
        <path ${L('#fbf6ee', 4.35)} d="M42.8 -98 C46 -126 36.6 -161 2 -165 C-32.6 -161 -42 -126 -38.8 -98 L-33.2 -98 C-36 -122 -27.4 -155 2 -159 C31.4 -155 40 -122 37.2 -98 Z"/>${fluff}`,
        ears + `<path ${L(c, 4.3)} d="${outer} Q2 -88 -48 -98 Z"/>${wSh('M52 -98 C58 -128 50 -166 26 -180 C40 -164 46.4 -130 44 -98 Q48 -96.6 52 -98 Z', 0.08)}${wHi('M-42 -140 C-38 -160 -26 -174 -10 -180', 0.14, 1.6)}<path d="M2 -184 V-100" ${sk(L, d, 4.3)} stroke-width="1.4" stroke-opacity=".6"/>${stitch(L, '#ffffff', 4.3, 'M4.6 -182 V-101', 0.4)}`];
    },
    beanie: (L) => {   // pulled down over the crown to the fringe, a turned-up rib cuff, a pompom
      // 2026-11-11 (finer): the cuff's shadow on the crown, its upper edge in the light and its lower in shade; the pompom's yarn knotted,
      // shaded underneath, with a shine and a shadow on the crown
      const ribs = [-38, -28, -18, -8, 2, 12, 22, 32, 42].map((x) => { const u = (x - 2) / 48.5, w = 3 * (1 - u * u); return `M${x} ${q(-147.4 - w)} V${q(-138.6 + w)}`; }).join(' ');
      const cap = `<path ${L('#d9534a', 4.2)} d="M-44 -141 C-46 -171 -23 -185 2 -185 C27 -185 50 -171 48 -141 Z"/>${both('<path d="M-24 -151 C-23 -164 -16 -175 -5 -182 M-9 -152 C-8 -165 -5 -175 -1 -183" fill="none" stroke="#fff" stroke-opacity=".16" stroke-width="2.2" stroke-linecap="round"/>')}
        ${wSh('M-43 -146.4 Q2 -153 47 -146.4 L46.2 -151.8 Q2 -159.6 -42.2 -151.8 Z', 0.09)}<ellipse cx="2" cy="-179.4" rx="9.6" ry="2.4" fill="#000" fill-opacity=".1"/>
        <path ${L('#c2433b', 4.1)} d="M-46.5 -149 Q2 -155 50.5 -149 Q52.6 -143 50.5 -137 Q2 -131 -46.5 -137 Q-48.6 -143 -46.5 -149 Z"/><path d="${ribs}" stroke="#000" stroke-opacity=".12" stroke-width="1.6" stroke-linecap="round"/>${wHi('M-45.4 -148.2 Q2 -154.2 49.4 -148.2', 0.2, 0.9)}${wSh('M-46.5 -137 Q2 -131 50.5 -137 L50.9 -139.4 Q2 -133.4 -46.9 -139.4 Z', 0.1)}
        <circle cx="2" cy="-187" r="8.6" ${L('#f4efe6', 4.4)}/>${wSh('M-6.08 -184.06 A8.6 8.6 0 0 0 10.08 -184.06 Q2 -179.1 -6.08 -184.06 Z', 0.1)}<path d="M-2.4 -191.6 l1.2 1.8 M3.6 -192.6 l-.4 2.2 M7 -189.4 l-1.8 1 M-4.4 -186.4 l1.8 .4 M4.6 -184.6 l-1 -1.6 M.4 -186.6 l1.4 .8" stroke="#000" stroke-opacity=".1" stroke-width=".9" stroke-linecap="round"/><circle cx="-1.6" cy="-190.6" r="2.4" fill="#fff" fill-opacity=".45"/>`;
      return [cap, cap];
    },
    strawhat: (L) => {   // a wide brim at the top of the fringe, a crown that holds the hair, a red band
      // 2026-11-11 (finer): the straw woven round the brim and up the crown (its rim and rings lit by the room now), the brim's front
      // edge in the light, the crown's shadow on the brim, a shine on the crown, the band lit with its edges in light and shade
      const k = sk(L, '#b9954f', 4.2);
      const h = `<ellipse cx="2" cy="-150" rx="60" ry="12.5" ${L('#e3c27a', 4.2)}/><ellipse cx="2" cy="-150" rx="60" ry="12.5" fill="none" ${k} stroke-width="1.2"/><ellipse cx="2" cy="-150" rx="55" ry="10.9" fill="none" ${k} stroke-opacity=".22" stroke-width=".8"/><ellipse cx="2" cy="-150" rx="49" ry="9" fill="none" ${k} stroke-opacity=".35" stroke-width="1"/><ellipse cx="2" cy="-150" rx="42" ry="7.4" fill="none" ${k} stroke-opacity=".22" stroke-width=".8"/>${wHi('M-48 -144.6 Q2 -132.8 52 -144.6', 0.25, 1)}${wSh('M-34 -153.4 Q2 -141 38 -153.4 Z', 0.12)}
        <path ${L('#d8b366', 4.3)} d="M-31 -153.4 C-33 -190 37 -190 35 -153.4 Q2 -146.4 -31 -153.4 Z"/><path d="M-28.6 -164 Q2 -158 32.6 -164 M-23.4 -172 Q2 -167 27.4 -172 M-12 -178 Q2 -175.4 16 -178" fill="none" ${k} stroke-opacity=".4" stroke-width=".9"/>${wHi('M-22 -168 Q-14 -178 -2 -179.6', 0.3, 1.6)}<path d="M-31 -160 Q2 -153 35 -160 V-153.4 Q2 -146.4 -31 -153.4 Z" ${L('#d0453c', 4.3)}/>${wSh('M-31 -153.4 Q2 -146.4 35 -153.4 L35 -155.2 Q2 -148.2 -31 -155.2 Z', 0.15)}${wHi('M-30.4 -159.2 Q2 -152.2 34.4 -159.2', 0.22, 0.8)}`;
      return [h, h];
    },
    catears: (L) => {   // 2026-11-11 (finer): the band lit by the room, with a line of light along it; a lit edge up each ear, tufts in the pink
      const e = (x, s) => `<path ${L('#3d3a44', 4.3)} d="M${x - 11 * s} -152 L${x - 2 * s} -176 L${x + 10 * s} -154 Z"/>${wHi(`M${x - 9.2 * s} -153.8 L${x - 2.6 * s} -171.6`, 0.2, 1.1)}`;
      const band = `<path d="M-30 -146 C-24 -168 28 -168 34 -146" fill="none" ${sk(L, '#3d3a44', 4.3)} stroke-width="4"/>${wHi('M-29 -147.4 C-23.4 -169 27.4 -169 33 -147.4', 0.18, 0.9)}`;
      return [band + e(-12, 1) + e(16, -1) + `<path d="M-17 -156 L-13 -169 L-8 -157 Z M21 -156 L17 -169 L12 -157 Z" fill="#f2a8b8"/>` + both('<path d="M-14.6 -158.6 l.6 -4.6 M-11.6 -158 l-.6 -3.6" stroke="#fff" stroke-opacity=".7" stroke-width=".8" stroke-linecap="round"/>'), band + e(-12, 1) + e(16, -1)]; },
    hachimaki: (L) => {   // 2026-11-11 (finer): the cloth's lower edge in shade and creased where it wraps round the head, the red disc lit; at the back a knot, its tails folded
      const band = `<path ${L('#f8f6f0', 4)} d="M-33 -142 Q2 -134 37 -142 V-132 Q2 -124 -33 -132 Z"/>${wSh('M-33 -132 Q2 -124 37 -132 L37 -134.2 Q2 -126.2 -33 -134.2 Z', 0.08)}<path d="M-31.4 -140.6 l2.8 3.6 M-31.4 -136.4 l2 2.4 M35.4 -140.6 l-2.8 3.6 M35.4 -136.4 l-2 2.4" stroke="#000" stroke-opacity=".12" stroke-width=".8" stroke-linecap="round"/>`;
      return [band + `<circle cx="18" cy="-134" r="4.4" ${L('#d0453c', 4.1)}/><text x="-12" y="-131.5" font-size="7.5" font-weight="700" fill="#d0453c" font-family="'Hiragino Mincho ProN', serif">必勝</text>`, band + `<path d="M2 -134 L-10 -112 L-2 -114 L4 -134 L14 -110 L20 -114 Z" ${L('#f2efe6', 3.8)}/><path d="M0 -130 L-6.6 -116 M6.4 -129 L14 -114.6" stroke="#000" stroke-opacity=".1" stroke-width=".8" stroke-linecap="round"/><ellipse cx="3" cy="-133.6" rx="4.6" ry="3.8" ${L('#f2efe6', 4.1)}/>${wSh('M-1.6 -133 Q3 -128 7.6 -133 Q3 -130.6 -1.6 -133 Z', 0.12)}`]; },
    beret: (L) => {   // perched on the crown, tipped down to the left, with a stalk
      // 2026-11-11 (finer): the felt rounds off into shade underneath, a second soft shine, the rim and the stalk lit (a shine on it)
      const k = sk(L, '#24304f', 4.3);
      const b = `<g transform="translate(-1 -167) rotate(-8)"><ellipse rx="40" ry="12.5" ${L('#2f3b63', 4.3)}/>${wSh('M-40 0 A40 12.5 0 0 0 40 0 Q0 9.4 -40 0 Z', 0.14)}<path d="M-35 5 Q0 15 35 5" fill="none" ${k} stroke-width="3" stroke-linecap="round"/><path d="M-19 -7 Q-3 -12 15 -9" fill="none" stroke="#fff" stroke-opacity=".14" stroke-width="2.4" stroke-linecap="round"/>${wHi('M-31 -3.4 Q-27 -6.4 -22 -7.8', 0.1, 1.6)}<path d="M0 -12.4 q-.6 -4.6 2.6 -6.6" fill="none" ${k} stroke-width="2.6" stroke-linecap="round"/>${wHi('M-.2 -13.6 q-.2 -2.6 1.4 -4', 0.2, 0.7)}</g>`;
      return [b, b];
    },
    gradcap: (L) => {   // a skull cap over the crown, the board on top, the tassel to the right
      // 2026-11-11 (finer): the board's far edges and the cap's lower edge catch the light, the button shines, the gold lit by the room;
      // the tassel bound at its top and in strands
      const c = `<path ${L('#26262e', 4.3)} d="M-42 -146 Q2 -136 46 -146 L42 -166 Q2 -173 -38 -166 Z"/>${wHi('M-39.4 -149.4 Q2 -140 43.4 -149.4', 0.08, 1)}<path ${L('#1d1d24', 4.4)} d="M-52 -175 L2 -160 L56 -175 V-172 L2 -157 L-52 -172 Z"/><path ${L('#33333d', 4.5)} d="M2 -190 L56 -175 L2 -160 L-52 -175 Z"/>${wHi('M-49.4 -175.2 L2 -189 L53.4 -175.2', 0.14, 0.9)}
        <circle cx="2" cy="-175" r="2.8" ${L('#e6c25a', 4.6)}/><circle cx="1.1" cy="-176" r=".9" fill="#fff" fill-opacity=".55"/><path d="M2 -175 L46 -170 V-150" fill="none" ${sk(L, '#e6c25a', 4.5)} stroke-width="1.8"/><path d="M43 -150 h6 l-1 9 h-4 Z" ${L('#e6c25a', 4.3)}/><path d="M43.3 -149.2 h5.4" stroke="#000" stroke-opacity=".2" stroke-width="1.4"/><path d="M44.8 -147.4 v6.2 M46 -147.4 v6.4 M47.2 -147.4 v6.2" stroke="#000" stroke-opacity=".16" stroke-width=".5"/>`;
      return [c, c];
    },
    // 2026-11-11 (finer): a faint sheen on the lenses, a second small glint low on each, the hinges
    glasses: () => [`<circle cx="-10.5" cy="-117" r="7.8" fill="#fff" fill-opacity=".08"/><circle cx="14.5" cy="-117" r="7.8" fill="#fff" fill-opacity=".08"/><g fill="none" stroke="#3a3328" stroke-width="2"><circle cx="-10.5" cy="-117" r="8.6"/><circle cx="14.5" cy="-117" r="8.6"/><path d="M-1.9 -118 Q2 -120.6 5.9 -118 M-19.1 -118.6 L-33 -121.6 M23.1 -118.6 L37 -121.6"/></g><path d="M-15 -121.4 l4 -3 M10 -121.4 l4 -3" stroke="#fff" stroke-opacity=".7" stroke-width="1.4"/><path d="M-6.2 -112.2 l1.6 -1.2 M18.8 -112.2 l1.6 -1.2" stroke="#fff" stroke-opacity=".45" stroke-width="1" stroke-linecap="round"/><circle cx="-19.4" cy="-118.7" r="1.3" fill="#3a3328"/><circle cx="23.4" cy="-118.7" r="1.3" fill="#3a3328"/>`, `<path d="M-33 -122 L-26 -120 M37 -122 L30 -120" stroke="#3a3328" stroke-width="2"/>`],
    // 2026-11-12 (the user: three to buy for the face): 太陽眼鏡 — dark lenses over the eyes where they are drawn (a turned head has the
    // far eye nearer, ex), a heavier bar along their tops, a pale reflection low in each and two glints; from behind the temples
    sunglasses: (L) => {
      const fr = '#202028', k = sk(L, fr, 2.5), [a, b] = ex, far = (EX[1] - b) * 1.6;
      const lens = (cx, o) => `M${q(cx - 9.4 * o)} -124.4 Q${cx} -126 ${q(cx + 10.6 * o)} -125.2 C${q(cx + 11.4 * o)} -118 ${q(cx + 10.4 * o)} -106.6 ${q(cx + o)} -106.2 C${q(cx - 6.4 * o)} -106 ${q(cx - 9.6 * o)} -110 ${q(cx - 9.4 * o)} -124.4 Z`;
      const one = (cx, o) => `<path ${L('#2c303c', 2.5)} d="${lens(cx, o)}"/><ellipse cx="${q(cx + 0.6 * o)}" cy="-110.4" rx="6.6" ry="2.6" fill="#9db4dc" fill-opacity=".2"/><path d="M${q(cx + 0.6)} -113.6 L${q(cx + 6.6)} -121.8" stroke="#fff" stroke-opacity=".5" stroke-width="2.2" stroke-linecap="round"/><path d="M${q(cx + 4.6)} -111.4 L${q(cx + 8)} -116" stroke="#fff" stroke-opacity=".3" stroke-width="1" stroke-linecap="round"/>
        <path d="${lens(cx, o)}" fill="none" ${k} stroke-width="1.3" stroke-linejoin="round"/><path d="M${q(cx - 9.4 * o)} -124.4 Q${cx} -126 ${q(cx + 10.6 * o)} -125.2" fill="none" ${k} stroke-width="2.6" stroke-linecap="round"/>`;
      return [`${one(a, -1)}${one(b, 1)}<path d="M${q(a + 9.4)} -122.6 Q${q((a + b) / 2)} -124.8 ${q(b - 9.4)} -122.6" fill="none" ${k} stroke-width="1.8"/><path d="M${q(a - 10.8)} -124 L-33 -121.6 M${q(b + 10.8)} -124 L${q(37 - far)} -121.6" fill="none" ${k} stroke-width="2"/><circle cx="${q(a - 10.6)}" cy="-124.2" r="1.3" ${L('#8a8f99', 2.5)}/><circle cx="${q(b + 10.6)}" cy="-124.2" r="1.3" ${L('#8a8f99', 2.5)}/>`,
        `<path d="M-33 -122 L-26 -120 M37 -122 L30 -120" fill="none" ${k} stroke-width="2"/>`];
    },
    // 2026-11-12 (the user: three to buy for the face): 狐狸面具, a festival fox mask worn tilted on the side of the head as children
    // wear it at a matsuri — white, red inside the ears, red flames over slanted eyes and on the brow, whisker marks, a black nose, a
    // shine on the near cheek and the far side in shade. Drawn over the hair and any hat (ON_HAIR); from behind, on the other side,
    // its plain back, and its red cord round the back of the head under the hat
    foxmask: (L) => {
      const R = '#d23f3f', M = 'M-13 -11 L-15.4 -27 L-5 -16.4 Q0 -18 5 -16.4 L15.4 -27 L13 -11 C17.6 -4 17 5.4 10.6 11.4 C6.4 15 3.6 20.6 0 21 C-3.6 20.6 -6.4 15 -10.6 11.4 C-17 5.4 -17.6 -4 -13 -11 Z';
      const at = 'translate(35 -151) rotate(22) scale(.88)', cord = (d) => `<path d="${d}" fill="none" ${sk(L, '#c0353a', 3.4)} stroke-width="1.1" stroke-linecap="round"/>`;
      const face = `<path ${L('#f8f4ec', 3.2)} d="${M}"/>${wSh('M13 -11 C17.6 -4 17 5.4 10.6 11.4 C6.4 15 3.6 20.6 0 21 C4.6 16.4 9.6 9.6 11.6 2 C12.8 -3 12.8 -7.6 13 -11 Z', 0.1)}${wSh('M-4.4 17 Q0 19.4 4.4 17 Q2.6 20.4 0 21 Q-2.6 20.4 -4.4 17 Z', 0.08)}
        <path ${L(R, 3.3)} d="M-12.2 -14.2 L-13.6 -23.4 L-6.6 -16.6 Q-9.6 -15.6 -12.2 -14.2 Z M12.2 -14.2 L13.6 -23.4 L6.6 -16.6 Q9.6 -15.6 12.2 -14.2 Z"/><path ${L(R, 3.3)} d="M0 -14.6 Q2.6 -10.6 0 -6.8 Q-2.6 -10.6 0 -14.6 Z"/><ellipse cx="-6.4" cy="-11" rx="1.7" ry="1" transform="rotate(-20 -6.4 -11)" ${L(R, 3.3)}/><ellipse cx="6.4" cy="-11" rx="1.7" ry="1" transform="rotate(20 6.4 -11)" ${L(R, 3.3)}/>
        <path d="M-2.6 -3.4 Q-7 -8.6 -13.2 -6.4 M2.6 -3.4 Q7 -8.6 13.2 -6.4" fill="none" ${sk(L, R, 3.3)} stroke-width="1.4" stroke-linecap="round"/><path fill="${INK}" d="M-10.6 -3.4 Q-6.8 -6.2 -2.6 -2.4 Q-7 -2.8 -10.6 -3.4 Z M10.6 -3.4 Q6.8 -6.2 2.6 -2.4 Q7 -2.8 10.6 -3.4 Z"/>
        <path d="M-6.4 4.4 L-12.6 2.6 M-6 7.4 L-11.6 7.4 M6.4 4.4 L12.6 2.6 M6 7.4 L11.6 7.4" fill="none" ${sk(L, R, 3.3)} stroke-width=".9" stroke-linecap="round"/><path d="M-2.8 13.4 Q0 15.2 2.8 13.4" fill="none" ${sk(L, R, 3.3)} stroke-width=".8" stroke-linecap="round"/><ellipse cx="0" cy="17.4" rx="2.4" ry="1.6" fill="${INK}"/><circle cx="-.7" cy="16.9" r=".5" fill="#fff" fill-opacity=".6"/>
        ${wHi('M-12.6 -4 Q-12.4 -9 -9.6 -12', 0.55, 1.4)}${wHi('M-1.2 3 Q-1 7.6 -.4 10.6', 0.35, 1)}`;
      const back = `<path ${L('#ece4d4', 3.2)} d="${M}"/>${wSh('M-10.6 -9 L-12 -20 L-5.4 -13.6 Q0 -15 5.4 -13.6 L12 -20 L10.6 -9 C14 -3 13.6 4.6 8.6 9.4 C5.4 12.6 2.8 16.4 0 17.6 C-2.8 16.4 -5.4 12.6 -8.6 9.4 C-13.6 4.6 -14 -3 -10.6 -9 Z', 0.09)}${wHi('M12.6 -4 Q12.4 -9 9.6 -12', 0.3, 1.2)}`;
      return [`<g transform="${at}">${face}</g>`, `<g transform="matrix(-1 0 0 1 4 0) ${at}">${back}</g>`, '', cord('M-22 -160 Q2 -137 34 -152')];   // [over the hair facing us, from behind; under the hat facing us, from behind]
    },
    // the town's work (test, 2026-11-10): w is all that is worn, for a colour or a mark (w.cap, w.apron, w.mark, w.tie)
    nejiri: () => { const b = `<path class="nejiri" fill="#f6f3ec" d="M-34 -142 Q2 -134 38 -142 V-134.6 Q2 -126.6 -34 -134.6 Z"/><path d="${[-28, -19, -10, -1, 8, 17, 26].map((x) => `M${x} -140.4 l4 6.4`).join(' ')}" stroke="#3f4660" stroke-width="2" stroke-linecap="round"/>`;
      return [b + '<ellipse cx="34" cy="-138" rx="5.4" ry="4.4" fill="#f6f3ec"/><path d="M33 -139 l4 3 M38 -136 l9 5 M38 -139 l10 -2" stroke="#3f4660" stroke-width="1.8" stroke-linecap="round"/>', b]; },   // ねじり鉢巻: twisted, knotted at the side
    sankakukin: () => { const s = '<path fill="#f8f6f0" d="M-36 -134 C-37 -166 -14 -182 2 -182 C18 -182 41 -166 40 -134 Q2 -146 -36 -134 Z"/><path d="M-30 -146 Q2 -156 34 -146" fill="none" stroke="#d9d2c2" stroke-width="1.2"/>';
      return [s, s + '<path fill="#f8f6f0" d="M-8 -140 L2 -112 L12 -140 Z"/><circle cx="2" cy="-136" r="4" fill="#efe9dc"/>']; },   // 三角巾 over the hair, knotted at the back
    chefcap: () => { const c = '<path fill="#fbfaf6" d="M-31 -146 C-33 -178 37 -178 35 -146 Q2 -138 -31 -146 Z"/><path d="M-31 -151 Q2 -143 35 -151" fill="none" stroke="#dcd6c8" stroke-width="1.4"/>'; return [c, c]; },   // 和帽子
    bakerhat: () => { const h = '<path fill="#fbfaf6" d="M-28 -146 V-164 Q2 -170 32 -164 V-146 Q2 -140 -28 -146 Z"/><ellipse cx="-12" cy="-182" rx="20" ry="17" fill="#fbfaf6"/><ellipse cx="16" cy="-182" rx="20" ry="17" fill="#fbfaf6"/><ellipse cx="2" cy="-194" rx="22" ry="17" fill="#fbfaf6"/><path d="M-28 -164 Q2 -170 32 -164" fill="none" stroke="#dcd6c8" stroke-width="1.4"/>'; return [h, h]; },   // パン屋のコック帽
    cap: (L, c, d, w = {}) => {   // a peaked cap (制帽 with a gold badge; the delivery man's plain): w.cap its colour
      const k = w.cap || '#2b3350', h = `<path ${L(k, 4.3)} d="M-34 -147 C-36 -180 40 -180 38 -147 Q2 -139 -34 -147 Z"/><path ${L(dk(k, 0.7), 4.32)} d="M-34 -151 Q2 -143 38 -151 V-145 Q2 -137 -34 -145 Z"/>`;
      return [h + `<path fill="#1c1c22" d="M-28 -145 Q2 -128 32 -145 Q2 -136 -28 -145 Z"/>${w.badge === false ? '' : '<circle cx="2" cy="-160" r="4.4" fill="#d9b04a"/><path d="M-2 -160 h8" stroke="#a8862e" stroke-width="1"/>'}`, h]; },
    mikoribbon: () => ['', '<rect x="-7" y="-106" width="18" height="11" rx="2" fill="#f8f6f0"/><path d="M-7 -102 h18 M-7 -99 h18" stroke="#c8323a" stroke-width="1"/>'],   // 丈長: the long hair tied low behind
    apron: (L, c, d, w = {}) => {   // 前掛け: w.apron its colour, w.mark a name on it
      const k = w.apron || '#2f3b5a', m = w.mark ? `<text x="2" y="-18" text-anchor="middle" font-size="${w.mark.length > 2 ? 6.4 : 8}" font-weight="700" fill="#fff" fill-opacity=".92" font-family="'Hiragino Mincho ProN', 'Noto Serif JP', serif">${esc(w.mark)}</text>` : '';
      return [`<path class="apron" ${L(k, 1.3)} d="M-17 -38 H21 L23 -8 Q2 -5 -19 -8 Z"/><path d="M-18 -38 H22" stroke="${dk(k, 0.7)}" stroke-width="2.2"/>${m}`, `<path d="M-18 -38 H22" stroke="${k}" stroke-width="2.2"/><path d="M2 -38 l-6 -3.4 v6.8 Z M2 -38 l6 -3.4 v6.8 Z" fill="${k}"/>`]; },
    // a necktie (w.tie its colour; 2026-11-12 sold to the hero too, deep blue): lit by the room, the knot a shade darker with a shine,
    // thin stripes across the blade, its far half in shade, the dimple under the knot. Under the chin: nothing of it shows from behind
    necktie: (L, c, d, w = {}) => {
      const k = w.tie || '#3f4660', n = ++uid, blade = 'M.5 -60 H3.5 L5.7 -47.6 L2 -43.4 L-1.7 -47.6 Z';
      return [`<defs><clipPath id="tie${n}"><path d="${blade}"/></clipPath></defs><path ${L(k, 1.5)} d="${blade}"/><g clip-path="url(#tie${n})"><path d="M-6 -50.6 L10 -61 M-6 -45.6 L10 -56 M-6 -40.6 L10 -51" fill="none" ${sk(L, lt(k, 0.5), 1.5)} stroke-width="1" stroke-opacity=".75"/>${wSh('M2 -60 H6 V-43 H2 Z', 0.14)}</g>
        ${wHi('M.9 -58.4 L-.6 -48.2', 0.22, 0.7)}<path ${L(dk(k, 0.86), 1.6)} d="M-.5 -64 H4.5 L3.7 -59.6 H.3 Z"/>${wSh('M2 -64 H4.5 L3.7 -59.6 H2 Z', 0.12)}<path d="M.3 -63.3 L.9 -60.6" stroke="#fff" stroke-opacity=".3" stroke-width=".6" stroke-linecap="round"/>${wSh('M1.4 -59.6 Q2 -57.2 2.6 -59.6 Z', 0.16)}`, ''];
    },
    camera: () => ['<path d="M-9 -66 L-7 -50 M13 -66 L11 -50" stroke="#2b2b33" stroke-width="1.2"/><rect x="-7" y="-52" width="18" height="12" rx="2" fill="#2b2b33"/><rect x="-5" y="-55" width="6" height="3" rx="1" fill="#2b2b33"/><circle cx="2" cy="-46" r="4" fill="#5a606e" stroke="#a6acb8" stroke-width="1"/>', ''],   // the reporter's
    towel: () => { const t = '<path fill="#f8f6f0" d="M-12 -68.4 Q2 -62 16 -68.4 L17 -63 Q2 -56.6 -13 -63 Z"/>'; return [t + '<path fill="#f8f6f0" d="M-12 -64 L-13 -45 H-6 L-5.4 -62 Z M16 -64 L17 -45 H10 L9.4 -62 Z"/><path d="M-13 -48 h7 M10 -48 h7" stroke="#5a8ac8" stroke-width="1.4"/>', t]; },   // 銭湯の常連: a towel round the neck
    lanyard: (L, c, d, w = {}) => [`<path d="M-6 -66 L2 -53 L10 -66" fill="none" stroke="${w.strap || '#3f7ac8'}" stroke-width="1.4"/><rect x="-3" y="-54" width="10" height="13" rx="1.4" fill="#fbfaf6" stroke="#8a8f99" stroke-width=".8"/><rect x="-1.2" y="-51.6" width="6.4" height="3" fill="${w.strap || '#3f7ac8'}"/>`, ''],   // a name card (ガイド, 看護師)
    // on the body (test, 2026-11-09: the Q版 body), in the body's units
    // 2026-11-11 (finer): the scarf knitted in ribs, its wrap shaded along the lower edge, each end folded where it comes out and
    // fringed (the back one too), all lit by the room; the bow tie lit, pleated, its knot with a shine; the backpack's straps lit, a zip
    // round its top with a pull, its pocket stitched round with a pull on its zip, its far side shaded and a shine
    scarf: (L) => {
      const f = sk(L, '#b93a33', 1.4), rib = (d) => `<path d="${d}" stroke="#000" stroke-opacity=".13" stroke-width=".7"/>`;
      const w = `<path ${L('#d0453c', 1.6)} d="M-12 -68 Q2 -61 16 -68 L16.4 -62 Q2 -55 -12.4 -62 Z"/>${wSh('M-12.4 -62 Q2 -55 16.4 -62 L16.3 -63.8 Q2 -56.8 -12.3 -63.8 Z', 0.1)}${rib('M-6 -65.2 V-60 M-1 -64.4 V-58.9 M5 -64.4 V-58.9 M10 -65.2 V-60')}`;
      return [w + `<path ${L('#b93a33', 1.4)} d="M7 -61 L13 -61.6 L14.6 -46 L8.6 -45 Z"/>${rib('M9 -60.8 L10.6 -45.4 M11 -61 L12.6 -45.8')}${wSh('M7 -61 L13 -61.6 L13.24 -59.3 L7.24 -58.7 Z', 0.16)}<path d="M9 -46 v3.4 M11.6 -46.4 v3.4 M14 -46.6 v3.4" ${f} stroke-width="1.2"/>`,
        w + `<path ${L('#b93a33', 1.4)} d="M-6 -61 L0 -61 L-1 -46 L-7 -46.6 Z"/>${rib('M-4 -61 L-5 -46.4 M-2 -61 L-3 -46.2')}${wSh('M-6 -61 L0 -61 L-.16 -58.6 L-6.16 -58.6 Z', 0.16)}<path d="M-6.2 -46.6 v3.4 M-4 -46.4 v3.4 M-1.8 -46.2 v3.4" ${f} stroke-width="1.2"/>`];
    },
    bowtie: (L) => [`<path d="M2 -61 L-5 -64.6 L-5 -57.4 Z M2 -61 L9 -64.6 L9 -57.4 Z" ${L('#c8453d', 1.7)}/><path d="M-4.4 -63.4 L-.4 -61.5 M-4.4 -58.6 L-.4 -60.5 M8.4 -63.4 L4.4 -61.5 M8.4 -58.6 L4.4 -60.5" stroke="#000" stroke-opacity=".2" stroke-width=".6" stroke-linecap="round"/><path d="M-4.6 -64.2 V-57.8 M8.6 -64.2 V-57.8" stroke="#000" stroke-opacity=".14" stroke-width=".8"/><circle cx="2" cy="-61" r="2" ${L('#a63831', 1.7)}/><circle cx="1.4" cy="-61.7" r=".7" fill="#fff" fill-opacity=".4"/>`, ''],
    // what goes on the back is drawn in four: [behind the body, on the back (under long hair), over the front, over the hair from
    // behind] — the straps over the top, under the arms (2026-11-12: drawn behind the top before, they never showed)
    backpack: (L) => { const s = sk(L, '#b8792a', 1.4);
      return [`<path ${L('#e6a23c', 1.3)} d="M-15 -62 Q-21 -52 -18 -36 H-13 V-62 Z"/>`,
        `<rect x="-12" y="-64" width="28" height="30" rx="7" ${L('#e6a23c', 1.3)}/>${wSh('M9 -64 Q16 -64 16 -57 V-41 Q16 -34 9 -34 Q13.4 -38 13.4 -49 Q13.4 -60 9 -64 Z', 0.1)}${wHi('M-9.4 -56 Q-9.2 -61.4 -4 -61.8', 0.3, 1.2)}<path d="M-10.2 -50 Q-10 -61.6 2 -61.8 Q14 -61.6 14.2 -50" fill="none" stroke="#000" stroke-opacity=".16" stroke-width=".8"/><rect x="13.4" y="-51.6" width="1.6" height="3.2" rx=".6" fill="#7a4e1c" fill-opacity=".8"/>
        <rect x="-7" y="-50" width="18" height="13" rx="3.6" ${L('#d48f2c', 1.1)}/>${stitch(L, '#f6d48e', 1.1, 'M-3.2 -48.6 H7.2 Q9.6 -48.6 9.6 -46.2 V-40.8 Q9.6 -38.4 7.2 -38.4 H-3.2 Q-5.6 -38.4 -5.6 -40.8 V-46.2 Q-5.6 -48.6 -3.2 -48.6 Z', 0.75)}<path d="M-5 -45 H9" ${s} stroke-width="1.2"/><rect x="8.4" y="-45.4" width="1.6" height="3.2" rx=".6" fill="#7a4e1c" fill-opacity=".8"/><path d="M-8 -64 Q2 -69 12 -64" fill="none" ${s} stroke-width="2.2"/>`,
        `<path d="M-6 -66 Q-9 -55 -8 -42 M10 -66 Q13 -55 12 -42" fill="none" ${s} stroke-width="2.6" stroke-linecap="round"/>`]; },
    // 2026-11-12 (the user: three to buy for the back): a red ランドセル — the flap over its back with rounded corners, stitched
    // round, a gold clasp at its foot, a little handle on top, rings at its sides, its far side in shade and a shine on the leather;
    // facing us its sides between the arms and the body, and the wide shoulder straps, stitched, a gold buckle on each
    randoseru: (L) => {
      const R = '#cf3d45', D = '#a52d35', s = sk(L, D, 1.4);
      const strap = (x0, x1, x2, o) => `<path d="M${x0} -66 Q${x1} -55 ${x2} -42.6" fill="none" ${sk(L, R, 1.4)} stroke-width="3.4" stroke-linecap="round"/>${stitch(L, '#f4b2ad', 1.4, `M${q(x0 + 0.9 * o)} -64.6 Q${q(x1 + 0.9 * o)} -55 ${q(x2 + 0.9 * o)} -44`, 0.6)}<rect x="${q(x2 - 1.4)}" y="-52" width="2.8" height="3.6" rx=".8" transform="rotate(${-6 * o} ${x2} -50)" ${L('#e6c25a', 1.45)}/>`;
      return [`<path ${L(D, 1.3)} d="M-13.4 -63.4 H-16 Q-18.4 -63.4 -18.6 -61 L-19.6 -39 Q-19.6 -36.6 -17.4 -36.6 H-13 Z M17.4 -63.4 H20 Q22.4 -63.4 22.6 -61 L23.6 -39 Q23.6 -36.6 21.4 -36.6 H17 Z"/>${wHi('M-17.2 -60 L-18 -42', 0.2, 0.9)}`,
        `<rect x="-13" y="-63.6" width="30" height="30.2" rx="3.8" ${L(D, 1.3)}/><path d="M-3 -65.4 Q2 -70.6 7 -65.4" fill="none" ${s} stroke-width="1.8" stroke-linecap="round"/><circle cx="-13.2" cy="-47" r="1.2" fill="none" ${sk(L, '#e6c25a', 1.3)} stroke-width=".8"/><circle cx="17.2" cy="-47" r="1.2" fill="none" ${sk(L, '#e6c25a', 1.3)} stroke-width=".8"/>
        <path ${L(R, 1.35)} d="M-12.4 -64.4 Q2 -66.8 16.4 -64.4 V-42 Q16.4 -35.4 9.8 -35.4 H-5.8 Q-12.4 -35.4 -12.4 -42 Z"/>${wSh('M12.6 -65 Q16.4 -64.8 16.4 -64.4 V-42 Q16.4 -35.4 9.8 -35.4 H7.4 Q13.6 -36.8 13.6 -44 V-60 Q13.6 -63.6 12.6 -65 Z', 0.12)}${wHi('M-9.8 -50 V-59.6 Q-9.8 -62.4 -6 -62.8', 0.32, 1.3)}
        ${stitch(L, '#f4b2ad', 1.35, 'M-11 -62.8 Q2 -65 15 -62.8 V-42 Q15 -36.8 9.8 -36.8 H-5.8 Q-11 -36.8 -11 -42 Z', 0.7)}<path ${L(D, 1.2)} d="M.4 -41.4 h3.2 v6.8 h-3.2 Z"/><rect x="-.8" y="-40.6" width="5.6" height="5" rx="1.3" ${L('#e6c25a', 1.2)}/>${wSh('M-.8 -37.2 H4.8 V-36.9 Q4.8 -35.6 3.5 -35.6 H.5 Q-.8 -35.6 -.8 -36.9 Z', 0.18)}<circle cx=".5" cy="-39.4" r=".6" fill="#fff" fill-opacity=".6"/><path d="M.6 -38.1 H3.4" stroke="#000" stroke-opacity=".25" stroke-width=".5"/>`,
        strap(-6, -9.2, -8.4, 1) + strap(10, 13.2, 12.4, -1)];
    },
    // 2026-11-12 (the user: three to buy for the back): 小翅膀, small white wings at the shoulder blades — soft coverts over long
    // feathers with round tips, the feathers parted by fine lines, a line of light along the top. Spread sideways under the big head
    // (it would hide them higher up): from behind on the back, facing us their tips out past the arms, in the shade of their underside
    wings: (L) => {
      const W1 = 'M0 -2 C-6 -8 -16 -10 -26 -9.6 C-33 -9.4 -39 -8 -42 -4.6 Q-43.6 1.4 -37.6 1 Q-37.4 7 -31 6.4 Q-30 12 -23.6 10.8 Q-21.6 15.6 -15.4 13.4 Q-12 16.4 -7 13.6 Q-2 12 -.6 6 Z';
      const one = (under) => `<g transform="translate(-1 -56) scale(.86)"><path ${L('#eef1f7', 1.5)} d="${W1}"/>${wLn(L, '#b7c2d8', 1.5, 'M-34.4 -2.4 L-37.2 .6 M-28 -1 L-30.6 5.8 M-20.6 .6 L-23.2 10.2 M-12.6 2.4 L-15 12.8 M-5 3 L-6.8 13', 0.9, 0.85)}
        <path ${L('#fbfbfd', 1.6)} d="M0 -2 C-6 -8 -16 -10 -26 -9.6 C-33 -9.4 -38.4 -7.6 -40.4 -4.8 Q-36 -1.4 -31 -3 Q-27.6 .8 -22.4 -.8 Q-19 2.6 -14 1 Q-10.4 4.2 -5.6 2.6 Q-2.6 4.4 -.4 4.6 Z"/>${wSh('M-40.4 -4.8 Q-36 -1.4 -31 -3 Q-27.6 .8 -22.4 -.8 Q-19 2.6 -14 1 Q-10.4 4.2 -5.6 2.6 Q-2.6 4.4 -.4 4.6 L-.5 6 Q-3 5.8 -5.8 4 Q-10.6 5.6 -14.2 2.4 Q-19.2 4 -22.6 .6 Q-27.8 2.2 -31.2 -1.6 Q-36.4 0 -40.4 -4.8 Z', 0.07)}
        ${wHi('M-3.6 -6.4 C-9.6 -9 -17.6 -10.2 -26 -9.8', 0.6, 1.1)}${under ? wSh(W1, 0.07) : ''}</g>`;
      return [both(one(true)), '', '', both(one(false))];   // from behind over the hair: they stand out from the back, long hair falls between them
    }
  };
  const day = (h) => `fill="${h}"`;
  const paint = (a) => (a.match(/fill[:=]"?([^";]+)/) || [])[1] || '#000';   // the colour a lit fill attribute paints
  let uid = 0;   // each drawing's own clip ids
  // the figure, both views: o.look, o.wear, o.L as above
  function svg(o = {}) {
    const lk = norm(o.look), L = o.L || day, wear = o.wear || {}, W = (slot, side) => { const id = wear[slot]; const f = id && WEAR[id]; return f ? f(L, lk.top, dk(lk.top, 0.84), wear)[side] || '' : ''; };
    const cat = lk.topStyle === 'cattop' && lk.bottomStyle === 'catpants' && (wear.head === 'cathood' || wear.head === 'cathead');   // the whole cat suit
    // the hair (test, 2026-11-09, after the user's pick of the flat Q版 look): flat colours lit as the room lights them, the back
    // hair darker, no outline; each part drawn with a thin stroke of its own colour, which softens the tips and joins
    const n = ++uid, hairOf = HAIRP.assemble(lk, HATS.has(wear.head)), hc = lk.hairColor, C = (h) => paint(L(h, 3));
    const flat = (h) => `style="fill:${C(h)};stroke:${C(h)};stroke-width:1.6px;stroke-linejoin:round"`;
    const hw = flat(hc), hs = `style="stroke:${C(dk(hc, 0.7))}"`, hair = (draw) => draw(hw, flat(dk(hc, 0.8)));
    const top = lk.top, topDk = dk(lk.top, 0.84), pants = lk.bottom, skin = lk.skin, tp = TOPS[lk.topStyle], bt = BOTTOMS[lk.bottomStyle], full = FULL[wear.head];
    const defs = `<defs><clipPath id="fc${n}" clipPathUnits="userSpaceOnUse"><path d="${FACE[lk.face]}"/></clipPath></defs>`;
    const pd = dk(pants, 0.78), leg = (cls, x, b) => `<g class="leg ${cls}">${bt.leg(L, pants, x, skin)}${bt.foot ? bt.foot(L, pants, x, pd) : (SHOES[lk.shoeStyle] || SHOES.sneaker)(L, lk.shoe, x, skin, b)}</g>`;
    const legs = (t, b) => `<g class="legs">${bt.hips ? bt.hips(L, pants) : ''}${leg('l', -7 + t * 0.2, b)}${leg('r', 11 - t * 0.4, b)}</g>${bt.over ? bt.over(L, pants, pd) : ''}`;   // a skirt hangs over both legs, not with them; b: from behind
    const atop = ON_HAIR.has(wear.face);   // the face's thing goes over the hair and the hat (the fox mask)
    const arms = (t) => arm(L, tp, top, topDk, skin, 'l', -1, t * 0.3) + arm(L, tp, top, topDk, skin, 'r', 1, -t * 0.5);
    const fd = dk(top, 0.74), whole = full && full(L, top, fd), collar = tp.collar ? tp.collar(L, top, topDk) : '';   // a whole head: the hero's own, hair and face things give way
    const onHead = (s) => `<g class="head"><g transform="${HEAD}">${s}</g></g>`;   // the head's things in the head's units, set on the body
    // a little turned (test, 2026-11-09: 微微側身), to the viewer's right — the other way is it mirrored (.flip): the head's layers
    // slide apart (the face's things most, the fringe less, the back hair the other way, so more of it shows behind), the far eye
    // comes nearer, the body narrows a little and the far arm and leg tuck in. t: how far, in the head's units (0: straight on)
    const by = (x, s) => (x ? `<g transform="translate(${q(x)} 0)">${s}</g>` : s);
    const narrow = (t, s) => (t ? `<g transform="translate(${q(2 + t * 0.15)} 0) scale(.94 1) translate(-2 0)">${s}</g>` : s);
    const face = (t) => {
      ex = t ? [EX[0], EX[1] - t * 0.5] : EX;
      const s = by(t * 0.3, `<path ${L(skin, 2.4)} d="${FACE[lk.face]}"/><g clip-path="url(#fc${n})">${BEARD[lk.beard](L(lk.hairColor, 2.2))}</g>`)
        + by(t, `<g transform="${CHEEK}">${CHEEKS[lk.cheeks]}</g>${MOUTH[lk.mouth](['#a9714d', '#76492f'].includes(skin) ? '#3a1d14' : LIP)}<g class="eyes">${SHADES.has(wear.face) ? '' : EYES[lk.eyes](lk.eyeColor)}</g>${both(`<path d="${BROWS[lk.brows][0]}" fill="none" stroke="${dk(lk.hairColor, 0.8)}" stroke-width="${BROWS[lk.brows][1]}" stroke-linecap="round"/>`)}${W('face', atop ? 2 : 0)}`);
      ex = EX; return s;
    };
    const shade = (t) => by(t * 0.45, `<g opacity=".13" transform="translate(0 2.4)" clip-path="url(#fc${n})">${hairOf.front('fill="#3a2016"')}</g>`);   // the fringe's shadow on the forehead
    const front = (t) => `${onHead(whole ? '' : by(-t * 0.5, hair(hairOf.back)))}${bt.tail ? `<g class="tail t0">${bt.tail(L, pants, pd, 0)}</g>` : ''}${W('back', 0)}${legs(t)}${narrow(t, tp.front(L, top, topDk) + W('body', 0) + W('back', 2) + W('neck', 0))}${arms(t)}${narrow(t, collar)}
      ${onHead(whole ? by(t * 0.4, whole[0]) : `${face(t)}${shade(t)}${by(t * 0.3, hairOf.ear(L(skin, 2.4)))}${by(t * 0.45, hair(hairOf.front) + hairOf.over() + hairOf.deco(hs, hw) + W('head', 0) + (atop ? W('face', 0) : ''))}`)}`;   // the arms under the head: a raised hand never covers the face (the user), it goes out to the side
    // from behind, turned the same way: the hair slides left over the head, so a sliver of cheek shows on the right
    const back = (t) => `${legs(-t, true)}${arms(-t)}${narrow(-t, tp.back(L, top, topDk) + W('body', 1) + (tp.over ? tp.over(L, top, topDk) : ''))}${bt.tail ? `<g class="tail t1">${bt.tail(L, pants, pd, 1)}</g>` : ''}${narrow(-t, W('neck', 1) + W('back', 1))}
      ${onHead(whole ? by(-t * 0.4, whole[1]) : `<ellipse cx="2" cy="-128" rx="34" ry="32" ${L(skin, 2.4)}/>${by(-t * 0.6, hair(hairOf.rear) + hairOf.rearOver(hs, L(skin, 2.4)) + W('face', atop ? 3 : 1) + W('head', 1) + (atop ? W('face', 1) : ''))}`)}${narrow(-t, W('back', 3))}`;
    const T = 6;   // the turn
    const views = o.back ? `<g class="f-back" style="display:inline">${back(0)}</g>` : o.front ? `<g class="f-front">${front(0)}</g>`
      : `<g class="f-front">${front(0)}</g><g class="f-front3">${front(T)}</g><g class="f-back">${back(0)}</g><g class="f-back3">${back(T)}</g>`;
    return `<svg viewBox="${o.box || '-60 -200 120 210'}"${o.box ? ' style="overflow:hidden"' : ''}${cat ? ' data-set="cat"' : ''} aria-hidden="true">${defs}<ellipse class="h-shadow" rx="24" ry="7" fill="#2b1c12" fill-opacity=".2"/><g class="fig"><g class="bob">${views}</g></g></svg>`;   // front: the front view only; back: from behind only
  }
  // the head alone, in daylight, for the choices in the dressing room: 'head' frames the hair, 'face' the eyes, brows and mouth
  // a choice drawn on them: the face, the head, the head and shoulders (sides that reach them), from behind (the back, 造型). The
  // frames are the head's (in its units), set where the head now sits on the body
  const onBody = (b) => { const [x, y, w, h] = b.split(' ').map(Number); return [HX(x), HY(y), q(w * HS), q(h * HS)].join(' '); };
  const head = (look, crop) => (crop === 'back' ? svg({ look, back: true, box: onBody('-62 -200 128 132') }) : svg({ look, front: true, box: onBody(crop === 'face' ? '-27 -138 58 52' : crop === 'bust' ? '-62 -200 128 132' : '-58 -198 120 120') }));
  const isTop = (id) => TOPS[id] !== undefined;
  const clothes = (id, look) => (SHOES[id] ? svg({ look: Object.assign({}, look, { shoeStyle: id, bottomStyle: 'shorts' }), front: true, box: '-17 -23 38 27' })   // a shoe on bare legs (tall enough for the rain boots and the bunny's ears)
    : svg({ look: Object.assign({}, look, isTop(id) ? { topStyle: id } : { bottomStyle: id }), front: true, box: isTop(id) ? '-34 -76 72 56' : '-30 -40 64 44' }));
  // a thing worn, on its own (古道具屋, the wardrobe): drawn on a faint head and shoulders so it reads (what goes on the body, on a
  // faint body; what goes on the back from behind, with its straps or nothing else); a whole head on its own
  function thumb(id, look) {
    if (FULL[id]) { const lk = norm(look); return `<svg class="thumb" viewBox="-46 -186 96 100" aria-hidden="true">${FULL[id](day, lk.top, dk(lk.top, 0.74))[0]}</svg>`; }
    const f = WEAR[id]; if (!f) return '';
    const lk = norm(look), art = f(day, lk.top, dk(lk.top, 0.84));
    const box = (b) => `viewBox="${THUMB_BOX[id] || b}"${THUMB_BOX[id] ? ' style="overflow:hidden"' : ''}`;
    if (ON_BODY.has(id)) return `<svg class="thumb" ${box('-34 -84 72 60')} aria-hidden="true"><g class="base" opacity=".28"><path d="${TORSO}" fill="#c9bfae"/><ellipse cx="2" cy="-82" rx="24" ry="14" fill="#c9bfae"/></g><g>${BACKS.has(id) ? art[1] || art[3] : art[0]}</g></svg>`;
    const hat = HATS.has(id), t = Math.min(-203, (HEAD_TOP[id] || -196) - 7);   // a hat is drawn round a crown of hair: a bigger frame (taller for a tall hat), the faint head with its hair
    return `<svg class="thumb" ${box(hat ? `-68 ${t} 136 ${-45 - t}` : '-60 -185 120 140')} aria-hidden="true"><g class="base" opacity=".28"><ellipse cx="2" cy="-128" rx="34" ry="32" fill="#c9bfae"/>${hat || ON_HAIR.has(id) ? '<path d="M-44 -128 C-45 -160 -20 -172 2 -172 C24 -172 49 -160 48 -128 Q2 -150 -44 -128 Z" fill="#a3957d"/>' : ''}<path d="M-24 -88 Q-25 -98 -12 -99 H16 Q29 -98 28 -88 L30 -50 H-26 Z" fill="#c9bfae"/></g><g>${art[0]}</g></svg>`;
  }
  // idling (1.2.0): standing still they now and then look round, stretch, wave (facing us), sway or bounce — one at a time,
  // 6–12 s apart (the first after 4), never the same twice running; sitting they nod over the notebook. ok(): may they now?
  const IDLES = { look: 1800, stretch: 1600, wave: 1500, sway: 2200, bounce: 900, maneki: 1800 }, IDLE_CLS = ['nod', ...Object.keys(IDLES)].map((k) => 'idle-' + k);
  const PEOPLE = ['look', 'stretch', 'wave', 'sway', 'bounce'], CATS = ['look', 'stretch', 'maneki', 'sway'];   // in the cat suit: a 招き猫's paw for a wave
  const inCat = (el) => !!el.querySelector('svg[data-set="cat"]');
  const calm = () => window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  function idle(el, ok, first) {
    if (!el) return;
    clearTimeout(el._idle);
    if (calm()) return;
    el._idle = setTimeout(() => {
      if (!el.isConnected) return;
      if (!ok()) { idle(el, ok); return; }
      if (el.classList.contains('sleep')) { idle(el, ok); return; }   // asleep: no fidgeting
      const sit = el.matches('.sit, .sofa, .kneel'), names = sit ? ['nod'] : (inCat(el) ? CATS : PEOPLE).filter((k) => k !== el._idleLast && !((k === 'wave' || k === 'maneki') && el.classList.contains('back')));
      const k = names[Math.floor(Math.random() * names.length)]; el._idleLast = k;
      el.classList.add('idle-' + k);
      setTimeout(() => { el.classList.remove('idle-' + k); idle(el, ok); }, sit ? 1600 : IDLES[k]);
    }, first ? 4000 : 6000 + Math.random() * 6000);
  }
  const still = (el) => { if (el) el.classList.remove(...IDLE_CLS); };   // off on a walk: whatever they were doing stops
  // a tap on them: a hop, a wave, a spin or a cheer, in turn at random (sitting: a wave)
  const TAPS = { hop: 520, wave: 1200, spin: 700, cheer: 900 };
  function react(el) {
    if (calm()) return;
    if (el.classList.contains('sleep')) return;   // asleep
    const names = el.matches('.sit, .sofa, .kneel') ? ['wave'] : Object.keys(TAPS).filter((k) => k !== el._tapLast && !(k === 'wave' && el.classList.contains('back')));
    const k = names[Math.floor(Math.random() * names.length)]; el._tapLast = k;
    el.classList.remove(...Object.keys(TAPS)); still(el); void el.offsetWidth; el.classList.add(k);
    clearTimeout(el._tap); el._tap = setTimeout(() => el.classList.remove(k), TAPS[k]);
    if (k === 'spin') turnRound(el);
    if (inCat(el)) nya(el);
  }
  // spin (test, 2026-11-09): a turn right round through the views, a frame each — facing us, turned, from behind turned, from behind,
  // the other way back round — then as they were, unless they were sent walking meanwhile (their view is then the walk's)
  const ROUND = [[0, 1, 0], [1, 1, 0], [1, 0, 0], [1, 1, 1], [0, 1, 1]];   // back, turn, flip
  function turnRound(el) {
    const was = ['back', 'turn', 'flip'].map((c) => el.classList.contains(c)), set = (v) => ['back', 'turn', 'flip'].forEach((c, i) => el.classList.toggle(c, !!v[i]));
    let i = 0;
    clearInterval(el._round);
    el._round = setInterval(() => {
      const now = ['back', 'turn', 'flip'].map((c) => el.classList.contains(c)), last = i ? ROUND[i - 1].map(Boolean) : was;
      if (now.some((v, j) => v !== last[j])) { clearInterval(el._round); return; }   // something else turned them
      if (i === ROUND.length) { set(was); clearInterval(el._round); return; }
      set(ROUND[i++]);
    }, 115);
  }
  // the cat suit answers a tap with a にゃ over their head, a different one each time
  const NYA = ['にゃ', 'にゃーん', 'にゃ？', 'にゃっ'];
  function nya(el) {
    el.querySelectorAll('.nya').forEach((b) => b.remove());
    const b = document.createElement('i'); b.className = 'nya'; b.lang = 'ja';
    el._nya = ((el._nya || 0) + 1) % NYA.length; b.textContent = NYA[el._nya];
    el.appendChild(b); setTimeout(() => b.remove(), 1400);
  }
  return { svg, head, thumb, clothes, idle, still, react, norm, OPTS, LOOK0, STYLES: HAIRP.STYLES, slots: Object.keys(WEAR).concat(Object.keys(FULL)),
    tucked: (look, id) => tucked(norm(look), id), whole: (id) => !!FULL[id], headTop: (id) => HY(!id ? -184 : HEAD_TOP[id] || -196) };   // in the body's units
})();
