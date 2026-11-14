'use strict';
// ---------- 外場 in らいらいけん (HALL; 2026-11-15, docs/superpowers/specs/2026-11-15-work-redesign-design.md §6) ----------
// The user: 外送 cut; in its place the hall of a Chinese restaurant one walks into — customers sit down and talk, the hero answers
// with the 入門 greetings and pointing words, running between the tables, the pass and the register. Played in the room itself,
// not on a card: customers come in by the door (a few at a time, no more than the shift's answers left can take), a 「！」 over
// whoever wants the hero. Tap them (or the table, the pass, the register, 黄): the hero walks there, the customer says their word
// — heard, its text shown once answered — and three things to say come up at the foot of the screen; the right one moves them on,
// a wrong one is a miss (two, and the right one lights). Each answer one of the shift's ten (WORK's ctx), no clock, nobody leaves
// in a huff. A customer: in at the door (いらっしゃいませ) → to a free table the hero stands at (こちらへ どうぞ) → sits, calls
// (すみません！ → はい！) and orders off the table's menu → 黄's できたよ！ at the pass, the dish taken → to their table (どうぞ;
// the wrong table: ちがいます → すみません) → eats → to the register (ごちそうさまでした → ありがとうございました) → out.
// Their looks put together anew (PASSERS.look), their voices the cruise's passengers' (the hair a man's for a man's voice).
const HALL = (() => {
  const api = { pace: 1 };   // the waits' scale (the tests run them fast)
  const VOICES = ['kaneda', 'umeko', 'yuta', 'rina', 'yoshimoto', 'ken', 'ai', 'michiyama', 'mike'];
  const MALE_HAIR = ['短髮', '刺蝟頭', '旁分呆毛', '中分'];
  const MAX = 3, rnd = (a, b) => a + Math.random() * (b - a), pick = (a) => a[Math.floor(Math.random() * a.length)];
  const L = () => TOWN.WORK.say.waiter;
  // what each customer still wants of the hero by where they are: no more come in than the shift's answers left can take
  const LEFT = { in: 5, wait: 4, walk: 3, sit: 3, call: 3, order: 2, food: 2, eat: 1, leave: 1, pay: 1, out: 0 };
  const NEED = ['in', 'wait', 'call', 'pay'];   // a 「！」 over them
  // the way to each table's seat from the door side, round the furniture (and back again to the register)
  const VIA = [[[5.0, 4.0]], [[5.0, 3.0], [12.2, 3.0]], [[11.0, 9.3], [13.45, 9.3]]];
  const toSeat = (i) => [[5.0, 12.4], ...VIA[i], RAIRAI.seat(i)], fromSeat = (i) => [...VIA[i].slice().reverse(), [5.0, 11.4], RAIRAI.pay];
  const CLINE = { call: 'call', sorry: 'wrong', pay: 'pay' };   // what the customer says first (the rest is seen)
  const HINT = { greet: '客人進門了。', seat: '帶客人到這張桌子。', serve: '把菜端上桌。' };
  let H = null, seq = 0;   // the shift under way: { ctx, yard, k, cust, ask, tray, ready, timers, raf, at, over }
  const N = () => H.ctx.n;
  const live = () => Boolean(H) && H.yard.isConnected && H.ctx.on();
  const later = (fn, ms) => { const h = H; h.timers.push(setTimeout(() => { if (H === h && live()) fn(); }, ms * api.pace)); };
  const free = (i) => !H.cust.some((c) => c.table === i);
  // ---- the people ----
  function person() {
    const voice = pick(VOICES.filter((v) => !H.cust.some((c) => c.voice === v))) || pick(VOICES), { look, wear } = PASSERS.look();
    if (castGender(voice) === 'm') { const [, fringe, sides, hairBack, hairTop] = pick(HERO.STYLES.filter(([n]) => MALE_HAIR.includes(n))); Object.assign(look, { fringe, sides, hairBack, hairTop }); if (look.bottomStyle === 'skirt') look.bottomStyle = 'pants'; }
    else look.beard = 'none';
    return { voice, look, wear };
  }
  function put(c) {   // drawn where they are, before or behind the furniture by where they stand
    const [X, Y] = isoXY(c.u, c.v);
    c.el.style.transform = `translate(${X.toFixed(1)}px,${(-Y).toFixed(1)}px) scale(${yScale(Y).toFixed(3)})`;
    c.el.style.zIndex = String(isoZ(c.u, c.v + (c.el.classList.contains('bench') ? 0.45 : 0)));
  }
  function mark(c) {
    c.el.classList.toggle('need', NEED.includes(c.state));
    const w = c.el.querySelector('.hl-want'); if (w) w.textContent = c.state === 'food' ? c.dish : ''; c.el.classList.toggle('want', c.state === 'food');
  }
  const pop = (c, text) => { const [X, Y] = isoXY(c.u, c.v); yPop(H.yard, X + 600, 370 - Y - (c.el.classList.contains('bench') ? 150 : 190) * ISO.k, text); };
  const heroPop = (text) => yPop(H.yard, yh.X + 600, 370 - yh.Y - 190 * ISO.k, text);
  const huangPop = (text) => { const [X, Y] = isoXY(6.9, 0.85); yPop(H.yard, X + 600, 370 - Y - 190 * ISO.k, text); };
  function walk(c, pts, done) { c.path = pts.slice(); c.then = done; c.el.classList.remove('bench'); c.el.classList.add('walk'); }
  function frame(now) {
    if (!H) return; if (!H.yard.isConnected) { stop(); return; }
    const dt = H.at ? Math.min(0.1, (now - H.at) / 1000) : 0; H.at = now;
    H.cust.slice().forEach((c) => {
      if (!c.path || !c.path.length) return;
      const [tu, tv] = c.path[0], du = tu - c.u, dv = tv - c.v, d = Math.hypot(du, dv), step = 2.6 * dt / api.pace;
      const sx = du - dv, sy = (du + dv) / 2;   // on the screen: right, down
      c.el.classList.toggle('back', sy < 0 && Math.abs(sy) > Math.abs(sx)); c.el.classList.toggle('turn', Math.abs(sx) >= Math.abs(sy)); c.el.classList.toggle('flip', sx < 0);
      if (d <= step) { c.u = tu; c.v = tv; c.path.shift(); } else { c.u += du / d * step; c.v += dv / d * step; }
      if (!c.path.length) { c.el.classList.remove('walk', 'back', 'turn', 'flip'); const f = c.then; c.then = null; put(c); if (f) f(); } else put(c);
    });
    H.raf = requestAnimationFrame(frame);
  }
  function spawn() {
    if (!live() || H.over) return null;
    const c = Object.assign({ id: 'c' + (++seq), state: 'in', u: RAIRAI.door[0], v: RAIRAI.door[1], table: -1, dish: '' }, person());
    const el = document.createElement('button'); el.type = 'button'; el.className = 'hero npc cust'; el.dataset.act = 'hall-cust'; el.dataset.c = c.id; el.setAttribute('aria-label', '客人');
    el.innerHTML = `${HERO.svg({ look: c.look, wear: c.wear })}<i class="ev-mark hl-mark" aria-hidden="true">！</i><i class="hl-want" lang="ja" aria-hidden="true"></i>`;
    H.yard.querySelector('.yworld').appendChild(el); c.el = el; H.cust.push(c); put(c); mark(c);
    SND.play('suzu', { vol: 0.5 }); walk(c, [RAIRAI.wait], null);
    return c;
  }
  function more() {   // another in now and then, while tables and answers are left for them
    if (!live() || H.over) return;
    const pending = H.cust.reduce((n, c) => n + LEFT[c.state], 0), tables = [0, 1, 2].filter(free).length, waiting = H.cust.filter((c) => c.state === 'in' || c.state === 'wait').length;
    if (H.cust.length < MAX && N() - H.k > pending && tables > waiting) spawn();
    later(more, rnd(6000, 9000));
  }
  // ---- the hero's dish from the pass ----
  function carry(on) {
    const h = H.yard.querySelector('.yhero'); if (!h) return; let t = h.querySelector('.hl-tray');
    if (on && !t) { t = document.createElement('span'); t.className = 'hl-tray'; t.setAttribute('aria-hidden', 'true'); h.appendChild(t); }
    if (t) { t.textContent = on ? H.tray.dish : ''; if (!on) t.remove(); }
  }
  function readyMark() {   // a 「！」 over 黄 while a dish waits at the pass
    const hu = H.yard.querySelector('.npc[data-npc="huang"]'); if (!hu) return; let m = hu.querySelector('.hl-mark');
    if (H.ready.length && !m) { m = document.createElement('i'); m.className = 'ev-mark hl-mark'; m.setAttribute('aria-hidden', 'true'); m.textContent = '！'; hu.appendChild(m); }
    if (!H.ready.length && m) m.remove();
  }
  // ---- a question: what the hero says ----
  function ask(kind, c, table) {
    const s = L(), right = s.me[kind], line = CLINE[kind] ? s.cust[CLINE[kind]] : null;
    H.ask = { kind, c, table, right: right[0], opts: shuffle([right, ...shuffle(s.not[kind]).slice(0, 2)]).map((o) => o[0]), line, miss: kind === 'sorry' ? 1 : 0, wrong: 0 };
    if (line) { speakAs(c.voice, line[0]); pop(c, '🔊'); }
    panel();
  }
  function panel() {
    const old = H.yard.querySelector('.hl-pick'); if (old) old.remove();
    const a = H.ask; if (!a) return;
    const el = document.createElement('div'); el.className = 'hl-pick';
    el.innerHTML = `<p class="hl-q">${a.line ? '<button type="button" class="hl-ear" aria-label="再聽一次">🔊</button><span>客人說了什麼？要回哪一句？</span>' : `<span>${esc(HINT[a.kind] || '')}</span>`}</p>
      <div class="hl-opts">${a.opts.map((o) => `<button type="button" class="hl-opt" data-o="${esc(o)}" lang="ja">${esc(o)}</button>`).join('')}</div>`;
    el.addEventListener('pointerdown', (e) => e.stopPropagation());
    el.addEventListener('click', (e) => { e.stopPropagation(); primeTtsPlayer(); if (e.target.closest('.hl-ear')) { speakAs(a.c.voice, a.line[0]); return; } const b = e.target.closest('.hl-opt'); if (b) choose(b); });
    H.yard.appendChild(el);
  }
  function choose(b) {
    const a = H.ask; if (!a || !live()) return; const said = b.dataset.o;
    speakAs('hero', said); heroPop(said);
    if (said !== a.right) {   // a miss: a shake, a 「？」 from them; two, the right one lights
      a.miss++; a.wrong++; playSfx('bad'); b.classList.remove('wk-bad'); void b.offsetWidth; b.classList.add('wk-bad'); pop(a.c, '？');
      if (a.wrong >= 2) H.yard.querySelectorAll('.hl-opt').forEach((x) => x.classList.toggle('wk-hint', x.dataset.o === a.right));
      return;
    }
    playSfx('good'); H.ask = null; panel();
    if (a.line) setTimeout(() => { if (H && H.yard.isConnected) pop(a.c, a.line[0]); }, 500);   // what they said, in print now
    H.ctx.right(H.k, a.miss); H.k++;
    next(a);
    if (H.k >= N()) end();
  }
  // ---- what follows each right answer ----
  function next({ kind, c, table }) {
    const s = L();
    if (kind === 'greet') { c.state = 'wait'; mark(c); return; }
    if (kind === 'seat') {
      c.state = 'walk'; c.table = table; mark(c);
      walk(c, toSeat(table), () => { c.state = 'sit'; c.el.classList.add('bench'); put(c); mark(c); later(() => { c.state = 'call'; mark(c); speakAs(c.voice, s.cust.call[0]); pop(c, '！'); }, rnd(2500, 4500)); });
      return;
    }
    if (kind === 'call') {
      c.state = 'order'; c.dish = pick(RAIRAI.MENU)[0]; mark(c);
      later(() => { speakAs(c.voice, s.cust.order[0]); pop(c, s.cust.order[0]); later(() => { huangPop(s.order[0]); c.state = 'food'; mark(c);
        later(() => { H.ready.push(c.id); readyMark(); speakAs('huang', s.ready[0]); huangPop(s.ready[0]); }, rnd(4000, 6000)); }, 1200); }, 700);
      return;
    }
    if (kind === 'serve') {
      H.tray = null; carry(false); c.state = 'eat'; mark(c);
      later(() => { pop(c, s.cust.eat[0]); later(() => { pop(c, s.cust.yum[0]); later(() => { const t = c.table; c.state = 'leave'; c.table = -1; mark(c); walk(c, fromSeat(t), () => { c.state = 'pay'; mark(c); }); }, 2500); }, 2500); }, 600);
      return;
    }
    if (kind === 'pay') { c.state = 'out'; mark(c); walk(c, [RAIRAI.door], () => gone(c)); }
  }
  function gone(c) { c.el.remove(); if (H) H.cust = H.cust.filter((x) => x !== c); }
  function end() {
    const s = L(); H.over = true; H.ctx.finish({}, 1800); carry(false); H.ready = []; readyMark();
    setTimeout(() => { if (!H || !H.yard.isConnected) return; speakAs('huang', s.end[0]); huangPop(s.end[0]); }, 700);
    H.cust.forEach((c) => { c.state = 'out'; mark(c); walk(c, [[5.0, 12.4], RAIRAI.door], () => gone(c)); });
  }
  // ---- the hero sent somewhere (a customer, 黄, a table…) ----
  function at(yard, k) {
    if (!live() || H.over || H.ask) return;
    const find = (f) => H.cust.find(f), s = L();
    if (k === 'entry') { const c = find((q) => q.state === 'in'); if (c) ask('greet', c); return; }
    if (k === 'register') { const c = find((q) => q.state === 'pay'); if (c) ask('pay', c); return; }
    if (k === 'pass') {
      if (H.tray || !H.ready.length) { heroPop('…'); return; }
      const id = H.ready.shift(), c = find((q) => q.id === id); H.tray = { for: id, dish: c ? c.dish : '' }; carry(true); readyMark(); SND.play('dishes', { vol: 0.5 }); heroPop(`${H.tray.dish}！`); return;
    }
    if (k.startsWith('table')) {
      const i = Number(k.slice(5)), c = find((q) => q.table === i);
      if (!c) { const w = find((q) => q.state === 'wait'); if (w) ask('seat', w, i); return; }
      if (c.state === 'call') { ask('call', c); return; }
      if (c.state === 'food' && H.tray) ask(H.tray.for === c.id ? 'serve' : 'sorry', c);
    }
  }
  const spotOf = (c) => (c.state === 'in' ? 'entry' : c.state === 'pay' ? 'register' : (c.state === 'call' || c.state === 'food') && c.table >= 0 ? 'table' + c.table : null);
  function go(k) {   // walk over, then see what is wanted there
    const yard = H.yard, u = k.startsWith('table') ? RAIRAI.at.table(Number(k.slice(5))) : RAIRAI.at[k];
    yHeroWalk(yard, isoXY(...u), () => at(yard, k));
  }
  function tap(el) {
    if (!live()) return; const c = H.cust.find((q) => q.id === el.dataset.c); if (!c) return;
    if (c.state === 'wait') { heroPop('どこに しよう…'); toast('點一張空桌子，帶客人過去。', 2600); return; }
    const k = spotOf(c); if (k) go(k);
  }
  function stop() {
    if (!H) return; H.timers.forEach(clearTimeout); cancelAnimationFrame(H.raf);
    if (H.yard.isConnected) { H.cust.forEach((c) => c.el.remove()); const p = H.yard.querySelector('.hl-pick'); if (p) p.remove(); H.tray = { dish: '' }; carry(false); H.ready = []; readyMark(); }
    H = null;
  }
  function run(ctx) {
    stop();
    const yard = document.querySelector('.yard'); if (!yard || yard.dataset.place !== 'rairai') return;
    H = { ctx, yard, k: ctx.done, cust: [], ask: null, tray: null, ready: [], timers: [], raf: 0, at: 0, over: false };
    H.raf = requestAnimationFrame(frame);
    spawn(); later(more, 5000);
  }
  function lines(add) {
    const s = L();
    Object.values(s.me).concat(...Object.values(s.not)).forEach((l) => add('hero', l[0]));
    VOICES.forEach((v) => Object.values(s.cust).forEach((l) => add(v, l[0])));
    [s.ready, s.order, s.end].forEach((l) => add(s.who, l[0]));
  }
  WORK.register('waiter', { run, lines });
  return Object.assign(api, { run, at, tap, lines, spawn: () => (H ? spawn() : null),
    on: () => live() && !H.over, goPass: () => { if (live()) go('pass'); },
    now: () => (H ? { k: H.k, over: H.over, ask: H.ask && { kind: H.ask.kind, right: H.ask.right, opts: H.ask.opts.slice() }, tray: H.tray && Object.assign({}, H.tray), ready: H.ready.slice(),
      cust: H.cust.map((c) => ({ id: c.id, state: c.state, table: c.table, dish: c.dish })) } : null) });
})();
