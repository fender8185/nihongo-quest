// Matching Waller list rows against the app's built-in words, and normalising grammar patterns
// (docs/superpowers/plans/2026-10-31-curriculum-outline.md, Task 2).

const KANA = /^[ぁ-ゖァ-ヺー・ゝゞヽヾ]+$/;
function isKana(s) { return KANA.test(String(s || '')); }

const strip = (s) => String(s || '').replace(/[〜～~\s　]/g, '');
const noSuru = (s) => (s.length > 2 ? s.replace(/する$/, '') : s);

// Waller's reading column: half-width (…) holds optional okurigana (kept); full-width （…） holds a note such as （感）,
// sometimes cut off before its closing bracket (dropped)
function cleanReading(r) {
  return strip(r).replace(/（[^）]*(）|$)/g, '').replace(/\(([^)]*)\)/g, '$1').replace(/・/g, '');
}

// the spellings a Waller word stands for, each with the reading that goes with it
function forms(word, reading = '') {
  const w = strip(word); const r = cleanReading(reading);
  const out = [];
  const add = (s, rr) => { if (s && !out.some(([x]) => x === s)) out.push([s, rr]); };
  const base = /^[おご]・/.test(w)   // お・金持ち: the お is optional
    ? [[w.replace('・', ''), r], [w.slice(2), r.replace(/^[おご]/, '')]]
    : [[w.replace(/・/g, ''), r]];
  for (const [s, rr] of base) {
    if (/\([^)]*\)/.test(s)) {   // あたたか(い): with and without the bracketed okurigana
      add(s.replace(/\(([^)]*)\)/g, '$1'), rr);
      add(s.replace(/\([^)]*\)/g, ''), rr.replace(/\([^)]*\)$/, ''));
    } else add(s, rr);
  }
  for (const [s, rr] of [...out]) if (s.startsWith('御')) { add('ご' + s.slice(1), rr); add('お' + s.slice(1), rr); }
  return out;
}
function spellings(word) { return forms(word).map(([s]) => s); }

function buildAppIndex(vocab) {
  const byForm = new Map(); const byReading = new Map();
  const push = (m, k, e) => { if (!k) return; if (!m.has(k)) m.set(k, []); if (!m.get(k).includes(e)) m.get(k).push(e); };
  for (const v of vocab) {
    const w = strip(v.w); const r = noSuru(cleanReading(v.r));
    const e = { id: v.id, lv: v.lv, w: noSuru(w), r, kana: isKana(noSuru(w)) };
    push(byForm, w, e); push(byForm, noSuru(w), e);
    push(byReading, r, e);
  }
  return { byForm, byReading };
}

// in-app: the app has this word; variant: maybe the same word in another spelling or reading (a person decides); null: new
function matchWord(index, word, reading) {
  const pairs = forms(word, reading).map(([s, r]) => [noSuru(s), noSuru(r || (isKana(s) ? s : ''))]);
  const hit = (status, e) => ({ status, app: { id: e.id, lv: e.lv } });
  for (const [s, r] of pairs) {   // 1. same spelling and reading
    const e = (index.byForm.get(s) || []).find(x => !x.r || !r || x.r === r);
    if (e) return hit('in-app', e);
  }
  for (const [s] of pairs) {   // 2. same spelling, another reading
    const e = (index.byForm.get(s) || [])[0];
    if (e) return hit('variant', e);
  }
  for (const [s] of pairs) {   // 3. a kana word that is an app word's reading
    const e = isKana(s) && (index.byReading.get(s) || [])[0];
    if (e) return hit('in-app', e);
  }
  for (const [, r] of pairs) {   // 4. the same reading, written in kana in the app
    const e = (index.byReading.get(r) || []).find(x => x.kana);
    if (e) return hit('in-app', e);
  }
  for (const [s, r] of pairs) {   // 5. the same reading and first character: okurigana spelled differently
    const e = (index.byReading.get(r) || []).find(x => x.w[0] === s[0]);
    if (e) return hit('variant', e);
  }
  return { status: null };
}

// a grammar pattern reduced to what identifies it across lists: no tildes, spaces, bracketed notes or N+ / V+ prefixes
function grammarKey(pattern) {
  return strip(pattern).replace(/（[^）]*(）|$)/g, '').replace(/\([^)]*\)/g, '').replace(/^[NV]\+/, '');
}

module.exports = { isKana, spellings, cleanReading, buildAppIndex, matchWord, grammarKey };
