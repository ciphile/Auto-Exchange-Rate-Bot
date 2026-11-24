// Kiểu dữ liệu Telegram đã đổi sang kiểu dự án (adapter đổi, service dùng — service không biết JSON của Telegram).

export type BotKey = 'ray' | 'lui';
export type ChatKind = 'private' | 'group';

/** Tin chữ (hoặc chú thích ảnh / file — Lũi đọc caption) gửi tới bot. */
export type IncomingMessage = {
  kind: 'message';
  updateId: number;
  chatId: number;
  chatKind: ChatKind;
  chatTitle: string | null;
  messageId: number;
  fromId: number;
  fromName: string;
  isFromBot: boolean;
  text: string;
  /** Tin này trả lời (reply) một tin của chính bot này. */
  isReplyToBot: boolean;
  sentAt: number; // ms
};

/** Người dùng bấm nút trên thẻ xác nhận. */
export type IncomingCallback = {
  kind: 'callback';
  updateId: number;
  callbackId: string;
  fromId: number;
  chatId: number;
  messageId: number;
  data: string;
};

/** Bot được thêm vào / bị xóa khỏi một group. */
export type IncomingMembership = {
  kind: 'membership';
  updateId: number;
  chatId: number;
  chatTitle: string | null;
  joined: boolean;
  byId: number;
};

export type IncomingUpdate = IncomingMessage | IncomingCallback | IncomingMembership;

/** 1 nút trên thẻ xác nhận: chữ hiện + dữ liệu gửi về khi bấm (Telegram giới hạn 64 byte). */
export type InlineButton = { text: string; data: string };
