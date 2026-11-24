import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_ALERT_LEVELS_VND as L } from '../src/config/defaults.ts';
import { EMPTY_ALERT_STATE, evaluateAlert, pickCrossedLevel, updateBand, type AlertState } from '../src/services/alert.service.ts';
import { vn } from './helpers.ts';

const run = (s: AlertState, rate: number, at: Date, open = true) => evaluateAlert(s, rate, at, L, open);

test('BR-06 lần đo đầu chỉ đặt vị trí, không báo', () => {
  const r = run(EMPTY_ALERT_STATE, 20050, vn(2026, 12, 20, 11));
  assert.equal(r.action, 'none');
  assert.equal(r.state.band, 3);
});

test('BR-07 đệm ±10: giá lởn vởn sát mốc 20,000 không báo qua lại', () => {
  let s = run(EMPTY_ALERT_STATE, 20005, vn(2026, 12, 20, 6)).state;
  for (const [rate, h] of [[19995, 7], [20004, 8], [19992, 9], [20008, 10]] as const) {
    const r = run(s, rate, vn(2026, 12, 20, h));
    assert.equal(r.action, 'none', `giá ${rate}`);
    s = r.state;
  }
  assert.equal(updateBand(3, 19989, L), 2);
});

test('BR-07 cảnh báo cả 2 chiều: giảm qua 20,000 rồi tăng lại', () => {
  let r = run(run(EMPTY_ALERT_STATE, 20050, vn(2026, 12, 20, 6)).state, 19980, vn(2026, 12, 20, 11));
  assert.equal(r.action, 'send');
  assert.deepEqual([r.event?.levelVnd, r.event?.direction], [20000, 'down']);
  r = run(r.state, 20030, vn(2026, 12, 20, 16));
  assert.equal(r.action, 'send');
  assert.deepEqual([r.event?.levelVnd, r.event?.direction], [20000, 'up']);
});

test('F-03 cắt nhiều mốc một lần: ưu tiên mốc chính 20,000 / 20,100', () => {
  assert.deepEqual(pickCrossedLevel(5, 1, L), { levelVnd: 20000, direction: 'down' });
  assert.deepEqual(pickCrossedLevel(2, 5, L), { levelVnd: 20100, direction: 'up' });
  assert.deepEqual(pickCrossedLevel(1, 0, L), { levelVnd: 19800, direction: 'down' });
});

test('BR-08 cách nhau ≥ 3 giờ: cắt mốc 2 giờ sau lần báo trước thì hoãn', () => {
  let r = run(run(EMPTY_ALERT_STATE, 20050, vn(2026, 12, 20, 6)).state, 19980, vn(2026, 12, 20, 9));
  assert.equal(r.action, 'send');
  r = run(r.state, 19880, vn(2026, 12, 20, 11));
  assert.equal(r.action, 'defer');
  r = run(r.state, 19885, vn(2026, 12, 20, 12, 10));
  assert.equal(r.action, 'send');
  assert.equal(r.event?.levelVnd, 19900);
});

test('BR-08 tối đa 4 cảnh báo / ngày', () => {
  let s = run(EMPTY_ALERT_STATE, 20050, vn(2026, 12, 20, 6)).state;
  const seq = [19980, 20030, 19980, 20030, 19980];
  let sent = 0;
  seq.forEach((rate, i) => {
    const r = run(s, rate, vn(2026, 12, 20, 6 + i * 3, 1));
    if (r.action === 'send') sent++;
    s = r.state;
  });
  assert.equal(sent, 4);
});

test('BR-09 giờ nghỉ: cắt mốc lúc 22:00 → chờ, 06:00 sáng còn bên kia mốc thì báo', () => {
  let r = run(run(EMPTY_ALERT_STATE, 20050, vn(2026, 12, 20, 16)).state, 19980, vn(2026, 12, 20, 22));
  assert.equal(r.action, 'defer');
  r = run(r.state, 19975, vn(2026, 12, 21, 6, 5));
  assert.equal(r.action, 'send');
});

test('BR-09 giờ nghỉ: sáng ra giá đã quay lại phía cũ → bỏ, không báo', () => {
  let r = run(run(EMPTY_ALERT_STATE, 20050, vn(2026, 12, 20, 16)).state, 19980, vn(2026, 12, 20, 22));
  r = run(r.state, 20020, vn(2026, 12, 21, 6, 5));
  assert.equal(r.action, 'drop');
  assert.equal(r.state.pending, null);
});

test('BR-03 ngoài khung cảnh báo: không báo, vẫn cập nhật vị trí', () => {
  const r = run(run(EMPTY_ALERT_STATE, 20050, vn(2026, 12, 5, 6), false).state, 19980, vn(2026, 12, 5, 11), false);
  assert.notEqual(r.action, 'send');
  assert.equal(r.state.band, 2);
});
