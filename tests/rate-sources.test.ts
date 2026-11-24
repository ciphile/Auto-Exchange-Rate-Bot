// F-01: đọc dữ liệu mẫu đúng dạng thật của từng nguồn (lấy dạng từ lần chạy thật 23–24/11/2026), không gọi mạng.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseFallbackMid, parseNumber, parseVcbXml, parseVpbank, parseWiseHistory, parseWiseLive,
} from '../src/adapters/rate-sources.adapter.ts';

test('parseNumber: dấu phẩy nghìn, gạch ngang, rỗng', () => {
  assert.equal(parseNumber('19,497.26'), 19497.26);
  assert.equal(parseNumber(19648), 19648);
  assert.equal(parseNumber('-'), null);
  assert.equal(parseNumber(''), null);
  assert.equal(parseNumber(null), null);
});

test('F-01 Wise live + lịch sử theo giờ', () => {
  assert.equal(parseWiseLive({ source: 'SGD', target: 'VND', value: 20015.1, time: 1 }), 20015.1);
  assert.equal(parseWiseLive({}), null);
  const pts = parseWiseHistory([{ value: 2, time: 2000 }, { value: 'x', time: 1500 }, { value: 1, time: 1000 }]);
  assert.deepEqual(pts, [{ at: 1000, rateVnd: 1 }, { at: 2000, rateVnd: 2 }]);
  assert.deepEqual(parseWiseHistory({}), []);
});

test('F-01 nguồn dự phòng (BR-05)', () => {
  assert.equal(parseFallbackMid({ result: 'success', rates: { VND: 19993.5 } }), 19993.5);
  assert.equal(parseFallbackMid({ result: 'error' }), null);
  assert.equal(parseFallbackMid({ result: 'success', rates: { VND: 0 } }), null, 'audit lần 1: giá 0 là hỏng');
});

test('F-01 VCB XML', () => {
  const xml = `<!--For reference only.--><ExrateList>
  <Exrate CurrencyCode="DKK" CurrencyName="DANISH KRONE" Buy="-" Transfer="3,729.61" Sell="3,872.33" />
  <Exrate CurrencyCode="SGD" CurrencyName="SINGAPORE DOLLAR    " Buy="19,497.26" Transfer="19,694.20" Sell="20,366.19" /></ExrateList>`;
  assert.deepEqual(parseVcbXml(xml), { bank: 'VCB', cashBuyVnd: 19497.26, transferBuyVnd: 19694.2, sellVnd: 20366.19 });
  assert.equal(parseVcbXml('<html>'), null);
});

test('F-01 VPBank: lấy bản chụp mới nhất', () => {
  const body = [
    { effectiveTime: '2026-11-23T14:55:01', exchangeRates: [{ currency: 'SGD', buyCash: 19644, buyTransfer: 19694, sellTransfer: 20357 }] },
    { effectiveTime: '2026-11-23T16:00:03', exchangeRates: [{ currency: 'USD', buyCash: null }, { currency: 'SGD', buyCash: 19648, buyTransfer: 19698, sellTransfer: 20365 }] },
  ];
  assert.deepEqual(parseVpbank(body), { bank: 'VPBank', cashBuyVnd: 19648, transferBuyVnd: 19698, sellVnd: 20365 });
  assert.equal(parseVpbank({}), null);
});
