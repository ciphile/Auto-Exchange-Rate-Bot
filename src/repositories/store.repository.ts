// Nơi DUY NHẤT đọc / ghi database (CODING_STANDARDS 6.1). Không quy tắc nghiệp vụ. Lỗi database → ném AppFailure (E-DB-001).
// Chữ riêng tư (tin chat, prompt) được MÃ HÓA trước khi vào đây — repository chỉ thấy chuỗi đã mã hóa.
import type { Db } from '../adapters/supabase.adapter.ts';
import type { BotKey } from '../domain/telegram.ts';
import type { Member } from '../services/prompt-context.service.ts';
import { unwrap } from '../shared/result.ts';

export type RateRow = { source: string; rate_vnd: number; extra: unknown; fetched_at: string };
export type Store = ReturnType<typeof createStore>;

/** Thời hạn giữ từng bảng (CODING_STANDARDS 6.11). 0 hoặc âm → từ chối dọn. */
export const RETENTION_DAYS = { rates: 60, auditLog: 365, aiCalls: 1, tickRuns: 7, confirmCards: 1 } as const;
const CONTEXT_KEEP = 20; // BR-36 kho ngữ cảnh ngắn

export function createStore(db: Db) {
  return {
    async loadConfig(bot: BotKey): Promise<{ settings: Record<string, unknown>; groupChatId: number | null }> {
      const rows = unwrap(await db.select<{ settings: Record<string, unknown>; group_chat_id: number | null }>('bot_config', { filters: [['bot', 'eq', bot]], limit: 1 }));
      return { settings: rows[0]?.settings ?? {}, groupChatId: rows[0]?.group_chat_id ?? null };
    },
    async saveSettings(bot: BotKey, settings: unknown): Promise<void> {
      unwrap(await db.upsert('bot_config', { bot, settings, updated_at: new Date().toISOString() }, 'bot'));
    },
    async saveGroup(bot: BotKey, groupChatId: number): Promise<void> {
      unwrap(await db.upsert('bot_config', { bot, group_chat_id: groupChatId, updated_at: new Date().toISOString() }, 'bot'));
    },
    async getState<T>(bot: BotKey, key: string): Promise<T | null> {
      const rows = unwrap(await db.select<{ value: T }>('bot_state', { columns: 'value', filters: [['bot', 'eq', bot], ['key', 'eq', key]], limit: 1 }));
      return rows[0]?.value ?? null;
    },
    async setState(bot: BotKey, key: string, value: unknown): Promise<void> {
      unwrap(await db.upsert('bot_state', { bot, key, value, updated_at: new Date().toISOString() }, 'bot,key'));
    },
    async deleteState(bot: BotKey, key: string): Promise<void> {
      unwrap(await db.remove('bot_state', [['bot', 'eq', bot], ['key', 'eq', key]]));
    },
    async insertRate(source: string, rateVnd: number, extra: unknown = null): Promise<void> {
      unwrap(await db.insert('rates', { source, rate_vnd: rateVnd, extra }));
    },
    async getRatesSince(source: string, sinceIso: string, limit = 60): Promise<RateRow[]> {
      return unwrap(await db.select<RateRow>('rates', { filters: [['source', 'eq', source], ['fetched_at', 'gte', sinceIso]], order: 'fetched_at.desc', limit }));
    },
    async getLatestRate(source: string): Promise<RateRow | null> {
      return unwrap(await db.select<RateRow>('rates', { filters: [['source', 'eq', source]], order: 'fetched_at.desc', limit: 1 }))[0] ?? null;
    },
    /** Thêm 1 tin (đã mã hóa) vào kho ngữ cảnh; giữ tối đa 20 tin mới nhất / bot. */
    async addContext(bot: BotKey, enc: string): Promise<void> {
      unwrap(await db.insert('chat_context', { bot, enc }));
      const rows = unwrap(await db.select<{ id: number }>('chat_context', { columns: 'id', filters: [['bot', 'eq', bot]], order: 'id.desc', limit: CONTEXT_KEEP + 1 }));
      const cut = rows[CONTEXT_KEEP];
      if (cut) unwrap(await db.remove('chat_context', [['bot', 'eq', bot], ['id', 'lt', cut.id + 1]]));
    },
    /** Kho ngữ cảnh: cũ → mới (đã mã hóa). */
    async listContext(bot: BotKey): Promise<string[]> {
      const rows = unwrap(await db.select<{ enc: string }>('chat_context', { columns: 'enc', filters: [['bot', 'eq', bot]], order: 'id.desc', limit: CONTEXT_KEEP }));
      return rows.map((r) => r.enc).reverse();
    },
    /** D4: kho tin cả ngày (đã mã hóa) cho /tomtat. */
    async addChatLog(bot: BotKey, enc: string): Promise<void> {
      unwrap(await db.insert('chat_log', { bot, enc }));
    },
    /** Tin trong kho cả ngày: cũ → mới, tối đa `limit` tin MỚI nhất. */
    async listChatLog(bot: BotKey, limit = 600): Promise<string[]> {
      const rows = unwrap(await db.select<{ enc: string }>('chat_log', { columns: 'enc', filters: [['bot', 'eq', bot]], order: 'id.desc', limit }));
      return rows.map((r) => r.enc).reverse();
    },
    async listMembers(): Promise<Member[]> {
      const rows = unwrap(await db.select<{ name: string; aliases: string; how_to_call: string; work: string; about: string; telegram_user_id: number | null }>('members', { order: 'id.asc', limit: 30 }));
      return rows.map((r) => ({
        name: r.name, aliases: r.aliases.split(',').map((a) => a.trim()).filter(Boolean),
        howToCall: r.how_to_call || r.name, work: r.work, about: r.about, telegramUserId: r.telegram_user_id,
      }));
    },
    async getHolidays(year: number): Promise<Record<string, string> | null> {
      return unwrap(await db.select<{ dates: Record<string, string> }>('holidays', { columns: 'dates', filters: [['year', 'eq', year]], limit: 1 }))[0]?.dates ?? null;
    },
    async saveHolidays(year: number, dates: Record<string, string>, source: string): Promise<void> {
      unwrap(await db.upsert('holidays', { year, dates, source, updated_at: new Date().toISOString() }, 'year'));
    },
    async audit(bot: BotKey, actor: string, action: string, detail: unknown = null): Promise<void> {
      unwrap(await db.insert('audit_log', { bot, actor, action, detail }));
    },
    async logAiCall(row: { bot: BotKey; purpose: string; model: string | null; ok: boolean; error: string | null; ms: number; enc_prompt: string; enc_reply: string | null }): Promise<void> {
      unwrap(await db.insert('ai_calls', row));
    },
    /** Khóa 1 lần: true = mình là người đầu tiên lấy khóa này (nhịp tick, update Telegram trùng). */
    async claimOnce(slot: string): Promise<boolean> {
      return unwrap(await db.insertOnce('tick_runs', { slot }));
    },
    /** Dọn dẹp 01:00: xóa sạch kho ngữ cảnh (D4) + dòng quá hạn từng bảng. */
    async cleanup(now: Date): Promise<void> {
      const ago = (days: number) => {
        if (days <= 0) throw new Error('thời hạn giữ phải > 0');
        return new Date(now.getTime() - days * 86_400_000).toISOString();
      };
      unwrap(await db.remove('chat_context', [['created_at', 'lt', now.toISOString()]]));
      unwrap(await db.remove('chat_log', [['created_at', 'lt', now.toISOString()]]));
      unwrap(await db.remove('ai_calls', [['at', 'lt', ago(RETENTION_DAYS.aiCalls)]]));
      unwrap(await db.remove('rates', [['fetched_at', 'lt', ago(RETENTION_DAYS.rates)]]));
      unwrap(await db.remove('audit_log', [['at', 'lt', ago(RETENTION_DAYS.auditLog)]]));
      unwrap(await db.remove('tick_runs', [['at', 'lt', ago(RETENTION_DAYS.tickRuns)]]));
      unwrap(await db.remove('bot_state', [['key', 'like', 'confirm:*'], ['updated_at', 'lt', ago(RETENTION_DAYS.confirmCards)]]));
    },
    async purgeHolidayYearsBefore(year: number): Promise<void> {
      unwrap(await db.remove('holidays', [['year', 'lt', year]]));
    },
  };
}
