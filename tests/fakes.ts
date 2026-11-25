// Đồ giả cho test (không gọi dịch vụ thật — CODING_STANDARDS 6.6): database trong bộ nhớ, Telegram ghi lại tin gửi, AI giả.
import type { Db, Filter } from '../src/adapters/supabase.adapter.ts';
import { createStore } from '../src/repositories/store.repository.ts';
import { getDefaultSettings } from '../src/services/settings.service.ts';
import type { Runtime } from '../src/services/runtime.types.ts';
import { createLogger } from '../src/shared/logger.ts';
import { fail, ok, type Result } from '../src/shared/result.ts';

type Row = Record<string, unknown>;
const PK: Record<string, string[]> = { tick_runs: ['slot'], bot_config: ['bot'], bot_state: ['bot', 'key'], holidays: ['year'] };

const cmp = (a: unknown, b: unknown) => (typeof a === 'number' ? a - Number(b) : String(a).localeCompare(String(b)));
function match(row: Row, [c, op, v]: Filter): boolean {
  const x = row[c];
  if (op === 'eq') return String(x) === String(v);
  if (op === 'lt') return cmp(x, v) < 0;
  if (op === 'gte') return cmp(x, v) >= 0;
  return new RegExp(`^${String(v).replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*')}$`).test(String(x));
}

export function createMemoryDb(now: () => Date = () => new Date()) {
  const tables = new Map<string, Row[]>();
  let nextId = 1;
  const t = (name: string) => tables.get(name) ?? (tables.set(name, []), tables.get(name) as Row[]);
  const stamp = (r: Row): Row => {
    const iso = now().toISOString();
    return { id: nextId++, created_at: iso, at: iso, fetched_at: iso, updated_at: iso, ...r };
  };
  const db: Db = {
    select: async <T>(table: string, opts: { filters?: readonly Filter[]; order?: string; limit?: number } = {}) => {
      let rows = t(table).filter((r) => (opts.filters ?? []).every((f) => match(r, f)));
      if (opts.order) {
        const [col = 'id', dir] = opts.order.split('.');
        rows = [...rows].sort((a, b) => cmp(a[col], b[col]) * (dir === 'desc' ? -1 : 1));
      }
      return ok(rows.slice(0, opts.limit ?? 100) as T[]);
    },
    insert: async (table: string, rows: unknown) => { for (const r of [rows].flat()) t(table).push(stamp(r as Row)); return ok(null); },
    insertOnce: async (table: string, row: unknown): Promise<Result<boolean>> => {
      const keys = PK[table] ?? ['id'];
      if (t(table).some((r) => keys.every((k) => r[k] === (row as Row)[k]))) return ok(false);
      t(table).push(stamp(row as Row));
      return ok(true);
    },
    upsert: async (table: string, rows: unknown) => {
      for (const r of [rows].flat() as Row[]) {
        const keys = PK[table] ?? ['id'];
        const found = t(table).find((x) => keys.every((k) => x[k] === r[k]));
        if (found) Object.assign(found, r); else t(table).push(stamp(r));
      }
      return ok(null);
    },
    remove: async (table: string, filters: readonly Filter[]) => {
      if (filters.length === 0) return fail('E-DB-001', 'remove thiếu bộ lọc');
      tables.set(table, t(table).filter((r) => !filters.every((f) => match(r, f))));
      return ok(null);
    },
  };
  return { db, tables };
}

export type SentMessage = { chatId: number; text: string; buttons?: { text: string; data: string }[][]; replyTo?: number };

export function createFakeTelegram() {
  const sent: SentMessage[] = [];
  const edited: string[] = [];
  let webhookUrl = '';
  const menus: { scope: string; commands: string[] }[] = [];
  let msgId = 100;
  const tg = {
    sendMessage: async (chatId: number, text: string, opts: { replyTo?: number; buttons?: { text: string; data: string }[][] } = {}) => {
      sent.push({ chatId, text, ...opts }); return ok(++msgId);
    },
    editMessageText: async (_c: number, _m: number, text: string) => { edited.push(text); return ok(true as unknown); },
    deleteMessage: async () => ok(true),
    answerCallback: async () => ok(true),
    setWebhook: async (url: string) => { webhookUrl = url; return ok(true); },
    getWebhookInfo: async () => ok({ url: webhookUrl }),
    setMyCommands: async (commands: { command: string }[], scope: { type: string }) => { menus.push({ scope: scope.type, commands: commands.map((c) => c.command) }); return ok(true); },
    getMe: async () => ok({ id: 111, username: 'ray_test_bot' }),
  };
  return { tg, sent, edited, menus, getWebhookUrl: () => webhookUrl };
}

export const OWNER_ID = 999;
export const TEST_KEY = Buffer.alloc(32, 7);

/** Bộ đồ nghề giả: AI mặc định LỖI (để test đường lui); truyền `aiReply` để giả AI trả lời. */
export function createTestRuntime(opts: { now?: () => Date; aiReply?: (system: string, prompt: string) => string | null; random?: () => number } = {}) {
  const now = opts.now ?? (() => new Date());
  const mem = createMemoryDb(now);
  const fake = createFakeTelegram();
  const prompts: string[] = [];
  const rt: Runtime = {
    bot: 'ray', store: createStore(mem.db), key: TEST_KEY, now, random: opts.random ?? (() => 0.5),
    ai: async (_purpose, system, prompt) => {
      prompts.push(`${system}\n${prompt}`);
      const text = opts.aiReply?.(system, prompt) ?? null;
      return text === null ? fail('E-AI-003', 'giả lỗi') : ok({ text, model: 'fake' });
    },
    env: { RAY_WEBHOOK_SECRET: 'x'.repeat(40), LUI_WEBHOOK_SECRET: null } as Runtime['env'],
    tg: fake.tg as unknown as Runtime['tg'], log: createLogger('test', 'test'), requestId: 'test', ownerId: OWNER_ID,
    fetchers: {
      wise: async () => ok(19950.4), fallback: async () => ok(19900),
      vcb: async () => ok({ bank: 'VCB', cashBuyVnd: 19500, transferBuyVnd: 19600, sellVnd: 20300 }),
      vpbank: async () => fail('E-SRC-002', 'giả lỗi'),
    },
  };
  return { rt, mem, fake, prompts, defaults: getDefaultSettings('ray') };
}
