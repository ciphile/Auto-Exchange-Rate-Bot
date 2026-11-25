// BR-53: /chotden — công tắc giá chợ đen: TỰ TÍNH (Wise × (1 + mức chênh), tròn 50 đ) ↔ THỦ CÔNG (Khang nhập giá thật).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { manualStaleWarning, parseBlackMarketCommand, planBlackMarketChange, type BlackMarketOutcome } from '../src/services/black-market.service.ts';
import { loadRateTable, renderConversion } from '../src/services/convert.service.ts';
import { buildSituationFacts } from '../src/services/prompt-context.service.ts';
import { estimateBlackMarketVnd, formatPremiumPct, resolveBlackMarket } from '../src/services/rate.service.ts';
import { blackMarketConfigOf, getDefaultSettings, mergeStoredSettings, renderAllSettings, type BotSettings } from '../src/services/settings.service.ts';
import { runTick } from '../src/services/tick.service.ts';
import { handleUpdate } from '../src/services/webhook.service.ts';
import { createTestRuntime, OWNER_ID } from './fakes.ts';
import { vn } from './helpers.ts';

const DEF = getDefaultSettings('ray');
const NOW = Date.UTC(2026, 10, 25, 3, 0); // 10:00 giờ VN
const MANUAL: BotSettings = { ...DEF, blackMarketManual: { on: true, vnd: 20100, at: NOW - 3600_000 } };
const plan = (text: string, s: BotSettings = DEF, wise: number | null = 20007.4, now = NOW): BlackMarketOutcome => {
  const c = parseBlackMarketCommand(text);
  assert.ok(c, text);
  return planBlackMarketChange(c, s, wise, now);
};
const asProposal = (o: BlackMarketOutcome) => { assert.equal(o.kind, 'proposal', JSON.stringify(o)); return o.kind === 'proposal' ? o : assert.fail(); };
const asReply = (o: BlackMarketOutcome) => { assert.equal(o.kind, 'reply', JSON.stringify(o)); return o.kind === 'reply' ? o.text : assert.fail(); };

test('BR-53 cú pháp: giá, tudong / on, %, macdinh, xem; sai → hướng dẫn', () => {
  assert.deepEqual(parseBlackMarketCommand('/chotden 20100'), { kind: 'manual_price', priceVnd: 20100 });
  assert.deepEqual(parseBlackMarketCommand('/chotden 20.100'), { kind: 'manual_price', priceVnd: 20100 });
  assert.deepEqual(parseBlackMarketCommand('/chotden 20,100'), { kind: 'manual_price', priceVnd: 20100 });
  for (const t of ['tudong', 'tự động', 'auto', 'off', 'tắt']) assert.deepEqual(parseBlackMarketCommand(`/chotden ${t}`), { kind: 'auto' }, t);
  for (const t of ['on', 'bật', 'manual', 'thủ công']) assert.deepEqual(parseBlackMarketCommand(`/chotden ${t}`), { kind: 'manual_on' }, t);
  assert.deepEqual(parseBlackMarketCommand('/chotden 0,5%'), { kind: 'pct', pct: 0.5 });
  assert.deepEqual(parseBlackMarketCommand('/chotden −0,2%'), { kind: 'pct', pct: -0.2 });
  assert.deepEqual(parseBlackMarketCommand('/chotden macdinh'), { kind: 'default' });
  assert.deepEqual(parseBlackMarketCommand('/chotden'), { kind: 'show' });
  for (const bad of ['/chotden abc', '/chotden 100', '/chotden 99999', '/chotden 20100 20200', '/chotden %']) assert.equal(parseBlackMarketCommand(bad)?.kind, 'error', bad);
  assert.equal(parseBlackMarketCommand('/tygia'), null);
});

