// Nói chuyện với database Supabase qua REST (PostgREST) bằng fetch chuẩn — không SDK (ADR-03).
// Khóa sb_secret_… CHỈ gửi header `apikey` (Bẫy 22). Địa chỉ chỉ lấy origin (Bẫy 23, đã làm ở env.ts).
// Lọc bằng tham số URL đã encodeURIComponent → không nối chuỗi người dùng vào truy vấn (B7).
import { HTTP_TIMEOUT_MS } from '../config/defaults.ts';
import { redactSecrets } from '../shared/redact.ts';
import { fail, ok, type Result } from '../shared/result.ts';

export type Filter = readonly [column: string, op: 'eq' | 'lt' | 'gte' | 'like', value: string | number];
export type Db = ReturnType<typeof createDb>;

const encodeFilters = (filters: readonly Filter[]) =>
  filters.map(([c, op, v]) => `${encodeURIComponent(c)}=${op}.${encodeURIComponent(String(v))}`).join('&');

export function createDb(url: string, secretKey: string, fetchImpl: typeof fetch = fetch) {
  async function request<T>(method: string, path: string, body?: unknown, prefer?: string): Promise<Result<T>> {
    try {
      const res = await fetchImpl(`${url}/rest/v1/${path}`, {
        method,
        headers: { apikey: secretKey, 'Content-Type': 'application/json', ...(prefer ? { Prefer: prefer } : {}) },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: AbortSignal.timeout(HTTP_TIMEOUT_MS),
      });
      const text = await res.text();
      if (!res.ok) return fail('E-DB-001', redactSecrets(`${method} ${path.split('?')[0]} ${res.status}: ${text.slice(0, 300)}`, [secretKey]));
      return ok((text ? JSON.parse(text) : null) as T);
    } catch (error) {
      return fail('E-DB-001', redactSecrets(`${method} ${path.split('?')[0]}: ${(error as Error).message}`, [secretKey]));
    }
  }
  return {
    /** Đọc dòng: chọn cột, lọc, sắp xếp, giới hạn số dòng (luôn có giới hạn). */
    select: <T>(table: string, opts: { columns?: string; filters?: readonly Filter[]; order?: string; limit?: number } = {}) => {
      const q = [`select=${encodeURIComponent(opts.columns ?? '*')}`, encodeFilters(opts.filters ?? []),
        opts.order ? `order=${encodeURIComponent(opts.order)}` : '', `limit=${opts.limit ?? 100}`].filter(Boolean).join('&');
      return request<T[]>('GET', `${table}?${q}`);
    },
    insert: (table: string, rows: unknown) => request<null>('POST', table, rows, 'return=minimal'),
    /** Thêm; trùng khóa chính → lỗi (dùng làm khóa chống chạy chồng). Trả true nếu thêm được. */
    async insertOnce(table: string, row: unknown): Promise<Result<boolean>> {
      const r = await request<null>('POST', table, row, 'return=minimal');
      if (r.ok) return ok(true);
      return /\b409\b|23505/.test(r.error.detail ?? '') ? ok(false) : r;
    },
    upsert: (table: string, rows: unknown, onConflict: string) =>
      request<null>('POST', `${table}?on_conflict=${encodeURIComponent(onConflict)}`, rows, 'resolution=merge-duplicates,return=minimal'),
    /** Xóa BẮT BUỘC có bộ lọc (không bao giờ xóa cả bảng do quên điều kiện). */
    remove: (table: string, filters: readonly Filter[]) =>
      filters.length === 0 ? Promise.resolve(fail<null>('E-DB-001', 'remove thiếu bộ lọc')) : request<null>('DELETE', `${table}?${encodeFilters(filters)}`, undefined, 'return=minimal'),
  };
}
