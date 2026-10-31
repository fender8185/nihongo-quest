# 產生器改成上傳到 R2 — 設計

日期：2026-10-31　狀態：使用者已確認（2026-10-31；選了只放 R2、從管理者頁面直接上傳、不做從 Supabase 複製）　版本：1.0.30（接在 1.0.29「播放改從 R2 抓」之後）

## 1. 問題

1.0.29 起，app 先從 Cloudflare R2（`audio.nihongoquest.app`，bucket `nihongo-audio`）抓音檔，R2 沒有才退回 Supabase 的 `JPY_audio`。但管理者的產生器（設定 › 語音 › 管理者：生成雲端音檔）還是只上傳到 Supabase：

- 之後新產生的音檔只在 Supabase，R2 永遠缺這些，學習者播放時每次都要先問 R2、再退回 Supabase。
- Supabase 免費方案的儲存只有 1 GB（音檔現在 343 MB）。音檔預計會變成 10 倍（N1）以上，Supabase 放不下。
- 每次跑產生器都要貼 Supabase 的 secret key。這把金鑰權限很大（繞過所有權限設定，學習者的資料也能動）。

## 2. 使用者的決定

- 新音檔**只放 R2**。Supabase 的 `JPY_audio` 停在現在的樣子，留著當舊音檔的備份，不再上傳，也不刪。
- 產生器**從管理者頁面直接上傳到 R2**（不另外架 Cloudflare Worker）。
- **不做「從 Supabase 複製」**：使用者確認 R2 複本（2026-10-31 早上）之後沒有在 Supabase 產生過新音檔。真有漏的，產生器會用 Google 重新產生，結果一樣正確。

## 3. 跑一次產生器

1. **整理句子**（不變）：`cloudAudioTexts()` 列出全部要有聲音的句子，`cloudAudioPath()` 算出檔名 `f|m|zh/<hash>.mp3`。
2. **查 R2 已有的檔案**：用 S3 的 ListObjectsV2 分頁列出 `v1/f/`、`v1/m/`、`v1/zh/` 底下的檔名，每頁 1000 個；回應是 XML，用 `DOMParser` 讀 `Key`、`IsTruncated`、`NextContinuationToken`。
3. **生成並上傳**：R2 沒有的檔案，4 個一起跑（不變）。每個檔案：
   - 用 Google 產生，作法跟現在相同（`fetchEngineBlob`，engine `google_tts`、語速 1、中文用台灣華語聲音）。
   - PUT 到 R2 的 `v1/<path>`，帶 `Content-Type: audio/mpeg`、`Cache-Control: public, max-age=31536000, immutable`，跟現有的 R2 物件一樣。
4. **整趟跑完、沒有中途停止**：清掉 `cloudMisses` 和 `nq_audio_miss`（不變）。

可以中途停止，再按開始會接著跑：已有的檔案會略過（不變）。產生器不再呼叫 Supabase Storage 的任何 API。

## 4. 上傳到 R2：S3 API 和簽名

- 網址：`https://<帳號 ID>.r2.cloudflarestorage.com/nihongo-audio/<key>`，區域 `auto`，服務 `s3`。帳號 ID 由使用者提供（不是秘密），寫在 `CLOUD_AUDIO` 裡。
- 每個請求用 AWS Signature Version 4 簽名，在瀏覽器裡用 WebCrypto（SHA-256、HMAC-SHA256）計算，不加外部套件：
  - 簽的標頭：`host`、`x-amz-content-sha256`、`x-amz-date`。
  - 內容雜湊用 `UNSIGNED-PAYLOAD`（R2 支援），上傳時不用先算整個檔案的雜湊。
  - `Authorization: AWS4-HMAC-SHA256 Credential=<Access Key ID>/<日期>/auto/s3/aws4_request, SignedHeaders=…, Signature=…`。
- 簽名函式要能指定區域、服務和時間，這樣才能拿 AWS 官方文件的範例來測。

## 5. 管理者頁面