test('BR-53 công thức TỰ TÍNH không đổi: Wise × 1,0048 tròn 50 đ; THỦ CÔNG bật → đúng số Khang nhập (không làm tròn lại), có nhãn + giờ nhập', () => {
  assert.equal(resolveBlackMarket(20007.4).vnd, 20100);
  assert.equal(resolveBlackMarket(19975.2).vnd, 20050);
  assert.equal(resolveBlackMarket(20007.4).phrase, 'chợ đen ước tính khoảng 20.100 đ');
  const m = resolveBlackMarket(20007.4, blackMarketConfigOf(MANUAL));
  assert.equal(m.vnd, 20100);
  assert.equal(m.manual, true);
  assert.equal(m.phrase, 'chợ đen khoảng 20.100 đ');
  assert.match(m.label, /giá thật Khang nhập tay lúc 09:00 ngày 25\/11\/2026/);
  const odd = resolveBlackMarket(20007.4, { manual: { on: true, vnd: 20123, at: NOW }, premiumPct: 0.48 });
  assert.equal(odd.vnd, 20123, 'không làm tròn số Khang nhập');
  assert.equal(resolveBlackMarket(20000, { manual: { on: false, vnd: 20500, at: NOW }, premiumPct: 0.48 }).vnd, 20100, 'tắt thủ công → tự tính dù còn giá cũ');
});

test('BR-53 nhập giá thật: bật THỦ CÔNG + ghi giờ; thẻ cũ → mới; Wise lệch quá xa → từ chối (gõ nhầm)', () => {
  const p = asProposal(plan('/chotden 20100'));
  assert.deepEqual(p.change.patch.blackMarketManual, { on: true, vnd: 20100, at: NOW });
  assert.match(p.confirmText, /Giá chợ đen \(công tắc tự tính \/ thủ công\):\nTỰ TÍNH theo công thức \(Wise \+0,48%, tròn 50 đ\)\n→ THỦ CÔNG: 20\.100 đ \(Khang nhập lúc 10:00 ngày 25\/11\/2026\)/);
  assert.match(p.confirmText, /ĐÚNG 20\.100 đ/);
  assert.match(asReply(plan('/chotden 29000')), /lệch \+44,95% so với Wise/);
  assert.equal(asProposal(plan('/chotden 29000', DEF, null)).change.patch.blackMarketManual?.vnd, 29000, 'chưa có Wise → không kiểm lệch, vẫn nhận');
});

test('BR-53 công tắc: tudong tắt thủ công (giữ giá cũ); on bật lại; trạng thái đã đúng → không đổi; on mà chưa từng nhập → hướng dẫn', () => {
  const off = asProposal(plan('/chotden tudong', MANUAL));
  assert.deepEqual(off.change.patch.blackMarketManual, { on: false, vnd: 20100, at: NOW - 3600_000 });
  assert.match(off.confirmText, /THỦ CÔNG: 20\.100 đ[^\n]*\n→ TỰ TÍNH theo công thức/);
  assert.match(asReply(plan('/chotden tudong')), /TỰ TÍNH rồi/);
  const stopped: BotSettings = { ...DEF, blackMarketManual: { on: false, vnd: 20100, at: NOW - 3600_000 } };
  assert.equal(asProposal(plan('/chotden on', stopped)).change.patch.blackMarketManual?.on, true);
  assert.match(asReply(plan('/chotden on', MANUAL)), /THỦ CÔNG rồi/);
  assert.match(asReply(plan('/chotden on')), /Chưa có giá thủ công nào đã nhập/);
});

test('BR-53 mức chênh của công thức + macdinh + xem; giá thủ công cũ > 24 giờ → cảnh báo', () => {
  assert.equal(asProposal(plan('/chotden 0,5%')).change.patch.blackMarketPremiumPct, 0.5);
  assert.match(asProposal(plan('/chotden 0,5%')).confirmText, /Chỉ áp dụng khi chế độ TỰ TÍNH[\s\S]*chợ đen ≈ 20\.100/);
  assert.match(asReply(plan('/chotden 20,5%')), /lệch quá xa/);
  assert.match(asReply(plan('/chotden 0,48%')), /đang đúng \+0,48% rồi/);
  const d = asProposal(plan('/chotden macdinh', { ...MANUAL, blackMarketPremiumPct: 1.2 }));
  assert.equal(d.change.patch.blackMarketPremiumPct, 0.48);
  assert.equal(d.change.patch.blackMarketManual?.on, false);
  assert.match(asReply(plan('/chotden')), /Đang TỰ TÍNH: \(Wise \+0,48%, tròn 50 đ\)\. Công thức tự tính với Wise 20\.007 cho ra ≈ 20\.100/);
  assert.match(asReply(plan('/chotden', MANUAL)), /Đang THỦ CÔNG: 20\.100 đ \(Khang nhập lúc 09:00 ngày 25\/11\/2026\)/);
  assert.equal(manualStaleWarning(MANUAL, NOW), null);
  const stale = { ...MANUAL, blackMarketManual: { on: true, vnd: 20100, at: NOW - 30 * 3600_000 } };
  assert.match(manualStaleWarning(stale, NOW) ?? '', /nhập từ 24\/11 \(30 giờ trước\)/);
  assert.match(asReply(plan('/chotden', stale)), /⚠️ Giá chợ đen THỦ CÔNG nhập từ/);
});

