'use strict';
/* ==========================================================================
   Text: furigana, markdown, small render helpers
   ========================================================================== */
const KANJI_RE = /[一-鿿々〆ヶ]/;
const FURI = new Map();
let FURI_MAX = 1;
const GROUP_OF_POS = { v5: '5', v1: '1', vs: 's', vk: 'k' };
const VERB_FORMS = ['dict', 'stem', 'masu', 'masen', 'mashita', 'masendeshita', 'mashou', 'te', 'ta', 'tara', 'tari', 'nai', 'nakatta', 'naide', 'nakereba', 'nakutemo', 'nakute', 'ba', 'pot', 'potmasu', 'potmasen', 'potmashita', 'potnai', 'potte', 'vol', 'pass', 'passmasu', 'passmashita', 'passte', 'passnai', 'caus', 'causmasu', 'causmashita', 'causte', 'causnai', 'causpass', 'causpassmashita', 'imp', 'kinshi'];
const I_FORMS = ['dict', 'stem', 'kunai', 'katta', 'kunakatta', 'kute', 'ku', 'kereba', 'kattara', 'sou', 'sugiru', 'kunaidesu', 'kattadesu', 'kunakattadesu', 'kuarimasen'];
const NA_FORMS = ['dict', 'da', 'na', 'de', 'ni', 'desu', 'deshita', 'datta', 'janai', 'janakatta', 'jaarimasen', 'jaarimasendeshita', 'nara', 'sou', 'sugiru'];

// Each key keeps the reading from the highest-priority source; two different readings at the
// same priority (一日 = ついたち / いちにち) make the key ambiguous, and it is left without furigana.
const FURI_PRIO = new Map();
const FURI_BLOCK = new Set();
const FURI_SRC = new Map();   // furigana key → vocab item it came from (for "no readings on mastered words")
let furiPrio = 1;
let furiSrc = '';
function furiAdd(key, reading) {
  if (!key || !reading || key === reading || !KANJI_RE.test(key)) return;
  if (FURI_BLOCK.has(key)) return;
  const have = FURI.get(key);
  if (have !== undefined) {
    if (have === reading) return;
    const p = FURI_PRIO.get(key) || 0;
    if (furiPrio < p) return;
    if (furiPrio === p) { FURI.delete(key); FURI_SRC.delete(key); FURI_BLOCK.add(key); return; }
  }
  if (!/^[぀-ゟー]+$/.test(reading)) return;
  FURI_PRIO.set(key, furiPrio);
  FURI.set(key, reading);
  if (furiSrc) FURI_SRC.set(key, furiSrc); else FURI_SRC.delete(key);
  if (key.length > FURI_MAX) FURI_MAX = key.length;
}
// add the "kanji + first okurigana" stem of an inflected form, e.g. 書い→かい, 食べ→たべ
function furiAddStem(surface, reading, long = true) {   // long: also the two-okurigana key (everyday forms only)
  if (!surface || !reading) return;
  const s = jaPlain(surface); const r = reading;
  let k = -1;
  for (let i = s.length - 1; i >= 0; i--) { if (KANJI_RE.test(s[i])) { k = i; break; } }
  if (k < 0) return;
  const oku = s.slice(k + 1);
  if (!oku) { if (s.length > 1) furiAdd(s, r); return; }
  if (!r.endsWith(oku)) return;
  const kr = r.slice(0, r.length - oku.length);
  furiAdd(s.slice(0, k + 2), kr + oku[0]);
  furiNoteNext(s.slice(0, k + 2), kr + oku[0], oku[1]);
  // also kanji + two okurigana: 止まり／止まら (止まる) are then longer than 止ま, which 止まない (止む) also writes (1.0.33)
  if (long && oku.length >= 2) furiAdd(s.slice(0, k + 3), kr + oku.slice(0, 2));
}
// A key of a kanji and one kana that is also a particle (空か of 空かない, 曲が of 曲がる) notes the kana its word's forms go on with
// ('*': a form ends there, 茹で of 茹で卵): 空から and この曲が are the noun 空, 曲 and a particle (formGoesOn, 1.0.34)
const PARTICLE_KANA = new Set([...'がのにをでとへはもやか']);
const FURI_NEXT = new Map();   // key → its reading → the kana that follow it
function furiNoteNext(key, reading, next) {
  if (!PARTICLE_KANA.has(key[key.length - 1])) return;
  const byR = FURI_NEXT.get(key) || FURI_NEXT.set(key, new Map()).get(key);
  const set = byR.get(reading) || byR.set(reading, new Set()).get(reading);
  set.add(next || '*');
  if ('るられりろ'.includes(next || '-')) set.add('ん');   // a る verb also goes on 〜んない (分かんない, 上がんない)
}
// a stem ending in a kanji and one kana (空か, 熱か) also goes on with these, in forms the conjugation tables do not make
function furiNoteStem(stem, reading, kana) {
  if (stem.length >= 2 && KANJI_RE.test(stem[stem.length - 2]) && !KANJI_RE.test(stem[stem.length - 1])) [...kana].forEach(c => furiNoteNext(stem, reading, c));
}
function formGoesOn(key, reading, next) {
  const set = FURI_NEXT.has(key) && FURI_NEXT.get(key).get(reading);
  if (!set || set.has('*')) return true;
  const alone = FURI.get(key.slice(0, -1));   // the kanji alone: a word read another way (空 そら), or nothing to fall back on
  return !alone || reading.startsWith(alone) || set.has(next);
}

