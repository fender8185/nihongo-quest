"""2026-11-22 practice review round: 看字就懂 words asked by their reading, spelling tiles with the kana they are mixed up with,
a fill-in with no other format spelled with tiles, 換句話說 (言い換え), the reading passage in the middle of a set, 這次記住了 on a
再練一次 answered right, 連對 10 glowing, and the small sounds of 配對 and the tiles."""
import json, os, subprocess, sys, time
sys.path.insert(0, os.path.dirname(__file__))
from cdp import Browser
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
PORT = 8835
URL = f"http://127.0.0.1:{PORT}/"
READY = "typeof state === 'object' && !!state.updatedAt && typeof speakScript === 'function'"
REC = """const t = todayStr(); const rec = (b, extra) => Object.assign({ b, s: LEVEL_FROM_S[b - 1] || 0.5, d: 5, due: addDays(t, 3), n: 3, ok: 3, ng: 0, st: 3, last: addDays(t, -10), lapse: 0, intro: addDays(t, -40), f: {} }, extra || {});
  const word = (w) => REG.vocab.find(v => v.builtin && jaPlain(v.w) === w);"""

def ev(b, js, pre=()):
    return b.run([("nav", URL), ("wait", READY)] + list(pre) + [("eval", js)])[-1]

def test_a_see_through_word_is_asked_by_its_reading_and_a_false_friend_by_its_kanji(b):
    js = """(() => { %s
      const see = ['学校', '毎晩', '高い', '話題'].map(w => seeThrough(word(w))); const not = ['手紙', '勉強', '大丈夫', '交番'].map(w => seeThrough(word(w)));
      const v = word('学校'); state.srs[v.key] = rec(2);
      const m = makeVocabQuestion(v, { forceFmt: 'v-meaning' });
      const rc = makeVocabQuestion(v, { forceFmt: 'v-recall' }); const rk = makeVocabQuestion(v, { forceFmt: 'v-recall', kana: false });
      const f = word('手紙'); state.srs[f.key] = rec(2); const fm = makeVocabQuestion(f, { forceFmt: 'v-meaning' });
      const fresh = word('毎晩'); const first = makeVocabQuestion(fresh, {});   // a word never answered: its first question, the reading only
      const fast = word('速い'); state.srs[fast.key] = rec(2); let homo = 0, plain = 0;   // はやい alone could be 早い (早): never an option beside it
      for (let i = 0; i < 60; i++) { if (makeVocabQuestion(fast, { forceFmt: 'v-meaning' }).options.some(o => o.text === '早')) homo++; }
      for (let i = 0; i < 200; i++) { if ((meaningOptions(fast, false) || []).includes('早')) plain++; }
      return JSON.stringify({ see, not, stem: m.stemHtml, noKanji: !/[一-鿿]/.test(m.stemHtml), reveal: m.revealHtml.includes('学校'),
        sameReading: m.options.some(o => REG.vocab.some(x => x.builtin && x.r === v.r && x.m === o.text && x !== v)),
        recallKana: rc.kanaOptions === true, keepWhenAsked: !rk.kanaOptions, friend: /手紙/.test(fm.stemHtml), firstFmt: first.fmt, firstStem: first.stemHtml, homo, plain,
        cloze: makeVocabQuestion(v, { forceFmt: 'v-cloze' }).kanaOptions === true }); })()""" % REC
    r = json.loads(ev(b, js))
    assert r['see'] == [True, True, True, True] and r['not'] == [False, False, False, False], r
    assert r['stem'] == 'がっこう' and r['noKanji'] and r['reveal'] and not r['sameReading'], r
    assert r['recallKana'] and r['keepWhenAsked'] and r['friend'], r
    assert r['firstFmt'] == 'v-meaning' and r['firstStem'] == 'まいばん', r
    assert r['homo'] == 0 and r['plain'] > 0 and r['cloze'], r   # plain: without the filter 早 does come up, so the check can fail

def test_the_spelling_tiles_hold_the_kana_a_word_is_mixed_up_with(b):
    js = """(() => { const out = {};
      const g = []; for (let i = 0; i < 20; i++) g.push(spellTiles('がっこう'));
      out.n = g[0].length; out.near = g.every(t => t.includes('か') && t.includes('ご'));
      out.own = g.every(t => ['が', 'っ', 'こ', 'う'].every(c => t.includes(c)));
      const k = []; for (let i = 0; i < 20; i++) k.push(spellTiles('コーヒー'));
      out.kata = k.every(t => t.every(c => /[ァ-ヺー]/.test(c)));
      const y = []; for (let i = 0; i < 20; i++) y.push(spellTiles('きょう'));
      out.yoon = y.every(t => t.includes('よ'));
      return JSON.stringify(out); })()"""
    r = json.loads(ev(b, js))
    assert r == {'n': 7, 'near': True, 'own': True, 'kata': True, 'yoon': True}, r

