// Câu soạn sẵn của bot (CODING_STANDARDS 6.8) — dùng khi AI lỗi / lời AI không đạt (đường lui, mục 6.10a).
// Mọi câu về giá có nguồn + giờ (BR-29) — phần đó do code điền.

const vnd = (n: number) => n.toLocaleString('vi-VN');

export const BOT_TEXT = {
  rateLine: (rateVnd: number, sourceText: string) => `1 SGD = ${vnd(rateVnd)} đ (${sourceText}).`,
  // BR-46: có ý động viên (thứ Tư → thứ Sáu / gần lương) thì mở đầu bằng câu đó; BR-47: Wise trước, chợ đen ước tính kèm theo.
  rateReport: (rateVnd: number, sourceText: string, cheer: string | null, blackMarketVnd: number) =>
    `${cheer ? `Cố lên mọi người ơi, ${cheer.charAt(0).toLowerCase()}${cheer.slice(1)} ` : 'Dạ '}Tỉ giá hôm nay: 1 SGD = ${vnd(rateVnd)} đ (${sourceText}), chợ đen ước tính khoảng ${vnd(blackMarketVnd)} đ.`,
  rateAlert: (rateVnd: number, levelVnd: number, up: boolean, sourceText: string) =>
    `Dạ báo nhanh: tỉ giá vừa ${up ? 'lên qua' : 'xuống dưới'} mốc ${vnd(levelVnd)} — giờ 1 SGD = ${vnd(rateVnd)} đ (${sourceText}).`,
  noRate: 'Dạ em chưa có giá nào trong kho, đợi lần lấy giá kế tiếp nha.',
  askSource: 'Dạ lấy giá nguồn nào nè: Wise, VCB hay VPBank? Nói "tùy" thì em lấy Wise, nói "tất cả" thì em lấy hết.',
  sourceDisabled: (enabled: string) => `Dạ nguồn đó đang tắt. Nguồn đang bật: ${enabled}.`,
  liveTooSoon: 'Dạ nguồn này em mới lấy chưa tới 5 phút, em gửi giá vừa lấy nha.',
  aiFallbackChat: 'Dạ em đang hơi lag, lát hỏi lại em nha.',
  holidayReminder: (lead: string, lines: string) => `${lead}:\n${lines}`,
  timesheetReminder: 'Dạ nay thứ Sáu rồi, mọi người nhớ điền timesheet nha.',
  confirmAsk: 'Bấm ✅ để làm, ❌ để thôi (thẻ hết hạn sau 10 phút).',
  confirmDone: 'Đã làm xong.',
  confirmCancel: 'Đã hủy, không đổi gì.',
  confirmExpired: 'Thẻ này đã hết hạn hoặc đã dùng rồi. Gõ lại lệnh nha.',
  bindAsk: (title: string) => `Gắn nhóm "${title}" làm nhóm của bot?`,
  relayAsk: (text: string) => `Gửi nguyên văn tin này vào nhóm?\n\n${text}`,
  relayNoGroup: 'Chưa gắn nhóm. Vào nhóm gõ /gannhom trước nha.',
  recallNone: 'Không có tin nào vừa nhắn thay (hoặc đã quá 48 giờ).',
  recallDone: 'Đã thu hồi tin vừa nhắn.',
  joinedGroup: (title: string) => `Bot vừa được thêm vào nhóm "${title}". Muốn bot làm việc ở nhóm này thì vào nhóm gõ /gannhom.`,
  leftGroup: (title: string) => `Bot vừa bị xóa khỏi nhóm "${title}".`,
  holidayList: (lines: string, source: string) => `Ngày lễ Singapore sắp tới (nguồn: ${source}):\n${lines}`,
  holidayNone: 'Không có ngày lễ nào trong 120 ngày tới (hoặc chưa có lịch).',
  holidaySaved: 'Đã lưu ngày lễ.',
  errorToOwner: (code: string, message: string, fix: string, requestId: string) => `⚠️ ${code}: ${message}\nCách xử lý: ${fix}\n(mã tra: ${requestId})`,
} as const;
