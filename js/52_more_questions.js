'use strict';
/* ==========================================================================
   More question types: listening, reading passages, kanji
   ========================================================================== */
function playButton(label = '再聽一次') {
  return `<div class="center"><button type="button" class="speak-big" data-act="replay">${icon('speaker')}<span>${label}</span></button>
    <div class="speech-prog" id="speechProg" hidden><div class="bar"><span></span></div><div class="tiny muted lab"></div></div></div>`;
}
// Playback progress of a listening script: line n of N, the bar advancing by the clip's real time (external engines) or
// by the length estimate (browser voice, which reports no progress), snapping at each line boundary.
const SPEECH_PROG = { token: -1, total: 0, idx: 0, start: 0, est: 0, real: null, done: false, timer: null };
function speechProgStart(token, total) { Object.assign(SPEECH_PROG, { token, total, idx: 0, start: Date.now(), est: 1, real: null, done: false }); if (!SPEECH_PROG.timer) SPEECH_PROG.timer = setInterval(renderSpeechProg, 120); renderSpeechProg(); }
function speechProgLine(i, text, rate) { Object.assign(SPEECH_PROG, { idx: i, start: Date.now(), est: 2500 + String(text).length * 350 / (rate || 1), real: null }); renderSpeechProg(); }
function speechProgEnd() { SPEECH_PROG.done = true; renderSpeechProg(); }
function renderSpeechProg() {
  const el = document.getElementById('speechProg');
  const live = SPEECH_PROG.token === speechToken && SPEECH_PROG.total > 0;
  if (!live || !el) { if (!live && SPEECH_PROG.timer) { clearInterval(SPEECH_PROG.timer); SPEECH_PROG.timer = null; } if (el && !live) el.hidden = true; return; }
  const P = SPEECH_PROG;
  const frac = P.done ? 1 : (P.idx + (P.real != null ? P.real : Math.min(0.95, (Date.now() - P.start) / P.est))) / P.total;
  el.hidden = false; el.classList.toggle('done', P.done);
  el.querySelector('.bar span').style.width = `${Math.round(frac * 100)}%`;
  el.querySelector('.lab').textContent = P.done ? '播放完畢' : `第 ${P.idx + 1} / ${P.total} 句`;
  if (P.done && P.timer) { clearInterval(P.timer); P.timer = null; }
}
// Audio-only options (q.audioOptions): each option is a play button and is spoken only when tapped; nothing is
// read in sequence, so no option can be skipped and no option number needs to be spoken.
function audioOptionHtml(i, cls, o, answerAct, disabled) {
  return `<div class="${cls} opt-audio">
      <button type="button" class="opt-play" data-act="speak" data-text="${esc(o.text)}" title="播放選項 ${i + 1}">${icon('speaker')}<span>選項 ${i + 1}</span></button>
      <button type="button" class="opt-pick" data-act="${answerAct}" data-i="${i}" ${disabled ? 'disabled' : ''}><span class="kbd">${i + 1}</span><span>選這個</span></button>
    </div>`;
}
// external engines: fetch the option clips while the learner listens to the prompt, so a tap plays at once
function prefetchSpeech(texts) {
  const cfg = ttsConfig();
  if (!cfg.engine || cfg.engine === 'browser_neural') return;
  texts.forEach(t => { const x = ttsText(t); if (x) engineBlob(x, '').catch(() => {}); });
}
// a copy of q with the options in a new order (the answer index follows)
function requeueQuestion(q, opts) {
  const again = Object.assign({}, q, { id: uid('q'), options: opts, answer: opts.indexOf(q.options[q.answer]) });
  delete again._rmap;
  return again;
}

