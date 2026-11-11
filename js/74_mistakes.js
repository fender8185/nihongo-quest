'use strict';
/* ==========================================================================
   Mistake notebook
   ========================================================================== */
// ---------- 錯題快速循環: flip cards over the active notebook, 忘了／記得 ----------
// One pass over the active mistakes (most missed, longest unpractised first). A grade writes the item's schedule once a
// day — the first grade of the day; later looks only update the notebook. Cards marked 忘了 come back once at the end
// of the round, for a look without a grade.
const MLOOP_MAX = 30;
let MLOOP = null;   // { queue: [mistakeId], idx, flipped, again: [], rated: {id: grade}, date, stats: { ok, ng, left } }
function buildMistakeLoop(max = MLOOP_MAX, first = []) {
  const ids = activeMistakes().slice().sort(mistakePriority).map(m => m.id);
  return first.filter(id => ids.includes(id)).concat(ids.filter(id => !first.includes(id))).slice(0, max);
}
function startMistakeLoop(first = []) {
  MLOOP = { queue: buildMistakeLoop(MLOOP_MAX, first), idx: 0, flipped: false, again: [], rated: {}, date: todayStr(), stats: { ok: 0, ng: 0, left: 0 } };
  go('#/mistakes/loop');
}
function mloopCurrent() { return MLOOP && state.mistakes.find(m => m.id === MLOOP.queue[MLOOP.idx]); }
function mistakeCardFaces(m) {
  const it = m.key && REG.byKey.get(m.key);
  if (it && it.kind === 'v') {
    const ex = vocabExamples(it)[0];
    return {
      front: `<div class="word jp">${wordHtml(it)}</div>`,
      back: `${it.r && it.r !== jaPlain(it.w) ? `<div class="reading jp">${esc(it.r)}</div>` : ''}<div class="meaning">${esc(it.m)}</div>
        ${ex ? exampleHtml(ex.ex, ex.exZh, 'mt-3 listen-ex', it) : ''}
        ${vocabWhy(it) ? `<div class="small mt-2" style="text-align:left">${md(vocabWhy(it))}</div>` : ''}`
    };
  }
  if (it && it.kind === 'a') {
    return { front: `<div class="word jp">${esc(it.ch)}</div>`, back: `<div class="reading">${esc(it.roma)}</div><div class="meaning jp">${esc(it.script === 'hira' ? '片假名' : '平假名')}：${esc(it.pair)}</div>` };
  }
  const b = splitBlank(m.prompt || '');
  const front = b ? `${furi(b.pre)}${blankChip(b.hint)}${furi(b.post)}` : furi(m.prompt || '');
  const pt = it && it.kind === 'g' && it.pt ? `<div class="small muted mt-2">考點：${esc(it.pt)}</div>` : '';
  return {
    front: `<div class="front-stem jp">${front}</div>`,
    back: `<div class="meaning jp">${furi(m.answer || '')}</div>${pt}${m.why ? `<div class="small mt-2" style="text-align:left">${md(m.why)}</div>` : ''}`
  };
}
// what the loop reads aloud: the word itself for a word mistake (its prompt is often Chinese or a cloze), else the prompt
function mloopSpeakText(m) {
  const it = m && m.key && REG.byKey.get(m.key);
  if (it && it.kind === 'v') return it.r || jaPlain(it.w);
  if (it && it.kind === 'a') return it.ch;
  return jaPlain((m && m.prompt) || '');
}
function mloopRate(g) {
  const m = mloopCurrent(); if (!m || !MLOOP.flipped) return;
  const t = todayStr(); const good = g === 'good';
  const it = m.key && REG.byKey.get(m.key); const r = it && state.srs[m.key];
  const wasMastered = m.mastered;
  if (!MLOOP.rated[m.id]) {
    MLOOP.rated[m.id] = g;
    MLOOP.stats[good ? 'ok' : 'ng']++;
    if (!good) MLOOP.again.push(m.id);
    if (it && (!r || r.last !== t)) {   // the first grade of the day sets the schedule
      const res = srsAnswer(m.key, good, { grade: good ? 'good' : 'again' });
      if (it.kind === 'v') recordFormat(res.rec, 'flash', good);
      recordAction(it.kind === 'g' ? 'g' : it.kind === 'v' || it.kind === 'k' ? 'v' : 'q', it.kind === 'g' ? unitById(it.u).short : it.kind === 'v' ? `單字「${jaPlain(it.w)}」` : it.kind === 'k' ? `漢字「${it.k}」` : null, it.kind);
      recordAccuracy(good);
      if (good) onCorrectForMistake({ key: m.key });
      else addMistake({ key: m.key, cat: m.cat, mistakePrompt: m.prompt, answerText: m.answer, why: m.why }, '錯題循環：忘記');
    } else if (it) {                      // already answered today: the notebook notes the look, the schedule stands
      m.last = t;
      if (!good) { m.count = (m.count || 1) + 1; m.streak = 0; }
    } else if (good) onCorrectForMistake({ mistakeId: m.id });
    else { m.count = (m.count || 1) + 1; m.streak = 0; m.okDays = []; m.last = t; }
    if (!it) noteAnswered('m:' + m.id);
    if (!wasMastered && m.mastered) MLOOP.stats.left++;
    saveState();
  }
  mloopAdvance();
}
function mloopAdvance() {
  MLOOP.idx++; MLOOP.flipped = false;
  if (MLOOP.idx >= MLOOP.queue.length && MLOOP.again.length) { MLOOP.queue = MLOOP.queue.concat(MLOOP.again); MLOOP.again = []; }
  route();
}
function renderMistakeLoop(view) {
  if (!MLOOP || MLOOP.date !== todayStr()) { startMistakeLoop(); return; }
  const m = mloopCurrent();
  if (!m) {
    const s = MLOOP.stats;
    view.innerHTML = `<div class="card center"><div class="flash">
      <div class="page-title">這一輪：記得 ${s.ok}・忘了 ${s.ng}</div>
      <p class="dim mt-2">${s.left ? `今天移出錯題本 ${s.left} 題。` : ''}${activeMistakes().length ? `錯題本還有 ${activeMistakes().length} 題待複習。` : '錯題本清空了。'}</p>
      <div class="row-wrap mt-3" style="justify-content:center">
        ${activeMistakes().length ? '<button type="button" class="btn btn-primary" data-act="mloop-again">再一輪</button>' : ''}
        <button type="button" class="btn" data-act="nav" data-route="#/mistakes">回錯題本</button>
      </div></div></div>`;
    return;
  }
  const faces = mistakeCardFaces(m);
  const second = Boolean(MLOOP.rated[m.id]);
  const rec = m.key && state.srs[m.key];
  view.innerHTML = `<div class="card">
      <div class="row between small muted"><span>${MLOOP.idx + 1} / ${MLOOP.queue.length}・${esc(m.cat || '綜合')}・錯 ${m.count || 1} 次${second ? '・再看一次' : ''}</span><span>${rec ? srsDots(rec.b) : ''}</span></div>
      <div class="flash">
        ${faces.front}
        ${MLOOP.flipped ? `<div class="divider"></div>${faces.back}${m.note ? `<div class="small muted mt-2">筆記：${esc(m.note)}</div>` : ''}` : ''}
      </div>
      ${!MLOOP.flipped ? `<button type="button" class="btn btn-primary btn-block btn-lg" data-act="mloop-flip">看答案 <span class="kbd kbd-hint" style="background:transparent;border-color:currentColor;color:inherit">Space</span></button>`
        : second ? `<button type="button" class="btn btn-primary btn-block btn-lg" data-act="mloop-next">下一張 <span class="kbd kbd-hint" style="background:transparent;border-color:currentColor;color:inherit">Space</span></button>`
        : `<div class="rate two">
          <button type="button" class="btn" data-act="mloop-rate" data-g="again">忘了<small>1・這一輪最後再看</small></button>
          <button type="button" class="btn btn-primary" data-act="mloop-rate" data-g="good">記得<small>2</small></button>
        </div>`}
      <div class="row-wrap mt-3" style="justify-content:space-between">
        <button type="button" class="btn btn-sm btn-ghost" data-act="speak" data-text="${esc(mloopSpeakText(m))}">${icon('speaker')}朗讀</button>
        <button type="button" class="btn btn-sm btn-ghost" data-act="nav" data-route="#/mistakes">結束</button>
      </div>
    </div>`;
}
// ---- 聽播: the notebook read aloud in a loop. Word → meaning (Chinese, browser voice) → example; sentence → translation →
// sentence again. Pure listening: no schedule, no counts. The screen shows everything at once, no flipping. ----
let LISTEN = null;   // { all, items, idx, round, playing, order: 'count'|'random', scope: 'all'|'v'|'g', zh, run, wake }
const LISTEN_GAP = { short: 350, long: 900 };
function listenEntryVocab(it, m) {
  const w = jaPlain(it.w); const pin = it.r && !HAS_KANJI.test(it.r) && it.r !== w ? it.r : '';
  return { kind: 'v', id: m ? m.id : it.key, m: m || null, word: w, wordHtml: wordHtml(it), reading: pin, meaning: it.m || '', ex: vocabExamples(it)[0] || null, item: it, kanji: wordKanji(w) };
}
// the kanji a word is written with, in order and once each, as far as the kanji table has them (the player's card lists them, 1.0.27)
function wordKanji(w) { return [...new Set([...w].filter(ch => KANJI_RE.test(ch)))].map(ch => REG.byKey.get('k:' + ch)).filter(Boolean); }
function listenEntry(m) {
  const it = m.key && REG.byKey.get(m.key);
  if (it && it.kind === 'v') return listenEntryVocab(it, m);
  if (it && it.kind === 'k') {
    const ex = (it.ex || [])[0];
    return ex ? { kind: 'v', id: m.id, m, word: ex[0], wordHtml: furi(ex[0]), reading: ex[1] || '', meaning: ex[2] || it.m || '', ex: null, note: `漢字「${it.k}」` }
      : { kind: 'v', id: m.id, m, word: it.k, wordHtml: esc(it.k), reading: '', meaning: it.m || '', ex: null };
  }
  if (it && it.kind === 'g' && Array.isArray(it.parts)) {   // 排序題 (practice or the mock exam's ★ form): the full sentence, the ★ piece marked
    const parts = it.parts.map(parenReadingToBracket);
    return { kind: 'g', id: m.id, m, sentence: (it.pre || '') + parts.join('') + (it.post || ''),
      html: `${furi(it.pre || '')}${parts.map((x, i) => i === it.star ? `<span class="fill-ans">${furi(x)}</span>` : furi(x)).join('')}${furi(it.post || '')}`, zh: it.zh || '', pt: it.pt || m.cat || '', marked: true };
  }
  const b = splitBlank(m.prompt || ''); const ans = m.answer || '';
  const sentence = b ? b.pre + ans + b.post : (m.prompt || '');
  const html = b ? `${furi(b.pre)}<span class="fill-ans">${furi(ans)}</span>${furi(b.post)}` : furi(m.prompt || '');
  return { kind: 'g', id: m.id, m, sentence, html, zh: (it && it.zh) || '', pt: (it && it.kind === 'g' && it.pt) || m.cat || '', marked: Boolean(b) };   // marked: the answer sits in the sentence (the blue part)
}
// a grammar entry is worth hearing only as a complete sentence with its Chinese: a question about meaning (內容理解,
// no blank to fill, so nothing to mark) or one without a translation is left out of the player
function listenPlayable(e) { return e.kind !== 'g' || (Boolean(e.zh) && e.marked); }
// listening and reading questions are about the passage, not a sentence to absorb: the player skips them
function listenable(m) {
  const it = m.key && REG.byKey.get(m.key);
  if (it) return it.kind !== 'l' && it.kind !== 'r';
  return !/^【(聽力|情境|閱讀)】|^排序：/.test(m.prompt || '');   // unlinked (old or hand-made) entries: by their label
}
function listenBuild() {
  // a theme plays all its cards (no 字｜文) and, not shuffled, in its own order: its words have no mistake count to sort by
  const L = LISTEN; const theme = L.source.kind === 'theme'; const list = theme ? L.all : L.all.filter(e => L.scope === 'all' || e.kind === L.scope);
  L.items = L.order === 'random' ? shuffle(list) : theme ? list.slice() : list.slice().sort((a, b) => mistakePriority(a.m, b.m));
  L.idx = 0;
}
// what the player reads: the notebook ({ kind: 'mistakes', cat }) or every word of a theme and its kanji ({ kind: 'theme', theme });
// the last choice is kept on the device so the Today card opens on it
const LISTEN_RATES = [0.8, 1, 1.3];
function listenPref() { try { return Object.assign({ source: 'mistakes', theme: '', rate: 1 }, JSON.parse(localStorage.getItem('nq_listen_pref') || '{}')); } catch (e) { return { source: 'mistakes', theme: '', rate: 1 }; } }
function setListenPref(patch) { try { localStorage.setItem('nq_listen_pref', JSON.stringify(Object.assign(listenPref(), patch))); } catch (e) { /* ignore */ } }
// 初識單詞: a virtual theme for the player — every built-in word already met but not yet 熟練 (the ones worth hearing again)
const REVIEW_THEME = '初識單詞';
function listenThemeWords(theme) {
  if (theme === REVIEW_THEME) return REG.vocab.filter(v => state.srs[v.key] && srsLevelLabel(state.srs[v.key], v.key) !== '已熟練');
  return REG.vocab.filter(v => vocabTheme(v) === theme);
}
// the picker's rows: 初識單詞 first (seen / 熟悉 split, nothing 熟練 by definition), then the real themes with their bars
function listenThemes() {
  const words = listenThemeWords(REVIEW_THEME); const learned = words.filter(v => state.srs[v.key].b >= SRS_LEARNED).length;
  return [{ c: REVIEW_THEME, total: words.length, seen: words.length, learned, mastered: 0, virtual: true }].concat(vocabThemes());
}
function listenDefaultTheme() {
  const pref = listenPref().theme; const themes = listenThemes();
  if (pref && themes.some(g => g.c === pref)) return pref;   // the last choice, wherever it was
  if (themes[0].total) return REVIEW_THEME;   // otherwise the words met but not yet mastered
  const fresh = dailyPlan().newV[0]; if (fresh) return vocabTheme(fresh);   // nothing met yet: today's new words' theme
  return themes.length > 1 ? themes[1].c : '';
}
// the theme picker: a button showing the theme over its progress bar; tapping opens the list (name, bar, counts)
function themePickHtml(theme) {
  const g = listenThemes().find(x => x.c === theme) || { c: theme || '—', total: 0, seen: 0, learned: 0, mastered: 0 };
  return `<button type="button" class="theme-pick grow" data-act="theme-pick" title="選單字主題" aria-label="單字主題：${esc(g.c)}"><span class="tp-row"><span class="tp-name">${esc(g.c)}</span><span class="tp-n tiny muted">${g.total} 字</span><span class="tp-caret">⌄</span></span>${stackBarHtml(g).replace('mt-2', 'tp-bar thin')}</button>`;
}
function themePickerModal() {
  const cur = LISTEN && LISTEN.source.kind === 'theme' ? LISTEN.source.theme : listenDefaultTheme();
  const rows = listenThemes().map(g => `<button type="button" class="theme-row${g.c === cur ? ' on' : ''}" data-act="listen-theme-pick" data-theme="${esc(g.c)}" ${g.total ? '' : 'disabled'}>
      <span class="row between"><span class="tp-name">${esc(g.c)}</span><span class="tiny muted">${g.virtual ? `已學 ${g.seen - g.learned}・熟悉 ${g.learned}` : `已學 ${g.seen}・熟悉 ${g.learned}・熟練 ${g.mastered}`}・共 ${g.total} 字</span></span>
      ${g.virtual ? '<span class="tiny muted" style="display:block;margin-top:2px">自動收錄已學但還沒熟練的字</span>' : ''}
      ${stackBarHtml(g)}</button>`).join('');
  openModal('單字主題', `<div class="theme-list">${rows}</div>`, { width: 560 });
}
function listenSourceFromPref() { const p = listenPref(); return p.source === 'theme' ? { kind: 'theme', theme: listenDefaultTheme() } : { kind: 'mistakes', cat: '' }; }
// a theme's words in their order, each followed by a card for every kanji (of the kanji table) it is the first of them to use (1.0.28),
// of the levels the learner has reached, whatever the word's own (1.0.34: at N5 no 願 card for お願いします, no N3 kanji card for the
// N3 words of 居家生活; the word card still lists them)
function listenThemeEntries(theme) {
  const out = []; const seen = new Set(); const cur = curLevel();
  listenThemeWords(theme).forEach(v => {
    const e = listenEntryVocab(v, null); out.push(e);
    e.kanji.forEach(k => { if (!seen.has(k.k) && levelUpTo(k.lv, cur)) { seen.add(k.k); out.push({ kind: 'k', id: k.key, m: null, k }); } });
  });
  return out;
}
function listenSourceEntries(source) {
  if (source.kind === 'theme') return listenThemeEntries(source.theme);
  return activeMistakes().filter(m => listenable(m) && (!source.cat || (m.cat || '綜合') === source.cat)).map(listenEntry).filter(listenPlayable);
}
// a paused player over a source (the Today card and the full page share it); an existing paused one is refreshed
function listenInit(source = listenSourceFromPref()) {
  if (LISTEN && LISTEN.playing) return LISTEN.items.length > 0;
  // the same source with the same entries (a page re-render, a pill tapped): keep the place and the order instead of
  // rebuilding — a rebuild starts over at a reshuffled first item, which looked like the player skipping ahead
  if (LISTEN && LISTEN.source.kind === source.kind && (LISTEN.source.theme || '') === (source.theme || '') && (LISTEN.source.cat || '') === (source.cat || '')) {
    const all = listenSourceEntries(source);
    if (all.length === LISTEN.all.length && all.every((e, i) => e.id === LISTEN.all[i].id)) return LISTEN.items.length > 0;
  }
  const keep = LISTEN ? { order: LISTEN.order, scope: LISTEN.scope, zh: LISTEN.zh, twice: LISTEN.twice, rate: LISTEN.rate } : null;
  // defaults: words only, shuffled, Chinese on, 兩次 (Japanese → Chinese → Japanese again); no words in the notebook → everything
  LISTEN = Object.assign({ source, all: listenSourceEntries(source), items: [], idx: 0, round: 1, playing: false, order: 'random', scope: 'v', zh: true, twice: true, rate: LISTEN_RATES.includes(listenPref().rate) ? listenPref().rate : 1, run: 0, wake: null }, keep || {});
  LISTEN.zh = true;   // Chinese is always read
  // words by default; a kept scope with nothing in it (the notebook was empty, or those entries left) goes back to words,
  // and only a notebook with grammar but no words opens on grammar
  const has = (k) => LISTEN.all.some(e => e.kind === k);
  if (source.kind === 'theme' || LISTEN.scope === 'all' || !has(LISTEN.scope)) LISTEN.scope = 'v';
  if (source.kind !== 'theme' && !has('v') && has('g')) LISTEN.scope = 'g';
  listenBuild();
  return LISTEN.items.length > 0;
}
function startListen(source = { kind: 'mistakes', cat: '' }) {
  if (LISTEN) { if (LISTEN.playing) listenStop(true); else LISTEN = null; }
  if (!listenInit(source)) { toast(source.kind === 'theme' ? '這個主題沒有單字。' : '錯題本目前是空的。'); return false; }
  setListenPref(source.kind === 'theme' ? { source: 'theme', theme: source.theme } : { source: 'mistakes' });
  go(source.kind === 'theme' ? '#/vocab/listen' : '#/mistakes/listen');
  listenPlay();
  return true;
}
function listenCurrent() { return LISTEN && LISTEN.items[LISTEN.idx]; }
// the next item's clips into memory while this one plays, so the swap after the silence is a microtask, not a fetch
function listenPrefetch(e) {
  if (!e || ttsConfig().engine !== 'cloud') return;
  const ja = (text, opt) => { const t = ttsText(text); if (t) engineBlob(t, '', opt).catch(() => {}); };
  const zh = (text) => { if (text && LISTEN && LISTEN.zh) engineBlob(String(text), '', { lang: 'zh' }).catch(() => {}); };
  if (e.kind === 'v') { ja(e.word, e.reading ? { reading: e.reading } : undefined); zh(e.meaning); if (e.ex) { ja(exPlain(e.ex.ex)); zh(e.ex.exZh); } }
  else if (e.kind === 'k') { const ex = (e.k.ex || [])[0]; if (ex) ja(ex[1]); zh(e.k.m); }
  else { ja(e.sentence); zh(e.zh); }
}
async function listenWake(on) {
  try {
    if (on) { if (LISTEN && !LISTEN.wake && navigator.wakeLock) LISTEN.wake = await navigator.wakeLock.request('screen'); }
    else if (LISTEN && LISTEN.wake) { const w = LISTEN.wake; LISTEN.wake = null; await w.release(); }
  } catch (e) { /* no wake lock: the screen may dim */ }
}
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && LISTEN && LISTEN.playing) listenWake(true); });
function listenPlay() {
  if (!LISTEN || !LISTEN.items.length) return;
  if (!LISTEN.playing) { LISTEN.since = Date.now(); LISTEN.heard = 0; }   // 言靈's 5 minutes start now (1.2.0)
  LISTEN.playing = true; speechRateOverride = LISTEN.rate || 1; listenWake(true); listenRenderNow();
  primeTtsPlayer();   // still inside the tap (page button or lock screen): the player starts now, the first line only swaps the source
  listenRun();
}
function listenPause() {
  if (!LISTEN) return;
  if (LISTEN.playing) { stopSpeaking(); stopSilence(); }   // only a playing player owns the speech; a paused one must not cut a listening question
  LISTEN.playing = false; LISTEN.run++; speechRateOverride = 0; listenWake(false); listenKotoStop(LISTEN); listenRenderNow();
}
function listenStop(silent) {
  if (!LISTEN) return;
  if (LISTEN.playing) { stopSpeaking(); stopSilence(); }
  const back = LISTEN.source && LISTEN.source.kind === 'theme' ? '#/vocab/level?lv=' + defaultVocabLevel() : '#/mistakes';
  LISTEN.playing = false; LISTEN.run++; speechRateOverride = 0; listenWake(false); listenKotoStop(LISTEN); LISTEN = null;
  if (!silent) go(back);
}
function listenSeek(delta) {
  if (!LISTEN || !LISTEN.items.length) return;
  LISTEN.run++; stopSpeaking();
  LISTEN.idx = (LISTEN.idx + delta + LISTEN.items.length) % LISTEN.items.length;
  listenRenderNow();
  if (LISTEN.playing) listenRun();
}
function listenSet(key, value) {
  if (!LISTEN) return;
  LISTEN.run++; stopSpeaking(); LISTEN[key] = value;
  if (key === 'rate') { setListenPref({ rate: value }); if (LISTEN.playing) speechRateOverride = value; }
  if (key !== 'zh' && key !== 'twice' && key !== 'rate') listenBuild();
  const playing = LISTEN.playing; LISTEN.playing = false;   // route() must not refresh the player; it is re-rendered in place
  route(); LISTEN.playing = playing;
  if (playing) listenRun(); else listenRenderNow();
}
async function listenRun() {
  const L = LISTEN; if (!L) return;
  const run = ++L.run;
  const alive = () => LISTEN === L && L.playing && L.run === run;
  while (alive()) {
    if (!L.items.length) { L.playing = false; listenRenderNow(); return; }
    if (L.idx >= L.items.length) { L.idx = 0; L.round++; if (L.order === 'random') L.items = shuffle(L.items); }
    listenRenderNow();
    const ok = await listenSpeak(L.items[L.idx], alive);
    if (!ok) return;
    L.idx++;
  }
}
// Between lines the shared <audio> plays silence instead of idling (iOS stops a hidden page's audio for good once the
// element goes idle); a line whose clip the system refused pauses the player on that item instead of skipping on.
async function listenSpeak(e, alive) {
  const step = async (fn, gap) => {
    if (!alive()) return false;
    const r = await fn();
    if (r === false) { if (alive()) listenPause(); return false; }
    if (!alive()) return false;
    listenKotoTick(LISTEN);
    await playSilence(gap);
    return alive();
  };
  if (LISTEN && LISTEN.items.length > 1) listenPrefetch(LISTEN.items[(LISTEN.idx + 1) % LISTEN.items.length]);
  const again = LISTEN.twice && LISTEN.zh;   // 兩次: the Japanese once more after the Chinese
  if (e.kind === 'v') {
    const word = () => speak(e.word, e.reading ? { reading: e.reading } : undefined);
    if (!await step(word, LISTEN_GAP.short)) return false;
    if (LISTEN.zh && e.meaning && !await step(() => speakZh(e.meaning), LISTEN_GAP.short)) return false;
    if (again && e.meaning && !await step(word, LISTEN_GAP.short)) return false;
    if (e.ex) {   // the example, then its Chinese
      if (!await step(() => speak(exPlain(e.ex.ex)), e.ex.exZh ? LISTEN_GAP.short : LISTEN_GAP.long)) return false;
      if (e.ex.exZh && !await step(() => speakZh(e.ex.exZh), LISTEN_GAP.long)) return false;
    } else if (!await step(() => Promise.resolve(), LISTEN_GAP.short)) return false;
    return true;
  }
  if (e.kind === 'k') {   // a kanji card: its example word in kana (the clip the kanji sheet plays), the kanji's meaning, the example again
    const ex = (e.k.ex || [])[0]; const word = () => (ex ? speak(ex[1]) : Promise.resolve());
    if (!await step(word, LISTEN_GAP.short)) return false;
    if (LISTEN.zh && !await step(() => speakZh(e.k.m), LISTEN_GAP.short)) return false;
    if (again && ex && !await step(word, LISTEN_GAP.short)) return false;
    if (!await step(() => Promise.resolve(), LISTEN_GAP.short)) return false;
    return true;
  }
  if (!await step(() => speak(e.sentence), LISTEN_GAP.short)) return false;
  if (LISTEN.zh && e.zh && !await step(() => speakZh(e.zh), LISTEN_GAP.short)) return false;
  if (again && e.zh && !await step(() => speak(e.sentence), LISTEN_GAP.short)) return false;
  if (!await step(() => Promise.resolve(), LISTEN_GAP.long)) return false;
  return true;
}
function listenCardHtml() {
  const e = listenCurrent();
  if (!e) return '<div class="flash"><div class="muted">這個範圍沒有錯題。</div></div>';
  if (e.kind === 'v') {
    return `<div class="flash">
      ${e.m ? `<div class="small muted">單字${e.note ? `・${esc(e.note)}` : ''}・錯 ${e.m.count || 1} 次</div>` : ''}
      <div class="word jp">${e.wordHtml}</div>
      <div class="meaning">${esc(e.meaning)}</div>
      ${e.kanji && e.kanji.length ? `<div class="listen-kanji">${e.kanji.map(k => `<button type="button" class="chip kanji-chip" data-act="listen-kanji" data-k="${esc(k.k)}"><span class="jp">${esc(k.k)}</span>${k.m && k.m !== k.k ? `<span class="lk-m">${esc(k.m)}</span>` : ''}</button>`).join('')}</div>` : ''}
      ${e.ex ? exampleHtml(e.ex.ex, e.ex.exZh, 'mt-3 listen-ex', e.item) : ''}
    </div>`;
  }
  if (e.kind === 'k') {   // a kanji card (1.0.28): the kanji (a tap opens its sheet), its meaning, its readings, the kanji table's first example word
    const k = e.k; const ex = (k.ex || [])[0]; const reads = kanjiReadingsHtml(k);
    return `<div class="flash">
      <div class="small muted">漢字</div>
      <div class="word jp"><button type="button" class="listen-k" data-act="listen-kanji" data-k="${esc(k.k)}">${esc(k.k)}</button></div>
      <div class="meaning">${esc(k.m)}</div>
      ${reads ? `<div class="listen-reads">${reads}</div>` : ''}
      ${ex ? `<div class="listen-kex"><span class="jp">${esc(ex[0])}</span> <span class="jp lk-r">${esc(ex[1])}</span> <span class="lk-m">${esc(ex[2] || '')}</span></div>` : ''}
    </div>`;
  }
  return `<div class="flash">
    <div class="small muted">文法${e.pt ? `・${esc(e.pt)}` : ''}${e.m ? `・錯 ${e.m.count || 1} 次` : ''}</div>
    <div class="jp listen-sentence">${e.html}</div>
    ${e.zh ? `<div class="meaning" style="font-weight:400">${esc(e.zh)}</div>` : ''}
  </div>`;
}
function listenRenderNow() {
  const L = LISTEN; if (!L) return;
  const card = document.getElementById('listenCard'); if (card) card.innerHTML = listenCardHtml();
  const n = document.getElementById('listenCount'); if (n) n.textContent = `${Math.min(L.idx + 1, L.items.length)} / ${L.items.length}・第 ${L.round} 輪`;
  const b = document.querySelector('[data-act=listen-toggle]'); if (b) b.innerHTML = icon(L.playing ? 'pause' : 'play');
  const stand = document.querySelector('#view .listen-stand'); if (stand) stand.classList.toggle('playing', L.playing);   // 聽一輪's notes rise while it plays
  const bar = document.getElementById('listenBar'); if (bar) bar.style.width = `${L.items.length ? Math.round((Math.min(L.idx, L.items.length - 1) + 1) / L.items.length * 100) : 0}%`;
  mediaSessionUpdate();
  fitFlash();
}
// 沉浸播放: the word fills its column (one line), the meaning follows at ~40%; a sentence wraps and grows until it would
// overflow its box. Measured, not guessed: CJK glyphs are 1em wide but ruby and Latin text are not.
function fitFlash() {
  const card = document.getElementById('listenCard'); if (!card || !document.body.classList.contains('immersive')) return;
  const flash = card.querySelector('.flash'); if (!flash) return;
  const word = flash.querySelector('.word'); const meaning = flash.querySelector('.meaning'); const sent = flash.querySelector('.listen-sentence'); const ex = flash.querySelector('.listen-ex');
  const boxH = card.clientHeight; const boxW = flash.clientWidth - 16;
  const fits = () => flash.scrollHeight <= boxH + 1 && flash.scrollWidth <= flash.clientWidth + 1;
  const setSizes = (f) => {
    if (word) word.style.fontSize = `${f}px`;
    if (sent) sent.style.fontSize = `${f}px`;
    if (meaning) meaning.style.fontSize = `${Math.round(Math.max(18, Math.min(48, f * (word ? 0.4 : 0.5))))}px`;
    if (ex) { const e = f < 40 ? 17 : 22; ex.querySelector('.jp').style.fontSize = `${e}px`; const zh = ex.querySelector('.zh'); if (zh) zh.style.fontSize = `${e < 20 ? 13 : 15}px`; }
  };
  let f;
  if (word) {   // one line: as wide as the box allows, but never taller than ~45% of it, and a short word stops at 120px
    word.style.fontSize = '100px'; const sw = word.scrollWidth || 1;
    f = Math.min(120, Math.floor(100 * boxW / sw), Math.floor(boxH * 0.45 / 1.25));
  } else if (sent) f = 72;
  else return;
  f = Math.max(24, f); setSizes(f);
  while (f > 24 && !fits()) { f -= 4; setSizes(f); }   // then down, 4px at a time, until the caption, text, Chinese and example all sit inside
}
window.addEventListener('resize', () => { if (document.body.classList.contains('immersive')) fitFlash(); });
function listenPanelHtml(full) {
  const L = LISTEN;
  return `
      ${full ? `<button type="button" class="btn btn-sm btn-ghost btn-icon listen-x" data-act="listen-close" aria-label="關閉">${icon('close')}</button><span class="listen-meta small muted"><span id="listenCount"></span>・${L.source.kind === 'theme' ? `單字・${esc(L.source.theme || '')}` : '錯題本'}</span>` : ''}
      <div id="listenCard"></div>
      <div class="listen-bar"><span id="listenBar"></span></div>
      <div class="listen-ctl">
        <button type="button" class="lbtn" data-act="listen-prev" aria-label="上一個">${icon('prev')}</button>
        <button type="button" class="lplay" data-act="listen-toggle" aria-label="播放／暫停"></button>
        <button type="button" class="lbtn" data-act="listen-next" aria-label="下一個">${icon('next')}</button>
      </div>
      <div class="listen-opts">
        ${L.source.kind === 'theme' ? '' : `<button type="button" class="lopt lopt-scope" data-act="listen-cycle" data-key="scope" data-value="${L.scope === 'g' ? 'g' : 'v'}" title="單字／文法（亮的是現在聽的，點一下切換）" aria-label="${L.scope === 'g' ? '現在聽文法，點一下改單字' : '現在聽單字，點一下改文法'}"><span class="${L.scope === 'g' ? '' : 'on'}">字</span><span class="${L.scope === 'g' ? 'on' : ''}">文</span></button>`}
        <button type="button" class="lopt${L.order === 'random' ? ' on' : ''}" data-act="listen-cycle" data-key="order" data-value="${L.order}" title="隨機（亮起）／${L.source.kind === 'theme' ? '照主題順序' : '錯最多次優先'}" aria-label="隨機">${icon('shuffle')}</button>
        <button type="button" class="lopt${L.twice ? ' on' : ''}" data-act="listen-cycle" data-key="twice" data-value="${L.twice ? '2' : '1'}" title="1：日文→中文；2：日文→中文→日文" aria-label="${L.twice ? '兩次' : '一次'}">${L.twice ? '2' : '1'}</button>
        <button type="button" class="lopt${L.rate !== 1 ? ' on' : ''}" data-act="listen-cycle" data-key="rate" data-value="${L.rate}" title="速度 ${L.rate}×（0.8 → 1 → 1.3）" aria-label="速度 ${L.rate} 倍">${icon('speed' + (Math.max(0, LISTEN_RATES.indexOf(L.rate)) + 1))}</button>
        ${full ? '' : '<span id="listenCount" class="listen-count"></span>'}
      </div>
      ${full ? '<p class="hint mt-3" style="text-align:center">循環唸到你按停；不寫排程、不算題數。播放中螢幕保持亮著，iPhone 鎖屏會停（Safari 的限制）。</p>' : ''}`;
}
function renderListen(view) {
  if (!LISTEN && !listenInit()) { toast('沒有可以聽的內容。'); go('#/listen'); return; }
  view.innerHTML = `<div class="card listen full">${listenPanelHtml(true)}</div>`;
  listenRenderNow();
}
// 聽一輪 (書房's headphones, 1.1.0): the player the 今日 card used to carry, over the notebook or a word theme; the switch opens
// on the last choice (kept on the device)
// 聽一輪 opens under 書房's headphones lying on the desk (1.1.0; no stand since 1.3.0); music notes rise from them while it plays
function listenStandHtml() {
  return `<div class="listen-stand${LISTEN && LISTEN.playing ? ' playing' : ''}" aria-hidden="true">
    <svg viewBox="0 0 80 74"><rect class="desk-top" x="2" y="64" width="76" height="6" rx="2"/>
      <path class="band" d="M19 56a21 21 0 0 1 42 0" fill="none" stroke-width="6" stroke-linecap="round"/>
      <rect class="cup" x="10" y="48" width="17" height="16" rx="6"/><rect class="cup" x="53" y="48" width="17" height="16" rx="6"/>
      <rect class="pad" x="24" y="51" width="5" height="13" rx="2"/><rect class="pad" x="51" y="51" width="5" height="13" rx="2"/></svg>
    <div class="notes"><i style="--w:0s;--dx:-14px">♪</i><i style="--w:-1.1s;--dx:12px">♫</i><i style="--w:-2.2s;--dx:-4px">♪</i></div>
  </div>`;
}
function renderListenTab(view) {
  const isTheme = listenPref().source === 'theme';
  const mk = activeMistakes();
  const ready = listenInit(isTheme ? { kind: 'theme', theme: listenDefaultTheme() } : { kind: 'mistakes', cat: '' });
  const segBtn = (kind, label) => `<button type="button" aria-pressed="${isTheme === (kind === 'theme')}" data-act="listen-source" data-source="${kind}">${label}</button>`;
  view.innerHTML = `
    <div class="page-head listen-top"><div><div class="page-title">聽一輪</div></div>${listenStandHtml()}</div>
    <div class="card listen compact listen-card">
      <div class="seg listen-seg">${segBtn('mistakes', `錯題本${mk.length ? ` <span class="n">${mk.length}</span>` : ''}`)}${segBtn('theme', '單字')}</div>
      <div class="listen-head">
        ${isTheme ? themePickHtml(LISTEN ? LISTEN.source.theme : listenDefaultTheme()) : `<span class="small muted">錯題本${mk.length ? `・${mk.length} 條` : ''}</span>`}
        ${ready ? `<button type="button" class="btn btn-sm btn-ghost btn-icon listen-full" data-act="listen-full" title="全螢幕播放" aria-label="全螢幕播放">${icon('expand')}</button>` : ''}
      </div>
      ${ready ? listenPanelHtml(false) : `<div class="small muted">${isTheme ? '這個主題沒有單字。' : '目前沒有可以聽的錯題。'}</div>`}
    </div>`;
  listenRenderNow();
}
// 沉浸播放: the full-page player hides the chrome (body.immersive, like practising); Android also goes fullscreen and
// turns landscape when it may (iOS ignores both calls); ✕ returns to where the player was opened from
function immersiveEnter() {
  try { if (document.fullscreenEnabled && !document.fullscreenElement && !(matchMedia('(display-mode: standalone)').matches)) document.documentElement.requestFullscreen().catch(() => {}); } catch (e) { /* not available */ }
  try { if (screen.orientation && screen.orientation.lock) screen.orientation.lock('landscape').catch(() => {}); } catch (e) { /* not available */ }
}
function immersiveLeave() {
  try { if (screen.orientation && screen.orientation.unlock) screen.orientation.unlock(); } catch (e) { /* ignore */ }
  try { if (document.fullscreenElement) document.exitFullscreen().catch(() => {}); } catch (e) { /* ignore */ }
}
// lock screen / control centre: title and transport buttons while a real audio clip plays (the cloud voice); the browser voice has no media session
function mediaSessionUpdate() {
  const ms = navigator.mediaSession; if (!ms) return;
  const L = LISTEN; const e = listenCurrent();
  try {
    if (!L || !e) { ms.metadata = null; ms.playbackState = 'none'; return; }
    ms.metadata = new MediaMetadata({ title: e.kind === 'v' ? `${e.word}　${e.meaning}` : e.kind === 'k' ? `${e.k.k}　${e.k.m}` : e.sentence, artist: L.source.kind === 'theme' ? `單字・${L.source.theme}` : '錯題本', album: 'Nihongo Quest 聽一輪', artwork: [{ src: './icons/icon-512.png', sizes: '512x512', type: 'image/png' }] });
    ms.playbackState = L.playing ? 'playing' : 'paused';
    if (!mediaSessionUpdate.bound) {
      mediaSessionUpdate.bound = true;
      [['play', () => listenPlay()], ['pause', () => listenPause()], ['previoustrack', () => listenSeek(-1)], ['nexttrack', () => listenSeek(1)]].forEach(([k, fn]) => { try { ms.setActionHandler(k, fn); } catch (err) { /* unsupported action */ } });
    }
  } catch (err) { /* no MediaMetadata */ }
}
function listenKey(ev) {
  const k = ev.key;
  if (k === ' ') { ev.preventDefault(); if (LISTEN && LISTEN.playing) listenPause(); else listenPlay(); }
  else if (k === 'ArrowRight') { ev.preventDefault(); listenSeek(1); }
  else if (k === 'ArrowLeft') { ev.preventDefault(); listenSeek(-1); }
  else if (k === 'Escape') { ev.preventDefault(); listenStop(); }
}
Object.assign(ACTIONS, {
  'listen-start': (el) => startListen({ kind: 'mistakes', cat: el.dataset.cat || '' }),
  'listen-kanji': (el) => { listenPause(); ACTIONS['kanji-open'](el); },   // the kanji's sheet has its own play buttons: the player waits
  'listen-theme-start': (el) => startListen({ kind: 'theme', theme: el.dataset.theme || listenDefaultTheme() }),
  'listen-source': (el) => {   // the 聽一輪 switch: a player over the other source gives way; the same source keeps it, playing or paused
    const kind = el.dataset.source === 'theme' ? 'theme' : 'mistakes';
    setListenPref({ source: kind });
    if (LISTEN && LISTEN.source.kind !== kind) { if (LISTEN.playing) listenStop(true); else LISTEN = null; }
    route();
  },
  'listen-toggle': () => { if (LISTEN && LISTEN.playing) listenPause(); else listenPlay(); },
  'listen-next': () => listenSeek(1),
  'listen-prev': () => listenSeek(-1),
  'listen-exit': () => listenStop(),
  'theme-pick': () => themePickerModal(),
  'listen-theme-pick': (el) => { const theme = el.dataset.theme || ''; closeModal(true); setListenPref({ source: 'theme', theme }); if (LISTEN) { if (LISTEN.playing) listenStop(true); else LISTEN = null; } route(); },
  'listen-full': () => { if (!LISTEN) return; LISTEN.from = 'tab'; immersiveEnter(); go(LISTEN.source.kind === 'theme' ? '#/vocab/listen' : '#/mistakes/listen'); },
  'listen-close': () => { const L = LISTEN; immersiveLeave(); if (L && L.from === 'tab') { L.from = ''; go('#/listen'); } else listenStop(); },
  'listen-set': (el) => listenSet(el.dataset.key, el.dataset.key === 'zh' ? el.dataset.value === 'true' : el.dataset.value),
  'listen-cycle': (el) => {
    const k = el.dataset.key; if (!LISTEN) return;
    if (k === 'scope') listenSet('scope', LISTEN.scope === 'g' ? 'v' : 'g');   // words or grammar, never both
    else if (k === 'order') listenSet('order', LISTEN.order === 'random' ? 'count' : 'random');
    else if (k === 'twice') listenSet('twice', !LISTEN.twice);
    else if (k === 'rate') listenSet('rate', LISTEN_RATES[(LISTEN_RATES.indexOf(LISTEN.rate) + 1) % LISTEN_RATES.length]);
  }
});

