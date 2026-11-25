// Hướng dẫn lệnh: /caclenh (Khang, chat riêng — đầy đủ) · /help (mọi người, trong nhóm — chỉ lệnh chung + câu mẫu nói tự nhiên).
// Nguồn duy nhất: src/shared/command-guide.vi.ts (barie tests/command-guide.test.ts giữ khớp code + docs/danh-sach-lenh.md).
import type { BotKey } from '../domain/telegram.ts';
import { COMMAND_GUIDE, GROUP_EXAMPLES, GROUP_TALK_TIPS, type CommandGuide } from '../shared/command-guide.vi.ts';
import { BOT_DISPLAY_NAMES } from '../shared/persona.vi.ts';

const entry = (g: CommandGuide) => `${g.syntax}\n  • Làm gì: ${g.what}\n  • Khi nào: ${g.when}\n  • Kết quả: ${g.result}`;
const forBot = (bot: BotKey, scope: CommandGuide['scope']) => COMMAND_GUIDE.filter((g) => g.scope === scope && g.bots.includes(bot));

/** /help trong nhóm: lệnh ai cũng dùng được + cách gọi bot + câu mẫu nói tự nhiên. Không lộ lệnh của Khang. */
export function renderGroupHelp(bot: BotKey): string {
  const name = BOT_DISPLAY_NAMES[bot];
  const examples = GROUP_EXAMPLES[bot];
  return [
    `Dạ hướng dẫn xài ${name} nè 👇`,
    '',
    'CÁCH GỌI',
    ...GROUP_TALK_TIPS[bot].map((t) => `- ${t}`),
    ...(examples.length > 0 ? ['', 'NÓI TỰ NHIÊN LÀ ĐƯỢC, KHÔNG CẦN LỆNH — vd:', ...examples.map((e) => `- "${e.say}"\n  → ${e.result}`)] : []),
    '',
    'LỆNH (gõ trong nhóm)',
    ...forBot(bot, 'group').map(entry),
  ].join('\n');
}

/** /caclenh (chỉ Khang): hướng dẫn đầy đủ — lệnh của Khang + lệnh chung của nhóm. */
export function renderOwnerGuide(bot: BotKey): string {
  return [
    `HƯỚNG DẪN LỆNH ${BOT_DISPLAY_NAMES[bot].toUpperCase()} — dành cho Khang`,
    'Lệnh của Khang gõ trong CHAT RIÊNG với bot (gõ trong nhóm thì bot im lặng, nhưng cả nhóm thấy dòng Khang gõ). Lệnh đổi dữ liệu luôn có thẻ ✅ / ❌.',
    '',
    '===== LỆNH CỦA KHANG =====',
    ...forBot(bot, 'owner').map(entry),
    '',
    '===== LỆNH CHO CẢ NHÓM (ai cũng gõ được, trong nhóm) =====',
    ...forBot(bot, 'group').map(entry),
    '',
    'Chat riêng chữ thường (không có "/") → bot trả lời như nói chuyện bình thường.',
  ].join('\n');
}
