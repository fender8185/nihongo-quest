'use strict';
/* ==========================================================================
   Mock exam (JLPT structure), runner, results, history
   ========================================================================== */
const EXAM_SECTIONS = {
  S1: '言語知識（文字・語彙）',
  S2: '言語知識（文法）・読解',
  S3: '聴解'
};
// 大題 of each level's paper (spec §7): title, instruction and kind. N3 adds 内容理解（長文） and 概要理解, so its 情報検索,
// 発話表現 and 即時応答 come one number later; assembling, playing and the AI items go by the kind, never the number
const MONDAI_N5N4 = {
  'S1-M1': { t: '問題1　漢字読み', d: '畫線的字怎麼讀？', k: 'reading' },
  'S1-M2': { t: '問題2　表記', d: '畫線的字寫成漢字是？', k: 'kanji' },
  'S1-M3': { t: '問題3　文脈規定', d: '選出最適合填入（　）的詞。', k: 'context' },
  'S1-M4': { t: '問題4　言い換え類義', d: '選出和畫線部分意思最接近的句子。', k: 'paraphrase' },
  'S1-M5': { t: '問題5　用法', d: '選出用法正確的句子。', k: 'usage' },
  'S2-M1': { t: '問題1　文の文法1', d: '選出最適合填入（　）的選項。', k: 'grammar' },
  'S2-M2': { t: '問題2　文の文法2', d: '排出正確順序，選出放在 ★ 的選項。', k: 'order' },
  'S2-M3': { t: '問題3　文章の文法', d: '閱讀文章，選出最適合填入空格的選項。', k: 'textgrammar' },
  'S2-M4': { t: '問題4　内容理解（短文）', d: '閱讀短文後回答問題。', k: 'passage' },
  'S2-M5': { t: '問題5　内容理解（中文）', d: '閱讀文章後回答問題。', k: 'passage' },
  'S2-M6': { t: '問題6　情報検索', d: '從資料中找出答案。', k: 'passage' },
  'S3-M1': { t: '問題1　課題理解', d: '先聽問題與對話，選出接下來要做的事。', k: 'task' },
  'S3-M2': { t: '問題2　ポイント理解', d: '先聽問題，再聽對話，選出答案。', k: 'task' },
  'S3-M3': { t: '問題3　発話表現', d: '看情境，選出最合適的說法。', k: 'scene' },
  'S3-M4': { t: '問題4　即時応答', d: '聽一句話，選出最合適的回應。', k: 'resp' }
};
const MONDAI_LV = (() => { const M = MONDAI_N5N4; return {
  N5: M, N4: M,
  N3: { 'S1-M1': M['S1-M1'], 'S1-M2': M['S1-M2'], 'S1-M3': M['S1-M3'], 'S1-M4': M['S1-M4'], 'S1-M5': M['S1-M5'],
    'S2-M1': M['S2-M1'], 'S2-M2': M['S2-M2'], 'S2-M3': M['S2-M3'],
    // N3's 読解 and 聴解 also take the level's practice items when the curated ones run short (read: those kinds; listen: by type)
    'S2-M4': Object.assign({}, M['S2-M4'], { read: ['memo', 'email', 'notice', 'message', 'diary', 'schedule'] }),
    'S2-M5': Object.assign({}, M['S2-M5'], { read: ['essay', 'article'] }),
    'S2-M6': { t: '問題6　内容理解（長文）', d: '閱讀長篇文章後回答問題。', k: 'passage', read: ['long'] },
    'S2-M7': { t: '問題7　情報検索', d: '從資料中找出答案。', k: 'passage', read: ['info'] },
    'S3-M1': Object.assign({}, M['S3-M1'], { listen: true }), 'S3-M2': Object.assign({}, M['S3-M2'], { listen: 'point' }),   // ポイント理解: the dialogs marked point
    'S3-M3': { t: '問題3　概要理解', d: '聽一段話，選出說話的人主要想說什麼。', k: 'gist', listen: true },
    'S3-M4': Object.assign({}, M['S3-M3'], { t: '問題4　発話表現', listen: true }), 'S3-M5': Object.assign({}, M['S3-M4'], { t: '問題5　即時応答', listen: true }) } }; })();
function mondai(level, m) { return (MONDAI_LV[level] || MONDAI_N5N4)[m] || null; }
// questions per mondai for each paper size (passage mondai count passages)
function examLevels() { return courseLevels().filter(L => EXAM_PLAN[L]); }   // the levels with a mock exam (spec §7)
const EXAM_PLAN = {
  N5: { time: { S1: 20, S2: 40, S3: 30 }, pass: 80,
    mondai: { 'S1-M1': [2, 4, 7], 'S1-M2': [1, 3, 5], 'S1-M3': [2, 3, 6], 'S1-M4': [1, 2, 3], 'S2-M1': [2, 5, 9], 'S2-M2': [1, 2, 4], 'S2-M3': [0, 1, 1], 'S2-M4': [1, 1, 2], 'S2-M5': [0, 1, 1], 'S2-M6': [0, 1, 1], 'S3-M1': [1, 3, 6], 'S3-M2': [1, 3, 6], 'S3-M3': [1, 2, 4], 'S3-M4': [1, 3, 6] } },
  N4: { time: { S1: 25, S2: 55, S3: 35 }, pass: 90,
    mondai: { 'S1-M1': [2, 4, 7], 'S1-M2': [1, 3, 5], 'S1-M3': [2, 4, 8], 'S1-M4': [1, 2, 4], 'S1-M5': [1, 2, 4], 'S2-M1': [3, 6, 13], 'S2-M2': [1, 2, 4], 'S2-M3': [0, 1, 1], 'S2-M4': [1, 2, 3], 'S2-M5': [0, 1, 1], 'S2-M6': [0, 1, 2], 'S3-M1': [1, 3, 6], 'S3-M2': [1, 3, 6], 'S3-M3': [1, 2, 4], 'S3-M4': [1, 3, 8] } },
  // N3 (1.0.33): the full paper as JLPT's 問題の構成 (unchanged in 2020); 読解 counts passages: 短文 4×1, 中文 2×3, 長文 1×4, 情報検索 1×2
  N3: { time: { S1: 30, S2: 70, S3: 40 }, pass: 95, three: true,
    mondai: { 'S1-M1': [2, 4, 8], 'S1-M2': [2, 3, 6], 'S1-M3': [3, 6, 11], 'S1-M4': [1, 3, 5], 'S1-M5': [1, 3, 5], 'S2-M1': [3, 7, 13], 'S2-M2': [1, 3, 5], 'S2-M3': [0, 1, 1], 'S2-M4': [2, 2, 4], 'S2-M5': [0, 1, 2], 'S2-M6': [0, 1, 1], 'S2-M7': [0, 1, 1], 'S3-M1': [1, 3, 6], 'S3-M2': [1, 3, 6], 'S3-M3': [1, 2, 3], 'S3-M4': [1, 2, 4], 'S3-M5': [2, 4, 9] } }
};
// 得点区分 (spec §7): N5/N4 score 言語知識・読解 0–120 and 聴解 0–60 (at least 38 and 19); from N3 up three parts of 0–60 each,
// 言語知識（文字・語彙・文法）, 読解 and 聴解, each at least 19 (N2 and N1 only differ in the pass mark)
function scoreParts(level) {
  return EXAM_PLAN[level] && EXAM_PLAN[level].three ? [['lang', 60, 19, '言語知識（文字・語彙・文法）'], ['read', 60, 19, '読解'], ['li', 60, 19, '聴解']]
    : [['lr', 120, 38, '言語知識（文字・語彙・文法）・読解'], ['li', 60, 19, '聴解']];
}
function partOf(q, three) { return q.sec === 'S3' ? 'li' : !three ? 'lr' : q.sec === 'S1' || ['grammar', 'order', 'textgrammar'].includes(q.mk) ? 'lang' : 'read'; }
const SIZE_INDEX = { mini: 0, std: 1, full: 2 };
let EXAM = null;

