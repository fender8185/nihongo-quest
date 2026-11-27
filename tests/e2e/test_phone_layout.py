"""2026-11-05 (1.0.42–1.0.43): 手機作答畫面——選項貼在螢幕下方、上方的 ✕ 和進度條往下滑也固定、作答結果從底部升起的面板（選項不動）；電腦版不變。"""
import asyncio, json, os, subprocess, sys, time
sys.path.insert(0, os.path.dirname(__file__))
import websockets
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
    """2026-11-11: a word alone sits halfway between the question and the options; 50音 options and single characters come big,
    two by two (not two-character words, 2026-11-13); 排序's meaning sits right above its sentence; a sentence keeps its last kana with its 。."""
    js = "(async () => { " + FRESH + VOCAB_Q + """ const e = currentEntry(); const out = {}; const box = (s) => document.querySelector(s).getBoundingClientRect();
      const force = (pool, fmt, ok) => { for (const it of pool) { const q = makeQuestion(it, { forceFmt: fmt }); if (q && q.fmt === fmt && (!ok || ok(q))) { e.item = it; e.q = q; e.done = false; renderPractice(); return q; } } return null; };
      force(REG.vocab, 'v-meaning', q => q.stemClass === 'word');
      const ins = box('.q-instr'), st = box('.q-stem'), op = box('.q-card .opts');
      out.word = { size: getComputedStyle(document.querySelector('.q-stem')).fontSize, off: Math.round((st.top + st.bottom) / 2 - (ins.bottom + op.top) / 2), glyph: !!document.querySelector('.opts.glyph') };
      const two = force(REG.vocab, 'v-cloze', q => q.options.every(o => jaPlain(o.text).length === 2));   // 2026-11-13: two-character words keep four rows
      out.two = { found: !!two, glyph: !!document.querySelector('.opts.glyph'), rows: new Set([...document.querySelectorAll('.q-card .opt')].map(x => Math.round(x.getBoundingClientRect().top))).size };
      const one = force(REG.vocab, 'v-cloze', q => q.options.every(o => jaPlain(o.text).length === 1) && q.options.every(o => o.jp));
      out.one = !!one && !!document.querySelector('.opts.glyph');
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
    assert r['two'] == {'found': True, 'glyph': False, 'rows': 4} and r['one'], r
    assert r['order'] == {'found': True, 'first': 'q-sub order-sub', 'outside': False}, r
    assert r['tail'], r

# 2026-11-13, the user (a phone): in a filled blank the kanji sat lower than the kana around them — the blank was a flex box, so
# each ruby became its own item centred with its furigana, its kanji pushed down; the kanji share the kana's line now, and the
# box's words sit on the sentence's line
def test_a_filled_blanks_kanji_sit_on_the_line_of_its_kana(b):
    js = "(async () => { " + FRESH + VOCAB_Q + """ const e = currentEntry();
      let q = null; for (const it of REG.vocab) { const c = makeQuestion(it, { forceFmt: 'v-cloze' }); if (c && c.fmt === 'v-cloze' && /^[ぁ-ん][^<]*<ruby>/.test(c.fillHtml || '')) { e.item = it; e.q = q = c; break; } }
      e.done = false; renderPractice(); answerCurrent(q.answer);
      const box = document.querySelector('.q-card .blank.filled'), ruby = box.querySelector('ruby'), kana = box.firstChild;
      const rect = (node) => { const r = document.createRange(); r.selectNodeContents(node); return r.getBoundingClientRect(); };
      const walk = document.createTreeWalker(document.querySelector('.q-card .q-stem'), NodeFilter.SHOW_TEXT); let before = null;   // the sentence's own words
      while (walk.nextNode()) { const n = walk.currentNode; if (n.textContent.trim() && !n.parentElement.closest('.blank, rt, rp')) { before = n; break; } }
      const out = { fill: q.fillHtml, kana: kana.nodeType === 3, kanaBottom: rect(kana).bottom, kanjiBottom: rect(ruby.firstChild).bottom, before: before && rect(before).bottom, text: before && before.textContent };
      SESSION = null; document.body.classList.remove('practicing'); return JSON.stringify(out); })()"""
    r = json.loads(ev(b, js, [("metrics", (390, 844))]))
    assert r['kana'] and abs(r['kanaBottom'] - r['kanjiBottom']) <= 1, r
    assert r['before'] and abs(r['kanaBottom'] - r['before']) <= 2, r   # level with the sentence (its type is a little smaller)

# 2026-11-11, the user: a unit's 講義 was too much at once on a phone — then: a screen of its own, its pages all one size, read like a
# book (no buttons: swiped; it simply ends). The unit page lists the parts; the lesson flows into pages of the screen's size (each
# section from a new page); a part opens at its page; turning to the last page the first time gives 3 言靈, once a book
def test_a_units_lesson_has_its_own_screen_of_equal_pages(b):
    js = "(async () => { " + FRESH + """ delete LESSON_AT.m2; delete state.koto.found['book-m2']; const k0 = kotoBalance(), wait = (ms) => new Promise(r => setTimeout(r, ms));
      location.hash = '#/course/m2'; route(); await wait(150); const v = document.getElementById('view');
      const toc = { rows: v.querySelectorAll('.toc-row').length, open: v.querySelector('.card-head [data-route="#/course/m2/read"]').textContent, inline: v.querySelectorAll('.lesson h3').length };
      v.querySelector('.toc-row[data-route$="?s=1"]').click(); await wait(200);
      const rd = () => document.querySelector('#view .reader'), track = () => rd().querySelector('.rd-track'), sheets = () => [...rd().querySelectorAll('.rd-sheet')], count = () => rd().querySelector('.rd-count').textContent;
      const sizes = new Set(sheets().map(e => e.clientHeight)), r = rd().getBoundingClientRect();
      const opened = { hash: location.hash, count: count(), h3: rd().querySelectorAll('h3').length, buttons: rd().querySelectorAll('.rd-foot button, [data-act="lesson-page"]').length,
        onPage: sheets()[Math.round(track().scrollLeft / track().clientWidth)].querySelector('h3').textContent.includes('な形容詞'),
        sizes: sizes.size, overflow: sheets().filter(e => e.scrollHeight > e.clientHeight + 1).length, screen: [r.top, r.bottom === innerHeight], wide: document.documentElement.scrollWidth <= innerWidth,
        font: parseFloat(getComputedStyle(rd().querySelector('.rd-sheet li')).fontSize), body: document.body.classList.contains('reading') };
      track().scrollTo({ left: 99999 }); await wait(400); const last = sheets()[sheets().length - 1];
      const end = { last: count().split(' / ')[0] === count().split(' / ')[1], fin: last.textContent.includes('完'), mark: !!last.querySelector('.mark-btn'), start: !!last.querySelector('[data-act="start-unit"]'), gift: state.koto.found['book-m2'], gain: kotoBalance() - k0 };
      track().scrollTo({ left: 0 }); await wait(300); track().scrollTo({ left: 99999 }); await wait(400); end.again = kotoBalance() - k0;
      rd().querySelector('[data-act="nav"]').click(); await wait(200); const back = { hash: location.hash, body: document.body.classList.contains('reading'), open: document.querySelector('#view .card-head [data-route="#/course/m2/read"]').textContent, chip: document.querySelector('#view .card-head .chip-ok').textContent };
      delete state.koto.found['book-m2']; location.hash = '#/course/m2/read?s=end'; await wait(300); const atEnd = { count: count().split(' / ')[0] === count().split(' / ')[1], gift: state.koto.found['book-m2'] || null };
      location.hash = '#/course/intro/read'; await wait(300); const intro = { mark: !!document.querySelector('#view .reader .mark-btn'), h3: document.querySelectorAll('#view .reader h3').length };
      location.hash = '#/course'; await wait(100);
      return JSON.stringify({ toc, opened, end, back, atEnd, intro }); })()"""
    r = json.loads(ev(b, js, [("metrics", (375, 667))]))
    assert r['toc'] == {'rows': 5, 'open': '翻開講義', 'inline': 0}, r   # 這個單元, three sections, 重點整理
    o = r['opened']
    assert o['hash'] == '#/course/m2/read' and o['onPage'] and o['h3'] == 3 and o['buttons'] == 0 and o['sizes'] == 1 and o['overflow'] == 0 and o['screen'] == [0, True] and o['wide'] and o['font'] >= 17 and o['body'], r
    assert r['end'] == {'last': True, 'fin': True, 'mark': False, 'start': False, 'gift': 3, 'gain': 3, 'again': 3}, r   # once a book
    assert r['back'] == {'hash': '#/course/m2', 'body': False, 'open': '翻開講義', 'chip': '翻完過'}, r   # read to the end: it opens at its start again
    assert r['atEnd'] == {'count': True, 'gift': None} and r['intro'] == {'mark': False, 'h3': 13}, r   # opened at its end is not read through

# 2026-11-11, the user: a phone shows no 1–4 on the answers (they are keyboard keys); a computer keeps them. test.5's quiet badge (.pq-num)
# included, no option's key excepted (Ruling 37; test_practice_style draws it)
def test_touch_screens_hide_the_answers_number_keys(b):
    js = """(() => { const rules = [...document.styleSheets].flatMap(sh => { try { return [...sh.cssRules]; } catch (e) { return []; } });
      const touch = rules.filter(r => r.media && /hover: none/.test(r.media.mediaText) && /pointer: coarse/.test(r.media.mediaText)).map(r => r.cssText).join(' ');
      return JSON.stringify({ opt: /\.opt \.kbd(?=[\s,{])/.test(touch), pick: /\.opt-pick \.kbd/.test(touch), none: /display: none/.test(touch) }); })()"""
    r = json.loads(ev(b, js))
    assert r == {'opt': True, 'pick': True, 'none': True}, r

# the phone type scale (2026-11-26, test.4; the user's pick 「16／14／13」): on a phone (390 wide) the three levels are 16／14／13 and the
# shared classes read them — .small 14, .tiny .hint .stat-l .zh-btn .chip 13 (.chip the label level too, ruling 10); on a wide
# screen (1280) the variables and every one of those classes keep their sizes of before (15／13／12; 13, 12, 12, 12, 11, 12)
def test_the_phone_type_scale(b):
    js = """(() => { const r = getComputedStyle(document.documentElement), v = (n) => r.getPropertyValue(n).trim();
      const box = document.createElement('div'); box.innerHTML = '<span class="small">字</span><span class="tiny">字</span><span class="hint">字</span><span class="stat-l">字</span><button type="button" class="zh-btn">中文</button><span class="chip">新</span>';
      document.body.appendChild(box); const px = Object.fromEntries([...box.children].map((e) => [e.className, getComputedStyle(e).fontSize])); box.remove();
      return JSON.stringify({ vars: [v('--fs-read'), v('--fs-sec'), v('--fs-label')], px }); })()"""
    phone = json.loads(ev(b, js, [("metrics", (390, 664))]))
    wide = json.loads(ev(b, js, [("metrics", (1280, 800, False))]))
    assert phone['vars'] == ['16px', '14px', '13px'], phone
    assert phone['px'] == {'small': '14px', 'tiny': '13px', 'hint': '13px', 'stat-l': '13px', 'zh-btn': '13px', 'chip': '13px'}, phone
    assert wide['vars'] == ['15px', '13px', '12px'], wide
    assert wide['px'] == {'small': '13px', 'tiny': '12px', 'hint': '12px', 'stat-l': '12px', 'zh-btn': '11px', 'chip': '12px'}, wide

# ---- the text round (2026-11-26, test.4) ----
# the user: 「希望這些選項解答後（無論對錯）右側也可以有個喇叭符號能夠聽看看這些字詞」, the pick 「選項是真的單字才加（建議）」: in a phone's result
# panel every option that stands for a word of the word list has a speaker at the end of its row, right or wrong — 意思 (the right one the
# word asked, the others the word each meaning belongs to), 看圖選字 (each word) — playing the word's own clip as the word list's 發音
# button does (its text, its reading pinned); in 讀音 only the right reading (ruling 6); a grammar question none. 40 px to tap; a long row
# wraps inside the panel
def test_the_options_words_have_speakers_after_an_answer(b):
    js = "(async () => { " + FRESH + VOCAB_Q + """ const e = currentEntry(), out = {}, wait = (ms) => new Promise((r) => setTimeout(r, ms));
      const word = (w) => REG.vocab.find((x) => x.builtin && jaPlain(x.w) === w), pin = (v) => (v.r && !HAS_KANJI.test(v.r) && v.r !== jaPlain(v.w) ? v.r : '');
      const ask = async (item, fmt, right, opt) => { e.item = item; e.done = false; e.q = makeVocabQuestion(item, Object.assign({ forceFmt: fmt }, opt || {})); if (!e.q || e.q.fmt !== fmt) return null;
        renderPractice(); const q = e.q, pick = right ? q.answer : (q.answer + 1) % 4; answerCurrent(pick); await wait(30);
        const order = q.options.map((o, i) => i).sort((a, c) => (c === q.answer) - (a === q.answer) || (c === pick) - (a === pick));
        const want = (i) => { const o = q.options[i]; if (fmt === 'v-meaning') return i === q.answer ? jaPlain(item.w) : q.optJa[o.text]; if (fmt === 'v-pic') return jaPlain(o.text); return i === q.answer ? jaPlain(item.w) : null; };
        const rows = [...document.querySelectorAll('.fb-sheet .fb-opt')], says = rows.map((r) => r.querySelector('.fb-opt-say'));
        return { n: rows.length, got: says.map((s) => (s ? s.dataset.text : null)), want: order.map(want), rightPin: says[0] ? says[0].dataset.reading === pin(item) : null,
          sizes: says.filter(Boolean).map((s) => { const q2 = s.getBoundingClientRect(); return q2.width >= 40 && q2.height >= 40; }), kana: Boolean(q.kanaOptions) }; };
      out.meaningWrong = await ask(word('座る'), 'v-meaning', false); out.meaningRight = await ask(word('座る'), 'v-meaning', true);
      out.picWrong = await ask(word('傘'), 'v-pic', false, { kana: false }); out.picRight = await ask(word('傘'), 'v-pic', true, { kana: true });
      out.reading = await ask(word('学校'), 'v-reading', false);
      // tapped: the word said as the word list's button says it
      await ask(word('座る'), 'v-meaning', false); const said = [], s0 = speak; speak = (t, o) => { said.push([t, (o && o.reading) || '']); return Promise.resolve(); };
      const tap = document.querySelectorAll('.fb-sheet .fb-opt-say')[1]; tap.click(); out.tap = [said, [tap.dataset.text, tap.dataset.reading]]; speak = s0;
      // a long row wraps inside the panel, its speaker still at its end in sight
      const row = document.querySelectorAll('.fb-sheet .fb-opt')[2], h0 = row.offsetHeight; row.querySelector('.fb-mark + span').textContent = '很長的意思很長的意思很長的意思很長的意思很長的意思'; await wait(30);
      const body = document.querySelector('.fb-sheet-body'), sp = row.querySelector('.fb-opt-say').getBoundingClientRect(), bd = body.getBoundingClientRect();
      out.wrap = { taller: row.offsetHeight > h0, wide: body.scrollWidth <= body.clientWidth, inside: sp.right <= bd.right + 1, tall: document.querySelector('.fb-sheet').getBoundingClientRect().height / innerHeight <= 0.701 };
      const all = SESSION.entries; all.forEach((x, i) => prepareEntry(i)); const gi = all.findIndex((x) => x.q && x.q.kind === 'g' && !x.q.custom && !x.done);
      SESSION.idx = gi; renderPractice(); answerCurrent((all[gi].q.answer + 1) % all[gi].q.options.length); await wait(30);
      out.grammar = [document.querySelectorAll('.fb-sheet .fb-opt').length, document.querySelectorAll('.fb-sheet .fb-opt-say').length];
      SESSION = null; document.body.classList.remove('practicing'); return JSON.stringify(out); })()"""
    r = json.loads(ev(b, js, [("metrics", (390, 664))]))
    for k in ('meaningWrong', 'meaningRight', 'picWrong', 'picRight'):
        x = r[k]
        assert x and x['n'] == 4 and x['got'] == x['want'] and all(x['got']) and x['rightPin'] and x['sizes'] == [True] * 4, (k, x)   # one speaker a word, each its own
    assert r['picRight']['kana'], r   # the options set in kana: still each its word
    x = r['reading']
    assert x['n'] == 4 and x['got'] == [x['want'][0], None, None, None] and x['got'][0] == '学校' and x['rightPin'], x   # the made-up readings: none
    assert r['tap'][0] == [r['tap'][1]] and r['tap'][1][0], r   # played as the word list's 發音 button plays it
    assert r['wrap'] == {'taller': True, 'wide': True, 'inside': True, 'tall': True}, r
    assert r['grammar'][0] == 4 and r['grammar'][1] == 0, r
    # at 375×553 (test.4's fix round 3: Japanese stays whole, Chinese gives way first, 你選的 and the speaker one group at the row's
    # right end): the 意思 row with よろしくお願いします as its aside, picked — the aside whole on one line; and the 中翻日 row of
    # よろしくお願いします, picked — the word whole, its 你選的 and speaker gone under together at the right, the speaker not at the left
    js2 = "(async () => { " + FRESH + VOCAB_Q + """ const e = currentEntry(), out = {}, wait = (ms) => new Promise((r) => setTimeout(r, ms));
      const word = (w) => REG.vocab.find((x) => x.builtin && jaPlain(x.w) === w), yo = word('よろしくお願いします'), box = (el) => el.getBoundingClientRect();
      const whole = (el) => { const c = el.cloneNode(true); c.style.cssText = 'position:absolute;visibility:hidden;white-space:nowrap;width:max-content;max-width:none;flex:none'; el.parentNode.appendChild(c); const W = box(c); c.remove(); return W; };
      const row = async (item, fmt, put) => { e.item = item; e.done = false; e.q = makeVocabQuestion(item, { forceFmt: fmt, kana: false }); const q = e.q, k = (q.answer + 1) % q.options.length; put(q, k);
        renderPractice(); answerCurrent(k); await wait(30);
        const r = document.querySelector('.fb-sheet .fb-opt.bad'), R = box(r), opt = r.querySelector('.fb-mark + span'), zh = r.querySelector('.fb-opt-zh'), you = r.querySelector('.fb-you'), say = r.querySelector('.fb-opt-say'), end = r.querySelector('.fb-opt-end') || say;
        const lines = (el) => Math.round(box(el).height / whole(el).height), mid = (el) => (box(el).top + box(el).bottom) / 2;
        return { fmt: q.fmt, opt: opt.textContent, optJp: opt.classList.contains('jp'), optLines: lines(opt), aside: zh.textContent, asideJp: zh.classList.contains('jp'), asideLines: lines(zh),
          group: Boolean(you && say && end !== say && you.parentNode === end && say.parentNode === end), right: Math.abs(box(end).right - R.right) <= 1, together: Math.abs(mid(you) - mid(say)) <= 12,
          under: box(end).top >= Math.max(box(opt).bottom, box(zh).bottom) - 4, sayLeft: Math.round(box(say).left - R.left), w: Math.round(R.width), wide: r.scrollWidth <= r.clientWidth + 1 }; };
      out.meaning = await row(word('ごめんください'), 'v-meaning', (q, k) => { q.options[k] = { text: yo.m, jp: false }; q.optJa = Object.assign({}, q.optJa, { [yo.m]: jaPlain(yo.w) }); });
      out.recall = await row(word('ごめんください'), 'v-recall', (q, k) => { q.options[k] = { text: yo.w, jp: true }; q.optZh = Object.assign({}, q.optZh, { [yo.w]: yo.m }); });
      SESSION = null; document.body.classList.remove('practicing'); return JSON.stringify(out); })()"""
    r = json.loads(ev(b, js2, [("metrics", (375, 553))]))
    x = r['meaning']
    assert x['fmt'] == 'v-meaning' and not x['optJp'] and x['asideJp'] and 'よろしくお願いします' in x['aside'] and x['asideLines'] == 1 and x['optLines'] <= 2, x   # the Japanese whole, the Chinese wraps
    assert x['group'] and x['right'] and x['together'] and x['wide'], x
    x = r['recall']
    assert x['fmt'] == 'v-recall' and x['optJp'] and 'よろしくお願いします' in x['opt'].replace('ねが', '') and x['optLines'] == 1 and not x['asideJp'] and x['asideLines'] <= 2, x
    assert x['group'] and x['under'] and x['right'] and x['together'] and x['sayLeft'] > x['w'] / 2 and x['wide'], x   # gone under as one, at the right end

# 2026-11-26 (test.4; the user's pick 「分兩頁＋按鈕固定底部」, ruling 4): a lesson section's card in two pages — its patterns (one a line)
# and points, then its examples — its main button 「下一頁：例句」, then 「看完了」 with ‹ 上一頁 beside it, on a phone fixed at the foot of
# the screen however long the page (every section of data.js and data-n3.js); Enter does the main button; a section without examples a
# page; 看完了 as before (the section seen, its question a few later); the 常錯的文法 card the same; a wide screen the same pages, the foot
# under the card
GP = """const wait = (ms) => new Promise((r) => setTimeout(r, ms)), enter = () => document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
  const btn = () => document.getElementById('btnNext'), seen = (el) => { const q = el.getBoundingClientRect(); return q.top >= 0 && q.bottom <= innerHeight; };
  const show = (g, relearn) => { startSession('items', { items: [g].concat(REG.grammar.filter((x) => x.u === g.u && x.key !== g.key).slice(0, 6)) }); route(); const e = currentEntry(); e.preview = true; e.relearn = Boolean(relearn); renderPractice(); window.scrollTo(0, 0); return e; };
  const page = () => ({ n: Number(document.querySelector('.preview.grammar').dataset.page), pats: [...document.querySelectorAll('.preview.grammar .rule .rule-pat')].map((p) => p.textContent), points: document.querySelectorAll('.preview.grammar .points li').length,
    ex: [...document.querySelectorAll('.preview.grammar .example [data-act="speak"]')].map((x) => x.dataset.text), main: btn().textContent.replace('Enter', '').trim(), seen: seen(btn()), back: Boolean(document.querySelector('.gp-foot .gp-back')),
    lesson: Boolean(document.querySelector('.gp-foot .left [data-route$="?tab=lesson"]')), label: document.querySelector('.q-label').textContent });"""
def test_the_grammar_preview_comes_in_two_pages(b):
    js = "(async () => { " + FRESH + GP + """ const g = REG.grammar.find((x) => x.u === 'm1' && x.sec === 0), sec = DATA.LESSONS.m1.sections[0], out = { sec: [sec.rule.split('｜').map((p) => p.trim()), sec.points.length, sec.ex.map((x) => x.jp)] };
      const e = show(g); out.p1 = page(); out.foot = getComputedStyle(document.querySelector('.gp-foot')).position;
      enter(); await wait(30); out.p2 = page(); document.querySelector('.gp-foot .gp-back').click(); await wait(30); out.back = page().n;
      enter(); await wait(30); enter(); await wait(30); out.done = { done: e.previewDone, seen: (state.lessonSeen || []).includes('m1:0'), next: currentEntry() !== e, later: SESSION.entries.indexOf(e) >= 4 };
      // every section with a question, on both its pages: the main button in sight at 390×664
      const off = []; let n = 0;
      for (const [u, L] of Object.entries(DATA.LESSONS)) for (let i = 0; i < L.sections.length; i++) { const it = REG.grammar.find((x) => x.u === u && x.sec === i); if (!it) continue; n++;
        const e2 = show(it); if (!seen(btn())) off.push(u + ':' + i + ':1'); if (grammarPreviewPages(e2) === 2) { previewMain(); window.scrollTo(0, 0); if (!seen(btn())) off.push(u + ':' + i + ':2'); } }
      Object.assign(out, { n, off });
      // a section without examples: one page, 看完了 at once
      const keep = sec.ex; sec.ex = []; const e3 = show(g); out.one = page(); enter(); await wait(30); out.oneDone = e3.previewDone; sec.ex = keep;
      show(g, true); out.relearn = page();
      SESSION = null; document.body.classList.remove('practicing'); return JSON.stringify(out); })()"""
    r = json.loads(ev(b, js, [("metrics", (390, 664))]))
    pats, npoints, ex = r['sec']
    # test.5 (A2): the row 「文法」 and the unit's name, 新 after it (it was 新文法 · …)
    assert r['p1'] == {'n': 1, 'pats': pats, 'points': npoints, 'ex': [], 'main': '下一頁：例句', 'seen': True, 'back': False, 'lesson': True, 'label': r['p1']['label']} and r['p1']['label'].startswith('文法') and r['p1']['label'].endswith('新') and r['foot'] == 'sticky', r
    assert r['p2'] == {'n': 2, 'pats': [], 'points': 0, 'ex': ex, 'main': '看完了', 'seen': True, 'back': True, 'lesson': True, 'label': r['p1']['label']} and len(ex) >= 1, r
    assert r['back'] == 1 and r['done'] == {'done': True, 'seen': True, 'next': True, 'later': True}, r   # Enter, Enter: 看完了 as before
    assert r['n'] >= 130 and r['off'] == [], r   # every section (the longest, m27's 比喻 at 1,300 px, too): in sight on both pages
    assert r['one']['main'] == '看完了' and not r['one']['back'] and r['one']['ex'] == [] and r['oneDone'], r
    assert r['relearn']['label'].startswith('文法常錯 · ') and r['relearn']['main'] == '下一頁：例句', r   # test.5 (A2): it was 常錯的文法 · …
    wide = json.loads(ev(b, "(async () => { " + FRESH + GP + """ const g = REG.grammar.find((x) => x.u === 'm1' && x.sec === 0); show(g); const f = document.querySelector('.gp-foot'), c = document.querySelector('.q-card');
      const out = { p1: page().main, pos: getComputedStyle(f).position, under: f.getBoundingClientRect().top >= c.getBoundingClientRect().bottom }; previewMain(); out.p2 = page().main;
      SESSION = null; document.body.classList.remove('practicing'); return JSON.stringify(out); })()""", [("metrics", (1280, 800, False))]))
    assert wide == {'p1': '下一頁：例句', 'pos': 'static', 'under': True, 'p2': '看完了'}, wide

# 講義 (test.4): a section's patterns one a line, as the preview's — split at 「｜」, each on its own line, read at 16 px on a phone (13 on a
# wide screen, as before)
def test_a_lesson_rule_shows_one_pattern_a_line(b):
    js = "(async () => { " + FRESH + """ const wait = (ms) => new Promise((r) => setTimeout(r, ms)); location.hash = '#/course/m3/read?s=0'; route(); await wait(400);
      const rd = document.querySelector('#view .reader'), tr = rd.querySelector('.rd-track'), sh = rd.querySelectorAll('.rd-sheet')[Math.round(tr.scrollLeft / tr.clientWidth)], rule = sh.querySelector('.rule');
      const pats = [...rule.querySelectorAll('.rule-pat')], box = pats.map((p) => p.getBoundingClientRect());
      const out = { want: DATA.LESSONS.m3.sections[0].rule.split('｜').map((p) => p.trim()), pats: pats.map((p) => p.textContent), size: getComputedStyle(rule).fontSize, lines: box.every((q, i) => !i || q.top >= box[i - 1].bottom - 1) };
      location.hash = '#/course'; await wait(100); return JSON.stringify(out); })()"""
    r = json.loads(ev(b, js, [("metrics", (390, 664))]))
    assert len(r['want']) == 4 and r['want'][2] == '来[く]る→来[き]て' and r['pats'] == ['一段：去る＋て', 'する→して', '来くる→来きて', '五段：依字尾變化'] and r['lines'] and r['size'] == '16px', r
    w = json.loads(ev(b, js, [("metrics", (1280, 800, False))]))
    assert w['pats'] == r['pats'] and w['lines'] and w['size'] == '13px', w

# 講義's pages (test.4): with a section's patterns one a line at 16 px, a heading with its patterns and its first point ran past a 375×553
# page and the page scrolled — a block that does not fit with the ones it goes along with goes on to the next page alone, so no page
# scrolls but one holding a single block taller than a page (五十音's table); every section still begins a page
def test_no_lesson_page_scrolls_but_for_one_tall_block(b):
    js = "(async () => { " + FRESH + """ const wait = (ms) => new Promise((r) => setTimeout(r, ms)), bad = [], heads = []; let pages = 0;
      for (const u of Object.keys(DATA.LESSONS)) { location.hash = `#/course/${u === 'm0' ? 'intro' : u}/read`; route(); await wait(150); if (document.fonts) await document.fonts.ready; await wait(50);
        const probe = () => [...document.querySelectorAll('#view .rd-sheet')].filter((sh) => sh.scrollHeight > sh.clientHeight + 1 && sh.querySelectorAll(':scope > [data-b]').length > 1);
        if (probe().length) { window.dispatchEvent(new Event('resize')); await wait(400); }   // a web font come late: drawn again
        const sheets = [...document.querySelectorAll('#view .rd-sheet')]; pages += sheets.length;
        probe().forEach((sh) => bad.push(u + ':' + sheets.indexOf(sh)));
        const starts = sheets.map((sh) => sh.querySelector(':scope > [data-b]')).filter((el) => el.querySelector(':scope > h3')).length;
        heads.push(starts === DATA.LESSONS[u].sections.length || u + ':' + starts); }
      location.hash = '#/course'; await wait(100); return JSON.stringify({ bad, pages, heads: heads.filter((x) => x !== true) }); })()"""
    r = json.loads(ev(b, js, [("metrics", (375, 553))]))
    assert r['bad'] == [] and r['heads'] == [] and r['pages'] > 600, r

# test.4's fix round (review Minor 4): with the speaker at a row's end, よろしくお願いしま／す broke inside the word — the option stays whole
# on its line unless it alone is wider than the row, the aside beside it wrapping first (or going under); a long option (a grammar
# question's Chinese sentences) still wraps inside its row; no row runs past the panel. At 390×664 and 375×553, the word the review
# found broken chosen wrong (its aside, 你選的 and the speaker beside it)
def test_a_long_word_option_stays_whole_in_its_row(b):
    js = "(async () => { " + FRESH + """ const wait = (ms) => new Promise((r) => setTimeout(r, ms)), out = {};
      const lines = (el) => { const tw = document.createTreeWalker(el, NodeFilter.SHOW_TEXT), bottoms = new Set(); while (tw.nextNode()) { const n = tw.currentNode; if (!n.textContent.trim() || n.parentElement.closest('rt')) continue;
        const rg = document.createRange(); rg.selectNodeContents(n); [...rg.getClientRects()].forEach((q) => bottoms.add(Math.round(q.bottom))); } return bottoms.size; };
      const inside = () => [...document.querySelectorAll('.fb-sheet .fb-opt')].every((row) => { const R = row.getBoundingClientRect(); return row.scrollWidth <= row.clientWidth + 1 && [...row.children].every((c) => { const q = c.getBoundingClientRect(); return q.left >= R.left - 1 && q.right <= R.right + 1; }); });
      const body = () => { const x = document.querySelector('.fb-sheet-body'); return x.scrollWidth <= x.clientWidth + 1; };
      const target = REG.vocab.find((x) => x.builtin && jaPlain(x.w) === 'よろしくお願いします'), peers = REG.vocab.filter((x) => x.builtin && x.p === target.p && x.key !== target.key);
      let v = null, q = null; for (let n = 0; n < 600 && !q; n++) { const c = peers[n % peers.length], t = makeVocabQuestion(c, { forceFmt: 'v-recall', kana: false }); if (t && t.fmt === 'v-recall' && t.options.some((o) => o.text === target.w)) { v = c; q = t; } }
      startSession('items', { items: [v, v, v] }); route(); let e = currentEntry(); e.preview = false; e.q = q; renderPractice(); answerCurrent(q.options.findIndex((o) => o.text === target.w)); await wait(50);
      const row = [...document.querySelectorAll('.fb-sheet .fb-opt')].find((r) => r.querySelector('.fb-mark + span').textContent.includes('よろしく'));
      out.word = { lines: lines(row.querySelector('.fb-mark + span')), aside: Boolean(row.querySelector('.fb-opt-zh')), you: Boolean(row.querySelector('.fb-you')), say: Boolean(row.querySelector('.fb-opt-say')), inside: inside(), body: body() };
      // a grammar question's long options (句意: Chinese sentences up to 30 characters), answered wrong: each wraps inside its row
      const g = REG.grammar.filter((x) => x.t === 'meaning').map((x) => [x, makeQuestion(x, {})]).filter(([, t]) => t && !t.custom).sort((a, c) => Math.max(...c[1].options.map((o) => o.text.length)) - Math.max(...a[1].options.map((o) => o.text.length)))[0];
      startSession('items', { items: [g[0], g[0]] }); route(); e = currentEntry(); e.preview = false; e.q = g[1]; renderPractice(); answerCurrent((g[1].answer + 1) % g[1].options.length); await wait(50);
      const spans = [...document.querySelectorAll('.fb-sheet .fb-opt .fb-mark + span')];
      out.grammar = { rows: spans.length, wrapped: Math.max(...spans.map(lines)) > 1, inside: inside(), body: body() };
      SESSION = null; document.body.classList.remove('practicing'); return JSON.stringify(out); })()"""
    for w, h in ((390, 664), (375, 553)):
        r = json.loads(ev(b, js, [("metrics", (w, h))]))
        assert r['word'] == {'lines': 1, 'aside': True, 'you': True, 'say': True, 'inside': True, 'body': True}, (w, r)
        assert r['grammar'] == {'rows': 4, 'wrapped': True, 'inside': True, 'body': True}, (w, r)

# test.4's fix rounds 1 and 2 (review Minor 6, Ruling 19): on a preview a button the keyboard focused (Tab: it shows :focus-visible) does
# its own on Enter — ‹ 上一頁 turns back to page 1, 看完整講義 opens the lesson, and the card is not put away; one a mouse click focused
# (Chrome and Firefox focus a clicked button) leaves Enter to the main button, as before fix round 1; the main button and nothing
# focused as before. Real input through CDP (a synthetic event skips the browser's focus rules)
def keyed(b, w, h, steps):
    """steps ('eval', js) | ('enter',) | ('tabto', css): Tab pressed until the focus is on css (True once there) | ('click', css): a mouse
    click at its middle — run in b's page at w×h in one session, as a real keyboard and mouse would; the evals' and tabtos' values"""
    async def go():
        async with websockets.connect(b.ws_url, max_size=None) as ws:
            n = 0
            async def call(m, p=None):
                nonlocal n; n += 1; k = n
                await ws.send(json.dumps({"id": k, "method": m, "params": p or {}}))
                while True:
                    r = json.loads(await ws.recv())
                    if r.get("id") == k:
                        if "error" in r: raise RuntimeError(f"{m}: {r['error']}")
                        return r.get("result", {})
            async def ev_(js):
                r = await call("Runtime.evaluate", {"expression": js, "returnByValue": True, "awaitPromise": True})
                if "exceptionDetails" in r: raise RuntimeError(r["exceptionDetails"].get("exception", {}).get("description", "eval error"))
                return r["result"].get("value")
            async def key(name, code, text=None):
                k = {"key": name, "code": code, "windowsVirtualKeyCode": code_of[name], "nativeVirtualKeyCode": code_of[name]}
                await call("Input.dispatchKeyEvent", dict(k, type="keyDown", **({"text": text, "unmodifiedText": text} if text else {})))
                await call("Input.dispatchKeyEvent", dict(k, type="keyUp"))
            code_of = {"Enter": 13, "Tab": 9}
            await call("Page.enable"); await call("Page.addScriptToEvaluateOnNewDocument", {"source": "window.NQ_E2E = 1"})
            await call("Emulation.setDeviceMetricsOverride", {"width": w, "height": h, "deviceScaleFactor": 1, "mobile": False})
            await call("Page.navigate", {"url": URL})
            for _ in range(300):
                try:
                    if await ev_(READY): break
                except Exception: pass
                await asyncio.sleep(0.1)
            out = []
            for st in steps:
                if st[0] == 'eval': out.append(await ev_(st[1]))
                elif st[0] == 'enter': await key("Enter", "Enter", "\r"); await asyncio.sleep(0.2)
                elif st[0] == 'tabto':
                    there = False
                    for _ in range(40):
                        if await ev_(f"Boolean(document.activeElement && document.activeElement.matches({json.dumps(st[1])}))"): there = True; break
                        await key("Tab", "Tab"); await asyncio.sleep(0.03)
                    out.append(there)
                elif st[0] == 'click':
                    x, y = json.loads(await ev_(f"(() => {{ const q = document.querySelector({json.dumps(st[1])}).getBoundingClientRect(); return JSON.stringify([q.left + q.width / 2, q.top + q.height / 2]); }})()"))
                    await call("Input.dispatchMouseEvent", {"type": "mouseMoved", "x": x, "y": y})
                    await call("Input.dispatchMouseEvent", {"type": "mousePressed", "x": x, "y": y, "button": "left", "buttons": 1, "clickCount": 1})
                    await call("Input.dispatchMouseEvent", {"type": "mouseReleased", "x": x, "y": y, "button": "left", "buttons": 0, "clickCount": 1}); await asyncio.sleep(0.2)
            return out
    return asyncio.run(go())

