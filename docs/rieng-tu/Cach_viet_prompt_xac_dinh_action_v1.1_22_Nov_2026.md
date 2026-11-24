# Cách viết prompt để AI API tự xác định đúng action từ câu nhắn tự nhiên

Tác giả: Khang Nguyen, viết cùng AI Claude (Anthropic) · 20/11/2026 · rút từ dự án Focus Tracker (bản 2.13.0)

File này giải thích vì sao tin nhắn «mình dạo chơi bao lâu rồi?» (không có từ khoá, không theo mẫu câu) vẫn được bot hiểu là xem lần vắng gần nhất (`xem_vang`) chỉ bằng **một lần gọi AI, không hỏi lại**, dù AI API không có trí nhớ. Dùng làm khuôn cho các dự án sau.

---

## 1. Tóm tắt: 8 điều làm nên kết quả

| # | Điều | Vì sao quan trọng |
|---|---|---|
| 1 | **Mỗi lần gọi tự mô tả đủ hoàn cảnh** (app là gì, người dùng là ai, làm gì, giờ giấc, luật tính) | AI không nhớ gì giữa 2 lần gọi. Cái AI không được cho biết thì nó không biết |
| 2 | **Cho AI một danh sách action đóng** (catalog), buộc chọn ĐÚNG MỘT tên trong đó | AI không được bịa lệnh; chọn sai thì code từ chối được |
| 3 | **Mỗi action có mô tả bằng lời của người dùng**, kèm ví dụ cách người ta thật sự hỏi | Đây là phần quyết định nhất: AI so nghĩa câu nhắn với mô tả, không so từ khoá |
| 4 | **Tham số có kiểu** (ngày, giờ, on/off, mức...), mô tả kèm các giá trị cho phép | AI điền đúng định dạng, code kiểm lại được |
| 5 | **Quy tắc chỉ viết cho chỗ dễ nhầm**, rút từ lỗi thật | Prompt ngắn, mỗi dòng đều có lý do |
| 6 | **Đầu ra ép về một dòng JSON**, không giải thích | Dễ parse, nhanh (ví dụ này AI trả 4 từ, 1,1 giây), rẻ |
| 7 | **Code kiểm tra lại mọi thứ AI trả** (`validate`), và có đường lui bằng từ khoá khi AI lỗi | AI chỉ là bộ hiểu ý; code mới là bộ quyết định |
| 8 | **Phân loại action theo rủi ro**: chỉ xem thì chạy luôn, ghi/đổi dữ liệu thì hỏi OK | Không cần hỏi lại «có phải bro muốn xem giờ đi vắng không?» với việc chỉ xem |

---

## 2. Đường đi của một tin nhắn

```
Tin nhắn «mình dạo chơi bao lâu rồi?»
   |
   v
Có lệnh gạch chéo (/vang)?
   |-- CÓ --> chạy thẳng action đó, KHÔNG gọi AI (nhanh, miễn phí)
   |-- KHÔNG
   v
Gọi AI (intent.by_ai):
   system = BỐI CẢNH + dặn nhiệm vụ "chọn đúng một action, chỉ trả JSON"
   prompt = ngày hôm nay + danh sách action + tin nhắn + quy tắc
   |
   v
AI trả: {"action": "xem_vang", "args": {}}
   |
   v
Code kiểm tra: tên action có trong danh sách? args đúng kiểu? (validate)
   |-- SAI / AI lỗi / hết quota --> đường lui: đọc bằng từ khoá (intent.by_rules)
   |                                  |-- không hiểu --> bot báo "chưa hiểu" + danh sách lệnh. HẾT
   v
Action chỉ xem?
   |-- CÓ --> hiện 1 dòng "🔎 Bíp hiểu là: Vừa vắng bao lâu (xem_vang...)" rồi chạy luôn. HẾT
   |-- KHÔNG (ghi / đổi dữ liệu)
   v
Thẻ xác nhận: "Mình hiểu bạn muốn... ✅ OK / ✏️ Sửa lại / ❌ Huỷ"
   (có cảnh báo nếu cách đọc bằng từ khoá khác cách AI hiểu)
```

Trong ví dụ của bờ rồ: lệnh `xem_vang` chỉ xem nên đi nhánh «chạy luôn». Đúng như log: `Hiểu tin nhắn bằng ai: xem_vang {}` → gửi dòng «Bíp hiểu là» → `Action xem_vang {}` → gửi kết quả.

---

## 3. Giải phẫu prompt thật (lần gọi 16:32:47 ngày 20/11/2026)

Một lần gọi gồm **2 phần gửi riêng**: SYSTEM (luật chung, ổn định) và PROMPT (việc cụ thể lần này). Thứ tự bên trong từng phần có chủ ý.

### 3.1 SYSTEM, lớp 1: BỐI CẢNH (chung cho MỌI lần gọi AI trong app)

Code: `focus/ai_context.py`, hàm `system_prompt()`. Hàm gọi AI duy nhất (`ai_client.generate`) **tự gắn** khối này lên đầu mọi lần gọi, nên không nơi nào quên được. Đây là lý do AI «biết» mọi thứ dù không có trí nhớ.

Gồm 3 khối:

| Khối | Nội dung | Vì sao cần cho việc hiểu lệnh |
|---|---|---|
| APP | App là gì, chạy ở đâu, đo cái gì, KHÔNG đo cái gì, luật tính tập trung | Để từ như «vắng», «inactive», «dạo chơi» được hiểu là chuyện đo phím/chuột, không phải chuyện đời thường |
| WORK | Công việc của người dùng, giờ làm, nghỉ trưa, mục tiêu | Câu «vừa nghỉ trưa xong» hay «làm bù» phải đặt đúng vào giờ giấc của người này |
| STYLE | Cách xưng hô, giọng, quy tắc emoji, quy tắc trích dẫn, thông tin người dùng | Tin hiểu lệnh không cần giọng, nhưng khối này dùng chung để mọi lần gọi nhất quán |

Bản thật gửi lần này (rút nguyên văn từ log):

```
BỐI CẢNH (bạn không có trí nhớ giữa các lần gọi, mọi thông tin cần thiết đều nằm dưới đây):
- Bạn là trợ lý của "Focus Tracker", một app nhỏ chạy trên máy tính của người dùng (laptop Windows),
  nói chuyện với người dùng qua bot Telegram.
- Người dùng làm việc bên trong máy ảo VDI (Citrix Desktop Viewer). App chỉ đo từ bên ngoài: cửa sổ nào
  đang ở trước, chuột/bàn phím có dùng không, máy có khoá không. App KHÔNG đọc nội dung màn hình, email hay code.
- Luật tính tập trung: chỉ thời gian cửa sổ VDI ở trước VÀ có thao tác chuột/phím mới tính là làm việc. ...
  "Tập trung sâu" là các khối làm liên tục trong VDI từ 20 phút trở lên.
- App ngoài VDI (trình duyệt, ...) có thể là việc phục vụ công việc: gọi là "thời gian ngoài VDI", không
  khẳng định người dùng đang chơi, không chê "nghiện" hay "bỏ bê" app nào.
- Sao nhãng, ngồi yên, rời máy CHỈ đo trong giờ làm chính thức (không tính giờ nghỉ trưa). Ngoài giờ ... app
  chỉ cộng thêm thời gian làm trong VDI (làm ngoài giờ / OT), không ghi sao nhãng.

- Công việc của người dùng: Lập trình viên/BA hệ thống lõi bảo hiểm nhân thọ Life Asia ... chạy trên IBM i
  (AS400), viết bằng COBOL ...; làm việc qua máy ảo VDI Citrix.
- Giờ làm 08:00–17:30, nghỉ trưa 11:25–12:30. Mục tiêu tập trung sâu: 4 giờ/ngày.

CÁCH NÓI:
- Viết tiếng Việt, gửi qua Telegram: văn bản thường, không tiêu đề markdown, không bảng. Emoji: ...
- Cụ thể, dựa trên số liệu được cung cấp, không bịa số, không lên lớp chung chung.
- Không bịa câu trích dẫn hay nguồn. ...
- Gọi người dùng là "bờ rồ", tự xưng là "Bíp". Giọng hài hước ... Người dùng tên Khang. Tuổi: 41. ...
  Sếp của người dùng là Ted; ...
```