function examSeen(id) { return state.questionHistory[id] || null; }
// plain text of a question stem (no ruby readings, blanks as （　）)
function examPlain(q) { return htmlToPlain(q.stemHtml || '') || htmlToPlain(q.passageHtml || '').slice(0, 60); }

// ---------- building exam questions ----------
function exQ(base) {
  return Object.assign({ id: uid('x'), kind: 'x', options: [], answer: 0, wide: false, why: '', stemHtml: '', instr: '', passageHtml: '', audio: '' }, base);
}
function exOptions(q, correct, wrongs, jp) { finalizeOptions(q, correct, wrongs, jp); return q; }
function underlineMarked(s) {
  // ＿＿target＿＿ → underlined
  const parts = String(s).split('＿＿');
  return parts.map((p, i) => (i % 2 ? `<span class="uline">${furi(p)}</span>` : furi(p))).join('');
}
function curatedUnits(level) {
  const items = DATA.EXAM.concat(state.customExam || []).filter(x => x.lv === level && !state.hidden.includes(x.id));
  return items.map(x => examUnit(x, (mondai(level, x.m) || {}).k)).filter(Boolean);
}
// one exam item as a unit of the paper, its questions built by the 大題's kind: a curated or AI-made item, or a practice listening or
// reading item asked in the paper (bankUnit)
function examUnit(x, k) {
  const m = x.m;
  const why = x.why || '';
  if (x.legacy || (!x.qs && x.q && !x.script && !x.line && !x.scene)) {
    if (!Array.isArray(x.op) || !x.op.includes(x.a)) return null;
    const q = exQ({ examId: x.id, m, stemHtml: furi(x.q || x.jp || '', { plain: k === 'reading' }), why, passageHtml: x.passage ? furi(x.passage).replace(/\n/g, '<br>') : '', fullJp: x.speak || '' });
    if (String(m).startsWith('S3')) { q.audio = x.speak || x.q; q.script = x.speak || ''; }
    exOptions(q, x.a, x.op.filter(o => o !== x.a), true);
    q.wide = q.options.some(o => o.text.length > 12);
    return { m, ids: [x.id], qs: [q] };
  }
  if (k === 'context' || k === 'grammar') {
    const b = splitBlank(x.jp || '');
    if (!b || !x.op.includes(x.a)) return null;
    const q = exQ({ examId: x.id, m, stemHtml: `${furi(b.pre)}${blankChip('')}${furi(b.post)}`, fillHtml: furi(x.a), fullJp: b.pre + x.a + b.post, why });
    exOptions(q, x.a, x.op.filter(o => o !== x.a), true);
    return { m, ids: [x.id], qs: [q] };
  } else if (k === 'paraphrase') {
    const q = exQ({ examId: x.id, m, stemHtml: underlineMarked(x.jp), fullJp: String(x.jp).replace(/＿＿/g, ''), why, wide: true });
    exOptions(q, x.a, x.op.filter(o => o !== x.a), true);
    q.wide = true;
    return { m, ids: [x.id], qs: [q] };
  } else if (k === 'usage') {
    const q = exQ({ examId: x.id, m, stemHtml: furi(x.word), stemClass: 'word', why, wide: true });
    exOptions(q, x.a, x.op.filter(o => o !== x.a), true);
    q.wide = true;
    return { m, ids: [x.id], qs: [q] };
  } else if (k === 'textgrammar' || k === 'passage') {
    if (!x.passage || !Array.isArray(x.qs)) return null;
    const qs = x.qs.map((qq, j) => {
      const q = exQ({ examId: `${x.id}#${j}`, m, passageHtml: furi(x.passage).replace(/\n/g, '<br>'), stemHtml: k === 'textgrammar' ? `（${'１２３４５'[j]}）に入るものは？` : furi(qq.q || ''), why: j === x.qs.length - 1 ? why : '', group: x.id });
      exOptions(q, qq.a, (qq.op || []).filter(o => o !== qq.a), true);
      q.wide = q.options.some(o => o.text.length > 10);
      return q;
    });
    return { m, ids: [x.id], qs };
  } else if (k === 'task' || k === 'gist') {
    const q = exQ({ examId: x.id, m, stemHtml: furi(x.q || ''), audio: x.script, script: x.script, why });
    exOptions(q, x.a, x.op.filter(o => o !== x.a), true);
    q.wide = q.options.some(o => o.text.length > 10);
    return { m, ids: [x.id], qs: [q] };
  } else if (k === 'scene') {
    const q = exQ({ examId: x.id, m, stemHtml: `<div class="small dim" style="font-size:15px">${esc(x.scene || '')}</div><div class="mt-2">${furi(x.q || '何と言いますか。')}</div>`, why, audio: '' });
    exOptions(q, x.a, x.op.filter(o => o !== x.a), true);
    q.wide = true;
    return { m, ids: [x.id], qs: [q] };
  } else if (k === 'resp') {
    const q = exQ({ examId: x.id, m, stemHtml: '<div class="small muted">聽對方說的話，選出回應。</div>', audio: x.line, script: x.line, why });
    exOptions(q, x.a, x.op.filter(o => o !== x.a), true);
    q.wide = true;
    return { m, ids: [x.id], qs: [q] };
  }
  return null;
}
function derivedQuestion(item, m, k) {
  let q = null;
  if (k === 'reading' || k === 'kanji') {
    const fmt = k === 'reading' ? 'v-reading' : 'v-kanji';
    q = makeVocabQuestion(item, { forceFmt: fmt });
    if (!q || q.fmt !== fmt) return null;
  } else {
    q = makeGrammarQuestion(item, { forceFmt: 'g-choice' });   // the mock exam always asks the plain fill-in
    if (!q || q.forceZh || !['g-choice', 'g-conj', 'g-adj', 'g-order'].includes(q.fmt)) return null;
  }
  return Object.assign(q, { examId: 'd:' + item.key + ':' + m, m, srcKey: item.key, zhText: '', label: '' });
}
function derivedUnits(level, m, need, usedKeys) {
  if (need <= 0) return [];
  let pool = []; const md = mondai(level, m) || {}; const k = md.k;
  if (md.read) pool = REG.read.filter(x => x.lv === level && md.read.includes(x.rkind));
  else if (md.listen) pool = REG.listen.filter(x => x.lv === level && listenKind(x) === (md.listen === true ? k : md.listen));
  else if (k === 'reading' || k === 'kanji') pool = REG.vocab.filter(v => v.lv === level && HAS_KANJI.test(v.w));
  else if (k === 'grammar') pool = REG.grammar.filter(g => g.lv === level && ['choice', 'conj', 'adj'].includes(g.t || 'choice'));
  else if (k === 'order') pool = REG.grammar.filter(g => g.lv === level && g.t === 'order');
  const ranked = rankBySeen(shuffle(pool), it => ['d:' + it.key + ':' + m, 'd:' + it.key + ':' + m + '#0']);   // a passage records its question
  const out = [];
  for (const it of ranked) {
    if (out.length >= need) break;
    if (usedKeys.has(it.key)) continue;
    const q = md.read || md.listen ? null : derivedQuestion(it, m, k);
    const u = md.read || md.listen ? bankUnit(it, m, k) : q && { m, ids: [q.examId], qs: [q] };
    if (!u) continue;
    usedKeys.add(it.key);
    out.push(u);
  }
  return out;
}
// a practice listening item's kind in the paper; a practice listening or reading item asked as a unit of it
function listenKind(x) { return x.t === 'dialog' ? (x.lkind === 'gist' || x.lkind === 'point' ? x.lkind : 'task') : x.t; }   // a dialog: 課題理解, ポイント理解 (point) or 概要理解 (gist)
function bankUnit(it, m, k) {
  const id = 'd:' + it.key + ':' + m;
  return examUnit(it.passage ? { id, m, passage: it.passage, qs: [{ q: it.q, op: it.op, a: it.a }], why: it.why }
    : { id, m, script: it.script, scene: it.scene, line: it.line, q: it.q, op: it.op, a: it.a, why: it.why }, k);
}
function rankBySeen(list, idOf) {   // idOf: an id, or the ids of a unit's questions
  const strat = (EXAM && EXAM.strategy) || examStrategy();
  const info = (x) => { const hs = [].concat(idOf(x)).map(examSeen).filter(Boolean); return hs.find(h => h.lastResult === 'wrong') || hs[0] || null; };   // one id or a unit's questions: wrong if any was
  if (strat === 'wrong') return list.filter(x => { const h = info(x); return h && h.lastResult === 'wrong'; }).concat(list.filter(x => { const h = info(x); return !(h && h.lastResult === 'wrong'); }));
  if (strat === 'random') return list;
  return list.filter(x => !info(x)).concat(list.filter(x => info(x)));
}
function examStrategy() { return (document.getElementById('exStrategy') || {}).value || 'unseen'; }

