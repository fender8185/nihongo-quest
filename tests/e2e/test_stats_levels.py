"""1.0.26: 學習分析的總進度分四種範圍、過去 7 天、最近 100 題正確率、課程進度推估與考試目標級別。"""
import json, os, subprocess, sys, time
sys.path.insert(0, os.path.dirname(__file__))
from cdp import Browser
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
PORT = 8802
URL = f"http://127.0.0.1:{PORT}/"
READY = "typeof state === 'object' && !!state.updatedAt && typeof speakScript === 'function'"

def ev(b, js, pre=()):
    return b.run([("nav", URL), ("wait", READY)] + list(pre) + [("eval", js)])[-1]

# a main-course account at week 1 with nothing learned yet
FRESH = "state.stage = 'main'; state.kanaKnown = true; state.introSeen = true; state.startChosen = true; state.currentUnit = 'm1'; saveState(); DAILY_CACHE = null;"

# ---- 總進度: 總進度／入門／N5／N4 ----
def test_each_scope_shows_its_banks_and_totals(b):
    js = "(() => { " + FRESH + """ location.hash = '#/stats'; route();
      const pick = (s) => { document.querySelector(`[data-act=stats-scope][data-scope=${s}]`).click();
        return [...document.querySelectorAll('#progressCard .gauge')].map(g => [g.dataset.kind, +g.dataset.total, !!g.querySelector('.tick'), g.querySelector('.hero-l').textContent]); };   // 1.0.27: the bank's name sits under the %
      const n5u = new Set(DATA.UNITS.filter(u => u.lv === 'N5').map(u => u.id)), n4u = new Set(DATA.UNITS.filter(u => u.lv === 'N4').map(u => u.id));
      const V = REG.vocab.filter(v => v.builtin), LR = REG.listen.concat(REG.read), G = REG.grammar;
      const want = {
        all: [['v', V.length, true, '單字'], ['g', G.length, true, '文法'], ['lr', LR.length, true, '聽力＋閱讀'], ['k', REG.kanji.length, true, '漢字']],
        pre: [['a', REG.kana.length, false, '假名'], ['v', V.filter(v => v.lv === 'PRE_N5').length, false, '入門單字'], ['g', G.filter(g => g.u === 'm0').length, false, '入門文法']],
        n5: [['v', V.filter(v => v.lv === 'N5').length, false, '單字'], ['g', G.filter(g => n5u.has(g.u)).length, false, '文法'], ['lr', LR.filter(x => x.lv === 'N5').length, false, '聽力＋閱讀'], ['k', REG.kanji.filter(k => k.lv === 'N5').length, false, '漢字']],
        n4: [['v', V.filter(v => v.lv === 'N4').length, false, '單字'], ['g', G.filter(g => n4u.has(g.u)).length, false, '文法'], ['lr', LR.filter(x => x.lv === 'N4').length, false, '聽力＋閱讀'], ['k', REG.kanji.filter(k => k.lv === 'N4').length, false, '漢字']] };
      const got = {}; ['pre', 'n5', 'n4', 'all'].forEach(s => { got[s] = pick(s); });
      const part = (i, j) => want.n5[i][1] + want.n4[i][1] + (j === null ? 0 : want.pre[j][1]) === want.all[i][1];   // every item is in one level view
      return JSON.stringify({ got, want, part: [part(0, 1), part(1, 2), part(2, null), part(3, null)] }); })()"""
    r = json.loads(ev(b, js))
    assert r['got'] == r['want'], r
    assert r['part'] == [True, True, True, True], r['part']

# 1.0.27: the three colours are explained once, in the card's head, and the gauges' tips use the same names; the grey part tells what is left
G6 = """state.srs = {}; const t = todayStr(); const rec = (ok) => ({ b: 1, due: t, n: Math.max(1, ok), ok, ng: 0, s: 1, d: 5, last: t, intro: t });
  REG.grammar.slice(0, 6).forEach((g, i) => { state.srs[g.key] = rec([3, 1, 1, 0, 0, 0][i]); });"""   # 文法: 1 已熟練, 2 熟悉, 3 已學

