// BR-41 / BR-42: lịch lễ Singapore dùng chung cho webhook (/ngayle) và tick (nhắc lễ, timesheet).
// Năm nay + năm sau: database → bảng có sẵn → không có; đã cộng ngày nghỉ bù.
import type { YearHolidays } from '../adapters/holidays.adapter.ts';
import type { Store } from '../repositories/store.repository.ts';
import { addDays, resolveYearHolidays, withObservedDays, type HolidaySource } from './holiday.service.ts';

export type HolidayCalendar = { dates: YearHolidays; sources: Record<number, HolidaySource> };

export async function loadHolidayCalendar(store: Store, todayKey: string): Promise<HolidayCalendar> {
  const year = Number(todayKey.slice(0, 4));
  const out: HolidayCalendar = { dates: {}, sources: {} };
  for (const y of [year, year + 1]) {
    const r = resolveYearHolidays(y, await store.getHolidays(y));
    out.sources[y] = r.source;
    Object.assign(out.dates, withObservedDays(r.dates));
  }
  return out;
}

/** Các ngày lễ từ hôm nay tới `days` ngày sau, tăng dần. */
export function listUpcoming(cal: HolidayCalendar, todayKey: string, days: number): { date: string; name: string }[] {
  const end = addDays(todayKey, days);
  return Object.keys(cal.dates).filter((d) => d >= todayKey && d <= end).sort().map((date) => ({ date, name: cal.dates[date] ?? '' }));
}

/** Lễ gần nhất trong `days` ngày tới (cho bối cảnh prompt). */
export function findNextHoliday(cal: HolidayCalendar, todayKey: string, days = 30): { date: string; name: string; daysAway: number } | null {
  const next = listUpcoming(cal, todayKey, days)[0];
  if (!next) return null;
  const daysAway = Math.round((Date.parse(`${next.date}T00:00:00Z`) - Date.parse(`${todayKey}T00:00:00Z`)) / 86_400_000);
  return { ...next, daysAway };
}