def test_a_fill_in_with_no_other_format_is_spelled_with_tiles(b):
    js = """(() => { %s
      const G = REG.grammar.filter(g => (g.t || 'choice') === 'choice');
      const g = G.find(x => x.a === 'きれいでした' && !x.zt); const p = G.find(x => x.a === 'に' && grammarFormats(x).length === 1);
      const out = { fmts: grammarFormats(g), particle: p ? grammarFormats(p) : null };
      state.srs[g.key] = rec(2);
      const stage = new Set(); for (let i = 0; i < 30; i++) stage.add(pickGrammarFormat(g, state.srs[g.key], null, true));
      out.stage = [...stage];
      startSession('items', { items: [g, g, g] }); route(); const e = currentEntry(); e.q = makeGrammarQuestion(g, { forceFmt: 'g-fill-type' }); renderPractice();
      out.instr = e.q.instr; out.tiles = document.querySelectorAll('.spell-tile.conj-tile').length;
      conjTokens(e.q.options[0].text).forEach(tok => { const i = e.q.tiles.findIndex((x, k) => x === tok && !(e.conj || []).includes(k)); tilePut(i); });
      tileSubmit();
      out.right = e.done && e.chosen === e.q.answer; out.gf = state.srs[g.key].gf['g-fill-type']; out.filled = document.querySelector('.blank.filled') !== null;
      out.name = FMT_NAME['g-fill-type'];
      const k = G.find(x => x.a === '静かな' && grammarFormats(x).includes('g-fill-type'));   // a kanji tile shows the reading it has in the answer
      nextQuestion(); const e2 = currentEntry(); e2.q = makeGrammarQuestion(k, { forceFmt: 'g-fill-type' }); renderPractice();
      out.kanjiTile = (document.querySelector('.conj-tile[data-tok="静"]') || {}).innerHTML || '';
      SESSION = null; document.body.classList.remove('practicing');
      return JSON.stringify(out); })()""" % REC
    r = json.loads(ev(b, js))
    assert r['fmts'] == ['g-choice', 'g-fill-type'] and r['particle'] == ['g-choice'] and r['stage'] == ['g-choice'], r
    assert r['instr'] == '點假名，拼出填入空格的答案' and r['tiles'] >= 9 and r['right'] and r['gf'] == [1, 0] and r['filled'], r
    assert r['name'] == '文法・填空（拼寫）' and r['kanjiTile'] == '<ruby>静<rt>しず</rt></ruby>', r

def test_a_paraphrase_asks_the_words_own_example_with_its_marked_part_underlined(b):
    js = """(() => { %s
      const v = word('狭い'); v.ip = { x: 1, a: '広くない', d: ['明るくない', '古くない', '広い'], z: ['不寬敞', '不明亮', '不舊', '寬敞'] };
      state.srs[v.key] = rec(2); const at2 = vocabFormats(v).map(x => x[0]).includes('v-para');
      state.srs[v.key] = rec(3); const at3 = vocabFormats(v).map(x => x[0]).includes('v-para');
      const q = makeVocabQuestion(v, { forceFmt: 'v-para' }); const m = /\\{([^}]*)\\}/.exec(v.ex);
      startSession('items', { items: [v, v] }); route(); const e = currentEntry(); e.q = q; renderPractice();
      const u = document.querySelector('.q-stem .uline').cloneNode(true); u.querySelectorAll('rt').forEach(x => x.remove()); const opts = [...document.querySelectorAll('.opt')].map(o => o.textContent.replace(/^\\d/, '').trim());
      answerCurrent(q.options.findIndex(o => o.text === '明るくない'));
      const out = { at2, at3, fmt: q.fmt, under: u && u.textContent === m[1], n: opts.length, ex: q.item.ex === v.ex, noZh: !q.zhText,
        aside: [...document.querySelectorAll('.opt-zh')].map(x => x.textContent).includes('不明亮'), why: q.why.includes('広くない'),
        example: (document.querySelector('.feedback .example') || {}).textContent || '', name: FMT_NAME['v-para'] };
      SESSION = null; document.body.classList.remove('practicing');
      return JSON.stringify(out); })()""" % REC
    r = json.loads(ev(b, js, pre=[("eval", "window.innerWidth")]))
    assert not r['at2'] and r['at3'] and r['fmt'] == 'v-para' and r['under'] and r['n'] == 4 and r['ex'] and r['noZh'], r
    assert r['aside'] and r['why'] and '狭' in r['example'] and r['name'] == '單字・換句話說', r

