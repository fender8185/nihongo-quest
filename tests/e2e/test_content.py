"""2026-10-29: 聽力、閱讀答對後久久才再出；N5 聽力／閱讀題庫擴充。"""
import json, os, subprocess, sys, time
sys.path.insert(0, os.path.dirname(__file__))
from cdp import Browser
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
PORT = 8793
URL = f"http://127.0.0.1:{PORT}/"
ORDER_N3 = '現実表要期平記能支解情定加判利論感確常優適幸対関経数面組信直演位流過状収害想然種命様達単苦王覚調化務取報活共得告在求格職断石神助限商伝景望観識候満師速完類頼許等居欠刻恐暮戦性制続指点原資際反認参件任次増示式容必置疑局球役費由備宅配労追末察横値突積他客存殺責捕給婦寄余宿抜罪婚絶老更抱犯願越痛列迷悲吸誤煙眠政選和受権済勝係投果争談放与供構難違警訪念例退守福非深申財呼程路科処否登易座破除迎愛富未舞亡返険途精静倒曲払勤遅雑招困息絵欲笑束夢閉折到盗陽貧怖頂髪才偶偉米治側官打規育葉形落負渡若港良敗号降危辞因馬彼込妻船努散喜浮押庭徒賛戻互似探逃遊君緒草酒掛寝御忘雪吹娘慣窓昔怒泳祖杯疲皆箱忙靴恥猫幾'   # curriculum/n3.json kanji, by how often the N3 words use them
READY = "typeof state === 'object' && !!state.updatedAt && typeof speakScript === 'function'"

def ev(b, js, pre=()):
    return b.run([("nav", URL), ("wait", READY)] + list(pre) + [("eval", js)])[-1]

def test_listening_and_reading_wait_a_month_then_a_season_then_half_a_year(b):
    js = """(() => { const t = todayStr(); const keep = JSON.stringify(state.srs); const out = {};
      ['l', 'r'].forEach(k => { const it = (k === 'l' ? REG.listen : REG.read)[0]; delete state.srs[it.key];
        const days = []; for (let i = 0; i < 4; i++) { const r = srsAnswer(it.key, true).rec; days.push(daysBetween(t, r.due)); r.last = addDays(t, -1); }
        const miss = srsAnswer(it.key, false).rec; days.push(daysBetween(t, miss.due));
        out[k] = days; });
      state.srs = JSON.parse(keep); saveState(); return JSON.stringify(out); })()"""
    r = json.loads(ev(b, js))
    assert r == {'l': [30, 90, 180, 180, 7], 'r': [30, 90, 180, 180, 7]}, r   # 1.0.15: a miss waits a week, not a day

def test_every_n5_listening_and_reading_item_has_furigana_on_every_kanji(b):
    js = """(() => { const bad = []; const bare = (t) => furi(String(t || '')).replace(/<ruby>.*?<\\/ruby>/g, '').match(/[一-鿿々〆ヶ]+/g) || [];
      REG.listen.filter(x => x.lv === 'N5').forEach(x => { const b = bare([x.script, x.q, x.line].concat(x.op).filter(Boolean).join('\\n')); if (b.length) bad.push(x.id + ':' + b.join(' ')); });
      REG.read.filter(x => x.lv === 'N5').forEach(x => { const b = bare([x.passage, x.q].concat(x.op).join('\\n')); if (b.length) bad.push(x.id + ':' + b.join(' ')); });
      return JSON.stringify(bad); })()"""
    r = json.loads(ev(b, js))
    assert r == [], r

def test_the_n5_bank_has_the_added_listening_and_reading_items(b):
    js = """JSON.stringify({ l: REG.listen.filter(x => x.lv === 'N5').length, r: REG.read.filter(x => x.lv === 'N5').length,
      lt: ['dialog', 'resp', 'scene'].map(t => REG.listen.filter(x => x.lv === 'N5' && x.t === t).length),
      units: ['m1', 'm2', 'm3', 'm4', 'm5', 'm6'].map(u => [REG.listen.filter(x => x.u === u).length, REG.read.filter(x => x.u === u).length]),
      ok: REG.listen.concat(REG.read).every(x => x.op.includes(x.a) && new Set(x.op).size === x.op.length && x.why),
      ids: new Set(REG.listen.concat(REG.read).map(x => x.id)).size === REG.listen.length + REG.read.length })"""
    r = json.loads(ev(b, js))
    assert r['l'] >= 270 and r['r'] >= 125, r          # 70 + ~200 listening, 25 + ~100 reading at N5
    assert all(l >= 40 and rd >= 18 for l, rd in r['units']), r   # spread over 第 1–12 週
    assert r['ok'] and r['ids'], r

# ---- 1.0.16: 第 0 週 (m0) — 20 kana-only items on five points ----
WEEK0_PTS = {'AはBです・ではありません': 1, '〜ですか・はい／いいえ': 1, 'こそあど': 2, 'も（也）': 2, 'は・へ・を 的唸法': 3}

