'use strict';
/* ==========================================================================
   Tools: sentence analyzer, conjugation table, AI question generator, study advice
   ========================================================================== */
const CONJ_ROWS = [
  ['masu', 'ます形', 'N5'], ['masen', 'ません', 'N5'], ['mashita', 'ました', 'N5'], ['te', 'て形', 'N5'], ['ta', 'た形', 'N5'],
  ['nai', 'ない形', 'N5'], ['nakatta', 'なかった', 'N5'], ['dict', '辭書形', 'N5'], ['ba', '條件形（ば）', 'N4'], ['tara', 'たら', 'N4'],
  ['pot', '可能形', 'N4'], ['vol', '意向形', 'N4'], ['imp', '命令形', 'N4'], ['kinshi', '禁止形', 'N4'],
  ['pass', '受身形', 'N4'], ['caus', '使役形', 'N4'], ['causpass', '使役受身形', 'N3']
];
const ADJ_ROWS = {
  i: [['kunai', '否定'], ['katta', '過去'], ['kunakatta', '過去否定'], ['kute', 'て形（連接）'], ['ku', '副詞形'], ['kereba', '條件形（ば）'], ['sou', '看起來（そう）'], ['sugiru', '太…（すぎる）']],
  na: [['janai', '否定'], ['datta', '過去'], ['janakatta', '過去否定'], ['de', 'で（連接）'], ['ni', '副詞形'], ['na', '修飾名詞'], ['nara', '條件形（なら）'], ['sou', '看起來（そう）']]
};
const GODAN_RU = new Set(['帰る', 'かえる', '入る', 'はいる', '走る', 'はしる', '切る', 'きる', '知る', 'しる', '要る', 'いる', '減る', 'へる', '限る', 'かぎる', '滑る', 'すべる', 'しゃべる', '喋る', '焦る', 'あせる', '蹴る', 'ける', '参る', 'まいる', '握る', 'にぎる', '散る', 'ちる']);
const E_I_RU = /[えけせてねへめれげぜでべぺいきしちにひみりぎじびぴ]る$/;

// Look the word up first; fall back to the shape of the ending.
function detectWordType(w) {
  const hit = REG.vocab.find(v => jaPlain(v.w) === w || v.r === w);
  if (hit && ['v5', 'v1', 'vs', 'vk', 'i', 'na'].includes(hit.p)) {
    return { kind: hit.p, word: jaPlain(hit.w), reading: hit.r, meaning: hit.m, sure: true };
  }
  if (/する$/.test(w)) return { kind: 'vs', word: w, sure: false };
  if (w === '来る' || w === 'くる') return { kind: 'vk', word: '来る', sure: true };
  if (/る$/.test(w)) {
    if (GODAN_RU.has(w)) return { kind: 'v5', word: w, sure: false };
    if (E_I_RU.test(w)) return { kind: 'v1', word: w, sure: false };
    if (/[一-鿿]る$/.test(w) && w.length === 2) return { kind: 'v1', word: w, sure: false };
    return { kind: 'v5', word: w, sure: false };
  }
  if (/[うくぐすつぬぶむ]$/.test(w)) return { kind: 'v5', word: w, sure: false };
  if (/い$/.test(w)) return { kind: 'i', word: w, sure: false };
  return { kind: 'na', word: w, sure: false };
}
const KIND_LABEL = { v5: '五段動詞（第一類）', v1: '一段動詞（第二類）', vs: 'する動詞（第三類）', vk: '来る（第三類）', i: 'い形容詞', na: 'な形容詞' };