def test_a_focused_button_on_the_grammar_preview_keeps_its_own_key(b):
    setup = "(async () => { " + FRESH + GP + """ const g = REG.grammar.find((x) => x.u === 'm1' && x.sec === 0); window.__e = show(g); window.__page = () => JSON.stringify({ page: document.querySelector('.preview.grammar') ? Number(document.querySelector('.preview.grammar').dataset.page) : 0, done: Boolean(__e.previewDone), hash: location.hash });
      previewMain(); await wait(30); return 1; })()"""
    shown = "JSON.stringify({ text: document.activeElement.textContent.trim(), keyboard: document.activeElement.matches(':focus-visible') })"
    r = keyed(b, 1280, 800, [('eval', setup), ('tabto', '.gp-foot .gp-back'), ('eval', shown), ('enter',), ('eval', "__page()"),   # ‹ 上一頁 reached by Tab: back to page 1
        ('eval', "(document.activeElement && document.activeElement.blur(), 1)"), ('enter',), ('eval', "__page()"),                    # nothing focused: the main one, page 2
        ('tabto', '.gp-foot .left [data-route]'), ('enter',), ('eval', "__page()"),                                                      # 看完整講義 reached by Tab: the lesson
        ('eval', "(location.hash = '#/practice', new Promise((r) => setTimeout(r, 300)).then(() => { previewPage(2); return 1; }))"),
        ('tabto', '#btnNext'), ('enter',), ('eval', "__page()")])                                                                          # 看完了 reached by Tab: as before
    tabbed, focus, back, main, tab2, lesson, tab3, done = r[1], json.loads(r[2]), json.loads(r[3]), json.loads(r[5]), r[6], json.loads(r[7]), r[9], json.loads(r[10])   # an eval's or a tabto's value each
    assert tabbed and focus == {'text': '‹ 上一頁', 'keyboard': True} and back == {'page': 1, 'done': False, 'hash': '#/practice'}, r
    assert main == {'page': 2, 'done': False, 'hash': '#/practice'}, r
    assert tab2 and lesson['done'] is False and lesson['hash'].startswith('#/course/m1'), r
    assert tab3 and done['done'] is True, r