let FURI_BASE = null;
function buildFuriganaIndex() {
  const add = (v) => {
    furiSrc = v.key || '';
    const w = jaPlain(v.w || ''); const r = v.r || '';
    if (!w || !r || !KANJI_RE.test(w) || !/^[぀-ゟー]+$/.test(r)) return;
    const g = GROUP_OF_POS[v.p];
    if (g) {
      // everyday forms first; rarer derived forms (入れる as the potential of 入る) lose any clash
      ['dict', 'masu', 'te', 'ta', 'nai', 'stem'].forEach(f => {
        const sf = JConj.conjVerb(w, g, f); const rf = JConj.conjVerb(r, g, f);
        if (sf && rf) furiAddStem(sf, jaKana(rf));
      });
      const tier = furiPrio; furiPrio = tier - 0.5;
      ['ba', 'pot', 'vol', 'pass', 'caus', 'imp'].forEach(f => {   // no long keys: 止める as 止む's potential must not beat 止める（とめる）
        const sf = JConj.conjVerb(w, g, f); const rf = JConj.conjVerb(r, g, f);
        if (sf && rf) furiAddStem(sf, jaKana(rf), false);
      });
      furiPrio = tier;
      // the negative stem also goes on with ず, ぬ, ん and the old conditional ば (空かずに, 急がぬ, 急がば回れ); noted only, no keys
      furiNoteStem(jaPlain(JConj.conjVerb(w, g, 'nai') || '').replace(/ない$/, ''), jaKana(JConj.conjVerb(r, g, 'nai') || '').replace(/ない$/, ''), 'ずぬんば');
      furiAdd(w, r);
      if (g === 's' && w.endsWith('する')) furiAdd(w.slice(0, -2), r.slice(0, -2));
    } else if (v.p === 'i') {
      ['dict', 'kunai', 'katta', 'kute', 'ku', 'kereba', 'sou', 'sugiru'].forEach(f => {
        const sf = JConj.conjAdj(w, 'i', f); const rf = JConj.conjAdj(r, 'i', f);
        if (sf && rf) furiAddStem(sf, rf);
      });
      furiNoteStem(jaPlain(JConj.conjAdj(w, 'i', 'katta') || '').replace(/った$/, ''), (JConj.conjAdj(r, 'i', 'katta') || '').replace(/った$/, ''), 'ろ');   // 熱かろう
      furiAdd(w, r);
    } else {
      furiAdd(w, r);
    }
    furiNoteNext(w, r);   // a word spelled like a form (確か, the stem of 確かめる too) goes on with anything
  };
  const hiddenKey = (state.hidden || []).slice().sort().join(',');
  if (FURI_BASE && FURI_BASE.key === hiddenKey) {
    FURI.clear(); FURI_BASE.furi.forEach((v, k) => FURI.set(k, v));
    FURI_PRIO.clear(); FURI_BASE.prio.forEach((v, k) => FURI_PRIO.set(k, v));
    FURI_BLOCK.clear(); FURI_BASE.block.forEach(k => FURI_BLOCK.add(k));
    FURI_SRC.clear(); FURI_BASE.src.forEach((v, k) => FURI_SRC.set(k, v));
    FURI_NEXT.clear(); FURI_BASE.next.forEach((byR, k) => FURI_NEXT.set(k, new Map([...byR].map(([r, set]) => [r, new Set(set)]))));
    FURI_MAX = FURI_BASE.max;
  } else {
    FURI.clear(); FURI_PRIO.clear(); FURI_BLOCK.clear(); FURI_SRC.clear(); FURI_NEXT.clear(); FURI_MAX = 1;
    // built-in N5 words win over N4 words when keys collide (行って = いって, not おこなって)
    const cl = courseLevels();
    // 同形異讀: the first built-in word of a spelling keeps its place; the later readings (四 し after 四 よん) go in last, below
    // everything else, so they never take an old sentence's reading (their own examples show them, exampleHtml)
    const later = laterReading;   // "first" of a spelling: the app's own word, then the lower level, then the lower id (buildRegistry)
    furiPrio = 4; BUILTIN_ALL.filter(v => !later(v) && courseLevel(v.lv) === cl[0]).forEach(add);
    furiPrio = 3; furiSrc = ''; (DATA.FURI || []).forEach(([k, r]) => furiAdd(k, r));   // these readings belong to no word: mastering the last word added above must not hide them
    // one-kanji words from N3 up (土 つち, 来 らい) only fill gaps: as N3 words at 1.9 they would take 土 in （土）, 来 in 来ます
    const oneKanji = (v) => /^[一-鿿々]$/.test(jaPlain(v.w)) && cl.indexOf(v.lv) >= 2;
    cl.slice(1).forEach((L, i) => { furiPrio = 2 - i * 0.1; BUILTIN_ALL.filter(v => !later(v) && !oneKanji(v) && v.lv === L).forEach(add); });   // N4 2, N3 1.9 … (spec §4.5)
    // readings for words that appear in sentences but are not quizzed (names, 思う, 名前 …)
    furiPrio = 1.5; (DATA.FURI_EXTRA || []).forEach(([w, r, p]) => add({ w, r, p }));
    furiPrio = 1.45; BUILTIN_ALL.filter(v => !later(v) && oneKanji(v)).forEach(add);
    furiPrio = 1.4; BUILTIN_ALL.filter(later).forEach(add);
    FURI_BASE = { key: hiddenKey, furi: new Map(FURI), prio: new Map(FURI_PRIO), block: new Set(FURI_BLOCK), src: new Map(FURI_SRC), max: FURI_MAX,
      next: new Map([...FURI_NEXT].map(([k, byR]) => [k, new Map([...byR].map(([r, set]) => [r, new Set(set)]))])) };
  }
  furiSrc = '';
}
// a word the learner has mastered gets class "known"; its reading is hidden in the "smart" furigana mode
function knownCls(key) {
  const src = FURI_SRC.get(key);
  const r = src && state.srs[src];
  return r && srsLevelLabel(r, src) === '已熟練' ? 'known' : '';
}

