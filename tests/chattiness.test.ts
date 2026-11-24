import { test } from 'node:test';
import assert from 'node:assert/strict';
import { decideChimeIn, type ChimeInInput } from '../src/services/chattiness.service.ts';
import { seededRandom, vn } from './helpers.ts';

const now = vn(2026, 12, 20, 14);
const base: ChimeInInput = {
  level: 5, newMessageCount: 5, lastMessageAt: now.getTime() - 5 * 60_000,
  chimeInsToday: 0, lastChimeInAt: null, hasTopicKeyword: false, now,
};
const rate = (input: ChimeInInput, n = 20_000) => {
  const random = seededRandom(1);
  let yes = 0;
  for (let i = 0; i < n; i++) if (decideChimeIn(input, random).speak) yes++;
  return yes / n;
};

test('BR-18 mức 1: không bao giờ tự chen', () => assert.equal(rate({ ...base, level: 1 }), 0));

test('BR-18 xác suất khớp bảng mức (mức 5 ≈ 20%, mức 10 ≈ 80%)', () => {
  assert.ok(Math.abs(rate(base) - 0.2) < 0.02);
  assert.ok(Math.abs(rate({ ...base, level: 10 }) - 0.8) < 0.02);
});

test('BR-18 đúng sở trường → × 1,5 (mức 5: ≈ 30%), trần 95%', () => {
  assert.ok(Math.abs(rate({ ...base, hasTopicKeyword: true }) - 0.3) < 0.02);
  assert.ok(rate({ ...base, level: 10, hasTopicKeyword: true }) <= 0.97);
});

test('BR-18 chưa xong đợt (chưa đủ 3 tin hoặc chưa im 3 phút) → không xét', () => {
  assert.equal(rate({ ...base, newMessageCount: 2 }), 0);
  assert.equal(rate({ ...base, lastMessageAt: now.getTime() - 60_000 }), 0);
});

test('BR-18 đủ trần / ngày, đang nghỉ sau lần chen, giờ nghỉ → không chen', () => {
  assert.equal(rate({ ...base, chimeInsToday: 4 }), 0);
  assert.equal(rate({ ...base, lastChimeInAt: now.getTime() - 10 * 60_000 }), 0);
  const night = vn(2026, 12, 20, 21);
  assert.equal(rate({ ...base, now: night, lastMessageAt: night.getTime() - 5 * 60_000 }), 0);
});
