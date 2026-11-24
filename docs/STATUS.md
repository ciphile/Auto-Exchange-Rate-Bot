# STATUS — Auto-Exchange-Rate-Bot
> **Chế độ làm việc: Mode 1 (Luôn hỏi)** · Cập nhật: 24/11/2026 21:47 (Khang dặn "nhớ ghi pending") · Mục đích: để KHANG nhớ việc.

## Giai đoạn hiện tại
Bước 1 (phỏng vấn) **gần xong** — lượt 1–5 trong `docs/specs/00-phong-van.md`. Yêu cầu thật: **2 bot riêng** — **Rây** (tỉ giá, nhóm A) và **Lũi** (tin tức, nhóm B), trực 24/24, miễn phí 100%. Thứ tự Khang chốt: requirement → **việc 3** (kiến trúc, bảo mật, khả thi) → **ATR** → **FS** (+ BRD, TS theo cổng chặn) → code. Chưa có code chính thức; nguyên mẫu đóng băng ở `prototype-v0/`.

## Việc dở / chờ
| # | Việc | Ai / trạng thái |
|---|---|---|
| 1 | **Lũi — lĩnh vực tin** nhóm B hay bàn (Khang dặn ghi pending 24/11) | 👤 Khang gửi sau · ⭐ |
| 2 | **Lũi — tính cách** (Kat sẽ mô tả kỹ, ràng buộc bằng rule + tham số) | 👤 Khang gửi sau · ⭐ |
| 3 | **Lũi — giọng văn** | 👤 Khang gửi sau · ⭐ |
| 4 | Danh sách **mốc cảnh báo** của Rây (nháp: 19,900 · 19,950 · 20,000 · 20,100 · 20,200 · 20,300) | 👤 Khang |
| 5 | Duyệt kết luận lượt 2–5 → **chốt requirement** | 👤 Khang |
| 6 | **Việc 3:** chọn chỗ chạy (Kat đề xuất Vercel + Supabase), ngôn ngữ (TypeScript hay Python), kiểm chứng: nhịp lịch mỗi 10–15 phút (pg_cron của Supabase?), quota Gemini free theo khóa / dự án, RSS các báo | 👤 Khang quyết · ⏳ Kat kiểm chứng |
| 7 | **Việc 4 — ATR:** dữ liệu chat gửi Gemini free; tắt Group Privacy cả 2 bot; link chỉ mở khi được yêu cầu (có cần danh sách trang được phép?); webhook / nhịp lịch có mã bí mật; chỉ Khang chỉnh cấu hình | ⏳ Kat soạn · 👤 Khang chốt |
| 8 | **Việc 5:** BRD + FS + TS (cổng chặn) | ⏳ Kat |
| 9 | Barie tối thiểu + CI (sau khi chốt stack) | ⏳ Kat |
| 10 | Khang tạo 2 bot với @BotFather, giữ token (không dán vào chat) — làm khi tới bước cài đặt | 👤 Khang |
| 11 | Nguồn Wise không chính thức → ADR + nguồn dự phòng 1 lần / ngày (đã chốt hướng ở lượt 3) | ⏳ Kat |

## Câu hỏi chờ Khang
- Hạn chót "t5 tuần sau" = **thứ Năm 03/12/2026**, đúng không? (Lưu ý: phạm vi giờ là 2 bot.)
- Có việc nào Khang làm ngoài chat (GitHub, BotFather…) mà Kat chưa ghi vào sổ quy trình không?

## Bug đang mở
- Không có.
