# N3 ② 單字和漢字（1.0.33 的第二段） — 實作計畫

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把課程大綱 `curriculum/n3.json` 的 1,432 個字和 295 個漢字做成內建資料（N3 的主題、單字、例句、漢字），合併進 data.js。1.0.33 一起推，這一段不推。

**Architecture:**
- 先準備工具：
  - `THEMES.N3`。
  - `check-vocab.py --with FILE`：先把一份候選字表放進讀音索引再檢查，例句就能用同一批還沒合併的 N3 字。
  - 給小隊的「已知單字」對照表（N5、N4、N3 的字和讀音）。
- 單字分成約 15 個小隊，每隊約 95 個字，照主題分。每次並行 5 個，每隊檢查到 0 BAD。全部回來後一次合併：id `n3a-001…`，照 n3.json 的主題順序。
- 漢字由 3 個小隊寫（每隊約 100 個，照大綱的漢字順序）。例字優先用 N3 單字，沒有才用 N5／N4 的字。
- 合併後跑 furi-snapshot 比對：舊句子不能被 N3 字改掉讀音。N3 的優先序是 1.9，原則上只會補上原本沒有的讀音。

**Tech Stack:** data.js（第 3 行 JSON）；`scripts/check-vocab.py`（無頭 Chrome）；Python 合併腳本（scratchpad）；e2e `tests/e2e/test_content.py`。

**Spec:** `docs/superpowers/specs/2026-10-31-n3-level-design.md` §5.1–§5.4、§11 的 1.0.33 ②；課程大綱 `curriculum/n3.json`、`curriculum/GUIDE.md`。

## Global Constraints

- 單字欄位：`w r m c lv` 照 n3.json（`lv: 'N3'`、`c` 是主題名）；小隊補 `p ex exZh ex2 exZh2`。
- 例句規則照 1.0.31 的指南：一個標記、以「。」結尾、每個漢字都要有讀音、兩句不同。另外：
  - 可以用 N5、N4、N3 的字和文法，不用 N2 以上的。
  - 方向的「ほう」寫假名（1.0.31 審查：方 現在讀 かた）。
  - 同形異讀的 N3 字，例句要讓這個讀音是唯一自然的念法。
- id：`n3a-001` 起照 n3.json 主題順序、主題內字的順序編號。
- 漢字欄位跟現有的一樣：`k lv m on kun ex look`。
  - `ex` 2–3 個例字 `[寫法, 讀音, 中文]`，優先用 N3 單字。
  - `look` 列 1–2 個長得像的漢字。
  - 順序照 n3.json 的 `kanji`。
- `THEMES.N3`：n3.json 的 20 個主題（c、desc）。
- 合併後：
  - `node scripts/curriculum/check-outline.js` 仍是 0 problems（`preOutline` 把 n3a 字、N3 漢字當成大綱的東西）。
  - 每個 N3 字的主題都在 `THEMES.N3` 裡。
  - 振假名比對除了補上原本沒有的讀音，舊句子不變。
- DATA_VERSION 照順序加（16 個同形異讀字之後是 18，這一段 19）。

## Review Focus

1. **N3 字加進讀音索引後，舊句子的讀音被改掉。** → 合併後的 furi-snapshot 比對，每一處都要看過。
2. **例句用了 N2 以上的字或文法，N3 學習者看不懂。** → 指南、加上抽查。
3. **同一個字被兩個小隊寫到，或寫法、讀音跟大綱不一樣。** → 合併腳本逐字比對 n3.json。
4. **漢字的讀音或例字錯了。** → 例字要是 app 裡有的字，讀音跟那個字一致（合併腳本檢查）。
5. **主題太大，單字頁的主題卡或輪替出問題。** → 現有的主題測試跑 N3（Task 4）。

---

### Task 1: 工具和指南
- [ ] `check-vocab.py --with FILE`：先把 FILE 裡的 `w r p` 放進讀音索引（跟合併後一樣），再檢查。測試：一個例句用了另一個還沒合併的 N3 字，不加 `--with` 是 BAD，加了就沒有。
- [ ] data.js 加 `THEMES.N3`。`check-vocab.py` 就會接受 `lv: 'N3'` 和這些主題。
- [ ] 寫「已知單字」表和 N3 指南（scratchpad）。Commit。

### Task 2: 單字（約 15 個小隊）
- [ ] 寫失敗測試 `test_bank_has_the_n3_words`：
  - n3a 的字數等於 n3.json 的字數。
  - 每個字都有兩句例句。
  - 主題都在 `THEMES.N3`。
  - 寫法＋讀音沒有重複。
- [ ] 派小隊，每次 5 個，全部 0 BAD。
- [ ] 合併、跑振假名比對、通過測試。Commit。

### Task 3: 漢字（3 個小隊）
- [ ] 寫失敗測試 `test_kanji_table_has_the_n3_kanji`：
  - N3 漢字的數量和順序等於 n3.json。
  - 每個都有 `m on/kun ex`。
  - 例字都是 app 裡的字，讀音一致。
- [ ] 派小隊、合併、通過測試。Commit。

### Task 4: 全套測試
- [ ] `bash scripts/test.sh` → ALL_OK。
- [ ] `check-outline` 0 problems。
- [ ] 抽查：單字頁 N3 分頁、主題卡、字卡。