def test_the_card_head_explains_the_gauge_colours(b):
    js = "(() => { " + FRESH + G6 + """ location.hash = '#/stats'; route(); const card = document.getElementById('progressCard');
      const legend = [...card.querySelector('.card-head').querySelectorAll('.seg-dot')].map(d => [d.parentElement.textContent.trim(), getComputedStyle(d).backgroundColor]);
      const arcs = {}; card.querySelectorAll('.gauge[data-kind="g"] path.arc').forEach(p => { arcs[p.classList[1]] = getComputedStyle(p).stroke; });
      return JSON.stringify({ legend, arcs }); })()"""
    r = json.loads(ev(b, js))
    assert [l for l, c in r['legend']] == ['已熟練', '熟悉', '已學'], r
    assert [c for l, c in r['legend']] == [r['arcs']['mastered'], r['arcs']['learned'], r['arcs']['seen']], r

def test_gauge_tips_use_the_legend_names_and_the_grey_part_tells_what_is_left(b):
    js = "(() => { " + FRESH + G6 + """ location.hash = '#/stats'; route(); const g = document.querySelector('#progressCard .gauge[data-kind="g"]'); const tr = g.querySelector('.track');
      return JSON.stringify({ arcs: [...g.querySelectorAll('path.arc')].map(p => p.dataset.tipTitle), track: [tr.dataset.tipTitle, tr.dataset.tipBody], total: REG.grammar.length }); })()"""
    r = json.loads(ev(b, js))
    assert r['arcs'] == ['已熟練：1', '熟悉：2', '已學：3'], r
    assert r['track'] == ['未學：%d' % (r['total'] - 6), '共 %d' % r['total']], r

def test_the_scope_is_kept_while_the_app_is_open(b):
    js = "(() => { " + FRESH + """ location.hash = '#/stats'; route(); document.querySelector('[data-act=stats-scope][data-scope=n5]').click();
      location.hash = '#/today'; route(); location.hash = '#/stats'; route();
      return document.querySelector('[data-act=stats-scope][aria-pressed=true]').dataset.scope; })()"""
    assert ev(b, js) == 'n5'

def test_listening_and_reading_steps_follow_right_answers(b):
    js = "(() => { " + FRESH + """ state.srs = {}; const t = todayStr(); const [a, c, d] = REG.listen.slice(0, 3); const e = REG.read[0];
      const rec = (ok, n) => ({ b: 1, due: addDays(t, 7), n, ok, ng: n - ok, s: 2, d: 5, last: addDays(t, -1) });
      state.srs[a.key] = rec(0, 1); state.srs[c.key] = rec(1, 1); state.srs[d.key] = rec(2, 2); state.srs[e.key] = rec(1, 2);
      const x = progressTotals('lr'); return JSON.stringify([x.seen, x.learned, x.mastered]); })()"""
    assert json.loads(ev(b, js)) == [1, 2, 1]

def test_ai_made_grammar_counts_in_its_units_level(b):   # Review Focus 5
    js = "(() => { " + FRESH + """ const n = (s) => progressTotals('g', s).total; const before = ['all', 'n5', 'n4', 'pre'].map(n);
      state.customGrammar = [{ id: 'ai-n5', u: 'm3' }, { id: 'ai-x', u: 'zz' }]; buildRegistry();
      return JSON.stringify(['all', 'n5', 'n4', 'pre'].map((s, i) => n(s) - before[i])); })()"""
    assert json.loads(ev(b, js)) == [2, 1, 0, 0]

# ---- 過去 7 天: 合計、平均、比前 7 天＋趨勢線＋占比; 最近 100 題正確率 ----
WEEK = """const t = todayStr(); state.dailyLogs = {};
  const put = (i, v, g, q) => { const d = addDays(t, -i); state.dailyLogs[d] = { date: d, vocabCount: v, grammarCount: g, quizCount: q, bonusCount: 0, minutes: 0, topics: [] }; };
  const V = [10, 0, 20, 5, 30, 15, 8], G = [4, 0, 6, 2, 10, 5, 2], Q = [1, 0, 2, 0, 3, 1, 1];   // six days ago … today
  V.forEach((v, i) => put(6 - i, v, G[i], Q[i]));"""
