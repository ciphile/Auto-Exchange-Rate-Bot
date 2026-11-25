// BR-49 (Khang 25/11/2026): nơi đổi chợ đen uy tín — DANH SÁCH DO KHANG QUẢN LÝ (database, không trong repo — Rule 5).
// Bot CHỈ giới thiệu đúng danh sách này; AI không bao giờ tự thêm nơi khác. Lệnh: /chodencontact (nhóm: xem · Khang: thêm / xóa).
import { parseCommand } from './access.service.ts';

export type ExchangeContact = { name: string; phone: string; note: string };
export const EXCHANGE_STATE_KEY = 'exchange_contacts';
export const EXCHANGE_MAX = 10;
const FIELD_MAX = 80;

const clean = (s: string) => s.replace(/"{3,}/g, "''").replace(/\s+/g, ' ').trim().slice(0, FIELD_MAX);

export type ExchangeCommand =
  | { kind: 'list' }
  | { kind: 'add'; contact: ExchangeContact }
  | { kind: 'remove'; index: number } // 1 = dòng đầu
  | { kind: 'error'; message: string };

export const EXCHANGE_USAGE = 'Gõ: /chodencontact (xem) · /chodencontact them Tên | số điện thoại | ghi chú · /chodencontact xoa 1';

/** Khang (chat riêng): xem / thêm / xóa. Thêm / xóa → thẻ xác nhận. */
export function parseExchangeCommand(text: string): ExchangeCommand | null {
  const cmd = parseCommand(text);
  if (!cmd || cmd.name !== 'chodencontact') return null;
  const args = cmd.args.trim();
  if (args === '') return { kind: 'list' };
  const add = /^(them|thêm)\s+(.+)$/iu.exec(args);
  if (add) {
    const [name = '', phone = '', note = ''] = (add[2] ?? '').split('|').map(clean);
    if (!name || !/^\+?[\d\s.-]{8,20}$/.test(phone)) return { kind: 'error', message: `Thiếu tên hoặc số điện thoại sai. ${EXCHANGE_USAGE}` };
    return { kind: 'add', contact: { name, phone, note } };
  }
  const rm = /^(xoa|xóa)\s+(\d{1,2})$/iu.exec(args);
  if (rm) return { kind: 'remove', index: Number(rm[2]) };
  return { kind: 'error', message: EXCHANGE_USAGE };
}

const line = (c: ExchangeContact, i: number) => `${i + 1}. ${c.name} — ${c.phone}${c.note ? ` (${c.note})` : ''}`;

/** Danh sách gửi người dùng (lệnh /chodencontact, hoặc câu soạn sẵn khi AI lỗi). */
export function renderExchangeList(list: readonly ExchangeContact[], blackMarketText: string | null): string {
  if (list.length === 0) return 'Dạ hiện chưa có nơi đổi nào trong danh sách giới thiệu nha.';
  return [
    'Dạ mấy chỗ đổi chợ đen anh chị trong nhóm hay giới thiệu nè:',
    ...list.map(line),
    blackMarketText ? `Giá chợ đen ước tính bữa nay: ${blackMarketText}.` : null,
    'Đổi tiền mặt nhớ đếm kỹ, hỏi giá trước khi chuyển nha.',
  ].filter((x): x is string => x !== null).join('\n');
}

/** Dòng bối cảnh cho prompt khi có người hỏi nên đổi ở đâu — AI chỉ đọc lại đúng danh sách. */
export function buildExchangeFacts(list: readonly ExchangeContact[]): string[] {
  if (list.length === 0) return ['NƠI ĐỔI CHỢ ĐEN: danh sách đang TRỐNG → nói chưa có nơi nào được giới thiệu, KHÔNG tự gợi ý nơi khác.'];
  return [
    'NƠI ĐỔI CHỢ ĐEN UY TÍN (nhóm tự giới thiệu; chỉ giới thiệu ĐÚNG danh sách này, ghi đúng tên + số điện thoại, KHÔNG thêm nơi khác, KHÔNG bịa đánh giá):',
    ...list.slice(0, EXCHANGE_MAX).map((c, i) => `- ${line(c, i)}`),
  ];
}
