// Câu chữ hiển thị (CODING_STANDARDS 6.8). Lỗi gửi RIÊNG Khang (BR-15): câu báo + cách xử lý.
import type { ErrorCode } from '../domain/app-error.ts';

export const ERROR_MESSAGES: Record<ErrorCode, { message: string; fix: string }> = {
  'E-SRC-001': {
    message: 'Wise không trả giá ở lần lấy giá vừa rồi; bot đang dùng nguồn dự phòng (cập nhật 1 lần / ngày).',
    fix: 'Không cần làm gì. Nếu kéo dài quá 1 ngày, báo Kat kiểm lại đường dẫn lấy giá của Wise.',
  },
  'E-SRC-002': {
    message: 'Không lấy được giá từ mọi nguồn (Wise, dự phòng, VCB, VPBank); bot không nhắn gì vào group.',
    fix: 'Kiểm trạng thái Vercel và mạng; lỗi tự hết khi nguồn có lại, bot dùng bản giá gần nhất kèm ngày giờ.',
  },
  'E-AI-001': {
    message: 'Gemini đã hết lượt miễn phí của hôm nay; bot đang nói bằng câu soạn sẵn.',
    fix: 'Không cần làm gì; lượt miễn phí reset khoảng 15:00 giờ VN.',
  },
  'E-AI-002': {
    message: 'Khóa Gemini bị từ chối (sai hoặc bị chặn); bot không gọi được AI.',
    fix: 'Tạo khóa mới ở Google AI Studio rồi dán vào biến môi trường GEMINI_API_KEY trên Vercel.',
  },
  'E-TG-001': {
    message: 'Gửi tin vào group thất bại.',
    fix: 'Kiểm bot còn trong group và chưa bị chặn; nếu vẫn lỗi, gửi Kat mã lỗi Telegram kèm theo.',
  },
  'E-SYS-001': {
    message: 'Việc dọn dẹp lúc 01:00 thất bại; tin nhắn tạm và log riêng tư có thể chưa được xóa.',
    fix: 'Báo Kat ngay; trong lúc chờ có thể tắt lắng nghe bằng lệnh /langnghe off.',
  },
  'E-CFG-001': {
    message: 'Thiếu hoặc sai một biến môi trường bắt buộc.',
    fix: 'Thêm đúng biến đó trên Vercel theo docs/huong-dan-cai-dat.md, rồi deploy lại.',
  },
};