function conjTableHtml(raw, forced) {
  const w = String(raw || '').trim();
  if (!w) return '';
  const det = detectWordType(w);
  const kind = forced && forced !== 'auto' ? forced : det.kind;
  const word = det.word || w;
  let rows = '';
  if (['v5', 'v1', 'vs', 'vk'].includes(kind)) {
    const g = GROUP_OF_POS[kind];
    rows = CONJ_ROWS.map(([f, label, lv]) => {
      const out = JConj.conjVerb(word, g, f);
      if (!out) return '';
      return `<tr><td class="small muted nowrap">${label}</td><td class="jp" style="font-size:17px">${furi(out)}</td><td class="tiny muted">${lv}</td><td style="text-align:right"><button type="button" class="btn btn-sm btn-ghost btn-icon" data-act="speak" data-text="${esc(out)}" aria-label="朗讀">${icon('speaker')}</button></td></tr>`;
    }).join('');
  } else {
    rows = [['dict', '辭書形']].concat(ADJ_ROWS[kind] || []).map(([f, label]) => {
      const out = JConj.conjAdj(word, kind, f);
      if (!out) return '';
      return `<tr><td class="small muted nowrap">${label}</td><td class="jp" style="font-size:17px">${furi(out)}</td><td></td><td style="text-align:right"><button type="button" class="btn btn-sm btn-ghost btn-icon" data-act="speak" data-text="${esc(out)}" aria-label="朗讀">${icon('speaker')}</button></td></tr>`;
    }).join('');
  }
  const note = forced && forced !== 'auto' ? '已依你的選擇變化。' : det.sure ? `單字表裡的詞性：${KIND_LABEL[kind]}${det.meaning ? `・${esc(det.meaning)}` : ''}` : `依字尾判斷為${KIND_LABEL[kind]}，如果不對請在右邊手動選擇。`;
  return `<div class="small dim mb-2">${note}</div><div class="table-wrap"><table class="table"><tbody>${rows}</tbody></table></div>`;
}

// Offline sentence breakdown: furigana, words from the word list, and recognizable patterns.
const PATTERNS = [
  [/てください/, '〜てください', '請求對方做某事。'], [/ないでください/, '〜ないでください', '請對方不要做某事。'],
  [/ています|ている|てる/, '〜ている', '動作進行中，或動作結果持續的狀態。'], [/てもいい/, '〜てもいい', '許可：做…也可以。'],
  [/てはいけない|てはだめ|ちゃいけない/, '〜てはいけない', '禁止：不可以做…。'], [/なければなりません|なければならない|なきゃ/, '〜なければならない', '義務：必須做…。'],
  [/なくてもいい/, '〜なくてもいい', '不必做…。'], [/たことがあ/, '〜たことがある', '經驗：曾經做過…。'], [/たほうがいい/, '〜たほうがいい', '建議：最好做…。'],
  [/たり.*たり/, '〜たり〜たりする', '列舉幾個動作。'], [/前に/, '〜前に', '在做…之前。'], [/後で|あとで/, '〜た後で', '做完…之後。'],
  [/から[、。]/, '〜から', '說明原因或理由。'], [/ので/, '〜ので', '說明原因，語氣比から客觀、委婉。'], [/たい/, '〜たい', '說話者想做…。'],
  [/ましょう/, '〜ましょう', '邀約或提議一起做。'], [/ませんか/, '〜ませんか', '委婉地邀請。'], [/ようになりました|ようになる/, '〜ようになる', '能力或習慣的變化。'],
  [/てある/, '〜てある', '某人做了某事後留下的狀態。'], [/ておく|ておき|とく/, '〜ておく', '事先做好準備。'], [/ようと思/, '〜ようと思う', '說話者的打算。'],
  [/たら/, '〜たら', '如果…／…之後。'], [/なら/, '〜なら', '承接對方的話題：如果是…的話。'], [/ば[、]/, '〜ば', '假定條件。'],
  [/てあげ|てくれ|てもら/, '授受動詞', '動作的恩惠方向：あげる（我給別人）、くれる（別人給我）、もらう（我從別人得到）。'],
  [/そうです|そうだ/, '〜そうだ', '接ます形語幹是「看起來」；接普通形是「聽說」。'], [/ようです|ようだ|みたい/, '〜ようだ', '根據觀察的推測：好像…。'], [/らしい/, '〜らしい', '根據聽來的資訊推測：好像…。'],
  [/られ|され/, '受身形／可能形', '「〜られる」可能是被動，也可能是可能形（一段動詞），要看前後文。'], [/させ/, '使役形', '讓（叫）某人做…。'],
  [/ために/, '〜ために', '目的（意志動作），或原因。'], [/ように/, '〜ように', '為了達到某種狀態（常接可能形、ない形）。'], [/すぎ/, '〜すぎる', '過度：太…。'],
  [/やすい/, '〜やすい', '容易…。'], [/にくい/, '〜にくい', '不容易…。'], [/かどうか/, '〜かどうか', '是否…。'], [/てみ/, '〜てみる', '試著做…。'],
  [/てしま|ちゃ[っうい]/, '〜てしまう', '完了，或做了不該做的事（遺憾）。'], [/ところ/, '〜ところ', '正要／正在／剛剛（看前面的形）。']
];
const PARTICLE_NOTES = [
  ['に', '「に」：時間點、存在的位置、移動的目的地、動作的對象。'], ['で', '「で」：動作發生的場所、手段或工具、範圍。'],
  ['を', '「を」：動作的對象，或離開、經過的地方。'], ['が', '「が」：主語、喜好與能力的對象、存在的主體。'],
  ['へ', '「へ」：移動的方向。'], ['から', '「から」：起點，或原因。'], ['まで', '「まで」：終點、範圍的結束。'], ['と', '「と」：和（一起）、引用。']
];
function offlineAnalysis(text) {
  const s = String(text || '').trim();
  if (!s) return '';
  const words = [];
  const seen = new Set();
  REG.vocab.forEach(v => {
    const w = jaPlain(v.w);
    if (w.length < 2 && !HAS_KANJI.test(w)) return;
    let hit = s.includes(w);
    if (!hit && GROUP_OF_POS[v.p]) {
      const stem = JConj.conjVerb(w, GROUP_OF_POS[v.p], 'stem');
      const te = JConj.conjVerb(w, GROUP_OF_POS[v.p], 'te');
      const nai = JConj.conjVerb(w, GROUP_OF_POS[v.p], 'nai');
      hit = [stem, te && te.slice(0, -1), nai && nai.slice(0, -2)].some(x => x && jaPlain(x).length >= 2 && s.includes(jaPlain(x)));
    }
    if (!hit && v.p === 'i') hit = s.includes(w.slice(0, -1) + 'く') || s.includes(w.slice(0, -1) + 'か');
    if (hit && !seen.has(w)) { seen.add(w); words.push(v); }
  });
  words.sort((a, b) => s.indexOf(jaPlain(a.w).slice(0, 2)) - s.indexOf(jaPlain(b.w).slice(0, 2)));
  const pats = PATTERNS.filter(([re]) => re.test(s)).slice(0, 6);
  const parts = PARTICLE_NOTES.filter(([p]) => s.includes(p)).slice(0, 4);
  return `
    <div class="panel mt-3">
      <div class="jp" style="font-size:20px;line-height:2">${furi(s)}</div>
      ${words.length ? `<div class="small muted mt-3">單字</div><div class="list">${words.slice(0, 12).map(v => `<div class="list-item"><span class="jp">${esc(jaPlain(v.w))}</span><span class="small muted jp">${esc(v.r && v.r !== v.w ? v.r : '')}</span><span class="small grow">${esc(v.m)}</span><span class="tiny muted">${esc(posLabel(v.p))}</span></div>`).join('')}</div>` : ''}
      ${pats.length ? `<div class="small muted mt-3">句型</div><ul class="small">${pats.map(([, n, d]) => `<li><b class="jp">${esc(n)}</b>：${esc(d)}</li>`).join('')}</ul>` : ''}
      ${parts.length ? `<div class="small muted mt-3">助詞提示</div><ul class="small">${parts.map(([, d]) => `<li>${esc(d)}</li>`).join('')}</ul>` : ''}
      <div class="hint mt-2">這是離線的簡易分析（只比對單字表與常見句型）。登入後可以用 AI 得到完整的翻譯與結構說明。</div>
    </div>`;
}