PREV = lambda mul: "[20, 10, 15, 15, 10, 20, 10].forEach((v, i) => put(13 - i, v * %s, 0, 0));" % mul   # the week before: 100 × mul

def test_week_card_sums_seven_days_and_compares_with_the_week_before(b):
    js = "(() => { " + FRESH + WEEK + PREV('1') + """ saveState(); location.hash = '#/stats'; route(); const c = document.getElementById('weekCard');
      const dots = [...c.querySelectorAll('.week-dot')]; const md = (i) => { const d = addDays(t, -i); return d.slice(5).replace('-', '/') + '（' + '日一二三四五六'[parseDate(d).getDay()] + '）'; };
      return JSON.stringify({ s: weekSummary(), stats: [...c.querySelectorAll('.week-stat-v')].map(x => x.textContent.trim()), up: c.querySelectorAll('.week-stat-v')[2].classList.contains('up'),
        share: c.querySelector('.week-share-l').textContent, n: dots.length, today: dots[6].classList.contains('today'),
        peak: [dots[4].dataset.tipTitle, dots[4].dataset.tipBody], rest: dots[1].dataset.tipTitle, wantPeak: md(2) + '：43 題', wantRest: md(5) + '：沒有練習', last: dots[6].dataset.tipTitle,
        rows: c.querySelectorAll('details tbody tr').length }); })()"""
    r = json.loads(ev(b, js))
    assert r['s']['total'] == 125 and r['s']['avg'] == 18 and r['s']['change'] == 25 and r['s']['share'] == {'v': 88, 'g': 29, 'q': 8}, r['s']
    assert r['stats'] == ['125', '18', '+25%'] and r['up'] and r['share'] == '單字 70%・文法 23%・其他 6%', r
    assert r['n'] == 7 and r['today'] and r['peak'] == [r['wantPeak'], '單字 30・文法 10・其他 3'] and r['rest'] == r['wantRest'] and r['last'] == '今天：11 題' and r['rows'] == 7, r

def test_week_card_shows_a_dash_without_the_week_before_and_a_plain_drop(b):
    js = "(() => { " + FRESH + WEEK + """ saveState(); location.hash = '#/stats'; route(); const change = () => document.querySelectorAll('#weekCard .week-stat-v')[2];
      const dash = change().textContent.trim(); """ + PREV('2.5') + """ saveState(); route();   // the week before: 250, so 125 is half of it
      return JSON.stringify({ dash, drop: change().textContent.trim(), up: change().classList.contains('up') }); })()"""
    assert json.loads(ev(b, js)) == {'dash': '—', 'drop': '−50%', 'up': False}

def test_week_card_without_practice_says_so(b):
    js = "(() => { " + FRESH + """ state.dailyLogs = {}; saveState(); location.hash = '#/stats'; route(); const c = document.getElementById('weekCard');
      return JSON.stringify({ stats: [...c.querySelectorAll('.week-stat-v')].map(x => x.textContent.trim()), empty: (c.querySelector('.week-empty') || {}).textContent, bar: !!c.querySelector('.week-share') }); })()"""
    assert json.loads(ev(b, js)) == {'stats': ['0', '0', '—'], 'empty': '這 7 天還沒有練習', 'bar': False}

def test_accuracy_tile_reads_the_last_hundred_answers(b):
    js = "(() => { " + FRESH + """ state.recent = Array(40).fill(0).concat(Array(60).fill(1)); saveState(); location.hash = '#/stats'; route();
      const l = [...document.querySelectorAll('.stat-l')].find(x => /正確率/.test(x.textContent)); return JSON.stringify([l.textContent, l.previousElementSibling.textContent]); })()"""
    assert json.loads(ev(b, js)) == ['最近 100 題正確率', '60%']

