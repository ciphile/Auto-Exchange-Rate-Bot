// BR-35: mức tần suất 1–5 — lịch tự báo giá cả tháng + giới hạn cảnh báo. Mô phỏng nhiều tháng + bất biến.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FREQUENCY_LEVELS, FREQUENCY_PROFILES, type FrequencyLevel } from '../src/config/frequency.ts';
import { parseFrequencyLevel, planMonthPosts } from '../src/services/frequency.service.ts';
import { EMPTY_ALERT_STATE, evaluateAlert, type AlertState } from '../src/services/alert.service.ts';
import { seededRandom, vn } from './helpers.ts';

const L = [19800, 19900, 20000, 20100, 20200, 20300];
const MONTHS: [number, number][] = [[2026, 2], [2026, 4], [2026, 11], [2026, 12], [2028, 2]]; // 28, 30, 30, 31, 29 ngày

/** Tách lịch tháng thành: đầu tháng (d ≥ 14) và 14 ngày cuối; d = số ngày còn tới ngày lương. */
function split(days: number[], payday: number) {
  const ds = days.map((day) => payday - day);
  return { early: ds.filter((d) => d >= 14), window: ds.filter((d) => d < 14).sort((a, b) => a - b) };
}
const gaps = (ds: number[]) => ds.slice(1).map((d, i) => d - (ds[i] ?? 0));

test('BR-35 /tansuat chỉ nhận 1–5', () => {
  assert.deepEqual(['1', ' 5 ', '3'].map(parseFrequencyLevel), [1, 5, 3]);
  for (const bad of ['0', '6', '2.5', 'ba', '', '13']) assert.equal(parseFrequencyLevel(bad), null);
});

test('BR-35 + BR-10 mọi mức, mọi tháng: ngày lương luôn báo; ≤ 1 lần / ngày; ngày hợp lệ, tăng dần', () => {
  const rnd = seededRandom(11);
  for (const level of FREQUENCY_LEVELS) for (const [y, m] of MONTHS) for (let i = 0; i < 200; i++) {
    const days = planMonthPosts(y, m, level, rnd);
    const payday = new Date(Date.UTC(y, m, 0)).getUTCDate();
    assert.equal(days.at(-1), payday, `mức ${level} ${m}/${y}`);
    assert.equal(new Set(days).size, days.length);
    assert.ok(days.every((d, k) => d >= 1 && d <= payday && (k === 0 || d > (days[k - 1] ?? 0))));
  }
});

test('BR-35 mức 1 (Khang): đầu tháng đúng 1 lần; 14 ngày cuối cách 4–5 ngày (thưa hơn mức 2)', () => {
  const rnd = seededRandom(12);
  for (let i = 0; i < 500; i++) {
    const { early, window } = split(planMonthPosts(2026, 11, 1, rnd), 30);
    assert.equal(early.length, 1);
    assert.ok(gaps(window).every((g) => g >= 4 && g <= 5), `${window}`);
  }
});

test('BR-35 mức 2 (Khang): đầu tháng 3 lần cách 4–5 ngày; 14 ngày cuối cách đúng 3 ngày', () => {
  const rnd = seededRandom(13);
  for (let i = 0; i < 500; i++) {
    const { early, window } = split(planMonthPosts(2026, 12, 2, rnd), 31);
    assert.equal(early.length, 3);
    assert.ok(gaps(early.sort((a, b) => a - b)).every((g) => g >= 4 && g <= 5));
    assert.deepEqual(window, [0, 3, 6, 9, 12]);
  }
});

test('BR-35 + BR-10 mức 3 (mặc định): tuần lương giữ luật cũ (4–6 lần, không nghỉ 2 ngày liền)', () => {
  const rnd = seededRandom(14);
  for (let i = 0; i < 500; i++) {
    const { early, window } = split(planMonthPosts(2026, 11, 3, rnd), 30);
    const week = window.filter((d) => d < 7);
    assert.ok(week.length >= 4 && week.length <= 6);
    assert.ok(gaps(week).every((g) => g <= 2));
    assert.equal(early.length, 4);
  }
});

