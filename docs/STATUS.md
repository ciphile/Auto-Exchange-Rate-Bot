# STATUS — Auto-Exchange-Rate-Bot
> **Chế độ làm việc: Mode 2 (Tự động)** · Cập nhật: 25/11/2026 07:03 · Mục đích: để KHANG nhớ việc.

## Giai đoạn hiện tại
**FS bản 0.8** (`docs/specs/02-functional-spec.md` — Khang đã duyệt bản 0.2; 0.3–0.6 Kat viết Mode 2: tính cách / tâm trạng / tần suất / ngữ cảnh prompt / nói tục / lệnh cài đặt / hồ sơ thành viên / ngày lễ SG / timesheet / người đang hỏi). Hạn chót Rây: **thứ Năm 03/12/2026** (Khang xác nhận). Code: logic thuần + kiểm biến môi trường + barie; typecheck chạy được. 137 / 137 test đạt. Chưa nối dịch vụ thật.

## Việc dở / chờ
| # | Việc | Ai / trạng thái |
|---|---|---|
| 1 | **Xem + mợt PR #4** (tính cách × tâm trạng, tần suất, ngữ cảnh prompt, nói tục, lệnh cài đặt) | 👤 Khang · ⭐ |
| 2 | **Tạo dịch vụ theo `docs/huong-dan-cai-dat.md` phần 1–5** (Telegram ID, BotFather + tắt Group Privacy, Supabase, Gemini, Vercel + 7 biến). Không dán khóa vào chat. Xong báo Kat: tên bot, địa chỉ Vercel, kết quả kiểm 404 | 👤 Khang · ⭐ |
| 3 | **Lũi — lĩnh vực tin, tính cách + tâm trạng riêng (cơ chế bật / tắt + tâm trạng đã dùng chung), giọng văn** | 👤 Khang gửi sau |
| 4 | **Code đợt 2**: Telegram adapter + webhook (ATR-1), Supabase (bảng + RLS + migration) → hướng dẫn phần 6, `/api/tick` + Vault → phần 7, AI adapter (100% tài liệu Khang), lệnh của Khang + `/gannhom`, action `lay_ty_gia_ngay` | ⏳ Kat |
| 4b | Nạp hồ sơ thành viên (`docs/rieng-tu/HO-SO-THANH-VIEN.md`) vào database + lệnh `/thanhvien` gắn mã Telegram từng người (BR-40) — làm cùng phần database, hướng dẫn phần 6 | ⏳ Kat |
| 5 | KC-01 (Supabase Cron mỗi 10 phút gói Free) · KC-06 (Vercel build `import './x.ts'`) · KC-07 (404 cho `docs/`) · KC-08 (Vercel vào được trang MOM không) | ⏳ Kat (sau việc 2) |
| 6 | Nguồn Wise không chính thức — đã có ADR-07 + nguồn dự phòng | ✅ theo dõi |

## Câu hỏi chờ Khang
- Có việc nào Khang làm ngoài chat (GitHub, BotFather…) mà Kat chưa ghi vào sổ quy trình không?

## Bug đang mở
- Không có.
