// BR-54 (Khang 25/11/2026): mọi câu nói về tỉ giá HIỆN TẠI — dù ngắn hay nói cụt — phải có GIỜ + NGÀY lấy giá, nói kiểu NGƯỜI
// ("lúc mười giờ sáng hôm nay", "lúc hai giờ chiều năm mươi phút ngày 23"; không "10:00", không "25/11/2026").
// Code kiểm 100% (không chỉ dặn AI): thiếu → tự thêm; AI nói GIỜ / NGÀY khác giờ lấy giá thật → bỏ lời AI, dùng câu soạn sẵn.
import { humanizeDateTimes, speakClock, speakDay, speakDayEquivalents, SPOKEN_HOUR_WORDS, SPOKEN_PERIODS } from '../shared/spoken-time.ts';
import { getVnParts } from '../shared/vn-time.ts';
import { extractBigNumbers } from './number-guard.service.ts';

/** time = giờ nói bằng chữ; day = "hôm nay" / "hôm qua" / "ngày 23"; dayEquivalents = các cách nói chấp nhận cho cùng ngày. */
export type RateStamp = { time: string; day: string; dayEquivalents: string[] };
export const RATE_LIKE_MIN = 15_000;
export const RATE_LIKE_MAX = 30_000;

export function makeRateStamp(atMs: number, now: Date): RateStamp {
  const at = new Date(atMs);
  const p = getVnParts(at);
  return { time: speakClock(p.hour, p.minute), day: speakDay(at, now), dayEquivalents: speakDayEquivalents(at, now) };
}

/** Lời có nhắc 1 con số giống tỉ giá (15.000–30.000) → là câu nói về tỉ giá. */
export const mentionsRate = (text: string) => extractBigNumbers(text).some((n) => n >= RATE_LIKE_MIN && n <= RATE_LIKE_MAX);

// "mười giờ rưỡi sáng", "hai giờ chiều lẻ năm phút" (+ ngày đứng ngay sau: "hôm nay" / "hôm qua" / "ngày 23" / "ngày 23 tháng 10").
const TIME_RE = `(?<!\\p{L})(?:${SPOKEN_HOUR_WORDS}) giờ(?: rưỡi)? (?:${SPOKEN_PERIODS})(?: (?:lẻ )?(?:\\p{L}+ ){1,3}phút)?`;
const TIME_DAY_RE = new RegExp(`(${TIME_RE})(?: (hôm nay|hôm qua|ngày \\d{1,2}(?: tháng \\d{1,2})?))?`, 'gu');

/**
 * Lời AI nêu giờ / ngày KHÁC giờ lấy giá thật → { ok: false } (không được sửa im lặng — số liệu sai).
 * Có giờ mà thiếu ngày → chèn ngày ngay sau giờ; không có giờ → thêm " (lúc … …)". Giờ / ngày dạng số được đổi sang chữ trước khi kiểm.
 * Không phải câu nói về tỉ giá → giữ nguyên.
 */
export function enforceRateStamp(text: string, stamp: RateStamp | null, now: Date): { ok: boolean; text: string } {
  if (!stamp || !mentionsRate(text)) return { ok: true, text };
  const spoken = humanizeDateTimes(text, now);
  let sawTime = false;
  let bad = false;
  const out = spoken.replace(TIME_DAY_RE, (m: string, time: string, day: string | undefined) => {
    sawTime = true;
    if (time !== stamp.time) { bad = true; return m; }
    if (day === undefined) return `${time} ${stamp.day}`;
    if (!stamp.dayEquivalents.includes(day)) { bad = true; return m; }
    return m;
  });
  if (bad) return { ok: false, text };
  // "10 giờ sáng" (chữ số) mà không nhận ra là giờ nào → mơ hồ → dùng câu soạn sẵn cho chắc.
  if (!sawTime && new RegExp(`(?<!\\d)\\d{1,2} giờ(?: rưỡi)? (?:${SPOKEN_PERIODS})`, 'u').test(out)) return { ok: false, text };
  return { ok: true, text: sawTime ? out : `${out.trimEnd()} (lúc ${stamp.time} ${stamp.day})` };
}
