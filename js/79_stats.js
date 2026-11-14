'use strict';
/* ==========================================================================
   Learning analysis: pace, past week, weak points, question types, leeches
   ========================================================================== */
const FMT_NAME = {
  'v-meaning': '單字・看字選意思', 'v-recall': '單字・中翻日', 'v-pic': '單字・看圖選字', 'v-cloze': '單字・例句填空', 'v-reading': '單字・漢字讀音', 'v-kanji': '單字・漢字寫法',
  'v-listen': '單字・聽音選意思', 'v-spell': '單字・假名拼字', 'v-match': '單字・配對', 'v-sentence': '自訂句子', 'g-choice': '文法・填空', 'g-meaning': '文法・句意／用法', 'g-zh': '文法・句意拼貼', 'g-order': '文法・排序',
  'g-correct': '文法・選正確句', 'g-conj': '文法・動詞變化', 'g-adj': '文法・形容詞變化', 'g-identify': '文法・判斷動詞形', 'g-conj-type': '文法・動詞變化（拼寫）', 'g-adj-type': '文法・形容詞變化（拼寫）',   // g-correct (1.0.23), v-sentence (custom cards, 1.0.34): no longer asked, named for the answers given before
  'k-meaning': '漢字・意思', 'k-shape': '漢字・選字', 'k-read': '漢字・讀音', 'l-dialog': '聽力・對話', 'l-resp': '聽力・即時應答',
  'l-scene': '聽力・情境表達', 'r-passage': '閱讀', 'm-card': '錯題卡', 'a-read': '假名・看字選音', 'a-sound': '假名・聽音選字', 'a-pair': '假名・平片對照', 'a-word': '假名・讀讀看'
};
const KIND_NAME = { v: '單字', g: '文法', k: '漢字', a: '假名', l: '聽力', r: '閱讀' };
function lvLabel(lv) { return lv === 'PRE_N5' ? '入門' : lv; }

