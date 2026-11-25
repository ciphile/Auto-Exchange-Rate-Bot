// F-04 / F-08: xử lý 1 update Telegram của 1 bot. Đường đi: chống trùng → đọc cấu hình → routeMessage (luật thuần)
// → lệnh Khang / thẻ xác nhận / trả lời trong nhóm (BR-17) / chỉ lưu ngữ cảnh (BR-36). Quyết định nói = code; AI chỉ soạn lời.
import { BOT_CALL_NAMES } from '../config/defaults.ts';
import type { IncomingMessage, IncomingUpdate } from '../domain/telegram.ts';
import { BOT_TEXT } from '../shared/bot-text.vi.ts';
import { encryptText } from '../shared/crypto.ts';
import { BOT_DISPLAY_NAMES } from '../shared/persona.vi.ts';
import { unwrap } from '../shared/result.ts';
import { getVnDateKey } from '../shared/vn-time.ts';
import { parseCommand, routeMessage } from './access.service.ts';
import { buildHolidayFacts, findNextHoliday, loadHolidayCalendar } from './calendar.service.ts';
import { handleConfirmPress, sendConfirmCard } from './confirm.service.ts';
import { canFetchLiveNow, isSourceQuestionOpen, matchSourceKeywords, planLiveFetch, type LiveSource } from './live-rate.service.ts';
import { handleOwnerCommand, renderHolidayList } from './owner.service.ts';
import { renderGroupHelp } from './help.service.ts';
import { buildWorkCheer } from './cheer.service.ts';
import { buildConversionFact, parseAmountQuestion } from './number-guard.service.ts';
import { getDaysUntilPayday } from './payday.service.ts';
import { CHEER_TEXT } from '../shared/cheer.vi.ts';
import { resolveSpeaker, type Member } from './prompt-context.service.ts';
import { fetchAndStoreRates, getLatestMid } from './rate-feed.service.ts';
import { describeRateSource, estimateBlackMarketVnd } from './rate.service.ts';
import { getTimesheetDay } from './reminder.service.ts';
import type { Runtime } from './runtime.types.ts';
import { mergeStoredSettings, type BotSettings } from './settings.service.ts';
import { rateSpellings, saveContextLine, speak } from './speech.service.ts';

/** BR-30: câu đòi lấy giá NGAY (luật trước, AI sau). */
export const LIVE_RE = /(lấy|check|coi|xem|cập nhật|update)\s.{0,20}(giá|tỉ giá|tỷ giá)|(giá|tỉ giá|tỷ giá).{0,25}(ngay|bây giờ|giờ này|hiện tại|mới nhất|lúc này|live)/iu;
/** BR-42: câu hỏi về ngày lễ / ngày nghỉ (chỉ Rây — BR-45). */
export const HOLIDAY_Q_RE = /(ngày lễ|nghỉ lễ|lễ gì|lễ nào|có lễ|được nghỉ|nghỉ ngày nào|holiday)/iu;
export const RATE_TOPIC_RE = /(giá|tỉ giá|tỷ giá|sgd|đô sing|vnd|\brate\b|lương|đổi tiền|đổi ra)/iu;

/**
 * Câu gõ KHÔNG DẤU ("ray oi gia sao roi") — so bằng từ khóa không dấu, CHỈ khi cả câu không có dấu
 * (Bẫy 16: "già sao rồi" có dấu thì không được bỏ dấu rồi hiểu thành "giá").
 */
const FOLDED = {
  live: /\b(lay|check|coi|xem|cap nhat|update) (ty )?gia\b|\bgia\b.{0,25}\b(ngay|bay gio|hien tai|moi nhat|luc nay|live)\b/,
  holiday: /\b(ngay le|nghi le|le gi|le nao|co le|duoc nghi|holiday)\b/,
  rate: /\b(ty gia|gia(?! dinh)|sgd|do sing|rate|luong|doi tien|doi ra)\b/,
};
const hasVietnameseMarks = (t: string) => /[^\x00-\x7F]/.test(t.replace(/[\p{Extended_Pictographic}\uFE0F\u200D]/gu, ''));
/** Câu này thuộc ý nào (luật trước, AI sau) — có dấu dùng regex có dấu, không dấu dùng bộ không dấu. */
export function matchesIntent(text: string, intent: 'live' | 'holiday' | 'rate'): boolean {
  const accented = { live: LIVE_RE, holiday: HOLIDAY_Q_RE, rate: RATE_TOPIC_RE }[intent];
  return accented.test(text) || (!hasVietnameseMarks(text) && FOLDED[intent].test(text.toLowerCase()));
}
const usernameCache = new Map<string, string>();