function mloopKey(ev) {
  if (!MLOOP) return;
  const k = ev.key; const m = mloopCurrent();
  if (k === ' ' || k === 'Enter') { ev.preventDefault(); if (!MLOOP.flipped) ACTIONS['mloop-flip'](); else if (m && MLOOP.rated[m.id]) ACTIONS['mloop-next'](); return; }
  if (MLOOP.flipped && m && !MLOOP.rated[m.id] && (k === '1' || k === '2')) { ev.preventDefault(); ACTIONS['mloop-rate']({ dataset: { g: k === '1' ? 'again' : 'good' } }); return; }
  if (k === 'f' || k === 'F') { ev.preventDefault(); toggleFurigana(); }
}
Object.assign(ACTIONS, {
  'mloop-start': () => startMistakeLoop(),
  'mloop-again': () => startMistakeLoop(MLOOP ? Object.keys(MLOOP.rated).filter(id => MLOOP.rated[id] === 'again') : []),
  'mloop-flip': () => { if (!MLOOP || MLOOP.flipped) return; MLOOP.flipped = true; route(); const m = mloopCurrent(); if (m) speak(mloopSpeakText(m)); },
  'mloop-rate': (el) => mloopRate(el.dataset.g),
  'mloop-next': () => { if (!MLOOP || !MLOOP.flipped) return; mloopAdvance(); }
});