// the past week's practice, from the daily logs: 單字（含漢字）／文法／其他（聽力、閱讀、模擬考）
function weekPractice(days = 7) {
  const t = todayStr();
  return Array.from({ length: days }, (_, i) => {
    const date = addDays(t, i - (days - 1)); const e = state.dailyLogs[date] || {};
    const v = e.vocabCount || 0, g = e.grammarCount || 0, q = (e.quizCount || 0) + (e.bonusCount || 0);
    return { date, v, g, q, total: v + g + q };
  });
}
// 過去 7 天 (1.0.26): the week's total, its daily average and the change from the week before (null when that week has
// nothing), with the kinds added up
function weekSummary() {
  const days = weekPractice(7);
  const total = days.reduce((a, d) => a + d.total, 0);
  const prev = weekPractice(14).slice(0, 7).reduce((a, d) => a + d.total, 0);
  const share = { v: 0, g: 0, q: 0 };
  days.forEach(d => { share.v += d.v; share.g += d.g; share.q += d.q; });
  return { days, total, avg: Math.round(total / 7), change: prev ? Math.round((total - prev) / prev * 100) : null, share };
}
// three numbers, a trend line with one dot a day (a day off on the floor, today in the accent) and the share of each kind
function weekCardHtml(s) {
  const last = s.days.length - 1;
  const max = Math.max(1, ...s.days.map(d => d.total));
  const x = (i) => (i * 280 / last).toFixed(1), y = (n) => (55 - n / max * 50).toFixed(1);
  const pts = s.days.map((d, i) => `${x(i)},${y(d.total)}`).join(' ');
  const wd = (d) => '日一二三四五六'[parseDate(d.date).getDay()];
  const day = (d, i) => (i === last ? '今天' : `${d.date.slice(5).replace('-', '/')}（${wd(d)}）`);
  const dots = s.days.map((d, i) => `<circle class="week-dot${i === last ? ' today' : ''}" cx="${x(i)}" cy="${y(d.total)}" r="${i === last ? 4.5 : 3}" tabindex="0" data-tip-title="${esc(day(d, i))}：${d.total ? `${d.total} 題` : '沒有練習'}" data-tip-body="${d.total ? `單字 ${d.v}・文法 ${d.g}・其他 ${d.q}` : ''}"></circle>`).join('');
  const change = s.change === null ? '—' : s.change > 0 ? `+${s.change}%` : s.change < 0 ? `−${-s.change}%` : '0%';
  const stat = (v, l, up) => `<div class="week-stat"><div class="week-stat-v${up ? ' up' : ''}">${v}</div><div class="week-stat-l">${l}</div></div>`;
  const pct = (n) => Math.round(n / s.total * 100);
  const share = s.total ? `<div class="week-share">${['v', 'g', 'q'].map(k => `<div class="cseg ${k}" style="flex-grow:${s.share[k]}"></div>`).join('')}</div>
      <div class="week-share-l small muted"><i class="seg-dot v"></i>單字 ${pct(s.share.v)}%・<i class="seg-dot g"></i>文法 ${pct(s.share.g)}%・<i class="seg-dot q"></i>其他 ${pct(s.share.q)}%</div>`
    : '<div class="week-empty small muted">這 7 天還沒有練習</div>';
  const table = `<table class="table"><thead><tr><th>日期</th><th>單字</th><th>文法</th><th>其他</th><th>合計</th></tr></thead><tbody>${s.days.map((d, i) => `<tr><td class="num">${i === last ? '今天' : d.date}</td><td class="num">${d.v}</td><td class="num">${d.g}</td><td class="num">${d.q}</td><td class="num">${d.total}</td></tr>`).join('')}</tbody></table>`;
  return `<div class="card" id="weekCard">
      <div class="card-head"><div><div class="card-title">過去 7 天的練習量</div></div></div>
      <div class="week-stats">${stat(s.total, '7 天合計（題）')}${stat(s.avg, '每天平均（題）')}${stat(change, '比前 7 天', s.change > 0)}</div>
      <svg class="week-line" viewBox="-6 -4 292 68" role="img" aria-label="過去 7 天每天作答的題數"><polygon class="week-area" points="${pts} 280,60 0,60"></polygon><polyline points="${pts}"></polyline>${dots}</svg>
      <div class="week-axis">${s.days.map((d, i) => `<span${i === last ? ' class="today"' : ''}>${i === last ? '今天' : wd(d)}</span>`).join('')}</div>
      ${share}
      <details class="disclose mt-3"><summary>明細</summary><div class="table-wrap mt-2">${table}</div></details>
    </div>`;
}
// an item's level for the 學習分析 scopes (1.0.26): 入門 is kana, PRE_N5 words and 第 0 週 grammar; grammar of no course unit
// (an AI item of an unknown unit) has none and counts only in 總進度
const UNIT_LV = new Map();
function itemLevel(it) {
  if (it.kind === 'a') return 'PRE_N5';
  if (it.kind !== 'g') return it.lv || courseLevels()[0];
  if (it.u === 'm0') return 'PRE_N5';
  if (!UNIT_LV.size) DATA.UNITS.forEach(u => UNIT_LV.set(u.id, u.lv));
  return UNIT_LV.get(it.u) || null;
}
const scopeId = (L) => (L === 'PRE_N5' ? 'pre' : L.toLowerCase());   // 學習分析's scope ids: pre, n5, n4, n3 …
function statsScopes() { return [['all', '總進度']].concat(levels().map(L => [scopeId(L), lvLabel(L)])); }
let statsScope = 'all';   // the 總進度 card's scope: kept while the app is open, 總進度 again after a reload
// overall progress of a bank in three mastery steps (counts) plus a weighted score: 已學 1・熟悉 2・熟練 3 points out of 3 per item.
// kind: v 單字, g 文法, lr 聽力＋閱讀, k 漢字, a 假名; scope: all or one level (scopeId). Grammar steps by right answers (3 熟練),
// listening and reading too (2 熟練: a right answer waits a month before the next), the rest by stars.
function progressTotals(kind, scope = 'all') {
  const t = { kind, total: 0, seen: 0, learned: 0, mastered: 0, marks: [] };   // marks: [level, items up to it, next level], faint ticks on the gauge (總進度 only, none for kana)
  const per = {};
  const pool = { v: REG.vocab, g: REG.grammar, lr: REG.listen.concat(REG.read), k: REG.kanji, a: REG.kana }[kind];
  const lv = levels().find(L => scopeId(L) === scope);
  const top = kind === 'g' ? 3 : kind === 'lr' ? 2 : 0;
  pool.forEach(x => {
    const xl = itemLevel(x);
    if (lv && xl !== lv) return;
    t.total++;
    if (!lv && kind !== 'a' && xl) per[courseLevel(xl)] = (per[courseLevel(xl)] || 0) + 1;
    const r = state.srs[x.key]; if (!r) return;
    const ok = r.ok || 0;
    if (top ? ok >= top : srsLevelLabel(r, x.key) === '已熟練') t.mastered++;
    else if (top ? ok >= 1 : r.b >= SRS_LEARNED) t.learned++;
    else t.seen++;
  });
  if (!lv && kind !== 'a') { const cl = courseLevels(); let acc = 0; cl.slice(0, -1).forEach((L, i) => { acc += per[L] || 0; t.marks.push([L, acc, cl[i + 1]]); }); }
  t.pct = t.total ? Math.round((t.seen + t.learned * 2 + t.mastered * 3) / (t.total * 3) * 100) : 0;
  return t;
}
// the three steps of every bank, named once in the 總進度 card's head (1.0.27): [arc class, legend dot class, name]
const GAUGE_STEPS = [['mastered', 'mastered', '已熟練'], ['learned', 'learned', '熟悉'], ['seen', 'gseen', '已學']];
// half-circle gauge: three arcs (dark = mastered on the left, lighter steps to the right) over a track, needle at the weighted score,
// the bank's name under the %. The counts are in the marks' tips (未學 on the track's), not written out (1.0.27)
function gaugeHtml(t, title) {
  const R = 80, C = 100, W = 20;
  const pt = (f) => { const a = Math.PI * (1 - f); return [C + R * Math.cos(a), C - R * Math.sin(a)]; };
  const arc = (f0, f1) => { const [x0, y0] = pt(f0); const [x1, y1] = pt(f1); return `M ${x0.toFixed(2)} ${y0.toFixed(2)} A ${R} ${R} 0 0 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`; };
  const gap = 2 / (Math.PI * R);   // a 2px surface gap between segments
  const segs = GAUGE_STEPS.map(([cls, , label]) => [cls, t[cls], label]);   // an arc's class names its count in t
  let f = 0, end = 0; const paths = [];
  segs.forEach(([cls, n, label]) => {
    if (!n || !t.total) return;
    const f0 = f, f1 = f + n / t.total; f = f1;
    const a0 = f0 > 0 ? f0 + gap / 2 : f0; let a1 = f1 < 1 ? f1 - gap / 2 : f1;
    if (a1 - a0 < gap) a1 = Math.min(1, a0 + gap);   // a tiny count still shows as a sliver
    end = Math.max(end, a1);
    paths.push(`<path class="arc ${cls}" d="${arc(a0, a1)}" stroke-width="${W}" tabindex="0" data-tip-title="${esc(label)}：${n}" data-tip-body="占 ${Math.round(n / t.total * 100)}%"></path>`);
  });
  // faint ticks where each level's items end, with the level names on either side just outside the ring
  const lab = (ang, txt) => `<text class="tick-l" x="${(C + (R + W / 2 + 9) * Math.cos(ang)).toFixed(1)}" y="${(C - (R + W / 2 + 9) * Math.sin(ang) + 3).toFixed(1)}" text-anchor="middle">${txt}</text>`;
  const tick = (t.marks || []).filter(([, n]) => t.total && n > 0 && n < t.total).map(([L, n, next], i) => { const tf = n / t.total; const a = Math.PI * (1 - tf); const rr = (r2) => [C + r2 * Math.cos(a), C - r2 * Math.sin(a)];
    const [x0, y0] = rr(R - W / 2 - 3), [x1, y1] = rr(R + W / 2 + 3); const off = 0.09; const al = Math.PI * (1 - tf + off), ar = Math.PI * (1 - tf - off);
    return `<line class="tick" data-f="${tf.toFixed(4)}" x1="${x0.toFixed(2)}" y1="${y0.toFixed(2)}" x2="${x1.toFixed(2)}" y2="${y1.toFixed(2)}"></line>${i === 0 ? lab(al, L) : ''}${lab(ar, next)}`; }).join('');
  const [nx, ny] = (() => { const a = Math.PI * (1 - t.pct / 100); return [C + (R - W / 2 - 4) * Math.cos(a), C - (R - W / 2 - 4) * Math.sin(a)]; })();   // ends just inside the ring
  const left = t.total - t.seen - t.learned - t.mastered;
  const trackTip = left > 0 ? ` tabindex="0" data-tip-title="未學：${left}" data-tip-body="共 ${t.total}"` : '';
  // played (playAnims), a mask sweeps the arcs in from the left while the needle turns to its spot (1.0.41)
  const mid = `gm-${t.kind}`;
  const arcs = end ? `<mask id="${mid}" maskUnits="userSpaceOnUse" x="-6" y="0" width="212" height="152"><path class="sweep" d="${arc(0, Math.min(1, end + 0.01))}" stroke="#fff" stroke-width="${W + 4}" fill="none" pathLength="1"></path></mask><g mask="url(#${mid})">${paths.join('')}</g>` : '';
  return `<div class="gauge" data-anim style="--t:${(0.3 + 0.5 * end).toFixed(2)}s;--a:${(-1.8 * t.pct).toFixed(1)}deg" data-kind="${t.kind}" data-total="${t.total}" data-seen="${t.seen}" data-learned="${t.learned}" data-mastered="${t.mastered}" data-pct="${t.pct}">
    <svg viewBox="-6 0 212 152" role="img" aria-label="${esc(title)}總進度 ${t.pct}%：${segs.map(([, n, label]) => `${label} ${n}`).join('、')}，共 ${t.total}">
      <path class="track" d="${arc(0, 1)}" stroke-width="${W}"${trackTip}></path>${arcs}${tick}
      <line class="needle" x1="${C}" y1="${C}" x2="${nx.toFixed(2)}" y2="${ny.toFixed(2)}"></line><circle class="pivot" cx="${C}" cy="${C}" r="4"></circle>
      <text class="hero" x="${C}" y="${C + 32}" text-anchor="middle">${t.pct}%</text><text class="hero-l" x="${C}" y="${C + 48}" text-anchor="middle">${esc(title)}</text>
    </svg></div>`;
}
// 課程進度 (1.0.26): when the 入門+N5 part and the whole course (N4) would each be learned once, at the recent pace of new
// items (dailyLogs.fresh over the last 14 days from the first that has it; none, or none new lately: today's new count,
// `fallback`). 每一級封死 (1.0.32): new items come one level at a time, so 入門+N5 is learned once after its own leftovers and
// the whole course after N5's plus N4's.
// While in 入門 its kana, words and 第 0 週 come first. state: passed | close (under three weeks) | done (the target level
// all learned) | ok | late (with what a day it takes and how many 加練 rounds that is)
function coursePace() {
  const t = todayStr();
  let days = 0; let sum = 0;
  for (let i = 14; i >= 1; i--) {
    const e = state.dailyLogs[addDays(t, -i)]; const has = Boolean(e) && typeof e.fresh === 'number';
    if (has || days) { days++; sum += has ? e.fresh : 0; }
  }
  const round = dailyPlan().n || NEW_DEFAULT;   // one 加練 round: as many new items as the day's own
  const fallback = !(days && sum > 0);
  const perDay = fallback ? round : sum / days;
  const unseen = (x) => !state.srs[x.key];
  const inPre = inPreStage();
  const pre = inPre ? REG.kana.filter(unseen).length + preWordsLeft() + introLeft() : 0;
  // each level's leftovers as 每一級封死 offers them (levelLeft: units marked complete are done), added up level after level
  const cl = courseLevels(); const work = {}; let acc = pre;
  cl.forEach((L, i) => { const x = levelLeft(L); acc += x.v + x.g + x.k - (inPre && i === 0 ? preWordsLeft() : 0); work[L] = acc; });
  const level = cl.includes(state.settings.examLevel) ? state.settings.examLevel : cl[cl.length - 1];
  const ep = examPace(); const deadline = addDays(ep.exam, -21); const toDeadline = daysBetween(t, deadline);
  const p = { perDay, fallback, round, level, exam: ep.exam, daysLeft: ep.daysLeft, deadline, left: Object.assign({}, work), days: {}, finish: {} };
  cl.forEach(L => { p.days[L] = Math.ceil(work[L] / perDay); p.finish[L] = addDays(t, p.days[L]); });
  if (ep.daysLeft <= 0) p.state = 'passed';
  else if (toDeadline <= 0) p.state = 'close';
  else if (!work[level]) p.state = 'done';
  else if (p.days[level] <= toDeadline) p.state = 'ok';
  else {
    p.state = 'late'; p.late = p.days[level] - toDeadline;
    p.need = Math.ceil(work[level] / toDeadline); p.gap = p.need - perDay;
    const every = Math.max(1, Math.floor(round / p.gap));
    p.plan = p.gap > round ? { times: Math.ceil(p.gap / round) } : every >= toDeadline ? { once: true } : { every };   // once: one round before the deadline covers it
    if (p.plan.times >= 3) p.plan.heavy = true;
  }
  return p;
}
// what it takes when late: new items a day, as 加練 rounds (every few days, or a few a day; three or more a day is too much)
function courseAdvice(p) {
  if (p.state !== 'late') return '';
  const { every, times, heavy, once } = p.plan;
  if (heavy) return `要每天多學 ${times} 組才趕得上，太吃力了：可以${courseLevels().indexOf(p.level) > 0 ? `先考 ${courseLevels()[courseLevels().indexOf(p.level) - 1]}，或` : ''}把考試延到下一次（JLPT 每年 7 月、12 月）。`;
  if (times) return `每天做完練習再多學 ${times} 組就趕得上。`;
  if (once) return `${p.deadline.replace(/-/g, '/')} 前找一天多學一組就趕得上。`;
  return `${every === 1 ? '每天' : `大約每 ${every} 天`}多學一組就趕得上。`;
}
// the 課程進度 line, shared by 學習分析 and the exam countdown
function courseText(p) {
  const sl = (d) => d.replace(/-/g, '/');
  if (p.state === 'passed') return '考試日期過了，到設定改成下一次的日期。';
  if (p.state === 'close') return `離考試只剩 ${p.daysLeft} 天：每天的練習加上模擬考就好。`;
  const nxt = courseLevels()[courseLevels().indexOf(p.level) + 1];   // the level after the target, if any
  if (p.state === 'done') return `${p.level} 都學過一次了，接下來照複習走，考前三週做模擬考。${nxt && p.left[nxt] > p.left[p.level] ? `照現在的速度，${sl(p.finish[nxt])} 學完 ${nxt}。` : ''}`;
  const diff = daysBetween(p.finish[p.level], p.deadline);
  const when = diff > 0 ? `比期限（考前三週）早 ${diff} 天` : diff < 0 ? `比期限（考前三週）晚 ${-diff} 天` : '剛好在期限（考前三週）';
  return `照現在每天的份量，${sl(p.finish[p.level])} 學完 ${p.level}，${when}。${courseAdvice(p)}`;
}
function weakPoints(limit = 8) {
  const agg = {};
  REG.grammar.forEach(g => {
    const r = state.srs[g.key];
    if (!r || !g.pt) return;
    const a = agg[g.pt] || (agg[g.pt] = { pt: g.pt, ok: 0, ng: 0, items: [], unit: g.u });
    a.ok += r.ok || 0; a.ng += r.ng || 0; a.items.push(g);
  });
  return Object.values(agg).filter(a => a.ok + a.ng >= 4).map(a => Object.assign(a, { acc: a.ok / (a.ok + a.ng) }))
    .filter(a => a.acc < 0.9).sort((a, b) => a.acc - b.acc || (b.ng - a.ng)).slice(0, limit);
}
function itemLabel(it) {
  if (it.kind === 'v') return `${jaPlain(it.w)}${it.r && it.r !== it.w ? `（${it.r}）` : ''}　${it.m}`;
  if (it.kind === 'k') return `${it.k}　${it.m}`;
  if (it.kind === 'g') return jaPlain(itemPreview(it));
  if (it.kind === 'l') return it.line || it.q || it.scene || '';
  if (it.kind === 'r') return it.q || '';
  return it.key;
}
const pctText = (x) => `${Math.round(x * 100)}%`;

