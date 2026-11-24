# Quy tắc ghi chép — Auto-Exchange-Rate-Bot

> Tách từ `docs/SKILL_TAM.md` (bộ quy tắc của Khang, **bản tạm v0.1 — 24/11/2026**), gồm mục 3–5 nguyên văn.
> Mẫu file (9.x) nằm ở `docs/SKILL_TAM.md` mục 9. Hai bản lệch nhau → báo Khang.

## 3. Bộ file ghi chép — file nào, vai trò gì

| File | Vai trò | Ai đọc, khi nào | Cập nhật khi nào |
|---|---|---|---|
| `CLAUDE.md` | **QUY TẮC + HIỆN TRẠNG MỚI NHẤT** (tự nạp mỗi phiên) | Tự nạp mọi phiên | **NGAY, tự động, không đợi nhắc** khi đổi cách tiếp cận · logic nghiệp vụ · thêm / sửa / bỏ quy tắc (kể cả đổi số lượng) · cấu trúc / trách nhiệm module · tham số cấu hình quan trọng. **Sửa đè**, không viết "trước đây…". |
| `docs/STATUS.md` | Giai đoạn hiện tại, **việc dở / pending**, câu hỏi chờ Khang, bug đang mở, chế độ làm việc — **để KHANG nhớ** | **Bắt buộc đọc đầu phiên** | **Chỉ lúc tổng kết · ngay sau mỗi lần nén ngữ cảnh · hoặc khi Khang bảo** ("ghi pending task"). Sửa đè; xong / đã chốt → **XÓA dòng**. |
| `docs/history.md` | Sổ lịch sử đầy đủ có ngày giờ (trí nhớ dài hạn) | **Không đọc đầu phiên**; cần thì grep đúng mục (`#t<nn>`, `#d-<module>`) | **CHỈ khi Khang nói "tổng kết" / "kết thúc buổi"**: giữ bản cũ + thêm mục "🔄 Thay đổi" kèm giờ, nhãn trạng thái, báo cáo mục G. |
| `docs/bugs/BUG-NNNN-ten-ngan.md` | Hồ sơ 1 bug (10 ý) | Khi sửa bug cùng module | **Bug nghiêm trọng: tạo NGAY** (⏳, điền đủ khi xong ✅); **bug thường: lúc tổng kết**; bug nhỏ test bắt được khi code: không cần hồ sơ. |
| `docs/quy-trinh-note.md` | **Sổ quy trình**: mỗi hành động quan trọng (của Khang hoặc Kat) — nguồn để soạn skill | Chỉ khi soạn skill (đọc toàn bộ) | **NGAY** mỗi hành động quan trọng, thêm vào **CUỐI**, không đọc cả file. |
| `docs/CODING_STANDARDS.md` | Chuẩn code + web + bảo mật + "Bẫy đã gặp" | **Đọc TOÀN BỘ 1 lần / phiên** lúc bắt đầu code + **ngay sau mỗi lần nén** | Khang yêu cầu gì về cách code / log / dữ liệu / dịch vụ ngoài → **Kat tự thêm ngay**; bài học từ bug → 1 dòng "Bẫy đã gặp". |
| `docs/specs/` | `00-phong-van.md`, `01-requirements.md` (BRD), `02-functional-spec.md` (FS), `03-technical-spec.*` (TS), `so-do-web.md` | Grep đúng mục (`BR-xx`, `F-xx`, tiêu đề mục) | FS / TS khớp code chậm nhất lúc tổng kết; **"đường đi" + sơ đồ web cập nhật CÙNG commit** khi thêm / đổi chức năng. |
| `docs/huong-dan-cai-dat.md` | Việc Khang tự làm ngoài code (chạy SQL, thêm biến môi trường, tạo dịch vụ) | Khang | Mỗi khi có việc mới cho Khang: **link + menu bấm cụ thể + cách kiểm đã xong**. |
| `.env.example` | Chỉ **tên** biến môi trường, không giá trị | — | Thêm biến mới (đủ 4 nơi — mục 6.18). |

**Mục tiêu truy vết (Khang đặt):** 6 tháng sau, máy ảo đã dọn sạch, Khang hỏi "vì sao chỗ X tính như vậy?" → tra ra trong **1 phút** chỉ từ repo: mã `BR-xx` → `grep -rn "BR-xx"` → FS (lý do) → history.md (đổi lúc nào, vì sao) → `docs/bugs/` (từng sai ra sao).

---

## 4. LỊCH GHI SỔ — việc gì, lúc nào, file nào