# ---- 設定 › 學習 › 考試: N5 or N4 and the date ----
def test_exam_row_has_the_level_and_the_date(b):
    js = """(() => { openSettings('learn'); const m = document.querySelector('.modal'); const sel = m.querySelector('select[data-key=examLevel]');
      const row = sel && sel.closest('.setting-row'); const out = { opts: sel ? [...sel.options].map(o => o.value) : null, value: sel && sel.value, date: !!(row && row.querySelector('input[data-key=examDate]')),
        label: row && row.querySelector('.label').textContent, hint: row && row.querySelector('.hint').textContent }; closeModal(true); return JSON.stringify(out); })()"""
    assert json.loads(ev(b, js)) == {'opts': ['N5', 'N4'], 'value': 'N4', 'date': True, 'label': '考試', 'hint': '學習分析和模擬考頁會照這個級別和日期推估進度。'}

def test_exam_level_is_n4_unless_n5_was_saved(b):
    js = """JSON.stringify([defaultSettings().examLevel, ...[{ examLevel: 'N3' }, { examLevel: 'N5' }, {}].map(s => normalizeState({ settings: s }).settings.examLevel)])"""
    assert json.loads(ev(b, js)) == ['N4', 'N4', 'N5', 'N4']

def test_picking_n5_saves_it(b):
    js = """(() => { openSettings('learn'); const sel = document.querySelector('select[data-key=examLevel]'); sel.value = 'N5'; sel.dispatchEvent(new Event('change', { bubbles: true }));
      closeModal(true); return state.settings.examLevel; })()"""
    assert ev(b, js) == 'N5'

# ---- coursePace: when N5 and N4 would be learned once, per bank (spec §5.2), and what to do when it is late ----
# seen(list): learned once; only(list): everything but these learned; pace(n): n new items a day for 14 days
PACE = """const seen = (list) => { const d = todayStr(); list.forEach(x => { state.srs[x.key] = { b: 2, due: addDays(d, 5), n: 1, ok: 1, ng: 0, s: 3, d: 5, last: addDays(d, -1), intro: addDays(d, -1) }; }); };
  const only = (keep) => { const k = new Set(keep.map(x => x.key)); seen(REG.vocab.filter(v => v.builtin && !k.has(v.key)).concat(REG.grammar.filter(g => !k.has(g.key)), REG.kanji.filter(x => !k.has(x.key)))); };
  const pace = (n) => { for (let i = 1; i <= 14; i++) state.dailyLogs[addDays(todayStr(), -i)] = { vocabCount: Math.round(n), fresh: n }; };   // answers are whole; a fractional pace is an average
  const w5 = REG.vocab.filter(v => v.builtin && v.lv === 'N5').slice(0, 30), w4 = REG.vocab.filter(v => v.builtin && v.lv === 'N4').slice(0, 60);
  const g5 = REG.grammar.filter(g => DATA.UNITS.some(u => u.id === g.u && u.lv === 'N5')).slice(0, 20);
  const T = todayStr(); const sl = (n) => addDays(T, n).replace(/-/g, '/'); const exam = (n) => { state.settings.examDate = addDays(T, n); };"""

def test_course_pace_finds_the_slowest_bank(b):
    js = "(() => { " + FRESH + PACE + """ pace(10); exam(51); const out = [];
      only(w5); out.push(coursePace().days); state.srs = {}; only(w5.concat(w4)); out.push(coursePace().days); state.srs = {}; only(w5.concat(w4, g5)); out.push(coursePace().days);
      return JSON.stringify(out); })()"""
    assert json.loads(ev(b, js)) == [{'N5': 3, 'N4': 3}, {'N5': 3, 'N4': 9}, {'N5': 11, 'N4': 11}]

