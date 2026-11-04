"""1.0.33 (spec §4.1, §10): with N3 data in data.js every page knows the new level. The app is served from a temporary
folder whose data.js is the real one plus a small fake N3 level (three words, two kanji, a unit m19 with two grammar
items in a fourth phase, a theme), so everything computed while the page loads sees N3 the way the real batches will."""
import json, os, shutil, subprocess, sys, tempfile, time
sys.path.insert(0, os.path.dirname(__file__))
from cdp import Browser
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
PORT = 8803
URL = f"http://127.0.0.1:{PORT}/"
READY = "typeof state === 'object' && !!state.updatedAt && typeof speakScript === 'function'"

def ev(b, js, pre=()):
    return b.run([("nav", URL), ("wait", READY)] + list(pre) + [("eval", js)])[-1]

def fake_site():
    tmp = tempfile.mkdtemp(prefix='nq-n3-')
    for name in os.listdir(ROOT):
        if name in ('data.js', '.git', '.venv', 'node_modules'): continue
        os.symlink(os.path.join(ROOT, name), os.path.join(tmp, name))
    lines = open(os.path.join(ROOT, 'data.js'), encoding='utf-8').read().split('\n')
    D = json.loads(lines[2][len('const DATA = '):-1])
    # the fake level stands in for any real N3 content (1.0.33 merges it batch by batch), so the counts below are the fake's
    n3_units = {u['id'] for u in D['UNITS'] if u['lv'] == 'N3'}
    for k, v in D.items():
        if isinstance(v, list): D[k] = [x for x in v if not (isinstance(x, dict) and (x.get('lv') == 'N3' or x.get('u') in n3_units))]
    for u in n3_units: D['LESSONS'].pop(u, None)
    D['PHASES'] = [p for p in D['PHASES'] if any(u['ph'] == p['id'] for u in D['UNITS'])]
    D['THEMES'].pop('N3', None)
    th = '思考與判斷'
    D['VOCAB'] += [
        {'id': 'n3a-001', 'w': '検討', 'r': 'けんとう', 'm': '研究、考慮', 'p': 'vs', 'lv': 'N3', 'c': th, 'ex': '計画をもう一度{検討}します。', 'exZh': '再研究一次計畫。', 'ex2': 'その案は今{検討}中です。', 'exZh2': '那個方案正在研究中。'},
        {'id': 'n3a-002', 'w': '判断', 'r': 'はんだん', 'm': '判斷', 'p': 'vs', 'lv': 'N3', 'c': th, 'ex': '自分で{判断}してください。', 'exZh': '請自己判斷。', 'ex2': '正しい{判断}でした。', 'exZh2': '那是正確的判斷。'},
        {'id': 'n3a-003', 'w': '想像', 'r': 'そうぞう', 'm': '想像', 'p': 'vs', 'lv': 'N3', 'c': '抽象與狀況', 'ex': '未来を{想像}します。', 'exZh': '想像未來。', 'ex2': '{想像}よりおいしいです。', 'exZh2': '比想像的好吃。'},
        {'id': 'n3a-004', 'w': '都', 'r': 'みやこ', 'm': '首都、都城', 'p': 'n', 'lv': 'N3', 'c': '抽象與狀況', 'ex': '京都は昔の{都}です。', 'exZh': '京都是以前的首都。', 'ex2': '花の{都}パリ。', 'exZh2': '花都巴黎。'}]
    D['KANJI'] += [
        {'k': '討', 'lv': 'N3', 'm': '討論、研究', 'on': ['トウ'], 'kun': ['う'], 'ex': [['検討', 'けんとう', '研究、考慮']], 'look': ['計']},
        {'k': '判', 'lv': 'N3', 'm': '判斷', 'on': ['ハン', 'バン'], 'kun': [], 'ex': [['判断', 'はんだん', '判斷']], 'look': ['半']}]
    D['PHASES'].append({'id': 4, 'title': '第四階段：N3 文法', 'span': '第 10–12 個月'})
    D['UNITS'].append({'id': 'm19', 'ph': 4, 'weeks': '第 37–38 週', 'lv': 'N3', 'short': '推測', 'title': '推測與傳聞', 'desc': '「らしい」「みたい」。'})
    D['LESSONS']['m19'] = {'formula': '〜らしい｜〜みたい', 'overview': '推測與傳聞。', 'sections': [{'h': '推測', 'rule': '普通形＋らしい', 'points': ['雨が降るらしい。']}]}
    g = next(x for x in D['GRAMMAR'] if x['u'] == 'm18' and x['t'] == 'choice')
    D['GRAMMAR'] += [dict(g, id='m19-01', u='m19', lv='N3', sec=0), dict(g, id='m19-02', u='m19', lv='N3', sec=0)]
    D['THEMES']['N3'] = [{'c': th, 'desc': '思考、判斷與推測'}, {'c': '抽象與狀況', 'desc': '抽象的事物與狀況'}]
    lines[2] = 'const DATA = ' + json.dumps(D, ensure_ascii=False, separators=(',', ':')) + ';'
    open(os.path.join(tmp, 'data.js'), 'w', encoding='utf-8').write('\n'.join(lines))
    return tmp

