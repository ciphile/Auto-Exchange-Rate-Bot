# Danh sách lệnh — Rây (và Lũi sau này)

> Cập nhật 25/11/2026 · Nguồn trong code: `src/shared/command-guide.vi.ts` (lệnh `/caclenh` và `/help` đọc từ đó).
> **Luật (Khang 25/11/2026):** thêm / đổi lệnh hay tính năng mới → sửa `command-guide.vi.ts` **và** file này **cùng commit**. Barie `tests/command-guide.test.ts` đỏ nếu thiếu.

## 1. Hai lệnh hướng dẫn
| Lệnh | Ai | Gõ ở đâu | Hiện gì |
|---|---|---|---|
| `/caclenh` | chỉ Khang | chat riêng với bot | hướng dẫn **đầy đủ** mọi lệnh (lệnh của Khang + lệnh của nhóm) |
| `/help` | mọi người | trong nhóm | chỉ lệnh **ai cũng dùng được** + cách gọi bot + **câu mẫu nói tự nhiên** (không lộ lệnh của Khang) |

## 1b. Menu lệnh Telegram (nút "Menu" / gõ "/")
- **Chat riêng của Khang:** menu có mọi lệnh của Khang + `/help` (trừ `/gannhom` — lệnh này gõ trong nhóm).
- **Trong nhóm:** menu chỉ có lệnh chung (`/help`, `/tygia`, `/ngayle`).
- Người khác chat riêng với bot: không có menu (bot im lặng với người lạ).
- Bot **tự cài menu** ở nhịp lịch 10 phút; danh sách lệnh đổi (deploy bản mới) thì tự cập nhật. Menu lấy từ `src/shared/command-guide.vi.ts`.

## 2. Lệnh cho mọi người trong nhóm (gõ trong nhóm)
| Lệnh (cách gõ) | Bot | Làm gì | Tình huống dùng | Kết quả mong đợi |
|---|---|---|---|---|
| `/help` | Rây, Lũi | xem hướng dẫn dùng bot | mới vào nhóm, quên cách dùng | bot gửi bản hướng dẫn này vào nhóm |
| `/tygia (hoặc /gia)` | Rây | hỏi tỉ giá SGD → VND đang có | muốn biết giá để đổi tiền | Rây trả lời giá Wise (kèm nguồn + giờ lấy) và chợ đen ước tính |
| `/ngayle` | Rây | xem ngày nghỉ lễ Singapore sắp tới | tính chuyện nghỉ, về quê, đi chơi | danh sách ngày lễ 120 ngày tới (đã gồm nghỉ bù) |

## 3. Nói tự nhiên với Rây (không cần lệnh) — hiện trong `/help`
- Reply vào tin của Rây, hoặc gõ @tên bot kèm câu hỏi → Rây trả lời.
- Khi Rây đang bật lắng nghe: chỉ cần gọi "Rây ơi …" là Rây trả lời.

| Câu mẫu | Rây làm gì |
|---|---|
| "Rây ơi giá hôm nay nhiêu?" | giá Wise mới nhất trong kho + nguồn + giờ, kèm chợ đen ước tính |
| "Rây ơi lấy giá ngay Wise đi" | Rây đi lấy giá Wise LIỀN rồi báo (mỗi nguồn tối đa 1 lần / 5 phút) |
| "Rây ơi check giá VCB với VPBank coi" | lấy liền giá 2 ngân hàng (mua chuyển khoản / bán) |
| "Rây ơi lấy giá ngay, tùy mày" | "tùy" = lấy Wise; nói "tất cả" = lấy mọi nguồn |
| "Rây ơi lấy giá mới nhất đi" | chưa nói nguồn → Rây hỏi lại "nguồn nào?", trả lời "Wise" / "VCB" / "tùy"… |
| "Rây ơi tỉ giá tuần này lên hay xuống?" | xu hướng 24 giờ / 7 ngày, cao / thấp nhất 7 ngày |
| "Rây ơi còn mấy ngày nữa có lương?" | số ngày tới ngày lương (ngày cuối tháng) |
| "Rây ơi tháng sau có ngày lễ nào không?" | lịch nghỉ lễ Singapore từ hôm nay tới hết tháng sau |
| "Rây ơi khi nào được nghỉ lễ?" | như trên |

## 4. Lệnh của Khang (gõ trong CHAT RIÊNG với bot)
> Gõ trong nhóm thì bot **im lặng** nhưng cả nhóm vẫn thấy dòng Khang gõ. Lệnh đổi dữ liệu luôn có **thẻ ✅ / ❌** (hết hạn 10 phút, dùng 1 lần). Ngoại lệ: `/gannhom` phải gõ **trong nhóm** (thẻ vẫn gửi vào chat riêng).

