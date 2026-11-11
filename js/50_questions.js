'use strict';
/* ==========================================================================
   Question factory: builds a concrete question from a vocab or grammar item
   ========================================================================== */
const BLANK_RE = /（([^（）]*?)）/;
const GENERIC_ZH = new Set('的地得了是很在一個和與或、，。；：（）()/ 者做去來人可有不也就要會等件種東西'.split(''));
function zhChars(s) { return new Set([...String(s || '')].filter(c => /[一-鿿]/.test(c) && !GENERIC_ZH.has(c))); }
// two meanings clash when they share a content character, share a whole comma-separated segment (是 / 嗯、是; 不對 / 不是、不對),
// or belong to one of the day-one response groups whose glosses are all generic characters (はい・ええ・そうです…)
const ZH_SEG_SPLIT = /[、；;，,／/（）()]/;
const ZH_SYNONYMS = [['是', '嗯、是', '是的、沒錯', '那樣；是的', '是嗎、原來如此'], ['不是', '不是、不對', '不同、不對']];
function zhOverlap(a, b) {
  const A = zhChars(a); for (const c of zhChars(b)) if (A.has(c)) return true;
  const segs = (s) => String(s || '').split(ZH_SEG_SPLIT).map(x => x.trim()).filter(Boolean);
  const sb = new Set(segs(b)); if (segs(a).some(x => sb.has(x))) return true;
  const ta = String(a || '').trim(), tb = String(b || '').trim();
  return ZH_SYNONYMS.some(g => g.includes(ta) && g.includes(tb));
}

const FORM_LABEL = {
  te: 'て形', ta: 'た形', nai: 'ない形', dict: '辭書形', masu: 'ます形', ba: '條件形（ば）', pot: '可能形', vol: '意向形', pass: '受身形', caus: '使役形', imp: '命令形', causpass: '使役受身形'
};
// how a conjugation item is answered: four options while new, tiles (or the keyboard) once it has been seen
function conjInputMode(rec, ctx) {
  if (ctx && ctx.choiceOnly) return 'choice';   // 階段測驗: options only
  const m = state.settings.conjInput;   // no settings row any more (always auto); the key stays as a hidden override for tests
  if (m === 'choice' || m === 'tiles' || m === 'type') return m;
  return rec && rec.b >= 1 ? 'tiles' : 'choice';
}
const GROUP_LABEL = { '5': '五段動詞', '1': '一段動詞', 's': 'する動詞', 'k': '来る' };
const VERB_GROUP = { v5: '5', v1: '1', vs: 's', vk: 'k' };
function formHint(f) { return JConj.conjVerb('食べる', '1', f) || ''; }   // the form shown on a paradigm verb (受身形，像「食べられました」)
// verbs a drill may ask: learned ones (b ≥ 1); every course verb while fewer than five have been learned
// suffixes and giving verbs make odd drill forms (がれる, くれさせる, くださられる)
const DRILL_SKIP = new Set(['がる', 'くれる', 'くださる', 'おいでになる']);
function drillVerbs() {
  const all = REG.vocab.filter(v => VERB_GROUP[v.p] && !DRILL_SKIP.has(jaPlain(v.w)) && !laterReading(v));   // 行く（ゆく） conjugates like 行く（いく）
  const learned = all.filter(v => state.srs[v.key] && state.srs[v.key].b >= 1);
  return learned.length >= 5 ? learned : all;
}
function makeConjDrillQuestion(item, ctx = {}) {
  const verbs = drillVerbs();
  if (!verbs.length || !item.forms || !item.forms.length) return null;
  for (let attempt = 0; attempt < 8; attempt++) {
    const f = item.forms[Math.floor(Math.random() * item.forms.length)];
    const v = verbs[Math.floor(Math.random() * verbs.length)];
    const g = VERB_GROUP[v.p];
    const ans = JConj.conjVerb(v.w, g, f);
    if (!ans) continue;
    const wrongs = JConj.verbDistractors(v.w, g, f, ans);
    if (wrongs.length < 3) continue;
    const q = baseQ(item);
    const fam = item.fam; const hint = f !== fam ? formHint(f) : '';
    const mode = ctx.choiceOnly ? 'choice' : state.settings.conjInput === 'type' ? 'type' : 'tiles';   // 階段測驗 asks the drill as four options
    if (mode === 'choice') q.fmt = 'g-conj'; else { q.fmt = 'g-conj-type'; q.custom = q.fmt; q.inputMode = mode; }
    q.label = `變化練習 · ${FORM_LABEL[fam]}`;
    q.instr = mode === 'choice' ? `選出這個動詞的${FORM_LABEL[fam]}` : `${mode === 'tiles' ? '點假名，拼出' : '輸入'}這個動詞的${FORM_LABEL[fam]}`;
    q.stemHtml = `<div class="q-stem word jp">${furi(v.w)}</div><div class="small muted mt-1">→ ${esc(FORM_LABEL[fam])}${hint ? `，像「<span class="jp">${esc(hint)}</span>」` : ''}</div>`;
    q.zhText = v.m || ''; q.cat = '變化練習'; q.point = FORM_LABEL[fam]; q.unit = item.u; q.lv = v.lv;
    q.fullJp = ans; q.fillHtml = furi(ans);
    q.mistakePrompt = `${jaPlain(v.w)} → ${FORM_LABEL[fam]}${hint ? `（像 ${hint}）` : ''}`;
    q.why = `「${jaPlain(v.w)}」是${GROUP_LABEL[g]}，${FORM_LABEL[fam]}是「${jaPlain(ans)}」。`;
    if (mode === 'choice') finalizeOptions(q, ans, wrongs.slice(0, 3), true);
    else { q.tiles = conjTiles(ans, wrongs); q.options = [{ text: ans, jp: true }, { text: '', jp: true }]; q.answer = 0; q.answerText = ans; }
    q.speakWord = jaPlain(ans);
    return q;
  }
  return null;
}
function formFamily(f) {
  if (/^pot/.test(f)) return 'pot';
  if (/^causpass/.test(f)) return 'causpass';
  if (/^caus/.test(f)) return 'caus';
  if (/^pass/.test(f)) return 'pass';
  if (f === 'vol') return 'vol';
  if (f === 'ba') return 'ba';
  if (f === 'te') return 'te';
  if (['ta', 'tara', 'tari'].includes(f)) return 'ta';
  if (/^na/.test(f)) return 'nai';
  if (/^mas/.test(f)) return 'masu';
  return f;
}

// ---------- vocab helpers ----------
function vGroup(v) { return GROUP_OF_POS[v.p] || null; }
function vSurfaceInfo(v) {
  // returns { surface, form, pre, post } from the bracketed example, or null
  const ex = String(v.ex || '');
  const m = /\{([^}]+)\}/.exec(ex);
  if (!m) return null;
  const surface = m[1];
  const pre = ex.slice(0, m.index); const post = ex.slice(m.index + m[0].length);
  let form = 'as-is';
  const g = vGroup(v);
  if (g) {
    const f = VERB_FORMS.find(f2 => JConj.normJa(JConj.conjVerb(v.w, g, f2) || '') === JConj.normJa(surface) || jaPlain(JConj.conjVerb(v.w, g, f2) || '') === surface);
    form = f ? 'v:' + f : 'raw';
  } else if (v.p === 'i') {
    const f = I_FORMS.find(f2 => JConj.conjAdj(v.w, 'i', f2) === surface);
    form = f ? 'i:' + f : 'raw';
  }
  return { surface, form, pre, post };
}
// A word may carry a second example (ex2 / exZh2). Questions take one of them so the sentence is not what gets memorised;
// cards and previews show both.
function vocabExamples(v) { const out = []; if (v.ex) out.push({ ex: v.ex, exZh: v.exZh || '' }); if (v.ex2) out.push({ ex: v.ex2, exZh: v.exZh2 || '' }); return out; }
// the copy a question uses: the chosen example as ex, the other one as ex2, so the explanation still lists both
// (the question's first) instead of the second one twice
function withExample(v, i) {
  const exs = vocabExamples(v); const e = exs[i];
  if (!e || exs.length < 2) return v;
  const other = exs[1 - i];
  return Object.assign({}, v, { ex: e.ex, exZh: e.exZh, ex2: other.ex, exZh2: other.exZh, exIndex: i });
}
// indices of the examples whose bracketed form the builders understand (so 例句填空 / 漢字 questions work); all when none do
function usableExamples(v) {
  const n = vocabExamples(v).length; const ok = [];
  for (let i = 0; i < n; i++) { const info = vSurfaceInfo(withExample(v, i)); if (info && info.form !== 'raw') ok.push(i); }
  return ok.length ? ok : Array.from({ length: n }, (_, i) => i);
}
function pickExample(v, ctx = {}) {
  if (vocabExamples(v).length < 2) return v;
  const i = ctx.exIndex !== undefined ? ctx.exIndex : pick(usableExamples(v));
  return withExample(v, i);
}
function inflectLike(word, info) {
  if (!info || info.form === 'as-is') return word.w;
  const [kind, f] = info.form.split(':');
  if (kind === 'v') { const g = vGroup(word); return g ? JConj.conjVerb(word.w, g, f) : null; }
  if (kind === 'i') return word.p === 'i' ? JConj.conjAdj(word.w, 'i', f) : null;
  return null;
}
function readingOfSurface(v, info) {
  if (!v.r) return null;
  if (!info || info.form === 'as-is') return info && info.surface !== v.w ? null : v.r;
  const [kind, f] = info.form.split(':');
  if (kind === 'v') { const g = vGroup(v); return g ? jaKana(JConj.conjVerb(v.r, g, f) || '') : null; }
  if (kind === 'i') return JConj.conjAdj(v.r, 'i', f);
  return null;
}
function vocabPeers(v) {
  const top = shownTop(v.lv);
  return REG.vocab.filter(x => x.key !== v.key && x.w && x.m && levelUpTo(x.lv, top));
}

