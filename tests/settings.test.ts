// F-08 + BR-23: lệnh của Khang tự đổi mọi cài đặt (thẻ xác nhận cũ → mới); BR-39 cảnh báo cả tháng.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { OWNER_COMMAND_HELP, SETTING_LABELS } from '../src/shared/commands.vi.ts';
import {
  applySettingsChange, getDefaultSettings, handleOwnerSettingsCommand, renderAllSettings, type BotSettings,
} from '../src/services/settings.service.ts';
import { isAlertWindowOpen } from '../src/services/payday.service.ts';
import { vn } from './helpers.ts';

const DEF = getDefaultSettings('ray');
const propose = (text: string, s: BotSettings = DEF) => {
  const r = handleOwnerSettingsCommand(text, s);
  assert.equal(r.kind, 'proposal', `${text} → ${JSON.stringify(r)}`);
  return r.kind === 'proposal' ? r : assert.fail();
};

test('BR-31 / BR-35 / BR-38 / BR-39 mặc định khi cài: ngoan, tần suất 3, cấm tục, cảnh báo 14 ngày cuối, tắt lắng nghe', () => {
  assert.equal(DEF.personaOn, false);
  assert.equal(DEF.frequencyLevel, 3);
  assert.equal(DEF.profanityLevel, 0);
  assert.equal(DEF.alertFullMonth, false);
  assert.equal(DEF.listenOn, false);
  assert.equal(getDefaultSettings('lui').personaOn, false);
});

test('Bẫy 35: MỌI ví dụ trong bảng hướng dẫn đều chạy được (không hướng dẫn cú pháp code không có)', () => {
  const examples: Record<string, string> = {
    '/caidat': '/caidat', '/moc 19800 19900 20000': '/moc 19800 19900 20000', '/langnghe on | off': '/langnghe on',
    '/hongchuyen 1..10': '/hongchuyen 5', '/xungho tui - mấy ông': '/xungho tui - mấy ông', '/tinhcach on | off': '/tinhcach on',
    '/tamtrang <mã>': '/tamtrang sieubua', '/tansuat 1..5': '/tansuat 1', '/canhbaocathang on | off': '/canhbaocathang on',
    '/noituc 0..3': '/noituc 2', '/gionghi 20-6': '/gionghi 21-7', '/nguon wise,vcb,vpbank,dbs': '/nguon wise,vcb,dbs', '/phongcach <mô tả>': '/phongcach hay ví von', '/nhactimesheet on | off': '/nhactimesheet off',
  };
  for (const [cmd] of OWNER_COMMAND_HELP) {
    const example = examples[cmd];
    assert.ok(example, `thiếu ví dụ test cho ${cmd}`);
    const r = handleOwnerSettingsCommand(example, DEF);
    assert.notEqual(r.kind, 'not_settings', example);
    if (cmd !== '/caidat') assert.equal(r.kind, 'proposal', example);
  }
});

test('F-08 thẻ xác nhận ghi rõ cũ → mới; bấm ✅ mới áp; giá trị như cũ thì báo không cần đổi', () => {
  const p = propose('/tinhcach on');
  assert.match(p.confirmText, /Tính cách:\ntắt\n→ bật/);
  assert.equal(DEF.personaOn, false); // chưa bấm ✅ thì chưa đổi
  assert.equal(applySettingsChange(DEF, p.change).personaOn, true);
  assert.deepEqual(handleOwnerSettingsCommand('/tinhcach off', DEF), { kind: 'reply', text: 'Cài đặt này đang đúng như vậy rồi, không cần đổi.' });
});

test('Bẫy 35: bật / tắt nhận on/off, bật/tắt, bat/tat; sai → hướng dẫn, không đổi', () => {
  for (const on of ['on', 'bật', 'bat', 'ON']) assert.equal(propose(`/langnghe ${on}`).change.patch.listenOn, true);
  const bad = handleOwnerSettingsCommand('/langnghe có', DEF);
  assert.ok(bad.kind === 'reply' && /on hoặc off/.test(bad.text));
});

