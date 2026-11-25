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
// BR-08 + BR-35: giới hạn cảnh báo theo mức tần suất → src/config/frequency.ts.
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
// BR-12: chợ đen ước tính = Wise × (1 + mức chênh), làm tròn tới 50 đ.
// Mặc định 0,48%: Khang đối chiếu 25/11/2026 — Wise 20.004,30 ↔ chợ đen thật 20.100 (0,4% cũ ra 20.080, thấp 20 đ).
// Khang tự chỉnh bằng /chotden (lưu trong cài đặt `blackMarketPremiumPct`, BR-53) — hằng số này chỉ là giá trị mặc định.
export const DEFAULT_BLACK_MARKET_PREMIUM_PCT = 0.48;
export const BLACK_MARKET_PREMIUM = DEFAULT_BLACK_MARKET_PREMIUM_PCT / 100;
/** Giới hạn mức chênh Khang được đặt (%) — ngoài khoảng này coi như gõ nhầm. */
export const BLACK_MARKET_PREMIUM_MIN_PCT = -2;
export const BLACK_MARKET_PREMIUM_MAX_PCT = 5;
// Khang 25/11/2026: chợ đen hay làm tròn → tròn tới 50 đ (20.096 → 20.100).
export const BLACK_MARKET_ROUND_VND = 50;
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
// BR-30: người dùng nói "tùy mày / nguồn nào cũng được" → đọc nguồn chuẩn để so mốc (BR-05).
export const LIVE_SOURCE_FOR_ANY = 'wise' as const;
// BR-30: Rây hỏi "lấy nguồn nào?" — câu trả lời trong 10 phút được hiểu là trả lời câu hỏi đó.
export const SOURCE_QUESTION_TTL_MS = 10 * 60 * 1000;
// BR-55 (Khang 25/11/2026): bot hỏi "nguồn nào?" mà sau 2 phút không ai trả lời → bot tự trả lời (kèm câu "do bạn không nói nguồn nên…").
export const NO_SOURCE_DEFAULT_AFTER_MS = 2 * 60 * 1000;
// Nhịp lịch bị trễ / hỏng quá lâu → bỏ câu hỏi cũ, không trả lời muộn lạc đề.
export const NO_SOURCE_GIVE_UP_MS = 30 * 60 * 1000;
// Kỹ thuật: Telegram.
export const TELEGRAM_API_BASE = 'https://api.telegram.org';
export const TELEGRAM_CHUNK_CHARS = 4000; // Telegram cho tối đa 4096 ký tự / tin — chừa chỗ an toàn
export const TELEGRAM_MAX_RETRY_WAIT_MS = 5_000; // bị Telegram bảo chờ lâu hơn mức này → không thử lại, báo lỗi
export const MAX_INCOMING_TEXT_CHARS = 4_000; // cắt tin đến quá dài trước khi lưu / gửi AI (prompt không phình)
// BR-17: tên gọi của từng bot (so không phân biệt hoa thường; có hoặc không "ơi").
export const BOT_CALL_NAMES = { ray: ['rây', 'rẩy', 'ray'], lui: ['lũi', 'lui'] } as const;
