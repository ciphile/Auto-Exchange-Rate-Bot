// F-08 / ATR-5: thẻ xác nhận ✅ / ❌ cho MỌI thao tác ghi của Khang (đổi cài đặt, gắn nhóm, nhắn thay, sửa lịch lễ).
// Thẻ dùng 1 lần (xóa trước khi làm → bấm 2 lần không làm 2 lần), hết hạn 10 phút; lúc bấm ✅ ĐỌC LẠI cài đặt mới nhất rồi mới áp (Bẫy 33).
import { randomBytes } from 'node:crypto';
import type { Runtime } from './runtime.types.ts';
import { BUILTIN_HOLIDAYS } from '../config/holidays.ts';
import { BOT_TEXT } from '../shared/bot-text.vi.ts';
import { BOT_DISPLAY_NAMES } from '../shared/persona.vi.ts';
import { unwrap } from '../shared/result.ts';
import { applySettingsChange, mergeStoredSettings, type SettingsChange } from './settings.service.ts';
import { saveContextLine, speak } from './speech.service.ts';
import { EXCHANGE_MAX, EXCHANGE_STATE_KEY, type ExchangeContact } from './exchange.service.ts';
import { INTRO_FALLBACK, INTRO_FEATURES } from '../shared/intro.vi.ts';

export const CONFIRM_TTL_MS = 10 * 60_000;
export const RECALL_MAX_MS = 48 * 3600_000; // BR: /thuhoi trong 48 giờ (giới hạn của Telegram)

export type ConfirmCard =
  | { type: 'settings'; change: SettingsChange; createdAt: number }
  | { type: 'bind'; chatId: number; title: string; createdAt: number }
  | { type: 'relay'; text: string; createdAt: number }
  | { type: 'intro'; createdAt: number }
  | { type: 'holiday'; action: 'add' | 'remove'; date: string; name: string; createdAt: number }
  | { type: 'exchange'; action: 'add'; contact: ExchangeContact; createdAt: number }
  | { type: 'exchange'; action: 'remove'; index: number; createdAt: number };
type CardBody = ConfirmCard extends infer C ? (C extends ConfirmCard ? Omit<C, 'createdAt'> : never) : never;

/** Gửi thẻ vào chat riêng của Khang (kể cả khi lệnh gõ trong nhóm — không lộ thẻ ra nhóm). */
export async function sendConfirmCard(rt: Runtime, body: CardBody, text: string): Promise<void> {
  const id = randomBytes(5).toString('hex');
  await rt.store.setState(rt.bot, `confirm:${id}`, { ...body, createdAt: rt.now().getTime() });
  unwrap(await rt.tg.sendMessage(rt.ownerId, `${text}\n\n${BOT_TEXT.confirmAsk}`, { buttons: [[{ text: '✅ Làm', data: `ok:${id}` }, { text: '❌ Thôi', data: `no:${id}` }]] }));
}

/** Khang bấm nút. Người khác bấm → chỉ tắt vòng xoay, không làm gì (ATR-8). */
export async function handleConfirmPress(rt: Runtime, cb: { callbackId: string; fromId: number; chatId: number; messageId: number; data: string }): Promise<void> {
  const m = /^(ok|no):([0-9a-f]{10})$/.exec(cb.data);
  if (cb.fromId !== rt.ownerId || !m) { await rt.tg.answerCallback(cb.callbackId); return; }
  const stateKey = `confirm:${m[2]}`;
  const card = await rt.store.getState<ConfirmCard>(rt.bot, stateKey);
  await rt.store.deleteState(rt.bot, stateKey);
  const finish = async (text: string) => { await rt.tg.answerCallback(cb.callbackId); await rt.tg.editMessageText(cb.chatId, cb.messageId, text); };
  if (!card || rt.now().getTime() - card.createdAt > CONFIRM_TTL_MS) return finish(BOT_TEXT.confirmExpired);
  if (m[1] === 'no') return finish(BOT_TEXT.confirmCancel);
  return finish(await applyCard(rt, card));
}

