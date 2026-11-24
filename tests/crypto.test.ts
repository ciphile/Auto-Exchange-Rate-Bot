import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { decryptText, encryptText, parseEncryptionKey } from '../src/shared/crypto.ts';

const key = randomBytes(32);

test('BR-19 mã hóa / giải mã tin nhắn tiếng Việt', () => {
  const plain = 'Tỉ giá hôm nay cao quá, đổi liền đi mấy sếp 🙂';
  const stored = encryptText(plain, key);
  assert.ok(!stored.includes('Tỉ giá'));
  assert.equal(decryptText(stored, key), plain);
  assert.notEqual(encryptText(plain, key), stored, 'mỗi lần mã hóa phải khác nhau (iv ngẫu nhiên)');
});

test('BR-19 sai khóa hoặc dữ liệu bị sửa → từ chối', () => {
  const stored = encryptText('bí mật', key);
  assert.throws(() => decryptText(stored, randomBytes(32)));
  const raw = Buffer.from(stored, 'base64');
  raw.writeUInt8(raw.readUInt8(raw.length - 1) ^ 1, raw.length - 1);
  assert.throws(() => decryptText(raw.toString('base64'), key));
});

test('ATR-11 khóa mã hóa phải đúng 32 byte', () => {
  assert.throws(() => parseEncryptionKey(undefined), /E-CFG-001/);
  assert.throws(() => parseEncryptionKey(randomBytes(16).toString('hex')), /E-CFG-001/);
  assert.equal(parseEncryptionKey(key.toString('hex')).length, 32);
  assert.throws(() => parseEncryptionKey(key.toString('base64')), /E-CFG-001/);
});
