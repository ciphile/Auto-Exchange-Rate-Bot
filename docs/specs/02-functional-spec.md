# FS — Functional Spec — Auto-Exchange-Rate-Bot (Rây + Lũi)

> **Bản 0.3 · 24/11/2026 (0.1, 0.2: 24/11/2026) · Kat viết ở Mode 2 · Khang đã duyệt bản 0.2 (24/11/2026 22:40)** — Khang có quyền sửa bất kỳ mục nào.
> **Dự án này chỉ có FS** (Khang chốt 24/11/2026: không BRD, không TS). Cổng chặn: **FS chốt mới được code**. Kiến trúc (ADR), kiểm chứng (KC), bảng ATR bảo mật nằm ở **phụ lục** của FS.
> Nguồn yêu cầu: `docs/specs/00-phong-van.md` (lượt 1–5). Tên người dùng **biệt danh** (Rule 5). Mã quy tắc `BR-xx`, mã chức năng `F-xx`, mã lỗi `E-...` — **bỏ qua số 13**.
> **Phạm vi bản này:** **Rây đầy đủ** (ưu tiên, hạn chót **thứ Năm 03/12/2026** — Khang xác nhận 24/11/2026). **Lũi: khung + phần dùng chung**; tính cách, giọng văn, lĩnh vực tin **chờ Khang gửi** (mục 8).

---

## 1. Tổng quan

| | Rây | Lũi |
|---|---|---|
| Group | **nhóm A** (đồng nghiệp thân: lương, thuế, công ty) | **nhóm B** (rộng hơn, có đồng nghiệp cũ; thời sự) |
| Chuyên môn | Tỉ giá SGD→VND, kinh tế vĩ mô, vàng, coin | Tin tức báo chính thống, chính trường, tám chuyện |
| Chạy | 24/24, miễn phí 100% | như Rây |
| Người điều khiển | **Chỉ Khang** (lệnh trong chat riêng với bot) | như Rây |

**Từ điển nghiệp vụ** (tiếng Việt → tên trong code): tỉ giá giữa Wise → `wiseMidVnd` · NH mua chuyển khoản → `bankTransferBuyVnd` · NH mua tiền mặt → `bankCashBuyVnd` · NH bán → `bankSellVnd` · chợ đen ước tính → `blackMarketEstVnd` · mốc → `alertLevelsVnd` · ngày lương → `paydayDate` · tuần lương → `paydayWeek` · khung cảnh báo → `alertWindow` · giờ nghỉ → `quietHours` · lắng nghe → `listenMode` · mức hóng chuyện → `chattinessLevel` · nhắn thay → `relayMessage` · kho tin nhắn tạm → `chatLog`.

---

## 2. Quy tắc nghiệp vụ (BR)

