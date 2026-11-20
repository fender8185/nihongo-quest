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
  // name, the reading over it), the station at the foot; the taxi drawn on top (tx-car)
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
      const kana = w.replace(MARK, '$2'), kanji = w.replace(MARK, '$1'), hasK = kana !== kanji, lw = Math.max(44, kanji.length * 13 + 10, kana.length * 7.4 + 8);
      return `<g class="tx-place" data-place="${id}"><circle cx="${px}" cy="${py - 4}" r="17" fill="#fbf7ec" stroke="#8a7a6e" stroke-width="1.2"/><svg x="${px - 16}" y="${py - 20}" width="32" height="32" viewBox="0 0 100 100">${d}</svg>
        <rect x="${px - lw / 2}" y="${py + 13}" width="${lw}" height="${hasK ? 25 : 18}" rx="3" fill="#fffaf0" stroke="#d8c8a8" stroke-width=".8"/>${hasK ? `<text x="${px}" y="${py + 21}" text-anchor="middle" font-size="7.4" fill="#8a7a6e">${esc(kana)}</text>` : ''}<text x="${px}" y="${py + (hasK ? 34 : 27)}" text-anchor="middle" font-size="13" font-weight="700" fill="#2b2b33" lang="ja">${esc(kanji)}</text></g>`; }).join('');
    const station = `<rect x="140" y="478" width="100" height="26" rx="3" fill="#2f4a6e"/><text x="190" y="496" text-anchor="middle" font-size="12" font-weight="700" fill="#fff">みなと駅</text>`;
    return `<svg class="tx-map" viewBox="0 0 380 510" aria-hidden="true"><rect width="380" height="510" class="tx-ground"/>${blocks}${roads}${dashes}${zebra.join('')}${station}${places}
      <circle class="tx-ring" r="17" cx="-50" cy="-50"/><g class="tx-car" transform="translate(${STATION[0]} ${STATION[1]}) rotate(0)"><ellipse cx="0" cy="1" rx="8" ry="12" fill="#000" opacity=".18"/><rect x="-7" y="-11" width="14" height="22" rx="4" fill="#f3d24a" stroke="#b8961e" stroke-width=".8"/><rect x="-5.4" y="-6" width="10.8" height="5" rx="1.4" fill="#2f3a4a"/><rect x="-5" y="3" width="10" height="4" rx="1.2" fill="#2f3a4a"/><rect x="-3.4" y="-1" width="6.8" height="2.6" rx=".8" fill="#fbf7ec"/><circle cx="-4.4" cy="-10.6" r="1.4" fill="#fff6d8"/><circle cx="4.4" cy="-10.6" r="1.4" fill="#fff6d8"/><circle class="tx-blink l" cx="-6.6" cy="-8" r="1.6" fill="#ff9a2a"/><circle class="tx-blink r" cx="6.6" cy="-8" r="1.6" fill="#ff9a2a"/></g></svg>`;
  }
  function run(ctx) {
    const mine = ++runs, s = S(), rides = TAXI.make(), score = (WORK.today() || {}).score || {}, first = !Object.values(state.work.res).some((r) => r.place === 'taxi' && r.yen !== undefined);
    const T = (sec) => sec * 1000 * JOBS.pat.scale, el = (q) => document.querySelector('.wk-taxi ' + q), live = () => mine === runs && Boolean(el('.tx-map')) && ctx.on();
    let k = [0, 1, 2, 3, 4].find((i) => !(i in score)); if (k === undefined) k = 4;
    let tip = (ctx.kept && ctx.kept.tip) || 0, missed = 0, wait = null, chats = 0, cat = Math.random() < 0.25;   // cat: once a shift maybe, one runs across; tip: kept over a break
    const word = ([ja, zh], cls = '') => { const p = el('.wk-say'); if (p) { p.innerHTML = `<b lang="ja">${ruby(ja)}</b><span>${esc(zh)}</span>`; p.className = 'wk-say' + (cls ? ' ' + cls : ''); } return speakAs(s.who, ja); };
    const me = ([ja, zh]) => { const p = el('.wk-me'); if (p) p.innerHTML = `<b lang="ja">${ruby(ja)}</b>${first ? `<span>${esc(zh)}</span>` : ''}`; return speakAs('hero', ja); };
    const said = (p, min = 0, max = 5000) => JOBS.said(p, min, max);
    const meter = () => { const m = el('.tx-meter b'); if (m) m.textContent = yenStr(R.fare); };
    // what they said last (the way at this crossing, or where to): heard; shown once the ride is over or after two misses
    const told = () => (R.ride.guided ? (R.ride.lines.filter((x) => x.at <= R.i).pop() || { line: R.ride.ask }).line : R.ride.ask);
    function bub() {
      const b = el('.tx-bub'); if (!b) return; const open = R.phase === 'pay' || R.phase === 'done' || R.miss >= 2, [ja, zh] = R.phase === 'pay' ? s.cust.price : told();
      b.innerHTML = `<button type="button" class="wk-ear tx-ear" aria-label="再聽一次">${icon('speaker')}</button>${open ? `<b lang="ja">${ruby(ja)}</b><span>${esc(zh)}</span>` : '<b class="bt-dots">……</b>'}`;
    }
    function ctl() {
      const c = el('.tx-ctl'); if (!c) return; const on = R.phase === 'drive' && R.choosing;
      c.innerHTML = ['left', 'straight', 'right', 'stop'].map((ch) => `<button type="button" class="btn tx-go${ch === 'stop' ? ' stop' : ''}${R.choice === ch ? ' picked' : ''}" data-ch="${ch}" lang="ja"${on && TAXI.can(R.at, R.h, ch) ? '' : ' disabled'}>${ruby(ch === 'left' ? '{左|ひだり}' : ch === 'right' ? '{右|みぎ}' : ch === 'stop' ? '{止|と}めて' : 'まっすぐ')}</button>`).join('');
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
      el('.tx-pays').innerHTML = opts.map((v, i) => `<button type="button" class="btn tx-pay" data-o="${i}" lang="ja">${esc(S().pay[0].replace('{P}', YEN.reading(v)))}</button>`).join('');   // in kana: the meter's digits read, not matched
      bub(); speakAs(R.ride.who, s.cust.price[0]);
    }
    async function paid() {
      const r = R; R.phase = 'done'; ctx.right(r.k, r.miss); el('.tx-pays').innerHTML = ''; playSfx('good'); bub();
      const more = !r.miss && TAXI.tips && Math.random() < 0.5 ? 10 * (1 + Math.floor(Math.random() * 3)) : 0; tip += more; if (more) ctx.keep({ tip });
      const kk = k; k++;
      const bye = (async () => {
        await said(me(S().pay.map((x, i) => (i ? x.replace('{p}', r.fare) : x.replace('{P}', YEN.priceMark(r.fare))))), 700); if (!live()) return;   // shut: no more voices (paid all the same)
        if (more) { await said(speakAs(r.ride.who, s.cust.keep[0]), 600); playSfx('coin', 2); }
        await said(speakAs(r.ride.who, s.cust.thanks[0]), 600); if (!live()) return;
        if (k < 5) { begin(); return; }
        await said(word(!missed && ctx.done === 0 ? s.all : s.end, 'ok'), 800); if (el('.tx-map')) CLASS.close();
      })();
      if (k >= 5) ctx.finish({ tip, tipName: 'おつり' }, bye);
    }
    // a ride: the first gets in at the station (the taxi up to the first crossing); the next where the last got out, the taxi
    // facing on as it stopped
    async function begin() {
      const g = rides[k], station = k === 0, pos = station ? STATION.slice() : xy(...g.from), rot = station ? 0 : g.h0 * 90;
      R = { k, ride: g, phase: 'board', at: g.from.slice(), h: g.h0, i: 0, want: g.path[0], choosing: false, choice: null, fare: 500, steps: 0, miss: 0, far: false, pos, rot, lean: null, saying: null };
      const me0 = R; el('.wk-n').textContent = `${k + 1}／5`; el('.tx-face').innerHTML = TOWNEV.face(g.who); el('.tx-pays').innerHTML = ''; meter(); ctl();
      const car = el('.tx-car'); if (car) car.setAttribute('transform', `translate(${pos[0]} ${pos[1]}) rotate(${rot})`);
      bub(); SND.play('door-close', { vol: 0.5 });
      await said(speakAs(g.who, g.ask[0]), 400); if (!live() || R !== me0) return;
      if (g.urgent) await said(speakAs(g.who, s.cust.hurry[0]), 300); if (!live() || R !== me0) return;
      R.phase = 'drive'; if (g.guided) sayWay(); else bub();
      if (station) drive(xy(...R.at), 0, T(1.6)).then(() => arrive());
      else { R.choosing = true; ctl(); arrive(); }
    }
    CLASS.card('wk-taxi', '計程車導航', `<button type="button" class="cls-x" data-cls="x" aria-label="關閉">✕</button>
      <div class="wk-head"><b lang="ja"><ruby>鈴木<rt>すずき</rt></ruby>タクシー</b><span class="wk-n"></span></div>
      <div class="wk-who"><span class="kr-face">${TOWNEV.face(s.who)}</span><p class="wk-say"></p></div>
      <div class="tx-top"><span class="kr-face tx-face"></span><p class="tx-bub"></p><div class="tx-meter"><span lang="ja"><ruby>料金<rt>りょうきん</rt></ruby></span><b></b><i>円</i></div></div>
      <div class="tx-mapbox">${mapSvg()}</div><div class="tx-ctl"></div><div class="tx-pays"></div><p class="wk-me"></p>`, (e) => {
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
    for (let n = -1; n <= 20; n++) say('hero', s.pay[0].replace('{P}', YEN.priceMark(500 + 80 * n)));   // the meter: 500, 80 a block (and the ±80 offered)
    [s.ask, s.wrong, s.on, s.cat, s.end, s.all, ...s.chat].forEach((l) => say(s.who, l[0]));
  }
  return { run, lines, now: () => R };
})();
WORK.register('taxi', { run: TAXI_RUN.run, lines: TAXI_RUN.lines });
