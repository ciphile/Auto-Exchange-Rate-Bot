// BR-36 + BR-37: ngữ cảnh trò chuyện gửi AI + TRẦN độ dài prompt (không phình theo thời gian).
// Mọi danh sách gửi kèm đều có trần số lượng VÀ trần ký tự; cả prompt có trần tổng → dữ liệu tích lũy bao nhiêu
// ngày thì prompt vẫn ≤ trần (barie: tests/prompt-context.test.ts mô phỏng 60 ngày).

/** Khang: "ít nhất 10-15 câu… cố định 10-15 hay 20" → cố định 15 tin gần nhất (Kat chốt Mode 2). */
export const CHAT_CONTEXT_MESSAGES = 15;
/** Kho ngữ cảnh ngắn chỉ giữ tối đa chừng này tin mới nhất / nhóm (cũ hơn bị đè), và xóa lúc 01:00 (BR-19). */
export const CHAT_CONTEXT_BUFFER_MAX = 20;
/** Khi prompt vượt trần, bớt dần tin cũ nhưng không dưới chừng này tin. */
export const CHAT_CONTEXT_MIN_MESSAGES = 5;
export const CHAT_LINE_MAX_CHARS = 300;
export const USER_MESSAGE_MAX_CHARS = 800;

export const SITUATION_MAX_FACTS = 8;
export const FACT_MAX_CHARS = 180;
export const RECENT_BOT_POSTS_MAX = 3;
export const NEWS_HEADLINES_MAX = 3;

/** Thành viên + mô tả nhóm (SYSTEM) — lấy từ database, có trần để danh sách không phình. */
export const MEMBERS_MAX = 30;
export const MEMBER_LINE_MAX_CHARS = 160;
export const GROUP_DESCRIPTION_MAX_CHARS = 600;

/** Trần tổng (ký tự). SYSTEM ổn định theo cấu hình; PROMPT gồm mọi phần đổi theo từng lần gọi. */
export const SYSTEM_MAX_CHARS = 7_000;
export const PROMPT_MAX_CHARS = 10_000;

/** Xu hướng tỉ giá (BR-36): |thay đổi| < 0,2% = đi ngang · ≥ 0,6% = mạnh. */
export const TREND_FLAT_PCT = 0.2;
export const TREND_STRONG_PCT = 0.6;
