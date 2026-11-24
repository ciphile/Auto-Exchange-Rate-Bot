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

## Lượt 5 — Khang kể về bot (24/11/2026) — ⏳ chờ Khang nói thêm (tính cách Lũi) + duyệt
> Ghi theo ý Khang, tên người đã đổi sang biệt danh (Mít, Ổi, Xoài, Mận). "Ngày cuối tuần của tháng" ở lượt 4 = **ngày cuối cùng của tháng** (Khang xác nhận).

**Hai group, hai bot:**
- **Nhóm A** (đồng nghiệp thân: lương, thuế, chuyện công ty) → bot **Rây**, chuyên tỉ giá.
- **Nhóm B** (rộng hơn, có đồng nghiệp cũ; không bàn lương / thuế / tỉ giá, bàn thời sự tin tức) → bot **Lũi**, chuyên tin tức.
- Cả hai **trực 24/24**, **miễn phí 100%**. Máy cá nhân của Khang tắt sau 23:00 → không dùng được làm chỗ chạy chính. Khang hỏi: Vercel? Python hay ngôn ngữ nào?

**Rây (nhóm A):**
1. Người dùng nhắn **ngôn ngữ tự nhiên** (hoặc lệnh `/`) → Rây trả lời đúng. Ví dụ: "Rây ơi tỉ giá hôm nay thế nào?", "Tỉ giá hôm nay cao hay thấp?", "cập nhật đi Rây?", "giá hôm nay sao rồi".
2. Rây có **danh sách action cố định**; câu tự nhiên → AI map đúng action → trả lời bằng lời tự nhiên **đúng phong cách** (theo tài liệu chuẩn gọi AI của Khang).
3. **Số liệu tỉ giá: app tự lấy theo lịch cố định** (đầu ngày mỗi sáng), lưu cache, **có dọn dẹp**. Khi nói về tỉ giá, AI **chỉ soạn lời**, không đi tìm tỉ giá.
4. **Tuần lương:** lương nhận **ngày cuối cùng của tháng**; trong 1 tuần đó Rây **tự gửi tỉ giá** kèm nhận xét tự nhiên (như Mít hay nói), gần như mỗi ngày 1 lần hoặc nói rồi nghỉ 1 ngày rồi nói tiếp. **Giờ nói ngẫu nhiên**, không cố định (lúc 11:00, lúc 14:00…), **trừ 20:00–06:00**.
5. **Cảnh báo vượt ngưỡng: nhắn ngay lúc vượt** — tối đa **4 lần / ngày**, mỗi lần **cách nhau ≥ 3 tiếng**; rơi vào 20:00–06:00 thì **chờ tới sau giờ nghỉ**. Lời cảnh báo phải **than y như cách Xoài, Ổi, Mít than** khi tỉ giá không như ý — **không máy móc**, để người đọc cảm giác Rây là đồng nghiệp than thở như người thật.
6. Báo tỉ giá thì **như cách Mít báo**, không theo khuôn mẫu máy móc.
7. **Tán gẫu**: tỉ giá, kinh tế, giá vàng, coin, tài chính vĩ mô, kinh tế chính trị (vd "vì sao tỉ giá đi xuống", "Trump có làm gì không", "vì sao SGD chênh nhiều so với USD", "dự đoán tháng sau", "tháng sau có chiến tranh không") → AI trả lời bằng lời tự nhiên.
8. **Khang điều chỉnh được**: phong cách nói; **tâm trạng** (vui, cáu, "bị bồ đá" nói cộc lốc, muốn nói nhiều…); ngày giờ hoạt động; giờ nghỉ (20:00–06:00); nguồn tỉ giá (vd chỉ VCB hoặc chỉ Wise).
9. **Mất nguồn tỉ giá / rớt mạng → báo Khang**, ghi **mã lỗi + diễn giải** cho Khang hiểu; **không nhắn gì vào group**.
10. Nói như người, không khuôn mẫu, **nhưng theo rule**: cảnh báo khi nào, báo khi nào đều có rule cài sẵn. **Lịch lấy tỉ giá cố định; lúc nhắn người dùng ngẫu nhiên** (trừ cảnh báo).
11. Kat tư vấn thêm tính năng nếu hay, **tối giản**.

