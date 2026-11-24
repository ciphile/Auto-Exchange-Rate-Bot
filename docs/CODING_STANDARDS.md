# Chuẩn code — Auto-Exchange-Rate-Bot

> Tách từ `docs/SKILL_TAM.md` (bộ quy tắc của Khang, **bản tạm v0.1 — 24/11/2026**), gồm mục 6–8 nguyên văn.
> **Ghi chú riêng dự án này (Kat thêm 24/11/2026, chờ Khang duyệt):**
> - Chuẩn mẫu viết cho TypeScript / Next.js / Vercel / Supabase. Bản nháp bot hiện tại là **Python + GitHub Actions** → cách áp dụng từng mục cho Python do Khang quyết (xem `docs/STATUS.md`).
> - Mục 7 (chuẩn web) **chưa áp dụng**: dự án chưa có web.
> - Đọc **TOÀN BỘ file này 1 lần / phiên** lúc bắt đầu code + ngay sau mỗi lần nén ngữ cảnh.

## 6. Chuẩn code

> **Chất lượng code — Khang dặn (chép NGUYÊN VĂN):** "trước khi code thì phải nhớ code ở mức độ production ready level chứ không phải code nháp chơi chơi" · "Sau khi code hoàn thành xong 1 module hay 1 chức năng hơi to to thì bắt buộc phải Audit ít nhất 2 lần (đọc các standard coding hay rules trước khi audit) để make sure code được tạo ra ở production ready level. Và code được tạo ra ở mức độ chất lượng, đảm bảo hiệu năng tối ưu, code được tối ưu hóa , ít tốn tài nguyên máy tính có thể chạy ngầm hằng tháng hằng năm một cách hiệu quả và không tốn nhiều tài nguyên , code phải tuân thủ các rule trong kats. Audit xong bắt buộc phải báo cáo các lỗi tìm ra mà make sure bạn test đủ case để không có vụ fix 1 lỗi xong lòi ra 2 lỗi khác" · "ở bước đánh giá kiến trúc và bảo mật… đánh giá về : tối ưu hóa code, tech stack phải thực chiến và ít chiếm tài nguyên có thể (lý do quan trọng thứ 2 sau bảo mật, bảo mật vẫn là lý do ưu tiên nhất, nếu phải đánh đổi performance hiệu năng để lấy bảo mật thì vẫn lựa chọn bảo mật)".

### 6.1. Phân tầng
```
[Bot / Web / Cron]  ← nơi yêu cầu đi vào
   ① Controller  — nhận yêu cầu, kiểm DTO, gọi Service, trả phản hồi chuẩn
   ② Service     — TOÀN BỘ quy tắc BR-xx; không biết HTTP / Telegram
   ③ Repository  — nơi DUY NHẤT đọc / ghi database
   ④ Adapter     — nói chuyện dịch vụ ngoài (AI, email, bot API, đọc file)
```
| Tầng | Được làm | Cấm |
|---|---|---|
| Controller | nhận request, kiểm DTO, gọi Service, đổi kết quả thành phản hồi | quy tắc nghiệp vụ, gọi database, gọi dịch vụ ngoài |
| Service | quy tắc `BR-xx`, điều phối Repository / Adapter, trả `Result` | đọc request HTTP, gửi tin trực tiếp, viết SQL |
| Repository | đọc / ghi database | quy tắc nghiệp vụ |
| Adapter | dịch vụ ngoài, đổi dữ liệu ngoài thành kiểu dự án | quy tắc nghiệp vụ |

Không gọi ngược, không nhảy tầng.

### 6.2. Module hóa — thư mục PHẲNG
- Vài thư mục cố định theo tầng; **mỗi chức năng = một bộ file cùng tên** (`<tên>.controller.ts` → `<tên>.service.ts` → repository / adapter). **Không** tạo 1 thư mục cho mỗi chức năng. Không tạo thư mục mới khi Khang chưa duyệt.
```
src/controllers/  src/services/  src/repositories/  src/adapters/
src/domain/ (kiểu dữ liệu, mã lỗi)  src/shared/ (logger, result, money, date, messages.vi.ts)
src/config/ (MỘT nơi cho mọi tham số)  src/app/ (trang web + API route — chỉ chuyển vào controller)
tests/ (mỗi chức năng 1 file; tên test chứa BR-xx / F-xx)
```
- Chức năng A dùng B **chỉ qua hàm `export` của `B.service.ts`**. Không phụ thuộc vòng.
- File ~≤ 300 dòng, hàm ~≤ 50 dòng; dài thì tách file cùng thư mục. Không code chết, không chép lặp.
- Cùng 1 chức năng có 2 cửa (bot + web) → **chung 1 hàm kiểm + 1 hàm ghi** (barie test).

### 6.3. Đặt tên
| Thứ | Quy ước |
|---|---|
| Code | tên biến / hàm / file **tiếng Anh**; **comment tiếng Việt có dấu** |
| Biến, hàm | `camelCase`, hàm **bắt đầu bằng động từ** (`getClosingBalance`) |
| Kiểu, class | `PascalCase` · Hằng số `UPPER_SNAKE_CASE` · File `kebab-case` |
| Đúng / sai | `is` / `has` / `can` |
| **Tiền** | **số nguyên đơn vị nhỏ nhất** (VND), không số lẻ; hậu tố đơn vị (`amountVnd`) |
| Ngày giờ | lưu ISO kèm múi giờ; hiển thị giờ VN; hậu tố `At` / `Date` |
| Viết tắt | tránh, trừ `id`, `url`, `dto` |

