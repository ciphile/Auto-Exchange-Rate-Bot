// F-08 /gioithieu (Khang 25/11/2026): bot tự giới thiệu NGẮN trong nhóm — tên + chức năng chính. Không tên người (Rule 5).
import type { BotKey } from '../domain/telegram.ts';

/** Chức năng chính đưa AI làm ý (AI chỉ diễn đạt lại, không thêm chức năng không có). */
export const INTRO_FEATURES: Record<BotKey, readonly string[]> = {
  ray: [
    'báo tỉ giá SGD → VND (Wise, Vietcombank, VPBank) theo lịch, dày hơn khi gần ngày lương',
    'cảnh báo khi tỉ giá vượt mốc (lên hoặc xuống)',
    'hỏi "lấy giá ngay" là đi lấy giá liền, có ghi nguồn + giờ',
    'nhắc ngày nghỉ lễ Singapore (tháng trước, tuần trước, đúng ngày) và nhắc điền timesheet thứ Sáu',
    'gọi tên là trả lời, tán gẫu chuyện kinh tế, vàng, coin',
  ],
  lui: [
    'đọc tin tức báo chính thống 2 lần / ngày và báo tin nóng cho nhóm',
    'gọi tên là trả lời, bàn chuyện thời sự',
  ],
};

/** Câu soạn sẵn khi AI lỗi. */
export const INTRO_FALLBACK: Record<BotKey, string> = {
  ray: 'Dạ em là Rây, bot tỉ giá của nhóm nè. Em báo tỉ giá SGD → VND theo lịch, cảnh báo khi giá vượt mốc, ai hỏi "lấy giá ngay" là em đi lấy liền. Em cũng nhắc ngày nghỉ lễ Singapore với nhắc điền timesheet thứ Sáu. Cần gì cứ gọi "Rây ơi" nha.',
  lui: 'Dạ em là Lũi, bot tin tức của nhóm nè. Em đọc tin báo chính thống mỗi ngày và báo tin nóng cho mọi người. Cần gì cứ gọi "Lũi ơi" nha.',
};
