# 課程大綱 N3–N1 — 實作計畫

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 做出 N3、N2、N1 的課程大綱：每一級的單字（分主題、附中文意思）、漢字（教學順序）、文法點（分單元與階段），扣掉 app 已經有的和更低一級已經有的；另外列出 N5／N4 還缺的字；最後做成網頁給使用者審。

**Architecture:**
- 來源先抓下來固定版本，放進 `curriculum/sources/`。
- 程式部分只做機械的事，都在 `scripts/curriculum/`：
  - `match.js`：比對單字、正規化文法點。
  - `build-candidates.js`：產出候選清單和報表。
  - `check-outline.js`：檢查整理好的大綱。
  - `render-review.js`：產生審查網頁。
- 判斷的事由內容小隊照指南做：分主題、寫中文意思、篩掉過時的字、分單元。
- 每一級的大綱是 `curriculum/n3.json`、`n2.json`、`n1.json`，N5／N4 缺口是 `curriculum/gaps-n5n4.json`。
- app 本身（index.html、data.js、sw.js）完全不動。

**Tech Stack:** Node（`node:test`、`node:assert/strict`，跟 `tests/sync-core.test.js` 一樣）；curl；Artifact（審查網頁）。

**Spec:** `docs/superpowers/specs/2026-10-31-curriculum-n3-n1-design.md`（相關：`docs/superpowers/specs/2026-10-31-n3-level-design.md`）

## Global Constraints

**分支與提交**
- 分支 `feat/curriculum-outline`，從 main f133c83 開。
- 第一個 commit 放兩份 spec 和這份計畫，訊息：`docs: N3 等級擴充、課程大綱 N3–N1 設計與大綱實作計畫`。
- 課程大綱 spec 的狀態行改成「使用者已確認（2026-10-31：「好，那就先大綱」，§8 照建議）」。
- commit 訊息照 repo 慣例：中文，前綴用 `feat:`、`data:`、`docs:`，結尾加 Co-Authored-By 和 Claude-Session 兩行。
- 不改 index.html、data.js、sw.js、sync-core.js，所以不用換版本號。

**來源（固定版本，spec §2）**
- Waller 單字、漢字：`https://raw.githubusercontent.com/Bluskyo/JLPT_Vocabulary/4358f932937ad0232194a36e9f4f875094910c6b/data/vocab/parsedData/n{L}_vocab_cleaned.csv` 和 `…/data/kanji/parsedData/n{L}_kanji.csv`，L = 1–5。
- Waller 文法點：Wayback 原始頁（網址裡帶 `id_`），從頁面上 `class="nounderline"`、href 含 `skills/grammar/sentences/?grammarid=` 的連結取編號和文字。
  - N3：`http://web.archive.org/web/20200814013355id_/http://www.tanos.co.uk:80/jlpt/jlpt3/grammar/`
  - N2：`http://web.archive.org/web/20200725191822id_/http://www.tanos.co.uk:80/jlpt/jlpt2/grammar/`
  - N1：`http://web.archive.org/web/20200729091405id_/http://www.tanos.co.uk:80/jlpt/jlpt1/grammar/`
- OpenJLPT 文法點：`https://raw.githubusercontent.com/evanclan/OpenJLPT/0d1d3410bec90bd4098a7c72de820543cb4f707c/data/json/grammar/n{3,2,1}.json`。
  - 只留 `id`、`pattern`、`level`。
  - meaning、formation、examples、notes 是 CC BY-SA 的創作內容，不存、不抄。
- JMdict／KANJIDIC2 這次不用：讀音用 Waller 的，漢字順序照本級的字怎麼用來排（Task 4 的 `kanjiOrder`）。等做內容時再拿它們檢查讀音。
- spec §5 寫的 `scripts/build-curriculum.js`，拆成 `scripts/curriculum/` 底下幾個檔，一個檔做一件事。
- 授權標示（寫在 `curriculum/sources/SOURCES.md`）：`JLPT 單字、漢字、文法點的等級：Jonathan Waller 的 JLPT Resources（tanos.co.uk），CC BY。文法點對照：OpenJLPT（evanclan/OpenJLPT），CC BY-SA 4.0，只取句型名稱與等級。`

