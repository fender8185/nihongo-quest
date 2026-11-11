"""2026-11-05 (1.0.42–1.0.43): 手機作答畫面——選項貼在螢幕下方、上方的 ✕ 和進度條往下滑也固定、作答結果從底部升起的面板（選項不動）；電腦版不變。"""
import json, os, subprocess, sys, time
sys.path.insert(0, os.path.dirname(__file__))
from cdp import Browser
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
PORT = 8805
URL = f"http://127.0.0.1:{PORT}/"
READY = "typeof state === 'object' && !!state.updatedAt && typeof speakScript === 'function'"

def ev(b, js, pre=()):
    return b.run(list(pre) + [("nav", URL), ("wait", READY), ("eval", js)])[-1]

# a main-course account at week 1; the first plain vocabulary question of a daily set on screen (word previews skipped)
FRESH = "state.stage = 'main'; state.kanaKnown = true; state.introSeen = true; state.storyV = 9; state.startChosen = true; state.currentUnit = 'm1'; saveState(); DAILY_CACHE = null;"
VOCAB_Q = """startSession('daily', { size: 20 }); route();   /* what the hashchange would do next: today's fit layout off */ const es = SESSION.entries; es.forEach(e => { e.preview = false; });
  for (let i = 0; i < es.length; i++) { SESSION.idx = i; prepareEntry(i); if (es[i].q.kind === 'v' && !es[i].q.custom && es[i].q.fmt !== 'v-cloze') break; }
  renderPractice(); window.scrollTo(0, 0);"""

def test_phone_options_sit_low_and_the_top_strip_stays(b):
    js = "(async () => { " + FRESH + VOCAB_Q + """
      const opts = [...document.querySelectorAll('.q-card .opt')]; const last = opts[opts.length - 1].getBoundingClientRect();
      const tools = document.querySelector('.pr-actions').getBoundingClientRect(); const top = document.querySelector('.pr-top');
      const before = { gap: innerHeight - last.bottom, toolsGap: innerHeight - tools.bottom, pos: getComputedStyle(top).position, top: top.getBoundingClientRect().top };
      answerCurrent((currentEntry().q.answer + 1) % 4); window.scrollTo(0, 99999); await new Promise(r => setTimeout(r, 50));
      const strip = document.querySelector('.pr-top').getBoundingClientRect();
      const after = { scrolled: scrollY, top: strip.top, width: strip.width, vw: innerWidth, under: document.elementFromPoint(innerWidth / 2, strip.top + strip.height / 2).closest('.pr-top') !== null };
      SESSION = null; document.body.classList.remove('practicing');
      return JSON.stringify({ before, after }); })()"""
    r = json.loads(ev(b, js, [("metrics", (375, 667))]))
    o = r['before']
    assert o['pos'] == 'sticky' and o['top'] == 0, r
    assert 0 < o['gap'] < 110 and 0 <= o['toolsGap'] < 40, r   # the last option just above the tool row, the tool row at the foot of the screen
    a = r['after']
    assert a['scrolled'] > 0 and a['top'] == 0 and a['under'], r   # scrolled, and the strip still on top of what scrolls under it
    assert a['width'] == a['vw'], r   # it spans the side gutters

def test_phone_result_rises_in_a_panel_and_the_options_stay(b):
    js = "(async () => { " + FRESH + VOCAB_Q + """
      const tops = () => [...document.querySelectorAll('.q-card .opt')].map(o => Math.round(o.getBoundingClientRect().top)).join(',');
      const before = tops(); const q = currentEntry().q; const pick = (q.answer + 1) % 4;
      answerCurrent(pick);
      const sh = document.querySelector('.fb-sheet'), card = document.querySelector('.q-card');
      const ghost = document.querySelector('.pr-actions.pr-ghost');
      const out = { same: tops() === before, cls: sh.className, head: !!sh.querySelector('.fb-head'), rows: [...sh.querySelectorAll('.fb-opts .fb-opt')].map(r => [r.className.replace('fb-opt', '').trim(), jaPlain(r.querySelector('.fb-mark + span').textContent), !!r.querySelector('.fb-you')]),
        right: jaPlain(q.options[q.answer].text),
        pickText: jaPlain(q.options[pick].text), next: !!sh.querySelector('.pr-next > #btnNext'), tools: !!sh.querySelector('.pr-actions:not(.pr-ghost) [data-act=replay]'),
        ghostInert: !!ghost && ghost.inert, inCard: !!card.querySelector('.feedback'), tall: sh.getBoundingClientRect().height / innerHeight,
        room: document.getElementById('view').style.getPropertyValue('--sheet-h') === sh.offsetHeight + 'px', names: sh.getAnimations().map(a => a.animationName) };
      renderPractice(); const again = { cls: document.querySelector('.fb-sheet').className, same: tops() === before };   // 顯示中文, a sync: drawn again
      const all = SESSION.entries; all.forEach((x, i) => prepareEntry(i)); const li = all.findIndex((x, i) => i !== SESSION.idx && x.q && x.q.kind === 'l' && !x.done);
      let listen = null;
      if (li >= 0) { SESSION.idx = li; renderPractice(); answerCurrent(all[li].q.answer); const s2 = document.querySelector('.fb-sheet');
        listen = { inSheet: /原文/.test(s2.textContent), inCard: /原文/.test(document.querySelector('.q-card').textContent), headFirst: s2.querySelector('.feedback').firstElementChild.classList.contains('fb-head') }; }
      return JSON.stringify({ out, again, listen }); })()"""
    r = json.loads(ev(b, js, [("metrics", (375, 667))]))
    o = r['out']
    assert o['same'] and o['cls'] == 'fb-sheet bad rise' and o['names'] == ['sheetUp'], r   # the options stay put; the panel rises once
    assert o['head'] and o['next'] and o['tools'] and o['ghostInert'] and not o['inCard'], r
    assert len(o['rows']) == 4 and o['rows'][0] == ['ok', o['right'], False] and o['rows'][1] == ['bad', o['pickText'], True] and all(x[0] == '' and not x[2] for x in o['rows'][2:]), r   # 1.0.45: a miss lists the options: right, picked, the rest
    assert 0 < o['tall'] <= 0.701 and o['room'], r   # at most 70% of the screen; the page can scroll what it covers up above it
    assert r['again'] == {'cls': 'fb-sheet bad', 'same': True}, r
    assert r['listen'] == {'inSheet': True, 'inCard': False, 'headFirst': True}, r   # the transcript sits under the verdict, in the panel (week 1's set has a listening item)