def test_a_clicked_button_on_a_word_preview_leaves_enter_to_the_main_one(b):
    setup = "(async () => { " + FRESH + """ const wait = (ms) => new Promise((r) => setTimeout(r, ms)), v = REG.vocab.find((x) => x.builtin && jaPlain(x.w) === '座る');
      startSession('items', { items: [v, v, v] }); route(); window.__e = currentEntry(); __e.preview = true; __e.previewDone = false; renderPractice(); await wait(300);
      speak = () => Promise.resolve(); window.__replays = 0; const r0 = ACTIONS.replay; ACTIONS.replay = (...a) => { __replays++; return r0(...a); }; return Boolean(document.querySelector('.preview')); })()"""
    state = "JSON.stringify({ act: (document.activeElement.dataset || {}).act || '', keyboard: document.activeElement.matches(':focus-visible'), replays: __replays, done: Boolean(__e.previewDone), on: currentEntry() !== __e })"
    r = keyed(b, 1280, 800, [('eval', setup), ('click', '.pr-actions [data-act="replay"]'), ('eval', state), ('enter',), ('eval', state)])
    clicked, after = json.loads(r[1]), json.loads(r[2])
    assert r[0] and clicked == {'act': 'replay', 'keyboard': False, 'replays': 1, 'done': False, 'on': False}, r   # the click: 發音 played and focused (not as the keyboard's)
    assert after['replays'] == 1 and after['done'] and after['on'], r   # Enter: the preview goes on, no replay