def test_course_text_when_on_time_and_when_late(b):
    js = "(() => { " + FRESH + PACE + """ pace(10); only(w5.concat(w4, g5)); const out = {}; const run = (n, lv) => { exam(n); state.settings.examLevel = lv; const p = coursePace(); return [p.state, p.need || null, p.plan || null, courseText(p)]; };
      out.ok = run(51, 'N4'); out.daily = run(26, 'N4'); out.every = run(30, 'N4'); out.twice = run(24, 'N4'); out.heavy = run(22, 'N4'); out.heavy5 = run(22, 'N5');
      return JSON.stringify({ out, round: dailyPlan().n, f: sl(11), d: [sl(30), sl(5)] }); })()"""
    r = json.loads(ev(b, js)); o = r['out']; f = r['f']
    assert r['round'] == 15, r
    assert o['ok'][0] == 'ok' and o['ok'][3] == f'照最近每天約 10 題新內容的速度，預計 {f} 學完 N4 的單字、文法、漢字，比 {r["d"][0]}（考前三週）早 19 天。', o['ok']
    assert o['daily'][:3] == ['late', 22, {'every': 1}] and o['daily'][3] == f'照最近每天約 10 題新內容的速度，預計 {f} 學完 N4 的單字、文法、漢字，比 {r["d"][1]}（考前三週）晚 6 天。要趕上，每天約需 22 題新內容（現在約 10 題）：每天做完當天的練習後按 1 次加練就趕得上。', o['daily']
    assert o['every'][1:3] == [13, {'every': 5}] and o['every'][3].endswith('要趕上，每天約需 13 題新內容（現在約 10 題）：大約每 5 天，做完當天的練習後按 1 次加練就趕得上。'), o['every']
    assert o['twice'][1:3] == [37, {'times': 2}] and o['twice'][3].endswith('要趕上，每天約需 37 題新內容（現在約 10 題）：每天做完當天的練習後按 2 次加練就趕得上。'), o['twice']
    assert o['heavy'][1:3] == [110, {'times': 7, 'heavy': True}] and o['heavy'][3].endswith('要趕上，每天約需 110 題新內容（現在約 10 題），等於每天加練 7 次，太吃力了：可以考慮先考 N5，或把考試日期往後延（JLPT 每年 7 月、12 月各一次）。'), o['heavy']
    assert '學完 N5 的' in o['heavy5'][3] and o['heavy5'][3].endswith('等於每天加練 7 次，太吃力了：可以考慮把考試日期往後延（JLPT 每年 7 月、12 月各一次）。'), o['heavy5']

def test_course_text_for_a_passed_or_close_exam_and_a_finished_level(b):   # Review Focus 2: 21 days is close, 22 is not
    js = "(() => { " + FRESH + PACE + """ pace(10); const out = {}; const run = (n, lv) => { exam(n); state.settings.examLevel = lv; const p = coursePace(); return [p.state, courseText(p)]; };
      only(w5.concat(w4, g5)); out.passed = run(-1, 'N4'); out.close = run(21, 'N4'); out.notClose = run(22, 'N4')[0];
      state.srs = {}; only(w4); out.done5 = run(51, 'N5'); state.srs = {}; only([]); out.done4 = run(51, 'N4');
      return JSON.stringify({ out, n4: sl(6) }); })()"""
    r = json.loads(ev(b, js)); o = r['out']
    assert o['passed'] == ['passed', '考試日期已經過了。到設定裡改成下一次的日期，這裡會重新計算。'], o
    assert o['close'] == ['close', '距離考試只剩 21 天，不到三週：建議只做每天的練習與模擬考。'] and o['notClose'] == 'late', o
    assert o['done5'] == ['done', f'N5 的單字、文法、漢字都學過一次了：接下來照複習排程走，考前三週做模擬考。照現在的速度，預計 {r["n4"]} 學完 N4。'], o
    assert o['done4'] == ['done', '單字、文法、漢字都學過一次了：接下來照複習排程走，考前三週做模擬考。'], o

