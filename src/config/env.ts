// Biến môi trường (bí mật + cấu hình khởi động) — MỘT nơi khai báo. Thêm / đổi 1 biến = sửa đủ 4 nơi CÙNG commit
// (barie tests/env.test.ts): danh sách ở file này · .env.example · docs/huong-dan-cai-dat.md · FS phụ lục D.
// Không bao giờ in GIÁ TRỊ biến ra log / tin nhắn — chỉ in TÊN.
import type { Result } from '../shared/result.ts';
import { fail, ok } from '../shared/result.ts';

export const REQUIRED_ENV = [
  'RAY_BOT_TOKEN', // token bot Rây (BotFather)
  'RAY_WEBHOOK_SECRET', // mã bí mật Telegram gửi kèm mỗi tin tới webhook của Rây (ATR-1)
  'OWNER_TELEGRAM_ID', // mã tài khoản Telegram của Khang (BR-23) — không bí mật nhưng là cấu hình khởi động
  'GEMINI_API_KEY', // khóa Google AI Studio (gói miễn phí)
  'SUPABASE_URL', // địa chỉ project Supabase
  'SUPABASE_SECRET_KEY', // khóa bí mật Supabase (sb_secret_…) — chỉ máy chủ (ATR-9, ATR-10)
  'DATA_ENCRYPTION_KEY', // khóa AES-256-GCM 32 byte (ADR-06)
  'TICK_SECRET', // mã Bearer cho /api/tick (ATR-3)
] as const;
/** Lũi: chưa làm (chờ Khang) → 2 biến này được để trống; có thì phải có đủ cả 2. */
export const OPTIONAL_ENV = ['LUI_BOT_TOKEN', 'LUI_WEBHOOK_SECRET'] as const;
export const ALL_ENV_NAMES: readonly string[] = [...REQUIRED_ENV, ...OPTIONAL_ENV];

type RequiredName = (typeof REQUIRED_ENV)[number];
export type AppEnv = Record<RequiredName, string> & { LUI_BOT_TOKEN: string | null; LUI_WEBHOOK_SECRET: string | null };

const MIN_SECRET_LENGTH = 32; // ATR-11
const BOT_TOKEN_PATTERN = /^\d{5,}:[A-Za-z0-9_-]{30,}$/;
const WEBHOOK_SECRET_PATTERN = /^[A-Za-z0-9_-]+$/; // Telegram chỉ nhận A-Z a-z 0-9 _ - cho secret_token
const HEX_64_PATTERN = /^[0-9a-fA-F]{64}$/;

/** Mỗi biến 1 luật kiểm; trả câu mô tả lỗi (KHÔNG chứa giá trị) hoặc null. */
const CHECKS: Record<string, (v: string) => string | null> = {
  RAY_BOT_TOKEN: (v) => (BOT_TOKEN_PATTERN.test(v) ? null : 'không đúng dạng token BotFather (số:chữ)'),
  LUI_BOT_TOKEN: (v) => (BOT_TOKEN_PATTERN.test(v) ? null : 'không đúng dạng token BotFather (số:chữ)'),
  RAY_WEBHOOK_SECRET: checkWebhookSecret,
  LUI_WEBHOOK_SECRET: checkWebhookSecret,
  TICK_SECRET: (v) => (v.length >= MIN_SECRET_LENGTH ? null : `phải dài ≥ ${MIN_SECRET_LENGTH} ký tự`),
  OWNER_TELEGRAM_ID: (v) => (/^\d{5,15}$/.test(v) ? null : 'phải là dãy số (mã tài khoản Telegram)'),
  GEMINI_API_KEY: (v) => (/^[A-Za-z0-9_-]{30,}$/.test(v) ? null : 'không đúng dạng khóa Google AI Studio'),
  SUPABASE_URL: (v) => (/^https:\/\/[a-z0-9-]+\.supabase\.co\/?/.test(v) ? null : 'phải dạng https://<mã>.supabase.co'),
  // Bẫy 22: khóa kiểu mới sb_secret_… chỉ gửi qua header `apikey`.
  SUPABASE_SECRET_KEY: (v) => (v.startsWith('sb_secret_') ? null : 'phải là khóa bí mật bắt đầu bằng sb_secret_'),
  DATA_ENCRYPTION_KEY: (v) => (HEX_64_PATTERN.test(v) ? null : 'phải là 64 ký tự hex (32 byte)'),
};

function checkWebhookSecret(v: string): string | null {
  if (!WEBHOOK_SECRET_PATTERN.test(v)) return 'chỉ được chữ, số, _ và -';
  return v.length >= MIN_SECRET_LENGTH && v.length <= 256 ? null : `phải dài ${MIN_SECRET_LENGTH}–256 ký tự`;
}

/**
 * Đọc + kiểm biến môi trường lúc khởi động (CODING_STANDARDS 6.8). Lỗi → E-CFG-001 kèm TÊN biến (không kèm giá trị).
 * ATR-11: các mã bí mật tự sinh phải khác nhau từng đôi.
 */
export function loadEnv(source: Record<string, string | undefined>): Result<AppEnv> {
  const problems: string[] = [];
  const read = (name: string) => (source[name] ?? '').trim();
  for (const name of REQUIRED_ENV) {
    const v = read(name);
    const why = v === '' ? 'đang trống' : CHECKS[name]?.(v) ?? null;
    if (why) problems.push(`${name}: ${why}`);
  }
  const luiToken = read('LUI_BOT_TOKEN');
  const luiSecret = read('LUI_WEBHOOK_SECRET');
  if ((luiToken === '') !== (luiSecret === '')) problems.push('LUI_BOT_TOKEN / LUI_WEBHOOK_SECRET: phải có đủ cả 2 hoặc để trống cả 2');
  for (const [name, v] of [['LUI_BOT_TOKEN', luiToken], ['LUI_WEBHOOK_SECRET', luiSecret]] as const) {
    const why = v === '' ? null : CHECKS[name]?.(v) ?? null;
    if (why) problems.push(`${name}: ${why}`);
  }
  const selfMade = ['RAY_WEBHOOK_SECRET', 'LUI_WEBHOOK_SECRET', 'TICK_SECRET', 'DATA_ENCRYPTION_KEY'].map(read).filter((v) => v !== '');
  if (new Set(selfMade.map((v) => v.toLowerCase())).size !== selfMade.length) problems.push('Các mã tự tạo (webhook, tick, mã hóa) phải khác nhau từng cái');
  if (problems.length > 0) return fail('E-CFG-001', problems.join(' · '));
  const env = Object.fromEntries(REQUIRED_ENV.map((n) => [n, read(n)])) as Record<RequiredName, string>;
  return ok({
    ...env,
    SUPABASE_URL: new URL(env.SUPABASE_URL).origin, // Bẫy 23: chỉ lấy origin, bỏ đường dẫn dán thừa
    LUI_BOT_TOKEN: luiToken || null,
    LUI_WEBHOOK_SECRET: luiSecret || null,
  });
}

/** Đọc biến môi trường của tiến trình (chỉ file này được chạm process.env — barie 6.8). */
export const loadProcessEnv = (): Result<AppEnv> => loadEnv(process.env);

/**
 * Tên miền chính của project trên Vercel — biến HỆ THỐNG Vercel tự tạo (Khang không phải thêm), dùng để bot tự đăng ký webhook.
 * Không có (chạy ngoài Vercel) → null: bỏ bước tự đăng ký.
 */
export const getVercelProductionHost = (): string | null => process.env.VERCEL_PROJECT_PRODUCTION_URL || null;
