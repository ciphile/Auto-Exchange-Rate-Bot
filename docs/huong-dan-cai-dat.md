# Hướng dẫn cài đặt — Rây (và Lũi) — từng bước một

> Viết cho Khang · Kat soạn 24/11/2026 · Bản 2 (25/11/2026): đủ phần 0 → 8.
> Cách đọc: làm **đúng thứ tự**, mỗi bước 1 việc. Chữ **in đậm trong ngoặc kép** như **"New project"** là **chữ trên nút / menu** đúng như màn hình (tiếng Anh). Màn hình các trang web hay đổi chút ít; nếu không thấy đúng chữ → xem dòng **"Nếu không thấy"** ngay dưới bước đó, hoặc chụp màn hình gửi Kat (**che hết khóa trước khi chụp**).

---

## Phần 0 — Đọc trước (5 phút)

### 0.1. Ba quy tắc vàng
1. **Không bao giờ dán khóa / token / mã bí mật vào chat với Kat**, vào ghi chú, email, Zalo, ảnh chụp. Khóa chỉ đi **một đường**: từ trang tạo ra nó → **dán thẳng** vào Vercel. Lỡ lộ → làm **Phụ lục B** (đổi khóa) ngay.
2. **Không cần ghi khóa ra giấy.** Mọi khóa đều **xem lại được** ở trang tạo ra nó (BotFather, Supabase, Google AI Studio) — trừ 3 mã tự tạo ở phần 5.3, mà mã đó thì dán xong là xong, cần lại thì tạo mã mới.
3. **Không bấm nút trả tiền** ở bất kỳ trang nào (**"Upgrade"**, **"Pro"**, **"Set up billing"**, **"Add payment method"**). Dự án này dùng **gói miễn phí 100%**. Trang nào đòi thẻ ngân hàng → dừng lại, hỏi Kat.

### 0.2. Chuẩn bị
| Thứ | Ghi chú |
|---|---|
| Máy tính có trình duyệt Chrome hoặc Edge | Làm trên máy tính dễ hơn điện thoại |
| Telegram trên điện thoại **hoặc** máy tính | Dùng tài khoản Telegram chính của Khang |
| Tài khoản **GitHub** của Khang (đang dùng với repo `Auto-Exchange-Rate-Bot`) | Dùng để đăng nhập Supabase và Vercel — khỏi tạo mật khẩu mới |
| Tài khoản **Google** (Gmail) | Dùng cho Google AI Studio (khóa Gemini) |
| Khoảng **60 phút** | Có thể chia nhiều lần: mỗi phần làm riêng được |

### 0.3. Giải thích nhanh mấy chữ lạ (so với AS400)
| Chữ | Nghĩa đời thường | Giống AS400 |
|---|---|---|
| **Bot Telegram** | 1 tài khoản Telegram do chương trình điều khiển | 1 user profile dành cho job tự động |
| **Token bot** | "Chìa khóa nhà" của bot — ai có là điều khiển được bot | Mật khẩu của user profile đó |
| **Supabase** | Kho dữ liệu trên mạng (database Postgres) | Thư viện file vật lý (PF) trên máy chủ |
| **Vercel** | Nơi chạy chương trình của bot trên mạng, chỉ "thức dậy" khi có việc | Subsystem chạy job khi có yêu cầu |
| **Biến môi trường** | Ô cất khóa bí mật bên cạnh chương trình, chương trình đọc lúc chạy | Data area chứa thông số, chương trình đọc lúc chạy |
| **Deploy / Redeploy** | Đưa bản mới lên chạy thật / chạy lại bản hiện có để đọc khóa mới | Promote lên production / restart subsystem |

---

## Phần 1 — Lấy mã tài khoản Telegram của Khang (`OWNER_TELEGRAM_ID`) — 3 phút

Mã này **không bí mật** (là dãy số), ghi ra giấy được. Bot dùng nó để biết "người này là Khang, được ra lệnh".

1. Mở **Telegram**.
2. Bấm vào **ô tìm kiếm**:
   - Điện thoại: biểu tượng **kính lúp 🔍** ở **góc trên bên phải**.
   - Máy tính: ô **"Search"** ở **góc trên bên trái**.
