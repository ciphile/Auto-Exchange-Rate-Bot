// Telegram: đọc update (adapter), webhook kiểm mã (ATR-1), đường đi của tin (ATR-4, ATR-8, BR-16, BR-17), che bí mật.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createTelegramClient, getBotIdFromToken, parseUpdate, splitForTelegram } from '../src/adapters/telegram.adapter.ts';
import { isCalledByName, isMentioned, parseCommand, routeMessage, type AccessInput } from '../src/services/access.service.ts';
import type { IncomingMessage } from '../src/domain/telegram.ts';
import { isSameSecret, readBearerToken } from '../src/shared/secret-compare.ts';
import { redactSecrets } from '../src/shared/redact.ts';

const BOT_ID = 7000000001;
const OWNER = 111111111;
const GROUP_A = -1001234567890;
const fakeToken = `${BOT_ID}:` + 'Z'.repeat(35);

const rawMessage = (over: Record<string, unknown> = {}, msgOver: Record<string, unknown> = {}) => ({
  update_id: 10,
  message: {
    message_id: 55, date: 1_764_000_000, text: 'Rây ơi tỉ giá sao rồi',
    chat: { id: GROUP_A, type: 'supergroup', title: 'nhóm A' },
    from: { id: 222, is_bot: false, first_name: 'Mít' },
    ...msgOver,
  },
  ...over,
});

test('Telegram: đọc tin nhóm, caption, reply vào tin của bot; bỏ kênh / tin sửa / thiếu trường', () => {
  const m = parseUpdate(rawMessage(), BOT_ID);
  assert.equal(m?.kind, 'message');
  if (m?.kind === 'message') {
    assert.equal(m.chatKind, 'group'); assert.equal(m.fromName, 'Mít'); assert.equal(m.isReplyToBot, false);
    assert.equal(m.sentAt, 1_764_000_000_000);
  }
  const cap = parseUpdate(rawMessage({}, { text: undefined, caption: 'ảnh nè' }), BOT_ID);
  assert.ok(cap?.kind === 'message' && cap.text === 'ảnh nè');
  const reply = parseUpdate(rawMessage({}, { reply_to_message: { message_id: 1, from: { id: BOT_ID, is_bot: true } } }), BOT_ID);
  assert.ok(reply?.kind === 'message' && reply.isReplyToBot);
  assert.equal(parseUpdate(rawMessage({}, { chat: { id: -100, type: 'channel' } }), BOT_ID), null);
  assert.equal(parseUpdate({ update_id: 1, edited_message: rawMessage().message }, BOT_ID), null);
  assert.equal(parseUpdate({ update_id: 1, message: { text: 'x' } }, BOT_ID), null);
  for (const junk of [null, 'chuỗi', 5, [], {}]) assert.equal(parseUpdate(junk, BOT_ID), null);
});

test('Telegram: tin quá dài bị cắt trước khi lưu / gửi AI (prompt không phình)', () => {
  const m = parseUpdate(rawMessage({}, { text: 'a'.repeat(10_000) }), BOT_ID);
  assert.ok(m?.kind === 'message' && m.text.length === 4000);
});

test('Telegram: đọc bấm nút và bot được thêm vào group', () => {
  const cb = parseUpdate({ update_id: 2, callback_query: { id: 'q1', data: 'ok:5', from: { id: OWNER }, message: { message_id: 9, chat: { id: OWNER } } } }, BOT_ID);
  assert.deepEqual(cb, { kind: 'callback', updateId: 2, callbackId: 'q1', fromId: OWNER, chatId: OWNER, messageId: 9, data: 'ok:5' });
  const join = parseUpdate({ update_id: 3, my_chat_member: { chat: { id: GROUP_A, type: 'group', title: 'g' }, from: { id: 333 }, new_chat_member: { status: 'member' } } }, BOT_ID);
  assert.ok(join?.kind === 'membership' && join.joined && join.byId === 333);
});

test('Telegram: mã bot lấy từ token; chữ dài chia đoạn ≤ 4000, ưu tiên chỗ xuống dòng', () => {
  assert.equal(getBotIdFromToken(fakeToken), BOT_ID);
  assert.equal(getBotIdFromToken('abc'), null);
  const long = ('dòng chữ\n'.repeat(900)).trim();
  const parts = splitForTelegram(long);
  assert.ok(parts.length >= 2 && parts.every((p) => p.length <= 4000));
  assert.equal(parts.join('\n'), long);
  assert.deepEqual(splitForTelegram(''), ['']);
});

