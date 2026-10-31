# N3 ① 程式一般化、同形異讀（1.0.33 的第一段） — 實作計畫

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 程式不再假設只有 N5、N4 兩級。等級清單從資料推出，N3 的資料一放進來，每個地方就認得它。同寫法、不同讀音的字可以放進 app。缺口檔剩下的 16 個字也一起放進來。這一段不推上去，跟 N3 內容一起在 1.0.33 推。

**Architecture:**
- 等級清單 `LEVELS` 由資料推出：入門加上 `DATA.VOCAB`／`DATA.UNITS` 裡有的等級，照 N5→N1 的順序；`COURSE_LEVELS` 是去掉入門的那幾級。
- 寫死 N5／N4 的地方（spec §2.2 的表，加上 1.0.32 審查的延後小問題）都改成讀這兩份清單。
- 守門測試掃 index.html：比較等級的字面值只能出現在清單本身和標了 `level-literal-ok` 的行。
- 用一小份假 N3 資料，在測試裡注入後重建 REG，測各頁面。
- 同形異讀：檢查器和合併腳本以寫法＋讀音認字；出題、振假名、音檔照卡片自己的讀音。

**Tech Stack:** index.html（原生 JS）；`scripts/check-*.py`；e2e `tests/e2e/*.py`；`scripts/curriculum/*.js`。

**Spec:** `docs/superpowers/specs/2026-10-31-n3-level-design.md` §2.2、§4.1、§4.4、§4.5、§5.5、§6、§10（一般化那一版）。延後的小問題：1.0.31、1.0.32 的 ledger 和記憶檔 release-1-0-31／release-1-0-32。

## Global Constraints

- 分支 `feat/1.0.33-n3`。這一段結束時不改版本號，也不推。
- `LEVELS`：`['PRE_N5', 'N5', 'N4', 'N3', 'N2', 'N1']` 裡，留下入門和資料裡有的等級。`lvLabel` 照舊（入門、N5…）。
- 讀音優先序（§4.5）：內建字依等級，越低越優先：入門＋N5 4、`FURI` 3、N4 2、N3 1.8……，之後是 `FURI_EXTRA` 1.5、自訂字卡 1。
  - 修正 止まる 的活用被讀成 止(や)ま…：N5 的 止む 佔了 止ま 這個鍵。修法是讓較長、送り仮名對得上的鍵（止まり、止まっ、止まら）勝出。
- 同形異讀（§5.5）：
  - `check-vocab.py` 的「已經在題庫」改成寫法＋讀音都一樣才算。
  - 讀音比對（reading-mismatch）先把候選字放進讀音索引再比，避免 1.0.31 的 別れる 那種誤報。
  - 例句裡標記的字照卡片自己的讀音標振假名；字卡和題目的語音，同寫法另有別的讀音時念讀音，不念寫法。
  - 問讀音的題目，錯誤選項不能是同寫法另一張卡的讀音；問意思的題目（含聽音選意思），錯誤選項不能是同讀音的字的意思（1.0.31 延後的小問題）。
- 缺口檔裡 16 個同寫法的字（N5 13、N4 3）：例句照 1.0.31 的指南，id 是 `n5g-039…`、`n4g-061…`，振假名比對照舊。
- 延後的小問題一起做：
  - `deckAllowsN4` 改成 `deck !== 'all'`。
  - `coursePace` 的剩餘題數改用 `levelLeft`。
  - 1.0.32 那兩個驗不出錯的測試改寫，heavy5 的訊息放回 assert。
  - 舊註解、沒用到的 `n5Left`／`plan.n4Open`／`vocabEligibleMain` 內建分支清掉。
  - 程度選擇的說明加一句「N4 起點要等 N5 的單字、漢字都學過（可以考第一階段測驗）」。
  - `furi-snapshot.py` 改成比所有含漢字的字串，鍵用 id。
- 大綱工具：`preOutline` 也把 N3 以上的漢字（`lv` N3…）和 m19 以後的單元當成大綱的東西，N3 合併後 `check-outline` 仍是 0 problems。
- commit 結尾兩行同前一版。

## Review Focus

1. **漏掉一處二分法**：N3 字被當成 N5 字，而且不會報錯。→ Task 1 的守門測試，加上 Task 2 的假 N3 資料測試。
2. **同寫法的兩張卡**：問讀音的題目出現兩個對的答案；振假名或語音念成另一個讀音。→ Task 3 的測試。
3. **讀音優先序改了以後，舊句子的振假名變了**。→ Task 3 結束時跑 `furi-snapshot` 比對：只能有預期中的改正，例如 止まる。
4. **舊帳號的設定**：考試目標 N4、統計範圍 n4、牌組 N4 在一般化後都要照舊。→ Task 2 的測試。
5. **16 個字合併後，大綱檢查和整套測試**。→ Task 4。

---

### Task 1: 等級清單和守門測試

**Files:** index.html（`LEVELS`、`COURSE_LEVELS`、所有比較等級的地方）；Test: `tests/e2e/test_pre_n5.py`（取代現在只查 `.lv === 'N5'` 的那個守門檢查）