test('BR-53 cài đặt lưu hỏng → TỰ TÍNH + mặc định; /caidat hiện công tắc + mức chênh; formatPremiumPct có dấu', () => {
  assert.equal(mergeStoredSettings('ray', { blackMarketPremiumPct: 'x' }).blackMarketPremiumPct, 0.48);
  assert.equal(mergeStoredSettings('ray', { blackMarketPremiumPct: 99 }).blackMarketPremiumPct, 0.48);
  assert.equal(mergeStoredSettings('ray', { blackMarketPremiumPct: 0.7 }).blackMarketPremiumPct, 0.7);
  assert.equal(mergeStoredSettings('ray', { blackMarketManual: { on: true, vnd: null, at: 1 } }).blackMarketManual.on, false, 'bật mà không có giá → tắt');
  assert.equal(mergeStoredSettings('ray', { blackMarketManual: { on: true, vnd: 5, at: 1 } }).blackMarketManual.on, false, 'giá ngoài miền → tắt');
  assert.equal(mergeStoredSettings('ray', {}).blackMarketManual.on, false);
  assert.equal(mergeStoredSettings('ray', { blackMarketManual: MANUAL.blackMarketManual }).blackMarketManual.vnd, 20100);
  assert.match(renderAllSettings(DEF), /Giá chợ đen \(công tắc tự tính \/ thủ công\): TỰ TÍNH theo công thức[\s\S]*Mức chênh chợ đen khi tự tính: \+0,48% so với Wise/);
  assert.equal(formatPremiumPct(0.0048), '+0,48%');
  assert.equal(formatPremiumPct(-0.002), '−0,2%');
});