3. Gõ: `userinfobot` → bấm vào kết quả tên **"userinfobot"** (ảnh đại diện hình người máy, tên đăng nhập `@userinfobot`).
4. Bấm nút **"START"** (hoặc **"Bắt đầu"**) ở **dưới cùng** màn hình.
5. Bot trả lời vài dòng. Dòng **`Id: 123456789`** — **dãy số đó** là mã của Khang. Ghi ra giấy.
   - Nếu không thấy: gõ `/start` rồi bấm gửi.
6. Xong. Có thể bấm **"Block"** (chặn) bot này cho gọn — không ảnh hưởng gì.

✅ **Kiểm đã xong:** có 1 dãy số (thường 8–10 chữ số) ghi trên giấy.

---

## Phần 2 — Tạo bot Rây với @BotFather — 10 phút

**@BotFather** là bot chính chủ của Telegram, dùng để tạo bot.

### 2.1. Tạo bot
1. Trong Telegram, bấm **ô tìm kiếm** (như phần 1) → gõ `BotFather`.
2. Bấm vào **"BotFather"** có **dấu tích xanh ✔** cạnh tên. **Cẩn thận:** có nhiều bot giả tên gần giống — chỉ chọn cái có tích xanh, tên đăng nhập đúng `@BotFather`.
3. Bấm **"START"** ở dưới cùng (lần đầu mới có nút này).
4. Gõ `/newbot` → gửi.
5. BotFather hỏi **tên hiển thị** ("Alright, a new bot. How are we going to call it?"). Gõ: `Rây` → gửi.
6. BotFather hỏi **tên đăng nhập** ("Now let's choose a username…"). Quy tắc: **không dấu, không khoảng trắng, phải kết thúc bằng `bot`**. Ví dụ: `ray_tygia_bot`.
   - Nếu BotFather báo **"Sorry, this username is already taken"** → tên đã có người dùng, thử tên khác: `ray_sgd_bot`, `ray_sgd_vnd_bot`, `ray_nhom_a_bot`…
7. Thành công: BotFather gửi tin dài bắt đầu bằng **"Done! Congratulations on your new bot."** Trong tin có 1 dòng dài dạng `1234567890:AAH...` — **đó là token**.
   - **ĐỪNG copy token đi đâu cả.** Phần 5 sẽ lấy lại token đúng lúc dán vào Vercel.

### 2.2. Tắt "Group Privacy" (để bot đọc được tin trong group khi Khang bật "lắng nghe")
> Chỉ **chủ bot** (Khang) làm được việc này. Phải làm **trước khi** đưa bot vào group; nếu bot đã ở trong group rồi thì phải **xóa bot ra rồi thêm lại** mới ăn.
> Yên tâm: tắt ở đây **không** có nghĩa bot tự đọc hết. Công tắc thật nằm trong code: `/langnghe off` (mặc định) thì bot **bỏ ngay** mọi tin, không lưu, không gửi AI (BR-16).

1. Vẫn trong chat với BotFather, gõ `/setprivacy` → gửi.
2. BotFather hiện danh sách bot của Khang dạng nút bấm → bấm vào **`@ray_tygia_bot`** (tên Khang vừa đặt).
3. BotFather hiện 2 nút **"Enable"** và **"Disable"** → bấm **"Disable"**.
4. BotFather trả lời **"Success! The new status is: DISABLED. /help"**.

✅ **Kiểm:** gõ `/mybots` → bấm bot Rây → **"Bot Settings"** → **"Group Privacy"** → phải ghi **"Privacy mode is disabled for Rây"**. Bấm **"« Back to Bot"** để thoát.

### 2.3. (Không bắt buộc) Ảnh đại diện + lời giới thiệu
- `/setuserpic` → chọn bot → gửi 1 tấm ảnh (dùng ảnh Khang tự có, không lấy ảnh trên mạng).
- `/setdescription` → chọn bot → gõ vài chữ, vd `Rây — báo tỉ giá SGD/VND cho nhóm A`.

### 2.4. Lũi — để sau
Lũi làm sau (chờ Khang gửi tính cách, giọng văn, lĩnh vực tin). Muốn **giữ chỗ tên đăng nhập** cho Lũi thì làm lại 2.1 + 2.2 với tên `Lũi` (vd `lui_tin_tuc_bot`). Biến `LUI_BOT_TOKEN` và `LUI_WEBHOOK_SECRET` **để trống** tới khi Kat báo.

⚠️ **Chưa đưa bot vào group.** Việc đó ở phần 8, sau khi bot chạy được.

