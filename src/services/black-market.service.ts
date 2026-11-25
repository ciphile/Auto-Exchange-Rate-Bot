// BR-53 (Khang 25/11/2026): /chotden — công tắc giá chợ đen: TỰ TÍNH (công thức Wise × (1 + mức chênh), tròn 50 đ — như ban đầu)
// hay THỦ CÔNG (Khang nhập giá chợ đen thật, bot dùng đúng số đó cho tới khi Khang đổi). Hàm thuần: lệnh → thẻ xác nhận cũ → mới.
import { BLACK_MARKET_PREMIUM_MAX_PCT, BLACK_MARKET_PREMIUM_MIN_PCT, DEFAULT_BLACK_MARKET_PREMIUM_PCT } from '../config/defaults.ts';
import { SETTING_LABELS } from '../shared/commands.vi.ts';
import { getVnParts } from '../shared/vn-time.ts';
import { parseCommand } from './access.service.ts';
import { estimateBlackMarketVnd } from './rate.service.ts';
import { formatSetting, type BotSettings, type SettingsChange } from './settings.service.ts';

export const BLACK_MARKET_PRICE_MIN = 15_000;
export const BLACK_MARKET_PRICE_MAX = 30_000;
export const MANUAL_STALE_MS = 24 * 3600_000; // giá thủ công cũ hơn mức này → nhắc Khang cập nhật
export const BLACK_MARKET_USAGE = [
  'Gõ: /chotden 20100 (nhập giá chợ đen THẬT hôm nay → bật THỦ CÔNG, bot dùng đúng số này)',
  '· /chotden tudong (tắt thủ công → bot tự tính theo Wise, tròn 50 đ) · /chotden on (bật lại giá thủ công đã nhập)',
  '· /chotden 0,5% (chỉnh mức chênh của công thức tự tính) · /chotden macdinh (tự tính + mức chênh +0,48%) · /chotden (xem hiện tại)',
].join('\n');

export type BlackMarketCommand =
  | { kind: 'show' }
  | { kind: 'manual_price'; priceVnd: number }
  | { kind: 'manual_on' }
  | { kind: 'auto' }
  | { kind: 'pct'; pct: number }
  | { kind: 'default' }
  | { kind: 'error'; message: string };

const toNumber = (raw: string): number => Number(raw.replace(',', '.'));

export function parseBlackMarketCommand(text: string): BlackMarketCommand | null {
  const cmd = parseCommand(text);
  if (!cmd || cmd.name !== 'chotden') return null;
  const a = cmd.args.trim().toLowerCase();
  if (a === '') return { kind: 'show' };
  if (/^(on|bat|bật|manual|thucong|thủ công)$/u.test(a)) return { kind: 'manual_on' };
  if (/^(off|tat|tắt|tudong|tự động|auto)$/u.test(a)) return { kind: 'auto' };
  if (/^(macdinh|mặc định|mac dinh|reset)$/u.test(a)) return { kind: 'default' };
  const pct = /^([+\-−]?\d{1,2}(?:[.,]\d{1,3})?)\s*%$/u.exec(a);
  if (pct) return { kind: 'pct', pct: toNumber((pct[1] ?? '').replace('−', '-')) };
  // Giá: "20100", "20.100", "20,100" (dấu chấm / phẩy chỉ là ngăn cách hàng nghìn).
  if (/^\d{1,2}(?:[.,]?\d{3})$/.test(a)) {
    const v = Number(a.replace(/[.,]/g, ''));
    if (v >= BLACK_MARKET_PRICE_MIN && v <= BLACK_MARKET_PRICE_MAX) return { kind: 'manual_price', priceVnd: v };
  }
  return { kind: 'error', message: BLACK_MARKET_USAGE };
}

const pctText = (pct: number) => `${pct < 0 ? '−' : '+'}${Math.abs(pct).toLocaleString('vi-VN', { maximumFractionDigits: 2 })}%`;
const vnd = (n: number) => n.toLocaleString('vi-VN');
const round2 = (n: number) => Math.round(n * 100) / 100;

/** Cảnh báo giá thủ công đã cũ (chợ đen đổi mỗi ngày). null = không cần nhắc. */
export function manualStaleWarning(s: BotSettings, nowMs: number): string | null {
  const m = s.blackMarketManual;
  if (!m.on || m.at === null || nowMs - m.at < MANUAL_STALE_MS) return null;
  const hours = Math.floor((nowMs - m.at) / 3600_000);
  const p = getVnParts(new Date(m.at));
  return `⚠️ Giá chợ đen THỦ CÔNG nhập từ ${String(p.day).padStart(2, '0')}/${String(p.month).padStart(2, '0')} (${hours} giờ trước) — chợ đen đổi mỗi ngày. Nhập giá mới (/chotden 20100) hoặc /chotden tudong để bot tự tính.`;
}

export type BlackMarketOutcome =
  | { kind: 'reply'; text: string }
  | { kind: 'proposal'; change: SettingsChange; confirmText: string };

const label = SETTING_LABELS.blackMarketManual;

