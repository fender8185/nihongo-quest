'use strict';
/* ==========================================================================
   Core: utilities, state, migration from v1, item registry, SRS, logs
   ========================================================================== */
const APP_VERSION = '1.13.0';   // keep equal to the version in sw.js CACHE ('nq-v1.4.2'); scripts/test.sh checks it. 1.0.0 = the former v100; before that the number alone (v4–v100)
// newest first; shown under 設定 › 外觀 › 版本紀錄
// 版本紀錄：給人看的。1.0.0 是「現在的樣子」的總整理，之後每個版本一組只寫變更；1.0 之前的過程壓成里程碑收在最後。
// 版本號（APP_VERSION）每次推送都會變（通常最後一位加一；1.1.0 是書房改版），不必和紀錄一對一。label 有的話取代 v 顯示。
// 規則：新改動若是推翻前一筆，就改前一筆的文字，不另外加一筆；中間修了又改的過程不寫。
const CHANGELOG = [
  { v: '1.13.0', date: '2026-11-12', items: [
    '衣櫃和古道具屋的穿搭分成頭部、臉部、頸部、衣服、褲子、鞋子、背部七區，每一區至少有三樣可以買：新的太陽眼鏡、狐狸面具、領帶、木屐、雨靴、兔子拖鞋、ランドセル和小翅膀。原本的背包從正面也看得到肩帶；牆上的狐狸面具改叫「狐狸面具掛飾」。',
    '和鎮上的人說話時，中文先收起來，按「中文」才打開（打開後整段對話都看得到）。',
    '信箱會收到鎮上寄來的信，不用更新 App 也收得到，有些信會附禮物。萬聖節前就在鎮上的人，會收到ムギ送的唱片〈おばけの夜〉。'
  ] },
  { v: '1.12.1', date: '2026-11-12', items: [
    '和小鎮上的人說話時，每句台詞會直接用那個人的聲音唸出來，不用再自己按 🔊（🔊 還在，可以再聽一次）。',
    '小春的聲音換成比較年輕、輕柔的聲音；只有「……」的台詞不再顯示 🔊。管理者生成雲端音檔時，已經做好的角色語音不會再重做一次。'
  ] },
  { v: '1.12.0', date: '2026-11-12', items: [
    '有聲音了：設定 › 學習多了「環境音」和「音樂」兩個開關，和答題音效分開，各自可以關。點地方的東西會有聲音（販賣機ガコン、郵筒、神社的鈴和拍手、風鈴、貓、烏鴉、海鷗、計程車、剪票口⋯⋯），家裡開門、開關燈、拉抽屜、澆水、坐下躺下、買東西、擺東西、翻講義也有；走路有腳步聲，木地板、草地、人行道、碎石、沙灘聽起來不一樣。',
    '每個地方有自己的背景聲，白天和晚上不同：院子和公園有鳥叫（還有樹鶯），晚上換成蟲鳴；海邊有浪和海鷗，漁港有水聲，大馬路有車聲和斑馬線的ピヨピヨ，小鎮、車站、食堂、居酒屋有人聲，古道具屋有老鐘的滴答，神社偶爾有烏鴉。留聲機停下來時，書房聽得到窗外。唸日文時背景和音樂會自動變小聲。',
    '小鎮上的人都有了自己的聲音：對話裡按 🔊，每個人用自己的聲音唸；外婆的日記也能唸出來。ムギ改成少年的聲音，每句開頭先「ワン！」，句尾不再加ワン。',
    '古道具屋多了唱片：〈春風〉〈夏祭り〉〈月見〉〈雪の朝〉〈喫茶しずく〉，萬聖節還有限定的〈おばけの夜〉，買了點書房的留聲機就能換上。居酒屋會放自己的〈赤ちょうちん〉，咖啡館開著時小鎮聽得到爵士，神社有祭典時聽得到祭囃子。'
  ] },
  { v: '1.11.0', date: '2026-11-11', items: [
    '主角走路會挑路：小路、人行道和斑馬線最好走，草地和沙灘比較難走，馬路只從斑馬線過。例如大馬路從斑馬線過馬路、公園從石階上小鎮、漁港沿著沙路去海邊、院子先沿著小路走；草地和沙灘上任何地方照樣點了就走得到。',
    '每個地方的小東西都畫得更仔細了：公園、海邊、大馬路、漁港、小鎮、神社、白鷺城、車站、錢湯、食堂、居酒屋和院子的長椅、鴿子、路燈、販賣機、船、燈塔、店的櫥窗、狐狸、招き猫⋯⋯東西沒有增減，位置也沒變。公園的沙坑原本被地面蓋住，現在看得到了。小鎮拿掉電線桿和電線，三角旗改掛在每間店的屋簷下；公園拿掉風箏；麵包店雨棚上和錢湯長椅上的貓重畫成睡著的貓，會呼吸。',
    '點東西的反應更細：販賣機掉出罐子、郵筒的信滑進去、熊貓搖搖馬的彈簧跟著彎、螃蟹的夾子一開一合、神社的鈴鐺晃、貓會蹭頭，搖樹時樹幹不動、只有樹冠在晃，盆栽澆水時盆子不動、只有植物在搖。',
    '古道具屋的商品（地上、地毯、牆上、院子、房子、帽子和衣服）都畫得更仔細了，形狀和大小不變；行燈、落地燈和南瓜燈白天不再整片發著橘光。'
  ] },
  { v: '1.10.0', date: '2026-11-11', items: [
    '我的標記：單元頁（第 0 週也有）和單字表的每個字都有一顆星星按鈕，點一下依序換成 0★、2★、5★。2★ 是看過、有點印象，過幾天開始複習；5★ 是已經會了，之後只偶爾確認。標記只會往上加，不會把更熟的降下來；改回 0★ 就回到標記前，標記後答過的照樣保留；答錯一次，標記就取消。原本的「標記為已完成」和「我會了／取消熟練」都換成這顆按鈕，單字表的整批按鈕也變成「全部標 2★」「全部標 5★」，標錯可以復原。今天標記的題會從今天的清單拿掉，總題數跟著變少。',
    '單元的進度條改看星星：5★ 算熟練、3★ 以上算熟悉，標成 5★ 的不會再顯示成初識。',
    '每天的題目變少：5★ 的題改成記憶快淡掉時才出，記得越牢隔越久才回來，每天最多 20 題（原本不管記得多牢，大約一個月就輪一次，每天最多 30 題）；4★ 每天最多 20 題（原本 30 題）。',
    '常錯的題剛又答錯的話，下次出現前先讓你再看一次：單字是預習卡，文法是那一節的講義。',
    '講義變成一本書：有自己的一頁，像翻書一樣左右滑，依螢幕大小自動分頁；單元頁的講義分頁變成目錄，可以直接翻到某一節。每本講義第一次翻到最後一頁，送 3 言靈。',
    '開場選「我學過一些」時，先選要考入門、N5、N4 還是 N3，沒通過可以改考低一級。小春在開場結束 1 分鐘後就會來敲門。',
    '手機上的選項不再顯示 1–4 的數字；用電腦鍵盤照樣可以按 1–4 作答。'
  ] },
  { v: '1.9.1', date: '2026-11-11', items: [
    '再加強保護進度：剛更新的裝置一打開就受到保護，不用等第一次同步；雲端也會拒絕把進度大量縮水的上傳（例如還沒更新的舊版 app 出錯時），遇到時 app 會把兩邊的紀錄逐題合併再上傳，不會少任何一題。'
  ] },
  { v: '1.9.0', date: '2026-11-11', items: [
    '單字有圖了：419 個看得見的東西（食物、家裡的東西、動物、交通、建築和店……）第一次出現時，字的上面有一張小圖；學過以後偶爾會出「看圖選字」：看圖選日文，錯的選項不會是長得很像的東西。',
    '信箱跟著進度走：收到哪些信、讀過哪些，跟進度存在一起，也跟著雲端同步；換一份新的進度時，信也是新的。',
    '古道具屋開張前，山上籠罩著濃霧，看不到也去不了；存到 20 言靈時福爺寄信來，霧也跟著散開。',
    '練習做到一半按 ✕ 會先問一次：已經答的題目照樣記錄，但這組不會得到言靈。',
    'app 的檔案重新整理：程式、課程資料、N3 和圖片各自分開，以後更新只會下載有變的部分。',
    '版本紀錄變短：1.0 那幾十個版本收成幾段重點，放在「更早的版本」裡。'
  ] },
  { v: '1.8.2', date: '2026-11-11', items: [
    '保護進度：這台裝置上的進度讀不出來時（例如網路斷了一下、課程資料沒載到），app 會停下來請你重新整理，不會再換成一份全新的進度；曾經有學習紀錄的裝置，也不會再把空白的進度上傳、蓋掉雲端的進度。雲端另外會保留被取代的舊版本，萬一出事可以找回。'
  ] },
  { v: '1.8.1', date: '2026-11-11', items: [
    '作答畫面的字大小重新整理：單字和漢字題的字放大，手機上放在畫面中間；選項只有一兩個字時（比字形的漢字、假名、羅馬拼音）改成大字的 2×2 方格；句子最後一行不會只剩「す。」；閱讀題的問題不再比短文大；排序題的中文移到句子正上方；答題後的說明只用三種字級，比較整齊。',
    '漢字讀音題答完的說明先講題目問的那個詞，再說這個字在詞裡怎麼讀，例詞一個一行，不會再看起來像答案變成別的字。',
    '祖父、祖母的中文改成「（自己的）爺爺、外公」「（自己的）奶奶、外婆」。'
  ] },
  { v: '1.8.0', date: '2026-11-11', items: [
    '文法的「這句話的意思是？」改成拼貼：看日文句子，用下面的中文詞塊拼出意思（點一下或拖過去，再按確定）。假選項只差在文法的地方，要真的看懂文法才選得對，不會再因為認得一個字就猜到；順序不算分。助詞題照舊問「畫線的に表示什麼」，敬語和只考形式的題目只出填空。',
    '答題後的按鈕變少：只留發音、例句、AI 解析，答錯時多一顆「手滑，不算」。拿掉「⋯」、振假名、「這個字我已經會了」和「這題有問題」；新字預習卡也拿掉振假名（「我會了」還在）。振假名可以到設定裡改。',
    '進度條一開始就把「換個方式再考」算進去，不會再出現做到最後一題還一直加題；只有答錯多出的「再練一次」會讓總題數加一。',
    '做完一組的結算畫面：多了「這組的收穫」，列出升到熟悉、已熟練和新學的；言靈會飛進總數；全對時標題變金色，全對或做完今天的題目時會撒彩帶。',
    '修正文法題的中文翻譯：拿掉括號裡的註解、改掉不通順的說法，也修正一題日文多打了一個字。'
  ] },
  { v: '1.7.1', date: '2026-11-10', items: [
    '鏡頭讓主角待在畫面中間附近：走路時鏡頭順順地跟著，前進的方向多留一點空間；停下來時慢慢滑回，讓他在正中間。用手指滑過畫面，就會停在你滑到的地方，主角再走才回到他身上。書房和臥室也一樣。',
    '從院子去海邊和小鎮變快了：遠方山路那段從將近 4 秒縮成 2 秒。'
  ] },
  { v: '1.7.0', date: '2026-11-10', items: [
    '手機直拿時，外面的場景放大了：天空少一點，人和房子大一點，也比較好點；到白鷺城和食堂，一進去就看得到城和吧台。書房和臥室一開始拉遠一些，書櫃、書桌、窗戶和床都看得到，兩指還是可以拉近。',
    '晚上不再一片黑：天空是深藍色，多了淡淡的星星，地面和房子照著月光，窗戶的燈更亮；書房和臥室的檯燈照得比較開、比較暖。',
    '每個地方有自己的天空：雲和飛機的位置都不一樣，海邊和漁港有海鷗飛過，神社和白鷺城有烏鴉。',
    '提示比較沒壓力了：等你的人頭上還是有「！」，但路牌、店門、公車站和床不再有紅點，出門的名牌不再寫有幾件事，進書房也不再提示誰在哪裡等；町の手帳只寫還有幾件事沒遇到。可以點的東西玩過一次，上面的小白點就不再出現。',
    '院子的小屋畫得更仔細了：磚砌煙囪、屋瓦、百葉窗和花箱、晚上會亮的門燈、門墊，門前是兩階石階。',
    '修正：入門單字的題目上方顯示成「PRE_N5」，改成「入門」；古道具屋福爺說的話被櫃台擋住；iPhone 上獲得新東西的特寫沒有置中。'
  ] },
  { v: '1.6.0', date: '2026-11-10', items: [
    '主角會繞過長椅、桌椅、木箱、沙坑這些東西走，點到東西會走到它旁邊；站在東西後面時會被擋住。坐在長椅上的鎮上的人也是真的坐著。',
    '每個地方多了很多可以點的東西，主角會走過去做事：盪鞦韆、溜滑梯、騎熊貓搖搖馬、坐長椅和吧台、買飲料、搖神社的鈴拍手、抽籤、進月の湯泡澡、撿海星、嚇飛鴿子、搖櫻花樹⋯⋯碰一下畫面後，可以點的東西上面會出現小白點。大馬路的カーブミラー照一照，還能換臉型和髮型。',
    'まんぷく食堂和居酒屋とり吉改成跟書房一樣的 45 度房間：吧台椅、桌子、小上がり的坐墊都能坐，有人坐了就換一個位子；牆上的菜單、神棚、時鐘、電視和居酒屋的酒櫃都是立體的。',
    '每個地方都畫得更仔細了：遠方的房子有窗有門、小鎮山坡上是錯落的村落，晚上有路燈和照在海面的月光，白天有雲影飄過，天上有飛機，偶爾還會飄來熱氣球；車站、公園、食堂的時鐘跟著時間走。書房和臥室的窗光會照在地板上，窗簾也會輕輕擺動。',
    '從院子去海邊或小鎮時，會看到主角變成小小的人，沿著遠方的山路走過去。',
    '修正：手指按在人或店面上時畫面滑不動；敲門聲改成「コンコン」。'
  ] },
  { v: '1.5.0', date: '2026-11-10', items: [
    '小鎮活起來了：28 位鎮上的人，各有自己的個性和作息，會隨時間在不同地方出現、店也會開門打烊。學到哪裡，就會開出和那個單元有關的對話事件（全部課程共 170 個），用學過的單字和文法選回答，答錯會告訴你為什麼。做完的事件可以在「町の手帳」重讀；手帳一人一頁，還沒認識的人是模糊的。',
    '地圖變大了：小鎮的まんぷく食堂和居酒屋とり吉（晚上才開）可以走進去；大馬路的公車可以搭到駅前、月の湯、稲荷神社（晚上有緣日和煙火）和白鷺城；海邊往下是みなと漁港，小鎮往下是ひだまり公園，整張地圖繞得成一圈。每個地方都有自己的景色和動態。',
    '做完今日練習後，可以到臥房的床上睡到早上、中午、傍晚或晚上，去見在那個時間出現的人；睡醒後當天都照那個時間走，隔天回到真實時間。有人在等你時，書房的提示、門口的名牌和町の手帳都會說是誰、在哪裡、什麼時間。',
    '剛開始的新玩家會先待在家裡，等鄰居的柴犬ムギ送來留聲機後才能出門。古道具屋改成累積 20 言靈才開張，那時福爺會寄信來；古道具屋改成以圖片為主的小方格，點一下看大圖和說明。',
    '信件讀過會留在信箱裡（標「已讀」），不會不見了；歡迎信改由外婆的朋友渚寄來。',
    '鎮上的人穿上了各自的工作服（巫女、居酒屋老闆、廚師、站員、警察⋯⋯）。新主角預設換成比較中性的樣子。書房的「今日練習」做完、「聽一輪」聽滿 5 分鐘，名牌就變回白色。院子改成山頂，遠方看得到海邊和小鎮。',
    '修正：鎮上的人（尤其是海邊的ムギ）有時點不到。'
  ] },
  { v: '1.4.2', date: '2026-11-09', items: [
    '修正：買過的東西在古道具屋卡片上的「已擁有」字樣，會變成蓋住整個畫面的暗色遮罩，看起來像當掉、什麼都點不了（買完東西離開再進古道具屋就會發生）。'
  ] },
  { v: '1.4.1', date: '2026-11-09', items: [
    '之後有新版本會自動換上，不用再點「有新版本」的提示：剛打開 app 時直接更新；正在用的話，等換頁或回到 app 時再換，練習、考試、聽一輪到一半都不會被打斷。'
  ] },
  { v: '1.4.0', date: '2026-11-09', items: [
    '你為什麼會住進這間小屋？第一次打開書房會有一段開場。書房的矮書架上有一本外婆的日記，學得越多，讀得懂的頁數就越多。',
    '兩位鄰居會來敲門：聽到「コンコン」時點大門去開門看看，他們會帶禮物來（全身鏡、留聲機和兩張黑膠）。之後可以到海邊或小鎮找他們聊天，日文附假名，也能唸出來。',
    '地圖變大了：院子往左走是海邊，往右是小鎮（一排小店，其中一家是美容院），沿著門前彎彎的小路往下走到大馬路上的公車站，可以坐在長椅上等公車。室外滑動更靈敏。',
    '家裡的東西多了很多互動：沙發能坐、暖桌和矮桌能跪坐、床能躺下睡覺（會蓋被子）、植物能澆水、燈具點一下開關、鏡子能照（換臉型、髮型、五官；衣櫃只換穿著）、院子的望遠鏡能看星座、池塘能撥水。留聲機會播放輕音樂，點它換唱片或停下來。',
    '古道具屋多了三款房子（薑餅屋、樹墩屋、茶壺屋，限時還有南瓜屋），院子按「擺設」可以直接換房子外觀；蘑菇屋變胖了。收納箱裡一樣的東西會疊成一格。買到或收到新東西時有特寫。'
  ] },
  { v: '1.3.0', date: '2026-11-09', items: [
    '多了一間臥房：書房左牆前面多一扇門，點了主角會走過去開門進臥房（床、床頭櫃、衣櫃、矮櫃、窗戶），手機的返回鍵能回書房。點臥房的衣櫃也會打開衣櫃。兩間房都能擺設，收納箱共用。',
    '書房變大、重新佈置：右邊是閱讀角（沙發、小邊桌和檯燈、長地毯），左邊矮書架前擺了暖桌；多了兩扇窗，牆上有壁燈，晚上會亮。書桌離書櫃遠一點，大門換成深藍色的，和房間的門分得出來；椅子和矮書架重畫了。串燈改放在收納箱裡，想掛再拿出來。自己移過的東西都留在原地。',
    '主角改成 Q 版：大頭小身體、平塗的畫法。衣櫃多了鞋子（球鞋、短靴、皮鞋）和鞋子顏色，上衣、褲子、鞋子共用一組 16 色；眼睛多了「水汪汪」「Q版眼」，頭髮多了兩側和後面的「推高」、後面的「清爽」短髮（「捲瀏海」拿掉了，選它的會變回預設瀏海）。',
    '主角斜著走、或看左右牆上的東西時會微微側身；點主角的轉圈改成一格一格轉一圈。耳機改成放在書桌上。'
  ] },
  { v: '1.2.2', date: '2026-11-07', items: [
    '萬聖節限定（到 11/10）：晚上到院子抬頭看看，天上好像有什麼小小的東西飛來飛去……'
  ] },
  { v: '1.2.1', date: '2026-11-07', items: [
    '主角的頭髮重畫成日系動漫風：髮尾是尖的，有從髮根到髮尾的漸層、頭頂的天使光圈和一圈細細的描邊，整頭頭髮連成一塊。衣櫃的髮型改成分開選：瀏海 21 種、兩側 15 種、後面 6 種、造型 13 種（丸子、雙馬尾、辮子……）；原本選的髮型會換成最接近的組合。戴帽子時只有頭頂的呆毛和丸子收進帽子裡。',
    '臉型多了麻糬臉（新角色預設）；不蓋住耳朵的髮型會露出小小的耳朵。',
    '主角走路比較不會像在滑動：被手指帶著走、橫著走時不再一直重新起步或轉來轉去，院子裡走遠時也照樣踏步。'
  ] },
  { v: '1.2.0', date: '2026-11-07', items: [
    '山上開了古道具屋：老闆福爺不收錢，只收「言靈」。用言靈可以買東西擺進書房和院子，也能買衣服帽子給主角；店裡分室內、戶外、穿搭、限時（萬聖節限定賣到 11/10）。福爺寄了一封開張信到院子的信箱，附上 10 言靈。',
    '書房裡多了主角：點地板他會走過去，按住拖曳可以帶著他走；點房間裡的東西，他會先走過去再打開。右上角的衣櫃可以換臉型、髮型、五官、衣服和穿戴。',
    '擺設：書房和院子右上角的「擺設」可以搬動房間裡的東西，收納箱的東西直接拖出來擺，不要的拖回收納箱；書櫃、書桌、抽屜櫃、軟木板、日曆只能搬、不能收。窗戶也能搬到另一面牆或收起來。',
    '書房不再分成四段：畫面跟著主角走，在空白處滑動可以自由看，兩指（電腦用滾輪）放大縮小；房間裡的東西改成圖示，閒置幾秒後收起來，點東西本身照樣能用。晚上的書房也亮一點了。',
    '院子和電腦版一樣寬，手機可以左右滑動；院子也能擺戶外的東西，右上角和書房一樣有言靈、衣櫃、擺設、設定。點古道具屋，主角會跑上山。',
    '各頁右上角的登入、振假名、設定拿掉了：振假名在設定 › 外觀和題目下方的「⋯」，設定在書房和院子右上角；同步失敗時右上角會出現提醒。'
  ] },
  { v: '1.1.0', date: '2026-11-07', items: [
    'App 搬進一間書房：打開就在書房裡，每個功能都是房間裡的一樣東西。書桌上的筆記本是今日練習（名牌寫今天做到幾 %），耳機是聽一輪；書櫃是課程（每開始一個階段多一本課本），書櫃上層的卡片盒是單字；往右看，抽屜櫃是錯題本、軟木板是學習分析、日曆是模擬考；右上角齒輪是設定。手機左右滑動看房間不同的地方，電腦和橫放的平板看得到整間。下方的選單拿掉了，各頁左上角的「‹ 書房」回到房間。',
    '書房跟著時間變成白天、黃昏或晚上，晚上串燈隨今天的進度一顆顆亮起來；日曆上的紅色印章是連續天數。點房間裡的東西會先有一段動作再進頁面（書滑出、卡片跳出、耳機提起、日曆撕頁、抽屜拉開、開門）。',
    '從門出去是院子。房子旁邊的信箱收通知（歡迎、第 0 週、加到主畫面、網站搬家、舊版匯入），取代原本今日頁上方的橫幅；有新信時門的名牌會寫幾封，第一次還會在左上角提醒。',
    '主題改成「跟著時間／永夜／永晝」：跟著時間是白天淺色、晚上深色，和書房一起變，只在換頁時變，不會做題做到一半變色；永夜、永晝連書房和院子一起固定。原本選淺色的改成永晝，其他人都改成跟著時間。',
    '各頁換成書房的顏色（白天暖色紙張、晚上夜藍），也接上房間裡的東西：課程頁上方是書櫃（點書背跳到那個階段），每個階段是一本書的封面；單字的主題是索引卡、等級切換是分隔頁；錯題本是紅色筆記本，錯題列在橫線紙上；學習分析是軟木板；模擬考旁掛著日曆；聽一輪上方是耳機架，播放時飄音符。',
    '原本今日卡片上的東西換了地方：目前單元（含「前往下一單元」）在課程頁最上面；今天的範圍、說明、日期和連續天數在學習分析最上面；「今天新內容少一點」這類提示在當天第一組的第一個畫面。今日卡片裡的錯題本／單字播放器變成耳機點進去的「聽一輪」頁，工具與 AI 併到學習分析最下面。'
  ] },
  { v: '1.0', label: '1.0.x（2026-10-28 〜 11-05）', date: '2026-11-05', items: [
    '1.0.0（10-28）：第一個正式版：每日練習（到期複習加新內容，答錯的第 1、3、7 天回來）、八種單字題型、文法的排序與活用拼寫、聽一輪、錯題本、模擬考、學習分析、雲端音檔、多裝置同步、加到主畫面。',
    '1.0.1–1.0.5（10-28 〜 29）：版本號改成 1.0.x；聽一輪鎖屏也能一直播；活用題熟了改成自己拼，加上變化練習；聽力、閱讀答對後 30／90／180 天才再出，N5 聽力補約 200 題、閱讀約 100 篇。',
    '1.0.6–1.0.17（10-29）：新增「入門」：142 個假名、入門單字、第 0 週 20 題基本句型；課程頁改成四個階段，每階段有 40 題的階段測驗；單字頁分成入門／N5／N4，有主題卡和五十音表；設定大幅精簡。',
    '1.0.18–1.0.25（10-29 〜 31）：離線語音（先存今天要練的）；出題規則重整：今天的題目第一次打開就排好、複習照記憶強度排、新題數看最近 100 題的正確率；已熟練要五顆而且拼對過；拿掉「選正確句」；配對題改成六組；一組固定 20 題。',
    '1.0.26–1.0.32（10-31 〜 11-01）：學習分析可以分入門／N5／N4 看，加上課程進度預估；課程頁的階段可以收合；播放字卡加入漢字卡；雲端音檔搬到新伺服器；補 98 個 N5、N4 基礎字；新題一次一級，N5 學完才開始 N4。',
    '1.0.33–1.0.38（11-04）：N3 全部上線（單字 1,432、漢字 295、文法 133 點 815 題、聽力 195、閱讀 90、N3 模擬考）；大量讀音修正；拿掉自訂字卡；介面變簡單；雲端同步改成做完一組才上傳；每個文法考點至少 3 題。',
    '1.0.39–1.0.51（11-05）：網站搬到 nihongoquest.app；語音一律用雲端音檔；拿掉備份和快照，進度靠雲端同步；AI 改用網站自己的 Gemini，登入就能用；手機作答改版（選項在下方、結果面板從底部升起、字塊可以拖、按確定送出）；畫面動態、答題音效和連對。'
  ] },
  { v: '0', label: '1.0 之前（v4–v100，2026-10-24 〜 10-28）', date: '2026-10-28', items: [
    'v4（10-24）：雲端同步（Email 驗證碼）、PWA、IndexedDB、每日快照。',
    'v5–9（10-25）：依程度選起點；首次答對 3 天後再複習；聽力選項逐一點選播放；驗證碼 8 位；版本紀錄。',
    'v10–24（10-26）：文法／聽力／閱讀／漢字同一天只出一次；同步改條件式寫入；單字主題分頁與三段進度條；新字預習卡、三種題型都過才算熟練；今日單字集中 1–3 個主題；新文法不再被複習擠掉。',
    'v25–35（10-26）：Google Cloud TTS 與讀音指定；第 0 週入門；文法句意輪替；N4 補聽力與閱讀；假名拼字與配對題；課程資料拆檔；同步逐筆合併。',
    'v36–69（10-27）：每日規則重整（到期＋新內容、負荷上限、錯題 1／3／7 天階梯、單元自動推進、段落順序出題、再練一次換格式、手滑不算）；排序題改真排序；聽力整個級別抽題；「我已有基礎」與「我會了」；文法考點整併為 288 個並補 76 題；Gemini 自動換模型與快取；錯題本改版（快速過一輪、熟悉即移出）；單字庫整理（敬語、常用字、58 個漢字、每字兩句例句）；學習分析改版（儀表、7 天、建議）；API 申請說明。',
    'v70–100（10-28）：雲端音檔成為預設（日文一萬段、中文六千段）與離線下載；聽一輪誕生並一路演進（音樂播放器式控制列、排序題唸整句、首頁卡、圖示膠囊、例句中文、只唸完整句、字｜文、全螢幕橫式、初識單詞與帶進度條的主題選單）；學習紀錄搬到學習分析並改成數據；手機排版（下一題固定、鍵盤提示隱藏）；首頁壓成一頁再改成一張卡三段切換；加到主畫面說明；練習避開瀏海、底部不留白、關閉縮放與回彈。'
  ] }
];
const STORE_KEY = 'nihongo_quest_n4_v3';
const LEGACY_KEY = 'nihongo_quest_n4_v1';

