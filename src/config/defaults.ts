// Tham số mặc định. Tham số nghiệp vụ Khang chỉnh bằng lệnh (mốc, giờ nghỉ, mức hóng chuyện…) sẽ lưu ở
// bảng settings trong database; file này chỉ giữ GIÁ TRỊ KHỞI TẠO + tham số kỹ thuật. Mọi nơi đọc qua đây.

// BR-06: mốc cảnh báo (VND / 1 SGD, so với giá Wise) — phương án C, Khang chốt 24/11/2026.
export const DEFAULT_ALERT_LEVELS_VND: readonly number[] = [19800, 19900, 20000, 20100, 20200, 20300];
// F-03: khi cắt nhiều mốc một lần, ưu tiên nói về 2 mốc nhóm quan tâm nhất.
export const KEY_ALERT_LEVELS_VND: readonly number[] = [20000, 20100];
// BR-07: đệm chống báo qua lại khi giá sát mốc.
export const ALERT_HYSTERESIS_VND = 10;
// BR-02, BR-03: số ngày tính tới ngày lương (gồm cả ngày lương).
export const PAYDAY_WEEK_DAYS = 7;
export const ALERT_WINDOW_DAYS = 14;
// BR-08: giới hạn cảnh báo.
export const MAX_ALERTS_PER_DAY = 4;
export const MIN_ALERT_GAP_MS = 3 * 60 * 60 * 1000;
// BR-09: giờ nghỉ mặc định (giờ VN) — bot không TỰ nhắn trong khoảng [startHour, endHour).
export const DEFAULT_QUIET_HOURS = { startHour: 20, endHour: 6 } as const;
// BR-04: giờ lấy giá cố định (giờ VN), cách nhau 5 tiếng.
export const RATE_FETCH_HOURS_VN: readonly number[] = [1, 6, 11, 16, 21];
// BR-10: số lần báo chủ động trong tuần lương.
export const PAYDAY_POSTS_MIN = 4;
export const PAYDAY_POSTS_MAX = 6;
// BR-11: khung bốc giờ nói ngẫu nhiên (phút trong ngày, giờ VN): 06:30 → 19:30.
export const RANDOM_TALK_FROM_MINUTE = 6 * 60 + 30;
export const RANDOM_TALK_TO_MINUTE = 19 * 60 + 30;
// BR-12: chợ đen ước tính = Wise × (1 + mức chênh), làm tròn tới 10 đ.
export const BLACK_MARKET_PREMIUM = 0.004;
export const BLACK_MARKET_ROUND_VND = 10;
// BR-18 + FS mục 6: bảng mức hóng chuyện (vị trí 0 = mức 1 … vị trí 9 = mức 10).
export const CHATTINESS_TABLE: readonly { probability: number; dailyCap: number }[] = [
  { probability: 0, dailyCap: 0 },
  { probability: 0.05, dailyCap: 1 },
  { probability: 0.1, dailyCap: 2 },
  { probability: 0.15, dailyCap: 3 },
  { probability: 0.2, dailyCap: 4 },
  { probability: 0.3, dailyCap: 6 },
  { probability: 0.4, dailyCap: 8 },
  { probability: 0.5, dailyCap: 10 },
  { probability: 0.65, dailyCap: 14 },
  { probability: 0.8, dailyCap: 20 },
];
export const DEFAULT_CHATTINESS_LEVEL = 3;
export const CHATTINESS_TOPIC_BOOST = 1.5;
export const CHATTINESS_MAX_PROBABILITY = 0.95;
export const CHIME_IN_COOLDOWN_MS = 30 * 60 * 1000;
export const BURST_MIN_MESSAGES = 3;
export const BURST_SILENCE_MS = 3 * 60 * 1000;
// Kỹ thuật: gọi nguồn tỉ giá.
export const HTTP_TIMEOUT_MS = 20_000;
export const HTTP_USER_AGENT = 'Mozilla/5.0 (compatible; auto-exchange-rate-bot)';
// BR-30: lấy giá ngay theo yêu cầu — mỗi nguồn tối đa 1 lần đọc / 5 phút (VCB yêu cầu ≤ 1 lần / 5 phút).
export const LIVE_FETCH_COOLDOWN_MS = 5 * 60 * 1000;
