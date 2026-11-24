// Barie (CODING_STANDARDS 6.18): luật máy kiểm được → test đỏ là không qua. KHÔNG tắt / sửa để cho xanh.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { ERROR_CODES } from '../src/domain/app-error.ts';
import { ERROR_MESSAGES } from '../src/shared/messages.vi.ts';

const trackedFiles = (): string[] =>
  execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard'], { encoding: 'utf8' })
    .split('\n').filter((f) => f && existsSync(f));
const srcFiles = () => trackedFiles().filter((f) => f.startsWith('src/') && f.endsWith('.ts'));

/** Đọc tên thật từ bảng đối chiếu riêng (cột 1), bỏ dòng mô tả "(…)" và dòng trùng biệt danh (Khang). */
function readRealNames(): string[] {
  const file = 'docs/rieng-tu/BANG-TEN-THAT.md';
  if (!existsSync(file)) return [];
  const names = new Set<string>();
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    const cells = line.split('|').map((c) => c.trim());
    if (cells.length < 4 || !cells[2].startsWith('**')) continue;
    const real = cells[1];
    const nick = cells[2].replace(/\*/g, '').trim();
    if (!real || real.startsWith('(') || real === nick) continue;
    const head = real.split('(')[0].trim();
    if (head) { names.add(head); names.add(head.split(' ')[0]); }
    for (const m of real.matchAll(/"([^"]+)"/g)) names.add(m[1]);
  }
  return [...names].filter((n) => n.length >= 3);
}

test('BUG-0001 barie: không tên thật nào ngoài docs/rieng-tu/ (Rule 5)', () => {
  const names = readRealNames();
  assert.ok(names.length > 0, 'không đọc được bảng tên thật — barie không được im lặng');
  const skip = (f: string) => f.startsWith('docs/rieng-tu/') || f === 'docs/SKILL_TAM.md' || /\.(png|jpe?g|gif|ico)$/.test(f);
  const hits: string[] = [];
  for (const f of trackedFiles().filter((x) => !skip(x))) {
    const text = readFileSync(f, 'utf8');
    for (const n of names) {
      const re = new RegExp(`(?<![\\p{L}\\p{N}])${n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\p{L}\\p{N}])`, 'u');
      if (re.test(text)) hits.push(`${f}: «${n}»`);
    }
  }
  assert.deepEqual(hits, []);
});

test('Mỗi mã lỗi có đủ 2 câu (báo lỗi + cách xử lý) — CODING_STANDARDS 6.4', () => {
  for (const code of ERROR_CODES) {
    const m = ERROR_MESSAGES[code];
    assert.ok(m?.message?.length > 10 && m?.fix?.length > 10, `${code} thiếu câu`);
  }
  assert.ok(!ERROR_CODES.some((c) => /-0*13$/.test(c)), 'không dùng số 13');
});

test('Chỉ src/adapters/ được gọi mạng (fetch) — phân tầng 6.1', () => {
  const bad = srcFiles().filter((f) => !f.startsWith('src/adapters/') && /\bfetch\s*\(/.test(readFileSync(f, 'utf8')));
  assert.deepEqual(bad, []);
});

test('Không bí mật gõ cứng trong code (B5): token bot Telegram, khóa Google, khóa Supabase', () => {
  const patterns = [/\b\d{8,10}:[A-Za-z0-9_-]{30,}\b/, /AIza[0-9A-Za-z_-]{30,}/, /\bsb_(secret|publishable)_[A-Za-z0-9]{10,}/, /eyJhbGciOi[A-Za-z0-9_-]{20,}/];
  const bad = trackedFiles().filter((f) => /\.(ts|js|mjs|json|ya?ml|md)$/.test(f) && !f.startsWith('prototype-v0/'))
    .filter((f) => patterns.some((p) => p.test(readFileSync(f, 'utf8'))));
  assert.deepEqual(bad, []);
});

test('Không gửi thinkingConfig cho Gemini (Bẫy 42, tài liệu gọi AI của Khang)', () => {
  const bad = srcFiles().filter((f) => readFileSync(f, 'utf8').includes('thinkingConfig'));
  assert.deepEqual(bad, []);
});