// ---------- utils ----------
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
function esc(s) {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
function pad2(n) { return String(n).padStart(2, '0'); }
function dateStr(d) { return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`; }
function todayStr(offset = 0) { const d = new Date(); d.setDate(d.getDate() + offset); return dateStr(d); }
function parseDate(s) { const [y, m, d] = String(s).split('-').map(Number); return new Date(y, (m || 1) - 1, d || 1); }
function addDays(s, n) { const d = parseDate(s); d.setDate(d.getDate() + n); return dateStr(d); }
function daysBetween(a, b) { return Math.round((parseDate(b) - parseDate(a)) / 86400000); }
function shuffle(arr) { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
function uid(prefix) { return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`; }
function hashStr(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function deepClone(o) { return JSON.parse(JSON.stringify(o)); }
const HAS_KANJI = /[一-鿿々〆ヶ]/;
function jaPlain(s) { return JConj.stripReading(s); }          // 来[こ]ない → 来ない (display/TTS)
// ---- 活用題輸入模式: comparing what the learner typed or tiled against the conjugated answer ----
// comparison key: no spaces, katakana → hiragana, a bracketed reading replaces the kanji run before it (来[こ]ない → こない)
function kanaKey(s) {
  return JConj.normJa(String(s || '').replace(/[\s　]+/g, '').replace(/[ァ-ヶ]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0x60)));
}
// the answer written entirely in kana (行って → いって); kanji with no known reading stay as they are
function answerKana(ans) {
  const map = readingMapFrom(ans);
  return String(ans || '').replace(/[一-鿿々〆ヶ]+(?:\[[ぁ-ゖー]+\])?/g, run => { const k = run.replace(/\[.*$/, ''); const m = run.match(/\[([ぁ-ゖー]+)\]/); return m ? m[1] : (map[k] || k); });
}
// 行って and いって are both right; a wrong form is wrong, no partial credit
function conjMatch(typed, ans) {
  const t = kanaKey(typed);
  return Boolean(t) && (t === kanaKey(ans) || t === kanaKey(jaPlain(ans)) || t === kanaKey(answerKana(ans)));
}
// tile tokens: a kanji run (with its bracketed reading) is one tile, every kana its own
function conjTokens(ans) { return String(ans || '').match(/[一-鿿々〆ヶ]+(?:\[[ぁ-ゖー]+\])?|[\s\S]/gu) || []; }
// the answer's tiles plus 3–4 kana from the wrong forms (so the tiles do not spell the answer out), shuffled
function conjTiles(ans, wrongs) {
  const own = conjTokens(ans);
  const extra = [];
  (wrongs || []).forEach(w => conjTokens(w).forEach(tok => { if (!own.includes(tok) && !extra.includes(tok) && !/[一-鿿]/.test(tok)) extra.push(tok); }));
  const pool = shuffle(Object.keys(KANA_ROMAJI).filter(k => k !== 'を' && !own.includes(k) && !extra.includes(k)));
  while (extra.length < 3 && pool.length) extra.push(pool.pop());
  return shuffle(own.concat(shuffle(extra).slice(0, 4)));
}
// index of the first differing character (by code point), -1 when equal
function firstDiff(a, b) {
  const A = [...String(a || '')], B = [...String(b || '')];
  for (let i = 0; i < Math.max(A.length, B.length); i++) if (A[i] !== B[i]) return i;
  return -1;
}
function jaKana(s) { return String(s || '').replace(/[一-鿿々〆ヶ]+\[([ぁ-ゖー]+)\]/g, '$1'); } // for TTS readings
// Vocab examples mark the target word with braces: 毎朝パンを{食べます}。
function exPlain(ex) { return String(ex || '').replace(/[{}]/g, ''); }
// ---------- default state ----------
function defaultSettings() {
  return {
    loadCap: 100,            // 每天負荷上限 until 1.0.20; nothing reads it now (old copies keep theirs)
    showZh: true,
    furigana: true,
    speechRate: 1.0,
    ambientVol: 1,           // 環境音 0–1 (0: none): things tapped, footsteps, each place's background (SND; a switch until 2026-11-12, the user)
    musicVol: 1,             // 音樂 0–1 (0: none): the gramophone's records (MUSIC; likewise). 答題音效 is always on since then (SFX)
    theme: 'clock',          // 跟著時間 | 永夜 'night' | 永晝 'day' (1.1.0; older saves: dark／auto, light — themeMode)
    examDate: '2027-07-04',
    examLevel: 'N4',         /* level-literal-ok: default */ // the JLPT level the exam date is for: 學習分析 and the exam countdown project against it (1.0.26)
    duolingoScore: 22,
    examInstant: false,
    examFormal: false,
    furiMode: 'smart',       // smart: no furigana on mastered words | all — furigana:false hides all
    newKanaPerDay: 15,       // 每天新假名 until 1.0.20; nothing reads it now (入門's new kana come from the day's new count)
  };
}
// 每天新題數不再讓使用者逐項設定：全部由「每天負荷上限」依固定比例推算（上限 100 時為 單字 8・文法 6・漢字 3・聽力 3・變化練習 3）
function defaultState() {
  return {
    v: 3,
    updatedAt: null,
    createdAt: todayStr(),
    settings: defaultSettings(),
    currentUnit: 'm1',
    completedUnits: [],
    unitMarks: {},          // 2026-11-11: 我的標記 a unit's page set: { unit id: 2 | 5 } (0★: not here), see 'mark-unit'
    srs: {},
    customGrammar: [],      // AI-generated or user-added grammar items
    customExam: [],
    hidden: [],             // ids of hidden built-in items
    lessonSeen: [],         // lesson sections already shown as a card in practice ('m1:0')
    themeLane: { order: [], count: {} },   // new-word theme lanes: rotation order and words supplied per theme (see laneOrder)
    mistakes: [],
    dailyLogs: {},
    examHistory: [],
    stageTests: {},         // 階段測驗紀錄: { pre|p1|p2|p3: [{ date, correct, total, passed }] } newest first, 10 kept
    questionHistory: {},
    unitAiNotes: {},
    ttsConfig: null,
    today: { date: todayStr(), newV: 0, newG: 0, newK: 0, newL: 0, newR: 0, newC: 0, newA: 0 },
    statsFmt: {},
    recent: [],
    legacy: null,
    notices: [],
    koto: { daySets: {}, days: [], listen: {}, mail: {}, found: {}, sets: {}, gift: 0 },   // 言靈 (1.2.0), see kotoBalance
    owned: {},              // things bought at 古道具屋: { id: { paid, on } }
    lampsOff: {},           // test (2026-11-09): the lamps switched off by a tap ({ id: true }: desk, chest, nightTable, or a ware's id)
    mail: null,             // 2026-11-11: the mailbox, with the progress: { got: { id: day }, read: { id: day } } (null: not set up yet, see letterBox)
    record: '',             // test (2026-11-09): the record on the gramophone (MUSIC.RECORDS; '' the first)
    musicOff: false,        // test (2026-11-09): the gramophone stopped by hand
    met: {},                // test (2026-11-09): the neighbours who have come by (NPCS): { id: the day }
    storyV: 0,              // test (2026-11-09): the version of the opening (STORY.V) seen, 0 none
    storyAt: 0,             // 2026-11-11: when the opening was closed (ms; 0 before it, or seen before this was kept): 小春 knocks a minute on
    town: { done: {}, seen: {}, stops: {}, talks: {} },   // test (2026-11-09): the town's events (TOWNEV): done { id: day }, people met { id: 1 }, bus stops opened { id: 1 }; talks { id: chats with them } (2026-11-12)
    placed: {},             // where owned things stand in 書房: { id: { w: 'F', x, y, r } | { w: 'L'|'R', u, v } }; not here = in the storage box
    wear: {},               // what the hero wears, by part: { head, face, neck, back, body }
    house: ''               // the yard's house: '' the cottage, or a look bought at 古道具屋 (1.2.0)
  };
}

let state = defaultState();
let storageOk = true;

const saveHooks = [];            // called after every saveState(); Sync registers here
let pendingWrite = null;         // coalesces several saveState() calls in one tick into one write
let stateRev = 0;                // monotonic revision counter so same-millisecond saves still invalidate caches
const STATE_CHANNEL = ('BroadcastChannel' in window) ? new BroadcastChannel('nq-state') : null;

function saveState() {
  state.updatedAt = new Date().toISOString();
  stateRev++;
  DAILY_CACHE = null;
  if (!pendingWrite) pendingWrite = Promise.resolve().then(flushState);
  saveHooks.forEach(h => { try { h(); } catch (e) { /* a sync hook must never break saving */ } });
}

function saveLocal() { if (!pendingWrite) pendingWrite = Promise.resolve().then(flushState); }   // on this device only (no upload): the next saveState takes it along
async function flushState() {
  pendingWrite = null;
  const snapshot = state;
  let ok = await Store.set('state', snapshot);
  if (!ok) {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(snapshot)); ok = true; } catch (e) { ok = false; }
  }
  if (ok) storageOk = true;
  else {
    if (storageOk) toast('瀏覽器儲存空間已滿，進度可能沒有存到。有登入雲端同步的話，進度會存在雲端。', 6000);
    storageOk = false;
  }
  if (ok && STATE_CHANNEL) { try { STATE_CHANNEL.postMessage({ type: 'saved', updatedAt: snapshot.updatedAt }); } catch (e) { /* ignore */ } }
}