**資料規則（spec §3、§4）**
- app 現有的字和漢字不搬等級；app 的資料在這份計畫裡只讀不寫。
- 一個字、漢字、文法點只屬於一級；同時出現在兩級的算低的那一級。
- 主題：每一級 15–20 個，每個主題至少 20 個字；名稱和 `desc` 的風格跟 `DATA.THEMES` 一樣（例如「工作與職場」）。
- 單字的中文意思 `m`：台灣用語，12 字以內，跟 `DATA.VOCAB[].m` 同一種寫法。
- 單元：每個單元 6–10 個文法點，同一種功能的放一起。
  - 編號從 m19 起，N3 → N2 → N1 連號。
  - 每一級 2 個階段，N1 可以 3 個。
  - 文法點的中文意思 `m` 在 20 字以內。
- 篩掉的字、移到別級的文法點都要寫原因 `why`，用中文寫。
- 所有中文都用繁體（台灣）。

**大綱檔的格式**（Task 4 的檢查器照這個檢查，Task 5–8 照這個寫）

```json
{
  "level": "N3",
  "themes": [{ "c": "工作與職場", "desc": "一句說明", "words": [["残業", "ざんぎょう", "加班"]] }],
  "added": [{ "w": "看護師", "r": "かんごし", "m": "護理師", "c": "身體與醫療", "why": "取代過時的看護婦" }],
  "dropped": [{ "w": "看護婦", "r": "かんごふ", "why": "過時，改用看護師" }],
  "kanji": ["政", "議"],
  "phases": [{ "title": "第四階段：N3 文法", "units": ["m19", "m20"] }],
  "units": [{ "id": "m19", "short": "推測與傳聞", "title": "推測與傳聞：らしい・みたい・っぽい",
              "points": [{ "p": "〜らしい", "m": "好像；聽說", "keys": ["らしい"], "src": ["waller", "openjlpt"] }] }],
  "covered": [{ "p": "〜ようになる", "keys": ["ようになる"], "by": "m12", "why": "app 的 N4 已經教了" }],
  "moved": [{ "p": "〜にかけて", "keys": ["にかけて"], "to": "N2", "why": "兩個來源都放 N2" }]
}
```

- `added` 的字也要放進某個主題的 `words`，`c` 寫它的主題。
- `curriculum/gaps-n5n4.json` 的格式是 `{ "N5": { "words": [{ "w", "r", "m", "c" }], "dropped": [{ "w", "r", "why" }] }, "N4": { … } }`，其中 `c` 必須是 `DATA.THEMES` 裡同一級的主題。

## Review Focus

1. 寫法跟 app 的字一樣、讀音不同（上手：じょうず／うわて）：要列成待確認，不能直接算成 app 已有。測試在 Task 2。
2. Waller 欄位裡的標記：可省略的前綴（お・金持ち）、括號裡的送り仮名（あたたか(い)）、開頭的「御」（御飯／ご飯）。這些都要比得到 app 的字；但不能把 おいでになる 弄成 いでになる。測試在 Task 2。
3. Waller 清單裡同一個字出現兩次（キロ、キログラム 各有好幾列），或同時在兩級：每個字只算一次，算在低的那一級。測試在 Task 3。
4. app 漢字表裡、但 Waller 放在 N3–N1 的漢字（N3 有 72 個）：永遠不是新漢字。測試在 Task 3。
5. 兩個來源的文法點寫法不同（～／〜、`すぎない（過ぎない）` 括號註記）：正規化後要對得上；對不上的分開列，不偷偷合併。測試在 Task 3。

---

### Task 1: 來源快照

**Files:**
- Create: `scripts/curriculum/fetch-sources.sh`（照上面的固定網址抓下來，算 SHA-256，寫 `curriculum/sources/MANIFEST.sha256`）
- Create: `scripts/curriculum/extract-waller-grammar.js`（`node … <html檔> <tsv檔>`：讀 Wayback 原始頁，寫 `id\tpattern`）
- Create: `curriculum/sources/waller/n{1..5}_vocab.csv`、`n{1..5}_kanji.csv`、`grammar-n{3,2,1}.tsv`
- Create: `curriculum/sources/openjlpt/grammar-n{3,2,1}.tsv`（`id\tpattern\tlevel`）
- Create: `curriculum/sources/SOURCES.md`：每個來源的網址、commit 或封存時間、抓取日期 2026-10-31、授權、留下哪些欄位，加上 Global Constraints 裡的標示文字。
- Create: `tests/curriculum.test.js`
- Modify: `scripts/test.sh`：在 sync-core 那行後面加 `node --test-reporter=tap tests/curriculum.test.js | grep -E "^# (pass|fail)"`。

