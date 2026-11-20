'use strict';
// ---------- 中華街の打工 (2026-11-14; docs/superpowers/specs/2026-11-14-chinatown-work-design.md §4–§7) ----------
// The user: a beginner should have somewhere to earn a little 円 — a second way beside the cruise's guide, the two unrelated; at
// most one workplace a day (later places too: 商店街's shops and others, 中華街 the first and lowest); the pay a tenth of what I
// first put (2026-11-14: too much). Four workplaces, a step up each (2026-11-19, the user: a clearer difficulty from job to job):
// 包包子 at 福明 with 王 (5 kana seen; kana and kana words heard), 站櫃 at らんらん (15; words heard), 外場 in らいらいけん (30 and
// three 入門 words; the talk; 2026-11-15: in place of 外送), 收銀 at ふく (N5's numbers learned; sums reckoned and read out —
// 2026-11-19, in place of 整理貨架). A shift is ten tasks (the 外場 six groups); one left halfway waits for its day, at that place
// only; the day is the town's day it began. Graded by the share right at once (as the cruise's guide), paid by the job (2026-11-20,
// the user: 站櫃 60 円, 包包子 80, 收銀 and 外場 100) and the grade (S 50 … C 10), a tip on top where a job gives one, and 2% more on
// all of it for each step up an area's 打工證 (AREAS); 円 only. Each job's runner registers itself (WORK.register) and drives the shift through its ctx: right(task, misses) as
// each is done, finish() at the tenth.
const WORK = (() => {
  const N = 10;
  const PLACES = {
    buns: { area: 'chinatown', pay: 80, place: 'chinatown', shop: 'seiro', who: 'wang', kana: 5, name: '包包子', at: '福明', tune: 'chukagai' },   // 5 (was 46): the first job (2026-11-19)
    counter: { area: 'chinatown', pay: 60, place: 'chinadori', shop: 'ranran', who: 'zhou', kana: 15, name: '站櫃', at: 'らんらん', tune: 'chukagai' },
    // 外場 2.0 (2026-11-15, docs/superpowers/specs/2026-11-15-hall-rush-design.md §2): a shift is six groups, each scored by its mood
    // at the door (0 pleased … 3 stormed out), graded with part credit for the not quite pleased
    waiter: { area: 'chinatown', pay: 100, place: 'rairai', shop: 'rairai', who: 'huang', kana: 30, words: ['いらっしゃいませ', 'どうぞ', 'はい'], name: '外場', at: 'らいらいけん', n: 6, credit: [1, 0.6, 0.3, 0], unit: '滿意的客人', tune: 'rairai' },
    till: { area: 'chinatown', pay: 100, place: 'chinadori', shop: 'fuku', who: 'zhang', kana: 46, need: '學「いくら」「円」和數字', name: '收銀', at: 'ふく', tune: 'chukagai' },   // need: its words (JOBS' left), named
    // 駅前 (2026-11-20, docs/superpowers/specs/2026-11-20-ekimae-work-design.md): the N5 area, open once 中華街's card is 一人前; each
    // job by the unit studied (course: that unit or past it), its keeper there (present) or its own hours
    bento: { area: 'ekimae', pay: 120, place: 'platform', shop: 'bento', who: 'haru', course: 'm1', present: true, name: '賣便當', at: 'みなと弁当', tune: 'ekimae', shut: '浜田ハル 7 點到 19 點在月台的便當攤。' },
    window: { area: 'ekimae', pay: 140, place: 'station', shop: 'window', who: 'harada', course: 'm2', hours: [7, 21], name: '售票窗口', at: 'きっぷうりば', tune: 'ekimae', shut: '售票窗口 7 點到 21 點。' },
    lost: { area: 'ekimae', pay: 160, place: 'station', shop: 'koban', who: 'kobayashi', course: 'm3', hours: [8, 22], name: '失物招領', at: '駅前交番', tune: 'ekimae', shut: '交番的失物招領 8 點到 22 點。' },
    taxi: { area: 'ekimae', pay: 180, place: 'station', shop: 'taxi', who: 'suzuki', course: 'm4', present: true, name: '計程車導航', at: '鈴木タクシー', n: 5, credit: [1, 0.6, 0.3, 0], unit: '順利載到的客人', tune: 'ekimae', shut: '鈴木 8–12 點、15–19 點在計程車招呼站（中午在食堂吃飯）。' } };
  // a workplace no more (外送, cut 2026-11-15; 整理貨架, 2026-11-19): its old records still read
  const GONE = { deliver: { name: '外送', at: 'らいらいけん' }, shelf: { name: '整理貨架', at: 'ふく' } };
  const named = (job) => PLACES[job] || GONE[job] || { name: job, at: '' };
  // 打工證, one an area (2026-11-20, the user: by area, 中華街's four jobs the first and lowest): 新人 till every job there has had
  // a shift graded S, then 一人前; each step up on any card 2% more on all the pay after it (the shift that takes it there: as it was)
  // after: the area whose card must be at its top first (駅前 after 中華街: 2026-11-20, the user — 「全都 S 才會變成下一階段的打工人」);
  // hours: what its board says of when
  const AREAS = { chinatown: { name: '中華街', ranks: ['新人', '一人前'], hours: '大通り的店 10 點到 19 點；らいらいけん 10 點到 20 點；福明要王老闆在。' },
    ekimae: { name: '駅前', ranks: ['新人', '一人前'], after: 'chinatown', hours: '便當攤 7–19 點（月台）；售票窗口 7–21 點；交番 8–22 點；計程車 8–12、15–19 點。' } };
  const RAISE = 0.02;
  const BONUS = { S: 50, A: 30, B: 20, C: 10, D: 0, E: 0 };
  const GRADES = [['S', 0.95], ['A', 0.85], ['B', 0.7], ['C', 0.5], ['D', 0.3], ['E', 0]];
  const JOBS = {};
  const day = () => dateStr(TOWNEV.today());
  const W = () => (state.work && state.work.res ? state.work : (state.work = { res: {} }));
  const fin = (r) => Boolean(r) && r.yen !== undefined;
  const today = () => W().res[day()] || null;
  const shifts = () => Object.values(W().res).filter(fin).length;   // done anywhere: a record only (the pay no longer goes by it)
  const jobsOf = (area) => Object.keys(PLACES).filter((j) => PLACES[j].area === area);
  const hadS = (job) => Object.values(W().res).some((r) => fin(r) && r.place === job && r.grade === 'S');
  const level = (area) => (jobsOf(area).every(hadS) ? AREAS[area].ranks.length - 1 : 0);   // the card's step (two so far: all S or not)
  const title = (area) => AREAS[area].ranks[level(area)];
  const ups = () => Object.keys(AREAS).reduce((a, k) => a + level(k), 0);   // steps up, every card: 2% each
  const nOf = (job) => (PLACES[job] && PLACES[job].n) || N;   // the tasks in a shift of this job (10, the 外場's six groups)
  const grade = (score, job) => { const v = Object.values(score || {}), cr = PLACES[job] && PLACES[job].credit, got = (m) => (cr ? cr[Math.min(m, cr.length - 1)] : m === 0 ? 1 : 0);
    const share = v.reduce((a, m) => a + got(m), 0) / Math.max(nOf(job), v.length); return GRADES.find(([, min]) => share >= min - 1e-9)[0]; };
  const pay = (job, g, tip = 0, up = ups()) => { const base = (PLACES[job] || {}).pay || 0, bonus = BONUS[g] || 0, raise = Math.round((base + bonus + tip) * RAISE * up);
    return { base, bonus, tip, raise, pct: Math.round(RAISE * 100 * up), yen: base + bonus + tip + raise }; };
  const seen = () => kanaSeenSet().size;
  const knowsAll = () => state.kanaKnown === true || !inPreStage();
  const kanaOk = (need) => knowsAll() || seen() >= need;
  // its kana seen — or the job's own switch on the test site says never mind (收銀's, 2026-11-20: on a device still in 入門 張 never
  // offered it, the switch skipping only the numbers)
  // 駅前's (2026-11-20): the area open (the card before it at its top) and the course at the job's unit — or the test site's switch
  const EKI = 'nq_work_eki', ekiFree = () => { try { return onTestSite() && localStorage.getItem(EKI) === '1'; } catch (e) { return false; } };
  function ekiTool() { const on = !ekiFree(); try { localStorage.setItem(EKI, on ? '1' : ''); } catch (e) { /* no storage */ } return on ? '駅前打工：不看條件（這台裝置），中華街還沒一人前、單元還沒到也能做' : '駅前打工：恢復要先拿到中華街「一人前」、學到那個單元'; }
  const top = (area) => level(area) >= AREAS[area].ranks.length - 1;
  const areaOpen = (area) => !AREAS[area].after || top(AREAS[area].after) || ekiFree();
  const unitOk = (u) => ekiFree() || TOWNEV.reachedIdx() >= TOWNEV.unitIdx(u);
  const unitName = (u) => { const x = DATA.UNITS.find((y) => y.id === u); return x ? x.short : u; };
  const opened = (job) => { const P = PLACES[job]; if (P.course) return areaOpen(P.area) && unitOk(P.course);
    return kanaOk(P.kana) || Boolean(JOBS[job] && JOBS[job].open && JOBS[job].open()); };
  // the kana the jobs may use: those seen — or all of them for one who knew kana already or is past 入門 (2026-11-15, the final
  // review: they had no kana seen, and three jobs drew from nothing)
  const kana = () => (knowsAll() ? new Set(REG.kana.map((x) => x.ch)) : kanaSeenSet());
  const at = (P) => (TOWNEV.whereIs(P.who, TOWNEV.now(), TOWNEV.today()) || {}).place === P.place;   // its keeper there now
  const inHours = ([a, b], h = TOWNEV.now()) => h >= a && h < b;
  const here = (job) => { const P = PLACES[job]; return P.present ? at(P) : P.hours ? inHours(P.hours) : job === 'buns' ? (TOWNEV.whereIs('wang', TOWNEV.now(), TOWNEV.today()) || {}).place === 'chinatown' : job === 'waiter' ? TOWNEV.isOpen('rairai', TOWNEV.now()) : TOWNEV.isOpen('dori', TOWNEV.now()); };
  // the 入門 words a job needs learned first (外場: いらっしゃいませ, どうぞ, はい) — the ones not yet, for one still in 入門
  // an 入門 word learned (or all of them, past 入門 — not for knowing kana: those words come in 入門's own lessons; the final review)
  const knows = (w) => !inPreStage() || REG.vocab.some((v) => v.w === w && v.r === w && state.srs[v.key]);
  const wordsLeft = (job) => (PLACES[job].words || []).filter((w) => !knows(w));
  const needs = (job) => (JOBS[job] && JOBS[job].left ? JOBS[job].left() : []);   // 收銀's numbers (and いくら, 円) still to learn
  // may this job be started (or picked up again) now: its kana seen, today's workplace (if any) this one and not done, open
  function can(job) {
    const P = PLACES[job]; if (!P) return { ok: false, why: '' };
    if (P.course && !areaOpen(P.area)) { const B = AREAS[AREAS[P.area].after]; return { ok: false, why: `先在${B.name}拿到打工證「${B.ranks[B.ranks.length - 1]}」（${B.name}的工作都拿過 S 級），${AREAS[P.area].name}的打工才會開放。` }; }
    if (P.course && !unitOk(P.course)) return { ok: false, why: `學到「${unitName(P.course)}」單元就能來${P.name}。` };
    if (!opened(job)) return { ok: false, why: `再學 ${P.kana - seen()} 個假名就能來${P.name}。` };
    const left = wordsLeft(job); if (left.length) return { ok: false, why: `先學會入門的${left.map((w) => `「${w}」`).join('')}，就能來${P.name}。` };
    const more = needs(job); if (more.length) return { ok: false, why: `先學會${more.map((w) => `「${w}」`).join('')}，就能來${P.name}。` };
    const t = today();
    if (t && t.place !== job && !free()) return { ok: false, why: `今天已經在「${named(t.place).name}」打過工了。一天只能在一個地方打工，明天再來吧。` };
    if (fin(t) && !free()) return { ok: false, why: '今天的班打完了，明天再來吧。' };
    if (!here(job)) return { ok: false, why: P.shut || (job === 'buns' ? '王老闆不在攤子（10 點到 20 點在）。' : job === 'waiter' ? 'らいらいけん 10 點到 20 點營業。' : '大通り的店 10 點到 19 點開門。') };
    return { ok: true };
  }
  // the test site (町の手帳, 2026-11-15, the user): shift after shift, any place, on this device — today's record put aside under the
  // day and a number (its pay kept with it) as the next begins
  const FREE = 'nq_work_free';
  const free = () => { try { return onTestSite() && localStorage.getItem(FREE) === '1'; } catch (e) { return false; } };
  function tool() { const on = !free(); try { localStorage.setItem(FREE, on ? '1' : ''); } catch (e) { /* no storage */ } return on ? '打工無限次數（這台裝置）：打完一班可以再打，也可以換別家' : '打工恢復一天只能一個地方、一班'; }
  function setAside(d) { const res = W().res; let n = 2; while (res[`${d}#${n}`]) n++; res[`${d}#${n}`] = res[d]; delete res[d]; }
  let S = null;   // the shift under way: { job, day }
  // a shift begun, or today's picked up where it was left; its runner given what it needs (ctx)
  function start(yard, job) {
    const c = can(job); if (!c.ok) { toast(c.why, 3600); return false; }
    const d = day(), res = W().res; if (free() && res[d] && (fin(res[d]) || res[d].place !== job)) setAside(d);
    if (!res[d]) { res[d] = { place: job, done: 0, score: {} }; saveState(); }
    const s = S = { job, day: d };
    if (res[d].done >= nOf(job)) { finish(s); return true; }   // all done but never paid (the card shut, the app gone, at the last moment): paid now
    const ctx = { yard, n: nOf(job), job, done: res[d].done, right: (k, misses) => right(s, k, misses), finish: (extra, ms) => finish(s, extra, ms), on: () => S === s,
      kept: Object.assign({}, res[d].keep), keep: (o) => { const r = W().res[d]; if (S === s && r && !fin(r)) { r.keep = o; saveState(); } } };   // keep: what the runner needs back after a break (外場's stars, its once-a-shift things), till paid
    const run = () => { if (S === s && JOBS[job]) JOBS[job].run(ctx); };
    const first = (TOWN.WORK.first || {})[job], before = Object.entries(res).some(([k, r]) => k !== d && r.place === job);   // the keeper's word the first time
    if (first && !before && !res[d].done) TALK.open(yard, PLACES[job].who, first, run, null, { ev: true }); else run();
    return true;
  }
  // before a shift (2026-11-19, the user: a job should first say how it is played and what it asks of you, then はい／いいえ): the
  // rules card — how it goes, the abilities it takes, how long a shift is and the pay — はい to begin (start), いいえ to leave it.
  // はたらく opens it; the keepers' first word (TOWN.WORK.first) keeps only what they say in Japanese, the rules being here
  const RULES = {
    counter: { how: ['客人用日文說要買什麼（用聽的），從櫃台上把那樣東西拿給他。', '學過「ふたつ」：有客人會要兩個，就拿兩次。', '客人底下那條是耐心：客人說完要什麼，你有 5 秒，拿錯也會少一截；沒了客人就走人，這位算失敗。'], uses: ['聽單字', '假名'], n: '一班 10 位客人' },
    waiter: { how: ['有「！」的就是在等你：客人頭上，或要帶位時的空桌子。點它走過去。', '聽客人說什麼，從下面三句選你要回的那句。帶位、點菜、端菜、結帳都靠你。', '客人頭上那條是耐心，越等越短；沒了客人就走人，店裡少一顆星。客滿時有人進門，先道歉請他等。'], uses: ['聽力', '招呼和店裡的會話', 'これ・それ・あれ'], n: '一班 6 組客人' },
    buns: { how: ['聽到哪個音，就在假名板上按哪個字；按對了包子就往下包一步。假名板上是你學過的平假名和片假名，發音像、字形像的會放在一起。', '按 30 下、包好 5 顆包子。每顆有 15 秒，喇叭旁邊那條就是；時間到還沒包好，這顆就變成醜包子進蒸籠、算失敗，接著包下一顆。全部按對又沒超時，王老闆會很激動。'], uses: ['聽假名', '認平假名、片假名'], n: '一班 5 顆包子' },
    // 駅前 (2026-11-20)
    bento: { how: ['電車停下來，車窗會一扇扇打開，乘客喊「すみません！」。點那扇窗，聽他要什麼、要幾個（先用聽的，按錯兩次字才會出來；喇叭可以再聽）。', '從箱子拿東西：點一下拿一個，點手上的放回去；拿好按「どうぞ」交給他。',
      '數東西：一般的東西用「つ」（ひとつ、ふたつ、みっつ），瓶子用「本」（いっぽん、にほん、さんぼん）；「A と B」是兩樣都要。學到形容詞以後，茶分熱的（あたたかい，橘色瓶蓋）和冷的（つめたい，藍色瓶蓋）。',
      '乘客問「〇〇、ありますか。」：箱子裡有就回「はい、あります。」，沒有就回「すみません、ありません。」。', '電車不等人：發車鈴響了就只剩 10 秒，車一開走，還沒拿到的乘客算失敗；全部遞完，車會提早開走。'], uses: ['聽數量和量詞', '「と」（和）', 'あたたかい・つめたい'], n: '一班 3 班電車、10 位乘客' },
    taxi: { how: ['你坐在鈴木的副駕駛座，腿上是鎮上的地圖。前三位乘客會一路告訴你怎麼走：「つぎの 角を 右に 曲がって ください」「二つ目の 角を…」「まっすぐ 行って ください」「あの 〜の 前で 止めて ください」。',
      '左右是照車頭的方向：車子往地圖下面開的時候，「右」是地圖的左邊。到路口前按「左」「まっすぐ」「右」，到了按「止めて」。', '後兩位只說要去哪裡（〜まで お願いします），自己在地圖上找到那個地方、選路開過去；繞太遠客人會唸。',
      '每個路口有幾秒可以決定，沒選鈴木就直走；走錯客人會叫停，算一次失誤。到了以後看跳表，說出車資。沒失誤的話，客人有時會說「おつりは いいです」給你小費。'], uses: ['右・左・まっすぐ', '〜て ください', '二つ目の 角', '地方的名字（漢字）'], n: '一班 5 趟' },
    lost: { how: ['來的人會說把什麼東西忘在哪裡了（〜に 〜を 忘れました）。先問它長什麼樣子：從三句選「どんな〜ですか」。', '客人會說兩個特徵，用「くて」「で」連起來：「黒くて、小さい 財布です」＝黑色的、小的錢包。顏色、大小、長短、新舊、圓的方的都會出現。',
      '小林會從後面拿出四個同種類的東西，只有兩個特徵都對的才是。點它拿起來，按「これですか」交給客人。', '錢包和包包可能有兩個長得一樣：客人會說裡面有什麼（中に カードと 写真が あります），點起來看裡面。四個都不是就按「すみません、ありません」。', '客人說完特徵才開始算耐心（25 秒），按錯會少一截。'], uses: ['形容詞（顏色、大小、新舊…）', 'くて・で 連接', 'どんな', '〜が あります／入って います'], n: '一班 10 位客人' },
    window: { how: ['客人在窗口問一個問題：到哪一站多少錢、下一班往哪裡的車幾點、在幾號月台、快速車停不停某一站，或是要買票（先用聽的，答對或錯兩次才出現字）。', '答案都在窗口上面：路線圖上每一站的票價（上面大人、下面小孩，● 是快速車會停的站）、時鐘、發車標。看好了，從下面三句選你要回答的那句。',
      '買票：先在路線圖點客人要去的站，車票印出來，再說「ぜんぶで …円です」。大人一張加小孩一張就把兩個加起來。', '時間的念法：10:25 是「じゅうじ にじゅうごふん」，10 分、40 分是「じゅっぷん、よんじゅっぷん」，7 點是「しちじ」、9 點是「くじ」。', '客人說完話開始算耐心（20 秒），按錯也會少一截；按喇叭重聽時耐心會暫停。'], uses: ['讀站名（漢字）', '時間和票價的念法', 'まで・に・は', 'ます・ません'], n: '一班 10 位客人' },
    till: { how: ['客人把要買的東西放上櫃台，每樣都有價格牌。只有一樣就問「これ、いくらですか。」，用字卡依序拼出價格的念法，例如 198円 → ひゃく｜きゅう｜じゅう｜はち｜えん。', '兩樣（或同一樣要「ふたつ」）就問「ぜんぶで いくらですか。」：自己加起來，拼出全部的錢，例如 248＋150 → さん｜びゃく｜きゅう｜じゅう｜はち｜えん。', '前 4 位買一樣，後 6 位買兩樣，不會更多。按錯一塊算一次失誤，錯兩次下一塊會亮。', '客人底下那條是耐心：買一樣 30 秒、兩樣 45 秒，按錯也會少一截；沒了客人就走人，這位算失敗。'], uses: ['數字的念法', 'ひゃく・せん 的音變', '兩個價錢相加'], n: '一班 10 位客人' } };
  function intro(yard, job) {
    const c = can(job); if (!c.ok) { toast(c.why, 3600); return false; }
    const P = PLACES[job], R = RULES[job], t = today(), back = t && t.place === job && !fin(t) ? t.done : 0, p = pay(job, 'E');
    CLASS.card('wk-rules', P.name, `<div class="wk-rhead"><span class="kr-face">${TOWNEV.face(P.who)}</span><p><b>${esc(P.name)}</b><span lang="ja">${esc(P.at)}</span></p></div>
      <h4>玩法</h4><ul class="wk-how">${R.how.map((l) => `<li>${esc(l)}</li>`).join('')}</ul>
      <h4>需要的能力</h4><p class="wk-uses">${R.uses.map((u) => `<span lang="ja">${esc(u)}</span>`).join('')}</p>
      <p class="wk-pay">${esc(R.n)}・底薪 ${p.base} 円＋評級加給最多 50 円${job === 'waiter' ? '＋店長紅包' : ''}${p.pct ? `・打工證加給 +${p.pct}%` : ''}</p>
      ${back ? `<p class="wk-back">今天做到 ${back}／${nOf(job)}，按「はい」接著做。</p>` : ''}
      <p class="wk-ask"><b lang="ja">はたらきますか？</b><span>要開始打工嗎？</span></p>
      <div class="wk-yn"><button type="button" class="btn" data-rules="yes" lang="ja">はい</button><button type="button" class="btn" data-rules="no" lang="ja">いいえ</button></div>`,
    (e) => { const b = e.target.closest('[data-rules]'); if (!b) return; CLASS.close(); if (b.dataset.rules === 'yes') start(yard, job); });
    return true;
  }
  // the job a person takes beginners on for, where they are now, once its kana are seen (today taken elsewhere or closed: still
  // offered, and はたらく says why not)
  const offer = (id, place) => { const job = Object.keys(PLACES).find((j) => PLACES[j].who === id && PLACES[j].place === place); return job && JOBS[job] && opened(job) ? job : null; };   // a job whose runner is in (駅前's came stage by stage)
  const hello = (id) => (TOWN.WORK.hello || {})[id] || ['いらっしゃい！', '歡迎光臨！'];
  // the hero's word for working, a reply picked in the talk (2026-11-20): yes to their はたらく？ (asked: their greeting was it), else asked for
  const ASK = ['アルバイト、させて ください。', '請讓我在這裡打工。'];
  const ask = (id, asked) => (asked && (TOWN.WORK.yes || {})[id]) || ASK;
  // the 求人看板 (2026-11-20, the user: on the outer street by the gate, and it should say what the four jobs are): each job — what it
  // is, where and with whom, its pay, what it takes (✓ those open to this learner); the area's 打工證 and today's
  const DOES = { buns: '聽王老闆念的假名，在假名板上按對的字，一步步把包子包好。', counter: '客人用日文說要什麼，從櫃台上找出來拿給他。',
    waiter: '帶位、點菜、端菜、結帳：聽客人說的話，選一句回他。', till: '用字卡拼出價格和全部加起來的念法，念給客人聽。',
    bento: '電車停靠時，聽車窗裡的乘客要什麼、要幾個，在發車前遞給他。', window: '看運賃表和發車標，回答票價、下一班幾點、幾番線，也賣票。',
    lost: '聽來找東西的人說它長什麼樣子，從失物架上找出對的那樣。', taxi: '坐在鈴木的副駕駛座，照乘客說的（右轉、直走、停在哪裡前面）在地圖上帶路。' };
  const WHERE = { buns: '牌樓外・王老闆', counter: '大通り・周美蘭', waiter: '大通り盡頭・黄', till: '大通り・張偉', bento: 'ホーム・浜田ハル', window: '駅・原田', lost: '交番・小林巡查', taxi: 'タクシー乗り場・鈴木' };
  // an area's 求人看板 (中華街's by its gate; 駅前's on the square, 2026-11-20): each of its jobs, what it takes; the card and today's
  function board(area) {
    if (!AREAS[area]) area = 'chinatown';   // called bare (or with the scene, as it was before areas)
    const t = today(), A = AREAS[area], lv = level(area), js = jobsOf(area), next = A.ranks[lv + 1], shut = !areaOpen(area);
    const rows = js.map((job) => { const P = PLACES[job], built = Boolean(JOBS[job]), ok = built && opened(job);
      const left = ok ? wordsLeft(job) : [], more = needs(job).length, go = ok && !left.length && !more;   // the kana seen, the 入門 words (外場) and numbers (收銀) still to learn
      const need = go ? '✓ 可以做' : !built ? '準備中' : P.course ? (shut ? `先拿到${AREAS[A.after].name}打工證「一人前」` : `學到「${unitName(P.course)}」單元`) : more ? P.need : ok ? `再學 ${left.length} 個入門單字` : `學 ${P.kana} 個假名`;
      return `<li class="wk-job${go ? ' ok' : ''}" data-job="${job}"><p class="wk-jtop"><b>${esc(P.name)}</b><span lang="ja">${esc(P.at)}</span><small>${esc(WHERE[job] || '')}</small><em>底薪 ${P.pay} 円</em></p>
        <p class="wk-does">${esc(DOES[job] || '')}</p><p class="wk-need">${esc(need)}</p></li>`; }).join('');
    const now = t ? (fin(t) ? `今天在「${esc(named(t.place).name)}」的班打完了。` : `今天在「${esc(named(t.place).name)}」打工中（${t.done}／${nOf(t.place)}）。`) : '今天還沒打工。一天只能選一個地方打一班。';
    const B = A.after && AREAS[A.after], title = area === 'chinatown' ? 'アルバイト ぼしゅう' : 'アルバイト<ruby>募集<rt>ぼしゅう</rt></ruby>';
    CLASS.card('wk-board', '求人看板', `<button type="button" class="cls-x" data-cls="x" aria-label="關閉">✕</button><div class="wk-bhead"><b lang="ja">${title}</b><span>求人看板・${esc(A.name)}</span></div>
      ${shut ? `<p class="wk-lock">先在${esc(B.name)}拿到打工證「${esc(B.ranks[B.ranks.length - 1])}」（${esc(B.name)}的工作都拿過 S 級），${esc(A.name)}的打工才會開放。</p>` : ''}
      <ul class="wk-jobs">${rows}</ul><p class="wk-today">${now}</p>
      <p class="wk-note">${esc(A.name)}打工證：${esc(A.ranks[lv])}${next ? `・${js.length} 份都拿過 S 級就升「${esc(next)}」（${js.filter(hadS).length}／${js.length}），之後薪水 +${Math.round(RAISE * 100)}%` : ''}。${esc(A.hours)}點老闆，選要來打工的那句回話。</p>`, () => {});
  }
  // a task done (misses: the tries wrong first): counted once, on the day the shift began
  function right(s, k, misses) {
    const r = W().res[s.day]; if (!r || fin(r)) return;
    if (!(k in r.score)) r.score[k] = Math.max(0, Math.floor(misses) || 0);
    r.done = Math.max(r.done || 0, Object.keys(r.score).length); saveState();
  }
  // the last done: graded and paid at once (extra.tip: on top — 外場's 店長紅包, named by extra.tipName), the results shown ms later
  // (or once ms, a promise, is kept: the goodbye said) — the runner calls it at the tenth, not at the end of its card's goodbye,
  // so a card shut then is paid all the same (2026-11-15, the final review)
  function finish(s, extra = {}, ms = 0) {
    const r = W().res[s.day]; if (!r || fin(r)) return null;
    const area = PLACES[s.job].area, was = level(area), before = yenBalance(), g = grade(r.score, s.job), p = Object.assign(pay(s.job, g, extra.tip || 0), { tipName: extra.tipName });
    Object.assign(r, { done: nOf(s.job), yen: p.yen, grade: g, tip: p.tip }); delete r.keep; saveState();
    if (S === s) S = null;
    const show = () => results(s.job, r, p, before, level(area) > was, extra.html);
    if (ms && ms.then) ms.then(show, show); else if (ms) setTimeout(show, ms); else show();
    return p;
  }
  // the results: the tasks right at once, the pay counting up, the grade stamped on, the area's 打工證 and whether it went up (up)
  function results(job, r, p, before, up, more = '') {   // more: the job's own lines under the pay (外場: each group, their words to hear again)
    const first = Object.values(r.score).filter((m) => m === 0).length, all = nOf(job), g = r.grade, el = document.createElement('div');
    const area = PLACES[job].area, A = AREAS[area], js = jobsOf(area), lv = level(area), next = A.ranks[lv + 1];
    el.className = 'cr-result wk-result'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', '打工結算'); el.dataset.at = location.hash;
    el.innerHTML = `<div class="crr-card"><div class="crr-head"><b>打工結算</b><span>${esc(named(job).name)}・${esc(named(job).at)}</span></div>
      <div class="crr-row"><span>${esc((PLACES[job] && PLACES[job].unit) || '一次就做對')}</span><b><i data-n="${first}">0</i> / ${all}</b></div>
      <div class="crr-row"><span>${yenIcon()}底薪</span><b><i data-n="${p.base}" data-yen>0</i> 円</b></div>
      ${p.bonus ? `<div class="crr-row"><span>評級加給（${g} 級）</span><b>+<i data-n="${p.bonus}" data-yen>0</i> 円</b></div>` : ''}
      ${p.tip ? `<div class="crr-row"><span>${esc(p.tipName || '小費')}</span><b>+<i data-n="${p.tip}" data-yen>0</i> 円</b></div>` : ''}
      ${p.raise ? `<div class="crr-row"><span>打工證加給（+${p.pct}%）</span><b>+<i data-n="${p.raise}" data-yen>0</i> 円</b></div>` : ''}
      <div class="crr-row crr-sum"><span>錢包</span><b><i data-n="${before + p.yen}" data-from="${before}" data-yen>${yenStr(before)}</i> 円</b></div>${more}
      <div class="crr-stamp g${g}" aria-label="${g} 級"><b>${g}</b><span>級バイト</span></div>
      <p class="crr-rank">${esc(A.name)}打工證：${esc(A.ranks[lv])}${up ? `　<em>升級！之後的薪水 +${Math.round(RAISE * 100)}%</em>` : next ? `<small>${js.length} 份工作都拿過 S 級就升「${esc(next)}」（${js.filter(hadS).length}／${js.length}）</small>` : ''}</p>
      <button type="button" class="btn btn-primary crr-ok">收下</button></div>`;
    document.body.appendChild(el);
    const nums = [...el.querySelectorAll('i[data-n]')], stamp = el.querySelector('.crr-stamp'), put = (x, v) => { x.textContent = x.dataset.yen !== undefined ? yenStr(v) : String(Math.round(v)); };
    const thud = () => { stamp.classList.add('on'); el.querySelector('.crr-card').classList.add('thud'); playSfx('stamp'); setTimeout(() => playSfx('fanfare'), 380); };
    if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) { nums.forEach((x) => put(x, Number(x.dataset.n))); stamp.classList.add('on', 'still'); }
    else nums.forEach((x, k) => setTimeout(() => {   // one after another, ticking up
      const to = Number(x.dataset.n), from = Number(x.dataset.from || 0), t0 = performance.now(); let ticks = 0;
      const f = (now) => { const u = Math.min(1, (now - t0) / 600); put(x, from + (to - from) * (1 - Math.pow(1 - u, 3))); if (Math.floor(u * 5) > ticks) { ticks = Math.floor(u * 5); playSfx('coin', ticks); } if (u < 1) requestAnimationFrame(f); else if (k === nums.length - 1) setTimeout(thud, 250); };
      requestAnimationFrame(f);
    }, 300 + k * 650));
    el.querySelector('.crr-ok').addEventListener('click', () => { el.remove(); if (typeof kotoButtons === 'function') kotoButtons(document); });
    el.addEventListener('click', (e) => { const b = e.target.closest('[data-say]'); if (b) { primeTtsPlayer(); speakAs(b.dataset.who, b.dataset.say); } });   // a line heard again
  }
  // 町の手帳's 打工證 page: a card an area — its step, how far to the next (the jobs with an S), each job's pay, shifts and best
  // grade; the shifts done in all, as a record
  function book() {
    const all = Object.values(W().res).filter(fin), n = all.length, up = ups();
    const gone = Object.keys(GONE).filter((job) => all.some((r) => r.place === job));   // a workplace no more, while it has shifts to show
    const row = (job, P) => { const mine = all.filter((r) => r.place === job), best = GRADES.map(([g]) => g).find((g) => mine.some((r) => r.grade === g));
      return `<tr><td>${esc(P.name)}</td><td lang="ja">${esc(P.at)}</td><td>${P.pay ? `${P.pay} 円` : '—'}</td><td>${mine.length} 班</td><td${best === 'S' ? ' class="wk-s"' : ''}>${best || '—'}</td></tr>`; };
    const shown = Object.keys(AREAS).filter((area) => !AREAS[area].after || areaOpen(area) || all.some((r) => PLACES[r.place] && PLACES[r.place].area === area));   // 駅前's card once it opens (or has shifts)
    const cards = shown.map((area) => { const A = AREAS[area], lv = level(area), js = jobsOf(area), next = A.ranks[lv + 1];
      return `<div class="wk-card"><span class="wk-title">${esc(A.name)}打工證</span><b class="wk-rank" lang="ja">${esc(A.ranks[lv])}</b><span>${next ? `${js.length} 份工作都拿過 S 級就升「${esc(next)}」（${js.filter(hadS).length}／${js.length}）` : `升上來了：所有打工的薪水 +${Math.round(RAISE * 100)}%`}</span></div>
        <table class="wk-tbl"><thead><tr><th>工作</th><th>場所</th><th>底薪</th><th>打過</th><th>最好</th></tr></thead><tbody>${js.map((job) => row(job, PLACES[job])).join('')}${area === 'chinatown' ? gone.map((job) => row(job, GONE[job])).join('') : ''}</tbody></table>`; }).join('');
    return `<div class="wk-book">${cards}${CRUISE.card()}
      <p class="wk-note">總共打過 ${n} 班${up ? `・打工證加給 +${Math.round(RAISE * 100 * up)}%` : ''}。一天只能在一個地方打一班。${shown.map((area) => `${esc(AREAS[area].name)}：${esc(AREAS[area].hours)}`).join('')}</p></div>`;
  }
  const register = (job, def) => { JOBS[job] = def; };
  // the music while a shift is under way and in sight (MUSIC.RECORDS: tune; 2026-11-18, the user: the jobs wanted a little music):
  // a job's card up (to its goodbye), or the 外場's floor running (to 黄's おつかれ) — MUSIC.sync() as either opens or shuts
  const tune = () => { const job = Object.keys(PLACES).find((j) => document.querySelector('.cls.wk-' + j)) || (typeof HALL === 'object' && HALL.on() ? 'waiter' : '');
    return job ? PLACES[job].tune : ''; };
  const lines = (add) => { Object.entries(TOWN.WORK.hello || {}).forEach(([id, l]) => add(id, l[0])); Object.values(TOWN.WORK.yes || {}).concat([ASK]).forEach((l) => add('hero', l[0])); Object.values(TOWN.WORK.first || {}).forEach((ls) => ls.forEach((l) => add(l[0], l[1]))); Object.values(JOBS).forEach((j) => j.lines && j.lines(add)); };
  return { N, nOf, PLACES, AREAS, kana, knows, free, tool, ekiTool, ekiOn: ekiFree, areaOpen, can, start, intro, register, has: (job) => Boolean(JOBS[job]), pay, level, title, ups, grade, shifts, today, book, shown: () => shifts() > 0, lines, on: () => S, offer, hello, ask, board, tune };
})();