function normalizeState(s) {
  stateRev++;
  if (typeof DAILY_CACHE !== 'undefined') DAILY_CACHE = null;
  const base = defaultState();
  const out = Object.assign(base, s || {});
  out.settings = Object.assign(defaultSettings(), (s && s.settings) || {});
  // v65: 每日目標 became 每天負荷上限 (a brake, not a target); an old goal below 40 would brake every day
  if (!(s && s.settings && 'loadCap' in s.settings)) out.settings.loadCap = Math.max(40, Number(out.settings.dailyGoal) || 0);
  delete out.settings.dailyGoal;
  // v69: the v65 default of 40 became 100 (reviews are never cut, so 40 braked the new items within weeks); raised once, a cap set by hand stays
  if (out.settings.loadCap === 40 && !out.settings.capRaised) out.settings.loadCap = 100;
  out.settings.capRaised = true;
  // 1.0.15: no longer settings — the speech switches are always on, 複習強度 is fixed (RETENTION, since 1.0.21), 入門 ends by itself
  ['autoSpeak', 'listening', 'audioOptions', 'retention'].forEach(k => { delete out.settings[k]; });
  // 1.0.25: neither are 每組練習題數 (SESSION_SIZE) and 出題順序 (words and grammar always mixed)
  ['sessionSize', 'order'].forEach(k => { delete out.settings[k]; });
  delete out.settings.includeImported;   // 1.0.34: 每日練習包含自訂字卡 went with the custom cards
  // 2026-11-12: 環境音 and 音樂 are volumes (a switch off: none), 答題音效 always on
  const vol = (k, was) => { const v = s && s.settings && s.settings[k]; out.settings[k] = typeof v === 'number' && Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : s && s.settings && s.settings[was] === false ? 0 : 1; };
  vol('ambientVol', 'ambient'); vol('musicVol', 'music');
  ['sfx', 'ambient', 'music'].forEach(k => { delete out.settings[k]; });
  if (!courseLevels().includes(out.settings.examLevel)) out.settings.examLevel = DEFAULT_LEVEL;
  delete out.preDoneDismissed; delete out.preFinished;
  delete out.lastSnapshot;   // 1.0.47: the daily snapshots are gone
  ['srs', 'dailyLogs', 'questionHistory', 'unitAiNotes', 'statsFmt', 'stageTests', 'unitMarks'].forEach(k => { if (!out[k] || typeof out[k] !== 'object' || Array.isArray(out[k])) out[k] = {}; });
  for (const k in out.srs) { const r = out.srs[k]; if (r && r.known) { r.mark = 5; delete r.known; } }   // 2026-11-11: 我會了 is 我的標記's five stars
  ['customGrammar', 'customExam', 'hidden', 'mistakes', 'examHistory', 'completedUnits', 'recent', 'notices', 'lessonSeen'].forEach(k => { if (!Array.isArray(out[k])) out[k] = []; });
  // 1.2.0: 言靈 and the things from 古道具屋 (ids this build does not know are kept: a later one may sell them)
  const kt = out.koto && typeof out.koto === 'object' && !Array.isArray(out.koto) ? out.koto : {}, obj = (v) => (v && typeof v === 'object' && !Array.isArray(v) ? v : {});
  out.koto = { daySets: obj(kt.daySets), days: Array.isArray(kt.days) ? kt.days : [], listen: obj(kt.listen), mail: obj(kt.mail), found: obj(kt.found), sets: obj(kt.sets), gift: Number(kt.gift) || 0 };
  const tw = obj(out.town), talks = {}; Object.entries(obj(tw.talks)).forEach(([id, n]) => { const k = Math.floor(Number(n)); if (k > 0) talks[id] = k; });
  out.town = { done: obj(tw.done), seen: obj(tw.seen), stops: obj(tw.stops), talks };
  out.mail = out.mail && typeof out.mail === 'object' && !Array.isArray(out.mail) ? { got: obj(out.mail.got), read: obj(out.mail.read) } : null;
  if (typeof out.resetAt !== 'string') out.resetAt = '';   // 1.9.1: when 重設所有進度 was last pressed (the cloud's guard lets that one shrink through)
  ['owned', 'placed', 'wear', 'look', 'lampsOff', 'met'].forEach(k => { if (!out[k] || typeof out[k] !== 'object' || Array.isArray(out[k])) out[k] = {}; });   // look: how the hero looks (HERO.norm fills the rest)
  if (typeof out.house !== 'string') out.house = '';
  if (typeof out.record !== 'string') out.record = ''; out.musicOff = out.musicOff === true; out.storyV = Number(out.storyV) || (out.storySeen === true ? 1 : 0); delete out.storySeen; out.storyAt = Number(out.storyAt) || 0;   // the four-page opening was 1   // an id this build does not know is kept: the cottage is drawn meanwhile
  // 1.2.0: 羽織 and 地球儀 are gone and their purchases with them, and 書房's umbrella (the user's calls; the only ids not
  // kept: what was paid comes back). Every time: sync merges owned as a union
  delete out.owned.haori; if (out.wear.body === 'haori') delete out.wear.body;
  delete out.owned.globe; delete out.placed.globe; delete out.placed.umbrella;
  // 1.2.0: 書房's own furniture and pictures became wares (moved, put away): laid out where they always stood, once
  if ((out.roomV || 0) < 2) { WARES.filter(w => w.starter).forEach(w => { if (!out.placed[w.id]) out.placed[w.id] = Object.assign({}, w.at); }); out.roomV = 2; }
  // 1.2.0 (roomV 3): the string of lights became four strings, hung where it ran; the desk and the window moved right
  if (out.roomV < 3) { WARES.filter(w => w.garland).forEach(w => { if (!out.placed[w.id]) out.placed[w.id] = Object.assign({}, w.at); }); ROOM.moveOff(out.placed); out.roomV = 3; }
  // 1.2.0 (roomV 4): 望遠鏡 went out to the yard; one standing in 書房 waits in the yard's box
  if (out.roomV < 4) { const t = out.placed.telescope; if (t && t.w !== 'Y') delete out.placed.telescope; out.roomV = 4; }
  // 1.2.0 (roomV 5): the window became a ware (moved along a wall, put away); it hangs where it always was, once
  if (out.roomV < 5) { if (!out.placed.window) out.placed.window = Object.assign({}, WARE.get('window').at); out.roomV = 5; }
  // 1.3.0 (roomV 7): 書房 grew, the bedroom is a room of its own; the bed and its things move in, 書房's own things spread out
  if (out.roomV < 7) { ROOM.settle(out.placed); out.roomV = 7; }
  // test (roomV 8): the strings of lights come down into the storage box, 腳踏墊 is gone (the user's call), more windows and wall
  // lamps, the desk further off the bookcase, the kotatsu by the low shelf, the round rug in front of the desk
  if (out.roomV < 8) { delete out.placed.doorMat; ROOM.settle8(out.placed); out.roomV = 8; }
  // test (roomV 9): the full-length mirror stood by the wardrobe; it became 小春's present (NPCS), so nothing is set out now
  if (out.roomV < 9) out.roomV = 9;
  WARES.filter(w => w.fixed).forEach(w => { if (!out.placed[w.id]) out.placed[w.id] = Object.assign({}, w.at); });   // the working things are always somewhere
  if (!DATA.UNITS.some(u => u.id === out.currentUnit)) out.currentUnit = 'm1';
  if (out.stage !== 'pre' && out.stage !== 'main') out.stage = 'main';   // 入門階段 (1.0.6); accounts from before it are in the main course
  if (typeof out.kanaKnown !== 'boolean') out.kanaKnown = false;
  if (!out.themeLane || !Array.isArray(out.themeLane.order)) out.themeLane = { order: [], count: {} };
  if (!out.themeLane.count || typeof out.themeLane.count !== 'object') out.themeLane.count = {};
  // 1.0.8: themes were renamed per level; an old lane order keeps its place under the new names
  const mig = (c) => themeOrder().includes(c) ? c : (THEME_MIGRATE[c] || c);   // a current name (入門 問候) is never an old one
  out.themeLane.order = [...new Set(out.themeLane.order.map(mig))];
  out.themeLane.count = Object.fromEntries(Object.entries(out.themeLane.count).map(([c, n]) => [mig(c), n]));
  if (!out.today || out.today.date !== todayStr()) out.today = { date: todayStr(), newV: 0, newG: 0, newK: 0, newL: 0, newR: 0, newC: 0, newA: 0 };
  if ('ans' in out.today && !(Array.isArray(out.today.ans) && out.today.ans.every(k => typeof k === 'string'))) delete out.today.ans;
  if ('plan' in out.today && !(out.today.plan && typeof out.today.plan === 'object' && out.today.plan.lists && typeof out.today.plan.lists === 'object')) delete out.today.plan;
  Object.values(out.srs).forEach(ensureFsrs);
  Object.entries(out.srs).forEach(([k, r]) => { if (k.startsWith('v:') && (!r.f || typeof r.f !== 'object')) r.f = {}; });   // words answered before per-format tracking
  delete out.aiConfig;   // 1.0.49: AI runs on the site's own key; the keys learners entered are dropped
  if (out.ttsConfig && typeof out.ttsConfig === 'object' && out.ttsConfig.engine !== 'cloud') out.ttsConfig.engine = 'cloud';   // 1.0.40: no speech service of one's own any more; whatever was chosen plays the cloud clips
  // built-in words merged into another entry (名詞 + 名詞する → one card): the record follows; when both exist the one answered more stays
  Object.entries(DATA.VOCAB_MERGED || {}).forEach(([from, to]) => {
    const a = out.srs['v:' + from]; if (!a) return;
    const b = out.srs['v:' + to];
    if (!b || (a.n || 0) > (b.n || 0)) out.srs['v:' + to] = a;
    delete out.srs['v:' + from];
  });
  // 1.0.22: a word asked with its second example saved that example twice in the notebook's explanation (see withExample);
  // the second line becomes the word's other example
  const wordsById = out.mistakes.some(m => m && typeof m.why === 'string' && String(m.key || '').startsWith('v:')) ? new Map(DATA.VOCAB.map(v => [v.id, v])) : null;
  if (wordsById) out.mistakes.forEach(m => {
    const v = m && typeof m.why === 'string' && String(m.key || '').startsWith('v:') && wordsById.get(m.key.slice(2));
    if (!v || !v.ex2) return;
    const twice = exampleLine({ ex: v.ex2, exZh: v.exZh2 || '' });
    if (m.why.endsWith(twice + twice)) m.why = m.why.slice(0, -twice.length) + exampleLine({ ex: v.ex, exZh: v.exZh || '' });
  });
  // 1.0.23: 選正確句 is gone. The built-in items of that type left the bank (DATA.GRAMMAR_REMOVED) and AI ones go too:
  // their schedule and notebook entries with them
  const goneIds = new Set((DATA.GRAMMAR_REMOVED || []).concat(out.customGrammar.filter(g => g && g.t === 'correct').map(g => g.id)));
  if (goneIds.size) {
    out.customGrammar = out.customGrammar.filter(g => !(g && goneIds.has(g.id)));
    goneIds.forEach(id => { delete out.srs['g:' + id]; });
    out.mistakes = out.mistakes.filter(m => !(m && typeof m.key === 'string' && m.key.startsWith('g:') && goneIds.has(m.key.slice(2))));
  }
  // 1.0.34: custom and imported cards (自訂字卡, the Anki and text import, AI 產生字卡) are gone, and so are their schedule and
  // notebook entries: the cards in the list, and the ids the app gave such cards (cust_ 自建, ai_ AI, apkg_ Anki). Only those: a word
  // this copy does not know may be a later release's, synced from another device. An entry written by hand stays.
  const cards = new Set((Array.isArray(out.vocab) ? out.vocab : []).map(v => v && 'v:' + v.id));
  delete out.vocab;
  const gone = (k) => typeof k === 'string' && (cards.has(k) || /^v:(cust|ai|apkg)_/.test(k));
  Object.keys(out.srs).forEach(k => { if (gone(k)) delete out.srs[k]; });
  out.mistakes = out.mistakes.filter(m => !(m && gone(m.key)));
  return out;
}

