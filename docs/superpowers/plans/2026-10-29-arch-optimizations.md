# 1.0.14 架構與狀態同步優化實作計劃

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在不變更教材內容的前提下，修正 `1.0.13` 現存的雲端合併遺漏、IndexedDB 快照排序／清理錯位、`手滑，不算` 撤銷殘留、`這題有問題` 在假名／活用題失效、單字搜尋焦點中斷，以及快取／DOM 效能細節，並發佈 `1.0.14`。

**Architecture:** 維持單一 `index.html` + `sync-core.js` + `sw.js` 的無框架架構：
1. 在 `sync-core.js` 補齊 `mergeStates`（涵蓋 `stageTests`、`unitAiNotes`、同日 `today` 配額、跨裝置 `mistakes` 去重與 `mastered` 對齊）與 `isEmptyProgress`。
2. 在 `index.html` 修正 `Snapshots.prune()` 與 `fillSnapshotList()` 的日期排序與顯示標籤。
3. 在 `index.html` 補齊 `answerCurrent` / `ACTIONS.slip` 的完整狀態撤銷快照（含 `dailyLogs`、`themeLane`、`currentUnit`、`completedUnits`、`encore` 排程），並在 `buildRegistry()` 對 `drills` / `kana` 套用 `hidden` 過濾。
4. 在 `index.html` 為單字表搜尋加上即時 `input` 局部更新（支援 IME 組字且不遺失游標），並加入 `stateRev` 快取失效、`dayStats` 單次掃描快取、內建振假名索引快取、`audioCache` 上限與 `renderStats` DOM 結構修正。

**Tech Stack:** 原生 JavaScript (ES2020)、IndexedDB、Service Worker、Node `assert` 單元測試、Python CDP E2E 測試 (`scripts/test.sh`)。

---

## 檔案變更清單

- 修改：`sync-core.js`（`mergeStates`、`isEmptyProgress`）
- 修改：`tests/sync-core.test.js`（新增 `stageTests`、`unitAiNotes`、`today`、跨裝置 `mistakes` 去重與 `isEmptyProgress` 單元測試）
- 修改：`index.html`（快照排序與標籤、`slip` 完整撤銷、`buildRegistry` 隱藏項目過濾、單字搜尋即時過濾、`stateRev` 與快取優化、`APP_VERSION = '1.0.14'`）
- 修改：`sw.js`（`CACHE = 'nq-v1.0.14'`）
- 修改：`tests/e2e/test_sync.py`、`tests/e2e/test_fixes.py`、`tests/e2e/test_vocab.py`（新增對應 E2E 驗證）

---

### Task 1: 補齊 `sync-core.js` 的 `mergeStates` 與 `isEmptyProgress`

**Files:**
- Modify: `sync-core.js:60-104`
- Test: `tests/sync-core.test.js`

- [x] **Step 1: 在 `tests/sync-core.test.js` 撰寫失敗測試**

在 `tests/sync-core.test.js` 尾端新增測試，驗證：
1. `stageTests` 依階段 (`pre`, `p1`, `p2`, `p3`) 合併、去重並保留最新 10 筆。
2. `unitAiNotes` 依單元 key 合併兩端筆記（同 key 取較新端）。
3. `today` 若兩端 `date` 相同，各項新題計數 (`newV`, `newG`, `newK`, `newL`, `newR`, `newC`, `newA`) 取 `Math.max`。
4. 兩台裝置對同一題 (`key` 或 `prompt` 相同、但隨機 `id` 不同) 產生 `mistakes` 時不會重複，且若合併後 `srs[key]` 已熟練或不在重學階梯 (`typeof rl !== 'number'`)，自動對齊 `mastered: true`。
5. `isEmptyProgress` 能識別僅有 `stageTests` 的非空進度。

