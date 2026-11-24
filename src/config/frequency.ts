// BR-35: mức tần suất 1–5 (lệnh `/tansuat <1-5>`) — Rây tự báo giá và cảnh báo thường xuyên tới đâu.
// Mức 1 + 2: Khang đặt (25/11/2026). Mức 3–5 + mặc định: Kat chốt Mode 2, tăng dần, Khang chỉnh được.
// Tháng chia 3 đoạn tính theo "số ngày còn tới ngày lương" d (d = 0 là ngày lương):
//   ĐẦU THÁNG d ≥ 14 (ngoài khung cảnh báo) · TUẦN ÁP CHÓT d = 7…13 · TUẦN LƯƠNG d = 0…6.

export const FREQUENCY_LEVELS = [1, 2, 3, 4, 5] as const;
export type FrequencyLevel = (typeof FREQUENCY_LEVELS)[number];

export type EarlyPlan = { count: number | 'fill'; gapDays: readonly [number, number] };
export type WindowPlan = {
  /** Tuần lương: 'gap' = nối chuỗi cách ngày từ ngày lương · 'payday_week' = BR-10 (4–6 lần, không nghỉ 2 ngày liền) · 'daily' = mỗi ngày. */
  paydayWeek: 'gap' | 'payday_week' | 'daily';
  /** Khoảng cách (ngày) giữa 2 lần báo, nối chuỗi lùi từ ngày lương / từ tuần lương ra hết 14 ngày cuối. */
  gapDays: readonly [number, number];
};
export type AlertLimits = { maxCount: number; perMs: number; minGapMs: number };

export type FrequencyProfile = { early: EarlyPlan; window: WindowPlan; alerts: AlertLimits };

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

export const FREQUENCY_PROFILES: Record<FrequencyLevel, FrequencyProfile> = {
  // Khang: "2 tuần đầu tháng chỉ có 1 lần… 2 tuần cuối tháng cách 2 hay 3 ngày hay cách 4 ngày… cảnh báo chỉ 1 lần trong 3 ngày"
  1: { early: { count: 1, gapDays: [1, 1] }, window: { paydayWeek: 'gap', gapDays: [2, 4] }, alerts: { maxCount: 1, perMs: 3 * DAY, minGapMs: 3 * HOUR } },
  // Khang: "2 tuần đầu… ngẫu nhiên 3 lần, cách 4-5 ngày… 2 tuần cuối cách 3 ngày… cảnh báo tối đa 2 lần trong 2 ngày"
  2: { early: { count: 3, gapDays: [4, 5] }, window: { paydayWeek: 'gap', gapDays: [3, 3] }, alerts: { maxCount: 2, perMs: 2 * DAY, minGapMs: 3 * HOUR } },
  3: { early: { count: 4, gapDays: [3, 4] }, window: { paydayWeek: 'payday_week', gapDays: [2, 2] }, alerts: { maxCount: 2, perMs: DAY, minGapMs: 3 * HOUR } },
  4: { early: { count: 6, gapDays: [2, 3] }, window: { paydayWeek: 'daily', gapDays: [1, 2] }, alerts: { maxCount: 3, perMs: DAY, minGapMs: 3 * HOUR } },
  5: { early: { count: 'fill', gapDays: [1, 2] }, window: { paydayWeek: 'daily', gapDays: [1, 1] }, alerts: { maxCount: 4, perMs: DAY, minGapMs: 3 * HOUR } },
};

export const DEFAULT_FREQUENCY_LEVEL: FrequencyLevel = 3;
