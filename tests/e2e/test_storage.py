"""Task 5: state persistence lives in IndexedDB, migrates from localStorage, keeps updatedAt."""
import json, subprocess, sys, time, os
sys.path.insert(0, os.path.dirname(__file__))
from cdp import Browser, idb_get

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
PORT = 8791
URL = f"http://127.0.0.1:{PORT}/"

def serve():
    p = subprocess.Popen([sys.executable, "-m", "http.server", str(PORT), "--bind", "127.0.0.1"], cwd=ROOT,
                         stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(0.8); return p

def test_fresh_load_writes_state_to_indexeddb(b):
    v = b.run([("nav", URL), ("wait", "typeof state === 'object' && !!state.updatedAt"),
               ("eval", idb_get("state"))])[0]
    assert v and v.get("v") == 3, f"IDB state missing: {v!r}"
    assert isinstance(v.get("updatedAt"), str) and v["updatedAt"].endswith("Z"), v.get("updatedAt")
    return v["updatedAt"]

def test_save_state_bumps_updated_at(b, before):
    v = b.run([("nav", URL), ("wait", "typeof state === 'object' && !!state.updatedAt"),
               ("eval", "new Promise(r => setTimeout(r, 5)).then(() => { state.settings.loadCap = 77; saveState(); })"),
               ("eval", "new Promise(r => setTimeout(r, 300))"), ("eval", idb_get("state"))])[2]
    assert v["settings"]["loadCap"] == 77, "saveState did not persist to IndexedDB"
    assert v["updatedAt"] > before, (v["updatedAt"], before)

def test_localstorage_only_data_migrates_into_indexeddb(b):
    seed = {"v": 3, "settings": {"loadCap": 42}, "vocab": [{"id": "x1", "jp": "猫", "zh": "貓"}], "srs": {}}
    out = b.run([
        ("nav", URL), ("wait", "typeof state === 'object'"),
        ("eval", "new Promise(res => { const r = indexedDB.deleteDatabase('nihongo_quest_db'); r.onsuccess = r.onerror = r.onblocked = () => res(true); })"),
        ("eval", f"localStorage.setItem('nihongo_quest_n4_v3', {json.dumps(json.dumps(seed))}); true"),
        ("nav", URL), ("wait", "typeof state === 'object' && !!state.updatedAt"),
        ("eval", "state.settings.loadCap"), ("eval", "state.vocab.length"),
        ("eval", idb_get("state")),
        ("eval", "JSON.parse(localStorage.getItem('nihongo_quest_n4_v3')).settings.loadCap"),
    ])
    assert out[2] == 42 and out[3] == 1, f"migrated state wrong: {out[2:4]}"
    assert out[4] and out[4]["settings"]["loadCap"] == 42, "IDB copy missing after migration"
    assert out[5] == 42, "localStorage copy must be kept as a safety net"

# cdp.py: one Chrome per test file, each Browser() a fresh browser context in it — no Chrome start-up per test, and a test
# still finds nothing another one left behind (storage, IndexedDB, service workers, caches)
def test_browsers_in_one_file_share_one_chrome():
    with Browser() as a, Browser() as c:
        assert a.port == c.port and a.ws_url != c.ws_url, (a.port, c.port, a.ws_url, c.ws_url)

def test_a_browser_starts_with_nothing_from_the_one_before():
    with Browser() as a:
        a.run([("nav", URL), ("wait", "typeof state === 'object' && !!state.updatedAt"), ("wait", "!!navigator.serviceWorker.controller"),
               ("eval", "localStorage.setItem('leak', '1'); true")])
    with Browser() as c:   # an SVG of the same origin: the app does not load, so it cannot register anything itself
        left = c.run([("nav", URL + "icons/icon.svg"), ("eval", """Promise.all([navigator.serviceWorker.getRegistrations().then(r => r.length),
          indexedDB.databases().then(d => d.length), localStorage.length, caches.keys().then(k => k.length)])""")])[0]
    assert left == [0, 0, 0, 0], left

if __name__ == "__main__":
    srv = serve()
    try:
        with Browser() as b:
            before = test_fresh_load_writes_state_to_indexeddb(b); print("PASS fresh_load_writes_state_to_indexeddb")
            test_save_state_bumps_updated_at(b, before); print("PASS save_state_bumps_updated_at")
            test_localstorage_only_data_migrates_into_indexeddb(b); print("PASS localstorage_only_data_migrates_into_indexeddb")
        test_a_browser_starts_with_nothing_from_the_one_before(); print("PASS a_browser_starts_with_nothing_from_the_one_before")
        test_browsers_in_one_file_share_one_chrome(); print("PASS browsers_in_one_file_share_one_chrome")
    finally:
        srv.terminate()
