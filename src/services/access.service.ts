// F-04 / F-08: tin tới → đi đường nào. Luật thuần code (không gọi AI): ai được nói gì, ở đâu.
// ATR-4 (chỉ nhóm đã gắn + chat riêng của Khang) · ATR-8 / BR-23 (lệnh của Khang chỉ từ mã tài khoản Khang)
// BR-16 (tắt lắng nghe → bỏ ngay mọi tin không phải lệnh) · BR-17 (gọi tên / reply / @tên_bot → trả lời).
import type { IncomingMessage } from '../domain/telegram.ts';

export type MessageRoute =
  | 'owner_command' // Khang gõ lệnh `/…` trong chat riêng
  | 'owner_chat' // Khang nói chữ thường trong chat riêng (hỏi bot như thành viên)
  | 'bind_group' // Khang gõ /gannhom trong một group → gắn group (thẻ xác nhận)
  | 'group_command' // thành viên gõ lệnh `/…` cho bot này trong nhóm đã gắn
  | 'group_addressed' // được gọi (tên / reply / @) trong nhóm đã gắn → trả lời
  | 'group_listen' // lắng nghe đang bật, tin thường → chỉ lưu (mã hóa), không trả lời
  | 'ignore';

export type AccessInput = {
  message: IncomingMessage;
  ownerId: number;
  boundGroupId: number | null; // nhóm đã gắn bằng /gannhom (null = chưa gắn)
  listenOn: boolean;
  callNames: readonly string[]; // BR-17: tên gọi của bot (vd "rây", "ray")
  botUsername: string; // không có "@"
};

export type AccessDecision = { route: MessageRoute; reason: string; storeInChatLog: boolean };

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const boundary = (body: string) => new RegExp(`(?<![\\p{L}\\p{N}_@])(?:${body})(?![\\p{L}\\p{N}_])`, 'iu');

/** Lệnh `/ten` hoặc `/ten@bot`. Trả tên lệnh (chữ thường) + bot được nhắm (null = không ghi). */
export function parseCommand(text: string): { name: string; target: string | null; args: string } | null {
  const m = /^\/([a-z0-9_]{1,32})(?:@([A-Za-z0-9_]{3,64}))?(?:\s+([\s\S]*))?$/i.exec(text.trim());
  if (!m || !m[1]) return null;
  return { name: m[1].toLowerCase(), target: m[2]?.toLowerCase() ?? null, args: (m[3] ?? '').trim() };
}

/** BR-17: tin có gọi tên bot không ("Rây", "rây ơi", "RAY" — không cần "ơi"); không khớp khi tên nằm trong chữ khác. */
export function isCalledByName(text: string, callNames: readonly string[]): boolean {
  if (callNames.length === 0) return false;
  return boundary(callNames.map(escapeRe).join('|')).test(text.normalize('NFC'));
}

/** BR-17: tin có @tên_bot không. */
export function isMentioned(text: string, botUsername: string): boolean {
  return new RegExp(`@${escapeRe(botUsername)}(?![A-Za-z0-9_])`, 'i').test(text);
}

const decide = (route: MessageRoute, reason: string, storeInChatLog = false): AccessDecision => ({ route, reason, storeInChatLog });

export function routeMessage(input: AccessInput): AccessDecision {
  const { message: m, ownerId, boundGroupId, listenOn, callNames, botUsername } = input;
  if (m.isFromBot) return decide('ignore', 'tin của bot khác');
  const command = parseCommand(m.text);
  const isOwner = m.fromId === ownerId;

  if (m.chatKind === 'private') {
    if (!isOwner) return decide('ignore', 'chat riêng của người lạ — im lặng (BR-23)');
    return decide(command ? 'owner_command' : 'owner_chat', 'chat riêng của Khang');
  }

  // Lệnh nhắm bot khác (`/tygia@bot_khac`) → không phải việc của bot này.
  if (command?.target && command.target !== botUsername.toLowerCase()) return decide('ignore', 'lệnh cho bot khác');
  if (command?.name === 'gannhom') {
    return isOwner ? decide('bind_group', 'Khang gắn nhóm') : decide('ignore', 'người khác gõ /gannhom — im lặng (ATR-8)');
  }
  if (boundGroupId === null || m.chatId !== boundGroupId) return decide('ignore', 'nhóm chưa gắn — im lặng (ATR-4)');

  const store = listenOn; // BR-16: chỉ lưu khi đang lắng nghe
  if (command) return decide('group_command', 'lệnh trong nhóm', store);
  if (m.isReplyToBot || isMentioned(m.text, botUsername)) return decide('group_addressed', 'reply / @tên bot', store);
  if (listenOn && isCalledByName(m.text, callNames)) return decide('group_addressed', 'gọi tên bot', store);
  if (listenOn) return decide('group_listen', 'lắng nghe — chỉ lưu', true);
  return decide('ignore', 'tắt lắng nghe — bỏ ngay, không lưu (BR-16)');
}
