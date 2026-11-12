"""Task 9: sync status chip, settings login panel, clickable update toast."""
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
        ("eval", "closeModal(); Sync.lastError = 'x'; Sync.setStatus('error'); JSON.stringify({ top: (document.querySelector('#syncChip .sync-chip') || {}).textContent || null, furi: !!document.querySelector('.topbar [data-act=toggle-furi]'), gear: !!document.querySelector('.topbar [data-act=settings]') })"),
    ])
    assert out[-3] == '{"side":"未登入","cls":"sync-chip is-off","top":false}', out[-3]   # a page's bar shows it only when sync failed
    assert out[-2] == '{"modal":true,"tab":"data","email":true}', out[-2]
    assert out[-1] == '{"top":"同步失敗","furi":false,"gear":false}', out[-1]   # 振假名 and 設定 left the bar for good

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

# 2026-11-12: 用 Google 登入 goes to Google with this address to come back to; email stays beside it
def test_google_button_goes_to_google_and_comes_back_here(b):
    out = boot(b, [
        ("eval", "openSettings('data'); JSON.stringify({ g: !!document.querySelector('[data-act=sync-google] svg'), email: !!document.getElementById('syncEmail') })"),
        ("eval", "document.querySelector('[data-act=sync-google]').click(); new Promise(r => setTimeout(r, 100)).then(() => JSON.stringify(__fake.calls.filter(c => c[0] === 'oauth')))"),
    ])
    assert out[-2] == '{"g":true,"email":true}', out
    assert out[-1] == '[["oauth","google","%s"]]' % URL, out

# back from Google: cancelled there → said so and taken out of the address; logged in → said so
def test_coming_back_from_google(b):
    out = b.run([("nav", URL + "?error=access_denied&error_description=The+user+denied#/today"), ("wait", READY), ("eval", FAKE),
        ("eval", "new Promise(r => setTimeout(r, 50)).then(() => Sync.init({ client: __fake.client })).then(() => JSON.stringify({ toast: document.getElementById('toast').textContent, url: location.search, hash: location.hash }))"),
        ("nav", URL + "?code=abc#/today"), ("wait", READY), ("eval", FAKE),
        ("eval", "__fake.login('g@gmail.com'); new Promise(r => setTimeout(r, 50)).then(() => Sync.init({ client: __fake.client })).then(() => document.getElementById('toast').textContent)")])
    assert out[-3] == '{"toast":"已取消 Google 登入","url":"","hash":"#/today"}', out
    assert out[-1] == '已登入 g@gmail.com', out

def test_logged_in_chip_and_panel(b):
    out = boot(b, [
        ("eval", "__fake.login('a@b.c'); true"), ("wait", "Sync.status === 'idle'"),
        ("eval", "JSON.stringify({ txt: document.querySelector('#sideSync .sync-chip').textContent.trim().slice(0, 3), cls: document.querySelector('#sideSync .sync-chip').className })"),
        ("eval", "openSettings('data'); JSON.stringify({ email: document.querySelector('#settingsBody, .modal, body').textContent.includes('a@b.c'), now: !!document.querySelector('[data-act=sync-now]'), out: !!document.querySelector('[data-act=sync-logout]'), del: !!document.querySelector('[data-act=sync-delete-cloud]'), login: !!document.getElementById('syncEmail') })"),
        ("eval", "closeModal(); state.settings.loadCap = 31; saveState(); JSON.stringify({ txt: document.querySelector('#sideSync .sync-chip').textContent.trim(), cls: document.querySelector('#sideSync .sync-chip').className })"),
        ("wait", "Sync.status === 'idle'"),
    ])
    assert out[-3] == '{"txt":"已同步","cls":"sync-chip is-idle"}', out[-3]
    assert out[-2] == '{"email":true,"now":true,"out":true,"del":true,"login":false}', out[-2]
    assert out[-1] == '{"txt":"同步中","cls":"sync-chip is-pending"}', out[-1]

def test_toast_is_clickable_while_shown(b):
    out = b.run([("nav", URL), ("wait", READY),
        ("eval", "toast('x'); getComputedStyle(document.getElementById('toast')).pointerEvents")])
    assert out[0] == "auto", out[0]

if __name__ == "__main__":
    srv = subprocess.Popen([sys.executable, os.path.join(ROOT, "tests", "e2e", "serve.py"), str(PORT), "--bind", "127.0.0.1"], cwd=ROOT, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(0.8)
    tests = [test_chip_shows_logged_out_and_opens_data_tab, test_login_button_sends_normalized_email, test_eight_digit_code_from_the_email_logs_in, test_logged_in_chip_and_panel,
             test_google_button_goes_to_google_and_comes_back_here, test_coming_back_from_google,
             test_toast_is_clickable_while_shown]
    failed = 0
    try:
        for t in tests:
            with Browser() as b:
                try: t(b); print("PASS", t.__name__)
                except Exception as e: failed += 1; print("FAIL", t.__name__, "-", str(e)[:300])
    finally:
        srv.terminate()
    print(f"# {len(tests) - failed}/{len(tests)} passed"); sys.exit(1 if failed else 0)
