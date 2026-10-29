# 四個階段、階段測驗與批次標記 — 設計

日期：2026-10-29　狀態：待使用者確認　版本：1.0.11（分支 feat/pre-n5）

## 1. 目標

課程頁改成四個對等的階段：入門、第一階段（N5 文法）、第二階段（N4 核心）、第三階段（N4 進階）。第 0 週從第一階段搬到入門。整頁只有一個「目前」。每個階段都有一份固定 40 題的階段測驗；通過後，使用者可以把該階段和之前所有階段的內容批次標成 已學／熟悉／熟練 三種等級之一。

使用者的決定（2026-10-29）：
- 標記範圍是「該階段＋之前全部」，測驗的意思是「我已經會到這裡」。
- 三個選項對應 app 現有三階：已學（初識）／熟悉／熟練（等同「我會了」）。介面文字沿用現有名稱。
- 測驗題目從本階段題庫用現有練習題產生器抽，固定約 40 題，答對 80% 通過；測驗作答不影響 SRS。
- 等級類內容（單字、漢字、聽力、閱讀）歸到該等級的最後一個階段：PRE_N5 → 入門，N5 → 第一階段，N4 → 第三階段。第二階段只有 m7–m12 的文法與變化練習。

## 2. 階段模型

不改 data.js。index.html 新增：

```
STAGES = [
  { id: 'pre', title: '入門', sub: '假名與入門單字，不算週數', units: [],        lv: 'PRE_N5' },
  { id: 'p1',  ...DATA.PHASES[0], units: m1–m6,   lv: 'N5' },
  { id: 'p2',  ...DATA.PHASES[1], units: m7–m12,  lv: null },
  { id: 'p3',  ...DATA.PHASES[2], units: m13–m18, lv: 'N4' },
]
```

- `stageItems(id)`：該階段單元的 `REG.grammar`（含自訂文法）與 `REG.drills`；`lv` 非空時加上該等級的內建 `REG.vocab`、`REG.kanji`、`REG.listen`、`REG.read`；`pre` 另加全部 `REG.kana`。隱藏（`state.hidden`）的項目排除。
- `stageIndex(id)`、`stagesUpTo(id)`：批次標記用。
- `currentStageId()`：`state.stage === 'pre'` 回 `pre`，否則回 `state.currentUnit` 所在的階段。
- 測試會檢查：四個階段的項目互不重疊，且聯集等於全部可練項目（假名＋內建單字＋文法＋漢字＋聽力＋閱讀＋變化練習）。

## 3. 課程頁

- 四張卡同一款式（沿用現有 `.card` 與 `.list` 的 `unit-row`）。
- 入門卡：標題「入門」加 chip「PRE_N5」，副標「假名與入門單字，不算週數，單字都看過就進第 1 週」。列表第一列是「第 0 週：開始之前」（現有 `introRow`，帶「看過」chip），其下三條進度列：假名、單字、漢字（現有 `line()`）。按鈕列保留：練假名、我已認得假名（門檻未開時）、進入第 1 週／回到入門。第一階段卡不再插入 `introRow`。
- 「目前」chip 整頁恰好一個：`stage === 'pre'` 時在入門卡標題；否則只在 `currentUnit` 那一列（保留 `.current` 底色）。階段卡標題不加 chip；正課時入門卡不加 chip、也不加 `.current`。
- 每張卡底部一列 `stage-foot`：
  - 「階段測驗」按鈕（`data-act="stage-test" data-stage=...`）。
  - 上次結果 chip：最近一筆 `stageTests[id]`，「上次 34／40・通過」用 `chip-ok`，未通過用一般 chip，沒考過不顯示。
  - 該階段有任何通過紀錄時，多一顆「標記到這裡為止」（`data-act="stage-mark"`），開 §5 的對話框。
- 頁首副標改成「四個階段：入門與 18 個單元（每單元約兩週）。整體完成度 x%」。changelog 第 975 行的文字改成「第 0 週在入門卡裡」。今日頁起點 banner 的「先看第 0 週」維持。

## 4. 階段測驗

### 4.1 組卷

`buildStageTest(id)` 回傳 40 個 `{ item }`：

| 階段 | 配額 |
|---|---|
| pre | 假名 12、單字 24、漢字 4 |
| p1 | 文法 20（六個單元平均，餘數隨機）、單字 10、漢字 4、聽力 3、閱讀 3 |
| p2 | 文法 32（六個單元平均）、變化練習 8 |
| p3 | 文法 20、單字 10、漢字 4、聽力 3、閱讀 3 |

- 每類在該階段項目中隨機抽（不看 SRS 狀態；沒學過的也會抽到，這是刻意的）。
- 某類不足時，缺額由同階段其他類依表格順序補；總數仍可能少於 40（題庫極小時），通過門檻改為「答對 ≥ 80% 的實際題數」。
- 順序打散，但同一項目不重複。

### 4.2 執行

- `startSession('stage', { stage: id })`：`entries = buildStageTest(id)`，`SESSION.test = { stage: id }`，`title` 為「入門・階段測驗」等。
- 測驗模式的差異（都以 `SESSION.test` 判斷）：
  - 不設 `preview`（沒有預習卡、沒有講義卡）。
  - `prepareEntry` 用 `makeQuestion(item, { choiceOnly: true })`：只給有選項的格式；排除 `*-type`、磁貼、配對、拼字等非選擇格式。`makeQuestion` 新增這個 ctx，各 kind 的格式挑選處各加一個過濾。
  - `answerCurrent` 開頭：`if (SESSION.test) { e.done = true; e.chosen = i; 累計 stats 與 results; renderPractice(); speakAnswered(q); return; }`。不呼叫 `srsAnswer`、`recordFormat`、`addMistake`、`onCorrectForMistake`、`scheduleEncores`、`recordAccuracy`，不寫 `statsFmt`，不插 再練一次。
  - 作答畫面隱藏「這個字我已經會了」「手滑，不算」。
  - 中途離開（`exitPractice`）不留紀錄。
