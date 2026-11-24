// F-08 + BR-23: cài đặt từng bot + lệnh của Khang để TỰ ĐỔI MỌI THỨ (Khang 25/11/2026). Hàm thuần:
// đọc lệnh → kiểm cú pháp → trả "đề xuất đổi" (cũ → mới) để controller hiện THẺ XÁC NHẬN ✅ / ❌; bấm ✅ mới áp.
// Chỉ gọi khi routeMessage đã xác định là Khang trong chat riêng (ATR-8). Lưu database + audit_log ở tầng repository.
import { DEFAULT_ALERT_LEVELS_VND, DEFAULT_CHATTINESS_LEVEL, DEFAULT_QUIET_HOURS } from '../config/defaults.ts';
import { DEFAULT_ALERT_FULL_MONTH, DEFAULT_FREQUENCY_LEVEL, type FrequencyLevel } from '../config/frequency.ts';
import { DEFAULT_MOOD, DEFAULT_PERSONA_ON, DEFAULT_PROFANITY_LEVEL, MOOD_CODES, type MoodCode, type ProfanityLevel } from '../config/persona.ts';
import type { BotKey } from '../domain/telegram.ts';
import { COMMAND_ERRORS, OWNER_COMMAND_HELP, SETTING_LABELS } from '../shared/commands.vi.ts';
import { MOOD_TEXT } from '../shared/persona.vi.ts';
import { parseCommand } from './access.service.ts';
import { parseFrequencyLevel } from './frequency.service.ts';
import { LIVE_SOURCES, type LiveSource } from './live-rate.service.ts';
import { parseMood } from './style.service.ts';

export type BotSettings = {
  alertLevelsVnd: number[];
  listenOn: boolean;
  chattinessLevel: number;
  address: { self: string; others: string } | null; // null = mặc định theo tính cách
  personaOn: boolean;
  mood: MoodCode;
  styleNote: string;
  quietHours: { startHour: number; endHour: number };
  sources: LiveSource[];
  frequencyLevel: FrequencyLevel;
  alertFullMonth: boolean;
  profanityLevel: ProfanityLevel;
};
export type SettingKey = keyof BotSettings;

/** Giá trị khởi tạo khi cài bot (BR-31: ngoan · BR-35: mức 3 · BR-39: cảnh báo 14 ngày cuối · BR-38: cấm tục). */
export function getDefaultSettings(bot: BotKey): BotSettings {
  return {
    alertLevelsVnd: [...DEFAULT_ALERT_LEVELS_VND], listenOn: false, chattinessLevel: DEFAULT_CHATTINESS_LEVEL, address: null,
    personaOn: DEFAULT_PERSONA_ON[bot], mood: DEFAULT_MOOD, styleNote: '', quietHours: { ...DEFAULT_QUIET_HOURS },
    sources: [...LIVE_SOURCES], frequencyLevel: DEFAULT_FREQUENCY_LEVEL, alertFullMonth: DEFAULT_ALERT_FULL_MONTH,
    profanityLevel: DEFAULT_PROFANITY_LEVEL,
  };
}

export type SettingsChange = { key: SettingKey; patch: Partial<BotSettings>; label: string; beforeText: string; afterText: string };
export type CommandOutcome =
  | { kind: 'proposal'; change: SettingsChange; confirmText: string } // → thẻ xác nhận
  | { kind: 'reply'; text: string } // xem / hướng dẫn / báo sai cú pháp
  | { kind: 'not_settings' }; // lệnh khác (/noi, /tomtat, /ai…) — controller khác xử lý

const ON = new Set(['on', 'bat', 'bật', '1', 'mo', 'mở']);
const OFF = new Set(['off', 'tat', 'tắt', '0', 'dong', 'đóng']);
const MIN_LEVEL_VND = 15_000;
const MAX_LEVEL_VND = 30_000;
const MAX_LEVELS = 12;
const MAX_STYLE_CHARS = 200;
const MAX_ADDRESS_CHARS = 30;

