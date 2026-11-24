// ATR-1 / ATR-3: so mã bí mật (webhook, tick) theo THỜI GIAN CỐ ĐỊNH — không để lộ "đúng được mấy ký tự đầu".
// Băm cả 2 bên về cùng độ dài 32 byte trước khi so → không lộ cả độ dài mã thật.
import { createHash, timingSafeEqual } from 'node:crypto';

const digest = (value: string) => createHash('sha256').update(value, 'utf8').digest();

export function isSameSecret(given: string | null | undefined, expected: string): boolean {
  if (!given || expected.length === 0) return false;
  return timingSafeEqual(digest(given), digest(expected));
}

/** ATR-3: đọc mã từ header `Authorization: Bearer <mã>`; sai dạng → null. */
export function readBearerToken(header: string | null | undefined): string | null {
  const match = /^Bearer\s+(\S+)$/.exec((header ?? '').trim());
  return match?.[1] ?? null;
}
