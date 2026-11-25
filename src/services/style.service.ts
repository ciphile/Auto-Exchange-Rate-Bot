// BR-31 → BR-34: tính cách + tâm trạng → "chỉ thị nói" gửi AI, và kiểm lời AI trả về. Hàm thuần. Dùng cho cả Rây và Lũi.
// Theo tài liệu gọi AI của Khang mục 3.1: khối STYLE (ổn định theo cấu hình) nằm ở SYSTEM; phần đổi theo
// từng lần nói (lập trường bốc ngẫu nhiên, độ dài, emoji, tâm trạng bốc khi "không ổn định") nằm ở PROMPT.
import { TERSE_WORDS,
  DEFAULT_ADDRESS, MAX_POKE_PROBABILITY, MAX_REBUTTAL_PROBABILITY, MOOD_CODES, MOOD_PROFILES, PERSONA_PROFILES,
  POLITE_EMOJI_MAX, PURPOSE_LENGTH_FACTOR, STYLE_HARD_LENGTH_FACTOR, SUMMARY_WORDS, UNSTABLE_CHIME_FACTOR,
  UNSTABLE_MOOD_POOL, UNSTABLE_POKE_BOOST,
  PERSONA_PENDING, PROFANITY_LEVELS, type MoodCode, type ProfanityLevel, type PersonaMode, type StableMood,
} from '../config/persona.ts';
import type { BotKey } from '../domain/telegram.ts';
import {
  BOT_DISPLAY_NAMES, MOOD_TEXT, MOOD_TEXT_OVERRIDES, NORTHERN_REPLACEMENTS, NORTHERN_WATCH_WORDS, PERSONA_TEXT, PROFANITY_TIERS, SENSITIVE_TOPIC_WORDS,
  SOUTHERN_SPEECH_TEXT, STANCE_TEXT, type Stance,
} from '../shared/persona.vi.ts';

/** `profanityLevel` (BR-38, `/noituc`) không truyền = 0 (cấm). */
export type StyleSettings = { bot: BotKey; personaOn: boolean; mood: MoodCode; profanityLevel?: ProfanityLevel };
export type Address = { self: string; others: string };
/** Mục đích lời nói: trả lời số liệu · trả lời trò chuyện / vĩ mô · tự chen · báo giá · cảnh báo · tóm tắt cho Khang. */
export type SpeechPurpose = 'answer_data' | 'answer_chat' | 'chime_in' | 'rate_report' | 'rate_alert' | 'reminder' | 'daily_summary';

export type StyleDirective = {
  bot: BotKey;
  mode: PersonaMode;
  mood: MoodCode;
  effectiveMood: StableMood; // tâm trạng thật dùng lần này (baton → bốc ngẫu nhiên)
  stance: Stance;
  words: readonly [number, number];
  maxSentences: number;
  emojiMax: number;
  /** BR-38: số từ tục tối đa lần này (0 = cấm) + bậc được dùng. */
  profanityMax: number;
  profanityTiers: readonly ('nhe' | 'vua')[];
  /** Lần này nói CỤT (1 câu ngắn) — chỉ khi bật tính cách (terseChance). */
  terse: boolean;
  signature: string; // mã ngắn của chỉ thị — đưa vào log AI + khóa cache
};

const modeOf = (s: StyleSettings): PersonaMode => (s.personaOn ? 'on' : 'off');
const withName = (text: string, bot: BotKey) => text.replaceAll('{ten}', BOT_DISPLAY_NAMES[bot]);
const moodTextOf = (bot: BotKey, mood: MoodCode) => MOOD_TEXT_OVERRIDES[bot]?.[mood] ?? MOOD_TEXT[mood];
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
  return settings.personaOn ? configured ?? DEFAULT_ADDRESS[settings.bot].on : DEFAULT_ADDRESS[settings.bot].off;
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
  return PERSONA_PROFILES[settings.bot][modeOf(settings)].chime * moodFactor;
}

