"""2026-10-25 fixes: listening reads every option, requeued listening audio follows the shuffled options,
distractor meanings after answering a vocab question, the 更多 menu icons stay small, 8-digit login code."""
import json, os, subprocess, sys, time
sys.path.insert(0, os.path.dirname(__file__))
from cdp import Browser
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
PORT = 8798
URL = f"http://127.0.0.1:{PORT}/"
READY = "typeof state === 'object' && !!state.updatedAt && typeof speakScript === 'function'"

# A fake synthesizer: utterances take `dur[text]` ms; `drop` texts are silently swallowed once (no start/end, like
# Chrome and iOS Safari do when speak() lands while the previous utterance is winding down); `noEnd` texts never
# fire onend (garbage-collected utterance). Logs every start, overlap and drop.
FAKE_TTS = """
window.__tts = { log: [], dur: {}, drop: new Set(), noEnd: new Set() };
const fake = {
  speaking: false, pending: false, paused: false,
  getVoices() { return [{ name: 'Kyoko', lang: 'ja-JP', voiceURI: 'kyoko', localService: true, default: true }]; },
  cancel() { this.speaking = false; this.pending = false; __tts.log.push('cancel'); },
  pause() {}, resume() {},
  speak(u) {
    const t = u.text;
    if (__tts.drop.has(t)) { __tts.drop.delete(t); __tts.log.push('drop:' + t); return; }
    if (this.speaking) __tts.log.push('overlap:' + t);
    __tts.log.push('start:' + t); this.speaking = true;
    if (u.onstart) u.onstart({});
    const id = ++__tts.n;
    setTimeout(() => { if (__tts.cancelled >= id) return; this.speaking = false; __tts.log.push('end:' + t); if (!__tts.noEnd.has(t) && u.onend) u.onend({}); }, __tts.dur[t] || 300);
  }
};
__tts.n = 0; __tts.cancelled = 0;
const origCancel = fake.cancel; fake.cancel = function () { __tts.cancelled = __tts.n; origCancel.call(this); };
Object.defineProperty(window, 'speechSynthesis', { value: fake, configurable: true });
window.SpeechSynthesisUtterance = function (text) { this.text = text; };
state.settings.speechRate = 1; true"""

SCRIPT = "女：きょうは何曜日ですか。\\n1、げつようびです。\\n2、はい、そうです。\\n3、いいえ、ちがいます。"
LINES = ["きょうは何曜日ですか。", "1、げつようびです。", "2、はい、そうです。", "3、いいえ、ちがいます。"]

def starts(log):
    return [x[6:] for x in log if x.startswith('start:')]

def test_dropped_option_is_spoken_again(b):
    out = b.run([("nav", URL), ("wait", READY), ("eval", FAKE_TTS),
        ("eval", f"__tts.drop.add('{LINES[3]}'); speakScript('{SCRIPT}').then(() => JSON.stringify(__tts.log))")], timeout=30)
    log = __import__('json').loads(out[-1])
    assert starts(log) == LINES, log
    assert not [x for x in log if x.startswith('overlap:')], log

def test_slow_option_does_not_get_the_next_one_queued_on_top(b):
    # option 2 speaks for 7 s and never reports onend, although the length estimate says 6 s; option 3 must still wait for it
    out = b.run([("nav", URL), ("wait", READY), ("eval", FAKE_TTS),
        ("eval", f"__tts.dur['{LINES[2]}'] = 7000; __tts.noEnd.add('{LINES[2]}'); speakScript('{SCRIPT}').then(() => JSON.stringify(__tts.log))")], timeout=40)
    log = __import__('json').loads(out[-1])
    assert starts(log) == LINES, log
    assert not [x for x in log if x.startswith('overlap:')], log

def test_wrong_vocab_options_show_their_chinese_after_answering(b):
    js = """(() => {
      const v = REG.vocab.find(x => x.builtin && recallOptions(x));
      const q = makeVocabQuestion(v, { forceFmt: 'v-recall' });
      startSession('vocab', { filter: 'all' });
      SESSION.entries[SESSION.idx].previewDone = true;   // these tests borrow a session for a custom question; skip the new-word preview card
      SESSION.entries[SESSION.idx].q = q; renderPractice();
      const before = document.querySelectorAll('.opt .opt-zh').length;
      const wrongIdx = q.options.findIndex((o, i) => i !== q.answer);
      answerCurrent(wrongIdx);
      const wrongText = jaPlain(q.options[wrongIdx].text);
      const peer = REG.vocab.find(x => jaPlain(x.w) === wrongText);
      const shown = [...document.querySelectorAll('.opt')].map(el => ({ cls: el.className.replace(/^opt /, ''), zh: (el.querySelector('.opt-zh') || {}).textContent || '' }));
      const wrongEl = shown[wrongIdx];
      return JSON.stringify({ before, wrongZh: wrongEl.zh, peerM: peer ? peer.m : null, allWrongHaveZh: shown.every((s, i) => i === q.answer || s.zh.length > 0) });
    })()"""
    out = b.run([("nav", URL), ("wait", READY), ("eval", js)])
    r = __import__('json').loads(out[-1])
    assert r['before'] == 0, r
    assert r['peerM'] and r['wrongZh'] == r['peerM'], r
    assert r['allWrongHaveZh'], r

