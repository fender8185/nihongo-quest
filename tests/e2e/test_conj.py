"""2026-10-28: 活用題輸入模式（假名磁貼／鍵盤）與生成式變化練習。"""
import json, os, subprocess, sys, time
sys.path.insert(0, os.path.dirname(__file__))
from cdp import Browser
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
PORT = 8797
URL = f"http://127.0.0.1:{PORT}/"
READY = "typeof state === 'object' && !!state.updatedAt && typeof speakScript === 'function'"

def ev(b, js, pre=()):
    return b.run([("nav", URL), ("wait", READY)] + list(pre) + [("eval", js)])[-1]

def test_conj_match_accepts_kana_kanji_katakana_and_spaces(b):
    js = """JSON.stringify({
      a: conjMatch('いって', '行って'), b: conjMatch('行って', '行って'), c: conjMatch('　イッテ ', '行って'),
      d: conjMatch('いきて', '行って'), e: conjMatch('こない', '来[こ]ない'), f: conjMatch('来ない', '来[こ]ない'),
      g: conjMatch('', '行って'), h: conjMatch('べんきょうして', '勉強して'),
      k: answerKana('勉強して'), d1: firstDiff('行いて', '行って'), d2: firstDiff('行って', '行って') })"""
    r = json.loads(ev(b, js))
    assert r['a'] and r['b'] and r['c'] and not r['d'] and r['e'] and r['f'] and not r['g'] and r['h'], r
    assert r['k'] == 'べんきょうして' and r['d1'] == 1 and r['d2'] == -1, r

def test_conj_tiles_keep_kanji_runs_whole_and_add_wrong_kana(b):
    js = """(() => { const t1 = conjTokens('来[こ]ない'), t2 = conjTokens('勉強して');
      const tiles = conjTiles('行って', JConj.verbDistractors('行く', '5', 'te', '行って'));
      return JSON.stringify({ t1, t2, n: tiles.length, has: ['行', 'っ', 'て'].every(x => tiles.includes(x)), extra: tiles.filter(x => !['行', 'っ', 'て'].includes(x)) }); })()"""
    r = json.loads(ev(b, js))
    assert r['t1'] == ['来[こ]', 'な', 'い'] and r['t2'] == ['勉強', 'し', 'て'], r
    assert r['has'] and 3 <= len(r['extra']) <= 4 and r['n'] == 3 + len(r['extra']), r

# ---- Task 2: 活用題輸入格式（磁貼／鍵盤） ----
CONJ_ITEM = "REG.grammar.find(g => g.t === 'conj' && g.g === '5' && g.f === 'te')"
def setup(mode):   # 一題て形五段動詞，已答對一次（b = 1），指定作答方式，開一場 items 練習
    return f"""const g = {CONJ_ITEM}; state.settings.conjInput = '{mode}'; srsAnswer(g.key, true); state.srs[g.key].b = 1;
      startSession('items', {{ items: [g] }}); const e = currentEntry(); e.q = makeGrammarQuestion(g, {{}}); renderPractice(); const q = e.q;
      const ans = JConj.conjVerb(g.v, g.g, g.f);"""
TEARDOWN = "SESSION = null; document.body.classList.remove('practicing');"

def test_learned_conj_item_is_asked_with_tiles_and_tapping_the_answer_is_right(b):
    js = "(() => { " + setup('auto') + """
      const out = { fmt: q.fmt, custom: q.custom, mode: q.inputMode, opts: document.querySelectorAll('.opt').length, tiles: document.querySelectorAll('.conj-tile').length, n: q.tiles.length, noBracket: ![...document.querySelectorAll('.conj-tile')].some(t => t.textContent.includes('[')) };
      for (const tok of conjTokens(ans)) { [...document.querySelectorAll('.conj-tile:not([disabled])')].find(t => t.dataset.tok === tok).click(); }
      out.done = e.done; out.ok = e.chosen === q.answer; out.gf = state.srs[g.key].gf['g-conj-type']; out.sf = state.statsFmt['g-conj-type'];
      """ + TEARDOWN + " return JSON.stringify(out); })()"
    r = json.loads(ev(b, js, [("eval", "location.hash = '#/today'; true")]))
    assert r['fmt'] == 'g-conj-type' and r['custom'] == 'g-conj-type' and r['mode'] == 'tiles' and r['opts'] == 0 and r['tiles'] == r['n'] and r['noBracket'], r
    assert r['done'] and r['ok'] and r['gf'] == [1, 0] and r['sf'] == {'ok': 1, 'ng': 0}, r