def test_the_reading_passage_comes_in_the_middle_of_a_set_away_from_listening(b):
    js = """(() => { %s
      REG.vocab.filter(v => v.builtin && v.lv === 'N5').slice(0, 30).forEach(v => { state.srs[v.key] = rec(2, { due: addDays(t, -1) }); });
      REG.read.filter(x => unitOrder(x.u) <= unitOrder(state.currentUnit)).slice(0, 2).forEach(x => { state.srs[x.key] = rec(2, { due: t, last: addDays(t, -40) }); });
      listenReachable().slice(0, 3).forEach(x => { state.srs[x.key] = rec(2, { due: t, last: addDays(t, -40) }); });
      delete state.today.plan; DAILY_CACHE = null; const q = buildDailyQueue();
      const i = q.items.findIndex(x => x.kind === 'r'); const kind = (k) => (q.items[k] || {}).kind;
      return JSON.stringify({ i, n: q.items.length, listen: q.items.filter(x => x.kind === 'l').length, beside: [kind(i - 1), kind(i + 1)].includes('l') }); })()""" % REC
    r = json.loads(ev(b, js))
    assert r['i'] >= 0 and abs(r['i'] - r['n'] / 2) <= 3 and r['listen'] == 3 and not r['beside'], r   # in the middle, never next to a listening item

def test_ten_right_in_a_row_glow_and_a_retry_answered_right_says_it_is_remembered(b):
    js = """(() => { %s
      const heard = []; window.playSfx = (k) => { heard.push(k); return 0; };
      const ws = REG.vocab.filter(v => v.builtin && v.lv === 'N5' && v.m).slice(0, 12); ws.forEach(v => { state.srs[v.key] = rec(2); });
      startSession('items', { items: ws }); route();
      const ask = () => { const e = currentEntry(); e.q = makeVocabQuestion(e.item, { forceFmt: 'v-meaning' }); renderPractice(); return e; };
      const out = { chips: [] };
      for (let i = 0; i < 10; i++) { const e = ask(); answerCurrent(e.q.answer); out.chips.push(document.querySelector('.combo') ? document.querySelector('.combo').className : ''); if (i < 9) nextQuestion(); }
      out.big = document.querySelector('.combo.big') !== null; out.text = document.querySelector('.combo').textContent; out.last = heard[heard.length - 1];
      nextQuestion(); let e = ask(); answerCurrent((e.q.answer + 1) %% 4);   // a miss: its 再練一次 comes 3–5 later
      for (let k = 0; k < 6 && !currentEntry().requeued; k++) { nextQuestion(); if (!currentEntry().requeued) { e = ask(); answerCurrent(e.q.answer); } }
      e = ask(); answerCurrent(e.q.answer);
      out.redo = e.requeued === true && (document.querySelector('.fb-redo') || {}).textContent;
      out.heard = heard.slice(0, 10);
      SESSION = null; document.body.classList.remove('practicing');
      return JSON.stringify(out); })()""" % REC
    r = json.loads(ev(b, js))
    assert r['big'] and r['text'] == '連對 10' and r['last'] == 'streak', r
    assert all('big' not in c for c in r['chips'][:9]), r
    assert all(k in ('ok', 'up') for k in r['heard'][:9]) and r['heard'][9] == 'streak' and r['redo'] == '這次記住了', r   # up: a word that just became 熟悉

