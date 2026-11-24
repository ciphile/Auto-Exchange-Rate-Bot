# STATUS — Auto-Exchange-Rate-Bot
> **Chế độ làm việc: Mode 2 (Tự động)** · Cập nhật: 25/11/2026 06:45 · Mục đích: để KHANG nhớ việc.

## Giai đoạn hiện tại
**FS bản 0.4** (`docs/specs/02-functional-spec.md` — Khang đã duyệt bản 0.2; 0.3–0.4 Kat viết Mode 2: tính cách / tâm trạng / tần suất). Hạn chót Rây: **thứ Năm 03/12/2026** (Khang xác nhận). Code: logic thuần + kiểm biến môi trường + barie; typecheck chạy được. 91 / 91 test đạt. Chưa nối dịch vụ thật.

## Việc dở / chờ
| # | Việc | Ai / trạng thái |
|---|---|---|
| 1 | **Xem + mợt PR #4** (tính cách × tâm trạng, mức tần suất); xem bảng FS mục 9, 10 — nhất là mặc định: tính cách **bật**, tần suất **mức 3** (cảnh báo 2 lần / 24 giờ thay vì 4 / ngày như cũ) | 👤 Khang · ⭐ |
| 2 | **Tạo dịch vụ theo `docs/huong-dan-cai-dat.md` phần 1–5** (Telegram ID, BotFather + tắt Group Privacy, Supabase, Gemini, Vercel + 7 biến). Không dán khóa vào chat. Xong báo Kat: tên bot, địa chỉ Vercel, kết quả kiểm 404 | 👤 Khang · ⭐ |
| 3 | **Lũi — lĩnh vực tin, tính cách, giọng văn** | 👤 Khang gửi sau |
| 4 | **Code đợt 2**: Telegram adapter + webhook (ATR-1), Supabase (bảng + RLS + migration) → hướng dẫn phần 6, `/api/tick` + Vault → phần 7, AI adapter (100% tài liệu Khang), lệnh của Khang + `/gannhom`, action `lay_ty_gia_ngay` | ⏳ Kat |
| 5 | KC-01 (Supabase Cron mỗi 10 phút gói Free) · KC-06 (Vercel build `import './x.ts'`) · KC-07 (404 cho `docs/`) | ⏳ Kat (sau việc 2) |
| 6 | Nguồn Wise không chính thức — đã có ADR-07 + nguồn dự phòng | ✅ theo dõi |

## Câu hỏi chờ Khang
- Có việc nào Khang làm ngoài chat (GitHub, BotFather…) mà Kat chưa ghi vào sổ quy trình không?

## Bug đang mở
- Không có.