---

## Phần 3 — Tạo kho dữ liệu Supabase — 10 phút

1. Mở trình duyệt, vào **https://supabase.com**.
2. Bấm **"Start your project"** (nút xanh lá, **giữa màn hình**) hoặc **"Sign in"** (**góc trên bên phải**).
3. Bấm **"Continue with GitHub"** → trang GitHub hỏi cho phép → bấm **"Authorize supabase"** (nút xanh lá).
4. Lần đầu, Supabase có thể hỏi tạo **Organization** (tổ chức):
   - **Name:** `khang-personal` (tùy ý)
   - **Type:** **"Personal"**
   - **Plan:** **"Free - $0/month"** ← **bắt buộc chọn gói Free**
   - Bấm **"Create organization"**.
5. Tới trang **"Create a new project"** (nếu không tự tới: bấm **"New project"**, nút xanh lá **góc trên bên phải** trang Projects):
   - **Project name:** `rate-bot`
   - **Database Password:** bấm **"Generate a password"** (chữ nhỏ ngay dưới ô). **Không cần ghi lại** — bot không dùng mật khẩu này (quên thì đặt lại được trong Project Settings → Database).
   - **Region:** chọn **"Southeast Asia (Singapore)"** (gần Việt Nam nhất, bot trả lời nhanh hơn).
   - Mục **"Security options"** (nếu có, bấm để mở): **giữ nguyên mặc định**. Riêng **"Enable Data API"** phải **đang bật** (bot đọc / ghi dữ liệu qua đường này).
   - Bấm **"Create new project"** (nút xanh lá, **dưới cùng**).
6. Chờ khoảng **2 phút** (màn hình ghi "Setting up project…"). Xong thì thấy trang tổng quan của project.

✅ **Kiểm:** góc trên bên trái ghi **`rate-bot`**, cạnh đó có chữ **"Free"**.

> Lưu ý gói Free: project **tạm ngủ nếu 1 tuần không ai dùng**. Khi bot chạy (phần 7), bot "gõ cửa" mỗi phút nên không bị ngủ. Lỡ bị ngủ: vào trang Supabase → bấm **"Restore project"**.

**Hai thứ phần 5 sẽ cần lấy ở đây** (chưa làm bây giờ, chỉ để biết chỗ):
- **Project URL** → biến `SUPABASE_URL`: menu **bên trái, dưới cùng**, biểu tượng **bánh răng ⚙️ "Project Settings"** → mục **"Data API"** → ô **"Project URL"** (dạng `https://abcd1234.supabase.co`). Cái này **không bí mật**.
  - Nếu không thấy: bấm nút **"Connect"** ở **thanh trên cùng** → thẻ **"App Frameworks"** hoặc **"API"** → có dòng `SUPABASE_URL`.
- **Secret key** → biến `SUPABASE_SECRET_KEY`: **⚙️ Project Settings** → mục **"API Keys"** → phần **"Secret keys"** → dòng `default` → bấm **biểu tượng con mắt 👁** / **"Reveal"** rồi **biểu tượng copy 📋**. Khóa bắt đầu bằng `sb_secret_`.
  - **KHÔNG dùng** "Publishable key" (bắt đầu `sb_publishable_`) và **không dùng** khóa cũ `anon` / `service_role` (dạng `eyJ…`).
  - Nếu chỉ thấy thẻ **"Legacy API Keys"**: bấm thẻ bên cạnh **"API Keys"** / **"Publishable and secret API keys"**; nếu chưa có secret key → bấm **"Create new API keys"** / **"Add new secret key"**.

---

## Phần 4 — Lấy khóa AI Gemini (miễn phí) — 5 phút

1. Vào **https://aistudio.google.com** → đăng nhập bằng tài khoản Google.
2. Lần đầu: trang hỏi đồng ý điều khoản → tích ô đồng ý → bấm **"Continue"** / **"I accept"**.
3. Bấm **"Get API key"** — nằm ở **menu bên trái, phía dưới** (biểu tượng chìa khóa 🔑). Nếu menu bên trái đang thu gọn: bấm **biểu tượng ☰** ở **góc trên bên trái** để mở.
   - Nếu không thấy: vào thẳng **https://aistudio.google.com/apikey**.