def test_more_menu_icons_are_small(b):
    out = b.run([("nav", URL), ("wait", READY),
        ("eval", "ACTIONS['more-menu'](); JSON.stringify([...document.querySelectorAll('.modal .list-item svg')].map(s => getComputedStyle(s).width))")])
    sizes = __import__('json').loads(out[-1])
    assert len(sizes) >= 3 and all(s == '18px' for s in sizes), sizes

def test_login_code_is_eight_digits(b):
    from test_sync import FAKE
    out = b.run([("nav", URL), ("wait", READY), ("eval", FAKE),
        ("eval", "new Promise(r => setTimeout(r, 50)).then(() => Sync.init({ client: __fake.client })).then(() => Sync.status)"),
        ("eval", "openSettings('data'); document.getElementById('syncEmail').value = 'foo@x.com'; document.querySelector('[data-act=sync-login]').click(); new Promise(r => setTimeout(r, 100)).then(() => document.querySelector('.modal').textContent.includes('8 位數') && !document.querySelector('.modal').textContent.includes('6 位數'))"),
        ("eval", "document.getElementById('syncCode').value = ' 1234 5678 '; document.querySelector('[data-act=sync-verify]').click(); new Promise(r => setTimeout(r, 100)).then(() => JSON.stringify(__fake.calls.filter(c => c[0] === 'verify')))"),
        ("eval", "document.getElementById('toast').textContent.includes('6 位數') ? 'six' : 'ok'"),
    ])
    assert out[-3] is True, "panel should say 8 位數"
    assert out[-2] == '[["verify","foo@x.com","12345678","email"]]', out[-2]
    assert out[-1] == 'ok', out[-1]

# ---- 2026-10-25 (2): start week picker, Deepgram path ----
WAV200 = "UklGRmQGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YUAGAACAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA"
FAKE_DEEPGRAM = """
window.__dg = { calls: [], played: [] };
const wavBytes = Uint8Array.from(atob('UklGRmQGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YUAGAACAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA'), c => c.charCodeAt(0));
const origFetch = window.fetch;
window.fetch = (url, opt) => {
  if (String(url).includes('api.deepgram.com')) {
    const text = JSON.parse(opt.body).text; __dg.calls.push({ text, at: performance.now() });
    return new Promise(r => setTimeout(() => r(new Response(new Blob([wavBytes], { type: 'audio/wav' }), { status: 200 })), 150));
  }
  return origFetch(url, opt);
};
state.ttsConfig = Object.assign({}, state.ttsConfig || {}, { engine: 'deepgram', deepgramKey: 'k' });
// headless Chrome has no audio output and blocks autoplay, so playback itself is simulated: 'playing' then 'ended'
HTMLMediaElement.prototype.play = function () { const el = this; __dg.played.push({ el, src: el.src.slice(0, 5), at: performance.now() });
  setTimeout(() => { if (el.onplaying) el.onplaying(); setTimeout(() => { if (el.onended) el.onended(); }, 120); }, 30); return Promise.resolve(); };
true"""

def test_fresh_profile_starts_at_week_one(b):
    out = b.run([("nav", URL), ("wait", READY), ("eval", "state.currentUnit")])
    assert out[-1] == 'm1', out[-1]

def test_week_picker_sets_the_current_unit(b):
    out = b.run([("nav", URL), ("wait", READY),
        ("eval", "ACTIONS['open-level'](); JSON.stringify({ sel: !!document.getElementById('startUnit'), n: document.querySelectorAll('#startUnit option').length, cur: document.getElementById('startUnit').value, duo: !!document.getElementById('duoScore') })"),
        ("eval", "document.getElementById('startUnit').value = 'm5'; document.querySelector('[data-act=start-apply]').click(); JSON.stringify({ cur: state.currentUnit, done: state.completedUnits })"),
        ("eval", "ACTIONS['open-level'](); document.getElementById('startUnit').value = 'm3'; document.getElementById('startMarkPrev').checked = true; document.querySelector('[data-act=start-apply]').click(); JSON.stringify({ cur: state.currentUnit, done: state.completedUnits })"),
    ])
    assert out[-3] == '{"sel":true,"n":18,"cur":"m1","duo":true}', out[-3]
    assert out[-2] == '{"cur":"m5","done":[]}', out[-2]
    assert out[-1] == '{"cur":"m3","done":["m1","m2"]}', out[-1]

def test_deepgram_lines_are_prefetched_and_all_play_through_one_player(b):
    out = b.run([("nav", URL), ("wait", READY), ("eval", FAKE_DEEPGRAM),
        ("eval", f"speakScript('{SCRIPT}').then(() => JSON.stringify({{ calls: __dg.calls.map(c => c.text), want: {__import__('json').dumps(LINES, ensure_ascii=False)}.map(kanaReadings), spread: Math.max(...__dg.calls.map(c => c.at)) - Math.min(...__dg.calls.map(c => c.at)), played: __dg.played.length, oneEl: __dg.played.every(p => p.el === __dg.played[0].el), blob: __dg.played.every(p => p.src === 'blob:') }}))")], timeout=40)
    r = __import__('json').loads(out[-1])
    assert r['calls'] == r['want'] and len(r['calls']) == len(LINES), r   # each line fetched exactly once, with known readings as kana
    assert r['spread'] < 100, r                        # all fetches start together, not one after the other
    assert r['played'] == 4 and r['oneEl'] and r['blob'], r