def test_week0_items_are_kana_only_and_cover_five_points(b):
    js = """(() => { const G = REG.grammar.filter(g => g.u === 'm0'); const ja = (g) => (g.t === 'meaning' ? [g.jp] : [g.jp, g.a].concat(g.op)).filter(Boolean).join(' ');   // a meaning item's answer and options are Chinese
      const words = new Set(REG.vocab.map(v => v.w)); const gen = new Set(cloudAudioTexts().map(x => x.text)); const full = (g) => g.t === 'choice' ? g.jp.replace(/（[^）]*）/, g.a) : g.jp;
      return JSON.stringify({ n: G.length, pts: G.reduce((m, g) => (m[g.pt] = (m[g.pt] || 0) + 1, m), {}), secs: G.map(g => [g.pt, g.sec]),
        kanji: G.filter(g => /[一-龯々]/.test(ja(g))).map(g => g.id), kata: [...new Set(G.flatMap(g => ja(g).match(/[ァ-ヶー]{2,}/g) || []))].filter(w => !words.has(w)),
        dupFull: G.length - new Set(G.map(full)).size, built: G.filter(g => { const q = makeQuestion(g, {}); return q && q.options.length === 4; }).length,
        fmts: G.filter(g => g.t === 'choice').every(g => ['g-choice', 'g-meaning'].every(f => makeGrammarQuestion(g, { forceFmt: f }))),
        inGen: G.filter(g => !gen.has(ttsText(full(g)))).map(g => g.id) }); })()"""
    r = json.loads(ev(b, js))
    assert r['n'] == 20 and r['pts'] == {k: 4 for k in WEEK0_PTS}, r
    assert all(sec == WEEK0_PTS[pt] for pt, sec in r['secs']), r
    assert r['kanji'] == [] and r['kata'] == [] and r['dupFull'] == 0, r
    assert r['built'] == 20 and r['fmts'] and r['inGen'] == [], r

# ---- 1.0.23: 選正確句 is gone. The written items left the bank; week 0's five, whose options differed in one slot, became
# fill-ins with the same full sentence; a fill-in item is asked as 填空 or 句意 only; an AI item of that type is not taken ----
WEEK0_FILLS = {'m0-4': ['それは ノート（　）。', 'ではありません', ['ではありません', 'ではです', 'ありません', 'でわありません'], 'それは ノートではありません。'],
               'm0-16': ['これ（　） テレビです。', 'も', ['も', 'もは', 'はも', 'を'], 'これも テレビです。'],
               'm0-17': ['こちら（　） どうぞ。', 'へ', ['へ', 'え', 'わ', 'お'], 'こちらへ どうぞ。'],
               'm0-18': ['これ（　） ください。', 'を', ['を', 'お', 'わ', 'え'], 'これを ください。'],
               'm0-19': ['ここ（　） ホテルです。', 'は', ['は', 'わ', 'を', 'お'], 'ここは ホテルです。']}

def test_sentence_choice_is_gone_and_week0_keeps_its_five_as_fill_ins(b):
    js = """(() => { const G = REG.grammar; const t = todayStr(); const seen = new Set();
      G.filter(g => (g.t || 'choice') === 'choice').slice(0, 300).forEach(g => { state.srs[g.key] = { b: 3, due: t, n: 3, ok: 3, ng: 0, s: 6, d: 5, last: addDays(t, -6), gf: { 'g-choice': [3, 0] } };
        for (let i = 0; i < 4; i++) { const q = makeQuestion(g, {}); if (q) seen.add(q.fmt); } delete state.srs[g.key]; });
      const w0 = Object.fromEntries(Object.keys(__W0__).map(id => { const g = G.find(x => x.id === id); return [id, { t: g.t, rest: [g.jp, g.a, g.op, makeGrammarQuestion(g, { forceFmt: 'g-choice' }).fullJp] }]; }));
      const ai = validAiGrammar({ t: 'correct', op: ['これは ペンです。', 'これを ペンです。', 'これに ペンです。', 'これで ペンです。'], a: 'これは ペンです。', zh: '這是筆。', why: '主題用「は」。', pt: '主題' }, unitById('m1'));
      return JSON.stringify({ types: [...new Set(G.map(g => g.t || 'choice'))], data: DATA.GRAMMAR.filter(g => g.t === 'correct').length, seen: [...seen].sort(), w0, ai }); })()""".replace('__W0__', json.dumps(WEEK0_FILLS, ensure_ascii=False))
    r = json.loads(ev(b, js))
    assert 'correct' not in r['types'] and r['data'] == 0, r
    assert r['seen'] == ['g-choice', 'g-meaning'], r
    assert r['w0'] == {k: {'t': 'choice', 'rest': v} for k, v in WEEK0_FILLS.items()}, r['w0']
    assert r['ai'] is None, r

# 1.0.23: the records of the removed items go (schedule and notebook), and so do AI items of that type with theirs;
# week 0's five, now fill-ins, keep theirs, as does everything else
def test_records_of_removed_sentence_choice_items_are_dropped(b):
    js = """(() => { const rec = () => ({ b: 2, due: todayStr(), n: 3, ok: 3, ng: 0, s: 3, d: 5, last: todayStr() });
      const mk = (id, key) => ({ id, key, cat: '文法', prompt: id, answer: 'x', why: '', count: 1 });
      const s = normalizeState({ srs: { 'g:m1-18': rec(), 'g:m0-17': rec(), 'g:gd1': rec(), 'g:ai_c': rec(), 'g:ai_k': rec() },
        mistakes: [mk('a', 'g:m1-18'), mk('b', 'g:m0-17'), mk('c', 'g:gd1'), mk('d', 'g:ai_c'), mk('e', 'g:ai_k')],
        customGrammar: [{ id: 'ai_c', u: 'm1', t: 'correct', lv: 'N5', d: 2, pt: 'x', op: ['あ', 'い', 'う', 'え'], a: 'あ', zh: '', why: '', src: 'ai' },
          { id: 'ai_k', u: 'm1', t: 'choice', lv: 'N5', d: 2, pt: 'x', jp: 'これ（　）ペンです。', op: ['は', 'を', 'に', 'で'], a: 'は', zh: '', why: '', src: 'ai' }] });
      return JSON.stringify({ srs: Object.keys(s.srs).sort(), mistakes: s.mistakes.map(m => m.id), custom: s.customGrammar.map(g => g.id) }); })()"""
    r = json.loads(ev(b, js))
    assert r == {'srs': ['g:ai_k', 'g:gd1', 'g:m0-17'], 'mistakes': ['b', 'c', 'e'], 'custom': ['ai_k']}, r