| Mã | Quy tắc | Lý do | Ai chốt · ngày |
|---|---|---|---|
| **BR-01** | **Ngày lương = ngày cuối cùng của tháng** (28/29/30/31 tùy tháng). | Lương công ty SGP trả cuối tháng. | Khang · 24/11/2026 |
| **BR-02** | **Tuần lương** = 7 ngày tính tới ngày lương (vd tháng 30 ngày: 24 → 30). | Lúc mọi người quan tâm tỉ giá nhất. | Khang (lượt 4–5) · 24/11/2026 |
| **BR-03** | **Khung cảnh báo** = 14 ngày tính tới ngày lương. Ngoài khung: **không cảnh báo**. | "2 tuần trước ngày nhận lương". | Khang · 24/11/2026 |
| **BR-04** | Giá **lấy theo lịch cố định mỗi 5 tiếng**: 01:00 · 06:00 · 11:00 · 16:00 · 21:00 (giờ VN), lưu vào kho số liệu. Lời bot nói **chỉ đọc kho**, không đi lấy giá lúc nói. | Lịch cố định, nói ngẫu nhiên; dịch vụ ngoài lỗi không làm chậm lúc nói. | Khang (5 tiếng) · Kat (giờ cụ thể, Mode 2) · 24/11/2026 |
| **BR-05** | **Nguồn chuẩn để so mốc = Wise (mid-market).** Wise lỗi → dùng nguồn dự phòng (cập nhật 1 lần / ngày) và **ghi rõ trong tin** là số dự phòng. | Số mọi người thấy trên app, đo được. | Khang (lượt 3) · 24/11/2026 |
| **BR-06** | **Mốc cảnh báo** mặc định 19,800 · 19,900 · 20,000 · 20,100 · 20,200 · 20,300 (VND / 1 SGD). Khang thêm / bớt / đổi bằng lệnh. | Giả lập 30 ngày: cách đều 100 báo đúng 3 sự kiện, mốc 50 báo qua lại. | Khang (phương án C) · 24/11/2026 |
| **BR-07** | Cảnh báo khi giá **cắt qua mốc, cả chiều tăng và giảm**, có **đệm ±10 VND** (phải vượt mốc ≥ 10 mới tính là đã qua; chưa qua hẳn thì không báo lại). | Không báo qua lại khi giá sát mốc. | Khang (2 chiều) · Kat (đệm, đã giả lập) · 24/11/2026 |
| **BR-08** | Cảnh báo **ngay lần lấy giá phát hiện cắt mốc**; tối đa **4 cảnh báo / ngày**, cách nhau **≥ 3 giờ**; rơi vào giờ nghỉ → **chờ hết giờ nghỉ** (gửi ở nhịp đầu tiên sau 06:00) nếu giá **vẫn còn** bên kia mốc. | Theo lời Khang. | Khang · 24/11/2026 |
| **BR-09** | **Giờ nghỉ mặc định 20:00 → 06:00**: bot **không tự nhắn** (không báo, không cảnh báo, không chen chuyện). Khang chỉnh bằng lệnh. | Theo lời Khang. | Khang · 24/11/2026 |
| **BR-10** | **Báo tỉ giá chủ động trong tuần lương**: mỗi ngày **≤ 1 lần**, kiểu "nói rồi nghỉ 1 ngày rồi nói tiếp" — **không bao giờ nghỉ 2 ngày liền**; tổng 4–6 lần / tuần lương. **Ngày lương luôn báo** (cao hay thấp đều báo). Ngoài tuần lương: **im lặng**. | "hầu như mỗi ngày 1 lần hay mỗi ngày rồi nghỉ 1 ngày" + "ngày cuối tháng đảm bảo bot báo". | Khang · Kat (4–6 lần, không nghỉ 2 ngày liền — Mode 2) · 24/11/2026 |
| **BR-11** | **Giờ nói ngẫu nhiên**: mỗi ngày cần báo, code bốc 1 thời điểm ngẫu nhiên trong giờ hoạt động (06:00–20:00, lệch biên 30 phút: 06:30–19:30), lưu lại; tới giờ mới nói. Cảnh báo (BR-08) **không** ngẫu nhiên. | Để người đọc cảm giác như người thật. | Khang · 24/11/2026 |
| **BR-12** | **Chợ đen ước tính = Wise × 1,004**, làm tròn tới 10 đ, luôn ghi chữ **"ước tính"**. | Không có nguồn chợ đen; mức chênh theo lời Mít ("tầm 20–20100"). | Khang (4b) · 24/11/2026 |
| **BR-14** | **Số liệu do code tính; AI chỉ viết lời.** Mọi con số AI nhắc phải **khớp số code đưa** (code kiểm); sai → dùng câu soạn sẵn (BR-24). | Chuẩn gọi AI của Khang ("app tính số, AI chỉ viết lại"). | Khang · 24/11/2026 |
| **BR-15** | **Mất mọi nguồn tỉ giá / rớt mạng / lỗi hệ thống** → **nhắn riêng Khang** kèm **mã lỗi + diễn giải dễ hiểu**; **không nhắn gì vào group**. Cùng lỗi lặp → mỗi mã lỗi báo tối đa 1 lần / 6 giờ. | Theo lời Khang (lượt 4–5). | Khang · Kat (chống dồn) · 24/11/2026 |
| **BR-16** | **Lắng nghe** (Khang bật / tắt, mặc định **tắt**): bật → bot nhận mọi tin trong group, ghi **nguyên văn** vào kho tạm **mã hóa**; tắt → **bỏ ngay** mọi tin không phải lệnh `/`, không lưu, không gửi AI. | Group Privacy tắt cố định ở BotFather; công tắc trong code. | Khang · 24/11/2026 |
| **BR-17** | **Gọi tên**: tin có tên bot (vd "Rây", "Ray", "Rây ơi" — không cần "ơi"; hoặc reply tin của bot; hoặc @tên_bot) → bot **trả lời**, kể cả giờ nghỉ (bot trực 24/24 — chỉ không *tự* nói trong giờ nghỉ). Cần bật lắng nghe; tắt lắng nghe thì chỉ nhận lệnh `/` và reply / @. | Trả lời đúng khi được hỏi. | Khang · Kat (giờ nghỉ vẫn trả lời khi được gọi — Mode 2) · 24/11/2026 |
| **BR-18** | **Quyết định có tự chen vào chuyện = luật thuần code** (bảng mức hóng chuyện mục 6), **không gọi AI để suy luận**; chỉ khi code đã quyết định nói mới gọi AI soạn câu. | Không tốn lượt AI cho tin "linh tinh". | Khang (nguyên tắc D2) · Kat (bảng mức — Mode 2) · 24/11/2026 |
| **BR-19** | **Kho tin nhắn tạm + log prompt**: **mã hóa**; kho tin nhắn **xóa lúc 01:00 mỗi ngày**; log prompt **giữ ≤ 1 ngày**. Dọn dẹp thất bại → báo Khang (BR-15). | Dữ liệu riêng tư. | Khang (D1, D4) · 24/11/2026 |
| **BR-20** | **Tóm tắt chat cuối ngày**: chỉ khi **Khang hỏi** (`/tomtat`) mới gọi AI **1 lần** đọc kho tin của ngày (của đúng group của bot đó) → gửi **riêng Khang**. Không tóm từng câu. | D4. | Khang · 24/11/2026 |
| **BR-21** | **Prompt AI được chứa tên thật** thành viên (lấy từ cấu hình trong database do Khang nhập, **không** từ repo). Repo / log kỹ thuật: không tên thật. | D1 (ngoại lệ Rule 5). | Khang · 24/11/2026 |
| **BR-22** | **Nhắn thay Khang**: chỉ Khang, trong **chat riêng** với bot; nội dung **chỉ chữ**, gửi **nguyên văn** vào group của bot đó, **không thêm chữ, không lộ người gửi, không qua AI**; **thẻ xác nhận** trước khi gửi; `/thuhoi` xóa tin nhắn thay gần nhất (Telegram cho bot xóa tin của mình trong 48 giờ). | Theo lời Khang. | Khang · 24/11/2026 |
| **BR-23** | **Mọi lệnh đổi cấu hình chỉ Khang dùng**, nhận diện bằng **mã tài khoản Telegram** của Khang; mỗi lệnh đổi → **thẻ xác nhận ✅ / ❌**; ghi nhật ký (ai, lúc nào, cũ → mới). Người khác gõ → im lặng. | Tài liệu gọi AI của Khang mục 5 (ghi / đổi → hỏi OK); an toàn. | Khang · 24/11/2026 |
| **BR-24** | **AI lỗi / hết lượt** → bot vẫn nói bằng **câu soạn sẵn** (đã duyệt, luân phiên không lặp) cho báo / cảnh báo; hỏi đáp tự do thì báo "giờ Rây đang lag, lát hỏi lại" kiểu người; không bao giờ im lặng khi được gọi. | Chuẩn gọi AI của Khang (đường lui). | Khang · 24/11/2026 |
| **BR-25** | **Chính trị trong nước: trung lập**, dẫn nguồn báo chính thống; câu **dự đoán** (tỉ giá tháng sau, chiến tranh…) phải nói rõ là **đoán**; không khuyên tài chính chắc chắn. | Rủi ro pháp lý cho thành viên; không phóng đại. | Khang · 24/11/2026 |
| **BR-26** | Bot bị hỏi thẳng "mày là bot à" → **không chối**. Ngoài ra nói chuyện như người (không khuôn mẫu), có quan điểm riêng theo tính cách. | Telegram luôn gắn nhãn BOT; trung thực. | Khang (đồng ý đề xuất) · 24/11/2026 |
| **BR-27** | **Xưng hô**: Khang chọn cách bot xưng và gọi người dùng (vd "tao – mày", "em – anh") bằng lệnh; prompt luôn mang theo lựa chọn hiện hành. | Theo lời Khang. | Khang · 24/11/2026 |
| **BR-28** | **Tâm trạng / phong cách**: Khang chọn tâm trạng (vui, cáu, thất tình — nói cộc lốc, muốn nói nhiều…) và phong cách; prompt mang theo. Cảnh báo phải **than như người** (học giọng Xoài, Ổi, Mít), báo giá **như Mít báo** — không khuôn máy móc. | Theo lời Khang. | Khang · 24/11/2026 |
| **BR-29** | Mọi câu nói về giá (báo, cảnh báo, trả lời) **phải nói rõ nguồn + thời điểm lấy** (vd "theo Wise, lấy lúc 11:00 ngày 24/11"). **AI không bao giờ đi tìm tỉ giá** (Gemini không tra được; tra web gói free gần như 0 lượt): số luôn lấy từ **kho bản chụp** (BR-04) hoặc BR-30. | Người dùng phải biết số đó cũ hay mới, của ai. | Khang · 24/11/2026 |
| **BR-30** | **Lấy giá ngay theo yêu cầu** ("mày lấy tỉ giá thời điểm hiện tại đi"): AI chỉ **chọn action** `lay_ty_gia_ngay`; **code thuần** đọc thẳng nguồn được chọn (Wise / VCB / VPBank — không qua AI, không tìm web) rồi AI viết lời, nói rõ nguồn + giờ (BR-29). **Thiếu nguồn → hỏi lại** người dùng muốn nguồn nào. Mỗi nguồn tối đa **1 lần đọc / 5 phút** (VCB yêu cầu ≤ 1 lần / 5 phút) — trong 5 phút dùng lại kết quả vừa đọc, kèm giờ. Nguồn lỗi → nói thật chưa lấy được + đưa bản gần nhất trong kho kèm giờ. Kết quả lấy ngay **không** dùng để cảnh báo (cảnh báo chỉ theo lịch BR-04). Là action **chỉ xem** → chạy luôn, không cần thẻ xác nhận. **Cách hiểu nguồn** (Khang dặn 24/11/2026 22:40; Kat chốt cách làm, Mode 2): nêu tên ("check VCB", "vietcombank", "VP bank với Wise") → đúng các nguồn đó · **"tùy mày" / "nguồn nào cũng được" / "sao cũng được"** → **Wise** (nguồn chuẩn BR-05; Wise đang tắt → nguồn bật đầu tiên) · **"tất cả nguồn" / "cả 3" / "lấy hết"** → **mọi nguồn Khang đang bật** · không nói nguồn → **hỏi lại**; câu trả lời cho câu hỏi đó trong **10 phút** (reply tin hỏi, hoặc gọi tên) được hiểu là trả lời câu hỏi · nguồn được hỏi đang bị Khang tắt (`/nguon`) → nói nguồn đó đang tắt, kể các nguồn đang bật. **Luật trước, AI sau:** khi đang chờ câu trả lời "nguồn nào?", code đọc từ khóa trước — rõ ràng thì không gọi AI; mơ hồ / có ý loại trừ ("tất cả trừ VCB") → để AI chọn tham số, code kiểm lại. | Khang (đề xuất action thay vì từ chối) · Kat (5 phút, không dùng cho cảnh báo — Mode 2) | Khang · 24/11/2026 |