// 1.8.2 (2026-11-11): progress that is on this device but cannot be read (the course data did not load, a fault in this
// version) is never replaced by a fresh start: the app stops instead (init), saves nothing and syncs nothing, so neither this
// copy nor the cloud's is lost. On 2026-11-11 a fresh start saved here went up and replaced a learner's whole progress.
let STATE_UNREADABLE = null;
async function loadState() {
  const stored = await Store.get('state');
  if (stored) {
    try { state = normalizeState(stored); return 'loaded'; } catch (e) { console.warn('stored state invalid', e); STATE_UNREADABLE = e; return 'unreadable'; }
  }
  let raw = null;
  try { raw = localStorage.getItem(STORE_KEY); } catch (e) { storageOk = false; }
  if (raw) {
    // first run of this version: copy into IndexedDB, keep the localStorage copy as a safety net
    try { state = normalizeState(JSON.parse(raw)); await Store.set('state', state); return 'migrated'; } catch (e) { console.warn('state parse failed', e); STATE_UNREADABLE = e; return 'unreadable'; }
  }
  let legacyRaw = null;
  try { legacyRaw = localStorage.getItem(LEGACY_KEY); } catch (e) { /* ignore */ }
  if (legacyRaw) {
    try {
      state = normalizeState(migrateLegacy(JSON.parse(legacyRaw)));
      saveState();
      return 'migrated';
    } catch (e) { console.warn('legacy migration failed', e); STATE_UNREADABLE = e; return 'unreadable'; }
  }
  state = normalizeState(defaultState());   // currentUnit is m1: everyone starts at week 1 unless they pick another start in 課程; 書房's own things laid out
  saveState();
  return 'fresh';
}

// ---------- migration from v1 (Gemini version) ----------
const SEED_NOTES = new Set([
  '多鄰果日常練習 60 分鐘，開始感覺只靠刷題對助詞に/で有點模糊', '複習平假名與片假名長音、促音，準備系統化整理 N5 語法',
  '背誦 N5 常用時間名詞（今日、明日、来週、毎朝）', '練習五段動詞ます形轉辭書形', '搞懂了「バスに乗ります」為什麼用「に」而不是「を」',
  '多鄰果推進至 22 分！決定啟動 9 個月 N4 衝刺計畫', '練習五段動詞「て形」促音便（う・つ・る → って）',
  '練習五段動詞「て形」鼻音便（む・ぶ・ぬ → んで）與行く特例', '背誦 N5 形容詞反義詞配對（大きい↔小さい、高い↔安い）',
  '完成 15 張單字閃卡與場所助詞辨析', '練習「〜てください」與「〜ないでください」造句', '多鄰果 1 小時 + 整理第一批易錯助詞進錯題本'
]);
const SEED_MISTAKES = { m_init_1: 2, m_init_2: 3, m_init_3: 1 };
// the old version also pre-filled the first day with 2 vocab + 1 grammar under this note
const SEED_FIRST_DAY = '啟動 9 個月 N4 本地端學習系統！目標每天點亮熱力圖！';

