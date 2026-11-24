> ## ⛔ NGUYÊN MẪU v0 — ĐÃ ĐÓNG BĂNG, KHÔNG PHẢI CODE CHÍNH THỨC
> Kat viết **trước khi** có phỏng vấn / BRD / FS / TS (vi phạm cổng chặn). Khang quyết (24/11/2026): **giữ làm nguyên mẫu**, đổi tên thư mục cho khỏi lẫn, cần thì lấy lại. Stack chưa chốt (bàn sau khi chốt requirement).
> - **Không** sửa thêm, **không** coi là nguồn đúng của nghiệp vụ. Nghiệp vụ chính thức nằm ở `docs/specs/`.
> - Các workflow (`daily`, `check`, `poll`, `test`) đã dời sang `workflows/` nên **không còn tự chạy**. **Đừng** đưa lại vào `.github/workflows/` trước khi chốt stack + spec (bot sẽ tự đăng tin nếu có secret).
> - Chạy thử tại chỗ (không gửi gì): `cd prototype-v0 && python -m bot preview` · test: `python -m unittest discover -s tests -t .`
> - **Lấy lại đúng cấu trúc cũ:** commit `41c0108` — `git checkout 41c0108 -- bot tests scripts requirements.txt README.md .github`
> - Các đường dẫn `.github/workflows/...` trong tài liệu bên dưới là cấu trúc cũ (nay ở `prototype-v0/workflows/`).

---

# Auto-Exchange-Rate-Bot

Telegram bot cho nhóm làm remote ở VN, nhận lương SGD qua Wise rồi đổi sang VND.
Bot đăng bản tin tỉ giá mỗi sáng, **báo khi tỉ giá cắt các mốc nhóm hay than** (20,000 / 20,100…),
và trả lời lệnh trong group. Lời bình do Claude viết theo giọng Mít; **mọi con số do code tính**.

## Nguồn tỉ giá (không cần API key)

| Nguồn | Là gì | Ghi chú |
| --- | --- | --- |
| Wise | tỉ giá **mid-market** SGD→VND (Wise không có giá mua/bán riêng; phí tính thêm khi chuyển) | endpoint công khai của wise.com, theo giờ; **không chính thức**, có thể đổi. Dự phòng: open.er-api.com (1 lần/ngày) |
| VCB | giá **NH mua** (tiền mặt, chuyển khoản) và **NH bán** | XML công khai của VCB, ≤ 1 request / 5 phút |
| VPBank | như VCB | JSON công khai trên vpbank.com.vn, lấy bản cập nhật mới nhất trong ngày |
| Chợ đen | **ước tính** = Wise × (1 + chênh lệch) | không có API. Mặc định +0.4%; mỗi lần ai đó gõ `/doi 20100` bot học lại chênh lệch từ các lần đổi thật |

"NH mua" = ngân hàng mua SGD của mình = số mình nhận được khi bán SGD. CK = chuyển khoản, TM = tiền mặt.

## Cảnh báo mốc giá

- Mốc mặc định: 19,900 · 19,950 · **20,000** · **20,100** · 20,200 · 20,300 (sửa bằng biến `BOT_LEVELS`, vd `19900,20000,20100`).
- Chạy mỗi giờ. Chỉ báo khi **vừa cắt** một mốc, có đệm ±10 VND để không báo liên tục khi giá lởn vởn sát mốc.
- Không báo từ 22:00 đến 07:00 (giờ VN), tối đa 4 tin/ngày, 2 mốc thường cách nhau ≥ 2 giờ (mốc 20,000 / 20,100 thì bỏ qua cooldown).
  Tin bị hoãn vẫn được báo sau nếu giá còn nằm bên kia mốc.

## Lệnh trong group

- `/rate` – Wise, chợ đen ước tính, VCB, VPBank
- `/bank` – giá VCB và VPBank
- `/convert 10000` (SGD→VND) · `/convert 200tr vnd` (VND→SGD); nhận `10,000`, `10.000`, `10k`, `200tr`
- `/doi 20100` – báo giá chợ đen vừa đổi được

## Cài đặt

1. Tạo bot với [@BotFather](https://t.me/BotFather) và thêm vào group.
   **Có thể để Group Privacy BẬT** (bot không đọc chat thường). Lệnh vẫn chạy khi gõ từ menu gợi ý của Telegram
   (nó tự thêm `@tên_bot`). Chỉ tắt Group Privacy nếu muốn gõ `/rate` trần; tắt xong phải xoá và thêm lại bot.
2. Lấy chat id của group (số âm): gửi 1 tin trong group rồi mở
   `https://api.telegram.org/bot<TOKEN>/getUpdates`, đọc `message.chat.id`. Group nâng cấp lên supergroup thì chat id đổi.
3. GitHub repo → **Settings → Secrets and variables → Actions**, thêm:
   - `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`
   - `ANTHROPIC_API_KEY` (không bắt buộc; thiếu thì bot dùng câu mẫu cố định)
   - Biến (Variables) `ANTHROPIC_MODEL` nếu muốn đổi model (mặc định `claude-opus-5-5`; `claude-haiku-5-5` rẻ hơn nhiều).
4. Chạy thử từng workflow bằng **Run workflow**: *Morning rate post*, *Rate alerts*.

Bot là **bot** (Telegram luôn gắn nhãn BOT). Nên đặt tên bot rõ ràng và báo trước cho cả nhóm.

## Cách hoạt động

- `daily` (09:10 giờ VN), `check` (mỗi giờ) và `poll` (mỗi 5 phút) là 3 workflow riêng.
- Trạng thái (mốc hiện tại, số tin đã gửi, các lần `/doi`, vài tin gần nhất để không lặp) lưu trong
  `state.json` trên nhánh `bot-state` (`scripts/state.sh`), nên không cần database. Hai workflow ghi cùng lúc hiếm khi mất 1 bản cập nhật.
- Lời bình: Claude nhận số liệu + ~15 câu mẫu của Mít (`bot/style_examples.txt`, đã bỏ tên/số điện thoại).
  Kết quả bị loại (và thay bằng câu mẫu) nếu nhắc con số không phải mốc, có link, quá dài, bị từ chối hoặc API lỗi.
- Lệnh được **poll mỗi 5 phút** (mức nhỏ nhất của GitHub cron) nên trả lời có thể trễ vài phút. Cần trả lời tức thì thì chạy
  `python -m bot poll` trong vòng lặp trên máy luôn bật.
- Poll tốn ~8,600 phút runner/tháng: miễn phí với repo public, vượt hạn mức 2,000 phút của repo private
  (khi đó bỏ workflow `poll`, hoặc giảm tần suất).
- `getUpdates` không dùng được khi bot đã đặt webhook.

## Chạy local

Python 3.10+. Chỉ cần `pip install -r requirements.txt` nếu muốn gọi Claude.

```sh
python -m bot preview                       # in bản tin sáng, không gửi gì
BOT_STATE_FILE=/tmp/s.json python -m bot check --dry-run
ANTHROPIC_API_KEY=... python -m bot preview # xem Claude viết gì
python -m unittest discover -s tests -t .
```
