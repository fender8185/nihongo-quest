'use strict';
/* ==========================================================================
   Vocabulary: SRS flashcards, word list
   ========================================================================== */
let FLASH = null;   // { deck, queue: [key], idx, flipped, extraNew }
function decks() { return [['all', '全部']].concat(levels().map(L => [L, lvLabel(L)])); }

// ---- themes: every word carries a theme (`c`) ----
// theme order = each level's list in DATA.THEMES (PRE_N5, N5, N4); a name shared by two levels ranks where it first appears
function themeOrder() { return THEME_ORDER_NOW || (THEME_ORDER_NOW = [...new Set([].concat(...levels().map(l => ((DATA.THEMES || {})[l] || []).map(t => t.c))))]); }
// old theme names (before 1.0.8) → the N5 name, or the N4 name for N4-only themes; normalizeState migrates state.themeLane with it
const THEME_MIGRATE = {"問候": "問候與溝通", "溝通": "問候與溝通", "指示": "疑問與指示", "代名詞": "疑問與指示", "疑問": "疑問與指示", "人物": "人物與家庭", "家庭": "人物與家庭", "身體": "身體與健康", "健康": "身體與健康", "衣物": "衣物與購物", "購物": "衣物與購物", "生活": "居家生活", "學校": "學校與工作", "工作": "學校與工作", "交通": "交通與移動", "移動": "交通與移動", "地點": "地點與位置", "位置": "地點與位置", "自然": "自然與天氣", "天氣": "自然與天氣", "興趣": "興趣與休閒", "休閒": "興趣與休閒", "形容": "形容與狀態", "狀態": "形容與狀態", "顏色": "形容與狀態", "副詞": "副詞與接續", "接續": "副詞與接續", "社會": "社會與人際", "人際": "社會與人際", "敬語": "溝通與敬語", "情感": "情感與心情", "心情": "情感與心情", "思考": "思考與抽象", "抽象": "思考與抽象", "旅行": "交通旅行與移動"};
function vocabTheme(v) { return v.c; }   // every word carries a theme of its level (data test)
// ---- 單字頁 (1.0.9): one level at a time → its themes → the kanji met in them ----
function levelStats(lv) {
  const t = todayStr();
  const out = { lv, total: 0, seen: 0, learned: 0, mastered: 0, due: 0, kanji: { total: 0, seen: 0, learned: 0 } };
  REG.vocab.filter(v => v.lv === lv).forEach(v => { out.total++; const r = state.srs[v.key]; if (!r) return; out.seen++; if (r.b >= SRS_LEARNED) out.learned++; if (srsLevelLabel(r, v.key) === '已熟練') out.mastered++; if (isDueToday(v, t)) out.due++; });
  REG.kanji.filter(k => k.lv === lv).forEach(k => { out.kanji.total++; const r = state.srs[k.key]; if (!r) return; out.kanji.seen++; if (r.b >= SRS_LEARNED) out.kanji.learned++; });
  if (lv === 'PRE_N5') { out.kana = { total: REG.kana.length, seen: 0, learned: 0 }; REG.kana.forEach(k => { const r = state.srs[k.key]; if (!r) return; out.kana.seen++; if (r.b >= SRS_LEARNED) out.kana.learned++; }); }
  return out;
}
// kanji counted per (level, theme) from the built-in words that contain them
function kanjiCountsByTheme(lv) {
  const by = new Map();   // theme → Map(kanji → count)
  REG.vocab.filter(v => v.lv === lv).forEach(v => {
    const c = vocabTheme(v); const m = by.get(c) || by.set(c, new Map()).get(c);
    new Set([...jaPlain(v.w)].filter(ch => KANJI_RE.test(ch) && REG.byKey.has('k:' + ch))).forEach(ch => m.set(ch, (m.get(ch) || 0) + 1));
  });
  return by;
}
function themeStats(lv) {
  const t = todayStr(); const counts = kanjiCountsByTheme(lv);
  return ((DATA.THEMES || {})[lv] || []).map(th => {
    const g = { c: th.c, desc: th.desc || '', total: 0, seen: 0, learned: 0, mastered: 0, due: 0, kanji: [] };
    REG.vocab.filter(v => v.lv === lv && vocabTheme(v) === th.c).forEach(v => { g.total++; const r = state.srs[v.key]; if (!r) return; g.seen++; if (r.b >= SRS_LEARNED) g.learned++; if (srsLevelLabel(r, v.key) === '已熟練') g.mastered++; if (isDueToday(v, t)) g.due++; });
    g.kanji = [...(counts.get(th.c) || new Map()).entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 8).map(([k]) => k);
    return g;
  });
}
// the theme a kanji belongs to on a level page: the theme whose words (of that level) contain it most often
function kanjiThemeOf(k, lv, counts = kanjiCountsByTheme(lv)) {
  let best = null, n = 0;
  counts.forEach((m, c) => { const x = m.get(k.k) || 0; if (x > n) { n = x; best = c; } });
  return best;
}
function vocabThemes() {
  const t = todayStr();
  const by = new Map();
  REG.vocab.forEach(v => {
    const c = vocabTheme(v);
    const g = by.get(c) || by.set(c, { c, total: 0, seen: 0, learned: 0, mastered: 0, due: 0, PRE_N5: 0, N5: 0, N4: 0 }).get(c);
    g.total++; g[v.lv in g ? v.lv : courseLevels()[0]]++;
    const r = state.srs[v.key];
    if (r) { g.seen++; if (r.b >= SRS_LEARNED) g.learned++; if (srsLevelLabel(r, v.key) === '已熟練') g.mastered++; if (isDueToday(v, t)) g.due++; }
  });
  const rank = (c) => { const i = themeOrder().indexOf(c); return i < 0 ? themeOrder().length : i; };
  return [...by.values()].sort((a, b) => rank(a.c) - rank(b.c) || a.c.localeCompare(b.c, 'zh-Hant'));
}
// three stacked segments: mastered, learned (not yet mastered), seen (not yet learned)
// Three-segment bar painted as one gradient (no child layout to go wrong on any browser): segs = [[name, count]]
// left to right, brightest first. Names mastered / learned / seen map to heat-4 / heat-3 / heat-2.
const SEG_COLOR = { mastered: 'var(--heat-4)', learned: 'var(--heat-3)', seen: 'var(--heat-2)' };
function segBarHtml(total, segs, cls = 'mt-2', anim = false) {
  let acc = 0; const stops = [];
  const attrs = segs.map(([name, n]) => { const from = acc; acc += n; stops.push(`${SEG_COLOR[name]} ${(from / Math.max(1, total) * 100).toFixed(1)}% ${(acc / Math.max(1, total) * 100).toFixed(1)}%`); return `data-${name}="${n}"`; }).join(' ');
  stops.push(`transparent ${(acc / Math.max(1, total) * 100).toFixed(1)}% 100%`);
  return `<div class="bar stack ${cls}" data-total="${total}" ${attrs}${anim ? ' data-anim' : ''} style="background-image:linear-gradient(to right, ${stops.join(', ')})"></div>`;
}
function stackBarHtml(g) { return segBarHtml(g.total, [['mastered', g.mastered], ['learned', g.learned - g.mastered], ['seen', g.seen - g.learned]]); }
// a unit's questions by their stars, as a theme's words (2026-11-11, the user: a unit marked 5★ still read 初識 — it counted right
// answers): 熟練 = 已熟練 (five stars), 熟悉 = three stars or more, 初識 = met, fewer than three
function unitBarHtml(s, cls, anim) { return segBarHtml(s.total, [['mastered', s.mastered], ['learned', s.learned - s.mastered], ['seen', s.seen - s.learned]], cls, anim); }
function unitLegendHtml(s) { return `<span class="leg"><i class="seg-dot mastered"></i>熟練 ${s.mastered}</span><span class="leg"><i class="seg-dot learned"></i>熟悉 ${s.learned - s.mastered}</span><span class="leg"><i class="seg-dot seen"></i>初識 ${s.seen - s.learned}</span><span class="leg">共 ${s.total} 題</span>`; }
// 我的標記 (2026-11-11, the user): a word's on the word list, a unit's questions on its page (markItem, unmarkItem) — one button going
// round 0★ → 2★ → 5★ → 0★ (0★: back to before the mark); data-lv is the step a tap goes to
const MARK_NEXT = { 0: 2, 2: 5, 5: 0 };
function markButtonHtml(lv, data) {
  const n = MARK_NEXT[lv];
  return `<button type="button" class="mark-btn" data-now="${lv}" ${data} data-lv="${n}" title="我的標記：${lv}★。點一下改成 ${n}★${n ? '' : '（回到標記前）'}" aria-label="我的標記 ${lv}★，點一下改成 ${n}★">${lv}★</button>`;
}
function vocabSessionCount(filter) { const items = buildVocabQueue(filter, 20); return items.length + encoreEstimate(items); }
// 五十音 coloured by how well each kana is known, one table per script: a phone shows one at a time (平假名｜片假名
// switch, kanaScript), a wide screen both side by side. A tap reads the kana; the ▶ in front of a row practises that row of that script.
let kanaScript = 'hira';
function kanaHeatGridHtml() {
  const heat = (ch) => { const r = state.srs['a:' + ch]; return !r ? 0 : r.b <= 1 ? 1 : r.b === 2 ? 2 : r.b <= 4 ? 3 : 4; };
  const rows = KANA_ROWS.concat(DAKUTEN_ROWS);
  const cell = (h, ch) => `<button type="button" class="kana-cell heat-${heat(ch)}" data-act="speak" data-text="${ch}" data-ch="${ch}" aria-label="${ch} ${KANA_ROMAJI[h]}"><span class="jp hira">${ch}</span><span class="roma">${KANA_ROMAJI[h]}</span></button>`;
  const table = (script, title) => `<div class="kana-table" data-script="${script}"><div class="kana-table-title">${title}</div><div class="kana-heat">${rows.map((row, i) => `<div class="kana-heat-row"><button type="button" class="kana-row-btn" data-act="kana-row" data-row="${i}" data-script="${script}" title="練這一行">▶</button>${row.map(h => h ? cell(h, script === 'hira' ? h : KATA[h]) : '<span class="kana-cell empty"></span>').join('')}</div>`).join('')}</div></div>`;
  const seg = `<div class="seg kana-script-seg">${[['hira', '平假名'], ['kata', '片假名']].map(([k, l]) => `<button type="button" aria-pressed="${kanaScript === k}" data-act="kana-script" data-script="${k}">${l}</button>`).join('')}</div>`;
  return `<div class="kana-pair" data-show="${kanaScript}">${seg}${table('hira', '平假名')}${table('kata', '片假名')}</div>`;
}
function renderVocabLevel(view, lv) {
  const L = levelStats(lv); const themes = themeStats(lv);
  const desktop = window.matchMedia('(min-width: 761px)').matches;
  const ring = ringHtml(L.total ? L.learned / L.total : 0, `<div class="num" style="font-size:18px">${L.total ? Math.round(L.learned / L.total * 100) : 0}%</div>`, 84);
  // 1.0.27: the card itself opens the theme's word table (its title is the link for the keyboard); the kanji and buttons keep their own action.
  // 1.1.0: each is an index card from 書房's card box, its coloured tab at the top left.
  const cards = themes.map((g, i) => { const list = `#/vocab/list?lv=${lv}&c=${encodeURIComponent(g.c)}`; return `<div class="card theme-card index-card" style="--tab:${CARD_TABS[i % CARD_TABS.length]}" data-c="${esc(g.c)}" data-lv="${lv}" data-act="nav" data-route="${list}">
      <div class="row between"><a class="card-title theme-link" href="${list}" data-act="nav" data-route="${list}">${esc(g.c)}</a><span class="tiny muted nowrap">${g.total} 字 ›</span></div>
      ${stackBarHtml(g)}
      <div class="row between mt-2"><span class="small muted">已學 ${g.seen}／${g.total}${g.due ? `・今天到期 ${g.due}` : ''}</span>
        <span class="row" style="gap:6px"><button type="button" class="btn btn-sm btn-primary" data-act="start-vocab" data-filter="t:${lv}:${esc(g.c)}">練習</button>
        <button type="button" class="btn btn-sm btn-icon" data-act="listen-theme-start" data-theme="${esc(g.c)}" title="播放字卡" aria-label="播放字卡">${icon('play')}</button></span></div></div>`; }).join('');
  // kanji of this level grouped by the theme that uses them most
  // a kanji met only in another level's words (兄 in 入門 人與家人 while the kanji is N4) joins that theme, labelled with the level
  const counts = kanjiCountsByTheme(lv); const otherCounts = levels().filter(l => l !== lv).map(l => [l, kanjiCountsByTheme(l)]);
  const groups = new Map(); const order = themes.map(t => t.c);
  REG.kanji.filter(k => k.lv === lv).forEach(k => {
    let c = kanjiThemeOf(k, lv, counts);
    if (!c) { for (const [l, m] of otherCounts) { const t = kanjiThemeOf(k, l, m); if (t) { c = `${t}（${lvLabel(l)}的字）`; if (!order.includes(c)) order.push(c); break; } } }
    if (!c) c = '其他（沒有例字）';
    (groups.get(c) || groups.set(c, []).get(c)).push(k);
  });
  order.push('其他（沒有例字）');
  const kanjiHtml = order.filter(c => groups.has(c)).map(c => `<div class="kanji-group mt-3"><div class="small muted mb-1">${esc(c)}・${groups.get(c).length} 字</div><div class="kanji-grid">${groups.get(c).map(k => `<button type="button" class="kanji-tile jp ${kanjiLevelClass(k)}" data-act="kanji-open" data-k="${esc(k.k)}" title="${esc(k.m)}" aria-label="${esc(k.k)}">${esc(k.k)}</button>`).join('')}</div></div>`).join('');
  const kanaBox = lv === 'PRE_N5' ? `<details class="disclose kana-box card mt-3" ${desktop ? 'open' : ''}><summary>五十音（已認得 ${L.kana.seen}／${L.kana.total}）</summary>
      <div class="small muted mt-2">顏色越深越熟；點假名聽發音，按每行前面的 ▶ 只練那一行。</div>${kanaHeatGridHtml()}
      <div class="row-wrap mt-2"><button type="button" class="btn btn-sm" data-act="kana-practice">練全部假名</button></div></details>` : '';
  view.innerHTML = `
    <div class="page-head"><div><div class="page-title">單字</div><div class="page-sub"><b>${lvLabel(lv)}</b>・已學 ${L.seen}／${L.total}${L.due ? `・今天到期 ${L.due}` : ''}</div></div>
      <div class="row" style="gap:12px">${ring}<button type="button" class="btn btn-primary" data-act="start-vocab" data-filter="${lv}">練這個等級・${vocabSessionCount(lv)} 題</button></div></div>
    ${vocabTabs(lv)}
    ${kanaBox}
    <div class="grid grid-3 theme-grid mt-3">${cards}</div>
    <details class="disclose kanji-box card mt-3" ${desktop ? 'open' : ''}><summary>漢字 ${lvLabel(lv)}（已學 ${L.kanji.seen}／${L.kanji.total}）</summary>
      ${kanjiHtml || '<p class="hint mt-2">這一級沒有漢字。</p>'}
      ${L.kanji.total ? `<div class="row-wrap mt-3"><button type="button" class="btn btn-sm" data-act="start-kanji-level" data-lv="${lv}">練這一級的漢字</button></div>` : ''}
    </details>`;
}
function deckPool(deck) {
  if (levels().includes(deck)) return REG.vocab.filter(v => v.lv === deck);
  // the mixed deck follows the daily rule: reviews of every learned word, new words of the current level only (buildFlashQueue)
  return REG.vocab;
}
function buildFlashQueue(deck, extraNew = 0) {
  const t = todayStr();
  const pool = deckPool(deck);
  const due = pool.filter(v => isDueToday(v, t)).sort(byDue);   // three stars or below (four and five come from their queues)
  const quota = todayNewLeft('v') + extraNew;
  const fresh = newVocabCandidates(pool, deck !== 'all').slice(0, quota);
  return due.concat(fresh).map(v => v.key);
}
function ensureFlash(deck) {
  if (!FLASH || FLASH.deck !== deck || FLASH.date !== todayStr()) FLASH = { deck, queue: buildFlashQueue(deck), idx: 0, flipped: false, extraNew: 0, date: todayStr(), done: 0 };
  return FLASH;
}