function boxFromStats(correct, wrong) {
  correct = correct || 0; wrong = wrong || 0;
  if (correct <= 0 && wrong <= 0) return -1;
  if (wrong > correct) return 0;
  return clamp(correct - Math.floor(wrong / 2), 1, 4);
}
function seedSrs(key, box, n, ok, ng) {
  if (box < 0) return;
  const t = todayStr();
  const iv = SRS_DAYS[box] || 0;
  const spread = iv ? hashStr(key) % (iv + 1) : 0;
  state.srs[key] = { b: box, due: addDays(t, Math.min(spread, iv)), n: n || ok + ng || 1, ok: ok || 0, ng: ng || 0, st: box > 0 ? 1 : 0, last: addDays(t, -1), lapse: 0, intro: t };
}

function migrateLegacy(old) {
  const prev = state;
  state = defaultState();
  const s = state;
  const notes = [];
  const st = s.settings;
  if (typeof old.dailyGoal === 'number') st.loadCap = Math.max(40, old.dailyGoal);
  if (typeof old.speechRate === 'number') st.speechRate = old.speechRate;
  if (typeof old.duolingoScore === 'number') st.duolingoScore = old.duolingoScore;
  st.furigana = old.showFurigana !== false;

  // logs (drop the 12 demo days the old version created on first run)
  let removedDemo = 0;
  Object.entries(old.dailyLogs || {}).forEach(([d, e]) => {
    if (!e) return;
    if (SEED_NOTES.has(e.note)) { removedDemo++; return; }
    const entry = { date: d, vocabCount: e.vocabCount || 0, grammarCount: e.grammarCount || 0, quizCount: e.quizCount || 0, bonusCount: e.bonusCount || 0, minutes: e.minutes || 0, topics: e.topics || [], mistakeTopics: e.mistakeTopics || [], note: e.note || '', tag: e.tag || '' };
    if (e.note === SEED_FIRST_DAY) {
      entry.vocabCount = Math.max(0, entry.vocabCount - 2); entry.grammarCount = Math.max(0, entry.grammarCount - 1);
      entry.minutes = Math.max(0, entry.minutes - 15); entry.note = ''; entry.tag = '';
      removedDemo++;
      if (!dayTotal(entry)) return;
    }
    s.dailyLogs[d] = entry;
  });
  if (removedDemo) notes.push(`移除了舊版首次開啟時自動產生的 ${removedDemo} 天示範打卡紀錄。`);

  // vocab: built-in cards → SRS of the new list (the old version's own and imported cards are not kept since 1.0.34)
  const builtinIds = new Set(Object.keys(DATA.LEGACY_VOCAB_MAP || {}));
  (old.vocab || []).forEach(v => {
    if (!v || !v.kanji || !(builtinIds.has(v.id) || /^v\d+$/.test(v.id || ''))) return;
    const mastery = v.mastery || 0;
    const nid = DATA.LEGACY_VOCAB_MAP[v.id] || (DATA.VOCAB.find(x => x.w === v.kanji) || {}).id;
    if (nid && mastery > 0) seedSrs('v:' + nid, clamp(mastery, 1, 4), mastery, mastery, 0);
  });

  // grammar drills
  const builtinG = new Set(DATA.GRAMMAR.map(g => g.id));
  const legacyUnit = {};
  let aiKept = 0;
  (old.grammarDrills || []).forEach(d => {
    if (!d || !d.id) return;
    const c = d.correctCount || 0; const w = d.wrongCount || 0;
    if (builtinG.has(d.id)) {
      const b = boxFromStats(c, w);
      if (b >= 0) seedSrs('g:' + d.id, b, c + w, c, w);
      return;
    }
    if (String(d.id).startsWith('syn_')) {
      const u = d.milestoneId || 'm1';
      legacyUnit[u] = legacyUnit[u] || { correct: 0, seen: 0 };
      if (c > 0 || w > 0) legacyUnit[u].seen++;
      if (c > 0) legacyUnit[u].correct++;
      return;
    }
    if (String(d.id).startsWith('ai_') && d.promptJp && Array.isArray(d.options) && d.options.includes(d.answer)) {
      const item = {
        id: d.id, u: DATA.UNITS.some(x => x.id === d.milestoneId) ? d.milestoneId : guessUnitFromCategory(d.category, d.level),
        t: 'choice', lv: courseLevels().includes(d.level) ? d.level : DEFAULT_LEVEL, d: 2, pt: d.category || 'AI 題目', jp: d.promptJp, op: d.options.slice(0, 4),
        a: d.answer, zh: String(d.promptZh || '').replace(/^\[[^\]]*\]\s*/, '').replace(/^【[^】]*】/, ''),
        why: String(d.explanation || '').replace(/^\[[^\]]*\]\s*/, ''), src: 'ai'
      };
      if (item.op.length === 4 && /（[^）]*）/.test(item.jp)) {
        s.customGrammar.push(item);
        aiKept++;
        const b = boxFromStats(c, w);
        if (b >= 0) seedSrs('g:' + item.id, b, c + w, c, w);
      }
    }
  });
  if (Object.keys(legacyUnit).length) {
    s.legacy = { unitPractice: legacyUnit };
    notes.push('舊版自動產生的重複題目不再沿用（它們大多只換主詞或時間），你在各單元的作答數仍保留在單元頁。');
  }
  if (aiKept) notes.push(`保留了 ${aiKept} 道 AI 產生的文法題。`);
  (old.deletedQuestionIds || []).forEach(id => { if (builtinG.has(id)) s.hidden.push(id); });

  // mistakes
  let demoMist = 0;
  (old.mistakes || []).forEach(m => {
    if (!m || !m.prompt) return;
    if (SEED_MISTAKES[m.id] !== undefined && (m.errorCount || 0) <= SEED_MISTAKES[m.id]) { demoMist++; return; }
    const linked = DATA.GRAMMAR.find(g => g.jp === m.prompt);
    s.mistakes.push({
      id: m.id || uid('mk'), key: linked ? 'g:' + linked.id : '', cat: m.category || '綜合', prompt: m.prompt,
      answer: m.correctAnswer || '', wrong: m.wrongAnswer || '', why: m.explanation || '', count: m.errorCount || 1,
      streak: m.correctStreak || 0, mastered: Boolean(m.mastered), note: m.userNote || '', date: todayStr()
    });
  });
  if (demoMist) notes.push(`移除了 ${demoMist} 題示範錯題。`);

  // exams
  s.examHistory = (old.examHistory || []).filter(h => h && h.id !== 'ex_seed_1');
  if ((old.examHistory || []).some(h => h && h.id === 'ex_seed_1')) notes.push('移除了 1 筆示範考試成績。');
  s.questionHistory = old.questionHistory || {};
  (old.assessmentQuestions || []).forEach(q => {
    if (!q || !String(q.id || '').startsWith('ai_') || !q.question || !Array.isArray(q.options) || !q.options.includes(q.answer)) return;
    const lv = (q.level === 'n4' || (Array.isArray(q.mode) && q.mode.includes('n4') && !q.mode.includes('n5'))) ? 'N4' : 'N5';   /* level-literal-ok: the old app's own two levels */
    s.customExam.push({ id: q.id, lv, m: String(q.mondaiCode || 'S2-M1').replace(/^N[1-5]-/, ''), q: q.question, passage: q.passage || '', op: q.options.slice(0, 4), a: q.answer, why: q.explanation || '', speak: q.speak || '', isListening: Boolean(q.isListening), src: 'ai' });
  });

  s.ttsConfig = old.ttsConfig || null;
  s.unitAiNotes = old.unitAiSupplements || {};
  s.completedUnits = (old.completedMilestones || []).filter(id => DATA.UNITS.some(u => u.id === id));

  // current unit: where the learner has actually been practising, otherwise the Duolingo recommendation
  let cur = '';
  const unitOrder = DATA.UNITS.map(u => u.id);
  Object.entries(legacyUnit).forEach(([u, v]) => { if (v.seen >= 15 && unitOrder.indexOf(u) > unitOrder.indexOf(cur)) cur = u; });
  if (!cur) cur = unitOrder.find(u => !s.completedUnits.includes(u)) || 'm1';
  const rec = recommendUnit(st.duolingoScore);
  if (!Object.keys(legacyUnit).length && !s.completedUnits.length) cur = rec;
  s.currentUnit = cur;
  const unit = DATA.UNITS.find(u => u.id === cur);
  notes.unshift(`已從舊版匯入你的學習紀錄。目前進度單元設為「${unit.weeks}・${unit.short}」，可在「課程」頁更改。`);
  s.notices = [{ id: 'migrated', date: todayStr(), lines: notes }];
  state = prev;
  return s;
}

function guessUnitFromCategory(cat, level) {
  const c = String(cat || '');
  if (/助詞/.test(c)) return 'm1';
  if (/形容詞/.test(c)) return 'm2';
  if (/動詞/.test(c)) return level === 'N4' ? 'm7' : 'm3';   /* level-literal-ok: old categories */
  if (/N5/.test(c)) return 'm6';   /* level-literal-ok: old categories */
  return 'm10';
}

function recommendUnit(score) {
  const s = Number(score) || 22;
  if (s < 15) return 'm1';
  if (s <= 23) return 'm2';
  if (s < 30) return 'm3';
  if (s <= 35) return 'm7';
  if (s < 42) return 'm8';
  if (s < 50) return 'm10';
  return 'm13';
}

// ---------- item registry ----------
const UNIT_INDEX = {};
DATA.UNITS.forEach((u, i) => { UNIT_INDEX[u.id] = i; });
// 第 0 週 is a pseudo-unit: its lesson is DATA.LESSONS.m0 and its grammar items say u: 'm0', but it is not one of the
// DATA.UNITS (course progress, the start picker and the stages by phase never see it). unitOrder puts it before m1; it is
// only ever compared, never used as an index, and state.currentUnit is never m0.
const INTRO_UNIT = { id: 'm0', ph: 0, weeks: '第 0 週', lv: 'PRE_N5', short: '基本句型', title: '開始之前：假名、基本句型、品詞名稱', desc: '入門用的講解；第 2–4 節的句型每天會出幾題。' };
function unitById(id) { return id === 'm0' ? INTRO_UNIT : (DATA.UNITS.find(u => u.id === id) || DATA.UNITS[0]); }
function unitOrder(id) { return id === 'm0' ? -1 : UNIT_INDEX[id] !== undefined ? UNIT_INDEX[id] : 0; }

let REG = { vocab: [], grammar: [], listen: [], read: [], kanji: [], drills: [], kana: [], byKey: new Map() };
function buildRegistry() {
  refreshLevels();
  const hidden = new Set(state.hidden || []);
  const vocab = [];
  DATA.VOCAB.forEach(v => { if (!hidden.has(v.id)) vocab.push(Object.assign({ key: 'v:' + v.id, kind: 'v', builtin: true }, v)); });
  const grammar = [];
  DATA.GRAMMAR.forEach(g => { if (!hidden.has(g.id)) grammar.push(Object.assign({ key: 'g:' + g.id, kind: 'g', builtin: true }, g)); });
  (state.customGrammar || []).forEach(g => { if (g && g.id) grammar.push(Object.assign({ key: 'g:' + g.id, kind: 'g', builtin: false }, g)); });
  // the app's own fields come last: a reading passage's "kind" (memo, email …) is kept as rkind
  const listen = (DATA.LISTEN || []).filter(x => !hidden.has(x.id)).map(x => Object.assign({}, x, { key: 'l:' + x.id, kind: 'l', builtin: true, lkind: x.kind }));   // lkind: 'gist' 概要理解, 'point' ポイント理解 (1.0.33)
  const read = (DATA.READ || []).filter(x => !hidden.has(x.id)).map(x => Object.assign({}, x, { key: 'r:' + x.id, kind: 'r', builtin: true, rkind: x.kind }));
  const kanji = (DATA.KANJI || []).map((x, i) => Object.assign({}, x, { key: 'k:' + x.k, kind: 'k', builtin: true, id: 'k-' + x.k, order: i })).filter(x => !hidden.has(x.id));
  const byKey = new Map();
  // 變化練習: one item per conjugation family the course drills (て形, 受身形 …), reached with the unit that first teaches it
  const fams = new Map();
  DATA.GRAMMAR.forEach(g => {
    if (g.t !== 'conj' || !g.f) return;
    const fam = formFamily(g.f); if (fam === 'dict' || !FORM_LABEL[fam]) return;
    const d = fams.get(fam) || fams.set(fam, { key: 'c:' + fam, kind: 'c', id: 'c-' + fam, fam, forms: [], u: g.u, builtin: true }).get(fam);
    if (!d.forms.includes(g.f)) d.forms.push(g.f);
    if (unitOrder(g.u) < unitOrder(d.u)) d.u = g.u;
  });
  const drills = [...fams.values()].filter(d => !hidden.has(d.id)).sort((a, b) => unitOrder(a.u) - unitOrder(b.u));
  const kana = kanaItems().filter(k => !hidden.has(k.id));   // 假名辨識 (kind a): the tables live in this file, not in data.js
  [vocab, grammar, listen, read, kanji, drills, kana].forEach(list => list.forEach(x => byKey.set(x.key, x)));
  REG = { vocab, grammar, listen, read, kanji, drills, kana, byKey };
  BUILTIN_ALL = DATA.VOCAB.map(v => Object.assign({ key: 'v:' + v.id, kind: 'v', builtin: true }, v));   // hidden ones too
  const spell = new Map(); BUILTIN_ALL.forEach(v => { const k = jaPlain(v.w); spell.set(k, (spell.get(k) || []).concat([v.r])); });
  HOMOGRAPHS = new Map([...spell].filter(([, rs]) => new Set(rs).size > 1));   // spelling → the readings built-in words give it (四: よん, し)
  const rank = (v) => [/^(n[54]g|n[321][a-z])-/.test(v.id) ? 1 : 0, ALL_LEVELS.indexOf(courseLevel(v.lv)), v.id];
  const before = (a, b) => { const x = rank(a), y = rank(b); return x[0] - y[0] || x[1] - y[1] || (x[2] < y[2] ? -1 : 1); };
  FIRST_OF = new Map(); BUILTIN_ALL.forEach(v => { const k = jaPlain(v.w); if (HOMOGRAPHS.has(k) && (!FIRST_OF.has(k) || before(v, FIRST_OF.get(k)) < 0)) FIRST_OF.set(k, v); });
  buildFuriganaIndex();
}