# ---- 1.0.31: the N5／N4 gap words of the curriculum outline (curriculum/gaps-n5n4.json, less the 16 sharing a spelling) ----
def test_bank_has_the_gap_words_from_the_curriculum_outline(b):
    js = """(() => { const G = DATA.VOCAB.filter(v => /^n[54]g-\\d{3}$/.test(v.id) && Number(v.id.slice(4)) <= (v.id[1] === '5' ? 38 : 60));   /* the 98 of 1.0.31 */ const T = (lv) => (DATA.THEMES[lv] || []).map(t => t.c);
      const count = new Map(); DATA.VOCAB.filter(v => v.lv !== 'N3').forEach(v => count.set(jaPlain(v.w), (count.get(jaPlain(v.w)) || 0) + 1));   /* 1.0.33: an N3 word may share one (都 みやこ), a homograph */
      const reg = (v) => REG.byKey.get('v:' + v.id);
      const badMeaning = G.filter(v => (meaningOptions(reg(v)) || []).some(m => m !== v.m && zhOverlap(m, v.m))).map(v => v.w);
      const badRecall = G.filter(v => (recallOptions(reg(v)) || []).some(w => { const x = REG.vocab.find(y => y.builtin && y.w === w); return x && x.r === v.r; })).map(v => v.w);
      return JSON.stringify({ n5: G.filter(v => v.lv === 'N5').length, n4: G.filter(v => v.lv === 'N4').length,
        fields: G.filter(v => !(v.w && v.r && v.m && v.p && v.ex && v.exZh && v.ex2 && v.exZh2)).map(v => v.id),
        themes: G.filter(v => !T(v.lv).includes(v.c)).map(v => v.id), sameSpelling: G.filter(v => count.get(jaPlain(v.w)) > 1).map(v => v.w),
        badMeaning, badRecall }); })()"""
    r = json.loads(ev(b, js))
    assert r == {'n5': 38, 'n4': 60, 'fields': [], 'themes': [], 'sameSpelling': [], 'badMeaning': [], 'badRecall': []}, r

def test_settings_credit_the_jlpt_level_lists(b):
    js = "JSON.stringify({ html: settingsLook().includes('單字、漢字、文法點的 JLPT 等級參考 Jonathan Waller 的 JLPT Resources（tanos.co.uk，CC BY）。') })"
    r = json.loads(ev(b, js)); assert r['html'], r

# ---- 1.0.31 review: near-synonyms share a character, so neither is offered as the other's wrong answer ----
def test_near_synonym_greetings_never_offer_each_other(b):
    js = """(() => { const m = (w) => DATA.VOCAB.find(v => v.w === w).m;
      return JSON.stringify([zhOverlap(m('ええと'), m('さあ')), zhOverlap(m('ごめんください'), m('失礼します'))]); })()"""
    r = json.loads(ev(b, js)); assert r == [True, True], r

# ---- 1.0.31 review: the reading keys of DATA.FURI belong to no word, so mastering a word hides only its own readings ----
def test_mastering_a_word_hides_only_its_own_readings(b):
    js = """(() => { const t = todayStr(); const v = REG.vocab.find(x => x.id === 'n5g-038');   // 縦, the last N5 word added to the index
      state.srs[v.key] = { b: SRS_MASTERED, known: true, due: addDays(t, 60), n: 9, ok: 9, ng: 0, s: 60, d: 3, last: addDays(t, -1), intro: addDays(t, -90), f: { 'v-spell': [1, 0] } };
      const own = [...FURI_SRC].filter(([k, s]) => s === v.key).map(([k]) => k);
      const out = { own: knownCls('縦'), japan: knownCls('日本'), keys: own.length, hasJapan: own.includes('日本') };
      delete state.srs[v.key]; return JSON.stringify(out); })()"""
    r = json.loads(ev(b, js)); assert r['own'] == 'known' and r['japan'] == '' and not r['hasJapan'] and r['keys'] <= 2, r

# ---- 1.0.33 §5.5: a word sharing its spelling with another built-in word reads its own way ----
def test_a_same_spelling_word_reads_its_own_way(b):
    js = """(() => { DATA.VOCAB.push({ id: 'n5g-901', w: '四', r: 'し', m: '四（音讀）', p: 'n', lv: 'N5', c: '數量', ex: '{四}季の中で、春が一番好きです。', exZh: '四季裡最喜歡春天。', ex2: 'この{四}つの中から選んでください。', exZh2: '請從這四個裡面選。' });
      buildRegistry(); const v = REG.byKey.get('v:n5g-901'); const yon = REG.vocab.find(x => x.builtin && x.w === '四' && x.r === 'よん');
      const out = { ex: exampleHtml(v.ex, v.exZh, '', v).includes('<ruby>四<rt>し</rt></ruby>'), front: wordHtml(v).includes('<rt>し</rt>'), other: homographReadings(v),
        yon: homographReadings(yon), plain: homographReadings(REG.vocab.find(x => x.builtin && x.w === '学校')) };
      DATA.VOCAB.pop(); buildRegistry(); return JSON.stringify(out); })()"""
    r = json.loads(ev(b, js)); assert r == {'ex': True, 'front': True, 'other': ['よん'], 'yon': ['し'], 'plain': []}, r

def test_listen_meaning_has_no_same_reading_wrong_answer(b):
    js = """(() => { const v = REG.vocab.find(x => x.builtin && x.w === '締める'); const sh = REG.vocab.find(x => x.builtin && x.w === '閉める');
      let bad = 0; for (let i = 0; i < 200; i++) { const o = meaningOptions(v, true) || []; if (o.includes(sh.m)) bad++; } return JSON.stringify({ bad, both: Boolean(v && sh) }); })()"""
    r = json.loads(ev(b, js)); assert r == {'bad': 0, 'both': True}, r