// which level the vocab page opens on: 入門 while in that stage, then N5, then N4 once N5 is all seen and open
function defaultVocabLevel() {
  if (inPreStage()) return 'PRE_N5';
  return curLevel();   // the level new items come from (每一級封死)
}
const CARD_TABS = ['#e3907f', '#79a46c', '#5f88b2', '#e0b04a', '#8b6aa8'];   // the index cards' tabs in 書房's card box
function vocabTabs(tab) {   // 1.1.0: the card box's dividers
  return `<div class="seg mb-4 dividers">
    ${levels().map(l => `<button type="button" aria-pressed="${tab === l}" data-act="nav" data-route="#/vocab/level?lv=${l}">${lvLabel(l)}</button>`).join('')}
    <button type="button" aria-pressed="${tab === 'cards'}" data-act="nav" data-route="#/vocab/cards">字卡</button>
    <button type="button" aria-pressed="${tab === 'list'}" data-act="nav" data-route="#/vocab/list">單字表</button>
  </div>`;
}

function renderVocab(view, tab, params) {
  if (tab === 'level') return renderVocabLevel(view, levels().includes(params.lv) ? params.lv : defaultVocabLevel());
  if (tab === 'list') return renderVocabList(view, params);
  const deck = params.deck || (FLASH && FLASH.deck) || 'all';
  const F = ensureFlash(deck);
  const vs = vocabStats();
  const key = F.queue[F.idx];
  const v = key && REG.byKey.get(key);
  let card;
  if (!v) {
    card = `<div class="card center"><div class="flash">
      <div class="page-title">${F.done ? `這一輪完成了（${F.done} 張）` : '目前沒有要翻的字卡'}</div>
      <p class="dim mt-2">今天到期的字卡都複習完了${todayNewLeft('v') === 0 ? '，今天的新單字也都學了' : ''}。</p>
      <div class="row-wrap mt-3" style="justify-content:center">
        <button type="button" class="btn" data-act="flash-more">再學 5 張新卡</button>
        <button type="button" class="btn btn-primary" data-act="start-vocab" data-filter="${deck}">用測驗方式複習</button>
      </div></div></div>`;
  } else {
    const r = state.srs[v.key];
    const back = F.flipped ? `
      <div class="divider"></div>
      ${v.r && v.r !== v.w ? `<div class="reading jp">${esc(v.r)}</div>` : ''}
      <div class="meaning">${esc(v.m)}</div>
      ${v.p ? `<div class="mt-1">${posChip(v.p)}</div>` : ''}
      ${vocabExamples(v).map((e, i) => `<div class="example ${i ? 'mt-2' : 'mt-3'}" style="text-align:left"><button type="button" class="btn btn-sm btn-ghost btn-icon" data-act="${i ? 'speak' : 'flash-speak'}" data-mode="ex" data-text="${esc(exampleSpeech(e.ex, v))}" aria-label="朗讀例句">${icon('speaker')}</button><div><div class="jp">${exampleJpHtml(e.ex, v)}</div><div class="zh">${esc(e.exZh || '')}</div></div></div>`).join('')}
      <div id="flashAiBox"></div>` : '';
    card = `<div class="card">
      <div class="row between small muted"><span>${F.idx + 1} / ${F.queue.length}・${r ? srsLevelLabel(r, v.key) : '新卡'}</span><span>${r ? srsDots(r.b) : '<span class="chip chip-accent">新</span>'}${r && (r.mark === 5 || srsLevelLabel(r, v.key) === '已熟練') ? '' : ` <button type="button" class="btn btn-sm btn-ghost" data-act="vocab-known" data-key="${esc(v.key)}" title="直接標成五顆，之後排進五顆的複習">我會了</button>`}</span></div>
      <div class="flash">
        <div class="word jp">${esc(jaPlain(v.w))}</div>
        ${back}
      </div>
      ${F.flipped ? `<div class="rate">
          <button type="button" class="btn" data-act="flash-rate" data-g="again">忘記<small>1・稍後再看</small></button>
          <button type="button" class="btn" data-act="flash-rate" data-g="hard">模糊<small>2・${nextIntervalText(v.key, 'hard')}</small></button>
          <button type="button" class="btn" data-act="flash-rate" data-g="good">記得<small>3・${nextIntervalText(v.key, 'good')}</small></button>
          <button type="button" class="btn" data-act="flash-rate" data-g="easy">很熟<small>4・${nextIntervalText(v.key, 'easy')}</small></button>
        </div>` : `<button type="button" class="btn btn-primary btn-block btn-lg" data-act="flash-flip">看答案 <span class="kbd kbd-hint" style="background:transparent;border-color:currentColor;color:inherit">Space</span></button>`}
      <div class="row-wrap mt-3" style="justify-content:space-between">
        <div class="row-wrap">
          <button type="button" class="btn btn-sm btn-ghost" data-act="flash-speak" data-mode="word">${icon('speaker')}發音</button>
          ${F.flipped && aiReady() ? '<button type="button" class="btn btn-sm btn-ghost" data-act="flash-ai">AI 補充例句</button>' : ''}
        </div>
        <button type="button" class="btn btn-sm btn-ghost" data-act="flash-skip">略過</button>
      </div>
    </div>`;
  }
  view.innerHTML = `
    <div class="page-head"><div><div class="page-title">單字</div><div class="page-sub">今天待複習 ${vs.due} 張・${(() => { const cur = curLevel(); const cl = courseLevels(); return levels().map(L => { const c = courseLevel(L); return cl.indexOf(c) <= cl.indexOf(cur) || L === 'PRE_N5' ? `${lvLabel(L)} 熟悉 ${vs[L].learned}/${vs[L].total}` : c === cl[cl.indexOf(cur) + 1] ? `${L}：${cur} 的單字、漢字、文法都學過一次後開始（還剩${levelLeftText(cur)}）` : ''; }).filter(Boolean).join('・'); })()}</div></div>
      <button type="button" class="btn" data-act="start-vocab" data-filter="${deck}">單字測驗・${vocabSessionCount(deck)} 題</button></div>
    ${vocabTabs('cards')}
    <div class="row-wrap mb-3"><span class="small muted">牌組</span><div class="seg">${decks().map(([k, l]) => `<button type="button" aria-pressed="${deck === k}" data-act="flash-deck" data-deck="${k}">${l}</button>`).join('')}</div></div>
    ${card}
    <p class="hint mt-3"><span class="kbd-hint">鍵盤：Space 翻面，1–4 評分，R 發音。</span>評分會決定下次出現的時間，測驗和每日練習也共用同一份紀錄。</p>`;
}
function nextIntervalText(key, grade) {
  const d = srsPreview(key, grade);
  return d <= 1 ? '明天' : d < 60 ? `${d} 天後` : `${Math.round(d / 30)} 個月後`;
}
function flashKey(ev) {
  const k = ev.key;
  if (!FLASH) return;
  if (k === ' ' || k === 'Enter') { ev.preventDefault(); if (!FLASH.flipped) ACTIONS['flash-flip'](); else ACTIONS['flash-rate']({ dataset: { g: 'good' } }); return; }
  if (FLASH.flipped && ['1', '2', '3', '4'].includes(k)) { ev.preventDefault(); ACTIONS['flash-rate']({ dataset: { g: ['again', 'hard', 'good', 'easy'][Number(k) - 1] } }); return; }
  if (k === 'r' || k === 'R') { ev.preventDefault(); ACTIONS['flash-speak']({ dataset: { mode: 'word' } }); return; }
  if (k === 'f' || k === 'F') { ev.preventDefault(); toggleFurigana(); }
}
function flashCurrent() { return FLASH && REG.byKey.get(FLASH.queue[FLASH.idx]); }

