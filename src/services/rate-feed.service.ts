// F-01 + BR-04 / BR-29 / BR-30: lấy giá theo lịch / theo yêu cầu, lưu kho, dựng "bối cảnh giá" cho prompt.
// AI KHÔNG BAO GIỜ đi tìm giá: mọi con số lấy từ kho này, kèm nguồn + giờ (BR-29).
import { RATE_FETCH_HOURS_VN } from '../config/defaults.ts';
import type { BankQuote } from '../adapters/rate-sources.adapter.ts';
import type { RateRow, Store } from '../repositories/store.repository.ts';
import { getInstantFromVn, getVnParts } from '../shared/vn-time.ts';
import type { Result } from '../shared/result.ts';
import { describeRateSource, type RateSource } from './rate.service.ts';
import type { LiveSource } from './live-rate.service.ts';
import type { RateSnapshotFacts } from './prompt-context.service.ts';

export type RateFetchers = {
  wise: () => Promise<Result<number>>; fallback: () => Promise<Result<number>>;
  vcb: () => Promise<Result<BankQuote>>; vpbank: () => Promise<Result<BankQuote>>;
};
export type FetchReport = { saved: RateSource[]; failed: RateSource[] };

const DAY_MS = 86_400_000;

/** BR-04: mốc lấy giá gần nhất đã qua (01 · 06 · 11 · 16 · 21 giờ VN). */
export function getLatestFetchSlot(now: Date): Date {
  const p = getVnParts(now);
  const hour = [...RATE_FETCH_HOURS_VN].reverse().find((h) => h <= p.hour);
  if (hour !== undefined) return getInstantFromVn(p.year, p.month, p.day, hour);
  const y = getVnParts(new Date(now.getTime() - DAY_MS));
  return getInstantFromVn(y.year, y.month, y.day, RATE_FETCH_HOURS_VN.at(-1) ?? 21);
}

/** Giá ngân hàng để so mốc / hiển thị: giá bán (hoặc mua chuyển khoản nếu thiếu). */
const bankRate = (q: BankQuote) => q.sellVnd ?? q.transferBuyVnd ?? q.cashBuyVnd;

/** Đọc các nguồn được yêu cầu, lưu kho. Wise lỗi → nguồn dự phòng (BR-05). */
export async function fetchAndStoreRates(store: Store, fetchers: RateFetchers, sources: readonly LiveSource[]): Promise<FetchReport> {
  const report: FetchReport = { saved: [], failed: [] };
  for (const source of sources) {
    if (source === 'wise') {
      const w = await fetchers.wise();
      if (w.ok) { await store.insertRate('wise', Math.round(w.data)); report.saved.push('wise'); continue; }
      report.failed.push('wise');
      const f = await fetchers.fallback();
      if (f.ok) { await store.insertRate('wise_fallback', Math.round(f.data)); report.saved.push('wise_fallback'); } else report.failed.push('wise_fallback');
      continue;
    }
    const q = await fetchers[source]();
    const rate = q.ok ? bankRate(q.data) : null;
    if (q.ok && rate) { await store.insertRate(source, Math.round(rate), q.data); report.saved.push(source); } else report.failed.push(source);
  }
  return report;
}

/** Giá mid-market mới nhất (Wise, hoặc dự phòng nếu mới hơn). */
export async function getLatestMid(store: Store): Promise<{ row: RateRow; source: RateSource } | null> {
  const [w, f] = await Promise.all([store.getLatestRate('wise'), store.getLatestRate('wise_fallback')]);
  const pick = !w ? f : !f ? w : Date.parse(f.fetched_at) > Date.parse(w.fetched_at) ? f : w;
  return pick ? { row: pick, source: pick.source as RateSource } : null;
}

const pct = (now: number, then: number | null) => (then ? ((now - then) / then) * 100 : null);

/** Bối cảnh giá cho prompt: giá + nguồn + giờ, thay đổi 24 giờ / 7 ngày, thấp / cao 7 ngày. */
export async function buildRateSnapshot(store: Store, now: Date): Promise<RateSnapshotFacts | null> {
  const latest = await getLatestMid(store);
  if (!latest) return null;
  const week = await store.getRatesSince(latest.source, new Date(now.getTime() - 7 * DAY_MS).toISOString(), 60);
  const at = Date.parse(latest.row.fetched_at);
  const near = (target: number) => week.find((r) => Date.parse(r.fetched_at) <= target)?.rate_vnd ?? null;
  const values = week.map((r) => r.rate_vnd);
  // Audit 25/11: chỉ 1 điểm giá thì CHƯA có xu hướng / cao-thấp (không được nói "đi ngang 0%", "thấp nhất 7 ngày").
  const oldest = week.at(-1);
  const hasWeek = week.length >= 2 && oldest !== undefined && at - Date.parse(oldest.fetched_at) >= DAY_MS;
  return {
    wiseVnd: latest.row.rate_vnd, fetchedAt: at, sourceLabel: describeRateSource(latest.source, new Date(at)),
    change24hPct: pct(latest.row.rate_vnd, near(at - DAY_MS)), change7dPct: hasWeek ? pct(latest.row.rate_vnd, oldest?.rate_vnd ?? null) : null,
    low7dVnd: hasWeek ? Math.min(...values) : null, high7dVnd: hasWeek ? Math.max(...values) : null,
  };
}

/** Dòng bối cảnh giá ngân hàng (VCB / VPBank) — chỉ khi có giá trong 24 giờ. */
export async function buildBankFacts(store: Store, now: Date): Promise<string[]> {
  const out: string[] = [];
  for (const source of ['vcb', 'vpbank'] as const) {
    const r = await store.getLatestRate(source);
    if (!r || now.getTime() - Date.parse(r.fetched_at) > DAY_MS) continue;
    const q = r.extra as BankQuote | null;
    const parts = [q?.transferBuyVnd ? `mua chuyển khoản ${q.transferBuyVnd.toLocaleString('vi-VN')}` : null, q?.sellVnd ? `bán ${q.sellVnd.toLocaleString('vi-VN')}` : null].filter(Boolean);
    out.push(`Giá ${source === 'vcb' ? 'Vietcombank' : 'VPBank'}: ${parts.join(', ') || r.rate_vnd.toLocaleString('vi-VN')} đ / 1 SGD (${describeRateSource(source, new Date(Date.parse(r.fetched_at)))}).`);
  }
  return out;
}