**Lũi (nhóm B):**
1. Khang gửi các **lĩnh vực tin** nhóm hay bàn (không phải tin nào cũng cần).
2. Lũi **cào tin** từ báo chính thống (Dân trí, Tuổi Trẻ…; Khang gợi ý có thể lấy từ bot Telegram của báo) theo **lịch cố định 2 lần / ngày** (vd 06:00 và 12:00), lưu cache, **dọn dẹp chắc chắn 100%** sau một thời gian.
3. Tới **thời điểm ngẫu nhiên** (trừ 20:00–06:00) Lũi nhắn **tin nổi bật**; tin được **xếp hạng theo rule** (mức nóng / hot, mức nghiêm trọng / to lớn); **Khang chỉnh ngưỡng** để Lũi chỉ nói tin thuộc mức nhất định.
4. Khang chỉnh **phong cách nói, ngày giờ được / không được nói**, như Rây.
5. Lũi **bàn chuyện chính trường**, có **tính cách thật đặc biệt** — **Khang sẽ mô tả sau**; Kat phải mô tả tính cách thật kỹ, ràng buộc bằng **rule + tham số** để AI nói đúng 100% phong cách đó.
6. Tính năng **bật / tắt bởi Khang**: Lũi **đọc chat trong group** và tham gia như một người bạn (thời sự, AI, chính trị, Trump, bất động sản, gái xinh…).
7. Nhóm B có Mít, Ổi, Xoài, Khang, Mận và vài đồng nghiệp khác.
8. Kat tư vấn thêm tính năng nếu hay, **tối giản**.

