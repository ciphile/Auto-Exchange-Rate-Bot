#!/usr/bin/env node
// Đồng hồ đo ngữ cảnh: đọc số token phiên đang dùng từ nhật ký phiên (transcript), so với cỡ cửa sổ:
//   ≥ 60% → nhắc Khang tổng kết; ≥ 70% → Kat TỰ tổng kết + PR; ≥ 75% → nhắc Khang gõ /compact.
// Chạy ở UserPromptSubmit (mỗi tin Khang nhắn) + PostToolUse (sau mỗi lệnh — chỉ báo khi vừa vượt ngưỡng).
// Tham số: CONTEXT_WINDOW_TOKENS (mặc định 1.000.000), CONTEXT_WARN_PCT (60), CONTEXT_AUTO_PCT (70), CONTEXT_COMPACT_PCT (75).
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');

const WINDOW = Number(process.env.CONTEXT_WINDOW_TOKENS) || 1_000_000;
const WARN = Number(process.env.CONTEXT_WARN_PCT) || 60;
const AUTO = Number(process.env.CONTEXT_AUTO_PCT) || 70;
const COMPACT = Number(process.env.CONTEXT_COMPACT_PCT) || 75;

function readTail(file, bytes) {
  const fd = fs.openSync(file, 'r');
  try {
    const size = fs.fstatSync(fd).size;
    const start = Math.max(0, size - bytes);
    const buf = Buffer.alloc(size - start);
    fs.readSync(fd, buf, 0, buf.length, start);
    return buf.toString('utf8');
  } finally {
    fs.closeSync(fd);
  }
}

function findLastUsage(text) {
  const lines = text.split('\n');
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i];
    if (!line.includes('"usage"') || !line.includes('"assistant"')) continue;
    try {
      const u = JSON.parse(line)?.message?.usage;
      if (!u) continue;
      return (u.input_tokens || 0) + (u.cache_creation_input_tokens || 0) + (u.cache_read_input_tokens || 0);
    } catch { /* dòng đầu phần đuôi có thể bị cắt dở */ }
  }
  return null;
}

function main(raw) {
  const input = JSON.parse(raw || '{}');
  const file = input.transcript_path;
  if (!file || !fs.existsSync(file)) return;
  let used = findLastUsage(readTail(file, 2 * 1024 * 1024));
  if (used === null) used = findLastUsage(readTail(file, 16 * 1024 * 1024));
  if (used === null) return;
  const pct = Math.round((used / WINDOW) * 100);
  const level = pct >= COMPACT ? 3 : pct >= AUTO ? 2 : pct >= WARN ? 1 : 0;

  const stateFile = path.join(os.tmpdir(), `ngucanh-${String(input.session_id || 'x').replace(/[^\w-]/g, '')}.json`);
  let shown = 0;
  try { shown = JSON.parse(fs.readFileSync(stateFile, 'utf8')).level || 0; } catch { /* chưa có */ }
  if (pct < WARN - 20) shown = 0; // vừa nén → đặt lại
  const event = input.hook_event_name;
  const speak = level > 0 && (event === 'UserPromptSubmit' || level > shown);
  try { fs.writeFileSync(stateFile, JSON.stringify({ level: Math.max(level, event === 'UserPromptSubmit' ? level : shown) })); } catch { /* bỏ qua */ }
  if (!speak) return;

  const k = Math.round(used / 1000);
  const total = Math.round(WINDOW / 1000);
  const msg = level === 3
    ? `⏰ ĐỒNG HỒ NGỮ CẢNH: ${pct}% (${k}k / ${total}k token) ≥ ${COMPACT}%. Chưa tổng kết thì TỔNG KẾT NGAY (Rule 3), rồi nhắc Khang gõ /compact trong 1 tin riêng. Sau khi nén: đọc lại theo luật "sau nén ngữ cảnh" rồi mới làm tiếp.`
    : level === 2
    ? `⏰ ĐỒNG HỒ NGỮ CẢNH: ${pct}% (${k}k / ${total}k token) ≥ ${AUTO}%. Kat TỰ TỔNG KẾT NGAY (Rule 3 đủ 5 bước + tạo / cập nhật PR, kêu Khang merge) — không chờ nhắc; xong rồi mới làm tiếp.`
    : `⏰ ĐỒNG HỒ NGỮ CẢNH: ${pct}% (${k}k / ${total}k token) ≥ ${WARN}%. Nhắc Khang 1 dòng "Khang ơi ngữ cảnh đã ${pct}%, tới giờ tổng kết rồi". Tới ${AUTO}% Kat sẽ tự tổng kết.`;
  if (event === 'PostToolUse') {
    process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: 'PostToolUse', additionalContext: msg } }));
  } else {
    process.stdout.write(msg);
  }
}

let raw = '';
process.stdin.on('data', (c) => { raw += c; });
process.stdin.on('end', () => {
  try { main(raw); } catch { /* đồng hồ hỏng không được chặn Kat */ }
  process.exit(0);
});