// notSameReading: a listening question, where a homophone's meaning would also be right; `ja` (optional) collects the word each
// distractor meaning belongs to, shown after answering (1.0.45)
function meaningOptions(v, notSameReading = false, ja = null) {
  const peers = vocabPeers(v);
  const scored = peers
    .filter(x => x.m !== v.m && !zhOverlap(x.m, v.m) && jaPlain(x.w) !== jaPlain(v.w) && !(notSameReading && x.r && kanaKey(x.r) === kanaKey(v.r)))
    .map(x => ({ x, s: (x.p === v.p ? 3 : 0) + (x.c === v.c ? 1.5 : 0) + (x.lv === v.lv ? 1 : 0) + Math.random() * 2.5 }))
    .sort((a, b) => b.s - a.s);
  const out = [];
  for (const { x } of scored) {
    if (out.some(o => o === x.m || zhOverlap(o, x.m))) continue;
    out.push(x.m); if (ja) ja[x.m] = jaPlain(x.w);
    if (out.length === 3) break;
  }
  return out.length === 3 ? out : null;
}
// `zh` (optional) collects the Chinese meaning of every distractor that is a real word, shown after answering
// Options shown in kana instead of kanji, now and then: a Chinese reader often knows the answer from the characters
// alone. Applies to 中翻日 and 例句填空 once the word has been seen, to every option at once.
const KANA_OPTION_RATE = 1 / 3;
// kana mode needs a reading for every option and no two alike (花／鼻 are both はな): otherwise the kanji stay
function kanaOptionsDistinct(q) {
  const ks = q.options.map(o => q.optKana && q.optKana[o.text]);
  return ks.every(Boolean) && new Set(ks).size === ks.length;
}
// reading of a peer word put into the same form as the target (`info` from vSurfaceInfo)
function kanaOfInflected(word, info) {
  if (!word.r) return null;
  if (!info || info.form === 'as-is') return word.r;
  const [kind, f] = info.form.split(':');
  if (kind === 'v') { const g = vGroup(word); return g ? jaKana(JConj.conjVerb(word.r, g, f) || '') || null : null; }
  if (kind === 'i') return word.p === 'i' ? JConj.conjAdj(word.r, 'i', f) || null : null;
  return null;
}
// 配對: the word and five learned words of the same part of speech (same theme preferred), distinct words, meanings and
// readings: the left column shows only the reading (with the kanji a Chinese reader would know the meaning at a glance),
// so 花／鼻 (both はな) never meet, and every word paired wrong is answered wrong on its own
const MATCH_PAIRS = 6;
function matchPairs(v) {
  const pool = vocabPeers(v).filter(x => state.srs[x.key] && x.p === v.p && x.m !== v.m && !zhOverlap(x.m, v.m) && jaPlain(x.w) !== jaPlain(v.w));
  const scored = pool.map(x => ({ x, s: (x.c === v.c ? 2 : 0) + (x.lv === v.lv ? 1 : 0) + Math.random() * 2 })).sort((a, b) => b.s - a.s);
  const out = [[jaPlain(v.w), v.m, v.r, v.key]]; const ws = new Set([jaPlain(v.w)]); const ms = new Set([v.m]); const rs = new Set([kanaKey(v.r)]);   // [word, meaning, reading, key]
  for (const { x } of scored) { const w = jaPlain(x.w); if (ws.has(w) || rs.has(kanaKey(x.r)) || ms.has(x.m) || [...ms].some(m => zhOverlap(m, x.m))) continue; ws.add(w); ms.add(x.m); rs.add(kanaKey(x.r)); out.push([w, x.m, x.r, x.key]); if (out.length === MATCH_PAIRS) break; }
  return out.length === MATCH_PAIRS ? out : null;
}
// 假名拼字: the reading's characters plus three kana that are not in it
function spellTiles(reading) {
  const chars = [...reading];
  const pool = Object.keys(KANA_ROMAJI).filter(k => !chars.includes(k) && k !== 'を');
  return shuffle(chars.concat(shuffle(pool).slice(0, 3)));
}
function recallOptions(v, zh = {}, kana = {}) {
  const pool = vocabPeers(v).filter(x => x.p === v.p && !zhOverlap(x.m, v.m) && x.r !== v.r && jaPlain(x.w) !== jaPlain(v.w));
  const scored = pool.map(x => ({ x, s: (x.lv === v.lv ? 1 : 0) + (x.c === v.c ? 1 : 0) + Math.random() * 2 })).sort((a, b) => b.s - a.s);
  const out = [];
  for (const { x } of scored) { if (!out.includes(x.w)) { out.push(x.w); zh[x.w] = x.m; kana[x.w] = x.r; } if (out.length === 3) break; }
  return out.length === 3 ? out : null;
}
function clozeOptions(v, info, zh = {}, kana = {}) {
  const pool = vocabPeers(v).filter(x => x.p === v.p && !zhOverlap(x.m, v.m));
  const scored = shuffle(pool).sort((a, b) => (b.lv === v.lv) - (a.lv === v.lv));
  const out = [];
  for (const x of scored) {
    const f = inflectLike(x, info);
    if (!f || JConj.normJa(f) === JConj.normJa(info.surface) || out.some(o => JConj.normJa(o) === JConj.normJa(f))) continue;
    out.push(f); zh[f] = x.m; kana[f] = kanaOfInflected(x, info);
    if (out.length === 3) break;
  }
  return out.length === 3 ? out : null;
}