SEEN = """const t = todayStr(); const rec = () => ({ b: 2, due: addDays(t, 30), n: 3, ok: 3, ng: 0, s: 20, d: 5, last: addDays(t, -5), intro: addDays(t, -60), f: {} });
  const below = (lv) => ['PRE_N5', 'N5', 'N4'].includes(lv); state.stage = 'main';
  const seeBelowN3 = () => { REG.vocab.filter(v => v.builtin && below(v.lv)).forEach(v => { state.srs[v.key] = rec(); }); REG.kanji.filter(k => below(k.lv)).forEach(k => { state.srs[k.key] = rec(); });
    state.completedUnits = DATA.UNITS.filter(u => below(u.lv)).map(u => u.id); state.currentUnit = 'm18'; DAILY_CACHE = null; };"""

def test_the_level_lists_and_stages_include_n3(b):
    js = """(() => JSON.stringify({ levels: levels(), course: courseLevels(), stage: STAGES[STAGES.length - 1].lv, themes: themeOrder().includes('思考與判斷'),
      decks: decks().map(d => d[0]), scopes: statsScopes().map(s => s[0]), lv: unitLevel('m19') }))()"""
    r = json.loads(ev(b, js))
    assert r == {'levels': ['PRE_N5', 'N5', 'N4', 'N3'], 'course': ['N5', 'N4', 'N3'], 'stage': 'N3', 'themes': True,
                 'decks': ['all', 'PRE_N5', 'N5', 'N4', 'N3'], 'scopes': ['all', 'pre', 'n5', 'n4', 'n3'], 'lv': 'N3'}, r

def test_vocab_page_has_an_n3_tab_and_the_stats_an_n3_scope(b):
    js = """(() => { location.hash = '#/vocab/level?lv=N3'; route(); const tabs = [...document.querySelectorAll('.seg.mb-4 button')].map(x => x.textContent.trim());
      const words = document.querySelectorAll('.theme-card[data-lv="N3"]').length === 2;   /* the N3 page shows its two themes */
      location.hash = '#/stats'; route(); const scope = Boolean(document.querySelector('[data-act=stats-scope][data-scope=n3]'));
      const n3 = progressTotals('v', 'n3').total; const marks = progressTotals('v').marks.map(m => m[0]);
      return JSON.stringify({ tabs: tabs.slice(0, 4), words, scope, n3, marks }); })()"""
    r = json.loads(ev(b, js))
    assert r == {'tabs': ['入門', 'N5', 'N4', 'N3'], 'words': True, 'scope': True, 'n3': 4, 'marks': ['N5', 'N4']}, r

def test_n3_opens_once_n4_is_done_and_new_items_come_only_from_it(b):
    js = "(() => { " + SEEN + """ const before = curLevel(); seeBelowN3(); const s = splitNew(15);
      const all = s.v.concat(s.g, s.k); const lvOf = (x) => x.kind === 'g' ? unitLevel(x.u) : x.lv;
      const out = { before, cur: curLevel(), n: all.length, n3: all.every(x => lvOf(x) === 'N3'), kinds: [s.v.length > 0, s.g.length > 0, s.k.length > 0] };
      state.srs = {}; state.completedUnits = []; state.currentUnit = 'm1'; saveState(); return JSON.stringify(out); })()"""
    r = json.loads(ev(b, js))
    assert r == {'before': 'N5', 'cur': 'N3', 'n': 8, 'n3': True, 'kinds': [True, True, True]}, r   # 4 words + 2 items + 2 kanji is all N3 has

def test_n3_words_read_after_n4_ones_and_the_pace_has_an_n3_date(b):
    js = """(() => { const p = coursePace(); return JSON.stringify({ prio: FURI_PRIO.get('検討'), n3: typeof p.days.N3 === 'number' && p.days.N3 >= p.days.N4,
      target: courseLevels().includes('N3'), keep: state.settings.examLevel }); })()"""
    r = json.loads(ev(b, js))
    assert r == {'prio': 1.9, 'n3': True, 'target': True, 'keep': 'N4'}, r