Lập **từ điển nghiệp vụ** (tiếng Việt → tên trong code) ngay khi viết FS, dùng thống nhất.

### 6.4. Kết quả trả về + lỗi
```ts
type Result<T> = { ok: true; data: T } | { ok: false; error: AppError };
type AppError = { code: string; userMessage: string; detail?: string }; // detail chỉ vào log kỹ thuật
```
- Mã lỗi `E-<NHÓM>-<3 số>` (`E-INPUT`, `E-AUTH`, `E-IMPORT`, `E-EXT`, `E-SYS`…). Danh mục đầy đủ trong TS.
- **Mỗi mã lỗi có 2 câu** trong `messages.vi.ts`: câu báo lỗi + **cách xử lý** cho người không rành kỹ thuật (test đỏ nếu thiếu). Câu báo **nói cụ thể chuyện gì xảy ra** + lệnh cụ thể để sửa.
- **Mọi lỗi báo về kênh của chủ dự án** (bot) kèm mã tra (`requestId`); lỗi ngoài cuộc trò chuyện (web, việc định kỳ, email) → bot chủ động nhắn. Chi tiết kỹ thuật qua bộ che bí mật trước khi lưu / hiện. Cùng lỗi lặp → chống tin dồn dập.
- Người dùng cuối **không bao giờ** thấy stack trace, SQL, tên bảng.
- Gọi dịch vụ ngoài: **thời gian chờ + thử lại có giới hạn**.
- **Dữ liệu từ dịch vụ / trang web ngoài: LẤY SẴN TRƯỚC** bằng việc định kỳ, lưu database; dựng thư / mở web / trả lời bot **chỉ đọc database**; dịch vụ lỗi → dùng bản gần nhất, ghi rõ ngày của bản đó; có dọn dẹp. (Khang: "đừng đọc … web vào lúc gởi mail sẽ làm mail gởi đi chậm… Make sure phải có house keep dọn dẹp".)

### 6.5. Log — 3 loại
| | Kỹ thuật | Người dùng (`audit_log`) | Gọi AI (`ai_calls`) |
|---|---|---|---|
| Để làm gì | tìm nguyên nhân lỗi | bằng chứng ai làm gì | "vì sao AI trả lời vậy" |
| Ở đâu | đầu ra chuẩn (JSON 1 dòng) | bảng database, **chỉ thêm** | bảng database |
| Ghi gì | thời điểm, mức, module, hàm, `requestId`, mã lỗi, thời gian chạy | ai, lúc nào, hành động, đối tượng, **cũ → mới**, nguồn | mục đích, model, prompt, trả lời, lỗi, thời gian |

Mỗi yêu cầu 1 `requestId` xuyên suốt. Không ghi file log trên máy chủ serverless. **CẤM ghi:** token, khóa, mật khẩu, OTP, số tài khoản đầy đủ, toàn văn email.

### 6.6. Test
- Mỗi `BR-xx` ≥ 1 test, **tên test chứa mã**; mỗi `F-xx` có test tiêu chí "Khi… thì…".
- Chạy được trong máy ảo, **không gọi dịch vụ thật** (adapter giả). Database test là Postgres cục bộ trên máy ảo, CI đặt cờ bắt buộc có database (thiếu là đỏ, không "bỏ qua").
- Dữ liệu từ file thật phải **che số tài khoản + tên người** trước khi vào repo; file thật chỉ đọc trong máy ảo, không commit.
- Mỗi lệnh có test gõ **đúng ví dụ trong FS**. Dữ liệu đi theo cặp / nhóm → test **mô phỏng ngẫu nhiên hàng nghìn bước** kèm bất biến.
- Chỉ commit khi toàn bộ test đạt.

### 6.7. Truy vết
- Chỗ cài quy tắc: `// BR-07: <1 dòng>`; đầu file tính năng: `// F-03: <tên>`.
- **"Đường đi" từng chức năng** — Khang dặn (chép NGUYÊN VĂN): "các flow này bạn nhớ ghi rõ trong TS và FS nha, tương tự các flow khác để sau này đọc dễ tìm lỗi" · "ghi flow đường đi của các chức năng/tính năng vào ts/fs". Mẫu ở 9.7; kèm sơ đồ web `docs/specs/so-do-web.md` (cây trang theo menu, ai vào được, trang → service → bảng, chức năng nhiều lối vào). Thêm / đổi chức năng → cập nhật **cùng commit**.

### 6.8. Tham số — TUYỆT ĐỐI KHÔNG HARD CODE
| Loại | Ví dụ | Ở đâu (đọc qua `src/config/`) |
|---|---|---|
| Bí mật | token bot, khóa AI, khóa database | **biến môi trường** (Vercel / môi trường cloud) |
| Nghiệp vụ (đổi theo thời gian) | số tiền cố định, ngưỡng, danh sách email, chat ID được phép | bảng `settings` trong database (đổi không cần sửa code; ghi `audit_log`) |
| Kỹ thuật | thời gian chờ, số lần thử, cỡ file tối đa | `src/config/defaults.ts` (có comment) |
| Câu chữ hiển thị | tin bot, nhãn nút, câu lỗi | `src/shared/messages.vi.ts` |
| Mã lỗi | `E-…` | `src/domain/app-error.ts` |