function renderStats(view) {
  const acc = recentAccuracy(RECENT_MAX);
  const t = todayStr();
  let total14 = 0;
  for (let d = 0; d < 14; d++) total14 += dayTotal(state.dailyLogs[addDays(t, -d)]);
  const learned = {};
  Object.entries(state.srs).forEach(([k, r]) => { if (r.b >= SRS_LEARNED) learned[k[0]] = (learned[k[0]] || 0) + 1; });
  const gauges = statsScope === 'pre' ? [['a', '假名'], ['v', '入門單字'], ['g', '入門文法']] : [['v', '單字'], ['g', '文法'], ['lr', '聽力＋閱讀'], ['k', '漢字']];
  const progressCard = `<div class="card" id="progressCard">
      <div class="card-head"><div><div class="card-title">總進度</div><div class="card-sub legs mt-1">${GAUGE_STEPS.map(([, dot, name]) => `<span class="leg"><i class="seg-dot ${dot}"></i>${name}</span>`).join('')}</div></div></div>
      <div class="seg mb-3" role="group" aria-label="總進度的範圍">${statsScopes().map(([k, l]) => `<button type="button" aria-pressed="${statsScope === k}" data-act="stats-scope" data-scope="${k}">${l}</button>`).join('')}</div>
      <div class="gauges">${gauges.map(([k, title]) => gaugeHtml(progressTotals(k, statsScope), title)).join('')}</div>
    </div>`;

  const weak = weakPoints();
  const weakRows = weak.map(a => `<div class="barrow">
      <div class="small"><div>${esc(a.pt)}</div><div class="tiny muted">${esc(unitById(a.unit).short)}</div></div>
      <div class="track" tabindex="0" data-tip-title="${esc(a.pt)}：${pctText(a.acc)}" data-tip-body="答對 ${a.ok}・答錯 ${a.ng}"><div class="fill" style="width:${Math.round(a.acc * 100)}%"></div></div>
      <div class="row" style="gap:6px"><span class="val">${pctText(a.acc)}・${a.ok + a.ng} 次</span><button type="button" class="btn btn-sm" data-act="stats-drill" data-pt="${esc(a.pt)}">練習</button></div>
    </div>`).join('');

  const fmts = Object.entries(state.statsFmt || {}).map(([f, v]) => ({ f, n: v.ok + v.ng, acc: v.ok / Math.max(1, v.ok + v.ng) })).filter(x => x.n >= 5).sort((a, b) => a.acc - b.acc);
  const fmtRows = fmts.map(x => `<div class="barrow">
      <div class="small">${esc(FMT_NAME[x.f] || x.f)}</div>
      <div class="track" tabindex="0" data-tip-title="${esc(FMT_NAME[x.f] || x.f)}：${pctText(x.acc)}" data-tip-body="共作答 ${x.n} 次"><div class="fill" style="width:${Math.round(x.acc * 100)}%"></div></div>
      <span class="val">${pctText(x.acc)}・${x.n} 次</span>
    </div>`).join('');


  view.innerHTML = `
    ${corkStripHtml()}
    <div class="page-head"><div><div class="page-title">學習分析</div></div></div>
    ${todayCardHtml()}
    ${progressCard}
    ${weekCardHtml(weekSummary())}
    <div class="grid grid-4">
      <div class="card"><div class="stat"><span class="stat-v">${acc === null ? '—' : pctText(acc)}</span><span class="stat-l">最近 ${RECENT_MAX} 題正確率</span></div></div>
      <div class="card"><div class="stat"><span class="stat-v">${(total14 / 14).toFixed(1)}</span><span class="stat-l">近 14 天平均每天題數</span></div></div>
      <div class="card"><div class="stat"><span class="stat-v">${(learned.v || 0) + (learned.g || 0) + (learned.k || 0) + (learned.a || 0)}</span><span class="stat-l">已熟悉（單字 ${learned.v || 0}・文法 ${learned.g || 0}・漢字 ${learned.k || 0}・假名 ${learned.a || 0}）</span></div></div>
      <div class="card"><div class="stat"><span class="stat-v">${REG.grammar.filter(g => !state.srs[g.key]).length}</span><span class="stat-l">還沒學的文法題</span></div></div>
    </div>
    ${historyCardHtml()}
    ${courseCardHtml()}
    <div class="grid grid-2">
      <div class="card">
        <div class="card-head"><div><div class="card-title">最弱的文法考點</div></div></div>
        ${weakRows || '<div class="empty">還沒有足夠的資料。</div>'}
      </div>
      <div class="card">
        <div class="card-head"><div><div class="card-title">各題型正確率</div></div></div>
        ${fmtRows || '<div class="empty">還沒有足夠的資料。</div>'}
      </div>
    </div>
    <section class="tools-part" id="toolsPart">${toolsHtml()}</section>`;
  attachChartTips(view);
}

