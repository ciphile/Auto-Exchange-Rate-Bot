// F-04 / F-08 / ATR-1 / ATR-5: đường đi của 1 update Telegram + nhịp lịch, với database / Telegram / AI giả.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { handleWebhookRequest } from '../src/controllers/http.controller.ts';
import type { IncomingMessage } from '../src/domain/telegram.ts';
import { mergeStoredSettings } from '../src/services/settings.service.ts';
import { runTick } from '../src/services/tick.service.ts';
import { handleUpdate } from '../src/services/webhook.service.ts';
import { createTestRuntime, OWNER_ID } from './fakes.ts';
import { vn } from './helpers.ts';

const GROUP = -100777;
let updateId = 1;
const msg = (text: string, o: Partial<IncomingMessage> = {}): IncomingMessage => ({
  kind: 'message', updateId: updateId++, chatId: OWNER_ID, chatKind: 'private', chatTitle: null, messageId: 50, fromId: OWNER_ID,
  fromName: 'Chủ', isFromBot: false, text, isReplyToBot: false, sentAt: Date.now(), ...o,
});
const groupMsg = (text: string, fromId = 5) => msg(text, { chatId: GROUP, chatKind: 'group', chatTitle: 'Nhóm A', fromId, fromName: 'Bạn' });
const press = (data: string, fromId = OWNER_ID) => ({ kind: 'callback' as const, updateId: updateId++, callbackId: 'c', fromId, chatId: OWNER_ID, messageId: 7, data });
const cardData = (buttons: { data: string }[][] | undefined, i: 0 | 1) => buttons?.[0]?.[i]?.data ?? '';

test('ATR-1: webhook sai mã bí mật → 401, không đọc tin', async () => {
  const saved = { ...process.env };
  Object.assign(process.env, {
    RAY_BOT_TOKEN: `123456:${'A'.repeat(35)}`, RAY_WEBHOOK_SECRET: 'a'.repeat(40), OWNER_TELEGRAM_ID: '123456789', GEMINI_API_KEY: `AIza${'b'.repeat(35)}`,
    SUPABASE_URL: 'https://abc.supabase.co', SUPABASE_SECRET_KEY: `sb_secret_${'c'.repeat(30)}`, DATA_ENCRYPTION_KEY: 'd'.repeat(64), TICK_SECRET: 'e'.repeat(40),
  });
  try {
    const bad = await handleWebhookRequest('ray', new Request('https://x/api/ray', { method: 'POST', headers: { 'x-telegram-bot-api-secret-token': 'sai' }, body: '{}' }));
    assert.equal(bad.status, 401);
  } finally { process.env = saved; }
});

test('F-08 / ATR-5: lệnh đổi cài đặt → thẻ ✅ / ❌; bấm ✅ mới lưu; bấm lần 2 → hết hạn (thẻ dùng 1 lần); người khác bấm → không làm gì', async () => {
  const { rt, fake } = createTestRuntime();
  await handleUpdate(rt, msg('/tinhcach on'));
  const card = fake.sent.at(-1);
  assert.equal(card?.chatId, OWNER_ID);
  assert.match(card?.text ?? '', /Tính cách/);
  assert.equal(mergeStoredSettings('ray', (await rt.store.loadConfig('ray')).settings).personaOn, false);
  await handleUpdate(rt, press(cardData(card?.buttons, 0), 5)); // người lạ bấm
  assert.equal(mergeStoredSettings('ray', (await rt.store.loadConfig('ray')).settings).personaOn, false);
  await handleUpdate(rt, press(cardData(card?.buttons, 0)));
  assert.equal(mergeStoredSettings('ray', (await rt.store.loadConfig('ray')).settings).personaOn, true);
  await handleUpdate(rt, press(cardData(card?.buttons, 0)));
  assert.match(fake.edited.at(-1) ?? '', /hết hạn/);
});

