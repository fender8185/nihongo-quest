/* Nihongo Quest town events. EVENTS_VERSION 1 — bump the version in index.html's <script src> and sw.js PRECACHE when this file changes.
   The people of the town (CAST: look, who they are, where they are by the hour), what they say when there is nothing on (CHAT, by
   the unit from which it can be said), and the events that open as the course goes on (EVENTS, in order, one a line).
   Japanese: every kanji in {漢字|かな}; a word above the event's level or not in the course glossed {漢字|かな|中文}.
   `node scripts/check-events.js` checks all of it against data.js (scripts/test.sh runs it). See
   docs/superpowers/specs/2026-11-09-town-events-design.md. */
const TOWN = {
  // the places people can be (index.html draws each one)
  PLACES: ['yard', 'beach', 'town', 'street', 'shokudo', 'izakaya', 'station', 'sento', 'shrine', 'castle'],
  // names of people, shops and places: no gloss needed
  NAMES: ['美玖', '健太', '森', '陽菜', '日向', '林', '美玲', '小春', '台湾', '東京', '渚', '健二'],
  // the shops' hours (the phone's real time; to < from runs past midnight)
  HOURS: { salon: [10, 19], bakery: [6, 14], shokudo: [11, 20], cafe: [8, 18], flowers: [10, 19], izakaya: [18, 1], goods: [10, 18] },
  // where people stand, by place: X along the land (0 the middle), Y up from the front
  SPOTS: {
    town: { salon: { X: -328, Y: 130 }, bakery: { X: -230, Y: 112 }, bakeryIn: { X: -188, Y: 130 }, shokudo: { X: -80, Y: 112 }, cafe: { X: 60, Y: 112 },
      flowers: { X: 200, Y: 112 }, izakaya: { X: 360, Y: 112 }, goods: { X: 500, Y: 112 }, street: { X: 280, Y: 70 } },
    beach: { mat: { X: -170, Y: 58 }, shore: { X: 220, Y: 96 } }
  },
  // shop: the shop they keep (its door says 準備中 until they are met); art 'npc': drawn by index.html (小春, ムギ: NPCS), shown once they
  // have come by; size: smaller than the hero
  // hours: [from, to, place, spot, days] — the first that fits now; days 'wd' weekdays, 'we' the weekend, none every day
  CAST: {
    koharu: { name: '小春', kana: 'こはる', role: '美容師', art: 'npc', shop: 'salon',
      bio: ['在小鎮開美容院「美容室こはる」，27 歲。開朗、愛聊八卦、很會照顧人，可是完全不會煮飯，晚餐都在外面吃。', '小時候外婆讓她剪頭髮，是她當美容師的開始。'],
      hours: [[10, 20, 'town', 'salon']] },
    mugi: { name: 'ムギ', kana: 'むぎ', role: '柴犬', art: 'npc',
      bio: ['海邊的柴犬，悠哉、愛音樂、愛吃。說話最後都會加「ワン」。', '以前常和外婆在海邊聽唱片。'],
      hours: [[6, 18, 'beach', 'mat'], [18, 22, 'town', 'cafe']] },
    kenta: { name: '森 健太', kana: 'もり けんた', role: 'パン屋', shop: 'bakery', look: { face: 'round', skin: '#e8bd98', cheeks: 'none', fringe: 'spiky', sides: 'above', hairBack: 'short', hairTop: 'none', hairColor: '#2a2524', eyes: 'happy', eyeColor: '#2a2730', brows: 'thick', mouth: 'grin', beard: 'stubble', topStyle: 'tee', top: '#ecebe6', bottomStyle: 'pants', bottom: '#6e4f3a', shoeStyle: 'loafer', shoe: '#2b2b33' },
      bio: ['「森のパン」的老闆，34 歲。大嗓門，愛講冷笑話，一定會塞試吃給你，什麼都要數一數。', '太太在美玖兩歲時過世，一個人帶女兒。外婆以前常幫他照顧美玖。', '夢想是開第二家店。'],
      hours: [[5, 21, 'town', 'bakery']] },
    miku: { name: '美玖', kana: 'みく', role: '健太的女兒', size: 0.72, look: { face: 'mochi', skin: '#f8dcc8', cheeks: 'blush', fringe: 'blunt', sides: 'above', hairBack: 'short', hairTop: 'twinbuns', hairColor: '#3b2f2a', eyes: 'kira', eyeColor: '#2a2730', brows: 'soft', mouth: 'o', beard: 'none', topStyle: 'tee', top: '#d9a43a', bottomStyle: 'skirt', bottom: '#e58fa8', shoeStyle: 'sneaker', shoe: '#d0574b' },
      bio: ['健太的女兒，5 歲，上幼稚園。好奇心旺盛，看到什麼都要問「これ、なに？」「どうして？」。', '最喜歡花店的陽菜姊姊。'],
      hours: [[7, 20, 'town', 'bakeryIn']] },
    hina: { name: '日向 陽菜', kana: 'ひなた ひな', role: '花屋', shop: 'flowers', look: { face: 'oval', skin: '#f3d1b5', cheeks: 'soft', fringe: 'airy', sides: 'wisps', hairBack: 'short', hairTop: 'ponytail', hairColor: '#6b4a32', eyes: 'sharp', eyeColor: '#3f7a52', brows: 'raised', mouth: 'grin', beard: 'none', topStyle: 'shirt', top: '#ecebe6', bottomStyle: 'skirt', bottom: '#3f4660', shoeStyle: 'loafer', shoe: '#2b2b33' }, wear: { neck: 'bowtie' },
      bio: ['高中二年級，17 歲，放學後幫媽媽顧「ひなた花店」。急性子、直率、愛吐槽，其實很細心。', '說話是年輕人的常體。想去東京念設計，為這件事跟媽媽吵架。'],
      hours: [[16, 22, 'town', 'flowers', 'wd'], [9, 22, 'town', 'flowers', 'we']] },
    lin: { name: '林 美玲', kana: 'リン メイリン', role: '雑貨屋', shop: 'goods', look: { face: 'oval', skin: '#e8bd98', cheeks: 'soft', fringe: 'sidepart', sides: 'tucked', hairBack: 'short', hairTop: 'sidelow', hairColor: '#2a2524', eyes: 'droopy', eyeColor: '#2a2730', brows: 'soft', mouth: 'smile', beard: 'none', topStyle: 'sweater', top: '#3f9a8c', bottomStyle: 'wide', bottom: '#e9e2d0', shoeStyle: 'loafer', shoe: '#6e4f3a' }, wear: { face: 'glasses' },
      bio: ['雜貨店「雑貨りんりん」的老闆，43 歲，台灣人。十五年前嫁來這裡，長大以後才開始學日文。', '溫柔有耐心，最懂學日文的辛苦，偶爾會冒出一句中文。先生健二是漁夫。'],
      hours: [[9, 21, 'town', 'goods']] }
  },
  // [unit, ja, zh]: said when there is nothing on, from that unit
  CHAT: {
    kenta: [['m0', 'いらっしゃいませ！', '歡迎光臨！'], ['m0', '{今日|きょう|今天}も パン、たくさん ありますよ！', '今天麵包也很多喔！'], ['m0', 'パンは、どれも おいしいですよ！', '麵包每一個都很好吃喔！'],
      ['m0', '{美玖|みく}は どこ？……あ、あそこ！', '美玖在哪裡？……啊，在那裡！'], ['m0', 'パン、パン、パーン！……ははは。', '麵包、麵包、砰——！……哈哈哈。']],
    miku: [['m0', 'これ、なに？', '這是什麼？'], ['m0', 'あれは？ あれは なに？', '那個呢？那個是什麼？'], ['m0', 'どうして？ どうして？', '為什麼？為什麼？'],
      ['m0', 'パパの パン、おいしいよ！', '爸爸的麵包很好吃喔！'], ['m0', 'ひなちゃん、どこ？', '陽菜姊姊在哪裡？']],
    hina: [['m0', 'いらっしゃいませー。', '歡迎光臨～。'], ['m0', 'この{花|はな|花}？ きれいでしょ。', '這朵花？很漂亮吧。'], ['m0', '……なに？ べつに ひまじゃないし。', '……幹嘛？我才沒有很閒。'],
      ['m0', '{美玖|みく}、また{来|き|來}たの？', '美玖又來了？'], ['m0', 'おばあちゃんの{庭|にわ|院子}の{花|はな|花}、すきだった。', '我很喜歡你外婆院子裡的花。']],
    lin: [['m0', 'いらっしゃいませ。ゆっくり どうぞ。', '歡迎光臨。請慢慢看。'], ['m0', '', '（用中文）今天也辛苦了！日文慢慢來就好。'], ['m0', 'この カップ、かわいいでしょう？', '這個杯子很可愛吧？'],
      ['m0', 'わたしも、ゼロからでしたよ。', '我也是從零開始的喔。'], ['m0', '「すみません」は、べんりな ことばですよ。', '「すみません」是很方便的一句話喔。']]
  },
  EVENTS: [
    // ---- m0 入門：あいさつ、AはBです／ですか、はい・いいえ、こそあど、も ----
    { id: 'm0-1', u: 'm0', who: 'kenta', at: 'town', title: '森のパン', lines: [['kenta', 'いらっしゃいませ！', '歡迎光臨！'], ['kenta', 'あれ？ はじめまして、ですね。', '咦？是第一次見面吧。'],
      { ask: '回答健太的招呼', opts: [['はじめまして。どうぞよろしく。', 1, '初次見面，請多指教。'], ['おやすみなさい。', 0, '「おやすみなさい」是睡前說的晚安。'], ['いってきます。', 0, '「いってきます」是出門時說的「我出門了」。']], pt: 'm0' },
      ['kenta', '{森|もり}です！ パン{屋|や|店}です。', '我姓森！開麵包店的。'], ['kenta', 'おばあちゃんの お{孫|まご|孫子}さん？', '你是那位老奶奶的孫子嗎？'],
      { ask: '回答：是的。', opts: [['はい、そうです。', 1, '是的，沒錯。'], ['いいえ、そうです。', 0, '「いいえ」是否定，後面卻說「そうです（是的）」，前後矛盾。'], ['はい、ちがいます。', 0, '「はい」之後接「ちがいます（不對）」，前後矛盾。']], pt: 'm0' },
      ['kenta', 'そうですか！ これ、どうぞ。メロンパンです。', '這樣啊！這個請你吃。是菠蘿麵包。'], ['hero', 'ありがとうございます！', '謝謝！'],
      ['kenta', 'おいしいパンで、{元気|げんき|有精神}パーン！……なんちゃって。', '吃了好吃的麵包，精神「砰」地來了！……開玩笑的。']] },
    { id: 'm0-2', u: 'm0', who: 'miku', at: 'town', after: 'm0-1', title: '「これ、なに？」', lines: [['miku', 'ねえねえ。', '欸欸。'], ['miku', 'これ、なに？', '這是什麼？（美玖舉起手上的麵包）'],
      { ask: '東西在美玖手上。回答：那是麵包。', opts: [['それは パンです。', 1, '那是麵包。'], ['これは パンです。', 0, '東西在美玖手上、離她近，離你遠：要用「それ」。'], ['あれは パンです。', 0, '「あれ」是離兩個人都遠的東西。']], pt: 'm0' },
      ['miku', 'ぶー！ ちがいます！ メロンパンです！', '噗——！不對！是菠蘿麵包！'], ['miku', 'じゃあ、あれは？', '那，那個呢？（美玖指著遠處的花店）'],
      { ask: '美玖指著遠處的花店。回答：那是花店。', opts: [['あれは {花屋|はなや|花店}です。', 1, '那是花店。'], ['それは {花屋|はなや|花店}です。', 0, '花店離你們兩個都遠：要用「あれ」。'], ['あれは {花屋|はなや|花店}ですか。', 0, '句尾加「か」就變成問句了。美玖是在問你喔。']], pt: 'm0' },
      ['miku', 'ピンポーン！ ひなちゃんの おみせ！', '答對了！是陽菜姊姊的店！'], ['miku', 'ひなちゃん、こわい。でも、すき！', '陽菜姊姊很兇，可是我喜歡她！']] },
    { id: 'm0-3', u: 'm0', who: 'hina', at: 'town', after: 'm0-2', title: 'ひなた花店', lines: [['hina', 'いらっしゃいませー。……ん？', '歡迎光臨～。……嗯？'],
      ['hina', 'あなた、おばあちゃんの{家|いえ|家}の{人|ひと|人}？', '你是住在老奶奶家的那個人？'],
      { ask: '回答陽菜：是的。', opts: [['はい、そうです。', 1, '是的。'], ['はい、ちがいます。', 0, '「はい」之後接「ちがいます（不對）」，前後矛盾。'], ['いいえ、そうです。', 0, '「いいえ」和「そうです」前後矛盾。']], pt: 'm0' },
      ['hina', 'ふーん。わたしは ひな。ここは うちの{店|みせ|店}。', '哼嗯。我是陽菜。這裡是我家的店。'], ['hina', '……これ、どうぞ。', '……這個，給你。（陽菜遞來一朵小花）'],
      { ask: '收下花的時候說什麼？', opts: [['ありがとうございます。', 1, '謝謝。'], ['どういたしまして。', 0, '「どういたしまして」是對方道謝時回的「不客氣」。'], ['ごめんなさい。', 0, '「ごめんなさい」是道歉的「對不起」。']], pt: 'm0' },
      ['hina', 'べ、べつに。おばあちゃんの{花|はな|花}、きれいだったから。', '才、才不是特地送你的。只是你外婆種的花一直很漂亮而已。']] },
    { id: 'm0-4', u: 'm0', who: 'lin', at: 'town', after: 'm0-3', title: '雑貨りんりん', lines: [['lin', 'いらっしゃいませ。……あの、すみません。', '歡迎光臨。……那個，不好意思。'],
      ['lin', '{台湾|たいわん}の{方|かた|人（禮貌的說法）}ですか。', '請問您是台灣人嗎？'],
      { ask: '回答林小姐：是的，我是台灣人。', opts: [['はい、{台湾人|たいわんじん|台灣人}です。', 1, '是的，我是台灣人。'], ['はい、{台湾人|たいわんじん|台灣人}ですか。', 0, '句尾加「か」就變成問句了。'], ['いいえ、{台湾人|たいわんじん|台灣人}です。', 0, '「いいえ」是否定，後面卻說「是台灣人」，前後矛盾。']], pt: 'm0' },
      ['lin', 'やっぱり！ わたしも{台湾人|たいわんじん|台灣人}です。', '果然！我也是台灣人。'], ['lin', '', '（用中文）我叫林美玲，十五年前嫁來這裡。叫我美玲就好！'],
      ['lin', '{主人|しゅじん|我先生}は{日本人|にほんじん|日本人}です。', '我先生是日本人。'],
      { ask: '告訴她：（我）外婆也是日本人。', opts: [['おばあちゃんも {日本人|にほんじん|日本人}です。', 1, '外婆也是日本人。'], ['おばあちゃんは {日本人|にほんじん|日本人}ですか。', 0, '這是在問「外婆是日本人嗎？」。'], ['おばあちゃんも {日本人|にほんじん|日本人}ではありません。', 0, '「ではありません」是「不是」。']], pt: 'm0' },
      ['lin', 'そうですか。……{日本語|にほんご|日語}、いっしょに がんばりましょう！', '這樣啊。……日文，我們一起加油吧！'], ['lin', '', '（用中文）有不懂的就來店裡問我，用中文問也可以喔。']] },
    { id: 'm0-5', u: 'm0', who: 'mugi', at: 'beach', after: 'm0-1', title: 'ムギとメロンパン', lines: [['mugi', 'くんくん……いい におい だワン。', '嗅嗅……好香喔。'], ['mugi', 'それ、なんだワン？', '那是什麼？'],
      { ask: '麵包在你手上。回答ムギ：這是麵包。', opts: [['これは パンです。', 1, '這是麵包。'], ['それは パンです。', 0, '麵包在你手上、離你近：要用「これ」。'], ['あれは パンです。', 0, '「あれ」是離兩個人都遠的東西。']], pt: 'm0' },
      ['mugi', 'パン！ ちょっと……ほしいワン。', '麵包！有一點……想要。'],
      { ask: '把麵包分給ムギ的時候說什麼？', opts: [['どうぞ。', 1, '請用。'], ['ください。', 0, '「ください」是「請給我」，跟別人要東西時說的。'], ['ただいま。', 0, '「ただいま」是回到家時說的「我回來了」。']], pt: 'm0' },
      ['mugi', 'いただきますワン！', '我開動了！'], ['mugi', '……おいしい！ ごちそうさまでした、ワン！', '……好好吃！謝謝招待！']] }
  ]
};