---

## 3. Chức năng (F)

### F-01 Lấy giá theo lịch (việc nền, không nhắn ai)
- **Khi** tới giờ lấy giá (BR-04) **thì** app lấy Wise (giữa + lịch sử theo giờ), VCB (XML), VPBank (JSON) theo **nguồn Khang đang bật**; Wise lỗi → nguồn dự phòng (BR-05); lưu 1 bản chụp có thời điểm + nguồn.
- **Khi** mọi nguồn lỗi **thì** không ghi bản chụp mới, báo Khang `E-SRC-002` (BR-15), lần nói sau dùng bản gần nhất **kèm ngày giờ của bản đó**.
- **Khi** có bản chụp mới **thì** chạy F-03 (kiểm mốc).

### F-02 Báo tỉ giá trong tuần lương (Rây tự nói)
- **Khi** bước sang ngày mới trong tuần lương (BR-02) **thì** code quyết định hôm nay có nói không (BR-10) và bốc giờ ngẫu nhiên (BR-11).
- **Khi** tới giờ đã bốc (và không phải giờ nghỉ) **thì** gửi 1 tin: **câu bình như Mít** (AI soạn, theo BR-14, BR-27, BR-28) + khối số **phương án 2**:
  ```
  <câu bình tự nhiên>

  🌐 Wise (mid-market): 19,975.2  ▲ +1.5 / 24h  · lấy lúc 11:00 24/11
  🕶 Chợ đen (ước tính): ~20,060
  🏦 NH mua SGD: VCB 19,682 · VPBank 19,698
  ```