def test_tomaru_forms_read_tomaru_and_yamu_forms_yamu(b):
    js = "JSON.stringify([furi('電車が止まりました。'), furi('雨が止みました。'), furi('車が止まらない。')])"
    r = json.loads(ev(b, js)); assert '<rt>と</rt>' in r[0] and '<rt>や</rt>' in r[1] and '<rt>と</rt>' in r[2], r

# ---- 1.0.33: the gap file's 16 same-spelling words; old sentences keep their readings ----
def test_bank_has_the_16_same_spelling_gap_words(b):
    js = """(() => { const G = DATA.VOCAB.filter(v => /^n5g-0(39|4\\d|5[01])$|^n4g-06[123]$/.test(v.id));
      const out = { n: G.length, ex: G.every(v => v.ex && v.exZh && v.ex2 && v.exZh2), homo: G.filter(v => !homographReadings(REG.byKey.get('v:' + v.id)).length).map(v => v.w),
        old: [furi('日本へ行きます。'), furi('何を食べますか。'), furi('明日は雨です。'), furi('私は学生です。')] };
      return JSON.stringify(out); })()"""
    r = json.loads(ev(b, js))
    assert r['n'] == 16 and r['ex'] and r['homo'] == [], r
    assert '<rt>にほん</rt>' in r['old'][0] and '<rt>なに</rt>' in r['old'][1] and '<rt>あした</rt>' in r['old'][2] and '<rt>わたし</rt>' in r['old'][3], r['old']

def test_same_spelling_words_show_their_own_reading_in_their_examples(b):
    js = """(() => { const get = (w, r) => REG.vocab.find(v => v.builtin && v.w === w && v.r === r);
      const rt = (v) => vocabExamples(v).map(e => exampleJpHtml(e.ex, v)).join(' ');
      const shi = rt(get('四', 'し')), ichi = rt(get('一日', 'いちにち')), wata = rt(get('私', 'わたくし')), nip = rt(get('日本', 'にっぽん'));
      return JSON.stringify({ shi: /<rt>し(がつ)?<\\/rt>/.test(shi) && !shi.includes('<rt>つき</rt>'), ichi: ichi.includes('<rt>いちにち</rt>'), wata: wata.includes('<rt>わたくし</rt>'), nip: nip.includes('<rt>にっぽん</rt>') }); })()"""
    r = json.loads(ev(b, js)); assert r == {'shi': True, 'ichi': True, 'wata': True, 'nip': True}, r

# ---- 1.0.33 review of part one ----
def test_hiding_a_card_does_not_change_how_sentences_read(b):
    js = """(() => { const keep = (state.hidden || []).slice(); const ids = ['n5c-001', 'n5b-137', 'n5b-146'];   // 行く いく, 私 わたし, 何 なに
      state.hidden = keep.concat(ids); buildRegistry();
      const out = [furi('昨日、学校へ行きました。'), furi('私は学生です。'), furi('何を食べますか。')];
      state.hidden = keep; buildRegistry(); return JSON.stringify(out); })()"""
    r = json.loads(ev(b, js))
    assert '<rt>い</rt>' in r[0] and '<rt>わたし</rt>' in r[1] and '<rt>なに</rt>' in r[2], r

def test_same_spelling_cards_keep_their_reading_in_cloze_recall_notebook_and_drills(b):
    js = """(() => { const get = (w, r) => REG.vocab.find(v => v.builtin && v.w === w && v.r === r);
      const ichi = get('一日', 'いちにち'), wata = get('私', 'わたくし');
      const cz = makeVocabQuestion(ichi, { forceFmt: 'v-cloze' }); const rc = makeVocabQuestion(wata, { forceFmt: 'v-recall' });
      const ans = (q) => optionHtml(q, q.options[q.answer]);
      return JSON.stringify({ fill: cz && cz.fillHtml.includes('いちにち'), clozeOpt: cz && ans(cz).includes('いちにち'), recallOpt: rc && ans(rc).includes('わたくし'),
        prompt: furi(makeVocabQuestion(wata, { forceFmt: 'v-meaning' }).mistakePrompt).includes('<rt>わたくし</rt>'),
        drill: drillVerbs().filter(v => (v.w === '行く' && v.r === 'ゆく') || (v.w === '開く' && v.r === 'ひらく')).length }); })()"""
    r = json.loads(ev(b, js)); assert r == {'fill': True, 'clozeOpt': True, 'recallOpt': True, 'prompt': True, 'drill': 0}, r

def test_every_conjugation_choice_has_a_label(b):
    js = "JSON.stringify(Object.values(CONJ_POOL).flat().filter(f => !FORM_LABEL[f]))"
    r = json.loads(ev(b, js)); assert r == [], r

# ---- 1.0.33: the N3 words of the curriculum outline ----
def test_bank_has_the_n3_words(b):
    js = """(() => { const N = DATA.VOCAB.filter(v => /^n3[a-z]-\\d{3}$/.test(v.id)); const th = new Set((DATA.THEMES.N3 || []).map(t => t.c));
      const seen = new Set(); const dup = N.filter(v => { const k = v.w + '|' + v.r; const d = seen.has(k); seen.add(k); return d; }).map(v => v.w);
      return JSON.stringify({ n: N.length, lv: N.every(v => v.lv === 'N3'), ex: N.filter(v => !(v.p && v.ex && v.exZh && v.ex2 && v.exZh2)).map(v => v.id),
        themes: N.filter(v => !th.has(v.c)).map(v => v.id), dup, level: courseLevels().includes('N3'),
        /* on its own card every kanji of an example has furigana (a homograph's mark reads the card's way, the rest the index's) */
        bare: REG.vocab.filter(v => v.builtin && /^n3[a-z]-/.test(v.id)).flatMap(v => [v.ex, v.ex2].map(e => exampleJpHtml(e, v).replace(/<ruby[^>]*>.*?<\\/ruby>/g, '').match(/[一-鿿々〆ヶ]+/g)).filter(Boolean).map(k => v.w + ':' + k.join(''))) }); })()"""
    r = json.loads(ev(b, js))
    assert r == {'n': 1432, 'lv': True, 'ex': [], 'themes': [], 'dup': [], 'level': True, 'bare': []}, r