**Nguyên tắc viết khối bối cảnh**
- Câu đầu tiên luôn nói rõ **AI không có trí nhớ** và mọi thứ cần biết nằm ngay bên dưới.
- Viết **cả điều app KHÔNG làm** («không đọc nội dung màn hình»). Chặn AI suy diễn quá đà.
- Viết **luật tính toán** bằng lời rõ ràng, để AI không tự bịa công thức.
- Thông tin riêng của người dùng (tên, công việc, giờ làm) **không viết cứng trong code**, lấy từ file cấu hình (`work_context` trong `settings.json`, `persona.json`). Dự án dùng chung cho nhiều người vẫn đúng.
- Khối này **ổn định, không đổi theo từng tin nhắn**. Nội dung đổi mỗi lần nằm ở PROMPT, không nằm ở đây.

### 3.2 SYSTEM, lớp 2: vai trò và định dạng đầu ra (riêng cho việc hiểu lệnh)

Code: hằng `SYSTEM` trong `focus/intent.py`. Chỉ 3 dòng, nhưng mỗi dòng có việc:

```
Bạn là bộ phân tích lệnh cho bot Telegram theo dõi tập trung của một người làm việc trong máy ảo VDI.
Nhiệm vụ: đọc tin nhắn tiếng Việt và chọn ĐÚNG MỘT action trong danh sách, kèm tham số.
Chỉ trả về JSON một dòng, không giải thích, không markdown.
```

| Dòng | Việc |
|---|---|
| Vai trò | «Bộ phân tích lệnh», không phải «trợ lý trò chuyện». AI bớt xu hướng nói nhiều |
| ĐÚNG MỘT action | Không trả 2 phương án, không trả «có lẽ là...» |
| Chỉ JSON một dòng | Dễ parse, trả về rất ngắn (lần này 4 từ), nhanh và rẻ |

### 3.3 PROMPT, phần A: ngày hôm nay

```
Hôm nay là 2026-11-20 (thứ Sáu). Danh sách action:
```

AI không biết hôm nay là ngày nào. Có dòng này AI mới đổi được «mai», «thứ 6 này», «hôm qua» thành `YYYY-MM-DD`. Code tự điền ngày, không để AI đoán.

### 3.4 PROMPT, phần B: danh sách action (catalog), PHẦN QUAN TRỌNG NHẤT

Code: `actions.catalog()` sinh JSON từ danh sách `ACTIONS`. Mỗi action có `action` (tên), `mo_ta` (mô tả), `tham_so` (tham số):

```json
{"action": "xem_vang",
 "mo_ta": "Xem lần vắng gần nhất (không chạm phím/chuột, khoá máy, máy ngủ: từ mấy giờ tới mấy giờ, bao lâu),
           lúc này có đang vắng không, và các lần vắng từ 5 phút trong ngày; trả lời câu hỏi kiểu
           'mình vừa inactive / đi vắng bao lâu'",
 "tham_so": {"day": "pastdate: ngày đã qua muốn xem lại (bỏ trống = hôm nay) (không bắt buộc)"}}
```

Vài action khác trong cùng danh sách (để thấy cách AI phân biệt):

```json
{"action": "xem_trang_thai", "mo_ta": "Lúc này đang trong VDI hay ngoài, idle bao lâu", "tham_so": {}}
{"action": "ghi_phan_tam", "mo_ta": "Ghi điều làm mất tập trung hoặc lý do vừa bị gián đoạn hôm nay (con khóc, việc nhà, họp đột xuất...)", "tham_so": {"text": "text: điều làm mất tập trung"}}
{"action": "hoi_ai", "mo_ta": "Hỏi AI bất kỳ câu gì (...) và nhận câu trả lời; hoặc bật/tắt chế độ hỏi AI", "tham_so": {"text": "text: câu hỏi, hoặc on / off (không bắt buộc)"}}
{"action": "tro_chuyen", "mo_ta": "Tâm sự, than mệt, chán, cần động viên, hoặc tin nhắn không thuộc thao tác nào ở trên", "tham_so": {"text": "text: tin nhắn (không bắt buộc)"}}
```

(Bản thật có 42 action, khoảng 2.400 từ cả prompt.)

**Cách viết `mo_ta` để AI chọn trúng** (đây là bí quyết chính):

| Quy tắc | Ví dụ đúng | Ví dụ kém |
|---|---|---|
| Mô tả **việc người dùng muốn**, không mô tả code | «Xem lần vắng gần nhất... bao lâu» | «Gọi hàm absence.summarize» |
| Chèn **1 cụm câu hỏi thật** người ta hay nói | «trả lời câu hỏi kiểu 'mình vừa inactive / đi vắng bao lâu'» | Chỉ ghi «xem vắng mặt» |
| Nói rõ **trả về cái gì** (từ mấy giờ tới mấy giờ, bao lâu, lúc này có đang vắng không) | Liệt kê các mảnh thông tin | «Xem thông tin vắng» |
| Dùng **từ đồng nghĩa tự nhiên**: không chạm phím/chuột, khoá máy, máy ngủ, đi vắng, rời máy | Phủ nhiều cách nói | Chỉ một thuật ngữ nội bộ |
| Phân biệt với action gần nghĩa bằng lời | `xem_trang_thai` = «lúc này đang trong VDI hay ngoài, idle bao lâu»; `xem_vang` = «lần vắng gần nhất, các lần vắng trong ngày» | Hai mô tả gần giống nhau |
| Luôn có 1 action **bắt phần dư** | `tro_chuyen` («không thuộc thao tác nào ở trên») và `hoi_ai` (câu hỏi cần trả lời) | Không có chỗ cho câu lạ, AI buộc phải chọn bừa |

**Tham số có kiểu.** Mỗi tham số ghi `kiểu: ý nghĩa (không bắt buộc)`. Ví dụ `pastdate: ngày đã qua...`, `onoff: on (bật) / off (tắt)`, `nudgelevel: mức: off | nhe | vua | nghiem`, `clock: giờ BẬT bot HH:MM (24h)`. Nhờ vậy AI điền `"day": "2026-11-19"` chứ không điền «hôm qua».

### 3.5 PROMPT, phần C: tin nhắn của người dùng

```
Tin nhắn của người dùng: """mình dạo chơi bao lâu rồi?"""
```

- Bọc trong **ba dấu nháy kép** để AI biết đâu là dữ liệu, đâu là chỉ dẫn. Nhờ vậy câu người dùng gõ ít bị lẫn với chỉ dẫn (không chặn tuyệt đối, nên code vẫn kiểm lại kết quả ở mục 6).
- Cắt tối đa 1.000 ký tự (code: `text[:1000]`).
- Đặt **sau** catalog và **trước** quy tắc: AI đọc xong các lựa chọn rồi mới thấy câu cần xử lý, rồi thấy luật cuối cùng ngay trước khi trả lời.

### 3.6 PROMPT, phần D: quy tắc

```
- Chọn action khớp nhất. Câu HỎI cần được trả lời (kiến thức, lời khuyên, giá vàng, tỷ giá, cách làm...)
  -> "hoi_ai" với text là nguyên câu hỏi. Tin nhắn tâm sự, than mệt/chán hoặc không thuộc action nào
  -> "tro_chuyen".
- Kể lý do vừa bị gián đoạn, bận việc khác ("nãy giờ bận trông em bé khóc", "bị sếp gọi đi họp gấp")
  -> "ghi_phan_tam" với text là nguyên câu, KHÔNG phải "tro_chuyen".
- Tham số text: giữ nguyên ý và từ ngữ của người dùng, bỏ phần dẫn như "ghi giúp", "việc ngày mai là".
- Ngày dạng YYYY-MM-DD (tự tính "mai", "thứ 6 này"...). Giờ dạng HH:MM 24h.
- Không đoán bừa tham số bắt buộc; thiếu thì vẫn chọn action và để trống.
- Nghỉ phép ... -> "nghi_phep" với part = am | pm | full ... Huỷ nghỉ -> "bao_di_lam".
- Giờ bot (tracker) tự bật / tự tắt ... -> "gio_bot" với start / stop HH:MM 24h ("6 giờ chiều" = 18:00) ...
Trả về: {"action": "<tên>", "args": {...}}
```

**Quy tắc chỉ nhắm vào chỗ AI dễ nhầm**, không lặp lại điều AI vốn làm đúng:

