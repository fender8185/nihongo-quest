'use strict';
// ---------- きっぷ売り場 (2026-11-20, 駅前の打工; docs/superpowers/specs/2026-11-20-ekimae-work-design.md §5) ----------
// 原田's window at みなと駅 (m2): ten people at the glass, one question each — what it costs to a station (いくら), when the next train
// that way goes (何時), which track (何番線), whether the 快速 stops at a station (止まりますか), or tickets (大人 一枚、子ども 一枚).
// The answers are on the wall over the window: みなと線's stations (kanji, their readings over them) with the fares, the departure
// board and the clock — read there, then said: three replies to pick from, each a thing on that wall (the next station's fare, the
// other way's train, the one after). Heard first, as everywhere: the words shown once answered or after two misses (the right reply
// lit then). Tickets: the station tapped on the chart (they print), then the sum said. Patience as at the counter: 20 s from the end
// of the asking; a replay holds it; a miss costs some.
const MADO = (() => {
  const W = () => TOWN.EKI.window, N = 10, SECS = 20, MISS = 0.15;
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  // readings: the hour (7 しちじ, 9 くじ, 14 じゅうよじ), the minutes (ふん／ぷん by the last digit; 10, 20 … じゅっぷん)
  const HK = { 0: 'れいじ', 1: 'いちじ', 2: 'にじ', 3: 'さんじ', 4: 'よじ', 5: 'ごじ', 6: 'ろくじ', 7: 'しちじ', 8: 'はちじ', 9: 'くじ', 10: 'じゅうじ', 11: 'じゅういちじ', 12: 'じゅうにじ', 13: 'じゅうさんじ', 14: 'じゅうよじ', 15: 'じゅうごじ', 16: 'じゅうろくじ', 17: 'じゅうしちじ', 18: 'じゅうはちじ', 19: 'じゅうくじ', 20: 'にじゅうじ', 21: 'にじゅういちじ', 22: 'にじゅうにじ', 23: 'にじゅうさんじ' };
  const ONES = ['', 'いっぷん', 'にふん', 'さんぷん', 'よんぷん', 'ごふん', 'ろっぷん', 'ななふん', 'はっぷん', 'きゅうふん'], TENS = ['', 'じゅう', 'にじゅう', 'さんじゅう', 'よんじゅう', 'ごじゅう'];
  const minKana = (m) => (m % 10 ? TENS[Math.floor(m / 10)] + ONES[m % 10] : TENS[Math.floor(m / 10)].replace(/じゅう$/, 'じゅっぷん'));
  const timeMark = (h, m) => (m ? `{${h}時${m}分|${HK[h]} ${minKana(m)}}` : `{${h}時|${HK[h]}}`);   // the space: read as one, shown in two
  const trackMark = (n) => `{${['', '一', '二', '三'][n]}番線|${['', 'いち', 'に', 'さん'][n]}ばんせん}`;
  const fill = (tpl, o) => tpl.replace(/\{([SsPpTtKk])\}/g, (m, k) => (o[k] !== undefined ? o[k] : m));
  const st = (id) => ({ S: TOWN.EKI.LINE.find((x) => x[0] === id)[1], s: EKI.name(id) });
  const answer = (key, o) => [fill(W().a[key][0], o), fill(W().a[key][1], o)];
  const priceA = (n, sum) => answer(sum ? 'sum' : 'fare', { P: YEN.priceMark(n), p: n });
  // the fares nearest this one (the stations either side on the chart), never it
  const near = (n, k = 2) => [...new Set(EKI.line().filter((x) => x.id !== 'minato').map((x) => EKI.fare('minato', x.id)))].filter((v) => v !== n).sort((a, b) => Math.abs(a - n) - Math.abs(b - n)).slice(0, k);
  // one person's question at h:m, its replies and which is right (the replies shuffled)
  function ask(kind, to, h, m, kid = false) {
    const t = { kind, to, h, m, kid, board: EKI.next(h, m + 1, 4) }; let opts;   // the next ones from the minute after (one going now is going)
    if (kind === 'fare') { const f = EKI.fare('minato', to); t.q = fill2(W().q.fare, to); opts = [priceA(f), ...near(f).map((v) => priceA(v))]; }
    else if (kind === 'next') {
      const rows = EKI.next(h, m + 1, 8), mine = rows.filter((x) => x.to === to), other = rows.find((x) => x.to !== to), at = (x) => answer('next', { T: timeMark(x.h, x.m), t: x.t });
      t.q = fill2(W().q.next, to); opts = [at(mine[0]), at(other), at(mine[1])];
    } else if (kind === 'track') { const k = TOWN.EKI.TRACK[to]; t.q = fill2(W().q.track, to); opts = [k, 3 - k, 3].map((n) => answer('track', { K: trackMark(n), k: n })); }
    else if (kind === 'stop') { const yes = EKI.stops('快速', 'shirasagi').includes(to); t.q = fill2(W().q.stop, to); opts = [answer(yes ? 'yes' : 'no'), answer(yes ? 'no' : 'yes')]; }
    else {   // tickets: one adult, or one adult and a child — the sum; wrong: the child at the adult's fare, the station next to it
      const f = EKI.fare('minato', to), c = EKI.fare('minato', to, true), sum = f + (kid ? c : 0), n2 = near(f, 1)[0];
      t.q = fill2(kid ? W().q.buy2 : W().q.buy, to); t.sum = sum;
      opts = [priceA(sum, kid), ...(kid ? [priceA(2 * f, true), priceA(n2 + EKI.fare('minato', EKI.line().find((x) => EKI.fare('minato', x.id) === n2).id, true), true)] : near(f).map((v) => priceA(v)))];
    }
    const right = opts[0], all = shuffle(opts.filter((o, i) => opts.findIndex((p) => p[0] === o[0]) === i));
    return Object.assign(t, { opts: all, right: all.indexOf(right) });
  }
  function fill2(tpl, to) { const o = st(to); return [fill(tpl[0], o), fill(tpl[1], o)]; }
  // who asks: each question by the same one (the clips stay few); tickets with a child, a parent
  const CUST = ['nakamura', 'nishimura', 'taro', 'misaki', 'sophia', 'alex', 'kaneda', 'umeko', 'rina', 'yoshimoto', 'ken', 'ai', 'michiyama', 'mike'];
  const sayer = (q, kid) => { let x = 7; for (const c of q) x = (x * 31 + c.charCodeAt(0)) | 0; return kid ? ['kenta', 'maria'][Math.abs(x) % 2] : CUST[Math.abs(x) % CUST.length]; };
  const STATIONS = ['shirasagi', 'daigaku', 'koen', 'byoin', 'minatoko'];
  // a shift from h:m: the first two the fares (plain), then every kind; a minute or three between people
  function make(h, m) {
    const kinds = ['fare', 'fare', ...shuffle(['fare', 'next', 'next', 'track', 'stop', 'stop', 'buy', 'buy'])];
    let t = h * 60 + m, last = '';
    return kinds.map((kind) => {
      t += 1 + Math.floor(Math.random() * 3); const H = Math.floor(t / 60) % 24, M = t % 60;
      const to = kind === 'next' || kind === 'track' ? pick(['shirasagi', 'minatoko']) : kind === 'stop' ? pick(['byoin', 'koen', 'daigaku']) : pick(STATIONS);
      let x, tries = 0; do { x = ask(kind, to, H, M, kind === 'buy' && Math.random() < 0.5); x.who = sayer(x.q[0], x.kid); } while (x.who === last && ++tries < 3); last = x.who;
      return x;
    });
  }
  return { N, SECS, MISS, HK, minKana, timeMark, trackMark, ask, make, sayer, CUST, STATIONS };
})();