def test_kanji_table_has_the_n3_kanji_in_the_outline_order(b):
    js = """(() => { const K = DATA.KANJI.filter(k => k.lv === 'N3'); const reads = new Map(); DATA.VOCAB.forEach(v => reads.set(v.w, (reads.get(v.w) || []).concat([v.r])));
      const bad = K.filter(k => !k.m || !(k.on.length || k.kun.length) || k.ex.length < 2 || k.ex.some(([w, r]) => !w.includes(k.k) || (reads.has(w) && !reads.get(w).includes(r)))).map(k => k.k);
      return JSON.stringify({ order: K.map(k => k.k).join(''), bad, table: REG.kanji.filter(k => k.lv === 'N3').length }); })()"""
    r = json.loads(ev(b, js))
    assert r['order'] == ORDER_N3 and r['bad'] == [] and r['table'] == len(ORDER_N3), {k: (v if k != 'order' else v[:20]) for k, v in r.items()}

# 1.0.33 review of part two: an example is spoken the way its card shows it (a homograph's mark too: 今日 こんにち was spoken きょう,
# the index's first reading), and an N3 card shows its marked word with its own reading (注 ちゅう showed そそ: 注が of 注ぐ)
HIRA = "const hira = (s) => String(s || '').replace(/[ァ-ヶ]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0x60)).replace(/\\s+/g, '');"
def test_a_homograph_cards_examples_are_spoken_the_way_the_card_shows_them(b):
    js = "(() => { " + HIRA + """ const shown = (html) => hira(html.replace(/<ruby[^>]*>.*?<rt>(.*?)<\\/rt><\\/ruby>/g, '$1').replace(/<[^>]+>/g, ''));
      const bad = []; let n = 0;
      REG.vocab.filter(v => v.builtin && homographReadings(v).length).forEach(v => [v.ex, v.ex2].filter(Boolean).forEach(e => { n++;
        const said = hira(kanaReadings(ttsText(exampleSpeech(e, v)))); if (said !== shown(exampleJpHtml(e, v))) bad.push(v.id + ':' + said); }));
      return JSON.stringify({ n, bad: bad.slice(0, 8), nbad: bad.length }); })()"""
    r = json.loads(ev(b, js)); assert r['n'] > 150 and r['nbad'] == 0, r

def test_houses_are_counted_ken_and_gen(b):   # 軒 (N3) after a number: 2軒 にけん, 3軒 さんげん — not the eaves (のき)
    js = "JSON.stringify(['2軒', '3軒', '5軒'].map(t => furi(t).replace(/<ruby[^>]*>.*?<rt>(.*?)<\\/rt><\\/ruby>/g, '$1')))"
    assert json.loads(ev(b, js)) == ['2けん', '3げん', '5けん']

def test_every_n3_example_shows_its_word_with_the_cards_reading(b):
    js = "(() => { " + HIRA + """ const bad = [];
      REG.vocab.filter(v => v.builtin && v.lv === 'N3').forEach(v => [v.ex, v.ex2].forEach(e => {
        const m = /\\{([^}]*)\\}/.exec(e); const mark = jaPlain(m[1]); const a = jaPlain(exPlain(e.slice(0, m.index))).length, z = a + mark.length;
        const info = mark === jaPlain(v.w) ? null : vSurfaceInfo(Object.assign({}, v, { ex: e }));
        if (info && info.form === 'raw') return;   /* an unrecognised form has no reading to compare (the bank test rules those out) */
        const want = hira(info ? readingOfSurface(v, info) : v.r);
        let pos = 0, read = '', ok = null; const TOK = /<ruby[^>]*>(.*?)<rt>(.*?)<\\/rt><\\/ruby>|<[^>]+>|([^<]+)/g; let t; const html = exampleJpHtml(e, v);
        while ((t = TOK.exec(html))) { const base = t[1] !== undefined ? t[1] : t[3]; if (base === undefined) continue; const s0 = pos, s1 = pos + base.length; pos = s1; if (s1 <= a || s0 >= z) continue;
          if (t[1] !== undefined && (s0 < a || s1 > z)) { ok = (s0 === a && hira(t[2]).startsWith(want)) || (s1 === z && hira(t[2]).endsWith(want)); }   /* a compound with the word in it */
          else read += t[1] !== undefined ? t[2] : base.slice(Math.max(0, a - s0), Math.min(base.length, z - s0)); }
        if (ok === false || (ok === null && hira(read) !== want)) bad.push(v.id + ' ' + v.w + ':' + read + '≠' + want); }));
      return JSON.stringify(bad.slice(0, 10)); })()"""
    r = json.loads(ev(b, js)); assert r == [], r

