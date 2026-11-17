'use strict';
// ---------- 外場 in らいらいけん (HALL; 2026-11-15, docs/superpowers/specs/2026-11-15-work-redesign-design.md §6) ----------
// The user: 外送 cut; in its place the hall of a Chinese restaurant one walks into — customers sit down and talk, the hero answers
// with the 入門 greetings and pointing words, running between the tables, the pass and the register. Played in the room itself,
// not on a card: customers come in by the door (a few at a time), a 「！」 over whoever wants the hero. Tap them (or the table, the
// pass, the register, 黄): the hero walks there, the customer says their word — heard, its text shown once answered — and three
// things to say come up at the foot of the screen; the right one moves them on, a wrong one is a miss (two, and the right one
// lights). Their looks put together anew (PASSERS.look), their voices the cruise's passengers' (the hair a man's for a man's voice).
// 外場 2.0 (2026-11-15, the user: too rough — it should feel like you really must answer, customers changing if kept waiting, Japanese
// and tension wherever they are; docs/superpowers/specs/2026-11-15-hall-rush-design.md): each customer's patience wears down while
// they wait on the hero (a countdown over their head), their face going from pleased to put out (💦) to cross (💢), calling again
// (あの、すみません！) and cross (ちょっと！) as it goes; a wrong answer costs some, a quick right one gives some back; a cross one
// wants an apology first (おそい！/ちょっと！ → すみません！); at none they storm out (もう いいです！), the door banged, a star off
// the shop. A shift is six groups (WORK's ctx), each marked as it leaves by its mood; the stars left are 黄's 紅包.
// A customer, and a word of Japanese at every turn: in at the door (いらっしゃいませ; a regular — 周おばあさん, 張さん, 陳 — with
// the time's greeting, answered in kind) → to a free table the hero stands at (こちらへ どうぞ) → sits and calls (すみません！ →
// はい！) → perhaps asks first (「ぎょうざ、ありますか」: はい、あります, or すみません、ちょっと… for what the wall's menu has not;
// 「おすすめは どれですか」: これです, the board in the hero's hand, and that is what they have) → orders, by the dish's name heard
// (its picture picked) or by これ／それ／あれ (the table's menu, the hero's board, the poster) → perhaps おみず ください while it
// cooks → 黄 calls it up by name (「ぎょうざ、あがり！」, the bell), the plate he called picked off the pass → to their table (どうぞ;
// the wrong table: ちがいます → すみません) → eats, and perhaps: おてあらいは どこですか (from a table far from it: あそこです),
// とても おいしいです！ (ありがとうございます), water, the chopsticks dropped (どうぞ → ありがとう → どういたしまして) → to the
// register (いくらですか, its price said, once the numbers are learned; ごちそうさまでした → ありがとうございました; a regular's
// さようなら) → out. Now and then the phone rings at the register (もしもし; らいらいけんですか → はい、そうです, or a wrong number,
// すしやですか → いいえ、ちがいます); left ringing, a star off. Each of these only once its words are learned (WORK.knows).
// The look (spec §4): the words heard come as sound bars over the speaker, in print once answered; the panel shows who is talking
// (their face as it is now), and the room lifts so the hero and they stay above it; the dishes drawn —
// on the cards, the pass, the hero's tray, the table (steaming, then an empty plate); each group in the results, their words to hear again.
// 2026-11-16 (the user): the countdown over the head (a bar, their face at its left — there while they are answered too; none in the
// panel); not everyone stuck at the door — one in at the door at a time, now and then (7–13 s), about a third walking in and sitting
// down at a free table by themselves (すみません！ from there); and more than one word at the door — some ask すみません、いいですか。:
// a table free, はい、どうぞ。; all three taken (four groups in at most), a full house: すみません、ちょっと…。 (sorry), じゃあ、まちます。,
// and they wait by the door, patient (TOLD) and with no 「！」 till a table is free.
const HALL = (() => {
  const api = { pace: 1, pat: 1, force: null };   // the waits' scale and patience's (the tests run them fast or calm); force: { toilet, drop, regular, solo, water, have, osusume, great, price, bye, phone, order, door, self } for the tests
  const VOICES = ['kaneda', 'umeko', 'yuta', 'rina', 'yoshimoto', 'ken', 'ai', 'michiyama', 'mike'];
  const MALE_HAIR = ['短髮', '刺蝟頭', '旁分呆毛', '中分'];
  const MAX = 4, rnd = (a, b) => a + Math.random() * (b - a), pick = (a) => a[Math.floor(Math.random() * a.length)];
  const L = () => TOWN.WORK.say.waiter;
  const NEED = ['in', 'wait', 'call', 'pay', 'drop'];   // a 「！」 over them (and over one with something to ask: c.q)
  // patience (spec §1): how fast each state wears it down (the dish on its way: half as fast; walking, sitting down, eating: not at
  // all — save with something to ask), how long a whole one lasts (s), the moods by what is left, their faces and signs, a group's
  // mark as it leaves (3: stormed out)
  const DRAIN = { in: 1, wait: 1, call: 1, order: 1, food: 0.5, drop: 1, pay: 1 };
  const PAT = () => (inPreStage() ? 60 : 45) * api.pat;
  const MOOD = (p) => (p >= 0.6 ? 'ok' : p >= 0.3 ? 'meh' : 'mad');
  const FACE = { ok: {}, meh: { mouth: 'flat', brows: 'worried' }, mad: { eyes: 'sharp', brows: 'angry', mouth: 'o' } };
  const EMO = { ok: '', meh: '💦', mad: '💢' }, SCORE = { ok: 0, meh: 1, mad: 2 };
  const WRONG = 0.2, RIGHT = 0.05, QUICK = 0.15, QUICK_MS = 5000, SORRY = 0.25, STARS = 3, RING_MS = 20000, TOLD = 0.4, BAR = 226, MARK = 72;   // TOLD: told to wait (a full house), how fast it wears down; BAR: the countdown's top over their feet (words go over it; css .hl-pat), MARK: the 「！」 over it
  // the way to each table's seat from the door side, round the furniture (and back again to the register, or out of the door)
  const VIA = [[[5.0, 4.0]], [[5.0, 3.0], [12.2, 3.0]], [[11.0, 9.3], [13.45, 9.3]]];
  const toSeat = (i) => [[5.0, 12.4], ...VIA[i], RAIRAI.seat(i)], fromSeat = (i) => [...VIA[i].slice().reverse(), [5.0, 11.4], RAIRAI.pay];
  const exitPath = (c) => (c.table >= 0 && c.state !== 'walk' ? [...VIA[c.table].slice().reverse(), [5.0, 12.4], RAIRAI.door] : ['walk', 'leave'].includes(c.state) ? [[5.0, 12.4], RAIRAI.door] : [RAIRAI.door]);
  // the questions answered from the lines as they are: the customer's line (cust), the right answer me[kind] among not[kind]
  const SIMPLE = { call: 'call', sorry: 'wrong', pay: 'pay', toilet: 'toilet', thanks: 'thanks', water: 'water', osusume: 'osusume', great: 'great', bye: 'bye' };
  const FAR = [0, 2];   // the tables far from the toilet door (asked from these only: あそこ, nothing in between)
  const DISHES = () => RAIRAI.MENU.map((m) => m[0]), PRICE = (d) => (RAIRAI.MENU.find((m) => m[0] === d) || [])[1];
  const knows = (...ws) => ws.every((w) => WORK.knows(w));   // 入門's words (past 入門: all of them)
  // a word read so (and written so) learned: N5's words the hall uses (水, まだ, もう, 遅い — learned, whatever the stage: the final
  // review) and the numbers for a price said (as the counter's: 百 and its digit; 十 and 五 for the 50s)
  const learned = (r, w) => REG.vocab.some((v) => v.r === r && (!w || v.w === w) && state.srs[v.key]);
  const DIGIT = { 3: ['さん', '三'], 4: ['よん', '四'], 6: ['ろく', '六'], 7: ['なな', '七'] };
  const readable = (n) => Boolean(DIGIT[Math.floor(n / 100)]) && learned('ひゃく', '百') && learned(...DIGIT[Math.floor(n / 100)]) && (n % 100 === 0 || (learned('じゅう', '十') && learned('ご', '五')));
  const prices = () => (learned('いくら') && learned('えん', '円') ? [...new Set(RAIRAI.MENU.map((m) => m[1]))].filter(readable) : []);
  // something that happens now and then (chance), at most max times a shift; api.force says yes (true) or no (false) for the tests
  const may = (what, chance, max = 2) => { const f = api.force && api.force[what]; if (f === false) return false; if (!f && ((H.used[what] || 0) >= max || Math.random() >= chance)) return false; H.used[what] = (H.used[what] || 0) + 1; keep(); return true; };
  const keep = () => { if (H.ctx.keep) H.ctx.keep({ stars: H.stars, used: Object.assign({}, H.used) }); };   // left mid-shift and back: the stars lost stay lost, the phone rung stays rung
  const HINT = { greet: '客人進門了。', seat: '帶客人到這張桌子。', serve: '把菜端上桌。', phone: '電話響了！接起來要說什麼？' };
  const FACES = ['😊', '😐', '😠', '💢'];   // a group in the results, by its mark
  const WAVE = '<span class="hl-wave" aria-label="（聽）"><i></i><i></i><i></i><i></i><i></i></span>';
  const EMPTY = '<svg class="pic" viewBox="0 0 100 100" aria-hidden="true"><ellipse cx="50" cy="76" rx="36" ry="10.5" fill="#ddd0b6"/><ellipse cx="50" cy="74" rx="36" ry="10.5" fill="#fbf8f0"/><ellipse cx="50" cy="74" rx="27" ry="7" fill="#efe8da"/><path d="M38 72 l3 -1 M56 75 l2 1 M46 77 h2" stroke="#c9a46a" stroke-width="1.6" stroke-linecap="round"/><path d="M60 67 L84 58 M61 70 L85 61.5" stroke="#8a5a3a" stroke-width="1.8" stroke-linecap="round"/></svg>';
  const QTEXT = { door: '客人問可不可以進來。看看還有沒有空桌？', order: '客人要的是哪一個？', dish: '客人點的是哪一道？', pass: '黄さん喊的是哪一盤？', phone2: '對方說了什麼？要回哪一句？', price: '客人問什麼？要回哪一句？' };
  let H = null, seq = 0;   // the shift under way: { ctx, yard, k (groups gone), cust, ask, tray, ready, timers, raf, at, over, stars, streak, used, board, phone }
  const N = () => H.ctx.n;
  const live = () => Boolean(H) && H.yard.isConnected && H.ctx.on();
  const later = (fn, ms) => { const h = H; h.timers.push(setTimeout(() => { if (H === h && live()) fn(); }, ms * api.pace)); };
  const free = (i) => !H.cust.some((c) => c.table === i);
  const shown = (i) => Boolean(H.ask) && H.ask.table === i;   // the table the hero is showing someone to (こちらへ どうぞ up, or the apology before it)
  const here = (c) => Boolean(H) && H.cust.includes(c) && !c.stormed;   // still theirs to see to (not stormed out, not gone; never the caller)
  // a table for them: more free than those waiting before them (in the order they came); none, and nothing to do for one waiting
  const roomFor = (c) => { const i = H.cust.indexOf(c); return [0, 1, 2].filter(free).length > H.cust.slice(0, i < 0 ? H.cust.length : i).filter((x) => x.state === 'wait').length; };
  const need = (c) => (NEED.includes(c.state) && !(c.state === 'wait' && !roomFor(c))) || Boolean(c.q);
  const rate = (c) => (c.q ? 1 : c.state === 'wait' && c.told && !roomFor(c) ? TOLD : DRAIN[c.state] || 0);
  const doorWords = () => knows('すみません', 'いい', 'ちょっと');   // すみません、いいですか。 at the door, and the full house's すみません、ちょっと…。
  const marks = () => H.cust.forEach((x) => { if (x.state === 'wait') mark(x); });   // a table taken or freed: who waiting has one now
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
    c.el.classList.toggle('need', need(c)); c.el.classList.toggle('pat', rate(c) > 0 && !H.over);
    const w = c.el.querySelector('.hl-want'); if (w) w.textContent = c.state === 'food' ? c.dish : ''; c.el.classList.toggle('want', c.state === 'food');
  }
  const over = (c) => {   // words over their head: over the countdown (as high sitting as standing), and over the 「！」 when it shows
    const e = c.el, has = (k) => Boolean(e) && e.classList.contains(k), asked = Boolean(H && H.ask && H.ask.c === c);
    return (has('pat') ? BAR + (has('need') && !asked ? MARK : 0) : has('bench') ? 150 : 190) * ISO.k;
  };
  const pop = (c, text) => { const [X, Y] = isoXY(c.u, c.v); yPop(H.yard, X + 600, 370 - Y - over(c), text); };
  const heroPop = (text) => yPop(H.yard, yh.X + 600, 370 - yh.Y - 190 * ISO.k, text);
  const huangPop = (text) => { const [X, Y] = isoXY(6.9, 0.85); yPop(H.yard, X + 600, 370 - Y - 190 * ISO.k, text); };
  function bubble(c, html, ms) {   // words over someone's head (c, or 黄 for none): the sound bars while heard, the words once answered
    const [X, Y] = c ? isoXY(c.u, c.v) : isoXY(6.9, 0.85);
    return yBubble(H.yard, X + 600, 370 - Y - (c ? over(c) : 190 * ISO.k), html, ms);
  }
  // the table's top: a dish served (steaming), an empty plate once eaten (dish ''), nothing (null); over the table, under no one
  const tableZ = (i) => { const [u, v] = RAIRAI.TABLES[i], p = isoProps.find(({ box }) => Math.abs(box[0] - (u - RAIRAI.R)) < 1e-6 && Math.abs(box[2] - (v - RAIRAI.R)) < 1e-6); return p ? p.z + 1 : 1100; };
  function plate(i, dish) {
    const w = H.yard.querySelector('.yworld'); if (!w) return; let el = w.querySelector(`.hl-plate[data-t="${i}"]`);
    if (dish === null) { if (el) el.remove(); return; }
    if (!el) {
      const [u, v] = RAIRAI.TABLES[i], [X, Y] = isoXY(u + 0.2, v + 0.2, 1.47); el = document.createElement('i'); el.className = 'hl-plate'; el.dataset.t = String(i); el.setAttribute('aria-hidden', 'true');
      el.style.cssText = `left:calc(50% + ${X.toFixed(0)}px);bottom:${(Y - 14).toFixed(0)}px;z-index:${tableZ(i)}`; w.appendChild(el);
    }
    el.classList.toggle('empty', !dish); el.innerHTML = dish ? RAIRAI.dish(dish) : EMPTY;
  }
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
    const v = c.p.toFixed(3); if (v !== c.pv) { c.pv = v; c.el.querySelector('.hl-pat').style.setProperty('--p', v); }   // on the bar alone: on the whole drawing every shape in it was restyled each frame (a phone stuttered, 2026-11-17)
    if (c.p <= 0) { storm(c); return; }
    const m = MOOD(c.p); if (m === c.mood) return;
    const worse = SCORE[m] > SCORE[c.mood]; c.mood = m; face(c);
    if (worse) grumble(c);
  }
  const hit = (c, d) => { if (!here(c)) return; c.p = Math.max(0, Math.min(1, c.p + d)); feel(c); };
  function grumble(c) {   // kept waiting: called again, then cross; the dish slow: まだですか (once まだ is known), else the clock ticks
    if (H.ask && H.ask.c === c) return;   // their question up: the face says it
    const s = L(), line = c.state === 'food' && !c.q ? (learned('まだ') ? s.cust.still : null) : c.mood === 'mad' ? s.cust.hey : s.cust.again;
    if (line) { speakAs(c.voice, line[0]); pop(c, line[0]); } else SND.play('tick', { vol: 0.4 });
  }
  function storm(c) {   // patience gone: up and out, the door banged, a star off the shop, the group marked 3
    const s = L(), path = exitPath(c); c.stormed = true; c.mood = 'mad'; face(c);
    if (H.ask && H.ask.c === c) { H.ask = null; panel(); }
    if (H.tray && H.tray.for === c.id && !(H.ask && H.ask.kind === 'serve')) { H.tray = null; carry(false); }   // being set before another who ordered it: theirs now
    H.ready = H.ready.filter((id) => id !== c.id); readyMark();
    const line = learned('もう') ? s.cust.out : s.cust.out0; speakAs(c.voice, line[0]); pop(c, line[0]);
    if (c.table >= 0) plate(c.table, null);
    H.stars = Math.max(0, H.stars - 1); keep(); c.q = null; c.state = 'out'; c.table = -1; mark(c); marks();
    walk(c, path, () => { SND.play('door-close', { vol: 0.6 }); gone(c); });
    done(c, 3);
  }
  function done(c, n) {   // a group gone: marked (0 pleased … 3 stormed out), one of the shift's six
    H.ctx.right(H.k, n); H.k++; H.streak = n === 0 ? H.streak + 1 : 0; H.log.push({ n, voice: c.voice, said: c.said.slice(0, 3) }); hud();
    if (H.k >= N()) end();
  }
  function hud() {   // at the top: the group now, the shop's stars, the pleased ones in a row
    let el = H.yard.querySelector('.hl-hud'); if (!el) { el = document.createElement('div'); el.className = 'hl-hud'; H.yard.appendChild(el); }
    const n = N();
    el.innerHTML = `<b>第 ${Math.min(H.k + 1, n)}／${n} 組</b><span class="hl-stars" aria-label="店的評價 ${H.stars} 顆星">${'★'.repeat(H.stars)}${'☆'.repeat(STARS - H.stars)}</span>${H.streak >= 2 ? `<span class="hl-streak">連續滿意 ×${H.streak}</span>` : ''}`;
  }
  function walk(c, pts, then) { c.path = pts.slice(); c.then = then; c.el.classList.remove('bench'); c.el.classList.add('walk'); }
  function frame(now) {
    if (!H) return; if (!H.yard.isConnected) { stop(); return; }
    const dt = H.at ? Math.min(0.1, (now - H.at) / 1000) : 0; H.at = now;
    if (dt) H.cust.slice().forEach((c) => { const r = rate(c); if (r && !H.over && !c.stormed) { c.p = Math.max(0, c.p - r * dt / PAT()); feel(c); } });   // drawn frames only: a hidden page waits
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
    if (!ids.length || !knows(...s.hello.map((l) => l[0].replace('。', ''))) || !may('regular', 0.3)) return null;
    const id = pick(ids), C = TOWN.CAST[id]; return { voice: id, look: Object.assign({}, C.look), wear: Object.assign({}, C.wear || {}), regular: true };
  }
  function spawn(o = {}) {   // o.table: walks in and sits down there; o.full: in at the door with every table taken (they ask)
    if (!live() || H.over) return null;
    const self = o.table >= 0, c = Object.assign({ id: 'c' + (++seq), state: 'in', u: RAIRAI.door[0], v: RAIRAI.door[1], table: -1, dish: '', p: 1, mood: 'ok', q: null, reqs: 0, said: [] }, (!self && !o.full && regular()) || person());
    const el = document.createElement('button'); el.type = 'button'; el.className = 'hero npc cust'; el.dataset.act = 'hall-cust'; el.dataset.c = c.id; el.setAttribute('aria-label', '客人');
    el.innerHTML = `${HERO.svg({ look: c.look, wear: c.wear })}<i class="hl-pat" aria-hidden="true"></i><i class="ev-mark hl-mark" aria-hidden="true">！</i><i class="hl-emo" aria-hidden="true"></i><i class="hl-want" lang="ja" aria-hidden="true"></i>`;
    el.dataset.mood = 'ok'; el.querySelector('.hl-pat').style.setProperty('--p', '1');
    H.yard.querySelector('.yworld').appendChild(el); c.el = el; H.cust.push(c);
    if (self) { c.state = 'walk'; c.table = o.table; plate(o.table, null); } else c.asks = !c.regular && doorWords() && (Boolean(o.full) || may('door', 0.4, 6));   // すみません、いいですか。
    put(c); mark(c); SND.play('suzu', { vol: 0.5 });
    if (self) walk(c, [RAIRAI.wait, ...toSeat(o.table)], () => sitDown(c)); else walk(c, [RAIRAI.wait], null);
    return c;
  }
  function more() {   // another now and then, while groups are left: walking in to a free table, or in at the door — one at a time there, no one else at it (every table taken: its words known)
    if (!live() || H.over || (api.force && api.force.solo)) return;   // solo: the tests' one customer
    const inn = H.cust.filter((c) => c.state !== 'out'), open = [0, 1, 2].filter((i) => free(i) && !shown(i)), waiting = inn.filter((c) => c.state === 'in' || c.state === 'wait').length;
    if (inn.length < MAX && N() - H.k - inn.length > 0) {
      if (open.length > waiting && may('self', 0.35, 6)) spawn({ table: pick(open) });
      else if (!waiting && (open.length || doorWords())) spawn({ full: !open.length });
    }
    later(more, rnd(7000, 13000));
  }
  // ---- the hero's dish from the pass ----
  function carry(on) {
    const h = H.yard.querySelector('.yhero'); if (!h) return; let t = h.querySelector('.hl-tray');
    if (on && !t) { t = document.createElement('span'); t.className = 'hl-tray'; t.setAttribute('aria-hidden', 'true'); h.appendChild(t); }
    if (t) { t.innerHTML = on ? RAIRAI.dish(H.tray.dish) : ''; if (!on) t.remove(); }
  }
  function readyMark() {   // a 「！」 over 黄 while a dish waits at the pass
    const hu = H.yard.querySelector('.npc[data-npc="huang"]'); if (!hu) return; let m = hu.querySelector('.hl-mark');
    if (H.ready.length && !m) { m = document.createElement('i'); m.className = 'ev-mark hl-mark'; m.setAttribute('aria-hidden', 'true'); m.textContent = '！'; hu.appendChild(m); }
    if (!H.ready.length && m) m.remove();
  }
  // ---- the phone at the register: it rings a while (a 📞 shaking there), then stops, a star off and 黄's でんわ！ ----
  function ringMark() {
    let el = H.yard.querySelector('.hl-ring'); const on = Boolean(H.phone && !H.phone.picked);
    if (on && !el) {
      const [X, Y] = isoXY(2.4, 9.5); el = document.createElement('i'); el.className = 'hl-ring'; el.setAttribute('aria-hidden', 'true'); el.textContent = '📞';
      el.style.cssText = `left:calc(50% + ${X.toFixed(0)}px);bottom:${(Y + 150 * ISO.k).toFixed(0)}px`; H.yard.querySelector('.yworld').appendChild(el);
    }
    if (!on && el) el.remove();
  }
  function ring() {
    if (H.over || H.phone) return;
    const [u, v] = RAIRAI.at.register;
    const p = H.phone = { id: 'phone', caller: true, voice: pick(VOICES), u, v, mood: 'ok', p: 1, wrong: Math.random() < 0.4, picked: false };
    ringMark();
    const again = () => { if (H.phone !== p || p.picked || H.over) return; if (!document.hidden) SND.play('ring', { vol: 0.7 }); later(again, 1600); };
    again();
    let left = RING_MS;   // rung while the page is seen (a hidden one waits, as patience does)
    const wait = () => { if (H.phone !== p || p.picked || H.over) return; if (!document.hidden) left -= 500; if (left > 0) { later(wait, 500); return; }
      H.phone = null; ringMark(); H.stars = Math.max(0, H.stars - 1); keep(); hud(); const s = L(); speakAs('huang', s.phone[0]); huangPop(s.phone[0]); };
    later(wait, 500);
  }
  // ---- a question: what the hero says ----
  const hour = () => { const h = TOWNEV.now(); return h < 11 ? 0 : h < 17 ? 1 : 2; };   // おはようございます, こんにちは, こんばんは
  const three = (right, from) => shuffle([right, ...shuffle(from.filter((d) => d !== right)).slice(0, 2)]);
  function ask(kind, c, table) {
    const own = !c.caller && !['sorry', 'pass'].includes(kind);   // the customer's own word to the hero (not 黄's, not the phone's)
    if (own && c.mood === 'mad' && !c.sorried) { c.after = { kind, table }; kind = 'late'; }   // cross: their complaint first
    const s = L(); let right, opts, line = SIMPLE[kind] ? s.cust[SIMPLE[kind]] : null, word = '', who = c.voice;
    if (kind === 'late') { line = learned('おそい', '遅い') ? s.cust.slow : s.cust.hey; right = s.me.sorry; opts = shuffle([right, ...s.not.late]).map((o) => o[0]); }
    else if (kind === 'hello') { line = s.hello[hour()]; right = line; opts = s.hello.map((l) => l[0]); }
    else if (kind === 'door') { line = s.cust.may; right = roomFor(c) ? s.me.come : s.me.full; opts = shuffle([s.me.come, s.me.full, pick(s.not.door)]).map((o) => o[0]); }   // a table for them, or a full house
    else if (kind === 'order') {   // これ by the customer (the table's menu), それ by the hero (the board in his hand), あれ across the room (the poster)
      const near = pick(DISHES().filter((d) => d !== 'マーボーどうふ' && d !== H.board));
      const where = { これ: `桌上的菜單：${near}`, それ: `你手上的推薦牌：${H.board}`, あれ: '牆上的海報：マーボーどうふ' };
      word = pick(['これ', 'それ', 'あれ']); line = s.cust.point[word]; right = [where[word]]; opts = [where.これ, where.それ, where.あれ];
      heroPop(`おすすめ：${H.board}`);
    } else if (kind === 'dish') {   // a dish by its name: its picture (and its name) picked
      const d = c.want || (api.force && api.force.dish) || pick(DISHES()); line = s.cust.dish[d]; right = [d]; opts = three(d, DISHES());
    } else if (kind === 'pass') {   // 黄 calls one up by its name: the plate picked (pictures only)
      who = 'huang'; line = s.up[c.dish]; right = [c.dish]; opts = three(c.dish, DISHES());
    } else if (kind === 'have') {   // on the wall's menu or not
      c.have = pick(Object.keys(s.cust.have)); line = s.cust.have[c.have]; right = DISHES().includes(c.have) ? s.me.have : s.me.none;
      opts = shuffle([s.me.have, s.me.none, ...s.not.have]).map((o) => o[0]);
    } else if (kind === 'price') {   // いくらですか: the dish's price, said
      line = s.cust.price; right = s.me.price[PRICE(c.dish)]; opts = three(PRICE(c.dish), prices()).map((n) => s.me.price[n][0]);
    } else if (kind === 'phone') { line = null; right = s.me.phone; opts = shuffle([right, ...s.not.phone]).map((o) => o[0]); }
    else if (kind === 'phone2') { line = c.wrong ? s.call.wrong : s.call.right; right = c.wrong ? s.me.no : s.me.yes; opts = shuffle([s.me.yes, s.me.no, ...s.not.answer]).map((o) => o[0]); }
    else { right = s.me[kind]; opts = shuffle([right, ...shuffle(s.not[kind]).slice(0, 2)]).map((o) => o[0]); }
    if (kind === 'osusume') heroPop(`おすすめ：${H.board}`);
    H.ask = { kind, c, table, word, who, right: right[0], opts, line, wrong: 0, t0: performance.now() };
    if (line) { speakAs(who, line[0]); H.ask.bub = bubble(who === 'huang' ? null : c, WAVE, 60000); if (H.ask.bub) H.ask.bub.classList.add('hl-heard'); }
    if (kind === 'sorry') hit(c, -WRONG / 2);   // a dish set before the wrong one: put out
    panel();
  }
  function panel() {
    const old = H.yard.querySelector('.hl-pick'); if (old) old.remove();
    H.yard.querySelectorAll('.hl-heard').forEach((x) => { if (!H.ask || x !== H.ask.bub) x.remove(); });   // the sound bars go with their question
    H.cust.forEach((x) => x.el.classList.toggle('asked', Boolean(H.ask) && H.ask.c === x));   // the one answered: no 「！」 over the words (their countdown stays)
    const a = H.ask; if (!a) { const h = H; setTimeout(() => { if (H === h && !H.ask) lift(); }, 900); return; }   // down again, unless the next question follows (they come within 700 ms)
    const el = document.createElement('div'); el.className = 'hl-pick';
    const face = a.who === 'huang' ? HERO.head(TOWN.CAST.huang.look, 'bust') : a.c.caller ? '<span class="hl-tel">📞</span>' : HERO.head(Object.assign({}, a.c.look, FACE[a.c.mood]), 'bust');
    const pics = a.kind === 'dish' || a.kind === 'pass';
    const opt = (o, i) => (a.kind === 'order' ? `<small>${esc(o.split('：')[0])}</small>${esc(o.split('：')[1])}`
      : pics ? `${RAIRAI.dish(o)}${a.kind === 'dish' ? `<span>${esc(o)}</span>` : `<span class="hl-n">${i + 1}</span>`}` : esc(o));
    el.innerHTML = `<div class="hl-top"><span class="hl-face" aria-hidden="true">${face}</span><p class="hl-q">${a.line ? `<button type="button" class="hl-ear" aria-label="再聽一次">🔊</button><span>${QTEXT[a.kind] || '客人說了什麼？要回哪一句？'}</span>` : `<span>${esc(HINT[a.kind] || '')}</span>`}</p></div>
      <div class="hl-opts${a.kind === 'order' ? ' hl-where' : ''}${pics ? ' hl-dishes' : ''}">${a.opts.map((o, i) => `<button type="button" class="hl-opt" data-o="${esc(o)}" lang="ja"${a.kind === 'pass' ? ` aria-label="第 ${i + 1} 盤"` : ''}>${opt(o, i)}</button>`).join('')}</div>`;
    el.addEventListener('pointerdown', (e) => e.stopPropagation());
    el.addEventListener('click', (e) => { e.stopPropagation(); primeTtsPlayer(); if (e.target.closest('.hl-ear')) { speakAs(a.who, a.line[0]); return; } const b = e.target.closest('.hl-opt'); if (b) choose(b); });
    H.yard.appendChild(el); lift();
  }
  // the room lifted while the panel is up, so the hero and the one asked (黄 at the pass) stay above it; down again when it goes
  function lift() {
    const y = H.yard, el = y.querySelector('.hl-pick'), w = y.querySelector('.yworld'), was = w ? parseFloat(getComputedStyle(w).bottom) || 0 : 0;   // where the room is now, mid-glide too
    if (!el || !H.ask) { y.style.setProperty('--hl-lift', '0px'); return; }
    const who = [y.querySelector('.yhero'), H.ask.c.el, H.ask.who === 'huang' && y.querySelector('.npc[data-npc="huang"]')].filter(Boolean);
    const low = Math.max(...who.map((x) => x.getBoundingClientRect().bottom)) + was;   // where they would be with the room down
    y.style.setProperty('--hl-lift', `${Math.round(Math.max(0, Math.min(innerHeight * 0.45, low - el.getBoundingClientRect().top + 14)))}px`);
  }
  function choose(b) {
    const a = H.ask; if (!a || !live()) return; const said = b.dataset.o, c = a.c;
    if (a.kind === 'door') a.right = (roomFor(c) ? L().me.come : L().me.full)[0];   // a table freed while it was up: はい、どうぞ。 now
    if (!['order', 'dish', 'pass'].includes(a.kind)) { speakAs('hero', said); heroPop(said); }
    if (said !== a.right) {   // a miss: a shake, a 「？」 from them, some of their patience; two, the right one lights
      a.wrong++; playSfx('bad'); b.classList.remove('wk-bad'); void b.offsetWidth; b.classList.add('wk-bad'); if (a.who === 'huang') huangPop('？'); else pop(c, '？');
      hit(c, -WRONG); if (H.ask !== a) return;   // that was the last of it: gone
      if (a.wrong >= 2) H.yard.querySelectorAll('.hl-opt').forEach((x) => x.classList.toggle('wk-hint', x.dataset.o === a.right));
      return;
    }
    playSfx('good'); H.ask = null; H.lastPick = said; panel();
    if (a.line) { if (a.who !== 'huang' && !c.caller && c.said) c.said.push(a.line); setTimeout(() => { if (H && H.yard.isConnected) bubble(a.who === 'huang' ? null : c, esc(a.line[0]), 2400); }, 450); }   // what they said, in print now
    const quick = performance.now() - a.t0 <= QUICK_MS; hit(c, quick ? QUICK : RIGHT); if (quick && here(c)) emo(c, '♪');
    if (a.kind === 'late') {   // sorry said: a little better, and what they wanted comes next
      c.sorried = true; hit(c, SORRY); const f = c.after; c.after = null;
      later(() => { if (!H.ask && here(c) && f && (f.kind !== 'seat' || free(f.table))) ask(f.kind, c, f.table); }, 600); return;
    }
    next(a);
  }
  // ---- what follows each right answer ----
  const soon = (c, kind, ms = 600) => later(() => { if (!H.ask && here(c) && c.q === kind) ask(kind, c); }, ms);   // their next question, the hero still there
  function want(c, kind) { if (!here(c)) return; c.q = kind; c.reqs++; mark(c); speakAs(c.voice, L().cust.call[0]); pop(c, '！'); }   // すみません！ and a 「！」: something to ask
  function sitDown(c) {   // at the table: a moment, then すみません！
    const s = L(); c.state = 'sit'; c.el.classList.add('bench'); put(c); mark(c);
    later(() => { if (!here(c)) return; c.state = 'call'; mark(c); speakAs(c.voice, s.cust.call[0]); pop(c, '！'); }, rnd(2500, 4500));
  }
  function next({ kind, c, table, right }) {
    const s = L();
    if (kind === 'greet' || kind === 'hello') { c.state = 'wait'; mark(c); return; }
    if (kind === 'door') {   // はい、どうぞ。, or the full house apologised for: じゃあ、まちます。 and they wait, patient
      c.state = 'wait'; c.told = right === s.me.full[0]; mark(c);
      if (c.told) later(() => { if (!here(c)) return; speakAs(c.voice, s.cust.wait[0]); pop(c, s.cust.wait[0]); }, 500);
      return;
    }
    if (kind === 'seat') {
      if (!free(table)) { heroPop('…'); mark(c); return; }   // someone walked in and sat there first: another table, then
      c.state = 'walk'; c.table = table; mark(c); marks(); plate(table, null);
      walk(c, toSeat(table), () => sitDown(c));
      return;
    }
    if (kind === 'call') {   // はい！: first perhaps a question about the menu, then the order
      c.state = 'order';
      const pre = shuffle([knows('ある', 'ちょっと', 'すみません') && 'have', knows('どれ', 'これ', 'それ') && 'osusume'].filter(Boolean)).find((k) => may(k, 0.35));
      const f = api.force && api.force.order, k = pre || f || (knows('これ', 'それ', 'あれ') && Math.random() < 0.5 ? 'order' : 'dish');
      c.q = k; mark(c); soon(c, k); return;
    }
    if (kind === 'have') { c.want = DISHES().includes(c.have) ? c.have : null; c.q = 'dish'; mark(c); soon(c, 'dish', 700); return; }   // there is: that one; there is not: another, by its name
    if (kind === 'osusume') { c.q = null; c.dish = H.board; later(() => { if (!here(c)) return; speakAs(c.voice, s.cust.that[0]); pop(c, s.cust.that[0]); cook(c); }, 600); return; }
    if (kind === 'order') { c.q = null; c.dish = H.lastPick.split('：')[1]; cook(c); return; }
    if (kind === 'dish') { c.q = null; c.want = null; c.dish = H.lastPick; cook(c); return; }
    if (kind === 'pass') { H.ready = H.ready.filter((id) => id !== c.id); H.tray = { for: c.id, dish: c.dish }; carry(true); readyMark(); SND.play('dishes', { vol: 0.5 }); return; }
    if (kind === 'water') { c.q = null; mark(c); SND.play('pour', { vol: 0.5 }); if (c.state === 'eat') eatOn(c); return; }
    if (kind === 'toilet') { c.q = null; mark(c); pop(c, s.cust.thanks[0]); eatOn(c); return; }
    if (kind === 'great') { c.q = null; mark(c); emo(c, '♪'); eatOn(c); return; }
    if (kind === 'thanks') { c.state = 'eat'; mark(c); eatOn(c); return; }
    if (kind === 'serve') { if (H.tray.for !== c.id) handOver(c, H.tray.for); H.tray = null; carry(false); plate(c.table, c.dish); eat(c); return; }
    if (kind === 'price') { later(() => { if (!H.ask && here(c) && c.state === 'pay') ask('pay', c); }, 400); return; }
    if (kind === 'pay') {
      if (c.regular && knows('さようなら') && may('bye', 1, 3)) { c.q = 'bye'; soon(c, 'bye', 400); return; }   // a regular's さようなら first
      out(c); return;
    }
    if (kind === 'bye') { c.q = null; out(c); return; }
    if (kind === 'phone') { const on = () => { if (H.phone !== c) return; if (H.ask) { later(on, 400); return; } ask('phone2', c); }; later(on, 400); return; }   // another question up first (one at the register): the caller waits on the line
    if (kind === 'phone2') { H.phone = null; ringMark(); SND.play('switch', { vol: 0.4 }); }
  }
  function handOver(c, id) {   // another's dish (the same) set before c: theirs comes up in c's place — at the pass now, or once c's is done
    const t = H.cust.find((x) => x.id === id), to = t && here(t) && t.state === 'food' ? id : null;   // gone meanwhile: no one's to come up
    if (H.ready.includes(c.id)) H.ready = to ? H.ready.map((x) => (x === c.id ? to : x)) : H.ready.filter((x) => x !== c.id); else c.passTo = to;
    readyMark();
  }
  function out(c) { c.q = null; c.state = 'out'; mark(c); walk(c, [RAIRAI.door], () => gone(c)); done(c, SCORE[c.mood]); }
  // 黄 at it: はいよ！; perhaps water asked for meanwhile; then its name called and the bell
  function cook(c) {
    const s = L(); c.state = 'food'; mark(c); huangPop(s.order[0]);
    if (c.reqs < 2 && learned('みず', '水') && may('water', 0.3)) later(() => { if (here(c) && c.state === 'food' && !c.q) want(c, 'water'); }, rnd(1500, 3000));
    later(() => { let to = c; while (to && to.passTo) to = H.cust.find((x) => x.id === to.passTo); if (!to || !here(to) || to.state !== 'food') return; H.ready.push(to.id); readyMark(); SND.play('ding', { vol: 0.7 }); speakAs('huang', s.up[c.dish][0]); huangPop('🔔'); }, rnd(5000, 7000));
  }
  // eating: いただきます; perhaps one thing wanted on the way (the toilet from a far table, a word of praise, water, the chopsticks
  // dropped); おいしい; off to pay
  const EAT = [['toilet', (c) => FAR.includes(c.table) && knows('あそこ') && learned('おてあらい', 'お手洗い'), 0.4], ['great', () => knows('とても', 'おいしい'), 0.4], ['water', () => learned('みず', '水'), 0.3], ['drop', () => knows('どういたしまして'), 0.25]];
  function eat(c) {
    const s = L(); c.state = 'eat'; mark(c);
    later(() => { if (!here(c)) return; pop(c, s.cust.eat[0]);
      const ev = c.reqs < 2 ? (shuffle(EAT.slice()).find(([k, ok, ch]) => ok(c) && may(k, ch)) || [])[0] : null;
      if (ev === 'drop') { later(() => { if (!here(c)) return; c.state = 'drop'; mark(c); pop(c, 'あっ！'); SND.play('dishes', { vol: 0.4 }); }, 1500); return; }
      if (ev) { later(() => want(c, ev), 1800); return; }
      eatOn(c); }, 600);
  }
  function eatOn(c) { const s = L(); later(() => { if (!here(c) || c.q) return; pop(c, s.cust.yum[0]); later(() => leave(c), 2500); }, 2500); }
  function leave(c) { if (!here(c) || c.state !== 'eat' || c.q) return; const t = c.table; c.state = 'leave'; c.table = -1; mark(c); marks(); plate(t, ''); walk(c, fromSeat(t), () => { c.state = 'pay'; mark(c); }); }
  function gone(c) { c.el.remove(); if (H) H.cust = H.cust.filter((x) => x !== c); }
  function end() {
    const s = L(); H.over = true;
    const groups = H.log.length ? `<div class="crr-groups" aria-label="每組客人">${H.log.map((g) => `<div class="crr-g"><span class="crr-face">${FACES[g.n]}</span><span class="crr-says">${g.said.map((l) => `<button type="button" class="crr-say" data-who="${esc(g.voice)}" data-say="${esc(l[0])}" lang="ja">🔊 ${esc(l[0])}</button>`).join('') || '<em>…</em>'}</span></div>`).join('')}</div>` : '';
    H.ctx.finish({ tip: H.stars * 10, tipName: '店長紅包', html: groups }, 1800); carry(false); H.ready = []; readyMark(); H.phone = null; ringMark();
    if (H.ask) { H.ask = null; panel(); }
    setTimeout(() => { if (!H || !H.yard.isConnected) return; speakAs('huang', s.end[0]); huangPop(s.end[0]); }, 700);
    H.cust.forEach((c) => { if (c.state === 'out') return; const path = exitPath(c); c.q = null; c.state = 'out'; c.table = -1; mark(c); walk(c, path, () => gone(c)); });
  }
  // ---- the hero sent somewhere (a customer, 黄, a table, the register…) ----
  function at(yard, k) {
    if (!live() || H.over || H.ask) return;
    const find = (f) => H.cust.find(f), s = L();
    if (k === 'entry') { const c = find((q) => q.state === 'in'); if (c) ask(c.regular ? 'hello' : c.asks ? 'door' : 'greet', c); return; }
    if (k === 'register') {
      if (H.phone && !H.phone.picked) { H.phone.picked = true; ringMark(); ask('phone', H.phone); return; }   // the phone first: it stops
      const c = find((q) => q.state === 'pay'); if (!c) return;
      if (c.q === 'bye') { ask('bye', c); return; }
      const ps = prices(); if (!c.priced && ps.length >= 3 && ps.includes(PRICE(c.dish)) && may('price', 0.5, 6)) { c.priced = true; ask('price', c); return; }
      ask('pay', c); return;
    }
    if (k === 'pass') {
      if (H.tray || !H.ready.length) { heroPop('…'); return; }   // hands full, or nothing up
      const c = find((q) => q.id === H.ready[0]); if (c) ask('pass', c); return;
    }
    if (k.startsWith('table')) {
      const i = Number(k.slice(5)), c = find((q) => q.table === i);
      if (!c) { const w = find((q) => q.state === 'wait'); if (w) ask('seat', w, i); return; }
      if (c.state === 'call') { ask('call', c); return; }
      if (c.q) { ask(c.q, c); return; }
      if (c.state === 'drop') { speakAs('hero', s.me.serve[0]); heroPop(s.me.serve[0]); setTimeout(() => { if (live() && !H.ask && c.state === 'drop') ask('thanks', c); }, 700); return; }   // the chopsticks handed back: どうぞ, and their thanks
      if (c.state === 'food' && H.tray) ask(H.tray.for === c.id || H.tray.dish === c.dish ? 'serve' : 'sorry', c);   // the same dish ordered here too: theirs as well
    }
  }
  const spotOf = (c) => (c.state === 'in' ? 'entry' : c.state === 'pay' ? 'register' : (['call', 'food', 'drop'].includes(c.state) || c.q) && c.table >= 0 ? 'table' + c.table : null);
  function go(k) {   // walk over, then see what is wanted there
    const yard = H.yard, u = k.startsWith('table') ? RAIRAI.at.table(Number(k.slice(5))) : RAIRAI.at[k];
    yHeroWalk(yard, isoXY(...u), () => at(yard, k));
  }
  function tap(el) {
    if (!live() || H.ask) return; const c = H.cust.find((q) => q.id === el.dataset.c); if (!c) return;   // a question up: answered first
    if (c.state === 'wait') { heroPop(roomFor(c) ? 'どこに しよう…' : '…'); toast(roomFor(c) ? '點一張空桌子，帶客人過去。' : '桌子都坐滿了，等有空桌再帶位。', 2600); return; }
    const k = spotOf(c); if (k) go(k);
  }
  function stop() {
    if (!H) return; H.timers.forEach(clearTimeout); cancelAnimationFrame(H.raf);
    if (H.yard.isConnected) { H.cust.forEach((c) => c.el.remove()); H.yard.querySelectorAll('.hl-pick, .hl-hud, .hl-ring, .hl-plate, .hl-heard').forEach((x) => x.remove()); H.yard.style.setProperty('--hl-lift', '0px'); H.tray = { dish: '' }; carry(false); H.ready = []; readyMark(); }
    H = null;
  }
  function run(ctx) {
    stop();
    const yard = document.querySelector('.yard'); if (!yard || yard.dataset.place !== 'rairai') return;
    const kept = ctx.kept || {};
    H = { ctx, yard, k: ctx.done, cust: [], ask: null, tray: null, ready: [], timers: [], raf: 0, at: 0, over: false, used: Object.assign({}, kept.used), lastPick: '', stars: Number.isFinite(kept.stars) ? kept.stars : STARS, streak: 0, phone: null, log: [],
      board: pick(DISHES().filter((d) => d !== 'マーボーどうふ')) };   // today's おすすめ on the board in the hero's hand (the poster's is マーボーどうふ)
    H.raf = requestAnimationFrame(frame); hud();
    spawn(); later(more, rnd(5000, 8000));
    if (knows('もしもし', 'そうです', 'ちがいます') && may('phone', 0.7, 1)) later(ring, rnd(20000, 50000));
  }
  function lines(add) {
    const s = L(), flat = (x) => (Array.isArray(x) ? (typeof x[0] === 'string' ? [x] : x.flatMap(flat)) : x && typeof x === 'object' ? Object.values(x).flatMap(flat) : []);
    flat(s.me).concat(flat(s.not), s.hello).forEach((l) => add('hero', l[0]));
    const said = flat(s.cust).concat(flat(s.call));
    VOICES.concat(s.regulars).forEach((v) => said.forEach((l) => add(v, l[0])));
    s.regulars.forEach((v) => s.hello.forEach((l) => add(v, l[0])));
    flat([s.order, s.end, s.phone, s.up]).forEach((l) => add(s.who, l[0]));
  }
  WORK.register('waiter', { run, lines });
  return Object.assign(api, { run, at, tap, lines, stop, spawn: () => (H ? spawn() : null), ring: () => { if (live()) ring(); },
    on: () => live() && !H.over, goPass: () => { if (live()) go('pass'); },
    now: () => (H ? { k: H.k, over: H.over, stars: H.stars, streak: H.streak, board: H.board, phone: Boolean(H.phone && !H.phone.picked),
      ask: H.ask && { kind: H.ask.kind, word: H.ask.word, right: H.ask.right, opts: H.ask.opts.slice(), line: H.ask.line && H.ask.line[0] }, tray: H.tray && Object.assign({}, H.tray), ready: H.ready.slice(),
      cust: H.cust.map((c) => ({ id: c.id, state: c.state, table: c.table, dish: c.dish, voice: c.voice, p: c.p, mood: c.mood, q: c.q, spot: spotOf(c) })) } : null) });
})();
