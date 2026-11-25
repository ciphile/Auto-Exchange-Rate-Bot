// Nhịp lịch mỗi 10 phút (Supabase Cron → /api/tick, ADR-04). Mỗi bước độc lập: bước lỗi → báo Khang, bước sau vẫn chạy.
// BR-04 lấy giá · BR-05 dự phòng · BR-35 báo giá theo kế hoạch tháng · BR-08 / BR-35 cảnh báo · BR-42 / BR-43 nhắc lễ, timesheet
// · BR-18 chen chuyện · dọn dẹp 01:00 (D4, 6.11) · tự đăng ký webhook. Chống chạy chồng: 1 khóa / nhịp 10 phút.
import { FREQUENCY_PROFILES } from '../config/frequency.ts';
import { BOT_TEXT } from '../shared/bot-text.vi.ts';
import { BOT_DISPLAY_NAMES } from '../shared/persona.vi.ts';
import { AppFailure, unwrap } from '../shared/result.ts';
import { getVnDateKey, getVnParts, isInQuietHours } from '../shared/vn-time.ts';
import { EMPTY_ALERT_STATE, evaluateAlert, type AlertState } from './alert.service.ts';
import { findNextHoliday, loadHolidayCalendar, type HolidayCalendar } from './calendar.service.ts';
import { decideChimeIn } from './chattiness.service.ts';
import { planMonthPosts } from './frequency.service.ts';
import { notifyOwnerError } from './notify.service.ts';
import { getDaysUntilPayday, isAlertWindowOpen, pickRandomTalkMinute } from './payday.service.ts';
import { fetchAndStoreRates, getLatestFetchSlot, getLatestMid } from './rate-feed.service.ts';
import { describeRateSource } from './rate.service.ts';
import { pickReminderMinute, planHolidayReminders, planTimesheetReminder, getTimesheetDay } from './reminder.service.ts';
import type { Runtime } from './runtime.types.ts';
import { blackMarketConfigOf, mergeStoredSettings, type BotSettings } from './settings.service.ts';
import { rateSpellings, readContextLines, saveContextLine, speak, type SpeakRequest } from './speech.service.ts';
import { CHEER_TEXT } from '../shared/cheer.vi.ts';
import { buildWorkCheer, formatHolidayLineVi } from './cheer.service.ts';
import { resolveBlackMarket } from './rate.service.ts';
import { getChimeFactor } from './style.service.ts';
import { buildCommandMenus } from './help.service.ts';
import { runConvertDefaults } from './convert-flow.service.ts';

const TOPIC_RE = /(giá|tỉ giá|tỷ giá|sgd|đô|vàng|coin|bitcoin|lương|thuế|kinh tế|lãi suất)/iu;
const SENT_KEYS_MAX = 60;
type Step = { name: string; run: () => Promise<void> };
type Ctx = { rt: Runtime; settings: BotSettings; groupChatId: number | null; now: Date; today: string; minuteOfDay: number; cal: HolidayCalendar };

export async function runTick(rt: Runtime, webhookUrl: string | null): Promise<{ ran: boolean; failed: string[] }> {
  const now = rt.now();
  const slot = `tick:${rt.bot}:${Math.floor(now.getTime() / 600_000)}`;
  if (!(await rt.store.claimOnce(slot))) return { ran: false, failed: [] };
  await rt.store.setState(rt.bot, 'last_tick', now.getTime());
  const config = await rt.store.loadConfig(rt.bot);
  const p = getVnParts(now);
  const today = getVnDateKey(now);
  const ctx: Ctx = { rt, settings: mergeStoredSettings(rt.bot, config.settings), groupChatId: config.groupChatId, now, today,
    minuteOfDay: p.hour * 60 + p.minute, cal: await loadHolidayCalendar(rt.store, today) };
  const steps: Step[] = [
    { name: 'webhook', run: () => ensureWebhook(rt, webhookUrl, today) },
    { name: 'menu', run: () => ensureCommandMenu(rt) },
    { name: 'rates', run: () => fetchScheduledRates(ctx) },
    { name: 'alert', run: () => runAlert(ctx) },
    { name: 'report', run: () => runScheduledReport(ctx) },
    { name: 'reminders', run: () => runReminders(ctx) },
    { name: 'chime', run: () => runChimeIn(ctx) },
    { name: 'convert', run: () => runConvertDefaults(rt, ctx.settings) },
    { name: 'cleanup', run: () => (p.hour === 1 && p.minute < 10 ? rt.store.cleanup(now) : Promise.resolve()) },
  ];
  const failed: string[] = [];
  for (const step of steps) {
    try { await step.run(); } catch (e) {
      failed.push(step.name);
      const code = e instanceof AppFailure ? e.code : step.name === 'cleanup' ? 'E-SYS-001' : 'E-DB-001';
      await notifyOwnerError(rt, code, `${step.name}: ${e instanceof AppFailure ? e.detail : (e as Error).message}`).catch(() => undefined);
    }
  }
  return { ran: true, failed };
}

