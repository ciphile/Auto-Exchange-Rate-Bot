# STATUS — Auto-Exchange-Rate-Bot
> **Chế độ làm việc: Mode 2 (Tự động — Khang vắng)** · Cập nhật: 24/11/2026 22:34 (tổng kết) · Mục đích: để KHANG nhớ việc.

## Giai đoạn hiện tại
**FS v0.1 đã viết** (`docs/specs/02-functional-spec.md` — dự án chỉ cần FS). Rây đầy đủ, Lũi khung. **Code đợt 1** (logic thuần + barie + CI) xong: 35 / 35 test đạt. Chưa nối dịch vụ thật (Vercel, Supabase, Gemini, Telegram).

## Việc dở / chờ
| # | Việc | Ai / trạng thái |
|---|---|---|
| 1 | **Xem lại FS v0.1** — Mode 2 đã chốt, Khang sửa chỗ nào Kat cập nhật (nhất là: giờ lấy giá 01/06/11/16/21h, 4–6 lần / tuần lương, bảng mức hóng chuyện, giờ nghỉ vẫn trả lời khi được gọi tên) | 👤 Khang · ⭐ |
| 2 | **Lũi — lĩnh vực tin, tính cách, giọng văn** | 👤 Khang gửi sau · ⭐ |
| 3 | **Tạo dịch vụ**: project Supabase, project Vercel, khóa Gemini (Google AI Studio), 2 bot với @BotFather (tắt Group Privacy). Không dán khóa vào chat — Kat sẽ soạn `docs/huong-dan-cai-dat.md` từng bước | 👤 Khang |
| 4 | **Duyệt cài gói `typescript`** (chỉ lúc phát triển, để barie kiểm kiểu): miễn phí, mã nguồn mở của Microsoft, không chạy trên bot thật | 👤 Khang |
| 5 | **Code đợt 2**: AI adapter (100% tài liệu của Khang), Telegram + webhook, Supabase (bảng + RLS), `/api/tick`, dọn dẹp 01:00, lệnh của Khang — làm với dịch vụ giả trước, nối thật sau việc 3 | ⏳ Kat |
| 6 | KC-01: thử Supabase Cron gọi `/api/tick` mỗi 10 phút trên gói Free | ⏳ Kat (sau việc 3) |
| 7 | Nguồn Wise không chính thức — đã có ADR-07 + nguồn dự phòng | ✅ theo dõi |

## Câu hỏi chờ Khang
- Hạn chót cho Rây: thứ Năm **03/12/2026**, đúng không?
- Có việc nào Khang làm ngoài chat (GitHub, BotFather…) mà Kat chưa ghi vào sổ quy trình không?

## Bug đang mở
- Không có.