/** Dựng thẻ đổi cài đặt: cũ → mới đọc từ chính formatSetting (khớp /caidat). */
function proposal(current: BotSettings, patch: Partial<BotSettings>, key: SettingsChange['key'], note = ''): BlackMarketOutcome {
  const next = { ...current, ...patch };
  const shown = key === 'blackMarketPremiumPct' ? 'blackMarketPremiumPct' : 'blackMarketManual';
  const change: SettingsChange = { key, patch, label: SETTING_LABELS[shown], beforeText: formatSetting(shown, current), afterText: formatSetting(shown, next) };
  return { kind: 'proposal', change, confirmText: `${change.label}:\n${change.beforeText}\n→ ${change.afterText}${note ? `\n${note}` : ''}` };
}

/** `wiseVnd` = giá Wise mới nhất (trong 24 giờ) hoặc null nếu chưa có; `nowMs` = đồng hồ app. */
export function planBlackMarketChange(cmd: BlackMarketCommand, current: BotSettings, wiseVnd: number | null, nowMs: number): BlackMarketOutcome {
  if (cmd.kind === 'error') return { kind: 'reply', text: cmd.message };
  const m = current.blackMarketManual;
  const formula = wiseVnd ? ` Công thức tự tính với Wise ${vnd(Math.round(wiseVnd))} cho ra ≈ ${vnd(estimateBlackMarketVnd(wiseVnd, current.blackMarketPremiumPct / 100))} đ.` : '';

  switch (cmd.kind) {
    case 'show': {
      const warn = manualStaleWarning(current, nowMs);
      const body = m.on && m.vnd !== null
        ? `Đang THỦ CÔNG: ${formatSetting('blackMarketManual', current).replace('THỦ CÔNG: ', '')}.${formula}`
        : `Đang TỰ TÍNH: ${formatSetting('blackMarketManual', current).replace('TỰ TÍNH theo công thức ', '')}.${formula}${m.vnd !== null ? ` (giá thủ công đã nhập trước đó: ${vnd(m.vnd)} đ — /chotden on để bật lại)` : ''}`;
      return { kind: 'reply', text: [body, warn, BLACK_MARKET_USAGE].filter(Boolean).join('\n') };
    }
    case 'manual_price': {
      if (wiseVnd) {
        const pct = round2((cmd.priceVnd / wiseVnd - 1) * 100);
        if (pct < BLACK_MARKET_PREMIUM_MIN_PCT || pct > BLACK_MARKET_PREMIUM_MAX_PCT) {
          return { kind: 'reply', text: `Giá ${vnd(cmd.priceVnd)} đ lệch ${pctText(pct)} so với Wise ${vnd(Math.round(wiseVnd))} đ (cho phép ${BLACK_MARKET_PREMIUM_MIN_PCT}% → +${BLACK_MARKET_PREMIUM_MAX_PCT}%) — kiểm lại số vừa gõ nha.` };
        }
      }
      return proposal(current, { blackMarketManual: { on: true, vnd: cmd.priceVnd, at: nowMs } }, 'blackMarketManual', `Bot sẽ dùng ĐÚNG ${vnd(cmd.priceVnd)} đ cho mọi giá chợ đen (báo giá, đổi tiền, trả lời) cho tới khi Khang đổi.${formula}`);
    }
    case 'manual_on':
      if (m.vnd === null) return { kind: 'reply', text: 'Chưa có giá thủ công nào đã nhập. Gõ /chotden 20100 (giá chợ đen thật hôm nay) để bật.' };
      if (m.on) return { kind: 'reply', text: 'Đang ở chế độ THỦ CÔNG rồi, không cần đổi.' };
      return proposal(current, { blackMarketManual: { ...m, on: true } }, 'blackMarketManual', manualStaleWarning({ ...current, blackMarketManual: { ...m, on: true } }, nowMs) ?? '');
    case 'auto':
      if (!m.on) return { kind: 'reply', text: 'Đang ở chế độ TỰ TÍNH rồi, không cần đổi.' };
      return proposal(current, { blackMarketManual: { ...m, on: false } }, 'blackMarketManual', `Bot tự tính chợ đen theo Wise, tròn 50 đ.${formula}`);
    case 'default':
      return proposal(current, { blackMarketPremiumPct: DEFAULT_BLACK_MARKET_PREMIUM_PCT, blackMarketManual: { ...m, on: false } }, 'blackMarketManual', 'Về công thức mặc định.');
    case 'pct': {
      const next = round2(cmd.pct);
      if (next < BLACK_MARKET_PREMIUM_MIN_PCT || next > BLACK_MARKET_PREMIUM_MAX_PCT) {
        return { kind: 'reply', text: `Mức chênh ${pctText(next)} lệch quá xa (cho phép ${BLACK_MARKET_PREMIUM_MIN_PCT}% → +${BLACK_MARKET_PREMIUM_MAX_PCT}%) — kiểm lại số vừa gõ nha.` };
      }
      if (next === current.blackMarketPremiumPct) return { kind: 'reply', text: `Mức chênh đang đúng ${pctText(next)} rồi, không cần đổi.` };
      const after = wiseVnd ? ` Ví dụ Wise ${vnd(Math.round(wiseVnd))} → chợ đen ≈ ${vnd(estimateBlackMarketVnd(wiseVnd, next / 100))} đ.` : '';
      return proposal(current, { blackMarketPremiumPct: next }, 'blackMarketPremiumPct', `Chỉ áp dụng khi chế độ TỰ TÍNH.${after}`);
    }
  }
}