**Interfaces:**
- Produces: 上面的來源檔。Task 3 讀這些檔。

- [ ] **Step 1: 開分支、提交文件**（見 Global Constraints）
- [ ] **Step 2: 寫測試**

```js
test('sources: Waller row counts', () => {   // 不算標題列
  assert.deepEqual(rows('waller/n{L}_vocab.csv'), { 5: 700, 4: 649, 3: 1835, 2: 1846, 1: 3475 });
  assert.deepEqual(rows('waller/n{L}_kanji.csv'), { 5: 79, 4: 166, 3: 367, 2: 367, 1: 1232 });
});
test('sources: grammar lists', () => {
  assert.deepEqual(rows('openjlpt/grammar-n{L}.tsv', [3, 2, 1]), { 3: 101, 2: 123, 1: 123 });
  for (const L of [3, 2, 1]) { const g = tsv(`waller/grammar-n${L}.tsv`); assert.ok(g.length >= 50); assert.equal(new Set(g.map(x => x.id)).size, g.length); assert.ok(g.every(x => x.pattern.trim())); }
});
test('sources: files match MANIFEST.sha256', () => { /* 每一行重算 SHA-256，必須相同 */ });
```

- [ ] **Step 3: 跑測試，確定失敗**：`node --test tests/curriculum.test.js`，預期 FAIL：找不到來源檔。
- [ ] **Step 4: 寫 `fetch-sources.sh` 和 `extract-waller-grammar.js`，執行抓取，寫 `SOURCES.md`**
  - 下載的 HTML 先放 scratchpad 的新空資料夾，不放進 repo；腳本另外放，用參數把路徑傳進去。
  - OpenJLPT 文法的數目如果不是 101／123／123，先停下來回報，不要改測試。
- [ ] **Step 5: 跑測試，確定通過**：`node --test tests/curriculum.test.js`，預期 PASS。
- [ ] **Step 6: 跑整套**：`bash scripts/test.sh`，預期最後印出 `ALL_OK`。
- [ ] **Step 7: Commit**：`data: 課程大綱的來源快照（Waller、OpenJLPT 文法點）與授權標示`

### Task 2: 比對函式 `match.js`

**Files:**
- Create: `scripts/curriculum/match.js`（`module.exports`）
- Test: `tests/curriculum.test.js`

**Interfaces:**
- Produces:
  - `isKana(s: string): boolean`
  - `spellings(word: string): string[]`：Waller 的寫法欄展開成幾種寫法。
    - 去掉 `〜～~` 和空白。
    - `お・金持ち` → `['お金持ち', '金持ち']`。
    - `あたたか(い)` → `['あたたかい', 'あたたか']`。
    - 開頭的「御」另外產生「ご」「お」兩種寫法。
  - `cleanReading(r: string): string`：去掉括號（保留內容）和空白。
  - `buildAppIndex(vocab: {id, w, r, lv}[]): AppIndex`：app 的寫法、去掉結尾「する」的寫法、讀音、假名寫的字。
  - `matchWord(index: AppIndex, word: string, reading: string): { status: 'in-app' | 'variant' | null, app?: { id: string, lv: string } }`
  - `grammarKey(pattern: string): string`：
    - 去掉 `〜～~`、空白、全形括號註記 `（…）`、開頭的 `N+`／`V+`。
    - `'～ば～ほど'` 和 `'〜ば〜ほど'` 都變成 `'ばほど'`。
    - `'すぎない（過ぎない）'` 變成 `'すぎない'`。

`matchWord` 的判斷順序：
1. 寫法相同、讀音相同（或 app 沒讀音）→ `in-app`。
2. 寫法相同、讀音不同 → `variant`。
3. 清單的字是假名，而且等於 app 某個字的讀音 → `in-app`。
4. 讀音相同，app 那個字用假名寫 → `in-app`。
5. 讀音相同、第一個字相同 → `variant`（送り仮名不同）。
6. 都不是 → `null`。