/** Tự đăng ký webhook (1 lần / ngày) → Khang không phải dán token vào trình duyệt. */
async function ensureWebhook(rt: Runtime, url: string | null, today: string): Promise<void> {
  if (!url || (await rt.store.getState<string>(rt.bot, 'webhook_checked')) === today) return;
  const info = unwrap(await rt.tg.getWebhookInfo());
  if (info.url !== url) unwrap(await rt.tg.setWebhook(url, rt.bot === 'ray' ? rt.env.RAY_WEBHOOK_SECRET : rt.env.LUI_WEBHOOK_SECRET ?? ''));
  await rt.store.setState(rt.bot, 'webhook_checked', today);
}

/** Menu lệnh Telegram: chỉ gọi Telegram khi danh sách lệnh đổi (so chữ ký đã lưu) — deploy lệnh mới thì tự cập nhật. */
async function ensureCommandMenu(rt: Runtime): Promise<void> {
  const menus = buildCommandMenus(rt.bot);
  const signature = JSON.stringify({ menus, owner: rt.ownerId });
  if ((await rt.store.getState<string>(rt.bot, 'menu_signature')) === signature) return;
  unwrap(await rt.tg.setMyCommands(menus.owner, { type: 'chat', chat_id: rt.ownerId }));
  unwrap(await rt.tg.setMyCommands(menus.group, { type: 'all_group_chats' }));
  await rt.store.setState(rt.bot, 'menu_signature', signature);
}

/** BR-04: tới mốc giờ lấy giá mà chưa có giá của mốc đó → lấy mọi nguồn đang bật. */
async function fetchScheduledRates({ rt, settings, now }: Ctx): Promise<void> {
  const slotAt = getLatestFetchSlot(now).getTime();
  const mid = await getLatestMid(rt.store);
  if (mid && Date.parse(mid.row.fetched_at) >= slotAt) return;
  const report = await fetchAndStoreRates(rt.store, rt.fetchers, settings.sources.includes('wise') ? settings.sources : ['wise', ...settings.sources]);
  rt.log('info', 'rates_fetched', report);
  if (!report.saved.includes('wise') && !report.saved.includes('wise_fallback')) await notifyOwnerError(rt, 'E-SRC-002', report.failed.join(','));
  else if (report.saved.includes('wise_fallback')) await notifyOwnerError(rt, 'E-SRC-001');
}

/** Gửi 1 lời AI soạn vào nhóm (không gửi giờ nghỉ) + lưu vào kho ngữ cảnh. */
async function postToGroup(ctx: Ctx, req: SpeakRequest): Promise<boolean> {
  const { rt, settings, groupChatId, now } = ctx;
  if (groupChatId === null || isInQuietHours(now, settings.quietHours)) return false;
  const r = await speak(rt, settings, { ...req, situation: { isTimesheetDay: getTimesheetDay(ctx.today, ctx.cal.dates) === ctx.today, nextHoliday: findNextHoliday(ctx.cal, ctx.today), ...req.situation } });
  if (!r.text.trim()) return false; // chen chuyện không có câu soạn sẵn: AI lỗi thì im lặng
  unwrap(await rt.tg.sendMessage(groupChatId, r.text));
  await saveContextLine(rt.store, rt.bot, rt.key, { at: now.getTime(), speaker: BOT_DISPLAY_NAMES[rt.bot], isBot: true, text: r.text });
  return true;
}

