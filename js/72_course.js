'use strict';
/* ==========================================================================
   Course: phases, units, lessons, unit item list
   ========================================================================== */
// the row under each stage card: 階段測驗 and its last result (a pass marks the stage by itself, see finishStageTest)
function stageFootHtml(id, extra = '') {
  const last = ((state.stageTests || {})[id] || [])[0];
  const res = last ? `<span class="chip ${last.passed ? 'chip-ok' : ''} num">上次 ${Number(last.correct) || 0}／${Number(last.total) || 0}・${last.passed ? '通過' : '未通過'}</span>` : '';
  return `<div class="row-wrap mt-3 stage-foot">${extra}<button type="button" class="btn btn-sm" data-act="stage-test" data-stage="${id}">階段測驗</button>${res}</div>`;
}
// a stage card's head, read when it is folded: 完成 when every row is, else the mean of the rows' % (rows: [{ done, pct }])
function stageStateHtml(rows) {
  if (rows.every(r => r.done)) return '<span class="chip chip-ok">完成</span>';
  return `<span class="muted num">${Math.round(rows.reduce((a, r) => a + r.pct, 0) / rows.length)}%</span>`;
}
const courseOpen = {};   // stage id → open, for the cards opened or closed by hand: kept while the app is open, only the current stage open again after a reload
// 課程 wears 書房's bookcase (1.1.0): the shelf of course books along its top — a stage begun or passed stands in its colour
// (the one being studied taller, with a ribbon), the rest wait as dashed outlines, the shelf's daruma at the end; a tap opens that
// stage below. Each stage card is that book's cover; the current unit and the 目前 card carry its ribbon.
const ribbonSvg = () => '<svg class="ribbon" viewBox="0 0 14 26" aria-hidden="true"><path d="M0 0H14V26L7 20L0 26Z"/></svg>';
const DARUMA = '<svg class="daruma" viewBox="0 0 34 38" aria-hidden="true"><ellipse cx="17" cy="22" rx="15" ry="15.5" fill="#c94436"/><ellipse cx="17" cy="19" rx="9.5" ry="8.5" fill="#f6ead6"/><circle cx="13.5" cy="18" r="2.2" fill="#2f2a22"/><circle cx="20.5" cy="18" r="2.2" fill="#f6ead6" stroke="#2f2a22" stroke-width="1.2"/><path d="M13 23.5q4 2.4 8 0" stroke="#2f2a22" stroke-width="1.3" fill="none" stroke-linecap="round"/><path d="M9 31q8 4 16 0" stroke="#e8c05a" stroke-width="2" fill="none" stroke-linecap="round"/></svg>';
function courseShelfHtml() {
  const bk = shelfBooks();
  const spine = (st, i) => {
    const on = i < bk.n, cur = i === bk.cur, lab = BOOK_LABELS[i] || String(i + 1);
    return `<button type="button" class="spine${on ? ' on' : ''}${cur ? ' cur' : ''}" style="--book:${bookColor(i)};--h:${[66, 70, 72, 66, 70, 68][i % 6]}px" data-act="course-shelf" data-stage="${st.id}" aria-label="${esc(st.title)}${cur ? '（目前）' : on ? '' : '（還沒開始）'}">
      ${on ? `<span class="lab${lab.length > 1 ? ' v' : ''}">${lab}</span><i></i><i></i>` : `<span class="num">${lab}</span>`}${cur ? '<svg class="rib" viewBox="0 0 10 22" aria-hidden="true"><path d="M0 0H10V22L5 17L0 22Z"/></svg>' : ''}</button>`;
  };
  return `<div class="course-shelf"><div class="spines">${STAGES.map(spine).join('')}<span class="grow"></span>${DARUMA}</div><div class="board"></div></div>`;
}
// 課程's first card (1.1.0; it was the 今日 card's 目前單元 fold): in 入門, its counts and, once its words are all seen,
// how it ends; after it, the current unit — its bar, today's reviews in it, 看講義／練習本單元, 前往下一單元 once it is well known
function courseNowHtml() {
  if (inPreStage()) {
    const pw = REG.vocab.filter(v => v.lv === 'PRE_N5'), m0 = unitItems('m0'), seen = (l) => l.filter(x => state.srs[x.key]).length;
    return `<div class="card now-card" style="--book:${bookColor(0)}">${ribbonSvg()}
      <div class="label">目前</div><div class="card-title">入門</div>
      <div class="small muted mt-2 legs"><span class="leg">假名 ${seen(REG.kana)}／${REG.kana.length}</span><span class="leg">單字 ${seen(pw)}／${pw.length}</span><span class="leg">句型 ${seen(m0)}／${m0.length}</span></div>
      ${preDone() ? `<div class="banner mt-3"><div class="grow">入門單字都看過了；最近正確率 ${Math.round((recentAccuracy() || 0) * 100)}%，到 ${Math.round(PRE_PASS_ACC * 100)}% 就會自動進入第 1 週。</div></div>` : ''}
    </div>`;
  }
  const cur = unitById(state.currentUnit), us = unitStats(cur.id);
  return `<div class="card now-card" style="--book:${bookColor(stageIndex(currentStageId()))}">${ribbonSvg()}
    <div class="mb-2"><div class="label">目前單元・${esc(cur.lv)}</div><div class="card-title">${esc(cur.weeks)}・${esc(cur.title)}</div></div>
    <div class="row">${unitBarHtml(us, 'grow', true)}<span class="small num muted">${us.pct}%</span></div>
    <div class="small muted mt-2 legs"><span class="leg">已學 ${us.seen}／${us.total} 題</span>${us.due ? `<span class="leg">今天要複習 ${us.due} 題</span>` : ''}</div>
    ${us.pct >= 85 && !us.done ? `<div class="banner mt-3"><div class="grow">這個單元已經很熟了，可以前往下一單元。</div><button type="button" class="btn btn-sm btn-primary" data-act="advance-unit">前往下一單元</button></div>` : ''}
    <div class="row-wrap mt-3">
      <button type="button" class="btn btn-sm" data-act="nav" data-route="#/course/${cur.id}/read">看講義</button>
      <button type="button" class="btn btn-sm" data-act="start-unit" data-unit="${cur.id}">練習本單元</button>
    </div>
  </div>`;
}
function renderCourse(view) {
  const cp = courseProgress();
  const cur = state.currentUnit;
  const pre = inPreStage();
  const curStage = currentStageId();
  const bk = shelfBooks();   // the stages begun: their cards are books, the rest dashed outlines
  const is = unitStats('m0');
  const introRow = `<div class="unit-row" data-act="nav" data-route="#/course/intro" role="button" tabindex="0">
        <div class="unit-weeks">${esc(INTRO_UNIT.weeks)}</div>
        <div class="grow"><div class="unit-title">${esc(INTRO_UNIT.title)}</div><div class="unit-desc">${esc(INTRO_UNIT.desc)}</div></div>
        <div><div class="row between small"><span>${is.done ? '<span class="chip chip-ok">完成</span>' : is.seen ? '<span class="chip">進行中</span>' : ''}</span><span class="muted num">${is.done ? 100 : is.pct}%</span></div>${unitBarHtml(is, 'thin mt-1')}</div>
      </div>`;
  const cards = STAGES.map(st => {
    let rows; let extra = ''; let parts;   // parts: each row's { done, pct } for the head
    if (st.id === 'pre') {
      const kanaSeen = REG.kana.filter(x => state.srs[x.key]).length;
      const words = REG.vocab.filter(v => v.lv === 'PRE_N5'); const wordsSeen = words.filter(v => state.srs[v.key]).length;
      const kanji = REG.kanji.filter(k => k.lv === 'PRE_N5'); const kanjiSeen = kanji.filter(k => state.srs[k.key]).length;
      const total = REG.kana.length + words.length + kanji.length; const seen = kanaSeen + wordsSeen + kanjiSeen; const pct = total ? Math.floor(seen / total * 100) : 0;
      const status = seen >= total ? '<span class="chip chip-ok">完成</span>' : pre ? '<span class="chip chip-accent">目前</span>' : seen ? '<span class="chip">進行中</span>' : '';
      rows = `<div class="list">${introRow}<div class="unit-row ${pre ? 'current' : ''}" data-act="nav" data-route="#/vocab/level?lv=PRE_N5" role="button" tabindex="0">${pre ? ribbonSvg() : ''}
        <div class="unit-weeks">入門</div>
        <div class="grow"><div class="unit-title">假名與入門單字</div><div class="unit-desc">平假名、片假名，以及只用假名寫的基本單字。</div></div>
        <div><div class="row between small"><span>${status}</span><span class="muted num">${pct}%</span></div>${segBarHtml(total, [['learned', seen]], 'thin mt-1')}</div>
      </div></div>`;
      extra = '';   // 1.0.12: the 入門 card carries one button, 階段測驗; passing it leads to the four choices and 第 1 週 (練假名 is on the 單字 page; otherwise 入門 ends by itself, finishPreIfReady)
      parts = [{ done: is.done, pct: is.done ? 100 : is.pct }, { done: seen >= total, pct }];
    } else {
      parts = [];
      rows = `<div class="list">${st.units.map(uid => {
        const u = unitById(uid); const s = unitStats(u.id);
        parts.push({ done: s.done, pct: s.done ? 100 : s.pct });
        const isCur = !pre && u.id === cur;   // 「目前」 appears once on the page: here in the main course, on the 入門 card before it
        const status = s.done ? '<span class="chip chip-ok">完成</span>' : isCur ? '<span class="chip chip-accent">目前</span>' : s.seen ? '<span class="chip">進行中</span>' : '';
        return `<div class="unit-row ${isCur ? 'current' : ''}" data-act="nav" data-route="#/course/${u.id}" role="button" tabindex="0">${isCur ? ribbonSvg() : ''}
        <div class="unit-weeks">${esc(u.weeks)}</div>
        <div class="grow"><div class="unit-title">${esc(u.title)}</div><div class="unit-desc">${esc(u.desc)}</div></div>
        <div><div class="row between small"><span>${status}</span><span class="muted num">${s.done ? 100 : s.pct}%</span></div>${unitBarHtml(s, 'thin mt-1')}</div>
      </div>`;
      }).join('')}</div>`;
    }
    const isCurStage = st.id === 'pre' && pre;
    const open = st.id in courseOpen ? courseOpen[st.id] : st.id === curStage;
    const i = STAGES.indexOf(st), begun = i < bk.n;   // a stage begun is its book's cover; one not begun yet waits dashed
    return `<details class="card stage-card ${begun ? 'book' : 'unbegun'} ${st.id === 'pre' ? 'pre-card' : ''} ${isCurStage ? 'current' : ''}" data-stage="${st.id}" style="--book:${bookColor(i)}" ${open ? 'open' : ''}><summary class="card-head"><div class="stage-label"><div class="card-title">${esc(st.title)}</div><div class="card-sub">${esc(st.sub)}${begun ? '' : '・還沒開始'}</div></div><span class="stage-state">${stageStateHtml(parts)}</span></summary>
      ${rows}${stageFootHtml(st.id, extra)}</details>`;
  }).join('');
  view.innerHTML = `
    ${courseShelfHtml()}
    <div class="page-head">
      <div><div class="page-title">課程</div><div class="page-sub">整體完成度 ${cp.pct}%</div></div>
      <button type="button" class="btn" data-act="open-level">依程度選擇起點</button>
    </div>
    ${courseNowHtml()}
    ${(() => { const gp = grammarPause(); return gp ? `<div class="plan-note">${esc(grammarPauseText(gp))}</div>` : ''; })()}
    ${LAST_BULK_MARK ? `<div class="banner"><div class="grow">已把 ${LAST_BULK_MARK.changed} 個項目標成「四顆」。重新整理後就不能復原了。</div><button type="button" class="btn btn-sm" data-act="bulk-mark-undo">復原</button></div>` : ''}
    ${cards}`;
  view.querySelectorAll('details.stage-card').forEach(d => d.addEventListener('toggle', () => { courseOpen[d.dataset.stage] = d.open; }));
}