test('F-08: /gannhom trong nhóm → thẻ gửi RIÊNG Khang; bấm ✅ → gắn nhóm; người khác gõ → im lặng', async () => {
  const { rt, fake } = createTestRuntime();
  await handleUpdate(rt, groupMsg('/gannhom', 5));
  assert.equal(fake.sent.length, 0);
  await handleUpdate(rt, groupMsg('/gannhom', OWNER_ID));
  assert.equal(fake.sent.at(-1)?.chatId, OWNER_ID);
  await handleUpdate(rt, press(cardData(fake.sent.at(-1)?.buttons, 0)));
  assert.equal((await rt.store.loadConfig('ray')).groupChatId, GROUP);
});

test('BR-17 / BR-29 / BR-36: được gọi trong nhóm, AI lỗi → câu soạn sẵn có giá + nguồn + giờ; tin lưu ngữ cảnh ĐÃ MÃ HÓA; update trùng xử lý 1 lần', async () => {
  const { rt, fake, mem } = createTestRuntime();
  await rt.store.saveGroup('ray', GROUP);
  await rt.store.insertRate('wise', 19950);
  const m = groupMsg('@ray_test_bot giá sao rồi');
  await handleUpdate(rt, m);
  await handleUpdate(rt, m); // Telegram gửi lại
  const replies = fake.sent.filter((s) => s.chatId === GROUP);
  assert.equal(replies.length, 1);
  assert.match(replies[0]?.text ?? '', /19\.950 đ \(theo Wise, lấy lúc/);
  const stored = JSON.stringify(mem.tables.get('chat_context'));
  assert.ok(!stored.includes('giá sao rồi'), 'tin chat phải mã hóa');
});

test('BR-30: hỏi "giá ngay" không nói nguồn → hỏi lại; trả lời "tùy" → lấy Wise ngay; AI nói thiếu con số → câu soạn sẵn', async () => {
  const { rt, fake, mem } = createTestRuntime({ aiReply: () => 'Dạ giá đang đẹp lắm nha' });
  await rt.store.saveGroup('ray', GROUP);
  await handleUpdate(rt, groupMsg('@ray_test_bot lấy giá ngay đi'));
  assert.match(fake.sent.at(-1)?.text ?? '', /nguồn nào/);
  await handleUpdate(rt, groupMsg('@ray_test_bot tùy mày'));
  assert.equal(mem.tables.get('rates')?.filter((r) => r.source === 'wise').length, 1);
  assert.match(fake.sent.at(-1)?.text ?? '', /19\.950/);
});

test('ADR-04 / BR-04 / BR-35: tick — khóa chống chạy chồng; tới mốc giờ thì lấy giá; ngày có kế hoạch thì báo 1 lần; tự đăng ký webhook', async () => {
  let now = vn(2026, 11, 25, 11, 5);
  const { rt, fake, mem } = createTestRuntime({ now: () => now, aiReply: (_s, p) => `Dạ giá ${/1 SGD = ([\d.]+)/.exec(p)?.[1] ?? '?'} đ nè` });
  await rt.store.saveGroup('ray', GROUP);
  await rt.store.setState('ray', 'plan:2026-11', { level: 3, days: [25], minutes: { 25: 600 } });
  const first = await runTick(rt, 'https://bot.example/api/ray');
  assert.deepEqual(first, { ran: true, failed: [] });
  assert.equal((await runTick(rt, 'https://bot.example/api/ray')).ran, false);
  assert.equal(fake.getWebhookUrl(), 'https://bot.example/api/ray');
  assert.ok((mem.tables.get('rates') ?? []).some((r) => r.source === 'wise'));
  const posts = fake.sent.filter((s) => s.chatId === GROUP);
  assert.equal(posts.length, 1);
  assert.match(posts[0]?.text ?? '', /19\.950/);
  now = vn(2026, 11, 25, 11, 25);
  await runTick(rt, null);
  assert.equal(fake.sent.filter((s) => s.chatId === GROUP).length, 1, 'mỗi ngày chỉ báo 1 lần');
});

test('BR-09: giờ nghỉ (22:00) → tick không nhắn nhóm; cảnh báo chờ, không mất', async () => {
  const now = vn(2026, 11, 25, 22, 5);
  const { rt, fake } = createTestRuntime({ now: () => now });
  await rt.store.saveGroup('ray', GROUP);
  await rt.store.setState('ray', 'plan:2026-11', { level: 3, days: [25], minutes: { 25: 600 } });
  await runTick(rt, null);
  assert.equal(fake.sent.filter((s) => s.chatId === GROUP).length, 0);
});

test('Cài đặt lưu trong database bị hỏng → dùng mặc định từng ô, không sập', () => {
  const s = mergeStoredSettings('ray', { mood: 'lung tung', frequencyLevel: 9, alertLevelsVnd: ['x'], listenOn: 'yes', chattinessLevel: 4 });
  assert.equal(s.mood, 'binhthuong');
  assert.equal(s.frequencyLevel, 3);
  assert.equal(s.listenOn, false);
  assert.equal(s.chattinessLevel, 4);
  assert.ok(s.alertLevelsVnd.length > 0);
});

test('F-08 /gioithieu: thẻ xác nhận → bấm ✅ → bot tự giới thiệu ngắn trong nhóm (AI lỗi → câu soạn sẵn có chức năng chính)', async () => {
  const { rt, fake, prompts } = createTestRuntime();
  await handleUpdate(rt, msg('/gioithieu'));
  assert.match(fake.sent.at(-1)?.text ?? '', /Chưa gắn nhóm/);
  await rt.store.saveGroup('ray', GROUP);
  await handleUpdate(rt, msg('/gioithieu'));
  await handleUpdate(rt, press(cardData(fake.sent.at(-1)?.buttons, 0)));
  const intro = fake.sent.filter((s) => s.chatId === GROUP).at(-1)?.text ?? '';
  assert.match(intro, /Rây/);
  assert.match(intro, /tỉ giá/);
  assert.match(intro, /nghỉ lễ/);
  assert.match(prompts.at(-1) ?? '', /tối đa 4 câu/);
});

test('BR-45: prompt của Lũi (nhóm B) KHÔNG mang tỉ giá / ngày lễ / timesheet / ngày lương', async () => {
  const { rt, prompts } = createTestRuntime({ aiReply: () => 'Dạ tin nóng nè' });
  await rt.store.insertRate('wise', 19950);
  const lui = { ...rt, bot: 'lui' as const };
  const { speak } = await import('../src/services/speech.service.ts');
  await speak(lui, mergeStoredSettings('lui', {}), { purpose: 'answer_chat', task: 'trả lời', fallback: 'x', situation: { isTimesheetDay: true, nextHoliday: { date: '2026-12-25', name: 'Christmas', daysAway: 3 } } });
  const p = prompts.at(-1) ?? '';
  for (const word of ['19.950', 'TIMESHEET', 'Christmas', 'lương']) assert.ok(!p.includes(word), `prompt Lũi có "${word}"`);
});

test('BR-42: hỏi Rây "tháng sau có ngày lễ nào không" → prompt có lịch lễ tới hết tháng sau; AI lỗi → danh sách soạn sẵn đúng ngày', async () => {
  const now = vn(2026, 11, 25, 10, 0);
  const { rt, fake, prompts } = createTestRuntime({ now: () => now });
  await rt.store.saveGroup('ray', GROUP);
  await handleUpdate(rt, groupMsg('@ray_test_bot tháng sau có ngày lễ nào không'));
  assert.match(prompts.at(-1) ?? '', /LỊCH NGHỈ LỄ SINGAPORE từ hôm nay tới hết 31\/12\/2026/);
  assert.match(prompts.at(-1) ?? '', /25\/12 \(T6\)/);
  assert.match(fake.sent.at(-1)?.text ?? '', /25\/12 \(T6\): Christmas Day/);
});