// Align a reading onto a word that mixes kanji and kana: 間に合う/まにあう → [[間,ま],[に],[合,あ],[う]]
function alignReading(word, reading) {
  const segs = word.match(/[一-鿿々〆ヶ]+|[^一-鿿々〆ヶ]+/g) || [word];
  if (segs.length === 1) return KANJI_RE.test(word) ? [[word, reading]] : [[word]];
  const pattern = '^' + segs.map(sg => KANJI_RE.test(sg) ? '(.+?)' : sg.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('') + '$';
  const m = new RegExp(pattern).exec(reading);
  if (!m) return [[word, reading]];
  let gi = 1;
  return segs.map(sg => KANJI_RE.test(sg) ? [sg, m[gi++]] : [sg]);
}
function rubyHtml(word, reading, cls) {
  const open = cls ? `<ruby class="${cls}">` : '<ruby>';
  return alignReading(word, reading).map(([w, r]) => r ? `${open}${esc(w)}<rt>${esc(r)}</rt></ruby>` : esc(w)).join('');
}

// A day after a number (1.0.34): 2日 ふつか … 10日 とおか, 14日, 20日 はつか, 24日 are words of their own, read over the number and
// 日 together; the other days are にち. 1日 is ついたち after a month (10月1日, 毎月1日) and いちにち otherwise (1日に3回).
const DAY_WORD = { 2: 'ふつか', 3: 'みっか', 4: 'よっか', 5: 'いつか', 6: 'むいか', 7: 'なのか', 8: 'ようか', 9: 'ここのか', 10: 'とおか', 14: 'じゅうよっか', 20: 'はつか', 24: 'にじゅうよっか' };
function dayReading(d, before, tail) {
  const w = d === '1' ? (/月\s*$/.test(before) && !tail ? 'ついたち' : 'いちにち') : DAY_WORD[Number(d)];
  return w ? { whole: w + tail } : 'にち' + tail;
}
// Readings for counters written after a number (7時, 30分, 3本 …). Some change with the last digit; a rule gets the digits and
// the text before them, and { whole } reads the number and the counter as one word (3日 みっか). 1人, 2人 are left bare.
const COUNTER_READ = {
  '日間': (d, b) => dayReading(d, b, 'かん'), '日目': (d, b) => dayReading(d, b, 'め'), '日分': (d, b) => dayReading(d, b, 'ぶん'), '日': (d, b) => dayReading(d, b, ''),
  '時半': 'じはん', '時間': 'じかん', '時': 'じ', '円': 'えん', '年間': 'ねんかん', '年生': 'ねんせい', '年': 'ねん', '回目': 'かいめ', '回': 'かい', '枚': 'まい', '歳': 'さい', '月': 'がつ', '部屋': 'へや', '部': 'ぶ',
  '週間': 'しゅうかん', '個': 'こ', '冊': 'さつ', '台': 'だい', '度': 'ど', '番線': 'ばんせん', '番目': 'ばんめ', '番': 'ばん', '号': 'ごう', '倍': 'ばい', '万円': 'まんえん', '万': 'まん', '点': 'てん',
  '分間': (d) => (/[134680]$/.test(d) ? 'ぷんかん' : 'ふんかん'),
  '分': (d) => (/[134680]$/.test(d) ? 'ぷん' : 'ふん'),
  '本': (d) => (/[1680]$/.test(d) ? 'ぽん' : /3$/.test(d) ? 'ぼん' : 'ほん'),
  '杯': (d) => (/[1680]$/.test(d) ? 'ぱい' : /3$/.test(d) ? 'ばい' : 'はい'),
  '匹': (d) => (/[1680]$/.test(d) ? 'ぴき' : /3$/.test(d) ? 'びき' : 'ひき'),
  '階': (d) => (/(^|[^0-9])3$/.test(d) ? 'がい' : 'かい'),
  '軒': (d) => (/3$/.test(d) ? 'げん' : 'けん'),   // houses: 3軒 さんげん (N3; alone 軒 is のき)
  '人': (d) => (/^[12]$/.test(d) ? null : 'にん'),
  '千': (d) => (/^3$/.test(d) ? 'ぜん' : 'せん'),
  '百': (d) => (/^3$/.test(d) ? 'びゃく' : /^[68]$/.test(d) ? 'ぴゃく' : 'ひゃく')
};
const COUNTER_KEYS = Object.keys(COUNTER_READ).sort((a, b) => b.length - a.length);
// a dictionary word starting at p: one written with okurigana (生まれ), or one of two kanji or more (日本語)
function wordAt(s, p, withKana) {
  for (let L = Math.min(FURI_MAX, s.length - p); L >= 2; L--) { const k = s.substr(p, L); if ((withKana ? /[ぁ-ゖ]/ : /^[一-鿿々〆ヶ]+$/).test(k) && FURI.has(k)) return true; }
  return false;
}
function counterRuby(s, i, j) {
  // digits right before position i (ASCII or full-width, commas allowed)
  let k = i; while (k > 0 && /[0-9０-９,，]/.test(s[k - 1])) k--;
  const digits = s.slice(k, i).replace(/[０-９]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xFEE0)).replace(/[,，]/g, '');
  const run = s.slice(i, j);
  let key = COUNTER_KEYS.find(c => run.startsWith(c));
  if (!key) return null;
  // the counter leaves alone a word that starts in it: 生まれ of 1990年生まれ (年 only), and 日, 部 give way to a word of two kanji
  // or more (N5日本語, 1部分, 2部長); 3年生です, 1部コピー stay counters (1.0.34)
  if (key === '年生' && wordAt(s, i + 1, true)) key = '年';
  if ((key === '日' || key === '部') && wordAt(s, i, false)) return null;
  const rule = COUNTER_READ[key];
  const r = typeof rule === 'function' ? rule(digits, s.slice(0, k)) : rule;
  if (r && r.whole) return { len: key.length, lead: s.slice(k, i), html: rubyHtml(s.slice(k, i) + key, r.whole) };   // lead: the digits, already written out
  return { len: key.length, html: r ? rubyHtml(key, r) : esc(key) };
}

