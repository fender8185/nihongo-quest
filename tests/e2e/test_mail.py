"""2026-11-12: letters sent from the dashboard (MAILROOM, js/83_safety.js; supabase/mail.sql) — read from public.mail, each
device deciding from its own progress whether a letter is for it, its gift (言靈 or a ware) taken once, a row deleted taking its
letter back, a ware this version does not know waiting for an update."""
import json, os, subprocess, sys, time
sys.path.insert(0, os.path.dirname(__file__))
from cdp import Browser
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
PORT = 8814
URL = f"http://127.0.0.1:{PORT}/"
READY = "typeof state === 'object' && !!state.updatedAt && typeof MAILROOM === 'object'"

def ev(b, js, pre=()):
    return b.run([("nav", URL), ("wait", READY)] + list(pre) + [("eval", js)])[-1]

# a learner out of doors; HALLOWEEN as in supabase/mail.sql; rows(): the rows as fetched
FRESH = """state.stage = 'main'; state.kanaKnown = true; state.introSeen = true; state.storyV = 9; state.startChosen = true; state.met = { koharu: 1, mugi: 1 };
  state.dailyLogs = {}; state.mail = { got: {}, read: {} }; delete state.owned.obake; state.koto.mail = {}; saveState(); Sync.session = null;
  const HALLOWEEN = { id: 'halloween-2026-record', title: '萬聖節的唱片', body: 'ワン！你也在吧？\\n\\n第一張先送給你。\\n\\n——海邊的ムギ', sender: 'mugi', gift: { ware: 'obake' },
    who: { some: [{ accountBefore: '2026-11-11T23:59:59+08:00' }, { practicedBy: '2026-11-11' }] }, starts_at: '2026-11-12T00:00:00+08:00', ends_at: null };
  const rows = async (list) => { const real = Sync.client; Sync.client = { from: () => ({ select: async () => ({ data: list, error: null }) }) }; await MAILROOM.fetch(true); Sync.client = real; };
  const day = (d) => { state.dailyLogs[d] = { date: d, vocabCount: 3, grammarCount: 0, quizCount: 0, bonusCount: 0, minutes: 2, topics: [], mistakeTopics: [] }; };
  const ids = () => letters().map((l) => l.id);"""

def test_the_halloween_record_comes_to_whoever_was_here_by_11_11(b):
    r = json.loads(ev(b, "(async () => { " + FRESH + """ await rows([HALLOWEEN]);
      const none = ids().includes('mail:halloween-2026-record');
      day('2026-11-13'); const late = ids().includes('mail:halloween-2026-record');
      Sync.session = { user: { id: 'u1', created_at: '2026-11-11T10:00:00Z' } }; const account = ids().includes('mail:halloween-2026-record');
      return JSON.stringify({ none, late, account, kept: JSON.parse(localStorage.getItem('nq_mail_rows')).length }); })()"""))
    assert r == {'none': False, 'late': False, 'account': True, 'kept': 1}, r   # nothing yet; practised only after; an account made by then

def test_a_letter_with_a_record_is_taken_once_and_the_gramophone_has_it(b):
    r = json.loads(ev(b, "(async () => { " + FRESH + """ day('2026-11-05'); await rows([HALLOWEEN]); const bal = kotoBalance();
      openLetters('mail:halloween-2026-record'); const m = () => document.getElementById('modalBody');
      const look = { from: m().querySelector('.letter').style.getPropertyValue('--hanko') === "'ムギ'", sign: m().querySelector('.letter-sign').textContent, paras: m().querySelectorAll('.letter-body p').length, btn: m().querySelector('[data-act="letter-gift"]').textContent };
      m().querySelector('[data-act="letter-gift"]').click(); await new Promise((q) => setTimeout(q, 100));
      const after = { owned: state.owned.obake, taken: Object.keys(state.mail.taken), got: m().querySelector('.letter-got').textContent, records: MUSIC.RECORDS.filter((x) => !x.place && (x.own || owns(x.id))).map((x) => x.id), bal: kotoBalance() - bal };
      document.querySelectorAll('.got').forEach((g) => g.remove()); takeLetterGift('mail:halloween-2026-record');
      return JSON.stringify({ look, after, once: Object.keys(state.mail.taken).length }); })()"""))
    assert r['look'] == {'from': True, 'sign': '海邊的ムギ', 'paras': 3, 'btn': '收下唱片〈おばけの夜〉'}, r
    a = r['after']
    assert a['owned']['paid'] == 0 and a['owned']['gift'] == 'mail:halloween-2026-record' and a['taken'] == ['mail:halloween-2026-record'], r
    assert a['got'] == '已收下唱片〈おばけの夜〉' and 'obake' in a['records'] and a['bal'] == 0 and r['once'] == 1, r

def test_rules_koto_gifts_unknown_wares_and_a_letter_taken_back(b):
    r = json.loads(ev(b, "(async () => { " + FRESH + """ day('2026-10-25'); state.owned.kissa = { paid: 80, on: '2026-11-12' };
      const isFor = MAILROOM.isFor, rules = [isFor({ everyone: true }), isFor({ practicedIn: ['2026-10-21', '2026-11-10'] }), isFor({ practicedSince: '2026-11-01' }), isFor({ owns: 'kissa' }), isFor({ lacks: 'kissa' }),
        isFor({ every: [{ owns: 'kissa' }, { practicedBy: '2026-10-30' }] }), isFor({ users: ['u9'] }), isFor({ someday: true }), isFor({})];
      await rows([{ id: 'sorry', title: '補償', body: '抱歉！', gift: { koto: 5 }, who: { owns: 'kissa' } }, { id: 'future', title: '新東西', body: '…', gift: { ware: 'jetpack' }, who: { everyone: true } }]);
      const bal = kotoBalance(); takeLetterGift('mail:sorry'); const plus = kotoBalance() - bal; takeLetterGift('mail:sorry');
      openLetters('mail:future'); const wait = document.querySelector('#modalBody .letter-got').textContent; closeModal(true);
      const both = ids().filter((id) => id.startsWith('mail:')).sort(); await new Promise((q) => setTimeout(q, 10)); await rows([]);
      return JSON.stringify({ rules, plus, again: kotoBalance() - bal, wait, both, gone: ids().filter((id) => id.startsWith('mail:')) }); })()"""))
    assert r['rules'] == [True, True, False, True, False, True, False, False, False], r   # a rule this version does not know: not for it
    assert r['plus'] == 5 and r['again'] == 5 and r['wait'] == '更新 App 之後才能收下', r
    assert r['both'] == ['mail:future', 'mail:sorry'] and r['gone'] == [], r   # rows deleted: their letters taken back

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
                failed += 1; print("FAIL", t.__name__, "-", str(err)[:500])
    finally:
        srv.terminate()
    print("ALL PASS" if not failed else f"{failed} FAILED")
    sys.exit(1 if failed else 0)