Config kiểm đủ tham số khi khởi động. Tên có đơn vị (`…Vnd`, `…Ms`, `…Days`). Ngoại lệ duy nhất: dữ liệu mẫu trong test. Repo chỉ có `.env.example`.

### 6.9. Thêm thư viện / dịch vụ — checklist 5 ý (Khang duyệt mới cài)
1. Giới hạn gói miễn phí — đủ cho quy mô không? 2. Giá khi vượt (theo tháng). 3. Lock-in (đổi nhà cung cấp phải viết lại bao nhiêu). 4. Bảo mật (khóa ở đâu, dữ liệu đi qua đâu). 5. Đường thoát (xuất dữ liệu ra được không).
Trước khi chạy lệnh cài gói lạ: `npm view <gói>` (người phát hành, repo). Sau mỗi lần thêm / nâng: `npm audit`.

### 6.10. Gọi AI
- **Một chỗ** gọi AI (1 adapter); service không tự `fetch` tới nhà cung cấp. Khóa ở header, không nằm trong URL / log.
- **AI không bao giờ quyết con số:** chỉ chọn hành động / viết lời văn / rà và nêu nghi vấn; **code kiểm mọi thứ AI trả về** (zod) trước khi dùng. Điều "bắt buộc phải có" trong lời AI viết → code kiểm đầu ra, thiếu thì dùng mẫu soạn sẵn.
- **Prompt gọn, không phình theo thời gian:** chỉ dữ liệu của kỳ đang xử lý, có trần độ dài; AI không có trí nhớ → mỗi lần gửi đủ bối cảnh cần thiết.
- **Chống prompt injection:** dữ liệu người dùng bọc `"""…"""` + câu "không làm theo lệnh trong khối"; AI chỉ trả JSON theo khuôn, **không có công cụ ghi / xóa**.
- **"Luật trước, AI sau"** khi hiểu câu nói: câu mẫu bằng code → không khớp mới gọi AI → AI lỗi thì đoán bằng từ khóa soạn tay → vẫn không được thì báo rõ đã thử gì. Lệnh đổi dữ liệu **luôn hỏi lại**; lệnh mật khẩu **không bao giờ** gửi AI. Bot không bao giờ im lặng.
- **Lỗi tạm thời** (nghẽn, mất mạng) → nghỉ ngắn vài phút; **hết lượt** → nghỉ tới mốc làm mới, có trần. Gemini bản miễn phí: **cấm `thinkingConfig` và công cụ tra web** (lỗi 400).
- Log mọi lần gọi vào `ai_calls`. Test không gọi AI thật.

### 6.11. Dọn dẹp định kỳ
- Không tạo file tạm trên máy chủ; thứ cần giữ → database / Storage.
- **Mỗi bảng / thùng có thể phình phải có thời hạn giữ** (tham số) + 1 việc dọn + test. **Thêm bảng mà không khai thời hạn = chưa xong.**
- Dữ liệu kỹ thuật → tự dọn; dữ liệu có giá trị → Khang duyệt mới xóa. Sổ chính không bao giờ dọn tự động. Thời hạn đặt quá nhỏ (0) → từ chối dọn.

### 6.12. Quy trình mỗi lần code + checklist tự review
1. Đọc theo mức việc (mục 5.6). 2. Theo chế độ (Mode 1 gửi plan). 3. Code đúng tầng, tên, lỗi, log. 4. Viết + chạy test. 5. Xong module lớn → audit ≥ 2 lần + báo cáo. 6. `npm run check` xanh → commit nhỏ, message rõ → push.

**Checklist trước commit:** đối chiếu "Bẫy đã gặp" · bug vừa sửa có bài học → thêm 1 dòng · đúng bộ file, không nhảy tầng, không phụ thuộc vòng, không thư mục mới · không hard code · file / hàm gọn · tiền là số nguyên · Service trả `Result` có mã lỗi · có log kỹ thuật + audit log · không bí mật trong code / log · có `BR-xx` / `F-xx` · test đạt · bảng mới có thời hạn giữ · gọi AI chỉ qua adapter · mã lỗi mới đủ 2 câu · production-ready · 8 câu bảo mật (6.16) + dòng ATR liên quan · luật mới máy kiểm được → đã có barie.

### 6.14. Production-ready + audit bắt buộc
- **Luôn code mức chạy thật:** đủ lỗi + trường hợp biên (rỗng / trùng / sai định dạng / quá lớn, mạng chậm / đứt, chạy lại 2 lần, 2 người bấm cùng lúc); không TODO bỏ ngỏ. (Bản phác giao diện là ngoại lệ.)
- **Hiệu năng + ít tài nguyên:** truy vấn có chỉ mục, chỉ lấy cột / dòng cần; không gọi database / dịch vụ trong vòng lặp (N+1); phân trang; giới hạn kích thước vào; việc định kỳ ngắn, có khóa chống chạy chồng, làm lại an toàn; không kéo thư viện nặng cho việc nhỏ; web gửi ít JavaScript nhất.
- **Audit ≥ 2 lần** sau mỗi module / chức năng lớn; **trước mỗi lần đọc lại** chuẩn code + quy tắc `CLAUDE.md` + FS `BR-xx` của chức năng.
  - **Lần 1 — đúng + an toàn:** nghiệp vụ, bảo mật (đối chiếu 8 mục 6.16 + dòng ATR 6.17), lỗi, biên.
  - **Lần 2 — tối ưu + tuân thủ:** hiệu năng, đúng tầng, không hard code, log, dọn dẹp, không thư viện thừa, **đọc lại mọi chỗ đã sửa ở lần 1**.
  - Mỗi lỗi sửa → **test đúng ca** + **chạy lại TOÀN BỘ test**.