def test_n3_new_words_come_in_two_theme_lanes_and_a_shared_spelling_keeps_the_lower_levels_reading(b):
    js = "(() => { " + SEEN + """ seeBelowN3(); const th = activeThemes(REG.vocab.filter(v => vocabEligibleForDaily(v, curLevel())), false);
      const out = { th, toh: furi('都の図書館') }; state.srs = {}; state.completedUnits = []; state.currentUnit = 'm1'; saveState(); return JSON.stringify(out); })()"""
    r = json.loads(ev(b, js))
    assert sorted(r['th']) == ['思考與判斷', '抽象與狀況'] and '<rt>と</rt>' in r['toh'], r

def test_after_the_last_stage_the_course_stays_on_the_last_unit(b):   # was 'm18' written out
    js = "JSON.stringify([STAGES.length, nextUnitAfterStage(STAGES[STAGES.length - 1].id), DATA.UNITS[DATA.UNITS.length - 1].id])"
    r = json.loads(ev(b, js)); assert r == [5, 'm19', 'm19'], r   # 入門, three phases and the fake fourth

def test_each_level_has_its_own_mondai_table_and_curated_items_build_by_kind(b):   # spec §7: N3's 大題 numbers differ from N4's
    js = """(() => { const kinds = (L) => Object.entries(MONDAI_LV[L]).map(([m, x]) => m + ':' + x.k);
      DATA.EXAM.push({ id: 'cm_n3_x1', lv: 'N3', m: 'S3-M4', scene: '在店裡想試穿衣服。', q: '何と言いますか。', op: ['これ、着てみてもいいですか。', 'これ、着てもらえますか。', 'これ、着せてください。'], a: 'これ、着てみてもいいですか。', why: 'x' },
        { id: 'cm_n3_x2', lv: 'N3', m: 'S3-M5', line: '明日、手伝ってもらえる？', op: ['うん、いいよ。', 'うん、手伝ってもらう。', 'どういたしまして。'], a: 'うん、いいよ。', why: 'x' },
        { id: 'cm_n3_x3', lv: 'N3', m: 'S2-M7', passage: '市民プール\\n月曜日は休み。', qs: [{ q: '休みは何曜日ですか。', op: ['月曜日', '火曜日', '水曜日', '木曜日'], a: '月曜日' }], why: 'x' });
      const U = curatedUnits('N3'); const by = (id) => U.find(u => u.ids[0] === id) || { qs: [{}] };
      const out = { n4: kinds('N4'), n3: kinds('N3'), titles: ['S2-M6', 'S2-M7', 'S3-M3', 'S3-M4', 'S3-M5'].map(m => MONDAI_LV.N3[m].t),
        scene: String(by('cm_n3_x1').qs[0].stemHtml).includes('試穿'), resp: by('cm_n3_x2').qs[0].audio === '明日、手伝ってもらえる？', info: !!by('cm_n3_x3').qs[0].passageHtml };
      DATA.EXAM.splice(-3, 3); return JSON.stringify(out); })()"""
    r = json.loads(ev(b, js))
    base = ['S1-M1:reading', 'S1-M2:kanji', 'S1-M3:context', 'S1-M4:paraphrase', 'S1-M5:usage', 'S2-M1:grammar', 'S2-M2:order', 'S2-M3:textgrammar', 'S2-M4:passage', 'S2-M5:passage']
    assert r['n4'] == base + ['S2-M6:passage', 'S3-M1:task', 'S3-M2:task', 'S3-M3:scene', 'S3-M4:resp'], r['n4']
    assert r['n3'] == base + ['S2-M6:passage', 'S2-M7:passage', 'S3-M1:task', 'S3-M2:task', 'S3-M3:gist', 'S3-M4:scene', 'S3-M5:resp'], r['n3']
    assert r['titles'] == ['問題6　内容理解（長文）', '問題7　情報検索', '問題3　概要理解', '問題4　発話表現', '問題5　即時応答'], r
    assert r['scene'] and r['resp'] and r['info'], r

