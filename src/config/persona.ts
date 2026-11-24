// BR-31 → BR-34: tham số tính cách + tâm trạng (con số; câu chữ mô tả giọng ở src/shared/persona.vi.ts).
// TÍNH CÁCH quyết định NÓI GÌ / KHI NÀO (phản biện, chọt, hay chen chuyện). TÂM TRẠNG quyết định NÓI THẾ NÀO
// (dài / cộc, emoji, độ hài) và nắn nhẹ việc nói gì. Code nhân 2 bộ hệ số → "chỉ thị nói" gửi AI (style.service.ts).

/** Mã tâm trạng (lệnh `/tamtrang <mã>`, không dấu). `baton` = không ổn định / hay xỏ lá chọt khe: mỗi lần nói code bốc 1 tâm trạng. */
export const MOOD_CODES = [
  'binhthuong', 'vuive', 'thoaimai', 'haihuoc', 'sieuhaihuoc', 'sieubua', 'khinkhin',
  'nghiemtuc', 'hoicang', 'stress', 'coccan', 'tramtinh', 'tucgian', 'baton',
] as const;
export type MoodCode = (typeof MOOD_CODES)[number];
export type StableMood = Exclude<MoodCode, 'baton'>;

export type MoodProfile = {
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
  binhthuong: { words: [10, 35], maxSentences: 3, emojiMax: 1, humor: 1, rebuttal: 1, poke: 1, chime: 1 },
  vuive: { words: [12, 40], maxSentences: 3, emojiMax: 2, humor: 2, rebuttal: 0.9, poke: 1.1, chime: 1.15 },
  thoaimai: { words: [10, 35], maxSentences: 3, emojiMax: 1, humor: 1, rebuttal: 0.8, poke: 0.9, chime: 1 },
  haihuoc: { words: [12, 40], maxSentences: 3, emojiMax: 2, humor: 2, rebuttal: 1, poke: 1.2, chime: 1.15 },
  sieuhaihuoc: { words: [15, 50], maxSentences: 4, emojiMax: 3, humor: 3, rebuttal: 1, poke: 1.3, chime: 1.25 },
  sieubua: { words: [15, 50], maxSentences: 4, emojiMax: 3, humor: 3, rebuttal: 1.1, poke: 1.5, chime: 1.3 },
  khinkhin: { words: [8, 40], maxSentences: 4, emojiMax: 2, humor: 3, rebuttal: 1.1, poke: 1.2, chime: 1.2 },
  nghiemtuc: { words: [15, 50], maxSentences: 4, emojiMax: 0, humor: 0, rebuttal: 0.8, poke: 0.2, chime: 0.8 },
  hoicang: { words: [6, 20], maxSentences: 2, emojiMax: 0, humor: 0, rebuttal: 1.1, poke: 0.6, chime: 0.8 },
  stress: { words: [4, 18], maxSentences: 2, emojiMax: 0, humor: 0, rebuttal: 0.9, poke: 0.4, chime: 0.6 },
  coccan: { words: [2, 10], maxSentences: 1, emojiMax: 0, humor: 0, rebuttal: 1.2, poke: 0.8, chime: 0.7 },
  tramtinh: { words: [10, 30], maxSentences: 3, emojiMax: 0, humor: 1, rebuttal: 0.6, poke: 0.3, chime: 0.6 },
  tucgian: { words: [4, 20], maxSentences: 2, emojiMax: 1, humor: 0, rebuttal: 1.5, poke: 1, chime: 0.9 },
};

/** `baton`: mỗi lần nói bốc 1 tâm trạng theo trọng số; chọt mạnh hơn (×1,5) vì "hay xỏ lá chọt khe". */
export const UNSTABLE_MOOD_POOL: readonly { mood: StableMood; weight: number }[] = [
  { mood: 'vuive', weight: 2 }, { mood: 'khinkhin', weight: 2 }, { mood: 'coccan', weight: 2 },
  { mood: 'hoicang', weight: 1 }, { mood: 'tucgian', weight: 1 }, { mood: 'sieubua', weight: 2 },
];
export const UNSTABLE_POKE_BOOST = 1.5;
export const UNSTABLE_CHIME_FACTOR = 1.1;

export type PersonaKey = 'xola' | 'ngoan';
/** Tính cách bật (`xola`: xỏ lá, lý sự, hay phản biện, nói nhiều) / tắt (`ngoan`: nữ sinh lớp 10 ngoan, dạ thưa). */
export const PERSONA_PROFILES: Record<PersonaKey, { rebuttalBase: number; pokeBase: number; chime: number; wordsFactor: number }> = {
  xola: { rebuttalBase: 0.55, pokeBase: 0.35, chime: 1.3, wordsFactor: 1.25 },
  ngoan: { rebuttalBase: 0.08, pokeBase: 0, chime: 0.8, wordsFactor: 1 },
};
export const MAX_REBUTTAL_PROBABILITY = 0.9;
export const MAX_POKE_PROBABILITY = 0.7;
/** Ngoan: emoji tối đa (dễ thương, không spam), bất kể tâm trạng. */
export const POLITE_EMOJI_MAX = 1;

/** Độ dài theo mục đích lời nói (nhân vào khoảng chữ của tâm trạng). Tóm tắt cho Khang có độ dài riêng. */
export const PURPOSE_LENGTH_FACTOR = { answer_data: 1, answer_chat: 1, chime_in: 0.7, rate_report: 0.8, rate_alert: 0.8 } as const;
export const SUMMARY_WORDS: readonly [number, number] = [60, 250];
/** Đầu ra AI dài quá (số chữ > tối đa × hệ số này) → code cắt ở cuối câu gần nhất. */
export const STYLE_HARD_LENGTH_FACTOR = 1.6;

export const DEFAULT_PERSONA_ON = true; // BR-31: Rây mặc định bật tính cách xỏ lá (Kat chốt Mode 2)
export const DEFAULT_MOOD: MoodCode = 'binhthuong';
/** BR-27 + BR-31: xưng hô mặc định. Bật tính cách → theo lệnh /xungho (mặc định dưới); tắt → luôn lễ phép. */
export const DEFAULT_ADDRESS = {
  xola: { self: 'tui', others: 'mấy ông mấy bà' },
  ngoan: { self: 'em', others: 'anh chị' },
} as const;
