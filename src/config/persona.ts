// BR-31 → BR-34: tham số tính cách + tâm trạng — dùng cho CẢ 2 BOT (Rây, Lũi); mỗi bot bộ số riêng (con số; câu chữ mô tả giọng ở src/shared/persona.vi.ts).
// TÍNH CÁCH quyết định NÓI GÌ / KHI NÀO (phản biện, chọt, hay chen chuyện). TÂM TRẠNG quyết định NÓI THẾ NÀO
// (dài / cộc, emoji, độ hài) và nắn nhẹ việc nói gì. Code nhân 2 bộ hệ số → "chỉ thị nói" gửi AI (style.service.ts).

import type { BotKey } from '../domain/telegram.ts';

/** Mã tâm trạng (lệnh `/tamtrang <mã>`, không dấu). `baton` = không ổn định / hay xỏ lá chọt khe: mỗi lần nói code bốc 1 tâm trạng. */
export const MOOD_CODES = [
  'binhthuong', 'vuive', 'thoaimai', 'haihuoc', 'sieuhaihuoc', 'sieubua', 'khinkhin',
  'nghiemtuc', 'hoicang', 'stress', 'coccan', 'tramtinh', 'tucgian', 'baton',
] as const;
export type MoodCode = (typeof MOOD_CODES)[number];
export type StableMood = Exclude<MoodCode, 'baton'>;

export type MoodProfile = {
  profanityOk: boolean; // BR-38: tâm trạng này có được nói tục (trong giới hạn của /noituc) không
  words: readonly [number, number]; // độ dài gợi ý (số chữ) cho 1 câu trả lời thường
  maxSentences: number;
  emojiMax: number;
  humor: 0 | 1 | 2 | 3; // 0 không đùa · 3 đùa hết cỡ
  rebuttal: number; // hệ số nhân xác suất phản biện
  poke: number; // hệ số nhân xác suất chọt / xỏ lá
  chime: number; // hệ số nhân xác suất tự chen chuyện (BR-18)
};

// Kat chốt Mode 2 (25/11/2026) — Khang chỉnh được. Cộc cằn: 2–10 chữ, 1 câu; siêu bựa: dài, nhiều emoji, chọt mạnh.
export const MOOD_PROFILES: Record<StableMood, MoodProfile> = {
  binhthuong: { profanityOk: true, words: [10, 35], maxSentences: 3, emojiMax: 1, humor: 1, rebuttal: 1, poke: 1, chime: 1 },
  vuive: { profanityOk: true, words: [12, 40], maxSentences: 3, emojiMax: 2, humor: 2, rebuttal: 0.9, poke: 1.1, chime: 1.15 },
  thoaimai: { profanityOk: true, words: [10, 35], maxSentences: 3, emojiMax: 1, humor: 1, rebuttal: 0.8, poke: 0.9, chime: 1 },
  haihuoc: { profanityOk: true, words: [12, 40], maxSentences: 3, emojiMax: 2, humor: 2, rebuttal: 1, poke: 1.2, chime: 1.15 },
  sieuhaihuoc: { profanityOk: true, words: [15, 50], maxSentences: 4, emojiMax: 3, humor: 3, rebuttal: 1, poke: 1.3, chime: 1.25 },
  sieubua: { profanityOk: true, words: [15, 50], maxSentences: 4, emojiMax: 3, humor: 3, rebuttal: 1.1, poke: 1.5, chime: 1.3 },
  khinkhin: { profanityOk: true, words: [8, 40], maxSentences: 4, emojiMax: 2, humor: 3, rebuttal: 1.1, poke: 1.2, chime: 1.2 },
  nghiemtuc: { profanityOk: false, words: [15, 50], maxSentences: 4, emojiMax: 0, humor: 0, rebuttal: 0.8, poke: 0.2, chime: 0.8 },
  hoicang: { profanityOk: true, words: [6, 20], maxSentences: 2, emojiMax: 0, humor: 0, rebuttal: 1.1, poke: 0.6, chime: 0.8 },
  stress: { profanityOk: true, words: [4, 18], maxSentences: 2, emojiMax: 0, humor: 0, rebuttal: 0.9, poke: 0.4, chime: 0.6 },
  coccan: { profanityOk: true, words: [2, 10], maxSentences: 1, emojiMax: 0, humor: 0, rebuttal: 1.2, poke: 0.8, chime: 0.7 },
  tramtinh: { profanityOk: false, words: [10, 30], maxSentences: 3, emojiMax: 0, humor: 1, rebuttal: 0.6, poke: 0.3, chime: 0.6 },
  tucgian: { profanityOk: true, words: [4, 20], maxSentences: 2, emojiMax: 1, humor: 0, rebuttal: 1.5, poke: 1, chime: 0.9 },
};