def test_pairs_in_match_and_tiles_on_the_line_make_small_sounds(b):
    js = """(() => { %s
      const heard = []; window.playSfx = (k, s) => { heard.push(k + ':' + (s || 0)); return 0; };
      REG.vocab.filter(v => v.builtin && v.lv === 'N5' && v.p === 'n').slice(0, 40).forEach(v => { state.srs[v.key] = rec(2); });
      const v = REG.vocab.find(x => x.builtin && x.lv === 'N5' && x.p === 'n' && state.srs[x.key] && matchPairs(x));
      startSession('items', { items: [v, v] }); route(); let e = currentEntry(); e.q = makeVocabQuestion(v, { forceFmt: 'v-match' }); renderPractice();
      const [w0, m0] = e.q.pairs[0]; const other = e.q.pairs[1][1];
      document.querySelector(`.match-word[data-w="${w0}"]`).click(); document.querySelector(`.match-meaning[data-m="${other}"]`).click();
      e.q.pairs.forEach(([w, m]) => { document.querySelector(`.match-word[data-w="${w}"]`).click(); document.querySelector(`.match-meaning[data-m="${m}"]`).click(); });
      const match = heard.splice(0);
      nextQuestion(); e = currentEntry(); e.q = makeVocabQuestion(v, { forceFmt: 'v-spell' }); renderPractice();
      document.querySelector('.spell-tile').click(); document.querySelector('.spell-out .spell-piece').click();
      const spell = heard.splice(0);
      SESSION = null; document.body.classList.remove('practicing');
      return JSON.stringify({ match, spell }); })()""" % REC
    r = json.loads(ev(b, js))
    assert r['match'][:6] == ['miss:0', 'pair:0', 'pair:1', 'pair:2', 'pair:3', 'pair:4'] and r['match'][6].startswith('bad'), r
    assert r['spell'] == ['tap:0'], r   # a tile taken back off the line is quiet

def test_the_paraphrase_checker_passes_a_good_item_and_names_each_problem(b):
    from cdp import free_port
    good = {"id": "n5c-126", "ip": {"x": 1, "a": "広くない", "d": ["明るくない", "古くない", "広い"], "z": ["不寬敞", "不明亮", "不舊", "寬敞"]}}
    bad = [{"id": "nope", "ip": good["ip"]},
           {"id": "n5c-126", "ip": {"x": 2, "a": "狭くて", "d": ["広くて", "明るくて", "古くて"], "z": ["不窄", "寬敞", "明亮", "舊"]}},
           {"id": "n5c-126", "ip": {"x": 3, "a": "a", "d": ["b", "c", "d"], "z": ["1", "2", "3", "4"]}}]
    path = os.path.join(ROOT, '.superpowers', 'check-paraphrase-fixture.json'); os.makedirs(os.path.dirname(path), exist_ok=True)
    run = lambda items: subprocess.run([sys.executable, '-I', os.path.join(ROOT, 'scripts', 'check-paraphrase.py'), path, str(free_port())], capture_output=True, text=True)
    json.dump({"items": [good]}, open(path, 'w', encoding='utf-8'), ensure_ascii=False); ok = run(None)
    json.dump({"items": bad}, open(path, 'w', encoding='utf-8'), ensure_ascii=False); no = run(None)
    assert ok.returncode == 0 and '0 problems' in ok.stdout, ok.stdout + ok.stderr
    assert no.returncode == 1 and 'no built-in word with this id' in no.stdout and 'holds the marked part itself' in no.stdout and 'x must be 1' in no.stdout, no.stdout

def test_every_paraphrase_in_the_bank_builds_its_question(b):
    js = """(() => { %s
      const ws = REG.vocab.filter(v => v.builtin && v.ip); const bad = [];
      ws.forEach(v => { state.srs[v.key] = rec(3); const q = makeVocabQuestion(v, { forceFmt: 'v-para' });
        if (!q || q.fmt !== 'v-para' || q.options.length !== 4 || new Set(q.options.map(o => jaPlain(o.text))).size !== 4 || !q.stemHtml.includes('class="uline"')
          || q.options[q.answer].text !== v.ip.a || q.item.ex !== (v.ip.x === 2 ? v.ex2 : v.ex)) bad.push(v.id);
        const sw = v.ex2 ? makeVocabQuestion(withExample(v, 1), { forceFmt: 'v-para' }) : null;   // 重練答錯的題目 hands over such a copy
        if (sw && sw.item.ex !== (v.ip.x === 2 ? v.ex2 : v.ex)) bad.push(v.id + ' (copy)');
        delete state.srs[v.key]; });
      return JSON.stringify({ n: ws.length, bad }); })()""" % REC
    r = json.loads(ev(b, js))
    assert r['n'] >= 190 and r['bad'] == [], r

