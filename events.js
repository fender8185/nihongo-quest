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
  },
  EVENTS: [
  ]
};
