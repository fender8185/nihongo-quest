'use strict';
/* ==========================================================================
   AI: every AI feature, answered through the site's own Gemini key
   ========================================================================== */
// The key stays on Supabase (Edge Function swift-api, source supabase/functions/ai): learners only need to be logged in.
// The function picks the model (3.5 Flash Lite, then 3.1 once the day's share is used) and caps each learner's questions a day.
const AI_FN = 'swift-api';
const AI_REGION = 'ap-south-1';   // the database's region; a nearer one might be Hong Kong, which Gemini refuses
const AI_TIMEOUT_MS = 60000;
const AI_LAST = { model: '', mine: 0, cap: 0 };   // which model answered the last call and the learner's count today (shown under AI output)
try { ['nq_gemini_cool', 'nq_gemini_models', 'nq_gemini_models2'].forEach(k => localStorage.removeItem(k)); } catch (e) { /* ignore */ }   // left by the own-key AI before 1.0.49
// small on-device cache for AI answers (explanations are asked for the same question again and again)
function aiCacheGet(k) { try { return JSON.parse(localStorage.getItem('nq_ai_cache') || '[]').find(x => x.k === k) || null; } catch (e) { return null; } }
function aiCacheSet(k, text, model) { try { const a = JSON.parse(localStorage.getItem('nq_ai_cache') || '[]').filter(x => x.k !== k); a.unshift({ k, text, model, t: Date.now() }); localStorage.setItem('nq_ai_cache', JSON.stringify(a.slice(0, 300))); } catch (e) { /* ignore */ } }
function aiCaption(model, cached) { return model ? `<div class="tiny muted mt-1">由 ${esc(model)} 產生${cached ? '・已儲存，不再重問' : AI_LAST.cap ? `・今天第 ${AI_LAST.mine}／${AI_LAST.cap} 次` : ''}</div>` : ''; }

function aiReady() { return Boolean(Sync.client && Sync.session); }

function aiSystemPrompt() {
  const u = unitById(state.currentUnit);
  return [
    `你是指導台灣學習者的日語老師，學生的目標是通過 JLPT ${courseLevels().includes(state.settings.examLevel) ? state.settings.examLevel : DEFAULT_LEVEL}。`,
    `學生目前在學「${u.weeks}・${u.title}」（${u.lv}）。`,
    '用繁體中文（台灣用語）回答，直接說重點，不寒暄、不用表情符號、不用誇張的形容。',
    `日文例句要自然，程度不要超過 ${aiLevelTop()}；需要標讀音時寫成「漢字（よみ）」。`,
    '設計填空題時，括號「（　）」後面不可殘留會和選項重複的語尾（例如選項是「静かです」，括號後就不能再有「です」）。'
  ].join('\n');
}

async function callAi(prompt, opt = {}) {
  if (!aiReady()) throw new Error('登入後才能用 AI（設定 › 資料 › 雲端同步）。');
  const body = { prompt, system: opt.system || aiSystemPrompt(), json: Boolean(opt.json) };
  if (opt.temperature !== undefined) body.temperature = opt.temperature;
  let timer;
  const late = new Promise((_, no) => { timer = setTimeout(() => no(new Error(`AI 沒有回應（${AI_TIMEOUT_MS / 1000} 秒），請稍後再試。`)), AI_TIMEOUT_MS); });
  try {
    const { data, error } = await Promise.race([Sync.client.functions.invoke(AI_FN, { body, region: AI_REGION }), late]);
    if (error) {
      let msg = '';
      try { msg = (await error.context.json()).error || ''; } catch (e) { /* not the function's own answer */ }
      if (!msg && error.context && error.context.status === 401) msg = '登入狀態失效，請重新登入後再試。';
      throw new Error(msg || (error.name === 'FunctionsFetchError' ? '連不到 AI，請確認網路後再試。' : 'AI 請求失敗，請稍後再試。'));
    }
    Object.assign(AI_LAST, { model: data.model || '', mine: data.mine || 0, cap: data.cap || 0 });
    return String(data.text || '');
  } finally { clearTimeout(timer); }
}

