// Nơi DUY NHẤT nói chuyện với Telegram Bot API. Đổi JSON của Telegram ↔ kiểu dự án; không quy tắc nghiệp vụ.
// Gửi chữ THƯỜNG (không parse_mode) → chữ người dùng / AI không bao giờ thành định dạng hay link ẩn.
// Token nằm trong đường dẫn API (Telegram bắt buộc) → mọi câu lỗi đi qua redactSecrets trước khi trả ra.
import {
  HTTP_TIMEOUT_MS, MAX_INCOMING_TEXT_CHARS, TELEGRAM_API_BASE, TELEGRAM_CHUNK_CHARS, TELEGRAM_MAX_RETRY_WAIT_MS,
} from '../config/defaults.ts';
import type { ChatKind, IncomingUpdate, InlineButton } from '../domain/telegram.ts';
import { redactSecrets } from '../shared/redact.ts';
import { fail, ok, type Result } from '../shared/result.ts';

type Json = Record<string, unknown>;
const asObj = (v: unknown): Json | null => (v !== null && typeof v === 'object' && !Array.isArray(v) ? (v as Json) : null);
const asNum = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const asStr = (v: unknown): string | null => (typeof v === 'string' ? v : null);

/** Mã bot = phần số trước dấu ":" của token (dùng để nhận ra tin reply vào tin của chính bot). */
export function getBotIdFromToken(token: string): number | null {
  const id = Number(token.split(':')[0]);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

function toChatKind(type: string | null): ChatKind | null {
  if (type === 'private') return 'private';
  if (type === 'group' || type === 'supergroup') return 'group';
  return null; // kênh (channel) và loại lạ → bỏ
}

function displayName(from: Json): string {
  const name = [asStr(from.first_name), asStr(from.last_name)].filter(Boolean).join(' ').trim();
  return name || asStr(from.username) || 'ai đó';
}

/**
 * Đọc 1 update của Telegram → kiểu dự án; không nhận ra / thiếu trường → null (bỏ qua, không lỗi).
 * Chỉ nhận: tin mới (không nhận tin sửa), bấm nút, bot được thêm / bị xóa khỏi group.
 */
export function parseUpdate(raw: unknown, botId: number): IncomingUpdate | null {
  const u = asObj(raw);
  const updateId = asNum(u?.update_id);
  if (!u || updateId === null) return null;

  const msg = asObj(u.message);
  if (msg) {
    const chat = asObj(msg.chat);
    const from = asObj(msg.from);
    const chatId = asNum(chat?.id);
    const chatKind = toChatKind(asStr(chat?.type));
    const messageId = asNum(msg.message_id);
    const fromId = asNum(from?.id);
    const text = asStr(msg.text) ?? asStr(msg.caption);
    if (!chat || !from || chatId === null || !chatKind || messageId === null || fromId === null || text === null) return null;
    const replyFrom = asObj(asObj(msg.reply_to_message)?.from);
    return {
      kind: 'message', updateId, chatId, chatKind, chatTitle: asStr(chat.title), messageId, fromId,
      fromName: displayName(from), isFromBot: from.is_bot === true,
      text: text.slice(0, MAX_INCOMING_TEXT_CHARS),
      isReplyToBot: asNum(replyFrom?.id) === botId,
      sentAt: (asNum(msg.date) ?? 0) * 1000,
    };
  }

  const cb = asObj(u.callback_query);
  if (cb) {
    const fromId = asNum(asObj(cb.from)?.id);
    const cbMsg = asObj(cb.message);
    const chatId = asNum(asObj(cbMsg?.chat)?.id);
    const messageId = asNum(cbMsg?.message_id);
    const callbackId = asStr(cb.id);
    const data = asStr(cb.data);
    if (fromId === null || chatId === null || messageId === null || !callbackId || data === null) return null;
    return { kind: 'callback', updateId, callbackId, fromId, chatId, messageId, data };
  }

  const member = asObj(u.my_chat_member);
  if (member) {
    const chat = asObj(member.chat);
    const chatId = asNum(chat?.id);
    const byId = asNum(asObj(member.from)?.id);
    const status = asStr(asObj(member.new_chat_member)?.status);
    if (chatId === null || byId === null || !status || toChatKind(asStr(chat?.type)) !== 'group') return null;
    return { kind: 'membership', updateId, chatId, chatTitle: asStr(chat?.title), joined: status === 'member' || status === 'administrator', byId };
  }
  return null;
}

/** Cắt chữ dài thành các đoạn ≤ giới hạn Telegram, ưu tiên cắt ở chỗ xuống dòng. */
export function splitForTelegram(text: string, limit = TELEGRAM_CHUNK_CHARS): string[] {
  const chunks: string[] = [];
  let rest = text;
  while (rest.length > limit) {
    const cut = rest.lastIndexOf('\n', limit);
    const at = cut > limit / 2 ? cut : limit;
    chunks.push(rest.slice(0, at));
    rest = rest.slice(at).replace(/^\n/, '');
  }
  if (rest.length > 0 || chunks.length === 0) chunks.push(rest);
  return chunks;
}

export type TelegramClient = ReturnType<typeof createTelegramClient>;

/** Tạo client cho 1 bot. `fetchImpl` thay được trong test (không gọi Telegram thật). */
export function createTelegramClient(token: string, fetchImpl: typeof fetch = fetch) {
  // Gửi tin KHÔNG được tự thử lại khi đứt mạng / quá giờ: Telegram có thể đã nhận lần 1 → group thấy 2 tin trùng.
  // Chỉ thử lại khi Telegram trả rõ 429 / 5xx, hoặc với lệnh gọi lại vô hại (xóa tin, đăng ký webhook…).
  const NOT_SAFE_TO_REPEAT = new Set(['sendMessage']);
  async function call<T>(method: string, body: Json, attempt = 1): Promise<Result<T>> {
    try {
      const res = await fetchImpl(`${TELEGRAM_API_BASE}/bot${token}/${method}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(HTTP_TIMEOUT_MS),
      });
      const json = asObj(await res.json().catch(() => null));
      if (json?.ok === true) return ok(json.result as T);
      const retryAfterMs = (asNum(asObj(json?.parameters)?.retry_after) ?? 0) * 1000;
      const retryable = res.status === 429 || res.status >= 500;
      if (retryable && attempt === 1 && retryAfterMs <= TELEGRAM_MAX_RETRY_WAIT_MS) {
        await new Promise((r) => setTimeout(r, Math.max(retryAfterMs, 500)));
        return call<T>(method, body, 2);
      }
      return fail('E-TG-001', redactSecrets(`${method} ${res.status}: ${asStr(json?.description) ?? 'không rõ'}`, [token]));
    } catch (error) {
      if (attempt === 1 && !NOT_SAFE_TO_REPEAT.has(method)) return call<T>(method, body, 2);
      return fail('E-TG-001', redactSecrets(`${method}: ${(error as Error).message}`, [token]));
    }
  }

  const keyboard = (buttons?: InlineButton[][]) =>
    buttons ? { reply_markup: { inline_keyboard: buttons.map((row) => row.map((b) => ({ text: b.text, callback_data: b.data }))) } } : {};

  return {
    /** Gửi chữ thường; dài quá thì chia nhiều tin. Trả mã tin cuối (để thu hồi / sửa thẻ). */
    async sendMessage(chatId: number, text: string, opts: { replyTo?: number; buttons?: InlineButton[][] } = {}): Promise<Result<number>> {
      let lastId: number | null = null;
      const parts = splitForTelegram(text);
      for (const [i, part] of parts.entries()) {
        const isLast = i === parts.length - 1;
        const r = await call<{ message_id: number }>('sendMessage', {
          chat_id: chatId, text: part, link_preview_options: { is_disabled: true },
          ...(opts.replyTo && i === 0 ? { reply_parameters: { message_id: opts.replyTo, allow_sending_without_reply: true } } : {}),
          ...(isLast ? keyboard(opts.buttons) : {}),
        });
        if (!r.ok) return r;
        lastId = r.data.message_id;
      }
      return lastId === null ? fail('E-TG-001', 'sendMessage: không có mã tin') : ok(lastId);
    },
    /** Sửa chữ của thẻ xác nhận sau khi bấm (bỏ nút). */
    editMessageText: (chatId: number, messageId: number, text: string) =>
      call<unknown>('editMessageText', { chat_id: chatId, message_id: messageId, text: text.slice(0, TELEGRAM_CHUNK_CHARS) }),
    deleteMessage: (chatId: number, messageId: number) => call<boolean>('deleteMessage', { chat_id: chatId, message_id: messageId }),
    answerCallback: (callbackId: string, text?: string) =>
      call<boolean>('answerCallbackQuery', { callback_query_id: callbackId, ...(text ? { text } : {}) }),
    /** ATR-1: đăng ký webhook kèm secret_token; chỉ nhận đúng 3 loại update bot cần. */
    setWebhook: (url: string, secretToken: string) =>
      call<boolean>('setWebhook', { url, secret_token: secretToken, allowed_updates: ['message', 'callback_query', 'my_chat_member'], max_connections: 10 }),
    getMe: () => call<{ id: number; username?: string }>('getMe', {}),
    getWebhookInfo: () => call<{ url?: string; last_error_message?: string; pending_update_count?: number }>('getWebhookInfo', {}),
  };
}