test('ATR-1 webhook: so mã thời gian cố định — thiếu / sai / khác độ dài → từ chối', () => {
  const secret = 'a'.repeat(64);
  assert.equal(isSameSecret(secret, secret), true);
  for (const bad of [null, undefined, '', 'a'.repeat(63), 'b'.repeat(64), secret + 'x']) assert.equal(isSameSecret(bad, secret), false);
  assert.equal(readBearerToken('Bearer abc123'), 'abc123');
  for (const bad of [null, '', 'abc123', 'Basic abc', 'Bearer ', 'Bearer a b']) assert.equal(readBearerToken(bad), null);
});

test('Bẫy 44: che bí mật ở mọi câu lỗi (token trong đường dẫn Telegram, khóa Google, khóa Supabase)', () => {
  const googleKey = 'AIza' + 'Q'.repeat(35);
  const supa = 'sb_' + 'secret_' + 'k'.repeat(20);
  const text = `POST https://api.telegram.org/bot${fakeToken}/sendMessage lỗi; key=${googleKey}; ${supa}; mã riêng hehehehe123`;
  const out = redactSecrets(text, ['hehehehe123']);
  for (const leak of [fakeToken, googleKey, supa, 'hehehehe123']) assert.ok(!out.includes(leak), leak);
  assert.match(out, /sendMessage lỗi/);
});

test('E-TG-001: Telegram trả lỗi → Result lỗi đã che token; 429 chờ ngắn thì thử lại 1 lần', async () => {
  const calls: string[] = [];
  const fakeFetch = (async (url: string) => {
    calls.push(url);
    if (calls.length === 1) return new Response(JSON.stringify({ ok: false, error_code: 429, description: 'Too Many Requests', parameters: { retry_after: 0 } }), { status: 429 });
    return new Response(JSON.stringify({ ok: false, error_code: 403, description: `Forbidden bot${fakeToken}` }), { status: 403 });
  }) as unknown as typeof fetch;
  const r = await createTelegramClient(fakeToken, fakeFetch).sendMessage(GROUP_A, 'chào');
  assert.equal(calls.length, 2);
  assert.ok(!r.ok && r.error.code === 'E-TG-001');
  assert.ok(!r.ok && !(r.error.detail ?? '').includes(fakeToken));
});

test('Telegram: gửi chữ thường (không parse_mode), tắt xem trước link, nút ở tin cuối', async () => {
  const bodies: Record<string, unknown>[] = [];
  const fakeFetch = (async (_url: string, init: RequestInit) => {
    bodies.push(JSON.parse(String(init.body)) as Record<string, unknown>);
    return new Response(JSON.stringify({ ok: true, result: { message_id: 100 + bodies.length } }));
  }) as unknown as typeof fetch;
  const r = await createTelegramClient(fakeToken, fakeFetch).sendMessage(OWNER, 'x'.repeat(5000), { buttons: [[{ text: '✅', data: 'ok' }]] });
  assert.ok(r.ok && r.data === 102);
  assert.equal(bodies.length, 2);
  assert.ok(bodies.every((b) => !('parse_mode' in b)));
  assert.ok(!('reply_markup' in (bodies[0] ?? {})) && 'reply_markup' in (bodies[1] ?? {}));
});

// ── Đường đi của tin (luật thuần) ──
const msg = (over: Partial<IncomingMessage> = {}): IncomingMessage => ({
  kind: 'message', updateId: 1, chatId: GROUP_A, chatKind: 'group', chatTitle: 'nhóm A', messageId: 1, fromId: 222,
  fromName: 'Mít', isFromBot: false, text: 'nay ăn gì', isReplyToBot: false, sentAt: 0, ...over,
});
const input = (m: IncomingMessage, over: Partial<AccessInput> = {}): AccessInput => ({
  message: m, ownerId: OWNER, boundGroupId: GROUP_A, listenOn: true, callNames: ['rây', 'ray'], botUsername: 'ray_tygia_bot', ...over,
});

test('BR-17 gọi tên: "Rây", "rây ơi", "RAY" (không cần "ơi"); không khớp tên nằm trong chữ khác', () => {
  for (const t of ['Rây ơi tỉ giá sao', 'rây', 'hỏi RAY coi', 'Rây, mày nghĩ sao?']) assert.ok(isCalledByName(t, ['rây', 'ray']), t);
  for (const t of ['array rỗng', 'rayban đẹp', 'trây ra', 'tiền lương']) assert.ok(!isCalledByName(t, ['rây', 'ray']), t);
  assert.ok(isMentioned('hỏi @ray_tygia_bot nè', 'ray_tygia_bot'));
  assert.ok(!isMentioned('@ray_tygia_bot2', 'ray_tygia_bot'));
});

