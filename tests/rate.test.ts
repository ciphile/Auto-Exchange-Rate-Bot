import { test } from 'node:test';
import assert from 'node:assert/strict';
import { convertSgdToVnd, convertVndToSgdCents, estimateBlackMarketVnd } from '../src/services/rate.service.ts';

test('BR-12 chợ đen ước tính = Wise × 1,004, tròn 10 đ', () => {
  assert.equal(estimateBlackMarketVnd(19975.2), 20060); // 20 055,1 → tròn tới 10 đ
  assert.equal(estimateBlackMarketVnd(20000), 20080);
});

test('quy_doi: tiền luôn là số nguyên đơn vị nhỏ nhất', () => {
  assert.equal(convertSgdToVnd(1_000_000, 19975.2), 199_752_000); // 10.000 SGD
  assert.ok(Number.isInteger(convertSgdToVnd(123, 19975.27)));
  assert.equal(convertVndToSgdCents(199_752_000, 19975.2), 1_000_000);
});