async function getBotUsername(rt: Runtime): Promise<string> {
  const cached = usernameCache.get(rt.bot);
  if (cached) return cached;
  const me = unwrap(await rt.tg.getMe());
  const name = (me.username ?? '').toLowerCase();
  usernameCache.set(rt.bot, name);
  return name;
}

export async function handleUpdate(rt: Runtime, update: IncomingUpdate): Promise<void> {
  // Telegram gửi lại update khi webhook trả lời chậm → chỉ xử lý 1 lần.
  if (!(await rt.store.claimOnce(`upd:${rt.bot}:${update.updateId}`))) return;
  if (update.kind === 'callback') return handleConfirmPress(rt, update);
  const config = await rt.store.loadConfig(rt.bot);
  if (update.kind === 'membership') {
    const title = update.chatTitle ?? 'không tên';
    if (update.joined) unwrap(await rt.tg.sendMessage(rt.ownerId, BOT_TEXT.joinedGroup(title)));
    else if (update.chatId === config.groupChatId) unwrap(await rt.tg.sendMessage(rt.ownerId, BOT_TEXT.leftGroup(title)));
    return;
  }
  const settings = mergeStoredSettings(rt.bot, config.settings);
  const decision = routeMessage({
    message: update, ownerId: rt.ownerId, boundGroupId: config.groupChatId, listenOn: settings.listenOn,
    callNames: BOT_CALL_NAMES[rt.bot], botUsername: await getBotUsername(rt),
  });
  rt.log('info', 'route', { route: decision.route, reason: decision.reason });
  const members = decision.route === 'ignore' && !decision.storeInContext ? [] : await rt.store.listMembers();
  const line = { at: update.sentAt, speaker: resolveSpeaker(update.fromId, update.fromName, members), isBot: false, text: update.text };
  if (decision.storeInContext) await saveContextLine(rt.store, rt.bot, rt.key, line);
  // D4 / BR-16: kho cả ngày cho /tomtat — chỉ khi đang lắng nghe; nguyên văn, mã hóa, không gọi AI theo từng tin.
  if (decision.storeInChatLog) await rt.store.addChatLog(rt.bot, encryptText(JSON.stringify(line), rt.key));
  switch (decision.route) {
    case 'owner_command': return handleOwnerCommand(rt, update, settings);
    case 'owner_chat': return answer(rt, settings, update, members, rt.ownerId, false);
    case 'bind_group': return sendConfirmCard(rt, { type: 'bind', chatId: update.chatId, title: update.chatTitle ?? 'không tên' }, BOT_TEXT.bindAsk(update.chatTitle ?? 'không tên'));
    case 'group_command': {
      const name = parseCommand(update.text)?.name;
      if (name === 'help') { unwrap(await rt.tg.sendMessage(update.chatId, renderGroupHelp(rt.bot), { replyTo: update.messageId })); return; }
      if (name === 'tygia' || name === 'gia') return answer(rt, settings, update, members, update.chatId, true, true);
      if (name === 'ngayle') { unwrap(await rt.tg.sendMessage(update.chatId, await renderHolidayList(rt), { replyTo: update.messageId })); }
      return;
    }
    case 'group_addressed': return answer(rt, settings, update, members, update.chatId, true);
    default: return; // group_listen: tick quyết định chen chuyện (BR-18) · ignore: im lặng
  }
}