test('Lệnh: /tygia, /tygia@bot, /quydoi 500 sgd; chữ thường không phải lệnh', () => {
  assert.deepEqual(parseCommand('/tygia'), { name: 'tygia', target: null, args: '' });
  assert.deepEqual(parseCommand('/QuyDoi@Ray_TyGia_Bot 500 sgd'), { name: 'quydoi', target: 'ray_tygia_bot', args: '500 sgd' });
  assert.equal(parseCommand('tygia'), null);
  assert.equal(parseCommand('/ có cách'), null);
});

test('ATR-8 / BR-23: chat riêng — chỉ Khang; người lạ → im lặng', () => {
  const priv = (fromId: number, text: string) => msg({ chatKind: 'private', chatId: fromId, fromId, text });
  assert.equal(routeMessage(input(priv(OWNER, '/trangthai'))).route, 'owner_command');
  assert.equal(routeMessage(input(priv(OWNER, 'tỉ giá sao rồi'))).route, 'owner_chat');
  assert.equal(routeMessage(input(priv(999, '/trangthai'))).route, 'ignore');
  assert.equal(routeMessage(input(priv(999, 'xin chào'))).route, 'ignore');
});

test('ATR-4: nhóm chưa gắn / nhóm lạ → im lặng; chỉ Khang gắn nhóm được bằng /gannhom', () => {
  assert.equal(routeMessage(input(msg({ text: 'Rây ơi' }), { boundGroupId: null })).route, 'ignore');
  assert.equal(routeMessage(input(msg({ chatId: -100999, text: '/tygia' }))).route, 'ignore');
  assert.equal(routeMessage(input(msg({ chatId: -100999, fromId: OWNER, text: '/gannhom' }))).route, 'bind_group');
  assert.equal(routeMessage(input(msg({ fromId: 222, text: '/gannhom' }))).route, 'ignore');
  assert.equal(routeMessage(input(msg({ fromId: OWNER, text: '/gannhom@bot_khac' }))).route, 'ignore');
});

test('BR-16 / BR-17 trong nhóm đã gắn: lệnh, reply, @, gọi tên, lắng nghe bật / tắt', () => {
  assert.equal(routeMessage(input(msg({ text: '/tygia' }), { listenOn: false })).route, 'group_command');
  assert.equal(routeMessage(input(msg({ text: '/tygia@bot_khac' }))).route, 'ignore');
  assert.equal(routeMessage(input(msg({ isReplyToBot: true }), { listenOn: false })).route, 'group_addressed');
  assert.equal(routeMessage(input(msg({ text: '@ray_tygia_bot giá?' }), { listenOn: false })).route, 'group_addressed');
  // Tắt lắng nghe: gọi tên không tính, tin thường bỏ ngay và KHÔNG lưu.
  const off = routeMessage(input(msg({ text: 'Rây ơi' }), { listenOn: false }));
  assert.deepEqual([off.route, off.storeInChatLog], ['ignore', false]);
  // Bật lắng nghe: gọi tên → trả lời (và lưu); tin thường → chỉ lưu.
  const called = routeMessage(input(msg({ text: 'Rây ơi' })));
  assert.deepEqual([called.route, called.storeInChatLog], ['group_addressed', true]);
  const chat = routeMessage(input(msg()));
  assert.deepEqual([chat.route, chat.storeInChatLog], ['group_listen', true]);
  assert.equal(routeMessage(input(msg({ isFromBot: true, text: 'Rây ơi' }))).route, 'ignore');
});

test('Audit: đứt mạng khi gửi tin → KHÔNG tự gửi lại (tránh tin trùng); lệnh vô hại (xóa tin) thì thử lại 1 lần', async () => {
  let count = 0;
  const brokenFetch = (async () => { count++; throw new Error('socket hang up'); }) as unknown as typeof fetch;
  const client = createTelegramClient(fakeToken, brokenFetch);
  const sent = await client.sendMessage(GROUP_A, 'cảnh báo');
  assert.equal(count, 1);
  assert.ok(!sent.ok && sent.error.code === 'E-TG-001');
  count = 0;
  await client.deleteMessage(GROUP_A, 5);
  assert.equal(count, 2);
});

test('BR-16 + BR-36: tắt lắng nghe → không trả lời, không lưu tóm tắt, NHƯNG vẫn vào kho ngữ cảnh ngắn; nhóm lạ / người lạ → không vào đâu cả', () => {
  const off = routeMessage(input(msg({ text: 'nay ăn gì' }), { listenOn: false }));
  assert.deepEqual([off.route, off.storeInChatLog, off.storeInContext], ['ignore', false, true]);
  const stranger = routeMessage(input(msg({ chatId: -100999 })));
  assert.equal(stranger.storeInContext, false);
  const priv = routeMessage(input(msg({ chatKind: 'private', chatId: 999, fromId: 999 })));
  assert.equal(priv.storeInContext, false);
});