# ---- 2026-10-25 (3): kana option numbers, less next-day repetition, new grammar spread across points ----
def test_first_correct_answer_waits_a_few_days_before_repeating(b):
    js = """(() => { const t = todayStr(); const g = REG.grammar[0]; const v = REG.vocab.find(x => x.builtin);
      const ok = srsAnswer(g.key, true); const ng = srsAnswer(v.key, false);
      return JSON.stringify({ okDays: daysBetween(t, ok.rec.due), ngDays: daysBetween(t, ng.rec.due) }); })()"""
    out = b.run([("nav", URL), ("wait", READY), ("eval", js)])
    r = __import__('json').loads(out[-1])
    assert r['okDays'] >= 3, r
    assert r['ngDays'] == 0, r

def test_new_grammar_of_a_unit_rotates_through_its_points(b):
    js = """(() => { const c = newGrammarCandidates('m1').slice(0, 6); return JSON.stringify({ n: c.length, pts: new Set(c.map(g => g.pt)).size }); })()"""
    out = b.run([("nav", URL), ("wait", READY), ("eval", js)])
    assert out[-1] == '{"n":6,"pts":6}', out[-1]

# ---- 2026-10-25 (4): audio-only options are played on demand, one button per option ----
def test_audio_options_play_on_click_instead_of_being_read_in_sequence(b):
    js = """(() => {
      state.settings.audioOptions = true; state.settings.listening = true;
      const it = REG.listen.find(x => x.t === 'resp');
      const q = makeListenQuestion(it);
      const again = requeueQuestion(q, q.options.slice().reverse());
      startSession('vocab', { filter: 'all' });
      SESSION.entries[SESSION.idx].previewDone = true;   // these tests borrow a session for a custom question; skip the new-word preview card
      SESSION.entries[SESSION.idx].q = q; SESSION.entries[SESSION.idx].autoPlayed = true; renderPractice();
      const rows = [...document.querySelectorAll('.opt-audio')];
      const plays = [...document.querySelectorAll('.opt-audio [data-act=speak]')];
      const picks = [...document.querySelectorAll('.opt-audio [data-act=answer]')];
      // the hashchange from startSession re-renders shortly after; wait for it before clicking live buttons
      return new Promise(r => setTimeout(r, 300)).then(() => {
        __tts.log.length = 0;
        document.querySelectorAll('.opt-audio [data-act=speak]')[1].click();
        return new Promise(r => setTimeout(r, 400));
      }).then(() => {
        const spoken = __tts.log.filter(x => x.startsWith('start:')).map(x => x.slice(6));
        document.querySelectorAll('.opt-audio [data-act=answer]')[2].click();
        const after = [...document.querySelectorAll('.opt')].map(el => el.textContent.trim());
        return JSON.stringify({ audio: q.audio === it.line, againAudio: again.audio === it.line, rows: rows.length, plays: plays.length, picks: picks.length,
          spoken, want: ttsText(q.options[1].text), answered: currentEntry().done, chosen: currentEntry().chosen, textShown: after.every(t => !t.includes('選項')) });
      });
    })()"""
    out = b.run([("nav", URL), ("wait", READY), ("eval", FAKE_TTS), ("eval", js)])
    r = __import__('json').loads(out[-1])
    assert r['audio'] and r['againAudio'], r              # the prompt line is the only auto-played audio
    assert r['rows'] == 3 and r['plays'] == 3 and r['picks'] == 3, r
    assert r['spoken'] == [r['want']], r                   # clicking option 2 speaks option 2 only
    assert r['answered'] and r['chosen'] == 2 and r['textShown'], r

def test_scene_audio_options_have_no_autoplay_and_play_on_click(b):
    js = """(() => {
      state.settings.audioOptions = true;
      const it = REG.listen.find(x => x.t === 'scene');
      const q = makeListenQuestion(it);
      startSession('vocab', { filter: 'all' });
      SESSION.entries[SESSION.idx].previewDone = true;   // these tests borrow a session for a custom question; skip the new-word preview card
      SESSION.entries[SESSION.idx].q = q; renderPractice();
      return JSON.stringify({ audio: q.audio || '', rows: document.querySelectorAll('.opt-audio').length, plays: document.querySelectorAll('.opt-audio [data-act=speak]').length });
    })()"""
    out = b.run([("nav", URL), ("wait", READY), ("eval", FAKE_TTS), ("eval", js)])
    r = __import__('json').loads(out[-1])
    assert r['audio'] == '' and r['rows'] == 3 and r['plays'] == 3, r

def test_formal_exam_listening_options_play_on_click(b):
    js = """(() => {
      startExam({ level: 'N5', size: 'mini', subjects: ['S3'], formal: true });
      const i = EXAM.paper.findIndex(q => q.m === 'S3-M4');
      if (i < 0) return 'no S3-M4';
      EXAM.idx = i; renderExamRunner();
      const q = EXAM.paper[i];
      return JSON.stringify({ audioHasOptions: q.audio.includes(ttsText(q.options[0].text)), rows: document.querySelectorAll('.opt-audio').length, plays: document.querySelectorAll('.opt-audio [data-act=speak]').length, picks: document.querySelectorAll('.opt-audio [data-act=exam-answer]').length });
    })()"""
    out = b.run([("nav", URL), ("wait", READY), ("eval", FAKE_TTS), ("eval", js)])
    r = __import__('json').loads(out[-1])
    assert r['audioHasOptions'] is False, r
    assert r['rows'] >= 3 and r['plays'] == r['rows'] and r['picks'] == r['rows'], r

