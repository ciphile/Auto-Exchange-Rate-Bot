// F-02: lịch theo ngày lương. Hàm thuần, nhận `random` từ ngoài để test được.
import {
  ALERT_WINDOW_DAYS, PAYDAY_POSTS_MAX, PAYDAY_POSTS_MIN, PAYDAY_WEEK_DAYS,
  RANDOM_TALK_FROM_MINUTE, RANDOM_TALK_TO_MINUTE,
} from '../config/defaults.ts';
import { getDaysInMonth, getVnParts } from '../shared/vn-time.ts';

/** BR-01: ngày lương = ngày cuối cùng của tháng. Trả về số ngày (28–31). */
export function getPaydayOfMonth(year: number, month: number): number {
  return getDaysInMonth(year, month);
}

/** Số ngày còn lại tới ngày lương của tháng hiện tại (0 = hôm nay là ngày lương), theo giờ VN. */
export function getDaysUntilPayday(at: Date): number {
  const p = getVnParts(at);
  return getPaydayOfMonth(p.year, p.month) - p.day;
}

/** BR-02: đang trong tuần lương (7 ngày tính tới ngày lương). */
export function isInPaydayWeek(at: Date): boolean {
  return getDaysUntilPayday(at) < PAYDAY_WEEK_DAYS;
}

/** BR-03: đang trong khung cảnh báo (14 ngày tính tới ngày lương). */
export function isInAlertWindow(at: Date): boolean {
  return getDaysUntilPayday(at) < ALERT_WINDOW_DAYS;
}

/**
 * BR-10: chọn các ngày được báo trong tuần lương. Trả về danh sách "số ngày còn tới ngày lương" được báo
 * (6 = ngày đầu tuần lương … 0 = ngày lương). Luật: ngày lương luôn báo; không nghỉ 2 ngày liền; tổng 4–6 lần.
 */
export function planPaydayWeek(random: () => number): number[] {
  const target = PAYDAY_POSTS_MIN + Math.floor(random() * (PAYDAY_POSTS_MAX - PAYDAY_POSTS_MIN + 1));
  const skipCount = PAYDAY_WEEK_DAYS - target;
  // Chỉ được nghỉ các ngày 6..1 (không nghỉ ngày lương), và 2 ngày nghỉ không được kề nhau.
  for (let attempt = 0; attempt < 200; attempt++) {
    const candidates = [6, 5, 4, 3, 2, 1];
    const skips = new Set<number>();
    while (skips.size < skipCount && candidates.length > 0) {
      const pick = candidates.splice(Math.floor(random() * candidates.length), 1)[0];
      if (pick !== undefined && !skips.has(pick + 1) && !skips.has(pick - 1)) skips.add(pick);
    }
    if (skips.size === skipCount) {
      return [6, 5, 4, 3, 2, 1, 0].filter((d) => !skips.has(d));
    }
  }
  return [6, 5, 4, 3, 2, 1, 0]; // không bao giờ tới đây với 7 ngày; an toàn: báo đủ thay vì im
}

/** BR-11: bốc 1 phút ngẫu nhiên trong khung nói (06:30–19:30 giờ VN). */
export function pickRandomTalkMinute(random: () => number): number {
  const span = RANDOM_TALK_TO_MINUTE - RANDOM_TALK_FROM_MINUTE;
  return RANDOM_TALK_FROM_MINUTE + Math.floor(random() * (span + 1));
}

/** BR-03 + BR-39: cảnh báo có chạy lúc này không — bật "cả tháng" thì luôn chạy, tắt thì chỉ 14 ngày cuối. */
export function isAlertWindowOpen(at: Date, alertFullMonth: boolean): boolean {
  return alertFullMonth || isInAlertWindow(at);
}
