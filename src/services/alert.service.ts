// F-03: cảnh báo cắt mốc. Hàm thuần: nhận trạng thái + giá + thời điểm, trả trạng thái mới + hành động.
import {
  ALERT_HYSTERESIS_VND, DEFAULT_QUIET_HOURS, KEY_ALERT_LEVELS_VND, MAX_ALERTS_PER_DAY, MIN_ALERT_GAP_MS,
} from '../config/defaults.ts';
import { getVnDateKey, isInQuietHours } from '../shared/vn-time.ts';

export type AlertDirection = 'up' | 'down';
export type AlertEvent = { levelVnd: number; direction: AlertDirection; rateVnd: number; detectedAt: number };
/** Cảnh báo đang chờ + vị trí (band) TRƯỚC khi cắt mốc — để biết giá đã quay về chỗ cũ hay chưa. */
export type PendingAlert = AlertEvent & { originBand: number };
export type AlertState = {
  band: number | null; // số mốc đang nằm dưới giá (đã tính đệm) — null = chưa có lần đo nào
  pending: PendingAlert | null; // cảnh báo đang chờ được phép gửi
  sentDateKey: string | null; // ngày (giờ VN) của bộ đếm
  sentCount: number;
  lastSentAt: number | null;
};
export type AlertAction = 'none' | 'send' | 'defer' | 'drop';

export const EMPTY_ALERT_STATE: AlertState = { band: null, pending: null, sentDateKey: null, sentCount: 0, lastSentAt: null };

/** BR-07: band mới với đệm ±h; lần đầu (prev = null) thì đặt band, không báo. */
export function updateBand(prev: number | null, rateVnd: number, levels: readonly number[], h = ALERT_HYSTERESIS_VND): number {
  if (prev === null) return levels.filter((lv) => rateVnd >= lv).length;
  let band = prev;
  while (band < levels.length && rateVnd >= (levels[band] ?? Infinity) + h) band++;
  while (band > 0 && rateVnd <= (levels[band - 1] ?? -Infinity) - h) band--;
  return band;
}

/** Mốc vừa cắt khi đi từ band cũ sang band mới; F-03: chọn mốc xa nhất theo chiều đi, ưu tiên mốc chính. */
export function pickCrossedLevel(prev: number, next: number, levels: readonly number[]): { levelVnd: number; direction: AlertDirection } | null {
  if (next === prev) return null;
  const direction: AlertDirection = next > prev ? 'up' : 'down';
  const crossed = direction === 'up' ? levels.slice(prev, next) : levels.slice(next, prev).reverse();
  const key = crossed.filter((lv) => KEY_ALERT_LEVELS_VND.includes(lv));
  const chosen = (key.length > 0 ? key : crossed).at(-1);
  return chosen === undefined ? null : { levelVnd: chosen, direction };
}

/** BR-08 + BR-09: có được gửi cảnh báo ngay lúc này không. */
export function canSendAlert(state: AlertState, now: Date, quiet = DEFAULT_QUIET_HOURS): boolean {
  if (isInQuietHours(now, quiet)) return false;
  const countToday = state.sentDateKey === getVnDateKey(now) ? state.sentCount : 0;
  if (countToday >= MAX_ALERTS_PER_DAY) return false;
  return state.lastSentAt === null || now.getTime() - state.lastSentAt >= MIN_ALERT_GAP_MS;
}

/**
 * Đánh giá 1 lần (sau mỗi bản chụp giá mới HOẶC mỗi nhịp lịch, với giá gần nhất).
 * windowOpen = đang trong khung cảnh báo (BR-03). Ngoài khung: vẫn cập nhật band (để không báo dồn khi
 * khung mở), nhưng không báo và bỏ cảnh báo đang chờ.
 */
export function evaluateAlert(
  state: AlertState, rateVnd: number, now: Date, levels: readonly number[], windowOpen: boolean,
  quiet = DEFAULT_QUIET_HOURS,
): { state: AlertState; action: AlertAction; event: AlertEvent | null } {
  const nextBand = updateBand(state.band, rateVnd, levels);
  let pending = state.pending;
  if (state.band !== null && nextBand !== state.band) {
    // Giá quay về đúng vị trí trước khi cắt mốc của cảnh báo đang chờ → 2 lần cắt triệt tiêu, không còn gì để báo (F-03).
    if (pending && nextBand === pending.originBand) {
      return { state: { ...state, band: nextBand, pending: null }, action: 'drop', event: null };
    }
    const originBand = pending ? pending.originBand : state.band;
    const crossed = pickCrossedLevel(originBand, nextBand, levels);
    if (crossed) pending = { ...crossed, rateVnd, detectedAt: now.getTime(), originBand };
  }
  if (!pending) return { state: { ...state, band: nextBand }, action: 'none', event: null };
  if (!windowOpen) return { state: { ...state, band: nextBand, pending: null }, action: 'drop', event: null };
  if (!canSendAlert(state, now, quiet)) return { state: { ...state, band: nextBand, pending }, action: 'defer', event: null };
  const dateKey = getVnDateKey(now);
  const sentCount = (state.sentDateKey === dateKey ? state.sentCount : 0) + 1;
  const { originBand: _origin, ...event } = { ...pending, rateVnd };
  return {
    state: { band: nextBand, pending: null, sentDateKey: dateKey, sentCount, lastSentAt: now.getTime() },
    action: 'send', event,
  };
}
