// F-04 / BR-30: lấy giá ngay theo yêu cầu — xác định NGUỒN nào được đọc. Hàm thuần, không gọi mạng.
// AI chỉ chọn action `lay_ty_gia_ngay` + tham số `nguon`; code kiểm tham số và quyết định đọc nguồn nào.
import { LIVE_FETCH_COOLDOWN_MS, LIVE_SOURCE_FOR_ANY, SOURCE_QUESTION_TTL_MS } from '../config/defaults.ts';

export type LiveSource = 'wise' | 'vcb' | 'vpbank';
export const LIVE_SOURCES: readonly LiveSource[] = ['wise', 'vcb', 'vpbank'];

/** Người dùng muốn nguồn nào: nêu tên cụ thể · "tất cả" · "tùy mày / nguồn nào cũng được". */
export type SourceChoice =
  | { kind: 'named'; sources: LiveSource[] }
  | { kind: 'all' }
  | { kind: 'any' };

/** Kế hoạch đọc: đọc các nguồn · hỏi lại · nguồn được hỏi đang bị Khang tắt. */
export type LivePlan =
  | { kind: 'fetch'; sources: LiveSource[]; skipped: LiveSource[]; choice: SourceChoice['kind'] }
  | { kind: 'ask' }
  | { kind: 'disabled'; requested: LiveSource[]; enabled: LiveSource[] };

const isLiveSource = (v: unknown): v is LiveSource => typeof v === 'string' && (LIVE_SOURCES as readonly string[]).includes(v);

/**
 * BR-30: kiểm tham số `nguon` AI trả về. Nhận: "wise" | "vcb" | "vpbank" | "tat_ca" | "tuy_bot" | mảng tên nguồn | null.
 * Giá trị lạ → null (coi như thiếu nguồn → hỏi lại), không bao giờ đoán bừa.
 */
export function parseSourceParam(raw: unknown): SourceChoice | null {
  if (raw === 'tat_ca') return { kind: 'all' };
  if (raw === 'tuy_bot') return { kind: 'any' };
  const list = Array.isArray(raw) ? raw : [raw];
  if (list.length === 0 || !list.every(isLiveSource)) return null;
  return { kind: 'named', sources: [...new Set(list)] };
}

// Ranh giới từ cho chữ Việt có dấu (\b của JS không hiểu chữ có dấu).
const word = (body: string) => new RegExp(`(?<![\\p{L}\\p{N}])(?:${body})(?![\\p{L}\\p{N}])`, 'iu');
const SOURCE_PATTERNS: Record<LiveSource, RegExp> = {
  wise: word('wise|wai'),
  vcb: word('vcb|vietcombank|vietcom|việt\\s?com(?:\\s?bank)?|viet\\s?com(?:\\s?bank)?'),
  vpbank: word('vp\\s?bank|vpb|vp'),
};
const ALL_PATTERN = word('tất cả|tat ca|cả 3|cả ba|ca 3|ca ba|3 nguồn|ba nguồn|3 nguon|ba nguon|mọi nguồn|moi nguon|lấy hết|lay het|hết luôn|het luon|hết đi|het di|all');
// "tuy" không dấu dễ là "tuy nhiên" → chỉ nhận "tuy may / tuy m" (Bẫy 16).
const ANY_PATTERN = word('tùy|tuỳ|tuy may|tuy m|nào cũng được|nao cung duoc|sao cũng được|sao cung duoc|gì cũng được|gi cung duoc|cái nào cũng được|any|bất kỳ|bất kì|bat ky|bat ki');
// Có ý loại trừ ("trừ VCB", "không lấy Wise") → để AI hiểu, luật không đoán.
const EXCLUDE_PATTERN = word('trừ|tru|không lấy|khong lay|khỏi|bỏ|bo qua|đừng|dung lay|ngoại trừ');

/**
 * "Luật trước, AI sau": đọc câu trả lời ngắn cho câu hỏi "lấy nguồn nào?" bằng từ khóa.
 * Rõ ràng → trả lựa chọn (không cần gọi AI). Mơ hồ / mâu thuẫn / có ý loại trừ → null (để AI chọn tham số).
 */
export function matchSourceKeywords(text: string): SourceChoice | null {
  const t = text.normalize('NFC').toLowerCase();
  if (EXCLUDE_PATTERN.test(t)) return null;
  const named = LIVE_SOURCES.filter((s) => SOURCE_PATTERNS[s].test(t));
  const all = ALL_PATTERN.test(t);
  const any = ANY_PATTERN.test(t);
  if (all && !any) return { kind: 'all' };
  if (any && !all && named.length === 0) return { kind: 'any' };
  if (named.length > 0 && !all && !any) return { kind: 'named', sources: named };
  return null;
}

/**
 * BR-30: từ lựa chọn + danh sách nguồn Khang đang bật (`/nguon`) → kế hoạch đọc.
 * Thiếu nguồn → hỏi lại · "tùy mày" → nguồn chuẩn (Wise, BR-05), Wise tắt thì nguồn bật đầu tiên ·
 * "tất cả" → mọi nguồn đang bật · nêu tên → các nguồn đó (nguồn đang tắt ghi vào `skipped`).
 */
export function planLiveFetch(choice: SourceChoice | null, enabled: readonly LiveSource[]): LivePlan {
  if (choice === null) return { kind: 'ask' };
  const on = LIVE_SOURCES.filter((s) => enabled.includes(s));
  if (choice.kind === 'all') {
    return on.length > 0 ? { kind: 'fetch', sources: on, skipped: [], choice: 'all' } : { kind: 'disabled', requested: [...LIVE_SOURCES], enabled: on };
  }
  if (choice.kind === 'any') {
    const pick = on.includes(LIVE_SOURCE_FOR_ANY) ? LIVE_SOURCE_FOR_ANY : on[0];
    return pick ? { kind: 'fetch', sources: [pick], skipped: [], choice: 'any' } : { kind: 'disabled', requested: [LIVE_SOURCE_FOR_ANY], enabled: on };
  }
  const sources = choice.sources.filter((s) => on.includes(s));
  const skipped = choice.sources.filter((s) => !on.includes(s));
  return sources.length > 0 ? { kind: 'fetch', sources, skipped, choice: 'named' } : { kind: 'disabled', requested: choice.sources, enabled: on };
}

/** BR-30: nguồn vừa đọc trong 5 phút → dùng lại kết quả cũ (kèm giờ đọc), không đọc lại. */
export function canFetchLiveNow(lastFetchedAt: number | null, now: Date): boolean {
  return lastFetchedAt === null || now.getTime() - lastFetchedAt >= LIVE_FETCH_COOLDOWN_MS;
}

/** BR-30: câu hỏi "lấy nguồn nào?" còn hiệu lực (người dùng trả lời trong 10 phút thì hiểu là trả lời câu đó). */
export function isSourceQuestionOpen(askedAt: number | null, now: Date): boolean {
  return askedAt !== null && now.getTime() - askedAt <= SOURCE_QUESTION_TTL_MS;
}