// ---------- SRS: FSRS-4.5 ----------
// Each record keeps stability s (days until recall drops to 90%), difficulty d (1–10) and a derived level b (0–7)
// used for display and question formats. Answers anywhere in the app go through srsAnswer().
const FSRS_W = [0.4872, 1.4003, 3.7145, 13.8206, 5.1618, 1.2298, 0.8975, 0.031, 1.6474, 0.1367, 1.0461, 2.1072, 0.0793, 0.3246, 1.587, 0.2272, 2.8755];
const FSRS_DECAY = -0.5;
const FSRS_FACTOR = 19 / 81;
const RETENTION = 0.9;   // reviews come back when FSRS expects 90% recall (1.0.15–1.0.20 moved it between 87% and 93% by the review accuracy)
const SRS_DAYS = [0, 1, 3, 7, 14, 30, 60, 120];          // level → typical interval (old schedule; used to convert records)
const LEVEL_FROM_S = [1, 2.5, 5, 10, 21, 45, 90];        // stability needed for levels 1…7
const SRS_LEARNED = 3;   // level at which an item counts as learned (stability ≥ 5 days)
const SRS_MASTERED = 5;  // level at which an item counts as mastered (stability ≥ 21 days; a word with a 假名拼字 question also needs it spelled once)

// Per-format history of a word: rec.f = { 'v-cloze': [ok, ng], flash: [ok, ng], … }. Only vocabulary records carry it.
function recordFormat(rec, fmt, ok, field = 'f') {   // words keep `f` (its 'v-spell' counts toward 已熟練); grammar keeps `gf` (format rotation only)
  if (!rec || !fmt) return;
  const bag = rec[field] || (rec[field] = {});
  const x = bag[fmt] || (bag[fmt] = [0, 0]);
  x[ok ? 0 : 1]++;
}
function spelled(rec) { return Boolean(rec && rec.f && rec.f['v-spell'] && rec.f['v-spell'][0] > 0); }   // its 假名拼字 answered right once
const LEECH_LAPSES = 4;
const GRADE = { again: 1, hard: 2, good: 3, easy: 4 };
// 錯題重學階梯: a missed word, grammar item or kanji comes back after 1 day, then 2 more, then 4 more (days 1, 3, 7); three right
// answers in a row hand it back to FSRS spacing, a miss on the way restarts it. `rl` on the record is the step reached; the
// notebook lists exactly the items on the ladder. Listening and reading stay off it (hearing a dialogue again within days
// tests memory of the answer, not listening).
const RELEARN_GAPS = [2, 4];
const RELEARN_KINDS = /^[vgkca]:/;
const LR_GAPS = [30, 90, 180];   // 聽力／閱讀 answered right the 1st, 2nd, 3rd+ time: days until it is asked again
const LR_MISS_GAP = 7;           // 聽力／閱讀 answered wrong: back after a week, not the next day
// 1.0.20 tiers: up to three stars follow FSRS due dates (at RETENTION; at most SRS_DAILY_CAP a day, the oldest first), and
// the missed items on the 1/3/7 ladder come on their days on top of that cap (1.0.21; the notebook was a queue of its own
// before); four stars are a queue that gives a fixed share a day, the longest-waiting first (at least Q4_MIN, at most Q4_MAX,
// none when empty) — a stage pass marks hundreds at once, and their dates would all fall on one day. Five stars (2026-11-11,
// the user: fewer of them a day; they were a 3% queue of up to 30 that asked a word known for a year as often as one that
// just got there) come on their FSRS dates, the most overdue first, at most Q5_DAILY_CAP a day. New items a day: NEW_STEPS
// by the last RECENT_MAX answers, minus one per ten notebook entries.
const SRS_DAILY_CAP = 50;
const Q4_RATE = 0.05;
const Q4_MIN = 1;
const Q4_MAX = 20;
const Q5_DAILY_CAP = 20;
const LISTEN_PER_DAY = 3;
const NEW_STEPS = [[0.9, 20], [0.8, 15], [0.7, 10], [0, 5]];
const NEW_DEFAULT = 15;
const NEW_MIN = 3;
const NEW_MAX = 20;
const RECENT_MAX = 100;
const SESSION_SIZE = 20;         // questions in a set of 今日練習 and 假名 (a setting until 1.0.24)
function onLadder(key) { const r = state.srs[key]; return Boolean(r) && typeof r.rl === 'number'; }
// which tier an item is in, read from its stars (listening and reading keep their own dates: null)
function tierOf(key) {
  if (/^[lr]:/.test(key)) return null;
  const r = state.srs[key];
  if (!r) return 'new';
  // an 入門 item that left for good: only while 已熟練 (1.0.20 let a word leave before its spelling; it comes back to spell)
  if (r.out && srsLevelLabel(r, key) === '已熟練') return 'out';
  if (typeof r.rl === 'number' || r.b <= 3) return 'srs';
  return r.b === 4 ? 'q4' : 'q5';
}
// 入門 items (kana, PRE_N5 built-in words, week-0 grammar) leave for good after a right answer at five stars
function isPreItem(key) {
  if (key.startsWith('a:')) return true;
  const x = REG.byKey.get(key);
  return Boolean(x) && ((x.kind === 'v' && x.lv === 'PRE_N5') || (x.kind === 'g' && x.u === 'm0'));
}
function srsGet(key) { return state.srs[key] || null; }

function fsrsD0(g) { return clamp(FSRS_W[4] - (g - 3) * FSRS_W[5], 1, 10); }
function fsrsR(elapsed, s) { return Math.pow(1 + FSRS_FACTOR * Math.max(0, elapsed) / Math.max(0.01, s), FSRS_DECAY); }
function fsrsInterval(s) {
  return s / FSRS_FACTOR * (Math.pow(RETENTION, 1 / FSRS_DECAY) - 1);
}
function levelFromS(s) { let b = 0; LEVEL_FROM_S.forEach(x => { if (s >= x) b++; }); return b; }
// records from the earlier fixed-interval schedule (or written by hand) get a stability and difficulty
function ensureFsrs(r) {
  if (!r || (typeof r.s === 'number' && typeof r.d === 'number')) return r;
  const b = clamp(r.b || 0, 0, SRS_DAYS.length - 1);
  r.s = b === 0 ? 0.5 : SRS_DAYS[b];
  r.d = clamp(4 + 6 * ((r.ng || 0) / Math.max(1, r.n || 0)), 1, 10);
  return r;
}
function fsrsNext(r, g, elapsed) {
  if (typeof r.s !== 'number') {   // first answer: a learning step
    // a first "good" starts between FSRS's good (1.4 d) and easy (3.7 d) stabilities: about 3 days. With the
    // plain 1.4 d most of a day's new grammar came back the very next day, which felt like endless repetition.
    r.s = g === 1 ? FSRS_W[0] : g === 2 ? FSRS_W[1] * 0.7 : g === 3 ? (FSRS_W[1] + FSRS_W[2]) / 2 : FSRS_W[2];
    r.d = fsrsD0(g === 2 ? 2 : g);
    return;
  }
  const R = fsrsR(elapsed, r.s);
  if (g === 1) {
    r.s = Math.min(r.s, FSRS_W[11] * Math.pow(r.d, -FSRS_W[12]) * (Math.pow(r.s + 1, FSRS_W[13]) - 1) * Math.exp(FSRS_W[14] * (1 - R)));
  } else {
    const growth = Math.exp(FSRS_W[8]) * (11 - r.d) * Math.pow(r.s, -FSRS_W[9]) * (Math.exp(FSRS_W[10] * (1 - R)) - 1)
      * (g === 2 ? FSRS_W[15] : 1) * (g === 4 ? FSRS_W[16] : 1);
    r.s = r.s * (1 + growth);
  }
  const d = r.d - FSRS_W[6] * (g - 3);
  r.d = clamp(FSRS_W[7] * fsrsD0(3) + (1 - FSRS_W[7]) * d, 1, 10);
}
function fsrsDays(s, key) {
  const raw = fsrsInterval(s);
  if (raw < 0.6) return 0;
  // a little spread so items learned together do not all come back on the same day
  const fuzz = raw > 4 ? 1 + ((hashStr(key + raw.toFixed(1)) % 11) - 5) / 100 : 1;
  return clamp(Math.round(raw * fuzz), 1, 365);
}
// How many days the next interval would be for a flashcard grade (shown on the rating buttons)
function srsPreview(key, grade) {
  const cur = state.srs[key];
  const r = cur ? Object.assign({}, ensureFsrs(Object.assign({}, cur))) : { n: 0 };
  const t = todayStr();
  fsrsNext(r, GRADE[grade] || 3, r.last ? daysBetween(r.last, t) : 0);
  return GRADE[grade] === 1 ? 0 : Math.max(1, fsrsDays(r.s, key));
}

// correct: true/false from a quiz, or opt.grade again/hard/good/easy from a flashcard
function srsAnswer(key, correct, opt = {}) {
  LAST_BULK_MARK = null;   // practice after a bulk mark (a stage pass) makes its snapshot stale
  const t = todayStr();
  let r = state.srs[key];
  const isNew = !r;
  if (!r) r = state.srs[key] = { b: 0, due: t, n: 0, ok: 0, ng: 0, st: 0, last: null, lapse: 0, intro: t };
  else ensureFsrs(r);
  const before = r.b; const dueBefore = r.due;
  const masteredBefore = !isNew && srsLevelLabel(r, key) === '已熟練';   // read before the answer: its format is recorded after srsAnswer
  const g = opt.grade ? (GRADE[opt.grade] || 3) : (correct ? 3 : 1);
  const elapsed = r.last ? daysBetween(r.last, t) : 0;
  const reviewed = !isNew && r.due <= t;   // a due review (not a first look, not early practice): only these move the relearning ladder on
  if (isNew) delete r.s;
  fsrsNext(r, g, elapsed);
  if (isNew && g === 3 && key.startsWith('v:')) r.s = Math.min(r.s, 1);   // a new word's first check is tomorrow, then FSRS takes over
  r.n++;
  if (g > 1) { r.ok++; r.st++; } else { r.ng++; r.st = 0; if (before >= 2) r.lapse = (r.lapse || 0) + 1; delete r.mark; delete r.pre; delete r.markDay; }   // a miss ends 我的標記: back to the normal rules
  r.b = g === 1 ? Math.min(levelFromS(r.s), 1) : levelFromS(r.s);
  // four stars answered right go up by memory strength like any other item (after a long wait in the queue that usually
  // makes five); a 入門 item clearly right (not a flashcard's 模糊) while 已熟練 leaves the queues: five stars, and a word
  // with a spelling question spelled once before
  if (g >= 3 && masteredBefore && isPreItem(key)) r.out = 1;
  if (g === 1) delete r.out;
  // first answers a day of course items (words, grammar, kanji, kana): the pace 課程進度 uses. Listening, reading and drills
  // come on their own, outside the day's new count (1.0.26; before it they were tallied too)
  if (isNew && /^[vgka]:/.test(key)) logEntry().fresh = (logEntry().fresh || 0) + 1;
  if (before < SRS_LEARNED && r.b >= SRS_LEARNED) r.lrn = t;   // the day it became 熟悉 (學習分析 lists the recent ones)
  // A miss comes back tomorrow: the same-day look is the session's 再練一次 copy, which does not touch the schedule (seeing
  // the very same question again within hours only tests memory of the answer). Listening and reading wait a week and get
  // no 再練一次: a dialogue or passage heard the next day is remembered, not understood.
  r.due = g === 1 ? addDays(t, /^[lr]:/.test(key) ? LR_MISS_GAP : 1) : addDays(t, fsrsDays(r.s, key));
  // a dialogue or passage met again within weeks tests memory of the answer, not listening or reading: after a
  // correct answer it waits a month, then a season, then half a year (a miss still brings it back tomorrow)
  if (/^[lr]:/.test(key) && g > 1) r.due = addDays(t, Math.max(daysBetween(t, r.due), LR_GAPS[Math.min(r.ok, LR_GAPS.length) - 1]));
  // the ladder moves on a right answer on (or after) its day; a right answer before it (the notebook queue, a flashcard,
  // unit practice) is extra practice: the step and its day stay
  if (RELEARN_KINDS.test(key)) {
    if (g === 1) r.rl = 0;
    else if (typeof r.rl === 'number' && !reviewed) r.due = dueBefore;
    else if (typeof r.rl === 'number') { if (r.rl < RELEARN_GAPS.length) { r.due = addDays(t, RELEARN_GAPS[r.rl]); r.rl++; } else delete r.rl; }
  }
  r.last = t;
  noteAnswered(key);
  if ((r.lapse || 0) >= LEECH_LAPSES) r.leech = true;
  if (isNew) {
    if (key.startsWith('v:')) { state.today.newV++; noteThemeIntro(key); }
    else if (key.startsWith('g:')) { state.today.newG++; autoAdvanceUnit(key); if (key.startsWith('g:m0-') && introLeft() === 0) completeIntro(); }
    else if (key.startsWith('k:')) state.today.newK = (state.today.newK || 0) + 1;
    else if (key.startsWith('l:')) state.today.newL = (state.today.newL || 0) + 1;
    else if (key.startsWith('r:')) state.today.newR = (state.today.newR || 0) + 1;
    else if (key.startsWith('c:')) state.today.newC = (state.today.newC || 0) + 1;
    else if (key.startsWith('a:')) state.today.newA = (state.today.newA || 0) + 1;
  }
  return { rec: r, isNew, before, after: r.b, reviewed };
}

