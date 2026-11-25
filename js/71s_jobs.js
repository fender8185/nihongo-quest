'use strict';
// ---------- 中華街の打工's four jobs (2026-11-14; docs/superpowers/specs/2026-11-14-chinatown-work-design.md §6) ----------
// Each a runner WORK starts with its ctx (WORK.register): ten tasks from what the learner has seen — 中華街 is the first and lowest
// of the workplaces, so kana, kana-only 入門 words, and (收銀) N5's numbers, no kanji. A task right is ctx.right(k, misses) as it
// is done; the tenth: ctx.finish().
const JOBS = (() => {
  const N = 10, pick = (a) => a[Math.floor(Math.random() * a.length)];
  const say = (job) => TOWN.WORK.say[job];
  // the keeper's word at the top of the card, said in their voice (ends as it is said) — on the run's own card (box; else the job's
  // open one), never another's: a card gone, nothing shown or said (2026-11-24, fix round 2, N-1)
  function word(job, [ja, zh], cls = '', box) {
    if (box && !box.isConnected) return Promise.resolve();
    const p = box ? box.querySelector('.wk-say') : document.querySelector(`.wk-${job} .wk-say`); if (p) { p.innerHTML = `<b lang="ja">${esc(ja)}</b><span>${esc(zh)}</span>`; p.className = 'wk-say' + (cls ? ' ' + cls : ''); }
    return speakAs(say(job).who, ja);
  }
  // a line said to its end, then on (2026-11-18, the user: in the jobs out on the street the next customer cut the voices off —
  // each line stops the one before): once p (a line being said, or none) is over — at least min ms, at most max (a clip that never ends)
  const said = (p, min = 0, max = 5000) => Promise.all([Promise.race([Promise.resolve(p).catch(() => {}), sleep(max)]), sleep(min)]);
  // the longest a line is waited on before the next (a clip that never ends): the lane's, from the line's own start (2026-11-25, Task 7's
  // fix round, I-1: 佐藤 at rate 0.86 says a closing word of six seconds and more — cut at 5 s by the card shutting); said's own 5 s stays
  // the 中華街 jobs' (their lines are short)
  const LINE_CAP = 12000, whole = (p, min = 0) => said(p, min, LINE_CAP);
  const head = (job, title, k) => `<button type="button" class="cls-x" data-cls="x" aria-label="關閉">✕</button>
    <div class="wk-head"><b lang="ja">${title}</b><span class="wk-n">${Math.min(k + 1, N)}／${N}</span></div>
    <div class="wk-who"><span class="kr-face">${TOWNEV.face(say(job).who)}</span><p class="wk-say"></p></div>`;

  // 包包子's board (整理貨架's too, till 2026-11-19): kana a Taiwanese ear takes for each other (つ for す, ら for な …), and
  // ones no ear can tell apart — お／を, and a hiragana and its katakana (あ／ア, 2026-11-20) — never side by side
  const KANA_SOUNDALIKE = [['す', 'つ'], ['し', 'ち'], ['し', 'ひ'], ['な', 'ら'], ['ぬ', 'る'], ['ね', 'れ'], ['の', 'ろ']];
  const KANA_SAMESOUND = [['お', 'を'], ['じ', 'ぢ'], ['ず', 'づ']];
  const hira = (c) => (c >= 'ァ' && c <= 'ヶ' ? String.fromCharCode(c.charCodeAt(0) - 0x60) : c);   // a katakana as the hiragana it sounds
  const kin = (groups, c) => groups.filter((g) => g.includes(c)).flat().filter((x, i, all) => x !== c && all.indexOf(x) === i);
  const twin = (a, b) => hira(a) === hira(b) || KANA_SAMESOUND.some((g) => g.includes(hira(a)) && g.includes(hira(b)));

  // ---- 站櫃 (らんらん, 周おばあさん): a customer comes to the counter (the cruise's passengers, out shopping, each in their own
  // voice) after the hero's いらっしゃいませ, and asks for one of four things on it, labelled in kana — only things whose name's
  // kana are all seen. The word asked for is heard, not shown (2026-11-15, the user: printed in the bubble too, it was only matching
  // the same kana): a blank in the bubble, tapped to hear it again, filled in once handed over or after two misses. Once ふたつ is
  // learned, now and then two of it (tap it twice). Handed over: ありがとうございました. Its prices asked went to 收銀 (2026-11-19,
  // the user: 周 keeps the listening, no reckoning), and the tags went with them (2026-11-20) ----
  const CUST = ['kaneda', 'umeko', 'yuta', 'rina', 'yoshimoto', 'ken', 'ai', 'michiyama', 'mike'];
  const GOODS = () => TOWN.WORK.goods;
  const sayer = (name) => CUST[Math.max(0, GOODS().findIndex((g) => g[0] === name)) % CUST.length];   // each thing asked for by the same one, so the clips stay few
  const learned = (r, w) => REG.vocab.some((v) => v.r === r && (!w || v.w === w) && state.srs[v.key]);   // a word read so (and written so), learned
  const DIGIT = [, , ['二', 'に'], ['三', 'さん'], ['四', 'よん'], ['五', 'ご'], ['六', 'ろく'], ['七', 'なな'], ['八', 'はち'], ['九', 'きゅう']];
  const ME = { hi: ['いらっしゃいませ！', '歡迎光臨！'], bye: ['ありがとうございました！', '謝謝光臨！'] };
  const ask = (t) => (t.kind === 'two' ? [`${t.good[0]}を ふたつ ください。`, '請給我兩個。'] : [`${t.good[0]}を ください。`, '請給我這個。']);
  function counterMake(seen = WORK.kana()) {
    const big = { っ: 'つ', ゃ: 'や', ゅ: 'ゆ', ょ: 'よ' };   // a small kana read as the one seen (せっけん)
    let can = GOODS().filter((g) => [...g[0]].every((c) => seen.has(big[c] || c))); if (can.length < 4) can = GOODS().slice(0, 4);   // never too few to set out
    const two = learned('ふたつ');
    return Array.from({ length: N }, () => {
      const kind = two && Math.random() > 0.75 ? 'two' : 'name', good = pick(can), goods = shuffle([good, ...shuffle(can.filter((g) => g !== good)).slice(0, 3)]);
      return { kind, good, goods, who: sayer(good[0]) };
    });
  }
  // ---- the clock (2026-11-19, the user: every job timed, as 外場 is): a bar wearing down while the hero is waited on — held while
  // the lines between are said, and on a hidden page — coloured by what is left (外場's moods); at none, out(). PAT.scale: the
  // tests run it fast. A customer's (站櫃, 收銀): their 🙂 → 💦 (あの、すみません！) → 💢 (ちょっと！) as it goes, 外場's words in
  // their voices; a miss costs some; at none they go (もう いいです！, いいです！ till もう is learned), the task lost (3, as 外場's
  // stormed out) ----
  const PAT = { scale: 1 }, MOOD = (p) => (p >= 0.6 ? 'ok' : p >= 0.3 ? 'meh' : 'mad'), EMO = { ok: '', meh: '💦', mad: '💢' };
  // held: the main hold (till go(): the asking not over yet; a replay); paused: other holds, counted (a keeper's word after a miss)
  function clock(secs, alive, paint, out) {
    let p = 1, held = true, paused = 0, over = false, last = Date.now();
    const set = (v) => { if (over) return; p = Math.max(0, Math.min(1, v)); paint(p, MOOD(p)); if (!p) { stop(); out(); } };
    const tick = setInterval(() => {
      const t = Date.now(), dt = Math.min(0.25, (t - last) / 1000); last = t;   // a throttled tab's long gaps: no leap
      if (!alive()) { stop(); return; }
      if (!held && !paused && !document.hidden) set(p - dt / (secs * PAT.scale));
    }, 100);
    function stop() { over = true; clearInterval(tick); }
    paint(1, 'ok');
    return { go: () => { held = false; last = Date.now(); }, hold: () => { held = true; }, pause: () => { paused++; }, resume: () => { paused = Math.max(0, paused - 1); last = Date.now(); },
      hit: (d) => set(p - d), stop, p: () => p, live: () => !over && alive() };
  }
  // the lines a shift's customers and keeper say, each to its end (2026-11-24, ruling 27; the user, 2026-11-18: no voice cut) — the lane
  // of one card, the one open now (box: the run's own; else whichever is open), and of it only (fix round 2, N-1): a line begun at once
  // enters it (voice: the asking, the answers); one queued (queue, line, missWord) is begun once the line before it is over, and only
  // if its card is still the open one then — a card shut drops what it had still to say, unsaid, and a new card starts a fresh lane,
  // never waiting on the old one's. Each is capped (a clip that never ends) from its own start (N-2), and resolves once said or dropped.
  // quiet(): once every line in the lane is over — the hero's reply to a pick waits for it. A keeper's word after a miss (missWord): the
  // customer's clock held meanwhile, the miss's cost after it — so their 「あの、すみません！」, 「ちょっと！」 or 「もう いいです！」 comes
  // after her word, never over it; the clock runs on only if nothing else holds it (the asking not over yet, a replay), never once
  // stopped (served, gone)
  let speaking = Promise.resolve(), owner = null;
  const lane = (box) => { const c = box || document.querySelector('.cls'); if (c && c.isConnected && c !== owner) { owner = c; speaking = Promise.resolve(); } return c; };
  const ours = (c) => Boolean(c) && c === owner && c.isConnected;
  const voice = (p, box) => { if (ours(lane(box))) speaking = Promise.all([speaking, said(p, 0, LINE_CAP)]); return p; };
  const quiet = (box) => { lane(box); return speaking; };
  function queue(start, box, cap = LINE_CAP) {
    const c = lane(box); if (!ours(c)) return Promise.resolve(null);
    const p = speaking.then(() => (ours(c) ? said(start(), 0, cap) : null)).catch(() => null);
    speaking = p; return p;
  }
  const line = (who, ja, box) => queue(() => speakAs(who, ja), box);
  function missWord(P, say, cost, box) {
    if (P) P.pause();
    return queue(say, box).then(() => { if (!P) return; if (P.live()) P.hit(cost); P.resume(); });
  }
  // a customer's word popping up over them (called again, cross, gone), gone of itself
  function grr(e, ja) {
    if (!e) return; e.querySelectorAll('.wk-grr').forEach((x) => x.remove());
    const g = document.createElement('b'); g.className = 'wk-grr'; g.lang = 'ja'; g.textContent = ja; e.appendChild(g); setTimeout(() => g.remove(), 2300);
  }
  const CROSS = () => TOWN.WORK.say.waiter.cust;   // 外場's customers' words, already in these nine voices
  function patience(job, who, secs, alive, out, box) {   // box: the run's own card (else the job's open one)
    const c = () => (box ? (box.isConnected ? box.querySelector('.wk-cust') : null) : document.querySelector(`.wk-${job} .wk-cust`)); let mood = 'ok';
    return clock(secs, alive, (p, m) => {
      const e = c(); if (!e) return; const bar = e.querySelector('.wk-pat'); if (bar) bar.style.setProperty('--p', p.toFixed(3));
      if (m === mood) return; mood = m; e.dataset.mood = m; const s = e.querySelector('.wk-emo'); if (s) s.textContent = EMO[m];
      if (m === 'ok' || !p) return;
      const l = m === 'mad' ? CROSS().hey : CROSS().again; line(who, l[0], box); grr(e, l[0]);   // called again, then cross — after any line being said
    }, () => out(learned('もう') ? CROSS().out : CROSS().out0));
  }
  // a shift's own dice (mulberry32): the same seed, the same shift — a board, its tourists (案内所), its rooms (仲居); kept with the day's
  // record so a shift taken up again is the one left (2026-11-24, fix round 1 of 仲居: one copy for the onsen's runners)
  function rng(seed) {
    let a = (Number(seed) >>> 0) || 1;
    return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  const pickR = (a, R) => a[Math.floor(R() * a.length)];
  const shuffleR = (arr, R) => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const custHtml = (who) => `<span class="kr-face">${TOWNEV.face(who)}</span><i class="wk-emo"></i><p class="wk-bub"></p><span class="wk-pat"><i></i></span>`;
  // a bubble kept, for one customer (or task), as tall as the most it will show (2026-11-25, the user: 「新的打工回答會跑版，版面會因為回覆
  // 導致版面向上擠壓」): their words shown on a reply, a miss or as they go, a word after — never growing it, so nothing under it moves and a
  // short phone's card never scrolls itself for it mid-customer. htmls: what it may hold — each an html, or [html, attrs] (the copy's
  // attributes for it: a talk row's data-who) — or a function giving them, asked each time it is measured; each measured in a hidden copy
  // of it the same width; its min-height the tallest (none: let go). The onsen's four jobs call it as each customer (each task) comes —
  // for the bubble, the replies and the talk row (fix round 2, ruling 8). Measured again, the customer's own, on a resize or a turn of
  // the phone, and once the web fonts (Noto Sans JP/TC, display=swap) are in (fix round 1, the review's Minor 3)
  const held = new Map();   // each element held → what it may hold (its customer's, the latest)
  function measure(b, src) {
    const list = typeof src === 'function' ? src() : src, w = b.getBoundingClientRect().width; if (!w || !list || !list.length) { b.style.minHeight = ''; return; }
    // all measured in the copy, what it shows now too: the element itself never let go meanwhile (a card scrolled to it would be pulled
    // back to its top as the browser clamps its scroll to a content gone shorter for a moment — fix round 2)
    const c = b.cloneNode(false); c.style.cssText = `position:absolute;left:0;top:0;width:${w}px;min-height:0;visibility:hidden;pointer-events:none`;
    b.parentNode.appendChild(c); c.innerHTML = b.innerHTML; let h = c.getBoundingClientRect().height;
    list.forEach((x) => { const [html, attrs] = Array.isArray(x) ? x : [x, null]; c.innerHTML = html; if (attrs) Object.entries(attrs).forEach(([k, v]) => c.setAttribute(k, v)); h = Math.max(h, c.getBoundingClientRect().height); });
    c.remove(); b.style.minHeight = `${Math.ceil(h)}px`;
  }
  function hold(b, htmls) {
    if (!b || !b.isConnected) return;
    held.forEach((_, e) => { if (!e.isConnected) held.delete(e); }); held.set(b, htmls); measure(b, htmls);
    if (document.fonts && document.fonts.status !== 'loaded') document.fonts.ready.then(rehold);
  }
  let reholdT = 0;
  function rehold() { clearTimeout(reholdT); reholdT = setTimeout(() => { held.forEach((src, b) => { if (b.isConnected) measure(b, src); else held.delete(b); }); reads.forEach((f, e) => { if (e.isConnected) f(); else reads.delete(e); }); }, 120); }
  // a card's reading block (fix round 2, ruling 8: the フロント's book and keys, the 案内所's board, the おみやげ屋's shelves) takes what the
  // card has left and scrolls inside itself: while there is more below what shows, its foot fades (wk-more; iOS hides scrollbars). once:
  // its listeners, top(): back at its top as a customer starts
  const reads = new Map();
  function reading(e) {
    if (!e || !e.isConnected) return () => {};
    reads.forEach((_, x) => { if (!x.isConnected) reads.delete(x); });   // blocks gone from the page let go (as hold's)
    let f = reads.get(e);
    if (!f) { f = () => e.classList.toggle('wk-more', e.scrollHeight - e.clientHeight - e.scrollTop > 2 + (parseFloat(getComputedStyle(e).paddingBottom) || 0)); reads.set(e, f); e.addEventListener('scroll', f, { passive: true }); if (typeof ResizeObserver === 'function') new ResizeObserver(f).observe(e); }   // its own foot padding is not "more" (task 2 review, Minor 1)
    return () => { e.scrollTop = 0; f(); };
  }
  // what is lit in a reading block (a book's row, a key) brought into sight inside the block itself — never the card's own scroll: into
  // the part of the block the card shows, under its header should that be stuck at the top
  function inSight(block, e) {
    if (!block || !e || !block.isConnected) return;
    const card = block.closest('.cls-card'), head = card && card.querySelector('.wk-head'), b = block.getBoundingClientRect(), r = e.getBoundingClientRect();
    const ct = card ? card.getBoundingClientRect().top + card.clientTop : b.top, top = Math.max(b.top, ct, head ? head.getBoundingClientRect().bottom : -Infinity), bot = Math.min(b.bottom, card ? ct + card.clientHeight : b.bottom);
    if (r.top < top) block.scrollTop -= top - r.top + 4; else if (r.bottom > bot) block.scrollTop += Math.min(r.bottom - bot + 4, r.top - top);
  }
  window.addEventListener('resize', rehold); window.addEventListener('orientationchange', rehold);
  if (document.fonts && document.fonts.addEventListener) document.fonts.addEventListener('loadingdone', rehold);   // a later subset of a font in (a glyph not seen before)
  // ---- a desk (2026-11-24, ruling 28): the flow 原田's window, the 観光案内所 and the フロント share — one customer after another: the
  // hero's greeting (after any line still being said), their words heard first (……; 🔊 again: the clock held till they are said in full),
  // then each step of what they came for — a reply picked, or the job's own taps (a station on the chart, a key on the board: D.right,
  // D.miss) — right (the step's lines after any line being said; a step after the first on a fresh clock: the one before pleased them),
  // wrong (the keeper's word said to its end, the clock held meanwhile and its cost after it — ruling 27; a reply so picked may not be
  // picked again where the job says so; two in a step and their words show, the right one lit), out of patience (their words whole, the
  // right one lit, their leaving word); then the next — at the last, the keeper's word and the card shut, paid at once and the results
  // once it is said. Each job keeps its words, its card and its checks in its own file and hands in (o):
  //   job, ctx, N; box() its own card (null till drawn); alive a selector in it while its shift is up; mine() this run the last begun;
  //   tasks [{ who, q: [ja, zh], steps? (['say', its own …]; a step not 'say' is the job's taps) }]; isRight(t, i) reply i right;
  //   secs(t, step) and cost: patience and a miss's; hi(t) the hero's greeting; fresh(t) the job's own of a customer (in now());
  //   me(l), word(l, cls) the hero's and the keeper's lines shown and said (their promise); bub(open, line), opts(on), draw(t) its card;
  //   optSel, earSel, rightCls; once: a wrong reply cannot be picked again; dim: the customer dimmed once served right;
  //   miss(t, i) the keeper's word to wrong reply i; hint(t, R, gone) the job's own lit with the right reply; tap(e, R) its own taps
  //   (true: one of them); then(t, R, i, live) the lines after a right step (default: the hero says the reply); served(t, R, live) once
  //   the last step is right; end, all the keeper's last words (all: right at once from the shift's start); extra() finish's (a tip)
  function desk(o) {
    const { ctx, N } = o, box = () => o.box(), steps = (t) => t.steps || ['say'];
    const el = (q) => { const b = box(); return b && b.isConnected ? b.querySelector(q) : null; };
    const all = (q) => { const b = box(); return b && b.isConnected ? [...b.querySelectorAll(q)] : []; };
    const live = () => o.mine() && Boolean(el(o.alive)) && ctx.on(), still = (me0) => live() && R === me0;
    let k = ctx.done, R = null, P = null, rep = 0, missed = 0, lost = 0;
    const clockFor = (me0) => (P = patience(o.job, me0.task.who, o.secs(me0.task, me0.step), () => Boolean(el('.wk-cust')) && R === me0 && ctx.on(), gone, box()));
    function show() {
      const t = o.taskAt ? o.taskAt(k) : o.tasks[k]; R = Object.assign({ k, task: t, phase: 'hi', step: 0, miss: 0, miss2: 0 }, o.fresh ? o.fresh(t) : {}); rep = 0;   // taskAt: the job's own say over who comes (the フロント's guest who left in a huff)
      const n = el('.wk-n'); if (n) n.textContent = `${k + 1}／${N}`;
      const c = el('.wk-cust'); c.className = 'wk-cust'; c.removeAttribute('data-mood'); c.innerHTML = custHtml(t.who); o.opts(false); if (o.draw) o.draw(t);
      const me0 = R; clockFor(me0);
      whole(queue(() => o.me(o.hi(t)), box()), 700).then(() => {
        if (!still(me0)) return; R.phase = 'ask'; o.bub(false); el('.wk-cust').classList.add('on'); o.opts(true);
        whole(voice(speakAs(t.who, t.q[0]), box())).then(() => { if (!rep && R === me0) P.go(); });
      });
    }
    // the next step of their task, on a fresh clock (calm again: the step before pleased them)
    function stepOn(me0) {
      R.step++; R.miss2 = 0; R.phase = 'ask'; const c = el('.wk-cust'); if (c) { c.removeAttribute('data-mood'); const e = c.querySelector('.wk-emo'); if (e) e.textContent = ''; }
      o.opts(true); clockFor(me0).go();
    }
    // a step right (i: the reply picked; none: the job's own tap)
    function right(i) {
      const t = R.task, me0 = R, last = R.step >= steps(t).length - 1;
      R.phase = last ? 'done' : 'wait'; P.stop(); playSfx('good');
      if (i !== undefined) all(o.optSel).forEach((b) => { b.disabled = true; b.classList.toggle(o.rightCls, Number(b.dataset.o) === i); });
      const then = (lv) => (o.then ? o.then(t, R, i, lv) : i === undefined ? Promise.resolve() : whole(o.me(t.opts[i]), 900));
      if (!last) { (async () => { await quiet(box()); if (!still(me0)) return; await then(() => still(me0)); if (still(me0)) stepOn(me0); })(); return; }   // after any line still being said (ruling 27)
      ctx.right(k, Math.min(R.miss, 2)); o.bub(true); if (o.dim) el('.wk-cust').classList.remove('on');
      next(async (lv) => { await quiet(box()); if (!lv()) return; await then(lv); if (!lv()) return; await o.served(t, R, lv); });
    }
    // a miss: the keeper's word ([ja, zh]) said to its end, the clock held meanwhile and its cost after it; two in a step: their words, the right one lit
    function wrong(b, l) {
      R.miss++; R.miss2++; missed++; playSfx('bad');
      if (b) { b.classList.remove('wk-bad'); void b.offsetWidth; b.classList.add('wk-bad'); if (o.once && b.matches(o.optSel)) b.disabled = true; }   // a reply only: a key, a station stays
      missWord(P, () => o.word(l, 'bad'), o.cost, box());
      if (R.miss2 >= 2) { o.bub(true); hint(false); }
    }
    function hint(out) { all(o.optSel).forEach((x) => { if (out) x.disabled = true; x.classList.toggle('wk-hint', o.isRight(R.task, Number(x.dataset.o))); }); if (o.hint) o.hint(R.task, R, out); }
    // patience out: off they go — their words shown whole, the right one lit, their leaving word popping up beside them (M-2), said in full
    // from its own start (N-2); the task lost
    function gone(leave) {
      const t = R.task; R.phase = 'done'; ctx.right(k, 3); lost++; playSfx('bad'); o.bub(true); grr(el('.wk-cust'), leave[0]); hint(true);
      next(async (lv) => { await Promise.all([line(t.who, leave[0], box()), sleep(1200)]); if (lv()) { el('.wk-cust').classList.add('bye'); await sleep(450); } });
    }
    // the customer gone (to the next one, or the keeper's last word and the card shut once every line is said): the shift's last paid at
    // once, its results once its lines are said (finish's promise)
    function next(lines) {
      const lv = () => Boolean(el(o.alive)) && (ctx.on() || k >= N); k++;
      const bye = (async () => { await lines(lv); if (!lv()) return; if (k < N) { show(); return; }
        await whole(o.word(!missed && !lost && ctx.done === 0 ? o.all : o.end, 'ok'), 800); if (el(o.alive)) CLASS.close(); })();   // said to its end before the card shuts and the results open (I-1)
      if (k >= N) ctx.finish(o.extra ? o.extra() : {}, bye);
    }
    // a tap on the card while a step waits: 🔊 again (the clock held till it is said in full, after any line being said: N-2), the job's
    // own taps, a reply
    function click(e) {
      if (!R || R.phase !== 'ask' || !live()) return;
      if (e.target.closest(o.earSel)) { const q = P, r = rep = rep + 1; q.hold(); line(R.task.who, R.task.q[0], box()).then(() => { if (rep === r) { rep = 0; if (P === q) q.go(); } }); return; }
      if (o.tap && o.tap(e, R)) return;
      const b = e.target.closest(o.optSel); if (!b || b.disabled || steps(R.task)[R.step] !== 'say') return;
      const i = Number(b.dataset.o); if (o.isRight(R.task, i)) right(i); else wrong(b, o.miss(R.task, i));
    }
    return { start: show, click, now: () => R, right: () => right(), miss: (b, l) => wrong(b, l), live, el, all };
  }
  // ---- a card's talk line (2026-11-25, Task 7's fix round, M-10 — ruling 28's way: the 観光案内所's and the フロント's, the おみやげ屋's):
  // the line under the replies the keeper and the hero share, whoever spoke last — the keeper's word with its 中文 (or a miss's why under
  // it), the hero's line with its 中文 on the job's first shift only (ruling 23: under the reply once said, never under the buttons).
  // Fix round 2 (ruling 8): the card never scrolls itself on a line — keep(lines) holds the row as tall as the tallest this customer may
  // bring, and start() puts the card at its top as each customer comes, then, where it is taller than the screen (its header sticky),
  // scrolls it once to bring the replies and the talk row into sight. Each line awaited to its end within the lane's cap (said: I-1).
  // o: box() the run's own card, sel the talk line, who the keeper, first (the job's first shift)
  const MARK = /\{([^|}]+)\|([^|}]+)(?:\|[^}]+)?\}/g, markRuby = (s) => esc(s).replace(MARK, '<ruby>$1<rt>$2</rt></ruby>');
  // once as a customer starts (its holds laid): the card at its top — and, taller than the screen, scrolled so far that `to` (the talk
  // row: under it the card's foot) is in sight, its header (✕) stuck at the top meanwhile. The reading block (block: at its floor then)
  // keeps what the stuck header covers of it as room at its own top (--wk-under): its title and every row still reached by its own scroll.
  // The reading block keeps its floor in sight first, at every height (fix round 3, ruling 13) — the book for a 備註 question, the board —
  // the talk row then partly under the fold where the card cannot hold it all (the player scrolls to it)
  function bring(card, to, block) {
    if (!card) return; card.scrollTop = 0; if (block) block.style.removeProperty('--wk-under');
    if (!to || card.scrollHeight - card.clientHeight < 1) return;
    const top = card.getBoundingClientRect().top + card.clientTop, head0 = card.querySelector('.wk-head');
    let d = to.getBoundingClientRect().bottom - (top + card.clientHeight) + 6;
    if (block && head0) d = Math.min(d, block.getBoundingClientRect().bottom - head0.getBoundingClientRect().bottom - Math.min(block.getBoundingClientRect().height, parseFloat(getComputedStyle(block).minHeight) || 0));   // its floor in sight first, at every height (fix round 3, ruling 13)
    if (d > 0) card.scrollTop = Math.min(d, card.scrollHeight - card.clientHeight);
    const head = card.querySelector('.wk-head'), u = block && head && card.scrollTop > 0 ? head.getBoundingClientRect().bottom - block.getBoundingClientRect().top : 0;
    if (u > 0) block.style.setProperty('--wk-under', `${Math.ceil(u)}px`);
  }
  function talkLine(o) {
    const el = (q) => { const b = o.box(); return b && b.isConnected ? b.querySelector(q) : null; }, card = () => el('.cls-card');
    const start = (block) => bring(card(), el(o.sel), block);
    const talk = (who) => { const t = el(o.sel); if (t) t.dataset.who = who; };
    const wordHtml = (ja, zh) => `<b lang="ja">${markRuby(ja)}</b><span>${esc(zh)}</span>`, mine = (ja, zh) => `<b lang="ja">${markRuby(ja)}</b>${o.first ? `<span>${esc(zh)}</span>` : ''}`;
    const word = ([ja, zh], cls = '') => { talk('drv'); const p = el(`${o.sel} .wk-say`); if (p) { p.innerHTML = wordHtml(ja, zh); p.className = 'wk-say' + (cls ? ' ' + cls : ''); } return speakAs(o.who, ja); };
    const me = ([ja, zh]) => { talk('me'); const p = el(`${o.sel} .wk-me`); if (p) p.innerHTML = mine(ja, zh); return speakAs('hero', ja); };
    // lines(): { drv: the keeper's [ja, zh]s, me: the hero's } this customer may bring — each laid out as word() and me() lay it
    const keep = (lines) => hold(el(o.sel), () => { const t = el(o.sel), L = lines(); if (!t || !L) return [];
      const face = t.querySelector('.kr-face') ? t.querySelector('.kr-face').outerHTML : '', row = (who, html) => [`${face}<p class="wk-say">${who === 'drv' ? html : ''}</p><p class="wk-me">${who === 'me' ? html : ''}</p>`, { 'data-who': who }];
      return [...(L.drv || []).filter(Boolean).map(([ja, zh]) => row('drv', wordHtml(ja, zh))), ...(L.me || []).filter(Boolean).map(([ja, zh]) => row('me', mine(ja, zh)))]; });
    return { card, start, talk, word, me, keep, said: whole };
  }
  const COUNTER_SECS = 5, TILL_SECS = [0, 30, 45];   // a customer's patience (s): 站櫃's one (5, 2026-11-20: 20 was too long), from the end of their asking; 收銀's by the things bought
  const MISS_COST = { counter: 0.2, till: 0.1 };   // of a whole patience: the wrong thing handed, a wrong piece said

  let C = null;   // the customer at the counter now (its task)
  const goodPic =(key) => { const d = (typeof PICS === 'object' && PICS[key]) || (typeof PICS_TOWN === 'object' && PICS_TOWN[key]); return d ? `<svg class="pic" viewBox="0 0 100 100" aria-hidden="true"><circle class="pd" cx="50" cy="50" r="47"/>${d}</svg>` : ''; };
  function counterRun(ctx) {
    const tasks = counterMake(), first = !Object.values(state.work.res).some((r) => r.place === 'counter' && r.yen !== undefined); let k = ctx.done, miss = 0, got = 0, busy = true, P = null, rep = 0;   // P: the customer's patience; rep: a replay by the speaker under way (its number)
    // this run's own card (box, once drawn; 2026-11-24, ruling 30, as ruling 22 for 駅前): an ended shift's goodbye never touches the next
    let box = null; const el = (s) => (box && box.isConnected ? box.querySelector(s) : null), all = (s) => (box && box.isConnected ? [...box.querySelectorAll(s)] : []);
    const bub = (open) => { const [ja, zh] = ask(C), w = C.good[0], line = open ? esc(ja) : `<button type="button" class="wk-ear" aria-label="再聽一次">${icon('speaker')}</button>${esc(ja.slice(w.length))}`;   // the word heard, not read, till handed over
      el('.wk-bub').innerHTML = `<b lang="ja">${line}</b><span>${esc(zh)}</span>${C.kind === 'two' ? `<i class="wk-cnt">${got}／2</i>` : ''}`; };
    const me = (l) => { const p = el('.wk-me'); if (p) p.innerHTML = `<b lang="ja">${esc(l[0])}</b>${first ? `<span>${esc(l[1])}</span>` : ''}`; return speakAs('hero', l[0]); };
    function show() {
      C = tasks[k]; miss = 0; got = 0; busy = true; rep = 0; if (!el('.wk-goods')) return;
      el('.wk-n').textContent = `${k + 1}／${N}`;
      el('.wk-goods').innerHTML = C.goods.map((g) => `<button type="button" class="wk-good" data-good="${esc(g[0])}">${goodPic(g[1])}<b lang="ja">${esc(g[0])}</b></button>`).join('');
      el('.wk-opts').innerHTML = ''; el('.wk-cust').className = 'wk-cust'; el('.wk-cust').removeAttribute('data-mood'); el('.wk-cust').innerHTML = custHtml(C.who);
      const t = C; P = patience('counter', t.who, COUNTER_SECS, () => Boolean(el('.wk-cust')) && C === t && ctx.on(), gone, box);
      said(me(ME.hi), 800).then(() => {   // the customer asks, once いらっしゃいませ is said; their patience once they have said it (5 s: none of it lost to the asking)
        if (!el('.wk-cust') || C !== tasks[k] || !ctx.on()) return;
        bub(false); el('.wk-cust').classList.add('on'); busy = false; const q = P; said(voice(speakAs(C.who, ask(C)[0]), box)).then(() => { if (!rep) q.go(); });
      });
    }
    function wrong(b) {
      miss++; playSfx('bad'); b.classList.remove('wk-bad'); void b.offsetWidth; b.classList.add('wk-bad'); missWord(P, () => word('counter', say('counter').miss, 'bad', box), MISS_COST.counter, box);   // her word to its end, then its cost (ruling 27)
      if (miss >= 2) { all('.wk-good').forEach((x) => x.classList.toggle('wk-hint', x.dataset.good === C.good[0])); bub(true); }
    }
    // the customer gone (to the next one, or 周's thanks and the card shut once every line is said)
    function next(lines, praise) {
      const live = () => el('.wk-cust') && (ctx.on() || k >= N);   // this run's card only
      k++;
      const bye = (async () => {
        await lines(live); if (!live()) return;
        if (praise) await said(word('counter', pick(say('counter').ok), '', box));
        if (!live()) return;
        if (k < N) { show(); return; }
        await said(word('counter', say('counter').end, 'ok', box), 700); if (el('.wk-cust')) CLASS.close();
      })();
      if (k >= N) ctx.finish({}, bye);   // paid now, the results after the goodbye
    }
    function right() {
      busy = true; P.stop(); ctx.right(k, miss); playSfx('good'); bub(true); el('.wk-cust').classList.remove('on');
      // each line to its end before the next: ありがとうございました, now and then 周's word
      next(async (live) => { await quiet(box); if (!live()) return; el('.wk-cust').classList.add('bye'); await said(me(ME.bye), 900); }, !miss && Math.random() < 0.25);   // after any line still being said (ruling 27)
    }
    function gone(leave) {   // patience out: もう いいです！ and off they go, the thing they wanted lit; the task lost
      busy = true; ctx.right(k, 3); playSfx('bad'); const t = C;
      el('.wk-bub').innerHTML = `<b lang="ja">${esc(leave[0])}</b><span>${esc(leave[1])}</span>`;
      all('.wk-good').forEach((x) => x.classList.toggle('wk-hint', x.dataset.good === t.good[0]));
      next(async (live) => { await Promise.all([line(t.who, leave[0], box), sleep(1200)]); if (live()) { el('.wk-cust').classList.add('bye'); await sleep(450); } }, false);   // said in full, from its own start (N-2)
    }
    CLASS.card('wk-counter', '站櫃', `${head('counter', 'らんらん', k)}<div class="wk-cust"></div><div class="wk-goods"></div><div class="wk-opts"></div><p class="wk-me"></p>`, (e) => {
      if (busy || !ctx.on() || !C) return;
      if (e.target.closest('.wk-ear')) { const q = P, r = rep = rep + 1; q.hold(); line(C.who, ask(C)[0], box).then(() => { if (rep === r) { rep = 0; if (P === q) q.go(); } }); return; }   // said again: the clock waits till it is said in full (the review, 2026-11-20; N-2)
      const g = e.target.closest('.wk-good'); if (!g) return;
      if (g.dataset.good !== C.good[0]) { wrong(g); return; }
      if (C.kind === 'two' && ++got < 2) { const c = el('.wk-cnt'); if (c) c.textContent = `${got}／2`; SND.play('place', { vol: 0.5 }); return; }
      right();
    });
    box = document.querySelector('.cls.wk-counter');
    show();
  }
  function counterLines(add) {
    GOODS().forEach((g) => { add(sayer(g[0]), `${g[0]}を ください。`); add(sayer(g[0]), `${g[0]}を ふたつ ください。`); });
    [ME.hi, ME.bye].forEach((l) => add('hero', l[0]));
    const s = say('counter'); [s.miss, s.end, ...s.ok].forEach((l) => add(s.who, l[0]));
  }

  // ---- 收銀 (ふく, 張さん): 2026-11-19, the user — 張's labels heard went to 包包子; his shop is the money now, the last and
  // hardest of the four (a clear step from job to job). A customer puts their things on the counter, each with its tag: one (これ、
  // いくらですか。) or two — or one of it twice, once ふたつ is learned (ぜんぶで いくらですか。／これを ふたつ ください。); never three
  // (2026-11-20, the user: that was reckoning, not Japanese), but prices to the yen (198円). The sum spelled in pieces: the
  // thousands (せん, に＋せん, さん＋ぜん), the hundreds' digit and ひゃく as it sounds after it (さんびゃく, ろっぴゃく, はっぴゃく), the
  // tens' and じゅう, the ones (4: よ, as in よえん), えん — among near misses: ひゃく's other sounds, せん／ぜん, ろく by ろっ, はち by
  // はっ, いち before a bare ひゃく, せん or じゅう, a digit beside (an addition slipped). Open once いくら, 円, 十, 百, 千 and 二〜九 are
  // learned; a miss is 張's ちがう！, two and the next piece lights; then the hero says it ----
  const FUKU = () => TOWN.WORK.fuku;
  const PIECE = { 2: 'に', 3: 'さん', 4: 'よん', 5: 'ご', 6: 'ろっ', 7: 'なな', 8: 'はっ', 9: 'きゅう' }, HYAKU = { 3: 'びゃく', 6: 'ぴゃく', 8: 'ぴゃく' };
  const SENS = { 2: 'に', 3: 'さん', 4: 'よん', 5: 'ご', 6: 'ろく', 7: 'なな', 8: 'はっ', 9: 'きゅう' };
  const TENS = { 2: 'に', 3: 'さん', 4: 'よん', 5: 'ご', 6: 'ろく', 7: 'なな', 8: 'はち', 9: 'きゅう' }, ONES = Object.assign({}, TENS, { 1: 'いち', 4: 'よ' });
  const TILES = 12;   // at most: three rows of four on a phone
  function spell(n) {
    const th = Math.floor(n / 1000), d = Math.floor(n / 100) % 10, t = Math.floor(n / 10) % 10, o = n % 10;
    const parts = [...(!th ? [] : th === 1 ? ['せん'] : [SENS[th], th === 3 ? 'ぜん' : 'せん']), ...(!d ? [] : d === 1 ? ['ひゃく'] : [PIECE[d], HYAKU[d] || 'ひゃく']),
      ...(!t ? [] : t === 1 ? ['じゅう'] : [TENS[t], 'じゅう']), ...(o ? [ONES[o]] : []), 'えん'];
    const must = [...(d ? ['ひゃく', 'びゃく', 'ぴゃく'] : ['ひゃく']), ...(th ? [th === 3 ? 'せん' : 'ぜん'] : []), ...(d === 1 || t === 1 || (th === 1 && !d) ? ['いち'] : []),
      ...({ 6: ['ろく'], 8: ['はち'] }[d] || []), ...({ 8: ['はっ'] }[t] || []), ...(o === 4 ? ['よん'] : [])];
    const beside = [t - 1, t + 1].filter((x) => t >= 2 && TENS[x]).map((x) => TENS[x]).concat([o - 1, o + 1].filter((x) => o && ONES[x]).map((x) => ONES[x]),
      [d - 1, d + 1].filter((x) => d >= 2 && PIECE[x]).map((x) => PIECE[x]), th ? [SENS[th + 1] || 'に'] : []);
    const keep = [...new Set(must)].filter((x) => !parts.includes(x)), more = [...new Set([...shuffle(beside), ...shuffle(Object.values(TENS))])].filter((x) => !parts.includes(x) && !keep.includes(x));
    const near = keep.concat(more).slice(0, Math.min(TILES - parts.length, Math.max(4, keep.length + 2)));   // every must, two more (a digit beside first), four at least
    return { parts, tiles: shuffle([...parts, ...near]) };
  }
  const TILL_WORDS = [['いくら'], ['えん', '円'], ['じゅう', '十'], ['ひゃく', '百'], ['せん', '千'], ...DIGIT.slice(2).map(([w, r]) => [r, w])];
  // the test site only (2026-11-19, the user had never met a price): 收銀 open, whatever is learned — kana too (WORK's open; 2026-11-20)
  const NUMS = 'nq_work_nums', allNums = () => { try { return onTestSite() && localStorage.getItem(NUMS) === '1'; } catch (e) { return false; } };
  function numsTool() { const on = !allNums(); try { localStorage.setItem(NUMS, on ? '1' : ''); } catch (e) { /* no storage */ } return on ? '收銀：不看學過沒（這台裝置），沒學數字、假名不夠也能做' : '收銀：恢復要先學過いくら、円、數字和假名'; }
  const tillLeft = () => (allNums() ? [] : TILL_WORDS.filter(([r, w]) => !learned(r, w)).map(([r, w]) => w || r));   // the words still to learn
  const tillAsk = (t) => (t.kind === 'one' ? ['これ、いくらですか。', '這個多少錢？'] : t.kind === 'two' ? ['これを ふたつ ください。', '這個請給我兩個。'] : ['ぜんぶで いくらですか。', '全部多少錢？']);
  const tillSay = (t) => (t.kind === 'one' ? [`${YEN.reading(t.sum)}です。`, `${t.sum} 日圓。`] : [`ぜんぶで ${YEN.reading(t.sum)}です。`, `全部 ${t.sum} 日圓。`]);
  function tillMake() {
    const all = FUKU(), two = learned('ふたつ');
    return Array.from({ length: N }, (_, k) => {
      const many = k < 4 ? 1 : 2, twice = many === 2 && two && Math.random() < 0.35, one = pick(all);
      const things = twice ? [one, one] : shuffle([...all]).slice(0, many), sum = things.reduce((a, g) => a + g[2], 0);
      return Object.assign({ kind: many === 1 ? 'one' : twice ? 'two' : 'sum', things, sum, who: pick(CUST) }, spell(sum));
    });
  }
  let T = null;   // the customer at the till now (its task)
  function tillRun(ctx) {
    const tasks = tillMake(), first = !Object.values(state.work.res).some((r) => r.place === 'till' && r.yen !== undefined); let k = ctx.done, miss = 0, at = 0, busy = true, P = null;   // at: the pieces tapped so far; P: the customer's patience
    // this run's own card (box, once drawn; ruling 30): an ended shift's goodbye never touches the next
    let box = null; const el = (s) => (box && box.isConnected ? box.querySelector(s) : null), all = (s) => (box && box.isConnected ? [...box.querySelectorAll(s)] : []);
    const me = (l) => { const p = el('.wk-me'); if (p) p.innerHTML = `<b lang="ja">${esc(l[0])}</b>${first ? `<span>${esc(l[1])}</span>` : ''}`; return speakAs('hero', l[0]); };
    function show() {
      T = tasks[k]; miss = 0; at = 0; busy = true; if (!el('.wk-goods')) return;
      el('.wk-n').textContent = `${k + 1}／${N}`; el('.wk-goods').className = `wk-goods n${T.things.length}`;
      el('.wk-goods').innerHTML = T.things.map((g) => `<span class="wk-good">${goodPic(g[1])}<b lang="ja">${esc(g[0])}</b><small>${g[2]}円</small></span>`).join('');
      el('.wk-opts').innerHTML = ''; el('.wk-cust').className = 'wk-cust'; el('.wk-cust').removeAttribute('data-mood'); el('.wk-cust').innerHTML = custHtml(T.who);
      const t = T; P = patience('till', t.who, TILL_SECS[t.things.length], () => Boolean(el('.wk-cust')) && T === t && ctx.on(), gone, box);
      said(me(ME.hi), 800).then(() => {   // the customer asks, once いらっしゃいませ is said; then the pieces, and their patience
        if (!el('.wk-cust') || T !== tasks[k] || !ctx.on()) return;
        const [ja, zh] = tillAsk(T); el('.wk-bub').innerHTML = `<b lang="ja">${esc(ja)}</b><span>${esc(zh)}</span>`; el('.wk-cust').classList.add('on'); voice(speakAs(T.who, ja), box); busy = false; P.go();
        el('.wk-opts').innerHTML = `<p class="wk-spell" lang="ja"></p>${T.tiles.map((p) => `<button type="button" class="btn btn-sm wk-opt wk-tile" data-p="${esc(p)}" lang="ja">${esc(p)}</button>`).join('')}`; built();
      });
    }
    // the sum as tapped so far, a blank for each piece to come; after two misses the next piece lights
    function built() {
      const p = el('.wk-spell'); if (!p) return; p.innerHTML = T.parts.map((x, i) => (i < at ? `<b>${esc(x)}</b>` : '<i></i>')).join('');
      if (miss >= 2) all('.wk-tile').forEach((x) => x.classList.toggle('wk-hint', at < T.parts.length && !x.disabled && x.dataset.p === T.parts[at]));
    }
    // the customer gone (to the next one, or 張's おつかれさま and the card shut once every line is said)
    function next(lines, praise) {
      const live = () => el('.wk-cust') && (ctx.on() || k >= N);   // this run's card only
      k++;
      const bye = (async () => {
        await lines(live); if (!live()) return;
        if (praise) await said(word('till', pick(say('till').ok), '', box));
        if (!live()) return;
        if (k < N) { show(); return; }
        await said(word('till', say('till').end, 'ok', box), 700); if (el('.wk-cust')) CLASS.close();
      })();
      if (k >= N) ctx.finish({}, bye);   // paid now, the results after the goodbye
    }
    function right() {
      busy = true; P.stop(); ctx.right(k, miss); playSfx('good'); el('.wk-cust').classList.remove('on'); const t = T;
      // each line to its end before the next: the sum, ありがとうございました, now and then 張's word
      next(async (live) => { await quiet(box); if (!live()) return; await said(me(tillSay(t)), 900); if (!live()) return; el('.wk-cust').classList.add('bye'); await said(me(ME.bye), 900); }, !miss && Math.random() < 0.3);   // after any line still being said (ruling 27)
    }
    function gone(leave) {   // patience out: もう いいです！ and off they go, the sum shown whole; the task lost
      busy = true; ctx.right(k, 3); playSfx('bad'); const t = T; at = t.parts.length; built();
      all('.wk-tile').forEach((x) => { x.disabled = true; x.classList.remove('wk-hint'); });
      el('.wk-bub').innerHTML = `<b lang="ja">${esc(leave[0])}</b><span>${esc(leave[1])}</span>`;
      next(async (live) => { await Promise.all([line(t.who, leave[0], box), sleep(1400)]); if (live()) { el('.wk-cust').classList.add('bye'); await sleep(450); } }, false);   // said in full, from its own start (N-2)
    }
    CLASS.card('wk-till', '收銀', `${head('till', 'ふくの レジ', k)}<div class="wk-cust"></div><div class="wk-goods"></div><div class="wk-opts"></div><p class="wk-me"></p>`, (e) => {
      if (busy || !ctx.on() || !T) return;
      const o = e.target.closest('.wk-tile'); if (!o || o.disabled) return;
      if (o.dataset.p !== T.parts[at]) {   // not the next piece: a miss
        miss++; playSfx('bad'); o.classList.remove('wk-bad'); void o.offsetWidth; o.classList.add('wk-bad'); missWord(P, () => word('till', say('till').miss, 'bad', box), MISS_COST.till, box); if (miss >= 2) built(); return;   // his word to its end, then its cost (ruling 27)
      }
      at++; o.disabled = true; built(); if (at < T.parts.length) SND.play('place', { vol: 0.5 }); else right();
    });
    box = document.querySelector('.cls.wk-till');
    show();
  }
  function tillLines(add) {
    CUST.forEach((id) => ['one', 'two', 'sum'].forEach((kind) => add(id, tillAsk({ kind })[0])));
    const ps = FUKU().map((g) => g[2]), sums = new Set(ps.map((a) => 2 * a));   // every sum a shift can ask: one twice, two
    ps.forEach((a, i) => ps.forEach((b, j) => { if (j > i) sums.add(a + b); }));
    ps.forEach((n) => add('hero', tillSay({ kind: 'one', sum: n })[0])); [...sums].sort((a, b) => a - b).forEach((n) => add('hero', tillSay({ kind: 'sum', sum: n })[0]));
    const s = say('till'); [s.miss, s.end, ...s.ok].forEach((l) => add(s.who, l[0]));
  }

  // ---- 包包子 (福明, 王): 2026-11-15, the user — the old one (王's word for a step, pictures to tap) had nothing Japanese in it. Now a
  // close-up of the hero at the board (head and shoulders, no arms: a round hand does the work), the bun in front, the steamer
  // beside; under it six cells of kana. A kana is said (the app's own clip) — tap it: the bun goes one step on, that cell takes
  // a new kana and the next is said at once. Six steps a bun (BUN_STEPS, their words in small print only), thirty taps = five buns;
  // every three taps one of the shift's ten (ctx.right with their misses), so leaving halfway, coming back, the grade and the pay
  // are as ever. A miss: the cell shakes, 王's ちがう！ in print (no voice over the kana), the bun goes askew (it stays so), the
  // sound again; the same one missed twice, its cell lights. All thirty right (and no bun late), the five buns shine together and
  // 王 is beside himself (中華一番's style, 2026-11-14); a bun of six without a miss, かんぺきだ！ as it comes out. 2026-11-19 (the
  // user: every job timed, as 外場 is): each bun on its own clock (BUN_SECS, the bar by the speaker; 15 s, 2026-11-20: 30 was too long) — out, 王's おそい！, the bun left
  // a sorry lump (2026-11-20, the user: an ugly bun for one not finished) that goes into the steamer so, its tasks lost, and the
  // next is begun. The cells: never two that sound the same (お／を, あ／ア); half the time a new one sounds or looks like one
  // there. The first job, at five kana seen (2026-11-19): four cells while under twelve are seen, six after; hiragana and katakana
  // both, as seen (2026-11-20, the user — 張's words that came in with test.31 went out again: kana only) ----
  const BUN_STEPS = ['こねる', 'のばす', 'のせる', 'つつむ', 'ならべる', 'むす'], TAPS = 30, PER = TAPS / N, BUN_SECS = 15;
  const LATE = 9;   // a task lost to a bun's clock: kept apart from misses (three in one three are a finished bun), so a shift resumed draws it ugly (the review, 2026-11-20)
  const bunPool = () => { const seen = WORK.kana(), all = REG.kana.filter((x) => x.seion).map((x) => x.ch), p = all.filter((c) => seen.has(c)); return p.length >= 5 ? p : all.slice(0, 5); };   // 清音 of both scripts
  const bunCells = (pool) => (pool.length >= 12 ? 6 : 4);
  function boardNew(board, pool, was) {   // a kana for a cell (was: the one it held): not on the board, no twin of one left there; half the time kin of one there
    const rest = board.filter((x) => x !== was), out = pool.filter((c) => !board.includes(c)), free = out.filter((c) => !rest.some((x) => twin(x, c)));
    const near = free.filter((c) => rest.some((x) => kin(KANA_SOUNDALIKE, hira(x)).includes(hira(c)) || kin(KANA_LOOKALIKE, x).includes(c)));
    return near.length && Math.random() < 0.5 ? pick(near) : free.length ? pick(free) : was !== undefined ? was : out.length ? pick(out) : was;   // none twin-free: a cell keeps its kana; a new board from a pool too small, as it is
  }
  // the bun at step n (0 flour … 5 in the steamer's ring, 6 steamed), askew when missed; drawn round (0, 0), ~60 wide
  function bunArt(n, flaw) {
    const pleat = '<path d="M0 -20 l-7 11 M0 -20 l7 11 M0 -20 v12 M0 -20 l-13 7 M0 -20 l13 7" stroke="#d8c8a8" stroke-width="1.3" fill="none"/>';
    const art = [
      '<ellipse cx="0" cy="4" rx="30" ry="11" fill="#f7f2e8"/><ellipse cx="0" cy="1" rx="22" ry="7" fill="#fbf8f1"/><ellipse cx="0" cy="1" rx="8" ry="3" fill="#e9dfcc"/>',
      '<path d="M-25 7 Q-28 -13 0 -15 Q28 -13 25 7 Z" fill="#f1e4c8" stroke="#dccaa4" stroke-width="1.3"/><path d="M-12 -4 q6 -4 12 0 M2 2 q6 -4 12 0" stroke="#dccaa4" stroke-width="1.2" fill="none"/>',
      '<ellipse cx="0" cy="3" rx="31" ry="10" fill="#f4e8cf" stroke="#dccaa4" stroke-width="1.3"/>',
      '<ellipse cx="0" cy="3" rx="31" ry="10" fill="#f4e8cf" stroke="#dccaa4" stroke-width="1.3"/><ellipse cx="0" cy="0" rx="13" ry="6" fill="#a8584a"/><circle cx="-4" cy="-1" r="1.7" fill="#d88a6a"/><circle cx="4" cy="1" r="1.4" fill="#5a8a4a"/>',
      `<path d="M-24 8 Q-24 -16 0 -20 Q24 -16 24 8 Z" fill="#f4ead8" stroke="#d8c8a8" stroke-width="1.3"/>${pleat}`,
      `<rect x="-33" y="4" width="66" height="13" rx="4" fill="#c9a46e"/><path d="M-33 10 h66" stroke="#a8834e" stroke-width="1.2"/><path d="M-24 8 Q-24 -16 0 -20 Q24 -16 24 8 Z" fill="#f4ead8" stroke="#d8c8a8" stroke-width="1.3"/>${pleat}`,
      `<path d="M-27 8 Q-27 -24 0 -27 Q27 -24 27 8 Z" fill="#fffaf0" stroke="#e4d8c0" stroke-width="1.3"/><path d="M0 -27 l-7 11 M0 -27 l7 11 M0 -27 v12" stroke="#e4d8c0" stroke-width="1.2" fill="none"/>`][n];
    return flaw ? `<g transform="rotate(-9) skewX(-12)">${art}</g><path d="M14 -6 l5 3" stroke="#c8a080" stroke-width="1.4"/>` : art;
  }
  // a bun its clock ran out on (2026-11-20, the user: an ugly bun for one not finished): slumped, lumpy, torn, its filling out
  const BUN_UGLY = '<ellipse cx="2" cy="10" rx="34" ry="5" fill="#000" opacity=".12"/>'
    + '<path d="M-31 9 Q-35 -2 -26 -7 Q-27 -19 -14 -17 Q-9 -27 2 -21 Q8 -30 15 -21 Q27 -22 26 -10 Q35 -6 31 3 Q33 10 22 10 Q8 13 -6 10 Q-20 13 -31 9 Z" fill="#e4d3ab" stroke="#b39466" stroke-width="1.5"/>'
    + '<path d="M-22 -2 Q-18 -9 -10 -6 M-24 4 q6 -3 12 1" stroke="#c9b083" stroke-width="1.3" fill="none" stroke-linecap="round"/><ellipse cx="-15" cy="-10" rx="6" ry="3.5" fill="#d6c193" opacity=".8"/><ellipse cx="18" cy="-12" rx="4" ry="2.5" fill="#d6c193" opacity=".8"/>'
    + '<path d="M2 -21 q-3 -9 4 -12 q5 2 1 7 q-2 3 -5 5 Z" fill="#e4d3ab" stroke="#b39466" stroke-width="1.4" stroke-linejoin="round"/>'   // the pleats twisted to a knot
    + '<path d="M5 -13 Q14 -15 18 -6 Q19 2 12 4 Q4 3 3 -4 Q2 -10 5 -13 Z" fill="#8a3d2c" stroke="#6a2a1e" stroke-width="1"/><circle cx="9" cy="-8" r="1.8" fill="#b8604a"/><circle cx="13" cy="-3" r="1.3" fill="#5a8a4a"/>'   // torn, the filling out
    + '<path d="M15 3 Q19 7 18 12" stroke="#8a3d2c" stroke-width="3" stroke-linecap="round" fill="none"/><ellipse cx="18" cy="12.5" rx="4" ry="1.6" fill="#8a3d2c"/><path d="M-6 -15 l3 6 M-12 -4 l4 3" stroke="#b39466" stroke-width="1.2" stroke-linecap="round" fill="none"/>';
  const bunBust = () => {   // the hero's head and shoulders, no arms (EATSCENE's way), 150 wide at x 105
    const host = document.createElement('div'); host.innerHTML = HERO.head(state.look, 'bust'); const svg = host.querySelector('svg'); if (!svg) return '';
    const vb = svg.getAttribute('viewBox').split(' ').map(Number); svg.querySelectorAll('.arm').forEach((x) => x.remove());
    return svg.outerHTML.replace('<svg ', `<svg x="105" y="6" width="150" height="${(vb[3] * 150 / vb[2]).toFixed(1)}" `);
  };
  let BN = null, bunRun = 0;   // the board now (for the tests): { target, board, tap, wait, lump }; the run whose card is up
  function bunsRun(ctx) {
    const run = ++bunRun, mine = () => run === bunRun && Boolean(document.querySelector('.wk-buns .wk-keys'));   // this run's card only (shut and opened again: the new run's)
    const s = say('buns'), pool = bunPool(), fresh = ctx.done === 0, bust = bunBust(), score = (WORK.today() || {}).score || {};
    let tap = ctx.done * PER, board = [], target = null, miss = 0, bunMiss = 0, trioMiss = 0, wrong = 0, late = 0, lump = false, busy = false, Q = null;   // late: buns past their clock; lump: one just so, on the board; Q: this bun's clock
    // buns done before ('ok' perfect, 'flaw' askew, 'ugly' late): perfect if their two tasks were; late if the last was lost (LATE)
    const made = Array.from({ length: Math.floor(tap / BUN_STEPS.length) }, (_, b) => (score[2 * b + 1] >= LATE ? 'ugly' : !score[2 * b] && !score[2 * b + 1] ? 'ok' : 'flaw'));
    if (tap % BUN_STEPS.length) bunMiss = score[tap / PER - 1] || 0;   // half a bun done: askew if its first three were missed
    const el = (q) => document.querySelector('.wk-buns ' + q), live = () => mine() && ctx.on();
    const quiet = ([ja, zh], cls = '') => { const p = el('.wk-say'); if (p) { p.innerHTML = `<b lang="ja">${esc(ja)}</b><span>${esc(zh)}</span>`; p.className = 'wk-say' + (cls ? ' ' + cls : ''); } };
    const now = () => { BN = { target, board: board.slice(), tap, wait: busy, lump }; };
    function art() {
      const c = el('.wk-closeup'); if (!c) return;
      const n = tap % BUN_STEPS.length, flaw = bunMiss > 0, spots = [[-26, 4], [0, 4], [26, 4], [-13, -12], [13, -12]];
      c.dataset.step = String(n); c.classList.toggle('flaw', flaw); c.classList.toggle('lump', lump);
      c.innerHTML = `<svg viewBox="0 0 360 190" aria-hidden="true">${bust}
        <rect x="8" y="120" width="344" height="70" rx="10" fill="#c8955a"/><rect x="8" y="120" width="344" height="7" rx="3" fill="#dcae74"/><rect x="104" y="128" width="152" height="54" rx="10" fill="#e9c48e" stroke="#b9834a" stroke-width="2"/>
        <g transform="translate(180 152)"><g class="wk-bunnow">${lump ? BUN_UGLY : bunArt(n, flaw)}</g>${lump ? '' : `<circle class="wk-hand" cx="22" cy="-20" r="9" fill="${esc((state.look && state.look.skin) || '#f3d1b5')}" stroke="#2b1c12" stroke-opacity=".25"/>`}</g>
        <text x="180" y="186" text-anchor="middle" font-size="11" fill="#6e4a30" lang="ja">${lump ? '' : esc(BUN_STEPS[n])}</text>
        <g class="wk-steamer" transform="translate(304 150)"><ellipse cx="0" cy="12" rx="44" ry="12" fill="#a8834e"/><ellipse cx="0" cy="4" rx="44" ry="14" fill="#d9b98a" stroke="#a8834e" stroke-width="2"/>
          ${made.map((m, b) => `<g class="wk-done${m === 'flaw' ? '' : ' ' + m}" transform="translate(${spots[b][0]} ${spots[b][1]}) scale(.42)">${m === 'ugly' ? BUN_UGLY : bunArt(6, m === 'flaw')}</g>`).join('')}</g>
        <g transform="translate(54 156)"><ellipse cx="0" cy="8" rx="30" ry="9" fill="#8a5a34"/><ellipse cx="0" cy="2" rx="30" ry="10" fill="#f0e2c4" stroke="#8a5a34" stroke-width="2"/><ellipse cx="0" cy="1" rx="20" ry="5" fill="#fbf8f1"/></g></svg>`;
    }
    function keys() { const k = el('.wk-keys'); if (!k) return; k.className = 'wk-keys' + (board.length < 6 ? ' four' : '');
      k.innerHTML = board.map((c) => `<button type="button" class="wk-key" data-k="${esc(c)}" lang="ja">${esc(c)}</button>`).join(''); }
    // the next sound: a kana on the board, not the last one
    function ask() {
      target = pick(board.filter((c) => c !== target)); miss = 0; keys(); now(); speak(target);
      if (!Q) Q = clock(BUN_SECS, live, (p, m) => { const c = el('.wk-clock'); if (c) { c.style.setProperty('--p', p.toFixed(3)); c.dataset.mood = m; } }, out);   // a bun begun (or a shift taken up again): its clock
      Q.go();
    }
    // the bun's clock out: the rest of its tasks lost, the bun a lump on the board while 王 says おそい！ — then into the steamer
    // so, and the next bun (the last: left on the board, the shift over)
    function out() {
      Q = null; late++; busy = true; const last = (Math.floor(tap / BUN_STEPS.length) + 1) * BUN_STEPS.length;
      for (let i = Math.floor(tap / PER); i < last / PER; i++) ctx.right(i, LATE);
      tap = last; trioMiss = 0; bunMiss = 0; lump = true; target = null; keys(); now(); art(); playSfx('bad'); quiet(s.late, 'bad');
      const n = el('.wk-n'); if (n) n.textContent = `${Math.min(tap + 1, TAPS)}／${TAPS}`;
      if (tap >= TAPS) { BN = null; end(); return; }
      said(speakAs(s.who, s.late[0]), 900).then(() => { if (!live()) return; lump = false; made.push('ugly'); art(); busy = false; ask(); });
    }
    function end() {
      const best = fresh && !wrong && !late;   // from the shift's start, all thirty right, no bun late
      const bye = sleep(200).then(() => {   // 王's word to its end, then the card shut
        if (!mine()) return null;
        if (best) { const c = el('.cls-card') || document.querySelector('.wk-buns .cls-card'); if (c) c.classList.add('wk-shine-all'); }
        return said(word('buns', best ? s.all : s.end, 'ok'), best ? 1600 : 900).then(() => { if (mine()) CLASS.close(); });
      });
      ctx.finish({}, bye);   // paid now, the results after the goodbye
    }
    function right(b) {
      SND.play('place', { vol: 0.5 }); tap++; trioMiss += miss;
      const h = el('.wk-hand'); if (h) { h.classList.remove('go'); void h.getBoundingClientRect(); h.classList.add('go'); }
      if (tap % PER === 0) { ctx.right(tap / PER - 1, Math.min(trioMiss, LATE - 1)); trioMiss = 0; }
      const i = board.indexOf(target); board[i] = boardNew(board, pool, target); keys();
      const n = el('.wk-n'); if (n) n.textContent = `${Math.min(tap + 1, TAPS)}／${TAPS}`;
      if (tap % BUN_STEPS.length) { art(); ask(); return; }
      // a bun done: out of the steamer, into it with the rest; 王's word, then the next sound
      if (Q) { Q.stop(); Q = null; }
      made.push(bunMiss ? 'flaw' : 'ok'); const perfect = !bunMiss; bunMiss = 0; busy = true; target = null; now(); art();
      const c = el('.wk-closeup'); if (c && perfect) { c.classList.remove('wk-shine'); void c.offsetWidth; c.classList.add('wk-shine'); }
      if (tap >= TAPS) { BN = null; if (perfect) quiet(pick(s.shine), 'ok'); end(); return; }
      const line = perfect ? pick(s.shine) : Math.random() < 0.5 ? pick(s.ok) : null;
      if (perfect) playSfx('good');
      Promise.race([line ? (quiet(line, perfect ? 'ok' : ''), speakAs(s.who, line[0])) : Promise.resolve(), new Promise((ok) => setTimeout(ok, 2500))])
        .then(() => new Promise((ok) => setTimeout(ok, 250))).then(() => { if (!live()) return; busy = false; ask(); });
    }
    CLASS.card('wk-buns', '包包子', `${head('buns', 'ふくめい', ctx.done)}<div class="wk-closeup" data-step="0"></div>
      <div class="wk-krow"><button type="button" class="wk-ear" aria-label="再聽一次">${icon('speaker')}</button><div class="wk-clock"><i></i></div></div><div class="wk-keys"></div>`, (e) => {
      if (busy || !ctx.on() || !target) return;
      if (e.target.closest('.wk-ear')) { speak(target); return; }
      const b = e.target.closest('.wk-key'); if (!b) return;
      if (b.dataset.k === target) { right(b); return; }
      miss++; bunMiss++; wrong++; playSfx('bad'); b.classList.remove('wk-bad'); void b.offsetWidth; b.classList.add('wk-bad'); quiet(s.miss, 'bad'); art();
      if (miss >= 2) document.querySelectorAll('.wk-key').forEach((x) => x.classList.toggle('wk-hint', x.dataset.k === target));
      setTimeout(() => { if (live() && target) speak(target); }, 350);
    });
    const n = el('.wk-n'); if (n) n.textContent = `${tap + 1}／${TAPS}`;
    while (board.length < bunCells(pool)) board.push(boardNew(board, pool));
    art(); keys(); ask();
  }
  function bunsLines(add) { const s = say('buns'); [s.all, s.end, s.late].concat(s.ok, s.shine).forEach((l) => add(s.who, l[0])); }

  WORK.register('buns', { run: bunsRun, lines: bunsLines });
  WORK.register('counter', { run: counterRun, lines: counterLines });
  WORK.register('till', { run: tillRun, lines: tillLines, left: tillLeft, open: allNums });
  return { pat: PAT, clock, said, whole, LINE_CAP, voice, quiet, queue, line, missWord, grr, patience, custHtml, hold, reading, inSight, bring, desk, talkLine, goodPic, rng, pickR, shuffleR, counter: { make: counterMake, run: counterRun, now: () => C, sayer }, till: { make: tillMake, run: tillRun, now: () => T, spell, left: tillLeft, allNums, numsTool }, buns: { run: bunsRun, now: () => BN, boardNew } };
})();
