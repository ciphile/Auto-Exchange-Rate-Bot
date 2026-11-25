// Barie (Khang 25/11/2026: "nhớ cập nhật danh sách hướng dẫn lệnh khi có tính năng mới hay lệnh mới"):
// lệnh code xử lý ↔ COMMAND_GUIDE ↔ docs/danh-sach-lenh.md phải khớp; câu mẫu nói tự nhiên phải chạy đúng luật code.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { BOT_CALL_NAMES } from '../src/config/defaults.ts';
import { isCalledByName } from '../src/services/access.service.ts';
import { renderGroupHelp, renderOwnerGuide } from '../src/services/help.service.ts';
import { matchSourceKeywords } from '../src/services/live-rate.service.ts';
import { HOLIDAY_Q_RE, LIVE_RE, handleUpdate, matchesIntent } from '../src/services/webhook.service.ts';
import { COMMAND_GUIDE, GROUP_EXAMPLES } from '../src/shared/command-guide.vi.ts';
import { OTHER_COMMAND_HELP, OWNER_COMMAND_HELP } from '../src/shared/commands.vi.ts';
import { createTestRuntime, OWNER_ID } from './fakes.ts';

const guideText = COMMAND_GUIDE.map((g) => g.syntax).join(' ');
const doc = readFileSync('docs/danh-sach-lenh.md', 'utf8');

test('Barie: MỌI lệnh code xử lý đều có trong hướng dẫn (COMMAND_GUIDE)', () => {
  const owner = [...readFileSync('src/services/owner.service.ts', 'utf8').matchAll(/case '(\w+)'/g)].map((m) => m[1]);
  const group = [...readFileSync('src/services/webhook.service.ts', 'utf8').matchAll(/name === '(\w+)'/g)].map((m) => m[1]);
  const settings = [...OWNER_COMMAND_HELP, ...OTHER_COMMAND_HELP].map(([c]) => /^\/(\w+)/.exec(c)?.[1]);
  const missing = [...new Set([...owner, ...group, ...settings, 'gannhom'])].filter((n) => n && !new RegExp(`/${n}\\b`).test(guideText));
  assert.deepEqual(missing, [], 'thêm vào src/shared/command-guide.vi.ts');
});

test('Barie: MỌI lệnh + câu mẫu trong hướng dẫn đều có trong docs/danh-sach-lenh.md', () => {
  const missing = COMMAND_GUIDE.filter((g) => !doc.includes(`/${g.cmd}`)).map((g) => g.cmd);
  const examples = Object.values(GROUP_EXAMPLES).flat().filter((e) => !doc.includes(e.say)).map((e) => e.say);
  assert.deepEqual([...missing, ...examples], []);
});

test('Barie: câu mẫu nói tự nhiên chạy đúng luật code (gọi tên + hiểu đúng ý)', () => {
  for (const e of GROUP_EXAMPLES.ray) {
    assert.ok(isCalledByName(e.say, BOT_CALL_NAMES.ray), `không nhận ra gọi tên: ${e.say}`);
    assert.ok((['live', 'holiday', 'rate', 'exchange'] as const).some((i) => matchesIntent(e.say, i)), `không khớp ý nào: ${e.say}`);
  }
  const say = (i: number) => GROUP_EXAMPLES.ray[i]?.say ?? '';
  assert.deepEqual(matchSourceKeywords(say(1)), { kind: 'named', sources: ['wise'] });
  assert.equal(matchSourceKeywords(say(2))?.kind, 'named');
  assert.equal(matchSourceKeywords(say(3))?.kind, 'any');
  assert.ok(LIVE_RE.test(say(4)) && matchSourceKeywords(say(4)) === null, '"lấy giá mới nhất" không nói nguồn → hỏi lại');
  assert.ok(HOLIDAY_Q_RE.test(say(7)) && HOLIDAY_Q_RE.test(say(8)));
});

test('/help trong nhóm: ai gõ cũng được, có câu mẫu, KHÔNG lộ lệnh của Khang · /caclenh: chỉ Khang, đầy đủ', async () => {
  const { rt, fake } = createTestRuntime();
  await rt.store.saveGroup('ray', -5);
  await handleUpdate(rt, { kind: 'message', updateId: 9001, chatId: -5, chatKind: 'group', chatTitle: 'A', messageId: 1, fromId: 42, fromName: 'Bạn', isFromBot: false, text: '/help', isReplyToBot: false, sentAt: Date.now() });
  const help = fake.sent.at(-1);
  assert.equal(help?.chatId, -5);
  assert.match(help?.text ?? '', /Rây ơi giá hôm nay nhiêu/);
  for (const secret of ['/noi', '/caidat', '/tinhcach', '/thuhoi']) assert.ok(!(help?.text ?? '').includes(secret), secret);
  assert.equal(renderGroupHelp('lui').includes('/tygia'), false, 'BR-45: Lũi không có lệnh tỉ giá');
  await handleUpdate(rt, { kind: 'message', updateId: 9002, chatId: OWNER_ID, chatKind: 'private', chatTitle: null, messageId: 2, fromId: OWNER_ID, fromName: 'K', isFromBot: false, text: '/caclenh', isReplyToBot: false, sentAt: Date.now() });
  assert.equal(fake.sent.at(-1)?.text, renderOwnerGuide('ray'));
  assert.match(renderOwnerGuide('ray'), /\/noi <nội dung>[\s\S]*Kết quả/);
});

test('Menu lệnh Telegram: chat riêng Khang có lệnh của Khang; nhóm chỉ lệnh chung; tên lệnh hợp lệ; chỉ cài lại khi danh sách đổi', async () => {
  const { buildCommandMenus } = await import('../src/services/help.service.ts');
  const { runTick } = await import('../src/services/tick.service.ts');
  for (const bot of ['ray', 'lui'] as const) {
    const m = buildCommandMenus(bot);
    for (const c of [...m.owner, ...m.group]) {
      assert.match(c.command, /^[a-z0-9_]{1,32}$/);
      assert.ok(c.description.length >= 3 && c.description.length <= 256);
    }
    assert.ok(!m.group.some((c) => ['noi', 'caidat', 'thuhoi', 'tinhcach'].includes(c.command)), 'nhóm không thấy lệnh của Khang');
  }
  const ray = buildCommandMenus('ray');
  assert.equal(ray.owner[0]?.command, 'caclenh');
  assert.ok(ray.owner.some((c) => c.command === 'noi') && ray.owner.some((c) => c.command === 'help'));
  assert.ok(!buildCommandMenus('lui').group.some((c) => c.command === 'tygia'), 'BR-45');
  let t = new Date('2026-11-25T03:00:00Z');
  const { rt, fake } = createTestRuntime({ now: () => t });
  await runTick(rt, null);
  assert.deepEqual(fake.menus.map((x) => x.scope), ['chat', 'all_group_chats']);
  t = new Date('2026-11-25T03:20:00Z');
  await runTick(rt, null);
  assert.equal(fake.menus.length, 2, 'không đổi thì không gọi Telegram lại');
});
