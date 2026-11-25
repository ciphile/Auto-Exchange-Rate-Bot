// BR-51 (Khang 25/11/2026): đổi tiền cho mọi người trong nhóm A — nhập số tiền (vd lương) → bot tính VND / SGD theo nguồn người dùng chọn.
// Lệnh /doitien + câu tự nhiên. Chưa nói nguồn → hỏi lại; không ai trả lời → (tick) tính theo mặc định chợ đen + Wise.
// CODE tính mọi con số (không qua AI — CODING_STANDARDS 6.10a "app tính số").
import type { BankQuote } from '../adapters/rate-sources.adapter.ts';
import type { Store } from '../repositories/store.repository.ts';
import { parseCommand } from './access.service.ts';
import type { BotSettings } from './settings.service.ts';
import { resolveAddress } from './style.service.ts';
import { parseAmountQuestion, type AmountQuestion } from './number-guard.service.ts';
import {
  convertSgdToVnd, convertVndToSgdCents, DEFAULT_BLACK_MARKET_CONFIG, describeRateSource, resolveBlackMarket, type BlackMarketConfig, type RateSource,
} from './rate.service.ts';
import { getLatestMid } from './rate-feed.service.ts';

export type ConvertSource = 'cho_den' | 'wise' | 'dbs' | 'vcb' | 'vpbank';
export const CONVERT_SOURCES: readonly ConvertSource[] = ['cho_den', 'wise', 'dbs', 'vcb', 'vpbank'];
/** Không trả lời / "tùy" → chợ đen + Wise (Khang: "mặc định giá chợ đen hay wise"). */
export const CONVERT_DEFAULT: readonly ConvertSource[] = ['cho_den', 'wise'];
export const CONVERT_ANSWER_TTL_MS = 15 * 60_000; // còn nhận câu trả lời "nguồn nào"
export const CONVERT_PENDING_KEY = 'convert_pending';
export const CONVERT_PENDING_MAX = 10;
const DAY_MS = 86_400_000;

export type PendingConvert = { fromId: number; chatId: number; messageId: number; amount: AmountQuestion; askedAt: number };
export type RateCell = { rate: number; label: string };
export type RateTable = Partial<Record<ConvertSource, RateCell>>;

const word = (body: string) => new RegExp(`(?<![\\p{L}\\p{N}])(?:${body})(?![\\p{L}\\p{N}])`, 'iu');
const SOURCE_WORDS: Record<ConvertSource, RegExp> = {
  cho_den: word('chợ đen|cho den|tiền mặt|tien mat|cđ'), // không nhận "cho" trần ("cho tui hỏi")
  wise: word('wise|wai'),
  dbs: word('dbs'),
  vcb: word('vcb|vietcombank|vietcom'),
  vpbank: word('vp\\s?bank|vpb'),
};
const ALL_WORDS = word('tất cả|tat ca|mọi nguồn|moi nguon|all');
const ANY_WORDS = word('tùy|tuỳ|tuy may|nào cũng được|nao cung duoc|sao cũng được|gì cũng được|mặc định|mac dinh');

/** Nguồn người dùng chọn: danh sách cụ thể · 'all' · 'default' ("tùy") · null (chưa nói). */
export function matchConvertSources(text: string): ConvertSource[] | 'all' | 'default' | null {
  const t = text.normalize('NFC').toLowerCase();
  const named = CONVERT_SOURCES.filter((s) => SOURCE_WORDS[s].test(t));
  if (named.length > 0) return named;
  if (ALL_WORDS.test(t)) return 'all';
  if (ANY_WORDS.test(t)) return 'default';
  return null;
}

export const resolveSources = (m: ConvertSource[] | 'all' | 'default' | null): readonly ConvertSource[] =>
  m === 'all' ? CONVERT_SOURCES : m === 'default' || m === null ? CONVERT_DEFAULT : m;

export const CONVERT_USAGE = 'Gõ: /doitien 5000 (SGD) · /doitien 5000 chợ đen · /doitien 50tr wise (VND → SGD)';

/** /doitien <số tiền> [nguồn]: số trần = SGD; "tr / triệu / củ" = VND. */
export function parseConvertCommand(text: string): { amount: AmountQuestion; sources: ConvertSource[] | 'all' | 'default' | null } | { error: string } | null {
  const cmd = parseCommand(text);
  if (!cmd || cmd.name !== 'doitien') return null;
  const args = cmd.args.trim();
  const amount = parseAmountQuestion(args) ?? parseAmountQuestion(args.replace(/^(\d[\d.,]*)\s*(k?)(?![\p{L}])/iu, '$1$2 sgd '));
  if (!amount) return { error: CONVERT_USAGE };
  return { amount, sources: matchConvertSources(args.replace(/^\d[\d.,]*\s*(k|nghìn|ngàn|triệu|tr|củ|sgd|đô|sing|s\$)?/iu, '')) };
}

