// BR-41 → BR-43: ngày lễ Singapore (trang MOM) + nhắc lễ + nhắc timesheet. Theo tài liệu của Khang
// "Cách bot lấy, lưu và dùng ngày lễ (MOM Singapore)" (25/11/2026), đổi "file trên máy" → bảng database.

export const MOM_HOLIDAYS_URL = 'https://www.mom.gov.sg/employment-practices/public-holidays';
export const HOLIDAY_FETCH_TIMEOUT_MS = 20_000;
export const HOLIDAY_PAGE_MAX_BYTES = 5 * 1024 * 1024; // tối đa 5 MB
/** Đọc ra ít hơn số này cho 1 năm = đọc sai trang → bỏ cả năm (Singapore luôn có khoảng 11 ngày). */
export const HOLIDAY_MIN_DAYS_PER_YEAR = 5;
/** Từ ngày này (tháng 12) bắt đầu thử tải lịch năm sau; từ ngày cảnh báo mà chưa có → nhắn Khang 1 lần. */
export const NEXT_YEAR_FETCH_FROM = { month: 12, day: 1 } as const;
export const NEXT_YEAR_WARN_FROM = { month: 12, day: 15 } as const;
/** Dọn dẹp: xóa lịch lễ cũ hơn 2 năm (năm nay và năm sau luôn giữ). */
export const HOLIDAY_KEEP_YEARS = 2;

/** Bảng có sẵn trong code — dùng khi chưa tải được (KHÔNG ghi database, để vẫn đi lấy bản MOM). Chỉ ghi năm đã chắc chắn. */
export const BUILTIN_HOLIDAYS: Record<number, Record<string, string>> = {
  2026: {
    '2026-01-01': "New Year's Day", '2026-02-17': 'Chinese New Year', '2026-02-18': 'Chinese New Year',
    '2026-03-21': 'Hari Raya Puasa', '2026-04-03': 'Good Friday', '2026-05-01': 'Labour Day', '2026-05-27': 'Hari Raya Haji',
    '2026-05-31': 'Vesak Day', '2026-08-09': 'National Day', '2026-11-08': 'Deepavali', '2026-12-25': 'Christmas Day',
  },
};

/** BR-42: nhắc lễ — tuần trước: 1 ngày trong thứ Tư…thứ Sáu tuần trước · tháng trước: 1 ngày trong 3–5 ngày cuối tháng trước. */
export const WEEK_AHEAD_WEEKDAYS: readonly number[] = [3, 4, 5]; // 0 = Chủ nhật … 6 = thứ Bảy
export const MONTH_AHEAD_DAYS_BEFORE: readonly [number, number] = [3, 5];
/** Giờ nhắc (phút trong ngày, giờ VN): ngày lễ nhắc buổi sáng; nhắc trước nhắc giờ hành chính. */
export const HOLIDAY_DAY_OF_MINUTES: readonly [number, number] = [7 * 60 + 30, 9 * 60 + 30];
export const HOLIDAY_AHEAD_MINUTES: readonly [number, number] = [9 * 60, 17 * 60];

/** BR-43: timesheet — thứ Sáu (lễ thì ngày làm việc liền trước); "thỉnh thoảng" = 60% số tuần; 14:00–17:00. */
export const TIMESHEET_WEEKDAY = 5;
export const TIMESHEET_REMIND_PROBABILITY = 0.6;
export const TIMESHEET_MINUTES: readonly [number, number] = [14 * 60, 17 * 60];
export const DEFAULT_TIMESHEET_REMINDER_ON = true;