/** BR-06 → BR-09 + BR-35: cảnh báo vượt mốc (2 chiều) theo giá mid-market mới nhất. */
async function runAlert(ctx: Ctx): Promise<void> {
  const { rt, settings, now } = ctx;
  const mid = await getLatestMid(rt.store);
  if (!mid) return;
  const state = (await rt.store.getState<AlertState>(rt.bot, 'alert')) ?? EMPTY_ALERT_STATE;
  const r = evaluateAlert(state, mid.row.rate_vnd, now, settings.alertLevelsVnd, isAlertWindowOpen(now, settings.alertFullMonth),
    FREQUENCY_PROFILES[settings.frequencyLevel].alerts, settings.quietHours);
  if (r.action === 'send' && r.event) {
    const src = describeRateSource(mid.source, new Date(mid.row.fetched_at));
    const up = r.event.direction === 'up';
    const cheer = buildWorkCheer(now, getDaysUntilPayday(now));
    const sent = await postToGroup(ctx, {
      purpose: 'rate_alert', mustContainAny: rateSpellings(mid.row.rate_vnd),
      task: `Báo nhanh cho nhóm: tỉ giá vừa ${up ? 'TĂNG qua' : 'GIẢM xuống dưới'} mốc ${r.event.levelVnd.toLocaleString('vi-VN')} đ; giá hiện tại ${mid.row.rate_vnd.toLocaleString('vi-VN')} đ (${src}). Nhắc đúng con số này.${cheer ? `\n${CHEER_TEXT.toneRule} Ý động viên: ${cheer}` : ''}`,
      fallback: BOT_TEXT.rateAlert(mid.row.rate_vnd, r.event.levelVnd, up, src),
    });
    if (!sent) return; // chưa gửi được (giờ nghỉ / chưa gắn nhóm) → giữ trạng thái cũ, lần sau xét lại
  }
  await rt.store.setState(rt.bot, 'alert', r.state);
}

type MonthPlan = { level: number; days: number[]; minutes: Record<string, number> };

/** BR-10 / BR-11 / BR-35: báo giá theo kế hoạch tháng (ngày + phút ngẫu nhiên); đổi mức giữa tháng → lập lại từ hôm nay. */
async function runScheduledReport(ctx: Ctx): Promise<void> {
  const { rt, settings, now, today, minuteOfDay } = ctx;
  const p = getVnParts(now);
  const planKey = `plan:${today.slice(0, 7)}`;
  let plan = await rt.store.getState<MonthPlan>(rt.bot, planKey);
  if (!plan || plan.level !== settings.frequencyLevel) {
    const days = planMonthPosts(p.year, p.month, settings.frequencyLevel, rt.random, p.day);
    plan = { level: settings.frequencyLevel, days, minutes: Object.fromEntries(days.map((d) => [String(d), pickRandomTalkMinute(rt.random)])) };
    await rt.store.setState(rt.bot, planKey, plan);
  }
  const minute = plan.minutes[String(p.day)];
  const doneKey = `posted:${today}`;
  if (minute === undefined || minuteOfDay < minute || (await rt.store.getState<boolean>(rt.bot, doneKey))) return;
  const mid = await getLatestMid(rt.store);
  if (!mid) return;
  const src = describeRateSource(mid.source, new Date(mid.row.fetched_at));
  const days = getDaysUntilPayday(now);
  // BR-46: thứ Tư → thứ Sáu / gần lương → giọng động viên; BR-47: Wise trước, kèm chợ đen ước tính.
  const cheer = buildWorkCheer(now, days);
  const black = resolveBlackMarket(mid.row.rate_vnd, blackMarketConfigOf(settings));
  const sent = await postToGroup(ctx, {
    purpose: 'rate_report', mustContainAny: rateSpellings(mid.row.rate_vnd),
    task: [
      `Tự báo tỉ giá cho nhóm như một thành viên: 1 SGD = ${mid.row.rate_vnd.toLocaleString('vi-VN')} đ (${src}); ${black.phrase}${black.manual ? ' (giá thật Khang vừa nhập)' : ''}; còn ${days} ngày tới ngày lương.`,
      'Nhắc đúng con số Wise + nguồn + giờ TRƯỚC, có thể kèm chợ đen và bình luận xu hướng theo bối cảnh.',
      cheer ? `${CHEER_TEXT.toneRule} Ý động viên phải có: ${cheer} ${CHEER_TEXT.reportExample}` : null,
    ].filter(Boolean).join('\n'),
    fallback: BOT_TEXT.rateReport(mid.row.rate_vnd, src, cheer, black.phrase),
  });
  if (sent) await rt.store.setState(rt.bot, doneKey, true);
}

