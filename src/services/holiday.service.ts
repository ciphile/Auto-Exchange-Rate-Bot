// BR-41: lịch ngày lễ Singapore — chọn nguồn, nghỉ bù, khi nào tải MOM, cảnh báo thiếu năm sau, dọn dẹp, lệnh /ngayle.
// Hàm thuần (tài liệu của Khang, mục 2, 3, 6, 7). Ngày dạng 'YYYY-MM-DD' theo giờ Việt Nam.
import {
  BUILTIN_HOLIDAYS, HOLIDAY_KEEP_YEARS, NEXT_YEAR_FETCH_FROM, NEXT_YEAR_WARN_FROM,
} from '../config/holidays.ts';
import type { YearHolidays } from '../adapters/holidays.adapter.ts';
import { parseCommand } from './access.service.ts';

export type HolidaySource = 'database' | 'builtin' | 'missing';
const pad = (n: number) => String(n).padStart(2, '0');
export const toDateKey = (y: number, m: number, d: number) => `${y}-${pad(m)}-${pad(d)}`;
const parseKey = (key: string) => { const [y = 0, m = 0, d = 0] = key.split('-').map(Number); return { y, m, d }; };
/** Cộng ngày trên lịch (UTC thuần, không lệch múi giờ). */
export function addDays(key: string, days: number): string {
  const { y, m, d } = parseKey(key);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return toDateKey(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
}
/** 0 = Chủ nhật … 6 = thứ Bảy. */
export const weekdayOf = (key: string) => { const { y, m, d } = parseKey(key); return new Date(Date.UTC(y, m - 1, d)).getUTCDay(); };

/** Mục 2: đọc lịch 1 năm — database (MOM / Khang thêm) → bảng có sẵn → không có (cảnh báo, không sập). */
export function resolveYearHolidays(year: number, stored: YearHolidays | null): { dates: YearHolidays; source: HolidaySource } {
  if (stored && isValidStoredYear(year, stored)) return { dates: stored, source: 'database' };
  const builtin = BUILTIN_HOLIDAYS[year];
  return builtin ? { dates: builtin, source: 'builtin' } : { dates: {}, source: 'missing' };
}

/** Mục 5: dữ liệu đã lưu sai định dạng / lệch năm / ngày không tồn tại → BỎ QUA (không xóa), đi nguồn kế. */
export function isValidStoredYear(year: number, stored: YearHolidays): boolean {
  const keys = Object.keys(stored);
  return keys.length > 0 && keys.every((k) => {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(k);
    if (!m || Number(m[1]) !== year || typeof stored[k] !== 'string') return false;
    const dt = new Date(Date.UTC(year, Number(m[2]) - 1, Number(m[3])));
    return dt.getUTCMonth() === Number(m[2]) - 1 && dt.getUTCDate() === Number(m[3]);
  });
}

/** Mục 8: tên sự kiện ghi audit_log (giống tài liệu của Khang). */
export const HOLIDAY_AUDIT_EVENTS = {
  fetched: 'HOLIDAYS_FETCHED', fetchFail: 'HOLIDAYS_FETCH_FAIL', rejected: 'HOLIDAYS_REJECTED', missing: 'HOLIDAYS_MISSING',
} as const;

/** Mục 7: lễ rơi Chủ nhật → nghỉ bù thứ Hai kế tiếp (thứ Hai cũng là lễ → thứ Ba…). Thứ Bảy: không tự nghỉ bù. */
export function withObservedDays(dates: YearHolidays): YearHolidays {
  const out: YearHolidays = { ...dates };
  for (const key of Object.keys(dates).sort()) {
    if (weekdayOf(key) !== 0) continue;
    let bu = addDays(key, 1);
    while (out[bu] !== undefined) bu = addDays(bu, 1);
    out[bu] = `Nghỉ bù ${dates[key]}`;
  }
  return out;
}

export type FetchState = { haveYears: readonly number[]; lastAttemptDate: Record<number, string>; fetchEnabled: boolean };

/** Mục 3: năm nào cần tải hôm nay — năm nay chưa có; từ 1/12 thêm năm sau; mỗi năm tối đa 1 lần thử / ngày. */
export function decideYearsToFetch(todayKey: string, state: FetchState): number[] {
  if (!state.fetchEnabled) return [];
  const { y, m, d } = parseKey(todayKey);
  const wanted = [y];
  if (m > NEXT_YEAR_FETCH_FROM.month || (m === NEXT_YEAR_FETCH_FROM.month && d >= NEXT_YEAR_FETCH_FROM.day)) wanted.push(y + 1);
  return wanted.filter((year) => !state.haveYears.includes(year) && state.lastAttemptDate[year] !== todayKey);
}

/** Mục 3: từ 15/12 vẫn chưa có lịch năm sau → nhắn Khang 1 lần (E-SRC-004). */
export function shouldWarnMissingNextYear(todayKey: string, haveNextYear: boolean, alreadyWarned: boolean): boolean {
  const { m, d } = parseKey(todayKey);
  const late = m > NEXT_YEAR_WARN_FROM.month || (m === NEXT_YEAR_WARN_FROM.month && d >= NEXT_YEAR_WARN_FROM.day);
  return late && !haveNextYear && !alreadyWarned;
}

/** Mục 6: các năm cần xóa (cũ hơn 2 năm); năm nay và năm sau luôn giữ. */
export function yearsToPurge(todayKey: string, storedYears: readonly number[]): number[] {
  const { y } = parseKey(todayKey);
  return storedYears.filter((year) => year < y - HOLIDAY_KEEP_YEARS);
}

export type HolidayCommand =
  | { kind: 'list' }
  | { kind: 'add'; date: string; name: string }
  | { kind: 'remove'; date: string }
  | { kind: 'error'; message: string };

const HOLIDAY_USAGE = 'Gõ: /ngayle (xem) · /ngayle them 2027-01-01 Tên lễ · /ngayle xoa 2027-01-01';

/** `/ngayle` (Khang, chat riêng): xem lễ sắp tới · thêm / xóa tay khi MOM không vào được. Thêm / xóa → thẻ xác nhận. */
export function parseHolidayCommand(text: string): HolidayCommand | null {
  const cmd = parseCommand(text);
  if (!cmd || cmd.name !== 'ngayle') return null;
  if (cmd.args === '') return { kind: 'list' };
  const m = /^(them|thêm|xoa|xóa)\s+(\d{4})-(\d{2})-(\d{2})(?:\s+(.{1,60}))?$/i.exec(cmd.args.trim());
  if (!m) return { kind: 'error', message: HOLIDAY_USAGE };
  const [y, mo, d] = [Number(m[2]), Number(m[3]), Number(m[4])];
  const dt = new Date(Date.UTC(y, mo - 1, d));
  if (dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) return { kind: 'error', message: `Ngày ${m[2]}-${m[3]}-${m[4]} không tồn tại. ${HOLIDAY_USAGE}` };
  const date = toDateKey(y, mo, d);
  if (/^x/i.test(plainVerb(m[1] ?? ''))) return { kind: 'remove', date };
  const name = (m[5] ?? '').replace(/"{3,}/g, "''").trim();
  return name ? { kind: 'add', date, name } : { kind: 'error', message: `Thiếu tên lễ. ${HOLIDAY_USAGE}` };
}
const plainVerb = (v: string) => v.normalize('NFD').replace(/[̀-ͯ]/g, '');