| Chỗ dễ nhầm | Dòng quy tắc |
|---|---|
| Kể chuyện bị gián đoạn nghe giống tán gẫu (`tro_chuyen`). Code còn có một lớp chặn riêng cho trường hợp này (mục 6, lớp 5) | «Kể lý do vừa bị gián đoạn → ghi_phan_tam, KHÔNG phải tro_chuyen» |
| Giờ nói kiểu đời thường | «"6 giờ chiều" = 18:00» |
| Ngày tương đối | «"sáng mai"/"chiều mai" = buổi đó của NGÀY MAI» |
| Phần dẫn lẫn vào nội dung ghi | «giữ nguyên ý, bỏ phần dẫn như "ghi giúp"» |

Điều đáng nhớ: **đừng nhồi quy tắc từ đầu**. Chạy thật, đọc log prompt, thấy AI nhầm ở đâu thì thêm đúng một dòng cho chỗ đó. Prompt ngắn thì AI chú ý được mọi dòng; prompt dài thì dòng nào cũng bị loãng.

### 3.7 Câu cuối: khuôn đầu ra

```
Trả về: {"action": "<tên>", "args": {...}}
```

Đặt ở **cuối cùng** của prompt: câu gần chỗ AI bắt đầu viết nhất sẽ được nghe nhất. Kết quả lần này: `{"action": "xem_vang", "args": {}}`.

---

## 4. Vì sao «mình dạo chơi bao lâu rồi?» vẫn trúng

AI không so từ khoá. Nó đọc câu nhắn trong hoàn cảnh đã cho và suy ra:

```
BỐI CẢNH nói: app đo phím/chuột, "rời máy", "ngồi yên" là các khái niệm có thật
      |
Câu nhắn: "dạo chơi bao lâu rồi" -> hỏi về một khoảng thời gian không ở bàn
      |
So với các action:
   xem_trang_thai   "lúc này ... idle bao lâu"          -> chỉ nói lúc này, không nói khoảng đã qua
   xem_hom_nay      "số liệu tập trung, điểm, chuỗi..."  -> không phải thời gian vắng
   hoi_ai           "câu hỏi kiến thức, lời khuyên"       -> câu này tra số liệu, không phải kiến thức
   tro_chuyen       "than mệt, tâm sự"                    -> không phải tâm sự
   xem_vang         "lần vắng gần nhất ... bao lâu ... trả lời câu hỏi kiểu 'đi vắng bao lâu'"
                                                           -> KHỚP NGHĨA NHẤT
      |
{"action": "xem_vang", "args": {}}
```

Hai chi tiết làm nên khác biệt (xem thêm mục 4.1: AI tự so nghĩa, code không dịch gì):
1. Mô tả của `xem_vang` có cụm **«mình vừa inactive / đi vắng bao lâu»**: một câu mẫu để AI nắm loại việc, gần nghĩa với «dạo chơi bao lâu rồi». Câu của người dùng **không cần trùng** cụm này.
2. Các action gần nghĩa đã được **mô tả khác nhau rõ ràng** (mục 3.4).

Cần nói thẳng một điều: đây là **một ví dụ thành công**, không phải bằng chứng AI luôn đúng. AI vẫn có thể nhầm với câu mơ hồ, nên mới có các lớp bảo vệ ở mục 6.

### 4.1 Ai dịch «dạo chơi bao lâu rồi?» thành `xem_vang`? Câu trả lời: chính AI, không có bước dịch nào trong code

Không có bước nào «dịch câu của người dùng sang cụm từ khoá rồi tra bảng». Code **không** so khớp «dạo chơi» với «đi vắng». Việc hiểu nghĩa diễn ra **bên trong mô hình AI** trong đúng một lần gọi:

```
Code gửi: [bối cảnh] + [42 action, mỗi cái có mô tả bằng lời] + [câu của người dùng]
   |
   v
Mô hình AI tự đọc cả ba rồi quyết định (đây là việc nó giỏi: hiểu nghĩa, không cần trùng chữ)
   |
   v
Trả về duy nhất cái TÊN: {"action": "xem_vang", "args": {}}
   |
   v
Code chỉ làm việc cơ học: tên có trong danh sách không? -> có -> chạy hàm của action đó
```

Vai trò của hai bên:

| Bên | Làm gì | Không làm gì |
|---|---|---|
| **AI** | Hiểu nghĩa câu của người dùng, so với mô tả các action, chọn một tên, điền tham số | Không chạy gì cả, chỉ trả JSON |
| **Code** | Đưa mô tả action cho AI, kiểm tên và tham số AI trả về, chạy hàm tương ứng | Không hiểu nghĩa, không dịch, không tra từ đồng nghĩa |

**«Mô tả có cụm mẫu» có tác dụng gì, nếu không phải để tra khớp?** Cụm «mình vừa inactive / đi vắng bao lâu» là **ví dụ để AI hiểu action này dùng cho loại câu hỏi nào**, giống đưa một người mới một mẩu giấy ghi «việc này dùng khi khách hỏi kiểu...». AI không cần câu của người dùng trùng cụm đó. Nó thấy «bao lâu rồi» + «dạo chơi» (đi đâu đó, không ở bàn) gần nghĩa với «đi vắng bao lâu» nên chọn `xem_vang`. Cụm mẫu càng đại diện đúng loại việc thì AI càng chọn trúng; không có cụm mẫu thì AI vẫn thường chọn được, chỉ kém chắc chắn hơn.

**Kiểm chứng bằng chính ví dụ này** (chạy trên code hiện tại, bước từ khoá, không gọi AI):

| Câu | Đường từ khoá (dự phòng) hiểu thành | Đường AI hiểu thành |
|---|---|---|
| «mình đi vắng bao lâu rồi» | `xem_vang` (vì có từ khoá «di vang bao lau») | `xem_vang` |
| «mình dạo chơi bao lâu rồi?» | `hoi_ai` (câu hỏi chung, không có từ khoá nào khớp) | **`xem_vang`** ✔ |

Tức là: nếu bot chỉ dựa từ khoá thì câu «dạo chơi» **không** trúng được. Việc nó trúng ở log 16:32 hoàn toàn là nhờ AI hiểu nghĩa. Từ khoá chỉ là đường lui khi AI không dùng được (hết quota, mất mạng), và phải liệt kê từng cách nói mới nhận ra.

**Hai cách thiết kế khác để đối chiếu**

| Cách | Mô tả | Ưu | Nhược |
|---|---|---|---|
| **A. AI chọn thẳng action từ danh sách mô tả** (dự án này) | Một lần gọi, AI nhìn cả danh sách | Đơn giản, hiểu được câu chưa ai lường trước, thêm action chỉ cần thêm mô tả | Mỗi lần gửi cả danh sách (tốn token đầu vào), phụ thuộc chất lượng mô tả |
| **B. Từ khoá / bảng cụm từ đồng nghĩa** | Code tự tra bảng «dạo chơi → đi vắng» | Không cần AI, rẻ, chắc chắn | Phải tự liệt kê mọi cách nói; câu mới là trượt. «Dạo chơi» chưa có trong bảng thì không trúng |
| **C. Embedding (so độ gần nghĩa bằng vector)** | Biến câu người dùng và mô tả action thành vector, chọn action gần nhất | Rẻ khi danh sách rất dài (hàng trăm action) | Phải dựng thêm hạ tầng; kém AI ở câu có tham số hay câu mơ hồ. Dự án này không dùng |

Dự án này dùng **A là đường chính, B là đường lui**.

**Bài học khi viết mô tả action**: đừng cố liệt kê mọi cách nói (việc đó là của cách B). Hãy mô tả **ý định** và cho **một đến hai cụm mẫu đại diện** để AI nắm loại việc, rồi để AI lo phần còn lại.

---

## 5. «Không cần xác nhận lại»: phân loại theo rủi ro

Đây là quyết định thiết kế, không phải chuyện của prompt.

| Loại action | Ví dụ | Hành vi trong Focus Tracker | Lý do |
|---|---|---|---|
| **Chỉ xem** (không đổi dữ liệu) | `xem_vang`, `xem_hom_nay`, `xem_trang_thai`, `xem_tuan` | Chạy luôn. Chỉ hiện 1 dòng «🔎 Bíp hiểu là: ...» | Hiểu nhầm cũng không mất gì, xem lại là xong |
| **Ghi / đổi dữ liệu** | `ghi_output`, `nghi_phep`, `gio_bot`, `chay_24_24` | Hiện thẻ «Mình hiểu bạn muốn... ✅ OK / ✏️ Sửa lại / ❌ Huỷ» | Hiểu nhầm thì ghi sai ngày nghỉ, đổi sai giờ |
| **Không quay lại được** | `tat_app` | **Luôn** hỏi OK, kể cả khi gõ lệnh gạch chéo | Tắt rồi không bật lại từ Telegram |