# 2026-11-27 (test.5; the user: 「讀解文章的排版也幫我調整一下」, the pick 「選項固定在下方」): a reading question's passage scrolls on its own
# and its question and four options stand in a panel of their own (.rp-ask) — on a phone held upright pinned across the foot of the
# screen under the passage, as the result panel is; on a wide screen, and on a phone on its side (fix round 1, Ruling 34), beside the
# passage — the page as tall as the screen. At every size of the matrix and the three landscape ones, for the longest passage of data.js
# and data-n3.js and the shortest: from the first frame the question (whole, or at 568×320 its first line with 還有) and the four options
# are in sight, each option's middle taps it, the passage's first line is in sight and it scrolls on to its last line; the passage's
# 17 px, the question's 18 (20 wider than 600 px) and the furigana as they were; no label row on an SE or a phone on its side (fix
# round 1: its 27 px go to the question and the passage)
RP_SIZES = [(360, 640), (375, 553), (390, 664), (412, 780), (430, 740), (768, 1024), (1024, 768), (1280, 800)]
RP_LAND = [(667, 375), (640, 360), (568, 320)]   # a phone on its side (fix round 1, Ruling 34)
def rp_land(w, h): return w > h and h <= 500   # a short landscape screen
def rp_side(w, h): return w > 600 or rp_land(w, h)   # the panel beside the passage (else pinned across the screen's foot)
def rp_metrics(w, h): return ("metrics", (w, h, w <= 430 or rp_land(w, h)))   # a phone's emulation (scale 2) for the phones
RP = """const wait = (ms) => new Promise((r) => setTimeout(r, ms)), len = (x) => jaPlain(x.passage).length;
  const byLen = REG.read.slice().sort((a, c) => len(c) - len(a) || (a.id < c.id ? -1 : 1)), items = { long: byLen[0], short: byLen[byLen.length - 1] };
  const box = (el) => el.getBoundingClientRect(), inView = (q) => q.top >= -0.5 && q.bottom <= innerHeight + 0.5 && q.left >= -0.5 && q.right <= innerWidth + 0.5;
  // whole in sight: inside the screen and inside every box that clips it (the panel, the passage)
  const shown = (el) => { const r = box(el); let top = 0, bot = innerHeight, a = el.parentElement;
    while (a && a !== document.body) { if (/auto|scroll|hidden|clip/.test(getComputedStyle(a).overflowY)) { const q = box(a); top = Math.max(top, q.top + a.clientTop); bot = Math.min(bot, q.top + a.clientTop + a.clientHeight); } a = a.parentElement; }
    return r.top >= top - 0.5 && r.bottom <= bot + 0.5 && inView(r); };
  const hits = (o) => { const r = box(o), h = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return Boolean(h && h.closest('.opt') === o); };
  const lineRect = (p, last) => { const tw = document.createTreeWalker(p, NodeFilter.SHOW_TEXT); let n = null;
    while (tw.nextNode()) { const t = tw.currentNode; if (t.textContent.trim() && !t.parentElement.closest('rt')) { n = t; if (!last) break; } }
    const rg = document.createRange(); rg.selectNodeContents(n); const rs = [...rg.getClientRects()]; return rs[last ? rs.length - 1 : 0]; };
  // a reading question with its options in the data's order: the app shuffles them, and two by two (a phone on its side) a row is as tall
  // as its taller option, so a test draws one order
  const rpAsk = (it) => { const q = makeQuestion(it, {}), right = q.options[q.answer]; q.options.sort((a, c) => it.op.indexOf(a.text) - it.op.indexOf(c.text)); q.answer = q.options.indexOf(right); return q; };
  const show = async (it) => { startSession('items', { items: [it, it] }); route(); const e = currentEntry(); e.preview = false; e.q = rpAsk(it); renderPractice(); window.scrollTo(0, 0);
    await wait(80); if (document.fonts) await document.fonts.ready; return e; };
  // scrolled to its end, the passage's last line inside its box, in sight and above the result panel if one is up
  const readsToEnd = async (p) => { const t0 = p.scrollTop; p.scrollTop = 1e6; await wait(60); const L = lineRect(p, true), P = box(p), sh = document.querySelector('.fb-sheet');
    const ok = L.top >= P.top - 1 && L.bottom <= Math.min(P.bottom, sh ? box(sh).top : innerHeight) + 1; p.scrollTop = t0; await wait(30); return ok; };
  const parts = () => ({ p: document.querySelector('.q-card .passage'), ask: document.querySelector('.q-card.rp-card > .rp-ask') });
  // whether the question scrolls inside the panel (as the app counts it: more than 2 px below) and, if so, whether it says so — rp-more on
  // it and 還有 in sight at its foot's right (fix round 1)
  const cue = (stem) => { const more = stem.scrollHeight - stem.clientHeight - stem.scrollTop > 2, c = document.querySelector('.rp-ask > .q-stem + .rp-qcue > span');
    if (!more) return [false, true]; const S = box(stem), C = c && box(c);
    return [true, stem.classList.contains('rp-more') && Boolean(C) && getComputedStyle(c).opacity === '1' && C.width > 20 && C.right <= S.right + 1 && C.bottom <= S.bottom + 1 && C.bottom >= S.bottom - 30]; };"""