// Japanese text → HTML with furigana. Only whole kanji runs found in the dictionary get readings,
// so an unknown compound stays bare instead of getting a wrong reading.
function furi(text, opt = {}) {
  const s = String(text == null ? '' : text);
  let out = '';
  let i = 0;
  const bracket = /^([一-鿿々〆ヶ]+)\[([ぁ-ゖー]+)\]/;
  const isK = (c) => c !== undefined && KANJI_RE.test(c);
  while (i < s.length) {
    const ch = s[i];
    if (isK(ch)) {
      const bm = bracket.exec(s.slice(i));
      if (bm) { out += opt.plain ? esc(bm[1]) : rubyHtml(bm[1], bm[2]); i += bm[0].length; continue; }
      let j = i; while (j < s.length && isK(s[j])) j++;
      const run = s.slice(i, j);
      if (opt.plain) { out += esc(run); i = j; continue; }
      if (i > 0 && /[0-9０-９]/.test(s[i - 1])) {
        const cr = counterRuby(s, i, j);
        if (cr && (!cr.lead || out.endsWith(cr.lead))) { out = out.slice(0, out.length - (cr.lead || '').length) + cr.html; i += cr.len; continue; }   // a whole-word reading takes the digits back
      }
      let done = false;
      for (let L = Math.min(FURI_MAX, s.length - i); L >= j - i; L--) {
        const k = s.substr(i, L);
        const r = FURI.get(k);
        if (!r) continue;
        // a key ending in kanji must end exactly where the kanji run ends
        if (isK(k[k.length - 1]) && isK(s[i + L])) continue;
        if (!formGoesOn(k, r, s[i + L])) continue;   // 空から: the noun 空 and から, not 空か of 空かない
        out += rubyHtml(k, r, knownCls(k)); i += L; done = true; break;
      }
      if (!done) {
        const seg = segmentRun(run, s.slice(j, j + FURI_MAX));
        if (seg) { out += seg.segs.map(([k, r]) => rubyHtml(k, r, knownCls(k))).join(''); i = j + seg.extra; }
        else { out += esc(run); i = j; }
      }
      continue;
    }
    if (ch === '[') {
      const close = s.indexOf(']', i);
      if (close > i && /^[ぁ-ゖー]+$/.test(s.slice(i + 1, close))) { i = close + 1; continue; }
    }
    // kana-initial keys such as お茶 / ご飯 / バス停 / パン屋 (one or more kana, then kanji within the key)
    if (!opt.plain && KANJI_RE.test(s.substr(i + 1, Math.max(0, FURI_MAX - 1)))) {
      let done = false;
      for (let L = Math.min(FURI_MAX, s.length - i); L >= 2; L--) {
        const k = s.substr(i, L);
        if (!KANJI_RE.test(k)) continue;
        const r = FURI.get(k);
        if (!r) continue;
        if (isK(k[k.length - 1]) && isK(s[i + L])) continue;
        let j = i + 1; while (j < s.length && isK(s[j])) j++;
        if (i + L < j) continue;
        out += rubyHtml(k, r, knownCls(k)); i += L; done = true; break;
      }
      if (done) continue;
    }
    out += esc(ch);
    i++;
  }
  return out;
}

