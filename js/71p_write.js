'use strict';
// ---------- 寫寫看: writing a kana by hand (2026-11-14, 新手第一週 stage 5; docs/superpowers/specs/2026-11-14-beginner-week-design.md §7) ----------
// The user: a beginner should write the kana too, to know how they are written. On a blackboard: the kana's strokes faint with
// their numbers (KanjiVG's, kana-strokes.js), written over one stroke at a time in chalk. A stroke drawn is set beside the one
// due, both taken at N points along their length: near enough the right way round, and it is chalked in as it should be and the
// next is due; the wrong way round, or another stroke (a later one: the order), or nothing like it, and it is rubbed out with a
// word why; three misses on one and its stroke is shown drawn. 看筆順 draws them all in order. All written: 堀先生's word, and
// 1 言靈 for a kana the first time today (the classroom's 10 a day). Opened from the classroom's blackboard (the kana seen, ◀ ▶)
// and from a new kana's card. From the board (2026-11-14, the user: a kana written well should give way to the next; it opened
// on the last kana learned and stayed on it): the kana seen in 五十音 order from the first not yet written today; written with no
// miss, the next comes on its own once 堀先生 has said his word; with misses, 再寫一次 or 下一個; the last one done, his word on
// the lot (how many written this time, how many はなまる).
const WRITE = (() => {
  const N = 24, NEAR = 12, NS = 'http://www.w3.org/2000/svg';
  let S = null;   // { ch, list, run: { kana written this opening: no miss }, i (the stroke due), miss (on it), misses (in all), live: points being drawn, model: [{ d, pts, len }] }
  const f = (n) => n.toFixed(1);
  // a path's points at N even steps along it (a hidden path in the pad measures it)
  function along(d, svg) {
    const p = document.createElementNS(NS, 'path'); p.setAttribute('d', d); svg.appendChild(p);
    const L = p.getTotalLength(), pts = Array.from({ length: N }, (_, k) => { const q = p.getPointAtLength(L * k / (N - 1)); return [q.x, q.y]; });
    p.remove(); return { pts, len: L };
  }
  // the points drawn, at N even steps along what was drawn
  function even(raw) {
    const seg = [0]; for (let k = 1; k < raw.length; k++) seg.push(seg[k - 1] + Math.hypot(raw[k][0] - raw[k - 1][0], raw[k][1] - raw[k - 1][1]));
    const L = seg[seg.length - 1]; if (!L) return { pts: Array(N).fill(raw[0]), len: 0 };
    let j = 0; const pts = Array.from({ length: N }, (_, k) => { const at = L * k / (N - 1); while (j < seg.length - 2 && seg[j + 1] < at) j++; const t = (at - seg[j]) / ((seg[j + 1] - seg[j]) || 1); return [raw[j][0] + (raw[j + 1][0] - raw[j][0]) * t, raw[j][1] + (raw[j + 1][1] - raw[j][1]) * t]; });
    return { pts, len: L };
  }
  const apart = (a, b) => a.reduce((s, p, k) => s + Math.hypot(p[0] - b[k][0], p[1] - b[k][1]), 0) / a.length;
  // what a stroke drawn is: 'ok', 'back' (the right one the wrong way round), 'later' (k: a later stroke — the order), 'no'
  function judge(drawn, i) {
    const m = S.model, near = (x) => Math.max(NEAR, Math.min(18, x.len * 0.2));
    const fw = apart(drawn.pts, m[i].pts), bw = apart(drawn.pts.slice().reverse(), m[i].pts), short = drawn.len < m[i].len * 0.35 && m[i].len > 12;
    if (fw <= near(m[i]) && fw <= bw && !short) return { is: 'ok' };
    if (bw <= near(m[i]) && !short) return { is: 'back' };
    for (let k = i + 1; k < m.length; k++) if (Math.min(apart(drawn.pts, m[k].pts), apart(drawn.pts.slice().reverse(), m[k].pts)) <= near(m[k])) return { is: 'later', k };
    return { is: 'no' };
  }
  const roma = (c) => KANA_ROMAJI[c] || KANA_ROMAJI[Object.keys(KATA).find((h) => KATA[h] === c)] || '';
  function html() {
    const { ch, list } = S, at = list.indexOf(ch), strokes = KANA_STROKES[ch] || [];
    const grid = '<path class="wr-grid" d="M54.5 4 V105 M4 54.5 H105"/><rect class="wr-frame" x="2" y="2" width="105" height="105" rx="3"/>';
    const model = strokes.map((d, k) => `<path class="wr-model" data-k="${k}" d="${d}"/>`).join('');
    return `<button type="button" class="cls-x" data-cls="x" aria-label="關閉">✕</button>
      <div class="wr-head"><b lang="ja">${esc(ch)}</b><span>${esc(roma(ch))}・${strokes.length} 畫</span><button type="button" class="tp-say" data-w="say" aria-label="念出來">${icon('speaker')}</button></div>
      <div class="wr-board"><svg class="wr-pad" viewBox="0 0 109 109" role="img" aria-label="寫「${esc(ch)}」">${grid}<g class="wr-models">${model}</g><g class="wr-nums"></g><g class="wr-done"></g><path class="wr-live" d=""/></svg></div>
      <p class="wr-say" aria-live="polite">從第 1 筆開始，照著淡淡的字寫。</p>
      <div class="wr-btns">${list.length > 1 ? `<button type="button" class="btn btn-sm" data-w="prev" ${at <= 0 ? 'disabled' : ''} aria-label="上一個">◀</button>` : ''}<button type="button" class="btn btn-sm" data-w="demo">看筆順</button><button type="button" class="btn btn-sm" data-w="clear">重寫</button>${list.length > 1 ? `<button type="button" class="btn btn-sm" data-w="next" ${at >= list.length - 1 ? 'disabled' : ''} aria-label="下一個">▶</button>` : ''}</div>
      <p class="wr-credit">筆順資料：KanjiVG（CC BY-SA 3.0）</p>`;
  }
  const pad = () => document.querySelector('.cls-write .wr-pad');
  const word = (t, cls = '') => { const p = document.querySelector('.cls-write .wr-say'); if (p) { p.textContent = t; p.className = 'wr-say' + (cls ? ' ' + cls : ''); } };
  // the strokes still to write faint, the one due marked with its number at its start; those written in chalk
  function paint() {
    const svg = pad(); if (!svg) return;
    svg.querySelectorAll('.wr-model').forEach((p, k) => { p.classList.toggle('done', k < S.i); p.classList.toggle('due', k === S.i); });
    svg.querySelector('.wr-nums').innerHTML = S.model.map((m, k) => (k < S.i ? '' : `<text class="wr-num${k === S.i ? ' due' : ''}" x="${f(m.pts[0][0] - 6)}" y="${f(m.pts[0][1] - 3)}">${k + 1}</text>`)).join('');
  }
  // ch null: the first in the list not written today (all written: the first)
  function start(ch, list, run) {
    list = list && list.length ? list : [ch]; const w = today().done;
    ch = ch || list.find((c) => !w.includes(c)) || list[0];
    S = { ch, list, run: run || {}, i: 0, miss: 0, misses: 0, live: null, model: [] };
    const card = document.querySelector('.cls-write .cls-card');   // already open: the next kana on the same board
    if (card) card.innerHTML = html(); else CLASS.card('cls-write', '寫寫看', html(), onClick);
    const svg = pad(); S.model = (KANA_STROKES[ch] || []).map((d) => along(d, svg)); paint();
    svg.addEventListener('pointerdown', down); svg.addEventListener('pointermove', move); svg.addEventListener('pointerup', up); svg.addEventListener('pointercancel', () => { S.live = null; svg.querySelector('.wr-live').setAttribute('d', ''); });
    speak(ch);
  }
  const at = (e) => { const svg = pad(), m = svg.getScreenCTM().inverse(), p = svg.createSVGPoint(); p.x = e.clientX; p.y = e.clientY; const q = p.matrixTransform(m); return [q.x, q.y]; };
  function down(e) { if (!S || S.i >= S.model.length || S.demo) return; e.preventDefault(); pad().setPointerCapture(e.pointerId); S.live = [at(e)]; }
  function move(e) { if (!S || !S.live) return; S.live.push(at(e)); pad().querySelector('.wr-live').setAttribute('d', 'M' + S.live.map((p) => p.map(f).join(' ')).join(' L')); }
  function up(e) {
    if (!S || !S.live) return; S.live.push(at(e));
    const raw = S.live; S.live = null; pad().querySelector('.wr-live').setAttribute('d', '');
    stroke(raw);
  }
  // a stroke drawn (raw: its points in the box's units): chalked in, or rubbed out with why
  function stroke(raw) {
    const r = judge(even(raw), S.i), svg = pad();
    if (r.is === 'ok') {
      svg.querySelector('.wr-done').insertAdjacentHTML('beforeend', `<path class="wr-chalk" d="${KANA_STROKES[S.ch][S.i]}"/>`);
      S.i++; S.miss = 0; SND.play('paper', { vol: 0.5 }); paint();
      if (S.i >= S.model.length) { done(); return; }
      word(`很好！第 ${S.i + 1} 筆。`); return;
    }
    S.miss++; S.misses++; playSfx('bad');
    svg.querySelector('.wr-done').insertAdjacentHTML('beforeend', `<path class="wr-rub" d="M${raw.map((p) => p.map(f).join(' ')).join(' L')}"/>`);
    setTimeout(() => { const x = svg.querySelector('.wr-rub'); if (x) x.remove(); }, 650);
    word(r.is === 'back' ? `方向反了：第 ${S.i + 1} 筆從數字那頭開始寫。` : r.is === 'later' ? `那是第 ${r.k + 1} 筆，先寫第 ${S.i + 1} 筆。` : `不太像第 ${S.i + 1} 筆，照淡淡的字再寫一次。`, 'bad');
    if (S.miss >= 3) { show(S.i); S.miss = 0; }   // three misses: the stroke drawn for them
  }
  // one stroke drawn before their eyes (or, k undefined, all of them in order: 看筆順)
  function show(k) {
    const svg = pad(); if (!svg) return; const ks = k === undefined ? S.model.map((_, j) => j) : [k], tok = S;
    S.demo = k === undefined; const g = svg.querySelector('.wr-done');
    const still = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (S.demo) { g.innerHTML = ''; S.i = 0; paint(); }
    ks.forEach((j, n) => setTimeout(() => {
      if (S !== tok || !pad()) return;
      const len = S.model[j].len.toFixed(1);
      g.insertAdjacentHTML('beforeend', `<path class="wr-show" d="${KANA_STROKES[S.ch][j]}" style="stroke-dasharray:${len};stroke-dashoffset:${still ? 0 : len}"/>`);
      const p = g.lastElementChild; requestAnimationFrame(() => { p.style.transition = still ? '' : 'stroke-dashoffset .7s ease-in-out'; p.style.strokeDashoffset = '0'; });
      if (n === ks.length - 1) setTimeout(() => { if (S !== tok) return; if (S.demo) { g.innerHTML = ''; S.demo = false; paint(); word('換你寫寫看！從第 1 筆開始。'); } else setTimeout(() => { if (S === tok && p.isConnected) p.remove(); }, 400); }, 900);
    }, n * 850));
    if (k !== undefined) word(`第 ${k + 1} 筆是這樣寫的，照著再寫一次。`);
  }
  const HANA = ['よろしい。はなまる です。', '很好。給你一朵花圈。'], GOOD = ['よく できました。とめ、はね、はらい。', '寫得很好。頓筆、勾筆、撇筆。'],
    ALL = ['ぜんぶ かけましたね。よく がんばりました。', '全部寫完了呢。很努力。'];
  function done() {
    const clean = S.misses === 0, at = S.list.indexOf(S.ch), next = S.list[at + 1], tok = S;
    S.run[S.ch] = S.run[S.ch] || clean;
    const all = !next && S.list.length > 1, wrote = Object.keys(S.run).length, hana = Object.values(S.run).filter(Boolean).length;
    const line = all ? ALL : clean ? HANA : GOOD;
    word(all ? `寫好了！這次寫了 ${wrote} 個字，はなまる ${hana} 朵。` : `寫好了！${clean ? '一次都沒寫錯！' : ''}`, 'ok'); playSfx('good');
    pad().insertAdjacentHTML('beforeend', clean ? '<g class="wr-hana"><circle cx="86" cy="22" r="13" fill="none" stroke="#f08a8a" stroke-width="2.4"/><path d="M78 22 q8 -10 16 0 q-8 10 -16 0" fill="none" stroke="#f08a8a" stroke-width="1.6"/></g>' : '');
    const card = document.querySelector('.cls-write .cls-card');
    if (card) card.insertAdjacentHTML('beforeend', `<div class="cn-who wr-hori"><span class="kr-face">${TOWNEV.face('hori')}</span><p><b lang="ja">${esc(line[0])}</b><span>${esc(line[1])}</span></p></div>`);
    const btns = document.querySelector('.cls-write .wr-btns');
    if (btns) btns.innerHTML = '<button type="button" class="btn btn-sm" data-w="clear">再寫一次</button>'
      + (next ? '<button type="button" class="btn btn-sm wr-next" data-w="next">下一個 ▶</button>' : all ? `<button type="button" class="btn btn-sm" data-w="top">從「${esc(S.list[0])}」再寫一遍</button>` : '');
    const said = speakAs('hori', line[0]), t0 = Date.now();
    if (firstToday(S.ch)) CLASS.playKoto(1, `寫了「${S.ch}」`);
    // no miss and more to write: on to the next once he has said it (at least 1.5 s; his voice stuck: 4.5 s)
    if (clean && next) {
      const go = () => { if (S === tok && pad()) start(next, S.list, S.run); };
      Promise.resolve(said).catch(() => {}).then(() => setTimeout(go, Math.max(300, 1500 - (Date.now() - t0)))); setTimeout(go, 4500);
    }
  }
  // the kana written today (this device): 1 言靈 a kana the first time, the board's ✓, where the board's writing starts
  function today() {
    const t = todayStr(); try { const m = JSON.parse(localStorage.getItem('nq_write') || 'null'); if (m && m.day === t && Array.isArray(m.done)) return m; } catch (e) { /* none */ } return { day: t, done: [] };
  }
  function firstToday(ch) {
    const w = today(); if (w.done.includes(ch)) return false; w.done.push(ch);
    try { localStorage.setItem('nq_write', JSON.stringify(w)); return true; } catch (e) { return false; }
  }
  function onClick(e) {
    const b = e.target.closest('[data-w]'); if (!b || !S) return;
    const w = b.dataset.w, at = S.list.indexOf(S.ch);
    if (w === 'say') speak(S.ch);
    else if (w === 'demo') show();
    else if (w === 'clear') start(S.ch, S.list, S.run);
    else if (w === 'prev' && at > 0) start(S.list[at - 1], S.list, S.run);
    else if (w === 'next' && at < S.list.length - 1) start(S.list[at + 1], S.list, S.run);
    else if (w === 'top') start(S.list[0], S.list);
  }
  // what is said here, for the generator (talkLines): 堀先生's three words
  const lines = (add) => [HANA, GOOD, ALL].forEach((l) => add('hori', l[0]));
  return { open: (ch, list) => start(ch, list), stroke, lines, has: (ch) => Boolean(KANA_STROKES[ch]), state: () => S, today: () => today().done };
})();