// the 課程進度 state as a chip, on 學習分析 and the exam countdown
function courseChip(p) {
  return p.state === 'ok' ? '<span class="chip chip-ok">趕得上</span>' : p.state === 'late' ? '<span class="chip chip-warn">稍慢</span>' : p.state === 'done' ? '<span class="chip chip-ok">學完了</span>' : '';
}
// 課程進度 (1.0.26, 學完的預估 merged in): the target, a timeline from today to the exam with the days N5 and N4 would be
// learned once, a line for each level, what to do when it is late, and how much of each bank was learned. The timeline runs
// to the exam or the last of the dates, at most twice as far as the exam: a date beyond sits at the end with an arrow.
function courseCardHtml() {
  const p = coursePace(); const t = todayStr(); const sl = (d) => d.replace(/-/g, '/');
  const ahead = p.state === 'ok' || p.state === 'late' || p.state === 'done';
  const sub = `目標 ${p.level}・考試 ${sl(p.exam)}`;
  const tone = (L) => (L !== p.level ? 'other' : p.state === 'late' ? 'late' : 'target');
  let line = ''; let rows = '';
  if (ahead) {
    // the levels up to the target, or up to the one being learned when that is past it (1.0.33: N3 after an N4 target)
    const cl = courseLevels(); const shown = cl.slice(0, Math.max(cl.indexOf(p.level), cl.indexOf(curLevel())) + 1);
    const lv = shown.filter(L => p.left[L] > 0);   // a level learned already has no dot
    const examD = daysBetween(t, p.exam);
    const max = Math.max(1, Math.min(Math.max(examD, ...lv.map(L => p.days[L])), examD * 2));
    const X = (d) => 8 + 384 * Math.min(d, max) / max;
    const dots = lv.map(L => `<circle class="course-dot ${tone(L)}" data-level="${L}" cx="${X(p.days[L]).toFixed(1)}" cy="28" r="5"></circle>`).join('');
    // labels: about 1em a CJK character (and 、・→), 0.6em the rest; each centred on its point but kept inside the box. Dates
    // that would touch share one label; a mark's label that would touch 「今天」 or the other mark's drops a row, or they share one
    const width = (str, size) => [...str].reduce((w, ch) => w + (ch.charCodeAt(0) >= 0x2000 ? size : size * 0.6), 0);
    const place = (x, text, size) => { const w = width(text, size); const c = clamp(x, 2 + w / 2, 398 - w / 2); return { c, a: c - w / 2, b: c + w / 2, text }; };
    const touch = (m, n) => m.a < n.b + 6 && n.a < m.b + 6;
    const tag = (L) => `${L} ${sl(p.finish[L]).slice(5)}`;
    const near = lv.filter(L => p.days[L] <= max); const far = lv.filter(L => p.days[L] > max);
    const top = near.map(L => ({ x: X(p.days[L]), text: tag(L), cls: tone(L) }));
    if (far.length) top.push({ x: 392, text: `${far.join('、')} →`, cls: far.includes(p.level) ? tone(p.level) : 'other' });
    for (let i = 0; i + 1 < top.length;) {   // neighbours that would touch share one label, again until none touch (three levels)
      if (!touch(place(top[i].x, top[i].text, 12), place(top[i + 1].x, top[i + 1].text, 12))) { i++; continue; }
      top.splice(i, 2, { x: (top[i].x + top[i + 1].x) / 2, text: `${top[i].text}・${top[i + 1].text}`, cls: '' }); i = Math.max(0, i - 1);
    }
    const labels = top.map(l => `<text class="lvl ${l.cls}" x="${place(l.x, l.text, 12).c.toFixed(1)}" y="14" text-anchor="middle">${l.text}</text>`).join('');
    const today = { a: 4, b: 4 + width('今天', 11) };
    const dl = place(X(daysBetween(t, p.deadline)), `${sl(p.deadline).slice(5)} 期限`, 11), ex = place(X(examD), `${sl(p.exam).slice(5)} 考試`, 11);
    const dlRow = touch(dl, today) ? 68 : 52;
    const exRow = dlRow === 68 && touch(ex, dl) ? (touch(ex, today) ? 0 : 52) : 68;   // 0: no room of its own, it joins the deadline's
    const txt = (q, y) => `<text x="${q.c.toFixed(1)}" y="${y}" text-anchor="middle">${q.text}</text>`;
    const below = exRow ? txt(dl, dlRow) + txt(ex, exRow) : txt(place((dl.c + ex.c) / 2, `${dl.text}・${ex.text}`, 11), dlRow);
    const mark = (d, cls) => { const x = X(d).toFixed(1); return `<line class="mark ${cls}" x1="${x}" y1="20" x2="${x}" y2="36"></line>`; };
    line = `<svg class="course-line" viewBox="0 0 400 76" role="img" aria-label="從今天到考試的時間軸">
        <line class="axis" x1="8" y1="28" x2="392" y2="28"></line><circle class="start" cx="8" cy="28" r="4"></circle><text x="4" y="52">今天</text>
        ${mark(daysBetween(t, p.deadline), 'deadline')}${mark(examD, 'exam')}${dots}${labels}${below}</svg>`;
    rows = shown.map((L) => {
      const target = L === p.level;
      if (!p.left[L]) return `<div class="course-row" data-level="${L}"><span class="course-lv ${tone(L)}">${L}</span><div>都學過一次了</div></div>`;
      const diff = daysBetween(p.finish[L], p.deadline);
      const note = !target ? '' : p.state === 'done' ? '・目標' : diff > 0 ? `・目標，比期限早 ${diff} 天` : diff < 0 ? `・目標，比期限晚 ${-diff} 天` : '・目標，正好是期限';
      return `<div class="course-row" data-level="${L}"><span class="course-lv ${tone(L)}">${L}</span><div><div${target ? ' class="strong"' : ''}>預計 ${sl(p.finish[L])} 學過一次</div><div class="tiny muted">還有 ${p.left[L]} 題${note ? `<span class="${tone(L)}">${note}</span>` : ''}</div></div></div>`;
    }).join('');
  }
  const text = p.state === 'ok' || p.state === 'late' ? '' : `<p class="course-text small dim mb-0">${esc(courseText(p))}</p>`;
  const advice = p.state === 'late' ? `<div class="course-advice">${esc(courseAdvice(p))}</div>` : '';
  const unseen = (arr) => arr.filter(x => !state.srs[x.key]).length;
  const banks = [['假名', REG.kana], ['單字', REG.vocab], ['文法', REG.grammar], ['漢字', REG.kanji], ['聽力', REG.listen], ['閱讀', REG.read]];
  const bankRows = banks.map(([name, arr]) => `<tr><td>${name}</td><td class="num">${arr.length - unseen(arr)} / ${arr.length}</td><td class="num col-left">${unseen(arr)}</td></tr>`).join('');
  return `<div class="card" id="courseCard">
      <div class="card-head"><div class="card-title">課程進度</div>${courseChip(p)}</div>
      <div class="course-sub small muted">${esc(sub)} <button type="button" class="btn btn-sm btn-ghost" data-act="settings-learn">更改目標</button></div>
      ${text}${line}${rows}${advice}
      <details class="disclose mt-3 course-banks"><summary>各題庫明細</summary><div class="table-wrap mt-2"><table class="table"><thead><tr><th>題庫</th><th>已學 / 總數</th><th class="col-left">還沒學</th></tr></thead><tbody>${bankRows}</tbody></table></div></details>
    </div>`;
}

