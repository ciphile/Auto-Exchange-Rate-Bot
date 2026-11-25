// 6.10a — chuẩn gọi AI của Khang: thứ tự model, xử lý từng mã lỗi, nghỉ khi hết lượt ngày, khối BỐI CẢNH, thân yêu cầu tối thiểu.
// + adapter database: khóa chỉ ở header apikey (Bẫy 22), lọc được mã hóa (B7), xóa phải có điều kiện.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildGeminiBody, callGeminiModel, classifyGeminiError, readGeminiText, type GeminiOutcome } from '../src/adapters/gemini.adapter.ts';
import { createDb } from '../src/adapters/supabase.adapter.ts';
import { CONTEXT_HEAD, EMPTY_AI_STATE, generate, getQuotaResetAfter, MODEL_ORDER, type AiDeps, type AiModelState } from '../src/services/ai.service.ts';

function makeDeps(script: (model: string, n: number) => GeminiOutcome, start: AiModelState = EMPTY_AI_STATE) {
  let state = start;
  const calls: string[] = [];
  const systems: string[] = [];
  const deps: AiDeps = {
    callModel: async (model, system) => { calls.push(model); systems.push(system); return script(model, calls.length); },
    loadState: async () => state, saveState: async (s) => { state = s; }, log: async () => undefined,
    sleep: async () => undefined, now: () => new Date('2026-11-25T03:00:00Z'),
  };
  return { deps, calls, systems, getState: () => state };
}

test('6.10a: 429 / phút → thử model kế ngay; thành công → nhớ model; tự gắn khối BỐI CẢNH', async () => {
  const { deps, calls, systems, getState } = makeDeps((_m, n) => (n === 1 ? { kind: 'quota_minute' } : { kind: 'ok', text: 'dạ', truncated: false }));
  const r = await generate(deps, 'test', 'VAI TRÒ', 'hỏi');
  assert.deepEqual(r, { ok: true, data: { text: 'dạ', model: MODEL_ORDER[1]?.model } });
  assert.equal(calls.length, 2);
  assert.ok(systems[0]?.startsWith(CONTEXT_HEAD));
  assert.equal(getState().lastModel, MODEL_ORDER[1]?.model);
});

test('6.10a: key sai (401/403) → dừng ngay E-AI-002, không thử model khác', async () => {
  const { deps, calls } = makeDeps(() => ({ kind: 'key' }));
  const r = await generate(deps, 'test', 's', 'p');
  assert.ok(!r.ok && r.error.code === 'E-AI-002');
  assert.equal(calls.length, 1);
});

test('6.10a: mọi model hết lượt ngày → E-AI-001 + nghỉ 3 tiếng (lần sau KHÔNG gọi mạng)', async () => {
  const { deps, calls, getState } = makeDeps(() => ({ kind: 'quota_day' }));
  const r = await generate(deps, 'test', 's', 'p');
  assert.ok(!r.ok && r.error.code === 'E-AI-001');
  assert.ok(getState().offlineUntil);
  const before = calls.length;
  await generate(deps, 'test', 's', 'p');
  assert.equal(calls.length, before);
});

test('6.10a: 404 → nhớ 30 ngày, lần sau bỏ qua model đó; 5xx thử lại cùng model 3 lần rồi bỏ cả nhóm', async () => {
  const gone = makeDeps((m) => (m === MODEL_ORDER[0]?.model ? { kind: 'gone' } : { kind: 'ok', text: 'ok', truncated: false }));
  await generate(gone.deps, 't', 's', 'p');
  await generate(gone.deps, 't', 's', 'p');
  assert.equal(gone.calls.filter((m) => m === MODEL_ORDER[0]?.model).length, 1);
  const busy = makeDeps((m) => (m.includes('lite') ? { kind: 'server' } : { kind: 'ok', text: 'ok', truncated: false }));
  const r = await generate(busy.deps, 't', 's', 'p');
  assert.ok(r.ok && r.data.model === 'gemini-flash-latest');
  assert.equal(busy.calls.filter((m) => m.includes('lite')).length, 3); // 1 model lite × 3 lần, các lite khác bị bỏ
});

test('6.10a: mốc reset quota 08:00 UTC (≈ 15:00 VN)', () => {
  assert.equal(new Date(getQuotaResetAfter(new Date('2026-11-25T03:00:00Z'))).toISOString(), '2026-11-25T08:00:00.000Z');
  assert.equal(new Date(getQuotaResetAfter(new Date('2026-11-25T09:00:00Z'))).toISOString(), '2026-11-26T08:00:00.000Z');
});

test('Bẫy 42: thân yêu cầu chỉ có contents / systemInstruction / generationConfig.maxOutputTokens', () => {
  const body = buildGeminiBody('s', 'p');
  assert.deepEqual(Object.keys(body).sort(), ['contents', 'generationConfig', 'systemInstruction']);
  assert.deepEqual(Object.keys(body.generationConfig), ['maxOutputTokens']);
});

test('6.10a: đọc trả lời bỏ phần thought; phân loại mã lỗi đúng bảng 13.5', () => {
  const r = readGeminiText({ candidates: [{ content: { parts: [{ text: 'nghĩ…', thought: true }, { text: 'Dạ ' }, { text: 'xong' }] }, finishReason: 'STOP' }] });
  assert.equal(r.text, 'Dạ xong');
  assert.equal(classifyGeminiError(404, '').kind, 'gone');
  assert.equal(classifyGeminiError(429, 'GenerateRequestsPerDayPerProjectPerModel').kind, 'quota_day');
  assert.equal(classifyGeminiError(429, 'per minute').kind, 'quota_minute');
  assert.equal(classifyGeminiError(400, 'API key not valid').kind, 'key');
  assert.equal(classifyGeminiError(503, '').kind, 'server');
});

test('Bẫy 44: key ở header, không trong URL; lỗi trả về đã che key', async () => {
  const key = ['AIza', 'Sy', 'x'.repeat(33)].join('');
  let seenUrl = '';
  let seenKey = '';
  const fakeFetch = (async (url: string, init: RequestInit) => {
    seenUrl = url; seenKey = (init.headers as Record<string, string>)['x-goog-api-key'] ?? '';
    return new Response(`bad request for key ${key}`, { status: 400 });
  }) as unknown as typeof fetch;
  const out = await callGeminiModel('gemini-flash-lite-latest', 's', 'p', key, fakeFetch);
  assert.ok(!seenUrl.includes(key));
  assert.equal(seenKey, key);
  assert.ok(out.kind === 'key' || (out.kind === 'bad_request' && !out.detail.includes(key)));
});

test('Bẫy 22 / B7: database — khóa chỉ ở header apikey; giá trị lọc được mã hóa; xóa không điều kiện bị từ chối', async () => {
  const secret = ['sb', 'secret', 'y'.repeat(30)].join('_');
  const seen: { url: string; headers: Record<string, string> }[] = [];
  const fakeFetch = (async (url: string, init: RequestInit) => {
    seen.push({ url, headers: init.headers as Record<string, string> });
    return new Response('[]', { status: 200 });
  }) as unknown as typeof fetch;
  const db = createDb('https://abc.supabase.co', secret, fakeFetch);
  await db.select('bot_state', { filters: [['key', 'eq', "x'&or=(1.eq.1)"]] });
  assert.equal(seen[0]?.headers.apikey, secret);
  assert.equal(seen[0]?.headers.Authorization, undefined);
  assert.ok(seen[0]?.url.includes('key=eq.x\'%26or%3D(1.eq.1)'));
  const r = await db.remove('rates', []);
  assert.equal(r.ok, false);
  assert.equal(seen.length, 1);
});
