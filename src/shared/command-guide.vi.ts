// HƯỚNG DẪN LỆNH — NGUỒN DUY NHẤT (Khang 25/11/2026): /caclenh (Khang, chat riêng) và /help (mọi người, trong nhóm) đọc từ đây;
// docs/danh-sach-lenh.md phải khớp. BARIE (tests/command-guide.test.ts): lệnh nào code xử lý mà thiếu ở đây, hoặc có ở đây
// mà thiếu trong docs/danh-sach-lenh.md → test đỏ. THÊM / ĐỔI LỆNH = SỬA FILE NÀY + docs/danh-sach-lenh.md CÙNG COMMIT.
import type { BotKey } from '../domain/telegram.ts';

export type GuideScope = 'owner' | 'group';
export type CommandGuide = {
  cmd: string; // tên lệnh (không dấu "/"), vd 'tygia'
  syntax: string; // cách gõ, vd '/tygia'
  scope: GuideScope; // owner = chỉ Khang, gõ trong CHAT RIÊNG với bot · group = mọi người, gõ trong NHÓM
  bots: readonly BotKey[];
  what: string; // lệnh làm gì
  when: string; // tình huống dùng
  result: string; // kết quả mong đợi
};

const RAY: readonly BotKey[] = ['ray'];
const BOTH: readonly BotKey[] = ['ray', 'lui'];

