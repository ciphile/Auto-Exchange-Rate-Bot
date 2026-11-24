// Ngày giờ theo giờ Việt Nam (UTC+7, không đổi giờ mùa hè). Bẫy 24: KHÔNG dùng toISOString().slice(0, 10)
// để lấy ngày nghiệp vụ — sáng sớm giờ VN sẽ thành ngày hôm trước.
const VN_OFFSET_MS = 7 * 60 * 60 * 1000;

export type VnParts = { year: number; month: number; day: number; hour: number; minute: number };

export function getVnParts(at: Date): VnParts {
  const shifted = new Date(at.getTime() + VN_OFFSET_MS);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
    hour: shifted.getUTCHours(),
    minute: shifted.getUTCMinutes(),
  };
}

export function getVnDateKey(at: Date): string {
  const p = getVnParts(at);
  return `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`;
}

/** Số ngày của tháng (month: 1–12). */
export function getDaysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** Mốc thời gian (UTC) ứng với giờ:phút giờ VN của một ngày giờ VN. */
export function getInstantFromVn(year: number, month: number, day: number, hour = 0, minute = 0): Date {
  return new Date(Date.UTC(year, month - 1, day, hour, minute) - VN_OFFSET_MS);
}

/** Có đang trong giờ nghỉ [startHour, endHour) theo giờ VN không (khoảng có thể vắt qua nửa đêm). */
export function isInQuietHours(at: Date, quiet: { startHour: number; endHour: number }): boolean {
  const { hour } = getVnParts(at);
  if (quiet.startHour === quiet.endHour) return false;
  return quiet.startHour < quiet.endHour
    ? hour >= quiet.startHour && hour < quiet.endHour
    : hour >= quiet.startHour || hour < quiet.endHour;
}
