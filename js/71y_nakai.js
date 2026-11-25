'use strict';
// ---------- 仲居 (2026-11-24, 湯の花温泉の打工; docs/superpowers/specs/2026-11-23-onsen-work-design.md §5.2) ----------
// 千代's job at 旅館「花月」 (m8, 220 円): three rooms readied before their guests come — 桜の間, 菊の間, 松の間, the same room with its
// own scroll and flowers (washitsuArt) — seen front-on in the card, every thing in it there to tap (open/shut, on/off, laid/put away,
// set out/taken away). Each room: 千代 first asks what it is like now (a check, answered off the room: 他動詞 + てある, 自動詞 + ている),
// then says what to do before the guests come (2–4 instructions, heard first: 他動詞 + ておく), against the 「お客様 到着まで」 countdown
// (held while she speaks, red for its last 10 s with her 「いそいで！」; what is not done when it runs out fails); then a guest comes in
// and remarks on the room, and the hero says what was done beforehand (他動詞 + ておきました — a 自動詞 never takes ておく). The spec's
// numbers all hold so: ten things to do a shift (the rooms 2–4 each), with the three checks and three guests: 16 tasks. A thing
// tapped that is not it: 千代's 「それは ちがいますよ。」 and it goes back as it was. Its fun ones: the inn's cat asleep where a futon is
// to go (tapped: off with ニャ, never a miss); 千代 now and then finding a thing seen to already (「あら、窓は もう 開けて ありますね。」).
// Every line through JOBS' lane (ruling 27): none cuts another, the shift's last ones said before its results.
const NAKAI = (() => {
  const T = () => TOWN.ONSEN.nakai;
  const ROOMS = [['sakura', '桜', 'さくら'], ['kiku', '菊', 'きく'], ['matsu', '松', 'まつ']];
  const SLOTS = { futon: 3, zabuton: 4 };   // the futons' and the cushions' places (washitsuArt): one laid where it is tapped
  const KEYS = ['window', 'shoji', 'light', 'ac', 'tv', 'futon', 'zabuton', 'tea', 'yukata', 'flower'];
  // a thing ready for its guests (open, on, set out — the TV off); a room as it is at a shift's start where nothing asks after a thing
  // (lit, the cushions round the 座卓)
  const READY = { window: true, shoji: true, light: true, ac: true, tv: false, tea: true, yukata: true, flower: true };
  const PLAIN = { window: false, shoji: false, light: true, ac: false, tv: false, futon: 0, zabuton: 4, tea: false, yukata: false, flower: false };
  const CHECKS = ['tea', 'yukata', 'flower', 'window', 'light', 'ac', 'tv', 'shoji'];   // what 千代 asks after
  const GUESTS = ['window', 'shoji', 'ac', 'light', 'tea', 'flower', 'yukata', 'futon'];   // what a guest remarks on — those of a pair (three replies) first
  const SELF = ['window', 'tea', 'flower', 'yukata'];   // what she may find seen to already
  const { rng, pickR, shuffleR } = JOBS;   // a shift's own dice (JOBS', the 案内所's too): the same seed, the same rooms
  const places = (n, size) => Array.from({ length: size }, (_, i) => i < n);
  const count = (v) => (Array.isArray(v) ? v.filter(Boolean).length : Number(v) || 0);
  // a room's state (washitsuArt's): each thing, the futons' and cushions' places, the room (its scroll and flowers), the cat
  const roomState = (room) => { const st = { room, cat: false }; KEYS.forEach((k) => { st[k] = SLOTS[k] ? places(PLAIN[k], SLOTS[k]) : PLAIN[k]; }); return st; };
  const isReady = (st, key) => (SLOTS[key] ? count(st[key]) > 0 : st[key] === READY[key]);
  const meets = (st, [key, v]) => (SLOTS[key] ? count(st[key]) === v : st[key] === v);
  const put = (st, [key, v]) => { st[key] = SLOTS[key] ? places(v === true ? 2 : Number(v) || 0, SLOTS[key]) : v; };
  const notYet = (st, [key, v]) => { st[key] = SLOTS[key] ? places(0, SLOTS[key]) : !v; };   // as an instruction finds it
  // a room with only that one thing ready (the tests', the generator's: what a guest says of it)
  const readyState = (key, room = 'sakura') => { const st = roomState(room); KEYS.forEach((k) => { if (SLOTS[k]) st[k] = places(0, SLOTS[k]); else st[k] = !READY[k]; }); put(st, [key, SLOTS[key] ? 2 : READY[key]]); return st; };
  // 千代's check of a thing as the room has it (on: as she wants it): the right reply, the other fact, and a 自動詞 + てある where the
  // thing has a pair — two where no clean third exists (ruling 1) — each [Japanese, 中文 or why, right, how wrong: 'fact' | 'form' | '']
  function check(key, on, R) {
    const C = T().check[key], right = on ? C.yes : C.no, other = on ? C.no : C.yes;
    const opts = [[right[0], right[1], true, ''], [other[0], C.fact[on ? 0 : 1], false, 'fact']].concat(C.form ? [[C.form[0][on ? 0 : 1], C.form[1], false, 'form']] : []);
    return { kind: 'check', key, on, line: C.q, opts: R ? shuffleR(opts, R) : opts };
  }
  // a guest coming in: they remark on what is so in the room as it stands (st) — what was planned for them if it is, else the first
  // thing that is (those of a pair first), one no guest has spoken of this shift if there is such (used); never a thing this room's
  // instructions (wants: their targets) wanted the other way — 「窓を 閉めて」 left undone, its window still open, is no 「窓が 開いて
  // いますね」 (ruling 33: the reply would claim it was opened on purpose); the room keeps a thing untouched for that (make)
  function guest(st, plan, used = [], R, wants = []) {
    const other = (key) => wants.some(([k, v]) => k === key && typeof v === 'boolean' && v !== READY[k]);
    const G = T().guest, so = GUESTS.filter((key) => G[key] && isReady(st, key) && !other(key)), order = (plan && so.includes(plan) ? [plan] : []).concat(so.filter((x) => x !== plan));
    const key = order.find((x) => !used.includes(x)) || order[0]; if (!key) return null;
    const [who, line, right, wrong, after] = G[key], opts = [[right[0], right[1], true, '']].concat(wrong.map(([ja, why, how]) => [ja, why, false, how]));
    return { kind: 'guest', key, plan: plan || null, who, line, opts: R ? shuffleR(opts, R) : opts, after };
  }
  // how long a room's countdown runs (s), for the instructions still to do there: a little to begin, then each (a futon or a cushion
  // more for each more to lay) — the one formula (the runner's clock)
  const secsFor = (dos) => 14 + dos.reduce((a, t) => a + 8 + (SLOTS[t.key] ? 2 * (t.target[1] - 1) : 0), 0);
  // the rooms' instructions: WORK's n (16) less a check and a guest a room — ten — split 2–4 a room, each way it splits (the order the
  // split was first picked in: 3+3+4, then 2+4+4); n is the one source of the shift's length
  const splits = (total) => { const out = []; for (let x = 4; x >= 2; x--) for (let y = x; y <= 4; y++) { const z = total - x - y; if (z >= y && z <= 4) out.push([x, y, z]); } return out; };
  const instructions = () => (WORK.PLACES.nakai || {}).n - 2 * ROOMS.length;
  // what may be left set from a room's start for a guest to remark on, untouched by any instruction (I-1, fix round 1): first the
  // things that are only set out, then those with a pair — a room uses at most six things (its check, four instructions, one found
  // seen to), so two of these eight are always free
  const FALLBACK = ['flower', 'tea', 'yukata', 'light', 'ac', 'window', 'shoji', 'futon'];
  // a shift: { seed, rooms: [{ id, name, kana, start, tasks, cat, self }], tasks } — each room its check first (a thing, as 千代
  // wants it or not yet: then her first instruction is to see it done — じゃあ、…て おいて ください), then its instructions (2–4, ten in
  // the shift: one thing each, as yet not so), its guest last (planned on what the room will be once done: a thing the hero set out
  // first, those of a pair first, no guest's thing twice in a shift). The cat asleep where a futon is to go in one room in about half
  // the shifts; 千代 finding one thing seen to in one room in about half. Every room has, from its start, a thing a guest may remark on
  // that no instruction touches — so a guest has something true to say even when the countdown beat the hero. u: the unit reached
  // (the job's grammar is m8's at any unit)
  function make(u = TOWNEV.reachedIdx(), seed = 1 + Math.floor(Math.random() * 2147483646)) {
    const ways = splits(instructions()); if (!ways.length) throw new Error(`仲居: ${instructions()} instructions do not split 2–4 over three rooms (WORK.PLACES.nakai.n)`);
    const R = rng(seed), D = T().do, ids = Object.keys(D), nDo = shuffleR(pickR(ways, R), R);
    const catRoom = R() < 0.5 ? Math.floor(R() * 3) : -1, selfRoom = R() < 0.5 ? Math.floor(R() * 3) : -1, said = [];
    const rooms = ROOMS.map(([id, name, kana], ri) => {
      const st = roomState(id), used = new Set(), dos = [], ck = pickR(CHECKS, R), C = T().check[ck], on = R() < 0.5;
      used.add(ck); put(st, [ck, on ? C.want : !C.want]);
      if (!on) dos.push({ kind: 'do', id: 'then', key: ck, target: [ck, C.want], line: C.then });
      const pool = shuffleR(ids, R); if (ri === catRoom) { const f = pool.findIndex((x) => D[x][0] === 'futon'); pool.unshift(pool.splice(f, 1)[0]); }   // where the cat sleeps, a futon to lay
      for (const x of pool) { if (dos.length >= nDo[ri]) break; const [key, v, ja, zh] = D[x]; if (used.has(key)) continue; used.add(key); dos.push({ kind: 'do', id: x, key, target: [key, v], line: [ja, zh] }); notYet(st, [key, v]); }
      const cat = ri === catRoom && dos.some((t) => t.key === 'futon'); st.cat = cat;
      const free = shuffleR(SELF.filter((k) => !used.has(k)), R), self = ri === selfRoom && free.length ? free[0] : null;
      if (self) { put(st, [self, READY[self]]); used.add(self); }
      // something true for a guest to say however the countdown goes: a thing so from the start that no instruction touches (never
      // silently none: a room that could not keep one is a bug, said so)
      if (!GUESTS.some((key) => !dos.some((t) => t.key === key) && isReady(st, key))) {
        const f = FALLBACK.find((key) => !used.has(key)); if (!f) throw new Error(`仲居: room ${id} of seed ${seed} has nothing a guest may remark on`);
        put(st, [f, SLOTS[f] ? 2 : READY[f]]); used.add(f);
      }
      const end = JSON.parse(JSON.stringify(st)), wants = dos.map((t) => t.target); dos.forEach((t) => put(end, t.target));   // the room once all is done
      const made = GUESTS.filter((key) => dos.some((t) => t.key === key) && isReady(end, key)), plan = made.find((key) => !said.includes(key)) || made[0] || null;
      const g = guest(end, plan, said, R, wants); said.push(g.key);
      return { id, name, kana, start: st, tasks: [check(ck, on, R), ...dos, g], cat, self };
    });
    const tasks = []; rooms.forEach((rm, ri) => rm.tasks.forEach((t) => { t.room = ri; t.k = tasks.length; tasks.push(t); }));
    return { seed, rooms, tasks };
  }
  return { make, check, guest, readyState, rng, count, meets, isReady, put, secsFor, tap: (key, i) => NAKAI_RUN.tap(key, i), speed: 1, ROOMS, KEYS, SLOTS, READY, CHECKS, GUESTS, SELF };
})();

