// Hàm DUY NHẤT gọi AI (tài liệu gọi AI của Khang mục 13; CODING_STANDARDS 6.10a). Mọi nơi khác gọi qua generate().
// Thứ tự model, gạch model chết / hết lượt, xử lý từng mã lỗi, nghỉ 3 tiếng khi mọi model hết lượt ngày, log mọi lần gọi.
import type { GeminiOutcome } from '../adapters/gemini.adapter.ts';
import { fail, ok, type Result } from '../shared/result.ts';

/** Mục 13.4: nhóm lite trước, rồi nhóm flash; tên `-latest` đứng đầu mỗi nhóm. Không dùng `pro`. */
export const MODEL_ORDER: readonly { model: string; group: 'lite' | 'flash' }[] = [
  { model: 'gemini-flash-lite-latest', group: 'lite' }, { model: 'gemini-2.5-flash-lite', group: 'lite' },
  { model: 'gemini-2.0-flash-lite', group: 'lite' }, { model: 'gemini-flash-latest', group: 'flash' },
  { model: 'gemini-2.5-flash', group: 'flash' }, { model: 'gemini-2.0-flash', group: 'flash' },
];
export const MAX_MODELS_TRIED = 6;
export const MAX_BAD_REQUEST_MODELS = 3;
export const SERVER_RETRIES = 3;
export const SERVER_RETRY_WAIT_MS = 5_000;
export const GONE_REMEMBER_MS = 30 * 24 * 3600_000;
export const OFFLINE_AFTER_DAILY_QUOTA_MS = 3 * 3600_000;
export const QUOTA_RESET_UTC_HOUR = 8; // 0h giờ Thái Bình Dương ≈ 15:00 giờ VN
export const MODEL_LIST_TTL_MS = 30 * 24 * 3600_000; // dò lại danh sách model sau 30 ngày
export const MODEL_LIST_RETRY_MS = 24 * 3600_000; // dò lỗi → thử lại sau 1 ngày (giữ danh sách cũ)
export const DISCOVERED_KEEP = 8;
const EXCLUDED_MODEL_WORDS = ['embedding', 'tts', 'image', 'audio', 'live', 'veo', 'imagen', 'aqa', 'gemma', 'robotics', 'computer-use', 'pro'];
export const CONTEXT_HEAD = 'BỐI CẢNH (bạn không có trí nhớ giữa các lần gọi, mọi thông tin cần thiết đều nằm dưới đây):';

/** "Trí nhớ" model (mục 13.6) — lưu database, tự dọn mục hết hạn khi đọc. */
export type AiModelState = {
  gone: Record<string, number>; quotaUntil: Record<string, number>; offlineUntil: number | null; lastModel: string | null;
  /** Mục 13.4: model Google liệt kê (đã lọc + xếp hạng) và lúc dò. */
  discovered?: string[]; discoveredAt?: number;
};
export const EMPTY_AI_STATE: AiModelState = { gone: {}, quotaUntil: {}, offlineUntil: null, lastModel: null };

export type AiCallLog = { purpose: string; model: string | null; ok: boolean; error: string | null; ms: number; prompt: string; reply: string | null };
export type AiDeps = {
  callModel: (model: string, system: string, prompt: string) => Promise<GeminiOutcome>;
  /** GET danh sách model (không tốn quota); null = lỗi. Không truyền = không dò. */
  listModels?: () => Promise<string[] | null>;
  loadState: () => Promise<AiModelState>;
  saveState: (s: AiModelState) => Promise<void>;
  log: (entry: AiCallLog) => Promise<void>;
  sleep: (ms: number) => Promise<void>;
  now: () => Date;
};

/** Mốc reset quota ngày kế tiếp (08:00 UTC). */
export function getQuotaResetAfter(now: Date): number {
  const r = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), QUOTA_RESET_UTC_HOUR));
  return r.getTime() > now.getTime() ? r.getTime() : r.getTime() + 24 * 3600_000;
}

/** Bỏ mục hết hạn (tự dọn khi đọc — Bẫy 31). */
export function pruneAiState(s: AiModelState, t: number): AiModelState {
  const keep = (o: Record<string, number>) => Object.fromEntries(Object.entries(o).filter(([, until]) => until > t));
  return { ...s, gone: keep(s.gone), quotaUntil: keep(s.quotaUntil), offlineUntil: s.offlineUntil && s.offlineUntil > t ? s.offlineUntil : null };
}

const versionOf = (name: string) => Number(/gemini-(\d+(?:\.\d+)?)/.exec(name)?.[1] ?? 0);
const groupOf = (name: string): 'lite' | 'flash' | null => (name.includes('flash-lite') ? 'lite' : name.includes('flash') ? 'flash' : null);

/** Mục 13.4: lọc + xếp hạng model Google liệt kê — lite trước flash; ổn định trước preview / exp / beta; bản mới trước. Không dùng `pro`. */
export function rankDiscoveredModels(names: readonly string[]): string[] {
  const rank = (n: string) => [groupOf(n) === 'lite' ? 0 : 1, /preview|exp|beta/.test(n) ? 1 : 0, -versionOf(n)] as const;
  return [...new Set(names)]
    .filter((n) => groupOf(n) !== null && !EXCLUDED_MODEL_WORDS.some((w) => n.includes(w)))
    .sort((a, b) => { const ra = rank(a); const rb = rank(b); return ra[0] - rb[0] || ra[1] - rb[1] || ra[2] - rb[2] || a.localeCompare(b); })
    .slice(0, DISCOVERED_KEEP);
}