// --- reading distractors (JLPT 問題1 style): long vowels, small っ, dakuten, small ゃゅょ ---
const DAKU = { か: 'が', き: 'ぎ', く: 'ぐ', け: 'げ', こ: 'ご', さ: 'ざ', し: 'じ', す: 'ず', せ: 'ぜ', そ: 'ぞ', た: 'だ', ち: 'ぢ', て: 'で', と: 'ど', は: 'ば', ひ: 'び', ふ: 'ぶ', へ: 'べ', ほ: 'ぼ' };
const UNDAKU = Object.fromEntries(Object.entries(DAKU).map(([a, b]) => [b, a]));
const HANDAKU = { は: 'ぱ', ひ: 'ぴ', ふ: 'ぷ', へ: 'ぺ', ほ: 'ぽ', ば: 'ぱ', び: 'ぴ', ぶ: 'ぷ', べ: 'ぺ', ぼ: 'ぽ' };
const O_ROW = new Set('おこそとのほもよろごぞどぼぽょ'.split(''));
const E_ROW = new Set('えけせてねへめれげぜでべぺ'.split(''));
const SMALL = new Set('ゃゅょぁぃぅぇぉっ'.split(''));
const BIG_OF = { ゃ: 'や', ゅ: 'ゆ', ょ: 'よ' };
function validKana(s) {
  if (!s || SMALL.has(s[0]) || s.endsWith('っ')) return false;
  if (/っ[あいうえおんっゃゅょー]/.test(s) || /ーー|んん/.test(s)) return false;
  return true;
}
function readingVariants(r) {
  const out = new Map(); // variant -> rule
  const add = (v, rule) => { if (v !== r && validKana(v) && !out.has(v)) out.set(v, rule); };
  for (let i = 0; i < r.length; i++) {
    const c = r[i]; const n = r[i + 1];
    if (c === 'う' && i > 0 && (O_ROW.has(r[i - 1]) || r[i - 1] === 'ゅ' || r[i - 1] === 'く' || r[i - 1] === 'ゆ')) add(r.slice(0, i) + r.slice(i + 1), 'long');
    if (c === 'い' && i > 0 && E_ROW.has(r[i - 1])) add(r.slice(0, i) + r.slice(i + 1), 'long');
    if (O_ROW.has(c) && n !== 'う' && i < r.length - 1) add(r.slice(0, i + 1) + 'う' + r.slice(i + 1), 'long');
    if (E_ROW.has(c) && n !== 'い' && i < r.length - 1) add(r.slice(0, i + 1) + 'い' + r.slice(i + 1), 'long');
    if (c === 'っ') add(r.slice(0, i) + r.slice(i + 1), 'tsu');
    if (i > 0 && i < r.length && /[かきくけこさしすせそたちつてとぱぴぷぺぽ]/.test(c) && r[i - 1] !== 'っ' && r[i - 1] !== 'ん' && !SMALL.has(r[i - 1])) add(r.slice(0, i) + 'っ' + r.slice(i), 'tsu');
    if (DAKU[c]) add(r.slice(0, i) + DAKU[c] + r.slice(i + 1), 'daku');
    if (UNDAKU[c]) add(r.slice(0, i) + UNDAKU[c] + r.slice(i + 1), 'daku');
    if (HANDAKU[c]) add(r.slice(0, i) + HANDAKU[c] + r.slice(i + 1), 'daku');
    if (BIG_OF[c]) { add(r.slice(0, i) + BIG_OF[c] + r.slice(i + 1), 'yoon'); add(r.slice(0, i) + r.slice(i + 1), 'yoon'); }
    if (c === 'ん' && i > 0) add(r.slice(0, i) + r.slice(i + 1), 'n');
  }
  return out;
}
function readingOptions(kr) {
  if (!kr || kr.length < 2) return null;
  const vars = readingVariants(kr);
  const byRule = {};
  vars.forEach((rule, v) => { (byRule[rule] = byRule[rule] || []).push(v); });
  const out = [];
  shuffle(Object.keys(byRule)).forEach(rule => { if (out.length < 3) out.push(pick(byRule[rule])); });
  shuffle([...vars.keys()]).forEach(v => { if (out.length < 3 && !out.includes(v)) out.push(v); });
  return out.length === 3 ? out : null;
}

// --- kanji spelling distractors (JLPT 問題2 style): homophones + look-alike kanji ---
const KANJI_LOOKALIKE = [
  '休体本木', '待持特時', '読語話詰', '間問聞門開閉', '右石左在', '力刀万方', '土士王玉', '日目白百旧', '未末本米', '千干午牛', '人入八', '大犬太天',
  '夫天失矢', '見貝具', '買貸賃', '字学子', '先生失', '書昼画', '会合今令', '気汽', '早草', '西四酉', '東車束', '京高', '低住往仕', '使便例',
  '近遠送通道', '社仕', '計話記', '説話読', '習羽', '員貝買', '新親', '帰婦掃', '洗先', '飲飯館食', '鳥島烏', '雨両雪電', '何荷可', '名各夕多',
  '男町田界', '手毛才', '少小歩', '円内肉同', '花化', '紙低', '強弱', '暑者著', '寒実', '晴青清静', '暗音', '赤赦', '黒里重', '古吉右',
  '安案', '長張帳', '短知', '軽転', '重動働', '楽薬', '悪思恩', '勉免', '強弓', '答合', '始治', '終冬', '着差', '乗垂', '降陸', '走足起',
  '歌欠次', '泳永', '飛代', '借昔', '貸代', '返辺', '思田', '知和', '病痛疲', '院完', '医区', '薬楽', '映英', '画面', '館官', '空究', '港湖',
  '駅駐験', '道首', '地他池', '池地', '海毎悔', '魚漁', '肉内', '茶荼', '料科', '理里', '野予', '菜採', '果早', '部郡', '屋室', '室屋',
  '台治', '所近', '場湯', '店広', '院除', '校交', '教数', '室窒', '式試', '試誠', '験険検', '宿縮', '題頭', '紙級', '漢難', '英映'
].map(g => [...g]);
const LOOKALIKE_OF = {};
KANJI_LOOKALIKE.forEach(g => g.forEach(k => { LOOKALIKE_OF[k] = (LOOKALIKE_OF[k] || []).concat(g.filter(x => x !== k)); }));
function kanjiOptions(v, surface, reading, zh = {}) {
  const out = []; const top = shownTop(v.lv);
  // homophones from the word list (熱い/暑い, 会う/合う …)
  REG.vocab.forEach(x => {
    if (out.length >= 2 || x.key === v.key || x.r !== v.r || !HAS_KANJI.test(x.w) || x.w === v.w || !levelUpTo(x.lv, top)) return;
    const f = (vGroup(x) && vGroup(v) && vGroup(x) === vGroup(v)) ? inflectLike(x, vSurfaceInfo(v)) : (surface === v.w ? x.w : null);
    if (f && JConj.normJa(f) !== JConj.normJa(surface)) { out.push(f); zh[f] = x.m; }
  });
  // look-alike substitution, with kanji of the table up to the level (旧 of 今旧 belongs to no level the learner reaches)
  const chars = [...surface];
  const tries = [];
  const shown = (alt) => { const k = REG.byKey.get('k:' + alt); return Boolean(k) && levelUpTo(k.lv, top); };
  chars.forEach((c, i) => { (LOOKALIKE_OF[c] || []).filter(shown).forEach(alt => tries.push(chars.slice(0, i).concat(alt, chars.slice(i + 1)).join(''))); });
  shuffle(tries).forEach(t => { if (out.length < 3 && !out.includes(t) && t !== surface) out.push(t); });
  return out.length >= 3 ? out.slice(0, 3) : null;
}

function speechAvailable() {
  const eng = (state.ttsConfig || TTS_DEFAULT).engine;
  if (eng && eng !== 'browser_neural') return true;
  return typeof window !== 'undefined' && 'speechSynthesis' in window && (window.speechSynthesis.getVoices() || []).some(x => /ja/i.test(x.lang || ''));
}

// a word that has a 假名拼字 question: a reading in kana of 2–8 characters
function canSpell(v) { return Boolean(v && v.r && !HAS_KANJI.test(v.r) && v.r.length >= 2 && v.r.length <= 8); }
// a word's picture (pics.js): by the word as written, for the reading PIC_READ names where two items share it (魚)
function picKey(v) {
  if (typeof PICS !== 'object' || !v || !v.w) return '';
  const k = jaPlain(v.w);
  return PICS[k] && (typeof PIC_READ !== 'object' || !PIC_READ[k] || PIC_READ[k] === v.r) ? k : '';
}
// the picture as markup: on its round backdrop (disc: false leaves that out, for a scene in the town that has its own ground)
function picSvg(key, cls = '', opt = {}) {
  if (typeof PICS !== 'object' || !PICS[key]) return '';
  return `<svg class="pic ${cls}" viewBox="0 0 100 100" role="img" aria-label="圖">${opt.disc === false ? '' : '<circle class="pd" cx="50" cy="50" r="47"/>'}${PICS[key]}</svg>`;
}
// not a wrong option of 看圖選字: a word that names what any picture shows (食べ物 for おにぎり, 動物 for 犬)
const PIC_GENERIC = new Set(['動物', '食べ物', '飲み物', '果物', '野菜', '乗り物', '物', 'もの', '品物', '料理', '食事', 'ご飯', 'お菓子', '花', '木', '道具', '家具', '服', '洋服', '虫', '建物', 'ペット']);
function picOptions(v, zh = {}, kana = {}) {
  const pool = vocabPeers(v).filter(x => x.p === v.p && !PIC_GENERIC.has(jaPlain(x.w)) && !zhOverlap(x.m, v.m) && x.r !== v.r && jaPlain(x.w) !== jaPlain(v.w));
  // the same group first (傘 with 時計, 鍵, 本), so the picture has to be looked at
  const scored = pool.map(x => ({ x, s: (x.c === v.c ? 3 : 0) + (x.lv === v.lv ? 1 : 0) + Math.random() * 1.5 })).sort((a, b) => b.s - a.s);
  const out = [];
  for (const { x } of scored) { if (!out.includes(x.w)) { out.push(x.w); zh[x.w] = x.m; kana[x.w] = x.r; } if (out.length === 3) break; }
  return out.length === 3 ? out : null;
}

