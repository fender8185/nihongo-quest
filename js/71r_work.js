'use strict';
// ---------- 中華街の打工 (2026-11-14; docs/superpowers/specs/2026-11-14-chinatown-work-design.md §4–§7) ----------
// The user: a beginner should have somewhere to earn a little 円 — a second way beside the cruise's guide, the two unrelated; at
// most one workplace a day (later places too: 商店街's shops and others, 中華街 the first and lowest); the pay a tenth of what I
// first put (2026-11-14: too much). Four workplaces, each opening by the kana seen (5, 15, 30, 46): 整理貨架 at ふく, 站櫃 at
// らんらん, 外送 from らいらいけん, 包包子 at 福明 with 王. A shift is ten tasks; one left halfway waits for its day, at that place
// only; the day is the town's day it began. Graded by the share right at once (as the cruise's guide), paid by the 打工證 (the
// shifts done: 1 新人 100 円, 5 アルバイト 120, 15 ベテラン 150, 30 バイトリーダー 200) and the grade (S 50 … C 10), 外送 a tip on
// top; 円 only. Each job's runner registers itself (WORK.register) and drives the shift through its ctx: right(task, misses) as
// each is done, finish() at the tenth.
const WORK = (() => {
  const N = 10;
  const PLACES = {
    shelf: { place: 'chinadori', shop: 'fuku', who: 'zhang', kana: 5, name: '整理貨架', at: 'ふく' },
    counter: { place: 'chinadori', shop: 'ranran', who: 'zhou', kana: 15, name: '站櫃', at: 'らんらん' },
    deliver: { place: 'chinadori', shop: 'rairai', who: 'huang', kana: 30, name: '外送', at: 'らいらいけん' },
    buns: { place: 'chinatown', shop: 'seiro', who: 'wang', kana: 46, name: '包包子', at: '福明' } };
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
  const grade = (score) => { const v = Object.values(score || {}), share = v.filter((m) => m === 0).length / Math.max(N, v.length); return GRADES.find(([, min]) => share >= min - 1e-9)[0]; };
  const pay = (n, g, tip = 0) => { const base = (RANKS.find(([k]) => n >= k) || RANKS[RANKS.length - 1])[2], bonus = BONUS[g] || 0; return { base, bonus, tip, yen: base + bonus + tip }; };
  const seen = () => kanaSeenSet().size;
  const knowsAll = () => state.kanaKnown === true || !inPreStage();
  const kanaOk = (need) => knowsAll() || seen() >= need;
  // the kana the jobs may use: those seen — or all of them for one who knew kana already or is past 入門 (2026-11-15, the final
  // review: they had no kana seen, and three jobs drew from nothing)
  const kana = () => (knowsAll() ? new Set(REG.kana.map((x) => x.ch)) : kanaSeenSet());
  const here = (job) => (job === 'buns' ? (TOWNEV.whereIs('wang', TOWNEV.now(), TOWNEV.today()) || {}).place === 'chinatown' : TOWNEV.isOpen('dori', TOWNEV.now()));
  // may this job be started (or picked up again) now: its kana seen, today's workplace (if any) this one and not done, open
  function can(job) {
    const P = PLACES[job]; if (!P) return { ok: false, why: '' };
    if (!kanaOk(P.kana)) return { ok: false, why: `再學 ${P.kana - seen()} 個假名就能來${P.name}。` };
    const t = today();
    if (t && t.place !== job) return { ok: false, why: `今天已經在「${(PLACES[t.place] || {}).name || t.place}」打過工了。一天只能在一個地方打工，明天再來吧。` };
    if (fin(t)) return { ok: false, why: '今天的班打完了，明天再來吧。' };
    if (!here(job)) return { ok: false, why: job === 'buns' ? '王老闆不在攤子（10 點到 20 點在）。' : '大通り的店 10 點到 19 點開門。' };
    return { ok: true };
  }
  let S = null;   // the shift under way: { job, day }
  // a shift begun, or today's picked up where it was left; its runner given what it needs (ctx)
  function start(yard, job) {
    const c = can(job); if (!c.ok) { toast(c.why, 3600); return false; }
    const d = day(), res = W().res; if (!res[d]) { res[d] = { place: job, done: 0, score: {} }; saveState(); }
    const s = S = { job, day: d };
    if (res[d].done >= N) { finish(s); return true; }   // all ten done but never paid (the card shut, the app gone, at the last moment): paid now
    const ctx = { yard, n: N, job, done: res[d].done, right: (k, misses) => right(s, k, misses), finish: (extra, ms) => finish(s, extra, ms), on: () => S === s };
    const run = () => { if (S === s && JOBS[job]) JOBS[job].run(ctx); };
    const first = (TOWN.WORK.first || {})[job], before = Object.entries(res).some(([k, r]) => k !== d && r.place === job);   // the keeper's word the first time
    if (first && !before && !res[d].done) TALK.open(yard, PLACES[job].who, first, run, null, { ev: true }); else run();
    return true;
  }
  // the job a person takes beginners on for, where they are now, once its kana are seen (today taken elsewhere or closed: still
  // offered, and はたらく says why not)
  const offer = (id, place) => { const job = Object.keys(PLACES).find((j) => PLACES[j].who === id && PLACES[j].place === place); return job && kanaOk(PLACES[job].kana) ? job : null; };
  const hello = (id) => (TOWN.WORK.hello || {})[id] || ['いらっしゃい！', '歡迎光臨！'];
  // the 求人看板 by the way into 大通り: the four jobs, where, the kana each needs (✓ those open to this learner), the hours, today's
  function board() {
    const t = today(), rows = Object.entries(PLACES).map(([job, P]) => { const ok = kanaOk(P.kana);
      return `<li class="wk-job${ok ? ' ok' : ''}" data-job="${job}"><b>${esc(P.name)}</b><span lang="ja">${esc(P.at)}</span><span>${ok ? '✓ 可以做' : `學 ${P.kana} 個假名`}</span></li>`; }).join('');
    const now = t ? (fin(t) ? `今天在「${esc((PLACES[t.place] || {}).name || '')}」的班打完了。` : `今天在「${esc((PLACES[t.place] || {}).name || '')}」打工中（${t.done}／${N}）。`) : '今天還沒打工。一天只能選一個地方打一班。';
    CLASS.card('wk-board', '求人看板', `<button type="button" class="cls-x" data-cls="x" aria-label="關閉">✕</button><div class="wk-bhead"><b lang="ja">アルバイト ぼしゅう</b><span>求人看板</span></div>
      <ul class="wk-jobs">${rows}</ul><p class="wk-today">${now}</p><p class="wk-note">大通り的店 10 點到 19 點；包包子在牌樓外的「福明」，王老闆在的時候。點老闆，選「はたらく」。</p>`, () => {});
  }
  // a task done (misses: the tries wrong first): counted once, on the day the shift began
  function right(s, k, misses) {
    const r = W().res[s.day]; if (!r || fin(r)) return;
    if (!(k in r.score)) r.score[k] = Math.max(0, Math.floor(misses) || 0);
    r.done = Math.max(r.done || 0, Object.keys(r.score).length); saveState();
  }
  // the tenth done: graded and paid at once (extra.tip: 外送's), the results shown ms later — the runner calls it at the tenth, not at
  // the end of its card's goodbye, so a card shut then is paid all the same (2026-11-15, the final review)
  function finish(s, extra = {}, ms = 0) {
    const r = W().res[s.day]; if (!r || fin(r)) return null;
    const before = yenBalance(), n = shifts() + 1, g = grade(r.score), p = pay(n, g, extra.tip || 0);
    Object.assign(r, { done: N, yen: p.yen, grade: g, tip: p.tip }); saveState();
    if (S === s) S = null;
    if (ms) setTimeout(() => results(s.job, r, p, before, n), ms); else results(s.job, r, p, before, n);
    return p;
  }
  // the results: the tasks right at once, the pay counting up, the grade stamped on, the 打工證 and whether it went up
  function results(job, r, p, before, n) {
    const first = Object.values(r.score).filter((m) => m === 0).length, rk = rank(n), up = rk !== rank(n - 1), g = r.grade, el = document.createElement('div');
    el.className = 'cr-result wk-result'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', '打工結算'); el.dataset.at = location.hash;
    el.innerHTML = `<div class="crr-card"><div class="crr-head"><b>打工結算</b><span>${esc(PLACES[job].name)}・${esc(PLACES[job].at)}</span></div>
      <div class="crr-row"><span>一次就做對</span><b><i data-n="${first}">0</i> / ${N}</b></div>
      <div class="crr-row"><span>${yenIcon()}底薪</span><b><i data-n="${p.base}" data-yen>0</i> 円</b></div>
      ${p.bonus ? `<div class="crr-row"><span>評級加給（${g} 級）</span><b>+<i data-n="${p.bonus}" data-yen>0</i> 円</b></div>` : ''}
      ${p.tip ? `<div class="crr-row"><span>小費</span><b>+<i data-n="${p.tip}" data-yen>0</i> 円</b></div>` : ''}
      <div class="crr-row crr-sum"><span>錢包</span><b><i data-n="${before + p.yen}" data-from="${before}" data-yen>${yenStr(before)}</i> 円</b></div>
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
  }
  // 町の手帳's 打工證 page: the rank, the shifts done (how many more to the next), each workplace's shifts and best grade
  function book() {
    const all = Object.values(W().res).filter(fin), n = all.length, next = RANKS.slice().reverse().find(([k]) => k > n);
    const rows = Object.entries(PLACES).map(([job, P]) => { const mine = all.filter((r) => r.place === job), best = GRADES.map(([g]) => g).find((g) => mine.some((r) => r.grade === g));
      return `<tr><td>${esc(P.name)}</td><td lang="ja">${esc(P.at)}</td><td>${mine.length} 班</td><td>${best || '—'}</td></tr>`; }).join('');
    return `<div class="wk-book"><div class="wk-card"><span class="wk-title">打工證</span><b class="wk-rank" lang="ja">${esc(rank(n) || '—')}</b><span>打過 ${n} 班${next ? `・再 ${next[0] - n} 班升「${next[1]}」` : ''}</span></div>
      <table class="wk-tbl"><thead><tr><th>工作</th><th>場所</th><th>打過</th><th>最好</th></tr></thead><tbody>${rows}</tbody></table>
      <p class="wk-note">一天只能在一個地方打一班。中華街的店：大通り 10 點到 19 點；包包子要王老闆在攤子。</p></div>`;
  }
  const register = (job, def) => { JOBS[job] = def; };
  const lines = (add) => { Object.entries(TOWN.WORK.hello || {}).forEach(([id, l]) => add(id, l[0])); Object.values(TOWN.WORK.first || {}).forEach((ls) => ls.forEach((l) => add(l[0], l[1]))); Object.values(JOBS).forEach((j) => j.lines && j.lines(add)); };
  return { N, PLACES, kana, can, start, register, pay, rank, grade, shifts, today, book, shown: () => shifts() > 0, lines, on: () => S, offer, hello, board };
})();