export const COMMAND_GUIDE: readonly CommandGuide[] = [
  // ——— Mọi người trong nhóm ———
  { cmd: 'help', syntax: '/help', scope: 'group', bots: BOTH, what: 'xem hướng dẫn dùng bot', when: 'mới vào nhóm, quên cách dùng', result: 'bot gửi bản hướng dẫn này vào nhóm' },
  { cmd: 'tygia', syntax: '/tygia (hoặc /gia)', scope: 'group', bots: RAY, what: 'hỏi tỉ giá SGD → VND đang có', when: 'muốn biết giá để đổi tiền', result: 'Rây trả lời giá Wise (kèm nguồn + giờ lấy) và chợ đen ước tính' },
  { cmd: 'chodencontact', syntax: '/chodencontact', scope: 'group', bots: RAY, what: 'xem nơi đổi chợ đen uy tín nhóm giới thiệu', when: 'sắp đổi lương ra tiền mặt VND', result: 'danh sách tên + số điện thoại + giá chợ đen ước tính bữa nay' },
  { cmd: 'ngayle', syntax: '/ngayle', scope: 'group', bots: RAY, what: 'xem ngày nghỉ lễ Singapore sắp tới', when: 'tính chuyện nghỉ, về quê, đi chơi', result: 'danh sách ngày lễ 120 ngày tới (đã gồm nghỉ bù)' },
  // ——— Chỉ Khang, chat riêng ———
  { cmd: 'caclenh', syntax: '/caclenh', scope: 'owner', bots: BOTH, what: 'hướng dẫn ĐẦY ĐỦ mọi lệnh', when: 'quên lệnh, muốn xem cách dùng + kết quả', result: 'bot gửi hướng dẫn chi tiết (có thể chia vài tin)' },
  { cmd: 'lenh', syntax: '/lenh (hoặc /start)', scope: 'owner', bots: BOTH, what: 'danh sách lệnh NGẮN', when: 'cần tra nhanh cú pháp', result: 'mỗi lệnh 1 dòng' },
  { cmd: 'caidat', syntax: '/caidat', scope: 'owner', bots: BOTH, what: 'xem toàn bộ cài đặt hiện tại', when: 'trước khi đổi gì đó, hoặc thấy bot cư xử lạ', result: 'danh sách cài đặt: mốc, lắng nghe, tính cách, tâm trạng, tần suất…' },
  { cmd: 'trangthai', syntax: '/trangthai', scope: 'owner', bots: BOTH, what: 'xem bot có khỏe không', when: 'nghi bot không chạy, sau khi cài đặt xong', result: 'nhóm đã gắn chưa, lần chạy lịch gần nhất, AI đang dùng model nào, giá mới nhất, lễ sắp tới' },
  { cmd: 'tygia', syntax: '/tygia', scope: 'owner', bots: RAY, what: 'xem giá trong kho, KHÔNG qua AI', when: 'kiểm nhanh số liệu', result: 'giá Wise / dự phòng / VCB / VPBank kèm giờ lấy' },
  { cmd: 'tomtat', syntax: '/tomtat', scope: 'owner', bots: BOTH, what: 'tóm tắt chat trong nhóm hôm nay', when: 'cuối ngày, bận không đọc kịp nhóm', result: 'bản tóm tắt gửi RIÊNG Khang (cần bật /langnghe on thì bot mới lưu tin)' },
  { cmd: 'noi', syntax: '/noi <nội dung>', scope: 'owner', bots: BOTH, what: 'nhắn thay: bot nói nguyên văn vào nhóm', when: 'muốn nói gì đó mà để bot nói (không lộ là Khang)', result: 'thẻ ✅ / ❌ → bấm ✅ thì bot gửi đúng nguyên văn vào nhóm, không thêm chữ' },
  { cmd: 'thuhoi', syntax: '/thuhoi', scope: 'owner', bots: BOTH, what: 'xóa tin vừa nhắn thay', when: 'lỡ tay, gửi nhầm (trong 48 giờ)', result: 'tin /noi gần nhất bị xóa khỏi nhóm' },
  { cmd: 'gioithieu', syntax: '/gioithieu', scope: 'owner', bots: BOTH, what: 'bot tự giới thiệu ngắn trong nhóm', when: 'mới đưa bot vào nhóm', result: 'thẻ ✅ → bot giới thiệu tên + việc chính (≈ 4 câu)' },
  { cmd: 'ngayle', syntax: '/ngayle · /ngayle them 2027-01-01 Tên lễ · /ngayle xoa 2027-01-01', scope: 'owner', bots: RAY, what: 'xem / thêm / xóa ngày lễ Singapore', when: 'thiếu lịch năm sau (trang MOM không vào được)', result: 'xem: danh sách lễ · thêm / xóa: thẻ ✅ rồi mới lưu' },
  { cmd: 'chodencontact', syntax: '/chodencontact · /chodencontact them Tên | số điện thoại | ghi chú · /chodencontact xoa 1', scope: 'owner', bots: RAY, what: 'xem / thêm / xóa nơi đổi chợ đen bot được giới thiệu', when: 'có chỗ đổi mới uy tín, hoặc chỗ cũ không còn tốt', result: 'thẻ ✅ rồi mới lưu; bot CHỈ giới thiệu đúng danh sách này (tối đa 10 nơi)' },
  { cmd: 'gannhom', syntax: '/gannhom (gõ TRONG NHÓM)', scope: 'owner', bots: BOTH, what: 'gắn nhóm làm nhóm của bot', when: 'lần đầu đưa bot vào nhóm', result: 'thẻ ✅ gửi vào chat riêng của Khang → bấm ✅ là gắn xong' },
  { cmd: 'moc', syntax: '/moc 19800 19900 20000', scope: 'owner', bots: RAY, what: 'đặt mốc cảnh báo tỉ giá', when: 'muốn được báo khi giá qua mốc khác', result: 'thẻ ✅ ghi mốc cũ → mới' },
  { cmd: 'langnghe', syntax: '/langnghe on | off', scope: 'owner', bots: BOTH, what: 'bật / tắt bot đọc tin trong nhóm', when: 'muốn gọi "Rây ơi" là trả lời, muốn bot tự chen chuyện, muốn /tomtat', result: 'thẻ ✅ · bật: bot đọc + lưu tin (mã hóa, xóa 01:00) · tắt: chỉ trả lời khi reply / @tên bot' },
  { cmd: 'hongchuyen', syntax: '/hongchuyen 1..10', scope: 'owner', bots: BOTH, what: 'mức bot tự chen vào chuyện nhóm', when: 'bot nói nhiều quá / ít quá', result: 'thẻ ✅ · 1 = gần như không chen, 10 = chen nhiều' },
  { cmd: 'xungho', syntax: '/xungho tui - mấy ông', scope: 'owner', bots: BOTH, what: 'cách bot xưng - gọi mọi người', when: 'khi bật tính cách, muốn đổi kiểu xưng hô', result: 'thẻ ✅ (tắt tính cách thì luôn "em – anh chị")' },
  { cmd: 'tinhcach', syntax: '/tinhcach on | off', scope: 'owner', bots: BOTH, what: 'bật tính cách riêng / tắt = ngoan', when: 'muốn bot lém lỉnh hơn, hoặc quay về ngoan', result: 'thẻ ✅ · bật: xỏ lá, lý sự, hay chọt · tắt: ngoan, "Dạ" thưa' },
  { cmd: 'tamtrang', syntax: '/tamtrang <mã>', scope: 'owner', bots: BOTH, what: 'đổi tâm trạng (cách nói)', when: 'muốn bot vui, nghiêm túc, cộc cằn…', result: 'thẻ ✅ · gõ /tamtrang không kèm mã để xem 14 tâm trạng' },
  { cmd: 'tansuat', syntax: '/tansuat 1..5', scope: 'owner', bots: RAY, what: 'mức báo giá + cảnh báo thưa / dày', when: 'thấy bot báo giá nhiều quá / ít quá', result: 'thẻ ✅ · 1 rất thưa … 5 dày; đổi giữa tháng thì lập lại lịch từ hôm nay' },
  { cmd: 'canhbaocathang', syntax: '/canhbaocathang on | off', scope: 'owner', bots: RAY, what: 'cảnh báo cả tháng hay chỉ 14 ngày cuối', when: 'muốn theo dõi giá cả tháng', result: 'thẻ ✅' },
  { cmd: 'noituc', syntax: '/noituc 0..3', scope: 'owner', bots: BOTH, what: 'mức nói tục (chỉ khi bật tính cách)', when: 'muốn bot "đời" hơn hoặc sạch hơn', result: 'thẻ ✅ · 0 cấm … 3 thoáng; từ cấm tuyệt đối không bao giờ' },
  { cmd: 'gionghi', syntax: '/gionghi 20-6', scope: 'owner', bots: BOTH, what: 'giờ bot không tự nhắn (giờ VN)', when: 'đổi giờ yên lặng', result: 'thẻ ✅ · trong giờ nghỉ bot không tự báo, cảnh báo chờ tới sáng' },
  { cmd: 'nguon', syntax: '/nguon wise,vcb,vpbank,dbs', scope: 'owner', bots: RAY, what: 'chọn nguồn tỉ giá được dùng', when: 'một nguồn hay lỗi, muốn tắt bớt', result: 'thẻ ✅ (Wise luôn được lấy để so mốc)' },
  { cmd: 'phongcach', syntax: '/phongcach <mô tả> · /phongcach xoa', scope: 'owner', bots: BOTH, what: 'dặn thêm phong cách nói', when: 'muốn bot hay ví von, nói ngắn hơn…', result: 'thẻ ✅ · tối đa 200 ký tự' },
  { cmd: 'nhactimesheet', syntax: '/nhactimesheet on | off', scope: 'owner', bots: RAY, what: 'bật / tắt nhắc điền timesheet thứ Sáu', when: 'không muốn bot nhắc nữa (hoặc muốn nhắc lại)', result: 'thẻ ✅' },
];