# ---- 1.0.33 part three: check-grammar.py reads a squad's unit file (its unit, lesson and items) for a unit of the outline ----
def test_check_grammar_script_checks_a_new_unit_file(b):   # ids past the real m19's (the unit is merged since 1.0.33)
    from cdp import free_port
    ok = dict(u='m19', lv='N3', d=1, zh='一定是。', why='用 **〜に違いない**。')
    items = [
        dict(ok, id='m19-91', t='choice', pt='〜に違いない', sec=0, jp='あの店はいつも人が並んでいるから、おいしい（　）。', op=['に違いない', 'はずがない', 'ようがない', 'わけがない'], a='に違いない'),
        dict(ok, id='m19-92', t='order', pt='〜に違いない', sec=0, pre='電気が消えているから、', parts=['田中さんは', 'もう', '帰った', 'に違いない'], post='。', star=2),
        dict(ok, id='m19-93', t='conj', pt='〜そうにない／〜そうもない', sec=1, jp='仕事が多くて、今日は早く{V}そうにない。', v='帰る', g='5', f='stem', a='帰り'),   # (降り would be bare: 降る or 降りる)
        dict(ok, id='m19-94', t='choice', pt='〜に違いないです', sec=0, jp='あの人は先生（　）。', op=['に違いない', 'はずがない', 'ようがない', 'わけがない'], a='に違いない'),
        dict(ok, id='m19-95', t='order', pt='〜に違いない', sec=0, pre='', parts=['田中さんは', 'もう', '帰った', 'に違いない'], post='。', star=4),
        dict(ok, id='m19-96', t='conj', pt='〜そうにない／〜そうもない', sec=1, jp='雨は{V}そうにない。', v='降る', g='5', f='stem', a='降ら'),
        dict(ok, id='m19-97', t='choice', pt='〜に違いない', sec=0, jp='彼は鬱になる（　）。', op=['に違いない', 'はずがない', 'ようがない', 'わけがない'], a='に違いない'),
        dict(ok, id='m19-98', t='choice', pt='〜そうにない／〜そうもない', sec=0, jp='この雨はやみ（　）。', op=['そうにない', 'そうだ', 'ようだ', 'らしい'], a='そうにない')]
    sec = lambda h: {'h': h, 'rule': '普通形＋に違いない', 'points': ['一定是。'], 'ex': [{'jp': '雨が降るに違いない。', 'zh': '一定會下雨。'}, {'jp': '山田さんは来ないに違いない。', 'zh': '山田一定不會來。'}]}
    fx = {'unit': {'id': 'm19', 'desc': '推測和傳聞。'}, 'lesson': {'formula': '〜に違いない', 'overview': '推測。', 'sections': [sec('推測'), sec('看起來不會')]}, 'items': items}
    path = os.path.join(ROOT, '.superpowers', 'check-grammar-fixture.json'); os.makedirs(os.path.dirname(path), exist_ok=True)
    json.dump(fx, open(path, 'w', encoding='utf-8'), ensure_ascii=False)
    out = subprocess.run([sys.executable, '-I', os.path.join(ROOT, 'scripts', 'check-grammar.py'), path, str(free_port())], capture_output=True, text=True)
    fails = [l for l in out.stdout.splitlines() if l.startswith('FAIL')]
    assert out.returncode == 1, out.stdout + out.stderr
    for id_, msg in [('m19-94', 'pt not among the outline points'), ('m19-95', 'star must be 0–3'), ('m19-96', 'conjugates to 降り'),
                     ('m19-97', 'kanji without furigana'), ('m19-98', 'one point, one section'), ('m19', 'choice items for 〜気がする'), ('m19', 'meaning items'), ('m19', 'sections')]:
        assert any(l.startswith(f'FAIL {id_} ') and msg in l for l in fails), (id_, msg, fails)
    assert not [l for l in fails if l.split()[1] in ('m19-91', 'm19-92', 'm19-93')], fails

def test_n3_units_lessons_and_items_follow_the_outline(b):   # 1.0.33 part three (spec §4.4): m19–m33 in phases 4 and 5, as curriculum/n3.json has them
    o = json.load(open(os.path.join(ROOT, 'curriculum', 'n3.json'), encoding='utf-8'))
    outline = {'phases': o['phases'], 'units': [{'id': u['id'], 'points': [p['p'] for p in u['points']]} for u in o['units']]}
    js = """((o) => { const U = DATA.UNITS.filter(u => u.lv === 'N3'); const G = DATA.GRAMMAR.filter(g => U.some(u => u.id === g.u)); const bad = [];
      o.units.forEach(ou => { const u = U.find(x => x.id === ou.id); if (!u) { bad.push(ou.id + ': no unit'); return; }
        const L = DATA.LESSONS[u.id]; if (!L || !(L.sections || []).length) bad.push(u.id + ': no lesson');
        const mine = G.filter(g => g.u === u.id);
        ou.points.forEach(p => { if (mine.filter(g => g.t === 'choice' && g.pt === p).length < 3) bad.push(u.id + ': few choice items for ' + p); });
        ['meaning', 'order'].forEach(t => { if (mine.filter(g => g.t === t).length < 5) bad.push(u.id + ': few ' + t); });
        mine.forEach(g => { if (!ou.points.includes(g.pt)) bad.push(g.id + ': pt'); if (!L || !L.sections[g.sec]) bad.push(g.id + ': sec'); if (g.lv !== 'N3') bad.push(g.id + ': lv'); }); });
      return JSON.stringify({ units: U.map(u => u.id), ph: U.map(u => u.ph), phases: DATA.PHASES.filter(p => U.some(u => u.ph === p.id)).map(p => p.id),
        dupIds: G.length - new Set(G.map(g => g.id)).size, n: G.length, bad: bad.slice(0, 10), stage: STAGES[STAGES.length - 1].lv }); })(%s)""" % json.dumps(outline, ensure_ascii=False)
    r = json.loads(ev(b, js))
    ph = [4 + i for i, p in enumerate(o['phases']) for _ in p['units']]
    assert r['units'] == [u['id'] for u in o['units']] and r['ph'] == ph and r['phases'] == [4, 5], r
    assert r['dupIds'] == 0 and r['bad'] == [] and r['n'] >= 700 and r['stage'] == 'N3', r