比對前，兩邊都去掉結尾的「する」。

- [ ] **Step 1: 寫測試**：用一份小的假 app 字表，下面每一條都是一個斷言。

```js
const ix = buildAppIndex([{ id: 'a', w: '終わる', r: 'おわる', lv: 'N5' }, { id: 'b', w: '結婚する', r: 'けっこんする', lv: 'N4' },
  { id: 'c', w: '上手', r: 'じょうず', lv: 'N5' }, { id: 'd', w: 'ご飯', r: 'ごはん', lv: 'PRE_N5' },
  { id: 'e', w: '金持ち', r: 'かねもち', lv: 'N4' }, { id: 'f', w: '分かる', r: 'わかる', lv: 'N5' }, { id: 'g', w: 'たばこ', r: 'たばこ', lv: 'N5' }]);
assert.equal(matchWord(ix, '終る', 'おわる').status, 'variant');
assert.equal(matchWord(ix, '結婚', 'けっこん').status, 'in-app');
assert.equal(matchWord(ix, '上手', 'うわて').status, 'variant');
assert.equal(matchWord(ix, '御飯', 'ごはん').status, 'in-app');
assert.equal(matchWord(ix, 'お・金持ち', 'おかねもち').status, 'in-app');
assert.equal(matchWord(ix, 'わかる', 'わかる').status, 'in-app');
assert.equal(matchWord(ix, '煙草', 'たばこ').status, 'in-app');
assert.equal(matchWord(ix, 'おいでになる', 'おいでになる').status, null);
assert.ok(spellings('おいでになる').includes('おいでになる') && !spellings('おいでになる').includes('いでになる'));
assert.deepEqual(spellings('あたたか(い)'), ['あたたかい', 'あたたか']);
assert.equal(cleanReading('あたたか(い)'), 'あたたかい');
assert.equal(grammarKey('～ば～ほど'), grammarKey('〜ば〜ほど'));
assert.equal(grammarKey('すぎない（過ぎない）'), 'すぎない');
```

- [ ] **Step 2: 跑測試，確定失敗**：`node --test tests/curriculum.test.js`，預期 FAIL：找不到 `scripts/curriculum/match.js`。
- [ ] **Step 3: 實作 `scripts/curriculum/match.js`**
- [ ] **Step 4: 跑測試，確定通過**：`node --test tests/curriculum.test.js`，預期 PASS。
- [ ] **Step 5: Commit**：`feat: 課程大綱的單字比對與文法點正規化`

### Task 3: 候選清單與報表

**Files:**
- Create: `scripts/curriculum/build-candidates.js`（可以 `require`，也可以直接執行）
- Create（產出，要 commit）：
  - `curriculum/candidates/n{5,4,3,2,1}.json`
  - `curriculum/candidates/REPORT.md`
  - `curriculum/candidates/app-grammar.md`
- Test: `tests/curriculum.test.js`

**Interfaces:**
- Consumes: Task 1 的來源檔；Task 2 的 `buildAppIndex`、`matchWord`、`spellings`、`grammarKey`。
- Produces:
  - `loadSources(dir: string): Sources`
  - `loadData(repoDir: string): DATA`：用 `new Function` 讀 data.js。
  - `buildCandidates(sources, DATA): { N5, N4, N3, N2, N1 }`，每一級的格式：
    `{ level, words: [{ w, r, status: 'new'|'in-app'|'variant'|'dup', app?: { id, lv }, dupOf?: 'N4' }], kanji: [{ k, status: 'new'|'in-app', appLv? }], grammar?: [{ p, key, src: ['waller'|'openjlpt'], status: 'new'|'dup', dupOf? }] }`
    - `grammar` 只有 N3–N1 有。
    - 同一級裡重複的字，`dupOf` 是同一級。
  - `reportMarkdown(cands): string`：
    - 每一級一列，欄位跟 spec §3 的表一樣，最後一欄是 `variant` 數。
    - 列出每一個 `variant` 和它比對到的 app 字。
    - app 的字用到、但漢字表沒有的漢字，照 Waller 等級各有幾個。
    - 兩個來源的文法點各有幾個、對上幾個、只有一邊有的各幾個。
  - `appGrammarMarkdown(DATA): string`：m1–m18 每個單元列出 `title`、講解各節的 `h` 和 `rule`、題目的 `pt` 去重。Task 6–8 判斷「app 已經教了」時看這份。

