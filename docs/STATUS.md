# STATUS — Auto-Exchange-Rate-Bot
> **Chế độ làm việc: Mode 2 (Tự động)** · Cập nhật: 25/11/2026 (tổng kết) · Mục đích: để KHANG nhớ việc.

## Giai đoạn hiện tại
**FS bản 1.0** (BR-01 → BR-53; BR-53 chưa mợt). Rây đã có code nối dịch vụ thật (database, AI, webhook, tick) — **chưa deploy thật**. 821 / 821 test đạt (gồm 633 tình huống audit prompt). Hạn chót Rây: **thứ Năm 03/12/2026**.

## Việc dở / chờ
| # | Việc | Ai / trạng thái |
|---|---|---|
| 1 | PR #5 **đã mợt** (25/11). Còn 1 commit chưa vào `main`: công tắc giá chợ đen `/chotden` (BR-53) — nằm trên nhánh `claude/new-session-5jra1l`, chờ Khang cho phép Kat tạo PR mới | 👤 Khang |
| 2 | **Cài Rây theo `docs/huong-dan-cai-dat.md` phần 1–8** + chạy `thanh-vien.sql` (file riêng Kat gửi, không trong repo) + `/chodencontact them …` cho nơi đổi chợ đen. Không dán khóa vào chat. Xong báo Kat tên bot + địa chỉ Vercel | 👤 Khang · ⭐ |
| 3 | **Kiểm sau deploy**: `/robots.txt` · `/docs/...` phải 404 · `/api/ray` GET → 405 · `curl -X POST /api/tick` → 401 · Build Logs (KC-06) · `/trangthai` trong Telegram | 👤 Khang + ⏳ Kat sửa theo lỗi thật |
| 4 | **Tải lịch lễ MOM tự động** trong tick (lịch 2027 cần trước 15/12; tạm: `/ngayle them`) — KC-08 | ⏳ Kat |
| 5 | **Lũi** — tính cách, tâm trạng riêng, giọng văn, lĩnh vực tin, token | 👤 Khang gửi sau |
| 6 | KC-01 (Supabase Cron MỖI PHÚT trên gói Free — nhịp lịch 1 phút cho việc chờ 2 phút) · KC-06 (Vercel chạy `import './x.ts'`) · KC-08 (Vercel vào được MOM) | ⏳ sau việc 2 |
| 7 | Nhỏ: tách hàm `answer` trong `webhook.service.ts` (~70 dòng > 50) · lệnh xem tình trạng AI chi tiết / xóa cache (tài liệu Khang mục 13) · `/thanhvien` gắn mã Telegram | ⏳ Kat |

## Câu hỏi chờ Khang
- Không có.

## Bug đang mở
- Không có.