| Khi nào | Kat làm gì | File |
|---|---|---|
| **Mở phiên mới** | Đọc `docs/STATUS.md` (bắt buộc). **Không** đọc `history.md`. Chạy `git status`, `git log --oneline -5`, `git branch -a` → có nhánh `claude/...` còn việc dở chưa merge? Hỏi Khang: tiếp từ nhánh đó hay từ `main`. Hỏi 1 câu: "Có việc nào Khang làm ngoài chat (GitHub, Vercel, Supabase…) mà Kat chưa ghi vào sổ quy trình không?" | STATUS (đọc) |
| **Bắt đầu viết code trong phiên** | Đọc **TOÀN BỘ** `CODING_STANDARDS.md` 1 lần, báo 1 dòng "Đã đọc CODING_STANDARDS (N dòng)". Tính năng mới / bug nghiêm trọng: grep thêm FS `BR-xx` + TS mục module + history `#d-<module>` + bug cùng module → báo "Đã đọc: …". | — |
| **Mỗi hành động quan trọng** (tạo repo, chốt spec, chốt công nghệ, commit / PR / merge, cài dịch vụ, đổi quy tắc, sự cố) | Ghi **NGAY** 1 mục vào cuối sổ quy trình (mẫu 9.4). Không ghi bí mật. | `quy-trinh-note.md` |
| **Đổi quy tắc / logic / cấu trúc module / tham số quan trọng** | Sửa đè `CLAUDE.md` **ngay**, không đợi nhắc. | `CLAUDE.md` |
| **Khang yêu cầu điều gì về cách code / log / dữ liệu / dịch vụ ngoài** | Thêm thành quy tắc **ngay** (ghi ngày + lý do). Luật máy kiểm được → viết barie cùng commit. | `CODING_STANDARDS.md` |
| **Khang dặn "lưu lại" / pending task / câu hỏi chờ** | **Nhớ trong ngữ cảnh, KHÔNG ghi file ngay**; ghi 1 lần lúc tổng kết hoặc ngay sau nén. **Ngoại lệ:** Khang nói rõ "ghi pending task" → ghi STATUS ngay + commit + push. | STATUS |
| **Phát hiện bug nghiêm trọng** (sai tiền / số liệu, dữ liệu thật, email người ngoài, bảo mật, tái phát, đụng nhiều module) | Tạo hồ sơ **NGAY** (⏳ + bối cảnh), điền đủ 10 ý khi sửa xong (✅); cập nhật mục lục `docs/bugs/README.md`. | `docs/bugs/` |
| **Bug thường** (giao diện, chữ, chậm…) gặp khi chạy thật / người dùng báo | Nhớ trong ngữ cảnh; viết hồ sơ **lúc tổng kết**. | `docs/bugs/` |
| **Bug nhỏ do test bắt được khi đang code**, sửa xong trước commit | Không cần hồ sơ: 1 dòng trong commit message; lúc tổng kết liệt kê ở history mục G. | commit msg |
| **Bài học dùng chung** (kể cả từ bug nhỏ) | Thêm **1 dòng** vào "Bẫy đã gặp" ngay khi sửa, chậm nhất lúc tổng kết. | `CODING_STANDARDS.md` |
| **Thêm / đổi 1 chức năng** | Cập nhật "Đường đi" FS + TS + sơ đồ web **cùng commit**. | FS, TS, `so-do-web.md` |
| **Thêm biến môi trường / điểm vào / dịch vụ / bảng** | Đủ 4 nơi cho biến môi trường; cập nhật ATR + barie cùng commit; bảng mới có thời hạn giữ + việc dọn. | config, `.env.example`, hướng dẫn cài, TS |
| **Xong 1 việc lớn, test đạt** | `npm run check` xanh → `git commit` + `git push` lên **nhánh của phiên** (Khang cho phép sẵn). Không `--force`, không push nhánh khác. | git |
| **Xong 1 module / chức năng lớn** | **Audit ≥ 2 lần** (mục 6.14) → báo cáo audit cho Khang → mới commit + push. | — |
| **Mỗi lượt trả lời** | Xem giờ VN (`TZ=Asia/Ho_Chi_Minh date`): **từ 22:30**, hoặc phiên dài / nhiều thay đổi chưa tổng kết → nhắc 1 dòng "Khang ơi tới giờ tổng kết rồi" (chỉ nhắc). Còn thay đổi chưa push → push trước khi kết thúc lượt, hoặc nói rõ vì sao chưa. | — |
| **Ngữ cảnh ≥ 60%** | Nhắc 1 dòng "Khang ơi ngữ cảnh đã N%, tới giờ tổng kết rồi". | — |
| **Ngữ cảnh ≥ 70%** mà Khang chưa tổng kết | **Kat TỰ tổng kết đủ 5 bước** (Rule 3) + tạo / cập nhật PR, **không chờ nhắc**; vẫn **không tự merge**. | history, STATUS, bugs, quy-trinh-note, PR |
| **Ngữ cảnh ≥ 75%** | (Tổng kết nếu chưa) rồi nhắc Khang gõ **`/compact`** trong **1 tin riêng, không kèm chữ nào khác** (Kat không tự gõ được lệnh này). | — |
| **Vừa nén ngữ cảnh** (cuộc trò chuyện tiếp tục bằng bản tóm tắt) | **Việc ĐẦU TIÊN:** đọc lại toàn bộ CODING_STANDARDS + grep mục file lớn của việc đang dở → **cập nhật STATUS** (việc dở, câu hỏi chờ, bug mở) + commit + push → báo "Đã đọc lại sau nén: … · STATUS đã cập nhật". **Cổng chặn:** chưa báo "Đã đọc: …" thì **chưa được viết dòng code đầu tiên**. | STATUS |
| **Khang nói "tổng kết" / "kết thúc buổi"** | **Rule 3 — đủ 5 bước, báo Khang từng bước** (mục 4.1). | history, STATUS, bugs, quy-trinh-note, PR |
| **Sau khi Khang merge + delete branch** | Làm lại nhánh tạm **từ `main` mới nhất** cho việc tiếp theo (cùng tên nếu tiếp phiên cũ). | git |
| **Máy ảo / hệ thống lỗi tạm thời** | Thử lại **thêm 1 lần**; vẫn lỗi → **dừng**, báo Khang việc còn dở. | — |