def test_a_reading_question_shows_its_question_and_options_from_the_first_frame(b):
    js = "(async () => { " + FRESH + RP + """ const out = { ids: [items.long.id, items.short.id] };
      for (const [k, it] of Object.entries(items)) { const e = await show(it), { p, ask } = parts();
        const stem = document.querySelector('.q-card .q-stem'), opts = [...document.querySelectorAll('.q-card .opt')], F = lineRect(p, false), P = box(p), A = ask ? box(ask) : null, label = document.querySelector('.q-card .q-label');
        out[k] = { n: opts.length, stem: shown(stem), whole: stem.scrollHeight <= stem.clientHeight + 1, cued: cue(stem)[1], opts: opts.every(shown), hits: opts.every(hits),
          first: F.top >= P.top - 1 && F.bottom <= P.bottom + 1 && inView(F), toEnd: await readsToEnd(p), page: document.documentElement.scrollHeight <= innerHeight + 1,
          under: Boolean(A) && A.top >= P.bottom - 1, foot: A && [Math.round(A.left), Math.round(A.right) - innerWidth, Math.round(A.bottom) - innerHeight], beside: Boolean(A) && A.left >= P.right - 1,
          label: getComputedStyle(label).display !== 'none', sizes: [getComputedStyle(p).fontSize, getComputedStyle(stem).fontSize], html: p.innerHTML === e.q.passageHtml,
          bare: !/<r(?:uby|t)\\s/.test(document.querySelector('.q-card').innerHTML) }; }
      SESSION = null; document.body.classList.remove('practicing'); return JSON.stringify(out); })()"""
    for w, h in RP_SIZES + RP_LAND:
        r = json.loads(ev(b, js, [rp_metrics(w, h)]))
        assert r['ids'][0] == 'rd-416', (w, h, r)   # the longest passage (623 characters, N3)
        for k in ('long', 'short'):
            x = r[k]
            assert x['n'] == 4 and x['stem'] and x['opts'] and x['hits'] and x['cued'], (w, h, k, x)   # the question and every option in sight, each tapped at its middle
            if (w, h) != (568, 320): assert x['whole'], (w, h, k, x)   # the question whole (at 568×320 the longest's scrolls inside the panel, saying 還有)
            assert x['first'] and x['toEnd'] and x['page'], (w, h, k, x)   # the passage's first line in sight, its last one reached by scrolling it; the page itself does not scroll
            assert x['html'] and x['bare'], (w, h, k, x)   # the passage and its furigana as they were, no attribute on a <ruby> or an <rt>
            assert x['sizes'] == ['17px', '18px' if w <= 600 else '20px'], (w, h, k, x)
            assert x['label'] == (not (w <= 600 and h <= 600) and not rp_land(w, h)), (w, h, k, x)   # no label row on an SE or a phone on its side
            if rp_side(w, h): assert x['beside'], (w, h, k, x)   # a wide screen or a phone on its side: the panel beside the passage
            else: assert x['under'] and x['foot'] == [0, 0, 0], (w, h, k, x)   # a phone held upright: under the passage, across the screen at its foot

