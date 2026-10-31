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
        return [...document.querySelectorAll('#progressCard .gauge')].map(g => [g.dataset.kind, +g.dataset.total, !!g.querySelector('.tick'), g.querySelector('strong').textContent]); };
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