/** Hiện 1 cài đặt bằng chữ cho Khang đọc. */
export function formatSetting(key: SettingKey, s: BotSettings): string {
  switch (key) {
    case 'alertLevelsVnd': return s.alertLevelsVnd.map((v) => v.toLocaleString('en-US')).join(' · ');
    case 'listenOn': case 'personaOn': case 'alertFullMonth': return s[key] ? 'bật' : 'tắt';
    case 'chattinessLevel': return `mức ${s.chattinessLevel} / 10`;
    case 'address': return s.address ? `${s.address.self} - ${s.address.others}` : 'mặc định theo tính cách';
    case 'mood': return `${MOOD_TEXT[s.mood].label} (${s.mood})`;
    case 'styleNote': return s.styleNote || '(không có)';
    case 'quietHours': return `${String(s.quietHours.startHour).padStart(2, '0')}:00 → ${String(s.quietHours.endHour).padStart(2, '0')}:00`;
    case 'sources': return s.sources.join(', ');
    case 'frequencyLevel': return `mức ${s.frequencyLevel} / 5`;
    case 'profanityLevel': return `mức ${s.profanityLevel} / 3${s.personaOn ? '' : ' (đang ngoan nên không nói tục)'}`;
  }
}

export function renderAllSettings(s: BotSettings): string {
  return (Object.keys(SETTING_LABELS) as SettingKey[]).map((k) => `• ${SETTING_LABELS[k]}: ${formatSetting(k, s)}`).join('\n');
}

export function renderOwnerHelp(): string {
  return OWNER_COMMAND_HELP.map(([cmd, what]) => `${cmd} — ${what}`).join('\n');
}

const parseOnOff = (arg: string): boolean | null => (ON.has(arg.toLowerCase()) ? true : OFF.has(arg.toLowerCase()) ? false : null);
const intIn = (arg: string, min: number, max: number): number | null => {
  const n = Number(arg.trim());
  return Number.isInteger(n) && n >= min && n <= max ? n : null;
};