/** Cách gọi bot trong nhóm (không phải lệnh) — hiện trong /help. */
export const GROUP_TALK_TIPS: Record<BotKey, readonly string[]> = {
  ray: [
    'Reply vào tin của Rây, hoặc gõ @tên bot kèm câu hỏi → Rây trả lời.',
    'Khi Rây đang bật lắng nghe: chỉ cần gọi "Rây ơi …" là Rây trả lời.',
  ],
  lui: ['Reply vào tin của Lũi, hoặc gõ @tên bot kèm câu hỏi → Lũi trả lời.'],
};

/**
 * Câu mẫu NÓI TỰ NHIÊN (Khang 25/11/2026: "để mọi người biết xài ngôn ngữ tự nhiên thay vì xài /tygia").
 * Mỗi câu phải khớp luật code thật (barie tests/command-guide.test.ts chạy thử từng câu).
 */
export const GROUP_EXAMPLES: Record<BotKey, readonly { say: string; result: string }[]> = {
  ray: [
    { say: 'Rây ơi giá hôm nay nhiêu?', result: 'giá Wise mới nhất trong kho + nguồn + giờ, kèm chợ đen ước tính' },
    { say: 'Rây ơi lấy giá ngay Wise đi', result: 'Rây đi lấy giá Wise LIỀN rồi báo (mỗi nguồn tối đa 1 lần / 5 phút)' },
    { say: 'Rây ơi check giá VCB với VPBank coi', result: 'lấy liền giá 2 ngân hàng (mua chuyển khoản / bán)' },
    { say: 'Rây ơi lấy giá ngay, tùy mày', result: '"tùy" = lấy Wise; nói "tất cả" = lấy mọi nguồn' },
    { say: 'Rây ơi lấy giá mới nhất đi', result: 'chưa nói nguồn → Rây hỏi lại "nguồn nào?", trả lời "Wise" / "VCB" / "tùy"…' },
    { say: 'Rây ơi tỉ giá tuần này lên hay xuống?', result: 'xu hướng 24 giờ / 7 ngày, cao / thấp nhất 7 ngày' },
    { say: 'Rây ơi còn mấy ngày nữa có lương?', result: 'số ngày tới ngày lương (ngày cuối tháng)' },
    { say: 'Rây ơi tháng sau có ngày lễ nào không?', result: 'lịch nghỉ lễ Singapore từ hôm nay tới hết tháng sau' },
    { say: 'Rây ơi khi nào được nghỉ lễ?', result: 'như trên' },
    { say: 'Rây ơi nên đổi chợ đen ở đâu uy tín?', result: 'các nơi đổi nhóm giới thiệu (tên + số điện thoại), kèm giá chợ đen ước tính' },
  ],
  lui: [],
};
