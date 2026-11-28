'use strict';
// ---------- タクシー (2026-11-20, 駅前の打工; docs/superpowers/specs/2026-11-20-ekimae-work-design.md §8) ----------
// 鈴木's taxi (m4): five rides a shift from the station, the hero beside him with the town's map on his knees. The first three
// passengers tell the way as they go (つぎの 角を 右に 曲がって ください／二つ目の 角を…／まっすぐ 行って ください／あの 〜の 前で 止めて
// ください); the last two only say where (〜まで お願いします) and the hero finds it on the map. Left and right go by the way the taxi
// faces — the point: going down the map, 右 is the map's left. At each crossing a ring of a few seconds; nothing chosen, 鈴木 goes
// straight on. A wrong turn: the passenger stops him (a miss), he stays and is told again; a long way round, they say so. At the
// end the fare read off the meter; a ride with no miss, now and then おつりは いいです (a tip). Scored by the ride (外場's way).
const TAXI = (() => {
  const T = () => TOWN.EKI.taxi, SAY = () => TOWN.WORK.say.taxi;
  const COLS = 3, ROWS = 4, D = [[0, -1], [1, 0], [0, 1], [-1, 0]], START = [1, 3];   // N E S W; the first crossing up from the station
  const on = (c, r) => c >= 0 && c < COLS && r >= 0 && r < ROWS;
  const turn = (h, ch) => (ch === 'left' ? (h + 3) % 4 : ch === 'right' ? (h + 1) % 4 : h);
  const step = ([c, r], h) => [c + D[h][0], r + D[h][1]];
  const can = (p, h, ch) => ch === 'stop' || on(...step(p, turn(h, ch)));
  // the shortest way from p facing h to q (no U-turns): the choice at each crossing on it, 'stop' at the last
  function route(p, h, q) {
    const key = (x) => x.join(), seen = new Set([key([...p, h])]), queue = [[p, h, []]];
    while (queue.length) {
      const [at, hd, path] = queue.shift();
      if (at[0] === q[0] && at[1] === q[1]) return path.concat(['stop']);
      for (const ch of ['straight', 'left', 'right']) { const nh = turn(hd, ch), nx = step(at, nh); if (!on(...nx) || seen.has(key([...nx, nh]))) continue; seen.add(key([...nx, nh])); queue.push([nx, nh, path.concat([ch])]); }
    }
    return null;
  }
  const spot = (id) => T().spots.find((x) => x[2] === id);
  const where = (id) => [spot(id)[0], spot(id)[1]];
  const SIDE = { right: ['{右|みぎ}', '右'], left: ['{左|ひだり}', '左'] };
  const fill = (l, o) => [l[0].replace('{X}', o.X || '').replace('{D}', o.D || '').replace('{E}', o.E || ''), l[1].replace('{x}', o.x || '').replace('{d}', o.d || '').replace('{e}', o.e || '')];
  const side = (ch) => ({ D: SIDE[ch][0], d: SIDE[ch][1], E: SIDE[ch === 'right' ? 'left' : 'right'][0], e: SIDE[ch === 'right' ? 'left' : 'right'][1] });
  const placeOf = (id) => ({ X: spot(id)[3], x: spot(id)[6] || spot(id)[3].replace(/\{([^|}]+)\|[^}]+\}/g, '$1') });   // x: its name in 中文
  // what the passenger says for the way, each before the crossing (at) it is for: a turn after a crossing straight on is 二つ目;
  // crossings straight on to the end, まっすぐ once (from m5, a single one: 曲がらないで); a stop, あの〜の前で; fix: the first turn
  // said wrong and put right (sophia: 右… あ、すみません、左です！)
  function instructions(path, to, o = {}) {
    const c = SAY().cust, out = []; let fixed = !o.fix;
    for (let i = 0; i < path.length;) {
      const ch = path[i];
      if (ch === 'stop') { out.push({ at: i, line: fill(c.stop, placeOf(to)) }); break; }
      if (ch === 'straight' && (path[i + 1] === 'left' || path[i + 1] === 'right')) { out.push({ at: i, line: fill(fixed ? c.second : c.fix2, side(path[i + 1])) }); fixed = true; i += 2; continue; }
      if (ch === 'straight') { let j = i; while (path[j] === 'straight') j++; out.push({ at: i, line: o.dont && j - i === 1 ? c.dont : c.straight }); i = j; continue; }
      out.push({ at: i, line: fill(fixed ? c.next : c.fix, side(ch)) }); fixed = true; i++;
    }
    return out;
  }
  const dont = () => TOWNEV.reachedIdx() >= TOWNEV.unitIdx('m5');   // 曲がらないで from m5
  // where a way ends and which way the taxi faces then
  const follow = (from, h0, path) => { let p = from.slice(), h = h0; path.forEach((ch) => { if (ch !== 'stop') { h = turn(h, ch); p = step(p, h); } }); return { end: p, h };};
  // a turn made facing down or left on the map (右 is not the map's right then): what the job is for
  const reversed = (from, h0, path) => { let h = h0; return path.some((ch) => { if (ch === 'stop') return false; const r = ch !== 'straight' && (h === 2 || h === 3); h = turn(h, ch); return r; }); };
  // a ride from a crossing (the first from the station, facing up the map; the next from where the last let off, facing on)
  function ride(to, guided, who, fix = false, from = START, h0 = 0) {
    const path = route(from, h0, where(to)), f = follow(from, h0, path);
    return { to, guided, who, fix, from: from.slice(), h0, end: f.end, h1: f.h, path, lines: guided ? instructions(path, to, { fix, dont: dont() }) : [], ask: fill(SAY().cust.to, placeOf(to)), urgent: who === 'misaki', best: path.length - 1 };
  }
  // a shift: five rides one after another, each from where the last ended (2026-11-21, the review: from the station every turn was
  // made facing up the map, so 右 was always the map's right) — three told the way (the first near; a 二つ目 put right by sophia;
  // 美咲 to the hospital in a hurry), two who only say where; tried till a told ride turns facing down or left
  function make() {
    const pick = (a) => a[Math.floor(Math.random() * a.length)], ids = T().spots.map((x) => x[2]), w = T().riders;
    for (let tries = 0; ; tries++) {
      const rides = [], at = () => (rides.length ? [rides[rides.length - 1].end, rides[rides.length - 1].h1] : [START, 0]);
      const from = () => at()[0], head = () => at()[1], away = (id) => where(id).join() !== from().join();
      const cands = (pred) => ids.filter((id) => id !== 'hospital' && away(id) && !rides.some((r) => r.to === id) && pred(route(from(), head(), where(id))));
      const r0 = pick(cands((p) => p.length === 2)); rides.push(ride(r0, true, w[0], false, from(), head()));
      const two = (p) => p.some((ch, i) => ch === 'straight' && (p[i + 1] === 'left' || p[i + 1] === 'right') && (i === 0 || p[i - 1] !== 'straight'));
      const r1s = cands((p) => two(p) && reversed(from(), head(), p)), r1 = pick(r1s.length ? r1s : cands(two).length ? cands(two) : cands(() => true));
      rides.push(ride(r1, true, w[1], true, from(), head()));
      rides.push(ride('hospital', true, w[2], false, from(), head()));
      [w[3], w[4]].forEach((who) => rides.push(ride(pick(cands(() => true)), false, who, false, from(), head())));
      if (rides.slice(0, 3).some((r) => reversed(r.from, r.h0, r.path)) || tries >= 40) return rides;
    }
  }
  return { COLS, ROWS, START, on, turn, step, can, route, instructions, ride, make, spot, where, reversed, tips: true };
})();

