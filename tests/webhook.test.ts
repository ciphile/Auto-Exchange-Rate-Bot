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

test('F-06 / BR-20 / D4: bật lắng nghe → tin nhóm vào kho cả ngày (mã hóa); /tomtat gọi AI ĐÚNG 1 lần, gửi RIÊNG Khang; tắt lắng nghe → không lưu', async () => {
  const { rt, fake, mem, prompts } = createTestRuntime({ aiReply: () => '- Mọi người bàn tỉ giá' });
  await rt.store.saveGroup('ray', GROUP);
  await handleUpdate(rt, groupMsg('tỉ giá hôm nay cao ghê'));
  assert.equal(mem.tables.get('chat_log')?.length ?? 0, 0, 'tắt lắng nghe → không lưu kho cả ngày');
  await rt.store.saveSettings('ray', { listenOn: true });
  await handleUpdate(rt, groupMsg('tỉ giá hôm nay cao ghê'));
  await handleUpdate(rt, groupMsg('ừ mai đổi tiền'));
  assert.equal(mem.tables.get('chat_log')?.length, 2);
  assert.ok(!JSON.stringify(mem.tables.get('chat_log')).includes('đổi tiền'), 'kho cả ngày phải mã hóa');
  const before = prompts.length;
  await handleUpdate(rt, msg('/tomtat'));
  assert.equal(prompts.length - before, 1);
  assert.match(prompts.at(-1) ?? '', /ừ mai đổi tiền/);
  assert.equal(fake.sent.at(-1)?.chatId, OWNER_ID);
  assert.match(fake.sent.at(-1)?.text ?? '', /Tóm tắt chat hôm nay \(2 tin\)/);
  await rt.store.cleanup(new Date(Date.now() + 1000));
  assert.equal(mem.tables.get('chat_log')?.length, 0, 'dọn 01:00 xóa sạch kho cả ngày');
});

test('BR-49 nơi đổi chợ đen: Khang thêm (thẻ ✅) → /chodencontact trong nhóm hiện đúng danh sách; hỏi "đổi chợ đen ở đâu" → prompt chỉ có đúng danh sách; AI bịa số điện thoại khác → câu soạn sẵn', async () => {
  const phone = ['09', '12', '345', '678'].join(''); // số giả ghép lúc chạy
  let reply = 'Dạ đổi ở chỗ ' + ['08', '88', '888', '888'].join('') + ' nha';
  const { rt, fake, prompts } = createTestRuntime({ aiReply: () => reply });
  await rt.store.saveGroup('ray', GROUP);
  await handleUpdate(rt, msg(`/chodencontact them Chỗ Đổi A | ${phone} | đổi nhanh`));
  await handleUpdate(rt, press(cardData(fake.sent.at(-1)?.buttons, 0)));
  await handleUpdate(rt, groupMsg('/chodencontact', 5));
  assert.match(fake.sent.at(-1)?.text ?? '', new RegExp(`1\\. Chỗ Đổi A — ${phone} \\(đổi nhanh\\)`));
  await rt.store.saveSettings('ray', { listenOn: true });
  await handleUpdate(rt, groupMsg('Rây ơi nên đổi chợ đen ở đâu uy tín?', 5));
  assert.match(prompts.at(-1) ?? '', /NƠI ĐỔI CHỢ ĐEN UY TÍN[\s\S]*Chỗ Đổi A/);
  assert.match(fake.sent.at(-1)?.text ?? '', /Chỗ Đổi A/, 'số AI bịa → câu soạn sẵn đúng danh sách');
  reply = `Dạ anh chị gọi Chỗ Đổi A số ${phone} nha`;
  await handleUpdate(rt, groupMsg('ray oi doi cho den o dau', 5));
  assert.equal(fake.sent.at(-1)?.text, reply, 'không dấu vẫn hiểu; AI nói đúng số trong danh sách thì giữ lời AI');
  await handleUpdate(rt, msg('/chodencontact xoa 1'));
  await handleUpdate(rt, press(cardData(fake.sent.at(-1)?.buttons, 0)));
  await handleUpdate(rt, groupMsg('/chodencontact', 5));
  assert.match(fake.sent.at(-1)?.text ?? '', /chưa có nơi đổi nào/);
  const lui = { ...rt, bot: 'lui' as const };
  await lui.store.saveGroup('lui', -77);
  const before = fake.sent.length;
  await handleUpdate(lui, { ...groupMsg('/chodencontact', 5), chatId: -77 });
  assert.equal(fake.sent.length, before, 'BR-45: Lũi không có lệnh này');
});