// from: the level before an answer; the dots it lit are marked .up and pop on the draw right after it (1.0.50)
function srsDots(b, from = null) {
  const lit = b <= 0 ? 0 : b <= 2 ? b : b <= 4 ? 3 + (b === 4 ? 1 : 0) : 5;
  const was = from === null ? lit : Math.max(0, Math.min(5, from));
  return `<span class="dots" aria-label="熟練度 ${lit}/5">${[0, 1, 2, 3, 4].map(i => `<i class="${i < lit ? (i >= was ? 'on up' : 'on') : ''}"></i>`).join('')}</span>`;
}
// 我的標記 (2026-11-11, the user: 0★／2★／5★ on the word list and a unit's page; 我會了 is five): the learner puts an item at two
// or five stars by hand. Only up: an item already that strong keeps its stars and its schedule. r.mark: the stars set (2 or 5;
// a miss ends it); r.pre: the record before the mark ('new': there was none), so 0★ puts it back while it has not been
// answered since. Five stars come back for a check in about six weeks and leave the notebook; two come back in a few days.
const MARK_S = { 2: LEVEL_FROM_S[1], 5: 45 };
const markFresh = (r) => Boolean(r && r.pre !== undefined && (r.n || 0) === (r.pre === 'new' ? 0 : r.pre.n || 0));   // marked, not answered since
function markItem(key, lv, save = true) {
  const t = todayStr();
  if (markFresh(state.srs[key])) unmarkItem(key, false);   // a mark changed starts from the record before it (5★ → 2★ comes down)
  let r = state.srs[key];
  const pre = r ? deepClone(r) : 'new';
  if (r) { delete pre.mark; delete pre.pre; delete pre.markDay; }
  else { r = state.srs[key] = { b: 0, due: t, n: 0, ok: 0, ng: 0, st: 0, last: null, lapse: 0, intro: t }; if (key.startsWith('v:')) r.f = {}; }
  ensureFsrs(r);
  const up = r.s < MARK_S[lv];
  if (up) {
    r.s = MARK_S[lv]; r.b = levelFromS(r.s); if (lv === 5) r.d = Math.min(r.d, 4);
    if (r.b >= SRS_LEARNED && !r.lrn) r.lrn = t;
    r.due = addDays(t, fsrsDays(r.s, key)); r.last = t;
  }
  r.mark = lv; r.pre = pre; r.markDay = t;   // marked today: off today's list (markedToday)
  if (lv === 5) state.mistakes.forEach(m => { if (m.key === key && !m.mastered) { m.mastered = true; m.last = t; } });   // five stars clear it from the notebook
  if (save) saveState();
  return up;   // false: it was that strong already
}
// an item marked today (2★ or 5★, 2026-11-11, the user) has left today's list: the mark set its next day. 0★ puts it back.
function markedToday(key) { const r = state.srs[key]; return Boolean(r && r.mark && r.markDay === todayStr()); }
// 0★: a mark not answered since gives the record before it back (none: the item is new again); one answered since keeps its
// answers and only loses the mark. A 我會了 from before 我的標記 (no r.pre) goes back to 熟悉, as its 取消熟練 did.
function unmarkItem(key, save = true) {
  const r = state.srs[key]; if (!r || !r.mark) return;
  if (markFresh(r)) { if (r.pre === 'new') delete state.srs[key]; else state.srs[key] = r.pre; }
  else {
    if (r.pre === undefined) { delete r.out; r.s = Math.min(r.s || 0, LEVEL_FROM_S[SRS_LEARNED - 1]); r.b = levelFromS(r.s); r.due = addDays(todayStr(), fsrsDays(r.s, key)); }   // an 入門 word that left comes back
    delete r.mark; delete r.pre; delete r.markDay;
  }
  if (save) saveState();
}
// 已熟練: five stars, and for a word with a 假名拼字 question its spelling right once — however it got to five stars (answers,
// a stage pass, 我會了). Anything else (a word with no spelling question, a custom card, grammar, kana, kanji…) is 已熟練 at
// five stars. `key` says which item it is; without one it is not taken for a word.
function srsLevelLabel(rec, key) {
  if (!rec) return '新內容';
  if (rec.b >= SRS_MASTERED) { const it = key && REG.byKey && REG.byKey.get(key); return it && it.kind === 'v' && canSpell(it) && !spelled(rec) ? '熟悉' : '已熟練'; }
  if (rec.b >= SRS_LEARNED) return '熟悉';
  if (rec.b >= 1) return '學習中';
  return '待加強';
}
// when an item comes back: four stars wait in their queue (their date is not used), five stars past their date wait for a
// place (at most Q5_DAILY_CAP a day), an 入門 item that left never does
function dueLabel(rec, key) {
  if (!rec) return '';
  const tier = tierOf(key);
  if (tier === 'q4') return '四顆・排隊中';
  if (tier === 'out') return '不再出現';
  const d = daysBetween(todayStr(), rec.due);
  if (tier === 'q5' && d <= 0) return '五顆・排隊中';
  if (d <= 0) return '今天複習';
  if (d === 1) return '明天複習';
  return `${d} 天後複習`;
}

// ---------- daily logs, streak, recent accuracy ----------
function logEntry(d = todayStr()) {
  if (!state.dailyLogs[d]) state.dailyLogs[d] = { date: d, vocabCount: 0, grammarCount: 0, quizCount: 0, bonusCount: 0, minutes: 0, topics: [], mistakeTopics: [] };
  return state.dailyLogs[d];
}
function noteUnitDone(uid) { const e = logEntry(); const u = unitById(uid); if (!u) return; if (!Array.isArray(e.units)) e.units = []; if (!e.units.includes(u.short)) e.units.push(u.short); }
// One day's numbers: questions by kind (since v73; older days have 單字／文法／其他), items met for the first time and items that
// reached 熟悉 (from the schedule, any day), the day's accuracy and the units finished (since v73)
function tallySrsByDay() {
  const fresh = {}, learned = {};
  for (const k in state.srs) {
    const r = state.srs[k];
    if (r.intro) fresh[r.intro] = (fresh[r.intro] || 0) + 1;
    if (r.lrn) learned[r.lrn] = (learned[r.lrn] || 0) + 1;
  }
  return { fresh, learned };
}
function dayStats(d, tally) {
  const e = state.dailyLogs[d] || {};
  const kinds = LOG_KINDS.map(([k, name]) => [name, e['k' + k.toUpperCase()] || 0]).filter(([, n]) => n);
  let fresh = 0, learned = 0;
  if (tally) {
    fresh = tally.fresh[d] || 0;
    learned = tally.learned[d] || 0;
  } else {
    for (const k in state.srs) { const r = state.srs[k]; if (r.intro === d) fresh++; if (r.lrn === d) learned++; }
  }
  const n = (e.ok || 0) + (e.ng || 0);
  return { total: dayTotal(e), items: e.items, ex: e.ex || 0, kinds, fresh, learned, acc: n ? Math.round((e.ok || 0) / n * 100) : null, units: e.units || [], old: [['單字', e.vocabCount || 0], ['文法', e.grammarCount || 0], ['其他', (e.quizCount || 0) + (e.bonusCount || 0)]].filter(([, x]) => x) };
}
function dayStatsText(d, tally) {
  const x = dayStats(d, tally);
  const by = (x.kinds.length ? x.kinds : x.old).map(([name, n]) => `${name} ${n}`).join('・');
  const head = [typeof x.items === 'number' ? `${x.items} 題` : '', x.total ? `作答 ${x.total} 次${by ? `（${by}）` : ''}` : ''].filter(Boolean).join('・');
  return `${head ? `${head}・` : ''}新學 ${x.fresh}・升到熟悉 ${x.learned}${x.acc !== null ? `・正確率 ${x.acc}%` : ''}${x.units.length ? `・完成單元：${esc(x.units.join('、'))}` : ''}${x.ex ? `・模擬考與測驗 ${x.ex} 題` : ''}`;
}
function dayTotal(e) { return e ? (e.vocabCount || 0) + (e.grammarCount || 0) + (e.quizCount || 0) + (e.bonusCount || 0) : 0; }
function dayActive(e) { return Boolean(e) && (dayTotal(e) > 0 || (e.items || 0) > 0 || (e.ex || 0) > 0); }
// Items answered today: each item once, whatever mode it was answered in (encores and 再練一次 copies add nothing, and
// bulk marks or 我會了 are not answers). A hand-made notebook card counts as 'm:<id>'. 今天做了 and the sidebar show this.
function noteAnswered(key) {
  if (!Array.isArray(state.today.ans)) state.today.ans = [];
  if (!state.today.ans.includes(key)) state.today.ans.push(key);
  logEntry().items = state.today.ans.length;
}
function answeredToday(key) { return Array.isArray(state.today.ans) && state.today.ans.includes(key); }
function itemsDoneToday() { return Array.isArray(state.today.ans) ? state.today.ans.length : 0; }
// the ring: how much of today's list is done (items answered elsewhere today count in 今天做了, not here)
function dayProgress() { const keys = todayPlanKeys(); const done = keys.filter(answeredToday).length; return { done, left: keys.length - done, total: keys.length }; }
const LOG_KINDS = [['v', '單字'], ['g', '文法'], ['k', '漢字'], ['a', '假名'], ['l', '聽力'], ['r', '閱讀'], ['x', '其他']];   // mock exams and stage tests are not presses since 1.0.19 (they count in dailyLogs.ex)
function recordAction(type, topic, kind) {
  const e = logEntry();
  if (type === 'v') e.vocabCount = (e.vocabCount || 0) + 1;
  else if (type === 'g') e.grammarCount = (e.grammarCount || 0) + 1;
  else e.quizCount = (e.quizCount || 0) + 1;
  const kk = 'k' + (LOG_KINDS.some(([k]) => k === kind) ? kind : 'x').toUpperCase();   // per kind since v73 (flat numbers: sync keeps the larger)
  e[kk] = (e[kk] || 0) + 1;
  e.minutes = (e.minutes || 0) + (type === 'v' ? 0.5 : 1);
  if (topic) {
    if (!Array.isArray(e.topics)) e.topics = [];
    if (!e.topics.includes(topic)) { e.topics.unshift(topic); e.topics = e.topics.slice(0, 8); }
  }
}
function recordAccuracy(correct) {
  const e = logEntry(); if (correct) e.ok = (e.ok || 0) + 1; else e.ng = (e.ng || 0) + 1;   // the day's accuracy (since v73)
  state.recent.push(correct ? 1 : 0);
  if (state.recent.length > RECENT_MAX) state.recent = state.recent.slice(-RECENT_MAX);
}
function recentAccuracy(n = 40, min = 12) {   // null below `min` answers
  const r = state.recent.slice(-n);
  if (r.length < min) return null;
  return r.reduce((a, b) => a + b, 0) / r.length;
}
function streakStats() {
  const active = new Set(Object.keys(state.dailyLogs).filter(d => dayActive(state.dailyLogs[d])));
  let cur = 0;
  let off = active.has(todayStr()) ? 0 : -1;
  while (active.has(todayStr(off))) { cur++; off--; }
  const sorted = [...active].sort();
  let best = 0; let run = 0; let prev = null;
  sorted.forEach(d => { run = (prev && daysBetween(prev, d) === 1) ? run + 1 : 1; best = Math.max(best, run); prev = d; });
  let total = 0;
  sorted.forEach(d => { total += dayTotal(state.dailyLogs[d]); });
  return { current: cur, best, days: active.size, total, doneToday: active.has(todayStr()) };
}

