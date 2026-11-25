// Tính toán tỉ giá thuần (BR-12, action quy_doi). Tỉ giá là "VND / 1 SGD" (số thực, không phải tiền);
// SỐ TIỀN luôn là số nguyên đơn vị nhỏ nhất (CODING_STANDARDS 6.3).
import { BLACK_MARKET_PREMIUM, BLACK_MARKET_ROUND_VND } from '../config/defaults.ts';
import { getVnParts } from '../shared/vn-time.ts';

/** BR-12: chợ đen ước tính = Wise × (1 + BLACK_MARKET_PREMIUM — hiện 0,48%), làm tròn tới 10 đ. */
export function estimateBlackMarketVnd(wiseMidVnd: number): number {
  return Math.round((wiseMidVnd * (1 + BLACK_MARKET_PREMIUM)) / BLACK_MARKET_ROUND_VND) * BLACK_MARKET_ROUND_VND;
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