// Split a kanji run into known words (日本語学校 → 日本語 + 学校). Inner pieces need two or more kanji;
// only the last piece may be a single kanji, and then only together with its okurigana
// (一番好き → 一番 + 好き), so a compound like 夜中 is never read as 夜 + 中.
function segmentRun(run, after) {
  const n = run.length;
  if (n < 3) return null;
  const best = new Array(n + 1).fill(null);
  best[0] = [];
  for (let a = 0; a < n; a++) {
    if (!best[a]) continue;
    for (let b = a + 2; b <= n; b++) {
      const k = run.slice(a, b);
      const r = FURI.get(k);
      if (!r) continue;
      const cand = best[a].concat([[k, r]]);
      if (!best[b] || cand.length < best[b].length) best[b] = cand;
    }
  }
  if (best[n]) return { segs: best[n], extra: 0 };
  const tail = String(after || '').match(/^[ぁ-ゖ]*/)[0];
  for (let a = n - 1; a >= 2; a--) {
    if (!best[a]) continue;
    for (let L = Math.min(FURI_MAX, n - a + tail.length); L > n - a; L--) {
      const k = run.slice(a) + tail.slice(0, L - (n - a));
      const r = FURI.get(k);
      if (r && formGoesOn(k, r, String(after || '')[L - (n - a)])) return { segs: best[a].concat([[k, r]]), extra: L - (n - a) };
    }
  }
  return null;
}