- [ ] **Step 1: 寫測試**：用真的來源和 data.js。

```js
const C = buildCandidates(loadSources('curriculum/sources'), loadData('.'));
const ROWS = { N5: 700, N4: 649, N3: 1835, N2: 1846, N1: 3475 };   // Task 1 的 Waller 單字列數
const n = (L, kind, st) => C[L][kind].filter(x => x.status === st).length;
assert.deepEqual([n('N3','kanji','new'), n('N2','kanji','new'), n('N1','kanji','new')], [295, 350, 1227]);
assert.equal(n('N3','kanji','in-app'), 72);
for (const L of ['N5','N4','N3','N2','N1']) assert.equal(C[L].words.length, ROWS[L]);   // 每一列都在，沒有漏
assert.ok(n('N3','words','new') >= 1350 && n('N3','words','new') <= 1500);
assert.ok(n('N2','words','new') >= 1600 && n('N2','words','new') <= 1750);
assert.ok(n('N1','words','new') >= 3000 && n('N1','words','new') <= 3200);
// 同一個寫法在全部 new 的字裡只出現一次
const all = ['N5','N4','N3','N2','N1'].flatMap(L => C[L].words.filter(x => x.status === 'new').map(x => x.w));
assert.equal(new Set(all).size, all.length);
```

再補一個用假來源的測試：同一個字在 N4 和 N3 都有 → N3 那筆是 `dup`、`dupOf: 'N4'`；同一級出現兩次 → 第二筆是 `dup`。

文法：假來源裡 Waller 的 `～ば～ほど` 和 OpenJLPT 的 `〜ば〜ほど` 合成一筆，`src` 兩個都有。只有一邊有的照樣列出來，`src` 只有那一邊。

- [ ] **Step 2: 跑測試，確定失敗**：`node --test tests/curriculum.test.js`，預期 FAIL：找不到 `build-candidates.js`。
- [ ] **Step 3: 實作 `build-candidates.js`；直接執行時寫出上面三種產出**
- [ ] **Step 4: 跑測試，確定通過**：`node --test tests/curriculum.test.js`，預期 PASS。
- [ ] **Step 5: 執行一次，產出候選清單**：`node scripts/curriculum/build-candidates.js`。REPORT.md 的數字要跟 spec §3 差不多（N3 新字約 1,450）；差很多就停下來回報。
- [ ] **Step 6: Commit**：`data: 課程大綱候選清單（扣掉 app 已有、跨級去重）與報表`

### Task 4: 大綱檢查器

**Files:**
- Create: `scripts/curriculum/check-outline.js`（可以 `require`，也可以直接執行）
- Test: `tests/curriculum.test.js`

**Interfaces:**
- Consumes: Task 3 的 `buildCandidates`、`loadData`；Task 2 的 `matchWord`。
- Produces:
  - `kanjiOrder(words: [string, string, string][], kanji: string[]): string[]`：照這一級的字裡用到這個漢字的次數排，多的在前；一樣多時照 `kanji` 原本的順序。
  - `checkOutline({ outlines: { N3?, N2?, N1? }, gaps?, cands, DATA }): { problems: string[], summary }`：`summary` 是每一級的主題數、字數、篩掉幾個、補了幾個、漢字數、單元數、文法點數。
  - 直接執行：讀 `curriculum/` 裡現有的大綱檔，印出 summary 和每一條 problem。有 problem 就 exit 1。

