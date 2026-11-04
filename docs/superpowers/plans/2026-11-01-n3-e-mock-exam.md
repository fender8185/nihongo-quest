# N3 ⑤ 模擬考（1.0.33 的第五段） — 實作計畫

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 模擬考可以選 N3。試卷結構、時間、計分照 N3 的官方規則，並加上 N3 的精選題 80–100 題。這是 1.0.33 的最後一段，做完整版一起推。

**Architecture:**
- `MONDAI` 改成每級一張表。每個大題帶「題型」：單字、文法、排序、文章、對話、情境、即時應答、概要。
  - 組卷、播放、AI 解析都看題型，不看編號。現在看編號的地方：`curatedUnits`、`startExam`、`validAiExam`。
  - N5／N4 的表內容不變，舊紀錄不用轉。
- `EXAM_PLAN.N3`：時間 30／70／40 分，及格 95，每科至少 19。
  - 每個大題的迷你／標準／完整題數。完整卷照 JLPT 官網的「問題の構成」，開工時對一次。
- `scoreExam` 依級別計分：
  - N3 三科各 60：言語知識（文字・語彙・文法）、読解、聴解。
  - `examHistory` 給 N3 加 `langScore60`、`readScore60` 兩個欄位。
  - `lrScore120` 照舊只代表 N5／N4 的「言語知識・読解」。
- 題目來源：
  - 漢字読み、表記、文の文法1、2：由 N3 單字和文法自動出（`derivedUnits` 照 `lv` 取）。
  - 其他大題寫精選題 `cm_n3_…`，約 80–100 題。長文和情報検索是一篇配多題（`qs`）。
  - 聽解可以用第四段的 N3 聽力題：概要理解取 `kind: 'gist'` 的題。

**Tech Stack:** index.html（模擬考：`MONDAI`、`EXAM_PLAN`、`curatedUnits`、`derivedUnits`、`startExam`、`scoreExam`、模擬考頁）；data.js `EXAM`；e2e 測試。

**Spec:** `docs/superpowers/specs/2026-10-31-n3-level-design.md` §7、§10（假 N3 資料測模擬考的組卷和計分）、§11 的 1.0.33 ⑤。

## Global Constraints

- N3 的大題：
  - 言語知識（文字・語彙）：問題1 漢字読み、2 表記、3 文脈規定、4 言い換え類義、5 用法。
  - 言語知識（文法）・読解：問題1 文の文法1、2 文の文法2、3 文章の文法、4 内容理解（短文）、5 内容理解（中文）、6 内容理解（長文）、7 情報検索。
  - 聴解：問題1 課題理解、2 ポイント理解、3 概要理解、4 発話表現、5 即時応答。
- 計分：
  - 三科各 0–60，總分 95 及格，每科至少 19。
  - 之後 N2、N1 也用三科制，只要填自己的數字。
- N5／N4 的組卷、計分、題目的 `m` 都不變（測試照舊通過）。
- 模擬考頁：
  - 級數選單有 N3，N3 有最高分卡。
  - 預設級數照目前單元的級別，不再看「是不是第 6 個單元以後」。
- 精選題全部自己寫，不抄考古題。用 N5–N3 的字，每個漢字都要有讀音。

## Review Focus

1. **N3 的大題編號跟 N4 撞號（S2-M6、S3-M3），組卷或播放用錯題型。** → 測試逐大題檢查題型。
2. **計分算錯：三科的分數、及格判斷（總分 95、每科 19）、舊的 N4 紀錄被當成 N3。** → 計分測試、紀錄測試。
3. **題庫不夠時，完整卷某個大題缺題，試卷卡住或總分算錯。** → 題數不足時的組卷測試。
4. **長文、情報検索一篇多題，作答和計分漏題。** → 測試。
5. **AI 出題（`validAiExam`）在 N3 用錯大題。** → 測試。

---

### Task 1: 每級一張大題表
- [ ] 寫失敗測試：
  - `MONDAI.N3` 的大題和題型照上表；N5／N4 的表和現在一樣。
  - 用假的 N3 試卷組卷，每個大題取到的是對的題型。
- [ ] 改 `MONDAI`、`curatedUnits`、`startExam`、`validAiExam`：看題型，不看編號。
- [ ] Commit。

### Task 2: N3 的試卷和計分
- [ ] 對 JLPT 官網的 N3「問題の構成」，寫 `EXAM_PLAN.N3`。
- [ ] 寫失敗測試：
  - N3 計分是三科各 60，總分 95 且每科 ≥ 19 才及格。
  - `examHistory` 的 N3 紀錄有三科分數。
  - N4 的計分和紀錄不變。
- [ ] 改 `scoreExam`、結果頁、紀錄、模擬考頁（級數選單、最高分卡、預設級數）。Commit。

### Task 3: 精選題（小隊）
- [ ] 指南、輸入檔，以及檢查方式（沿用 `check-listen-read.py` 和 `check-grammar.py` 的規則）。
- [ ] 寫失敗測試 `test_n3_mock_exam_has_enough_items`：
  - 完整卷每個大題都湊得到題數。
  - 精選題的 id 是 `cm_n3_…`，每個漢字都有讀音。
- [ ] 派小隊，合併、通過測試。Commit。

### Task 4: 全套測試、版本說明、審查
- [ ] `bash scripts/test.sh` → ALL_OK。
- [ ] 1.0.33 的版本說明寫完整。
- [ ] 一位新的審查者看這一段。
- [ ] 最後：合回 main、推上去，看線上版是 1.0.33。