- **Khi** là ngày lương **thì** luôn nói (BR-10), câu bình nhắc hôm nay là ngày lương.

### F-03 Cảnh báo cắt mốc (Rây tự nói)
- **Khi** bản chụp mới cho thấy giá Wise cắt mốc (BR-06, BR-07) **và** đang trong khung cảnh báo (BR-03) **thì** gửi cảnh báo theo BR-08: **câu than / mừng như người** (AI soạn: học giọng Xoài, Ổi, Mít) + 1 dòng số (giá Wise, mốc vừa cắt, chợ đen ước tính).
- **Khi** cắt nhiều mốc một lần **thì** chỉ nói mốc xa nhất theo chiều đi, ưu tiên mốc 20,000 / 20,100.
- **Khi** bị hoãn (giờ nghỉ, quá 4 lần, chưa đủ 3 giờ) **thì** giữ "đang chờ báo"; tới lúc được phép mà giá đã quay lại phía cũ **thì** bỏ, không báo.

### F-04 Trả lời khi được gọi (cả 2 bot)
- **Khi** có tin gọi tên bot (BR-17) **thì**: lệnh `/` → chạy thẳng, **không gọi AI**; câu tự nhiên → **1 lần gọi AI chọn action** trong danh sách đóng (theo tài liệu gọi AI của Khang) → code kiểm tên action + tham số → chạy action → (nếu cần lời) **gọi AI lần 2 soạn câu trả lời** đúng xưng hô / tâm trạng / tính cách.
- **Danh sách action của Rây:** `xem_ty_gia` (giá hôm nay, cao hay thấp so với 7 ngày / mốc) · `quy_doi` (số tiền SGD ↔ VND theo Wise, chợ đen ước tính, NH mua) · `hoi_vi_mo` (**hỏi đáp tự do**: vì sao tỉ giá lên xuống, vàng, coin, Trump, dự đoán… — dùng bối cảnh số liệu trong kho + **kho tin của Lũi**; không tra web) · `tro_chuyen` (**tán gẫu / không thuộc loại nào**). Hai action cuối là **bắt buộc** theo tài liệu của Khang.
- **Thêm action `lay_ty_gia_ngay`** (BR-30), tham số `nguon`: `"wise" | "vcb" | "vpbank"` hoặc **mảng** các tên đó · `"tat_ca"` ("tất cả nguồn", "cả 3") · `"tuy_bot"` ("tùy mày", "nguồn nào cũng được") · `null` (không nói → hỏi lại). Giá trị lạ → coi như thiếu → hỏi lại (code kiểm, không đoán). Ví dụ: "mày lấy tỉ giá thời điểm hiện tại đi", "check VCB giùm cái". Mọi câu trả lời về giá ghi **nguồn + thời điểm** (BR-29); `xem_ty_gia` đọc kho, **không** đi lấy mới.
- Ví dụ phải hiểu đúng: "Rây ơi tỉ giá hôm nay thế nào?", "Tỉ giá hôm nay cao hay thấp?", "cập nhật đi Rây", "giá hôm nay sao rồi" → `xem_ty_gia`.
- **Khi** AI lỗi **thì** đường lui bằng từ khóa; vẫn không hiểu → câu "chưa hiểu" kiểu người + gợi ý lệnh (BR-24).

### F-05 Tự chen vào chuyện (cả 2 bot, khi bật lắng nghe)
- **Khi** có "đợt trò chuyện" mới (mục 6) **thì** code chạy bảng mức hóng chuyện (BR-18); quyết định **nói** → gọi AI 1 lần với **bối cảnh đầy đủ** (mục 5) + đoạn chat gần nhất → AI viết câu chen vào **có quan điểm** (vd nhóm bàn sếp khó tính → "tao nghĩ không nên nói nhiều về sếp xui lắm"); quyết định **không nói** → không gọi AI.

