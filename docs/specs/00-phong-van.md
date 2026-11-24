# Phỏng vấn SME — Auto-Exchange-Rate-Bot

> **Bước 1 của quy trình 5 bước — ĐANG DỞ.** Nguồn: lời Khang trong chat 23–24/11/2026 + 9 ảnh chụp group Telegram.
> Kat **chưa hỏi hết**. Hỏi theo lượt, mỗi lượt 1 nhóm; cuối lượt Kat tóm tắt "kết luận lượt N" chờ Khang duyệt.
> Dữ liệu riêng (tên người, tên công ty, số điện thoại, tài khoản) **không** ghi ở đây (Rule 5): dùng **biệt danh** — "Mít" là người làm mẫu giọng văn; bảng đối chiếu tên thật ở `docs/rieng-tu/BANG-TEN-THAT.md`.

## Lượt 1 — Mục tiêu & bối cảnh (Kat ghi lại từ lời Khang) — ✅ ĐÃ CHỐT 24/11/2026 (Khang: "vẫn hiệu lực")

**Bối cảnh (Khang kể):** nhóm đồng nghiệp của Khang ngồi ở VN, làm remote cho công ty ở Singapore (SGP). Công ty trả lương bằng **SGD qua Wise**. Mọi người cần đổi SGD → VND, chủ yếu qua **chợ đen** (nhờ dịch vụ / tiệm đổi). Trong group Telegram (5 thành viên) mọi người hay than khi tỉ giá lên xuống.

**Điều Khang muốn:** 1 bot Telegram vào group đó, như 1 "đồng nghiệp tự động": nhắc / cảnh báo khi tỉ giá vượt ngưỡng, tự nhắn vào group, gần như **mỗi ngày**; viết theo **giọng Mít**; có gọi AI để nhận xét tỉ giá và soạn câu cho giống người nhất có thể.

**Khang đã trả lời (23–24/11/2026):**
| # | Nội dung | Ghi chú |
|---|---|---|
| 1 | Ngưỡng cảnh báo: **Kat quyết theo đoạn chat** | Kat đề xuất ở mục "Quan sát" bên dưới — chờ Khang duyệt |
| 2 | Nhịp báo: **như Mít hay đăng** (bản tin sáng "Giá … hôm nay dd.mm.yyyy: …") | — |
| 3 | Chênh lệch chợ đen so với Wise: **không có số chính xác**; Kat chọn nguồn / cách ước tính tốt nhất | Nhóm có nhắc VCB, DBS; Khang nhắc thêm VPBank |
| 4 | Nhóm **đồng ý** cho bot vào; Khang chịu duyệt câu mẫu | — |
| 5 | Muốn gửi **nhiều nguồn**: Wise, VCB, VPBank; giá Wise ghi rõ bán hay mua | Wise chỉ có mid-market (không có mua / bán riêng) |
| 6 | (Lúc làm nháp) chọn: lệnh trong group + bản tin sáng; Python + GitHub Actions | Chọn trước khi có quy trình spec → **xem lại** ở bước kiến trúc |

**Quan sát của Kat từ ảnh chụp (để Khang đối chiếu — sai chỗ nào sửa):**
- Wise app: 1 SGD ≈ 20,000.40 VND; biểu đồ từ 22/10 dao động khoảng 19,910 – 20,264. Ảnh khác: ≈ 20,074.6, dao động 20,074.6 – 20,341.2.
- Chợ đen: "tầm 20,000 – 20,100" khi Wise ≈ 20,000; có lần đổi được 20,100.
- Mốc nhóm hay nhắc: **20,100** ("rớt xuống < 20,100"), **20,000** ("sắp rớt dưới 20.000đ"), dự đoán cuối tháng quanh **19,990 – 20,010**.
- Nguồn nhóm đang so sánh bằng tay: Wise app, VCB (mua tiền mặt 19,518.69 · mua chuyển khoản 19,715.85 · bán 20,388.82), DBS (≈ 19,607.8), PayNow / Timo, chợ đen.
- **Lương về cuối tháng** → tỉ giá cuối tháng quan trọng nhất.
- Người đăng bản tin giá hằng ngày thường nhắn vào buổi sáng (khoảng 9:15 – 9:50 giờ VN).

**Kết luận lượt 1 (✅ ĐÃ CHỐT 24/11/2026):** bot phục vụ nhóm 5 người đổi SGD→VND; đầu ra chính = bản tin sáng + cảnh báo khi vượt mốc (20,000 / 20,100 là hai mốc "đau" nhất); đo thành công bằng gì (vd: nhóm đỡ phải dán ảnh Wise / VCB thủ công) — **chờ Khang xác nhận**.

## Lượt 2 — Ràng buộc (Khang trả lời 24/11/2026) — ⏳ chờ Khang duyệt kết luận

| # | Câu hỏi | Khang trả lời |
|---|---|---|
| 1 | Ngân sách | **Miễn phí hoàn toàn.** AI = **Gemini bản miễn phí**. Khang nhắc "xem đính kèm" nhưng **Kat chưa nhận được đính kèm** → chờ Khang gửi lại |
| 2 | Repo public hay private | **Private** |
| 3 | Dữ liệu tuyệt đối không vào repo / prompt AI | **Tên từng người và tên công ty.** Dùng **biệt danh** thay thế; tên thật chỉ ở 1 file riêng (`docs/rieng-tu/BANG-TEN-THAT.md`), **xóa trước khi public** (hoặc chuyển sang kho cloud) |
| 4 | Phase 1 gồm gì (bản tin sáng + cảnh báo mốc; lệnh trong group để phase 2?) | **Bàn sau** |
| 5 | Hạn chót | "**t5 tuần sau**" → Kat hiểu là **thứ Năm 03/12/2026** (còn 9 ngày từ 24/11) — chờ Khang xác nhận |

**Kết luận lượt 2 (Kat tóm tắt, chờ Khang duyệt):**
- Ràng buộc cứng: **0 đồng** (không dịch vụ trả phí), repo **private**, **không tên thật / tên công ty** ở bất kỳ đâu ngoài file đối chiếu, hạn chót **03/12/2026**.
- Phase 1 chưa chốt.
- Hệ quả Kat ghi nhận cho bước kiến trúc (chưa quyết gì): (a) nguyên mẫu dùng Claude API → bản chính thức dùng Gemini free; (b) skill 6.10: Gemini free **cấm `thinkingConfig` và công cụ tra web** (lỗi 400); (c) cần **kiểm chứng**: giới hạn gói free của Gemini, điều khoản dùng dữ liệu của gói free (có thể Google dùng prompt gói free để cải thiện sản phẩm) — liên quan ATR-12; (d) repo private + GitHub Actions → có hạn mức phút miễn phí hàng tháng, cần tính lại tần suất chạy (nguyên mẫu poll 5 phút sẽ không vừa).

## Các lượt còn lại (chưa hỏi)
- **Lượt 3 — Dữ liệu nguồn:** nguồn nào là "chuẩn" của nhóm, độ trễ chấp nhận được, có dữ liệu chợ đen thật để hiệu chỉnh không.
- **Lượt 4 — Quy tắc nghiệp vụ:** mốc cảnh báo chính thức, giờ im lặng, số tin tối đa / ngày, số nào phải khớp số nào, ngày lương, ai chốt.
- **Lượt 5 — Người dùng & quyền:** ai ra lệnh được cho bot, ai báo giá đổi thật, thiết bị.
- **Lượt 6 — Đầu ra & giọng văn:** giờ đăng, độ dài, mức hài hước, câu mẫu của Mít nào được dùng, bot xưng hô thế nào trong group.