# …and answered, right and wrong: the options stay put, the passage is where it was read to and still reads on to its last line — on a
# phone (upright or on its side) above the result panel, which rises as for any question (its 下一題 in sight, 70% of the screen at the
# most) — and 下一題 is in sight; the passage's 中文翻譯 is there to open (in the result panel on a phone, under the result on a wide
# screen); no 發音 (Ruling 33)
def test_a_reading_question_answered_keeps_its_passage_readable_and_next_in_sight(b):
    js = "(async () => { " + FRESH + RP + """ const out = {};
      for (const [k, it] of Object.entries(items)) for (const right of [false, true]) { const e = await show(it), { p } = parts();
        p.scrollTop = 30; await wait(30); const read = p.scrollTop, tops = () => [...document.querySelectorAll('.q-card .opt')].map((o) => Math.round(box(o).top)).join(','), t0 = tops();
        answerCurrent(right ? e.q.answer : (e.q.answer + 1) % 4); await wait(700);   // the panel's rise
        const p2 = parts().p, nb = document.getElementById('btnNext'), N = box(nb), hit = document.elementFromPoint(N.left + N.width / 2, N.top + N.height / 2), sh = document.querySelector('.fb-sheet');
        out[k + (right ? 'Right' : 'Wrong')] = { same: tops() === t0, kept: p2.scrollTop === read, scrolls: p2.scrollHeight > p2.clientHeight + 1, toEnd: await readsToEnd(p2),
          next: inView(N) && Boolean(hit && hit.closest('#btnNext')), sheet: sh ? box(sh).height / innerHeight : 0, replay: Boolean(document.querySelector('#view [data-act="replay"]')),
          zh: [...document.querySelectorAll(sh ? '.fb-sheet details > summary' : '.q-card details > summary')].map((s) => s.textContent) }; }
      SESSION = null; document.body.classList.remove('practicing'); return JSON.stringify(out); })()"""
    for w, h in RP_SIZES + RP_LAND:
        r = json.loads(ev(b, js, [rp_metrics(w, h)]))
        for k in ('longWrong', 'longRight', 'shortWrong', 'shortRight'):
            x = r[k]
            assert x['same'] and x['kept'] and x['toEnd'] and x['next'] and not x['replay'], (w, h, k, x)
            assert x['zh'] == ['短文的中文翻譯'], (w, h, k, x)
            if k.startswith('long'): assert x['scrolls'], (w, h, k, x)   # the passage can still be scrolled
            if w <= 600 or rp_land(w, h): assert 0 < x['sheet'] <= 0.701, (w, h, k, x)   # the result panel as before (a phone on its side too)
            else: assert x['sheet'] == 0, (w, h, k, x)