### Lượt 5 — trả lời bổ sung (Khang, 24/11/2026)
| # | Câu hỏi | Khang trả lời |
|---|---|---|
| 1 | 1 bot hay 2 bot | **2 bot riêng** (Rây, Lũi), Kat đề xuất chung 1 bộ code |
| 2 | Cảnh báo vượt ngưỡng áp dụng khi nào | **2 tuần trước ngày nhận lương** (ngày cuối cùng của tháng). Ngoài khung → im lặng |
| 3 | Chiều cảnh báo | **Cả giảm và tăng** |
| 4 | Lấy giá mấy lần / ngày để bắt cảnh báo | **Mỗi 5 tiếng** (lịch cố định) |
| 5 | Nhóm B đồng ý bot đọc chat + gửi Google | **Đã đồng ý** |
| 6 | Lệnh chỉnh cấu hình | **Chỉ Khang** |
| 7 | Lĩnh vực tin, tính cách, giọng văn của Lũi | **Khang gửi sau** → đã ghi pending ở `docs/STATUS.md` |
| — | Tên nhóm | nhóm A = group lương / thuế; nhóm B = group thời sự rộng hơn (tên thật ở file riêng) |
| — | Chính trị trong nước | **Trung lập** (đồng ý đề xuất của Kat) |
| — | Giới hạn lượt AI | Khang: không đáng lo, Rây im lặng phần lớn tháng |
| — | Rây dùng chung kho tin Lũi làm bối cảnh trả lời câu vĩ mô | Đồng ý (Kat đề xuất) |
| — | Các đề xuất còn lại của Kat (tin 24/11/2026 ~21:35) | **Khang: "còn các điều khác mình đồng ý"** → gồm: 2 bot chung 1 bộ code · chỗ chạy **Vercel + Supabase** (phương án A, chốt bằng ADR ở việc 3 sau khi kiểm chứng) · ngôn ngữ **TypeScript** (Kat đề xuất) · Rây bị hỏi thẳng "là bot à" thì **không chối** · trước khi gửi AI **thay tên người bằng biệt danh**, chỉ gửi vài tin gần nhất, **tin chat xóa sau 24 giờ** · Lũi dùng **RSS** của báo, chỉ đăng tiêu đề + 1–2 câu tóm tắt + link · câu dự đoán phải nói rõ là đoán |
| — | **Tính năng mới: bot nhắn thay Khang** (Khang bổ sung 24/11/2026) | Khang gõ 1 lệnh, vd kêu Lũi nhắn "mọi người thôi đi ăn cơm đi" → Lũi nhắn **đúng y chang câu đó** vào group, **không nói gì thêm**, người trong group **không biết là Khang nhắn**. Kat đề xuất (chờ Khang chốt): chỉ Khang dùng · gõ trong **chat riêng** với bot (gõ trong group thì lộ) · **không qua AI** (giữ nguyên chữ, không gửi Google) · thẻ xác nhận trước khi gửi · có áp dụng cho Rây không? |
| — | Nhắn thay Khang — chốt (24/11/2026) | **Cả 2 bot** (Rây ở nhóm A, Lũi ở nhóm B) · **chỉ chữ** ở phase 1 · **có thẻ xác nhận** · **có `/thuhoi`** (bot xóa tin vừa nhắn thay, Telegram cho phép trong 48 giờ) |
| — | Thứ tự làm | **Rây trước, Rây ưu tiên hơn** (hạn chót 03/12 áp cho Rây; Lũi làm sau khi Khang gửi tính cách) |
| — | Mốc cảnh báo | Khang: **giữ 6 mốc**, nhờ Kat tư vấn (giá **SGD**). Kat giả lập trên giá Wise theo giờ 30 ngày (25/10–24/11; Wise không cho tải quá 30 ngày): xem "Căn cứ mốc" bên dưới. **Chờ Khang chốt** giữa bản nháp và đề xuất C |
| — | Mốc cảnh báo — **CHỐT** (Khang 24/11/2026) | **Phương án C:** 19,800 · 19,900 · 20,000 · 20,100 · 20,200 · 20,300 (VND / 1 SGD, so với Wise), đệm ±10 |
| — | Lệnh chỉnh mốc / ngưỡng | **Bắt buộc có lệnh** để Khang chỉnh mốc (thêm, bớt, đổi). Như mọi lệnh chỉnh cấu hình: chỉ Khang, có thẻ xác nhận |
| — | Lệnh bật / tắt "lắng nghe" | **Cả Rây và Lũi** có lệnh để Khang **bật / tắt việc đọc tin nhắn trong group** |
| — | Xưng hô | Khang **chọn cách mỗi bot xưng hô và gọi người dùng** (vd "tao – mày") bằng lệnh |
| — | Tài liệu chuẩn gọi AI | Khang gửi lại (24/11/2026 ~22:00) — **giống hệt** bản đã lưu, không đổi gì |
| — | **Prompt gửi AI phải giàu bối cảnh** (Khang 24/11/2026) | Ví dụ "Lũi mày thấy tao nên nghỉ phép ngày mai không?" → ngoài câu hỏi, prompt phải có: bối cảnh, **tên từng người**, **tên nhóm**, nhóm hay bàn gì, **nhóm đang nói gì**, các thông số, các quy tắc, cách xưng hô, tính cách… — theo tài liệu chuẩn gọi AI của Khang (mục 3.1 khối BỐI CẢNH). ⚠️ **Đụng Rule 5** (tên người / tên nhóm không vào prompt AI) → Kat đề xuất cách giải, **chờ Khang chốt** |
| — | **Lắng nghe = đọc mọi tin, tự quyết khi nào nói** (cả 2 bot) | Khi bật lắng nghe, bot **không chỉ phản hồi khi được gọi** ("Rây ơi", "Lũi ơi", hoặc chỉ chữ "Lũi") mà **đọc tất cả tin nhắn và trả lời khi thấy cần**. (Thay câu Kat hỏi "Rây chỉ trả lời khi được gọi?" → **không**, Rây cũng tự chen vào) |
| — | **Mức hóng chuyện 1–10** (Khang chỉnh) | Càng cao càng nói nhiều; càng thấp càng ít nói, **bỏ qua đa số** trường hợp. Khi nói thì **thêm quan điểm của bot**, vd nhóm bàn sếp khó tính soi xét → bot chen: "tao nghĩ không nên nói nhiều về sếp xui lắm" |
| — | **Tóm tắt chat cuối ngày cho Khang** (Khang bổ sung 24/11/2026, lúc tổng kết) | Khi bật lắng nghe, bot **tóm mỗi câu của thành viên thành 1 câu ngắn**, ghi vào **cache JSON** (bot không có trí nhớ). Cuối ngày Khang hỏi "họ đang bàn gì" → app gọi AI đọc **toàn bộ cache của ngày** → gửi Khang bản tóm tắt (vd "hôm nay Mít nói về tỉ giá cao và chuyện Trump khịa phe Dân chủ"). **Bắt buộc:** cache **xóa lúc 01:00 mỗi ngày** (dữ liệu riêng tư) và **phải mã hóa**. Ví dụ Khang nêu cho nhóm B. Kat lưu ý (chờ Khang chốt — D4): tóm từng câu = 1 lượt AI / tin nhắn; phương án nhẹ hơn: lưu câu gốc đã mã hóa, chỉ gọi AI 1 lần khi Khang hỏi |
| — | Lũi đọc tin nhắn | **Lũi đọc tất cả tin nhắn trong nhóm B.** Link: Lũi **không** tự mở link; chỉ đọc chữ đi kèm / tiêu đề xem trước để đoán ý người gửi; **chỉ mở link khi được yêu cầu**. (Có cần danh sách trang được phép mở không → bàn ở ATR) |