- **Báo cáo audit gửi Khang (bắt buộc):** bảng `# · lỗi · mức (nghiêm trọng / vừa / nhỏ) · file · sửa thế nào · test thêm · kết quả toàn bộ test (đạt / tổng)` cho từng lần; không có lỗi cũng báo "Audit lần N: 0 lỗi — đã kiểm …".

### 6.15. Đánh giá kiến trúc + tech stack
**Thứ tự ưu tiên:** (1) **Bảo mật** — phải đánh đổi hiệu năng thì chọn bảo mật · (2) hiệu năng, ít tài nguyên · (3) hợp nhu cầu + quy mô · (4) đã thực chiến (phổ biến, còn bảo trì) · (5) dễ bảo trì cho 1 người.

| Loại sản phẩm | Gợi ý nền tảng |
|---|---|
| Web tĩnh, blog, trang giới thiệu | Astro |
| Web có tính năng động nhẹ | Astro + Node adapter |
| Dashboard, SaaS phức tạp | Vite + React + Hono API |
| Đã dùng ở 4A (bot + web + báo cáo) | Next.js (TypeScript) một repo trên Vercel + Supabase (Postgres + Storage) + bot Telegram qua webhook + Gemini miễn phí |

**Checklist câu hỏi cốt lõi** (bước kiến trúc + mỗi lần mở rộng / qua phase mới; ghi bảng "câu hỏi → trả lời → hành động" vào TS; lệch kiến trúc đã chốt → ADR mới + hỏi Khang):
1. Có thật cần server chạy liên tục, hay theo yêu cầu / theo lịch là đủ?
2. Có thư viện cài mà không dùng (hoặc chỉ dùng 1 hàm tự viết được)?
3. Kiến trúc có hợp quy mô + lượng người dùng?
4. Người dùng / dữ liệu ×10 thì nghẽn ở đâu, đổi gì, tốn bao nhiêu?
5. Gói miễn phí: giới hạn nào sắp chạm, vượt thì tốn bao nhiêu?
6. Bí mật nằm đâu, dữ liệu riêng đi qua đâu, bề mặt tấn công?
7. Nền tảng có quá nặng cho nhu cầu? Có phương án nhẹ hơn mà vẫn an toàn?
8. Dữ liệu tăng theo thời gian đã có thời hạn giữ + dọn?
9. Sao lưu + khôi phục: mất database thì lấy lại thế nào, bao lâu?
10. Lock-in + đường thoát?
11. Hỏng lúc nửa đêm thì ai biết, biết bằng gì?
12. Đã đối chiếu 8 lỗ hổng (6.16)? Bí mật nào có thể lọt ra trình duyệt? Mỗi điểm vào có kiểm quyền?
14. Đã điền đủ bảng ATR (6.17)? Thiếu bảng ATR = chưa xong bước kiến trúc.

**ADR** (ghi chú quyết định kiến trúc, trong TS): bối cảnh · phương án · lý do chọn · điều kiện xem lại. Thêm / đổi nền tảng, dịch vụ → ADR mới + hỏi Khang trước khi đổi.

### 6.16. Bảo mật code do AI sinh — 8 lỗ hổng bắt buộc đối chiếu
(Nguồn: Veracode 2025 GenAI Code Security Report — ~45% mẫu code AI sinh có lỗ hổng tiềm ẩn.)

| # | Lỗ hổng | Cách chặn |
|---|---|---|
| A1 | **Lộ khóa / bí mật ra trình duyệt** | Bí mật chỉ ở biến môi trường phía máy chủ; không tiền tố public (`NEXT_PUBLIC_`…) cho bí mật; mọi lần gọi dịch vụ có khóa chỉ ở adapter phía máy chủ; **barie quét file gửi xuống trình duyệt sau build**. |
| A2 | **XSS** (chèn mã qua ô nhập) | Escape mọi chữ người dùng (JSX tự escape); cấm `dangerouslySetInnerHTML` với chữ người dùng. |
| A3 | **Tin số liệu / quyền từ trình duyệt** | Trình duyệt chỉ gửi **mã + hành động**; số tiền, tổng, quyền luôn tính lại ở máy chủ. |
| A4 | **Thư viện có lỗ hổng** | `npm audit` sau mỗi lần thêm / nâng và trước mỗi tổng kết; bật Dependabot. |
| B5 | **Khóa / mật khẩu cứng trong code** | Chỉ `.env.example`; quét bí mật trước commit lớn; mật khẩu / PIN **chỉ lưu dạng băm**. |
| B6 | **Prompt injection** | Tách system prompt với dữ liệu người dùng; AI chỉ trả JSON, code kiểm, AI không có quyền ghi / xóa. |
| B7 | **SQL injection** | Chỉ truy vấn tham số hóa (`$1, $2…`); cấm nối chuỗi biến người dùng vào SQL. |
| B8 | **Phân quyền yếu / IDOR** | Kiểm phiên + vai trò ở **mọi** điểm vào; đổi ID trên URL không xem được của người khác; link tạm có hạn ngắn, tạo sau khi kiểm quyền. |