// Chinese text with a few inline readings (「来[こ]られる」): only the bracketed words become ruby, so
// Chinese words are never given Japanese readings by the dictionary
function bracketRuby(s) {
  return esc(s).replace(/([一-鿿々〆ヶ]+)\[([ぁ-ゖー]+)\]/g, (m, k, r) => rubyHtml(k, r));
}

// Prompts keep the blank as typed (legacy ones pad it: （早い → 　　　）); show a short, even blank instead
function tidyPrompt(s) { return String(s || '').replace(/\s*(→|->)[\s　]*）/g, ' → ＿＿）').replace(/（[\s　]*）/g, '（＿＿）'); }

// Turn legacy "来なくても（こなくても）" into bracket syntax "来[こ]なくても"
function parenReadingToBracket(s) {
  const m = /^(.*?)（([ぁ-ゖー]+)）$/.exec(String(s || ''));
  if (!m || !KANJI_RE.test(m[1])) return s;
  const parts = alignReading(m[1], m[2]);
  if (parts.length === 1 && parts[0].length === 2 && m[1] === parts[0][0]) return `${m[1]}[${m[2]}]`;
  return parts.map(([w, r]) => (r ? `${w}[${r}]` : w)).join('');
}

// ---------- markdown (explanations, AI answers) ----------
function mdInline(line) {
  let s = esc(line);
  s = s.replace(/([一-鿿々〆ヶ]+)\[([ぁ-ゖー]+)\]/g, (m, k, r) => rubyHtml(k, r));   // 来[こ]られる
  s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
  s = s.replace(/\*\*\*(.+?)\*\*\*/g, '<strong>$1</strong>');
  s = s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/__(.+?)__/g, '<strong>$1</strong>');
  s = s.replace(/(^|[^*])\*([^*\n]+?)\*(?!\*)/g, '$1<strong>$2</strong>');
  return s;
}
function md(raw) {
  if (!raw) return '';
  const lines = String(raw).replace(/\r\n/g, '\n').trim().split('\n');
  let html = ''; let ul = false; let ol = false; let code = null; let table = [];
  const closeLists = () => { if (ul) { html += '</ul>'; ul = false; } if (ol) { html += '</ol>'; ol = false; } };
  const flushTable = () => {
    if (!table.length) return;
    html += '<table>' + table.map((r, i) => '<tr>' + r.map(c => `<${i ? 'td' : 'th'}>${mdInline(c.trim())}</${i ? 'td' : 'th'}>`).join('') + '</tr>').join('') + '</table>';
    table = [];
  };
  for (const raw of lines) {
    const t = raw.trim();
    if (t.startsWith('```')) { closeLists(); flushTable(); if (code === null) code = []; else { html += `<pre><code>${esc(code.join('\n'))}</code></pre>`; code = null; } continue; }
    if (code !== null) { code.push(raw); continue; }
    if (t.startsWith('|') && t.endsWith('|') && t.length > 2) { closeLists(); if (!/^\|[\s\-:|]+\|$/.test(t)) table.push(t.slice(1, -1).split('|')); continue; }
    flushTable();
    if (!t) { closeLists(); continue; }
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(t)) { closeLists(); html += '<hr/>'; continue; }
    const h = /^(#{1,4})\s+(.+)$/.exec(t);
    if (h) { closeLists(); html += `<h4>${mdInline(h[2])}</h4>`; continue; }
    if (t.startsWith('>')) { closeLists(); html += `<blockquote>${mdInline(t.replace(/^>+\s*/, ''))}</blockquote>`; continue; }
    const li = /^[-*•]\s+(.+)$/.exec(t);
    if (li) { if (ol) { html += '</ol>'; ol = false; } if (!ul) { html += '<ul>'; ul = true; } html += `<li>${mdInline(li[1])}</li>`; continue; }
    const oli = /^\d+[.)]\s+(.+)$/.exec(t);
    if (oli) { if (ul) { html += '</ul>'; ul = false; } if (!ol) { html += '<ol>'; ol = true; } html += `<li>${mdInline(oli[1])}</li>`; continue; }
    closeLists();
    html += `<p>${mdInline(t)}</p>`;
  }
  if (code !== null) html += `<pre><code>${esc(code.join('\n'))}</code></pre>`;
  closeLists(); flushTable();
  return `<div class="md">${html}</div>`;
}