Cách khai báo trong code (`focus/actions.py`): mỗi `Action` có cờ `writes` (ghi dữ liệu) và `view_without_args` (không kèm tham số thì chỉ xem). Bot đọc cờ này để quyết định hỏi OK hay chạy luôn. Muốn thêm hành động chỉ xem: **không đặt `writes=True`**, bot tự bỏ qua bước xác nhận.

Muốn «không hỏi lại» cho cả hành động ghi thì phải chấp nhận hiểu nhầm sẽ ghi vào dữ liệu thật. Khuyến nghị: chỉ làm khi hành động **đảo ngược được trong một thao tác** (ví dụ ghi chú, bật tắt một công tắc), vẫn hiện dòng «Bíp hiểu là» để người dùng thấy kịp.

---

## 6. Các lớp bảo vệ ngoài prompt (làm cho hệ thống tin cậy được)

Prompt hay thôi chưa đủ. AI vẫn có thể nhầm hoặc hỏng. Có 5 lớp:

| Lớp | Code | Làm gì |
|---|---|---|
| 1. Kiểm tra tên action | `by_ai` | AI trả tên không có trong danh sách → coi như lỗi, dùng đường lui |
| 2. Chuẩn hoá tham số | `actions.validate` | Ngày phải đúng `YYYY-MM-DD`, giờ đúng `HH:MM`, on/off đúng giá trị; sai thì báo lỗi bằng tiếng Việt, **không bao giờ chạy với tham số hỏng** |
| 3. Đường lui bằng từ khoá | `intent.by_rules` | AI hết quota, mất mạng, trả lỗi → bot vẫn hiểu các câu có từ khoá (mỗi action có `keywords` không dấu) |
| 4. Đối chiếu chéo | `intent.cross_check` | Khi AI và từ khoá hiểu khác nhau, thẻ xác nhận có thêm dòng «⚠️ Theo từ khoá thì tin này lại giống...» |
| 5. Sửa nghiêng về thận trọng | `intent.understand` | AI chọn «tán gẫu» nhưng từ khoá cho thấy là một lệnh ghi → theo từ khoá (vẫn qua thẻ xác nhận) |

Ngoài ra: mọi prompt và câu trả lời của AI được ghi vào `data\logs\ai-prompts-YYYY-MM-DD.log` (không ghi key, giữ 14 ngày). Đây là cách bờ rồ xem được đúng prompt trong tin nhắn trên.

---

## 7. Khuôn prompt dùng cho dự án mới (copy rồi thay phần trong [ ])

**SYSTEM**

```
BỐI CẢNH (bạn không có trí nhớ giữa các lần gọi, mọi thông tin cần thiết đều nằm dưới đây):
- Bạn là trợ lý của "[tên app]", [app làm gì, chạy ở đâu, nói chuyện với người dùng qua kênh nào].
- [App đo/biết cái gì. App KHÔNG làm/đọc cái gì.]
- [Luật nghiệp vụ quan trọng, viết bằng lời rõ ràng, 3–6 dòng.]
- Người dùng: [vai trò, công việc, giờ giấc, mục tiêu]. [Cách xưng hô, tên gọi.]

Bạn là bộ phân tích lệnh cho [tên bot].
Nhiệm vụ: đọc tin nhắn [ngôn ngữ] và chọn ĐÚNG MỘT action trong danh sách, kèm tham số.
Chỉ trả về JSON một dòng, không giải thích, không markdown.
```

**PROMPT**

```
Hôm nay là {ngày YYYY-MM-DD} ({thứ}). Danh sách action:
{JSON danh sách action: action / mo_ta / tham_so}

Tin nhắn của người dùng: """{tin nhắn, cắt tối đa 1000 ký tự}"""

Quy tắc:
- Chọn action khớp nhất. Câu hỏi kiến thức cần trả lời -> "[action hỏi AI]" với text là nguyên câu hỏi.
  Tâm sự hoặc không thuộc action nào -> "[action tán gẫu]".
- Ngày dạng YYYY-MM-DD (tự tính "mai", "thứ 6 này"). Giờ dạng HH:MM 24h.
- Không đoán bừa tham số bắt buộc; thiếu thì vẫn chọn action và để trống.
- [Chỉ thêm quy tắc sau khi thấy AI nhầm thật, mỗi lỗi một dòng.]
Trả về: {"action": "<tên>", "args": {...}}
```

**Mỗi action trong danh sách**

```
{"action": "[tên_không_dấu]",
 "mo_ta": "[Việc người dùng muốn, 1–2 câu. Liệt kê cái trả về. Chèn 1 cụm câu hỏi thật: 'trả lời câu hỏi kiểu ...'. Nói khác với action gần nghĩa ở đâu.]",
 "tham_so": {"[tên]": "[kiểu]: [ý nghĩa, các giá trị cho phép] (không bắt buộc nếu vậy)"}}
```

**Hai action bắt buộc phải có**: một action **hỏi đáp tự do** (câu hỏi cần trả lời) và một action **tán gẫu / không thuộc loại nào**. Thiếu hai action này AI sẽ chọn bừa cho câu lạ.

---

## 8. Quy trình thêm một action mới (ví dụ `/vang`, bản 2.13.0)

| Bước | Việc | Ví dụ `/vang` |
|---|---|---|
| 1 | Viết hàm làm việc, **chỉ đọc số liệu có sẵn** nếu là action xem | `focus/absence.py` |
| 2 | Khai báo `Action(...)` trong `ACTIONS`: tên, lệnh, mô tả theo mục 3.4, tham số có kiểu, từ khoá không dấu | `xem_vang`, mô tả có «mình vừa inactive / đi vắng bao lâu» |
| 3 | Không đặt `writes=True` nếu chỉ xem | Chạy luôn, không hỏi OK |
| 4 | Thêm vào nhóm trong `/help` và ví dụ | `HELP_GROUPS`, `EXAMPLES` |
| 5 | **Không phải sửa prompt**: danh sách action tự sinh từ `ACTIONS` | Prompt ở mục 3 có `xem_vang` mà không ai gõ thêm vào prompt |
| 6 | Viết test | `tests/test_v2130.py` |
| 7 | **Chạy lại bộ câu cũ** để chắc không câu nào bị hiểu khác đi (mục 9) | Kết quả: chỉ 2 câu mới đổi nghĩa, đúng ý |

Đây là điểm đáng làm theo ở dự án sau: **một nguồn duy nhất** (`ACTIONS`) sinh ra lệnh Telegram, menu, `/help`, danh sách gửi AI và đường lui từ khoá. Thêm một chỗ là đủ.

---

## 9. Cách kiểm thử prompt

1. **Bộ câu mẫu**: gom các câu nhắn thật và câu ví dụ trong test (dự án này khoảng 1.500 câu).
2. **So sánh trước / sau**: chạy bản cũ và bản mới trên cùng bộ câu, in ra chỗ nào action đổi. Khi thêm `/vang`, chỉ đúng các câu về «vắng / inactive / rời máy mấy lần» đổi, không câu nào khác bị cướp. (Phép so sánh này chạy đường lui từ khoá, vì không gọi AI thật trong test. Đường AI kiểm bằng log thật như tin nhắn bờ rồ vừa gửi.)
3. **Đọc log prompt thật**: mở `ai-prompts-*.log`, xem AI nhận gì và trả gì. Nếu AI nhầm, sửa **mô tả action** trước, rồi mới nghĩ tới thêm quy tắc.
4. **Câu hiểm** nên thử: câu ngắn một chữ, câu hỏi kiến thức nghe giống lệnh («giá vàng hôm nay» ≠ «giờ vàng của mình»), câu có số giờ, câu phủ định («đừng nhắc nữa»), câu hai ý.

---

## 10. Chi phí, giới hạn, điều cần biết

| Mục | Số thật của lần gọi này |
|---|---|
| Model | `gemini-flash-lite-latest` (miễn phí, nhỏ, nhanh) |
| Đầu vào | khoảng 2.394 từ (gần như toàn bộ là bối cảnh + danh sách action) |
| Đầu ra | 4 từ: `{"action": "xem_vang", "args": {}}` |
| Thời gian | 1,1 giây |
| Có tra web không | Không (`web=False`); chỉ bật cho câu hỏi cần thông tin mới |
| Tham số sinh | Không chỉnh nhiệt độ; dùng mặc định của model. Không gửi `thinkingConfig` (Gemini 3.x báo lỗi 400) |