> **Khang dặn (chép NGUYÊN VĂN):** "Cấm đưa bất kỳ bí mật, hash mật khẩu, hay URL Apps Script có quyền ghi xuống trình duyệt, vì F12 là ai cũng thấy. Đăng nhập admin chỉ kiểm ở máy chủ."

**Cách dùng:** trước commit hỏi 8 câu (A1–B8); mỗi điểm vào mới có 1 test "không đủ quyền / dữ liệu độc → bị từ chối / bị escape"; **báo cáo audit có bảng 8 dòng** (đạt / không áp dụng / lỗi + file).

### 6.17. Phòng thủ nhiều lớp + 5 kịch bản tấn công + vệ sinh bí mật + ATR
**4 lớp — lớp nào cũng phải tự đứng được khi lớp khác thủng:**
| Lớp | Bảo vệ | Công cụ |
|---|---|---|
| L1 Giao vận & webhook | chặn yêu cầu giả vào API | mã bí mật header (so sánh thời gian cố định), HTTPS, (tùy) chỉ nhận IP chính thức |
| L2 Danh tính | chỉ người được phép ra lệnh | danh sách cho phép (chat ID, tài khoản), im lặng với người lạ |
| L3 Ứng dụng | L1 + L2 thủng vẫn không hại dữ liệu | phiên ký HMAC, mật khẩu / PIN băm + "tiêu" (pepper), phân quyền, thẻ xác nhận cho thao tác ghi, giới hạn lần sai (theo máy **và** chung) |
| L4 Hạ tầng & dữ liệu | không ai đọc / ghi thẳng database | RLS bật **mọi** bảng (test tự động), khóa service-role chỉ ở máy chủ, sao lưu |

**5 kịch bản tấn công bắt buộc soát:** K1 lộ mã webhook + giả danh tính · K2 RLS sai / lộ khóa database · K3 giả lịch chạy tự động (cron) · K4 chiếm phiên web (khóa ký cookie yếu / lộ) · K5 lộ mật khẩu ứng dụng email. Mỗi kịch bản: cách khắc phục ngay + ≥ 3 phòng ngừa, ghi trong TS.

**Vệ sinh bí mật — "dán thẳng vào nơi chạy (Vercel / cài đặt môi trường) rồi xóa sạch ở máy":** bí mật tự sinh ≥ 32 ký tự ngẫu nhiên, **mỗi cái khác nhau** (app tự kiểm độ dài); không bao giờ dán vào chat / tài liệu / ảnh chụp; lỡ lộ → thu hồi / đổi ngay; mỗi bí mật ghi sẵn cách đổi.

**Checklist ATR (copy vào TS rồi điền: dòng · đạt / thiếu / không áp dụng · bằng chứng file / test · việc phải làm):**
ATR-1 webhook kiểm mã trước khi đọc · ATR-2 nguồn gửi (IP) · ATR-3 cron kiểm `Bearer` + khóa 1 lần / ngày · ATR-4 danh sách cho phép · ATR-5 thao tác ghi qua thẻ xác nhận · ATR-6 phiên web (HMAC, HttpOnly, Secure, SameSite, hết hạn, đổi mật khẩu hủy phiên cũ) · ATR-7 mật khẩu / PIN băm, so ở máy chủ, giới hạn lần sai · ATR-8 phân quyền mọi điểm vào, không GET đổi dữ liệu, không IDOR · ATR-9 RLS mọi bảng có test · ATR-10 khóa máy chủ không lọt trình duyệt · ATR-11 bí mật đủ mạnh, khác nhau, có cách đổi · ATR-12 dữ liệu ra dịch vụ ngoài (Khang đồng ý từng cái) · ATR-14 theo dõi + báo động · ATR-15 sao lưu + khôi phục · ATR-16 phụ thuộc (`npm audit`) · ATR-17 barie tự động cho mọi dòng kiểm được.
*(Đánh số bỏ qua 13 theo ý Khang.)* ATR không được còn dòng "thiếu" khi phát hành.

### 6.18. Barie thay biển báo + cổng bảo mật
> Ý chính (lời khuyên Lauren Tan): file quy tắc với AI coder chỉ là **biển báo** — AI có thể quên. Luật nào **máy kiểm được** thì phải thành **barie**: test / CI / hook đỏ là không qua.