# every reading question of data.js and data-n3.js (305 on 2026-11-27) at every size of the matrix and the three landscape ones (fix round
# 1), drawn in the data's option order (rpAsk), once plainly and once with a session's note over the card: the four options whole in sight
# and tapped at their middle, the question's box (a line at the least) and the passage's first line in sight, the page not scrolled. But at
# 568×320, five N3 questions whose options run to four lines two by two (RP_MISS: their second row is cut, the panel scrolls). The
# question whole but where it is too long for the room — then it scrolls inside the panel saying 還有: at 375×553 and 360×640 the
# 情報検索's conditions (rd-489's 121 characters, rd-501's 154), on a phone on its side also rd-451 (its options of up to 40) and at
# 568×320 most long N3 ones (RP_SCROLLS, ==: a stale or broad entry fails too); with the note (shown on a wide screen only: hidden on a
# phone, upright or on its side) rd-501 at 1024×768 as well. Measured 2026-11-28
RP_SCROLLS = {(375, 553): {'rd-489', 'rd-501'}, (360, 640): {'rd-501'}, (667, 375): {'rd-451', 'rd-489', 'rd-501'}, (640, 360): {'rd-451', 'rd-489', 'rd-501'},
    (568, 320): {'rd-027', 'rd-035', 'rd-404', 'rd-415', 'rd-416', 'rd-417', 'rd-422', 'rd-423', 'rd-429', 'rd-432', 'rd-433', 'rd-434', 'rd-437', 'rd-438', 'rd-440', 'rd-446',
                 'rd-447', 'rd-450', 'rd-451', 'rd-452', 'rd-457', 'rd-458', 'rd-462', 'rd-464', 'rd-470', 'rd-476', 'rd-482', 'rd-488', 'rd-489', 'rd-490', 'rd-492', 'rd-494',
                 'rd-495', 'rd-496', 'rd-499', 'rd-500', 'rd-501', 'rd-517', 'rd-537'}}
RP_SCROLLS_NOTE = {(1024, 768): {'rd-501'}}
RP_MISS = {(568, 320): {'rd-027', 'rd-451', 'rd-470', 'rd-488', 'rd-500'}}
def test_every_reading_question_shows_its_options_and_passage_from_the_first_frame(b):
    js = "(async () => { " + FRESH + RP + """ startSession('items', { items: [items.long, items.long] }); route(); const e = currentEntry(); e.preview = false;
      const draw = (it) => { e.item = it; e.q = rpAsk(it); e.done = false; e.chosen = undefined; e.rpTop = 0; e.rpStem = 0; e.rpStemH = 0; renderPractice(); window.scrollTo(0, 0); };
      // every passage drawn once first: the web font's pieces their kanji need are fetched (display: swap), then they are measured with them
      for (const it of REG.read) { draw(it); void document.body.offsetHeight; } await wait(300); if (document.fonts) await document.fonts.ready;
      const out = { n: REG.read.length };
      for (const note of [false, true]) { SESSION.meta = Object.assign({}, SESSION.meta, { note: note ? '這是一段練習說明，看完就開始作答。' : '' }); const bad = [], scrolls = [], uncued = [];
        for (const it of REG.read) { draw(it);
          const { p } = parts(), stem = document.querySelector('.q-card .q-stem'), opts = [...document.querySelectorAll('.q-card .opt')], F = lineRect(p, false), P = box(p);
          const ok = opts.length === 4 && opts.every((o) => shown(o) && hits(o)) && inView(box(stem)) && stem.clientHeight >= 34 && F.top >= P.top - 1 && F.bottom <= P.bottom + 1 && inView(F)
            && document.documentElement.scrollHeight <= innerHeight + 1;
          if (!ok) bad.push(it.id);
          const [more, cued] = cue(stem); if (more) scrolls.push(it.id); if (!cued) uncued.push(it.id); }
        const n = document.querySelector('#view > .plan-note');
        out[note ? 'note' : 'plain'] = { bad, scrolls, uncued, noteShown: Boolean(n) && getComputedStyle(n).display !== 'none' }; }
      SESSION = null; document.body.classList.remove('practicing'); return JSON.stringify(out); })()"""
    for w, h in RP_SIZES + RP_LAND:
        r = json.loads(ev(b, js, [rp_metrics(w, h)]))
        assert r['n'] >= 300, (w, h, r['n'])
        for k in ('plain', 'note'):
            x = r[k]
            assert set(x['bad']) == RP_MISS.get((w, h), set()), (w, h, k, x['bad'])
            assert set(x['scrolls']) == RP_SCROLLS.get((w, h), set()) | (RP_SCROLLS_NOTE.get((w, h), set()) if k == 'note' else set()), (w, h, k, x['scrolls'])
            assert x['uncued'] == [], (w, h, k, x['uncued'])   # each question that scrolls says so
        assert r['note']['noteShown'] == (not rp_land(w, h) and w > 600), (w, h, r['note'])   # the note over a reading card on a wide screen only