# ---- 2026-10-25 (5): the 今日練習 button count is the real session size; version history in settings ----
def test_today_button_count_matches_the_session(b):
    js = """(() => { const out = []; for (const size of [20, 15, 25, 30]) { state.settings.sessionSize = size; saveState(); route();
      const btn = document.querySelector('[data-act=start-daily]'); const shown = Number((btn.textContent.match(/(\\d+) 題/) || [])[1]);
      startSession('daily'); const enc = 2 * SESSION.entries.filter(e => e.item.kind === 'v' && e.item.builtin && !state.srs[e.item.key]).length; const actual = SESSION.entries.length + enc; SESSION = null; document.body.classList.remove('practicing'); location.hash = '#/today';
      out.push([shown, actual]); } return JSON.stringify(out); })()"""
    out = b.run([("nav", URL), ("wait", READY), ("eval", js)])
    pairs = __import__('json').loads(out[-1])
    assert all(a == b_ and a > 0 for a, b_ in pairs), pairs

def test_settings_show_the_version_and_its_history(b):
    out = b.run([("nav", URL), ("wait", READY),
        ("eval", "openSettings('look'); const t = document.querySelector('.modal').textContent; JSON.stringify({ ver: t.includes('版本 ' + APP_VERSION), hist: t.includes('版本紀錄'), n: document.querySelectorAll('.changelog li').length, first: (document.querySelector('.changelog li') || {}).textContent || '' })")])
    r = __import__('json').loads(out[-1])
    assert r['ver'] and r['hist'] and r['n'] >= 5, r
    assert APP_VERSION_IN_SW(r), r

def APP_VERSION_IN_SW(r):
    import re
    sw = open(os.path.join(ROOT, "sw.js"), encoding="utf-8").read()
    html = open(os.path.join(ROOT, "index.html"), encoding="utf-8").read()
    cache = re.search(r"CACHE = 'nq-v(\d+)'", sw).group(1)
    ver = re.search(r"const APP_VERSION = '(\d+)'", html).group(1)
    return cache == ver and r['first'].startswith('v' + ver)

# ---- 2026-10-26: grammar, listening, reading and kanji do not come back the same day ----
def test_wrong_non_vocab_item_waits_until_tomorrow_but_wrong_vocab_stays_due_today(b):
    js = """(() => { const t = todayStr(); const out = {};
      const pick = { g: REG.grammar[0], l: REG.listen[0], r: REG.read[0], k: REG.kanji[0], v: REG.vocab.find(x => x.builtin) };
      for (const [kind, it] of Object.entries(pick)) out[kind] = daysBetween(t, srsAnswer(it.key, false).rec.due);
      return JSON.stringify(out); })()"""
    out = b.run([("nav", URL), ("wait", READY), ("eval", js)])
    r = __import__('json').loads(out[-1])
    assert r == {'g': 1, 'l': 1, 'r': 1, 'k': 1, 'v': 0}, r

def test_reinforcement_skips_grammar_and_kanji_answered_today_but_not_vocab(b):
    # a first correct answer leaves an item at a low level and not yet due: exactly what the spare-slot filler looks for
    js = """(() => { const g = REG.grammar[0]; const k = REG.kanji[0]; const v = REG.vocab.find(x => x.builtin);
      [g, k, v].forEach(it => srsAnswer(it.key, true));
      const low = [g, k, v].every(it => state.srs[it.key].b <= 2 && state.srs[it.key].due > todayStr());
      const picked = reinforcementItems([g, k, v], new Set()).map(it => it.kind);
      return JSON.stringify({ low, picked }); })()"""
    out = b.run([("nav", URL), ("wait", READY), ("eval", js)])
    r = __import__('json').loads(out[-1])
    assert r['low'], r
    assert r['picked'] == ['v'], r

def test_heatmap_starts_at_the_week_the_learner_began(b):
    # columns = weeks from the Monday of the first-use week to this week; at least 4, at most 26
    js = """(() => {
      const cols = () => heatmapHtml().match(/<i /g).length / 7;
      const monday = (d) => { const x = parseDate(d); x.setDate(x.getDate() - (x.getDay() + 6) % 7); return x; };
      const expect = (d) => Math.round((monday(todayStr()) - monday(d)) / 864e5 / 7) + 1;
      const out = {};
      state.dailyLogs = {};
      state.createdAt = addDays(todayStr(), -10); out.young = cols();
      state.createdAt = addDays(todayStr(), -70); out.tenWeeks = [cols(), expect(state.createdAt)];
      state.createdAt = todayStr(); state.dailyLogs[addDays(todayStr(), -84)] = { vocabCount: 3 }; out.fromLogs = [cols(), expect(addDays(todayStr(), -84))];
      state.dailyLogs = {}; state.createdAt = addDays(todayStr(), -800); out.old = cols();
      return JSON.stringify(out); })()"""
    out = b.run([("nav", URL), ("wait", READY), ("eval", js)])
    r = __import__('json').loads(out[-1])
    assert r['young'] == 4, r
    assert r['tenWeeks'][0] == r['tenWeeks'][1] and 10 <= r['tenWeeks'][0] <= 11, r
    assert r['fromLogs'][0] == r['fromLogs'][1] and 12 <= r['fromLogs'][0] <= 13, r
    assert r['old'] == 26, r

