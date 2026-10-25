"""Task 9: sync status chip, settings login panel, backup banner suppression, clickable update toast."""
import os, subprocess, sys, time
sys.path.insert(0, os.path.dirname(__file__))
from cdp import Browser
from test_sync import FAKE, URL as _U, READY, boot
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
PORT = 8795
URL = f"http://127.0.0.1:{PORT}/"
import test_sync; test_sync.URL = URL

def test_chip_shows_logged_out_and_opens_data_tab(b):
    out = boot(b, [
        ("eval", "JSON.stringify({ side: document.querySelector('#sideSync .sync-chip')?.textContent.trim(), cls: document.querySelector('#sideSync .sync-chip')?.className, top: !!document.querySelector('#syncChip .sync-chip') })"),
        ("eval", "document.querySelector('#sideSync .sync-chip').click(); JSON.stringify({ modal: modalOpen(), tab: settingsTab, email: !!document.getElementById('syncEmail') })"),
    ])
    assert out[-2] == '{"side":"未登入","cls":"sync-chip is-off","top":true}', out[-2]
    assert out[-1] == '{"modal":true,"tab":"data","email":true}', out[-1]

def test_login_button_sends_normalized_email(b):
    out = boot(b, [
        ("eval", "openSettings('data'); document.getElementById('syncEmail').value = '  Foo@X.com '; document.querySelector('[data-act=sync-login]').click(); new Promise(r => setTimeout(r, 100)).then(() => JSON.stringify(__fake.calls.filter(c => c[0] === 'otp')))"),
    ])
    assert out[-1] == '[["otp","foo@x.com"]]', out[-1]

def test_eight_digit_code_from_the_email_logs_in(b):
    out = boot(b, [
        ("eval", "openSettings('data'); document.getElementById('syncEmail').value = 'foo@x.com'; document.querySelector('[data-act=sync-login]').click(); new Promise(r => setTimeout(r, 100)).then(() => !!document.getElementById('syncCode'))"),
        ("eval", "document.getElementById('syncCode').value = ' 12345678 '; document.querySelector('[data-act=sync-verify]').click(); new Promise(r => setTimeout(r, 100)).then(() => JSON.stringify(__fake.calls.filter(c => c[0] === 'verify')))"),
    ])
    assert out[-2] is True, "code input should appear after the link is sent"
    assert out[-1] == '[["verify","foo@x.com","12345678","email"]]', out[-1]

def test_logged_in_chip_and_panel(b):
    out = boot(b, [
        ("eval", "__fake.login('a@b.c'); true"), ("wait", "Sync.status === 'idle'"),
        ("eval", "JSON.stringify({ txt: document.querySelector('#sideSync .sync-chip').textContent.trim().slice(0, 3), cls: document.querySelector('#sideSync .sync-chip').className })"),
        ("eval", "openSettings('data'); JSON.stringify({ email: document.querySelector('#settingsBody, .modal, body').textContent.includes('a@b.c'), now: !!document.querySelector('[data-act=sync-now]'), out: !!document.querySelector('[data-act=sync-logout]'), del: !!document.querySelector('[data-act=sync-delete-cloud]'), login: !!document.getElementById('syncEmail') })"),
        ("eval", "closeModal(); state.settings.dailyGoal = 31; saveState(); JSON.stringify({ txt: document.querySelector('#sideSync .sync-chip').textContent.trim(), cls: document.querySelector('#sideSync .sync-chip').className })"),
        ("wait", "Sync.status === 'idle'"),
    ])
    assert out[-3] == '{"txt":"已同步","cls":"sync-chip is-idle"}', out[-3]
    assert out[-2] == '{"email":true,"now":true,"out":true,"del":true,"login":false}', out[-2]
    assert out[-1] == '{"txt":"同步中","cls":"sync-chip is-pending"}', out[-1]

def test_backup_banner_suppressed_when_recently_synced(b):
    seed = "[0,-1,-2].forEach(o => { state.dailyLogs[todayStr(o)] = { quizCount: 1 }; }); state.lastBackup = null; state.backupSnooze = null; backupDue()"
    out = boot(b, [
        ("eval", seed),
        ("eval", "__fake.login('a@b.c'); true"), ("wait", "Sync.status === 'idle'"),
        ("eval", "backupDue()"),
        ("eval", "Sync.signOut().then(() => backupDue())"),
    ])
    assert out[-3] is True, "banner should be due before login"
    assert out[-2] is False, "banner must be suppressed after a recent sync"
    assert out[-1] is True, "banner rule returns to normal after logout"

def test_toast_is_clickable_while_shown(b):
    out = b.run([("nav", URL), ("wait", READY),
        ("eval", "toast('x'); getComputedStyle(document.getElementById('toast')).pointerEvents")])
    assert out[0] == "auto", out[0]

if __name__ == "__main__":
    srv = subprocess.Popen([sys.executable, "-m", "http.server", str(PORT), "--bind", "127.0.0.1"], cwd=ROOT, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(0.8)
    tests = [test_chip_shows_logged_out_and_opens_data_tab, test_login_button_sends_normalized_email, test_eight_digit_code_from_the_email_logs_in, test_logged_in_chip_and_panel,
             test_backup_banner_suppressed_when_recently_synced, test_toast_is_clickable_while_shown]
    failed = 0
    try:
        for t in tests:
            with Browser() as b:
                try: t(b); print("PASS", t.__name__)
                except Exception as e: failed += 1; print("FAIL", t.__name__, "-", str(e)[:300])
    finally:
        srv.terminate()
    print(f"# {len(tests) - failed}/{len(tests)} passed"); sys.exit(1 if failed else 0)