### F-06 Tóm tắt chat cuối ngày (cả 2 bot)
- **Khi** Khang gõ `/tomtat` trong chat riêng **thì** gọi AI 1 lần đọc kho tin hôm nay của group → gửi Khang bản tóm tắt (vd "hôm nay Mít nói về tỉ giá cao và chuyện Trump khịa phe Dân chủ" — trong tin gửi Khang dùng tên thật). Kho rỗng → "hôm nay nhóm im re".

### F-07 Nhắn thay Khang (cả 2 bot)
- `/noi <chữ>` (chat riêng) → thẻ "Gửi vào nhóm A: '<chữ>'? ✅ Gửi / ❌ Hủy" → ✅ → bot gửi nguyên văn (BR-22) → ghi lại mã tin để thu hồi.
- `/thuhoi` → thẻ xác nhận → xóa tin nhắn thay gần nhất (≤ 48 giờ; quá hạn → báo Khang không xóa được).

### F-08 Lệnh của Khang (chat riêng; đổi → thẻ xác nhận, BR-23)
| Lệnh | Việc | Loại |
|---|---|---|
| `/trangthai` | Cấu hình hiện hành + giá gần nhất + lỗi gần nhất | xem |
| `/moc 19800 19900 …` | Đặt danh sách mốc (BR-06) | đổi |
| `/langnghe on|off` | Bật / tắt lắng nghe (BR-16) | đổi |
| `/hongchuyen 1..10` | Mức hóng chuyện (mục 6) | đổi |
| `/xungho <bot xưng> - <gọi người dùng>` | Xưng hô (BR-27) | đổi |
| `/tamtrang <vui|cau|thatinh|noinhieu|binhthuong>` · `/phongcach <mô tả>` | Tâm trạng, phong cách (BR-28) | đổi |
| `/gionghi 20:00-06:00` | Giờ nghỉ (BR-09) | đổi |
| `/nguon wise,vcb,vpbank` | Nguồn tỉ giá được dùng (Rây) | đổi |
| `/gannhom` | **Gõ trong group** (chỉ Khang): gắn group này làm group của bot (nhóm A cho Rây, nhóm B cho Lũi) → thẻ xác nhận. Group chưa gắn → bot im lặng ở đó (ATR-4). Không cần tra mã group | đổi |
| `/thanhvien` | Xem / sửa danh sách thành viên dùng trong prompt (tên thật, vai trò, cách gọi) — lưu database, không repo (BR-21) | đổi |
| `/noi`, `/thuhoi` | F-07 | đổi |
| `/tomtat` | F-06 | xem (gọi AI) |
| `/aistatus` · `/clearcache` · `/aimodels` · `/aitest` | Lệnh kiểm tra AI **bắt buộc theo tài liệu của Khang** | xem / dọn |

### F-09 Lệnh cho thành viên trong group (Rây)
`/tygia` (= `xem_ty_gia`) · `/quydoi <số> [sgd|vnd]` (= `quy_doi`) · `/help`. Lệnh `/` chạy thẳng, không gọi AI.

### F-10 Dọn dẹp hằng ngày 01:00
Xóa kho tin nhắn tạm của các ngày trước · log prompt > 1 ngày · bản chụp giá > 60 ngày · nhật ký đổi cấu hình > 365 ngày · dữ liệu tạm khác theo tài liệu của Khang (cache model, đếm lượt). Thất bại → `E-SYS-001` báo Khang.

---

## 4. Lỗi — mỗi mã có 2 câu (báo lỗi + cách xử lý), gửi **riêng Khang**
| Mã | Báo | Cách xử lý (cho Khang) |
|---|---|---|
| `E-SRC-001` | Wise không trả giá lúc <giờ>; đang dùng nguồn dự phòng. | Không cần làm gì; nếu kéo dài > 1 ngày, báo Kat kiểm đường dẫn Wise. |
| `E-SRC-002` | Không lấy được giá từ **mọi nguồn** lúc <giờ>; bot không nhắn group. | Kiểm mạng / trạng thái Vercel; tự hết khi nguồn có lại. |
| `E-AI-001` | Gemini hết lượt miễn phí hôm nay; bot dùng câu soạn sẵn. | Không cần làm gì; lượt reset khoảng 15:00 giờ VN. |
| `E-AI-002` | Khóa Gemini sai / bị chặn. | Tạo khóa mới ở Google AI Studio, dán vào biến môi trường trên Vercel. |
| `E-TG-001` | Gửi tin vào group thất bại (<mã Telegram>). | Kiểm bot còn trong group, chưa bị chặn. |
| `E-SYS-001` | Dọn dẹp 01:00 thất bại. | Báo Kat; dữ liệu riêng tư có thể chưa xóa. |
| `E-CFG-001` | Thiếu biến môi trường <tên>. | Thêm biến đó trên Vercel theo hướng dẫn cài đặt. |

---