let TOOLS_STATE = { conjWord: '書く', conjKind: 'auto', sentence: '', genUnit: '' };
// 工具與 AI (1.1.0): drawn at the bottom of 學習分析 (renderStats), no page of its own; #/tools scrolls there
function scrollBelowTopbar(el) {
  if (!el) return;
  const bar = document.querySelector('.topbar'); const off = bar && getComputedStyle(bar).display !== 'none' ? bar.getBoundingClientRect().height : 0;
  window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - off - 12);
}
function toolsHtml() {
  const ai = aiReady();
  const unitOpts = DATA.UNITS.map(u => `<option value="${u.id}" ${(TOOLS_STATE.genUnit || state.currentUnit) === u.id ? 'selected' : ''}>${esc(u.weeks)}・${esc(u.short)}</option>`).join('');
  return `
    <div class="page-head"><div><div class="page-title">工具與 AI</div><div class="page-sub">${ai ? '' : '登入後就能用 AI'}</div></div>
      ${ai ? '' : '<button type="button" class="btn" data-act="sync-open">登入</button>'}</div>
    <div class="card">
      <div class="card-head"><div class="card-title">句子分析</div></div>
      <textarea class="input jp" id="anaText" rows="2" placeholder="貼上想看懂的日文句子，例如：雨が降ったら、試合は中止になるかもしれません。">${esc(TOOLS_STATE.sentence)}</textarea>
      <div class="row-wrap mt-3">
        <button type="button" class="btn" data-act="analyze-offline">離線分析</button>
        <button type="button" class="btn ${ai ? 'btn-primary' : ''}" data-act="analyze-ai" ${ai ? '' : 'disabled title="登入後才能用 AI"'}>${icon('spark')}AI 詳細分析</button>
        <button type="button" class="btn btn-ghost btn-icon" data-act="analyze-speak" aria-label="朗讀">${icon('speaker')}</button>
      </div>
      <div id="analyzeOut"></div>
    </div>
    <div class="card">
      <div class="card-head"><div class="card-title">動詞・形容詞變化表</div></div>
      <div class="row-wrap">
        <input class="input jp" id="conjWord" style="max-width:220px" value="${esc(TOOLS_STATE.conjWord)}" placeholder="例如：書く、食べる、静か" data-change="conj-word" />
        <select class="select" id="conjKind" style="width:auto" data-change="conj-kind">
          ${[['auto', '自動判斷'], ['v5', '五段動詞'], ['v1', '一段動詞'], ['vs', 'する動詞'], ['vk', '来る'], ['i', 'い形容詞'], ['na', 'な形容詞']].map(([k, l]) => `<option value="${k}" ${TOOLS_STATE.conjKind === k ? 'selected' : ''}>${l}</option>`).join('')}
        </select>
        <button type="button" class="btn" data-act="conj-show">顯示</button>
      </div>
      <div id="conjOut" class="mt-3">${conjTableHtml(TOOLS_STATE.conjWord, TOOLS_STATE.conjKind)}</div>
    </div>
    <details class="disclose mt-3 tools-more"><summary>進階：AI 出題、學習建議</summary>
    <div class="grid grid-2 mt-3">
      <div class="card">
        <div class="card-head"><div class="card-title">用 AI 為單元出題</div></div>
        <p class="small dim">出的題目會加進單元，之後在每日練習出現。</p>
        <div class="row-wrap mt-2">
          <select class="select" id="genUnit" style="width:auto" data-change="gen-unit">${unitOpts}</select>
          <select class="select" id="genCount" style="width:auto"><option value="5">5 題</option><option value="8">8 題</option></select>
          <button type="button" class="btn" data-act="gen-items" ${ai ? '' : 'disabled'}>${icon('spark')}出題</button>
        </div>
        ${state.customGrammar.length ? `<div class="hint mt-3">目前有 ${state.customGrammar.length} 道自訂／AI 題目，可在各單元的「題目與熟練度」查看。</div>` : ''}
      </div>
      <div class="card">
        <div class="card-head"><div class="card-title">AI 學習建議</div></div>
        <p class="small dim">看你的進度和錯題，給三點建議。</p>
        <div class="row-wrap mt-2"><button type="button" class="btn" data-act="study-advice" ${ai ? '' : 'disabled'}>${icon('spark')}產生建議</button></div>
        <div id="adviceOut"></div>
      </div>
    </div>
    </details>`;
}