function assemblePaper(level, size, subjects) {
  const plan = EXAM_PLAN[level];
  const si = SIZE_INDEX[size] ?? 1;
  const curated = curatedUnits(level);
  const usedKeys = new Set();
  const paper = [];
  const shortage = [];
  Object.keys(plan.mondai).forEach(m => {
    const sec = m.slice(0, 2);
    if (!subjects.includes(sec)) return;
    const want = plan.mondai[m][si];
    if (!want) return;
    let units = rankBySeen(shuffle(curated.filter(u => u.m === m)), u => u.qs.map(q => q.examId));   // a passage is seen when any question is
    // freshly generated AI items go first so the learner actually sees them
    if (EXAM && EXAM.prefer) units = units.filter(u => EXAM.prefer.has(u.ids[0])).concat(units.filter(u => !EXAM.prefer.has(u.ids[0])));
    units = units.slice(0, want);
    if (units.length < want) units = units.concat(derivedUnits(level, m, want - units.length, usedKeys));
    const md = mondai(level, m);
    if (units.length < want) shortage.push(`${md.t.replace('　', ' ')}（${units.length}/${want}）`);
    units.forEach(u => u.qs.forEach(q => paper.push(Object.assign(q, { sec, mk: md.k, mondaiTitle: md.t, mondaiDesc: md.d, isListening: sec === 'S3' }))));
  });
  return { paper, shortage };
}

