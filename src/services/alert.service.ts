// F-03: cảnh báo cắt mốc. Hàm thuần: nhận trạng thái + giá + thời điểm, trả trạng thái mới + hành động.
import { ALERT_HYSTERESIS_VND, DEFAULT_QUIET_HOURS, KEY_ALERT_LEVELS_VND } from '../config/defaults.ts';
import { DEFAULT_FREQUENCY_LEVEL, FREQUENCY_PROFILES, type AlertLimits } from '../config/frequency.ts';
import { isInQuietHours } from '../shared/vn-time.ts';

export type AlertDirection = 'up' | 'down';
export type AlertEvent = { levelVnd: number; direction: AlertDirection; rateVnd: number; detectedAt: number };
/** Cảnh báo đang chờ + vị trí (band) TRƯỚC khi cắt mốc — để biết giá đã quay về chỗ cũ hay chưa. */
export type PendingAlert = AlertEvent & { originBand: number };
export type AlertState = {
  band: number | null; // số mốc đang nằm dưới giá (đã tính đệm) — null = chưa có lần đo nào
  pending: PendingAlert | null; // cảnh báo đang chờ được phép gửi
  /** Các lần đã gửi gần đây (ms) — chỉ giữ trong khoảng đếm dài nhất của mọi mức (BR-35). */
  recentSentAts: number[];
};
export type AlertAction = 'none' | 'send' | 'defer' | 'drop';

export const EMPTY_ALERT_STATE: AlertState = { band: null, pending: null, recentSentAts: [] };
const DEFAULT_LIMITS = FREQUENCY_PROFILES[DEFAULT_FREQUENCY_LEVEL].alerts;
const KEEP_SENT_MS = Math.max(...Object.values(FREQUENCY_PROFILES).map((p) => p.alerts.perMs));

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

export type AlertGate = 'ok' | 'quiet' | 'gap' | 'quota';

/**
 * BR-08 + BR-09 + BR-35: được gửi cảnh báo lúc này không.
 * 'quiet' giờ nghỉ và 'gap' chưa đủ khoảng cách → CHỜ; 'quota' đã đủ số lần trong khoảng đếm của mức → BỎ.
 */
export function checkAlertGate(state: AlertState, now: Date, limits: AlertLimits = DEFAULT_LIMITS, quiet = DEFAULT_QUIET_HOURS): AlertGate {
  if (isInQuietHours(now, quiet)) return 'quiet';
  const t = now.getTime();
  const last = state.recentSentAts.at(-1);
  if (last !== undefined && t - last < limits.minGapMs) return 'gap';
  return state.recentSentAts.filter((at) => t - at < limits.perMs).length >= limits.maxCount ? 'quota' : 'ok';
}

/**
 * Đánh giá 1 lần (sau mỗi bản chụp giá mới HOẶC mỗi nhịp lịch, với giá gần nhất).
 * windowOpen = đang trong khung cảnh báo (BR-03). Ngoài khung: vẫn cập nhật band (để không báo dồn khi
 * khung mở), nhưng không báo và bỏ cảnh báo đang chờ.
 */
export function evaluateAlert(
  state: AlertState, rateVnd: number, now: Date, levels: readonly number[], windowOpen: boolean,
  limits: AlertLimits = DEFAULT_LIMITS, quiet = DEFAULT_QUIET_HOURS,
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
  const gate = checkAlertGate(state, now, limits, quiet);
  // BR-35: hết lượt của mức → bỏ (Khang: "chỉ 1 lần trong 3 ngày"), không dồn lại báo sau.
  if (gate === 'quota') return { state: { ...state, band: nextBand, pending: null }, action: 'drop', event: null };
  if (gate !== 'ok') return { state: { ...state, band: nextBand, pending }, action: 'defer', event: null };
  const t = now.getTime();
  const { originBand: _origin, ...event } = { ...pending, rateVnd };
  return {
    state: { band: nextBand, pending: null, recentSentAts: [...state.recentSentAts.filter((at) => t - at < KEEP_SENT_MS), t] },
    action: 'send', event,
  };
}
