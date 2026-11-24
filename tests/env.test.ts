// Biến môi trường: kiểm lúc khởi động (6.8, ATR-11) + barie "đủ 4 nơi" (6.18 mục 6).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { ALL_ENV_NAMES, loadEnv } from '../src/config/env.ts';

// Giá trị giả ghép lúc chạy (không viết liền trong file để barie quét bí mật không báo nhầm).
const fakeToken = (n: string) => `${n}:` + 'A'.repeat(35);
const hex = (c: string) => c.repeat(64);
const GOOD: Record<string, string> = {
  RAY_BOT_TOKEN: fakeToken('1234567890'),
  RAY_WEBHOOK_SECRET: hex('a'),
  OWNER_TELEGRAM_ID: '123456789',
  GEMINI_API_KEY: 'G'.repeat(39),
  SUPABASE_URL: 'https://abcdefgh.supabase.co',
  SUPABASE_SECRET_KEY: 'sb_' + 'secret_' + 'x'.repeat(30),
  DATA_ENCRYPTION_KEY: hex('b'),
  TICK_SECRET: hex('c'),
};

test('E-CFG-001 đủ biến hợp lệ → đọc được; Lũi trống → null', () => {
  const r = loadEnv(GOOD);
  assert.ok(r.ok);
  if (r.ok) { assert.equal(r.data.LUI_BOT_TOKEN, null); assert.equal(r.data.SUPABASE_URL, 'https://abcdefgh.supabase.co'); }
});

test('E-CFG-001 thiếu / sai biến → báo TÊN biến, không bao giờ in giá trị', () => {
  const r = loadEnv({ ...GOOD, GEMINI_API_KEY: '', DATA_ENCRYPTION_KEY: 'ngắn-quá', RAY_BOT_TOKEN: 'abc' });
  assert.equal(r.ok, false);
  if (!r.ok) {
    assert.equal(r.error.code, 'E-CFG-001');
    for (const n of ['GEMINI_API_KEY', 'DATA_ENCRYPTION_KEY', 'RAY_BOT_TOKEN']) assert.match(r.error.detail ?? '', new RegExp(n));
    assert.doesNotMatch(r.error.detail ?? '', /ngắn-quá/);
  }
});

test('ATR-11 các mã tự tạo phải khác nhau; webhook secret chỉ chữ, số, _ - (luật Telegram)', () => {
  assert.equal(loadEnv({ ...GOOD, TICK_SECRET: GOOD.RAY_WEBHOOK_SECRET }).ok, false);
  assert.equal(loadEnv({ ...GOOD, RAY_WEBHOOK_SECRET: 'a+b/'.repeat(10) }).ok, false);
  assert.equal(loadEnv({ ...GOOD, TICK_SECRET: 'x'.repeat(31) }).ok, false);
});

test('Bẫy 22–23: khóa Supabase phải sb_secret_…; URL dán thừa đường dẫn → chỉ lấy origin', () => {
  assert.equal(loadEnv({ ...GOOD, SUPABASE_SECRET_KEY: 'sb_' + 'publishable_' + 'x'.repeat(30) }).ok, false);
  const r = loadEnv({ ...GOOD, SUPABASE_URL: 'https://abcdefgh.supabase.co/rest/v1/' });
  assert.ok(r.ok && r.data.SUPABASE_URL === 'https://abcdefgh.supabase.co');
});

test('Lũi: token và mã webhook phải có đủ cả 2 hoặc trống cả 2', () => {
  assert.equal(loadEnv({ ...GOOD, LUI_BOT_TOKEN: fakeToken('2234567890') }).ok, false);
  const r = loadEnv({ ...GOOD, LUI_BOT_TOKEN: fakeToken('2234567890'), LUI_WEBHOOK_SECRET: hex('d') });
  assert.ok(r.ok && r.data.LUI_WEBHOOK_SECRET === hex('d'));
});

test('Barie 6.18-6: mỗi biến môi trường có đủ 4 nơi (env.ts · .env.example · hướng dẫn cài đặt · FS phụ lục D)', () => {
  const example = readFileSync('.env.example', 'utf8');
  const guide = existsSync('docs/huong-dan-cai-dat.md') ? readFileSync('docs/huong-dan-cai-dat.md', 'utf8') : '';
  const fs = readFileSync('docs/specs/02-functional-spec.md', 'utf8');
  const fsAppendix = fs.slice(fs.indexOf('## Phụ lục D'));
  assert.ok(fs.includes('## Phụ lục D'), 'FS thiếu phụ lục D — Biến môi trường');
  const missing: string[] = [];
  for (const n of ALL_ENV_NAMES) {
    if (!new RegExp(`^${n}=`, 'm').test(example)) missing.push(`.env.example: ${n}`);
    if (!guide.includes(n)) missing.push(`huong-dan-cai-dat.md: ${n}`);
    if (!fsAppendix.includes(n)) missing.push(`FS phụ lục D: ${n}`);
  }
  for (const m of example.matchAll(/^([A-Z0-9_]+)=/gm)) if (m[1] && !ALL_ENV_NAMES.includes(m[1])) missing.push(`env.ts thiếu: ${m[1]}`);
  assert.deepEqual(missing, []);
});

test('Barie: chỉ src/config/ được đọc process.env (6.8 — một nơi cho mọi tham số)', () => {
  const files = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', 'src'], { encoding: 'utf8' })
    .split('\n').filter((f) => f.endsWith('.ts') && existsSync(f) && !f.startsWith('src/config/'));
  assert.deepEqual(files.filter((f) => readFileSync(f, 'utf8').includes('process.env')), []);
});