// ---- the card: the room plate and the countdown over 桜の間 front-on (washitsuArt: every thing its own tap), under it whoever speaks
// (千代's face and her words, a guest's — heard first, 🔊), the replies to a check or a guest, and 千代's word or the hero's ----
const NAKAI_RUN = (() => {
  const MARK = /\{([^|}]+)\|([^|}]+)(?:\|[^}]+)?\}/g, ruby = (s) => esc(s).replace(MARK, '<ruby>$1<rt>$2</rt></ruby>');
  const S = () => TOWN.ONSEN.nakai.say;
  // each thing's sound as it changes, either way: the window's glass sash, the shoji's paper, the light's switch, the remote's ピッ,
  // a futon put down, a cushion, the tea things, the folded yukata, the flowers' stems
  const SOUND = { window: 'slide-door', shoji: 'fusuma', light: 'switch', ac: 'ic', tv: 'ic', futon: 'flop', zabuton: 'cushion', tea: 'dishes', yukata: 'cloth', flower: 'rustle' };
  const WRONG_MS = 650, CAT_MS = 560;   // a wrong thing shown changed, then put back; the cat on its way
  let runs = 0, snap = null, tapper = null;   // the shift under way (the tests: now(); tap())
  function run(ctx) {
    const mine = ++runs, seed = Number(ctx.kept && ctx.kept.seed) || 1 + Math.floor(Math.random() * 2147483646);
    if (!(ctx.kept && ctx.kept.seed)) ctx.keep({ seed });   // the rooms kept with the day's record: the same after a break
    const shift = NAKAI.make(TOWNEV.reachedIdx(), seed), tasks = shift.tasks, N = tasks.length, SL = NAKAI.SLOTS;
    const first = !Object.values(state.work.res).some((r) => r.place === 'nakai' && r.yen !== undefined);
    // this run's own card (box, once drawn): a shift's goodbye still being said never touches the next one's card (Task 4)
    let box = null; const el = (q) => (box && box.isConnected ? box.querySelector(q) : null);
    const live = () => mine === runs && Boolean(el('.nk-art')) && ctx.on();
    let k = ctx.done, ri = -1, st = null, t = null, phase = 'hi', miss = 0, missed = 0, lost = 0, busy = false, catGo = false, P = null, total = 0, hurried = false, hint = false, seen = null, wake = null, selfAt = -1;
    const guests = ((ctx.kept && ctx.kept.guests) || []).slice();   // the things the guests so far spoke of (no guest's twice in a shift)
    const until = () => new Promise((ok) => { wake = ok; }), fire = (v) => { const w = wake; wake = null; if (w) w(v); };
    const clone = (o) => JSON.parse(JSON.stringify(o));
    const keepNow = () => { if (st) ctx.keep({ seed, room: ri, st: clone(st), guests: guests.slice() }); };   // the room as it stands: a break takes it up so
    snap = () => (mine === runs ? { k, task: t, room: ri, st: st && clone(st), phase, seed, busy: busy || catGo } : null);
    tapper = (key, i) => { if (mine !== runs || !live()) return false; thing(key, i); return true; };
    const face = (id) => TOWNEV.face(id);
    const setN = () => { const n = el('.wk-n'); if (n) n.textContent = `${Math.min(k + 1, N)}／${N}`; };
    // whoever speaks now — 千代 (an instruction, a check) or a guest: their face, their words heard first (🔊), shown once done, after
    // two misses (or one, with only the right one left), or once the countdown ran out
    function who(id) {
      const f = el('.nk-face'), r = el('.nk-task'); if (!f || !r) return; const back = r.classList.contains('nk-bye');   // a guest gone: the row back for whoever speaks next
      r.classList.remove('nk-bye'); if (f.dataset.who === id && !back) return;
      f.dataset.who = id; f.innerHTML = face(id); r.classList.remove('nk-come'); void r.offsetWidth; r.classList.add('nk-come');
    }
    const bubHtml = (open, [ja, zh], ear = true) => `${ear ? `<button type="button" class="wk-ear nk-ear" aria-label="再聽一次">${icon('speaker')}</button>` : ''}${open ? `<b lang="ja">${ruby(ja)}</b><span>${esc(zh)}</span>` : '<b class="nk-dots">……</b>'}`;
    function bub(open, line) {
      const b = el('.nk-bub'); if (!b || !t) return;
      b.innerHTML = bubHtml(open, line || t.line, !line);
      if (!open && !line) JOBS.hold(b, [bubHtml(true, t.line)].concat(t.after ? [bubHtml(true, t.after, false)] : []));   // a task (a guest) begun: as tall as its words (2026-11-25)
      b.classList.toggle('nk-open', Boolean(open));
    }
    // 千代's word beside the hero, shown as it is said — or the hero's reply (Japanese with its reading; its 中文 on the job's first
    // shift only, ruling 23: under the reply once said, never under the buttons)
    function talk(id, html, cls = '') { const p = el('.nk-talk'); if (!p) return; p.dataset.who = id; const m = p.querySelector('.nk-mini'); if (m.dataset.who !== id) { m.dataset.who = id; m.innerHTML = face(id); } const s = p.querySelector('.wk-say'); s.innerHTML = html; s.className = 'wk-say' + (cls ? ' ' + cls : ''); }
    const word = ([ja, zh], cls = '') => { if (!el('.nk-talk')) return Promise.resolve(); talk('chiyo', `<b lang="ja">${ruby(ja)}</b><span>${esc(zh)}</span>`, cls); return speakAs('chiyo', ja); };
    const sayWord = (l, cls) => JOBS.queue(() => word(l, cls), box);   // after any line being said (ruling 27)
    const me = ([ja, zh]) => { if (!el('.nk-talk')) return Promise.resolve(); talk('hero', `<b lang="ja">${ruby(ja)}</b>${first ? `<span>${esc(zh)}</span>` : ''}`, 'nk-me'); return speakAs('hero', ja); };
    function opts(on) {
      const o = el('.nk-opts'), c = el('.cls-card'); if (!o) return;
      o.innerHTML = on ? t.opts.map(([ja], i) => `<button type="button" class="btn nk-opt" data-o="${i}" lang="ja"><span>${ruby(ja)}</span></button>`).join('') : '';
      if (c) c.classList.toggle('nk-ask', Boolean(on));   // a short phone: the room drawn a little smaller while a reply is picked
    }
    // the room drawn (washitsuArt); a thing just changed comes in with a little pop (laid ones dropping in) while the old fades out,
    // a thing put back its own way — the light: the whole room dims or brightens
    const SEL = (key, i) => `[data-k="${key}"]${i !== undefined ? `[data-i="${i}"]` : ''}`;
    const hintEls = (a) => { const [key] = t.target; return [...a.querySelectorAll(SEL(key))].filter((g) => !SL[key] || (!st[key][Number(g.dataset.i)] && !(key === 'futon' && g.dataset.i === '0' && st.cat))); };
    function draw(key, i, how = 'nk-in') {
      const a = el('.nk-art'); if (!a || !st) return;
      const sel = key ? SEL(key, SL[key] ? i : undefined) : '', old = sel ? [...a.querySelectorAll(sel)].map((g) => g.cloneNode(true)) : [], dim = key === 'light' && a.querySelector('.rk-dim'), dimOld = dim ? dim.cloneNode(true) : null;
      a.innerHTML = washitsuArt(st);
      const svg = a.querySelector('svg'); if (!svg) return;
      // a light over the thing itself (its tap area: drawn last in its group, over what it shows): the one asked for after two misses,
      // the one 千代 found seen to
      const over = (g, cls) => { const r = g.querySelector('rect'); if (!r) return; const c = r.cloneNode(false); c.removeAttribute('fill'); c.removeAttribute('fill-opacity'); c.setAttribute('rx', '6'); c.setAttribute('class', cls); g.appendChild(c); };
      if (hint && t && t.kind === 'do') hintEls(a).forEach((g) => { g.classList.add('nk-hint'); over(g, 'nk-glow'); });
      if (seen) a.querySelectorAll(SEL(seen)).forEach((g) => { g.classList.add('nk-seen'); over(g, 'nk-shine'); });
      if (!sel) return;
      const laid = SL[key] || ['tea', 'yukata', 'flower'].includes(key);
      [...a.querySelectorAll(sel)].forEach((g, n) => {
        g.classList.add(how === 'nk-in' && laid ? 'nk-drop' : how); const o = old[n]; if (!o) return;
        o.removeAttribute('data-k'); o.removeAttribute('data-i'); o.classList.remove('nk-hint', 'nk-seen', 'nk-in', 'nk-drop', 'nk-back'); o.querySelectorAll('.nk-glow, .nk-shine').forEach((x) => x.remove()); o.classList.add('nk-out'); g.after(o); setTimeout(() => o.remove(), 420);
      });
      if (key === 'light') { const d = svg.querySelector('.rk-dim'); if (d) d.classList.add('nk-fade'); else if (dimOld) { dimOld.classList.add('nk-gone'); svg.appendChild(dimOld); setTimeout(() => dimOld.remove(), 420); } }
    }
    // a thing tapped: the cat's place while it sleeps there (its own tap inside futon place 0's) — never a miss; else, while an
    // instruction is under way, the thing changes: toward what she asked (a futon laid of three: on), or not it — her word, a miss,
    // and back as it was
    function thing(key, i) {
      if (key === 'cat' || (key === 'futon' && i === 0 && st && st.cat)) { catOff(); return; }
      if (phase !== 'do' || busy || catGo || !t || t.kind !== 'do' || !st || !(key in st)) return;
      const many = Array.isArray(st[key]), j = many ? (i === undefined ? st[key].findIndex((x, n) => !x && !(key === 'futon' && n === 0 && st.cat)) : i) : undefined;   // no place given: the first empty one, never the cat's
      if (many && !(j >= 0 && j < st[key].length)) return;
      const before = many ? st[key][j] : st[key];
      if (many) st[key][j] = !before; else st[key] = !before;
      SND.play(SOUND[key], { vol: 0.55 }); draw(key, j);
      const [tk, tv] = t.target, toward = key === tk && (many ? !before && NAKAI.count(st[key]) <= tv : st[key] === tv);
      if (toward) { keepNow(); if (NAKAI.meets(st, t.target)) done(); return; }
      busy = true; miss++; missed++; playSfx('bad');
      JOBS.missWord(P, () => word(S().miss, 'bad'), 0, box);   // her word to its end, the countdown held meanwhile (ruling 27)
      if (miss >= 2 && !hint) { hint = true; bub(true); }
      setTimeout(() => { if (mine !== runs || !st || !live()) return; if (many) st[key][j] = before; else st[key] = before; SND.play(SOUND[key], { vol: 0.4 }); draw(key, j, 'nk-back'); busy = false; }, WRONG_MS);   // a card shut meanwhile: nothing more (M-5)
    }
    // the cat off with ニャ — its sound, the word popping up, it gets up and goes: the place is the futon's then
    function catOff() {
      if (!st || !st.cat || catGo) return; catGo = true; SND.play('meow', { vol: 0.7 });
      const s = el('.nk-stage'); if (s) { const n = document.createElement('b'); n.className = 'nk-nya'; n.lang = 'ja'; n.textContent = 'ニャ'; s.appendChild(n); setTimeout(() => n.remove(), 1500); }
      const g = el('.nk-art [data-k="cat"]'); if (g) g.classList.add('nk-catgo');
      setTimeout(() => { catGo = false; if (mine !== runs || !st || !live()) return; st.cat = false; draw(); keepNow(); }, CAT_MS);
    }
    const unhint = () => { const a = el('.nk-art'); if (!a) return; a.querySelectorAll('.nk-hint').forEach((g) => g.classList.remove('nk-hint')); a.querySelectorAll('.nk-glow').forEach((x) => x.remove()); };
    // the thing she asked for so: right (its misses), her words shown; the countdown held till her next one is said
    function done() {
      phase = 'said'; if (P) P.pause(); ctx.right(k, Math.min(miss, 2)); playSfx('good'); hint = false; bub(true);
      unhint();
      if (!miss && Math.random() < 0.25) sayWord(S().ok[Math.floor(Math.random() * S().ok.length)], 'ok');
      const at = k; setTimeout(() => { if (k === at && phase === 'said') fire('right'); }, 450);
    }
    // a reply picked (a check, a guest): not it — her word and its reason under it (the clock none here), it cannot be picked again, two
    // and the words are shown with the right one lit; it — the hero says it after any line being said, a guest their word after
    function pick(b) {
      if (phase !== 'ask' || b.disabled || !t || !t.opts) return;
      const o = t.opts[Number(b.dataset.o)];
      if (!o[2]) {
        miss++; missed++; playSfx('bad'); b.classList.remove('wk-bad'); void b.offsetWidth; b.classList.add('wk-bad'); b.disabled = true;
        JOBS.missWord(null, () => word([(o[3] === 'form' ? S().form : S().fact)[0], o[1]], 'bad'), 0, box);
        const left = [...el('.nk-opts').querySelectorAll('.nk-opt:not(:disabled)')];
        if (miss >= 2 || left.length === 1) { bub(true); left.forEach((x) => x.classList.toggle('wk-hint', Boolean(t.opts[Number(x.dataset.o)][2]))); }
        return;
      }
      phase = 'said'; ctx.right(k, Math.min(miss, 2)); playSfx('good'); bub(true);
      el('.nk-opts').querySelectorAll('.nk-opt').forEach((x) => { x.disabled = true; x.classList.toggle('nk-right', Boolean(t.opts[Number(x.dataset.o)][2])); });
      const task = t, last = k >= N - 1;
      const lines = (async () => {
        await JOBS.quiet(box); if (!on2()) return;
        await JOBS.queue(() => me(o), box); if (!on2() || task.kind !== 'guest') return;
        await Promise.all([JOBS.queue(() => { bub(true, task.after); return speakAs(task.who, task.after[0]); }, box), sleep(400)]);
        const r = el('.nk-task'); if (r && on2()) { r.classList.add('nk-bye'); await sleep(420); }
      })();
      if (last) { closeShift(lines); return; }
      lines.then(() => fire('right'));
    }
    // the shift's last task done: paid at once, its results once its last lines and 千代's goodbye are said (finish's promise); its
    // card still up is enough (finish ends the shift: ctx.on() no more)
    const on2 = () => mine === runs && Boolean(el('.nk-art'));
    function closeShift(lines) {
      const bye = lines.then(() => on2() && sayWord(!missed && !lost && ctx.done === 0 ? S().all : S().end, 'ok')).then(() => { if (on2()) CLASS.close(); });
      ctx.finish({}, bye);
    }
    function replay() {   // heard again (after any line being said): the countdown held till it is said in full
      if (!t || !t.line || (phase !== 'ask' && phase !== 'do')) return;
      const q = phase === 'do' ? P : null; if (q) q.pause();
      JOBS.line(t.kind === 'guest' ? t.who : 'chiyo', t.line[0], box).then(() => { if (q) q.resume(); });
    }
    // the 「お客様 到着まで」 countdown: red for its last 10 s, 千代's 「いそいで！」 once; out — what is not done fails (3)
    function dep(p) {
      const d = el('.nk-dep'); if (!d) return; d.style.setProperty('--p', p.toFixed(3)); const late = p > 0 && p * total <= 10; d.classList.toggle('late', late);
      if (late && !hurried) { hurried = true; sayWord(S().hurry, 'bad'); }
    }
    function clockOn(rm) {
      const room = ri; total = NAKAI.secsFor(rm.tasks.filter((x) => x.kind === 'do' && x.k >= k)); hurried = false;   // for what is left to do in the room
      const d = el('.nk-dep'); if (d) d.classList.remove('idle', 'late');
      P = JOBS.clock(total / Math.max(0.01, Number(NAKAI.speed) || 1), () => live() && ri === room, dep, timeUp);   // held till her first instruction is said
    }
    function timeUp() {
      if (!t || t.kind !== 'do' || phase === 'late') return;
      const rm = shift.rooms[ri], gk = rm.tasks[rm.tasks.length - 1].k;
      if (phase === 'do') bub(true);   // what she had asked, shown
      for (let kk = k; kk < gk; kk++) ctx.right(kk, 3);
      lost += gk - k; k = gk; phase = 'late'; hint = false; playSfx('bad'); unhint();
      fire('late');
    }
    // a room come into: as it was left (kept), else its start with what was done there before a break
    function enter(r) {
      ri = r; const rm = shift.rooms[r], kp = ctx.kept || {}, sc = (WORK.today() || {}).score || {};
      if (kp.room === r && kp.st && Number(kp.seed) === seed) st = clone(kp.st);
      else { st = clone(rm.start); rm.tasks.forEach((x) => { if (x.kind === 'do' && x.k < k && sc[x.k] !== undefined && sc[x.k] < 3) NAKAI.put(st, x.target); }); }
      P = null; hint = false; seen = null;
      const plate = el('.nk-room'); if (plate) plate.innerHTML = `<ruby>${esc(rm.name)}<rt>${esc(rm.kana)}</rt></ruby>の<ruby>間<rt>ま</rt></ruby>`;
      const d = el('.nk-dep'); if (d) { d.classList.add('idle'); d.classList.remove('late'); d.style.setProperty('--p', '1'); }
      draw(); const s = el('.nk-stage'); if (s) { s.classList.remove('nk-enter'); void s.offsetWidth; s.classList.add('nk-enter'); }
    }
    const guestOff = () => { const c = el('.cls-card'); if (c) c.classList.remove('nk-guest'); };
    async function check(task) {
      t = task; miss = 0; hint = false; guestOff(); who('chiyo'); bub(false); opts(true); phase = 'ask';
      const p = until(); await JOBS.line('chiyo', task.line[0], box); return p;
    }
    async function instruct(task, firstDo) {
      t = task; miss = 0; hint = false; guestOff(); who('chiyo'); bub(false); opts(false); phase = 'do';
      const p = until(); await JOBS.line('chiyo', task.line[0], box);   // heard first, the countdown held while she says it
      if (live() && P) { if (firstDo) P.go(); else P.resume(); }
      return p;
    }
    // a guest comes in: what they say is so of the room as it stands — once a thing tapped wrong is back as it was (a card shut in that
    // wait: nothing more, no guest, no door; fix round 2) — and never of a thing its instructions wanted the other way (ruling 33); the
    // room keeps a thing for that from its start (make), so there always is one: were there none, the task would be scored as done and
    // passed over with an error logged — never a remark the room does not show (I-1)
    async function guestIn(plan) {
      for (let i = 0; i < 40 && (busy || catGo) && live(); i++) await sleep(50);
      if (!live()) return new Promise(() => {});
      const rm = shift.rooms[ri], wants = rm.tasks.filter((x) => x.kind === 'do').map((x) => x.target);
      const g = NAKAI.guest(st, plan.plan, guests, NAKAI.rng((seed + 7919 * (k + 1)) >>> 0), wants);
      if (!g) { console.error(`仲居: nothing in room ${rm.id} (seed ${seed}) for a guest to remark on`); ctx.right(k, 0); if (k >= N - 1) { closeShift(Promise.resolve()); return new Promise(() => {}); } return 'none'; }
      guests.push(g.key); t = Object.assign({}, g, { k, room: ri }); miss = 0; hint = false;
      SND.play('fusuma', { vol: 0.5 }); who(g.who); bub(false); opts(true); phase = 'ask'; const c = el('.cls-card'); if (c) c.classList.add('nk-guest');
      const p = until(); await JOBS.line(g.who, g.line[0], box); return p;
    }
    CLASS.card('wk-nakai', '仲居', `<button type="button" class="cls-x" data-cls="x" aria-label="關閉">✕</button>
      <div class="wk-head"><b lang="ja"><ruby>仲居<rt>なかい</rt></ruby></b><span class="wk-n">${Math.min(k + 1, N)}／${N}</span></div>
      <div class="nk-top"><p class="nk-room" lang="ja"></p><div class="nk-dep idle" role="timer" aria-label="客人到達前的倒數"><span lang="ja">お<ruby>客<rt>きゃく</rt></ruby><ruby>様<rt>さま</rt></ruby> <ruby>到着<rt>とうちゃく</rt></ruby>まで</span><i><b></b></i></div></div>
      <div class="nk-stage"><div class="nk-art"></div></div>
      <div class="nk-task"><span class="kr-face nk-face"></span><p class="nk-bub"></p></div>
      <div class="nk-opts"></div>
      <div class="nk-talk" data-who="chiyo"><span class="kr-face nk-mini"></span><p class="wk-say"></p></div>`, (e) => {
      if (!live()) return;
      if (e.target.closest('.nk-ear')) { replay(); return; }
      const o = e.target.closest('.nk-opt'); if (o) { pick(o); return; }
      const g = e.target.closest('.nk-art [data-k]'); if (g) thing(g.dataset.k, g.dataset.i === undefined ? undefined : Number(g.dataset.i));
    });
    box = document.querySelector('.cls.wk-nakai');
    // up to 桜の間 with 千代 (she stands there while the card is up: CAST.chiyo.shift), in by its door
    if (typeof yPlace !== 'undefined' && yPlace === 'ryokan' && PLACE_ROUTE.washitsu) { yh.arrive = { from: 'ryokan', to: 'washitsu' }; go(PLACE_ROUTE.washitsu); }
    (async () => {
      if (!ctx.done) { await sayWord(S().start); if (!live()) return; }   // her own saying: 「お客さまが 来る 前に、ぜんぶ 用意して おきましょうね。」
      while (k < N) {
        t = tasks[k]; setN();
        if (t.room !== ri) {
          enter(t.room);
          if (t.kind === 'check') { await sayWord(S().rooms[ri]); if (!live()) return; if (st.cat) { await sayWord(S().cat); if (!live()) return; } }
        }
        const rm = shift.rooms[ri];
        if (t.kind === 'check') { await check(t); if (!live()) return; k++; }
        else if (t.kind === 'do') {
          const firstDo = !P; if (firstDo) clockOn(rm);
          const how = await instruct(t, firstDo); if (!live()) return;
          if (how === 'right') {
            const was = t; k++;
            if (rm.self && selfAt !== ri && was.k === rm.tasks[1].k) {   // after the room's first instruction, now and then: she finds one seen to
              selfAt = ri; seen = rm.self; draw(); await sayWord(TOWN.ONSEN.nakai.self[rm.self]); seen = null; if (!live()) return;
            }
          }
          if (tasks[k] && tasks[k].kind === 'guest') {   // the guests come: in time, or with things not done
            if (P) P.stop(); P = null; phase = 'wait'; const d = el('.nk-dep'); if (d) { d.classList.add('idle'); d.classList.remove('late'); }
            await sayWord(how === 'late' ? S().late : S().arrive, how === 'late' ? 'bad' : ''); if (!live()) return;
          }
        } else { await guestIn(t); if (!live()) return; k++; }
        keepNow(); setN();
      }
    })();
  }
  function lines(add) {
    const K = TOWN.ONSEN.nakai, A = K.say, seen = new Set(), say = (who, l) => { if (l && !seen.has(who + '|' + l)) { seen.add(who + '|' + l); add(who, l); } };
    Object.values(K.do).forEach((d) => say('chiyo', d[2]));
    Object.values(K.check).forEach((c) => { say('chiyo', c.q[0]); say('chiyo', c.then[0]); say('hero', c.yes[0]); say('hero', c.no[0]); });
    Object.values(K.guest).forEach(([who, line, right, , after]) => { say(who, line[0]); say(who, after[0]); say('hero', right[0]); });
    Object.values(K.self).forEach((l) => say(A.who, l[0]));
    Object.entries(A).filter(([key]) => key !== 'who').forEach(([, l]) => (Array.isArray(l[0]) ? l : [l]).forEach((x) => say(A.who, x[0])));
  }
  return { run, lines, now: () => (snap ? snap() : null), tap: (key, i) => (tapper ? tapper(key, i) : false) };
})();
WORK.register('nakai', { run: NAKAI_RUN.run, lines: NAKAI_RUN.lines });