def test_course_pace_falls_back_to_the_days_count_without_new_items(b):
    js = "(() => { " + FRESH + PACE + """ for (let i = 1; i <= 14; i++) state.dailyLogs[addDays(T, -i)] = { vocabCount: 5, fresh: 0 }; exam(400);
      const p = coursePace(); return JSON.stringify([p.fallback, p.perDay, courseText(p)]); })()"""
    fb, per, text = json.loads(ev(b, js))
    assert fb is True and per == 15 and text.startswith('最近 14 天沒有學新內容，照每天排到的 15 題新內容推算，預計 ') and not any(s in text for s in ['null', 'NaN', 'undefined']), text

def test_course_pace_in_the_intro_stage_adds_what_is_left_of_it(b):
    js = "(() => { " + FRESH + PACE + """ state.stage = 'pre'; pace(10); exam(400); only(w5);
      seen(REG.kana.slice(20)); seen(REG.vocab.filter(v => v.builtin && v.lv === 'PRE_N5')); seen(REG.grammar.filter(g => g.u === 'm0'));   // 20 kana left
      return JSON.stringify([introLeft(), coursePace().days]); })()"""
    assert json.loads(ev(b, js)) == [0, {'N5': 5, 'N4': 5}]

# ---- 課程進度 card (學完的預估 merged in), the exam countdown and the AI advice follow the target level ----
def test_course_card_shows_both_levels_and_the_target(b):
    js = "(() => { " + FRESH + PACE + """ pace(10); exam(51); only(w5.concat(w4)); saveState(); location.hash = '#/stats'; route(); const c = document.getElementById('courseCard');
      const row = (lv) => c.querySelector(`.course-row[data-level=${lv}]`).textContent.replace(/\\s+/g, ' ');
      return JSON.stringify({ chip: c.querySelector('.card-head .chip').textContent, sub: c.querySelector('.course-sub').textContent, n5: row('N5'), n4: row('N4'), want: [sl(3), sl(9)],
        dots: [...c.querySelectorAll('.course-dot')].map(x => x.dataset.level), advice: !!c.querySelector('.course-advice'), old: !!document.getElementById('planAdvice') }); })()"""
    r = json.loads(ev(b, js))
    assert r['chip'] == '趕得上' and '目標 N4' in r['sub'] and '照最近 14 天每天約 10 題新內容推算' in r['sub'], r
    assert f"預計 {r['want'][0]} 學過一次" in r['n5'] and '還有 30 題' in r['n5'] and f"預計 {r['want'][1]} 學過一次" in r['n4'] and '還有 90 題' in r['n4'] and '目標，比期限早 21 天' in r['n4'], r
    assert r['dots'] == ['N5', 'N4'] and not r['advice'] and not r['old'], r

def test_course_card_gives_extra_practice_advice_when_late(b):
    js = "(() => { " + FRESH + PACE + """ pace(10); exam(26); only(w5.concat(w4, g5)); saveState(); location.hash = '#/stats'; route(); const c = document.getElementById('courseCard');
      return JSON.stringify({ chip: c.querySelector('.card-head .chip').textContent, advice: c.querySelector('.course-advice').textContent, late: c.querySelector('.course-dot[data-level=N4]').classList.contains('late'),
        note: c.querySelector('.course-row[data-level=N4]').textContent.includes('目標，比期限晚 6 天') }); })()"""
    assert json.loads(ev(b, js)) == {'chip': '稍慢', 'advice': '要趕上，每天約需 22 題新內容（現在約 10 題）：每天做完當天的練習後按 1 次加練就趕得上。', 'late': True, 'note': True}

def test_change_target_opens_the_learning_settings_and_details_list_every_bank(b):
    js = "(() => { " + FRESH + """ location.hash = '#/stats'; route(); const c = document.getElementById('courseCard');
      const rows = [...c.querySelectorAll('details.course-banks tbody tr')].map(r => [r.cells[0].textContent, r.cells[1].textContent]);
      c.querySelector('[data-act=settings-learn]').click(); const open = !!document.querySelector('.modal select[data-key=examLevel]'); closeModal(true);
      return JSON.stringify({ names: rows.map(r => r[0]), kana: rows[0][1], open }); })()"""
    assert json.loads(ev(b, js)) == {'names': ['假名', '單字', '文法', '漢字', '聽力', '閱讀'], 'kana': '0 / 142', 'open': True}