// ---------- exam page ----------
// 考試倒數 (模擬考 page): days left and the 課程進度 line for the target level (1.0.26: the per-unit pace went, it could
// disagree with the projection)
// 1.1.0: beside it hangs 書房's 日めくり — the month, the date, the weekday, the streak's red stamp, the days to the exam
function examCountdownHtml() {
  const p = coursePace(), d = parseDate(todayStr()), wd = d.getDay(), n = streakStats().current;
  return `<div class="card exam-cal-card">
      <div class="day-cal" aria-hidden="true"><div class="sheet">
        <div class="mon">${jMonth(d.getMonth())}</div><div class="date${wd === 6 ? ' sat' : wd === 0 ? ' sun' : ''}">${d.getDate()}</div><div class="wd${wd === 6 ? ' sat' : wd === 0 ? ' sun' : ''}">${'日月火水木金土'[wd]}曜日</div>
        ${n ? `<div class="stamp">${n}日連続</div>` : ''}<div class="left">${p.daysLeft > 0 ? `試験まで${p.daysLeft}日` : '試験の日'}</div>
      </div></div>
      <div class="grow">
        <div class="card-head"><div class="card-title">考試倒數</div>${courseChip(p)}</div>
        <div class="stat"><span class="stat-v">${p.daysLeft} 天</span><span class="stat-l">距離 ${esc(p.exam.replace(/-/g, '/'))} JLPT ${p.level}</span></div>
        ${p.state === 'passed' || p.state === 'close' ? `<div class="small dim mt-2 hero-advice">${esc(courseText(p))}</div>` : ''}
      </div>
    </div>`;
}
function renderExam(view, sub, params) {
  if (sub === 'result' && EXAM && EXAM.finished) { renderExamResult(view); return; }
  const hist = state.examHistory || [];
  const best = (lv) => { const r = hist.filter(h => h.level === lv && h.total180 !== undefined); return r.length ? Math.max(...r.map(h => h.total180)) : null; };
  const rows = hist.slice(0, 30).map((h, i) => `<div class="list-item">
      <div class="grow">
        <div>${esc(h.examTitle || '')}${h.isAiMock ? ' <span class="chip">AI</span>' : ''}</div>
        <div class="tiny muted num">${esc(h.dateStr || '')}・${h.correctCount}/${h.totalCount} 題・${formatDuration(h.durationSec)}</div>
      </div>
      <div class="right nowrap"><b class="num">${h.total180 !== undefined ? h.total180 + ' / 180' : (h.scorePct || 0) + '%'}</b>
        <div>${h.total180 === undefined ? '' : h.passedOfficial ? '<span class="chip chip-ok">達合格線</span>' : '<span class="chip">未達</span>'}</div></div>
      ${Array.isArray(h.questionLogs) && h.questionLogs.length ? `<button type="button" class="btn btn-sm btn-ghost" data-act="exam-review" data-i="${i}">回顧</button>` : ''}
    </div>`).join('');
  const lvDefault = examLevels().filter(L => ALL_LEVELS.indexOf(L) <= ALL_LEVELS.indexOf(unitLevel(state.currentUnit))).pop() || examLevels()[0];
  view.innerHTML = `
    <div class="page-head"><div><div class="page-title">模擬考</div><div class="page-sub">照 JLPT 的科目和題型出題。</div></div></div>
    ${examCountdownHtml()}
    <div class="card">
      <div class="grid grid-3">
        <div class="field"><label>級數</label><select class="select" id="exLevel">${examLevels().map(l => `<option ${l === lvDefault ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
        <div class="field"><label>份量</label><select class="select" id="exSize"><option value="mini">迷你</option><option value="std" selected>標準</option><option value="full">完整</option></select></div>
        <div class="field"><label>出題方式</label><select class="select" id="exStrategy"><option value="unseen">優先出沒考過的題目</option><option value="random">隨機</option><option value="wrong">優先出上次答錯的題目</option></select></div>
      </div>
      <div class="mt-3">
        <div class="small muted">科目</div>
        ${['S1', 'S2', 'S3'].map(s => `<div class="mt-2"><label class="switch"><input type="checkbox" class="exSubj" value="${s}" checked /><span class="track"></span><span class="small">${EXAM_SECTIONS[s]}</span></label></div>`).join('')}
      </div>
      <div class="row-wrap mt-3">
        <label class="switch"><input type="checkbox" id="exFormal" ${state.settings.examFormal ? 'checked' : ''} /><span class="track"></span><span class="small" title="各科目分開計時、結束的科目不能回頭、聽解只播一次、発話表現和即時応答的選項只用聽的">正式模式（像真的考試，分科計時）</span></label>
      </div>
      <div class="row-wrap mt-2">
        <label class="switch"><input type="checkbox" id="exInstant" ${state.settings.examInstant ? 'checked' : ''} /><span class="track"></span><span class="small">每題答完就看解答</span></label>
      </div>
      <div class="row-wrap mt-4">
        <button type="button" class="btn btn-primary" data-act="exam-start">開始考試</button>
        ${aiReady() ? '<button type="button" class="btn" data-act="exam-ai">先請 AI 出 8 道新題再開始</button>' : ''}
      </div>
      <p class="hint mt-3">分數是估計的，僅供參考。</p>
    </div>
    <div class="grid grid-3">
      <div class="card"><div class="stat"><span class="stat-v">${hist.length}</span><span class="stat-l">考試次數</span></div></div>
      ${examLevels().map(L => { const b = best(L); return `<div class="card"><div class="stat"><span class="stat-v">${b === null ? '—' : b}</span><span class="stat-l">${L} 最高分（合格線 ${EXAM_PLAN[L].pass}）</span></div></div>`; }).join('')}
    </div>
    ${stageTestCardHtml()}
    <div class="card">
      <div class="card-head"><div class="card-title">考試紀錄</div>${hist.length ? '<button type="button" class="btn btn-sm btn-ghost btn-danger" data-act="exam-clear">清除紀錄</button>' : ''}</div>
      ${hist.length ? `<div class="list">${rows}</div>` : '<div class="empty">還沒有考試紀錄。</div>'}
    </div>`;
}
// 階段測驗 on the 模擬考 page: a start button per stage and every recorded result, newest first
function stageTestCardHtml() {
  const recs = [];
  STAGES.forEach((st, si) => ((state.stageTests || {})[st.id] || []).forEach((h, hi) => { if (h) recs.push({ st, si, hi, h }); }));
  recs.sort((a, b) => String(b.h.date || '').localeCompare(String(a.h.date || '')) || a.si - b.si || a.hi - b.hi);
  const rows = recs.slice(0, 30).map(({ st, h }) => `<div class="list-item">
      <div class="grow"><div>${esc(st.title)}・階段測驗</div><div class="tiny muted num">${esc(h.date || '')}</div></div>
      <div class="right nowrap"><b class="num">${Number(h.correct) || 0} / ${Number(h.total) || 0}</b>
        <div>${h.passed ? '<span class="chip chip-ok">通過</span>' : '<span class="chip">未通過</span>'}</div></div>
    </div>`).join('');
  const btns = STAGES.map(st => `<button type="button" class="btn btn-sm" data-act="stage-test" data-stage="${st.id}">${esc(st.title)}</button>`).join('');
  return `<div class="card" id="stageTests">
      <div class="card-head"><div><div class="card-title">階段測驗</div><div class="card-sub">40 題，答對 8 成就通過；通過的部分之後會少出。</div></div></div>
      <div class="row-wrap">${btns}</div>
      ${rows ? `<div class="list mt-3">${rows}</div>` : '<div class="empty mt-3">還沒有階段測驗紀錄。</div>'}
    </div>`;
}
function formatDuration(sec) {
  const s = Math.max(0, Math.round(sec || 0));
  const m = Math.floor(s / 60);
  return m ? `${m} 分 ${pad2(s % 60)} 秒` : `${s} 秒`;
}

function startExam(opt = {}) {
  const level = opt.level || (document.getElementById('exLevel') || {}).value || examLevels()[0];
  const size = opt.size || (document.getElementById('exSize') || {}).value || 'std';
  const subjects = opt.subjects || $$('.exSubj').filter(x => x.checked).map(x => x.value);
  const instantEl = document.getElementById('exInstant');
  const formalEl = document.getElementById('exFormal');
  if (instantEl) state.settings.examInstant = instantEl.checked;
  if (formalEl) state.settings.examFormal = formalEl.checked;
  saveState();
  if (!subjects.length) { toast('請至少選一個科目'); return; }
  const formal = opt.formal !== undefined ? opt.formal : Boolean(state.settings.examFormal);
  EXAM = { strategy: examStrategy(), prefer: opt.prefer ? new Set(opt.prefer) : null };
  const { paper, shortage } = assemblePaper(level, size, subjects);
  if (!paper.length) { toast('題庫不足，無法組卷'); EXAM = null; return; }
  const plan = EXAM_PLAN[level];
  const fullTime = subjects.reduce((a, s) => a + plan.time[s], 0);
  const factor = size === 'full' ? 1 : size === 'std' ? 0.5 : 15 / fullTime;
  const sections = ['S1', 'S2', 'S3'].filter(sec => paper.some(q => q.sec === sec)).map(sec => {
    const idx = paper.map((q, i) => (q.sec === sec ? i : -1)).filter(i => i >= 0);
    return { sec, limitMin: Math.max(3, Math.round(plan.time[sec] * factor)), from: idx[0], to: idx[idx.length - 1], start: null, end: null };
  });
  if (formal) {
    // 聴解 問題3・4: the replies are only spoken, as in the real test
    paper.forEach(q => {
      if (q.mk !== 'scene' && q.mk !== 'resp') return;
      q.audioOptions = true;
      if (q.mk === 'scene') q.audio = '';   // the scene is read on screen; the replies are played per option
    });
  }
  const sizeLabel = { mini: '迷你', std: '標準', full: '完整' }[size];
  EXAM = Object.assign(EXAM, {
    level, size, subjects, paper, idx: 0, answers: new Array(paper.length).fill(-1), locked: new Array(paper.length).fill(false),
    title: `JLPT ${level} 模擬考（${sizeLabel}・${paper.length} 題${formal ? '・正式模式' : ''}）${opt.ai ? '・含 AI 新題' : ''}`, isAi: Boolean(opt.ai),
    start: Date.now(), limitMin: sections.reduce((a, s) => a + s.limitMin, 0), instant: formal ? false : state.settings.examInstant,
    finished: false, shortage, formal, sections, secIdx: 0
  });
  sections[0].start = Date.now();
  if (shortage.length && size === 'full') toast(`部分大題題庫不足：${shortage.slice(0, 3).join('、')}${shortage.length > 3 ? '…' : ''}`, 4200);
  go('#/exam/run');
}

function examSection() { return EXAM.sections[EXAM.secIdx]; }
function examRemaining() { const s = examSection(); return s.limitMin * 60 - Math.floor((Date.now() - s.start) / 1000); }
// formal mode: questions of finished subjects cannot be reopened
function examIdxAllowed(i) { const s = examSection(); return !EXAM.formal || (i >= s.from && i <= s.to); }
function examEndSection(auto) {
  examSection().end = Date.now();
  stopSpeaking();
  if (EXAM.secIdx >= EXAM.sections.length - 1) { finishExam(); return; }
  EXAM.secIdx++;
  const n = examSection();
  n.start = Date.now();
  EXAM.idx = n.from;
  toast(auto ? `時間到，進入「${EXAM_SECTIONS[n.sec]}」` : `進入「${EXAM_SECTIONS[n.sec]}」`, 3200);
  renderExamRunner();
  window.scrollTo({ top: 0 });
}

let examTimer = null;
function renderExamRunner() {
  const view = document.getElementById('view');
  if (!EXAM || EXAM.finished) { go('#/exam'); return; }
  document.body.classList.add('practicing');
  const q = EXAM.paper[EXAM.idx];
  const total = EXAM.paper.length;
  const ans = EXAM.answers[EXAM.idx];
  const locked = EXAM.locked[EXAM.idx];
  const answeredN = EXAM.answers.filter(a => a >= 0).length;
  const prev = EXAM.paper[EXAM.idx - 1];
  const showHeader = !prev || prev.m !== q.m;
  const sec = examSection();
  const lastSection = EXAM.secIdx >= EXAM.sections.length - 1;
  const opts = q.options.map((o, i) => {
    let cls = 'opt' + (o.jp ? '' : ' zh') + (jaPlain(o.text).length > 14 ? ' long' : '');
    if (locked) { if (i === q.answer) cls += ' correct'; else if (i === ans) cls += ' wrong'; else cls += ' faded'; }
    else if (i === ans) cls += ' correct';
    if (q.audioOptions && !locked) return audioOptionHtml(i, cls, o, 'exam-answer', false);
    const text = optionHtml(q, o);
    return `<button type="button" class="${cls}" data-act="exam-answer" data-i="${i}" ${locked ? 'disabled' : ''}><span class="kbd">${i + 1}</span><span class="${optClass(o)}">${text}</span></button>`;
  }).join('');
  let stem = q.stemHtml || '';
  if (locked && q.fillHtml) stem = stem.replace(/<span class="blank" data-blank>[\s\S]*?<!--\/blank-->/, `<span class="blank filled">${q.fillHtml}</span>`);
  const navIdx = EXAM.paper.map((p, i) => i).filter(examIdxAllowed);
  const nav = navIdx.map(i => `<button type="button" class="btn btn-sm ${i === EXAM.idx ? 'btn-primary' : ''}" style="min-width:38px;${EXAM.answers[i] >= 0 && i !== EXAM.idx ? 'border-color:var(--accent-line)' : ''}" data-act="exam-goto" data-i="${i}">${i + 1}</button>`).join('');
  const atStart = EXAM.formal ? EXAM.idx <= sec.from : EXAM.idx === 0;
  const atEnd = EXAM.formal ? EXAM.idx >= sec.to : EXAM.idx >= total - 1;
  const playLocked = EXAM.formal && q.played;
  view.innerHTML = `
    <div class="pr-top">
      <button type="button" class="btn btn-ghost btn-icon" data-act="exam-quit" aria-label="離開考試">${icon('close')}</button>
      <div class="bar"><span style="width:${Math.round(answeredN / total * 100)}%"></span></div>
      <div class="pr-count">${EXAM.formal ? `${esc(EXAM_SECTIONS[sec.sec].replace(/（.*）/, ''))}・剩 <span id="examClock">--:--</span>` : `<span id="examClock">00:00</span> / ${EXAM.limitMin} 分`}・已答 ${answeredN}/${total}</div>
    </div>
    <div class="q-card">
      <div class="q-label"><span>${esc(EXAM_SECTIONS[q.sec])}</span><span>・</span><span>${esc(q.mondaiTitle)}</span><span class="grow"></span><span class="num">${EXAM.idx + 1} / ${total}</span></div>
      ${showHeader ? `<div class="q-instr">${esc(q.mondaiDesc)}${q.audioOptions ? '（選項只會念出來）' : ''}</div>` : ''}
      ${q.passageHtml ? `<div class="panel jp mb-3 passage">${q.passageHtml}</div>` : ''}
      ${q.isListening && q.audio ? `<div class="center mb-2"><button type="button" class="speak-big" data-act="exam-play" ${playLocked ? 'disabled title="正式模式的音檔只播一次"' : ''}>${icon('play')}<span>${playLocked ? '音檔只播一次' : '播放音檔'}</span></button></div>` : ''}
      ${stem ? `<div class="q-stem jp ${q.stemClass || ''}" style="font-size:22px">${stem}</div>` : ''}
      <div class="opts ${q.wide ? 'wide' : ''}">${opts}</div>
      ${locked ? examFeedbackHtml(q, ans) : ''}
    </div>
    <div class="pr-actions">
      <div class="left"><button type="button" class="btn btn-sm" data-act="exam-prev" ${atStart ? 'disabled' : ''}>上一題</button><button type="button" class="btn btn-sm" data-act="exam-next" ${atEnd ? 'disabled' : ''}>下一題</button></div>
      <div class="right"><button type="button" class="btn btn-sm btn-ghost" data-act="exam-nav-toggle">題號</button>
        ${EXAM.formal && !lastSection ? `<button type="button" class="btn btn-sm ${atEnd ? 'btn-primary' : ''}" data-act="exam-end-section">結束本科目</button>` : ''}
        <button type="button" class="btn btn-sm ${EXAM.formal && !lastSection ? 'btn-ghost' : 'btn-primary'}" data-act="exam-submit">交卷</button></div>
    </div>
    <div class="card mt-3 ${EXAM.navOpen ? '' : 'hidden'}" id="examNav"><div class="row-wrap">${nav}</div></div>`;
  clearInterval(examTimer);
  const tick = () => {
    const el = document.getElementById('examClock');
    if (!el || !EXAM || EXAM.finished) { clearInterval(examTimer); return; }
    if (EXAM.formal) {
      const left = examRemaining();
      if (left <= 0) { clearInterval(examTimer); examEndSection(true); return; }
      el.textContent = `${pad2(Math.floor(left / 60))}:${pad2(left % 60)}`;
    } else {
      const s = Math.floor((Date.now() - EXAM.start) / 1000);
      el.textContent = `${pad2(Math.floor(s / 60))}:${pad2(s % 60)}`;
    }
  };
  tick(); examTimer = setInterval(tick, 1000);
  if (q.isListening && q.audio && !q.played) { q.played = true; setTimeout(() => speakScript(q.audio), 250); }
}
function examFeedbackHtml(q, ans) {
  const ok = ans === q.answer;
  return `<div class="feedback ${ok ? 'ok' : 'bad'}">
    <div class="fb-head ${ok ? 'ok' : 'bad'}">${ok ? icon('check') + '<span>答對了</span>' : icon('cross') + `<span>正確答案：<span class="jp">${esc(jaPlain(q.options[q.answer].text))}</span></span>`}</div>
    ${q.script ? `<div class="small jp mt-2" style="white-space:pre-line">${furi(q.script)}</div>` : ''}
    ${q.why ? `<div class="fb-why mt-2">${md(q.why)}</div>` : ''}
  </div>`;
}
function examAnswer(i) {
  if (!EXAM || EXAM.locked[EXAM.idx]) return;
  EXAM.answers[EXAM.idx] = i;
  if (EXAM.instant) { EXAM.locked[EXAM.idx] = true; recordExamAnswer(EXAM.paper[EXAM.idx], i); }
  renderExamRunner();
}
// The mock exam is its own thing: it writes only its question history and the day's test tally (ex), never the schedule,
// the notebook, the recent accuracy or the day's question counts (a paper also asks about units not reached yet).
function recordExamAnswer(q, i) {
  const ok = i === q.answer;
  const h = state.questionHistory[q.examId] || { count: 0, correctCount: 0 };
  h.count++; if (ok) h.correctCount++; h.lastResult = ok ? 'correct' : 'wrong'; h.lastDate = todayStr();
  state.questionHistory[q.examId] = h;
  if (typeof i === 'number' && i >= 0) { const e = logEntry(); e.ex = (e.ex || 0) + 1; }
  saveState();
}
function examKey(ev) {
  const k = ev.key;
  if (EXAM && EXAM.formal && (k === 'ArrowRight' || k === 'Enter') && EXAM.idx >= examSection().to) { ev.preventDefault(); return; }
  if (['1', '2', '3', '4'].includes(k)) { ev.preventDefault(); const q = EXAM && EXAM.paper[EXAM.idx]; if (q && Number(k) <= q.options.length) examAnswer(Number(k) - 1); return; }
  if (k === 'ArrowRight' || k === 'Enter') { ev.preventDefault(); ACTIONS['exam-next'](); return; }
  if (k === 'ArrowLeft') { ev.preventDefault(); ACTIONS['exam-prev'](); return; }
  if (k === 'r' || k === 'R') { ev.preventDefault(); ACTIONS['exam-play'](); return; }
  if (k === 'f' || k === 'F') { ev.preventDefault(); toggleFurigana(); }
}

function scoreExam() {
  const P = EXAM.paper; const plan = EXAM_PLAN[EXAM.level]; const parts = scoreParts(EXAM.level);
  const correct = (arr) => arr.filter(q => EXAM.answers[P.indexOf(q)] === q.answer).length;
  const lr = P.filter(q => q.sec !== 'S3'); const li = P.filter(q => q.sec === 'S3');
  const lrC = correct(lr); const liC = correct(li);
  const raw = {}; parts.forEach(([k, max]) => { const arr = P.filter(q => partOf(q, plan.three) === k); raw[k] = arr.length ? Math.round(correct(arr) / arr.length * max) : null; });
  // a paper without some part (only 聴解, say) gives it the share the others got, so the total stays comparable
  const have = parts.filter(([k]) => raw[k] !== null); const rate = have.length ? have.reduce((a, [k, max]) => a + raw[k] / max, 0) / have.length : 0;
  const scored = parts.map(([k, max, min, name]) => ({ k, max, min, name, est: raw[k] === null, pts: raw[k] === null ? Math.round(rate * max) : raw[k] }));
  const pts = Object.fromEntries(scored.map(x => [x.k, x.pts]));
  const total = scored.reduce((a, x) => a + x.pts, 0);
  const pass = plan.pass;
  const passed = total >= pass && scored.every(x => x.pts >= x.min);
  const byM = {};
  P.forEach((q, i) => { const k = q.m; byM[k] = byM[k] || { n: 0, c: 0, t: q.mondaiTitle }; byM[k].n++; if (EXAM.answers[i] === q.answer) byM[k].c++; });
  // 参考情報 on the official report: A ≥ 67%, B ≥ 34%, C below
  const share = (pred) => { const idx = P.map((q, i) => (pred(q) ? i : -1)).filter(i => i >= 0); return idx.length ? idx.filter(i => EXAM.answers[i] === P[i].answer).length / idx.length : null; };
  const grade = (r) => (r === null ? '—' : r >= 0.67 ? 'A' : r >= 0.34 ? 'B' : 'C');
  const refVocab = grade(share(q => q.sec === 'S1'));
  const refGrammar = grade(share(q => ['grammar', 'order', 'textgrammar'].includes(q.mk)));
  return { lrC, lrN: lr.length, liC, liN: li.length, lr120: plan.three ? null : pts.lr, li60: pts.li, lang60: plan.three ? pts.lang : null, read60: plan.three ? pts.read : null,
    parts: scored, total, pass, passed, byM, correct: lrC + liC, n: P.length, lrOnly: !li.length, liOnly: !lr.length, refVocab, refGrammar };
}
function finishExam() {
  clearInterval(examTimer);
  stopSpeaking();
  EXAM.paper.forEach((q, i) => { if (!EXAM.locked[i]) { EXAM.locked[i] = true; recordExamAnswer(q, EXAM.answers[i]); } });
  const s = scoreExam();
  EXAM.score = s; EXAM.finished = true;
  EXAM.duration = Math.round((Date.now() - EXAM.start) / 1000);
  const now = new Date();
  state.examHistory.unshift({
    id: uid('ex'), dateStr: `${todayStr()} ${pad2(now.getHours())}:${pad2(now.getMinutes())}`, examTitle: EXAM.title, level: EXAM.level, isAiMock: EXAM.isAi,
    scorePct: Math.round(s.correct / Math.max(1, s.n) * 100), total180: s.total, lrScore120: s.lr120, listenScore60: s.li60, langScore60: s.lang60 === null ? undefined : s.lang60, readScore60: s.read60 === null ? undefined : s.read60, passedOfficial: s.passed,
    correctCount: s.correct, totalCount: s.n, durationSec: EXAM.duration, refVocab: s.refVocab, refGrammar: s.refGrammar, formal: Boolean(EXAM.formal),
    questionLogs: EXAM.paper.map((q, i) => ({ mondaiTitle: q.mondaiTitle, question: examPlain(q).slice(0, 200), passage: q.passageHtml ? htmlToPlain(q.passageHtml.replace(/<br>/g, '\n')).slice(0, 600) : '', script: q.script || '', answer: jaPlain(q.options[q.answer].text), userAnswer: EXAM.answers[i] >= 0 ? jaPlain(q.options[EXAM.answers[i]].text) : '未作答', explanation: q.why || '' }))
  });
  state.examHistory = state.examHistory.slice(0, 60);
  Object.values(s.byM).forEach(() => {});
  saveState();
  document.body.classList.remove('practicing');
  go('#/exam/result');
}
function renderExamResult(view) {
  const s = EXAM.score;
  renderNav('exam');
  const rows = Object.entries(s.byM).map(([m, v]) => `<tr><td>${esc(EXAM_SECTIONS[m.slice(0, 2)])}</td><td>${esc(v.t)}</td><td class="num">${v.c} / ${v.n}</td><td style="width:35%"><div class="bar thin ${v.c / v.n >= 0.6 ? 'ok' : ''}"><span style="width:${Math.round(v.c / v.n * 100)}%"></span></div></td></tr>`).join('');
  const review = EXAM.paper.map((q, i) => {
    const a = EXAM.answers[i]; const ok = a === q.answer;
    return `<details class="disclose list-item" style="display:block"><summary><span class="chip ${ok ? 'chip-ok' : 'chip-bad'}">${ok ? '對' : '錯'}</span> ${i + 1}. ${esc(q.mondaiTitle.replace(/^問題\d+　/, ''))}・<span class="jp">${esc(examPlain(q).slice(0, 40))}</span></summary>
      <div class="mt-2">${q.passageHtml ? `<div class="panel jp small">${q.passageHtml}</div>` : ''}
      <div class="small mt-2">正確：<b class="jp">${esc(jaPlain(q.options[q.answer].text))}</b>・你的答案：<span class="jp">${a >= 0 ? esc(jaPlain(q.options[a].text)) : '未作答'}</span></div>
      ${q.script ? `<div class="small jp mt-2 muted" style="white-space:pre-line">${furi(q.script)}</div>` : ''}
      ${q.why ? `<div class="small mt-2">${md(q.why)}</div>` : ''}</div></details>`;
  }).join('');
  view.innerHTML = `
    <div class="page-head"><div><div class="page-sub">${esc(EXAM.title)}・用時 ${formatDuration(EXAM.duration)}</div><div class="page-title">換算分數 ${s.total} / 180</div></div>
      <span class="chip ${s.passed ? 'chip-ok' : 'chip-warn'}">${s.passed ? `達到 ${EXAM.level} 合格線（${s.pass} 分）` : `未達 ${EXAM.level} 合格線（${s.pass} 分）`}</span></div>
    <div class="card">
      <div class="card-head"><div class="card-title">成績單</div><span class="small muted">格式比照 JLPT 認定結果通知書</span></div>
      <div class="table-wrap"><table class="table">
        <thead><tr><th>得点区分別得点</th><th style="text-align:right">得點</th><th style="text-align:right">基準點</th></tr></thead>
        <tbody>
          ${s.parts.map(x => `<tr><td>${x.name}${x.est ? '（推估）' : ''}</td><td class="num" style="text-align:right">${x.pts} / ${x.max}</td><td class="num muted" style="text-align:right">${x.min}</td></tr>`).join('')}
          <tr><td><b>総合得点</b></td><td class="num" style="text-align:right"><b>${s.total} / 180</b></td><td class="num muted" style="text-align:right">${s.pass}</td></tr>
        </tbody>
      </table></div>
      <div class="row-wrap mt-3 small"><span class="muted">参考情報</span><span>文字・語彙 <b>${s.refVocab}</b></span><span>文法 <b>${s.refGrammar}</b></span><span class="muted">A：答對 67% 以上・B：34–66%・C：未滿 34%</span></div>
      <div class="small muted mt-2">答對 ${s.correct} / ${s.n} 題</div>
    </div>
    <p class="hint">分數依答對比例換算，正式考試會依難度調整，這裡只能當作參考。</p>
    <div class="card"><div class="card-head"><div class="card-title">各大題表現</div></div><div class="table-wrap"><table class="table"><tbody>${rows}</tbody></table></div></div>
    <div class="card"><div class="card-head"><div class="card-title">逐題檢討</div></div><div class="list">${review}</div></div>
    <div class="row-wrap mt-3"><button type="button" class="btn btn-primary" data-act="exam-again">再考一次</button><button type="button" class="btn" data-act="start-mistakes">練習錯題</button><button type="button" class="btn btn-ghost" data-act="nav" data-route="#/exam">回到模擬考</button></div>`;
}

function examReviewHtml(h) {
  return `<p class="small muted">${esc(h.dateStr)}・${h.correctCount}/${h.totalCount} 題・${h.total180 !== undefined ? h.total180 + ' / 180' : ''}</p>
    <div class="list">${(h.questionLogs || []).map((q, i) => {
      const ok = q.userAnswer === q.answer;
      return `<div class="list-item" style="display:block"><div class="row-wrap"><span class="chip ${ok ? 'chip-ok' : 'chip-bad'}">${ok ? '對' : '錯'}</span><span class="small muted">${i + 1}. ${esc(q.mondaiTitle || q.dimension || '')}</span></div>
        ${q.passage ? `<div class="panel small jp mt-2" style="white-space:pre-line">${esc(q.passage)}</div>` : ''}
        <div class="jp mt-1">${esc(q.question || '')}</div>
        <div class="small mt-1">正確：<b class="jp">${esc(q.answer)}</b>・你的答案：<span class="jp">${esc(q.userAnswer)}</span></div>
        ${q.script ? `<div class="small muted jp mt-1" style="white-space:pre-line">${furi(q.script)}</div>` : ''}
        ${q.explanation ? `<div class="small mt-1">${md(q.explanation)}</div>` : ''}</div>`;
    }).join('')}</div>`;
}

Object.assign(ACTIONS, {
  'exam-start': () => startExam(),
  'exam-ai': (el) => aiGenerateExamItems((document.getElementById('exLevel') || {}).value || examLevels()[0], el),
  'exam-answer': (el) => examAnswer(Number(el.dataset.i)),
  'exam-next': () => { if (EXAM && EXAM.idx < EXAM.paper.length - 1 && examIdxAllowed(EXAM.idx + 1)) { EXAM.idx++; stopSpeaking(); renderExamRunner(); window.scrollTo({ top: 0 }); } },
  'exam-prev': () => { if (EXAM && EXAM.idx > 0 && examIdxAllowed(EXAM.idx - 1)) { EXAM.idx--; stopSpeaking(); renderExamRunner(); window.scrollTo({ top: 0 }); } },
  'exam-goto': (el) => { const i = Number(el.dataset.i); if (!examIdxAllowed(i)) return; EXAM.idx = i; stopSpeaking(); renderExamRunner(); },
  'exam-nav-toggle': () => { EXAM.navOpen = !EXAM.navOpen; renderExamRunner(); },
  'exam-play': () => {
    const q = EXAM && EXAM.paper[EXAM.idx];
    if (!q || !q.audio) return;
    if (EXAM.formal && q.played) { toast('正式模式的音檔只播一次'); return; }
    q.played = true; speakScript(q.audio);
  },
  'exam-end-section': () => {
    const s = examSection();
    const left = EXAM.answers.slice(s.from, s.to + 1).filter(a => a < 0).length;
    if (!confirm(`${left ? `本科目還有 ${left} 題沒作答。` : ''}結束「${EXAM_SECTIONS[s.sec]}」？結束後不能再回來修改。`)) return;
    examEndSection(false);
  },
  'exam-submit': () => {
    const left = EXAM.answers.filter(a => a < 0).length;
    if (left && !confirm(`還有 ${left} 題沒作答，確定要交卷嗎？`)) return;
    finishExam();
  },
  'exam-quit': () => {
    if (!confirm('離開考試？這次的作答不會計分。')) return;
    clearInterval(examTimer); stopSpeaking(); EXAM = null; document.body.classList.remove('practicing'); go('#/exam'); Sync.flushDeferred();
  },
  'exam-again': () => { const o = { level: EXAM.level, size: EXAM.size, subjects: EXAM.subjects }; EXAM = null; startExam(o); },
  'exam-review': (el) => { const h = state.examHistory[Number(el.dataset.i)]; if (h) openModal(h.examTitle || '考卷回顧', examReviewHtml(h), { width: 760, noFocus: true }); },
  'exam-clear': () => { if (!confirm('清除所有考試紀錄？')) return; state.examHistory = []; saveState(); route(); }
});
