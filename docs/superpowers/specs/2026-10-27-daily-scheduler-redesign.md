# 今日練習排程重整 + 錯題快速循環 設計規格

日期：2026-10-27
狀態：待使用者審閱

## 1. 目標與範圍

### 目標
- 今日練習只有一個來源：**到期的複習 ＋ 今天的新題額度**。排程的唯一依據是 FSRS；補位、提前複習、錯題夾帶這些在 FSRS 之外另立標準的規則全部移除。
- 「做完就是做完」：到期與新題出完後，首頁顯示今天完成，按鈕變成明確標示內容的「加練」。
- 同一天內的重複只剩兩種刻意的「學習步驟」：答錯後幾題再問一次、新單字換個格式再考一次。兩者都不寫入排程；一個項目一天只有第一次作答決定排程。
- 錯題本從「另一套出題規則」變成「快速循環的字卡」：一兩分鐘過一輪，自評忘了／記得，直接回寫同一份 SRS。
- 新單字的主題輪替不再被大主題霸佔。

### 不在範圍
- 換掉 FSRS 參數或改間隔公式（`fsrsNext`、`fsrsDays` 不動；retention 設定不動）。
- 模擬考、AI 題目、字卡頁（`#/vocab` 的 FLASH）的出題規則。字卡頁只拿掉「額度外新卡」以外的東西都不變。
- 錯題本的資料結構與進出規則（`addMistake`、`onCorrectForMistake` 不變）。
- 同步、備份格式。`state.srs` 紀錄欄位不變，舊資料不需轉換。

### 成功標準
1. 一題今天答錯、幾題後再答對，當天再開一場不會再出現；它的到期日是明天（文法、單字、漢字、聽力、閱讀一律）。
2. 今日練習的每一題都能說出理由：「今天到期」或「今天的新題」。沒有第三種。
3. 到期與新題做完後，首頁標題是「今天完成了」，按鈕是「加練」且開頭說明內容；加練題目一樣不含今天答過的題。
4. 錯題本頁一鍵過一輪，每張卡兩個按鈕（忘了／記得）；一天內同一張卡只有第一次評分寫入 SRS。
5. 新單字的兩條主題線，任一條最多連續供應三天份就換下一個主題；未出完的主題排到後面。
6. 現有測試全過，新增的 e2e 測試涵蓋 1 到 5。

## 2. 現況摘要（實作者需知）

全部在 `index.html`。行號以 v62 為準。

| 函式 | 行 | 現況 |
|---|---|---|
| `srsAnswer` | 1333 | 單字答錯 `due = 今天`，其他明天；`fsrsNext` 在 elapsed = 0 時穩定度不變。 |
| `answerCurrent` | 3430 | 答錯後 3–5 題插入 `requeued` 複本；複本作答**仍呼叫 `srsAnswer`**（這就是「文法答錯明天再出」被蓋掉、當天再到期的原因）。 |
| `scheduleEncores` | 3186 | 新單字 8–11 題後插入 `encore`（不寫 SRS），保留。 |
| `dailyPlan` | 2955 | 算到期清單（**沒有** `r.last !== t` 過濾）、新題額度、正確率調整、複習多時縮新單字。 |
| `buildDailyQueue` | 3003 | 每軌 25% 保留、聽力 20%／漢字 15% 上限、`vocabShare` 分配、空位依序塞 `dailyMistakeItems`、`reinforcementItems`、額度外新題、`aheadItems`。 |
| `reinforcementItems` / `aheadItems` / `dailyMistakeItems` | 2898 / 2906 / 1482 | 三條補位規則，待移除（單元／單字／漢字練習也在用）。 |
| `buildUnitQueue` / `buildVocabQueue` / `buildKanjiQueue` | 3091 / 3102 / 6080 | 各自出「額度外新題最多 5」＋補位。 |
| `extraNote` / `renderToday` | 3071 / 3892 | 加練說明文字與首頁。首頁已有 `doneToday >= goal ? '今天的目標完成了'`。 |
| `renderMistakes` | 4787 | 錯題本清單（保留），上面加快速循環入口。 |
| `makeMistakeCard` | 2579 | 手動／舊版錯題的選擇題卡（快速循環不用它，改用翻卡）。 |
| FLASH 字卡 | 4423–4720 | 翻卡 UI、`flash-rate` 的評分流程（可照抄到錯題循環）。 |
| 設定頁 | 5751–5759 | `vocabShare`、`mistakesPerDay` 兩列待移除。 |
| `planAdvice` | 6170–6200 | 會算 `vocabShare` 建議值，需同步拿掉。 |
| `activeThemes` / `newVocabCandidates` | 2842 / 2849 | 兩主題交錯；主題內 id 順序。主題大小：生活 148、形容 101、時間 98、代名詞 4。 |

## 3. 規則總表（改版後，這是唯一的一份）

### 3.1 今天的工作（day list）
`dailyPlan()` 回傳今天**剩下**的工作，每一項屬於下列之一：