// ---------- word list ----------
// the word table's current selection (search, level tab, theme)
function vocabListFiltered(params) {
  const q = (params.q || '').trim().toLowerCase();
  const lv = params.lv || 'all';
  const theme = params.c || '';
  let list = REG.vocab;
  if (theme) list = list.filter(v => vocabTheme(v) === theme);
  if (lv !== 'all') list = list.filter(v => v.lv === lv);
  if (q) list = list.filter(v => [v.w, v.r, v.m].some(x => String(x || '').toLowerCase().includes(q)));
  return list;
}
let LAST_BULK_KNOWN = null;   // { keys, prev } of the last 整批我會了, so it can be undone exactly
function vocabListResultsHtml(params, list = vocabListFiltered(params)) {
  const notKnown = list.filter(v => !(state.srs[v.key] && state.srs[v.key].mark === 5)).length;
  const shown = list.slice(0, 300);
  const rows = shown.map(v => {
    const r = state.srs[v.key];
    return `<tr>
      <td><div class="jp" style="font-size:16px">${esc(jaPlain(v.w))}</div><div class="tiny muted jp">${esc(v.r && v.r !== v.w ? v.r : '')}</div></td>
      <td><div>${esc(v.m)}</div><div class="tiny muted">${esc(`${lvLabel(v.lv)}・${posLabel(v.p)}`)}</div></td>
      <td class="nowrap small">${r ? `${srsDots(r.b)}<div class="tiny muted">${dueLabel(r, v.key).replace('複習', '')}</div>` : '<span class="muted">未學</span>'}<div class="mt-1">${markButtonHtml((r && r.mark) || 0, `data-act="mark-word" data-key="${esc(v.key)}"`)}</div></td>
      <td style="text-align:right">
        <button type="button" class="btn btn-sm btn-ghost btn-icon" data-act="speak" data-text="${esc(jaPlain(v.w))}" data-reading="${esc(v.r && !HAS_KANJI.test(v.r) && v.r !== jaPlain(v.w) ? v.r : '')}" aria-label="發音">${icon('speaker')}</button>
        <button type="button" class="btn btn-sm btn-ghost" data-act="vocab-remove" data-key="${esc(v.key)}">隱藏</button>
      </td></tr>`;
  }).join('');
  return `<div class="row-wrap mb-3">
      ${notKnown ? `<button type="button" class="btn btn-sm" data-act="vocab-known-all" data-n="${notKnown}" title="把目前列出的字全部標成五顆，之後排進五顆的複習；答錯就回到正常排程">這 ${notKnown} 個字我都會了</button>` : ''}
      ${LAST_BULK_KNOWN ? `<span class="small muted">已把 ${LAST_BULK_KNOWN.keys.length} 個字標成我會了</span><button type="button" class="btn btn-sm btn-ghost" data-act="vocab-known-undo">復原</button>` : ''}
      <span class="hint">已經會的字可以整批標記，之後只會偶爾確認一次。</span>
    </div>
    <div class="table-wrap"><table class="table"><thead><tr><th>單字</th><th>意思</th><th>熟練度</th><th></th></tr></thead><tbody>${rows || '<tr><td colspan="4" class="empty">沒有符合的單字</td></tr>'}</tbody></table></div>
    ${list.length > shown.length ? `<p class="hint mt-2">只顯示前 ${shown.length} 筆，請用搜尋縮小範圍。</p>` : ''}`;
}
function renderVocabList(view, params) {
  const lv = params.lv || 'all';
  const theme = params.c || '';
  const list = vocabListFiltered(params);
  view.innerHTML = `
    <div class="page-head"><div><div class="page-title">單字</div><div class="page-sub">${theme ? `主題「${esc(theme)}」・${list.length} 個字` : `共 ${REG.vocab.length} 個單字`}</div></div>
      ${theme ? (() => { const lvOk = levels().includes(lv); const f = lvOk ? `t:${lv}:${theme}` : `c:${theme}`; return `<div class="row-wrap"><button type="button" class="btn btn-primary" data-act="start-vocab" data-filter="${esc(f)}">練習這個主題・${vocabSessionCount(f)} 題</button><button type="button" class="btn btn-ghost" data-act="nav" data-route="#/vocab/level?lv=${lvOk ? lv : defaultVocabLevel()}">回到${lvOk ? lvLabel(lv) : '單字'}</button></div>`; })() : ''}</div>
    ${vocabTabs('list')}
    <div class="row-wrap mb-3">
      <input class="input" style="max-width:320px" placeholder="搜尋日文、假名或中文" value="${esc(params.q || '')}" data-change="vocab-search" id="vocabSearch" />
      <div class="seg">${decks().map(([k, l]) => `<button type="button" aria-pressed="${lv === k}" data-act="vocab-filter" data-lv="${k}">${l}</button>`).join('')}</div>
    </div>
    <div id="vocabListBody">${vocabListResultsHtml(params, list)}</div>`;
}
function applyVocabSearch(el) {
  const { lv = 'all', c } = currentRoute().params;
  const nextHash = `#/vocab/list?lv=${lv}&q=${encodeURIComponent(el.value)}${c ? `&c=${encodeURIComponent(c)}` : ''}`;
  const body = document.getElementById('vocabListBody');
  if (body) {
    history.replaceState(null, '', nextHash);
    const params = { lv, q: el.value, c: c || '' };
    const list = vocabListFiltered(params);
    const sub = document.querySelector('.page-head .page-sub');
    if (sub && c) sub.textContent = `主題「${c}」・${list.length} 個字`;
    body.innerHTML = vocabListResultsHtml(params, list);
  } else {
    go(nextHash);
  }
}