// ---- 假名表（第 0 週講義第 1 節）與入門的假名辨識 ----
const KANA_ROWS = [['あ', 'い', 'う', 'え', 'お'], ['か', 'き', 'く', 'け', 'こ'], ['さ', 'し', 'す', 'せ', 'そ'], ['た', 'ち', 'つ', 'て', 'と'], ['な', 'に', 'ぬ', 'ね', 'の'], ['は', 'ひ', 'ふ', 'へ', 'ほ'], ['ま', 'み', 'む', 'め', 'も'], ['や', '', 'ゆ', '', 'よ'], ['ら', 'り', 'る', 'れ', 'ろ'], ['わ', '', '', '', 'を'], ['ん', '', '', '', '']];
const KANA_ROMAJI = { あ: 'a', い: 'i', う: 'u', え: 'e', お: 'o', か: 'ka', き: 'ki', く: 'ku', け: 'ke', こ: 'ko', さ: 'sa', し: 'shi', す: 'su', せ: 'se', そ: 'so', た: 'ta', ち: 'chi', つ: 'tsu', て: 'te', と: 'to', な: 'na', に: 'ni', ぬ: 'nu', ね: 'ne', の: 'no', は: 'ha', ひ: 'hi', ふ: 'fu', へ: 'he', ほ: 'ho', ま: 'ma', み: 'mi', む: 'mu', め: 'me', も: 'mo', や: 'ya', ゆ: 'yu', よ: 'yo', ら: 'ra', り: 'ri', る: 'ru', れ: 're', ろ: 'ro', わ: 'wa', を: 'o', ん: 'n' };
const KATA = { あ: 'ア', い: 'イ', う: 'ウ', え: 'エ', お: 'オ', か: 'カ', き: 'キ', く: 'ク', け: 'ケ', こ: 'コ', さ: 'サ', し: 'シ', す: 'ス', せ: 'セ', そ: 'ソ', た: 'タ', ち: 'チ', つ: 'ツ', て: 'テ', と: 'ト', な: 'ナ', に: 'ニ', ぬ: 'ヌ', ね: 'ネ', の: 'ノ', は: 'ハ', ひ: 'ヒ', ふ: 'フ', へ: 'ヘ', ほ: 'ホ', ま: 'マ', み: 'ミ', む: 'ム', め: 'メ', も: 'モ', や: 'ヤ', ゆ: 'ユ', よ: 'ヨ', ら: 'ラ', り: 'リ', る: 'ル', れ: 'レ', ろ: 'ロ', わ: 'ワ', を: 'ヲ', ん: 'ン' };
// 濁音・半濁音 rows (入門 kana practice covers 清音 + these; 拗音 are learned inside words)
const DAKUTEN_ROWS = [['が', 'ぎ', 'ぐ', 'げ', 'ご'], ['ざ', 'じ', 'ず', 'ぜ', 'ぞ'], ['だ', 'ぢ', 'づ', 'で', 'ど'], ['ば', 'び', 'ぶ', 'べ', 'ぼ'], ['ぱ', 'ぴ', 'ぷ', 'ぺ', 'ぽ']];
Object.assign(KANA_ROMAJI, { が: 'ga', ぎ: 'gi', ぐ: 'gu', げ: 'ge', ご: 'go', ざ: 'za', じ: 'ji', ず: 'zu', ぜ: 'ze', ぞ: 'zo', だ: 'da', ぢ: 'ji', づ: 'zu', で: 'de', ど: 'do', ば: 'ba', び: 'bi', ぶ: 'bu', べ: 'be', ぼ: 'bo', ぱ: 'pa', ぴ: 'pi', ぷ: 'pu', ぺ: 'pe', ぽ: 'po' });
Object.assign(KATA, { が: 'ガ', ぎ: 'ギ', ぐ: 'グ', げ: 'ゲ', ご: 'ゴ', ざ: 'ザ', じ: 'ジ', ず: 'ズ', ぜ: 'ゼ', ぞ: 'ゾ', だ: 'ダ', ぢ: 'ヂ', づ: 'ヅ', で: 'デ', ど: 'ド', ば: 'バ', び: 'ビ', ぶ: 'ブ', べ: 'ベ', ぼ: 'ボ', ぱ: 'パ', ぴ: 'ピ', ぷ: 'プ', ぺ: 'ペ', ぽ: 'ポ' });
// 假名辨識 items (kind a): every row gives its 5 hiragana then their 5 katakana; the 11 清音 rows first, then 濁音・半濁音
function kanaItems() {
  const out = []; let order = 0;
  const rows = KANA_ROWS.map(r => [r, true]).concat(DAKUTEN_ROWS.map(r => [r, false]));
  rows.forEach(([row, seion], ri) => {
    const cells = row.filter(Boolean);
    cells.forEach(h => out.push({ key: 'a:' + h, kind: 'a', id: 'a-' + h, ch: h, script: 'hira', roma: KANA_ROMAJI[h], pair: KATA[h], row: ri, seion, order: order++, builtin: true }));
    cells.forEach(h => { const k = KATA[h]; out.push({ key: 'a:' + k, kind: 'a', id: 'a-' + k, ch: k, script: 'kata', roma: KANA_ROMAJI[h], pair: h, row: ri, seion, order: order++, builtin: true }); });
  });
  return out;
}
// look-alike groups for distractors (same script); a group lists hiragana or katakana, never mixed
const KANA_LOOKALIKE = [['あ', 'お', 'ぬ', 'め'], ['さ', 'き', 'ち', 'ら'], ['ね', 'れ', 'わ'], ['は', 'ほ', 'ま'], ['る', 'ろ'], ['い', 'り'], ['く', 'へ'], ['な', 'た'], ['シ', 'ツ'], ['ソ', 'ン'], ['ク', 'タ', 'ケ'], ['ウ', 'ワ', 'フ'], ['コ', 'ユ'], ['ア', 'マ'], ['チ', 'テ'], ['ス', 'ヌ'], ['ロ', 'コ'], ['ナ', 'メ']];
function kanaLookalikes(item) {
  const same = (x) => x.script === item.script && x.ch !== item.ch && x.roma !== item.roma && (!item.seion || x.seion);   // a 清音 item only gets 清音 decoys; を／お, じ／ぢ read alike and would make two right answers
  const pool = REG.kana.filter(same);
  const out = [];
  const push = (ch) => { if (ch && ch !== item.ch && !out.includes(ch) && pool.some(x => x.ch === ch)) out.push(ch); };
  KANA_LOOKALIKE.filter(g => g.includes(item.ch)).forEach(g => g.forEach(push));
  if (out.length < 3) shuffle(pool.filter(x => x.row === item.row)).forEach(x => { if (out.length < 3) push(x.ch); });
  if (out.length < 3) shuffle(pool).forEach(x => { if (out.length < 3) push(x.ch); });
  return out;
}
function kanaGridHtml() {
  return `<div class="kana-grid">${KANA_ROWS.map(row => row.map(k => k
    ? `<button type="button" class="kana-cell" data-act="speak" data-text="${k}" title="播放"><span class="jp hira">${k}</span><span class="jp kata">${KATA[k]}</span><span class="roma">${KANA_ROMAJI[k]}</span></button>`
    : '<span class="kana-cell empty"></span>').join('')).join('')}</div>`;
}
// Short explanations for the part-of-speech chips shown on questions and cards
const GLOSSARY = {
  n: ['名詞', '人、事、物的名字，例如 本・学生・日本。後面接助詞來表示它在句子裡的角色。'],
  pron: ['代名詞', '代替名詞的詞：私（我）、あなた（你）、これ／それ／あれ（這個／那個）。'],
  q: ['疑問詞', '何（什麼）、誰（誰）、どこ（哪裡）、いつ（什麼時候）、どう（怎麼樣）。放在句中要問的位置，句尾加か。'],
  v5: ['五段動詞', '動詞三類之一（其他教材叫 Ⅰ類／u 動詞）。辭書形不是「i 或 e 段＋る」的動詞大多屬於這類：書く、読む、話す、買う，以及帰る、入る、知る 等例外。變化時字尾會在五十音的五段之間變動，所以叫五段。'],
  v1: ['一段動詞', '動詞三類之一（Ⅱ類／ru 動詞）。辭書形以る結尾，而且る前面是 i 段或 e 段：食べる、見る、起きる、寝る。變化時把る拿掉直接接：食べ＋ます、食べ＋ない。'],
  vs: ['する動詞', '「名詞＋する」的動詞：勉強する、電話する。する是不規則動詞，變化要另外記：します、しない、して。'],
  vk: ['来る', '不規則動詞，只有這一個：来る（くる）。變化時讀音會變：来ます（きます）、来ない（こない）、来て（きて）。'],
  i: ['い形容詞', '原形最後一個字是「い」的形容詞：高い、新しい、おいしい（其他教材叫形容詞／イ形）。直接放在名詞前面：高い山。否定把い改成くない：高くない。'],
  na: ['な形容詞', '原形不以い結尾的形容詞：静か、元気、便利；例外 きれい、嫌い、有名 也是這類（其他教材叫形容動詞／ナ形）。接名詞要加な：静かな部屋；否定用ではない。'],
  adv: ['副詞', '修飾動詞或形容詞，說明程度、頻率、時間：とても（非常）、よく（常常）、もう（已經）、まだ（還）。不用變化，直接放在被修飾的詞前面。'],
  conj: ['接續詞', '連接兩個句子：そして（然後）、でも（但是）、だから（所以）、それから（接著）。'],
  cnt: ['數量詞', '數字加單位：三つ、二人、五本、十枚。讀音常常會變（一つ ひとつ、三本 さんぼん、八百 はっぴゃく），看讀音就好。'],
  exp: ['招呼語', '固定說法，不用分析文法：こんにちは、ありがとうございます、すみません、お願いします。']
};
function glossaryHtml(p) {
  const g = GLOSSARY[p];
  if (!g) return '';
  return `<div class="glossary"><div class="page-title" style="font-size:20px">${esc(g[0])}</div><p class="mt-2">${esc(g[1])}</p>
    <div class="row-wrap mt-3"><button type="button" class="btn btn-sm" data-act="nav" data-route="#/course/intro">第 0 週：完整說明</button></div></div>`;
}
function posChip(p, fallback) {
  return GLOSSARY[p] ? `<button type="button" class="chip chip-link" data-act="glossary" data-term="${esc(p)}" title="這是什麼？">${esc(posLabel(p, fallback))}</button>` : `<span class="chip">${esc(posLabel(p, fallback))}</span>`;
}
// 講義 (2026-11-11, the user: a whole unit at once was too much on a phone; then: a page of its own, its pages all one size, read like
// a book): the unit page lists the parts (lessonTocHtml); #/course/<unit>/read shows them a page at a time (renderLessonReader). The
// lesson flows into pages of the screen's size — each section from a new page, a heading never left at a page's foot, a block taller
// than a page scrolling inside it — turned only by swiping (scroll-snap; a mouse drags, the arrow keys turn too); 重點整理 ends it.
// Turning to the last page the first time gives BOOK_GIFT 言靈 (koto.found 'book-<unit>'). The place is kept while the app is open,
// as the block its page begins with (another size flows it again); read to the end, the book opens at its start again.
const LESSON_AT = {}, BOOK_GIFT = 3;
const lessonRoute = (uid) => `#/course/${uid === 'm0' ? 'intro' : uid}`;
function lessonTocHtml(uid) {
  const L = DATA.LESSONS[uid];
  if (!L) return '<div class="card"><div class="empty">這個單元還沒有講義。</div></div>';
  const to = `${lessonRoute(uid)}/read`;
  const row = (label, at) => `<div class="list-item toc-row" data-act="nav" data-route="${to}?s=${at}" role="button" tabindex="0"><div class="grow">${label}</div><span class="muted">›</span></div>`;
  return `<div class="card"><div class="card-head"><div class="card-title">講義${state.koto.found['book-' + uid] ? ' <span class="chip chip-ok">翻完過</span>' : ''}</div><button type="button" class="btn btn-primary" data-act="nav" data-route="${to}">${uid in LESSON_AT ? '繼續看講義' : '翻開講義'}</button></div>
    <div class="list">${L.formula || L.overview ? row('這個單元', 'top') : ''}${(L.sections || []).map((x, i) => row(`${i + 1}. ${bracketRuby(x.h)}`, i)).join('')}${row('重點整理', 'end')}</div></div>`;
}
// the lesson as blocks to flow into pages: page — begins a page; keep — goes along with the block after it; sec — where ?s= opens
function lessonBlocks(uid, L) {
  const out = [], add = (html, o = {}) => out.push(Object.assign({ html }, o));
  if (L.formula || L.overview) {
    add('<div class="lp-title">這個單元</div>', { page: true, keep: true, sec: 'top' });
    if (L.formula) add(`<div class="panel jp lp-formula">${bracketRuby(L.formula)}</div>`);
    if (L.overview) add(`<p>${bracketRuby(L.overview)}</p>`);
  }
  (L.sections || []).forEach((x, i) => {
    add(`<div><h3>${bracketRuby(x.h)}</h3>${x.rule ? `<div class="rule jp">${bracketRuby(x.rule)}</div>` : ''}</div>`, { page: true, keep: true, sec: String(i) });
    (x.points || []).forEach(p => add(`<ul><li>${bracketRuby(p)}</li></ul>`));
    if (x.kana) add(kanaGridHtml());
    if ((x.ex || []).length) {
      add('<div class="lp-title lp-ex">例句</div>', { keep: true });
      x.ex.forEach(e => add(`<div class="example"><button type="button" class="btn btn-sm btn-ghost btn-icon" data-act="speak" data-text="${esc(e.jp)}" aria-label="朗讀">${icon('speaker')}</button><div><div class="jp">${furi(e.jp)}</div><div class="zh">${esc(e.zh)}</div></div></div>`));
    }
  });
  add('<div class="lp-title">重點整理</div>', { page: true, keep: true, sec: 'end' });
  if (L.tip) add(`<div class="tipbox">${bracketRuby(L.tip)}</div>`);
  add('<div class="lp-fin">— 完 —</div>');
  return out;
}
function renderLessonReader(view, uid, at) {
  const L = DATA.LESSONS[uid], u = uid === 'm0' ? INTRO_UNIT : unitById(uid);
  if (!L || !u) { go(lessonRoute(uid)); return; }
  if (uid === 'm0' && !state.introSeen) { state.introSeen = true; saveState(); }
  view.innerHTML = `<div class="reader" data-unit="${uid}">
    <div class="rd-top"><button type="button" class="btn btn-ghost btn-icon" data-act="nav" data-route="${lessonRoute(uid)}" aria-label="回單元頁">${icon('close')}</button>
      <div class="grow rd-name"><div class="tiny muted">${esc(u.weeks)}・講義</div><div class="rd-title">${esc(u.title)}</div></div></div>
    <div class="rd-track lesson"></div>
    <div class="rd-foot"><div class="rd-bar"><i></i></div><span class="rd-count num"></span></div>
  </div>`;
  const rd = view.querySelector('.reader'), track = rd.querySelector('.rd-track'), blocks = lessonBlocks(uid, L);
  let pages = [], cur = 0;
  const toEl = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };
  const flow = () => {
    track.innerHTML = ''; pages = []; let sheet = null;
    const open = () => { const pg = document.createElement('section'); pg.className = 'rd-page'; sheet = document.createElement('div'); sheet.className = 'rd-sheet'; pg.appendChild(sheet); track.appendChild(pg); pages.push(pg); };
    blocks.forEach((b, i) => {
      if (!sheet || b.page) open();
      const el = toEl(b.html); el.dataset.b = i; if (b.keep) el.dataset.keep = '1'; sheet.appendChild(el);
      if (sheet.scrollHeight <= sheet.clientHeight + 1) return;
      const moving = [el]; let p = el.previousElementSibling;
      while (p && p.dataset.keep) { moving.unshift(p); p = p.previousElementSibling; }
      if (p) { open(); moving.forEach(m => sheet.appendChild(m)); }   // nothing before them: taller than a page, it scrolls in its own
    });
  };
  const first = (i) => Number(pages[i].querySelector('[data-b]').dataset.b);
  const show = (i, turned) => {
    const end = i === pages.length - 1; cur = i;
    if (end) delete LESSON_AT[uid]; else LESSON_AT[uid] = first(i);
    rd.querySelector('.rd-count').textContent = `${i + 1} / ${pages.length}`; rd.querySelector('.rd-bar i').style.width = `${(i + 1) / pages.length * 100}%`;
    if (end && turned && !state.koto.found['book-' + uid]) { state.koto.found['book-' + uid] = BOOK_GIFT; saveState(); setTimeout(() => bookCoins(rd, BOOK_GIFT), 380); }   // once the page has settled
  };
  const toBlock = (b) => { let i = 0; pages.forEach((pg, k) => { if (first(k) <= b) i = k; }); track.scrollLeft = i * track.clientWidth; show(i, false); };
  const again = () => { if (!rd.isConnected) return; const b = first(cur); flow(); toBlock(b); };
  flow();
  const from = at !== undefined ? blocks.findIndex(b => b.sec === at) : -1;
  toBlock(from >= 0 ? from : LESSON_AT[uid] || 0);
  if (at !== undefined) history.replaceState(null, '', `${lessonRoute(uid)}/read`);   // opened at a part: a redraw (我的標記) stays on the page reached
  let raf = 0, resized = 0;
  track.addEventListener('scroll', () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => { if (!rd.isConnected) return; const i = Math.max(0, Math.min(pages.length - 1, Math.round(track.scrollLeft / Math.max(1, track.clientWidth)))); if (i !== cur) show(i, true); }); }, { passive: true });
  // a mouse drags the pages (a touch screen and a trackpad swipe them): a drag past 40 px turns one page
  let drag = null;
  track.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'mouse' || e.button !== 0 || e.target.closest('button')) return;
    drag = { x: e.clientX, left: track.scrollLeft, from: cur }; track.classList.add('dragging'); try { track.setPointerCapture(e.pointerId); } catch (err) { /* not a live pointer */ }
  });
  track.addEventListener('pointermove', (e) => { if (drag) track.scrollLeft = drag.left - (e.clientX - drag.x); });
  const drop = (e) => {
    if (!drag) return; const dx = e.clientX - drag.x, i = Math.max(0, Math.min(pages.length - 1, drag.from + (dx < -40 ? 1 : dx > 40 ? -1 : 0)));
    drag = null; track.classList.remove('dragging'); track.scrollTo({ left: i * track.clientWidth, behavior: 'smooth' });
  };
  track.addEventListener('pointerup', drop); track.addEventListener('pointercancel', drop);
  ['touchend', 'pointerup'].forEach((t) => track.addEventListener(t, () => sfxReady(), { passive: true }));   // the sound woken inside a swipe, so the last page's 叮 can play (iOS)
  const onKey = (e) => {
    if (!rd.isConnected) { document.removeEventListener('keydown', onKey); window.removeEventListener('resize', onSize); return; }
    if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && !modalOpen()) { e.preventDefault(); turnLessonPage(rd, e.key === 'ArrowRight' ? 1 : -1); }
  };
  const onSize = () => { clearTimeout(resized); resized = setTimeout(again, 150); };
  document.addEventListener('keydown', onKey); window.addEventListener('resize', onSize);
  if (document.fonts && document.fonts.status !== 'loaded') document.fonts.ready.then(again);   // the web font changes the lines' lengths
}
// a book read through (2026-11-11, the user: no words, the 言靈 seen and heard): a ring of light at its 完, n glowing あ burst out
// and fly up into a +n badge at the top, which counts up and bounces as each lands with a rising 叮 (as the witch's into the 言靈
// button); motion reduced: the badge with its number
function bookCoins(rd, n) {
  if (!rd.isConnected) return;
  const fin = rd.querySelector('.rd-page:last-child .lp-fin'), r = (fin || rd).getBoundingClientRect(), at = [r.left + r.width / 2, r.top + r.height / 2];
  const pop = document.createElement('div'); pop.className = 'koto-pop book'; pop.setAttribute('role', 'status'); pop.setAttribute('aria-label', `言靈 +${n}`);
  pop.innerHTML = `${kotoIcon()}<b>+0</b>`; document.body.appendChild(pop); setTimeout(() => pop.remove(), 3600);
  const num = pop.querySelector('b');
  if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) { num.textContent = `+${n}`; playSfx('coin'); return; }
  const go = ([x, y], s) => `translate(${x.toFixed(1)}px,${y.toFixed(1)}px) scale(${s.toFixed(2)})`;
  const ring = document.createElement('i'); ring.className = 'koto-burst'; ring.style.left = `${at[0]}px`; ring.style.top = `${at[1]}px`; document.body.appendChild(ring); setTimeout(() => ring.remove(), 600);
  let got = 0;
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 2 + (i - (n - 1) / 2) * 0.9, spot = [at[0] + Math.cos(a) * 34, at[1] + Math.sin(a) * 26];
    const c = document.createElement('i'); c.className = 'koto-coin'; c.innerHTML = kotoIcon(); c.style.opacity = '0'; document.body.appendChild(c);
    c.animate([{ transform: go(at, 0.3), opacity: 0 }, { transform: go(spot, 1.15), opacity: 1 }], { duration: 420, delay: 60 + i * 40, easing: 'cubic-bezier(.2, .8, .3, 1)', fill: 'forwards' });
    setTimeout(() => {   // up into the badge along a curve, faster as it goes
      const t = pop.querySelector('.koto-i').getBoundingClientRect(), to = [t.left + t.width / 2, t.top + t.height / 2], via = [(spot[0] + to[0]) / 2 + (i - 1) * 24, Math.min(spot[1], to[1]) + 60];
      const path = Array.from({ length: 13 }, (_, j) => { const s = j / 12, u = 1 - s;
        return { transform: go([u * u * spot[0] + 2 * u * s * via[0] + s * s * to[0], u * u * spot[1] + 2 * u * s * via[1] + s * s * to[1]], 1.15 - 0.35 * s), opacity: 1 }; });
      c.getAnimations().forEach((x) => x.cancel());
      c.animate(path, { duration: 620, easing: 'cubic-bezier(.45, 0, .8, .6)', fill: 'forwards' }).onfinish = () => {
        c.remove(); got++; num.textContent = `+${got}`;
        num.classList.remove('bump'); void num.offsetWidth; num.classList.add('bump'); playSfx('coin', got - 1);
      };
    }, 700 + i * 160);
  }
}
function turnLessonPage(rd, dir) { const t = rd.querySelector('.rd-track'); t.scrollBy({ left: dir * t.clientWidth, behavior: 'smooth' }); }