# the keyboard on a reading question as on any: 1–4 answer, Enter goes on (a phone's width and a wide screen)
def test_a_reading_question_answers_by_the_keyboard(b):
    js = "(async () => { " + FRESH + RP + """ const key = (k) => document.body.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true }));
      const e = await show(items.long); key('3'); await wait(50); const out = { done: e.done, chosen: e.chosen, built: Boolean(parts().ask) };
      key('Enter'); await wait(50); out.on = SESSION.idx;
      SESSION = null; document.body.classList.remove('practicing'); return JSON.stringify(out); })()"""
    for w, h in ((390, 664), (1280, 800)):
        r = json.loads(ev(b, js, [rp_metrics(w, h)]))
        assert r == {'done': True, 'chosen': 2, 'built': True, 'on': 1}, (w, h, r)

# Ruling 33 (fix round 1): a reading question has no 發音 anywhere — not on the panel's foot beside the passage before or after the answer,
# nor in a phone's result panel — and R does nothing there, no toast (a passage has no clip: the button only ever toasted 「作答後可以聽
# 整句。」); a word question keeps its 發音 and R
def test_a_reading_question_has_no_speaker_and_r_does_nothing(b):
    js = "(async () => { " + FRESH + RP + """ const key = (k) => document.body.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true }));
      const said = [], s0 = speak, s1 = speakScript; speak = (t) => { said.push(t); return Promise.resolve(); }; speakScript = (t) => { said.push(t); return Promise.resolve(); };
      const toast = () => document.getElementById('toast').classList.contains('show'), btn = () => Boolean(document.querySelector('#view [data-act="replay"]')), out = {};
      const e = await show(items.long); out.before = btn(); key('r'); await wait(50); out.rBefore = [said.length, toast()];
      answerCurrent((e.q.answer + 1) % 4); await wait(700); out.after = btn(); key('R'); await wait(50); out.rAfter = [said.length, toast()];
      const v = REG.vocab.find((x) => x.builtin && jaPlain(x.w) === '学校'); startSession('items', { items: [v, v] }); route(); const e2 = currentEntry(); e2.preview = false; e2.autoPlayed = true;
      e2.q = makeVocabQuestion(v, { forceFmt: 'v-meaning' }); renderPractice(); await wait(50); out.word = btn(); key('r'); await wait(50); out.wordSaid = said.length;
      speak = s0; speakScript = s1; SESSION = null; document.body.classList.remove('practicing'); return JSON.stringify(out); })()"""
    for w, h in ((390, 664), (1280, 800), (667, 375)):
        r = json.loads(ev(b, js, [rp_metrics(w, h)]))
        assert r['before'] is False and r['after'] is False and r['rBefore'] == [0, False] and r['rAfter'] == [0, False], (w, h, r)
        assert r['word'] is True and r['wordSaid'] == 1, (w, h, r)   # 發音 elsewhere as before

# fix round 1 (review Minor 3): a phone's reading panel runs across the screen to its foot whatever the card's padding or border or the
# page's gutter (Task 3 restyles the card): its margins are the screen's half-width either side of the card's middle, no sum of paddings
def test_the_reading_panel_spans_the_screen_whatever_the_cards_padding(b):
    js = "(async () => { " + FRESH + RP + """ await show(items.long); const st = document.createElement('style'); document.head.appendChild(st); const out = [];
      for (const css of ['', '.q-card.rp-card { padding-left: 24px !important; padding-right: 24px !important; }', '.q-card.rp-card { padding-left: 12px !important; padding-right: 12px !important; }',
        '.q-card.rp-card { border-left-width: 3px !important; border-right-width: 3px !important; }', 'body.practicing .content { padding-left: 20px !important; padding-right: 20px !important; }']) {
        st.textContent = css; await wait(30); const A = box(parts().ask);
        out.push([Math.round(A.left), Math.round(A.right) - innerWidth, Math.round(A.bottom) - innerHeight, document.documentElement.scrollWidth - innerWidth]); }
      st.remove(); SESSION = null; document.body.classList.remove('practicing'); return JSON.stringify(out); })()"""
    for w, h in ((375, 553), (430, 740)):
        r = json.loads(ev(b, js, [rp_metrics(w, h)]))
        assert r == [[0, 0, 0, 0]] * 5, (w, h, r)   # left edge, right edge, foot, no sideways scroll

# fix round 1 (review Minor 5): beside the passage the panel keeps 6 px either side, so an option's and 下一題's focus ring (2 px out at a
# 2 px offset) shows whole, and it clips sideways: the answer's pop and shake never flash a scrollbar
def test_the_reading_panel_beside_the_passage_keeps_a_focus_ring_whole(b):
    js = "(async () => { " + FRESH + RP + """ const e = await show(items.long);
      const room = (el) => { const ask = parts().ask, A = box(ask), r = box(el), l = A.left + ask.clientLeft; return [Math.round(r.left - l), Math.round(l + ask.clientWidth - r.right)]; };   // the panel drawn now
      const out = { x: getComputedStyle(parts().ask).overflowX, opts: [...parts().ask.querySelectorAll('.opt')].map(room) };
      answerCurrent((e.q.answer + 1) % 4); await wait(700); out.next = room(document.getElementById('btnNext'));
      SESSION = null; document.body.classList.remove('practicing'); return JSON.stringify(out); })()"""
    for w, h in ((768, 1024), (1280, 800)):
        r = json.loads(ev(b, js, [rp_metrics(w, h)]))
        assert r['x'] == 'hidden' and all(a >= 4 and c >= 4 for a, c in r['opts'] + [r['next']]), (w, h, r)

# Ruling 36 (test.5's Task 3): on a phone 600 px tall or less (an SE) and on a phone on its side a reading question shows no label row (fix
# round 1: its room is the passage's), so its chips — 新 (dots once answered), 錯題複習, 常錯 — come in the result panel after the answer
# (.pq-rp-chips, in its row of the item's level); where the row shows (a taller phone) the panel leaves them to it. The fix round's
# re-review found 常錯 never showed on an SE reading question
def test_a_reading_questions_chips_come_in_the_panel_where_its_label_row_is_hidden(b):
    js = "(async () => { " + FRESH + RP + """ const t = todayStr(), it = items.short, out = {};
      const look = () => { const c = document.querySelector('.fb-sheet .pq-rp-chips'), shown = Boolean(c) && getComputedStyle(c).display !== 'none';
        if (shown) sheetReveal(c);
        return { shown, chips: c ? [...c.querySelectorAll('.chip')].map((x) => x.textContent) : [], seen: shown && [...c.querySelectorAll('.chip')].every((x) => { const q = box(x); return q.width > 0 && q.top >= 0 && q.bottom <= innerHeight; }),
          label: getComputedStyle(document.querySelector('.q-card > .q-label')).display !== 'none', row: [...document.querySelectorAll('.q-card > .q-label .chip')].map((x) => x.textContent) }; };
      state.srs[it.key] = { b: 1, s: 1, d: 5, due: t, n: 6, ok: 2, ng: 4, st: 0, last: addDays(t, -3), lapse: 4, intro: addDays(t, -40), leech: true, rl: 1, f: {} };   // 常錯, on its ladder
      let e = await show(it); answerCurrent((e.q.answer + 1) % 4); await wait(700); out.leech = look();
      delete state.srs[it.key]; e = await show(it); answerCurrent(e.q.answer); await wait(700); out.fresh = look();   // a new one, answered right
      SESSION = null; document.body.classList.remove('practicing'); return JSON.stringify(out); })()"""
    for w, h in ((375, 553), (667, 375), (430, 740)):
        r = json.loads(ev(b, js, [rp_metrics(w, h)]))
        hidden = (w <= 600 and h <= 600) or rp_land(w, h)
        for k in ('leech', 'fresh'):
            assert r[k]['label'] == (not hidden) and r[k]['shown'] == hidden, (w, h, k, r)
        assert '常錯' in r['leech']['chips'] and r['fresh']['chips'][:1] == ['新'], (w, h, r)   # in the panel's markup at every size
        if hidden: assert r['leech']['seen'] and r['fresh']['seen'], (w, h, r)   # shown there, in sight
        else: assert '常錯' in r['leech']['row'], (w, h, r)   # the row says it

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
