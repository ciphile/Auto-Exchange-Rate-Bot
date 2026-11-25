// F-08 / BR-23: lệnh của Khang trong chat riêng (routeMessage đã kiểm đúng mã tài khoản Khang — ATR-8).
// Lệnh đổi dữ liệu → thẻ xác nhận (confirm.service). Lệnh xem → trả lời ngay, không gọi AI.
import type { IncomingMessage } from '../domain/telegram.ts';
import { BOT_TEXT } from '../shared/bot-text.vi.ts';
import { unwrap } from '../shared/result.ts';
import { getVnDateKey } from '../shared/vn-time.ts';
import { parseCommand } from './access.service.ts';
import { pruneAiState, type AiModelState } from './ai.service.ts';
import { listUpcoming, loadHolidayCalendar } from './calendar.service.ts';
import { RECALL_MAX_MS, sendConfirmCard } from './confirm.service.ts';
import { parseHolidayCommand } from './holiday.service.ts';
import { describeRateSource, type RateSource } from './rate.service.ts';
import type { Runtime } from './runtime.types.ts';
import { handleOwnerSettingsCommand, renderOwnerHelp, type BotSettings } from './settings.service.ts';

const HOLIDAY_LIST_DAYS = 120;
const RELAY_MAX_CHARS = 4000;
const reply = async (rt: Runtime, text: string) => { unwrap(await rt.tg.sendMessage(rt.ownerId, text)); };

export async function handleOwnerCommand(rt: Runtime, msg: IncomingMessage, settings: BotSettings): Promise<void> {
  const s = handleOwnerSettingsCommand(msg.text, settings);
  if (s.kind === 'proposal') return sendConfirmCard(rt, { type: 'settings', change: s.change }, s.confirmText);
  if (s.kind === 'reply') return reply(rt, s.text);

  const cmd = parseCommand(msg.text);
  switch (cmd?.name) {
    case 'start': case 'lenh': case 'help': return reply(rt, renderOwnerHelp());
    case 'tygia': return reply(rt, await renderRates(rt));
    case 'trangthai': return reply(rt, await renderStatus(rt, settings));
    case 'noi': {
      const text = (cmd.args ?? '').trim();
      if (!text) return reply(rt, 'Gõ: /noi <nội dung> — bot nhắn nguyên văn vào nhóm.');
      if ((await rt.store.loadConfig(rt.bot)).groupChatId === null) return reply(rt, BOT_TEXT.relayNoGroup);
      return sendConfirmCard(rt, { type: 'relay', text: text.slice(0, RELAY_MAX_CHARS) }, BOT_TEXT.relayAsk(text.slice(0, RELAY_MAX_CHARS)));
    }
    case 'thuhoi': {
      const last = await rt.store.getState<{ chatId: number; messageId: number; at: number }>(rt.bot, 'last_relay');
      if (!last || rt.now().getTime() - last.at > RECALL_MAX_MS) return reply(rt, BOT_TEXT.recallNone);
      unwrap(await rt.tg.deleteMessage(last.chatId, last.messageId));
      await rt.store.deleteState(rt.bot, 'last_relay');
      await rt.store.audit(rt.bot, 'owner', 'recall');
      return reply(rt, BOT_TEXT.recallDone);
    }
    case 'ngayle': {
      const h = parseHolidayCommand(msg.text);
      if (!h || h.kind === 'error') return reply(rt, h?.message ?? 'Sai cú pháp.');
      if (h.kind === 'list') return reply(rt, await renderHolidayList(rt));
      const name = h.kind === 'add' ? h.name : '';
      return sendConfirmCard(rt, { type: 'holiday', action: h.kind, date: h.date, name },
        h.kind === 'add' ? `Thêm ngày lễ ${h.date}: ${name}?` : `Xóa ngày lễ ${h.date}?`);
    }
    default: return reply(rt, 'Lệnh này chưa có. Gõ /lenh để xem danh sách lệnh.');
  }
}

export async function renderHolidayList(rt: Runtime): Promise<string> {
  const today = getVnDateKey(rt.now());
  const cal = await loadHolidayCalendar(rt.store, today);
  const items = listUpcoming(cal, today, HOLIDAY_LIST_DAYS);
  if (items.length === 0) return BOT_TEXT.holidayNone;
  const lines = items.map((h) => `- ${h.date.split('-').reverse().join('/')}: ${h.name}`).join('\n');
  return BOT_TEXT.holidayList(lines, Object.entries(cal.sources).map(([y, s]) => `${y} ${s}`).join(', '));
}

async function renderRates(rt: Runtime): Promise<string> {
  const lines: string[] = [];
  for (const source of ['wise', 'wise_fallback', 'vcb', 'vpbank'] as const) {
    const r = await rt.store.getLatestRate(source);
    if (r) lines.push(BOT_TEXT.rateLine(r.rate_vnd, describeRateSource(source as RateSource, new Date(r.fetched_at))));
  }
  return lines.length ? lines.join('\n') : BOT_TEXT.noRate;
}

async function renderStatus(rt: Runtime, settings: BotSettings): Promise<string> {
  const { groupChatId } = await rt.store.loadConfig(rt.bot);
  const ai = pruneAiState((await rt.store.getState<AiModelState>(rt.bot, 'ai_model')) ?? { gone: {}, quotaUntil: {}, offlineUntil: null, lastModel: null }, rt.now().getTime());
  const lastTick = await rt.store.getState<number>(rt.bot, 'last_tick');
  return [
    `Nhóm đã gắn: ${groupChatId === null ? 'CHƯA (vào nhóm gõ /gannhom)' : 'có'}`,
    `Lắng nghe: ${settings.listenOn ? 'bật' : 'tắt'} · Tính cách: ${settings.personaOn ? 'bật' : 'tắt'} · Tâm trạng: ${settings.mood}`,
    `Nhịp lịch (tick) gần nhất: ${lastTick ? new Date(lastTick).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }) : 'CHƯA CHẠY (kiểm Supabase Cron)'}`,
    `AI: model gần nhất ${ai.lastModel ?? '—'}${ai.offlineUntil ? ' · đang nghỉ do hết lượt' : ''} · model hết lượt: ${Object.keys(ai.quotaUntil).join(', ') || 'không'}`,
    '', await renderRates(rt), '', await renderHolidayList(rt),
  ].join('\n');
}
