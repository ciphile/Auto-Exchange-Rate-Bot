// BR-51: luồng đổi tiền trong nhóm — hỏi nguồn → nhận trả lời → (im lặng) tick tính mặc định chợ đen + Wise.
// Trả lời bằng câu CODE dựng (không gọi AI): số chính xác, nhanh, không tốn lượt AI.
import type { IncomingMessage } from '../domain/telegram.ts';
import { BOT_DISPLAY_NAMES } from '../shared/persona.vi.ts';
import { unwrap } from '../shared/result.ts';
import {
  askSourceText, CONVERT_ANSWER_TTL_MS, CONVERT_DEFAULT, CONVERT_DEFAULT_AFTER_MS, CONVERT_PENDING_KEY, CONVERT_PENDING_MAX,
  loadRateTable, matchConvertSources, renderConversion, resolveSources, type ConvertSource, type PendingConvert,
} from './convert.service.ts';
import type { AmountQuestion } from './number-guard.service.ts';
import type { Runtime } from './runtime.types.ts';
import type { BotSettings } from './settings.service.ts';
import { saveContextLine } from './speech.service.ts';

async function send(rt: Runtime, chatId: number, replyTo: number, text: string): Promise<void> {
  unwrap(await rt.tg.sendMessage(chatId, text, { replyTo }));
  await saveContextLine(rt.store, rt.bot, rt.key, { at: rt.now().getTime(), speaker: BOT_DISPLAY_NAMES[rt.bot], isBot: true, text });
}

async function reply(rt: Runtime, settings: BotSettings, chatId: number, replyTo: number, amount: AmountQuestion, sources: readonly ConvertSource[]) {
  const table = await loadRateTable(rt.store, rt.now());
  await send(rt, chatId, replyTo, renderConversion(amount, sources, table, !settings.personaOn));
}

const loadPending = async (rt: Runtime) => (await rt.store.getState<PendingConvert[]>(rt.bot, CONVERT_PENDING_KEY)) ?? [];

/** Có số tiền: đã nói nguồn → tính ngay; chưa nói → hỏi lại + ghi "đang chờ" (mỗi người 1 yêu cầu, tối đa 10). */
export async function startConvert(rt: Runtime, settings: BotSettings, msg: IncomingMessage, amount: AmountQuestion, chosen: ConvertSource[] | 'all' | 'default' | null): Promise<void> {
  if (chosen !== null) return reply(rt, settings, msg.chatId, msg.messageId, amount, resolveSources(chosen));
  const others = (await loadPending(rt)).filter((p) => p.fromId !== msg.fromId);
  const next = [...others, { fromId: msg.fromId, chatId: msg.chatId, messageId: msg.messageId, amount, askedAt: rt.now().getTime() }].slice(-CONVERT_PENDING_MAX);
  await rt.store.setState(rt.bot, CONVERT_PENDING_KEY, next);
  await send(rt, msg.chatId, msg.messageId, askSourceText(amount, !settings.personaOn));
}

/** Tin kế của đúng người đang được hỏi "nguồn nào?" có tên nguồn → tính luôn. Trả true nếu đã xử lý. */
export async function answerPendingConvert(rt: Runtime, settings: BotSettings, msg: IncomingMessage): Promise<boolean> {
  const pending = await loadPending(rt);
  const mine = pending.find((p) => p.fromId === msg.fromId && p.chatId === msg.chatId && rt.now().getTime() - p.askedAt <= CONVERT_ANSWER_TTL_MS);
  if (!mine) return false;
  const chosen = matchConvertSources(msg.text);
  if (chosen === null) return false;
  await rt.store.setState(rt.bot, CONVERT_PENDING_KEY, pending.filter((p) => p !== mine));
  await reply(rt, settings, msg.chatId, msg.messageId, mine.amount, resolveSources(chosen));
  return true;
}

/** Tick: yêu cầu im lặng quá 5 phút → tính theo mặc định (chợ đen + Wise), trả lời ngay dưới tin hỏi ban đầu. */
export async function runConvertDefaults(rt: Runtime, settings: BotSettings): Promise<void> {
  const pending = await loadPending(rt);
  if (pending.length === 0) return;
  const t = rt.now().getTime();
  const due = pending.filter((p) => t - p.askedAt >= CONVERT_DEFAULT_AFTER_MS);
  if (due.length === 0) return;
  await rt.store.setState(rt.bot, CONVERT_PENDING_KEY, pending.filter((p) => !due.includes(p)));
  for (const p of due) await reply(rt, settings, p.chatId, p.messageId, p.amount, CONVERT_DEFAULT);
}
