// BR-31 → BR-34: tính cách + tâm trạng → "chỉ thị nói" gửi AI, và kiểm lời AI trả về. Hàm thuần.
// Theo tài liệu gọi AI của Khang mục 3.1: khối STYLE (ổn định theo cấu hình) nằm ở SYSTEM; phần đổi theo
// từng lần nói (lập trường bốc ngẫu nhiên, độ dài, emoji, tâm trạng bốc khi "không ổn định") nằm ở PROMPT.
import {
  DEFAULT_ADDRESS, MAX_POKE_PROBABILITY, MAX_REBUTTAL_PROBABILITY, MOOD_CODES, MOOD_PROFILES, PERSONA_PROFILES,
  POLITE_EMOJI_MAX, PURPOSE_LENGTH_FACTOR, STYLE_HARD_LENGTH_FACTOR, SUMMARY_WORDS, UNSTABLE_CHIME_FACTOR,
  UNSTABLE_MOOD_POOL, UNSTABLE_POKE_BOOST,
  type MoodCode, type PersonaKey, type StableMood,
} from '../config/persona.ts';
import {
  MOOD_TEXT, NORTHERN_REPLACEMENTS, NORTHERN_WATCH_WORDS, PERSONA_TEXT, PROFANITY_WORDS, SENSITIVE_TOPIC_WORDS,
  SOUTHERN_SPEECH_TEXT, STANCE_TEXT, type Stance,
} from '../shared/persona.vi.ts';

export type StyleSettings = { personaOn: boolean; mood: MoodCode };
export type Address = { self: string; others: string };
/** Mục đích lời nói: trả lời số liệu · trả lời trò chuyện / vĩ mô · tự chen · báo giá · cảnh báo · tóm tắt cho Khang. */
export type SpeechPurpose = 'answer_data' | 'answer_chat' | 'chime_in' | 'rate_report' | 'rate_alert' | 'daily_summary';

export type StyleDirective = {
  persona: PersonaKey;
  mood: MoodCode;
  effectiveMood: StableMood; // tâm trạng thật dùng lần này (baton → bốc ngẫu nhiên)
  stance: Stance;
  words: readonly [number, number];
  maxSentences: number;
  emojiMax: number;
  signature: string; // mã ngắn của chỉ thị — đưa vào log AI + khóa cache
};

const personaOf = (s: StyleSettings): PersonaKey => (s.personaOn ? 'xola' : 'ngoan');
const plain = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
const wordRe = (body: string, flags = 'iu') => new RegExp(`(?<![\\p{L}\\p{N}])(?:${body})(?![\\p{L}\\p{N}])`, flags);
const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const MOOD_ALIASES: Record<string, MoodCode> = {
  khongondinh: 'baton', xola: 'baton', chotkhe: 'baton', xolachotkhe: 'baton', cangthang: 'stress', didom: 'haihuoc', haihuocdidom: 'haihuoc',
};

/** `/tamtrang <mã>`: nhận mã không dấu hoặc chữ có dấu ("siêu bựa", "khìn khìn", "không ổn định"). Lạ → null. */
export function parseMood(input: string): MoodCode | null {
  const key = plain(input).replace(/[^a-z]/g, '');
  if ((MOOD_CODES as readonly string[]).includes(key)) return key as MoodCode;
  return MOOD_ALIASES[key] ?? null;
}

/** BR-27 + BR-31: tắt tính cách → luôn xưng hô lễ phép (em – anh chị); bật → theo /xungho (mặc định tui – mấy ông mấy bà). */
export function resolveAddress(settings: StyleSettings, configured: Address | null): Address {
  return settings.personaOn ? configured ?? DEFAULT_ADDRESS.xola : DEFAULT_ADDRESS.ngoan;
}

/** BR-25: chuyện chính trị trong nước → code ép lập trường trung lập. */
export function isSensitiveTopic(text: string): boolean {
  return wordRe(SENSITIVE_TOPIC_WORDS.map(escapeRe).join('|')).test(text.normalize('NFC'));
}