檢查項目。每一項寫一個測試，故意給錯的資料，斷言 problem 字串的開頭：
1. `N3 word missing: <w>`：每一個 `new` 和 `variant` 的候選字，剛好出現在主題或 `dropped` 其中一處。
2. `N3 word twice: <w>`
3. `N3 word not a candidate: <w>`：主題裡的字不是候選字，也不在 `added`。
4. `word in two levels: <w>`：同一個字出現在兩級。
5. `word already in app: <w>`：`added` 的字 `matchWord` 得到 `in-app`。
6. `N3 themes: <n> (need 15–20)`，以及 `N3 theme too small: <c>`（少於 20 個字）。
7. `N3 word without meaning: <w>`：`m` 是空的或超過 12 字。
8. `N3 kanji set differs`：大綱的漢字集合要等於這一級 `new` 的候選漢字；`N3 kanji order differs`：順序要等於 `kanjiOrder(…)` 的結果。
9. `unit ids not consecutive at <id>`：N3 從 m19 起，N3 → N2 → N1 連號。
10. `N3 unit <id> has <n> points (need 6–10)`
11. `N3 grammar missing: <key>`：每一個 `new` 的文法 key，剛好出現在 `points[].keys`、`covered[].keys`、`moved[].keys` 其中一處；`moved` 的 key 要出現在目標那一級的 `points` 裡。
12. `N3 covered by unknown unit: <by>`：`by` 必須是 m1–m18。
13. `N3 phases: …`：階段照順序蓋住所有單元、不重疊；每級 2 個階段，N1 可以 3 個。
14. `N5 gap theme unknown: <c>`：缺口檔的 `c` 必須在 `DATA.THEMES` 同一級；N5／N4 的 `new`、`variant` 候選字，剛好出現在缺口檔的 `words` 或 `dropped` 其中一處。

- [ ] **Step 1: 寫 14 個測試**：用一份最小的合格大綱當底，每個測試只改壞一個地方。另外一個測試：合格的大綱 `problems` 是空的。
- [ ] **Step 2: 跑測試，確定失敗**：`node --test tests/curriculum.test.js`，預期 FAIL：找不到 `check-outline.js`。
- [ ] **Step 3: 實作 `check-outline.js`**
- [ ] **Step 4: 跑測試，確定通過**：`node --test tests/curriculum.test.js`，預期 PASS。
- [ ] **Step 5: Commit**：`feat: 課程大綱檢查器`

### Task 5: 指南與 N5／N4 缺口

**Files:**
- Create: `curriculum/GUIDE.md`：給內容小隊看的規則。內容就是 Global Constraints 的「資料規則」，再加下面幾條：
  - `variant` 的處理：同一個字只是寫法不同 → 放進 `dropped`，`why` 寫「app 已有：<id>」；是不同的字 → 正常放主題。
  - 過時的字（テープレコーダー、字引、看護婦）→ 篩掉；有現代說法的，放進 `added`。
  - 國名、地名照收（app 已經有類似的字），純人名不收。
  - 文法點：同一個句型的變體合成一個點，例如「〜うちに／〜ないうちに」，`keys` 兩個都列。
  - `covered` 要對照 `curriculum/candidates/app-grammar.md`，寫出 app 在哪個單元教過。
  - 兩個來源等級不同時，照 `candidates` 的歸屬；真的要換級，用 `moved` 寫原因。
- Create: `curriculum/gaps-n5n4.json`

- [ ] **Step 1: 寫 `curriculum/GUIDE.md`**
- [ ] **Step 2: 派一個內容小隊做 N5／N4 缺口**：照 GUIDE，`c` 從 `DATA.THEMES.N5`、`N4` 裡挑。
- [ ] **Step 3: 檢查**：`node scripts/curriculum/check-outline.js`，預期沒有 `N5`／`N4` 開頭的 problem。
- [ ] **Step 4: 抽 20 個字人工看**（意思、主題、篩掉的原因），有錯就讓小隊改。
- [ ] **Step 5: Commit**：`data: N5／N4 缺口字（主題與中文意思）與大綱指南`

### Task 6: N3 大綱

**Files:**
- Create: `curriculum/n3.json`

- [ ] **Step 1: 派主題小隊**：先定 15–20 個主題，再把所有 `new`、`variant` 候選字分進主題，寫上中文意思，該篩的放 `dropped`，現代說法放 `added`。
- [ ] **Step 2: 派文法小隊**：
  - 把候選文法點分進單元，每單元 6–10 點，從 m19 開始編號。
  - 寫 `short`、`title` 和每個點的中文意思。
  - 對照 app-grammar.md 填 `covered`，換級的填 `moved`。
  - 分兩個階段：「第四階段：N3 文法」「第五階段：N3 進階與總複習」。
