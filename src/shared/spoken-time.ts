// Khang 25/11/2026: Rây / Lũi nói giờ + ngày kiểu NGƯỜI, không kiểu máy:
//   giờ:  "10:00" → "mười giờ sáng" · "14:50" → "hai giờ chiều năm mươi phút" · "14:05" → "hai giờ chiều lẻ năm phút" · "10:30" → "mười giờ rưỡi sáng"
//   ngày: "25/11/2026" → "hôm nay" / "hôm qua" / "ngày 25" (khác tháng thì "ngày 25 tháng 10")
import { getInstantFromVn, getVnDateKey, getVnParts, getDaysInMonth } from './vn-time.ts';

const ONES = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'] as const;
const HOUR_WORDS = ['mười hai', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín', 'mười', 'mười một'] as const; // chỉ số = giờ % 12
export const SPOKEN_HOUR_WORDS = 'mười hai|mười một|một|hai|ba|bốn|năm|sáu|bảy|tám|chín|mười';
export const SPOKEN_PERIODS = 'sáng|trưa|chiều|tối|đêm';

/** 1–59 → chữ ("năm", "mười lăm", "hai mươi mốt", "năm mươi"). */
function numberWord(n: number): string {
  if (n < 10) return ONES[n] ?? '';
  if (n === 10) return 'mười';
  const unit = n % 10;
  if (n < 20) return `mười ${unit === 5 ? 'lăm' : ONES[unit]}`;
  const tens = `${ONES[Math.floor(n / 10)]} mươi`;
  if (unit === 0) return tens;
  return `${tens} ${unit === 1 ? 'mốt' : unit === 5 ? 'lăm' : ONES[unit]}`;
}

function periodOf(hour: number): string {
  if (hour === 0 || hour >= 22) return 'đêm';
  if (hour <= 10) return 'sáng';
  if (hour <= 12) return 'trưa';
  if (hour <= 17) return 'chiều';
  return 'tối';
}

/** Giờ nói kiểu người (hour 0–23, minute 0–59). */
export function speakClock(hour: number, minute: number): string {
  const h = `${HOUR_WORDS[hour % 12]} giờ`;
  const period = periodOf(hour);
  if (minute === 0) return `${h} ${period}`;
  if (minute === 30) return `${HOUR_WORDS[hour % 12]} giờ rưỡi ${period}`;
  return `${h} ${period} ${minute < 10 ? `lẻ ${ONES[minute]}` : numberWord(minute)} phút`;
}

/**
 * Ngày nói kiểu người. Có `now`: cùng ngày → "hôm nay", hôm trước → "hôm qua", còn lại "ngày 25" (+ " tháng 10" nếu khác tháng).
 * Không có `now` (màn hình cài đặt của Khang): luôn "ngày 25 tháng 11".
 */
export function speakDay(target: Date, now?: Date): string {
  const p = getVnParts(target);
  if (now) {
    if (getVnDateKey(target) === getVnDateKey(now)) return 'hôm nay';
    if (getVnDateKey(target) === getVnDateKey(new Date(now.getTime() - 86_400_000))) return 'hôm qua';
    const n = getVnParts(now);
    return p.month === n.month && p.year === n.year ? `ngày ${p.day}` : `ngày ${p.day} tháng ${p.month}`;
  }
  return `ngày ${p.day} tháng ${p.month}`;
}

/** Các cách nói chấp nhận được cho CÙNG 1 ngày (để so lời AI với ngày lấy giá thật). */
export function speakDayEquivalents(target: Date, now: Date): string[] {
  const p = getVnParts(target);
  return [...new Set([speakDay(target, now), `ngày ${p.day}`, `ngày ${p.day} tháng ${p.month}`])];
}

/**
 * Đổi mọi giờ "HH:MM" và ngày "dd/mm(/yyyy)" trong lời bot sang cách nói người (idempotent).
 * Ngày không hợp lệ (vd "40/13") giữ nguyên.
 */
export function humanizeDateTimes(text: string, now: Date): string {
  const nowParts = getVnParts(now);
  const converted = text
    .replace(/(?<![\d:])([01]?\d|2[0-3]):([0-5]\d)(?![\d:])/g, (_m, h: string, mi: string) => speakClock(Number(h), Number(mi)))
    .replace(/(?<![\d/.])(\d{1,2})\/(\d{1,2})(?:\/(\d{4}|\d{2}))?(?![\d/])/g, (m, d: string, mo: string, y: string | undefined) => {
      const day = Number(d);
      const month = Number(mo);
      const year = y === undefined ? nowParts.year : y.length === 2 ? 2000 + Number(y) : Number(y);
      if (month < 1 || month > 12 || day < 1 || day > getDaysInMonth(year, month)) return m;
      const phrase = speakDay(getInstantFromVn(year, month, day, 12), now);
      return year !== nowParts.year && !phrase.includes('tháng') ? `${phrase} tháng ${month} năm ${year}` : year !== nowParts.year ? `${phrase} năm ${year}` : phrase;
    });
  // Gọn lại chỗ AI đã viết sẵn chữ "ngày" trước ngày số: "ngày 25/11" → "ngày hôm nay" → "hôm nay"; "hôm qua 24/11" → "hôm qua hôm qua" → "hôm qua".
  return converted
    .replace(/(?<!\p{L})ngày (hôm nay|hôm qua)(?!\p{L})/gu, '$1')
    .replace(/(?<!\p{L})(hôm nay|hôm qua)(?: \1)+(?!\p{L})/gu, '$1')
    .replace(/(?<!\p{L})ngày ngày(?!\p{L})/gu, 'ngày');
}