async function applyCard(rt: Runtime, card: ConfirmCard): Promise<string> {
  const { store, bot } = rt;
  switch (card.type) {
    case 'settings': {
      const current = mergeStoredSettings(bot, (await store.loadConfig(bot)).settings);
      const next = applySettingsChange(current, card.change);
      await store.saveSettings(bot, next);
      await store.audit(bot, 'owner', 'settings', { key: card.change.key, before: card.change.beforeText, after: card.change.afterText });
      return `✅ ${card.change.label}: ${card.change.beforeText} → ${card.change.afterText}`;
    }
    case 'bind':
      await store.saveGroup(bot, card.chatId);
      await store.audit(bot, 'owner', 'bind_group', { chatId: card.chatId });
      return `✅ Đã gắn nhóm "${card.title}".`;
    case 'relay': {
      const { groupChatId } = await store.loadConfig(bot);
      if (groupChatId === null) return BOT_TEXT.relayNoGroup;
      const sent = unwrap(await rt.tg.sendMessage(groupChatId, card.text));
      await store.setState(bot, 'last_relay', { chatId: groupChatId, messageId: sent, at: rt.now().getTime() });
      await saveContextLine(store, bot, rt.key, { at: rt.now().getTime(), speaker: BOT_DISPLAY_NAMES[bot], isBot: true, text: card.text });
      await store.audit(bot, 'owner', 'relay', { chars: card.text.length });
      return `✅ ${BOT_TEXT.confirmDone}`;
    }
    case 'intro': {
      const { groupChatId, settings } = await store.loadConfig(bot);
      if (groupChatId === null) return BOT_TEXT.relayNoGroup;
      const r = await speak(rt, mergeStoredSettings(bot, settings), {
        purpose: 'reminder', fallback: INTRO_FALLBACK[bot],
        task: `Tự giới thiệu bản thân với cả nhóm THẬT NGẮN (tối đa 4 câu): tên mình + các việc chính sau, không thêm việc khác:\n- ${INTRO_FEATURES[bot].join('\n- ')}\nKết bằng 1 câu mời mọi người gọi tên khi cần.`,
      });
      unwrap(await rt.tg.sendMessage(groupChatId, r.text));
      await saveContextLine(store, bot, rt.key, { at: rt.now().getTime(), speaker: BOT_DISPLAY_NAMES[bot], isBot: true, text: r.text });
      await store.audit(bot, 'owner', 'intro', { usedAi: r.usedAi });
      return `✅ ${BOT_TEXT.confirmDone}`;
    }
    case 'exchange': {
      const list = [...((await store.getState<ExchangeContact[]>(bot, EXCHANGE_STATE_KEY)) ?? [])];
      if (card.action === 'add') {
        if (list.length >= EXCHANGE_MAX) return `Danh sách đã đủ ${EXCHANGE_MAX} nơi, xóa bớt trước nha.`;
        list.push(card.contact);
      } else {
        if (card.index < 1 || card.index > list.length) return 'Số thứ tự không có trong danh sách (gõ /chodencontact để xem).';
        list.splice(card.index - 1, 1);
      }
      await store.setState(bot, EXCHANGE_STATE_KEY, list);
      await store.audit(bot, 'owner', `exchange_${card.action}`, { count: list.length }); // không ghi tên / số điện thoại vào log
      return `✅ ${BOT_TEXT.confirmDone}`;
    }
    case 'holiday': {
      const year = Number(card.date.slice(0, 4));
      const dates = { ...((await store.getHolidays(year)) ?? BUILTIN_HOLIDAYS[year] ?? {}) };
      if (card.action === 'add') dates[card.date] = card.name; else delete dates[card.date];
      await store.saveHolidays(year, dates, 'khang');
      await store.audit(bot, 'owner', `holiday_${card.action}`, { date: card.date });
      return `✅ ${BOT_TEXT.holidaySaved}`;
    }
  }
}
