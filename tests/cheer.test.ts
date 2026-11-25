// BR-46 giọng động viên (nhắc lễ + báo giá thứ Tư → thứ Sáu / gần lương) · BR-47 Wise là giá chính, kèm chợ đen.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildWorkCheer, describeHolidayVi, formatHolidayLineVi } from '../src/services/cheer.service.ts';
import { getDaysUntilPayday } from '../src/services/payday.service.ts';
import { runTick } from '../src/services/tick.service.ts';
import { createTestRuntime } from './fakes.ts';
import { vn } from './helpers.ts';

const cheerAt = (d: Date) => buildWorkCheer(d, getDaysUntilPayday(d));

test('BR-46: thứ Tư / Năm / Sáu có ý động viên cuối tuần; lương rơi vào tuần sau → "tuần sau là có lương"; đầu tháng thứ Hai → không', () => {
  assert.equal(cheerAt(vn(2026, 11, 25, 10)), 'Hôm nay thứ Tư rồi, còn 2 ngày nữa là cuối tuần, tuần sau là có lương rồi.');
  assert.match(cheerAt(vn(2026, 11, 26, 10)) ?? '', /^Hôm nay thứ Năm rồi/);
  assert.match(cheerAt(vn(2026, 11, 27, 10)) ?? '', /^Hôm nay thứ Sáu rồi, mai cuối tuần/);
  assert.equal(cheerAt(vn(2026, 11, 23, 10)), 'tuần sau là có lương rồi.');
  assert.equal(cheerAt(vn(2026, 11, 2, 10)), null);
  assert.match(cheerAt(vn(2026, 11, 30, 10)) ?? '', /hôm nay có lương rồi/);
});

test('BR-46: tên lễ có giải thích tiếng Việt (Chinese New Year không bị hiểu nhầm là Tết Dương lịch); dòng lễ có thứ', () => {
  assert.equal(describeHolidayVi('Chinese New Year'), 'Chinese New Year (Tết Nguyên đán)');
  assert.equal(describeHolidayVi("New Year's Day"), "New Year's Day (Tết Dương lịch)");
  assert.match(describeHolidayVi('Nghỉ bù Hari Raya Haji'), /lễ Hồi giáo/);
  assert.equal(formatHolidayLineVi({ date: '2026-12-25', name: 'Christmas Day' }), 'thứ Sáu 25/12: Christmas Day (Giáng sinh)');
});

test('BR-46 / BR-47: báo giá thứ Tư, AI lỗi → câu soạn sẵn mở đầu động viên, giá Wise trước + chợ đen; prompt có luật Wise là giá chính', async () => {
  const now = vn(2026, 11, 25, 11, 5);
  const { rt, fake, prompts } = createTestRuntime({ now: () => now });
  await rt.store.saveGroup('ray', -1);
  await rt.store.setState('ray', 'plan:2026-11', { level: 3, days: [25], minutes: { 25: 600 } });
  await runTick(rt, null);
  const post = fake.sent.find((s) => s.chatId === -1)?.text ?? '';
  assert.match(post, /^Cố lên mọi người ơi, hôm nay thứ Tư rồi, còn 2 ngày nữa là cuối tuần/);
  assert.match(post, /19\.950 đ \(theo Wise/);
  assert.match(post, /chợ đen ước tính khoảng 20\.030 đ/);
  const p = prompts.find((x) => x.includes('Tự báo tỉ giá')) ?? '';
  assert.match(p, /TỈ GIÁ CHÍNH = WISE/);
  assert.match(p, /GIỌNG ĐỘNG VIÊN/);
});

test('BR-46: nhắc lễ tuần sau (thứ Sáu 18/12 → Giáng sinh thứ Sáu 25/12) giọng động viên, có thứ + giải thích', async () => {
  const now = vn(2026, 12, 18, 17, 30);
  const { rt, fake, prompts } = createTestRuntime({ now: () => now });
  await rt.store.saveGroup('ray', -1);
  await rt.store.setState('ray', 'plan:2026-12', { level: 3, days: [], minutes: {} });
  await runTick(rt, null);
  const post = fake.sent.find((s) => s.chatId === -1 && s.text.includes('nghỉ lễ'))?.text ?? '';
  assert.equal(post, 'Cố lên mọi người ơi, tuần sau được nghỉ lễ rồi:\n- thứ Sáu 25/12: Christmas Day (Giáng sinh)');
  assert.match(prompts.find((x) => x.includes('TUẦN SAU có ngày nghỉ lễ')) ?? '', /cố lên mọi người ơi, tuần sau được nghỉ lễ thứ Sáu \(lễ Hồi giáo\) rồi/);
});