def test_new_item_or_choice_setting_keeps_four_options(b):
    js = f"""(() => {{ const g = {CONJ_ITEM}; state.settings.conjInput = 'auto'; const q1 = makeGrammarQuestion(g, {{}});
      srsAnswer(g.key, true); state.srs[g.key].b = 1; state.settings.conjInput = 'choice'; const q2 = makeGrammarQuestion(g, {{}});
      state.settings.conjInput = 'tiles'; const q3 = makeGrammarQuestion(g, {{ forceFmt: 'g-conj' }});
      return JSON.stringify({{ f1: q1.fmt, f2: q2.fmt, f3: q3.fmt, o: q2.options.length }}); }})()"""
    r = json.loads(ev(b, js))
    assert r == {'f1': 'g-conj', 'f2': 'g-conj', 'f3': 'g-conj', 'o': 4}, r

def test_typing_mode_accepts_kana_and_marks_the_first_wrong_character(b):
    js = "(() => { " + setup('type') + """
      const inp = document.querySelector('input.conj-in'); const out = { mode: q.inputMode, hasInput: Boolean(inp), tiles: document.querySelectorAll('.conj-tile').length };
      inp.value = '　' + answerKana(ans) + ' '; document.querySelector('[data-act=conj-submit]').click(); out.ok1 = e.done && e.chosen === q.answer;
      // 第二場：故意打錯（包在區塊裡，避免 const 重複宣告）
      """ + TEARDOWN + " { " + setup('type') + """
      const bad = answerKana(ans).slice(0, -1) + 'た'; document.querySelector('input.conj-in').value = bad; document.querySelector('[data-act=conj-submit]').click();
      out.ok2 = e.chosen === q.answer; out.head = (() => { const el = document.querySelector('.fb-head').cloneNode(true); el.querySelectorAll('rt').forEach(r => r.remove()); return el.textContent.includes(jaPlain(ans)); })(); out.diff = Boolean(document.querySelector('.fb-diff mark')); out.wrong = q.options[1].text === bad; }
      """ + TEARDOWN + " return JSON.stringify(out); })()"
    r = json.loads(ev(b, js, [("eval", "location.hash = '#/today'; true")]))
    assert r['mode'] == 'type' and r['hasInput'] and r['tiles'] == 0 and r['ok1'], r
    assert not r['ok2'] and r['head'] and r['diff'] and r['wrong'], r

def test_give_up_and_empty_submit(b):
    js = "(() => { " + setup('type') + """
      document.querySelector('[data-act=conj-submit]').click(); const stillOpen = !e.done;
      document.querySelector('[data-act=custom-giveup]').click(); const out = { stillOpen, done: e.done, ok: e.chosen === q.answer, mistakes: state.mistakes.filter(m => m.key === g.key).length };
      """ + TEARDOWN + " return JSON.stringify(out); })()"
    r = json.loads(ev(b, js, [("eval", "location.hash = '#/today'; true")]))
    assert r['stillOpen'] and r['done'] and not r['ok'] and r['mistakes'] == 1, r

def test_identify_variant_still_appears_under_tiles_setting(b):
    js = f"""(() => {{ const g = {CONJ_ITEM}; state.settings.conjInput = 'tiles'; srsAnswer(g.key, true); state.srs[g.key].b = 3;
      const r0 = Math.random; Math.random = () => 0; const q = makeGrammarQuestion(g, {{}}); Math.random = r0; return q.fmt; }})()"""
    assert ev(b, js) == 'g-identify'

def test_settings_page_no_longer_offers_the_input_mode(b):
    js = "(() => { openSettings('learn'); const s = document.querySelector('select[data-key=conjInput]'); const out = s ? [...s.options].map(o => o.value) : null; closeModal(); return JSON.stringify(out); })()"
    assert json.loads(ev(b, js)) is None

