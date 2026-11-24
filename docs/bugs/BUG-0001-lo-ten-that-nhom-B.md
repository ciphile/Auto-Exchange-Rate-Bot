# BUG-0001 — 24/11/2026 — LỠ GHI TÊN THẬT CỦA NHÓM B VÀO BIÊN BẢN
> **Nhãn:** ✅ ĐÃ XONG 24/11/2026 (đã gỡ khỏi cây file) · phòng ngừa bằng barie: ⏳ ĐANG CHỜ (T10, sau khi chốt stack)
> **Module:** tài liệu / riêng tư (chưa có code chính thức) · **Mã quy tắc:** Rule 5 · **Commit:** lỗi ở `5409d28`, sửa ở `853367c`, dọn bảng đối chiếu ở `f057d58`

- **BỐI CẢNH:** 24/11/2026 21:47 Kat ghi câu trả lời bổ sung lượt 5 vào `docs/specs/00-phong-van.md`, chép nguyên văn cách Khang gọi nhóm B (tên thật của group). Kat tự phát hiện khi chạy lệnh rà tên thật sau commit (21:48). Tái hiện: `git show 5409d28 -- docs/specs/00-phong-van.md`.
- **NGUYÊN NHÂN GỐC:** L1 — Kat chép lời Khang "nguyên ý" nhưng quên áp bước "đổi tên thật → biệt danh" cho **tên group** (lúc đó Rule 5 mới nói rõ tên người / tên công ty). L2 — Rule 5 chỉ là **biển báo** (chữ trong `CLAUDE.md`), không có **barie** tự chặn; lệnh rà tên chỉ chạy **sau** commit.
- **QUY TẮC BỊ VI PHẠM:** Rule 5 (riêng tư) · `CODING_STANDARDS` 6.18 (luật máy kiểm được phải thành barie).
- **ẢNH HƯỞNG:** tên thật nhóm B nằm trong cây file khoảng 1 phút và **vẫn còn trong lịch sử git** (repo private → chưa lộ ra ngoài). Nếu repo public mà không làm sạch lịch sử → lộ tên group.
- **ĐÃ SỬA:** `docs/specs/00-phong-van.md` — thay bằng "nhóm B" (`853367c`). `docs/rieng-tu/BANG-TEN-THAT.md` — theo yêu cầu Khang 21:50, bỏ luôn tên thật của **cả 2 group** khỏi bảng đối chiếu (`f057d58`). Quy ước mới: Khang nói tên thật, Kat tự đổi; Kat cũng không nhắc lại tên thật trong câu trả lời.
- **KHÔNG SỬA (cố ý):** lịch sử git (repo private; quy ước đã có: trước khi public phải tạo repo mới sạch — viết lại lịch sử bây giờ là thao tác rủi ro, thuộc "giới hạn cứng").
- **REVIEW:** Kat tự rà bằng `grep` sau mỗi commit có ghi lời Khang; Khang phát hiện thêm việc tên group vẫn nằm trong bảng đối chiếu và yêu cầu bỏ.
- **TEST:** lệnh rà `grep -rn -E "<danh sách tên>" . --exclude-dir=.git` (trừ `docs/rieng-tu/` và `docs/SKILL_TAM.md`) → 0 kết quả sau khi sửa. Chưa có test tự động (chưa có code).
- **FILE ĐỔI:** `docs/specs/00-phong-van.md`, `docs/rieng-tu/BANG-TEN-THAT.md`, `CLAUDE.md` (Rule 5), `docs/quy-trinh-note.md`.
- **BÀI HỌC:** → SC04 trong `docs/history.md` mục F: luật riêng tư phải thành **barie** (test quét repo theo danh sách tên trong file riêng, đỏ thì không commit) — nằm trong bộ barie tối thiểu (T10).
