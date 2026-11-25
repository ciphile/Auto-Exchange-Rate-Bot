// BR-42 + BR-43: Rây nhắc ngày lễ Singapore (ngày lễ · tuần trước · tháng trước) và nhắc điền timesheet thứ Sáu.
// Hàm thuần: code QUYẾT ĐỊNH hôm nay nhắc gì (luật), AI chỉ DIỄN ĐẠT lời nhắc tự nhiên (không rập khuôn).
import {
  HOLIDAY_AHEAD_MINUTES, HOLIDAY_DAY_OF_MINUTES, MONTH_AHEAD_DAYS_BEFORE, TIMESHEET_MINUTES, TIMESHEET_REMIND_PROBABILITY,
  TIMESHEET_WEEKDAY, WEEK_AHEAD_WEEKDAYS,
} from '../config/holidays.ts';
import type { YearHolidays } from '../adapters/holidays.adapter.ts';
import { addDays, toDateKey, weekdayOf } from './holiday.service.ts';

export type HolidayReminder = {
  kind: 'day_of' | 'week_ahead' | 'month_ahead';
  key: string; // khóa chống nhắc trùng: day:<ngày> · week:<thứ Hai tuần có lễ> · month:<yyyy-mm>
  holidays: { date: string; name: string }[];
  minuteRange: readonly [number, number];
};

/** Số chọn cố định theo khóa (không cần lưu kế hoạch): cùng tuần / tháng luôn ra cùng ngày nhắc. */
function stablePick<T>(key: string, options: readonly T[]): T {
  let h = 0;
  for (const ch of key) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return options[h % options.length] as T;
}

const mondayOf = (key: string) => addDays(key, -((weekdayOf(key) + 6) % 7));
const lastDayOfMonth = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate();
const inRange = (all: YearHolidays, from: string, to: string) =>
  Object.keys(all).filter((d) => d >= from && d <= to).sort().map((date) => ({ date, name: all[date] ?? '' }));

/** Ngày nhắc "tháng sau có lễ": 1 ngày cố định trong 3–5 ngày cuối tháng trước (BR-42). */
export function monthAheadDay(year: number, month: number, monthKey: string): string {
  const last = lastDayOfMonth(year, month);
  const before = stablePick(monthKey, Array.from({ length: MONTH_AHEAD_DAYS_BEFORE[1] - MONTH_AHEAD_DAYS_BEFORE[0] + 1 }, (_, i) => MONTH_AHEAD_DAYS_BEFORE[0] + i));
  return toDateKey(year, month, last - before + 1);
}

/**
 * BR-42: hôm nay cần nhắc gì. `holidays` = lịch đã gồm nghỉ bù, đủ năm nay + năm sau. `sent` = các khóa đã nhắc.
 * Lỡ ngày nhắc (bot nghỉ) → nhắc bù những ngày sau trong cùng tuần / tháng, nếu chưa nhắc. Mỗi loại tối đa 1 lần.
 * Tuần sau có lễ mà lễ đó đã được nhắc "tháng sau" trong vòng 7 ngày → không nhắc tuần nữa (khỏi lặp).
 */
export function planHolidayReminders(todayKey: string, holidays: YearHolidays, sent: ReadonlySet<string>): HolidayReminder[] {
  const out: HolidayReminder[] = [];
  const name = holidays[todayKey];
  if (name !== undefined && !sent.has(`day:${todayKey}`)) out.push({ kind: 'day_of', key: `day:${todayKey}`, holidays: [{ date: todayKey, name }], minuteRange: HOLIDAY_DAY_OF_MINUTES });

  const [y, m] = todayKey.split('-').map(Number) as [number, number];
  const nextY = m === 12 ? y + 1 : y;
  const nextM = m === 12 ? 1 : m + 1;
  const monthKey = `month:${nextY}-${String(nextM).padStart(2, '0')}`;
  const monthDay = monthAheadDay(y, m, monthKey);
  const nextMonthHolidays = inRange(holidays, toDateKey(nextY, nextM, 1), toDateKey(nextY, nextM, lastDayOfMonth(nextY, nextM)));
  if (nextMonthHolidays.length > 0 && todayKey >= monthDay && !sent.has(monthKey)) {
    out.push({ kind: 'month_ahead', key: monthKey, holidays: nextMonthHolidays, minuteRange: HOLIDAY_AHEAD_MINUTES });
  }

  const nextMonday = addDays(mondayOf(todayKey), 7);
  const weekKey = `week:${nextMonday}`;
  const nextWeek = inRange(holidays, nextMonday, addDays(nextMonday, 6));
  const weekDay = addDays(mondayOf(todayKey), stablePick(weekKey, WEEK_AHEAD_WEEKDAYS) - 1);
  const coveredByMonth = nextWeek.length > 0 && nextWeek.every((h) => h.date.slice(0, 7) === monthKey.slice(6)) && monthDay >= addDays(nextMonday, -7);
  if (nextWeek.length > 0 && todayKey >= weekDay && !sent.has(weekKey) && !coveredByMonth) {
    out.push({ kind: 'week_ahead', key: weekKey, holidays: nextWeek, minuteRange: HOLIDAY_AHEAD_MINUTES });
  }
  return out;
}

/** BR-43: ngày điền timesheet của tuần chứa `todayKey`: thứ Sáu; thứ Sáu là lễ → ngày làm việc liền trước (không lễ, không cuối tuần). */
export function getTimesheetDay(todayKey: string, holidays: YearHolidays): string {
  let day = addDays(mondayOf(todayKey), TIMESHEET_WEEKDAY - 1);
  while (holidays[day] !== undefined || weekdayOf(day) === 0 || weekdayOf(day) === 6) day = addDays(day, -1);
  return day;
}

/** BR-43: hôm nay có nhắc timesheet không ("thỉnh thoảng" = 60% số tuần) + phút nhắc; null = không nhắc. */
export function planTimesheetReminder(todayKey: string, holidays: YearHolidays, enabled: boolean, random: () => number): number | null {
  if (!enabled || getTimesheetDay(todayKey, holidays) !== todayKey) return null;
  if (random() >= TIMESHEET_REMIND_PROBABILITY) return null;
  return TIMESHEET_MINUTES[0] + Math.floor(random() * (TIMESHEET_MINUTES[1] - TIMESHEET_MINUTES[0] + 1));
}

/** Phút ngẫu nhiên trong khung của lời nhắc lễ. */
export const pickReminderMinute = (range: readonly [number, number], random: () => number) =>
  range[0] + Math.floor(random() * (range[1] - range[0] + 1));