# ---- 2026-10-26: settings modal usable on mobile browsers whose toolbar eats the top of the viewport ----
def test_modal_header_stays_put_while_the_body_scrolls_and_has_a_bottom_close(b):
    js = """(() => { openSettings('learn');
      const modal = document.querySelector('.modal'), head = document.querySelector('.modal-head'), body = document.getElementById('modalBody'), back = document.querySelector('.modal-back');
      const cs = (el) => getComputedStyle(el);
      const before = head.getBoundingClientRect().top;
      body.scrollTop = 99999; const after = head.getBoundingClientRect().top;
      const rules = [...document.styleSheets].flatMap(sh => { try { return [...sh.cssRules]; } catch (e) { return []; } }).flatMap(r => r.cssRules ? [...r.cssRules] : [r]).filter(r => r.selectorText && /\\.modal(\\s|$|,)/.test(r.selectorText)).map(r => r.cssText).join(' ');
      const foot = document.querySelector('.modal-foot [data-act=close-modal]');
      const out = { display: cs(modal).display, bodyOverflow: cs(body).overflowY, headStatic: cs(head).position !== 'sticky', before, after, scrolled: body.scrollTop > 0,
        svh: /svh|dvh/.test(rules), noBlur: cs(back).backdropFilter === 'none' || !cs(back).backdropFilter, foot: !!foot };
      if (foot) foot.click(); out.closedByFoot = !modalOpen(); return JSON.stringify(out); })()"""
    out = b.run([("nav", URL), ("wait", READY), ("eval", js)])
    r = __import__('json').loads(out[-1])
    assert r['display'] == 'flex' and r['bodyOverflow'] == 'auto' and r['headStatic'], r
    assert r['scrolled'] and r['before'] == r['after'], r
    assert r['svh'] and r['noBlur'] and r['foot'] and r['closedByFoot'], r

# ---- 2026-10-26: Google Cloud TTS engine; known readings sent as SSML aliases / kana ----
FAKE_FETCH = """window.__calls = []; window.fetch = async (url, opt) => { __calls.push({ url: String(url), body: opt && opt.body ? JSON.parse(opt.body) : null }); return { ok: true, status: 200, json: async () => ({ audioContent: btoa('abc') }), blob: async () => new Blob(['abc']) }; }; true"""

def test_google_tts_engine_sends_ssml_with_known_readings(b):
    js = """(() => { const c = ttsConfig(); c.engine = 'google_tts'; c.googleKey = 'K'; saveState();
      return engineBlob('机の上に本があります。', '').then(blob => engineBlob('はい。', 'm').then(() => {
        openSettings('speech'); const ui = { key: !!document.querySelector('[data-key=googleKey]'), voice: !!document.querySelector('[data-key=googleVoice]') }; closeModal();
        return JSON.stringify({ blob: blob instanceof Blob && blob.size > 0, url: __calls[0].url, body: __calls[0].body, male: __calls[1].body.voice.name, ui, avail: speechAvailable() }); })); })()"""
    out = b.run([("nav", URL), ("wait", READY), ("eval", FAKE_FETCH), ("eval", js)])
    r = __import__('json').loads(out[-1])
    assert r['blob'] and r['url'].startswith('https://texttospeech.googleapis.com/v1/text:synthesize?key=K'), r
    body = r['body']
    assert body['voice'] == {'languageCode': 'ja-JP', 'name': 'ja-JP-Neural2-B'} and body['audioConfig']['audioEncoding'] == 'MP3', r
    assert body['input']['ssml'].startswith('<speak>') and '<sub alias="つくえ">机</sub>' in body['input']['ssml'] and '<sub alias="ほん">本</sub>' in body['input']['ssml'], r
    assert r['male'] == 'ja-JP-Neural2-C' and r['ui'] == {'key': True, 'voice': True} and r['avail'], r

def test_deepgram_gets_kana_for_known_readings_unless_turned_off(b):
    js = """(() => { const c = ttsConfig(); c.engine = 'deepgram'; c.deepgramKey = 'D'; saveState();
      return engineBlob('三本の鉛筆があります。', '').then(() => { c.kanaReadings = 'off'; return engineBlob('三本の鉛筆があります。', ''); }).then(() =>
        JSON.stringify({ on: __calls[0].body.text, off: __calls[1].body.text, fn: kanaReadings('今日は何曜日ですか。') })); })()"""
    out = b.run([("nav", URL), ("wait", READY), ("eval", FAKE_FETCH), ("eval", js)])
    r = __import__('json').loads(out[-1])
    assert 'さんぼん' in r['on'] and 'えんぴつ' in r['on'] and not __import__('re').search('[一-龯]', r['on']), r
    assert r['off'] == '三本の鉛筆があります。', r
    assert r['fn'] == 'きょうはなんようびですか。', r

# ---- 2026-10-26: single words are spoken from their written form with the reading pinned; spelling/matching can give up ----
def test_single_words_are_sent_as_kanji_with_the_reading_pinned(b):
    js = """(() => { const v = REG.vocab.find(x => x.builtin && /[一-龯]/.test(x.w) && x.r && meaningOptions(x)); const w = jaPlain(v.w);
      const c = ttsConfig(); c.engine = 'google_tts'; c.googleKey = 'K'; saveState();
      return speak(w, { reading: v.r }).then(() => { c.engine = 'deepgram'; c.deepgramKey = 'D'; return speak(w, { reading: v.r }); }).then(() => {
        const q = makeVocabQuestion(v, { forceFmt: 'v-meaning' }); const calls = []; const orig = speak; speak = (t, o) => { calls.push([t, o && o.reading]); return Promise.resolve(); };
        startSession('items', { items: [v] }); const e = currentEntry(); e.previewDone = true; e.q = q; renderPractice(); ACTIONS.replay(); SESSION = null; document.body.classList.remove('practicing'); speak = orig;
        return JSON.stringify({ google: __calls[0].body.input.ssml, deepgram: __calls[1].body.text, w, r: v.r, speakWord: q.speakWord, speakReading: q.speakReading, replay: calls[calls.length - 1] }); }); })()"""
    out = b.run([("nav", URL), ("wait", READY), ("eval", FAKE_FETCH), ("eval", "location.hash = '#/today'; true"), ("eval", js)])
    r = __import__('json').loads(out[-1])
    assert r['google'] == f"<speak><sub alias=\"{r['r']}\">{r['w']}</sub></speak>", r
    assert r['deepgram'] == r['w'], r
    assert r['speakWord'] == r['w'] and r['speakReading'] == r['r'] and r['replay'] == [r['w'], r['r']], r