/** `baton`: mỗi lần nói bốc 1 tâm trạng theo trọng số; chọt mạnh hơn (×1,5) vì "hay xỏ lá chọt khe". */
export const UNSTABLE_MOOD_POOL: readonly { mood: StableMood; weight: number }[] = [
  { mood: 'vuive', weight: 2 }, { mood: 'khinkhin', weight: 2 }, { mood: 'coccan', weight: 2 },
  { mood: 'hoicang', weight: 1 }, { mood: 'tucgian', weight: 1 }, { mood: 'sieubua', weight: 2 },
];
export const UNSTABLE_POKE_BOOST = 1.5;
export const UNSTABLE_CHIME_FACTOR = 1.1;

/** Tính cách chỉ BẬT / TẮT (BR-31). Rây: bật = xỏ lá, tắt = ngoan. Lũi: chờ Khang (tạm dùng số của Rây). */
export type PersonaMode = 'on' | 'off';
/** terseChance: xác suất lần này nói CỤT 1 câu ngắn (Khang 25/11/2026: bật tính cách thì "nhiều khi ngắn cũn"). */
export type PersonaProfile = { rebuttalBase: number; pokeBase: number; chime: number; wordsFactor: number; politeEmojiCap: boolean; terseChance: number };
const RAY_PERSONA: Record<PersonaMode, PersonaProfile> = {
  // on: nói ngắn, cộc, hay cụt (Khang 25/11/2026) — wordsFactor 0,85 + 45% lần nói CỤT.
  on: { rebuttalBase: 0.55, pokeBase: 0.35, chime: 1.3, wordsFactor: 0.85, politeEmojiCap: false, terseChance: 0.45 },
  off: { rebuttalBase: 0.08, pokeBase: 0, chime: 0.8, wordsFactor: 1, politeEmojiCap: true, terseChance: 0 },
};
export const PERSONA_PROFILES: Record<BotKey, Record<PersonaMode, PersonaProfile>> = {
  ray: RAY_PERSONA,
  lui: RAY_PERSONA, // TẠM — Khang gửi tính cách Lũi sau (STATUS)
};
/** Bot nào chưa có tính cách riêng (khối STYLE ghi rõ "tạm"). */
export const PERSONA_PENDING: Record<BotKey, boolean> = { ray: false, lui: true };
export const MAX_REBUTTAL_PROBABILITY = 0.9;
export const MAX_POKE_PROBABILITY = 0.7;
/** Tính cách tắt (politeEmojiCap): emoji tối đa (dễ thương, không spam), bất kể tâm trạng. */
export const POLITE_EMOJI_MAX = 1;
/** Câu CỤT: số chữ + số câu. */
export const TERSE_WORDS: readonly [number, number] = [2, 12];

/** Độ dài theo mục đích lời nói (nhân vào khoảng chữ của tâm trạng). Tóm tắt cho Khang có độ dài riêng. */
export const PURPOSE_LENGTH_FACTOR = { answer_data: 1, answer_chat: 1, chime_in: 0.7, rate_report: 0.8, rate_alert: 0.8, reminder: 0.8 } as const;
export const SUMMARY_WORDS: readonly [number, number] = [60, 250];
/** Đầu ra AI dài quá (số chữ > tối đa × hệ số này) → code cắt ở cuối câu gần nhất. */
export const STYLE_HARD_LENGTH_FACTOR = 1.6;

export const DEFAULT_PERSONA_ON: Record<BotKey, boolean> = { ray: false, lui: false }; // BR-31: mặc định NGOAN (Khang 25/11/2026)
export const DEFAULT_MOOD: MoodCode = 'binhthuong';
/** BR-27 + BR-31: xưng hô mặc định. Bật tính cách → theo lệnh /xungho (mặc định dưới); tắt → luôn lễ phép. */
export const DEFAULT_ADDRESS: Record<BotKey, Record<PersonaMode, { self: string; others: string }>> = {
  ray: { on: { self: 'tui', others: 'mấy ông mấy bà' }, off: { self: 'em', others: 'anh chị' } },
  lui: { on: { self: 'tui', others: 'mấy ông mấy bà' }, off: { self: 'em', others: 'anh chị' } }, // TẠM — chờ Khang
};

/**
 * BR-38: nói tục có giới hạn (`/noituc 0..3`, mặc định 0). Tắt tính cách (ngoan) → luôn 0.
 * Từ CẤM TUYỆT ĐỐI (tục tĩu tình dục, chửi thẳng vào người) không bao giờ được, ở mọi mức.
 */
export type ProfanityLevel = 0 | 1 | 2 | 3;
export const PROFANITY_LEVELS: Record<ProfanityLevel, { tiers: readonly ('nhe' | 'vua')[]; perMessage: number; perDay: number }> = {
  0: { tiers: [], perMessage: 0, perDay: 0 },
  1: { tiers: ['nhe'], perMessage: 1, perDay: 3 },
  2: { tiers: ['nhe', 'vua'], perMessage: 1, perDay: 5 },
  3: { tiers: ['nhe', 'vua'], perMessage: 2, perDay: 8 },
};
export const DEFAULT_PROFANITY_LEVEL: ProfanityLevel = 0;
