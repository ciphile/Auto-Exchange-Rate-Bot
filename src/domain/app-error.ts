// Danh mục mã lỗi (FS mục 4). Mỗi mã PHẢI có 2 câu trong src/shared/messages.vi.ts (barie test).
export const ERROR_CODES = [
  'E-SRC-001', // Wise lỗi, đang dùng nguồn dự phòng
  'E-SRC-002', // mọi nguồn tỉ giá lỗi
  'E-SRC-003', // không tải / không đọc được lịch lễ MOM Singapore
  'E-SRC-004', // từ 15/12 vẫn chưa có lịch lễ năm sau
  'E-AI-001', // hết lượt Gemini miễn phí
  'E-AI-002', // khóa Gemini sai / bị chặn
  'E-AI-003', // Gemini nghẽn / lỗi tạm thời (mọi model thử đều hỏng)
  'E-TG-001', // gửi tin Telegram thất bại
  'E-SYS-001', // dọn dẹp 01:00 thất bại
  'E-DB-001', // đọc / ghi database Supabase thất bại
  'E-CFG-001', // thiếu / sai biến môi trường
] as const;
export type ErrorCode = (typeof ERROR_CODES)[number];
