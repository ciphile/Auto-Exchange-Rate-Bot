// Gọi Gemini 1 model, 1 lần (tài liệu gọi AI của Khang mục 13.2, 13.5). REST chuẩn, KHÔNG SDK.
// Key ở header `x-goog-api-key`, không trong URL; che key ở mọi chuỗi lỗi (Bẫy 44).
// Chỉ gửi tham số tối thiểu: KHÔNG gửi cấu hình "suy nghĩ", KHÔNG temperature (Bẫy 42). Đọc bỏ phần "thought".
import { redactSecrets } from '../shared/redact.ts';

export const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
// Tài liệu của Khang: 60 giây; ở đây 25 giây vì cả lượt webhook trên Vercel chỉ có 60 giây (vercel.json maxDuration).
export const AI_TIMEOUT_MS = 25_000;
export const AI_MAX_OUTPUT_TOKENS = 8192;

/** Kết quả 1 lần gọi, đã phân loại theo bảng 13.5. */
export type GeminiOutcome =
  | { kind: 'ok'; text: string; truncated: boolean }
  | { kind: 'empty'; reason: string } // SAFETY / RECITATION… → coi như lỗi model này, thử model kế
  | { kind: 'gone' } // 404 — model bị khai tử, nhớ 30 ngày
  | { kind: 'quota_day' } // 429 có "PerDay"
  | { kind: 'quota_minute' } // 429 khác
  | { kind: 'server' } // 500 / 503 / 504
  | { kind: 'bad_request'; detail: string } // 400 chung
  | { kind: 'key' } // 400 có "API key" / 401 / 403 — dừng hẳn
  | { kind: 'network'; detail: string };

/** Thân yêu cầu — tách riêng để test chặn ai thêm cấu hình "suy nghĩ" / temperature. */
export function buildGeminiBody(system: string, prompt: string) {
  return {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    systemInstruction: { parts: [{ text: system }] },
    generationConfig: { maxOutputTokens: AI_MAX_OUTPUT_TOKENS },
  };
}

type Part = { text?: unknown; thought?: unknown };
/** Ghép các parts[].text, bỏ phần thought. */
export function readGeminiText(json: unknown): { text: string; finishReason: string } {
  const cand = (json as { candidates?: { content?: { parts?: Part[] }; finishReason?: string }[] })?.candidates?.[0];
  const parts = cand?.content?.parts ?? [];
  const text = parts.filter((p) => p.thought !== true && typeof p.text === 'string').map((p) => p.text as string).join('').trim();
  return { text, finishReason: cand?.finishReason ?? 'UNKNOWN' };
}

export function classifyGeminiError(status: number, body: string): GeminiOutcome {
  if (status === 404) return { kind: 'gone' };
  if (status === 401 || status === 403 || (status === 400 && /api key/i.test(body))) return { kind: 'key' };
  if (status === 429) return /PerDay/i.test(body) ? { kind: 'quota_day' } : { kind: 'quota_minute' };
  if (status >= 500) return { kind: 'server' };
  return { kind: 'bad_request', detail: `${status}: ${body.slice(0, 200)}` };
}

export async function callGeminiModel(model: string, system: string, prompt: string, apiKey: string, fetchImpl: typeof fetch = fetch): Promise<GeminiOutcome> {
  try {
    const res = await fetchImpl(`${GEMINI_BASE}/${encodeURIComponent(model)}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify(buildGeminiBody(system, prompt)),
      signal: AbortSignal.timeout(AI_TIMEOUT_MS),
    });
    const body = await res.text();
    if (!res.ok) {
      const c = classifyGeminiError(res.status, body);
      return c.kind === 'bad_request' ? { ...c, detail: redactSecrets(c.detail, [apiKey]) } : c;
    }
    const { text, finishReason } = readGeminiText(JSON.parse(body));
    if (!text) return { kind: 'empty', reason: finishReason };
    return { kind: 'ok', text, truncated: finishReason === 'MAX_TOKENS' };
  } catch (error) {
    return { kind: 'network', detail: redactSecrets((error as Error).message, [apiKey]) };
  }
}