test('BR-35 mức 5: tuần lương + tuần áp chót mỗi ngày; nhiều hơn mức 4 > 3 > 2 > 1 (trung bình)', () => {
  const avg = (level: FrequencyLevel) => {
    const rnd = seededRandom(15 + level);
    let n = 0;
    for (let i = 0; i < 300; i++) n += planMonthPosts(2026, 11, level, rnd).length;
    return n / 300;
  };
  const rnd = seededRandom(20);
  assert.deepEqual(split(planMonthPosts(2026, 11, 5, rnd), 30).window, Array.from({ length: 14 }, (_, d) => d));
  const a = FREQUENCY_LEVELS.map(avg);
  assert.ok(a.every((v, i) => i === 0 || v > (a[i - 1] ?? 0)), `${a}`);
});

test('BR-35 tháng 2 ngắn (28 ngày) mức 4–5: không ép 2 lần sát nhau ở đầu tháng, không lỗi', () => {
  const rnd = seededRandom(21);
  for (const level of [4, 5] as const) for (let i = 0; i < 200; i++) {
    const { early } = split(planMonthPosts(2026, 2, level, rnd), 28);
    const sorted = early.sort((a, b) => a - b);
    assert.ok(gaps(sorted).every((g) => g >= FREQUENCY_PROFILES[level].early.gapDays[0]));
  }
});

test('BR-35 đổi mức giữa tháng: chỉ lập lại các ngày từ hôm nay trở đi', () => {
  const days = planMonthPosts(2026, 11, 5, seededRandom(22), 20);
  assert.ok(days.length > 0 && days.every((d) => d >= 20));
});

// ── Cảnh báo theo mức ──
const alertRun = (s: AlertState, rate: number, at: Date, level: FrequencyLevel) => evaluateAlert(s, rate, at, L, true, FREQUENCY_PROFILES[level].alerts);

function countAlerts(level: FrequencyLevel, hoursBetween: number, steps: number): number {
  let s = alertRun(EMPTY_ALERT_STATE, 20050, vn(2026, 11, 20, 6), level).state;
  let sent = 0;
  for (let i = 1; i <= steps; i++) {
    const at = new Date(vn(2026, 11, 20, 6).getTime() + i * hoursBetween * 3600_000);
    const r = alertRun(s, i % 2 === 1 ? 19980 : 20030, at, level); // cắt mốc 20,000 qua lại mỗi lần
    if (r.action === 'send') sent++;
    s = r.state;
  }
  return sent;
}

test('BR-35 cảnh báo mức 1 (Khang): tối đa 1 lần / 3 ngày; vượt lượt thì BỎ (không dồn báo sau)', () => {
  // Cắt mốc mỗi 5 giờ (đúng nhịp lấy giá BR-04) trong 3 ngày → chỉ 1 cảnh báo.
  assert.equal(countAlerts(1, 5, Math.floor(72 / 5) - 1), 1);
  let s = alertRun(EMPTY_ALERT_STATE, 20050, vn(2026, 11, 20, 8), 1).state;
  s = alertRun(s, 19980, vn(2026, 11, 20, 9), 1).state; // gửi
  const r = alertRun(s, 20030, vn(2026, 11, 20, 16), 1);
  assert.equal(r.action, 'drop');
  assert.equal(r.state.pending, null);
});

test('BR-35 cảnh báo mức 2 (Khang): tối đa 2 lần / 2 ngày', () => {
  assert.equal(countAlerts(2, 5, Math.floor(48 / 5) - 1), 2);
});

test('BR-35 cảnh báo mức 3–5: 2 / 3 / 4 lần mỗi 24 giờ, luôn cách ≥ 3 giờ', () => {
  assert.equal(countAlerts(3, 3, 7), 2);
  assert.equal(countAlerts(4, 3, 7), 3);
  assert.equal(countAlerts(5, 3, 7), 4);
});