def test_n3_is_scored_in_three_parts_of_sixty_and_n4_as_before(b):   # spec §7: 95 to pass, each part at least 19
    js = """(() => { const keep = EXAM; const q = (sec, mk) => ({ sec, mk, answer: 0, m: 'x', mondaiTitle: 'x' });
      const run = (level, spec) => { const paper = [], answers = []; spec.forEach(([sec, mk, n, right]) => { for (let i = 0; i < n; i++) { paper.push(q(sec, mk)); answers.push(i < right ? 0 : 1); } });
        EXAM = { level, paper, answers }; const s = scoreExam(); return [s.parts.map(p => p.k + ':' + p.pts + (p.est ? '*' : '')).join(' '), s.total, s.passed]; };
      const n3 = [['S1', 'reading', 10, 10], ['S2', 'grammar', 5, 5], ['S2', 'passage', 5, 1], ['S3', 'task', 10, 10]];
      const out = { lowRead: run('N3', n3), pass: run('N3', n3.map(x => x[1] === 'passage' ? [x[0], x[1], 5, 2] : x)), listenOnly: run('N3', [['S3', 'task', 10, 5]]),
        n4: run('N4', [['S1', 'reading', 10, 7], ['S2', 'grammar', 10, 3], ['S3', 'task', 10, 4]]),
        plan: Object.keys(EXAM_PLAN.N3.mondai).join() === Object.keys(MONDAI_LV.N3).join(), full: Object.values(EXAM_PLAN.N3.mondai).map(x => x[2]).join(), time: EXAM_PLAN.N3.time };
      EXAM = keep; return JSON.stringify(out); })()"""
    r = json.loads(ev(b, js))
    assert r['lowRead'] == ['lang:60 read:12 li:60', 132, False], r   # 132 is enough, but 読解 12 is under 19
    assert r['pass'] == ['lang:60 read:24 li:60', 144, True], r
    assert r['listenOnly'] == ['lang:30* read:30* li:30', 90, False], r   # a 聴解-only paper: the other parts at its share
    assert r['n4'] == ['lr:60 li:24', 84, False], r   # N4 as before: 10/20 of 言語知識・読解 → 60 of 120, 聴解 4/10 → 24 of 60
    assert r['plan'] and r['full'] == '8,6,11,5,5,13,5,1,4,2,1,1,6,6,3,4,9' and r['time'] == {'S1': 30, 'S2': 70, 'S3': 40}, r   # passages for 読解

def test_an_n3_paper_takes_listening_and_reading_from_the_n3_banks_by_kind(b):   # 1.0.33: the practice items fill those 大題
    js = """(() => { let out2 = null; const dlg = (kind, i) => Object.assign({ id: 'l3-t' + i, t: 'dialog', lv: 'N3', u: 'm19', script: '男：明日、会議があります。' + i + '\\n女：そうですか。', q: '男の人は何をしますか。', op: ['会議に出る', '家に帰る', '本を読む', '電話をする'], a: '会議に出る', zh: 'x', why: 'x' }, kind ? { kind } : {});
      const L = [dlg('', 1), dlg('', 2), dlg('gist', 3), dlg('point', 6), { id: 'l3-t4', t: 'scene', lv: 'N3', u: 'm19', scene: '想借筆。', op: ['ペンを貸してもらえますか。', 'ペンを貸しましょうか。', 'ペンをもらいました。'], a: 'ペンを貸してもらえますか。', why: 'x' },
        { id: 'l3-t5', t: 'resp', lv: 'N3', u: 'm19', line: '手伝ってもらえる？', op: ['うん、いいよ。', 'うん、もらうよ。', 'どういたしまして。'], a: 'うん、いいよ。', zh: 'x', why: 'x' }];
      const rd = (kind, i) => ({ id: 'rd-t' + i, lv: 'N3', u: 'm19', kind, passage: '私は毎朝、駅まで歩きます。' + i, q: 'この人は毎朝、何をしますか。', op: ['駅まで歩く', '駅まで走る', 'バスに乗る', '電車に乗る'], a: '駅まで歩く', zh: 'x', why: 'x' });
      DATA.LISTEN.push(...L); DATA.READ.push(rd('memo', 1), rd('essay', 2), rd('long', 3), rd('info', 4)); buildRegistry();
      const { paper, shortage } = assemblePaper('N3', 'full', ['S2', 'S3']); const got = {}; paper.forEach(q => { got[q.m] = (got[q.m] || []).concat([q.mk]); });
      const ok = paper.every(q => q.options && q.options.length >= 3 && (q.sec !== 'S3' || q.audio || q.mk === 'scene'));
      const src = (m) => paper.filter(q => q.m === m).map(q => q.examId.split(':')[2]).sort().join(); out2 = [src('S3-M1'), src('S3-M2')];
      DATA.LISTEN.splice(-6, 6); DATA.READ.splice(-4, 4); buildRegistry();
      return JSON.stringify({ got: Object.fromEntries(['S2-M4', 'S2-M5', 'S2-M6', 'S2-M7', 'S3-M1', 'S3-M2', 'S3-M3', 'S3-M4', 'S3-M5'].map(m => [m, got[m] || []])), ok, short: shortage.length > 0, src: out2 }); })()"""
    r = json.loads(ev(b, js))
    assert r['got'] == {'S2-M4': ['passage'], 'S2-M5': ['passage'], 'S2-M6': ['passage'], 'S2-M7': ['passage'], 'S3-M1': ['task', 'task'], 'S3-M2': ['task'], 'S3-M3': ['gist'],
                        'S3-M4': ['scene'], 'S3-M5': ['resp']} and r['ok'] and r['short'], r   # a short bank shows as a shortage, never a wrong kind
    assert r['src'] == ['l3-t1,l3-t2', 'l3-t6'], r['src']   # 課題理解 from the plain dialogs, ポイント理解 from those marked point (final review)

