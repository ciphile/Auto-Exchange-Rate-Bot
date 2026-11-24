import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  getDaysUntilPayday, getPaydayOfMonth, isInAlertWindow, isInPaydayWeek, pickRandomTalkMinute, planPaydayWeek,
} from '../src/services/payday.service.ts';
import { getVnDateKey } from '../src/shared/vn-time.ts';
import { seededRandom, vn } from './helpers.ts';

test('BR-01 ngày lương = ngày cuối tháng (tháng 30, 31, tháng 2 nhuận / không nhuận)', () => {
  assert.equal(getPaydayOfMonth(2026, 11), 30);
  assert.equal(getPaydayOfMonth(2026, 12), 31);
  assert.equal(getPaydayOfMonth(2027, 2), 28);
  assert.equal(getPaydayOfMonth(2028, 2), 29);
});

test('BR-02 tuần lương = 7 ngày tính tới ngày lương (tháng 11/2026: 24 → 30)', () => {
  assert.equal(isInPaydayWeek(vn(2026, 11, 23, 12)), false);
  assert.equal(isInPaydayWeek(vn(2026, 11, 24, 0, 1)), true);
  assert.equal(isInPaydayWeek(vn(2026, 11, 30, 23, 59)), true);
  assert.equal(getDaysUntilPayday(vn(2026, 11, 30, 9)), 0);
});

test('BR-03 khung cảnh báo = 14 ngày tính tới ngày lương (tháng 12/2026: 18 → 31)', () => {
  assert.equal(isInAlertWindow(vn(2026, 12, 17, 23, 59)), false);
  assert.equal(isInAlertWindow(vn(2026, 12, 18, 0, 0)), true);
  assert.equal(isInAlertWindow(vn(2027, 1, 1, 8)), false);
});

test('Bẫy 24: 23:40 UTC là sáng hôm sau giờ VN — ngày nghiệp vụ theo giờ VN', () => {
  assert.equal(getVnDateKey(new Date(Date.UTC(2026, 10, 29, 23, 40))), '2026-11-30');
  assert.equal(getDaysUntilPayday(new Date(Date.UTC(2026, 10, 29, 23, 40))), 0);
});

test('BR-10 kế hoạch tuần lương: luôn báo ngày lương, không nghỉ 2 ngày liền, 4–6 lần (5.000 lần ngẫu nhiên)', () => {
  const random = seededRandom(42);
  const totals = new Set<number>();
  for (let i = 0; i < 5000; i++) {
    const days = planPaydayWeek(random);
    assert.ok(days.includes(0), 'ngày lương phải có');
    assert.ok(days.length >= 4 && days.length <= 6, `số lần ${days.length}`);
    for (let d = 6; d >= 1; d--) {
      assert.ok(days.includes(d) || days.includes(d - 1), `nghỉ 2 ngày liền ở ${d}, ${d - 1}`);
    }
    totals.add(days.length);
  }
  assert.deepEqual([...totals].sort(), [4, 5, 6], 'phải ra đủ các mức 4, 5, 6');
});

test('BR-11 giờ nói ngẫu nhiên nằm trong 06:30–19:30', () => {
  const random = seededRandom(7);
  for (let i = 0; i < 5000; i++) {
    const m = pickRandomTalkMinute(random);
    assert.ok(m >= 390 && m <= 1170, `phút ${m}`);
  }
});