Object.assign(ACTIONS, {
  'flash-deck': (el) => { FLASH = null; go(`#/vocab/cards?deck=${el.dataset.deck}`); },
  'flash-flip': () => { if (!FLASH) return; FLASH.flipped = true; route(); const v = flashCurrent(); if (v) speak(v.r || jaPlain(v.w)); },
  'flash-rate': (el) => {
    const v = flashCurrent();
    if (!v) return;
    const g = el.dataset.g;
    const res = srsAnswer(v.key, g !== 'again', { grade: g });
    recordFormat(res.rec, 'flash', g !== 'again');
    recordAction('v', `單字「${jaPlain(v.w)}」`, 'v');
    recordAccuracy(g !== 'again');
    if (g === 'again') {
      addMistake({ key: v.key, cat: '單字', mistakePrompt: `${jaPlain(v.w)}${v.r && v.r !== v.w ? `（${v.r}）` : ''}`, answerText: v.m, why: vocabWhy(v) }, '字卡：忘記');
      FLASH.queue.splice(Math.min(FLASH.queue.length, FLASH.idx + 5), 0, v.key);
    } else onCorrectForMistake({ key: v.key });
    saveState();
    FLASH.idx++; FLASH.done++; FLASH.flipped = false;
    if (res.isNew && FLASH.idx >= FLASH.queue.length) FLASH.queue = FLASH.queue.concat(buildFlashQueue(FLASH.deck).filter(k => !FLASH.queue.slice(FLASH.idx).includes(k) && !state.srs[k]));
    route();
  },
  'flash-skip': () => { if (!FLASH) return; FLASH.idx++; FLASH.flipped = false; route(); },
  'flash-more': () => {
    if (!FLASH) return;
    FLASH.extraNew += 5;
    const fresh = newVocabCandidates(deckPool(FLASH.deck), FLASH.deck !== 'all').slice(0, 5).map(v => v.key);
    if (!fresh.length) { toast('這個牌組的新卡都學過了'); return; }
    FLASH.queue = FLASH.queue.slice(0, FLASH.idx).concat(fresh); FLASH.flipped = false; route();
  },
  'flash-speak': (el) => { const v = flashCurrent(); if (!v) return; playVocabAudio(v, el.dataset.mode === 'ex' ? 'ex' : 'word'); },
  'flash-ai': () => aiEnrichCard(flashCurrent()),
  'vocab-filter': (el) => { const q = (document.getElementById('vocabSearch') || {}).value || ''; const c = currentRoute().params.c; go(`#/vocab/list?lv=${el.dataset.lv}&q=${encodeURIComponent(q)}${c ? `&c=${encodeURIComponent(c)}` : ''}`); },
  'vocab-known': (el) => {
    const v = REG.byKey.get(el.dataset.key); if (!v) return;
    markItem(v.key, 5);
    toast(`「${jaPlain(v.w)}」已標成五顆，之後會排進五顆的複習`);
    if (SESSION && document.body.classList.contains('practicing')) renderPractice(); else route();
  },
  // 我的標記 on the word list (2026-11-11): 0★ back to before the mark, 2★／5★ up to that many stars
  'mark-word': (el) => {
    const v = REG.byKey.get(el.dataset.key); if (!v) return;
    const lv = Number(el.dataset.lv), r = state.srs[v.key], w = jaPlain(v.w);
    if (((r && r.mark) || 0) === lv) return;
    if (!lv) {
      const how = r.pre === undefined ? '回到熟悉，照正常排程複習' : markFresh(r) ? '回到標記前' : '取消標記，留著答過的紀錄';
      unmarkItem(v.key); toast(`「${w}」${how}`);
    } else toast(`「${w}」標成 ${lv}★${markItem(v.key, lv) ? (lv === 5 ? '，之後排進五顆的複習' : '，過幾天複習') : '（已經比這更熟，星星照舊）'}`);
    route();
  },
  // 整批我會了: every word in the current table selection not at 5★ yet; the previous records are kept for 復原
  'vocab-known-all': () => {
    const keys = vocabListFiltered(currentRoute().params).filter(v => !(state.srs[v.key] && state.srs[v.key].mark === 5)).map(v => v.key);
    if (!keys.length) return;
    const prev = {}; keys.forEach(k => { prev[k] = state.srs[k] ? JSON.parse(JSON.stringify(state.srs[k])) : null; markItem(k, 5, false); });
    saveState(); LAST_BULK_KNOWN = { keys, prev };
    toast(`已把 ${keys.length} 個字標成五顆，之後會排進五顆的複習`); route();
  },
  'vocab-known-undo': () => {
    if (!LAST_BULK_KNOWN) return;
    Object.entries(LAST_BULK_KNOWN.prev).forEach(([k, r]) => { if (r) state.srs[k] = r; else delete state.srs[k]; });
    const n = LAST_BULK_KNOWN.keys.length; LAST_BULK_KNOWN = null; saveState(); toast(`已復原 ${n} 個字的紀錄`); route();
  },
  // 我會了 on the new-word preview card: vouch for the word and drop it (and any encore) from this session
  'preview-known': () => {
    const e = currentEntry(); if (!e || !e.preview || e.previewDone || !e.item || e.item.kind !== 'v') return;
    const v = e.item; markItem(v.key, 5);
    SESSION.entries = SESSION.entries.filter((x, i) => i !== SESSION.idx && !(x.item && x.item.key === v.key));
    toast(`「${jaPlain(v.w)}」已標成五顆，之後會排進五顆的複習`);
    renderPractice(); window.scrollTo({ top: 0 });
  },
  'vocab-remove': (el) => {
    const v = REG.byKey.get(el.dataset.key);
    if (!v) return;
    if (!state.hidden.includes(v.id)) state.hidden.push(v.id); toast(`已隱藏「${jaPlain(v.w)}」`);
    saveState(); buildRegistry(); route();
  }
});
Object.assign(CHANGE_ACTIONS, {
  'vocab-search': (el) => applyVocabSearch(el)
});