4. Bấm **"Create API key"** (nút xanh, **góc trên bên phải** của danh sách khóa).
5. Hộp thoại hỏi project Google Cloud:
   - Có sẵn project (thường tên **"Gemini API"** / **"Default Gemini Project"**) → chọn nó → bấm **"Create API key in existing project"**.
   - Chưa có → bấm **"Create API key in new project"**.
6. Khóa hiện ra (dạng `AIza…`). **Đừng copy đi đâu** — bấm **"Done"** / đóng hộp thoại. Phần 5 sẽ quay lại trang này copy.

⚠️ **Không bấm** **"Set up billing"** / **"Upgrade"** / **"Tier 1"**. Gói miễn phí đủ dùng (Kat đã tính: group nhắn ít). Gói miễn phí: Google **có thể dùng nội dung gửi lên** để cải tiến AI — Khang đã đồng ý điều này (ATR-12).

✅ **Kiểm:** trang **"API keys"** có 1 dòng khóa, cột **"Plan"** / **"Tier"** ghi **"Free"** (hoặc "Free tier").

---

## Phần 5 — Tạo chỗ chạy bot trên Vercel + dán khóa — 25 phút

> ⛔ **CHỈ LÀM PHẦN NÀY SAU KHI KHANG ĐÃ MỢT PR CÓ FILE `vercel.json` VÀ `.vercelignore`** (PR Kat gửi kèm hướng dẫn này). Lý do: repo là private, nhưng địa chỉ `….vercel.app` **ai cũng mở được**. Thiếu 2 file đó, Vercel có thể **phát nguyên thư mục `docs/` ra mạng** — gồm cả tài liệu riêng (KC-07).

### 5.1. Tạo tài khoản Vercel
1. Vào **https://vercel.com/signup**.
2. Trang hỏi loại dùng: chọn **"Hobby"** ("I'm working on personal projects") ← **miễn phí**. Ô **"Your Name"**: gõ `Khang` → **"Continue"**.
3. Bấm **"Continue with GitHub"** → GitHub hỏi cho phép → **"Authorize Vercel"**.
4. Nếu Vercel hỏi số điện thoại để xác minh: nhập số của Khang, nhận mã SMS, gõ mã. (Không phải thanh toán.)

### 5.2. Đưa repo lên Vercel (deploy lần đầu — chưa có khóa, bot chưa chạy, không sao)
1. Ở trang chủ Vercel (**Dashboard**), bấm **"Add New…"** (nút **góc trên bên phải**) → chọn **"Project"**.
2. Mục **"Import Git Repository"**:
   - Thấy dòng **`Auto-Exchange-Rate-Bot`** → bấm **"Import"** bên phải dòng đó.
   - **Không thấy:** bấm chữ **"Adjust GitHub App Permissions →"** (hoặc **"Configure GitHub App"**) ngay dưới danh sách → trang GitHub mở ra → mục **"Repository access"** → chọn **"Only select repositories"** → bấm **"Select repositories"** → chọn **`Auto-Exchange-Rate-Bot`** → bấm **"Save"** (nút xanh lá, dưới cùng) → quay lại tab Vercel, danh sách tự hiện repo → **"Import"**.
   - ⚠️ Chọn **"Only select repositories"**, **không** chọn "All repositories" (Vercel chỉ nên thấy đúng 1 repo này).
3. Trang **"Configure Project"** / **"New Project"**:
   - **Project Name:** `rate-bot` (tên này thành địa chỉ `rate-bot.vercel.app` — trùng người khác thì Vercel tự thêm đuôi, không sao).
   - **Framework Preset:** chọn **"Other"**.
   - **Root Directory:** để nguyên `./`.
   - **Build and Output Settings**, **Environment Variables:** **để nguyên, không nhập gì** (file `vercel.json` trong repo đã cài sẵn; khóa sẽ dán ở bước 5.3 cho an toàn hơn).
   - Bấm **"Deploy"** (nút đen / trắng, **dưới cùng**).
4. Chờ 1–2 phút → màn hình **"Congratulations!"** (pháo hoa 🎉) → bấm **"Continue to Dashboard"**.
5. Ghi lại **địa chỉ Domains** (vd `rate-bot.vercel.app`) — **không bí mật**, gửi Kat được.