function makeListenQuestion(it) {
  const q = baseQ(it);
  const others = (it.op || []).filter(o => o !== it.a);
  q.cat = '聽力'; q.lv = it.lv; q.unit = it.u; q.why = it.why || ''; q.wide = true;
  q.point = { dialog: '聽力：對話', resp: '聽力：即時應答', scene: '聽力：情境表達' }[it.t] || '聽力';
  const audioOnly = it.t === 'resp' || it.t === 'scene';   // replies and scene lines are only heard, like the real test
  if (it.t === 'dialog') {
    q.fmt = 'l-dialog';
    q.label = `聽力 · ${it.lv} · 對話`;
    q.instr = '先聽問題和對話，再選出答案。';
    finalizeOptions(q, it.a, others, true);
    q.stemHtml = `${playButton()}<div class="mt-3">${furi(it.q)}</div>`;
    q.audio = `${it.q}\n${it.script}\n${it.q}`;   // like the test: question, dialogue, question again
    q.audioScript = true;
    q.revealHtml = transcriptHtml(it.script, it.zh);
    q.mistakePrompt = `【聽力】${it.q}`;
  } else if (it.t === 'resp') {
    q.fmt = 'l-resp';
    q.label = `聽力 · ${it.lv} · 即時應答`;
    q.instr = '聽對方說的話，選出最合適的回應。';
    finalizeOptions(q, it.a, others, true);
    q.stemHtml = playButton();
    q.audio = it.line;
    q.audioScript = true;
    q.audioOptions = audioOnly;
    q.revealHtml = transcriptHtml(it.line, it.zh);
    q.mistakePrompt = `【聽力】${it.line}`;
  } else {
    q.fmt = 'l-scene';
    q.label = `聽力 · ${it.lv} · 情境表達`;
    q.instr = '看情境，選出最合適的說法。';
    finalizeOptions(q, it.a, others, true);
    q.stemHtml = `<div class="dim" style="font-size:17px;line-height:1.7">${esc(it.scene)}</div>`;
    if (audioOnly) q.audioOptions = true;
    q.mistakePrompt = `【情境】${it.scene}`;
  }
  q.answerText = jaPlain(it.a);
  return q;
}
function transcriptHtml(script, zh) {
  const lines = String(script || '').split('\n').filter(Boolean).map(l => `<div>${furi(l)}</div>`).join('');
  return `<div class="panel mt-3"><div class="tiny muted mb-2">原文</div><div class="jp" style="line-height:1.9">${lines}</div>
    ${zh ? `<details class="disclose mt-2"><summary>中文翻譯</summary><div class="small dim mt-2" style="white-space:pre-line">${esc(zh)}</div></details>` : ''}</div>`;
}

function makeReadQuestion(it) {
  const q = baseQ(it);
  q.cat = '閱讀'; q.lv = it.lv; q.unit = it.u; q.why = it.why || ''; q.wide = true;
  q.point = '閱讀理解';
  q.fmt = 'r-passage';
  q.label = `閱讀 · ${it.lv}`;
  q.instr = '閱讀短文，回答問題。';
  q.passageHtml = furi(it.passage).replace(/\n/g, '<br>');
  q.stemHtml = furi(it.q);
  finalizeOptions(q, it.a, (it.op || []).filter(o => o !== it.a), true);
  q.revealHtml = it.zh ? `<details class="disclose mt-2"><summary>短文的中文翻譯</summary><div class="small dim mt-2" style="white-space:pre-line">${esc(it.zh)}</div></details>` : '';
  q.mistakePrompt = `【閱讀】${it.q}`;
  q.answerText = jaPlain(it.a);
  return q;
}

