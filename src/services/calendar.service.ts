// BR-41 / BR-42: lịch lễ Singapore dùng chung cho webhook (/ngayle) và tick (nhắc lễ, timesheet).
// Năm nay + năm sau: database → bảng có sẵn → không có; đã cộng ngày nghỉ bù.
import type { YearHolidays } from '../adapters/holidays.adapter.ts';
import type { Store } from '../repositories/store.repository.ts';
import { addDays, resolveYearHolidays, withObservedDays, type HolidaySource } from './holiday.service.ts';
import { describeHolidayVi } from './cheer.service.ts';

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

const WEEKDAYS_VI = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
const HOLIDAY_FACT_MAX_LINES = 4;

/** Hết tháng SAU của ngày `todayKey` (vd 25/11 → 31/12). */
export function endOfNextMonth(todayKey: string): string {
  const [y = 0, m = 0] = todayKey.split('-').map(Number);
  const d = new Date(Date.UTC(y, m + 1, 0));
  return d.toISOString().slice(0, 10);
}

/**
 * BR-42 (Khang 25/11/2026: hỏi "tháng sau có ngày lễ nào không" thì phải biết trả lời): dòng bối cảnh lịch lễ
 * từ hôm nay tới hết tháng sau (đã gồm nghỉ bù) — AI chỉ đọc lại, không tự đoán ngày lễ.
 */
export function buildHolidayFacts(cal: HolidayCalendar, todayKey: string): { facts: string[]; plain: string } {
  const end = endOfNextMonth(todayKey);
  const items = Object.keys(cal.dates).filter((d) => d >= todayKey && d <= end).sort()
    .map((d) => `${d.slice(8, 10)}/${d.slice(5, 7)} (${WEEKDAYS_VI[new Date(`${d}T00:00:00Z`).getUTCDay()]}): ${describeHolidayVi(cal.dates[d] ?? '')}`);
  const range = `từ hôm nay tới hết ${end.slice(8, 10)}/${end.slice(5, 7)}/${end.slice(0, 4)}`;
  if (items.length === 0) return { facts: [`LỊCH NGHỈ LỄ SINGAPORE ${range}: KHÔNG có ngày lễ nào.`], plain: `Dạ ${range} không có ngày nghỉ lễ Singapore nào hết.` };
  const shown = items.slice(0, HOLIDAY_FACT_MAX_LINES);
  return {
    facts: [`LỊCH NGHỈ LỄ SINGAPORE ${range} (đã gồm nghỉ bù; chỉ dùng đúng lịch này):`, ...shown.map((x) => `- ${x}`)],
    plain: `Dạ lịch nghỉ lễ Singapore ${range}:\n${items.map((x) => `- ${x}`).join('\n')}`,
  };
}
