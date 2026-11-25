// BR-15 / CODING_STANDARDS 6.4: lỗi báo RIÊNG Khang (mã + câu báo + cách xử lý + mã tra), không báo vào nhóm.
// Chống dồn dập: cùng 1 mã chỉ báo 1 lần / 6 giờ.
import type { ErrorCode } from '../domain/app-error.ts';
import { BOT_TEXT } from '../shared/bot-text.vi.ts';
import { ERROR_MESSAGES } from '../shared/messages.vi.ts';
import type { Runtime } from './runtime.types.ts';

export const OWNER_ERROR_REPEAT_MS = 6 * 3600_000;

export async function notifyOwnerError(rt: Runtime, code: ErrorCode, detail?: string): Promise<void> {
  rt.log('error', 'app_error', { code, detail });
  try {
    const key = `err:${code}`;
    const last = await rt.store.getState<number>(rt.bot, key);
    const t = rt.now().getTime();
    if (last && t - last < OWNER_ERROR_REPEAT_MS) return;
    await rt.store.setState(rt.bot, key, t);
  } catch { /* database hỏng (E-DB-001) → vẫn cố báo Khang, chấp nhận có thể lặp */ }
  const m = ERROR_MESSAGES[code];
  await rt.tg.sendMessage(rt.ownerId, BOT_TEXT.errorToOwner(code, m.message, m.fix, rt.requestId));
}
