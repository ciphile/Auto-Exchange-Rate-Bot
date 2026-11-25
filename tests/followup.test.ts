// BR-55: hỏi "lấy giá nguồn nào?" → 2 phút không ai trả lời → Rây TỰ trả lời, 100% có câu "do … không nói nguồn nên …".
// BR-54: câu nói tỉ giá hiện tại (dù ngắn / cụt) LUÔN có giờ + ngày lấy giá.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { IncomingMessage } from '../src/domain/telegram.ts';
import { enforceRateStamp, makeRateStamp, mentionsRate } from '../src/services/rate-stamp.service.ts';
import { runTick } from '../src/services/tick.service.ts';
import { handleUpdate } from '../src/services/webhook.service.ts';
import { createTestRuntime, OWNER_ID } from './fakes.ts';

const GROUP = -321;
let uid = 9_000_000;
const group = (text: string, fromId = 5, id = 40): IncomingMessage => ({ kind: 'message', updateId: uid++, chatId: GROUP, chatKind: 'group', chatTitle: 'A', messageId: id, fromId, fromName: 'X', isFromBot: false, text, isReplyToBot: false, sentAt: Date.now() });
const priv = (text: string): IncomingMessage => ({ kind: 'message', updateId: uid++, chatId: OWNER_ID, chatKind: 'private', chatTitle: null, messageId: 8, fromId: OWNER_ID, fromName: 'K', isFromBot: false, text, isReplyToBot: false, sentAt: Date.now() });
const T0 = Date.UTC(2026, 10, 25, 3, 0, 0); // 10:00 giờ VN

async function setup(opts: { persona?: boolean; aiReply?: () => string | null } = {}) {
  let now = new Date(T0);
  const ctx = createTestRuntime({ now: () => now, aiReply: opts.aiReply });
  await ctx.rt.store.saveGroup('ray', GROUP);
  await ctx.rt.store.saveSettings('ray', { listenOn: true, personaOn: opts.persona === true });
  await ctx.rt.store.insertRate('wise', 19950);
  return { ...ctx, at: (ms: number) => { now = new Date(T0 + ms); } };
}
const ask = '@ray_test_bot lấy tỉ giá mới nhất đi';

test('BR-55 hỏi "lấy giá mới nhất" không nói nguồn → hỏi lại (nói rõ 2 phút); trả lời kịp trước 2 phút → tính liền và KHÔNG bị trả lời mặc định thêm', async () => {
  const { rt, fake, at } = await setup();
  await handleUpdate(rt, group(ask));
  assert.match(fake.sent.at(-1)?.text ?? '', /nguồn nào[\s\S]*sau 2 phút không thấy trả lời thì em tự lấy Wise/);
  at(60_000);
  await handleUpdate(rt, group('vcb', 5, 41));
  assert.match(fake.sent.at(-1)?.text ?? '', /Vietcombank/);
  const n = fake.sent.length;
  at(5 * 60_000);
  await runTick(rt, null);
  assert.equal(fake.sent.length, n, 'đã có người trả lời → không tự trả lời nữa');
});

test('BR-55 im lặng ≥ 2 phút → nhịp lịch tự lấy Wise + chợ đen, có câu "do anh chị không nói nguồn nên em tự lấy Wise", có giờ + ngày; chỉ 1 lần dù nhịp gọi chồng', async () => {
  const { rt, fake, at } = await setup();
  await handleUpdate(rt, group(ask));
  const asked = fake.sent.length;
  at(119_000);
  await runTick(rt, null);
  assert.equal(fake.sent.length, asked, 'chưa đủ 2 phút');
  at(125_000);
  await runTick(rt, null);
  await runTick(rt, null);
  const auto = fake.sent.slice(asked);
  assert.equal(auto.length, 1);
  assert.equal(auto[0]?.replyTo, 40, 'trả lời ngay dưới tin hỏi');
  assert.match(auto[0]?.text ?? '', /^Dạ do anh chị không nói nguồn nên em tự lấy Wise nè\. 1 SGD = 19\.950 đ \(theo Wise, lấy lúc mười giờ sáng hôm nay\), chợ đen ước tính khoảng 20\.050 đ\.$/);
});

test('BR-55 bật tính cách → câu mở đầu giọng xỏ lá "Do … hổng nói nguồn nên … tự lấy Wise nha :))"; chat riêng của Khang → trả lời không reply', async () => {
  const { rt, fake, at } = await setup({ persona: true });
  await handleUpdate(rt, priv('lấy tỉ giá mới nhất đi'));
  assert.match(fake.sent.at(-1)?.text ?? '', /2 phút hổng nói gì là tui tự lấy Wise/);
  at(130_000);
  await runTick(rt, null);
  const out = fake.sent.at(-1);
  assert.equal(out?.chatId, OWNER_ID);
  assert.equal(out?.replyTo, undefined);
  assert.match(out?.text ?? '', /^Do .+ hổng nói nguồn nên tui tự lấy Wise nha :\)\) 1 SGD = 19\.950 đ \(theo Wise, lấy lúc/);
});

