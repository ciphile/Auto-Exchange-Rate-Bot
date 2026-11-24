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
| 1 | Ngân sách | **Miễn phí hoàn toàn.** AI = **Gemini bản miễn phí**. Tài liệu đính kèm Khang gửi 24/11/2026 (đã lưu: `docs/rieng-tu/Cach_viet_prompt_xac_dinh_action_v1.1_22_Nov_2026.md`) = **chuẩn gọi AI, Kat phải làm theo 100%** (đã vào `CODING_STANDARDS` mục 6.10a) |
| 2 | Repo public hay private | **Private** |
| 3 | Dữ liệu tuyệt đối không vào repo / prompt AI | **Tên từng người và tên công ty.** Dùng **biệt danh** thay thế; tên thật chỉ ở 1 file riêng (`docs/rieng-tu/BANG-TEN-THAT.md`), **xóa trước khi public** (hoặc chuyển sang kho cloud) |
| 4 | Phase 1 gồm gì (bản tin sáng + cảnh báo mốc; lệnh trong group để phase 2?) | **Bàn sau** |
| 5 | Hạn chót | "**t5 tuần sau**" → Kat hiểu là **thứ Năm 03/12/2026** (còn 9 ngày từ 24/11) — chờ Khang xác nhận |

**Kết luận lượt 2 (Kat tóm tắt, chờ Khang duyệt):**
- Ràng buộc cứng: **0 đồng** (không dịch vụ trả phí), repo **private**, **không tên thật / tên công ty** ở bất kỳ đâu ngoài file đối chiếu, hạn chót **03/12/2026**.
- Phase 1 chưa chốt.
- Hệ quả Kat ghi nhận cho bước kiến trúc (chưa quyết gì): (a) nguyên mẫu dùng Claude API → bản chính thức dùng Gemini free; (b) skill 6.10: Gemini free **cấm `thinkingConfig` và công cụ tra web** (lỗi 400); (c) cần **kiểm chứng**: giới hạn gói free của Gemini, điều khoản dùng dữ liệu của gói free (có thể Google dùng prompt gói free để cải thiện sản phẩm) — liên quan ATR-12; (d) repo private + GitHub Actions → có hạn mức phút miễn phí hàng tháng, cần tính lại tần suất chạy (nguyên mẫu poll 5 phút sẽ không vừa).

## Lượt 3 — Dữ liệu nguồn (Khang trả lời 24/11/2026) — ⏳ chờ Khang duyệt kết luận

| # | Câu hỏi | Khang trả lời |
|---|---|---|
| 1 | Nguồn Wise là đường dẫn công khai **không chính thức**; nếu hỏng thì sao | **(a)** dùng nguồn dự phòng cập nhật 1 lần / ngày và **ghi rõ trong tin** |
| 2 | Có cần DBS không | **Không cần** |
| 3 | Độ trễ chấp nhận được của cảnh báo | **Không cần chính xác giờ** (độ trễ không quan trọng) |
| 4 | Giá chợ đen thật để hiệu chỉnh | **(b)** chỉ dùng mức mặc định **Wise +0,4%**; không cần dữ liệu thật |
| 5 | Nguồn "chuẩn" để so với mốc | **Wise** |

**Kết luận lượt 3 (Kat tóm tắt, chờ Khang duyệt):** mốc cảnh báo so với **giá Wise (mid-market)**; nguồn trong bản tin: Wise, VCB, VPBank (không DBS); chợ đen = Wise × 1,004 (**ước tính**, không có cơ chế học từ giá thật → lệnh báo giá đổi thật không còn cần thiết); Wise hỏng → nguồn dự phòng 1 lần / ngày, ghi rõ trong tin; tần suất kiểm không quan trọng → chốt ở TS theo hạn mức gói miễn phí.

## Lượt 4 — Bot làm gì (Khang trả lời 24/11/2026) — ⏳ chờ Khang nói thêm + duyệt kết luận

| # | Nhóm | Khang trả lời (nguyên ý) |
|---|---|---|
| A | Hình dạng bản tin | **Phương án 2** (gọn, có dòng ngân hàng NH mua). Chưa trả lời: giờ đăng, đăng cuối tuần hay không — sẽ do lịch mới bên dưới chi phối |
| B | Tần suất + cảnh báo | "Bot **không cần nhắn mỗi ngày**. Ngày nhận lương là **ngày cuối cùng của tháng**. Trong vòng **1 tuần trước** [Khang gõ "ngày cuối tuần của tháng" — Kat hiểu là *ngày cuối tháng*, chờ xác nhận] bot chỉ cần nhắn **2–3 lần** để **cảnh báo tỉ giá** và **báo tỉ giá cách ngày**. Các ngày còn lại trong tháng bot **im lặng** là đủ." |
| C | Nhắc cuối tháng | Ngày cuối tháng (ngày nhận lương): bot **luôn báo tỉ giá, cao hay thấp đều báo** |
| D | Báo lỗi kỹ thuật | **Nhắn riêng cho Khang** |
| E | Phase 1 | "**Tất cả tính năng về tỉ giá**" (Kat hiểu: mọi tính năng liên quan tỉ giá, không chỉ bản tin + cảnh báo; Khang sẽ nói chi tiết ở bước tới) |

**Chưa được trả lời trực tiếp (chờ Khang nói về bot):** danh sách mốc (nháp 6 mốc, 20,000 và 20,100 là hai mốc chính) · chiều báo (giảm / tăng) · "không báo lặp" khi giá sát mốc · giờ im lặng · số tin tối đa / ngày · cảnh báo kiểu khác.

**Kết luận lượt 4 (Kat tóm tắt, chờ Khang duyệt):**
- **Thay đổi lớn so với lượt 1:** bot **không còn đăng mỗi sáng**. Chỉ hoạt động trong **7 ngày cuối tháng**: nhắn 2–3 lần (cảnh báo + báo cách ngày), và **ngày cuối tháng luôn báo**. Các ngày khác trong tháng: **im lặng**.
- Hình dạng tin theo phương án 2. Lỗi kỹ thuật chỉ nhắn riêng Khang.
- Điểm Kat cần Khang làm rõ **sau khi Khang nói xong về bot** (chưa hỏi): (i) "1 tuần" = 7 ngày kể cả ngày cuối tháng hay 7 ngày trước đó; (ii) "cách ngày" tính từ ngày nào; (iii) ngoài khung 7 ngày, giá cắt mốc 20,000 / 20,100 có phá lệ im lặng không; (iv) 2–3 lần có gồm tin cuối tháng không.

## Các lượt còn lại (chưa hỏi)
- **Lượt 5 — Người dùng & quyền:** ai ra lệnh được cho bot, ai báo giá đổi thật, thiết bị.
- **Lượt 6 — Đầu ra & giọng văn:** giờ đăng, độ dài, mức hài hước, câu mẫu của Mít nào được dùng, bot xưng hô thế nào trong group.