const MADO_RUN = (() => {
  const MARK = /\{([^|}]+)\|([^|}]+)(?:\|[^}]+)?\}/g, ruby = (s) => esc(s).replace(MARK, '<ruby>$1<rt>$2</rt></ruby>');
  let cur = null, runs = 0;   // the latest run's desk (JOBS.desk): its now() the one at the window, for the tests ({ k, task, phase, printed }); each run reads its own
  // a price, a time, a track as said, in kana alone (2026-11-21, the review: shown as 170円 they were matched to the board's digits, never read)
  const NUMERIC = new Set(['fare', 'next', 'track', 'buy']), kanaOf = (s) => s.replace(MARK, '$2');
  const S = () => TOWN.WORK.say.window;
  // the wall over the window: the route and its fares (みなと: 現在地), a ● where the 快速 stops; the clock; the departure board
  // the chart's names with their readings on the first shift; after it, the kanji alone (the names read, not matched)
  function chart(task, pickable, first) {
    return `<div class="md-chart${pickable ? ' pick' : ''}"><i class="md-rail"></i>${EKI.line().map((x) => x.id === 'minato'
      ? `<div class="md-st here"><b class="md-dot">●</b>${EKI.label(x.id, first)}<em>現在地</em></div>`
      : `<button type="button" class="md-st" data-st="${x.id}"${pickable ? '' : ' tabindex="-1"'}><b class="md-dot${x.rapid ? '' : ' no'}">${x.rapid ? '●' : '○'}</b>${EKI.label(x.id, first || x.read)}<span class="md-f">${EKI.fare('minato', x.id)}</span><small>${EKI.fare('minato', x.id, true)}</small></button>`).join('')}</div>
      <p class="md-key"><span>● 快速も 止まる</span><span>上：大人　下：子ども（円）</span></p>`;
  }
  const clockSvg = (h, m) => { const a = (m / 60) * 360, b = ((h % 12) + m / 60) * 30; return `<svg viewBox="-20 -20 40 40" aria-hidden="true"><circle r="18" fill="#fbf7ec" stroke="#3b3b44" stroke-width="2"/>${Array.from({ length: 12 }, (_, i) => `<path d="M0 -15.5 V${i % 3 ? -13.6 : -12.6}" stroke="#3b2a1c" stroke-width="${i % 3 ? 0.8 : 1.4}" transform="rotate(${i * 30})"/>`).join('')}<path d="M0 0 V-9" stroke="#2b1c12" stroke-width="2.4" stroke-linecap="round" transform="rotate(${b})"/><path d="M0 2 V-14" stroke="#2b1c12" stroke-width="1.4" stroke-linecap="round" transform="rotate(${a})"/><circle r="1.6" fill="#c8453a"/></svg>`; };
  const board = (task) => `<div class="md-clock">${clockSvg(task.h, task.m)}<b>${task.h}:${String(task.m).padStart(2, '0')}</b></div><div class="md-board">${task.board.map((x, i) => `<p><span>${i ? '' : '先発'}</span><b>${x.t}</b><i class="${x.kind === '快速' ? 'r' : ''}">${x.kind}</i><span lang="ja">${esc(EKI.name(x.to))}</span><em>${x.track}</em></p>`).join('')}</div>`;
  function run(ctx) {
    const mine = ++runs, s = S(), now = TOWNEV.now(), tasks = MADO.make(Math.floor(now), Math.floor((now % 1) * 60)), first = !Object.values(state.work.res).some((r) => r.place === 'window' && r.yen !== undefined);
    // this run's own card (box, once drawn; 2026-11-24, ruling 22): an ended shift's goodbye still being said never touches the next card
    let box = null, D = null; const el = (q) => (box && box.isConnected ? box.querySelector(q) : null);   // its own desk (D: never another run's)
    // 原田 and the hero share the line under the answers (whoever spoke last), the card one screen on a phone (2026-11-22, the user)
    const talk = (who) => { const t = el('.md-talk'); if (t) t.dataset.who = who; };
    const word = ([ja, zh], cls = '') => { talk('drv'); const p = el('.wk-say'); if (p) { p.innerHTML = `<b lang="ja">${ruby(ja)}</b><span>${esc(zh)}</span>`; p.className = 'wk-say' + (cls ? ' ' + cls : ''); } return speakAs(s.who, ja); };
    const me = ([ja, zh]) => { talk('me'); const p = el('.wk-me'); if (p) p.innerHTML = `<b lang="ja">${ruby(ja)}</b>${first ? `<span>${esc(zh)}</span>` : ''}`; return speakAs('hero', ja); };
    const said = JOBS.whole;   // each line to its end within the lane's cap (Task 7's fix round, I-1)
    function bub(open) {
      const R = D.now(), b = el('.wk-bub'); if (!b || !R) return; const t = R.task;
      b.innerHTML = `<button type="button" class="wk-ear md-ear" aria-label="再聽一次">${icon('speaker')}</button>${open ? `<b lang="ja">${ruby(t.q[0])}</b><span>${esc(t.q[1])}</span>` : '<b class="bt-dots">……</b>'}`;
      b.classList.toggle('wk-open', Boolean(open));   // open: a pop-up goes under it, never over the question (N-4)
    }
    // the replies once there is something to say (a ticket: once printed — till then, the tip to tap the station); the Japanese only, the
    // first shift too (2026-11-22, the user: 「16:10。」 under it, the digits read off)
    function opts(on) {
      const o = el('.md-opts'), R = D.now(); if (!o || !R) return; const t = R.task;
      o.innerHTML = on && R.printed ? t.opts.map(([ja], i) => `<button type="button" class="btn md-opt" data-o="${i}" lang="ja"><span>${NUMERIC.has(t.kind) ? esc(kanaOf(ja)) : ruby(ja)}</span></button>`).join('') : on && t.kind === 'buy' ? '<p class="md-tip">先在上面的路線圖點客人要去的站，印出車票。</p>' : '';
    }
    // the tickets: the station tapped prints them (大人 1, 子ども 1), then the sum to say
    function print(to) {
      const R = D.now(), t = R.task; R.printed = true; SND.play('paper', { vol: 0.6 });
      el('.md-ticket').innerHTML = [1, t.kid ? 2 : 0].filter(Boolean).map((n) => `<div class="md-tk"><span lang="ja">みなと → ${EKI.ruby(to)}</span><b>${EKI.fare('minato', to, n === 2)}円</b><small>${n === 2 ? '小' : '大人'}</small></div>`).join('');
      el('.md-wall .md-chart').classList.remove('pick'); opts(true);
    }
    // the desk's flow (ruling 28: JOBS.desk, as the 案内所's and the フロント's): the question heard first, three replies off the wall —
    // the right one said, their thanks, now and then 原田's word; a wrong one (or the wrong station): his word, its cost after it; two and
    // the question shown, the right reply lit (and, before the tickets print, the station); the customer dimmed once served
    D = cur = JOBS.desk({ job: 'window', ctx, N: MADO.N, box: () => box, alive: '.md-glass', mine: () => mine === runs, tasks,
      isRight: (t, i) => i === t.right, secs: () => MADO.SECS, cost: MADO.MISS, hi: () => s.me.hi, fresh: (t) => ({ printed: t.kind !== 'buy' }),
      me, word, bub, opts, optSel: '.md-opt', earSel: '.md-ear', rightCls: 'md-right', dim: true,
      draw: (t) => { el('.md-wall').innerHTML = `${chart(t, t.kind === 'buy', first)}<div class="md-row">${board(t)}</div>`; el('.md-ticket').innerHTML = ''; },
      miss: () => s.miss,
      hint: (t, R, out) => { if (!out && !R.printed) { const st = el(`.md-st[data-st="${t.to}"]`); if (st) st.classList.add('wk-hint'); } },
      tap: (e, R) => { const st = e.target.closest('.md-st[data-st]'); if (!st || R.printed) return false; if (st.dataset.st === R.task.to) print(R.task.to); else D.miss(st, s.miss); return true; },
      served: async (t, R, lv) => { await said(speakAs(t.who, s.cust.thanks[0]), 600); if (!lv()) return;
        el('.wk-cust').classList.add('bye'); if (!R.miss && Math.random() < 0.3) await said(word(s.ok[Math.floor(Math.random() * s.ok.length)], 'ok')); },
      end: s.end, all: s.all });
    CLASS.card('wk-window', '售票窗口', `<button type="button" class="cls-x" data-cls="x" aria-label="關閉">✕</button>
      <div class="wk-head"><b lang="ja">きっぷうりば</b><span class="wk-n"></span></div>
      <div class="md-wall"></div>
      <div class="md-glass"><i class="md-hole" aria-hidden="true"></i><div class="wk-cust"></div><div class="md-ticket"></div></div>
      <div class="md-opts"></div><div class="md-talk" data-who="drv"><span class="kr-face">${TOWNEV.face(s.who)}</span><p class="wk-say"></p><p class="wk-me"></p></div>`, (e) => D.click(e));
    box = document.querySelector('.cls.wk-window');
    D.start();
  }
  function lines(add) {
    const s = S(), seen = new Set();
    // every question each could ask, and every answer the hero could give — at each minute the timetable has
    ['fare', 'track', 'stop', 'buy', 'buy2'].forEach((kind) => MADO.STATIONS.forEach((to) => { if (kind === 'stop' && !['byoin', 'koen', 'daigaku'].includes(to)) return; if (kind === 'track' && !['shirasagi', 'minatoko'].includes(to)) return;
      const t = MADO.ask(kind === 'buy2' ? 'buy' : kind, to, 10, 0, kind === 'buy2'); add(MADO.sayer(t.q[0], t.kid), t.q[0]); t.opts.forEach((o) => { if (!seen.has(o[0])) { seen.add(o[0]); add('hero', o[0]); } }); }));
    ['shirasagi', 'minatoko'].forEach((to) => { const t = MADO.ask('next', to, 10, 0); add(MADO.sayer(t.q[0]), t.q[0]); });
    for (let h = TOWN.EKI.FIRST; h <= TOWN.EKI.LAST; h++) TOWN.EKI.TIMES.forEach(([m]) => add('hero', `${MADO.timeMark(h, m)}です。`));
    const X = TOWN.WORK.say.waiter.cust; MADO.CUST.concat(['kenta', 'maria']).forEach((id) => [s.cust.thanks, X.again, X.hey, X.out, X.out0].forEach((l) => add(id, l[0])));   // their thanks; kept waiting (JOBS.patience)
    add('hero', s.me.hi[0]); [s.miss, s.end, s.all, ...s.ok].forEach((l) => add(s.who, l[0]));
  }
  return { run, lines, now: () => (cur ? cur.now() : null) };
})();
WORK.register('window', { run: MADO_RUN.run, lines: MADO_RUN.lines });