Điều cần biết:
- **Tốn token đầu vào mỗi lần** vì không có trí nhớ. Chấp nhận được khi model nhỏ + gói miễn phí; nếu dùng model trả phí thì cân nhắc rút gọn mô tả action.
- Danh sách action **dài thêm theo số action**. 42 action vẫn ổn; hàng trăm thì nên chia nhóm hoặc chọn trước bằng từ khoá.
- AI **không bao giờ đúng 100%**. Lý do hệ thống vẫn tin cậy là các lớp ở mục 6, không phải nhờ prompt hoàn hảo.
- Mô tả action nằm trong prompt thật, nên **viết thông tin riêng tư vào mô tả** thì AI bên thứ ba nhìn thấy. Dự án này chỉ gửi số liệu đo, không gửi nội dung màn hình.
- Số liệu thật cũng là thứ AI «biết» (câu `vang_mat_hom_nay` khi dùng `/ask on`): **app tính số, AI chỉ viết lại thành câu**. Nếu cần chắc con số tuyệt đối thì dùng lệnh `/vang`, không qua AI.

---

## 11. Phụ lục: hai kiểu gọi AI trong cùng app

| | Hiểu lệnh (`purpose=intent`) | Hỏi đáp tự do (`purpose=ask`) |
|---|---|---|
| Khi nào | Tin nhắn thường, `/ask` tắt | `/ask on` hoặc `/ask câu hỏi` |
| Cho AI xem | Bối cảnh + danh sách action + tin nhắn | Bối cảnh + «thông tin lúc này» (giờ, số liệu hôm nay, lần vắng gần nhất) + câu hỏi |
| AI trả | JSON một dòng | Câu trả lời tiếng Việt |
| Tra web | Không | Có (khi cần) |
| Cùng nền | Bối cảnh `ai_context.system_prompt()` tự gắn bởi `ai_client.generate` | Như bên trái |

Chung một nguyên tắc: **AI chỉ nhận đúng những gì đã viết trong prompt**. Muốn AI trả lời chính xác chuyện đang xảy ra thì phải đưa số liệu thật vào prompt (như `vang_mat_hom_nay`), không trông chờ AI nhớ hay đoán.

---

## 12. Danh sách kiểm tra trước khi dùng cho dự án mới

- [ ] Prompt nào cũng có khối bối cảnh, câu đầu nói rõ «không có trí nhớ».
- [ ] Bối cảnh ghi cả điều app KHÔNG làm, và các luật tính quan trọng.
- [ ] Thông tin riêng lấy từ cấu hình, không viết cứng trong code.
- [ ] Danh sách action đóng, sinh từ MỘT nguồn trong code.
- [ ] Mỗi mô tả action: việc người dùng muốn + cái trả về + 1 câu hỏi mẫu + khác action gần nghĩa ở đâu.
- [ ] Tham số có kiểu, ghi rõ giá trị cho phép.
- [ ] Có action hỏi đáp tự do và action tán gẫu/khác để bắt phần dư.
- [ ] Tin nhắn người dùng bọc trong ba dấu nháy kép và cắt độ dài.
- [ ] Ngày hôm nay do code điền.
- [ ] Quy tắc chỉ thêm sau lỗi thật. Mỗi lỗi một dòng.
- [ ] Đầu ra ép một dòng JSON, đặt dòng khuôn ở cuối prompt.
- [ ] Code kiểm tên action và tham số trước khi chạy.
- [ ] Có đường lui khi AI lỗi.
- [ ] Phân loại: chỉ xem → chạy luôn; ghi → hỏi OK; không quay lại được → luôn hỏi OK.
- [ ] Log prompt + câu trả lời để soát lỗi (không ghi key).
- [ ] Có bộ câu mẫu chạy lại mỗi lần thêm action, so sánh trước / sau.

---

## 13. Toàn bộ cơ chế gọi AI API trong dự án (bổ sung 22/11/2026)

Mục 1–12 nói về **nội dung** prompt. Mục này nói về **đường ống** đưa prompt tới AI và mang câu trả lời về: module nào, hàm nào, chọn model ra sao, lỗi thì đổi model thế nào, lưu gì, log gì, dọn gì. Mọi chi tiết dưới đây lấy từ code bản 2.13.0 (`focus/ai_client.py` là chính).

### 13.1 Một cửa duy nhất: `ai_client.generate()`

Cả app chỉ có **một hàm** được phép gọi AI: `focus/ai_client.py` → `generate(cfg, prompt, system="", image=None, purpose="", web=False)`, trả về `(text, model)`, lỗi thì ném `AIError`. Không module nào tự gọi HTTP tới Google.

| Nơi gọi (module → hàm) | `purpose` | Gửi gì | `web` |
|---|---|---|---|
| `intent.py` → `by_ai()` | `intent` | Tin nhắn thường khi `/ask` tắt (mục 2–3) | Không |
| `motivation.py` → hỏi đáp | `ask` | `/ask on` hoặc `/ask câu hỏi` + «thông tin lúc này» | **Có** |
| `motivation.py` → chào sáng | `morning:<kiểu>` | Lời chào đầu ngày + câu trích | Không |
| `motivation.py` → khích lệ | `encourage:<kiểu>` | Câu khích lệ chiều / kèm cảnh báo | Không |
| `motivation.py` → `review_day()` | `daily_review` | Số liệu ngày → đánh giá cuối ngày | Không |
| `motivation.py` → `review_week()` | `weekly_review` | Số liệu tuần → tổng kết tuần | Không |
| `motivation.py` → `read_as400_times()` | `as400_photo` | **Ảnh** spool AS400 → đọc giờ vào/ra | Không |
| `cli.py` → `ai-test` | `test` | «Chào bằng 1 câu ngắn» | Không |

`purpose` không đổi cách gọi; nó chỉ dùng để **đếm** (`/aistatus` hiện «hôm nay dùng cho: hiểu tin nhắn 12, hỏi AI 3...») và để **ghi log** (biết lần gọi nào phục vụ việc gì).

### 13.2 Bên trong `generate()`: từng bước

```
generate(cfg, prompt, system, image, purpose, web)
   |
   v
provider(cfg): ai_provider = off / auto / gemini / claude + có key?
   |-- không có key ------------------> AIError(permanent=True)
   v
ai_context.ensure_context(): system chưa có khối BỐI CẢNH thì tự gắn lên đầu
   |
   v
Đọc data/ai_model.json: offline_until còn hiệu lực?
   |-- còn (vừa hết quota mọi model) -> AIError, KHÔNG gọi mạng
   v
_gemini_call() (hoặc _claude_call() nếu provider = claude)
   |                                   |
   | thành công                        | lỗi
   v                                   v
_update_cache(model=...)            _redact(): che key trong câu lỗi
_count_usage(): đếm lượt, số từ     _log_prompt(error=...)
_log_prompt(answer=...)             focus.log: "AI fail ..."
focus.log: "AI ok ..."              audit: AI_ERROR
audit: AI_CALL                      hết quota ngày mọi model: offline_until = +3 tiếng
   |                                   |
   v                                   v
trả (text, model)                   ném AIError cho nơi gọi tự xử lý (mục 13.8)
```

Gọi HTTP bằng thư viện chuẩn (`urllib`, qua `net.urlopen`, theo proxy hệ thống), **không cài SDK** của Google. Key gửi trong header `x-goog-api-key`, **không nằm trong URL** nên không lọt vào log nào. Thời gian chờ mỗi lần gọi: `ai_timeout_seconds` (mặc định 60 giây).

Nội dung gửi Gemini (REST `POST .../v1beta/models/<model>:generateContent`):

| Trường | Giá trị | Ghi chú |
|---|---|---|
| `contents` | `[{role: user, parts: [ảnh nếu có, {text: prompt}]}]` | Ảnh gửi dạng base64 JPEG |
| `systemInstruction` | Khối BỐI CẢNH + vai trò | Mục 3.1, 3.2 |
| `generationConfig` | `{maxOutputTokens: 8192}` | **Không** gửi `temperature`, **không** gửi `thinkingConfig` (Gemini 3.x trả 400) |
| `tools` | `[{google_search: {}}]` chỉ khi `web=True` | Cho AI tra Google (giá vàng, tỷ giá, tin tức) |

Đọc câu trả lời (`_gemini_text`): ghép các `parts[].text`, **bỏ phần «thought»** (suy nghĩ nội bộ của model). Rỗng thì báo lý do dễ hiểu theo `finishReason` (SAFETY, RECITATION, MAX_TOKENS...). Bị cắt vì MAX_TOKENS nhưng có chữ thì vẫn dùng phần đã có và ghi cảnh báo.