test('BR-55 Wise đang tắt → tự lấy nguồn khác đang bật, câu mở đầu nêu đúng tên nguồn; chưa có giá nào → vẫn có câu mở đầu + nói chưa lấy được', async () => {
  const a = await setup();
  await a.rt.store.saveSettings('ray', { listenOn: true, sources: ['dbs'] });
  await handleUpdate(a.rt, group(ask));
  a.at(125_000);
  await runTick(a.rt, null);
  assert.match(a.fake.sent.at(-1)?.text ?? '', /không nói nguồn nên em tự lấy DBS nè\. 1 SGD = 19\.608 đ \(theo DBS/);
  assert.equal(a.fake.sent.filter((s) => s.chatId === GROUP && s.text.includes('tự lấy DBS')).length, 1);
  const b = await setup();
  b.mem.tables.set('rates', []);
  b.rt.fetchers.wise = async () => ({ ok: false, error: { code: 'E-SRC-002' } });
  b.rt.fetchers.fallback = async () => ({ ok: false, error: { code: 'E-SRC-002' } });
  await handleUpdate(b.rt, group(ask));
  b.at(125_000);
  await runTick(b.rt, null);
  const reply = b.fake.sent.find((s) => s.chatId === GROUP && s.text.includes('không nói nguồn'));
  assert.match(reply?.text ?? '', /^Dạ do anh chị không nói nguồn nên em tự lấy Wise nè\. Mà em chưa lấy được giá nào/);
});

test('BR-55 nhịp lịch hỏng > 30 phút → bỏ câu hỏi cũ (không trả lời muộn lạc đề), không treo mãi', async () => {
  const { rt, fake, at } = await setup();
  await handleUpdate(rt, group(ask));
  const n = fake.sent.length;
  at(45 * 60_000);
  await runTick(rt, null);
  assert.equal(fake.sent.length, n);
  assert.equal(await rt.store.getState('ray', 'source_question'), null);
});

test('BR-54 enforceRateStamp: thiếu giờ + ngày → thêm (nói kiểu người); có giờ thiếu ngày → chèn ngày sau giờ; giờ / ngày dạng số → đổi sang chữ; nói SAI giờ / ngày → từ chối; không phải câu về tỉ giá → giữ nguyên', () => {
  const now = new Date(Date.UTC(2026, 10, 25, 3, 30)); // 10:30 hôm nay giờ VN
  const st = makeRateStamp(Date.UTC(2026, 10, 25, 3, 5), now); // 10:05 hôm nay
  assert.deepEqual(st, { time: 'mười giờ sáng lẻ năm phút', day: 'hôm nay', dayEquivalents: ['hôm nay', 'ngày 25', 'ngày 25 tháng 11'] });
  const run = (t: string) => enforceRateStamp(t, st, now);
  assert.deepEqual(run('Wise 19950 :))'), { ok: true, text: 'Wise 19950 :)) (lúc mười giờ sáng lẻ năm phút hôm nay)' });
  assert.deepEqual(run('Wise 19.950 lúc mười giờ sáng lẻ năm phút hôm nay nha'), { ok: true, text: 'Wise 19.950 lúc mười giờ sáng lẻ năm phút hôm nay nha' });
  assert.deepEqual(run('Wise 19950 lúc mười giờ sáng lẻ năm phút nha'), { ok: true, text: 'Wise 19950 lúc mười giờ sáng lẻ năm phút hôm nay nha' });
  assert.deepEqual(run('Wise 19950 lúc 10:05 ngày 25/11/2026 nha'), { ok: true, text: 'Wise 19950 lúc mười giờ sáng lẻ năm phút hôm nay nha' }, 'số → chữ');
  assert.deepEqual(run('Wise 19950 lúc mười giờ sáng lẻ năm phút ngày 25'), { ok: true, text: 'Wise 19950 lúc mười giờ sáng lẻ năm phút ngày 25' }, '"ngày 25" = hôm nay');
  assert.equal(run('Wise 19950 lúc 9:15').ok, false);
  assert.equal(run('Wise 19950 lúc mười giờ sáng lẻ năm phút hôm qua').ok, false);
  assert.equal(run('Wise 19950 lúc mười giờ sáng nha').ok, false, 'thiếu "lẻ năm phút" = giờ khác');
  assert.equal(run('Wise 19950 lúc 10 giờ sáng').ok, false, 'chữ số "10 giờ" không nhận ra → câu soạn sẵn cho chắc');
  assert.deepEqual(run('Dạ em nghe nè, họp lúc 9:15 nha'), { ok: true, text: 'Dạ em nghe nè, họp lúc 9:15 nha' });
  assert.deepEqual(enforceRateStamp('Wise 19950', null, now), { ok: true, text: 'Wise 19950' });
  assert.equal(mentionsRate('lương 5.000 đô = 100.500.000 đ'), false);
  assert.equal(mentionsRate('giá 20.100 đ'), true);
  // giá lấy hôm qua / 2 hôm trước
  const old = makeRateStamp(Date.UTC(2026, 10, 24, 7, 0), now); // 14:00 hôm qua
  assert.equal(old.time, 'hai giờ chiều');
  assert.equal(old.day, 'hôm qua');
  assert.equal(enforceRateStamp('Wise 19950', old, now).text, 'Wise 19950 (lúc hai giờ chiều hôm qua)');
  assert.equal(makeRateStamp(Date.UTC(2026, 10, 22, 7, 0), now).day, 'ngày 22');
});

test('BR-54 từ tin nhắn tới câu gửi đi: AI nói CỤT "Wise 19950 :))" → bot tự thêm giờ + ngày kiểu người; AI viết "10:00" → đổi thành chữ; AI nói sai giờ → câu soạn sẵn (đúng giờ); tán gẫu không nhắc giá → không thêm', async () => {
  let reply = 'Wise 19950 :))';
  const { rt, fake } = await setup({ persona: true, aiReply: () => reply });
  await handleUpdate(rt, group('Rây ơi giá hôm nay nhiêu', 5, 50));
  assert.equal(fake.sent.at(-1)?.text, 'Wise 19950 :)) (lúc mười giờ sáng hôm nay)');
  reply = 'Wise 19950 lúc 7:30 nha';
  await handleUpdate(rt, group('Rây ơi giá hôm nay nhiêu nữa', 5, 51));
  assert.match(fake.sent.at(-1)?.text ?? '', /19\.950 đ \(theo Wise, lấy lúc mười giờ sáng hôm nay\)/, 'sai giờ → câu soạn sẵn đúng giờ');
  reply = 'vãi lại 19950 lúc 10:00 ngày 25/11/2026 =))';
  await handleUpdate(rt, group('Rây ơi giá sao rồi', 5, 52));
  assert.equal(fake.sent.at(-1)?.text, 'vãi lại 19950 lúc mười giờ sáng hôm nay =))', '"10:00" và "25/11/2026" được đổi sang chữ');
  reply = 'haha tui thấy vụ họp lúc 9:15 vui lắm :))';
  await handleUpdate(rt, group('Rây ơi mày thấy vụ họp sáng nay sao', 5, 53));
  assert.equal(fake.sent.at(-1)?.text, 'haha tui thấy vụ họp lúc chín giờ sáng mười lăm phút vui lắm :))', 'giờ nào cũng nói kiểu người, kể cả khi không nói giá');
});

test('BR-54 prompt: luật số liệu + chỉ thị nói cụt đều bắt buộc giờ + ngày', async () => {
  const { rt, prompts } = await setup({ persona: true, aiReply: () => 'ok' });
  rt.random = () => 0.01; // ép nói cụt
  await handleUpdate(rt, group('Rây ơi giá hôm nay nhiêu', 5, 60));
  const p = prompts.at(-1) ?? '';
  assert.match(p, /Câu nào nói về tỉ giá hiện tại, DÙ NGẮN hay nói cụt, cũng PHẢI có giờ \+ ngày lấy giá/);
  assert.match(p, /nói cụt cũng KHÔNG được bỏ giờ \+ ngày/);
});

test('BR-55 trả lời "nguồn nào?" không gọi tên bot: chỉ NGƯỜI ĐÃ HỎI + câu ngắn mới được hiểu; người khác / câu chuyện dài có chữ "wise" → bỏ qua (bot vẫn tự trả lời sau 2 phút)', async () => {
  const { rt, fake, at } = await setup();
  await handleUpdate(rt, group(ask, 5, 40));
  const n = fake.sent.length;
  at(20_000);
  await handleUpdate(rt, group('vcb', 9, 41)); // người khác
  await handleUpdate(rt, group('hôm qua chuyển wise về mà chờ cả ngày luôn, mệt ghê', 5, 42)); // người hỏi nhưng chuyện dài
  assert.equal(fake.sent.length, n, 'không hiểu nhầm');
  at(30_000);
  await handleUpdate(rt, group('wise', 5, 43)); // đúng người, ngắn
  assert.match(fake.sent.at(-1)?.text ?? '', /^1 SGD = 19\.950 đ \(theo Wise|Wise/);
  assert.ok(fake.sent.length > n);
});
