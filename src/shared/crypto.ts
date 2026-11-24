// ADR-06 + BR-19: mã hóa AES-256-GCM ở tầng ứng dụng cho kho tin nhắn tạm và log prompt.
// Khóa 32 byte, mã base64, nằm ở biến môi trường (không nằm chung database). Dạng lưu: base64(iv | tag | cipher).
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

const IV_BYTES = 12;
const TAG_BYTES = 16;

/** ATR-11: khóa phải đúng 32 byte; sai → ném lỗi ngay lúc khởi động. */
export function parseEncryptionKey(base64Key: string | undefined): Buffer {
  const key = Buffer.from(base64Key ?? '', 'base64');
  if (key.length !== 32) throw new Error('E-CFG-001: DATA_ENCRYPTION_KEY phải là 32 byte mã base64');
  return key;
}

export function encryptText(plain: string, key: Buffer): string {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const body = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), body]).toString('base64');
}

/** Giải mã; dữ liệu bị sửa / sai khóa → ném lỗi (GCM kiểm toàn vẹn). */
export function decryptText(stored: string, key: Buffer): string {
  const raw = Buffer.from(stored, 'base64');
  const iv = raw.subarray(0, IV_BYTES);
  const tag = raw.subarray(IV_BYTES, IV_BYTES + TAG_BYTES);
  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(raw.subarray(IV_BYTES + TAG_BYTES)), decipher.final()]).toString('utf8');
}