```javascript
// append to tests/sync-core.test.js
{
  const a = {
    updatedAt: '2026-05-01T10:00:00.000Z',
    srs: { 'v-1': { b: 4, due: '2026-05-10', n: 5, ok: 4, ng: 1, s: 10, d: 5, last: '2026-05-01' } },
    stageTests: { pre: [{ date: '2026-04-29', correct: 16, total: 20, passed: true }], p1: [{ date: '2026-04-30', correct: 20, total: 30, passed: false }] },
    unitAiNotes: { m1: '筆記 A', m2: '舊 M2' },
    today: { date: '2026-05-01', newV: 8, newG: 1, newK: 3, newL: 0, newR: 0, newC: 2, newA: 5 },
    mistakes: [{ id: 'mk_device_a', key: 'v-1', kind: 'v', prompt: '食べる', chosen: '喝', answer: '吃', exp: '', ts: 100, count: 2, mastered: false }],
  };
  const b = {
    updatedAt: '2026-05-01T12:00:00.000Z',
    srs: { 'v-1': { b: 5, due: '2026-05-20', n: 6, ok: 5, ng: 1, s: 20, d: 4, last: '2026-05-01' } },
    stageTests: { pre: [{ date: '2026-05-01', correct: 19, total: 20, passed: true }, { date: '2026-04-29', correct: 16, total: 20, passed: true }] },
    unitAiNotes: { m2: '新 M2', m3: '筆記 B' },
    today: { date: '2026-05-01', newV: 3, newG: 2, newK: 1, newL: 1, newR: 0, newC: 0, newA: 2 },
    mistakes: [{ id: 'mk_device_b', key: 'v-1', kind: 'v', prompt: '食べる', chosen: '走', answer: '吃', exp: '', ts: 200, count: 1, mastered: false }],
  };
  const m = SyncCore.mergeStates(a, b);
  assert.strictEqual(m.stageTests.pre.length, 2, 'deduplicates identical stageTest entries');
  assert.strictEqual(m.stageTests.pre[0].date, '2026-05-01', 'newest stageTest stays first');
  assert.strictEqual(m.stageTests.p1.length, 1, 'preserves stageTest from older side');
  assert.deepStrictEqual(m.unitAiNotes, { m1: '筆記 A', m2: '新 M2', m3: '筆記 B' });
  assert.deepStrictEqual(m.today, { date: '2026-05-01', newV: 8, newG: 2, newK: 3, newL: 1, newR: 0, newC: 2, newA: 5 });
  assert.strictEqual(m.mistakes.length, 1, 'deduplicates mistakes across devices by key/prompt');
  assert.strictEqual(m.mistakes[0].count, 2, 'keeps max mistake count');
  assert.strictEqual(m.mistakes[0].mastered, true, 'marks mistake mastered when merged srs has no rl');
  assert.strictEqual(SyncCore.isEmptyProgress({ stageTests: { pre: [{ date: '2026-05-01', correct: 18, total: 20, passed: true }] } }), false);
}
```

- [x] **Step 2: 執行單元測試確認失敗**

Run: `node tests/sync-core.test.js`
Expected: FAIL（`m.stageTests.p1` 為 `undefined`、`m.unitAiNotes.m1` 遺失、`m.today.newV` 為 `3`、`m.mistakes.length` 為 `2`）。

- [x] **Step 3: 修改 `sync-core.js` 實作完整合併邏輯**

更新 `sync-core.js` 中的 `mergeStates` 與 `isEmptyProgress`：

```javascript
  function mergeMistakes(olderList, newerList, mergedSrs) {
    const map = new Map();
    const keyOf = (x) => (x && (x.key || x.prompt || x.id)) ? String(x.key || x.prompt || x.id) : null;
    for (const x of (olderList || [])) {
      const k = keyOf(x);
      if (k) map.set(k, Object.assign({}, x));
    }
    for (const x of (newerList || [])) {
      const k = keyOf(x);
      if (!k) continue;
      const prev = map.get(k);
      if (!prev) {
        map.set(k, Object.assign({}, x));
      } else {
        const latest = (x.ts || 0) >= (prev.ts || 0) ? x : prev;
        map.set(k, Object.assign({}, prev, latest, {
          count: Math.max(prev.count || 1, x.count || 1),
          ts: Math.max(prev.ts || 0, x.ts || 0)
        }));
      }
    }
    return [...map.values()].map(m => {
      const r = m.key && mergedSrs && mergedSrs[m.key];
      if (r && (r.known || (typeof r.rl !== 'number' && (r.ok || 0) > 0 && (r.b || 0) >= 1))) {
        return Object.assign({}, m, { mastered: true });
      }
      return m;
    });
  }

  function mergeStageTests(olderSt, newerSt) {
    const out = {};
    const keys = new Set([...Object.keys(olderSt || {}), ...Object.keys(newerSt || {})]);
    for (const k of keys) {
      const seen = new Set();
      const merged = [];
      for (const item of [...((newerSt && newerSt[k]) || []), ...((olderSt && olderSt[k]) || [])]) {
        if (!item || typeof item !== 'object') continue;
        const sig = `${item.date || ''}|${item.correct}|${item.total}|${item.passed ? 1 : 0}`;
        if (seen.has(sig)) continue;
        seen.add(sig);
        merged.push(Object.assign({}, item));
      }
      merged.sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
      out[k] = merged.slice(0, 10);
    }
    return out;
  }

  function mergeToday(olderT, newerT) {
    if (!olderT || !newerT) return newerT || olderT;
    if (olderT.date !== newerT.date) return String(newerT.date || '') >= String(olderT.date || '') ? newerT : olderT;
    const out = Object.assign({}, olderT, newerT);
    for (const k of ['newV', 'newG', 'newK', 'newL', 'newR', 'newC', 'newA']) {
      if (typeof olderT[k] === 'number' || typeof newerT[k] === 'number') {
        out[k] = Math.max(olderT[k] || 0, newerT[k] || 0);
      }
    }
    return out;
  }
```