// ---------- kanji ----------
// To a reader of Chinese most kanji mean what they look like (四, 木 = 樹、木頭), so practice leans on
// readings; the meaning question is kept for kanji whose meaning does not contain the kanji itself.
const kunText = (k) => (k.kun || []).map(r => r.replace(/\((.+)\)/, '（$1）')).join('・');
const kataToHira = (s) => s.replace(/[ァ-ヶ]/g, c => String.fromCharCode(c.charCodeAt(0) - 0x60));
const kanjiReadSet = (k) => new Set((k.on || []).map(kataToHira).concat((k.kun || []).map(r => r.replace(/\(.*\)/, ''))));
const meaningShowsKanji = (k) => String(k.m || '').includes(k.k);
function kanjiReadingsHtml(k) {
  const parts = [];
  if ((k.on || []).length) parts.push(`<span class="chip">音 <span class="jp">${esc(k.on.join('・'))}</span></span>`);
  if ((k.kun || []).length) parts.push(`<span class="chip">訓 <span class="jp">${esc(kunText(k))}</span></span>`);
  return parts.join(' ');
}
// the readings as the question itself, larger than the chips
function kanjiReadingsLine(k) {
  // on a phone a long list breaks only between readings
  const part = (label, rs) => `<span style="display:inline-block;max-width:100%"><span class="small muted">${label}</span> <span class="jp">${rs.map(r => `<span class="nowrap">${esc(r)}</span>`).join('・<wbr>')}</span></span>`;
  const kun = (k.kun || []).map(r => r.replace(/\((.+)\)/, '（$1）'));
  return `<div style="line-height:1.7">${[(k.on || []).length ? part('音', k.on) : '', kun.length ? part('訓', kun) : ''].filter(Boolean).join('　　')}</div>`;
}
// which of the kanji's readings an example word uses (祖父 そふ: フ, 音讀); null when none or more than one fits, or the sound
// changes (三本 さんぼん)
function kanjiReadingIn(k, w, r) {
  const at = w.startsWith(k.k) ? 'start' : w.endsWith(k.k) ? 'end' : 'mid';
  const fits = (x) => Boolean(x) && (at === 'start' ? r.startsWith(x) : at === 'end' ? r.endsWith(x) : r.includes(x));
  const hits = (k.on || []).map(x => ({ r: kataToHira(x), kind: '音讀' })).concat((k.kun || []).map(x => ({ r: x.replace(/\(.*\)/, ''), kind: '訓讀' }))).filter(h => fits(h.r));
  return hits.length === 1 ? hits[0] : null;
}
// asked: the example word a 讀音 question was about ([w, r, m]); it comes first, so the note answers the question before it
// turns to the kanji, and the other examples follow one to a line
function kanjiWhy(k, withReadings = true, asked = null) {
  const lines = [];
  if (asked) {
    const [w, r, m] = asked; const used = kanjiReadingIn(k, w, r);
    lines.push(`**${w}**（${r}）${m ? `：${m}` : ''}`);
    if (used) lines.push(`- 「${k.k}」在這裡讀「${used.r}」（${used.kind}）`);
    if (k.m !== k.k) lines.push(`- 「${k.k}」的意思：${k.m}`);
  } else if (k.m !== k.k) lines.push(`**${k.k}**：${k.m}`);
  if (withReadings && (k.on || []).length) lines.push(`- 音讀：${k.on.join('・')}`);
  if (withReadings && (k.kun || []).length) lines.push(`- 訓讀：${kunText(k)}`);
  (k.ex || []).filter(x => !asked || x[0] !== asked[0]).forEach(([w, r, m]) => lines.push(`- 例：${w}（${r}）${m ? `：${m}` : ''}`));
  return lines.join('\n');
}
function kanjiPeers(k) { const top = shownTop(k.lv); return REG.kanji.filter(x => x.key !== k.key && levelUpTo(x.lv, top)); }