/** Mỗi lệnh đổi: đọc tham số → giá trị mới hoặc câu báo sai cú pháp. */
const PARSERS: Record<string, { key: SettingKey; parse: (arg: string) => Partial<BotSettings> | string }> = {
  moc: { key: 'alertLevelsVnd', parse: (a) => {
    const nums = a.split(/\s+/).filter(Boolean).map((x) => Number(x.replace(/[.,]/g, '')));
    const ok = nums.length > 0 && nums.length <= MAX_LEVELS && nums.every((n) => Number.isInteger(n) && n >= MIN_LEVEL_VND && n <= MAX_LEVEL_VND);
    return ok ? { alertLevelsVnd: [...new Set(nums)].sort((x, y) => x - y) } : COMMAND_ERRORS.levels;
  } },
  langnghe: { key: 'listenOn', parse: (a) => { const v = parseOnOff(a); return v === null ? COMMAND_ERRORS.onOff : { listenOn: v }; } },
  tinhcach: { key: 'personaOn', parse: (a) => { const v = parseOnOff(a); return v === null ? COMMAND_ERRORS.onOff : { personaOn: v }; } },
  canhbaocathang: { key: 'alertFullMonth', parse: (a) => { const v = parseOnOff(a); return v === null ? COMMAND_ERRORS.onOff : { alertFullMonth: v }; } },
  hongchuyen: { key: 'chattinessLevel', parse: (a) => { const v = intIn(a, 1, 10); return v === null ? COMMAND_ERRORS.chattiness : { chattinessLevel: v }; } },
  tansuat: { key: 'frequencyLevel', parse: (a) => { const v = parseFrequencyLevel(a); return v === null ? COMMAND_ERRORS.frequency : { frequencyLevel: v }; } },
  noituc: { key: 'profanityLevel', parse: (a) => { const v = intIn(a, 0, 3); return v === null ? COMMAND_ERRORS.profanity : { profanityLevel: v as ProfanityLevel }; } },
  tamtrang: { key: 'mood', parse: (a) => { const v = parseMood(a); return v === null ? renderMoodList() : { mood: v }; } },
  xungho: { key: 'address', parse: (a) => {
    // Vào prompt trong dấu "…" → bỏ mọi dấu nháy để không phá câu / khối (audit 25/11/2026).
    const [self = '', others = ''] = a.replace(/["“”]/g, '').split(/\s+[-–]\s+|\s*[-–]\s*/).map((x) => x.trim());
    const ok = self && others && self.length <= MAX_ADDRESS_CHARS && others.length <= MAX_ADDRESS_CHARS;
    return ok ? { address: { self, others } } : COMMAND_ERRORS.address;
  } },
  gionghi: { key: 'quietHours', parse: (a) => {
    const m = /^(\d{1,2})(?::00)?\s*[-–]\s*(\d{1,2})(?::00)?$/.exec(a.trim());
    const start = m ? intIn(m[1] ?? '', 0, 23) : null;
    const end = m ? intIn(m[2] ?? '', 0, 23) : null;
    return start === null || end === null || start === end ? COMMAND_ERRORS.quiet : { quietHours: { startHour: start, endHour: end } };
  } },
  nguon: { key: 'sources', parse: (a) => {
    const list = a.toLowerCase().split(/[\s,]+/).filter(Boolean);
    const ok = list.length > 0 && list.every((x) => (LIVE_SOURCES as readonly string[]).includes(x));
    return ok ? { sources: LIVE_SOURCES.filter((s) => list.includes(s)) } : COMMAND_ERRORS.sources;
  } },
  phongcach: { key: 'styleNote', parse: (a) => {
    const text = a.replace(/"{3,}/g, "''").replace(/\s+/g, ' ').trim(); // vào prompt → gỡ dấu đóng khối
    if (['xoa', 'xóa', 'off'].includes(text.toLowerCase())) return { styleNote: '' };
    return text && text.length <= MAX_STYLE_CHARS ? { styleNote: text } : COMMAND_ERRORS.style;
  } },
};

export function renderMoodList(): string {
  return ['Tâm trạng (gõ /tamtrang <mã>, có dấu cũng được):', ...MOOD_CODES.map((c) => `• ${c} — ${MOOD_TEXT[c].label}`)].join('\n');
}

/** F-08: đọc 1 lệnh của Khang (chat riêng). Không gọi AI (lệnh `/` chạy thẳng — F-04). */
export function handleOwnerSettingsCommand(text: string, current: BotSettings): CommandOutcome {
  const cmd = parseCommand(text);
  if (!cmd) return { kind: 'not_settings' };
  if (cmd.name === 'caidat') return { kind: 'reply', text: renderAllSettings(current) };
  if (cmd.name === 'lenh' || cmd.name === 'help') return { kind: 'reply', text: renderOwnerHelp() };
  const parser = PARSERS[cmd.name];
  if (!parser) return { kind: 'not_settings' };
  if (cmd.args === '') {
    if (cmd.name === 'tamtrang') return { kind: 'reply', text: `${renderMoodList()}\n\nĐang dùng: ${formatSetting('mood', current)}` };
    return { kind: 'reply', text: `${SETTING_LABELS[parser.key]} đang là: ${formatSetting(parser.key, current)}` };
  }
  const parsed = parser.parse(cmd.args);
  if (typeof parsed === 'string') return { kind: 'reply', text: parsed };
  const next = { ...current, ...parsed };
  const beforeText = formatSetting(parser.key, current);
  const afterText = formatSetting(parser.key, next);
  if (beforeText === afterText) return { kind: 'reply', text: COMMAND_ERRORS.same };
  const label = SETTING_LABELS[parser.key];
  return { kind: 'proposal', change: { key: parser.key, patch: parsed, label, beforeText, afterText }, confirmText: `Đổi ${label}:\n${beforeText}\n→ ${afterText}\n\nBấm ✅ để đổi, ❌ để thôi.` };
}

/** Bấm ✅ → áp thay đổi (repository ghi database + audit_log cũ → mới). */
export function applySettingsChange(current: BotSettings, change: SettingsChange): BotSettings {
  return { ...current, ...change.patch };
}