const TYPE_LABEL = { choice: '填空', meaning: '句意', order: '排序', conj: '動詞變化', adj: '形容詞變化' };
function itemPreview(g) {
  if (g.t === 'order') return (g.pre || '') + (g.parts || []).join('') + (g.post || '');
  if (g.t === 'conj') return String(g.jp).replace('{V}', `（${g.v}→　）`);
  if (g.t === 'adj') return String(g.jp).replace('{A}', `（${g.w}→　）`);
  return g.jp;
}

function renderUnit(view, uid, tab) {
  const intro = uid === 'm0';
  const u = intro ? INTRO_UNIT : DATA.UNITS.find(x => x.id === uid);
  if (!u) { go('#/course'); return; }
  if (intro && !state.introSeen) { state.introSeen = true; saveState(); }
  const s = unitStats(uid);
  const isCur = state.currentUnit === uid;
  const items = unitItems(uid);
  const legacy = state.legacy && state.legacy.unitPractice && state.legacy.unitPractice[uid];
  const aiNote = state.unitAiNotes && state.unitAiNotes[uid];
  let body = '';
  if (tab === 'items') {
    const rows = items.map(g => {
      const r = state.srs[g.key];
      return `<div class="list-item">
        <span class="chip">${TYPE_LABEL[g.t || 'choice'] || '題目'}</span>
        <div class="grow"><div class="jp">${furi(itemPreview(g))}</div><div class="tiny muted">${esc(g.pt || '')}${g.src === 'ai' ? '・AI' : ''}</div></div>
        <div class="right small muted nowrap">${r ? `${srsDots(r.b)} <span>${dueLabel(r, g.key).replace('複習', '')}</span>` : '未學'}</div>
      </div>`;
    }).join('');
    body = `<div class="card"><div class="card-head"><div class="card-title">本單元題目（${items.length}）</div><span class="small muted">熟練度 ●●●○○ 以上算熟悉</span></div><div class="list">${rows || '<div class="empty">沒有題目</div>'}</div></div>`;
  } else {
    body = `${lessonTocHtml(uid)}
      <div class="card">
        <div class="card-head"><div class="card-title">AI 補充說明</div>${aiNote ? '<button type="button" class="btn btn-sm btn-ghost" data-act="ai-note-clear" data-unit="' + uid + '">清除</button>' : ''}</div>
        <div class="row-wrap"><input class="input grow" id="aiNoteQ" placeholder="想多了解什麼？例如：為什麼乗る用「に」？（可留空）" /><button type="button" class="btn" data-act="ai-note" data-unit="${uid}">請 AI 補充</button></div>
        <div id="aiNoteBox" class="mt-3">${aiNote ? md(aiNote) : (aiReady() ? '' : '<div class="hint">登入後可以請 AI 補充重點（設定 › 資料 › 雲端同步）。</div>')}</div>
      </div>`;
  }
  view.innerHTML = `
    <div class="row mb-3"><button type="button" class="btn btn-ghost btn-sm" data-act="nav" data-route="#/course">${icon('back')}課程</button></div>
    <div class="page-head">
      <div><div class="page-sub">${esc(u.weeks)}・${esc(lvLabel(u.lv))}</div><div class="page-title">${esc(u.title)}</div></div>
      <div class="row-wrap">
        <button type="button" class="btn btn-primary" data-act="start-unit" data-unit="${uid}">練習本單元</button>
        ${intro ? '' : isCur ? '<span class="chip chip-accent">目前單元</span>' : `<button type="button" class="btn" data-act="set-current" data-unit="${uid}">設為目前單元</button>`}
      </div>
    </div>
    <div class="card">
      <div class="row">${unitBarHtml(s, 'grow')}<span class="small num muted">${s.pct}%</span></div>
      <div class="row between mt-2 small">
        <span class="muted legs">${unitLegendHtml(s)}${legacy ? `<span class="leg">舊版累計作答 ${legacy.seen} 題</span>` : ''}</span>
        <span class="row nowrap"><span class="muted">我的標記</span>${markButtonHtml(state.unitMarks[uid] || 0, `data-act="mark-unit" data-unit="${uid}"`)}</span>
      </div>
      ${aiReady() && !intro ? `<div class="row-wrap mt-2"><button type="button" class="btn btn-sm btn-ghost" data-act="ai-unit-items" data-unit="${uid}">${icon('spark')}用 AI 為本單元多出 5 題</button></div>` : ''}
    </div>
    <div class="seg mb-3 mt-4" role="tablist">
      <button type="button" aria-pressed="${tab !== 'items'}" data-act="nav" data-route="#/course/${uid}">講義</button>
      <button type="button" aria-pressed="${tab === 'items'}" data-act="nav" data-route="#/course/${uid}?tab=items">題目與熟練度</button>
    </div>
    ${body}`;
}

