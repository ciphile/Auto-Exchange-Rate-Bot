// Câu soạn sẵn (khi AI lỗi / lời AI không đạt) cho các câu nói về tỉ giá hiện tại. CODE dựng nên số + nguồn + GIỜ + NGÀY luôn có (BR-29, BR-54).
import { BOT_TEXT } from '../shared/bot-text.vi.ts';
import type { Store } from '../repositories/store.repository.ts';
import type { LiveSource } from './live-rate.service.ts';
import { buildBankFacts, getLatestMid } from './rate-feed.service.ts';
import { describeRateSource, resolveBlackMarket, type RateSource } from './rate.service.ts';
import { blackMarketConfigOf, type BotSettings } from './settings.service.ts';

type Mid = { row: { rate_vnd: number; fetched_at: string }; source: RateSource };

/** Dòng "Giá chợ đen … bữa nay" kèm nguồn + giờ + ngày (tự tính: giờ lấy giá Wise · thủ công: giờ Khang nhập). */
export function exchangeBlackLine(mid: Mid, settings: BotSettings): string {
  const bm = resolveBlackMarket(mid.row.rate_vnd, blackMarketConfigOf(settings));
  return `${bm.todayLine} (${bm.manual ? bm.label : describeRateSource(mid.source, new Date(mid.row.fetched_at))})`;
}

/**
 * Câu soạn sẵn cho "lấy giá ngay": đúng NGUỒN người dùng đã chọn (Wise kèm chợ đen ước tính; ngân hàng / DBS kèm giá mua - bán),
 * mỗi dòng có giờ + ngày lấy giá. null = chưa có giá nào của các nguồn đó.
 */
export async function buildLiveFallback(store: Store, settings: BotSettings, now: Date, sources: readonly LiveSource[]): Promise<string | null> {
  const lines: string[] = [];
  if (sources.includes('wise')) {
    const mid = await getLatestMid(store);
    if (mid) lines.push(BOT_TEXT.rateLine(mid.row.rate_vnd, describeRateSource(mid.source, new Date(mid.row.fetched_at)), resolveBlackMarket(mid.row.rate_vnd, blackMarketConfigOf(settings)).phrase));
  }
  lines.push(...(await buildBankFacts(store, now, sources.filter((s) => s !== 'wise'))));
  return lines.length > 0 ? lines.join('\n') : null;
}