/** Trả lời 1 câu (trong nhóm hoặc chat riêng của Khang). Hỏi giá ngay → lấy giá trước (BR-30), rồi AI soạn lời. */
async function answer(rt: Runtime, settings: BotSettings, msg: IncomingMessage, members: readonly Member[], chatId: number, inGroup: boolean, forceData = false): Promise<void> {
  const send = async (text: string) => {
    unwrap(await rt.tg.sendMessage(chatId, text, { replyTo: inGroup ? msg.messageId : undefined }));
    if (inGroup) await saveContextLine(rt.store, rt.bot, rt.key, { at: rt.now().getTime(), speaker: BOT_DISPLAY_NAMES[rt.bot], isBot: true, text });
  };
  const now = rt.now();
  const extraFacts: string[] = [];
  const sourceQ = await rt.store.getState<{ askedAt: number }>(rt.bot, 'source_question');
  const choice = matchSourceKeywords(msg.text);
  const answersQuestion = choice !== null && isSourceQuestionOpen(sourceQ?.askedAt ?? null, now);
  if (matchesIntent(msg.text, 'live') || answersQuestion) {
    const plan = planLiveFetch(choice, settings.sources);
    if (plan.kind === 'ask') { await rt.store.setState(rt.bot, 'source_question', { askedAt: now.getTime() }); return send(BOT_TEXT.askSource); }
    if (plan.kind === 'disabled') return send(BOT_TEXT.sourceDisabled(plan.enabled.join(', ')));
    await rt.store.deleteState(rt.bot, 'source_question');
    const allowed: LiveSource[] = [];
    for (const s of plan.sources) {
      const last = await rt.store.getLatestRate(s);
      if (canFetchLiveNow(last ? Date.parse(last.fetched_at) : null, now)) allowed.push(s);
    }
    const report = await fetchAndStoreRates(rt.store, rt.fetchers, allowed);
    extraFacts.push(`Vừa lấy giá NGAY theo yêu cầu: ${report.saved.join(', ') || 'không lấy thêm được (dùng giá gần nhất)'}${report.failed.length ? `; lỗi: ${report.failed.join(', ')}` : ''}.`);
  }
  const today = getVnDateKey(now);
  const cal = await loadHolidayCalendar(rt.store, today);
  const holiday = rt.bot === 'ray' && matchesIntent(msg.text, 'holiday') ? buildHolidayFacts(cal, today) : null;
  if (holiday) extraFacts.unshift(...holiday.facts);
  const isData = forceData || extraFacts.length > 0 || matchesIntent(msg.text, 'rate') || (rt.bot === 'ray' && parseAmountQuestion(msg.text) !== null);
  const mid = await getLatestMid(rt.store);
  // Hỏi quy đổi ("1000 đô được bao nhiêu") → CODE tính, AI chỉ đọc lại (CODING_STANDARDS 6.10a: app tính số).
  const amount = rt.bot === 'ray' ? parseAmountQuestion(msg.text) : null;
  if (amount && mid) extraFacts.unshift(buildConversionFact(amount, mid.row.rate_vnd, mid.source, new Date(mid.row.fetched_at)));
  const cheer = rt.bot === 'ray' && isData && !holiday ? buildWorkCheer(now, getDaysUntilPayday(now)) : null;
  const asker = members.find((m) => m.telegramUserId === msg.fromId) ?? members.find((m) => m.name === resolveSpeaker(msg.fromId, msg.fromName, members)) ?? null;
  const fallback = holiday ? holiday.plain : isData
    ? (mid ? BOT_TEXT.rateLine(mid.row.rate_vnd, describeRateSource(mid.source, new Date(mid.row.fetched_at)), estimateBlackMarketVnd(mid.row.rate_vnd)) : BOT_TEXT.noRate)
    : BOT_TEXT.aiFallbackChat;
  const r = await speak(rt, settings, {
    purpose: isData ? 'answer_data' : 'answer_chat',
    task: [
      inGroup ? 'Trả lời câu vừa được hỏi trong nhóm, đúng người hỏi, đúng chuyện.' : 'Chủ bot đang nhắn riêng với bạn: trả lời tự nhiên, đúng câu hỏi.',
      // BR-46: hỏi giá vào thứ Tư → thứ Sáu / gần lương → trả lời kèm ý động viên (code tính).
      cheer ? `${CHEER_TEXT.toneRule} Ý động viên nên có: ${cheer}` : null,
    ].filter(Boolean).join('\n'),
    userMessage: { speaker: asker?.name ?? msg.fromName, text: msg.text }, asker, fallback, extraFacts,
    mustContainAny: isData && mid && extraFacts.length > 0 ? rateSpellings(mid.row.rate_vnd) : undefined,
    situation: { isTimesheetDay: getTimesheetDay(today, cal.dates) === today, nextHoliday: findNextHoliday(cal, today) },
  });
  if (r.errorCode) rt.log('warn', 'speak_fallback', { code: r.errorCode });
  return send(r.text);
}