- 結束：`finishStageTest()` 寫 `state.stageTests[id].unshift({ date, correct, total, passed })`（保留 10 筆）、`recordAction('q', null, 'x')` 一次（算進今天有練習，不算單字／文法題數）、`saveState()`。
- 結束畫面：`renderSummary` 的測驗變體：分數「34／40・通過」或「未通過（需 32 題）」、各類對／總、錯題清單（題幹、正解、你選的）。通過時按鈕「標記到這裡為止」（開 §5）與「回課程頁」；未通過時「再考一次」「去練這個階段」（pre → `startSession('kana')`；其他 → 該階段第一個未完成單元的單元練習）。

### 4.3 狀態

- `state.stageTests = {}`（defaultState 與 normalize 都補）。同步照現有 state 整體機制。

## 5. 批次標記

### 5.1 對話框

標題「標記到〈第二階段〉為止」。內容：

- 一行說明：「會把 入門、第一階段、第二階段 的全部內容標成你選的等級；已經比這個等級高的項目不動。」
- 三個單選（預設 熟悉）：
  - 已學：「看過，很快會排進複習（分散在未來兩週）。」
  - 熟悉：「約一到兩週後開始複習。」
  - 熟練：「等同『我會了』：直接算熟練，五到八週後各確認一次；答錯就回到正常排程。會清掉這些項目的錯題。」
- 選項變動時即時顯示「會影響 N 個項目」（`bulkMarkPreview(stageId, level)` 的數字）。
- 提示：「無法復原（只有這次 toast 上的『復原』），建議先到設定下載備份。」
- 「確定」「取消」。

只有該階段 `stageTests` 有 `passed` 紀錄時才能開。

### 5.2 機制 `bulkMark(stageId, level)`

對 `stagesUpTo(stageId)` 的每個 `stageItems` 項目：

| level | 目標 | 已達則跳過 | 寫法 |
|---|---|---|---|
| seen | 有紀錄 | `state.srs[key]` 存在 | 新建紀錄 `s=1, b=1, intro=t, lrn=t` |
| learned | b ≥ SRS_LEARNED | `r.b >= 3` | `s = max(s, LEVEL_FROM_S[2])`（5），`b = levelFromS(s)`，沒有 `lrn` 補 `lrn=t` |
| known | 已熟練 | `srsLevelLabel === '已熟練'` | 沿用 `markKnown(key, false)` 的設定（`s ≥ 45, d ≤ 4, known=1`，清錯題） |

- 到期分散：第 i 個被改動的項目 `due = t + lo + (i mod (hi − lo + 1))`，區間 seen 1–14、learned 5–14、known 35–56 天。`markKnown` 多接一個 `dueDays` 參數讓它用這個值；單字頁「這 N 個字我都會了」改成同樣分散（35–56 天）。
- 連帶：
  - `stagesUpTo` 的所有單元進 `completedUnits`；這些單元的講義段落 key 全部進 `lessonSeen`（避免之後練習彈講義卡）。
  - `introSeen = true`、`kanaKnown = true`、`stage = 'main'`。
  - `currentUnit`：下一階段的第一個單元；標到 p3 時留 `m18`。
  - 只在 currentUnit 要往前跳時才改它；已經在更後面的單元不動。
  - `DAILY_CACHE = null`。
- 復原：和 `vocab-known-all` 相同做法，在記憶體保留改動前的 `srs` 片段、`mistakes`、`completedUnits`、`lessonSeen`、`currentUnit`、`stage`、`introSeen`、`kanaKnown` 的快照，toast 上給「復原」，重新整理後失效。
- 結束 toast：「已把 N 個項目標成熟悉。目前單元：第 13–14 週・可能形」。

## 6. 文案

- 卡上按鈕：「階段測驗」「標記到這裡為止」。
- 測驗說明（開始前 confirm 不另做，直接開始；結束畫面頂部一句）：「40 題、不計時、不影響排程；答對 32 題算通過。」
- 設定頁與今日頁不新增項目。

## 7. 測試（tests/e2e/test_stage_tests.py）

- 階段：四個 `stageItems` 互斥、聯集等於全部可練項目；p2 沒有單字；N4 單字只在 p3。
- 課程頁：pre 與 main 各渲染一次，「目前」chip 數量恰為 1、位置正確；第 0 週列在入門卡內、不在第一階段卡內；每張卡有「階段測驗」按鈕。
- 測驗：四個階段各組一次卷，40 題（或題庫上限）、沒有重複項目、每題都有 `options`；作答全部 40 題前後 `state.srs`、`state.mistakes`、`state.statsFmt` 的 JSON 完全相同；`dailyLogs` 今天只多一筆 x；`stageTests[id]` 多一筆、`passed` 與 32 題門檻一致；中途離開不寫 `stageTests`。
- 標記：對 p1 分別用三種等級，檢查目標 b／known、不降級（先把某字標熟練再標已學仍是熟練）、到期日落在對應區間且不集中、completedUnits 含 m1–m6、currentUnit 變 m7、stage main、introSeen 與 kanaKnown true；標到 p3 時 currentUnit 留 m18 且 `courseProgress().pct === 100`；沒通過紀錄時 `stage-mark` 不生效；復原後狀態與標記前相同。
- 既有測試照跑（`scripts/test.sh`，直接看 exit code）。

## 8. 分版

1.0.11 一版完成：§2–§6 一起上，CACHE `nq-v1.0.11`，changelog 一組。Pages 仍指 feat/pre-n5，使用者試過後連同 1.0.6–1.0.10 一起合回 main。