- [ ] **Step 3: 填漢字順序**：`kanji` 用 `kanjiOrder(大綱所有字, 這一級 new 的漢字)` 的結果。
- [ ] **Step 4: 檢查**：`node scripts/curriculum/check-outline.js`，預期沒有 `N3` 開頭的 problem。有就讓小隊改，再跑一次。
- [ ] **Step 5: 抽查**：每個主題抽 3 個字，每個單元抽 2 個點，看意思和歸類；記下單元數，跟 spec 估的 12–14 個比。
- [ ] **Step 6: Commit**：`data: N3 大綱（主題、漢字順序、單元）`

### Task 7: N2 大綱

**Files:**
- Create: `curriculum/n2.json`

- [ ] **Step 1–6**：同 Task 6，有幾處不同：
  - 單元編號接在 N3 最後一個後面。
  - 階段是「第六階段」「第七階段」。
  - `moved` 到 N3 的點要回頭補進 `n3.json`。
  - 跟 spec 估的 13–15 個單元比。
  - Commit：`data: N2 大綱（主題、漢字順序、單元）`

### Task 8: N1 大綱

**Files:**
- Create: `curriculum/n1.json`

- [ ] **Step 1–6**：同 Task 7，有幾處不同：
  - 候選字約 3,100 個，主題小隊分兩個。第一個定好主題清單後，兩個各分一半的字。
  - 階段可以 3 個（第八到第十階段）。
  - 跟 spec 估的 24–28 個單元比。
  - Commit：`data: N1 大綱（主題、漢字順序、單元）`

### Task 9: 審查網頁、使用者審查、收尾

**Files:**
- Create: `scripts/curriculum/render-review.js`：`node … <輸出.html>`，從大綱檔、缺口檔和 candidates 產生一頁獨立的 HTML，資料直接嵌在頁面裡。
- Test: `tests/curriculum.test.js`
- Modify: `docs/superpowers/specs/2026-10-31-curriculum-n3-n1-design.md`：§4 換成實際的單元數；§3 的數字有變就一起改。

**Interfaces:**
- Consumes: Task 3–8 的產出；Task 4 的 `checkOutline`。
- Produces: `renderReview({ outlines, gaps, cands }): string`

網頁內容：
- 分頁：N5／N4 缺口、N3、N2、N1。
- 每一級先列數字：主題、字、漢字、文法點、單元，以及每天 15 題大約要幾天。天數 =（字＋漢字＋文法點 × 6）÷ 15，標「估計」。
- 主題卡：點開看字表（字、讀音、意思）。
- 漢字方格。
- 單元列表：每個點的句型和意思。
- 篩掉的字和原因、補的字、app 已經教過的點、換級的點。

- [ ] **Step 1: 寫測試**：用 Task 4 那份最小的合格大綱 render，斷言 HTML 裡有四個分頁的名字、某個字的「字（讀音）」、某個單元的 `title`、某個篩掉的字的 `why`。
- [ ] **Step 2: 跑測試，確定失敗**：`node --test tests/curriculum.test.js`，預期 FAIL：找不到 `render-review.js`。
- [ ] **Step 3: 實作**：寫頁面前先載入 artifact-design skill，照它的規定（標題、顏色變數、深色模式、手機寬度）。
- [ ] **Step 4: 跑測試，確定通過**：`node --test tests/curriculum.test.js`，預期 PASS。
- [ ] **Step 5: 產生網頁並發布**：輸出到 scratchpad，用 Artifact 發布，把連結給使用者，請使用者在網頁上留言。
- [ ] **Step 6: 照留言修改**：
  - 改大綱檔。
  - `node scripts/curriculum/check-outline.js` 跑到沒有 problem。
  - 重新產生網頁，發布到同一個網址。
  - 重複到使用者說可以。
- [ ] **Step 7: 收尾**：
  - 更新 spec 的單元數和數字。
  - `bash scripts/test.sh` 印出 `ALL_OK`。
  - Commit：`docs: 課程大綱定案與審查網頁產生器`
  - 用 superpowers:finishing-a-development-branch 問使用者要不要合回 main。這個分支沒有改 app，合回去學習者不會看到任何差別。