# ---- Task 3: 再練一次／換個方式再考沿用輸入版 ----
def test_new_conj_item_answered_right_comes_back_typed_and_a_typed_miss_requeues_typed(b):
    js = f"""(() => {{ const g = {CONJ_ITEM}; state.settings.conjInput = 'auto';
      startSession('items', {{ items: [g, g, g, g, g, g, g, g, g, g, g, g] }}); const e = currentEntry(); e.q = makeGrammarQuestion(g, {{}}); renderPractice();
      answerCurrent(e.q.answer);   // 新題四選一答對 → 排一個 encore
      const enc = SESSION.entries.find(x => x.encore); const r0 = Math.random; Math.random = () => 0;   // 0 would pick the 辨識 variant: the encore must still be the spelled one
      if (enc) prepareEntry(SESSION.entries.indexOf(enc)); Math.random = r0;
      const out = {{ first: e.q.fmt, encore: enc ? enc.q && enc.q.fmt : null }};
      {TEARDOWN}
      // 第二場：輸入版答錯 → 再練一次仍是輸入版
      state.srs[g.key].b = 1; startSession('items', {{ items: [g, g, g, g, g, g, g] }}); const e2 = currentEntry(); e2.q = makeGrammarQuestion(g, {{}}); renderPractice();
      e2.q.options[1].text = 'x'; answerCurrent(1);
      const rq = SESSION.entries.find(x => x.requeued); prepareEntry(SESSION.entries.indexOf(rq));
      out.second = e2.q.fmt; out.requeued = rq.q.fmt; out.rqCustom = rq.q.custom;
      state.settings.conjInput = 'choice'; out.noFormats = grammarHasFormats(g);
      {TEARDOWN} return JSON.stringify(out); }})()"""
    r = json.loads(ev(b, js, [("eval", "location.hash = '#/today'; true")]))
    assert r['first'] == 'g-conj' and r['encore'] == 'g-conj-type', r
    assert r['second'] == 'g-conj-type' and r['requeued'] == 'g-conj-type' and r['rqCustom'] == 'g-conj-type' and r['noFormats'] is False, r

# ---- Task 4: 生成式變化練習（kind c） ----
def test_drills_exist_per_form_family_and_reach_follows_the_unit(b):
    js = """(() => { const fams = REG.drills.map(d => d.fam).sort(); const te = REG.drills.find(d => d.fam === 'te');
      state.currentUnit = 'm3'; const p3 = computeDailyPlan(); state.currentUnit = 'm18'; const p18 = computeDailyPlan();
      return JSON.stringify({ fams, teUnit: te && te.u, teForms: te && te.forms, byKey: Boolean(REG.byKey.get('c:te')), n3: p3.newC.map(d => d.fam), n18: p18.newC.length, cap: newQuota('c') }); })()"""
    r = json.loads(ev(b, js))
    assert set(r['fams']) >= {'te', 'ta', 'nai', 'pot', 'vol', 'pass', 'caus', 'ba'} and 'dict' not in r['fams'], r
    assert r['teUnit'] == 'm3' and 'te' in r['teForms'] and r['byKey'], r
    assert set(r['n3']) <= {'te', 'masu', 'nai', 'ta'} and 1 <= len(r['n3']) <= 3 and r['n18'] == 3 and r['cap'] == 3, r

def test_drill_question_is_generated_from_a_learned_verb_and_a_miss_schedules_tomorrow(b):
    js = """(() => { const d = REG.drills.find(x => x.fam === 'te'); state.currentUnit = 'm18';
      const fresh = makeQuestion(d, {});   // 還沒學過任何動詞：退回全部動詞，仍要能出題
      const v = REG.vocab.find(x => x.builtin && x.p === 'v5'); srsAnswer(v.key, true); state.srs[v.key].b = 2;
      const qs = []; for (let i = 0; i < 20; i++) qs.push(makeQuestion(d, {}));
      const q = qs[0]; const ok = qs.every(x => x && x.kind === 'c' && x.custom === 'g-conj-type' && x.key === 'c:te' && x.options[0].text && x.tiles.length >= conjTokens(x.options[0].text).length + 3);
      const verbs = new Set(qs.map(x => x.item && x.stemHtml));
      startSession('items', { items: [d] }); const e = currentEntry(); renderPractice(); e.q.options[1].text = 'x'; answerCurrent(1);
      const r = state.srs['c:te']; const m = state.mistakes.find(x => x.key === 'c:te'); const faces = mistakeCardFaces(m);
      const mq = buildMistakeQueue(5).find(x => x.item && x.item.key === 'c:te'); const mqq = mq && makeQuestion(mq.item, {});
      const out = { fresh: Boolean(fresh), ok, varied: verbs.size >= 2, due: r.due, tomorrow: todayStr(1), rl: r.rl, mistake: Boolean(m), prompt: m && m.prompt, faces: Boolean(faces && faces.front && faces.back), mqq: Boolean(mqq && mqq.kind === 'c'), label: q.label, newC: state.today.newC, log: logEntry().grammarCount };
      SESSION = null; document.body.classList.remove('practicing'); return JSON.stringify(out); })()"""
    r = json.loads(ev(b, js, [("eval", "location.hash = '#/today'; true")]))
    assert r['fresh'] and r['ok'] and r['varied'], r
    assert r['due'] == r['tomorrow'] and r['rl'] == 0 and r['mistake'] and '→' in r['prompt'] and r['faces'] and r['mqq'], r
    assert r['label'].startswith('變化練習 · て形') and r['newC'] == 1 and r['log'] == 1, r

