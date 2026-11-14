'use strict';
// ---------- 中華街の打工's four jobs (2026-11-14; docs/superpowers/specs/2026-11-14-chinatown-work-design.md §6) ----------
// Each a runner WORK starts with its ctx (WORK.register): ten tasks from what the learner has seen — 中華街 is the first and lowest
// of the workplaces, so kana, kana-only 入門 words, number words once learned, prices under 1,000 円, no kanji. A task right is
// ctx.right(k, misses) as it is done; the tenth: ctx.finish().
const JOBS = (() => {
  const N = 10, pick = (a) => a[Math.floor(Math.random() * a.length)];
  const say = (job) => TOWN.WORK.say[job];
  const words = () => REG.vocab.filter((v) => v.lv === 'PRE_N5' && v.w === v.r && /^[ぁ-ゖァ-ヺー]+$/.test(v.w) && state.srs[v.key]).map((v) => v.w);
  // the keeper's word at the top of the card, said in their voice
  function word(job, [ja, zh], cls = '') {
    const p = document.querySelector('.wk-say'); if (p) { p.innerHTML = `<b lang="ja">${esc(ja)}</b><span>${esc(zh)}</span>`; p.className = 'wk-say' + (cls ? ' ' + cls : ''); }
    speakAs(say(job).who, ja);
  }
  const head = (job, title, k) => `<button type="button" class="cls-x" data-cls="x" aria-label="關閉">✕</button>
    <div class="wk-head"><b lang="ja">${title}</b><span class="wk-n">${Math.min(k + 1, N)}／${N}</span></div>
    <div class="wk-who"><span class="kr-face">${TOWNEV.face(say(job).who)}</span><p class="wk-say"></p></div>`;

  // ---- 整理貨架 (ふく, 張さん): a box comes in, its things one at a time, each with a label; the shelf's four cells have labels too;
  // tap the cell with the same. The thing's label is heard, not shown (2026-11-15, the user: a label beside the same label is only two
  // like shapes) — a 🔊 blank, tapped to hear it again, printed once it is put away or after two misses. Labels: a seen kana each, the
  // cells holding what sounds like it (KANA_SOUNDALIKE) and what looks like it, never one that sounds the same (お／を); once four
  // kana-only 入門 words are learned, three to five of the ten are those words. Wrong: 張's ちがう！ and the thing stays; wrong
  // twice, the right cell lights up ----
  // kana a Taiwanese ear takes for each other (つ for す, ら for な …), and ones no ear can tell apart, never side by side
  const KANA_SOUNDALIKE = [['す', 'つ'], ['し', 'ち'], ['し', 'ひ'], ['な', 'ら'], ['ぬ', 'る'], ['ね', 'れ'], ['の', 'ろ']];
  const KANA_SAMESOUND = [['お', 'を'], ['じ', 'ぢ'], ['ず', 'づ']];
  const kin = (groups, c) => groups.filter((g) => g.includes(c)).flat().filter((x, i, all) => x !== c && all.indexOf(x) === i);
  const twin = (a, b) => KANA_SAMESOUND.some((g) => g.includes(a) && g.includes(b));
  function shelfMake(seen = [...WORK.kana()], ws = words()) {
    if (seen.length < 4) seen = REG.kana.slice(0, 5).map((x) => x.ch);   // never from nothing
    const nw = ws.length >= 4 ? 3 + Math.floor(Math.random() * 3) : 0;
    return shuffle(Array.from({ length: N }, (_, k) => {
      const pool = k < nw ? ws : seen, label = pick(pool);
      const alike = k < nw ? [] : [...new Set(shuffle(kin(KANA_SOUNDALIKE, label)).concat(shuffle(kin(KANA_LOOKALIKE, label))))].filter((c) => seen.includes(c));
      const rest = alike.concat(shuffle(pool.filter((c) => c !== label && !alike.includes(c)))).filter((c) => !twin(c, label));
      return { label, bins: shuffle([label, ...rest.slice(0, 3)]) };
    }));
  }
  function shelfRun(ctx) {
    const tasks = shelfMake(); let k = ctx.done, miss = 0, busy = false;
    const open = () => { const it = document.querySelector('.wk-item'); if (it) it.textContent = it.dataset.label; };   // the label printed
    const draw = () => {
      const t = tasks[k], card = document.querySelector('.wk-shelf .cls-card'); if (!card) return;
      card.querySelector('.wk-n').textContent = `${k + 1}／${N}`;
      card.querySelector('.wk-box').innerHTML = `<span class="wk-item${t.label.length > 1 ? ' wd' : ''}" data-label="${esc(t.label)}" lang="ja"><button type="button" class="wk-ear" aria-label="再聽一次">🔊</button></span>`;
      card.querySelector('.wk-bins').innerHTML = t.bins.map((l) => `<button type="button" class="wk-bin${l.length > 1 ? ' wd' : ''}" data-label="${esc(l)}" lang="ja"><span>${esc(l)}</span></button>`).join('');
      miss = 0; busy = false; speak(t.label);
    };
    CLASS.card('wk-shelf', '整理貨架', `${head('shelf', 'ふくの たな', k)}<div class="wk-box"></div><div class="wk-bins"></div>`, (e) => {
      if (busy || !ctx.on()) return;
      const t = tasks[k]; if (e.target.closest('.wk-ear')) { speak(t.label); return; }
      const b = e.target.closest('.wk-bin'); if (!b) return;
      if (b.dataset.label !== t.label) {   // the wrong cell: it shakes, 張 says so, the thing stays
        miss++; playSfx('bad'); b.classList.remove('wk-bad'); void b.offsetWidth; b.classList.add('wk-bad'); word('shelf', say('shelf').miss, 'bad');
        if (miss >= 2) { document.querySelectorAll('.wk-bin').forEach((x) => x.classList.toggle('wk-hint', x.dataset.label === t.label)); open(); }
        return;
      }
      busy = true; ctx.right(k, miss); SND.play('place', { vol: 0.6 }); b.classList.add('wk-in'); open();
      const item = document.querySelector('.wk-item'); if (item) item.classList.add('wk-gone');
      if (!miss && Math.random() < 0.3) word('shelf', pick(say('shelf').ok));
      k++;
      if (k >= N) ctx.finish({}, 1100);   // paid now, the results after the goodbye (a card shut meanwhile: paid all the same)
      setTimeout(() => {   // this run's card only (shut and opened again: the new one's own)
        if (!document.querySelector('.wk-shelf')) return;
        if (k < N) { if (ctx.on()) draw(); return; }
        word('shelf', say('shelf').end, 'ok'); setTimeout(() => { if (document.querySelector('.wk-shelf')) CLASS.close(); }, 700);
      }, 380);
    });
    draw();
  }
  const shelfLines = (add) => { const s = say('shelf'); [s.miss, s.end, ...s.ok].forEach((l) => add(s.who, l[0])); };

  // ---- 站櫃 (らんらん, 周おばあさん): a customer comes to the counter (the cruise's passengers, out shopping, each in their own
  // voice) after the hero's いらっしゃいませ, and asks for one of four things on it, labelled in kana — only things whose name's
  // kana are all seen. The word asked for is heard, not shown (2026-11-15, the user: printed in the bubble too, it was only matching
  // the same kana): a blank in the bubble, tapped to hear it again, filled in once handed over or after two misses. Once ふたつ is
  // learned, now and then two of it (tap it twice). Prices are N5's numbers, past 入門 (the user): once いくら and 円 are learned,
  // now and then one held up — its picture in the bubble — これ、いくらですか: choose the reading of its tag, a tag whose numbers are
  // learned (百 and the digit before it, or 千). Handed over: ありがとうございました ----
  const CUST = ['kaneda', 'umeko', 'yuta', 'rina', 'yoshimoto', 'ken', 'ai', 'michiyama', 'mike'];
  const GOODS = () => TOWN.WORK.goods, PRICES = [100, 200, 300, 400, 500, 600, 700, 800, 900, 1000];
  const sayer = (name) => CUST[Math.max(0, GOODS().findIndex((g) => g[0] === name)) % CUST.length];   // each thing asked for by the same one, so the clips stay few
  const learned = (r, w) => REG.vocab.some((v) => v.r === r && (!w || v.w === w) && state.srs[v.key]);   // a word read so (and written so), learned
  const DIGIT = [, , ['二', 'に'], ['三', 'さん'], ['四', 'よん'], ['五', 'ご'], ['六', 'ろく'], ['七', 'なな'], ['八', 'はち'], ['九', 'きゅう']];
  const readable = (n) => (n === 1000 ? learned('せん', '千') : learned('ひゃく', '百') && (n === 100 || learned(DIGIT[n / 100][1], DIGIT[n / 100][0])));   // a tag whose numbers are learned
  const ME = { hi: ['いらっしゃいませ！', '歡迎光臨！'], bye: ['ありがとうございました！', '謝謝光臨！'] };
  const ask = (t) => (t.kind === 'price' ? ['これ、いくらですか。', '這個多少錢？'] : t.kind === 'two' ? [`${t.good[0]}を ふたつ ください。`, '請給我兩個。'] : [`${t.good[0]}を ください。`, '請給我這個。']);
  function counterMake(seen = WORK.kana()) {
    let can = GOODS().filter((g) => [...g[0]].every((c) => seen.has(c))); if (can.length < 4) can = GOODS().slice(0, 4);   // never too few to set out
    const two = learned('ふたつ'), tags = learned('いくら') && learned('えん', '円') ? PRICES.filter(readable) : [], priced = can.filter((g) => tags.includes(g[2]));
    return Array.from({ length: N }, () => {
      const r = Math.random(), kind = priced.length && r < 0.25 ? 'price' : two && r > 0.75 ? 'two' : 'name';
      const good = pick(kind === 'price' ? priced : can), goods = shuffle([good, ...shuffle(can.filter((g) => g !== good)).slice(0, 3)]);
      const t = { kind, good, goods, who: kind === 'price' ? pick(CUST) : sayer(good[0]) };
      if (kind === 'price') { const other = (a) => shuffle(a.filter((p) => p !== good[2])); t.opts = shuffle([good[2], ...other(tags).concat(other(PRICES.filter((p) => !tags.includes(p)))).slice(0, 2)]); }
      return t;
    });
  }
  let C = null;   // the customer at the counter now (its task)
  const goodPic = (key) => { const d = (typeof PICS === 'object' && PICS[key]) || (typeof PICS_TOWN === 'object' && PICS_TOWN[key]); return d ? `<svg class="pic" viewBox="0 0 100 100" aria-hidden="true"><circle class="pd" cx="50" cy="50" r="47"/>${d}</svg>` : ''; };
  function counterRun(ctx) {
    const tasks = counterMake(), first = !Object.values(state.work.res).some((r) => r.place === 'counter' && r.yen !== undefined); let k = ctx.done, miss = 0, got = 0, busy = true;
    const el = (s) => document.querySelector('.wk-counter ' + s);
    const bub = (open) => { const [ja, zh] = ask(C), w = C.good[0], line = C.kind === 'price' ? `<span class="wk-held">${goodPic(C.good[1])}</span>${esc(ja)}`
      : open ? esc(ja) : `<button type="button" class="wk-ear" aria-label="再聽一次">🔊</button>${esc(ja.slice(w.length))}`;   // the word heard, not read, till handed over
      el('.wk-bub').innerHTML = `<b lang="ja">${line}</b><span>${esc(zh)}</span>${C.kind === 'two' ? `<i class="wk-cnt">${got}／2</i>` : ''}`; };
    const me = (l) => { const p = el('.wk-me'); if (p) p.innerHTML = `<b lang="ja">${esc(l[0])}</b>${first ? `<span>${esc(l[1])}</span>` : ''}`; speakAs('hero', l[0]); };
    function show() {
      C = tasks[k]; miss = 0; got = 0; busy = true; if (!el('.wk-goods')) return;
      el('.wk-n').textContent = `${k + 1}／${N}`;
      el('.wk-goods').innerHTML = C.goods.map((g) => `<button type="button" class="wk-good${C.kind === 'price' && g === C.good ? ' held' : ''}" data-good="${esc(g[0])}">${goodPic(g[1])}<b lang="ja">${esc(g[0])}</b><small>${g[2]}円</small></button>`).join('');
      el('.wk-opts').innerHTML = ''; el('.wk-cust').className = 'wk-cust'; el('.wk-cust').innerHTML = `<span class="kr-face">${TOWNEV.face(C.who)}</span><p class="wk-bub"></p>`;
      me(ME.hi);
      setTimeout(() => {   // the customer asks
        if (!el('.wk-cust') || C !== tasks[k] || !ctx.on()) return;
        bub(false); el('.wk-cust').classList.add('on'); speakAs(C.who, ask(C)[0]); busy = false;
        if (C.kind === 'price') el('.wk-opts').innerHTML = C.opts.map((n) => `<button type="button" class="btn btn-sm wk-opt" data-n="${n}" lang="ja">${esc(YEN.reading(n))}</button>`).join('');
      }, 800);
    }
    function wrong(b) {
      miss++; playSfx('bad'); b.classList.remove('wk-bad'); void b.offsetWidth; b.classList.add('wk-bad'); word('counter', say('counter').miss, 'bad');
      if (miss >= 2) { document.querySelectorAll(C.kind === 'price' ? '.wk-opt' : '.wk-good').forEach((x) => x.classList.toggle('wk-hint', C.kind === 'price' ? Number(x.dataset.n) === C.good[2] : x.dataset.good === C.good[0])); bub(true); }
    }
    function right() {
      busy = true; ctx.right(k, miss); playSfx('good'); bub(true); el('.wk-cust').classList.remove('on');
      if (C.kind === 'price') me([`${YEN.reading(C.good[2])}です。`, `${C.good[2]} 日圓。`]);
      const live = () => el('.wk-cust') && (ctx.on() || k >= N), wait = C.kind === 'price' ? 1700 : 900;   // this run's card only
      setTimeout(() => { if (!live()) return; me(ME.bye); el('.wk-cust').classList.add('bye'); if (!miss && Math.random() < 0.25) word('counter', pick(say('counter').ok)); }, C.kind === 'price' ? 900 : 0);
      k++;
      if (k >= N) ctx.finish({}, wait + 800);   // paid now, the results after the goodbye
      setTimeout(() => {
        if (!live()) return;
        if (k < N) { show(); return; }
        word('counter', say('counter').end, 'ok'); setTimeout(() => { if (el('.wk-cust')) CLASS.close(); }, 700);
      }, wait);
    }
    CLASS.card('wk-counter', '站櫃', `${head('counter', 'らんらん', k)}<div class="wk-cust"></div><div class="wk-goods"></div><div class="wk-opts"></div><p class="wk-me"></p>`, (e) => {
      if (busy || !ctx.on() || !C) return;
      if (e.target.closest('.wk-ear')) { speakAs(C.who, ask(C)[0]); return; }
      const g = e.target.closest('.wk-good'), o = e.target.closest('.wk-opt');
      if (o && C.kind === 'price') { if (Number(o.dataset.n) === C.good[2]) right(); else wrong(o); return; }
      if (!g || C.kind === 'price') return;
      if (g.dataset.good !== C.good[0]) { wrong(g); return; }
      if (C.kind === 'two' && ++got < 2) { const c = el('.wk-cnt'); if (c) c.textContent = `${got}／2`; SND.play('place', { vol: 0.5 }); return; }
      right();
    });
    show();
  }
  function counterLines(add) {
    GOODS().forEach((g) => { add(sayer(g[0]), `${g[0]}を ください。`); add(sayer(g[0]), `${g[0]}を ふたつ ください。`); });
    CUST.forEach((id) => add(id, 'これ、いくらですか。'));
    [ME.hi, ME.bye, ...PRICES.map((n) => [`${YEN.reading(n)}です。`])].forEach((l) => add('hero', l[0]));
    const s = say('counter'); [s.miss, s.end, ...s.ok].forEach((l) => add(s.who, l[0]));
  }

  // ---- 外送 (らいらいけん, 黄さん): a slip with a shop's name in kana; the hero carries the 岡持ち down 大通り to the shop whose sign
  // says it (tap it), then back to らいらいけん for the next (tap it). Only shops whose sign's kana are all seen (at 30 kana: ふく,
  // とうか, こはく), never the same twice running. The wrong shop: うちじゃ ないよ！ and a miss. Ten delivered: a tip by the time from
  // the first slip — ≤ 90 s 30 円, ≤ 150 s 20, ≤ 240 s 10. Gone from 大通り: the slip put away, the count kept for today ----
  const tip = (sec) => (sec <= 90 ? 30 : sec <= 150 ? 20 : sec <= 240 ? 10 : 0);
  function deliverMake(seen = WORK.kana()) {
    let to = DORI.SHOPS.filter((s) => s.id !== 'rairai' && [...s.sign].every((c) => seen.has(c))).map((s) => s.id), out = [];
    if (!to.length) to = DORI.SHOPS.filter((s) => s.id !== 'rairai').map((s) => s.id);   // never nowhere to go
    for (let k = 0; k < N; k++) out.push(pick(to.length > 1 ? to.filter((x) => x !== out[k - 1]) : to));
    return out;
  }
  let D = null;   // the round under way: { ctx, list, k, to, miss, back, t0, iv }
  const popAt = (yard, id, l) => { const t = (PLACE_USE.chinadori || []).find((q) => q.id === id); if (t && yard) yPop(yard, (t.box[0] + t.box[2]) / 2, t.box[1] - 4, l[0]); };
  function slip() {
    if (!D) return;
    let el = document.querySelector('.wk-slip'); if (!el) { el = document.createElement('div'); el.className = 'wk-slip'; el.setAttribute('role', 'status'); document.body.appendChild(el); }
    const sec = Math.round((Date.now() - D.t0) / 1000);
    el.innerHTML = `<i class="wk-oka-i" aria-hidden="true"></i><span>${D.back ? 'もどる' : 'とどけさき'}</span><b lang="ja">${esc(D.back ? 'らいらいけん' : DORI.shop(D.to).sign)}</b><span class="wk-sn">${Math.min(D.k + 1, N)}／${N}</span><span class="wk-st">${sec} 秒</span>`;
    const h = document.querySelector('.yhero'); if (h && !h.classList.contains('wk-carry')) { h.classList.add('wk-carry'); if (!h.querySelector('.wk-oka')) h.insertAdjacentHTML('beforeend', '<i class="wk-oka" aria-hidden="true"></i>'); }
  }
  function putAway() {
    if (D) clearInterval(D.iv);
    const el = document.querySelector('.wk-slip'); if (el) el.remove();
    document.querySelectorAll('.yhero.wk-carry').forEach((h) => { h.classList.remove('wk-carry'); const o = h.querySelector('.wk-oka'); if (o) o.remove(); });
    D = null;
  }
  function deliverRun(ctx) {
    putAway();
    D = { ctx, list: deliverMake(), k: ctx.done, miss: 0, back: false, t0: Date.now() }; D.to = D.list[D.k];
    D.iv = setInterval(() => { if (!D) return; if (location.hash !== '#/chinadori' || !ctx.on()) { putAway(); return; } slip(); }, 500);
    slip(); const s = say('deliver'); speakAs(s.who, DORI.shop(D.to).sign + s.go[0]);
  }
  // a shop tapped on 大通り (its PLACE_USE open, the hero at its door): true if the round took it
  function deliverAt(yard, id) {
    if (!D) return false;
    const s = say('deliver');
    if (D.back) { if (id === 'rairai') { D.back = false; D.to = D.list[D.k]; D.miss = 0; slip(); speakAs(s.who, s.back[0]); setTimeout(() => { if (D) speakAs(s.who, DORI.shop(D.to).sign + s.go[0]); }, 1100); } else popAt(yard, id, ['らいらいけんに もどって！']); return true; }
    if (id === 'rairai') { popAt(yard, id, s.wait); speakAs(s.who, s.wait[0]); return true; }
    if (id !== D.to) { D.miss++; playSfx('bad'); popAt(yard, id, s.miss); return true; }
    D.ctx.right(D.k, D.miss); playSfx('good'); popAt(yard, id, s.thanks); D.k++;
    if (D.k >= N) { const ctx = D.ctx, t = tip((Date.now() - D.t0) / 1000); putAway(); speakAs(s.who, s.end[0]); ctx.finish({ tip: t }, 300); return true; }
    D.back = true; slip(); return true;
  }
  function deliverLines(add) { const s = say('deliver'); DORI.SHOPS.forEach((x) => add(s.who, x.sign + s.go[0])); [s.back, s.wait, s.end].forEach((l) => add(s.who, l[0])); }

  // ---- 包包子 (福明, 王): 2026-11-15, the user — the old one (王's word for a step, pictures to tap) had nothing Japanese in it. Now a
  // close-up of the hero at the board (head and shoulders, no arms: a round hand does the work), the bun in front, the steamer
  // beside; under it six cells of hiragana. A kana is said (the app's own clip) — tap it: the bun goes one step on, that cell takes
  // a new kana and the next is said at once. Six steps a bun (BUN_STEPS, their words in small print only), thirty taps = five buns;
  // every three taps one of the shift's ten (ctx.right with their misses), so leaving halfway, coming back, the grade and the pay
  // are as ever. A miss: the cell shakes, 王's ちがう！ in print (no voice over the kana), the bun goes askew (it stays so), the
  // sound again; the same one missed twice, its cell lights. 120 seconds on the clock from a shift's start, never cut short: all
  // thirty right inside it, the five buns shine together and 王 is beside himself (中華一番's style, 2026-11-14); a bun of six
  // without a miss, かんぺきだ！ as it comes out. The cells: never two that sound the same (お／を); half the time a new one sounds
  // or looks like one there ----
  const BUN_STEPS = ['こねる', 'のばす', 'のせる', 'つつむ', 'ならべる', 'むす'], TAPS = 30, PER = TAPS / N, LIMIT = 120;
  const bunPool = () => { const seen = WORK.kana(), all = REG.kana.slice(0, 46).map((x) => x.ch), p = all.filter((c) => seen.has(c)); return p.length >= 12 ? p : all; };
  function boardNew(board, pool) {   // a kana for a cell: not on the board, no twin of one there; half the time kin of one there
    const free = pool.filter((c) => !board.includes(c) && !board.some((x) => twin(x, c)));
    const near = free.filter((c) => board.some((x) => kin(KANA_SOUNDALIKE, x).includes(c) || kin(KANA_LOOKALIKE, x).includes(c)));
    return pick(near.length && Math.random() < 0.5 ? near : free);
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
  let BN = null, bunRun = 0;   // the board now (for the tests): { target, board, tap, wait }; the run whose card is up
  function bunsRun(ctx) {
    const run = ++bunRun, mine = () => run === bunRun && Boolean(document.querySelector('.wk-buns .wk-keys'));   // this run's card only (shut and opened again: the new run's)
    const s = say('buns'), pool = bunPool(), fresh = ctx.done === 0, t0 = Date.now(), bust = bunBust(), score = (WORK.today() || {}).score || {};
    let tap = ctx.done * PER, board = [], target = null, miss = 0, bunMiss = 0, trioMiss = 0, wrong = 0, busy = false, clock = 0;
    const made = Array.from({ length: Math.floor(tap / BUN_STEPS.length) }, (_, b) => !score[2 * b] && !score[2 * b + 1]);   // buns done before: perfect if their two tasks were
    if (tap % BUN_STEPS.length) bunMiss = score[tap / PER - 1] || 0;   // half a bun done: askew if its first three were missed
    const el = (q) => document.querySelector('.wk-buns ' + q), live = () => mine() && ctx.on();
    const quiet = ([ja, zh], cls = '') => { const p = el('.wk-say'); if (p) { p.innerHTML = `<b lang="ja">${esc(ja)}</b><span>${esc(zh)}</span>`; p.className = 'wk-say' + (cls ? ' ' + cls : ''); } };
    const now = () => { BN = { target, board: board.slice(), tap, wait: busy }; };
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
    function keys() { const k = el('.wk-keys'); if (k) k.innerHTML = board.map((c) => `<button type="button" class="wk-key" data-k="${esc(c)}" lang="ja">${esc(c)}</button>`).join(''); }
    function ask() { const last = target; target = pick(board.filter((c) => c !== last)); miss = 0; now(); speak(target); }
    function end() {
      const best = fresh && !wrong && Date.now() - t0 <= LIMIT * 1000;   // from the shift's start, all thirty right, inside the clock
      ctx.finish({}, best ? 2600 : 1600);   // paid now, the results after the goodbye
      setTimeout(() => {
        if (!mine()) return;
        if (best) { const c = el('.cls-card') || document.querySelector('.wk-buns .cls-card'); if (c) c.classList.add('wk-shine-all'); word('buns', s.all, 'ok'); } else word('buns', s.end, 'ok');
        setTimeout(() => { if (mine()) CLASS.close(); }, best ? 1600 : 900);
      }, 200);
    }
    function right(b) {
      SND.play('place', { vol: 0.5 }); tap++; trioMiss += miss;
      const h = el('.wk-hand'); if (h) { h.classList.remove('go'); void h.getBoundingClientRect(); h.classList.add('go'); }
      if (tap % PER === 0) { ctx.right(tap / PER - 1, trioMiss); trioMiss = 0; }
      board[board.indexOf(target)] = boardNew(board, pool); keys();
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
    while (board.length < 6) board.push(boardNew(board, pool));
    art(); keys(); ask();
    if (fresh) clock = setInterval(() => {   // the clock: a bar running down; past it, grey — never a stop
      const c = el('.wk-clock'); if (!c || !mine() || !ctx.on()) { clearInterval(clock); return; }
      const left = Math.max(0, 1 - (Date.now() - t0) / (LIMIT * 1000)); c.querySelector('i').style.width = `${(left * 100).toFixed(1)}%`; c.classList.toggle('out', !left);
      if (tap >= TAPS) clearInterval(clock);
    }, 200);
  }
  function bunsLines(add) { const s = say('buns'); [s.all, s.end].concat(s.ok, s.shine).forEach((l) => add(s.who, l[0])); }

  WORK.register('shelf', { run: shelfRun, lines: shelfLines });
  WORK.register('deliver', { run: deliverRun, lines: deliverLines });
  WORK.register('buns', { run: bunsRun, lines: bunsLines });
  WORK.register('counter', { run: counterRun, lines: counterLines });
  return { shelf: { make: shelfMake, run: shelfRun }, counter: { make: counterMake, run: counterRun, now: () => C, sayer }, deliver: { make: deliverMake, at: deliverAt, tip, state: () => D, on: () => Boolean(D) }, buns: { run: bunsRun, now: () => BN } };
})();