test('BR-53 từ lệnh tới kết quả: Khang gõ /chotden 20100 → ✅ → prompt, đổi tiền, danh sách nơi đổi, câu soạn sẵn đều dùng ĐÚNG 20.100; /chotden tudong → ✅ → về công thức; người lạ gõ → im lặng', async () => {
  const now = new Date(NOW);
  const { rt, fake, prompts } = createTestRuntime({ now: () => now });
  await rt.store.saveGroup('ray', -9);
  await rt.store.insertRate('wise', 19950); // công thức → 20.050
  let uid = 6_000_000;
  const priv = (text: string, fromId = OWNER_ID) => ({ kind: 'message' as const, updateId: uid++, chatId: fromId, chatKind: 'private' as const, chatTitle: null, messageId: 3, fromId, fromName: 'K', isFromBot: false, text, isReplyToBot: false, sentAt: NOW });
  const press = async (card: { buttons?: { data: string }[][] } | undefined) =>
    handleUpdate(rt, { kind: 'callback', updateId: uid++, callbackId: 'c', fromId: OWNER_ID, chatId: OWNER_ID, messageId: 7, data: card?.buttons?.[0]?.[0]?.data ?? '' });
  const settings = async () => mergeStoredSettings('ray', (await rt.store.loadConfig('ray')).settings);

  await handleUpdate(rt, priv('/chotden 20100', 12345));
  assert.equal(fake.sent.length, 0);
  await handleUpdate(rt, priv('/chotden 20100'));
  assert.equal((await settings()).blackMarketManual.on, false, 'chưa bấm ✅ thì chưa đổi');
  await press(fake.sent.at(-1));
  const s = await settings();
  assert.deepEqual(s.blackMarketManual, { on: true, vnd: 20100, at: NOW });

  const facts = buildSituationFacts({ now, daysUntilPayday: 5, rate: { wiseVnd: 19950, fetchedAt: NOW, sourceLabel: 'theo Wise', change24hPct: null, change7dPct: null, low7dVnd: null, high7dVnd: null }, recentBotPosts: [], news: [], blackMarket: blackMarketConfigOf(s) }).join('\n');
  assert.match(facts, /; chợ đen 20\.100 VND \(giá thật Khang nhập tay lúc 10:00 ngày 25\/11\/2026\)\./);
  const table = await loadRateTable(rt.store, now, blackMarketConfigOf(s));
  assert.equal(table.cho_den?.rate, 20100);
  assert.match(renderConversion({ kind: 'sgd', sgdCents: 100_000 }, ['cho_den'], table, true), /20\.100\.000 đ/);
  await rt.store.saveSettings('ray', { ...s, listenOn: true });
  const group = (text: string, id: number) => ({ kind: 'message' as const, updateId: uid++, chatId: -9, chatKind: 'group' as const, chatTitle: 'A', messageId: id, fromId: 5, fromName: 'X', isFromBot: false, text, isReplyToBot: false, sentAt: NOW });
  await handleUpdate(rt, group('@ray_test_bot giá hôm nay nhiêu', 11));
  assert.match(fake.sent.at(-1)?.text ?? '', /chợ đen khoảng 20\.100 đ/);
  assert.ok(!/ước tính khoảng/.test(fake.sent.at(-1)?.text ?? ''), 'thủ công: không ghi "ước tính"');
  assert.ok(prompts.at(-1)?.includes('chợ đen 20.100 VND (giá thật Khang nhập tay'));
  await rt.store.setState('ray', 'exchange_contacts', [{ name: 'Chỗ A', phone: '0912345678', note: '' }]);
  await handleUpdate(rt, group('/chodencontact', 12));
  assert.match(fake.sent.at(-1)?.text ?? '', /Giá chợ đen bữa nay: 20\.100 đ \/ 1 SGD/);

  await handleUpdate(rt, priv('/chotden tudong'));
  await press(fake.sent.at(-1));
  assert.equal((await settings()).blackMarketManual.on, false);
  await handleUpdate(rt, group('/chodencontact', 13));
  assert.match(fake.sent.at(-1)?.text ?? '', /Giá chợ đen ước tính bữa nay: 20\.050 đ \/ 1 SGD/, 'tắt thủ công → công thức, tròn 50 đ như ban đầu');
});

test('BR-53 báo giá theo lịch dùng giá chợ đen thủ công; /trangthai ghi chế độ + cảnh báo khi giá cũ', async () => {
  const now = vn(2026, 11, 25, 11, 5);
  const { rt, fake } = createTestRuntime({ now: () => now });
  await rt.store.saveGroup('ray', -1);
  await rt.store.saveSettings('ray', { blackMarketManual: { on: true, vnd: 20300, at: now.getTime() - 40 * 3600_000 } });
  await rt.store.setState('ray', 'plan:2026-11', { level: 3, days: [25], minutes: { 25: 600 } });
  await runTick(rt, null);
  assert.match(fake.sent.find((x) => x.chatId === -1)?.text ?? '', /chợ đen khoảng 20\.300 đ/);
  await handleUpdate(rt, { kind: 'message', updateId: 6_100_000, chatId: OWNER_ID, chatKind: 'private', chatTitle: null, messageId: 1, fromId: OWNER_ID, fromName: 'K', isFromBot: false, text: '/trangthai', isReplyToBot: false, sentAt: now.getTime() });
  const status = fake.sent.at(-1)?.text ?? '';
  assert.match(status, /Giá chợ đen: THỦ CÔNG: 20\.300 đ/);
  assert.match(status, /⚠️ Giá chợ đen THỦ CÔNG nhập từ 23\/11 \(40 giờ trước\)/);
  assert.equal(estimateBlackMarketVnd(20000), 20100);
});