function vocabFormats(v) {
  const rec = srsGet(v.key);
  const b = rec ? rec.b : -1;
  const info = vSurfaceInfo(v);
  const can = {
    'v-meaning': Boolean(v.m),
    'v-recall': Boolean(v.m),
    'v-cloze': Boolean(v.exZh && usableExamples(v).some(i => { const inf = vSurfaceInfo(withExample(v, i)); return inf && inf.form !== 'raw'; })),
    'v-reading': Boolean(v.r && HAS_KANJI.test(v.w)),
    'v-kanji': Boolean(v.r && HAS_KANJI.test(v.w) && b >= 3),
    'v-listen': Boolean(v.m && speechAvailable()),
    'v-spell': canSpell(v),
    'v-match': Boolean(v.m && matchPairs(v)),
    'v-pic': Boolean(picKey(v))
  };
  let weights;
  if (b < 0) weights = { 'v-meaning': 1 };
  else if (b === 0) weights = { 'v-meaning': 3, 'v-listen': 1, 'v-recall': 1, 'v-pic': 1 };   // 看圖選字 now and then, for a word with a picture
  else if (b <= 2) weights = { 'v-meaning': 2, 'v-recall': 2, 'v-cloze': 3, 'v-listen': 1, 'v-reading': 1, 'v-spell': 1, 'v-match': 1, 'v-pic': 1 };
  else weights = { 'v-cloze': 3, 'v-recall': 2, 'v-reading': 2, 'v-kanji': 1.5, 'v-listen': 1.5, 'v-meaning': 1, 'v-spell': 1.5, 'v-match': 1.5, 'v-pic': 1 };
  // a format this word has not passed yet is asked first, so it is proven in several ways rather than one
  if (b >= 1) for (const f in weights) if (!rec.f || !rec.f[f] || rec.f[f][0] === 0) weights[f] *= 3;
  return Object.entries(weights).filter(([f]) => can[f]).map(([f, w]) => [f, w]);
}
function weightedPick(pairs, avoid) {
  const av = Array.isArray(avoid) ? avoid : [avoid];
  let list = pairs.filter(([f]) => !av.includes(f));
  if (!list.length) list = pairs;
  const total = list.reduce((a, [, w]) => a + w, 0);
  let r = Math.random() * total;
  for (const [f, w] of list) { r -= w; if (r <= 0) return f; }
  return list[list.length - 1][0];
}

function baseQ(item) {
  return { id: uid('q'), key: item.key, kind: item.kind, item, options: [], answer: 0, wide: false, why: '', point: '', label: '', instr: '', stemHtml: '', stemClass: '', subHtml: '', zhText: '', forceZh: false };
}
function finalizeOptions(q, correct, wrongs, jp) {
  const all = shuffle([correct, ...wrongs]);
  q.options = all.map(t => ({ text: t, jp }));
  q.answer = all.indexOf(correct);
  q.answerText = jaPlain(correct);
  return q;
}

function posLabel(p, fallback) {
  return ({ n: '名詞', v5: '五段動詞', v1: '一段動詞', vs: 'する動詞', vk: '來る', i: 'い形容詞', na: 'な形容詞', adv: '副詞', conj: '接續詞', pron: '代名詞', q: '疑問詞', cnt: '數量詞', exp: '招呼語' })[p] || fallback || '單字';
}
// One example block everywhere: play button, sentence with furigana, Chinese.
// 同形異讀 (1.0.33, spec §5.5): a built-in word that shares its spelling with another one (四 よん／四 し) shows its own
// reading on its card and in its own examples; the furigana index can only hold one of them
let HOMOGRAPHS = new Map(); let FIRST_OF = new Map(); let BUILTIN_ALL = [];
// a later reading of a shared spelling (四 し after the app's 四 よん): it goes into the furigana index last, and drills skip it
function laterReading(v) { const f = v && v.builtin ? FIRST_OF.get(jaPlain(v.w)) : null; return Boolean(f && f.id !== v.id); }
function homographReadings(v) { const rs = (v && v.builtin && HOMOGRAPHS.get(jaPlain(v.w))) || []; return [...new Set(rs.filter(r => r !== v.r))]; }
// the card's own reading on its kanji: 行く・ゆく → { 行: 'ゆ' }, and the bracket form furi() honours (行[ゆ]く)
function ownReadingMap(v) { const s = jaPlain(v.w); const m = /^([一-鿿々〆ヶ]+)([ぁ-ゖー]*)$/.exec(s); if (!m || (m[2] && !String(v.r).endsWith(m[2]))) return null; return { [m[1]]: v.r.slice(0, v.r.length - m[2].length) }; }
function ownBracket(v) { const mp = ownReadingMap(v); if (!mp) return jaPlain(v.w); const k = Object.keys(mp)[0]; return `${k}[${mp[k]}]${jaPlain(v.w).slice(k.length)}`; }
function wordHtml(v) { return homographReadings(v).length && HAS_KANJI.test(v.w) ? rubyHtml(jaPlain(v.w), v.r) : furi(v.w); }
// a homograph's marked word in one of its own examples, read the card's way: { at, len, mark, rd }. Null when the index already
// reads it so in a compound starting or ending with it (四月 しがつ after {四}, 午{後} → 午後 ごご) or no reading fits; a conjugated
// mark (行きます) takes the reading of its surface (1.0.33 review of the 16 gap words)
function ownMark(jp, own) {
  const s = String(jp || ''); const m = own && homographReadings(own).length ? /\{([^}]*)\}/.exec(s) : null;
  if (!m) return null;
  const after = exPlain(s.slice(m.index + m[0].length)); const mark = jaPlain(m[1]); const kana = kanaKey(own.r);
  const run = (after.match(/^[一-鿿々]+/) || [''])[0];
  for (let n = Math.min(run.length, FURI_MAX); n > 0; n--) { const r = FURI.get(mark + run.slice(0, n)); if (r && kanaKey(r).startsWith(kana)) return null; }
  const lead = (exPlain(s.slice(0, m.index)).match(/[一-鿿々]+$/) || [''])[0];
  for (let n = Math.min(lead.length, FURI_MAX); n > 0; n--) { const r = FURI.get(lead.slice(-n) + mark); if (r && kanaKey(r).endsWith(kana)) return null; }
  let rd = '';
  if (mark === jaPlain(own.w)) rd = own.r;
  else { const info = vSurfaceInfo(Object.assign({}, own, { ex: s })); const r = info && info.form !== 'raw' ? readingOfSurface(own, info) : ''; if (r && info.surface === mark) rd = r; }
  return rd ? { at: m.index, len: m[0].length, mark, rd } : null;
}
// an example's Japanese with furigana; a homograph's own examples read the marked word the card's way
function exampleJpHtml(jp, own) {
  const k = ownMark(jp, own);
  return k ? furi(exPlain(jp.slice(0, k.at))) + rubyHtml(k.mark, k.rd) + furi(exPlain(jp.slice(k.at + k.len))) : furi(exPlain(jp));
}
// what TTS reads for an example (and the audio generator collects): its bracket readings kept, which ttsText turns into kana, and a
// homograph's mark spoken the way its card shows it, written out in kana (1.0.33 review: 今日 こんにち was spoken きょう, the index's
// first reading; a bracket would swallow the kanji before the mark too: 今年十[とお])
function exampleSpeech(jp, own) {
  const k = ownMark(jp, own);
  return k ? exPlain(jp.slice(0, k.at)) + k.rd + exPlain(jp.slice(k.at + k.len)) : exPlain(jp);
}
function exampleHtml(jp, zh, cls = '', own = null) {
  const ownHtml = own ? exampleJpHtml(jp, own) : null;
  return `<div class="example ${cls}"><button type="button" class="btn btn-sm btn-ghost btn-icon" data-act="speak" data-text="${esc(exampleSpeech(jp, own))}" aria-label="朗讀例句">${icon('speaker')}</button><div><div class="jp">${keepTail(ownHtml || furi(exPlain(jp)))}</div>${zh ? `<div class="zh">${esc(zh)}</div>` : ''}</div></div>`;
}
function exampleLine(e) { return `\n- 例：${jaPlain(exPlain(e.ex))}${e.exZh ? `（${e.exZh}）` : ''}`; }   // one example in an explanation's text
function vocabWhy(v) {
  const head = `**${jaPlain(v.w)}**${v.r && v.r !== v.w ? `（${v.r}）` : ''}：${v.m}`;
  return head + vocabExamples(v).map(exampleLine).join('');
}