// 錯題本 is the red notebook in 書房's drawer (1.1.0): its cover on top, the label counting what is in it; the list is on
// ruled paper with a red margin line
function notebookCoverHtml(active, mastered) {
  return `<div class="notebook-cover" aria-hidden="true"><i class="stitch"></i><div class="nb-label"><b>錯題本</b><span>待複習 ${active}・已掌握 ${mastered}</span></div></div>`;
}
function renderMistakes(view, params = {}) {
  const filter = ['active', 'mastered', 'all'].includes(params.f) ? params.f : 'active';
  const sort = ['count', 'recent', 'stale'].includes(params.s) ? params.s : 'count';
  const cat = params.c || ''; const group = params.g === 'pt' ? 'pt' : '';
  const link = (o) => '#/mistakes?' + Object.entries(Object.assign({ f: filter, s: sort, c: cat, g: group }, o)).filter(([, v]) => v).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&');
  const all = state.mistakes;
  const active = all.filter(m => !m.mastered);
  const base = filter === 'mastered' ? all.filter(m => m.mastered) : filter === 'all' ? all : active;
  const sorters = { count: mistakePriority, recent: (a, b) => mistakeLast(b).localeCompare(mistakeLast(a)), stale: (a, b) => mistakeLast(a).localeCompare(mistakeLast(b)) };
  const list = (cat ? base.filter(m => (m.cat || '綜合') === cat) : base).slice().sort(sorters[sort]);
  const cats = {};
  base.forEach(m => { cats[m.cat || '綜合'] = (cats[m.cat || '綜合'] || 0) + 1; });
  const catChips = Object.entries(cats).sort((a, b) => b[1] - a[1]).map(([c, n]) => `<button type="button" class="chip ${cat === c ? 'chip-accent' : ''}" data-act="nav" data-route="${link({ c: cat === c ? '' : c })}">${esc(c)} ${n}</button>`).join(' ');
  const t = todayStr();
  const row = (m) => {
    const linked = m.key && REG.byKey.get(m.key);
    const rec = m.key && state.srs[m.key];
    const status = m.mastered ? '<span class="chip chip-ok">已掌握</span>'
      : linked ? (rec ? `<span class="nowrap">${srsDots(rec.b)} <span class="tiny muted">${srsLevelLabel(rec, m.key)}</span></span>` : '')
        : `<span class="tiny muted">答對 ${new Set(m.okDays || []).size}／2 天</span>`;
    const when = mistakeLast(m); const ago = when ? daysBetween(when, t) : null;
    return `<details class="mrow" data-id="${esc(m.id)}" data-count="${m.count || 1}">
      <summary>
        <span class="chip">${esc(m.cat || '綜合')}</span>
        <span class="jp mprompt">${furi(tidyPrompt(m.prompt))}</span>
        <span class="small nowrap">正確 <b class="jp">${furi(m.answer || '')}</b></span>
        <span class="tiny muted nowrap">錯 ${m.count || 1} 次${ago === null ? '' : ago === 0 ? '・今天' : `・${ago} 天前`}</span>
        ${status}
      </summary>
      <div class="mbody">
        <div class="row-wrap small">${m.wrong ? `<span class="muted">你選過：<span class="jp">${esc(m.wrong)}</span></span>` : ''}<button type="button" class="btn btn-sm btn-ghost btn-icon" data-act="speak" data-text="${esc(jaPlain(m.prompt))}" aria-label="朗讀">${icon('speaker')}</button></div>
        ${m.why ? `<div class="small mt-2">${md(m.why)}</div>` : ''}
        <div class="row-wrap mt-2">
          <input class="input grow" placeholder="自己的筆記或口訣" value="${esc(m.note || '')}" data-change="mistake-note" data-id="${esc(m.id)}" style="min-width:180px" />
          ${aiReady() ? `<button type="button" class="btn btn-sm" data-act="mistake-ai" data-id="${esc(m.id)}">AI 解析</button>` : ''}
          <button type="button" class="btn btn-sm btn-ghost" data-act="mistake-toggle" data-id="${esc(m.id)}">${m.mastered ? '移回待複習' : '標為已掌握'}</button>
          <button type="button" class="btn btn-sm btn-ghost btn-danger" data-act="mistake-del" data-id="${esc(m.id)}">刪除</button>
        </div>
        ${linked ? '' : '<div class="hint mt-2">這題來自舊版或手動新增，練習時用自評卡出題，隔天以上答對兩次就移到已掌握。</div>'}
      </div></details>`;
  };
  let body;
  if (group === 'pt') {
    // grammar by 考點 (with a drill button), everything else by category
    const groups = new Map();
    list.forEach(m => {
      const it = m.key && REG.byKey.get(m.key);
      const name = it && it.kind === 'g' && it.pt ? it.pt : (m.cat || '綜合');
      const g = groups.get(name) || groups.set(name, { name, pt: it && it.kind === 'g' ? it.pt : '', items: [] }).get(name);
      g.items.push(m);
    });
    body = [...groups.values()].sort((a, b) => b.items.length - a.items.length).map(g => `<div class="card mgroup ruled">
        <div class="row between"><div><b>${esc(g.name)}</b> <span class="small muted">${g.items.length} 題</span></div>${g.pt ? `<button type="button" class="btn btn-sm" data-act="stats-drill" data-pt="${esc(g.pt)}">練這個考點</button>` : ''}</div>
        <div class="mlist mt-2">${g.items.map(row).join('')}</div></div>`).join('');
  } else {
    body = `<div class="card mlist ruled">${list.slice(0, 300).map(row).join('')}</div>`;
  }
  view.innerHTML = `
    ${notebookCoverHtml(active.length, all.length - active.length)}
    <div class="page-head">
      <div><div class="page-title">錯題本</div><div class="page-sub">答錯的題目會自動收進來；用字卡快速過一輪，忘了／記得直接回寫複習排程。題目達到「熟悉」就移到「已掌握」。</div></div>
      <div class="row-wrap">
        ${active.length ? `<button type="button" class="btn btn-primary" data-act="mloop-start">快速過一輪・${Math.min(active.length, MLOOP_MAX)} 張</button>` : ''}
        <button type="button" class="btn" data-act="start-mistakes" ${active.length ? '' : 'disabled'}>用測驗練（${active.length}）</button>
        ${active.length ? `<button type="button" class="btn" data-act="listen-start" data-cat="${esc(cat)}">${icon('speaker')}聽一輪</button>` : ''}
        <button type="button" class="btn" data-act="mistake-add">手動新增</button>
        ${filter === 'mastered' && base.length ? `<button type="button" class="btn btn-ghost" data-act="mistake-clear-mastered">清空已掌握（${base.length}）</button>` : ''}
      </div>
    </div>
    <div class="row-wrap mb-3" style="align-items:center">
      <div class="seg">
        <button type="button" aria-pressed="${filter === 'active'}" data-act="nav" data-route="${link({ f: 'active', c: '' })}">待複習 ${active.length}</button>
        <button type="button" aria-pressed="${filter === 'mastered'}" data-act="nav" data-route="${link({ f: 'mastered', c: '' })}">已掌握 ${all.length - active.length}</button>
        <button type="button" aria-pressed="${filter === 'all'}" data-act="nav" data-route="${link({ f: 'all', c: '' })}">全部 ${all.length}</button>
      </div>
      <div class="seg">
        <button type="button" aria-pressed="${group === ''}" data-act="nav" data-route="${link({ g: '' })}">列表</button>
        <button type="button" aria-pressed="${group === 'pt'}" data-act="nav" data-route="${link({ g: 'pt' })}">依考點</button>
      </div>
      <select class="select" style="width:auto" data-change="mistake-sort" data-base="${esc(link({ s: '' }))}">
        <option value="count" ${sort === 'count' ? 'selected' : ''}>錯最多次</option>
        <option value="recent" ${sort === 'recent' ? 'selected' : ''}>最近錯的</option>
        <option value="stale" ${sort === 'stale' ? 'selected' : ''}>最久沒練</option>
      </select>
    </div>
    ${catChips ? `<details class="disclose mb-3 cat-filter"><summary class="small muted">${cat ? `分類：${esc(cat)} <button type="button" class="chip" data-act="nav" data-route="${link({ c: '' })}" title="清除分類">✕</button>` : `分類篩選（${Object.keys(cats).length} 類）`}</summary><div class="row-wrap mt-2">${catChips}</div></details>` : ''}
    ${list.length ? body : '<div class="card empty">這裡沒有題目。</div>'}
    ${list.length > 300 && group !== 'pt' ? '<p class="hint">只顯示前 300 題。</p>' : ''}`;
}