// ---------- icons ----------
const ICONS = {
  today: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M9.5 21v-6h5v6"/></svg>',
  course: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5V5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2.5Z"/><path d="M8 7h7M8 11h5"/></svg>',
  vocab: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="14" height="14" rx="2"/><path d="M7 3h12a2 2 0 0 1 2 2v12"/><path d="M7 10h6M7 14h4"/></svg>',
  mistakes: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v6M12 16.5v.5"/></svg>',
  exam: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 4h6l1 2h3v15H5V6h3z"/><path d="m9 13 2 2 4-4"/></svg>',
  tools: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1"/><circle cx="12" cy="12" r="3.5"/></svg>',
  more: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="5" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="19" cy="12" r="1.3"/></svg>',
  settings: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M10.3 4.3c.4-1.8 3-1.8 3.4 0a1.7 1.7 0 0 0 2.6 1.1c1.5-.9 3.3.8 2.4 2.4a1.7 1.7 0 0 0 1 2.5c1.8.5 1.8 3 0 3.4a1.7 1.7 0 0 0-1 2.6c.9 1.5-.9 3.3-2.4 2.4a1.7 1.7 0 0 0-2.6 1c-.4 1.8-3 1.8-3.4 0a1.7 1.7 0 0 0-2.6-1c-1.5.9-3.3-.9-2.4-2.4a1.7 1.7 0 0 0-1-2.6c-1.8-.4-1.8-3 0-3.4a1.7 1.7 0 0 0 1-2.5c-.9-1.6.9-3.3 2.4-2.4a1.7 1.7 0 0 0 2.6-1.1Z"/><circle cx="12" cy="12" r="3"/></svg>',
  speaker: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H3v6h3l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/></svg>',
  listen: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 14v-2a8 8 0 0 1 16 0v2"/><rect x="3" y="13" width="4.5" height="7" rx="1.6"/><rect x="16.5" y="13" width="4.5" height="7" rx="1.6"/></svg>',
  practice: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h4l10.5-10.5a2.1 2.1 0 0 0-3-3L5 17z"/><path d="M13.5 8.5l3 3"/></svg>',
  expand: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>',
  close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>',
  cross: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M7 7l10 10M17 7 7 17"/></svg>',
  play: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.5v13l11-6.5z"/></svg>',
  pause: '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4.5" height="14" rx="1"/><rect x="13.5" y="5" width="4.5" height="14" rx="1"/></svg>',
  shuffle: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 3h5v5M4 20 21 3M21 16v5h-5M15 15l6 6M4 4l5 5"/></svg>',
  word: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="3"/><text x="12" y="16.5" text-anchor="middle" font-size="11" font-weight="700" fill="currentColor" stroke="none">あ</text></svg>',
  grammar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h16M4 12h10M4 17h13"/></svg>',
  speed1: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>',
  speed2: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 6l6 6-6 6M13 6l6 6-6 6"/></svg>',
  speed3: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 6l6 6-6 6M9 6l6 6-6 6M16 6l6 6-6 6"/></svg>',
  prev: '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="5" y="5.5" width="2.5" height="13" rx="0.8"/><path d="M19 5.5v13l-10-6.5z"/></svg>',
  next: '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="16.5" y="5.5" width="2.5" height="13" rx="0.8"/><path d="M5 5.5v13l10-6.5z"/></svg>',
  flame: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21c4 0 6.5-2.7 6.5-6.3 0-3.6-2.6-5.6-3.8-9.2-.3 2-1.3 3.4-2.6 4.2.2-2.7-1-5.4-3.4-6.7.2 3-1.5 4.6-2.8 6.4A7.2 7.2 0 0 0 5.5 14.7C5.5 18.3 8 21 12 21Z"/></svg>',
  chart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>',
  spark: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/></svg>',
  back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 6l-6 6 6 6"/></svg>',
  mail: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5.5" width="18" height="13" rx="2"/><path d="m3.6 7 8.4 6.4L20.4 7"/></svg>',
  furi: '<span class="ico-furi" aria-hidden="true"><ruby>字<rt>じ</rt></ruby></span>',
  door: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6.5 21V4.8A1.8 1.8 0 0 1 8.3 3h7.4a1.8 1.8 0 0 1 1.8 1.8V21"/><path d="M4 21h16"/><circle cx="14.6" cy="12.4" r=".95" fill="currentColor" stroke="none"/></svg>',
  wave: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12.5c1.6 0 2.4-1.6 4.5-1.6s2.9 1.6 4.5 1.6 2.4-1.6 4.5-1.6 2.9 1.6 4.5 1.6M3 17c1.6 0 2.4-1.6 4.5-1.6S10.4 17 12 17s2.4-1.6 4.5-1.6S19.4 17 21 17"/><path d="M6.5 8.2C7.6 5.6 10 4 12.8 4c1.7 0 3.2.6 4.2 1.6"/></svg>',
  bus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="4.5" y="3.5" width="15" height="14" rx="3"/><path d="M4.5 11h15M8 17.5V20M16 17.5V20"/><circle cx="8.3" cy="14.3" r=".6" fill="currentColor"/><circle cx="15.7" cy="14.3" r=".6" fill="currentColor"/></svg>',
  shop: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2.8 9.5 5.4 4.5h13.2l2.6 5z"/><path d="M5 9.5V20h14V9.5"/><path d="M7.5 9.5v4.6h9V9.5M10.5 9.5v4.6M13.5 9.5v4.6"/></svg>',   // 古道具屋: a shop front, its noren
  hanger: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M10 5.2a2 2 0 1 1 2 2v1"/><path d="M12 8.2 3.6 14.3a1 1 0 0 0 .6 1.8h15.6a1 1 0 0 0 .6-1.8z"/></svg>',
  dice: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="3.5"/><circle cx="9" cy="9" r="1.1" fill="currentColor"/><circle cx="15" cy="9" r="1.1" fill="currentColor"/><circle cx="9" cy="15" r="1.1" fill="currentColor"/><circle cx="15" cy="15" r="1.1" fill="currentColor"/></svg>',
  turn: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 12a8 8 0 1 1-2.34-5.66"/><path d="M20 4v5h-5"/></svg>',
  arrange: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5.5 11V8.5a3 3 0 0 1 3-3h7a3 3 0 0 1 3 3V11"/><path d="M3 12.5a2 2 0 0 1 4 0V14h10v-1.5a2 2 0 0 1 4 0V16a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M6 18v1.5M18 18v1.5"/></svg>'
};
function icon(name) { return ICONS[name] || ''; }

// ---------- toast ----------
let toastTimer = null;
function toast(msg, ms = 2600) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), ms);
}