### 13.3 Tên model: vì sao dùng `gemini-flash-lite-latest`, lưu ở đâu

Tên model **viết trong code** (`ai_client.py`), không phải trong file cấu hình:

```python
PRIMARY_GEMINI    = "gemini-flash-lite-latest"   # model số 1
FLASH_LITE_EXTRAS = ["gemini-2.5-flash-lite", "gemini-2.0-flash-lite"]
FALLBACK_GEMINI   = "gemini-flash-latest"        # khi cả nhóm lite không dùng được
FLASH_EXTRAS      = ["gemini-2.5-flash", "gemini-2.0-flash"]
```

Người dùng chỉ chọn **nhà cung cấp** và (tuỳ chọn) **ép một model** trong `settings.json`:

| Khoá | Mặc định | Ý nghĩa |
|---|---|---|
| `ai_provider` | `auto` | `auto` = Gemini nếu có `GEMINI_API_KEY`, không thì Claude nếu có `ANTHROPIC_API_KEY`; `off` = tắt AI |
| `gemini_model` | `auto` | `auto` = theo thứ tự ở 13.4. Ghi một tên cụ thể thì tên đó được **thử đầu tiên**, các model khác vẫn làm dự phòng |
| `claude_model` | (tên model Claude) | Chỉ dùng khi provider là Claude |
| `GEMINI_API_KEY` | | Nằm trong `config/secrets.env`, **không bao giờ** trong `settings.json` hay repo |

Vì sao chọn **flash-lite**:

| Lý do | Giải thích |
|---|---|
| Miễn phí | Gói free của Google đủ cho 1 người dùng (khoảng 20 lượt/ngày **mỗi model**, ước tính, xem 13.6) |
| Nhanh | Việc của app là việc ngắn: chọn 1 action trả JSON 4 từ (ví dụ thật mục 10: 1,1 giây), viết 1 đoạn đánh giá |
| Đủ khôn cho việc này | Nhờ prompt có đủ bối cảnh + danh sách action đóng, model nhỏ chọn đúng; không cần model lớn |
| Nhiều model cùng nhóm | Hết quota model này còn model lite khác, rồi tới nhóm flash: quota free cộng dồn theo model |

Vì sao dùng tên **`-latest`** chứ không ghi số phiên bản: `gemini-flash-lite-latest` là **tên gọi tắt Google tự trỏ về bản flash-lite mới nhất**. Khi Google ra bản mới và chuyển tên này sang, app **tự dùng bản mới mà không sửa code**. Đây là cách chính để «tự lấy model mới».

### 13.4 Model mới / model bị khai tử: app tự dò

Ngoài tên `-latest`, app **tự hỏi Google danh sách model** để bắt cả những model mới có tên riêng (ví dụ một bản `gemini-3.x-flash-lite` mới ra):

```
_gemini_candidates()  (chạy mỗi lần gọi, nhưng chỉ HỎI GOOGLE khi danh sách đã cũ)
   |
   v
resolved_at trong ai_model.json cũ hơn 30 ngày (MODEL_LIST_TTL_DAYS)?
   |-- không: dùng candidates đã lưu, không gọi mạng
   v có
list_gemini_models(): GET /v1beta/models (KHÔNG tốn quota sinh nội dung)
   - chỉ lấy model có generateContent
   - bỏ embedding, tts, image, audio, live, veo, imagen, aqa, gemma, robotics, computer-use
   - xếp hạng _rank(): lite trước flash trước loại khác;
     bản ổn định trước preview/exp/beta; số phiên bản cao trước
   |
   v
Lưu 8 model đứng đầu vào candidates + resolved_at (lỗi mạng thì giữ danh sách cũ, không sập)
```

**Thứ tự thử model** mỗi lần gọi (bỏ trùng, bỏ model `pro`):

```
1. gemini_model trong settings.json (nếu không phải "auto")
2. gemini-flash-lite-latest
3. gemini-2.5-flash-lite
4. gemini-2.0-flash-lite
5. các model "lite" Google mới liệt kê (đã xếp hạng)
6. gemini-flash-latest
7. gemini-2.5-flash
8. gemini-2.0-flash
9. các model "flash" khác Google liệt kê
   |
   v
Gạch khỏi danh sách: model đã hết quota ngày (chưa tới giờ reset) + model trả 404 trong 30 ngày qua
   |
   v
Thử tối đa 6 model cho một lần gọi (MAX_MODELS_TRIED)
```

Vậy câu hỏi «Gemini đổi tên model thì app có tự lấy không?»: **có, theo 2 đường**. (1) Google chuyển tên `-latest` sang bản mới: dùng ngay. (2) Model có tên mới: tối đa 30 ngày sau app dò lại danh sách và thêm vào hàng dự phòng. Model cũ bị khai tử thì Google trả 404, app ghi nhớ và bỏ qua nó 30 ngày. Muốn dò lại **ngay**: gõ `/clearcache` trong bot (xoá `ai_model.json`).

### 13.5 Lỗi từ Google: xử lý theo mã lỗi

| Mã lỗi | Hiểu là | App làm gì |
|---|---|---|
| **404** | Model bị khai tử / key không được dùng model đó | Ghi vào `gone` (nhớ 30 ngày), thử model kế ngay |
| **429** khi đang `web=True` | Quota tra Google của gói free rất thấp (Gemini 3.x thường = 0) | Gọi lại **cùng model, bỏ tra web**, thêm ghi chú `NO_WEB_NOTE` dặn AI nói rõ không có số liệu mới, không bịa số |
| **429** có chữ «PerDay» | Hết quota **ngày** của model này | Ghi `quota_exhausted` với giờ hết, bỏ qua model này tới mốc reset, thử model kế |
| **429** khác | Giới hạn lượt/phút | Thử model kế ngay, không chờ |
| **500 / 503 / 504** | Server Google nghẽn | Thử lại cùng model **3 lần, cách 5 giây**. Vẫn nghẽn thì bỏ qua các model **cùng nhóm** (lite hoặc flash) vì cùng cụm server, thử 1 model nhóm kia; nghẽn tiếp thì dừng |
| **400** khi `web=True` | Model không cho tra web | Gọi lại bỏ tra web |
| **400** chung chung | Model này không nhận yêu cầu | Thử model kế, tối đa 3 model (MAX_BAD_REQUEST_MODELS) rồi báo lỗi |
| **400 có chữ «API key» / 401 / 403** | Key sai, bị chặn | Dừng ngay, `AIError(permanent=True)`: nơi gọi **không** thử lại |

Khi **mọi model đều hết quota ngày**: `AIError(daily_quota=True)` → `generate()` ghi `offline_until = bây giờ + 3 tiếng`. Trong 3 tiếng đó mọi lần gọi AI **dừng ngay, không gọi mạng**, bot dùng nội dung có sẵn. Hết 3 tiếng thì thử lại (các model đã hết vẫn bị gạch tới mốc reset).

**Mốc reset quota**: gói free Gemini reset lúc 0h giờ Thái Bình Dương, khoảng **08:00 UTC = 15:00 giờ VN** (`QUOTA_RESET_UTC_HOUR = 8`, hàm `quota_reset_after()`). App tính theo mốc này chứ **không** theo nửa đêm giờ máy.

### 13.6 Lưu «trí nhớ» model để lần gọi sau không tốn thời gian: `data/ai_model.json`

Một file JSON nhỏ, cùng cấu trúc với bot timesheet (giá trị dưới đây là ví dụ):

```json
{
  "cache_date": "2026-11-22",
  "model": "gemini-flash-lite-latest",
  "candidates": ["gemini-2.5-flash-lite", "..."],
  "resolved_at": "2026-11-03T08:12:40",
  "quota_exhausted": [{"model": "gemini-2.5-flash-lite", "date": "2026-11-22", "at": 1763799120}],
  "gone": [{"model": "gemini-2.0-flash-lite", "at": 1763000000}],
  "offline_until": 0,
  "rule_parser_mode": null
}
```