// Lesson section a built-in grammar item belongs to (data.js `sec`); null for AI-made items and the few that match no section
function lessonSecKey(g) {
  const L = g && DATA.LESSONS[g.u];
  return L && Number.isInteger(g.sec) && g.sec >= 0 && L.sections[g.sec] ? `${g.u}:${g.sec}` : null;
}
// First new question from a lesson section: the section itself (heading, rule, points and its examples) before the question. Shown once per section.
function grammarPreviewHtml(e, pct) {
  const g = e.item; const u = unitById(g.u); const sec = DATA.LESSONS[g.u].sections[g.sec];
  return `
    <div class="pr-top">
      <button type="button" class="btn btn-ghost btn-icon" data-act="exit-practice" title="結束練習（Esc）" aria-label="結束練習">${icon('close')}</button>
      ${prBarHtml(pct)}
      ${prCountHtml()}
    </div>
    ${sessionNoteHtml()}
    <div class="q-card">
      <div class="q-label"><span>${e.relearn ? '常錯的文法' : '新文法'} · ${esc(u.short)}</span>${e.relearn ? '<span class="chip chip-bad">再看一次</span>' : '<span class="chip chip-accent">新</span>'}</div>
      <div class="q-instr">${e.relearn ? '這一段的題目錯過好幾次，先再看一遍講義，等一下再考。' : '先看這一段講義，接下來的題目會考這裡的用法。'}</div>
      <div class="preview grammar">
        <div class="word">${bracketRuby(sec.h)}</div>
        ${sec.rule ? `<div class="rule jp mt-2">${bracketRuby(sec.rule)}</div>` : ''}
        ${(sec.points || []).length ? `<ul class="points small">${sec.points.map(p => `<li>${bracketRuby(p)}</li>`).join('')}</ul>` : ''}
        ${(sec.ex || []).map((x, i) => `<div class="example ${i ? 'mt-2' : 'mt-3'}"><button type="button" class="btn btn-sm btn-ghost btn-icon" data-act="speak" data-text="${esc(x.jp)}" aria-label="朗讀例句">${icon('speaker')}</button><div><div class="jp">${furi(x.jp)}</div><div class="zh">${esc(x.zh || '')}</div></div></div>`).join('')}
      </div>
    </div>
    <div class="pr-actions pr-next-sticky">
      <div class="left"><button type="button" class="btn btn-sm btn-ghost" data-act="nav" data-route="#/course/${esc(g.u)}?tab=lesson">看完整講義</button></div>
      <div class="right">${previewGoBtn()}</div>
    </div>`;
}