// ---------- 言靈 (1.2.0): what studying earns, spent at 古道具屋 up the hill ----------
// Answering: a set of 今日練習 played to its end (多學 sets too) gives 1, the day's list done gives 10 once a day, and the two
// together give at most 20 a day. 聽一輪: every 5 minutes of listening without a pause gives 1, at most 30 a day. A letter may
// bring some (福爺's opening letter: 10), so may a find (1.2.2: the Halloween witch, 100; a town event, 10; 2026-11-11: a unit's 講義
// read to its last page the first time, 3). What is kept are counts, never
// sums: sets and listens by day and by device (only that device adds to its own count, so sync keeps the larger), the bonus
// days as a list, what each letter and each find brought (sync-core mergeKoto) — so nothing is counted twice or lost when two
// devices meet, and a day's cap holds across devices.
// sets: the sets each device finished under the first rule (the test site's, no cap), still counted, no longer added to.
// The caps are applied when the balance is worked out: a rule changed later goes by date, so past days keep theirs.
const KOTO_DAY = 10, KOTO_QUIZ_CAP = 20, KOTO_LISTEN_CAP = 30, KOTO_LISTEN_MS = 300000;
function kotoDevice() { return (typeof Sync !== 'undefined' && Sync.meta && Sync.meta.deviceId) || 'local'; }
const kotoSum = (byDev) => Object.values(byDev || {}).reduce((a, n) => a + (Number(n) || 0), 0);
// what a day gave by answering (its sets on every device, its bonus) and by listening, each up to its cap
const kotoQuizDay = (k, d) => Math.min(KOTO_QUIZ_CAP, kotoSum(k.daySets[d]) + (k.days.includes(d) ? KOTO_DAY : 0));
const kotoListenDay = (k, d) => Math.min(KOTO_LISTEN_CAP, kotoSum(k.listen[d]));
function kotoEarned() {   // all the 言靈 ever come by, spent or not
  const k = state.koto, quizDays = new Set([...Object.keys(k.daySets), ...k.days]);
  return kotoSum(k.sets) + [...quizDays].reduce((a, d) => a + kotoQuizDay(k, d), 0) + Object.keys(k.listen).reduce((a, d) => a + kotoListenDay(k, d), 0)
    + kotoSum(k.mail) + kotoSum(k.found) + (Number(k.gift) || 0);
}
function kotoBalance() { return kotoEarned() - Object.values(state.owned).reduce((a, o) => a + ((o && Number(o.paid)) || 0), 0); }
// 古道具屋 opens (2026-11-10, the user) once 20 言靈 have been earned — 福爺's letter comes then; one who has bought there already
// or has his letter's 言靈 finds it open
const SHOP_OPEN_AT = 20;
const shopOpen = () => kotoEarned() >= SHOP_OPEN_AT || Boolean(state.koto.mail.opening) || Object.values(state.owned).some((o) => o && Number(o.paid) > 0);
const shopShut = () => toast(`山上還籠罩著濃霧。存到 ${SHOP_OPEN_AT} 言靈，霧就會散開，福爺也會寫信來。`, 3600);
// the set that just ended, once (renderSummary keeps it on the session): what it gave for the set and for the day's list done,
// each as much as the day's cap left (full: the cap was reached, so some or all of it was not given)
function earnKoto(s) {
  const t = todayStr(), k = state.koto, prog = dayProgress(), before = kotoQuizDay(k, t);
  const set = s.mode === 'daily' && !s.quit && s.results.length > 0;
  const day = prog.total > 0 && prog.left === 0 && itemsDoneToday() > 0 && !k.days.includes(t);
  if (set) { const d = kotoDevice(), m = k.daySets[t] || (k.daySets[t] = {}); m[d] = (Number(m[d]) || 0) + 1; }
  const mid = kotoQuizDay(k, t);
  if (day) k.days.push(t);
  if (set || day) saveState();
  const after = kotoQuizDay(k, t);
  return { set: mid - before, day: after - mid, full: (set && mid - before < 1) || (day && after - mid < KOTO_DAY), dayNow: day };   // dayNow: this set finished the day's list
}
// 聽一輪 (1.2.0): the time it has played without a pause, told after every line it speaks; a gap of over a minute and a half
// (the page was stopped, the phone slept) starts it over, so does a pause. Every 5 minutes: 1 言靈, as long as today has room.
function listenKotoTick(L, now = Date.now()) {
  if (!L) return 0;
  if (!L.since || now - L.since > 90000) { L.since = now; L.heard = 0; return 0; }
  L.heard = (L.heard || 0) + (now - L.since); heardAdd(now - L.since); L.since = now;
  let got = 0;
  while (L.heard >= KOTO_LISTEN_MS) {
    L.heard -= KOTO_LISTEN_MS;
    const t = todayStr(), k = state.koto;
    if (kotoListenDay(k, t) >= KOTO_LISTEN_CAP) { L.heard = 0; if (!L.capSaid) { L.capSaid = true; kotoPop(0, '今天聽一輪的言靈拿滿了'); } break; }
    const m = k.listen[t] || (k.listen[t] = {}), d = kotoDevice(); m[d] = (Number(m[d]) || 0) + 1; got++;
  }
  if (got) { saveState(); kotoPop(got); }
  return got;
}
const listenKotoStop = (L) => { if (L) { L.since = 0; L.heard = 0; } };
// 聽一輪's ring in 書房 (2026-11-10, the user): the time heard today on this device, full at 5 minutes — or a 言靈 for it today on any
function heardAdd(ms) { try { const t = todayStr(), h = JSON.parse(localStorage.getItem('nq_heard') || 'null'), was = h && h.day === t ? Number(h.ms) || 0 : 0; localStorage.setItem('nq_heard', JSON.stringify({ day: t, ms: was + ms })); } catch (e) { /* no storage */ } }
function listenHeardToday() {
  if (kotoListenDay(state.koto, todayStr()) >= 1) return KOTO_LISTEN_MS;
  try { const h = JSON.parse(localStorage.getItem('nq_heard') || 'null'); return h && h.day === todayStr() ? Number(h.ms) || 0 : 0; } catch (e) { return 0; }
}
const heardPct = () => Math.min(100, Math.round(listenHeardToday() / KOTO_LISTEN_MS * 100));   // a pause, a stop: the next 5 minutes start from nothing
// a little あ rising at the top of the screen, whatever page is open: n 言靈 gained, or only words (the day's cap reached)
function kotoPop(n, words = '言靈') {
  const el = document.createElement('div'); el.className = 'koto-pop' + (n ? '' : ' full'); el.setAttribute('role', 'status');
  el.innerHTML = `${kotoIcon()}<span>${words}</span>${n ? `<b>+${n}</b>` : ''}`;
  document.body.appendChild(el); setTimeout(() => el.remove(), n ? 2600 : 4200);
}
// a glowing あ: the mark of 言靈 (circles, no gradient, so a copy in a hidden place never breaks the others)
function kotoIcon(cls = '') {
  return `<svg class="koto-i${cls ? ' ' + cls : ''}" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="11.6" fill="#f6c45a" fill-opacity=".3"/><circle cx="12" cy="12" r="9.5" fill="#ffd978"/><circle cx="12" cy="12" r="7.7" fill="#fff6d8"/><circle cx="12" cy="12" r="8.6" fill="none" stroke="#fff" stroke-opacity=".8" stroke-width=".7"/><text x="12" y="16.1" text-anchor="middle" font-size="11.5" font-weight="700" fill="#4b3f8f" font-family="'Hiragino Maru Gothic ProN', 'Hiragino Sans', 'Noto Sans JP', sans-serif">あ</text></svg>`;
}

// ---------- mistakes ----------
function addMistake(q, chosenText) {
  const prompt = q.mistakePrompt || q.plainStem || '';
  if (!prompt) return;
  let m = state.mistakes.find(x => (q.key && x.key === q.key) || x.prompt === prompt);
  if (m) {
    m.count = (m.count || 1) + 1; m.streak = 0; m.okDays = []; m.mastered = false; m.wrong = chosenText || m.wrong; m.date = todayStr(); m.last = todayStr();
  } else {
    m = { id: uid('mk'), key: q.key || '', cat: q.cat || '綜合', prompt, answer: q.answerText || '', wrong: chosenText || '', why: q.mistakeWhy || q.why || '', count: 1, streak: 0, mastered: false, note: '', date: todayStr() };
    state.mistakes.unshift(m);
  }
  const e = logEntry();
  if (!Array.isArray(e.mistakeTopics)) e.mistakeTopics = [];
  const tag = `${q.cat || '弱點'}「${q.answerText || ''}」`;
  if (!e.mistakeTopics.includes(tag)) { e.mistakeTopics.unshift(tag); e.mistakeTopics = e.mistakeTopics.slice(0, 5); }
}
function onCorrectForMistake(q) {
  const m = state.mistakes.find(x => !x.mastered && ((q.key && x.key === q.key) || (q.mistakeId && x.id === q.mistakeId)));
  if (!m) return null;
  const t = todayStr();
  m.streak = (m.streak || 0) + 1; m.last = t;
  if (m.key && REG.byKey.get(m.key)) {
    const r = state.srs[m.key];                       // linked to the course: it leaves once the relearning ladder is walked
    if (r && typeof r.rl !== 'number') m.mastered = true;
  } else {
    m.okDays = [...new Set((m.okDays || []).concat(t))].slice(-5);   // hand-made / legacy: right on two different days
    if (m.okDays.length >= 2) m.mastered = true;
  }
  return m;
}
function activeMistakes() { return state.mistakes.filter(m => !m.mastered); }
function notebookKeys() { return activeMistakes().map(m => m.key).filter(Boolean); }   // the course items in the notebook (a hand-made card has no key)
function mistakeLast(m) { return m.last || m.date || ''; }
// most-missed first, then the ones not practised for longest
function mistakePriority(a, b) { return (b.count || 1) - (a.count || 1) || mistakeLast(a).localeCompare(mistakeLast(b)); }
// ---------- progress ----------
function unitItems(uid) { return REG.grammar.filter(g => g.u === uid); }
function unitStats(uid) {
  const items = unitItems(uid);
  let score = 0; let seen = 0; let learned = 0; let mastered = 0; let due = 0;
  const t = todayStr();
  items.forEach(it => {
    const r = state.srs[it.key];
    if (r) {
      seen++; score += Math.min(r.b, SRS_LEARNED); if (r.b >= SRS_LEARNED) learned++; if (srsLevelLabel(r, it.key) === '已熟練') mastered++; if (isDueToday(it, t)) due++;
    }
  });
  const pct = items.length ? Math.round(score / (items.length * SRS_LEARNED) * 100) : 0;
  return { total: items.length, seen, learned, mastered, due, pct, done: state.completedUnits.includes(uid) };
}
function vocabStats() {
  const t = todayStr();
  const out = { due: 0, seen: 0 }; levels().forEach(L => { out[L] = { total: 0, learned: 0 }; });
  REG.vocab.forEach(v => {
    const bucket = out[v.lv] || out[courseLevels()[0]];
    bucket.total++;
    const r = state.srs[v.key];
    if (r) { out.seen++; if (r.b >= SRS_LEARNED) bucket.learned++; if (isDueToday(v, t)) out.due++; }   // reviews follow the record (1.0.32)
  });
  return out;
}
function courseProgress() {
  const stats = DATA.UNITS.map(u => unitStats(u.id));
  const pct = Math.round(stats.reduce((a, s) => a + (s.done ? 100 : s.pct), 0) / stats.length);
  const done = stats.filter(s => s.done || s.pct >= 85).length;
  return { pct, done, total: stats.length };
}
// How much new material per day the exam date asks for, and the practice load that implies
// (a new item costs about four reviews in its first month).
// the level wording AI prompts use: up to the learner's exam target (N5～N4 for an N4 target, N5～N3 for N3)
function aiLevelRange() { const cl = courseLevels(); const t = cl.includes(state.settings.examLevel) ? state.settings.examLevel : DEFAULT_LEVEL; return t === cl[0] ? t : `${cl[0]}～${t}`; }
function aiLevelTop() { return courseLevels().includes(state.settings.examLevel) ? state.settings.examLevel : DEFAULT_LEVEL; }
function examPace() {
  const t = todayStr();
  const exam = state.settings.examDate || '2027-07-04';
  const daysLeft = Math.max(0, daysBetween(t, exam));
  const cur = unitOrder(state.currentUnit);
  const lastUnit = DATA.UNITS.reduce((i, u, j) => (ALL_LEVELS.indexOf(courseLevel(u.lv)) <= ALL_LEVELS.indexOf(aiLevelTop()) ? j : i), DATA.UNITS.length - 1);
  const remainingUnits = Math.max(0, lastUnit + 1 - cur);   // units up to the exam target's level
  const studyDays = Math.max(0, daysLeft - 21);           // keep three weeks for mock exams
  const perUnit = remainingUnits > 0 ? studyDays / remainingUnits : 0;
  let status = 'ok';
  if (daysLeft > 0 && perUnit < 10) status = 'behind';
  else if (perUnit > 18) status = 'ahead';
  return { daysLeft, exam, remainingUnits, perUnit: Math.round(perUnit * 10) / 10, status };
}
