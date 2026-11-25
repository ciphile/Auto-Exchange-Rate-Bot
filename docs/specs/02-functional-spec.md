# FS — Functional Spec — Auto-Exchange-Rate-Bot (Rây + Lũi)

> **Bản 0.9 · 25/11/2026 (0.1–0.3: 24/11/2026; 0.4–0.7: 25/11/2026) · Kat viết ở Mode 2 · Khang đã duyệt bản 0.2 (24/11/2026 22:40)** — Khang có quyền sửa bất kỳ mục nào.
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
| **BR-08** | Cảnh báo **ngay lần lấy giá phát hiện cắt mốc**; **số lần tối đa theo mức tần suất** (BR-35: mức 5 = 4 lần / 24 giờ như ban đầu), luôn cách nhau **≥ 3 giờ**; rơi vào giờ nghỉ hoặc chưa đủ 3 giờ → **chờ** (gửi ở nhịp đầu tiên được phép) nếu giá **vẫn còn** bên kia mốc; **đã hết lượt của mức → bỏ, không dồn báo sau**. Đếm theo **khoảng trượt** (24 giờ / 2 ngày / 3 ngày), không theo ngày lịch. | Theo lời Khang. | Khang · 24/11/2026 · sửa 25/11/2026 (BR-35) |
| **BR-09** | **Giờ nghỉ mặc định 20:00 → 06:00**: bot **không tự nhắn** (không báo, không cảnh báo, không chen chuyện). Khang chỉnh bằng lệnh. | Theo lời Khang. | Khang · 24/11/2026 |
| **BR-10** | **Báo tỉ giá chủ động**: mỗi ngày **≤ 1 lần**; **ngày lương luôn báo** ở mọi mức (cao hay thấp đều báo). **Lịch cả tháng theo mức tần suất BR-35**; mức 3 (mặc định) giữ luật tuần lương ban đầu: 4–6 lần, **không bao giờ nghỉ 2 ngày liền**. | "hầu như mỗi ngày 1 lần hay mỗi ngày rồi nghỉ 1 ngày" + "ngày cuối tháng đảm bảo bot báo". | Khang · Kat (4–6 lần, không nghỉ 2 ngày liền — Mode 2) · 24/11/2026 |
| **BR-11** | **Giờ nói ngẫu nhiên**: mỗi ngày cần báo, code bốc 1 thời điểm ngẫu nhiên trong giờ hoạt động (06:00–20:00, lệch biên 30 phút: 06:30–19:30), lưu lại; tới giờ mới nói. Cảnh báo (BR-08) **không** ngẫu nhiên. | Để người đọc cảm giác như người thật. | Khang · 24/11/2026 |
| **BR-12** | **Chợ đen ước tính = Wise × 1,004**, làm tròn tới 10 đ, luôn ghi chữ **"ước tính"**. | Không có nguồn chợ đen; mức chênh theo lời Mít ("tầm 20–20100"). | Khang (4b) · 24/11/2026 |
| **BR-14** | **Số liệu do code tính; AI chỉ viết lời.** Mọi con số AI nhắc phải **khớp số code đưa** (code kiểm); sai → dùng câu soạn sẵn (BR-24). | Chuẩn gọi AI của Khang ("app tính số, AI chỉ viết lại"). | Khang · 24/11/2026 |
| **BR-15** | **Mất mọi nguồn tỉ giá / rớt mạng / lỗi hệ thống** → **nhắn riêng Khang** kèm **mã lỗi + diễn giải dễ hiểu**; **không nhắn gì vào group**. Cùng lỗi lặp → mỗi mã lỗi báo tối đa 1 lần / 6 giờ. | Theo lời Khang (lượt 4–5). | Khang · Kat (chống dồn) · 24/11/2026 |
| **BR-16** | **Lắng nghe** (Khang bật / tắt, mặc định **tắt**): bật → bot nhận mọi tin trong group, ghi **nguyên văn** vào kho tạm **mã hóa**; tắt → không chen chuyện, không nhận gọi tên, **không lưu kho tóm tắt cuối ngày**, không gửi AI; **chỉ giữ kho ngữ cảnh ngắn 20 tin** (BR-36, Khang đồng ý 25/11/2026) để có ngữ cảnh khi được reply / @. | Group Privacy tắt cố định ở BotFather; công tắc trong code. | Khang · 24/11/2026 |
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
| **BR-28** | **Phong cách**: cảnh báo phải **than như người** (học giọng Xoài, Ổi, Mít), báo giá **như Mít báo** — không khuôn máy móc. Tính cách + tâm trạng: **BR-31 → BR-34**. | Theo lời Khang. | Khang · 24/11/2026 |
| **BR-29** | Mọi câu nói về giá (báo, cảnh báo, trả lời) **phải nói rõ nguồn + thời điểm lấy** (vd "theo Wise, lấy lúc 11:00 ngày 24/11"). **AI không bao giờ đi tìm tỉ giá** (Gemini không tra được; tra web gói free gần như 0 lượt): số luôn lấy từ **kho bản chụp** (BR-04) hoặc BR-30. | Người dùng phải biết số đó cũ hay mới, của ai. | Khang · 24/11/2026 |
| **BR-30** | **Lấy giá ngay theo yêu cầu** ("mày lấy tỉ giá thời điểm hiện tại đi"): AI chỉ **chọn action** `lay_ty_gia_ngay`; **code thuần** đọc thẳng nguồn được chọn (Wise / VCB / VPBank — không qua AI, không tìm web) rồi AI viết lời, nói rõ nguồn + giờ (BR-29). **Thiếu nguồn → hỏi lại** người dùng muốn nguồn nào. Mỗi nguồn tối đa **1 lần đọc / 5 phút** (VCB yêu cầu ≤ 1 lần / 5 phút) — trong 5 phút dùng lại kết quả vừa đọc, kèm giờ. Nguồn lỗi → nói thật chưa lấy được + đưa bản gần nhất trong kho kèm giờ. Kết quả lấy ngay **không** dùng để cảnh báo (cảnh báo chỉ theo lịch BR-04). Là action **chỉ xem** → chạy luôn, không cần thẻ xác nhận. **Cách hiểu nguồn** (Khang dặn 24/11/2026 22:40; Kat chốt cách làm, Mode 2): nêu tên ("check VCB", "vietcombank", "VP bank với Wise") → đúng các nguồn đó · **"tùy mày" / "nguồn nào cũng được" / "sao cũng được"** → **Wise** (nguồn chuẩn BR-05; Wise đang tắt → nguồn bật đầu tiên) · **"tất cả nguồn" / "cả 3" / "lấy hết"** → **mọi nguồn Khang đang bật** · không nói nguồn → **hỏi lại**; câu trả lời cho câu hỏi đó trong **10 phút** (reply tin hỏi, hoặc gọi tên) được hiểu là trả lời câu hỏi · nguồn được hỏi đang bị Khang tắt (`/nguon`) → nói nguồn đó đang tắt, kể các nguồn đang bật. **Luật trước, AI sau:** khi đang chờ câu trả lời "nguồn nào?", code đọc từ khóa trước — rõ ràng thì không gọi AI; mơ hồ / có ý loại trừ ("tất cả trừ VCB") → để AI chọn tham số, code kiểm lại. | Khang (đề xuất action thay vì từ chối) · Kat (5 phút, không dùng cho cảnh báo — Mode 2) | Khang · 24/11/2026 |
| **BR-31** | **Tính cách chỉ BẬT / TẮT — cơ chế dùng chung cho CẢ Rây và Lũi** (`/tinhcach on|off` gõ với bot nào thì đổi bot đó, mặc định **tắt = ngoan** — Khang 25/11/2026); **nội dung tính cách + tâm trạng riêng của Lũi: Khang gửi sau** (tạm dùng số của Rây, khối STYLE ghi rõ "đang chờ"). **Rây:** **Bật = xỏ lá**: hay lý sự, hay phản biện (như đứa con nít hay hỏi lại điều người lớn nói), hay chọt, nói nhiều, hiền hơn Lũi. **Tắt = ngoan**: nữ sinh lớp 10 ngoan, lễ phép, "Dạ" thưa, câu cú rõ ràng, hầu như không phản biện, không chọt; xưng hô luôn lễ phép (em – anh chị) dù `/xungho` đặt gì. **Tính cách quyết định NÓI GÌ và KHI NÀO**: xác suất phản biện (bật ~55%, tắt ~8%), xác suất chọt (bật ~35%, tắt 0), hệ số chen chuyện (bật ×1,3, tắt ×0,8). | "tính cách là để ra quyết định nói gì? khi nào nói? phản biện ra sao? (hiền lành thì ít phản biện)" | Khang (ý) · Kat (con số, mặc định bật — Mode 2) · 25/11/2026 |
| **BR-32** | **14 tâm trạng** (`/tamtrang <mã>`, mặc định bình thường): bình thường · vui vẻ · thoải mái · hài hước dí dỏm · siêu hài hước · siêu bựa · khìn khìn · nghiêm túc · hơi căng · stress · cộc cằn · trầm tĩnh · tức giận · **không ổn định** (mỗi lần nói code bốc 1 tâm trạng, chọt mạnh ×1,5 — "hay xỏ lá chọt khe"). **Tâm trạng quyết định NÓI THẾ NÀO** (độ dài, số câu, emoji, mức đùa — bảng mục 9) và nắn nhẹ việc nói gì (tức giận phản biện ×1,5; trầm tĩnh ×0,6…). Tính cách tắt → tâm trạng "dịu" lại (cộc cằn = ngắn, hơi lạnh nhưng vẫn "Dạ"; tức giận = giận dỗi dễ thương). | "tâm trạng là để thể hiện cách nói (dài cộc lốc ngắn gọn...)" | Khang (danh sách) · Kat (bảng số — Mode 2) · 25/11/2026 |
| **BR-33** | **Giọng miền Nam (miền Tây Nam Bộ), kể cả khi ngoan**: dùng nha, nghen, nè, hông, chớ, tui, tụi mình, ba, má, heo, bắp, trái…; **tránh từ miền Bắc** (ạ, nhé, nhỉ, vâng, thế, đấy, bọn mình, tớ, bố, mẹ, lợn, ngô…). Lễ phép = "Dạ" ở đầu câu, **không "ạ" cuối câu**. Code **tự thay** các cặp an toàn (nhé → nha, thế nào → sao, đấy → đó, bỏ "ạ" cuối câu…) và ghi cảnh báo nếu còn sót. | "người miền nam, miền tây nam bộ không phải miền bắc" | Khang · 25/11/2026 |
| **BR-34** | **Code tính "chỉ thị nói"** cho mỗi lần gọi AI từ tính cách × tâm trạng × mục đích (trả lời số liệu / trò chuyện / chen chuyện / báo giá / cảnh báo / tóm tắt) × xác suất: lập trường (phản biện · chọt · đồng ý góp ý · trung lập · trả lời · bình giá · tóm tắt), độ dài (số chữ, số câu), emoji tối đa, mức đùa, kèm **mã chỉ thị** (vào log AI + khóa cache). Chuyện chính trị trong nước → code **ép trung lập** (BR-25). **Code kiểm lời AI**: từ tục theo BR-38; quá dài → cắt ở cuối câu; dư emoji → bỏ. | "Code có thể tính toán phức tạp kết hợp tham số và tâm trạng để gởi 1 tham số đặc biệt để API AI nói chuyện cho đúng" | Khang (ý) · Kat (cách làm — Mode 2) · 25/11/2026 |
| **BR-36** | **Ngữ cảnh trò chuyện trong MỌI lần gọi AI để nói vào nhóm (cả Rây và Lũi)**: AI không có trí nhớ → prompt luôn mang **15 tin gần nhất** của nhóm đó (cố định; tin của thành viên và của bot, cũ → mới, có giờ + người nói) + **bối cảnh tình hình do code tính**: còn mấy ngày có lương · giá Wise gần nhất kèm nguồn + giờ · xu hướng 24 giờ / 7 ngày (đi ngang < 0,2% · nhẹ · **trượt giảm mạnh / tăng mạnh** ≥ 0,6%) · cao / thấp nhất 7 ngày · 3 bài bot vừa gửi (vd "Lũi vừa gửi tin chiến sự Iran lúc 09:00") · 3 tin thời sự mới nhất. **Kho ngữ cảnh ngắn**: giữ tối đa **20 tin mới nhất / nhóm**, **mã hóa**, **xóa lúc 01:00** (BR-19); dùng **chỉ để làm ngữ cảnh** khi bot được gọi / tự nói, không tóm tắt, không gửi AI theo từng tin. **Cả khi tắt lắng nghe — Khang đồng ý 25/11/2026:** khi **tắt lắng nghe**, BR-16 cũ nói "bỏ ngay, không lưu" → khi đó bot được gọi (reply / @) sẽ không có ngữ cảnh. Kat đề xuất: **kho ngữ cảnh ngắn vẫn giữ 20 tin cả khi tắt lắng nghe** (tắt lắng nghe vẫn = không chen chuyện, không gọi tên, không lưu kho tóm tắt cuối ngày). Khang chốt: làm theo đề xuất. | "do AI API không có trí nhớ… prompt API AI phải có ít nhất 10-15 câu thoại chat lịch sử gần nhất… ghi thêm vài bối cảnh như tỉ giá đang trượt giảm thảm hại hay là 2 ngày nữa là có lương hay bot vừa gởi tin về chiến tranh Iran" | Khang (yêu cầu) · Kat (15 tin, ngưỡng xu hướng, kho 20 tin — Mode 2) · 25/11/2026 |
| **BR-37** | **Prompt không bao giờ phình theo thời gian**: mỗi phần có trần (15 tin chat × 300 ký tự · 8 dòng bối cảnh × 180 · câu hỏi 800 · 15 thành viên × 320 · 8 dòng bối cảnh chung × 220 · mô tả nhóm 600) và **trần tổng: SYSTEM ≤ 9.000, PROMPT ≤ 10.000 ký tự**. Vượt trần → bớt tin chat cũ (còn ≥ 5) → bớt dòng bối cảnh ít quan trọng → cắt câu hỏi; ghi lại đã bớt gì vào log AI. **Barie:** test mô phỏng 60 ngày dữ liệu tăng dần (3.000 tin, 60 bài bot) → độ dài prompt ngày 60 không lớn hơn ngày đầu quá 10% và luôn ≤ trần. | "make sure prompt không tự phình to theo thời gian… phải có giới hạn chiều dài prompt" | Khang · 25/11/2026 |
| **BR-38** | **Nói tục có giới hạn** (`/noituc 0..3`, mặc định **0 = cấm**): 1 = tục nhẹ (vãi, vl, đù, mẹ nó…) ≤ 1 từ / tin, ≤ 3 / ngày · 2 = nhẹ + vừa (đm, vcl, đéo…) ≤ 1 / tin, ≤ 5 / ngày · 3 = nhẹ + vừa ≤ 2 / tin, ≤ 8 / ngày. Chỉ khi **bật tính cách**; không bao giờ khi ngoan, tâm trạng nghiêm túc / trầm tĩnh, tóm tắt cho Khang, chuyện nhạy cảm (BR-25). **Từ cấm tuyệt đối** (tục tĩu tình dục, chửi thẳng vào người: địt, lồn, cặc, mẹ mày, đồ ngu…) ở mọi mức → bỏ câu AI, dùng câu soạn sẵn (BR-24). Tục vượt số lượng / sai bậc → code **che** (đ*), không bỏ cả câu. | "bạn có thể cho phép từ tục nhưng giới hạn được không?" | Khang (ý) · Kat (bậc, số lượng — Mode 2) · 25/11/2026 |
| **BR-39** | **Công tắc cảnh báo cả tháng** (`/canhbaocathang on|off`, mặc định **tắt**): bật → cảnh báo cắt mốc chạy **cả tháng**; tắt → chỉ **14 ngày cuối** (BR-03). Giới hạn số lần vẫn theo mức tần suất (BR-35). | "cho cảnh báo chạy full tháng, có công tắc bật việc này" | Khang · 25/11/2026 |
| **BR-40** | **Bot biết từng người trong nhóm là ai, làm gì** (cả Rây và Lũi) để trả lời đúng người, đúng chuyện. SYSTEM mang: **bối cảnh chung của nhóm** (vd nhóm A: mọi người code COBOL trên **IBM AS400 — không phải mainframe** — cho hệ thống lõi BH của công ty BH ở Singapore; đều trên 38 tuổi, có gia đình, con cái; làm từ xa ở VN cho công ty SGP, riêng Mít ở Singapore…) + **hồ sơ từng người** (tên, tên gọi khác như "sếp …", cách gọi, công việc, tính tình, gia đình). Dặn AI **không bịa chuyện riêng ngoài hồ sơ**. **Bot gọi mọi người bằng TÊN THẬT / cách gọi trong hồ sơ** (vd "sếp <tên thật> ơi"), **không bao giờ dùng biệt danh của repo** (Khang 25/11/2026) — prompt chỉ mang tên thật từ database; barie: biệt danh không được nằm trong `src/`. Hồ sơ còn ghi **người liên quan không ở trong nhóm** (vd sếp Sầu Riêng ở công ty SGP — siêu khó, tỉ mỉ, ai cũng sợ) để bot nói chuyện cho đúng. Hồ sơ thật (tên thật, năm sinh, con cái) **chỉ ở database** (BR-21) — nguồn nạp: `docs/rieng-tu/HO-SO-THANH-VIEN.md` (riêng tư, không lên Vercel, xóa trước khi public). Người nói trong đoạn chat được nhận ra theo **mã Telegram** (Khang gắn) hoặc **tên hiển thị khớp tên / tên gọi khác** (không dấu cũng được). | "Rẩy và Lũi đều biết về vài người trong nhóm họ là ai làm gì để trả lời cho chính xác" | Khang · 25/11/2026 |
| **BR-41** | **Lịch ngày lễ Singapore** (theo tài liệu của Khang \"Cách bot lấy, lưu và dùng ngày lễ (MOM Singapore)\" 25/11/2026, đổi \"file trên máy\" → **bảng database**): nguồn = trang MOM; **chỉ tải khi chưa có lịch năm đó**, tối đa **1 lần thử / ngày / năm**; từ **1/12** thử tải năm sau; từ **15/12** chưa có năm sau → nhắn Khang **1 lần** (`E-SRC-004`). Đọc trang: tiêu đề năm + bảng theo thứ tự trang, ô ngày nhiều kiểu (\"1 Jan 2026\", \"17 & 18 Feb\", \"31 Jan & 1 Feb\"); **kiểm chặt** — lệch năm / ngày không tồn tại / ít hơn 5 ngày → **bỏ cả năm**. Thứ tự đọc: database → bảng có sẵn trong code (2026: 11 ngày, không ghi database) → không có (không sập). **Nghỉ bù**: lễ Chủ nhật → thứ Hai (trùng lễ → thứ Ba…); thứ Bảy không tự bù. **Dọn dẹp**: xóa lịch cũ hơn 2 năm. **Dự phòng khi MOM chặn máy chủ cloud** (tài liệu của Khang ghi cloud không vào được MOM; máy ảo của Kat cũng bị chặn — KC-08): Khang tự thêm / xóa bằng `/ngayle them|xoa <YYYY-MM-DD> <tên>` (thẻ xác nhận). | Tài liệu của Khang | Khang · 25/11/2026 |
| **BR-42** | **Rây nhắc ngày lễ Singapore trong nhóm A** (AI diễn đạt, tự nhiên, không rập khuôn; ngày + tên lễ do code đưa): **đúng ngày lễ** (kể cả nghỉ bù) — buổi sáng 07:30–09:30 · **tuần sau có lễ** → 1 lần trong thứ Tư…Sáu tuần trước · **tháng sau có lễ** → 1 lần trong 3–5 ngày cuối tháng trước. Lỡ ngày (bot nghỉ) → nhắc bù trong cùng tuần / tháng nếu chưa nhắc. Lễ đầu tháng sau vừa được nhắc \"tháng sau\" trong tuần → không nhắc \"tuần sau\" nữa. Không nhắc trong giờ nghỉ (BR-09). Bối cảnh mọi prompt có dòng \"còn N ngày nữa là lễ …\" (30 ngày tới). | \"bot phải nhắc trong group A đúng vào ngày lễ… tuần sau… tháng sau… lời nhắc tự nhiên không rập khuôn\" | Khang (ý) · Kat (khung ngày giờ — Mode 2) · 25/11/2026 |
| **BR-43** | **Nhắc điền timesheet**: ngày điền = **thứ Sáu** (thứ Sáu là lễ → ngày làm việc liền trước); **\"thỉnh thoảng\" = 60% số tuần**, giờ ngẫu nhiên 14:00–17:00, trong nhóm A; công tắc `/nhactimesheet on|off` (mặc định bật). Ngày điền timesheet → bối cảnh prompt có dòng \"hôm nay là ngày điền TIMESHEET\" để bot nhắc lồng trong câu trả lời (vd \"lo code BAU cho xong rồi điền timesheet, nay thứ Sáu rồi\"). | \"thứ 6 mọi người phải điền timesheet, bot thỉnh thoảng nhắc\" | Khang · Kat (60%, giờ — Mode 2) · 25/11/2026 |
| **BR-44** | **Bot hiểu AI ĐANG HỎI và hoàn cảnh người đó** (cả 2 bot): người hỏi được nhận ra (BR-40) → PROMPT có khối \"NGƯỜI ĐANG HỎI\" (hồ sơ người đó: việc đang làm — vd Ổi luôn làm BAU / check prod issue — tính tình, gia đình) để trả lời **hợp hoàn cảnh**. Nhưng **không kể lại hồ sơ**; bị hỏi \"mày biết gì về tao / về X\" → **giả vờ chỉ biết sơ sơ**, đùa lảng đi. | \"bot phải hiểu ai đang hỏi và hoàn cảnh của người hỏi… khi người dùng hỏi 'mày biết gì về tao' thì bot giả vờ không biết rõ\" | Khang · 25/11/2026 |
| **BR-35** | **Mức tần suất 1–5** (`/tansuat <1-5>`, mặc định **3**): Rây tự báo giá và cảnh báo thường xuyên tới đâu — bảng mục 10. Mức 1, 2 theo đúng lời Khang; mức 3–5 tăng dần. Ngày lương luôn báo; mỗi ngày ≤ 1 lần báo, giờ ngẫu nhiên (BR-11). Đổi mức giữa tháng → lập lại lịch các ngày còn lại. Cảnh báo chỉ trong 14 ngày cuối tháng (BR-03), trừ khi bật cảnh báo cả tháng (BR-39). | "có command để Khang điều chỉnh mức độ thường xuyên mà Rẩy thông báo hay cảnh báo tỉ giá" | Khang (mức 1, 2) · Kat (mức 3–5, mặc định — Mode 2) · 25/11/2026 |

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
| `/tinhcach on|off` | Bật / tắt tính cách xỏ lá (BR-31) | đổi |
| `/tamtrang <mã>` (không gõ mã → hiện danh sách) | Tâm trạng (BR-32): `binhthuong vuive thoaimai haihuoc sieuhaihuoc sieubua khinkhin nghiemtuc hoicang stress coccan tramtinh tucgian baton` — gõ có dấu cũng hiểu ("siêu bựa") | đổi |
| `/tansuat 1..5` | Mức tần suất báo giá + cảnh báo (BR-35) | đổi |
| `/phongcach <mô tả>` | Phong cách thêm (BR-28) | đổi |
| `/gionghi 20:00-06:00` | Giờ nghỉ (BR-09) | đổi |
| `/nguon wise,vcb,vpbank` | Nguồn tỉ giá được dùng (Rây) | đổi |
| `/gannhom` | **Gõ trong group** (chỉ Khang): gắn group này làm group của bot (nhóm A cho Rây, nhóm B cho Lũi) → thẻ xác nhận. Group chưa gắn → bot im lặng ở đó (ATR-4). Không cần tra mã group | đổi |
| `/caidat` · `/lenh` | Xem toàn bộ cài đặt · xem danh sách lệnh (ví dụ trong danh sách đều có test chạy thật — Bẫy 35) | xem |
| `/canhbaocathang on|off` | Cảnh báo cả tháng / chỉ 14 ngày cuối (BR-39) | đổi |
| `/noituc 0..3` | Mức nói tục (BR-38) | đổi |
| `/nhactimesheet on|off` | Nhắc điền timesheet thứ Sáu (BR-43) | đổi |
| `/ngayle` · `/ngayle them <YYYY-MM-DD> <tên>` · `/ngayle xoa <YYYY-MM-DD>` | Xem lễ Singapore sắp tới · thêm / xóa tay (BR-41) | xem / đổi |
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
| `E-SRC-003` | Không tải / không đọc được lịch lễ MOM; đang dùng lịch đã lưu / có sẵn, mai thử lại. | Nếu thiếu lịch: `/ngayle them <ngày> <tên>`. |
| `E-SRC-004` | Qua 15/12 chưa có lịch lễ năm sau. | Bot vẫn thử mỗi ngày; muốn chắc thì `/ngayle them …` từng ngày. |
| `E-SYS-001` | Dọn dẹp 01:00 thất bại. | Báo Kat; dữ liệu riêng tư có thể chưa xóa. |
| `E-CFG-001` | Thiếu biến môi trường <tên>. | Thêm biến đó trên Vercel theo hướng dẫn cài đặt. |

---

## 5. Prompt gửi AI — khối bối cảnh (theo tài liệu gọi AI của Khang, mục 3 và 7)
- **SYSTEM** (ổn định): câu đầu "bạn không có trí nhớ giữa các lần gọi…"; **bot là ai** (tên, nhóm, việc); **nhóm**: mô tả, chủ đề hay bàn; **thành viên**: tên thật (BR-21), vai trò, quan hệ, cách gọi; **luật**: BR-14 (không bịa số), BR-25, BR-26; **xưng hô** (BR-27); **tính cách + tâm trạng + phong cách** (BR-28; Lũi: mục 8); **câu mẫu giọng** (Mít, Xoài, Ổi — câu ngắn về tỉ giá, đã Khang duyệt).
- **PROMPT** (mỗi lần, thứ tự cố định — `buildPrompt`): ngày giờ (code điền) · **bối cảnh tình hình** do code tính (BR-36) · **đoạn chat gần nhất 15 tin** (BR-36, bọc `"""…"""`, mỗi tin ≤ 300 ký tự) · câu cần trả lời · việc cần làm (danh sách action / nhiệm vụ) · "CÁCH NÓI LẦN NÀY" (BR-34) · **khuôn đầu ra JSON** ở cuối.
- **Không phình theo thời gian** (BR-37): mọi danh sách gửi kèm có trần số lượng + trần ký tự; SYSTEM ≤ 7.000 ký tự, PROMPT ≤ 10.000 ký tự.

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

## 9. Tính cách × tâm trạng (BR-31 → BR-34) — con số ở `src/config/persona.ts`, câu chữ ở `src/shared/persona.vi.ts`
**Hai lớp prompt** (tài liệu gọi AI của Khang mục 3.1): **SYSTEM** mang khối STYLE ổn định (tính cách, tâm trạng hiện tại, xưng hô, giọng miền Nam); **PROMPT** mang "CÁCH NÓI LẦN NÀY" do code tính mỗi lần (lập trường bốc ngẫu nhiên, số chữ, số câu, emoji, mức đùa, mã chỉ thị).

| Tâm trạng | Số chữ | Câu tối đa | Emoji | Đùa | Phản biện × | Chọt × | Chen chuyện × |
|---|---|---|---|---|---|---|---|
| bình thường | 10–35 | 3 | 1 | 1 | 1 | 1 | 1 |
| vui vẻ | 12–40 | 3 | 2 | 2 | 0,9 | 1,1 | 1,15 |
| thoải mái | 10–35 | 3 | 1 | 1 | 0,8 | 0,9 | 1 |
| hài hước dí dỏm | 12–40 | 3 | 2 | 2 | 1 | 1,2 | 1,15 |
| siêu hài hước | 15–50 | 4 | 3 | 3 | 1 | 1,3 | 1,25 |
| siêu bựa | 15–50 | 4 | 3 | 3 | 1,1 | 1,5 | 1,3 |
| khìn khìn | 8–40 | 4 | 2 | 3 | 1,1 | 1,2 | 1,2 |
| nghiêm túc | 15–50 | 4 | 0 | 0 | 0,8 | 0,2 | 0,8 |
| hơi căng | 6–20 | 2 | 0 | 0 | 1,1 | 0,6 | 0,8 |
| stress | 4–18 | 2 | 0 | 0 | 0,9 | 0,4 | 0,6 |
| cộc cằn | 2–10 | 1 | 0 | 0 | 1,2 | 0,8 | 0,7 |
| trầm tĩnh | 10–30 | 3 | 0 | 1 | 0,6 | 0,3 | 0,6 |
| tức giận | 4–20 | 2 | 1 | 0 | 1,5 | 1 | 0,9 |
| không ổn định | bốc 1 trong: vui vẻ, khìn khìn, cộc cằn, siêu bựa (trọng số 2) · hơi căng, tức giận (1) | | | | | chọt ×1,5 | ×1,1 |

**Tính cách:** bật (xỏ lá) — phản biện gốc 55%, chọt gốc 35%, chen chuyện ×1,3, nói dài ×1,25 · tắt (ngoan) — phản biện 8%, chọt 0, chen chuyện ×0,8, emoji ≤ 1. Xác suất cuối = gốc × hệ số tâm trạng, trần phản biện 90%, chọt 70%. **Độ dài theo mục đích:** chen chuyện ×0,7 · báo giá / cảnh báo ×0,8 · tóm tắt cho Khang 60–250 chữ. Lời AI dài hơn 1,6 × tối đa → code cắt ở cuối câu.

## 10. Mức tần suất (BR-35) — `src/config/frequency.ts`
"Đầu tháng" = trước 14 ngày cuối · "14 ngày cuối" = khung cảnh báo (BR-03), gồm tuần áp chót + tuần lương. Lịch 14 ngày cuối nối chuỗi **lùi từ ngày lương** (ngày lương luôn báo).

| Mức | Đầu tháng | 14 ngày cuối | Cảnh báo |
|---|---|---|---|
| 1 (Khang) | **1 lần** | cách **4–5 ngày** 1 lần (Khang 25/11: thưa hơn mức 2) | tối đa **1 lần / 3 ngày** |
| 2 (Khang) | **3 lần**, cách **4–5 ngày** | cách **3 ngày** 1 lần | tối đa **2 lần / 2 ngày** |
| **3 (mặc định)** | 4 lần, cách 3–4 ngày | tuần lương: 4–6 lần, không nghỉ 2 ngày liền (BR-10) · tuần áp chót: cách 2 ngày | tối đa 2 lần / 24 giờ |
| 4 | 6 lần, cách 2–3 ngày | tuần lương: mỗi ngày · tuần áp chót: cách 1–2 ngày | tối đa 3 lần / 24 giờ |
| 5 | cách 1–2 ngày (kín đầu tháng) | mỗi ngày | tối đa 4 lần / 24 giờ |

Mọi mức: cảnh báo cách nhau ≥ 3 giờ; giờ nghỉ → chờ; hết lượt → bỏ. Tháng ngắn không đủ chỗ → giảm số lần đầu tháng chứ không ép 2 lần sát nhau.

## 11. Ngày lễ — đối chiếu tài liệu của Khang "Cách bot lấy, lưu và dùng ngày lễ (MOM Singapore)" (BR-41) — làm GIỐNG tài liệu, chỉ đổi chỗ lưu
| Mục tài liệu | Trong dự án này | Khác tài liệu? |
|---|---|---|
| 1. Nguồn = trang MOM (`https://`), tắt tải được | `MOM_HOLIDAYS_URL` (`config/holidays.ts`); công tắc `fetchEnabled` | Không |
| 1. Ai tải | Máy chủ Vercel (không có laptop) — **có thể bị MOM chặn như tài liệu ghi** → KC-08 + `/ngayle` | Có: không có laptop |
| 2. Thứ tự đọc: RAM → file → file timesheet → bảng có sẵn (2026, 11 ngày) → không có (cảnh báo, không sập) | database → bảng có sẵn (2026, 11 ngày, **không ghi database**) → không có (`HOLIDAYS_MISSING`) | Không có RAM / file timesheet (serverless, không có app timesheet) |
| 2. Ngày tự khai (`extra_off_days`, `/off`) cộng thêm | `/ngayle them` (Khang, thẻ xác nhận) | Đổi tên lệnh |
| 3. Tải khi chưa có lịch năm đó; 1 lần thử / ngày / năm; ghi "đã thử hôm nay" trước khi tải; từ 1/12 tải năm sau; 15/12 chưa có → nhắn 1 lần, vẫn thử mỗi ngày | `decideYearsToFetch`, `shouldWarnMissingNextYear` (`E-SRC-004`) — chạy trong `/api/tick` lúc dọn dẹp hằng ngày | Không |
| 3. Timeout 20 giây, tối đa 5 MB | `HOLIDAY_FETCH_TIMEOUT_MS`, `HOLIDAY_PAGE_MAX_BYTES` | Không |
| 4. Đọc trang: tiêu đề năm (`id="Year-…"`, chữ năm, caption) + bảng; cột Holiday / Date; ô ngày "1 Jan 2026", "17 & 18 Feb 2026", "31 Jan & 1 Feb"; cắt ghi chú tên | `parseMomHolidays`, `parseDateCell` | Không |
| 4. Kiểm chặt: lệch năm / ngày không tồn tại / < 5 ngày → bỏ cả năm; không đọc được năm nào = lỗi | Có, kèm lý do (`HOLIDAYS_REJECTED`, `E-SRC-003`) | Không |
| 5. Lưu `{year, dates, source, fetched_at}`; ghi an toàn; đọc lại sai định dạng / lệch năm → bỏ qua, không xóa | Bảng database (ghi 1 lệnh, nguyên tử); `isValidStoredYear` | File → bảng |
| 6. Dọn: xóa lịch cũ hơn 2 năm; bỏ năm cũ trong ghi nhận "đã thử" | `yearsToPurge` (cả 2 bảng) trong dọn dẹp 01:00 | Không |
| 7. Nghỉ bù: Chủ nhật → thứ Hai (trùng lễ → thứ Ba…); thứ Bảy không tự bù | `withObservedDays` | Không |
| 8. Audit: `HOLIDAYS_FETCHED`, `HOLIDAYS_FETCH_FAIL`, `HOLIDAYS_REJECTED`, `HOLIDAYS_MISSING`; `/status` hiện nguồn lịch + lễ tới | `HOLIDAY_AUDIT_EVENTS`; `/ngayle` + `/trangthai` hiện nguồn + lễ tới | Không |
| 9. Ép tải lại | Khang xóa năm đó bằng lệnh (sau) hoặc `/ngayle them` | Không có file để xóa |

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
| KC-08 | Vercel có vào được trang MOM không (tài liệu của Khang: máy chủ cloud **không** vào được; máy ảo của Kat cũng bị chặn) | Thử ở lần deploy đầu; không vào được → dùng bảng có sẵn + `/ngayle them` (BR-41); cân nhắc nguồn data.gov.sg (dữ liệu mở chính phủ SG) — hỏi Khang trước khi thêm nguồn |
| KC-07 | **Không lộ file tĩnh**: Vercel không phát `docs/`, `prototype-v0/`… ra địa chỉ công khai (repo private nhưng địa chỉ `.vercel.app` ai cũng mở được) | Đã chặn 2 lớp: `vercel.json` (`outputDirectory: public` — chỉ thư mục rỗng `public/`) + `.vercelignore` (không tải `docs/`, `prototype-v0/`, `tests/`…). Sau deploy đầu: mở `https://<app>.vercel.app/docs/specs/02-functional-spec.md` phải ra **404** |

## Phụ lục C — Bảng ATR bảo mật (skill 6.17) — đánh số bỏ qua 13
| ATR | Kiểm | Trạng thái | Bằng chứng / việc phải làm |
|---|---|---|---|
| ATR-1 | Webhook kiểm `secret_token` **trước khi đọc** tin, so thời gian cố định; mỗi bot 1 mã riêng | Một phần | `src/shared/secret-compare.ts` (so băm, thời gian cố định) + test `tests/telegram.test.ts`; còn: route webhook trả 401 |
| ATR-2 | Chỉ nhận IP của Telegram | Không áp dụng (bắt buộc) | Có ATR-1; có thể thêm sau |
| ATR-3 | `/api/tick` kiểm `Bearer`; khóa chống chạy chồng; việc 1 lần / ngày có cờ đã chạy | Thiếu | Test "thiếu mã → 401", "chạy 2 lần → 1 lần" |
| ATR-4 | Chỉ phục vụ đúng nhóm A / nhóm B / chat riêng của Khang; chat lạ → im | Một phần | `routeMessage` (`src/services/access.service.ts`) + test nhóm chưa gắn / nhóm lạ / người lạ → im; còn: nối vào webhook |
| ATR-5 | Mọi lệnh đổi cấu hình + nhắn thay qua **thẻ xác nhận** | Thiếu | Test bấm ✅ / ❌ |
| ATR-6 | Phiên web | Không áp dụng | Không có web |
| ATR-7 | Mật khẩu / PIN | Không áp dụng | Nhận diện Khang bằng mã tài khoản Telegram |
| ATR-8 | Phân quyền mọi điểm vào (lệnh Khang chỉ từ mã tài khoản Khang) | Một phần | `routeMessage` + test người khác gõ `/gannhom` / chat riêng → im; còn: kiểm người bấm nút thẻ xác nhận = Khang |
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