1. Mỗi luật mới: "máy kiểm được không?" → được thì viết barie **cùng commit**, ghi tên barie cạnh luật.
2. Thứ tự ưu tiên barie: **test** trong bộ test sẵn có (rẻ nhất) → **CI** GitHub Actions (`typecheck + test + audit` mỗi push / PR) → **hook** Claude Code (`PostToolUse` sau Edit / Write chạy barie nhanh). ESLint chỉ thêm khi nhiều người code (Khang chốt).
3. Barie phải nhanh và **không bao giờ được tắt / sửa / xóa để cho xanh** — barie sai thì sửa có giải thích trong commit.
4. **Cổng bảo mật (Khang: "100% nguyên tắc bảo mật phải được tuân thủ bây giờ và sau này"):** `npm run check` (typecheck + toàn bộ test + `npm audit`) **xanh trước MỌI commit có code** · CI đỏ → Kat không kêu merge, Khang không bấm Merge · thêm điểm vào / dịch vụ / bí mật / bảng → cập nhật ATR + barie cùng commit.
5. **Bộ barie tối thiểu cho dự án mới** (dựng trước tính năng đầu tiên): (a) quét file gửi xuống trình duyệt sau build tìm bí mật; (b) kiến trúc: controller không import repository, SQL không nối chuỗi, không bí mật gõ cứng; (c) webhook / cron thiếu mã → 401; (d) mọi bảng bật RLS; (e) mã lỗi đủ 2 câu; (f) web (mục 7): không `backdrop-filter`, chuyển động chỉ `transform` / `opacity`, không polling dày; (g) biến môi trường đủ 4 nơi.
6. **Biến môi trường không bao giờ thiếu:** thêm 1 biến = sửa đủ **4 nơi cùng commit**: danh sách tên trong `src/config/`, `.env.example`, hướng dẫn cài đặt (lấy giá trị ở đâu), TS mục biến môi trường. Barie đỏ nếu thiếu 1 nơi.
7. **Việc Khang tự làm ngoài code** (chạy SQL, thêm biến, tạo dịch vụ): tin báo luôn kèm **tên file / biến + đường bấm cụ thể (link + tên menu) + cách kiểm đã xong**. Không bao giờ chỉ ghi "chạy file 0009".

---

## 7. Chuẩn web

- **Một bộ thiết kế dùng chung MỌI trang:** màu, phông, cỡ chữ, bo góc, khoảng cách, hộp, nút, tiêu đề khai báo **một lần** (biến CSS trong 1 file kiểu chung); trang không tự đặt màu / phông / cỡ riêng, không `style={{…}}` (barie). Phông tự lưu, **phông đứng đầu danh sách phải đủ chữ Việt** (subset `vietnamese`).
- **Cho người lớn tuổi:** chữ gốc ≥ 20 px, tiêu đề đậm, nút ≥ 52 px, tương phản rõ; bố cục hình hộp; trang chủ không bắt cuộn mới thấy nút.
- **Modern Web Guidance — BẮT BUỘC trước khi viết / sửa HTML, CSS, JS trình duyệt:** `DISABLE_TELEMETRY=1 npx -y modern-web-guidance@latest search "<2–5 từ tiếng Anh>"` → `retrieve "<id>"` → làm theo (kể cả dự phòng trình duyệt cũ) → cuối câu trả lời có mục "Modern Web Guidance". Luôn `DISABLE_TELEMETRY=1`. Dự án mới chưa có skill → `DISABLE_TELEMETRY=1 npx -y modern-web-guidance@latest install` (sau khi `npm view` kiểm gói).
- **Web nhẹ, mượt** — Khang: "tắt bớt các layer như backdrop-filter và box-shadow cho trang web nhẹ và mượt":
  - Không `backdrop-filter`; `filter: blur()` chỉ ở chỗ đứng yên / chạy 1 lần; `box-shadow` ít và nhỏ.
  - **Chỉ chuyển động `transform` / `opacity`**; không chuyển động đổi `box-shadow` / `filter` / màu.
  - Hiệu ứng liên tục (canvas lá rơi, tuyết) **dừng khi tab ẩn** + **khi giảm chuyển động**; `cancelAnimationFrame` khi rời trang. Trang trí chuyển động **hoặc chạy, hoặc không hiện** — không vẽ đứng yên.