| Lệnh (cách gõ) | Bot | Làm gì | Tình huống dùng | Kết quả mong đợi |
|---|---|---|---|---|
| `/caclenh` | Rây, Lũi | hướng dẫn ĐẦY ĐỦ mọi lệnh | quên lệnh, muốn xem cách dùng + kết quả | bot gửi hướng dẫn chi tiết (có thể chia vài tin) |
| `/lenh (hoặc /start)` | Rây, Lũi | danh sách lệnh NGẮN | cần tra nhanh cú pháp | mỗi lệnh 1 dòng |
| `/caidat` | Rây, Lũi | xem toàn bộ cài đặt hiện tại | trước khi đổi gì đó, hoặc thấy bot cư xử lạ | danh sách cài đặt: mốc, lắng nghe, tính cách, tâm trạng, tần suất… |
| `/trangthai` | Rây, Lũi | xem bot có khỏe không | nghi bot không chạy, sau khi cài đặt xong | nhóm đã gắn chưa, lần chạy lịch gần nhất, AI đang dùng model nào, giá mới nhất, lễ sắp tới |
| `/tygia` | Rây | xem giá trong kho, KHÔNG qua AI | kiểm nhanh số liệu | giá Wise / dự phòng / VCB / VPBank kèm giờ lấy |
| `/tomtat` | Rây, Lũi | tóm tắt chat trong nhóm hôm nay | cuối ngày, bận không đọc kịp nhóm | bản tóm tắt gửi RIÊNG Khang (cần bật /langnghe on thì bot mới lưu tin) |
| `/noi <nội dung>` | Rây, Lũi | nhắn thay: bot nói nguyên văn vào nhóm | muốn nói gì đó mà để bot nói (không lộ là Khang) | thẻ ✅ / ❌ → bấm ✅ thì bot gửi đúng nguyên văn vào nhóm, không thêm chữ |
| `/thuhoi` | Rây, Lũi | xóa tin vừa nhắn thay | lỡ tay, gửi nhầm (trong 48 giờ) | tin /noi gần nhất bị xóa khỏi nhóm |
| `/gioithieu` | Rây, Lũi | bot tự giới thiệu ngắn trong nhóm | mới đưa bot vào nhóm | thẻ ✅ → bot giới thiệu tên + việc chính (≈ 4 câu) |
| `/ngayle · /ngayle them 2027-01-01 Tên lễ · /ngayle xoa 2027-01-01` | Rây | xem / thêm / xóa ngày lễ Singapore | thiếu lịch năm sau (trang MOM không vào được) | xem: danh sách lễ · thêm / xóa: thẻ ✅ rồi mới lưu |
| `/gannhom (gõ TRONG NHÓM)` | Rây, Lũi | gắn nhóm làm nhóm của bot | lần đầu đưa bot vào nhóm | thẻ ✅ gửi vào chat riêng của Khang → bấm ✅ là gắn xong |
| `/moc 19800 19900 20000` | Rây | đặt mốc cảnh báo tỉ giá | muốn được báo khi giá qua mốc khác | thẻ ✅ ghi mốc cũ → mới |
| `/langnghe on \| off` | Rây, Lũi | bật / tắt bot đọc tin trong nhóm | muốn gọi "Rây ơi" là trả lời, muốn bot tự chen chuyện, muốn /tomtat | thẻ ✅ · bật: bot đọc + lưu tin (mã hóa, xóa 01:00) · tắt: chỉ trả lời khi reply / @tên bot |
| `/hongchuyen 1..10` | Rây, Lũi | mức bot tự chen vào chuyện nhóm | bot nói nhiều quá / ít quá | thẻ ✅ · 1 = gần như không chen, 10 = chen nhiều |
| `/xungho tui - mấy ông` | Rây, Lũi | cách bot xưng - gọi mọi người | khi bật tính cách, muốn đổi kiểu xưng hô | thẻ ✅ (tắt tính cách thì luôn "em – anh chị") |
| `/tinhcach on \| off` | Rây, Lũi | bật tính cách riêng / tắt = ngoan | muốn bot lém lỉnh hơn, hoặc quay về ngoan | thẻ ✅ · bật: xỏ lá, lý sự, hay chọt · tắt: ngoan, "Dạ" thưa |
| `/tamtrang <mã>` | Rây, Lũi | đổi tâm trạng (cách nói) | muốn bot vui, nghiêm túc, cộc cằn… | thẻ ✅ · gõ /tamtrang không kèm mã để xem 14 tâm trạng |
| `/tansuat 1..5` | Rây | mức báo giá + cảnh báo thưa / dày | thấy bot báo giá nhiều quá / ít quá | thẻ ✅ · 1 rất thưa … 5 dày; đổi giữa tháng thì lập lại lịch từ hôm nay |
| `/canhbaocathang on \| off` | Rây | cảnh báo cả tháng hay chỉ 14 ngày cuối | muốn theo dõi giá cả tháng | thẻ ✅ |
| `/noituc 0..3` | Rây, Lũi | mức nói tục (chỉ khi bật tính cách) | muốn bot "đời" hơn hoặc sạch hơn | thẻ ✅ · 0 cấm … 3 thoáng; từ cấm tuyệt đối không bao giờ |
| `/gionghi 20-6` | Rây, Lũi | giờ bot không tự nhắn (giờ VN) | đổi giờ yên lặng | thẻ ✅ · trong giờ nghỉ bot không tự báo, cảnh báo chờ tới sáng |
| `/nguon wise,vcb,vpbank` | Rây | chọn nguồn tỉ giá được dùng | một nguồn hay lỗi, muốn tắt bớt | thẻ ✅ (Wise luôn được lấy để so mốc) |
| `/phongcach <mô tả> · /phongcach xoa` | Rây, Lũi | dặn thêm phong cách nói | muốn bot hay ví von, nói ngắn hơn… | thẻ ✅ · tối đa 200 ký tự |
| `/nhactimesheet on \| off` | Rây | bật / tắt nhắc điền timesheet thứ Sáu | không muốn bot nhắc nữa (hoặc muốn nhắc lại) | thẻ ✅ |

## 5. Chat riêng chữ thường
Khang nhắn chữ thường (không có "/") trong chat riêng → bot trả lời như nói chuyện bình thường (có bối cảnh giá, lễ, nhóm).

## 6. Lũi
Chưa chạy (chờ Khang gửi tính cách + lĩnh vực tin). Khi có: `/help` trong nhóm B chỉ hiện lệnh của Lũi; **không** có tỉ giá / ngày lễ / timesheet (BR-45).