function levelPickerHtml() {
  const score = state.settings.duolingoScore || 22;
  const rec = unitById(recommendUnit(score));
  const unitOpts = DATA.UNITS.map(u => `<option value="${u.id}" ${u.id === state.currentUnit ? 'selected' : ''}>${esc(u.weeks)}・${esc(u.short)}</option>`).join('');
  return `
    <div class="row-wrap">${startButtonsHtml()}</div>
    <p class="hint mt-2">沒學過就從假名開始；學過一些可以先做測驗，通過的部分之後會少出。</p>
    <div class="divider"></div>
    <p class="dim small">選擇要從第幾週開始。預設從第 1 週開始；之後可以隨時在課程頁更改。</p>
    <div class="row-wrap mt-3">
      <select class="select" id="startUnit" style="width:auto;min-width:220px">${unitOpts}</select>
      <button type="button" class="btn btn-primary" data-act="start-apply">設為目前單元</button>
    </div>
    <label class="switch mt-3"><input type="checkbox" id="startMarkPrev" /><span class="track"></span><span class="small">同時把之前的單元標為完成</span></label>
    <label class="switch mt-2"><input type="checkbox" id="startExperienced" /><span class="track"></span><span class="small">我已有基礎：不預設顯示中文</span></label>
    <p class="hint mt-2">已經會的單字可以到「單字 → 單字表」依級別或主題整批標成「我會了」，練習時的新字預習卡上也有「我會了」。從 N4 的單元開始的話，新文法要等 N5 的單字、漢字都學過一次才會出；N5 已經會的人可以到課程頁考第一階段測驗，通過就一次跳過。</p>
    <details class="disclose mt-4">
      <summary>不確定從哪裡開始？用多鄰國（Duolingo）分數估計</summary>
      <p class="dim small mt-2">輸入多鄰國日語分數，系統會建議一個起點單元。這只是參考。</p>
      <div class="row-wrap mt-2">
        <input class="input" type="number" min="1" max="160" id="duoScore" value="${score}" style="width:120px" />
        <button type="button" class="btn" data-act="duo-preview">更新建議</button>
      </div>
      <div class="panel mt-3" id="duoRec">建議起點：<b>${esc(rec.weeks)}・${esc(rec.title)}</b></div>
      <div class="row-wrap mt-3">
        <button type="button" class="btn" data-act="duo-apply">採用建議的起點</button>
      </div>
    </details>`;
}
// 「我已有基礎」: no Chinese shown by default (it stays adjustable in 設定); new items follow the recent answers, as for everyone
// 起點三選一: 從零開始 (入門: kana first) / 已會假名 (main course, kana never scheduled as new) / 已有 N5 基礎 (plus the 我已有基礎 settings)
function chooseStart(kind, quiet = false) {
  state.stage = kind === 'zero' ? 'pre' : 'main';
  state.kanaKnown = kind !== 'zero';
  if (kind === 'basics') applyExperienced();
  state.startChosen = true;
  saveState(); DAILY_CACHE = null; closeModal(true);
  if (!quiet) toast(kind === 'zero' ? '從假名開始。點書房桌上的筆記本開始練習。' : kind === 'kana' ? '從第 1 週開始' : '已套用「我已有基礎」設定');
  route();
}
function startButtonsHtml(small = true) {
  const c = small ? 'btn btn-sm' : 'btn';
  return `<button type="button" class="${c} btn-primary" data-act="start-zero">我是新手</button><button type="button" class="${c}" data-act="start-test">我學過一些</button>`;
}
const EXPERIENCED_SETTINGS = { showZh: false };
function applyExperienced() { Object.assign(state.settings, EXPERIENCED_SETTINGS); saveState(); }
// make `unit` the current unit; optionally mark every earlier unit as completed and apply the 我已有基礎 settings
function applyStartUnit(unit, markPrev, experienced = false) {
  if (!DATA.UNITS.some(u => u.id === unit)) return;
  state.currentUnit = unit;
  if (markPrev) DATA.UNITS.slice(0, unitOrder(unit)).forEach(u => { if (!state.completedUnits.includes(u.id)) state.completedUnits.push(u.id); });
  if (experienced) applyExperienced();
  saveState(); closeModal(); toast(`目前單元：${unitById(unit).weeks}・${unitById(unit).short}${experienced ? '・已套用「我已有基礎」設定' : ''}`); route();
}