**Căn cứ mốc (Kat giả lập 24/11/2026, lấy giá mỗi 5 tiếng, chỉ tính 14 ngày cuối tháng, tối đa 4 lần / ngày, cách 3 giờ, im lặng 20:00–06:00):**
- Giá Wise 30 ngày: thấp 19,900.5 · cao 20,227.7. Sau 5 tiếng giá đổi: trung vị 7.5 đ · 90% dưới 30.8 đ · lớn nhất 95.3 đ.
- A. 6 mốc nháp (19,900 · **19,950** · 20,000 · 20,100 · 20,200 · 20,300), đệm ±10 → **7 cảnh báo**, trong đó **4 lần qua lại mốc 19,950 trong 3 ngày** (18–20/11) → ồn, máy móc.
- B. 6 mốc nháp, đệm ±30 → 3 cảnh báo, nhưng **bỏ sót 2 lần cắt mốc 20,000** (mốc nhóm quan tâm nhất).
- **C. cách đều 100: 19,800 · 19,900 · 20,000 · 20,100 · 20,200 · 20,300, đệm ±10 → 3 cảnh báo, đúng 3 sự kiện đáng nói** (27/10 giảm dưới 20,200 · 21/11 lên trên 20,000 · 24/11 xuống dưới 20,000). **Kat đề xuất C.**
- D. cách đều 100, đệm ±30 → chỉ 1 cảnh báo (quá im).

**Hệ quả Kat ghi nhận:** Rây có 2 khung thời gian: **báo tỉ giá chủ động** trong 7 ngày cuối tháng; **cảnh báo vượt ngưỡng** trong 14 ngày cuối tháng. Giá lấy mỗi 5 tiếng → cảnh báo trễ tối đa ~5 tiếng (khớp "không cần chính xác giờ"). **Còn mở:** danh sách mốc (nháp 6 mốc: 19,900 · 19,950 · 20,000 · 20,100 · 20,200 · 20,300).

## Các lượt còn lại (chưa hỏi)
- **Lượt 5 — Người dùng & quyền:** ai ra lệnh được cho bot, ai báo giá đổi thật, thiết bị.
- **Lượt 6 — Đầu ra & giọng văn:** giờ đăng, độ dài, mức hài hước, câu mẫu của Mít nào được dùng, bot xưng hô thế nào trong group.