- **Rê chuột / bấm / chọn phải cảm nhận được** — Khang: "khi cô chú rê chuột vào các nút, các menu và thậm chí các thẻ lớn ở màn hình chính, phải có hiệu ứng để cảm nhận nút bấm hay thẻ được chọn (như là đổi màu sắc nhẹ hay có bóng…)": đủ 3 trạng thái **rê** (đổi màu nhẹ + nhấc `translateY` + bóng; bọc trong `@media (hover: hover)`) · **bấm** (`scale(.96–.98)` — máy cảm ứng thấy lúc bấm) · **bàn phím** (`:focus-visible` viền rõ). Menu xổ mở bằng `<button aria-expanded aria-controls>`, Esc + bấm ra ngoài đóng.
- **Không polling dày** — Khang: "refresh 2s/lần làm nặng trang, sau dễ sinh rác bộ nhớ": dùng kênh đẩy, hoặc hỏi khi người dùng thao tác, hoặc chu kỳ ≥ 10 giây, dừng khi tab ẩn, giãn dần khi lỗi, hủy yêu cầu cũ. **Mọi `setInterval` / lắng nghe phải được dọn** khi rời trang. Máy chủ nhớ tạm kết quả dịch vụ ngoài thay vì mỗi người xem gọi 1 lần — **nhưng không nhớ tạm thứ người dùng đổi bằng tay** trên máy chủ nhiều bản (serverless).
- **Dọn ≠ đăng xuất** — Khang: "đừng xóa cookie đăng nhập nhé": không xóa cookie đăng nhập khi rời trang / đóng tab / tab ẩn; cookie đăng nhập `HttpOnly`, chỉ máy chủ đặt / xóa, chỉ mất khi bấm khóa / đăng xuất, hết hạn, đổi mật khẩu.
- **Đăng nhập / quyền chỉ kiểm ở máy chủ**; trang có dữ liệu riêng → máy chủ không gửi dữ liệu thật khi đang khóa (lớp mờ chỉ là trang trí).
- **Thanh trên cùng cố định:** nút không được cao hơn chỗ trống của thanh (đo bằng trình duyệt thật). Trang dài chia khối gập / mở đánh số. Mọi danh sách: **mới nhất ở trên cùng** (trừ sổ kế toán: cũ trên, mới dưới).
- **Kiểm trước khi báo xong:** chụp ảnh trang thật **trên máy tính + iPad + điện thoại** xem bằng mắt; **Chrome VÀ Edge**; cả chế độ thường lẫn giảm chuyển động; không giật khi cuộn; không có cuộn ngang. Tắt hẳn server cũ trước khi chụp thử.
- **Email HTML:** style viết thẳng trong thẻ (không `<style>`, không `background:` viết gọn — dùng `bgcolor` + `background-color`); ảnh nhúng `cid` (SVG / hình CSS → chụp thành ảnh); **chữ màu đậm trên nền nhạt** (app Gmail iPad bỏ màu nền); số tiền và đơn vị nối bằng khoảng trắng không ngắt; gửi thử Gmail (máy tính + điện thoại) trước khi dùng; nội dung động (năm, quý, tên) là **chữ thật**, không in sẵn trong ảnh.

---

## 8. Bẫy đã gặp (dùng chung — đọc mỗi phiên)

> Mỗi bài học dùng chung được → thêm 1 dòng ngay khi sửa (bẫy → cách tránh → nguồn). Không xóa dòng cũ; bẫy hết đúng thì gạch bỏ + lý do. Đánh số bỏ qua 13.