Object.assign(ACTIONS, {
  'set-current': (el) => { state.currentUnit = el.dataset.unit; saveState(); toast(`目前單元：${unitById(el.dataset.unit).weeks}`); route(); },
  'course-shelf': (el) => {   // a book on 課程's shelf: its stage opens below and comes into view
    const d = document.querySelector(`#view details.stage-card[data-stage="${el.dataset.stage}"]`); if (!d) return;
    d.open = true; courseOpen[el.dataset.stage] = true; scrollBelowTopbar(d);
  },
  // 我的標記 on a unit's page (2026-11-11, the user; it was 標記為已完成): 2★／5★ its questions up to that many stars and the
  // unit done; 0★ the questions back to before the mark (ones answered since keep their answers) and the unit not done.
  // 第 0 週 has it too (2026-11-11, the user): its items count as seen, so 入門 may then end by itself (finishPreIfReady)
  'mark-unit': (el) => {
    const id = el.dataset.unit, lv = Number(el.dataset.lv);
    if ((state.unitMarks[id] || 0) === lv) return;
    unitItems(id).forEach(g => { if (lv) markItem(g.key, lv, false); else unmarkItem(g.key, false); });
    if (lv) { state.unitMarks[id] = lv; if (!state.completedUnits.includes(id)) state.completedUnits.push(id); }
    else { delete state.unitMarks[id]; state.completedUnits = state.completedUnits.filter(x => x !== id); }
    DAILY_CACHE = null; saveState();
    toast(lv ? `這個單元的題目標成 ${lv}★（已經更熟的照舊）${lv === 5 ? '，之後排進五顆的複習' : '，過幾天開始複習'}` : '已取消標記：題目回到標記前，標記後答過的照舊');
    route();
  },
  'open-level': () => openModal('依程度選擇起點', levelPickerHtml(), { width: 520 }),
  'duo-preview': () => {
    const v = Number(document.getElementById('duoScore').value) || 22;
    const rec = unitById(recommendUnit(v));
    document.getElementById('duoRec').innerHTML = `建議起點：<b>${esc(rec.weeks)}・${esc(rec.title)}</b>`;
  },
  'start-apply': () => applyStartUnit(document.getElementById('startUnit').value, document.getElementById('startMarkPrev').checked, (document.getElementById('startExperienced') || {}).checked),
  'duo-apply': () => {
    const v = clamp(Number(document.getElementById('duoScore').value) || 22, 1, 160);
    state.settings.duolingoScore = v;
    applyStartUnit(recommendUnit(v), document.getElementById('startMarkPrev').checked, (document.getElementById('startExperienced') || {}).checked);
  },
  'ai-note': (el) => aiUnitNote(el.dataset.unit, (document.getElementById('aiNoteQ') || {}).value || '', el),
  'ai-note-clear': (el) => { delete state.unitAiNotes[el.dataset.unit]; saveState(); route(); },
  'ai-unit-items': (el) => aiGenerateUnitItems(el.dataset.unit, el)
});