// ---- the card: the passenger and their words (heard), the meter; the map with the taxi on it; 左 / まっすぐ / 右 / 止めて ----
const TAXI_RUN = (() => {
  const MARK = /\{([^|}]+)\|([^|}]+)(?:\|[^}]+)?\}/g, ruby = (s) => esc(s).replace(MARK, '<ruby>$1<rt>$2</rt></ruby>');
  const xy = (c, r) => [50 + c * 140, 45 + r * 120], STATION = [190, 490];
  let R = null, runs = 0;   // the ride now (the tests): { k, ride, phase, at, h, i, want, choosing, fare }
  const S = () => TOWN.WORK.say.taxi;
  // the map: blocks with their roofs, the roads (a dashed middle, crossings striped), each place on its corner (its picture and
  // name, the reading over it), the station at the foot; the taxi drawn on top (tx-car). On a phone (2026-11-26, test.4: the names
  // 9.9 px on a 390×664 screen, 7.1 on an SE) each name on a label of its own (tx-narrow) instead, without the reading, made as
  // large as 12.5 px on the screen whatever size the map is drawn at (fitMap); a place's reading shown as it is tapped (readOut)
  function mapSvg() {
    const roads = [0, 1, 2, 3].map((r) => `<rect x="10" y="${35 + r * 120}" width="360" height="20" class="tx-road"/>`).join('') + [0, 1, 2].map((c) => `<rect x="${40 + c * 140}" y="10" width="20" height="${c === 1 ? 490 : 415}" class="tx-road"/>`).join('');
    const dashes = [0, 1, 2, 3].map((r) => `<path d="M10 ${45 + r * 120} H370" class="tx-dash"/>`).join('') + [0, 1, 2].map((c) => `<path d="M${50 + c * 140} 10 V${c === 1 ? 500 : 425}" class="tx-dash"/>`).join('');
    const zebra = [];
    for (let c = 0; c < 3; c++) for (let r = 0; r < 4; r++) { const [x, y] = xy(c, r); zebra.push(`<path d="M${x - 9} ${y - 13} h18 M${x - 9} ${y + 13} h18 M${x - 13} ${y - 9} v18 M${x + 13} ${y - 9} v18" class="tx-zebra"/>`); }
    let blocks = '';
    for (let c = 0; c < 4; c++) for (let r = 0; r < 5; r++) {
      const x0 = c ? 60 + (c - 1) * 140 : 0, x1 = c < 3 ? 40 + c * 140 : 380, y0 = r ? 55 + (r - 1) * 120 : 0, y1 = r < 4 ? 35 + r * 120 : 510; if (x1 - x0 < 10 || y1 - y0 < 10) continue;
      blocks += `<rect x="${x0 + 3}" y="${y0 + 3}" width="${x1 - x0 - 6}" height="${y1 - y0 - 6}" rx="4" class="tx-block"/>`;
      if (x1 - x0 > 50 && y1 - y0 > 50) [[0.5, 0.5]].forEach(([u, v], i) => { const bx = x0 + (x1 - x0) * u, by = y0 + (y1 - y0) * v; blocks += `<rect x="${(bx - 9).toFixed(1)}" y="${(by - 7).toFixed(1)}" width="18" height="14" rx="2" fill="${['#c9b8a0', '#b8c4cc', '#d4c0b0', '#c0ccb4'][(c + r + i) % 4]}"/><path d="M${(bx - 9).toFixed(1)} ${(by - 2).toFixed(1)} h18" stroke="#2b1c12" stroke-opacity=".12"/>`; });
      else if (x1 - x0 > 20 && y1 - y0 > 20) blocks += `<circle cx="${((x0 + x1) / 2).toFixed(1)}" cy="${((y0 + y1) / 2).toFixed(1)}" r="5" fill="#7aa86a"/>`;
    }
    const OFF = { ne: [1, -1], nw: [-1, -1], se: [1, 1], sw: [-1, 1] };
    const places = TOWN.EKI.taxi.spots.map(([c, r, id, w, pic, corner]) => { const [x, y] = xy(c, r), [dx, dy] = OFF[corner], px = x + dx * 42, py = y + dy * (dy < 0 ? 52 : 30), d = PICS[pic] || '';
      const kana = w.replace(MARK, '$2'), kanji = w.replace(MARK, '$1'), hasK = kana !== kanji, lw = Math.max(44, kanji.length * 13 + 10, kana.length * 7.4 + 8), nw = kanji.length * 13 + 10;
      return `<g class="tx-place" data-place="${id}"${hasK ? ` data-kana="${esc(kana)}"` : ''}><circle cx="${px}" cy="${py - 4}" r="17" fill="#fbf7ec" stroke="#8a7a6e" stroke-width="1.2"/><svg x="${px - 16}" y="${py - 20}" width="32" height="32" viewBox="0 0 100 100">${d}</svg>
        <g class="tx-wide"><rect x="${px - lw / 2}" y="${py + 13}" width="${lw}" height="${hasK ? 25 : 18}" rx="3" fill="#fffaf0" stroke="#d8c8a8" stroke-width=".8"/>${hasK ? `<text x="${px}" y="${py + 21}" text-anchor="middle" font-size="7.4" fill="#8a7a6e">${esc(kana)}</text>` : ''}<text x="${px}" y="${py + (hasK ? 34 : 27)}" text-anchor="middle" font-size="13" font-weight="700" fill="#2b2b33" lang="ja">${esc(kanji)}</text></g>
        <g class="tx-narrow" data-o="${px} ${py + 13}"><rect x="${px - nw / 2}" y="${py + 13}" width="${nw}" height="18" rx="3" fill="#fffaf0" stroke="#d8c8a8" stroke-width=".8"/><text x="${px}" y="${py + 27}" text-anchor="middle" font-size="13" font-weight="700" fill="#2b2b33" lang="ja">${esc(kanji)}</text></g></g>`; }).join('');
    const station = `<g class="tx-wide"><rect x="140" y="478" width="100" height="26" rx="3" fill="#2f4a6e"/><text x="190" y="496" text-anchor="middle" font-size="12" font-weight="700" fill="#fff">みなと駅</text></g>
      <g class="tx-narrow" data-o="190 504"><rect x="145" y="482" width="90" height="22" rx="3" fill="#2f4a6e"/><text x="190" y="498" text-anchor="middle" font-size="13" font-weight="700" fill="#fff">みなと駅</text></g>`;
    return `<svg class="tx-map" viewBox="0 0 380 510" aria-hidden="true"><rect width="380" height="510" rx="14" class="tx-ground"/>${blocks}${roads}${dashes}${zebra.join('')}${station}${places}
      <circle class="tx-ring" r="17" cx="-50" cy="-50"/><g class="tx-car" transform="translate(${STATION[0]} ${STATION[1]}) rotate(0)"><ellipse cx="0" cy="1" rx="8" ry="12" fill="#000" opacity=".18"/><rect x="-7" y="-11" width="14" height="22" rx="4" fill="#f3d24a" stroke="#b8961e" stroke-width=".8"/><rect x="-5.4" y="-6" width="10.8" height="5" rx="1.4" fill="#2f3a4a"/><rect x="-5" y="3" width="10" height="4" rx="1.2" fill="#2f3a4a"/><rect x="-3.4" y="-1" width="6.8" height="2.6" rx=".8" fill="#fbf7ec"/><circle cx="-4.4" cy="-10.6" r="1.4" fill="#fff6d8"/><circle cx="4.4" cy="-10.6" r="1.4" fill="#fff6d8"/><circle class="tx-blink l" cx="-6.6" cy="-8" r="1.6" fill="#ff9a2a"/><circle class="tx-blink r" cx="6.6" cy="-8" r="1.6" fill="#ff9a2a"/></g></svg>`;
  }
  function run(ctx) {
    const mine = ++runs, s = S(), rides = TAXI.make(), score = (WORK.today() || {}).score || {}, first = !Object.values(state.work.res).some((r) => r.place === 'taxi' && r.yen !== undefined);
    const T = (sec) => sec * 1000 * JOBS.pat.scale, el = (q) => document.querySelector('.wk-taxi ' + q), live = () => mine === runs && Boolean(el('.tx-map')) && ctx.on();
    let k = [0, 1, 2, 3, 4].find((i) => !(i in score)); if (k === undefined) k = 4;
    let tip = (ctx.kept && ctx.kept.tip) || 0, missed = 0, wait = null, chats = 0, cat = Math.random() < 0.25;   // cat: once a shift maybe, one runs across; tip: kept over a break
    // 鈴木 and the hero share one line under the map (whoever spoke last), so the card fits a phone's screen (2026-11-21, the user)
    const talk = (who) => { const t = el('.tx-talk'); if (t) t.dataset.who = who; };
    const word = ([ja, zh], cls = '') => { talk('drv'); const p = el('.wk-say'); if (p) { p.innerHTML = `<b lang="ja">${ruby(ja)}</b><span>${esc(zh)}</span>`; p.className = 'wk-say' + (cls ? ' ' + cls : ''); } return speakAs(s.who, ja); };
    const me = ([ja, zh]) => { talk('me'); const p = el('.wk-me'); if (p) p.innerHTML = `<b lang="ja">${ruby(ja)}</b>${first ? `<span>${esc(zh)}</span>` : ''}`; return speakAs('hero', ja); };
    const said = (p, min = 0, max = 5000) => JOBS.said(p, min, max);
    const meter = () => { const m = el('.tx-meter b'); if (m) m.textContent = yenStr(R.fare); };
    // what they said last (the way at this crossing, or where to): heard; shown once the ride is over or after two misses
    const told = () => (R.ride.guided ? (R.ride.lines.filter((x) => x.at <= R.i).pop() || { line: R.ride.ask }).line : R.ride.ask);
    const bubHtml = (open, [ja, zh], guided) => `<button type="button" class="wk-ear tx-ear" aria-label="再聽一次">${icon('speaker')}</button>${open ? `<b lang="ja">${ruby(ja)}</b><span>${esc(zh)}</span>` : '<b class="bt-dots">……</b>'}${!open && !guided ? '<span class="tx-tapnote">點地圖上的地名，看它的讀音</span>' : ''}`;   // one who only says where: on a phone, how to find a place's reading (shown there alone: readOut)
    function bub() {
      const b = el('.tx-bub'); if (!b) return; const open = R.phase === 'pay' || R.phase === 'done' || R.miss >= 2;
      b.innerHTML = bubHtml(open, R.phase === 'pay' ? s.cust.price : told(), R.ride.guided);
    }
    // held for each ride (2026-11-26, the final fix of test.4 — the user: 「新的打工回答會跑版，版面會因為回覆導致版面向上擠壓」 — as the
    // onsen's: JOBS.hold, TL.keep): the talk row as its tallest line (鈴木's words, the hero's turns and the fare at any meter); the top row
    // as tall as its bubble will be (the way told at each crossing, where to, the fare asked) — but never so tall that the map under it
    // gets too small for its names at 12.5 px (fitMap's 2.2 at most: MAP_MIN, a short phone's): there the bubble, opened, spills over the
    // map's top (.tx-top over it) — so the map and the buttons never move
    const TL = JOBS.talkLine({ box: () => document.querySelector('.cls.wk-taxi'), sel: '.tx-talk', who: s.who, first });
    const payLine = (fare) => S().pay.map((x, i) => (i ? x.replace('{p}', fare) : x.replace('{P}', YEN.priceMark(fare))));
    const talkLines = (g, last) => ({ drv: [s.wrong, s.on, s.ask, s.cat, ...s.chat].concat(['{右|みぎ}', '{左|ひだり}'].map((d, i) => [s.lean[0].replace('{D}', d), s.lean[1].replace('{d}', i ? '左' : '右')]), last ? [s.end, s.all] : []),
      me: Object.values(s.go).concat(Array.from({ length: 32 }, (_, n) => payLine(500 + 80 * (n - 1)))) });
    const MAP_MIN = 240;   // px: the map's height at which its names read at 12.5 (fitMap) with the stacked ones apart (図書館 over 郵便局: at 223 they touch by 0.7 px)
    const topCap = () => { const card = el('.cls-card'), top = el('.tx-top'), box = el('.tx-mapbox'); if (!card || !top || !box) return Infinity;
      const px = (e, ...ps) => { const cs = getComputedStyle(e); return ps.reduce((a, q) => a + (parseFloat(cs[q]) || 0), 0); }, max = parseFloat(getComputedStyle(card).maxHeight); if (!(max > 0)) return Infinity;
      const rest = [...card.children].filter((e) => e !== top && e !== box && getComputedStyle(e).position !== 'absolute').reduce((a, e) => a + e.offsetHeight + px(e, 'marginTop', 'marginBottom'), 0);
      return max - px(card, 'paddingTop', 'paddingBottom', 'borderTopWidth', 'borderBottomWidth') - rest - px(box, 'marginTop', 'marginBottom') - MAP_MIN - px(top, 'marginTop', 'marginBottom'); };
    const topHtml = (g, open, l) => `<span class="kr-face tx-face">${TOWNEV.face(g.who)}</span><p class="tx-bub">${bubHtml(open, l, g.guided)}</p>`;
    const holdRide = (g, last) => { TL.keep(() => talkLines(g, last));
      JOBS.hold(el('.tx-top'), [topHtml(g, false, g.ask)].concat([g.ask, ...(g.guided ? g.lines.map((x) => x.line) : []), s.cust.price].map((l) => topHtml(g, true, l))), topCap); };
    // a phone's map labels (tx-narrow) at 12.5 px on the screen, the map drawn at whatever size the card leaves it (scale k), never
    // smaller than drawn; again as the card's size changes. A label grown onto another place's dot slides sideways off it (2026-11-26,
    // test.4's fix round: 図書館's over 郵便局's on an SE), 2 units clear — the dots in the band it grows over: down from its spot, or up to it
    // (the station's, at the map's foot: test.5)
    function fitMap() {
      const svg = el('.tx-map'); if (!svg) return; const r = svg.getBoundingClientRect(), k = Math.min(r.width / 380, r.height / 510); if (!(k > 0)) return;
      const z = Math.min(2.2, Math.max(1, 12.5 / 13 / k));
      const dots = [...svg.querySelectorAll('.tx-place')].map((p) => { const c = p.querySelector('circle'); return [p, Number(c.getAttribute('cx')), Number(c.getAttribute('cy')), Number(c.getAttribute('r'))]; });
      svg.querySelectorAll('.tx-narrow').forEach((g) => {
        const [ox, oy] = g.dataset.o.split(' ').map(Number), rc = g.querySelector('rect'), hw = Number(rc.getAttribute('width')) * z / 2, ry = Number(rc.getAttribute('y')), own = g.closest('.tx-place');
        const y0 = oy + (ry - oy) * z, y1 = oy + (ry + Number(rc.getAttribute('height')) - oy) * z;   // its top and foot as grown round its spot
        let dx = 0;
        dots.forEach(([p, cx, cy, rad]) => { if (p === own || cy + rad < y0 || cy - rad > y1) return;
          if (cx >= ox) dx = Math.min(dx, cx - rad - 2 - (ox + hw)); else dx = Math.max(dx, cx + rad + 2 - (ox - hw)); });
        g.setAttribute('transform', `translate(${(ox + dx).toFixed(1)} ${oy}) scale(${z.toFixed(3)}) translate(${-ox} ${-oy})`);
      });
    }
    // a place tapped on a phone's map: its reading over it a moment (the phone's labels have none: 〜まで is heard, the place read here)
    let readT = 0;
    function readOut(place) {
      const box = el('.tx-mapbox'), dot = place.querySelector('circle'); if (!box || !dot || !place.dataset.kana) return;
      const b = box.getBoundingClientRect(), c = dot.getBoundingClientRect(); let o = box.querySelector('.tx-read');
      if (!o) { o = document.createElement('i'); o.className = 'tx-read'; o.lang = 'ja'; box.appendChild(o); }
      o.textContent = place.dataset.kana; o.style.left = `${(c.left + c.width / 2 - b.left).toFixed(1)}px`; o.style.top = `${(c.top - b.top).toFixed(1)}px`;
      o.classList.remove('on'); void o.offsetWidth; o.classList.add('on'); clearTimeout(readT); readT = setTimeout(() => o.classList.remove('on'), 2600);
    }
    function ctl() {
      const c = el('.tx-ctl'); if (!c) return; const on = R.phase === 'drive' && R.choosing;
      c.innerHTML = ['left', 'straight', 'right', 'stop'].map((ch) => `<button type="button" class="btn tx-go${ch === 'stop' ? ' stop' : ''}${R.choice === ch ? ' picked' : ''}" data-ch="${ch}" lang="ja"${on && TAXI.can(R.at, R.h, ch) ? '' : ' disabled'}><span>${ruby(ch === 'left' ? '{左|ひだり}' : ch === 'right' ? '{右|みぎ}' : ch === 'stop' ? '{止|と}めて' : 'まっすぐ')}</span></button>`).join('');   // the label one piece in the flex button: a ruby an item of its own sat lower, a gap after it (2026-11-22)
    }
    // the taxi from where it is to (x, y), turned to h, over ms; its blinker while it turns
    function drive(to, h, ms) {
      const car = el('.tx-car'); if (!car) return Promise.resolve();
      const from = R.pos, rot0 = R.rot, rot1 = rot0 + (((h * 90 - rot0) % 360) + 540) % 360 - 180, t0 = performance.now();
      const blink = rot1 === rot0 ? '' : rot1 > rot0 ? 'r' : 'l'; car.classList.toggle('blink-l', blink === 'l'); car.classList.toggle('blink-r', blink === 'r');
      return new Promise((ok) => { const f = (now) => { if (!live()) { ok(); return; } const u = Math.min(1, (now - t0) / Math.max(1, ms)), e = u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2, ru = Math.min(1, u * 3);
        R.pos = [from[0] + (to[0] - from[0]) * e, from[1] + (to[1] - from[1]) * e]; R.rot = rot0 + (rot1 - rot0) * ru;
        car.setAttribute('transform', `translate(${R.pos[0].toFixed(1)} ${R.pos[1].toFixed(1)}) rotate(${R.rot.toFixed(1)})`);
        if (u > 0.35) { if (!R.choosing) { R.choosing = true; ctl(); } }
        if (u < 1) requestAnimationFrame(f); else { car.classList.remove('blink-l', 'blink-r'); ok(); } }; requestAnimationFrame(f); });
    }
    // the ring at a crossing: a few seconds to choose; nothing, straight on (a miss if a turn was wanted) — or asked again
    function ring(on) {
      const g = el('.tx-ring'); if (!g) return; const [x, y] = xy(...R.at); g.setAttribute('cx', on ? x : -50); g.setAttribute('cy', on ? y : -50); g.classList.toggle('on', on);
      g.style.animationDuration = `${T(R.ride.urgent ? 4 : 6)}ms`;
    }
    async function arrive() {   // at a crossing: its choice now, or waited for
      if (!live()) return; R.waiting = true;
      if (R.choice) { apply(R.choice); return; }
      ring(true); const r = R, my = wait = {}, at = R.i;
      // told 曲がらないで here: 鈴木 has his own idea (a turn, blinking), so letting it go is not right (2026-11-21, the review)
      const dontHere = R.ride.guided && (R.ride.lines.find((x) => x.at === R.i) || {}).line === s.cust.dont;
      if (dontHere && !R.lean && R.leaned !== R.i) { R.lean = ['left', 'right'].filter((ch) => TAXI.can(R.at, R.h, ch))[Math.floor(Math.random() * 2)] || 'right';
        Promise.resolve(R.saying).then(() => { if (live() && R === r && R.waiting && R.i === at) { const sd = R.lean === 'right' ? ['{右|みぎ}', '右'] : ['{左|ひだり}', '左']; word([s.lean[0].replace('{D}', sd[0]), s.lean[1].replace('{d}', sd[1])]); const c = el('.tx-car'); if (c) c.classList.add('blink-' + R.lean[0]); } }); }
      await sleep(T(R.ride.urgent ? 4 : 6)); if (!live() || R !== r || wait !== my || !R.waiting) return;
      if (R.choice) return;
      if (R.lean && R.i === at) { const l = R.lean; R.lean = null; R.leaned = at; apply(l); return; }   // nothing said: he turns as he guessed (once: told so, he goes straight on)
      if (TAXI.can(R.at, R.h, 'straight')) { word(s.on); apply('straight'); } else { word(s.ask); arrive(); }
    }
    // the way at the next crossing, said by the passenger (kept: R.saying, for whatever must wait for it)
    function sayWay() { const l = R.ride.lines.find((x) => x.at === R.i); if (l) R.saying = said(speakAs(R.ride.who, l.line[0]), 0, 5000); bub(); return R.saying; }
    function apply(ch) {
      wait = null; R.waiting = false; ring(false); R.choice = null; const car0 = el('.tx-car'); if (car0) car0.classList.remove('blink-l', 'blink-r');
      const g = R.ride;
      if (g.guided && ch !== R.want) {   // the wrong way: stopped, told again
        R.miss++; missed++; playSfx('bad'); R.fare += 80; meter(); bub(); ctl();
        said(speakAs(g.who, s.cust.wrong[0]), 400).then(() => live() && said(word(s.wrong), 300)).then(() => { if (!live()) return; const l = told(); R.saying = said(speakAs(g.who, l[0]), 0, 5000); arrive(); });
        return;
      }
      if (ch === 'stop') {
        if (R.at[0] !== TAXI.where(g.to)[0] || R.at[1] !== TAXI.where(g.to)[1]) { R.miss++; missed++; playSfx('bad'); bub(); said(speakAs(g.who, s.cust.here[0]), 300).then(() => { if (live()) { speakAs(g.who, told()[0]); arrive(); } }); return; }
        me(s.go.stop); pay(); return;
      }
      // the hero's word first, then the passenger's way at the next crossing (2026-11-21, the review: each cut the other); 鈴木's
      // talk and a cat only on a stretch with nothing to be told
      const r = R, mine0 = said(me(s.go[ch]), 300, 2500);
      R.h = TAXI.turn(R.h, ch); R.at = TAXI.step(R.at, R.h); R.i++; R.steps++; R.fare += 80; R.choosing = false; R.lean = null; ctl();
      if (g.guided) R.want = g.path[R.i];
      const far = !g.guided && !R.far && R.steps > g.best + 2; if (far) { R.far = true; R.miss++; missed++; }
      const told2 = g.guided && g.lines.some((x) => x.at === R.i);
      R.saying = mine0.then(() => { if (!live() || R !== r) return null; if (told2) return sayWay(); if (far) return said(speakAs(g.who, s.cust.far[0]), 0, 4000); return null; });
      const quiet = !told2 && !far;
      if (quiet && Math.random() < 0.18 && chats < 2) { chats++; R.saying.then(() => { if (live() && R === r) word(s.chat[Math.floor(Math.random() * s.chat.length)]); }); }
      const go = () => drive(xy(...R.at), R.h, T(1.6)).then(() => { meter(); arrive(); });
      if (cat && quiet && R.steps >= 2) { cat = false; mine0.then(() => { if (!live()) return; word(s.cat); SND.play('meow', { vol: 0.6 }); setTimeout(() => { if (live()) go(); }, T(1.4)); }); } else go();
    }
    // the fare: read off the meter (three to pick from); right, their thanks (and maybe おつりは いいです), the next ride
    function pay() {
      R.phase = 'pay'; R.choosing = false; ctl(); const f = R.fare, opts = shuffle([f, f + 80, f - 80]); R.payRight = opts.indexOf(f);
      el('.tx-pays').innerHTML = opts.map((v, i) => { const t = S().pay[0].replace('{P}', YEN.reading(v)); return `<button type="button" class="btn tx-pay" data-o="${i}" lang="ja" style="--tx-n: ${[...t].length}">${esc(t)}</button>`; }).join('');   // in kana: the meter's digits read, not matched; --tx-n its length (one line at any width: css .tx-pay)
      bub(); speakAs(R.ride.who, s.cust.price[0]);
    }
    async function paid() {
      const r = R; R.phase = 'done'; ctx.right(r.k, r.miss); el('.tx-pays').innerHTML = ''; playSfx('good'); bub();
      const more = !r.miss && TAXI.tips && Math.random() < 0.5 ? 10 * (1 + Math.floor(Math.random() * 3)) : 0; tip += more; if (more) ctx.keep({ tip });
      k++;
      // the card still up (the last ride: the shift already paid, so not ctx.on — 2026-11-22, the user: its results were left under
      // the card); shut: no more voices (paid all the same)
      const live2 = () => mine === runs && Boolean(el('.tx-map')) && (ctx.on() || k >= 5);
      const bye = (async () => {
        await said(me(payLine(r.fare)), 700); if (!live2()) return;
        if (more) { await said(speakAs(r.ride.who, s.cust.keep[0]), 600); playSfx('coin', 2); }
        await said(speakAs(r.ride.who, s.cust.thanks[0]), 600); if (!live2()) return;
        if (k < 5) { begin(); return; }
        await JOBS.whole(word(!missed && ctx.done === 0 ? s.all : s.end, 'ok'), 800); if (el('.tx-map')) CLASS.close();   // said whole before the card shuts (the lane's cap: 2026-11-25, parked from Task 7)
      })();
      if (k >= 5) ctx.finish({ tip, tipName: 'おつり' }, bye);
    }
    // a ride: the first gets in at the station (the taxi up to the first crossing); the next where the last got out, the taxi
    // facing on as it stopped
    async function begin() {
      const g = rides[k], station = k === 0, pos = station ? STATION.slice() : xy(...g.from), rot = station ? 0 : g.h0 * 90;
      R = { k, ride: g, phase: 'board', at: g.from.slice(), h: g.h0, i: 0, want: g.path[0], choosing: false, choice: null, fare: 500, steps: 0, miss: 0, far: false, pos, rot, lean: null, saying: null };
      const me0 = R; el('.wk-n').textContent = `${k + 1}／5`; el('.tx-face').innerHTML = TOWNEV.face(g.who); el('.tx-pays').innerHTML = ''; meter(); ctl(); holdRide(g, k >= 4);
      const car = el('.tx-car'); if (car) car.setAttribute('transform', `translate(${pos[0]} ${pos[1]}) rotate(${rot})`);
      bub(); SND.play('door-close', { vol: 0.5 });
      await said(speakAs(g.who, g.ask[0]), 400); if (!live() || R !== me0) return;
      if (g.urgent) await said(speakAs(g.who, s.cust.hurry[0]), 300); if (!live() || R !== me0) return;
      R.phase = 'drive'; if (g.guided) sayWay(); else bub();
      if (station) drive(xy(...R.at), 0, T(1.6)).then(() => arrive());
      else { R.choosing = true; ctl(); arrive(); }
    }
    CLASS.card('wk-taxi wk-col', '計程車導航', `<button type="button" class="cls-x" data-cls="x" aria-label="關閉">✕</button>
      <div class="wk-head tx-head"><b lang="ja"><ruby>鈴木<rt>すずき</rt></ruby>タクシー</b><span class="wk-n"></span><div class="tx-meter"><span lang="ja"><ruby>料金<rt>りょうきん</rt></ruby></span><b></b><i>円</i></div></div>
      <div class="tx-top"><span class="kr-face tx-face"></span><p class="tx-bub"></p></div>
      <div class="tx-mapbox">${mapSvg()}<div class="tx-pays"></div></div>
      <div class="tx-talk" data-who="drv"><span class="kr-face">${TOWNEV.face(s.who)}</span><p class="wk-say"></p><p class="wk-me"></p></div>
      <div class="tx-ctl"></div>`, (e) => {
      const pl = e.target.closest('.tx-place[data-kana]'); if (pl) { readOut(pl); return; }
      if (!R || !live()) return;
      if (e.target.closest('.tx-ear')) {   // heard again: the ring at a crossing waits for it (spec §2.3)
        if (R.phase === 'pay') { speakAs(R.ride.who, s.cust.price[0]); return; }
        const r = R, held = R.waiting; if (held) { wait = null; R.waiting = false; ring(false); }
        R.saying = said(speakAs(R.ride.who, told()[0]), 0, 5000); if (held) R.saying.then(() => { if (live() && R === r && R.phase === 'drive' && !R.waiting) arrive(); }); return;
      }
      const p = e.target.closest('.tx-pay'); if (p && R.phase === 'pay') { if (Number(p.dataset.o) === R.payRight) paid(); else { R.miss++; missed++; playSfx('bad'); p.classList.remove('wk-bad'); void p.offsetWidth; p.classList.add('wk-bad'); p.disabled = true; } return; }
      const b = e.target.closest('.tx-go'); if (!b || b.disabled || R.phase !== 'drive' || !R.choosing) return;
      SND.play('tick', { vol: 0.5 }); if (R.waiting) apply(b.dataset.ch); else { R.choice = b.dataset.ch; ctl(); }
    });
    fitMap(); const mb = el('.tx-mapbox'); if (mb && typeof ResizeObserver === 'function') new ResizeObserver(fitMap).observe(mb);
    begin();
  }
  function lines(add) {
    const s = S(), seen = new Set(), say = (who, l) => { if (!seen.has(who + l)) { seen.add(who + l); add(who, l); } }, c = s.cust;
    const sides = ['right', 'left'].map((ch) => ({ D: ch === 'right' ? '{右|みぎ}' : '{左|ひだり}', E: ch === 'right' ? '{左|ひだり}' : '{右|みぎ}' }));
    TOWN.EKI.taxi.riders.forEach((who) => {
      TOWN.EKI.taxi.spots.forEach((sp) => { say(who, c.to[0].replace('{X}', sp[3])); say(who, c.stop[0].replace('{X}', sp[3])); });
      sides.forEach((o) => [c.next, c.second, c.fix, c.fix2].forEach((l) => say(who, l[0].replace('{D}', o.D).replace('{E}', o.E))));
      [c.straight, c.dont, c.wrong, c.here, c.far, c.hurry, c.price, c.keep, c.thanks].forEach((l) => say(who, l[0]));
    });
    Object.values(s.go).forEach((l) => say('hero', l[0]));
    for (let n = -1; n <= 30; n++) say('hero', s.pay[0].replace('{P}', YEN.priceMark(500 + 80 * n)));   // the meter: 500, 80 a block (and the ±80 offered); a lost ride runs long (to 2,900; past it the device's voice)
    [s.ask, s.wrong, s.on, s.cat, s.end, s.all, ...s.chat].forEach((l) => say(s.who, l[0]));
  }
  return { run, lines, now: () => R };
})();
WORK.register('taxi', { run: TAXI_RUN.run, lines: TAXI_RUN.lines });