# ---- 1.0.33 part four: check-listen-read.py follows the item's level (spec §5.4: no word above it), knows N3's kinds and the
# outline's units ----
def test_check_listen_read_script_follows_the_items_level(b):
    from cdp import free_port
    dlg = lambda lv, u, line: {'t': 'dialog', 'lv': lv, 'u': u, 'script': '男：' + line + '\n女：そうですね。', 'q': '男の人は何をしますか。', 'op': ['会議に出る', '家に帰る', '本を読む', '電話をする'], 'a': '会議に出る', 'zh': '男：……', 'why': '男生說要開會。'}
    long = '私は毎朝、駅まで歩きます。' * 8
    fx = {'listen': [dlg('N3', 'm19', '明日の会議で、その計画をもう一度検討します。'), dlg('N4', 'm7', 'その計画をもう一度検討します。'), dlg('N3', 'm7', '明日は会議に出ます。'),
                     dict(dlg('N3', 'm20', '明日、会議があります。'), kind='gist'),
                     {'t': 'resp', 'kind': 'gist', 'lv': 'N3', 'u': 'm21', 'line': '明日、会議に出ますか。', 'op': ['はい、出ます。', 'いいえ、出ます。', 'はい、出ません。'], 'a': 'はい、出ます。', 'zh': '明天要開會嗎？', 'why': '回答要一致。'}],
          'read': [{'lv': 'N3', 'u': 'm22', 'kind': 'long', 'passage': long, 'q': 'この人は毎朝、何をしますか。', 'op': ['駅まで歩く', '駅まで走る', 'バスに乗る', '電車に乗る'], 'a': '駅まで歩く', 'zh': '我每天早上走路到車站。', 'why': '文章說走路到車站。'},
                   {'lv': 'N3', 'u': 'm22', 'kind': 'info', 'passage': '市民プールのご案内\n月曜日は休みです。\n一回300円です。', 'q': '月曜日はどうなりますか。', 'op': ['休み', '300円', '無料', '夜だけ'], 'a': '休み', 'zh': '市民游泳池的說明。', 'why': '月曜日是休館日。'}]}
    path = os.path.join(ROOT, '.superpowers', 'check-listen-read-fixture.json'); os.makedirs(os.path.dirname(path), exist_ok=True)
    json.dump(fx, open(path, 'w', encoding='utf-8'), ensure_ascii=False)
    out = subprocess.run([sys.executable, '-I', os.path.join(ROOT, 'scripts', 'check-listen-read.py'), path, str(free_port())], capture_output=True, text=True)
    lines = out.stdout.splitlines(); has = lambda label, msg: any(label in l and msg in l for l in lines)
    assert out.returncode == 1, out.stdout + out.stderr
    assert not [l for l in lines if 'listen#0 ' in l or 'listen#3 ' in l or 'read#1 ' in l], lines   # an N3 item may use N3 words; gist dialogs and info texts are N3 kinds
    assert has('listen#1 ', 'above N4: 検討'), lines   # an N4 item may not (a warning, as for N5)
    assert has('listen#2 ', 'unit m7 is N4'), lines
    assert has('listen#4 ', 'gist is a dialog'), lines
    assert has('read#0 ', 'long passage'), lines

def test_n3_listening_and_reading_items(b):   # 1.0.33 part four (spec §5.1): N3 listening 150–250 and reading 80–120, each on an N3 unit
    js = """(() => { const units = DATA.UNITS.filter(u => u.lv === 'N3').map(u => u.id); const L = DATA.LISTEN.filter(x => x.lv === 'N3'), R = DATA.READ.filter(x => x.lv === 'N3');
      const bare = (t) => (furi(String(t || '')).replace(/<ruby[^>]*>.*?<\\/ruby>/g, '').match(/[一-鿿々]+/g) || []);
      const ja = (x) => [x.script, x.line, x.q, x.passage].concat(x.t === 'scene' ? x.op : x.op || []).filter(Boolean);
      const few = units.filter(u => L.filter(x => x.u === u).length < 8 || R.filter(x => x.u === u).length < 4);
      const len = (k) => { const P = R.filter(x => x.kind === k).map(x => jaPlain(x.passage).length); return P.length ? Math.min(...P) : 0; };
      return JSON.stringify({ nL: L.length, nR: R.length, units: L.concat(R).every(x => units.includes(x.u)), few, gist: L.filter(x => x.kind === 'gist').length,
        long: len('long'), info: R.filter(x => x.kind === 'info').length, ids: new Set(DATA.LISTEN.map(x => x.id)).size === DATA.LISTEN.length && new Set(DATA.READ.map(x => x.id)).size === DATA.READ.length,
        bare: L.concat(R).filter(x => ja(x).some(t => bare(t).length)).map(x => x.id).slice(0, 8) }); })()"""
    r = json.loads(ev(b, js))
    assert r['nL'] >= 150 and r['nR'] >= 80 and r['units'] and r['few'] == [] and r['gist'] >= 20 and r['long'] >= 500 and r['info'] >= 10 and r['ids'] and r['bare'] == [], r