def test_n3_exam_records_ai_items_formal_mode_passages_and_seen_order(b):   # final review of parts four and five
    js = """(() => { const keep = [EXAM, JSON.stringify(state.examHistory), JSON.stringify(state.questionHistory)];
      const q = (sec, mk, i) => ({ sec, mk, m: sec + '-x', answer: 0, examId: 'zz' + i, options: [{ text: 'あ' }, { text: 'い' }], mondaiTitle: 'x', stemHtml: 'x' });
      const paper = [q('S1', 'reading', 1), q('S2', 'grammar', 2), q('S2', 'passage', 3), q('S3', 'task', 4)];
      EXAM = { level: 'N3', title: 'x', paper, answers: [0, 0, 0, 1], locked: [], start: Date.now(), isAi: false, formal: false }; finishExam();
      const h = state.examHistory[0]; const rec = { lang: h.langScore60, read: h.readScore60, lr: h.lrScore120, li: h.listenScore60 };
      const ai = { resp: !!validAiExam({ m: 'S3-M5', line: '明日、来ますか。', op: ['はい、行きます。', 'はい、来ます。', 'どういたしまして。'], a: 'はい、行きます。', why: 'x' }, 'N3'),
        scene: !!validAiExam({ m: 'S3-M4', line: '明日、来ますか。', op: ['はい、行きます。', 'はい、来ます。', 'どういたしまして。'], a: 'はい、行きます。', why: 'x' }, 'N3') };
      DATA.EXAM.push({ id: 'cm_n3_zz1', lv: 'N3', m: 'S2-M5', passage: '私は毎朝、駅まで歩きます。', qs: [0, 1, 2].map(i => ({ q: '何をしますか。' + i, op: ['歩く', '走る', '寝る', '食べる'], a: '歩く' })), why: 'x' });
      const unit = curatedUnits('N3').find(u => u.ids[0] === 'cm_n3_zz1'); const qs = unit ? unit.qs.length : 0;
      state.questionHistory = { 'cm_n3_zz1#1': { lastResult: 'wrong' } }; EXAM = { strategy: 'wrong' };
      const other = { ids: ['zz2'], qs: [{ examId: 'zz2#0' }] }; const first = rankBySeen([other, unit], u => u.qs.map(x => x.examId))[0] === unit;
      DATA.EXAM.pop(); EXAM = keep[0]; state.examHistory = JSON.parse(keep[1]); state.questionHistory = JSON.parse(keep[2]); saveState();
      return JSON.stringify({ rec, ai, qs, first }); })()"""
    r = json.loads(ev(b, js))
    assert r['rec'] == {'lang': 60, 'read': 60, 'lr': None, 'li': 0}, r   # N3 keeps 言語知識 and 読解 apart; lrScore120 is N5/N4's
    assert r['ai'] == {'resp': True, 'scene': False}, r   # N3's 即時応答 is S3-M5; S3-M4 is 発話表現, not an AI item
    assert r['qs'] == 3 and r['first'], r   # a passage keeps its three questions; one of them answered wrong ranks it first

TESTS = [f for n, f in sorted(globals().items()) if n.startswith('test_') and callable(f)]
if __name__ == "__main__":
    site = fake_site()
    srv = subprocess.Popen([sys.executable, "-m", "http.server", str(PORT), "--bind", "127.0.0.1"], cwd=site, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(0.8)
    only = sys.argv[1:]
    failed = 0
    try:
        for t in TESTS:
            if only and t.__name__ not in only: continue
            err = None
            for attempt in (1, 2):
                with Browser() as b:
                    try:
                        t(b); print("ok  ", t.__name__ + (" (retry)" if attempt == 2 else "")); err = None; break
                    except Exception as e:
                        err = e
            if err is not None:
                failed += 1; print("FAIL", t.__name__, "-", str(err)[:400])
    finally:
        srv.terminate(); shutil.rmtree(site, ignore_errors=True)
    print("ALL PASS" if not failed else f"{failed} FAILED")
    sys.exit(1 if failed else 0)