## 5. Prompt gửi AI — khối bối cảnh (theo tài liệu gọi AI của Khang, mục 3 và 7)
- **SYSTEM** (ổn định): câu đầu "bạn không có trí nhớ giữa các lần gọi…"; **bot là ai** (tên, nhóm, việc); **nhóm**: mô tả, chủ đề hay bàn; **thành viên**: tên thật (BR-21), vai trò, quan hệ, cách gọi; **luật**: BR-14 (không bịa số), BR-25, BR-26; **xưng hô** (BR-27); **tính cách + tâm trạng + phong cách** (BR-28; Lũi: mục 8); **câu mẫu giọng** (Mít, Xoài, Ổi — câu ngắn về tỉ giá, đã Khang duyệt).
- **PROMPT** (mỗi lần): ngày giờ (code điền) · số liệu từ kho (giá, thay đổi 24h, 7 ngày, mốc gần nhất, chợ đen ước tính) · đoạn chat gần nhất (**tối đa 30 tin hoặc 2 giờ**, bọc `"""…"""`, cắt độ dài) · câu cần trả lời · tối đa 5 câu bot nói gần nhất (chống lặp) · quy tắc chỗ dễ nhầm · **khuôn đầu ra JSON** ở cuối.
- **Không phình theo thời gian**: mọi danh sách gửi kèm đều có trần.

---

## 6. Mức hóng chuyện (BR-18) — Kat chốt ở Mode 2, Khang sửa được
**"Đợt trò chuyện"** = có ≥ 3 tin mới từ thành viên kể từ lần xét trước, và group đã **im ≥ 3 phút** (tức là vừa nói xong một mạch). Mỗi đợt **xét đúng 1 lần** (ở nhịp chạy kế tiếp, tối đa ~10 phút sau). Ngoài ra: giờ nghỉ → không chen; sau mỗi lần chen → nghỉ ≥ 30 phút.

| Mức | Xác suất chen vào mỗi đợt | Trần lần chen / ngày |
|---|---|---|
| 1 | 0% (chỉ trả lời khi được gọi) | 0 |
| 2 | 5% | 1 |
| 3 | 10% | 2 |
| 4 | 15% | 3 |
| 5 | 20% | 4 |
| 6 | 30% | 6 |
| 7 | 40% | 8 |
| 8 | 50% | 10 |
| 9 | 65% | 14 |
| 10 | 80% | 20 |

**Đúng sở trường thì hăng hơn:** đợt có từ khóa đúng chuyên môn của bot (Rây: tỉ giá, SGD, USD, lương, vàng, coin, ngân hàng…; Lũi: theo lĩnh vực Khang gửi) → xác suất × 1,5 (trần 95%). Gọi tên bot **không** tính vào trần. Mặc định khi cài: **mức 3**.

---

## 7. Đường đi các chức năng chính
```text
F-01 Lấy giá
- Nhịp lịch (Supabase Cron, mỗi 10 phút) → /api/tick (kiểm mã Bearer) → đúng giờ BR-04? → rateFetchService (Wise → dự phòng; VCB; VPBank) → bảng rate_snapshots → F-03
F-02 Báo tuần lương
- /api/tick → paydayService.planToday (BR-10, BR-11) → bảng daily_plan → tới giờ → aiAdapter.generate(purpose=rate_report) → kiểm số (BR-14) → Telegram sendMessage (nhóm A)
F-03 Cảnh báo
- rate_snapshots mới → alertService (BR-06/07/08, khung BR-03) → alert_state → aiAdapter.generate(purpose=rate_alert) → Telegram
F-04 Được gọi
- Telegram webhook /api/telegram/<bot> (kiểm secret_token) → kiểm chat được phép → lệnh `/`? chạy thẳng : intentService (AI chọn action → kiểm) → action → aiAdapter (soạn lời) → Telegram
F-05 Chen chuyện
- /api/tick → chattinessService (bảng mục 6, luật thuần) → nói? aiAdapter.generate(purpose=chime_in) : dừng
F-06 Tóm tắt
- /tomtat (chat riêng, kiểm Khang) → chatLogRepository (giải mã) → aiAdapter.generate(purpose=daily_summary) → gửi riêng Khang
F-07 Nhắn thay
- /noi (kiểm Khang) → thẻ xác nhận → ✅ → Telegram sendMessage → bảng relay_messages · /thuhoi → deleteMessage
F-10 Dọn dẹp
- /api/tick lúc 01:00 → housekeepingService → xóa theo BR-19 / F-10 → lỗi? E-SYS-001
```

---

## 8. Lũi — chờ Khang (STATUS việc 1–3)
Đã chốt (dùng chung với Rây): F-04 (danh sách action của Lũi chờ lĩnh vực tin), F-05, F-06, F-07, F-08, BR-09, BR-14 → BR-28. **Riêng Lũi đã biết:** cào tin **2 lần / ngày** (06:00, 12:00) qua **RSS** của báo chính thống; chỉ đăng tiêu đề + 1–2 câu tóm tắt + link; xếp hạng tin theo **luật** (mức nóng, mức nghiêm trọng) với ngưỡng Khang chỉnh; nhắn giờ ngẫu nhiên ngoài giờ nghỉ; link trong chat: chỉ đọc chữ đi kèm, **chỉ mở link khi được yêu cầu**; kho tin dùng chung cho Rây (`hoi_vi_mo`). **Chờ:** lĩnh vực tin · tính cách (Kat sẽ mô tả kỹ + ràng buộc bằng rule + tham số) · giọng văn · bảng xếp hạng tin.

---