/** BR-42 nhắc lễ (đúng ngày / tuần trước / tháng trước) + BR-43 nhắc timesheet thứ Sáu (quyết 1 lần / ngày). */
async function runReminders(ctx: Ctx): Promise<void> {
  const { rt, settings, today, minuteOfDay, cal } = ctx;
  const sent = (await rt.store.getState<string[]>(rt.bot, 'reminders_sent')) ?? [];
  for (const rem of planHolidayReminders(today, cal.dates, new Set(sent))) {
    const minKey = `rem_min:${rem.key}`;
    let minute = await rt.store.getState<number>(rt.bot, minKey);
    if (minute === null) { minute = pickReminderMinute(rem.minuteRange, rt.random); await rt.store.setState(rt.bot, minKey, minute); }
    if (minuteOfDay < minute) continue;
    const lines = rem.holidays.map((h) => `- ${formatHolidayLineVi(h)}`).join('\n');
    const when = rem.kind === 'day_of' ? 'HÔM NAY là ngày nghỉ lễ ở Singapore' : rem.kind === 'week_ahead' ? 'TUẦN SAU có ngày nghỉ lễ ở Singapore' : 'THÁNG SAU có ngày nghỉ lễ ở Singapore';
    // BR-46: nhắc lễ giọng động viên ("cố lên mọi người ơi, tuần sau được nghỉ lễ thứ Sáu (lễ Hồi giáo) rồi").
    const task = [`Nhắc nhóm: ${when}:`, lines, 'Nói đúng thứ, đúng ngày, đúng tên lễ (kèm phần giải thích trong ngoặc).', CHEER_TEXT.toneRule, CHEER_TEXT.holidayExample].join('\n');
    const ok = await postToGroup(ctx, { purpose: 'reminder', task, fallback: BOT_TEXT.holidayReminder(CHEER_TEXT.holidayLead[rem.kind], lines) });
    if (ok) await rt.store.setState(rt.bot, 'reminders_sent', [...sent, rem.key].slice(-SENT_KEYS_MAX));
  }
  const tsKey = `timesheet:${today}`;
  let ts = await rt.store.getState<{ minute: number | null; done: boolean }>(rt.bot, tsKey);
  if (!ts) { ts = { minute: planTimesheetReminder(today, cal.dates, settings.timesheetReminderOn, rt.random), done: false }; await rt.store.setState(rt.bot, tsKey, ts); }
  if (ts.minute === null || ts.done || minuteOfDay < ts.minute) return;
  const ok = await postToGroup(ctx, { purpose: 'reminder', task: 'Hôm nay là ngày điền timesheet: nhắc nhẹ mọi người điền timesheet, tự nhiên, ngắn, hợp hoàn cảnh từng người nếu biết.', fallback: BOT_TEXT.timesheetReminder });
  if (ok) await rt.store.setState(rt.bot, tsKey, { ...ts, done: true });
}

type ChimeState = { lastCheckAt: number; day: string; count: number; lastChimeAt: number | null };

/** BR-18: lắng nghe đang bật → sau mỗi "đợt trò chuyện" xét có chen vào không (luật thuần code, không gọi AI để quyết). */
async function runChimeIn(ctx: Ctx): Promise<void> {
  const { rt, settings, now, today } = ctx;
  if (!settings.listenOn || ctx.groupChatId === null) return;
  const prev = (await rt.store.getState<ChimeState>(rt.bot, 'chime')) ?? { lastCheckAt: now.getTime(), day: today, count: 0, lastChimeAt: null };
  const st: ChimeState = prev.day === today ? prev : { ...prev, day: today, count: 0 };
  const fresh = (await readContextLines(rt.store, rt.bot, rt.key)).filter((l) => !l.isBot && l.at > st.lastCheckAt);
  const last = fresh.at(-1);
  if (!last) return rt.store.setState(rt.bot, 'chime', st);
  const d = decideChimeIn({
    level: settings.chattinessLevel, newMessageCount: fresh.length, lastMessageAt: last.at, chimeInsToday: st.count, lastChimeInAt: st.lastChimeAt,
    hasTopicKeyword: fresh.some((l) => TOPIC_RE.test(l.text)), personaFactor: getChimeFactor({ bot: rt.bot, personaOn: settings.personaOn, mood: settings.mood }), now,
  }, rt.random, settings.quietHours);
  if (d.reason === 'chưa xong đợt') return; // đợi đợt xong, giữ mốc cũ để đếm đủ tin
  const next: ChimeState = { ...st, lastCheckAt: last.at };
  if (d.speak && await postToGroup(ctx, { purpose: 'chime_in', task: 'Nhóm vừa trò chuyện (xem đoạn chat). Tự chen vào 1 câu như bạn trong nhóm, đúng chuyện đang nói, có quan điểm riêng.', fallback: '' })) {
    next.count += 1; next.lastChimeAt = now.getTime();
  }
  await rt.store.setState(rt.bot, 'chime', next);
}