- 欄位：Google Cloud API Key（不變）、**R2 Access Key ID**、**R2 Secret Access Key**。後兩個取代 Supabase Secret key。三個都要填才會開始。
- 說明文字改成：上傳到 Cloudflare R2 的 `nihongo-audio`。三把金鑰只在這一次執行中使用，不儲存、不同步，關掉頁面就消失。R2 金鑰只能讀寫這一個 bucket。原本「跑完請到 Supabase 後台刪掉 Secret key」那句拿掉。
- 進度那行不變：共幾段、已有、這次上傳、失敗、剩下。

## 6. 出錯時

- R2 回 401 或 403（金鑰錯、權限不夠、裝置時間差太多）：列檔名時就失敗並顯示原因；上傳時立刻停，不要每個檔案都失敗一次（沿用現在的判斷）。
- 列檔名時連不上（`Failed to fetch`，通常是 bucket 的 CORS 沒設好）：顯示「連不到 R2：檢查網路和 bucket 的 CORS 設定」。
- Google 金鑰錯：跟現在一樣，立刻停並顯示原因。

## 7. Cloudflare 上的設定（使用者做，發版前完成）

1. **R2 金鑰**：R2 › Manage API tokens › Create，權限選「Object Read & Write」，只限 `nihongo-audio`。畫面上的 Access Key ID 和 Secret Access Key 存進密碼管理器，不貼進對話。
2. **bucket 的 CORS**：整段換成下面這段，第一條是原本「任何網站都能下載」的設定，第二條讓 app 的網址可以列檔名和上傳：

   ```json
   [
     { "AllowedOrigins": ["*"], "AllowedMethods": ["GET", "HEAD"] },
     { "AllowedOrigins": ["https://fender8185.github.io"], "AllowedMethods": ["GET", "PUT"],
       "AllowedHeaders": ["authorization", "content-type", "cache-control", "x-amz-date", "x-amz-content-sha256"], "MaxAgeSeconds": 3600 }
   ]
   ```

3. **帳號 ID**：R2 頁面上的 Account ID，告訴 Claude。

設好後先用 curl 送一個預檢請求（OPTIONS，`Origin: https://fender8185.github.io`、`Access-Control-Request-Method: PUT`）到 S3 網址，確認 CORS 回應正確，再發版。

## 8. 安全

- R2 金鑰只能動 `nihongo-audio`。外流的最壞情況是音檔被改或被刪，可以重新產生；學習者的資料（Supabase 的帳號和進度）碰不到。
- 產生器不再需要 Supabase secret key。Supabase 後台如果還留著那把 key，可以刪掉。
- 金鑰只存在這次執行的記憶體裡；測試確認它們不會出現在 `state` 或 `localStorage`（沿用現在的測試）。

## 9. 不變的部分

- 學習者這邊：播放、離線語音、下載全部，都照 1.0.29（先 R2、再 Supabase）。
- Supabase 的 `JPY_audio`：不動、不刪。要不要刪是以後另外決定的事。

## 10. 測試（tests/e2e/test_fixes.py）

- **簽名**：用 AWS 文件「Signature Calculations for the Authorization Header: Transferring Payload in a Single Chunk」裡的範例（GET Object、List Objects；區域 us-east-1、範例金鑰、2013-05-24 00:00:00 UTC），算出的簽名要跟文件上的值一模一樣。
- **產生器**：用假的 fetch 模擬 R2 列檔名（兩頁 XML）、Google、R2 上傳，確認：
  - 已有的會略過
  - 沒有的才產生並上傳
  - 上傳的網址、方法、`Content-Type`、`Cache-Control`、`x-amz-content-sha256`、`Authorization` 的 Credential 部分都正確
  - 沒有任何請求送到 Supabase Storage
  - 金鑰沒有被存下來
- **出錯**：R2 上傳回 403 時整個停下來。
- 現有的管理者頁面測試改成新的欄位。
- 整套 `bash scripts/test.sh` 印出 ALL_OK 才發版。

## 11. 版本與上線

1. 使用者完成第 7 節的設定，Claude 用 curl 確認 CORS。
2. 發 1.0.30。更新紀錄加一行：管理者的「生成雲端音檔」改成上傳到 R2，金鑰改成 R2 的。
3. 使用者跑一次產生器。預期幾乎全部是「已有」，「這次上傳」只有之前記下的缺音檔或新教材。
4. Claude 抽查幾個新上傳的檔案，確認從 `audio.nihongoquest.app` 下載得到、格式正確。
