// Controller (CODING_STANDARDS 6.1): nhận yêu cầu HTTP → kiểm mã bí mật (ATR-1, ATR-3) → gọi service → trả phản hồi.
// Không quy tắc nghiệp vụ. Lỗi không lường trước → log + báo riêng Khang, vẫn trả 200 cho Telegram (tránh Telegram gửi lại mãi).
import { randomUUID } from 'node:crypto';
import { getVercelProductionHost, loadProcessEnv, type AppEnv } from '../config/env.ts';
import { getBotIdFromToken, parseUpdate } from '../adapters/telegram.adapter.ts';
import type { BotKey } from '../domain/telegram.ts';
import { notifyOwnerError } from '../services/notify.service.ts';
import { runTick } from '../services/tick.service.ts';
import { handleUpdate } from '../services/webhook.service.ts';
import { AppFailure } from '../shared/result.ts';
import { isSameSecret, readBearerToken } from '../shared/secret-compare.ts';
import { createRuntime } from './runtime.ts';

export const MAX_UPDATE_BYTES = 1_000_000;
const text = (status: number, body: string) => new Response(body, { status, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });

function readEnv(): AppEnv | null {
  const r = loadProcessEnv();
  if (r.ok) return r.data;
  console.error(JSON.stringify({ level: 'error', event: 'env_invalid', code: r.error.code, detail: r.error.detail }));
  return null;
}

/** POST /api/<bot> — Telegram gửi update. Sai mã bí mật → 401, không đọc thân (ATR-1). */
export async function handleWebhookRequest(bot: BotKey, request: Request): Promise<Response> {
  const env = readEnv();
  if (!env) return text(500, 'config');
  const secret = bot === 'ray' ? env.RAY_WEBHOOK_SECRET : env.LUI_WEBHOOK_SECRET;
  const token = bot === 'ray' ? env.RAY_BOT_TOKEN : env.LUI_BOT_TOKEN;
  if (!secret || !token) return text(404, 'not found');
  if (!isSameSecret(request.headers.get('x-telegram-bot-api-secret-token'), secret)) return text(401, 'unauthorized');
  if (Number(request.headers.get('content-length') ?? 0) > MAX_UPDATE_BYTES) return text(413, 'too large');
  const raw = await request.json().catch(() => null);
  const botId = getBotIdFromToken(token);
  const update = botId === null ? null : parseUpdate(raw, botId);
  if (!update) return text(200, 'ok');
  const rt = createRuntime(bot, env, randomUUID(), 'webhook');
  try {
    await handleUpdate(rt, update);
  } catch (e) {
    await notifyOwnerError(rt, e instanceof AppFailure ? e.code : 'E-TG-001', e instanceof AppFailure ? e.detail : (e as Error).message).catch(() => undefined);
  }
  return text(200, 'ok');
}

/** POST /api/tick — Supabase Cron gọi mỗi 10 phút với `Authorization: Bearer <TICK_SECRET>` (ATR-3). */
export async function handleTickRequest(request: Request): Promise<Response> {
  const env = readEnv();
  if (!env) return text(500, 'config');
  if (!isSameSecret(readBearerToken(request.headers.get('authorization')), env.TICK_SECRET)) return text(401, 'unauthorized');
  const host = getVercelProductionHost();
  const rt = createRuntime('ray', env, randomUUID(), 'tick');
  try {
    const r = await runTick(rt, host ? `https://${host}/api/ray` : null);
    return text(200, r.ran ? `ok${r.failed.length ? ` (lỗi: ${r.failed.join(',')})` : ''}` : 'skip');
  } catch (e) {
    await notifyOwnerError(rt, e instanceof AppFailure ? e.code : 'E-DB-001', e instanceof AppFailure ? e.detail : (e as Error).message).catch(() => undefined);
    return text(500, 'error');
  }
}