/** Thứ tự thử: lite cố định → lite Google liệt kê → flash cố định → flash Google liệt kê (bỏ trùng). */
export function buildModelOrder(discovered: readonly string[] = []): { model: string; group: 'lite' | 'flash' }[] {
  const out: { model: string; group: 'lite' | 'flash' }[] = [];
  const add = (model: string, group: 'lite' | 'flash') => { if (!out.some((m) => m.model === model)) out.push({ model, group }); };
  for (const g of ['lite', 'flash'] as const) {
    for (const m of MODEL_ORDER) if (m.group === g) add(m.model, g);
    for (const n of discovered) if (groupOf(n) === g) add(n, g);
  }
  return out;
}

/** Danh sách đã cũ (> 30 ngày) → hỏi Google; lỗi → giữ danh sách cũ, thử lại sau 1 ngày. */
async function refreshDiscovered(deps: AiDeps, s: AiModelState, t: number): Promise<AiModelState> {
  if (!deps.listModels || (s.discoveredAt && t - s.discoveredAt < MODEL_LIST_TTL_MS)) return s;
  const names = await deps.listModels();
  if (!names) return { ...s, discoveredAt: t - MODEL_LIST_TTL_MS + MODEL_LIST_RETRY_MS };
  return { ...s, discovered: rankDiscoveredModels(names), discoveredAt: t };
}

/** Khối BỐI CẢNH luôn đứng đầu SYSTEM (nơi gọi quên thì hàm này tự gắn). */
export const ensureContextHead = (system: string) => (system.startsWith(CONTEXT_HEAD) ? system : `${CONTEXT_HEAD}\n${system}`);

/** Gọi AI: trả lời văn bản + model đã dùng; lỗi → mã E-AI-00x để nơi gọi dùng câu soạn sẵn (đường lui). */
export async function generate(deps: AiDeps, purpose: string, systemRaw: string, prompt: string): Promise<Result<{ text: string; model: string }>> {
  const started = deps.now().getTime();
  let state = await refreshDiscovered(deps, pruneAiState(await deps.loadState(), started), started);
  const system = ensureContextHead(systemRaw);
  const finish = async (r: Result<{ text: string; model: string }>, model: string | null, error: string | null) => {
    await deps.saveState(state);
    await deps.log({ purpose, model, ok: r.ok, error, ms: deps.now().getTime() - started, prompt: `${system}\n\n${prompt}`, reply: r.ok ? r.data.text : null });
    return r;
  };
  if (state.offlineUntil) return finish(fail('E-AI-001', 'đang nghỉ sau khi hết lượt ngày'), null, 'offline');

  const order = buildModelOrder(state.discovered);
  const candidates = order.filter((m) => !state.gone[m.model] && !state.quotaUntil[m.model]).slice(0, MAX_MODELS_TRIED);
  let badRequests = 0;
  let skipGroup: 'lite' | 'flash' | null = null;
  let serverGroupsFailed = 0;
  let lastError = 'không còn model dùng được';
  for (const { model, group } of candidates) {
    if (group === skipGroup) continue;
    let out = await deps.callModel(model, system, prompt);
    for (let i = 1; out.kind === 'server' && i < SERVER_RETRIES; i++) {
      await deps.sleep(SERVER_RETRY_WAIT_MS);
      out = await deps.callModel(model, system, prompt);
    }
    const t = deps.now().getTime();
    switch (out.kind) {
      case 'ok':
        state = { ...state, lastModel: model };
        return finish(ok({ text: out.text, model }), model, out.truncated ? 'MAX_TOKENS (dùng phần đã có)' : null);
      case 'key':
        return finish(fail('E-AI-002', `${model}: key bị từ chối`), model, 'key');
      case 'gone':
        state = { ...state, gone: { ...state.gone, [model]: t + GONE_REMEMBER_MS } }; lastError = `${model}: 404`; break;
      case 'quota_day':
        state = { ...state, quotaUntil: { ...state.quotaUntil, [model]: getQuotaResetAfter(deps.now()) } }; lastError = `${model}: hết lượt ngày`; break;
      case 'quota_minute': lastError = `${model}: giới hạn / phút`; break;
      case 'server':
        lastError = `${model}: máy chủ nghẽn`; skipGroup = group;
        if (++serverGroupsFailed >= 2) return finish(fail('E-AI-003', lastError), model, lastError);
        break;
      case 'bad_request':
        lastError = `${model}: ${out.detail}`;
        if (++badRequests >= MAX_BAD_REQUEST_MODELS) return finish(fail('E-AI-003', lastError), model, lastError);
        break;
      case 'empty': lastError = `${model}: trả rỗng (${out.reason})`; break;
      case 'network': lastError = `${model}: ${out.detail}`; break;
    }
  }
  // Mọi model còn lại đều hết lượt ngày → nghỉ 3 tiếng, không gọi mạng vô ích (mục 13.5).
  if (order.every((m) => state.gone[m.model] || state.quotaUntil[m.model])) {
    state = { ...state, offlineUntil: deps.now().getTime() + OFFLINE_AFTER_DAILY_QUOTA_MS };
    return finish(fail('E-AI-001', lastError), null, lastError);
  }
  return finish(fail('E-AI-003', lastError), null, lastError);
}
