// BR-55 (Khang 25/11/2026): bot hỏi "nguồn nào?" mà sau 2 phút không ai trả lời → bot TỰ TRẢ LỜI, và lời đó LUÔN có câu
// "do bạn không nói nguồn nên …" (code dựng, không qua AI → chắc chắn 100%). Chạy ở MỖI lần nhịp lịch được gọi (mỗi phút):
// việc nhẹ — không có câu hỏi nào đang chờ thì chỉ đọc 2 dòng trạng thái rồi thoát.
import { NO_SOURCE_DEFAULT_AFTER_MS, NO_SOURCE_GIVE_UP_MS } from '../config/defaults.ts';
import { BOT_TEXT } from '../shared/bot-text.vi.ts';
import { BOT_DISPLAY_NAMES } from '../shared/persona.vi.ts';
import { unwrap } from '../shared/result.ts';
import { CONVERT_PENDING_KEY, noSourceLead, type PendingConvert } from './convert.service.ts';
import { runConvertDefaults } from './convert-flow.service.ts';
import { canFetchLiveNow, planLiveFetch, type LiveSource } from './live-rate.service.ts';
import { fetchAndStoreRates, getLatestMid } from './rate-feed.service.ts';
import { describeRateSource, resolveBlackMarket } from './rate.service.ts';
import type { Runtime } from './runtime.types.ts';
import { blackMarketConfigOf, mergeStoredSettings, type BotSettings } from './settings.service.ts';
import { saveContextLine } from './speech.service.ts';

export const SOURCE_QUESTION_KEY = 'source_question';
/** Câu hỏi "lấy giá nguồn nào?" đang chờ: ai hỏi, hỏi lúc nào, trả lời ở đâu (replyTo = null → chat riêng). */
export type SourceQuestion = { askedAt: number; chatId: number; replyTo: number | null; fromId: number };

const SOURCE_NAMES: Record<LiveSource, string> = { wise: 'Wise', vcb: 'VCB', vpbank: 'VPBank', dbs: 'DBS' };

/** Trả lời mặc định cho câu hỏi "lấy giá nguồn nào?": lấy Wise (nguồn chuẩn) kèm chợ đen ước tính; có giờ + ngày lấy giá. */
async function answerSourceQuestionByDefault(rt: Runtime, settings: BotSettings, q: SourceQuestion): Promise<void> {
  const t = rt.now().getTime();
  await rt.store.deleteState(rt.bot, SOURCE_QUESTION_KEY);
  if (t - q.askedAt > NO_SOURCE_GIVE_UP_MS) return; // nhịp lịch trễ quá lâu → không trả lời muộn lạc đề
  if (!(await rt.store.claimOnce(`fu:${rt.bot}:src:${q.askedAt}`))) return; // 2 nhịp gọi chồng nhau → chỉ 1 lần trả lời

  const plan = planLiveFetch({ kind: 'any' }, settings.sources);
  const source: LiveSource = plan.kind === 'fetch' ? plan.sources[0] ?? 'wise' : 'wise';
  const last = await rt.store.getLatestRate(source);
  // Mỗi nguồn tối đa 1 lần đọc / 5 phút (BR-30): vừa đọc rồi thì dùng giá đó — vẫn ghi giờ lấy giá.
  if (canFetchLiveNow(last ? Date.parse(last.fetched_at) : null, rt.now())) await fetchAndStoreRates(rt.store, rt.fetchers, [source]);

  let line: string | null = null;
  if (source === 'wise') {
    const mid = await getLatestMid(rt.store);
    if (mid) {
      const bm = resolveBlackMarket(mid.row.rate_vnd, blackMarketConfigOf(settings));
      line = BOT_TEXT.rateLine(mid.row.rate_vnd, describeRateSource(mid.source, new Date(mid.row.fetched_at)), bm.phrase);
    }
  } else {
    const row = await rt.store.getLatestRate(source);
    if (row) line = BOT_TEXT.rateLine(row.rate_vnd, describeRateSource(source, new Date(row.fetched_at)));
  }
  const lead = noSourceLead(settings, `tự lấy ${SOURCE_NAMES[source]}`);
  const text = line ? `${lead} ${line}` : `${lead} Mà em chưa lấy được giá nào, lát hỏi lại em nha.`;
  unwrap(await rt.tg.sendMessage(q.chatId, text, q.replyTo !== null ? { replyTo: q.replyTo } : {}));
  if (q.replyTo !== null) await saveContextLine(rt.store, rt.bot, rt.key, { at: rt.now().getTime(), speaker: BOT_DISPLAY_NAMES[rt.bot], isBot: true, text });
}

/**
 * Gọi ở đầu MỖI nhịp lịch (mỗi phút): có câu hỏi nguồn nào chờ ≥ 2 phút thì tự trả lời.
 * Chỉ đọc 2 dòng trạng thái; chỉ đọc cài đặt khi thật sự có việc.
 */
export async function runFollowups(rt: Runtime): Promise<void> {
  const [sq, cv] = await Promise.all([
    rt.store.getState<SourceQuestion>(rt.bot, SOURCE_QUESTION_KEY),
    rt.store.getState<PendingConvert[]>(rt.bot, CONVERT_PENDING_KEY),
  ]);
  const t = rt.now().getTime();
  const sourceDue = sq !== null && t - sq.askedAt >= NO_SOURCE_DEFAULT_AFTER_MS;
  const convertDue = (cv ?? []).some((p) => t - p.askedAt >= NO_SOURCE_DEFAULT_AFTER_MS);
  if (!sourceDue && !convertDue) return;
  const settings = mergeStoredSettings(rt.bot, (await rt.store.loadConfig(rt.bot)).settings);
  if (sourceDue && sq) await answerSourceQuestionByDefault(rt, settings, sq);
  if (convertDue) await runConvertDefaults(rt, settings);
}
