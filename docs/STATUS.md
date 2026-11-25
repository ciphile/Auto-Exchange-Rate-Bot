# STATUS — Auto-Exchange-Rate-Bot
> **Chế độ làm việc: Mode 2 (Tự động)** · Cập nhật: 25/11/2026 (tổng kết) · Mục đích: để KHANG nhớ việc.

## Giai đoạn hiện tại
**FS bản 1.0** (BR-01 → BR-53; BR-53 chưa mợt). Rây đã có code nối dịch vụ thật (database, AI, webhook, tick) — **chưa deploy thật**. 821 / 821 test đạt (gồm 633 tình huống audit prompt). Hạn chót Rây: **thứ Năm 03/12/2026**.

## Việc dở / chờ
| # | Việc | Ai / trạng thái |
|---|---|---|
| 1 | **Mợt PR #7** (BR-54 → BR-56: hỏi nguồn 2 phút tự trả lời, giờ + ngày lấy giá, nói giờ + ngày kiểu người). PR #5, #6 đã mợt (25/11). CI xanh ở lần kiểm gần nhất | 👤 Khang · ⭐ |
| 1b | **⭐ PENDING QUAN TRỌNG — PHẢI LÀM TRƯỚC KHI KHANG CÀI LỊCH GỌI BOT (phần 7):** thêm vào `docs/huong-dan-cai-dat.md` phần 7 một **lịch dọn nhật ký chạy mỗi đêm** xóa dòng cũ hơn 1 ngày trong `cron.job_run_details`. Lý do: lịch gọi bot **mỗi phút** (BR-55) làm Supabase ghi ~1.440 dòng nhật ký / ngày, **không tự xóa** → ~20 MB / tháng, ~250 MB / năm = hơn nửa ổ 500 MB của gói Free (Khang dặn 25/11/2026: "ghi pending task quan trọng cái này phải làm"). Kèm bước kiểm đã chạy + cách xem dung lượng (Supabase → Reports / Usage). **Khang đừng chạy phần 7 cho tới khi Kat xong việc này** (Kat chưa sửa code / hướng dẫn — chỉ ghi sổ theo lệnh "ghi pending") | ⏳ Kat · ⭐⭐ |
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