- [ ] **Step 1: 寫失敗測試** `test_no_level_literals_outside_the_level_list`：用 Python 讀 index.html，去掉 CHANGELOG 區塊和註解行。出現 `=== 'N4'`、`!== 'N4'`、`'N5', 'N4'`、`/N4/` 這類比較或列舉等級的地方，只准在 `const LEVELS`／`COURSE_LEVELS` 那兩行，或標了 `level-literal-ok` 的行。Expected: FAIL，並列出目前的行號。
- [ ] **Step 2: 一個一個改**：`examLevel` 的檢查、`STAGES` 的 lv（PHASES 的階段照它的單元推等級）、`listenReachable`、`makeGrammarQuestion` 的變化形範圍（依等級的表）、DECKS／THEME_ORDER／單字頁分頁／漢字格、`STATS_SCOPES`、儀表刻度、`coursePace`（每一級一個學完日期，用 `levelLeft`）、`examLevel` 選單、AI 提示、`legacy` 匯入的等級（`LEVELS` 裡有的才收）、讀音優先序。資料本身的字面值（例如 `['ba', '條件形（ば）', 'N4']` 這種表）標 `level-literal-ok`。
- [ ] **Step 3: 跑 Step 1 的測試**，Expected: PASS；全套 e2e 也通過（行為不變）。
- [ ] **Step 4: Commit** — `refactor: 等級從資料推出（LEVELS、COURSE_LEVELS），寫死 N5／N4 的地方都改讀等級清單；守門測試`

### Task 2: 假 N3 資料測試

**Files:** Test: 新檔 `tests/e2e/test_levels_n3.py`（PORT 8803，跟其他檔一樣的寫法），加進 `scripts/test.sh` 的 e2e 清單

- [ ] **Step 1: 寫測試**。注入假的 N3 資料：
  - 3 個 N3 字、2 個 N3 漢字。
  - 一個 N3 單元 m19，含 2 題文法，`PHASES` 多一個階段。
  - `THEMES.N3` 一個主題。
  - 注入之後重建 REG。
  
  要驗的事：
  - `LEVELS` 有 N3。
  - 單字頁有 N3 分頁，字卡牌組有 N3。
  - 學習分析有 N3 範圍。
  - 考試目標可以選 N3。
  - N4 都學完時 `curLevel()` 是 N3，新題只出 N3。
  - N3 字的振假名優先序低於 N4。
  - `coursePace` 有 N3 的日期。
  - 舊帳號的 `examLevel: 'N4'`、統計範圍 n4 照舊。
- [ ] **Step 2: 跑測試**。Task 1 漏改的地方會在這裡失敗，修到通過。
- [ ] **Step 3: Commit** — `test: 假 N3 資料測各頁面認得新的等級`

### Task 3: 同形異讀、讀音優先序、延後的小問題

**Files:** index.html（`buildFuriganaIndex`、例句標記的振假名、語音、`meaningOptions`／讀音題的選項）；`scripts/check-vocab.py`；`scripts/furi-snapshot.py`；`scripts/curriculum/build-candidates.js`（`preOutline`）；Test: `tests/e2e/test_content.py`、`tests/e2e/test_vocab.py`、`tests/curriculum.test.js`

- [ ] **Step 1: 寫失敗測試**：
  - 注入一張跟既有字同寫法、不同讀音的卡（例如 `四`／`し`），驗：
    - 讀音題的錯誤選項沒有 よん。
    - 例句標記的振假名是 し。
    - 語音念 し。
  - `test_listen_meaning_has_no_same_reading_wrong_answer`：締める 的聽音選意思不會出 閉める 的意思。
  - `test_tomaru_forms_read_tomaru`：「止まりました」的振假名是 と。
  - `preOutline` 把 N3 漢字和 m19 以後的單元當成大綱的東西（`tests/curriculum.test.js`）。
- [ ] **Step 2: 跑測試確認失敗**。
- [ ] **Step 3: 實作**，再做 Global Constraints 列的延後小問題。
- [ ] **Step 4: 跑 furi-snapshot 比對**（先在 Task 1 開工前存一份「之前」的快照）。Expected：只有 止まる 一類的改正；其他的改變要看過、寫進 commit 訊息。
- [ ] **Step 5: 全套測試**，Commit — `feat: 同寫法不同讀音的字可以放進 app（檢查器、題目選項、振假名、語音照卡片的讀音）；止まる 的活用讀音修正；延後的小問題`

### Task 4: 缺口檔剩下的 16 個字

**Files:** data.js（`DATA_VERSION 18`，index.html、sw.js 的 `data.js?v=18`）；Test: `tests/e2e/test_content.py`

- [ ] **Step 1: 寫失敗測試** `test_bank_has_the_16_same_spelling_gap_words`：
  - `n5g-039…051`（13 個）和 `n4g-061…063`（3 個）都在。
  - 每個都有兩句例句。
  - 跟同寫法的字讀音不同。
- [ ] **Step 2: 寫例句**：一個小隊，照 1.0.31 的指南，加上「例句要讓這個讀音是唯一合理的念法」。過 `check-vocab.py`，要 0 BAD。
- [ ] **Step 3: 合併，跑振假名比對**：舊句子不能被這 16 個字改掉讀音。例如 何（なん） 不能把舊句子裡的 何（なに） 改掉，這種字要確認讀音優先序比原本那個字低。
- [ ] **Step 4: 測試通過、大綱檢查 0 problems、全套測試**；Commit — `content: 缺口檔剩下 16 個同寫法的字（四 し、七 しち、私 わたくし、日本 にほん／にっぽん…），DATA_VERSION 18`
