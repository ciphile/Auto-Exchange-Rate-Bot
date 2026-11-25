// BR-46 (Khang 25/11/2026): code tính "ý động viên" cho lời báo giá / nhắc lễ — AI chỉ diễn đạt, không tự đoán thứ / ngày lương.
import { CHEER_TEXT, HOLIDAY_GLOSS_VI, WEEKDAY_NAMES_VI } from '../shared/cheer.vi.ts';
import { getVnParts } from '../shared/vn-time.ts';
import { weekdayOf } from './holiday.service.ts';

/** 'YYYY-MM-DD' → "thứ Sáu". */
export const getWeekdayNameVi = (dateKey: string) => WEEKDAY_NAMES_VI[weekdayOf(dateKey)] ?? '';

/** "Hari Raya Haji" → "Hari Raya Haji (lễ Hồi giáo)"; tên lạ giữ nguyên. Gỡ dấu đóng khối (chữ từ trang ngoài). */
export function describeHolidayVi(name: string): string {
  const clean = name.replace(/"{3,}/g, "''").slice(0, 60);
  const hit = HOLIDAY_GLOSS_VI.find(([re]) => re.test(clean));
  return hit ? `${clean} (${hit[1]})` : clean;
}

/** "thứ Sáu 27/03: Hari Raya Puasa (lễ Hồi giáo, mừng hết tháng chay)". */
export const formatHolidayLineVi = (h: { date: string; name: string }) =>
  `${getWeekdayNameVi(h.date)} ${h.date.slice(8, 10)}/${h.date.slice(5, 7)}: ${describeHolidayVi(h.name)}`;

/**
 * Ý động viên cho lời báo giá: thứ Tư → thứ Sáu (giờ VN) + ngày lương gần (≤ 3 ngày, hoặc rơi vào tuần sau).
 * Thứ Hai / thứ Ba và lương còn xa → null (báo giá bình thường).
 */
export function buildWorkCheer(now: Date, daysUntilPayday: number): string | null {
  const p = getVnParts(now);
  const weekday = new Date(Date.UTC(p.year, p.month - 1, p.day)).getUTCDay();
  const daysToNextMonday = ((8 - weekday) % 7) || 7;
  const pay = daysUntilPayday === 0 ? CHEER_TEXT.paydayToday
    : daysUntilPayday <= 3 ? CHEER_TEXT.paydaySoon(daysUntilPayday)
      : daysUntilPayday >= daysToNextMonday && daysUntilPayday < daysToNextMonday + 7 ? CHEER_TEXT.paydayNextWeek : null;
  const mid = CHEER_TEXT.midweek[weekday] ?? null;
  const parts = [mid, pay].filter((x): x is string => x !== null);
  return parts.length === 0 ? null : `${parts.join(', ')}.`;
}