function parseAiJson(raw) {
  let s = String(raw || '').replace(/```(?:json)?/gi, '').trim();
  const first = s.search(/[[{]/);
  if (first > 0) s = s.slice(first);
  const v = JSON.parse(s);
  if (Array.isArray(v)) return v;
  // OpenAI json_object mode wraps arrays: { "items": [...] }
  const arr = Object.values(v).find(x => Array.isArray(x));
  return arr || v;
}

// busy state for the button that started a request
async function withBusy(btn, label, fn) {
  const old = btn ? btn.innerHTML : '';
  if (btn) { btn.disabled = true; btn.innerHTML = `<span class="spinner"></span> ${esc(label || 'AI 思考中')}`; }
  try { return await fn(); } catch (e) {
    console.warn(e);
    toast(e.message && e.message.length < 140 ? e.message : 'AI 請求失敗，請稍後再試。', 4800);
    return null;
  } finally { if (btn && btn.isConnected) { btn.disabled = false; btn.innerHTML = old; } }
}
function needAi() {
  if (aiReady()) return false;
  toast('登入後才能用 AI');
  openSettings('data');
  return true;
}

function htmlToPlain(html) {
  const d = document.createElement('div');
  d.innerHTML = String(html || '').replace(/<rt>[\s\S]*?<\/rt>/g, '').replace(/<span class="blank[^"]*"[^>]*>[\s\S]*?<!--\/blank-->/g, '（　）');
  return (d.textContent || '').replace(/\s+/g, ' ').trim();
}

// ---------- practice: explain the current question ----------
// btn: the one tapped (a phone also draws a hidden copy of the tool row under the options, first in the page)
async function aiExplainCurrent(btn) {
  const e = currentEntry();
  if (!e || !e.q || needAi()) return;
  const q = e.q;
  const box = document.getElementById('aiExplainBox');
  const stem = htmlToPlain(q.stemHtml) || q.mistakePrompt || '';
  const prompt = `請解析這一題（150 字內）：先用一句話說明考點，再說明正確答案為什麼對，最後簡短說明我選的答案錯在哪裡。
題型：${q.label}
題目：${stem}${q.zhText ? `\n中文：${q.zhText}` : ''}
選項：${q.options.map(o => jaPlain(o.text)).join('／')}
正確答案：${jaPlain(q.options[q.answer].text)}
我的答案：${jaPlain(q.options[e.chosen].text)}`;
  const ck = `explain|${q.key || stem}|${q.fmt}|${jaPlain(q.options[e.chosen].text)}`;
  const hit = aiCacheGet(ck);
  if (hit) { if (box) box.innerHTML = `<div class="panel mt-3">${md(hit.text)}${aiCaption(hit.model, true)}</div>`; return; }
  await withBusy(btn, 'AI 解析中', async () => {
    const out = await callAi(prompt);
    aiCacheSet(ck, out, AI_LAST.model);
    if (box && box.isConnected) box.innerHTML = `<div class="panel mt-3">${md(out)}${aiCaption(AI_LAST.model, false)}</div>`;
  });
}

// ---------- course: unit note and new items ----------
function lessonSummary(uid) {
  const L = DATA.LESSONS[uid] || {};
  return [L.formula || '', ...(L.sections || []).map(s => `${s.h}：${(s.points || []).join('；')}`)].join('\n').slice(0, 1500);
}
async function aiUnitNote(uid, question, btn) {
  if (needAi()) return;
  const u = unitById(uid);
  const prompt = `單元：${u.weeks}・${u.title}
講義重點：
${lessonSummary(uid)}

${question ? `學生的問題：${question}\n請針對問題回答，` : '請補充這個單元學生最容易混淆的 2～3 個重點，'}每個重點附 1～2 個簡短例句（日文後面附中文），全部 300 字內，用 Markdown 條列。`;
  await withBusy(btn, 'AI 整理中', async () => {
    const out = await callAi(prompt);
    state.unitAiNotes[uid] = out.trim();
    saveState();
    const box = document.getElementById('aiNoteBox');
    if (box) box.innerHTML = md(out);
    else route();
  });
}

const BANNED_WORDS = /(秒殺|100%|絕對|千萬|魔王|黃金|鐵則|制霸|必背|必考|陷阱|神器|超級)/;
function validAiGrammar(x, u) {
  if (!x || typeof x !== 'object') return null;
  if (x.t === 'correct') return null;   // 選正確句 is no longer a question type (1.0.23)
  const t = ['choice', 'meaning', 'order'].includes(x.t) ? x.t : 'choice';
  const s = (v) => String(v == null ? '' : v).trim();
  const out = { id: uid('ai'), u: u.id, t, lv: courseLevel(u.lv), d: 2, pt: s(x.pt).slice(0, 20) || 'AI 題目', zh: s(x.zh), why: s(x.why), src: 'ai' };
  if ([out.zh, out.why, out.pt].some(v => BANNED_WORDS.test(v))) return null;
  if (t === 'order') {
    const parts = Array.isArray(x.parts) ? x.parts.map(s).filter(Boolean) : [];
    const star = Number(x.star);
    if (parts.length !== 4 || new Set(parts).size !== 4 || !(star >= 0 && star <= 3)) return null;
    return Object.assign(out, { pre: s(x.pre), parts, post: s(x.post), star });
  }
  const op = Array.isArray(x.op) ? x.op.map(s).filter(Boolean) : [];
  const a = s(x.a);
  if (op.length !== 4 || new Set(op).size !== 4 || !op.includes(a)) return null;
  if (t === 'choice') {
    const jp = s(x.jp).replace(/\(\s*\)|（\s*）|（_+）|___+/g, '（　）');
    if ((jp.match(/（　）/g) || []).length !== 1) return null;
    const tail = jp.split('（　）')[1] || '';
    if (/^(です|ます|でした|ました)/.test(tail) && op.some(o => /(です|ます|でした|ました)$/.test(o))) return null;
    return Object.assign(out, { jp, op, a });
  }
  if (t === 'meaning') {
    const jp = s(x.jp);
    if (!/[぀-ヿ一-鿿]/.test(jp) || /（　）/.test(jp)) return null;
    return Object.assign(out, { jp, op, a });
  }
  return null;
}

async function aiGenerateUnitItems(uid, btn, count = 5) {
  if (needAi()) return;
  const u = unitById(uid);
  const samples = shuffle(unitItems(uid).filter(g => ['choice', 'meaning', 'order'].includes(g.t || 'choice'))).slice(0, 3)
    .map(g => JSON.stringify(Object.fromEntries(Object.entries(g).filter(([k]) => ['t', 'jp', 'op', 'a', 'zh', 'why', 'pt', 'pre', 'parts', 'post', 'star'].includes(k))))).join('\n');
  const existing = unitItems(uid).map(g => jaPlain(itemPreview(g))).slice(0, 60).join('\n');
  const prompt = `請為下面這個單元出 ${count} 道新的練習題，題型要混合（填空 choice、句意 meaning、排序 order），難度和單元相符，不要超出 ${u.lv}。
單元：${u.weeks}・${u.title}
講義重點：
${lessonSummary(uid)}

規則：
- 每題只能有一個正確答案，其他選項要是學習者常見的錯誤，但不能也算對。
- choice：jp 是日文句子，只有一個空格「（　）」；op 是 4 個選項；a 是正確選項；zh 是整句的中文翻譯（不要提示答案）。
- meaning：jp 是日文句子；op 是 4 個中文翻譯；a 是正確的翻譯；zh 留空字串。
- order：pre 和 post 是句子的前後部分（可為空字串），parts 是依正確順序排列的 4 個片段，star 是 ★ 位置（0～3）；zh 是整句中文。
- why 用 1～2 句繁體中文說明考點；pt 是 2～8 字的考點名稱。
- 句子短而自然（30 字內），不要用過難的單字。

已有的題目（不要重複）：
${existing}

格式範例：
${samples}

只輸出 JSON 陣列。`;
  await withBusy(btn, 'AI 出題中', async () => {
    const arr = parseAiJson(await callAi(prompt, { json: true }));
    if (!Array.isArray(arr)) throw new Error('AI 回傳的格式無法解析');
    const have = new Set(unitItems(uid).map(g => jaPlain(itemPreview(g))));
    const ok = arr.map(x => validAiGrammar(x, u)).filter(x => x && !have.has(jaPlain(itemPreview(x))));
    if (!ok.length) { toast('AI 產生的題目沒有通過檢查（格式不符或答案不唯一），請再試一次。', 4200); return; }
    state.customGrammar.push(...ok);
    saveState(); buildRegistry();
    toast(`已加入 ${ok.length} 道題目到「${u.short}」${ok.length < arr.length ? `（${arr.length - ok.length} 題未通過檢查）` : ''}`, 3800);
    route();
  });
}

// ---------- vocabulary ----------
async function aiEnrichCard(v) {
  if (!v || needAi()) return;
  const box = document.getElementById('flashAiBox');
  const btn = $('[data-act="flash-ai"]');
  const prompt = `單字：${jaPlain(v.w)}${v.r ? `（${v.r}）` : ''}，意思：${v.m}。
請提供：1. 兩個 ${aiLevelRange()} 程度的自然例句（日文＋中文）；2. 常見的搭配或助詞；3. 一個簡短的記憶方法。全部 150 字內，用 Markdown 條列。`;
  await withBusy(btn, 'AI 整理中', async () => {
    const out = await callAi(prompt);
    if (box && box.isConnected) box.innerHTML = `<div class="panel mt-3" style="text-align:left">${md(out)}</div>`;
  });
}

// ---------- mistakes ----------
async function aiExplainMistake(m, btn) {
  if (needAi()) return;
  const prompt = `我在這題答錯了，請用 120 字內說明考點、正確答案的理由，以及我為什麼會選錯，最後給一個好記的提示。
題目：${jaPlain(m.prompt)}
正確答案：${m.answer}
我選的：${m.wrong || '（沒有紀錄）'}
類別：${m.cat || ''}`;
  await withBusy(btn, 'AI 解析中', async () => {
    const out = await callAi(prompt);
    m.why = out.trim();
    saveState(); route();
  });
}

// ---------- mock exam: fresh items ----------
function validAiExam(x, level) {
  const s = (v) => String(v == null ? '' : v).trim();
  const k = x && (mondai(level, x.m) || {}).k;
  if (!['context', 'grammar', 'paraphrase', 'resp'].includes(k)) return null;
  const op = Array.isArray(x.op) ? x.op.map(s).filter(Boolean) : [];
  const a = s(x.a);
  const need = k === 'resp' ? 3 : 4;
  if (op.length !== need || new Set(op).size !== need || !op.includes(a)) return null;
  const out = { id: uid('aix'), lv: level, m: x.m, op, a, why: s(x.why), src: 'ai' };
  if (k === 'resp') { if (!s(x.line)) return null; out.line = s(x.line); return out; }
  const jp = s(x.jp);
  if (k === 'paraphrase') { if ((jp.match(/＿＿/g) || []).length !== 2) return null; out.jp = jp; return out; }
  if ((jp.match(/（　）/g) || []).length !== 1) return null;
  out.jp = jp;
  return out;
}
async function aiGenerateExamItems(level, btn) {
  if (needAi()) return;
  const code = (kind) => Object.keys(MONDAI_LV[level] || MONDAI_N5N4).find(m => mondai(level, m).k === kind);   // the 大題 numbers of this level's paper
  const prompt = `請出 8 道 JLPT ${level} 模擬題，程度與正式考試相同，只能有一個正確答案：
- 3 題 "${code('context')}"（文脈規定）：jp 是有一個「（　）」的句子，op 是 4 個同詞性的單字，a 是答案。
- 3 題 "${code('grammar')}"（文法填空）：jp 是有一個「（　）」的句子，op 是 4 個助詞或文法形式，a 是答案。
- 1 題 "${code('paraphrase')}"（言い換え）：jp 是句子，把要換句話說的部分用「＿＿」前後包起來，op 是 4 個日文句子，a 是意思最接近的一句。
- 1 題 "${code('resp')}"（即時応答）：line 是對方說的一句話，op 是 3 個回應，a 是最自然的回應。
每題都要有 why（繁體中文 1～2 句說明）。輸出 JSON 陣列，元素格式例如：
{"m":"S2-M1","jp":"バス（　）乗ります。","op":["に","を","で","へ"],"a":"に","why":"乗る的對象用「に」。"}`;
  await withBusy(btn, 'AI 出題中', async () => {
    const arr = parseAiJson(await callAi(prompt, { json: true }));
    if (!Array.isArray(arr)) throw new Error('AI 回傳的格式無法解析');
    const ok = arr.map(x => validAiExam(x, level)).filter(Boolean);
    if (!ok.length) { toast('AI 題目沒有通過檢查，請再試一次。'); return; }
    state.customExam.push(...ok);
    state.customExam = state.customExam.slice(-300);
    saveState();
    toast(`已加入 ${ok.length} 道 AI 題目`);
    startExam({ ai: true, prefer: ok.map(x => x.id) });
  });
}

// ---------- tools ----------
async function aiAnalyzeSentence(text, btn) {
  if (needAi()) return;
  const prompt = `請分析這個日文句子：「${text}」
用 Markdown 依序寫：
1. **翻譯**：自然的中文翻譯。
2. **結構**：把句子切成幾個部分，說明每部分的作用（助詞、動詞變化、句型）。
3. **單字**：重要單字的讀音和意思。
4. **文法重點**：出現的 ${aiLevelRange()} 文法，各附一個簡短例句。
全部 350 字內。`;
  await withBusy(btn, 'AI 分析中', async () => {
    const out = await callAi(prompt);
    const box = document.getElementById('analyzeOut');
    if (box) box.innerHTML = `<div class="panel mt-3">${md(out)}</div>`;
  });
}

async function aiStudyAdvice(btn) {
  if (needAi()) return;
  const st = streakStats();
  const pace = examPace();
  const vs = vocabStats();
  const cur = unitById(state.currentUnit);
  const us = unitStats(cur.id);
  const days = Object.keys(state.dailyLogs).sort().slice(-7).map(d => `${d}：${dayTotal(state.dailyLogs[d])} 題`).join('、');
  const cats = {};
  activeMistakes().forEach(m => { cats[m.cat || '綜合'] = (cats[m.cat || '綜合'] || 0) + 1; });
  const acc = recentAccuracy();
  const prompt = `根據學生的學習數據，給 3 點具體建議（共 200 字內，Markdown 條列，每點先寫結論）：
- 距離 JLPT ${state.settings.examLevel}（${pace.exam}）還有 ${pace.daysLeft} 天，剩 ${pace.remainingUnits} 個單元，每單元平均可用 ${pace.perUnit} 天。
- 目前單元：${cur.weeks}・${cur.title}，完成度 ${us.pct}%（熟悉 ${us.learned}/${us.total} 題）。
- 最近 7 天：${days || '沒有紀錄'}；連續 ${st.current} 天。
- 最近正確率：${acc === null ? '資料不足' : Math.round(acc * 100) + '%'}。
- 單字：${levels().map(L => `${lvLabel(L)} 熟悉 ${vs[L].learned}/${vs[L].total}`).join('、')}，今天待複習 ${vs.due} 張。
- 錯題本：${Object.entries(cats).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([c, n]) => `${c} ${n} 題`).join('、') || '沒有待複習的錯題'}。`;
  await withBusy(btn, 'AI 分析中', async () => {
    const out = await callAi(prompt);
    const box = document.getElementById('adviceOut');
    if (box) box.innerHTML = `<div class="panel mt-3">${md(out)}</div>`;
  });
}