✅ **Kiểm chống lộ tài liệu (KC-07) — bắt buộc:**
- Mở `https://rate-bot.vercel.app/robots.txt` (thay `rate-bot` bằng tên thật) → thấy 2 dòng `User-agent: *` / `Disallow: /` → đúng.
- Mở `https://rate-bot.vercel.app/docs/specs/02-functional-spec.md` → phải ra trang **"404: NOT_FOUND"**. Nếu **thấy chữ tài liệu** → **dừng**, vào **"Settings"** → kéo xuống dưới cùng → **"Delete Project"**, báo Kat ngay.

### 5.3. Dán khóa vào Vercel (biến môi trường)
**Cách dán 1 biến** (lặp lại cho từng dòng ở bảng bên dưới):
1. Trong project `rate-bot` trên Vercel: bấm thẻ **"Settings"** (**thanh ngang phía trên**, ngoài cùng bên phải) → menu **bên trái** bấm **"Environment Variables"**.
2. Ô **"Key"**: gõ **đúng tên biến** (chữ HOA, gạch dưới — copy tên từ bảng dưới cho chắc).
3. Ô **"Value"**: dán giá trị (cách lấy ở cột "Lấy ở đâu").
4. **"Environments"**: chỉ để **"Production"** được chọn — **bỏ chọn** "Preview" và "Development".
5. Bật công tắc **"Sensitive"** (nếu có) → từ giờ không ai (kể cả Khang) xem lại được giá trị trên Vercel — an toàn hơn; cần đổi thì dán giá trị mới đè lên.
6. Bấm **"Save"**.

| # | Tên biến (Key) | Lấy ở đâu (Value) |
|---|---|---|
| 1 | `OWNER_TELEGRAM_ID` | Dãy số ở **phần 1** (tờ giấy). |
| 2 | `RAY_BOT_TOKEN` | Telegram → chat **BotFather** → gõ `/mybots` → bấm **bot Rây** → bấm **"API Token"** → BotFather hiện token → **chạm giữ / bôi đen để copy** cả dòng (dạng `1234567890:AAH…`) → dán vào Vercel. |
| 3 | `SUPABASE_URL` | Supabase → **⚙️ Project Settings** → **"Data API"** → **"Project URL"** → bấm **📋 copy** (xem phần 3). |
| 4 | `SUPABASE_SECRET_KEY` | Supabase → **⚙️ Project Settings** → **"API Keys"** → **"Secret keys"** → **👁 Reveal** → **📋 copy** (bắt đầu `sb_secret_`). |
| 5 | `GEMINI_API_KEY` | https://aistudio.google.com/apikey → dòng khóa vừa tạo → bấm vào khóa (hoặc biểu tượng **📋 copy**) → copy (dạng `AIza…`). |
| 6 | `RAY_WEBHOOK_SECRET` | **Tự tạo** bằng lệnh ở mục 5.4 (mỗi lần chạy ra 1 mã mới). |
| 7 | `DATA_ENCRYPTION_KEY` | **Tự tạo** bằng lệnh ở mục 5.4 — **chạy lại lệnh lần nữa**, không dùng lại mã của dòng 6. |
| — | `TICK_SECRET` | **Chưa làm bây giờ** — để phần 7 (phải dán cùng lúc vào Vercel và Supabase). |
| — | `LUI_BOT_TOKEN`, `LUI_WEBHOOK_SECRET` | **Để trống** tới khi làm Lũi. |

### 5.4. Tự tạo mã bí mật ngẫu nhiên (cho dòng 6 và 7)
Mỗi mã là **64 ký tự** gồm số 0–9 và chữ a–f. **Mỗi dòng 1 mã khác nhau** (app tự kiểm, trùng là báo lỗi).

**Máy Mac:**
1. Bấm **🔍 (Spotlight)** ở **góc trên bên phải** màn hình → gõ `Terminal` → Enter.
2. Gõ đúng lệnh sau rồi Enter:
   ```
   openssl rand -hex 32
   ```
3. Hiện 1 dòng 64 ký tự → **bôi đen cả dòng** → **⌘ + C** → sang Vercel dán vào ô **"Value"**.
4. Dán xong → quay lại Terminal gõ `clear` Enter (xóa màn hình) → cần mã tiếp thì chạy lại lệnh ở bước 2.

