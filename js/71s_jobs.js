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
  // tap the cell with the same. Labels: a seen kana each (look-alikes beside it on the shelf when seen); once four kana-only 入門
  // words are learned, three to five of the ten are those words. Wrong: 張's ちがう！ and the thing stays; wrong twice, the right
  // cell lights up ----
  function shelfMake(seen = [...kanaSeenSet()], ws = words()) {
    const nw = ws.length >= 4 ? 3 + Math.floor(Math.random() * 3) : 0;
    return shuffle(Array.from({ length: N }, (_, k) => {
      const pool = k < nw ? ws : seen, label = pick(pool);
      const alike = k < nw ? [] : shuffle(KANA_LOOKALIKE.filter((g) => g.includes(label)).flat().filter((c, i, all) => c !== label && seen.includes(c) && all.indexOf(c) === i));
      const rest = alike.concat(shuffle(pool.filter((c) => c !== label && !alike.includes(c))));
      return { label, bins: shuffle([label, ...rest.slice(0, 3)]) };
    }));
  }
  function shelfRun(ctx) {
    const tasks = shelfMake(); let k = ctx.done, miss = 0, busy = false;
    const draw = () => {
      const t = tasks[k], card = document.querySelector('.wk-shelf .cls-card'); if (!card) return;
      card.querySelector('.wk-n').textContent = `${k + 1}／${N}`;
      card.querySelector('.wk-box').innerHTML = `<span class="wk-item${t.label.length > 1 ? ' wd' : ''}" data-label="${esc(t.label)}" lang="ja">${esc(t.label)}</span>`;
      card.querySelector('.wk-bins').innerHTML = t.bins.map((l) => `<button type="button" class="wk-bin${l.length > 1 ? ' wd' : ''}" data-label="${esc(l)}" lang="ja"><span>${esc(l)}</span></button>`).join('');
      miss = 0; busy = false; speak(t.label);
    };
    CLASS.card('wk-shelf', '整理貨架', `${head('shelf', 'ふくの たな', k)}<div class="wk-box"></div><div class="wk-bins"></div>`, (e) => {
      const b = e.target.closest('.wk-bin'); if (!b || busy || !ctx.on()) return;
      const t = tasks[k];
      if (b.dataset.label !== t.label) {   // the wrong cell: it shakes, 張 says so, the thing stays
        miss++; playSfx('bad'); b.classList.remove('wk-bad'); void b.offsetWidth; b.classList.add('wk-bad'); word('shelf', say('shelf').miss, 'bad');
        if (miss >= 2) document.querySelectorAll('.wk-bin').forEach((x) => x.classList.toggle('wk-hint', x.dataset.label === t.label));
        return;
      }
      busy = true; ctx.right(k, miss); SND.play('place', { vol: 0.6 }); b.classList.add('wk-in');
      const item = document.querySelector('.wk-item'); if (item) item.classList.add('wk-gone');
      if (!miss && Math.random() < 0.3) word('shelf', pick(say('shelf').ok));
      k++;
      setTimeout(() => {
        if (!document.querySelector('.wk-shelf')) return;
        if (k < N) { draw(); return; }
        word('shelf', say('shelf').end, 'ok'); setTimeout(() => { CLASS.close(); ctx.finish(); }, 700);
      }, 380);
    });
    draw();
  }
  const shelfLines = (add) => { const s = say('shelf'); [s.miss, s.end, ...s.ok].forEach((l) => add(s.who, l[0])); };

  // ---- 站櫃 (らんらん, 周おばあさん): a customer comes to the counter (the cruise's passengers, out shopping, each in their own
  // voice) after the hero's いらっしゃいませ, and asks for one of four things on it, said and shown in kana — only things whose
  // name's kana are all seen. Once ふたつ is learned, now and then two of it (tap it twice); once いくら is, now and then one held up,
  // これ、いくらですか — choose the reading of its tag. Handed over: ありがとうございました ----
  const CUST = ['kaneda', 'umeko', 'yuta', 'rina', 'yoshimoto', 'ken', 'ai', 'michiyama', 'mike'];
  const GOODS = () => TOWN.WORK.goods, PRICES = [100, 200, 300, 400, 500, 600, 700, 800, 900, 1000];
  const sayer = (name) => CUST[Math.max(0, GOODS().findIndex((g) => g[0] === name)) % CUST.length];   // each thing asked for by the same one, so the clips stay few
  const learned = (r) => REG.vocab.some((v) => v.r === r && state.srs[v.key]);   // a word read so, learned (ふたつ, いくら)
  const ME = { hi: ['いらっしゃいませ！', '歡迎光臨！'], bye: ['ありがとうございました！', '謝謝光臨！'] };
  const ask = (t) => (t.kind === 'price' ? ['これ、いくらですか。', '這個多少錢？'] : t.kind === 'two' ? [`${t.good[0]}を ふたつ ください。`, '請給我兩個。'] : [`${t.good[0]}を ください。`, '請給我這個。']);
  function counterMake(seen = kanaSeenSet()) {
    const can = GOODS().filter((g) => [...g[0]].every((c) => seen.has(c))), two = learned('ふたつ'), price = learned('いくら');
    return Array.from({ length: N }, () => {
      const goods = shuffle(can).slice(0, 4), good = pick(goods), r = Math.random(), kind = price && r < 0.25 ? 'price' : two && r > 0.75 ? 'two' : 'name';
      const t = { kind, good, goods, who: kind === 'price' ? pick(CUST) : sayer(good[0]) };
      if (kind === 'price') t.opts = shuffle([good[2], ...shuffle(PRICES.filter((p) => p !== good[2])).slice(0, 2)]);
      return t;
    });
  }
  let C = null;   // the customer at the counter now (its task)
  const goodPic = (key) => { const d = (typeof PICS === 'object' && PICS[key]) || (typeof PICS_TOWN === 'object' && PICS_TOWN[key]); return d ? `<svg class="pic" viewBox="0 0 100 100" aria-hidden="true"><circle class="pd" cx="50" cy="50" r="47"/>${d}</svg>` : ''; };
  function counterRun(ctx) {
    const tasks = counterMake(), first = !Object.values(state.work.res).some((r) => r.place === 'counter' && r.yen !== undefined); let k = ctx.done, miss = 0, got = 0, busy = true;
    const el = (s) => document.querySelector('.wk-counter ' + s);
    const me = (l) => { const p = el('.wk-me'); if (p) p.innerHTML = `<b lang="ja">${esc(l[0])}</b>${first ? `<span>${esc(l[1])}</span>` : ''}`; speakAs('hero', l[0]); };
    function show() {
      C = tasks[k]; miss = 0; got = 0; busy = true; if (!el('.wk-goods')) return;
      el('.wk-n').textContent = `${k + 1}／${N}`;
      el('.wk-goods').innerHTML = C.goods.map((g) => `<button type="button" class="wk-good${C.kind === 'price' && g === C.good ? ' held' : ''}" data-good="${esc(g[0])}">${goodPic(g[1])}<b lang="ja">${esc(g[0])}</b><small>${g[2]}円</small></button>`).join('');
      el('.wk-opts').innerHTML = ''; el('.wk-cust').className = 'wk-cust'; el('.wk-cust').innerHTML = `<span class="kr-face">${TOWNEV.face(C.who)}</span><p class="wk-bub"></p>`;
      me(ME.hi);
      setTimeout(() => {   // the customer asks
        if (!el('.wk-cust') || C !== tasks[k]) return;
        const [ja, zh] = ask(C); el('.wk-bub').innerHTML = `<b lang="ja">${esc(ja)}</b><span>${esc(zh)}</span>${C.kind === 'two' ? '<i class="wk-cnt">0／2</i>' : ''}`;
        el('.wk-cust').classList.add('on'); speakAs(C.who, ja); busy = false;
        if (C.kind === 'price') el('.wk-opts').innerHTML = C.opts.map((n) => `<button type="button" class="btn btn-sm wk-opt" data-n="${n}" lang="ja">${esc(YEN.reading(n))}</button>`).join('');
      }, 800);
    }
    function wrong(b) {
      miss++; playSfx('bad'); b.classList.remove('wk-bad'); void b.offsetWidth; b.classList.add('wk-bad'); word('counter', say('counter').miss, 'bad');
      if (miss >= 2) document.querySelectorAll(C.kind === 'price' ? '.wk-opt' : '.wk-good').forEach((x) => x.classList.toggle('wk-hint', C.kind === 'price' ? Number(x.dataset.n) === C.good[2] : x.dataset.good === C.good[0]));
    }
    function right() {
      busy = true; ctx.right(k, miss); playSfx('good'); el('.wk-cust').classList.remove('on');
      if (C.kind === 'price') me([`${YEN.reading(C.good[2])}です。`, `${C.good[2]} 日圓。`]);
      setTimeout(() => { if (!el('.wk-cust')) return; me(ME.bye); el('.wk-cust').classList.add('bye'); if (!miss && Math.random() < 0.25) word('counter', pick(say('counter').ok)); }, C.kind === 'price' ? 900 : 0);
      k++;
      setTimeout(() => {
        if (!el('.wk-cust')) return;
        if (k < N) { show(); return; }
        word('counter', say('counter').end, 'ok'); setTimeout(() => { CLASS.close(); ctx.finish(); }, 700);
      }, C.kind === 'price' ? 1700 : 900);
    }
    CLASS.card('wk-counter', '站櫃', `${head('counter', 'らんらん', k)}<div class="wk-cust"></div><div class="wk-goods"></div><div class="wk-opts"></div><p class="wk-me"></p>`, (e) => {
      if (busy || !ctx.on() || !C) return;
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

  WORK.register('shelf', { run: shelfRun, lines: shelfLines });
  WORK.register('counter', { run: counterRun, lines: counterLines });
  return { shelf: { make: shelfMake, run: shelfRun }, counter: { make: counterMake, run: counterRun, now: () => C, sayer } };
})();