Object.assign(ACTIONS, {
  'settings-learn': () => openSettings('learn'),
  'analyze-offline': () => {
    const t = document.getElementById('anaText').value.trim();
    TOOLS_STATE.sentence = t;
    if (!t) { toast('請先輸入句子'); return; }
    document.getElementById('analyzeOut').innerHTML = offlineAnalysis(t);
  },
  'analyze-ai': (el) => {
    const t = document.getElementById('anaText').value.trim();
    TOOLS_STATE.sentence = t;
    if (!t) { toast('請先輸入句子'); return; }
    aiAnalyzeSentence(t, el);
  },
  'analyze-speak': () => { const t = document.getElementById('anaText').value.trim(); if (t) speak(t); },
  'conj-show': () => {
    TOOLS_STATE.conjWord = document.getElementById('conjWord').value.trim();
    TOOLS_STATE.conjKind = document.getElementById('conjKind').value;
    document.getElementById('conjOut').innerHTML = conjTableHtml(TOOLS_STATE.conjWord, TOOLS_STATE.conjKind) || '<div class="empty">請輸入單字</div>';
  },
  'gen-items': (el) => {
    const u = document.getElementById('genUnit').value;
    TOOLS_STATE.genUnit = u;
    aiGenerateUnitItems(u, el, Number(document.getElementById('genCount').value) || 5);
  },
  'study-advice': (el) => aiStudyAdvice(el)
});
Object.assign(CHANGE_ACTIONS, {
  'conj-word': () => ACTIONS['conj-show'](),
  'conj-kind': () => ACTIONS['conj-show'](),
  'gen-unit': (el) => { TOOLS_STATE.genUnit = el.value; }
});
