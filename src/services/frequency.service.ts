// F-02 + BR-35: lịch tự báo giá cả tháng theo mức tần suất 1–5. Hàm thuần (random truyền vào).
// Kết quả lưu database đầu tháng (và lập lại phần còn lại khi Khang đổi /tansuat); mỗi ngày được báo
// bốc 1 giờ ngẫu nhiên (BR-11). Ngày lương LUÔN báo ở mọi mức (BR-10).
import { ALERT_WINDOW_DAYS, PAYDAY_WEEK_DAYS } from '../config/defaults.ts';
import { FREQUENCY_LEVELS, FREQUENCY_PROFILES, type EarlyPlan, type FrequencyLevel } from '../config/frequency.ts';
import { getPaydayOfMonth, planPaydayWeek } from './payday.service.ts';

const MAX_ATTEMPTS = 50;
const randInt = (min: number, max: number, random: () => number) => min + Math.floor(random() * (max - min + 1));

/** `/tansuat <số>`: chỉ nhận 1–5. */
export function parseFrequencyLevel(input: string): FrequencyLevel | null {
  const n = Number(input.trim());
  return (FREQUENCY_LEVELS as readonly number[]).includes(n) ? (n as FrequencyLevel) : null;
}

/** 14 ngày cuối (d = 0…13): tuần lương theo kiểu của mức, rồi nối chuỗi cách ngày lùi ra tới d = 13. */
function planWindow(level: FrequencyLevel, random: () => number): number[] {
  const { paydayWeek, gapDays } = FREQUENCY_PROFILES[level].window;
  const picks: number[] =
    paydayWeek === 'payday_week' ? planPaydayWeek(random)
      : paydayWeek === 'daily' ? Array.from({ length: PAYDAY_WEEK_DAYS }, (_, d) => d)
        : [0]; // 'gap': chuỗi bắt đầu từ ngày lương (luôn báo)
  let d = Math.max(...picks);
  for (;;) {
    d += randInt(gapDays[0], gapDays[1], random);
    if (d >= ALERT_WINDOW_DAYS) break;
    picks.push(d);
  }
  return picks;
}

/** Đầu tháng (d từ `minD` tới `maxD`): `count` lần cách nhau trong khoảng gap, vị trí ngẫu nhiên; 'fill' = nối chuỗi kín đoạn. */
function planEarly(plan: EarlyPlan, minD: number, maxD: number, random: () => number): number[] {
  const len = maxD - minD + 1;
  if (len <= 0) return [];
  const [gMin, gMax] = plan.gapDays;
  if (plan.count === 'fill') {
    const out: number[] = [];
    for (let d = minD + randInt(0, gMax - 1, random); d <= maxD; d += randInt(gMin, gMax, random)) out.push(d);
    return out;
  }
  // Tháng ngắn không đủ chỗ → giảm số lần (không bao giờ ép 2 lần sát nhau hơn khoảng tối thiểu).
  const count = Math.min(plan.count, Math.floor((len - 1) / gMin) + 1);
  if (count <= 0) return [];
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const gaps = Array.from({ length: count - 1 }, () => randInt(gMin, gMax, random));
    const span = gaps.reduce((a, b) => a + b, 0);
    if (span > len - 1) continue;
    let d = minD + randInt(0, len - 1 - span, random);
    const out = [d];
    for (const g of gaps) { d += g; out.push(d); }
    return out;
  }
  return Array.from({ length: count }, (_, i) => minD + i * gMin); // an toàn: khoảng tối thiểu
}

/**
 * BR-35: danh sách NGÀY TRONG THÁNG (1…ngày lương) Rây tự báo giá, tăng dần.
 * `fromDay` (khi Khang đổi mức giữa tháng): chỉ trả các ngày từ `fromDay` trở đi.
 */
export function planMonthPosts(year: number, month: number, level: FrequencyLevel, random: () => number, fromDay = 1): number[] {
  const payday = getPaydayOfMonth(year, month);
  const windowDs = planWindow(level, random);
  const early = FREQUENCY_PROFILES[level].early;
  // Đầu tháng cách lần báo xa nhất của 14 ngày cuối ít nhất 1 khoảng tối thiểu → không báo 2 ngày sát nhau ở chỗ nối.
  const minEarlyD = Math.max(ALERT_WINDOW_DAYS, Math.max(...windowDs) + early.gapDays[0]);
  const earlyDs = planEarly(early, minEarlyD, payday - 1, random);
  return [...new Set([...windowDs, ...earlyDs])]
    .map((d) => payday - d)
    .filter((day) => day >= Math.max(1, fromDay))
    .sort((a, b) => a - b);
}