/** Bảng giá dùng để quy đổi: Wise (gốc) · chợ đen ước tính · DBS · VCB / VPBank (ngân hàng MUA chuyển khoản SGD). Chỉ giá trong 24 giờ. */
export async function loadRateTable(store: Store, now: Date, blackMarket: BlackMarketConfig = DEFAULT_BLACK_MARKET_CONFIG): Promise<RateTable> {
  const table: RateTable = {};
  const fresh = (iso: string) => now.getTime() - Date.parse(iso) <= DAY_MS;
  const mid = await getLatestMid(store);
  if (mid && fresh(mid.row.fetched_at)) {
    const src = describeRateSource(mid.source, new Date(mid.row.fetched_at), now);
    table.wise = { rate: mid.row.rate_vnd, label: src };
    const bm = resolveBlackMarket(mid.row.rate_vnd, blackMarket, now);
    table.cho_den = { rate: bm.vnd, label: bm.manual ? bm.label : `chợ đen ước tính ${src}` }; // có giờ lấy giá (BR-54)
  } else if (blackMarket.manual.on && blackMarket.manual.vnd !== null) {
    // Thủ công: giá chợ đen do Khang nhập không cần Wise.
    table.cho_den = { rate: blackMarket.manual.vnd, label: resolveBlackMarket(0, blackMarket, now).label };
  }
  for (const s of ['dbs', 'vcb', 'vpbank'] as const) {
    const r = await store.getLatestRate(s);
    if (!r || !fresh(r.fetched_at)) continue;
    const q = r.extra as (BankQuote & { exactRate?: number }) | null;
    const rate = s === 'dbs' ? r.rate_vnd : q?.transferBuyVnd ?? null;
    if (rate) table[s] = { rate: Math.round(rate), label: describeRateSource(s as RateSource, new Date(r.fetched_at), now) };
  }
  return table;
}

const NAMES: Record<ConvertSource, string> = { cho_den: 'Chợ đen', wise: 'Wise', dbs: 'DBS', vcb: 'VCB (mua chuyển khoản)', vpbank: 'VPBank (mua chuyển khoản)' };
const vnd = (n: number) => n.toLocaleString('vi-VN');
const sgd = (cents: number) => (cents / 100).toLocaleString('vi-VN', { maximumFractionDigits: 2 });
const amountText = (a: AmountQuestion) => (a.kind === 'sgd' ? `${sgd(a.sgdCents)} SGD` : `${vnd(a.vnd)} đ`);

/** Kết quả quy đổi — mỗi nguồn 1 dòng, số do CODE tính. polite = chế độ ngoan. */
export function renderConversion(a: AmountQuestion, sources: readonly ConvertSource[], table: RateTable, polite: boolean, lead?: string): string {
  const lines = sources.map((s) => {
    const cell = table[s];
    if (!cell) return `- ${NAMES[s]}: chưa có giá trong 24 giờ qua`;
    const result = a.kind === 'sgd' ? `${vnd(convertSgdToVnd(a.sgdCents, cell.rate))} đ` : `${sgd(convertVndToSgdCents(a.vnd, cell.rate))} SGD`;
    return `- ${NAMES[s]}: ≈ ${result} (1 SGD = ${vnd(cell.rate)} đ, ${cell.label})`;
  });
  // lead = câu "do … không nói nguồn nên …" khi bot tự tính vì không ai trả lời (BR-55).
  const head = lead ? `${lead}\n${amountText(a)}:` : polite ? `Dạ ${amountText(a)} đổi ra nè:` : `${amountText(a)} nè :))`;
  return [head, ...lines].join('\n');
}

export const askSourceText = (a: AmountQuestion, polite: boolean) => polite
  ? `Dạ ${amountText(a)} anh chị muốn đổi theo nguồn nào nè: chợ đen, Wise, DBS, VCB hay VPBank? Nói "tất cả" thì em tính hết; sau 2 phút không thấy trả lời thì em tự tính theo chợ đen + Wise nha.`
  : `${amountText(a)} hả, tính theo chợ đen, Wise, DBS, VCB hay VPBank? Nói "tất cả" cũng được; 2 phút hổng nói gì là tui tự tính chợ đen + Wise đó =))`;

/**
 * BR-55: câu mở đầu BẮT BUỘC khi bot tự trả lời vì người dùng không nói nguồn (code dựng, không qua AI → 100% có):
 * ngoan "Dạ do anh chị không nói nguồn nên em tự lấy Wise nè." · bật tính cách "Do mấy ông hổng nói nguồn nên tui tự lấy Wise nha :))".
 */
export function noSourceLead(settings: BotSettings, what: string): string {
  const addr = resolveAddress({ bot: 'ray', personaOn: settings.personaOn, mood: settings.mood }, settings.address);
  return settings.personaOn
    ? `Do ${addr.others} hổng nói nguồn nên ${addr.self} ${what} nha :))`
    : `Dạ do ${addr.others} không nói nguồn nên ${addr.self} ${what} nè.`;
}