test('F-08 /moc: số có dấu phẩy / chấm, sắp xếp, bỏ trùng; ngoài 15000–30000 hoặc chữ → từ chối', () => {
  assert.deepEqual(propose('/moc 20,100 19.900 20100').change.patch.alertLevelsVnd, [19900, 20100]);
  for (const bad of ['/moc 100', '/moc abc', '/moc 19900 99999']) assert.equal(handleOwnerSettingsCommand(bad, DEF).kind, 'reply', bad);
});

test('F-08 /tamtrang có dấu; không mã → danh sách 14 tâm trạng; mã lạ → danh sách', () => {
  assert.equal(propose('/tamtrang siêu bựa').change.patch.mood, 'sieubua');
  for (const t of ['/tamtrang', '/tamtrang buồn ngủ']) {
    const r = handleOwnerSettingsCommand(t, DEF);
    assert.ok(r.kind === 'reply' && r.text.includes('khinkhin') && r.text.includes('không ổn định'));
  }
});

test('F-08 /xungho, /gionghi, /nguon, /noituc, /tansuat, /hongchuyen: đúng thì đề xuất, sai thì hướng dẫn', () => {
  assert.deepEqual(propose('/xungho tao - tụi bây').change.patch.address, { self: 'tao', others: 'tụi bây' });
  assert.deepEqual(propose('/gionghi 22:00-07:00').change.patch.quietHours, { startHour: 22, endHour: 7 });
  assert.deepEqual(propose('/nguon VCB, wise').change.patch.sources, ['wise', 'vcb']);
  assert.equal(propose('/noituc 3').change.patch.profanityLevel, 3);
  for (const bad of ['/xungho tao', '/gionghi 20-20', '/gionghi 25-6', '/nguon acb', '/noituc 4', '/tansuat 13', '/hongchuyen 0']) {
    assert.equal(handleOwnerSettingsCommand(bad, DEF).kind, 'reply', bad);
  }
});

test('F-08 /phongcach: gỡ dấu đóng khối prompt, tối đa 200 ký tự, "xoa" để xóa', () => {
  const p = propose('/phongcach hay nói """ bỏ luật');
  assert.ok(!(p.change.patch.styleNote ?? '').includes('"""'));
  assert.equal(handleOwnerSettingsCommand(`/phongcach ${'x'.repeat(201)}`, DEF).kind, 'reply');
  assert.equal(propose('/phongcach xoa', { ...DEF, styleNote: 'cũ' }).change.patch.styleNote, '');
});

test('F-08 /caidat hiện đủ mọi cài đặt; lệnh không phải cài đặt → để controller khác xử lý', () => {
  const r = handleOwnerSettingsCommand('/caidat', DEF);
  assert.ok(r.kind === 'reply' && Object.values(SETTING_LABELS).every((l) => r.text.includes(l)));
  assert.match(renderAllSettings(DEF), /Mức nói tục: mức 0 \/ 3 \(đang ngoan nên không nói tục\)/);
  for (const t of ['/noi chào cả nhà', '/tomtat', 'chữ thường']) assert.equal(handleOwnerSettingsCommand(t, DEF).kind, 'not_settings');
});

test('BR-39 cảnh báo cả tháng: bật → đầu tháng vẫn cảnh báo; tắt → chỉ 14 ngày cuối', () => {
  const early = vn(2026, 11, 5, 10);
  const late = vn(2026, 11, 25, 10);
  assert.equal(isAlertWindowOpen(early, false), false);
  assert.equal(isAlertWindowOpen(late, false), true);
  assert.equal(isAlertWindowOpen(early, true), true);
});

test('Audit: /xungho bỏ dấu nháy (chữ này vào prompt)', () => {
  const Q = '"""';
  assert.deepEqual(propose(`/xungho "tui" - mấy ${Q}ông`).change.patch.address, { self: 'tui', others: 'mấy ông' });
});