function makeKanjiQuestion(k, ctx = {}) {
  const rec = srsGet(k.key);
  const b = rec ? rec.b : -1;
  const meaningOk = !meaningShowsKanji(k);
  const pairs = b < 0 ? [[meaningOk ? 'k-meaning' : 'k-read', 1]]
    : [['k-read', 3], ['k-shape', 2]].concat(meaningOk ? [['k-meaning', b <= 2 ? 2 : 1]] : []);
  // a first look that cannot be a reading question falls back to the meaning card, which shows the readings
  const order = meaningOk || b < 0 ? ['k-meaning', 'k-read', 'k-shape'] : ['k-read', 'k-shape', 'k-meaning'];
  const q = baseQ(k);
  q.cat = '漢字'; q.lv = k.lv; q.point = '漢字';
  q.mistakePrompt = `漢字「${k.k}」`;
  q.mistakeWhy = kanjiWhy(k);
  const first = (k.ex || [])[0];
  q.speakWord = first ? first[1] : '';
  const build = (f) => {
    if (f === 'k-meaning') {
      const pool = shuffle(kanjiPeers(k)).sort((a, c) => (c.lv === k.lv) - (a.lv === k.lv));
      const opts = [];
      for (const x of pool) {
        if (!x.m || x.m === k.m || zhOverlap(x.m, k.m) || opts.some(o => o === x.m || zhOverlap(o, x.m))) continue;
        opts.push(x.m);
        if (opts.length === 3) break;
      }
      if (opts.length < 3) return false;
      q.fmt = f; q.label = `漢字 · ${k.lv} · 意思`;
      q.instr = '這個漢字的意思是？';
      q.stemHtml = `<span class="kanji-big">${esc(k.k)}</span>`; q.stemClass = 'word';
      q.subHtml = kanjiReadingsHtml(k);
      finalizeOptions(q, k.m, opts, false);
      q.answerText = k.m;
      return true;
    }
    if (f === 'k-shape') {
      // which kanji is read like this: the decoys share none of its readings, look-alikes first
      const mine = kanjiReadSet(k); const top = shownTop(k.lv);
      const cands = [];
      const push = (x) => { if (x && x.key !== k.key && levelUpTo(x.lv, top) && !cands.includes(x.k) && ![...kanjiReadSet(x)].some(r => mine.has(r))) cands.push(x.k); };
      shuffle([...new Set((k.look || []).concat(LOOKALIKE_OF[k.k] || []))]).forEach(c => { if (cands.length < 2) push(REG.byKey.get('k:' + c)); });
      const peers = shuffle(kanjiPeers(k).filter(x => x.lv === k.lv));
      peers.filter(x => state.srs[x.key]).concat(peers).forEach(x => { if (cands.length < 3) push(x); });
      if (cands.length < 3) return false;
      q.fmt = f; q.label = `漢字 · ${k.lv} · 選字`;
      q.instr = '哪一個漢字是這樣讀的？';
      q.stemHtml = kanjiReadingsLine(k);
      q.stemClass = 'zhstem center';
      finalizeOptions(q, k.k, cands, true);
      q.noFuriOptions = true;
      q.answerText = k.k;
      return true;
    }
    // k-read: how an example word is read; new or just-forgotten kanji show their readings as a hint
    const exs = shuffle((k.ex || []).filter(([w, r]) => w && r && r.length >= 2 && w !== r));
    for (const [w, r, m] of exs) {
      const vars = readingOptions(r);
      if (!vars) continue;
      q.fmt = 'k-read'; q.label = `漢字 · ${k.lv} · 讀音`;
      q.instr = `「${k.k}」的例詞怎麼讀？`;
      q.stemHtml = `<span class="uline">${esc(w)}</span>`; q.stemClass = 'word';
      q.noFuri = true;
      q.subHtml = `<span class="small muted">${esc(m || '')}</span>${b <= 0 ? `<div class="row-wrap mt-2" style="justify-content:center">${kanjiReadingsHtml(k)}</div>` : ''}`;
      q.speakWord = r; q.askedEx = [w, r, m];
      finalizeOptions(q, r, vars, true);
      q.answerText = r;
      return true;
    }
    return false;
  };
  const fmt = weightedPick(pairs, ctx.avoidFmt);
  if (!build(fmt) && !order.some(f => f !== fmt && build(f))) return null;
  // readings already on screen are left out of the explanation
  q.why = kanjiWhy(k, q.fmt === 'k-read' && b > 0, q.fmt === 'k-read' ? q.askedEx : null);
  return q;
}