**Máy Windows:**
1. Bấm nút **Start** (logo Windows, **góc dưới bên trái**) → gõ `PowerShell` → bấm **"Windows PowerShell"**.
2. Copy **nguyên dòng** sau, dán vào PowerShell (**chuột phải** để dán) rồi Enter:
   ```
   $b = New-Object byte[] 32; [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($b); ($b | ForEach-Object { $_.ToString('x2') }) -join ''
   ```
3. Hiện 1 dòng 64 ký tự → **bôi đen cả dòng** → **Ctrl + C** → sang Vercel dán.
4. Dán xong → gõ `cls` Enter → cần mã tiếp thì chạy lại dòng ở bước 2 (bấm **mũi tên lên ↑** để gọi lại lệnh cũ).

> Mã tự tạo **không cần lưu**: dán vào Vercel là xong. Mất / lộ thì tạo mã mới dán đè (Phụ lục B).

### 5.5. Chạy lại để Vercel đọc khóa mới
1. Bấm thẻ **"Deployments"** (thanh ngang phía trên).
2. Dòng **trên cùng** (mới nhất) → bấm **dấu ba chấm "⋯"** ở **cuối dòng, bên phải** → **"Redeploy"** → hộp thoại → bấm **"Redeploy"** lần nữa.
3. Chờ tới khi dòng đó có chấm xanh **"Ready"**.

✅ **Kiểm phần 5:** **Settings → Environment Variables** có đủ **7 dòng**: `OWNER_TELEGRAM_ID`, `RAY_BOT_TOKEN`, `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `GEMINI_API_KEY`, `RAY_WEBHOOK_SECRET`, `DATA_ENCRYPTION_KEY` — mỗi dòng ghi **"Production"**.

**Báo Kat** (chỉ những thứ này — **không** gửi khóa): "Xong phần 1–5" · tên đăng nhập bot (vd `@ray_tygia_bot`) · địa chỉ Vercel (vd `rate-bot.vercel.app`) · kết quả kiểm KC-07 (404 hay không).

---

## Phần 6 — Tạo bảng dữ liệu trên Supabase — 5 phút

> Giống tạo file vật lý trên AS400 (CRTPF) — chạy **1 lần**. Chạy lại cũng không sao (không xóa gì). **Bản code mới có thêm bảng → chạy lại file này** là đủ.

1. Mở GitHub repo → bấm vào thư mục **`src`** → **`repositories`** → file **`schema.sql`** → bấm nút **"Copy raw file"** (biểu tượng 2 tờ giấy chồng nhau, **góc trên bên phải** khung chữ).
2. Mở https://supabase.com/dashboard → bấm vào project của bot.
3. Thanh menu dọc **bên trái** → bấm **"SQL Editor"** (biểu tượng `>_`).
4. Ô soạn thảo lớn ở giữa → bấm vào → `Ctrl + A` rồi `Delete` (xóa chữ có sẵn) → `Ctrl + V` (dán).
5. Bấm nút xanh **"Run"** (**góc dưới bên phải** ô soạn thảo; hoặc `Ctrl + Enter`).
   - Nếu hiện hộp hỏi **"Potential issue detected"** / **"destructive operation"** → bấm **"Run this query"** (file không xóa gì).
6. **Kiểm đã xong:** menu trái → **"Table Editor"** → thấy đủ **10 bảng**: `ai_calls`, `audit_log`, `bot_config`, `bot_state`, `chat_context`, `chat_log`, `holidays`, `members`, `rates`, `tick_runs`. Bấm thử 1 bảng → góc trên có chữ **"RLS enabled"** (hoặc không có cảnh báo đỏ "RLS disabled") là đúng.

### 6.1. (Nên làm) Nhập hồ sơ thành viên — để bot biết ai là ai, gọi đúng tên thật
Tên thật **chỉ nằm trong database** (không bao giờ trong repo). Kat soạn sẵn đoạn SQL từ hồ sơ riêng tư của Khang khi Khang nhắn "soạn SQL thành viên"; hoặc Khang tự gõ theo mẫu:
```sql
insert into members (name, aliases, how_to_call, work, about) values
('Tên thật', 'tên hiển thị Telegram, tên gọi khác', 'cách bot gọi, vd: sếp Tên', 'công việc', 'tính tình, gia đình (1–2 câu)');
```
- Cột `aliases`: ghi **đúng tên hiển thị trên Telegram** của người đó (bot dò tên này để biết ai đang nói).
- Bối cảnh chung của nhóm (vd "nhóm code COBOL trên AS400, làm từ xa, thứ Sáu điền timesheet"):
```sql
insert into bot_state (bot, key, value) values ('ray', 'group_profile',
  '{"name": "tên nhóm", "description": "mô tả 1 câu", "facts": ["ý 1", "ý 2"]}'::jsonb)
