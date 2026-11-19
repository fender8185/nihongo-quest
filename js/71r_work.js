'use strict';
// ---------- 中華街の打工 (2026-11-14; docs/superpowers/specs/2026-11-14-chinatown-work-design.md §4–§7) ----------
// The user: a beginner should have somewhere to earn a little 円 — a second way beside the cruise's guide, the two unrelated; at
// most one workplace a day (later places too: 商店街's shops and others, 中華街 the first and lowest); the pay a tenth of what I
// first put (2026-11-14: too much). Four workplaces, a step up each (2026-11-19, the user: a clearer difficulty from job to job):
// 包包子 at 福明 with 王 (5 kana seen; kana and kana words heard), 站櫃 at らんらん (15; words heard), 外場 in らいらいけん (30 and
// three 入門 words; the talk; 2026-11-15: in place of 外送), 收銀 at ふく (N5's numbers learned; sums reckoned and read out —
// 2026-11-19, in place of 整理貨架). A shift is ten tasks (the 外場 six groups); one left halfway waits for its day, at that place
// only; the day is the town's day it began. Graded by the share right at once (as the cruise's guide), paid by the 打工證 (the
// shifts done: 1 新人 100 円, 5 アルバイト 120, 15 ベテラン 150, 30 バイトリーダー 200) and the grade (S 50 … C 10), a tip on
// top where a job gives one; 円 only. Each job's runner registers itself (WORK.register) and drives the shift through its ctx: right(task, misses) as
// each is done, finish() at the tenth.
const WORK = (() => {
  const N = 10;
  const PLACES = {
    buns: { place: 'chinatown', shop: 'seiro', who: 'wang', kana: 5, name: '包包子', at: '福明', tune: 'chukagai' },   // 5 (was 46): the first job (2026-11-19)
    counter: { place: 'chinadori', shop: 'ranran', who: 'zhou', kana: 15, name: '站櫃', at: 'らんらん', tune: 'chukagai' },
    // 外場 2.0 (2026-11-15, docs/superpowers/specs/2026-11-15-hall-rush-design.md §2): a shift is six groups, each scored by its mood
    // at the door (0 pleased … 3 stormed out), graded with part credit for the not quite pleased
    waiter: { place: 'rairai', shop: 'rairai', who: 'huang', kana: 30, words: ['いらっしゃいませ', 'どうぞ', 'はい'], name: '外場', at: 'らいらいけん', n: 6, credit: [1, 0.6, 0.3, 0], unit: '滿意的客人', tune: 'rairai' },
    till: { place: 'chinadori', shop: 'fuku', who: 'zhang', kana: 46, need: '學「いくら」「円」和數字', name: '收銀', at: 'ふく', tune: 'chukagai' } };   // need: its words (JOBS' left), named
  // a workplace no more (外送, cut 2026-11-15; 整理貨架, 2026-11-19): its old records still read
  const GONE = { deliver: { name: '外送', at: 'らいらいけん' }, shelf: { name: '整理貨架', at: 'ふく' } };
  const named = (job) => PLACES[job] || GONE[job] || { name: job, at: '' };
  const RANKS = [[30, 'バイトリーダー', 200], [15, 'ベテラン', 150], [5, 'アルバイト', 120], [1, '新人', 100]];
  const BONUS = { S: 50, A: 30, B: 20, C: 10, D: 0, E: 0 };
  const GRADES = [['S', 0.95], ['A', 0.85], ['B', 0.7], ['C', 0.5], ['D', 0.3], ['E', 0]];
  const JOBS = {};
  const day = () => dateStr(TOWNEV.today());
  const W = () => (state.work && state.work.res ? state.work : (state.work = { res: {} }));
  const fin = (r) => Boolean(r) && r.yen !== undefined;
  const today = () => W().res[day()] || null;
  const shifts = () => Object.values(W().res).filter(fin).length;
  const rank = (n) => (RANKS.find(([k]) => n >= k) || [0, ''])[1];
  const nOf = (job) => (PLACES[job] && PLACES[job].n) || N;   // the tasks in a shift of this job (10, the 外場's six groups)
  const grade = (score, job) => { const v = Object.values(score || {}), cr = PLACES[job] && PLACES[job].credit, got = (m) => (cr ? cr[Math.min(m, cr.length - 1)] : m === 0 ? 1 : 0);
    const share = v.reduce((a, m) => a + got(m), 0) / Math.max(nOf(job), v.length); return GRADES.find(([, min]) => share >= min - 1e-9)[0]; };
  const pay = (n, g, tip = 0) => { const base = (RANKS.find(([k]) => n >= k) || RANKS[RANKS.length - 1])[2], bonus = BONUS[g] || 0; return { base, bonus, tip, yen: base + bonus + tip }; };
  const seen = () => kanaSeenSet().size;
  const knowsAll = () => state.kanaKnown === true || !inPreStage();
  const kanaOk = (need) => knowsAll() || seen() >= need;
  // the kana the jobs may use: those seen — or all of them for one who knew kana already or is past 入門 (2026-11-15, the final
  // review: they had no kana seen, and three jobs drew from nothing)
  const kana = () => (knowsAll() ? new Set(REG.kana.map((x) => x.ch)) : kanaSeenSet());
  const here = (job) => (job === 'buns' ? (TOWNEV.whereIs('wang', TOWNEV.now(), TOWNEV.today()) || {}).place === 'chinatown' : job === 'waiter' ? TOWNEV.isOpen('rairai', TOWNEV.now()) : TOWNEV.isOpen('dori', TOWNEV.now()));
  // the 入門 words a job needs learned first (外場: いらっしゃいませ, どうぞ, はい) — the ones not yet, for one still in 入門
  // an 入門 word learned (or all of them, past 入門 — not for knowing kana: those words come in 入門's own lessons; the final review)
  const knows = (w) => !inPreStage() || REG.vocab.some((v) => v.w === w && v.r === w && state.srs[v.key]);
  const wordsLeft = (job) => (PLACES[job].words || []).filter((w) => !knows(w));
  const needs = (job) => (JOBS[job] && JOBS[job].left ? JOBS[job].left() : []);   // 收銀's numbers (and いくら, 円) still to learn
  // may this job be started (or picked up again) now: its kana seen, today's workplace (if any) this one and not done, open
  function can(job) {
    const P = PLACES[job]; if (!P) return { ok: false, why: '' };
    if (!kanaOk(P.kana)) return { ok: false, why: `再學 ${P.kana - seen()} 個假名就能來${P.name}。` };
    const left = wordsLeft(job); if (left.length) return { ok: false, why: `先學會入門的${left.map((w) => `「${w}」`).join('')}，就能來${P.name}。` };
    const more = needs(job); if (more.length) return { ok: false, why: `先學會${more.map((w) => `「${w}」`).join('')}，就能來${P.name}。` };
    const t = today();
    if (t && t.place !== job && !free()) return { ok: false, why: `今天已經在「${named(t.place).name}」打過工了。一天只能在一個地方打工，明天再來吧。` };
    if (fin(t) && !free()) return { ok: false, why: '今天的班打完了，明天再來吧。' };
    if (!here(job)) return { ok: false, why: job === 'buns' ? '王老闆不在攤子（10 點到 20 點在）。' : job === 'waiter' ? 'らいらいけん 10 點到 20 點營業。' : '大通り的店 10 點到 19 點開門。' };
    return { ok: true };
  }
  // the test site (町の手帳, 2026-11-15, the user): shift after shift, any place, on this device — today's record put aside under the
  // day and a number (its pay kept with it) as the next begins
  const FREE = 'nq_work_free';
  const free = () => { try { return onTestSite() && localStorage.getItem(FREE) === '1'; } catch (e) { return false; } };
  function tool() { const on = !free(); try { localStorage.setItem(FREE, on ? '1' : ''); } catch (e) { /* no storage */ } return on ? '打工無限次數（這台裝置）：打完一班可以再打，也可以換別家' : '打工恢復一天只能一個地方、一班'; }
  function setAside(d) { const res = W().res; let n = 2; while (res[`${d}#${n}`]) n++; res[`${d}#${n}`] = res[d]; delete res[d]; }
  let S = null;   // the shift under way: { job, day }
  // a shift begun, or today's picked up where it was left; its runner given what it needs (ctx)
  function start(yard, job) {
    const c = can(job); if (!c.ok) { toast(c.why, 3600); return false; }
    const d = day(), res = W().res; if (free() && res[d] && (fin(res[d]) || res[d].place !== job)) setAside(d);
    if (!res[d]) { res[d] = { place: job, done: 0, score: {} }; saveState(); }
    const s = S = { job, day: d };
    if (res[d].done >= nOf(job)) { finish(s); return true; }   // all done but never paid (the card shut, the app gone, at the last moment): paid now
    const ctx = { yard, n: nOf(job), job, done: res[d].done, right: (k, misses) => right(s, k, misses), finish: (extra, ms) => finish(s, extra, ms), on: () => S === s,
      kept: Object.assign({}, res[d].keep), keep: (o) => { const r = W().res[d]; if (S === s && r && !fin(r)) { r.keep = o; saveState(); } } };   // keep: what the runner needs back after a break (外場's stars, its once-a-shift things), till paid
    const run = () => { if (S === s && JOBS[job]) JOBS[job].run(ctx); };
    const first = (TOWN.WORK.first || {})[job], before = Object.entries(res).some(([k, r]) => k !== d && r.place === job);   // the keeper's word the first time
    if (first && !before && !res[d].done) TALK.open(yard, PLACES[job].who, first, run, null, { ev: true }); else run();
    return true;
  }
  // before a shift (2026-11-19, the user: a job should first say how it is played and what it asks of you, then はい／いいえ): the
  // rules card — how it goes, the abilities it takes, how long a shift is and the pay — はい to begin (start), いいえ to leave it.
  // はたらく opens it; the keepers' first word (TOWN.WORK.first) keeps only what they say in Japanese, the rules being here
  const RULES = {
    counter: { how: ['客人用日文說要買什麼（用聽的），從櫃台上把那樣東西拿給他。', '學過「ふたつ」：有客人會要兩個，就拿兩次。'], uses: ['聽單字', '假名'], n: '一班 10 位客人' },
    waiter: { how: ['有「！」的就是在等你：客人頭上，或要帶位時的空桌子。點它走過去。', '聽客人說什麼，從下面三句選你要回的那句。帶位、點菜、端菜、結帳都靠你。', '客人頭上那條是耐心，越等越短；沒了客人就走人，店裡少一顆星。客滿時有人進門，先道歉請他等。'], uses: ['聽力', '招呼和店裡的會話', 'これ・それ・あれ'], n: '一班 6 組客人' },
    buns: { how: ['聽到哪個音，就在假名板上按哪個字；按對了包子就往下包一步。假名板上是你學過的假名，發音像、字形像的會放在一起。', '學過 4 個以上只用假名寫的入門單字：有時王老闆念的是一個單字，板子換成 4 張單字卡，點對的那張。', '按 30 下、包好 5 顆包子。兩分鐘內全部按對，王老闆會很激動。'], uses: ['聽假名', '認假名', '聽入門單字'], n: '一班 5 顆包子' },
    till: { how: ['客人把要買的東西放上櫃台，每樣都有價格牌。只有一樣就問「これ、いくらですか。」，用字卡依序拼出價格的念法，例如 はっ｜ぴゃく｜えん。', '兩樣以上（或同一樣要「ふたつ」）就問「ぜんぶで いくらですか。」：自己加起來，拼出全部的錢，例如 800＋900 → せん｜なな｜ひゃく｜えん。', '越後面的客人買越多樣，最後三樣。按錯一塊算一次失誤，錯兩次下一塊會亮。'], uses: ['數字的念法', 'ひゃく・せん 的音變', '心算加法'], n: '一班 10 位客人' } };
  function intro(yard, job) {
    const c = can(job); if (!c.ok) { toast(c.why, 3600); return false; }
    const P = PLACES[job], R = RULES[job], t = today(), back = t && t.place === job && !fin(t) ? t.done : 0, n = shifts() + 1, p = pay(n, 'E');
    CLASS.card('wk-rules', P.name, `<div class="wk-rhead"><span class="kr-face">${TOWNEV.face(P.who)}</span><p><b>${esc(P.name)}</b><span lang="ja">${esc(P.at)}</span></p></div>
      <h4>玩法</h4><ul class="wk-how">${R.how.map((l) => `<li>${esc(l)}</li>`).join('')}</ul>
      <h4>需要的能力</h4><p class="wk-uses">${R.uses.map((u) => `<span lang="ja">${esc(u)}</span>`).join('')}</p>
      <p class="wk-pay">${esc(R.n)}・底薪 ${p.base} 円（${esc(rank(n))}）＋評級加給最多 50 円${job === 'waiter' ? '＋店長紅包' : ''}</p>
      ${back ? `<p class="wk-back">今天做到 ${back}／${nOf(job)}，按「はい」接著做。</p>` : ''}
      <p class="wk-ask"><b lang="ja">はたらきますか？</b><span>要開始打工嗎？</span></p>
      <div class="wk-yn"><button type="button" class="btn btn-primary" data-rules="yes" lang="ja">はい</button><button type="button" class="btn" data-rules="no" lang="ja">いいえ</button></div>`,
    (e) => { const b = e.target.closest('[data-rules]'); if (!b) return; CLASS.close(); if (b.dataset.rules === 'yes') start(yard, job); });
    return true;
  }
  // the job a person takes beginners on for, where they are now, once its kana are seen (today taken elsewhere or closed: still
  // offered, and はたらく says why not)
  const offer = (id, place) => { const job = Object.keys(PLACES).find((j) => PLACES[j].who === id && PLACES[j].place === place); return job && kanaOk(PLACES[job].kana) ? job : null; };
  const hello = (id) => (TOWN.WORK.hello || {})[id] || ['いらっしゃい！', '歡迎光臨！'];
  // the 求人看板 by the way into 大通り: the four jobs, where, what each needs (✓ those open to this learner), the hours, today's
  function board() {
    const t = today(), rows = Object.entries(PLACES).map(([job, P]) => { const ok = kanaOk(P.kana);
      const left = ok ? wordsLeft(job) : [], more = needs(job).length, go = ok && !left.length && !more;   // the kana seen, the 入門 words (外場) and numbers (收銀) still to learn
      return `<li class="wk-job${go ? ' ok' : ''}" data-job="${job}"><b>${esc(P.name)}</b><span lang="ja">${esc(P.at)}</span><span>${go ? '✓ 可以做' : more ? P.need : ok ? `再學 ${left.length} 個入門單字` : `學 ${P.kana} 個假名`}</span></li>`; }).join('');
    const now = t ? (fin(t) ? `今天在「${esc(named(t.place).name)}」的班打完了。` : `今天在「${esc(named(t.place).name)}」打工中（${t.done}／${nOf(t.place)}）。`) : '今天還沒打工。一天只能選一個地方打一班。';
    CLASS.card('wk-board', '求人看板', `<button type="button" class="cls-x" data-cls="x" aria-label="關閉">✕</button><div class="wk-bhead"><b lang="ja">アルバイト ぼしゅう</b><span>求人看板</span></div>
      <ul class="wk-jobs">${rows}</ul><p class="wk-today">${now}</p><p class="wk-note">大通り的店 10 點到 19 點；外場在らいらいけん店裡（10 點到 20 點）；包包子在牌樓外的「福明」，王老闆在的時候。點老闆，選「はたらく」。</p>`, () => {});
  }
  // a task done (misses: the tries wrong first): counted once, on the day the shift began
  function right(s, k, misses) {
    const r = W().res[s.day]; if (!r || fin(r)) return;
    if (!(k in r.score)) r.score[k] = Math.max(0, Math.floor(misses) || 0);
    r.done = Math.max(r.done || 0, Object.keys(r.score).length); saveState();
  }
  // the last done: graded and paid at once (extra.tip: on top — 外場's 店長紅包, named by extra.tipName), the results shown ms later
  // (or once ms, a promise, is kept: the goodbye said) — the runner calls it at the tenth, not at the end of its card's goodbye,
  // so a card shut then is paid all the same (2026-11-15, the final review)
  function finish(s, extra = {}, ms = 0) {
    const r = W().res[s.day]; if (!r || fin(r)) return null;
    const before = yenBalance(), n = shifts() + 1, g = grade(r.score, s.job), p = Object.assign(pay(n, g, extra.tip || 0), { tipName: extra.tipName });
    Object.assign(r, { done: nOf(s.job), yen: p.yen, grade: g, tip: p.tip }); delete r.keep; saveState();
    if (S === s) S = null;
    const show = () => results(s.job, r, p, before, n, extra.html);
    if (ms && ms.then) ms.then(show, show); else if (ms) setTimeout(show, ms); else show();
    return p;
  }
  // the results: the tasks right at once, the pay counting up, the grade stamped on, the 打工證 and whether it went up
  function results(job, r, p, before, n, more = '') {   // more: the job's own lines under the pay (外場: each group, their words to hear again)
    const first = Object.values(r.score).filter((m) => m === 0).length, all = nOf(job), rk = rank(n), up = rk !== rank(n - 1), g = r.grade, el = document.createElement('div');
    el.className = 'cr-result wk-result'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', '打工結算'); el.dataset.at = location.hash;
    el.innerHTML = `<div class="crr-card"><div class="crr-head"><b>打工結算</b><span>${esc(named(job).name)}・${esc(named(job).at)}</span></div>
      <div class="crr-row"><span>${esc((PLACES[job] && PLACES[job].unit) || '一次就做對')}</span><b><i data-n="${first}">0</i> / ${all}</b></div>
      <div class="crr-row"><span>${yenIcon()}底薪</span><b><i data-n="${p.base}" data-yen>0</i> 円</b></div>
      ${p.bonus ? `<div class="crr-row"><span>評級加給（${g} 級）</span><b>+<i data-n="${p.bonus}" data-yen>0</i> 円</b></div>` : ''}
      ${p.tip ? `<div class="crr-row"><span>${esc(p.tipName || '小費')}</span><b>+<i data-n="${p.tip}" data-yen>0</i> 円</b></div>` : ''}
      <div class="crr-row crr-sum"><span>錢包</span><b><i data-n="${before + p.yen}" data-from="${before}" data-yen>${yenStr(before)}</i> 円</b></div>${more}
      <div class="crr-stamp g${g}" aria-label="${g} 級"><b>${g}</b><span>級バイト</span></div>
      <p class="crr-rank">打工證：${esc(rk)}${up ? `　<em>${rank(n - 1) ? '升級！' : '拿到打工證！'}</em>` : ''}</p>
      <button type="button" class="btn btn-primary crr-ok">收下</button></div>`;
    document.body.appendChild(el);
    const nums = [...el.querySelectorAll('i[data-n]')], stamp = el.querySelector('.crr-stamp'), put = (x, v) => { x.textContent = x.dataset.yen !== undefined ? yenStr(v) : String(Math.round(v)); };
    const thud = () => { stamp.classList.add('on'); el.querySelector('.crr-card').classList.add('thud'); playSfx('stamp'); setTimeout(() => playSfx('fanfare'), 380); };
    if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) { nums.forEach((x) => put(x, Number(x.dataset.n))); stamp.classList.add('on', 'still'); }
    else nums.forEach((x, k) => setTimeout(() => {   // one after another, ticking up
      const to = Number(x.dataset.n), from = Number(x.dataset.from || 0), t0 = performance.now(); let ticks = 0;
      const f = (now) => { const u = Math.min(1, (now - t0) / 600); put(x, from + (to - from) * (1 - Math.pow(1 - u, 3))); if (Math.floor(u * 5) > ticks) { ticks = Math.floor(u * 5); playSfx('coin', ticks); } if (u < 1) requestAnimationFrame(f); else if (k === nums.length - 1) setTimeout(thud, 250); };
      requestAnimationFrame(f);
    }, 300 + k * 650));
    el.querySelector('.crr-ok').addEventListener('click', () => { el.remove(); if (typeof kotoButtons === 'function') kotoButtons(document); });
    el.addEventListener('click', (e) => { const b = e.target.closest('[data-say]'); if (b) { primeTtsPlayer(); speakAs(b.dataset.who, b.dataset.say); } });   // a line heard again
  }
  // 町の手帳's 打工證 page: the rank, the shifts done (how many more to the next), each workplace's shifts and best grade
  function book() {
    const all = Object.values(W().res).filter(fin), n = all.length, next = RANKS.slice().reverse().find(([k]) => k > n);
    const gone = Object.keys(GONE).filter((job) => all.some((r) => r.place === job));   // a workplace no more, while it has shifts to show
    const rows = Object.entries(PLACES).concat(gone.map((job) => [job, GONE[job]])).map(([job, P]) => { const mine = all.filter((r) => r.place === job), best = GRADES.map(([g]) => g).find((g) => mine.some((r) => r.grade === g));
      return `<tr><td>${esc(P.name)}</td><td lang="ja">${esc(P.at)}</td><td>${mine.length} 班</td><td>${best || '—'}</td></tr>`; }).join('');
    return `<div class="wk-book"><div class="wk-card"><span class="wk-title">打工證</span><b class="wk-rank" lang="ja">${esc(rank(n) || '—')}</b><span>打過 ${n} 班${next ? `・再 ${next[0] - n} 班升「${next[1]}」` : ''}</span></div>
      <table class="wk-tbl"><thead><tr><th>工作</th><th>場所</th><th>打過</th><th>最好</th></tr></thead><tbody>${rows}</tbody></table>
      <p class="wk-note">一天只能在一個地方打一班。中華街的店：大通り 10 點到 19 點；らいらいけん 10 點到 20 點；包包子要王老闆在攤子。</p></div>`;
  }
  const register = (job, def) => { JOBS[job] = def; };
  // the music while a shift is under way and in sight (MUSIC.RECORDS: tune; 2026-11-18, the user: the jobs wanted a little music):
  // a job's card up (to its goodbye), or the 外場's floor running (to 黄's おつかれ) — MUSIC.sync() as either opens or shuts
  const tune = () => { const job = Object.keys(PLACES).find((j) => document.querySelector('.cls.wk-' + j)) || (typeof HALL === 'object' && HALL.on() ? 'waiter' : '');
    return job ? PLACES[job].tune : ''; };
  const lines = (add) => { Object.entries(TOWN.WORK.hello || {}).forEach(([id, l]) => add(id, l[0])); Object.values(TOWN.WORK.first || {}).forEach((ls) => ls.forEach((l) => add(l[0], l[1]))); Object.values(JOBS).forEach((j) => j.lines && j.lines(add)); };
  return { N, nOf, PLACES, kana, knows, free, tool, can, start, intro, register, pay, rank, grade, shifts, today, book, shown: () => shifts() > 0, lines, on: () => S, offer, hello, board, tune };
})();