| Trường | Dùng để | Tự dọn |
|---|---|---|
| `candidates`, `resolved_at` | Danh sách model Google có, khỏi hỏi Google mỗi lần | Dò lại sau 30 ngày |
| `quota_exhausted` | Bỏ qua model hết quota, **khỏi tốn 1 lượt gọi hỏng** mỗi lần | Mỗi lần đọc file: xoá mục đã qua mốc reset 08:00 UTC |
| `gone` | Bỏ qua model 404 | Hết tác dụng sau 30 ngày |
| `offline_until` | Ngừng gọi AI 3 tiếng khi mọi model hết quota | Về 0 khi sang ngày mới |
| `model` | Model trả lời thành công gần nhất, hiện trong `/aistatus` | Về `gemini-flash-lite-latest` khi sang ngày mới |
| `cache_date` | Nhận biết sang ngày mới | |
| `rule_parser_mode` | Ghi ngày AI phải nghỉ vì hết quota (đánh dấu để soát log) | Về `null` khi sang ngày mới |

Điểm quan trọng: phần **tiết kiệm thời gian** là các **danh sách bỏ qua** (`quota_exhausted`, `gone`, `offline_until`) và danh sách model 30 ngày, **không phải** «nhớ model lần trước rồi gọi thẳng model đó». Mỗi lần gọi vẫn bắt đầu từ model số 1 còn dùng được. Nhờ vậy khi quota model số 1 reset lúc 15:00 thì app tự quay về dùng nó.

An toàn khi nhiều luồng cùng gọi: mọi lần đọc-sửa-ghi file đều nằm trong khoá `_lock`; ghi file kiểu **nguyên tử** (ghi ra `.tmp` rồi `os.replace`), tắt máy ngang không làm hỏng file. File đang bị khoá (antivirus) thì bỏ qua lần ghi đó, không làm hỏng lần gọi AI.

### 13.7 Đếm lượt dùng: `data/ai_usage.json` và `/aistatus`

`_count_usage()` (sau mỗi lần thành công) và `_count_raw()` (mỗi lần gửi HTTP, kể cả lần thử lại) ghi:

| Phần | Nội dung | Giữ |
|---|---|---|
| `month`, `month_count`, `month_words_in/out` | Lượt + số **từ** gửi/nhận trong tháng (đếm từ thay token: nhẹ, đủ để biết dùng nhiều hay ít) | Về 0 khi sang tháng |
| `days` | Lượt mỗi ngày | 31 ngày gần nhất |
| `day_detail` | Mỗi ngày: số từ + số lượt theo `purpose` | 31 ngày |
| `models` | Lượt theo model | Theo tháng |
| `raw` | Lượt gửi thô theo model mỗi ngày (mỗi lần retry cũng tốn 1 lượt quota free) | 7 ngày |

Bộ đếm **chỉ để xem, không chặn** lần gọi nào. `gemini_free_calls_per_model` (mặc định 20) để `/aistatus` ước tính «còn ~N lượt» (Google không báo số còn lại). `ai_daily_call_budget` (mặc định 0) là hạn mức tự đặt, chỉ để hiện «còn bao nhiêu».

### 13.8 AI lỗi thì mỗi tính năng làm gì

| Tính năng | Khi `AIError` |
|---|---|
| Hiểu tin nhắn (`intent`) | Chuyển sang `by_rules()` (từ khoá), mục 6 |
| Hỏi đáp (`ask`) | Báo câu lỗi dễ hiểu |
| Chào sáng, khích lệ | Lấy câu soạn sẵn đã kiểm duyệt, luân phiên không lặp |
| Đánh giá ngày / tuần | Hẹn thử lại **mỗi 15 phút** (pref `ai_review_retry`), đánh giá ngày trong 2 ngày gần nhất, tuần trong 9 ngày; lỗi `permanent` thì không thử lại |
| Đọc ảnh AS400 | Nhờ người dùng gõ giờ: `/as400 08:10 17:35` |

### 13.9 Lưu kết quả AI để hỏi lại không tốn quota: bảng `ai_cache` (DB)

Đánh giá ngày / tuần lưu trong bảng `ai_cache` của `data/focus.db`. Khoá = `review:<ngày>:<mã>` hoặc `week:<tuần>:<mã>`, với `<mã>` là SHA1 của **số liệu + `ai_context.fingerprint()`** (SHA256 của toàn bộ khối BỐI CẢNH). Nghĩa là: số liệu giống hệt **và** bối cảnh giống hệt (giọng, tên, xưng hô, sếp, giờ làm...) thì dùng lại, không gọi AI; đổi bất kỳ thứ gì thì gọi AI viết lại. Housekeeping xoá dòng cũ hơn **60 ngày**.

### 13.10 Ghi log: 3 nơi, mỗi nơi một mục đích

| File | Ghi gì về AI | Khi nào xoá |
|---|---|---|
| `data/logs/ai-prompts-YYYY-MM-DD.log` | **Nguyên văn** từng lần gọi: SYSTEM + PROMPT (sau khi đã điền số liệu) + TRẢ LỜI hoặc LỖI | Giữ `ai_prompt_log_days` ngày (mặc định **14**); `0` = không ghi |
| `data/logs/focus.log` | 1 dòng mỗi lần gọi + cảnh báo đổi model | Đổi tên mỗi nửa đêm, giữ **30** bản |
| `data/audit.log` → `data/logs/audit-YYYY-MM-DD.log` | Sự kiện `AI_CALL`, `AI_ERROR`, `AI_QUOTA_EXHAUSTED`, `CLEAR_CACHE` | **30** ngày |

Đầu mỗi mục trong log prompt:

```
===== 2026-11-20 16:32:47 · purpose=intent · model=gemini-flash-lite-latest · web=False · 1093 ms · OK =====
--- SYSTEM ---
(khối BỐI CẢNH + vai trò)
--- PROMPT ---
(ngày + catalog + tin nhắn + quy tắc)
--- TRẢ LỜI ---
{"action":"xem_vang","args":{}}
```

Dòng trong `focus.log` (ví dụ):

```
AI ok provider=gemini model=gemini-flash-lite-latest purpose=intent web=False in=2394 out=4 1093ms
AI fail provider=gemini purpose=ask web=True in=1800 3200ms permanent=False: Gemini đang giới hạn lượt gọi...
Gemini gemini-2.5-flash-lite hết quota ngày, bỏ qua tới 23/11 15:00.
```

Quy tắc an toàn khi ghi log:
- `_redact()` thay `gemini_api_key` và `anthropic_api_key` bằng `***` trong **mọi** chuỗi trước khi ghi log, ghi audit hay gửi Telegram (body lỗi của Google đôi khi chép lại key).
- Ảnh **không** lưu, chỉ ghi kích thước byte.
- Ghi log prompt lỗi (ổ đầy, file khoá) **không** làm hỏng lần gọi AI.
- Ghi theo khoá `_prompt_lock`, nhiều luồng cùng gọi không trộn dòng.

### 13.11 Dọn dẹp (housekeeping)

`focus/housekeeping.py` → `run()` chạy **mỗi ngày 1 lần**: lúc tracker khởi động và lúc qua ngày mới (cờ `data/housekeeping_last_run.txt`). Chạy tay: `python focus_tracker.py housekeeping`.

| Thứ | Cách dọn |
|---|---|
| `ai-prompts-*.log` | Xoá khi file không ghi thêm quá `ai_prompt_log_days` ngày (tối thiểu 1). File > 10 MB thì cắt còn 1 MB cuối |
| `audit-*.log` | Xoá sau 30 ngày |
| `focus.log.*` | Tự xoay, giữ 30 bản (không cần housekeeping) |
| Bảng `ai_cache` | Xoá dòng cũ hơn 60 ngày |
| `*.tmp` (ghi dở do tắt máy) | Xoá khi cũ hơn 1 ngày |
| `ai_model.json` | **Tự dọn khi đọc** (13.6), không cần housekeeping |
| `ai_usage.json` | **Tự cắt khi ghi** (31 ngày / 7 ngày / theo tháng) |

Xoá tay khi cần: `/clearcache` trong bot (hoặc `python focus_tracker.py clearcache`) xoá `ai_model.json` + toàn bộ bảng `ai_cache`, **không** xoá bộ đếm lượt dùng.

### 13.12 Lệnh kiểm tra AI

| Lệnh | Làm gì | Tốn quota? |
|---|---|---|
| `/aistatus` (bot) | Provider, model gần nhất, lượt hôm nay / tháng, dùng cho việc gì, ước tính còn bao nhiêu lượt mỗi model, model hết quota, model 404 | Không |
| `/clearcache` (bot) | Xoá cache model + nhận xét AI đã lưu, lần sau dò model lại từ đầu | Không |
| `python focus_tracker.py ai-models` | In danh sách model key này dùng được (đã xếp hạng) | Không |
| `python focus_tracker.py ai-test` | Gọi AI thật 1 lần rồi in `/aistatus` | 1 lượt |