on conflict (bot, key) do update set value = excluded.value;
```
- Bấm **"Run"** như trên. Kiểm: **Table Editor** → bảng `members` có đủ người.

## Phần 7 — Bật nhịp lịch mỗi PHÚT — 10 phút

> Giống lên lịch job bằng `ADDJOBSCDE` trên AS400: cứ **1 phút** Supabase "gõ cửa" địa chỉ `/api/tick` của bot. Mỗi lần gõ bot làm việc **nhẹ** (có ai hỏi "nguồn nào?" mà im lặng 2 phút thì Rây tự trả lời); **cứ 10 phút 1 lần** bot mới làm việc **nặng** (lấy giá, báo giá, nhắc lễ, dọn dẹp) — bot tự canh, Khang không phải làm gì. Lần gõ cửa đầu tiên bot cũng **tự đăng ký webhook với Telegram** (Khang không phải làm gì thêm).

**Cần có:** địa chỉ Vercel của bot (vd `https://ten-project.vercel.app` — xem ở Vercel → project → ô **"Domains"**) và mã `TICK_SECRET` đã dán vào Vercel ở phần 5.3 (dòng 7). **Không dán 2 thứ này vào chat.**

1. Supabase → menu trái **"Database"** → **"Extensions"** → ô tìm kiếm gõ `pg_cron` → gạt công tắc **bật** (màu xanh) → bấm **"Enable extension"**. Làm lại với `pg_net`.
   - Nếu không thấy "Extensions": menu trái **"Integrations"** → **"Cron"** → **"Enable"**.
2. Menu trái **"SQL Editor"** → bấm **"+"** (**góc trên bên trái**, cạnh chữ "SQL Editor") → **"Create a new snippet"** → dán đoạn dưới, **sửa 2 chỗ** trong dấu nháy đơn:
```sql
select vault.create_secret('https://ĐỊA-CHỈ-VERCEL-CỦA-KHANG/api/tick', 'tick_url');
select vault.create_secret('DÁN-TICK_SECRET-VÀO-ĐÂY', 'tick_secret');
```
   → bấm **"Run"** → thấy 2 dòng mã dài (uuid) là xong. **Xóa ngay đoạn chữ vừa dán** (`Ctrl + A`, `Delete`) để mã không nằm trên màn hình.
   - Gõ nhầm, muốn làm lại: chạy `delete from vault.secrets where name in ('tick_url', 'tick_secret');` rồi chạy lại bước 2.
3. Snippet mới → dán nguyên văn (không sửa gì) → **"Run"**:
```sql
select cron.schedule('ray-tick', '* * * * *', $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'tick_url'),
    headers := jsonb_build_object('Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'tick_secret')),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  );
$$);
```
> **Đã tạo lịch cũ `*/10` từ bản hướng dẫn trước?** Đổi sang mỗi phút bằng 1 lệnh: `select cron.alter_job((select jobid from cron.job where jobname = 'ray-tick'), schedule := '* * * * *');`

4. **Kiểm đã chạy (đợi 2–3 phút)** — snippet mới → dán → **"Run"**:
```sql
select status_code, content, created from net._http_response order by created desc limit 5;
```
   - Thấy `200` và chữ `ok` → **đúng** ✅.
   - Thấy `401` → mã `TICK_SECRET` trong Vault khác với trên Vercel → làm lại bước 2 (xóa rồi tạo lại).
   - Thấy `404` → sai địa chỉ (thiếu `/api/tick` hoặc sai tên project).
   - Thấy `500` → thiếu / sai biến môi trường trên Vercel → Vercel → project → **"Logs"** tìm dòng `env_invalid` (dòng đó ghi **tên** biến sai, không ghi giá trị).
5. Mở Telegram → chat riêng với Rây → gõ `/trangthai` → dòng **"Nhịp lịch (tick) gần nhất"** có giờ là xong. Bot trả lời được tức là webhook đã tự đăng ký.

