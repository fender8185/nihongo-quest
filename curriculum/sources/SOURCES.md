# 課程大綱的來源

抓取日期：2026-10-31。重抓：`bash scripts/curriculum/fetch-sources.sh`；每個檔的 SHA-256 在 `MANIFEST.sha256`。

授權標示：JLPT 單字、漢字、文法點的等級：Jonathan Waller 的 JLPT Resources（tanos.co.uk），CC BY。文法點對照：OpenJLPT（evanclan/OpenJLPT），CC BY-SA 4.0，只取句型名稱與等級。

## Jonathan Waller 的 JLPT Resources（CC BY）

單字、漢字（`waller/n{L}_vocab.csv`、`waller/n{L}_kanji.csv`，L = 1–5，原樣保存）：
- 來自 GitHub 鏡像 Bluskyo/JLPT_Vocabulary，commit 4358f932937ad0232194a36e9f4f875094910c6b（2026-07-15）。
- 原始檔是 `data/vocab/parsedData/n{L}_vocab_cleaned.csv` 和 `data/kanji/parsedData/n{L}_kanji.csv`。
- 鏡像的 README 寫：「Data from: https://www.tanos.co.uk/jlpt/ are licenced under Creative Commons "BY" by Jonathan Waller」。
- cleaned 版有鏡像作者的手動修正，例如拿掉跨級重複的「対立」「暖かい」。

文法點（`waller/grammar-n{L}.tsv`，L = 3、2、1，欄位 id、pattern）：
- tanos.co.uk 在 2026-10-31 連不上（DNS 查不到），所以用 Wayback Machine 的存檔。網址帶 `id_`，抓到的是原始頁面。
- 頁面：`http://www.tanos.co.uk:80/jlpt/jlpt{L}/grammar/`。
- 存檔時間：N3 20200814013355、N2 20200725191822、N1 20200729091405。
- 每個點留下網站上的 grammarid 和句型文字；解析由 `scripts/curriculum/extract-waller-grammar.js` 做。

## OpenJLPT（CC BY-SA 4.0）

- 來自 evanclan/OpenJLPT，commit 0d1d3410bec90bd4098a7c72de820543cb4f707c（2026-10-02），原始檔是 `data/json/grammar/n{L}.json`。
- 只留 id、pattern、level（`openjlpt/grammar-n{L}.tsv`），拿來對照 Waller 的文法點和等級。
- 說明、句型結構、例句、註記是 OpenJLPT 的原創內容，不存、不抄。

## 沒有用的

- JMdict／KANJIDIC2（EDRDG，CC BY-SA 4.0）：這次不用，等做內容時再拿來檢查讀音。