### 13.13 Danh sách kiểm tra phần gọi API cho dự án mới

- [ ] Một hàm duy nhất gọi AI; mọi nơi khác gọi qua nó, truyền `purpose`.
- [ ] Hàm đó tự gắn khối bối cảnh nếu nơi gọi quên.
- [ ] Gọi REST bằng thư viện chuẩn, key trong **header**, không trong URL.
- [ ] Model số 1 dùng tên `-latest`; thêm danh sách dự phòng cùng nhóm rồi nhóm lớn hơn.
- [ ] Tự hỏi danh sách model (không tốn quota), lưu 30 ngày, xếp hạng: nhỏ trước, ổn định trước preview, mới trước cũ.
- [ ] Xử lý riêng từng mã lỗi: 404 nhớ lâu; 429 ngày nhớ tới mốc reset; 429 phút đổi model ngay; 5xx thử lại vài lần rồi đổi nhóm; key sai dừng hẳn.
- [ ] Mọi model hết quota: ngừng gọi một khoảng (ở đây 3 tiếng), không gọi mạng vô ích.
- [ ] File trạng thái model ghi nguyên tử + có khoá luồng; tự dọn khi đọc.
- [ ] Không gửi tham số model mới có thể từ chối (ở đây: `thinkingConfig`); bỏ phần «thought» khi đọc.
- [ ] Mỗi tính năng có đường lui khi AI lỗi; lỗi `permanent` thì không thử lại.
- [ ] Kết quả AI tốn kém (đánh giá) lưu cache, khoá gồm cả số liệu và mã bối cảnh.
- [ ] Log nguyên văn prompt + trả lời theo ngày, che key, không lưu ảnh, tự xoá sau N ngày (cấu hình được, 0 = tắt).
- [ ] Đếm lượt + số từ theo ngày/tháng/mục đích, chỉ để xem, không chặn.
- [ ] Có lệnh xem tình trạng AI, lệnh xoá cache, lệnh liệt kê model, lệnh gọi thử.
- [ ] Tra web chỉ bật cho lần gọi thật sự cần (`web=True`); bị 429/400 khi tra web thì gọi lại cùng model không tra web, dặn AI không bịa số.
- [ ] Ghi lại mỗi lỗi AI thật vào bảng kinh nghiệm (13.15) kèm test chặn lỗi đó quay lại.

### 13.14 Gọi AI có / không tra web (`web=True` / `web=False`)

Tra web là **tuỳ chọn của từng lần gọi**, không phải công tắc chung. Mặc định `generate(..., web=False)`: app **không** gửi trường `tools`, AI chỉ trả lời từ prompt.

| Lần gọi | `web` | Vì sao |
|---|---|---|
| `ask` (hỏi đáp tự do) | `True` | Câu hỏi giá vàng, tỷ giá, tin tức cần số liệu mới |
| `intent`, `morning`, `encourage`, `daily_review`, `weekly_review`, `as400_photo`, `test` | `False` | Mọi thứ AI cần đã có trong prompt; tra web chỉ tốn quota, chậm hơn, và có thể bị từ chối |

Khi `web=True` mà Google không cho tra web, app **tự gọi lại cùng model, bỏ `tools`**, và nối thêm `NO_WEB_NOTE` vào cuối prompt để AI nói rõ «lần này không tra web được, không có số liệu thời gian thực», **không bịa số**:

```
Gọi với tools = [google_search]
   |
   |-- 429 (hết lượt tra web) hoặc 400 (model không cho tra web, không phải lỗi key)
   v
body.pop("tools") + thêm NO_WEB_NOTE vào prompt
   |
   v
Gọi lại NGAY cùng model (không tính là đổi model, không chờ)
   |
   |-- vẫn lỗi 429 thường -> xử lý như bảng 13.5 (đổi model, lúc này đã không còn tra web)
   v
Trả lời bình thường, ghi rõ không có số liệu mới
```

Test giữ cho cách này không bị hỏng: `test_web_429_retries_same_model_without_web`, `test_web_429_then_minute_429_moves_to_next_model_without_web` (`tests/test_ai_client.py`).

### 13.15 Kinh nghiệm từ lỗi AI thật trong dự án

Ghi những lỗi đã thật sự gặp (có trong README, code hoặc lịch sử dự án). Hai dòng ghi «Phòng sẵn» là cách xử lý viết trước, chưa có ngày gặp cụ thể trên máy thật.

**Lỗi khi gọi API**

| Lúc | Chuyện gì xảy ra | Nguyên nhân | Đã sửa thế nào | Bài học cho dự án sau |
|---|---|---|---|---|
| 14/10/2026, máy thật | `gemini-flash-lite-latest` trả **400 «Request contains an invalid argument»** | Gửi kèm `thinkingConfig` (tham số tắt «suy nghĩ»). Gemini 3.x không nhận | Bỏ hẳn `thinkingConfig`; đọc kết quả thì bỏ phần `thought`; `maxOutputTokens` 8192 đủ chỗ. Test `test_no_thinking_config_is_sent` chặn ai đó thêm lại | Chỉ gửi tham số tối thiểu. Model `-latest` đổi bản bất cứ lúc nào, tham số hợp lệ hôm nay có thể bị từ chối mai |
| 16/10/2026, `/ask` hỏi giá vàng | Gọi có tra web bị **429** dù hỏi thường vẫn còn lượt | Gói free: quota **tra Google tính riêng và rất ít** (Gemini 3.x: 0 lượt) | Gặp 429 khi đang tra web: gọi lại cùng model không tra web + `NO_WEB_NOTE` (13.14) | Tính năng phụ (tra web) có quota riêng. Lỗi của tính năng phụ thì **bỏ tính năng phụ, giữ câu trả lời**, đừng đổi model hay báo lỗi |
| Phòng sẵn | 404 với model cũ | Google ngừng model / key mới không được dùng | Nhớ model 404 trong 30 ngày (`gone`) | Đừng thử lại model chết ở mỗi lần gọi: tốn thời gian và lượt |
| Phòng sẵn | 400 chung chung (không phải lỗi key) ở một model | Model đó không nhận yêu cầu | Thử model kế, tối đa 3 model, rồi báo nguyên lời Google | Đừng dừng ở 400 đầu tiên; nhưng phân biệt 400 do key (dừng hẳn) với 400 do model |
| Ảnh chụp màn hình gửi trong dự án | Thấy được Gemini API key | Key hiện trên màn hình lúc chụp | Khuyên đổi key; app che key bằng `_redact()` ở mọi log, audit, tin Telegram (body lỗi Google có thể chép lại key) | Key chỉ nằm trong `secrets.env`, gửi qua header; che key ở **mọi** đường ra; không chụp màn hình có key |

**Lỗi nội dung AI viết** (AI gọi được nhưng viết sai ý)

| Lúc | Chuyện gì xảy ra | Đã sửa thế nào | Bài học |
|---|---|---|---|
| Báo cáo thật 15–16/10/2026 | AI chê dùng app ngoài VDI là «nghiện», «bỏ bê»; bịa việc cần khắc phục; dùng quá nhiều emoji | Thêm luật vào khối BỐI CẢNH: app ngoài VDI có thể là việc, không chê; chỉ nêu vấn đề người dùng tự ghi; mỗi mục một emoji (v2.3.0, v2.6.0) | AI suy diễn khi thiếu bối cảnh. Sửa bằng **bối cảnh rõ hơn**, viết thành luật chung, không vá từng câu |
| Cùng đợt | Câu trích dẫn không chắc nguyên văn | AI chỉ được chọn trong danh sách đã kiểm từng chữ (`focus/quotes.py`), chép đúng nguyên văn (v2.6.0) | Thứ cần chính xác tuyệt đối thì **app đưa danh sách**, AI chỉ chọn |
| 19/10/2026 | Muốn AI không lặp câu, nhưng gửi cả lịch sử thì prompt dài ra mãi | Chỉ gửi tối đa 5 câu gần nhất để tránh lặp (v2.8.0) | **Prompt không được phình theo thời gian**; giới hạn mọi danh sách gửi kèm |
| 21/10/2026 | AI tự thêm dòng tên mục lời chúc («Chúc buổi tối») | Lọc bằng code (`focus/review_text.py`), không dựa vào việc AI nghe dặn (v2.10.6) | Định dạng đầu ra quan trọng thì **code kiểm/lọc lại**, đừng chỉ dặn trong prompt |