## Phần 8 — Đưa Rây vào nhóm A — 3 phút
1. Telegram → mở nhóm A → bấm **tên nhóm** (trên cùng) → **"Add members"** / **"Thêm thành viên"** → tìm tên bot Rây → **"Add"**.
2. Rây nhắn riêng Khang: *"Bot vừa được thêm vào nhóm…"*.
3. **Trong nhóm A**, Khang gõ: `/gannhom` → Rây gửi **thẻ xác nhận vào chat riêng** của Khang → bấm **✅ Làm**.
4. Chat riêng với Rây gõ `/gioithieu` → bấm **✅** → Rây tự giới thiệu ngắn trong nhóm.
5. Gõ `/lenh` để xem mọi lệnh; `/caidat` xem cài đặt. Mặc định: **ngoan**, **tắt lắng nghe** (chỉ trả lời khi được reply / @tên bot), mức tần suất 3. Muốn gọi "Rây ơi" là trả lời → `/langnghe on`.

## Phụ lục A — Bảng biến môi trường (để dò)
| Biến | Bắt buộc | Khi nào dán |
|---|---|---|
| `OWNER_TELEGRAM_ID` | Có | Phần 5 |
| `RAY_BOT_TOKEN` | Có | Phần 5 |
| `RAY_WEBHOOK_SECRET` | Có | Phần 5 (tự tạo) |
| `SUPABASE_URL` | Có | Phần 5 |
| `SUPABASE_SECRET_KEY` | Có | Phần 5 |
| `GEMINI_API_KEY` | Có | Phần 5 |
| `DATA_ENCRYPTION_KEY` | Có | Phần 5 (tự tạo) |
| `TICK_SECRET` | Có | Phần 7 (tự tạo) |
| `LUI_BOT_TOKEN` | Không — để trống tới khi làm Lũi | Sau |
| `LUI_WEBHOOK_SECRET` | Không — để trống tới khi làm Lũi | Sau (tự tạo) |

## Phụ lục B — Lỡ lộ khóa: đổi ngay (không cần hỏi Kat)
| Khóa bị lộ | Làm gì |
|---|---|
| `RAY_BOT_TOKEN` (token bot) | BotFather → `/mybots` → bot Rây → **"API Token"** → **"Revoke current token"** → BotFather đưa token mới → Vercel: dán đè vào `RAY_BOT_TOKEN` → **Redeploy** (5.5). Token cũ chết ngay; người lấy được token cũ hết điều khiển được bot. Bot vẫn ở trong group như cũ. |
| `SUPABASE_SECRET_KEY` | Supabase → **⚙️ Project Settings** → **"API Keys"** → **"Secret keys"** → tạo khóa mới (**"Add new secret key"**) → dán đè trên Vercel → **Redeploy** → quay lại Supabase **xóa khóa cũ** (dấu ⋯ → **"Delete"**). |
| `GEMINI_API_KEY` | https://aistudio.google.com/apikey → **xóa** khóa cũ (biểu tượng thùng rác 🗑) → **"Create API key"** → dán đè trên Vercel → **Redeploy**. |
| `RAY_WEBHOOK_SECRET` / `LUI_WEBHOOK_SECRET` | Tạo mã mới (5.4) → dán đè trên Vercel → **Redeploy** (bot tự báo Telegram mã mới). |
| `DATA_ENCRYPTION_KEY` | Tạo mã mới (5.4) → dán đè → **Redeploy**. Tin nhắn tạm cũ (mã hóa bằng khóa cũ) sẽ không đọc được nữa — không sao, kho đó vẫn xóa mỗi ngày lúc 01:00. |
| `TICK_SECRET` | Tạo mã mới → dán **cả 2 nơi** (Vercel + Supabase Vault, cách ở phần 7) → **Redeploy**. |

## Phụ lục C — Gặp chuyện lạ
| Thấy gì | Làm gì |
|---|---|
| Trang nào đòi thẻ ngân hàng / nâng gói | Dừng, đóng trang, hỏi Kat |
| Supabase ghi **"Paused"** | Bấm **"Restore project"**, chờ 2 phút |
| Bot nhắn riêng Khang tin bắt đầu bằng mã `E-CFG-001` | Một biến môi trường bị thiếu / sai dạng — tin ghi **tên biến**; xem lại bảng 5.3, dán lại, **Redeploy** |
| Không chắc mình đang ở đúng trang | Chụp màn hình gửi Kat — **che hết khóa / token** trước khi chụp |