test('BR-51 đổi tiền: hỏi số tiền không nói nguồn → bot hỏi lại; ĐÚNG người trả lời "chợ đen" (không cần gọi tên, tắt lắng nghe) → tính liền; người khác trả lời → bỏ qua', async () => {
  const now = new Date('2026-11-25T03:00:00Z');
  const { rt, fake, prompts } = createTestRuntime({ now: () => now, aiReply: () => 'không được gọi' });
  await rt.store.saveGroup('ray', GROUP);
  await rt.store.insertRate('wise', 20004);
  await handleUpdate(rt, groupMsg('@ray_test_bot lương 5000 đô đổi ra nhiêu tiền Việt?', 5));
  assert.match(fake.sent.at(-1)?.text ?? '', /5\.000 SGD anh chị muốn đổi theo nguồn nào/);
  const before = fake.sent.length;
  await handleUpdate(rt, groupMsg('chợ đen', 9)); // người khác
  assert.equal(fake.sent.length, before);
  await handleUpdate(rt, groupMsg('chợ đen', 5));
  assert.equal(fake.sent.at(-1)?.text, 'Dạ 5.000 SGD đổi ra nè:\n- Chợ đen: ≈ 100.500.000 đ (1 SGD = 20.100 đ, chợ đen ước tính theo Wise, lấy lúc mười giờ sáng hôm nay)');
  assert.equal(prompts.length, 0, 'đổi tiền không gọi AI');
});

test('BR-51 + BR-55 đổi tiền: không ai trả lời → sau 2 phút nhịp lịch (mỗi phút) tự tính chợ đen + Wise, có câu "do … không nói nguồn nên …", trả lời ngay dưới tin hỏi', async () => {
  let now = new Date('2026-11-25T03:00:00Z');
  const { rt, fake } = createTestRuntime({ now: () => now });
  await rt.store.saveGroup('ray', GROUP);
  await rt.store.insertRate('wise', 20004);
  await handleUpdate(rt, groupMsg('/doitien 1000', 5));
  assert.match(fake.sent.at(-1)?.text ?? '', /nguồn nào/);
  const { runTick } = await import('../src/services/tick.service.ts');
  now = new Date('2026-11-25T03:01:59Z');
  await runTick(rt, null);
  assert.equal(fake.sent.length, 1, 'chưa đủ 2 phút → chưa trả lời');
  now = new Date('2026-11-25T03:02:05Z'); // CÙNG mốc 10 phút với lần gọi trước: việc nặng bị khóa nhưng việc chờ 2 phút vẫn chạy
  const r = await runTick(rt, null);
  assert.equal(r.ran, false);
  const out = fake.sent.at(-1);
  assert.equal(out?.replyTo, 50);
  assert.match(out?.text ?? '', /^Dạ do anh chị không nói nguồn nên em tính theo chợ đen \+ Wise nè\.\n1\.000 SGD:/);
  assert.match(out?.text ?? '', /Chợ đen: ≈ 20\.100\.000 đ[\s\S]*Wise: ≈ 20\.004\.000 đ/);
  await runTick(rt, null);
  assert.equal(fake.sent.filter((s) => s.text.includes('không nói nguồn')).length, 1, 'chỉ trả lời 1 lần');
});

test('BR-51 /doitien: có nguồn → tính liền; "50tr wise" → VND sang SGD; sai cú pháp → hướng dẫn; tính cách bật → giọng xỏ lá ":))"', async () => {
  const { rt, fake } = createTestRuntime();
  await rt.store.saveGroup('ray', GROUP);
  await rt.store.insertRate('wise', 20000);
  await handleUpdate(rt, groupMsg('/doitien 2000 wise', 5));
  assert.match(fake.sent.at(-1)?.text ?? '', /Wise: ≈ 40\.000\.000 đ/);
  await handleUpdate(rt, groupMsg('/doitien 50tr wise', 5));
  assert.match(fake.sent.at(-1)?.text ?? '', /50\.000\.000 đ đổi ra nè:\n- Wise: ≈ 2\.500 SGD/);
  await handleUpdate(rt, groupMsg('/doitien abc', 5));
  assert.match(fake.sent.at(-1)?.text ?? '', /Gõ: \/doitien 5000/);
  await rt.store.saveSettings('ray', { personaOn: true });
  await handleUpdate(rt, groupMsg('/doitien 100 tất cả', 5));
  assert.match(fake.sent.at(-1)?.text ?? '', /^100 SGD nè :\)\)\n- Chợ đen[\s\S]*- VPBank \(mua chuyển khoản\): chưa có giá/);
});

test('Khang 25/11/2026: SYSTEM có luật mặc định có QUAN ĐIỂM + nối tiếp (đọc cả tin của chính bot) + KHÔNG có chức năng tìm kiếm; câu hỏi tiếp thấy lời bot vừa nói', async () => {
  const { rt, prompts } = createTestRuntime({ aiReply: () => 'Dạ mọi người đang bàn đóng thuế qua Wise, nhưng theo em thì nên hỏi kế toán cho chắc' });
  await rt.store.saveGroup('ray', GROUP);
  await rt.store.saveSettings('ray', { listenOn: true });
  await handleUpdate(rt, groupMsg('đóng thuế qua wise được không ta', 9));
  await handleUpdate(rt, groupMsg('Rây, tụi tao đang nói về vấn đề gì vậy?', 5));
  const first = prompts.at(-1) ?? '';
  assert.match(first, /MẶC ĐỊNH Rây có quan điểm riêng[\s\S]*"nhưng theo em thì …"/);
  assert.match(first, /KHÔNG tra cứu internet, KHÔNG tìm kiếm/);
  await handleUpdate(rt, groupMsg('Rây ơi vậy theo mày tao nên đóng thuế ra sao?', 5));
  assert.match(prompts.at(-1) ?? '', /Rây \(bot\): Dạ mọi người đang bàn đóng thuế qua Wise, nhưng theo em/);
});
