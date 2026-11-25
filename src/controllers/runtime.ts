// Nối các mảnh cho 1 yêu cầu (webhook / tick): biến môi trường → database, Telegram, AI, nguồn tỉ giá.
// Chỉ ghép, không quy tắc nghiệp vụ. Mọi đối tượng dùng `fetch` chuẩn của Node.
import type { AppEnv } from '../config/env.ts';
import { callGeminiModel } from '../adapters/gemini.adapter.ts';
import { fetchFallbackMid, fetchVcb, fetchVpbank, fetchWiseLive } from '../adapters/rate-sources.adapter.ts';
import { createDb } from '../adapters/supabase.adapter.ts';
import { createTelegramClient } from '../adapters/telegram.adapter.ts';
import type { BotKey } from '../domain/telegram.ts';
import { createStore } from '../repositories/store.repository.ts';
import { EMPTY_AI_STATE, generate, type AiModelState } from '../services/ai.service.ts';
import type { Runtime } from '../services/runtime.types.ts';
import { encryptText, parseEncryptionKey } from '../shared/crypto.ts';
import { createLogger } from '../shared/logger.ts';


export function createRuntime(bot: BotKey, env: AppEnv, requestId: string, module: string): Runtime {
  const token = bot === 'ray' ? env.RAY_BOT_TOKEN : env.LUI_BOT_TOKEN ?? '';
  const secrets = [token, env.GEMINI_API_KEY, env.SUPABASE_SECRET_KEY, env.DATA_ENCRYPTION_KEY, env.TICK_SECRET, env.RAY_WEBHOOK_SECRET];
  const log = createLogger(requestId, module, secrets);
  const store = createStore(createDb(env.SUPABASE_URL, env.SUPABASE_SECRET_KEY));
  const key = parseEncryptionKey(env.DATA_ENCRYPTION_KEY);
  const now = () => new Date();
  const ai = (purpose: string, system: string, prompt: string) => generate({
    callModel: (model, sys, p) => callGeminiModel(model, sys, p, env.GEMINI_API_KEY),
    loadState: async () => (await store.getState<AiModelState>(bot, 'ai_model')) ?? EMPTY_AI_STATE,
    saveState: (s) => store.setState(bot, 'ai_model', s),
    // D1: log prompt MÃ HÓA, giữ ≤ 1 ngày (dọn 01:00). Log kỹ thuật chỉ ghi số liệu, không ghi chữ.
    log: async (e) => {
      log(e.ok ? 'info' : 'warn', 'ai_call', { purpose: e.purpose, model: e.model, ok: e.ok, error: e.error, ms: e.ms });
      await store.logAiCall({ bot, purpose: e.purpose, model: e.model, ok: e.ok, error: e.error, ms: e.ms,
        enc_prompt: encryptText(e.prompt, key), enc_reply: e.reply === null ? null : encryptText(e.reply, key) });
    },
    sleep: (ms) => new Promise((r) => setTimeout(r, ms)),
    now,
  }, purpose, system, prompt);
  return {
    bot, env, store, key, now, random: Math.random, ai, log, requestId, ownerId: Number(env.OWNER_TELEGRAM_ID),
    tg: createTelegramClient(token),
    fetchers: { wise: fetchWiseLive, fallback: fetchFallbackMid, vcb: fetchVcb, vpbank: fetchVpbank },
  };
}