## Phụ lục A — Kiến trúc (ADR) — Kat chốt ở Mode 2
| ADR | Quyết định | Lý do | Xem lại khi |
|---|---|---|---|
| ADR-01 | **2 bot (2 token) chung 1 bộ code, 1 chỗ chạy** | Tách danh tính + dữ liệu + rủi ro lộ token; code viết 1 lần | — |
| ADR-02 | **Vercel Hobby (serverless) + TypeScript + Telegram webhook** | Miễn phí; Khang đã dùng ở dự án 4A; chuẩn code / barie của skill viết cho TypeScript; hàm chạy tối đa 300 giây — đủ | Vượt hạn mức miễn phí |
| ADR-03 | **Supabase Free (Postgres)** làm kho dữ liệu | Miễn phí; RLS; đã dùng ở 4A. Tạm ngưng nếu 1 tuần không hoạt động → nhịp lịch chạy liên tục nên không bị | Supabase đổi chính sách |
| ADR-04 | **Nhịp lịch = Supabase Cron (pg_cron + pg_net) gọi `/api/tick` mỗi 10 phút** kèm mã Bearer; mọi lịch (lấy giá, giờ nói, dọn dẹp) quyết định **trong code** | Vercel Hobby cron chỉ 1 lần / ngày, lệch tới 1 tiếng → không đủ | KC-01 thất bại → dự phòng: GitHub Actions cron mỗi 30 phút (repo private: ~1.440 phút / tháng < 2.000 miễn phí) |
| ADR-05 | **Gemini bản miễn phí, gọi REST, theo 100% tài liệu của Khang** (model `-latest` + dự phòng, xử lý từng mã lỗi, log, cache) | Ràng buộc 0 đồng | — |
| ADR-06 | **Mã hóa ở tầng ứng dụng AES-256-GCM** (khóa 32 byte trong biến môi trường, không nằm chung database) cho kho tin nhắn + log prompt | Yêu cầu "phải mã hóa"; lộ database vẫn không đọc được | — |
| ADR-07 | Nguồn tỉ giá: Wise (đường dẫn công khai **không chính thức**) · VCB XML · VPBank JSON · dự phòng open.er-api.com | Đã thử chạy thật 23–24/11/2026 | Wise đổi / chặn |

## Phụ lục B — Kiểm chứng (KC) trước khi code
| KC | Nội dung | Trạng thái |
|---|---|---|
| KC-01 | pg_cron + pg_net gọi URL ngoài mỗi 10 phút trên **gói Free** | Tài liệu Supabase có mẫu chạy mỗi phút; **chưa thấy** ghi giới hạn cho gói Free → thử trên project thật khi Khang tạo |
| KC-02 | Hạn mức Gemini free theo **dự án** (không theo khóa), reset nửa đêm giờ Thái Bình Dương | Tài liệu Google xác nhận "theo dự án"; số lượt từng model xem trong AI Studio |
| KC-03 | `secret_token` của Telegram webhook → header `X-Telegram-Bot-Api-Secret-Token`, so thời gian cố định | Nhiều nguồn khớp; đối chiếu tài liệu chính thức khi code |
| KC-04 | Vercel Hobby: hàm tối đa 300 giây | Tài liệu Vercel (có 1 trang ghi khác) — 300 giây đủ dùng |
| KC-05 | RSS các báo (Lũi) | Làm khi tới Lũi |
| KC-06 | Vercel build được hàm TypeScript dùng `import './x.ts'` (đuôi `.ts`) bằng `typescript` 6.0.3 của dự án | Thử ở lần deploy đầu có code `api/`; lỗi → đổi cấu hình biên dịch, không đổi logic |
| KC-07 | **Không lộ file tĩnh**: Vercel không phát `docs/`, `prototype-v0/`… ra địa chỉ công khai (repo private nhưng địa chỉ `.vercel.app` ai cũng mở được) | Đã chặn 2 lớp: `vercel.json` (`outputDirectory: public` — chỉ thư mục rỗng `public/`) + `.vercelignore` (không tải `docs/`, `prototype-v0/`, `tests/`…). Sau deploy đầu: mở `https://<app>.vercel.app/docs/specs/02-functional-spec.md` phải ra **404** |