function pickUnstableMood(random: () => number): StableMood {
  const total = UNSTABLE_MOOD_POOL.reduce((sum, m) => sum + m.weight, 0);
  let r = random() * total;
  for (const m of UNSTABLE_MOOD_POOL) { r -= m.weight; if (r < 0) return m.mood; }
  return UNSTABLE_MOOD_POOL[0]?.mood ?? 'binhthuong';
}

/** BR-18 + BR-32: hệ số nhân xác suất tự chen chuyện theo tính cách × tâm trạng. */
export function getChimeFactor(settings: StyleSettings): number {
  const moodFactor = settings.mood === 'baton' ? UNSTABLE_CHIME_FACTOR : MOOD_PROFILES[settings.mood].chime;
  return PERSONA_PROFILES[personaOf(settings)].chime * moodFactor;
}

/** BR-33: tính cách quyết định NÓI GÌ — bốc lập trường theo xác suất (tính cách × tâm trạng). */
function pickStance(persona: PersonaKey, mood: StableMood, unstable: boolean, purpose: SpeechPurpose, sensitive: boolean, random: () => number): Stance {
  if (purpose === 'daily_summary') return 'tom_tat';
  if (sensitive) return 'trung_lap';
  if (purpose === 'rate_report' || purpose === 'rate_alert') return 'binh_luan_gia';
  const p = PERSONA_PROFILES[persona];
  const pPoke = Math.min(MAX_POKE_PROBABILITY, p.pokeBase * MOOD_PROFILES[mood].poke * (unstable ? UNSTABLE_POKE_BOOST : 1));
  if (purpose === 'answer_data') return random() < pPoke ? 'tra_loi_kem_choc' : 'tra_loi';
  const pRebut = Math.min(MAX_REBUTTAL_PROBABILITY, p.rebuttalBase * MOOD_PROFILES[mood].rebuttal);
  const r = random();
  if (r < pRebut) return 'phan_bien';
  if (r < pRebut + pPoke) return 'choc';
  return 'dong_y_gop_y';
}

/** BR-34: tính "chỉ thị nói" cho 1 lần gọi AI (code tính, AI làm theo). `random` truyền vào để test lặp lại được. */
export function computeStyleDirective(
  settings: StyleSettings, ctx: { purpose: SpeechPurpose; userText?: string }, random: () => number,
): StyleDirective {
  const persona = personaOf(settings);
  const unstable = settings.mood === 'baton';
  const effectiveMood = unstable ? pickUnstableMood(random) : (settings.mood as StableMood);
  const profile = MOOD_PROFILES[effectiveMood];
  const stance = pickStance(persona, effectiveMood, unstable, ctx.purpose, isSensitiveTopic(ctx.userText ?? ''), random);
  let words: readonly [number, number];
  let maxSentences = profile.maxSentences;
  if (ctx.purpose === 'daily_summary') {
    words = SUMMARY_WORDS; maxSentences = 12;
  } else {
    const f = PURPOSE_LENGTH_FACTOR[ctx.purpose] * PERSONA_PROFILES[persona].wordsFactor;
    const min = Math.max(1, Math.round(profile.words[0] * f));
    words = [min, Math.max(min + 2, Math.round(profile.words[1] * f))];
  }
  const emojiMax = persona === 'ngoan' ? Math.min(POLITE_EMOJI_MAX, profile.emojiMax || POLITE_EMOJI_MAX) : profile.emojiMax;
  const signature = [persona, settings.mood, effectiveMood, stance, `${words[0]}-${words[1]}w`, `${maxSentences}s`, `${emojiMax}e`].join('|');
  return { persona, mood: settings.mood, effectiveMood, stance, words, maxSentences, emojiMax, signature };
}

/** Khối STYLE cho SYSTEM (ổn định theo cấu hình — đổi tính cách / tâm trạng / xưng hô mới đổi). */
export function renderStyleSystemBlock(settings: StyleSettings, address: Address): string {
  const persona = personaOf(settings);
  const mood = MOOD_TEXT[settings.mood];
  return [
    PERSONA_TEXT[persona],
    `TÂM TRẠNG HIỆN TẠI: ${mood.label} — ${mood[persona]}`,
    `XƯNG HÔ: Rây tự xưng "${address.self}", gọi mọi người là "${address.others}".`,
    SOUTHERN_SPEECH_TEXT,
    'VIẾT: văn bản thường gửi Telegram, không markdown, không tiêu đề, không bảng.',
  ].join('\n\n');
}

