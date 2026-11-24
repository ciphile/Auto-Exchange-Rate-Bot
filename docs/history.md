# Auto-Exchange-Rate-Bot — Nhật ký & Lịch sử
> Sổ lịch sử đầy đủ có ngày giờ. **CHỈ cập nhật khi Khang nói "tổng kết" / "kết thúc buổi".** Không đọc cả file — grep đúng mục (`#t<nn>`, `#d-<module>`).

## Mục lục
[0](#s0) · [A](#sa) · [B](#sb) · [C](#sc) · [D](#sd) · [E](#se) · [F](#sf) · [G](#sg) · [H](#sh) · [I](#si)

<a id="s0"></a>
## 0. Cách dùng file này
Quy tắc ghi chép: `docs/QUY_TAC_GHI_CHEP.md`. Mẫu mục: `docs/SKILL_TAM.md` mục 5.4, 5.5.

**Lịch sử thay đổi bộ quy tắc**
- **v0.1 — 24/11/2026:** cài bản tạm của Khang vào dự án (Kat). Xem `docs/quy-trinh-note.md`.

<a id="sa"></a>
# A. Quyết định
## A1. Đang chờ
<a id="d1"></a>
### D1 — Tên người / tên nhóm trong prompt gửi AI
> **Nhãn:** ✅ ĐÃ CHỐT 24/11/2026 22:15 — (a) gửi tên thật, log prompt mã hóa giữ ≤ 1 ngày · trước đó: ⏳ ĐANG CHỜ từ 24/11/2026
- **Ghi nhận:** 2026-11-24 22:05. **Chặn:** T04, FS. **Bối cảnh:** Khang muốn prompt giàu bối cảnh "có tên từng người, tên nhóm"; Rule 5 (Khang chốt 20:43) cấm tên người / tên nhóm vào prompt AI; Gemini free có thể dùng dữ liệu để cải thiện sản phẩm, có thể có người đọc. **Lựa chọn:** (a) gửi tên thật; (b) **thay tên bằng mã / biệt danh trước khi gửi, code đổi lại tên khi nhận** (AI vẫn đủ bối cảnh: ai là ai, vai trò, quan hệ); (c) không gửi thông tin người. **Kat đề xuất:** (b). **Đã chốt:** (a) — Khang: "cứ ghi tên thật vào prompt AI cũng được… prompt ghi log lại nhưng xóa sau 1 ngày và log prompt mã hóa là được".
<a id="d2"></a>
### D2 — Quy tắc cụ thể của "mức hóng chuyện 1–10"
> **Nhãn:** ✅ ĐÃ CHỐT 24/11/2026 22:34 (Kat, Mode 2 — FS mục 6) · trước đó: ⏳ ĐANG CHỜ từ 24/11/2026 · **nguyên tắc ✅ ĐÃ CHỐT 24/11/2026 22:19:** quyết định lên tiếng = luật thuần code, chỉ gọi AI khi code đã quyết định nói; còn chờ bảng mức 1–10
- **Ghi nhận:** 2026-11-24 22:05. **Chặn:** T05, FS. **Lựa chọn:** bảng mức → xác suất chen vào mỗi "đợt" trò chuyện + trần lượt / ngày; ban đêm 20:00–06:00 có chen vào không (Kat đề xuất: không tự chen, vẫn trả lời khi được gọi tên). **Đã chốt:** —
<a id="d4"></a>
### D4 — Cách lưu cho "tóm tắt chat cuối ngày"
> **Nhãn:** ✅ ĐÃ CHỐT 24/11/2026 22:15 — (b) · trước đó: ⏳ ĐANG CHỜ từ 24/11/2026
- **Ghi nhận:** 2026-11-24 (Khang bổ sung lúc tổng kết). **Bắt buộc đã chốt:** mã hóa + xóa 01:00 mỗi ngày + chỉ gửi Khang. **Lựa chọn:** (a) tóm từng câu ngay khi nhận (1 lượt AI / tin nhắn); (b) lưu câu gốc đã mã hóa, gọi AI 1 lần khi Khang hỏi; (c) tóm theo đợt trò chuyện. **Kat đề xuất:** (b). **Đã chốt:** (b) — Khang: lưu nguyên văn, không tóm từng câu, chỉ gửi AI khi Khang hỏi.
<a id="d3"></a>
### D3 — Hạn chót ⏳
> **Nhãn:** ⏳ ĐANG CHỜ từ 24/11/2026
- **Ghi nhận:** 2026-11-24 20:43 ("t5 tuần sau"). Kat hiểu thứ Năm 03/12/2026; Khang chốt 21:53 **Rây trước**. **Đã chốt:** ngày cụ thể —
## A2. Đã chốt
| Ngày giờ | Quyết định | Ai chốt / cách chốt | Chi tiết |
|---|---|---|---|
| 24/11/2026 20:29 | Thứ tự làm việc: requirement → kiến trúc / bảo mật / khả thi → ATR → FS (+ BRD, TS theo cổng chặn) → code | Khang, trong chat | quy-trinh-note |
| 24/11/2026 20:32 | Code nháp giữ làm nguyên mẫu, dời vào `prototype-v0/`; stack bàn sau khi chốt requirement | Khang, trong chat | `prototype-v0/README.md` |
| 24/11/2026 20:43 | Miễn phí 100% (Gemini free) · repo private · không tên người / tên công ty trong repo, dùng biệt danh, bảng đối chiếu riêng | Khang, lượt 2 | Rule 5 |
| 24/11/2026 20:47 | Chuẩn gọi AI = tài liệu của Khang, làm theo 100% | Khang, gửi file | `CODING_STANDARDS` 6.10a |
| 24/11/2026 20:52 | Nguồn: Wise là chuẩn cho mốc; không DBS; chợ đen = Wise +0,4%; Wise hỏng → dự phòng 1 lần / ngày + ghi rõ; độ trễ không quan trọng | Khang, lượt 3 | 00-phong-van |
| 24/11/2026 21:06 | Lịch nhắn: chỉ 7 ngày cuối tháng (ngày lương = ngày cuối cùng của tháng), ngày cuối tháng luôn báo; lỗi kỹ thuật nhắn riêng Khang; tin dạng phương án 2 | Khang, lượt 4 | 00-phong-van |
| 24/11/2026 21:47 | 2 bot riêng (Rây nhóm A tỉ giá, Lũi nhóm B tin tức); cảnh báo trong 14 ngày cuối tháng, cả tăng và giảm; lấy giá mỗi 5 tiếng; cấu hình chỉ Khang; nhóm B đã đồng ý bot đọc chat; chính trị trong nước trung lập | Khang, lượt 5 | 00-phong-van |
| 24/11/2026 21:48 | Đồng ý đề xuất Kat: Vercel + Supabase, TypeScript, RSS, không chối là bot, che tên trước khi gửi AI, chat giữ 24 giờ (ADR chốt ở việc 3) | Khang: "còn các điều khác mình đồng ý" | `CLAUDE.md` Kiến trúc |
| 24/11/2026 21:53 | Nhắn thay Khang: cả 2 bot, chỉ chữ, thẻ xác nhận, `/thuhoi`; Rây làm trước | Khang, trong chat | 00-phong-van |
| 24/11/2026 22:00 | Mốc cảnh báo phương án C: 19,800 · 19,900 · 20,000 · 20,100 · 20,200 · 20,300; lệnh chỉnh mốc; lệnh bật / tắt lắng nghe (cả 2 bot); lệnh chọn xưng hô; ngưỡng `CLAUDE.md` 70 KB | Khang, trong chat | 00-phong-van (căn cứ giả lập) |
| 24/11/2026 22:05 | Lắng nghe = đọc mọi tin, tự quyết khi nào nói; mức hóng chuyện 1–10; nói có quan điểm | Khang, trong chat | D2 (chi tiết chờ) |
| 24/11/2026 22:15 | D1: prompt AI được chứa tên thật; log prompt mã hóa, giữ ≤ 1 ngày (ngoại lệ Rule 5; thay đề xuất "che tên bằng mã" lúc 21:48 → ⛔) | Khang, trong chat | `CLAUDE.md` Rule 5 |
| 24/11/2026 22:15 | D4: tóm tắt chat cuối ngày = lưu nguyên văn mã hóa, chỉ gửi AI khi Khang hỏi, xóa 01:00 mỗi ngày | Khang, trong chat | `CLAUDE.md` Mục tiêu |
| 24/11/2026 22:19 | D2 (nguyên tắc): quyết định có lên tiếng = luật thuần code, không gọi AI để suy luận; chỉ gọi AI khi đã quyết định nói | Khang, trong chat | `CLAUDE.md` Mục tiêu |
| 24/11/2026 22:19 | Tóm tắt chat cuối ngày áp cho **cả 2 bot** | Khang, trong chat | `CLAUDE.md` Mục tiêu |
| 24/11/2026 22:24 | **Mode 2** (Khang đi ngủ: "Kat làm tiếp việc đi… cái gì quan trọng nhớ hỏi mình sau") | Khang | `CLAUDE.md` |
| 24/11/2026 22:30 | **Dự án chỉ cần FS** (không BRD, không TS); ADR / KC / ATR vào phụ lục FS | Khang | `CLAUDE.md` Cổng chặn |
| 24/11/2026 22:31 | Viết FS xong thì **code luôn phần không cần Khang xác nhận** | Khang | quy-trinh-note |
| 24/11/2026 22:32 | Lượt AI: Gemini free có giới hạn (vài trăm / ngày) nhưng **đừng tiết kiệm quá** (group nhắn ít) | Khang | `CLAUDE.md`, `CODING_STANDARDS` 6.10a |
| 24/11/2026 22:34 | **FS v0.1** (Rây đầy đủ, Lũi khung): BR-01…28, F-01…10, bảng mức hóng chuyện (chốt D2 ở Mode 2), ADR-01…07, KC-01…05, bảng ATR | Kat (Mode 2 = chốt thật; Khang sửa được) | `docs/specs/02-functional-spec.md` |
| 24/11/2026 22:36 | **BR-29 / BR-30**: hỏi giá không dùng AI tìm; luôn ghi nguồn + thời điểm; "lấy giá ngay" = action gọi hàm code đọc nguồn (hỏi lại nếu thiếu nguồn, ≤ 1 lần / 5 phút) — FS bản 0.2 | Khang (yêu cầu) · Kat (chọn làm action, Mode 2) | FS mục 2, F-04 |

<a id="sb"></a>
# B. Việc dở dang
> Mã việc bỏ qua số 13 theo ý Khang.
<a id="t01"></a>
### [ ] T01 — Lũi — lĩnh vực tin nhóm B hay bàn · [tổng kết 24/11/2026] · `QĐ`
> **Nhãn:** ⏳ ĐANG CHỜ từ 24/11/2026
- **Ai / điều kiện:** Khang gửi sau (dặn ghi pending 21:47)
<a id="t02"></a>
### [ ] T02 — Lũi — tính cách (Kat mô tả kỹ, ràng buộc bằng rule + tham số) · [tổng kết 24/11/2026] · `QĐ`
> **Nhãn:** ⏳ ĐANG CHỜ từ 24/11/2026
- **Ai / điều kiện:** Khang gửi sau
<a id="t03"></a>
### [ ] T03 — Lũi — giọng văn · [tổng kết 24/11/2026] · `QĐ`
> **Nhãn:** ⏳ ĐANG CHỜ từ 24/11/2026
- **Ai / điều kiện:** Khang gửi sau
<a id="t04"></a>
### [x] T04 — Tên người / tên nhóm trong prompt AI · [tổng kết 24/11/2026] · `QĐ`
> **Nhãn:** ✅ ĐÃ XONG 24/11/2026 · trước đó: ⏳ ĐANG CHỜ từ 24/11/2026
- **Ai / điều kiện:** chờ D1
- ✅ 2026-11-24 22:15: Khang chốt D1 (a) — xem A1 D1
<a id="t05"></a>
### [x] T05 — Quy tắc mức hóng chuyện 1–10 · [tổng kết 24/11/2026] · `QĐ`
> **Nhãn:** ✅ ĐÃ XONG 24/11/2026 · trước đó: ⏳ ĐANG CHỜ từ 24/11/2026
- ✅ 2026-11-24 22:34: FS mục 6 (Mode 2)
- **Ai / điều kiện:** chờ D2
<a id="t06"></a>
### [x] T06 — Duyệt kết luận lượt 2–5 → chốt requirement · [tổng kết 24/11/2026] · `QĐ`
> **Nhãn:** ✅ ĐÃ XONG 24/11/2026 · trước đó: ⏳ ĐANG CHỜ từ 24/11/2026
- ✅ 2026-11-24 22:34: FS v0.1 chốt ở Mode 2 (Khang xem lại: T17)
- **Ai / điều kiện:** Khang
<a id="t07"></a>
### [ ] T07 — Việc 3 — kiến trúc / khả thi: kiểm chứng nhịp lịch 10–15 phút (Vercel Hobby cron chỉ 1 lần / ngày → pg_cron của Supabase?), Supabase tạm ngưng sau 1 tuần không hoạt động, quota Gemini free theo khóa, RSS các báo · [tổng kết 24/11/2026] · `VERIFY`
> **Nhãn:** ⏳ ĐANG CHỜ từ 24/11/2026
- **Ai / điều kiện:** Kat, sau khi Khang cho phép
<a id="t08"></a>
### [x] T08 — Việc 4 — bảng ATR · [tổng kết 24/11/2026] · `DOC`
> **Nhãn:** ✅ ĐÃ XONG 24/11/2026 · trước đó: ⏳ ĐANG CHỜ từ 24/11/2026
- ✅ 2026-11-24 22:34: FS phụ lục C (các dòng "Thiếu" xong dần khi code)
- **Ai / điều kiện:** Kat soạn, Khang chốt
<a id="t09"></a>
### [x] T09 — Việc 5 — BRD + FS + TS (cổng chặn) · [tổng kết 24/11/2026] · `DOC`
> **Nhãn:** ✅ ĐÃ XONG 24/11/2026 · trước đó: ⏳ ĐANG CHỜ từ 24/11/2026
- ✅ 2026-11-24 22:34: Khang chốt chỉ cần FS → FS v0.1
- **Ai / điều kiện:** Kat
<a id="t10"></a>
### [x] T10 — Barie tối thiểu + CI, **gồm barie quét tên thật** (BUG-0001) · [tổng kết 24/11/2026] · `CODE`
> **Nhãn:** ✅ ĐÃ XONG 24/11/2026 · trước đó: ⏳ ĐANG CHỜ từ 24/11/2026
- ✅ 2026-11-24 22:34: barie: tên thật, mã lỗi 2 câu, chỉ adapter gọi mạng, không bí mật gõ cứng, không thinkingConfig + CI; còn thiếu typecheck (T15), webhook / tick 401, RLS (khi code phần đó)
- **Ai / điều kiện:** Kat, sau khi chốt stack
<a id="t11"></a>
### [ ] T11 — Khang tạo 2 bot với @BotFather, tắt Group Privacy (`/setprivacy` → Disable), không dán token vào chat · [tổng kết 24/11/2026] · `VERIFY`
> **Nhãn:** ⏳ ĐANG CHỜ từ 24/11/2026
- **Ai / điều kiện:** Khang, tới bước cài đặt
<a id="t12"></a>
### [ ] T12 — Nguồn Wise không chính thức → ADR + nguồn dự phòng · [tổng kết 24/11/2026] · `DOC`
> **Nhãn:** ⏳ ĐANG CHỜ từ 24/11/2026
- **Ai / điều kiện:** Kat

<a id="t14"></a>
### [ ] T14 — Khang tạo dịch vụ: project Supabase, project Vercel, khóa Gemini (Google AI Studio), 2 bot @BotFather — cần trước khi nối dịch vụ thật · [tổng kết 24/11/2026] · `VERIFY`
> **Nhãn:** ⏳ ĐANG CHỜ từ 24/11/2026
- **Ai / điều kiện:** Khang (Kat soạn hướng dẫn cài đặt)
<a id="t15"></a>
### [ ] T15 — Duyệt cài gói `typescript` (chỉ dùng lúc phát triển) cho barie typecheck — checklist 5 ý · [tổng kết 24/11/2026] · `QĐ`
> **Nhãn:** ⏳ ĐANG CHỜ từ 24/11/2026
- **Ai / điều kiện:** Khang
<a id="t16"></a>
### [ ] T16 — Code đợt 2: AI adapter (100% tài liệu của Khang), Telegram adapter + webhook, repository Supabase + migration (RLS), `/api/tick`, dọn dẹp 01:00, lệnh của Khang — làm với adapter giả trước · [tổng kết 24/11/2026] · `CODE`
> **Nhãn:** ⏳ ĐANG CHỜ từ 24/11/2026
- **Ai / điều kiện:** Kat
<a id="t17"></a>
### [ ] T17 — Khang xem lại FS v0.1 (Mode 2 đã chốt; sửa chỗ nào thì Kat cập nhật) · [tổng kết 24/11/2026] · `QĐ`
> **Nhãn:** ⏳ ĐANG CHỜ từ 24/11/2026
- **Ai / điều kiện:** Khang

<a id="sc"></a>
# C. Mục tiêu, triết lý, kiến trúc
<a id="c-muc-tieu"></a>
## C1. Mục tiêu
> **Nhãn:** 🟢 HIỆU LỰC từ 24/11/2026 (tạm, chờ T06) — chi tiết `docs/specs/00-phong-van.md` lượt 1–5, tóm tắt ở `CLAUDE.md` mục Mục tiêu
Hai bot Telegram riêng, chung 1 bộ code, trực 24/24, miễn phí 100%: **Rây** (nhóm A, tỉ giá SGD→VND) và **Lũi** (nhóm B, tin tức, tính cách đặc biệt). Rây ưu tiên làm trước.

#### 🔄 Thay đổi — 2026-11-23 14:47 (giờ VN) — Kat tự đoán mục tiêu khi chưa phỏng vấn
- **Trước:** repo trống. **Sau:** Kat đoán "1 bot đăng tỉ giá mỗi sáng + lệnh", viết code luôn. **Lý do / ai:** Kat (sai quy trình). **Ảnh hưởng:** nguyên mẫu v0. > Nhãn: ⛔ HẾT HIỆU LỰC từ 24/11/2026 — thay bởi các thay đổi dưới.
#### 🔄 Thay đổi — 2026-11-24 21:06 (giờ VN) — Bỏ "đăng mỗi sáng", chỉ nhắn 7 ngày cuối tháng
- **Trước:** bản tin mỗi sáng như Mít. **Sau:** chỉ 7 ngày cuối tháng, ngày cuối tháng luôn báo, còn lại im lặng. **Lý do / ai:** Khang (lượt 4). **Ảnh hưởng:** `CLAUDE.md` Mục tiêu, Quy tắc nghiệp vụ.
#### 🔄 Thay đổi — 2026-11-24 21:34 (giờ VN) — Từ 1 bot thành 2 bot (Rây + Lũi)
- **Trước:** 1 bot tỉ giá. **Sau:** Rây (tỉ giá, nhóm A) + Lũi (tin tức, nhóm B); lắng nghe, nhắn thay, mức hóng chuyện, xưng hô, prompt giàu bối cảnh (21:47–22:05). **Lý do / ai:** Khang (lượt 5 — kể tự do). **Ảnh hưởng:** `CLAUDE.md` Mục tiêu sửa đè; STATUS.

<a id="c-kien-truc"></a>
## C2. Kiến trúc
> **Nhãn:** ⏳ ĐANG CHỜ từ 24/11/2026 — hướng đã đồng ý (21:48): Vercel Hobby + Supabase + Telegram webhook + TypeScript + Gemini free + RSS; **ADR chốt ở việc 3 (T07)** sau kiểm chứng.

<a id="sd"></a>
# D. Nhật ký theo module
<a id="d-prototype"></a>
## D1. Nguyên mẫu v0 (`prototype-v0/`)
> **Nhãn:** ⛔ HẾT HIỆU LỰC từ 24/11/2026 — đóng băng, không phải code chính thức
#### 🔄 Thay đổi — 2026-11-23 14:47 / 17:36 (giờ VN) — Kat viết nguyên mẫu trước khi có spec
- Python 3.12, GitHub Actions (daily / check / poll), nguồn Wise / VCB / VPBank, AI = Claude API, trạng thái ở nhánh `bot-state`. 37 test đạt. Chưa thử Telegram / Claude / Actions thật. Vi phạm cổng chặn.
#### 🔄 Thay đổi — 2026-11-24 20:32 (giờ VN) — Đóng băng, dời vào `prototype-v0/`
- **Lý do / ai:** Khang. Workflow dời ra khỏi `.github/workflows/` để không tự chạy khi merge. Lấy lại cấu trúc cũ: commit `41c0108`. 20:43: chỉ đổi chữ / chú thích (tên thật → biệt danh), không đổi logic; 37 test vẫn đạt.

<a id="se"></a>
# E. Nhật ký theo chủ đề / đợt audit
<a id="e-quy-trinh"></a>
## E1. Bộ quy tắc dự án
> **Nhãn:** 🟢 HIỆU LỰC từ 24/11/2026
#### 🔄 Thay đổi — 2026-11-24 20:27 (giờ VN) — Cài bộ quy tắc bản tạm v0.1
- `CLAUDE.md` (Mode 1), STATUS, history, sổ quy trình, bugs, QUY_TAC_GHI_CHEP (mục 3–5), CODING_STANDARDS (mục 6–8), hook đồng hồ ngữ cảnh (thử đủ 3 ngưỡng). 20:47: thêm 6.10a (chuẩn gọi AI của Khang) + Bẫy 42–44. 22:00: ngưỡng `CLAUDE.md` = 70 KB.
<a id="e-rieng-tu"></a>
## E2. Riêng tư
> **Nhãn:** 🟢 HIỆU LỰC từ 24/11/2026
#### 🔄 Thay đổi — 2026-11-24 20:43 → 21:50 (giờ VN) — Biệt danh thay tên thật
- Tên người, tên công ty, tên group → biệt danh (Mít, Ổi, Xoài, Mận, công ty SGP, nhóm A, nhóm B); bảng đối chiếu chỉ ở `docs/rieng-tu/`; tài liệu gọi AI của Khang cũng ở đó (có thông tin riêng). Sự cố: [BUG-0001](bugs/BUG-0001-lo-ten-that-nhom-B.md).
<a id="e-code-dot-1"></a>
## E4. Code đợt 1 (Mode 2)
> **Nhãn:** 🟢 HIỆU LỰC từ 24/11/2026
#### 🔄 Thay đổi — 2026-11-24 22:34 (giờ VN) — Logic thuần của Rây + barie + CI
- **Trước:** chưa có code chính thức. **Sau:** config, mã lỗi, vn-time, crypto (AES-256-GCM), services payday / alert / rate / chattiness, adapter nguồn tỉ giá, 35 test (BR trong tên test), barie, CI. Không thư viện ngoài. **Lý do / ai:** Khang ("code được gì trước mà không cần Khang confirm thì code"). **Audit:** lần 1 — 1 lỗi (nguồn dự phòng nhận giá ≤ 0 → chia 0 khi quy đổi) đã sửa + test; lần 2 — 0 lỗi. **Bug nhỏ test bắt được:** cảnh báo chờ qua giờ nghỉ mà giá quay về chỗ cũ lại bị báo thành "cắt mốc chiều ngược" → sửa bằng vị trí gốc (originBand).
<a id="e-gia-lap-moc"></a>
## E3. Giả lập mốc cảnh báo
> **Nhãn:** ✅ ĐÃ CHỐT 24/11/2026 (phương án C)
- 2026-11-24 21:53: dữ liệu Wise theo giờ 30 ngày, đúng rule đã chốt. Nháp: 7 cảnh báo (4 lần qua lại 19,950); C (cách đều 100): 3 cảnh báo đúng 3 sự kiện. Chi tiết: `00-phong-van.md` "Căn cứ mốc".

<a id="sf"></a>
# F. Bài học
<a id="sc01"></a>
**1. Cài bộ quy tắc và phỏng vấn TRƯỚC dòng code đầu tiên** *(phát hiện 2026-11-24)*
Case: chỉ có 9 ảnh, Kat hỏi 2 câu rồi viết ~980 dòng code; yêu cầu thật (2 bot, lịch cuối tháng) khác hẳn → Bài học: đầu vào mơ hồ = hỏi mục tiêu; cổng chặn không có ngoại lệ.
<a id="sc02"></a>
**2. "Doable không?" là câu hỏi, không phải lệnh làm** *(phát hiện 2026-11-24)*
Case: Khang hỏi khả thi, Kat code luôn → Bài học: Rule 6 — câu hỏi thì trả lời.
<a id="sc03"></a>
**3. Cho người dùng một lượt "kể tự do" sớm** *(phát hiện 2026-11-24)*
Case: lượt 1–4 hỏi theo khung, tới lượt 5 Khang kể tự do mới lộ phạm vi thật (2 bot) → Bài học: lượt kể tự do ngay sau lượt mục tiêu; sau mỗi lượt đối chiếu yêu cầu lượt trước.
<a id="sc04"></a>
**4. Luật riêng tư phải là barie, không chỉ biển báo** *(phát hiện 2026-11-24)*
Case: [BUG-0001](bugs/BUG-0001-lo-ten-that-nhom-B.md) — có Rule 5 vẫn lỡ ghi tên group → Bài học: luật máy kiểm được → test chặn trước commit.
<a id="sc05"></a>
**5. Tham số "ổn không?" → trả lời bằng giả lập trên dữ liệu thật** *(phát hiện 2026-11-24)*
Case: mốc 50 đ nghe hợp lý nhưng giả lập cho thấy báo qua lại liên tục → Bài học: chạy đúng rule đã chốt trên dữ liệu thật, ghi căn cứ.
<a id="sc06"></a>
**6. Tư vấn nền tảng miễn phí: tra giới hạn hiện hành** *(phát hiện 2026-11-24)*
Case: Vercel Hobby cron chỉ 1 lần / ngày, Gemini free dùng dữ liệu để cải thiện sản phẩm → Bài học: tra tài liệu chính thức trước khi đề xuất, ghi nguồn.

<a id="sg"></a>
# G. Báo cáo tổng kết theo phiên (mới nhất ở cuối)
### 2026-11-24 (tổng kết lúc 22:07)
**Làm gì:** cài bộ quy tắc của Khang; đóng băng code nháp; phỏng vấn lượt 1–5 → yêu cầu thật là 2 bot (Rây, Lũi); chốt ràng buộc, nguồn, lịch, mốc cảnh báo (có giả lập), riêng tư.
**Hoàn thành:**
- Bộ quy tắc v0.1 cài đủ (hook thử 3 ngưỡng đạt).
- Nguyên mẫu dời vào `prototype-v0/`, workflow không tự chạy; 37 test vẫn đạt sau khi đổi tên thật → biệt danh.
- Tài liệu gọi AI của Khang lưu nguyên văn (so `cmp` khớp) + thành chuẩn 6.10a. Khang gửi lại 2 lần: 1 bản giống hệt, 1 bản cũ hơn (443 dòng đầu giống hệt, thiếu phần "cơ chế gọi AI") → không đổi gì.
- Biên bản phỏng vấn lượt 1–5 + căn cứ mốc; 11 quyết định ở A2.
**Dang dở:** T01–T03, T05 (D2), T06–T12. **Tổng kết bổ sung 22:15:** Khang chốt D1 (tên thật vào prompt AI được, log prompt mã hóa ≤ 1 ngày) và D4 (lưu nguyên văn mã hóa, chỉ gửi AI khi Khang hỏi) (Lũi: lĩnh vực, tính cách, giọng văn; D1 tên trong prompt; D2 mức hóng chuyện; việc 3–5; barie; tạo bot).
**Phát hiện hay:** Vercel Hobby cron chỉ 1 lần / ngày (cần nhịp lịch khác); Gemini free có thể dùng dữ liệu và có người đọc; Wise chỉ cho tải tối đa 30 ngày theo giờ; mốc cách 50 đ gây báo qua lại. BUG-0001 (riêng tư, **tái phát 2 lần** — lần 2 bắt được nhờ rà tên trước khi tạo PR). Bug nhỏ test bắt được (nguyên mẫu, 23/11): bộ kiểm lời AI từ chối nhầm "1 xíu" → đã sửa.
**Trạng thái cuối phiên:** chưa có code chính thức; nhánh `claude/new-session-5jra1l`; môi trường cloud `auto-exchange-rate-bot` (5 host nguồn tỉ giá). Chưa có CI (barie chờ chốt stack).
**Việc nên làm tiếp:** T04 + T05 (Khang chốt D1, D2) → T06 → T07 (việc 3) → T08 → T09; song song T01–T03 khi Khang gửi.
**Kích thước CLAUDE.md:** 21,4 KB

<a id="sh"></a>
# H. Phụ lục

<a id="si"></a>
# I. Hồ sơ bug
Xem `docs/bugs/README.md`.
- [BUG-0001](bugs/BUG-0001-lo-ten-that-nhom-B.md) — 24/11/2026 — Lỡ ghi tên thật của group vào tài liệu (2 lần, tái phát) — ✅

### 2026-11-24 (tổng kết lúc 22:34) — Mode 2, Khang vắng
**Làm gì:** Khang chốt "chỉ cần FS", Mode 2, quy tắc lượt AI; Kat viết FS v0.1, kiểm chứng (KC), code đợt 1.
**Hoàn thành:**
- FS v0.1: Rây đầy đủ (BR-01…28, F-01…10, mã lỗi, khối prompt, bảng mức hóng chuyện, đường đi), Lũi khung; phụ lục ADR-01…07, KC-01…05, ATR.
- Code đợt 1 + barie + CI: `npm run check` → 35 / 35 đạt.
**Dang dở:** T01–T03 (Lũi), T07 (KC-01 thử trên project thật), T11, T12, T14–T17.
**Phát hiện hay:** Vercel Hobby cron 1 lần / ngày → dùng Supabase Cron; hạn mức Gemini free tính **theo dự án**, không theo khóa; Node 22 chạy TypeScript trực tiếp → không cần thư viện cho test. Bug nhỏ test bắt được: cảnh báo chờ bị đảo chiều (đã sửa).
**Trạng thái cuối phiên:** nhánh `claude/new-session-5jra1l` (làm lại từ `main` sau khi mợt PR #1); PR #2 mở; chưa nối dịch vụ thật.
**Việc nên làm tiếp:** T17 (Khang xem FS) → T14 (Khang tạo dịch vụ) → T16 (code đợt 2) ; T15 ; Lũi khi có T01–T03.
**Kích thước CLAUDE.md:** 23,2 KB
**Bổ sung sau tổng kết (22:36):** Khang thêm lưu ý hỏi giá → FS 0.2 (BR-29, BR-30) + hàm `describeRateSource` + test; push vào PR #2.
