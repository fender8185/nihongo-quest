'use strict';
// 古道具屋's wares: the list of things to buy (WARES) (out of 71_today.js, 2026-11-11)
// ---------- 古道具屋's wares (1.2.0) ----------
// kind: 'floor' stands on 書房's floor (fp: its footprint w × d in room units, turned by r; h: about how tall), 'rug' lies flat (other things may stand
// on it), 'wall' hangs on the left (L, x = 0) or right (R, y = 0) wall (size: w × h, u along the wall, v the height of its middle),
// 'wear' is worn by the hero (slot), 'clothes' a style of top, trousers or shoes they put on in their own colours (slot: top,
// bottom, shoe; the ware's id is the style's). A ware bought goes into the storage box (a wear or clothes into the wardrobe); at:
// where one of 書房's own (starter) is laid out at first.
const WARES = [
  // test (2026-11-09): presents from the neighbours (gift: who brings it; home: where it is set out when there is room), not sold
  { id: 'gramophone', kind: 'floor', h: 2.7, name: '留聲機', price: 100, fp: [1, 1], desc: '老唱機，放著黑膠唱片會一直播輕音樂。點它換唱片或停下來。', act: 'music', gift: 'mugi', home: { w: 'F', x: 19.6, y: 0.6, r: 0 } },
  { id: 'goldfish', kind: 'floor', h: 2.5, name: '金魚缸', price: 28, fp: [0.8, 0.8], desc: '兩隻金魚在裡面慢慢游。' },
  { id: 'bonsai', kind: 'floor', h: 1.4, name: '盆栽', price: 12, fp: [0.8, 0.8], desc: '小小一棵松，修得很用心。', act: 'water' },
  { id: 'monstera', kind: 'floor', h: 2.7, name: '龜背芋', price: 24, fp: [0.9, 0.9], desc: '葉子大大的，房間一下就有精神。' },
  { id: 'cactus', kind: 'floor', h: 1.8, name: '仙人掌', price: 6, fp: [0.6, 0.6], desc: '很好養，忘了澆水也沒關係。', act: 'water' },
  { id: 'bamboo', kind: 'floor', h: 3.4, name: '竹子', price: 14, fp: [0.7, 0.7], desc: '一盆細竹，長得直直的。', act: 'water' },
  { id: 'floorlamp', kind: 'floor', h: 4.1, name: '落地燈', price: 30, fp: [0.7, 0.7], desc: '晚上會亮的暖黃色立燈。', light: { z: 3.7, r: 5 } },
  { id: 'andon', kind: 'floor', h: 1.5, name: '行燈', price: 30, fp: [0.8, 0.8], desc: '和紙糊的燈，晚上透出柔柔的光。', light: { z: 0.9, r: 3.4 } },
  { id: 'chabudai', kind: 'floor', h: 1.0, name: '矮桌', price: 20, fp: [1.6, 1.6], desc: '圓圓的矮桌，放杯茶剛好。點它在旁邊跪坐。', act: 'kneel' },
  { id: 'zabuton', kind: 'floor', h: 0.35, name: '座布團', price: 6, fp: [1, 1], desc: '坐墊，累了就坐一下。點它在上面跪坐。', act: 'kneel' },
  { id: 'daruma', kind: 'floor', h: 1.25, name: '大達摩', price: 15, fp: [0.8, 0.8], desc: '過了一個階段測驗，就畫上另一隻眼睛。' },
  { id: 'manekineko', kind: 'floor', h: 1.25, name: '招き猫', price: 18, fp: [0.6, 0.6], desc: '舉著手招來好運。' },
  { id: 'guitar', kind: 'floor', h: 2.8, name: '吉他', price: 35, fp: [0.7, 0.6], desc: '放在架上，偶爾彈一下。' },
  { id: 'rushmat', kind: 'rug', name: '圓草蓆', price: 10, fp: [2, 2], desc: '藺草編的圓蓆，有草的香味。' },
  { id: 'rug', kind: 'rug', name: '和風地毯', price: 16, fp: [2.6, 1.8], desc: '藍底白紋的和風地毯。' },
  { id: 'tatami', kind: 'rug', name: '榻榻米', price: 20, fp: [1.8, 1.8], desc: '兩張榻榻米，鋪在哪裡都可以。' },
  { id: 'clock', kind: 'wall', name: '掛鐘', price: 20, size: [1.3, 1.3], desc: '一座老掛鐘，跟著手機的時間走。', hands: { r: 0.62, dv: 0 } },
  { id: 'cuckoo', kind: 'wall', name: '鳩時計', price: 30, size: [1, 1.6], desc: '木頭做的鳩時計，指針也會走。', hands: { r: 0.3, dv: 0.05 } },
  { id: 'kitsune', kind: 'wall', name: '狐狸面具掛飾', price: 10, size: [0.5, 0.7], desc: '祭典買的狐狸面具，掛在牆上。（戴在臉上的在「穿搭」的臉部。）' },   // 2026-11-12: named apart from the one worn (foxmask)
  { id: 'chalkboard', kind: 'wall', name: '小黑板', price: 12, size: [1.2, 1.1], desc: '寫著今天想記住的字。' },
  { id: 'scroll', kind: 'wall', name: '掛軸', price: 20, size: [0.9, 2.6], desc: '寫著「継続は力なり」：持續就是力量。' },
  { id: 'japanmap', kind: 'wall', name: '日本地圖', price: 18, size: [1.4, 1], desc: '標著幾個想去的地方。' },
  { id: 'furin', kind: 'wall', name: '風鈴', price: 9, size: [0.5, 1.2], desc: '玻璃風鈴，叮鈴叮鈴。' },
  { id: 'ukiyoe', kind: 'wall', name: '浮世繪', price: 22, size: [1.6, 1.4], desc: '大浪和富士山的版畫。' },
  { id: 'uchiwa', kind: 'wall', name: '團扇', price: 8, size: [1.1, 1.2], desc: '夏天祭典的團扇。' },
  { id: 'wallshelf', kind: 'wall', name: '壁掛層架', price: 16, size: [1.4, 0.9], desc: '放幾個小東西的木架。' },
  { id: 'mirror', kind: 'wall', name: '圓鏡', price: 14, size: [1, 1], desc: '出門前照一下。點它照鏡子，換臉型、髮型。', act: 'mirror' },
  // the yard's (1.2.0): set out on the lawn in the yard's own 擺設; ground: [width, depth] where it stands, in the hero's units
  { id: 'telescope', kind: 'yard', name: '望遠鏡', price: 45, ground: [76, 12], desc: '架在院子裡，晚上可以看星星。' },
  { id: 'stonelantern', kind: 'yard', name: '石燈籠', price: 26, ground: [64, 12], desc: '院子裡的石燈籠，天黑了會亮起來。' },
  { id: 'engawa', kind: 'yard', name: '緣台', price: 20, ground: [196, 22], desc: '木頭長椅，鋪著紅布，放了一杯茶。' },
  { id: 'tanuki', kind: 'yard', name: '狸貓擺飾', price: 18, ground: [72, 12], desc: '戴斗笠、提著酒壺的信楽燒狸貓。' },
  { id: 'pond', kind: 'yard', name: '小池塘', price: 40, ground: [244, 34], desc: '石頭圍起來的小池塘，兩條錦鯉慢慢游。' },
  // the house's look (1.2.0): bought, the yard's house becomes it at once; its card puts it on or back to the cottage (state.house)
  { id: 'mushroomhouse', kind: 'house', name: '蘑菇屋', price: 2000, desc: '紅色大蘑菇蓋成的房子，白點點、圓窗戶，屋頂冒著煙。買了院子的房子就換成它。' },
  { id: 'gingerhouse', kind: 'house', name: '薑餅屋', price: 2000, desc: '餅乾牆、巧克力屋頂，屋簷滴著糖霜，屋頂黏著軟糖，門邊插一根拐杖糖。' },
  { id: 'stumphouse', kind: 'house', name: '樹墩屋', price: 2000, desc: '老樹墩挖成的家，頂上有年輪和一株小芽，青苔、樹根，門口長了一朵小蘑菇。' },
  { id: 'teapothouse', kind: 'house', name: '茶壺屋', price: 2000, desc: '圓滾滾的水藍色茶壺，壺蓋上開一扇小窗，壺嘴、把手都在，身上畫著小花。' },
  // the yard's ground (2026-11-14, the user: a category of its own to change the lawn): bought, the yard's grass becomes it at once;
  // its card puts it on or back to the grass (state.ground)
  { id: 'snowfield', kind: 'ground', name: '雪地', price: 2000, desc: '院子整片蓋上白白的雪：小路踩出一條雪痕，草叢和兩邊的山坡都變白。買了院子就換成它，也可以換回草地。' },
  { id: 'beanie', kind: 'wear', slot: 'head', name: '毛帽', price: 30, desc: '軟軟的毛線帽。' },
  { id: 'strawhat', kind: 'wear', slot: 'head', name: '草帽', price: 42, desc: '夏天出門戴的草帽。' },
  { id: 'catears', kind: 'wear', slot: 'head', name: '貓耳髮箍', price: 48, desc: '戴上就變成貓。' },
  { id: 'hachimaki', kind: 'wear', slot: 'head', name: '必勝頭巾', price: 24, desc: '考試前綁上，寫著「必勝」。' },
  { id: 'beret', kind: 'wear', slot: 'head', name: '貝雷帽', price: 36, desc: '有點文青的貝雷帽。' },
  { id: 'gradcap', kind: 'wear', slot: 'head', name: '學士帽', price: 150, desc: '學成的證明。' },
  { id: 'glasses', kind: 'wear', slot: 'face', name: '圓框眼鏡', price: 30, desc: '圓圓的眼鏡，看起來很會讀書。' },
  // 2026-11-12 (the user: at least three to buy for each part): 太陽眼鏡 and 狐狸面具 for the face, 領帶 (the townsfolk's) for the
  // neck, ランドセル and 小翅膀 for the back; three shoes below
  { id: 'sunglasses', kind: 'wear', slot: 'face', name: '太陽眼鏡', price: 32, desc: '黑黑的鏡片，戴上去很酷。' },
  { id: 'foxmask', kind: 'wear', slot: 'face', name: '狐狸面具', price: 40, desc: '祭典的白狐狸面具，像小孩子一樣斜斜地戴在頭的一邊。' },
  { id: 'scarf', kind: 'wear', slot: 'neck', name: '圍巾', price: 36, desc: '紅色的長圍巾。' },
  { id: 'bowtie', kind: 'wear', slot: 'neck', name: '領結', price: 27, desc: '正式場合用的小領結。' },
  { id: 'necktie', kind: 'wear', slot: 'neck', name: '領帶', price: 28, desc: '深藍色的斜紋領帶，配襯衫最好看。' },
  { id: 'backpack', kind: 'wear', slot: 'back', name: '背包', price: 54, desc: '出門用的小背包。' },
  { id: 'randoseru', kind: 'wear', slot: 'back', name: 'ランドセル', price: 58, desc: '日本小學生背的紅色書包，方方正正，有金色的扣環。' },
  { id: 'wings', kind: 'wear', slot: 'back', name: '小翅膀', price: 64, desc: '小小的白色翅膀，一片一片的羽毛。' },
  { id: 'cathead', kind: 'wear', slot: 'head', name: '貓咪頭套', price: 90, desc: '整顆貓咪頭，毛色跟著上衣的顏色。配貓咪上衣和貓咪褲，就變成一隻貓。' },
  { id: 'cathood', kind: 'wear', slot: 'head', name: '貓耳兜帽', price: 60, desc: '有貓耳朵的兜帽，臉旁一圈毛毛，顏色跟著上衣。配貓咪上衣和貓咪褲，就是一整件貓咪布偶裝。' },
  // clothes (1.2.0): a style of top or trousers, dyed in the hero's own colours (look.top, look.bottom) and chosen in the
  // dressing room's 衣服 — 帽T and 長褲 are everyone's, these are sold
  { id: 'tee', kind: 'clothes', slot: 'top', name: 'T恤', price: 24, desc: '短袖 T 恤，顏色在衣櫃自己配。' },
  { id: 'sweater', kind: 'clothes', slot: 'top', name: '毛衣', price: 48, desc: '有麻花紋的針織毛衣。' },
  { id: 'shirt', kind: 'clothes', slot: 'top', name: '襯衫', price: 42, desc: '有領子的襯衫，看起來很認真。' },
  { id: 'jinbei', kind: 'clothes', slot: 'top', name: '甚平', price: 66, desc: '夏天在家穿的和風上衣。' },
  { id: 'cattop', kind: 'clothes', slot: 'top', name: '貓咪上衣', price: 72, desc: '毛茸茸的貓咪裝，白肚子、貓掌手，還有鈴鐺。' },
  { id: 'shorts', kind: 'clothes', slot: 'bottom', name: '短褲', price: 24, desc: '及膝短褲。' },
  { id: 'wide', kind: 'clothes', slot: 'bottom', name: '寬褲', price: 42, desc: '寬鬆的寬褲，走起路來很舒服。' },
  { id: 'skirt', kind: 'clothes', slot: 'bottom', name: '裙子', price: 36, desc: '及膝的 A 字裙。' },
  { id: 'catpants', kind: 'clothes', slot: 'bottom', name: '貓咪褲', price: 60, desc: '有尾巴的貓咪褲，腳是肉球。' },
  // shoes (2026-11-12, the user): 球鞋, 短靴 and 皮鞋 stay everyone's; these are sold, in the hero's shoe colour
  { id: 'geta', kind: 'clothes', slot: 'shoe', name: '木屐', price: 36, desc: '木頭的木屐，鼻緒的顏色在衣櫃自己配。走起來喀啦喀啦。' },
  { id: 'rainboots', kind: 'clothes', slot: 'shoe', name: '雨靴', price: 40, desc: '亮晶晶的長雨靴，顏色在衣櫃自己配。下雨天也想出門。' },
  { id: 'bunnyslippers', kind: 'clothes', slot: 'shoe', name: '兔子拖鞋', price: 44, desc: '毛茸茸的兔子拖鞋，兩隻長耳朵，後面有尾巴。顏色在衣櫃自己配。' },
  // limited (1.2.0): sold under 限時 only while their sale is on (SALES); once bought, theirs like any other
  { id: 'witchhat', kind: 'wear', slot: 'head', limited: 'halloween', name: '魔法師帽', price: 66, desc: '尖尖的魔法師帽，帽尖彎彎的，顏色跟著上衣，有金色的星星和月亮。' },
  { id: 'wizrobe', kind: 'clothes', slot: 'top', limited: 'halloween', name: '魔法師長袍', price: 90, desc: '長到腳踝的長袍，滿是金色星星，腰上掛著一本小魔法書。顏色在衣櫃自己配。' },
  { id: 'pumpkinhouse', kind: 'house', limited: 'halloween', name: '南瓜屋', price: 2000, desc: '胖胖的大南瓜，頂上一根藤蔓和葉子，三角形的窗戶晚上從裡面亮起來。' },
  { id: 'pumpkin', kind: 'floor', limited: 'halloween', h: 1, name: '南瓜燈', price: 20, fp: [0.8, 0.8], desc: '刻了笑臉的南瓜，晚上會從裡面亮起來。', light: { z: 0.5, r: 2.8 } },
  // 書房's own (starter: had from the start, not sold): laid out where they always stood, then moved or put away like the rest
  { id: 'bed', kind: 'floor', starter: true, fixed: true, turn: false, h: 3, name: '床', fp: [2.9, 5.25], at: { w: 'F', x: 9.45, y: 2.625, r: 0, rm: 'bed' }, desc: '', act: 'bed' },
  { id: 'nightTable', kind: 'floor', starter: true, turn: false, h: 3.2, name: '床頭櫃', fp: [1, 1], at: { w: 'F', x: 7.25, y: 0.55, r: 0, rm: 'bed' }, desc: '' },
  { id: 'bigPlant', kind: 'floor', starter: true, turn: false, h: 3.7, name: '觀葉植物', fp: [0.84, 0.84], at: { w: 'F', x: 16.2, y: 1, r: 0 }, desc: '', act: 'water' },
  { id: 'sageRug', kind: 'rug', starter: true, turn: false, name: '圓地毯', fp: [2.5, 2.5], at: { w: 'F', x: 5.4, y: 6.2, r: 0 }, desc: '' },
  { id: 'bedRug', kind: 'rug', starter: true, turn: false, name: '床邊地毯', fp: [2.6, 2.64], at: { w: 'F', x: 5.9, y: 2.92, r: 0, rm: 'bed' }, desc: '' },
  { id: 'fujiPrint', kind: 'wall', starter: true, name: '富士山版畫', size: [1.4, 1.25], at: { w: 'L', u: 3.45, v: 7.925 }, desc: '' },
  { id: 'kanaChart', kind: 'wall', starter: true, name: '平假名表', size: [1.55, 2.15], at: { w: 'R', u: 18.6, v: 5.6 }, desc: '' },
  { id: 'nightPicture', kind: 'wall', starter: true, name: '夜空畫', size: [1.3, 1.1], at: { w: 'R', u: 9.45, v: 4.4, rm: 'bed' }, desc: '' },
  { id: 'pegRail', kind: 'wall', starter: true, name: '掛勾架', size: [1.6, 1.5], at: { w: 'L', u: 7.7, v: 5.05 }, desc: '' },
  // the window (1.2.0): moved along either wall, or put away (the wall is whole then); its curtains and sill go with it
  { id: 'window', kind: 'wall', starter: true, win: true, name: '窗戶', size: [4.7, 5.4], at: { w: 'R', u: 5.5, v: 6.6 }, desc: '' },
  // 1.3.0 (since: 7, set out once where there is room): more of the house's own, so 書房 is no longer all round the desk — a
  // kotatsu in the middle, a reading corner (a sofa, a side table with a lamp, a rug) and a low shelf by the left wall; in the bedroom a window, a
  // wardrobe (it opens 衣櫃, as the button does), a dresser and a plant
  { id: 'sofa', kind: 'floor', starter: true, since: 7, turn: false, h: 2.3, name: '沙發', fp: [3.4, 1.5], at: { w: 'F', x: 22.2, y: 0.75, r: 0 }, desc: '', act: 'sofa' },
  { id: 'sideTable', kind: 'floor', starter: true, since: 7, turn: false, h: 2.6, name: '小邊桌', fp: [0.9, 0.9], at: { w: 'F', x: 24.55, y: 0.5, r: 0 }, desc: '', light: { z: 2.5, r: 4.2 } },
  { id: 'kotatsu', kind: 'floor', starter: true, since: 7, turn: false, h: 1.1, name: '暖桌', fp: [2.8, 2.8], at: { w: 'F', x: 4.6, y: 12.6, r: 0 }, desc: '', act: 'kotatsu' },
  { id: 'loungeRug', kind: 'rug', starter: true, since: 7, turn: false, name: '長地毯', fp: [4.4, 2.8], at: { w: 'F', x: 22.4, y: 3.3, r: 0 }, desc: '' },
  { id: 'lowShelf', kind: 'floor', starter: true, since: 7, turn: false, h: 2.4, name: '矮書架', fp: [1.1, 3.4], at: { w: 'F', x: 0.55, y: 12.6, r: 0 }, desc: '', act: 'diary' },
  { id: 'bedWindow', kind: 'wall', starter: true, since: 7, win: true, name: '臥房的窗', size: [4.7, 5.4], at: { w: 'R', u: 15.6, v: 6.6, rm: 'bed' }, desc: '' },
  { id: 'wardrobe', kind: 'floor', starter: true, since: 7, faces: 'x', h: 6.2, name: '衣櫃', fp: [1.3, 2.6], at: { w: 'F', x: 0.65, y: 8.3, r: 0, rm: 'bed' }, desc: '', act: 'wardrobe' },
  { id: 'dresser', kind: 'floor', starter: true, since: 7, turn: false, h: 2.6, name: '矮櫃', fp: [2.4, 1.2], at: { w: 'F', x: 15.6, y: 0.6, r: 0, rm: 'bed' }, desc: '', act: 'mirror' },
  { id: 'bedPlant', kind: 'floor', starter: true, since: 7, turn: false, h: 3.7, name: '盆栽植物', fp: [0.84, 0.84], at: { w: 'F', x: 18.9, y: 0.8, r: 0, rm: 'bed' }, desc: '', act: 'water' },
  // test (since: 8): more windows (書房 one behind the sofa and one over the low shelf, the bedroom one by the corner) and wall
  // lamps (their light: lit by night like the lamps, light.dz above their middle)
  { id: 'sofaWindow', kind: 'wall', starter: true, since: 8, win: true, bare: true, name: '沙發旁的窗', size: [4.7, 5.4], at: { w: 'R', u: 22.2, v: 6.6 }, desc: '' },
  { id: 'shelfWindow', kind: 'wall', starter: true, since: 8, win: true, bare: true, name: '矮書架上的窗', size: [4.7, 5.4], at: { w: 'L', u: 12.6, v: 6.6 }, desc: '' },
  { id: 'bedWindow2', kind: 'wall', starter: true, since: 8, win: true, bare: true, name: '臥房角落的窗', size: [4.7, 5.4], at: { w: 'R', u: 3.5, v: 6.6, rm: 'bed' }, desc: '' },
  { id: 'sconce1', kind: 'wall', starter: true, since: 8, name: '壁燈', size: [0.8, 1.1], at: { w: 'R', u: 9.4, v: 5.4 }, desc: '', light: { dz: 0.35, r: 4.4 } },
  { id: 'sconce2', kind: 'wall', starter: true, since: 8, name: '壁燈', size: [0.8, 1.1], at: { w: 'R', u: 27.2, v: 5.4 }, desc: '', light: { dz: 0.35, r: 4.4 } },
  { id: 'sconce3', kind: 'wall', starter: true, since: 8, name: '壁燈', size: [0.8, 1.1], at: { w: 'L', u: 16.6, v: 5.4 }, desc: '', light: { dz: 0.35, r: 4.4 } },
  // test: a full-length mirror — the face, the hair and the features are changed in front of it; 小春's present. It stood by
  // 書房's front door (the user's call), then (2026-11-14, the user: tapped by mistake going out) along the same wall past the peg
  // rail, before the window. faces: its front looks along +x unturned (the wardrobe's too); both turn since 2026-11-14 (the user)
  { id: 'fullMirror', kind: 'floor', gift: 'koharu', faces: 'x', h: 5, name: '全身鏡', fp: [0.6, 1.3], home: { w: 'F', x: 0.3, y: 9.55, r: 0 }, desc: '', act: 'mirror' },
  { id: 'sconce4', kind: 'wall', starter: true, since: 8, name: '壁燈', size: [0.8, 1.1], at: { w: 'R', u: 11.8, v: 5.4, rm: 'bed' }, desc: '', light: { dz: 0.35, r: 4.4 } },
  // the string of lights along the tops of the walls, as four strings (1.2.0): hung end to end where it ran, three on the
  // right wall and one on the left, each moved or put away on its own; their bulbs light up one by one as the day's list fills.
  // test (roomV 8): they start in the storage box (at: where they hung, and where a string still hanging there is taken down from)
  { id: 'garland1', kind: 'wall', starter: true, garland: true, name: '串燈', size: [7.5, 0.5], at: { w: 'R', u: 4.05, v: 10.85 }, desc: '' },
  { id: 'garland2', kind: 'wall', starter: true, garland: true, name: '串燈', size: [7.5, 0.5], at: { w: 'R', u: 11.55, v: 10.85 }, desc: '' },
  { id: 'garland3', kind: 'wall', starter: true, garland: true, name: '串燈', size: [7.5, 0.5], at: { w: 'R', u: 19.05, v: 10.85 }, desc: '' },
  { id: 'garland4', kind: 'wall', starter: true, garland: true, name: '串燈', size: [7.5, 0.5], at: { w: 'L', u: 4.05, v: 10.85 }, desc: '' },
  // 書房's working things (fixed: moved, never put away; the door is the house's own and stays). drawn: where the
  // desk's drawing stands, which is no longer its first place (the desk and the window moved right, off the bookcase; roomV 3,
  // and further in roomV 8)
  { id: 'bookcase', kind: 'floor', starter: true, fixed: true, turn: false, h: 7.9, name: '書櫃', fp: [1.3, 2.25], at: { w: 'F', x: 0.65, y: 1.275, r: 0 }, desc: '' },
  { id: 'desk', kind: 'floor', starter: true, fixed: true, turn: false, h: 3.2, name: '書桌和椅子', fp: [3.8, 3.7], at: { w: 'F', x: 5.5, y: 1.85, r: 0 }, drawn: { w: 'F', x: 3.3, y: 1.85, r: 0 }, desc: '' },
  { id: 'chest', kind: 'floor', starter: true, fixed: true, turn: false, h: 4.3, name: '抽屜櫃', fp: [2.4, 1.7], at: { w: 'F', x: 12.5, y: 0.85, r: 0 }, drawn: { w: 'F', x: 8.45, y: 0.85, r: 0 }, desc: '' },
  { id: 'board', kind: 'wall', starter: true, fixed: true, name: '軟木板', size: [2.4, 2.3], at: { w: 'R', u: 12.5, v: 5.5 }, drawn: { w: 'R', u: 8.45, v: 5.5 }, desc: '' },
  { id: 'calendar', kind: 'wall', starter: true, fixed: true, name: '日曆', size: [1.6, 2.7], at: { w: 'R', u: 14.7, v: 5.75 }, drawn: { w: 'R', u: 10.65, v: 5.75 }, desc: '' },
  // records for the gramophone (2026-11-12): bought, one is on its list (MUSIC.RECORDS, the same id)
  { id: 'harukaze', kind: 'record', name: '唱片〈春風〉', price: 60, desc: '音樂盒和笛子，像春天的風一樣輕快。點書房的留聲機就能換上。' },
  { id: 'matsuri', kind: 'record', name: '唱片〈夏祭り〉', price: 60, desc: '笛子和太鼓，夏天祭典的熱鬧。神社有祭典的時候也聽得到。' },
  { id: 'tsukimi', kind: 'record', name: '唱片〈月見〉', price: 60, desc: '琴和笛子，安靜的秋夜賞月。' },
  { id: 'yukiasa', kind: 'record', name: '唱片〈雪の朝〉', price: 60, desc: '鋼琴和音樂盒，下過雪的早晨，安安靜靜的。' },
  { id: 'kissa', kind: 'record', name: '唱片〈喫茶しずく〉', price: 80, desc: '小鎮咖啡館「しずく」常放的爵士鋼琴。' },
  { id: 'obake', kind: 'record', limited: 'halloween', name: '唱片〈おばけの夜〉', price: 66, desc: '有點可怕又有點可愛的萬聖節之夜。' },
  // Christmas (2026-11-14, the user: one for each part worn, two for the head, some for the yard and the rooms, two houses and a
  // record), sold under 限時 from 12/11 to 1/8. The Christmas tree stands out in the yard (the user: not in the room)
  { id: 'santahat', kind: 'wear', slot: 'head', limited: 'christmas', name: '聖誕帽', price: 66, desc: '紅色的聖誕帽，一圈白色毛毛，帽尖軟軟地垂到一邊，掛著一顆白絨球。' },
  { id: 'antlers', kind: 'wear', slot: 'head', limited: 'christmas', name: '麋鹿角髮箍', price: 48, desc: '兩支咖啡色的麋鹿角，綁著紅色緞帶和小金鈴。' },
  { id: 'rednose', kind: 'wear', slot: 'face', limited: 'christmas', name: '麋鹿紅鼻子', price: 20, desc: '圓圓亮亮的紅鼻子，戴上就是帶路的那隻麋鹿。' },
  { id: 'hollybell', kind: 'wear', slot: 'neck', limited: 'christmas', name: '聖誕鈴鐺', price: 36, desc: '綠色絨布頸帶，掛著一顆金鈴鐺，旁邊兩片冬青葉和紅果子。' },
  { id: 'santacoat', kind: 'clothes', slot: 'top', limited: 'christmas', name: '聖誕老人外套', price: 90, desc: '白色毛毛的衣襟和袖口，黑色腰帶配金色扣環。顏色在衣櫃自己配，紅色最像。' },
  { id: 'santapants', kind: 'clothes', slot: 'bottom', limited: 'christmas', name: '聖誕老人褲', price: 60, desc: '褲管下面一圈白色毛毛。顏色在衣櫃自己配。' },
  { id: 'elfshoes', kind: 'clothes', slot: 'shoe', limited: 'christmas', name: '精靈鞋', price: 48, desc: '鞋尖翹起來捲成一圈，掛著一顆小金鈴，走路叮叮噹噹。顏色在衣櫃自己配。' },
  { id: 'giftsack', kind: 'wear', slot: 'back', limited: 'christmas', name: '禮物袋', price: 72, desc: '聖誕老公公的大布袋，綁著紅繩子，禮物都快滿出來了。' },
  { id: 'giftpile', kind: 'floor', limited: 'christmas', h: 1.1, name: '禮物堆', price: 30, fp: [1.1, 1.1], desc: '包得漂漂亮亮的禮物疊成一堆，不知道裡面是什麼。' },
  { id: 'poinsettia', kind: 'floor', limited: 'christmas', h: 1.5, name: '聖誕紅', price: 18, fp: [0.7, 0.7], desc: '紅色的葉子像一顆顆星星，冬天最有氣氛的花。', act: 'water' },
  { id: 'wreath', kind: 'wall', limited: 'christmas', name: '聖誕花圈', price: 24, size: [1.1, 1.1], desc: '冬青和松果編成的花圈，綁著紅色蝴蝶結。' },
  { id: 'stockings', kind: 'wall', limited: 'christmas', name: '聖誕襪', price: 20, size: [1.7, 1.3], desc: '三隻聖誕襪掛成一排，等著裝禮物。' },
  { id: 'bigtree', kind: 'yard', limited: 'christmas', name: '聖誕樹', price: 90, ground: [116, 18], desc: '種在院子裡的大樅樹，燈泡一圈一圈繞到頂，晚上整棵亮起來。點它，燈會閃得更熱鬧、星星會發亮。' },
  { id: 'snowman', kind: 'yard', limited: 'christmas', name: '雪人', price: 30, ground: [84, 14], desc: '胖胖圓圓的雪人，紅蘿蔔鼻子、紅圍巾，頭上倒扣一個水桶。拍拍他會彈一下。' },
  { id: 'lightdeer', kind: 'yard', limited: 'christmas', name: '燈飾麋鹿', price: 60, ground: [96, 14], desc: '金色燈泡串成的麋鹿，晚上一閃一閃的。' },
  { id: 'kamakura', kind: 'house', limited: 'christmas', name: '雪屋', price: 2000, desc: '雪堆成的圓圓かまくら，門口掛著草繩，晚上裡面點著燭光，暖暖的。' },
  { id: 'logcabin', kind: 'house', limited: 'christmas', name: '雪中小木屋', price: 2000, desc: '圓木搭的小屋，屋頂積著厚厚的雪，屋簷一圈彩色燈泡，門上掛著花圈，煙囪冒著煙。' },
  { id: 'jingle', kind: 'record', limited: 'christmas', name: '唱片〈ジングルベル〉', price: 66, desc: '雪橇的鈴聲和音樂盒，叮叮噹噹的聖誕夜。' }
];
const WARE = new Map(WARES.map((w) => [w.id, w]));
// the hero's seven parts, in the wardrobe's tabs and 古道具屋's 穿搭 (2026-11-12, the user: this order): what is worn there (kind
// 'wear') on the head, the face, the neck and the back; a style (kind 'clothes') of top, trousers and shoes, its key in the look
// STYLE_OF. 外衣 (body) is no longer the hero's: nothing to wear there, the town's aprons only
const WEAR_SLOTS = [['head', '頭部'], ['face', '臉部'], ['neck', '頸部'], ['top', '衣服'], ['bottom', '褲子'], ['shoe', '鞋子'], ['back', '背部']];
const STYLE_OF = { top: 'topStyle', bottom: 'bottomStyle', shoe: 'shoeStyle' };
const owns = (id) => Boolean(state.owned[id]) || Boolean(WARE.has(id) && WARE.get(id).starter);   // bought, or 書房's own
