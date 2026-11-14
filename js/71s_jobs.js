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

  // ---- 包包子 (福明, 王 and 陳): a bun is five steps — こねて, まるめて, にく or あん を のせて (the filling heard, not known before),
  // つつんで, むして — 王 says each and the buttons are pictures only, shuffled each step; beside his word its picture till that word
  // has been answered right three times (state.work.seenSteps, kept across devices), then the word alone. A bun's misses are its
  // steps' together. A perfect one comes out of the steamer in a burst of gold and 王 beside himself (the user, 2026-11-14: 中華一番's
  // style — over-the-top cooking — but nothing of that work's own); a shift without one miss, more of it at the end. Now and then
  // 陳 at the next board slips up and 王 tells him so ----
  const STEP_ART = {
    kone: '<ellipse cx="30" cy="40" rx="18" ry="9" fill="#f4ead8"/><path d="M14 30 q4 -10 12 -6 v8 M46 30 q-4 -10 -12 -6 v8" fill="#f3d1b5" stroke="#c8a080" stroke-width="1.4"/><path d="M20 40 q10 -5 20 0" stroke="#d8c8a8" stroke-width="1.4" fill="none"/>',
    marume: '<circle cx="30" cy="34" r="14" fill="#f4ead8" stroke="#d8c8a8" stroke-width="1.4"/><path d="M12 22 a20 20 0 0 1 36 0" fill="none" stroke="#c8322a" stroke-width="2.4"/><path d="M46 16 l2 7 l-7 -1" fill="none" stroke="#c8322a" stroke-width="2.4"/>',
    niku: '<ellipse cx="30" cy="40" rx="20" ry="9" fill="#f4ead8"/><ellipse cx="30" cy="35" rx="10" ry="6" fill="#a8584a"/><circle cx="27" cy="34" r="1.6" fill="#d88a6a"/><circle cx="33" cy="36" r="1.4" fill="#5a8a4a"/>',
    an: '<ellipse cx="30" cy="40" rx="20" ry="9" fill="#f4ead8"/><ellipse cx="30" cy="35" rx="10" ry="6" fill="#5a2a3a"/><circle cx="27" cy="34" r="1.4" fill="#7a3a4a"/>',
    tsutsumu: '<path d="M14 42 Q14 22 30 18 Q46 22 46 42 Z" fill="#f4ead8" stroke="#d8c8a8" stroke-width="1.4"/><path d="M30 18 l-6 10 M30 18 l6 10 M30 18 v11 M30 18 l-11 7 M30 18 l11 7" stroke="#d8c8a8" stroke-width="1.2"/>',
    musu: '<rect x="12" y="28" width="36" height="16" rx="3" fill="#c9a46e"/><path d="M12 33 h36 M12 39 h36" stroke="#a8834e" stroke-width="1.2"/><ellipse cx="30" cy="28" rx="19" ry="5" fill="#d9b98a"/><path d="M22 20 q3 -5 0 -10 M30 20 q3 -5 0 -10 M38 20 q3 -5 0 -10" stroke="#9aa4b0" stroke-width="2" fill="none" stroke-linecap="round"/>' };
  const stepPic = (s, cls = 'wk-pic') => `<svg class="${cls}" viewBox="0 0 60 52" aria-hidden="true">${STEP_ART[s]}</svg>`;
  // the bun as far as it has come: dough, a ball, the filling on it, wrapped, out of the steamer
  const BUN_AT = ['<ellipse cx="30" cy="38" rx="18" ry="10" fill="#efe4cc"/>', STEP_ART.kone, STEP_ART.marume, null, STEP_ART.tsutsumu,
    '<path d="M12 42 Q12 18 30 14 Q48 18 48 42 Z" fill="#fbf6ea" stroke="#e4d8c0" stroke-width="1.4"/><path d="M30 14 l-6 9 M30 14 l6 9 M30 14 v10" stroke="#e4d8c0" stroke-width="1.2"/>'];
  const bunMake = () => Array.from({ length: N }, () => ['kone', 'marume', Math.random() < 0.5 ? 'niku' : 'an', 'tsutsumu', 'musu']);
  let B = null;   // the step due now (for the tests): its key
  function bunsRun(ctx) {
    const buns = bunMake(), s = say('buns'), seen = () => state.work.seenSteps || (state.work.seenSteps = {}), gags = new Set(shuffle([2, 3, 4, 5, 6, 7]).slice(0, 1));
    let k = ctx.done, i = 0, miss = 0, stepMiss = 0, busy = false, all = 0;
    const el = (q) => document.querySelector('.wk-buns ' + q);
    function show() {
      const st = buns[k][i]; B = st; stepMiss = 0; busy = false; if (!el('.wk-acts')) return;
      el('.wk-n').textContent = `${k + 1}／${N}`;
      el('.wk-bun').innerHTML = `<svg viewBox="0 0 60 52" aria-hidden="true">${i === 3 ? STEP_ART[buns[k][2]] : BUN_AT[i]}</svg>`;
      const [ja, zh] = s.steps[st], known = (seen()[st] || 0) >= 3;
      el('.wk-inst').innerHTML = `<b lang="ja">${esc(ja)}</b>${known ? '' : `${stepPic(st)}<span>${esc(zh)}</span>`}`;
      el('.wk-acts').innerHTML = shuffle(Object.keys(STEP_ART)).map((x) => `<button type="button" class="wk-act" data-step="${x}" aria-label="${esc(s.steps[x][1])}">${stepPic(x, 'wk-actpic')}</button>`).join('');
      speakAs(s.who, ja);
    }
    function done() {
      ctx.right(k, miss); if (!miss) all++;
      const card = el('.wk-bun'), perfect = !miss;
      if (card) { card.innerHTML = `<svg viewBox="0 0 60 52" aria-hidden="true">${BUN_AT[5]}</svg>`; if (perfect) { card.classList.remove('wk-shine'); void card.offsetWidth; card.classList.add('wk-shine'); } }
      if (perfect) { playSfx('good'); word('buns', pick(s.shine), 'ok'); } else word('buns', pick(s.ok));
      const gag = gags.has(k); k++; i = 0; miss = 0; busy = true;
      const live = () => el('.wk-acts') && (ctx.on() || k >= N), best = k >= N && all === N - ctx.done && ctx.done === 0;   // this run's card only; best: the whole shift without a miss, from its start
      if (k >= N) { B = null; ctx.finish({}, (perfect ? 1100 : 600) + (best ? 1600 : 800)); }   // paid now, the results after the goodbye
      setTimeout(() => {
        if (!live()) return;
        if (k >= N) {
          if (best) { const c = document.querySelector('.wk-buns .cls-card'); if (c) c.classList.add('wk-shine-all'); word('buns', s.all, 'ok'); }
          else word('buns', s.end, 'ok');
          setTimeout(() => { if (el('.wk-acts')) CLASS.close(); }, best ? 1600 : 800); return;
        }
        if (gag) { const [c, w] = s.gag; const p = el('.wk-say'); if (p) p.innerHTML = `<span>${esc(c[2])}</span>`; setTimeout(() => { if (!live()) return; word('buns', [w[1], w[2]], 'bad'); setTimeout(() => { if (live()) show(); }, 1200); }, 1300); return; }
        show();
      }, perfect ? 1100 : 600);
    }
    CLASS.card('wk-buns', '包包子', `${head('buns', 'ふくめいの ちゅうぼう', k)}<div class="wk-bunrow"><div class="wk-bun"></div><p class="wk-inst"></p></div><div class="wk-acts"></div>`, (e) => {
      const b = e.target.closest('.wk-act'); if (!b || busy || !ctx.on() || k >= N) return;
      const st = buns[k][i];
      if (b.dataset.step !== st) {
        miss++; stepMiss++; playSfx('bad'); b.classList.remove('wk-bad'); void b.offsetWidth; b.classList.add('wk-bad'); word('buns', s.miss, 'bad');
        if (stepMiss >= 2) document.querySelectorAll('.wk-act').forEach((x) => x.classList.toggle('wk-hint', x.dataset.step === st));
        return;
      }
      busy = true; seen()[st] = (seen()[st] || 0) + 1; saveState(); SND.play('place', { vol: 0.5 }); i++;
      if (i >= buns[k].length) { done(); return; }
      setTimeout(() => { if (ctx.on() && el('.wk-acts')) show(); }, 300);   // this run's card only
    });
    show();
  }
  function bunsLines(add) { const s = say('buns'); Object.values(s.steps).concat([s.miss, s.all, s.end], s.ok, s.shine).forEach((l) => add(s.who, l[0])); add(s.gag[1][0], s.gag[1][1]); }

  WORK.register('shelf', { run: shelfRun, lines: shelfLines });
  WORK.register('deliver', { run: deliverRun, lines: deliverLines });
  WORK.register('buns', { run: bunsRun, lines: bunsLines });
  WORK.register('counter', { run: counterRun, lines: counterLines });
  return { shelf: { make: shelfMake, run: shelfRun }, counter: { make: counterMake, run: counterRun, now: () => C, sayer }, deliver: { make: deliverMake, at: deliverAt, tip, state: () => D, on: () => Boolean(D) }, buns: { make: bunMake, run: bunsRun, now: () => B } };
})();