### 4.1. Rule 3 — Tổng kết = 5 bước
1. Ghi `docs/history.md` theo quy trình 5.2 (mục 5.3): 🔄 cho mọi thay đổi (có giờ), mục B / A1 / A2 / F, nhãn, báo cáo mục G; mục I chỉ link tới `docs/bugs/`. **Đối chiếu + cập nhật `docs/STATUS.md`**. Kiểm mọi hồ sơ bug đủ 10 ý. Ghi `docs/quy-trinh-note.md`. TS / FS khớp code.
2. `git commit` + `git push` lên nhánh của phiên.
3. **Tạo Pull Request** vào `main` (Khang cho phép sẵn ở bước tổng kết): mô tả ngắn "đã làm gì / test ra sao / còn dở gì".
4. **Kat KHÔNG tự merge, nhưng PHẢI kêu Khang merge** (link PR ở cuối câu trả lời): "Bấm **Merge** trên GitHub, rồi bấm **Delete branch**". **CI đỏ → không kêu merge**: nói rõ, đề xuất để PR nháp, mai tiếp từ nhánh.
5. Báo cáo ngắn trong chat (tóm tắt entry mục G) **+ 1 dòng kích thước `CLAUDE.md`** (vd "CLAUDE.md: 21,7 KB").

**PR ngoài tổng kết:** chỉ tạo khi Khang yêu cầu (hoặc luật 70% ngữ cảnh). Không bao giờ tự merge.

---

## 5. Quy tắc ghi chép chi tiết

### 5.1. Chín nguyên tắc cốt lõi
1. **Hai file, hai vai trò:** `CLAUDE.md` = sổ tay hiện trạng; `docs/history.md` = sổ lịch sử.
2. **`CLAUDE.md` = hiện trạng mới nhất, tự cập nhật NGAY**, sửa đè, không giữ bản cũ.
3. **`history.md` chỉ cập nhật khi "tổng kết"**; giữ nội dung cũ, ghi thêm có ngày giờ; ghi sai thì gạch `~~...~~` + đính chính có ngày.
4. Pending / bug đã xong → xóa khỏi `CLAUDE.md` / STATUS ngay lúc ghi sổ.
5. **Kích thước `CLAUDE.md`:** gốc là < 20 KB (4A đã nới, Khang chấp nhận lớn hơn). Vượt mức Khang đặt → chỉ **cảnh báo + đề xuất** chuyển bớt, không tự chuyển. Luôn báo kích thước lúc tổng kết.
6. **Không đọc cả `history.md`** — grep đúng mục.
7. **Tin code thật hơn tài liệu** — lệch thì báo.
8. **Nhãn trạng thái** cho mọi mục quan trọng của history (mẫu 5.4); mục không nhãn = mặc định 🟢; chỉ mục 🟢 / ⏳ mới áp dụng.
9. **Bug thuộc loại cần hồ sơ** → hồ sơ đủ 10 ý (mẫu 9.5).