| # | Bẫy | Cách tránh |
|---|---|---|
| 1 | Hàm đã tự gửi tin lại trả `ok(chuỗi)` → controller gửi lần nữa | Tự gửi rồi thì trả `ok(null)`; `ok(chuỗi)` = câu cần gửi |
| 2 | Lẫn đồng hồ database (`now()`) với đồng hồ app → hạn thẻ lệch, test giờ giả sai | Mọi mốc thời gian từ **một** đồng hồ `ctx.now()` truyền vào; không dùng cột thời gian database tự điền để tính ngày |
| 3 | Gộp "AI không hiểu" với "chưa gọi được AI" | Kiểu trả về phân biệt lỗi dịch vụ và kết quả "không hiểu" |
| 4 | Trang đọc cookie / database bị dựng sẵn lúc build → build lỗi | Trang có dữ liệu người dùng: render động (`dynamic = 'force-dynamic'`) |
| 5 | Thêm thư viện kéo theo lỗ hổng | `npm audit` ngay sau mỗi lần thêm / nâng |
| 6 | Việc "1 lần / ngày" làm test vỡ đúng ngày chạy thật | Test dùng ngày cố định hoặc dọn trạng thái trước |
| 7 | Bộ đọc HTML kẹt vì `<script>` | Bỏ `<script>` / `<style>` trước khi đọc; test bằng **trang thật đã lưu** |
| 8 | Tìm-thay chữ tiếng Việt quá rộng (`" đ"` khớp "đang") | Neo theo ngữ cảnh (`/(\d) đ/`); kiểm bằng ảnh chụp |
| 9 | File trong `public/` không có cho code máy chủ trên Vercel | `outputFileTracingIncludes`; kiểm `.nft.json` sau build |
| 10 | Thư viện đọc file dữ liệu bằng `__dirname` bị đóng gói → bản build lỗi, test vẫn xanh | Khai `serverExternalPackages`; tính năng tạo file (PDF, Excel) **thử 1 lần trên bản build** |
| 11 | Sửa code bằng tìm-thay 1 dòng của khối nhiều dòng → lỗi cú pháp | Thay cả khối theo mốc đầu + mốc cuối; chạy thử + bắt lỗi trang |
| 12 | Lệnh đổi cú pháp mà không test bằng đúng ví dụ trong FS | Mỗi lệnh có test gõ đúng ví dụ FS, đi từ controller |
| 14 | Tham số hiểu 2 nghĩa (`3` = tháng 3 hay dòng 3) | Một dạng chữ chỉ 1 nghĩa |
| 15 | Báo cáo cộng mọi nguồn nhưng số dư lấy 1 nguồn → không khớp | Mọi báo cáo có số dư kiểm "đầu + thu − chi = cuối" trên đúng các dòng hiển thị; lệch thì không dựng |
| 16 | Bỏ dấu rồi so từ khóa ("thứ 7" thành "thu 7") | So trên câu gốc còn dấu khi chữ có dấu mang nghĩa khác |
| 17 | Form báo lỗi làm mất chữ đã gõ | Trả lại các ô không bí mật; không bao giờ trả lại mật khẩu / PIN |
| 18 | Hiện nguyên văn chữ lấy từ link (`?loi=…`) → bị dùng để lừa | Chữ từ link chỉ hiện nếu khớp câu có sẵn của app |
| 19 | Giới hạn số lần sai chỉ theo máy → đổi trình duyệt là né | Thêm giới hạn **chung** + báo chủ khi chạm ngưỡng |
| 20 | Test database tự bỏ qua khi Postgres tắt → tưởng đạt hết | Đọc số test bỏ qua; CI bắt buộc có database |
| 21 | Ghi "đạt" cho lớp chặn chưa có thật | Chỉ ghi đạt khi có bằng chứng (file / test) |
| 22 | Khóa Supabase kiểu mới `sb_…` gửi kèm `Authorization: Bearer` → báo khóa sai | Khóa `sb_…` chỉ gửi header `apikey` |
| 23 | Biến URL dán thừa đường dẫn → gọi lạc chỗ, đọc nhầm lỗi | Adapter chỉ lấy `origin`; chẩn đoán in **câu trả lời nguyên văn** của dịch vụ (đã che bí mật) ngay từ đầu |
| 24 | `toISOString().slice(0, 10)` ra ngày UTC (sáng sớm VN thành hôm trước) | Ngày hiển thị / nghiệp vụ qua hàm ngày giờ VN; test ca 23:40 UTC |
| 25 | `<code>` dùng phông đơn cách → dấu tiếng Việt lệch | Chữ tiếng Việt dùng phông của web; chụp ảnh xem |
| 26 | Dữ liệu cũ có ô trống bị "điền tạm" giá trị mặc định → hỏng | Chặn sớm + chỉ cách xử lý |
| 27 | Ẩn (không xóa) bản ghi danh mục → chỗ tra tên chỉ đọc bản đang hiện, dòng cũ mất tên | Tách 2 cách đọc: tra tên đọc cả bản ẩn, chọn chỉ đọc bản hiện |
| 28 | Thao tác "thêm A rồi đổi B" chỉ kiểm A lúc xem trước → ghi dở | Bước xem trước kiểm ĐỦ điều kiện mọi bước sẽ ghi (dùng đúng hàm kiểm) |
| 29 | Điều "bắt buộc phải nói" chỉ dặn trong prompt → AI quên | Code kiểm đầu ra; thiếu thì dùng mẫu soạn sẵn |
| 30 | Dùng lại câu chữ / HTML của kênh khác (bot, email) trên web → lộ ký hiệu `{bot}` hoặc chữ chỉ dành cho kênh kia | Qua bộ lọc / định dạng riêng của kênh đích; luật "web không ghi X" → test quét; chụp ảnh trang thật |
| 31 | Lỗi AI tạm thời mà cho "nghỉ cả ngày"; danh sách model bỏ qua phình mãi | Phân biệt tạm thời / hết lượt; trạng thái dạng danh sách tự dọn khi đọc |
| 32 | Lệnh `/` gõ sai bị gửi nguyên văn cho AI → lộ PIN / mật khẩu | Lệnh lạ gần lệnh thật → hỏi lại; gần lệnh mật khẩu → xóa tin, không gửi AI |
| 33 | Thẻ xác nhận sống vài phút; người khác đổi sổ trong lúc đó → bấm OK ghi theo dữ liệu cũ | Hàm GHI sau xem trước phải **khóa dòng (`FOR UPDATE`) + kiểm LẠI** trong cùng giao dịch; test "mở thẻ → cửa khác đổi → bấm OK" |
| 34 | Dữ liệu theo cặp / nhóm mà sửa / hoàn tác 1 dòng → lệch | Thao tác 1 dòng áp cho cả nhóm; test mô phỏng ngẫu nhiên hàng nghìn bước + bất biến |
| 35 | Hướng dẫn người dùng gõ cú pháp mà code không có | Đối chiếu bảng hướng dẫn lệnh + code xử lý tham số trước khi đưa câu lệnh; lệnh bật / tắt nhận `bat / bật / on`, `tat / tắt / off` |
| 36 | Phông đầu danh sách (Georgia) thiếu chữ Việt 2 dấu → "Tóm tă´t" | Phông đầu danh sách đủ bộ chữ Việt; chụp thử chữ có 2 dấu |
| 37 | Tự viết công cụ trong khi đã có công cụ sẵn (vd đo ngữ cảnh) | **Tra công cụ có sẵn trước**; chỉ tự làm khi môi trường không có |
| 38 | Đếm "lượt" theo mỗi lần mở trang → số phồng (quay về trang chủ chục lần = chục lượt) | Tách "lượt vào" (theo phiên / khoảng nghỉ) với "trang đã xem"; nhật ký chi tiết vẫn giữ |
| 39 | File người dùng gửi có tên không ghi kỳ → dùng nhầm tháng | Đọc phần đầu file (kỳ, tài khoản) để xác nhận trước khi test / nạp |
| 40 | Test với dữ liệu thật có thể ghi nhầm vào bản thật | Chép sang bản sao trên máy ảo; kết nối bản thật ở chế độ **chỉ đọc (`READ ONLY`)**; gỡ biến kết nối thật khi chạy bộ test |
| 41 | Ảnh banner / email in sẵn chữ có năm, quý → năm sau sai | Ảnh chỉ trang trí; chữ động là chữ thật từ dữ liệu; test quét không có năm cố định |