/** BR-33: tính cách quyết định NÓI GÌ — bốc lập trường theo xác suất (tính cách × tâm trạng). */
function pickStance(bot: BotKey, mode: PersonaMode, mood: StableMood, unstable: boolean, purpose: SpeechPurpose, sensitive: boolean, random: () => number): Stance {
  if (purpose === 'daily_summary') return 'tom_tat';
  if (sensitive) return 'trung_lap';
  if (purpose === 'rate_report' || purpose === 'rate_alert') return 'binh_luan_gia';
  if (purpose === 'reminder') return 'nhac_viec';
  const p = PERSONA_PROFILES[bot][mode];
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
  settings: StyleSettings, ctx: { purpose: SpeechPurpose; userText?: string; profanityUsedToday?: number }, random: () => number,
): StyleDirective {
  const { bot } = settings;
  const mode = modeOf(settings);
  const persona = PERSONA_PROFILES[bot][mode];
  const unstable = settings.mood === 'baton';
  const effectiveMood = unstable ? pickUnstableMood(random) : (settings.mood as StableMood);
  const profile = MOOD_PROFILES[effectiveMood];
  const stance = pickStance(bot, mode, effectiveMood, unstable, ctx.purpose, isSensitiveTopic(ctx.userText ?? ''), random);
  let words: readonly [number, number];
  let maxSentences = profile.maxSentences;
  if (ctx.purpose === 'daily_summary') {
    words = SUMMARY_WORDS; maxSentences = 12;
  } else {
    const f = PURPOSE_LENGTH_FACTOR[ctx.purpose] * persona.wordsFactor;
    const min = Math.max(1, Math.round(profile.words[0] * f));
    words = [min, Math.max(min + 2, Math.round(profile.words[1] * f))];
  }
  const emojiMax = persona.politeEmojiCap ? Math.min(POLITE_EMOJI_MAX, profile.emojiMax || POLITE_EMOJI_MAX) : profile.emojiMax;
  // BR-38: tục chỉ khi bật tính cách + tâm trạng cho phép + không phải tóm tắt / chuyện nhạy cảm; trần / tin và trần / ngày.
  const rule = PROFANITY_LEVELS[settings.personaOn ? settings.profanityLevel ?? 0 : 0];
  const profanityAllowed = profile.profanityOk && ctx.purpose !== 'daily_summary' && stance !== 'trung_lap';
  const profanityMax = profanityAllowed ? Math.max(0, Math.min(rule.perMessage, rule.perDay - (ctx.profanityUsedToday ?? 0))) : 0;
  const profanityTiers = profanityMax > 0 ? rule.tiers : [];
  // Khang 25/11/2026: bật tính cách thì nhiều khi nói CỤT (bốc sau cùng để không đổi các lần bốc phía trên).
  const terse = ctx.purpose !== 'daily_summary' && persona.terseChance > 0 && random() < persona.terseChance;
  if (terse) { words = TERSE_WORDS; maxSentences = 1; }
  const signature = [bot, mode, settings.mood, effectiveMood, stance, `${words[0]}-${words[1]}w`, `${maxSentences}s`, `${emojiMax}e`, `${profanityMax}t`, terse ? 'cut' : 'full'].join('|');
  return { bot, mode, mood: settings.mood, effectiveMood, stance, words, maxSentences, emojiMax, profanityMax, profanityTiers, terse, signature };
}

/** Khối STYLE cho SYSTEM (ổn định theo cấu hình — đổi tính cách / tâm trạng / xưng hô mới đổi). */
export function renderStyleSystemBlock(settings: StyleSettings, address: Address): string {
  const { bot } = settings;
  const mode = modeOf(settings);
  const mood = moodTextOf(bot, settings.mood);
  return withName([
    PERSONA_TEXT[bot][mode],
    PERSONA_PENDING[bot] ? '(Tính cách / tâm trạng riêng của {ten} đang chờ chủ bot gửi — tạm nói tự nhiên, vừa phải.)' : null,
    `TÂM TRẠNG HIỆN TẠI: ${mood.label} — ${mood[mode]}`,
    `XƯNG HÔ: {ten} tự xưng "${address.self}", gọi mọi người là "${address.others}".`,
    SOUTHERN_SPEECH_TEXT,
    'VIẾT: văn bản thường gửi Telegram, không markdown, không tiêu đề, không bảng.',
  ].filter((x): x is string => x !== null).join('\n\n'), bot);
}