// ---------- tooltip for chart marks (values are also in the table / labels) ----------
function attachChartTips(root) {
  let tip = document.getElementById('chartTip');
  if (!tip) { tip = document.createElement('div'); tip.id = 'chartTip'; tip.className = 'chart-tip'; tip.setAttribute('role', 'tooltip'); document.body.appendChild(tip); }
  const show = (el, x, y) => {
    tip.textContent = '';
    const b = document.createElement('b'); b.textContent = el.dataset.tipTitle || '';
    const s = document.createElement('span'); s.textContent = el.dataset.tipBody || '';
    tip.appendChild(b); tip.appendChild(s);
    tip.classList.add('show');
    const w = tip.offsetWidth; const h = tip.offsetHeight;
    tip.style.left = `${clamp(x - w / 2, 8, window.innerWidth - w - 8)}px`;
    tip.style.top = `${Math.max(8, y - h - 12)}px`;
  };
  const hide = () => tip.classList.remove('show');
  root.querySelectorAll('[data-tip-title]').forEach(el => {
    el.addEventListener('pointermove', (ev) => show(el, ev.clientX, ev.clientY));
    el.addEventListener('pointerleave', hide);
    el.addEventListener('focus', () => { const r = el.getBoundingClientRect(); show(el, r.left + r.width / 2, r.top); });
    el.addEventListener('blur', hide);
  });
}

Object.assign(ACTIONS, {
  'stats-scope': (el) => { statsScope = el.dataset.scope; animForce = true; route(); },
  'stats-drill': (el) => {
    const items = REG.grammar.filter(g => g.pt === el.dataset.pt);
    if (!items.length) return;
    startSession('items', { items: shuffle(items).slice(0, 15), title: `考點練習：${el.dataset.pt}` });
  }
});