# 2026-11-23: the words the town's menus ask for come in a lane of their own, one new word in three, 水 first; they do not count
# against their theme's lane; 入門 has no such lane
def test_the_menus_words_come_in_a_lane_of_their_own(b):
    js = """(() => { state.stage = 'main'; state.kanaKnown = true; state.startChosen = true; state.currentUnit = 'm1'; DAILY_CACHE = null;
      const cur = curLevel(); const c = newVocabCandidates(REG.vocab.filter(v => vocabEligibleForDaily(v, cur)), false).slice(0, 30);
      const menu = menuLane()[2]; const at = c.map((v, i) => (menu.has(v.key) ? i : -1)).filter(i => i >= 0); const first = c.find(v => menu.has(v.key));
      const before = JSON.stringify(laneOrder()) + JSON.stringify(state.themeLane.count); srsAnswer(first.key, true);
      const counted = before !== JSON.stringify(laneOrder()) + JSON.stringify(state.themeLane.count);
      const other = c.find(v => !menu.has(v.key)); srsAnswer(other.key, true); const otherCounted = (state.themeLane.count[vocabTheme(other)] || 0) === 1;
      state.stage = 'pre'; state.kanaKnown = false; DAILY_CACHE = null;
      const pre = newVocabCandidates(REG.vocab.filter(v => vocabEligibleForDaily(v, curLevel())), false).some(v => menu.has(v.key));
      return JSON.stringify({ at, first: jaPlain(first.w), counted, otherCounted, pre, words: menuLane()[1].length }); })()"""
    r = json.loads(ev(b, js))
    assert r['at'][:5] == [2, 5, 8, 11, 14] and r['first'] == '水' and not r['counted'] and r['otherCounted'] and not r['pre'] and r['words'] >= 30, r

# 2026-11-23 pictures: position words are asked among each other; a word that shows another's drawing (男 → 男の人) is kept from
# that drawing's look-alikes; a second reading of a drawn spelling (から, じょう) has no picture; 果物 is asked by its picture and
# never offered as a wrong option
def test_new_pictures_ask_fair_questions(b):
    js = """(() => { %s
      REG.vocab.filter(v => v.builtin && v.lv === 'N5').forEach(v => { state.srs[v.key] = rec(2); });
      const W = (w, r) => REG.vocab.find(v => v.builtin && jaPlain(v.w) === w && (!r || v.r === r));
      const opts = (w) => { const s = new Set(); for (let i = 0; i < 30; i++) makeVocabQuestion(W(w), { forceFmt: 'v-pic', kana: false }).options.forEach(o => s.add(jaPlain(o.text))); s.delete(w); return [...s]; };
      const ushiro = opts('後ろ'), teacher = opts('先生'), apple = opts('りんご');
      return JSON.stringify({ ushiro, posOnly: ushiro.every(w => POSITION_WORDS.has(w)), teacherMan: teacher.filter(w => ['男', '男の人', '会社員'].includes(w)),
        appleFruit: apple.includes('果物'), fruit: makeVocabQuestion(W('果物'), { forceFmt: 'v-pic', kana: false }).fmt,
        kara: picKey(W('空', 'から')), sora: picKey(W('空', 'そら')), jou: picKey(W('上', 'じょう')), ue: picKey(W('上', 'うえ')),
        verb: vocabFormats(W('食べる')).some(([f]) => f === 'v-pic'), n: REG.vocab.filter(v => v.builtin && picKey(v)).length }); })()""" % REC
    r = json.loads(ev(b, js))
    assert r['posOnly'] and len(r['ushiro']) >= 3 and r['teacherMan'] == [] and not r['appleFruit'] and r['fruit'] == 'v-pic', r
    assert r['kara'] == '' and r['sora'] == '空' and r['jou'] == '' and r['ue'] == '上' and r['verb'] and r['n'] >= 535, r   # 538 on 2026-11-23 (the second readings of 空 上 下 中 have none)

TESTS = [test_a_see_through_word_is_asked_by_its_reading_and_a_false_friend_by_its_kanji, test_the_spelling_tiles_hold_the_kana_a_word_is_mixed_up_with,
         test_a_fill_in_with_no_other_format_is_spelled_with_tiles, test_a_paraphrase_asks_the_words_own_example_with_its_marked_part_underlined,
         test_the_reading_passage_comes_in_the_middle_of_a_set_away_from_listening, test_ten_right_in_a_row_glow_and_a_retry_answered_right_says_it_is_remembered,
         test_pairs_in_match_and_tiles_on_the_line_make_small_sounds, test_the_paraphrase_checker_passes_a_good_item_and_names_each_problem,
         test_every_paraphrase_in_the_bank_builds_its_question, test_the_menus_words_come_in_a_lane_of_their_own,
         test_new_pictures_ask_fair_questions]

if __name__ == "__main__":
    srv = subprocess.Popen([sys.executable, os.path.join(ROOT, "tests", "e2e", "serve.py"), str(PORT), "--bind", "127.0.0.1"], cwd=ROOT, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
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
