// Tính toán tỉ giá thuần (BR-12, action quy_doi). Tỉ giá là "VND / 1 SGD" (số thực, không phải tiền);
// SỐ TIỀN luôn là số nguyên đơn vị nhỏ nhất (CODING_STANDARDS 6.3).
import { BLACK_MARKET_PREMIUM, BLACK_MARKET_ROUND_VND, DEFAULT_BLACK_MARKET_PREMIUM_PCT } from '../config/defaults.ts';
import { getVnParts } from '../shared/vn-time.ts';

/**
 * BR-12: chợ đen ước tính = Wise × (1 + mức chênh), làm tròn tới BLACK_MARKET_ROUND_VND (50 đ).
 * `premium` là SỐ THẬP PHÂN (0,0048 = +0,48%); không truyền → mặc định; Khang chỉnh bằng /chotden (BR-53).
 */
export function estimateBlackMarketVnd(wiseMidVnd: number, premium: number = BLACK_MARKET_PREMIUM): number {
  return Math.round((wiseMidVnd * (1 + premium)) / BLACK_MARKET_ROUND_VND) * BLACK_MARKET_ROUND_VND;
}

/** BR-53: cấu hình giá chợ đen — công tắc TỰ TÍNH (công thức từ Wise) / THỦ CÔNG (Khang nhập giá thật). */
export type BlackMarketManual = { on: boolean; vnd: number | null; at: number | null };
export type BlackMarketConfig = { manual: BlackMarketManual; premiumPct: number };
export const DEFAULT_BLACK_MARKET_CONFIG: BlackMarketConfig = { manual: { on: false, vnd: null, at: null }, premiumPct: DEFAULT_BLACK_MARKET_PREMIUM_PCT };

export type BlackMarketQuote = {
  vnd: number;
  manual: boolean;
  /** Nguồn + (thủ công) thời điểm nhập — BR-29: mọi con số giá đều có nguồn. */
  label: string;
  /** "chợ đen ước tính khoảng 20.050 đ" · "chợ đen khoảng 20.100 đ" (thủ công = giá thật Khang nhập, không "ước tính"). */
  phrase: string;
  /** "Giá chợ đen ước tính bữa nay: 20.050 đ / 1 SGD" · "Giá chợ đen bữa nay: …". */
  todayLine: string;
};

const pad2 = (n: number) => String(n).padStart(2, '0');
const vndText = (n: number) => n.toLocaleString('vi-VN');

/**
 * BR-53: giá chợ đen dùng khắp bot. THỦ CÔNG bật + có giá → đúng số Khang nhập (không làm tròn lại);
 * ngược lại TỰ TÍNH = Wise × (1 + mức chênh), tròn 50 đ (BR-12).
 */
export function resolveBlackMarket(wiseMidVnd: number, cfg: BlackMarketConfig = DEFAULT_BLACK_MARKET_CONFIG): BlackMarketQuote {
  const m = cfg.manual;
  if (m.on && m.vnd !== null) {
    const p = m.at !== null ? getVnParts(new Date(m.at)) : null;
    const when = p ? ` lúc ${pad2(p.hour)}:${pad2(p.minute)} ngày ${pad2(p.day)}/${pad2(p.month)}/${p.year}` : '';
    return { vnd: m.vnd, manual: true, label: `giá thật Khang nhập tay${when}`, phrase: `chợ đen khoảng ${vndText(m.vnd)} đ`, todayLine: `Giá chợ đen bữa nay: ${vndText(m.vnd)} đ / 1 SGD` };
  }
  const vnd = estimateBlackMarketVnd(wiseMidVnd, cfg.premiumPct / 100);
  return { vnd, manual: false, label: `Wise ${formatPremiumPct(cfg.premiumPct / 100)}`, phrase: `chợ đen ước tính khoảng ${vndText(vnd)} đ`, todayLine: `Giá chợ đen ước tính bữa nay: ${vndText(vnd)} đ / 1 SGD` };
}

/** Mức chênh dạng chữ ("+0,48%", "−0,2%") cho prompt / tin — nhận số thập phân. */
export function formatPremiumPct(premium: number): string {
  const pct = Math.round(premium * 10_000) / 100;
  return `${pct < 0 ? '−' : '+'}${Math.abs(pct).toLocaleString('vi-VN', { maximumFractionDigits: 2 })}%`;
}

/** Quy đổi SGD → VND (tiền đồng, số nguyên). amountSgdCents: số SGD tính bằng cent (số nguyên). */
export function convertSgdToVnd(amountSgdCents: number, rateVnd: number): number {
  return Math.round((amountSgdCents / 100) * rateVnd);
}

/** Quy đổi VND → SGD, trả về cent (số nguyên). */
export function convertVndToSgdCents(amountVnd: number, rateVnd: number): number {
  return Math.round((amountVnd / rateVnd) * 100);
}

export type RateSource = 'wise' | 'wise_fallback' | 'vcb' | 'vpbank' | 'dbs';
const SOURCE_LABELS: Record<RateSource, string> = {
  wise: 'Wise', wise_fallback: 'nguồn dự phòng (cập nhật 1 lần / ngày)', vcb: 'Vietcombank', vpbank: 'VPBank', dbs: 'DBS',
};

/** BR-29: mọi câu về giá phải kèm nguồn + thời điểm lấy (giờ VN). Code tạo chuỗi này, AI chỉ chép lại. */
export function describeRateSource(source: RateSource, fetchedAt: Date): string {
  const p = getVnParts(fetchedAt);
  const hhmm = `${String(p.hour).padStart(2, '0')}:${String(p.minute).padStart(2, '0')}`;
  return `theo ${SOURCE_LABELS[source]}, lấy lúc ${hhmm} ngày ${String(p.day).padStart(2, '0')}/${String(p.month).padStart(2, '0')}/${p.year}`;
}