def test_exam_countdown_follows_the_target_level(b):
    js = "(() => { " + FRESH + PACE + """ pace(10); exam(26); only(w5.concat(w4, g5)); state.settings.examLevel = 'N5'; saveState(); location.hash = '#/exam'; route(); const v = document.getElementById('view');
      return JSON.stringify({ level: v.textContent.includes(`距離 ${sl(26)} JLPT N5`), same: document.querySelector('.hero-advice').textContent === courseText(coursePace()), units: /每個單元/.test(v.textContent),
        chip: [...v.querySelectorAll('.card')].find(x => /考試倒數/.test(x.textContent)).querySelector('.chip').textContent }); })()"""
    assert json.loads(ev(b, js)) == {'level': True, 'same': True, 'units': False, 'chip': '稍慢'}

def test_ai_advice_names_the_target_level(b):
    js = "(async () => { " + FRESH + """ state.settings.examLevel = 'N5'; let prompt = ''; isAiConfigured = () => true; callAi = async (p) => { prompt = p; return '- 好'; };
      await aiStudyAdvice(document.createElement('button')); return /距離 JLPT N5（/.test(prompt); })()"""
    assert ev(b, js) is True

def test_a_brand_new_account_renders_the_stats(b):   # Review Focus 1: a fresh profile, nothing set up
    js = """(() => { location.hash = '#/stats'; route(); const c = document.getElementById('courseCard');
      return JSON.stringify({ bad: /null|NaN|undefined/.test(c.textContent), empty: (document.querySelector('#weekCard .week-empty') || {}).textContent }); })()"""
    assert json.loads(ev(b, js)) == {'bad': False, 'empty': '這 7 天還沒有練習'}

def test_a_far_finish_is_pinned_to_the_end_of_the_timeline(b):   # Review Focus 3
    js = "(() => { " + FRESH + PACE + """ pace(1); exam(100); saveState(); location.hash = '#/stats'; route(); const d = document.querySelector('#courseCard .course-dot[data-level=N4]');
      const label = [...document.querySelectorAll('#courseCard .course-line text')].map(x => x.textContent).find(x => x.includes('N4'));
      return JSON.stringify({ cx: Number(d.getAttribute('cx')), label, row: document.querySelector('#courseCard .course-row[data-level=N4]').textContent.includes(sl(coursePace().days.N4)) }); })()"""
    r = json.loads(ev(b, js))
    assert r['cx'] >= 390 and r['label'] == 'N5、N4 →' and r['row'], r   # both are years away: one label at the end

def test_stats_and_exam_pages_fit_a_phone(b):   # Review Focus 4
    out = b.run([("metrics", (390, 844)), ("nav", URL), ("wait", READY), ("eval", FRESH + " location.hash = '#/stats'; route(); document.documentElement.scrollWidth"),
                 ("eval", "location.hash = '#/exam'; route(); document.documentElement.scrollWidth")])
    assert out[-2] <= 390 and out[-1] <= 390, out

# ---- final review fixes ----
def test_only_course_items_count_toward_the_pace(b):   # listening, reading and drills come on their own, outside the new count
    js = "(() => { " + FRESH + """ const t = todayStr(); delete state.dailyLogs[t]; const pick = (list) => (list || []).find(x => !state.srs[x.key]);
      const items = [pick(REG.vocab.filter(v => v.builtin)), pick(REG.grammar.filter(g => g.u !== 'm0')), pick(REG.kanji), pick(REG.kana), pick(REG.listen), pick(REG.read), pick(REG.drills)];
      items.forEach(x => srsAnswer(x.key, true)); return JSON.stringify([items.map(x => x.kind), state.dailyLogs[t].fresh]); })()"""
    assert json.loads(ev(b, js)) == [['v', 'g', 'k', 'a', 'l', 'r', 'c'], 4]

