// Nihongo Quest AI: asks Gemini with the owner's free-tier key on behalf of logged-in learners.
// Deployed as "swift-api" (the name the dashboard picked): paste this file into Edge Functions → swift-api → Code, then Deploy.
// Secrets: GEMINI_API_KEY (required). Optional: AI_MODEL_MAIN, AI_MODEL_SPARE, AI_MAIN_DAILY.
// Needs public.ai_take() from supabase/schema.sql (per-learner daily cap + the day's total).

const KEY = Deno.env.get('GEMINI_API_KEY') || '';
const MAIN = Deno.env.get('AI_MODEL_MAIN') || 'gemini-3.5-flash-lite';
const SPARE = Deno.env.get('AI_MODEL_SPARE') || 'gemini-3.1-flash-lite';
const MAIN_DAILY = Number(Deno.env.get('AI_MAIN_DAILY') || 450);   // the day's first N questions go to MAIN, the rest to SPARE
const TIMEOUT_MS = 20000;
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-region',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};
const reply = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

// Gemini's daily quota resets at midnight Pacific time; tell the learner when that is in Taiwan.
function resetHourTw() {
  const off = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Los_Angeles', timeZoneName: 'shortOffset' })
    .formatToParts(new Date()).find(p => p.type === 'timeZoneName')?.value || 'GMT-8';
  return 8 - Number(/GMT([+-]\d+)/.exec(off)?.[1] ?? -8);   // Taiwan is UTC+8: 15:00 in Pacific summer time, 16:00 in winter
}

// Quiz help doesn't need deliberation, and thinking makes answers slow. Ways to keep it short, tried in order:
// Gemini 2.5 / 3.1 take a zero budget, newer models may only take a level, some refuse both (a bare 400 "invalid argument").
const THINK: (Record<string, unknown> | null)[] = [{ thinkingBudget: 0 }, { thinkingLevel: 'minimal' }, { thinkingLevel: 'low' }, null];
const thinkOk = new Map<string, number>();   // per model: the THINK entry it last accepted (kept while this instance stays warm)

async function ask(model: string, body: Record<string, unknown>, step = thinkOk.get(model) ?? 0): Promise<string> {
  const gen = body.generationConfig as Record<string, unknown>;
  const payload = THINK[step] ? { ...body, generationConfig: { ...gen, thinkingConfig: THINK[step] } } : body;
  let r: Response;
  try {
    r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': KEY },
      body: JSON.stringify(payload), signal: AbortSignal.timeout(TIMEOUT_MS)
    });
  } catch (e) {
    throw Object.assign(new Error(`${model} timed out or unreachable: ${e}`), { status: 504 });
  }
  if (!r.ok) {
    const raw = await r.text();
    if (r.status === 400 && step < THINK.length - 1) return ask(model, body, step + 1);   // this model refuses that thinking setting
    throw Object.assign(new Error(`${model} ${r.status} ${raw.slice(0, 300)}`), { status: r.status, raw });
  }
  if (thinkOk.get(model) !== step) { thinkOk.set(model, step); console.log(`${model} thinking setting:`, JSON.stringify(THINK[step])); }
  const d = await r.json();
  const out = ((d.candidates?.[0]?.content?.parts) || []).map((p: { text?: string }) => p.text || '').join('');
  if (!out) throw Object.assign(new Error(`${model} returned no text`), { status: 502 });
  return out;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return reply(405, { error: '只接受 POST' });
  if (!KEY) return reply(500, { error: 'AI 還沒設定好（伺服器缺少 GEMINI_API_KEY）' });
  const auth = req.headers.get('Authorization') || '';
  const apikey = req.headers.get('apikey') || Deno.env.get('SUPABASE_ANON_KEY') || '';

  let input: { prompt?: unknown; system?: unknown; json?: unknown; temperature?: unknown };
  try { input = await req.json(); } catch { return reply(400, { error: '請求格式錯誤' }); }
  const prompt = typeof input.prompt === 'string' ? input.prompt : '';
  const system = typeof input.system === 'string' ? input.system : '';
  if (!prompt || prompt.length > 12000 || system.length > 4000) return reply(400, { error: '題目內容太長或是空的' });

  // count this question against the learner's daily cap; runs as the learner, so a bad login fails here
  const take = await fetch(`${Deno.env.get('SUPABASE_URL')}/rest/v1/rpc/ai_take`, {
    method: 'POST', headers: { apikey, Authorization: auth, 'Content-Type': 'application/json' }, body: '{}'
  });
  if (take.status === 401 || take.status === 403) return reply(401, { error: '請先登入才能使用 AI' });
  if (!take.ok) { console.error('ai_take', take.status, await take.text()); return reply(500, { error: 'AI 用量紀錄失敗，請稍後再試' }); }
  const used = await take.json() as { ok: boolean; mine: number; cap: number; total: number };
  if (!used.ok) return reply(429, { error: `今天的 AI 次數（${used.cap} 次）用完了，台灣時間 ${resetHourTw()} 點後恢復`, cap: true });

  const temperature = typeof input.temperature === 'number' ? input.temperature : 0.7;
  const body = {
    ...(system ? { systemInstruction: { parts: [{ text: system }] } } : {}),
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: { temperature, ...(input.json ? { responseMimeType: 'application/json' } : {}) }
  };
  const order = used.total <= MAIN_DAILY ? [MAIN, SPARE] : [SPARE, MAIN];   // after the day's MAIN share, MAIN is only the last resort
  let daily = false; let busy = false;
  for (const model of order) {
    try {
      const text = await ask(model, body);
      return reply(200, { text, model, mine: used.mine, cap: used.cap });
    } catch (e) {
      const err = e as Error & { status?: number; raw?: string };
      console.warn(err.message);
      if (err.status === 429) { if (/per[ _]?day|daily|PerDay/i.test(err.raw || '')) daily = true; else busy = true; continue; }
      if ([400, 404, 500, 502, 503, 504].includes(err.status || 0)) continue;   // overloaded, silent or retired: try the other model
      return reply(502, { error: `AI 回應錯誤（${err.status}）` });   // 401/403: the key itself
    }
  }
  if (busy) return reply(503, { error: '現在太多人在用 AI，等一分鐘再試' });
  if (daily) return reply(503, { error: `今天全站的 AI 額度用完了，台灣時間 ${resetHourTw()} 點後恢復` });
  return reply(503, { error: 'AI 暫時沒有回應，請稍後再試' });
});
