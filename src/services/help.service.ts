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

export type MenuCommand = { command: string; description: string };
export const MENU_DESCRIPTION_MAX = 256; // giới hạn của Telegram

const toMenu = (list: readonly CommandGuide[]): MenuCommand[] => {
  const seen = new Set<string>();
  return list.filter((g) => !seen.has(g.cmd) && seen.add(g.cmd))
    .map((g) => ({ command: g.cmd, description: g.what.slice(0, MENU_DESCRIPTION_MAX) }));
};

/**
 * Menu lệnh Telegram (Khang 25/11/2026): chat riêng của Khang → lệnh của Khang (+ /help); mọi nhóm → chỉ lệnh chung.
 * Lấy từ COMMAND_GUIDE nên luôn khớp /caclenh, /help và docs/danh-sach-lenh.md.
 */
export function buildCommandMenus(bot: BotKey): { owner: MenuCommand[]; group: MenuCommand[] } {
  const priority = ['caclenh', 'trangthai', 'tygia', 'noi', 'thuhoi', 'tomtat', 'caidat'];
  const owner = forBot(bot, 'owner').filter((g) => g.cmd !== 'gannhom') // /gannhom gõ trong nhóm, không để menu chat riêng
    .sort((a, b) => (priority.indexOf(a.cmd) + 1 || 99) - (priority.indexOf(b.cmd) + 1 || 99));
  return { owner: toMenu([...owner, ...forBot(bot, 'group').filter((g) => g.cmd === 'help')]), group: toMenu(forBot(bot, 'group')) };
}
