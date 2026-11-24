# STATUS — Auto-Exchange-Rate-Bot
> **Chế độ làm việc: Mode 1 (Luôn hỏi)** · Cập nhật: 24/11/2026 22:15 (tổng kết bổ sung) · Mục đích: để KHANG nhớ việc.

## Giai đoạn hiện tại
Bước 1 (phỏng vấn) **gần xong** — lượt 1–5 trong `docs/specs/00-phong-van.md`. **2 bot riêng, chung 1 bộ code:** **Rây** (tỉ giá, nhóm A — **làm trước**) và **Lũi** (tin tức, nhóm B). Thứ tự: requirement → việc 3 (kiến trúc / bảo mật / khả thi) → ATR → BRD + FS + TS → code. Chưa có code chính thức; nguyên mẫu đóng băng ở `prototype-v0/`. Lịch sử đầy đủ: `docs/history.md` (mục B có T01–T12).

## Việc dở / chờ
| # | Việc | Ai / trạng thái |
|---|---|---|
| 1 | **Lũi — lĩnh vực tin** nhóm B hay bàn | 👤 Khang gửi sau · ⭐ |
| 2 | **Lũi — tính cách** (Kat mô tả kỹ, ràng buộc bằng rule + tham số) | 👤 Khang gửi sau · ⭐ |
| 3 | **Lũi — giọng văn** | 👤 Khang gửi sau · ⭐ |
| 5 | **D2 — quy tắc mức hóng chuyện 1–10** (bảng mức → tần suất, trần lượt / ngày; ban đêm có chen vào không) | 👤 Khang chốt · ⏳ Kat soạn bảng nháp |
| 5b | Tóm tắt chat cuối ngày (D4 đã chốt): **Rây có cần không**, hay chỉ Lũi? | 👤 Khang |
| 6 | Duyệt kết luận lượt 2–5 → **chốt requirement** | 👤 Khang |
| 7 | **Việc 3:** kiểm chứng nhịp lịch 10–15 phút (Vercel Hobby cron chỉ 1 lần / ngày → pg_cron của Supabase?), quota Gemini free theo khóa, RSS các báo → ADR | ⏳ Kat (chờ Khang cho phép) |
| 8 | **Việc 4 — ATR** | ⏳ Kat soạn · 👤 Khang chốt |
| 9 | **Việc 5 — BRD + FS + TS** (cổng chặn) | ⏳ Kat |
| 10 | Barie tối thiểu + CI, gồm **barie quét tên thật** (BUG-0001) — sau khi chốt stack | ⏳ Kat |
| 11 | Tạo 2 bot với @BotFather, tắt Group Privacy (`/setprivacy` → Disable), giữ token (không dán vào chat) — tới bước cài đặt | 👤 Khang |
| 12 | Nguồn Wise không chính thức → ADR + nguồn dự phòng | ⏳ Kat |

## Câu hỏi chờ Khang
- D2 (việc 5 ở trên).
- Hạn chót cho Rây: thứ Năm **03/12/2026**, đúng không?
- Có việc nào Khang làm ngoài chat (GitHub, BotFather…) mà Kat chưa ghi vào sổ quy trình không?

## Bug đang mở
- Không có. (BUG-0001 đã xong; phòng ngừa bằng barie ở việc 10.)