### 5.2. Ghi gì vào đâu
| Loại | `CLAUDE.md` (ngay, ngắn) | `docs/history.md` (lúc tổng kết, đầy đủ) |
|---|---|---|
| Mục tiêu | 2–3 dòng | mục C |
| Kiến trúc / module | 1–3 dòng / module (mới nhất) | mục D, mỗi lần đổi 1 mục 🔄 |
| Quy tắc nghiệp vụ | danh sách hiện hành, đánh số | lý do, công thức, lịch sử ở D |
| Bài học | 1 dòng / nguyên tắc (hoặc "Bẫy đã gặp") | nguyên văn ở F |
| Việc dở dang | (trong STATUS) | chi tiết ở B; xong: `[x]` + cách sửa + test |
| Quyết định chờ / đã chốt | (trong STATUS) | A1 → bảng A2 |
| Audit, test, sự cố | — | D / E + G |
| Báo cáo tổng kết | — | mục G |
| Bug | — | file riêng `docs/bugs/`, mục I chỉ link |

### 5.3. Quy trình tổng kết (5.2 gốc)
1. Lấy ngày giờ hiện tại (giờ VN).
2. Rà mọi thay đổi trong phiên (Kat đã ghi nhớ trong ngữ cảnh: gì, mấy giờ, lý do, test).
3. `history.md` — **chèn đúng chỗ bằng grep, không đọc cả file:** mỗi thay đổi → 1 mục 🔄 ở cuối mục module / chủ đề (C / D / E); việc xong → `[x]` ở B; việc mới → Txx mới ở B; quyết định chốt → A1 → A2; bài học → F; bug → link ở I; **đổi nhãn** các mục bị thay / xong / bỏ.
4. Mục G — báo cáo tổng kết (mẫu 5.5).
5. Đối chiếu STATUS (đã xóa việc xong? đủ việc mới?); báo kích thước `CLAUDE.md`.
6. Trả lời Khang: báo cáo ngắn + dòng kích thước.

**Checklist tổng kết:** đủ 🔄 có giờ? B / A1 / A2 / F cập nhật? G đã ghi? STATUS khớp? Bug cần hồ sơ đủ 10 ý? Bug nhỏ liệt kê ở G? Mục mới có nhãn, mục đổi trạng thái đã đổi nhãn kèm ngày, không mục nào bị xóa? Đã báo kích thước `CLAUDE.md`?

### 5.4. Mẫu ghi history
**🔄 Thay đổi (cuối mục liên quan):**
```markdown
#### 🔄 Thay đổi — YYYY-MM-DD HH:MM (giờ VN) — <tên ngắn>
- **Trước:** <hiện trạng cũ>
- **Sau (hiện trạng mới):** <đúng như đã sửa đè vào CLAUDE.md>
- **Lý do / ai quyết định:** <...>
- **Ảnh hưởng:** <file code, quy tắc, test; mục CLAUDE.md đã sửa>
```
**Nhãn** (1 dòng ngay dưới tiêu đề mục; khi đổi chỉ sửa dòng nhãn, giữ dấu vết nhãn cũ):
| Nhãn | Dùng cho |
|---|---|
| 🟢 **HIỆU LỰC** từ dd/mm/yyyy | mục tiêu, kiến trúc, quy tắc, chuẩn code |
| ⛔ **HẾT HIỆU LỰC** từ dd/mm/yyyy — thay bởi <link> | như trên, đã lỗi thời |
| ⏳ **ĐANG CHỜ** từ dd/mm/yyyy | việc dở, quyết định chờ, bug chưa sửa |
| ✅ **ĐÃ XONG** dd/mm/yyyy | việc dở, bug đã sửa |
| ✅ **ĐÃ CHỐT** dd/mm/yyyy | quyết định của Khang |
| ❌ **HỦY** dd/mm/yyyy — <lý do> | không làm nữa |

Ví dụ: `> **Nhãn:** ✅ ĐÃ XONG 15/10/2026 — xem [BUG-0003](...) · trước đó: ⏳ ĐANG CHỜ từ 08/10/2026`

**Việc dở (mục B):**
```markdown
<a id="t<nn>"></a>
### [ ] T<nn> — <tên việc> · [nguồn/ngày] · `CODE` | `VERIFY` | `QĐ` | `DOC`
- **Vị trí:** <file:dòng> · **Vấn đề / bằng chứng:** <...> · **Ảnh hưởng nếu bỏ qua:** <...> · **Đề xuất:** <...>
```
Xong: `[ ]` → `[x]` + dòng `- ✅ YYYY-MM-DD HH:MM: <cách sửa> — <kết quả test>`.

