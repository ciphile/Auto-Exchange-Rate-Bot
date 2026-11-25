// BR-46 (Khang 25/11/2026): câu chữ giọng ĐỘNG VIÊN — nhắc lễ + báo giá thứ Tư → thứ Sáu.
// Mặc định ai cũng mệt vì cơm áo gạo tiền, mong cuối tuần chơi với con → bot nói cho mọi người có động lực.

export const WEEKDAY_NAMES_VI = ['Chủ nhật', 'thứ Hai', 'thứ Ba', 'thứ Tư', 'thứ Năm', 'thứ Sáu', 'thứ Bảy'] as const;

/** Tên lễ Singapore (tiếng Anh như trang MOM) → giải thích ngắn tiếng Việt. Không khớp → giữ tên gốc. */
export const HOLIDAY_GLOSS_VI: readonly (readonly [RegExp, string])[] = [
  [/chinese new year/i, 'Tết Nguyên đán'], // đứng TRƯỚC "new year" (tên chứa cả 2)
  [/new year/i, 'Tết Dương lịch'],
  [/good friday/i, 'lễ Thứ Sáu Tuần Thánh'],
  [/hari raya puasa/i, 'lễ Hồi giáo, mừng hết tháng chay'],
  [/hari raya haji/i, 'lễ Hồi giáo'],
  [/labour day/i, 'Quốc tế Lao động'],
  [/vesak/i, 'lễ Phật đản'],
  [/national day/i, 'Quốc khánh Singapore'],
  [/deepavali/i, 'lễ hội Ánh sáng của người Ấn'],
  [/christmas/i, 'Giáng sinh'],
];

export const CHEER_TEXT = {
  midweek: { 3: 'Hôm nay thứ Tư rồi, còn 2 ngày nữa là cuối tuần', 4: 'Hôm nay thứ Năm rồi, mai là thứ Sáu, sắp cuối tuần rồi', 5: 'Hôm nay thứ Sáu rồi, mai cuối tuần được nghỉ chơi với con' } as Record<number, string>,
  paydayToday: 'hôm nay có lương rồi',
  paydaySoon: (days: number) => `còn ${days} ngày nữa là có lương`,
  paydayNextWeek: 'tuần sau là có lương rồi',
  toneRule: 'GIỌNG ĐỘNG VIÊN: mọi người làm việc mệt vì cơm áo gạo tiền, mong tới cuối tuần để chơi với con — nói sao cho mọi người có thêm động lực, vui vẻ, không than thở.',
  reportExample: 'Ví dụ kiểu: "hôm nay thứ Tư rồi anh em, còn 2 ngày nữa là cuối tuần, tỉ giá hôm nay … theo Wise" hoặc "cố lên mọi người ơi, tuần sau là có lương rồi, tỉ giá hôm nay đã lên tới … theo Wise rồi".',
  holidayExample: 'Ví dụ kiểu: "cố lên mọi người ơi, tuần sau được nghỉ lễ thứ Sáu (lễ Hồi giáo) rồi".',
  holidayLead: { day_of: 'Hôm nay được nghỉ lễ rồi mọi người ơi, nghỉ ngơi chơi với con nha', week_ahead: 'Cố lên mọi người ơi, tuần sau được nghỉ lễ rồi', month_ahead: 'Cố lên mọi người ơi, tháng sau có ngày nghỉ lễ nè' } as Record<'day_of' | 'week_ahead' | 'month_ahead', string>,
  wiseRule: 'TỈ GIÁ CHÍNH = WISE: mọi người nhận lương qua Wise, Wise và chợ đen là mức đổi ra tiền VND thật → luôn nói giá Wise TRƯỚC (có thể kèm chợ đen ước tính); giá ngân hàng chỉ để so khi được hỏi.',
} as const;