def test_timeline_labels_never_overlap(b):   # a sweep of paces and exam dates: every label inside the box, none touching another
    js = "(() => { " + FRESH + PACE + """ const bad = [];
      const boxes = () => [...document.querySelectorAll('#courseCard .course-line text')].map(x => { const r = x.getBBox(); return [x.textContent, r.x, r.x + r.width, r.y, r.y + r.height]; });
      const hit = (a, c) => a[1] < c[2] && c[1] < a[2] && a[3] < c[4] && c[3] < a[4];
      for (const setup of [() => {}, () => only(w5.concat(w4, g5))]) for (const n of [1, 3, 6, 9.6, 12, 20, 40]) for (const d of [22, 24, 27, 40, 100, 200, 400]) {
        state.srs = {}; setup(); pace(n); exam(d); location.hash = '#/stats'; route(); const bx = boxes();
        bx.forEach((a, i) => { if (a[1] < 0 || a[2] > 400) bad.push([n, d, 'out', a[0]]); bx.slice(i + 1).forEach(c => { if (hit(a, c)) bad.push([n, d, a[0], c[0]]); }); });
      }
      return JSON.stringify(bad.slice(0, 8)); })()"""
    assert json.loads(ev(b, js)) == []

def test_course_advice_never_contradicts_itself(b):   # no 「需 10 題（現在約 10 題）」, no interval longer than the days left
    js = "(() => { " + FRESH + PACE + """ only(w5.concat(w4, g5)); const run = (n, d) => { pace(n); exam(d); const p = coursePace(); return [p.plan, courseAdvice(p)]; };
      return JSON.stringify({ once: run(10, 31), frac: run(9.6, 32), d10: sl(10), d11: sl(11) }); })()"""
    r = json.loads(ev(b, js))
    assert r['once'] == [{'once': True}, f"要趕上，每天約需 11 題新內容（現在約 10 題）：{r['d10']} 前找一天，做完當天的練習後按 1 次加練就趕得上。"], r
    assert r['frac'] == [{'once': True}, f"要趕上，每天約需 10 題新內容（現在約 9.6 題）：{r['d11']} 前找一天，做完當天的練習後按 1 次加練就趕得上。"], r

def test_week_dots_are_easy_to_tap(b):   # a phone needs more than a 6px dot: 8px off its centre still hits it
    js = "(() => { " + FRESH + WEEK + """ saveState(); location.hash = '#/stats'; route(); const c = document.getElementById('weekCard'); c.scrollIntoView();
      return JSON.stringify([...c.querySelectorAll('.week-dot')].map((d, i) => { const r = d.getBoundingClientRect(); const x = r.x + r.width / 2 + (i < 3 ? 8 : -8), y = r.y + r.height / 2;
        return document.elementFromPoint(x, y) === d; })); })()"""
    out = b.run([("metrics", (390, 844)), ("nav", URL), ("wait", READY), ("eval", js)])
    assert json.loads(out[-1]) == [True] * 7, out[-1]

def test_ai_system_prompt_names_the_target_level(b):   # it said N4 for everyone
    js = """(() => { state.settings.examLevel = 'N5'; const a = aiSystemPrompt(); state.settings.examLevel = 'N4'; const c = aiSystemPrompt();
      return JSON.stringify([a.includes('學生的目標是通過 JLPT N5。'), c.includes('學生的目標是通過 JLPT N4。')]); })()"""
    assert json.loads(ev(b, js)) == [True, True]

# ---- 1.0.26's changelog names what changed ----
def test_the_1_0_26_changelog_says_what_changed(b):
    items = json.loads(ev(b, "JSON.stringify((CHANGELOG.find(x => x.v === '1.0.26') || {}).items || [])"))
    text = ''.join(items)
    assert all(s in text for s in ['總進度', '入門', 'N5', 'N4', '過去 7 天', '最近 100 題', '課程進度', '加練', '考試']), items

TESTS =[f for n, f in sorted(globals().items()) if n.startswith('test_') and callable(f)]
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