def test_a_missed_meaning_names_the_word_each_wrong_meaning_belongs_to(b):
    js = "(async () => { " + FRESH + VOCAB_Q + """ const e = currentEntry(); e.q = makeVocabQuestion(e.item, { forceFmt: 'v-meaning' }); renderPractice();
      const q = e.q; const pick = (q.answer + 1) % 4; answerCurrent(pick);
      const row = document.querySelector('.fb-opts .fb-opt.bad'); const words = REG.vocab.filter(v => v.m === q.options[pick].text).map(v => jaPlain(v.w));
      const out = { fmt: q.fmt, aside: row && row.querySelector('.fb-opt-zh') ? row.querySelector('.fb-opt-zh').textContent : '', jp: !!(row && row.querySelector('.fb-opt-zh.jp')), words };
      SESSION = null; document.body.classList.remove('practicing'); return JSON.stringify(out); })()"""
    r = json.loads(ev(b, js, [("metrics", (390, 844))]))
    assert r['fmt'] == 'v-meaning' and r['jp'] and any(r['aside'] == f'（{w}）' for w in r['words']), r   # 1.0.45: 歡迎光臨（いらっしゃいませ）
    js2 = "(async () => { " + FRESH + VOCAB_Q + """ const e = currentEntry(); e.q = makeVocabQuestion(e.item, { forceFmt: 'v-meaning' }); renderPractice();
      const q = e.q; const pick = (q.answer + 1) % 4; answerCurrent(pick); const el = document.querySelector('.opt.wrong .opt-zh');
      const out = { aside: el ? el.textContent : '', word: q.optJa[q.options[pick].text] || null, right: !!document.querySelector('.opt.correct .opt-zh') };
      SESSION = null; document.body.classList.remove('practicing'); return JSON.stringify(out); })()"""
    r2 = json.loads(ev(b, js2, [("metrics", (1200, 900, False))]))
    assert r2['word'] and r2['aside'] == r2['word'] and not r2['right'], r2   # on a wide screen the option itself says it

def test_a_right_word_answer_still_lists_what_the_other_words_mean(b):
    js = "(async () => { " + FRESH + VOCAB_Q + """ const e = currentEntry(); const out = {};
      for (const fmt of ['v-meaning', 'v-recall']) { e.done = false; e.q = makeVocabQuestion(e.item, { forceFmt: fmt }); renderPractice(); answerCurrent(e.q.answer);
        out[fmt] = [...document.querySelectorAll('.fb-sheet .fb-opt')].map(r => [r.className.replace('fb-opt', '').trim(), !!r.querySelector('.fb-opt-zh'), !!r.querySelector('.fb-you')]); }
      const all = SESSION.entries; all.forEach((x, i) => prepareEntry(i)); const gi = all.findIndex(x => x.q && x.q.kind === 'g' && !x.q.custom && !x.done);
      SESSION.idx = gi; renderPractice(); answerCurrent(all[gi].q.answer); out.grammar = document.querySelectorAll('.fb-sheet .fb-opt').length;
      SESSION = null; document.body.classList.remove('practicing'); return JSON.stringify(out); })()"""
    r = json.loads(ev(b, js, [("metrics", (390, 844))]))
    for fmt in ('v-meaning', 'v-recall'):
        rows = r[fmt]
        assert len(rows) == 4 and rows[0] == ['ok', False, False] and all(x == ['', True, False] for x in rows[1:]), r   # 1.0.46: right, then the others with their meanings
    assert r['grammar'] == 0, r   # particles have nothing to show: a right answer lists none