/** Khối "CÁCH NÓI LẦN NÀY" cho PROMPT — chỉ thị cụ thể bằng con số, đặt ngay trước khuôn đầu ra. */
export function renderStyleTurnBlock(d: StyleDirective): string {
  const eff = moodTextOf(d.bot, d.effectiveMood);
  const moodLine = d.mood === 'baton' ? `Lần này tâm trạng bốc ra là: ${eff.label} — ${eff[d.mode]}` : null;
  return withName([
    `CÁCH NÓI LẦN NÀY (mã ${d.signature}) — làm đúng, không giải thích:`,
    moodLine,
    `- Lập trường: ${STANCE_TEXT[d.stance][d.mode]}`,
    `- Độ dài: ${d.words[0]}–${d.words[1]} chữ, tối đa ${d.maxSentences} câu.`,
    d.terse ? '- Lần này nói CỤT kiểu nhắn tin: 1 câu ngắn, có thể chỉ vài chữ, vẫn đủ con số (ĐỦ chữ số, bỏ dấu chấm được) + tên nguồn nếu nói giá (giờ lấy giá không bắt buộc khi nói cụt). Vd "Wise 19950 :))".' : null,
    d.mode === 'on' ? '- Biểu cảm bằng ký tự (":))", "=))", ":v") được dùng thoải mái, không tính vào emoji.' : null,
    d.mode === 'on' && d.profanityMax > 0 ? '- Ví dụ khi được nói tục nhẹ: "vãi 19900 =)), éo gì cũng giảm".' : null,
    `- Emoji: tối đa ${d.emojiMax}.`,
    `- Mức đùa: ${MOOD_PROFILES[d.effectiveMood].humor}/3.`,
    d.profanityMax > 0
      ? `- Từ tục: ĐƯỢC dùng tối đa ${d.profanityMax} từ cảm thán (không bắt buộc), chỉ trong: ${d.profanityTiers.flatMap((t) => PROFANITY_TIERS[t]).join(', ')}. Không chửi thẳng vào ai.`
      : '- Từ tục: KHÔNG dùng.',
    `- TUYỆT ĐỐI KHÔNG: ${PROFANITY_TIERS.cam.join(', ')}.`,
  ].filter((x): x is string => x !== null).join('\n'), d.bot);
}

const BANNED_RE = wordRe(PROFANITY_TIERS.cam.map(escapeRe).join('|'));
// Cụm dài trước ("đù má" trước "đù") để đếm 1 lần.
const SOFT_WORDS = [...PROFANITY_TIERS.nhe.map((w) => ({ w, tier: 'nhe' as const })), ...PROFANITY_TIERS.vua.map((w) => ({ w, tier: 'vua' as const }))]
  .sort((a, b) => b.w.length - a.w.length);
const SOFT_RE = wordRe(SOFT_WORDS.map((x) => escapeRe(x.w)).join('|'), 'giu');
const tierOf = (word: string) => SOFT_WORDS.find((x) => x.w === word.toLowerCase())?.tier ?? 'vua';
const mask = (word: string) => `${word[0] ?? ''}${'*'.repeat(Math.max(1, word.length - 1))}`;
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
export function checkStyledOutput(text: string, d: StyleDirective): { ok: boolean; text: string; warnings: string[]; profanityUsed: number } {
  const warnings: string[] = [];
  if (BANNED_RE.test(text.normalize('NFC'))) return { ok: false, text: '', warnings: ['có từ cấm tuyệt đối'], profanityUsed: 0 };
  // BR-38: từ tục trong giới hạn được giữ; vượt số lượng / sai bậc → che (đ*) thay vì bỏ cả câu.
  let profanityUsed = 0;
  let out = normalizeSouthern(text.trim()).replace(SOFT_RE, (m) => {
    if (profanityUsed < d.profanityMax && d.profanityTiers.includes(tierOf(m))) { profanityUsed++; return m; }
    warnings.push(`che từ tục "${mask(m)}"`);
    return mask(m);
  });
  const hardMax = Math.ceil(d.words[1] * STYLE_HARD_LENGTH_FACTOR);
  if (countWords(out) > hardMax) { out = trimToLength(out, hardMax, d.maxSentences + 1); warnings.push('quá dài — đã cắt'); }
  let seen = 0;
  out = out.replace(EMOJI_RE, (e) => (++seen <= d.emojiMax ? e : '')).replace(/\s{2,}/g, ' ').trim();
  if (seen > d.emojiMax) warnings.push('dư emoji — đã bỏ');
  const leftover = NORTHERN_WATCH_WORDS.filter((w) => wordRe(escapeRe(w)).test(out));
  if (leftover.length > 0) warnings.push(`còn từ miền Bắc: ${leftover.join(', ')}`);
  return { ok: out.length > 0, text: out, warnings, profanityUsed };
}