**Quyết định chờ (A1) → đã chốt (bảng A2):**
```markdown
### D<n> — <câu hỏi ngắn> ⏳
- **Ghi nhận:** YYYY-MM-DD. **Chặn:** T<xx>. **Lựa chọn:** (a) … (b) … **Kat đề xuất:** … **Đã chốt:** —
```
`| Ngày giờ | Quyết định | Ai chốt / cách chốt | Chi tiết |`

**Bài học (mục F):**
```markdown
<a id="sc<nn>"></a>
**<n>. <Tên bài học — nguyên tắc tổng quát>** *(phát hiện YYYY-MM-DD)*
Case: <chuyện gì xảy ra> → Bài học: <nguyên tắc dùng được chỗ khác>
```

### 5.5. Báo cáo tổng kết (mục G — mỗi phiên 1 entry, mới nhất ở cuối)
```markdown
### YYYY-MM-DD (tổng kết lúc HH:MM)
**Làm gì:** <1–2 câu>
**Hoàn thành:** - <việc + kết quả test>
**Dang dở:** <việc chưa xong, chờ gì>
**Phát hiện hay:** <bug mới, bài học, số liệu đáng chú ý> (+ bug nhỏ test bắt được)
**Trạng thái cuối phiên:** <hệ thống, môi trường>
**Việc nên làm tiếp:** <ID theo ưu tiên>
**Kích thước CLAUDE.md:** <N,N KB>
```

### 5.6. Đọc tài liệu theo mức việc — cân bằng hiệu quả và token
> **Câu nguyên tắc (Khang chốt, chép nguyên ý):** "Tiết kiệm thời gian và tiết kiệm những thứ phải đọc chính là tiết kiệm token cho gia chủ: chỉ đọc lại file lớn (history.md / TS / FS / bối cảnh) khi thấy cần thiết. Đã đọc rồi thì mọi việc sau, kể cả bug lớn hay tính năng mới, dùng trí nhớ, không đọc lại, trừ 3 ngoại lệ (đọc lại đúng mục cần, 1 lần): (1) ngữ cảnh bị nén hoặc mở phiên chat mới; (2) mục cần dùng chưa từng đọc; (3) file vừa bị người khác sửa (Khang sửa tay, merge PR) — chỉ đọc phần thay đổi. (Trí nhớ không tính theo ngày — không đặt mốc số ngày.)"

| Việc | Đọc gì |
|---|---|
| File tiêu chuẩn code | **Toàn bộ 1 lần / phiên** lúc bắt đầu code + sau mỗi lần nén. Không đọc lại trước mỗi lần sửa. |
| File lớn (FS, TS, history, bối cảnh, phỏng vấn) | **Không bao giờ đọc cả file** — grep đúng mục. |
| Tính năng mới / sửa lớn 1 module | Grep FS + TS mục module + history `#d-<module>` + bug cùng module (+ dữ liệu mẫu nếu đụng nghiệp vụ gốc); báo "Đã đọc: …". |
| Bug nghiêm trọng | Đọc đủ như trên để không sinh bug khác; hồ sơ bug ngay. |
| Bug vừa / nhỏ / giao diện | **Sửa ngay**, chỉ đọc code liên quan, không đọc FS / TS / history. |

### 5.7. Những điều KHÔNG được làm
- ❌ Đợi Khang nhắc mới cập nhật `CLAUDE.md`; báo "xong" khi `CLAUDE.md` chưa đúng hiện trạng.
- ❌ Giữ bản cũ song song bản mới trong `CLAUDE.md`, viết "trước đây…".
- ❌ Ghi nhật ký, chi tiết audit, kết quả test dài vào `CLAUDE.md`.
- ❌ Cập nhật `history.md` giữa phiên khi Khang chưa nói "tổng kết" (hồ sơ bug ở **file riêng** thì được ghi ngay).
- ❌ Đọc toàn bộ `history.md`; xóa / tóm tắt mất nội dung cũ; ghi thay đổi không có ngày giờ.
- ❌ Xóa mục history vì lỗi thời — phải **đổi nhãn**. Áp dụng mục ⛔.
- ❌ Bug cần hồ sơ sửa xong mà không có hồ sơ.
- ❌ Viết dòng code đầu tiên sau nén / phiên mới khi chưa đọc lại và chưa báo "Đã đọc: …".
- ❌ Tổng kết mà quên mục G / quên báo kích thước `CLAUDE.md` / quên PR.
