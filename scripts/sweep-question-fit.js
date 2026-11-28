// sweep-question-fit.js (test.5's Task 4, kept in the repo by the round's final fix; run by sweep-question-fit.py): every practice question the app
// can build — every format of every built-in item, 37,000-odd — drawn as the current card and measured at its first frame: every answer control
// whole in sight (inside the screen and every box that clips it) and hit at its middle (elementFromPoint), the question's stem beginning in sight;
// and answered (for real, a click on a wrong option — the app's own handler and draw): 下一題 whole in sight and hit, and what moved. Built from
// Task 3's fit survey (its draw loop and its warm-up for the web fonts).
// States (run's mode): new (新), leech (錯題複習 and 常錯: the widest label row), prog (a listening question's progress line up), note (a
// session's note over the card), ans / ansleech / ansnote (answered from that state). step: every step-th question only (the runner's --limit)
window.__sweep = (() => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const R0 = Math.random;
  const seed = (s) => { let a = s >>> 0; Math.random = () => { a |= 0; a = a + 0x6D2B79F5 | 0; let x = Math.imul(a ^ a >>> 15, 1 | a); x = x + Math.imul(x ^ x >>> 7, 61 | x) ^ x; return ((x ^ x >>> 14) >>> 0) / 4294967296; }; };
  const LEECH = () => ({ b: 2, s: 5, d: 5, due: todayStr(), n: 6, ok: 2, ng: 4, st: 0, last: addDays(todayStr(), -3), lapse: 5, intro: addDays(todayStr(), -40), leech: true, rl: 1, f: {} });
  const SEL = '.q-card .opt:not(.opt-audio), .q-card .opt-play, .q-card .opt-pick, .q-card .spell-tile, .q-card .order-tile, .q-card .match-word, .q-card .match-meaning, .q-card [data-act="tiles-submit"], .q-card [data-act="custom-giveup"], .q-card .conj-in, .q-card [data-act="conj-submit"]';
  let QS = [], e = null;
  function setup() {
    speak = () => Promise.resolve(); speakScript = () => Promise.resolve();
    state.stage = 'main'; state.kanaKnown = true; state.introSeen = true; state.storyV = 99; state.startChosen = true;
    state.currentUnit = DATA.UNITS[DATA.UNITS.length - 1].id; saveState(); DAILY_CACHE = null;
  }
  // [item, ctx, tag] for every format each item can be asked in (tag: the format, a +kana variant apart)
  function list() {
    const L = [];
    const VF = ['v-meaning', 'v-recall', 'v-cloze', 'v-reading', 'v-kanji', 'v-listen', 'v-spell', 'v-match', 'v-pic', 'v-para'];
    REG.vocab.filter((v) => v.builtin).forEach((v) => {
      VF.forEach((f) => L.push([v, { forceFmt: f, kana: false }, f]));
      ['v-recall', 'v-pic', 'v-cloze'].forEach((f) => L.push([v, { forceFmt: f, kana: true }, f + '+kana']));
    });
    REG.grammar.forEach((g) => { const t = g.t || 'choice';
      if (t === 'choice') ['g-choice', 'g-meaning', 'g-zh', 'g-fill-type'].forEach((f) => L.push([g, { forceFmt: f }, f]));
      else if (t === 'meaning') { L.push([g, {}, 'g-meaning*']); L.push([g, { choiceOnly: true }, 'g-meaning']); }
      else if (t === 'order') L.push([g, {}, 'g-order']);
      else if (t === 'conj' || t === 'adj') { const c = t === 'conj' ? 'g-conj' : 'g-adj'; L.push([g, { forceFmt: c }, c]); L.push([g, { forceFmt: c + '-type' }, c + '-type']); if (t === 'conj') L.push([g, { identify: true }, 'g-identify']); }
    });
    REG.listen.forEach((l) => L.push([l, {}, 'listen']));
    REG.read.forEach((r) => L.push([r, {}, 'r-passage']));
    REG.kanji.forEach((k) => ['k-meaning', 'k-shape', 'k-read'].forEach((f) => L.push([k, { kanjiFmt: f }, f])));
    REG.kana.forEach((a) => ['a-read', 'a-sound', 'a-pair', 'a-word'].forEach((f) => L.push([a, { forceFmt: f }, f])));
    (REG.drills || []).forEach((d) => { for (let s = 0; s < 6; s++) { L.push([d, { drill: s }, 'c-tiles']); L.push([d, { drill: s, choiceOnly: true }, 'c-choice']); } });
    return L;
  }
  function makeOne(it, ctx, i) {
    seed(7000 + i);
    try {
      if (ctx.identify) { const keep = state.srs[it.key]; state.srs[it.key] = Object.assign(LEECH(), { b: 2, leech: false, rl: undefined }); const r = Math.random; Math.random = () => 0.05;
        const q = makeQuestion(it, {}); Math.random = r; if (keep) state.srs[it.key] = keep; else delete state.srs[it.key]; return q && q.fmt === 'g-identify' ? q : null; }
      if (ctx.kanjiFmt) { const all = ['k-meaning', 'k-shape', 'k-read']; const keep = state.srs[it.key]; state.srs[it.key] = Object.assign(LEECH(), { b: 0, leech: false, rl: undefined });
        const q = makeQuestion(it, { avoidFmt: all.filter((f) => f !== ctx.kanjiFmt) }); if (keep) state.srs[it.key] = keep; else delete state.srs[it.key]; return q && q.fmt === ctx.kanjiFmt ? q : null; }
      const q = makeQuestion(it, ctx);
      if (!q) return null;
      if (ctx.forceFmt && q.fmt !== ctx.forceFmt) return null;
      return q;
    } catch (x) { return null; } finally { Math.random = R0; }
  }
  async function build() {
    setup();
    // every kana seen (讀讀看 asks a word of seen kana only) and every built-in word learned, not due (配對 pairs learned words; Task 3's
    // survey had them so too); a card's own record is set as it is drawn (draw: 新, or 錯題複習 and 常錯)
    REG.kana.forEach((a) => { if (!state.srs[a.key]) state.srs[a.key] = Object.assign(LEECH(), { leech: false, rl: undefined }); });
    const t = todayStr(); REG.vocab.filter((v) => v.builtin).forEach((v) => { if (!state.srs[v.key]) state.srs[v.key] = { b: 3, s: 9, d: 5, due: addDays(t, 5), n: 3, ok: 3, ng: 0, st: 3, last: addDays(t, -3), lapse: 0, intro: addDays(t, -30), f: {} }; });
    const L = list(); QS = [];
    L.forEach(([it, ctx, tag], i) => { const q = makeOne(it, ctx, i); if (q) QS.push([it, q, tag]); });
    REG.kana.forEach((a) => { delete state.srs[a.key]; });
    const it0 = REG.vocab.find((v) => v.builtin); startSession('items', { items: [it0, it0] }); route(); e = currentEntry(); e.preview = false;
    const by = {}; QS.forEach(([, q]) => { by[q.fmt] = (by[q.fmt] || 0) + 1; });
    return JSON.stringify({ listed: L.length, n: QS.length, by });
  }
  function draw(i, mode) {
    const [it, q] = QS[i];
    e.item = it; e.q = q; e.done = false; e.chosen = undefined; e.requeued = false; e.encore = false;
    ['spell', 'order', 'zh', 'conj', 'match', 'blockH', 'lineH', 'pqRowH', 'pqCardH', 'pqSq', 'typed', 'zhShown', 'srs', 'missed', 'undo', 'slip', 'lvUp', 'mistakeDone', 'justAnswered', 'combo', 'comboBig', 'comboBefore'].forEach((k) => delete e[k]);
    SESSION.combo = 0;
    e.autoPlayed = true; e.rpTop = 0; e.rpStem = 0; e.rpSub = 0; e.rpCard = 0; e.rpStemH = 0;
    SESSION.idx = 0; SESSION.meta = Object.assign({}, SESSION.meta, { note: mode === 'note' ? '最近錯得比較多、錯題本比較滿，今天新內容少一點（5 題）。先把 N5 的單字（還剩 12 個）和漢字（還剩 8 個）學完，再開始第 3–4 週・て形。' : '' });
    if (q.key) { if (mode === 'leech') state.srs[q.key] = LEECH(); else delete state.srs[q.key]; }
    renderPractice(); window.scrollTo(0, 0);
    if (mode === 'prog') { const sp = document.getElementById('speechProg'); if (sp) { sp.hidden = false; const lab = sp.querySelector('.lab'); if (lab) lab.textContent = '第 1 / 6 句'; } }
  }
  function clipBox(el) { let top = 0, bot = innerHeight, a = el.parentElement;
    while (a && a !== document.body) { if (getComputedStyle(a).overflowY !== 'visible') { const r = a.getBoundingClientRect(); top = Math.max(top, r.top + a.clientTop); bot = Math.min(bot, r.top + a.clientTop + a.clientHeight); } a = a.parentElement; }
    return [top, bot]; }
  function firstLine(st) { const tw = document.createTreeWalker(st, NodeFilter.SHOW_TEXT);
    while (tw.nextNode()) { const n = tw.currentNode; if (!n.textContent.trim() || n.parentElement.closest('rt')) continue; const rg = document.createRange(); rg.selectNodeContents(n); const r = [...rg.getClientRects()].find((x) => x.width > 0.5 && x.height > 0.5); if (r) return r; }
    const c = st.querySelector('svg, img, button') || st; const r = c.getBoundingClientRect(); return { top: r.top, bottom: Math.min(r.bottom, r.top + 30), left: r.left, width: r.width, height: Math.min(r.height, 30) }; }
  function measure() {
    const els = [...document.querySelectorAll(SEL)];
    let miss = 0, notShown = 0, notHit = 0;
    for (const el of els) { const r = el.getBoundingClientRect(), [top, bot] = clipBox(el), B = Math.min(bot, innerHeight);
      miss = Math.max(miss, r.bottom - B, Math.max(top, 0) - r.top);
      const sh = r.width > 0 && r.height > 0 && r.top >= Math.max(top, 0) - 0.5 && r.bottom <= B + 0.5 && r.left >= -0.5 && r.right <= innerWidth + 0.5;
      if (!sh) { notShown++; continue; }
      const h = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); if (!h || h.closest(SEL) !== el) notHit++; }
    let stem = 2; const st = document.querySelector('.q-card .q-stem');   // 2: no stem
    if (st) { const L = firstLine(st), [top, bot] = clipBox(st); stem = 0;
      if (L.top >= Math.max(top, 0) - 0.5 && L.bottom <= Math.min(bot, innerHeight) + 0.5) { const h = document.elementFromPoint(L.left + Math.min(L.width / 2, 8), L.top + L.height / 2); if (h && st.contains(h)) stem = 1; } }
    const scroll = document.documentElement.scrollHeight - innerHeight, card = document.querySelector('#view > .q-card'), over = card && getComputedStyle(card).overflowY !== 'visible' ? card.scrollHeight - card.clientHeight : 0;
    return [els.length, Math.round(miss * 10) / 10, notShown, notHit, stem, Math.round(scroll), Math.round(over)];
  }
  async function warm(step = 1) { for (let i = 0; i < QS.length; i += step) { draw(i, 'new'); void document.body.offsetHeight; } await wait(300); if (document.fonts) await document.fonts.ready; await wait(200); return QS.length; }
  // whether a part of the card above the answer scrolls in a box of its own with words under its foot (the stem, the Chinese under it): its
  // cue up (rp-more: the fade, and 還有 under a stem)
  const cut = () => [...document.querySelectorAll('.q-card .q-stem, .q-card .q-sub')].some((el) => el.classList.contains('rp-more'));
  // the tops of the label row, the instruction and the stem, the options' (tiles', 配對's words') tops and heights; an audio option's are left
  // out (answered, it shows its words: 聽力's 即時應答 and 情境表達, as before) unless all=true
  const tops = (all) => [...document.querySelectorAll('.q-card > :is(.q-label, .q-instr, .q-stem)' + (currentEntry().q.audioOptions && !all ? '' : ', .q-card .opt, .q-card :is(.spell-tile, .order-tile, .match-word, .match-meaning)'))].map((el) => {
    const r = el.getBoundingClientRect(); return [Math.round(r.top * 10) / 10, el.matches('.q-card > *') ? 0 : Math.round(r.height * 10) / 10]; });
  // the answer for real (fix round 1; it was drawn without answerCurrent's bookkeeping): a click on a wrong option, on 我不會 for a tile or 配對
  // question — the app's own handler and its draw: 下一題 whole in sight and hit, and what moved. What the answer queued (notebook, 再練一次
  // copies) is dropped again, so 37,000 answers do not slow one another down
  function answered(q) { const el = q.custom ? document.querySelector('.q-card [data-act="custom-giveup"]') : document.querySelector('.q-card [data-act="answer"][data-i="' + ((q.answer + 1) % q.options.length) + '"]');
    if (!el) return [0, 0, 0]; el.click(); state.mistakes.length = 0; SESSION.entries.length = 2;
    const nb = document.getElementById('btnNext'); if (!nb) return [0, 0];
    const r = nb.getBoundingClientRect(), [top, bot] = clipBox(nb), B = Math.min(bot, innerHeight);
    const sh = r.width > 0 && r.top >= Math.max(top, 0) - 0.5 && r.bottom <= B + 0.5 && r.left >= -0.5 && r.right <= innerWidth + 0.5;
    const h = sh && document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return [sh ? 1 : 0, h && h.closest('#btnNext') ? 1 : 0, Math.round((r.bottom - B) * 10) / 10]; }
  // results: { fails: [i, key, fmt, tag, nCtl, miss, notShown, notHit, stem (1 begun, 0 not, 2 none), pageScroll, cardScroll, (ans: next shown, next hit, next below, moved)],
  // cut: format -> questions whose stem or its Chinese scrolls in place, card: format -> questions whose card scrolls, n: format -> questions drawn }
  // (step: every step-th question of the whole list, whichever chunk it falls in)
  function run(from, to, mode, all, step = 1) { const out = [], cuts = {}, ns = {}, cards = {};
    for (let i = from + (step - from % step) % step; i < Math.min(to, QS.length); i += step) { const [it, q, tag] = QS[i]; if (mode === 'prog' && !(q.fmt === 'l-dialog' || q.fmt === 'l-resp')) continue;
      const ans = mode.startsWith('ans'); draw(i, ans ? (mode.slice(3) || 'new') : mode); const m = measure(); let bad = m[0] === 0 || m[2] > 0 || m[3] > 0 || m[4] === 0;
      ns[q.fmt] = (ns[q.fmt] || 0) + 1; if (cut()) cuts[q.fmt] = (cuts[q.fmt] || 0) + 1; if (m[6] > 1) cards[q.fmt] = (cards[q.fmt] || 0) + 1;
      if (ans) { const t0 = tops(), a = answered(q), t1 = tops(); const moved = t0.length !== t1.length ? -1 : t0.filter((x, k) => Math.abs(x[0] - t1[k][0]) > 0.5 || Math.abs(x[1] - t1[k][1]) > 0.5).length;
        m.push(...a, moved); bad = !a[0] || !a[1] || moved !== 0; e.done = false; }
      if (bad || all) out.push([i, q.key || it.key || '', q.fmt, tag].concat(m)); }
    return JSON.stringify({ fails: out, cut: cuts, n: ns, card: cards }); }
  function done() { if (e && e.q && e.q.key) delete state.srs[e.q.key]; SESSION = null; document.body.classList.remove('practicing'); }
  return { build, warm, run, done, draw, measure, get qs() { return QS; } };
})();
'ok'