- **到期複習**：`r.due <= 今天` 且 `r.last !== 今天`，且在範圍內（文法：目前單元以前；單字／漢字：N5 或已開 N4；聽力：整個級別；閱讀：目前單元以前。範圍規則不變）。
- **新題**：各軌今天還沒用完的額度（`newVocabPerDay`、`newGrammarPerDay`、`newKanjiPerDay`、`listenPerDay`、閱讀 1），候選順序不變（文法照單元難度、單字照 3.4、漢字照 order、聽力鄰近單元優先）。

額度調整只剩兩條，照現況：
- 近期正確率：<60% 新題 ×0.5、<75% ×0.75、>92% ×1.25（`adaptiveFactor`）。
- 到期複習多時，新單字縮到最少一半額度；新文法照常（現有的 `room`/`wantV` 計算不變）。

每軌每天的上限：
- 聽力一天最多 `listenPerDay` 題：先到期、不足補新。到期超過的部分留到明天（到期日不動）。
- 閱讀一天 1 題：有到期出到期，否則新。
- 單字、文法、漢字：到期全出（沒有上限，FSRS 的到期就是到期），新題照額度。

**不再存在**：`reinforcementItems`、`aheadItems`、`dailyMistakeItems`、每軌 25% 保留、聽力 20%／漢字 15% 上限、`vocabShare` 分配。這些函式與設定一併刪除（`normalizeState` 容忍舊 state 裡殘留的 `mistakesPerDay`、`vocabShare` 欄位即可，不需遷移）。

### 3.2 一場（session）
`dailyQueue(size)` 從 day list 取最多 `sessionSize` 題：

1. 到期複習排序：先逾期久的（`due` 早的在前），同日者文法以答對次數少的優先（現有 `byPractice`）、單字以等級低的優先。
2. 新題平均散佈在整個 day list 裡（day list 有 N 題、新題 M 題，則每隔 N/M 題放一題新題），所以第一場就有新題，最後一場也有。
3. 取前 `size` 題後，依 `settings.order`（混合／分開）做現有的 `interleave`；聽力照現況平均插入、閱讀最後。
4. 首頁按鈕「開始練習・N 題」，N = min(sessionSize, day list 長度)。

### 3.3 同一場內的學習步驟（不寫排程）
- **再練一次**：答錯後 3–5 題插入同一題的複本（現況）。複本作答**不呼叫** `srsAnswer`、不 `recordFormat`、不 `recordAccuracy`、不 `addMistake`；只 `recordAction`（計入今天做了幾題）並顯示「再練一次」標籤。複本再錯不再插入。
- **換個方式再考**：新單字第一次作答後 8–11 題插入另一格式（現況，不寫 SRS）。不變。
- `srsAnswer` 答錯一律 `due = 明天`（移除單字當天再到期的特例）。同一天再開一場時它不在 day list（`r.last === 今天`）。

### 3.4 新單字的主題輪替
現況：兩條線，各一個主題，主題在 `THEME_ORDER` 裡的順序固定，主題出完才換。新增一條：

- 一條線上的主題最多連續供應 **3 × newVocabPerDay** 個字（預設 24，約三天）。達到後這個主題移到待出主題的最後，線上換成下一個還有未出字的主題。
- 狀態記在 `state.themeLane = { order: [主題…], count: { [主題]: 已供應的字數 } }`。`order` 第一次使用時從 `THEME_ORDER` 複製；線上的主題是 `order` 裡最前面兩個還有未出字（以 `state.srs` 判斷）的主題。主題達到上限時：`count` 歸零、該主題移到 `order` 最後。沒有未出字的主題直接跳過，不佔線。
- 兩條線永遠是不同主題；只剩一個主題有未出字時單線。
- 單字頁「主題練習」直接選主題時不受此限（現況）。

### 3.5 加練（做完之後）
day list 為空時：
- 首頁標題「今天完成了」，列今天做了幾題、答對率。
- 按鈕「加練・N 題」。內容依序：明後天到期且今天沒答過的複習（`due` 早的在前）、額度外新題（文法、單字各半，額度為 0 的軌不開，最多半場）。開頭說明文字沿用 `extraNote` 的寫法（「這組是 a 題提前複習（明後天到期）與 b 題額外的新內容」）。
- 加練的作答正常寫 SRS（提前複習是 FSRS 允許的：elapsed 較短、穩定度成長較少）。
- 沒有東西可加練時按鈕消失，顯示「明天再來」。

### 3.6 單元／單字／漢字練習（學習者自己點的）
各自的 queue 改成：
1. 該範圍內今天到期且今天沒答過的（全部）。
2. 該範圍內今天還剩的新題額度（不再有「額度外最多 5」）。
3. 以上不足 5 題時，補該範圍內**今天沒答過**的項目，最不穩的優先（等級低、連對少），並在練習開頭標示「這是加練：這個單元今天沒有到期的題目」。這是學習者主動要練，允許。
`reinforcementItems`、`aheadItems` 從這三個函式移除。字卡頁的「再學 5 個」按鈕（學習者主動按）保留。