function makeVocabQuestion(v0, ctx = {}) {
  const v = pickExample(v0, ctx);
  // 階段測驗: options only. An encore or 再練一次 asks this one word again, so not 配對: five other words would ride along
  const formats = ctx.choiceOnly ? vocabFormats(v).filter(([f]) => f !== 'v-spell' && f !== 'v-match') : ctx.encore ? vocabFormats(v).filter(([f]) => f !== 'v-match') : vocabFormats(v);
  const avoid = ctx.avoidFmts || ctx.avoidFmt;
  // at four stars or more a word not spelled yet is asked as 假名拼字 (已熟練 waits for it), whatever came just before; not
  // where only options or a set format will do (階段測驗, the mock exam) nor in an encore
  const rec = srsGet(v.key);
  const mustSpell = !ctx.choiceOnly && !ctx.forceFmt && !ctx.encore && Boolean(rec) && rec.b >= 4 && canSpell(v) && !spelled(rec);
  let fmt = mustSpell ? 'v-spell' : Array.isArray(formats[0]) ? weightedPick(formats, avoid) : formats[0];
  const q = baseQ(v);
  q.cat = '單字';
  q.lv = v.lv;
  q.why = vocabWhy(v);
  q.fullJp = v.ex ? exampleSpeech(v.ex, v) : v.w; q.exMarked = v.ex || '';   // spoken as is; a homograph's sentence is shown from exMarked
  if (homographReadings(v).length) { const mp = ownReadingMap(v); if (mp) q.ownRmap = mp; }
  q.fullZh = v.exZh || '';
  q.speakWord = jaPlain(v.w);
  q.speakReading = v.r && !HAS_KANJI.test(v.r) && v.r !== jaPlain(v.w) ? v.r : '';
  q.mistakePrompt = homographReadings(v).length && ownReadingMap(v) ? ownBracket(v) : `${jaPlain(v.w)}${v.r && v.r !== v.w ? `（${v.r}）` : ''}`;   // 私[わたくし]: furi() shows the card's reading
  const lvTag = lvLabel(v.lv);   // 入門, not PRE_N5 (2026-11-10)
  const tryBuild = (f) => {
    const info = vSurfaceInfo(v);
    const zh = {}; q.optZh = zh;   // option text -> Chinese meaning of that distractor word
    const ja = {}; q.optJa = ja;   // option text (a Chinese meaning) -> the word it belongs to (1.0.45)
    const kana = {}; q.optKana = kana;   // option text -> its reading (for kana-only options)
    if (f === 'v-cloze') {
      const opts = info && clozeOptions(v, info, zh, kana);
      if (!opts) return false;
      kana[info.surface] = readingOfSurface(v, info);
      q.fmt = f; q.label = `單字 · ${lvTag} · 例句填空`;
      q.instr = '選出填入空格的單字';
      q.stemHtml = `${furi(info.pre)}${blankChip('')}${furi(info.post)}`;
      q.zhText = v.exZh; q.forceZh = true;
      q.fillHtml = homographReadings(v).length ? rubyHtml(info.surface, readingOfSurface(v, info)) : furi(info.surface);
      q.mistakePrompt = `${info.pre}（　）${info.post}（${v.exZh}）`;
      finalizeOptions(q, info.surface, opts, true);
      return true;
    }
    if (f === 'v-recall') {
      const opts = recallOptions(v, zh, kana);
      if (!opts) return false;
      kana[v.w] = v.r;
      q.fmt = f; q.label = `單字 · ${lvTag} · 中翻日`;
      q.instr = '日文怎麼說？';
      q.stemHtml = esc(v.m); q.stemClass = 'zhstem';
      q.subHtml = posChip(v.p);
      q.mistakePrompt = `「${v.m}」的日文`;
      finalizeOptions(q, v.w, opts, true);
      return true;
    }
    if (f === 'v-pic') {   // 看圖選字: 中翻日 with the picture in place of the Chinese
      const key = picKey(v); const opts = key && picOptions(v, zh, kana);
      if (!opts) return false;
      kana[v.w] = v.r;
      q.fmt = f; q.label = `單字 · ${lvTag} · 看圖選字`;
      q.instr = '這是什麼？';
      q.stemHtml = picSvg(key); q.stemClass = 'picstem';
      q.mistakePrompt = `「${v.m}」的日文`;
      finalizeOptions(q, v.w, opts, true);
      return true;
    }
    if (f === 'v-reading') {
      const surface = info && info.form !== 'raw' ? info.surface : v.w;
      const reading = info && info.form !== 'raw' ? readingOfSurface(v, info) : v.r;
      if (!reading) return false;
      // split off shared okurigana so only the kanji part is perturbed
      let oku = '';
      while (oku.length < surface.length && oku.length < reading.length && !KANJI_RE.test(surface[surface.length - 1 - oku.length]) && surface[surface.length - 1 - oku.length] === reading[reading.length - 1 - oku.length]) oku = surface[surface.length - 1 - oku.length] + oku;
      const kanjiPart = surface.slice(0, surface.length - oku.length);
      if ([...kanjiPart].some(c => !KANJI_RE.test(c))) return false;
      const kr = reading.slice(0, reading.length - oku.length);
      const others = homographReadings(v); const vars = (readingOptions(kr) || []).filter(x => !others.includes(x + oku));
      if (vars.length < 3) return false;
      q.fmt = f; q.label = `單字 · ${lvTag} · 漢字讀音`;
      q.instr = '畫線的字怎麼讀？';
      q.stemHtml = info && info.form !== 'raw' && v.ex
        ? `${furi(info.pre)}<span class="uline">${esc(surface)}</span>${furi(info.post)}`
        : `<span class="uline">${esc(surface)}</span>`;
      if (!(info && v.ex)) q.stemClass = 'word';
      q.noFuri = true;
      finalizeOptions(q, reading, vars.map(x => x + oku), false);
      q.options.forEach(o => { o.jp = true; });
      return true;
    }
    if (f === 'v-kanji') {
      const surface = info && info.form !== 'raw' ? info.surface : v.w;
      const reading = info && info.form !== 'raw' ? readingOfSurface(v, info) : v.r;
      if (!reading) return false;
      const opts = kanjiOptions(v, surface, reading, zh);
      if (!opts) return false;
      q.fmt = f; q.label = `單字 · ${lvTag} · 漢字寫法`;
      q.instr = '畫線的部分寫成漢字是？';
      q.stemHtml = info && v.ex ? `${furi(info.pre)}<span class="uline">${esc(reading)}</span>${furi(info.post)}` : `<span class="uline">${esc(reading)}</span>`;
      if (!(info && v.ex)) q.stemClass = 'word';
      finalizeOptions(q, surface, opts, true);
      q.noFuriOptions = true;
      return true;
    }
    if (f === 'v-listen') {
      const opts = meaningOptions(v, true, ja);
      if (!opts) return false;
      q.fmt = f; q.label = `單字 · ${lvTag} · 聽力`;
      q.instr = '聽到的單字是什麼意思？';
      q.stemHtml = `<div class="center"><button type="button" class="speak-big" data-act="replay">${icon('speaker')}<span>再聽一次</span></button></div>`;
      q.audio = q.speakWord;
      q.revealHtml = `<div class="q-stem word jp">${wordHtml(v)}</div>`;
      finalizeOptions(q, v.m, opts, false);
      return true;
    }
    if (f === 'v-spell') {
      if (!v.r || HAS_KANJI.test(v.r)) return false;
      q.fmt = f; q.custom = f; q.label = `單字 · ${lvTag} · 假名拼字`;
      q.instr = '點假名，拼出這個字的讀音';
      q.stemHtml = esc(v.m); q.stemClass = 'zhstem';
      q.subHtml = posChip(v.p);
      q.tiles = spellTiles(v.r);
      q.mistakePrompt = `「${v.m}」的讀音`;
      q.options = [{ text: v.r, jp: true }, { text: '', jp: true }]; q.answer = 0; q.answerText = v.r;
      return true;
    }
    if (f === 'v-match') {
      const pairs = matchPairs(v);
      if (!pairs) return false;
      q.fmt = f; q.custom = f; q.label = `單字 · ${lvTag} · 配對`;
      q.instr = '先點單字，再點它的意思，把六組都配好';
      q.stemHtml = '';
      q.pairs = pairs; q.words = shuffle(pairs.map(x => x[0])); q.meanings = shuffle(pairs.map(x => x[1]));
      q.mistakePrompt = `配對：${jaPlain(v.w)}`;
      q.why = pairs.map(([w, mm, r]) => `**${w}**${r && r !== w ? `（${r}）` : ''}：${mm}`).join('\n\n');   // every pair; no example: the sentence would be one word's of six
      q.fullJp = ''; q.fullZh = '';
      q.options = [{ text: v.m }, { text: '' }]; q.answer = 0; q.answerText = v.m;
      return true;
    }
    // v-meaning (default)
    const opts = meaningOptions(v, false, ja);
    if (!opts) return false;
    q.fmt = 'v-meaning'; q.label = `單字 · ${lvTag} · 意思`;
    q.instr = '這個字的意思是？';
    q.stemHtml = v.r && HAS_KANJI.test(v.w) && !/\[/.test(v.w) ? rubyHtml(jaPlain(v.w), v.r) : furi(v.w);
    q.stemClass = jaPlain(v.w).length > 8 ? '' : 'word';
    if (v.p) q.subHtml = posChip(v.p);
    finalizeOptions(q, v.m, opts, false);
    q.wide = q.options.some(o => o.text.length > 14);
    return true;
  };
  const finish = () => {
    const want = ctx.kana === true || (ctx.kana === undefined && srsGet(v.key) && Math.random() < KANA_OPTION_RATE);
    if (want && (q.fmt === 'v-recall' || q.fmt === 'v-pic' || q.fmt === 'v-cloze') && kanaOptionsDistinct(q)) q.kanaOptions = true;
    return q;
  };
  // the mock exam asks for one specific format (漢字読み / 表記) and needs nothing else
  if (ctx.forceFmt) return tryBuild(ctx.forceFmt) ? finish() : null;
  if (ctx.encore) {
    // an encore must use a format this word has not had in this session; when none can be built there is no encore
    const used = [].concat(avoid || []);
    let left = (Array.isArray(formats[0]) ? formats : [[formats[0], 1]]).filter(([f]) => !used.includes(f));
    while (left.length) {
      const f = weightedPick(left);
      if (tryBuild(f)) return finish();
      left = left.filter(([x]) => x !== f);
    }
    return null;
  }
  if (!tryBuild(fmt)) {
    const order = ['v-meaning', 'v-recall', 'v-cloze'];
    let ok = false;
    for (const f of order) { if (f !== fmt && tryBuild(f)) { ok = true; break; } }
    if (!ok) return null;
  }
  return finish();
}

// ---------- grammar ----------
// 用法 question for a particle blank: "what does this に express here?" with the unit's other points as options (same phase as a
// reserve). A point for the same particle is a distractor only when its name shares little with the right one — otherwise it is
// the same usage under another name and would be a second right answer.
const PARTICLES = new Set(['に', 'で', 'を', 'が', 'へ', 'と', 'は', 'から', 'まで', 'の', 'も', 'より', 'か', 'や', 'でも', 'だけ', 'しか', 'ほど', 'くらい', 'ぐらい', 'など', 'ので', 'のに', 'けど', 'ても', 'たら', 'ば', 'なら']);
const PURE_PT = /^[\u4e00-\u9fff]{2,8}$/;
function ptShared(a, b) { const A = new Set(a); let n = 0; for (const c of new Set(b)) if (A.has(c)) n++; return n; }
function grammarUsageDistractors(g) {
  if (!PARTICLES.has(g.a) || !PURE_PT.test(g.pt || '')) return null;
  const ph = unitById(g.u).ph;
  const pools = [REG.grammar.filter(x => x.u === g.u), REG.grammar.filter(x => x.u !== g.u && unitById(x.u).ph === ph)];
  const picked = []; const seen = new Set([g.pt]);
  for (const pool of pools) {
    const pts = new Map();
    pool.forEach(x => { if (!PURE_PT.test(x.pt || '') || seen.has(x.pt)) return; const e = pts.get(x.pt) || pts.set(x.pt, { pt: x.pt, same: false }).get(x.pt); if (x.a === g.a) e.same = true; });
    const ok = [...pts.values()].filter(e => ptShared(e.pt, g.pt) < Math.min(e.pt.length, g.pt.length) && !(e.same && ptShared(e.pt, g.pt) >= 2));
    shuffle(ok.filter(e => e.same)).concat(shuffle(ok.filter(e => !e.same))).forEach(e => { if (picked.length < 3 && !seen.has(e.pt)) { seen.add(e.pt); picked.push(e.pt); } });
    if (picked.length === 3) return picked;
  }
  return null;
}
// a fill-in item's second format: a particle blank asks its 用法; any other item with pieces (zt) puts its Chinese together
// (句意拼貼, 2026-11-10). The four whole Chinese sentences of other items it had before went: one known word gave them away
function grammarFormats(g) {
  const f = ['g-choice'];
  if (g.zh && grammarUsageDistractors(g)) f.push('g-meaning');
  else if (g.zh && g.zt) f.push('g-zh');
  return f;
}
function pickGrammarFormat(g, rec, avoid, choiceOnly) {   // choiceOnly: a 階段測驗 asks with options only
  if (!rec) return 'g-choice';
  const pairs = grammarFormats(g).filter(f => !(choiceOnly && f === 'g-zh')).map(f => [f, (!rec.gf || !rec.gf[f] || rec.gf[f][0] === 0) ? 3 : 1]);
  return weightedPick(pairs, avoid);
}
// 句意拼貼 (2026-11-10, the user): the Japanese sentence over Chinese pieces — its own (g.zt) shuffled with two or three decoys (g.zd)
// that change the grammar point, so the grammar has to be read. Graded by which pieces are placed, not their order (Chinese is the
// learner's own language); zk marks the piece that carries the point once answered. Option 0 is the Chinese, option 1 what was built
function makeZhPieceQuestion(q, g, full) {
  q.fmt = 'g-zh'; q.custom = 'g-zh';
  q.instr = '用下面的詞塊拼出這句話的意思';
  q.stemHtml = furi(full);
  q.fullJp = full; q.zhText = '';
  q.zhParts = g.zt.slice(); q.zhKey = g.zk;
  q.tiles = shuffle(g.zt.concat(g.zd));
  q.mistakePrompt = `${full} 的意思`;
  q.options = [{ text: g.zt.join('') }, { text: '' }]; q.answer = 0; q.answerText = g.zt.join('');
  q.wide = true;
  return q;
}
function splitBlank(jp) {
  const m = BLANK_RE.exec(jp);
  if (!m) return null;
  const inner = m[1];
  let hint = '';
  const arrow = inner.split(/→|->/);
  if (arrow.length > 1) hint = arrow[0].trim();
  else if (inner.replace(/[\s　]/g, '')) hint = inner.replace(/[\s　]/g, '');
  return { pre: jp.slice(0, m.index), post: jp.slice(m.index + m[0].length), hint };
}
function blankChip(hint) {
  return `<span class="blank" data-blank>${hint ? `<span class="small">${furi(hint)} →</span>` : '　'}</span><!--/blank-->`;
}
function unitTag(g) { const u = unitById(g.u); return `${u.weeks}・${u.short}`; }

// the forms a level's conjugation items choose their wrong options from (a level without its own list takes the one below)
const CONJ_POOL = {   /* level-literal-ok: data */
  N5: ['te', 'ta', 'nai', 'dict', 'masu'], N4: ['pot', 'pass', 'caus', 'vol', 'ba', 'te', 'nai', 'imp'], N3: ['pot', 'pass', 'caus', 'causpass', 'vol', 'ba', 'te', 'imp']
};
function conjPoolFor(lv) { const i = ALL_LEVELS.indexOf(courseLevel(lv || '')); for (let j = i; j > 0; j--) if (CONJ_POOL[ALL_LEVELS[j]]) return CONJ_POOL[ALL_LEVELS[j]]; return CONJ_POOL[courseLevels()[0]]; }
function makeGrammarQuestion(g, ctx = {}) {
  const q = baseQ(g);
  q.cat = g.pt || '文法';
  q.point = g.pt || '';
  q.lv = g.lv;
  q.why = g.why || '';
  q.unit = g.u;
  q.label = `文法 · ${unitTag(g)}`;
  q.zhText = g.zh || '';
  const rec = srsGet(g.key);
  const t = g.t || 'choice';
  if (t === 'choice') {
    const b = splitBlank(g.jp);
    if (!b) return null;
    const opts = (g.op || []).map(parenReadingToBracket);
    const ans = parenReadingToBracket(g.a);
    // A fill-in item is also asked as 用法 or 句意拼貼, so a review is not the same question with the answer remembered.
    // First sighting is always the plain fill-in. (選正確句, every option filled in, went in 1.0.23.)
    const fmt = ctx.forceFmt || pickGrammarFormat(g, rec, ctx.avoidFmt, ctx.choiceOnly);
    if (fmt === 'g-zh' && g.zt) return makeZhPieceQuestion(q, g, b.pre + ans + b.post);
    const usage = fmt === 'g-meaning' && grammarUsageDistractors(g);
    if (usage) {   // particle: ask what it expresses here, options are point names
      const full = b.pre + ans + b.post;
      q.fmt = 'g-meaning';
      q.fullJp = full;
      q.zhText = '';
      q.instr = `畫線的「${esc(jaPlain(ans))}」在這句表示什麼？`;
      q.stemHtml = `${furi(b.pre)}<span class="uline">${furi(ans)}</span>${furi(b.post)}`;
      q.mistakePrompt = `${full} 中「${jaPlain(ans)}」的用法`;
      finalizeOptions(q, g.pt, usage, false);
      q.answerText = g.pt;
      q.wide = false;
      return q;
    }
    q.fmt = 'g-choice';
    q.instr = '選出最適合填入空格的選項';
    q.stemHtml = `${furi(b.pre)}${blankChip(b.hint)}${furi(b.post)}`;
    q.fillHtml = furi(ans);
    q.fullJp = b.pre + ans + b.post;
    q.mistakePrompt = g.jp;
    finalizeOptions(q, ans, opts.filter(o => o !== ans).slice(0, 3), true);
    q.wide = q.options.some(o => jaPlain(o.text).length > 9);
    return q;
  }
  if (t === 'meaning') {
    // put together from pieces when it has them (a 階段測驗 keeps to options: its four hand-written sentences)
    if (g.zt && !ctx.choiceOnly) return makeZhPieceQuestion(q, g, g.jp);
    q.fmt = 'g-meaning';
    q.instr = '這句話的意思是？';
    q.stemHtml = furi(g.jp);
    q.fullJp = g.jp;
    q.zhText = '';
    q.mistakePrompt = g.jp;
    finalizeOptions(q, g.a, (g.op || []).filter(o => o !== g.a).slice(0, 3), false);
    q.wide = true;
    return q;
  }
  if (t === 'order') {
    const parts = g.parts || [];
    q.fmt = 'g-order';
    q.fullJp = (g.pre || '') + parts.join('') + (g.post || '');
    q.orderParts = parts;
    q.why = `正確順序：${parts.join(' → ')}\n\n${g.why || ''}`;
    if (ctx.forceFmt === 'g-choice') {   // the mock exam keeps the JLPT form: which piece lands on ★
      const slots = parts.map((_, i) => i === g.star ? '<span class="blank star" data-blank>★</span>' : '<span class="blank" style="min-width:2.4em">＿</span>');
      q.instr = '把四個選項排成正確的句子，★ 的位置是哪一個？';
      q.stemHtml = `${furi(g.pre || '')}${slots.join('')}${furi(g.post || '')}`;
      q.mistakePrompt = `${g.pre || ''}${parts.map((p, i) => i === g.star ? '★' : '＿').join(' ')}${g.post || ''}`;
      finalizeOptions(q, parts[g.star], parts.filter((_, i) => i !== g.star), true);
      return q;
    }
    // practice: arrange the four pieces by tapping them in order (option 0 the sentence, option 1 what the learner built)
    q.custom = 'g-order';
    q.instr = '依正確的順序點選四個部分，排成一句話';
    q.stemHtml = '';
    q.pre = g.pre || ''; q.post = g.post || '';
    let tiles = shuffle(parts.slice()); if (tiles.join('') === parts.join('')) tiles = tiles.slice(1).concat(tiles[0]);   // never hand out the answer
    q.tiles = tiles;
    q.mistakePrompt = `排序：${q.pre}＿＿＿＿${q.post}（${parts.join('・')}）`;
    q.options = [{ text: q.fullJp, jp: true }, { text: '', jp: true }]; q.answer = 0; q.answerText = q.fullJp;
    q.wide = true;
    return q;
  }
  if (t === 'conj' || t === 'adj') {
    const isV = t === 'conj';
    const slot = isV ? '{V}' : '{A}';
    const idx = String(g.jp).indexOf(slot);
    if (idx < 0) return null;
    const pre = g.jp.slice(0, idx); const post = g.jp.slice(idx + slot.length);
    const base = isV ? g.v : g.w;
    const ans = isV ? JConj.conjVerb(g.v, g.g, g.f) : JConj.conjAdj(g.w, g.k, g.f);
    if (!ans) return null;
    let wrongs = isV ? JConj.verbDistractors(g.v, g.g, g.f, ans) : JConj.adjDistractors(g.w, g.k, g.f, ans);
    if (wrongs.length < 3) return null;
    // keep at most one real (grammatical) form among the distractors; show the translation when one is used
    const real = isV ? new Set(VERB_FORMS.map(f => JConj.normJa(JConj.conjVerb(g.v, g.g, f) || ''))) : new Set((g.k === 'i' ? I_FORMS : NA_FORMS).map(f => JConj.conjAdj(g.w, g.k, f)));
    const errs = wrongs.filter(w => !real.has(isV ? JConj.normJa(w) : w));
    const reals = wrongs.filter(w => real.has(isV ? JConj.normJa(w) : w));
    let chosen = shuffle(errs.slice(0, 4)).slice(0, 3);
    if (chosen.length < 3) chosen = chosen.concat(reals.slice(0, 3 - chosen.length));
    else if (reals.length && Math.random() < 0.5) { chosen[2] = reals[0]; }
    q.forceZh = chosen.some(w => real.has(isV ? JConj.normJa(w) : w));
    const fam = formFamily(g.f || '');
    // form-identification variant for learned items
    // 食べられる / 来られる are both potential and passive, and たら・たり・ないで are not a single "form"
    const surfaceDup = isV && ['pot', 'pass'].includes(fam) && JConj.normJa(JConj.conjVerb(g.v, g.g, 'pass') || '') === JConj.normJa(JConj.conjVerb(g.v, g.g, 'pot') || '');
    const identifiable = !['tara', 'tari', 'naide', 'nakereba', 'nakutemo', 'nakute', 'kinshi', 'causpass', 'causpassmashita', 'stem'].includes(g.f);
    if (isV && rec && rec.b >= 2 && FORM_LABEL[fam] && identifiable && !surfaceDup && !ctx.encore && !ctx.forceFmt && Math.random() < 0.3) {   // not for an encore (that is the spelled version) nor a forced format
      const pool = conjPoolFor(g.lv);
      const others = shuffle(pool.filter(f => f !== fam)).slice(0, 3);
      if (others.length === 3) {
        q.fmt = 'g-identify';
        q.instr = '畫線的動詞是哪一種形？';
        q.stemHtml = `${furi(pre)}<span class="uline">${furi(ans)}</span>${furi(post)}`;
        q.fullJp = pre + ans + post;
        q.mistakePrompt = `${jaPlain(pre)}【${jaPlain(ans)}】${jaPlain(post)} 是哪一種形？`;
        q.why = `「${jaPlain(ans)}」是「${base}」的${FORM_LABEL[fam]}。${g.why ? '\n\n' + g.why : ''}`;
        finalizeOptions(q, FORM_LABEL[fam], others.map(f => FORM_LABEL[f]), false);
        q.answerText = FORM_LABEL[fam];
        return q;
      }
    }
    // 輸入模式: the learner spells the form with kana tiles or types it (no options to eliminate)
    const typedFmt = isV ? 'g-conj-type' : 'g-adj-type';
    const avoid = ctx.encore ? [].concat(ctx.avoidFmts || ctx.avoidFmt || []) : [];   // only an encore is steered by the formats used; an ordinary question follows mastery
    const choiceFmt = isV ? 'g-conj' : 'g-adj';
    let mode = ctx.forceFmt === typedFmt ? (state.settings.conjInput === 'type' ? 'type' : 'tiles')
      : (ctx.forceFmt === 'g-conj' || ctx.forceFmt === 'g-adj') ? 'choice' : conjInputMode(rec, ctx);
    if (!ctx.forceFmt && avoid.length) {   // 換個方式再考: the format not yet used this session
      if (avoid.includes(choiceFmt) && !avoid.includes(typedFmt)) mode = state.settings.conjInput === 'type' ? 'type' : 'tiles';
      else if (avoid.includes(typedFmt) && !avoid.includes(choiceFmt)) { if ((state.settings.conjInput || 'auto') === 'auto') mode = 'choice'; else return null; }
    }
    if (mode !== 'choice') {
      q.fmt = typedFmt; q.custom = typedFmt; q.inputMode = mode;
      q.instr = mode === 'tiles' ? (isV ? '點假名，拼出正確的動詞變化' : '點假名，拼出正確的形容詞變化') : (isV ? '輸入正確的動詞變化' : '輸入正確的形容詞變化');
      q.stemHtml = `${furi(pre)}${blankChip(base)}${furi(post)}`;
      q.fillHtml = furi(ans);
      q.fullJp = pre + ans + post;
      q.mistakePrompt = `${pre}（${base}→　）${post}`;
      if (!q.why) q.why = `「${base}」→「${jaPlain(ans)}」`;
      q.tiles = conjTiles(ans, wrongs);
      q.options = [{ text: ans, jp: true }, { text: '', jp: true }]; q.answer = 0; q.answerText = ans;
      return q;
    }
    q.fmt = isV ? 'g-conj' : 'g-adj';
    q.instr = isV ? '選出正確的動詞變化' : '選出正確的形容詞變化';
    q.stemHtml = `${furi(pre)}${blankChip(base)}${furi(post)}`;
    q.fillHtml = furi(ans);
    q.fullJp = pre + ans + post;
    q.mistakePrompt = `${pre}（${base}→　）${post}`;
    if (!q.why) q.why = `「${base}」→「${jaPlain(ans)}」`;
    finalizeOptions(q, ans, chosen, true);
    q.wide = q.options.some(o => jaPlain(o.text).length > 9);
    return q;
  }
  return null;
}

// ---------- 假名辨識 (kind a) ----------
// First look: 看字選音 (the character is shown and spoken, like a preview). Afterwards 聽音選字 2 : 看字選音 1 : 平片對照 1.
function makeKanaQuestion(item, ctx = {}) {
  const rec = srsGet(item.key);
  const b = rec ? rec.b : -1;
  let fmt = ctx.forceFmt;
  if (!fmt) {
    if (b < 0) fmt = 'a-read';
    else { const bag = (speechAvailable() ? ['a-sound', 'a-sound', 'a-read', 'a-pair'] : ['a-read', 'a-pair']).filter(f => f !== ctx.avoidFmt); fmt = bag[Math.floor(Math.random() * bag.length)] || 'a-read'; }   // 聽音選字 only when something can play it
  }
  const other = item.script === 'hira' ? '片假名' : '平假名';
  const q = baseQ(item);
  q.cat = '假名'; q.lv = 'PRE_N5'; q.point = '假名辨識';
  q.label = `假名 · ${item.script === 'hira' ? '平假名' : '片假名'}`;
  q.why = `「${item.ch}」讀 ${item.roma}，${other}是「${item.pair}」。`;
  q.mistakePrompt = `假名「${item.ch}」`;
  q.speakWord = item.ch;
  const looks = kanaLookalikes(item);
  if (fmt === 'a-read') {
    const wrongs = []; looks.forEach(c => { const r = KANA_ROMAJI[c] || KANA_ROMAJI[Object.keys(KATA).find(h => KATA[h] === c)]; if (r && r !== item.roma && !wrongs.includes(r) && wrongs.length < 3) wrongs.push(r); });
    const all = ['ka', 'sa', 'ta', 'na', 'ma', 'ra', 'ya', 'wa', 'ki', 'su', 'te', 'no', 'mi', 'ru', 'he', 'yu'];
    shuffle(all).forEach(r => { if (wrongs.length < 3 && r !== item.roma && !wrongs.includes(r)) wrongs.push(r); });
    q.fmt = 'a-read'; q.instr = '這個假名怎麼讀？';
    q.stemHtml = `<span class="kanji-big jp">${esc(item.ch)}</span>`; q.stemClass = 'word';
    finalizeOptions(q, item.roma, wrongs, false);
    if (!ctx.choiceOnly) q.audio = item.ch;   // spoken once when shown: the first look teaches the sound (not in a 階段測驗: the sound is the answer)
  } else if (fmt === 'a-sound') {
    q.fmt = 'a-sound'; q.instr = '聽到的是哪一個？';
    q.stemHtml = playButton('再聽一次');
    finalizeOptions(q, item.ch, looks.slice(0, 3), true);
    q.noFuriOptions = true;
    q.audio = item.ch;
  } else {
    const pairItem = REG.byKey.get('a:' + item.pair) || item;
    q.fmt = 'a-pair'; q.instr = `它的${other}是？`;
    q.stemHtml = `<span class="kanji-big jp">${esc(item.ch)}</span>`; q.stemClass = 'word';
    finalizeOptions(q, item.pair, kanaLookalikes(pairItem).slice(0, 3), true);
    q.noFuriOptions = true;
  }
  return q;
}

function makeQuestion(item, ctx) {
  if (ctx && ctx.choiceOnly && !ctx._inChoice) {   // 階段測驗: only a question with options; a spelled / ordered / matched format is retried, then given up
    for (let i = 0; i < 6; i++) { const q = makeQuestion(item, Object.assign({}, ctx, { _inChoice: true })); if (!q) return null; if (!q.custom) return q; }
    return null;
  }
  try {
    if (item.kind === 'a') return makeKanaQuestion(item, ctx);
    if (item.kind === 'l') return makeListenQuestion(item, ctx);
    if (item.kind === 'r') return makeReadQuestion(item, ctx);
    if (item.kind === 'k') return makeKanjiQuestion(item, ctx);
    if (item.kind === 'c') return makeConjDrillQuestion(item, ctx);
    return item.kind === 'v' ? makeVocabQuestion(item, ctx) : makeGrammarQuestion(item, ctx);
  } catch (e) {
    console.warn('question build failed', item && item.key, e);
    return null;
  }
}

// A mistake that is not linked to any current item (e.g. from the old version)
function makeMistakeCard(m) {
  const q = { id: uid('q'), key: m.key || '', mistakeId: m.id, kind: 'm', fmt: 'm-card', cat: m.cat, label: `錯題本 · ${m.cat || '綜合'}`, instr: '選出正確答案', options: [], answer: 0, why: m.why || '', point: '', stemHtml: '', zhText: '' };
  const b = splitBlank(m.prompt);
  q.stemHtml = b ? `${furi(b.pre)}${blankChip(b.hint)}${furi(b.post)}` : furi(m.prompt);
  if (b) { q.fillHtml = furi(m.answer); q.fullJp = b.pre + m.answer + b.post; }
  q.mistakePrompt = m.prompt;
  const others = new Set();
  if (m.wrong && m.wrong !== m.answer && !/^(未作答|手動|SRS|自訂)/.test(m.wrong)) others.add(m.wrong);
  shuffle(state.mistakes.filter(x => x.id !== m.id && x.cat === m.cat && x.answer && x.answer !== m.answer)).forEach(x => { if (others.size < 3) others.add(x.answer); });
  const filler = /^[ぁ-ん]{1,2}$/.test(m.answer) ? ['に', 'で', 'を', 'が', 'へ', 'と', 'は', 'から'] : shuffle(state.mistakes.map(x => x.answer).filter(a => a && a !== m.answer));
  filler.forEach(f => { if (others.size < 3 && f !== m.answer) others.add(f); });
  if (others.size < 3) return null;
  finalizeOptions(q, m.answer, [...others].slice(0, 3), /[ぁ-んァ-ン一-龯]/.test(m.answer));
  q.wide = q.options.some(o => o.text.length > 10);
  return q;
}
