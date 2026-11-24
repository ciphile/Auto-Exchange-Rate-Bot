# STATUS — Auto-Exchange-Rate-Bot
> **Chế độ làm việc: Mode 1 (Luôn hỏi)** · Cập nhật: 24/11/2026 20:27 (cài bộ quy tắc v0.1) · Mục đích: để KHANG nhớ việc.

## Giai đoạn hiện tại
Bước 1 (phỏng vấn SME) **đang dở**: xong biên bản lượt 1, chờ Khang duyệt, rồi hỏi lượt 2. **Chưa có BRD / FS / TS** → chưa được viết thêm code app. Đã có **code nháp** trên nhánh `claude/new-session-5jra1l` (2 commit, chưa merge, **chưa qua cổng chặn**).

## Việc dở / chờ
| # | Việc | Ai / trạng thái |
|---|---|---|
| 1 | Duyệt "kết luận lượt 1" trong `docs/specs/00-phong-van.md` | 👤 Khang · ⭐ |
| 2 | Trả lời lượt 2 (ràng buộc: ngân sách, riêng tư, phase 1) rồi các lượt 3–6 | 👤 Khang · ⭐ |
| 3 | Quyết số phận **code nháp**: (a) giữ làm nguyên mẫu thử rồi viết lại sau spec · (b) bỏ hẳn · (c) giữ và viết spec khớp theo code | 👤 Khang · ⭐ |
| 4 | Chọn stack + ADR: giữ Python + GitHub Actions, hay theo mẫu của skill (TypeScript + Next.js / Vercel / Supabase); cách áp dụng `CODING_STANDARDS` cho Python | 👤 Khang |
| 5 | Dựng **barie tối thiểu** (mục 6.18) + CI chạy xanh — sau khi chốt stack | ⏳ Kat |
| 6 | Chưa thử thật: Telegram (bot token), Claude API, chạy workflow trên GitHub Actions. Cần Khang tự thêm secret (không dán vào chat) — `docs/huong-dan-cai-dat.md` chưa viết | 👤 Khang · ⏳ Kat |
| 7 | Dịch vụ tốn phí: bản nháp gọi Claude API (mặc định `claude-opus-5-5`) → Khang duyệt trước khi bật | 👤 Khang |
| 8 | Riêng tư: chú thích trong code nháp có nhắc tên 1 đồng nghiệp; repo public hay private? Ảnh hưởng quyết định ở việc 3 | 👤 Khang |
| 9 | Nguồn Wise là endpoint **không chính thức** của wise.com (có thể đổi bất cứ lúc nào) → cần ADR + phương án dự phòng | ⏳ Kat |

## Câu hỏi chờ Khang
- Có việc nào Khang làm ngoài chat (GitHub, tạo bot với BotFather, thêm bot vào group…) mà Kat chưa ghi vào sổ quy trình không?

## Bug đang mở
- Không có.
