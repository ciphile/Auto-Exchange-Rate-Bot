-- Bảng database của Rây / Lũi (Supabase Postgres). Khang chạy 1 lần trong Supabase → SQL Editor (hướng dẫn phần 6).
-- Chạy lại nhiều lần vẫn an toàn (IF NOT EXISTS). Mọi bảng BẬT RLS và KHÔNG có policy → chỉ khóa bí mật (máy chủ) đọc / ghi
-- được; khóa công khai / trình duyệt không đọc được gì (ATR-9, L4). Thời hạn giữ từng bảng ghi cạnh bảng (CODING_STANDARDS 6.11).

-- Cài đặt từng bot + nhóm đã gắn (/gannhom). Giữ mãi (1 dòng / bot).
create table if not exists bot_config (
  bot text primary key check (bot in ('ray', 'lui')),
  settings jsonb not null default '{}'::jsonb,
  group_chat_id bigint,
  updated_at timestamptz not null default now()
);

-- Trạng thái nhỏ (cảnh báo, kế hoạch báo giá tháng, thẻ xác nhận, khóa đã nhắc…). Dọn: thẻ xác nhận > 1 ngày, kế hoạch > 70 ngày.
create table if not exists bot_state (
  bot text not null,
  key text not null,
  value jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (bot, key)
);

-- Tỉ giá đã lấy (BR-04). Giữ 60 ngày.
create table if not exists rates (
  id bigint generated always as identity primary key,
  source text not null check (source in ('wise', 'wise_fallback', 'vcb', 'vpbank')),
  rate_vnd integer not null check (rate_vnd between 1000 and 100000),
  extra jsonb,
  fetched_at timestamptz not null default now()
);
create index if not exists rates_source_time on rates (source, fetched_at desc);

-- Kho ngữ cảnh ngắn 20 tin / nhóm (BR-36) — chữ đã MÃ HÓA AES-256-GCM. Xóa sạch lúc 01:00 mỗi ngày (D4).
create table if not exists chat_context (
  id bigint generated always as identity primary key,
  bot text not null,
  enc text not null,
  created_at timestamptz not null default now()
);
create index if not exists chat_context_bot_time on chat_context (bot, created_at desc);

-- Hồ sơ thành viên (BR-40). Tên THẬT chỉ nằm ở đây (Khang tự nhập), không bao giờ trong repo. Giữ mãi.
create table if not exists members (
  id bigint generated always as identity primary key,
  name text not null,
  aliases text not null default '',
  how_to_call text not null default '',
  work text not null default '',
  about text not null default '',
  telegram_user_id bigint
);

-- Lịch lễ Singapore theo năm (BR-41). Dọn năm cũ hơn 2 năm.
create table if not exists holidays (
  year integer primary key,
  dates jsonb not null,
  source text not null,
  updated_at timestamptz not null default now()
);

-- Nhật ký người dùng (ai đổi gì, cũ → mới). Chỉ thêm. Giữ 365 ngày.
create table if not exists audit_log (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  bot text not null,
  actor text not null,
  action text not null,
  detail jsonb
);

-- Nhật ký gọi AI (prompt + trả lời MÃ HÓA). Giữ ≤ 1 ngày (D1).
create table if not exists ai_calls (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  bot text not null,
  purpose text not null,
  model text,
  ok boolean not null,
  error text,
  ms integer,
  enc_prompt text,
  enc_reply text
);

-- Khóa chống chạy chồng của /api/tick: mỗi nhịp 10 phút 1 dòng (khóa chính) → nhịp gọi 2 lần thì lần 2 bị từ chối. Giữ 7 ngày.
create table if not exists tick_runs (
  slot text primary key,
  at timestamptz not null default now()
);

alter table bot_config enable row level security;
alter table bot_state enable row level security;
alter table rates enable row level security;
alter table chat_context enable row level security;
alter table members enable row level security;
alter table holidays enable row level security;
alter table audit_log enable row level security;
alter table ai_calls enable row level security;
alter table tick_runs enable row level security;