並在 `mergeStates(a, b)` 內：
- 將 `['vocab', 'customGrammar', 'customExam', 'examHistory']` 維持依 `id` 合併；
- `out.mistakes = mergeMistakes(older.mistakes, newer.mistakes, out.srs);`
- `if (older.stageTests || newer.stageTests) out.stageTests = mergeStageTests(older.stageTests, newer.stageTests);`
- `if (older.unitAiNotes || newer.unitAiNotes) out.unitAiNotes = Object.assign({}, older.unitAiNotes, newer.unitAiNotes);`
- `if (older.today || newer.today) out.today = mergeToday(older.today, newer.today);`
- 在 `isEmptyProgress(s)` 補上 `const st = s.stageTests && typeof s.stageTests === 'object' ? Object.values(s.stageTests).some(a => Array.isArray(a) && a.length > 0) : false;` 並納入判斷。

- [x] **Step 4: 執行單元測試確認通過**

Run: `node tests/sync-core.test.js`
Expected: PASS（輸出 `# sync-core: all assertions passed`）。

---

### Task 2: 修正 IndexedDB 快照 (`Snapshots`) 日期排序、清理與顯示標籤

**Files:**
- Modify: `index.html:9387-9391`, `index.html:9480-9490`
- Test: `tests/e2e/test_sync.py`

- [x] **Step 1: 在 `tests/e2e/test_sync.py` 新增快照清理與排序顯示測試**

在 `tests/e2e/test_sync.py` 新增 `test_snapshots_prune_by_date_and_format_conflict_labels`：
- 寫入舊的 `conflict-2026-01-01`、`pre-cloud-2026-01-02` 以及 7 筆較新的每日快照 `2026-04-01`..`2026-04-07` 與 1 筆今日 `conflict-2026-04-07`。
- 觸發 `Snapshots.prune()` 與 `fillSnapshotList()`。
- 驗證最舊的 `conflict-2026-01-01` 與 `pre-cloud-2026-01-02` 被優先淘汰（不會反而把 `2026-04-01`、`2026-04-02` 刪掉），且設定面板顯示為易讀標籤（如 `2026/04/07（衝突備份）`），而非 `conflict/2026/04/07`。

- [x] **Step 2: 修改 `index.html` 的 `Snapshots` 排序輔助函式與標籤格式**

在 `index.html` 的 `Snapshots` 區塊 (`9373-9393`) 與 `fillSnapshotList` (`9480-9490`)：

```javascript
function snapshotSortKey(k) {
  const s = String(k);
  const m = s.match(/(\d{4}-\d{2}-\d{2})/);
  const date = m ? m[1] : '0000-00-00';
  // 同一天內：一般每日快照排在備份之前被淘汰（保留當日衝突/同步前備份），顯示時備份與當日快照依序排列
  const rank = s.startsWith('conflict-') ? '2' : s.startsWith('pre-cloud-') ? '1' : '0';
  return `${date}#${rank}#${s}`;
}

function snapshotLabel(k) {
  const s = String(k);
  const m = s.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return s;
  const d = `${m[1]}/${m[2]}/${m[3]}`;
  if (s.startsWith('conflict-')) return `${d}（衝突備份）`;
  if (s.startsWith('pre-cloud-')) return `${d}（同步前備份）`;
  return d;
}
```

將 `Snapshots.prune()` 改為：
```javascript
  async prune() {
    const keys = await this.list();
    if (keys.length <= 7) return;
    const sorted = keys.map(String).sort((a, b) => snapshotSortKey(a).localeCompare(snapshotSortKey(b)));
    const drop = sorted.slice(0, keys.length - 7);
    const db = await this.open(); if (!db) return;
    const tx = db.transaction('snaps', 'readwrite');
    drop.forEach(k => tx.objectStore('snaps').delete(k));
  }
