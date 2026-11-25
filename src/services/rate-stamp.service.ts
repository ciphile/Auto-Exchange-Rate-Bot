// BR-54 (Khang 25/11/2026): mọi câu nói về tỉ giá HIỆN TẠI — dù ngắn hay nói cụt — phải có GIỜ + NGÀY lấy giá.
// Code kiểm 100% (không chỉ dặn AI): thiếu → tự thêm; AI nói GIỜ / NGÀY khác giờ lấy thật → bỏ lời AI, dùng câu soạn sẵn.
import { getVnParts } from '../shared/vn-time.ts';
import { extractBigNumbers } from './number-guard.service.ts';

export type RateStamp = { time: string; date: string }; // "06:00", "25/11"
export const RATE_LIKE_MIN = 15_000;
export const RATE_LIKE_MAX = 30_000;

const pad = (n: number | string) => String(n).padStart(2, '0');

export function makeRateStamp(atMs: number): RateStamp {
  const p = getVnParts(new Date(atMs));
  return { time: `${pad(p.hour)}:${pad(p.minute)}`, date: `${pad(p.day)}/${pad(p.month)}` };
}

/** Lời có nhắc 1 con số giống tỉ giá (15.000–30.000) → là câu nói về tỉ giá. */
export const mentionsRate = (text: string) => extractBigNumbers(text).some((n) => n >= RATE_LIKE_MIN && n <= RATE_LIKE_MAX);

/**
 * Trả { ok: false } khi lời AI nêu giờ / ngày KHÁC giờ lấy giá thật (không được sửa im lặng — số liệu sai).
 * Không nêu → thêm " (lúc 06:00 ngày 25/11)". Không phải câu nói về tỉ giá → giữ nguyên.
 */
export function enforceRateStamp(text: string, stamp: RateStamp | null): { ok: boolean; text: string } {
  if (!stamp || !mentionsRate(text)) return { ok: true, text };
  const times = (text.match(/(?<!\d)\d{1,2}:\d{2}(?!\d)/g) ?? []).map((t) => t.split(':').map(pad).join(':'));
  const dates = (text.match(/(?<!\d)\d{1,2}\/\d{1,2}(?:\/\d{2,4})?(?!\d)/g) ?? []).map((d) => d.split('/').slice(0, 2).map(pad).join('/'));
  if (times.some((t) => t !== stamp.time) || dates.some((d) => d !== stamp.date)) return { ok: false, text };
  const needTime = times.length === 0;
  const needDate = dates.length === 0;
  if (!needTime && !needDate) return { ok: true, text };
  const add = needTime && needDate ? `lúc ${stamp.time} ngày ${stamp.date}` : needTime ? `lúc ${stamp.time}` : `ngày ${stamp.date}`;
  return { ok: true, text: `${text.trimEnd()} (${add})` };
}