def test_turning_a_phone_wide_draws_the_answer_the_desktop_way(b):
    js = "(async () => { " + FRESH + VOCAB_Q + """ answerCurrent(currentEntry().q.answer); window.__sheet = !!document.querySelector('.fb-sheet'); return 1; })()"""
    probe = """JSON.stringify({ sheet: __sheet, after: !!document.querySelector('.fb-sheet'), inCard: !!document.querySelector('.q-card .feedback'), next: !!document.querySelector('#view > .pr-next > #btnNext') })"""
    out = b.run([("metrics", (390, 844)), ("nav", URL), ("wait", READY), ("eval", js), ("metrics", (1000, 800, False)), ("wait", "!document.querySelector('.fb-sheet')"), ("eval", probe)])
    r = json.loads(out[-1])
    assert r == {'sheet': True, 'after': False, 'inCard': True, 'next': True}, r

def test_desktop_layout_is_unchanged(b):
    js = "(async () => { " + FRESH + VOCAB_Q + """
      const top = getComputedStyle(document.querySelector('.pr-top')), view = getComputedStyle(document.getElementById('view')), opts = getComputedStyle(document.querySelector('.q-card .opts'));
      const out = { pos: top.position, display: view.display, card: getComputedStyle(document.querySelector('.q-card')).display, mt: opts.marginTop };
      SESSION = null; document.body.classList.remove('practicing'); return JSON.stringify(out); })()"""
    r = json.loads(ev(b, js, [("metrics", (1200, 900, False))]))
    assert r == {'pos': 'static', 'display': 'block', 'card': 'block', 'mt': '18px'}, r
    js2 = "(async () => { " + FRESH + VOCAB_Q + """ answerCurrent(currentEntry().q.answer);
      return JSON.stringify({ sheet: !!document.querySelector('.fb-sheet'), inCard: !!document.querySelector('.q-card .feedback'), ghost: !!document.querySelector('.pr-ghost') }); })()"""
    r2 = json.loads(ev(b, js2, [("metrics", (1200, 900, False))]))
    assert r2 == {'sheet': False, 'inCard': True, 'ghost': False}, r2   # the result stays under the options

def test_sizes_word_in_the_middle_glyphs_big_order_meaning_by_its_sentence(b):
    """2026-11-11: a word alone sits halfway between the question and the options; options of one or two characters come big,
    two by two; 排序's meaning sits right above its sentence; a sentence keeps its last kana with its 。."""
    js = "(async () => { " + FRESH + VOCAB_Q + """ const e = currentEntry(); const out = {}; const box = (s) => document.querySelector(s).getBoundingClientRect();
      const force = (pool, fmt, ok) => { for (const it of pool) { const q = makeQuestion(it, { forceFmt: fmt }); if (q && q.fmt === fmt && (!ok || ok(q))) { e.item = it; e.q = q; e.done = false; renderPractice(); return q; } } return null; };
      force(REG.vocab, 'v-meaning', q => q.stemClass === 'word');
      const ins = box('.q-instr'), st = box('.q-stem'), op = box('.q-card .opts');
      out.word = { size: getComputedStyle(document.querySelector('.q-stem')).fontSize, off: Math.round((st.top + st.bottom) / 2 - (ins.bottom + op.top) / 2), glyph: !!document.querySelector('.opts.glyph') };
      force(REG.kana, 'a-read');
      const o = [...document.querySelectorAll('.opts.glyph .opt')].map(x => x.getBoundingClientRect());
      out.kana = { n: o.length, rows: new Set(o.map(r => Math.round(r.top))).size, size: o.length ? getComputedStyle(document.querySelector('.opts.glyph .opt')).fontSize : '' };
      const g = force(REG.grammar, 'g-order', q => q.zhText);
      const ord = document.querySelector('.q-card .order');
      out.order = { found: !!g, first: ord && ord.firstElementChild.className, outside: !!document.querySelector('.q-card > .q-sub') };
      out.tail = keepTail(furi('静かにしてください。')).endsWith('<span class="nowrap">さい。</span>');
      SESSION = null; document.body.classList.remove('practicing'); return JSON.stringify(out); })()"""
    r = json.loads(ev(b, js, [("metrics", (390, 844))]))
    assert r['word']['size'] == '44px' and abs(r['word']['off']) <= 30 and not r['word']['glyph'], r
    assert r['kana'] == {'n': 4, 'rows': 2, 'size': '32px'}, r
    assert r['order'] == {'found': True, 'first': 'q-sub order-sub', 'outside': False}, r
    assert r['tail'], r

TESTS = [f for n, f in sorted(globals().items()) if n.startswith('test_') and callable(f)]
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