/** Khối "CÁCH NÓI LẦN NÀY" cho PROMPT — chỉ thị cụ thể bằng con số, đặt ngay trước khuôn đầu ra. */
export function renderStyleTurnBlock(d: StyleDirective): string {
  const moodLine = d.mood === 'baton' ? `Lần này tâm trạng bốc ra là: ${MOOD_TEXT[d.effectiveMood].label} — ${MOOD_TEXT[d.effectiveMood][d.persona]}` : null;
  return [
    `CÁCH NÓI LẦN NÀY (mã ${d.signature}) — làm đúng, không giải thích:`,
    moodLine,
    `- Lập trường: ${STANCE_TEXT[d.stance][d.persona]}`,
    `- Độ dài: ${d.words[0]}–${d.words[1]} chữ, tối đa ${d.maxSentences} câu.`,
    `- Emoji: tối đa ${d.emojiMax}.`,
    `- Mức đùa: ${MOOD_PROFILES[d.effectiveMood].humor}/3.`,
  ].filter((x): x is string => x !== null).join('\n');
}

const PROFANITY_RE = wordRe(PROFANITY_WORDS.map(escapeRe).join('|'));
const EMOJI_RE = /\p{Extended_Pictographic}/gu;
const countWords = (t: string) => t.split(/\s+/).filter(Boolean).length;

/** BR-33: thay cặp từ miền Bắc → miền Nam an toàn; giữ chữ hoa đầu; bỏ "ạ" cuối câu. */
export function normalizeSouthern(text: string): string {
  let out = text.normalize('NFC');
  for (const [north, south] of NORTHERN_REPLACEMENTS) {
    out = out.replace(wordRe(escapeRe(north), 'giu'), (m) => (m[0] !== m[0]?.toLowerCase() ? south[0]?.toUpperCase() + south.slice(1) : south));
  }
  return out.replace(/\s+ạ(?=\s*[.!?,…]|\s*$)/gu, '');
}

/** Cắt lời quá dài ở cuối câu gần nhất (không cắt giữa câu); giữ ít nhất 1 câu. */
function trimToLength(text: string, maxWords: number, maxSentences: number): string {
  const sentences = text.split(/(?<=[.!?…])\s+/u);
  const kept: string[] = [];
  for (const s of sentences) {
    if (kept.length > 0 && (countWords([...kept, s].join(' ')) > maxWords || kept.length >= maxSentences)) break;
    kept.push(s);
  }
  return kept.join(' ');
}

/**
 * BR-34: code kiểm lời AI (Bẫy 29 — điều bắt buộc không chỉ dặn trong prompt).
 * Tục → ok=false (dùng câu soạn sẵn) · từ miền Bắc → thay · quá dài → cắt cuối câu · emoji dư → bỏ.
 */
export function checkStyledOutput(text: string, d: StyleDirective): { ok: boolean; text: string; warnings: string[] } {
  const warnings: string[] = [];
  if (PROFANITY_RE.test(text.normalize('NFC'))) return { ok: false, text: '', warnings: ['có từ tục'] };
  let out = normalizeSouthern(text.trim());
  const hardMax = Math.ceil(d.words[1] * STYLE_HARD_LENGTH_FACTOR);
  if (countWords(out) > hardMax) { out = trimToLength(out, hardMax, d.maxSentences + 1); warnings.push('quá dài — đã cắt'); }
  let seen = 0;
  out = out.replace(EMOJI_RE, (e) => (++seen <= d.emojiMax ? e : '')).replace(/\s{2,}/g, ' ').trim();
  if (seen > d.emojiMax) warnings.push('dư emoji — đã bỏ');
  const leftover = NORTHERN_WATCH_WORDS.filter((w) => wordRe(escapeRe(w)).test(out));
  if (leftover.length > 0) warnings.push(`còn từ miền Bắc: ${leftover.join(', ')}`);
  return { ok: out.length > 0, text: out, warnings };
}
