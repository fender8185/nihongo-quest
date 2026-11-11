'use strict';
// Japanese conjugation engine shared by the app and the content validator.
// Readings for 来る are written inline as 来[こ]ない so the UI can render ruby.
(function (root) {
  const ROWS = {
    'う': ['わ', 'い', 'う', 'え', 'お'], 'く': ['か', 'き', 'く', 'け', 'こ'], 'ぐ': ['が', 'ぎ', 'ぐ', 'げ', 'ご'],
    'す': ['さ', 'し', 'す', 'せ', 'そ'], 'つ': ['た', 'ち', 'つ', 'て', 'と'], 'ぬ': ['な', 'に', 'ぬ', 'ね', 'の'],
    'ぶ': ['ば', 'び', 'ぶ', 'べ', 'ぼ'], 'む': ['ま', 'み', 'む', 'め', 'も'], 'る': ['ら', 'り', 'る', 'れ', 'ろ']
  };
  const TE = { 'う': 'って', 'つ': 'って', 'る': 'って', 'む': 'んで', 'ぶ': 'んで', 'ぬ': 'んで', 'く': 'いて', 'ぐ': 'いで', 'す': 'して' };
  const HONORIFIC_I = new Set(['いらっしゃる', 'おっしゃる', 'くださる', 'なさる', 'ござる']);

  function stripReading(s) {
    return String(s || '').replace(/\[[^\]]*\]/g, '').replace(/（[ぁ-ゖー]+）/g, '').trim();
  }
  // Comparison key: a bracketed reading replaces the kanji run before it (来[こ]ない → こない).
  function normJa(s) {
    return String(s || '').replace(/[\u4e00-\u9fff々〆ヶ]+\[([ぁ-ゖー]+)\]/g, '$1').replace(/（[ぁ-ゖー]+）/g, '').replace(/\s+/g, '').trim();
  }

  // Basic stems for a verb. Returns null for unknown shapes.
  function verbStems(dict, g) {
    const d = String(dict || '').trim();
    if (!d) return null;
    if (g === 's' || (g !== 'k' && /する$/.test(d))) {
      const p = d.slice(0, -2);
      return { kind: 's', p, a: p + 'し', i: p + 'し', e: p + 'すれ', o: p + 'しよう', te: p + 'して', ta: p + 'した',
        pot: p + 'でき', pass: p + 'さ', caus: p + 'さ' };
    }
    if (g === 'k' || d === '来る' || d === 'くる') {
      const k = d.startsWith('来') ? '来' : '';
      const r = (kana) => k ? `来[${kana}]` : kana;
      return { kind: 'k', a: r('こ'), i: r('き'), e: r('く') + 'れ', o: r('こ') + 'よう', te: r('き') + 'て', ta: r('き') + 'た',
        pot: r('こ') + 'られ', pass: r('こ') + 'られ', caus: r('こ') + 'させ', dict: r('く') + 'る' };
    }
    if (g === '1') {
      if (!d.endsWith('る')) return null;
      const s = d.slice(0, -1);
      return { kind: '1', a: s, i: s, e: s + 'れ', o: s + 'よう', te: s + 'て', ta: s + 'た', pot: s + 'られ', pass: s + 'られ', caus: s + 'させ' };
    }
    const last = d.slice(-1);
    const row = ROWS[last];
    if (!row) return null;
    const s = d.slice(0, -1);
    let te = s + TE[last];
    let ta = te.replace(/て$/, 'た').replace(/で$/, 'だ');
    if (d === '行く' || d === 'いく') { te = s + 'って'; ta = s + 'った'; }
    let i = s + row[1];
    if (HONORIFIC_I.has(d)) i = s + 'い';
    return { kind: '5', a: s + row[0], i, e: s + row[3], o: s + row[4] + 'う', te, ta,
      pot: s + row[3], pass: s + row[0] + 'れ', caus: s + row[0] + 'せ', last };
  }

  // form keys documented in SPEC.md
  function conjVerb(dict, g, form) {
    const st = verbStems(dict, g);
    if (!st) return null;
    const isAru = (dict === 'ある');
    const dictForm = st.dict || dict;
    const nai = isAru ? '' : st.a; // ある → ない
    const potStem = st.kind === '5' ? st.pot : st.pot; // 書け / 食べられ / でき / 来られ
    const passStem = st.kind === 's' ? st.p + 'され' : (st.kind === '5' ? st.pass : st.pass);
    const causStem = st.kind === 's' ? st.p + 'させ' : (st.kind === '5' ? st.caus : st.caus);
    const map = {
      dict: dictForm,
      stem: st.i,
      masu: st.i + 'ます', masen: st.i + 'ません', mashita: st.i + 'ました', masendeshita: st.i + 'ませんでした', mashou: st.i + 'ましょう',
      te: st.te, ta: st.ta, tara: st.ta + 'ら', tari: st.ta + 'り',
      nai: nai + 'ない', nakatta: nai + 'なかった', naide: nai + 'ないで', nakereba: nai + 'なければ', nakutemo: nai + 'なくても', nakute: nai + 'なくて',
      ba: st.e + 'ば',
      pot: potStem + 'る', potmasu: potStem + 'ます', potmasen: potStem + 'ません', potmashita: potStem + 'ました', potnai: potStem + 'ない', potte: potStem + 'て',
      vol: st.o,
      pass: passStem + 'る', passmasu: passStem + 'ます', passmashita: passStem + 'ました', passte: passStem + 'て', passnai: passStem + 'ない',
      caus: causStem + 'る', causmasu: causStem + 'ます', causmashita: causStem + 'ました', causte: causStem + 'て', causnai: causStem + 'ない',
      imp: st.kind === '5' ? st.e : (st.kind === '1' ? st.i + 'ろ' : (st.kind === 's' ? st.p + 'しろ' : '来[こ]い')),
      kinshi: dictForm + 'な'
    };
    if (st.kind === '5') {
      map.pot = st.pot + 'る';
      map.vol = st.o;
      // 使役受身: 書かされる (not for す-row), 話させられる
      const cp = st.last === 'す' ? st.caus + 'られ' : (st.a + 'され');
      map.causpass = cp + 'る'; map.causpassmashita = cp + 'ました';
    } else if (st.kind === '1') {
      map.causpass = st.i + 'させられる'; map.causpassmashita = st.i + 'させられました';
    } else if (st.kind === 's') {
      map.causpass = st.p + 'させられる'; map.causpassmashita = st.p + 'させられました';
    } else {
      map.causpass = '来[こ]させられる'; map.causpassmashita = '来[こ]させられました';
    }
    if (st.kind === 'k') {
      map.vol = '来[こ]よう';
    }
    return map[form] !== undefined ? map[form] : null;
  }

  function conjAdj(word, t, form) {
    const w = String(word || '').trim();
    if (t === 'i') {
      if (!w.endsWith('い')) return null;
      const s = (w === 'いい') ? 'よ' : (w.endsWith('いい') && w.length > 2 ? w.slice(0, -2) + 'よ' : w.slice(0, -1));
      const souStem = (w === 'いい' || w.endsWith('いい')) ? s + 'さ' : (w === 'ない' ? 'なさ' : s);
      const m = {
        dict: w, stem: s, kunai: s + 'くない', katta: s + 'かった', kunakatta: s + 'くなかった', kute: s + 'くて', ku: s + 'く',
        kereba: s + 'ければ', kattara: s + 'かったら', kunakereba: s + 'くなければ', sou: souStem + 'そう', sugiru: s + 'すぎる',
        kunaidesu: s + 'くないです', kattadesu: s + 'かったです', kunakattadesu: s + 'くなかったです', kuarimasen: s + 'くありません'
      };
      return m[form] !== undefined ? m[form] : null;
    }
    if (t === 'na') {
      const m = {
        dict: w, da: w + 'だ', na: w + 'な', de: w + 'で', ni: w + 'に', desu: w + 'です', deshita: w + 'でした', datta: w + 'だった',
        janai: w + 'じゃない', janakatta: w + 'じゃなかった', jaarimasen: w + 'じゃありません', jaarimasendeshita: w + 'じゃありませんでした',
        nara: w + 'なら', sou: w + 'そう', sugiru: w + 'すぎる', datara: w + 'だったら'
      };
      return m[form] !== undefined ? m[form] : null;
    }
    return null;
  }

  function uniqPush(arr, v, answer) {
    if (!v) return;
    const n = normJa(v);
    if (!n || n === normJa(answer)) return;
    if (arr.some(x => normJa(x) === n)) return;
    arr.push(v);
  }

  // Plausible wrong options for a verb form: invalid learner errors first,
  // other real forms of the same verb only when needed to reach three.
  function verbDistractors(dict, g, form, answer) {
    const st = verbStems(dict, g);
    if (!st) return [];
    const alt = (f) => conjVerb(dict, g, f);
    const wrongGroup = (st.kind === '5' && dict.endsWith('る')) ? '1' : (st.kind === '1' ? '5' : null);
    const wg = (f) => (wrongGroup ? conjVerb(dict, wrongGroup, f) : null);
    const base = dict.slice(0, -1);
    const K = (r, tail) => `来[${r}]` + tail;
    const errors = [];
    const others = [];
    // Split a derived form into a known stem and its tail, e.g. 書かなかった → 書か + なかった
    const tailOf = (full, stemPart) => (full && stemPart && full.startsWith(stemPart) ? full.slice(stemPart.length) : '');

    if (['te', 'ta', 'tara', 'tari'].includes(form)) {
      const conv = (x) => {
        if (form === 'te') return x;
        const t = x.replace(/て$/, 'た').replace(/で$/, 'だ');
        return t + ({ ta: '', tara: 'ら', tari: 'り' })[form];
      };
      if (st.kind === '5') {
        ['って', 'んで', 'いて', 'して'].forEach(e => errors.push(conv(base + e)));
        errors.push(conv(st.i + 'て'));
      } else if (st.kind === '1') {
        errors.push(conv(st.i + 'って'), conv(st.i + 'んで'), conv(st.i + 'いて'));
      } else if (st.kind === 's') {
        errors.push(conv(st.p + 'すて'), conv(st.p + 'しって'), conv(st.p + 'さて'));
      } else {
        errors.push(conv(K('く', 'て')), conv(K('こ', 'て')), conv(K('き', 'って')));
      }
      if (wg(form)) errors.unshift(wg(form));
      others.push(alt('dict'), alt('nai'));
    } else if (/^na/.test(form)) {
      const tail = dict === 'ある' ? alt(form) : tailOf(alt(form), st.a);
      if (st.kind === '5') {
        if (st.last === 'う') errors.push(base + 'あ' + tail);
        errors.push(dict + tail, st.i + tail, base + ROWS[st.last][4] + tail);
        if (dict === 'ある') errors.unshift('あら' + tail);
      } else if (st.kind === '1') {
        errors.push(st.i + 'ら' + tail, dict + tail, st.i + 'り' + tail);
      } else if (st.kind === 's') {
        errors.push(st.p + 'さ' + tail, st.p + 'する' + tail, st.p + 'す' + tail);
      } else {
        errors.push(K('き', tail), K('く', tail), K('こ', 'ら' + tail));
      }
      if (wg(form)) errors.unshift(wg(form));
      others.push(alt('te'));
    } else if (/^pot/.test(form)) {
      const tail = tailOf(alt(form), alt('pot').slice(0, -1));
      if (st.kind === '5') {
        errors.push(st.i + 'られ' + tail, st.i + 'れ' + tail);
        others.push(st.pass + tail); // passive (real form, classic confusion)
      } else if (st.kind === '1') {
        errors.push(st.i + 'れ' + tail, dict + 'れ' + tail, st.i + 'らせ' + tail);
        others.push(st.caus + tail);
      } else if (st.kind === 's') {
        errors.push(st.p + 'しられ' + tail, st.p + 'すれ' + tail);
        others.push(st.p + 'され' + tail);
      } else {
        errors.push(K('き', 'られ' + tail), K('こ', 'れ' + tail), K('く', 'られ' + tail));
      }
      if (wg(form)) errors.unshift(wg(form));
    } else if (form === 'vol') {
      if (st.kind === '5') errors.push(dict + 'よう', st.i + 'よう', st.e + 'よう');
      else if (st.kind === '1') errors.push(st.i + 'ろう', st.i + 'おう', dict + 'よう');
      else if (st.kind === 's') errors.push(st.p + 'しろう', st.p + 'すよう', st.p + 'そう');
      else errors.push(K('き', 'よう'), K('く', 'ろう'), K('こ', 'おう'));
      if (wg(form)) errors.unshift(wg(form));
      others.push(alt('ba'));
    } else if (/^pass/.test(form)) {
      const passStem = alt('pass').slice(0, -1);
      const tail = tailOf(alt(form), passStem);
      if (st.kind === '5') {
        errors.push(st.i + 'られ' + tail, st.e + 'られ' + tail);
        others.push(st.caus + tail);
      } else if (st.kind === '1') {
        errors.push(st.i + 'れ' + tail, st.i + 'らせ' + tail);
        others.push(st.caus + tail);
      } else if (st.kind === 's') {
        errors.push(st.p + 'しられ' + tail, st.p + 'すられ' + tail);
        others.push(st.p + 'させ' + tail);
      } else {
        errors.push(K('き', 'られ' + tail), K('く', 'られ' + tail));
        others.push(K('こ', 'させ' + tail));
      }
      if (wg(form)) errors.unshift(wg(form));
    } else if (/^causpass/.test(form)) {
      const tail = form === 'causpass' ? 'る' : 'ました';
      if (st.kind === '5') errors.push(st.i + 'させられ' + tail, st.a + 'させられ' + tail.replace('る', 'る'));
      else if (st.kind === '1') errors.push(st.i + 'らせられ' + tail, st.i + 'させれ' + tail);
      else if (st.kind === 's') errors.push(st.p + 'しさせられ' + tail, st.p + 'させれ' + tail);
      else errors.push(K('き', 'させられ' + tail), K('こ', 'させれ' + tail));
      others.push(alt(form === 'causpass' ? 'pass' : 'passmashita'), alt(form === 'causpass' ? 'caus' : 'causmashita'));
    } else if (/^caus/.test(form)) {
      const tail = tailOf(alt(form), alt('caus').slice(0, -1));
      if (st.kind === '5') errors.push(st.i + 'させ' + tail, st.a + 'させ' + tail);
      else if (st.kind === '1') errors.push(st.i + 'らせ' + tail, st.i + 'せ' + tail);
      else if (st.kind === 's') errors.push(st.p + 'しさせ' + tail, st.p + 'せ' + tail);
      else errors.push(K('き', 'させ' + tail), K('こ', 'せ' + tail));
      if (wg(form)) errors.unshift(wg(form));
      others.push(alt(form.replace('caus', 'pass')));
    } else if (form === 'ba') {
      if (st.kind === '5') errors.push(dict + 'ば', st.i + 'ば', st.a + 'ば');
      else if (st.kind === '1') errors.push(dict + 'ば', st.i + 'ば', st.i + 'らば');
      else if (st.kind === 's') errors.push(st.p + 'するば', st.p + 'しれば', st.p + 'せば');
      else errors.push(K('く', 'るば'), K('き', 'れば'), K('こ', 'れば'));
      if (wg(form)) errors.unshift(wg(form));
    } else if (/^mas/.test(form) || form === 'stem') {
      const tail = form === 'stem' ? '' : tailOf(alt(form), st.i);
      if (st.kind === '5') {
        errors.push(st.a + tail, dict + tail);
        if (st.last === 'く' || st.last === 'ぐ') errors.push(base + 'い' + tail); else errors.push(base + ROWS[st.last][4] + tail);
      } else if (st.kind === '1') {
        errors.push(st.i + 'り' + tail, dict + tail, st.i + 'ら' + tail);
      } else if (st.kind === 's') {
        errors.push(st.p + 'す' + tail, st.p + 'さ' + tail, st.p + 'する' + tail);
      } else {
        errors.push(K('こ', tail), K('く', tail), K('く', 'り' + tail));
      }
      if (wg(form)) errors.unshift(wg(form));
    } else if (form === 'imp') {
      if (st.kind === '5') errors.push(st.e + 'ろ', st.i + 'ろ', dict + 'ろ');
      else if (st.kind === '1') errors.push(st.i + 'れ', dict + 'ろ', st.i + 'よ');
      else if (st.kind === 's') errors.push(st.p + 'せろ', st.p + 'すれ', st.p + 'しれ');
      else errors.push(K('き', 'ろ'), K('く', 'れ'), K('こ', 'よ'));
    } else if (form === 'kinshi') {
      errors.push(st.i + 'な', alt('nai') + 'な');
      others.push(alt('imp'));
    } else if (form === 'dict') {
      // dictionary form inside e.g. 〜前に / 〜ことができる / 〜つもり
      if (st.kind === '5') errors.push(st.i + 'る', st.a + 'る');
      else if (st.kind === '1') errors.push(st.i + 'りる', st.i + 'う');
      else if (st.kind === 's') errors.push(st.p + 'しる', st.p + 'す');
      others.push(alt('ta'), alt('te'), alt('masu'));
    }
    const out = [];
    errors.forEach(x => uniqPush(out, x, answer));
    if (out.length < 3) others.forEach(x => uniqPush(out, x, answer));
    // Never offer another *valid* reading of the same dictionary form in the potential/passive overlap of ichidan
    return out;
  }

  function adjDistractors(word, t, form, answer) {
    const out = [];
    const w = word;
    if (t === 'i') {
      const s = conjAdj(w, 'i', 'stem');
      const cand = {
        kunai: [w + 'じゃない', w + 'ない', s + 'じゃない', s + 'くある'],
        kunaidesu: [w + 'じゃないです', w + 'ないです', s + 'くないでした'],
        kuarimasen: [w + 'じゃありません', w + 'ありません', s + 'くないません'],
        katta: [w + 'でした', s + 'でした', w + 'かった', s + 'くてでした'],
        kattadesu: [w + 'でした', s + 'でした', s + 'かったでした', w + 'だったです'],
        kunakatta: [w + 'じゃなかった', s + 'くないでした', s + 'かったない', w + 'なかった'],
        kunakattadesu: [w + 'じゃなかったです', s + 'くないでした', s + 'くありませんでした', w + 'なかったです'],
        kute: [w + 'で', s + 'で', s + 'かって', s + 'くで'],
        ku: [w + 'に', s + 'に', s + 'くて', w + 'く'],
        kereba: [w + 'ば', s + 'けば', s + 'かったらば', w + 'なら'],
        kattara: [w + 'たら', s + 'くたら', w + 'だったら'],
        sou: [w + 'そう', s + 'くそう', s + 'さそう', w.slice(0, -1) + 'さそう', s + 'くてそう'],
        sugiru: [w + 'すぎる', s + 'くすぎる', s + 'さすぎる'],
        dict: [s + 'くて', s + 'く', w + 'な']
      }[form] || [];
      if (w === 'いい') cand.unshift(...({ kunai: ['いくない'], katta: ['いかった'], kunakatta: ['いくなかった'], kute: ['いくて'], kereba: ['いければ'], sou: ['いさそう', 'いいそう'] }[form] || []));
      cand.forEach(x => uniqPush(out, x, answer));
    } else if (t === 'na') {
      const cand = {
        de: [w + 'くて', w + 'に', w + 'なで', w + 'だで'],
        na: [w + 'の', w + 'に', w + 'い', w + 'だ'],
        ni: [w + 'く', w + 'で', w + 'な', w + 'の'],
        deshita: [w + 'かったです', w + 'なでした', w + 'だったでした', w + 'くでした'],
        datta: [w + 'かった', w + 'なだった', w + 'でした'],
        janai: [w + 'くない', w + 'ない', w + 'なじゃない'],
        janakatta: [w + 'くなかった', w + 'じゃないでした', w + 'ないでした'],
        jaarimasen: [w + 'くありません', w + 'ありません', w + 'じゃないません'],
        jaarimasendeshita: [w + 'くありませんでした', w + 'じゃないでした', w + 'でしたじゃありません'],
        nara: [w + 'だなら', w + 'なら', w + 'たら', w + 'と'],
        sou: [w + 'なそう', w + 'だそう', w + 'さそう'],
        sugiru: [w + 'なすぎる', w + 'くすぎる', w + 'さすぎる'],
        desu: [w + 'なです', w + 'いです', w + 'でした'],
        da: [w + 'な', w + 'の', w + 'です'],
        datara: [w + 'たら', w + 'なら', w + 'だら']
      }[form] || [];
      cand.forEach(x => uniqPush(out, x, answer));
    }
    return out;
  }

  const api = { stripReading, normJa, verbStems, conjVerb, conjAdj, verbDistractors, adjDistractors };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.JConj = api;
})(this);