def test_spelling_and_matching_offer_a_give_up_button_that_counts_as_wrong(b):
    js = """(() => { const v = REG.vocab.find(x => x.builtin && x.r && !/[一-龯]/.test(x.r) && x.r.length >= 3 && x.r.length <= 6 && meaningOptions(x) && recallOptions(x)); srsAnswer(v.key, true);
      startSession('items', { items: [v, v] }); let e = currentEntry(); e.q = makeVocabQuestion(v, { forceFmt: 'v-spell' }); renderPractice();
      document.querySelector('[data-act=custom-giveup]').click();
      const out = { spellDone: e.done, spellWrong: e.chosen !== e.q.answer, spellShows: document.querySelector('.fb-head').textContent.includes(v.r), f: state.srs[v.key].f['v-spell'] };
      nextQuestion(); e = currentEntry(); e.q = makeVocabQuestion(v, { forceFmt: 'v-match' }); renderPractice();
      document.querySelector('[data-act=custom-giveup]').click();
      out.matchDone = e.done; out.matchWrong = e.chosen !== e.q.answer; out.revealed = document.querySelectorAll('.match-word.matched').length;
      SESSION = null; document.body.classList.remove('practicing'); return JSON.stringify(out); })()"""
    out = b.run([("nav", URL), ("wait", READY), ("eval", "location.hash = '#/today'; true"), ("eval", js)])
    r = __import__('json').loads(out[-1])
    assert r['spellDone'] and r['spellWrong'] and r['spellShows'] and r['f'] == [0, 1], r
    assert r['matchDone'] and r['matchWrong'] and r['revealed'] == 4, r

# ---- 2026-10-26: 語音 › 測試連線 shows the provider's real error and a hint ----
def test_tts_connection_check_reports_the_real_error_and_success(b):
    fail = """window.fetch = async () => ({ ok: false, status: 403, json: async () => ({ error: { message: 'Cloud Text-to-Speech API has not been used in project 123 before or it is disabled.' } }), text: async () => '' }); true"""
    okf = """window.fetch = async () => ({ ok: true, status: 200, json: async () => ({ audioContent: btoa('abc') }), blob: async () => new Blob(['abc']) }); true"""
    # click 測試連線 and poll the result box ourselves (independent of the harness's wait timing under parallel load)
    run = """(() => { const c = ttsConfig(); c.engine = 'google_tts'; c.googleKey = 'K'; saveState(); openSettings('speech');
      const btn = document.querySelector('[data-act=tts-check]'); if (!btn) return 'NO BUTTON'; btn.click();
      return new Promise(res => { const t0 = Date.now(); (function poll() { const box = document.getElementById('ttsCheckBox'); const t = box ? box.textContent : '';
        if (t.length > 0 || Date.now() - t0 > 15000) { closeModal(); res(t); } else setTimeout(poll, 50); })(); }); })()"""
    out = b.run([("nav", URL), ("wait", READY), ("eval", fail), ("eval", run), ("eval", okf), ("eval", run)], timeout=45)
    assert 'has not been used' in out[-3] and '尚未啟用' in out[-3], out[-3]
    assert '連線成功' in out[-1], out[-1]

def test_tools_page_has_an_expandable_api_guide_for_every_provider(b):
    # the 工具與 AI page ends with a collapsed guide per service; ?guide=<id> opens that one; settings link to it
    probe = """(() => { const card = document.getElementById('apiGuides'); if (!card) return 'NO CARD';
      const ids = [...card.querySelectorAll('details[data-guide]')].map(d => d.dataset.guide + (d.open ? '*' : ''));
      const links = card.querySelectorAll('a[target=_blank]').length;
      const noopener = [...card.querySelectorAll('a[target=_blank]')].every(a => /noopener/.test(a.rel));
      return JSON.stringify({ ids, links, noopener, title: card.querySelector('.card-title').textContent }); })()"""
    link = """(() => { const c = ttsConfig(); c.engine = 'google_tts'; saveState(); openSettings('speech');
      const a = document.querySelector('#modalBody [data-act=nav][data-route="#/tools?guide=google_tts"]'); closeModal(); return a ? a.textContent : 'NO LINK'; })()"""
    out = b.run([("nav", URL + "#/tools"), ("wait", READY), ("eval", probe), ("nav", URL + "#/tools?guide=deepgram"), ("eval", probe), ("eval", link)], timeout=45)
    first = json.loads(out[0]); opened = json.loads(out[1])
    assert first['title'] == 'API 申請說明', first
    assert first['ids'] == ['google_tts', 'gemini', 'openai', 'deepgram', 'voicevox', 'ollama'], first['ids']
    assert first['links'] >= 8 and first['noopener'], first
    assert 'deepgram*' in opened['ids'] and 'google_tts*' not in opened['ids'], opened['ids']
    assert '申請' in out[2], out[2]