def test_daily_queue_carries_the_drills_and_the_today_page_counts_them(b):
    js = """(() => { state.currentUnit = 'm18'; delete state.today.plan; const dq = dailyQueue(60); const c = dq.items.filter(x => x.kind === 'c').length; const plan = dq.plan;   // 60: one session big enough for the whole day list
      location.hash = '#/today'; route(); const txt = document.querySelector('#view').textContent;
      return JSON.stringify({ c, newC: plan.newC.length, remaining: plan.remaining >= plan.newC.length, shows: txt.includes('變化') }); })()"""
    r = json.loads(ev(b, js))
    assert r['c'] >= 1 and r['c'] <= 3 and r['newC'] == r['c'] and r['remaining'] and r['shows'], r

# ---- Final review fixes ----
def test_previous_question_format_does_not_change_the_answer_mode_of_an_ordinary_item(b):
    # prepareEntry passes avoidFmt: SESSION.lastFmt (a string) for every ordinary question; only an encore may steer the mode
    js = f"""(() => {{ const g = {CONJ_ITEM}; const out = {{}};
      state.settings.conjInput = 'auto'; out.newAfterChoice = makeGrammarQuestion(g, {{ avoidFmt: 'g-conj' }}).fmt;
      srsAnswer(g.key, true); state.srs[g.key].b = 1;
      out.learnedAfterTyped = makeGrammarQuestion(g, {{ avoidFmt: 'g-conj-type' }}).fmt;
      state.settings.conjInput = 'tiles'; const q = makeGrammarQuestion(g, {{ avoidFmt: 'g-conj-type' }}); out.tilesAfterTyped = q && q.fmt;
      state.settings.conjInput = 'type'; const q2 = makeGrammarQuestion(g, {{ avoidFmt: 'g-conj-type' }}); out.typeAfterTyped = q2 && q2.fmt;
      out.encoreStill = makeGrammarQuestion(g, {{ encore: true, avoidFmts: ['g-conj-type'], avoidFmt: ['g-conj-type'] }});
      return JSON.stringify(out); }})()"""
    r = json.loads(ev(b, js))
    assert r['newAfterChoice'] == 'g-conj' and r['learnedAfterTyped'] == 'g-conj-type', r
    assert r['tilesAfterTyped'] == 'g-conj-type' and r['typeAfterTyped'] == 'g-conj-type' and r['encoreStill'] is None, r

def test_drill_cap_counts_what_was_answered_today(b):
    js = """(() => { state.currentUnit = 'm18'; state.settings.conjDrillPerDay = 3; const t = todayStr();
      REG.drills.forEach(d => { srsAnswer(d.key, true); state.srs[d.key].due = t; state.srs[d.key].last = addDays(t, -3); });   // every family due today
      state.today.ans = []; delete state.today.plan;   // the set-up answers belong to earlier days
      const p1 = dailyPlan(); const first = p1.dueC.length;
      p1.dueC.slice(0, 2).forEach(d => srsAnswer(d.key, true));   // two answered today
      const p2 = dailyPlan();
      return JSON.stringify({ first, second: p2.dueC.length, newC: p2.newC.length }); })()"""
    r = json.loads(ev(b, js))
    assert r == {'first': 3, 'second': 1, 'newC': 0}, r

def test_enter_during_ime_composition_does_not_submit(b):
    js = "(() => { " + setup('type') + """
      const inp = document.querySelector('input.conj-in'); inp.value = 'いっ';
      inp.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', isComposing: true, bubbles: true })); const open1 = !e.done;
      inp.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', keyCode: 229, bubbles: true })); const open2 = !e.done;
      inp.value = answerKana(ans); inp.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); const out = { open1, open2, done: e.done, ok: e.chosen === q.answer };
      """ + TEARDOWN + " return JSON.stringify(out); })()"
    r = json.loads(ev(b, js, [("eval", "location.hash = '#/today'; true")]))
    assert r['open1'] and r['open2'] and r['done'] and r['ok'], r

def test_first_wrong_character_is_found_against_the_kana_answer_when_kana_was_typed(b):
    js = "(() => { " + setup('type') + """
      const kana = answerKana(ans); const bad = kana.slice(0, -1) + (kana.endsWith('た') ? 'て' : 'た');   // 行って → いった: only the last kana differs
      document.querySelector('input.conj-in').value = bad; document.querySelector('[data-act=conj-submit]').click();
      const mark = document.querySelector('.fb-diff mark'); const out = { marked: mark && mark.textContent, expected: bad.slice(-1), ok: e.chosen === q.answer };
      """ + TEARDOWN + " return JSON.stringify(out); })()"
    r = json.loads(ev(b, js, [("eval", "location.hash = '#/today'; true")]))
    assert not r['ok'] and r['marked'] == r['expected'], r

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
