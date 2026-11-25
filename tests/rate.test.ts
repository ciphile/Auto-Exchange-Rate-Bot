import { test } from 'node:test';
import assert from 'node:assert/strict';
import { convertSgdToVnd, convertVndToSgdCents, describeRateSource, estimateBlackMarketVnd } from '../src/services/rate.service.ts';
import { vn } from './helpers.ts';

test('BR-12 chợ đen ước tính = Wise × 1,0048, tròn 50 đ — khớp số thật Khang đối chiếu 25/11/2026', () => {
  assert.equal(estimateBlackMarketVnd(20004.3), 20100); // Wise 20.004,30 ↔ chợ đen thật 20.100
  assert.equal(estimateBlackMarketVnd(19975.2), 20050); // 20.071,1 → tròn tới 50 đ
  assert.equal(estimateBlackMarketVnd(20000), 20100);
  assert.equal(estimateBlackMarketVnd(19950) % 50, 0);
});

test('quy_doi: tiền luôn là số nguyên đơn vị nhỏ nhất', () => {
  assert.equal(convertSgdToVnd(1_000_000, 19975.2), 199_752_000); // 10.000 SGD
  assert.ok(Number.isInteger(convertSgdToVnd(123, 19975.27)));
  assert.equal(convertVndToSgdCents(199_752_000, 19975.2), 1_000_000);
});

test('BR-29 + BR-54 câu về giá luôn kèm nguồn + thời điểm, nói kiểu NGƯỜI (giờ VN): "mười một giờ sáng hôm nay", "sáu giờ sáng lẻ năm phút hôm qua", "ngày 22"', () => {
  const now = vn(2026, 11, 24, 11, 30);
  assert.equal(describeRateSource('wise', vn(2026, 11, 24, 11, 0), now), 'theo Wise, lấy lúc mười một giờ trưa hôm nay');
  assert.equal(describeRateSource('vcb', vn(2026, 11, 23, 6, 5), now), 'theo Vietcombank, lấy lúc sáu giờ sáng lẻ năm phút hôm qua');
  assert.equal(describeRateSource('wise', vn(2026, 11, 22, 14, 50), now), 'theo Wise, lấy lúc hai giờ chiều năm mươi phút ngày 22');
  assert.equal(describeRateSource('wise', vn(2026, 10, 30, 21, 15), now), 'theo Wise, lấy lúc chín giờ tối mười lăm phút ngày 30 tháng 10');
  assert.match(describeRateSource('wise_fallback', vn(2026, 11, 24, 1), now), /nguồn dự phòng.*lấy lúc một giờ sáng hôm nay/);
});

test('DBS (Khang 25/11/2026): đọc đúng dòng VND/SGD theo dữ liệu thật — 100 VND = 0,0051 SGD → 1 SGD = 19.607,84; giờ hiệu lực là giờ Singapore', async () => {
  const { parseDbsVnd } = await import('../src/adapters/rate-sources.adapter.ts');
  const body = { results: { assets: [{ recData: [
    { currency: 'VND', ttSell: '0.000052', ttBuy: '0.000000', quoteCurrency: 'BND', ttInverseSell: '0', ttInverseBuy: '19230.7692307692', baseCurrencyUnit: '1', quoteCurrencyUnit: '1' },
    { currency: 'VND', ttSell: '0.0051', ttBuy: '0', quoteCurrency: 'SGD', ttInverseSell: '0', ttInverseBuy: '196.0784313725', baseCurrencyUnit: '100', quoteCurrencyUnit: '1' },
  ] }] }, effectiveDateAndTime: '2026-11-25 10:15:03' };
  const q = parseDbsVnd(body);
  assert.ok(q && Math.abs(q.rateVnd - 19607.8431) < 0.001, JSON.stringify(q));
  assert.equal(new Date(q?.effectiveAt ?? 0).toISOString(), '2026-11-25T02:15:03.000Z');
  assert.equal(parseDbsVnd({ results: { assets: [{ recData: [{ currency: 'VND', quoteCurrency: 'SGD', ttSell: '0', ttInverseBuy: '0', baseCurrencyUnit: '100' }] }] } }), null, 'giá 0 → hỏng');
  assert.equal(parseDbsVnd({}), null);
  assert.equal(parseDbsVnd({ results: { assets: [{ recData: [{ currency: 'VND', quoteCurrency: 'SGD', ttInverseBuy: '5', baseCurrencyUnit: '1' }] }] } }), null, 'ngoài 10.000–40.000 → hỏng');
});

test('DBS: lấy giá lưu kho + bối cảnh ghi rõ "chỉ để so biến động, KHÔNG phải giá mọi người nhận"', async () => {
  const { createTestRuntime } = await import('./fakes.ts');
  const { fetchAndStoreRates, buildBankFacts } = await import('../src/services/rate-feed.service.ts');
  const { matchSourceKeywords } = await import('../src/services/live-rate.service.ts');
  const now = new Date('2026-11-25T03:00:00Z');
  const { rt } = createTestRuntime({ now: () => now });
  const r = await fetchAndStoreRates(rt.store, rt.fetchers, ['dbs']);
  assert.deepEqual(r.saved, ['dbs']);
  const facts = (await buildBankFacts(rt.store, now)).join('\n');
  assert.match(facts, /Giá DBS .*KHÔNG phải giá mọi người nhận.*1 SGD ≈ 19\.608 VND \(theo DBS, hiệu lực từ chín giờ sáng mười lăm phút hôm nay\)/);
  assert.deepEqual(matchSourceKeywords('check giá DBS coi'), { kind: 'named', sources: ['dbs'] });
});