def test_stats_shows_the_past_week_of_practice_and_what_was_learned(b):
    seed = """(() => { const t = todayStr(); const y = addDays(t, -1);
      state.dailyLogs[y] = { date: y, vocabCount: 4, grammarCount: 2, quizCount: 1, bonusCount: 0, minutes: 5, topics: [] };
      const v = REG.vocab.find(x => x.builtin); const g = REG.grammar[0];
      state.srs[v.key] = { b: 3, due: addDays(t, 9), n: 4, ok: 4, ng: 0, s: 9, d: 5, last: addDays(t, -2), intro: addDays(t, -20), lrn: addDays(t, -2) };
      state.srs[g.key] = { b: 1, due: t, n: 1, ok: 1, ng: 0, s: 1, d: 5, last: y, intro: y };
      saveState(); window.__lab = [itemLabel(v), itemLabel(g)]; return 'seeded'; })()"""
    probe = """(() => { const v = document.getElementById('view'); const card = [...v.querySelectorAll('.card')].find(c => /過去 7 天/.test(c.textContent)); if (!card) return JSON.stringify({ card: false, future: /未來 7 天/.test(v.textContent) });
      const cols = [...card.querySelectorAll('.cols .col')]; const y = cols[5]; const segs = [...y.querySelectorAll('.cseg')].map(x => x.className.replace('cseg ', '') + ':' + x.style.flexGrow);
      const d = card.querySelector('details'); const txt = d ? d.textContent : '';
      const cards = [...v.querySelectorAll(':scope > .card, :scope > .grid')]; const order = [cards.indexOf(document.getElementById('progressCard')), cards.indexOf(card), cards.findIndex(c => c.classList.contains('grid-4'))];
      const g = [...document.querySelectorAll('#progressCard .gauge')].map(x => ({ k: x.dataset.kind, total: +x.dataset.total, seen: +x.dataset.seen, learned: +x.dataset.learned, mastered: +x.dataset.mastered, pct: +x.dataset.pct, needle: !!x.querySelector('.needle'), arcs: x.querySelectorAll('path.arc').length, tick: x.querySelector('.tick') ? +x.querySelector('.tick').dataset.f : null, tickLabels: [...x.querySelectorAll('.tick-l')].map(t => t.textContent).join('/') }));
      return JSON.stringify({ card: true, future: /未來 7 天/.test(v.textContent), n: cols.length, segs, label: y.textContent.trim(), summary: d && d.querySelector('summary').textContent,
        learned: txt.includes(__lab[0]), fresh: txt.includes(__lab[1]), legend: /單字.*文法/.test(card.textContent), g, order, hasLegend: /已熟練|熟練/.test(document.getElementById('progressCard').textContent) && /熟悉/.test(document.getElementById('progressCard').textContent) && /已學/.test(document.getElementById('progressCard').textContent) }); })()"""
    out = b.run([("nav", URL), ("wait", READY), ("eval", seed), ("nav", URL + "#/stats"), ("eval", probe)], timeout=45)
    r = json.loads(out[-1])
    assert r['card'] and not r['future'], r
    assert r['n'] == 7 and r['segs'] == ['q:1', 'g:2', 'v:4'] and r['label'] == '7', r
    assert r['summary'] == '明細' and not r['learned'] and not r['fresh'] and r['legend'] and r['hasLegend'], r
    assert r['order'] == [0, 1, 2], r['order']   # gauges first, then the week chart, then the number tiles
    g = {x['k']: x for x in r['g']}; assert set(g) == {'v', 'g'}, r['g']
    assert g['v']['learned'] == 1 and g['v']['mastered'] == 0 and g['v']['total'] >= 1400 and g['v']['needle'] and g['v']['arcs'] == 1 and 0 <= g['v']['pct'] < 100, g['v']
    assert g['g']['seen'] + g['g']['learned'] + g['g']['mastered'] == 1 and g['g']['total'] >= 1000, g['g']
    assert abs(g['v']['tick'] - 735 / g['v']['total']) < 0.002 and g['v']['tickLabels'] == 'N5/N4', g['v']   # a faint mark where N5 ends
    assert 0.2 < g['g']['tick'] < 0.6 and g['g']['tickLabels'] == 'N5/N4', g['g']

def test_reaching_the_learned_level_records_the_date(b):
    js = """(() => { const v = REG.vocab.find(x => x.builtin); const k = v.key; delete state.srs[k]; const out = [];
      for (let i = 0; i < 6; i++) { if (state.srs[k]) state.srs[k].last = addDays(todayStr(), -10); const r = srsAnswer(k, true, { grade: 'easy' }); out.push([r.after, state.srs[k].lrn || null]); if (state.srs[k].lrn) break; }
      const crossed = out.findIndex(x => x[0] >= SRS_LEARNED);
      return JSON.stringify({ out, crossed, today: todayStr() }); })()"""
    out = b.run([("nav", URL), ("wait", READY), ("eval", js)], timeout=45)
    r = json.loads(out[-1])
    assert r['crossed'] >= 0, r
    assert all(x[1] is None for x in r['out'][:r['crossed']]) and r['out'][r['crossed']][1] == r['today'], r

