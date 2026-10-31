# N3 ④ 聽力和閱讀（1.0.33 的第四段） — 實作計畫

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** N3 的聽力題約 200 題、閱讀題約 90 題，每題掛在一個 N3 單元（m19–m33），合併進 data.js。1.0.33 一起推，這一段不推。

**Architecture:**
- 先改工具：`check-listen-read.py` 照題目的級別檢查用字。
  - 不准用比本級高的字：N5 的題不准用 N4、N3 的字；N4 的題不准用 N3 的字；N3 的題可以用 N3 以下的字。
  - N3 的題，用到比本級高的字算 problem。
- 5 個小隊，每隊 3 個單元，每個單元：
  - 聽力約 13 題：對話 6、即時應答 3、情境 2、概要理解 2。
  - 閱讀約 6 題。
- 全部回來後一次合併：聽力 id `l3-001…`，閱讀接著 `rd-412…`。

**Tech Stack:** data.js（第 3 行 JSON）；`scripts/check-listen-read.py`（無頭 Chrome）；Python 合併腳本（scratchpad）；e2e `tests/e2e/test_content.py`。

**Spec:** `docs/superpowers/specs/2026-10-31-n3-level-design.md` §5.1（聽力 150–250、閱讀 80–120，文章比 N4 長 2–3 倍）、§5.3（編號）、§5.4（檢查器：不准用比本級高的字）、§7（N3 聽解多「概要理解」）。

## Global Constraints

- 聽力題的格式跟現有的一樣：
  - `t: 'dialog'`：`script`、`q`、4 個 `op`。
  - `t: 'resp'`：`line`、3 個 `op`。
  - `t: 'scene'`：`scene`（中文情境）、3 個 `op`。
  - 欄位還有 `lv: 'N3'`、`u`、`a`、`zh`、`why`。
- 概要理解：`t: 'dialog'` 加 `kind: 'gist'`。
  - 一個人說一段話（獨白或廣播），問「主要在說什麼／說話的人的想法」。
  - 不另開題型，播放器照對話題處理；第五段的模擬考「問題3 概要理解」從這裡取題。
- 閱讀題的格式跟現有的一樣：`kind passage q op a zh why`，4 個選項。
  - N3 的文章 350–600 字（N4 平均 195 字）。
  - `kind` 用現有的值（essay、article、email、notice、memo…），再加：
    - `long`：長文，550 字以上。
    - `info`：情報檢索，表格或公告，問「符合條件的是哪一個」。
- 每題掛一個單元，題目要用到那個單元的文法點至少一個。
- 每個漢字都要有讀音；不准用 N2 以上的字。
- id：聽力 `l3-001` 起，閱讀接著現有的（目前最後是 `rd-411`）。合併時編號，小隊不寫 id。

## Review Focus

1. **聽力題的選項有兩個都對，或沒聽也答得出來。** → 指南、抽查。
2. **概要理解的題目其實只問細節，不是要點。** → 指南、抽查。
3. **閱讀文章太短（還是 N4 長度）或用到 N2 的字。** → 合併腳本查字數，檢查器查字。
4. **N5／N4 的題目被新的級別規則誤判。** → 檢查器的測試：拿一題現有的 N4 題跑，結果不變。
5. **聽力的朗讀（TTS）唸錯同形異讀的字。** → 抽查；用括號讀音。

---

### Task 1: 工具
- [ ] 寫失敗測試：`check-listen-read.py` 的級別規則。
  - N3 的題用 N3 的字不報；N4 的題用 N3 的字要報。
  - `kind: 'gist'` 的題要是對話題。
  - 現有的 N4 題重跑，結果不變。
- [ ] 改 `check-listen-read.py`：照 `courseLevels()` 的順序判斷「比本級高的字」；N3 以上用到更高級的字算 problem（N5／N4 照舊是 warning）。
- [ ] 寫指南和每隊的輸入檔（單元、文法點、題數）。Commit。

### Task 2: 題目（5 個小隊）
- [ ] 寫失敗測試 `test_n3_listening_and_reading_items`：
  - 聽力 ≥ 150、閱讀 ≥ 80，`lv: 'N3'`，單元都是 m19–m33。
  - 每個單元至少 8 題聽力、4 題閱讀；概要理解 ≥ 20 題。
  - 閱讀文章平均 ≥ 350 字。
  - 每個漢字都有讀音；id 不重複。
- [ ] 派小隊，全部 0 problems。
- [ ] 合併、跑振假名比對（舊句子不變）、通過測試。Commit。

### Task 3: 全套測試和審查
- [ ] `bash scripts/test.sh` → ALL_OK。
- [ ] 一位新的審查者看這一段（Review Focus 逐條）。