Object.assign(ACTIONS, {
  'mistake-clear-mastered': () => {
    const n = state.mistakes.filter(m => m.mastered).length;
    if (!n || !confirm(`刪除 ${n} 題已掌握的錯題？`)) return;
    state.mistakes = state.mistakes.filter(m => !m.mastered); saveState(); route();
  },
  'mistake-toggle': (el) => {
    const m = state.mistakes.find(x => x.id === el.dataset.id);
    if (!m) return;
    m.mastered = !m.mastered; m.streak = m.mastered ? 3 : 0;
    saveState(); route();
  },
  'mistake-del': (el) => {
    state.mistakes = state.mistakes.filter(x => x.id !== el.dataset.id);
    saveState(); route();
  },
  'mistake-ai': (el) => {
    const m = state.mistakes.find(x => x.id === el.dataset.id);
    if (m) aiExplainMistake(m, el);
  },
  'mistake-add': () => openModal('手動新增錯題', `
    <div class="field"><label>題目（可用「（　）」表示空格）</label><input class="input jp" id="mkPrompt" placeholder="バス（　）乗ります。" /></div>
    <div class="grid grid-2 mt-3">
      <div class="field"><label>正確答案</label><input class="input jp" id="mkAnswer" placeholder="に" /></div>
      <div class="field"><label>容易選錯的答案</label><input class="input jp" id="mkWrong" placeholder="を" /></div>
    </div>
    <div class="field mt-3"><label>說明（可留空）</label><textarea class="input" id="mkWhy" rows="3" placeholder="乗る的對象用「に」。"></textarea></div>
    <div class="row-wrap mt-4"><button type="button" class="btn btn-primary" data-act="mistake-save">儲存</button></div>`, { width: 560 }),
  'mistake-save': () => {
    const prompt = document.getElementById('mkPrompt').value.trim();
    const answer = document.getElementById('mkAnswer').value.trim();
    if (!prompt || !answer) { toast('請填寫題目與正確答案'); return; }
    state.mistakes.unshift({ id: uid('mk'), key: '', cat: '自訂', prompt, answer, wrong: document.getElementById('mkWrong').value.trim(), why: document.getElementById('mkWhy').value.trim(), count: 1, streak: 0, mastered: false, note: '', date: todayStr() });
    saveState(); closeModal(); toast('已加入錯題本'); route();
  }
});
Object.assign(CHANGE_ACTIONS, {
  'mistake-sort': (el) => go(`${el.dataset.base}&s=${el.value}`),
  'mistake-note': (el) => {
    const m = state.mistakes.find(x => x.id === el.dataset.id);
    if (m) { m.note = el.value; saveState(); toast('已儲存筆記'); }
  }
});