def test_tapping_a_word_in_the_matching_question_speaks_it_with_its_reading(b):
    js = """(() => { const v = REG.vocab.find(x => x.builtin && /[一-龯]/.test(x.w) && x.r && matchPairs(x)); srsAnswer(v.key, true);
      startSession('items', { items: [v] }); const e = currentEntry(); e.q = makeVocabQuestion(v, { forceFmt: 'v-match' }); renderPractice();
      window.__spoken = []; window.speak = (t, o) => { __spoken.push([t, o && o.reading]); return Promise.resolve(); };
      const w = document.querySelector(`.match-word[data-w="${jaPlain(v.w)}"]`); w.click();
      const again = document.querySelector(`.match-word[data-w="${jaPlain(v.w)}"]`); again.click();   // deselect: no second utterance
      SESSION = null; document.body.classList.remove('practicing'); return JSON.stringify({ spoken: __spoken, w: jaPlain(v.w), r: v.r }); })()"""
    out = b.run([("nav", URL), ("wait", READY), ("eval", js)], timeout=45)
    r = json.loads(out[-1])
    assert r['spoken'] == [[r['w'], r['r']]], r

def test_stats_recommends_daily_quotas_from_the_remaining_banks_and_applies_them(b):
    seed = """(() => { state.settings.examDate = addDays(todayStr(), 121); state.settings.newVocabPerDay = 8; state.settings.newGrammarPerDay = 6; state.settings.newKanjiPerDay = 3; state.settings.listenPerDay = 3; saveState();
      const unseen = (arr) => arr.filter(x => !state.srs[x.key]).length;
      window.__exp = { v: Math.ceil(unseen(REG.vocab.filter(x => x.builtin)) / 100), g: Math.ceil(unseen(REG.grammar) / 100), k: Math.min(15, Math.ceil(unseen(REG.kanji) / 100)), l: Math.min(10, Math.ceil(unseen(REG.listen) / 100)) };
      return JSON.stringify(__exp); })()"""
    probe = """(() => { const card = document.getElementById('planAdvice'); if (!card) return 'NO CARD';
      const btn = card.querySelector('[data-act=apply-advice]'); const before = btn ? btn.textContent.trim() : 'NO BUTTON';
      const txt = card.textContent; if (btn) btn.click();
      const s = state.settings; const after = document.querySelector('#planAdvice [data-act=apply-advice]');
      return JSON.stringify({ before, hasDays: /100 天/.test(txt), rows: card.querySelectorAll('tbody tr').length, s: [s.newVocabPerDay, s.newGrammarPerDay, s.newKanjiPerDay, s.listenPerDay], goal: s.dailyGoal, after: after ? after.textContent.trim() + (after.disabled ? '|disabled' : '') : 'gone', share: s.vocabShare }); })()"""
    out = b.run([("nav", URL), ("wait", READY), ("eval", seed), ("nav", URL + "#/stats"), ("eval", probe)], timeout=45)
    exp = json.loads(out[0]); r = json.loads(out[1])
    assert r['before'] == '使用建議' and r['hasDays'] and r['rows'] >= 4, r
    assert r['s'] == [exp['v'], exp['g'], exp['k'], exp['l']], (r, exp)
    assert r['goal'] >= exp['v'] + exp['g'] + exp['k'] + exp['l'] and r['goal'] % 5 == 0 and 30 <= r['share'] <= 70, r
    assert r['after'].startswith('已是建議值') and 'disabled' in r['after'], r

if __name__ == "__main__":
    srv = subprocess.Popen([sys.executable, "-m", "http.server", str(PORT), "--bind", "127.0.0.1"], cwd=ROOT, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(0.8)
    tests = [test_dropped_option_is_spoken_again, test_slow_option_does_not_get_the_next_one_queued_on_top, test_wrong_vocab_options_show_their_chinese_after_answering, test_more_menu_icons_are_small, test_login_code_is_eight_digits,
             test_fresh_profile_starts_at_week_one, test_week_picker_sets_the_current_unit, test_deepgram_lines_are_prefetched_and_all_play_through_one_player,
             test_first_correct_answer_waits_a_few_days_before_repeating, test_new_grammar_of_a_unit_rotates_through_its_points,
             test_audio_options_play_on_click_instead_of_being_read_in_sequence, test_scene_audio_options_have_no_autoplay_and_play_on_click, test_formal_exam_listening_options_play_on_click,
             test_today_button_count_matches_the_session, test_settings_show_the_version_and_its_history,
             test_wrong_non_vocab_item_waits_until_tomorrow_but_wrong_vocab_stays_due_today, test_reinforcement_skips_grammar_and_kanji_answered_today_but_not_vocab,
             test_heatmap_starts_at_the_week_the_learner_began,
             test_modal_header_stays_put_while_the_body_scrolls_and_has_a_bottom_close,
             test_google_tts_engine_sends_ssml_with_known_readings, test_deepgram_gets_kana_for_known_readings_unless_turned_off,
             test_single_words_are_sent_as_kanji_with_the_reading_pinned, test_spelling_and_matching_offer_a_give_up_button_that_counts_as_wrong, test_tts_connection_check_reports_the_real_error_and_success,
             test_tools_page_has_an_expandable_api_guide_for_every_provider,
             test_stats_shows_the_past_week_of_practice_and_what_was_learned, test_reaching_the_learned_level_records_the_date, test_tapping_a_word_in_the_matching_question_speaks_it_with_its_reading,
             test_stats_recommends_daily_quotas_from_the_remaining_banks_and_applies_them]
    failed = 0
    try:
        for t in tests:
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