## Phụ lục C — Bảng ATR bảo mật (skill 6.17) — đánh số bỏ qua 13
| ATR | Kiểm | Trạng thái | Bằng chứng / việc phải làm |
|---|---|---|---|
| ATR-1 | Webhook kiểm `secret_token` **trước khi đọc** tin, so thời gian cố định; mỗi bot 1 mã riêng | Thiếu (chưa code) | Test "thiếu / sai mã → 401" |
| ATR-2 | Chỉ nhận IP của Telegram | Không áp dụng (bắt buộc) | Có ATR-1; có thể thêm sau |
| ATR-3 | `/api/tick` kiểm `Bearer`; khóa chống chạy chồng; việc 1 lần / ngày có cờ đã chạy | Thiếu | Test "thiếu mã → 401", "chạy 2 lần → 1 lần" |
| ATR-4 | Chỉ phục vụ đúng nhóm A / nhóm B / chat riêng của Khang; chat lạ → im | Thiếu | Test chat lạ → không phản hồi |
| ATR-5 | Mọi lệnh đổi cấu hình + nhắn thay qua **thẻ xác nhận** | Thiếu | Test bấm ✅ / ❌ |
| ATR-6 | Phiên web | Không áp dụng | Không có web |
| ATR-7 | Mật khẩu / PIN | Không áp dụng | Nhận diện Khang bằng mã tài khoản Telegram |
| ATR-8 | Phân quyền mọi điểm vào (lệnh Khang chỉ từ mã tài khoản Khang) | Thiếu | Test người khác gõ lệnh Khang → im |
| ATR-9 | RLS bật **mọi bảng**, chỉ máy chủ dùng khóa service-role | Thiếu | Test tự động kiểm RLS |
| ATR-10 | Khóa máy chủ không lọt ra ngoài | Không áp dụng phần trình duyệt | Khóa chỉ ở biến môi trường Vercel |
| ATR-11 | Bí mật ≥ 32 ký tự ngẫu nhiên, mỗi cái khác nhau, có cách đổi (2 token bot, 2 mã webhook, mã tick, khóa mã hóa, khóa Gemini, khóa Supabase) | Một phần | `src/config/env.ts` kiểm dạng + độ dài + khác nhau (test `tests/env.test.ts`); cách đổi ở phụ lục D + hướng dẫn cài đặt |
| ATR-12 | Dữ liệu ra ngoài: Gemini free nhận **tên thật + đoạn chat** khi bot nói / tóm tắt (Khang đồng ý D1; nhóm B đã đồng ý; Google có thể dùng dữ liệu gói free) · Telegram · nguồn tỉ giá chỉ đọc | Đã được Khang đồng ý | Chỉ gửi khi cần (BR-18, BR-20) |
| ATR-14 | Theo dõi + báo động: lỗi → nhắn riêng Khang (BR-15) | Thiếu | Test mọi mã lỗi có 2 câu + gửi Khang |
| ATR-15 | Sao lưu + khôi phục | Chấp nhận rủi ro | Dữ liệu chủ yếu tạm (xóa hằng ngày); cấu hình nhỏ — `/trangthai` đủ để nhập lại |
| ATR-16 | Phụ thuộc: `npm audit` mỗi push | Thiếu | CI |
| ATR-17 | Barie tự động cho mọi dòng kiểm được, **gồm quét tên thật** (BUG-0001) | Thiếu | Bộ barie tối thiểu trước tính năng đầu tiên |

**Phát hành khi:** không còn dòng "Thiếu".

## Phụ lục D — Biến môi trường (thêm / đổi 1 biến = sửa đủ 4 nơi cùng commit — barie `tests/env.test.ts`)
Bốn nơi: `src/config/env.ts` · `.env.example` · `docs/huong-dan-cai-dat.md` · bảng này. Giá trị thật **chỉ dán trên Vercel** (Settings → Environment Variables, môi trường **Production**, bật **Sensitive**). App kiểm khi khởi động; sai → `E-CFG-001` kèm **tên** biến (không bao giờ in giá trị).

| Biến | Bắt buộc | Lấy ở đâu | Kiểm | Cách đổi khi lộ |
|---|---|---|---|---|
| `RAY_BOT_TOKEN` | Có | @BotFather → `/mybots` → Rây → API Token | dạng `số:chữ` | BotFather → API Token → Revoke current token → dán token mới vào Vercel |
| `RAY_WEBHOOK_SECRET` | Có | Tự tạo: `openssl rand -hex 32` | 32–256 ký tự, chỉ chữ / số / `_` / `-` | Tạo mã mới → dán Vercel → Redeploy (app tự đăng ký lại webhook) |
| `LUI_BOT_TOKEN` | Không (trống tới khi làm Lũi) | như Rây | có thì phải đủ cặp với mã webhook | như Rây |
| `LUI_WEBHOOK_SECRET` | Không | như Rây | như Rây | như Rây |
| `OWNER_TELEGRAM_ID` | Có | @userinfobot → dòng `Id` | dãy số | Không bí mật — chỉ đổi khi Khang đổi tài khoản Telegram |
| `GEMINI_API_KEY` | Có | aistudio.google.com → Get API key | ≥ 30 ký tự | AI Studio → xóa khóa cũ → Create API key → dán Vercel |
| `SUPABASE_URL` | Có | Supabase → Project Settings → Data API → Project URL | `https://<mã>.supabase.co` (app tự bỏ đường dẫn thừa) | Không bí mật |
| `SUPABASE_SECRET_KEY` | Có | Supabase → Project Settings → API Keys → Secret keys | bắt đầu `sb_secret_` (Bẫy 22: chỉ gửi header `apikey`) | Supabase → API Keys → tạo secret key mới → dán Vercel → xóa khóa cũ |
| `DATA_ENCRYPTION_KEY` | Có | Tự tạo: `openssl rand -hex 32` | đúng 64 ký tự hex | Tạo mã mới → dán Vercel (kho tin nhắn tạm cũ không đọc được nữa — chấp nhận, vì kho xóa mỗi ngày) |
| `TICK_SECRET` | Có | Tự tạo: `openssl rand -hex 32` — dán **cùng lúc** vào Vercel và Supabase Vault (hướng dẫn phần 7) | ≥ 32 ký tự | Tạo mã mới → dán cả 2 nơi |

Các mã tự tạo (`*_WEBHOOK_SECRET`, `TICK_SECRET`, `DATA_ENCRYPTION_KEY`) **phải khác nhau từng cái** (ATR-11, app kiểm).
