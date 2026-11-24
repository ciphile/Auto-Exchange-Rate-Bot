// Tính toán tỉ giá thuần (BR-12, action quy_doi). Tỉ giá là "VND / 1 SGD" (số thực, không phải tiền);
// SỐ TIỀN luôn là số nguyên đơn vị nhỏ nhất (CODING_STANDARDS 6.3).
import { BLACK_MARKET_PREMIUM, BLACK_MARKET_ROUND_VND } from '../config/defaults.ts';

/** BR-12: chợ đen ước tính = Wise × (1 + 0,4%), làm tròn tới 10 đ. */
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