```
並將 `fillSnapshotList()` 改用 `snapshotSortKey` 反向排序，按鈕文字使用 `esc(snapshotLabel(k))`。

- [x] **Step 3: 執行 `test_sync.py` 驗證**

Run: `python3 tests/e2e/test_sync.py`
Expected: 所有測試（含原有 `pre-cloud-` 與 `conflict-` 測試及新增的排序測試）全數 PASS。

---

### Task 3: 補齊 `ACTIONS.slip`（「手滑，不算」）完整撤銷與 `report-item` 隱藏過濾

**Files:**
- Modify: `index.html:1450-1460`, `index.html:3939-3981`, `index.html:4250-4265`
- Test: `tests/e2e/test_fixes.py`

- [x] **Step 1: 在 `tests/e2e/test_fixes.py` 新增失敗測試**

在 `tests/e2e/test_fixes.py` 新增兩個測試：
1. `test_slip_restores_daily_logs_theme_lane_and_removes_scheduled_encore`：
   - 對一個全新單字故意答錯，確認產生了 `encore`、寫入了 `dailyLogs[today]` 與 `themeLane`；
   - 觸發 `ACTIONS.slip()` 再答對，驗證 `dailyLogs[today]` 不會殘留剛才答錯的 `wrong` / `mistakesAdded` 次數，且 `SESSION.entries` 不會有兩組重複的 `encore`。
2. `test_report_item_hides_kana_and_conjugation_drills_on_rebuild`：
   - 在假名 (`a-...`) 或活用 (`c-...`) 練習答題後觸發 `reportCurrentItem()`，驗證重建 `REG` 後該題不再出現在 `REG.kana` / `REG.drills`。

- [x] **Step 2: 修改 `index.html` 的 `buildRegistry`、`answerCurrent` 與 `ACTIONS.slip`**

1. 在 `buildRegistry()` (`index.html:1450-1459`) 補上 `!hidden.has(d.id)` 與 `!hidden.has(k.id)`：
```javascript
  const drills = (D.conjugation || []).filter(d => !hidden.has(d.id)).map(d => Object.assign({}, d, { kind: 'c', key: d.id }));
  const kana = (D.kana || []).filter(k => !hidden.has(k.id)).map(k => Object.assign({}, k, {
    kind: 'a', key: k.id,
    row: k.row !== undefined ? k.row : kanaRowOf(k.id, k.h)
  }));
```
2. 在 `answerCurrent` (`index.html:3940-3948`) 建立 `e.undo` 時，額外保存：
```javascript
    const t = todayStr();
    e.undo = {
      srs: prev ? deepClone(prev) : null,
      mistake: prevMistake ? deepClone(prevMistake) : null,
      mistakesLen: state.mistakes.length,
      today: deepClone(state.today),
      logDate: t,
      dailyLog: state.dailyLogs[t] ? deepClone(state.dailyLogs[t]) : null,
      themeLane: deepClone(state.themeLane),
      currentUnit: state.currentUnit,
      completedUnits: state.completedUnits.slice(),
      hadNewEncore: !prev && e.item && (e.item.kind === 'v' || e.item.kind === 'g')
    };
```
3. 在 `ACTIONS.slip` (`index.html:4250-4265`) 還原上述欄位：
   - 還原 `state.dailyLogs[u.logDate]`（若原本為 `null` 則 `delete state.dailyLogs[u.logDate]`，否則還原 `u.dailyLog`）。
   - 還原 `state.themeLane = u.themeLane`、`state.currentUnit = u.currentUnit`、`state.completedUnits = u.completedUnits`。
   - 若 `u.hadNewEncore` 為真，一併從 `SESSION.entries` 移除在 `SESSION.idx` 之後對同一 `e.item` 排入的 `x.encore`（連同既有的 `x.requeued` 一併過濾）。

- [x] **Step 3: 執行 E2E 測試驗證**

Run: `python3 tests/e2e/test_fixes.py`
Expected: 新增測試與既有測試全數 PASS。

---

### Task 4: 單字表搜尋框 (`#vocabSearch`) 即時過濾且不中斷輸入焦點

**Files:**
- Modify: `index.html:5556-5596`, `index.html:5734`, `index.html:9268-9284`
- Test: `tests/e2e/test_vocab.py`