### 3.7 錯題本快速循環
- 錯題本頁（`#/mistakes`）清單上方加入卡片：「快速過一輪・N 張」（N = 待複習的錯題數，最多 30 張一輪；超過的下一輪再來）。進入 `#/mistakes/loop`。
- 排序：錯最多次、最久沒練的優先（`mistakePriority`）。
- 卡片正面／背面：
  - 課程單字（`m.key` 以 `v:` 開頭）：正面單字（含振假名，依設定）；背面意思、例句、`vocabWhy`。
  - 課程文法／漢字：正面錯題的題幹（`m.prompt`，有空格就顯示空格）；背面正確答案、`m.why`、所屬文法點。
  - 手動／舊版錯題：正面 `m.prompt`，背面 `m.answer`、`m.why`。
- 操作：看答案 → 「忘了」／「記得」兩個按鈕（鍵盤 Space 翻面、1／2 評分，仿 FLASH）。自己的筆記（`m.note`）在背面可看。
- 評分寫入：
  - 課程項目且 `r.last !== 今天`：記得 → `srsAnswer(key, true, {grade:'good'})`；忘了 → `srsAnswer(key, false, {grade:'again'})`。之後照 `flash-rate`：`recordAction`、`recordAccuracy`、忘了 `addMistake(...,'錯題循環：忘記')`、記得 `onCorrectForMistake`。
  - 課程項目但今天已答過：不寫 SRS、不計正確率，只更新 `m.last`，忘了則 `m.count+1`、`m.streak=0`。
  - 手動／舊版：記得 → `onCorrectForMistake`；忘了 → `m.count+1`、`m.streak=0`、`m.okDays=[]`。
- 一輪內忘了的卡排到該輪最後再出一次（只一次，第二次不評分、純看）。
- 一輪結束顯示：記得 x／忘了 y、今天移出錯題本幾題，按鈕「再一輪」（忘了的優先）與「回錯題本」。
- 狀態 `MLOOP = { queue: [mistakeId], idx, flipped, again: [], seen: Set, date }` 放記憶體，離開頁面即丟，同 FLASH。

## 4. 資料與設定
- `state.settings`：移除 `mistakesPerDay`、`vocabShare`（設定頁、`planAdvice`、EXPERIENCED_SETTINGS 不再提）。`normalizeState` 不報錯。
- `state.themeLane`：新增，`normalizeState` 預設 `{}`。
- `state.srs`、`state.mistakes`、`state.today`、`dailyLogs` 格式不變。
- `APP_VERSION '63'`、`sw.js CACHE 'nq-v63'`、CHANGELOG 一則，日期 2026-10-27。

## 5. 文案（繁體中文）
- 首頁完成態：「今天完成了」「今天做了 N 題，答對 P%」「加練・N 題」「明天再來，或到課程頁預習下一單元。」
- 加練開頭：「今天的進度已完成，這組是 a 題提前複習（明後天到期）與 b 題額外的新內容；今天答過的題目不再出現。」
- 單元／單字／漢字加練：「這個範圍今天沒有到期的題目，這組是加練，挑最不穩的先練。」
- 錯題循環：「快速過一輪」「看答案」「忘了」「記得」「這一輪：記得 x・忘了 y」「再一輪」。
- 設定頁刪除兩列後，「每組練習題數」的說明改為「按「開始練習」時一次出幾題；當天到期與新題會分成幾組出完。」

## 6. 測試（`tests/e2e/test_fixes.py` 新增，Python CDP）
1. `test_miss_then_requeue_does_not_return_today`：答錯 → 再練一次答對 → `state.srs[key].due === 明天`、`n === 1`、`dailyQueue()` 不含它。文法與單字各一。
2. `test_daily_queue_has_only_due_or_new`：造 20 筆各種狀態的 srs（到期、未到期低等級、明天到期、今天答過），`dailyQueue().items` 每題皆 `!srs || due <= t`，且 `last !== t`。
3. `test_done_state_and_extra_session`：把到期與新題全答完 → 首頁有「今天完成了」與「加練」；加練 queue 的題只有「明後天到期」或「新題」，皆 `last !== t`；全部題目無可加練時按鈕消失。
4. `test_listen_cap_per_day`：10 題聽力到期、`listenPerDay = 3` → day list 聽力恰 3 題，其餘 `due` 不變。
5. `test_theme_lane_rotates`：`newVocabPerDay = 8`，讓「生活」排到線上，模擬出 24 個字 → 線上換下一個主題，`state.themeLane['生活'] === 0`，「生活」在其他主題輪過後回來。
6. `test_mistake_loop_grades_once_per_day`：錯題循環對同一張卡評「記得」兩次 → `srs.n` 只加 1；對今天已答過的項目評分 → `srs` 不變、`m.last` 更新。
7. 既有測試中依賴 `mistakesPerDay`、`reinforcementItems`、`aheadItems`、`vocabShare` 的斷言改寫或刪除（`test_fixes.py` 的 v59／v61 測試）。

## 7. 發佈
- 分支 `daily-rules`，`scripts/pages-branch.sh` 指到該分支讓使用者試用；核准後合回 main 並切回。
- `scripts/test.sh` 直接看 exit code。
