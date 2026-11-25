// Câu soạn sẵn của bot (CODING_STANDARDS 6.8) — dùng khi AI lỗi / lời AI không đạt (đường lui, mục 6.10a).
// Mọi câu về giá có nguồn + giờ (BR-29) — phần đó do code điền.

const vnd = (n: number) => n.toLocaleString('vi-VN');

export const BOT_TEXT = {
  rateLine: (rateVnd: number, sourceText: string) => `1 SGD = ${vnd(rateVnd)} đ (${sourceText}).`,
  rateReport: (rateVnd: number, sourceText: string, daysUntilPayday: number) =>
    `Dạ tỉ giá nè: 1 SGD = ${vnd(rateVnd)} đ (${sourceText}).${daysUntilPayday <= 7 ? ` Còn ${daysUntilPayday} ngày nữa là tới ngày lương.` : ''}`,
  rateAlert: (rateVnd: number, levelVnd: number, up: boolean, sourceText: string) =>
    `Dạ báo nhanh: tỉ giá vừa ${up ? 'lên qua' : 'xuống dưới'} mốc ${vnd(levelVnd)} — giờ 1 SGD = ${vnd(rateVnd)} đ (${sourceText}).`,
  noRate: 'Dạ em chưa có giá nào trong kho, đợi lần lấy giá kế tiếp nha.',
  askSource: 'Dạ lấy giá nguồn nào nè: Wise, VCB hay VPBank? Nói "tùy" thì em lấy Wise, nói "tất cả" thì em lấy hết.',
  sourceDisabled: (enabled: string) => `Dạ nguồn đó đang tắt. Nguồn đang bật: ${enabled}.`,
  liveTooSoon: 'Dạ nguồn này em mới lấy chưa tới 5 phút, em gửi giá vừa lấy nha.',
  aiFallbackChat: 'Dạ em đang hơi lag, lát hỏi lại em nha.',
  holidayReminder: (lines: string) => `Dạ nhắc lịch nghỉ lễ Singapore nè:\n${lines}`,
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