- [x] **Step 1: 在 `tests/e2e/test_vocab.py` 撰寫搜尋焦點與即時過濾測試**

在 `tests/e2e/test_vocab.py` 新增 `test_vocab_search_filters_live_on_input_and_preserves_focus`：
- 導向 `#/vocab/list?lv=N5`，聚焦 `#vocabSearch`，模擬輸入字元並觸發 `input` 事件；
- 驗證表格列數即時縮小、`document.activeElement.id === 'vocabSearch'` 且 `selectionStart` 維持在字尾。

- [x] **Step 2: 修改 `index.html` 的 `renderVocabList` 與事件委派**

1. 在 `renderVocabList` (`index.html:5556-5596`) 將搜尋結果計數與表格抽出為可重用渲染或包在 `#vocabListBody` 容器內，或在 `render()` 重繪後若焦點原本在 `#vocabSearch` 自動還原焦點與游標位置，同時支援 `input` 事件（當 `!ev.isComposing` 時透過 `history.replaceState` 更新 hash 參數並只重繪 `#vocabListBody` 與標題副標計數，完全不銷毀 `#vocabSearch` DOM 節點）。
2. 在 `compositionend` 時同樣觸發一次局部更新，確保日文／中文 IME 選字完成後立即過濾。

- [x] **Step 3: 執行 `test_vocab.py` 驗證**

Run: `python3 tests/e2e/test_vocab.py`
Expected: 全數 PASS。

---

### Task 5: 執行期快取優化、音訊 Blob 上限、HTML 結構修正與版本號升版 (`1.0.14`)

**Files:**
- Modify: `index.html:863`, `index.html:1155-1180`, `index.html:1645-1652`, `index.html:1832-1872`, `index.html:3501-3511`, `index.html:7779`, `index.html:7976`, `index.html:8124-8126`
- Modify: `sw.js:2`

- [x] **Step 1: 加入 `stateRev` 單調遞增計數器與 `dayStats` 快取**

1. 在 `index.html` 定義 `let stateRev = 0;`，於 `saveState()`、`normalizeState()`、`Sync.applyCloud()` 每次狀態變更時 `stateRev++` 並令 `DAILY_CACHE = null`。
2. 將 `buildDailySession` (`index.html:3501`) 的 `key` 納入 `stateRev`：
   ```javascript
   const key = `${todayStr()}_${state.updatedAt}_${stateRev}_${state.currentUnit}`;
   ```
3. 為 `dayStats(d)` 加入依 `stateRev` 快取的 `dueByDate` 映射表（單次掃描 `state.srs` 建立 `{ [due]: count }`），使 `recentLogsHtml()` 連續呼叫 14 次 `dayStats(d)` 時只掃描 `state.srs` 一次。

- [x] **Step 2: 快取內建單字的振假名索引 (`buildFuriganaIndex`)**

在 `buildFuriganaIndex()` (`index.html:1832-1872`)：
- 以 `const hiddenKey = (state.hidden || []).slice().sort().join(',');` 快取內建單字 (`v.builtin`) 展開後的基底 Map（`baseFuri`, `basePrio`, `baseBlock`, `baseSrc`, `baseMax`）。
- 當 `buildRegistry()` 被呼叫（例如新增自訂字詞）且 `hiddenKey` 未變時，直接由基底 Map 複製並僅走訪 `!v.builtin` 的自訂字詞，省去每次重新展開 1,661 個內建單字與動詞活用的計算。

- [x] **Step 3: 為 `audioCache` 加上 LRU 容量上限與修正 `renderStats` 多餘的 `</div>`**

1. 在 `index.html:8124-8126` 寫入 `audioCache` 前檢查大小（上限 60 筆）：
   ```javascript
   if (audioCache.has(k)) audioCache.delete(k);
   else if (audioCache.size >= 60) audioCache.delete(audioCache.keys().next().value);
   audioCache.set(k, b);
   ```
2. 移除 `renderStats` (`index.html:7779`) 結尾多出的一個未配對 `</div>`。

- [x] **Step 4: 升級版本號至 `1.0.14` 並執行完整測試套件**

1. 更新 `index.html:863`：`const APP_VERSION = '1.0.14';`
2. 更新 `sw.js:2`：`const CACHE = 'nq-v1.0.14';`
3. 執行完整檢查腳本：
   Run: `bash scripts/test.sh`
   Expected: 語法檢查、版本檢查、`sync-core` 單元測試與全部 E2E 測試皆 PASS。