# ---- 1.0.33 part five: check-exam.py checks curated mock-exam items by their 大題's kind ----
def test_check_exam_script_checks_curated_items_by_kind(b):
    from cdp import free_port
    w = 'x'
    items = [
        {'id': 'cm_n3_t1', 'lv': 'N3', 'm': 'S1-M3', 'jp': '会議の（　）を決めました。', 'op': ['日時', '時間', '時代', '時計'], 'a': '日時', 'why': w},
        {'id': 'cm_n3_t2', 'lv': 'N3', 'm': 'S1-M4', 'jp': 'この部屋は＿＿せまい＿＿です。', 'op': ['この部屋は広くないです。', 'この部屋は広いです。', 'この部屋は明るいです。', 'この部屋は暗いです。'], 'a': 'この部屋は広くないです。', 'why': w},
        {'id': 'cm_n3_t3', 'lv': 'N3', 'm': 'S2-M3', 'passage': '私は毎朝（１）。そして（２）。', 'qs': [{'op': ['歩きます', '歩きました', '歩いて', '歩こう'], 'a': '歩きます'}, {'op': ['休みます', '休みました', '休んで', '休もう'], 'a': '休みます'}], 'why': w},
        {'id': 'cm_n3_t4', 'lv': 'N3', 'm': 'S1-M3', 'jp': '会議の日時を決めました。', 'op': ['日時', '時間', '時代', '時計'], 'a': '日時', 'why': w},
        {'id': 'cm_n3_t5', 'lv': 'N3', 'm': 'S1-M4', 'jp': 'この部屋はせまいです。', 'op': ['この部屋は広くないです。', 'この部屋は広いです。', 'この部屋は明るいです。', 'この部屋は暗いです。'], 'a': 'この部屋は広くないです。', 'why': w},
        {'id': 'cm_n3_t6', 'lv': 'N3', 'm': 'S2-M3', 'passage': '私は毎朝（１）。', 'qs': [{'op': ['歩きます', '歩きました', '歩いて', '歩こう'], 'a': '歩きます'}, {'op': ['休みます', '休みました', '休んで', '休もう'], 'a': '休みます'}], 'why': w},
        {'id': 'cm_n3_t7', 'lv': 'N3', 'm': 'S1-M3', 'jp': '彼は鬱の（　）です。', 'op': ['日時', '時間', '時代', '時計'], 'a': '時間', 'why': w},
        {'id': 'cm_n3_t1', 'lv': 'N3', 'm': 'S1-M3', 'jp': '旅行の（　）を決めました。', 'op': ['日時', '時間', '時代', '時計'], 'a': '日時', 'why': w},
        {'id': 'cm_n3_t9', 'lv': 'N3', 'm': 'S3-M1', 'script': '男：明日です。\n女：はい。', 'q': '何がありますか。', 'op': ['会議', '旅行', '試験', '休み'], 'a': '会議', 'why': w}]
    path = os.path.join(ROOT, '.superpowers', 'check-exam-fixture.json'); os.makedirs(os.path.dirname(path), exist_ok=True)
    json.dump(items, open(path, 'w', encoding='utf-8'), ensure_ascii=False)
    out = subprocess.run([sys.executable, '-I', os.path.join(ROOT, 'scripts', 'check-exam.py'), path, str(free_port())], capture_output=True, text=True)
    fails = [l for l in out.stdout.splitlines() if l.startswith('FAIL')]
    assert out.returncode == 1, out.stdout + out.stderr
    for id_, msg in [('cm_n3_t4', 'one （　） blank'), ('cm_n3_t5', 'two ＿＿'), ('cm_n3_t6', 'blanks'), ('cm_n3_t7', 'kanji without furigana'), ('cm_n3_t1', 'id used twice'), ('cm_n3_t9', 'curated listening')]:
        assert any(l.startswith(f'FAIL {id_} ') and msg in l for l in fails), (id_, msg, fails)
    assert not [l for l in fails if l.split()[1] in ('cm_n3_t2', 'cm_n3_t3')], fails

def test_n3_mock_exam_has_enough_items(b):   # 1.0.33 part five: every N3 paper fills each 大題; the curated items read
    js = """(() => { const out = {}; ['mini', 'std', 'full'].forEach(size => { const r = assemblePaper('N3', size, ['S1', 'S2', 'S3']); out[size] = r.shortage; });
      const C = DATA.EXAM.filter(x => x.lv === 'N3'); const bare = (t) => (furi(String(t || '')).replace(/<ruby[^>]*>.*?<\\/ruby>/g, '').match(/[一-鿿々]+/g) || []);
      const ja = (x) => [x.jp && x.jp.replace(/＿＿/g, ''), x.word, x.passage].concat(x.op || [], ...(x.qs || []).map(q => [q.q].concat(q.op))).filter(Boolean);
      out.ids = C.every(x => /^cm_n3_s[12]m[1-7]_\\d{2}$/.test(x.id)); out.n = C.length; out.bare = C.filter(x => ja(x).some(t => bare(t).length)).map(x => x.id);
      return JSON.stringify(out); })()"""
    r = json.loads(ev(b, js))
    assert r['mini'] == [] and r['std'] == [] and r['full'] == [] and r['ids'] and r['n'] >= 50 and r['bare'] == [], r

def test_n3_formal_mode_plays_only_the_scene_and_reply_options(b):   # N3's 発話表現 and 即時応答 are 問題4・5 (final review)
    js = """(() => { startExam({ level: 'N3', size: 'std', subjects: ['S3'], formal: true });
      const kinds = [...new Set(EXAM.paper.map(q => q.mk + ':' + Boolean(q.audioOptions)))].sort();
      if (typeof examTimer !== 'undefined') clearInterval(examTimer); EXAM = null; document.body.classList.remove('practicing'); return JSON.stringify(kinds); })()"""
    assert json.loads(ev(b, js)) == ['gist:false', 'resp:true', 'scene:true', 'task:false']

TESTS = [f for n, f in sorted(globals().items()) if n.startswith('test_') and callable(f)]
if __name__ == "__main__":
    srv = subprocess.Popen([sys.executable, "-m", "http.server", str(PORT), "--bind", "127.0.0.1"], cwd=ROOT, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(0.8)
    only = sys.argv[1:]
    failed = 0
    try:
        for t in TESTS:
            if only and t.__name__ not in only: continue
            err = None
            for attempt in (1, 2):   # a second try with a fresh browser absorbs load-related flakiness
                with Browser() as b:
                    try:
                        t(b); print("ok  ", t.__name__ + (" (retry)" if attempt == 2 else "")); err = None; break
                    except Exception as e:
                        err = e
            if err is not None:
                failed += 1; print("FAIL", t.__name__, "-", str(err)[:400])
    finally:
        srv.terminate()
    print("ALL PASS" if not failed else f"{failed} FAILED")
    sys.exit(1 if failed else 0)
