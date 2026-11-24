'use strict';
// ---------- 観光案内所 (2026-11-24, 湯の花温泉の打工; docs/superpowers/specs/2026-11-23-onsen-work-design.md §5.1) ----------
// あかり's window at 湯の花駅前 (m7, 200 円), seen from inside the counter: the glass with an acrylic speaking board in it, racks of
// leaflets either side, a tourist outside with their patience; over the counter the board 「湯の花温泉 ごあんない」 — six places
// (えきまえ足湯, 日帰り温泉「湯の花の湯」, 湯畑, 射的, 旅館花月's 日帰り入浴, ゆかた屋), each with its hours, its price and its rules (dogs,
// children, a towel to buy, the light-up by night). Ten tourists a shift, one question each, heard first as everywhere: until when,
// from when, how much, a dog, a child, a towel, at night — answered off the board, whose details change shift by shift (its seed
// kept with the day's record: the same board after a break) while what the town itself shows never does (ruling 12). Three replies:
// the right one, the same with another of the board's values, and one in a form no native takes for a fair answer (ruling 11). At
// most one fun tourist a shift: マイク reading out of a phrasebook, ゆうた after ghosts, ミヨコ after her own future.
const ANNAI = (() => {
  const T = () => TOWN.ONSEN.annai;
  const SPOTS = ['ashiyu', 'yu', 'yubatake', 'shateki', 'kagetsu', 'yukata'];
  // what a board may say of each, shift by shift (the 足湯's towel, the baths' hours and prices, ゆかた屋's price and dogs, children at
  // 射的 and in 花月's bath) — and what is the town's own, the same on every board: the 足湯 free, open all night (one sits in it at any
  // hour) and open to dogs (2026-11-24, ruling 25: あかり's 「去年から、犬も…」 true on every board); the 湯畑 free, open all night and
  // lit up by night; 射的 300 円 a go (YUDORI.PRICE) and its hours, ゆかた屋's hours (TOWN.HOURS, the street's own: rulings 21, 26); a
  // public bath never takes dogs
  const VARY = {
    ashiyu: { towel: [null, 100, 150] },
    yu: { hours: [[10, 21], [10, 22], [9, 20], [11, 23], [6, 22]], price: [500, 600, 700, 800], towel: [null, 200, 250] },
    shateki: { kids: [true, false] },
    kagetsu: { hours: [[13, 20], [14, 21], [11, 15], [15, 22], [13, 19]], price: [800, 1000, 1200, 1500], towel: [null, 200], kids: [true, false] },
    yukata: { price: [1500, 2000, 2500, 3000], dog: [true, false] } };
  const FIXED = {
    ashiyu: { hours: [0, 24], price: 0, dog: true, kids: true, rent: false, night: false },
    yu: { dog: false, kids: true, rent: false, night: false },
    yubatake: { hours: [0, 24], price: 0, dog: true, kids: true, towel: null, rent: false, night: true },
    shateki: { price: 300, dog: false, towel: null, rent: false, night: false },
    kagetsu: { dog: false, rent: false, night: false },
    yukata: { kids: true, towel: null, rent: true, night: false } };
  const SHOP = { shateki: 'shateki', yukata: 'yukataya' };   // whose hours are the street's own (TOWN.HOURS)
  const hoursOfShop = (id) => ((TOWN.HOURS || {})[SHOP[id]] || [10, 20]).slice();
  const BATHS = ['yu', 'kagetsu', 'ashiyu'];   // where a towel may be sold, in the order a reply names another
  const { rng, pickR, shuffleR } = JOBS;   // a shift's own dice: the same seed, the same board and tourists
  const at = (b, id) => b.find((f) => f.id === id);
  // the board: [facility { id, name, hours: [h0, h1], price, dog, kids, towel: price|null, rent, night }]; a towel to buy somewhere
  // (when no bath sells one, 湯の花の湯 does), so 「どこで買えますか」 always has an answer
  function board(R) {
    const b = SPOTS.map((id) => { const f = Object.assign({ id, name: T().spots[id][0] }, FIXED[id], SHOP[id] ? { hours: hoursOfShop(id) } : {}); Object.entries(VARY[id] || {}).forEach(([k, vs]) => { f[k] = pickR(vs, R); }); return f; });
    if (!BATHS.some((id) => at(b, id).towel)) at(b, 'yu').towel = 200;
    return b;
  }
  // a price and a time as said: in kanji with their reading (a board's digits read, not matched: 2,500円 → 二千五百円 にせんごひゃくえん,
  // 21:00 → 夜九時 よる くじ — 午前 before noon, 午後 to 16, 夕方 17–18, 夜 from 19; 12 昼の十二時, 0 and 24 夜中の十二時: never 午後十二時)
  const KD = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
  const kanjiNum = (n) => { const th = Math.floor(n / 1000) % 10, h = Math.floor(n / 100) % 10, t = Math.floor(n / 10) % 10, o = n % 10;
    return (th ? (th > 1 ? KD[th] : '') + '千' : '') + (h ? (h > 1 ? KD[h] : '') + '百' : '') + (t ? (t > 1 ? KD[t] : '') + '十' : '') + KD[o]; };
  const priceMark = (n) => `{${kanjiNum(n)}円|${YEN.reading(n)}}`;
  const yenZh = (n) => `${yenStr(n)} 日圓`;
  const HK = ['十二', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十', '十一'], HR = ['じゅうに', 'いち', 'に', 'さん', 'よ', 'ご', 'ろく', 'しち', 'はち', 'く', 'じゅう', 'じゅういち'];
  const part = (h) => (h < 12 ? ['午前', 'ごぜん', '上午'] : h < 17 ? ['午後', 'ごご', '下午'] : h < 19 ? ['夕方', 'ゆうがた', '傍晚'] : ['夜', 'よる', '晚上']);
  const timeMark = (h) => (h % 24 === 0 ? '{夜中|よなか|半夜}の {十二時|じゅうにじ}' : h === 12 ? '{昼|ひる}の {十二時|じゅうにじ}' : (([p, r]) => `{${p}|${r}}{${HK[h % 12]}時|${HR[h % 12]}じ}`)(part(h)));
  const timeZh = (h) => (h % 24 === 0 ? '半夜 12 點' : h === 12 ? '中午 12 點' : `${part(h)[2]} ${h % 12} 點`);
  const fill = (tpl, o) => tpl.replace(/\{([TtPpXxYy])\}/g, (m, k) => (o[k] !== undefined ? o[k] : m));
  const said = (id) => T().spots[id][1], zhName = (id) => T().spots[id][2];
  // a reply as said: its right form, or (form) the one that is no answer — [Japanese, 中文 or why]
  const reply = (key, o = {}, form = false) => { const r = T().reply[key][form ? 1 : 0]; return [fill(r[0], o), fill(r[1], o)]; };
  const timeO = (h) => ({ T: timeMark(h), t: timeZh(h) }), priceO = (n) => ({ P: priceMark(n), p: yenZh(n) });
  // the board's other hours and prices, for the reply with a wrong fact: never the right one; first the one most easily taken for it
  // (the same place's other end of the day: until for from; then another place's)
  const hoursOf = (b) => b.filter((f) => f.hours[0] > 0 || f.hours[1] < 24).flatMap((f) => f.hours);
  const pricesOf = (b) => b.map((f) => f.price).concat(b.map((f) => f.towel)).filter((p) => p > 0);
  const other = (list, v, first, R) => { const c = [...new Set(list)].filter((x) => x !== v); return first !== undefined && first !== v && R() < 0.5 ? first : c.length ? pickR(c, R) : null; };
  // each question: its reply read off the board — { right, fact: the right reply with a wrong fact, form } ([ja, 中文 or why])
  const TIME = { yuTo: ['yu', 1, 'inTo'], yuFrom: ['yu', 0, 'inFrom'], kaTo: ['kagetsu', 1, 'inTo'], kaFrom: ['kagetsu', 0, 'inFrom'], ykTo: ['yukata', 1, 'rentTo'], shTo: ['shateki', 1, 'playTo'] };
  const PRICE = { priceYu: ['yu', 'inFor'], priceKa: ['kagetsu', 'inFor'], priceYk: ['yukata', 'rentFor'], priceSh: ['shateki', 'playFor'] };
  const YESNO = { dog: ['yukata', 'dog', 'dogYes', 'dogNo'], kidsKa: ['kagetsu', 'kids', 'kidYes', 'kidNo'], kidsSh: ['shateki', 'kids', 'playYes', 'playNo'], nightAshi: ['ashiyu', 'open', 'nightYes', 'nightNo'], lightup: ['yubatake', 'night', 'seeYes', 'seeNo'] };
  function answer(b, id, R) {
    const why = T().why;
    if (TIME[id]) { const [f, i, key] = TIME[id], h = at(b, f).hours[i], w = other(hoursOf(b), h, at(b, f).hours[1 - i], R);
      return { right: reply(key, timeO(h)), fact: [reply(key, timeO(w))[0], why.time], form: reply(key, timeO(h), true) }; }
    if (PRICE[id]) { const [f, key] = PRICE[id], p = at(b, f).price, w = other(pricesOf(b), p, undefined, R);
      return { right: reply(key, priceO(p)), fact: [reply(key, priceO(w))[0], why.price], form: reply(key, priceO(p), true) }; }
    if (YESNO[id]) { const [f, k, yes, no] = YESNO[id], v = k === 'open' ? at(b, f).hours[1] - at(b, f).hours[0] >= 24 : Boolean(at(b, f)[k]);
      const r = T().reply, right = v ? yes : no, wrong = v ? no : yes;
      return { right: reply(right), fact: [reply(wrong)[0], why.yes], form: r[right][1] ? reply(right, {}, true) : null }; }
    // a towel: bought there (at its price), or not — and where else, then
    const x = id === 'towelAshi' ? 'ashiyu' : 'yu', p = at(b, x).towel, sellers = BATHS.filter((s) => s !== x && at(b, s).towel), y = sellers[0];
    const where = { X: said(x), x: zhName(x), Y: y ? said(y) : '', y: y ? zhName(y) : '' };
    if (p) { const w = other(BATHS.map((s) => at(b, s).towel).filter(Boolean), p, undefined, R) || other(pricesOf(b), p, undefined, R);
      return { right: reply('buyYes', priceO(p)), fact: [reply('buyYes', priceO(w))[0], why.price], form: reply('buyYes', priceO(p), true) }; }
    return { right: reply('buyNo', where), fact: [reply('buyYes', priceO(at(b, y).towel))[0], why.where], form: reply('buyNo', where, true) };
  }
  // one tourist's question on board b: { id, kind, who, q: [ja, 中文], opts: [[ja, 中文 or why, right, how wrong: 'fact'|'form']] } —
  // its wording the latest the course has reached (a later one from its unit on)
  function ask(b, id, u = TOWNEV.reachedIdx(), R = Math.random) {
    const [who, kind, ja, zh, later] = T().ask[id], a = answer(b, id, R);
    const q = later && u >= TOWNEV.unitIdx(later[0]) ? [later[1], later[2]] : [ja, zh];
    const opts = [[...a.right, true, ''], [...a.fact, false, 'fact']].concat(a.form ? [[...a.form, false, 'form']] : []);
    return { id, kind, who, q, opts: shuffleR(opts, R) };
  }
  // a fun one (at most one a shift): マイク's phrasebook asks the yukata's price (its replies the board's); ゆうた's ghost and ミヨコ's
  // future have their own three, the playful right one among them
  const FUN = ['book', 'ghost', 'future'];
  function fun(b, kind, u, R) {
    const F = T().fun[kind];
    if (F.ask) return Object.assign(ask(b, F.ask, u, R), { who: F.who, q: F.q, fun: kind, after: F.after });
    const opts = [[...F.right, true, '']].concat(F.wrong.map((w, i) => [...w, false, i ? 'fact' : 'form']));
    return { id: kind, kind: 'mieru', who: F.who, q: F.q, opts: shuffleR(opts, R), fun: kind, after: F.after };
  }
  // no tourist twice running (2026-11-24, M-1): each next one the first of those left whose tourist is not the one before; none such
  // left, it goes in further back, between two not its own (a tourist asks two questions at most, so there is always such a place)
  function spread(ts) {
    const out = [ts[0]], left = ts.slice(1);
    while (left.length) {
      const i = left.findIndex((t) => t.who !== out[out.length - 1].who);
      if (i >= 0) { out.push(left.splice(i, 1)[0]); continue; }
      const t = left.shift(), j = out.findIndex((x, n) => n > 0 && x.who !== t.who && out[n - 1].who !== t.who);
      if (j > 0) out.splice(j, 0, t); else out.push(t);
    }
    return out;
  }
  // a shift: { seed, board, tasks } — the first tourist asks a time (the plainest: an hour read off the board), then every kind (three
  // times, three can, two rules, a ことができる, a 見られる), no question twice, no tourist twice running; now and then a fun one in
  // place of one of them after the first two — but マイク's yukata question in 愛's own place when the shift has hers (wherever that
  // falls, second or last too), so it is never asked twice (force: that one, or null for none — the tests')
  function make(u = TOWNEV.reachedIdx(), seed = 1 + Math.floor(Math.random() * 2147483646), force) {
    const R = rng(seed), b = board(R), A = T().ask, byKind = (k) => Object.keys(A).filter((id) => A[id][1] === k), used = new Set();
    const kinds = ['time', ...shuffleR(['time', 'time', 'can', 'can', 'can', 'rule', 'rule', 'dekiru', 'mieru'], R)];
    const tasks = spread(kinds.map((k) => { const free = byKind(k).filter((id) => !used.has(id)), id = free.length ? pickR(free, R) : pickR(Object.keys(A).filter((x) => !used.has(x)), R); used.add(id); return ask(b, id, u, R); }));
    const kind = force !== undefined ? force : R() < 0.5 ? pickR(FUN, R) : null;
    if (kind) { const n = 2 + Math.floor(R() * 7), own = T().fun[kind].ask ? tasks.findIndex((t) => t.id === T().fun[kind].ask) : -1; tasks[own > 0 ? own : n] = fun(b, kind, u, R); }
    return { seed, board: b, tasks };
  }
  // あかり's news of the dogs let into the 足湯 (ruling 25): on the job's first shift, then about one shift in four, as its seed says
  const tells = (seed) => rng((Number(seed) ^ 0x5bd1e995) >>> 0)() < 0.25;
  // every right reply a board can make (the generator's: each a clip in the hero's voice)
  function rights() {
    const out = new Set(), add = (key, o) => out.add(reply(key, o)[0]), hrs = (id, i) => VARY[id].hours.map((h) => h[i]);
    hrs('yu', 1).concat(hrs('kagetsu', 1)).forEach((h) => add('inTo', timeO(h))); hrs('yu', 0).concat(hrs('kagetsu', 0)).forEach((h) => add('inFrom', timeO(h)));
    add('rentTo', timeO(hoursOfShop('yukata')[1])); add('playTo', timeO(hoursOfShop('shateki')[1]));
    VARY.ashiyu.towel.concat(VARY.yu.towel).filter(Boolean).forEach((p) => add('buyYes', priceO(p)));
    ['ashiyu', 'yu'].forEach((x) => BATHS.filter((s) => s !== x).forEach((y) => add('buyNo', { X: said(x), Y: said(y) })));
    VARY.yu.price.concat(VARY.kagetsu.price).forEach((p) => add('inFor', priceO(p))); VARY.yukata.price.forEach((p) => add('rentFor', priceO(p))); add('playFor', priceO(FIXED.shateki.price));
    ['dogYes', 'dogNo', 'kidYes', 'kidNo', 'playYes', 'playNo', 'nightYes', 'seeYes'].forEach((k) => add(k, {}));
    ['ghost', 'future'].forEach((k) => out.add(T().fun[k].right[0]));
    return [...out];
  }
  // the tourists: each one asking (and the fun ones)
  const tourists = () => [...new Set(Object.values(T().ask).map((x) => x[0]).concat(FUN.map((k) => T().fun[k].who)))];
  return { make, ask, fun, rights, tourists, tells, priceMark, timeMark, timeZh, yenZh, SPOTS, VARY, FIXED, FUN };
})();

const ANNAI_RUN = (() => {
  const N = 10, SECS = 25, MISS = 0.15;   // a tourist's patience: 25 s from the end of their asking (the board takes reading), a miss costs some
  const MARK = /\{([^|}]+)\|([^|}]+)(?:\|[^}]+)?\}/g, ruby = (s) => esc(s).replace(MARK, '<ruby>$1<rt>$2</rt></ruby>');
  const S = () => TOWN.ONSEN.annai;
  let cur = null, runs = 0;   // the latest run's desk (JOBS.desk): its now() the tourist at the window, for the tests ({ k, task, phase, seed }); each run reads its own
  // the board's pictures (28 × 28) and its rules' marks
  const ICON = {
    ashiyu: '<rect x="2" y="15" width="24" height="10" rx="2.5" fill="#a8a296"/><rect x="4" y="17" width="20" height="5" rx="1.2" fill="#7cc4c0"/><path d="M9.6 18 v-5.6 q0 -1.6 1.6 -1.6 h.4 q1.2 0 1.2 1.2 V18 M15.2 18 v-5.6 q0 -1.6 1.6 -1.6 h.4 q1.2 0 1.2 1.2 V18" fill="#f3d1b5" stroke="#c98d64" stroke-width=".8"/><path d="M6 8 q-1.6 -2 0 -4 M14 7 q-1.6 -2 0 -4 M22 8 q-1.6 -2 0 -4" fill="none" stroke="#8fa8b2" stroke-width="1.6" stroke-linecap="round"/>',
    yu: '<path d="M5 16.5 q0 7.5 9 7.5 q9 0 9 -7.5" fill="none" stroke="#c8453a" stroke-width="2.6" stroke-linecap="round"/><path d="M9 15 q-2.2 -2.6 0 -5.2 q2.2 -2.6 0 -5.2 M14 15 q-2.2 -2.6 0 -5.2 q2.2 -2.6 0 -5.2 M19 15 q-2.2 -2.6 0 -5.2 q2.2 -2.6 0 -5.2" fill="none" stroke="#c8453a" stroke-width="2.2" stroke-linecap="round"/>',
    yubatake: '<rect x="2" y="19" width="24" height="6.5" rx="1.6" fill="#4fae9a"/><path d="M3 9.5 H25 M3 13.5 H25 M3 17.5 H25" stroke="#8a6a48" stroke-width="2.6"/><path d="M3 9.5 H25 M3 13.5 H25 M3 17.5 H25" stroke="#efe2a0" stroke-width=".9" stroke-dasharray="2 3"/><path d="M8 6.5 q-1.4 -1.6 0 -3.2 M15 6.5 q-1.4 -1.6 0 -3.2 M22 6.5 q-1.4 -1.6 0 -3.2" fill="none" stroke="#8fa8b2" stroke-width="1.5" stroke-linecap="round"/>',
    shateki: '<circle cx="14" cy="14" r="11.5" fill="#fff" stroke="#c8322a" stroke-width="2"/><circle cx="14" cy="14" r="7.4" fill="#c8322a"/><circle cx="14" cy="14" r="3.8" fill="#fff"/><circle cx="14" cy="14" r="1.6" fill="#c8322a"/>',
    kagetsu: '<path d="M1.5 10.5 L14 3 L26.5 10.5 Z" fill="#4a5262"/><rect x="4.5" y="10.5" width="19" height="14.5" fill="#efe6d4"/><rect x="6.5" y="11.5" width="15" height="9" fill="#26386a"/><path d="M11.5 11.5 v9 M16.5 11.5 v9" stroke="#efe6d4" stroke-width=".7"/><text x="14" y="18.6" text-anchor="middle" font-size="6.4" font-weight="700" fill="#fff" font-family="serif">花</text><rect x="12" y="21" width="4" height="4" fill="#6e5236"/>',
    yukata: '<path d="M9 4 L4.6 6 L1.8 13 L6 14.2 L8 10.4 V25 H20 V10.4 L22 14.2 L26.2 13 L23.4 6 L19 4 L14 12.4 Z" fill="#e58fa8"/><path d="M9 4 L14 12.4 L19 4" fill="none" stroke="#fff" stroke-width="1.4"/><rect x="8" y="15" width="12" height="3.2" fill="#3f4660"/><circle cx="11" cy="21.4" r="1.3" fill="#fff"/><circle cx="17" cy="22.4" r="1.3" fill="#fff"/>' };
  const DOG = '<svg viewBox="0 0 18 14" aria-hidden="true"><path d="M3 6.4 q0 -1.6 1.6 -1.6 h6.6 l1 -2.6 q.4 -.9 1.2 -.4 l.8 1.4 h1.6 q.9 0 .9 .9 v.6 q0 1.2 -1.2 1.2 h-1.1 v6.4 h-1.7 v-3 h-5.4 v3 h-1.7 v-4.4 q-1.4 -.3 -1.6 -1.5 l-1.6 -.6 q-.4 -.5 .2 -.6 z" fill="currentColor"/></svg>';
  const KID = '<svg viewBox="0 0 12 14" aria-hidden="true"><circle cx="6" cy="3" r="2.5" fill="currentColor"/><path d="M2.6 13.4 v-4.6 q0 -3 3.4 -3 q3.4 0 3.4 3 v4.6 h-2.2 v-3.2 h-2.4 v3.2 z" fill="currentColor"/></svg>';
  const MOON = '<svg viewBox="0 0 14 14" aria-hidden="true"><path d="M8.6 1.4 a5.8 5.8 0 1 0 3.9 9.8 a4.6 4.6 0 1 1 -3.9 -9.8 z" fill="#f2c94c"/></svg>';
  // a rack of leaflets beside the glass, three shelves
  const RACK = `<svg viewBox="0 0 24 96" preserveAspectRatio="none" aria-hidden="true"><rect width="24" height="96" fill="#8a6a46"/>${[4, 36, 68].map((y, s) => `<rect x="2" y="${y + 24}" width="20" height="3" fill="#5a3e2a"/>${[0, 1, 2].map((i) => `<rect x="${3 + i * 6.4}" y="${y + 3 + (i % 2) * 2}" width="5.4" height="${20 - (i % 2) * 2}" fill="${['#e6a23c', '#3f9a8c', '#d0574b', '#5a78c8', '#f2e8c8', '#8ab86e'][(i + s * 2) % 6]}"/>`).join('')}`).join('')}</svg>`;
  const hm = (h) => `${h}:00`;
  const rule = (cls, mark, ok, say) => `<span class="an-r an-${cls} ${ok ? 'an-ok' : 'an-ng'}" aria-label="${say}${ok ? '可以' : '不可以'}">${mark}<b>${ok ? '○' : '✕'}</b></span>`;
  // the board 「湯の花温泉 ごあんない」: six cards — a picture, the name (its reading over it, what it is under it — the 湯畑: its light-up by
  // night), the hours, the price, the rules (dogs, children; a towel at the three baths)
  function boardHtml(b) {
    const cards = b.map((f) => {
      const sp = S().spots[f.id], hours = f.hours[0] === 0 && f.hours[1] === 24 ? '24時間' : `${hm(f.hours[0])}〜${hm(f.hours[1])}`;
      const price = !f.price ? '無料' : f.id === 'shateki' ? `1回 ${yenStr(f.price)}円` : f.id === 'yukata' ? `1日 ${yenStr(f.price)}円` : `${yenStr(f.price)}円`;
      const towel = ['ashiyu', 'yu', 'kagetsu'].includes(f.id) ? `<span class="an-r an-towel${f.towel ? '' : ' an-ng'}">タオル<b>${f.towel ? `${yenStr(f.towel)}円` : '✕'}</b></span>` : '';
      const rules = rule('dog', DOG, f.dog, '狗') + rule('kid', KID, f.kids, '小孩') + towel;
      const sub = f.night ? `<small class="an-lit">${MOON}<span><ruby>夜<rt>よる</rt></ruby>は <span class="an-nb">ライトアップ</span></span></small>` : sp[3] ? `<small>${ruby(sp[3])}</small>` : '';   // the 湯畑's light-up by night, in the place of what it is (ライトアップ never broken: fix round 2)
      return `<div class="an-fac" data-f="${f.id}"><i class="an-ic"><svg viewBox="0 0 28 28" aria-hidden="true">${ICON[f.id]}</svg></i><p class="an-nm"><b>${ruby(sp[0])}</b>${sub}</p>
        <span class="an-hr">${hours}</span><span class="an-pr${f.price ? '' : ' an-free'}">${price}</span><span class="an-rules">${rules}</span></div>`; }).join('');
    return `<div class="an-board" lang="ja"><p class="an-btitle"><ruby>湯の花<rt>ゆのはな</rt></ruby><ruby>温泉<rt>おんせん</rt></ruby>　ごあんない</p><div class="an-cards">${cards}</div></div>`;
  }
  function run(ctx) {
    const mine = ++runs, s = S(), A = s.say, seed = Number(ctx.kept && ctx.kept.seed) || 1 + Math.floor(Math.random() * 2147483646);
    if (!(ctx.kept && ctx.kept.seed)) ctx.keep({ seed });   // the board kept with the day's record: the same after a break
    const shift = ANNAI.make(TOWNEV.reachedIdx(), seed), first = !Object.values(state.work.res).some((r) => r.place === 'annai' && r.yen !== undefined);
    // this run's own card (box, once drawn): a shift's goodbye still being said when the next one's card opens never touches that one; its
    // own desk (D: never another run's)
    let box = null, D = null; const el = (q) => (box && box.isConnected ? box.querySelector(q) : null), live = () => mine === runs && Boolean(el('.an-glass')) && ctx.on();
    // あかり and the hero share the line under the replies (whoever spoke last), as at 原田's window; a short phone (2026-11-24, fix round
    // 1): the card holds the board, the glass, the replies and the talk line — when a line lands below its fold the card scrolls itself just
    // far enough to show it, and is back at its top for each tourist (the board and the glass first): JOBS.talkLine (Task 7's fix round, M-10)
    const TL = JOBS.talkLine({ box: () => box, sel: '.an-talk', who: A.who, first }), { word, me, said, seeTalk } = TL;
    function bub(open, line) {
      const R = D.now(), b = el('.wk-cust .wk-bub'); if (!b || !R) return; const [ja, zh] = line || R.task.q;
      b.innerHTML = `<button type="button" class="wk-ear an-ear" aria-label="再聽一次">${icon('speaker')}</button>${open ? `<b lang="ja">${ruby(ja)}</b><span>${esc(zh)}</span>` : '<b class="bt-dots">……</b>'}`;
      b.classList.toggle('wk-open', Boolean(open));   // open: a pop-up goes under it, never over the question (N-4)
      if (open) seeTalk();   // the bubble grown: the talk line kept in sight
    }
    function opts(on) {
      const o = el('.an-opts'), R = D.now(); if (!o) return;
      o.innerHTML = on && R ? R.task.opts.map(([ja], i) => `<button type="button" class="btn an-opt" data-o="${i}" lang="ja"><span>${ruby(ja)}</span></button>`).join('') : '';
    }
    // the desk's flow (ruling 28: JOBS.desk): the tourist's question heard first, three replies — the right one said, their thanks (a fun
    // tourist their own word, in the bubble), now and then あかり's word; a wrong one: あかり says what kind of miss it is (the board misread,
    // or a form that answers nothing) with why under it, and it cannot be picked again; the question shown, the tourist still there to
    // read it, till they go
    D = cur = JOBS.desk({ job: 'annai', ctx, N, box: () => box, alive: '.an-glass', mine: () => mine === runs, tasks: shift.tasks,
      isRight: (t, i) => Boolean(t.opts[i] && t.opts[i][2]), secs: () => SECS, cost: MISS, hi: () => s.hi, fresh: () => ({ seed }),
      me, word, bub, opts, optSel: '.an-opt', earSel: '.an-ear', rightCls: 'an-right', once: true,
      draw: (t) => { TL.toTop(); el('.wk-cust').dataset.fun = t.fun || ''; },   // the card from its top: the board and the glass first
      miss: (t, i) => { const o = t.opts[i]; return [(o[3] === 'form' ? A.form : A.fact)[0], o[1]]; },
      served: async (t, R, lv) => {
        const after = t.after || s.thanks; if (t.after) bub(true, after); await said(speakAs(t.who, after[0]), 600); if (!lv()) return;
        el('.wk-cust').classList.add('bye'); if (!R.miss && Math.random() < 0.3) await said(word(A.ok[Math.floor(Math.random() * A.ok.length)], 'ok'));
      },
      end: A.end, all: A.all });
    CLASS.card('wk-annai', '觀光服務台', `<button type="button" class="cls-x" data-cls="x" aria-label="關閉">✕</button>
      <div class="wk-head"><b lang="ja"><ruby>観光<rt>かんこう</rt></ruby><ruby>案内所<rt>あんないじょ</rt></ruby></b><span class="wk-n">${Math.min(ctx.done + 1, N)}／${N}</span></div>
      ${boardHtml(shift.board)}
      <div class="an-glass"><i class="an-rack" aria-hidden="true">${RACK}</i><div class="an-pane"><div class="wk-cust"></div><i class="an-acryl" aria-hidden="true"></i></div><i class="an-rack" aria-hidden="true">${RACK}</i></div>
      <div class="an-opts"></div><div class="an-talk" data-who="drv"><span class="kr-face">${TOWNEV.face(A.who)}</span><p class="wk-say"></p><p class="wk-me"></p></div>`, (e) => D.click(e));
    box = document.querySelector('.cls.wk-annai');
    // a shift begun: あかり's word, and her news of the dogs let into the 足湯 (〜ようになる) on the job's first shift and about one in four
    // after it, as the seed says (ruling 25: the 足湯 takes dogs on every board); picked up again: on
    const dogs = first || ANNAI.tells(seed);
    if (ctx.done) { D.start(); return; }
    (async () => { await said(word(A.start), 600); if (!live()) return; if (dogs) { await said(word(A.dogs), 700); if (!live()) return; } D.start(); })();
  }
  function lines(add) {
    const s = S(), A = s.say, seen = new Set(), say = (who, l) => { if (l && !seen.has(who + '|' + l)) { seen.add(who + '|' + l); add(who, l); } };
    Object.values(s.ask).forEach(([who, , ja, , later]) => { say(who, ja); if (later) say(who, later[1]); });
    ANNAI.FUN.forEach((k) => { const F = s.fun[k]; say(F.who, F.q[0]); say(F.who, F.after[0]); });
    const X = TOWN.WORK.say.waiter.cust; ANNAI.tourists().forEach((id) => [s.thanks, X.again, X.hey, X.out, X.out0].forEach((l) => say(id, l[0])));   // their thanks; kept waiting (JOBS.patience)
    say('hero', s.hi[0]); ANNAI.rights().forEach((l) => say('hero', l));
    [A.start, A.dogs, A.fact, A.form, A.end, A.all, ...A.ok].forEach((l) => say(A.who, l[0]));
  }
  return { run, lines, now: () => (cur ? cur.now() : null), N, SECS };
})();
WORK.register('annai', { run: ANNAI_RUN.run, lines: ANNAI_RUN.lines });
