'use strict';
// ---------- 中華街の打工's four jobs (2026-11-14; docs/superpowers/specs/2026-11-14-chinatown-work-design.md §6) ----------
// Each a runner WORK starts with its ctx (WORK.register): ten tasks from what the learner has seen — 中華街 is the first and lowest
// of the workplaces, so kana, kana-only 入門 words, and (收銀) N5's numbers, no kanji. A task right is ctx.right(k, misses) as it
// is done; the tenth: ctx.finish().
const JOBS = (() => {
  const N = 10, pick = (a) => a[Math.floor(Math.random() * a.length)];
  const say = (job) => TOWN.WORK.say[job];
  const words = () => REG.vocab.filter((v) => v.lv === 'PRE_N5' && v.w === v.r && /^[ぁ-ゖァ-ヺー]+$/.test(v.w) && state.srs[v.key]).map((v) => v.w);
  // the keeper's word at the top of the card, said in their voice (ends as it is said)
  function word(job, [ja, zh], cls = '') {
    const p = document.querySelector('.wk-say'); if (p) { p.innerHTML = `<b lang="ja">${esc(ja)}</b><span>${esc(zh)}</span>`; p.className = 'wk-say' + (cls ? ' ' + cls : ''); }
    return speakAs(say(job).who, ja);
  }
  // a line said to its end, then on (2026-11-18, the user: in the jobs out on the street the next customer cut the voices off —
  // each line stops the one before): once p (a line being said, or none) is over — at least min ms, at most max (a clip that never ends)
  const said = (p, min = 0, max = 5000) => Promise.all([Promise.race([Promise.resolve(p).catch(() => {}), sleep(max)]), sleep(min)]);
  const head = (job, title, k) => `<button type="button" class="cls-x" data-cls="x" aria-label="關閉">✕</button>
    <div class="wk-head"><b lang="ja">${title}</b><span class="wk-n">${Math.min(k + 1, N)}／${N}</span></div>
    <div class="wk-who"><span class="kr-face">${TOWNEV.face(say(job).who)}</span><p class="wk-say"></p></div>`;

  // 包包子's board (整理貨架's too, till 2026-11-19): kana a Taiwanese ear takes for each other (つ for す, ら for な …), and
  // ones no ear can tell apart, never side by side
  const KANA_SOUNDALIKE = [['す', 'つ'], ['し', 'ち'], ['し', 'ひ'], ['な', 'ら'], ['ぬ', 'る'], ['ね', 'れ'], ['の', 'ろ']];
  const KANA_SAMESOUND = [['お', 'を'], ['じ', 'ぢ'], ['ず', 'づ']];
  const kin = (groups, c) => groups.filter((g) => g.includes(c)).flat().filter((x, i, all) => x !== c && all.indexOf(x) === i);
  const twin = (a, b) => KANA_SAMESOUND.some((g) => g.includes(a) && g.includes(b));

  // ---- 站櫃 (らんらん, 周おばあさん): a customer comes to the counter (the cruise's passengers, out shopping, each in their own
  // voice) after the hero's いらっしゃいませ, and asks for one of four things on it, labelled in kana — only things whose name's
  // kana are all seen. The word asked for is heard, not shown (2026-11-15, the user: printed in the bubble too, it was only matching
  // the same kana): a blank in the bubble, tapped to hear it again, filled in once handed over or after two misses. Once ふたつ is
  // learned, now and then two of it (tap it twice). Handed over: ありがとうございました. Its prices asked went to 收銀 (2026-11-19,
  // the user: 周 keeps the listening, no reckoning) ----
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
  let C = null;   // the customer at the counter now (its task)
  const goodPic = (key) => { const d = (typeof PICS === 'object' && PICS[key]) || (typeof PICS_TOWN === 'object' && PICS_TOWN[key]); return d ? `<svg class="pic" viewBox="0 0 100 100" aria-hidden="true"><circle class="pd" cx="50" cy="50" r="47"/>${d}</svg>` : ''; };
  function counterRun(ctx) {
    const tasks = counterMake(), first = !Object.values(state.work.res).some((r) => r.place === 'counter' && r.yen !== undefined); let k = ctx.done, miss = 0, got = 0, busy = true;
    const el = (s) => document.querySelector('.wk-counter ' + s);
    const bub = (open) => { const [ja, zh] = ask(C), w = C.good[0], line = open ? esc(ja) : `<button type="button" class="wk-ear" aria-label="再聽一次">🔊</button>${esc(ja.slice(w.length))}`;   // the word heard, not read, till handed over
      el('.wk-bub').innerHTML = `<b lang="ja">${line}</b><span>${esc(zh)}</span>${C.kind === 'two' ? `<i class="wk-cnt">${got}／2</i>` : ''}`; };
    const me = (l) => { const p = el('.wk-me'); if (p) p.innerHTML = `<b lang="ja">${esc(l[0])}</b>${first ? `<span>${esc(l[1])}</span>` : ''}`; return speakAs('hero', l[0]); };
    function show() {
      C = tasks[k]; miss = 0; got = 0; busy = true; if (!el('.wk-goods')) return;
      el('.wk-n').textContent = `${k + 1}／${N}`;
      el('.wk-goods').innerHTML = C.goods.map((g) => `<button type="button" class="wk-good" data-good="${esc(g[0])}">${goodPic(g[1])}<b lang="ja">${esc(g[0])}</b><small>${g[2]}円</small></button>`).join('');
      el('.wk-opts').innerHTML = ''; el('.wk-cust').className = 'wk-cust'; el('.wk-cust').innerHTML = `<span class="kr-face">${TOWNEV.face(C.who)}</span><p class="wk-bub"></p>`;
      said(me(ME.hi), 800).then(() => {   // the customer asks, once いらっしゃいませ is said
        if (!el('.wk-cust') || C !== tasks[k] || !ctx.on()) return;
        bub(false); el('.wk-cust').classList.add('on'); speakAs(C.who, ask(C)[0]); busy = false;
      });
    }
    function wrong(b) {
      miss++; playSfx('bad'); b.classList.remove('wk-bad'); void b.offsetWidth; b.classList.add('wk-bad'); word('counter', say('counter').miss, 'bad');
      if (miss >= 2) { document.querySelectorAll('.wk-good').forEach((x) => x.classList.toggle('wk-hint', x.dataset.good === C.good[0])); bub(true); }
    }
    function right() {
      busy = true; ctx.right(k, miss); playSfx('good'); bub(true); el('.wk-cust').classList.remove('on');
      const praise = !miss && Math.random() < 0.25, live = () => el('.wk-cust') && (ctx.on() || k >= N);   // this run's card only
      k++;
      // each line to its end before the next: ありがとうございました, now and then 周's word, then the next customer — or 周's
      // thanks and the card shut
      const bye = (async () => {
        el('.wk-cust').classList.add('bye'); await said(me(ME.bye), 900);
        if (praise && live()) await said(word('counter', pick(say('counter').ok)));
        if (!live()) return;
        if (k < N) { show(); return; }
        await said(word('counter', say('counter').end, 'ok'), 700); if (el('.wk-cust')) CLASS.close();
      })();
      if (k >= N) ctx.finish({}, bye);   // paid now, the results after the goodbye
    }
    CLASS.card('wk-counter', '站櫃', `${head('counter', 'らんらん', k)}<div class="wk-cust"></div><div class="wk-goods"></div><div class="wk-opts"></div><p class="wk-me"></p>`, (e) => {
      if (busy || !ctx.on() || !C) return;
      if (e.target.closest('.wk-ear')) { speakAs(C.who, ask(C)[0]); return; }
      const g = e.target.closest('.wk-good'); if (!g) return;
      if (g.dataset.good !== C.good[0]) { wrong(g); return; }
      if (C.kind === 'two' && ++got < 2) { const c = el('.wk-cnt'); if (c) c.textContent = `${got}／2`; SND.play('place', { vol: 0.5 }); return; }
      right();
    });
    show();
  }
  function counterLines(add) {
    GOODS().forEach((g) => { add(sayer(g[0]), `${g[0]}を ください。`); add(sayer(g[0]), `${g[0]}を ふたつ ください。`); });
    [ME.hi, ME.bye].forEach((l) => add('hero', l[0]));
    const s = say('counter'); [s.miss, s.end, ...s.ok].forEach((l) => add(s.who, l[0]));
  }

  // ---- 收銀 (ふく, 張さん): 2026-11-19, the user — 張's labels heard went to 包包子; his shop is the money now, the last and
  // hardest of the four (a clear step from job to job). A customer puts their things on the counter, each with its tag: one (これ、
  // いくらですか。), two — or one of it twice, once ふたつ is learned (ぜんぶで いくらですか。／これを ふたつ ください。) —, three toward
  // the shift's end. The sum reckoned in one's head and spelled in pieces: the thousands (せん, に＋せん, さん＋ぜん), the hundreds'
  // digit and ひゃく as it sounds after it (さんびゃく, ろっぴゃく, はっぴゃく), えん — among near misses: ひゃく's other sounds,
  // せん／ぜん, ろく by ろっ, はち by はっ, いち before a bare ひゃく or せん, a digit beside (an addition slipped). Open once いくら, 円, 百,
  // 千 and 二〜九 are learned; a miss is 張's ちがう！, two and the next piece lights; then the hero says it ----
  const FUKU = () => TOWN.WORK.fuku;
  const PIECE = { 2: 'に', 3: 'さん', 4: 'よん', 5: 'ご', 6: 'ろっ', 7: 'なな', 8: 'はっ', 9: 'きゅう' }, HYAKU = { 3: 'びゃく', 6: 'ぴゃく', 8: 'ぴゃく' };
  const SENS = { 2: 'に', 3: 'さん', 4: 'よん', 5: 'ご', 6: 'ろく', 7: 'なな', 8: 'はっ', 9: 'きゅう' };
  function spell(n) {
    const th = Math.floor(n / 1000), d = Math.floor(n / 100) % 10;
    const parts = [...(!th ? [] : th === 1 ? ['せん'] : [SENS[th], th === 3 ? 'ぜん' : 'せん']), ...(!d ? [] : d === 1 ? ['ひゃく'] : [PIECE[d], HYAKU[d] || 'ひゃく']), 'えん'];
    const must = [...(d ? ['ひゃく', 'びゃく', 'ぴゃく'] : ['ひゃく']), ...(th ? [th === 3 ? 'せん' : 'ぜん'] : []), ...(d === 1 || (th === 1 && !d) ? ['いち'] : []), ...({ 6: ['ろく'], 8: ['はち'] }[d] || [])];
    const beside = [d - 1, d + 1].filter((x) => d >= 2 && PIECE[x]).map((x) => PIECE[x]).concat(th ? [SENS[th + 1] || 'に'] : []);
    const keep = [...new Set(must)].filter((x) => !parts.includes(x)), room = Math.max(0, Math.min(2, 9 - parts.length - keep.length));   // nine tiles at most: three rows on a phone
    const near = keep.concat(shuffle([...new Set(beside)].filter((x) => !parts.includes(x) && !keep.includes(x))).slice(0, room));
    return { parts, tiles: shuffle([...parts, ...near]) };
  }
  const TILL_WORDS = [['いくら'], ['えん', '円'], ['ひゃく', '百'], ['せん', '千'], ...DIGIT.slice(2).map(([w, r]) => [r, w])];
  // the test site only (2026-11-19, the user had never met a price): 收銀 open, whatever is learned
  const NUMS = 'nq_work_nums', allNums = () => { try { return onTestSite() && localStorage.getItem(NUMS) === '1'; } catch (e) { return false; } };
  function numsTool() { const on = !allNums(); try { localStorage.setItem(NUMS, on ? '1' : ''); } catch (e) { /* no storage */ } return on ? '收銀：不看學過沒（這台裝置），沒學數字也能做' : '收銀：恢復要先學過いくら、円和數字'; }
  const tillLeft = () => (allNums() ? [] : TILL_WORDS.filter(([r, w]) => !learned(r, w)).map(([r, w]) => w || r));   // the words still to learn
  const tillAsk = (t) => (t.kind === 'one' ? ['これ、いくらですか。', '這個多少錢？'] : t.kind === 'two' ? ['これを ふたつ ください。', '這個請給我兩個。'] : ['ぜんぶで いくらですか。', '全部多少錢？']);
  const tillSay = (t) => (t.kind === 'one' ? [`${YEN.reading(t.sum)}です。`, `${t.sum} 日圓。`] : [`ぜんぶで ${YEN.reading(t.sum)}です。`, `全部 ${t.sum} 日圓。`]);
  function tillMake() {
    const all = FUKU(), two = learned('ふたつ');
    return Array.from({ length: N }, (_, k) => {
      const many = k < 3 ? 1 : k < 7 ? 2 : 3, twice = many === 2 && two && Math.random() < 0.35, one = pick(all);
      const things = twice ? [one, one] : shuffle([...all]).slice(0, many), sum = things.reduce((a, g) => a + g[2], 0);
      return Object.assign({ kind: many === 1 ? 'one' : twice ? 'two' : 'sum', things, sum, who: pick(CUST) }, spell(sum));
    });
  }
  let T = null;   // the customer at the till now (its task)
  function tillRun(ctx) {
    const tasks = tillMake(), first = !Object.values(state.work.res).some((r) => r.place === 'till' && r.yen !== undefined); let k = ctx.done, miss = 0, at = 0, busy = true;   // at: the pieces tapped so far
    const el = (s) => document.querySelector('.wk-till ' + s);
    const me = (l) => { const p = el('.wk-me'); if (p) p.innerHTML = `<b lang="ja">${esc(l[0])}</b>${first ? `<span>${esc(l[1])}</span>` : ''}`; return speakAs('hero', l[0]); };
    function show() {
      T = tasks[k]; miss = 0; at = 0; busy = true; if (!el('.wk-goods')) return;
      el('.wk-n').textContent = `${k + 1}／${N}`; el('.wk-goods').className = `wk-goods n${T.things.length}`;
      el('.wk-goods').innerHTML = T.things.map((g) => `<span class="wk-good">${goodPic(g[1])}<b lang="ja">${esc(g[0])}</b><small>${g[2]}円</small></span>`).join('');
      el('.wk-opts').innerHTML = ''; el('.wk-cust').className = 'wk-cust'; el('.wk-cust').innerHTML = `<span class="kr-face">${TOWNEV.face(T.who)}</span><p class="wk-bub"></p>`;
      said(me(ME.hi), 800).then(() => {   // the customer asks, once いらっしゃいませ is said; then the pieces
        if (!el('.wk-cust') || T !== tasks[k] || !ctx.on()) return;
        const [ja, zh] = tillAsk(T); el('.wk-bub').innerHTML = `<b lang="ja">${esc(ja)}</b><span>${esc(zh)}</span>`; el('.wk-cust').classList.add('on'); speakAs(T.who, ja); busy = false;
        el('.wk-opts').innerHTML = `<p class="wk-spell" lang="ja"></p>${T.tiles.map((p) => `<button type="button" class="btn btn-sm wk-opt wk-tile" data-p="${esc(p)}" lang="ja">${esc(p)}</button>`).join('')}`; built();
      });
    }
    // the sum as tapped so far, a blank for each piece to come; after two misses the next piece lights
    function built() {
      const p = el('.wk-spell'); if (!p) return; p.innerHTML = T.parts.map((x, i) => (i < at ? `<b>${esc(x)}</b>` : '<i></i>')).join('');
      if (miss >= 2) document.querySelectorAll('.wk-till .wk-tile').forEach((x) => x.classList.toggle('wk-hint', at < T.parts.length && !x.disabled && x.dataset.p === T.parts[at]));
    }
    function right() {
      busy = true; ctx.right(k, miss); playSfx('good'); el('.wk-cust').classList.remove('on');
      const t = T, praise = !miss && Math.random() < 0.3, live = () => el('.wk-cust') && (ctx.on() || k >= N);   // this run's card only
      k++;
      // each line to its end before the next: the sum, ありがとうございました, now and then 張's word, then the next customer — or 張's
      // おつかれさま and the card shut
      const bye = (async () => {
        await said(me(tillSay(t)), 900); if (!live()) return;
        el('.wk-cust').classList.add('bye'); await said(me(ME.bye), 900);
        if (praise && live()) await said(word('till', pick(say('till').ok)));
        if (!live()) return;
        if (k < N) { show(); return; }
        await said(word('till', say('till').end, 'ok'), 700); if (el('.wk-cust')) CLASS.close();
      })();
      if (k >= N) ctx.finish({}, bye);   // paid now, the results after the goodbye
    }
    CLASS.card('wk-till', '收銀', `${head('till', 'ふくの レジ', k)}<div class="wk-cust"></div><div class="wk-goods"></div><div class="wk-opts"></div><p class="wk-me"></p>`, (e) => {
      if (busy || !ctx.on() || !T) return;
      const o = e.target.closest('.wk-tile'); if (!o || o.disabled) return;
      if (o.dataset.p !== T.parts[at]) {   // not the next piece: a miss
        miss++; playSfx('bad'); o.classList.remove('wk-bad'); void o.offsetWidth; o.classList.add('wk-bad'); word('till', say('till').miss, 'bad'); if (miss >= 2) built(); return;
      }
      at++; o.disabled = true; built(); if (at < T.parts.length) SND.play('place', { vol: 0.5 }); else right();
    });
    show();
  }
  function tillLines(add) {
    CUST.forEach((id) => ['one', 'two', 'sum'].forEach((kind) => add(id, tillAsk({ kind })[0])));
    const ps = FUKU().map((g) => g[2]), sums = new Set(ps.map((a) => 2 * a));   // every sum a shift can ask: one twice, two, three
    ps.forEach((a, i) => ps.forEach((b, j) => { if (j > i) { sums.add(a + b); ps.forEach((c, m) => { if (m > j) sums.add(a + b + c); }); } }));
    ps.forEach((n) => add('hero', tillSay({ kind: 'one', sum: n })[0])); [...sums].sort((a, b) => a - b).forEach((n) => add('hero', tillSay({ kind: 'sum', sum: n })[0]));
    const s = say('till'); [s.miss, s.end, ...s.ok].forEach((l) => add(s.who, l[0]));
  }

  // ---- 包包子 (福明, 王): 2026-11-15, the user — the old one (王's word for a step, pictures to tap) had nothing Japanese in it. Now a
  // close-up of the hero at the board (head and shoulders, no arms: a round hand does the work), the bun in front, the steamer
  // beside; under it six cells of hiragana. A kana is said (the app's own clip) — tap it: the bun goes one step on, that cell takes
  // a new kana and the next is said at once. Six steps a bun (BUN_STEPS, their words in small print only), thirty taps = five buns;
  // every three taps one of the shift's ten (ctx.right with their misses), so leaving halfway, coming back, the grade and the pay
  // are as ever. A miss: the cell shakes, 王's ちがう！ in print (no voice over the kana), the bun goes askew (it stays so), the
  // sound again; the same one missed twice, its cell lights. 120 seconds on the clock from a shift's start, never cut short: all
  // thirty right inside it, the five buns shine together and 王 is beside himself (中華一番's style, 2026-11-14); a bun of six
  // without a miss, かんぺきだ！ as it comes out. The cells: never two that sound the same (お／を); half the time a new one sounds
  // or looks like one there. 2026-11-19 (the user: 張's tasks to 包包子, 張 to the money): the first job now, at five kana seen —
  // the board four cells of those while under twelve are seen, six after; and once four kana-only 入門 words are learned, a step in
  // three or so is a word said, the board four word cards for it (張's labels that were words) ----
  const BUN_STEPS = ['こねる', 'のばす', 'のせる', 'つつむ', 'ならべる', 'むす'], TAPS = 30, PER = TAPS / N, LIMIT = 120;
  const bunPool = () => { const seen = WORK.kana(), all = REG.kana.slice(0, 46).map((x) => x.ch), p = all.filter((c) => seen.has(c)); return p.length >= 5 ? p : all.slice(0, 5); };
  const bunCells = (pool) => (pool.length >= 12 ? 6 : 4);
  function boardNew(board, pool, was) {   // a kana for a cell (was: the one it held): not on the board, no twin of one there; half the time kin of one there
    const out = pool.filter((c) => !board.includes(c)), free = out.filter((c) => !board.some((x) => twin(x, c)));
    const near = free.filter((c) => board.some((x) => kin(KANA_SOUNDALIKE, x).includes(c) || kin(KANA_LOOKALIKE, x).includes(c)));
    return near.length && Math.random() < 0.5 ? pick(near) : free.length ? pick(free) : out.length ? pick(out) : was;   // a pool too small for a twin-free one: as it is
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
  const bunBust = () => {   // the hero's head and shoulders, no arms (EATSCENE's way), 150 wide at x 105
    const host = document.createElement('div'); host.innerHTML = HERO.head(state.look, 'bust'); const svg = host.querySelector('svg'); if (!svg) return '';
    const vb = svg.getAttribute('viewBox').split(' ').map(Number); svg.querySelectorAll('.arm').forEach((x) => x.remove());
    return svg.outerHTML.replace('<svg ', `<svg x="105" y="6" width="150" height="${(vb[3] * 150 / vb[2]).toFixed(1)}" `);
  };
  let BN = null, bunRun = 0;   // the board now (for the tests): { target, board, cards, tap, wait }; the run whose card is up
  function bunsRun(ctx) {
    const run = ++bunRun, mine = () => run === bunRun && Boolean(document.querySelector('.wk-buns .wk-keys'));   // this run's card only (shut and opened again: the new run's)
    const s = say('buns'), pool = bunPool(), fresh = ctx.done === 0, t0 = Date.now(), bust = bunBust(), score = (WORK.today() || {}).score || {}, ws = words();
    let tap = ctx.done * PER, board = [], cards = null, said1 = false, target = null, miss = 0, bunMiss = 0, trioMiss = 0, wrong = 0, busy = false, clock = 0;   // cards: a word step's four; said1: the last step was one
    const made = Array.from({ length: Math.floor(tap / BUN_STEPS.length) }, (_, b) => !score[2 * b] && !score[2 * b + 1]);   // buns done before: perfect if their two tasks were
    if (tap % BUN_STEPS.length) bunMiss = score[tap / PER - 1] || 0;   // half a bun done: askew if its first three were missed
    const el = (q) => document.querySelector('.wk-buns ' + q), live = () => mine() && ctx.on();
    const quiet = ([ja, zh], cls = '') => { const p = el('.wk-say'); if (p) { p.innerHTML = `<b lang="ja">${esc(ja)}</b><span>${esc(zh)}</span>`; p.className = 'wk-say' + (cls ? ' ' + cls : ''); } };
    const now = () => { BN = { target, board: board.slice(), cards: cards && cards.slice(), tap, wait: busy }; };
    function art() {
      const c = el('.wk-closeup'); if (!c) return;
      const n = tap % BUN_STEPS.length, flaw = bunMiss > 0, spots = [[-26, 4], [0, 4], [26, 4], [-13, -12], [13, -12]];
      c.dataset.step = String(n); c.classList.toggle('flaw', flaw);
      c.innerHTML = `<svg viewBox="0 0 360 190" aria-hidden="true">${bust}
        <rect x="8" y="120" width="344" height="70" rx="10" fill="#c8955a"/><rect x="8" y="120" width="344" height="7" rx="3" fill="#dcae74"/><rect x="104" y="128" width="152" height="54" rx="10" fill="#e9c48e" stroke="#b9834a" stroke-width="2"/>
        <g transform="translate(180 152)"><g class="wk-bunnow">${bunArt(n, flaw)}</g><circle class="wk-hand" cx="22" cy="-20" r="9" fill="${esc((state.look && state.look.skin) || '#f3d1b5')}" stroke="#2b1c12" stroke-opacity=".25"/></g>
        <text x="180" y="186" text-anchor="middle" font-size="11" fill="#6e4a30" lang="ja">${esc(BUN_STEPS[n])}</text>
        <g class="wk-steamer" transform="translate(304 150)"><ellipse cx="0" cy="12" rx="44" ry="12" fill="#a8834e"/><ellipse cx="0" cy="4" rx="44" ry="14" fill="#d9b98a" stroke="#a8834e" stroke-width="2"/>
          ${made.map((ok, b) => `<g class="wk-done${ok ? ' ok' : ''}" transform="translate(${spots[b][0]} ${spots[b][1]}) scale(.42)">${bunArt(6, !ok)}</g>`).join('')}</g>
        <g transform="translate(54 156)"><ellipse cx="0" cy="8" rx="30" ry="9" fill="#8a5a34"/><ellipse cx="0" cy="2" rx="30" ry="10" fill="#f0e2c4" stroke="#8a5a34" stroke-width="2"/><ellipse cx="0" cy="1" rx="20" ry="5" fill="#fbf8f1"/></g></svg>`;
    }
    function keys() { const k = el('.wk-keys'); if (!k) return; k.className = 'wk-keys' + (cards ? ' words' : board.length < 6 ? ' four' : '');
      k.innerHTML = (cards || board).map((c) => `<button type="button" class="wk-key" data-k="${esc(c)}" lang="ja">${esc(c)}</button>`).join(''); }
    // the next sound: a kana on the board, not the last one — or, words learned, now and then (never twice running) a word, its four cards up
    function ask() {
      const last = target, word = ws.length >= 4 && !said1 && last && Math.random() < 1 / 3; said1 = Boolean(word);
      if (word) { target = pick(ws); cards = shuffle([target, ...shuffle(ws.filter((w) => w !== target)).slice(0, 3)]); }
      else { cards = null; target = pick(board.filter((c) => c !== last)); }
      miss = 0; keys(); now(); speak(target);
    }
    function end() {
      const best = fresh && !wrong && Date.now() - t0 <= LIMIT * 1000;   // from the shift's start, all thirty right, inside the clock
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
      if (tap % PER === 0) { ctx.right(tap / PER - 1, trioMiss); trioMiss = 0; }
      if (!cards) { const i = board.indexOf(target); board[i] = boardNew(board, pool, target); }   // a word's cards: the board as it was
      cards = null; keys();
      const n = el('.wk-n'); if (n) n.textContent = `${Math.min(tap + 1, TAPS)}／${TAPS}`;
      if (tap % BUN_STEPS.length) { art(); ask(); return; }
      // a bun done: out of the steamer, into it with the rest; 王's word, then the next sound
      made.push(!bunMiss); const perfect = !bunMiss; bunMiss = 0; busy = true; target = null; now(); art();
      const c = el('.wk-closeup'); if (c && perfect) { c.classList.remove('wk-shine'); void c.offsetWidth; c.classList.add('wk-shine'); }
      if (tap >= TAPS) { BN = null; if (perfect) quiet(pick(s.shine), 'ok'); end(); return; }
      const line = perfect ? pick(s.shine) : Math.random() < 0.5 ? pick(s.ok) : null;
      if (perfect) playSfx('good');
      Promise.race([line ? (quiet(line, perfect ? 'ok' : ''), speakAs(s.who, line[0])) : Promise.resolve(), new Promise((ok) => setTimeout(ok, 2500))])
        .then(() => new Promise((ok) => setTimeout(ok, 250))).then(() => { if (!live()) return; busy = false; ask(); });
    }
    CLASS.card('wk-buns', '包包子', `${head('buns', 'ふくめい', ctx.done)}<div class="wk-closeup" data-step="0"></div>
      <div class="wk-krow"><button type="button" class="wk-ear" aria-label="再聽一次">🔊</button><div class="wk-clock"${fresh ? '' : ' hidden'}><i></i></div></div><div class="wk-keys"></div>`, (e) => {
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
    if (fresh) clock = setInterval(() => {   // the clock: a bar running down; past it, grey — never a stop
      const c = el('.wk-clock'); if (!c || !mine() || !ctx.on()) { clearInterval(clock); return; }
      const left = Math.max(0, 1 - (Date.now() - t0) / (LIMIT * 1000)); c.querySelector('i').style.width = `${(left * 100).toFixed(1)}%`; c.classList.toggle('out', !left);
      if (tap >= TAPS) clearInterval(clock);
    }, 200);
  }
  function bunsLines(add) { const s = say('buns'); [s.all, s.end].concat(s.ok, s.shine).forEach((l) => add(s.who, l[0])); }

  WORK.register('buns', { run: bunsRun, lines: bunsLines });
  WORK.register('counter', { run: counterRun, lines: counterLines });
  WORK.register('till', { run: tillRun, lines: tillLines, left: tillLeft });
  return { counter: { make: counterMake, run: counterRun, now: () => C, sayer }, till: { make: tillMake, run: tillRun, now: () => T, spell, left: tillLeft, allNums, numsTool }, buns: { run: bunsRun, now: () => BN } };
})();
