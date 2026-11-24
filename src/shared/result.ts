// Kết quả trả về chuẩn của Service / Adapter (CODING_STANDARDS 6.4).
import type { ErrorCode } from '../domain/app-error.ts';

export type AppError = { code: ErrorCode; detail?: string }; // detail chỉ vào log kỹ thuật, không cho người dùng
export type Result<T> = { ok: true; data: T } | { ok: false; error: AppError };

export const ok = <T>(data: T): Result<T> => ({ ok: true, data });
export const fail = <T = never>(code: ErrorCode, detail?: string): Result<T> => ({ ok: false, error: { code, detail } });
