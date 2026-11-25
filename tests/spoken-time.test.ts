// Khang 25/11/2026: Rây / Lũi nói giờ + ngày kiểu NGƯỜI — "mười giờ sáng", "hai giờ chiều năm mươi phút", "hôm nay / hôm qua / ngày 25".
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { humanizeDateTimes, speakClock, speakDay } from '../src/shared/spoken-time.ts';
import { vn } from './helpers.ts';

test('speakClock: đúng ví dụ Khang + mọi giờ 0–23 có buổi; phút tròn / rưỡi / lẻ / hàng chục / mốt / lăm', () => {
  assert.equal(speakClock(10, 0), 'mười giờ sáng');
  assert.equal(speakClock(14, 50), 'hai giờ chiều năm mươi phút'); // ví dụ của Khang
  assert.equal(speakClock(14, 5), 'hai giờ chiều lẻ năm phút');
  assert.equal(speakClock(10, 30), 'mười giờ rưỡi sáng');
  assert.equal(speakClock(9, 15), 'chín giờ sáng mười lăm phút');
  assert.equal(speakClock(9, 21), 'chín giờ sáng hai mươi mốt phút');
  assert.equal(speakClock(9, 24), 'chín giờ sáng hai mươi bốn phút');
  assert.equal(speakClock(9, 25), 'chín giờ sáng hai mươi lăm phút');
  assert.equal(speakClock(9, 59), 'chín giờ sáng năm mươi chín phút');
  assert.equal(speakClock(9, 10), 'chín giờ sáng mười phút');
  assert.equal(speakClock(0, 0), 'mười hai giờ đêm');
  assert.equal(speakClock(1, 0), 'một giờ sáng');
  assert.equal(speakClock(11, 0), 'mười một giờ trưa');
  assert.equal(speakClock(12, 0), 'mười hai giờ trưa');
  assert.equal(speakClock(13, 0), 'một giờ chiều');
  assert.equal(speakClock(18, 0), 'sáu giờ tối');
  assert.equal(speakClock(22, 0), 'mười giờ đêm');
  assert.equal(speakClock(23, 45), 'mười một giờ đêm bốn mươi lăm phút');
  for (let h = 0; h < 24; h++) for (let m = 0; m < 60; m++) assert.ok(!/\d/.test(speakClock(h, m)), `${h}:${m}`);
});

test('speakDay: hôm nay / hôm qua / "ngày 25" (khác tháng thì thêm tháng); không có "bây giờ" (màn hình cài đặt) thì "ngày 25 tháng 11"', () => {
  const now = vn(2026, 11, 25, 10, 0);
  assert.equal(speakDay(vn(2026, 11, 25, 6, 0), now), 'hôm nay');
  assert.equal(speakDay(vn(2026, 11, 24, 23, 59), now), 'hôm qua');
  assert.equal(speakDay(vn(2026, 11, 23, 6, 0), now), 'ngày 23');
  assert.equal(speakDay(vn(2026, 10, 30, 6, 0), now), 'ngày 30 tháng 10');
  assert.equal(speakDay(vn(2026, 11, 25, 6, 0)), 'ngày 25 tháng 11');
  assert.equal(speakDay(vn(2026, 12, 1, 0, 30), vn(2026, 11, 30, 23, 50)), 'ngày 1 tháng 12', 'qua nửa đêm giờ VN');
});

test('humanizeDateTimes: "10:00" "14:05" "25/11/2026" → chữ; idempotent; không đụng ngày sai / tỉ số / số giá', () => {
  const now = vn(2026, 11, 25, 10, 0);
  assert.equal(humanizeDateTimes('lấy lúc 10:00 ngày 25/11/2026 nha', now), 'lấy lúc mười giờ sáng hôm nay nha');
  assert.equal(humanizeDateTimes('lúc 14:05 hôm qua 24/11', now), 'lúc hai giờ chiều lẻ năm phút hôm qua');
  assert.equal(humanizeDateTimes('lúc 14:05 ngày 23/11', now), 'lúc hai giờ chiều lẻ năm phút ngày 23', 'không thành "ngày ngày 23"');
  assert.equal(humanizeDateTimes('họp 9:15, nghỉ lễ 25/12', now), 'họp chín giờ sáng mười lăm phút, nghỉ lễ ngày 25 tháng 12');
  assert.equal(humanizeDateTimes('hồi 23/10/2025', now), 'hồi ngày 23 tháng 10 năm 2025');
  const once = humanizeDateTimes('lúc 10:00 ngày 25/11', now);
  assert.equal(humanizeDateTimes(once, now), once);
  assert.equal(humanizeDateTimes('ngày 40/13 giá 20.100 đ tỉ số 3-1', now), 'ngày 40/13 giá 20.100 đ tỉ số 3-1');
  assert.equal(humanizeDateTimes('sai 25:99', now), 'sai 25:99');
});
