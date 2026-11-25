// BR-41: đọc trang ngày lễ của MOM Singapore. Nơi DUY NHẤT gọi mạng tới MOM. Không thư viện ngoài.
// Luật đọc theo tài liệu của Khang (mục 4): gom tiêu đề năm + bảng theo thứ tự trang; mỗi bảng thuộc năm của tiêu đề
// ngay trước (hoặc caption của bảng); kiểm chặt — lệch năm / ngày không tồn tại / ít hơn 5 ngày → BỎ CẢ NĂM ĐÓ.
import { HOLIDAY_FETCH_TIMEOUT_MS, HOLIDAY_MIN_DAYS_PER_YEAR, HOLIDAY_PAGE_MAX_BYTES, MOM_HOLIDAYS_URL } from '../config/holidays.ts';
import { HTTP_USER_AGENT } from '../config/defaults.ts';
import { fail, ok, type Result } from '../shared/result.ts';

export type YearHolidays = Record<string, string>; // 'YYYY-MM-DD' → tên lễ
export type MomParseResult = { years: Record<number, YearHolidays>; rejected: { year: number; reason: string }[] };

const MONTHS: Record<string, number> = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };
const pad = (n: number) => String(n).padStart(2, '0');

/** Bỏ thẻ + giải mã vài ký tự HTML hay gặp + gom khoảng trắng. */
function cellText(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&#39;|&rsquo;/g, "'")
    .replace(/&quot;/g, '"').replace(/\s+/g, ' ').trim();
}

const isValidDate = (y: number, m: number, d: number) => {
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
};

/**
 * Ô ngày: "1 Jan 2026" · "17 & 18 Feb 2026" · "31 Jan & 1 Feb" · "Friday, 3 April 2026". Năm thiếu → năm của bảng.
 * Trả danh sách {y,m,d} (chưa kiểm hợp lệ) hoặc null nếu không đọc được ngày nào.
 */
export function parseDateCell(text: string, tableYear: number): { y: number; m: number; d: number }[] | null {
  const out: { y: number; m: number; d: number }[] = [];
  const re = /(\d{1,2})(?:\s*(?:&|and|,)\s*(\d{1,2}))?\s+([A-Za-z]{3,9})\.?(?:,?\s+(\d{4}))?/g;
  for (const m of text.matchAll(re)) {
    const month = MONTHS[(m[3] ?? '').slice(0, 3).toLowerCase()];
    if (!month) continue;
    const y = m[4] ? Number(m[4]) : tableYear;
    for (const d of [m[1], m[2]].filter((x): x is string => x !== undefined)) out.push({ y, m: month, d: Number(d) });
  }
  return out.length > 0 ? out : null;
}

/** Tên lễ: cắt ngày dính vào và ghi chú phía sau (*, chú thích trong ngoặc). */
function cleanName(text: string): string {
  return text.replace(/\*.*$/, '').replace(/\(.*?\)/g, '').replace(/\d{1,2}\s+[A-Za-z]{3,9}(\s+\d{4})?/g, '').replace(/\s+/g, ' ').trim() || 'Public holiday';
}

/** Đọc toàn trang → lịch lễ từng năm đã kiểm + các năm bị loại kèm lý do. */
export function parseMomHolidays(html: string): MomParseResult {
  const clean = html.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<!--[\s\S]*?-->/g, '');
  // Mốc năm theo thứ tự trang: id="Year-2026" hoặc tiêu đề ngắn có năm.
  const yearMarks: { at: number; year: number }[] = [];
  for (const m of clean.matchAll(/id=["']Year-(\d{4})["']/gi)) yearMarks.push({ at: m.index ?? 0, year: Number(m[1]) });
  for (const m of clean.matchAll(/<h[1-6][^>]*>([^<]{0,60})<\/h[1-6]>/gi)) {
    const y = /\b(20\d{2})\b/.exec(m[1] ?? '');
    if (y) yearMarks.push({ at: m.index ?? 0, year: Number(y[1]) });
  }
  yearMarks.sort((a, b) => a.at - b.at);
  const collected: Record<number, YearHolidays> = {};
  const bad = new Map<number, string>();
  for (const t of clean.matchAll(/<table[\s\S]*?<\/table>/gi)) {
    const table = t[0];
    const caption = /<caption[^>]*>([\s\S]*?)<\/caption>/i.exec(table);
    const capYear = caption ? /\b(20\d{2})\b/.exec(cellText(caption[1] ?? '')) : null;
    const year = capYear ? Number(capYear[1]) : [...yearMarks].reverse().find((y) => y.at < (t.index ?? 0))?.year;
    if (!year) continue;
    const rows = [...table.matchAll(/<tr[\s\S]*?<\/tr>/gi)].map((r) => [...r[0].matchAll(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/gi)].map((c) => cellText(c[1] ?? '')));
    const header = rows.findIndex((r) => r.some((c) => /holiday|name/i.test(c)) && r.some((c) => /date/i.test(c)));
    if (header < 0) continue;
    const nameCol = rows[header]?.findIndex((c) => /holiday|name/i.test(c)) ?? -1;
    const dateCol = rows[header]?.findIndex((c) => /date/i.test(c)) ?? -1;
    for (const row of rows.slice(header + 1)) {
      const dates = parseDateCell(row[dateCol] ?? '', year);
      if (!dates) continue;
      for (const { y, m, d } of dates) {
        if (y !== year) { bad.set(year, `ngày lệch năm (${d}/${m}/${y})`); continue; }
        if (!isValidDate(y, m, d)) { bad.set(year, `ngày không tồn tại (${d}/${m}/${y})`); continue; }
        (collected[year] ??= {})[`${y}-${pad(m)}-${pad(d)}`] = cleanName(row[nameCol] ?? '');
      }
    }
  }
  const years: Record<number, YearHolidays> = {};
  const rejected: { year: number; reason: string }[] = [];
  for (const [y, dates] of Object.entries(collected)) {
    const year = Number(y);
    const reason = bad.get(year) ?? (Object.keys(dates).length < HOLIDAY_MIN_DAYS_PER_YEAR ? `chỉ đọc được ${Object.keys(dates).length} ngày` : null);
    if (reason) rejected.push({ year, reason }); else years[year] = dates;
  }
  return { years, rejected };
}

/** Tải trang MOM (timeout 20 giây, tối đa 5 MB). Lỗi → Result lỗi (E-SRC-003), service ghi "đã thử hôm nay". */
export async function fetchMomHolidays(fetchImpl: typeof fetch = fetch): Promise<Result<MomParseResult>> {
  try {
    const res = await fetchImpl(MOM_HOLIDAYS_URL, { headers: { 'User-Agent': HTTP_USER_AGENT }, signal: AbortSignal.timeout(HOLIDAY_FETCH_TIMEOUT_MS) });
    if (!res.ok) return fail('E-SRC-003', `MOM ${res.status}`);
    const size = Number(res.headers.get('content-length') ?? 0);
    if (size > HOLIDAY_PAGE_MAX_BYTES) return fail('E-SRC-003', `MOM trang quá lớn (${size} byte)`);
    const html = await res.text();
    if (html.length > HOLIDAY_PAGE_MAX_BYTES) return fail('E-SRC-003', 'MOM trang quá lớn');
    const parsed = parseMomHolidays(html);
    return Object.keys(parsed.years).length > 0 ? ok(parsed) : fail('E-SRC-003', `MOM đọc không ra năm nào (${parsed.rejected.map((r) => `${r.year}: ${r.reason}`).join('; ') || 'không thấy bảng'})`);
  } catch (error) {
    return fail('E-SRC-003', `MOM: ${(error as Error).message}`);
  }
}
