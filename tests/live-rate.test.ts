// BR-30: lấy giá ngay — xác định nguồn (nêu tên / tất cả / tùy bot / thiếu → hỏi lại).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  canFetchLiveNow, isSourceQuestionOpen, matchSourceKeywords, parseSourceParam, planLiveFetch, type LiveSource,
} from '../src/services/live-rate.service.ts';
import { vn } from './helpers.ts';

const ALL_ON: LiveSource[] = ['wise', 'vcb', 'vpbank'];

test('BR-30 tham số AI: tên nguồn, mảng, tat_ca, tuy_bot; giá trị lạ → null (hỏi lại)', () => {
  assert.deepEqual(parseSourceParam('vcb'), { kind: 'named', sources: ['vcb'] });
  assert.deepEqual(parseSourceParam(['vcb', 'wise', 'vcb']), { kind: 'named', sources: ['vcb', 'wise'] });
  assert.deepEqual(parseSourceParam('tat_ca'), { kind: 'all' });
  assert.deepEqual(parseSourceParam('tuy_bot'), { kind: 'any' });
  for (const bad of [null, undefined, '', 'dbs', ['wise', 'dbs'], [], 5, { a: 1 }]) assert.equal(parseSourceParam(bad), null);
});

test('BR-30 thiếu nguồn → hỏi lại', () => {
  assert.deepEqual(planLiveFetch(null, ALL_ON), { kind: 'ask' });
});

test('BR-30 "tùy mày" / "nguồn nào cũng được" → Wise; Wise bị tắt → nguồn bật đầu tiên', () => {
  for (const text of ['tùy mày', 'tuỳ m', 'tuy may', 'nguồn nào cũng được', 'sao cũng được', 'gì cũng được']) {
    const choice = matchSourceKeywords(text);
    assert.deepEqual(choice, { kind: 'any' }, text);
    assert.deepEqual(planLiveFetch(choice, ALL_ON), { kind: 'fetch', sources: ['wise'], skipped: [], choice: 'any' });
  }
  assert.deepEqual(planLiveFetch({ kind: 'any' }, ['vpbank', 'vcb']), { kind: 'fetch', sources: ['vcb'], skipped: [], choice: 'any' });
});

test('BR-30 "tất cả nguồn" / "cả 3" → mọi nguồn đang bật', () => {
  for (const text of ['tất cả nguồn', 'lấy cả 3 đi', 'cả ba', 'mọi nguồn', 'lấy hết', 'all']) {
    assert.deepEqual(matchSourceKeywords(text), { kind: 'all' }, text);
  }
  assert.deepEqual(planLiveFetch({ kind: 'all' }, ALL_ON), { kind: 'fetch', sources: ALL_ON, skipped: [], choice: 'all' });
  assert.deepEqual(planLiveFetch({ kind: 'all' }, ['vcb']), { kind: 'fetch', sources: ['vcb'], skipped: [], choice: 'all' });
});

test('BR-30 nêu tên nguồn (có dấu / không dấu / viết tắt)', () => {
  assert.deepEqual(matchSourceKeywords('check VCB giùm cái'), { kind: 'named', sources: ['vcb'] });
  assert.deepEqual(matchSourceKeywords('vietcombank'), { kind: 'named', sources: ['vcb'] });
  assert.deepEqual(matchSourceKeywords('VP bank với wise'), { kind: 'named', sources: ['wise', 'vpbank'] });
  assert.deepEqual(matchSourceKeywords('Wise'), { kind: 'named', sources: ['wise'] });
});

test('BR-30 câu mơ hồ / loại trừ / không liên quan → null (để AI chọn, không đoán bừa)', () => {
  for (const text of ['tất cả trừ vcb', 'đừng lấy wise', 'tuy nhiên hôm nay mệt', 'ừ', 'vcb hay wise tùy mày', 'hôm nay tao vui']) {
    assert.equal(matchSourceKeywords(text), null, text);
  }
});

test('BR-30 nguồn được hỏi đang bị Khang tắt → báo tắt; nêu nhiều nguồn thì đọc nguồn bật, ghi nguồn bỏ qua', () => {
  assert.deepEqual(planLiveFetch({ kind: 'named', sources: ['vpbank'] }, ['wise', 'vcb']), { kind: 'disabled', requested: ['vpbank'], enabled: ['wise', 'vcb'] });
  assert.deepEqual(planLiveFetch({ kind: 'named', sources: ['vpbank', 'vcb'] }, ['wise', 'vcb']), { kind: 'fetch', sources: ['vcb'], skipped: ['vpbank'], choice: 'named' });
  assert.equal(planLiveFetch({ kind: 'all' }, []).kind, 'disabled');
  assert.equal(planLiveFetch({ kind: 'any' }, []).kind, 'disabled');
});

test('BR-30 mỗi nguồn tối đa 1 lần đọc / 5 phút', () => {
  const t0 = vn(2026, 11, 24, 10, 0).getTime();
  assert.equal(canFetchLiveNow(null, vn(2026, 11, 24, 10, 0)), true);
  assert.equal(canFetchLiveNow(t0, vn(2026, 11, 24, 10, 4)), false);
  assert.equal(canFetchLiveNow(t0, vn(2026, 11, 24, 10, 5)), true);
});

test('BR-30 câu hỏi "lấy nguồn nào?" còn hiệu lực 10 phút', () => {
  const asked = vn(2026, 11, 24, 10, 0).getTime();
  assert.equal(isSourceQuestionOpen(asked, vn(2026, 11, 24, 10, 10)), true);
  assert.equal(isSourceQuestionOpen(asked, vn(2026, 11, 24, 10, 11)), false);
  assert.equal(isSourceQuestionOpen(null, vn(2026, 11, 24, 10, 1)), false);
});
