import { test } from 'node:test';
import assert from 'node:assert/strict';
import { convertSgdToVnd, convertVndToSgdCents, describeRateSource, estimateBlackMarketVnd } from '../src/services/rate.service.ts';
import { vn } from './helpers.ts';

test('BR-12 chợ đen ước tính = Wise × 1,004, tròn 10 đ', () => {
  assert.equal(estimateBlackMarketVnd(19975.2), 20060); // 20 055,1 → tròn tới 10 đ
  assert.equal(estimateBlackMarketVnd(20000), 20080);
});

test('quy_doi: tiền luôn là số nguyên đơn vị nhỏ nhất', () => {
  assert.equal(convertSgdToVnd(1_000_000, 19975.2), 199_752_000); // 10.000 SGD
  assert.ok(Number.isInteger(convertSgdToVnd(123, 19975.27)));
  assert.equal(convertVndToSgdCents(199_752_000, 19975.2), 1_000_000);
});

test('BR-29 câu về giá luôn kèm nguồn + thời điểm (giờ VN)', () => {
  assert.equal(describeRateSource('wise', vn(2026, 11, 24, 11, 0)), 'theo Wise, lấy lúc 11:00 ngày 24/11/2026');
  assert.equal(describeRateSource('vcb', vn(2026, 12, 1, 6, 5)), 'theo Vietcombank, lấy lúc 06:05 ngày 01/12/2026');
  assert.match(describeRateSource('wise_fallback', vn(2026, 12, 1, 1)), /nguồn dự phòng/);
});
