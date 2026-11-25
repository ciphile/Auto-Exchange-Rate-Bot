// BR-29 + CODING_STANDARDS 6.10 ("AI không bao giờ quyết con số"): code tính quy đổi; code kiểm MỌI con số lớn trong lời AI
// phải có sẵn trong dữ liệu code đưa (prompt) hoặc trong câu người hỏi — số lạ = AI bịa → bỏ lời AI, dùng câu soạn sẵn.
import { describeRateSource, convertSgdToVnd, convertVndToSgdCents, estimateBlackMarketVnd, type RateSource } from './rate.service.ts';

export const GUARD_MIN_NUMBER = 1000; // số nhỏ hơn (ngày, %, giờ) không kiểm
export const MAX_CONVERT_SGD = 10_000_000;
export const MAX_CONVERT_VND = 100_000_000_000;

/** Số ≥ 1000 trong chữ: "19.950" · "19,950" · "20.030.000" · "19950" → [19950, 20030000…]. */
export function extractBigNumbers(text: string): number[] {
  return [...text.matchAll(/\d{1,3}(?:[.,]\d{3})+(?![.,]?\d)|\d{4,}/g)]
    .map((m) => Number(m[0].replace(/[.,]/g, '')))
    .filter((n) => Number.isFinite(n) && n >= GUARD_MIN_NUMBER);
}

/** Số lớn trong lời AI mà không có trong dữ liệu được phép → trả danh sách số lạ (rỗng = đạt). */
export function findUnknownNumbers(reply: string, allowedSources: readonly string[]): number[] {
  const allowed = new Set(allowedSources.flatMap(extractBigNumbers));
  return extractBigNumbers(reply).filter((n) => !allowed.has(n));
}

const parseAmount = (raw: string): number | null => {
  const t = raw.trim();
  const n = /^\d{1,3}(\.\d{3})+$/.test(t) ? Number(t.replace(/\./g, '')) : Number(t.replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
};

export type AmountQuestion = { kind: 'sgd'; sgdCents: number } | { kind: 'vnd'; vnd: number };

/** Câu hỏi có số tiền cần quy đổi: "1000 đô", "2.5k sgd", "1.500 sing" → SGD · "50 triệu", "20tr" → VND. */
export function parseAmountQuestion(text: string): AmountQuestion | null {
  const sgd = /(\d[\d.,]*)\s*(k|nghìn|ngàn)?\s*(sgd|s\$|đô sing|đô singapore|đô|sing)(?![\p{L}])/iu.exec(text);
  if (sgd) {
    const base = parseAmount(sgd[1] ?? '');
    const v = base === null ? null : base * (sgd[2] ? 1000 : 1);
    if (v !== null && v <= MAX_CONVERT_SGD) return { kind: 'sgd', sgdCents: Math.round(v * 100) };
  }
  const vnd = /(\d[\d.,]*)\s*(triệu|tr|củ)(?![\p{L}])/iu.exec(text);
  if (vnd) {
    const base = parseAmount(vnd[1] ?? '');
    const v = base === null ? null : Math.round(base * 1_000_000);
    if (v !== null && v <= MAX_CONVERT_VND) return { kind: 'vnd', vnd: v };
  }
  return null;
}

const vnd = (n: number) => n.toLocaleString('vi-VN');
const sgdText = (cents: number) => (cents / 100).toLocaleString('vi-VN', { maximumFractionDigits: 2 });

/** Dòng bối cảnh quy đổi do CODE tính (Wise + chợ đen ước tính) — AI chỉ đọc lại. */
export function buildConversionFact(q: AmountQuestion, rateVnd: number, source: RateSource, fetchedAt: Date): string {
  const src = describeRateSource(source, fetchedAt);
  const black = estimateBlackMarketVnd(rateVnd);
  if (q.kind === 'sgd') {
    return `QUY ĐỔI (code tính, ${src}): ${sgdText(q.sgdCents)} SGD ≈ ${vnd(convertSgdToVnd(q.sgdCents, rateVnd))} đ theo Wise; theo chợ đen ước tính ≈ ${vnd(convertSgdToVnd(q.sgdCents, black))} đ. Chỉ dùng đúng các số này.`;
  }
  return `QUY ĐỔI (code tính, ${src}): ${vnd(q.vnd)} đ ≈ ${sgdText(convertVndToSgdCents(q.vnd, rateVnd))} SGD theo Wise. Chỉ dùng đúng các số này.`;
}
