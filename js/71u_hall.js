'use strict';
// ---------- 外場 in らいらいけん (HALL; 2026-11-15, docs/superpowers/specs/2026-11-15-work-redesign-design.md §6) ----------
// The user: 外送 cut; in its place the hall of a Chinese restaurant one walks into — customers sit down and talk, the hero answers
// with the 入門 greetings and pointing words, running between the tables, the pass and the register. Played in the room itself,
// not on a card: customers come in by the door (a few at a time, no more than the shift's answers left can take), a 「！」 over
// whoever wants the hero. Tap them (or the table, the pass, the register, 黄): the hero walks there, the customer says their word
// — heard, its text shown once answered — and three things to say come up at the foot of the screen; the right one moves them on,
// a wrong one is a miss (two, and the right one lights). A customer: in at the door (いらっしゃいませ) → to a free table the hero stands at (こちらへ どうぞ) → sits, calls
// (すみません！ → はい！) and orders off the table's menu → 黄's できたよ！ at the pass, the dish taken → to their table (どうぞ;
// the wrong table: ちがいます → すみません) → eats → to the register (ごちそうさまでした → ありがとうございました) → out.
// Their looks put together anew (PASSERS.look), their voices the cruise's passengers' (the hair a man's for a man's voice).
// Once their words are learned (WORK.knows), more of what the hall meets: the order by これ／それ／あれ — the table's menu by the
// customer, the おすすめ board in the hero's hand, the poster across the room — the one meant picked; おてあらいは どこですか from a
// table far from the toilet door (あそこです); chopsticks dropped and handed back (どうぞ → ありがとう → どういたしまして); a regular
// (周おばあさん, 張さん, 陳) in at the door with the time's greeting, answered in kind. Each at most once a shift.
// 外場 2.0 (2026-11-15, the user: too rough — it should feel like you really must answer, customers changing if kept waiting, Japanese
// and tension wherever they are; docs/superpowers/specs/2026-11-15-hall-rush-design.md): each customer's patience wears down while
// they wait on the hero (a ring round their 「！」), their face going from pleased to put out (💦) to cross (💢), calling again
// (あの、すみません！) and cross (ちょっと！) as it goes; a wrong answer costs some, a quick right one gives some back; a cross one
// wants an apology first (おそい！/ちょっと！ → すみません！); at none they storm out (もう いいです！), the door banged, a star off
// the shop. A shift is six groups (WORK's ctx), each marked as it leaves by its mood; the stars left are 黄's 紅包.
const HALL = (() => {
  const api = { pace: 1, pat: 1, force: null };   // the waits' scale and patience's (the tests run them fast or calm); force: { toilet, drop, regular, solo } for the tests
  const VOICES = ['kaneda', 'umeko', 'yuta', 'rina', 'yoshimoto', 'ken', 'ai', 'michiyama', 'mike'];
  const MALE_HAIR = ['短髮', '刺蝟頭', '旁分呆毛', '中分'];
  const MAX = 3, rnd = (a, b) => a + Math.random() * (b - a), pick = (a) => a[Math.floor(Math.random() * a.length)];
  const L = () => TOWN.WORK.say.waiter;
  const NEED = ['in', 'wait', 'call', 'pay', 'ask', 'drop'];   // a 「！」 over them
  // patience (spec §1): how fast each state wears it down (the dish on its way: half as fast; walking, sitting down, eating: not at
  // all), how long a whole one lasts (s), the moods by what is left, their faces and signs, a group's mark as it leaves (3: stormed out)
  const DRAIN = { in: 1, wait: 1, call: 1, order: 1, food: 0.5, ask: 1, drop: 1, pay: 1 };
  const PAT = () => (inPreStage() ? 60 : 45) * api.pat;
  const MOOD = (p) => (p >= 0.6 ? 'ok' : p >= 0.3 ? 'meh' : 'mad');
  const FACE = { ok: {}, meh: { mouth: 'flat', brows: 'worried' }, mad: { eyes: 'sharp', brows: 'angry', mouth: 'o' } };
  const EMO = { ok: '', meh: '💦', mad: '💢' }, SCORE = { ok: 0, meh: 1, mad: 2 };
  const WRONG = 0.2, RIGHT = 0.05, QUICK = 0.15, QUICK_MS = 5000, SORRY = 0.25, STARS = 3;
  // the way to each table's seat from the door side, round the furniture (and back again to the register, or out of the door)
  const VIA = [[[5.0, 4.0]], [[5.0, 3.0], [12.2, 3.0]], [[11.0, 9.3], [13.45, 9.3]]];
  const toSeat = (i) => [[5.0, 12.4], ...VIA[i], RAIRAI.seat(i)], fromSeat = (i) => [...VIA[i].slice().reverse(), [5.0, 11.4], RAIRAI.pay];
  const exitPath = (c) => (c.table >= 0 && c.state !== 'walk' ? [...VIA[c.table].slice().reverse(), [5.0, 12.4], RAIRAI.door] : ['walk', 'leave'].includes(c.state) ? [[5.0, 12.4], RAIRAI.door] : [RAIRAI.door]);
  const CLINE = { call: 'call', sorry: 'wrong', pay: 'pay', toilet: 'toilet', thanks: 'thanks' };   // what the customer says first (the rest is seen)
  const FAR = [0, 2];   // the tables far from the toilet door (asked from these only: あそこ, nothing in between)
  const knows = (...ws) => ws.every((w) => WORK.knows(w));
  const once = (what, chance) => { if (H.once[what]) return false; const f = api.force && api.force[what]; if (f === false || !(f || Math.random() < chance)) return false; H.once[what] = true; return true; };
  const HINT = { greet: '客人進門了。', seat: '帶客人到這張桌子。', serve: '把菜端上桌。' };
  let H = null, seq = 0;   // the shift under way: { ctx, yard, k (groups gone), cust, ask, tray, ready, timers, raf, at, over, stars, streak }
  const N = () => H.ctx.n;
  const live = () => Boolean(H) && H.yard.isConnected && H.ctx.on();
  const later = (fn, ms) => { const h = H; h.timers.push(setTimeout(() => { if (H === h && live()) fn(); }, ms * api.pace)); };
  const free = (i) => !H.cust.some((c) => c.table === i);
  const here = (c) => Boolean(H) && H.cust.includes(c) && !c.stormed;   // still theirs to see to (not stormed out, not gone)
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
    c.el.classList.toggle('need', NEED.includes(c.state) || Boolean(c.pointing)); c.el.classList.toggle('pat', Boolean(DRAIN[c.state]) && !H.over);
    const w = c.el.querySelector('.hl-want'); if (w) w.textContent = c.state === 'food' ? c.dish : ''; c.el.classList.toggle('want', c.state === 'food');
  }
  const pop = (c, text) => { const [X, Y] = isoXY(c.u, c.v); yPop(H.yard, X + 600, 370 - Y - (c.el.classList.contains('bench') ? 150 : 190) * ISO.k, text); };
  const heroPop = (text) => yPop(H.yard, yh.X + 600, 370 - yh.Y - 190 * ISO.k, text);
  const huangPop = (text) => { const [X, Y] = isoXY(6.9, 0.85); yPop(H.yard, X + 600, 370 - Y - 190 * ISO.k, text); };
  // ---- patience: worn down while waiting on the hero, shown on the face, a ring and a sign; at none, out they go ----
  function face(c) {
    const old = c.el.querySelector(':scope > svg'); if (old) old.outerHTML = HERO.svg({ look: Object.assign({}, c.look, FACE[c.mood]), wear: c.wear });
    c.el.dataset.mood = c.mood; emo(c);
  }
  function emo(c, now) {   // the sign by their head: 💦 or 💢 by the mood; a ♪ a moment on a quick answer
    const e = c.el.querySelector('.hl-emo'); if (!e) return; clearTimeout(c.emoT);
    e.textContent = now || EMO[c.mood]; if (now) c.emoT = setTimeout(() => { if (c.el.isConnected) e.textContent = EMO[c.mood]; }, 1400);
  }
  function feel(c) {
    c.el.style.setProperty('--p', c.p.toFixed(3));
    if (c.p <= 0) { storm(c); return; }
    const m = MOOD(c.p); if (m === c.mood) return;
    const worse = SCORE[m] > SCORE[c.mood]; c.mood = m; face(c);
    if (worse) grumble(c);
  }
  const hit = (c, d) => { if (!here(c)) return; c.p = Math.max(0, Math.min(1, c.p + d)); feel(c); };
  function grumble(c) {   // kept waiting: called again, then cross; the dish slow: まだですか (once まだ is known), else the clock ticks
    if (H.ask && H.ask.c === c) return;   // their question up: the face says it
    const s = L(), line = c.state === 'food' ? (knows('まだ') ? s.cust.still : null) : c.mood === 'mad' ? s.cust.hey : s.cust.again;
    if (line) { speakAs(c.voice, line[0]); pop(c, line[0]); } else SND.play('tick', { vol: 0.4 });
  }
  function storm(c) {   // patience gone: up and out, the door banged, a star off the shop, the group marked 3
    const s = L(), path = exitPath(c); c.stormed = true; c.mood = 'mad'; face(c);
    if (H.ask && H.ask.c === c) { H.ask = null; panel(); }
    if (H.tray && H.tray.for === c.id) { H.tray = null; carry(false); }
    H.ready = H.ready.filter((id) => id !== c.id); readyMark();
    const line = knows('もう') ? s.cust.out : s.cust.out0; speakAs(c.voice, line[0]); pop(c, line[0]);
    H.stars = Math.max(0, H.stars - 1); c.pointing = false; c.state = 'out'; c.table = -1; mark(c);
    walk(c, path, () => { SND.play('door-close', { vol: 0.6 }); gone(c); });
    done(c, 3);
  }
  function done(c, n) {   // a group gone: marked (0 pleased … 3 stormed out), one of the shift's six
    H.ctx.right(H.k, n); H.k++; H.streak = n === 0 ? H.streak + 1 : 0; hud();
    if (H.k >= N()) end();
  }
  function hud() {   // at the top: the group now, the shop's stars, the pleased ones in a row
    let el = H.yard.querySelector('.hl-hud'); if (!el) { el = document.createElement('div'); el.className = 'hl-hud'; H.yard.appendChild(el); }
    const n = N();
    el.innerHTML = `<b>第 ${Math.min(H.k + 1, n)}／${n} 組</b><span class="hl-stars" aria-label="店的評價 ${H.stars} 顆星">${'★'.repeat(H.stars)}${'☆'.repeat(STARS - H.stars)}</span>${H.streak >= 2 ? `<span class="hl-streak">連續滿意 ×${H.streak}</span>` : ''}`;
  }
  function walk(c, pts, done) { c.path = pts.slice(); c.then = done; c.el.classList.remove('bench'); c.el.classList.add('walk'); }
  function frame(now) {
    if (!H) return; if (!H.yard.isConnected) { stop(); return; }
    const dt = H.at ? Math.min(0.1, (now - H.at) / 1000) : 0; H.at = now;
    if (dt) H.cust.slice().forEach((c) => { const r = DRAIN[c.state]; if (r && !H.over && !c.stormed) { c.p = Math.max(0, c.p - r * dt / PAT()); feel(c); } });   // drawn frames only: a hidden page waits
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
  function regular() {   // one of the street's own, in for a meal: their own look and voice
    const s = L(), ids = s.regulars.filter((id) => !H.cust.some((c) => c.voice === id) && TOWN.CAST[id]);
    if (!ids.length || !knows(...s.hello.map((l) => l[0].replace('。', ''))) || !once('regular', 0.3)) return null;
    const id = pick(ids), C = TOWN.CAST[id]; return { voice: id, look: Object.assign({}, C.look), wear: Object.assign({}, C.wear || {}), regular: true };
  }
  function spawn() {
    if (!live() || H.over) return null;
    const c = Object.assign({ id: 'c' + (++seq), state: 'in', u: RAIRAI.door[0], v: RAIRAI.door[1], table: -1, dish: '', p: 1, mood: 'ok' }, regular() || person());
    const el = document.createElement('button'); el.type = 'button'; el.className = 'hero npc cust'; el.dataset.act = 'hall-cust'; el.dataset.c = c.id; el.setAttribute('aria-label', '客人');
    el.innerHTML = `${HERO.svg({ look: c.look, wear: c.wear })}<i class="hl-pat" aria-hidden="true"></i><i class="ev-mark hl-mark" aria-hidden="true">！</i><i class="hl-emo" aria-hidden="true"></i><i class="hl-want" lang="ja" aria-hidden="true"></i>`;
    el.dataset.mood = 'ok'; el.style.setProperty('--p', '1');
    H.yard.querySelector('.yworld').appendChild(el); c.el = el; H.cust.push(c); put(c); mark(c);
    SND.play('suzu', { vol: 0.5 }); walk(c, [RAIRAI.wait], null);
    return c;
  }
  function more() {   // another in now and then, while groups are left and a table is free for each one waiting
    if (!live() || H.over || (api.force && api.force.solo)) return;   // solo: the tests' one customer
    const inn = H.cust.filter((c) => c.state !== 'out'), tables = [0, 1, 2].filter(free).length, waiting = inn.filter((c) => c.state === 'in' || c.state === 'wait').length;
    if (inn.length < MAX && N() - H.k - inn.length > 0 && tables > waiting) spawn();
    later(more, rnd(4000, 8000));
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
  const hour = () => { const h = TOWNEV.now(); return h < 11 ? 0 : h < 17 ? 1 : 2; };   // おはようございます, こんにちは, こんばんは
  function ask(kind, c, table) {
    if (c.mood === 'mad' && !c.sorried && kind !== 'sorry') { c.after = { kind, table }; kind = 'late'; }   // cross: their complaint first
    const s = L(); let right, opts, line = CLINE[kind] ? s.cust[CLINE[kind]] : null, word = '';
    if (kind === 'late') { line = knows('おそい') ? s.cust.slow : s.cust.hey; right = s.me.sorry; opts = shuffle([right, ...s.not.sorry]).map((o) => o[0]); }
    else if (kind === 'hello') { line = s.hello[hour()]; right = line; opts = s.hello.map((l) => l[0]); }
    else if (kind === 'order') {   // これ by the customer (the table's menu), それ by the hero (the board in his hand), あれ across the room (the poster)
      const dishes = RAIRAI.MENU.map((m) => m[0]).filter((d) => d !== 'マーボーどうふ'), near = pick(dishes), hand = pick(dishes.filter((d) => d !== near));
      const where = { これ: `桌上的菜單：${near}`, それ: `你手上的推薦牌：${hand}`, あれ: '牆上的海報：マーボーどうふ' };
      word = pick(['これ', 'それ', 'あれ']); line = s.cust.point[word]; right = [where[word]]; opts = [where.これ, where.それ, where.あれ];
      heroPop(`おすすめ：${hand}`);
    } else { right = s.me[kind]; opts = shuffle([right, ...shuffle(s.not[kind]).slice(0, 2)]).map((o) => o[0]); }
    H.ask = { kind, c, table, word, right: right[0], opts, line, wrong: 0, t0: performance.now() };
    if (line) { speakAs(c.voice, line[0]); pop(c, '🔊'); }
    if (kind === 'sorry') hit(c, -WRONG / 2);   // a dish set before the wrong one: put out
    panel();
  }
  function panel() {
    const old = H.yard.querySelector('.hl-pick'); if (old) old.remove();
    const a = H.ask; if (!a) return;
    const el = document.createElement('div'); el.className = 'hl-pick';
    el.innerHTML = `<p class="hl-q">${a.line ? `<button type="button" class="hl-ear" aria-label="再聽一次">🔊</button><span>${a.kind === 'order' ? '客人要的是哪一個？' : '客人說了什麼？要回哪一句？'}</span>` : `<span>${esc(HINT[a.kind] || '')}</span>`}</p>
      <div class="hl-opts${a.kind === 'order' ? ' hl-where' : ''}">${a.opts.map((o) => `<button type="button" class="hl-opt" data-o="${esc(o)}" lang="ja">${a.kind === 'order' ? `<small>${esc(o.split('：')[0])}</small>${esc(o.split('：')[1])}` : esc(o)}</button>`).join('')}</div>`;
    el.addEventListener('pointerdown', (e) => e.stopPropagation());
    el.addEventListener('click', (e) => { e.stopPropagation(); primeTtsPlayer(); if (e.target.closest('.hl-ear')) { speakAs(a.c.voice, a.line[0]); return; } const b = e.target.closest('.hl-opt'); if (b) choose(b); });
    H.yard.appendChild(el);
  }
  function choose(b) {
    const a = H.ask; if (!a || !live()) return; const said = b.dataset.o, c = a.c;
    if (a.kind !== 'order') { speakAs('hero', said); heroPop(said); }
    if (said !== a.right) {   // a miss: a shake, a 「？」 from them, some of their patience; two, the right one lights
      a.wrong++; playSfx('bad'); b.classList.remove('wk-bad'); void b.offsetWidth; b.classList.add('wk-bad'); pop(c, '？');
      hit(c, -WRONG); if (H.ask !== a) return;   // that was the last of it: gone
      if (a.wrong >= 2) H.yard.querySelectorAll('.hl-opt').forEach((x) => x.classList.toggle('wk-hint', x.dataset.o === a.right));
      return;
    }
    playSfx('good'); H.ask = null; H.lastPick = said; panel();
    if (a.line) setTimeout(() => { if (H && H.yard.isConnected) pop(c, a.line[0]); }, 500);   // what they said, in print now
    const quick = performance.now() - a.t0 <= QUICK_MS; hit(c, quick ? QUICK : RIGHT); if (quick && here(c)) emo(c, '♪');
    if (a.kind === 'late') {   // sorry said: a little better, and what they wanted comes next
      c.sorried = true; hit(c, SORRY); const f = c.after; c.after = null;
      later(() => { if (!H.ask && here(c) && f) ask(f.kind, c, f.table); }, 600); return;
    }
    next(a);
  }
  // ---- what follows each right answer ----
  function next({ kind, c, table }) {
    const s = L();
    if (kind === 'greet' || kind === 'hello') { c.state = 'wait'; mark(c); return; }
    if (kind === 'seat') {
      c.state = 'walk'; c.table = table; mark(c);
      walk(c, toSeat(table), () => { c.state = 'sit'; c.el.classList.add('bench'); put(c); mark(c); later(() => { if (!here(c)) return; c.state = 'call'; mark(c); speakAs(c.voice, s.cust.call[0]); pop(c, '！'); }, rnd(2500, 4500)); });
      return;
    }
    const cook = () => later(() => { if (!here(c)) return; huangPop(s.order[0]); c.state = 'food'; mark(c); later(() => { if (!here(c)) return; H.ready.push(c.id); readyMark(); speakAs('huang', s.ready[0]); huangPop(s.ready[0]); }, rnd(4000, 6000)); }, 1200);
    if (kind === 'call') {
      c.state = 'order'; mark(c);
      if (knows('これ', 'それ', 'あれ')) { c.pointing = true; mark(c); later(() => { if (!H.ask && c.pointing) ask('order', c); }, 600); return; }   // pointing at one of three: which is meant (another question up: their 「！」 waits for the hero)
      c.dish = pick(RAIRAI.MENU)[0]; later(() => { if (!here(c)) return; speakAs(c.voice, s.cust.order[0]); pop(c, s.cust.order[0]); cook(); }, 700);
      return;
    }
    if (kind === 'order') { c.pointing = false; mark(c); c.dish = H.lastPick.split('：')[1]; cook(); return; }
    if (kind === 'toilet') { pop(c, s.cust.thanks[0]); eat(c); return; }
    if (kind === 'thanks') { c.state = 'eat'; mark(c); later(() => leave(c), 2500); return; }
    if (kind === 'serve') {
      H.tray = null; carry(false);
      if (FAR.includes(c.table) && knows('あそこ') && once('toilet', 0.25)) { c.state = 'ask'; mark(c); later(() => { speakAs(c.voice, s.cust.call[0]); pop(c, '！'); }, 400); return; }   // first: where is it?
      eat(c); return;
    }
    if (kind === 'pay') { c.state = 'out'; mark(c); walk(c, [RAIRAI.door], () => gone(c)); done(c, SCORE[c.mood]); }
  }
  function eat(c) {   // いただきます, then おいしい (or the chopsticks dropped on the way), then off to pay
    const s = L(); c.state = 'eat'; mark(c);
    later(() => { if (!here(c)) return; pop(c, s.cust.eat[0]);
      if (knows('どういたしまして') && once('drop', 0.2)) { later(() => { if (!here(c)) return; c.state = 'drop'; mark(c); pop(c, 'あっ！'); SND.play('dishes', { vol: 0.4 }); }, 1500); return; }
      later(() => { if (!here(c)) return; pop(c, s.cust.yum[0]); later(() => leave(c), 2500); }, 2500); }, 600);
  }
  function leave(c) { if (!here(c) || c.state === 'leave') return; const t = c.table; c.state = 'leave'; c.table = -1; mark(c); walk(c, fromSeat(t), () => { c.state = 'pay'; mark(c); }); }
  function gone(c) { c.el.remove(); if (H) H.cust = H.cust.filter((x) => x !== c); }
  function end() {
    const s = L(); H.over = true; H.ctx.finish({ tip: H.stars * 10, tipName: '店長紅包' }, 1800); carry(false); H.ready = []; readyMark();
    if (H.ask) { H.ask = null; panel(); }
    setTimeout(() => { if (!H || !H.yard.isConnected) return; speakAs('huang', s.end[0]); huangPop(s.end[0]); }, 700);
    H.cust.forEach((c) => { if (c.state === 'out') return; const path = exitPath(c); c.state = 'out'; c.table = -1; mark(c); walk(c, path, () => gone(c)); });
  }
  // ---- the hero sent somewhere (a customer, 黄, a table…) ----
  function at(yard, k) {
    if (!live() || H.over || H.ask) return;
    const find = (f) => H.cust.find(f), s = L();
    if (k === 'entry') { const c = find((q) => q.state === 'in'); if (c) ask(c.regular ? 'hello' : 'greet', c); return; }
    if (k === 'register') { const c = find((q) => q.state === 'pay'); if (c) ask('pay', c); return; }
    if (k === 'pass') {
      if (H.tray || !H.ready.length) { heroPop('…'); return; }
      const id = H.ready.shift(), c = find((q) => q.id === id); H.tray = { for: id, dish: c ? c.dish : '' }; carry(true); readyMark(); SND.play('dishes', { vol: 0.5 }); heroPop(`${H.tray.dish}！`); return;
    }
    if (k.startsWith('table')) {
      const i = Number(k.slice(5)), c = find((q) => q.table === i);
      if (!c) { const w = find((q) => q.state === 'wait'); if (w) ask('seat', w, i); return; }
      if (c.state === 'call') { ask('call', c); return; }
      if (c.pointing) { ask('order', c); return; }
      if (c.state === 'ask') { ask('toilet', c); return; }
      if (c.state === 'drop') { speakAs('hero', s.me.serve[0]); heroPop(s.me.serve[0]); setTimeout(() => { if (live() && !H.ask && c.state === 'drop') ask('thanks', c); }, 700); return; }   // the chopsticks handed back: どうぞ, and their thanks
      if (c.state === 'food' && H.tray) ask(H.tray.for === c.id ? 'serve' : 'sorry', c);
    }
  }
  const spotOf = (c) => (c.state === 'in' ? 'entry' : c.state === 'pay' ? 'register' : (['call', 'food', 'ask', 'drop'].includes(c.state) || c.pointing) && c.table >= 0 ? 'table' + c.table : null);
  function go(k) {   // walk over, then see what is wanted there
    const yard = H.yard, u = k.startsWith('table') ? RAIRAI.at.table(Number(k.slice(5))) : RAIRAI.at[k];
    yHeroWalk(yard, isoXY(...u), () => at(yard, k));
  }
  function tap(el) {
    if (!live() || H.ask) return; const c = H.cust.find((q) => q.id === el.dataset.c); if (!c) return;   // a question up: answered first
    if (c.state === 'wait') { heroPop('どこに しよう…'); toast('點一張空桌子，帶客人過去。', 2600); return; }
    const k = spotOf(c); if (k) go(k);
  }
  function stop() {
    if (!H) return; H.timers.forEach(clearTimeout); cancelAnimationFrame(H.raf);
    if (H.yard.isConnected) { H.cust.forEach((c) => c.el.remove()); H.yard.querySelectorAll('.hl-pick, .hl-hud').forEach((x) => x.remove()); H.tray = { dish: '' }; carry(false); H.ready = []; readyMark(); }
    H = null;
  }
  function run(ctx) {
    stop();
    const yard = document.querySelector('.yard'); if (!yard || yard.dataset.place !== 'rairai') return;
    H = { ctx, yard, k: ctx.done, cust: [], ask: null, tray: null, ready: [], timers: [], raf: 0, at: 0, over: false, once: {}, lastPick: '', stars: STARS, streak: 0 };
    H.raf = requestAnimationFrame(frame); hud();
    spawn(); later(more, 3000);
  }
  function lines(add) {
    const s = L(), said = Object.values(s.cust).flatMap((l) => (Array.isArray(l) ? [l] : Object.values(l)));
    Object.values(s.me).concat(...Object.values(s.not)).forEach((l) => add('hero', l[0]));
    VOICES.concat(s.regulars).forEach((v) => said.forEach((l) => add(v, l[0])));
    s.regulars.forEach((v) => s.hello.forEach((l) => add(v, l[0]))); s.hello.forEach((l) => add('hero', l[0]));
    [s.ready, s.order, s.end].forEach((l) => add(s.who, l[0]));
  }
  WORK.register('waiter', { run, lines });
  return Object.assign(api, { run, at, tap, lines, stop, spawn: () => (H ? spawn() : null),
    on: () => live() && !H.over, goPass: () => { if (live()) go('pass'); },
    now: () => (H ? { k: H.k, over: H.over, stars: H.stars, streak: H.streak, ask: H.ask && { kind: H.ask.kind, word: H.ask.word, right: H.ask.right, opts: H.ask.opts.slice() }, tray: H.tray && Object.assign({}, H.tray), ready: H.ready.slice(),
      cust: H.cust.map((c) => ({ id: c.id, state: c.state, table: c.table, dish: c.dish, voice: c.voice, p: c.p, mood: c.mood })) } : null) });
})();
